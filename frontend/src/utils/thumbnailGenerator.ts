import { VehicleClass } from '../types';

export function getVehicleTacticalThumbnail(
  vehicleClass: VehicleClass,
  color: string,
  plate: string = 'GJ-01-XX-0000',
  trackId: number = 101,
  confidence: number = 98.5
): string {
  // SVG tactical wireframe/render based on vehicle class
  let vehiclePath = '';
  
  if (vehicleClass === 'Three-wheeler' || vehicleClass === 'E-Rickshaw') {
    // Auto-rickshaw distinct silhouette
    vehiclePath = `
      <polygon points="40,90 40,65 55,42 110,42 125,58 125,90" fill="${color}" opacity="0.85" stroke="#E7ECF3" stroke-width="1.5" />
      <rect x="58" y="46" width="30" height="20" fill="#151E2E" stroke="#5FB3E8" stroke-width="1" />
      <rect x="94" y="46" width="24" height="20" fill="#151E2E" stroke="#5FB3E8" stroke-width="1" />
      <circle cx="48" cy="94" r="10" fill="#0A0F16" stroke="#8996A8" stroke-width="2" />
      <circle cx="115" cy="94" r="10" fill="#0A0F16" stroke="#8996A8" stroke-width="2" />
      <path d="M 52 42 L 58 26 L 118 26 L 126 42 Z" fill="#3FD6A6" opacity="0.9" />
    `;
  } else if (vehicleClass === 'Two-wheeler') {
    // Motorcycle / Scooter
    vehiclePath = `
      <circle cx="45" cy="90" r="14" fill="#0A0F16" stroke="#8996A8" stroke-width="2.5" />
      <circle cx="115" cy="90" r="14" fill="#0A0F16" stroke="#8996A8" stroke-width="2.5" />
      <path d="M 45 90 L 70 65 L 95 65 L 115 90" stroke="${color}" stroke-width="4" fill="none" />
      <path d="M 70 65 L 60 45 L 75 45" stroke="#E7ECF3" stroke-width="2.5" fill="none" />
      <polygon points="75,62 100,62 95,50 78,50" fill="${color}" stroke="#E7ECF3" stroke-width="1" />
      <circle cx="85" cy="38" r="8" fill="#151E2E" stroke="#5FB3E8" stroke-width="1.5" />
    `;
  } else if (vehicleClass === 'Bus') {
    // Heavy Passenger Bus
    vehiclePath = `
      <rect x="25" y="32" width="125" height="58" rx="4" fill="${color}" opacity="0.85" stroke="#E7ECF3" stroke-width="1.5" />
      <rect x="30" y="38" width="18" height="22" fill="#111826" stroke="#5FB3E8" stroke-width="1" />
      <rect x="52" y="38" width="18" height="22" fill="#111826" stroke="#5FB3E8" stroke-width="1" />
      <rect x="74" y="38" width="18" height="22" fill="#111826" stroke="#5FB3E8" stroke-width="1" />
      <rect x="96" y="38" width="18" height="22" fill="#111826" stroke="#5FB3E8" stroke-width="1" />
      <rect x="118" y="38" width="26" height="22" fill="#111826" stroke="#3FD6A6" stroke-width="1" />
      <circle cx="45" cy="92" r="11" fill="#0A0F16" stroke="#8996A8" stroke-width="2.5" />
      <circle cx="125" cy="92" r="11" fill="#0A0F16" stroke="#8996A8" stroke-width="2.5" />
      <rect x="25" y="65" width="125" height="4" fill="#F5B54C" />
    `;
  } else if (vehicleClass === 'Truck' || vehicleClass === 'Tanker') {
    // Heavy Goods Vehicle / Tanker
    vehiclePath = `
      <rect x="20" y="38" width="85" height="52" rx="3" fill="${color}" opacity="0.8" stroke="#E7ECF3" stroke-width="1.5" />
      <polygon points="105,90 105,50 125,50 142,66 142,90" fill="#151E2E" stroke="#5FB3E8" stroke-width="1.5" />
      <rect x="120" y="55" width="16" height="15" fill="#111826" stroke="#5FB3E8" stroke-width="1" />
      <circle cx="36" cy="92" r="10" fill="#0A0F16" stroke="#8996A8" stroke-width="2.5" />
      <circle cx="58" cy="92" r="10" fill="#0A0F16" stroke="#8996A8" stroke-width="2.5" />
      <circle cx="126" cy="92" r="10" fill="#0A0F16" stroke="#8996A8" stroke-width="2.5" />
      <line x1="20" y1="64" x2="105" y2="64" stroke="#F5B54C" stroke-width="2" />
    `;
  } else {
    // Passenger Car (Sedan / Hatchback / SUV / LCV)
    vehiclePath = `
      <path d="M 28 85 L 34 68 L 52 50 L 108 50 L 128 68 L 144 74 L 144 86 Z" fill="${color}" opacity="0.85" stroke="#E7ECF3" stroke-width="1.5" />
      <polygon points="56,53 104,53 118,66 48,66" fill="#111826" stroke="#5FB3E8" stroke-width="1.2" />
      <line x1="80" y1="53" x2="80" y2="66" stroke="#233046" stroke-width="1.5" />
      <circle cx="48" cy="87" r="10" fill="#0A0F16" stroke="#8996A8" stroke-width="2.5" />
      <circle cx="122" cy="87" r="10" fill="#0A0F16" stroke="#8996A8" stroke-width="2.5" />
      <circle cx="140" cy="74" r="3" fill="#F5B54C" />
      <circle cx="30" cy="74" r="3" fill="#E85D5D" />
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 120" width="170" height="120">
      <!-- Dark tactical background -->
      <rect width="170" height="120" fill="#0E1624" />
      <!-- Grid lines -->
      <line x1="0" y1="30" x2="170" y2="30" stroke="#1A263A" stroke-width="0.75" stroke-dasharray="2,2" />
      <line x1="0" y1="60" x2="170" y2="60" stroke="#1A263A" stroke-width="0.75" stroke-dasharray="2,2" />
      <line x1="0" y1="90" x2="170" y2="90" stroke="#1A263A" stroke-width="0.75" stroke-dasharray="2,2" />
      <line x1="42" y1="0" x2="42" y2="120" stroke="#1A263A" stroke-width="0.75" stroke-dasharray="2,2" />
      <line x1="85" y1="0" x2="85" y2="120" stroke="#1A263A" stroke-width="0.75" stroke-dasharray="2,2" />
      <line x1="128" y1="0" x2="128" y2="120" stroke="#1A263A" stroke-width="0.75" stroke-dasharray="2,2" />

      <!-- Road asphalt floor -->
      <rect x="0" y="94" width="170" height="26" fill="#070B10" />
      <line x1="0" y1="94" x2="170" y2="94" stroke="#233046" stroke-width="1.5" />

      <!-- Vehicle Silhouette -->
      ${vehiclePath}

      <!-- AI Bounding Box & HUD Elements -->
      <rect x="14" y="20" width="142" height="85" fill="none" stroke="#3FD6A6" stroke-width="1.2" stroke-dasharray="8,4" opacity="0.9" />
      <polyline points="14,30 14,20 26,20" stroke="#3FD6A6" stroke-width="2.5" fill="none" />
      <polyline points="144,20 156,20 156,30" stroke="#3FD6A6" stroke-width="2.5" fill="none" />
      <polyline points="14,95 14,105 26,105" stroke="#3FD6A6" stroke-width="2.5" fill="none" />
      <polyline points="144,105 156,105 156,95" stroke="#3FD6A6" stroke-width="2.5" fill="none" />

      <!-- AI Top Pill Tag -->
      <rect x="16" y="8" width="88" height="14" rx="2" fill="#111826" stroke="#3FD6A6" stroke-width="0.8" />
      <text x="20" y="18" fill="#3FD6A6" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="bold">#${trackId} ${vehicleClass.slice(0, 8)}</text>
      
      <!-- Confidence Score -->
      <rect x="112" y="8" width="42" height="14" rx="2" fill="#151E2E" stroke="#5FB3E8" stroke-width="0.8" />
      <text x="116" y="18" fill="#5FB3E8" font-family="'JetBrains Mono', monospace" font-size="8">${confidence}%</text>

      <!-- Plate ID Badge -->
      <rect x="42" y="102" width="86" height="14" rx="2" fill="#0A0F16" stroke="#F5B54C" stroke-width="0.8" />
      <text x="85" y="112" fill="#E7ECF3" font-family="'JetBrains Mono', monospace" font-size="8" font-weight="bold" text-anchor="middle">${plate}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
