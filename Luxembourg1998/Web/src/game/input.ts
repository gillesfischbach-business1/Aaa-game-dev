// Tastatur, Maus (Pointer Lock) und Gamepad. Tastenbelegung zentral, damit sie spaeter einstellbar ist.

export const KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  interact: ['KeyE'],
  view: ['KeyV'],
  notebook: ['Tab', 'KeyJ'],
  time: ['KeyT'],
  nav: ['KeyN'],
  rain: ['KeyR'],
  lights: ['KeyL'],
  save: ['F5'],
  load: ['F9'],
  pause: ['Escape', 'KeyP'],
} as const;

export type Action = keyof typeof KEYS;

export class Input {
  private down = new Set<string>();
  private pressed = new Set<Action>();
  mouseDX = 0;
  mouseDY = 0;
  locked = false;
  enabled = true;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.code === 'Tab' || e.code === 'F5' || e.code === 'F9' || e.code === 'Space') e.preventDefault();
      if (!e.repeat) {
        for (const [action, codes] of Object.entries(KEYS) as [Action, readonly string[]][]) {
          if (codes.includes(e.code)) this.pressed.add(action);
        }
      }
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
    document.addEventListener('mousemove', (e) => {
      // Mit Pointer Lock: freie Maus. Ohne (z. B. eingebettet): mit gedrueckter Maustaste ziehen.
      if (!this.locked && !(e.buttons & 1 && e.target === this.canvas)) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === this.canvas; });
  }

  requestLock(): void {
    // In eingebetteten Seiten (iframe) kann Pointer Lock verboten sein -> dann Maus per Ziehen
    try {
      const r = this.canvas.requestPointerLock?.() as unknown;
      if (r instanceof Promise) r.catch(() => { /* ohne Nutzergeste nicht erlaubt -> Maus per Ziehen */ });
    } catch { /* ignorieren */ }
  }

  held(action: Action): boolean {
    if (!this.enabled) return false;
    return KEYS[action].some((c) => this.down.has(c)) || this.padHeld(action);
  }

  // true genau einmal pro Tastendruck
  consume(action: Action): boolean {
    const had = this.pressed.has(action);
    this.pressed.delete(action);
    return had;
  }

  axis(neg: Action, pos: Action): number {
    const pad = this.padAxis(neg, pos);
    if (Math.abs(pad) > 0.15) return pad;
    return (this.held(pos) ? 1 : 0) - (this.held(neg) ? 1 : 0);
  }

  takeMouse(): [number, number] {
    const d: [number, number] = [this.mouseDX, this.mouseDY];
    this.mouseDX = this.mouseDY = 0;
    const pad = this.pad();
    if (pad) {
      const rx = Math.abs(pad.axes[2] ?? 0) > 0.15 ? pad.axes[2] : 0;
      const ry = Math.abs(pad.axes[3] ?? 0) > 0.15 ? pad.axes[3] : 0;
      d[0] += rx * 12;
      d[1] += ry * 12;
    }
    return d;
  }

  // ---- Gamepad (Standard-Belegung) ----
  private lastButtons: boolean[] = [];
  private pad(): Gamepad | null {
    const pads = navigator.getGamepads?.() ?? [];
    for (const p of pads) if (p) return p;
    return null;
  }
  private padHeld(action: Action): boolean {
    const p = this.pad();
    if (!p) return false;
    const b = (i: number) => !!p.buttons[i]?.pressed;
    switch (action) {
      case 'sprint': return b(10) || b(4);
      case 'jump': return b(0);
      case 'forward': return (p.buttons[7]?.value ?? 0) > 0.2;
      case 'back': return (p.buttons[6]?.value ?? 0) > 0.2;
      default: return false;
    }
  }
  private padAxis(neg: Action, pos: Action): number {
    const p = this.pad();
    if (!p) return 0;
    if (neg === 'left' && pos === 'right') return p.axes[0] ?? 0;
    if (neg === 'back' && pos === 'forward') return -(p.axes[1] ?? 0);
    return 0;
  }
  pollPadButtons(): void {
    const p = this.pad();
    if (!p) return;
    const map: [number, Action][] = [[2, 'interact'], [3, 'view'], [8, 'notebook'], [9, 'pause'], [1, 'lights']];
    for (const [i, action] of map) {
      const now = !!p.buttons[i]?.pressed;
      if (now && !this.lastButtons[i]) this.pressed.add(action);
      this.lastButtons[i] = now;
    }
  }
}
