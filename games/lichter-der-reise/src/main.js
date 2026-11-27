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
  $('dlgSkip').addEventListener('click',e=>{ e.stopPropagation(); skipDialog(); });
  $('btnMute').onclick=toggleMute; $('btnOptTitle').onclick=()=>openOptions('title'); $('btnOptPause').onclick=()=>openOptions('pause'); $('optClose').onclick=()=>closeOptions();
  document.querySelectorAll('#optTabs button').forEach(b=>b.onclick=()=>{ optTab=b.dataset.tab; rebinding=null; renderOptions(); });
  $('btnContinue').onclick=()=>{ const s=readSlot('auto'); if(s){ goImmersive(); Audio_.init(); Audio_.resume(); $('title').hidden=true; restore(s); toast('Weiter, wo ihr aufgehört habt'); } };
  if(readSlot('auto')) $('btnContinue').hidden=false; $('btnPause').onclick=()=>togglePause(); $('btnResume').onclick=()=>togglePause();
  $('btnMap').onclick=()=>toggleMap(); $('btnSwap').onclick=()=>swapCar(); $('btnView').onclick=()=>cycleView(); $('mapClose').onclick=()=>toggleMap();
  $('btnReset').onclick=()=>{ $('pauseO').hidden=true; G.state='drive'; const p=G.player; const n=nearestRoadPoint(p.x,p.z); p.x=n.x; p.z=n.z; p.v=0; p.lat=0; toast('Zurück auf die Straße'); };
  $('btnRestart').onclick=()=>{ $('pauseO').hidden=true; startGame(); };
  $('btnAgain').onclick=()=>{ $('endO').hidden=true; startGame(); };
  $('btnFree').onclick=()=>freeRoam();
  $('btnRethink').onclick=()=>{ $('endO').hidden=true; G.state='talk'; G.camMode='finale'; LM.lit=false; say(STORY.finale.slice(-1)); };
  $('btnStart').onclick=()=>{ goImmersive(); Audio_.init(); Audio_.resume(); $('title').hidden=true; Audio_.setMood(0); startGame(); };
  const best=loadBest(); if(best>0) $('bestLbl').textContent='Hellster Lichtturm bisher: '+best+' Funken';
  const al=$('album'); [['assets/panel_belval.jpg','Belval','-3deg'],['assets/panel_bar.jpg','Le Pont Violet','2deg'],['assets/glutplatz.jpg','Glutplatz, Eindhoven','-1deg'],['assets/monaco.jpg','Monte-Carlo','2.5deg']].forEach(([src,cap,r])=>{
    const f=document.createElement('figure'); f.className='polaroid'; f.style.setProperty('--r',r); const im=document.createElement('img'); im.src=src; im.alt=cap; im.loading='lazy'; f.appendChild(im); const s=document.createElement('span'); s.textContent=cap; f.appendChild(s); al.appendChild(f); });
}
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
  try{ initUI(); await initGPU($('gfx')); loadSettings(); /* after initGPU: the adapter info is needed to choose the first-run preset */ initModels(); buildWorld({lamp:[1,.72,.42]}); genCafes(); buildMapImage();
    R.scale=SET.gfx.scale*Math.min(window.devicePixelRatio||1,SET.gfx.dprCap||1.5); applySettings();
    placeAtStart(); G.state='title'; G.camMode='orbit'; G.hour=18.6; requestAnimationFrame(t=>{ last=t; frame(t); }); }
  catch(e){ console.error(e); $('title').hidden=true; $('errO').hidden=false; if(/WGSL|Pipeline/.test(String(e.message))) $('errText').textContent='Interner Grafikfehler: '+e.message; }
})();

function cycleView(){ G.view=((G.view||0)+1)%3; toast(['Kamera: hinter dem Auto','Kamera: am Armaturenbrett','Kamera: Stoßstange'][G.view]); }

if('serviceWorker' in navigator&&location.protocol==='https:'&&!/claude/.test(location.hostname)){ addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); }); }
