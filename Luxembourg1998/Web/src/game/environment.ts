import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import type { GameClock } from '../core/calendar';
import { computeSunPosition } from '../core/sun';

// Himmel, Sonne (echter Sonnenstand ueber Luxemburg), Mond-/Nachtlicht, Nebel, Regen.
export class Environment {
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  private sky: Sky;
  private rain: THREE.LineSegments;
  private rainOn = false;
  wetness = 0;
  indoor = false;   // im Innenraum: kein Regen, kaum Sonnenlicht
  night = 0;
  sunElevation = 0;

  constructor(private scene: THREE.Scene, private renderer: THREE.WebGLRenderer, shadows: boolean) {
    this.sky = new Sky();
    this.sky.scale.setScalar(20000);
    scene.add(this.sky);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 6;
    u.rayleigh.value = 1.6;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.82;

    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = shadows;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -90;
    sc.right = sc.top = 90;
    sc.near = 1;
    sc.far = 600;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.6;
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbfd4ff, 0x5a5040, 0.9);
    scene.add(this.hemi);
    scene.fog = new THREE.Fog(0xc9d3dc, 250, 1400);

    // Regen: Linien um die Kamera
    const count = 5000;
    const pos = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 80, y = Math.random() * 40, z = (Math.random() - 0.5) * 80;
      pos.set([x, y, z, x + 0.05, y - 0.7, z], i * 6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.35 }));
    this.rain.visible = false;
    this.rain.frustumCulled = false;
    scene.add(this.rain);
  }

  toggleRain(): boolean {
    this.rainOn = !this.rainOn;
    return this.rainOn;
  }
  get raining(): boolean { return this.rainOn; }
  setRain(on: boolean): void { this.rainOn = on; }

  update(clock: GameClock, focus: THREE.Vector3, camera: THREE.Camera, dt: number): void {
    const { elevationDeg, azimuthDeg } = computeSunPosition(clock.getStandardDate(), clock.getStandardHour());
    this.sunElevation = elevationDeg;
    const el = THREE.MathUtils.degToRad(elevationDeg), az = THREE.MathUtils.degToRad(azimuthDeg);
    // Welt: x = Ost, z = Sued -> Richtung zur Sonne
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    this.sky.material.uniforms.sunPosition.value.copy(dir);

    const day = THREE.MathUtils.smoothstep(elevationDeg, -6, 6);
    const low = 1 - THREE.MathUtils.smoothstep(elevationDeg, 2, 20);  // Morgen-/Abendlicht
    this.night = 1 - day;
    const cloud = this.rainOn ? 0.45 : 1;

    // Sonne tagsueber, nachts schwaches Mondlicht aus fester Richtung
    const lightDir = day > 0.05 ? dir : new THREE.Vector3(0.3, 0.8, 0.4).normalize();
    this.sun.position.copy(focus).addScaledVector(lightDir, 300);
    this.sun.target.position.copy(focus);
    this.sun.color.setRGB(1, 1 - low * 0.25, 1 - low * 0.5);
    this.sun.intensity = day > 0.05 ? 3.2 * day * cloud : 0.45 * cloud;
    if (day <= 0.05) this.sun.color.setHex(0x8899cc);
    // Nachts: Restlicht aus Stadtbeleuchtung und Mond, damit Strassen erkennbar bleiben
    this.hemi.intensity = (0.7 + 0.45 * day) * (this.rainOn ? 0.85 : 1);
    this.hemi.color.setHex(day > 0.3 ? 0xbfd4ff : 0x8a7a68);
    this.hemi.groundColor.setHex(day > 0.3 ? 0x5a5040 : 0x403428);

    const fogDay = new THREE.Color(this.rainOn ? 0x9aa3aa : 0xc9d3dc);
    const fogNight = new THREE.Color(0x0b1020);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(fogNight).lerp(fogDay, day).lerp(new THREE.Color(0xe0a070), low * day * 0.25);
    fog.near = this.rainOn ? 60 : 250;
    fog.far = this.rainOn ? 600 : 1400;
    this.renderer.toneMappingExposure = 0.6 + 0.25 * day;
    this.sky.material.uniforms.rayleigh.value = this.rainOn ? 4 : 1.6;
    this.sky.material.uniforms.turbidity.value = this.rainOn ? 18 : 6;

    // Naesse steigt bei Regen langsam, trocknet langsam ab
    this.wetness = THREE.MathUtils.clamp(this.wetness + (this.rainOn ? dt / 40 : -dt / 300), 0, 1);
    this.rain.visible = this.rainOn && !this.indoor;
    if (this.indoor) { this.sun.intensity *= 0.05; this.hemi.intensity = 0.35; }
    if (this.rainOn) {
      this.rain.position.set(camera.position.x, camera.position.y - 15, camera.position.z);
      const p = this.rain.geometry.attributes.position as THREE.BufferAttribute;
      const arr = p.array as Float32Array;
      for (let i = 0; i < arr.length; i += 6) {
        arr[i + 1] -= 24 * dt;
        arr[i + 4] -= 24 * dt;
        if (arr[i + 1] < 0) { arr[i + 1] += 40; arr[i + 4] += 40; }
      }
      p.needsUpdate = true;
    }
  }
}
