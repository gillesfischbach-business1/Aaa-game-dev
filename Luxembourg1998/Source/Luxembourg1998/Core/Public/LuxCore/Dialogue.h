// LUX98 – Dialogsystem (engine-unabhaengig).
// Ein Dialog ist ein Graph aus Knoten. Jeder Knoten hat einen Sprecher, Text in mehreren Sprachen
// (Luxemburgisch ist die gesprochene Sprache, die anderen dienen als Untertitel), optionale Bedingungen
// und Wirkungen (Flags setzen) sowie entweder einen Folgeknoten oder Auswahlmoeglichkeiten.
#pragma once

#include <map>
#include <optional>
#include <set>
#include <string>
#include <vector>

namespace lux98 {

enum class Lang { LB, DE, FR, EN };
const char* ToCode(Lang l);

struct LocalizedText {
    std::map<Lang, std::string> text;
    // Fallback-Reihenfolge: gewuenschte Sprache -> Deutsch -> Luxemburgisch -> irgendeine
    std::string Get(Lang l) const;
    bool Has(Lang l) const;
};

struct FlagCondition {
    std::vector<std::string> requireSet;    // alle muessen gesetzt sein
    std::vector<std::string> requireUnset;  // keines darf gesetzt sein
    bool Holds(const std::set<std::string>& flags) const;
};

struct DialogueChoice {
    LocalizedText text;
    std::string next;           // leer = Dialog endet
    FlagCondition condition;    // Auswahl nur sichtbar, wenn erfuellt
    std::vector<std::string> setFlags;
};

struct DialogueNode {
    std::string id;
    std::string speaker;
    LocalizedText text;
    std::string next;                     // wenn keine Auswahl: Folgeknoten (leer = Ende)
    std::vector<DialogueChoice> choices;
    std::vector<std::string> setFlags;    // beim Betreten gesetzt
    FlagCondition condition;              // Knoten wird uebersprungen, wenn nicht erfuellt
    std::string skipTo;                   // Ziel beim Ueberspringen (leer = Ende)
};

struct DialogueIssue { std::string nodeId; std::string message; };

class DialogueGraph {
public:
    bool Add(DialogueNode node, std::string* error = nullptr);  // false bei doppelter ID
    const DialogueNode* Find(const std::string& id) const;
    // Pruefung fuer Daten-Werkzeuge: fehlende Ziele, fehlender luxemburgischer Text, unerreichbare Knoten
    std::vector<DialogueIssue> Validate(const std::string& startId) const;
    size_t Size() const { return nodes_.size(); }

private:
    std::map<std::string, DialogueNode> nodes_;
};

// Spielt einen Dialog ab. Flags sind der gemeinsame Zustand (Spielstand), z. B. "m02.path_honest".
class DialogueRunner {
public:
    DialogueRunner(const DialogueGraph& graph, std::set<std::string>& flags) : graph_(graph), flags_(flags) {}

    bool Start(const std::string& nodeId);
    bool IsActive() const { return current_ != nullptr; }
    const DialogueNode* Current() const { return current_; }
    std::string Speaker() const { return current_ ? current_->speaker : ""; }
    std::string Spoken() const;          // Luxemburgisch
    std::string Subtitle(Lang l) const;  // Untertitel in gewaehlter Sprache
    // Sichtbare Auswahlmoeglichkeiten (Bedingungen beruecksichtigt): Index in die Originalliste + Text
    std::vector<std::pair<size_t, std::string>> VisibleChoices(Lang l) const;
    bool Advance();                      // nur ohne Auswahl; false = Dialog beendet
    bool Choose(size_t originalIndex);   // false = ungueltig oder Dialog beendet
    const std::vector<std::string>& History() const { return history_; }

private:
    bool Enter(const std::string& id);
    const DialogueGraph& graph_;
    std::set<std::string>& flags_;
    const DialogueNode* current_ = nullptr;
    std::vector<std::string> history_;
};

}  // namespace lux98
