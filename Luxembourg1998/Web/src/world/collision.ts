// Kollision gegen Gebaeudegrundrisse und Hoehe auf Bruecken (2D-Raster fuer schnelle Abfragen).

interface Seg { ax: number; az: number; bx: number; bz: number; top: number; base: number }
export interface BridgeSeg { ax: number; az: number; ay: number; bx: number; bz: number; by: number; half: number }

const CELL = 16;

class Grid<T> {
  private cells = new Map<number, T[]>();
  key(cx: number, cz: number): number { return (cx + 4096) * 8192 + (cz + 4096); }
  add(minX: number, minZ: number, maxX: number, maxZ: number, item: T): void {
    for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++) {
      for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++) {
        const k = this.key(cx, cz);
        let list = this.cells.get(k);
        if (!list) this.cells.set(k, (list = []));
        list.push(item);
      }
    }
  }
  query(x: number, z: number): T[] {
    return this.cells.get(this.key(Math.floor(x / CELL), Math.floor(z / CELL))) ?? [];
  }
}

export class CollisionWorld {
  private walls = new Grid<Seg>();
  private bridges = new Grid<BridgeSeg>();

  addFootprint(poly: [number, number][], base: number, top: number): void {
    for (let i = 0; i < poly.length; i++) {
      const [ax, az] = poly[i];
      const [bx, bz] = poly[(i + 1) % poly.length];
      const s = { ax, az, bx, bz, base, top };
      this.walls.add(Math.min(ax, bx) - 1, Math.min(az, bz) - 1, Math.max(ax, bx) + 1, Math.max(az, bz) + 1, s);
    }
  }

  addWallLine(pts: [number, number][], base: number, top: number): void {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const s = { ax, az, bx, bz, base, top };
      this.walls.add(Math.min(ax, bx) - 1, Math.min(az, bz) - 1, Math.max(ax, bx) + 1, Math.max(az, bz) + 1, s);
    }
  }

  addBridge(b: BridgeSeg): void {
    this.bridges.add(Math.min(b.ax, b.bx) - b.half, Math.min(b.az, b.bz) - b.half,
      Math.max(b.ax, b.bx) + b.half, Math.max(b.az, b.bz) + b.half, b);
  }

  // Schiebt einen Kreis (Radius r, Fuesse auf Hoehe y) aus allen Waenden heraus. Gibt true zurueck bei Kontakt.
  resolve(pos: { x: number; z: number }, r: number, y: number): boolean {
    let hit = false;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const s of this.walls.query(pos.x, pos.z)) {
        if (y > s.top - 0.3 || y + 1.8 < s.base) continue;  // ueber/unter der Wand
        const dx = s.bx - s.ax, dz = s.bz - s.az;
        const len2 = dx * dx + dz * dz || 1;
        const t = Math.min(Math.max(((pos.x - s.ax) * dx + (pos.z - s.az) * dz) / len2, 0), 1);
        const px = s.ax + dx * t, pz = s.az + dz * t;
        const ex = pos.x - px, ez = pos.z - pz;
        const d = Math.hypot(ex, ez);
        if (d < r && d > 1e-6) {
          pos.x = px + (ex / d) * r;
          pos.z = pz + (ez / d) * r;
          moved = hit = true;
        }
      }
      if (!moved) break;
    }
    return hit;
  }

  // Bruecke unter (x,z), deren Fahrbahn nahe der aktuellen Hoehe liegt.
  bridgeAt(x: number, z: number, y: number): { deck: number; seg: BridgeSeg } | null {
    let best: { deck: number; seg: BridgeSeg } | null = null;
    for (const b of this.bridges.query(x, z)) {
      const dx = b.bx - b.ax, dz = b.bz - b.az;
      const len2 = dx * dx + dz * dz || 1;
      const t = ((x - b.ax) * dx + (z - b.az) * dz) / len2;
      if (t < -0.05 || t > 1.05) continue;
      const tc = Math.min(Math.max(t, 0), 1);
      const d = Math.hypot(x - (b.ax + dx * tc), z - (b.az + dz * tc));
      if (d > b.half) continue;
      const deck = b.ay + (b.by - b.ay) * tc;
      if (y > deck - 2.5 && (!best || deck > best.deck)) best = { deck, seg: b };
    }
    return best;
  }
}
