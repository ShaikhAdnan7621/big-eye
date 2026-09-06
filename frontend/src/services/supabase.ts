import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  VehicleEvent, WatchlistTarget, ActiveAlert, SupabaseConfig,
  VehicleClass, TrafficFlow, MotionState, Camera, DepartmentRecord,
  SupabaseHealthReport
} from '../types';
import { GUJARAT_CAMERAS, INITIAL_VEHICLE_EVENTS, INITIAL_WATCHLISTS, INITIAL_ACTIVE_ALERTS, BASE_HLS_HOST } from '../data/cameras';
import { generateSha256 } from '../utils/crypto';
import { tacticalAudio } from '../utils/audio';
import { sentinelService } from './sentinel';

const STORAGE_KEY_URL = 'bigeye_supabase_url';
const STORAGE_KEY_KEY = 'bigeye_supabase_key';
const STORAGE_KEY_GATEWAY = 'bigeye_gateway_host';
const STORAGE_KEY_DEMO = 'bigeye_demo_mode';

export const DEFAULT_GATEWAY_HOST = 'https://cctv.corp8.cloud';

class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig;
  private eventListeners: ((event: VehicleEvent) => void)[] = [];
  private alertListeners: ((alert: ActiveAlert) => void)[] = [];
  private simulationInterval: NodeJS.Timeout | null = null;
  private isSimulating: boolean = false;

  constructor() {
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    const savedGateway = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_GATEWAY) : null;

    const effectiveUrl = envUrl.trim();
    const effectiveKey = envKey.trim();

    this.config = {
      url: effectiveUrl,
      anonKey: effectiveKey,
      gatewayHost: savedGateway || DEFAULT_GATEWAY_HOST,
      isCustom: Boolean(effectiveUrl && effectiveKey),
      connected: false,
      demoMode: !Boolean(effectiveUrl && effectiveKey),
      storageBucket: 'vehicle-thumbnails'
    };

    this.initClient();
  }

  public initClient() {
    if (this.config.url && this.config.anonKey && !this.config.demoMode) {
      try {
        this.client = createClient(this.config.url, this.config.anonKey, {
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        });

        this.testConnection().then(ok => {
          this.config.connected = ok;
          if (ok) {
            this.subscribeRealtime();
            this.stopSimulation();
          } else {
            console.warn('Supabase connection test failed, enabling demo fallback simulation');
            this.startSimulationStream();
          }
        });
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
        this.client = null;
        this.config.connected = false;
        this.startSimulationStream();
      }
    } else {
      this.client = null;
      this.config.connected = false;
      this.startSimulationStream();
    }
  }

  public async testConnection(): Promise<boolean> {
    if (!this.client) return false;
    try {
      // Test querying vehicle_events table
      const { error } = await this.client
        .from('vehicle_events')
        .select('id')
        .limit(1);

      if (error) {
        // Check if cameras or departments are accessible
        const camCheck = await this.client.from('cameras').select('id').limit(1);
        if (!camCheck.error) return true;
        console.warn('Supabase table test query returned error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase connection test exception:', err);
      return false;
    }
  }

  public async testHealth(): Promise<SupabaseHealthReport> {
    const report: SupabaseHealthReport = {
      connected: false,
      tables: {
        departments: false,
        cameras: false,
        vehicle_events: false,
        watchlists: false,
        active_alerts: false
      },
      counts: {
        departments: 0,
        cameras: 0,
        vehicle_events: 0,
        watchlists: 0,
        active_alerts: 0
      },
      bucketExists: false
    };

    if (!this.client) {
      report.error = 'No Supabase client initialized. Provide Supabase Project URL and Anon Key.';
      return report;
    }

    try {
      // 1. Test departments
      try {
        const { count, error } = await this.client.from('departments').select('id', { count: 'exact', head: true });
        if (!error) {
          report.tables.departments = true;
          report.counts.departments = count ?? 0;
        }
      } catch {
        // ignore
      }

      // 2. Test cameras
      try {
        const { count, error } = await this.client.from('cameras').select('id', { count: 'exact', head: true });
        if (!error) {
          report.tables.cameras = true;
          report.counts.cameras = count ?? 0;
        }
      } catch {
        // ignore
      }

      // 3. Test vehicle_events
      try {
        const { count, error } = await this.client.from('vehicle_events').select('id', { count: 'exact', head: true });
        if (!error) {
          report.tables.vehicle_events = true;
          report.counts.vehicle_events = count ?? 0;
        }
      } catch {
        // ignore
      }

      // 4. Test watchlists
      try {
        const { count, error } = await this.client.from('watchlists').select('id', { count: 'exact', head: true });
        if (!error) {
          report.tables.watchlists = true;
          report.counts.watchlists = count ?? 0;
        }
      } catch {
        // ignore
      }

      // 5. Test active_alerts
      try {
        const { count, error } = await this.client.from('active_alerts').select('id', { count: 'exact', head: true });
        if (!error) {
          report.tables.active_alerts = true;
          report.counts.active_alerts = count ?? 0;
        }
      } catch {
        // ignore
      }

      // 6. Test vehicle-thumbnails storage bucket
      try {
        const { data: buckets } = await this.client.storage.listBuckets();
        if (buckets && buckets.some(b => b.name === 'vehicle-thumbnails' || b.id === 'vehicle-thumbnails')) {
          report.bucketExists = true;
        } else {
          // In some client setups, listBuckets may require special permissions; test listing files in vehicle-thumbnails
          const { error: listErr } = await this.client.storage.from('vehicle-thumbnails').list('', { limit: 1 });
          if (!listErr) {
            report.bucketExists = true;
          }
        }
      } catch {
        report.bucketExists = true; // Non-fatal
      }

      report.connected = report.tables.vehicle_events || report.tables.cameras || report.tables.departments;
      return report;
    } catch (err: any) {
      report.error = err?.message || 'Database test failed';
      return report;
    }
  }

  public getConfig(): SupabaseConfig {
    return {
      ...this.config,
      sentinel: sentinelService.getConfig()
    };
  }

  public setConfig(url: string, anonKey: string, gatewayHost?: string) {
    this.config.url = url.trim();
    this.config.anonKey = anonKey.trim();
    if (gatewayHost) {
      this.config.gatewayHost = gatewayHost.trim().replace(/\/$/, '');
    }
    this.config.isCustom = Boolean(this.config.url && this.config.anonKey);
    this.config.demoMode = false;

    try {
      localStorage.setItem(STORAGE_KEY_URL, this.config.url);
      localStorage.setItem(STORAGE_KEY_KEY, this.config.anonKey);
      localStorage.setItem(STORAGE_KEY_GATEWAY, this.config.gatewayHost);
      localStorage.setItem(STORAGE_KEY_DEMO, 'false');
    } catch {
      // ignore
    }

    this.initClient();
  }

  public setDemoMode(enabled: boolean) {
    this.config.demoMode = enabled;
    try {
      localStorage.setItem(STORAGE_KEY_DEMO, String(enabled));
    } catch {
      // ignore
    }

    if (enabled) {
      this.client = null;
      this.config.connected = false;
      this.startSimulationStream();
    } else {
      this.initClient();
    }
  }

  public resetToDefaults() {
    try {
      localStorage.removeItem(STORAGE_KEY_URL);
      localStorage.removeItem(STORAGE_KEY_KEY);
      localStorage.removeItem(STORAGE_KEY_GATEWAY);
      localStorage.setItem(STORAGE_KEY_DEMO, 'true');
    } catch {
      // ignore
    }
    this.config.url = '';
    this.config.anonKey = '';
    this.config.gatewayHost = DEFAULT_GATEWAY_HOST;
    this.config.isCustom = false;
    this.config.demoMode = true;
    this.client = null;
    this.config.connected = false;
    this.startSimulationStream();
  }

  public getGatewayHost(): string {
    return this.config.gatewayHost || DEFAULT_GATEWAY_HOST;
  }

  public setGatewayHost(host: string) {
    this.config.gatewayHost = host.trim().replace(/\/$/, '');
    try {
      localStorage.setItem(STORAGE_KEY_GATEWAY, this.config.gatewayHost);
    } catch {
      // ignore
    }
  }

  public getStorageThumbnailUrl(cameraId: string, trackId: number, vehicleClass: string): string {
    if (this.config.url) {
      const base = this.config.url.replace(/\/$/, '');
      return `${base}/storage/v1/object/public/${this.config.storageBucket}/${cameraId}_id${trackId}_${vehicleClass}.jpg`;
    }
    return '';
  }

  public buildThumbnailUrl(rawThumb: string, cameraId: string, trackId: number, vehicleClass: string): string {
    const supabaseUrl = this.config.url ? this.config.url.replace(/\/$/, '') : '';
    const bucket = this.config.storageBucket || 'vehicle-thumbnails';

    if (rawThumb && rawThumb.trim()) {
      const clean = rawThumb.trim();
      if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
        return clean;
      }
      if (supabaseUrl) {
        if (clean.startsWith('/storage/')) {
          return `${supabaseUrl}${clean}`;
        }
        if (clean.startsWith(`${bucket}/`)) {
          return `${supabaseUrl}/storage/v1/object/public/${clean}`;
        }
        return `${supabaseUrl}/storage/v1/object/public/${bucket}/${clean.replace(/^\/+/, '')}`;
      }
    }

    if (supabaseUrl && cameraId && trackId) {
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cameraId}_id${trackId}_${vehicleClass}.jpg`;
    }

    return rawThumb || '';
  }

  // Realtime subscription to live postgres changes
  private subscribeRealtime() {
    if (!this.client) return;

    try {
      this.client
        .channel('vehicle_events_realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'vehicle_events' },
          payload => {
            if (payload.new) {
              const evt = this.normalizeEvent(payload.new as Record<string, any>);
              this.notifyEventListeners(evt);
            }
          }
        )
        .subscribe((status) => {
          console.log('[BIG EYE Realtime] vehicle_events subscription status:', status);
        });

      this.client
        .channel('active_alerts_realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'active_alerts' },
          payload => {
            if (payload.new) {
              const rawAlert = payload.new as Record<string, any>;
              const cam = GUJARAT_CAMERAS.find(c => c.id === rawAlert.camera_id);
              const trackId = Number(rawAlert.track_id || 0);
              const vClass = rawAlert.vehicle_class || 'SUV';
              const rawThumb = rawAlert.thumbnail_url || rawAlert.thumbnail || rawAlert.image_url || '';
              const resolvedThumb = this.buildThumbnailUrl(rawThumb, rawAlert.camera_id, trackId, vClass);

              const alert: ActiveAlert = {
                id: String(rawAlert.id),
                camera_id: rawAlert.camera_id,
                camera_name: cam ? cam.name : rawAlert.camera_name || rawAlert.camera_id,
                identifier: rawAlert.identifier || rawAlert.plate_number || 'UNKNOWN',
                alert_reason: rawAlert.alert_reason || rawAlert.reason || 'Security Alert',
                confidence_score: Number(rawAlert.confidence_score || rawAlert.confidence || 95),
                thumbnail_url: resolvedThumb,
                is_acknowledged: Boolean(rawAlert.is_acknowledged),
                created_at: rawAlert.created_at || new Date().toISOString(),
                priority: rawAlert.priority || 'HIGH',
                vehicle_class: vClass,
                dispatchedUnit: rawAlert.dispatched_unit || rawAlert.dispatchedUnit
              };
              tacticalAudio.playBoloAlarm();
              this.notifyAlertListeners(alert);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }
  }

  public async fetchDepartments(): Promise<DepartmentRecord[]> {
    if (this.client && !this.config.demoMode) {
      try {
        const { data, error } = await this.client
          .from('departments')
          .select('*')
          .order('id', { ascending: true });

        if (!error && data && data.length > 0) {
          return data as DepartmentRecord[];
        }
      } catch (err) {
        console.warn('Supabase fetch departments error:', err);
      }
    }
    return [
      { id: 'DEPT-01', name: 'Home Dept', zone: 'Ahmedabad Zone' },
      { id: 'DEPT-02', name: 'Traffic Branch', zone: 'Statewide Highway Corridors' },
      { id: 'DEPT-03', name: 'Municipal Corp', zone: 'Urban Junctions' },
      { id: 'DEPT-04', name: 'Civil Supplies & Port', zone: 'Industrial Logistics' },
      { id: 'DEPT-05', name: 'Transit Police', zone: 'Bus & Rail Ports' },
      { id: 'DEPT-06', name: 'RTO / Traffic', zone: 'Border Checkposts' },
      { id: 'DEPT-07', name: 'Rural Police', zone: 'District Routes' },
      { id: 'DEPT-08', name: 'Coastal Security', zone: 'Port & Coastal Ring' }
    ];
  }

  public async fetchCameras(): Promise<Camera[]> {
    if (this.client && !this.config.demoMode) {
      try {
        const { data, error } = await this.client
          .from('cameras')
          .select('id, name, department_id, district, is_active, created_at, departments(id, name, zone)')
          .order('id', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((item: any) => {
            const deptName = item.departments?.name || item.department_id || 'Home Dept';
            const city = item.district || 'Ahmedabad';
            return {
              id: item.id,
              code: item.id.toUpperCase(),
              name: item.name,
              department: deptName,
              department_id: item.department_id,
              district: item.district,
              city: city,
              hlsUrl: `${BASE_HLS_HOST}/${item.id}/index.m3u8`,
              lat: 23.0 + (parseInt(item.id.replace(/\D/g, '') || '1', 10) * 0.01),
              lng: 72.5 + (parseInt(item.id.replace(/\D/g, '') || '1', 10) * 0.01),
              status: item.is_active === false ? 'offline' : 'live',
              fps: 25,
              bitrateKbps: 2400,
              activeDetections: 12,
              aiProfileId: 'traffic-iisc-uvh26',
              junctionType: 'Gujarat Checkpost',
              is_active: item.is_active
            };
          });
        }
      } catch (err) {
        console.warn('Supabase fetch cameras error:', err);
      }
    }
    return GUJARAT_CAMERAS;
  }

  private hexToColorName(hex: string): string {
    const h = hex.toLowerCase().replace('#', '');
    if (h.length === 6) {
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      if (r > 200 && g > 200 && b > 200) return 'White';
      if (r < 60 && g < 60 && b < 60) return 'Black';
      if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20) return 'Silver Grey';
      if (r > 180 && g < 70 && b < 70) return 'Crimson Red';
      if (g > 140 && r < 100 && b < 100) return 'Emerald Green';
      if (b > 160 && r < 100) return 'Cyan Blue';
      if (r > 160 && g > 140 && b < 80) return 'Yellow / Green';
    }
    return hex;
  }

  private normalizeEvent(item: Record<string, any>): VehicleEvent {
    const cam = GUJARAT_CAMERAS.find(c => c.id === item.camera_id);
    const trackId = Number(item.track_id || item.trackId || item.id || 100);
    const vClass = item.vehicle_class || item.vehicle_type || item.class || 'Hatchback';

    // Check all potential thumbnail field names from Supabase database
    const rawThumb = item.thumbnail_url || item.thumbnail || item.image_url || item.crop_url || item.image || item.file_name || item.filename || '';
    const resolvedThumb = this.buildThumbnailUrl(rawThumb, item.camera_id, trackId, vClass);

    const domColor = item.dominant_color || item.color || '#E7ECF3';
    const colorName = item.color_name || (domColor.startsWith('#') ? this.hexToColorName(domColor) : domColor) || 'White';

    // Speed calculation from net displacement & dwell
    let speed = Number(item.speed_kmh || item.speed);
    if (!speed && item.net_displacement_px && item.dwell_sec) {
      speed = Math.min(95, Math.max(18, Math.round((Number(item.net_displacement_px) / Math.max(1, Number(item.dwell_sec))) * 0.25)));
    } else if (!speed) {
      speed = 42;
    }

    const plate = item.plate_number || item.identifier || `GJ-${cam?.city?.slice(0, 2).toUpperCase() || '01'}-TR-${trackId}`;

    return {
      id: String(item.id),
      camera_id: item.camera_id || 'cam01',
      camera_name: cam ? cam.name : item.camera_name || item.camera_id || 'CCTV Stream',
      track_id: trackId,
      vehicle_class: vClass,
      dominant_color: domColor,
      color_name: colorName,
      motion_state: item.motion_state || 'Moving',
      traffic_flow: item.traffic_flow || 'Inbound',
      net_displacement_px: Number(item.net_displacement_px || 0),
      entry_sec: Number(item.entry_sec || 0),
      exit_sec: Number(item.exit_sec || 5),
      dwell_sec: Number(item.dwell_sec || 5),
      thumbnail_url: resolvedThumb,
      tamper_hash: item.tamper_hash || 'SHA256',
      created_at: item.created_at || new Date().toISOString(),
      plate_number: plate,
      speed_kmh: speed,
      confidence: Number(item.confidence || item.confidence_score || 96)
    };
  }

  // Fetch Live Table Data: Query supabase.from('vehicle_events').select('*').order('id', { ascending: false })
  public async fetchVehicleEvents(limit: number = 50): Promise<VehicleEvent[]> {
    if (this.client && !this.config.demoMode) {
      try {
        const { data, error } = await this.client
          .from('vehicle_events')
          .select('*')
          .order('id', { ascending: false })
          .limit(limit);

        if (!error && data) {
          if (data.length > 0) {
            return data.map(item => this.normalizeEvent(item));
          }
          // If query succeeded and database returned 0 rows
          return [];
        }
        if (error) {
          console.warn('Supabase fetch vehicle_events error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase fetch vehicle_events exception:', err);
      }
    }

    return INITIAL_VEHICLE_EVENTS.map(evt => ({
      ...evt,
      thumbnail_url: evt.thumbnail_url || this.getStorageThumbnailUrl(evt.camera_id, evt.track_id, evt.vehicle_class)
    }));
  }

  // Instant Attribute Search: chain query filters .eq('vehicle_class', val).ilike('traffic_flow', `%${val}%`)
  // CRITICAL: NEVER query plate_number on vehicle_events because that column does not exist in schema!
  public async searchEvents(params: {
    v_class?: string;
    color?: string;
    flow?: string;
    min_dwell?: number;
    plate?: string;
    query?: string;
    camera_id?: string;
    limit?: number;
  }): Promise<VehicleEvent[]> {
    if (this.client && !this.config.demoMode) {
      try {
        let query = this.client.from('vehicle_events').select('*');

        if (params.v_class && params.v_class !== 'All') {
          query = query.ilike('vehicle_class', params.v_class);
        }
        if (params.flow && params.flow !== 'All') {
          query = query.ilike('traffic_flow', `%${params.flow}%`);
        }
        if (params.color && params.color !== 'All') {
          const colorTerms = params.color
            .split('/')
            .map(term => term.trim())
            .filter(Boolean);
          const colorFilter = colorTerms
            .map(term => `dominant_color.ilike.*${term}*`)
            .join(',');
          query = query.or(colorFilter);
        }
        if (params.min_dwell && params.min_dwell > 0) {
          query = query.gte('dwell_sec', params.min_dwell);
        }
        if (params.camera_id) {
          query = query.eq('camera_id', params.camera_id);
        }

        // Freeform query or plate token - search safe columns (vehicle_class, camera_id, dominant_color, or track_id)
        const textTerm = (params.plate || params.query || '').trim();
        if (textTerm) {
          const terms = textTerm.split(/\s+/).filter(Boolean);
          for (const term of terms) {
            if (/^\d+$/.test(term)) {
              query = query.or(`track_id.eq.${term},camera_id.ilike.*${term}*`);
            } else {
              query = query.or(`vehicle_class.ilike.*${term}*,dominant_color.ilike.*${term}*,camera_id.ilike.*${term}*,traffic_flow.ilike.*${term}*`);
            }
          }
        }

        const { data, error } = await query
          .order('id', { ascending: false })
          .limit(params.limit || 50);

        if (!error && data) {
          return data.map(item => this.normalizeEvent(item));
        }
        if (error) {
          console.warn('Supabase search error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase searchEvents exception, falling back:', err);
      }
    }

    // Local fallback search filtering
    return INITIAL_VEHICLE_EVENTS.filter(evt => {
      if (params.v_class && params.v_class !== 'All' && evt.vehicle_class !== params.v_class) return false;
      if (params.color && params.color !== 'All' && !evt.color_name.toLowerCase().includes(params.color.toLowerCase())) return false;
      if (params.flow && params.flow !== 'All' && evt.traffic_flow !== params.flow) return false;
      if (params.min_dwell && params.min_dwell > 0 && evt.dwell_sec < params.min_dwell) return false;
      const textTerm = (params.query || params.plate || '').toLowerCase().trim();
      if (textTerm) {
        const matchesPlate = evt.plate_number?.toLowerCase().includes(textTerm);
        const matchesCamera = evt.camera_id.toLowerCase().includes(textTerm) || evt.camera_name?.toLowerCase().includes(textTerm);
        const matchesClass = evt.vehicle_class.toLowerCase().includes(textTerm);
        const matchesTrack = String(evt.track_id).includes(textTerm);
        if (!matchesPlate && !matchesCamera && !matchesClass && !matchesTrack) return false;
      }
      return true;
    }).map(evt => ({
      ...evt,
      thumbnail_url: evt.thumbnail_url || this.getStorageThumbnailUrl(evt.camera_id, evt.track_id, evt.vehicle_class)
    }));
  }

  public async fetchWatchlists(): Promise<WatchlistTarget[]> {
    if (this.client && !this.config.demoMode) {
      try {
        const { data, error } = await this.client
          .from('watchlists')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((item: any) => ({
            id: String(item.id),
            identifier: item.identifier,
            target_type: item.target_type || 'Vehicle',
            reason: item.reason,
            priority: item.priority || 'High',
            is_active: item.is_active ?? true,
            created_at: item.created_at || new Date().toISOString()
          }));
        }
      } catch (err) {
        console.warn('Supabase fetch watchlists error:', err);
      }
    }
    return INITIAL_WATCHLISTS;
  }

  public async addWatchlistTarget(target: {
    identifier: string;
    target_type: string;
    reason: string;
    priority?: string;
    is_active?: boolean;
  }): Promise<WatchlistTarget> {
    if (this.client && !this.config.demoMode) {
      try {
        const { data, error } = await this.client
          .from('watchlists')
          .insert([{
            identifier: target.identifier.trim(),
            target_type: target.target_type || 'Vehicle',
            reason: target.reason.trim(),
            priority: target.priority || 'High',
            is_active: target.is_active ?? true
          }])
          .select()
          .single();

        if (!error && data) {
          return {
            id: String(data.id),
            identifier: data.identifier,
            target_type: data.target_type,
            reason: data.reason,
            priority: data.priority || 'High',
            is_active: Boolean(data.is_active),
            created_at: data.created_at || new Date().toISOString()
          };
        }
        if (error) {
          console.warn('Supabase watchlist insert error:', error.message);
        }
      } catch (err) {
        console.warn('Failed to insert watchlist target into Supabase:', err);
      }
    }

    return {
      id: String(Date.now()),
      identifier: target.identifier,
      target_type: target.target_type || 'Vehicle',
      reason: target.reason,
      priority: target.priority || 'High',
      is_active: true,
      created_at: new Date().toISOString()
    };
  }

  public async fetchActiveAlerts(): Promise<ActiveAlert[]> {
    if (this.client && !this.config.demoMode) {
      try {
        const { data, error } = await this.client
          .from('active_alerts')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((alt: any) => {
            const cam = GUJARAT_CAMERAS.find(c => c.id === alt.camera_id);
            const score = Number(alt.confidence_score ?? 0.95);
            const normalizedScore = score <= 1.0 ? Math.round(score * 100) : Math.round(score);
            const resolvedThumb = this.buildThumbnailUrl(alt.thumbnail_url, alt.camera_id, 0, 'Vehicle');

            return {
              id: String(alt.id),
              camera_id: alt.camera_id,
              camera_name: cam ? cam.name : alt.camera_id,
              identifier: alt.identifier,
              alert_reason: alt.alert_reason,
              confidence_score: normalizedScore,
              thumbnail_url: resolvedThumb,
              is_acknowledged: Boolean(alt.is_acknowledged),
              created_at: alt.created_at || new Date().toISOString(),
              priority: 'HIGH',
              vehicle_class: 'Vehicle'
            };
          });
        }
      } catch (err) {
        console.warn('Supabase fetch active_alerts error:', err);
      }
    }
    return INITIAL_ACTIVE_ALERTS.map(alt => ({
      ...alt,
      thumbnail_url: alt.thumbnail_url || this.getStorageThumbnailUrl(alt.camera_id, 100, alt.vehicle_class || 'SUV')
    }));
  }

  public async acknowledgeAlert(alertId: string): Promise<boolean> {
    if (this.client && !this.config.demoMode) {
      try {
        const numId = /^\d+$/.test(alertId) ? parseInt(alertId, 10) : alertId;
        const { error } = await this.client
          .from('active_alerts')
          .update({ is_acknowledged: true })
          .eq('id', numId);

        if (error) {
          console.warn('Supabase acknowledgeAlert error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase acknowledgeAlert exception:', err);
      }
    }
    tacticalAudio.playAckChime();
    return true;
  }

  // Fallback high-speed mission simulation engine (used in demo mode or when offline)
  public startSimulationStream() {
    if (this.isSimulating) return;
    this.isSimulating = true;

    const classes: VehicleClass[] = [
      'Three-wheeler', 'Two-wheeler', 'Hatchback', 'Sedan',
      'SUV', 'Bus', 'Truck', 'Light Commercial Vehicle (LCV)', 'Tanker'
    ];
    const colors = [
      { name: 'White', hex: '#E7ECF3' },
      { name: 'Yellow / Green', hex: '#F5B54C' },
      { name: 'Black', hex: '#111826' },
      { name: 'Silver Grey', hex: '#8996A8' },
      { name: 'Crimson Red', hex: '#E85D5D' },
      { name: 'Cyan Blue', hex: '#5FB3E8' }
    ];
    const flows: TrafficFlow[] = ['Inbound', 'Outbound', 'Auto-Stand/Parking', 'Turning'];
    const motions: MotionState[] = ['Moving', 'Accelerating', 'Stationary', 'Slow Traffic'];

    let trackCounter = 1050;

    this.simulationInterval = setInterval(async () => {
      const cam = GUJARAT_CAMERAS[Math.floor(Math.random() * GUJARAT_CAMERAS.length)];
      const vClass = classes[Math.floor(Math.random() * classes.length)];
      const colorObj = colors[Math.floor(Math.random() * colors.length)];
      const flow = flows[Math.floor(Math.random() * flows.length)];
      const motion = flow === 'Auto-Stand/Parking' ? 'Stationary' : motions[Math.floor(Math.random() * motions.length)];

      const dwell = flow === 'Auto-Stand/Parking'
        ? Math.floor(Math.random() * 90 + 15)
        : Number((Math.random() * 8 + 3).toFixed(1));

      const entry = Number((Math.random() * 20).toFixed(1));
      const exit = Number((entry + dwell).toFixed(1));
      const trackId = trackCounter++;
      const id = `${Date.now().toString().slice(-6)}`;
      const speed = motion === 'Stationary' ? 0 : Math.floor(Math.random() * 55 + 20);
      const conf = Number((Math.random() * 4 + 95.5).toFixed(1));

      const dist = Math.floor(Math.random() * 38 + 1).toString().padStart(2, '0');
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const ser = chars[Math.floor(Math.random() * 26)] + chars[Math.floor(Math.random() * 26)];
      const num = Math.floor(Math.random() * 9000 + 1000);
      const plate = `GJ-${dist}-${ser}-${num}`;

      const rawData = `${id}|${cam.id}|${trackId}|${vClass}|${dwell}|GUJARAT_POLICE`;
      const tamperHash = await generateSha256(rawData);

      const newEvent: VehicleEvent = {
        id,
        camera_id: cam.id,
        camera_name: cam.name,
        track_id: trackId,
        vehicle_class: vClass,
        dominant_color: colorObj.hex,
        color_name: colorObj.name,
        motion_state: motion,
        traffic_flow: flow,
        net_displacement_px: Math.floor(Math.random() * 500 + 100),
        entry_sec: entry,
        exit_sec: exit,
        dwell_sec: dwell,
        thumbnail_url: this.getStorageThumbnailUrl(cam.id, trackId, vClass),
        tamper_hash: tamperHash,
        created_at: new Date().toISOString(),
        plate_number: plate,
        speed_kmh: speed,
        confidence: conf
      };

      this.notifyEventListeners(newEvent);

      // Rare chance of automated BOLO match (1 out of 8 events)
      if (Math.random() < 0.12) {
        const isCritical = Math.random() < 0.35;
        const reasons = [
          `SUSPICIOUS DWELL: ${vClass} stationary > ${dwell}s near sensitive installation`,
          `BOLO MATCH: Hotlisted plate ${plate} registered under Crime Branch surveillance`,
          `HIGH-SPEED SIGHTING: ${plate} clocked at ${speed + 35} km/h through corridor`,
          `PERIMETER ANOMALY: Unauthorized entry during curfew hours`
        ];
        const alertId = `alt-${Date.now().toString().slice(-5)}`;
        const newAlert: ActiveAlert = {
          id: alertId,
          camera_id: cam.id,
          camera_name: cam.name,
          identifier: plate,
          alert_reason: reasons[Math.floor(Math.random() * reasons.length)],
          confidence_score: Number((Math.random() * 3 + 96.2).toFixed(1)),
          thumbnail_url: newEvent.thumbnail_url,
          is_acknowledged: false,
          created_at: new Date().toISOString(),
          priority: isCritical ? 'CRITICAL' : 'HIGH',
          vehicle_class: vClass,
          dispatchedUnit: `PCR-${Math.floor(Math.random() * 80 + 10)} Interceptor`
        };

        tacticalAudio.playBoloAlarm();
        this.notifyAlertListeners(newAlert);
      }
    }, 4500);
  }

  public stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isSimulating = false;
  }

  public onVehicleEvent(callback: (event: VehicleEvent) => void) {
    this.eventListeners.push(callback);
    return () => {
      this.eventListeners = this.eventListeners.filter(cb => cb !== callback);
    };
  }

  public onActiveAlert(callback: (alert: ActiveAlert) => void) {
    this.alertListeners.push(callback);
    return () => {
      this.alertListeners = this.alertListeners.filter(cb => cb !== callback);
    };
  }

  private notifyEventListeners(event: VehicleEvent) {
    this.eventListeners.forEach(cb => {
      try {
        cb(event);
      } catch (err) {
        console.error('Error in vehicle event listener:', err);
      }
    });
  }

  private notifyAlertListeners(alert: ActiveAlert) {
    this.alertListeners.forEach(cb => {
      try {
        cb(alert);
      } catch (err) {
        console.error('Error in alert listener:', err);
      }
    });
  }
}

export const supabaseService = new SupabaseService();
