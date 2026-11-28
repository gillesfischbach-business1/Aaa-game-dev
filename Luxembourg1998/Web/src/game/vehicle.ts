import * as THREE from 'three';
import type { City } from '../world/city';
import { makeCar, setCarLights, type CarModel } from './models';

// Fahrzeugphysik (vereinfachtes Einspurmodell): Antrieb, Bremsen, Luft-/Rollwiderstand, Hangabtrieb,
// Lenkung abhaengig von der Geschwindigkeit, Handbremse, Kollision mit Gebaeuden, Schaden, Verbrauch.
export interface CarSpec {
  name: string;
  maxSpeed: number;     // m/s
  accel: number;        // m/s^2 bei niedriger Geschwindigkeit
  brake: number;
  wheelBase: number;
  maxSteer: number;     // rad
  fuelLitersPer100: number;
  tankLiters: number;
}

export const SPECS: CarSpec[] = [
  { name: 'Silber-Limousine ’86 (fiktiv)', maxSpeed: 47, accel: 2.6, brake: 8, wheelBase: 2.55, maxSteer: 0.6, fuelLitersPer100: 9, tankLiters: 60 },
  { name: 'Kompakt ’91 (fiktiv)', maxSpeed: 50, accel: 3.0, brake: 8.5, wheelBase: 2.45, maxSteer: 0.62, fuelLitersPer100: 7.5, tankLiters: 50 },
  { name: 'Kombi ’89 (fiktiv)', maxSpeed: 46, accel: 2.4, brake: 7.8, wheelBase: 2.65, maxSteer: 0.58, fuelLitersPer100: 9.5, tankLiters: 65 },
];

export class Vehicle {
  model: CarModel;
  pos = new THREE.Vector3();
  heading = 0;      // Rad, 0 = Fahrtrichtung -z (Nord)
  speed = 0;        // m/s entlang der Fahrtrichtung
  steer = 0;
  vy = 0;
  damage = 0;       // 0..100
  fuel: number;
  lights = false;
  braking = false;
  readonly spec: CarSpec;
  private pitch = 0;
  private roll = 0;
  private wheelSpin = 0;

  constructor(seed: number, style: number, paint?: number) {
    this.spec = SPECS[style % SPECS.length];
    this.model = makeCar(seed, style, paint);
    this.fuel = this.spec.tankLiters * 0.4;
  }

  get kmh(): number { return Math.abs(this.speed) * 3.6; }

  forward(): THREE.Vector3 { return new THREE.Vector3(-Math.sin(this.heading), 0, -Math.cos(this.heading)); }

  placeAt(p: THREE.Vector3, heading: number, city: City): void {
    this.pos.set(p.x, city.surfaceAt(p.x, p.z, p.y + 2), p.z);
    this.heading = heading;
    this.speed = 0;
    this.syncModel(city, 0);
  }

  // throttle -1..1 (negativ = Bremse/Rueckwaerts), steer -1..1
  drive(dt: number, throttle: number, steerIn: number, handbrake: boolean, city: City): { impact: number } {
    const s = this.spec;
    const fwdSpeed = this.speed;
    const hasFuel = this.fuel > 0;
    const enginePower = (1 - this.damage / 160) * (hasFuel ? 1 : 0);
    let a = 0;
    this.braking = false;
    if (throttle > 0) {
      if (fwdSpeed < -0.3) { a = s.brake * throttle; this.braking = true; }
      else a = s.accel * throttle * enginePower * Math.max(0.15, 1 - fwdSpeed / s.maxSpeed);
    } else if (throttle < 0) {
      if (fwdSpeed > 0.3) { a = s.brake * throttle; this.braking = true; }
      else a = 2.0 * throttle * enginePower * (fwdSpeed > -7 ? 1 : 0);
    }
    // Widerstaende
    a -= 0.0045 * fwdSpeed * Math.abs(fwdSpeed) + 0.15 * Math.sign(fwdSpeed);
    // Hangabtrieb
    a -= 9.81 * Math.sin(this.pitch);
    if (handbrake) {
      a -= Math.sign(fwdSpeed) * 5;
      this.braking = true;
    }
    let newSpeed = fwdSpeed + a * dt;
    // Beim Bremsen oder Ausrollen nicht ueber null hinaus in die Gegenrichtung
    if (fwdSpeed !== 0 && Math.sign(newSpeed) !== Math.sign(fwdSpeed) && (throttle === 0 || this.braking)) newSpeed = 0;
    // Stillstand ohne Gas: Fahrer haelt auf der Bremse (sonst rollt das Auto jeden Hang hinab)
    if (throttle === 0 && Math.abs(newSpeed) < 0.5) newSpeed = 0;
    this.speed = newSpeed;

    // Lenkung: bei hoher Geschwindigkeit weniger Einschlag, weich nachgefuehrt
    const steerLimit = s.maxSteer / (1 + Math.abs(this.speed) / 14);
    this.steer += (steerIn * steerLimit - this.steer) * Math.min(1, dt * 6);
    let yawRate = (this.speed / s.wheelBase) * Math.tan(this.steer);
    if (handbrake && Math.abs(this.speed) > 5) yawRate *= 1.6;
    this.heading += yawRate * dt;

    // Verbrauch (grob: Liter je 100 km, mehr unter Last)
    const dist = Math.abs(this.speed) * dt;
    this.fuel = Math.max(0, this.fuel - (dist / 100000) * s.fuelLitersPer100 * (throttle > 0 ? 1.3 : 0.8));

    const f = this.forward();
    this.pos.addScaledVector(f, this.speed * dt);

    // Kollision: zwei Kreise (vorne/hinten)
    let impact = 0;
    const r = this.model.width / 2;
    for (const off of [this.model.length / 2 - r, -(this.model.length / 2 - r)]) {
      const c = { x: this.pos.x + f.x * off, z: this.pos.z + f.z * off };
      const before = { ...c };
      if (city.collision.resolve(c, r, this.pos.y)) {
        this.pos.x += c.x - before.x;
        this.pos.z += c.z - before.z;
        impact = Math.max(impact, Math.abs(this.speed));
      }
    }
    if (impact > 2) {
      this.damage = Math.min(100, this.damage + impact * 1.2);
      this.speed *= -0.25;
    } else if (impact > 0) {
      this.speed *= 0.6;
    }
    // Rand des Spielfelds
    const t = city.terrain;
    this.pos.x = Math.min(Math.max(this.pos.x, t.x0 + 5), t.maxX - 5);
    this.pos.z = Math.min(Math.max(this.pos.z, t.z0 + 5), t.maxZ - 5);

    this.syncModel(city, dt);
    return { impact };
  }

  // Hoehe, Neigung und Raeder aus der Oberflaeche unter den vier Raedern
  syncModel(city: City, dt: number): void {
    const f = this.forward();
    const right = new THREE.Vector3(-f.z, 0, f.x);
    const hl = this.model.length / 2 - 0.7, hw = this.model.width / 2 - 0.1;
    const y0 = this.pos.y + 1.5;
    const h = (dx: number, dz: number) => city.surfaceAt(this.pos.x + dx, this.pos.z + dz, y0);
    const fr = h(f.x * hl + right.x * hw, f.z * hl + right.z * hw), fl = h(f.x * hl - right.x * hw, f.z * hl - right.z * hw);
    const br = h(-f.x * hl + right.x * hw, -f.z * hl + right.z * hw), bl = h(-f.x * hl - right.x * hw, -f.z * hl - right.z * hw);
    const ground = (fr + fl + br + bl) / 4;
    if (dt > 0 && this.pos.y > ground + 0.15) {
      this.vy -= 9.81 * dt;  // in der Luft (z. B. von einer Mauer gefahren)
      this.pos.y = Math.max(ground, this.pos.y + this.vy * dt);
      if (this.pos.y <= ground) { this.damage = Math.min(100, this.damage + Math.max(0, -this.vy - 6) * 4); this.vy = 0; }
    } else {
      this.pos.y = ground;
      this.vy = 0;
    }
    this.pitch = Math.atan2((fr + fl) / 2 - (br + bl) / 2, hl * 2);
    this.roll = Math.atan2((fr + br) / 2 - (fl + bl) / 2, hw * 2);
    const m = this.model;
    m.root.position.copy(this.pos);
    m.root.rotation.set(0, 0, 0);
    m.root.rotation.order = 'YXZ';
    m.root.rotation.y = this.heading;
    m.root.rotation.x = -this.pitch;
    m.root.rotation.z = -this.roll;
    // Karosserie neigt sich etwas in Kurven und beim Bremsen
    m.body.rotation.z = THREE.MathUtils.lerp(m.body.rotation.z, -this.steer * this.speed * 0.006, 0.2);
    m.body.rotation.x = THREE.MathUtils.lerp(m.body.rotation.x, this.braking ? -0.025 : 0, 0.2);
    this.wheelSpin += (this.speed * dt) / 0.31;
    m.wheels.forEach((w, i) => {
      w.rotation.set(0, 0, 0);
      w.rotation.order = 'YXZ';
      if (i < 2) w.rotation.y = this.steer;
      w.rotation.x = -this.wheelSpin;
    });
    setCarLights(m, this.lights, this.braking);
  }
}
