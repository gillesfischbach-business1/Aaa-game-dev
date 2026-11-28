#include "LuxCore/Calendar1998.h"

#include <cmath>
#include <cstdio>

namespace lux98 {

bool Date::operator<(const Date& o) const {
    if (year != o.year) return year < o.year;
    if (month != o.month) return month < o.month;
    return day < o.day;
}

std::string Date::ToIso() const {
    char buf[16];
    std::snprintf(buf, sizeof(buf), "%04d-%02d-%02d", year, month, day);
    return buf;
}

bool Date::FromIso(const std::string& s, Date& out) {
    Date d;
    if (std::sscanf(s.c_str(), "%4d-%2d-%2d", &d.year, &d.month, &d.day) != 3) return false;
    if (!IsValid(d)) return false;
    out = d;
    return true;
}

bool IsLeapYear(int y) { return (y % 4 == 0 && y % 100 != 0) || y % 400 == 0; }

int DaysInMonth(int y, int m) {
    static const int kDays[12] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    if (m < 1 || m > 12) return 0;
    return (m == 2 && IsLeapYear(y)) ? 29 : kDays[m - 1];
}

bool IsValid(const Date& d) {
    return d.month >= 1 && d.month <= 12 && d.day >= 1 && d.day <= DaysInMonth(d.year, d.month);
}

int DayOfYear(const Date& d) {
    int n = d.day;
    for (int m = 1; m < d.month; ++m) n += DaysInMonth(d.year, m);
    return n;
}

Weekday DayOfWeek(const Date& d) {
    // Sakamoto-Algorithmus: 0 = Sonntag
    static const int t[12] = {0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4};
    int y = d.year - (d.month < 3 ? 1 : 0);
    int w = (y + y / 4 - y / 100 + y / 400 + t[d.month - 1] + d.day) % 7;
    return static_cast<Weekday>((w + 6) % 7);  // auf Montag = 0 umrechnen
}

Date AddDays(const Date& d, int days) {
    Date r = d;
    while (days > 0) {
        if (++r.day > DaysInMonth(r.year, r.month)) {
            r.day = 1;
            if (++r.month > 12) { r.month = 1; ++r.year; }
        }
        --days;
    }
    while (days < 0) {
        if (--r.day < 1) {
            if (--r.month < 1) { r.month = 12; --r.year; }
            r.day = DaysInMonth(r.year, r.month);
        }
        ++days;
    }
    return r;
}

Date LastSundayOf(int year, int month) {
    Date d{year, month, DaysInMonth(year, month)};
    while (DayOfWeek(d) != Weekday::Sunday) --d.day;
    return d;
}

bool IsSummerTime(const Date& d, int localStandardHour) {
    const Date start = LastSundayOf(d.year, 3);
    const Date end = LastSundayOf(d.year, 10);
    if (d < start || end < d) return false;
    if (d == start) return localStandardHour >= 2;
    if (d == end) return localStandardHour < 2;  // 03:00 MESZ = 02:00 MEZ
    return true;
}

GameClock::GameClock(Date start, double startHourLocal) { SetDateTime(start, startHourLocal); }

void GameClock::SetTimeScale(double scale) { timeScale_ = scale < 0.0 ? 0.0 : scale; }

void GameClock::SetDateTime(const Date& d, double hourLocal) {
    stdDate_ = IsValid(d) ? d : Date{};
    double h = std::fmod(hourLocal, 24.0);
    if (h < 0) h += 24.0;
    // Wanduhrzeit -> Normalzeit
    if (IsSummerTime(stdDate_, static_cast<int>(h) - 1 < 0 ? 0 : static_cast<int>(h) - 1)) h -= 1.0;
    if (h < 0) { h += 24.0; stdDate_ = AddDays(stdDate_, -1); }
    stdSeconds_ = h * 3600.0;
}

void GameClock::SetStandardDateTime(const Date& d, double stdHour) {
    stdDate_ = IsValid(d) ? d : Date{};
    double h = std::isfinite(stdHour) ? std::fmod(stdHour, 24.0) : 0.0;
    if (h < 0) h += 24.0;
    stdSeconds_ = h * 3600.0;
}

void GameClock::Advance(double realSeconds) {
    if (realSeconds <= 0.0) return;
    stdSeconds_ += realSeconds * timeScale_;
    while (stdSeconds_ >= 86400.0) {
        stdSeconds_ -= 86400.0;
        stdDate_ = AddDays(stdDate_, 1);
    }
}

bool GameClock::IsSummerTimeNow() const {
    return IsSummerTime(stdDate_, static_cast<int>(stdSeconds_ / 3600.0));
}

Date GameClock::GetDate() const {
    if (IsSummerTimeNow() && stdSeconds_ >= 23.0 * 3600.0) return AddDays(stdDate_, 1);
    return stdDate_;
}

double GameClock::GetHourLocal() const {
    double h = stdSeconds_ / 3600.0 + (IsSummerTimeNow() ? 1.0 : 0.0);
    return h >= 24.0 ? h - 24.0 : h;
}

std::string GameClock::ToString() const {
    static const char* kDays[7] = {"Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"};
    char buf[40];
    std::snprintf(buf, sizeof(buf), "%s %02d.%02d.%04d %02d:%02d",
                  kDays[static_cast<int>(DayOfWeek(GetDate()))], GetDate().day, GetDate().month, GetDate().year,
                  GetHour(), GetMinute());
    return buf;
}

}  // namespace lux98
