// Generator for crisp, realistic vehicle visual snapshots and thumbnails

export function getVehicleThumbnail(
  vehicleClass: string,
  colorName: string = 'White',
  plateNumber: string = 'GJ-01-AB-1234',
  trackId?: number
): string {
  const normClass = (vehicleClass || 'Sedan').toLowerCase();
  const normColor = (colorName || 'White').toLowerCase();

  // Determine body color fill
  let bodyColor = '#E2E8F0';
  let accentColor = '#CBD5E1';
  let roofColor = '#1E293B';

  if (normColor.includes('black')) {
    bodyColor = '#1E293B';
    accentColor = '#0F172A';
  } else if (normColor.includes('yellow') || normColor.includes('green') || normClass.includes('three')) {
    bodyColor = '#EAB308'; // Auto yellow
    accentColor = '#16A34A'; // Auto green bottom
    roofColor = '#FACC15';
  } else if (normColor.includes('blue') || normColor.includes('cyan')) {
    bodyColor = '#2563EB';
    accentColor = '#1D4ED8';
  } else if (normColor.includes('red') || normColor.includes('crimson')) {
    bodyColor = '#DC2626';
    accentColor = '#991B1B';
  } else if (normColor.includes('silver') || normColor.includes('grey') || normColor.includes('gray')) {
    bodyColor = '#94A3B8';
    accentColor = '#64748B';
  }

  // SVG dimensions
  const w = 320;
  const h = 200;

  let vehicleSvg = '';

  if (normClass.includes('three') || normClass.includes('rickshaw') || normClass.includes('auto')) {
    // Auto Rickshaw
    vehicleSvg = `
      <!-- Three-Wheeler Auto-Rickshaw -->
      <path d="M 60 145 L 80 85 L 140 70 L 220 70 L 245 110 L 250 145 Z" fill="#EAB308" />
      <path d="M 70 115 L 245 115 L 245 145 L 70 145 Z" fill="#15803D" />
      <!-- Roof Canopy -->
      <path d="M 75 80 Q 150 65 225 70 Q 235 72 225 80 Q 150 75 75 80 Z" fill="#FACC15" />
      <!-- Windshield -->
      <polygon points="88,88 135,78 135,112 82,112" fill="#38BDF8" opacity="0.6" />
      <!-- Side Opening -->
      <rect x="145" y="80" width="75" height="45" rx="4" fill="#0A0F16" opacity="0.85" />
      <!-- Headlight -->
      <circle cx="68" cy="120" r="7" fill="#FEF08A" filter="drop-shadow(0 0 6px #FACC15)" />
      <!-- Wheels -->
      <circle cx="95" cy="148" r="18" fill="#18181B" />
      <circle cx="95" cy="148" r="8" fill="#71717A" />
      <circle cx="215" cy="148" r="18" fill="#18181B" />
      <circle cx="215" cy="148" r="8" fill="#71717A" />
    `;
  } else if (normClass.includes('two') || normClass.includes('bike') || normClass.includes('scooter')) {
    // Two-Wheeler Motorbike
    vehicleSvg = `
      <!-- Motorbike Frame -->
      <path d="M 90 145 L 125 105 L 175 105 L 210 145" stroke="${bodyColor}" stroke-width="8" stroke-linecap="round" fill="none" />
      <path d="M 125 105 L 155 85 L 180 85 L 185 105 Z" fill="${bodyColor}" />
      <path d="M 170 85 L 195 75" stroke="#94A3B8" stroke-width="4" stroke-linecap="round" />
      <!-- Headlight -->
      <circle cx="198" cy="77" r="6" fill="#FEF08A" />
      <!-- Wheels -->
      <circle cx="90" cy="145" r="24" fill="#09090B" stroke="#71717A" stroke-width="5" />
      <circle cx="90" cy="145" r="9" fill="#D4D4D8" />
      <circle cx="225" cy="145" r="24" fill="#09090B" stroke="#71717A" stroke-width="5" />
      <circle cx="225" cy="145" r="9" fill="#D4D4D8" />
    `;
  } else if (normClass.includes('bus')) {
    // Passenger Bus
    vehicleSvg = `
      <!-- Bus Body -->
      <rect x="40" y="65" width="240" height="80" rx="8" fill="${bodyColor}" />
      <rect x="40" y="110" width="240" height="35" rx="0" fill="${accentColor}" />
      <!-- Windows Row -->
      <rect x="48" y="73" width="26" height="28" rx="3" fill="#38BDF8" opacity="0.65" />
      <rect x="80" y="73" width="30" height="28" rx="3" fill="#38BDF8" opacity="0.65" />
      <rect x="116" y="73" width="30" height="28" rx="3" fill="#38BDF8" opacity="0.65" />
      <rect x="152" y="73" width="30" height="28" rx="3" fill="#38BDF8" opacity="0.65" />
      <rect x="188" y="73" width="30" height="28" rx="3" fill="#38BDF8" opacity="0.65" />
      <rect x="224" y="73" width="30" height="28" rx="3" fill="#38BDF8" opacity="0.65" />
      <!-- Wheels -->
      <circle cx="90" cy="148" r="19" fill="#18181B" />
      <circle cx="90" cy="148" r="8" fill="#A1A1AA" />
      <circle cx="225" cy="148" r="19" fill="#18181B" />
      <circle cx="225" cy="148" r="8" fill="#A1A1AA" />
    `;
  } else if (normClass.includes('truck') || normClass.includes('tanker')) {
    // Freight Truck / Tanker
    vehicleSvg = `
      <!-- Cargo Body -->
      <rect x="45" y="60" width="160" height="85" rx="4" fill="${normClass.includes('tanker') ? '#CBD5E1' : bodyColor}" />
      <!-- Cabin -->
      <path d="M 205 80 L 235 80 L 260 110 L 260 145 L 205 145 Z" fill="${accentColor}" />
      <polygon points="215,86 235,86 250,110 215,110" fill="#38BDF8" opacity="0.65" />
      <!-- Wheels -->
      <circle cx="80" cy="148" r="18" fill="#18181B" /><circle cx="80" cy="148" r="7" fill="#A1A1AA" />
      <circle cx="120" cy="148" r="18" fill="#18181B" /><circle cx="120" cy="148" r="7" fill="#A1A1AA" />
      <circle cx="235" cy="148" r="18" fill="#18181B" /><circle cx="235" cy="148" r="7" fill="#A1A1AA" />
    `;
  } else if (normClass.includes('suv')) {
    // SUV
    vehicleSvg = `
      <!-- SUV Body Profile -->
      <path d="M 50 120 L 70 85 L 140 75 L 210 75 L 245 95 L 270 120 L 270 142 L 50 142 Z" fill="${bodyColor}" />
      <!-- Roof Rails -->
      <line x1="130" y1="71" x2="210" y2="71" stroke="#94A3B8" stroke-width="3" stroke-linecap="round" />
      <!-- Windows -->
      <polygon points="105,82 145,80 145,105 95,105" fill="#38BDF8" opacity="0.65" />
      <polygon points="152,80 195,80 195,105 152,105" fill="#38BDF8" opacity="0.65" />
      <polygon points="202,80 230,95 230,105 202,105" fill="#38BDF8" opacity="0.65" />
      <!-- Wheels -->
      <circle cx="95" cy="144" r="20" fill="#18181B" /><circle cx="95" cy="144" r="9" fill="#71717A" />
      <circle cx="225" cy="144" r="20" fill="#18181B" /><circle cx="225" cy="144" r="9" fill="#71717A" />
    `;
  } else {
    // Standard Sedan / Hatchback
    vehicleSvg = `
      <!-- Sedan Body Profile -->
      <path d="M 45 125 L 75 110 L 110 82 L 195 82 L 235 110 L 275 115 L 275 142 L 45 142 Z" fill="${bodyColor}" />
      <!-- Windows -->
      <polygon points="112,87 148,87 148,108 95,108" fill="#38BDF8" opacity="0.65" />
      <polygon points="155,87 190,87 220,108 155,108" fill="#38BDF8" opacity="0.65" />
      <!-- Wheels -->
      <circle cx="92" cy="144" r="18" fill="#18181B" /><circle cx="92" cy="144" r="8" fill="#A1A1AA" />
      <circle cx="230" cy="144" r="18" fill="#18181B" /><circle cx="230" cy="144" r="8" fill="#A1A1AA" />
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0B111B" />
          <stop offset="60%" stop-color="#151E2E" />
          <stop offset="100%" stop-color="#1E2A3A" />
        </linearGradient>
        <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1E293B" />
          <stop offset="100%" stop-color="#0F172A" />
        </linearGradient>
      </defs>

      <!-- Background Environment -->
      <rect width="${w}" height="${h}" fill="url(#skyGrad)" />
      <!-- Road Surface -->
      <polygon points="0,135 ${w},135 ${w},${h} 0,${h}" fill="url(#roadGrad)" />
      <!-- Lane Markings -->
      <line x1="20" y1="175" x2="80" y2="175" stroke="#FEF08A" stroke-width="3" stroke-dasharray="14,10" opacity="0.4" />
      <line x1="120" y1="175" x2="200" y2="175" stroke="#FEF08A" stroke-width="3" stroke-dasharray="14,10" opacity="0.4" />
      <line x1="240" y1="175" x2="300" y2="175" stroke="#FEF08A" stroke-width="3" stroke-dasharray="14,10" opacity="0.4" />

      <!-- Shadow Under Car -->
      <ellipse cx="160" cy="152" rx="115" ry="12" fill="#000000" opacity="0.55" />

      <!-- Vehicle Silhouette -->
      ${vehicleSvg}

      <!-- Clean License Plate Pill at Bottom Right -->
      <g transform="translate(180, 158)">
        <rect x="0" y="0" width="125" height="26" rx="4" fill="#F8FAFC" stroke="#0F172A" stroke-width="1.5" />
        <rect x="0" y="0" width="18" height="26" rx="3" fill="#2563EB" />
        <text x="9" y="16" font-family="monospace" font-size="8" font-weight="bold" fill="#FFFFFF" text-anchor="middle">IND</text>
        <text x="68" y="17" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="bold" fill="#0F172A" text-anchor="middle" letter-spacing="0.5">${plateNumber}</text>
      </g>

      <!-- Vehicle Class Badge Top Left -->
      <g transform="translate(12, 12)">
        <rect x="0" y="0" width="90" height="20" rx="4" fill="#0F172A" opacity="0.85" stroke="#334155" stroke-width="1" />
        <text x="45" y="14" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#38BDF8" text-anchor="middle">${vehicleClass}</text>
      </g>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
