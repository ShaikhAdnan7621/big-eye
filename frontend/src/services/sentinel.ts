import { SentinelGridConfig, CameraProtocolEndpoints, Camera } from '../types';
import { GUJARAT_CAMERAS } from '../data/cameras';

const STORAGE_KEY_SENTINEL_EMAIL = 'bigeye_sentinel_email';
const STORAGE_KEY_SENTINEL_PASSWORD = 'bigeye_sentinel_password';
const STORAGE_KEY_SENTINEL_CDN_HOST = 'bigeye_sentinel_cdn_host';
const STORAGE_KEY_SENTINEL_DIRECT_IP = 'bigeye_sentinel_direct_ip';
const STORAGE_KEY_SENTINEL_RTSP_PORT = 'bigeye_sentinel_rtsp_port';
const STORAGE_KEY_SENTINEL_WHEP_PORT = 'bigeye_sentinel_whep_port';

export const DEFAULT_SENTINEL_CDN_HOST = 'https://cctv.corp8.cloud';
export const DEFAULT_SENTINEL_DIRECT_IP = '103.250.160.189';
export const DEFAULT_SENTINEL_RTSP_PORT = 8554;
export const DEFAULT_SENTINEL_WHEP_PORT = 8889;

class SentinelService {
  private config: SentinelGridConfig;

  constructor() {
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SENTINEL_EMAIL) : null;
    const savedPassword = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SENTINEL_PASSWORD) : null;
    const savedCdnHost = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SENTINEL_CDN_HOST) : null;
    const savedDirectIp = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SENTINEL_DIRECT_IP) : null;
    const savedRtspPort = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SENTINEL_RTSP_PORT) : null;
    const savedWhepPort = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SENTINEL_WHEP_PORT) : null;

    this.config = {
      email: savedEmail || '',
      password: savedPassword || '',
      cdnHost: savedCdnHost || DEFAULT_SENTINEL_CDN_HOST,
      directIp: savedDirectIp || DEFAULT_SENTINEL_DIRECT_IP,
      rtspPort: savedRtspPort ? parseInt(savedRtspPort, 10) : DEFAULT_SENTINEL_RTSP_PORT,
      whepPort: savedWhepPort ? parseInt(savedWhepPort, 10) : DEFAULT_SENTINEL_WHEP_PORT,
      hasCredentials: Boolean(savedEmail && savedPassword)
    };
  }

  public getConfig(): SentinelGridConfig {
    return { ...this.config };
  }

  public setCredentials(email: string, password: string, cdnHost?: string, directIp?: string) {
    this.config.email = email.trim();
    this.config.password = password.trim();
    if (cdnHost) {
      this.config.cdnHost = cdnHost.trim().replace(/\/$/, '');
    }
    if (directIp) {
      this.config.directIp = directIp.trim().replace(/:\d+$/, '');
    }
    this.config.hasCredentials = Boolean(this.config.email && this.config.password);

    try {
      localStorage.setItem(STORAGE_KEY_SENTINEL_EMAIL, this.config.email);
      localStorage.setItem(STORAGE_KEY_SENTINEL_PASSWORD, this.config.password);
      localStorage.setItem(STORAGE_KEY_SENTINEL_CDN_HOST, this.config.cdnHost);
      localStorage.setItem(STORAGE_KEY_SENTINEL_DIRECT_IP, this.config.directIp);
    } catch {
      // ignore
    }
  }

  public clearCredentials() {
    this.config.email = '';
    this.config.password = '';
    this.config.hasCredentials = false;
    try {
      localStorage.removeItem(STORAGE_KEY_SENTINEL_EMAIL);
      localStorage.removeItem(STORAGE_KEY_SENTINEL_PASSWORD);
    } catch {
      // ignore
    }
  }

  /**
   * The @ in the email must be percent-encoded as %40 as required by Sentinel Grid
   * e.g. alice%40example.com
   */
  public getEncodedEmail(): string {
    if (!this.config.email) return 'you%40example.com';
    return this.config.email.replace(/@/g, '%40');
  }

  public getMaskedPassword(): string {
    if (!this.config.password) return 'YOUR-PASSWORD';
    return '••••••••';
  }

  public getRawPassword(): string {
    return this.config.password || 'YOUR-PASSWORD';
  }

  /**
   * HLS endpoint via local authenticated proxy
   * Eliminates CORS, handles CDN session cookies automatically, and provides seamless streaming
   */
  public getHlsStreamUrl(cameraId: string): string {
    if (typeof window !== 'undefined') {
      return `/api/stream/${cameraId}/index.m3u8`;
    }
    const base = this.config.cdnHost || DEFAULT_SENTINEL_CDN_HOST;
    return `${base}/${cameraId}/index.m3u8`;
  }

  /**
   * RTSP direct TCP endpoint with credentials embedded
   * rtsp://<email>:<password>@103.250.160.189:8554/stream/<id>
   */
  public getRtspStreamUrl(cameraId: string, maskPassword = false): string {
    const email = this.getEncodedEmail();
    const pwd = maskPassword ? this.getMaskedPassword() : this.getRawPassword();
    const ip = this.config.directIp || DEFAULT_SENTINEL_DIRECT_IP;
    const port = this.config.rtspPort || DEFAULT_SENTINEL_RTSP_PORT;
    return `rtsp://${email}:${pwd}@${ip}:${port}/stream/${cameraId}`;
  }

  /**
   * WebRTC / WHEP endpoint for low latency browser preview
   * http://<email>:<password>@103.250.160.189:8889/stream/<id>/whep
   */
  public getWhepStreamUrl(cameraId: string, maskPassword = false): string {
    const email = this.getEncodedEmail();
    const pwd = maskPassword ? this.getMaskedPassword() : this.getRawPassword();
    const ip = this.config.directIp || DEFAULT_SENTINEL_DIRECT_IP;
    const port = this.config.whepPort || DEFAULT_SENTINEL_WHEP_PORT;
    return `http://${email}:${pwd}@${ip}:${port}/stream/${cameraId}/whep`;
  }

  public getCatalogueUrl(): string {
    const base = this.config.cdnHost || DEFAULT_SENTINEL_CDN_HOST;
    return `${base}/cameras.json`;
  }

  /**
   * Compute exponential backoff delay as prescribed in Sentinel §3:
   * "Reconnect with backoff. Feeds are supervised and may restart. Exponential backoff (~2s → cap ~30s). Never tight-loop."
   */
  public getBackoffDelay(attempt: number): number {
    const baseMs = 2000;
    const factor = Math.pow(1.6, Math.min(attempt, 6));
    const delay = Math.round(baseMs * factor);
    return Math.min(delay, 30000);
  }

  /**
   * Generates protocol commands and scripts for AI inference and engineers
   */
  public getCameraEndpoints(cameraId: string): CameraProtocolEndpoints {
    const hls = this.getHlsStreamUrl(cameraId);
    const rtsp = this.getRtspStreamUrl(cameraId);
    const whep = this.getWhepStreamUrl(cameraId);
    const catalogueUrl = this.getCatalogueUrl();

    const openCvSnippet = `# OpenCV (Python) — Sentinel Camera Grid
import os, cv2

# RTSP: Force TCP transport as required by Sentinel Guide
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
cap = cv2.VideoCapture("${rtsp}", cv2.CAP_FFMPEG)

while True:
    ok, frame = cap.read()
    if not ok:
        break # Handle reconnect with backoff
    pts_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
    # Feed monotonic PTS delta to trackers
`;

    const gstreamerCommand = `gst-launch-1.0 rtspsrc location=${rtsp} protocols=tcp latency=200 ! rtph264depay ! h264parse ! avdec_h264 ! videoconvert ! fakesink`;

    const ffplayRtspCommand = `ffplay -rtsp_transport tcp "${rtsp}"`;
    const ffplayHlsCommand = `ffplay "${hls}"`;

    return {
      hls,
      rtsp,
      whep,
      catalogueUrl,
      openCvSnippet,
      gstreamerCommand,
      ffplayRtspCommand,
      ffplayHlsCommand
    };
  }

  /**
   * Custom Hls.js loader configuration that provides Authorization header
   * when credentials are configured on the CDN
   */
  public getHlsConfig(): Record<string, any> {
    const { email, password } = this.config;
    return {
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 15,
      manifestLoadingTimeOut: 6000,
      levelLoadingTimeOut: 6000,
      xhrSetup: (xhr: XMLHttpRequest) => {
        if (email && password) {
          try {
            const authStr = `${email}:${password}`;
            xhr.setRequestHeader('Authorization', `Basic ${btoa(authStr)}`);
          } catch {
            // ignore btoa failures
          }
        }
      }
    };
  }

  /**
   * Attempt to dynamically load camera catalogue from https://cctv.corp8.cloud/cameras.json
   */
  public async fetchCamerasCatalogue(): Promise<{ cameras: Partial<Camera>[]; source: 'live_catalogue' | 'local_fallback' }> {
    try {
      const catalogueUrl = this.getCatalogueUrl();
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      if (this.config.email && this.config.password) {
        headers['Authorization'] = `Basic ${btoa(`${this.config.email}:${this.config.password}`)}`;
      }

      const res = await fetch(catalogueUrl, {
        headers,
        signal: AbortSignal.timeout(4000)
      });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          return { cameras: json, source: 'live_catalogue' };
        }
      }
    } catch {
      // CORS or network blocked, fallback smoothly
    }

    return { cameras: GUJARAT_CAMERAS, source: 'local_fallback' };
  }
}

export const sentinelService = new SentinelService();
