# Council-Pruefung 28.11.2026

Vier unabhaengige Pruef-Agenten (nur lesend) haben die gesamte bisherige Arbeit geprueft, je mit eigenem Blickwinkel.
Die echte LLM-Council-App (Repository `llm-council`) wurde nicht benutzt: sie braucht einen OpenRouter-Schluessel.
Danach hat der Vorsitz (Hauptsitzung) die Befunde gewichtet und umgesetzt. Status: **behoben**, **offen**, **Frage an Nutzer**.

## 1. Welt, Kollision, Kamera, Handy
| Befund | Schwere | Status |
|---|---|---|
| Start auf Ecke des Bahnhofsgrundrisses (Abstand 0 wurde ignoriert) -> eingesperrt im Gebaeude (~2 300 m²) | kritisch | behoben: `nearestWallDist`, Abstand-0-Fall, Wand-Ueberquerung in `resolve`, `unstuck()` beim Laden/Aussteigen, Knopf "Festgesteckt?", Test `tests/reach.test.ts` |
| 118 Wegpunkte auf Grundrisskanten galten als frei | major | behoben (gleiche Abstandspruefung) |
| Hohe Mauern (k=1) mit unendlicher Kollision sperrten Strassen, Bruecken, Fusswege | major | behoben: Durchgaenge beim Weltbau, Kollision nur bis Mauerhoehe |
| Autos fahren bei niedriger Bildrate durch Waende | major | behoben: Bewegungspruefung (from -> to) |
| Kamera springt / kommt sehr nah | minor | offen |
| 2 PointLights der Galerie/des Cybercafes wirkten in der ganzen Stadt | minor | behoben: nur innen an |
| Herunterziehen-Neuladen und Zoomen am Handy | minor | behoben (CSS) |
| DoubleSide-Fassaden, eine Stadtgeometrie ohne Frustum-Culling | minor | offen (Leistung) |
| Zwei kleine eingeschlossene Fusswege in OSM-Durchgaengen | minor | offen |

## 2. Spielablauf, Missionen, Spielstaende
| Befund | Schwere | Status |
|---|---|---|
| M07: Film voll vor drei guten Motiven -> Sackgasse | kritisch | behoben |
| Laden im Sommer 0-1 Uhr: Uhr springt einen Tag zurueck | major | behoben (C++ + TS, Test) |
| Anrufbeantworter nicht gespeichert -> Jobangebot ging verloren | major | behoben (gespeichert, keine Doppelten, alte Staende: Angebot neu) |
| M08 startet nicht beim Tageswechsel | major | behoben |
| Schlafen nach Mitternacht ueberspringt einen Tag | major | behoben |
| Laden bei offenem Dialog fuehrt alte Rueckrufe aus | major | behoben (`ui.cancelAll`) |
| Fotoauftraege: Film leer bei offenem Auftrag | major | behoben |
| M02-Frist am Samstag nach Ladenschluss, Ersatzfrist 1 Stunde | major | behoben |
| Tasten waehrend Auswahl spaeter ausgeloest; Anrufe gratis bei leerem Konto; Tank 0 beim Laden; falsche Tuer zaehlt mehrfach; Fundbuero rund um die Uhr | minor | behoben |
| Verpasstes Silvester nachholbar | minor | bewusst gelassen (Ausweg) |
| Kundenwagen rammen setzt M02 zurueck; Fotos nach Laden ohne Bild; keine Tankstelle | minor | offen |

## 3. Geschichte, Daten, Ehrlichkeit
| Befund | Schwere | Status |
|---|---|---|
| Wege von Royal-Hamilius und Radweg-Passerelle noch in der Welt | kritisch | behoben (Namensliste in `bake_web.py`) |
| 15 Eintraege Kategorie B ohne eingesehene Quelle | major | behoben: auf C; Validator verlangt fuer A/B eingesehene Quelle |
| Nationalfeiertag B ohne Quelle | major | behoben (C) |
| Freies Spiel 1999 widerspricht Regel "nichts nach 31.12.1998" | major | **Frage an Nutzer** |
| Weitere Nach-1998-Bauten (Cite judiciaire, Petrusse-Renaturierung, Gare-Umbauten), fehlende abgerissene Bauten von 1998 | major | offen (Quellen noetig) |
| Sprachfehler (drësseg, n-Regel, op der Gare, Opträg, datt, Prost Neijoer) | minor | behoben |
| Echte Marken (Wort/Tageblatt, AVL, Windows/Notepad, TÜV) | minor | behoben |
| Telefonnummern/Radiofrequenzen evtl. 1998 real vergeben | minor | offen (pruefen) |
| Doku: Testzahlen, ueberzogene Aussagen | minor | behoben |

## 4. Architektur, C++-Kern, TS-Port
| Befund | Schwere | Status |
|---|---|---|
| TS-Port bytegenau zum C++-Kern (geprueft) | – | gut |
| Missionen in Unreal nie freigeschaltet | major | behoben (ungebaut) |
| `Deserialize` nicht transaktional | major | behoben (C++ + TS, Tests) |
| `ToStd` doppelt -> Unity-Build-Fehler; `Instigator` verdeckt | major/minor | behoben (ungebaut) |
| Speichern mit Sonderzeichen im Windows-Pfad; Enhanced-Input-Kontexte; MSVC `sscanf` | major | offen (braucht Windows/UBT) |
| `game.ts` ist eine God-Klasse, Missionen greifen ineinander | major | offen (Umbau geplant) |
| Browser-Tests teleportieren und setzen Zustaende direkt | – | bekannt; `reach.test.ts` prueft jetzt echte Erreichbarkeit |
