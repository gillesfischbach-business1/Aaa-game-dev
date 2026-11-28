import * as THREE from 'three';
import { dayOfWeek } from '../../core/calendar';
import { formatLuf } from '../../core/economy';
import type { SaveData } from '../../core/save';
import type { Game, Interior } from '../game';
import { missionDef, nextObjective } from '../missiondata';
import { makePerson, makeSign, type PersonModel } from '../models';
import { DIALOGUE05, NET_PRICE, NUMBERS, OBJECTIVE_TEXT, type Lang } from '../story';
import type { MissionController } from './types';

export const M05_ID = 'M05_DEI_VERLUER_DISKETT';
const MSG_TOM = 'DLG_TOM_HELP';
const SANDRA_MAIL = 'sandra77@stadnet-fiktiv.lu';

// Mission 05 "Déi verluer Diskett". Eine Wahrheit, drei Wege dorthin:
// Sandra hat die Diskette an der Bushaltestelle gefunden, im Forum gemeldet und bringt sie am naechsten Morgen
// ins Fundbuero. Forum + E-Mail -> Sandra; Zeuge an der Haltestelle -> Sandra; Telefonbuch -> Fundbuero.
export class Mission05 implements MissionController {
  readonly id = M05_ID;
  readonly def = missionDef(M05_ID);
  readonly door: THREE.Vector3;
  readonly interior: Interior;
  readonly tom: PersonModel;
  readonly sandra: PersonModel;
  readonly nilles: PersonModel;
  readonly busStop: THREE.Vector3;
  readonly fundDoor: THREE.Vector3;
  readonly computers: THREE.Vector3[] = [];
  messageLeft = false;
  startedAt = -1;      // Zeitpunkt des Gespraechs mit Tom (absHours)
  mailedAt = -1;       // E-Mail an Sandra
  witnessHeard = false;
  hasDisk = false;
  freeNet = false;     // nach der Mission: Internet gratis

  constructor(private g: Game) {
    const P = g.city.places;
    const gare = P.gare ?? new THREE.Vector3(320, 289, 1300);
    // Eingang: an einer Strasse westlich des Bahnhofsvorplatzes
    this.door = g.openSpot(gare.clone().add(new THREE.Vector3(-120, 0, -30)), false, 8);
    const sign = makeSign(['CYBERCAFÉ PIXEL', 'Internet · Kaffi · Drécker · Scanner'], '#3a1f5f', '#f0e6ff', 3.8);
    sign.position.copy(this.door).add(new THREE.Vector3(1.6, 0, 0));
    g.scene.add(sign);

    // Innenraum: unter dem Gelaende verborgen (Gelaende ist hier >245 m, Raum auf 200 m)
    this.interior = this.buildInterior(new THREE.Vector3(this.door.x, 200, this.door.z));
    g.addInteractable({ pos: this.door, radius: 2.2, label: () => (g.mode === 'walk' && !g.interior ? 'Cybercafé Pixel – eragoen' : null), act: () => g.enterInterior(this.interior) });
    g.addInteractable({ pos: this.interior.spawn, radius: 1.8, label: () => (g.interior === this.interior ? 'Erausgoen' : null), act: () => g.leaveInterior() });

    const o = this.interior.origin;
    this.tom = makePerson(123, { jacket: 0x3a3a3a });
    this.tom.root.position.set(o.x + 4.5, o.y, o.z - 3.1);      // hinter der Theke
    this.sandra = makePerson(144, { jacket: 0x7a1c2c });
    this.sandra.root.position.set(o.x - 2.4, o.y, o.z + 2.55);  // an Platz 5
    g.scene.add(this.tom.root, this.sandra.root);
    g.npcs.push(this.tom, this.sandra);
    g.addInteractable({ pos: this.tom.root.position, radius: 2.4, label: () => (g.interior === this.interior ? 'Mam Tom schwätzen' : null), act: () => this.talkTom() });
    g.addInteractable({ pos: this.sandra.root.position, radius: 2.2, label: () => (g.interior === this.interior && this.sandra.root.visible ? 'Mat der Fra mam roude Rucksak schwätzen' : null), act: () => this.talkSandra() });
    for (const pc of this.computers) {
      g.addInteractable({ pos: pc, radius: 1.6, label: () => (g.interior === this.interior ? (this.freeNet ? 'Computer benotzen (gratis)' : `Computer benotzen – ${NET_PRICE} F / 30 Min.`) : null), act: () => this.useComputer() });
    }

    // Bushaltestelle Place de Paris mit Zeuge
    this.busStop = g.openSpot((P.place_de_paris ?? gare).clone().add(new THREE.Vector3(-20, 0, 18)), false, 8);
    const stop = makeSign(['ARRÊT', 'Place de Paris · AVL'], '#c8b400', '#1d1d1b', 1.4);
    stop.scale.setScalar(0.7);
    stop.position.copy(this.busStop).add(new THREE.Vector3(1.2, 0, 0));
    g.scene.add(stop);
    this.nilles = makePerson(161, { jacket: 0x5a5040 });
    this.nilles.root.position.copy(this.busStop).add(new THREE.Vector3(0.6, 0, 0.8));
    this.nilles.root.position.y = g.city.surfaceAt(this.nilles.root.position.x, this.nilles.root.position.z, this.busStop.y + 1);
    g.scene.add(this.nilles.root);
    g.npcs.push(this.nilles);
    g.addInteractable({ pos: this.nilles.root.position, radius: 2.2, label: () => (g.mode === 'walk' && this.nilles.root.visible ? 'Mam Här Nilles schwätzen' : null), act: () => this.talkNilles() });

    // Fundbuero bei der Place de Metz
    this.fundDoor = g.openSpot((P.place_de_metz ?? gare).clone().add(new THREE.Vector3(30, 0, 25)), false, 8);
    const fs = makeSign(['OBJETS TROUVÉS', 'Fundbüro (fiktiv)'], '#2a3a4a', '#e8e8e0', 2.6);
    fs.scale.setScalar(0.8);
    fs.position.copy(this.fundDoor).add(new THREE.Vector3(1.2, 0, 0));
    g.scene.add(fs);
    g.addInteractable({ pos: this.fundDoor, radius: 2.2, label: () => (g.mode === 'walk' ? 'Fundbüro' : null), act: () => this.fundCounter() });

    g.registerMessage(MSG_TOM, DIALOGUE05.tomMessage);
  }

  // ---------- Innenraum ----------
  private buildInterior(origin: THREE.Vector3): Interior {
    const g = this.g;
    const W = 14, D = 9, H = 3.1;
    const group = new THREE.Group();
    group.position.copy(origin);
    const mat = (c: number, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(0x6a7480, 0.6));  // Linoleum
    floor.rotation.x = -Math.PI / 2;
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(0xe8e6de));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    ceil.castShadow = true;
    const walls = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [mat(0xd8cfb4), mat(0xd8cfb4), mat(0xe8e6de), mat(0x6a7480), mat(0x7a5a8a), mat(0xd8cfb4)].map((m) => { m.side = THREE.BackSide; return m; }));
    walls.position.y = H / 2;
    group.add(floor, ceil, walls);
    // Neonroehren
    for (const x of [-3.5, 3.5]) {
      const tube = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.25), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeef4ff, emissiveIntensity: 2 }));
      tube.position.set(x, H - 0.05, 0);
      group.add(tube);
      const light = new THREE.PointLight(0xeef2ff, 18, 14, 1.6);
      light.position.set(x, H - 0.4, 0);
      group.add(light);
    }
    // Schreibtische mit Roehrenmonitoren (beige, leicht vergilbt), Tastatur, Stuhl
    const beige = mat(0xd6cdb0, 0.7), dark = mat(0x222222, 0.5), desk = mat(0x8a6a48, 0.7);
    const deskSpots = [[-5, -3.4], [-2.4, -3.4], [0.2, -3.4], [-5, 1.6], [-2.4, 1.6]];
    deskSpots.forEach(([x, z], i) => {
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.9), desk);
      top.position.set(x, 0.74, z);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.72, 0.05), desk);
      leg.position.set(x, 0.36, z - 0.42);
      const mon = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.44), beige);
      mon.position.set(x, 0.98, z - 0.15);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.27), new THREE.MeshStandardMaterial({ color: 0x103a4a, emissive: i === 2 ? 0x2a7f7f : 0x1a5a8a, emissiveIntensity: 0.9 }));
      screen.position.set(x, 0.99, z + 0.075);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.44), beige);
      tower.position.set(x + 0.7, 0.98, z - 0.1);
      const kb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.16), mat(0xcfc29a));
      kb.position.set(x, 0.79, z + 0.25);
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.45), dark);
      chair.position.set(x, 0.48, z + 0.85);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.06), dark);
      back.position.set(x, 0.75, z + 1.08);
      group.add(top, leg, mon, screen, tower, kb, chair, back);
      if (i < 3) this.computers.push(new THREE.Vector3(origin.x + x, origin.y, origin.z + z + 0.9));
    });
    // Theke, Kaffeemaschine, Drucker
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.05, 0.7), mat(0x3a1f5f, 0.6));
    counter.position.set(4.5, 0.52, -2.2);
    const coffee = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), mat(0x444444, 0.4));
    coffee.position.set(5.6, 1.28, -2.3);
    const printer = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.4), beige);
    printer.position.set(3.6, 1.16, -2.3);
    group.add(counter, coffee, printer);
    const prices = makeSign(['PRÄISER', '½ Stonn 75 F · 1 Stonn 150 F · Drock 10 F'], '#1d1d1b', '#f2e6c8', 2.6);
    prices.scale.setScalar(0.55);
    prices.position.set(4.5, 0.3, -4.35);
    group.add(prices);
    group.traverse((o) => { if (o instanceof THREE.Mesh) o.receiveShadow = true; });
    g.scene.add(group);

    const spawn = new THREE.Vector3(origin.x + 5.5, origin.y, origin.z + 3.4);  // an der Tuer
    // Waende und Moebel als Kollision
    const c = g.city.collision;
    const x0 = origin.x - W / 2, x1 = origin.x + W / 2, z0 = origin.z - D / 2, z1 = origin.z + D / 2;
    c.addWallLine([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]], origin.y - 1, origin.y + H);
    for (const [x, z] of deskSpots) c.addFootprint([[origin.x + x - 1, origin.z + z - 0.45], [origin.x + x + 1, origin.z + z - 0.45], [origin.x + x + 1, origin.z + z + 0.45], [origin.x + x - 1, origin.z + z + 0.45]], origin.y, origin.y + 0.8);
    c.addFootprint([[origin.x + 2.9, origin.z - 2.55], [origin.x + 6.1, origin.z - 2.55], [origin.x + 6.1, origin.z - 1.85], [origin.x + 2.9, origin.z - 1.85]], origin.y, origin.y + 1.1);
    return { floor: origin.y, origin: origin.clone(), spawn, exit: this.door, bounds: [x0 + 0.4, z0 + 0.4, x1 - 0.4, z1 - 0.4], name: 'Cybercafé Pixel' };
  }

  // ---------- Ablauf ----------
  private done(id: string): boolean { return this.g.missions.isObjectiveDone(this.id, id); }
  current(): string | null {
    if (this.g.missions.getState(this.id) !== 'Active') return null;
    return nextObjective(this.def, (o) => this.done(o));
  }
  private complete(o: string): void { this.g.missions.completeObjective(this.id, o); }

  /** Sandra bringt die Diskette am naechsten Morgen (9 Uhr) ins Fundbuero, falls niemand sie abholt */
  private handInAt(): number {
    if (this.startedAt < 0) return Infinity;
    const day = Math.floor(this.startedAt / 24) + 1;
    return day * 24 + 9 - (this.g.isSummerAbs(day * 24 + 9) ? 1 : 0);
  }
  private sandraHasDisk(): boolean { return !this.hasDisk && !this.done('return_disk') && !this.foundAny() && this.g.absHours() < this.handInAt(); }
  private foundAny(): boolean { return ['find_via_forum', 'find_via_phonebook', 'find_via_witness'].some((o) => this.done(o)); }
  private sandraReplied(): boolean { return this.mailedAt >= 0 && this.g.absHours() >= this.mailedAt + 1; }

  private talkTom(): void {
    const g = this.g, c = this.current();
    if (c === 'listen_tom' || c === 'talk_technician') {
      g.ui.dialogue(DIALOGUE05.tomIntro, () => {
        if (!this.done('listen_tom')) this.complete('listen_tom');
        this.complete('talk_technician');
        this.startedAt = g.absHours();
      });
      return;
    }
    if (c === 'return_disk' && this.hasDisk) {
      g.ui.dialogue(DIALOGUE05.tomThanks, () => {
        this.hasDisk = false;
        this.freeNet = true;
        g.wallet.receiveCash(2500, g.clock.getDate(), 'Belohnung Tom Kieffer');
        g.reputation += 3;
        this.complete('return_disk');
        g.flags['m05.done_at'] = String(g.absHours());
        g.ui.toast(`Mission erfüllt: „Déi verluer Diskett“ · +${formatLuf(2500)} · Internet im Pixel jetzt gratis`, 5000);
        g.onMissionSucceeded(this.id);
      });
      return;
    }
    if (c === 'group:find_disk') { g.ui.dialogue(DIALOGUE05.tomWaiting); return; }
    g.ui.dialogue([{ who: 'Tom', lb: 'Moien! E Kaffi? Oder wëllt Dir surfen?', de: 'Hallo! Einen Kaffee? Oder wollen Sie surfen?', fr: 'Salut ! Un café ? Ou vous voulez surfer ?', en: 'Hi! Coffee? Or do you want to surf?' }]);
  }

  private talkSandra(): void {
    const g = this.g;
    if (this.current() !== 'group:find_disk') { g.ui.dialogue(DIALOGUE05.sandraBusy); return; }
    if (!this.sandraHasDisk()) { g.ui.dialogue(DIALOGUE05.sandraHandedIn); return; }
    if (this.sandraReplied()) { g.ui.dialogue(DIALOGUE05.sandraGiveForum, () => this.gotDisk('find_via_forum')); return; }
    if (this.witnessHeard) { g.ui.dialogue(DIALOGUE05.sandraGiveWitness, () => this.gotDisk('find_via_witness')); return; }
    g.ui.dialogue(DIALOGUE05.sandraBusy);
  }

  private talkNilles(): void {
    const g = this.g;
    if (this.current() === 'group:find_disk' && !this.hasDisk) {
      g.ui.dialogue(DIALOGUE05.nilles, () => { this.witnessHeard = true; });
      return;
    }
    g.ui.dialogue(DIALOGUE05.nillesIdle);
  }

  private fundOpen(): boolean {
    const d = this.g.clock.getDate(), h = this.g.clock.getHourLocal();
    return dayOfWeek(d) < 5 && ((h >= 8 && h < 12) || (h >= 14 && h < 17));
  }

  private fundCounter(): void {
    const g = this.g;
    if (!this.fundOpen()) { g.ui.dialogue(DIALOGUE05.fundClosed); return; }
    if (this.current() === 'group:find_disk' && !this.hasDisk && g.absHours() >= this.handInAt()) {
      g.ui.dialogue(DIALOGUE05.fundCounter, () => {
        if (!g.wallet.payCash(50, g.clock.getDate(), 'Fundbüro Gebühr')) { g.ui.toast('Nicht genug Bargeld (50 F).'); return; }
        this.gotDisk('find_via_phonebook');
      });
      return;
    }
    g.ui.dialogue(DIALOGUE05.fundEmpty);
  }

  private gotDisk(path: string): void {
    this.hasDisk = true;
    this.complete(path);
    this.g.ui.toast('Diskette „TK – Diplom“ eingesteckt · zurück zu Tom ins Pixel');
  }

  onCall(num: string, result: string, _fromHome: boolean, finish: () => void): boolean {
    if (num !== NUMBERS.fund.replace(/\D/g, '')) return false;
    const g = this.g;
    if (result === 'NoAnswer') { g.ui.dialogue(DIALOGUE05.fundClosed, finish); return true; }
    const handedIn = this.current() === 'group:find_disk' && g.absHours() >= this.handInAt();
    g.ui.dialogue(handedIn ? DIALOGUE05.fundYes : DIALOGUE05.fundNothing, finish);
    return true;
  }

  // ---------- Computer ----------
  private useComputer(): void {
    const g = this.g;
    if (!this.freeNet && !g.wallet.payCash(NET_PRICE, g.clock.getDate(), 'Cybercafé Pixel – Internet')) { g.ui.toast(`Nicht genug Bargeld (${NET_PRICE} F).`); return; }
    g.openComputer();
  }

  onMailSent(to: string): void {
    if (to === SANDRA_MAIL && this.current() === 'group:find_disk' && this.mailedAt < 0) {
      this.mailedAt = this.g.absHours();
      // Antwort trifft etwa eine Spielstunde spaeter ein
      this.g.internet.addMail({ id: 'sandra.reply', from: SANDRA_MAIL, to: this.g.internet.address, subject: DIALOGUE05.sandraMail.subject, body: DIALOGUE05.sandraMail.body, atHours: this.mailedAt + 1 });
    }
  }

  // ---------- Schnittstelle ----------
  objectiveText(lang: Lang): string | null {
    const c = this.current();
    if (!c) return this.g.missions.getState(this.id) === 'Succeeded' ? OBJECTIVE_TEXT.done05[lang] : null;
    return OBJECTIVE_TEXT[c]?.[lang] ?? null;
  }

  target(): THREE.Vector3 | null {
    switch (this.current()) {
      case 'listen_tom': return this.g.homeDoor;
      case 'talk_technician': case 'return_disk': return this.g.interior === this.interior ? this.tom.root.position : this.door;
      case 'group:find_disk': return this.busStop;
      default: return null;
    }
  }

  mapMarks() {
    if (this.g.missions.getState(this.id) !== 'Active') return [];
    const m = [{ x: this.door.x, z: this.door.z, label: 'Pixel', done: false }];
    if (this.startedAt >= 0) m.push({ x: this.busStop.x, z: this.busStop.z, label: 'Arrêt', done: this.witnessHeard }, { x: this.fundDoor.x, z: this.fundDoor.z, label: 'Fundbüro', done: false });
    return m;
  }

  notes(lang: Lang): string {
    if (this.g.missions.getState(this.id) === 'Locked') return '';
    const cur = this.current();
    const rows: [string, boolean][] = [['listen_tom', this.done('listen_tom')], ['talk_technician', this.done('talk_technician')], ['group:find_disk', this.foundAny()], ['return_disk', this.done('return_disk')]];
    const items = rows.map(([k, d]) => `<div class="${d ? 'done' : k === cur ? 'cur' : ''}">${d ? '✓' : k === cur ? '→' : '·'} ${OBJECTIVE_TEXT[k][lang]}</div>`).join('');
    const clues: string[] = [];
    if (this.startedAt >= 0) clues.push('Tom: blaue Diskette „TK – Diplom“, verloren im Bus über die Place de Paris');
    if (this.g.internet.visitedForumFund) clues.push(`Forum „Fundsaachen“: sandra_77 hat sie gefunden – ${SANDRA_MAIL}`);
    if (this.mailedAt >= 0) clues.push(this.sandraReplied() ? 'Sandra hat geantwortet (StadMail lesen)' : 'E-Mail an Sandra geschickt – Antwort abwarten');
    if (this.witnessHeard) clues.push('Herr Nilles: junge Frau mit rotem Rucksack, nachmittags im Internetcafé');
    if (this.hasDisk) clues.push('<b>Diskette eingesteckt</b>');
    const clueHtml = clues.length ? `<div class="small" style="margin-top:6px">${clues.map((c) => `• ${c}`).join('<br/>')}</div>` : '';
    return `<h3>DÉI VERLUER DISKETT</h3>${items}${clueHtml}`;
  }

  update(): void {
    const g = this.g;
    const st = g.missions.getState(this.id);
    // Tom ruft eine Spielstunde nach Mission 03 an
    if (st === 'Active' && !this.messageLeft && this.current() === 'listen_tom') {
      const m03done = Number(g.flags['m03.done_at'] ?? NaN);
      if (!Number.isFinite(m03done) || g.absHours() >= m03done + 1) {
        g.phoneNet.leaveMessage(NUMBERS.home, { date: g.clock.getDate(), hour: g.clock.getHour(), minute: g.clock.getMinute(), fromNumber: '00', text: 'Tom Kieffer', dialogueId: MSG_TOM });
        this.messageLeft = true;
      }
    }
    // Sandra sitzt nachmittags (14-20 Uhr) im Pixel; Herr Nilles wartet tagsueber an der Haltestelle
    const h = g.clock.getHourLocal();
    this.sandra.root.visible = h >= 14 && h < 20;
    this.nilles.root.visible = h >= 7 && h < 19;
  }

  onMessageHeard(id: string): void {
    if (id === MSG_TOM && this.current() === 'listen_tom') this.complete('listen_tom');
  }

  save(): SaveData {
    return {
      'm05.msg': this.messageLeft ? '1' : '0', 'm05.started': String(this.startedAt), 'm05.mailed': String(this.mailedAt),
      'm05.witness': this.witnessHeard ? '1' : '0', 'm05.disk': this.hasDisk ? '1' : '0', 'm05.free': this.freeNet ? '1' : '0',
    };
  }

  load(d: SaveData): void {
    this.messageLeft = d['m05.msg'] === '1';
    this.startedAt = Number(d['m05.started'] ?? -1);
    this.mailedAt = Number(d['m05.mailed'] ?? -1);
    this.witnessHeard = d['m05.witness'] === '1';
    this.hasDisk = d['m05.disk'] === '1';
    this.freeNet = d['m05.free'] === '1';
    if (this.messageLeft && this.current() === 'listen_tom') this.messageLeft = false;  // Band neu bespielen
  }
}
