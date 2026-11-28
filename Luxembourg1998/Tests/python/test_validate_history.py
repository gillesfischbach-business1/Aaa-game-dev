import json
import shutil
from pathlib import Path

import pytest

from lux98 import validate_history as vh

DATA = Path(__file__).resolve().parents[2] / "Data"


@pytest.fixture()
def data(tmp_path):
    dst = tmp_path / "Data"
    shutil.copytree(DATA, dst)
    return dst


def test_project_data_has_no_errors():
    report = vh.validate(DATA)
    assert report.errors == []


def _append(path: Path, line: str) -> None:
    with path.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def test_detects_building_from_after_1998(data):
    _append(data / "HistoricalSources/historical_accuracy.csv",
            "LM_TEST_NEW,Kirchberg,Neubau,,,2005-01-01,,C,,unverified,,,")
    assert any("ANACHRONISMUS" in e for e in vh.validate(data).errors)


def test_forbid_entry_must_be_after_1998(data):
    _append(data / "HistoricalSources/historical_accuracy.csv",
            "FORBID_WRONG,Gare,Falsch,,,1990-01-01,,C,,unverified,,,")
    assert any("FORBID_" in e for e in vh.validate(data).errors)


def test_category_a_requires_checked_source(data):
    _append(data / "HistoricalSources/historical_accuracy.csv",
            "LM_TEST_A,Gare,Test,,,1950-01-01,,A,SRC_GEO_OSM,unverified,,,")
    assert any("Kategorie A" in e for e in vh.validate(data).errors)


def test_unknown_source_is_error(data):
    _append(data / "HistoricalSources/historical_accuracy.csv",
            "LM_TEST_B,Gare,Test,,,1950-01-01,,B,SRC_GIBT_ES_NICHT,unverified,,,")
    assert any("nicht in sources.csv" in e for e in vh.validate(data).errors)


def test_coordinates_outside_city(data):
    _append(data / "HistoricalSources/historical_accuracy.csv",
            "LM_TEST_PARIS,Gare,Test,48.85,2.35,1950-01-01,,C,,unverified,,,")
    assert any("ausserhalb" in e for e in vh.validate(data).errors)


def test_vehicle_from_future(data):
    _append(data / "Vehicles/vehicles_1998.csv",
            "VEH_TEST_FUTURE,Testauto,X,2003,,C,unverified,fiktiv,,")
    assert any("Markteinfuehrung 2003" in e for e in vh.validate(data).errors)


def test_mission_cycle_and_missing_prerequisite(data):
    path = data / "Missions/missions_main.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    doc["missions"][0]["prerequisites"] = ["M08_MILLENNIUM"]
    doc["missions"][1]["prerequisites"].append("M99_GIBT_ES_NICHT")
    path.write_text(json.dumps(doc), encoding="utf-8")
    errors = vh.validate(data).errors
    assert any("Kreis" in e for e in errors)
    assert any("M99_GIBT_ES_NICHT" in e for e in errors)


def test_mission_date_outside_1998(data):
    path = data / "Missions/missions_main.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    doc["missions"][-1]["available_until"] = "1999-01-05"
    path.write_text(json.dumps(doc), encoding="utf-8")
    assert any("nicht im Jahr 1998" in e for e in vh.validate(data).errors)


def test_district_count(data):
    path = data / "GIS/districts.csv"
    lines = path.read_text(encoding="utf-8").splitlines()
    path.write_text("\n".join(lines[:-1]) + "\n", encoding="utf-8")
    assert any("Stadtteile" in e for e in vh.validate(data).errors)


def test_cli_exit_codes(data, capsys):
    assert vh.main(["--data", str(data), "--quiet"]) == 0
    assert vh.main(["--data", str(data), "--quiet", "--strict"]) == 1  # es gibt offene Warnungen


def test_dialogue_errors_detected(data):
    path = data / "Dialogue/M02_muller.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    doc["nodes"][0]["text"]["lb"] = ""
    doc["nodes"][1]["next"] = "gibt.es.nicht"
    doc["nodes"].append({"id": "waise", "text": {"lb": "x", "de": "x"}})
    path.write_text(json.dumps(doc), encoding="utf-8")
    errors = vh.validate(data).errors
    assert any("luxemburgischer Text fehlt" in e for e in errors)
    assert any("Ziel fehlt" in e for e in errors)
    assert any("nicht erreichbar" in e for e in errors)
