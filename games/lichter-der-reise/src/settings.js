/* ===== Settings, key bindings, save games, options menu ===== */
const PRESETS={
 niedrig:{scale:.6,shadows:0,msaa:false,viewDist:340,bloom:.6,traffic:8},
 mittel:{scale:.85,shadows:1024,msaa:false,viewDist:450,bloom:1,traffic:12},
 hoch:{scale:1.0,shadows:2048,msaa:true,viewDist:560,bloom:1,traffic:16},
 ultra:{scale:1.5,shadows:4096,msaa:true,viewDist:720,bloom:1.15,traffic:22}};
const DEFAULTS={
 gfx:{preset:'hoch',scale:1.0,adaptive:true,shadows:2048,msaa:true,viewDist:560,bloom:1,exposure:0,fov:0,vignette:true,grain:true,traffic:16,fps:false},
 snd:{master:.85,music:.45,engine:.8,fx:.8,amb:.6,mute:false},
 ctl:{keys:{up:'w',down:'s',left:'a',right:'d',boost:' ',swap:'c',map:'k',pause:'p',options:'o'},steer:1,camDist:1,camHeight:1,touchSize:1,deadzone:.15,unit:'kmh'},
 game:{autosave:true,timeSpeed:1,textSpeed:50}};
const ACTION_LABEL={up:'Gas',down:'Bremse / Rückwärts',left:'Links lenken',right:'Rechts lenken',boost:'Lichtstoß',swap:'Auto wechseln',map:'Karte',pause:'Pause',options:'Optionen'};
let SET=JSON.parse(JSON.stringify(DEFAULTS));
function deepMerge(a,b){ for(const k in b){ if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])){ a[k]=a[k]||{}; deepMerge(a[k],b[k]); } else a[k]=b[k]; } return a; }
function loadSettings(){ let s=null; try{ s=localStorage.getItem('ldr_settings'); }catch(e){} if(s){ try{ SET=deepMerge(JSON.parse(JSON.stringify(DEFAULTS)),JSON.parse(s)); }catch(e){} }
  else if(typeof isTouch!=='undefined'&&isTouch){ SET.gfx.preset='mittel'; Object.assign(SET.gfx,PRESETS.mittel); } }
function saveSettings(){ try{ localStorage.setItem('ldr_settings',JSON.stringify(SET)); }catch(e){} }
function keyFor(action){ return SET.ctl.keys[action]; }
function actionOfKey(k){ for(const a in SET.ctl.keys) if(SET.ctl.keys[a]===k) return a; return null; }
function keyName(k){ return k===' '?'Leertaste':k==='arrowup'?'↑':k==='arrowdown'?'↓':k==='arrowleft'?'←':k==='arrowright'?'→':k==='shift'?'Umschalt':k==='escape'?'Esc':k.length===1?k.toUpperCase():k; }
function applySettings(){
  const g=SET.gfx;
  if(R.ok){ R.maxScale=g.scale*Math.min(window.devicePixelRatio||1,1.5); if(!g.adaptive) R.scale=R.maxScale; else R.scale=Math.min(R.scale||R.maxScale,R.maxScale); R.needResize=true;
    if(g.shadows) setShadowSize(g.shadows); setMSAA(g.msaa); }
  Audio_.vol={master:SET.snd.master,music:SET.snd.music,engine:SET.snd.engine,fx:SET.snd.fx,amb:SET.snd.amb}; Audio_.muted=SET.snd.mute; Audio_.applyVolumes();
  const mb=$('btnMute'); if(mb) mb.textContent=SET.snd.mute?'✕':'♪';
  document.documentElement.style.setProperty('--touch',SET.ctl.touchSize);
  const f=$('fpsBox'); if(f) f.hidden=!g.fps;
  G.timeScale=SET.game.timeSpeed/90;
}

// ---------- save games ----------
const SLOTS=['auto','1','2','3'];
function snapshot(){ const pl=G.player; let bits=''; for(let i=0;i<sparksAll.length;i+=6){ let v=0; for(let k=0;k<6;k++) if(sparksAll[i+k]&&!sparksAll[i+k].alive) v|=1<<k; bits+=String.fromCharCode(48+v); }
  return {v:1,date:Date.now(),mission:G.mission,light:G.light,total:G.total,boosts:G.boosts,hits:G.hits,hour:G.hour,lit:!!LM.lit,
    car:pl.car,x:pl.x,z:pl.z,h:pl.h,parked:G.parked?{car:G.parked.car,x:G.parked.x,z:G.parked.z,h:G.parked.h}:null,sparks:bits}; }
function restore(s){ if(!s||s.v!==1) return false; G.light=s.light; G.total=s.total; G.boosts=s.boosts||0; G.hits=s.hits||0; G.hour=s.hour; LM.lit=!!s.lit; G.event=null; G.dyn=[]; TRAFFIC.length=0;
  for(let i=0;i<sparksAll.length;i++){ const c=s.sparks.charCodeAt(Math.floor(i/6))-48; sparksAll[i].alive=!(c>=0&&(c>>(i%6))&1); }
  G.player=newCar(s.car,s.x,s.z,s.h); G.parked=s.parked?newCar(s.parked.car,s.parked.x,s.parked.z,s.parked.h):null; G.camYaw=s.h;
  G.mission=s.mission-1; nextMission(); return true; }
function writeSlot(slot){ try{ localStorage.setItem('ldr_save_'+slot,JSON.stringify(snapshot())); return true; }catch(e){ return false; } }
function readSlot(slot){ try{ const s=localStorage.getItem('ldr_save_'+slot); return s?JSON.parse(s):null; }catch(e){ return null; } }
function deleteSlot(slot){ try{ localStorage.removeItem('ldr_save_'+slot); }catch(e){} }
function autosave(){ if(SET.game.autosave&&G.state==='drive'&&G.player) writeSlot('auto'); }
function slotLabel(s){ if(!s) return 'Leer'; const M=MISSIONS[s.mission]; const d=new Date(s.date); return (M?M.title:'Freie Fahrt')+' · '+s.light+' Funken · '+d.toLocaleDateString('de-DE')+' '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}); }

// ---------- options menu ----------
let optTab='gfx', rebinding=null, optReturn=null;
function openOptions(from){ optReturn=from||G.state; if(G.state==='drive') G.state='pause'; $('optO').hidden=false; $('pauseO').hidden=true; renderOptions(); setTimeout(()=>{ const b=document.querySelector('#optTabs button.on'); b&&b.focus&&b.focus(); },30); }
function closeOptions(){ $('optO').hidden=true; rebinding=null; saveSettings(); applySettings();
  if(optReturn==='drive'||optReturn==='pause'){ $('pauseO').hidden=false; G.state='pause'; } }
function row(label,control,hint){ return `<div class="opt-row"><label>${label}${hint?`<small>${hint}</small>`:''}</label><div class="opt-ctl">${control}</div></div>`; }
function slider(id,min,max,step,val,fmt){ return `<input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"><output for="${id}">${fmt(val)}</output>`; }
function toggle(id,on){ return `<label class="switch"><input type="checkbox" id="${id}" ${on?'checked':''}><span></span></label>`; }
function select(id,opts,val){ return `<select id="${id}">${opts.map(([v,l])=>`<option value="${v}" ${String(v)===String(val)?'selected':''}>${l}</option>`).join('')}</select>`; }
const pct=v=>Math.round(v*100)+' %';
function renderOptions(){ document.querySelectorAll('#optTabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===optTab)); const g=SET.gfx, s=SET.snd, c=SET.ctl, gm=SET.game; let h='';
  if(optTab==='gfx'){ h+=row('Qualitätsstufe',select('o_preset',[['niedrig','Niedrig'],['mittel','Mittel'],['hoch','Hoch'],['ultra','Ultra'],['custom','Benutzerdefiniert']],g.preset),'Setzt alle Werte darunter');
    h+=row('Auflösung',slider('o_scale',.5,2,.05,g.scale,v=>Math.round(v*100)+' %'),'Renderauflösung relativ zum Bildschirm');
    h+=row('Automatische Auflösung',toggle('o_adaptive',g.adaptive),'Senkt die Auflösung, wenn es ruckelt');
    h+=row('Schatten',select('o_shadows',[[0,'Aus'],[1024,'Niedrig (1024)'],[2048,'Hoch (2048)'],[4096,'Ultra (4096)']],g.shadows));
    h+=row('Kantenglättung',toggle('o_msaa',g.msaa),'4× MSAA');
    h+=row('Sichtweite',slider('o_view',250,900,10,g.viewDist,v=>v+' m'));
    h+=row('Verkehrsdichte',slider('o_traffic',0,30,1,g.traffic,v=>v+' Autos'));
    h+=row('Leuchten (Bloom)',slider('o_bloom',0,2,.05,g.bloom,pct));
    h+=row('Helligkeit',slider('o_exposure',-1.5,1.5,.1,g.exposure,v=>(v>0?'+':'')+(+v).toFixed(1)+' EV'));
    h+=row('Sichtfeld',slider('o_fov',-10,20,1,g.fov,v=>(v>0?'+':'')+v+'°'));
    h+=row('Vignette',toggle('o_vignette',g.vignette)); h+=row('Filmkorn',toggle('o_grain',g.grain)); h+=row('Bilder pro Sekunde anzeigen',toggle('o_fps',g.fps)); }
  else if(optTab==='snd'){ h+=row('Gesamtlautstärke',slider('o_master',0,1,.01,s.master,pct)); h+=row('Musik',slider('o_music',0,1,.01,s.music,pct)); h+=row('Motoren',slider('o_engine',0,1,.01,s.engine,pct),'Diesel von Fidèle, V8 des Smaragd');
    h+=row('Effekte',slider('o_fx',0,1,.01,s.fx,pct)); h+=row('Umgebung',slider('o_amb',0,1,.01,s.amb,pct),'Stadt, Regen, Wind, Grillen'); h+=row('Stumm',toggle('o_mute',s.mute)); }
  else if(optTab==='ctl'){ for(const a in ACTION_LABEL) h+=row(ACTION_LABEL[a],`<button class="keybtn" data-act="${a}">${rebinding===a?'Taste drücken …':keyName(c.keys[a])}</button>`);
    h+=row('Lenkempfindlichkeit',slider('o_steer',.5,1.5,.05,c.steer,pct)); h+=row('Kamera-Abstand',slider('o_camd',.7,1.6,.05,c.camDist,pct)); h+=row('Kamera-Höhe',slider('o_camh',.6,1.6,.05,c.camHeight,pct));
    h+=row('Touch-Tasten',slider('o_touch',.7,1.4,.05,c.touchSize,pct)); h+=row('Gamepad-Totzone',slider('o_dead',0,.4,.01,c.deadzone,pct)); h+=row('Tempo-Einheit',select('o_unit',[['kmh','km/h'],['mph','mph']],c.unit));
    h+=row('',`<button class="btn ghost" id="o_resetKeys">Steuerung zurücksetzen</button>`); }
  else { h+=row('Automatisch speichern',toggle('o_autosave',gm.autosave),'Nach jeder Mission und jede Minute'); h+=row('Tempo der Tageszeit',slider('o_timeSpeed',0,4,.25,gm.timeSpeed,v=>v==0?'angehalten':v+'×'));
    h+=row('Textgeschwindigkeit',slider('o_text',20,120,5,gm.textSpeed,v=>v+' Zeichen/s'));
    for(const sl of SLOTS){ const d=readSlot(sl); const canSave=sl!=='auto'&&G.player&&(G.state==='pause'||G.state==='drive');
      h+=row(sl==='auto'?'Autospeicher':'Platz '+sl,`<span class="slot">${slotLabel(d)}</span>${canSave?`<button class="btn ghost sm" data-save="${sl}">Speichern</button>`:''}${d?`<button class="btn ghost sm" data-load="${sl}">Laden</button><button class="btn ghost sm" data-del="${sl}">Löschen</button>`:''}`); }
    h+=row('Spielstand-Code',`<button class="btn ghost sm" id="o_export">Code anzeigen</button><button class="btn ghost sm" id="o_import">Code laden</button>`,'Zum Übertragen auf ein anderes Gerät');
    h+=`<textarea id="o_code" rows="3" placeholder="Spielstand-Code hier einfügen" hidden></textarea>`;
    h+=row('',`<button class="btn ghost" id="o_resetAll">Alle Einstellungen zurücksetzen</button>`); }
  $('optBody').innerHTML=h; bindOptions(); }
function bindOptions(){ const on=(id,ev,fn)=>{ const e=$(id); if(e) e.addEventListener(ev,fn); };
  const num=(id,set,after)=>on(id,'input',e=>{ const v=+e.target.value; set(v); const o=e.target.nextElementSibling; if(o) o.textContent=formatOut(id,v); after&&after(); applySettings(); saveSettings(); });
  const chk=(id,set)=>on(id,'change',e=>{ set(e.target.checked); applySettings(); saveSettings(); });
  const custom=()=>{ SET.gfx.preset='custom'; const p=$('o_preset'); if(p) p.value='custom'; };
  on('o_preset','change',e=>{ const p=PRESETS[e.target.value]; SET.gfx.preset=e.target.value; if(p) Object.assign(SET.gfx,p); applySettings(); saveSettings(); renderOptions(); });
  num('o_scale',v=>SET.gfx.scale=v,custom); chk('o_adaptive',v=>SET.gfx.adaptive=v); on('o_shadows','change',e=>{ SET.gfx.shadows=+e.target.value; custom(); applySettings(); saveSettings(); });
  chk('o_msaa',v=>{ SET.gfx.msaa=v; custom(); }); num('o_view',v=>SET.gfx.viewDist=v,custom); num('o_traffic',v=>SET.gfx.traffic=v,custom); num('o_bloom',v=>SET.gfx.bloom=v,custom);
  num('o_exposure',v=>SET.gfx.exposure=v); num('o_fov',v=>SET.gfx.fov=v); chk('o_vignette',v=>SET.gfx.vignette=v); chk('o_grain',v=>SET.gfx.grain=v); chk('o_fps',v=>SET.gfx.fps=v);
  for(const k of ['master','music','engine','fx','amb']) num('o_'+k,v=>SET.snd[k]=v); chk('o_mute',v=>SET.snd.mute=v);
  num('o_steer',v=>SET.ctl.steer=v); num('o_camd',v=>SET.ctl.camDist=v); num('o_camh',v=>SET.ctl.camHeight=v); num('o_touch',v=>SET.ctl.touchSize=v); num('o_dead',v=>SET.ctl.deadzone=v);
  on('o_unit','change',e=>{ SET.ctl.unit=e.target.value; saveSettings(); });
  chk('o_autosave',v=>SET.game.autosave=v); num('o_timeSpeed',v=>SET.game.timeSpeed=v); num('o_text',v=>SET.game.textSpeed=v);
  document.querySelectorAll('.keybtn').forEach(b=>b.addEventListener('click',()=>{ rebinding=b.dataset.act; renderOptions(); }));
  on('o_resetKeys','click',()=>{ SET.ctl.keys=JSON.parse(JSON.stringify(DEFAULTS.ctl.keys)); saveSettings(); renderOptions(); });
  on('o_resetAll','click',()=>{ SET=JSON.parse(JSON.stringify(DEFAULTS)); saveSettings(); applySettings(); renderOptions(); toast('Einstellungen zurückgesetzt'); });
  document.querySelectorAll('[data-save]').forEach(b=>b.addEventListener('click',()=>{ writeSlot(b.dataset.save); toast('Gespeichert in Platz '+b.dataset.save); renderOptions(); }));
  document.querySelectorAll('[data-load]').forEach(b=>b.addEventListener('click',()=>{ const s=readSlot(b.dataset.load); if(s){ $('optO').hidden=true; $('title').hidden=true; $('pauseO').hidden=true; $('endO').hidden=true; Audio_.init(); Audio_.resume(); restore(s); toast('Spielstand geladen'); } }));
  document.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{ deleteSlot(b.dataset.del); renderOptions(); }));
  on('o_export','click',()=>{ const t=$('o_code'); t.hidden=false; t.value=btoa(unescape(encodeURIComponent(JSON.stringify(G.player?snapshot():readSlot('auto')||{})))); t.select(); try{ navigator.clipboard.writeText(t.value).then(()=>toast('Code kopiert'),()=>{}); }catch(e){} });
  on('o_import','click',()=>{ const t=$('o_code'); if(t.hidden){ t.hidden=false; t.focus(); return; } try{ const s=JSON.parse(decodeURIComponent(escape(atob(t.value.trim())))); if(s.v===1){ localStorage.setItem('ldr_save_1',JSON.stringify(s)); toast('Code in Platz 1 übernommen'); renderOptions(); } else toast('Code ungültig'); }catch(e){ toast('Code ungültig'); } });
}
function formatOut(id,v){ const m={o_scale:x=>Math.round(x*100)+' %',o_view:x=>x+' m',o_traffic:x=>x+' Autos',o_exposure:x=>(x>0?'+':'')+(+x).toFixed(1)+' EV',o_fov:x=>(x>0?'+':'')+x+'°',o_timeSpeed:x=>x==0?'angehalten':x+'×',o_text:x=>x+' Zeichen/s'}; return (m[id]||pct)(v); }
function handleRebind(k){ if(!rebinding) return false; if(k!=='escape'){ const other=actionOfKey(k); if(other&&other!==rebinding) SET.ctl.keys[other]=SET.ctl.keys[rebinding]; SET.ctl.keys[rebinding]=k; saveSettings(); } rebinding=null; renderOptions(); return true; }
