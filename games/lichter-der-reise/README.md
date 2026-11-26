# Lichter der Reise

A WebGPU road story in four chapters (German), built from a couple's travel photos: Léo and Mira drive from the blast furnaces of Belval through Luxembourg City and a square of fire orbs to the harbour of Monte-Carlo, in their old white van "Fidèle" or Valère's green hypercar "Smaragd".

**Play:** https://raw.githack.com/gillesfischbach-business1/Aaa-game-dev/main/games/lichter-der-reise/index.html
(after GitHub Pages is enabled: https://gillesfischbach-business1.github.io/Aaa-game-dev/games/lichter-der-reise/)

Runs in current Chrome/Edge (desktop and Android) and Safari 26+ (macOS, iOS, iPadOS).

## Controls
← → / A D steer · ↑ ↓ / W S throttle and brake · Space Lichtstoß · P pause · M sound · touch buttons on phones · gamepad.

## Structure
- `src/` sources, bundled by `python3 build.py` into a single `index.html`.
  - `renderer.js` WebGPU: 2048² sun shadow map (PCF), HDR forward pass with 4× MSAA, transparent glass pass, bloom chain, ACES tonemapping, adaptive resolution.
  - `shaders.js` WGSL: GGX lighting with clearcoat, procedural facades (brick, plaster, sandstone, glass curtain walls, lit interiors), pavers, wet asphalt with puddles, water, metallic car paint, rust, foliage.
  - `meshes.js` procedural geometry (lofts, lathes, rounded boxes); `cars.js` the two cars and characters; `world.js` the four places; `story.js` dialogue; `game.js` driving, spawning, camera, flow.
- `assets/` photos used for story cards, dialogue portraits and car selection.
