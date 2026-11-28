// LUX98 – Tests fuer den engine-unabhaengigen Kern (laufen ohne Unreal, z. B. in CI unter Linux).
#include <cmath>
#include <cstdio>
#include <filesystem>
#include <fstream>
#include <functional>
#include <string>
#include <vector>

#include "LuxCore/Calendar1998.h"
#include "LuxCore/Communication.h"
#include "LuxCore/Economy.h"
#include "LuxCore/HistoricalRules.h"
#include "LuxCore/MissionSystem.h"
#include "LuxCore/SaveFormat.h"
#include "LuxCore/SolarModel.h"

using namespace lux98;

static int g_failures = 0;
static int g_checks = 0;
#define CHECK(cond)                                                                 \
    do {                                                                            \
        ++g_checks;                                                                 \
        if (!(cond)) { ++g_failures; std::printf("  FEHLER %s:%d  %s\n", __FILE__, __LINE__, #cond); } \
    } while (0)
#define CHECK_NEAR(a, b, tol) CHECK(std::fabs((a) - (b)) <= (tol))

static void TestCalendar() {
    CHECK(DayOfWeek({1998, 1, 1}) == Weekday::Thursday);
    CHECK(DayOfWeek({1998, 6, 23}) == Weekday::Tuesday);   // Nationalfeiertag 1998
    CHECK(DayOfWeek({1998, 12, 31}) == Weekday::Thursday);
    CHECK(!IsLeapYear(1998));
    CHECK(DayOfYear({1998, 12, 31}) == 365);
    CHECK(LastSundayOf(1998, 3) == (Date{1998, 3, 29}));  // Beginn Sommerzeit 1998
    CHECK(LastSundayOf(1998, 10) == (Date{1998, 10, 25})); // Ende Sommerzeit 1998
    CHECK(AddDays({1998, 12, 31}, 1) == (Date{1999, 1, 1}));
    CHECK(AddDays({1998, 3, 1}, -1) == (Date{1998, 2, 28}));
    Date d;
    CHECK(Date::FromIso("1998-08-21", d) && d == (Date{1998, 8, 21}));
    CHECK(!Date::FromIso("1998-02-30", d));
    CHECK(!IsSummerTime({1998, 3, 29}, 1));
    CHECK(IsSummerTime({1998, 3, 29}, 2));
    CHECK(IsSummerTime({1998, 7, 1}, 12));
    CHECK(IsSummerTime({1998, 10, 25}, 1));
    CHECK(!IsSummerTime({1998, 10, 25}, 2));
}

static void TestGameClock() {
    GameClock c({1998, 1, 1}, 8.0);
    CHECK(c.ToString() == "Do 01.01.1998 08:00");
    c.Advance(12 * 60);  // 12 reale Minuten = 1 Spielstunde
    CHECK(c.GetHour() == 9 && c.GetMinute() == 0);
    c.Advance(15 * 12 * 60);  // 15 Stunden -> 00:00 am Folgetag
    CHECK(c.GetDate() == (Date{1998, 1, 2}) && c.GetHour() == 0);

    GameClock dst({1998, 3, 29}, 1.5);   // 01:30 MEZ
    dst.Advance(12 * 60);                 // eine Spielstunde
    CHECK(dst.GetHour() == 3 && dst.GetMinute() == 30);  // Uhr springt 02:00 -> 03:00
    CHECK(dst.IsSummerTimeNow());

    GameClock late({1998, 7, 10}, 23.5);  // 23:30 MESZ
    CHECK(late.GetDate() == (Date{1998, 7, 10}) && late.GetHour() == 23);
    late.Advance(12 * 60);
    CHECK(late.GetDate() == (Date{1998, 7, 11}) && late.GetHour() == 0);

    c.SetTimeScale(0.0);
    const double h = c.GetHourLocal();
    c.Advance(1000);
    CHECK(c.GetHourLocal() == h);
}

static void TestSun() {
    // Referenzwerte Luxemburg (gerundet, Toleranz 10 min): 21.06. Aufgang ~05:28 MESZ, Untergang ~21:52 MESZ
    SunTimes s = ComputeSunTimes({1998, 6, 21});
    CHECK(s.valid);
    CHECK_NEAR(s.sunriseStdHour + 1.0, 5.0 + 28.0 / 60, 10.0 / 60);
    CHECK_NEAR(s.sunsetStdHour + 1.0, 21.0 + 52.0 / 60, 10.0 / 60);
    // 21.12.: Aufgang ~08:29 MEZ, Untergang ~16:37 MEZ
    SunTimes w = ComputeSunTimes({1998, 12, 21});
    CHECK_NEAR(w.sunriseStdHour, 8.0 + 29.0 / 60, 10.0 / 60);
    CHECK_NEAR(w.sunsetStdHour, 16.0 + 37.0 / 60, 10.0 / 60);
    double el = 0, az = 0;
    ComputeSunPosition({1998, 6, 21}, 12.0 + 40.0 / 60, {}, el, az);  // etwa Sonnenhoechststand
    CHECK_NEAR(el, 90.0 - 49.61 + 23.44, 1.0);
    CHECK_NEAR(az, 180.0, 5.0);
    ComputeSunPosition({1998, 1, 15}, 2.0, {}, el, az);
    CHECK(el < 0);  // nachts unter dem Horizont
}

static void TestEconomy() {
    CHECK(FormatLuf(0) == "0 LUF");
    CHECK(FormatLuf(1250) == "1 250 LUF");
    CHECK(FormatLuf(-1234567) == "-1 234 567 LUF");
    Wallet w(2000, 10000);
    const Date d{1998, 1, 2};
    CHECK(w.PayCash(500, d, "Kaffi"));
    CHECK(!w.PayCash(5000, d, "zu teuer"));
    CHECK(w.Cash() == 1500);
    CHECK(!w.PayFromBank(20000, d, "Miete"));
    w.SetOverdraftLimit(15000);
    CHECK(w.PayFromBank(20000, d, "Miete"));
    CHECK(w.Bank() == -10000);
    CHECK(!w.Withdraw(6000, d));  // ueber Dispo
    CHECK(w.Deposit(1000, d) && w.Cash() == 500 && w.Bank() == -9000);
    CHECK(!w.PayCash(-5, d, "negativ"));
    CHECK(w.History().size() == 3);
}

static MissionDef MakeM05() {
    MissionDef m;
    m.id = "M05_DEI_VERLUER_DISKETT";
    m.prerequisites = {"M01_ZERECK_AN_DSTAD"};
    m.objectives = {
        {"talk_technician", "", false, true},
        {"find_via_forum", "find_disk", false, false},      // Weg A: Internetcafe-Forum
        {"find_via_phonebook", "find_disk", false, false},  // Weg B: Telefonbuch + Anruf
        {"return_disk", "", false, false},
        {"bonus_photo", "", true, false},
    };
    m.failConditions = {"disk_destroyed"};
    return m;
}

static void TestMissions() {
    MissionTracker t;
    MissionDef m01;
    m01.id = "M01_ZERECK_AN_DSTAD";
    m01.objectives = {{"arrive_station"}, {"get_key"}, {"visit_friend"}};
    CHECK(t.Register(m01));
    CHECK(t.Register(MakeM05()));
    std::string err;
    CHECK(!t.Register(MakeM05(), &err) && !err.empty());  // doppelte ID
    MissionDef bad;
    bad.id = "BAD";
    bad.objectives = {{"x", "", true}};
    CHECK(!t.Register(bad));  // nur optionale Ziele

    t.Refresh({1998, 1, 1});
    CHECK(t.GetState("M01_ZERECK_AN_DSTAD") == MissionState::Available);
    CHECK(t.GetState("M05_DEI_VERLUER_DISKETT") == MissionState::Locked);
    CHECK(t.Start("M01_ZERECK_AN_DSTAD"));
    for (auto o : {"arrive_station", "get_key", "visit_friend"}) CHECK(t.CompleteObjective("M01_ZERECK_AN_DSTAD", o));
    CHECK(t.GetState("M01_ZERECK_AN_DSTAD") == MissionState::Succeeded);

    t.Refresh({1998, 1, 2});
    CHECK(t.Start("M05_DEI_VERLUER_DISKETT"));
    CHECK(t.CompleteObjective("M05_DEI_VERLUER_DISKETT", "talk_technician"));  // Checkpoint
    CHECK(t.CompleteObjective("M05_DEI_VERLUER_DISKETT", "find_via_phonebook"));
    CHECK(!t.Fail("M05_DEI_VERLUER_DISKETT", "unbekannter_grund"));
    CHECK(t.Fail("M05_DEI_VERLUER_DISKETT", "disk_destroyed"));
    CHECK(t.RestartFromCheckpoint("M05_DEI_VERLUER_DISKETT"));
    CHECK(t.IsObjectiveDone("M05_DEI_VERLUER_DISKETT", "talk_technician"));
    CHECK(!t.IsObjectiveDone("M05_DEI_VERLUER_DISKETT", "find_via_phonebook"));
    CHECK(t.CompleteObjective("M05_DEI_VERLUER_DISKETT", "find_via_forum"));  // anderer Weg
    CHECK(t.GetState("M05_DEI_VERLUER_DISKETT") == MissionState::Active);
    CHECK(t.CompleteObjective("M05_DEI_VERLUER_DISKETT", "return_disk"));
    CHECK(t.GetState("M05_DEI_VERLUER_DISKETT") == MissionState::Succeeded);  // Bonus nicht noetig

    // Zeitfenster (z. B. Schueberfouer); die Daten selbst stehen in den Missionsdaten, nicht hier.
    MissionTracker f;
    MissionDef fouer;
    fouer.id = "M04_UM_GLACIS";
    fouer.availableFrom = Date{1998, 8, 20};
    fouer.availableUntil = Date{1998, 9, 10};
    fouer.objectives = {{"meet"}};
    CHECK(f.Register(fouer));
    f.Refresh({1998, 8, 1});
    CHECK(f.GetState("M04_UM_GLACIS") == MissionState::Locked);
    f.Refresh({1998, 8, 25});
    CHECK(f.GetState("M04_UM_GLACIS") == MissionState::Available);

    // Spielstand-Rundreise
    auto data = t.Serialize();
    MissionTracker t2;
    t2.Register(m01);
    t2.Register(MakeM05());
    CHECK(t2.Deserialize(data));
    CHECK(t2.GetState("M05_DEI_VERLUER_DISKETT") == MissionState::Succeeded);
    CHECK(t2.IsObjectiveDone("M05_DEI_VERLUER_DISKETT", "find_via_forum"));
}

static void TestCommunication() {
    PhoneBook book;
    CHECK(book.Add({"48 12 34", "Garage Weber (fiktiv)", "Rue fictive 1", "Hollerich", true}));
    CHECK(book.Add({"22-33-44", "Marie Schmit (fiktiv)", "Rue fictive 2", "Bonnevoie-Sud"}));
    CHECK(!book.Add({"481234", "Duplikat", "", ""}));
    CHECK(book.FindByNumber("48.12.34").has_value());
    CHECK(book.SearchByName("garage").size() == 1);

    PhoneNetwork net(book);
    net.SetAnswerRule("481234", [](const Date& d, int hour) {
        return DayOfWeek(d) != Weekday::Sunday && hour >= 8 && hour < 18;  // Werkstattzeiten (fiktiv)
    });
    CHECK(net.Dial("481234", {1998, 1, 5}, 10) == CallResult::Connected);
    CHECK(net.Dial("481234", {1998, 1, 4}, 10) == CallResult::NoAnswer);  // Sonntag
    CHECK(net.Dial("999999", {1998, 1, 5}, 10) == CallResult::InvalidNumber);
    net.SetBusy("223344", true);
    CHECK(net.Dial("223344", {1998, 1, 5}, 10) == CallResult::Busy);

    net.LeaveMessage("223344", {{1998, 1, 5}, 9, 15, "481234", "Moien, hei ass d'Garage ...", "DLG_GARAGE_001"});
    CHECK(net.UnheardMessages("223344").size() == 1);
    net.MarkAllHeard("223344");
    CHECK(net.UnheardMessages("223344").empty());

    PayphoneSession p({5, 60.0, 10});  // Testtarif, keine historische Angabe
    CHECK(!p.InsertCoins(5));          // unter Mindesteinwurf
    CHECK(p.InsertCoins(20));
    CHECK(p.Tick(30));                 // erste Einheit
    CHECK(p.Credit() == 15);
    CHECK(p.Tick(120));                // zwei weitere Einheiten
    CHECK(p.Credit() == 5);
    CHECK(p.Tick(60));                 // letzte bezahlbare Einheit
    CHECK(p.Credit() == 0);
    CHECK(!p.Tick(60));                // kein Guthaben mehr -> Verbindung bricht ab
    CHECK(p.Hangup() == 0);
}

static void TestSaves() {
    SaveData d{{"player.money.cash", "12500"}, {"clock.date", "1998-08-21"}, {"note", "Linn 1\nLinn 2 = x\\y"}};
    const std::string text = SerializeSave(d);
    SaveError e;
    auto parsed = ParseSave(text, &e);
    CHECK(parsed && *parsed == d && e == SaveError::None);

    std::string corrupt = text;
    corrupt[text.find("12500")] = '9';
    CHECK(!ParseSave(corrupt, &e) && e == SaveError::BadChecksum);
    CHECK(!ParseSave("irgendwas", &e) && e == SaveError::BadHeader);
    SaveData empty;
    std::string future = SerializeSave(empty, 99);
    CHECK(!ParseSave(future, &e) && e == SaveError::NewerVersion);

    const auto dir = std::filesystem::temp_directory_path() / "lux98_save_test";
    std::filesystem::create_directories(dir);
    const std::string path = (dir / "slot1.sav").string();
    std::filesystem::remove(path);
    std::filesystem::remove(path + ".bak");
    CHECK(WriteSaveFile(path, d));
    SaveData d2 = d;
    d2["player.money.cash"] = "100";
    CHECK(WriteSaveFile(path, d2));
    { std::ofstream(path, std::ios::trunc) << "LUX98SAVE\nversion=1\nkaputt"; }  // Datei beschaedigt
    bool usedBackup = false;
    auto loaded = ReadSaveFile(path, &usedBackup);
    CHECK(loaded && usedBackup && loaded->at("player.money.cash") == "12500");
    std::filesystem::remove_all(dir);
}

static void TestHistorical() {
    HistoricalMeta win98{"TECH_WINDOWS98_PC", Date{1998, 6, 25}, std::nullopt, Accuracy::A, "SRC_TECH_001"};
    CHECK(!IsAllowedOn(win98, {1998, 3, 1}));
    CHECK(IsAllowedOn(win98, {1998, 7, 1}));
    CHECK(CheckAsset(win98, {1998, 3, 1}).size() == 1);

    HistoricalMeta tram{"TRANSPORT_TRAM_KIRCHBERG", Date{2017, 12, 10}, std::nullopt, Accuracy::A, "SRC_TRAM_001"};
    CHECK(!IsAllowedOn(tram, {1998, 12, 31}));

    HistoricalMeta noSource{"X", Date{1990, 1, 1}, std::nullopt, Accuracy::B, ""};
    auto issues = CheckAsset(noSource, {1998, 1, 1});
    CHECK(issues.size() == 1 && issues[0].kind == IssueKind::MissingSource);

    HistoricalMeta fiction{"SHOP_INTERNETCAFE_FICTIVE_01", std::nullopt, std::nullopt, Accuracy::D, ""};
    CHECK(CheckAsset(fiction, {1998, 1, 1}).empty());
    HistoricalMeta unknown{"Y"};
    CHECK(CheckAsset(unknown, {1998, 1, 1}).size() == 2);
}

int main() {
    const std::vector<std::pair<const char*, std::function<void()>>> suites = {
        {"Kalender", TestCalendar}, {"Spieluhr", TestGameClock},        {"Sonne", TestSun},
        {"Wirtschaft", TestEconomy}, {"Missionen", TestMissions},       {"Kommunikation", TestCommunication},
        {"Spielstaende", TestSaves}, {"Historische Regeln", TestHistorical},
    };
    for (const auto& [name, fn] : suites) {
        const int before = g_failures;
        fn();
        std::printf("[%s] %s\n", g_failures == before ? " OK " : "FAIL", name);
    }
    std::printf("%d Pruefungen, %d Fehler\n", g_checks, g_failures);
    return g_failures == 0 ? 0 : 1;
}
