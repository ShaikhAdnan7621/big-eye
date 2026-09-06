import { VehicleClass, TrafficFlow } from '../types';

export interface ParsedQuery {
  rawQuery: string;
  vehicleClass?: VehicleClass;
  color?: string;
  colorHex?: string;
  trafficFlow?: TrafficFlow;
  minDwellSec?: number;
  locationKeyword?: string;
  plateMatch?: string;
}

const VEHICLE_CLASS_KEYWORDS: Record<string, VehicleClass> = {
  'three-wheeler': 'Three-wheeler',
  'three wheeler': 'Three-wheeler',
  'auto': 'Three-wheeler',
  'rickshaw': 'Three-wheeler',
  'autorickshaw': 'Three-wheeler',
  'two-wheeler': 'Two-wheeler',
  'two wheeler': 'Two-wheeler',
  'bike': 'Two-wheeler',
  'motorcycle': 'Two-wheeler',
  'scooter': 'Two-wheeler',
  'hatchback': 'Hatchback',
  'swift': 'Hatchback',
  'i10': 'Hatchback',
  'sedan': 'Sedan',
  'honda city': 'Sedan',
  'verna': 'Sedan',
  'dzire': 'Sedan',
  'suv': 'SUV',
  'scorpio': 'SUV',
  'creta': 'SUV',
  'bolero': 'SUV',
  'thar': 'SUV',
  'bus': 'Bus',
  'gsrtc': 'Bus',
  'truck': 'Truck',
  'lorry': 'Truck',
  'dumper': 'Truck',
  'lcv': 'Light Commercial Vehicle (LCV)',
  'tempo': 'Light Commercial Vehicle (LCV)',
  'chhota hathi': 'Light Commercial Vehicle (LCV)',
  'tanker': 'Tanker',
  'tractor': 'Tractor',
  'e-rickshaw': 'E-Rickshaw',
  'ambulance': 'Ambulance',
  'police': 'Police PCR',
  'pcr': 'Police PCR'
};

const COLOR_KEYWORDS: Record<string, { name: string; hex: string }> = {
  'white': { name: 'White', hex: '#E7ECF3' },
  'black': { name: 'Black', hex: '#111826' },
  'silver': { name: 'Silver', hex: '#8996A8' },
  'grey': { name: 'Grey', hex: '#64748B' },
  'gray': { name: 'Grey', hex: '#64748B' },
  'red': { name: 'Red', hex: '#E85D5D' },
  'yellow': { name: 'Yellow', hex: '#F5B54C' },
  'green': { name: 'Green', hex: '#3FD6A6' },
  'blue': { name: 'Blue', hex: '#5FB3E8' },
  'maroon': { name: 'Maroon', hex: '#881337' },
  'orange': { name: 'Orange', hex: '#EA580C' }
};

const FLOW_KEYWORDS: Record<string, TrafficFlow> = {
  'inbound': 'Inbound',
  'incoming': 'Inbound',
  'entering': 'Inbound',
  'entry': 'Inbound',
  'outbound': 'Outbound',
  'outgoing': 'Outbound',
  'exiting': 'Outbound',
  'exit': 'Outbound',
  'parking': 'Auto-Stand/Parking',
  'parked': 'Auto-Stand/Parking',
  'stationary': 'Auto-Stand/Parking',
  'stand': 'Auto-Stand/Parking',
  'idle': 'Auto-Stand/Parking',
  'turning': 'Turning',
  'turns': 'Turning',
  'turn': 'Turning',
  'cross': 'Cross-Junction'
};

export function parseNaturalLanguageQuery(query: string): ParsedQuery {
  const clean = query.trim().toLowerCase();
  const result: ParsedQuery = { rawQuery: query };

  if (!clean) return result;

  // 1. Check for Dwell time patterns like "> 10s", ">10 sec", "dwell > 5s", "more than 20 seconds"
  const dwellMatch = clean.match(/(?:>|greater than|more than|over)\s*(\d+)\s*(?:s|sec|seconds)?/i) ||
                     clean.match(/(\d+)\s*(?:s|sec|seconds)\s*(?:dwell|idle|stationary)/i);
  if (dwellMatch && dwellMatch[1]) {
    result.minDwellSec = parseInt(dwellMatch[1], 10);
  }

  // 2. Check for vehicle classes
  for (const [kw, vClass] of Object.entries(VEHICLE_CLASS_KEYWORDS)) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(clean)) {
      result.vehicleClass = vClass;
      break;
    }
  }

  // 3. Check for colors
  for (const [kw, colorObj] of Object.entries(COLOR_KEYWORDS)) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(clean)) {
      result.color = colorObj.name;
      result.colorHex = colorObj.hex;
      break;
    }
  }

  // 4. Check for traffic flow
  for (const [kw, flow] of Object.entries(FLOW_KEYWORDS)) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(clean)) {
      result.trafficFlow = flow;
      break;
    }
  }

  // 5. Check for registration plates (e.g. GJ-01-XX-1234 or GJ01XX1234)
  const plateMatch = query.match(/GJ[- ]?[0-9]{1,2}[- ]?[A-Z]{1,3}[- ]?[0-9]{1,4}/i);
  if (plateMatch) {
    result.plateMatch = plateMatch[0].toUpperCase();
  }

  // 6. Check for Gujarat location names
  const locations = [
    'paldi', 'chiman', 'janpath', 'ongc', 'visat', 'junagadh', 'somnath', 'majewadi',
    'adalaj', 'rajkot', 'patan', 'dehgam', 'bilimora', 'gandhidham', 'dolatpara', 'kheram'
  ];
  for (const loc of locations) {
    if (clean.includes(loc)) {
      result.locationKeyword = loc;
      break;
    }
  }

  return result;
}
