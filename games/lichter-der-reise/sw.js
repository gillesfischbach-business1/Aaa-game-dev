/* Service worker: lets the game be installed and played offline. Network first, cache as fallback. The page itself is always re-checked with the server, so a new version arrives on the next load. */
const CACHE='ldr-v2';
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{ const r=e.request; if(r.method!=='GET'||new URL(r.url).origin!==location.origin||r.url.includes('/assets/music/')) return;
  e.respondWith(fetch(r,r.mode==='navigate'?{cache:'no-cache'}:undefined).then(res=>{ if(res.ok){ const c=res.clone(); caches.open(CACHE).then(ch=>ch.put(r,c)); } return res; }).catch(()=>caches.match(r,{ignoreSearch:true}))); });
