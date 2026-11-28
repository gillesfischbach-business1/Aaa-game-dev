// LUX98 – Kalender und Spieluhr (Port von Calendar1998.h/.cpp).
import { padInt, scanInt } from './text';

export interface LuxDate {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
}

export const Weekday = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
} as const;
export type Weekday = (typeof Weekday)[keyof typeof Weekday];

export function makeDate(year = 1998, month = 1, day = 1): LuxDate {
  return { year, month, day };
}

export function copyDate(d: LuxDate): LuxDate {
  return { year: d.year, month: d.month, day: d.day };
}

export function compareDates(a: LuxDate, b: LuxDate): number {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

export function datesEqual(a: LuxDate, b: LuxDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function isBefore(a: LuxDate, b: LuxDate): boolean {
  return compareDates(a, b) < 0;
}

// "1998-06-23"
export function toIso(d: LuxDate): string {
  return `${padInt(d.year, 4)}-${padInt(d.month, 2)}-${padInt(d.day, 2)}`;
}

// Wie sscanf("%4d-%2d-%2d") + IsValid.
export function fromIso(s: string): LuxDate | null {
  const y = scanInt(s, 0, 4);
  if (!y || s[y.next] !== '-') return null;
  const m = scanInt(s, y.next + 1, 2);
  if (!m || s[m.next] !== '-') return null;
  const d = scanInt(s, m.next + 1, 2);
  if (!d) return null;
  const r: LuxDate = { year: y.value, month: m.value, day: d.value };
  return isValid(r) ? r : null;
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

const kDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function daysInMonth(y: number, m: number): number {
  if (!Number.isInteger(m) || m < 1 || m > 12) return 0;
  return m === 2 && isLeapYear(y) ? 29 : (kDays[m - 1] ?? 0);
}

export function isValid(d: LuxDate): boolean {
  return (
    Number.isInteger(d.year) &&
    Number.isInteger(d.day) &&
    d.month >= 1 &&
    d.month <= 12 &&
    d.day >= 1 &&
    d.day <= daysInMonth(d.year, d.month)
  );
}

export function dayOfYear(d: LuxDate): number {
  let n = d.day;
  for (let m = 1; m < d.month; ++m) n += daysInMonth(d.year, m);
  return n;
}

// 0 = Montag .. 6 = Sonntag
export function dayOfWeek(d: LuxDate): Weekday {
  // Sakamoto-Algorithmus: 0 = Sonntag
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const y = d.year - (d.month < 3 ? 1 : 0);
  const w =
    (y + Math.trunc(y / 4) - Math.trunc(y / 100) + Math.trunc(y / 400) + (t[d.month - 1] ?? 0) + d.day) % 7;
  return ((w + 6) % 7) as Weekday; // auf Montag = 0 umrechnen
}

export function addDays(d: LuxDate, days: number): LuxDate {
  const r = copyDate(d);
  let n = Math.trunc(days);
  while (n > 0) {
    if (++r.day > daysInMonth(r.year, r.month)) {
      r.day = 1;
      if (++r.month > 12) {
        r.month = 1;
        ++r.year;
      }
    }
    --n;
  }
  while (n < 0) {
    if (--r.day < 1) {
      if (--r.month < 1) {
        r.month = 12;
        --r.year;
      }
      r.day = daysInMonth(r.year, r.month);
    }
    ++n;
  }
  return r;
}

export function lastSundayOf(year: number, month: number): LuxDate {
  const d: LuxDate = { year, month, day: daysInMonth(year, month) };
  // hoechstens 7 Schritte (Schutz gegen ungueltige Monate)
  for (let i = 0; i < 7 && dayOfWeek(d) !== Weekday.Sunday; ++i) --d.day;
  return d;
}

// Sommerzeit nach EU-Regel: letzter Sonntag im Maerz 02:00 MEZ bis letzter Sonntag im Oktober 03:00 MESZ.
// localStandardHour = Stunde in MEZ (UTC+1), 0..23.
export function isSummerTime(d: LuxDate, localStandardHour: number): boolean {
  const start = lastSundayOf(d.year, 3);
  const end = lastSundayOf(d.year, 10);
  if (isBefore(d, start) || isBefore(end, d)) return false;
  if (datesEqual(d, start)) return localStandardHour >= 2;
  if (datesEqual(d, end)) return localStandardHour < 2; // 03:00 MESZ = 02:00 MEZ
  return true;
}

const kDayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Spieluhr. Standard: 12 reale Minuten = 1 Spielstunde -> Faktor 5. Intern Normalzeit MEZ.
export class GameClock {
  static readonly kDefaultTimeScale = 5.0;

  private stdDate: LuxDate = makeDate();
  private stdSeconds = 0; // Sekunden seit Mitternacht in MEZ
  private timeScale = GameClock.kDefaultTimeScale;

  constructor(start: LuxDate = makeDate(1998, 1, 1), startHourLocal = 8.0) {
    this.setDateTime(start, startHourLocal);
  }

  advance(realSeconds: number): void {
    if (!(realSeconds > 0)) return;
    this.stdSeconds += realSeconds * this.timeScale;
    while (this.stdSeconds >= 86400.0) {
      this.stdSeconds -= 86400.0;
      this.stdDate = addDays(this.stdDate, 1);
    }
  }

  // 0 = Zeit angehalten (z. B. Zwischensequenz)
  setTimeScale(scale: number): void {
    this.timeScale = scale < 0.0 ? 0.0 : scale;
  }

  getTimeScale(): number {
    return this.timeScale;
  }

  // Kontrolliertes Setzen fuer Missionen/Intro (Wanduhrzeit).
  setDateTime(d: LuxDate, hourLocal: number): void {
    this.stdDate = isValid(d) ? copyDate(d) : makeDate();
    let h = hourLocal % 24.0;
    if (h < 0) h += 24.0;
    // Wanduhrzeit -> Normalzeit
    const hi = Math.trunc(h);
    if (isSummerTime(this.stdDate, hi - 1 < 0 ? 0 : hi - 1)) h -= 1.0;
    if (h < 0) {
      h += 24.0;
      this.stdDate = addDays(this.stdDate, -1);
    }
    this.stdSeconds = h * 3600.0;
  }

  /** Direkt in Normalzeit (MEZ) setzen, z. B. beim Laden eines Spielstands (eindeutig, auch am 25.10.) */
  setStandardDateTime(d: LuxDate, stdHour: number): void {
    this.stdDate = isValid(d) ? copyDate(d) : makeDate();
    let h = Number.isFinite(stdHour) ? stdHour % 24.0 : 0;
    if (h < 0) h += 24.0;
    this.stdSeconds = h * 3600.0;
  }

  isSummerTimeNow(): boolean {
    return isSummerTime(this.stdDate, Math.trunc(this.stdSeconds / 3600.0));
  }

  // Wanduhr-Datum (inkl. Sommerzeit)
  getDate(): LuxDate {
    if (this.isSummerTimeNow() && this.stdSeconds >= 23.0 * 3600.0) return addDays(this.stdDate, 1);
    return copyDate(this.stdDate);
  }

  getHourLocal(): number {
    const h = this.stdSeconds / 3600.0 + (this.isSummerTimeNow() ? 1.0 : 0.0);
    return h >= 24.0 ? h - 24.0 : h;
  }

  getHour(): number {
    return Math.trunc(this.getHourLocal());
  }

  getMinute(): number {
    return Math.trunc(this.getHourLocal() * 60.0) % 60;
  }

  getStandardDate(): LuxDate {
    return copyDate(this.stdDate);
  }

  getStandardHour(): number {
    return this.stdSeconds / 3600.0;
  }

  // "Do 01.01.1998 08:00"
  toString(): string {
    const d = this.getDate();
    return (
      `${kDayNames[dayOfWeek(d)] ?? '??'} ${padInt(d.day, 2)}.${padInt(d.month, 2)}.${padInt(d.year, 4)} ` +
      `${padInt(this.getHour(), 2)}:${padInt(this.getMinute(), 2)}`
    );
  }
}
