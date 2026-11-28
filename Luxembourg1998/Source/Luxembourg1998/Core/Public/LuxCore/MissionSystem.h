// LUX98 – Datengetriebenes Missionssystem.
// Missionen bestehen aus Zielen. Ziele mit gleicher "alternativeGroup" sind alternative
// Loesungswege: eines davon genuegt. Optionale Ziele sind fuer den Erfolg nicht noetig.
#pragma once

#include <map>
#include <optional>
#include <string>
#include <vector>

#include "LuxCore/Calendar1998.h"

namespace lux98 {

struct ObjectiveDef {
    std::string id;
    std::string alternativeGroup;  // leer = Pflichtziel fuer sich allein
    bool optional = false;
    bool isCheckpoint = false;     // nach Abschluss wird ein Checkpoint gesetzt
};

struct MissionDef {
    std::string id;                        // z. B. "M01_ZERECK_AN_DSTAD"
    std::vector<std::string> prerequisites;    // Missionen, die vorher erfolgreich sein muessen
    std::optional<Date> availableFrom;     // z. B. Schueberfouer-Zeitraum
    std::optional<Date> availableUntil;
    std::vector<ObjectiveDef> objectives;
    std::vector<std::string> failConditions;  // erlaubte Fehlschlag-Gruende
};

enum class MissionState { Locked, Available, Active, Succeeded, Failed };
const char* ToString(MissionState s);

class MissionTracker {
public:
    // Gibt false zurueck, wenn die Definition fehlerhaft ist (doppelte IDs, leere Ziele ...).
    bool Register(const MissionDef& def, std::string* error = nullptr);

    // Prueft Voraussetzungen und Datumsfenster und schaltet Missionen frei bzw. sperrt sie.
    void Refresh(const Date& today);

    bool Start(const std::string& missionId);
    bool CompleteObjective(const std::string& missionId, const std::string& objectiveId);
    bool Fail(const std::string& missionId, const std::string& reason);
    bool RestartFromCheckpoint(const std::string& missionId);

    MissionState GetState(const std::string& missionId) const;
    bool IsObjectiveDone(const std::string& missionId, const std::string& objectiveId) const;
    std::string GetFailReason(const std::string& missionId) const;
    std::vector<std::string> MissionIds() const;

    // Zustand fuer Spielstaende: "id=state;obj1,obj2;checkpoint1,checkpoint2"
    std::map<std::string, std::string> Serialize() const;
    bool Deserialize(const std::map<std::string, std::string>& data);

private:
    struct Instance {
        MissionDef def;
        MissionState state = MissionState::Locked;
        std::vector<std::string> done;
        std::vector<std::string> checkpointDone;
        std::string failReason;
    };
    bool CheckSuccess(Instance& inst);
    std::map<std::string, Instance> missions_;
};

}  // namespace lux98
