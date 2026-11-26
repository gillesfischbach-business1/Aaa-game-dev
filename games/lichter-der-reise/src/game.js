/* ===== Open-world game: time of day, player, missions, events, camera, HUD ===== */
const $=id=>document.getElementById(id);
// ---------- time of day (natural light keyframes, linear HDR) ----------
const ENV_K={
 night:{sunCol:[.16,.2,.32],shadow:.55,skyTop:[.006,.009,.03],skyHor:[.045,.042,.09],skyGround:[.01,.01,.015],ambTop:[.028,.032,.06],ambBot:[.012,.01,.016],fog:.0016,stars:1,clouds:.35,sunSize:.0008,windows:1.0,wet:.45,exposure:1.55,sat:1.08,tint:[.97,.98,1.04],lamps:1},
 blue:{sunCol:[.5,.3,.35],shadow:.3,skyTop:[.02,.04,.12],skyHor:[.3,.18,.25],skyGround:[.03,.03,.05],ambTop:[.06,.07,.13],ambBot:[.03,.025,.035],fog:.0017,stars:.6,clouds:.4,sunSize:0,windows:1.0,wet:.3,exposure:1.35,sat:1.1,tint:[1,.98,1.02],lamps:1},
 dawn:{sunCol:[2.6,1.3,.7],shadow:.8,skyTop:[.08,.14,.32],skyHor:[.95,.55,.42],skyGround:[.06,.05,.05],ambTop:[.15,.17,.26],ambBot:[.08,.06,.06],fog:.0018,stars:.15,clouds:.5,sunSize:.004,windows:.6,wet:.3,exposure:1.0,sat:1.06,tint:[1.02,.99,.97],lamps:.7},
 morning:{sunCol:[4.6,4.0,3.3],shadow:.9,skyTop:[.12,.28,.62],skyHor:[.55,.66,.8],skyGround:[.1,.1,.1],ambTop:[.32,.4,.55],ambBot:[.18,.16,.13],fog:.0011,stars:0,clouds:.5,sunSize:.003,windows:.05,wet:.05,exposure:.6,sat:1.04,tint:[1,1,1],lamps:0},
 noon:{sunCol:[5.2,4.8,4.3],shadow:.9,skyTop:[.1,.26,.62],skyHor:[.55,.68,.85],skyGround:[.1,.1,.1],ambTop:[.36,.44,.6],ambBot:[.2,.18,.15],fog:.001,stars:0,clouds:.55,sunSize:.003,windows:.03,wet:.03,exposure:.55,sat:1.04,tint:[1,1,1],lamps:0},
 afternoon:{sunCol:[4.6,3.6,2.6],shadow:.9,skyTop:[.1,.22,.5],skyHor:[.72,.66,.64],skyGround:[.1,.09,.09],ambTop:[.3,.34,.46],ambBot:[.18,.14,.11],fog:.0012,stars:0,clouds:.55,sunSize:.0035,windows:.1,wet:.05,exposure:.62,sat:1.05,tint:[1.02,1,.97],lamps:0},
 dusk:{sunCol:[3.4,1.65,.8],shadow:.9,skyTop:[.07,.13,.32],skyHor:[1.0,.5,.28],skyGround:[.06,.05,.05],ambTop:[.2,.22,.32],ambBot:[.09,.065,.05],fog:.0018,stars:.15,clouds:.55,sunSize:.004,windows:.75,wet:.1,exposure:.95,sat:1.05,tint:[1.02,.99,.96],lamps:.8}
};
const KEYS=[[0,'night'],[5.0,'night'],[6.1,'dawn'],[8,'morning'],[12.5,'noon'],[16.5,'afternoon'],[18.7,'dusk'],[19.9,'blue'],[21,'night'],[24,'night']];
const envCur=JSON.parse(JSON.stringify(ENV_K.dusk)); envCur.sunDir=[-1,.1,.3]; envCur.rain=0;
function envAt(hour,out){ hour=((hour%24)+24)%24; let a=KEYS[0],b=KEYS[1]; for(let i=0;i<KEYS.length-1;i++) if(hour>=KEYS[i][0]&&hour<=KEYS[i+1][0]){ a=KEYS[i]; b=KEYS[i+1]; break; }
  const t=smooth((hour-a[0])/Math.max(1e-3,b[0]-a[0])); const A=ENV_K[a[1]], B=ENV_K[b[1]];
  for(const k in A){ if(Array.isArray(A[k])) out[k]=A[k].map((v,j)=>lerp(v,B[k][j],t)); else out[k]=lerp(A[k],B[k],t); }
  const th=(hour-6)/12*Math.PI; let sd=[Math.cos(th),Math.sin(th)*.82,.35];
  if(sd[1]<.03){ const m=(hour+6)/12*Math.PI; sd=[Math.cos(m)*.6,Math.max(.25,Math.abs(Math.sin(m))*.6),.45]; }
  const l=Math.hypot(...sd); out.sunDir=sd.map(v=>v/l); return out; }

// ---------- models ----------
let VAN_P, SUP_P, PEOPLE_SUP, PEOPLE_VAN=null, VAL_SUP, LEO_STAND, MIRA_STAND;
function standing(who){ const p=[]; const dark=[.03,.03,.04];
  if(who==='leo'){ for(const s of [-1,1]){ p.push(['rbox',s*.11,.06,.03,.13,.12,.3,MAT.STD+.6,[.85,.85,.82],0]); p.push(['rbox',s*.11,.1,.05,.135,.05,.31,MAT.STD+.6,[.05,.05,.05],0]);
      p.push(['rbox',s*.11,.5,0,.16,.75,.17,MAT.STD+.95,[.5,.5,.52],0]); p.push(['rbox',s*.24,1.2,-.02,.13,.55,.15,MAT.STD+.8,[.08,.09,.12],0]); }
    p.push(['rbox',0,.95,0,.36,.25,.22,MAT.STD+.95,[.48,.48,.5],0]); p.push(['rbox',0,1.27,0,.46,.62,.27,MAT.STD+.8,[.08,.09,.12],0]);
    p.push(['cylY',0,1.6,0,.3,.14,.27,MAT.STD+.98,[.42,.36,.28],0]); p.push(['head',0,1.8,0,.2,.25,.22,MAT.SKIN,COL.skin,0]);
    p.push(['head',0,1.71,-.04,.19,.13,.17,MAT.STD+.95,dark,0]); p.push(['head',0,1.93,.01,.22,.17,.23,MAT.STD+.95,[.06,.06,.07],0]);
  } else { for(const s of [-1,1]){ p.push(['rbox',s*.1,.05,.03,.11,.1,.26,MAT.STD+.6,[.9,.9,.88],0]); p.push(['rbox',s*.1,.48,0,.14,.74,.15,MAT.STD+.85,[.12,.16,.26],0]); p.push(['rbox',s*.23,1.15,-.02,.12,.5,.14,MAT.STD+.98,[.28,.18,.11],0]); }
    p.push(['rbox',0,1.2,0,.42,.62,.25,MAT.STD+.98,[.28,.18,.11],0]); p.push(['head',0,1.7,0,.19,.24,.21,MAT.SKIN,COL.skin2,0]);
    p.push(['head',0,1.78,.03,.215,.18,.23,MAT.STD+.9,[.22,.12,.06],0]); p.push(['head',0,1.92,.08,.13,.12,.13,MAT.STD+.9,[.22,.12,.06],0]); p.push(['box',0,1.71,-.1,.19,.07,.02,MAT.STD+.3,[.85,.5,.6],0]); }
  return compileParts(p,MESHIDX); }
function valPerson(x,y,z){ return [['rbox',x,y-.25,z,.5,.45,.32,MAT.STD+.8,[.85,.84,.8],0],['head',x,y+.08,z,.2,.25,.22,MAT.SKIN,[.72,.5,.38],0],['head',x,y+.17,z+.02,.22,.14,.24,MAT.STD+.6,[.75,.75,.74],0],['box',x,y+.1,z-.1,.19,.06,.02,MAT.STD+.2,[.02,.02,.02],0]]; }
function initModels(){ VAN_P=compileParts(vanPartsB(),MESHIDX); SUP_P=compileParts(supPartsB(),MESHIDX);
  const seatL=blenderParts('leo_seat'), seatM=blenderParts('mira_seat');
  if(seatL&&seatM){ const pp=(x,y,z)=>[...blenderParts('leo_seat',-.33,y,z,Math.PI),...blenderParts('mira_seat',.33,y,z,Math.PI)];
    PEOPLE_SUP=compileParts(pp(0,.08,.25),MESHIDX); PEOPLE_VAN=compileParts(pp(0,.22,-.4),MESHIDX); VAL_SUP=compileParts(valPerson(-.32,.76,.3),MESHIDX);
    const sl=blenderParts('leo_stand',0,0,0,Math.PI), sm=blenderParts('mira_stand',0,0,0,Math.PI); LEO_STAND=compileParts(sl,MESHIDX); MIRA_STAND=compileParts(sm,MESHIDX); return; }
  PEOPLE_SUP=compileParts([...personParts('leo',-.32,.76,.3),...personParts('mira',.32,.76,.3)],MESHIDX); VAL_SUP=compileParts(valPerson(-.32,.76,.3),MESHIDX);
  LEO_STAND=standing('leo'); MIRA_STAND=standing('mira'); }
function drawParts(parts,X,Y,Z,yaw,o={}){ const c=Math.cos(yaw), s=Math.sin(yaw), pitch=o.pitch||0, roll=o.roll||0, spin=o.spin||0, steer=o.steer||0;
  for(const q of parts){ let [m,x,y,z,sx,sy,sz,mat,r,g,b,p,rx,ry,rz,slot,tag]=q;
    if(tag==='spin'){ rx+=spin; if(z<0) ry+=steer; }
    else { y+=-z*pitch+x*roll; rz+=-roll; rx-=pitch; if(tag==='tail') p*=o.brake?2.6:1; if(tag==='head') p*=o.headOn===false?0.05:1; }
    P(m,X+x*c+z*s,Y+y,Z-x*s+z*c,yaw+ry,sx,sy,sz,mat,r,g,b,p,rx,rz,slot); } }
function carParts(car){ return car==='fidele'?VAN_P:SUP_P; }
function drawCar(c,people,lightsOn){ drawParts(carParts(c.car),c.x,0,c.z,c.h,{pitch:c.pitch,roll:c.roll,spin:-c.spin,steer:c.steer,brake:c.brake,headOn:lightsOn});
  if(people){ const pp=c.car==='smaragd'?people:(people===PEOPLE_SUP?PEOPLE_VAN:null); if(pp) drawParts(pp,c.x,0,c.z,c.h,{pitch:c.pitch,roll:c.roll}); }
  const fx=-Math.sin(c.h), fz=-Math.cos(c.h); const L=c.car==='fidele'?2.1:2.3; const k=envCur.lamps;
  if(lightsOn) Lt(c.x+fx*(L+5),.9,c.z+fz*(L+5),26*k+2,22*k+2,16*k+1.5,22);
  Lt(c.x-fx*L,.6,c.z-fz*L,c.brake?6:1.2,.05,.02,5); }

// ---------- state ----------
const G={ state:'title', time:0, hour:18.6, timeScale:1/90, light:0, total:0, boosts:0, hits:0, boostT:0, flash:0, shake:0, mission:-1, event:null, eventT:0, eventGot:0, dyn:[], parts:[],
  camMode:'orbit', endT:0, player:null, parked:null, camYaw:0, choiceGood:null, regionMood:-1, barkT:30, standAt:null, finalePos:null };
function burst(x,y,z,n,col,speed,life,size,grav=-6,em=6){ for(let i=0;i<n;i++){ if(G.parts.length>700) G.parts.shift(); const a=Math.random()*Math.PI*2, b=rr(-.2,1);
  G.parts.push({x,y,z,vx:Math.cos(a)*speed*rr(.3,1),vy:b*speed*rr(.4,1.1),vz:Math.sin(a)*speed*rr(.3,1),life:life*rr(.6,1),max:life,s:size*rr(.6,1.2),col,em,g:grav}); } }

// ---------- dialog ----------
const UI={};
function bindUI(){ for(const id of ['hud','lightN','boostHint','bark','barkText','barkAv','dialog','dlgAv','dlgName','dlgText','choices','dlgHint','touch','fade','photo','photoImg','photoCap','speedN','clock','objTitle','objText','objDist','objArrow','obj','mini','mapO','mapC','toast','carName']) UI[id]=$(id); }
const AV={ leo:'<img src="assets/leo.jpg" alt="">', mira:'<img src="assets/mira.jpg" alt="">',
 val:`<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#0f2a22"/><path d="M12 64c2-12 10-17 20-17s18 5 20 17z" fill="#e9e4da"/><path d="M28 47l4 8 4-8z" fill="#0d5c44"/><ellipse cx="32" cy="30" rx="12.5" ry="15" fill="#c99574"/><path d="M19 27c0-12 6-17 13-17s14 5 13 17c-3-6-7-8-13-8s-10 2-13 8z" fill="#c8c4bd"/><rect x="21" y="27" width="9" height="5" rx="2" fill="#101418"/><rect x="34" y="27" width="9" height="5" rx="2" fill="#101418"/><path d="M30 29h4" stroke="#101418" stroke-width="1.5"/><path d="M27 41q5 2 10-1" stroke="#7a4a3a" stroke-width="1.6" fill="none"/></svg>`,
 narr:`<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#1a1420"/><circle cx="32" cy="32" r="10" fill="#ffd27a"/><circle cx="32" cy="32" r="18" fill="none" stroke="#ff8a3d" stroke-width="1.5" opacity=".6"/><circle cx="32" cy="32" r="25" fill="none" stroke="#ff8a3d" stroke-width="1" opacity=".3"/></svg>` };
let dlg={queue:[],cur:null,shown:0,done:null,typing:false};
function say(lines,done){ dlg.queue=lines.slice(); dlg.done=done; UI.dialog.hidden=false; nextLine(); }
function nextLine(){ const l=dlg.queue.shift();
  if(!l){ UI.dialog.hidden=true; UI.photo.classList.remove('show'); const d=dlg.done; dlg.done=null; dlg.cur=null; d&&d(); return; }
  dlg.cur=l; dlg.shown=0; dlg.typing=true; UI.dlgAv.innerHTML=AV[l.w]||AV.narr; UI.dlgName.textContent=NAMES[l.w]||''; UI.dlgText.className=l.w==='narr'?'narr':''; UI.dlgText.textContent='';
  UI.choices.hidden=true; UI.choices.innerHTML=''; UI.dlgHint.hidden=false;
  if(l.img){ if(UI.photoImg.getAttribute('src')!==l.img){ UI.photoImg.src=l.img; UI.photo.classList.remove('show'); void UI.photo.offsetWidth; } UI.photoCap.textContent=l.cap||''; UI.photo.classList.add('show'); }
  else UI.photo.classList.remove('show'); }
function advance(){ if(!dlg.cur) return; if(dlg.cur.choices&&!dlg.typing) return; if(dlg.typing){ dlg.shown=dlg.cur.t.length; return; } nextLine(); }
function tickDialog(dt){ if(!dlg.cur||!dlg.typing) return; dlg.shown=Math.min(dlg.cur.t.length,dlg.shown+dt*SET.game.textSpeed); UI.dlgText.textContent=dlg.cur.t.slice(0,Math.floor(dlg.shown));
  if(dlg.shown>=dlg.cur.t.length){ dlg.typing=false; UI.dlgText.textContent=dlg.cur.t;
    if(dlg.cur.choices){ UI.dlgHint.hidden=true; UI.choices.hidden=false; UI.choices.innerHTML='';
      dlg.cur.choices.forEach((c,i)=>{ const b=document.createElement('button'); b.className=i===0?'btn':'btn ghost'; b.textContent=c.label; b.id='choice'+i;
        b.onclick=e=>{ e&&e.stopPropagation&&e.stopPropagation(); UI.dialog.hidden=true; UI.photo.classList.remove('show'); dlg.cur=null; dlg.queue=[]; c.fn(); }; UI.choices.appendChild(b); });
      setTimeout(()=>{ const f=$('choice0'); f&&f.focus&&f.focus(); },30); } } }
let barkTimer=0;
function bark(w,t){ UI.barkAv.innerHTML=AV[w]||AV.narr; UI.barkText.innerHTML=''; const b=document.createElement('b'); b.textContent=NAMES[w]; UI.barkText.appendChild(b); UI.barkText.appendChild(document.createTextNode(t)); UI.bark.classList.add('show'); barkTimer=4.5; }
let toastT=0; function toast(t){ UI.toast.textContent=t; UI.toast.classList.add('show'); toastT=2.6; }

// ---------- flow ----------
function fadeTo(v,ms=600){ UI.fade.style.transitionDuration=ms+'ms'; UI.fade.style.opacity=v; return new Promise(r=>setTimeout(r,ms)); }
function placeAtStart(){ const b=LM.belval; G.player=newCar('fidele',b.x-8,b.z,Math.PI/2); G.parked=newCar('smaragd',b.x+4,b.z-.5,Math.PI/2); G.camYaw=G.player.h; }
function startGame(){ G.light=0; G.total=0; G.boosts=0; G.hits=0; for(const s of sparksAll) s.alive=true; LM.lit=false; G.dyn=[]; TRAFFIC.length=0;
  placeAtStart(); G.hour=18.6; G.mission=-1; G.event=null; G.state='talk'; G.camMode='orbit'; UI.hud.hidden=true;
  say(STORY.prologue.concat(STORY.tut),()=>{ nextMission(); }); }
function nextMission(){ G.mission++; setTimeout(autosave,500); G.state='drive'; G.camMode='chase'; UI.hud.hidden=false; UI.touch.classList.toggle('on',isTouch);
  const M=MISSIONS[G.mission];
  if(M){ UI.objTitle.textContent=M.title; UI.objText.textContent=M.text; toast('Neues Ziel: '+M.title); }
  else { UI.objTitle.textContent='Freie Fahrt'; UI.objText.textContent='Erkundet beide Städte und sammelt alle Funken.'; } }
function reachMission(){ const M=MISSIONS[G.mission]; G.state='talk'; G.camMode='orbit'; Audio_.chime();
  if(M.time!==undefined) G.hour=M.time;
  if(M.event==='glow'){ say(STORY.glowStart,()=>startGlow()); return; }
  if(M.finale){ finale(); return; }
  say(STORY[M.lines],()=>nextMission()); }
function startGlow(){ G.state='drive'; G.camMode='chase'; G.event='glow'; G.eventT=70; G.eventGot=0; envCur.rain=1;
  const g=LM.glow; for(let k=0;k<45;k++) G.dyn.push({type:'spark',x:rr(g.x0+4,g.x1-4),y:1.1,z:rr(g.z0+4,g.z1-4),ph:Math.random()*6,alive:true});
  UI.objTitle.textContent='GLOW: Der Glutplatz'; }
function endGlow(){ G.event=null; G.dyn=[]; envCur.rain=0; G.state='talk'; G.camMode='standing'; G.standAt={x:LM.glow.x,z:LM.glow.z};
  say(STORY.glowEnd,()=>{ G.hour=5.6; nextMission(); }); }
function finale(){ G.camMode='finale'; G.state='talk'; UI.hud.hidden=true; UI.touch.classList.remove('on'); const L=LM.licht;
  G.finalePos={x:L.x,z:L.z+20}; const pl=G.player; pl.x=L.x+5; pl.z=L.z+22; pl.h=Math.PI/2; pl.v=0; G.parked=newCar(pl.car==='fidele'?'smaragd':'fidele',L.x-4,L.z+21,Math.PI/2+.1);
  say(STORY.finale); }
function ending(good){ G.choiceGood=good; G.state='ending';
  if(good){ G.camMode='ignite'; G.endT=0; LM.lit=true; Audio_.chime(); saveBest(G.light); say(STORY.goodEnd(G.light),()=>setTimeout(()=>showEnd(true),300)); }
  else { G.camMode='dark'; say(STORY.badEnd,()=>showEnd(false)); } }
function showEnd(good){ $('endO').hidden=false; $('btnRethink').hidden=good; $('albumWrap').hidden=!good; $('btnFree').hidden=!good;
  const stars=G.light>=250?3:G.light>=140?2:1;
  if(good){ $('endEyebrow').textContent='Epilog'; $('endTitle').textContent='Beide Städte leuchten.';
    $('endText').textContent='Es ist nicht der Wagen, der dich ans Ziel bringt. Es ist der Mensch, der neben dir sitzt. Die Welt bleibt offen: Fahrt weiter, sammelt die restlichen Funken und entdeckt Luxemburg und Eindhoven bei Tag.';
    $('endStats').innerHTML=`<div><b>${G.light}</b><small>Funken entzündet</small></div><div><b>${G.total}</b><small>gesammelt</small></div><div><b>${G.boosts}</b><small>Lichtstöße</small></div><div><span class="stars">${'★'.repeat(stars)}<span class="dim">${'★'.repeat(3-stars)}</span></span><small>Leuchtkraft</small></div>`;
  } else { $('endEyebrow').textContent='Ein anderes Ende'; $('endTitle').textContent='Manche Dinge kann man nicht kaufen.';
    $('endText').textContent='Der Lichtturm bleibt dunkel, und der schnellste Wagen der Welt bringt euch nirgendwohin, wo ihr hinwollt. Vielleicht verdient diese Geschichte ein anderes Ende.'; $('endStats').innerHTML=''; }
  setTimeout(()=>{ const b=$(good?'btnFree':'btnRethink'); b&&b.focus&&b.focus(); },50); }
function freeRoam(){ $('endO').hidden=true; G.mission=MISSIONS.length-1; G.hour=9; G.camMode='chase'; nextMission(); }
function loadBest(){ try{ return +localStorage.getItem('ldr_best3')||0 }catch(e){ return 0 } }
function saveBest(v){ try{ if(v>loadBest()) localStorage.setItem('ldr_best3',String(v)) }catch(e){} }
function swapCar(){ const pl=G.player; if(G.state!=='drive') return; if(Math.abs(pl.v)>3){ toast('Zum Wechseln erst anhalten'); return; }
  const other=G.parked&&Math.hypot(G.parked.x-pl.x,G.parked.z-pl.z)<40?G.parked:null; const name=pl.car==='fidele'?'smaragd':'fidele';
  const left=newCar(pl.car,pl.x,pl.z,pl.h); const rx=Math.cos(pl.h), rz=-Math.sin(pl.h);
  G.player=newCar(name,other?other.x:pl.x+rx*3.4,other?other.z:pl.z+rz*3.4,other?other.h:pl.h); G.parked=left; G.camYaw=G.player.h;
  toast(name==='smaragd'?'Ihr fahrt jetzt den Smaragd':'Ihr fahrt jetzt Fidèle'); Audio_.chime(); }
function tryBoost(){ if(G.boostT>0||G.light<5||G.state!=='drive') return; G.light-=5; G.boosts++; G.boostT=2.5; Audio_.boost(); burst(G.player.x,1,G.player.z,30,[1,.85,.4],9,.8,.14,0,8); }

// ---------- input ----------
const keys={}; let touchL=false,touchR=false,touchUp=false,touchDn=false,gpA=false;
const isTouch=(typeof matchMedia!=='undefined'&&matchMedia('(pointer:coarse)').matches)||(typeof window!=='undefined'&&'ontouchstart' in window);
function readInput(){ const K=SET.ctl.keys; let s=0,th=0,br=0; if(keys['arrowleft']||keys[K.left]||touchL) s-=1; if(keys['arrowright']||keys[K.right]||touchR) s+=1;
  if(keys['arrowup']||keys[K.up]||touchUp) th=1; if(keys['arrowdown']||keys[K.down]||touchDn) br=1;
  const gps=navigator.getGamepads?navigator.getGamepads():[]; for(const gp of gps){ if(gp&&gp.connected){ if(Math.abs(gp.axes[0])>SET.ctl.deadzone) s=gp.axes[0]; const rt=gp.buttons[7]?gp.buttons[7].value:0, lt=gp.buttons[6]?gp.buttons[6].value:0; if(rt>.05) th=rt; if(lt>.05) br=lt;
    const a=gp.buttons[0]&&gp.buttons[0].pressed; if(a&&!gpA) tryBoost(); gpA=a; } }
  return [clamp(s*SET.ctl.steer,-1,1),th,br]; }

// ---------- update ----------
function update(dt){
  G.time+=dt; if(G.state==='drive'&&!G.event) G.hour+=dt*G.timeScale; if(G.hour>=24) G.hour-=24;
  const rain=envCur.rain||0; envAt(G.hour,envCur); envCur.rain=rain; if(!SET.gfx.shadows) envCur.shadow=0; if(G.event==='glow'){ envCur.wet=1; envCur.fog=Math.max(envCur.fog,.004); }
  if(LM.lit) envCur.windows*=1.3;
  if(barkTimer>0){ barkTimer-=dt; if(barkTimer<=0) UI.bark.classList.remove('show'); }
  if(toastT>0){ toastT-=dt; if(toastT<=0) UI.toast.classList.remove('show'); }
  tickDialog(dt);
  for(let i=G.parts.length-1;i>=0;i--){ const p=G.parts[i]; p.life-=dt; if(p.life<=0){ G.parts.splice(i,1); continue; } p.vy+=p.g*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt; if(p.y<.05){ p.y=.05; p.vy*=-.3; p.vx*=.7; p.vz*=.7; } }
  G.flash=Math.max(0,G.flash-dt*2.5); G.shake=Math.max(0,G.shake-dt*2.2);
  const pl=G.player; if(!pl) return;
  if(G.state==='drive'){
    const [s,th,br]=readInput(); G.boostT=Math.max(0,G.boostT-dt);
    const hit=stepCar(pl,th,br,s,dt,G.boostT>0); if(hit>3){ G.shake=Math.min(1,hit/14); Audio_.noiseHit(.25,900,clamp(hit/20,.1,.5)); }
    if(Math.random()<dt*2) spawnTraffic(pl.x,pl.z); updateTraffic(dt,pl); updateHumans(dt,pl);
    const cx=Math.floor(pl.x/CELL), cz=Math.floor(pl.z/CELL), mag=pl.car==='fidele'?2.6:1.8;
    for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++){ const c=cells.get((cx+i)+','+(cz+j)); if(!c||!c.sparks) continue; for(const sp of c.sparks){ if(sp.alive&&Math.hypot(sp.x-pl.x,sp.z-pl.z)<mag+1){ sp.alive=false; collect(sp.x,sp.z); } } }
    for(const o of G.dyn){ if(o.alive===false) continue;
      if(o.type==='spark'){ if(Math.hypot(o.x-pl.x,o.z-pl.z)<mag+1){ o.alive=false; collect(o.x,o.z); if(G.event==='glow') G.eventGot++; } }
      else if(o.type==='orb'){ if(!o.landed){ o.vy-=22*dt; o.y+=o.vy*dt; if(o.y<=o.r*.8){ o.y=o.r*.8; o.landed=true; o.life=6; burst(o.x,.5,o.z,45,[1,.45,.1],9,1,.15,-9,10); const d=Math.hypot(o.x-pl.x,o.z-pl.z); if(d<35){ Audio_.boom(clamp(1-d/35,.2,1)); G.shake=Math.max(G.shake,.4*(1-d/35)); } } }
        else { o.life-=dt; if(o.life<=0) o.alive=false; }
        if(o.y<2.8&&Math.hypot(o.x-pl.x,o.z-pl.z)<o.r+1.4&&!o.hitDone){ o.hitDone=true; if(G.boostT>0){ o.alive=false; burst(o.x,o.y,o.z,40,[1,.6,.2],10,.9,.15); } else { G.light=Math.max(0,G.light-3); G.hits++; G.flash=1; G.shake=1; pl.v*=.4; Audio_.hit(); toast('Glut! −3 Funken'); } } } }
    G.dyn=G.dyn.filter(o=>o.alive!==false);
    if(G.event==='glow'){ G.eventT-=dt; UI.objText.textContent='Sammelt Funken auf dem Platz: '+G.eventGot+' / 25 · noch '+Math.ceil(G.eventT)+' s';
      if(Math.random()<dt*1.2){ const fx=-Math.sin(pl.h), fz=-Math.cos(pl.h); const g=LM.glow; const lead=clamp(pl.v,4,20)*1.6; const tx=clamp(pl.x+fx*lead+rr(-6,6),g.x0-10,g.x1+10), tz=clamp(pl.z+fz*lead+rr(-6,6),g.z0-10,g.z1+10);
        G.dyn.push({type:'orb',x:tx,z:tz,y:28,vy:-6,r:rr(.9,1.4),alive:true,landed:false,ph:Math.random()*6}); }
      if(G.eventGot>=25||G.eventT<=0) endGlow(); }
    else { const M=MISSIONS[G.mission]; if(M){ const t=M.target(); if(t&&Math.hypot(t.x-pl.x,t.z-pl.z)<M.r) reachMission(); } }
    G.routeT=(G.routeT||0)-dt; if(G.routeT<=0){ G.routeT=.7; const t=currentTarget(); G.route=t?findRoute(pl.x,pl.z,t.x,t.z):[]; }
    G.barkT-=dt; if(G.barkT<=0){ G.barkT=rr(35,60); const b=pick(BARKS_FREE); bark(b[0],b[1]); }
    const mood=pl.x>MOTORWAY.x1?2:pl.x>MOTORWAY.x0?3:pl.z>200?0:1; if(mood!==G.regionMood){ G.regionMood=mood; Audio_.setMood(mood); }
    Audio_.updateCar(pl.car,pl.v,th,br,true,dt); Audio_.ambience(G.hour,envCur.rain||0,(pl.x>MOTORWAY.x0&&pl.x<MOTORWAY.x1)?'motorway':'city');
    G.saveT=(G.saveT||0)+dt; if(G.saveT>60){ G.saveT=0; autosave(); }
  } else { Audio_.updateCar(pl.car,0,0,0,G.state==='talk'||G.state==='map',dt); G.endT+=dt; pl.v*=Math.max(0,1-dt*3); }
  if(G.camMode==='ignite'&&G.endT>3&&Math.random()<dt*1.6){ const L=LM.licht; burst(L.x+rr(-60,60),rr(35,60),L.z+rr(-60,60),80,pick([[1,.75,.3],[1,.4,.6],[.5,.7,1],[1,.9,.6]]),10,1.9,.3,-3,14); Audio_.boom(.2); }
  updateHUD();
}
function collect(x,z){ G.light++; G.total++; Audio_.pickup(G.light%6); burst(x,1.1,z,8,[1,.85,.4],4,.5,.07,2,9); }
function updateHUD(){ const pl=G.player; UI.lightN.textContent=G.light; UI.speedN.textContent=Math.round(Math.abs(pl.v)*(SET.ctl.unit==='mph'?2.237:3.6)); $('speedU').textContent=SET.ctl.unit==='mph'?'mph':'km/h'; const hh=Math.floor(G.hour), mm=Math.floor((G.hour-hh)*60);
  UI.clock.textContent=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0'); UI.carName.textContent=pl.car==='fidele'?'Fidèle':'Smaragd';
  UI.boostHint.textContent=G.boostT>0?'Lichtstoß aktiv':(G.light>=5?'Lichtstoß bereit':'Lichtstoß ab 5');
  const t=currentTarget();
  if(t){ const dx=t.x-pl.x, dz=t.z-pl.z; UI.objDist.textContent=Math.round(Math.hypot(dx,dz))+' m'; const ang=Math.atan2(dx,-dz)+pl.h; UI.objArrow.style.transform='rotate('+ang+'rad)'; UI.objArrow.hidden=false; }
  else { UI.objDist.textContent=G.total+' / '+sparksAll.length+' Funken'; UI.objArrow.hidden=true; }
  drawMinimap(); }
function currentTarget(){ if(G.event==='glow') return LM.glow; const M=MISSIONS[G.mission]; return M?M.target():null; }

// ---------- minimap ----------
let mapImg=null; const MAPS=.42, MAPB={x0:-480,z0:-480,x1:2300,z1:480};
function buildMapImage(){ try{ const w=Math.ceil((MAPB.x1-MAPB.x0)*MAPS), h=Math.ceil((MAPB.z1-MAPB.z0)*MAPS); const cv=(typeof OffscreenCanvas!=='undefined')?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
  const g=cv.getContext('2d'); if(!g) return; g.fillStyle='#1b2418'; g.fillRect(0,0,w,h);
  const col={block:'#3a3530',park:'#24402a',industry:'#4a3326',valley:'#14301c',water:'#1d4a66',plaza:'#7a3a18',road:'#9a968e'};
  for(const k of ['block','park','industry','valley','water','plaza','road']) for(const r of mapItems) if(r.kind===k){ g.fillStyle=col[k]; g.fillRect((r.x0-MAPB.x0)*MAPS,(r.z0-MAPB.z0)*MAPS,Math.max(1,(r.x1-r.x0)*MAPS),Math.max(1,(r.z1-r.z0)*MAPS)); }
  g.fillStyle='rgba(255,255,255,.75)'; g.font='bold 22px Arial'; g.fillText('LUXEMBURG',(-120-MAPB.x0)*MAPS,(-440-MAPB.z0)*MAPS+18); g.fillText('EINDHOVEN',(1820-MAPB.x0)*MAPS,(-360-MAPB.z0)*MAPS); mapImg=cv; }catch(e){ mapImg=null; } }
function drawMinimap(){ const c=UI.mini; if(!c||!c.getContext||!mapImg) return; const g=c.getContext('2d'); if(!g) return; const W=c.width, H=c.height, pl=G.player, z=1.6;
  g.save(); g.clearRect(0,0,W,H); g.beginPath(); g.arc(W/2,H/2,W/2,0,7); g.clip(); g.fillStyle='#1b2418'; g.fillRect(0,0,W,H);
  g.translate(W/2,H/2); g.rotate(pl.h); g.scale(z,z); g.drawImage(mapImg,-(pl.x-MAPB.x0)*MAPS,-(pl.z-MAPB.z0)*MAPS);
  const t=currentTarget(); if(t){ if(G.route&&G.route.length){ g.strokeStyle='rgba(255,210,122,.9)'; g.lineWidth=3/z; g.beginPath(); g.moveTo(0,0); for(const n of G.route) g.lineTo((n.x-pl.x)*MAPS,(n.z-pl.z)*MAPS); g.lineTo((t.x-pl.x)*MAPS,(t.z-pl.z)*MAPS); g.stroke(); }
    g.fillStyle='#ffd27a'; g.beginPath(); g.arc((t.x-pl.x)*MAPS,(t.z-pl.z)*MAPS,6/z,0,7); g.fill(); }
  if(G.parked){ g.fillStyle=G.parked.car==='smaragd'?'#35c48a':'#ffffff'; g.fillRect((G.parked.x-pl.x)*MAPS-2,(G.parked.z-pl.z)*MAPS-2,4,4); }
  g.restore(); g.fillStyle='#ffd27a'; g.beginPath(); g.moveTo(W/2,H/2-8); g.lineTo(W/2-5,H/2+6); g.lineTo(W/2+5,H/2+6); g.closePath(); g.fill(); }
function drawBigMap(){ const c=UI.mapC; if(!c||!mapImg) return; const g=c.getContext('2d'); const W=c.width=Math.min(1100,innerWidth-32), H=c.height=Math.round(W*(MAPB.z1-MAPB.z0)/(MAPB.x1-MAPB.x0));
  g.drawImage(mapImg,0,0,W,H); const s=W/(MAPB.x1-MAPB.x0), pl=G.player, X=x=>(x-MAPB.x0)*s, Z=z=>(z-MAPB.z0)*s;
  const t=currentTarget(); if(t){ if(G.route&&G.route.length){ g.strokeStyle='#ffd27a'; g.lineWidth=3; g.beginPath(); g.moveTo(X(pl.x),Z(pl.z)); for(const n of G.route) g.lineTo(X(n.x),Z(n.z)); g.lineTo(X(t.x),Z(t.z)); g.stroke(); } g.fillStyle='#ffd27a'; g.beginPath(); g.arc(X(t.x),Z(t.z),7,0,7); g.fill(); }
  g.save(); g.translate(X(pl.x),Z(pl.z)); g.rotate(-pl.h); g.fillStyle='#ff6f91'; g.beginPath(); g.moveTo(0,-9); g.lineTo(-6,7); g.lineTo(6,7); g.closePath(); g.fill(); g.restore(); }

// ---------- frame ----------
const cam={pos:[0,3,8],tgt:[0,1,-10],fov:58}; const _camCols=[];
function drawStatic(o,t,lampK,lights){ let y=o.y; if(o.bob!==undefined) y+=Math.sin(t*.8+o.bob)*.4; let p=o.p;
  if(o.mat===MAT.EMI&&o.L&&o.bob===undefined) p*=Math.max(.06,lampK);
  if(o===LM.lichtTop) p=LM.lit?18:.25;
  if(o.blink) p=(t%1.5)<.15?8:.2;
  if(o.turbine){ const a=t*1.2+o.turbine.ph; for(let k=0;k<3;k++) P(MESHIDX.box,o.turbine.x,o.turbine.y,o.turbine.z,0,.9,22,.25,MAT.STD+.4,.92,.92,.94,.3,0,a+k*2.094); }
  P(o.m,o.x,y,o.z,o.ry,o.sx,o.sy,o.sz,o.mat,o.r,o.g,o.b,p,o.rx,o.rz,o.slot);
  if(lights&&o.L){ const k=(o.mat===MAT.EMI&&o.bob===undefined)?lampK:1; if(k>.05) Lt(o.L.x,o.L.y+(y-o.y),o.L.z,o.L.r*k,o.L.g*k,o.L.b*k,o.L.rad); } }
function buildFrame(){
  const t=G.time, E=envCur, pl=G.player; if(!pl) return;
  // camera first, so culling uses this frame's camera
  const V=VEH[pl.car], sh=G.shake*.35;
  let dy=pl.h-G.camYaw; while(dy>Math.PI) dy-=2*Math.PI; while(dy<-Math.PI) dy+=2*Math.PI; G.camYaw+=dy*Math.min(1,(1/60)*(pl.v<-1?1:4.5));
  if(G.camMode==='chase'){ const ch=V.cam[0]*SET.ctl.camHeight, cd=V.cam[1]*SET.ctl.camDist; const back=cd+Math.abs(pl.v)*.05; const sx=Math.sin(G.camYaw), sz=Math.cos(G.camYaw);
    // keep the camera out of buildings: march from the car towards the wanted position
    let tHit=1; for(let k=1;k<=14;k++){ const tt=k/14; const px=pl.x+sx*back*tt, pz=pl.z+sz*back*tt; colsNear(px,pz,_camCols);
      let inside=false; for(const b of _camCols){ if(Math.min(b.x1-b.x0,b.z1-b.z0)>3&&px>b.x0-.5&&px<b.x1+.5&&pz>b.z0-.5&&pz<b.z1+.5){ inside=true; break; } } if(inside){ tHit=Math.max(.22,tt-.1); break; } }
    G.camK=tHit<(G.camK||1)?tHit:lerp(G.camK||1,tHit,.04);
    const bk=back*G.camK; cam.pos=[pl.x+sx*bk+rr(-sh,sh),ch*lerp(1.25,1,G.camK)+Math.abs(pl.v)*.012+rr(-sh,sh),pl.z+sz*bk]; cam.tgt=[pl.x-sx*14,1.2,pl.z-sz*14]; cam.fov=lerp(cam.fov,56+SET.gfx.fov+(G.boostT>0?10:0)+Math.abs(pl.v)*.16,.08); }
  else if(G.camMode==='orbit'){ const a=G.time*.1; cam.pos=[pl.x+Math.sin(a)*10,2.6,pl.z+Math.cos(a)*10]; cam.tgt=[pl.x,1.1,pl.z]; cam.fov=50; }
  else if(G.camMode==='standing'){ const s=G.standAt, a=Math.sin(G.time*.15)*.35; cam.pos=[s.x+Math.sin(a)*6.5,1.4,s.z-Math.cos(a)*6.5]; cam.tgt=[s.x,3.0,s.z]; cam.fov=58; }
  else { const f=G.finalePos||{x:pl.x,z:pl.z}; const L=LM.licht;
    if(G.camMode==='ignite'){ const k=smooth(clamp(G.endT/6,0,1)); cam.pos=[f.x+lerp(4,10,k),lerp(1.8,9,k),f.z+lerp(11,32,k)]; cam.tgt=[lerp(f.x-1,L.x,k),lerp(1.4,40,k),lerp(f.z+2,L.z,k)]; cam.fov=lerp(48,62,k); }
    else { const b=G.endT*.03; cam.pos=[f.x+4+Math.sin(b),1.8,f.z+11]; cam.tgt=[f.x-1,1.4,f.z+2]; cam.fov=48; } }
  const ccx=cam.pos[0], ccz=cam.pos[2]; const RAD=SET.gfx.viewDist, RS=Math.min(230,RAD*.45), gx=Math.floor(ccx/CELL), gz=Math.floor(ccz/CELL), nR=Math.ceil(RAD/CELL);
  const fx=cam.tgt[0]-ccx, fz=cam.tgt[2]-ccz, fl=Math.hypot(fx,fz)||1; const lampK=E.lamps;
  for(const o of globalStatics) drawStatic(o,t,lampK,false);
  for(let i=-nR;i<=nR;i++) for(let j=-nR;j<=nR;j++){ const c=cells.get((gx+i)+','+(gz+j)); if(!c) continue;
    const ox=(gx+i+.5)*CELL-ccx, oz=(gz+j+.5)*CELL-ccz; const d=Math.hypot(ox,oz); if(d>RAD+CELL) continue;
    if(d>110&&(ox*fx+oz*fz)/(d*fl)<-.35) continue;
    const near=d<RS+CELL;
    for(const o of c){ if(o.small&&!near) continue; drawStatic(o,t,lampK,d<220); }
    if(c.sparks) for(const s of c.sparks){ if(!s.alive) continue; const y=s.y+Math.sin(t*3+s.ph)*.18; P(MESHIDX.sph,s.x,y,s.z,0,.36,.36,.36,MAT.EMI,1,.78,.35,14); if(d<120) Lt(s.x,y,s.z,5,3.4,1.2,6); } }
  const lightsOn=E.lamps>.3;
  drawCar(pl,PEOPLE_SUP,lightsOn);
  if(G.parked) drawCar(G.parked,G.state==='drive'?null:VAL_SUP,false);
  for(const c of TRAFFIC){ drawParts(c.parts,c.x,0,c.z,c.h,{spin:-c.spin,headOn:lightsOn}); if(Math.hypot(c.x-cam.pos[0],c.z-cam.pos[2])<90){ const cs=Math.cos(c.h), sn=Math.sin(c.h); const lx=-.38, lz=.15; if(!c.look) c.look=pedLook();
    P(MESHIDX.head,c.x+lx*cs+lz*sn,1.2,c.z-lx*sn+lz*cs,c.h,.19,.23,.21,MAT.SKIN,...c.look.skin,0); P(MESHIDX.head,c.x+lx*cs+(lz+.02)*sn,1.28,c.z-lx*sn+(lz+.02)*cs,c.h,.21,.14,.23,MAT.STD+.85,...c.look.hair,0); P(MESHIDX.rbox,c.x+lx*cs+(lz+.05)*sn,.88,c.z-lx*sn+(lz+.05)*cs,c.h,.42,.42,.24,MAT.STD+.9,...c.look.top,0); } }
  drawHumans(cam.pos[0],cam.pos[2]);
  if(G.boostT>0){ Lt(pl.x,1.5,pl.z,30,22,10,10); for(let i=0;i<3;i++) P(MESHIDX.sphLo,pl.x+rr(-1,1),rr(.4,2.2),pl.z+rr(-1,1),0,.12,.12,rr(.6,1.6),MAT.EMI,1,.8,.4,10); }
  const M=MISSIONS[G.mission]; const tg=G.state==='drive'&&!G.event&&M?M.target():null;
  if(tg){ const pulse=.6+.4*Math.sin(t*3); P(MESHIDX.cylY,tg.x,40,tg.z,0,2.2,80,2.2,MAT.EMI,1,.78,.35,1.2*pulse); P(MESHIDX.cylY,tg.x,.15,tg.z,0,M.r*1.4,.04,M.r*1.4,MAT.EMI,1,.7,.3,.8*pulse); Lt(tg.x,3,tg.z,40,28,10,24); }
  for(const o of G.dyn){
    if(o.type==='spark'){ const y=o.y+Math.sin(t*3+o.ph)*.18; P(MESHIDX.sph,o.x,y,o.z,0,.36,.36,.36,MAT.EMI,1,.78,.35,14); }
    else if(o.type==='orb'){ P(MESHIDX.sph,o.x,o.y,o.z,t*.3+o.ph,o.r*2,o.r*2,o.r*2,MAT.LAVA,1,1,1,1.0); Lt(o.x,o.y+.5,o.z,110,38,8,o.landed?18:24);
      if(!o.landed){ const pulse=.5+.5*Math.sin(t*14); const sz=o.r*2.6*(1.25-o.y/32); P(MESHIDX.cylY,o.x,.12,o.z,0,sz,.02,sz,MAT.EMI,1,.12,.05,2+pulse*5);
        for(let k=1;k<4;k++) P(MESHIDX.sphLo,o.x,o.y+k*1.3,o.z,0,o.r*1.2/k,o.r*1.2/k,o.r*1.2/k,MAT.EMI,1,.45,.1,4/k); } } }
  for(const p of G.parts){ const f=p.life/p.max; P(MESHIDX.sphLo,p.x,p.y,p.z,0,p.s,p.s,p.s,MAT.EMI,p.col[0],p.col[1],p.col[2],p.em*f); }
  if(E.rain>.05){ for(let i=0;i<240;i++){ const h=(i*7919)%1000/1000, h2=(i*104729)%1000/1000; const fall=((t*24+h*40)%22); P(MESHIDX.box,cam.pos[0]+(h-.5)*36,20-fall,cam.pos[2]+(h2-.5)*36,.3,.02,.9,.02,MAT.EMI,.7,.62,.6,1.1*E.rain,.08,0); } }
  if(G.camMode==='standing'){ const s=G.standAt; drawParts(LEO_STAND,s.x,0,s.z,Math.PI,{});
    for(const [ox,oy,oz,r] of [[-4.5,7.5,3,1.5],[0,9.5,4,2.1],[4.2,7,2.5,1.4],[-7,5.5,1,1.1],[7.5,5.8,0,1.2],[-2.5,6,6,1],[2.6,10.5,8,1.6]]){ const y=oy+Math.sin(G.time*.8+ox)*.3;
      P(MESHIDX.sph,s.x+ox,y,s.z+oz,G.time*.2,r*2,r*2,r*2,MAT.LAVA,1,1,1,.55); Lt(s.x+ox,y-.5,s.z+oz,90,30,6,18); } }
  if((G.camMode==='finale'||G.camMode==='ignite')&&G.finalePos){ const f=G.finalePos; drawParts(LEO_STAND,f.x-.2,0,f.z+3.6,-2.6,{}); drawParts(MIRA_STAND,f.x-.9,0,f.z+3.8,-2.4,{});
    if(LM.lit){ const L=LM.licht, k=clamp(G.endT/3,0,1); Lt(L.x,57,L.z,700*k,800*k,1000*k,160); const b=G.endT*.8; P(MESHIDX.box,L.x+Math.sin(b)*60,57,L.z+Math.cos(b)*60,b,1,1,120,MAT.EMI,.8,.9,1,3*k); } }
}

// ---------- loop ----------
let last=0, acc=0, frames=0, adaptT=0;
function frame(now){
  const dtRaw=Math.max(0,(now-last)/1000); last=now; const dt=Math.min(.05,dtRaw);
  if(window.__manual){ last=now; requestAnimationFrame(frame); return; }
  if(G.state!=='pause'&&G.state!=='map') update(dt);
  try{ buildFrame(); const pl=G.player||{x:0,z:0}; const dark=G.camMode==='dark';
    renderFrame(cam,envCur,G.time,{exposure:envCur.exposure*(dark?.55:1)*Math.pow(2,SET.gfx.exposure),bloom:.045*SET.gfx.bloom,flash:G.flash*.6,fade:0,sat:envCur.sat*(dark?.45:1),tint:envCur.tint,vignette:SET.gfx.vignette?.5:0,grain:SET.gfx.grain?.018:0},[pl.x-Math.sin(G.camYaw)*14,0,pl.z-Math.cos(G.camYaw)*14],window.__snapReq||null);
    window.__snapReq=null; }catch(e){ console.error(e); }
  acc+=dtRaw; frames++; adaptT+=dtRaw;
  if(adaptT>2.5){ const avg=acc/frames; const fb=$('fpsBox'); if(fb&&!fb.hidden) fb.textContent=Math.round(1/avg)+' FPS · '+R.W+'×'+R.H; if(!SET.gfx.adaptive){ acc=0; frames=0; adaptT=0; } else if(avg>.026&&R.scale>.5){ R.scale=Math.max(.5,R.scale*.82); R.needResize=true; } else if(avg<.012&&R.scale<R.maxScale){ R.scale=Math.min(R.maxScale,R.scale*1.12); R.needResize=true; } acc=0; frames=0; adaptT=0; }
  requestAnimationFrame(frame); }
function onDeviceLost(info){ $('errText').textContent='Die Grafikkarte wurde zurückgesetzt ('+(info.message||info.reason)+'). Bitte lade die Seite neu.'; $('errO').hidden=false; }

/* test hook: render exactly one frame and wait until the GPU has finished it */
async function renderNow(snapCb){ buildFrame(); const pl=G.player||{x:0,z:0}; const dark=G.camMode==='dark';
  renderFrame(cam,envCur,G.time,{exposure:envCur.exposure*(dark?.55:1)*Math.pow(2,SET.gfx.exposure),bloom:.045*SET.gfx.bloom,flash:G.flash*.6,fade:0,sat:envCur.sat*(dark?.45:1),tint:envCur.tint,vignette:SET.gfx.vignette?.5:0,grain:SET.gfx.grain?.018:0},[pl.x-Math.sin(G.camYaw)*14,0,pl.z-Math.cos(G.camYaw)*14],snapCb||null);
  await R.device.queue.onSubmittedWorkDone(); }
