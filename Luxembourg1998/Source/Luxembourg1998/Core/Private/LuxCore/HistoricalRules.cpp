#include "LuxCore/HistoricalRules.h"

namespace lux98 {

Accuracy AccuracyFromChar(char c) {
    switch (c) {
        case 'A': return Accuracy::A;
        case 'B': return Accuracy::B;
        case 'C': return Accuracy::C;
        case 'D': return Accuracy::D;
        default: return Accuracy::Unknown;
    }
}

std::vector<HistoricalIssue> CheckAsset(const HistoricalMeta& m, const Date& gameDate) {
    std::vector<HistoricalIssue> issues;
    if (m.accuracy == Accuracy::Unknown)
        issues.push_back({IssueKind::MissingMetadata, m.assetId, "Genauigkeitskategorie fehlt"});
    if (!m.existsFrom && m.accuracy != Accuracy::D)
        issues.push_back({IssueKind::MissingMetadata, m.assetId, "Existenzbeginn unbekannt"});
    if ((m.accuracy == Accuracy::A || m.accuracy == Accuracy::B) && m.sourceRef.empty())
        issues.push_back({IssueKind::MissingSource, m.assetId, "Kategorie A/B ohne Quellenangabe"});
    if (m.existsFrom && gameDate < *m.existsFrom)
        issues.push_back({IssueKind::NotYetExisting, m.assetId, "existiert erst ab " + m.existsFrom->ToIso()});
    if (m.existsUntil && *m.existsUntil < gameDate)
        issues.push_back({IssueKind::NoLongerExisting, m.assetId, "existiert nur bis " + m.existsUntil->ToIso()});
    return issues;
}

bool IsAllowedOn(const HistoricalMeta& m, const Date& gameDate) {
    if (m.existsFrom && gameDate < *m.existsFrom) return false;
    if (m.existsUntil && *m.existsUntil < gameDate) return false;
    return true;
}

}  // namespace lux98
