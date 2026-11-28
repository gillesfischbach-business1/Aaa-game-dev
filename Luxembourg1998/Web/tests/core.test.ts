// LUX98 – Port von Tests/core/core_tests.cpp (alle Pruefungen) auf vitest.
import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayOfWeek,
  dayOfYear,
  fromIso,
  GameClock,
  isLeapYear,
  isSummerTime,
  lastSundayOf,
  Weekday,
  type LuxDate,
} from '../src/core/calendar';
import { computeSunPosition, computeSunTimes } from '../src/core/sun';
import { formatLuf, Wallet } from '../src/core/economy';
import { MissionTracker, type MissionDef } from '../src/core/missions';
import { PayphoneSession, PhoneBook, PhoneNetwork } from '../src/core/comms';
import {
  crc32,
  parseSave,
  readSaveFromStorage,
  serializeSave,
  writeSaveToStorage,
  type SaveData,
  type StorageLike,
} from '../src/core/save';
import { checkAsset, isAllowedOn, type HistoricalMeta } from '../src/core/history';

const D = (year: number, month: number, day: number): LuxDate => ({ year, month, day });
const near = (a: number, b: number, tol: number): void => {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
};

describe('Kalender', () => {
  it('Wochentage, Schaltjahr, Tag im Jahr', () => {
    expect(dayOfWeek(D(1998, 1, 1))).toBe(Weekday.Thursday);
    expect(dayOfWeek(D(1998, 6, 23))).toBe(Weekday.Tuesday); // Nationalfeiertag 1998
    expect(dayOfWeek(D(1998, 12, 31))).toBe(Weekday.Thursday);
    expect(isLeapYear(1998)).toBe(false);
    expect(dayOfYear(D(1998, 12, 31))).toBe(365);
  });
  it('letzter Sonntag und Tage addieren', () => {
    expect(lastSundayOf(1998, 3)).toEqual(D(1998, 3, 29)); // Beginn Sommerzeit 1998
    expect(lastSundayOf(1998, 10)).toEqual(D(1998, 10, 25)); // Ende Sommerzeit 1998
    expect(addDays(D(1998, 12, 31), 1)).toEqual(D(1999, 1, 1));
    expect(addDays(D(1998, 3, 1), -1)).toEqual(D(1998, 2, 28));
  });
  it('ISO-Datum', () => {
    expect(fromIso('1998-08-21')).toEqual(D(1998, 8, 21));
    expect(fromIso('1998-02-30')).toBeNull();
  });
  it('Sommerzeit', () => {
    expect(isSummerTime(D(1998, 3, 29), 1)).toBe(false);
    expect(isSummerTime(D(1998, 3, 29), 2)).toBe(true);
    expect(isSummerTime(D(1998, 7, 1), 12)).toBe(true);
    expect(isSummerTime(D(1998, 10, 25), 1)).toBe(true);
    expect(isSummerTime(D(1998, 10, 25), 2)).toBe(false);
  });
});

describe('Spieluhr: Speichern/Laden ueber Normalzeit', () => {
  it('stellt 00:30 MESZ und die doppelte Stunde am 25.10. genau wieder her', () => {
    for (const [d, wall] of [[D(1998, 7, 10), 0.5], [D(1998, 10, 25), 2.5], [D(1998, 10, 24), 23.5]] as const) {
      const a = new GameClock(d, wall);
      a.advance(5 * 12 * 60);
      const b = new GameClock(D(1998, 1, 1), 0);
      b.setStandardDateTime(a.getStandardDate(), a.getStandardHour());
      expect(b.toString()).toBe(a.toString());
      expect(b.getStandardDate()).toEqual(a.getStandardDate());
    }
  });
});

describe('Spieluhr', () => {
  it('laeuft, springt bei Sommerzeit und haelt an', () => {
    const c = new GameClock(D(1998, 1, 1), 8.0);
    expect(c.toString()).toBe('Do 01.01.1998 08:00');
    c.advance(12 * 60); // 12 reale Minuten = 1 Spielstunde
    expect(c.getHour() === 9 && c.getMinute() === 0).toBe(true);
    c.advance(15 * 12 * 60); // 15 Stunden -> 00:00 am Folgetag
    expect(c.getDate()).toEqual(D(1998, 1, 2));
    expect(c.getHour()).toBe(0);

    const dst = new GameClock(D(1998, 3, 29), 1.5); // 01:30 MEZ
    dst.advance(12 * 60); // eine Spielstunde
    expect(dst.getHour() === 3 && dst.getMinute() === 30).toBe(true); // Uhr springt 02:00 -> 03:00
    expect(dst.isSummerTimeNow()).toBe(true);

    const late = new GameClock(D(1998, 7, 10), 23.5); // 23:30 MESZ
    expect(late.getDate()).toEqual(D(1998, 7, 10));
    expect(late.getHour()).toBe(23);
    late.advance(12 * 60);
    expect(late.getDate()).toEqual(D(1998, 7, 11));
    expect(late.getHour()).toBe(0);

    c.setTimeScale(0.0);
    const h = c.getHourLocal();
    c.advance(1000);
    expect(c.getHourLocal()).toBe(h);
  });
});

describe('Sonne', () => {
  it('Auf-/Untergang und Sonnenstand', () => {
    // 21.06.: Aufgang ~05:28 MESZ, Untergang ~21:52 MESZ (Toleranz 10 min)
    const s = computeSunTimes(D(1998, 6, 21));
    expect(s.valid).toBe(true);
    near(s.sunriseStdHour + 1.0, 5.0 + 28.0 / 60, 10.0 / 60);
    near(s.sunsetStdHour + 1.0, 21.0 + 52.0 / 60, 10.0 / 60);
    // 21.12.: Aufgang ~08:29 MEZ, Untergang ~16:37 MEZ
    const w = computeSunTimes(D(1998, 12, 21));
    near(w.sunriseStdHour, 8.0 + 29.0 / 60, 10.0 / 60);
    near(w.sunsetStdHour, 16.0 + 37.0 / 60, 10.0 / 60);
    const noon = computeSunPosition(D(1998, 6, 21), 12.0 + 40.0 / 60); // etwa Sonnenhoechststand
    near(noon.elevationDeg, 90.0 - 49.61 + 23.44, 1.0);
    near(noon.azimuthDeg, 180.0, 5.0);
    const night = computeSunPosition(D(1998, 1, 15), 2.0);
    expect(night.elevationDeg).toBeLessThan(0); // nachts unter dem Horizont
  });
});

describe('Wirtschaft', () => {
  it('Formatierung und Portemonnaie', () => {
    expect(formatLuf(0)).toBe('0 LUF');
    expect(formatLuf(1250)).toBe('1 250 LUF');
    expect(formatLuf(-1234567)).toBe('-1 234 567 LUF');
    const w = new Wallet(2000, 10000);
    const d = D(1998, 1, 2);
    expect(w.payCash(500, d, 'Kaffi')).toBe(true);
    expect(w.payCash(5000, d, 'zu teuer')).toBe(false);
    expect(w.getCash()).toBe(1500);
    expect(w.payFromBank(20000, d, 'Miete')).toBe(false);
    w.setOverdraftLimit(15000);
    expect(w.payFromBank(20000, d, 'Miete')).toBe(true);
    expect(w.getBank()).toBe(-10000);
    expect(w.withdraw(6000, d)).toBe(false); // ueber Dispo
    expect(w.deposit(1000, d) && w.getCash() === 500 && w.getBank() === -9000).toBe(true);
    expect(w.payCash(-5, d, 'negativ')).toBe(false);
    expect(w.getHistory().length).toBe(3);
  });
  it('lehnt Nicht-Ganzzahlen ab', () => {
    const w = new Wallet(100, 0);
    expect(w.payCash(1.5, D(1998, 1, 2), 'x')).toBe(false);
    expect(() => new Wallet(0.5)).toThrow(RangeError);
  });
});

function makeM05(): MissionDef {
  return {
    id: 'M05_DEI_VERLUER_DISKETT',
    prerequisites: ['M01_ZERECK_AN_DSTAD'],
    objectives: [
      { id: 'talk_technician', alternativeGroup: '', optional: false, isCheckpoint: true },
      { id: 'find_via_forum', alternativeGroup: 'find_disk' }, // Weg A: Internetcafe-Forum
      { id: 'find_via_phonebook', alternativeGroup: 'find_disk' }, // Weg B: Telefonbuch + Anruf
      { id: 'return_disk' },
      { id: 'bonus_photo', optional: true },
    ],
    failConditions: ['disk_destroyed'],
  };
}

describe('Missionen', () => {
  it('Ablauf, alternative Wege, Checkpoint, Zeitfenster, Spielstand', () => {
    const t = new MissionTracker();
    const m01: MissionDef = {
      id: 'M01_ZERECK_AN_DSTAD',
      objectives: [{ id: 'arrive_station' }, { id: 'get_key' }, { id: 'visit_friend' }],
    };
    expect(t.register(m01).ok).toBe(true);
    expect(t.register(makeM05()).ok).toBe(true);
    const dup = t.register(makeM05()); // doppelte ID
    expect(!dup.ok && !!dup.error && dup.error.length > 0).toBe(true);
    const bad: MissionDef = { id: 'BAD', objectives: [{ id: 'x', alternativeGroup: '', optional: true }] };
    expect(t.register(bad).ok).toBe(false); // nur optionale Ziele

    t.refresh(D(1998, 1, 1));
    expect(t.getState('M01_ZERECK_AN_DSTAD')).toBe('Available');
    expect(t.getState('M05_DEI_VERLUER_DISKETT')).toBe('Locked');
    expect(t.start('M01_ZERECK_AN_DSTAD')).toBe(true);
    for (const o of ['arrive_station', 'get_key', 'visit_friend'])
      expect(t.completeObjective('M01_ZERECK_AN_DSTAD', o)).toBe(true);
    expect(t.getState('M01_ZERECK_AN_DSTAD')).toBe('Succeeded');

    t.refresh(D(1998, 1, 2));
    const M5 = 'M05_DEI_VERLUER_DISKETT';
    expect(t.start(M5)).toBe(true);
    expect(t.completeObjective(M5, 'talk_technician')).toBe(true); // Checkpoint
    expect(t.completeObjective(M5, 'find_via_phonebook')).toBe(true);
    expect(t.fail(M5, 'unbekannter_grund')).toBe(false);
    expect(t.fail(M5, 'disk_destroyed')).toBe(true);
    expect(t.restartFromCheckpoint(M5)).toBe(true);
    expect(t.isObjectiveDone(M5, 'talk_technician')).toBe(true);
    expect(t.isObjectiveDone(M5, 'find_via_phonebook')).toBe(false);
    expect(t.completeObjective(M5, 'find_via_forum')).toBe(true); // anderer Weg
    expect(t.getState(M5)).toBe('Active');
    expect(t.completeObjective(M5, 'return_disk')).toBe(true);
    expect(t.getState(M5)).toBe('Succeeded'); // Bonus nicht noetig

    // Zeitfenster (z. B. Schueberfouer)
    const f = new MissionTracker();
    const fouer: MissionDef = {
      id: 'M04_UM_GLACIS',
      availableFrom: D(1998, 8, 20),
      availableUntil: D(1998, 9, 10),
      objectives: [{ id: 'meet' }],
    };
    expect(f.register(fouer).ok).toBe(true);
    f.refresh(D(1998, 8, 1));
    expect(f.getState('M04_UM_GLACIS')).toBe('Locked');
    f.refresh(D(1998, 8, 25));
    expect(f.getState('M04_UM_GLACIS')).toBe('Available');

    // Spielstand-Rundreise
    const data = t.serialize();
    const t2 = new MissionTracker();
    t2.register(m01);
    t2.register(makeM05());
    expect(t2.deserialize(data)).toBe(true);
    expect(t2.getState(M5)).toBe('Succeeded');
    expect(t2.isObjectiveDone(M5, 'find_via_forum')).toBe(true);
  });
});

describe('Kommunikation', () => {
  it('Telefonbuch, Netz, Anrufbeantworter, Telefonzelle', () => {
    const book = new PhoneBook();
    expect(
      book.add({ number: '48 12 34', name: 'Garage Weber (fiktiv)', address: 'Rue fictive 1', district: 'Hollerich', isBusiness: true }),
    ).toBe(true);
    expect(
      book.add({ number: '22-33-44', name: 'Marie Schmit (fiktiv)', address: 'Rue fictive 2', district: 'Bonnevoie-Sud' }),
    ).toBe(true);
    expect(book.add({ number: '481234', name: 'Duplikat', address: '', district: '' })).toBe(false);
    expect(book.findByNumber('48.12.34')).not.toBeNull();
    expect(book.searchByName('garage').length).toBe(1);

    const net = new PhoneNetwork(book);
    net.setAnswerRule('481234', (d, hour) => dayOfWeek(d) !== Weekday.Sunday && hour >= 8 && hour < 18); // fiktiv
    expect(net.dial('481234', D(1998, 1, 5), 10)).toBe('Connected');
    expect(net.dial('481234', D(1998, 1, 4), 10)).toBe('NoAnswer'); // Sonntag
    expect(net.dial('999999', D(1998, 1, 5), 10)).toBe('InvalidNumber');
    net.setBusy('223344', true);
    expect(net.dial('223344', D(1998, 1, 5), 10)).toBe('Busy');

    net.leaveMessage('223344', {
      date: D(1998, 1, 5),
      hour: 9,
      minute: 15,
      fromNumber: '481234',
      text: "Moien, hei ass d'Garage ...",
      dialogueId: 'DLG_GARAGE_001',
    });
    expect(net.unheardMessages('223344').length).toBe(1);
    net.markAllHeard('223344');
    expect(net.unheardMessages('223344').length).toBe(0);

    const p = new PayphoneSession({ pricePerUnit: 5, secondsPerUnitLocal: 60.0, minimumInsert: 10 }); // Testtarif
    expect(p.insertCoins(5)).toBe(false); // unter Mindesteinwurf
    expect(p.insertCoins(20)).toBe(true);
    expect(p.tick(30)).toBe(true); // erste Einheit
    expect(p.getCredit()).toBe(15);
    expect(p.tick(120)).toBe(true); // zwei weitere Einheiten
    expect(p.getCredit()).toBe(5);
    expect(p.tick(60)).toBe(true); // letzte bezahlbare Einheit
    expect(p.getCredit()).toBe(0);
    expect(p.tick(60)).toBe(false); // kein Guthaben mehr -> Verbindung bricht ab
    expect(p.hangup()).toBe(0);
  });
});

class MemoryStorage implements StorageLike {
  private items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
}

describe('Spielstaende', () => {
  const d: SaveData = { 'player.money.cash': '12500', 'clock.date': '1998-08-21', note: 'Linn 1\nLinn 2 = x\\y' };

  it('Format, Pruefsumme, Versionen', () => {
    const text = serializeSave(d);
    const parsed = parseSave(text);
    expect(parsed.data).toEqual(d);
    expect(parsed.error).toBe('None');

    const i = text.indexOf('12500');
    const corrupt = text.substring(0, i) + '9' + text.substring(i + 1);
    const c = parseSave(corrupt);
    expect(c.data === null && c.error === 'BadChecksum').toBe(true);
    const h = parseSave('irgendwas');
    expect(h.data === null && h.error === 'BadHeader').toBe(true);
    const future = serializeSave({}, 99);
    const f = parseSave(future);
    expect(f.data === null && f.error === 'NewerVersion').toBe(true);
  });

  it('Speicher mit Sicherungskopie (.bak)', () => {
    const storage = new MemoryStorage();
    const key = 'slot1.sav';
    expect(writeSaveToStorage(storage, key, d).ok).toBe(true);
    const d2: SaveData = { ...d, 'player.money.cash': '100' };
    expect(writeSaveToStorage(storage, key, d2).ok).toBe(true);
    storage.setItem(key, 'LUX98SAVE\nversion=1\nkaputt'); // Stand beschaedigt
    const loaded = readSaveFromStorage(storage, key);
    expect(loaded.data !== null && loaded.usedBackup && loaded.data['player.money.cash'] === '12500').toBe(true);
  });

  it('CRC-32 Pruefwert', () => {
    expect(crc32('123456789')).toBe(0xcbf43926);
  });
});

describe('Historische Regeln', () => {
  it('Anachronismen', () => {
    const win98: HistoricalMeta = { assetId: 'TECH_WINDOWS98_PC', existsFrom: D(1998, 6, 25), accuracy: 'A', sourceRef: 'SRC_TECH_001' };
    expect(isAllowedOn(win98, D(1998, 3, 1))).toBe(false);
    expect(isAllowedOn(win98, D(1998, 7, 1))).toBe(true);
    expect(checkAsset(win98, D(1998, 3, 1)).length).toBe(1);

    const tram: HistoricalMeta = { assetId: 'TRANSPORT_TRAM_KIRCHBERG', existsFrom: D(2017, 12, 10), accuracy: 'A', sourceRef: 'SRC_TRAM_001' };
    expect(isAllowedOn(tram, D(1998, 12, 31))).toBe(false);

    const noSource: HistoricalMeta = { assetId: 'X', existsFrom: D(1990, 1, 1), accuracy: 'B', sourceRef: '' };
    const issues = checkAsset(noSource, D(1998, 1, 1));
    expect(issues.length === 1 && issues[0]?.kind === 'MissingSource').toBe(true);

    const fiction: HistoricalMeta = { assetId: 'SHOP_INTERNETCAFE_FICTIVE_01', accuracy: 'D', sourceRef: '' };
    expect(checkAsset(fiction, D(1998, 1, 1)).length).toBe(0);
    const unknown: HistoricalMeta = { assetId: 'Y' };
    expect(checkAsset(unknown, D(1998, 1, 1)).length).toBe(2);
  });
});
