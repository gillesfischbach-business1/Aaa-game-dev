import * as THREE from 'three';
import { formatLuf } from '../../core/economy';
import type { SaveData } from '../../core/save';
import type { Game } from '../game';
import { missionDef, nextObjective } from '../missiondata';
import { makePerson, makeSign, type PersonModel } from '../models';
import { DIALOGUE03, NEWSPAPER, NEWSPAPER_PRICE, NUMBERS, OBJECTIVE_TEXT, type Lang } from '../story';
import type { MissionController } from './types';

export const M03_ID = 'M03_DNUMMER_AN_DER_ZEITUNG';
const MSG_MISSED = 'DLG_REDING_MISSED';

interface Door { pos: THREE.Vector3; label: string; correct: boolean; resident: string }

// Mission 03 "D'Nummer an der Zeitung": Kiosk -> Kleinanzeige -> Anruf (nur 18-20 Uhr) -> Treffen im Petrusse-Tal
// -> mit drei Hinweisen die richtige von drei Adressen finden. Alles fiktiv (Kategorie D).
export class Mission03 implements MissionController {
  readonly id = M03_ID;
  readonly def = missionDef(M03_ID);
  readonly kiosk: THREE.Vector3;
  readonly bench: THREE.Vector3;
  readonly reding: PersonModel;
  readonly doors: Door[] = [];
  paperDay = -1;          // Tag (seit 1.1.), an dem die Zeitung gekauft wurde
  adRead = false;
  adNoted = false;
  meetFrom = -1;          // Zeitfenster des Treffens (absHours)
  meetTo = -1;
  hasBox = false;
  wrongDoors = 0;
  visited: string[] = [];

  constructor(private g: Game) {
    const P = g.city.places;
    // Kiosk an der Place de Paris
    this.kiosk = g.openSpot((P.place_de_paris ?? P.gare).clone().add(new THREE.Vector3(18, 0, 10)));
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 1.8), new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: 0.7 }));
    box.position.copy(this.kiosk).add(new THREE.Vector3(2.2, 1.3, 0));
    box.castShadow = true;
    g.scene.add(box);
    g.city.collision.addFootprint([[box.position.x - 1.2, box.position.z - 0.9], [box.position.x + 1.2, box.position.z - 0.9], [box.position.x + 1.2, box.position.z + 0.9], [box.position.x - 1.2, box.position.z + 0.9]], this.kiosk.y, this.kiosk.y + 2.6);
    const sign = makeSign(['PRESSE · ZEITUNGEN', 'Tabak · Lotto · Cartes postales'], '#2f5a3a', '#f3ecd9', 3);
    sign.position.copy(this.kiosk).add(new THREE.Vector3(2.2, 0, 0));
    sign.scale.setScalar(0.8);
    g.scene.add(sign);
    g.addInteractable({ pos: this.kiosk, radius: 2.6, label: () => (g.mode === 'walk' ? 'Zeitung kaafen' : null), act: () => this.buyPaper() });

    // Treffpunkt: tiefster Fussweg im Petrusse-Tal nahe dem Pont Adolphe
    const pa = P.pont_adolphe ?? new THREE.Vector3(-225, 289, 351);
    let best: THREE.Vector3 | null = null;
    for (const w of g.city.walkways) for (const p of w.pts) {
      if (Math.hypot(p.x - pa.x, p.z - pa.z) > 170) continue;
      if (!best || p.y < best.y) best = p;
    }
    this.bench = (best ?? pa).clone();
    const benchMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.5), new THREE.MeshStandardMaterial({ color: 0x5a3e28 }));
    benchMesh.position.copy(this.bench).add(new THREE.Vector3(1.4, 0.23, 0));
    g.scene.add(benchMesh);
    this.reding = makePerson(99, { jacket: 0x4a4a42 });
    this.reding.root.position.copy(this.bench).add(new THREE.Vector3(1.2, 0, 0.9));
    this.reding.root.visible = false;
    g.scene.add(this.reding.root);
    g.npcs.push(this.reding);
    g.addInteractable({ pos: this.reding.root.position, radius: 2.6, label: () => (g.mode === 'walk' && this.reding.root.visible ? 'Mam Här Reding schwätzen' : null), act: () => this.talkReding() });

    // Drei Tueren "Reding" (aus dem Telefonbuch); nur eine passt zu allen Hinweisen
    const doorDefs: { at: THREE.Vector3 | undefined; off: THREE.Vector3; label: string; color: number; correct: boolean; resident: string }[] = [
      { at: P.place_guillaume, off: new THREE.Vector3(-70, 0, 35), label: 'Reding · 7', color: 0x2e6b3a, correct: true, resident: 'Madame Marie Reding' },
      { at: P.place_de_paris, off: new THREE.Vector3(40, 0, 70), label: 'Reding · 22', color: 0x2a4a7a, correct: false, resident: 'Här Jean-Pierre Reding' },
      { at: P.rue_abattoir, off: new THREE.Vector3(80, 0, -120), label: 'Reding · 5', color: 0x2e6b3a, correct: false, resident: 'Madame Anne Reding' },
    ];
    for (const d of doorDefs) {
      if (!d.at) continue;
      const pos = g.openSpot(d.at.clone().add(d.off));
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.15), new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.6 }));
      door.position.copy(pos).add(new THREE.Vector3(0, 1.1, -0.9));
      door.castShadow = true;
      const s = makeSign([d.label], '#d8d0bc', '#1d1d1b', 1.2);
      s.scale.setScalar(0.45);
      s.position.copy(pos).add(new THREE.Vector3(0.9, 0, -0.9));
      g.scene.add(door, s);
      const entry: Door = { pos, label: d.label, correct: d.correct, resident: d.resident };
      this.doors.push(entry);
      g.addInteractable({ pos, radius: 2.2, label: () => (g.mode === 'walk' && this.current() === 'combine_clues' ? `Schellen: ${d.label}` : null), act: () => this.ring(entry) });
    }
    g.registerMessage(MSG_MISSED, DIALOGUE03.missed);
  }

  private done(id: string): boolean { return this.g.missions.isObjectiveDone(this.id, id); }
  current(): string | null {
    if (this.g.missions.getState(this.id) !== 'Active') return null;
    return nextObjective(this.def, (o) => this.done(o));
  }
  private complete(o: string): void { this.g.missions.completeObjective(this.id, o); }
  private today(): number { return Math.floor(this.g.absHours() / 24); }

  objectiveText(lang: Lang): string | null {
    const c = this.current();
    if (!c) return this.g.missions.getState(this.id) === 'Succeeded' ? OBJECTIVE_TEXT.done03[lang] : null;
    let t = OBJECTIVE_TEXT[c]?.[lang] ?? '';
    if (c === 'meet_stranger' && this.meetFrom >= 0) t += ` · ${this.g.formatAbsHours(this.meetFrom)}–${this.g.formatAbsHours(this.meetTo).slice(-5)}`;
    return t;
  }

  target(): THREE.Vector3 | null {
    switch (this.current()) {
      case 'buy_newspaper': return this.kiosk;
      case 'group:contact': return this.g.booths[0] ?? null;
      case 'meet_stranger': return this.reding.root.position;
      case 'combine_clues': return this.doors.find((d) => d.correct)?.pos ?? null;  // nur mit Navigationshilfe sichtbar
      default: return null;
    }
  }

  mapMarks() {
    if (this.g.missions.getState(this.id) !== 'Active') return [];
    const m: { x: number; z: number; label: string; done?: boolean }[] = [{ x: this.kiosk.x, z: this.kiosk.z, label: 'Kiosk', done: this.done('buy_newspaper') }];
    if (this.meetFrom >= 0) m.push({ x: this.bench.x, z: this.bench.z, label: 'Treffen', done: this.done('meet_stranger') });
    if (this.hasBox) for (const d of this.doors) m.push({ x: d.pos.x, z: d.pos.z, label: `${d.label}?`, done: this.visited.includes(d.label) });
    return m;
  }

  notes(lang: Lang): string {
    if (this.g.missions.getState(this.id) === 'Locked') return '';
    const cur = this.current();
    const rows: [string, boolean][] = [['buy_newspaper', this.done('buy_newspaper')], ['group:contact', this.done('call_from_payphone') || this.done('call_from_home')], ['meet_stranger', this.done('meet_stranger')], ['combine_clues', this.done('combine_clues')]];
    const items = rows.map(([k, d]) => `<div class="${d ? 'done' : k === cur ? 'cur' : ''}">${d ? '✓' : k === cur ? '→' : '·'} ${OBJECTIVE_TEXT[k][lang]}</div>`).join('');
    const clues: string[] = [];
    if (this.adRead) clues.push(`Anzeige: „${NEWSPAPER.ads.find((a) => a.id === 'reding')!.t}“`);
    if (this.meetFrom >= 0) clues.push(`Treffen: ${this.g.formatAbsHours(this.meetFrom)}–${this.g.formatAbsHours(this.meetTo).slice(-5)}, Bank im Pétrusse-Tal unter dem Pont Adolphe`);
    if (this.hasBox) {
      clues.push('Schwester wohnt in der <b>Oberstadt</b>, nahe einer <b>Kirche</b> mit Glocken');
      clues.push('Foto-Rückseite: Hausnummer <b>7</b>, „<b>grüne Tür</b>“ · Vorname <b>Marie</b>');
      clues.push('Telefonbuch: Reding, M. (Ville Haute, Nr. 7) · Reding, J.-P. (Gare, Nr. 22) · Reding, A. (Hollerich, Nr. 5)');
    }
    if (this.visited.length) clues.push(`Schon geklingelt: ${this.visited.join(', ')}`);
    const clueHtml = clues.length ? `<div class="small" style="margin-top:6px">${clues.map((c) => `• ${c}`).join('<br/>')}</div>` : '';
    return `<h3 style="margin-top:14px">D’NUMMER AN DER ZEITUNG</h3>${items}${clueHtml}`;
  }

  // ---------- Kiosk und Zeitung ----------
  private buyPaper(): void {
    const g = this.g;
    const h = g.clock.getHourLocal();
    if (h < 6 || h >= 20) { g.ui.dialogue([{ who: '', lb: 'De Kiosk ass zou (6–20 Auer).', de: 'Der Kiosk ist geschlossen (6–20 Uhr).', fr: 'Le kiosque est fermé (6 h–20 h).', en: 'The kiosk is closed (6 am–8 pm).' }]); return; }
    if (this.paperDay === this.today()) { g.ui.dialogue(DIALOGUE03.kioskAgain, () => this.showPaper()); return; }
    g.ui.dialogue(DIALOGUE03.kiosk, () => {
      if (!g.wallet.payCash(NEWSPAPER_PRICE, g.clock.getDate(), 'Zeitung')) { g.ui.toast('Nicht genug Bargeld.'); return; }
      this.paperDay = this.today();
      this.showPaper();
    });
  }

  showPaper(): void {
    const g = this.g;
    const root = document.getElementById('paper')!;
    const d = g.clock.getDate();
    const days = ['Méindeg', 'Dënschdeg', 'Mëttwoch', 'Donneschdeg', 'Freideg', 'Samschdeg', 'Sonndeg'];
    (root.querySelector('.mast') as HTMLElement).textContent = NEWSPAPER.title;
    (root.querySelector('.sub') as HTMLElement).textContent = `Fiktive Lokalzeitung · ${days[(new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay() + 6) % 7]}, ${d.day}.${d.month}.${d.year} · ${NEWSPAPER_PRICE} F`;
    (root.querySelector('.news') as HTMLElement).innerHTML = NEWSPAPER.stories.map((s) => `<h3>${s.h}</h3><p>${s.t}</p>`).join('');
    const ads = root.querySelector('.ads') as HTMLElement;
    ads.innerHTML = '<h4>Kleinannoncen</h4>' + NEWSPAPER.ads.map((a) => `<div class="ad${a.id === 'reding' && this.adNoted ? ' noted' : ''}" data-id="${a.id}">${a.t}${a.special ? `<br/><button>${this.adNoted ? 'notéiert ✓' : 'Notéieren'}</button>` : ''}</div>`).join('');
    ads.querySelector('.ad[data-id="reding"] button')?.addEventListener('click', (e) => {
      this.adNoted = true;
      (e.target as HTMLButtonElement).textContent = 'notéiert ✓';
      (e.target as HTMLElement).closest('.ad')?.classList.add('noted');
      g.ui.toast(`Notiert: Chiffre 4711 · ${NUMBERS.reding} · nur 18–20 Uhr`);
    });
    (root.querySelector('.foot') as HTMLElement).textContent = NEWSPAPER.footer;
    g.openOverlay('paper', () => {
      this.adRead = true;
      if (this.current() === 'buy_newspaper') this.complete('buy_newspaper');
    });
  }

  // ---------- Telefon ----------
  onCall(num: string, result: string, fromHome: boolean, finish: () => void): boolean {
    if (num !== NUMBERS.reding.replace(/\D/g, '')) return false;
    const g = this.g;
    if (result === 'NoAnswer') { g.ui.dialogue(DIALOGUE03.noAnswer, finish); return true; }
    if (this.current() === 'group:contact') {
      g.ui.dialogue(DIALOGUE03.call, () => {
        this.complete(fromHome ? 'call_from_home' : 'call_from_payphone');
        this.setMeeting(1);
        finish();
      });
    } else {
      g.ui.dialogue(DIALOGUE03.callAgain, finish);
    }
    return true;
  }

  private setMeeting(daysAhead: number): void {
    const day = this.today() + daysAhead;
    // 10-12 Uhr Wanduhrzeit; im Sommer ist Normalzeit eine Stunde weniger
    const summer = this.g.isSummerAbs(day * 24 + 10);
    this.meetFrom = day * 24 + 10 - (summer ? 1 : 0);
    this.meetTo = this.meetFrom + 2;
  }

  // ---------- Treffen und Tueren ----------
  private talkReding(): void {
    const g = this.g;
    const now = g.absHours();
    if (this.current() !== 'meet_stranger') {
      g.ui.dialogue([{ who: 'Här Reding', lb: 'Merci nach eng Kéier.', de: 'Nochmals danke.', fr: 'Merci encore.', en: 'Thank you again.' }]);
      return;
    }
    if (now < this.meetFrom || now > this.meetTo) { g.ui.dialogue(DIALOGUE03.notYet); return; }
    g.ui.dialogue(DIALOGUE03.meet, () => {
      this.hasBox = true;
      this.complete('meet_stranger');
      g.ui.toast('Kiste erhalten · Hinweise stehen im Notizbuch (Tab)');
    });
  }

  private ring(d: Door): void {
    const g = this.g;
    if (!this.visited.includes(d.label)) this.visited.push(d.label);
    if (!d.correct) {
      this.wrongDoors++;
      g.ui.dialogue(DIALOGUE03.wrongDoor(d.resident));
      return;
    }
    g.ui.dialogue(DIALOGUE03.rightDoor, () => {
      const pay = Math.max(1500, 3000 - this.wrongDoors * 500);
      g.wallet.receiveCash(pay, g.clock.getDate(), 'Belohnung Madame Reding');
      g.reputation += 5 - this.wrongDoors * 2;
      this.hasBox = false;
      this.complete('combine_clues');
      g.ui.toast(`Mission erfüllt: „D’Nummer an der Zeitung“ · +${formatLuf(pay)}`, 5000);
      g.onMissionSucceeded(this.id);
    });
  }

  update(): void {
    const g = this.g;
    const now = g.absHours();
    // Herr Reding sitzt nur waehrend des vereinbarten Zeitfensters auf der Bank
    this.reding.root.visible = this.current() === 'meet_stranger' && now >= this.meetFrom - 0.25 && now <= this.meetTo;
    if (this.current() === 'meet_stranger' && this.meetTo >= 0 && now > this.meetTo) {
      g.missions.fail(this.id, 'missed_meeting');
      g.missions.restartFromCheckpoint(this.id);
      this.setMeeting(1);
      g.phoneNet.leaveMessage(NUMBERS.home, { date: g.clock.getDate(), hour: g.clock.getHour(), minute: g.clock.getMinute(), fromNumber: NUMBERS.reding, text: 'Reding: verpasst', dialogueId: MSG_MISSED });
    }
  }

  save(): SaveData {
    return {
      'm03.paper_day': String(this.paperDay), 'm03.ad_read': this.adRead ? '1' : '0', 'm03.ad_noted': this.adNoted ? '1' : '0',
      'm03.meet': `${this.meetFrom},${this.meetTo}`, 'm03.box': this.hasBox ? '1' : '0', 'm03.wrong': String(this.wrongDoors),
      'm03.visited': this.visited.join('|'),
    };
  }

  load(d: SaveData): void {
    this.paperDay = Number(d['m03.paper_day'] ?? -1);
    this.adRead = d['m03.ad_read'] === '1';
    this.adNoted = d['m03.ad_noted'] === '1';
    const [a, b] = (d['m03.meet'] ?? '-1,-1').split(',').map(Number);
    this.meetFrom = Number.isFinite(a) ? a : -1;
    this.meetTo = Number.isFinite(b) ? b : -1;
    this.hasBox = d['m03.box'] === '1';
    this.wrongDoors = Number(d['m03.wrong'] ?? 0) || 0;
    this.visited = (d['m03.visited'] ?? '').split('|').filter(Boolean);
  }
}
