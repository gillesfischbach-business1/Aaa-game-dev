import type * as THREE from 'three';
import type { SaveData } from '../../core/save';
import type { Lang } from '../story';

// Ein Missionsmodul: legt Figuren/Orte an, liefert Zieltext und Kartenmarkierungen, reagiert pro Bild.
export interface MissionController {
  readonly id: string;
  /** Text fuer den Notizzettel, oder null, wenn die Mission gerade nicht laeuft */
  objectiveText(lang: Lang): string | null;
  /** Ziel fuer die optionale Navigationshilfe */
  target(): THREE.Vector3 | null;
  mapMarks(): { x: number; z: number; label: string; done?: boolean }[];
  /** Zeilen fuer das Notizbuch (Seite "Notizen") */
  notes(lang: Lang): string;
  update(dt: number): void;
  save(): SaveData;
  load(d: SaveData): void;
}
