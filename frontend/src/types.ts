export type Department = 
  | 'Home Dept'
  | 'Municipal Corp'
  | 'Traffic Branch'
  | 'RTO / Traffic'
  | 'Transit Police'
  | 'Rural Police'
  | 'Coastal Security'
  | 'Civil Supplies & Port'
  | string;

export interface DepartmentRecord {
  id: string;
  name: string;
  zone?: string | null;
}

export interface CameraRecord {
  id: string;
  name: string;
  department_id?: string | null;
  district?: string | null;
  is_active?: boolean;
  created_at?: string;
  departments?: DepartmentRecord | null;
}

export interface Camera {
  id: string; // e.g. "cam01"
  code: string; // e.g. "CAM-01"
  name: string; // e.g. "01 Chiman bhai Bridge"
  department: string;
  department_id?: string;
  district?: string;
  city: string;
  hlsUrl: string;
  lat: number;
  lng: number;
  status: 'live' | 'buffering' | 'offline';
  fps: number;
  bitrateKbps: number;
  activeDetections: number;
  aiProfileId: string;
  junctionType: string;
  is_active?: boolean;
}

export type VehicleClass = 
  | 'Three-wheeler'
  | 'Two-wheeler'
  | 'Hatchback'
  | 'Sedan'
  | 'SUV'
  | 'Bus'
  | 'Truck'
  | 'Light Commercial Vehicle (LCV)'
  | 'E-Rickshaw'
  | 'Tractor'
  | 'Tanker'
  | 'Ambulance'
  | 'Police PCR'
  | 'Construction Vehicle'
  | string;

export type TrafficFlow = 'Inbound' | 'Outbound' | 'Auto-Stand/Parking' | 'Turning' | 'Cross-Junction' | string;
export type MotionState = 'Moving' | 'Stationary' | 'Slow Traffic' | 'Accelerating' | 'Decelerating' | string;

export interface VehicleEvent {
  id: string;
  camera_id: string;
  camera_name?: string;
  track_id: number;
  vehicle_class: string;
  dominant_color: string;
  color_name: string;
  motion_state: string;
  traffic_flow: string;
  net_displacement_px: number;
  entry_sec: number;
  exit_sec: number;
  dwell_sec: number;
  thumbnail_url: string;
  tamper_hash: string;
  created_at: string;
  plate_number?: string;
  speed_kmh?: number;
  confidence: number;
}

export interface WatchlistTarget {
  id: string;
  identifier: string; // e.g. "GJ01AB1234"
  target_type: string; // "Vehicle" | "Person" | "Plate"
  reason: string;
  priority: string; // "High" | "Medium" | "Low"
  is_active: boolean;
  issuing_branch?: string;
  created_at: string;
  alert_count?: number;
}

export interface ActiveAlert {
  id: string;
  camera_id: string;
  camera_name: string;
  identifier: string;
  alert_reason: string;
  confidence_score: number;
  thumbnail_url: string;
  is_acknowledged: boolean;
  created_at: string;
  priority?: string;
  vehicle_class?: string;
  dispatchedUnit?: string;
}

export interface SupabaseHealthReport {
  connected: boolean;
  tables: {
    departments: boolean;
    cameras: boolean;
    vehicle_events: boolean;
    watchlists: boolean;
    active_alerts: boolean;
  };
  counts: {
    departments: number;
    cameras: number;
    vehicle_events: number;
    watchlists: number;
    active_alerts: number;
  };
  bucketExists: boolean;
  error?: string;
}

export type ClearanceRole = 
  | 'Control Room Dispatcher'
  | 'Crime Branch Investigator'
  | 'Traffic DySP'
  | 'Supervisory Admin';

export interface UserSession {
  role: ClearanceRole;
  badgeNumber: string;
  authenticated: boolean;
  loginTime: string;
}

export interface AIProfile {
  id: string;
  name: string;
  wing: string;
  description: string;
  modelVersion: string;
  latencyMs: number;
  accuracyRate: number;
  targetClasses: string[];
  activeCamsCount: number;
  enabled: boolean;
}

export interface SentinelGridConfig {
  email: string;
  password: string;
  cdnHost: string;
  directIp: string;
  rtspPort: number;
  whepPort: number;
  hasCredentials: boolean;
}

export interface CameraProtocolEndpoints {
  hls: string;
  rtsp: string;
  whep: string;
  catalogueUrl: string;
  openCvSnippet: string;
  gstreamerCommand: string;
  ffplayRtspCommand: string;
  ffplayHlsCommand: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  gatewayHost: string;
  isCustom: boolean;
  connected: boolean;
  demoMode: boolean;
  storageBucket: string;
  sentinel?: SentinelGridConfig;
}
