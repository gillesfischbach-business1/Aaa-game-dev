#include <utility>
#include "LuxCore/MissionSystem.h"

#include <algorithm>
#include <set>
#include <sstream>

namespace lux98 {
namespace {
bool Contains(const std::vector<std::string>& v, const std::string& s) {
    return std::find(v.begin(), v.end(), s) != v.end();
}
std::string Join(const std::vector<std::string>& v) {
    std::string out;
    for (size_t i = 0; i < v.size(); ++i) out += (i ? "," : "") + v[i];
    return out;
}
std::vector<std::string> Split(const std::string& s, char sep) {
    std::vector<std::string> out;
    std::stringstream ss(s);
    std::string part;
    while (std::getline(ss, part, sep))
        if (!part.empty()) out.push_back(part);
    return out;
}
}  // namespace

const char* ToString(MissionState s) {
    switch (s) {
        case MissionState::Locked: return "Locked";
        case MissionState::Available: return "Available";
        case MissionState::Active: return "Active";
        case MissionState::Succeeded: return "Succeeded";
        case MissionState::Failed: return "Failed";
    }
    return "Locked";
}

bool MissionTracker::Register(const MissionDef& def, std::string* error) {
    auto fail = [&](const std::string& msg) { if (error) *error = def.id + ": " + msg; return false; };
    if (def.id.empty()) return fail("leere Missions-ID");
    if (missions_.count(def.id)) return fail("Missions-ID doppelt");
    if (def.objectives.empty()) return fail("keine Ziele");
    std::set<std::string> ids;
    bool hasRequired = false;
    for (const auto& o : def.objectives) {
        if (o.id.empty() || !ids.insert(o.id).second) return fail("Ziel-ID leer oder doppelt: " + o.id);
        if (!o.optional) hasRequired = true;
    }
    if (!hasRequired) return fail("nur optionale Ziele – Mission waere nie abschliessbar");
    if (def.availableFrom && def.availableUntil && *def.availableUntil < *def.availableFrom)
        return fail("Zeitfenster endet vor Beginn");
    Instance inst;
    inst.def = def;
    missions_[def.id] = std::move(inst);
    return true;
}

void MissionTracker::Refresh(const Date& today) {
    for (auto& [id, inst] : missions_) {
        if (inst.state != MissionState::Locked && inst.state != MissionState::Available) continue;
        bool ok = true;
        for (const auto& req : inst.def.prerequisites) {
            auto it = missions_.find(req);
            if (it == missions_.end() || it->second.state != MissionState::Succeeded) ok = false;
        }
        if (inst.def.availableFrom && today < *inst.def.availableFrom) ok = false;
        if (inst.def.availableUntil && *inst.def.availableUntil < today) ok = false;
        inst.state = ok ? MissionState::Available : MissionState::Locked;
    }
}

bool MissionTracker::Start(const std::string& id) {
    auto it = missions_.find(id);
    if (it == missions_.end() || it->second.state != MissionState::Available) return false;
    it->second.state = MissionState::Active;
    it->second.done.clear();
    it->second.checkpointDone.clear();
    it->second.failReason.clear();
    return true;
}

bool MissionTracker::CheckSuccess(Instance& inst) {
    std::set<std::string> groupsSatisfied, groupsNeeded;
    for (const auto& o : inst.def.objectives) {
        if (o.optional) continue;
        const std::string key = o.alternativeGroup.empty() ? "#" + o.id : o.alternativeGroup;
        groupsNeeded.insert(key);
        if (Contains(inst.done, o.id)) groupsSatisfied.insert(key);
    }
    if (groupsSatisfied.size() == groupsNeeded.size()) {
        inst.state = MissionState::Succeeded;
        return true;
    }
    return false;
}

bool MissionTracker::CompleteObjective(const std::string& id, const std::string& objectiveId) {
    auto it = missions_.find(id);
    if (it == missions_.end() || it->second.state != MissionState::Active) return false;
    auto& inst = it->second;
    auto obj = std::find_if(inst.def.objectives.begin(), inst.def.objectives.end(),
                            [&](const ObjectiveDef& o) { return o.id == objectiveId; });
    if (obj == inst.def.objectives.end() || Contains(inst.done, objectiveId)) return false;
    inst.done.push_back(objectiveId);
    if (obj->isCheckpoint) inst.checkpointDone = inst.done;
    CheckSuccess(inst);
    return true;
}

bool MissionTracker::Fail(const std::string& id, const std::string& reason) {
    auto it = missions_.find(id);
    if (it == missions_.end() || it->second.state != MissionState::Active) return false;
    if (!Contains(it->second.def.failConditions, reason)) return false;  // nur definierte Gruende
    it->second.state = MissionState::Failed;
    it->second.failReason = reason;
    return true;
}

bool MissionTracker::RestartFromCheckpoint(const std::string& id) {
    auto it = missions_.find(id);
    if (it == missions_.end() || it->second.state != MissionState::Failed) return false;
    it->second.state = MissionState::Active;
    it->second.done = it->second.checkpointDone;
    it->second.failReason.clear();
    return true;
}

MissionState MissionTracker::GetState(const std::string& id) const {
    auto it = missions_.find(id);
    return it == missions_.end() ? MissionState::Locked : it->second.state;
}

bool MissionTracker::IsObjectiveDone(const std::string& id, const std::string& objectiveId) const {
    auto it = missions_.find(id);
    return it != missions_.end() && Contains(it->second.done, objectiveId);
}

std::string MissionTracker::GetFailReason(const std::string& id) const {
    auto it = missions_.find(id);
    return it == missions_.end() ? "" : it->second.failReason;
}

std::vector<std::string> MissionTracker::MissionIds() const {
    std::vector<std::string> ids;
    for (const auto& kv : missions_) ids.push_back(kv.first);
    return ids;
}

std::map<std::string, std::string> MissionTracker::Serialize() const {
    std::map<std::string, std::string> out;
    for (const auto& [id, inst] : missions_)
        out["mission." + id] = std::string(ToString(inst.state)) + ";" + Join(inst.done) + ";" +
                               Join(inst.checkpointDone) + ";" + inst.failReason;
    return out;
}

bool MissionTracker::Deserialize(const std::map<std::string, std::string>& data) {
    // In eine Kopie lesen und nur bei Erfolg uebernehmen; Missionen ohne Eintrag starten frisch (gesperrt).
    auto next = missions_;
    for (auto& [id, inst] : next) {
        inst.state = MissionState::Locked;
        inst.done.clear();
        inst.checkpointDone.clear();
        inst.failReason.clear();
    }
    for (const auto& [key, value] : data) {
        if (key.rfind("mission.", 0) != 0) continue;
        auto it = next.find(key.substr(8));
        if (it == next.end()) continue;  // Mission existiert in dieser Version nicht mehr
        std::vector<std::string> parts;
        std::stringstream ss(value);
        std::string part;
        while (std::getline(ss, part, ';')) parts.push_back(part);
        while (parts.size() < 4) parts.emplace_back();
        for (std::size_t i = 4; i < parts.size(); ++i) parts[3] += ";" + parts[i];  // Grund darf ';' enthalten
        static const MissionState kAll[] = {MissionState::Locked, MissionState::Available, MissionState::Active,
                                            MissionState::Succeeded, MissionState::Failed};
        bool known = false;
        for (auto s : kAll)
            if (parts[0] == ToString(s)) { it->second.state = s; known = true; }
        if (!known) return false;
        it->second.done = Split(parts[1], ',');
        it->second.checkpointDone = Split(parts[2], ',');
        it->second.failReason = parts[3];
    }
    missions_ = std::move(next);
    return true;
}

}  // namespace lux98
