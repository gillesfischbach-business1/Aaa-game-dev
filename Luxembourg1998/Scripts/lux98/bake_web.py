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
import re
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

# Namen von Anlagen, die sicher erst nach 1998 entstanden sind (OSM traegt dort oft kein Baujahr)
POST1998_NAMES = ("Royal-Hamilius", "Royal Hamilius", "Passerelle cyclable", "Cité judiciaire", "Luxtram", "Funiculaire")


def _built_after_1998(t: dict[str, str]) -> bool:
    """OSM-Baujahr (start_date, z. B. "2012" oder "2012-05") nach 1998?"""
    for key in ("start_date", "building:start_date", "construction_date"):
        m = re.match(r"\s*~?(\d{4})", t.get(key, ""))
        if m and int(m.group(1)) > 1998:
            return True
    return False


# (Beschreibung, Bedingung) – historisch begruendete Ausschluesse
EXCLUDE_RULES = [
    ("Bauwerke mit Baujahr nach 1998 (OSM start_date)", _built_after_1998),
    ("Strassenbahn (Luxtram, ab 2017)", lambda t: t.get("railway") in {"tram", "tram_stop", "platform"}
     and ("tram" in t.get("railway", "") or t.get("tram") == "yes")),
    ("Bauten nach 1998 (Namensliste)", lambda t: any(n in t.get("name", "") for n in POST1998_NAMES)),
    ("Radweg-Passerelle unter dem Pont Adolphe (nach 1998)",
     lambda t: t.get("highway") == "cycleway" and t.get("bridge") in {"yes", "viaduct"}),
    ("Baustellen von heute", lambda t: t.get("landuse") == "construction" or t.get("highway") == "construction"),
    ("Stillgelegte Gleise (Darstellung, kein Zeitfilter)", lambda t: t.get("railway") in {"razed", "abandoned", "disused"}),
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


def _point_in_poly(x: float, z: float, poly: list[tuple[float, float]]) -> bool:
    c = False
    for i in range(len(poly)):
        (x1, z1), (x2, z2) = poly[i], poly[i - 1]
        if (z1 > z) != (z2 > z) and x < (x2 - x1) * (z - z1) / (z2 - z1) + x1:
            c = not c
    return c


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
    if b in {"roof", "carport"}:
        return 6  # offene Ueberdachung: nur Dach, keine Waende
    if b in {"garage", "garages", "shed", "kiosk", "hut"}:
        return 4
    if b in {"commercial", "office", "retail", "hotel"}:
        return 5
    return 0


def _cut_wall_gaps(walls: list[dict], roads: list[dict]) -> tuple[list[dict], int]:
    """Hohe Mauern (k=1) dort oeffnen, wo ein ebenerdiger Weg sie kreuzt (Tore/Durchgaenge).
    Ohne Luecke wuerde die Mauer Strassen und Fusswege sperren. Bruecken (mit "y") laufen darueber und bleiben."""
    cell = 25.0
    grid: dict[tuple[int, int], list[tuple[float, float, float, float, float]]] = {}
    for r in roads:
        if "y" in r:
            continue
        pts = r["p"]
        for i in range(0, len(pts) - 2, 2):
            ax, az, bx, bz = pts[i], pts[i + 1], pts[i + 2], pts[i + 3]
            for cx in range(int(math.floor(min(ax, bx) / cell)), int(math.floor(max(ax, bx) / cell)) + 1):
                for cz in range(int(math.floor(min(az, bz) / cell)), int(math.floor(max(az, bz) / cell)) + 1):
                    grid.setdefault((cx, cz), []).append((ax, az, bx, bz, r["w"]))
    out, gaps = [], 0
    for w in walls:
        if not w["k"]:
            out.append(w)
            continue
        pts = [(w["p"][i], w["p"][i + 1]) for i in range(0, len(w["p"]) - 1, 2)]
        cuts: list[tuple[float, float, float]] = []  # Kreuzungspunkt + halbe Lueckenbreite
        for (ax, az), (bx, bz) in zip(pts, pts[1:]):
            seen = set()
            for cx in range(int(math.floor(min(ax, bx) / cell)), int(math.floor(max(ax, bx) / cell)) + 1):
                for cz in range(int(math.floor(min(az, bz) / cell)), int(math.floor(max(az, bz) / cell)) + 1):
                    for seg in grid.get((cx, cz), []):
                        if seg in seen:
                            continue
                        seen.add(seg)
                        px, pz, qx, qz, rw = seg
                        rx, rz, sx, sz = bx - ax, bz - az, qx - px, qz - pz
                        den = rx * sz - rz * sx
                        if abs(den) < 1e-9:
                            continue
                        t = ((px - ax) * sz - (pz - az) * sx) / den
                        u = ((px - ax) * rz - (pz - az) * rx) / den
                        if 0 <= t <= 1 and 0 <= u <= 1:
                            cuts.append((ax + rx * t, az + rz * t, rw / 2 + 1.0))
        if not cuts:
            out.append(w)
            continue
        gaps += len(cuts)
        # Mauer in 1-m-Schritte zerlegen und Punkte in den Luecken weglassen
        run: list[tuple[float, float]] = []
        runs: list[list[tuple[float, float]]] = []
        for (ax, az), (bx, bz) in zip(pts, pts[1:]):
            n = max(1, int(math.dist((ax, az), (bx, bz))))
            for k in range(n + (1 if (bx, bz) == pts[-1] else 0)):
                x, z = ax + (bx - ax) * k / n, az + (bz - az) * k / n
                if any(math.dist((x, z), (c[0], c[1])) < c[2] for c in cuts):
                    if len(run) >= 2:
                        runs.append(run)
                    run = []
                else:
                    run.append((round(x, 1), round(z, 1)))
        if len(run) >= 2:
            runs.append(run)
        for r in runs:
            out.append({"p": [v for p in r for v in p], "h": w["h"], "k": 1})
    return out, gaps


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

    def clean(pts):
        # doppelte/fast gleiche Nachbarpunkte entfernen (sonst scheitert die Dach-Triangulierung)
        out = []
        for p in pts:
            if not out or math.dist(out[-1][:2], p[:2]) > 0.05:
                out.append(p)
        if len(out) > 1 and math.dist(out[0][:2], out[-1][:2]) <= 0.05:
            out.pop()
        return out

    def add_building(ring: list[str], t: dict[str, str], holes: list[list[str]] | None = None) -> None:
        pts = clean([local(n) for n in ring[:-1] if n in nodes])
        if len(pts) < 3 or not all(inside(p[0], p[1]) for p in pts):
            return
        base = min(p[2] for p in pts)
        b = {"p": flat(pts), "b": round(base - 0.5, 1), "h": round(building_height(t) + 0.5, 1), "k": building_kind(t)}
        hole_pts = [clean([local(n) for n in h[:-1] if n in nodes]) for h in (holes or [])]
        hole_pts = [h for h in hole_pts if len(h) >= 3]
        if hole_pts:
            b["q"] = [flat(h) for h in hole_pts]  # Innenhoefe: offen, ohne Dach
        buildings.append(b)

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
            inners = [ways[ref][0] for typ, ref, role in members if typ == "way" and role == "inner" and ref in ways]
            inner_rings = [r for r in join_rings(inners) if all(n in nodes for n in r)]
            for ring in join_rings(outers):
                if not all(n in nodes for n in ring):
                    continue
                outer_xy = [local(n)[:2] for n in ring[:-1]]

                def contains(r):
                    xs = [local(n)[:2] for n in r[:-1]]
                    cx, cz = sum(p[0] for p in xs) / len(xs), sum(p[1] for p in xs) / len(xs)
                    return _point_in_poly(cx, cz, outer_xy)
                add_building(ring, t, [r for r in inner_rings if contains(r)])

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

    walls, gaps = _cut_wall_gaps(walls, roads)
    print(f"Mauerdurchgaenge fuer Wege: {gaps}")

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
