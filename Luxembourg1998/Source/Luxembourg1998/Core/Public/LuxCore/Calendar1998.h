// LUX98 – Engine-unabhaengiger Kern: Kalender und Spieluhr.
// Reines C++17 ohne Unreal-Abhaengigkeiten, damit es ausserhalb der Engine testbar ist.
#pragma once

#include <cstdint>
#include <string>

namespace lux98 {

struct Date {
    int year = 1998;
    int month = 1;  // 1..12
    int day = 1;    // 1..31

    bool operator==(const Date& o) const { return year == o.year && month == o.month && day == o.day; }
    bool operator<(const Date& o) const;
    bool operator<=(const Date& o) const { return *this < o || *this == o; }
    std::string ToIso() const;  // "1998-06-23"
    static bool FromIso(const std::string& s, Date& out);
};

enum class Weekday { Monday = 0, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday };

bool IsLeapYear(int year);
int DaysInMonth(int year, int month);
bool IsValid(const Date& d);
int DayOfYear(const Date& d);                 // 1..366
Weekday DayOfWeek(const Date& d);
Date AddDays(const Date& d, int days);
Date LastSundayOf(int year, int month);

// Mitteleuropaeische Sommerzeit nach EU-Regel (gilt 1998):
// letzter Sonntag im Maerz 02:00 MEZ bis letzter Sonntag im Oktober 03:00 MESZ.
// localStandardHour = Stunde in MEZ (UTC+1), 0..23.
bool IsSummerTime(const Date& d, int localStandardHour);

// Spieluhr. Standard: 12 reale Minuten = 1 Spielstunde -> Faktor 5.
class GameClock {
public:
    static constexpr double kDefaultTimeScale = 5.0;

    explicit GameClock(Date start = {1998, 1, 1}, double startHourLocal = 8.0);

    void Advance(double realSeconds);
    void SetTimeScale(double scale);           // 0 = Zeit angehalten (z. B. Zwischensequenz)
    double GetTimeScale() const { return timeScale_; }

    // Kontrolliertes Setzen fuer Missionen/Intro.
    void SetDateTime(const Date& d, double hourLocal);
    // Direkt in Normalzeit (MEZ) setzen, z. B. beim Laden eines Spielstands (eindeutig, auch am 25.10.)
    void SetStandardDateTime(const Date& d, double stdHour);

    // Wanduhrzeit (inkl. Sommerzeit), so wie sie auf jeder Uhr in der Stadt steht.
    Date GetDate() const;
    double GetHourLocal() const;
    int GetHour() const { return static_cast<int>(GetHourLocal()); }
    int GetMinute() const { return static_cast<int>(GetHourLocal() * 60.0) % 60; }
    bool IsSummerTimeNow() const;
    // Intern: Normalzeit MEZ (UTC+1). Stetig, ohne Spruenge – Grundlage fuer Sonne und Simulation.
    Date GetStandardDate() const { return stdDate_; }
    double GetStandardHour() const { return stdSeconds_ / 3600.0; }
    std::string ToString() const;               // "Do 01.01.1998 08:00"

private:
    Date stdDate_;
    double stdSeconds_ = 0.0;  // Sekunden seit Mitternacht in MEZ
    double timeScale_ = kDefaultTimeScale;
};

}  // namespace lux98
