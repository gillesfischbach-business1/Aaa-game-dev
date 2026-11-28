// Regressionstest "eingesperrt im Hof": Vom Startpunkt am Bahnhof muss man frei in die Stadt laufen koennen.
// Baut die Kollision wie city.ts aus world.json nach (Grundrisse, Innenhoefe, hohe Mauern) und fuellt die
// begehbare Flaeche auf einem 1-m-Raster (Spielerradius 0,35 m) von der Startstelle aus.
import { describe, expect, it } from 'vitest';
import world from '../src/data/world.json';
import { CollisionWorld } from '../src/world/collision';
import { Terrain } from '../src/world/terrain';
import { pairs, type WorldData } from '../src/world/types';

const W = world as unknown as WorldData;

function pointIn(x: number, z: number, poly: [number, number][]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

describe('Erreichbarkeit vom Start', () => {
  const terrain = new Terrain(W.terrain);
  const col = new CollisionWorld();
  const footprints: [number, number][][] = [];
  for (const b of W.buildings) {
    if (b.k === 6) continue;  // offene Ueberdachungen haben keine Kollision
    const poly = pairs(b.p);
    footprints.push(poly);
    col.addFootprint(poly, b.b, b.b + b.h);
    for (const h of b.q ?? []) col.addFootprint(pairs(h), b.b, b.b + b.h);
  }
  for (const w of W.walls) {
    if (!w.k) continue;
    const pts = pairs(w.p);
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const ya = terrain.heightAt(ax, az), yb = terrain.heightAt(bx, bz);
      col.addWallLine([[ax, az], [bx, bz]], Math.min(ya, yb) - 0.5, Math.max(ya, yb) + w.h);
    }
  }
  // Raster (32 m) mit den Grundrissen, deren Rechteck die Zelle beruehrt – sonst dauert der Test Minuten
  const cellMap = new Map<number, [number, number][][]>();
  const key = (cx: number, cz: number) => (cx + 1000) * 4000 + (cz + 1000);
  for (const fp of footprints) {
    const xs = fp.map((p) => p[0]), zs = fp.map((p) => p[1]);
    for (let cx = Math.floor(Math.min(...xs) / 32); cx <= Math.floor(Math.max(...xs) / 32); cx++) {
      for (let cz = Math.floor(Math.min(...zs) / 32); cz <= Math.floor(Math.max(...zs) / 32); cz++) {
        const k = key(cx, cz);
        if (!cellMap.has(k)) cellMap.set(k, []);
        cellMap.get(k)!.push(fp);
      }
    }
  }
  const inside = (x: number, z: number) => (cellMap.get(key(Math.floor(x / 32), Math.floor(z / 32))) ?? []).some((fp) => pointIn(x, z, fp));
  const free = (x: number, z: number) => col.nearestWallDist(x, z, terrain.heightAt(x, z), 0.35) >= 0.35 && !inside(x, z);

  // Startpunkt wie Game.openSpot(gare + (-10, 0, -45), false, 0, 4): naechster Wegpunkt mit 4 m Platz ringsum
  const [gx, , gz] = W.places.gare;
  const tx = gx - 10, tz = gz - 45;
  const cands: [number, number, number][] = [];
  for (const r of W.roads) for (const [x, z] of pairs(r.p)) cands.push([x, z, (x - tx) ** 2 + (z - tz) ** 2]);
  cands.sort((a, b) => a[2] - b[2]);
  const start = cands.find(([x, z]) => col.nearestWallDist(x, z, terrain.heightAt(x, z), 4) >= 4 && !inside(x, z))!;

  it('Startpunkt liegt frei (nicht auf einer Gebaeudekante)', () => {
    expect(start).toBeDefined();
    expect(free(start[0], start[1])).toBe(true);
  });

  it('von dort ist ein grosses Stueck Stadt erreichbar (kein eingeschlossener Hof)', () => {
    const R = 260, size = 2 * R + 1;
    const seen = new Uint8Array(size * size);
    const sx = Math.round(start[0]), sz = Math.round(start[1]);
    const queue: number[] = [R * size + R];
    seen[R * size + R] = 1;
    let area = 0;
    while (queue.length) {
      const k = queue.pop()!;
      area++;
      const i = Math.floor(k / size), j = k % size;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= size || nj >= size) continue;
        const nk = ni * size + nj;
        if (seen[nk]) continue;
        seen[nk] = 1;
        const x = sx + nj - R, z = sz + ni - R;
        if (free(x, z)) queue.push(nk);
      }
    }
    expect(area).toBeGreaterThan(10000);  // m²; im Bahnhofsgebaeude eingesperrt waeren es ~2 300
  }, 60000);
});
