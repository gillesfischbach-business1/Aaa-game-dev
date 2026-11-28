// LUX98 – Wirtschaft in Luxemburger Franken (LUF), Port von Economy.
// Betraege sind ganze Franken; Nicht-Ganzzahlen werden abgelehnt.
import { copyDate, type LuxDate } from './calendar';

export type Francs = number;

export function isFrancs(v: number): boolean {
  return Number.isSafeInteger(v);
}

function requireFrancs(v: number, what: string): void {
  if (!isFrancs(v)) throw new RangeError(`${what}: ganze Franken erwartet, erhalten ${v}`);
}

// "12 345 LUF" (Leerzeichen als Tausendertrennzeichen)
export function formatLuf(amount: Francs): string {
  requireFrancs(amount, 'formatLuf');
  const neg = amount < 0;
  const digits = String(Math.abs(amount));
  let out = '';
  for (let i = 0; i < digits.length; ++i) {
    const fromRight = digits.length - i;
    if (i > 0 && fromRight % 3 === 0) out += ' ';
    out += digits[i];
  }
  return (neg ? '-' : '') + out + ' LUF';
}

export type TransactionKind = 'Purchase' | 'Salary' | 'Bill' | 'Sale' | 'Transfer' | 'LoanPayout' | 'LoanRepayment';

export interface Transaction {
  date: LuxDate;
  kind: TransactionKind;
  amount: Francs; // positiv = Eingang, negativ = Ausgang
  memo: string;
}

export class Wallet {
  private cash: Francs;
  private bank: Francs;
  private overdraftLimit: Francs = 0;
  private history: Transaction[] = [];

  constructor(cash: Francs = 0, bank: Francs = 0) {
    requireFrancs(cash, 'Wallet cash');
    requireFrancs(bank, 'Wallet bank');
    this.cash = cash;
    this.bank = bank;
  }

  getCash(): Francs {
    return this.cash;
  }

  getBank(): Francs {
    return this.bank;
  }

  // Bargeldzahlung; schlaegt fehl, wenn nicht genug Bargeld da ist.
  payCash(amount: Francs, d: LuxDate, memo: string): boolean {
    if (!isFrancs(amount) || amount <= 0 || amount > this.cash) return false;
    this.cash -= amount;
    this.push(d, 'Purchase', -amount, memo);
    return true;
  }

  // Ueberweisung/Abbuchung vom Konto; Dispo erlaubt bis overdraftLimit.
  payFromBank(amount: Francs, d: LuxDate, memo: string, kind: TransactionKind = 'Bill'): boolean {
    if (!isFrancs(amount) || amount <= 0 || this.bank - amount < -this.overdraftLimit) return false;
    this.bank -= amount;
    this.push(d, kind, -amount, memo);
    return true;
  }

  receiveSalary(amount: Francs, d: LuxDate, memo: string): void {
    if (!isFrancs(amount) || amount <= 0) return;
    this.bank += amount;
    this.push(d, 'Salary', amount, memo);
  }

  receiveCash(amount: Francs, d: LuxDate, memo: string): void {
    if (!isFrancs(amount) || amount <= 0) return;
    this.cash += amount;
    this.push(d, 'Sale', amount, memo);
  }

  // Geldautomat
  withdraw(amount: Francs, d: LuxDate): boolean {
    if (!isFrancs(amount) || amount <= 0 || this.bank - amount < -this.overdraftLimit) return false;
    this.bank -= amount;
    this.cash += amount;
    this.push(d, 'Transfer', 0, 'Geldautomat ' + formatLuf(amount));
    return true;
  }

  deposit(amount: Francs, d: LuxDate): boolean {
    if (!isFrancs(amount) || amount <= 0 || amount > this.cash) return false;
    this.cash -= amount;
    this.bank += amount;
    this.push(d, 'Transfer', 0, 'Einzahlung ' + formatLuf(amount));
    return true;
  }

  // Nicht-ganzzahlige Werte werden ignoriert.
  setOverdraftLimit(limit: Francs): void {
    if (!isFrancs(limit)) return;
    this.overdraftLimit = limit < 0 ? 0 : limit;
  }

  getHistory(): readonly Transaction[] {
    return this.history.map((t) => ({ ...t, date: copyDate(t.date) }));
  }

  private push(d: LuxDate, kind: TransactionKind, amount: Francs, memo: string): void {
    this.history.push({ date: copyDate(d), kind, amount, memo });
  }
}
