# LUXEMBOURG 1998 – Echoes of a City (Codename LUX98)

> A city before the digital age. A life before everything changed. Luxembourg, 1998.

Fotorealistisches Open-World-Spiel fuer Windows-PC auf Unreal Engine 5. Schauplatz: Luxemburg-Stadt im Jahr 1998.

**Stand:** Phase 0 abgeschlossen, Phase 1 (spielbare Grundlage) begonnen. Siehe `Docs/PROGRESS.md`.

## Jetzt spielbar: Browser-Fassung
Ordner `Web/` – Three.js, gleiche Spiellogik, Stadtausschnitt Gare bis Oberstadt aus echten Karten- und Hoehendaten.
Details: `Web/README.md`.

## Was hier schon funktioniert (ohne Unreal pruefbar)

| Teil | Ort | Geprueft |
|---|---|---|
| Kalender 1998, Spieluhr (12 min = 1 h), Sommerzeit | `Source/.../Core/LuxCore/Calendar1998.*` | 109 C++-Pruefungen (GCC + Clang) |
| Sonnenstand fuer Luxemburg | `SolarModel.*` | gegen Referenz-Sonnenzeiten |
| Geld in LUF (Bargeld, Konto, Dispo) | `Economy.*` | ja |
| Missionen mit alternativen Loesungswegen, Checkpoints | `MissionSystem.*` | ja |
| Telefonbuch, Telefonnetz, Anrufbeantworter, Telefonzelle | `Communication.*` | ja |
| Spielstaende mit Version, Pruefsumme, Sicherungskopie | `SaveFormat.*` | ja |
| Anachronismus-Pruefung zur Laufzeit | `HistoricalRules.*` | ja |
| Anachronismus-Pruefer fuer alle Daten | `Scripts/lux98/validate_history.py` | 16 Python-Tests |
| Koordinaten WGS84 / LUREF (EPSG:2169) / Unreal | `Scripts/lux98/geo.py` | ja |

## Was geschrieben, aber noch NICHT kompiliert ist
Die Unreal-Klassen (Spielfigur, Fahrzeug, Spieluhr-Subsystem, Missionen, Spielstaende). Sie brauchen einen
Windows-PC mit Unreal Engine. Bis dahin gelten sie als ungeprueft.

## Pruefen (Linux/macOS/Windows mit Git-Bash)
```bash
pip install pyproj pytest
Scripts/run_checks.sh
```

## Unreal-Build (Windows)
Voraussetzungen (kostenlos): Epic Games Launcher + **Unreal Engine 5.6**, **Visual Studio 2022** mit
"Desktop development with C++" und "Game development with C++", Windows 10/11 SDK, Git + Git LFS.
1. Rechtsklick auf `Luxembourg1998.uproject` -> "Generate Visual Studio project files".
2. `Luxembourg1998.sln` oeffnen, Konfiguration "Development Editor", Build.
3. Projekt im Editor oeffnen. Erste Testkarte: siehe `Docs/NEXT_ACTION.md`.

## Ordner
`Source/` Code · `Content/` Unreal-Assets (Git LFS) · `Data/` Recherche- und Spieldaten (CSV/JSON) ·
`Scripts/` Werkzeuge · `Tests/` Tests · `Docs/` Planung und Berichte.
