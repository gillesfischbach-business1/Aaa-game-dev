import * as THREE from 'three';
import type { WorldData } from './types';

// Gelaende aus dem Hoehenraster (10 m) mit bilinearer Interpolation.
export class Terrain {
  readonly x0: number;
  readonly z0: number;
  readonly step: number;
  readonly cols: number;
  readonly rows: number;
  readonly heights: Float32Array;

  constructor(t: WorldData['terrain']) {
    this.x0 = t.x0;
    this.z0 = t.z0;
    this.step = t.step;
    this.cols = t.cols;
    this.rows = t.rows;
    this.heights = Float32Array.from(t.dm, (v) => v / 10);
  }

  get maxX(): number { return this.x0 + (this.cols - 1) * this.step; }
  get maxZ(): number { return this.z0 + (this.rows - 1) * this.step; }

  heightAt(x: number, z: number): number {
    const c = Math.min(Math.max((x - this.x0) / this.step, 0), this.cols - 1.0001);
    const r = Math.min(Math.max((z - this.z0) / this.step, 0), this.rows - 1.0001);
    const c0 = Math.floor(c), r0 = Math.floor(r);
    const fc = c - c0, fr = r - r0;
    const i = r0 * this.cols + c0;
    const h = this.heights;
    const top = h[i] * (1 - fc) + h[i + 1] * fc;
    const bot = h[i + this.cols] * (1 - fc) + h[i + this.cols + 1] * fc;
    return top * (1 - fr) + bot * fr;
  }

  inside(x: number, z: number, margin = 0): boolean {
    return x >= this.x0 + margin && x <= this.maxX - margin && z >= this.z0 + margin && z <= this.maxZ - margin;
  }

  // Farbe je Eckpunkt: Wiese, Wald, Fels (steil). greenMask: 0 = keine, 1 = Wiese/Park, 2 = Wald
  buildMesh(greenMask: Uint8Array): THREE.Mesh {
    const geo = new THREE.PlaneGeometry((this.cols - 1) * this.step, (this.rows - 1) * this.step, this.cols - 1, this.rows - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const urban = new THREE.Color(0x8d8a7f), grass = new THREE.Color(0x5f7a3a), wood = new THREE.Color(0x3c5227);
    const rock = new THREE.Color(0x9b8a6a);  // Luxemburger Sandstein
    const tmp = new THREE.Color();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = r * this.cols + c;
        pos.setXYZ(i, this.x0 + c * this.step, this.heights[i], this.z0 + r * this.step);
        const hx = this.heights[Math.min(i + 1, this.heights.length - 1)] - this.heights[i];
        const hz = this.heights[Math.min(i + this.cols, this.heights.length - 1)] - this.heights[i];
        const slope = Math.hypot(hx, hz) / this.step;
        const g = greenMask[i];
        tmp.copy(g === 2 ? wood : g === 1 ? grass : urban);
        if (slope > 0.55) tmp.lerp(rock, Math.min((slope - 0.55) * 2, 1));
        const n = 0.92 + 0.16 * pseudoRandom(i);
        colors.set([tmp.r * n, tmp.g * n, tmp.b * n], i * 3);
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'terrain';
    return mesh;
  }
}

export function pseudoRandom(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function pointInPolygon(x: number, z: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
