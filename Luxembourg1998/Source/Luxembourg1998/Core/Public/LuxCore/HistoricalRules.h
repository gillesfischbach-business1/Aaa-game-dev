// LUX98 – Laufzeitpruefung auf Anachronismen.
// Jedes Objekt in der Welt traegt Metadaten: ab wann und bis wann es existierte.
// Beispiel: Ein PC mit Windows 98 darf im Internetcafe erst ab dessen Erscheinen stehen.
#pragma once

#include <optional>
#include <string>
#include <vector>

#include "LuxCore/Calendar1998.h"

namespace lux98 {

enum class Accuracy { A, B, C, D, Unknown };
Accuracy AccuracyFromChar(char c);

struct HistoricalMeta {
    std::string assetId;
    std::optional<Date> existsFrom;   // fehlt = unbekannt -> Warnung
    std::optional<Date> existsUntil;  // fehlt = existiert noch / offen
    Accuracy accuracy = Accuracy::Unknown;
    std::string sourceRef;            // Pflicht fuer A und B
};

enum class IssueKind { MissingMetadata, MissingSource, NotYetExisting, NoLongerExisting };

struct HistoricalIssue {
    IssueKind kind;
    std::string assetId;
    std::string message;
};

// Prueft ein Objekt gegen das aktuelle Spieldatum.
std::vector<HistoricalIssue> CheckAsset(const HistoricalMeta& meta, const Date& gameDate);

// Darf das Objekt an diesem Tag sichtbar sein? (Fiktive D-Objekte ohne Datum: ja.)
bool IsAllowedOn(const HistoricalMeta& meta, const Date& gameDate);

}  // namespace lux98
