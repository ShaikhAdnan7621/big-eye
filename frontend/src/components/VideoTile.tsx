import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Camera } from '../types';
import { Maximize2, RefreshCw } from 'lucide-react';
import { sentinelService } from '../services/sentinel';

interface VideoTileProps {
  camera: Camera;
  onFocus?: (camera: Camera) => void;
  isFocused?: boolean;
}

export function VideoTile({ camera, onFocus, isFocused = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamStatus, setStreamStatus] = useState<'live' | 'buffering' | 'fallback'>('buffering');
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    let hls: Hls | null = null;
    const video = videoRef.current;
    if (!video) return;

    let isDestroyed = false;
    let reconnectTimer: NodeJS.Timeout | null = null;
    setStreamStatus('buffering');

    const streamUrl = sentinelService.getHlsStreamUrl(camera.id);

    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 6,
        maxMaxBufferLength: 12,
        backBufferLength: 6,
        manifestLoadingTimeOut: 15000,
        fragLoadingTimeOut: 20000,
        startPosition: -1
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!isDestroyed) {
          video.play()
            .then(() => setStreamStatus('live'))
            .catch(() => setStreamStatus('live'));
        }
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (!isDestroyed) setStreamStatus('live');
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryAttempt < 3) {
                reconnectTimer = setTimeout(() => {
                  if (!isDestroyed && hls) {
                    setRetryAttempt(prev => prev + 1);
                    hls.startLoad();
                  }
                }, 2000);
              } else {
                setStreamStatus('fallback');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              setStreamStatus('fallback');
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        if (!isDestroyed) {
          video.play()
            .then(() => setStreamStatus('live'))
            .catch(() => setStreamStatus('live'));
        }
      });
      video.addEventListener('error', () => {
        if (!isDestroyed) setStreamStatus('fallback');
      });
    } else {
      setStreamStatus('fallback');
    }

    return () => {
      isDestroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (hls) {
        hls.destroy();
      }
    };
  }, [camera.id, retryAttempt]);

  return (
    <div
      onClick={() => onFocus?.(camera)}
      className={`group relative rounded-xl overflow-hidden border transition-all duration-200 bg-[#0A0F16] ${
        isFocused
          ? 'border-[#3FD6A6] shadow-[0_0_20px_rgba(63,214,166,0.2)]'
          : 'border-[#233046] hover:border-[#3FD6A6]/60 cursor-pointer'
      }`}
    >
      {/* Video Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#0A0F16]">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="w-full h-full object-cover bg-[#0A0F16]"
        />

        {/* Fallback Highway Visual when feed is on standby */}
        {streamStatus === 'fallback' && (
          <div className="absolute inset-0 bg-[#0D1522] flex flex-col items-center justify-center p-4 text-center">
            {/* Animated Highway Perspective Line */}
            <div className="w-full h-24 relative overflow-hidden flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                <path d="M 0 120 L 160 0 L 240 0 L 400 120 Z" fill="#151E2E" />
                <line x1="200" y1="0" x2="200" y2="120" stroke="#3FD6A6" strokeWidth="2" strokeDasharray="8 8" className="animate-pulse" />
                {/* Moving vehicle dots */}
                <circle cx="185" cy="50" r="4" fill="#FEF08A" />
                <circle cx="215" cy="80" r="6" fill="#38BDF8" />
              </svg>
            </div>
            <div className="text-[11px] font-medium text-[#8996A8] mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3FD6A6]" />
              <span>Standby Patrol Feed · {camera.city}</span>
            </div>
          </div>
        )}

        {/* Buffering Spinner */}
        {streamStatus === 'buffering' && (
          <div className="absolute inset-0 bg-[#0A0F16]/60 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex items-center gap-2 bg-[#111826]/90 px-3 py-1.5 rounded-lg border border-[#233046] text-xs text-[#8996A8]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#3FD6A6]" />
              <span>Connecting live stream...</span>
            </div>
          </div>
        )}

        {/* Clean Top Overlay: Camera Code & Live Badge */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-20">
          <div className="px-2 py-0.5 rounded bg-[#111826]/90 backdrop-blur-sm border border-[#233046] text-[11px] font-semibold text-[#E7ECF3]">
            {camera.code}
          </div>

          <div className="px-2 py-0.5 rounded bg-[#111826]/90 backdrop-blur-sm border border-[#233046] text-[10px] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3FD6A6] animate-pulse" />
            <span className="text-[#3FD6A6] font-bold">LIVE</span>
          </div>
        </div>

        {/* Clean Bottom Overlay: Name & City */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0A0F16]/90 via-[#0A0F16]/40 to-transparent p-2.5 pt-6 flex items-center justify-between pointer-events-none z-20">
          <div className="truncate pr-2">
            <div className="text-xs font-medium text-[#E7ECF3] truncate">
              {camera.name.replace(/^\d+\s*/, '')}
            </div>
            <div className="text-[10px] text-[#8996A8] truncate">
              {camera.city} · {camera.junctionType}
            </div>
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-[#151E2E] border border-[#233046] text-[#3FD6A6]">
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
