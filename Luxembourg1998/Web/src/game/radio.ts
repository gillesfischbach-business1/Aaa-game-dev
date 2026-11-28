// Autoradio mit fiktiven Sendern. Musik wird live per WebAudio erzeugt (eigene Komposition nach Regeln,
// keine Aufnahmen, keine Lizenzfragen). Moderationen erscheinen als Laufschrift.

export interface RadioContext {
  hour(): number;            // Wanduhrzeit
  minute(): number;
  raining(): boolean;
  rushHour(): boolean;
  district(): string;        // grobe Lage, z. B. "Hollerich"
  extraNews(): string[];     // Meldungen aus dem Spielverlauf
}

export interface Station { id: string; name: string; freq: string; kind: 'dance' | 'evening' | 'talk' }

export const STATIONS: Station[] = [
  { id: 'stad', name: 'Radio Stad', freq: '98,1', kind: 'dance' },
  { id: 'petrus', name: 'Radio Pëtrus', freq: '103,4', kind: 'evening' },
  { id: 'info', name: 'Info Lëtz', freq: '95,5', kind: 'talk' },
];

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class Radio {
  station = -1;            // -1 = aus
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer = 0;
  private nextTime = 0;
  private step = 0;
  private tickerText = '';
  private tickerAt = 0;
  volume = 0.35;

  constructor(private rc: RadioContext) {}

  get on(): boolean { return this.station >= 0; }
  get current(): Station | null { return this.station >= 0 ? STATIONS[this.station] : null; }

  /** naechster Sender; nach dem letzten: aus */
  cycle(): Station | null {
    this.station = this.station + 1 >= STATIONS.length ? -1 : this.station + 1;
    this.restart();
    return this.current;
  }

  setStation(i: number): void { this.station = i; this.restart(); }

  stop(): void {
    window.clearInterval(this.timer);
    this.timer = 0;
    if (this.master && this.ctx) {
      // kurz ausblenden, damit es nicht knackt
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  private restart(): void {
    this.stop();
    this.tickerText = '';
    if (this.station < 0) return;
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
      }
      void this.ctx.resume();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume * (this.current!.kind === 'talk' ? 0.4 : 1);
      this.master.connect(this.ctx.destination);
      this.nextTime = this.ctx.currentTime + 0.1;
      this.step = 0;
      this.timer = window.setInterval(() => this.schedule(), 50);
    } catch { /* Audio nicht verfuegbar – Laufschrift funktioniert trotzdem */ }
  }

  // ---------- Laufschrift (Moderation, Nachrichten, Verkehr, Wetter) ----------
  ticker(now: number): string {
    const st = this.current;
    if (!st) return '';
    if (this.tickerText && now - this.tickerAt < 12000) return this.tickerText;
    this.tickerAt = now;
    const h = this.rc.hour(), m = this.rc.minute();
    const time = `${h} Auer ${String(m).padStart(2, '0')}`;
    const lines: string[] = [];
    if (st.kind === 'talk') {
      lines.push(`Info Lëtz, ${time}. D'Noriichten (fiktiv).`);
      lines.push(this.rc.rushHour() ? 'Verkéier: vill Betrib op der Route d’Esch an um Boulevard Roosevelt.' : 'Verkéier: de Moment keng Stauen an der Stad.');
      lines.push(this.rc.raining() ? 'Wieder: Reen, d’Stroosse si glat – fuert virsiichteg.' : 'Wieder: dréchen, spéider liicht bewölkt.');
      lines.push(...this.rc.extraNews());
    } else if (st.kind === 'dance') {
      lines.push(`${st.name} ${st.freq} – ${time}! Mir spillen déi heescht Musek vun 1998 (eegen Kompositioun).`);
      lines.push(`Gréiss u jiddereen, deen am Moment ${this.rc.district() ? 'zu ' + this.rc.district() : 'an der Stad'} ënnerwee ass!`);
    } else {
      lines.push(`${st.name} ${st.freq} – roueg Musek fir den Owend. Et ass ${time}.`);
      if (this.rc.raining()) lines.push('Bei Reen eng Taass Téi an e Stéck Musek …');
    }
    this.tickerText = lines[Math.floor(now / 12000) % lines.length];
    return this.tickerText;
  }

  // ---------- Musik-Generator ----------
  private schedule(): void {
    const ctx = this.ctx, out = this.master, st = this.current;
    if (!ctx || !out || !st) return;
    const bpm = st.kind === 'dance' ? 134 : st.kind === 'evening' ? 84 : 100;
    const sixteenth = 60 / bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.2) {
      if (st.kind === 'dance') this.danceStep(ctx, out, this.step, this.nextTime, sixteenth);
      else if (st.kind === 'evening') this.eveningStep(ctx, out, this.step, this.nextTime, sixteenth);
      else this.talkStep(ctx, out, this.step, this.nextTime);
      this.nextTime += sixteenth;
      this.step++;
    }
  }

  private tone(ctx: AudioContext, out: AudioNode, type: OscillatorType, freq: number, t: number, dur: number, vol: number): void {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(ctx: AudioContext, out: AudioNode, t: number, dur: number, vol: number): void {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(hp).connect(g).connect(out);
    src.start(t);
  }

  // Eurodance: Vierviertel-Kick, Offbeat-Hihat, Offbeat-Bass, Arpeggio ueber Am–F–C–G
  private danceStep(ctx: AudioContext, out: AudioNode, s: number, t: number, sx: number): void {
    const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
    const chord = prog[Math.floor(s / 16) % 4];
    const beat = s % 4;
    if (beat === 0) {  // Kick: Sinus mit Tonhoehen-Abfall
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.2);
    }
    if (beat === 2) {
      this.noise(ctx, out, t, 0.05, 0.25);
      this.tone(ctx, out, 'sawtooth', NOTE(chord[0] - 24), t, sx * 1.6, 0.18);
    }
    if (s % 16 === 4 || s % 16 === 12) this.noise(ctx, out, t, 0.12, 0.18);  // Clap-artig
    const arp = [0, 1, 2, 1];
    this.tone(ctx, out, 'square', NOTE(chord[arp[s % 4]] + 12), t, sx * 0.9, 0.05);
    if (s % 64 === 0) for (const n of chord) this.tone(ctx, out, 'sawtooth', NOTE(n), t, sx * 30, 0.025);  // Flaeche
  }

  // Abendmusik: weiche Akkorde (Cmaj7–Am7–Dm7–G7), Bass auf 1 und 3, sparsame Melodie
  private eveningStep(ctx: AudioContext, out: AudioNode, s: number, t: number, sx: number): void {
    const prog = [[48, 52, 55, 59], [45, 48, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53]];
    const chord = prog[Math.floor(s / 32) % 4];
    if (s % 32 === 0) for (const n of chord) this.tone(ctx, out, 'triangle', NOTE(n + 12), t, sx * 30, 0.05);
    if (s % 8 === 0) this.tone(ctx, out, 'sine', NOTE(chord[0] - 12), t, sx * 6, 0.22);
    if (s % 8 === 4) this.tone(ctx, out, 'sine', NOTE(chord[2] - 12), t, sx * 4, 0.16);
    const mel = [72, 74, 76, 79, 76, 74];
    if (s % 6 === 0 && (s * 7) % 5 !== 0) this.tone(ctx, out, 'sine', NOTE(mel[(s / 6) % mel.length]), t, sx * 5, 0.06);
  }

  // Wortsender: leises Rauschen + Jingle alle 64 Schritte (Sprache als Laufschrift)
  private talkStep(ctx: AudioContext, out: AudioNode, s: number, t: number): void {
    if (s % 64 === 0) [72, 76, 79, 84].forEach((n, i) => this.tone(ctx, out, 'sine', NOTE(n), t + i * 0.12, 0.25, 0.12));
    if (s % 4 === 0) this.noise(ctx, out, t, 0.15, 0.02);
  }
}
