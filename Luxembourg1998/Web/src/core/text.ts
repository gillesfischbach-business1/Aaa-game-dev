// LUX98 – Kleine Text-Hilfen, damit Sortierung und Kleinschreibung exakt wie im C++-Kern sind.

// Vergleich in UTF-8-Byte-Reihenfolge (= Codepunkt-Reihenfolge), wie std::string / std::map in C++.
export function compareBytes(a: string, b: string): number {
  if (a === b) return 0;
  const ia = a[Symbol.iterator]();
  const ib = b[Symbol.iterator]();
  for (;;) {
    const x = ia.next();
    const y = ib.next();
    if (x.done) return y.done ? 0 : -1;
    if (y.done) return 1;
    const cx = x.value.codePointAt(0) ?? 0;
    const cy = y.value.codePointAt(0) ?? 0;
    if (cx !== cy) return cx < cy ? -1 : 1;
  }
}

// Wie std::tolower im "C"-Locale: nur A-Z werden verkleinert.
export function asciiLower(s: string): string {
  return s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
}

// Wie std::getline-Schleife: leere Endzeile nach letztem Trenner entfaellt, leerer Text -> [].
export function getlineSplit(s: string, sep: string): string[] {
  if (s.length === 0) return [];
  const parts = s.split(sep);
  if (parts[parts.length - 1] === '') parts.pop();
  return parts;
}

// printf("%0Nd")
export function padInt(n: number, width: number): string {
  const neg = n < 0;
  const digits = String(Math.abs(Math.trunc(n)));
  const w = neg ? width - 1 : width;
  return (neg ? '-' : '') + (digits.length < w ? '0'.repeat(w - digits.length) + digits : digits);
}

// Einfache Nachbildung von sscanf("%Nd"): fuehrende Leerzeichen, Vorzeichen, bis zu N Zeichen.
export function scanInt(s: string, pos: number, width = Infinity): { value: number; next: number } | null {
  let i = pos;
  while (i < s.length && /\s/.test(s[i] ?? '')) i++;
  const start = i;
  let sign = 1;
  if (s[i] === '+' || s[i] === '-') {
    if (s[i] === '-') sign = -1;
    i++;
  }
  let value = 0;
  let digits = 0;
  while (i < s.length && i - start < width && (s[i] ?? '') >= '0' && (s[i] ?? '') <= '9') {
    value = value * 10 + (s.charCodeAt(i) - 48);
    i++;
    digits++;
  }
  if (digits === 0) return null;
  return { value: sign * value, next: i };
}
