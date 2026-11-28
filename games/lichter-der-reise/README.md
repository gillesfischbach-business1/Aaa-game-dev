# Lichter der Reise

An open-world WebGPU driving game (German) built from a couple's travel photos. Drive freely through a fictional Luxembourg (Belval blast furnaces, the old town above a valley with stone bridges, a glass-tower district) and a fictional Eindhoven (canal, brick rows, factory lofts, the GLOW "Glutplatz" and the Lichtturm), connected by the motorway "A-Route der Lichter".

Léo and Mira can drive their old white van **Fidèle** (EJ 391 YJ) or Valère's green hypercar **Smaragd** (VH 3107) and swap whenever they stop. Story missions bring the photos into the game as story cards; the ending choice decides whether the Lichtturm lights up.

**Play:** https://gillesfischbach-business1.github.io/Aaa-game-dev/games/lichter-der-reise/ (once GitHub Pages is enabled for this repository: Settings → Pages → Deploy from a branch).

Runs in current Chrome/Edge (desktop and Android) and Safari 26+ (macOS, iOS, iPadOS).

## Controls
W A S D / arrow keys drive · Space Lichtstoß (boost, costs 5 sparks) · C swap car (when stopped) · K map · P pause · M sound · touch buttons on phones · gamepad.

## Structure
`src/` is bundled by `python3 build.py` into one `index.html`.
- `renderer.js` WebGPU: sun/moon shadow map, HDR forward pass with 4× MSAA, glass pass, bloom, ACES tonemapping, adaptive resolution.
- `shaders.js` WGSL materials: GGX lighting with clearcoat, procedural facades, pavers, wet asphalt, water, car paint, rust, foliage, grass.
- `openworld.js` map generation (street grids, districts, landmarks, valley, canal, motorway), colliders, road graph.
- `drive.js` vehicle physics, collisions, traffic, GPS routing. `game.js` time of day, missions, camera, HUD, minimap.
- `cars.js` / `meshes.js` procedural models of both cars and the characters. `story.js` dialogue and missions.
- `assets/` the photos used for story cards, portraits and the album.
