#include "LuxCore/Economy.h"

namespace lux98 {

std::string FormatLuf(Francs amount) {
    const bool neg = amount < 0;
    std::string digits = std::to_string(neg ? -amount : amount);
    std::string out;
    int count = 0;
    for (auto it = digits.rbegin(); it != digits.rend(); ++it) {
        if (count > 0 && count % 3 == 0) out.insert(out.begin(), ' ');
        out.insert(out.begin(), *it);
        ++count;
    }
    return (neg ? "-" : "") + out + " LUF";
}

bool Wallet::PayCash(Francs amount, const Date& d, const std::string& memo) {
    if (amount <= 0 || amount > cash_) return false;
    cash_ -= amount;
    history_.push_back({d, TransactionKind::Purchase, -amount, memo});
    return true;
}

bool Wallet::PayFromBank(Francs amount, const Date& d, const std::string& memo, TransactionKind kind) {
    if (amount <= 0 || bank_ - amount < -overdraftLimit_) return false;
    bank_ -= amount;
    history_.push_back({d, kind, -amount, memo});
    return true;
}

void Wallet::ReceiveSalary(Francs amount, const Date& d, const std::string& memo) {
    if (amount <= 0) return;
    bank_ += amount;
    history_.push_back({d, TransactionKind::Salary, amount, memo});
}

void Wallet::ReceiveCash(Francs amount, const Date& d, const std::string& memo) {
    if (amount <= 0) return;
    cash_ += amount;
    history_.push_back({d, TransactionKind::Sale, amount, memo});
}

bool Wallet::Withdraw(Francs amount, const Date& d) {
    if (amount <= 0 || bank_ - amount < -overdraftLimit_) return false;
    bank_ -= amount;
    cash_ += amount;
    history_.push_back({d, TransactionKind::Transfer, 0, "Geldautomat " + FormatLuf(amount)});
    return true;
}

bool Wallet::Deposit(Francs amount, const Date& d) {
    if (amount <= 0 || amount > cash_) return false;
    cash_ -= amount;
    bank_ += amount;
    history_.push_back({d, TransactionKind::Transfer, 0, "Einzahlung " + FormatLuf(amount)});
    return true;
}

}  // namespace lux98
