# Fortschritt

## 2026-11-28 – Sitzung 1 (Phase 0 + Beginn Phase 1)

### Umgebungspruefung (Phase 0) – Ergebnis
| Pruefpunkt | Ergebnis |
|---|---|
| Betriebssystem | Linux x86_64 (Cloud-Container) – **kein Windows** |
| Grafikkarte | **keine** |
| Unreal Engine | **nicht installiert** (fuer Linux-Container nicht vorgesehen) |
| Visual Studio / Windows SDK | **nicht verfuegbar** (nur unter Windows) |
| C++-Compiler | GCC 13.3, Clang vorhanden |
| CMake | 3.28 |
| Python | 3.13 (+ pyproj 3.8, pytest installiert) |
| Blender | nicht installiert |
| Git / Git LFS | 2.x / 3.4.1 |
| Speicher / RAM / CPU | ca. 60 GB frei / 15 GB / 4 Kerne |
**Folge:** Unreal-Builds, Grafikpruefung und Leistungsmessung sind hier unmoeglich. Gebaut und getestet wird nur
der engine-unabhaengige Kern und die Werkzeuge.

### Erledigt und tatsaechlich geprueft
- LuxCore (7 Module) kompiliert mit GCC und Clang, C++20, `-Wall -Wextra -Wpedantic -Werror`: **0 Warnungen**.
- Kern-Tests: **109 Pruefungen, 0 Fehler**.
- Python-Tests (Geodaten, Validator): **16 bestanden**.
- Anachronismus-Pruefer auf allen Daten: **0 Fehler, 21 Warnungen** (offene Quellen/Fragen, Platzhalterpreise).
  Der Pruefer hat beim ersten Lauf 2 echte Fehler gefunden (Euro-Eintraege nicht als verboten markiert) – behoben.

### Erledigt, aber NICHT geprueft
- Unreal-Projektdatei, Build-Regeln, Konfiguration, 6 Unreal-Klassen (Figur, Fahrzeug, Uhr, Wirtschaft, Missionen,
  Spielstaende). Grund: keine Unreal Engine verfuegbar.

## 2026-11-28 – Sitzung 1, Teil 2: spielbare Browser-Fassung (`Web/`)

### Tatsaechlich geprueft
- TypeScript-Port des Kerns: alle 109 C++-Pruefungen uebernommen, Vitest gruen; `tsc --noEmit` ohne Fehler.
- Welt aus OSM + EU-DEM gebacken: 2 851 Gebaeude, 2 277 Wege, Bruecken gespannt; 104 Elemente als Nach-1998 entfernt.
- Browser-Test (Playwright, Software-Rendering): Mission 01 von Anfang bis Ende erfolgreich, Telefonzelle mit
  Muenzen/Rueckgeld, Fahrt, Speichern/Laden, 0 Konsolenfehler. Bildschirmfotos angesehen.
- Als privates Artifact veroeffentlicht (eine HTML-Datei, 1,3 MB): https://claude.ai/artifact/K7drvJ9W6rfBKqviY9dpRD

### Nicht geprueft
- Bildrate auf echter Hardware; Gamepad; Handy-Bedienung (keine Touch-Steuerung).
