// Wandelt dist-single/index.html in eine Artifact-Seite um: ohne eigenes <html>/<head>/<body>-Geruest
// (die Plattform setzt es selbst), Titel und Viewport-Hinweis zuerst. Aufruf: node scripts/make-artifact.mjs ZIEL.html
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('../dist-single/index.html', import.meta.url), 'utf8');
const head = src.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? '';
const body = src.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? '';
const title = head.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? '<title>Luxembourg 1998</title>';
const rest = head
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(/<title>[\s\S]*?<\/title>/, '');
// Modul-Skript ans Ende, damit die DOM-Elemente beim Start schon existieren
const scripts = [...rest.matchAll(/<script type="module"[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);
const headNoScripts = scripts.reduce((h, s) => h.replace(s, ''), rest);
const out = `${title}\n<style>html,body{height:100%;background:#0d0f12}</style>\n${headNoScripts.trim()}\n${body.trim()}\n${scripts.join('\n')}\n`;
writeFileSync(process.argv[2], out);
console.log('geschrieben:', process.argv[2], (out.length / 1e6).toFixed(2), 'MB');
