// Browser-Test: Spiel starten, Mission 01 und Mission 02 (beide Loesungswege) ueber die echte Oberflaeche,
// Konsole auf Fehler pruefen, Bildschirmfotos. Aufruf: node tests/e2e/smoke.mjs <URL> <AUSGABEORDNER>
import { createRequire } from 'node:module';
// Playwright ist in der Cloud-Umgebung global vorinstalliert (NODE_PATH); lokal: npm i -D playwright
const { chromium } = createRequire(import.meta.url)('playwright');

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? '.';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
let failures = 0;
const check = (name, cond, info = '') => { console.log(`${cond ? ' OK ' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); if (!cond) failures++; };

async function open() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url + '?autostart&quality=low');
  await page.waitForFunction(() => window.__lux98?.running, null, { timeout: 120000 });
  const g = (fn, arg) => page.evaluate(fn, arg);
  const advance = async () => {
    for (let i = 0; i < 15 && await page.isVisible('#dialogue'); i++) { await page.keyboard.press('e'); await page.waitForTimeout(100); }
  };
  const goTo = async (expr) => { await g(`(() => { const x = window.__lux98; x.pos.copy(${expr}).add({ x: 1.2, y: 0, z: 0.4 }); })()`); await page.waitForTimeout(250); };
  const press = async (k = 'e') => { await page.keyboard.press(k); await page.waitForTimeout(250); };
  const st = () => g(() => { const x = window.__lux98; const c = x.activeController(); return { mission: c?.id ?? '-', obj: c ? c.current() : '-', cash: x.wallet.getCash(), rep: x.reputation, clock: x.clock.toString() }; });
  return { page, g, advance, goTo, press, st };
}

// ---------- Mission 01 ----------
const { page, g, advance, goTo, press, st } = await open();
await advance();
check('M01 Intro', (await st()).obj === 'call_friend');
await goTo('x.booths[0]'); await press();
check('Telefonzelle oeffnet', await page.isVisible('#phone'));
await page.click('#pcoins button:nth-child(2)');
for (const d of '486127') await page.keyboard.press('Digit' + d);
await page.click('#pactions .call'); await page.waitForTimeout(200); await advance();
check('Anruf bei Jang', (await st()).obj === 'get_key', JSON.stringify(await st()));
await g(() => { const x = window.__lux98; x.clock.setDateTime(x.clock.getDate(), 9); });
await goTo('x.m01.weis.root.position'); await press(); await advance();
check('Schluessel', (await st()).obj === 'find_car');
await goTo('x.car.pos'); await page.keyboard.press('e'); await page.waitForTimeout(300); await advance();
check('Eingestiegen', await g(() => window.__lux98.mode === 'drive'));
await page.keyboard.down('w'); await page.waitForTimeout(2500); await page.keyboard.up('w');
check('Auto faehrt', await g(() => window.__lux98.car.kmh > 1), `${await g(() => Math.round(window.__lux98.car.kmh))} km/h`);
await page.screenshot({ path: `${out}/04_drive.png` });
await g(() => window.__lux98.leaveVehicle(true));
await goTo('x.m01.jang.root.position'); await press(); await advance();
check('M01 erfuellt, M02 aktiv', await g(() => window.__lux98.missions.getState('M01_ZERECK_AN_DSTAD') === 'Succeeded') && (await st()).mission === 'M02_ENG_LESCHT_CHANCE', JSON.stringify(await st()));

// ---------- Mission 02, ehrlicher Weg ----------
await goTo('x.homeDoor'); await press(); await press('1'); await advance();
check('Anrufbeantworter vor der Nachricht leer', (await st()).obj === 'listen_message');
await g(() => { const x = window.__lux98; x.advanceMinutes(70); });
await page.waitForTimeout(400);
await goTo('x.homeDoor'); await press(); await press('1'); await advance();
check('Nachricht gehoert, Frist gesetzt', (await st()).obj === 'meet_contact' && await g(() => window.__lux98.m02.deadline > 0), await g(() => window.__lux98.formatAbsHours(window.__lux98.m02.deadline)));
await goTo('x.m02.muller.root.position'); await press(); await advance();
check('Auswahl erscheint', await page.isVisible('#choice'));
await page.screenshot({ path: `${out}/08_choice.png` });
await page.keyboard.press('1'); await page.waitForTimeout(200); await advance();
check('Weg: ehrlich', await g(() => window.__lux98.m02.path === 'honest'));
const cashBefore = (await st()).cash;
await goTo('x.m02.partsSpot'); await press(); await advance();
check('Teile gekauft (-1 800 F)', await g(() => window.__lux98.m02.partsBought) && (await st()).cash === cashBefore - 1800);
await goTo('x.m02.customerCar.pos'); await press();
check('Werkbank offen', await page.isVisible('#workshop'));
await page.click('#workshop .tools button:has-text("Ölwechsel")');  // absichtlich falsch
for (const label of ['Wagen auf die Hebebühne', 'Vorderräder abschrauben', 'Bremssattel lösen', 'Bremsscheiben tauschen', 'Neue Bremsbeläge einsetzen', 'Bremssattel montieren', 'Räder anschrauben', 'Wagen herunterlassen', 'Bremspedal pumpen']) {
  if (label === 'Bremsscheiben tauschen') await page.screenshot({ path: `${out}/09_workshop.png` });
  await page.click(`#workshop .tools button:has-text("${label}")`);
}
await page.waitForTimeout(200); await advance();
check('Reparatur erledigt', (await st()).obj === 'test_drive', `Fehler: ${await g(() => window.__lux98.m02.mistakes)}`);
await goTo('x.m02.customerCar.pos'); await press(); await page.waitForTimeout(200);
check('Im Kundenwagen', await g(() => window.__lux98.veh === window.__lux98.m02.customerCar));
for (let i = 0; i < 3; i++) {
  await g((i) => { const x = window.__lux98, c = x.m02.customerCar; c.placeAt(x.m02.cones[i].pos, c.heading, x.city); }, i);
  await page.waitForTimeout(300);
  if (i === 1) await page.screenshot({ path: `${out}/10_testdrive.png` });
}
check('Alle Pylonen', await g(() => window.__lux98.m02.conesPassed === 3));
await g(() => { const x = window.__lux98, c = x.m02.customerCar; c.placeAt(x.m02.garageSpot, c.heading, x.city); c.speed = 0; });
await page.waitForTimeout(500);
check('Probefahrt beendet', (await st()).obj === 'report_to_owner');
const cash2 = (await st()).cash;
await goTo('x.m02.muller.root.position'); await press(); await advance();
const s2 = await st();
check('M02 erfuellt (ehrlich): +6 300 F, Ruf +8', await g(() => window.__lux98.missions.getState('M02_ENG_LESCHT_CHANCE') === 'Succeeded') && s2.cash === cash2 + 6300 && s2.rep === 8, JSON.stringify(s2));
await page.screenshot({ path: `${out}/11_garage.png` });
// ---------- Mission 03 ----------
check('M03 aktiv nach M02', (await st()).mission === 'M03_DNUMMER_AN_DER_ZEITUNG', JSON.stringify(await st()));
const cash3 = (await st()).cash;
await goTo('x.m03.kiosk'); await press(); await advance();
check('Zeitung offen', await page.isVisible('#paper'));
await page.click('#paper .ad[data-id="reding"] button');
await page.screenshot({ path: `${out}/12_newspaper.png` });
await press('e');
check('Zeitung gekauft (-30 F), Anzeige notiert', !(await page.isVisible('#paper')) && (await st()).obj === 'group:contact' && (await st()).cash === cash3 - 30 && await g(() => window.__lux98.m03.adNoted));
await goTo('x.homeDoor'); await press(); await press('2');
for (const d of '451998') await page.keyboard.press('Digit' + d);
await page.keyboard.press('Enter'); await page.waitForTimeout(200); await advance();
check('Anruf vor 18 Uhr: niemand meldet sich', (await st()).obj === 'group:contact' && (await page.evaluate(() => window.__lastLine ?? '')) !== 'invalid');
await g(() => { const x = window.__lux98; x.clock.setDateTime(x.clock.getDate(), 18.5); });
await goTo('x.homeDoor'); await press(); await press('2');
for (const d of '451998') await page.keyboard.press('Digit' + d);
await page.keyboard.press('Enter'); await page.waitForTimeout(200); await advance();
check('Anruf 18:30 von zu Hause: Treffen vereinbart', (await st()).obj === 'meet_stranger', await g(() => window.__lux98.m03.objectiveText('de')));
await goTo('x.homeDoor'); await press(); await press('3'); await advance();
check('Geschlafen bis 8 Uhr', (await st()).clock.endsWith('08:00'), (await st()).clock);
await g(() => { const x = window.__lux98; x.clock.setDateTime(x.clock.getDate(), 10.5); });
await page.waitForTimeout(400);
check('Herr Reding sitzt auf der Bank', await g(() => window.__lux98.m03.reding.root.visible));
await goTo('x.m03.reding.root.position'); await press(); await advance();
check('Kiste erhalten', (await st()).obj === 'combine_clues');
await page.keyboard.press('Tab'); await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/13_clues.png` });
await page.keyboard.press('Tab'); await page.waitForTimeout(200);
const cash4 = (await st()).cash, rep4 = (await st()).rep;
await goTo('x.m03.doors[2].pos'); await press(); await advance();
check('Falsche Tuer (Hollerich)', (await st()).obj === 'combine_clues' && await g(() => window.__lux98.m03.wrongDoors === 1));
await goTo('x.m03.doors[0].pos'); await press(); await advance();
const s4 = await st();
check('M03 erfuellt: +2 500 F, Ruf +3', await g(() => window.__lux98.missions.getState('M03_DNUMMER_AN_DER_ZEITUNG') === 'Succeeded') && s4.cash === cash4 + 2500 && s4.rep === rep4 + 3, JSON.stringify(s4));


// ---------- Arbeit in der Garage (Karriere) ----------
const doShift = async (orders) => {
  await goTo('x.m02.muller.root.position'); await press(); await advance();
  for (const order of orders) {
    for (const label of order) await page.click(`#workshop .tools button:has-text("${label}")`);
    await page.waitForTimeout(150);
  }
  await advance();
};
const OIL = ['Wagen auf die Hebebühne', 'Altes Öl ablassen', 'Ölfilter wechseln', 'Ablassschraube eindrehen', 'Wagen herunterlassen', 'Neues Öl einfüllen', 'Ölstand prüfen'];
const TYRES = ['Wagen auf die Hebebühne', 'Winterräder abschrauben', 'Sommerreifen auf Felgen ziehen', 'Räder auswuchten', 'Sommerräder anschrauben', 'Wagen herunterlassen', 'Radmuttern nachziehen'];
const PLUGS = ['Motorhaube öffnen', 'Zündkabel abziehen', 'Alte Zündkerzen herausdrehen', 'Elektrodenabstand prüfen', 'Neue Zündkerzen eindrehen', 'Zündkabel aufstecken', 'Probelauf'];
const bank0 = await g(() => window.__lux98.wallet.getBank()), rep0 = (await st()).rep;
check('Schicht moeglich (Di 10:30, verspaetet)', await g(() => window.__lux98.career.canStartShift()));
await doShift([OIL, TYRES]);
const bank1 = await g(() => window.__lux98.wallet.getBank());
check('Verspaetete Schicht: 1 700 F aufs Konto, Ruf -1, Feierabend 17 Uhr', bank1 === bank0 + 1700 && (await st()).rep === rep0 - 1 && (await st()).clock.endsWith('17:00'), `${bank1 - bank0} F, ${(await st()).clock}`);
await g(() => { const x = window.__lux98; x.clock.setDateTime(x.clock.getDate(), 8.0); x.advanceMinutes(60 * 24); });
await doShift([PLUGS, OIL]);
const bank2 = await g(() => window.__lux98.wallet.getBank());
check('Puenktliche Schicht: 2 200 F, Ruf +1, 2 Arbeitstage', bank2 === bank1 + 2200 && (await st()).rep === rep0 && await g(() => window.__lux98.career.daysWorked === 2), `${bank2 - bank1} F`);
await page.keyboard.press('Tab'); await page.waitForTimeout(200);
await page.click('#nb nav button[data-page="map"]'); await page.waitForTimeout(300);
await g(() => { const x = window.__lux98; x['mapView'].scale = 0.28; x['mapView'].cx = -500; x['mapView'].cz = 800; x['drawNotebookMap'](); });
await page.screenshot({ path: `${out}/07_map.png` });
await page.keyboard.press('Tab'); await page.waitForTimeout(200);
check('Notizbuch mit Tab geschlossen', !(await page.isVisible('#notebook')));
check('Speichern/Laden', await g(() => window.__lux98.save() && window.__lux98.load()) && await g(() => window.__lux98.missions.getState('M02_ENG_LESCHT_CHANCE') === 'Succeeded' && window.__lux98.flags['m02.path'] === 'honest' && window.__lux98.missions.getState('M03_DNUMMER_AN_DER_ZEITUNG') === 'Succeeded'));
const fps = await g(() => { const f = window.__lux98.frameTimes; return Math.round(1000 / (f.reduce((a, b) => a + b, 0) / f.length)); });
await page.close();

// ---------- Mission 02, Abkuerzung + Bremsfading + zu spaet ----------
{
  const { page, g, advance, goTo, press, st } = await open();
  await advance();
  await g(() => { const x = window.__lux98; for (const o of ['call_friend', 'get_key', 'find_car', 'visit_friend']) x.missions.completeObjective('M01_ZERECK_AN_DSTAD', o); x.m01.completedAtHours = x.absHours(); x.car.locked = false; x.onMissionSucceeded('M01_ZERECK_AN_DSTAD'); x.advanceMinutes(70); });
  await page.waitForTimeout(400);
  await goTo('x.homeDoor'); await press(); await press('1'); await advance();
  // zu spaet kommen
  await g(() => { const x = window.__lux98; x.advanceMinutes(60 * 4); });
  await goTo('x.m02.muller.root.position'); await press(); await advance();
  check('Zu spaet: neuer Termin am naechsten Morgen', (await st()).obj === 'meet_contact' && await g(() => window.__lux98.m02.deadline > window.__lux98.absHours()), await g(() => window.__lux98.formatAbsHours(window.__lux98.m02.deadline)));
  await g(() => { const x = window.__lux98; const d = x.m02.deadline - 1 - x.absHours(); x.advanceMinutes(d * 60); });
  await press(); await advance();
  await page.keyboard.press('2'); await page.waitForTimeout(200); await advance();
  check('Weg: Abkuerzung', await g(() => window.__lux98.m02.path === 'shortcut'));
  await goTo('x.m02.customerCar.pos'); await press();
  for (const label of ['Wagen auf die Hebebühne', 'Vorderräder abschrauben', 'Beläge mit Druckluft', 'Bremse nachstellen', 'Räder anschrauben', 'Wagen herunterlassen']) await page.click(`#workshop .tools button:has-text("${label}")`);
  await page.waitForTimeout(200); await advance();
  await goTo('x.m02.customerCar.pos'); await press(); await page.waitForTimeout(200);
  // hart bremsen bei Tempo -> Bremse wird weich
  const eff = await g(() => { const x = window.__lux98, c = x.m02.customerCar; if (x.veh !== c) return -1; for (let i = 0; i < 300; i++) { c.speed = 16; c.braking = true; x.m02.update(0.05); } return c.brakeEfficiency; });
  check('Bremsfading bei Abkuerzung', eff < 0.6, `Bremswirkung ${(eff * 100).toFixed(0)} %`);
  await advance();
  await g(() => { const x = window.__lux98, c = x.m02.customerCar; c.speed = 0; for (const cone of x.m02.cones) { c.placeAt(cone.pos, c.heading, x.city); x.m02.update(0.05); } c.placeAt(x.m02.garageSpot, c.heading, x.city); x.m02.update(0.05); });
  await page.waitForTimeout(300);
  const cash = (await st()).cash;
  await goTo('x.m02.muller.root.position'); await press(); await advance();
  const s3 = await st();
  check('M02 erfuellt (Abkuerzung): +2 000 F, Ruf -5', s3.cash === cash + 2000 && s3.rep === -5, JSON.stringify(s3));
  // M03: Treffen verpassen -> Nachricht auf dem Band, neuer Termin, Anruf bleibt erledigt
  await goTo('x.m03.kiosk'); await press(); await advance(); await press('e');
  await g(() => { const x = window.__lux98; x.clock.setDateTime(x.clock.getDate(), 18.5); });
  await goTo('x.booths[0]'); await press();
  await page.click('#pcoins button:nth-child(2)');
  for (const d of '451998') await page.keyboard.press('Digit' + d);
  await page.click('#pactions .call'); await page.waitForTimeout(200); await advance();
  const firstMeet = await g(() => window.__lux98.m03.meetFrom);
  await g(() => window.__lux98.advanceMinutes(60 * 24));
  await page.waitForTimeout(500);
  check('Treffen verpasst: neuer Termin, Anruf bleibt erledigt', (await st()).obj === 'meet_stranger' && await g(() => window.__lux98.m03.meetFrom) > firstMeet);
  await goTo('x.homeDoor'); await press(); await press('1');
  check('Nachricht von Herrn Reding auf dem Band', (await page.textContent('#dialogue .lb')).includes('Reding'));
  await advance();
  check('Nach Abkuerzung: Jobangebot einen Tag spaeter per Band', await g(() => window.__lux98.career.hired));

  await page.close();
}

console.log('Bildrate (Software-Rendering, nicht aussagekraeftig):', fps);
console.log('Konsolenfehler:', errors.length ? errors : 'keine');
await browser.close();
process.exit(errors.length || failures ? 1 : 0);
