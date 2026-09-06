import { useState, useMemo } from 'react';
import { supabaseService } from '../services/supabase';

interface VehicleCropImageProps {
  cameraId: string;
  trackId: number;
  vehicleClass: string;
  thumbnailUrl?: string;
  className?: string;
  isHighRes?: boolean;
  plateNumber?: string;
  colorName?: string;
}

export function VehicleCropImage({
  cameraId,
  trackId,
  vehicleClass,
  thumbnailUrl,
  className = '',
  isHighRes = false,
  plateNumber,
  colorName = 'White'
}: VehicleCropImageProps) {
  const [imgError, setImgError] = useState(false);

  // Compute public bucket URL directly into standard <img src="...">
  const publicBucketUrl = useMemo(() => {
    const config = supabaseService.getConfig();
    const supabaseUrl = config.url ? config.url.replace(/\/$/, '') : '';
    const bucket = config.storageBucket || 'vehicle-thumbnails';

    if (thumbnailUrl && thumbnailUrl.trim()) {
      const clean = thumbnailUrl.trim();
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

    // Default Supabase storage pattern: https://<project>.supabase.co/storage/v1/object/public/vehicle-thumbnails/<cameraId>_id<trackId>_<class>.jpg
    if (supabaseUrl) {
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cameraId}_id${trackId}_${vehicleClass}.jpg`;
    }

    return '';
  }, [cameraId, trackId, vehicleClass, thumbnailUrl]);

  // Color mappings for fallback tactical preview
  const normColor = (colorName || 'White').toLowerCase();
  let bodyColor = '#CBD5E1';
  let accentColor = '#94A3B8';
  if (normColor.includes('black') || normColor.includes('dark')) {
    bodyColor = '#1E293B';
    accentColor = '#0F172A';
  } else if (normColor.includes('yellow') || normColor.includes('green')) {
    bodyColor = '#EAB308';
    accentColor = '#15803D';
  } else if (normColor.includes('blue') || normColor.includes('cyan')) {
    bodyColor = '#2563EB';
    accentColor = '#1D4ED8';
  } else if (normColor.includes('red') || normColor.includes('crimson')) {
    bodyColor = '#DC2626';
    accentColor = '#991B1B';
  } else if (normColor.includes('white') || normColor.includes('silver') || normColor.includes('grey')) {
    bodyColor = '#E2E8F0';
    accentColor = '#94A3B8';
  }

  const normClass = (vehicleClass || 'Sedan').toLowerCase();
  const displayPlate = plateNumber || `GJ-01-${trackId || 1042}`;

  return (
    <div
      className={`relative overflow-hidden bg-[#0B111B] border border-[#233046] flex items-center justify-center select-none ${className}`}
    >
      {publicBucketUrl && !imgError ? (
        /* Standard <img src="https://<project>.supabase.co/storage/v1/object/public/vehicle-thumbnails/<file>.jpg"> */
        <img
          src={publicBucketUrl}
          alt={`Vehicle #${trackId} (${vehicleClass})`}
          loading="lazy"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        /* Tactical CCTV Vehicle Silhouette Fallback */
        <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-b from-[#0F172A] to-[#0A0F16]">
          <svg
            viewBox="0 0 160 100"
            className="w-full h-full object-contain p-1"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background grid */}
            <line x1="0" y1="35" x2="160" y2="35" stroke="#1E293B" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1="0" y1="70" x2="160" y2="70" stroke="#1E293B" strokeWidth="0.5" strokeDasharray="2,2" />
            
            {/* Road surface */}
            <rect x="0" y="72" width="160" height="28" fill="#070C14" />
            <line x1="0" y1="72" x2="160" y2="72" stroke="#1E293B" strokeWidth="1" />
            <line x1="10" y1="86" x2="40" y2="86" stroke="#EAB308" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.6" />
            <line x1="60" y1="86" x2="95" y2="86" stroke="#EAB308" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.6" />
            <line x1="115" y1="86" x2="150" y2="86" stroke="#EAB308" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.6" />

            {/* Vehicle graphic based on class */}
            {normClass.includes('three') || normClass.includes('rickshaw') || normClass.includes('auto') ? (
              <g>
                <path d="M 35 72 L 45 42 L 80 34 L 115 34 L 125 54 L 128 72 Z" fill={bodyColor} />
                <path d="M 40 56 L 125 56 L 125 72 L 40 72 Z" fill={accentColor} />
                <polygon points="50,44 75,38 75,54 46,54" fill="#38BDF8" opacity="0.75" />
                <rect x="80" y="40" width="38" height="22" rx="2" fill="#0A0F16" opacity="0.9" />
                <circle cx="52" cy="74" r="9" fill="#18181B" stroke="#52525B" strokeWidth="2" />
                <circle cx="112" cy="74" r="9" fill="#18181B" stroke="#52525B" strokeWidth="2" />
              </g>
            ) : normClass.includes('two') || normClass.includes('bike') || normClass.includes('scooter') ? (
              <g>
                <path d="M 50 72 L 70 50 L 95 50 L 115 72" stroke={bodyColor} strokeWidth="5" strokeLinecap="round" fill="none" />
                <path d="M 70 50 L 85 40 L 100 40 L 105 50 Z" fill={bodyColor} />
                <circle cx="50" cy="72" r="11" fill="#09090B" stroke="#71717A" strokeWidth="2" />
                <circle cx="115" cy="72" r="11" fill="#09090B" stroke="#71717A" strokeWidth="2" />
              </g>
            ) : normClass.includes('bus') ? (
              <g>
                <rect x="25" y="32" width="115" height="40" rx="4" fill={bodyColor} />
                <rect x="25" y="54" width="115" height="18" rx="0" fill={accentColor} />
                <rect x="30" y="36" width="12" height="14" rx="1.5" fill="#38BDF8" opacity="0.75" />
                <rect x="46" y="36" width="14" height="14" rx="1.5" fill="#38BDF8" opacity="0.75" />
                <rect x="64" y="36" width="14" height="14" rx="1.5" fill="#38BDF8" opacity="0.75" />
                <rect x="82" y="36" width="14" height="14" rx="1.5" fill="#38BDF8" opacity="0.75" />
                <rect x="100" y="36" width="14" height="14" rx="1.5" fill="#38BDF8" opacity="0.75" />
                <rect x="118" y="36" width="18" height="14" rx="1.5" fill="#38BDF8" opacity="0.75" />
                <circle cx="50" cy="73" r="9" fill="#18181B" stroke="#52525B" strokeWidth="2" />
                <circle cx="115" cy="73" r="9" fill="#18181B" stroke="#52525B" strokeWidth="2" />
              </g>
            ) : normClass.includes('truck') ? (
              <g>
                <rect x="25" y="30" width="75" height="42" rx="2" fill={bodyColor} />
                <path d="M 100 42 L 118 42 L 130 56 L 130 72 L 100 72 Z" fill={accentColor} />
                <polygon points="106,46 116,46 124,56 106,56" fill="#38BDF8" opacity="0.75" />
                <circle cx="45" cy="73" r="9" fill="#18181B" stroke="#52525B" strokeWidth="2" />
                <circle cx="65" cy="73" r="9" fill="#18181B" stroke="#52525B" strokeWidth="2" />
                <circle cx="120" cy="73" r="9" fill="#18181B" stroke="#52525B" strokeWidth="2" />
              </g>
            ) : normClass.includes('suv') ? (
              <g>
                <path d="M 28 62 L 38 44 L 75 38 L 110 38 L 128 48 L 138 62 L 138 72 L 28 72 Z" fill={bodyColor} />
                <polygon points="55,42 76,41 76,54 48,54" fill="#38BDF8" opacity="0.75" />
                <polygon points="81,41 104,41 104,54 81,54" fill="#38BDF8" opacity="0.75" />
                <polygon points="108,41 122,48 122,54 108,54" fill="#38BDF8" opacity="0.75" />
                <circle cx="50" cy="73" r="10" fill="#18181B" stroke="#52525B" strokeWidth="2" />
                <circle cx="116" cy="73" r="10" fill="#18181B" stroke="#52525B" strokeWidth="2" />
              </g>
            ) : (
              /* Standard Sedan / Hatchback */
              <g>
                <path d="M 25 64 L 42 54 L 62 40 L 105 40 L 125 54 L 142 56 L 142 72 L 25 72 Z" fill={bodyColor} />
                <polygon points="63,43 82,43 82,54 52,54" fill="#38BDF8" opacity="0.75" />
                <polygon points="86,43 104,43 118,54 86,54" fill="#38BDF8" opacity="0.75" />
                <circle cx="50" cy="73" r="9" fill="#18181B" stroke="#52525B" strokeWidth="2" />
                <circle cx="118" cy="73" r="9" fill="#18181B" stroke="#52525B" strokeWidth="2" />
              </g>
            )}

            {/* AI Bounding Box Corners */}
            <polyline points="18,24 18,16 26,16" stroke="#3FD6A6" strokeWidth="1.5" fill="none" opacity="0.8" />
            <polyline points="134,16 142,16 142,24" stroke="#3FD6A6" strokeWidth="1.5" fill="none" opacity="0.8" />
            <polyline points="18,76 18,84 26,84" stroke="#3FD6A6" strokeWidth="1.5" fill="none" opacity="0.8" />
            <polyline points="134,84 142,84 142,76" stroke="#3FD6A6" strokeWidth="1.5" fill="none" opacity="0.8" />

            {/* License plate stamp */}
            <g transform="translate(85, 76)">
              <rect x="0" y="0" width="70" height="16" rx="2" fill="#0A0F16" stroke="#3FD6A6" strokeWidth="0.8" />
              <text x="35" y="11" fill="#3FD6A6" fontFamily="monospace" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                {displayPlate}
              </text>
            </g>

            {/* Vehicle class tag */}
            <g transform="translate(6, 6)">
              <rect x="0" y="0" width="54" height="13" rx="2" fill="#0A0F16" opacity="0.9" stroke="#233046" strokeWidth="0.8" />
              <text x="27" y="9.5" fill="#E7ECF3" fontFamily="sans-serif" fontSize="6.5" fontWeight="600" textAnchor="middle">
                {vehicleClass}
              </text>
            </g>
          </svg>
        </div>
      )}

      {/* High-res overlay watermark badge if requested */}
      {isHighRes && (
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#0A0F16]/85 backdrop-blur-md border border-[#233046] text-[10px] font-mono text-[#3FD6A6] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3FD6A6] animate-pulse" />
          <span>CAM: {cameraId.toUpperCase()} · #{trackId}</span>
        </div>
      )}
    </div>
  );
}
