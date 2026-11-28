# LUX98 – Hinweise fuer Claude

LUXEMBOURG 1998 – Echoes of a City. Open-World-Spiel, Unreal Engine 5 (C++), Windows-PC.
Der Nutzer programmiert nicht: auf Deutsch antworten, einfach erklaeren, Empfehlungen geben.

## Zu Beginn jeder Sitzung
1. Diese Datei, `Docs/PROGRESS.md` und `Docs/NEXT_ACTION.md` lesen.
2. `Scripts/run_checks.sh` ausfuehren (Kern-Build, Kern-Tests, Python-Tests, Anachronismus-Pruefer).
3. Am naechsten ausfuehrbaren Schritt aus `NEXT_ACTION.md` weiterarbeiten.

## Architektur in einem Satz
Spiellogik liegt engine-unabhaengig in `Source/Luxembourg1998/Core/{Public,Private}/LuxCore` (reines C++20,
ohne Unreal, mit CMake testbar); Unreal-Klassen in den Fachordnern sind duenne Huellen darum.

## Harte Regeln
- Nichts behaupten, was nicht ausgefuehrt wurde. Unreal-Code ist erst "fertig", wenn ein UBT-Build auf Windows lief.
- Historische Angaben nie erfinden. Neue Eintraege mit `verification_status=unverified`, bis eine Quelle wirklich gesehen wurde.
  Kategorie A nur mit geprueftem Beleg. Alles nach dem 31.12.1998 nur als `FORBID_*`.
- Jede Daten-Aenderung: `python3 -m lux98.validate_history` (aus `Scripts/`) muss 0 Fehler melden.
- Keine echten Marken/Logos/Musik ohne Lizenz; Fahrzeuge als fiktive Modelle.
- Keine kostenpflichtigen Downloads/Assets ohne Zustimmung. Keine Veroeffentlichung ohne Zustimmung.
- Platzhalter-Assets im Namen mit `PH_` kennzeichnen; im Release verboten.

## Umgebung
- Cloud-Container: Linux, keine GPU, kein Windows, keine Unreal Engine -> nur Kern + Werkzeuge pruefbar.
- Unreal-Build: Windows-PC mit UE 5.6 + Visual Studio 2022 (siehe README).
