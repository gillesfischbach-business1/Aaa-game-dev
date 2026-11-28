// LUX98 – Wirtschaft in Luxemburger Franken (LUF).
// Betraege werden als ganze Franken (int64) gefuehrt: keine Rundungsfehler, keine Gleitkommazahlen.
#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "LuxCore/Calendar1998.h"

namespace lux98 {

using Francs = std::int64_t;

// "12 345 LUF" (Leerzeichen als Tausendertrennzeichen)
std::string FormatLuf(Francs amount);

enum class TransactionKind { Purchase, Salary, Bill, Sale, Transfer, LoanPayout, LoanRepayment };

struct Transaction {
    Date date;
    TransactionKind kind;
    Francs amount;        // positiv = Eingang, negativ = Ausgang
    std::string memo;
};

class Wallet {
public:
    Wallet(Francs cash = 0, Francs bank = 0) : cash_(cash), bank_(bank) {}

    Francs Cash() const { return cash_; }
    Francs Bank() const { return bank_; }

    // Bargeldzahlung; schlaegt fehl, wenn nicht genug Bargeld da ist (kein Minus im Portemonnaie).
    bool PayCash(Francs amount, const Date& d, const std::string& memo);
    // Ueberweisung/Abbuchung vom Konto; Dispo ist erlaubt bis overdraftLimit.
    bool PayFromBank(Francs amount, const Date& d, const std::string& memo, TransactionKind kind = TransactionKind::Bill);
    void ReceiveSalary(Francs amount, const Date& d, const std::string& memo);
    void ReceiveCash(Francs amount, const Date& d, const std::string& memo);
    bool Withdraw(Francs amount, const Date& d);  // Geldautomat
    bool Deposit(Francs amount, const Date& d);

    void SetOverdraftLimit(Francs limit) { overdraftLimit_ = limit < 0 ? 0 : limit; }
    const std::vector<Transaction>& History() const { return history_; }

private:
    Francs cash_ = 0;
    Francs bank_ = 0;
    Francs overdraftLimit_ = 0;
    std::vector<Transaction> history_;
};

}  // namespace lux98
