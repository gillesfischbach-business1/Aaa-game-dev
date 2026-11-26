#!/usr/bin/env python3
"""Bundle src/ into one self-contained index.html (works on GitHub Pages or any static host)."""
from pathlib import Path
root = Path(__file__).parent
src = root / 'src'
order = ['meshes.js', 'shaders.js', 'atlas.js', 'cars.js', 'renderer.js', 'world.js', 'openworld.js', 'drive.js', 'humans.js', 'story.js', 'audio.js', 'game.js', 'settings.js', 'main.js']
import base64
models = root / 'assets' / 'models.bin'
js = ('const MODELS_B64="' + base64.b64encode(models.read_bytes()).decode() + '";\n' if models.exists() else '') + '\n'.join((src / f).read_text(encoding='utf-8') for f in order)
html = f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>Lichter der Reise</title>
<meta name="description" content="Eine WebGPU-Roadstory in vier Kapiteln: von Belval über Luxemburg nach Monte-Carlo.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;600;800&display=swap">
<style>
{(src / 'style.css').read_text(encoding='utf-8')}
</style>
</head>
<body>
{(src / 'body.html').read_text(encoding='utf-8')}
<script>
"use strict";
{js}
</script>
</body>
</html>
'''
(root / 'index.html').write_text(html, encoding='utf-8')
print('index.html', len(html) // 1024, 'KB')
# play.html: same page with absolute photo URLs, for HTML preview services that load the page from another origin
RAW = 'https://raw.githubusercontent.com/gillesfischbach-business1/Aaa-game-dev/gh-pages/games/lichter-der-reise/assets/'
(root / 'play.html').write_text(html.replace('"assets/', '"' + RAW).replace("'assets/", "'" + RAW), encoding='utf-8')
import sys
if len(sys.argv) > 2 and sys.argv[1] == '--fragment':
    # same page without the document skeleton (for hosts that wrap the page themselves)
    head = html.split('<head>', 1)[1].split('</head>', 1)[0]
    body = html.split('<body>', 1)[1].split('</body>', 1)[0]
    Path(sys.argv[2]).write_text(head.replace('<meta charset="utf-8">\n', '') + body, encoding='utf-8')
    print('fragment', sys.argv[2])
