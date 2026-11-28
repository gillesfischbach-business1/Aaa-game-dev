# LUX98 Web – spielbare Browser-Fassung

Parallel zum Unreal-Projekt: dieselbe Spiellogik (Kalender, Uhr, Sonne, LUF, Missionen, Telefon, Spielstände),
als TypeScript-Port des C++-Kerns mit denselben 109 Prüfungen, gerendert mit Three.js.

**Spielwelt:** Hollerich / Rond-Point Merl → Gare → Avenue de la Liberté → Pétrusse-Tal → Pont Adolphe / Viaduc → Ville Haute (2,6 × 1,8 km),
erzeugt aus OpenStreetMap + EU-DEM 25 m durch `Scripts/lux98/bake_web.py`. Bekannte Nach-1998-Elemente
(Luxtram, heutige Baustellen, Radweg-Passerelle unter dem Pont Adolphe, abgerissene Gleise) sind entfernt;
alles andere zeigt die heutige Geometrie und ist historisch noch nicht geprüft.

**Inhalt:** Mission 01 „Zeréck an d’Stad“ (Telefonzelle → Madame Weis → Onkels Wagen → Jang auf der Place d’Armes),
Mission 02 „Eng lescht Chance“ (Anrufbeantworter → Garage Muller in Hollerich, rechtzeitig → ehrlich reparieren mit
Teilen von Wagner oder Abkürzung → Werkbank → Probefahrt an Pylonen vorbei → Lohn, Ruf, Folgen),
Mission 03 „D’Nummer an der Zeitung“ (Kiosk → Kleinanzeige → Anruf 18–20 Uhr → Treffen im Pétrusse-Tal →
richtige von drei Türen finden), Arbeit als Mechaniker (Schichten Mo–Fr), Zuhause (Anrufbeantworter, Telefon,
Schlafen), Touch-Steuerung für Handy/Tablet,
Fußgänger, Verkehr, echter Sonnenstand, Tag/Nacht, Regen mit nassen Straßen, Fahrphysik mit Hangabtrieb, Schaden
und Verbrauch, Notizbuch mit handgezeichnetem Stadtplan, Telefonbuch, Zeitansage, Speichern/Laden.

## Befehle
```bash
npm install
npm run dev            # Entwicklungsserver
npm test               # Kern-Tests (Vitest)
npm run build          # Typprüfung + Build nach dist/
npm run build:single   # alles in eine HTML-Datei (dist-single/)
npx vite preview --port 4173 &
node tests/e2e/smoke.mjs http://localhost:4173/ ./shots   # Browser-Test: M01–M03, Arbeit, Speichern (40 Pruefungen)
node tests/e2e/touch.mjs http://localhost:4173/ ./shots   # Handy-Test (Touch, 390x844)
```
Welt neu erzeugen: `python3 -m lux98.bake_web OSM_ORDNER DEM.json ../Web/src/data/world.json` (aus `Scripts/`),
Höhen laden: `python3 -m lux98.fetch_dem 49.5975 6.1220 49.6135 6.1400 25 DEM.json`.

## Grenzen (ehrlich)
- Grafik bewusst einfach (Quader-Figuren, prozedurale Fassaden); kein Fotorealismus.
- Bildrate in der Cloud (Software-Rendering, ~4 FPS) ist nicht aussagekräftig; auf echten Geräten nicht gemessen.
- Luxemburgische Dialoge von Muttersprachlern prüfen lassen.

Missionsdefinitionen (Ziele, Lösungswege, Fehlschlaggründe) liest das Spiel aus `../Data/Missions/missions_main.json` –
dieselbe Datei wie das Unreal-Projekt; Texte und Ablauf stehen in `src/game/missions/`.
