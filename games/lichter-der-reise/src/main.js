/* ===== Boot, UI wiring, input ===== */
function initUI(){
  bindUI();
  addEventListener('keydown',e=>{ const k=(e.key||'').toLowerCase(); keys[k]=true;
    if([' ','arrowleft','arrowright','arrowup','arrowdown'].includes(k)) e.preventDefault&&e.preventDefault();
    if(!UI.dialog.hidden&&(k===' '||k==='enter')){ advance(); return; }
    if(k==='escape'&&!UI.dialog.hidden&&dlg.cur&&!dlg.cur.choices){ skipDialog(); return; }
    if(k===' '&&G.state==='play') tryBoost();
    if((k==='p'||k==='escape')&&(G.state==='play'||G.state==='pause')) togglePause();
    if(k==='m') toggleMute(); });
  addEventListener('keyup',e=>{ keys[(e.key||'').toLowerCase()]=false; });
  const hold=(el,set)=>{ if(!el) return; const on=e=>{ e.preventDefault(); set(true); el.classList.add('down'); }, off=e=>{ e.preventDefault(); set(false); el.classList.remove('down'); };
    el.addEventListener('pointerdown',on); el.addEventListener('pointerup',off); el.addEventListener('pointercancel',off); el.addEventListener('pointerleave',off); };
  hold($('tL'),v=>touchL=v); hold($('tR'),v=>touchR=v); hold($('tUp'),v=>touchUp=v); hold($('tDn'),v=>touchDn=v);
  $('tBoost').addEventListener('pointerdown',e=>{ e.preventDefault(); if(G.state==='play') tryBoost(); });
  addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; touchL=touchR=touchUp=touchDn=false; if(G.state==='play') togglePause(); });
  document.addEventListener('visibilitychange',()=>{ if(document.hidden&&G.state==='play') togglePause(); });
  UI.dialog.addEventListener('click',()=>advance());
  $('dlgSkip').addEventListener('click',e=>{ e.stopPropagation(); skipDialog(); });
  $('btnMute').onclick=toggleMute; $('btnPause').onclick=()=>togglePause(); $('btnResume').onclick=()=>togglePause();
  $('btnRestartCh').onclick=()=>{ $('pauseO').hidden=true; startChapter(G.chapter,true); };
  $('btnSwitchCar').onclick=()=>{ $('pauseO').hidden=true; G.light=G.lightAtStart; showCarSelect(G.chapter); };
  $('btnRetry').onclick=()=>{ $('crashO').hidden=true; startChapter(G.chapter,true); };
  $('btnAgain').onclick=()=>{ $('endO').hidden=true; G.light=0; G.total=0; G.hits=0; G.boosts=0; stageScene(0,'showroom',0); showCarSelect(0); };
  $('btnRethink').onclick=()=>{ $('endO').hidden=true; G.state='cutscene'; G.camMode='finale'; setEnv(3,false); say(STORY.finale.slice(-1)); };
  $('pick-fidele').onclick=()=>pickCar('fidele'); $('pick-smaragd').onclick=()=>pickCar('smaragd');
  $('btnStart').onclick=()=>{ Audio_.init(); Audio_.resume(); $('title').hidden=true; G.light=0; G.total=0; G.hits=0; G.boosts=0; G.state='intro'; Audio_.setMood(0);
    say(STORY.prologue.concat(STORY.tut),()=>{ stageScene(0,'showroom',0); showCarSelect(0); }); };
  const best=loadBest(); if(best>0) $('bestLbl').textContent='Hellstes Leuchtfeuer bisher: '+best+' Funken';
  // ending album
  const al=$('album'); [['assets/panel_belval.jpg','Belval','-3deg'],['assets/panel_bar.jpg','Die Bar','2deg'],['assets/glutplatz.jpg','Der Glutplatz','-1deg'],['assets/monaco.jpg','Monte-Carlo','2.5deg']].forEach(([src,cap,r])=>{
    const f=document.createElement('figure'); f.className='polaroid'; f.style.setProperty('--r',r); const im=document.createElement('img'); im.src=src; im.alt=cap; im.loading='lazy'; f.appendChild(im); const s=document.createElement('span'); s.textContent=cap; f.appendChild(s); al.appendChild(f); });
}
function skipDialog(){ if(dlg.cur&&dlg.cur.choices){ dlg.shown=dlg.cur.t.length; return; } const ci=dlg.queue.findIndex(l=>l.choices);
  if(ci>=0){ dlg.queue=dlg.queue.slice(ci); nextLine(); dlg.shown=dlg.cur.t.length; } else { dlg.queue=[]; nextLine(); } }
function toggleMute(){ Audio_.setMuted(!Audio_.muted); $('btnMute').textContent=Audio_.muted?'✕':'♪'; }
function togglePause(){ if(G.state==='play'){ G.state='pause'; $('pauseO').hidden=false; UI.chapCard.classList.remove('show'); UI.bark.classList.remove('show'); barkT=0; Audio_.setEngine(0,false); }
  else if(G.state==='pause'){ G.state='play'; $('pauseO').hidden=true; Audio_.resume(); } }

(async()=>{
  try{ initUI(); await initGPU($('gfx')); initModels(); R.maxScale=Math.min(window.devicePixelRatio||1,isTouch?1.5:1.75); R.scale=R.maxScale; R.needResize=true;
    stageScene(0,'orbit',0); G.state='title'; requestAnimationFrame(t=>{ last=t; frame(t); }); }
  catch(e){ console.error(e); $('title').hidden=true; $('errO').hidden=false; if(/WGSL|Pipeline/.test(String(e.message))) $('errText').textContent='Interner Grafikfehler: '+e.message; }
})();
