/* End-to-end test suite for "Lichter der Reise" in a real Chromium with WebGPU (SwiftShader Vulkan).
   Run:  VK_ICD_FILENAMES=<chromium>/vk_swiftshader_icd.json node tests/e2e.js <url> <outdir>
   Prints a JSON report and writes screenshots. Exits non-zero when a test fails. */
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.argv[2] || 'http://localhost:8777/lichter-der-reise/index.html';
const OUT = process.argv[3] || 'test-output';
const EXE = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
fs.mkdirSync(OUT, { recursive: true });
const results = []; const errors = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function launch(viewport, mobile) {
  const b = await chromium.launch({ headless: true, executablePath: EXE,
    args: ['--headless=new', '--enable-unsafe-webgpu', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--enable-features=Vulkan', '--use-vulkan=native', '--use-angle=vulkan', '--autoplay-policy=no-user-gesture-required'] });
  const c = await b.newContext({ viewport, hasTouch: !!mobile, isMobile: !!mobile, deviceScaleFactor: 1 });
  const p = await c.newPage();
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
  await p.goto(URL, { timeout: 120000 }); await p.waitForFunction(() => typeof G !== 'undefined' && G.player && typeof cells !== 'undefined' && cells.size > 0, null, { timeout: 120000 });
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} window.__manual = true; });
  return { b, p };
}
async function test(name, fn) { if (ONLY && !ONLY.includes(name)) return; const t0 = Date.now(); const before = errors.length;
  try { const info = await fn(); const errs = errors.slice(before);
    results.push({ name, ok: errs.length === 0, ms: Date.now() - t0, info, errors: errs }); }
  catch (e) { results.push({ name, ok: false, ms: Date.now() - t0, error: String(e && e.message || e).slice(0, 500), errors: errors.slice(before) }); }
  console.log((results[results.length - 1].ok ? 'PASS ' : 'FAIL ') + name + ' (' + (Date.now() - t0) + ' ms)'); }
const shot = async (p, n) => { await p.evaluate(async () => { await renderNow(); }); await p.screenshot({ path: `${OUT}/${n}.png` }); };
// advance the simulation quickly in-page (rendering only when asked)
const sim = (p, frames, bot) => p.evaluate(([n, bot]) => { for (let i = 0; i < n; i++) { if (bot && typeof botStep === 'function' && G.state === 'drive') botStep(1 / 60); update(1 / 60); if (!UI.dialog.hidden && i % 20 === 0) { if (dlg.cur && dlg.cur.choices) { dlg.shown = 999; tickDialog(.1); const c = dlg.cur.choices[0]; UI.dialog.hidden = true; dlg.cur = null; dlg.queue = []; c.fn(); } else { advance(); advance(); } } } }, [frames, bot]);
const BOT = `globalThis.__bot={stuck:0,rev:0,stuckTotal:0}; globalThis.botStep=function(dt){ const pl=G.player, B=__bot; let t=null;
  if(G.event==='glow'){ let bd=1e9; for(const o of G.dyn) if(o.type==='spark'&&o.alive!==false){ const d=Math.hypot(o.x-pl.x,o.z-pl.z); if(d<bd){bd=d;t=o;} } }
  if(!t){ const T=globalThis.__target||currentTarget(); if(!T) return; const r=globalThis.__target?findRoute(pl.x,pl.z,T.x,T.z):(G.route||[]); let k=0; while(k<r.length&&Math.hypot(r[k].x-pl.x,r[k].z-pl.z)<9) k++;
    t=(k<r.length&&Math.hypot(T.x-pl.x,T.z-pl.z)>40)?r[k]:T;
    if(k<r.length&&Math.hypot(T.x-pl.x,T.z-pl.z)>40){ const A=k>0?r[k-1]:{x:pl.x,z:pl.z}, Bn=r[k]; const ux=Bn.x-A.x, uz=Bn.z-A.z, L=Math.hypot(ux,uz)||1; const s0=((pl.x-A.x)*ux+(pl.z-A.z)*uz)/L; const s1=Math.min(L,s0+12); t={x:A.x+ux/L*s1,z:A.z+uz/L*s1}; } }
  const want=Math.atan2(-(t.x-pl.x),-(t.z-pl.z)); let d=want-pl.h; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; const K=SET.ctl.keys;
  if(B.rev>0){ B.rev-=dt; keys[K.down]=true; keys[K.up]=false; keys[K.left]=d<0; keys[K.right]=d>0; return; }
  let turnAhead=false; { const T=globalThis.__target||currentTarget(); const r=globalThis.__target&&T?findRoute(pl.x,pl.z,T.x,T.z):(G.route||[]); if(r.length>1){ const n0=r[0], n1=r[1]; const a0=Math.atan2(n0.x-pl.x,n0.z-pl.z), a1=Math.atan2(n1.x-n0.x,n1.z-n0.z); let da=Math.abs(a1-a0); if(da>Math.PI) da=2*Math.PI-da; turnAhead=da>.5&&Math.hypot(n0.x-pl.x,n0.z-pl.z)<28; } }
  keys[K.left]=d>0.06; keys[K.right]=d<-0.06; const sharp=Math.abs(d)>0.6; const slow=(sharp||turnAhead)&&Math.abs(pl.v)>(turnAhead?8:9); keys[K.up]=!slow; keys[K.down]=slow&&Math.abs(pl.v)>11;
  if(Math.abs(pl.v)<1.2){ B.stuck+=dt; if(B.stuck>2.5){ B.rev=1.4; B.stuck=0; B.stuckTotal++; (B.spots||(B.spots=[])).push([Math.round(pl.x),Math.round(pl.z),G.mission]); } } else B.stuck=0; }`;

(async () => {
  let { b, p } = await launch({ width: 960, height: 540 });
  await test('boot', async () => { await sleep(1500); await shot(p, '01_title');
    return await p.evaluate(() => ({ title: document.title, webgpu: !!navigator.gpu, canvas: [R.W, R.H], cells: cells.size, sparks: sparksAll.length, nodes: graph.nodes.size, models: Object.keys(MODEL_GROUPS) })); });
  await test('rendering', async () => { // read back a frame and check it is not blank
    const s = await p.evaluate(() => new Promise(res => { renderNow(d => { let sum = 0, n = 0; const v = []; for (let i = 0; i < d.data.length; i += 4 * 97) { const l = (d.data[i] + d.data[i + 1] + d.data[i + 2]) / 3; v.push(l); sum += l; n++; } const m = sum / n; let q = 0; for (const l of v) q += (l - m) * (l - m); res({ mean: +m.toFixed(1), std: +Math.sqrt(q / n).toFixed(1) }); }); }));
    if (s.std < 8) throw new Error('frame looks blank: ' + JSON.stringify(s)); return s; });
  await test('options_menu', async () => { await p.click('#btnOptTitle'); await sleep(300);
    for (const t of ['gfx', 'snd', 'ctl', 'save']) { await p.click(`#optTabs button[data-tab="${t}"]`); await sleep(200); await shot(p, '02_options_' + t); }
    await p.click('#optTabs button[data-tab="gfx"]'); await p.selectOption('#o_preset', 'niedrig'); await sleep(300); const low = await p.evaluate(() => ({ ms: R.ms, scale: SET.gfx.scale }));
    await p.selectOption('#o_preset', 'hoch'); await sleep(300);
    await p.click('#optTabs button[data-tab="ctl"]'); await p.click('.keybtn[data-act="swap"]'); await p.keyboard.press('x'); await sleep(100); const kb = await p.evaluate(() => SET.ctl.keys.swap);
    await p.click('#o_resetKeys'); await p.click('#optClose'); await sleep(200);
    const persisted = await p.evaluate(() => !!localStorage.getItem('ldr_settings'));
    if (low.ms !== 1 || kb !== 'x' || !persisted) throw new Error(JSON.stringify({ low, kb, persisted })); return { low, kb, persisted }; });
  await test('prologue_and_controls', async () => { await p.click('#btnStart'); await sleep(1200); await shot(p, '03_prologue');
    await p.evaluate(() => { dlg.queue = []; nextLine(); }); await sleep(300);
    const s0 = await p.evaluate(() => ({ state: G.state, x: G.player.x, z: G.player.z, h: G.player.h }));
    await p.keyboard.down('w'); await sim(p, 120); await p.keyboard.down('a'); await sim(p, 60); await p.keyboard.up('a'); await p.keyboard.up('w'); await sim(p, 120);
    const s1 = await p.evaluate(() => ({ x: G.player.x, z: G.player.z, h: G.player.h, v: G.player.v }));
    const moved = Math.hypot(s1.x - s0.x, s1.z - s0.z); if (s0.state !== 'drive' || moved < 5 || Math.abs(s1.h - s0.h) < .05) throw new Error(JSON.stringify({ s0, s1, moved }));
    await shot(p, '04_driving');
    await p.keyboard.press('k'); await sleep(300); const mapOpen = await p.evaluate(() => !UI.mapO.hidden); await shot(p, '05_map'); await p.keyboard.press('k');
    await p.keyboard.down('s'); await sim(p, 240); await p.keyboard.up('s'); await p.evaluate(() => { G.player.v = 0; });
    const before = await p.evaluate(() => G.player.car); await p.keyboard.press('c'); const after = await p.evaluate(() => G.player.car);
    await p.keyboard.press('p'); const paused = await p.evaluate(() => G.state === 'pause'); await shot(p, '06_pause'); await p.keyboard.press('p');
    if (!mapOpen || before === after || !paused) throw new Error(JSON.stringify({ mapOpen, before, after, paused }));
    return { moved: Math.round(moved), turned: +(s1.h - s0.h).toFixed(2), mapOpen, swap: before + '→' + after, paused }; });
  await test('save_load', async () => { const r = await p.evaluate(() => { const s = snapshot(); writeSlot('2'); const x = G.player.x; G.player.x += 50; const ok = restore(readSlot('2')); return { ok, back: Math.abs(G.player.x - x) < .01, light: G.light }; });
    if (!r.ok || !r.back) throw new Error(JSON.stringify(r)); return r; });
  await test('story_playthrough', async () => { await p.evaluate(BOT); await p.evaluate(() => { const o = showEnd; window.showEnd = function (g) { window.__endStack = new Error().stack + ' | state=' + G.state + ' m' + G.mission; return o(g); }; const o2 = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidden'); const el = document.getElementById('endO'); Object.defineProperty(el, 'hidden', { get() { return o2.get.call(this); }, set(v) { if (!v) window.__endStack2 = new Error().stack; o2.set.call(this, v); } }); startGame(); });
    const log = []; let last = ''; let frames = 0;
    while (frames < 60 * 60 * 25) { await sim(p, 600, true); frames += 600;
      const st = await p.evaluate(() => G.state + '/m' + G.mission + '/' + (G.event || '') + '/' + G.camMode);
      if (st !== last) { log.push(st); last = st; if (/m[0-5]\/\/(orbit|standing|finale)/.test(st)) await shot(p, '07_story_' + String(log.length).padStart(2, '0')); }
      const endV = await p.evaluate(() => ({ h: document.getElementById('endO').hidden, st: G.state })); if (process.env.DEBUG) console.log('dbg', frames, st, JSON.stringify(endV)); if (!endV.h && endV.st === 'ending') break; }
    await shot(p, '08_end');
    const end = await p.evaluate(() => ({ title: document.getElementById('endTitle').textContent, light: G.light, total: G.total, stuck: __bot.stuckTotal, st1: (window.__endStack || '').slice(0, 400), st2: (window.__endStack2 || '').slice(0, 600) }));
    if (!/leuchten/.test(end.title)) throw new Error('story did not finish: ' + JSON.stringify({ end, log }));
    return { minutes: +(frames / 3600).toFixed(1), ...end, states: log.length }; });
  await test('free_roam_stuck_scan', async () => { // drive between random road nodes and count how often the car gets stuck
    await p.evaluate(() => { freeRoam(); }); const r = await p.evaluate(() => { const N = [...graph.nodes.values()]; return N.length; });
    let reached = 0, tries = 0, stuck0 = await p.evaluate(() => __bot.stuckTotal);
    for (let k = 0; k < 6; k++) { await p.evaluate(() => { const N = [...graph.nodes.values()]; const t = N[(Math.random() * N.length) | 0]; globalThis.__target = { x: t.x, z: t.z }; }); tries++;
      for (let j = 0; j < 12; j++) { await sim(p, 600, true); if (await p.evaluate(() => Math.hypot(__target.x - G.player.x, __target.z - G.player.z) < 15)) { reached++; break; } } }
    await p.evaluate(() => { globalThis.__target = null; });
    const stuck = (await p.evaluate(() => __bot.stuckTotal)) - stuck0; await shot(p, '09_free_roam');
    const spots = await p.evaluate(() => (__bot.spots || []).slice(-40)); if (reached < tries - 1) throw new Error(JSON.stringify({ reached, tries, stuck, spots })); return { nodes: r, reached, tries, stuckEvents: stuck, spots }; });
  await test('performance', async () => { // CPU time of simulation and frame building in the browser
    return await p.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 300; i++) update(1 / 60); const tu = (performance.now() - t0) / 300;
      const t1 = performance.now(); let inst = 0; for (let i = 0; i < 60; i++) { buildFrame(); inst = lists.reduce((a, L) => a + L.nop + L.ngl, 0); for (const L of lists) { L.nop = 0; L.ngl = 0; } lightsTmp.length = 0; } const tb = (performance.now() - t1) / 60;
      return { updateMs: +tu.toFixed(2), buildFrameMs: +tb.toFixed(2), instances: inst, traffic: TRAFFIC.length }; }); });
  await test('locations', async () => { const L = [['belval', -40, 252, Math.PI / 2, 18.6], ['bruecke', -150, 84, Math.PI / 2, 22], ['tal', -163, -128, Math.PI / 2, 9], ['altstadt', -84, -150, 0, 21], ['kirchberg', 252, -60, 0, 12.5], ['autobahn', 800, 4, -Math.PI / 2, 19], ['kanal', 1900, 84, -Math.PI / 2, 23.5], ['glutplatz', 1942, -170, Math.PI, 0.5], ['lichtturm', 1858, -86, Math.PI, 6.3], ['strijp', 1648, -200, 0, 15.5]];
    for (const [n, x, z, h, hr] of L) { await p.evaluate(([x, z, h, hr]) => { for (const k in keys) keys[k] = false; G.player = newCar(G.player.car, x, z, h); G.player.v = 0; G.camYaw = h; PEDS.length = 0; BIKES.length = 0; G.hour = hr; G.state = 'drive'; G.camMode = 'chase'; TRAFFIC.length = 0; G.camK = 1; }, [x, z, h, hr]); await sim(p, 90); await sleep(900); await shot(p, '10_loc_' + n); }
    return { count: L.length }; });
  await b.close();
  ({ b, p } = await launch({ width: 390, height: 844 }, true));
  await test('mobile', async () => { await shot(p, '11_mobile_title'); await p.tap('#btnStart'); await sleep(800); await p.evaluate(() => { dlg.queue = []; nextLine(); }); await sleep(400);
    const vis = await p.evaluate(() => UI.touch.classList.contains('on')); const box = await p.locator('#tUp').boundingBox();
    await p.dispatchEvent('#tUp', 'pointerdown'); await sim(p, 120); const v = await p.evaluate(() => G.player.v); await p.dispatchEvent('#tUp', 'pointerup'); await shot(p, '12_mobile_drive');
    // no element may overflow the viewport horizontally
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (!vis || v < 3 || overflow) throw new Error(JSON.stringify({ vis, v, overflow, box })); return { touchVisible: vis, speedAfterGas: +v.toFixed(1), overflow }; });
  await b.close();
  const report = { url: URL, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results };
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 1));
  process.exit(report.failed ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
