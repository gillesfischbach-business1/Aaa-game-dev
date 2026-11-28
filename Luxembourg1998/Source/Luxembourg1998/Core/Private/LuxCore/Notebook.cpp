#include "LuxCore/Notebook.h"

#include <algorithm>
#include <cstdio>
#include <cstdlib>

namespace lux98 {

const char* ToString(NoteKind k) {
    switch (k) {
        case NoteKind::Address: return "address";
        case NoteKind::Phone: return "phone";
        case NoteKind::Appointment: return "appointment";
        case NoteKind::Clue: return "clue";
        case NoteKind::Photo: return "photo";
        case NoteKind::Bill: return "bill";
    }
    return "clue";
}

static std::optional<NoteKind> KindFromString(const std::string& s) {
    for (NoteKind k : {NoteKind::Address, NoteKind::Phone, NoteKind::Appointment, NoteKind::Clue, NoteKind::Photo, NoteKind::Bill})
        if (s == ToString(k)) return k;
    return std::nullopt;
}

void Notebook::Write(NoteEntry e) {
    if (e.id.empty()) return;
    if (!entries_.count(e.id)) order_.push_back(e.id);
    entries_[e.id] = std::move(e);
}

bool Notebook::Strike(const std::string& id) {
    auto it = entries_.find(id);
    if (it == entries_.end()) return false;
    it->second.struck = true;
    return true;
}

bool Notebook::Remove(const std::string& id) {
    if (!entries_.erase(id)) return false;
    order_.erase(std::remove(order_.begin(), order_.end(), id), order_.end());
    return true;
}

std::optional<NoteEntry> Notebook::Find(const std::string& id) const {
    auto it = entries_.find(id);
    if (it == entries_.end()) return std::nullopt;
    return it->second;
}

std::vector<NoteEntry> Notebook::ByKind(NoteKind k, bool includeStruck) const {
    std::vector<NoteEntry> out;
    for (const auto& id : order_) {
        const auto& e = entries_.at(id);
        if (e.kind == k && (includeStruck || !e.struck)) out.push_back(e);
    }
    return out;
}

std::vector<NoteEntry> Notebook::ForMission(const std::string& missionId) const {
    std::vector<NoteEntry> out;
    for (const auto& id : order_)
        if (entries_.at(id).missionId == missionId) out.push_back(entries_.at(id));
    return out;
}

std::vector<NoteEntry> Notebook::UpcomingAppointments(double now, double within) const {
    std::vector<NoteEntry> out;
    for (const auto& e : ByKind(NoteKind::Appointment))
        if (e.atHours >= now && e.atHours <= now + within) out.push_back(e);
    std::sort(out.begin(), out.end(), [](const NoteEntry& a, const NoteEntry& b) { return a.atHours < b.atHours; });
    return out;
}

std::vector<NoteEntry> Notebook::MissedAppointments(double now) const {
    std::vector<NoteEntry> out;
    for (const auto& e : ByKind(NoteKind::Appointment)) {
        const double end = e.untilHours >= 0 ? e.untilHours : e.atHours;
        if (end >= 0 && end < now) out.push_back(e);
    }
    return out;
}

std::map<std::string, std::string> Notebook::Serialize() const {
    std::map<std::string, std::string> out;
    int n = 0;
    for (const auto& id : order_) {
        const auto& e = entries_.at(id);
        char nums[64];
        std::snprintf(nums, sizeof(nums), "%.4f|%.4f", e.atHours, e.untilHours);
        // Reihenfolge ueber laufende Nummer im Schluessel erhalten
        char key[32];
        std::snprintf(key, sizeof(key), "note.%04d", n++);
        out[key] = e.id + "|" + ToString(e.kind) + "|" + e.missionId + "|" + nums + "|" + (e.struck ? "1" : "0") + "|" + e.text;
    }
    return out;
}

bool Notebook::Deserialize(const std::map<std::string, std::string>& data) {
    Notebook fresh;
    for (const auto& [key, value] : data) {
        if (key.rfind("note.", 0) != 0) continue;
        // id|kind|mission|at|until|struck|text  (text darf '|' enthalten -> nur die ersten 6 Trenner zaehlen)
        std::vector<std::string> parts;
        size_t start = 0;
        for (int i = 0; i < 6; ++i) {
            const size_t bar = value.find('|', start);
            if (bar == std::string::npos) return false;
            parts.push_back(value.substr(start, bar - start));
            start = bar + 1;
        }
        parts.push_back(value.substr(start));
        auto kind = KindFromString(parts[1]);
        if (!kind || parts[0].empty()) return false;
        NoteEntry e;
        e.id = parts[0];
        e.kind = *kind;
        e.missionId = parts[2];
        e.atHours = std::strtod(parts[3].c_str(), nullptr);
        e.untilHours = std::strtod(parts[4].c_str(), nullptr);
        e.struck = parts[5] == "1";
        e.text = parts[6];
        fresh.Write(std::move(e));
    }
    *this = std::move(fresh);
    return true;
}

}  // namespace lux98
