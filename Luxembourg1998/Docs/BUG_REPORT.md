# Fehlerbericht

| ID | Datum | Bereich | Beschreibung | Status |
|---|---|---|---|---|
| BUG-001 | 2026-11-28 | Daten | Euro-Buch- und Bargeld als erlaubte Objekte eingetragen (Anachronismus) | behoben (als FORBID_ markiert) |
| BUG-002 | 2026-11-28 | Kern/Missionen | Feldname `requires` ist in C++20 reserviert | behoben (`prerequisites`) |
| BUG-003 | 2026-11-28 | Kern/Uhr | Sommerzeit-Sprung in erster Fassung fehleranfaellig | behoben: Uhr laeuft intern in MEZ |
| BUG-004 | 2026-11-28 | Web/Welt | Bruecken hingen durch (OSM teilt sie in Stuecke) | behoben: Stuecke verbinden, Widerlager-Hoehe, Gelaende angleichen |
| BUG-005 | 2026-11-28 | Web/Telefon | Dialog nach Anruf per Taste nicht weiterklickbar (Eingabe gesperrt) | behoben, im Browser-Test abgedeckt |
| BUG-006 | 2026-11-28 | Web/Welt | Strassen ragten ueber den Kartenrand ins Leere | behoben: Abschnitte am Rand abgeschnitten |
