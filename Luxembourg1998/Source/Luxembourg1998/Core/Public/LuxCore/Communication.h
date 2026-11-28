// LUX98 – Analoges Kommunikationssystem: Telefonbuch, Telefonnetz, Anrufbeantworter, Telefonzelle.
// Alle Eintraege im Telefonbuch sind fiktiv (Genauigkeitskategorie D).
#pragma once

#include <functional>
#include <map>
#include <optional>
#include <string>
#include <vector>

#include "LuxCore/Calendar1998.h"
#include "LuxCore/Economy.h"

namespace lux98 {

// Rufnummern werden normalisiert: nur Ziffern (Leerzeichen, Bindestriche, Punkte entfernt).
std::string NormalizeNumber(const std::string& raw);

struct PhoneBookEntry {
    std::string number;     // normalisiert
    std::string name;
    std::string address;
    std::string district;   // einer der 24 Stadtteile
    bool isBusiness = false;
};

class PhoneBook {
public:
    bool Add(PhoneBookEntry e);  // false bei doppelter Nummer oder leerem Namen
    std::optional<PhoneBookEntry> FindByNumber(const std::string& number) const;
    std::vector<PhoneBookEntry> SearchByName(const std::string& query) const;  // ohne Gross/Klein
    size_t Size() const { return entries_.size(); }

private:
    std::map<std::string, PhoneBookEntry> entries_;
};

struct AnsweringMachineMessage {
    Date date;
    int hour = 0;
    int minute = 0;
    std::string fromNumber;
    std::string text;           // Untertitel; Audio wird in Unreal per Dialog-ID abgespielt
    std::string dialogueId;
    bool heard = false;
};

enum class CallResult { Connected, NoAnswer, Busy, InvalidNumber };

// Ein Anschluss antwortet abhaengig von Tag und Uhrzeit (Oeffnungszeiten, Tagesablauf der Figur).
using AnswerRule = std::function<bool(const Date&, int hour)>;

class PhoneNetwork {
public:
    explicit PhoneNetwork(const PhoneBook& book) : book_(book) {}

    void SetAnswerRule(const std::string& number, AnswerRule rule);
    void SetBusy(const std::string& number, bool busy);
    CallResult Dial(const std::string& number, const Date& d, int hour) const;

    void LeaveMessage(const std::string& toNumber, AnsweringMachineMessage msg);
    std::vector<AnsweringMachineMessage> UnheardMessages(const std::string& number) const;
    void MarkAllHeard(const std::string& number);

private:
    const PhoneBook& book_;
    std::map<std::string, AnswerRule> rules_;
    std::map<std::string, bool> busy_;
    std::map<std::string, std::vector<AnsweringMachineMessage>> machines_;
};

// Telefonzelle: Muenzen einwerfen, Gespraechseinheiten werden abgezogen.
// Tarife sind Daten (Data/Economy/prices_1998.csv), nicht im Code festgelegt.
struct PayphoneTariff {
    Francs pricePerUnit = 0;
    double secondsPerUnitLocal = 0;  // Ortsgespraech
    Francs minimumInsert = 0;
};

class PayphoneSession {
public:
    explicit PayphoneSession(PayphoneTariff t) : tariff_(t) {}
    bool InsertCoins(Francs amount);                // false unter Mindesteinwurf
    // Gespraech laeuft; gibt false zurueck, sobald das Guthaben verbraucht ist (Verbindung bricht ab).
    bool Tick(double gameSeconds);
    Francs Credit() const { return credit_; }
    Francs Hangup();                                // Restguthaben (volle Einheiten) zurueck

private:
    PayphoneTariff tariff_;
    Francs credit_ = 0;
    double secondsIntoUnit_ = 0;
    bool unitCharged_ = false;
};

}  // namespace lux98
