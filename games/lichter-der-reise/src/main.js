/* ===== Boot, UI wiring, input ===== */
function initUI(){
  bindUI();
  addEventListener('keydown',e=>{ const k=(e.key||'').toLowerCase();
    if(!$('optO').hidden){ if(rebinding){ e.preventDefault&&e.preventDefault(); handleRebind(k); return; } if(k==='escape') closeOptions(); return; }
    if(k==='v'&&!e.repeat&&G.state==='drive'){ cycleView(); }
    keys[k]=true; const a=actionOfKey(k);
    if([' ','arrowleft','arrowright','arrowup','arrowdown'].includes(k)) e.preventDefault&&e.preventDefault();
    if(!UI.dialog.hidden&&(k===' '||k==='enter')){ advance(); return; }
    if(k==='escape'&&!UI.dialog.hidden&&dlg.cur&&!dlg.cur.choices){ skipDialog(); return; }
    if(a==='boost'||k==='shift') tryBoost();
    if(a==='swap') swapCar();
    if(a==='map') toggleMap();
    if(a==='options') openOptions();
    if(a==='pause'||(k==='escape'&&G.state!=='map')) togglePause();
    if(k==='escape'&&G.state==='map') toggleMap();
    if(k==='m'&&!a) toggleMute(); });
  addEventListener('keyup',e=>{ keys[(e.key||'').toLowerCase()]=false; });
  const hold=(el,set)=>{ if(!el) return; const on=e=>{ e.preventDefault(); try{ el.setPointerCapture(e.pointerId); }catch(_){} set(true); el.classList.add('down'); }, off=e=>{ e.preventDefault(); set(false); el.classList.remove('down'); };
    el.addEventListener('pointerdown',on); el.addEventListener('pointerup',off); el.addEventListener('pointercancel',off); el.addEventListener('pointerleave',off); };
  hold($('tL'),v=>touchL=v); hold($('tR'),v=>touchR=v); hold($('tUp'),v=>touchUp=v); hold($('tDn'),v=>touchDn=v);
  $('tBoost').addEventListener('pointerdown',e=>{ e.preventDefault(); tryBoost(); });
  addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; touchL=touchR=touchUp=touchDn=false; if(G.state==='drive') togglePause(); });
  document.addEventListener('visibilitychange',()=>{ if(document.hidden&&G.state==='drive') togglePause();
    try{ if(document.hidden){ Audio_.ctx&&Audio_.ctx.suspend(); } else { keepAwake(); if(G.state!=='pause') Audio_.resume(); } }catch(_){} });
  UI.dialog.addEventListener('click',()=>advance());
  // a tap or click anywhere on the picture also continues the conversation (not only on the text box)
  $('gfx').addEventListener('pointerup',()=>{ if(!UI.dialog.hidden&&G.state==='talk') advance(); });
  $('dlgSkip').addEventListener('click',e=>{ e.stopPropagation(); skipDialog(); });
  $('btnMute').onclick=toggleMute; $('btnOptTitle').onclick=()=>openOptions('title'); $('btnOptPause').onclick=()=>openOptions('pause'); $('optClose').onclick=()=>closeOptions();
  document.querySelectorAll('#optTabs button').forEach(b=>b.onclick=()=>{ optTab=b.dataset.tab; rebinding=null; renderOptions(); });
  $('btnContinue').onclick=()=>{ if(!G.ready) return; const s=readSlot('auto'); let ok=false; try{ ok=!!s&&restore(s); }catch(e){ showErr(e); }
    if(ok){ $('title').hidden=true; toast('Weiter, wo ihr aufgehört habt'); } else { toast('Der Spielstand ließ sich nicht laden. Ein neues Spiel beginnt.'); $('title').hidden=true; try{ startGame(); }catch(e){ $('title').hidden=false; showErr(e); return; } }
    soft(()=>{ Audio_.init(); Audio_.resume(); }); soft(goImmersive); graceFor(3000); };
  if(readSlot('auto')) $('btnContinue').hidden=false; $('btnPause').onclick=()=>togglePause(); $('btnResume').onclick=()=>togglePause();
  $('btnMap').onclick=()=>toggleMap(); $('btnSwap').onclick=()=>swapCar(); $('lbSend').onclick=()=>lbSubmit(); $('lbName').addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter') lbSubmit(); }); $('lbName').addEventListener('keyup',e=>e.stopPropagation()); $('btnView').onclick=()=>cycleView(); $('mapClose').onclick=()=>toggleMap();
  $('btnReset').onclick=()=>{ $('pauseO').hidden=true; G.state='drive'; backOnRoad(G.player); toast('Zurück auf die Straße'); };
  $('btnRestart').onclick=()=>{ $('pauseO').hidden=true; startGame(); };
  $('btnAgain').onclick=()=>{ $('endO').hidden=true; startGame(); };
  $('btnFree').onclick=()=>freeRoam();
  $('btnRethink').onclick=()=>{ $('endO').hidden=true; G.state='talk'; G.camMode='finale'; LM.lit=false; say(STORY.finale.slice(-1)); };
  // starting must never leave an empty screen: the game starts first, comfort features (fullscreen, sound) may fail without harm
  const soft=f=>{ try{ f(); }catch(e){ showErr(e); } };
  $('btnStart').onclick=()=>{ if(!G.ready) return; $('title').hidden=true; try{ startGame(); }catch(e){ $('title').hidden=false; showErr(e); return; } soft(()=>{ Audio_.init(); Audio_.resume(); Audio_.setMood(0); }); soft(goImmersive); graceFor(3000); };
  const best=loadBest(); if(best>0) $('bestLbl').textContent='Hellster Lichtturm bisher: '+best+' Funken';
  const al=$('album'); [['assets/panel_belval.jpg','Belval','-3deg'],['assets/panel_bar.jpg','Le Pont Violet','2deg'],['assets/glutplatz.jpg','Glutplatz, Eindhoven','-1deg'],['assets/monaco.jpg','Monte-Carlo','2.5deg']].forEach(([src,cap,r])=>{
    const f=document.createElement('figure'); f.className='polaroid'; f.style.setProperty('--r',r); const im=document.createElement('img'); im.src=src; im.alt=cap; im.loading='lazy'; f.appendChild(im); const s=document.createElement('span'); s.textContent=cap; f.appendChild(s); al.appendChild(f); });
}
/* put a car back on the middle of the nearest street, pointing along it (used by the pause menu and when the car is wedged) */
function backOnRoad(p){ let best=null,bd=1e9; for(const r of roadsList){ const qx=clamp(p.x,r.x0,r.x1), qz=clamp(p.z,r.z0,r.z1); const d=Math.hypot(qx-p.x,qz-p.z); if(d<bd){ bd=d; best=r; } } if(!best) return;
  const alongX=(best.x1-best.x0)>(best.z1-best.z0), fx=-Math.sin(p.h), fz=-Math.cos(p.h);
  if(alongX){ p.z=(best.z0+best.z1)/2; p.x=clamp(p.x,best.x0+3,best.x1-3); p.h=fx>=0?-Math.PI/2:Math.PI/2; } else { p.x=(best.x0+best.x1)/2; p.z=clamp(p.z,best.z0+3,best.z1-3); p.h=fz>=0?Math.PI:0; }
  p.v=0; p.lat=0; p.steer=0; G.camYaw=p.h; }
function nearestRoadPoint(x,z){ let best=null,bd=1e9; for(const r of roadsList){ const qx=clamp(x,r.x0+2,r.x1-2), qz=clamp(z,r.z0+2,r.z1-2); const d=Math.hypot(qx-x,qz-z); if(d<bd){ bd=d; best={x:qx,z:qz}; } } return best||{x,z}; }
function skipDialog(){ if(dlg.cur&&dlg.cur.choices){ dlg.shown=dlg.cur.t.length; return; } const ci=dlg.queue.findIndex(l=>l.choices);
  if(ci>=0){ dlg.queue=dlg.queue.slice(ci); nextLine(); dlg.shown=dlg.cur.t.length; } else { dlg.queue=[]; nextLine(); } }
let wakeL=null; function keepAwake(){ try{ if(isTouch&&navigator.wakeLock&&!document.hidden) navigator.wakeLock.request('screen').then(l=>{ wakeL=l; }).catch(()=>{}); }catch(_){} }
/* must run inside a tap handler: fullscreen hides the address bar, the orientation lock only works in fullscreen */
function goImmersive(){ if(!isTouch) return; try{ const d=document.documentElement, p=d.requestFullscreen&&d.requestFullscreen({navigationUI:'hide'});
    if(p&&p.then) p.then(()=>{ try{ screen.orientation.lock('landscape').catch(()=>{}); }catch(_){} }).catch(()=>{}); }catch(_){} keepAwake(); }
function toggleMute(){ SET.snd.mute=!SET.snd.mute; saveSettings(); Audio_.setMuted(SET.snd.mute); $('btnMute').textContent=SET.snd.mute?'✕':'♪'; }
function togglePause(){ if(G.state==='drive'){ G.state='pause'; $('pauseO').hidden=false; UI.bark.classList.remove('show'); Audio_.setEngine(0,false); }
  else if(G.state==='pause'){ G.state='drive'; $('pauseO').hidden=true; Audio_.resume(); } }
function toggleMap(){ if(G.state==='drive'){ G.state='map'; UI.mapO.hidden=false; drawBigMap(); } else if(G.state==='map'){ G.state='drive'; UI.mapO.hidden=true; } }

(async()=>{
  // Nothing may be started before the world exists: the buttons stay locked and show the loading step until boot has finished.
  const lockBtns=['btnStart','btnContinue','btnOptTitle'], startLabel=$('btnStart').textContent; const tLoad=performance.now(); const TIPS=['<b>Driften:</b> Umschalt-Taste halten, am Handy bremsen und lenken zugleich.','<b>Auto wechseln:</b> Neben einem geparkten Wagen anhalten, dann C oder ⇄.','<b>Lichtstoß:</b> Fünf Funken sammeln, dann Leertaste oder LICHT.','<b>Kamera:</b> Mit V oder ◉ sitzt ihr im Wagen statt dahinter.','<b>Karte:</b> K zeigt beide Städte und den Weg zum Ziel.','<b>Spielstand:</b> Unter Optionen könnt ihr in die Cloud sichern und am Handy weiterspielen.'];
  let tipN=(Math.random()*TIPS.length)|0; const showTip=()=>{ const el=$('ldTip'); if(el) el.innerHTML=TIPS[tipN++%TIPS.length]; }; showTip(); const tipT=setInterval(showTip,3800);
  const step=async(t,pct)=>{ $('btnStart').textContent=t; const st=$('ldStep'); if(st){ st.textContent=t; $('ldBar').style.width=pct+'%'; $('ldPct').textContent=pct+' %'; $('ldBarWrap').setAttribute('aria-valuenow',pct); } await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0))); };
  for(const id of lockBtns){ const b=$(id); if(b) b.disabled=true; }
  try{ initUI(); await step('Grafik wird gestartet …',8); await initGPU($('gfx')); loadSettings(); /* after initGPU: the adapter info is needed to choose the first-run preset */ await step('Fahrzeuge werden geladen …',30); initModels(); await step('Die Städte werden gebaut …',48); buildWorld({lamp:[1,.72,.42]}); genCafes(); await step('Karte wird gezeichnet …',86); buildMapImage();
    R.scale=SET.gfx.scale*Math.min(window.devicePixelRatio||1,SET.gfx.dprCap||1.5); applySettings();
    if(R.fallback&&!window.__manual) setTimeout(()=>{ if(!window.__manual) toast('Hinweis: Dein Browser rechnet die Grafik ohne Grafikchip. Das Spiel passt sich an, bleibt aber langsamer.'); },2500);
    placeAtStart(); G.state='title'; G.camMode='orbit'; G.hour=18.6; await step('Bereit',100); requestAnimationFrame(t=>{ last=t; frame(t); });
    // the loading screen stays for a moment even on fast machines, then fades into the title
    const wait=window.__manual?0:Math.max(0,2600-(performance.now()-tLoad)); setTimeout(()=>{ G.ready=true; $('btnStart').textContent=startLabel; for(const id of lockBtns){ const b=$(id); if(b) b.disabled=false; } clearInterval(tipT); const L=$('loadO'); if(L){ L.classList.add('done'); setTimeout(()=>{ L.hidden=true; },800); } },wait); }
  catch(e){ console.error(e); clearInterval(tipT); { const L=$('loadO'); if(L) L.hidden=true; } $('title').hidden=true; $('errO').hidden=false; if(/WGSL|Pipeline/.test(String(e.message))) $('errText').textContent='Interner Grafikfehler: '+e.message; }
})();

function cycleView(){ G.view=((G.view||0)+1)%3; toast(['Kamera: hinter dem Auto','Kamera: am Armaturenbrett','Kamera: Stoßstange'][G.view]); }

if('serviceWorker' in navigator&&location.protocol==='https:'&&!/claude/.test(location.hostname)){ addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); }); }

/* errors become visible on the screen (small box, bottom right), so a screenshot is enough to report them */
function showErr(e){ try{ let b=document.getElementById('errBox'); if(!b){ b=document.createElement('div'); b.id='errBox'; b.style.cssText='position:fixed;right:8px;bottom:8px;z-index:99;max-width:70vw;padding:8px 10px;border-radius:10px;background:rgba(120,20,20,.92);color:#fff;font:12px/1.35 ui-monospace,monospace;white-space:pre-wrap;pointer-events:none'; document.body.appendChild(b); }
    const m=(e&&(e.message||e.reason&&(e.reason.message||e.reason)))||String(e); const st=e&&e.stack?String(e.stack).split('\n').slice(1,3).join('\n').replace(/https?:\/\/[^ )]*\//g,''):''; if(b.textContent.length<600) b.textContent+=(b.textContent?'\n':'')+'Fehler: '+m+(st?'\n'+st:''); }catch(_){} }
addEventListener('error',e=>showErr(e.error||e)); addEventListener('unhandledrejection',e=>showErr(e));
addEventListener('resize',()=>graceFor(2500)); document.addEventListener('fullscreenchange',()=>graceFor(2500)); document.addEventListener('visibilitychange',()=>graceFor(3000));
