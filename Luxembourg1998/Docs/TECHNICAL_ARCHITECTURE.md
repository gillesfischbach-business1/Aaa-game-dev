# Technische Architektur

## Engine
Unreal Engine **5.6** (in `Luxembourg1998.uproject` fixiert; vor dem ersten Build auf dem Windows-PC bestaetigen,
danach nicht mehr wechseln ohne Migrationsplan). DirectX 12, SM6, Lumen, Nanite, Virtual Shadow Maps, TSR,
World Partition, Chaos Vehicles, Enhanced Input, Mass/StateTree/SmartObjects (Plugins aktiviert).

## Schichten
```
Unreal-Huellen (UObject, Subsystems, Actors)      Source/Luxembourg1998/<Fachordner>/
        │ nutzt
LuxCore – reines C++20, keine Engine-Abhaengigkeit Source/Luxembourg1998/Core/{Public,Private}/LuxCore/
        │ gelesen von
Daten (CSV/JSON, validiert)                        Data/
        │ erzeugt/geprueft von
Werkzeuge (Python: GIS, Validator)                 Scripts/lux98/
```
Warum: Die Spiellogik laesst sich so ohne Grafikkarte und ohne Unreal in Sekunden testen (CI). Unreal-Klassen
bleiben duenn und austauschbar.

## Kernmodule (LuxCore)
| Modul | Aufgabe |
|---|---|
| Calendar1998 | Datum, Wochentag, Sommerzeit, Spieluhr (intern Normalzeit MEZ, keine Spruenge) |
| SolarModel | Sonnenauf-/untergang, Sonnenhoehe/-azimut (NOAA) |
| Economy | LUF als int64, Bargeld/Konto/Dispo, Buchungsverlauf |
| MissionSystem | Ziele, Alternativgruppen, optionale Ziele, Checkpoints, Zeitfenster, Serialisierung |
| Communication | Telefonbuch, Netz mit Erreichbarkeitsregeln, Anrufbeantworter, Telefonzelle |
| SaveFormat | Text-Spielstand mit Version, CRC32, atomarem Schreiben, .bak-Rueckfall |
| HistoricalRules | Laufzeitpruefung "darf dieses Objekt an diesem Tag existieren?" |
| Dialogue | Dialoggraph: Sprecher, Text lb/de/fr/en mit Fallback, Auswahl mit Bedingungen, Flags, Ueberspringen, Pruefung |
| Notebook | Notizbuch: Adressen, Nummern, Termine (bald faellig/verpasst), Hinweise je Mission, Serialisierung |

## Unreal-Klassen (Phase 1, noch nicht kompiliert)
`ALuxGameMode`, `ALuxCharacter` (3rd/1st Person, Interaktion), `ILuxInteractable`, `ALuxVehiclePawn` (Chaos),
`ULuxWorldClockSubsystem` (dreht DirectionalLight mit Tag `Sun`), `ULuxEconomySubsystem`, `ULuxMissionSubsystem`
(laedt `Data/Missions/*.json`), `ULuxSaveSubsystem` (Slots unter `Saved/SaveGames/slotNN.lux98`).

## Daten
- `Data/Missions/missions_main.json` – Missionen (beide Fassungen lesen dieselbe Datei)
- `Data/Dialogue/*.json` – Dialoge im Format des Dialogsystems (Knoten, Auswahl, Flags); vom Pruefer validiert

## Koordinaten
LUREF / Luxembourg TM (EPSG:2169) als Quellsystem. Unreal: 1 uu = 1 cm, X = Ost, Y = Sued, Z = Hoehe,
Ursprung bei 49.6116 N / 6.1300 E (Naehe Place d'Armes). Ursprung nie ohne Migration aendern.

## Spaetere Systeme (geplant)
Verkehr und NPCs ueber Mass Entity + ZoneGraph (Detailstufen nach Entfernung), Tagesablaeufe ueber StateTree +
Smart Objects, Wetter ueber Volumetric Clouds + Materialparameter (Naesse), Audio ueber MetaSounds, Radio als
datengetriebene Playlists, Innenraeume als Level Instances, Stadt ueber World Partition (Zellen 128 m, HLOD).

## Bekannte Risiken
- Kern-Dateien nutzen `sscanf`/`snprintf`; MSVC koennte C4996 melden – beim ersten Windows-Build pruefen.
- `Data/` liegt ausserhalb von `Content/`: fuer Shipping in DataTables ueberfuehren oder Staging einrichten.
