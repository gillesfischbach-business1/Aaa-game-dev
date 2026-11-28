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
  /** alle Eintraege der Zellen, die ein Kreis (x, z, r) beruehrt – ohne Doppelte */
  queryArea(x: number, z: number, r: number): T[] {
    const out = new Set<T>();
    for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) {
      for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++) {
        for (const it of this.cells.get(this.key(cx, cz)) ?? []) out.add(it);
      }
    }
    return [...out];
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

  /**
   * Erste Wand zwischen zwei Punkten (2D, Hoehe y): Anteil t (0..1) entlang der Strecke, 1 = frei.
   * Fuer die Kamera: sie darf nicht hinter/in Gebaeuden landen.
   */
  firstHit(ax: number, az: number, bx: number, bz: number, y: number): number {
    let best = 1;
    const len = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.ceil(len / (CELL * 0.5)));
    const seen = new Set<Seg>();
    for (let i = 0; i <= steps; i++) {
      const px = ax + ((bx - ax) * i) / steps, pz = az + ((bz - az) * i) / steps;
      for (const s of this.walls.query(px, pz)) {
        if (seen.has(s)) continue;
        seen.add(s);
        if (y > s.top || y < s.base - 0.5) continue;
        // Schnitt Strecke A-B mit Wandstueck S
        const rx = bx - ax, rz = bz - az, sx = s.bx - s.ax, sz = s.bz - s.az;
        const den = rx * sz - rz * sx;
        if (Math.abs(den) < 1e-9) continue;
        const qx = s.ax - ax, qz = s.az - az;
        const t = (qx * sz - qz * sx) / den, u = (qx * rz - qz * rx) / den;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1 && t < best) best = t;
      }
    }
    return best;
  }

  addBridge(b: BridgeSeg): void {
    this.bridges.add(Math.min(b.ax, b.bx) - b.half, Math.min(b.az, b.bz) - b.half,
      Math.max(b.ax, b.bx) + b.half, Math.max(b.az, b.bz) + b.half, b);
  }

  /** Kleinster Abstand von (x, z) zu einer Wand auf Hoehe y (bis maxR; sonst maxR) */
  nearestWallDist(x: number, z: number, y: number, maxR: number): number {
    let best = maxR;
    for (const s of this.walls.queryArea(x, z, maxR)) {
      if (y > s.top - 0.3 || y + 1.8 < s.base) continue;
      const dx = s.bx - s.ax, dz = s.bz - s.az;
      const len2 = dx * dx + dz * dz || 1;
      const t = Math.min(Math.max(((x - s.ax) * dx + (z - s.az) * dz) / len2, 0), 1);
      best = Math.min(best, Math.hypot(x - (s.ax + dx * t), z - (s.az + dz * t)));
    }
    return best;
  }

  /**
   * Schiebt einen Kreis (Radius r, Fuesse auf Hoehe y) aus allen Waenden heraus. Gibt true zurueck bei Kontakt.
   * from = Position vor der Bewegung: Wird dabei eine Wand ueberquert (schnelles Auto, Ruckeln am Handy),
   * bleibt der Kreis vor der Wand stehen. Liegt der Mittelpunkt genau auf einer Wand, wird zur Herkunftsseite geschoben.
   */
  resolve(pos: { x: number; z: number }, r: number, y: number, from?: { x: number; z: number }): boolean {
    let hit = false;
    if (from && (from.x !== pos.x || from.z !== pos.z)) {
      const mx = pos.x - from.x, mz = pos.z - from.z;
      let tMin = 1;
      for (const s of this.walls.queryArea((pos.x + from.x) / 2, (pos.z + from.z) / 2, Math.hypot(mx, mz) / 2 + 1)) {
        if (y > s.top - 0.3 || y + 1.8 < s.base) continue;
        const sx = s.bx - s.ax, sz = s.bz - s.az;
        const den = mx * sz - mz * sx;
        if (Math.abs(den) < 1e-12) continue;
        const qx = s.ax - from.x, qz = s.az - from.z;
        const t = (qx * sz - qz * sx) / den, u = (qx * mz - qz * mx) / den;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1 && t < tMin) tMin = t;
      }
      if (tMin < 1) {
        const back = Math.max(0, tMin - 0.05 / Math.max(1e-6, Math.hypot(mx, mz)));
        pos.x = from.x + mx * back;
        pos.z = from.z + mz * back;
        hit = true;
      }
    }
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const s of this.walls.queryArea(pos.x, pos.z, r)) {
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
        } else if (d <= 1e-6) {
          // genau auf der Wand: senkrecht zur Wand schieben, zur Seite, von der man kam
          const len = Math.sqrt(len2);
          let nx = -dz / len, nz = dx / len;
          if (from && (from.x - px) * nx + (from.z - pz) * nz < 0) { nx = -nx; nz = -nz; }
          pos.x = px + nx * r;
          pos.z = pz + nz * r;
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
