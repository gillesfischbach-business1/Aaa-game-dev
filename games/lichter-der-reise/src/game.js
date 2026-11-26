/* ===== Game: state, driving physics, spawning, camera, story flow ===== */
const $=id=>document.getElementById(id);
// ---------- environments (natural light, linear HDR) ----------
const ENVS=[
 {sunDir:[.5,.13,-1],sunCol:[3.4,1.65,.8],shadow:.92,skyTop:[.07,.13,.32],skyHor:[1.0,.5,.28],skyGround:[.06,.05,.05],ambTop:[.2,.22,.32],ambBot:[.09,.065,.05],
  fog:.0022,stars:.15,clouds:.55,sunSize:.004,windows:.75,wet:.1,exposure:.95,sat:1.05,tint:[1.02,.99,.96],lamp:[1,.62,.3],rain:0},
 {sunDir:[-.5,.45,-1],sunCol:[.17,.21,.34],shadow:.65,skyTop:[.006,.009,.03],skyHor:[.05,.045,.1],skyGround:[.01,.01,.015],ambTop:[.028,.032,.06],ambBot:[.012,.01,.016],
  fog:.0024,stars:1,clouds:.3,sunSize:.0008,windows:1.0,wet:.55,exposure:1.55,sat:1.08,tint:[.97,.98,1.04],lamp:[1,.72,.42],rain:0},
 {sunDir:[0,.2,-1],sunCol:[.55,.16,.05],shadow:.35,skyTop:[.02,.005,.004],skyHor:[.3,.065,.02],skyGround:[.03,.008,.004],ambTop:[.065,.028,.02],ambBot:[.06,.022,.012],
  fog:.0065,stars:0,clouds:.95,sunSize:0,windows:.55,wet:1.0,exposure:1.15,sat:1.1,tint:[1.04,.97,.93],lamp:[1,.45,.18],rain:1},
 {sunDir:[-.78,.085,-1],sunCol:[3.4,1.6,.75],shadow:.92,skyTop:[.1,.18,.44],skyHor:[1.0,.5,.33],skyGround:[.06,.06,.08],ambTop:[.26,.26,.38],ambBot:[.13,.09,.08],
  fog:.0014,stars:.05,clouds:.55,sunSize:.005,windows:.6,wet:.05,exposure:.82,sat:1.06,tint:[1.02,1,.97],lamp:[1,.75,.45],rain:0},
 {sunDir:[-.78,.012,-1],sunCol:[1.3,.5,.32],shadow:0,skyTop:[.03,.05,.15],skyHor:[.55,.26,.3],skyGround:[.03,.03,.05],ambTop:[.07,.08,.14],ambBot:[.03,.025,.035],
  fog:.0018,stars:.75,clouds:.4,sunSize:0,windows:1.25,wet:.1,exposure:1.3,sat:1.1,tint:[1,.98,1.02],lamp:[1,.75,.45],rain:0}
];
const envCur=JSON.parse(JSON.stringify(ENVS[0])); let envFrom=null, envTo=ENVS[0], envT=1;
function setEnv(i,instant){ envFrom=JSON.parse(JSON.stringify(envCur)); envTo=ENVS[i]; envT=instant?1:0; if(instant) blendEnv(1); }
function blendEnv(t){ for(const k in envTo){ const a=envFrom?envFrom[k]:envTo[k], b=envTo[k]; if(Array.isArray(b)) envCur[k]=b.map((v,j)=>lerp(a[j],v,t)); else envCur[k]=lerp(a,b,t); } }

// ---------- cars ----------
const CARS={
 fidele:{name:'Fidèle',sub:'Citroën-Lieferwagen, Baujahr irgendwann',min:14,max:27,accel:8,steer:12,hearts:4,magnet:2.3,boost:15,half:[.86,2.1],cam:[4.1,10.8],eng:[34,1.5]},
 smaragd:{name:'Smaragd',sub:'Hypercar, smaragdgrün, VH 3107',min:20,max:41,accel:17,steer:17,hearts:3,magnet:1.4,boost:10,half:[1.0,2.35],cam:[3.2,9.6],eng:[55,2.4]}
};
let VAN_P, SUP_P, PEOPLE_SUP, VAL_SUP, VAL_VAN, LEO_STAND, MIRA_STAND;
function standing(who){ const p=[]; const dark=[.03,.03,.04];
  if(who==='leo'){ // from the photo: grey joggers, dark denim jacket, scarf, beanie, beard
    for(const s of [-1,1]){ p.push(['rbox',s*.11,.06,.03,.13,.12,.3,MAT.STD+.6,[.85,.85,.82],0]); p.push(['rbox',s*.11,.1,.05,.135,.05,.31,MAT.STD+.6,[.05,.05,.05],0]);
      p.push(['rbox',s*.11,.5,0,.16,.75,.17,MAT.STD+.95,[.5,.5,.52],0]); p.push(['rbox',s*.24,1.2,-.02,.13,.55,.15,MAT.STD+.8,[.08,.09,.12],0]); }
    p.push(['rbox',0,.95,0,.36,.25,.22,MAT.STD+.95,[.48,.48,.5],0]); p.push(['rbox',0,1.27,0,.46,.62,.27,MAT.STD+.8,[.08,.09,.12],0]);
    p.push(['cylY',0,1.6,0,.3,.14,.27,MAT.STD+.98,[.42,.36,.28],0]); p.push(['head',0,1.8,0,.2,.25,.22,MAT.SKIN,COL.skin,0]);
    p.push(['head',0,1.71,-.04,.19,.13,.17,MAT.STD+.95,dark,0]); p.push(['head',0,1.93,.01,.22,.17,.23,MAT.STD+.95,[.06,.06,.07],0]);
  } else {
    for(const s of [-1,1]){ p.push(['rbox',s*.1,.05,.03,.11,.1,.26,MAT.STD+.6,[.9,.9,.88],0]); p.push(['rbox',s*.1,.48,0,.14,.74,.15,MAT.STD+.85,[.12,.16,.26],0]); p.push(['rbox',s*.23,1.15,-.02,.12,.5,.14,MAT.STD+.98,[.28,.18,.11],0]); }
    p.push(['rbox',0,1.2,0,.42,.62,.25,MAT.STD+.98,[.28,.18,.11],0]); p.push(['head',0,1.7,0,.19,.24,.21,MAT.SKIN,COL.skin2,0]);
    p.push(['head',0,1.78,.03,.215,.18,.23,MAT.STD+.9,[.22,.12,.06],0]); p.push(['head',0,1.92,.08,.13,.12,.13,MAT.STD+.9,[.22,.12,.06],0]); p.push(['box',0,1.71,-.1,.19,.07,.02,MAT.STD+.3,[.85,.5,.6],0]);
  }
  return compileParts(p,MESHIDX); }
function valPerson(x,y,z){ return [['rbox',x,y-.25,z,.5,.45,.32,MAT.STD+.8,[.85,.84,.8],0],['head',x,y+.08,z,.2,.25,.22,MAT.SKIN,[.72,.5,.38],0],['head',x,y+.17,z+.02,.22,.14,.24,MAT.STD+.6,[.75,.75,.74],0],['box',x,y+.1,z-.1,.19,.06,.02,MAT.STD+.2,[.02,.02,.02],0]]; }
function initModels(){ VAN_P=compileParts(vanParts(),MESHIDX); SUP_P=compileParts(supParts(),MESHIDX);
  PEOPLE_SUP=compileParts([...personParts('leo',-.32,.76,.3),...personParts('mira',.32,.76,.3)],MESHIDX);
  VAL_SUP=compileParts(valPerson(-.32,.76,.3),MESHIDX); LEO_STAND=standing('leo'); MIRA_STAND=standing('mira'); }
function drawParts(parts,X,Y,Z,yaw,o={}){ const c=Math.cos(yaw), s=Math.sin(yaw), pitch=o.pitch||0, roll=o.roll||0, spin=o.spin||0, steer=o.steer||0;
  for(const q of parts){ let [m,x,y,z,sx,sy,sz,mat,r,g,b,p,rx,ry,rz,slot,tag]=q;
    if(tag==='spin'){ rx+=spin; if(z<0) ry+=steer; }
    else { y+=-z*pitch+x*roll; rx+=pitch*0; rz+=-roll; if(tag==='tail') p*=o.brake?2.6:1; if(tag==='head') p*=o.headOn===false?0.05:1; }
    P(m,X+x*c+z*s,Y+y,Z-x*s+z*c,yaw+ry,sx,sy,sz,mat,r,g,b,p,rx+(tag==='spin'?0:-pitch),rz,slot); } }

// ---------- state ----------
const CH_LEN=[1500,1600,1450,1550];
const G={ chapter:0, dist:0, len:1500, speed:20, x:0, vx:0, yaw:0, roll:0, pitch:0, hearts:3, maxHearts:3, light:0, lightAtStart:0, total:0, hits:0, boosts:0, boostT:0, inv:0, combo:0, comboT:0,
  state:'title', time:0, shake:0, flash:0, dyn:[], parts:[], rival:null, car:'fidele', camMode:'orbit', endT:0, barks:{}, nextOrb:0, throttle:0, brake:false, nextScene:null };
function resetWorld(ch){ statics=[]; G.dyn=[]; G.parts=[]; genZ=20; seed=1000+ch*77; side={L:20,R:20}; }
function genChunk(z0){ const z1=z0-CHUNK, ch=G.chapter, E=ENVS[ch];
  roadChunk(z0,z1,ch);
  if(ch!==2){ const every=ch===1?16:22; for(let z=Math.floor(z0/every)*every; z>z1; z-=every){ if(z>z0) continue; lamp(ROAD_HALF+1.6,z,E.lamp,ch===1?'lantern':'modern'); lamp(-(ROAD_HALF+1.6),z-every/2,E.lamp,ch===1?'lantern':'modern'); } }
  if(ch===0) genBelval(z0,z1); else if(ch===1) genBruecken(z0,z1); else if(ch===2) genGlut(z0,z1); else genHafen(z0,z1);
  if(ch===3&&z0>-CH_LEN[3]-60&&z0<=-CH_LEN[3]+30) lighthouse(-(ROAD_HALF+7.5),-CH_LEN[3]-26);
  genGameplay(z0,z1); }
function lighthouse(x,z){ if(landmarksDone.lh) return; landmarksDone.lh=true; G.lh={x,z};
  S('cylY',x,8,z,3.4,16,3.4,MAT.STONE,[.9,.88,.84]); for(let k=0;k<3;k++) S('cylY',x,2.5+k*5,z,3.5,1.3,3.5,MAT.PAINT+.4,[.65,.06,.05],.2);
  S('cylY',x,16.3,z,4.2,.4,4.2,MAT.STD+.5,[.1,.1,.1],.8); G.lhLamp=S('cylY',x,17.4,z,2.4,1.9,2.4,MAT.EMI,[1,.86,.6],.3); S('cone',x,19,z,3,1.6,3,MAT.STD+.4,[.12,.12,.12],.8); }
function genGameplay(z0,z1){
  if(G.state!=='play'||z0>-70) return; const ch=G.chapter, end=-CH_LEN[ch]+60; if(z0<end) return;
  if(rnd()<0.8){ const pat=rnd(); const n=6+(rnd()*6|0); let lane=(rnd()*3)|0;
    for(let i=0;i<n;i++){ const z=z0-4-i*3.4; if(z<z1-8) break; let x=LANES[lane];
      if(pat>0.55) x=Math.sin(i*0.5+lane)*3.6; else if(pat>0.35&&i===Math.floor(n/2)) lane=clamp(lane+(rnd()<.5?-1:1),0,2);
      G.dyn.push({type:'spark',x,y:1.1,z,ph:rnd()*6,alive:true}); } }
  const density=[0.55,0.7,0.5,0.45][ch];
  if(rnd()<density){ const z=z0-rr(6,24); const free=(rnd()*3)|0; const nb=rnd()<(0.25+ch*0.08)?2:1; let placed=0;
    for(let l=0;l<3&&placed<nb;l++){ const lane=(free+1+l)%3; if(lane===free) continue; placed++;
      const r=rnd();
      if(ch===1&&r<0.5) G.dyn.push({type:'car',x:LANES[lane],z,vz:-rr(5,10),parts:pick(SEDANS||(sedan(0,99999),SEDANS)),alive:true});
      else if(ch===2&&r<0.5) G.dyn.push({type:'rock',x:LANES[lane]+rr(-.5,.5),z,r:rr(.9,1.3),alive:true,y:.9});
      else if(r<0.25) G.dyn.push({type:'cones',x:LANES[lane],z,alive:true});
      else G.dyn.push({type:'barrier',x:LANES[lane],z,alive:true}); } }
}
// ---------- particles ----------
function burst(x,y,z,n,col,speed,life,size,grav=-6,em=6){ for(let i=0;i<n;i++){ if(G.parts.length>800) G.parts.shift(); const a=rnd()*Math.PI*2, b=rr(-.2,1);
  G.parts.push({x,y,z,vx:Math.cos(a)*speed*rr(.3,1),vy:b*speed*rr(.4,1.1),vz:Math.sin(a)*speed*rr(.3,1),life:life*rr(.6,1),max:life,s:size*rr(.6,1.2),col,em,g:grav}); } }

// ---------- dialog ----------
const UI={};
function bindUI(){ for(const id of ['hud','chapLabel','progFill','lightN','boostFill','boostHint','bark','barkText','barkAv','chapCard','chapEyebrow','chapTitle','dialog','dlgAv','dlgName','dlgText','choices','dlgHint','touch','fade','photo','photoImg','photoCap','carSel','hearts','speedN']) UI[id]=$(id); }
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
function tickDialog(dt){ if(!dlg.cur||!dlg.typing) return; dlg.shown=Math.min(dlg.cur.t.length,dlg.shown+dt*50); UI.dlgText.textContent=dlg.cur.t.slice(0,Math.floor(dlg.shown));
  if(dlg.shown>=dlg.cur.t.length){ dlg.typing=false; UI.dlgText.textContent=dlg.cur.t;
    if(dlg.cur.choices){ UI.dlgHint.hidden=true; UI.choices.hidden=false; UI.choices.innerHTML='';
      dlg.cur.choices.forEach((c,i)=>{ const b=document.createElement('button'); b.className=i===0?'btn':'btn ghost'; b.textContent=c.label; b.id='choice'+i;
        b.onclick=e=>{ e&&e.stopPropagation&&e.stopPropagation(); UI.dialog.hidden=true; UI.photo.classList.remove('show'); dlg.cur=null; dlg.queue=[]; c.fn(); }; UI.choices.appendChild(b); });
      setTimeout(()=>{ const f=$('choice0'); f&&f.focus&&f.focus(); },30); } } }
let barkT=0;
function bark(w,t){ UI.barkAv.innerHTML=AV[w]||AV.narr; UI.barkText.innerHTML=''; const b=document.createElement('b'); b.textContent=NAMES[w]; UI.barkText.appendChild(b); UI.barkText.appendChild(document.createTextNode(t)); UI.bark.classList.add('show'); barkT=4.5; }

// ---------- flow ----------
function fadeTo(v,ms=600){ UI.fade.style.transitionDuration=ms+'ms'; UI.fade.style.opacity=v; return new Promise(r=>setTimeout(r,ms)); }
function stageScene(ch,mode,dist=0){ G.chapter=ch; resetWorld(ch); landmarksDone={}; setEnv(ch,true); G.dist=dist; G.speed=0; G.x=0; G.vx=0; G.yaw=0; G.camMode=mode; G.rival=null; G.lh=null; G.lhLamp=null; }
function showCarSelect(next){ G.nextScene=next; UI.carSel.hidden=false; UI.hud.hidden=true; UI.touch.classList.remove('on'); G.state='select'; G.camMode='showroom';
  const n=CH_NAMES[next]; $('selEyebrow').textContent=n.sub+' · '+n.name; setTimeout(()=>{ const b=$('pick-'+G.car); b&&b.focus&&b.focus(); },50); }
function pickCar(car){ G.car=car; UI.carSel.hidden=true; Audio_.init(); Audio_.resume(); fadeTo(1,350).then(()=>startChapter(G.nextScene,false)); }
function startChapter(i,retry){ stageScene(i,'chase',0); const C=CARS[G.car]; G.len=CH_LEN[i]; G.speed=C.min; G.maxHearts=C.hearts; G.hearts=C.hearts; G.inv=1.5; G.boostT=0; G.combo=0;
  if(retry) G.light=G.lightAtStart; else G.lightAtStart=G.light;
  G.barks={}; G.nextOrb=0; G.rival={car:G.car==='fidele'?'smaragd':'fidele',x:LANES[0],z:8,vx:0,dist:-8};
  G.state='play'; UI.hud.hidden=false; UI.touch.classList.toggle('on',isTouch); UI.chapLabel.textContent=CH_NAMES[i].sub+' · '+CH_NAMES[i].name; renderHearts(); showChapCard(i);
  Audio_.setMood(i); Audio_.setRain(ENVS[i].rain); fadeTo(0,700); }
function showChapCard(i){ UI.chapEyebrow.textContent=CH_NAMES[i].sub; UI.chapTitle.textContent=CH_NAMES[i].name; UI.chapCard.classList.add('show'); setTimeout(()=>UI.chapCard.classList.remove('show'),2800); }
function renderHearts(){ UI.hearts.innerHTML=''; for(let i=0;i<G.maxHearts;i++){ const s=document.createElement('span'); if(i>=G.hearts) s.className='off'; UI.hearts.appendChild(s); } }
async function endChapter(){ G.state='cutscene'; UI.touch.classList.remove('on'); Audio_.chime(); await fadeTo(1,900); const i=G.chapter; UI.hud.hidden=true;
  if(i<3){ if(i===2) stageScene(2,'standing',300); else stageScene(i+1,'orbit',0);
    fadeTo(0,900); Audio_.setMood(Math.min(i+1,3)); Audio_.setRain(i===2?1:0);
    say([STORY.ch1end,STORY.ch2end,STORY.ch3end][i],async()=>{ await fadeTo(1,450); stageScene(i+1,'showroom',0); fadeTo(0,450); showCarSelect(i+1); });
  } else finale(); }
function finale(){ G.choiceGood=null; G.dyn=[]; UI.hud.hidden=true; UI.touch.classList.remove('on'); G.speed=0; G.state='cutscene'; G.camMode='finale'; G.endT=0; G.x=1.7; G.yaw=0; G.boostT=0; G.inv=0;
  G.rival={car:G.car==='fidele'?'smaragd':'fidele',x:-1.9,z:-G.dist-.5,vx:0,parked:true}; setEnv(3,true); fadeTo(0,900); Audio_.setMood(4); say(STORY.finale); }
function ending(good){ G.state='ending'; G.choiceGood=good; Audio_.setEngine(0,false,CARS[G.car]);
  if(good){ G.camMode='ignite'; G.endT=0; setEnv(4,false); Audio_.chime(); saveBest(G.light); say(STORY.goodEnd(G.light),()=>setTimeout(()=>showEnd(true),400)); }
  else { G.camMode='dark'; say(STORY.badEnd,()=>showEnd(false)); } }
function showEnd(good){ $('endO').hidden=false; $('btnRethink').hidden=good; $('albumWrap').hidden=!good;
  const stars=G.light>=380?3:G.light>=220?2:1;
  if(good){ $('endEyebrow').textContent='Epilog'; $('endTitle').textContent='Der Hafen leuchtet.';
    $('endText').textContent='Es ist nicht der Wagen, der dich ans Ziel bringt. Es ist der Mensch, der neben dir sitzt. Léo und Mira fahren noch am selben Abend weiter, mit Fidèle. Irgendwo da draußen gibt es noch dunkle Städte.';
    $('endStats').innerHTML=`<div><b>${G.light}</b><small>Funken entzündet</small></div><div><b>${G.total}</b><small>gesammelt</small></div><div><b>${G.boosts}</b><small>Lichtstöße</small></div><div><b>${G.hits}</b><small>Treffer</small></div><div><span class="stars">${'★'.repeat(stars)}<span class="dim">${'★'.repeat(3-stars)}</span></span><small>Leuchtkraft</small></div>`;
  } else { $('endEyebrow').textContent='Ein anderes Ende'; $('endTitle').textContent='Manche Dinge kann man nicht kaufen.';
    $('endText').textContent='Der Hafen bleibt dunkel, und der schnellste Wagen der Küste bringt euch nirgendwohin, wo ihr hinwollt. Vielleicht verdient diese Geschichte ein anderes Ende.'; $('endStats').innerHTML=''; }
  setTimeout(()=>{ const b=$(good?'btnAgain':'btnRethink'); b&&b.focus&&b.focus(); },50); }
function loadBest(){ try{ return +localStorage.getItem('ldr_best2')||0 }catch(e){ return 0 } }
function saveBest(v){ try{ if(v>loadBest()) localStorage.setItem('ldr_best2',String(v)) }catch(e){} }

function tryBoost(){ const C=CARS[G.car]; if(G.boostT>0||G.light<C.boost) return; G.light-=C.boost; G.boosts++; G.boostT=2.6; G.inv=Math.max(G.inv,2.6); Audio_.boost(); burst(G.x,1,-G.dist+2,40,[1,.85,.4],10,.8,.16,0,8); }
function hitPlayer(){ if(G.inv>0) return; G.hearts--; G.hits++; G.inv=1.6; G.flash=1; G.shake=1; G.combo=0; G.speed*=0.75; Audio_.hit(); burst(G.x,1.2,-G.dist-1.5,30,[1,.6,.2],7,.7,.12); renderHearts();
  if(G.hearts===1) bark(pick(['mira','leo']),pick(['Noch ein Treffer und wir stehen. Vorsicht!','Das Auto hält nicht mehr viel aus.']));
  if(G.hearts<=0){ G.state='crashed'; Audio_.setEngine(0,false,CARS[G.car]); setTimeout(()=>{ $('crashO').hidden=false; const b=$('btnRetry'); b&&b.focus&&b.focus(); },900); } }

// ---------- input ----------
const keys={}; let touchL=false,touchR=false,touchUp=false,touchDn=false,gpA=false;
const isTouch=(typeof matchMedia!=='undefined'&&matchMedia('(pointer:coarse)').matches)||(typeof window!=='undefined'&&'ontouchstart' in window);
function steerInput(){ let s=0; if(keys['arrowleft']||keys['a']||touchL) s-=1; if(keys['arrowright']||keys['d']||touchR) s+=1;
  let th=0; if(keys['arrowup']||keys['w']||touchUp) th=1; if(keys['arrowdown']||keys['s']||touchDn) th=-1;
  const gps=navigator.getGamepads?navigator.getGamepads():[]; for(const gp of gps){ if(gp&&gp.connected){ if(Math.abs(gp.axes[0])>0.2) s=gp.axes[0]; const rt=gp.buttons[7]?gp.buttons[7].value:0, lt=gp.buttons[6]?gp.buttons[6].value:0; if(rt>.1) th=rt; if(lt>.1) th=-lt;
    const a=gp.buttons[0]&&gp.buttons[0].pressed; if(a&&!gpA&&G.state==='play') tryBoost(); gpA=a; } }
  return [s,th]; }

// ---------- update ----------
function update(dt){
  G.time+=dt; if(envT<1){ envT=Math.min(1,envT+dt/3); blendEnv(smooth(envT)); }
  if(barkT>0){ barkT-=dt; if(barkT<=0) UI.bark.classList.remove('show'); }
  tickDialog(dt);
  for(let i=G.parts.length-1;i>=0;i--){ const p=G.parts[i]; p.life-=dt; if(p.life<=0){ G.parts.splice(i,1); continue; } p.vy+=p.g*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt; if(p.y<.05){ p.y=.05; p.vy*=-.3; p.vx*=.7; p.vz*=.7; } }
  G.flash=Math.max(0,G.flash-dt*2.5); G.shake=Math.max(0,G.shake-dt*2.2);
  const vz=-G.dist;
  while(genZ>vz-560){ genChunk(genZ); genZ-=CHUNK; }
  if((G.time*10|0)%25===0){ const lim=vz+45; statics=statics.filter(o=>o.z-o.ext<lim); G.dyn=G.dyn.filter(o=>o.z<lim+10&&o.alive!==false); }
  if(G.chapter===0&&rnd()<dt*12) G.parts.push({x:rr(-50,-25),y:rr(10,45),z:vz-rr(20,140),vx:rr(-.5,.5),vy:rr(1,3),vz:0,life:4,max:4,s:rr(.06,.14),col:[1,.5,.15],em:8,g:.2});
  if(G.chapter===2&&rnd()<dt*25) G.parts.push({x:rr(-16,16),y:rr(0,10),z:vz-rr(5,90),vx:rr(-.5,.5),vy:rr(.5,2.5),vz:0,life:3,max:3,s:rr(.05,.12),col:[1,.45,.1],em:10,g:.5});
  if(G.camMode==='ignite'&&G.endT>3&&rnd()<dt*1.5){ const x=rr(-80,-30),z=vz-rr(0,90),y=rr(22,38); const c=pick([[1,.75,.3],[1,.4,.6],[.5,.7,1],[1,.9,.6]]); burst(x,y,z,80,c,10,1.9,.25,-3,14); Audio_.boom(.25); }
  if(G.state==='play') updatePlay(dt);
  else { Audio_.setEngine(0,G.state==='cutscene'||G.state==='select',CARS[G.car]); G.endT+=dt; }
  // HUD
  UI.lightN.textContent=G.light; UI.progFill.style.width=(clamp(G.dist/G.len,0,1)*100).toFixed(1)+'%'; UI.speedN.textContent=Math.round(G.speed*3.6);
  const C=CARS[G.car]; UI.boostFill.style.width=(G.boostT>0?G.boostT/2.6*100:Math.min(100,G.light/C.boost*100))+'%';
  UI.boostHint.textContent=G.boostT>0?'Lichtstoß aktiv':(G.light>=C.boost?'Lichtstoß bereit':'Lichtstoß ab '+C.boost);
}
function updatePlay(dt){
  const ch=G.chapter, C=CARS[G.car]; const [steer,th]=steerInput();
  // lateral dynamics with inertia, yaw and body roll
  const target=steer*C.steer; const prevVx=G.vx; G.vx+=(target-G.vx)*Math.min(1,dt*(G.car==='smaragd'?9:5.5)); G.x+=G.vx*dt;
  const lim=ROAD_HALF-C.half[0]-.15; if(Math.abs(G.x)>lim){ G.x=Math.sign(G.x)*lim; G.vx*=-.25; G.shake=Math.max(G.shake,.15); }
  G.yaw=lerp(G.yaw,-G.vx/Math.max(G.speed,8)*0.9,Math.min(1,dt*8));
  G.roll=lerp(G.roll,(G.vx-prevVx)/dt*(G.car==='fidele'?0.0045:0.0018),Math.min(1,dt*6));
  // throttle
  const prog=G.dist/G.len; const cruise=lerp(C.min,C.max,0.55)+prog*3;
  let tgt=th>0?C.max:th<0?C.min:cruise; if(G.boostT>0) tgt=C.max*1.35;
  const acc=clamp((tgt-G.speed)*1.2,-C.accel*2.2,C.accel*(G.boostT>0?2.2:1)); const ps=G.speed; G.speed+=acc*dt;
  G.pitch=lerp(G.pitch,-(G.speed-ps)/dt*0.0012,Math.min(1,dt*5)); G.brake=th<0;
  G.dist+=G.speed*dt; const vz=-G.dist;
  G.boostT=Math.max(0,G.boostT-dt); G.inv=Math.max(0,G.inv-dt); G.comboT-=dt; if(G.comboT<=0) G.combo=0;
  Audio_.setEngine(G.speed,true,C);
  BARKS[ch].forEach((b,i)=>{ if(!G.barks[i]&&prog>=b[0]){ G.barks[i]=true; bark(b[1],b[2]); } });
  // fire orbs
  const orbRate=[0.35,0.6,1.6,0.3][ch]*(1+prog*.6);
  G.nextOrb-=dt; if(G.nextOrb<=0&&G.dist>90&&G.dist<G.len-70){ G.nextOrb=rr(.6,1.4)/orbRate; const lead=G.speed*rr(1.7,2.3); const tx=rnd()<.35?clamp(G.x+rr(-1,1),-4.2,4.2):LANES[(rnd()*3)|0]+rr(-.6,.6);
    G.dyn.push({type:'orb',x:tx,z:vz-lead,y:28,vy:-6,r:rr(.9,1.4),alive:true,landed:false,ph:rnd()*6}); }
  // rival AI (drives the other car)
  const rv=G.rival; if(rv){ const RC=CARS[rv.car]; const want=vz-6+Math.sin(G.time*.35)*10; rv.z+=(want-rv.z)*Math.min(1,dt*.9);
    let best=rv.x,bs=-1e9; for(const cx of LANES){ let sc=(Math.abs(cx-G.x)<2.6&&Math.abs(rv.z-vz)<7)?-8:0; sc-=Math.abs(cx-rv.x)*.2;
      for(const o of G.dyn){ if(o.alive===false||o.type==='spark') continue; const dz=rv.z-o.z; if(dz<-3||dz>40) continue; if(Math.abs(o.x-cx)<2.3) sc-=20/(1+dz*.05); } if(sc>bs){ bs=sc; best=cx; } }
    const pvx=rv.vx; rv.vx+=((best-rv.x)*2.2-rv.vx)*Math.min(1,dt*3); rv.vx=clamp(rv.vx,-RC.steer,RC.steer); rv.x+=rv.vx*dt; rv.yaw=-rv.vx/20; rv.roll=(rv.vx-pvx)/dt*0.003; rv.dist=-rv.z;
    if(Math.abs(rv.x-G.x)<C.half[0]+RC.half[0]&&Math.abs(rv.z-vz)<C.half[1]+RC.half[1]){ const push=Math.sign(G.x-rv.x)||1; G.vx=push*9; rv.vx=-push*6; G.shake=Math.max(G.shake,.3); Audio_.noiseHit(.2,1200,.2); } }
  // collisions
  const mag=G.boostT>0?4.6:C.magnet, hw=C.half[0], hl=C.half[1];
  for(const o of G.dyn){ if(o.alive===false) continue; const dz=o.z-vz;
    if(o.type==='spark'){ if(Math.abs(dz)<mag+hl-.4&&Math.abs(o.x-G.x)<mag){ o.alive=false; G.light++; G.total++; G.combo=Math.min(G.combo+1,5); G.comboT=.8; Audio_.pickup(G.combo); burst(o.x,1.1,o.z,8,[1,.85,.4],4,.5,.07,2,9); } }
    else if(o.type==='orb'){ if(!o.landed){ o.vy-=22*dt; o.y+=o.vy*dt; if(o.y<=o.r*.8){ o.y=o.r*.8; o.landed=true; burst(o.x,.5,o.z,50,[1,.45,.1],9,1,.15,-9,10); const near=Math.abs(dz)<30; if(near){ Audio_.boom(clamp(1-Math.abs(dz)/30,.2,1)); G.shake=Math.max(G.shake,.35*clamp(1-Math.abs(dz)/30,0,1)); } } }
      if(o.y<2.6&&Math.abs(dz)<hl+o.r*.6&&Math.abs(o.x-G.x)<hw+o.r*.6){ if(G.boostT>0){ o.alive=false; burst(o.x,o.y,o.z,50,[1,.6,.2],10,.9,.15); Audio_.boom(.6); } else hitPlayer(); } }
    else if(o.type==='rock'){ if(Math.abs(dz)<hl+o.r*.5&&Math.abs(o.x-G.x)<hw+o.r*.6){ if(G.boostT>0){ o.alive=false; burst(o.x,1,o.z,40,[1,.5,.15],9,.8,.15); Audio_.boom(.5); } else hitPlayer(); } }
    else if(o.type==='barrier'||o.type==='cones'){ if(Math.abs(dz)<hl+.3&&Math.abs(o.x-G.x)<hw+1.2){ if(G.boostT>0){ o.alive=false; burst(o.x,.6,o.z,30,[1,.55,.15],9,.7,.14); Audio_.boom(.4); } else hitPlayer(); } }
    else if(o.type==='car'){ o.z+=o.vz*dt; if(Math.abs(o.z-vz)<hl+2.15&&Math.abs(o.x-G.x)<hw+.9){ if(G.boostT>0){ o.alive=false; burst(o.x,.8,o.z,40,[1,.8,.5],10,.8,.15); Audio_.boom(.5); } else hitPlayer(); } } }
  if(G.dist>=G.len&&G.state==='play') endChapter();
}

// ---------- frame building ----------
const cam={pos:[0,3,8],tgt:[0,1,-10],fov:58};
function carParts(car){ return car==='fidele'?VAN_P:SUP_P; }
function drawCarAt(car,x,z,yaw,o,people){ drawParts(carParts(car),x,0,z,yaw,o);
  if(car==='smaragd'&&people) drawParts(people,x,0,z,yaw,{pitch:o.pitch,roll:o.roll});
  const c=Math.cos(yaw), s=Math.sin(yaw); const fz=car==='fidele'?-2.1:-2.3;
  if(o.headOn!==false){ Lt(x+fz*s-s*5,.9,z+fz*c-c*5,26,22,16,22); }
  Lt(x-fz*s,.6,z-fz*c,o.brake?6:1.5,.05,.02,5); }
function buildFrame(){
  const vz=-G.dist, t=G.time, E=envCur;
  const zNear=vz+50, zFar=vz-600;
  for(const o of statics){ if(o.z-o.ext>zNear||o.z+o.ext<zFar) continue; let y=o.y; if(o.bob!==undefined) y+=Math.sin(t*.8+o.bob)*.4;
    let p=o.p; if(o===G.lhLamp&&G.camMode==='ignite') p=.3+clamp(G.endT/3,0,1)*30;
    P(o.m,o.x,y,o.z,o.ry,o.sx,o.sy,o.sz,o.mat,o.r,o.g,o.b,p,o.rx,o.rz,o.slot);
    if(o.L&&o.z<vz+40&&o.z>vz-180) Lt(o.L.x,o.L.y+(o.bob!==undefined?Math.sin(t*.8+o.bob)*.4:0),o.L.z,o.L.r,o.L.g,o.L.b,o.L.rad); }
  const MI=MESHIDX;
  // player car
  const spin=-G.dist/.33; const showPlayer=!(G.camMode==='standing'||G.camMode==='showroom');
  const blink=G.inv>0&&G.state==='play'&&G.boostT<=0&&((t*14|0)%2===0);
  const bob=Math.abs(Math.sin(G.dist*.9))*.012*Math.min(1,G.speed/10);
  const fin=G.camMode==='finale'||G.camMode==='ignite'||G.camMode==='dark';
  if(showPlayer&&!blink&&!fin) drawCarAt(G.car,G.x,vz+bob*0,G.yaw,{pitch:G.pitch,roll:G.roll,spin,steer:-G.vx*.02,brake:G.brake},PEOPLE_SUP);
  if(G.boostT>0){ Lt(G.x,1.5,vz,30,22,10,10); for(let i=0;i<3;i++) P(MI.sphLo,G.x+rr(-1,1),rr(.4,2.2),vz+rr(1.5,4),0,.12,.12,rr(.6,1.6),MAT.EMI,1,.8,.4,10); }
  if(fin){ drawCarAt('smaragd',-1.4,vz,.12,{headOn:G.camMode!=='dark'},G.choiceGood===false?PEOPLE_SUP:null); drawCarAt('fidele',3.4,vz-6.5,-.08,{headOn:true},null); }
  const rv=G.rival; if(rv&&G.camMode!=='standing'&&!fin){ drawCarAt(rv.car,rv.x,rv.z,rv.yaw||0,{pitch:0,roll:rv.roll||0,spin:-(rv.dist||0)/.33,headOn:true},VAL_SUP); }
  for(const o of G.dyn){ if(o.alive===false||o.z>zNear||o.z<zFar) continue; const dz=o.z-vz;
    if(o.type==='spark'){ const y=o.y+Math.sin(t*3+o.ph)*.18; P(MI.sph,o.x,y,o.z,0,.36,.36,.36,MAT.EMI,1,.78,.35,14); P(MI.sphLo,o.x,y,o.z,0,.12,.12,.12,MAT.EMI,1,1,.9,30); if(dz<0&&dz>-45) Lt(o.x,y,o.z,6,4,1.4,6); }
    else if(o.type==='orb'){ P(MI.sph,o.x,o.y,o.z,t*.3+o.ph,o.r*2,o.r*2,o.r*2,MAT.LAVA,1,1,1,1.0); Lt(o.x,o.y+.5,o.z,110,38,8,o.landed?18:24);
      if(!o.landed){ const pulse=.5+.5*Math.sin(t*14); const sz=o.r*2.6*(1.25-o.y/32); P(MI.cylY,o.x,.02,o.z,0,sz,.02,sz,MAT.EMI,1,.12,.05,2+pulse*5); P(MI.cylY,o.x,.025,o.z,0,sz*.75,.02,sz*.75,MAT.STD,.04,0,0,0);
        for(let k=1;k<4;k++) P(MI.sphLo,o.x,o.y+k*1.3,o.z,0,o.r*1.2/k,o.r*1.2/k,o.r*1.2/k,MAT.EMI,1,.45,.1,4/k); } }
    else if(o.type==='rock'){ P(MI.sph,o.x,o.y,o.z,o.x,o.r*2,o.r*1.6,o.r*2,MAT.LAVA,1,1,1,.55); Lt(o.x,1.2,o.z,60,16,3,10); }
    else if(o.type==='barrier'){ P(MI.box,o.x,.55,o.z,0,2.6,.7,.35,MAT.STD+.5,.95,.4,.06,0); P(MI.box,o.x,.55,o.z,0,2.62,.18,.37,MAT.STD+.5,.95,.95,.95,0);
      P(MI.box,o.x-1.1,.2,o.z,0,.12,.4,.6,MAT.STD,.2,.2,.2,0); P(MI.box,o.x+1.1,.2,o.z,0,.12,.4,.6,MAT.STD,.2,.2,.2,0);
      const bl=(t*3+o.z)%1<.5?12:.5; P(MI.sphLo,o.x,1.05,o.z,0,.18,.18,.18,MAT.EMI,1,.6,.1,bl); if(bl>1&&dz<0&&dz>-60) Lt(o.x,1.3,o.z,30,15,3,8); }
    else if(o.type==='cones'){ for(let k=-1;k<=1;k++){ P(MI.cone,o.x+k*.9,.4,o.z+k*.3,0,.5,.8,.5,MAT.STD+.6,.95,.35,.05,0); P(MI.cylY,o.x+k*.9,.45,o.z+k*.3,0,.36,.12,.36,MAT.STD+.5,.95,.95,.95,0); P(MI.box,o.x+k*.9,.02,o.z+k*.3,0,.6,.04,.6,MAT.STD,.05,.05,.05,0); } }
    else if(o.type==='car'){ drawParts(o.parts,o.x,0,o.z,Math.PI,{spin:-o.z/.32}); const hz=(t*2)%1<.5; if(hz){ P(MI.sphLo,o.x-.7,.8,o.z+2.1,0,.12,.12,.12,MAT.EMI,1,.5,.05,14); P(MI.sphLo,o.x+.7,.8,o.z+2.1,0,.12,.12,.12,MAT.EMI,1,.5,.05,14); } } }
  for(const p of G.parts){ const f=p.life/p.max; P(MI.sphLo,p.x,p.y,p.z,0,p.s,p.s,p.s,MAT.EMI,p.col[0],p.col[1],p.col[2],p.em*f); }
  if(E.rain>.05){ for(let i=0;i<260;i++){ const h=(i*7919)%1000/1000, h2=(i*104729)%1000/1000; const fall=((t*24+h*40)%22); P(MI.box,cam.pos[0]+(h-.5)*36,20-fall,cam.pos[2]-2-h2*46,.3,.02,.9,.02,MAT.EMI,.7,.62,.6,1.1*E.rain,.08,0); } }
  // camera
  const sh=G.shake*.35, C=CARS[G.car];
  if(G.camMode==='chase'){ const [ch,cd]=C.cam; const cx=G.x*.55; cam.pos=[cx+rr(-sh,sh),ch+rr(-sh,sh),vz+cd]; cam.tgt=[G.x*.75,1.0,vz-16]; cam.fov=lerp(cam.fov,58+(G.boostT>0?10:0)+G.speed*.18,.08); }
  else if(G.camMode==='orbit'||G.camMode==='showroom'){ const a=G.time*.12; const r=G.camMode==='showroom'?8:10; cam.pos=[Math.sin(a)*r,2.2+Math.sin(G.time*.3)*.4,vz+Math.cos(a)*r]; cam.tgt=[0,1.0,vz]; cam.fov=50;
    if(G.camMode==='showroom'){ drawCarAt('fidele',-2.3,vz,-.35,{headOn:true},null); drawCarAt('smaragd',2.3,vz,.35,{headOn:true},PEOPLE_SUP); } }
  else if(G.camMode==='standing'){ const a=Math.sin(G.time*.15)*.35; cam.pos=[Math.sin(a)*6.5,1.4,vz-Math.cos(a)*6.5]; cam.tgt=[0,3.0,vz];  cam.fov=58;
    drawParts(LEO_STAND,0,0,vz,Math.PI,{});
    for(const [ox,oy,oz,r] of [[-4.5,7.5,3,1.5],[0,9.5,4,2.1],[4.2,7,2.5,1.4],[-7,5.5,1,1.1],[7.5,5.8,0,1.2],[-2.5,6,6,1],[2.6,10.5,8,1.6]]){ const y=oy+Math.sin(G.time*.8+ox)*.3;
      P(MI.sph,ox,y,vz+oz,G.time*.2,r*2,r*2,r*2,MAT.LAVA,1,1,1,.55); Lt(ox,y-.5,vz+oz,90,30,6,18); for(let k=1;k<4;k++) P(MI.sph,ox,y-r-k*.9,vz+oz,0,.12,1.2,.12,MAT.EMI,1,.45,.12,4/k); }
    drawCarAt(G.car,-4.5,vz+9,.4,{headOn:true},PEOPLE_SUP); }
  else { // finale / ignite / dark: the selfie spot at the harbour
    const vzc=vz; if(G.camMode!=='dark'){ drawParts(LEO_STAND,-1.0,0,vzc+3.4,-2.5,{}); drawParts(MIRA_STAND,-1.65,0,vzc+3.55,-2.3,{}); }
    const a=.75+G.endT*.03; const lh=G.lh||{x:-12,z:vz-26};
    if(G.camMode==='ignite'){ const k=smooth(clamp(G.endT/6,0,1)); cam.pos=[lerp(3.6,7,k),lerp(1.8,5.5,k),vzc+lerp(9.5,19,k)]; cam.tgt=[lerp(-1.3,lh.x*.6,k),lerp(1.4,8,k),lerp(vzc+1.5,(lh.z+vzc)/2,k)]; cam.fov=lerp(48,56,k); }
    else { const b=G.endT*.03; cam.pos=[3.6+Math.sin(b)*.8,1.8,vzc+9.5]; cam.tgt=[-1.3,1.4,vzc+1.5]; cam.fov=48; }
    if(G.camMode==='ignite'&&G.lh){ const ign=clamp(G.endT/3,0,1); Lt(lh.x,17.4,lh.z,500*ign,380*ign,220*ign,120); const b=G.endT*.9; P(MI.box,lh.x+Math.sin(b)*32,17.4,lh.z+Math.cos(b)*32,b,.7,.7,64,MAT.EMI,1,.85,.55,3*ign); } }
}

// ---------- main loop ----------
let last=0, acc=0, frames=0, adaptT=0;
function frame(now){
  const dtRaw=Math.max(0,(now-last)/1000); last=now; const dt=Math.min(.05,dtRaw);
  if(G.state!=='pause') update(dt);
  try{ buildFrame();
    const C=CARS[G.car]; const sc=[G.x,0,-G.dist-18];
    const dark=G.camMode==='dark';
    renderFrame(cam,envCur,G.time,{exposure:envCur.exposure*(dark?.55:1),bloom:.045,flash:G.flash*.6,fade:0,sat:envCur.sat*(dark?.45:1),tint:envCur.tint,vignette:.5},sc,window.__snapReq||null);
    window.__snapReq=null;
  }catch(e){ console.error(e); }
  acc+=dtRaw; frames++; adaptT+=dtRaw;
  if(adaptT>2.5){ const avg=acc/frames; if(avg>.026&&R.scale>.5){ R.scale=Math.max(.5,R.scale*.82); R.needResize=true; } else if(avg<.012&&R.scale<R.maxScale){ R.scale=Math.min(R.maxScale,R.scale*1.12); R.needResize=true; } acc=0; frames=0; adaptT=0; }
  requestAnimationFrame(frame);
}
function onDeviceLost(info){ $('errText').textContent='Die Grafikkarte wurde zurückgesetzt ('+(info.message||info.reason)+'). Bitte lade die Seite neu.'; $('errO').hidden=false; }
