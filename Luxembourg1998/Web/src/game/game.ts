import * as THREE from 'three';
import { GameClock, fromIso, toIso, isSummerTime, dayOfWeek, type LuxDate } from '../core/calendar';
import { PayphoneSession, PhoneBook, PhoneNetwork, normalizeNumber } from '../core/comms';
import { Wallet, formatLuf } from '../core/economy';
import { MissionTracker } from '../core/missions';
import { readSaveFromStorage, writeSaveToStorage, type SaveData } from '../core/save';
import { buildCity, type City } from '../world/city';
import { pointInPolygon } from '../world/terrain';
import type { WorldData } from '../world/types';
import { Environment } from './environment';
import { Input } from './input';
import { animateWalk, makeMarker, makePerson, makePhoneBooth, type PersonModel } from './models';
import { COINS, DIALOGUE, M01, NUMBERS, OBJECTIVE_TEXT, PAYPHONE_TARIFF, PHONEBOOK, START, START_MONEY, timeAnnouncement, type Lang } from './story';
import { Traffic } from './traffic';
import { UI, drawMap } from './ui';
import { Vehicle } from './vehicle';

export type Quality = 'high' | 'low';
const SAVE_KEY = 'lux98.slot1';
const MISSION = M01.id;
const ORDER = M01.objectives.map((o) => o.id);

interface Interactable { pos: THREE.Vector3; radius: number; label: () => string | null; act: () => void }

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

  // Spieler
  readonly player: PersonModel;
  readonly pos = new THREE.Vector3();
  private vy = 0;
  heading = 0;
  private walkPhase = 0;
  mode: 'walk' | 'drive' = 'walk';
  firstPerson = false;
  camYaw = 0;
  camPitch = 0.25;
  readonly car: Vehicle;
  hasCarKey = false;
  carIntroSeen = false;
  navHelp = false;
  running = false;
  private timeScales = [5, 30, 120];
  private timeIdx = 0;
  private interactables: Interactable[] = [];
  private booths: THREE.Vector3[] = [];
  private weis: PersonModel;
  private jang: PersonModel;
  private marker = makeMarker();
  private session: PayphoneSession | null = null;
  private dialed = '';
  private nbPage = 'notes';
  private mapView = { cx: 0, cz: 600, scale: 0.5 };
  private lastFrame = performance.now();
  frameTimes: number[] = [];

  constructor(canvas: HTMLCanvasElement, world: WorldData, readonly quality: Quality, lang: Lang) {
    this.ui.lang = lang;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(quality === 'high' ? Math.min(window.devicePixelRatio, 2) : 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.input = new Input(canvas);
    this.city = buildCity(world, this.scene, { trees: quality === 'high' ? 2500 : 700 });
    this.env = new Environment(this.scene, this.renderer, quality === 'high');
    this.traffic = new Traffic(this.city, this.scene, quality === 'high' ? 22 : 10, quality === 'high' ? 55 : 22);

    this.player = makePerson(1, { jacket: 0x5a4632 });
    this.scene.add(this.player.root);
    this.car = new Vehicle(4, 0, 0xb8bcc0);  // silberne Limousine des Onkels
    this.scene.add(this.car.model.root);
    this.weis = makePerson(31, { jacket: 0x7a2f3a });
    this.jang = makePerson(57, { jacket: 0x2f4a7a });
    this.scene.add(this.weis.root, this.jang.root, this.marker);
    this.marker.visible = false;

    for (const e of PHONEBOOK) this.phoneBook.add(e);
    this.phoneNet = new PhoneNetwork(this.phoneBook);
    // Jang ist morgens zu Hause erreichbar; Madame Weis im Buero Mo-Sa 8-18 Uhr (fiktive Tagesablaeufe)
    this.phoneNet.setAnswerRule(NUMBERS.weis, (d, h) => dayOfWeek(d) < 6 && h >= 8 && h < 18);

    this.placeActors();
    this.setupPhoneUI();
    this.ui.bindNotebook((p) => { this.nbPage = p; this.renderNotebook(); });
    this.setupMapControls();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  // ---------- Aufbau ----------
  private openSpot(target: THREE.Vector3, preferRoad = false): THREE.Vector3 {
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

  private placeActors(): void {
    const P = this.city.places;
    const gare = P.gare ?? new THREE.Vector3(320, 289, 1300);
    // Bahnhofsvorplatz liegt noerdlich des Bahnhofs
    const forecourt = this.openSpot(gare.clone().add(new THREE.Vector3(-10, 0, -45)));
    this.pos.copy(forecourt);
    this.heading = 0;
    this.camYaw = 0;
    const boothSpots = [forecourt.clone().add(new THREE.Vector3(12, 0, -8)), P.place_de_metz, P.place_guillaume].filter(Boolean) as THREE.Vector3[];
    for (const s of boothSpots) {
      const spot = this.openSpot(s.clone().add(new THREE.Vector3(3, 0, 3)));
      spot.x += 2.2; spot.y = this.city.surfaceAt(spot.x, spot.z, spot.y + 1);
      const booth = makePhoneBooth();
      booth.position.copy(spot);
      this.scene.add(booth);
      this.city.collision.addFootprint([[spot.x - 0.55, spot.z - 0.55], [spot.x + 0.55, spot.z - 0.55], [spot.x + 0.55, spot.z + 0.55], [spot.x - 0.55, spot.z + 0.55]], spot.y, spot.y + 2.5);
      this.booths.push(spot);
      this.interactables.push({ pos: spot, radius: 2.4, label: () => (this.mode === 'walk' ? 'Telefonieren' : null), act: () => this.openPhone() });
    }
    const weisSpot = this.openSpot(P.avenue_liberte ?? gare);
    this.weis.root.position.copy(weisSpot);
    this.interactables.push({
      pos: weisSpot, radius: 2.2,
      label: () => (this.mode === 'walk' ? 'Mat der Madame Weis schwätzen' : null),
      act: () => this.talkWeis(),
    });
    const jangSpot = this.openSpot(P.place_darmes ?? new THREE.Vector3(-58, 315, 64));
    this.jang.root.position.copy(jangSpot);
    this.interactables.push({ pos: jangSpot, radius: 2.4, label: () => (this.mode === 'walk' ? 'Mam Jang schwätzen' : null), act: () => this.talkJang() });
    this.resetCar();
    this.interactables.push({
      pos: this.car.pos, radius: 3.2,
      label: () => (this.mode === 'walk' ? (this.hasCarKey ? 'Asteigen' : 'Auto (zougespaart)') : null),
      act: () => this.enterCar(),
    });
  }

  private resetCar(): void {
    const P = this.city.places;
    const spot = this.openSpot(P.place_de_paris ?? new THREE.Vector3(97, 297, 860), true);
    // Fahrtrichtung entlang der naechsten Strasse
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

  // ---------- Spielstart ----------
  newGame(): void {
    this.missions = new MissionTracker();
    this.missions.register(M01);
    this.missions.refresh(this.clock.getDate());
    this.missions.start(MISSION);
    this.ui.show('hud', true);
    this.running = true;
    this.ui.dialogue(DIALOGUE.intro, () => {
      this.missions.completeObjective(MISSION, 'arrive_station');
      this.ui.toast('Notizbuch: Tab · Telefonzelle steht vor dem Bahnhof');
    });
  }

  currentObjective(): string {
    const st = this.missions.getState(MISSION);
    if (st === 'Succeeded') return 'done';
    return ORDER.find((o) => !this.missions.isObjectiveDone(MISSION, o)) ?? 'done';
  }

  private objectiveTarget(): THREE.Vector3 | null {
    switch (this.currentObjective()) {
      case 'call_friend': return this.booths[0] ?? null;
      case 'get_key': return this.weis.root.position;
      case 'find_car': return this.car.pos;
      case 'visit_friend': return this.jang.root.position;
      default: return null;
    }
  }

  // ---------- Interaktionen ----------
  private talkWeis(): void {
    const obj = this.currentObjective();
    if (obj !== 'get_key') {
      this.ui.dialogue([{ who: 'Madame Weis', lb: 'Moien! Kann ech Iech hëllefen?', de: 'Guten Tag! Kann ich Ihnen helfen?', fr: 'Bonjour ! Je peux vous aider ?', en: 'Hello! Can I help you?' }]);
      return;
    }
    const d = this.clock.getDate(), h = this.clock.getHourLocal();
    if (dayOfWeek(d) >= 6 || h < 8 || h >= 18) {
      this.ui.dialogue([{ who: '', lb: 'Op der Dier: „Bureau Méindeg–Samschdeg vun 8 bis 18 Auer.“', de: 'An der Tür: „Büro Montag–Samstag 8 bis 18 Uhr.“', fr: 'Sur la porte : « Bureau du lundi au samedi de 8 h à 18 h. »', en: 'On the door: “Office Monday–Saturday 8 am to 6 pm.”' }]);
      return;
    }
    this.ui.dialogue(DIALOGUE.weis, () => {
      this.missions.completeObjective(MISSION, 'get_key');
      this.hasCarKey = true;
      this.ui.toast('Schlüssel erhalten · Stadtplan im Notizbuch zeigt die Place de Paris');
    });
  }

  private talkJang(): void {
    if (this.currentObjective() !== 'visit_friend') {
      const done = this.missions.getState(MISSION) === 'Succeeded';
      this.ui.dialogue([done
        ? { who: 'Jang', lb: 'Ech ruff dech un, soubal ech eppes vun der Garage héieren.', de: 'Ich ruf dich an, sobald ich von der Werkstatt höre.', fr: 'Je t’appelle dès que j’ai des nouvelles du garage.', en: 'I’ll call you as soon as I hear from the garage.' }
        : { who: 'Jang', lb: 'Ech waarden hei. Hues de de Schlëssel scho bei der Madame Weis geholl?', de: 'Ich warte hier. Hast du den Schlüssel schon bei Madame Weis geholt?', fr: 'J’attends ici. Tu as récupéré la clé chez Madame Weis ?', en: 'I’m waiting here. Did you get the key from Madame Weis yet?' }]);
      return;
    }
    this.ui.dialogue(DIALOGUE.jangMeet, () => {
      this.missions.completeObjective(MISSION, 'visit_friend');
      this.wallet.receiveCash(2000, this.clock.getDate(), 'Jang – Starthilfe');
      this.ui.toast(`Mission erfüllt: „Zeréck an d’Stad“ · +${formatLuf(2000)} · automatisch gespeichert`, 4000);
      this.save();
    });
  }

  private enterCar(): void {
    if (!this.hasCarKey) { this.ui.toast('Abgeschlossen. Den Schlüssel hat Madame Weis.'); return; }
    const go = () => {
      if (this.currentObjective() === 'find_car') this.missions.completeObjective(MISSION, 'find_car');
      this.mode = 'drive';
      this.player.root.visible = false;
      this.camYaw = this.car.heading;
      this.ui.show('speedo', true);
      this.ui.show('carinfo', true);
    };
    if (!this.carIntroSeen) { this.carIntroSeen = true; this.ui.dialogue(DIALOGUE.car, go); } else go();
  }

  private exitCar(): void {
    if (this.car.kmh > 8) { this.ui.toast('Erst anhalten.'); return; }
    this.car.speed = 0;
    this.mode = 'walk';
    const f = this.car.forward();
    const left = new THREE.Vector3(f.z, 0, -f.x);
    this.pos.copy(this.car.pos).addScaledVector(left, this.car.model.width / 2 + 0.6);
    this.city.collision.resolve(this.pos, 0.35, this.pos.y);
    this.pos.y = this.city.surfaceAt(this.pos.x, this.pos.z, this.car.pos.y + 1);
    this.heading = this.car.heading;
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
    if (result === 'InvalidNumber') { this.ui.dialogue(DIALOGUE.invalid, finish); return; }
    if (result === 'Busy') { this.ui.dialogue(DIALOGUE.busy, finish); return; }
    if (result === 'NoAnswer') { this.ui.dialogue(DIALOGUE.noAnswer, finish); return; }
    if (num === normalizeNumber(NUMBERS.jang)) {
      if (this.currentObjective() === 'call_friend') {
        this.ui.dialogue(DIALOGUE.callJang, () => { this.missions.completeObjective(MISSION, 'call_friend'); finish(); });
      } else {
        this.ui.dialogue([{ who: 'Jang', lb: 'Jo? … Ah, du bass et. Mir gesinn eis jo gläich!', de: 'Ja? … Ah, du bist es. Wir sehen uns ja gleich!', fr: 'Oui ? … Ah, c’est toi. On se voit tout à l’heure !', en: 'Yes? … Oh, it’s you. See you shortly!' }], finish);
      }
      return;
    }
    if (num === normalizeNumber(NUMBERS.time)) { this.ui.dialogue([timeAnnouncement(this.clock.getHour(), this.clock.getMinute())], finish); return; }
    if (num === normalizeNumber(NUMBERS.taxi)) { this.ui.dialogue(DIALOGUE.taxi, finish); return; }
    if (num === normalizeNumber(NUMBERS.pizza)) { this.ui.dialogue(DIALOGUE.pizza, finish); return; }
    if (num === normalizeNumber(NUMBERS.weis)) { this.ui.dialogue([{ who: 'Madame Weis', lb: 'Weis Immobilien, moien. Kommt einfach laanscht, Avenue de la Liberté.', de: 'Weis Immobilien, guten Tag. Kommen Sie einfach vorbei, Avenue de la Liberté.', fr: 'Weis Immobilier, bonjour. Passez donc, avenue de la Liberté.', en: 'Weis Real Estate, hello. Just drop by, Avenue de la Liberté.' }], finish); return; }
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
    const cur = this.currentObjective();
    if (this.nbPage === 'notes') {
      const items = ORDER.slice(1).map((o) => {
        const done = this.missions.isObjectiveDone(MISSION, o);
        return `<div class="${done ? 'done' : o === cur ? 'cur' : ''}">${done ? '✓' : o === cur ? '→' : '·'} ${OBJECTIVE_TEXT[o][L]}</div>`;
      }).join('');
      const extra = cur === 'done' ? `<p>${OBJECTIVE_TEXT.done[L]}</p>` : '';
      const hist = this.wallet.getHistory().slice(-6).reverse().map((t) => `<div class="small">${toIso(t.date)} · ${t.memo} · ${formatLuf(t.amount)}</div>`).join('');
      body.innerHTML = `<h3>ZERÉCK AN D’STAD</h3>${items}${extra}<h3 style="margin-top:18px">AUSGABEN</h3>${hist || '<div class="small">—</div>'}`;
    } else if (this.nbPage === 'contacts') {
      const rows = PHONEBOOK.map((e) => `<tr><td>${e.name}</td><td>${e.number}</td><td class="small">${e.address}</td></tr>`).join('');
      body.innerHTML = `<h3>TELEFONBUCH (Auszug)</h3><table>${rows}</table><p class="small">Alle Einträge sind erfunden. Ortsgespräche aus der Telefonzelle: Münzen einwerfen, Nummer wählen.</p>`;
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
        <div class="small">Browser-Fassung von „LUXEMBOURG 1998 – Echoes of a City“. Die Spiellogik (Kalender, Uhr, Sonnenstand, Geld, Missionen, Telefon, Spielstände) ist dieselbe wie im Unreal-Projekt und automatisch getestet.<br/><br/>
        Karte: OpenStreetMap-Mitwirkende (ODbL). Höhen: EU-DEM v1.1. Die Gebäude zeigen die Stadt von heute; Straßenbahn, heutige Baustellen und die Radweg-Passerelle unter dem Pont Adolphe sind entfernt. Fassaden, Farben, Autos und Kleidung sind zeittypische Annäherungen (Kategorie C/D), noch nicht historisch belegt.<br/><br/>
        Sonnenstand: berechnet für Luxemburg am jeweiligen Spieltag. 12 reale Minuten = 1 Spielstunde (T beschleunigt).</div>`;
    }
  }

  private drawNotebookMap(): void {
    const c = document.getElementById('mapcanvas') as HTMLCanvasElement | null;
    if (!c) return;
    const p = this.activePos();
    const marks = [
      { key: 'call_friend', label: 'Telefon', at: this.booths[0] },
      { key: 'get_key', label: 'Mme Weis', at: this.weis.root.position },
      { key: 'find_car', label: 'Auto', at: this.car.pos },
      { key: 'visit_friend', label: 'Jang', at: this.jang.root.position },
    ].filter((m) => m.at && (this.missions.isObjectiveDone(MISSION, m.key) || m.key === this.currentObjective() || ORDER.indexOf(m.key) <= ORDER.indexOf(this.currentObjective()) + 3))
      .map((m) => ({ x: m.at!.x, z: m.at!.z, label: m.label, done: this.missions.isObjectiveDone(MISSION, m.key) }));
    drawMap(c, this.city, { x: p.x, z: p.z, heading: this.mode === 'drive' ? this.car.heading : this.heading }, marks, this.mapView);
  }

  private setupMapControls(): void {
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
      this.mapView.scale = THREE.MathUtils.clamp(this.mapView.scale * (e.deltaY < 0 ? 1.15 : 0.87), 0.15, 4);
      this.drawNotebookMap();
    }, { passive: false });
  }

  activePos(): THREE.Vector3 { return this.mode === 'drive' ? this.car.pos : this.pos; }

  // ---------- Speichern ----------
  save(): boolean {
    const data: SaveData = {
      'clock.std_date': toIso(this.clock.getStandardDate()),
      'clock.std_hour': String(this.clock.getStandardHour()),
      'money.cash': String(this.wallet.getCash()),
      'money.bank': String(this.wallet.getBank()),
      'player.mode': this.mode,
      'player.location': `${this.pos.x},${this.pos.y},${this.pos.z}`,
      'player.yaw': String(this.heading),
      'car.location': `${this.car.pos.x},${this.car.pos.y},${this.car.pos.z}`,
      'car.heading': String(this.car.heading),
      'car.damage': String(this.car.damage),
      'car.fuel': String(this.car.fuel),
      'flags.car_key': this.hasCarKey ? '1' : '0',
      'flags.car_intro': this.carIntroSeen ? '1' : '0',
      'world.rain': this.env.raining ? '1' : '0',
      ...this.missions.serialize(),
    };
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
    this.missions = new MissionTracker();
    this.missions.register(M01);
    this.missions.deserialize(d);
    this.hasCarKey = d['flags.car_key'] === '1';
    this.carIntroSeen = d['flags.car_intro'] === '1';
    this.env.setRain(d['world.rain'] === '1');
    const cp = vec(d['car.location']);
    if (cp) this.car.placeAt(cp, Number(d['car.heading']) || 0, this.city);
    this.car.damage = Number(d['car.damage']) || 0;
    this.car.fuel = Number(d['car.fuel']) || this.car.fuel;
    const pp = vec(d['player.location']);
    if (pp) this.pos.copy(pp);
    this.heading = Number(d['player.yaw']) || 0;
    if (this.mode === 'drive') this.exitCarForce();
    if (d['player.mode'] === 'drive') { this.carIntroSeen = true; this.enterCar(); }
    this.ui.show('hud', true);
    this.running = true;
    this.ui.toast(res.usedBackup ? 'Spielstand war beschädigt – Sicherungskopie geladen.' : 'Spielstand geladen.');
    return true;
  }

  private exitCarForce(): void {
    this.mode = 'walk';
    this.player.root.visible = true;
    this.ui.show('speedo', false);
    this.ui.show('carinfo', false);
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

  tick(dt: number): void {
    const inp = this.input;
    inp.pollPadButtons();
    if (this.running && !this.ui.isOpen('pause')) {
      if (this.ui.inDialogue) {
        if (inp.consume('interact') || inp.consume('jump')) this.ui.advanceDialogue();
      } else if (!this.ui.isOpen('phone')) {
        this.handleKeys();
        this.clock.advance(dt);
        if (this.mode === 'walk') this.updateWalk(dt); else this.updateDrive(dt);
        this.updateInteract();
      }
      // Missionsfehlschlag: Wagen zerstoert -> zurueck zum Checkpoint, Wagen repariert
      if (this.car.damage >= 100 && this.missions.getState(MISSION) === 'Active') {
        this.missions.fail(MISSION, 'car_wrecked');
        this.missions.restartFromCheckpoint(MISSION);
        if (this.mode === 'drive') this.exitCarForce();
        this.resetCar();
        this.ui.toast('Totalschaden. Der Wagen wurde abgeschleppt und repariert – er steht wieder an der Place de Paris.', 5000);
      }
    }
    this.traffic.update(dt, this.camera.position, this.mode === 'drive' ? this.car.pos : null, this.pos, this.env.night > 0.5);
    this.env.update(this.clock, this.activePos(), this.camera, this.running ? dt : 0);
    this.city.setNight(this.env.night);
    this.city.setWet(this.env.wetness);
    this.updateCamera(dt);
    this.updateHud();
    // NPCs mit Missionsrolle stehen und schauen zum Spieler
    for (const npc of [this.weis, this.jang]) {
      const p = npc.root.position;
      npc.root.rotation.y = Math.atan2(this.pos.x - p.x, this.pos.z - p.z);
    }
    const target = this.objectiveTarget();
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
    if (inp.consume('lights') && this.mode === 'drive') this.car.lights = !this.car.lights;
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
    if (this.pos.y < ground) {
      // Treppen und Gefaelle: bis 0,6 m pro Schritt einfach hinauf
      this.pos.y = ground;
      this.vy = 0;
    }
    this.player.root.position.copy(this.pos);
    this.player.root.rotation.y = this.heading + Math.PI;
    const moving = move.lengthSq() > 0.01;
    this.walkPhase += dt * speed * (moving ? 2.6 : 0);
    animateWalk(this.player, this.walkPhase, moving ? (sprint ? 1.2 : 0.8) : 0);
    this.player.root.visible = !this.firstPerson;
  }

  private updateDrive(dt: number): void {
    const inp = this.input;
    const [mx, my] = inp.takeMouse();
    this.camYaw -= mx * 0.0025;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + my * 0.0022, -0.3, 1.0);
    const throttle = inp.axis('back', 'forward');
    const steer = -inp.axis('left', 'right');
    const res = this.car.drive(dt, throttle, steer, inp.held('jump'), this.city);
    if (res.impact > 6) this.ui.toast(`Aufprall! Zustand ${Math.round(100 - this.car.damage)} %`);
    // Kamera folgt der Fahrtrichtung, wenn die Maus ruht
    if (Math.abs(mx) < 1 && Math.abs(this.car.speed) > 2) {
      let dh = this.car.heading - this.camYaw;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      this.camYaw += dh * Math.min(1, dt * 2.5);
    }
    if (this.env.night > 0.6 && !this.car.lights && this.car.kmh > 5) this.car.lights = true;
    this.pos.copy(this.car.pos);
    const other = this.traffic.carNear(this.car.pos, 3.2);
    if (other && this.car.kmh > 10) {
      this.car.damage = Math.min(100, this.car.damage + this.car.kmh * 0.15);
      this.car.speed *= -0.2;
      this.ui.toast('Unfall! Der andere Fahrer schimpft auf Luxemburgisch.');
    }
    if (this.car.fuel <= 0) this.ui.toast('Tank leer.');
  }

  private updateInteract(): void {
    const inp = this.input;
    if (this.mode === 'drive') {
      this.ui.prompt(this.car.kmh < 8 ? 'Aussteigen' : null);
      if (inp.consume('interact')) this.exitCar();
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
    if (this.mode === 'walk') {
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
      // Kamera nicht in Waende/Gelaende schieben
      const probe = { x: want.x, z: want.z };
      this.city.collision.resolve(probe, 0.3, want.y - 1);
      want.x = probe.x; want.z = probe.z;
      want.y = Math.max(want.y, this.city.terrain.heightAt(want.x, want.z) + 0.5);
      cam.position.lerp(want, Math.min(1, dt * 12));
      cam.lookAt(head);
    } else {
      const c = this.car;
      if (this.firstPerson) {
        const f = c.forward();
        const seat = c.pos.clone().add(new THREE.Vector3(0, 1.22, 0)).addScaledVector(f, -0.1).addScaledVector(new THREE.Vector3(f.z, 0, -f.x), 0.36);
        cam.position.copy(seat);
        cam.rotation.order = 'YXZ';
        cam.rotation.set(-0.06 - (this.camPitch - 0.25) * 0.5, this.camYaw, 0);
        return;
      }
      const dist = 7.5 + c.kmh * 0.02;
      const off = new THREE.Vector3(Math.sin(this.camYaw) * Math.cos(this.camPitch * 0.6), 0.28 + Math.sin(this.camPitch * 0.6), Math.cos(this.camYaw) * Math.cos(this.camPitch * 0.6)).multiplyScalar(dist);
      const target = c.pos.clone().add(new THREE.Vector3(0, 1.3, 0));
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
    const obj = this.currentObjective();
    this.ui.setObjective(OBJECTIVE_TEXT[obj]?.[this.ui.lang] ?? '');
    if (this.mode === 'drive') this.ui.drawSpeedo(this.car.kmh, this.car.fuel / this.car.spec.tankLiters, this.car.damage, this.car.spec.name, this.car.lights);
  }
}
