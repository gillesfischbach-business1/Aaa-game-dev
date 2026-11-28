"""Erzeugt die Spielwelt-Datei fuer die Browser-Fassung aus OpenStreetMap-Kacheln + Hoehenraster.

Aufruf (aus Scripts/):
  python3 -I -m lux98.bake_web OSM_ORDNER DEM.json AUSGABE.json

Koordinaten: lokale Meter, x = Ost, z = Sued (= -Nord), y = Hoehe ueber NN.
Ursprung = geo.WORLD_ORIGIN_WGS84 (wie im Unreal-Projekt).

WICHTIG: OSM zeigt die HEUTIGE Stadt. Bekannte Nach-1998-Elemente werden herausgefiltert (siehe EXCLUDE_RULES),
alles andere ist "nicht historisch geprueft" und in meta.historical_status vermerkt.
"""
from __future__ import annotations

import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from lux98 import geo

ROAD_WIDTH = {
    "primary": 9.0, "secondary": 8.0, "tertiary": 7.0, "residential": 6.0, "unclassified": 6.0,
    "living_street": 5.0, "service": 4.0, "pedestrian": 6.0, "footway": 2.5, "path": 2.0,
    "steps": 2.5, "cycleway": 2.5, "track": 3.0, "primary_link": 6.0, "secondary_link": 6.0,
}
ROAD_CODE = {k: i for i, k in enumerate(ROAD_WIDTH)}
DRIVABLE = {"primary", "secondary", "tertiary", "residential", "unclassified", "living_street", "service",
            "primary_link", "secondary_link"}
GREEN = {("landuse", "grass"): 0, ("leisure", "park"): 1, ("natural", "wood"): 2, ("landuse", "forest"): 2,
         ("natural", "scrub"): 3, ("leisure", "garden"): 1, ("landuse", "village_green"): 0,
         ("natural", "heath"): 3, ("landuse", "allotments"): 1, ("landuse", "flowerbed"): 1}
WALLS = {("barrier", "city_wall"), ("historic", "citywalls"), ("barrier", "retaining_wall"), ("barrier", "wall")}

# (Beschreibung, Bedingung) – historisch begruendete Ausschluesse
EXCLUDE_RULES = [
    ("Strassenbahn (Luxtram, ab 2017)", lambda t: t.get("railway") in {"tram", "tram_stop", "platform"}
     and ("tram" in t.get("railway", "") or t.get("tram") == "yes")),
    ("Radweg-Passerelle unter dem Pont Adolphe (nach 1998)",
     lambda t: t.get("highway") == "cycleway" and t.get("bridge") in {"yes", "viaduct"}),
    ("Baustellen von heute", lambda t: t.get("landuse") == "construction" or t.get("highway") == "construction"),
    ("Abgerissene Gleise", lambda t: t.get("railway") in {"razed", "abandoned", "disused"}),
]

PLACE_NAMES = {
    "place_darmes": ["Place d'Armes"],
    "pont_adolphe": ["Pont Adolphe"],
    "passerelle": ["Pont Viaduc", "Viaduc"],
    "gare": ["Gare Centrale", "Lëtzebuerg Gare", "Gare de Luxembourg", "Luxembourg"],
    "cathedrale": ["Cathédrale Notre-Dame", "Kathedrale Unserer Lieben Frau"],
    "palais": ["Palais grand-ducal"],
    "place_guillaume": ["Place Guillaume II"],
    "avenue_liberte": ["Avenue de la Liberté"],
    "place_de_paris": ["Place de Paris"],
    "place_de_metz": ["Place de Metz"],
    "rue_abattoir": ["Rue de l'Abattoir"],
    "route_esch": ["Route d'Esch"],
    "rond_point_merl": ["Rond-Point Merl"],
    "rue_bouillon": ["Rue de Bouillon"],
}


class Dem:
    def __init__(self, path: Path):
        d = json.loads(path.read_text())
        self.lat0, self.lon0, self.dlat, self.dlon = d["lat0"], d["lon0"], d["dlat"], d["dlon"]
        self.rows, self.cols, self.h = d["rows"], d["cols"], d["heights"]
        self.source = d["source"]

    def sample(self, lat: float, lon: float) -> float:
        r = min(max((lat - self.lat0) / self.dlat, 0.0), self.rows - 1.001)
        c = min(max((lon - self.lon0) / self.dlon, 0.0), self.cols - 1.001)
        r0, c0 = int(r), int(c)
        fr, fc = r - r0, c - c0
        h = self.h
        i = r0 * self.cols + c0
        top = h[i] * (1 - fc) + h[i + 1] * fc
        bot = h[i + self.cols] * (1 - fc) + h[i + self.cols + 1] * fc
        return top * (1 - fr) + bot * fr


def load_osm(folder: Path):
    nodes: dict[str, tuple[float, float]] = {}
    node_tags: dict[str, dict[str, str]] = {}
    ways: dict[str, tuple[list[str], dict[str, str]]] = {}
    rels: dict[str, tuple[list[tuple[str, str, str]], dict[str, str]]] = {}
    for f in sorted(folder.glob("*.osm")):
        root = ET.parse(f).getroot()
        for n in root.iter("node"):
            nodes[n.get("id")] = (float(n.get("lat")), float(n.get("lon")))
            tags = {t.get("k"): t.get("v") for t in n.iter("tag")}
            if tags:
                node_tags[n.get("id")] = tags
        for w in root.iter("way"):
            ways[w.get("id")] = ([nd.get("ref") for nd in w.iter("nd")], {t.get("k"): t.get("v") for t in w.iter("tag")})
        for r in root.iter("relation"):
            rels[r.get("id")] = ([(m.get("type"), m.get("ref"), m.get("role")) for m in r.iter("member")],
                                 {t.get("k"): t.get("v") for t in r.iter("tag")})
    return nodes, node_tags, ways, rels


def join_rings(segments: list[list[str]]) -> list[list[str]]:
    """Verbindet offene Wege eines Multipolygons zu geschlossenen Ringen."""
    rings, pool = [], [s[:] for s in segments if len(s) >= 2]
    while pool:
        ring = pool.pop(0)
        changed = True
        while ring[0] != ring[-1] and changed:
            changed = False
            for i, s in enumerate(pool):
                if s[0] == ring[-1]:
                    ring += s[1:]
                elif s[-1] == ring[-1]:
                    ring += s[::-1][1:]
                elif s[-1] == ring[0]:
                    ring = s[:-1] + ring
                elif s[0] == ring[0]:
                    ring = s[::-1][:-1] + ring
                else:
                    continue
                pool.pop(i)
                changed = True
                break
        if ring[0] == ring[-1] and len(ring) >= 4:
            rings.append(ring)
    return rings


def building_height(t: dict[str, str]) -> float:
    def num(key: str) -> float | None:
        try:
            return float(t[key].replace("m", "").strip())
        except (KeyError, ValueError):
            return None
    if (h := num("height")) is not None:
        return max(h, 2.5)
    levels = num("building:levels")
    roof = num("roof:levels") or 0.0
    if levels is not None:
        return max(levels, 1) * 3.3 + roof * 1.6 + 1.0
    kind = t.get("building", "yes")
    return {"garage": 3.0, "garages": 3.0, "shed": 3.0, "roof": 4.0, "church": 20.0, "cathedral": 30.0,
            "train_station": 14.0, "kiosk": 3.0, "hut": 3.0}.get(kind, 11.0)


def building_kind(t: dict[str, str]) -> int:
    b = t.get("building", "yes")
    if b in {"church", "cathedral", "chapel"} or t.get("amenity") == "place_of_worship":
        return 1
    if b in {"public", "government", "civic", "palace"} or t.get("historic") in {"castle", "palace"}:
        return 2
    if b in {"train_station", "transportation"}:
        return 3
    if b in {"garage", "garages", "shed", "roof", "kiosk", "hut", "carport"}:
        return 4
    if b in {"commercial", "office", "retail", "hotel"}:
        return 5
    return 0


def _span_bridges(bridge_ways, local, ground_max) -> list[tuple[float, float, float]]:
    """Fasst aneinanderhaengende Brueckenstuecke zusammen und spannt die Fahrbahn gerade zwischen den Widerlagern.

    OSM teilt grosse Bruecken (Pont Adolphe, Viaduc) in mehrere Wege. Wuerde jedes Stueck einzeln dem Gelaende
    folgen, hinge die Fahrbahn ins Tal durch.
    """
    parent = list(range(len(bridge_ways)))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    abutments: list[tuple[float, float, float]] = []
    owner: dict[str, int] = {}
    for i, (refs, _) in enumerate(bridge_ways):
        for n in (refs[0], refs[-1]):
            if n in owner:
                parent[find(i)] = find(owner[n])
            else:
                owner[n] = i
    groups: dict[int, list[int]] = {}
    for i in range(len(bridge_ways)):
        groups.setdefault(find(i), []).append(i)
    for members in groups.values():
        counts: dict[str, int] = {}
        for i in members:
            refs = bridge_ways[i][0]
            for n in (refs[0], refs[-1]):
                counts[n] = counts.get(n, 0) + 1
        ends = [n for n, c in counts.items() if c == 1] or [bridge_ways[members[0]][0][0], bridge_ways[members[0]][0][-1]]
        pts = {n: local(n) for n in ends}
        a, b = max(((x, y) for x in ends for y in ends), key=lambda ab: math.dist(pts[ab[0]][:2], pts[ab[1]][:2]))
        pa = (pts[a][0], pts[a][1], ground_max(pts[a][0], pts[a][1]))
        pb = (pts[b][0], pts[b][1], ground_max(pts[b][0], pts[b][1]))
        abutments.extend([pa, pb])
        dx, dz = pb[0] - pa[0], pb[1] - pa[1]
        length2 = dx * dx + dz * dz or 1.0
        for i in members:
            refs, road = bridge_ways[i]
            ys = []
            for n in refs:
                x, z, _ = local(n)
                f = min(max(((x - pa[0]) * dx + (z - pa[1]) * dz) / length2, 0.0), 1.0)
                ys.append(round(pa[2] + (pb[2] - pa[2]) * f + 0.3, 1))
            road["y"] = ys
    return abutments


def main(argv: list[str]) -> int:
    osm_dir, dem_path, out_path = Path(argv[0]), Path(argv[1]), Path(argv[2])
    dem = Dem(dem_path)
    nodes, node_tags, ways, rels = load_osm(osm_dir)
    e0, n0 = geo.world_origin_luref()
    cache: dict[str, tuple[float, float, float]] = {}

    def local(nid: str) -> tuple[float, float, float]:
        if nid not in cache:
            lat, lon = nodes[nid]
            e, n = geo.wgs84_to_luref(lat, lon)
            cache[nid] = (e - e0, -(n - n0), dem.sample(lat, lon))
        return cache[nid]

    excluded: dict[str, int] = {}

    def is_excluded(t: dict[str, str]) -> bool:
        for desc, rule in EXCLUDE_RULES:
            if rule(t):
                excluded[desc] = excluded.get(desc, 0) + 1
                return True
        return False

    # Spielfeldgrenzen = DEM-Ausschnitt
    corners = [geo.wgs84_to_luref(dem.lat0 + r * dem.dlat * (dem.rows - 1), dem.lon0 + c * dem.dlon * (dem.cols - 1))
               for r in (0, 1) for c in (0, 1)]
    min_x = max(min(e for e, _ in corners[0::2]), min(e for e, _ in corners)) - e0
    max_x = min(max(e for e, _ in corners[1::2]), max(e for e, _ in corners)) - e0
    max_z = -(max(min(n for _, n in corners[:2]), min(n for _, n in corners)) - n0)
    min_z = -(min(max(n for _, n in corners[2:]), max(n for _, n in corners)) - n0)
    min_x, max_x, min_z, max_z = math.ceil(min_x), math.floor(max_x), math.ceil(min_z), math.floor(max_z)

    def inside(x: float, z: float) -> bool:
        return min_x <= x <= max_x and min_z <= z <= max_z

    # Gelaende auf regelmaessigem lokalem Raster (10 m)
    step = 10.0
    cols = int((max_x - min_x) // step) + 1
    rows = int((max_z - min_z) // step) + 1
    heights = []
    for r in range(rows):
        for c in range(cols):
            x, z = min_x + c * step, min_z + r * step
            lat, lon = geo.luref_to_wgs84(x + e0, -z + n0)
            heights.append(round(dem.sample(lat, lon) * 10))  # Dezimeter

    def flat(pts):
        return [round(v, 1) for p in pts for v in (p[0], p[1])]

    buildings, roads, rails, walls, green, water = [], [], [], [], [], []
    bridge_ways: list[tuple[list[str], dict]] = []

    def add_building(ring: list[str], t: dict[str, str]) -> None:
        pts = [local(n) for n in ring[:-1] if n in nodes]
        if len(pts) < 3 or not all(inside(p[0], p[1]) for p in pts):
            return
        base = min(p[2] for p in pts)
        buildings.append({"p": flat(pts), "b": round(base - 0.5, 1), "h": round(building_height(t) + 0.5, 1),
                          "k": building_kind(t)})

    for wid, (refs, t) in ways.items():
        if not t or any(r not in nodes for r in refs) or is_excluded(t):
            continue
        closed = len(refs) >= 4 and refs[0] == refs[-1]
        if "building" in t and closed and t.get("building") != "no":
            add_building(refs, t)
            continue
        if "highway" in t and t["highway"] in ROAD_WIDTH and t.get("tunnel") not in {"yes", "building_passage"} \
                and t.get("area") != "yes":
            pts = [local(n) for n in refs]
            if not any(inside(p[0], p[1]) for p in pts):
                continue
            road = {"p": flat(pts), "w": ROAD_WIDTH[t["highway"]], "t": ROAD_CODE[t["highway"]],
                    "c": 1 if t["highway"] in DRIVABLE else 0}
            if t.get("name"):
                road["n"] = t["name"]
            if t.get("bridge") in {"yes", "viaduct"}:
                bridge_ways.append((refs, road))
            roads.append(road)
            continue
        if t.get("railway") == "rail" and t.get("tunnel") != "yes":
            pts = [local(n) for n in refs]
            if any(inside(p[0], p[1]) for p in pts):
                rails.append({"p": flat(pts), "br": 1 if t.get("bridge") else 0})
            continue
        if any((k, t.get(k)) in WALLS for k in ("barrier", "historic")):
            pts = [local(n) for n in refs]
            if any(inside(p[0], p[1]) for p in pts):
                tall = t.get("barrier") == "city_wall" or t.get("historic") == "citywalls"
                walls.append({"p": flat(pts), "h": 6.0 if tall else 1.6, "k": 1 if tall else 0})
            continue
        gk = next((v for (k, val), v in GREEN.items() if t.get(k) == val), None)
        if gk is not None and closed:
            pts = [local(n) for n in refs[:-1]]
            if any(inside(p[0], p[1]) for p in pts):
                green.append({"p": flat(pts), "t": gk})
            continue
        if (t.get("natural") == "water" or t.get("waterway") in {"canal", "river", "stream"}):
            pts = [local(n) for n in refs]
            if any(inside(p[0], p[1]) for p in pts):
                water.append({"p": flat(pts), "a": 1 if closed and t.get("natural") == "water" else 0})

    def ground_max(x: float, z: float, radius: float = 20.0) -> float:
        best = -1e9
        for dx in (-radius, 0.0, radius):
            for dz in (-radius, 0.0, radius):
                lat, lon = geo.luref_to_wgs84(x + dx + e0, -(z + dz) + n0)
                best = max(best, dem.sample(lat, lon))
        return best

    abutments = _span_bridges(bridge_ways, local, ground_max)
    # Gelaende an den Brueckenkoepfen auf Fahrbahnhoehe bringen (weicher Uebergang bis 45 m)
    for ax, az, ah in abutments:
        for r in range(rows):
            for c in range(cols):
                d = math.hypot(min_x + c * step - ax, min_z + r * step - az)
                if d < 45.0:
                    i = r * cols + c
                    w = 1.0 if d < 15.0 else (45.0 - d) / 30.0
                    target = round(ah * 10)
                    heights[i] = round(heights[i] + (target - heights[i]) * w) if target > heights[i] else heights[i]

    for rid, (members, t) in rels.items():
        if t.get("type") == "multipolygon" and "building" in t and not is_excluded(t):
            outers = [ways[ref][0] for typ, ref, role in members if typ == "way" and role == "outer" and ref in ways]
            for ring in join_rings(outers):
                if all(n in nodes for n in ring):
                    add_building(ring, t)

    # Benannte Orte (Mittelpunkt der Geometrie)
    places = {}
    for key, names in PLACE_NAMES.items():
        for wid, (refs, t) in ways.items():
            if t.get("name") in names and all(r in nodes for r in refs):
                pts = [local(n) for n in refs]
                if key == "gare" and t.get("building") != "train_station" and t.get("railway") != "station":
                    continue
                places[key] = [round(sum(p[0] for p in pts) / len(pts), 1), round(sum(p[2] for p in pts) / len(pts), 1),
                               round(sum(p[1] for p in pts) / len(pts), 1)]
                break
        if key not in places:
            for nid, t in node_tags.items():
                if t.get("name") in names:
                    x, z, y = local(nid)
                    places[key] = [round(x, 1), round(y, 1), round(z, 1)]
                    break

    world = {
        "meta": {
            "sources": ["OpenStreetMap contributors (ODbL 1.0), Stand Download", dem.source],
            "origin_wgs84": geo.WORLD_ORIGIN_WGS84,
            "axes": "x=Ost, z=Sued, y=Hoehe (m ueber NN)",
            "historical_status": "Geometrie von heute, NICHT historisch geprueft; bekannte Nach-1998-Elemente entfernt",
            "excluded": excluded,
            "bounds": [min_x, min_z, max_x, max_z],
        },
        "terrain": {"x0": min_x, "z0": min_z, "step": step, "cols": cols, "rows": rows, "dm": heights},
        "buildings": buildings, "roads": roads, "rails": rails, "walls": walls, "green": green,
        "water": water, "places": places,
    }
    out_path.write_text(json.dumps(world, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(f"Gebaeude {len(buildings)}, Wege {len(roads)}, Gleise {len(rails)}, Mauern {len(walls)}, "
          f"Gruen {len(green)}, Wasser {len(water)}, Orte {sorted(places)}")
    print("ausgeschlossen:", excluded)
    print(f"Feld {max_x - min_x:.0f} x {max_z - min_z:.0f} m, Raster {cols}x{rows}, "
          f"Datei {out_path.stat().st_size / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
