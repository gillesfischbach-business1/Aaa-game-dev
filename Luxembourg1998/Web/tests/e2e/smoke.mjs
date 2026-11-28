// Rauchtest: Spiel starten, Konsole auf Fehler pruefen, Mission 01 per Spielzustand durchlaufen, Fotos.
// Aufruf: node tests/e2e/smoke.mjs <URL> <AUSGABEORDNER>
import { createRequire } from 'node:module';
// Playwright ist in der Cloud-Umgebung global vorinstalliert (NODE_PATH); lokal: npm i -D playwright
const { chromium } = createRequire(import.meta.url)('playwright');

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? '.';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
const t0 = Date.now();
await page.goto(url + '?autostart&quality=low');
await page.waitForFunction(() => window.__lux98?.running, null, { timeout: 120000 });
console.log('Start nach', Date.now() - t0, 'ms');
const g = (fn, arg) => page.evaluate(fn, arg);
// Dialog weiterklicken, bis er geschlossen ist
const advance = async () => {
  for (let i = 0; i < 12 && await page.isVisible('#dialogue'); i++) { await page.keyboard.press('e'); await page.waitForTimeout(120); }
};
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/01_intro.png` });
// Intro wegklicken
await advance();
const state = () => g(() => { const x = window.__lux98; return { obj: x.currentObjective(), mode: x.mode, pos: x.pos.toArray().map(Math.round), cash: x.wallet.getCash(), clock: x.clock.toString() }; });
console.log('nach Intro', await state());
// Laufen (W halten)
await page.keyboard.down('w'); await page.waitForTimeout(2500); await page.keyboard.up('w');
console.log('nach Laufen', await state());
await page.screenshot({ path: `${out}/02_gare.png` });
// Zur Telefonzelle teleportieren und anrufen ueber die echte Oberflaeche
await g(() => { const x = window.__lux98; x.pos.copy(x['booths'][0]).add({ x: 0, y: 0, z: 1.5 }); });
await page.waitForTimeout(300);
await page.keyboard.press('e');
await page.waitForTimeout(300);
const phoneOpen = await page.isVisible('#phone');
console.log('Telefon offen:', phoneOpen);
await page.click('#pcoins button:nth-child(2)'); // 20 F
for (const d of '486127') await page.keyboard.press('Digit' + d);
await page.screenshot({ path: `${out}/03_phone.png` });
await page.click('#pactions .call');
await page.waitForTimeout(200); await advance();
console.log('nach Anruf', await state());
// Madame Weis (Uhrzeit ggf. auf 9 Uhr stellen, Buero oeffnet um 8)
await g(() => { const x = window.__lux98; x.clock.setDateTime(x.clock.getDate(), 9); x.pos.copy(x['weis'].root.position).add({ x: 1, y: 0, z: 0 }); });
await page.waitForTimeout(300); await page.keyboard.press('e');
await page.waitForTimeout(200); await advance();
console.log('nach Weis', await state());
// Auto
await g(() => { const x = window.__lux98; x.pos.copy(x.car.pos).add({ x: 2.2, y: 0, z: 0 }); });
await page.waitForTimeout(300); await page.keyboard.press('e');
await page.waitForTimeout(200); await advance();
console.log('nach Auto', await state());
await page.keyboard.down('w'); await page.waitForTimeout(3000); await page.keyboard.up('w');
const drive = await g(() => { const x = window.__lux98; return { kmh: Math.round(x.car.kmh), fuel: x.car.fuel.toFixed(2), dmg: Math.round(x.car.damage), pos: x.car.pos.toArray().map(Math.round) }; });
console.log('Fahrt', drive);
await page.screenshot({ path: `${out}/04_drive.png` });
// Aussteigen, zu Jang
await g(() => { const x = window.__lux98; x.car.speed = 0; });
await page.waitForTimeout(200); await page.keyboard.press('e');
await g(() => { const x = window.__lux98; x.pos.copy(x['jang'].root.position).add({ x: 1, y: 0, z: 0 }); });
await page.waitForTimeout(300); await page.keyboard.press('e');
await page.waitForTimeout(200); await advance();
const final = await state();
console.log('Ende', final, 'Mission:', await g(() => window.__lux98.missions.getState('M01_ZERECK_AN_DSTAD')));
await page.screenshot({ path: `${out}/05_place_darmes.png` });
// Nacht + Regen
await g(() => { const x = window.__lux98; x.clock.setDateTime(x.clock.getDate(), 22.5); x.env.setRain(true); x.env.wetness = 1; x.camYaw += 2.2; });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/06_night_rain.png` });
// Notizbuch-Stadtplan
await g(() => { const x = window.__lux98; x.env.setRain(false); x.clock.setDateTime(x.clock.getDate(), 10); });
await page.keyboard.press('Tab'); await page.waitForTimeout(200);
await page.click('#nb nav button[data-page="map"]'); await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/07_map.png` });
await page.keyboard.press('Tab');
// Speichern/Laden
const saved = await g(() => window.__lux98.save());
const loaded = await g(() => window.__lux98.load());
console.log('Speichern/Laden:', saved, loaded, await state());
const fps = await g(() => { const f = window.__lux98.frameTimes; return Math.round(1000 / (f.reduce((a, b) => a + b, 0) / f.length)); });
console.log('Bildrate (Software-Rendering, nicht aussagekraeftig):', fps);
console.log('Konsolenfehler:', errors.length ? errors : 'keine');
await browser.close();
process.exit(errors.length || final.obj !== 'done' ? 1 : 0);
