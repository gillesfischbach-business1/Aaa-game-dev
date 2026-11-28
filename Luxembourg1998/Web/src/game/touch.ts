import type { Action, Input } from './input';

// Touch-Steuerung fuer Handy/Tablet (Pointer Events, damit auch Stift und Tests funktionieren):
// linke Haelfte = Joystick (erscheint dort, wo der Daumen aufsetzt), rechte Haelfte = Umsehen, Knoepfe rechts unten.
export function isTouchDevice(): boolean {
  return (window.matchMedia?.('(pointer: coarse)').matches ?? false) || 'ontouchstart' in window || new URLSearchParams(location.search).has('touch');
}

export function setupTouch(input: Input, onTap: (a: Action) => void): void {
  document.body.classList.add('touch');
  const root = document.getElementById('touch')!;
  root.classList.remove('hidden');
  const stick = document.getElementById('stick')!, knob = document.getElementById('knob')!;
  const lookZone = document.getElementById('lookzone')!, moveZone = document.getElementById('movezone')!;
  const R = 56;
  let moveId: number | null = null, cx = 0, cy = 0;
  moveZone.addEventListener('pointerdown', (e) => {
    if (moveId !== null) return;
    moveId = e.pointerId; cx = e.clientX; cy = e.clientY;
    try { moveZone.setPointerCapture(e.pointerId); } catch { /* z. B. kuenstliche Ereignisse */ }
    stick.style.left = `${cx - R}px`; stick.style.top = `${cy - R}px`;
    stick.classList.add('on');
    knob.style.transform = 'translate(0px, 0px)';
  });
  moveZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== moveId) return;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.touchAxis.x = dx / R;
    input.touchAxis.y = -dy / R;
  });
  const endMove = (e: PointerEvent) => {
    if (e.pointerId !== moveId) return;
    moveId = null;
    input.touchAxis.x = input.touchAxis.y = 0;
    stick.classList.remove('on');
  };
  moveZone.addEventListener('pointerup', endMove);
  moveZone.addEventListener('pointercancel', endMove);

  let lookId: number | null = null, lx = 0, ly = 0;
  lookZone.addEventListener('pointerdown', (e) => { if (lookId === null) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; try { lookZone.setPointerCapture(e.pointerId); } catch { /* egal */ } } });
  lookZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookId) return;
    input.mouseDX += (e.clientX - lx) * 1.6;
    input.mouseDY += (e.clientY - ly) * 1.6;
    lx = e.clientX; ly = e.clientY;
  });
  const endLook = (e: PointerEvent) => { if (e.pointerId === lookId) lookId = null; };
  lookZone.addEventListener('pointerup', endLook);
  lookZone.addEventListener('pointercancel', endLook);

  // Knoepfe: data-tap = einmal ausloesen, data-hold = gedrueckt halten
  root.querySelectorAll<HTMLButtonElement>('button[data-tap]').forEach((b) => {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onTap(b.dataset.tap as Action); });
  });
  root.querySelectorAll<HTMLButtonElement>('button[data-hold]').forEach((b) => {
    const a = b.dataset.hold as Action;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); input.touchHeld.add(a); b.classList.add('on'); });
    const up = () => { input.touchHeld.delete(a); b.classList.remove('on'); };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
  });
  // Hinweis "E ..." antippen = interagieren
  const prompt = document.getElementById('prompt')!;
  prompt.style.pointerEvents = 'auto';
  prompt.addEventListener('pointerdown', (e) => { e.preventDefault(); onTap('interact'); });
}
