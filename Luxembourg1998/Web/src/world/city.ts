import * as THREE from 'three';
import { CollisionWorld } from './collision';
import { Terrain, pointInPolygon, pseudoRandom } from './terrain';
import { pairs, type WorldData } from './types';

export interface Polyline { pts: THREE.Vector3[]; width: number; drivable: boolean; name?: string }

export interface City {
  root: THREE.Group;
  terrain: Terrain;
  collision: CollisionWorld;
  drivable: Polyline[];
  walkways: Polyline[];
  places: Record<string, THREE.Vector3>;
  surfaceAt(x: number, z: number, y: number): number;
  setNight(amount: number): void;  // 0 = Tag, 1 = Nacht (Fensterlicht, Laternen)
  setWet(amount: number): void;    // 0 = trocken, 1 = nass (glaenzender Asphalt, Pfuetzen-Spiegelung)
  setSeason(month: number): void;  // Laub nur Mitte April bis Oktober (Laubbaeume)
  setSnow(amount: number): void;   // 0 = kein Schnee, 1 = verschneit
  buildingFootprints: [number, number][][];
}

// ---------- Hilfen fuer Geometrie ----------
class GeoBuilder {
  pos: number[] = [];
  nrm: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];

  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, uvs: number[], color: THREE.Color): void {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
    const base = this.pos.length / 3;
    for (const v of [a, b, c, d]) {
      this.pos.push(v.x, v.y, v.z);
      this.nrm.push(n.x, n.y, n.z);
      this.col.push(color.r, color.g, color.b);
    }
    this.uv.push(...uvs);
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  tri(vs: THREE.Vector3[], tris: number[][], color: THREE.Color, normal = new THREE.Vector3(0, 1, 0)): void {
    const base = this.pos.length / 3;
    for (const v of vs) {
      this.pos.push(v.x, v.y, v.z);
      this.nrm.push(normal.x, normal.y, normal.z);
      this.uv.push(v.x / 4, v.z / 4);
      this.col.push(color.r, color.g, color.b);
    }
    for (const t of tris) this.idx.push(base + t[0], base + t[1], base + t[2]);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

// Fassaden-Textur: 4 x 4 Fensterfelder; dazu eine Leuchttextur mit zufaellig erleuchteten Fenstern.
function facadeTextures(): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const S = 512, cell = S / 4;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const e = document.createElement('canvas');
  e.width = e.height = S;
  const ge = e.getContext('2d')!;
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, S, S);
  g.fillStyle = '#f2efe8';
  g.fillRect(0, 0, S, S);
  // leichte Putzstruktur
  for (let i = 0; i < 6000; i++) {
    const v = 225 + Math.floor(pseudoRandom(i) * 30);
    g.fillStyle = `rgb(${v},${v - 3},${v - 8})`;
    g.fillRect(pseudoRandom(i + 9e3) * S, pseudoRandom(i + 7e3) * S, 2, 2);
  }
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * cell, y = row * cell;
      const wx = x + cell * 0.27, wy = y + cell * 0.2, ww = cell * 0.46, wh = cell * 0.58;
      g.fillStyle = '#d9d2c3';  // Fensterlaibung
      g.fillRect(wx - 6, wy - 6, ww + 12, wh + 14);
      g.fillStyle = '#c9c1ae';  // Fensterbank
      g.fillRect(wx - 9, wy + wh + 4, ww + 18, 7);
      const grad = g.createLinearGradient(wx, wy, wx + ww, wy + wh);
      grad.addColorStop(0, '#3d4a55');
      grad.addColorStop(1, '#1c242b');
      g.fillStyle = grad;
      g.fillRect(wx, wy, ww, wh);
      g.fillStyle = '#e8e4da';  // Fensterkreuz (Holz, hell gestrichen)
      g.fillRect(wx + ww / 2 - 2, wy, 4, wh);
      g.fillRect(wx, wy + wh * 0.35, ww, 4);
      // Rollladenkasten bei manchen Fenstern (typisch 1970-90er)
      if (pseudoRandom(row * 4 + col + 50) > 0.6) {
        g.fillStyle = '#b8b2a5';
        g.fillRect(wx, wy, ww, wh * (0.15 + pseudoRandom(row * 4 + col) * 0.4));
      }
      if (pseudoRandom(row * 7 + col * 3 + 11) > 0.55) {
        const warm = pseudoRandom(row + col * 5) > 0.3;
        ge.fillStyle = warm ? '#ffcf8a' : '#c8d8ff';
        ge.fillRect(wx, wy, ww, wh);
        ge.fillStyle = '#000';
        ge.fillRect(wx + ww / 2 - 2, wy, 4, wh);
        ge.fillRect(wx, wy + wh * 0.35, ww, 4);
      }
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const emissive = new THREE.CanvasTexture(e);
  emissive.wrapS = emissive.wrapT = THREE.RepeatWrapping;
  emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
}

function noiseTexture(base: [number, number, number], spread: number, size = 256, seed = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const n = (pseudoRandom(i * 1.7 + seed) - 0.5) * spread;
    img.data[i * 4] = base[0] + n;
    img.data[i * 4 + 1] = base[1] + n;
    img.data[i * 4 + 2] = base[2] + n;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Putz- und Steinfarben (Kategorie C: zeittypische Annaeherung)
const PLASTER = [0xe8dcc4, 0xd9c7a3, 0xcfc6b8, 0xe3d3b0, 0xc9b28a, 0xd8d0c4, 0xb9b0a2, 0xe6e0d2, 0xd2b893, 0xbfc3bd];
const SANDSTONE = [0xc8b48a, 0xbfa77a, 0xd1bf98];
const ROOF = [0x4a4d52, 0x3e4146, 0x55524e, 0x6b4a3a];

export function buildCity(data: WorldData, scene: THREE.Scene, opts: { trees: number }): City {
  const root = new THREE.Group();
  root.name = 'city';
  scene.add(root);
  const terrain = new Terrain(data.terrain);
  const collision = new CollisionWorld();

  // ---------- Gruenflaechen in die Gelaendefarbe einrechnen ----------
  const mask = new Uint8Array(terrain.cols * terrain.rows);
  const greenPolys = data.green.map((g) => ({ poly: pairs(g.p), t: g.t }));
  for (const { poly, t } of greenPolys) {
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const [x, z] of poly) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    const c0 = Math.max(0, Math.floor((minX - terrain.x0) / terrain.step)), c1 = Math.min(terrain.cols - 1, Math.ceil((maxX - terrain.x0) / terrain.step));
    const r0 = Math.max(0, Math.floor((minZ - terrain.z0) / terrain.step)), r1 = Math.min(terrain.rows - 1, Math.ceil((maxZ - terrain.z0) / terrain.step));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (pointInPolygon(terrain.x0 + c * terrain.step, terrain.z0 + r * terrain.step, poly)) mask[r * terrain.cols + c] = t === 2 || t === 3 ? 2 : 1;
    }
  }
  const terrainMesh = terrain.buildMesh(mask);
  root.add(terrainMesh);
  let crownMesh: THREE.InstancedMesh | null = null;

  // ---------- Gebaeude ----------
  const { map: facadeMap, emissive: facadeEmissive } = facadeTextures();
  const walls = new GeoBuilder();
  const roofs = new GeoBuilder();
  const canopies = new GeoBuilder();
  const footprints: [number, number][][] = [];
  const color = new THREE.Color();
  const FLOOR = 3.3, BAY = 3.4;  // Geschosshoehe und Fensterachse (m)
  data.buildings.forEach((b, bi) => {
    let poly = pairs(b.p);
    if (poly.length < 3) return;
    // Umlaufsinn vereinheitlichen (gegen den Uhrzeigersinn in x/z), damit Normalen nach aussen zeigen
    if (THREE.ShapeUtils.isClockWise(poly.map(([x, z]) => new THREE.Vector2(x, z)))) poly = poly.reverse();
    const top = b.b + b.h;
    if (b.k === 6) {
      // Offene Ueberdachung (Vordach, Carport): Dachflaeche auf Hoehe, keine Waende, keine Kollision
      const v2 = poly.map(([x, z]) => new THREE.Vector2(x, z));
      const tris = THREE.ShapeUtils.triangulateShape(v2, []);
      canopies.tri(poly.map(([x, z]) => new THREE.Vector3(x, top, z)), tris.map((t) => [t[0], t[2], t[1]]), new THREE.Color(0xc8ccd0));
      return;
    }
    footprints.push(poly);
    collision.addFootprint(poly, b.b, top);
    const r = pseudoRandom(bi * 3.1);
    const palette = b.k === 1 || b.k === 2 || b.k === 3 ? SANDSTONE : PLASTER;
    color.setHex(b.k === 4 ? 0xa8a49c : palette[Math.floor(r * palette.length)]);
    let perim = 0;
    for (let i = 0; i < poly.length; i++) {
      const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length];
      const len = Math.hypot(bx - ax, bz - az);
      // Fenster nur, wenn die Wand breit genug ist; kleine Nebengebaeude ohne Fenster (v im Wandbereich)
      const u0 = perim / BAY, u1 = (perim + len) / BAY;
      const vTop = b.k === 4 ? 0.02 : (b.h - 0.2) / FLOOR;
      const vBase = 0;
      // Textur hat 4 Felder je Richtung -> UV / 4
      walls.quad(
        new THREE.Vector3(ax, b.b, az), new THREE.Vector3(bx, b.b, bz), new THREE.Vector3(bx, top, bz), new THREE.Vector3(ax, top, az),
        [u0 / 4, (vBase - b.b * 0) / 4, u1 / 4, vBase / 4, u1 / 4, vTop / 4, u0 / 4, vTop / 4], color,
      );
      perim += len;
    }
    // Dach: einfache Rechtecke bekommen ein Satteldach, sonst Flachdach
    const roofColor = new THREE.Color(ROOF[Math.floor(pseudoRandom(bi * 7.7) * ROOF.length)]);
    if (poly.length === 4 && b.k !== 4 && b.h > 6 && !b.q?.length) {
      const [p0, p1, p2, p3] = poly.map(([x, z]) => new THREE.Vector3(x, top, z));
      const l01 = p0.distanceTo(p1), l12 = p1.distanceTo(p2);
      const ridgeH = Math.min(Math.min(l01, l12) * 0.45, 5);
      const [a, bb, c, d] = l01 >= l12 ? [p0, p1, p2, p3] : [p1, p2, p3, p0];
      const m1 = new THREE.Vector3().addVectors(a, d).multiplyScalar(0.5).setY(top + ridgeH);
      const m2 = new THREE.Vector3().addVectors(bb, c).multiplyScalar(0.5).setY(top + ridgeH);
      roofs.quad(a, bb, m2, m1, [0, 0, 1, 0, 1, 1, 0, 1], roofColor);
      roofs.quad(c, d, m1, m2, [0, 0, 1, 0, 1, 1, 0, 1], roofColor);
      walls.tri([d, a, m1], [[0, 1, 2]], color, new THREE.Vector3().subVectors(a, d).cross(new THREE.Vector3(0, 1, 0)).normalize().negate());
      walls.tri([bb, c, m2], [[0, 1, 2]], color, new THREE.Vector3().subVectors(c, bb).cross(new THREE.Vector3(0, 1, 0)).normalize().negate());
    } else {
      // Flachdach mit Innenhoefen. Dreiecke, deren Mitte nicht ueber dem Gebaeude liegt, werden verworfen
      // (bei verwinkelten OSM-Grundrissen liefert die Triangulierung sonst Dachflaechen ueber Plaetzen).
      const holes = (b.q ?? []).map((h) => {
        let hp = pairs(h);
        if (!THREE.ShapeUtils.isClockWise(hp.map(([x, z]) => new THREE.Vector2(x, z)))) hp = hp.reverse();
        return hp;
      });
      const v2 = poly.map(([x, z]) => new THREE.Vector2(x, z));
      const h2 = holes.map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
      const all = [...poly, ...holes.flat()];
      const tris = THREE.ShapeUtils.triangulateShape(v2, h2).filter((t) => {
        const cx = (all[t[0]][0] + all[t[1]][0] + all[t[2]][0]) / 3, cz = (all[t[0]][1] + all[t[1]][1] + all[t[2]][1]) / 3;
        return pointInPolygon(cx, cz, poly) && !holes.some((h) => pointInPolygon(cx, cz, h));
      });
      roofs.tri(all.map(([x, z]) => new THREE.Vector3(x, top, z)), tris.map((t) => [t[0], t[2], t[1]]), roofColor.clone().multiplyScalar(0.85));
      // Hofwaende (Normalen zeigen in den Hof)
      for (const h of holes) {
        collision.addFootprint(h, b.b, top);
        let hp = 0;
        for (let i = 0; i < h.length; i++) {
          const [ax, az] = h[i], [bx, bz] = h[(i + 1) % h.length];
          const len = Math.hypot(bx - ax, bz - az);
          const vTop = (b.h - 0.2) / FLOOR;
          walls.quad(new THREE.Vector3(ax, b.b, az), new THREE.Vector3(bx, b.b, bz), new THREE.Vector3(bx, top, bz), new THREE.Vector3(ax, top, az),
            [hp / BAY / 4, 0, (hp + len) / BAY / 4, 0, (hp + len) / BAY / 4, vTop / 4, hp / BAY / 4, vTop / 4], color);
          hp += len;
        }
      }
    }
  });
  const facadeMat = new THREE.MeshStandardMaterial({
    // beidseitig: OSM-Grundrisse sind nicht immer korrekt orientiert (sonst Blick durch Waende)
    map: facadeMap, vertexColors: true, roughness: 0.88, side: THREE.DoubleSide, emissiveMap: facadeEmissive, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0,
  });
  const wallMesh = new THREE.Mesh(walls.build(), facadeMat);
  wallMesh.castShadow = wallMesh.receiveShadow = true;
  wallMesh.name = 'buildings';
  const roofMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.05, side: THREE.DoubleSide });
  const roofMesh = new THREE.Mesh(roofs.build(), roofMat);
  roofMesh.castShadow = roofMesh.receiveShadow = true;
  root.add(wallMesh, roofMesh);
  if (canopies.pos.length) {
    const canopyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.3, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    const canopyMesh = new THREE.Mesh(canopies.build(), canopyMat);
    canopyMesh.name = 'canopies';
    root.add(canopyMesh);
  }

  // ---------- Strassen, Wege, Bruecken ----------
  const asphalt = new GeoBuilder(), paving = new GeoBuilder(), gravel = new GeoBuilder(), marks = new GeoBuilder(), stone = new GeoBuilder();
  const drivable: Polyline[] = [], walkways: Polyline[] = [];
  const white = new THREE.Color(0xe8e8e0), plain = new THREE.Color(0xffffff);
  const stoneColor = new THREE.Color(0xb7a57f);
  const lampSpots: { p: THREE.Vector3; dir: THREE.Vector3 }[] = [];

  const ribbon = (gb: GeoBuilder, pts: THREE.Vector3[], width: number, lift: number, c: THREE.Color, uvScale = 4) => {
    let dist = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z);
      const len = dir.length();
      if (len < 0.01) continue;
      dir.divideScalar(len);
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2);
      const v0 = dist / uvScale, v1 = (dist + len) / uvScale;
      gb.quad(
        new THREE.Vector3(a.x - side.x, a.y + lift, a.z - side.z), new THREE.Vector3(a.x + side.x, a.y + lift, a.z + side.z),
        new THREE.Vector3(b.x + side.x, b.y + lift, b.z + side.z), new THREE.Vector3(b.x - side.x, b.y + lift, b.z - side.z),
        [0, v0, width / uvScale, v0, width / uvScale, v1, 0, v1], c,
      );
      dist += len;
    }
  };

  // Strassenpunkte: Bruecken behalten ihre gespannte Hoehe, sonst Gelaende; lange Stuecke unterteilen
  const densify = (flat: number[], ys?: number[]): THREE.Vector3[] => {
    const p = pairs(flat);
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < p.length; i++) {
      const y = ys ? ys[i] : terrain.heightAt(p[i][0], p[i][1]);
      const cur = new THREE.Vector3(p[i][0], y, p[i][1]);
      if (i > 0 && !ys) {
        const prev = out[out.length - 1];
        const n = Math.floor(prev.distanceTo(cur) / 6);
        for (let k = 1; k <= n; k++) {
          const t = k / (n + 1);
          const x = prev.x + (cur.x - prev.x) * t, z = prev.z + (cur.z - prev.z) * t;
          out.push(new THREE.Vector3(x, terrain.heightAt(x, z), z));
        }
      }
      out.push(cur);
    }
    return out;
  };

  // Nur Abschnitte innerhalb des Spielfelds (Hoehendaten) verwenden
  const clipRuns = (flat: number[], ys?: number[]): { p: number[]; y?: number[] }[] => {
    const runs: { p: number[]; y?: number[] }[] = [];
    let cur: { p: number[]; y?: number[] } | null = null;
    for (let i = 0; i + 1 < flat.length; i += 2) {
      if (terrain.inside(flat[i], flat[i + 1], 2)) {
        if (!cur) runs.push((cur = { p: [], y: ys ? [] : undefined }));
        cur.p.push(flat[i], flat[i + 1]);
        if (ys && cur.y) cur.y.push(ys[i / 2]);
      } else cur = null;
    }
    return runs.filter((r) => r.p.length >= 4);
  };
  const roadsClipped = data.roads.flatMap((r) => clipRuns(r.p, r.y).map((run) => ({ ...r, p: run.p, y: run.y })));

  for (const r of roadsClipped) {
    const isBridge = !!r.y;
    const pts = densify(r.p, r.y);
    const type = r.t;
    const lift = isBridge ? 0 : r.c ? 0.12 : 0.16;
    if (r.c) {
      ribbon(asphalt, pts, r.w, lift, plain, 6);
      drivable.push({ pts, width: r.w, drivable: true, name: r.n });
      if (type <= 1) {  // Mittellinie auf Haupt- und Nebenstrassen, gestrichelt
        for (let i = 0; i + 1 < pts.length; i++) if (i % 2 === 0) ribbon(marks, [pts[i], pts[i + 1]], 0.14, lift + 0.02, white);
      }
      // Laternen alle ~35 m
      let acc = 0;
      for (let i = 0; i + 1 < pts.length; i++) {
        const seg = pts[i].distanceTo(pts[i + 1]);
        acc += seg;
        if (acc > 35 && type <= 5) {
          acc = 0;
          const dir = new THREE.Vector3().subVectors(pts[i + 1], pts[i]).setY(0).normalize();
          const side = new THREE.Vector3(-dir.z, 0, dir.x);
          const s = (i % 4 < 2 ? 1 : -1) * (r.w / 2 + 0.8);
          lampSpots.push({ p: pts[i].clone().addScaledVector(side, s), dir: side.clone().multiplyScalar(-Math.sign(s)) });
        }
      }
    } else {
      const gb = type === 9 || type === 12 ? gravel : paving;
      ribbon(gb, pts, r.w, lift, type === 10 ? new THREE.Color(0xcfc8b8) : plain, 2);
      walkways.push({ pts, width: r.w, drivable: false, name: r.n });
    }
    if (isBridge) {
      // Bruecke: Bruestungen, Unterseite, Pfeiler; Fahrbahn als begehbare Flaeche registrieren
      const half = r.w / 2 + 0.6;
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i], b = pts[i + 1];
        collision.addBridge({ ax: a.x, az: a.z, ay: a.y, bx: b.x, bz: b.z, by: b.y, half });
        const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
        const side = new THREE.Vector3(-dir.z, 0, dir.x);
        for (const s of [-1, 1]) {
          const off = side.clone().multiplyScalar(s * half);
          const a0 = a.clone().add(off), b0 = b.clone().add(off);
          stone.quad(a0, b0, b0.clone().setY(b0.y + 1.1), a0.clone().setY(a0.y + 1.1), [0, 0, 1, 0, 1, 0.3, 0, 0.3], stoneColor);
          stone.quad(b0, a0, a0.clone().setY(a0.y + 1.1), b0.clone().setY(b0.y + 1.1), [0, 0, 1, 0, 1, 0.3, 0, 0.3], stoneColor);
          collision.addWallLine([[a0.x, a0.z], [b0.x, b0.z]], Math.min(a0.y, b0.y) - 0.2, Math.max(a0.y, b0.y) + 1.1);
        }
        const offL = side.clone().multiplyScalar(-half), offR = side.clone().multiplyScalar(half);
        stone.quad(a.clone().add(offR).setY(a.y - 1.2), b.clone().add(offR).setY(b.y - 1.2), b.clone().add(offL).setY(b.y - 1.2), a.clone().add(offL).setY(a.y - 1.2), [0, 0, 1, 0, 1, 1, 0, 1], stoneColor);
      }
      let acc = 0;
      for (let i = 0; i + 1 < pts.length; i++) {
        acc += pts[i].distanceTo(pts[i + 1]);
        if (acc < 22) continue;
        acc = 0;
        const p = pts[i + 1];
        const ground = terrain.heightAt(p.x, p.z);
        if (p.y - ground < 4) continue;
        const w = 2.2, h = p.y - 1.2 - ground + 2;
        const pier = new THREE.Mesh(new THREE.BoxGeometry(w, h, r.w + 1), undefined);
        pier.geometry.translate(0, ground - 2 + h / 2, 0);
        const dir = new THREE.Vector3().subVectors(pts[i + 1], pts[i]).setY(0).normalize();
        pier.geometry.rotateY(Math.atan2(dir.x, dir.z) + Math.PI / 2);
        pier.geometry.translate(p.x, 0, p.z);
        const pg = pier.geometry.toNonIndexed();
        const pc = new Float32Array((pg.attributes.position.count) * 3).fill(0);
        for (let k = 0; k < pg.attributes.position.count; k++) pc.set([stoneColor.r, stoneColor.g, stoneColor.b], k * 3);
        pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
        const base = stone.pos.length / 3;
        const pp = pg.attributes.position.array as Float32Array, pn = pg.attributes.normal.array as Float32Array;
        for (let k = 0; k < pg.attributes.position.count; k++) {
          stone.pos.push(pp[k * 3], pp[k * 3 + 1], pp[k * 3 + 2]);
          stone.nrm.push(pn[k * 3], pn[k * 3 + 1], pn[k * 3 + 2]);
          stone.uv.push(pp[k * 3] / 3, pp[k * 3 + 1] / 3);
          stone.col.push(stoneColor.r, stoneColor.g, stoneColor.b);
          stone.idx.push(base + k);
        }
      }
    }
  }

  // Gleise (Schotterbett + zwei Schienen)
  for (const rl of data.rails.flatMap((r) => clipRuns(r.p))) {
    const pts = densify(rl.p);
    ribbon(gravel, pts, 3.2, 0.1, new THREE.Color(0x8a7f70), 2);
    for (const off of [-0.72, 0.72]) {
      const shifted = pts.map((p, i) => {
        const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
        const dir = new THREE.Vector3(q.x - o.x, 0, q.z - o.z).normalize();
        return new THREE.Vector3(p.x - dir.z * off, p.y, p.z + dir.x * off);
      });
      ribbon(marks, shifted, 0.08, 0.25, new THREE.Color(0x55524d));
    }
  }

  // Mauern (Festung: hoher Sandstein; sonst niedrige Stuetzmauern)
  for (const w of data.walls.flatMap((x) => clipRuns(x.p).map((run) => ({ ...x, p: run.p })))) {
    const pts = densify(w.p);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      const c = w.k ? stoneColor : new THREE.Color(0x9c9284);
      stone.quad(a, b, b.clone().setY(b.y + w.h), a.clone().setY(a.y + w.h), [0, 0, a.distanceTo(b) / 3, 0, a.distanceTo(b) / 3, w.h / 3, 0, w.h / 3], c);
      stone.quad(b, a, a.clone().setY(a.y + w.h), b.clone().setY(b.y + w.h), [0, 0, a.distanceTo(b) / 3, 0, a.distanceTo(b) / 3, w.h / 3, 0, w.h / 3], c);
    }
    // Festungsmauer: Kollision nur so hoch wie die Mauer selbst (sonst sperrt sie Bruecken und Strassen darueber)
    if (w.k) {
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i], b = pts[i + 1];
        collision.addWallLine([[a.x, a.z], [b.x, b.z]], Math.min(a.y, b.y) - 0.5, Math.max(a.y, b.y) + w.h);
      }
    }
  }

  // Wasser (Petrusse/Alzette)
  const water = new GeoBuilder();
  for (const wt of data.water) {
    if (wt.a) continue;
    for (const run of clipRuns(wt.p)) ribbon(water, densify(run.p), 4, 0.25, new THREE.Color(0x4f6b6e));
  }

  const asphaltMat = new THREE.MeshStandardMaterial({ map: noiseTexture([62, 63, 66], 26), vertexColors: true, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2 });
  const pavingMat = new THREE.MeshStandardMaterial({ map: noiseTexture([150, 143, 132], 40, 256, 7), vertexColors: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3 });
  const gravelMat = new THREE.MeshStandardMaterial({ map: noiseTexture([128, 118, 104], 60, 256, 3), vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  const marksMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -4 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: noiseTexture([200, 190, 170], 50, 256, 5), vertexColors: true, roughness: 0.9 });
  const waterMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const [gb, mat, name] of [[asphalt, asphaltMat, 'roads'], [paving, pavingMat, 'paving'], [gravel, gravelMat, 'gravel'],
    [marks, marksMat, 'marks'], [stone, stoneMat, 'stone'], [water, waterMat, 'water']] as const) {
    if (!gb.pos.length) continue;
    const m = new THREE.Mesh(gb.build(), mat);
    m.receiveShadow = true;
    m.castShadow = name === 'stone';
    m.name = name;
    root.add(m);
  }

  // ---------- Baeume ----------
  const treeSpots: THREE.Vector3[] = [];
  let seed = 1;
  for (const { poly, t } of greenPolys) {
    if (treeSpots.length >= opts.trees) break;
    const density = t === 2 ? 1 / 70 : t === 3 ? 1 / 120 : 1 / 300;
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const [x, z] of poly) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    const area = (maxX - minX) * (maxZ - minZ);
    const n = Math.min(Math.floor(area * density), 400);
    for (let i = 0; i < n && treeSpots.length < opts.trees; i++) {
      const x = minX + pseudoRandom(seed++) * (maxX - minX), z = minZ + pseudoRandom(seed++) * (maxZ - minZ);
      if (pointInPolygon(x, z, poly) && terrain.inside(x, z)) treeSpots.push(new THREE.Vector3(x, terrain.heightAt(x, z), z));
    }
  }
  if (treeSpots.length) {
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 3, 5).translate(0, 1.5, 0);
    const crownGeo = new THREE.IcosahedronGeometry(2.6, 1).translate(0, 5, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 }), treeSpots.length);
    const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }), treeSpots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    const greens = [0x3f5a2a, 0x4d6b30, 0x56702f, 0x3a5126, 0x607a3a];
    treeSpots.forEach((p, i) => {
      const sc = 0.7 + pseudoRandom(i * 3.3) * 0.8;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pseudoRandom(i) * 6.28);
      m.compose(p, q, s.set(sc, sc * (0.9 + pseudoRandom(i + 1) * 0.4), sc));
      trunks.setMatrixAt(i, m);
      crowns.setMatrixAt(i, m);
      crowns.setColorAt(i, new THREE.Color(greens[i % greens.length]));
    });
    trunks.castShadow = crowns.castShadow = true;
    crowns.receiveShadow = true;
    root.add(trunks, crowns);
    crownMesh = crowns;
  }

  // ---------- Strassenlaternen ----------
  const poleGeo = new THREE.CylinderGeometry(0.07, 0.1, 6, 6).translate(0, 3, 0);
  const headGeo = new THREE.BoxGeometry(0.45, 0.18, 0.9).translate(0, 6, 0.5);
  const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0x3b3f3c, roughness: 0.6, metalness: 0.4 }), lampSpots.length);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x777777, emissive: new THREE.Color(0xffb35c), emissiveIntensity: 0 });
  const heads = new THREE.InstancedMesh(headGeo, headMat, lampSpots.length);
  const lm = new THREE.Matrix4(), lq = new THREE.Quaternion();
  lampSpots.forEach((l, i) => {
    lq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(l.dir.x, l.dir.z));
    lm.compose(l.p, lq, new THREE.Vector3(1, 1, 1));
    poles.setMatrixAt(i, lm);
    heads.setMatrixAt(i, lm);
  });
  poles.castShadow = true;
  root.add(poles, heads);

  const places: Record<string, THREE.Vector3> = {};
  for (const [k, [x, y, z]] of Object.entries(data.places)) places[k] = new THREE.Vector3(x, y, z);

  return {
    root, terrain, collision, drivable, walkways, places, buildingFootprints: footprints,
    surfaceAt(x: number, z: number, y: number): number {
      const ground = terrain.heightAt(x, z);
      const br = collision.bridgeAt(x, z, y);
      return br && br.deck > ground ? br.deck : ground;
    },
    setSeason(month: number): void {
      if (crownMesh) crownMesh.visible = month >= 4 && month <= 10;
    },
    setSnow(amount: number): void {
      // Schnee als helle Selbstleuchtung auf Gelaende und Daechern (einfache Naeherung)
      const tm = terrainMesh.material as THREE.MeshStandardMaterial;
      tm.emissive.setScalar(0.55 * amount);
      roofMat.emissive.setScalar(0.45 * amount);
    },
    setWet(amount: number): void {
      asphaltMat.roughness = 0.92 - 0.72 * amount;
      asphaltMat.metalness = 0.25 * amount;
      asphaltMat.color.setScalar(1 - 0.35 * amount);
      pavingMat.roughness = 0.9 - 0.6 * amount;
      pavingMat.color.setScalar(1 - 0.3 * amount);
      roofMat.roughness = 0.75 - 0.5 * amount;
    },
    setNight(amount: number): void {
      facadeMat.emissiveIntensity = amount * 0.9;
      headMat.emissiveIntensity = amount * 3;
    },
  };
}
