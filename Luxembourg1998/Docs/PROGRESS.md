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

## 2026-11-28 – Sitzung 1, Teil 3: Mission 02 „Eng lescht Chance“ (Browser-Fassung)

### Tatsaechlich geprueft
- Karte nach Westen erweitert (Hollerich bis Rond-Point Merl): 2,6 x 1,8 km, 5 606 Gebaeude, 3 685 Wege.
- Missionsdaten kommen jetzt fuer beide Fassungen aus `Data/Missions/missions_main.json` (Validator: 0 Fehler).
- Neue Systeme: Anrufbeantworter (Wohnung), Bancomat, Fristen in Spielzeit, Oeffnungszeiten, Ruf-Wert,
  Auswahl-Dialoge, Werkstatt-Minispiel, mehrere fahrbare Autos, nachlassende Bremsen, Pylonen-Probefahrt.
- Vitest: 19 Tests (inkl. M01/M02 aus den gemeinsamen Daten). Browser-Test: 24 Pruefungen gruen
  (M01, M02 ehrlicher Weg, M02 Abkuerzung, zu spaet kommen, Bremsfading, Speichern/Laden), 0 Konsolenfehler.
- Artifact aktualisiert (Version 2).

### Nicht geprueft
- Echte Fahrt der Pylonen-Route mit Tastatur (im Test teleportiert, wegen ~5 FPS im Software-Rendering).

## 2026-11-28 – Sitzung 1, Teil 4 (autonom, Nutzer schlaeft): M03, Arbeit, Touch

### Tatsaechlich geprueft
- Mission 03 „D'Nummer an der Zeitung“: Kiosk, fiktive Zeitung mit Kleinanzeigen, Anruf nur 18–20 Uhr
  (Telefonzelle oder von zu Hause), Treffen mit Zeitfenster, verpasst -> neuer Termin per Band, drei Tueren.
- Zuhause-Menue: Anrufbeantworter, Telefon (Telefonrechnung), Schlafen bis 8 Uhr.
- Karriere Mechaniker: Schichten Mo–Fr, drei Auftragsarten, Lohn aufs Konto, Abzug bei Verspaetung/Fehlern.
- Touch-Steuerung (Joystick, Wischen, Knoepfe), Handy-Layout, Ebenen-Reihenfolge der Oberflaeche.
- Browser-Test Desktop: 40 Pruefungen gruen. Handy-Test (390x844, Touch): 8 Pruefungen gruen. 0 Konsolenfehler.
- Gefundene und behobene Fehler: Kleinanzeigen-Nummer fehlte im Telefonnetz; „Zou“-Knopf gab Steuerung nicht frei;
  Touch-Flaeche verdeckte Hinweis und Notizbuch.

### Nicht geprueft
- Echte Handys/Tablets (nur nachgebildet); Bildrate auf echten Geraeten.

## 2026-11-28 – Sitzung 1, Teil 5 (autonom): Dialogsystem und Notizbuch im C++-Kern

### Tatsaechlich geprueft
- `Dialogue` und `Notebook` im Kern; C++-Tests jetzt 148 Pruefungen, GCC und Clang mit -Werror gruen.
- `Data/Dialogue/M02_muller.json` als erste Dialogdatei; Pruefer validiert Dialoge (17 Python-Tests gruen).
- CMake erkennt neue Kerndateien automatisch (CONFIGURE_DEPENDS).

### Nicht geprueft
- Unreal-Anbindung von Dialog und Notizbuch (noch nicht geschrieben; Unreal hier nicht verfuegbar).

## 2026-11-28 – Sitzung 2: Mission 05 „Déi verluer Diskett“ mit Internetcafe

### Tatsaechlich geprueft
- Begehbarer Innenraum (Cybercafe Pixel): Roehrenmonitore, Theke, Neonlicht, Preistafel; Ein-/Ausgang.
- Fiktives Offline-Internet (Spez. Abschnitt 09): LuxOS/NetNavigator/StadMail (fiktiv), Portal, Presse, Forum,
  Kleinanzeigen, Jobs, Gaestebuch (eintragbar), Chat #lëtzebuerg, private Homepage, E-Mail mit Antwort nach
  Spielzeit, Modemton (erzeugt), langsames Laden. Keine echte Netzwerkverbindung.
- Mission 05 mit drei Wegen zu einer Wahrheit: Forum + E-Mail, Zeuge an der Haltestelle, Telefonbuch/Fundbuero.
- Browser-Test Desktop: 57 Pruefungen gruen (alle drei Wege), Handy-Test gruen, Vitest 20, 0 Konsolenfehler.
- Behoben: Figuren im Cafe ausserhalb des Raums; Fundbuero konnte auf der Telefonzelle landen (neue Orte halten
  jetzt Abstand zu Interaktionspunkten); CSS-Namenskollision (Monitorrahmen fehlte); Blickrichtung beim Betreten.
