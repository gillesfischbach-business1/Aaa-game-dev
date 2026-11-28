// Touch-Test auf nachgebildetem Handy: Joystick laufen, Umsehen, E-Knopf, Notizbuch-Knopf.
// Aufruf: node tests/e2e/touch.mjs <URL> <AUSGABEORDNER>
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? '.';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
let failures = 0;
const check = (n, c, i = '') => { console.log(`${c ? ' OK ' : 'FAIL'}  ${n}${i ? '  ' + i : ''}`); if (!c) failures++; };
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url + '?autostart&quality=low');
await page.waitForFunction(() => window.__lux98?.running, null, { timeout: 120000 });
check('Touch-Steuerung sichtbar', await page.isVisible('#touch .tbtns'));
const g = (fn, a) => page.evaluate(fn, a);
const ptr = (sel, type, x, y, id = 1) => g(([sel, type, x, y, id]) => document.querySelector(sel).dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: id, pointerType: 'touch', bubbles: true })), [sel, type, x, y, id]);
// Intro mit E-Knopf wegtippen
for (let i = 0; i < 4 && await page.isVisible('#dialogue'); i++) { await page.tap('#touch button.main'); await page.waitForTimeout(150); }
check('Dialog per E-Knopf weiter', !(await page.isVisible('#dialogue')));
const p0 = await g(() => window.__lux98.pos.toArray());
await ptr('#movezone', 'pointerdown', 90, 640);
await ptr('#movezone', 'pointermove', 90, 570);
await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/14_touch.png` });
await page.waitForTimeout(2500);
await ptr('#movezone', 'pointerup', 90, 570);
const p1 = await g(() => window.__lux98.pos.toArray());
const moved = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
check('Joystick bewegt die Figur', moved > 0.5, `${moved.toFixed(1)} m`);
const yaw0 = await g(() => window.__lux98.camYaw);
await ptr('#lookzone', 'pointerdown', 300, 400, 2);
await ptr('#lookzone', 'pointermove', 240, 400, 2);
await page.waitForTimeout(400);
await ptr('#lookzone', 'pointerup', 240, 400, 2);
check('Wischen dreht die Kamera', Math.abs((await g(() => window.__lux98.camYaw)) - yaw0) > 0.05);
await page.tap('#touch button[data-tap="notebook"]'); await page.waitForTimeout(300);
check('Notizbuch per Knopf', await page.isVisible('#notebook'));
await page.screenshot({ path: `${out}/15_touch_notebook.png` });
await page.tap('#nb nav .close');
await page.waitForTimeout(200);
check('Notizbuch mit "Zou" zu, Steuerung wieder frei', !(await page.isVisible('#notebook')) && await g(() => window.__lux98.input.enabled));
// Telefonzelle per Hinweis antippen
await g(() => { const x = window.__lux98; x.pos.copy(x.booths[0]).add({ x: 1.2, y: 0, z: 0.4 }); });
await page.waitForFunction(() => !document.getElementById('prompt').classList.contains('hidden'), null, { timeout: 15000 });
await page.tap('#prompt'); await page.waitForTimeout(300);
check('Hinweis antippen oeffnet Telefon', await page.isVisible('#phone'));
check('Keine horizontale Scrollleiste', await g(() => document.documentElement.scrollWidth <= window.innerWidth));
console.log('Konsolenfehler:', errors.length ? errors : 'keine');
await browser.close();
process.exit(errors.length || failures ? 1 : 0);
