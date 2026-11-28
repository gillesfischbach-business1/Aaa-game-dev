// LUX98 – Datengetriebenes Missionssystem (Port von MissionSystem).
// Ziele mit gleicher "alternativeGroup" sind alternative Loesungswege: eines genuegt.
// Optionale Ziele sind fuer den Erfolg nicht noetig.
import { copyDate, isBefore, type LuxDate } from './calendar';
import { compareBytes, getlineSplit } from './text';

export interface ObjectiveDef {
  id: string;
  alternativeGroup?: string; // leer/fehlt = Pflichtziel fuer sich allein
  optional?: boolean;
  isCheckpoint?: boolean; // nach Abschluss wird ein Checkpoint gesetzt
}

export interface MissionDef {
  id: string; // z. B. "M01_ZERECK_AN_DSTAD"
  prerequisites?: string[]; // Missionen, die vorher erfolgreich sein muessen
  availableFrom?: LuxDate;
  availableUntil?: LuxDate;
  objectives: ObjectiveDef[];
  failConditions?: string[]; // erlaubte Fehlschlag-Gruende
}

export type MissionState = 'Locked' | 'Available' | 'Active' | 'Succeeded' | 'Failed';
export const MISSION_STATES: readonly MissionState[] = ['Locked', 'Available', 'Active', 'Succeeded', 'Failed'];

export interface RegisterResult {
  ok: boolean;
  error?: string;
}

interface NormalizedObjective {
  id: string;
  alternativeGroup: string;
  optional: boolean;
  isCheckpoint: boolean;
}

interface NormalizedMission {
  id: string;
  prerequisites: string[];
  availableFrom?: LuxDate;
  availableUntil?: LuxDate;
  objectives: NormalizedObjective[];
  failConditions: string[];
}

interface Instance {
  def: NormalizedMission;
  state: MissionState;
  done: string[];
  checkpointDone: string[];
  failReason: string;
}

function joinList(v: readonly string[]): string {
  return v.join(',');
}

function splitList(s: string): string[] {
  return getlineSplit(s, ',').filter((p) => p.length > 0);
}

export class MissionTracker {
  private missions = new Map<string, Instance>();

  // Sortiert wie std::map in C++.
  private sortedIds(): string[] {
    return [...this.missions.keys()].sort(compareBytes);
  }

  // Liefert ok=false, wenn die Definition fehlerhaft ist (doppelte IDs, leere Ziele ...).
  register(def: MissionDef): RegisterResult {
    const fail = (msg: string): RegisterResult => ({ ok: false, error: `${def.id}: ${msg}` });
    if (def.id.length === 0) return fail('leere Missions-ID');
    if (this.missions.has(def.id)) return fail('Missions-ID doppelt');
    if (def.objectives.length === 0) return fail('keine Ziele');
    const ids = new Set<string>();
    let hasRequired = false;
    for (const o of def.objectives) {
      if (o.id.length === 0 || ids.has(o.id)) return fail('Ziel-ID leer oder doppelt: ' + o.id);
      ids.add(o.id);
      if (!o.optional) hasRequired = true;
    }
    if (!hasRequired) return fail('nur optionale Ziele – Mission waere nie abschliessbar');
    if (def.availableFrom && def.availableUntil && isBefore(def.availableUntil, def.availableFrom))
      return fail('Zeitfenster endet vor Beginn');
    const norm: NormalizedMission = {
      id: def.id,
      prerequisites: [...(def.prerequisites ?? [])],
      objectives: def.objectives.map((o) => ({
        id: o.id,
        alternativeGroup: o.alternativeGroup ?? '',
        optional: o.optional ?? false,
        isCheckpoint: o.isCheckpoint ?? false,
      })),
      failConditions: [...(def.failConditions ?? [])],
    };
    if (def.availableFrom) norm.availableFrom = copyDate(def.availableFrom);
    if (def.availableUntil) norm.availableUntil = copyDate(def.availableUntil);
    this.missions.set(def.id, { def: norm, state: 'Locked', done: [], checkpointDone: [], failReason: '' });
    return { ok: true };
  }

  // Prueft Voraussetzungen und Datumsfenster und schaltet Missionen frei bzw. sperrt sie.
  refresh(today: LuxDate): void {
    for (const id of this.sortedIds()) {
      const inst = this.missions.get(id);
      if (!inst || (inst.state !== 'Locked' && inst.state !== 'Available')) continue;
      let ok = true;
      for (const req of inst.def.prerequisites) {
        const other = this.missions.get(req);
        if (!other || other.state !== 'Succeeded') ok = false;
      }
      if (inst.def.availableFrom && isBefore(today, inst.def.availableFrom)) ok = false;
      if (inst.def.availableUntil && isBefore(inst.def.availableUntil, today)) ok = false;
      inst.state = ok ? 'Available' : 'Locked';
    }
  }

  start(missionId: string): boolean {
    const inst = this.missions.get(missionId);
    if (!inst || inst.state !== 'Available') return false;
    inst.state = 'Active';
    inst.done = [];
    inst.checkpointDone = [];
    inst.failReason = '';
    return true;
  }

  private checkSuccess(inst: Instance): boolean {
    const satisfied = new Set<string>();
    const needed = new Set<string>();
    for (const o of inst.def.objectives) {
      if (o.optional) continue;
      const key = o.alternativeGroup.length === 0 ? '#' + o.id : o.alternativeGroup;
      needed.add(key);
      if (inst.done.includes(o.id)) satisfied.add(key);
    }
    if (satisfied.size === needed.size) {
      inst.state = 'Succeeded';
      return true;
    }
    return false;
  }

  completeObjective(missionId: string, objectiveId: string): boolean {
    const inst = this.missions.get(missionId);
    if (!inst || inst.state !== 'Active') return false;
    const obj = inst.def.objectives.find((o) => o.id === objectiveId);
    if (!obj || inst.done.includes(objectiveId)) return false;
    inst.done.push(objectiveId);
    if (obj.isCheckpoint) inst.checkpointDone = [...inst.done];
    this.checkSuccess(inst);
    return true;
  }

  // Nur definierte Gruende sind erlaubt.
  fail(missionId: string, reason: string): boolean {
    const inst = this.missions.get(missionId);
    if (!inst || inst.state !== 'Active') return false;
    if (!inst.def.failConditions.includes(reason)) return false;
    inst.state = 'Failed';
    inst.failReason = reason;
    return true;
  }

  restartFromCheckpoint(missionId: string): boolean {
    const inst = this.missions.get(missionId);
    if (!inst || inst.state !== 'Failed') return false;
    inst.state = 'Active';
    inst.done = [...inst.checkpointDone];
    inst.failReason = '';
    return true;
  }

  getState(missionId: string): MissionState {
    return this.missions.get(missionId)?.state ?? 'Locked';
  }

  isObjectiveDone(missionId: string, objectiveId: string): boolean {
    return this.missions.get(missionId)?.done.includes(objectiveId) ?? false;
  }

  getFailReason(missionId: string): string {
    return this.missions.get(missionId)?.failReason ?? '';
  }

  missionIds(): string[] {
    return this.sortedIds();
  }

  // Zustand fuer Spielstaende: "mission.<id>" -> "state;obj1,obj2;checkpoint1,checkpoint2;failReason"
  serialize(): Record<string, string> {
    const out: Record<string, string> = Object.create(null) as Record<string, string>;
    for (const id of this.sortedIds()) {
      const inst = this.missions.get(id);
      if (!inst) continue;
      out['mission.' + id] = `${inst.state};${joinList(inst.done)};${joinList(inst.checkpointDone)};${inst.failReason}`;
    }
    return out;
  }

  // false bei unbekanntem Zustand; dann bleibt alles unveraendert (wie C++: Kopie lesen, nur bei Erfolg uebernehmen).
  // Missionen ohne Eintrag im Spielstand starten frisch (gesperrt).
  deserialize(data: Readonly<Record<string, string>>): boolean {
    const next = new Map<string, Instance>();
    for (const [id, inst] of this.missions) next.set(id, { def: inst.def, state: 'Locked', done: [], checkpointDone: [], failReason: '' });
    for (const key of Object.keys(data).sort(compareBytes)) {
      if (!key.startsWith('mission.')) continue;
      const inst = next.get(key.substring(8));
      if (!inst) continue; // Mission existiert in dieser Version nicht mehr
      const parts = getlineSplit(data[key] ?? '', ';');
      while (parts.length < 4) parts.push('');
      if (parts.length > 4) parts[3] = parts.slice(3).join(';');  // Grund darf ';' enthalten
      const state = MISSION_STATES.find((s) => s === parts[0]);
      if (state === undefined) return false;
      inst.state = state;
      inst.done = splitList(parts[1] ?? '');
      inst.checkpointDone = splitList(parts[2] ?? '');
      inst.failReason = parts[3] ?? '';
    }
    this.missions = next;
    return true;
  }
}
