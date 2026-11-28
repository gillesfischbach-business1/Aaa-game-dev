import * as THREE from 'three';
import { dayOfWeek } from '../../core/calendar';
import { formatLuf } from '../../core/economy';
import type { SaveData } from '../../core/save';
import type { Game } from '../game';
import { missionDef, nextObjective } from '../missiondata';
import { makeCone, makePerson, makeSign, type PersonModel } from '../models';
import { DIALOGUE02, NUMBERS, OBJECTIVE_TEXT, PAY, type Lang, type Line } from '../story';
import { Vehicle } from '../vehicle';
import type { Mission01 } from './m01';
import type { MissionController } from './types';

export const M02_ID = 'M02_ENG_LESCHT_CHANCE';
const MSG_ID = 'DLG_JANG_GARAGE';

// Arbeitsschritte (Werkstatt). Reihenfolge = fachlich richtiger Ablauf beim Wechsel von Belaegen und Scheiben.
const STEPS: Record<string, string> = {
  lift: 'Wagen auf die Hebebühne',
  wheel_off: 'Vorderräder abschrauben',
  caliper_off: 'Bremssattel lösen',
  disc: 'Bremsscheiben tauschen',
  pads: 'Neue Bremsbeläge einsetzen',
  caliper_on: 'Bremssattel montieren',
  wheel_on: 'Räder anschrauben (Drehmoment)',
  lower: 'Wagen herunterlassen',
  pump: 'Bremspedal pumpen, prüfen',
  clean: 'Beläge mit Druckluft ausblasen',
  adjust: 'Bremse nachstellen',
  oil: 'Ölwechsel',
  polish: 'Karosserie polieren',
  wipers: 'Scheibenwischer tauschen',
};
const ORDER_HONEST = ['lift', 'wheel_off', 'caliper_off', 'disc', 'pads', 'caliper_on', 'wheel_on', 'lower', 'pump'];
const ORDER_SHORTCUT = ['lift', 'wheel_off', 'clean', 'adjust', 'wheel_on', 'lower'];

// Mission 02 "Eng lescht Chance": Anrufbeantworter -> Garage Muller (Hollerich) -> Probearbeit mit zwei Wegen
// -> Probefahrt an Pylonen vorbei -> Bericht. Alle Firmen und Personen sind fiktiv.
export class Mission02 implements MissionController {
  readonly id = M02_ID;
  readonly def = missionDef(M02_ID);
  readonly muller: PersonModel;
  readonly wagner: PersonModel;
  readonly customerCar: Vehicle;
  readonly garageSpot: THREE.Vector3;
  readonly partsSpot: THREE.Vector3;
  readonly cones: { pos: THREE.Vector3; mesh: THREE.Group }[] = [];
  path: '' | 'honest' | 'shortcut' = '';
  partsBought = false;
  messageLeft = false;
  deadline = -1;        // Spielstunden (Normalzeit seit 1.1.), bis wann man bei Muller sein muss
  conesPassed = 0;
  mistakes = 0;
  private fadeWarned = false;
  private customerHome = new THREE.Vector3();
  private customerHeading = 0;

  constructor(private g: Game, private m01: Mission01) {
    const P = g.city.places;
    // Werkstatt: an der Rue de l'Abattoir (Gewerbe in Hollerich)
    this.garageSpot = g.openSpot(P.rue_abattoir ?? new THREE.Vector3(-1028, 273, 1160), true);
    const side = this.roadSide(this.garageSpot);
    const signPos = this.garageSpot.clone().addScaledVector(side.right, side.width / 2 + 3);
    signPos.y = g.city.surfaceAt(signPos.x, signPos.z, signPos.y + 1);
    const sign = makeSign(['GARAGE MULLER', 'Reparaturen · Pneuen · Contrôle technique'], '#1f3a5f');
    sign.position.copy(signPos);
    sign.rotation.y = Math.atan2(side.right.x, side.right.z);
    g.scene.add(sign);
    this.muller = makePerson(77, { jacket: 0x2a3a5a });
    const mPos = g.openSpot(this.garageSpot.clone().addScaledVector(side.right, side.width / 2 + 2).addScaledVector(side.dir, 3));
    this.muller.root.position.copy(mPos);
    g.scene.add(this.muller.root);
    g.npcs.push(this.muller);
    g.addInteractable({ pos: mPos, radius: 2.4, label: () => (g.mode === 'walk' ? 'Mam Här Muller schwätzen' : null), act: () => this.talkMuller() });

    // Kundenwagen: roter Kombi, am Fahrbahnrand vor der Werkstatt
    this.customerCar = new Vehicle(9, 2, 0x8a1c1c);
    this.customerCar.locked = true;
    g.scene.add(this.customerCar.model.root);
    this.customerHome.copy(this.garageSpot).addScaledVector(side.right, side.width / 2 - 1.1).addScaledVector(side.dir, -7);
    this.customerHeading = Math.atan2(-side.dir.x, -side.dir.z);
    this.customerCar.placeAt(this.customerHome, this.customerHeading, g.city);
    g.registerVehicle(this.customerCar, () => this.canDriveCustomer(), 'Kombi (Madame Schroeder)');
    g.addInteractable({
      pos: this.customerCar.pos, radius: 3.4,
      label: () => (g.mode === 'walk' && this.current() === 'group:trial' && this.path !== '' ? 'Am Kombi schaffen' : null),
      act: () => this.workOnCar(),
    });

    // Teilehaendler an der Route d'Esch, ca. 300 m von der Werkstatt
    let best: THREE.Vector3 | null = null, bestScore = Infinity;
    for (const l of g.city.drivable) {
      if (l.name !== "Route d'Esch") continue;
      for (const p of l.pts) {
        const s = Math.abs(p.distanceTo(this.garageSpot) - 300);
        if (s < bestScore) { bestScore = s; best = p; }
      }
    }
    this.partsSpot = g.openSpot(best ?? P.route_esch ?? this.garageSpot.clone().add(new THREE.Vector3(150, 0, 250)));
    this.wagner = makePerson(88, { jacket: 0x6a5a3a });
    this.wagner.root.position.copy(this.partsSpot);
    g.scene.add(this.wagner.root);
    g.npcs.push(this.wagner);
    const wSide = this.roadSide(this.partsSpot);
    const wSign = makeSign(['AUTOSDEELER WAGNER', 'Pièces auto · Ersatzteile'], '#6a2a1a', '#f6e7c1', 4.6);
    wSign.position.copy(this.partsSpot).addScaledVector(wSide.right, 2.5);
    wSign.position.y = g.city.surfaceAt(wSign.position.x, wSign.position.z, this.partsSpot.y + 1);
    wSign.rotation.y = Math.atan2(wSide.right.x, wSide.right.z);
    g.scene.add(wSign);
    g.addInteractable({ pos: this.partsSpot, radius: 2.4, label: () => (g.mode === 'walk' ? 'Mam Här Wagner schwätzen' : null), act: () => this.talkWagner() });

    g.registerMessage(MSG_ID, DIALOGUE02.jangMessage);

    // Pylonen fuer die Probefahrt
    const routePts = [best ?? P.route_esch, P.rue_bouillon, P.rond_point_merl].filter(Boolean) as THREE.Vector3[];
    for (const p of routePts) {
      const spot = g.openSpot(p, true);
      const mesh = new THREE.Group();
      const s2 = this.roadSide(spot);
      for (const k of [-1, 1]) {
        const c = makeCone();
        c.position.copy(spot).addScaledVector(s2.right, k * (s2.width / 2 + 0.3));
        c.position.y = g.city.surfaceAt(c.position.x, c.position.z, spot.y + 1);
        mesh.add(c);
      }
      mesh.visible = false;
      g.scene.add(mesh);
      this.cones.push({ pos: spot, mesh });
    }
  }

  private roadSide(p: THREE.Vector3): { dir: THREE.Vector3; right: THREE.Vector3; width: number } {
    for (const l of this.g.city.drivable) {
      const i = l.pts.findIndex((q) => q.distanceTo(p) < 0.01);
      if (i < 0) continue;
      const n = l.pts[Math.min(i + 1, l.pts.length - 1)], o = l.pts[Math.max(i - 1, 0)];
      const dir = new THREE.Vector3(n.x - o.x, 0, n.z - o.z).normalize();
      return { dir, right: new THREE.Vector3(-dir.z, 0, dir.x), width: l.width };
    }
    return { dir: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0), width: 6 };
  }

  private done(id: string): boolean { return this.g.missions.isObjectiveDone(this.id, id); }
  current(): string | null {
    if (this.g.missions.getState(this.id) !== 'Active') return null;
    return nextObjective(this.def, (o) => this.done(o));
  }
  private complete(obj: string): void { this.g.missions.completeObjective(this.id, obj); }

  private canDriveCustomer(): boolean { return this.current() === 'test_drive'; }
  private openNow(): boolean {
    const d = this.g.clock.getDate(), h = this.g.clock.getHourLocal(), wd = dayOfWeek(d);
    if (wd === 6) return false;
    if (wd === 5) return h >= 8 && h < 12;
    return h >= 8 && h < 18;
  }

  objectiveText(lang: Lang): string | null {
    const c = this.current();
    if (!c) return this.g.missions.getState(this.id) === 'Succeeded' && this.m01 ? OBJECTIVE_TEXT.done02[lang] : null;
    if (c === 'group:trial' && this.path === 'honest' && !this.partsBought) return OBJECTIVE_TEXT.buy_parts[lang];
    let t = OBJECTIVE_TEXT[c]?.[lang] ?? '';
    if (c === 'meet_contact' && this.deadline >= 0) t += ` · ${lang === 'en' ? 'by' : lang === 'fr' ? 'avant' : 'bis'} ${this.g.formatAbsHours(this.deadline)}`;
    if (c === 'test_drive') t += ` (${this.conesPassed}/${this.cones.length})`;
    return t;
  }

  target(): THREE.Vector3 | null {
    switch (this.current()) {
      case 'listen_message': return this.g.homeDoor;
      case 'meet_contact': case 'report_to_owner': return this.muller.root.position;
      case 'group:trial': return this.path === 'honest' && !this.partsBought ? this.partsSpot : this.path ? this.customerCar.pos : this.muller.root.position;
      case 'test_drive': return this.conesPassed < this.cones.length ? this.cones[this.conesPassed].pos : this.garageSpot;
      default: return null;
    }
  }

  mapMarks() {
    const st = this.g.missions.getState(this.id);
    if (st !== 'Active') return [];
    const marks = [
      { x: this.g.homeDoor.x, z: this.g.homeDoor.z, label: 'Wunneng', done: this.done('listen_message') },
      { x: this.garageSpot.x, z: this.garageSpot.z, label: 'Garage Muller', done: false },
    ];
    if (this.path === 'honest') marks.push({ x: this.partsSpot.x, z: this.partsSpot.z, label: 'Wagner', done: this.partsBought });
    if (this.current() === 'test_drive') this.cones.forEach((c, i) => marks.push({ x: c.pos.x, z: c.pos.z, label: `Pylon ${i + 1}`, done: i < this.conesPassed }));
    return marks;
  }

  notes(lang: Lang): string {
    const st = this.g.missions.getState(this.id);
    if (st === 'Locked') return '';
    const cur = this.current();
    const rows: [string, boolean, string][] = [
      ['listen_message', this.done('listen_message'), OBJECTIVE_TEXT.listen_message[lang]],
      ['meet_contact', this.done('meet_contact'), OBJECTIVE_TEXT.meet_contact[lang]],
    ];
    if (this.path === 'honest') rows.push(['buy_parts', this.partsBought, OBJECTIVE_TEXT.buy_parts[lang]]);
    rows.push(['group:trial', this.done('trial_repair_honest') || this.done('trial_repair_shortcut'), OBJECTIVE_TEXT['group:trial'][lang]]);
    rows.push(['test_drive', this.done('test_drive'), OBJECTIVE_TEXT.test_drive[lang]]);
    rows.push(['report_to_owner', this.done('report_to_owner'), OBJECTIVE_TEXT.report_to_owner[lang]]);
    const curKey = cur === 'group:trial' && this.path === 'honest' && !this.partsBought ? 'buy_parts' : cur;
    const items = rows.map(([k, d, t]) => `<div class="${d ? 'done' : k === curKey ? 'cur' : ''}">${d ? '✓' : k === curKey ? '→' : '·'} ${t}</div>`).join('');
    const deadline = cur === 'meet_contact' && this.deadline >= 0 ? `<div class="small">Muller erwartet dich bis ${this.g.formatAbsHours(this.deadline)} · Öffnungszeiten Mo–Fr 8–18, Sa 8–12</div>` : '';
    const pathNote = this.path ? `<div class="small">Gewählt: ${this.path === 'honest' ? 'richtige Reparatur (Teile kaufen)' : 'schnell nachstellen, keine Teile'}</div>` : '';
    return `<h3 style="margin-top:14px">ENG LESCHT CHANCE</h3>${items}${deadline}${pathNote}`;
  }

  // ---------- Ablauf ----------
  onMessageHeard(dialogueId: string): void {
    if (dialogueId !== MSG_ID || this.current() !== 'listen_message') return;
    this.complete('listen_message');
    // "Gëff séier laanscht": drei Stunden – ausserhalb der Oeffnungszeiten bis zum naechsten Arbeitstag 10 Uhr
    const now = this.g.absHours();
    this.deadline = this.openNow() && this.g.clock.getHourLocal() < 15 ? now + 3 : this.g.nextWorkdayAt(10);
  }

  private talkMuller(): void {
    const g = this.g, c = this.current();
    const say = (lines: Line[], then?: () => void) => g.ui.dialogue(lines, then);
    if (!c) {
      say([g.missions.getState(this.id) === 'Succeeded'
        ? { who: 'Här Muller', lb: 'Bis Méindeg. A sidd pünktlech!', de: 'Bis Montag. Und seien Sie pünktlich!', fr: 'À lundi. Et soyez à l’heure !', en: 'See you Monday. And be on time!' }
        : { who: 'Här Muller', lb: 'Jo? Ech hu vill ze dinn.', de: 'Ja? Ich habe viel zu tun.', fr: 'Oui ? J’ai beaucoup à faire.', en: 'Yes? I’m busy.' }]);
      return;
    }
    if (c === 'listen_message') {
      say([{ who: 'Här Muller', lb: 'Mir brauchen de Moment keen. Oder schéckt Iech een?', de: 'Wir brauchen im Moment niemanden. Oder schickt Sie jemand?', fr: 'Nous n’avons besoin de personne en ce moment. Ou quelqu’un vous envoie ?', en: 'We don’t need anyone right now. Or did someone send you?' }]);
      return;
    }
    if ((c === 'meet_contact' || c === 'report_to_owner') && !this.openNow()) { say(DIALOGUE02.mullerClosed); return; }
    if (c === 'meet_contact') {
      if (this.deadline >= 0 && g.absHours() > this.deadline) {
        g.missions.fail(this.id, 'late_for_trial');
        g.missions.restartFromCheckpoint(this.id);
        this.deadline = g.nextWorkdayAt(9);
        say(DIALOGUE02.mullerLate, () => g.ui.toast(`Neuer Termin: ${g.formatAbsHours(this.deadline)}`, 4000));
        return;
      }
      say(DIALOGUE02.mullerJob, () => { this.complete('meet_contact'); this.askPath(); });
      return;
    }
    if (c === 'group:trial') {
      if (!this.path) { this.askPath(); return; }
      if (this.path === 'honest' && !this.partsBought) { say(DIALOGUE02.mullerNeedParts); return; }
      say([{ who: 'Här Muller', lb: 'De Kombi steet virun der Dier. Un d’Aarbecht!', de: 'Der Kombi steht vor der Tür. An die Arbeit!', fr: 'Le break est devant la porte. Au travail !', en: 'The estate car is out front. Get to work!' }]);
      return;
    }
    if (c === 'test_drive') { say(DIALOGUE02.mullerTestDrive); return; }
    if (c === 'report_to_owner') this.report();
  }

  private askPath(): void {
    const g = this.g;
    g.ui.choice(DIALOGUE02.mullerChoice, [
      { value: 'honest', label: { de: 'Beläge und Scheiben richtig tauschen (Teile kaufen, ca. 1 800 F)', fr: 'Changer correctement plaquettes et disques (acheter les pièces, env. 1 800 F)', en: 'Replace pads and discs properly (buy parts, about 1,800 F)' } },
      { value: 'shortcut', label: { de: 'Nur ausblasen und nachstellen – geht schnell, keine Teile', fr: 'Juste souffler et régler – rapide, sans pièces', en: 'Just blow out and adjust – quick, no parts' } },
    ], (v) => {
      this.path = v as 'honest' | 'shortcut';
      g.ui.dialogue(v === 'honest' ? DIALOGUE02.mullerHonest : DIALOGUE02.mullerShortcut);
    });
  }

  private talkWagner(): void {
    const g = this.g;
    if (this.current() === 'group:trial' && this.path === 'honest' && !this.partsBought) {
      g.ui.dialogue(DIALOGUE02.wagner, () => {
        if (!g.wallet.payCash(PAY.partsCost, g.clock.getDate(), 'Bremsteile (Wagner)')) { g.ui.dialogue(DIALOGUE02.wagnerNoMoney); return; }
        this.partsBought = true;
        g.ui.toast(`Bremsbeläge und -scheiben gekauft · −${formatLuf(PAY.partsCost)}`);
      });
      return;
    }
    g.ui.dialogue([{ who: 'Här Wagner', lb: 'Moien! Wann Dir eppes braucht – Filteren, Pneuen, Bremsen, ech hunn alles.', de: 'Guten Tag! Wenn Sie etwas brauchen – Filter, Reifen, Bremsen, ich habe alles.', fr: 'Bonjour ! Si vous avez besoin de quoi que ce soit – filtres, pneus, freins, j’ai tout.', en: 'Hello! If you need anything – filters, tyres, brakes, I’ve got it all.' }]);
  }

  private workOnCar(): void {
    const g = this.g;
    if (this.path === 'honest' && !this.partsBought) { g.ui.dialogue(DIALOGUE02.mullerNeedParts); return; }
    const order = this.path === 'honest' ? ORDER_HONEST : ORDER_SHORTCUT;
    const pool = this.path === 'honest' ? [...ORDER_HONEST, 'oil', 'wipers'] : [...ORDER_SHORTCUT, 'pads', 'oil', 'polish'];
    const steps = pool.map((id) => ({ id, label: STEPS[id] })).sort((a, b) => a.label.localeCompare(b.label, 'de'));
    const hint = this.path === 'honest'
      ? 'Vorderbremse komplett erneuern. Denk an den Ablauf: anheben, Rad ab, Sattel weg, erst die Scheibe, dann die Beläge, alles wieder zusammen, ablassen – und vor der Fahrt das Pedal prüfen.'
      : 'Schnelle Variante ohne neue Teile: anheben, Rad ab, Staub ausblasen, Bremse nachstellen, Rad dran, ablassen.';
    g.input.enabled = false;
    document.exitPointerLock?.();
    this.mistakes = 0;
    g.ui.workshop('Werkbank – roter Kombi', hint, steps, order, (ok) => {
      if (ok) g.advanceMinutes(this.path === 'honest' ? 15 : 8);
      else this.mistakes++;
    }, () => {
      g.input.enabled = true;
      this.complete(this.path === 'honest' ? 'trial_repair_honest' : 'trial_repair_shortcut');
      this.customerCar.brakeEfficiency = this.path === 'honest' ? 1 : 0.85;
      this.customerCar.locked = false;
      this.conesPassed = 0;
      g.ui.dialogue(DIALOGUE02.mullerTestDrive);
    });
  }

  private report(): void {
    const g = this.g;
    const honest = this.path === 'honest';
    const damaged = this.customerCar.damage > 30;
    const lines = [...(honest ? DIALOGUE02.reportHonest : DIALOGUE02.reportShortcut), ...(damaged ? [DIALOGUE02.reportDamaged] : [])];
    g.ui.dialogue(lines, () => {
      let pay = honest ? PAY.honest + PAY.partsCost : PAY.shortcut;
      if (damaged) pay = Math.max(0, pay - PAY.damagePenalty);
      g.wallet.receiveCash(pay, g.clock.getDate(), honest ? 'Garage Muller: Lohn + Teile' : 'Garage Muller: Tageslohn');
      g.reputation += (honest ? 10 - this.mistakes * 2 : -5) + (damaged ? -3 : 0);
      g.flags['m02.path'] = this.path;
      g.flags['career.mechanic'] = honest ? 'job_offer' : 'maybe';
      this.complete('report_to_owner');
      g.ui.toast(`Mission erfüllt: „Eng lescht Chance“ · +${formatLuf(pay)} · Ruf ${g.reputation >= 0 ? '+' : ''}${g.reputation}`, 5000);
      g.onMissionSucceeded(this.id);
    });
  }

  update(dt: number): void {
    const g = this.g;
    // Jang ruft etwa eine Spielstunde nach dem Treffen an – die Nachricht landet auf dem Anrufbeantworter
    if (g.missions.getState(this.id) === 'Active' && !this.messageLeft && this.current() === 'listen_message'
      && g.absHours() >= this.m01.completedAtHours + 1) {
      const d = g.clock.getDate();
      g.phoneNet.leaveMessage(NUMBERS.home, { date: d, hour: g.clock.getHour(), minute: g.clock.getMinute(), fromNumber: NUMBERS.jang, text: 'Jang: Garage Muller', dialogueId: MSG_ID });
      this.messageLeft = true;
    }
    const testing = this.current() === 'test_drive';
    for (const c of this.cones) c.mesh.visible = testing;
    if (testing && g.veh === this.customerCar) {
      const car = this.customerCar;
      if (this.conesPassed < this.cones.length && car.pos.distanceTo(this.cones[this.conesPassed].pos) < 10) {
        this.conesPassed++;
        g.ui.toast(this.conesPassed < this.cones.length ? `Pylon ${this.conesPassed}/${this.cones.length}` : 'Alle Pylonen – zurück zur Garage');
      }
      // Schlecht gewartete Bremse wird bei starkem Bremsen heiss und weich
      if (this.path === 'shortcut' && car.braking && car.kmh > 25) {
        car.brakeEfficiency = Math.max(0.3, car.brakeEfficiency - dt * 0.06);
        if (!this.fadeWarned && car.brakeEfficiency < 0.65) { this.fadeWarned = true; g.ui.dialogue([DIALOGUE02.brakesFade]); }
      }
      if (this.conesPassed >= this.cones.length && car.pos.distanceTo(this.garageSpot) < 16 && car.kmh < 5) {
        this.complete('test_drive');
        g.leaveVehicle(true);
        car.locked = true;
        g.ui.toast('Probefahrt beendet – Herrn Muller Bericht erstatten.');
      }
    }
    // Kundenwagen zerstoert
    if (this.customerCar.damage >= 100 && g.missions.getState(this.id) === 'Active') {
      g.missions.fail(this.id, 'customer_car_destroyed');
      g.missions.restartFromCheckpoint(this.id);
      if (g.veh === this.customerCar) g.leaveVehicle(true);
      this.resetCustomerCar();
      this.path = '';
      this.partsBought = false;
      g.ui.dialogue(DIALOGUE02.wrecked);
    }
  }

  resetCustomerCar(): void {
    const car = this.customerCar;
    car.damage = 0;
    car.brakeEfficiency = 1;
    car.locked = true;
    car.placeAt(this.customerHome, this.customerHeading, this.g.city);
    this.conesPassed = 0;
    this.fadeWarned = false;
  }

  save(): SaveData {
    const c = this.customerCar;
    return {
      'm02.path': this.path,
      'm02.parts': this.partsBought ? '1' : '0',
      'm02.message_left': this.messageLeft ? '1' : '0',
      'm02.deadline': String(this.deadline),
      'm02.cones': String(this.conesPassed),
      'm02.mistakes': String(this.mistakes),
      'm02.car': `${c.pos.x},${c.pos.y},${c.pos.z},${c.heading},${c.damage},${c.brakeEfficiency},${c.locked ? 1 : 0}`,
    };
  }

  load(d: SaveData): void {
    this.path = (d['m02.path'] as '' | 'honest' | 'shortcut') ?? '';
    this.partsBought = d['m02.parts'] === '1';
    this.messageLeft = d['m02.message_left'] === '1';
    this.deadline = Number(d['m02.deadline'] ?? -1);
    this.conesPassed = Number(d['m02.cones'] ?? 0);
    this.mistakes = Number(d['m02.mistakes'] ?? 0);
    const p = (d['m02.car'] ?? '').split(',').map(Number);
    if (p.length === 7 && p.every(Number.isFinite)) {
      const c = this.customerCar;
      c.placeAt(new THREE.Vector3(p[0], p[1], p[2]), p[3], this.g.city);
      c.damage = p[4];
      c.brakeEfficiency = p[5];
      c.locked = p[6] === 1;
    } else this.resetCustomerCar();
    // Eine schon hinterlassene, aber nicht gehoerte Nachricht erneut auf das Band legen
    if (this.messageLeft && this.current() === 'listen_message') this.messageLeft = false;
  }
}

