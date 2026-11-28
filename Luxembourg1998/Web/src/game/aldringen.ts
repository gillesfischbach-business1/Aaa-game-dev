import * as THREE from 'three';
import type { Game, Interior } from './game';
import { makePerson, makeSign } from './models';

// Busbahnhof Aldringen (Place Hamilius) mit der unterirdischen Ladengalerie, Stand 1998.
// Gestaltungsvorlage: Fotos des Nutzers (Zustand der 2010er Jahre, laut Bildunterschrift u. a. Wikimedia Commons;
// Quelle SRC_PENDING_ALDRINGEN, noch nicht ausgewertet) – daraus stammen
// Terrazzoboden, achteckige Lichtfelder, gruen geflieste Rundpfeiler, breite Treppen mit gelben Handlaeufen und
// blau gerahmte Schaufenster. Annahme (unbelegt): 1998 waren die Laeden geoeffnet; Graffiti und Bretterverschlaege
// der Fotos gehoeren in die Zeit der Schliessung und fehlen deshalb. Laeden, Namen und Busse sind erfunden (Kategorie D),
// die Lage ist Kategorie C (siehe historical_accuracy.csv, LM_ALDRINGEN_*).

const W = 44, D = 26, H = 3.3;  // Halle der Galerie

function mat(color: number, roughness = 0.8, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/** Terrazzo: heller Grund mit bunten Steinchen und Fugenlinien */
function terrazzoTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#b8ab92'; g.fillRect(0, 0, 256, 256);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const chips = ['#8a7c66', '#d9cfba', '#6e6458', '#a39478', '#c9b99a', '#55504a'];
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = chips[Math.floor(rnd() * chips.length)];
    const r = 0.6 + rnd() * 1.6;
    g.fillRect(rnd() * 256, rnd() * 256, r, r);
  }
  g.strokeStyle = 'rgba(60,55,48,0.55)'; g.lineWidth = 1.5;
  g.strokeRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Gruene Fliesen fuer die Rundpfeiler */
function tileTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d')!;
  for (let y = 0; y < 128; y += 8) for (let x = 0; x < 64; x += 16) {
    g.fillStyle = (x + y) % 32 ? '#2f6a55' : '#3a7a62';
    g.fillRect(x, y, 16, 8);
  }
  g.strokeStyle = '#1d3d31'; g.lineWidth = 1;
  for (let y = 0; y <= 128; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
  for (let x = 0; x <= 64; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

/** Stadtbus (fiktive Lackierung: weiss mit blauem Band), 12 m */
function makeBus(seed: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.7, 11.8), mat(0xe8e6de, 0.5));
  body.position.y = 1.75;
  const band = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.35, 11.82), mat(seed % 2 ? 0x1f4f9a : 0x2a5fb0, 0.5));
  band.position.y = 1.05;
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.54, 1.05, 10.6), mat(0x1c2630, 0.15, 0.3));
  glass.position.set(0, 2.25, 0.2);
  const front = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.4, 0.06), mat(0x1c2630, 0.15, 0.3));
  front.position.set(0, 2.1, -5.92);
  const dest = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 0.05), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffa020, emissiveIntensity: 0.8 }));
  dest.position.set(0, 2.95, -5.94);
  g.add(body, band, glass, front, dest);
  const wheel = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12);
  wheel.rotateZ(Math.PI / 2);
  for (const z of [-3.9, 3.6]) for (const x of [-1.2, 1.2]) {
    const w = new THREE.Mesh(wheel, mat(0x1a1a1a));
    w.position.set(x, 0.5, z);
    g.add(w);
  }
  g.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** Wartehaeuschen: Glas, Dach, Bank */
function makeShelter(): THREE.Group {
  const g = new THREE.Group();
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 1.8), mat(0x50585e, 0.5, 0.4));
  roof.position.y = 2.6;
  const back = new THREE.Mesh(new THREE.BoxGeometry(5, 2.2, 0.05), new THREE.MeshStandardMaterial({ color: 0xa8c4cc, transparent: true, opacity: 0.35, roughness: 0.1 }));
  back.position.set(0, 1.3, 0.8);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.4), mat(0x6a4a30));
  bench.position.set(0, 0.48, 0.5);
  g.add(roof, back, bench);
  for (const x of [-2.4, 2.4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.08), mat(0x50585e, 0.5, 0.4));
    post.position.set(x, 1.3, 0.8);
    g.add(post);
  }
  return g;
}

export class Aldringen {
  readonly center: THREE.Vector3;
  readonly door: THREE.Vector3;
  readonly interior: Interior;

  constructor(private g: Game) {
    // Freiflaeche zwischen Boulevard Royal und Rue Aldringen (Place Hamilius)
    const ground = (x: number, z: number) => new THREE.Vector3(x, g.city.terrain.heightAt(x, z), z);
    this.center = ground(-262, 25);
    this.buildStation();
    this.door = ground(-243, 2);  // freie Flaeche westlich der Rue Aldringen (keine Strasse blockieren)
    this.buildEntrance();
    this.interior = this.buildGallery(new THREE.Vector3(this.door.x, 200, this.door.z));
    g.addInteractable({ pos: this.door, radius: 2.4, label: () => (g.mode === 'walk' && !g.interior ? 'Galerie Aldringen – erof goen' : null), act: () => g.enterInterior(this.interior) });
    g.addInteractable({ pos: this.interior.spawn, radius: 2, label: () => (g.interior === this.interior ? 'Rop op d’Busplaz' : null), act: () => g.leaveInterior() });
  }

  mapMark(): { x: number; z: number; label: string; done: boolean } {
    return { x: this.center.x, z: this.center.z, label: 'Aldringen (Bus)', done: true };
  }

  // ---------- Busbahnhof an der Oberflaeche ----------
  private buildStation(): void {
    const g = this.g, c = g.city.collision;
    const ground = (x: number, z: number) => new THREE.Vector3(x, g.city.terrain.heightAt(x, z), z);
    const curb = mat(0x9a968c, 0.9);
    const platforms: [number, number][] = [[-268, 20], [-268, 40], [-268, -42]];
    platforms.forEach(([x, z], i) => {
      const y = g.city.terrain.heightAt(x, z);
      const island = new THREE.Mesh(new THREE.BoxGeometry(34, 0.25, 3.4), curb);
      island.position.set(x, y + 0.1, z);
      island.receiveShadow = true;
      g.scene.add(island);
      for (const dx of [-9, 6]) {
        const s = makeShelter();
        s.position.set(x + dx, g.city.terrain.heightAt(x + dx, z) + 0.2, z - 0.4);
        g.scene.add(s);
        c.addFootprint([[x + dx - 2.5, z + 0.35], [x + dx + 2.5, z + 0.35], [x + dx + 2.5, z + 0.45], [x + dx - 2.5, z + 0.45]], y, y + 2.6);
      }
      // wartende Busse an der Bahnsteigkante (Nordseite der Insel)
      const n = i === 2 ? 1 : 2;
      for (let k = 0; k < n; k++) {
        const bx = x - 8 + k * 15, bz = z - 3.4;
        const bus = makeBus(i * 3 + k);
        bus.rotation.y = Math.PI / 2;
        bus.position.set(bx, g.city.terrain.heightAt(bx, bz), bz);
        g.scene.add(bus);
        c.addFootprint([[bx - 5.9, bz - 1.25], [bx + 5.9, bz - 1.25], [bx + 5.9, bz + 1.25], [bx - 5.9, bz + 1.25]], bus.position.y, bus.position.y + 3.1);
      }
    });
    const sign = makeSign(['BUSBAHNHOF ALDRINGEN', 'Gare routière · Busplaz'], '#1f3a5f', '#f2e6c8', 4.6);
    sign.position.copy(ground(-247, 30));
    sign.rotation.y = Math.PI / 2;
    g.scene.add(sign);
    // Wartende Fahrgaeste
    const spots: [number, number][] = [[-277, 21], [-262, 21.2], [-257, 41], [-280, 41.3], [-262, -41]];
    spots.forEach(([x, z], i) => {
      const p = makePerson(300 + i);
      p.root.position.copy(ground(x, z)).add(new THREE.Vector3(0, 0.22, 0));
      p.root.rotation.y = Math.PI;
      g.scene.add(p.root);
      g.npcs.push(p);
    });
  }

  /** Treppenabgang: Betonbruestung, Treppe nach unten, Schild */
  private buildEntrance(): void {
    const g = this.g, d = this.door;
    const grp = new THREE.Group();
    const concrete = mat(0x8c877c, 0.95), rail = mat(0xe0b020, 0.5, 0.4);
    // Bruestung (U-Form um die Treppenoeffnung, offen zur Spielerseite +z)
    for (const [w, dd, x, z] of [[0.25, 6, -1.6, -3], [0.25, 6, 1.6, -3], [3.45, 0.25, 0, -6]] as const) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.0, dd), concrete);
      m.position.set(x, 0.5, z);
      grp.add(m);
      const r = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.06, dd + 0.04), rail);
      r.position.set(x, 1.05, z);
      grp.add(r);
    }
    // Treppenschacht: dunkle Oeffnung mit angedeuteten Stufenkanten (das Gelaende selbst bleibt geschlossen)
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 5.6), new THREE.MeshBasicMaterial({ color: 0x141210 }));
    hole.rotation.x = -Math.PI / 2;
    hole.position.set(0, 0.03, -3.2);
    grp.add(hole);
    for (let s = 0; s < 8; s++) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.02, 0.06), mat(0x8a857a, 0.9));
      edge.position.set(0, 0.045, -0.7 - s * 0.62);
      (edge.material as THREE.MeshStandardMaterial).color.multiplyScalar(1 - s * 0.1);
      grp.add(edge);
    }
    grp.position.copy(d).add(new THREE.Vector3(0, 0, -0.5));
    g.scene.add(grp);
    g.city.collision.addWallLine([[d.x - 1.6, d.z - 0.5], [d.x - 1.6, d.z - 6.5], [d.x + 1.6, d.z - 6.5], [d.x + 1.6, d.z - 0.5]], d.y - 3, d.y + 1);
    const sign = makeSign(['GALERIE ALDRINGEN', 'Geschäfter · Passage · Busplaz'], '#20303a', '#f0e6c8', 3.4);
    sign.position.copy(d).add(new THREE.Vector3(2.6, 0, -1));
    g.scene.add(sign);
  }

  // ---------- Unterirdische Galerie (versteckt unter dem Gelaende) ----------
  private buildGallery(origin: THREE.Vector3): Interior {
    const g = this.g, c = g.city.collision;
    const group = new THREE.Group();
    group.position.copy(origin);

    const terr = terrazzoTexture();
    terr.repeat.set(W / 2.4, D / 2.4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: terr, roughness: 0.35, metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2;
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(0x4a4640, 0.95));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    const walls = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mat(0xb59a78, 0.9));
    (walls.material as THREE.MeshStandardMaterial).side = THREE.BackSide;
    walls.position.y = H / 2;
    group.add(floor, ceil, walls);

    // Deckenbalken (Beton) in Querrichtung
    const beamMat = mat(0x5a554d, 0.95);
    for (let x = -W / 2 + 5.5; x < W / 2; x += 11) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, D), beamMat);
      beam.position.set(x, H - 0.22, 0);
      group.add(beam);
    }

    // Achteckige Lichtfelder (abgehaengt, leuchtend) – das Markenzeichen der Galerie
    const glow = new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff0d0, emissiveIntensity: 1.6 });
    const rim = mat(0xd8d2c4, 0.6);
    const lightSpots: [number, number][] = [];
    for (const x of [-16.5, -5.5, 5.5, 16.5]) for (const z of [-5.5, 5.5]) lightSpots.push([x, z]);
    for (const [x, z] of lightSpots) {
      const oct = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.08, 8), glow);
      oct.rotation.y = Math.PI / 8;
      oct.position.set(x, H - 0.55, z);
      const frame = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 2.75, 0.35, 8, 1, true), rim);
      frame.rotation.y = Math.PI / 8;
      frame.position.set(x, H - 0.45, z);
      (frame.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      group.add(oct, frame);
    }
    // Wenige Lichtquellen (Handy-Leistung), der Rest kommt aus den leuchtenden Feldern
    for (const x of [-11, 11]) {
      const l = new THREE.PointLight(0xfff0d8, 30, 26, 1.4);
      l.position.set(x, H - 0.8, 0);
      group.add(l);
    }

    // Gruen geflieste Rundpfeiler mit Plakaten
    const tiles = new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.4 });
    const pillars: [number, number][] = [[-11, -1], [0, 1.5], [11, -1], [-22 + 4, 7], [22 - 4, 7]];
    pillars.forEach(([x, z], i) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, H, 16), tiles);
      p.position.set(x, H / 2, z);
      const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.85), mat([0xd8c040, 0x3a6ab0, 0xc04030, 0xe8e0d0, 0x40a060][i % 5], 0.7));
      poster.position.set(x, 1.6, z + 0.56);
      group.add(p, poster);
      c.addFootprint(this.circle(origin.x + x, origin.z + z, 0.6), origin.y, origin.y + H);
    });

    // Schaufenster mit blauen Rahmen an der Nordwand, Laeden mit erfundenen Namen
    const shops: [string, string, string][] = [
      ['TABAC – PRESSE', 'Zeitungen · Zigaretten · Lotto', '#7a1c1c'],
      ['FOTO EXPRESS', 'Filmer an 1 Stonn', '#1c3a7a'],
      ['BÄCKEREI KREMER', 'Croissants · Brout', '#6a4a20'],
      ['SCHLËSSELDÉNGSCHT', 'Schlësselen · Schong', '#3a3a3a'],
      ['BLUMMEN ANNE', 'Fleurs · Blummen', '#2a6a3a'],
    ];
    const frameMat = mat(0x2a5fb0, 0.4, 0.3);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fc4d8, emissive: 0x506878, emissiveIntensity: 0.6, roughness: 0.1, transparent: true, opacity: 0.8 });
    shops.forEach(([name, sub, col], i) => {
      const x = -W / 2 + 4.5 + i * 8.6;
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.3), glassMat);
      glass.position.set(x, 1.25, -D / 2 + 0.06);
      const top = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 0.12), frameMat);
      top.position.set(x, 2.42, -D / 2 + 0.1);
      group.add(glass, top);
      for (const dx of [-3.4, 0, 3.4]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), frameMat);
        post.position.set(x + dx, 1.2, -D / 2 + 0.1);
        group.add(post);
      }
      const sign = makeSign([name, sub], col, '#f4ecd8', 4);
      sign.children.forEach((ch) => { if (ch instanceof THREE.Mesh && ch.geometry instanceof THREE.CylinderGeometry) ch.visible = false; });
      sign.position.set(x, -0.6, -D / 2 + 0.15);
      group.add(sign);
    });

    // Treppen nach oben an Ost- und Westende (mit gelben Handlaeufen)
    const stairMat = mat(0x7a756c, 0.9), railMat = mat(0xe0b020, 0.5, 0.4);
    for (const side of [-1, 1]) {
      for (let s = 0; s < 14; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 3.2), stairMat);
        step.position.set(side * (W / 2 - 1 - s * 0.4), 0.11 + s * 0.22, 4);
        group.add(step);
      }
      for (const dz of [-1.65, 1.65]) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(6, 0.05, 0.05), railMat);
        r.position.set(side * (W / 2 - 3.6), 2.4, 4 + dz);
        r.rotation.z = side * Math.atan2(0.22, 0.4);
        group.add(r);
      }
      c.addFootprint([[origin.x + side * (W / 2), origin.z + 2.3], [origin.x + side * (W / 2 - 6.6), origin.z + 2.3],
        [origin.x + side * (W / 2 - 6.6), origin.z + 5.7], [origin.x + side * (W / 2), origin.z + 5.7]], origin.y, origin.y + H);
    }

    // Kiosk-Insel in der Mitte (Zeitungen)
    const kiosk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 1.6), mat(0x7a1c1c, 0.6));
    kiosk.position.set(-5.5, 0.55, -6.5);
    const papers = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 1.4), mat(0xe8e2d0, 0.9));
    papers.position.set(-5.5, 1.13, -6.5);
    group.add(kiosk, papers);
    c.addFootprint([[origin.x - 7.2, origin.z - 7.4], [origin.x - 3.8, origin.z - 7.4], [origin.x - 3.8, origin.z - 5.6], [origin.x - 7.2, origin.z - 5.6]], origin.y, origin.y + 1.2);

    // Passanten in der Galerie
    const people: [number, number, number][] = [[-5.5, -8.2, 0], [8, -4, 1.2], [-14, 3, -0.6], [3, 8, 2.8], [12.5, -9, 0.3]];
    people.forEach(([x, z, r], i) => {
      const p = makePerson(400 + i, { jacket: [0x3a3a4a, 0x6a2a2a, 0x2a4a3a, 0x8a7a5a, 0x4a4a6a][i] });
      p.root.position.set(origin.x + x, origin.y, origin.z + z);
      p.root.rotation.y = r;
      g.scene.add(p.root);
      g.npcs.push(p);
      c.addFootprint(this.circle(origin.x + x, origin.z + z, 0.35), origin.y, origin.y + 1.8);
    });
    g.addInteractable({
      pos: new THREE.Vector3(origin.x - 5.5, origin.y, origin.z - 5.2), radius: 2,
      label: () => (g.interior === this.interior ? 'Mat der Kiosk-Fra schwätzen' : null),
      act: () => g.ui.toast(['Moien! De Stater Owendblat ass nach do. Déi éischt Busse fueren ënnert der Woch ganz fréi.',
        'Hei ënnen ass et am Wanter wéinstens dréchen. Bis gläich!'][Math.floor(g.absHours()) % 2], 5000),
    });

    group.traverse((o) => { if (o instanceof THREE.Mesh) o.receiveShadow = true; });
    g.scene.add(group);

    // Eingang/Ausgang: Treppe an der Suedseite (Spieler kommt von dort herein, blickt nach -z)
    const spawn = new THREE.Vector3(origin.x, origin.y, origin.z + D / 2 - 1.6);
    const x0 = origin.x - W / 2, x1 = origin.x + W / 2, z0 = origin.z - D / 2, z1 = origin.z + D / 2;
    c.addWallLine([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]], origin.y - 1, origin.y + H);
    return { floor: origin.y, origin: origin.clone(), spawn, exit: this.door.clone().add(new THREE.Vector3(0, 0, 1.2)), bounds: [x0 + 0.4, z0 + 0.4, x1 - 0.4, z1 - 0.4], name: 'Galerie Aldringen' };
  }

  private circle(x: number, z: number, r: number): [number, number][] {
    const pts: [number, number][] = [];
    for (let i = 0; i < 8; i++) pts.push([x + Math.cos((i / 8) * Math.PI * 2) * r, z + Math.sin((i / 8) * Math.PI * 2) * r]);
    return pts;
  }
}
