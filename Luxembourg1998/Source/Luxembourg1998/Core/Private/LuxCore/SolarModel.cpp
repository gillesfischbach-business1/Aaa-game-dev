#include "LuxCore/SolarModel.h"

#include <cmath>

namespace lux98 {
namespace {
constexpr double kPi = 3.14159265358979323846;
double Rad(double d) { return d * kPi / 180.0; }
double Deg(double r) { return r * 180.0 / kPi; }

// Sonnendeklination (rad) und Zeitgleichung (Minuten), NOAA "General Solar Position".
void SolarParams(const Date& d, double hourUtc, double& decl, double& eqTimeMin) {
    const double daysInYear = IsLeapYear(d.year) ? 366.0 : 365.0;
    const double g = 2.0 * kPi / daysInYear * (DayOfYear(d) - 1 + (hourUtc - 12.0) / 24.0);
    eqTimeMin = 229.18 * (0.000075 + 0.001868 * std::cos(g) - 0.032077 * std::sin(g) -
                          0.014615 * std::cos(2 * g) - 0.040849 * std::sin(2 * g));
    decl = 0.006918 - 0.399912 * std::cos(g) + 0.070257 * std::sin(g) - 0.006758 * std::cos(2 * g) +
           0.000907 * std::sin(2 * g) - 0.002697 * std::cos(3 * g) + 0.00148 * std::sin(3 * g);
}
}  // namespace

SunTimes ComputeSunTimes(const Date& d, const GeoPosition& pos) {
    SunTimes out;
    double decl = 0, eqt = 0;
    SolarParams(d, 12.0, decl, eqt);
    const double lat = Rad(pos.latitudeDeg);
    // 90.833 Grad: Refraktion + Sonnenradius
    const double cosHa = std::cos(Rad(90.833)) / (std::cos(lat) * std::cos(decl)) - std::tan(lat) * std::tan(decl);
    if (cosHa < -1.0 || cosHa > 1.0) return out;
    const double ha = Deg(std::acos(cosHa));
    const double noonUtcMin = 720.0 - 4.0 * pos.longitudeDeg - eqt;
    out.sunriseStdHour = (noonUtcMin - 4.0 * ha) / 60.0 + 1.0;
    out.sunsetStdHour = (noonUtcMin + 4.0 * ha) / 60.0 + 1.0;
    out.valid = true;
    return out;
}

void ComputeSunPosition(const Date& d, double stdHour, const GeoPosition& pos, double& elevationDeg,
                        double& azimuthDeg) {
    const double hourUtc = stdHour - 1.0;
    double decl = 0, eqt = 0;
    SolarParams(d, hourUtc, decl, eqt);
    const double trueSolarMin = hourUtc * 60.0 + eqt + 4.0 * pos.longitudeDeg;
    const double ha = Rad(trueSolarMin / 4.0 - 180.0);
    const double lat = Rad(pos.latitudeDeg);
    double cosZen = std::sin(lat) * std::sin(decl) + std::cos(lat) * std::cos(decl) * std::cos(ha);
    cosZen = std::fmax(-1.0, std::fmin(1.0, cosZen));
    const double zen = std::acos(cosZen);
    elevationDeg = 90.0 - Deg(zen);
    double az = std::atan2(std::sin(ha), std::cos(ha) * std::sin(lat) - std::tan(decl) * std::cos(lat));
    azimuthDeg = std::fmod(Deg(az) + 180.0 + 360.0, 360.0);
}

}  // namespace lux98
