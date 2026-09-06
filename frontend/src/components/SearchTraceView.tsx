import { useState, useEffect } from 'react';
import { VehicleEvent } from '../types';
import { parseNaturalLanguageQuery } from '../utils/queryParser';
import { supabaseService } from '../services/supabase';
import { VehicleCropImage } from './VehicleCropImage';
import { Search, MapPin, Clock, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { tacticalAudio } from '../utils/audio';

interface SearchTraceViewProps {
  events: VehicleEvent[];
  onSelectEvent: (event: VehicleEvent) => void;
  supabaseConnected?: boolean;
}

export function SearchTraceView({
  events: fallbackEvents,
  onSelectEvent,
  supabaseConnected = false
}: SearchTraceViewProps) {
  const [query, setQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedColor, setSelectedColor] = useState<string>('All');
  const [searchResults, setSearchResults] = useState<VehicleEvent[]>(fallbackEvents);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const vehicleClasses = [
    'All',
    'Three-wheeler',
    'Two-wheeler',
    'Hatchback',
    'Sedan',
    'SUV',
    'Bus',
    'Truck'
  ];

  const colors = ['All', 'White', 'Black', 'Yellow / Green', 'Silver Grey', 'Crimson Red', 'Cyan Blue'];

  // Parse natural language query
  const parsed = parseNaturalLanguageQuery(query);

  useEffect(() => {
    let isCancelled = false;
    setIsSearching(true);

    const activeClass = selectedClass !== 'All' ? selectedClass : parsed.vehicleClass;
    const activeColor = selectedColor !== 'All' ? selectedColor : parsed.color;
    const activeFlow = parsed.trafficFlow;
    const activePlate = parsed.plateMatch;

    // Instant Attribute Search by chaining filters: .eq('vehicle_class', val).ilike('traffic_flow', `%${val}%`)
    supabaseService.searchEvents({
      v_class: activeClass,
      color: activeColor,
      flow: activeFlow,
      plate: activePlate,
      query: query.trim(),
      limit: 50
    }).then(results => {
      if (!isCancelled) {
        setSearchResults(results);
        setIsSearching(false);
      }
    }).catch(() => {
      if (!isCancelled) {
        setIsSearching(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [query, selectedClass, selectedColor, fallbackEvents]);

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
                Supabase Live Connected · Table: <code className="text-[#E7ECF3] bg-[#0A0F16] px-1 rounded">vehicle_events</code> · Bucket: <code className="text-[#E7ECF3] bg-[#0A0F16] px-1 rounded">vehicle-thumbnails</code>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 inline-flex">
                <AlertCircle className="w-3 h-3 text-[#F5B54C]" />
                Operating in Simulated / Local Mode. Connect your Supabase project to fetch your stored vehicle events & storage bucket thumbnails.
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Search Bar & Quick Filters */}
      <div className="bg-[#111826] border border-[#233046] rounded-xl p-4 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8996A8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by license plate, vehicle model, color, or description (e.g. 'white hatchback', 'black SUV', 'GJ-01')..."
            className="w-full bg-[#0A0F16] border border-[#233046] focus:border-[#3FD6A6] rounded-xl pl-10 pr-20 py-2.5 text-xs text-[#E7ECF3] placeholder-[#57647A] outline-none transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8996A8] hover:text-[#E7ECF3] px-2 py-0.5 rounded bg-[#151E2E] cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-[#8996A8] mr-1">Type:</span>
          {vehicleClasses.map(cls => (
            <button
              key={cls}
              type="button"
              onClick={() => setSelectedClass(cls)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${selectedClass === cls
                  ? 'bg-[#3FD6A6] text-[#0A0F16] font-semibold'
                  : 'bg-[#151E2E] text-[#8996A8] hover:text-[#E7ECF3]'
                }`}
            >
              {cls}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-xs text-[#8996A8] mr-1">Color:</span>
          {colors.map(col => (
            <button
              key={col}
              type="button"
              onClick={() => setSelectedColor(col)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${selectedColor === col
                  ? 'bg-[#5FB3E8] text-[#0A0F16] font-semibold'
                  : 'bg-[#151E2E] text-[#8996A8] hover:text-[#E7ECF3]'
                }`}
            >
              {col}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-semibold text-[#E7ECF3]">
          {searchResults.length} {searchResults.length === 1 ? 'Vehicle' : 'Vehicles'} Found
        </div>
        {isSearching && (
          <div className="text-xs text-[#3FD6A6] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3FD6A6] animate-ping" />
            Querying Supabase...
          </div>
        )}
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {searchResults.map(evt => (
          <div
            key={evt.id}
            onClick={() => {
              tacticalAudio.playClickBeep();
              onSelectEvent(evt);
            }}
            className="group bg-[#111826] border border-[#233046] hover:border-[#3FD6A6]/60 rounded-xl p-3 shadow-sm transition-all cursor-pointer flex flex-col justify-between"
          >
            {/* Real Vehicle Thumbnail Image directly using standard public bucket URL in <img> */}
            <div className="w-full aspect-[16/10] rounded-lg overflow-hidden bg-[#0A0F16] border border-[#233046] mb-3 relative">
              <VehicleCropImage
                cameraId={evt.camera_id}
                trackId={evt.track_id}
                vehicleClass={evt.vehicle_class}
                thumbnailUrl={evt.thumbnail_url}
                plateNumber={evt.plate_number}
                colorName={evt.color_name}
                className="w-full h-full"
              />
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-[#0A0F16]/85 backdrop-blur-sm border border-[#233046] text-[10px] font-medium text-[#3FD6A6]">
                {evt.traffic_flow}
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#E7ECF3] font-mono tracking-wide">
                  {evt.plate_number || `Track #${evt.track_id}`}
                </span>
                <span className="text-[10px] text-[#8996A8]">
                  {evt.speed_kmh} km/h
                </span>
              </div>

              <div className="text-[11px] text-[#8996A8]">
                {evt.color_name} · {evt.vehicle_class}
              </div>

              <div className="pt-2 border-t border-[#233046]/60 flex items-center justify-between text-[11px] text-[#57647A]">
                <div className="flex items-center gap-1 truncate max-w-[170px]">
                  <MapPin className="w-3 h-3 text-[#3FD6A6] shrink-0" />
                  <span className="truncate">{evt.camera_name.replace(/^\d+\s*/, '')}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-[#8996A8]">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {searchResults.length === 0 && !isSearching && (
        <div className="py-16 text-center text-[#8996A8] bg-[#111826] rounded-xl border border-[#233046] p-6">
          <p className="font-medium text-sm text-[#E7ECF3] mb-1">No vehicles matched your search filters</p>
          <p className="text-xs text-[#8996A8]">Try clearing your search query or selecting "All" for type and color.</p>
        </div>
      )}
    </div>
  );
}
