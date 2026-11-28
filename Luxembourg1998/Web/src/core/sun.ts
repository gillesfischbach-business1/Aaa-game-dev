// LUX98 – Sonnenstand fuer Luxemburg-Stadt (NOAA-Naeherungsformeln), Port von SolarModel.
import { dayOfYear, isLeapYear, type LuxDate } from './calendar';

export interface GeoPosition {
  latitudeDeg: number;
  longitudeDeg: number;
}

// Luxemburg-Stadt, Bereich Place d'Armes (gerundet)
export const DEFAULT_POSITION: Readonly<GeoPosition> = { latitudeDeg: 49.6116, longitudeDeg: 6.13 };

export interface SunTimes {
  valid: boolean; // false bei Polartag/-nacht
  sunriseStdHour: number; // MEZ (UTC+1), Dezimalstunden
  sunsetStdHour: number;
}

export interface SunPosition {
  elevationDeg: number;
  azimuthDeg: number; // 0 = Nord, 90 = Ost
}

const kPi = 3.14159265358979323846;
const rad = (d: number): number => (d * kPi) / 180.0;
const deg = (r: number): number => (r * 180.0) / kPi;

// Sonnendeklination (rad) und Zeitgleichung (Minuten), NOAA "General Solar Position".
function solarParams(d: LuxDate, hourUtc: number): { decl: number; eqTimeMin: number } {
  const daysInYear = isLeapYear(d.year) ? 366.0 : 365.0;
  const g = ((2.0 * kPi) / daysInYear) * (dayOfYear(d) - 1 + (hourUtc - 12.0) / 24.0);
  const eqTimeMin =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  return { decl, eqTimeMin };
}

export function computeSunTimes(d: LuxDate, pos: GeoPosition = DEFAULT_POSITION): SunTimes {
  const out: SunTimes = { valid: false, sunriseStdHour: 0, sunsetStdHour: 0 };
  const { decl, eqTimeMin: eqt } = solarParams(d, 12.0);
  const lat = rad(pos.latitudeDeg);
  // 90.833 Grad: Refraktion + Sonnenradius
  const cosHa = Math.cos(rad(90.833)) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl);
  if (cosHa < -1.0 || cosHa > 1.0) return out;
  const ha = deg(Math.acos(cosHa));
  const noonUtcMin = 720.0 - 4.0 * pos.longitudeDeg - eqt;
  out.sunriseStdHour = (noonUtcMin - 4.0 * ha) / 60.0 + 1.0;
  out.sunsetStdHour = (noonUtcMin + 4.0 * ha) / 60.0 + 1.0;
  out.valid = true;
  return out;
}

// Sonnenhoehe und Azimut, Zeit in MEZ.
export function computeSunPosition(d: LuxDate, stdHour: number, pos: GeoPosition = DEFAULT_POSITION): SunPosition {
  const hourUtc = stdHour - 1.0;
  const { decl, eqTimeMin: eqt } = solarParams(d, hourUtc);
  const trueSolarMin = hourUtc * 60.0 + eqt + 4.0 * pos.longitudeDeg;
  const ha = rad(trueSolarMin / 4.0 - 180.0);
  const lat = rad(pos.latitudeDeg);
  let cosZen = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
  cosZen = Math.max(-1.0, Math.min(1.0, cosZen));
  const zen = Math.acos(cosZen);
  const elevationDeg = 90.0 - deg(zen);
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat));
  const azimuthDeg = (deg(az) + 180.0 + 360.0) % 360.0;
  return { elevationDeg, azimuthDeg };
}
