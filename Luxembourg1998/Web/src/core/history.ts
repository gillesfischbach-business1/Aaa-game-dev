// LUX98 – Laufzeitpruefung auf Anachronismen (Port von HistoricalRules).
import { isBefore, toIso, type LuxDate } from './calendar';

export type Accuracy = 'A' | 'B' | 'C' | 'D' | 'Unknown';

export function accuracyFromChar(c: string): Accuracy {
  switch (c) {
    case 'A':
    case 'B':
    case 'C':
    case 'D':
      return c;
    default:
      return 'Unknown';
  }
}

export interface HistoricalMeta {
  assetId: string;
  existsFrom?: LuxDate; // fehlt = unbekannt -> Warnung
  existsUntil?: LuxDate; // fehlt = existiert noch / offen
  accuracy?: Accuracy; // fehlt = 'Unknown'
  sourceRef?: string; // Pflicht fuer A und B
}

export type IssueKind = 'MissingMetadata' | 'MissingSource' | 'NotYetExisting' | 'NoLongerExisting';

export interface HistoricalIssue {
  kind: IssueKind;
  assetId: string;
  message: string;
}

// Prueft ein Objekt gegen das aktuelle Spieldatum.
export function checkAsset(m: HistoricalMeta, gameDate: LuxDate): HistoricalIssue[] {
  const issues: HistoricalIssue[] = [];
  const accuracy = m.accuracy ?? 'Unknown';
  const add = (kind: IssueKind, message: string): void => {
    issues.push({ kind, assetId: m.assetId, message });
  };
  if (accuracy === 'Unknown') add('MissingMetadata', 'Genauigkeitskategorie fehlt');
  if (!m.existsFrom && accuracy !== 'D') add('MissingMetadata', 'Existenzbeginn unbekannt');
  if ((accuracy === 'A' || accuracy === 'B') && !m.sourceRef) add('MissingSource', 'Kategorie A/B ohne Quellenangabe');
  if (m.existsFrom && isBefore(gameDate, m.existsFrom)) add('NotYetExisting', 'existiert erst ab ' + toIso(m.existsFrom));
  if (m.existsUntil && isBefore(m.existsUntil, gameDate))
    add('NoLongerExisting', 'existiert nur bis ' + toIso(m.existsUntil));
  return issues;
}

// Darf das Objekt an diesem Tag sichtbar sein? (Fiktive D-Objekte ohne Datum: ja.)
export function isAllowedOn(m: HistoricalMeta, gameDate: LuxDate): boolean {
  if (m.existsFrom && isBefore(gameDate, m.existsFrom)) return false;
  if (m.existsUntil && isBefore(m.existsUntil, gameDate)) return false;
  return true;
}
