// Aufbau von public/data/world.json (erzeugt von Scripts/lux98/bake_web.py).
// Koordinaten: x = Ost, z = Sued (Meter ab Place d'Armes), y = Hoehe ueber NN.

export interface WorldData {
  meta: {
    sources: string[];
    origin_wgs84: [number, number];
    historical_status: string;
    excluded: Record<string, number>;
    bounds: [number, number, number, number];
  };
  terrain: { x0: number; z0: number; step: number; cols: number; rows: number; dm: number[] };
  buildings: { p: number[]; b: number; h: number; k: number }[];
  roads: { p: number[]; w: number; t: number; c: 0 | 1; n?: string; y?: number[] }[];
  rails: { p: number[]; br: 0 | 1 }[];
  walls: { p: number[]; h: number; k: 0 | 1 }[];
  green: { p: number[]; t: number }[];
  water: { p: number[]; a: 0 | 1 }[];
  places: Record<string, [number, number, number]>;
}

// Reihenfolge wie ROAD_WIDTH in bake_web.py
export const ROAD_TYPES = [
  'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street', 'service', 'pedestrian',
  'footway', 'path', 'steps', 'cycleway', 'track', 'primary_link', 'secondary_link',
] as const;

export function pairs(flat: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
  return out;
}
