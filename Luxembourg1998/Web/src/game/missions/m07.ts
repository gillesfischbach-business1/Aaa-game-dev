import * as THREE from 'three';
import { dayOfWeek } from '../../core/calendar';
import { formatLuf } from '../../core/economy';
import type { SaveData } from '../../core/save';
import { FILM_SIZE } from '../camera';
import type { Game } from '../game';
import { missionDef, nextObjective } from '../missiondata';
import { makePerson, makeSign, type PersonModel } from '../models';
import { DIALOGUE07, NUMBERS, OBJECTIVE_TEXT, PHOTO_JOB_PAY, STORY_ANGLES, type Lang } from '../story';
import type { MissionController } from './types';

export const M07_ID = 'M07_DSTAD_AM_WANDEL';
const MSG_MIA = 'DLG_MIA_PROJECT';
const MISSION_SUBJECTS = ['pont_adolphe', 'workshop', 'gare'];

// Mission 07 "D'Stad am Wandel": Kamera von Mia, drei Motive fotografieren, Anwohnerin befragen, Film abgeben,
// Blickwinkel der Reportage waehlen. Danach laufende Fotoauftraege (zweite Karriere). Alles fiktiv (Kategorie D).
export class Mission07 implements MissionController {
  readonly id = M07_ID;
  readonly def = missionDef(M07_ID);
  readonly lab: THREE.Vector3;
  readonly mia: PersonModel;
  readonly thill: PersonModel;
  readonly workshopSpot: THREE.Vector3;
  messageLeft = false;
  angle = '';
  job: { subject: string; since: number } | null = null;
  jobsDone = 0;

  constructor(private g: Game) {
    const P = g.city.places;
    const gare = P.gare ?? new THREE.Vector3(320, 289, 1300);
    this.lab = g.openSpot(gare.clone().add(new THREE.Vector3(70, 0, -90)), false, 8);
    const sign = makeSign(['FOTOLABO FELLER', 'Entwécklung an 1 Stonn · Passfotoen'], '#1d1d1b', '#f0d060', 3.2);
    sign.scale.setScalar(0.8);
    sign.position.copy(this.lab).add(new THREE.Vector3(1.4, 0, 0));
    g.scene.add(sign);
    this.mia = makePerson(201, { jacket: 0x2a6a6a });
    this.mia.root.position.copy(this.lab).add(new THREE.Vector3(-0.8, 0, 0.6));
    g.scene.add(this.mia.root);
    g.npcs.push(this.mia);
    g.addInteractable({ pos: this.mia.root.position, radius: 2.4, label: () => (g.mode === 'walk' && this.mia.root.visible ? 'Mat der Mia schwätzen (Fotolabo)' : null), act: () => this.talkMia() });

    // Alte Schlosserei: ein echtes Gebaeude (OSM) nahe der Route d'Esch bekommt einen fiktiven Namen und einen Bauzaun
    const target = P.route_esch ?? new THREE.Vector3(-859, 266, 1435);
    let bestPoly: [number, number][] | null = null, bestD = Infinity;
    for (const fp of g.city.buildingFootprints) {
      const cx = fp.reduce((a, p) => a + p[0], 0) / fp.length, cz = fp.reduce((a, p) => a + p[1], 0) / fp.length;
      let area = 0;
      for (let i = 0; i < fp.length; i++) { const [x1, z1] = fp[i], [x2, z2] = fp[(i + 1) % fp.length]; area += x1 * z2 - x2 * z1; }
      area = Math.abs(area / 2);
      const d = Math.hypot(cx - target.x, cz - target.z);
      if (area > 150 && area < 2000 && d < bestD) { bestD = d; bestPoly = fp; }
    }
    const wc = bestPoly
      ? new THREE.Vector3(bestPoly.reduce((a, p) => a + p[0], 0) / bestPoly.length, 0, bestPoly.reduce((a, p) => a + p[1], 0) / bestPoly.length)
      : target.clone();
    wc.y = g.city.terrain.heightAt(wc.x, wc.z) + 5;
    this.workshopSpot = g.openSpot(wc, false, 6);
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0xb8b8b0, roughness: 0.6, metalness: 0.4, transparent: true, opacity: 0.75 });
    const dir = new THREE.Vector3(wc.x - this.workshopSpot.x, 0, wc.z - this.workshopSpot.z).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    for (let i = -2; i <= 2; i++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.9, 0.05), fenceMat);
      const p = this.workshopSpot.clone().addScaledVector(dir, 1.2).addScaledVector(side, i * 2.3);
      panel.position.set(p.x, g.city.surfaceAt(p.x, p.z, p.y + 1) + 0.95, p.z);
      panel.rotation.y = Math.atan2(side.x, side.z) + Math.PI / 2;
      g.scene.add(panel);
    }
    const ws = makeSign(['SCHLOSSEREI WEBER', 'gegr. 1952 · Ofrappen ab Mee (fiktiv)'], '#5a3a2a', '#e8d8b8', 3.4);
    ws.scale.setScalar(0.75);
    ws.position.copy(this.workshopSpot).addScaledVector(dir, 1.3).addScaledVector(side, 6.5);
    ws.position.y = g.city.surfaceAt(ws.position.x, ws.position.z, this.workshopSpot.y + 1);
    g.scene.add(ws);
    this.thill = makePerson(233, { jacket: 0x5a4a6a });
    this.thill.root.position.copy(this.workshopSpot).addScaledVector(side, -3);
    this.thill.root.position.y = g.city.surfaceAt(this.thill.root.position.x, this.thill.root.position.z, this.workshopSpot.y + 1);
    g.scene.add(this.thill.root);
    g.npcs.push(this.thill);
    g.addInteractable({ pos: this.thill.root.position, radius: 2.4, label: () => (g.mode === 'walk' && this.thill.root.visible ? 'Mat der Madame Thill schwätzen' : null), act: () => this.talkThill() });

    // Motive fuer die Kamera
    const cam = g.camera35;
    const add = (id: string, name: string, pos: THREE.Vector3 | undefined, minDist: number, maxDist: number) => { if (pos) cam.addSubject({ id, name, pos: pos.clone(), minDist, maxDist }); };
    add('pont_adolphe', 'Pont Adolphe', P.pont_adolphe, 30, 260);
    add('workshop', 'Schlosserei Weber (fiktiv)', wc, 8, 90);
    add('gare', 'Gare', P.gare?.clone().add(new THREE.Vector3(0, 8, 0)), 25, 220);
    add('passerelle', 'Passerelle / Viaduc', P.passerelle, 30, 260);
    add('place_darmes', 'Place d’Armes', P.place_darmes?.clone().add(new THREE.Vector3(0, 3, 0)), 8, 80);
    add('place_guillaume', 'Place Guillaume II', P.place_guillaume?.clone().add(new THREE.Vector3(0, 3, 0)), 10, 100);
    add('rond_point_merl', 'Rond-Point Merl', P.rond_point_merl?.clone().add(new THREE.Vector3(0, 2, 0)), 10, 100);
    add('grund', 'Grund an der Alzette', g.m06.terrace.clone().add(new THREE.Vector3(0, 2, 0)), 8, 90);
    add('kiosk', 'Kiosk Place de Paris', g.m03.kiosk.clone().add(new THREE.Vector3(2, 1.5, 0)), 4, 40);
    g.registerMessage(MSG_MIA, DIALOGUE07.message);
  }

  private done(id: string): boolean { return this.g.missions.isObjectiveDone(this.id, id); }
  current(): string | null {
    if (this.g.missions.getState(this.id) !== 'Active') return null;
    return nextObjective(this.def, (o) => this.done(o));
  }
  private complete(o: string): void { this.g.missions.completeObjective(this.id, o); }
  private open(): boolean { const h = this.g.clock.getHourLocal(); return dayOfWeek(this.g.clock.getDate()) < 6 && h >= 9 && h < 18; }
  private subjectName(id: string): string { return this.g.camera35.subjects.find((s) => s.id === id)?.name ?? id; }

  private talkMia(): void {
    const g = this.g, c = this.current(), cam = g.camera35;
    if (!this.open()) { g.ui.dialogue(DIALOGUE07.closed); return; }
    if (g.m08.tryTalk('mia')) return;
    if (c === 'listen_mia' || c === 'get_camera') {
      g.ui.dialogue(DIALOGUE07.camera, () => {
        cam.owned = true;
        cam.film = Math.max(cam.film, FILM_SIZE);
        if (!this.done('listen_mia')) this.complete('listen_mia');
        this.complete('get_camera');
        g.ui.toast('Kamera erhalten · F = Sucher · 24 Aufnahmen');
      });
      return;
    }
    if ((c === 'photograph_old_building' || c === 'interview_resident') && cam.film <= 0) {
      // Film voll, aber noch nicht alle Motive: neuen Film geben (sonst Sackgasse)
      cam.film = FILM_SIZE;
      g.ui.dialogue([{ who: 'Mia', lb: 'De Film ass voll? Hei ass en neien. Denk un d’Motiver op der Lëscht – a bei Dag.', de: 'Der Film ist voll? Hier ist ein neuer. Denk an die Motive auf der Liste – und bei Tag.', fr: 'La pellicule est pleine ? En voici une nouvelle. Pense aux sujets de la liste – et de jour.', en: 'Roll full? Here’s a new one. Remember the subjects on the list – and in daylight.' }]);
      return;
    }
    if (c === 'photograph_old_building' || c === 'interview_resident') { g.ui.dialogue(MISSION_SUBJECTS.every((s) => cam.hasGood(s)) ? DIALOGUE07.waiting : DIALOGUE07.missing); return; }
    if (c === 'deliver_film') {
      g.ui.dialogue(DIALOGUE07.deliver, () => {
        g.advanceMinutes(60);
        const batch = cam.develop();
        this.complete('deliver_film');
        g.showContactSheet(batch, () => this.chooseAngle(batch));
      });
      return;
    }
    if (c === 'decide_story') { this.chooseAngle(cam.developed); return; }
    // Nach der Mission: Fotoauftraege
    if (g.missions.getState(this.id) === 'Succeeded') this.photoJob();
  }

  private chooseAngle(batch: { subject: string | null; quality: string; img: string }[]): void {
    const g = this.g;
    const opts = (Object.keys(STORY_ANGLES) as (keyof typeof STORY_ANGLES)[]).map((k) => ({ value: k, label: STORY_ANGLES[k].label }));
    g.ui.choice(DIALOGUE07.choice, opts, (v) => {
      const a = STORY_ANGLES[v as keyof typeof STORY_ANGLES];
      this.angle = v;
      const best = batch.find((p) => p.subject === 'workshop' && p.quality === 'gut') ?? batch.find((p) => p.subject && p.quality !== 'schlecht');
      g.paperFeature = { h: a.h, t: a.t, img: best?.img ?? '', day: Math.floor(g.absHours() / 24) + 1 };
      g.flags['m07.angle'] = v;
      g.flags['career.photographer'] = 'active';
      if (v === 'preserve') g.flags['rel.thill'] = 'grateful';
      g.wallet.receiveCash(3000, g.clock.getDate(), 'Mia Feller: Reportage');
      g.reputation += 2;
      this.complete('decide_story');
      g.ui.dialogue(DIALOGUE07.after, () => {
        g.ui.toast(`Mission erfüllt: „D’Stad am Wandel“ · +${formatLuf(3000)} · morgen in der Zeitung`, 5000);
        g.onMissionSucceeded(this.id);
      });
    });
  }

  private photoJob(): void {
    const g = this.g, cam = g.camera35;
    if (this.job && cam.hasGood(this.job.subject, this.job.since)) {
      const name = this.subjectName(this.job.subject);
      cam.develop();
      g.wallet.receiveCash(PHOTO_JOB_PAY, g.clock.getDate(), `Fotoauftrag: ${name}`);
      this.jobsDone++;
      this.job = null;
      g.ui.dialogue([{ who: 'Mia', lb: `Schéin! ${name} – dat Bild huelen ech. Hei sinn ${PHOTO_JOB_PAY} Frang an e neie Film.`, de: `Schön! ${name} – das Bild nehme ich. Hier sind ${PHOTO_JOB_PAY} Franken und ein neuer Film.`, fr: `Super ! ${name} – je prends la photo. Voici ${PHOTO_JOB_PAY} francs et une nouvelle pellicule.`, en: `Nice! ${name} – I’ll take that shot. Here’s ${PHOTO_JOB_PAY} francs and a new roll.` }]);
      return;
    }
    if (this.job) {
      const name = this.subjectName(this.job.subject);
      if (cam.film <= 0) cam.film = FILM_SIZE;  // sonst kann der Auftrag nie erfuellt werden
      g.ui.dialogue([{ who: 'Mia', lb: `Ech waarden nach op d’Bild vun ${name}.`, de: `Ich warte noch auf das Bild von ${name}.`, fr: `J’attends encore la photo de ${name}.`, en: `Still waiting for the shot of ${name}.` }]);
      return;
    }
    const pool = g.camera35.subjects.map((s) => s.id).filter((id) => !MISSION_SUBJECTS.includes(id));
    const subject = pool[(this.jobsDone * 3 + 1) % pool.length];
    this.job = { subject, since: g.absHours() };
    if (cam.film <= 0) cam.film = FILM_SIZE;
    const name = this.subjectName(subject);
    g.ui.dialogue([{ who: 'Mia', lb: `Neien Optrag: e gutt Bild vun ${name}. Bei Dag, net ze wäit ewech. ${PHOTO_JOB_PAY} Frang.`, de: `Neuer Auftrag: ein gutes Bild von ${name}. Bei Tag, nicht zu weit weg. ${PHOTO_JOB_PAY} Franken.`, fr: `Nouvelle commande : une bonne photo de ${name}. De jour, pas trop loin. ${PHOTO_JOB_PAY} francs.`, en: `New job: a good shot of ${name}. In daylight, not too far away. ${PHOTO_JOB_PAY} francs.` }]);
  }

  private talkThill(): void {
    const g = this.g;
    if (this.current() === 'photograph_old_building' || this.current() === 'interview_resident' || (this.done('get_camera') && !this.done('interview_resident'))) {
      g.ui.dialogue(DIALOGUE07.thill, () => { if (!this.done('interview_resident')) this.complete('interview_resident'); });
      return;
    }
    g.ui.dialogue([{ who: 'Madame Thill', lb: this.angle === 'preserve' ? 'Merci fir den Artikel. Mäi Mann hätt sech gefreet.' : 'Moien. Dir hutt jo elo eng Kamera.', de: this.angle === 'preserve' ? 'Danke für den Artikel. Mein Mann hätte sich gefreut.' : 'Guten Tag. Sie haben ja jetzt eine Kamera.', fr: this.angle === 'preserve' ? 'Merci pour l’article. Mon mari aurait été content.' : 'Bonjour. Vous avez un appareil maintenant.', en: this.angle === 'preserve' ? 'Thank you for the article. My husband would have been pleased.' : 'Hello. So you have a camera now.' }]);
  }

  objectiveText(lang: Lang): string | null {
    const c = this.current();
    if (!c) return this.g.missions.getState(this.id) === 'Succeeded' ? OBJECTIVE_TEXT.done07[lang] : null;
    let t = OBJECTIVE_TEXT[c]?.[lang] ?? '';
    if (c === 'photograph_old_building') {
      const got = MISSION_SUBJECTS.filter((s) => this.g.camera35.hasGood(s)).length;
      t += ` (${got}/3 · Film: ${this.g.camera35.film})`;
    }
    return t;
  }

  target(): THREE.Vector3 | null {
    const c = this.current();
    if (c === 'listen_mia') return this.g.homeDoor;
    if (c === 'get_camera' || c === 'deliver_film' || c === 'decide_story') return this.mia.root.position;
    if (c === 'interview_resident') return this.thill.root.position;
    if (c === 'photograph_old_building') {
      const missing = MISSION_SUBJECTS.find((s) => !this.g.camera35.hasGood(s));
      return this.g.camera35.subjects.find((s) => s.id === missing)?.pos ?? null;
    }
    return null;
  }

  mapMarks() {
    const st = this.g.missions.getState(this.id);
    const marks: { x: number; z: number; label: string; done?: boolean }[] = [];
    if (st === 'Active' || st === 'Succeeded') marks.push({ x: this.lab.x, z: this.lab.z, label: 'Fotolabo', done: false });
    if (st === 'Active' && this.done('get_camera')) {
      for (const id of MISSION_SUBJECTS) {
        const s = this.g.camera35.subjects.find((x) => x.id === id);
        if (s) marks.push({ x: s.pos.x, z: s.pos.z, label: `Foto: ${s.name}`, done: this.g.camera35.hasGood(id) });
      }
      marks.push({ x: this.thill.root.position.x, z: this.thill.root.position.z, label: 'Mme Thill', done: this.done('interview_resident') });
    }
    if (this.job) { const s = this.g.camera35.subjects.find((x) => x.id === this.job!.subject); if (s) marks.push({ x: s.pos.x, z: s.pos.z, label: `Auftrag: ${s.name}`, done: false }); }
    return marks;
  }

  notes(lang: Lang): string {
    if (this.g.missions.getState(this.id) === 'Locked') return '';
    const cur = this.current();
    const rows: [string, boolean][] = [['listen_mia', this.done('listen_mia')], ['get_camera', this.done('get_camera')], ['photograph_old_building', this.done('photograph_old_building')], ['interview_resident', this.done('interview_resident')], ['deliver_film', this.done('deliver_film')], ['decide_story', this.done('decide_story')]];
    const items = rows.map(([k, d]) => `<div class="${d ? 'done' : k === cur ? 'cur' : ''}">${d ? '✓' : k === cur ? '→' : '·'} ${OBJECTIVE_TEXT[k][lang]}</div>`).join('');
    const cam = this.g.camera35;
    const film = cam.owned ? `<div class="small">Kamera: ${cam.film} Aufnahmen frei · auf dem Film: ${cam.photos.map((p) => `${p.n}: ${p.subject ? this.subjectName(p.subject) : '—'} (${p.quality})`).join(', ') || '—'}</div>` : '';
    return `<h3>D’STAD AM WANDEL</h3>${items}${film}`;
  }

  /** Karriere-Notiz fuer das Notizbuch (nach der Mission) */
  careerNotes(): string {
    if (this.g.missions.getState(this.id) !== 'Succeeded') return '';
    const job = this.job ? `Aktueller Auftrag: <b>${this.subjectName(this.job.subject)}</b> (${PHOTO_JOB_PAY} F)` : 'Neuen Auftrag bei Mia holen (Fotolabo, Mo–Sa 9–18 Uhr)';
    return `<h3 style="margin-top:14px">FOTOGRAF · MIA FELLER</h3><div class="small">${job} · erledigt: ${this.jobsDone} · Film: ${this.g.camera35.film}</div>`;
  }

  update(): void {
    const g = this.g;
    if (g.missions.getState(this.id) === 'Active' && !this.messageLeft && this.current() === 'listen_mia') {
      const prev = Number(g.flags['m06.done_at'] ?? NaN);
      if (!Number.isFinite(prev) || g.absHours() >= prev + 1) {
        g.phoneNet.leaveMessage(NUMBERS.home, { date: g.clock.getDate(), hour: g.clock.getHour(), minute: g.clock.getMinute(), fromNumber: '49 05 81', text: 'Mia: Projet', dialogueId: MSG_MIA });
        this.messageLeft = true;
      }
    }
    if (this.current() === 'photograph_old_building' && MISSION_SUBJECTS.every((s) => g.camera35.hasGood(s))) this.complete('photograph_old_building');
    this.mia.root.visible = this.open();
    const h = g.clock.getHourLocal();
    this.thill.root.visible = h >= 8 && h < 19;
  }

  onMessageHeard(id: string): void {
    if (id === MSG_MIA && this.current() === 'listen_mia') this.complete('listen_mia');
  }

  save(): SaveData {
    return { 'm07.msg': this.messageLeft ? '1' : '0', 'm07.angle': this.angle, 'm07.job': this.job ? `${this.job.subject},${this.job.since}` : '', 'm07.jobs': String(this.jobsDone) };
  }

  load(d: SaveData): void {
    this.messageLeft = d['m07.msg'] === '1';
    this.angle = d['m07.angle'] ?? '';
    const [subject, since] = (d['m07.job'] ?? '').split(',');
    this.job = subject ? { subject, since: Number(since) || 0 } : null;
    this.jobsDone = Number(d['m07.jobs'] ?? 0) || 0;
    if (this.messageLeft && this.current() === 'listen_mia') this.messageLeft = false;
  }
}
