# Lichter der Reise

A short WebGPU road story in four chapters (German). Léo and Mira drive their old white van "Fidèle" from the blast furnaces, through the city of bridges and the square of fiery orbs, to the harbour of lights.

## Play

WebGPU needs a secure context, so serve the folder instead of opening the file directly:

```bash
cd games/lichter-der-reise && python3 -m http.server 8000
# open http://localhost:8000
```

Works in current Chrome/Edge (desktop and Android) and Safari 26+.

Controls: ← → or A/D steer, Space = Lichtstoß (boost), P pause, M sound. On phones: touch buttons at the bottom.

## Tech

- Single file, no dependencies: raw WebGPU, instanced forward renderer into an HDR target with 4× MSAA.
- Procedural materials in WGSL: lit windows, lava orbs, water, wet asphalt with stretched light reflections.
- Bloom (13-tap downsample / tent upsample chain), ACES tonemapping, vignette, grain.
- Procedural world per chapter, generative WebAudio score and sound effects.
- Adaptive render resolution keeps the frame rate up on slower devices.

The optional ending photo album loads from `memories/` (not committed; the game hides the album when the photos are missing).
