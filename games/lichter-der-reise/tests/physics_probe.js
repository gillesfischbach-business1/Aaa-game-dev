// physics probe: runs the game's own update() with scripted inputs and measures what a driver would feel
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--headless=new', '--enable-unsafe-webgpu', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--enable-features=Vulkan', '--use-vulkan=native', '--use-angle=vulkan'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.goto('http://localhost:8777/lichter-der-reise/index.html'); await p.waitForFunction(() => typeof G !== 'undefined' && G.player && cells.size > 0, null, { timeout: 180000 });
  const r = await p.evaluate(() => { window.__manual = true; document.getElementById('title').hidden = true; const K = SET.ctl.keys, out = {}; SET.gfx.traffic = 0; TRAFFIC.length = 0;
    const set = (car, x, z, h) => { for (const k in keys) keys[k] = false; G.player = newCar(car, x, z, h); G.camYaw = h; G.state = 'drive'; G.camMode = 'chase'; G.mission = 6; G.event = null; G.boostT = 0; TRAFFIC.length = 0; PEDS.length = 0; };
    const run = (n, dt, f) => { for (let i = 0; i < n; i++) { if (f) f(i); update(dt); TRAFFIC.length = 0; } };
    for (const car of ['fidele', 'smaragd', 'kompakt', 'limo', 'suv']) { const o = {}; // straight-line numbers on the motorway (grid-straight, so no steering needed in grid space... the bend compensation makes it curve)
      set(car, 500, -3, -Math.PI / 2); keys[K.up] = true; let t100 = null, t50 = null; const x0 = G.player.x;
      for (let i = 0; i < 60 * 25; i++) { // keep the car on the road with a simple lane keeper so only longitudinal behaviour is measured
        const pl = G.player; keys[K.left] = false; keys[K.right] = false; let d = -Math.PI / 2 - pl.h; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; const e = d * 2 + (-3 - pl.z) * -.0; if (pl.z > -1) keys[K.left] = true; else if (pl.z < -5) keys[K.right] = true; else if (d > .01) keys[K.left] = true; else if (d < -.01) keys[K.right] = true;
        update(1 / 60); if (t50 === null && pl.v * 3.6 >= 50) t50 = i / 60; if (t100 === null && pl.v * 3.6 >= 100) t100 = i / 60; }
      o.top_kmh = Math.round(G.player.v * 3.6); o.t0_50 = t50; o.t0_100 = t100; o.zDrift = +(G.player.z + 3).toFixed(1);
      // braking from top speed
      keys[K.up] = false; keys[K.left] = false; keys[K.right] = false; keys[K.down] = true; const xb = G.player.x, vb = G.player.v; let n = 0; while (G.player.v > .5 && n < 2000) { update(1 / 60); n++; } o.brake_m = Math.round(Math.abs(G.player.x - xb)); o.brake_s = +(n / 60).toFixed(1); o.brake_from = Math.round(vb * 3.6);
      // then reverse
      run(180, 1 / 60); o.reverse_kmh = Math.round(G.player.v * 3.6); keys[K.down] = false;
      // coasting: lift off at 60 km/h, how long until 20
      set(car, 600, -3, -Math.PI / 2); G.player.v = 60 / 3.6; n = 0; while (G.player.v > 20 / 3.6 && n < 6000) { update(1 / 60); n++; } o.coast60to20_s = +(n / 60).toFixed(1);
      // steering: full lock at 30 and at 90 km/h -> turning radius and lateral g
      for (const kmh of [30, 90]) { set(car, 1000, 0, -Math.PI / 2); G.player.v = kmh / 3.6; keys[K.left] = true; keys[K.up] = true; let maxYaw = 0; const pts = []; for (let i = 0; i < 90; i++) { G.player.v = kmh / 3.6; update(1 / 60); maxYaw = Math.max(maxYaw, Math.abs(G.player.yawRate)); } const v = kmh / 3.6; o['radius_' + kmh] = +(v / maxYaw).toFixed(1); o['latG_' + kmh] = +(v * maxYaw / 9.81).toFixed(2); keys[K.left] = false; }
      // steering response: time from key press to 80 % of final yaw rate at 50 km/h
      set(car, 1000, 0, -Math.PI / 2); G.player.v = 50 / 3.6; keys[K.right] = true; const ys = []; for (let i = 0; i < 60; i++) { G.player.v = 50 / 3.6; update(1 / 60); ys.push(Math.abs(G.player.yawRate)); } const fin = ys[59]; o.steerRise_ms = Math.round(ys.findIndex(y => y >= fin * .8) / 60 * 1000); keys[K.right] = false;
      out[car] = o; }
    // tunnelling: ram a house wall and a guard rail head-on at top speed with coarse and fine time steps
    const tun = {}; for (const [name, x, z, h, lim] of [['house_altstadt', -84, -150, Math.PI / 2, 'x'], ['rail_motorway', 800, 0, 0, 'z']]) for (const dt of [1 / 60, 1 / 30, 1 / 20]) { set('smaragd', x, z, h); const pl = G.player; pl.v = 64 * 1.3; let maxOff = 0, pen = false; const x0 = pl.x, z0 = pl.z; for (let i = 0; i < 80; i++) { keys[K.up] = true; update(dt); const off = lim === 'x' ? Math.abs(pl.x - x0) : Math.abs(pl.z - z0); maxOff = Math.max(maxOff, off); } tun[name + '@' + Math.round(1 / dt)] = { travelled: +maxOff.toFixed(1), v_end: +pl.v.toFixed(1), insideCollider: (() => { colsNear(pl.x, pl.z, _cols); return _cols.some(c => pl.x > c.x0 && pl.x < c.x1 && pl.z > c.z0 && pl.z < c.z1); })() }; keys[K.up] = false; }
    out.tunnel = tun;
    // parked car: ram at 40 km/h, do we stop outside it?
    { const k = PARKCARS[0]; const along = Math.abs(Math.sin(k.h)) > .7; set('kompakt', k.x + (along ? 0 : 0), k.z, k.h); const fx = -Math.sin(k.h), fz = -Math.cos(k.h); G.player.x = k.x - fx * 12; G.player.z = k.z - fz * 12; G.player.v = 40 / 3.6; keys[K.up] = true; run(120, 1 / 60); keys[K.up] = false; out.parkedHit = { gap: +Math.hypot(G.player.x - k.x, G.player.z - k.z).toFixed(1), v: +G.player.v.toFixed(1) }; }
    // world edge: drive out of the city on a ring road towards the map border
    { set('smaragd', 426, 300, Math.PI); keys[K.up] = true; run(600, 1 / 60); keys[K.up] = false; out.edge = { x: Math.round(G.player.x), z: Math.round(G.player.z), v: +G.player.v.toFixed(1) }; }
    out.nan = [G.player.x, G.player.z, G.player.h, G.player.v].some(v => !isFinite(v)); return out; });
  console.log(JSON.stringify(r, null, 1)); console.log(JSON.stringify(errs.slice(0, 5))); await b.close(); })();
