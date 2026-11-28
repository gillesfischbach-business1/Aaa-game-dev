// LUX98 – Analoges Kommunikationssystem: Telefonbuch, Telefonnetz, Anrufbeantworter, Telefonzelle.
// Alle Eintraege im Telefonbuch sind fiktiv (Genauigkeitskategorie D).
import { copyDate, type LuxDate } from './calendar';
import { isFrancs, type Francs } from './economy';
import { asciiLower, compareBytes } from './text';

// Rufnummern werden normalisiert: nur Ziffern.
export function normalizeNumber(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

export interface PhoneBookEntry {
  number: string; // normalisiert
  name: string;
  address: string;
  district: string; // einer der 24 Stadtteile
  isBusiness: boolean;
}

export type PhoneBookEntryInput = Omit<PhoneBookEntry, 'isBusiness'> & { isBusiness?: boolean };

export class PhoneBook {
  private entries = new Map<string, PhoneBookEntry>();

  // false bei doppelter Nummer oder leerem Namen
  add(e: PhoneBookEntryInput): boolean {
    const entry: PhoneBookEntry = {
      number: normalizeNumber(e.number),
      name: e.name,
      address: e.address,
      district: e.district,
      isBusiness: e.isBusiness ?? false,
    };
    if (entry.number.length === 0 || entry.name.length === 0 || this.entries.has(entry.number)) return false;
    this.entries.set(entry.number, entry);
    return true;
  }

  findByNumber(number: string): PhoneBookEntry | null {
    const e = this.entries.get(normalizeNumber(number));
    return e ? { ...e } : null;
  }

  // ohne Gross/Klein (ASCII, wie std::tolower), sortiert nach Name
  searchByName(query: string): PhoneBookEntry[] {
    const q = asciiLower(query);
    const keys = [...this.entries.keys()].sort(compareBytes);
    const out: PhoneBookEntry[] = [];
    for (const k of keys) {
      const e = this.entries.get(k);
      if (e && asciiLower(e.name).includes(q)) out.push({ ...e });
    }
    out.sort((a, b) => compareBytes(a.name, b.name));
    return out;
  }

  size(): number {
    return this.entries.size;
  }
}

export interface AnsweringMachineMessage {
  date: LuxDate;
  hour: number;
  minute: number;
  fromNumber: string;
  text: string; // Untertitel
  dialogueId: string;
  heard: boolean;
}

export type AnsweringMachineMessageInput = Omit<AnsweringMachineMessage, 'heard'> & { heard?: boolean };

export type CallResult = 'Connected' | 'NoAnswer' | 'Busy' | 'InvalidNumber';

// Ein Anschluss antwortet abhaengig von Tag und Uhrzeit.
export type AnswerRule = (date: LuxDate, hour: number) => boolean;

function copyMessage(m: AnsweringMachineMessage): AnsweringMachineMessage {
  return { ...m, date: copyDate(m.date) };
}

export class PhoneNetwork {
  private rules = new Map<string, AnswerRule | null>();
  private busy = new Map<string, boolean>();
  private machines = new Map<string, AnsweringMachineMessage[]>();

  // Das Telefonbuch wird (wie in C++ per Referenz) live verwendet.
  constructor(private readonly book: PhoneBook) {}

  setAnswerRule(number: string, rule: AnswerRule | null): void {
    this.rules.set(normalizeNumber(number), rule);
  }

  setBusy(number: string, busy: boolean): void {
    this.busy.set(normalizeNumber(number), busy);
  }

  dial(number: string, d: LuxDate, hour: number): CallResult {
    const n = normalizeNumber(number);
    if (!this.book.findByNumber(n)) return 'InvalidNumber';
    if (this.busy.get(n) === true) return 'Busy';
    const r = this.rules.get(n);
    if (r && !r(copyDate(d), hour)) return 'NoAnswer';
    return 'Connected';
  }

  leaveMessage(toNumber: string, msg: AnsweringMachineMessageInput): void {
    const m: AnsweringMachineMessage = {
      date: copyDate(msg.date),
      hour: msg.hour,
      minute: msg.minute,
      fromNumber: normalizeNumber(msg.fromNumber),
      text: msg.text,
      dialogueId: msg.dialogueId,
      heard: msg.heard ?? false,
    };
    const key = normalizeNumber(toNumber);
    const list = this.machines.get(key);
    // dieselbe noch ungehoerte Nachricht nicht doppelt ablegen (z. B. nach dem Laden)
    if (list?.some((x) => !x.heard && x.dialogueId === m.dialogueId)) return;
    if (list) list.push(m);
    else this.machines.set(key, [m]);
  }

  unheardMessages(number: string): AnsweringMachineMessage[] {
    const list = this.machines.get(normalizeNumber(number)) ?? [];
    return list.filter((m) => !m.heard).map(copyMessage);
  }

  /** Ungehoerte Nachrichten aller Anrufbeantworter als Text (nur Web-Fassung; fuer den Spielstand) */
  serializeMachines(): string {
    const out: [string, AnsweringMachineMessage[]][] = [];
    for (const [k, list] of this.machines) {
      const open = list.filter((m) => !m.heard);
      if (open.length) out.push([k, open]);
    }
    return JSON.stringify(out);
  }

  /** Anrufbeantworter leeren und aus serializeMachines() wiederherstellen; fehlerhafte Daten -> leer */
  loadMachines(text: string | undefined): void {
    this.machines.clear();
    if (!text) return;
    try {
      const data = JSON.parse(text) as [string, AnsweringMachineMessage[]][];
      for (const [k, list] of data) for (const m of list) {
        if (typeof m.dialogueId === 'string' && m.date) this.leaveMessage(k, m);
      }
    } catch { this.machines.clear(); }
  }

  markAllHeard(number: string): void {
    for (const m of this.machines.get(normalizeNumber(number)) ?? []) m.heard = true;
  }
}

// Telefonzelle: Tarife sind Daten (Data/Economy/prices_1998.csv), nicht im Code festgelegt.
export interface PayphoneTariff {
  pricePerUnit: Francs;
  secondsPerUnitLocal: number; // Ortsgespraech
  minimumInsert: Francs;
}

export class PayphoneSession {
  private readonly tariff: PayphoneTariff;
  private credit: Francs = 0;
  private secondsIntoUnit = 0;
  private unitCharged = false;

  constructor(t: PayphoneTariff) {
    this.tariff = { ...t };
  }

  // false unter Mindesteinwurf (oder bei Nicht-Ganzzahl)
  insertCoins(amount: Francs): boolean {
    if (!isFrancs(amount) || amount <= 0) return false;
    if (this.credit + amount < this.tariff.minimumInsert) return false;
    this.credit += amount;
    return true;
  }

  // Gespraech laeuft; false, sobald das Guthaben verbraucht ist (Verbindung bricht ab).
  tick(gameSeconds: number): boolean {
    const t = this.tariff;
    if (t.secondsPerUnitLocal <= 0 || t.pricePerUnit <= 0) return true;
    if (!this.unitCharged) {
      // erste Einheit wird bei Verbindung faellig
      if (this.credit < t.pricePerUnit) return false;
      this.credit -= t.pricePerUnit;
      this.unitCharged = true;
    }
    this.secondsIntoUnit += gameSeconds;
    while (this.secondsIntoUnit >= t.secondsPerUnitLocal) {
      this.secondsIntoUnit -= t.secondsPerUnitLocal;
      if (this.credit < t.pricePerUnit) return false;
      this.credit -= t.pricePerUnit;
    }
    return true;
  }

  getCredit(): Francs {
    return this.credit;
  }

  // Restguthaben zurueck
  hangup(): Francs {
    const back = this.credit;
    this.credit = 0;
    this.secondsIntoUnit = 0;
    this.unitCharged = false;
    return back;
  }
}
