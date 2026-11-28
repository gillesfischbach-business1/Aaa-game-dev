import * as THREE from 'three';
import type { City, Polyline } from '../world/city';
import { animateWalk, makePerson, setCarLights, type PersonModel } from './models';
import { Vehicle } from './vehicle';

// Lebendige Stadt, erste Stufe: Autos folgen dem Strassennetz, Fussgaenger den Gehwegen.
// Nur Figuren in der Naehe der Kamera werden bewegt (Simulation nach Entfernung).

interface Node { id: number; p: THREE.Vector3; edges: { line: number; atStart: boolean }[] }

class RoadGraph {
  nodes: Node[] = [];
  lineEnds: [number, number][] = [];
  constructor(public lines: Polyline[]) {
    const key = (p: THREE.Vector3) => `${Math.round(p.x / 2)},${Math.round(p.z / 2)}`;
    const map = new Map<string, Node>();
    const get = (p: THREE.Vector3) => {
      const k = key(p);
      let n = map.get(k);
      if (!n) { n = { id: this.nodes.length, p, edges: [] }; map.set(k, n); this.nodes.push(n); }
      return n;
    };
    lines.forEach((l, i) => {
      const a = get(l.pts[0]), b = get(l.pts[l.pts.length - 1]);
      a.edges.push({ line: i, atStart: true });
      b.edges.push({ line: i, atStart: false });
      this.lineEnds.push([a.id, b.id]);
    });
  }
}

interface Agent { line: number; s: number; dir: 1 | -1; speed: number; lane: number }

function lineLength(l: Polyline): number {
  let d = 0;
  for (let i = 0; i + 1 < l.pts.length; i++) d += l.pts[i].distanceTo(l.pts[i + 1]);
  return d;
}

function pointOn(l: Polyline, s: number, out: THREE.Vector3, dirOut: THREE.Vector3): void {
  let acc = 0;
  for (let i = 0; i + 1 < l.pts.length; i++) {
    const a = l.pts[i], b = l.pts[i + 1];
    const seg = a.distanceTo(b);
    if (acc + seg >= s || i === l.pts.length - 2) {
      const t = seg > 0 ? Math.min(Math.max((s - acc) / seg, 0), 1) : 0;
      out.lerpVectors(a, b, t);
      dirOut.subVectors(b, a).setY(0).normalize();
      return;
    }
    acc += seg;
  }
}

export class Traffic {
  private graph: RoadGraph;
  private lengths: number[];
  cars: { v: Vehicle; a: Agent }[] = [];
  peds: { m: PersonModel; a: Agent; phase: number; pos: THREE.Vector3 }[] = [];
  private walkLengths: number[];
  private tmp = new THREE.Vector3();
  private tmpDir = new THREE.Vector3();

  constructor(private city: City, scene: THREE.Scene, carCount: number, pedCount: number) {
    const roads = city.drivable.filter((l) => l.width >= 5);
    this.graph = new RoadGraph(roads);
    this.lengths = roads.map(lineLength);
    const walks = city.walkways.filter((w) => lineLength(w) > 25);
    this.walkLengths = walks.map(lineLength);
    this.walkLines = walks;
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < carCount; i++) {
      const line = Math.floor(rnd() * roads.length);
      if (this.lengths[line] < 30) { i--; continue; }
      const v = new Vehicle(100 + i, i % 3);
      scene.add(v.model.root);
      this.cars.push({ v, a: { line, s: rnd() * this.lengths[line], dir: rnd() > 0.5 ? 1 : -1, speed: 8 + rnd() * 5, lane: 1.6 } });
    }
    for (let i = 0; i < pedCount && walks.length; i++) {
      const line = Math.floor(rnd() * walks.length);
      const m = makePerson(i * 13 + 5);
      scene.add(m.root);
      this.peds.push({ m, a: { line, s: rnd() * this.walkLengths[line], dir: rnd() > 0.5 ? 1 : -1, speed: 1.1 + rnd() * 0.5, lane: (rnd() - 0.5) * 1.2 }, phase: rnd() * 6, pos: new THREE.Vector3() });
    }
  }
  private walkLines: Polyline[];

  update(dt: number, focus: THREE.Vector3, playerCarPos: THREE.Vector3 | null, playerPos: THREE.Vector3, night: boolean): void {
    const roads = this.graph.lines;
    for (const { v, a } of this.cars) {
      const far = v.pos.distanceTo(focus) > 450;
      // Abstand halten zu Spieler/Spielerauto vorne
      let target = a.speed;
      const ahead = this.tmp.copy(v.pos).addScaledVector(v.forward(), 7);
      if ((playerCarPos && ahead.distanceTo(playerCarPos) < 6) || ahead.distanceTo(playerPos) < 4) target = 0;
      for (const o of this.cars) if (o.v !== v && ahead.distanceTo(o.v.pos) < 5) target = 0;
      v.speed += (target - v.speed) * Math.min(1, dt * (target < v.speed ? 3 : 0.8));
      a.s += a.dir * v.speed * dt;
      const L = this.lengths[a.line];
      if (a.s > L || a.s < 0) this.nextLine(a, a.s > L);
      const line = roads[a.line];
      pointOn(line, a.s, this.tmp, this.tmpDir);
      if (a.dir < 0) this.tmpDir.negate();
      // Rechtsverkehr: auf der rechten Fahrspur
      const right = new THREE.Vector3(-this.tmpDir.z, 0, this.tmpDir.x);
      v.pos.copy(this.tmp).addScaledVector(right, Math.min(a.lane, line.width / 4));
      const want = Math.atan2(-this.tmpDir.x, -this.tmpDir.z);
      let dh = want - v.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      v.heading += dh * Math.min(1, dt * 5);
      v.lights = night;
      if (far) { v.model.root.visible = false; continue; }
      v.model.root.visible = true;
      v.pos.y = this.city.surfaceAt(v.pos.x, v.pos.z, this.tmp.y + 1);
      v.syncModel(this.city, 0);
      v.braking = target < v.speed - 0.5;
      setCarLights(v.model, night, v.braking);
    }
    for (const p of this.peds) {
      const a = p.a;
      const far = p.pos.distanceTo(focus) > 220;
      a.s += a.dir * a.speed * dt;
      const L = this.walkLengths[a.line];
      if (a.s > L) { a.s = L; a.dir = -1; }
      if (a.s < 0) { a.s = 0; a.dir = 1; }
      if (far) { p.m.root.visible = false; continue; }
      const line = this.walkLines[a.line];
      pointOn(line, a.s, this.tmp, this.tmpDir);
      if (a.dir < 0) this.tmpDir.negate();
      const right = new THREE.Vector3(-this.tmpDir.z, 0, this.tmpDir.x);
      p.pos.copy(this.tmp).addScaledVector(right, a.lane);
      p.pos.y = this.city.surfaceAt(p.pos.x, p.pos.z, this.tmp.y + 1);
      p.m.root.visible = true;
      p.m.root.position.copy(p.pos);
      p.m.root.rotation.y = Math.atan2(-this.tmpDir.x, -this.tmpDir.z) + Math.PI;
      p.phase += dt * a.speed * 4.2;
      animateWalk(p.m, p.phase, 1);
      // Spieler zu nah -> kurz stehen bleiben (wirkt weniger mechanisch)
      if (p.pos.distanceTo(playerPos) < 1.2) a.s -= a.dir * a.speed * dt;
    }
  }

  private nextLine(a: Agent, atEnd: boolean): void {
    const ends = this.graph.lineEnds[a.line];
    const node = this.graph.nodes[ends[atEnd ? 1 : 0]];
    const options = node.edges.filter((e) => e.line !== a.line);
    if (!options.length) {  // Sackgasse: wenden
      a.dir = (a.dir * -1) as 1 | -1;
      a.s = Math.min(Math.max(a.s, 0), this.lengths[a.line]);
      return;
    }
    const pick = options[Math.floor(Math.random() * options.length)];
    a.line = pick.line;
    a.dir = pick.atStart ? 1 : -1;
    a.s = pick.atStart ? 0 : this.lengths[pick.line];
  }

  // Ist ein Verkehrsauto in der Naehe? (fuer Unfallreaktion)
  carNear(p: THREE.Vector3, r: number): Vehicle | null {
    for (const { v } of this.cars) if (v.model.root.visible && v.pos.distanceTo(p) < r) return v;
    return null;
  }
}
