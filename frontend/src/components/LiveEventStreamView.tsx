import { useState } from 'react';
import { VehicleEvent } from '../types';
import { VehicleCropImage } from './VehicleCropImage';
import { Play, Pause, Download, MapPin, Clock, ArrowUpRight, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { tacticalAudio } from '../utils/audio';

interface LiveEventStreamViewProps {
  events: VehicleEvent[];
  onSelectEvent: (event: VehicleEvent) => void;
  latestEventId?: string | null;
  supabaseConnected?: boolean;
}

export function LiveEventStreamView({
  events,
  onSelectEvent,
  latestEventId,
  supabaseConnected = false
}: LiveEventStreamViewProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [classFilter, setClassFilter] = useState('All');

  const classes = [
    'All', 'Three-wheeler', 'Two-wheeler', 'Hatchback',
    'Sedan', 'SUV', 'Bus', 'Truck'
  ];

  const filteredEvents = events.filter(evt => {
    if (classFilter !== 'All' && evt.vehicle_class !== classFilter) return false;
    return true;
  });

  const handleExportCsv = () => {
    tacticalAudio.playAckChime();
    const headers = 'ID,Timestamp,Camera,Class,Color,Flow,Speed,Plate\n';
    const rows = filteredEvents.map(e =>
      `"${e.id}","${e.created_at}","${e.camera_name || ''}","${e.vehicle_class}","${e.color_name}","${e.traffic_flow}",${e.speed_kmh || 0},"${e.plate_number || ''}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cctv_events_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* Supabase Status Banner */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#111826] border border-[#233046] text-xs">
        <div className="flex items-center gap-2 text-[#8996A8]">
          <Database className="w-3.5 h-3.5 text-[#3FD6A6]" />
          <span>
            {supabaseConnected ? (
              <span className="text-[#3FD6A6] font-medium flex items-center gap-1.5 inline-flex">
                <CheckCircle2 className="w-3 h-3 text-[#3FD6A6]" />
                Realtime Stream Active · Subscribed to <code className="text-[#E7ECF3] bg-[#0A0F16] px-1 rounded">postgres_changes (INSERT, vehicle_events)</code>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 inline-flex">
                <AlertCircle className="w-3 h-3 text-[#F5B54C]" />
                Operating in Simulated Mode. Connect your Supabase project to receive live events in real-time without refreshing.
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Top Header & Controls */}
      <div className="bg-[#111826] border border-[#233046] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-[#F5B54C]' : 'bg-[#3FD6A6] animate-ping'}`} />
          <div>
            <h2 className="text-sm md:text-base font-bold text-[#E7ECF3]">
              Live Vehicle Detections
            </h2>
            <p className="text-xs text-[#8996A8]">
              Continuous CCTV feed detections across Gujarat highway checkpoints
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={() => {
              tacticalAudio.playClickBeep();
              setIsPaused(!isPaused);
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${isPaused
                ? 'bg-[#F5B54C]/15 border-[#F5B54C]/50 text-[#F5B54C]'
                : 'bg-[#151E2E] border-[#233046] text-[#3FD6A6] hover:bg-[#1A2436]'
              }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Feed' : 'Pause Feed'}</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-[#151E2E] hover:bg-[#1A2436] border border-[#233046] text-xs text-[#E7ECF3] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#5FB3E8]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Class Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {classes.map(cls => (
          <button
            key={cls}
            type="button"
            onClick={() => setClassFilter(cls)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${classFilter === cls
                ? 'bg-[#3FD6A6] text-[#0A0F16] font-semibold'
                : 'bg-[#151E2E] text-[#8996A8] hover:text-[#E7ECF3]'
              }`}
          >
            {cls}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-2">
        {filteredEvents.map(evt => {
          const isNew = evt.id === latestEventId;
          return (
            <div
              key={evt.id}
              onClick={() => {
                tacticalAudio.playClickBeep();
                onSelectEvent(evt);
              }}
              className={`bg-[#111826] border rounded-xl p-3 flex items-center justify-between gap-4 transition-all duration-300 cursor-pointer hover:border-[#3FD6A6]/60 ${isNew
                  ? 'border-[#3FD6A6] shadow-[0_0_12px_rgba(63,214,166,0.25)] bg-[#152336] scale-[1.002]'
                  : 'border-[#233046]'
                }`}
            >
              {/* Left: Thumbnail & Identifiers */}
              <div className="flex items-center gap-3 min-w-0">
                <VehicleCropImage
                  cameraId={evt.camera_id}
                  trackId={evt.track_id}
                  vehicleClass={evt.vehicle_class}
                  thumbnailUrl={evt.thumbnail_url}
                  plateNumber={evt.plate_number}
                  colorName={evt.color_name}
                  className="w-16 h-11 shrink-0 rounded-md"
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs font-mono text-[#E7ECF3] tracking-wide">
                      {evt.plate_number || `Track #${evt.track_id}`}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#3FD6A6]/15 text-[#3FD6A6] border border-[#3FD6A6]/30">
                      {evt.traffic_flow}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8996A8] mt-0.5">
                    {evt.vehicle_class} · {evt.color_name} · {evt.speed_kmh} km/h
                  </div>
                </div>
              </div>

              {/* Right: Camera Location & Time */}
              <div className="flex items-center gap-4 text-right shrink-0">
                <div className="hidden sm:block">
                  <div className="text-xs text-[#E7ECF3] flex items-center justify-end gap-1">
                    <MapPin className="w-3 h-3 text-[#3FD6A6]" />
                    <span>{evt.camera_name.replace(/^\d+\s*/, '')}</span>
                  </div>
                  <div className="text-[11px] text-[#8996A8] flex items-center justify-end gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                </div>

                <div className="p-1 rounded bg-[#151E2E] text-[#8996A8] group-hover:text-[#3FD6A6]">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="py-16 text-center text-[#8996A8] bg-[#111826] rounded-xl border border-[#233046]">
          No vehicle events recorded yet.
        </div>
      )}
    </div>
  );
}
