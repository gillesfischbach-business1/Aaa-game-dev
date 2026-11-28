import type { City } from '../world/city';
import type { Lang, Line } from './story';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export class UI {
  lang: Lang = 'de';
  private dialogueQueue: Line[] = [];
  private dialogueDone: (() => void) | null = null;
  private toastTimer = 0;

  constructor() {
    $('dialogue').addEventListener('click', () => this.advanceDialogue());
  }

  show(id: string, on: boolean): void { $(id).classList.toggle('hidden', !on); }
  isOpen(id: string): boolean { return !$(id).classList.contains('hidden'); }

  setClock(text: string, extra: string): void { $('clock').textContent = text + (extra ? `  ·  ${extra}` : ''); }
  setMoney(cash: string, bank: string): void { $('money').innerHTML = `Portmonni <b>${cash}</b> &nbsp;·&nbsp; Konto ${bank}`; }
  setObjective(text: string): void { $('notetext').textContent = text; }

  prompt(text: string | null): void {
    const p = $('prompt');
    if (!text) { p.classList.add('hidden'); return; }
    p.innerHTML = `<kbd>E</kbd>${text}`;
    p.classList.remove('hidden');
  }

  toast(text: string, ms = 2600): void {
    const t = $('toast');
    t.textContent = text;
    t.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.classList.add('hidden'), ms);
  }

  // ---- Dialoge: Luxemburgisch + gewaehlte Untertitelsprache ----
  get inDialogue(): boolean { return this.isOpen('dialogue'); }

  dialogue(lines: Line[], done?: () => void): void {
    this.dialogueQueue = [...lines];
    this.dialogueDone = done ?? null;
    this.show('dialogue', true);
    this.renderLine();
  }

  advanceDialogue(): void {
    if (!this.inDialogue) return;
    this.dialogueQueue.shift();
    if (this.dialogueQueue.length) { this.renderLine(); return; }
    this.show('dialogue', false);
    const d = this.dialogueDone;
    this.dialogueDone = null;
    d?.();
  }

  private renderLine(): void {
    const l = this.dialogueQueue[0];
    const box = $('dialogue');
    (box.querySelector('.who') as HTMLElement).textContent = l.who;
    (box.querySelector('.lb') as HTMLElement).textContent = l.lb;
    (box.querySelector('.sub') as HTMLElement).textContent = l[this.lang];
  }

  // ---- Tacho ----
  drawSpeedo(kmh: number, fuelFrac: number, damage: number, name: string, lights: boolean): void {
    const c = $<HTMLCanvasElement>('speedo');
    const g = c.getContext('2d')!;
    const S = c.width, cx = S / 2, cy = S / 2, R = S * 0.44;
    g.clearRect(0, 0, S, S);
    g.fillStyle = 'rgba(14,16,20,0.72)';
    g.beginPath(); g.arc(cx, cy, R + 10, 0, Math.PI * 2); g.fill();
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, max = 200;
    g.strokeStyle = '#ece6d6'; g.fillStyle = '#ece6d6'; g.lineWidth = 3;
    g.font = '20px IBM Plex Sans, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let v = 0; v <= max; v += 10) {
      const a = a0 + (a1 - a0) * (v / max);
      const inner = v % 20 === 0 ? R - 22 : R - 12;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke();
      if (v % 40 === 0) g.fillText(String(v), cx + Math.cos(a) * (R - 44), cy + Math.sin(a) * (R - 44));
    }
    const a = a0 + (a1 - a0) * Math.min(kmh / max, 1);
    g.strokeStyle = '#e04a2a'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (R - 16), cy + Math.sin(a) * (R - 16)); g.stroke();
    g.fillStyle = '#ece6d6'; g.font = '16px IBM Plex Sans'; g.fillText('km/h', cx, cy + 52);
    g.font = 'bold 30px IBM Plex Sans'; g.fillText(String(Math.round(kmh)), cx, cy + 26);
    // Tankanzeige
    g.strokeStyle = '#555'; g.lineWidth = 8;
    g.beginPath(); g.arc(cx, cy, R - 62, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    g.strokeStyle = fuelFrac < 0.15 ? '#e0a020' : '#9fb08a';
    g.beginPath(); g.arc(cx, cy, R - 62, Math.PI * 1.15, Math.PI * (1.15 + 0.7 * fuelFrac)); g.stroke();
    const info = $('carinfo');
    info.innerHTML = `${name}<br/>Tank ${Math.round(fuelFrac * 100)} % · Zustand ${Math.round(100 - damage)} %${lights ? ' · Licht' : ''}`;
  }

  // ---- Notizbuch ----
  bindNotebook(render: (page: string) => void): void {
    $('nb').querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => {
      const btn = b as HTMLButtonElement;
      if (btn.dataset.close) { this.show('notebook', false); return; }
      $('nb').querySelectorAll('nav button').forEach((x) => x.classList.remove('on'));
      btn.classList.add('on');
      render(btn.dataset.page!);
    }));
  }
  notebookBody(): HTMLElement { return $('nbbody'); }
}

// Handgezeichneter Stadtplan im Notizbuch
export function drawMap(canvas: HTMLCanvasElement, city: City, player: { x: number; z: number; heading: number },
  marks: { x: number; z: number; label: string; done?: boolean }[], view: { cx: number; cz: number; scale: number }): void {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const g = canvas.getContext('2d')!;
  g.scale(dpr, dpr);
  g.fillStyle = '#efe6cf'; g.fillRect(0, 0, W, H);
  const tx = (x: number) => W / 2 + (x - view.cx) * view.scale;
  const tz = (z: number) => H / 2 + (z - view.cz) * view.scale;
  // Gelaende: Taeler dunkler schraffiert
  const t = city.terrain;
  const step = Math.max(1, Math.round(6 / view.scale / t.step));
  for (let r = 0; r < t.rows; r += step) for (let c = 0; c < t.cols; c += step) {
    const h = t.heights[r * t.cols + c];
    const k = Math.min(Math.max((310 - h) / 60, 0), 1);
    if (k < 0.1) continue;
    g.fillStyle = `rgba(110, 125, 90, ${k * 0.35})`;
    g.fillRect(tx(t.x0 + c * t.step), tz(t.z0 + r * t.step), t.step * step * view.scale + 1, t.step * step * view.scale + 1);
  }
  g.fillStyle = 'rgba(90, 80, 70, 0.28)';
  for (const fp of city.buildingFootprints) {
    g.beginPath();
    fp.forEach(([x, z], i) => (i ? g.lineTo(tx(x), tz(z)) : g.moveTo(tx(x), tz(z))));
    g.closePath(); g.fill();
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const l of city.drivable) {
    g.strokeStyle = l.width >= 8 ? '#3b4258' : '#6a6f80';
    g.lineWidth = Math.max(1, l.width * view.scale * 0.7);
    g.beginPath();
    l.pts.forEach((p, i) => (i ? g.lineTo(tx(p.x), tz(p.z)) : g.moveTo(tx(p.x), tz(p.z))));
    g.stroke();
  }
  // Strassennamen der Hauptstrassen (einmal je Name)
  g.font = '15px Caveat, cursive'; g.fillStyle = '#1f2a44';
  const seen = new Set<string>();
  for (const l of city.drivable) {
    if (!l.name || seen.has(l.name) || l.width < 7 || l.pts.length < 2) continue;
    seen.add(l.name);
    const m = l.pts[Math.floor(l.pts.length / 2)];
    g.fillText(l.name, tx(m.x) + 4, tz(m.z) - 4);
  }
  // Handschriftliche Markierungen
  for (const mk of marks) {
    g.strokeStyle = mk.done ? 'rgba(68, 80, 107, 0.5)' : '#a33a2c';
    g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(tx(mk.x), tz(mk.z), 16, 12, -0.2, 0, Math.PI * 1.9); g.stroke();
    g.fillStyle = mk.done ? '#44506b' : '#a33a2c';
    g.font = '20px Caveat, cursive';
    g.fillText(mk.label, tx(mk.x) + 20, tz(mk.z) + 6);
  }
  // Spieler
  g.save();
  g.translate(tx(player.x), tz(player.z));
  g.rotate(-player.heading);
  g.fillStyle = '#1f2a44';
  g.beginPath(); g.moveTo(0, -10); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill();
  g.restore();
  g.fillStyle = '#44506b'; g.font = '12px IBM Plex Sans';
  g.fillText('N ↑   Ziehen = verschieben · Mausrad = Zoom', 10, H - 10);
}
