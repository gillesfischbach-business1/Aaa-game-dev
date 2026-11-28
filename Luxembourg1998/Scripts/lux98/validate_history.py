"""LUX98 – Anachronismus- und Datenpruefer.

Prueft alle Daten unter Data/ gegen das Spieljahr 1998:
  * Pflichtspalten, eindeutige IDs, gueltige Datumsangaben
  * Genauigkeitskategorien A-D; A/B brauchen eine Quelle aus sources.csv
  * Nichts darf nach dem 31.12.1998 entstanden sein (ausser als FORBID_* markiert)
  * Fahrzeuge: Markteinfuehrung spaetestens 1998
  * Missionen: Voraussetzungen existieren, keine Kreise, Daten liegen in 1998
  * Unsichere/unbelegte Angaben werden als Warnung gemeldet, nie als Fakt

Aufruf:  python3 -m lux98.validate_history [--data PFAD] [--strict]
Exit-Code 1 bei Fehlern (mit --strict auch bei Warnungen).
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

GAME_START = date(1998, 1, 1)
GAME_END = date(1998, 12, 31)
ACCURACY = {"A", "B", "C", "D"}
# grob: Stadtgebiet Luxemburg mit Rand
LAT_RANGE = (49.55, 49.67)
LON_RANGE = (6.05, 6.22)
EXPECTED_DISTRICTS = 24


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def error(self, where: str, msg: str) -> None:
        self.errors.append(f"{where}: {msg}")

    def warn(self, where: str, msg: str) -> None:
        self.warnings.append(f"{where}: {msg}")


def _read_csv(path: Path, required: list[str], report: Report) -> list[dict[str, str]]:
    if not path.exists():
        report.error(str(path), "Datei fehlt")
        return []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        missing = [c for c in required if c not in (reader.fieldnames or [])]
        if missing:
            report.error(path.name, f"Spalten fehlen: {', '.join(missing)}")
            return []
        rows = list(reader)
    for i, row in enumerate(rows, start=2):
        if None in row:
            report.error(f"{path.name}:{i}", "zu viele Spalten (Komma im Text? dann in Anfuehrungszeichen setzen)")
    return rows


def _parse_date(value: str, where: str, report: Report) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        report.error(where, f"ungueltiges Datum '{value}' (erwartet JJJJ-MM-TT)")
        return None


def _check_unique(rows: list[dict[str, str]], key: str, fname: str, report: Report) -> None:
    seen: set[str] = set()
    for i, row in enumerate(rows, start=2):
        val = row.get(key, "")
        if not val:
            report.error(f"{fname}:{i}", f"{key} leer")
        elif val in seen:
            report.error(f"{fname}:{i}", f"{key} doppelt: {val}")
        seen.add(val)


def check_sources(data: Path, report: Report) -> set[str]:
    rows = _read_csv(data / "HistoricalSources" / "sources.csv", ["source_id", "title", "status"], report)
    _check_unique(rows, "source_id", "sources.csv", report)
    return {r["source_id"] for r in rows}


def check_history(data: Path, source_ids: set[str], report: Report) -> None:
    fname = "historical_accuracy.csv"
    cols = ["asset_id", "historical_name", "lat", "lon", "exists_from", "exists_until", "accuracy",
            "source_ref", "verification_status", "license_status", "reconstruction_status", "open_questions"]
    rows = _read_csv(data / "HistoricalSources" / fname, cols, report)
    _check_unique(rows, "asset_id", fname, report)
    unverified = 0
    for i, r in enumerate(rows, start=2):
        where = f"{fname}:{i} {r['asset_id']}"
        acc = r["accuracy"]
        if acc not in ACCURACY:
            report.error(where, f"Genauigkeitskategorie '{acc}' ungueltig (A/B/C/D)")
        start = _parse_date(r["exists_from"], where, report)
        end = _parse_date(r["exists_until"], where, report)
        if start and end and end < start:
            report.error(where, "exists_until liegt vor exists_from")
        if acc in {"A", "B"}:
            if not r["source_ref"]:
                report.error(where, "Kategorie A/B ohne Quellenangabe")
            elif r["source_ref"] not in source_ids:
                report.error(where, f"Quelle {r['source_ref']} nicht in sources.csv")
        if r["source_ref"] and r["source_ref"] not in source_ids:
            report.error(where, f"Quelle {r['source_ref']} nicht in sources.csv")
        if r["verification_status"] == "unverified" and acc != "D":
            unverified += 1
            if acc == "A":
                report.error(where, "Kategorie A verlangt eine tatsaechlich gepruefte Quelle")
        if acc == "D" and r["verification_status"] != "fictional":
            report.warn(where, "Kategorie D sollte verification_status=fictional haben")
        if acc != "D" and not start:
            report.warn(where, "Existenzbeginn unbekannt")

        forbidden = r["asset_id"].startswith("FORBID_")
        if forbidden:
            if not start or start <= GAME_END:
                report.error(where, "FORBID_-Eintrag muss nach 1998 entstanden sein (sonst ist er erlaubt)")
        else:
            if start and start > GAME_END:
                report.error(where, f"ANACHRONISMUS: entsteht erst {start} – als FORBID_ markieren oder entfernen")
            if end and end < GAME_START:
                report.error(where, f"ANACHRONISMUS: existierte nur bis {end}")
        for key, (lo, hi) in (("lat", LAT_RANGE), ("lon", LON_RANGE)):
            if r[key]:
                try:
                    v = float(r[key])
                    if not lo <= v <= hi:
                        report.error(where, f"{key}={v} liegt ausserhalb von Luxemburg-Stadt")
                except ValueError:
                    report.error(where, f"{key} ist keine Zahl")
        if r["open_questions"]:
            report.warn(where, f"offene Frage: {r['open_questions']}")
    if unverified:
        report.warn(fname, f"{unverified} Eintraege noch nicht anhand einer Quelle geprueft")


def check_vehicles(data: Path, report: Report) -> None:
    fname = "vehicles_1998.csv"
    cols = ["vehicle_id", "reference_model", "market_intro_year", "production_end_year", "accuracy",
            "verification_status", "license_status"]
    rows = _read_csv(data / "Vehicles" / fname, cols, report)
    _check_unique(rows, "vehicle_id", fname, report)
    unlicensed = 0
    for i, r in enumerate(rows, start=2):
        where = f"{fname}:{i} {r['vehicle_id']}"
        try:
            intro = int(r["market_intro_year"])
        except ValueError:
            report.error(where, "market_intro_year fehlt/ungueltig")
            continue
        if intro > GAME_END.year:
            report.error(where, f"ANACHRONISMUS: Markteinfuehrung {intro}")
        elif intro == GAME_END.year:
            report.warn(where, "Markteinfuehrung 1998 – Monat noetig, damit das Fahrzeug erst ab dann erscheint")
        if r["production_end_year"]:
            try:
                if int(r["production_end_year"]) < intro:
                    report.error(where, "Produktionsende vor Markteinfuehrung")
            except ValueError:
                report.error(where, "production_end_year ungueltig")
        if r["accuracy"] not in ACCURACY:
            report.error(where, "Genauigkeitskategorie ungueltig")
        if "ungeklaert" in r["license_status"]:
            unlicensed += 1
    if unlicensed:
        report.warn(fname, f"{unlicensed} Fahrzeuge ohne geklaerte Markenrechte – im Spiel nur als fiktive Modelle")


def check_districts(data: Path, report: Report) -> None:
    rows = _read_csv(data / "GIS" / "districts.csv", ["district_id", "name", "production_priority"], report)
    _check_unique(rows, "district_id", "districts.csv", report)
    _check_unique(rows, "name", "districts.csv", report)
    if rows and len(rows) != EXPECTED_DISTRICTS:
        report.error("districts.csv", f"{len(rows)} Stadtteile statt {EXPECTED_DISTRICTS}")


def check_prices(data: Path, report: Report) -> None:
    fname = "prices_1998.csv"
    rows = _read_csv(data / "Economy" / fname,
                     ["item_id", "price_luf", "accuracy", "is_placeholder", "source_ref"], report)
    _check_unique(rows, "item_id", fname, report)
    placeholders = 0
    for i, r in enumerate(rows, start=2):
        where = f"{fname}:{i} {r['item_id']}"
        if r["price_luf"]:
            try:
                if int(r["price_luf"]) < 0:
                    report.error(where, "negativer Preis")
            except ValueError:
                report.error(where, "Preis muss ganze Franken sein")
        if r["is_placeholder"].lower() == "true" or not r["price_luf"]:
            placeholders += 1
        elif r["accuracy"] in {"A", "B"} and not r["source_ref"]:
            report.error(where, "Preis mit Kategorie A/B ohne Quelle")
    if placeholders:
        report.warn(fname, f"{placeholders} Preise sind Platzhalter oder noch nicht recherchiert")


def _has_cycle(graph: dict[str, list[str]]) -> str | None:
    state: dict[str, int] = {}

    def visit(node: str) -> str | None:
        state[node] = 1
        for nxt in graph.get(node, []):
            if state.get(nxt) == 1:
                return nxt
            if state.get(nxt) is None and (found := visit(nxt)):
                return found
        state[node] = 2
        return None

    for n in graph:
        if state.get(n) is None and (found := visit(n)):
            return found
    return None


def check_missions(data: Path, report: Report) -> None:
    mdir = data / "Missions"
    district_names = set()
    dpath = data / "GIS" / "districts.csv"
    if dpath.exists():
        with dpath.open(encoding="utf-8") as f:
            district_names = {r["name"] for r in csv.DictReader(f)}
    for path in sorted(mdir.glob("*.json")):
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            report.error(path.name, f"kein gueltiges JSON: {e}")
            continue
        events = {}
        for ev in doc.get("events", []):
            where = f"{path.name} {ev.get('event_id')}"
            events[ev["event_id"]] = ev
            s = _parse_date(ev.get("start") or "", where, report)
            e = _parse_date(ev.get("end") or "", where, report)
            if not s or not e:
                report.warn(where, "Termin noch nicht belegt – zugehoerige Missionen bleiben gesperrt")
            else:
                if not (GAME_START <= s <= GAME_END and GAME_START <= e <= GAME_END):
                    report.error(where, "Termin liegt nicht im Jahr 1998")
                if e < s:
                    report.error(where, "Ende vor Beginn")
            if ev.get("accuracy") in {"A", "B"} and not ev.get("source_ref"):
                report.warn(where, "Termin ohne Quellenangabe")
        missions = doc.get("missions", [])
        ids = [m.get("mission_id", "") for m in missions]
        for dup in {x for x in ids if ids.count(x) > 1}:
            report.error(path.name, f"Missions-ID doppelt: {dup}")
        graph = {}
        for m in missions:
            mid = m.get("mission_id", "?")
            where = f"{path.name} {mid}"
            objs = m.get("objectives", [])
            if not objs:
                report.error(where, "keine Ziele")
            obj_ids = [o.get("id") for o in objs]
            if len(obj_ids) != len(set(obj_ids)):
                report.error(where, "Ziel-IDs doppelt")
            if objs and all(o.get("optional") for o in objs):
                report.error(where, "nur optionale Ziele – Mission waere nie abschliessbar")
            for g in {o.get("group") for o in objs if o.get("group")}:
                if sum(1 for o in objs if o.get("group") == g) < 2:
                    report.warn(where, f"Loesungsweg-Gruppe '{g}' hat nur eine Alternative")
            for req in m.get("prerequisites", []):
                if req not in ids:
                    report.error(where, f"Voraussetzung {req} existiert nicht")
            graph[mid] = list(m.get("prerequisites", []))
            if ev_id := m.get("event"):
                if ev_id not in events:
                    report.error(where, f"Ereignis {ev_id} unbekannt")
            s = _parse_date(m.get("available_from") or "", where, report)
            e = _parse_date(m.get("available_until") or "", where, report)
            for d in (s, e):
                if d and not GAME_START <= d <= GAME_END:
                    report.error(where, f"Datum {d} liegt nicht im Jahr 1998")
            if s and e and e < s:
                report.error(where, "Zeitfenster endet vor Beginn")
            if district_names and m.get("district") not in district_names:
                report.error(where, f"Stadtteil '{m.get('district')}' unbekannt")
            if not m.get("fail_conditions") and not m.get("objectives"):
                report.warn(where, "weder Ziele noch Fehlschlagbedingungen")
        if cyc := _has_cycle(graph):
            report.error(path.name, f"Voraussetzungen bilden einen Kreis (bei {cyc})")


def check_dialogues(data: Path, report: Report) -> None:
    """Dialogdateien: eindeutige Knoten, Ziele vorhanden, Luxemburgisch + Deutsch, alles erreichbar."""
    for path in sorted((data / "Dialogue").glob("*.json")):
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            report.error(path.name, f"kein gueltiges JSON: {e}")
            continue
        nodes = doc.get("nodes", [])
        ids = [n.get("id", "") for n in nodes]
        for dup in {x for x in ids if ids.count(x) > 1}:
            report.error(path.name, f"Knoten doppelt: {dup}")
        known = set(ids)
        start = doc.get("start", "")
        if start not in known:
            report.error(path.name, f"Startknoten '{start}' fehlt")
            continue
        edges: dict[str, list[str]] = {}
        for n in nodes:
            nid = n.get("id", "?")
            where = f"{path.name} {nid}"
            text = n.get("text", {})
            if not text.get("lb"):
                report.error(where, "luxemburgischer Text fehlt")
            if not text.get("de"):
                report.error(where, "deutscher Untertitel fehlt")
            for lang in ("fr", "en"):
                if not text.get(lang):
                    report.warn(where, f"Untertitel '{lang}' fehlt")
            outs = [n.get("next", ""), n.get("skip_to", "")] + [c.get("next", "") for c in n.get("choices", [])]
            if n.get("choices") and n.get("next"):
                report.error(where, "Knoten hat Auswahl UND Folgeknoten")
            for c in n.get("choices", []):
                if not c.get("text", {}).get("de"):
                    report.error(where, "Auswahltext ohne Deutsch")
            for o in outs:
                if o and o not in known:
                    report.error(where, f"Ziel fehlt: {o}")
            edges[nid] = [o for o in outs if o in known]
        seen, stack = {start}, [start]
        while stack:
            for o in edges.get(stack.pop(), []):
                if o not in seen:
                    seen.add(o)
                    stack.append(o)
        for orphan in sorted(known - seen):
            report.error(f"{path.name} {orphan}", "nicht erreichbar")


def validate(data: Path) -> Report:
    report = Report()
    sources = check_sources(data, report)
    check_history(data, sources, report)
    check_vehicles(data, report)
    check_districts(data, report)
    check_prices(data, report)
    check_missions(data, report)
    check_dialogues(data, report)
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", type=Path, default=Path(__file__).resolve().parents[2] / "Data")
    parser.add_argument("--strict", action="store_true", help="Warnungen wie Fehler behandeln")
    parser.add_argument("--quiet", action="store_true", help="Warnungen nicht einzeln ausgeben")
    args = parser.parse_args(argv)
    report = validate(args.data)
    for e in report.errors:
        print(f"FEHLER   {e}")
    if not args.quiet:
        for w in report.warnings:
            print(f"WARNUNG  {w}")
    print(f"\n{len(report.errors)} Fehler, {len(report.warnings)} Warnungen")
    if report.errors or (args.strict and report.warnings):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
