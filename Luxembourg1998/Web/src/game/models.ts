import * as THREE from 'three';

// Einfache, eigenstaendig gestaltete Modelle (Kategorie D). Keine echten Marken.

export interface PersonModel {
  root: THREE.Group;
  legs: [THREE.Object3D, THREE.Object3D];
  arms: [THREE.Object3D, THREE.Object3D];
}

const CLOTHES = [0x2f4a7a, 0x7a2f3a, 0x3a5a3a, 0x5a4a7a, 0x8a6a2a, 0x2a6a6a, 0x444444, 0x6a3a5a, 0xb0a070, 0x1f2f4f];
const JEANS = [0x3a4f7a, 0x2f3a55, 0x4a5a7a, 0x222222, 0x5a4a3a];
const SKIN = [0xf1c9a5, 0xe0ac86, 0xc68c64, 0x8d5a3b, 0xf5d5b8];
const HAIR = [0x2a1a10, 0x5a3a1a, 0xb08a4a, 0x1a1a1a, 0x8a6a4a, 0x999999];

export function makePerson(seed: number, opts: { jacket?: number } = {}): PersonModel {
  const pick = <T,>(arr: T[], s: number) => arr[Math.abs(Math.floor(Math.sin(seed * 91.7 + s) * 1e4)) % arr.length];
  const root = new THREE.Group();
  const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const jacket = mat(opts.jacket ?? pick(CLOTHES, 1));
  const jeans = mat(pick(JEANS, 2));
  const skin = mat(pick(SKIN, 3));
  const hair = mat(pick(HAIR, 4));
  const shoe = mat(0x1d1a18);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.26), jacket);
  torso.position.y = 1.22;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skin);
  head.position.y = 1.68;
  head.scale.set(1, 1.15, 1.05);
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.138, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairM.position.y = 1.71;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 6), skin);
  neck.position.y = 1.56;
  root.add(torso, head, hairM, neck);

  const makeLimb = (x: number, y: number, len: number, w: number, m: THREE.Material, footMat?: THREE.Material) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const limb = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), m);
    limb.position.y = -len / 2;
    pivot.add(limb);
    if (footMat) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.08, 0.26), footMat);
      foot.position.set(0, -len + 0.04, 0.05);
      pivot.add(foot);
    } else {
      const hand = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.1, w * 0.9), skin);
      hand.position.y = -len - 0.04;
      pivot.add(hand);
    }
    root.add(pivot);
    return pivot;
  };
  const legs: [THREE.Object3D, THREE.Object3D] = [makeLimb(-0.11, 0.92, 0.88, 0.16, jeans, shoe), makeLimb(0.11, 0.92, 0.88, 0.16, jeans, shoe)];
  const arms: [THREE.Object3D, THREE.Object3D] = [makeLimb(-0.3, 1.5, 0.6, 0.12, jacket), makeLimb(0.3, 1.5, 0.6, 0.12, jacket)];
  root.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; } });
  return { root, legs, arms };
}

export function animateWalk(p: PersonModel, phase: number, amount: number): void {
  const s = Math.sin(phase) * 0.6 * amount;
  p.legs[0].rotation.x = s;
  p.legs[1].rotation.x = -s;
  p.arms[0].rotation.x = -s * 0.8;
  p.arms[1].rotation.x = s * 0.8;
}

export interface CarModel {
  root: THREE.Group;
  body: THREE.Group;
  wheels: THREE.Object3D[];
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  length: number;
  width: number;
}

const PAINT = [0xb8bcc0, 0x8a1c1c, 0x1c3a6a, 0x2a4a2a, 0xe0ddd0, 0x222222, 0x6a6a70, 0x7a5a2a, 0x3a2a4a, 0x9aa8b0];

// style 0 = kantige Limousine (Mittelklasse 80er), 1 = Kompaktwagen (Schraegheck), 2 = Kombi
export function makeCar(seed: number, style = seed % 3, paint?: number): CarModel {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const color = paint ?? PAINT[Math.abs(Math.floor(Math.sin(seed * 12.3) * 1e4)) % PAINT.length];
  const paintMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a2228, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.85 });
  const black = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.25, metalness: 0.9 });

  const L = style === 1 ? 3.95 : 4.55, W = style === 1 ? 1.66 : 1.70;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(W, 0.62, L), paintMat);
  lower.position.y = 0.62;
  body.add(lower);
  // Kabine: bei Limousine mit Kofferraumstufe, bei Kompakt/Kombi lang nach hinten
  const cabinLen = style === 0 ? L * 0.48 : style === 1 ? L * 0.55 : L * 0.62;
  const cabinZ = style === 0 ? -0.1 : style === 1 ? -0.35 : -0.45;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, 0.5, cabinLen), glass);
  cabin.position.set(0, 1.18, cabinZ);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W - 0.14, 0.06, cabinLen - 0.25), paintMat);
  roof.position.set(0, 1.45, cabinZ - 0.02);
  const pillarGeo = new THREE.BoxGeometry(0.06, 0.5, 0.08);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = new THREE.Mesh(pillarGeo, paintMat);
    p.position.set(sx * (W / 2 - 0.08), 1.18, cabinZ + sz * (cabinLen / 2 - 0.05));
    body.add(p);
  }
  body.add(cabin, roof);
  // Stossstangen (schwarzer Kunststoff, typisch spaete 80er/90er), Kuehlergrill
  const bumperGeo = new THREE.BoxGeometry(W + 0.04, 0.16, 0.14);
  const fb = new THREE.Mesh(bumperGeo, black); fb.position.set(0, 0.45, -L / 2 - 0.04);
  const rb = new THREE.Mesh(bumperGeo, black); rb.position.set(0, 0.45, L / 2 + 0.04);
  const grill = new THREE.Mesh(new THREE.BoxGeometry(W * 0.5, 0.16, 0.03), black); grill.position.set(0, 0.74, -L / 2 - 0.005);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.04, L * 0.9), chrome); strip.position.set(0, 0.72, 0);
  body.add(fb, rb, grill, strip);
  // Breite eckige Rueckleuchten-Baender (zeittypisch), Scheinwerfer
  const headlights: THREE.Mesh[] = [], taillights: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.03), new THREE.MeshStandardMaterial({ color: 0xeeeeee, emissive: 0xfff2d0, emissiveIntensity: 0 }));
    hl.position.set(sx * (W / 2 - 0.3), 0.76, -L / 2 - 0.01);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.03), new THREE.MeshStandardMaterial({ color: 0x7a1010, emissive: 0xff2010, emissiveIntensity: 0.05 }));
    tl.position.set(sx * (W / 2 - 0.33), 0.78, L / 2 + 0.01);
    headlights.push(hl); taillights.push(tl);
    body.add(hl, tl);
  }
  // Raeder
  const wheelGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.2, 14).rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.21, 10).rotateZ(Math.PI / 2);
  const wheels: THREE.Object3D[] = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const w = new THREE.Group();
    w.add(new THREE.Mesh(wheelGeo, black), new THREE.Mesh(hubGeo, chrome));
    w.position.set(sx * (W / 2 - 0.12), 0.31, sz * (L / 2 - 0.78));
    wheels.push(w);
    root.add(w);
  }
  root.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  return { root, body, wheels, headlights, taillights, length: L, width: W };
}

export function setCarLights(car: CarModel, on: boolean, braking: boolean): void {
  for (const h of car.headlights) (h.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 2.5 : 0;
  for (const t of car.taillights) (t.material as THREE.MeshStandardMaterial).emissiveIntensity = braking ? 3 : on ? 1 : 0.05;
}

// Telefonzelle (eigene Gestaltung, angelehnt an die Bauform der 90er: Glas, gelb-graue Rahmen)
export function makePhoneBooth(): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0xd8b52a, roughness: 0.5, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fb4bf, roughness: 0.05, transparent: true, opacity: 0.35 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 1.1), glass);
  box.position.y = 1.15;
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 1.2), frame);
  top.position.y = 2.42;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 1.22), new THREE.MeshStandardMaterial({ color: 0x23405e, emissive: 0x23405e, emissiveIntensity: 0.2 }));
  sign.position.y = 2.42;
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.15), new THREE.MeshStandardMaterial({ color: 0x444444 }));
  phone.position.set(0, 1.4, -0.45);
  g.add(box, top, sign, phone);
  for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.3, 0.06), frame);
    post.position.set(x, 1.15, z);
    g.add(post);
  }
  g.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  return g;
}

// Leuchtender Zielmarker (nur sichtbar, wenn die vereinfachte Navigation an ist)
export function makeMarker(): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 40, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
  );
  m.geometry.translate(0, 20, 0);
  return m;
}

// Firmenschild (Schrift auf Blech, fiktive Firmen)
export function makeSign(lines: string[], bg = '#1f3a5f', fg = '#f2e6c8', width = 5): THREE.Group {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = fg; g.textAlign = 'center';
  g.font = 'bold 52px "IBM Plex Sans", Arial, sans-serif';
  g.fillText(lines[0], 256, lines.length > 1 ? 62 : 82);
  if (lines[1]) { g.font = '26px "IBM Plex Sans", Arial, sans-serif'; g.fillText(lines[1], 256, 104); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.BoxGeometry(width, width / 4, 0.12),
    [0, 0, 0, 0, 1, 1].map((i) => (i ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }) : new THREE.MeshStandardMaterial({ color: bg }))));
  board.position.y = 3.4;
  const postMat = new THREE.MeshStandardMaterial({ color: 0x555a5e, metalness: 0.5, roughness: 0.5 });
  const g2 = new THREE.Group();
  for (const x of [-width / 2 + 0.3, width / 2 - 0.3]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), postMat);
    post.position.set(x, 1.7, 0);
    g2.add(post);
  }
  g2.add(board);
  g2.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  return g2;
}

// Verkehrspylone (orange-weiss)
export function makeCone(): THREE.Group {
  const g = new THREE.Group();
  const orange = new THREE.MeshStandardMaterial({ color: 0xe8611a, roughness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.5 });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.75, 12), orange);
  cone.position.y = 0.4;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.12, 12), white);
  band.position.y = 0.45;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), orange);
  base.position.y = 0.025;
  g.add(cone, band, base);
  g.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  return g;
}
