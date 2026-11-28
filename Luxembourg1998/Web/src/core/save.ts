// LUX98 – Versioniertes, pruefsummengeschuetztes Spielstandformat mit Sicherungskopie (Port von SaveFormat).
// Aufbau (Text, UTF-8):
//   LUX98SAVE
//   version=1
//   key=value            (beliebig viele, sortiert)
//   crc32=1a2b3c4d       (Pruefsumme ueber alle Zeilen davor)
// Byte-genau kompatibel zum C++-Kern.
import { compareBytes, getlineSplit, scanInt } from './text';

export type SaveData = Record<string, string>;

export const CURRENT_SAVE_VERSION = 1;
const kHeader = 'LUX98SAVE';

export type SaveError = 'None' | 'BadHeader' | 'BadVersion' | 'BadChecksum' | 'BadLine' | 'NewerVersion';

export function saveErrorToString(e: SaveError): string {
  switch (e) {
    case 'None':
      return 'ok';
    case 'BadHeader':
      return 'kein LUX98-Spielstand';
    case 'BadVersion':
      return 'Versionszeile fehlt oder ungueltig';
    case 'BadChecksum':
      return 'Pruefsumme falsch (Datei beschaedigt)';
    case 'BadLine':
      return 'ungueltige Zeile';
    case 'NewerVersion':
      return 'Spielstand stammt aus einer neueren Spielversion';
  }
}

function emptyData(): SaveData {
  return Object.create(null) as SaveData;
}

// UTF-8-Kodierung ohne Laufzeitabhaengigkeit (einzelne Surrogate -> U+FFFD wie TextEncoder).
function utf8Bytes(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    let cp = ch.codePointAt(0) ?? 0xfffd;
    if (cp >= 0xd800 && cp <= 0xdfff) cp = 0xfffd;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else
      out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return out;
}

// CRC-32 (IEEE, reflektiert, Polynom 0xEDB88320) ueber die UTF-8-Bytes.
export function crc32(data: string): number {
  let crc = 0xffffffff;
  for (const c of utf8Bytes(data)) {
    crc ^= c;
    for (let k = 0; k < 8; ++k) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

// Schluessel/Werte duerfen keine Zeilenumbrueche enthalten -> maskieren.
function escape(s: string): string {
  let out = '';
  for (const c of s) {
    if (c === '\\') out += '\\\\';
    else if (c === '\n') out += '\\n';
    else if (c === '\r') out += '\\r';
    else if (c === '=') out += '\\e';
    else out += c;
  }
  return out;
}

function unescape(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; ++i) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const n = s[++i] ?? '';
      out += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 'e' ? '=' : n;
    } else {
      out += s[i] ?? '';
    }
  }
  return out;
}

// Hier werden kuenftige Formatversionen schrittweise angehoben (v1 -> v2 -> ...).
function migrateSave(fromVersion: number, _data: SaveData): boolean {
  return fromVersion === CURRENT_SAVE_VERSION;
}

export function serializeSave(data: Readonly<SaveData>, version: number = CURRENT_SAVE_VERSION): string {
  let body = `${kHeader}\nversion=${Math.trunc(version)}\n`;
  for (const k of Object.keys(data).sort(compareBytes)) body += escape(k) + '=' + escape(data[k] ?? '') + '\n';
  return body + 'crc32=' + crc32(body).toString(16).padStart(8, '0') + '\n';
}

// Wie sscanf("%8x"): Leerzeichen, Vorzeichen, optional 0x, hoechstens 8 Zeichen.
function scanHex8(s: string, pos: number): number | null {
  let i = pos;
  while (i < s.length && /\s/.test(s[i] ?? '')) i++;
  const start = i;
  let neg = false;
  if (s[i] === '+' || s[i] === '-') {
    neg = s[i] === '-';
    i++;
  }
  const isHex = (c: string | undefined): boolean => c !== undefined && /[0-9a-fA-F]/.test(c);
  let value = 0;
  let digits = 0;
  if (s[i] === '0' && (s[i + 1] === 'x' || s[i + 1] === 'X') && i + 2 - start < 8 && isHex(s[i + 2])) i += 2;
  while (i - start < 8 && isHex(s[i])) {
    value = value * 16 + parseInt(s[i] ?? '0', 16);
    i++;
    digits++;
  }
  if (digits === 0) return null;
  return (neg ? -value : value) >>> 0;
}

export interface ParseResult {
  data: SaveData | null;
  error: SaveError;
}

// Prueft Kopf, Version und Pruefsumme. Aeltere Versionen werden ueber migrateSave angehoben.
export function parseSave(text: string): ParseResult {
  const fail = (error: SaveError): ParseResult => ({ data: null, error });
  const crcPos = text.lastIndexOf('crc32=');
  if (!text.startsWith(kHeader)) return fail('BadHeader');
  if (crcPos < 0) return fail('BadChecksum');
  const body = text.substring(0, crcPos);
  const stored = scanHex8(text, crcPos + 6);
  if (stored === null || stored !== crc32(body)) return fail('BadChecksum');

  const lines = getlineSplit(body, '\n');
  // lines[0] = Kopf
  const versionLine = lines[1];
  if (versionLine === undefined || !versionLine.startsWith('version=')) return fail('BadVersion');
  const v = scanInt(versionLine, 8);
  if (!v || v.value < 1) return fail('BadVersion');
  const version = v.value;
  if (version > CURRENT_SAVE_VERSION) return fail('NewerVersion');

  const data = emptyData();
  for (const line of lines.slice(2)) {
    if (line.length === 0) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) return fail('BadLine');
    data[unescape(line.substring(0, eq))] = unescape(line.substring(eq + 1));
  }
  if (!migrateSave(version, data)) return fail('BadVersion');
  return { data, error: 'None' };
}

// Storage-aehnliche Schnittstelle (z. B. window.localStorage), damit der Kern ohne DOM testbar bleibt.
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface WriteResult {
  ok: boolean;
  error?: string;
}

// Wie WriteSaveFile: erst <key>.tmp schreiben, alten Stand nach <key>.bak, dann uebernehmen.
export function writeSaveToStorage(storage: StorageLike, key: string, data: Readonly<SaveData>): WriteResult {
  const tmp = key + '.tmp';
  const bak = key + '.bak';
  const text = serializeSave(data);
  try {
    storage.setItem(tmp, text);
  } catch {
    return { ok: false, error: 'Schreiben fehlgeschlagen: ' + tmp };
  }
  try {
    // Vorherigen Stand als Sicherung behalten.
    const old = storage.getItem(key);
    if (old !== null) {
      storage.removeItem(bak);
      storage.setItem(bak, old);
    }
    storage.setItem(key, text);
    storage.removeItem(tmp);
  } catch {
    return { ok: false, error: 'Umbenennen fehlgeschlagen: ' + key };
  }
  return { ok: true };
}

export interface ReadResult {
  data: SaveData | null;
  usedBackup: boolean;
  // Fehler des Hauptstands; undefined, wenn kein Hauptstand vorhanden war.
  error?: SaveError;
}

// Wie ReadSaveFile: ist <key> beschaedigt oder fehlt, wird automatisch <key>.bak versucht.
export function readSaveFromStorage(storage: StorageLike, key: string): ReadResult {
  const result: ReadResult = { data: null, usedBackup: false };
  const text = storage.getItem(key);
  if (text !== null) {
    const p = parseSave(text);
    result.error = p.error;
    if (p.data) {
      result.data = p.data;
      return result;
    }
  }
  const backup = storage.getItem(key + '.bak');
  if (backup !== null) {
    const p = parseSave(backup);
    if (p.data) {
      result.data = p.data;
      result.usedBackup = true;
    }
  }
  return result;
}
