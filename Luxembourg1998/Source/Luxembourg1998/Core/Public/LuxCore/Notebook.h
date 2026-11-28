// LUX98 – Notizbuch des Spielers: Adressen, Telefonnummern, Termine, Hinweise, Fotos.
// Ersetzt moderne Quest-Menues durch ein analoges Notizbuch (siehe Game Design, Abschnitt 08).
#pragma once

#include <map>
#include <optional>
#include <string>
#include <vector>

namespace lux98 {

enum class NoteKind { Address, Phone, Appointment, Clue, Photo, Bill };
const char* ToString(NoteKind k);

struct NoteEntry {
    std::string id;            // eindeutig, z. B. "phone.reding_4711"
    NoteKind kind = NoteKind::Clue;
    std::string text;          // was der Spieler "hineingeschrieben" hat
    std::string missionId;     // optional: zugehoerige Mission
    double atHours = -1;       // fuer Termine: Spielzeit (Stunden seit 1.1.1998, Normalzeit)
    double untilHours = -1;    // fuer Termine: Ende des Zeitfensters
    bool struck = false;       // durchgestrichen (erledigt)
};

class Notebook {
public:
    // Fuegt hinzu oder ersetzt den Text einer bestehenden Notiz gleicher ID (kein Doppeleintrag).
    void Write(NoteEntry e);
    bool Strike(const std::string& id);
    bool Remove(const std::string& id);
    std::optional<NoteEntry> Find(const std::string& id) const;

    std::vector<NoteEntry> ByKind(NoteKind k, bool includeStruck = false) const;
    std::vector<NoteEntry> ForMission(const std::string& missionId) const;

    // Termine relativ zur Spielzeit
    std::vector<NoteEntry> UpcomingAppointments(double nowHours, double withinHours) const;
    std::vector<NoteEntry> MissedAppointments(double nowHours) const;  // Ende vorbei, nicht erledigt

    size_t Size() const { return order_.size(); }

    // Fuer Spielstaende: "note.0000" (Reihenfolge) -> "id|kind|mission|at|until|struck|text"
    std::map<std::string, std::string> Serialize() const;
    bool Deserialize(const std::map<std::string, std::string>& data);

private:
    std::map<std::string, NoteEntry> entries_;
    std::vector<std::string> order_;  // Reihenfolge des Hineinschreibens
};

}  // namespace lux98
