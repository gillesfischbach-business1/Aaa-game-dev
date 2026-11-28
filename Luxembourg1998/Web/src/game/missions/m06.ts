import * as THREE from 'three';
import type { SaveData } from '../../core/save';
import type { Game } from '../game';
import { missionDef, nextObjective } from '../missiondata';
import { makePerson, makeSign, type PersonModel } from '../models';
import { DIALOGUE06, NUMBERS, OBJECTIVE_TEXT, ROUND_PRICE, type Lang } from '../story';
import type { MissionController } from './types';

export const M06_ID = 'M06_ENG_NUECHT_AM_GRONN';
const MSG_INVITE = 'DLG_JANG_GRONN';
const MSG_REVENGE = 'DLG_STEVE_REVENGE';

// Mission 06 "Eng Nuecht am Gronn": Einladung per Anrufbeantworter, abends (21-3 Uhr) auf einer Terrasse im Grund,
// eine Entscheidung mit drei Ausgaengen (Freundschaft, Streit, Jobangebot) und Folgen. Alles fiktiv.
export class Mission06 implements MissionController {
  readonly id = M06_ID;
  readonly def = missionDef(M06_ID);
  readonly terrace: THREE.Vector3;
  readonly jang: PersonModel;
  readonly mia: PersonModel;
  readonly steve: PersonModel;
  private lights: THREE.Group;
  messageLeft = false;
  outcome = '';
  revengeAt = -1;
  revengeDone = false;

  constructor(private g: Game) {
    // Grund: tiefster Fussweg in der Naehe der Alzette, suedoestlich der Place d'Armes (ca. 400 m Ost, 230 m Sued)
    const target = new THREE.Vector3(397, 0, 233);
    let best: THREE.Vector3 | null = null;
    for (const w of g.city.walkways) for (const p of w.pts) {
      if (Math.hypot(p.x - target.x, p.z - target.z) > 160) continue;
      if (!best || p.y < best.y) best = p;
    }
    this.terrace = g.openSpot(best ?? target, false, 8);
    const t = this.terrace;

    // Terrasse: Tische, Stuehle, Lichterkette, warmes Licht, Schild
    this.lights = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.8 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.6 });
    for (const [dx, dz] of [[2.5, 1.5], [5, -0.5], [2.8, -2.5]]) {
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 16), wood);
      table.position.set(t.x + dx, g.city.surfaceAt(t.x + dx, t.z + dz, t.y + 1) + 0.74, t.z + dz);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.2, 0.72, 8), metal);
      foot.position.set(table.position.x, table.position.y - 0.37, table.position.z);
      g.scene.add(table, foot);
    }
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd080, emissiveIntensity: 2 });
    for (let i = 0; i < 14; i++) {
      const a = i / 13;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), bulbMat);
      bulb.position.set(t.x + a * 7 - 0.5, t.y + 2.8 - Math.sin(a * Math.PI) * 0.4, t.z - 2 + a * 3);
      this.lights.add(bulb);
    }
    const warm = new THREE.PointLight(0xffc080, 0, 16, 1.6);
    warm.position.set(t.x + 3, t.y + 2.6, t.z);
    this.lights.add(warm);
    g.scene.add(this.lights);
    const sign = makeSign(['AM PËTZ', 'Bistro · Terrass (fiktiv)'], '#4a2a1a', '#f6e2b8', 2.6);
    sign.scale.setScalar(0.75);
    sign.position.copy(t).add(new THREE.Vector3(-1.4, 0, 0));
    g.scene.add(sign);

    this.jang = makePerson(57, { jacket: 0x2f4a7a });
    this.mia = makePerson(201, { jacket: 0x2a6a6a });
    this.steve = makePerson(222, { jacket: 0x8a6a2a });
    const place = (p: PersonModel, dx: number, dz: number) => {
      p.root.position.set(t.x + dx, g.city.surfaceAt(t.x + dx, t.z + dz, t.y + 1), t.z + dz);
      g.scene.add(p.root);
      g.npcs.push(p);
    };
    place(this.jang, 1.8, 0.6);
    place(this.mia, 3.2, 1.9);
    place(this.steve, 3.4, 0.2);
    g.addInteractable({ pos: this.jang.root.position, radius: 2.6, label: () => (g.mode === 'walk' && this.jang.root.visible ? 'Mam Jang schwätzen' : null), act: () => this.talk() });
    g.registerMessage(MSG_INVITE, DIALOGUE06.invite);
    g.registerMessage(MSG_REVENGE, DIALOGUE06.steveRevenge);
  }

  private done(id: string): boolean { return this.g.missions.isObjectiveDone(this.id, id); }
  current(): string | null {
    if (this.g.missions.getState(this.id) !== 'Active') return null;
    return nextObjective(this.def, (o) => this.done(o));
  }
  private complete(o: string): void { this.g.missions.completeObjective(this.id, o); }

  /** Abendfenster 21-3 Uhr (Wanduhrzeit) */
  private evening(): boolean { const h = this.g.clock.getHourLocal(); return h >= 21 || h < 3; }

  private talk(): void {
    const g = this.g, c = this.current();
    if (c === 'listen_invite' || c === 'arrive_grund') {
      if (!this.evening()) { g.ui.dialogue(DIALOGUE06.early); return; }
      if (c === 'listen_invite') this.complete('listen_invite');
      this.complete('arrive_grund');
      g.ui.dialogue(DIALOGUE06.intro, () => this.decide());
      return;
    }
    if (c === 'group:outcome') { this.decide(); return; }
    g.ui.dialogue(DIALOGUE06.after);
  }

  private decide(): void {
    const g = this.g;
    const opts = [
      ...(g.wallet.getCash() >= ROUND_PRICE ? [{ value: 'friendship', label: { de: `Ruhig bleiben und eine Runde ausgeben (${ROUND_PRICE} F)`, fr: `Rester calme et payer une tournée (${ROUND_PRICE} F)`, en: `Stay calm and buy a round (${ROUND_PRICE} F)` } }] : []),
      { value: 'conflict', label: { de: 'Steve die Meinung sagen', fr: 'Dire ses quatre vérités à Steve', en: 'Give Steve a piece of your mind' } },
      { value: 'job', label: { de: 'Mias Kamera aufheben und prüfen', fr: 'Ramasser et vérifier l’appareil de Mia', en: 'Pick up and check Mia’s camera' } },
    ];
    g.ui.choice(DIALOGUE06.choice, opts, (v) => {
      const lines = v === 'friendship' ? DIALOGUE06.friendship : v === 'conflict' ? DIALOGUE06.conflict : DIALOGUE06.job;
      g.ui.dialogue(lines, () => this.finish(v));
    });
  }

  private finish(v: string): void {
    const g = this.g;
    this.outcome = v;
    if (v === 'friendship') {
      g.wallet.payCash(ROUND_PRICE, g.clock.getDate(), 'Runde im „Am Pëtz“');
      g.reputation += 2;
      g.flags['rel.jang'] = 'close';
      g.flags['rel.mia'] = 'friendly';
      g.flags['rel.steve'] = 'okay';
    } else if (v === 'conflict') {
      g.reputation -= 1;
      g.flags['rel.steve'] = 'enemy';
      g.flags['rel.jang'] = 'strained';
      // Steve raecht sich in der Nacht: Kratzer am eigenen Wagen, Jang warnt per Anrufbeantworter
      this.revengeAt = g.absHours() + 6;
    } else {
      g.reputation += 1;
      g.flags['rel.mia'] = 'work';
      g.flags['career.photographer'] = 'offer';
    }
    g.flags['m06.outcome'] = v;
    this.complete(v === 'friendship' ? 'outcome_friendship' : v === 'conflict' ? 'outcome_conflict' : 'outcome_job');
    const msg = { friendship: 'Freundschaft gefestigt', conflict: 'Streit mit Steve – das hat Folgen', job: 'Mia bietet dir Fotoaufträge an' }[v] ?? '';
    g.ui.toast(`Mission erfüllt: „Eng Nuecht am Gronn“ · ${msg}`, 5000);
    g.onMissionSucceeded(this.id);
  }

  objectiveText(lang: Lang): string | null {
    const c = this.current();
    if (!c) return this.g.missions.getState(this.id) === 'Succeeded' ? OBJECTIVE_TEXT.done06[lang] : null;
    return OBJECTIVE_TEXT[c]?.[lang] ?? null;
  }

  target(): THREE.Vector3 | null {
    const c = this.current();
    if (c === 'listen_invite') return this.g.homeDoor;
    if (c) return this.terrace;
    return null;
  }

  mapMarks() {
    if (this.g.missions.getState(this.id) !== 'Active') return [];
    return [{ x: this.terrace.x, z: this.terrace.z, label: 'Am Pëtz', done: false }];
  }

  notes(lang: Lang): string {
    if (this.g.missions.getState(this.id) === 'Locked') return '';
    const cur = this.current();
    const rows: [string, boolean][] = [['listen_invite', this.done('listen_invite')], ['arrive_grund', this.done('arrive_grund')], ['group:outcome', !!this.outcome]];
    const items = rows.map(([k, d]) => `<div class="${d ? 'done' : k === cur ? 'cur' : ''}">${d ? '✓' : k === cur ? '→' : '·'} ${OBJECTIVE_TEXT[k][lang]}</div>`).join('');
    return `<h3>ENG NUECHT AM GRONN</h3>${items}`;
  }

  update(): void {
    const g = this.g;
    if (g.missions.getState(this.id) === 'Active' && !this.messageLeft && this.current() === 'listen_invite') {
      const prev = Number(g.flags['m05.done_at'] ?? NaN);
      if (!Number.isFinite(prev) || g.absHours() >= prev + 1) {
        g.phoneNet.leaveMessage(NUMBERS.home, { date: g.clock.getDate(), hour: g.clock.getHour(), minute: g.clock.getMinute(), fromNumber: NUMBERS.jang, text: 'Jang: Gronn', dialogueId: MSG_INVITE });
        this.messageLeft = true;
      }
    }
    // Leute sind nur abends auf der Terrasse (ab 20:30), solange die Mission laeuft
    const h = g.clock.getHourLocal();
    const present = g.missions.getState(this.id) === 'Active' && (h >= 20.5 || h < 3);
    for (const p of [this.jang, this.mia, this.steve]) p.root.visible = present;
    const night = g.env.night;
    this.lights.visible = h >= 19 || h < 4;
    (this.lights.children.find((o) => o instanceof THREE.PointLight) as THREE.PointLight).intensity = this.lights.visible ? 6 * Math.max(0.3, night) : 0;
    if (this.revengeAt >= 0 && !this.revengeDone && g.absHours() >= this.revengeAt) {
      this.revengeDone = true;
      g.car.damage = Math.min(99, g.car.damage + 12);
      g.phoneNet.leaveMessage(NUMBERS.home, { date: g.clock.getDate(), hour: g.clock.getHour(), minute: g.clock.getMinute(), fromNumber: NUMBERS.jang, text: 'Jang: Steve', dialogueId: MSG_REVENGE });
    }
  }

  onMessageHeard(id: string): void {
    if (id === MSG_INVITE && this.current() === 'listen_invite') this.complete('listen_invite');
  }

  save(): SaveData {
    return { 'm06.msg': this.messageLeft ? '1' : '0', 'm06.outcome': this.outcome, 'm06.revenge': `${this.revengeAt},${this.revengeDone ? 1 : 0}` };
  }

  load(d: SaveData): void {
    this.messageLeft = d['m06.msg'] === '1';
    this.outcome = d['m06.outcome'] ?? '';
    const [a, b] = (d['m06.revenge'] ?? '-1,0').split(',').map(Number);
    this.revengeAt = Number.isFinite(a) ? a : -1;
    this.revengeDone = b === 1;
    if (this.messageLeft && this.current() === 'listen_invite') this.messageLeft = false;
  }
}
