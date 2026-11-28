"""Laedt ein Hoehenraster (EU-DEM 25 m) ueber api.opentopodata.org fuer einen Ausschnitt.

Aufruf: python3 -m lux98.fetch_dem LAT_MIN LON_MIN LAT_MAX LON_MAX SCHRITT_M AUSGABE.json
Oeffentlicher Dienst: max. 100 Punkte/Anfrage, 1 Anfrage/s, 1000 Anfragen/Tag.
"""
from __future__ import annotations

import json
import math
import sys
import time
import urllib.request


def main() -> int:
    lat0, lon0, lat1, lon1, step = map(float, sys.argv[1:6])
    out = sys.argv[6]
    dlat = step / 111_200.0
    dlon = step / (111_320.0 * math.cos(math.radians((lat0 + lat1) / 2)))
    rows = int(round((lat1 - lat0) / dlat)) + 1
    cols = int(round((lon1 - lon0) / dlon)) + 1
    pts = [(lat0 + r * dlat, lon0 + c * dlon) for r in range(rows) for c in range(cols)]
    heights: list[float] = []
    for i in range(0, len(pts), 100):
        chunk = pts[i:i + 100]
        locs = "|".join(f"{la:.6f},{lo:.6f}" for la, lo in chunk)
        url = f"https://api.opentopodata.org/v1/eudem25m?locations={locs}"
        for attempt in range(5):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "lux98-dev-tool"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    data = json.load(r)
                heights += [round(float(x["elevation"] or 0.0), 2) for x in data["results"]]
                break
            except Exception as e:  # noqa: BLE001 - Netzwerkfehler wiederholen
                print("Wiederholung", i, e, file=sys.stderr)
                time.sleep(2 + attempt * 2)
        else:
            print("Abbruch", file=sys.stderr)
            return 1
        time.sleep(1.1)
        print(f"{len(heights)}/{len(pts)}", file=sys.stderr)
    json.dump({"source": "EU-DEM v1.1 25 m via opentopodata.org", "lat0": lat0, "lon0": lon0,
               "dlat": dlat, "dlon": dlon, "rows": rows, "cols": cols, "heights": heights}, open(out, "w"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
