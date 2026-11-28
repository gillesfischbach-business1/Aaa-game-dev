import * as THREE from 'three';

// Analoge Kamera: Film mit 24 Aufnahmen, Sucher, Bewertung des Motivs (im Bild, Entfernung, Licht).
// Die Aufnahme ist ein echtes, verkleinertes Bild der 3D-Szene.

export interface PhotoSubject { id: string; name: string; pos: THREE.Vector3; minDist: number; maxDist: number }
export interface Photo { n: number; subject: string | null; quality: 'gut' | 'ok' | 'schlecht'; note: string; img: string; atHours: number }

export const FILM_SIZE = 24;

export class PhotoCamera {
  owned = false;
  film = 0;                 // verbleibende Aufnahmen
  photos: Photo[] = [];     // auf dem Film (noch nicht entwickelt)
  developed: Photo[] = [];  // abgegebene Filme
  subjects: PhotoSubject[] = [];
  private shotCounter = 0;

  addSubject(s: PhotoSubject): void { this.subjects.push(s); }

  /** Bewertet, welches Motiv im Bild ist. night: 0 = Tag, 1 = Nacht */
  evaluate(camera: THREE.PerspectiveCamera, night: number): { subject: PhotoSubject | null; quality: Photo['quality']; note: string } {
    let best: { s: PhotoSubject; score: number; d: number } | null = null;
    for (const s of this.subjects) {
      const d = camera.position.distanceTo(s.pos);
      if (d < s.minDist * 0.5 || d > s.maxDist * 1.5) continue;
      const ndc = s.pos.clone().project(camera);
      if (ndc.z > 1 || Math.abs(ndc.x) > 0.75 || Math.abs(ndc.y) > 0.75) continue;
      const centered = 1 - Math.max(Math.abs(ndc.x), Math.abs(ndc.y)) / 0.75;
      const inRange = d >= s.minDist && d <= s.maxDist ? 1 : 0.4;
      const score = centered * inRange;
      if (!best || score > best.score) best = { s, score, d };
    }
    if (!best) return { subject: null, quality: 'schlecht', note: 'Kein bekanntes Motiv im Bild' };
    if (night > 0.7) return { subject: best.s, quality: 'schlecht', note: 'Zu dunkel – ohne Blitz unterbelichtet' };
    const q: Photo['quality'] = best.score > 0.55 ? 'gut' : best.score > 0.25 ? 'ok' : 'schlecht';
    const note = best.d < best.s.minDist ? 'Zu nah dran' : best.d > best.s.maxDist ? 'Zu weit weg' : q === 'gut' ? 'Gut getroffen' : 'Motiv nicht mittig';
    return { subject: best.s, quality: q, note };
  }

  /** Aufnahme: Bild sofort nach dem Rendern aus der Zeichenflaeche lesen und verkleinern */
  capture(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): string {
    renderer.render(scene, camera);
    const src = renderer.domElement;
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = Math.round(320 * (src.height / Math.max(1, src.width)));
    const g = c.getContext('2d')!;
    try {
      g.drawImage(src, 0, 0, c.width, c.height);
      // leichter Analog-Look: warmer Stich und Vignette
      g.fillStyle = 'rgba(255, 220, 170, 0.08)';
      g.fillRect(0, 0, c.width, c.height);
      const v = g.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.3, c.width / 2, c.height / 2, c.width * 0.65);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.35)');
      g.fillStyle = v;
      g.fillRect(0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.72);
    } catch {
      return '';
    }
  }

  shoot(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, night: number, atHours: number): Photo | null {
    if (!this.owned || this.film <= 0) return null;
    const ev = this.evaluate(camera, night);
    const img = this.capture(renderer, scene, camera);
    this.film--;
    const p: Photo = { n: ++this.shotCounter, subject: ev.subject?.id ?? null, quality: ev.quality, note: ev.note, img, atHours };
    this.photos.push(p);
    return p;
  }

  /** Gute oder brauchbare Aufnahme eines Motivs auf dem aktuellen Film? */
  hasGood(subjectId: string, since = -Infinity): boolean {
    return this.photos.some((p) => p.subject === subjectId && p.quality !== 'schlecht' && p.atHours >= since);
  }

  /** Film abgeben: alle Aufnahmen gelten als entwickelt; neuer Film */
  develop(): Photo[] {
    const batch = this.photos;
    this.developed.push(...batch);
    this.photos = [];
    this.film = FILM_SIZE;
    return batch;
  }

  // Bilder werden nicht im Spielstand gespeichert (zu gross); nur Metadaten
  save(): Record<string, string> {
    const meta = (ps: Photo[]) => JSON.stringify(ps.map(({ img: _img, ...rest }) => rest));
    return { 'cam.owned': this.owned ? '1' : '0', 'cam.film': String(this.film), 'cam.photos': meta(this.photos), 'cam.dev': meta(this.developed.slice(-40)), 'cam.n': String(this.shotCounter) };
  }

  load(d: Record<string, string>): void {
    this.owned = d['cam.owned'] === '1';
    this.film = Number(d['cam.film'] ?? 0) || 0;
    this.shotCounter = Number(d['cam.n'] ?? 0) || 0;
    const parse = (s: string | undefined): Photo[] => { try { return (JSON.parse(s ?? '[]') as Omit<Photo, 'img'>[]).map((p) => ({ ...p, img: '' })); } catch { return []; } };
    this.photos = parse(d['cam.photos']);
    this.developed = parse(d['cam.dev']);
  }
}
