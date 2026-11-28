import * as THREE from 'three';
import { dayOfWeek } from '../../core/calendar';
import { formatLuf } from '../../core/economy';
import type { SaveData } from '../../core/save';
import type { Game } from '../game';
import { missionDef, nextObjective } from '../missiondata';
import { makePerson, type PersonModel } from '../models';
import { DIALOGUE, OBJECTIVE_TEXT, type Lang, type Line } from '../story';
import type { MissionController } from './types';

export const M01_ID = 'M01_ZERECK_AN_DSTAD';

// Mission 01 "Zeréck an d'Stad": Telefonzelle -> Madame Weis -> Onkels Wagen -> Jang auf der Place d'Armes
export class Mission01 implements MissionController {
  readonly id = M01_ID;
  readonly def = missionDef(M01_ID);
  readonly weis: PersonModel;
  readonly jang: PersonModel;
  completedAtHours = -1;  // Spielzeit (Stunden seit 1.1.) beim Abschluss -> Mission 02 nutzt das

  constructor(private g: Game) {
    this.weis = makePerson(31, { jacket: 0x7a2f3a });
    this.jang = makePerson(57, { jacket: 0x2f4a7a });
    g.scene.add(this.weis.root, this.jang.root);
    const P = g.city.places;
    const weisSpot = g.openSpot(P.avenue_liberte ?? P.gare);
    this.weis.root.position.copy(weisSpot);
    g.npcs.push(this.weis);
    g.addInteractable({ pos: weisSpot, radius: 2.2, label: () => (g.mode === 'walk' ? 'Mat der Madame Weis schwätzen' : null), act: () => this.talkWeis() });
    const jangSpot = g.openSpot(P.place_darmes ?? new THREE.Vector3(-58, 315, 64));
    this.jang.root.position.copy(jangSpot);
    g.npcs.push(this.jang);
    g.addInteractable({ pos: jangSpot, radius: 2.4, label: () => (g.mode === 'walk' && this.jang.root.visible ? 'Mam Jang schwätzen' : null), act: () => this.talkJang() });
  }

  private done(id: string): boolean { return this.g.missions.isObjectiveDone(this.id, id); }
  current(): string | null {
    if (this.g.missions.getState(this.id) !== 'Active') return null;
    return nextObjective(this.def, (o) => this.done(o));
  }
  complete(obj: string): void { this.g.missions.completeObjective(this.id, obj); }

  start(): void {
    this.g.missions.refresh(this.g.clock.getDate());
    this.g.missions.start(this.id);
    this.g.ui.dialogue(DIALOGUE.intro, () => {
      this.complete('arrive_station');
      this.g.ui.toast('Notizbuch: Tab · Telefonzelle steht vor dem Bahnhof');
    });
  }

  objectiveText(lang: Lang): string | null {
    const c = this.current();
    return c ? OBJECTIVE_TEXT[c]?.[lang] ?? null : null;
  }

  target(): THREE.Vector3 | null {
    switch (this.current()) {
      case 'call_friend': return this.g.booths[0] ?? null;
      case 'get_key': return this.weis.root.position;
      case 'find_car': return this.g.car.pos;
      case 'visit_friend': return this.jang.root.position;
      default: return null;
    }
  }

  mapMarks() {
    if (this.g.missions.getState(this.id) === 'Succeeded') return [];
    const all = [
      { key: 'call_friend', label: 'Telefon', at: this.g.booths[0] },
      { key: 'get_key', label: 'Mme Weis', at: this.weis.root.position },
      { key: 'find_car', label: 'Auto', at: this.g.car.pos },
      { key: 'visit_friend', label: 'Jang', at: this.jang.root.position },
    ];
    return all.filter((m) => m.at).map((m) => ({ x: m.at!.x, z: m.at!.z, label: m.label, done: this.done(m.key) }));
  }

  notes(lang: Lang): string {
    if (this.g.missions.getState(this.id) === 'Locked') return '';
    const cur = this.current();
    const items = ['call_friend', 'get_key', 'find_car', 'visit_friend'].map((o) => {
      const d = this.done(o);
      return `<div class="${d ? 'done' : o === cur ? 'cur' : ''}">${d ? '✓' : o === cur ? '→' : '·'} ${OBJECTIVE_TEXT[o][lang]}</div>`;
    }).join('');
    return `<h3>ZERÉCK AN D’STAD</h3>${items}`;
  }

  private talkWeis(): void {
    const g = this.g;
    if (this.current() !== 'get_key') {
      g.ui.dialogue([{ who: 'Madame Weis', lb: 'Moien! Kann ech Iech hëllefen?', de: 'Guten Tag! Kann ich Ihnen helfen?', fr: 'Bonjour ! Je peux vous aider ?', en: 'Hello! Can I help you?' }]);
      return;
    }
    const d = g.clock.getDate(), h = g.clock.getHourLocal();
    if (dayOfWeek(d) >= 6 || h < 8 || h >= 18) {
      g.ui.dialogue([{ who: '', lb: 'Op der Dier: „Bureau Méindeg–Samschdeg vun 8 bis 18 Auer.“', de: 'An der Tür: „Büro Montag–Samstag 8 bis 18 Uhr.“', fr: 'Sur la porte : « Bureau du lundi au samedi de 8 h à 18 h. »', en: 'On the door: “Office Monday–Saturday 8 am to 6 pm.”' }]);
      return;
    }
    g.ui.dialogue(DIALOGUE.weis, () => {
      this.complete('get_key');
      g.car.locked = false;
      g.ui.toast('Schlüssel erhalten · Stadtplan im Notizbuch zeigt die Place de Paris');
    });
  }

  private talkJang(): void {
    const g = this.g;
    if (this.current() !== 'visit_friend') {
      const finished = g.missions.getState(this.id) === 'Succeeded';
      const line: Line = finished
        ? { who: 'Jang', lb: 'Hues de mäi Message um Äntwerter scho nogelauschtert?', de: 'Hast du meine Nachricht auf dem Anrufbeantworter schon abgehört?', fr: 'Tu as écouté mon message sur le répondeur ?', en: 'Did you listen to my message on the answering machine?' }
        : { who: 'Jang', lb: 'Ech waarden hei. Hues de de Schlëssel scho bei der Madame Weis geholl?', de: 'Ich warte hier. Hast du den Schlüssel schon bei Madame Weis geholt?', fr: 'J’attends ici. Tu as récupéré la clé chez Madame Weis ?', en: 'I’m waiting here. Did you get the key from Madame Weis yet?' };
      g.ui.dialogue([line]);
      return;
    }
    g.ui.dialogue(DIALOGUE.jangMeet, () => {
      this.complete('visit_friend');
      g.wallet.receiveCash(2000, g.clock.getDate(), 'Jang – Starthilfe');
      this.completedAtHours = g.absHours();
      g.missions.refresh(g.clock.getDate());
      g.ui.toast(`Mission erfüllt: „Zeréck an d’Stad“ · +${formatLuf(2000)} · automatisch gespeichert`, 4000);
      g.onMissionSucceeded(this.id);
    });
  }

  onCarEntered(): void {
    if (this.current() === 'find_car') this.complete('find_car');
  }

  update(): void {
    // Wagen zerstoert waehrend M01 -> Checkpoint, Wagen repariert an der Place de Paris
    const g = this.g;
    if (g.car.damage >= 100 && g.missions.getState(this.id) === 'Active') {
      g.missions.fail(this.id, 'car_wrecked');
      g.missions.restartFromCheckpoint(this.id);
      g.leaveVehicle(true);
      g.resetOwnCar();
      g.ui.toast('Totalschaden. Der Wagen wurde abgeschleppt und repariert – er steht wieder an der Place de Paris.', 5000);
    }
  }

  save(): SaveData {
    return { 'm01.completed_at': String(this.completedAtHours) };
  }
  load(d: SaveData): void {
    this.completedAtHours = Number(d['m01.completed_at'] ?? -1);
  }
}
