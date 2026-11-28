#include "LuxCore/Communication.h"

#include <algorithm>
#include <cctype>

namespace lux98 {

std::string NormalizeNumber(const std::string& raw) {
    std::string out;
    for (char c : raw)
        if (std::isdigit(static_cast<unsigned char>(c))) out.push_back(c);
    return out;
}

bool PhoneBook::Add(PhoneBookEntry e) {
    e.number = NormalizeNumber(e.number);
    if (e.number.empty() || e.name.empty() || entries_.count(e.number)) return false;
    entries_[e.number] = std::move(e);
    return true;
}

std::optional<PhoneBookEntry> PhoneBook::FindByNumber(const std::string& number) const {
    auto it = entries_.find(NormalizeNumber(number));
    if (it == entries_.end()) return std::nullopt;
    return it->second;
}

std::vector<PhoneBookEntry> PhoneBook::SearchByName(const std::string& query) const {
    auto lower = [](std::string s) {
        std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c) { return std::tolower(c); });
        return s;
    };
    const std::string q = lower(query);
    std::vector<PhoneBookEntry> out;
    for (const auto& kv : entries_)
        if (lower(kv.second.name).find(q) != std::string::npos) out.push_back(kv.second);
    std::sort(out.begin(), out.end(), [](const auto& a, const auto& b) { return a.name < b.name; });
    return out;
}

void PhoneNetwork::SetAnswerRule(const std::string& number, AnswerRule rule) {
    rules_[NormalizeNumber(number)] = std::move(rule);
}

void PhoneNetwork::SetBusy(const std::string& number, bool busy) { busy_[NormalizeNumber(number)] = busy; }

CallResult PhoneNetwork::Dial(const std::string& number, const Date& d, int hour) const {
    const std::string n = NormalizeNumber(number);
    if (!book_.FindByNumber(n)) return CallResult::InvalidNumber;
    auto b = busy_.find(n);
    if (b != busy_.end() && b->second) return CallResult::Busy;
    auto r = rules_.find(n);
    if (r != rules_.end() && r->second && !r->second(d, hour)) return CallResult::NoAnswer;
    return CallResult::Connected;
}

void PhoneNetwork::LeaveMessage(const std::string& toNumber, AnsweringMachineMessage msg) {
    msg.fromNumber = NormalizeNumber(msg.fromNumber);
    machines_[NormalizeNumber(toNumber)].push_back(std::move(msg));
}

std::vector<AnsweringMachineMessage> PhoneNetwork::UnheardMessages(const std::string& number) const {
    std::vector<AnsweringMachineMessage> out;
    auto it = machines_.find(NormalizeNumber(number));
    if (it == machines_.end()) return out;
    for (const auto& m : it->second)
        if (!m.heard) out.push_back(m);
    return out;
}

void PhoneNetwork::MarkAllHeard(const std::string& number) {
    auto it = machines_.find(NormalizeNumber(number));
    if (it == machines_.end()) return;
    for (auto& m : it->second) m.heard = true;
}

bool PayphoneSession::InsertCoins(Francs amount) {
    if (amount <= 0) return false;
    if (credit_ + amount < tariff_.minimumInsert) return false;
    credit_ += amount;
    return true;
}

bool PayphoneSession::Tick(double gameSeconds) {
    if (tariff_.secondsPerUnitLocal <= 0 || tariff_.pricePerUnit <= 0) return true;
    if (!unitCharged_) {  // erste Einheit wird bei Verbindung faellig
        if (credit_ < tariff_.pricePerUnit) return false;
        credit_ -= tariff_.pricePerUnit;
        unitCharged_ = true;
    }
    secondsIntoUnit_ += gameSeconds;
    while (secondsIntoUnit_ >= tariff_.secondsPerUnitLocal) {
        secondsIntoUnit_ -= tariff_.secondsPerUnitLocal;
        if (credit_ < tariff_.pricePerUnit) return false;
        credit_ -= tariff_.pricePerUnit;
    }
    return true;
}

Francs PayphoneSession::Hangup() {
    const Francs back = credit_;
    credit_ = 0;
    secondsIntoUnit_ = 0;
    unitCharged_ = false;
    return back;
}

}  // namespace lux98
