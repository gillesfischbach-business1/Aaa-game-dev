import * as THREE from 'three';
import { formatLuf } from '../../core/economy';
import type { SaveData } from '../../core/save';
import type { Game } from '../game';
import { missionDef, nextObjective } from '../missiondata';
import { makePerson, makeSign, type PersonModel } from '../models';
import { NUMBERS, type Lang } from '../story';
import { FINAL_OPTIONS, MONTAGE, OBJ08, TALK } from '../story08';
import type { MissionController } from './types';

export const M08_ID = 'M08_MILLENNIUM';
const MSG_MISSED = 'DLG_JANG_MISSED_NYE';
type Who = 'jang' | 'tom' | 'mia' | 'muller';

// Mission 08 "Millennium": Zeitsprung bis Dezember, Gespraeche ueber Euro und Jahr 2000, Silvester auf der
// Place d'Armes, Entscheidung mit Optionen je nach bisherigem Spiel, Feuerwerk, Epilog. Alles fiktiv.
export class Mission08 implements MissionController {
  readonly id = M08_ID;
  readonly def = missionDef(M08_ID);
  readonly jang: PersonModel;
  readonly market = new THREE.Group();
  readonly marketSpot: THREE.Vector3;
  talked: Who[] = [];
  final = '';
  missedSent = false;
  private fireworks: { pts: THREE.Points; vel: Float32Array; age: number }[] = [];
  private fireworksUntil = 0;

  constructor(private g: Game) {
    const P = g.city.places;
    const pa = P.place_darmes ?? new THREE.Vector3(-58, 315, 64);
    this.marketSpot = g.openSpot(pa.clone().add(new THREE.Vector3(12, 0, 8)), false, 6);
    // Weihnachtsstaende (Annaeherung, Kategorie C – nicht belegt)
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.8 });
    const roof = new THREE.MeshStandardMaterial({ color: 0x8a2a24, roughness: 0.7 });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffc060, emissiveIntensity: 2.5 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 1.2 - 0.6;
      const x = pa.x + Math.cos(a) * 16, z = pa.z + Math.sin(a) * 16;
      const y = g.city.surfaceAt(x, z, pa.y + 1);
      const stall = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 1.8), wood);
      body.position.y = 1.1;
      const top = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1, 4), roof);
      top.position.y = 2.7;
      top.rotation.y = Math.PI / 4;
      stall.add(body, top);
      for (let k = 0; k < 6; k++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), lightMat);
        b.position.set(-1.25 + k * 0.5, 2.15, 0.92);
        stall.add(b);
      }
      stall.position.set(x, y, z);
      stall.rotation.y = -a + Math.PI / 2;
      stall.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
      this.market.add(stall);
    }
    const sign = makeSign(['CHRËSCHTMAART', 'Glühwäin · Gebeess · Kugelen'], '#6a1a18', '#f4e2b0', 3);
    sign.scale.setScalar(0.7);
    sign.position.copy(this.marketSpot).add(new THREE.Vector3(1.6, 0, 0));
    this.market.add(sign);
    this.market.visible = false;
    g.scene.add(this.market);

    this.jang = makePerson(57, { jacket: 0x2f3a5a });
    this.jang.root.position.copy(this.marketSpot);
    this.jang.root.visible = false;
    g.scene.add(this.jang.root);
    g.npcs.push(this.jang);
    g.addInteractable({ pos: this.jang.root.position, radius: 2.6, label: () => (g.mode === 'walk' && this.jang.root.visible ? 'Mam Jang schwätzen' : null), act: () => this.talkJang() });
    g.registerMessage(MSG_MISSED, TALK.missed);
  }

  private done(id: string): boolean { return this.g.missions.isObjectiveDone(this.id, id); }
  current(): string | null {
    if (this.g.missions.getState(this.id) !== 'Active') return null;
    return nextObjective(this.def, (o) => this.done(o));
  }
  private complete(o: string): void { this.g.missions.completeObjective(this.id, o); }

  /** Kann der Spieler die Monate bis Dezember ueberspringen? */
  canSkip(): boolean {
    const d = this.g.clock.getDate();
    return this.g.missions.getState('M07_DSTAD_AM_WANDEL') === 'Succeeded' && d.year === 1998 && d.month < 12;
  }

  /** Zeitsprung: Rueckblende, Ersparnisse je nach Beruf (Spielbalance), 1. Dezember 1998 */
  skipToDecember(): void {
    const g = this.g;
    g.ui.dialogue(MONTAGE, () => {
      const mech = g.flags['career.mechanic'] === 'job_offer';
      const photo = g.flags['career.photographer'] === 'active';
      const saved = (mech ? 42000 : 12000) + (photo ? 14000 : 0);
      g.wallet.receiveSalary(saved, g.clock.getDate(), 'Ersparnisse Mai–November (Spielbalance)');
      g.clock.setDateTime({ year: 1998, month: 12, day: 1 }, 9);
      if (g.veh) g.leaveVehicle(true);
      g.onMissionSucceeded('skip');
      g.ui.toast(`Dezember 1998 · gespart: ${formatLuf(saved)} · Konto ${formatLuf(g.wallet.getBank())}`, 5000);
    });
  }

  /** Gespraeche ueber die Zukunft; von anderen Figuren aus aufgerufen. true = Gespraech gefuehrt */
  tryTalk(who: Who): boolean {
    const g = this.g;
    if (this.current() !== 'conversations_future' || this.talked.includes(who)) return false;
    g.ui.dialogue(TALK[who], () => {
      this.talked.push(who);
      if (this.talked.length >= 3) {
        this.complete('conversations_future');
        g.ui.toast('Genug Gespräche – Silvester auf der Place d’Armes!');
      } else g.ui.toast(`Gespräche über die Zukunft: ${this.talked.length}/3`);
    });
    return true;
  }

  private newYearAbs(): number { return (365 - 1) * 24 + 24; }  // 1.1.1999 0 Uhr (Normalzeit) = Ende des 31.12.1998

  private talkJang(): void {
    const g = this.g, c = this.current();
    if (c === 'conversations_future') { if (!this.tryTalk('jang')) g.ui.dialogue(TALK.notYet); return; }
    if (c === 'final_choice') {
      const now = g.absHours();
      if (now < this.newYearAbs() - 2) { g.ui.dialogue(TALK.notYet); return; }
      g.ui.dialogue(TALK.eve, () => this.finalChoice());
      return;
    }
    g.ui.dialogue([{ who: 'Jang', lb: 'Gutt Joer 1999!', de: 'Gutes Jahr 1999!', fr: 'Bonne année 1999 !', en: 'Happy 1999!' }]);
  }

  private finalChoice(): void {
    const g = this.g;
    const opts: { value: string; label: Record<Lang, string> }[] = [];
    if (g.flags['career.mechanic'] === 'job_offer') opts.push({ value: 'garage', label: FINAL_OPTIONS.garage });
    if (g.flags['career.photographer'] === 'active') opts.push({ value: 'studio', label: FINAL_OPTIONS.studio });
    opts.push({ value: 'stay', label: FINAL_OPTIONS.stay }, { value: 'leave', label: FINAL_OPTIONS.leave });
    g.ui.choice(TALK.choice, opts, (v) => {
      this.final = v;
      g.flags['m08.final'] = v;
      // Mitternacht
      if (g.absHours() < this.newYearAbs()) g.clock.setDateTime({ year: 1999, month: 1, day: 1 }, 0);
      this.complete('final_choice');
      this.startFireworks();
      g.ui.dialogue(TALK.midnight, () => {
        g.onMissionSucceeded(this.id);
        g.showEnding(this.epilogue());
      });
    });
  }

  epilogue(): { title: string; paragraphs: string[]; stats: string[] } {
    const g = this.g, f = g.flags;
    const p: string[] = [];
    switch (this.final) {
      case 'garage': p.push(f['m02.path'] === 'honest'
        ? 'Im Frühjahr 1999 eröffnest du mit Jang eine kleine Werkstatt in Hollerich. Herr Muller schickt euch seine ersten Kunden – er hat die saubere Arbeit am roten Kombi nicht vergessen.'
        : 'Im Frühjahr 1999 eröffnest du mit Jang eine kleine Werkstatt. Die ersten Monate sind zäh: In Hollerich hat sich herumgesprochen, dass du es mit den Bremsen nicht immer genau nimmst.'); break;
      case 'studio': p.push('Mit Mia und Jang gründest du ein kleines Fotostudio beim Bahnhof. Eure Bilder der Stadt im Wandel hängen bald in Cafés und Büros.'); break;
      case 'stay': p.push('Du bleibst bei dem, was du hast: Arbeit, eine kleine Wohnung, Freunde. Das Konto wächst langsam – und die Stadt wird dein Zuhause.'); break;
      case 'leave': p.push('Am 2. Januar 1999 steigst du am Bahnhof wieder in den Zug. Jang winkt auf dem Bahnsteig. Vielleicht kommst du zurück.'); break;
      default: p.push('Silvester verbringst du allein. Jang hat auf dich gewartet. 1999 beginnt still.');
    }
    if (f['rel.steve'] === 'enemy') p.push('Steve hast du seit dem Abend im Grund nicht mehr gesehen. Man sagt, er habe die Stadt verlassen.');
    else if (f['m06.outcome'] === 'friendship') p.push('Seit dem Abend im Grund ist eure Runde eng zusammengewachsen – sogar Steve ist ruhiger geworden.');
    if (f['m07.angle'] === 'preserve') p.push('Madame Thill hat deine Reportage ausgeschnitten und an ihre Küchentür geklebt.');
    else if (f['m07.angle'] === 'progress') p.push('Wo die Schlosserei stand, wird gebaut. Deine Reportage hat die Hoffnung der Jungen gezeigt.');
    else if (f['m07.angle'] === 'balanced') p.push('Deine Reportage über Abschied und Aufbruch wurde viel gelesen – auch von denen, die sich sonst nie einig sind.');
    if (g.missions.getState('M05_DEI_VERLUER_DISKETT') === 'Succeeded') p.push('Tom hat sein Diplom bestanden und flickt nun Computer gegen den Millennium-Bug.');
    p.push('Ab heute gibt es den Euro – vorerst nur auf dem Konto. Die Franken in deiner Tasche gelten noch drei Jahre.');
    const stats = [
      `Bargeld: ${formatLuf(g.wallet.getCash())} · Konto: ${formatLuf(g.wallet.getBank())}`,
      `Ruf: ${g.reputation >= 0 ? '+' : ''}${g.reputation}`,
      `Arbeitstage in der Garage: ${g.career.daysWorked} · Fotoaufträge: ${g.m07.jobsDone}`,
      `Erledigte Missionen: ${g.controllers.filter((c) => g.missions.getState(c.id) === 'Succeeded').length}`,
    ];
    return { title: 'Enn vum éischte Kapitel', paragraphs: p, stats };
  }

  // ---------- Feuerwerk ----------
  private startFireworks(): void {
    this.fireworksUntil = performance.now() + 25000;
  }

  private burst(center: THREE.Vector3): void {
    const n = 140;
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos.set([center.x, center.y, center.z], i * 3);
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), sp = 10 + Math.random() * 8;
      vel.set([Math.sin(ph) * Math.cos(th) * sp, Math.cos(ph) * sp, Math.sin(ph) * Math.sin(th) * sp], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const colors = [0xff4040, 0x40ff80, 0x4080ff, 0xffd040, 0xff60ff, 0xffffff];
    const mat = new THREE.PointsMaterial({ color: colors[Math.floor(Math.random() * colors.length)], size: 1.6, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.g.scene.add(pts);
    this.fireworks.push({ pts, vel, age: 0 });
  }

  private updateFireworks(dt: number): void {
    const now = performance.now();
    if (now < this.fireworksUntil && Math.random() < dt * 2.5) {
      const base = this.g.city.places.place_darmes ?? this.g.pos;
      this.burst(new THREE.Vector3(base.x + (Math.random() - 0.5) * 300, base.y + 70 + Math.random() * 50, base.z + (Math.random() - 0.5) * 300));
    }
    for (const fw of this.fireworks) {
      fw.age += dt;
      const a = fw.pts.geometry.attributes.position as THREE.BufferAttribute;
      const arr = a.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        fw.vel[i + 1] -= 6 * dt;
        arr[i] += fw.vel[i] * dt; arr[i + 1] += fw.vel[i + 1] * dt; arr[i + 2] += fw.vel[i + 2] * dt;
        fw.vel[i] *= 0.985; fw.vel[i + 2] *= 0.985;
      }
      a.needsUpdate = true;
      (fw.pts.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - fw.age / 2.5);
    }
    for (const fw of this.fireworks.filter((x) => x.age > 2.6)) { this.g.scene.remove(fw.pts); fw.pts.geometry.dispose(); }
    this.fireworks = this.fireworks.filter((x) => x.age <= 2.6);
  }

  get fireworksActive(): boolean { return this.fireworks.length > 0 || performance.now() < this.fireworksUntil; }

  // ---------- Schnittstelle ----------
  objectiveText(lang: Lang): string | null {
    const c = this.current();
    if (!c) {
      if (this.g.missions.getState(this.id) === 'Succeeded') return OBJ08.done[lang];
      return this.canSkip() ? OBJ08.wait[lang] : null;
    }
    let t = OBJ08[c]?.[lang] ?? '';
    if (c === 'conversations_future') t += ` (${this.talked.length}/3)`;
    return t;
  }

  target(): THREE.Vector3 | null {
    const c = this.current();
    if (c === 'final_choice' || (c === 'conversations_future' && !this.talked.includes('jang'))) return this.jang.root.position;
    return null;
  }

  mapMarks() {
    if (this.g.missions.getState(this.id) !== 'Active') return [];
    return [{ x: this.marketSpot.x, z: this.marketSpot.z, label: 'Chrëschtmaart / Jang', done: false }];
  }

  notes(lang: Lang): string {
    const st = this.g.missions.getState(this.id);
    if (st === 'Locked') return this.canSkip() ? `<h3>MILLENNIUM</h3><div class="cur">→ ${OBJ08.wait[lang]}</div>` : '';
    const cur = this.current();
    const rows: [string, boolean][] = [['conversations_future', this.done('conversations_future')], ['final_choice', this.done('final_choice')]];
    const items = rows.map(([k, d]) => `<div class="${d ? 'done' : k === cur ? 'cur' : ''}">${d ? '✓' : k === cur ? '→' : '·'} ${OBJ08[k][lang]}</div>`).join('');
    const who = this.talked.length ? `<div class="small">Gesprochen mit: ${this.talked.map((w) => ({ jang: 'Jang', tom: 'Tom', mia: 'Mia', muller: 'Herr Muller' }[w])).join(', ')}</div>` : '';
    return `<h3>MILLENNIUM</h3>${items}${who}`;
  }

  update(dt: number): void {
    const g = this.g;
    const d = g.clock.getDate();
    const december = d.year === 1998 && d.month === 12 || (d.year === 1999 && d.month === 1 && d.day <= 6);
    this.market.visible = december;
    this.jang.root.visible = g.missions.getState(this.id) === 'Active' || (december && this.final !== '' && this.final !== 'leave');
    g.m01.jang.root.visible = !december && d.year === 1998;
    // Silvester verpasst
    if (this.current() === 'final_choice' && !this.missedSent && g.absHours() > this.newYearAbs() + 1) {
      this.missedSent = true;
      this.final = 'missed';
      g.flags['m08.final'] = 'missed';
      g.phoneNet.leaveMessage(NUMBERS.home, { date: d, hour: g.clock.getHour(), minute: g.clock.getMinute(), fromNumber: NUMBERS.jang, text: 'Jang: Silvester', dialogueId: MSG_MISSED });
    }
    this.updateFireworks(dt);
  }

  onMessageHeard(id: string): void {
    if (id === MSG_MISSED && this.current() === 'final_choice') {
      this.complete('final_choice');
      this.g.onMissionSucceeded(this.id);
      this.g.showEnding(this.epilogue());
    }
  }

  save(): SaveData {
    return { 'm08.talked': this.talked.join(','), 'm08.final': this.final, 'm08.missed': this.missedSent ? '1' : '0' };
  }

  load(d: SaveData): void {
    this.talked = (d['m08.talked'] ?? '').split(',').filter(Boolean) as Who[];
    this.final = d['m08.final'] ?? '';
    this.missedSent = d['m08.missed'] === '1';
  }
}
