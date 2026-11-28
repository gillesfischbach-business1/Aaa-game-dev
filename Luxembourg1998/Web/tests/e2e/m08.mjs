// Mission 08 "Millennium" im Browser: Zeitsprung, Winter, Gespraeche, Silvester, Feuerwerk, Abspann.
// Vorherige Missionen werden per Spielzustand als erledigt gesetzt (der grosse Test spielt sie durch).
// Aufruf: node tests/e2e/m08.mjs <URL> <AUSGABEORDNER>
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? '.';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
let failures = 0;
const check = (n, c, i = '') => { console.log(`${c ? ' OK ' : 'FAIL'}  ${n}${i ? '  ' + i : ''}`); if (!c) failures++; };

async function run(flags, pick, expectOptions) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url + '?autostart&quality=low');
  await page.waitForFunction(() => window.__lux98?.running, null, { timeout: 120000 });
  const g = (fn, a) => page.evaluate(fn, a);
  const advance = async () => { for (let i = 0; i < 15 && await page.isVisible('#dialogue'); i++) { await page.keyboard.press('e'); await page.waitForTimeout(100); } };
  const goTo = async (expr) => { await g(`(() => { const x = window.__lux98; x.pos.copy(${expr}).add({ x: 1.2, y: 0, z: 0.4 }); })()`); await page.waitForTimeout(300); };
  const press = async (k = 'e') => { await page.keyboard.press(k); await page.waitForTimeout(250); };
  await advance();
  await g((flags) => {
    const x = window.__lux98;
    const all = [
      ['M01_ZERECK_AN_DSTAD', ['call_friend', 'get_key', 'find_car', 'visit_friend']],
      ['M02_ENG_LESCHT_CHANCE', ['listen_message', 'meet_contact', 'trial_repair_honest', 'test_drive', 'report_to_owner']],
      ['M03_DNUMMER_AN_DER_ZEITUNG', ['buy_newspaper', 'call_from_home', 'meet_stranger', 'combine_clues']],
      ['M05_DEI_VERLUER_DISKETT', ['listen_tom', 'talk_technician', 'find_via_witness', 'return_disk']],
      ['M06_ENG_NUECHT_AM_GRONN', ['listen_invite', 'arrive_grund', 'outcome_conflict']],
      ['M07_DSTAD_AM_WANDEL', ['listen_mia', 'get_camera', 'photograph_old_building', 'interview_resident', 'deliver_film', 'decide_story']],
    ];
    for (const [m, objs] of all) { x.missions.refresh(x.clock.getDate()); x.missions.start(m); for (const o of objs) x.missions.completeObjective(m, o); }
    Object.assign(x.flags, flags);
    x.missions.refresh(x.clock.getDate());
  }, flags);
  check('M08 vor Dezember gesperrt', await g(() => window.__lux98.missions.getState('M08_MILLENNIUM') === 'Locked'));
  // Zeitsprung ueber das Zuhause-Menue (Option 4)
  const bank0 = await g(() => window.__lux98.wallet.getBank());
  await goTo('x.homeDoor'); await press();
  check('Zuhause-Menue bietet Zeitsprung', (await page.textContent('#choice .opts')).includes('Dezember'));
  await press('4'); await advance();
  const s = await g(() => { const x = window.__lux98; return { date: x.clock.toString(), m08: x.missions.getState('M08_MILLENNIUM'), bank: x.wallet.getBank() }; });
  check('1. Dezember 1998, M08 aktiv, Ersparnisse', s.date.includes('01.12.1998') && s.m08 === 'Active' && s.bank > bank0, JSON.stringify(s));
  await page.waitForTimeout(800);
  check('Winter: kahle Baeume, Weihnachtsmarkt sichtbar', await g(() => { const x = window.__lux98; const crowns = x.city.root.children.find((c) => c.isInstancedMesh && c.geometry.type === 'IcosahedronGeometry'); return (!crowns || !crowns.visible) && x.m08.market.visible; }));
  await goTo('x.m08.marketSpot'); await g(() => { const x = window.__lux98; x.aimAt(x.m08.market.position.clone().add(x.city.places.place_darmes)); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/24_december.png` });
  // drei Gespraeche: Jang, Tom (Pixel), Mia (Labor 10 Uhr)
  await goTo('x.m08.jang.root.position'); await press(); await advance();
  await g(() => { const x = window.__lux98; x.clock.setDateTime(x.clock.getDate(), 10.5); });
  await goTo('x.m05.door'); await press();
  await goTo('x.m05.tom.root.position'); await press(); await advance();
  await goTo('x.m05.interior.spawn'); await press();
  await goTo('x.m07.mia.root.position'); await press(); await advance();
  check('Drei Gespraeche ueber die Zukunft', await g(() => window.__lux98.m08.current() === 'final_choice'), await g(() => window.__lux98.m08.talked.join(',')));
  // Silvester 22:30
  await g(() => { const x = window.__lux98; x.clock.setDateTime({ year: 1998, month: 12, day: 31 }, 22.5); });
  await page.waitForTimeout(400);
  await goTo('x.m08.jang.root.position'); await press(); await advance();
  const opts = await page.$$eval('#choice .opts button', (b) => b.length);
  check(`Silvester-Entscheidung mit ${expectOptions} Optionen`, opts === expectOptions, String(opts));
  await page.screenshot({ path: `${out}/25_nye.png` });
  await press(pick); await advance();
  check('Feuerwerk um Mitternacht', await g(() => window.__lux98.m08.fireworksActive));
  check('1. Januar 1999', (await g(() => window.__lux98.clock.toString())).includes('01.01.1999'));
  await page.waitForSelector('#ending:not(.hidden)', { timeout: 15000 });
  const text = await page.textContent('#ending .text');
  check('Abspann mit Epilog', text.length > 100 && (await page.textContent('#ending h1')).includes('Kapitel'), text.slice(0, 120));
  await page.screenshot({ path: `${out}/26_ending.png` });
  await page.click('#endingClose'); await page.waitForTimeout(300);
  check('Weiter spielen nach dem Abspann', !(await page.isVisible('#ending')) && await g(() => window.__lux98.missions.getState('M08_MILLENNIUM') === 'Succeeded'));
  await page.close();
  return text;
}

const t1 = await run({ 'career.mechanic': 'job_offer', 'career.photographer': 'active', 'm02.path': 'honest', 'rel.steve': 'enemy', 'm07.angle': 'preserve' }, '1', 4);
check('Epilog: Werkstatt, Steve, Madame Thill', t1.includes('Werkstatt') && t1.includes('Steve') && t1.includes('Thill'));
const t2 = await run({ 'career.mechanic': 'maybe', 'm07.angle': 'progress' }, '2', 2);
check('Epilog: wieder ins Ausland', t2.includes('Zug'));
console.log('Konsolenfehler:', errors.length ? errors : 'keine');
await browser.close();
process.exit(errors.length || failures ? 1 : 0);
