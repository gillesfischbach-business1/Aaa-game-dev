import worldData from './data/world.json';
import { Game, type Quality } from './game/game';
import { isTouchDevice, setupTouch } from './game/touch';
import type { Lang } from './game/story';
import type { WorldData } from './world/types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function detectQuality(choice: string): Quality {
  if (choice === 'high' || choice === 'low') return choice;
  if (new URLSearchParams(location.search).has('low')) return 'low';
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const name = ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|software/i.test(name)) return 'low';
  } catch { /* egal */ }
  return (navigator.hardwareConcurrency ?? 4) <= 4 || /Mobi|Android/i.test(navigator.userAgent) ? 'low' : 'high';
}

function boot(): void {
  const params = new URLSearchParams(location.search);
  const langSel = $<HTMLSelectElement>('optLang');
  const qualSel = $<HTMLSelectElement>('optQuality');
  try {
    langSel.value = localStorage.getItem('lux98.lang') ?? 'de';
    qualSel.value = localStorage.getItem('lux98.quality') ?? 'auto';
  } catch { /* privates Fenster */ }
  const quality = detectQuality(params.get('quality') ?? qualSel.value);
  // Stadt schon im Hintergrund bauen, waehrend der Titelbildschirm sichtbar ist
  const game = new Game($<HTMLCanvasElement>('game'), worldData as unknown as WorldData, quality, langSel.value as Lang);
  (window as unknown as { __lux98: Game }).__lux98 = game;
  game.start();
  $('loading').textContent = `Bereit · Grafik: ${quality === 'high' ? 'hoch' : 'niedrig'}`;
  const btnNew = $<HTMLButtonElement>('btnNew'), btnCont = $<HTMLButtonElement>('btnContinue');
  btnNew.disabled = false;
  if (isTouchDevice() && window.innerWidth < window.innerHeight) $('rotateHint').classList.remove('hidden');
  btnCont.disabled = !Game.hasSave();

  const begin = () => {
    try {
      localStorage.setItem('lux98.lang', langSel.value);
      localStorage.setItem('lux98.quality', qualSel.value);
    } catch { /* egal */ }
    game.ui.lang = langSel.value as Lang;
    game.navHelp = $<HTMLInputElement>('optNav').checked;
    $('start').classList.add('hidden');
    if (isTouchDevice()) {
      setupTouch(game.input, (a) => {
        if (a === 'pause') { game.setPaused(true); return; }
        if (a === 'notebook' && game.ui.isOpen('notebook')) { game.toggleNotebook(); return; }
        if (a === 'interact' && game.ui.inDialogue) { game.ui.advanceDialogue(); return; }
        game.input.press(a);
      });
    } else game.input.requestLock();
  };
  btnNew.onclick = () => { begin(); game.newGame(); };
  btnCont.onclick = () => { begin(); if (!game.load()) game.newGame(); };
  $('btnResume').onclick = () => { game.setPaused(false); if (!isTouchDevice()) game.input.requestLock(); };
  $('btnSave').onclick = () => game.save();
  $('btnLoad').onclick = () => { game.load(); game.setPaused(false); };
  $('game').addEventListener('click', () => { if (game.running && !game.ui.inDialogue && !isTouchDevice()) game.input.requestLock(); });
  if (params.has('autostart')) { begin(); game.newGame(); }
}

boot();
