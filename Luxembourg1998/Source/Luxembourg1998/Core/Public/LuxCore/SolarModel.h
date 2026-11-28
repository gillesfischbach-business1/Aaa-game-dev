// LUX98 – Sonnenstand fuer Luxemburg-Stadt (NOAA-Naeherungsformeln).
// Liefert Sonnenauf-/untergang und Sonnenhoehe fuer das Tageslicht-System.
#pragma once

#include "LuxCore/Calendar1998.h"

namespace lux98 {

struct GeoPosition {
    double latitudeDeg = 49.6116;   // Luxemburg-Stadt, Bereich Place d'Armes (gerundet)
    double longitudeDeg = 6.1300;
};

struct SunTimes {
    bool valid = false;           // false bei Polartag/-nacht (kommt in Luxemburg nicht vor)
    double sunriseStdHour = 0.0;  // MEZ (UTC+1), Dezimalstunden
    double sunsetStdHour = 0.0;
};

SunTimes ComputeSunTimes(const Date& d, const GeoPosition& pos = {});

// Sonnenhoehe ueber dem Horizont in Grad und Azimut (0 = Nord, 90 = Ost), Zeit in MEZ.
void ComputeSunPosition(const Date& d, double stdHour, const GeoPosition& pos,
                        double& elevationDeg, double& azimuthDeg);

}  // namespace lux98
