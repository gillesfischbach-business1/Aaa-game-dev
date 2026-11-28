import { dayOfWeek } from '../core/calendar';
import { formatLuf } from '../core/economy';
import type { SaveData } from '../core/save';
import type { Game } from './game';
import { NUMBERS, type Lang, type Line } from './story';

// Karriere Mechaniker in der Garage Muller: Schichten Mo-Fr, Arbeitsbeginn 8 Uhr, Lohn aufs Konto.
// Lohnhoehe ist Spielbalance (Kategorie D), keine historische Angabe.
export const SHIFT = { start: 8, lateAfter: 8.25, lastStart: 12, end: 17, basePay: 2200, mistakePenalty: 300, latePenalty: 500, minPay: 1200 };
const MSG_OFFER = 'DLG_MULLER_OFFER';

interface Job { title: string; hint: string; steps: Record<string, string>; order: string[]; extra: string[] }

const JOBS: Job[] = [
  {
    title: 'Ölwechsel – grauer Kompaktwagen',
    hint: 'Altes Öl warm ablassen, Filter neu, Schraube rein, erst dann neues Öl – und zum Schluss den Stand prüfen.',
    steps: { lift: 'Wagen auf die Hebebühne', drain: 'Altes Öl ablassen', filter: 'Ölfilter wechseln', plug: 'Ablassschraube eindrehen', lower: 'Wagen herunterlassen', fill: 'Neues Öl einfüllen', check: 'Ölstand prüfen', tyres: 'Reifendruck prüfen', wash: 'Wagen waschen' },
    order: ['lift', 'drain', 'filter', 'plug', 'lower', 'fill', 'check'], extra: ['tyres', 'wash'],
  },
  {
    title: 'Sommerreifen – blaue Limousine',
    hint: 'April: Winterreifen runter, Sommerreifen drauf. Neue Reifen müssen ausgewuchtet werden, bevor sie ans Auto kommen.',
    steps: { lift: 'Wagen auf die Hebebühne', off: 'Winterräder abschrauben', mount: 'Sommerreifen auf Felgen ziehen', balance: 'Räder auswuchten', on: 'Sommerräder anschrauben', lower: 'Wagen herunterlassen', torque: 'Radmuttern nachziehen', oil: 'Ölstand prüfen', wipers: 'Scheibenwischer tauschen' },
    order: ['lift', 'off', 'mount', 'balance', 'on', 'lower', 'torque'], extra: ['oil', 'wipers'],
  },
  {
    title: 'Zündkerzen – Kombi mit Startproblemen',
    hint: 'Motor muss kalt sein. Alte Kerzen raus, bei den neuen den Elektrodenabstand prüfen, einsetzen, Stecker drauf, Probelauf.',
    steps: { hood: 'Motorhaube öffnen', caps: 'Zündkabel abziehen', out: 'Alte Zündkerzen herausdrehen', gap: 'Elektrodenabstand prüfen', in: 'Neue Zündkerzen eindrehen', caps_on: 'Zündkabel aufstecken', test: 'Probelauf', battery: 'Batterie ausbauen', fuel: 'Tank leeren' },
    order: ['hood', 'caps', 'out', 'gap', 'in', 'caps_on', 'test'], extra: ['battery', 'fuel'],
  },
];

const L = (lb: string, de: string, fr: string, en: string): Line => ({ who: 'Här Muller', lb, de, fr, en });

export class Career {
  daysWorked = 0;
  lastDay = -1;
  totalEarned = 0;
  private offerSent = false;

  constructor(private g: Game) {
    g.registerMessage(MSG_OFFER, [{ who: 'Äntwerter', lb: 'Muller hei. Ech hu mer et iwwerluecht: Dir kënnt bei mir schaffen. Méindes bis freides, aacht Auer. Net ze spéit!', de: 'Muller hier. Ich habe es mir überlegt: Sie können bei mir arbeiten. Montag bis Freitag, acht Uhr. Nicht zu spät!', fr: 'Ici Muller. J’ai réfléchi : vous pouvez travailler chez moi. Du lundi au vendredi, huit heures. Pas en retard !', en: 'Muller here. I thought it over: you can work for me. Monday to Friday, eight o’clock. Don’t be late!' }]);
  }

  get hired(): boolean { return this.g.flags['career.mechanic'] === 'job_offer'; }
  private today(): number { return Math.floor(this.g.absHours() / 24); }

  canStartShift(): boolean {
    const d = this.g.clock.getDate(), h = this.g.clock.getHourLocal();
    return this.hired && dayOfWeek(d) < 5 && h >= 7 && h < SHIFT.lastStart && this.lastDay !== this.today();
  }

  label(): string | null {
    if (!this.hired || this.g.mode !== 'walk') return null;
    return this.canStartShift() ? 'Schicht ufänken (Garage Muller)' : 'Mam Här Muller schwätzen';
  }

  talk(): void {
    const g = this.g;
    if (g.m08.tryTalk('muller')) return;
    if (!this.canStartShift()) {
      const d = g.clock.getDate(), wd = dayOfWeek(d);
      const line = this.lastDay === this.today()
        ? L('Fir haut ass et gutt. Bis muer!', 'Für heute ist es gut. Bis morgen!', 'C’est bon pour aujourd’hui. À demain !', 'That’s it for today. See you tomorrow!')
        : wd >= 5
          ? L('Am Weekend schaffe mer net. Méindes um aacht.', 'Am Wochenende arbeiten wir nicht. Montag um acht.', 'Le week-end on ne travaille pas. Lundi à huit heures.', 'We don’t work weekends. Monday at eight.')
          : L('Ze spéit fir haut. Muer um aacht Auer!', 'Zu spät für heute. Morgen um acht!', 'Trop tard pour aujourd’hui. Demain à huit heures !', 'Too late for today. Tomorrow at eight!');
      g.ui.dialogue([line]);
      return;
    }
    const late = g.clock.getHourLocal() > SHIFT.lateAfter;
    const intro = late
      ? L('Dir sidd ze spéit. Dat geet vum Loun of.', 'Sie sind zu spät. Das geht vom Lohn ab.', 'Vous êtes en retard. Ce sera retenu sur la paie.', 'You’re late. That comes out of your pay.')
      : L('Moien. Zwee Autoen fir Iech haut.', 'Guten Morgen. Zwei Wagen für Sie heute.', 'Bonjour. Deux voitures pour vous aujourd’hui.', 'Morning. Two cars for you today.');
    this.lastDay = this.today();
    if (late) g.reputation -= 1;
    g.ui.dialogue([intro], () => this.runShift(late));
  }

  private runShift(late: boolean): void {
    const g = this.g;
    const first = (this.daysWorked * 2) % JOBS.length;
    const jobs = [JOBS[first], JOBS[(first + 1) % JOBS.length]];
    let mistakes = 0;
    const next = (i: number) => {
      if (i >= jobs.length) { this.finishShift(late, mistakes); return; }
      const j = jobs[i];
      const steps = [...j.order, ...j.extra].map((id) => ({ id, label: j.steps[id] })).sort((a, b) => a.label.localeCompare(b.label, 'de'));
      g.input.enabled = false;
      document.exitPointerLock?.();
      g.ui.workshop(`Auftrag ${i + 1}/2: ${j.title}`, j.hint, steps, j.order, (ok) => { if (ok) g.advanceMinutes(20); else mistakes++; }, () => { g.input.enabled = true; next(i + 1); });
    };
    next(0);
  }

  private finishShift(late: boolean, mistakes: number): void {
    const g = this.g;
    // Feierabend: Uhr auf 17 Uhr (falls nicht schon spaeter)
    if (g.clock.getHourLocal() < SHIFT.end) g.clock.setDateTime(g.clock.getDate(), SHIFT.end);
    const pay = Math.max(SHIFT.minPay, SHIFT.basePay - mistakes * SHIFT.mistakePenalty - (late ? SHIFT.latePenalty : 0));
    g.wallet.receiveSalary(pay, g.clock.getDate(), 'Lohn Garage Muller');
    this.daysWorked++;
    this.totalEarned += pay;
    if (mistakes === 0 && !late) g.reputation += 1;
    const verdict = mistakes === 0
      ? L('Proper geschafft. Esou gefält mer dat.', 'Sauber gearbeitet. So gefällt mir das.', 'Du travail propre. C’est comme ça que j’aime.', 'Clean work. That’s how I like it.')
      : L('Et geet. Mee kuckt Iech d’Reiefolleg méi genau un.', 'Es geht. Aber achten Sie genauer auf die Reihenfolge.', 'Ça va. Mais faites plus attention à l’ordre.', 'It’s okay. But watch the order more carefully.');
    g.ui.dialogue([verdict], () => {
      g.ui.toast(`Feierabend · Lohn ${formatLuf(pay)} aufs Konto · ${this.daysWorked} Arbeitstag(e)`, 4500);
      g.save();
    });
  }

  update(): void {
    const g = this.g;
    // Nach der Abkuerzung: Muller meldet sich einen Tag spaeter doch noch
    if (g.flags['career.mechanic'] === 'maybe' && !this.offerSent) {
      const doneAt = Number(g.flags['m02.done_at'] ?? NaN);
      if (Number.isFinite(doneAt) && g.absHours() >= doneAt + 24) {
        g.phoneNet.leaveMessage(NUMBERS.home, { date: g.clock.getDate(), hour: g.clock.getHour(), minute: g.clock.getMinute(), fromNumber: NUMBERS.garage, text: 'Muller: Stelle', dialogueId: MSG_OFFER });
        this.offerSent = true;
      }
    }
  }

  onMessageHeard(id: string): void {
    if (id === MSG_OFFER) this.g.flags['career.mechanic'] = 'job_offer';
  }

  notes(_lang: Lang): string {
    if (!this.hired) return this.g.flags['career.mechanic'] === 'maybe' ? '<div class="small">Garage Muller: „mol kucken …“ – vielleicht meldet er sich.</div>' : '';
    return `<h3 style="margin-top:14px">AARBECHT · GARAGE MULLER</h3><div class="small">Mo–Fr ab 8 Uhr (spätestens 8:15 für vollen Lohn) · ${formatLuf(SHIFT.basePay)} pro Tag aufs Konto<br/>Gearbeitet: ${this.daysWorked} Tag(e) · verdient: ${formatLuf(this.totalEarned)}</div>`;
  }

  save(): SaveData {
    return { 'career.days': String(this.daysWorked), 'career.last_day': String(this.lastDay), 'career.total': String(this.totalEarned), 'career.offer_sent': this.offerSent ? '1' : '0' };
  }

  load(d: SaveData): void {
    this.daysWorked = Number(d['career.days'] ?? 0) || 0;
    this.lastDay = Number(d['career.last_day'] ?? -1);
    this.totalEarned = Number(d['career.total'] ?? 0) || 0;
    this.offerSent = d['career.offer_sent'] === '1';
  }
}
