// Missionsdefinitionen kommen aus der gemeinsamen Datei des Gesamtprojekts (auch vom Unreal-Projekt genutzt
// und vom Anachronismus-Pruefer validiert): Luxembourg1998/Data/Missions/missions_main.json
import raw from '../../../Data/Missions/missions_main.json';
import { fromIso } from '../core/calendar';
import type { MissionDef } from '../core/missions';

interface RawObjective { id: string; group?: string; optional?: boolean; checkpoint?: boolean }
interface RawMission {
  mission_id: string; prerequisites?: string[]; objectives: RawObjective[]; fail_conditions?: string[];
  available_from?: string | null; available_until?: string | null;
}

export function missionDef(id: string): MissionDef {
  const m = (raw as unknown as { missions: RawMission[] }).missions.find((x) => x.mission_id === id);
  if (!m) throw new Error(`Mission ${id} fehlt in missions_main.json`);
  const from = m.available_from ? fromIso(m.available_from) : null;
  const until = m.available_until ? fromIso(m.available_until) : null;
  return {
    id: m.mission_id,
    prerequisites: m.prerequisites ?? [],
    objectives: m.objectives.map((o) => ({ id: o.id, alternativeGroup: o.group, optional: o.optional, isCheckpoint: o.checkpoint })),
    failConditions: m.fail_conditions ?? [],
    ...(from ? { availableFrom: from } : {}),
    ...(until ? { availableUntil: until } : {}),
  };
}

// Reihenfolge der Ziele fuer die Anzeige; Alternativen derselben Gruppe zaehlen als ein Schritt.
export function nextObjective(def: MissionDef, isDone: (id: string) => boolean): string | null {
  const satisfied = new Set<string>();
  for (const o of def.objectives) if (o.alternativeGroup && isDone(o.id)) satisfied.add(o.alternativeGroup);
  for (const o of def.objectives) {
    if (o.optional || isDone(o.id)) continue;
    if (o.alternativeGroup && satisfied.has(o.alternativeGroup)) continue;
    return o.alternativeGroup ? `group:${o.alternativeGroup}` : o.id;
  }
  return null;
}
