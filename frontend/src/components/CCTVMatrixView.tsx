import { useState } from 'react';
import { Camera, VehicleEvent } from '../types';
import { GUJARAT_CAMERAS, INITIAL_VEHICLE_EVENTS } from '../data/cameras';
import { VideoTile } from './VideoTile';
import { VehicleCropImage } from './VehicleCropImage';
import {
  X, Camera as CameraIcon, ZoomIn, ZoomOut,
  MapPin, Clock, Search, Database, CheckCircle2, AlertCircle
} from 'lucide-react';
import { tacticalAudio } from '../utils/audio';

interface CCTVMatrixViewProps {
  cameras?: Camera[];
  events?: VehicleEvent[];
  supabaseConnected?: boolean;
}

export function CCTVMatrixView({ cameras, events, supabaseConnected }: CCTVMatrixViewProps) {
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [gridSize, setGridSize] = useState<number>(9); // 4, 9, 16
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [focusedCamera, setFocusedCamera] = useState<Camera | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [snapshotTaken, setSnapshotTaken] = useState<boolean>(false);

  const cameraList = cameras && cameras.length > 0 ? cameras : GUJARAT_CAMERAS;
  const eventList = events && events.length > 0 ? events : INITIAL_VEHICLE_EVENTS;

  // Extract unique cities / districts from cameras dynamically
  const uniqueDistricts = Array.from(new Set(cameraList.map(c => c.district || c.city).filter(Boolean)));
  const cities = ['All', ...uniqueDistricts.slice(0, 8)];

  const filteredCameras = cameraList.filter(cam => {
    const loc = (cam.district || cam.city || '').toLowerCase();
    const matchesCity = selectedCity === 'All' || loc.includes(selectedCity.toLowerCase());
    const matchesSearch = !searchQuery ||
      cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.includes(searchQuery.toLowerCase());
    return matchesCity && matchesSearch;
  });

  const displayedCameras = filteredCameras.slice(0, gridSize);

  // Relevant vehicle events for focused camera
  const focusedEvents = focusedCamera
    ? eventList.filter(e => e.camera_id === focusedCamera.id || (e.camera_name && e.camera_name.includes(focusedCamera.city)))
    : [];

  const handleTakeSnapshot = () => {
    tacticalAudio.playAckChime();
    setSnapshotTaken(true);
    setTimeout(() => setSnapshotTaken(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* Clean Minimal Controls Toolbar */}
      <div className="bg-[#111826] border border-[#233046] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        {/* City Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {cities.map(city => (
            <button
              key={city}
              type="button"
              onClick={() => {
                tacticalAudio.playClickBeep();
                setSelectedCity(city);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${selectedCity === city
                  ? 'bg-[#3FD6A6] text-[#0A0F16] font-semibold'
                  : 'bg-[#151E2E] text-[#8996A8] hover:text-[#E7ECF3] hover:bg-[#1A2436]'
                }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Right Controls: Search & Layout */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Quick Filter Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8996A8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter cameras..."
              className="pl-8 pr-3 py-1 bg-[#0A0F16] border border-[#233046] focus:border-[#3FD6A6] rounded-lg text-xs text-[#E7ECF3] placeholder-[#57647A] outline-none w-36 sm:w-44 transition-colors"
            />
          </div>

          {/* Grid Layout Switcher */}
          <div className="flex items-center bg-[#0A0F16] p-0.5 rounded-lg border border-[#233046]">
            {[
              { label: '2×2', count: 4 },
              { label: '3×3', count: 9 },
              { label: '4×4', count: 16 }
            ].map(item => (
              <button
                key={item.count}
                type="button"
                onClick={() => setGridSize(item.count)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${gridSize === item.count
                    ? 'bg-[#1A2436] text-[#3FD6A6] font-bold'
                    : 'text-[#8996A8] hover:text-[#E7ECF3]'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Camera Grid */}
      <div
        className={`grid gap-3.5 ${gridSize === 4
            ? 'grid-cols-1 md:grid-cols-2'
            : gridSize === 9
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          }`}
      >
        {displayedCameras.map(camera => (
          <VideoTile
            key={camera.id}
            camera={camera}
            onFocus={cam => {
              tacticalAudio.playClickBeep();
              setFocusedCamera(cam);
              setZoomLevel(1);
            }}
          />
        ))}
      </div>

      {displayedCameras.length === 0 && (
        <div className="py-16 text-center text-[#8996A8] bg-[#111826] rounded-xl border border-[#233046]">
          No cameras found matching "{searchQuery}".
        </div>
      )}

      {/* Clean Camera Focus Modal */}
      {focusedCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-[#0A0F16]/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-5xl bg-[#111826] border border-[#233046] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-[#233046] flex items-center justify-between bg-[#0A0F16]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#3FD6A6]/10 text-[#3FD6A6] border border-[#3FD6A6]/30 text-xs font-bold font-mono">
                  {focusedCamera.code}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#E7ECF3]">
                    {focusedCamera.name.replace(/^\d+\s*/, '')}
                  </h3>
                  <div className="text-[11px] text-[#8996A8] flex items-center gap-2">
                    <span>{focusedCamera.city}</span>
                    <span>·</span>
                    <span>{focusedCamera.junctionType}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFocusedCamera(null)}
                className="p-1.5 rounded-lg text-[#8996A8] hover:text-[#E7ECF3] hover:bg-[#151E2E] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-auto">
              {/* Large Video Feed */}
              <div className="lg:col-span-2 space-y-3">
                <div className="relative aspect-video rounded-xl overflow-hidden border border-[#233046] bg-[#0A0F16]">
                  <div
                    className="w-full h-full transition-transform duration-200"
                    style={{ transform: `scale(${zoomLevel})` }}
                  >
                    <VideoTile camera={focusedCamera} />
                  </div>

                  {/* Clean Control Overlay Bottom Right */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-30 bg-[#111826]/90 backdrop-blur-sm p-1 rounded-lg border border-[#233046]">
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))}
                      title="Zoom in"
                      className="p-1.5 rounded hover:bg-[#151E2E] text-[#8996A8] hover:text-[#3FD6A6]"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 1))}
                      title="Zoom out"
                      className="p-1.5 rounded hover:bg-[#151E2E] text-[#8996A8] hover:text-[#3FD6A6]"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleTakeSnapshot}
                      title="Capture Frame Snapshot"
                      className="px-2 py-1 rounded bg-[#3FD6A6] text-[#0A0F16] text-xs font-semibold flex items-center gap-1 hover:bg-[#35B88E]"
                    >
                      <CameraIcon className="w-3.5 h-3.5" />
                      <span>{snapshotTaken ? 'Saved!' : 'Snapshot'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#8996A8] px-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#3FD6A6]" />
                    <span>Lat: {focusedCamera.lat.toFixed(4)}, Lng: {focusedCamera.lng.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#5FB3E8]" />
                    <span>Live Supervised Stream (HLS)</span>
                  </div>
                </div>
              </div>

              {/* Clean Sighting Ledger on Right */}
              <div className="bg-[#0A0F16] border border-[#233046] rounded-xl p-3 flex flex-col">
                <div className="text-xs font-bold text-[#E7ECF3] pb-2 mb-2 border-b border-[#233046]">
                  Recent Vehicles Detected
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
                  {focusedEvents.length > 0 ? (
                    focusedEvents.map(evt => (
                      <div
                        key={evt.id}
                        className="p-2 rounded-lg bg-[#111826] border border-[#233046] flex items-center gap-2.5"
                      >
                        <VehicleCropImage
                          cameraId={evt.camera_id}
                          trackId={evt.track_id}
                          vehicleClass={evt.vehicle_class}
                          thumbnailUrl={evt.thumbnail_url}
                          plateNumber={evt.plate_number}
                          colorName={evt.color_name}
                          className="w-14 h-10 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[#E7ECF3] font-mono truncate">
                            {evt.plate_number || `Track #${evt.track_id}`}
                          </div>
                          <div className="text-[11px] text-[#8996A8] truncate">
                            {evt.vehicle_class} · {evt.color_name}
                          </div>
                          <div className="text-[10px] text-[#3FD6A6]">
                            {evt.traffic_flow} · {evt.speed_kmh} km/h
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-[#8996A8]">
                      Monitoring vehicle arrivals...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
