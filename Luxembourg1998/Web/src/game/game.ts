import * as THREE from 'three';
import { GameClock, addDays, dayOfWeek, dayOfYear, fromIso, isSummerTime, toIso, type LuxDate } from '../core/calendar';
import { PayphoneSession, PhoneBook, PhoneNetwork, normalizeNumber } from '../core/comms';
import { Wallet, formatLuf } from '../core/economy';
import { MissionTracker } from '../core/missions';
import { readSaveFromStorage, writeSaveToStorage, type SaveData } from '../core/save';
import { buildCity, type City } from '../world/city';
import { pointInPolygon } from '../world/terrain';
import type { WorldData } from '../world/types';
import { Environment } from './environment';
import { Input } from './input';
import { Mission01, M01_ID } from './missions/m01';
import { Mission02, M02_ID } from './missions/m02';
import type { MissionController } from './missions/types';
import { missionDef } from './missiondata';
import { animateWalk, makeMarker, makePerson, makePhoneBooth, makeSign, type PersonModel } from './models';
import { COINS, DIALOGUE, DIALOGUE02, NUMBERS, PAYPHONE_TARIFF, PHONEBOOK, START, START_MONEY, timeAnnouncement, type Lang } from './story';
import { Traffic } from './traffic';
import { UI, drawMap } from './ui';
import { Vehicle } from './vehicle';

export type Quality = 'high' | 'low';
const SAVE_KEY = 'lux98.slot1';

export interface Interactable { pos: THREE.Vector3; radius: number; label: () => string | null; act: () => void }
interface Drivable { v: Vehicle; canEnter: () => boolean; name: string; introSeen: boolean }

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(65, 1, 0.1, 6000);
  readonly city: City;
  readonly env: Environment;
  readonly input: Input;
  readonly ui = new UI();
  readonly clock = new GameClock(START.date, START.hour);
  wallet = new Wallet(START_MONEY.cash, START_MONEY.bank);
  missions = new MissionTracker();
  readonly phoneBook = new PhoneBook();
  readonly phoneNet: PhoneNetwork;
  traffic: Traffic;
  reputation = 0;
  flags: Record<string, string> = {};

  // Spieler
  readonly player: PersonModel;
  readonly pos = new THREE.Vector3();
  private vy = 0;
  heading = 0;
  private walkPhase = 0;
  mode: 'walk' | 'drive' = 'walk';
  veh: Vehicle | null = null;        // aktuell gefahrenes Auto
  firstPerson = false;
  camYaw = 0;
  camPitch = 0.25;
  readonly car: Vehicle;              // eigener Wagen (vom Onkel)
  navHelp = false;
  running = false;
  readonly booths: THREE.Vector3[] = [];
  readonly npcs: PersonModel[] = [];
  homeDoor = new THREE.Vector3();
  private drivables: Drivable[] = [];
  private timeScales = [5, 30, 120];
  private timeIdx = 0;
  private interactables: Interactable[] = [];
  private marker = makeMarker();
  private session: PayphoneSession | null = null;
  private dialed = '';
  private nbPage = 'notes';
  private mapView = { cx: 0, cz: 600, scale: 0.5 };
  private lastFrame = performance.now();
  frameTimes: number[] = [];
  readonly m01: Mission01;
  readonly m02: Mission02;
  readonly controllers: MissionController[];

  constructor(canvas: HTMLCanvasElement, world: WorldData, readonly quality: Quality, lang: Lang) {
    this.ui.lang = lang;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(quality === 'high' ? Math.min(window.devicePixelRatio, 2) : 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.input = new Input(canvas);
    this.city = buildCity(world, this.scene, { trees: quality === 'high' ? 3500 : 900 });
    this.env = new Environment(this.scene, this.renderer, quality === 'high');
    this.traffic = new Traffic(this.city, this.scene, quality === 'high' ? 32 : 14, quality === 'high' ? 80 : 30);

    this.player = makePerson(1, { jacket: 0x5a4632 });
    this.scene.add(this.player.root, this.marker);
    this.marker.visible = false;
    this.car = new Vehicle(4, 0, 0xb8bcc0);  // silberne Limousine des Onkels
    this.car.locked = true;
    this.scene.add(this.car.model.root);
    this.registerVehicle(this.car, () => !this.car.locked, 'Onkels Wagen');

    for (const e of PHONEBOOK) this.phoneBook.add(e);
    this.phoneNet = new PhoneNetwork(this.phoneBook);
    // Erreichbarkeiten (fiktive Tagesablaeufe): Buero Weis Mo-Sa 8-18, Garage Mo-Fr 8-18 + Sa 8-12, Wagner Mo-Sa 8-18
    this.phoneNet.setAnswerRule(NUMBERS.weis, (d, h) => dayOfWeek(d) < 6 && h >= 8 && h < 18);
    this.phoneNet.setAnswerRule(NUMBERS.garage, (d, h) => (dayOfWeek(d) < 5 && h >= 8 && h < 18) || (dayOfWeek(d) === 5 && h >= 8 && h < 12));
    this.phoneNet.setAnswerRule(NUMBERS.parts, (d, h) => dayOfWeek(d) < 6 && h >= 8 && h < 18);
    this.phoneNet.setAnswerRule(NUMBERS.home, () => false);  // man selbst ist nicht zu Hause

    this.placeWorldObjects();
    this.m01 = new Mission01(this);
    this.m02 = new Mission02(this, this.m01);
    this.controllers = [this.m01, this.m02];
    this.registerMissions();

    this.setupPhoneUI();
    this.ui.bindNotebook((p) => { this.nbPage = p; this.renderNotebook(); });
    this.setupMapControls();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  private registerMissions(): void {
    this.missions = new MissionTracker();
    for (const id of [M01_ID, M02_ID]) {
      const r = this.missions.register(missionDef(id));
      if (!r.ok) console.error(r.error);
    }
  }

  // ---------- Werkzeuge fuer Missionen ----------
  addInteractable(i: Interactable): void { this.interactables.push(i); }

  registerVehicle(v: Vehicle, canEnter: () => boolean, name: string): void {
    this.drivables.push({ v, canEnter, name, introSeen: false });
    this.addInteractable({
      pos: v.pos, radius: 3.2,
      label: () => (this.mode === 'walk' ? (canEnter() ? `Asteigen – ${name}` : null) : null),
      act: () => this.enterVehicle(v),
    });
  }

  /** Spielzeit in Stunden (Normalzeit) seit 1.1.1998 0 Uhr – fuer Fristen */
  absHours(): number {
    return (dayOfYear(this.clock.getStandardDate()) - 1) * 24 + this.clock.getStandardHour();
  }

  private absToWall(abs: number): { date: LuxDate; hour: number } {
    const day = Math.floor(abs / 24);
    let date = addDays({ year: 1998, month: 1, day: 1 }, day);
    let hour = abs - day * 24;
    if (isSummerTime(date, Math.floor(hour))) hour += 1;
    if (hour >= 24) { hour -= 24; date = addDays(date, 1); }
    return { date, hour };
  }

  formatAbsHours(abs: number): string {
    const { date, hour } = this.absToWall(abs);
    const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const h = Math.floor(hour), m = Math.round((hour - h) * 60);
    return `${names[dayOfWeek(date)]} ${date.day}.${date.month}. ${String(h).padStart(2, '0')}:${String(m === 60 ? 0 : m).padStart(2, '0')}`;
  }

  /** naechster Werktag (nicht Sonntag) um eine Wanduhrzeit, als absHours */
  nextWorkdayAt(wallHour: number): number {
    let d = addDays(this.clock.getDate(), 1);
    while (dayOfWeek(d) === 6) d = addDays(d, 1);
    const std = wallHour - (isSummerTime(d, wallHour - 1) ? 1 : 0);
    return (dayOfYear(d) - 1) * 24 + std;
  }

  advanceMinutes(min: number): void {
    const before = this.clock.getTimeScale();
    this.clock.setTimeScale(1);
    this.clock.advance(min * 60);
    this.clock.setTimeScale(before);
  }

  onMissionSucceeded(id: string): void {
    this.missions.refresh(this.clock.getDate());
    // Naechste Mission startet von selbst (der Spieler erfaehrt davon diegetisch: Anruf, Brief ...)
    if (id === M01_ID && this.missions.getState(M02_ID) === 'Available') this.missions.start(M02_ID);
    this.save();
  }

  // ---------- Aufbau ----------
  openSpot(target: THREE.Vector3, preferRoad = false): THREE.Vector3 {
    // naechster freier Punkt (nicht in einem Gebaeude), bevorzugt auf einem Weg/einer Strasse
    const lines = preferRoad ? this.city.drivable : [...this.city.walkways, ...this.city.drivable];
    const cands: { p: THREE.Vector3; d: number }[] = [];
    for (const l of lines) for (const p of l.pts) {
      const d = p.distanceToSquared(target);
      if (d < 250 * 250) cands.push({ p, d });
    }
    cands.sort((a, b) => a.d - b.d);
    const best = cands.find((c) => !this.insideBuilding(c.p.x, c.p.z))?.p ?? target;
    const b = best.clone();
    b.y = this.city.surfaceAt(b.x, b.z, b.y + 1);
    return b;
  }

  private insideBuilding(x: number, z: number): boolean {
    for (const fp of this.city.buildingFootprints) {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const [px, pz] of fp) { if (px < minX) minX = px; if (px > maxX) maxX = px; if (pz < minZ) minZ = pz; if (pz > maxZ) maxZ = pz; }
      if (x < minX - 0.8 || x > maxX + 0.8 || z < minZ - 0.8 || z > maxZ + 0.8) continue;
      if (pointInPolygon(x, z, fp)) return true;
    }
    const probe = { x, z };
    this.city.collision.resolve(probe, 0.8, this.city.terrain.heightAt(x, z));
    return probe.x !== x || probe.z !== z;
  }

  private placeWorldObjects(): void {
    const P = this.city.places;
    const gare = P.gare ?? new THREE.Vector3(320, 289, 1300);
    // Bahnhofsvorplatz liegt noerdlich des Bahnhofs
    const forecourt = this.openSpot(gare.clone().add(new THREE.Vector3(-10, 0, -45)));
    this.pos.copy(forecourt);
    const boothSpots = [forecourt.clone().add(new THREE.Vector3(12, 0, -8)), P.place_de_metz, P.place_guillaume, P.route_esch].filter(Boolean) as THREE.Vector3[];
    for (const s of boothSpots) {
      const spot = this.openSpot(s.clone().add(new THREE.Vector3(3, 0, 3)));
      spot.x += 2.2; spot.y = this.city.surfaceAt(spot.x, spot.z, spot.y + 1);
      const booth = makePhoneBooth();
      booth.position.copy(spot);
      this.scene.add(booth);
      this.city.collision.addFootprint([[spot.x - 0.55, spot.z - 0.55], [spot.x + 0.55, spot.z - 0.55], [spot.x + 0.55, spot.z + 0.55], [spot.x - 0.55, spot.z + 0.55]], spot.y, spot.y + 2.5);
      this.booths.push(spot);
      this.addInteractable({ pos: spot, radius: 2.4, label: () => (this.mode === 'walk' ? 'Telefonieren' : null), act: () => this.openPhone() });
    }
    // Geldautomat am Bahnhof (Bancomat)
    const atm = this.openSpot(forecourt.clone().add(new THREE.Vector3(-14, 0, 4)));
    const atmSign = makeSign(['BANCOMAT'], '#2a5a3a', '#f2f2e8', 1.6);
    atmSign.scale.setScalar(0.6);
    atmSign.position.copy(atm).add(new THREE.Vector3(0.9, 0, 0));
    this.scene.add(atmSign);
    this.addInteractable({ pos: atm, radius: 2, label: () => (this.mode === 'walk' ? 'Geld abheben (2 000 F)' : null), act: () => this.useAtm() });
    // Wohnung: Haustuer an der Avenue de la Liberte (Anrufbeantworter im 3. Stock)
    this.homeDoor = this.openSpot((P.avenue_liberte ?? gare).clone().add(new THREE.Vector3(-18, 0, -14)));
    const doorSign = makeSign(['Nr. 3 · Kremer'], '#4a3a2a', '#efe6cf', 1.4);
    doorSign.scale.setScalar(0.55);
    doorSign.position.copy(this.homeDoor).add(new THREE.Vector3(0.8, 0, 0));
    this.scene.add(doorSign);
    this.addInteractable({ pos: this.homeDoor, radius: 2.2, label: () => (this.mode === 'walk' ? 'Heem: Äntwerter nolauschteren' : null), act: () => this.checkAnsweringMachine() });
    this.resetOwnCar();
  }

  resetOwnCar(): void {
    const spot = this.openSpot(this.city.places.place_de_paris ?? new THREE.Vector3(97, 297, 860), true);
    let heading = 0;
    for (const l of this.city.drivable) {
      const i = l.pts.findIndex((p) => p.distanceTo(spot) < 0.01);
      if (i >= 0) {
        const n = l.pts[Math.min(i + 1, l.pts.length - 1)], o = l.pts[Math.max(i - 1, 0)];
        heading = Math.atan2(-(n.x - o.x), -(n.z - o.z));
        const right = new THREE.Vector3(-(n.z - o.z), 0, n.x - o.x).normalize();
        spot.addScaledVector(right, l.width / 2 - 1.1);  // am rechten Fahrbahnrand parken
        break;
      }
    }
    this.car.damage = 0;
    this.car.placeAt(spot, heading, this.city);
  }

  private useAtm(): void {
    if (!this.wallet.withdraw(2000, this.clock.getDate())) { this.ui.toast('Abhebung abgelehnt – Kontostand zu niedrig.'); return; }
    this.ui.toast(`Bancomat: ${formatLuf(2000)} abgehoben`);
  }

  private checkAnsweringMachine(): void {
    const msgs = this.phoneNet.unheardMessages(NUMBERS.home);
    if (!msgs.length) { this.ui.dialogue(DIALOGUE02.machineEmpty); return; }
    const ids = msgs.map((m) => m.dialogueId);
    this.phoneNet.markAllHeard(NUMBERS.home);
    const lines = ids.includes('DLG_JANG_GARAGE') ? DIALOGUE02.jangMessage : DIALOGUE02.machineEmpty;
    this.ui.dialogue(lines, () => { for (const id of ids) this.m02.onMessageHeard(id); });
  }

  // ---------- Spielstart ----------
  newGame(): void {
    this.ui.show('hud', true);
    this.running = true;
    this.m01.start();
  }

  activeController(): MissionController | null {
    for (const c of this.controllers) if (this.missions.getState(c.id) === 'Active') return c;
    return null;
  }

  // ---------- Fahrzeuge ----------
  enterVehicle(v: Vehicle): void {
    const d = this.drivables.find((x) => x.v === v);
    if (!d) return;
    if (!d.canEnter()) { this.ui.toast(v === this.car ? 'Abgeschlossen. Den Schlüssel hat Madame Weis.' : 'Abgeschlossen.'); return; }
    const go = () => {
      this.mode = 'drive';
      this.veh = v;
      this.player.root.visible = false;
      this.camYaw = v.heading;
      this.ui.show('speedo', true);
      this.ui.show('carinfo', true);
      if (v === this.car) this.m01.onCarEntered();
    };
    if (v === this.car && !d.introSeen) { d.introSeen = true; this.ui.dialogue(DIALOGUE.car, go); } else go();
  }

  leaveVehicle(force = false): void {
    const v = this.veh;
    if (!v) return;
    if (!force && v.kmh > 8) { this.ui.toast('Erst anhalten.'); return; }
    v.speed = 0;
    this.mode = 'walk';
    const f = v.forward();
    const left = new THREE.Vector3(f.z, 0, -f.x);
    this.pos.copy(v.pos).addScaledVector(left, v.model.width / 2 + 0.6);
    this.city.collision.resolve(this.pos, 0.35, this.pos.y);
    this.pos.y = this.city.surfaceAt(this.pos.x, this.pos.z, v.pos.y + 1);
    this.heading = v.heading;
    this.veh = null;
    this.player.root.visible = true;
    this.ui.show('speedo', false);
    this.ui.show('carinfo', false);
  }

  // ---------- Telefonzelle ----------
  private setupPhoneUI(): void {
    const keys = document.getElementById('pkeys')!;
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']) {
      const b = document.createElement('button');
      b.textContent = k;
      b.onclick = () => this.phoneKey(k);
      keys.appendChild(b);
    }
    const coins = document.getElementById('pcoins')!;
    for (const c of COINS) {
      const b = document.createElement('button');
      b.textContent = `${c} F`;
      b.onclick = () => this.insertCoin(c);
      coins.appendChild(b);
    }
    (document.querySelector('#pactions .call') as HTMLButtonElement).onclick = () => this.placeCall();
    (document.querySelector('#pactions .hang') as HTMLButtonElement).onclick = () => this.closePhone();
    window.addEventListener('keydown', (e) => {
      if (!this.ui.isOpen('phone')) return;
      if (/^Digit[0-9]$/.test(e.code)) this.phoneKey(e.code.slice(5));
      else if (/^Numpad[0-9]$/.test(e.code)) this.phoneKey(e.code.slice(6));
      else if (e.code === 'Backspace') { this.dialed = this.dialed.slice(0, -1); this.renderPhone(); }
      else if (e.code === 'Enter' || e.code === 'NumpadEnter') this.placeCall();
      else if (e.code === 'Escape') this.closePhone();
    });
  }

  private openPhone(): void {
    this.session = new PayphoneSession(PAYPHONE_TARIFF);
    this.dialed = '';
    this.ui.show('phone', true);
    this.input.enabled = false;
    document.exitPointerLock?.();
    this.renderPhone('Hörer abgenommen.\nMünzen einwerfen und wählen.');
  }

  private closePhone(): void {
    if (this.session) {
      const back = this.session.hangup();
      if (back > 0) this.wallet.receiveCash(back, this.clock.getDate(), 'Telefonzelle: Rückgeld');
    }
    this.session = null;
    this.ui.show('phone', false);
    this.input.enabled = true;
  }

  private phoneKey(k: string): void {
    if (this.dialed.length < 12) this.dialed += k;
    this.renderPhone();
  }

  private insertCoin(c: number): void {
    if (!this.session) return;
    if (!this.wallet.payCash(c, this.clock.getDate(), 'Telefonzelle')) { this.renderPhone('Nicht genug Bargeld.'); return; }
    if (!this.session.insertCoins(c)) { this.wallet.receiveCash(c, this.clock.getDate(), 'Münze zurück'); this.renderPhone('Münze fällt durch.'); return; }
    this.renderPhone();
  }

  private renderPhone(msg?: string): void {
    const credit = this.session?.getCredit() ?? 0;
    document.getElementById('pdisplay')!.textContent = `${msg ? msg + '\n' : ''}Guthaben: ${credit} F\nNr.: ${this.dialed || '—'}`;
  }

  private placeCall(): void {
    if (!this.session) return;
    if (!this.dialed) { this.renderPhone('Bitte Nummer wählen.'); return; }
    if (!this.session.tick(0.01)) { this.renderPhone(`Bitte mindestens ${PAYPHONE_TARIFF.pricePerUnit} F einwerfen.`); return; }
    const num = normalizeNumber(this.dialed);
    const d = this.clock.getDate(), h = this.clock.getHour();
    const result = this.phoneNet.dial(num, d, h);
    this.session.tick(60);  // ein Gespraech dauert etwa eine Spielminute
    const finish = () => { this.closePhone(); };
    this.ui.show('phone', false);
    this.input.enabled = true;  // Dialog muss per Taste weiterklickbar sein
    const is = (n: string) => num === normalizeNumber(n);
    if (result === 'InvalidNumber') { this.ui.dialogue(DIALOGUE.invalid, finish); return; }
    if (result === 'Busy') { this.ui.dialogue(DIALOGUE.busy, finish); return; }
    if (result === 'NoAnswer') {
      if (is(NUMBERS.home)) { this.ui.dialogue([{ who: 'Äntwerter', lb: 'Hei ass den Uschloss Kremer. Schwätzt w.e.g. nom Piip.', de: 'Hier ist der Anschluss Kremer. Bitte sprechen Sie nach dem Piepton.', fr: 'Vous êtes chez Kremer. Parlez après le bip.', en: 'You’ve reached Kremer. Please speak after the beep.' }], finish); return; }
      this.ui.dialogue(DIALOGUE.noAnswer, finish);
      return;
    }
    if (is(NUMBERS.jang)) {
      if (this.m01.current() === 'call_friend') {
        this.ui.dialogue(DIALOGUE.callJang, () => { this.missions.completeObjective(M01_ID, 'call_friend'); finish(); });
      } else if (this.m02.current() === 'listen_message') {
        this.ui.dialogue([{ who: 'Jang', lb: 'Ech hunn dir eppes op den Äntwerter geschwat – lauschter et der doheem no!', de: 'Ich habe dir etwas auf den Anrufbeantworter gesprochen – hör es dir zu Hause an!', fr: 'Je t’ai laissé un message sur le répondeur – écoute-le chez toi !', en: 'I left you a message on the answering machine – listen to it at home!' }], finish);
      } else {
        this.ui.dialogue([{ who: 'Jang', lb: 'Jo? … Ah, du bass et. Alles kloer bei dir?', de: 'Ja? … Ah, du bist es. Alles klar bei dir?', fr: 'Oui ? … Ah, c’est toi. Tout va bien ?', en: 'Yes? … Oh, it’s you. All good?' }], finish);
      }
      return;
    }
    if (is(NUMBERS.time)) { this.ui.dialogue([timeAnnouncement(this.clock.getHour(), this.clock.getMinute())], finish); return; }
    if (is(NUMBERS.taxi)) { this.ui.dialogue(DIALOGUE.taxi, finish); return; }
    if (is(NUMBERS.pizza)) { this.ui.dialogue(DIALOGUE.pizza, finish); return; }
    if (is(NUMBERS.weis)) { this.ui.dialogue([{ who: 'Madame Weis', lb: 'Weis Immobilien, moien. Kommt einfach laanscht, Avenue de la Liberté.', de: 'Weis Immobilien, guten Tag. Kommen Sie einfach vorbei, Avenue de la Liberté.', fr: 'Weis Immobilier, bonjour. Passez donc, avenue de la Liberté.', en: 'Weis Real Estate, hello. Just drop by, Avenue de la Liberté.' }], finish); return; }
    if (is(NUMBERS.garage)) { this.ui.dialogue([{ who: 'Garage Muller', lb: 'Garage Muller. … Kommt laanscht, um Telefon maachen ech keng Rendez-vousen.', de: 'Garage Muller. … Kommen Sie vorbei, am Telefon mache ich keine Termine.', fr: 'Garage Muller. … Passez, je ne prends pas de rendez-vous au téléphone.', en: 'Garage Muller. … Come by, I don’t make appointments over the phone.' }], finish); return; }
    if (is(NUMBERS.parts)) { this.ui.dialogue([{ who: 'Autosdeeler Wagner', lb: 'Wagner, moien. Bremsbeleeg? Hunn ech um Lager.', de: 'Wagner, guten Tag. Bremsbeläge? Habe ich auf Lager.', fr: 'Wagner, bonjour. Des plaquettes ? J’en ai en stock.', en: 'Wagner, hello. Brake pads? Got them in stock.' }], finish); return; }
    this.ui.dialogue(DIALOGUE.noAnswer, finish);
  }

  // ---------- Notizbuch ----------
  toggleNotebook(): void {
    const open = !this.ui.isOpen('notebook');
    this.ui.show('notebook', open);
    this.input.enabled = !open;
    if (open) { document.exitPointerLock?.(); this.mapView.cx = this.activePos().x; this.mapView.cz = this.activePos().z; this.renderNotebook(); }
  }

  private renderNotebook(): void {
    const body = this.ui.notebookBody();
    const L = this.ui.lang;
    if (this.nbPage === 'notes') {
      const missionsHtml = this.controllers.map((c) => c.notes(L)).join('');
      const freeRoam = !this.activeController() ? `<p>${this.m02.objectiveText(L) ?? ''}</p>` : '';
      const hist = this.wallet.getHistory().slice(-6).reverse().map((t) => `<div class="small">${toIso(t.date)} · ${t.memo} · ${formatLuf(t.amount)}</div>`).join('');
      const rep = `<div class="small" style="margin-top:10px">Ruf: ${this.reputation >= 0 ? '+' : ''}${this.reputation}${this.flags['career.mechanic'] === 'job_offer' ? ' · Stellenangebot: Garage Muller, Montag 8 Uhr' : ''}</div>`;
      body.innerHTML = `${missionsHtml}${freeRoam}${rep}<h3 style="margin-top:18px">AUSGABEN &amp; EINNAHMEN</h3>${hist || '<div class="small">—</div>'}`;
    } else if (this.nbPage === 'contacts') {
      const rows = PHONEBOOK.map((e) => `<tr><td>${e.name}</td><td>${e.number}</td><td class="small">${e.address}</td></tr>`).join('');
      body.innerHTML = `<h3>TELEFONBUCH (Auszug)</h3><table>${rows}</table><p class="small">Alle Einträge sind erfunden. Ortsgespräche aus der Telefonzelle: Münzen einwerfen, Nummer wählen. Zeitansage: ${NUMBERS.time}.</p>`;
    } else if (this.nbPage === 'map') {
      body.innerHTML = '<canvas id="mapcanvas"></canvas>';
      this.drawNotebookMap();
    } else if (this.nbPage === 'calendar') {
      const d = this.clock.getDate();
      const names = ['Méindeg', 'Dënschdeg', 'Mëttwoch', 'Donneschdeg', 'Freideg', 'Samschdeg', 'Sonndeg'];
      body.innerHTML = `<h3>KALENNER 1998</h3><div>Haut: ${names[dayOfWeek(d)]}, ${d.day}.${d.month}.${d.year}</div>
        <div class="small" style="margin-top:12px">Sommerzeit 1998: 29. März bis 25. Oktober · Nationalfeiertag: 23. Juni · Schueberfouer: Termin 1998 wird noch recherchiert.<br/>Bezahlt wird in Luxemburger Franken (LUF). Der Euro kommt erst 1999 als Buchgeld und 2002 als Bargeld.</div>`;
    } else {
      body.innerHTML = `<h3>IWWER D’SPILL</h3>
        <div class="small">Browser-Fassung von „LUXEMBOURG 1998 – Echoes of a City“. Die Spiellogik (Kalender, Uhr, Sonnenstand, Geld, Missionen, Telefon, Spielstände) ist dieselbe wie im Unreal-Projekt und automatisch getestet; die Missionsdaten teilen sich beide Fassungen.<br/><br/>
        Karte: OpenStreetMap-Mitwirkende (ODbL). Höhen: EU-DEM v1.1. Die Gebäude zeigen die Stadt von heute; Straßenbahn, heutige Baustellen und die Radweg-Passerelle unter dem Pont Adolphe sind entfernt. Fassaden, Farben, Autos und Kleidung sind zeittypische Annäherungen (Kategorie C/D), noch nicht historisch belegt. Alle Personen und Firmen sind erfunden.<br/><br/>
        Sonnenstand: berechnet für Luxemburg am jeweiligen Spieltag. 12 reale Minuten = 1 Spielstunde (T beschleunigt).</div>`;
    }
  }

  private drawNotebookMap(): void {
    const c = document.getElementById('mapcanvas') as HTMLCanvasElement | null;
    if (!c) return;
    const p = this.activePos();
    const marks = this.controllers.flatMap((ctl) => ctl.mapMarks());
    marks.push({ x: this.homeDoor.x, z: this.homeDoor.z, label: 'Heem', done: true });
    drawMap(c, this.city, { x: p.x, z: p.z, heading: this.veh ? this.veh.heading : this.heading }, marks, this.mapView);
  }

  private setupMapControls(): void {
    // Notizbuch mit Tab/J/Esc schliessen (die Spielsteuerung ist waehrenddessen gesperrt)
    window.addEventListener('keydown', (e) => {
      if (!this.ui.isOpen('notebook') || !['Tab', 'KeyJ', 'Escape'].includes(e.code)) return;
      e.preventDefault();
      this.toggleNotebook();
    });
    let drag: { x: number; y: number } | null = null;
    const body = this.ui.notebookBody();
    body.addEventListener('mousedown', (e) => { if ((e.target as HTMLElement).id === 'mapcanvas') drag = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup', () => { drag = null; });
    window.addEventListener('mousemove', (e) => {
      if (!drag) return;
      this.mapView.cx -= (e.clientX - drag.x) / this.mapView.scale;
      this.mapView.cz -= (e.clientY - drag.y) / this.mapView.scale;
      drag = { x: e.clientX, y: e.clientY };
      this.drawNotebookMap();
    });
    body.addEventListener('wheel', (e) => {
      if ((e.target as HTMLElement).id !== 'mapcanvas') return;
      e.preventDefault();
      this.mapView.scale = THREE.MathUtils.clamp(this.mapView.scale * (e.deltaY < 0 ? 1.15 : 0.87), 0.12, 4);
      this.drawNotebookMap();
    }, { passive: false });
  }

  activePos(): THREE.Vector3 { return this.veh ? this.veh.pos : this.pos; }

  // ---------- Speichern ----------
  save(): boolean {
    const data: SaveData = {
      'clock.std_date': toIso(this.clock.getStandardDate()),
      'clock.std_hour': String(this.clock.getStandardHour()),
      'money.cash': String(this.wallet.getCash()),
      'money.bank': String(this.wallet.getBank()),
      'player.in_car': this.veh === this.car ? '1' : '0',
      'player.location': `${this.activePos().x},${this.activePos().y},${this.activePos().z}`,
      'player.yaw': String(this.heading),
      'player.reputation': String(this.reputation),
      'car.location': `${this.car.pos.x},${this.car.pos.y},${this.car.pos.z}`,
      'car.heading': String(this.car.heading),
      'car.damage': String(this.car.damage),
      'car.fuel': String(this.car.fuel),
      'car.locked': this.car.locked ? '1' : '0',
      'car.intro': this.drivables[0].introSeen ? '1' : '0',
      'world.rain': this.env.raining ? '1' : '0',
      ...Object.fromEntries(Object.entries(this.flags).map(([k, v]) => [`flag.${k}`, v])),
      ...this.missions.serialize(),
    };
    for (const c of this.controllers) Object.assign(data, c.save());
    try {
      const r = writeSaveToStorage(window.localStorage, SAVE_KEY, data);
      this.ui.toast(r.ok ? 'Gespeichert.' : `Speichern fehlgeschlagen: ${r.error}`);
      return r.ok;
    } catch {
      this.ui.toast('Speichern nicht möglich (Browser-Speicher gesperrt).');
      return false;
    }
  }

  static hasSave(): boolean {
    try { return !!window.localStorage.getItem(SAVE_KEY); } catch { return false; }
  }

  load(): boolean {
    let res;
    try { res = readSaveFromStorage(window.localStorage, SAVE_KEY); } catch { this.ui.toast('Browser-Speicher gesperrt.'); return false; }
    if (!res.data) { this.ui.toast('Kein lesbarer Spielstand.'); return false; }
    const d = res.data;
    const vec = (s: string | undefined) => { const p = (s ?? '').split(',').map(Number); return p.length === 3 && p.every(Number.isFinite) ? new THREE.Vector3(p[0], p[1], p[2]) : null; };
    const date: LuxDate | null = fromIso(d['clock.std_date'] ?? '');
    if (date) {
      const std = Number(d['clock.std_hour']);
      this.clock.setDateTime(date, std + (isSummerTime(date, Math.floor(std)) ? 1 : 0));
    }
    this.wallet = new Wallet(Math.round(Number(d['money.cash']) || 0), Math.round(Number(d['money.bank']) || 0));
    this.registerMissions();
    this.missions.deserialize(d);
    this.reputation = Number(d['player.reputation'] ?? 0) || 0;
    this.flags = {};
    for (const [k, v] of Object.entries(d)) if (k.startsWith('flag.')) this.flags[k.slice(5)] = v;
    // Spielstaende aus Version 1 (nur Mission 01): Autoschluessel-Flag uebernehmen
    const legacyKey = d['flags.car_key'];
    this.car.locked = legacyKey !== undefined ? legacyKey !== '1' : d['car.locked'] !== '0';
    this.drivables[0].introSeen = d['car.intro'] === '1' || d['flags.car_intro'] === '1';
    this.env.setRain(d['world.rain'] === '1');
    if (this.veh) this.leaveVehicle(true);
    const cp = vec(d['car.location']);
    if (cp) this.car.placeAt(cp, Number(d['car.heading']) || 0, this.city);
    this.car.damage = Number(d['car.damage']) || 0;
    this.car.fuel = Number(d['car.fuel']) || this.car.fuel;
    for (const c of this.controllers) c.load(d);
    // Aeltere Staende: Mission 01 fertig, Mission 02 noch nicht gestartet
    this.missions.refresh(this.clock.getDate());
    if (this.missions.getState(M01_ID) === 'Succeeded' && this.missions.getState(M02_ID) === 'Available') this.missions.start(M02_ID);
    const pp = vec(d['player.location']);
    if (pp) this.pos.copy(pp);
    this.heading = Number(d['player.yaw']) || 0;
    if (d['player.in_car'] === '1' || d['player.mode'] === 'drive') { this.drivables[0].introSeen = true; this.enterVehicle(this.car); }
    this.ui.show('hud', true);
    this.running = true;
    this.ui.toast(res.usedBackup ? 'Spielstand war beschädigt – Sicherungskopie geladen.' : 'Spielstand geladen.');
    return true;
  }

  // ---------- Hauptschleife ----------
  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start(): void {
    const loop = () => {
      requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
      this.frameTimes.push(now - this.lastFrame);
      if (this.frameTimes.length > 120) this.frameTimes.shift();
      this.lastFrame = now;
      this.tick(dt);
    };
    requestAnimationFrame(loop);
  }

  private get blocked(): boolean {
    return this.ui.isOpen('phone') || this.ui.inChoice || this.ui.inWorkshop || this.ui.isOpen('notebook');
  }

  tick(dt: number): void {
    const inp = this.input;
    inp.pollPadButtons();
    if (this.running && !this.ui.isOpen('pause')) {
      if (this.ui.inDialogue) {
        if (inp.consume('interact') || inp.consume('jump')) this.ui.advanceDialogue();
      } else if (!this.blocked) {
        this.handleKeys();
        this.clock.advance(dt);
        if (this.mode === 'walk') this.updateWalk(dt); else this.updateDrive(dt);
        this.updateInteract();
        for (const c of this.controllers) c.update(dt);
      }
    }
    this.traffic.update(dt, this.camera.position, this.veh ? this.veh.pos : null, this.pos, this.env.night > 0.5);
    this.env.update(this.clock, this.activePos(), this.camera, this.running ? dt : 0);
    this.city.setNight(this.env.night);
    this.city.setWet(this.env.wetness);
    for (const d of this.drivables) if (d.v !== this.veh) d.v.lights = false;
    this.updateCamera(dt);
    this.updateHud();
    // NPCs mit Missionsrolle stehen und schauen zum Spieler
    for (const npc of this.npcs) {
      const p = npc.root.position;
      npc.root.rotation.y = Math.atan2(this.pos.x - p.x, this.pos.z - p.z);
    }
    const target = this.activeController()?.target() ?? null;
    this.marker.visible = this.navHelp && !!target;
    if (target) this.marker.position.copy(target);
    this.renderer.render(this.scene, this.camera);
  }

  private handleKeys(): void {
    const inp = this.input;
    if (inp.consume('notebook')) this.toggleNotebook();
    if (inp.consume('view')) this.firstPerson = !this.firstPerson;
    if (inp.consume('nav')) { this.navHelp = !this.navHelp; this.ui.toast(this.navHelp ? 'Navigationshilfe an' : 'Navigationshilfe aus'); }
    if (inp.consume('rain')) this.ui.toast(this.env.toggleRain() ? 'Es beginnt zu regnen.' : 'Der Regen lässt nach.');
    if (inp.consume('time')) {
      this.timeIdx = (this.timeIdx + 1) % this.timeScales.length;
      this.clock.setTimeScale(this.timeScales[this.timeIdx]);
      this.ui.toast(`Zeit ×${this.timeScales[this.timeIdx] / 5}`);
    }
    if (inp.consume('lights') && this.veh) this.veh.lights = !this.veh.lights;
    if (inp.consume('save')) this.save();
    if (inp.consume('load')) this.load();
    if (inp.consume('pause')) this.setPaused(true);
  }

  setPaused(p: boolean): void {
    this.ui.show('pause', p);
    if (p) document.exitPointerLock?.();
  }

  private updateWalk(dt: number): void {
    const inp = this.input;
    const [mx, my] = inp.takeMouse();
    this.camYaw -= mx * 0.0025;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + my * 0.0022, -0.9, 1.2);
    const fwd = inp.axis('back', 'forward'), side = inp.axis('left', 'right');
    const sprint = inp.held('sprint');
    const speed = sprint ? 6.2 : 3.4;
    const move = new THREE.Vector3();
    if (fwd || side) {
      const f = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
      const r = new THREE.Vector3(-f.z, 0, f.x);
      move.addScaledVector(f, fwd).addScaledVector(r, side);
      if (move.lengthSq() > 1) move.normalize();
      const want = Math.atan2(-move.x, -move.z);
      let dh = want - this.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      this.heading += dh * Math.min(1, dt * 10);
      if (this.firstPerson) this.heading = this.camYaw;
    }
    this.pos.addScaledVector(move, speed * dt);
    const t = this.city.terrain;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, t.x0 + 3, t.maxX - 3);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, t.z0 + 3, t.maxZ - 3);
    this.city.collision.resolve(this.pos, 0.35, this.pos.y);
    const ground = this.city.surfaceAt(this.pos.x, this.pos.z, this.pos.y + 0.6);
    const onGround = this.pos.y <= ground + 0.05;
    if (onGround && inp.held('jump') && this.vy <= 0) this.vy = 4.3;
    this.vy -= 9.81 * dt;
    this.pos.y += this.vy * dt;
    if (this.pos.y < ground) { this.pos.y = ground; this.vy = 0; }
    this.player.root.position.copy(this.pos);
    this.player.root.rotation.y = this.heading + Math.PI;
    const moving = move.lengthSq() > 0.01;
    this.walkPhase += dt * speed * (moving ? 2.6 : 0);
    animateWalk(this.player, this.walkPhase, moving ? (sprint ? 1.2 : 0.8) : 0);
    this.player.root.visible = !this.firstPerson;
  }

  private updateDrive(dt: number): void {
    const v = this.veh;
    if (!v) { this.mode = 'walk'; return; }
    const inp = this.input;
    const [mx, my] = inp.takeMouse();
    this.camYaw -= mx * 0.0025;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + my * 0.0022, -0.3, 1.0);
    const throttle = inp.axis('back', 'forward');
    const steer = -inp.axis('left', 'right');
    const res = v.drive(dt, throttle, steer, inp.held('jump'), this.city);
    if (res.impact > 6) this.ui.toast(`Aufprall! Zustand ${Math.round(100 - v.damage)} %`);
    // Kamera folgt der Fahrtrichtung, wenn die Maus ruht
    if (Math.abs(mx) < 1 && Math.abs(v.speed) > 2) {
      let dh = v.heading - this.camYaw;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      this.camYaw += dh * Math.min(1, dt * 2.5);
    }
    if (this.env.night > 0.6 && !v.lights && v.kmh > 5) v.lights = true;
    this.pos.copy(v.pos);
    const other = this.traffic.carNear(v.pos, 3.2);
    if (other && v.kmh > 10) {
      v.damage = Math.min(100, v.damage + v.kmh * 0.15);
      v.speed *= -0.2;
      this.ui.toast('Unfall! Der andere Fahrer schimpft auf Luxemburgisch.');
    }
    // eigene Autos untereinander
    for (const d of this.drivables) {
      if (d.v === v) continue;
      const dist = d.v.pos.distanceTo(v.pos);
      if (dist < 3.4 && v.kmh > 3) {
        const push = new THREE.Vector3().subVectors(v.pos, d.v.pos).setY(0).normalize().multiplyScalar(3.4 - dist);
        v.pos.add(push);
        if (v.kmh > 10) { v.damage = Math.min(100, v.damage + v.kmh * 0.12); d.v.damage = Math.min(100, d.v.damage + v.kmh * 0.12); }
        v.speed *= -0.2;
      }
    }
    if (v.fuel <= 0) this.ui.toast('Tank leer.');
  }

  private updateInteract(): void {
    const inp = this.input;
    if (this.mode === 'drive') {
      this.ui.prompt(this.veh && this.veh.kmh < 8 ? 'Aussteigen' : null);
      if (inp.consume('interact')) this.leaveVehicle();
      return;
    }
    let best: Interactable | null = null, bestD = Infinity;
    for (const it of this.interactables) {
      const d = it.pos.distanceTo(this.pos);
      if (d < it.radius && d < bestD && it.label()) { best = it; bestD = d; }
    }
    this.ui.prompt(best ? best.label() : null);
    if (inp.consume('interact') && best) best.act();
  }

  private updateCamera(dt: number): void {
    const cam = this.camera;
    const v = this.veh;
    if (!v) {
      const head = this.pos.clone().add(new THREE.Vector3(0, 1.62, 0));
      if (this.firstPerson) {
        cam.position.copy(head);
        cam.rotation.order = 'YXZ';
        cam.rotation.set(-this.camPitch * 0.8, this.camYaw, 0);
        return;
      }
      const dist = 4.2;
      const off = new THREE.Vector3(Math.sin(this.camYaw) * Math.cos(this.camPitch), Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch)).multiplyScalar(dist);
      const want = head.clone().add(off);
      const probe = { x: want.x, z: want.z };
      this.city.collision.resolve(probe, 0.3, want.y - 1);
      want.x = probe.x; want.z = probe.z;
      want.y = Math.max(want.y, this.city.terrain.heightAt(want.x, want.z) + 0.5);
      cam.position.lerp(want, Math.min(1, dt * 12));
      cam.lookAt(head);
    } else {
      if (this.firstPerson) {
        const f = v.forward();
        const seat = v.pos.clone().add(new THREE.Vector3(0, 1.22, 0)).addScaledVector(f, -0.1).addScaledVector(new THREE.Vector3(f.z, 0, -f.x), 0.36);
        cam.position.copy(seat);
        cam.rotation.order = 'YXZ';
        cam.rotation.set(-0.06 - (this.camPitch - 0.25) * 0.5, this.camYaw, 0);
        return;
      }
      const dist = 7.5 + v.kmh * 0.02;
      const off = new THREE.Vector3(Math.sin(this.camYaw) * Math.cos(this.camPitch * 0.6), 0.28 + Math.sin(this.camPitch * 0.6), Math.cos(this.camYaw) * Math.cos(this.camPitch * 0.6)).multiplyScalar(dist);
      const target = v.pos.clone().add(new THREE.Vector3(0, 1.3, 0));
      const want = target.clone().add(off);
      want.y = Math.max(want.y, this.city.terrain.heightAt(want.x, want.z) + 0.8);
      cam.position.lerp(want, Math.min(1, dt * 8));
      cam.lookAt(target);
    }
  }

  private updateHud(): void {
    const scale = this.clock.getTimeScale() / 5;
    this.ui.setClock(this.clock.toString(), scale !== 1 ? `Zeit ×${scale}` : '');
    this.ui.setMoney(formatLuf(this.wallet.getCash()), formatLuf(this.wallet.getBank()));
    const ctl = this.activeController();
    this.ui.setObjective(ctl?.objectiveText(this.ui.lang) ?? this.m02.objectiveText(this.ui.lang) ?? '');
    const v = this.veh;
    if (v) {
      const name = this.drivables.find((d) => d.v === v)?.name ?? '';
      this.ui.drawSpeedo(v.kmh, v.fuel / v.spec.tankLiters, v.damage, `${name} · ${v.spec.name}`, v.lights);
    }
  }
}
