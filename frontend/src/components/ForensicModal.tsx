import { VehicleEvent } from '../types';
import { VehicleCropImage } from './VehicleCropImage';
import { X, MapPin, Clock, Gauge, Compass } from 'lucide-react';
import { VideoTile } from './VideoTile';
import { GUJARAT_CAMERAS } from '../data/cameras';

interface ForensicModalProps {
  event: VehicleEvent;
  onClose: () => void;
}

export function ForensicModal({ event, onClose }: ForensicModalProps) {
  const camera = GUJARAT_CAMERAS.find(c => c.id === event.camera_id) || {
    id: event.camera_id,
    code: event.camera_id.toUpperCase(),
    name: event.camera_name,
    department: 'Traffic Branch',
    city: 'Gujarat',
    hlsUrl: `/api/stream/${event.camera_id}/index.m3u8`,
    lat: 23.0225,
    lng: 72.5714,
    status: 'live' as const,
    fps: 25,
    bitrateKbps: 2100,
    activeDetections: 8,
    aiProfileId: 'traffic-ai',
    junctionType: 'Main Road'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-[#0A0F16]/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#111826] border border-[#233046] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#233046] flex items-center justify-between bg-[#0A0F16]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#E7ECF3]">
              Vehicle Record
            </span>
            <span className="px-2 py-0.5 rounded bg-[#3FD6A6]/15 border border-[#3FD6A6]/30 text-xs font-mono font-bold text-[#3FD6A6]">
              {event.plate_number || `Track #${event.track_id}`}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8996A8] hover:text-[#E7ECF3] hover:bg-[#151E2E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto">
          {/* Left: Vehicle High-Res Snapshot & Camera */}
          <div className="space-y-3">
            <div className="aspect-[16/10] rounded-xl overflow-hidden bg-[#0A0F16] border border-[#233046]">
              <VehicleCropImage
                cameraId={event.camera_id}
                trackId={event.track_id}
                vehicleClass={event.vehicle_class}
                thumbnailUrl={event.thumbnail_url}
                plateNumber={event.plate_number}
                colorName={event.color_name}
                isHighRes={true}
                className="w-full h-full"
              />
            </div>

            <div className="text-[11px] text-[#8996A8] text-center">
              Visual Sighting Snapshot · {event.vehicle_class}
            </div>
          </div>

          {/* Right: Vehicle Details Table */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-[#0A0F16] border border-[#233046] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8996A8]">License Plate</span>
                  <span className="font-mono font-bold text-[#E7ECF3] text-sm">
                    {event.plate_number || 'Unregistered / Profile Sighting'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8996A8]">Vehicle Type</span>
                  <span className="font-semibold text-[#E7ECF3]">
                    {event.vehicle_class}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8996A8]">Color Profile</span>
                  <span className="text-[#E7ECF3]">
                    {event.color_name}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8996A8]">Movement / Flow</span>
                  <span className="px-2 py-0.5 rounded bg-[#3FD6A6]/15 text-[#3FD6A6] font-medium text-[11px]">
                    {event.traffic_flow}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8996A8]">Detected Speed</span>
                  <span className="text-[#E7ECF3] font-medium">
                    {event.speed_kmh} km/h
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0A0F16] border border-[#233046] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8996A8] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#3FD6A6]" />
                    Camera Location
                  </span>
                  <span className="text-[#E7ECF3] font-medium truncate max-w-[180px]">
                    {event.camera_name.replace(/^\d+\s*/, '')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8996A8] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#5FB3E8]" />
                    Sighting Timestamp
                  </span>
                  <span className="text-[#E7ECF3]">
                    {new Date(event.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#151E2E] hover:bg-[#1A2436] border border-[#233046] text-xs text-[#E7ECF3] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
