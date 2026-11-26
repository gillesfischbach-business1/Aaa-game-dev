/* ===== People in the world: pedestrians, cyclists, café guests, drivers, and lively banter ===== */
const PEDS=[], BIKES=[];
const SKIN=[[.86,.64,.5],[.78,.55,.42],[.62,.42,.3],[.45,.3,.22],[.9,.72,.6]];
const CLOTH=[[.08,.09,.12],[.5,.12,.1],[.15,.25,.4],[.7,.66,.58],[.25,.3,.2],[.85,.82,.75],[.35,.2,.3],[.12,.12,.13],[.55,.45,.3],[.2,.35,.45]];
const HAIR=[[.05,.035,.025],[.22,.12,.06],[.5,.35,.15],[.7,.7,.68],[.12,.08,.05]];
function pedLook(){ return {skin:pick(SKIN),top:pick(CLOTH),legs:pick([[.12,.16,.26],[.08,.08,.09],[.5,.45,.38],[.3,.3,.32]]),hair:pick(HAIR),h:rr(.92,1.08),bun:Math.random()<.35,coat:Math.random()<.3,bag:Math.random()<.25,phone:Math.random()<.12}; }
/* sidewalk loops: one rectangle per city block, 1.6 m inside its edge */
let SIDEWALKS=null;
function sidewalks(){ if(SIDEWALKS) return SIDEWALKS; SIDEWALKS=mapItems.filter(r=>r.kind==='block'||r.kind==='plaza').map(r=>({x0:r.x0+1.6,z0:r.z0+1.6,x1:r.x1-1.6,z1:r.z1-1.6})); return SIDEWALKS; }
function loopPoint(w,s){ const W=w.x1-w.x0, D=w.z1-w.z0, P=2*(W+D); s=((s%P)+P)%P;
  if(s<W) return [w.x0+s,w.z0,-Math.PI/2]; s-=W; if(s<D) return [w.x1,w.z0+s,Math.PI]; s-=D; if(s<W) return [w.x1-s,w.z1,Math.PI/2]; s-=W; return [w.x0,w.z1-s,0]; }
function spawnPeds(px,pz){ const S=sidewalks(); if(!S.length) return; const max=SET.gfx.traffic>0?Math.round(18+SET.gfx.traffic*1.6):0;
  for(let tries=0;tries<40&&PEDS.length<max;tries++){ const w=S[(Math.random()*S.length)|0]; const cx=(w.x0+w.x1)/2, cz=(w.z0+w.z1)/2; const d=Math.hypot(cx-px,cz-pz); if(d>150) continue;
    const per=2*((w.x1-w.x0)+(w.z1-w.z0)); const stand=Math.random()<.18; const look=pedLook();
    const p={w,s:Math.random()*per,dir:Math.random()<.5?1:-1,v:stand?0:rr(1.1,1.6),ph:Math.random()*6,look,stand,x:0,z:0,h:0,dodge:0};
    PEDS.push(p); if(stand&&Math.random()<.6) PEDS.push({...p,s:p.s+1.1,look:pedLook(),ph:p.ph+2,partner:true}); } }
function updatePeds(dt,car){ const V=car?VEH[car.car]:null;
  for(let i=PEDS.length-1;i>=0;i--){ const p=PEDS[i];
    p.s+=p.v*p.dir*dt; p.ph+=dt*p.v*3.4; const [x,z,h]=loopPoint(p.w,p.s); p.x=x; p.z=z; p.h=p.dir>0?h:h+Math.PI;
    if(p.stand){ const [x2,z2]=loopPoint(p.w,p.s+(p.partner?-1.1:1.1)); p.h=Math.atan2(-(x2-x),-(z2-z)); }
    // step aside when a car comes close (people never get hit)
    if(car){ const dx=p.x-car.x, dz=p.z-car.z, d=Math.hypot(dx,dz); const R2=V.half[1]+1.2; if(d<R2+2){ p.dodge=Math.min(1,p.dodge+dt*4); } else p.dodge=Math.max(0,p.dodge-dt); if(d<R2&&d>1e-3){ p.ox=dx/d*(R2-d); p.oz=dz/d*(R2-d); } else { p.ox=(p.ox||0)*.9; p.oz=(p.oz||0)*.9; } }
    if(car&&Math.hypot(p.x-car.x,p.z-car.z)>220) PEDS.splice(i,1); } }
function drawPerson(x,z,h,look,ph,walking,o={}){ const c=Math.cos(h), s=Math.sin(h), H=look.h; const sw=walking?Math.sin(ph)*.45:0; const M=MESHIDX;
  const at=(lx,ly,lz)=>[x+lx*c+lz*s,ly,z-lx*s+lz*c];
  const seated=o.seated; const hip=seated?.5:.92*H;
  for(const side of [-1,1]){ const a=sw*side; // legs swing around the hip
    if(seated){ const [ax,ay,az]=at(side*.1,hip,-.22); P(M.rbox,ax,ay,az,h,.13,.13,.44,MAT.STD+.85,...look.legs,0); const [bx,by,bz]=at(side*.1,.25,-.42); P(M.rbox,bx,by,bz,h,.12,.5,.13,MAT.STD+.85,...look.legs,0); }
    else { const L=.88*H; const [lx,ly,lz]=at(side*.1,hip-Math.cos(a)*L/2,-Math.sin(a)*L/2); P(M.rbox,lx,ly,lz,h,.14,L,.15,MAT.STD+.85,...look.legs,0,a,0); const [fx,fy,fz]=at(side*.1,.05,-Math.sin(a)*L-.05); P(M.rbox,fx,fy,fz,h,.11,.09,.27,MAT.STD+.6,.1,.1,.1,0); } }
  const tl=(look.coat?.72:.58)*H; const [tx,ty,tz]=at(0,hip+tl/2-(look.coat?.12:0),0); P(M.rbox,tx,ty,tz,h,.42,tl,.24,MAT.STD+.9,...look.top,0);
  for(const side of [-1,1]){ const a=walking?-sw*side*.8:(o.phone&&side>0?-1.2:0); const AL=.56*H; const sy=hip+.52*H; const [ax,ay,az]=at(side*.25,sy-Math.cos(a)*AL/2,-Math.sin(a)*AL/2); P(M.rbox,ax,ay,az,h,.11,AL,.12,MAT.STD+.9,...look.top,0,a,0);
    const [hx,hy,hz]=at(side*.25,sy-Math.cos(a)*AL,-Math.sin(a)*AL); P(M.sphLo,hx,hy,hz,0,.09,.1,.09,MAT.SKIN,...look.skin,0); }
  if(look.bag){ const [bx,by,bz]=at(.3,hip+.05,.05); P(M.rbox,bx,by,bz,h,.08,.3,.32,MAT.STD+.7,.35,.22,.12,0); }
  const hy=hip+.62*H+.14; const [nx,ny,nz]=at(0,hy,0); P(M.head,nx,ny,nz,h,.19,.24,.21,MAT.SKIN,...look.skin,0);
  const [rx,ry,rz]=at(0,hy+.07,.02); P(M.head,rx,ry,rz,h,.21,.15,.23,MAT.STD+.85,...look.hair,0);
  if(look.bun){ const [ux,uy,uz]=at(0,hy+.17,.08); P(M.head,ux,uy,uz,h,.12,.11,.12,MAT.STD+.85,...look.hair,0); }
  if(o.phone){ const [px2,py2,pz2]=at(.22,hy-.05,-.12); P(M.box,px2,py2,pz2,h,.07,.13,.02,MAT.EMI,.6,.75,1,1.5); } }
function drawPeds(camx,camz){ for(const p of PEDS){ if(Math.hypot(p.x-camx,p.z-camz)>160) continue; drawPerson(p.x+(p.ox||0),p.z+(p.oz||0),p.h,p.look,p.ph,!p.stand,{phone:p.look.phone&&p.stand}); } }

/* cyclists ride along the right edge of Eindhoven streets */
function spawnBikes(px,pz){ if(px<CANAL.x0-200||SET.gfx.traffic===0) return; const E=graph.edges.filter(e=>e.a.x>MOTORWAY.x1-20&&e.b.x>MOTORWAY.x1-20);
  for(let tries=0;tries<6&&BIKES.length<10;tries++){ const e=pick(E); if(!e) return; const t=Math.random(); const x=lerp(e.a.x,e.b.x,t), z=lerp(e.a.z,e.b.z,t); const d=Math.hypot(x-px,z-pz); if(d<60||d>220) continue;
    const fwd=Math.random()<.5; BIKES.push({e,from:fwd?e.a:e.b,to:fwd?e.b:e.a,t:fwd?t:1-t,v:rr(4,6),look:pedLook(),ph:0,x,z,h:0,col:pick([[.08,.08,.09],[.5,.1,.08],[.15,.3,.45],[.85,.85,.8]])}); } }
function updateBikes(dt,car){ for(let i=BIKES.length-1;i>=0;i--){ const b=BIKES[i]; const dx=b.to.x-b.from.x, dz=b.to.z-b.from.z, L=Math.hypot(dx,dz)||1, ux=dx/L, uz=dz/L;
  let v=b.v; if(car&&Math.hypot(car.x-(b.x+ux*5),car.z-(b.z+uz*5))<5) v=0; b.t+=v*dt/L; b.ph+=v*dt*1.6;
  if(b.t>=1){ const n=b.to; const opts=n.edges.filter(e=>e!==b.e&&e.lanes===1); const e=opts.length?pick(opts):b.e; b.from=n; b.to=e.a===n?e.b:e.a; b.e=e; b.t=0; continue; }
  b.x=lerp(b.from.x,b.to.x,b.t)-uz*5.2; b.z=lerp(b.from.z,b.to.z,b.t)+ux*5.2; b.h=Math.atan2(-ux,-uz);
  if(car&&Math.hypot(b.x-car.x,b.z-car.z)>260) BIKES.splice(i,1); } }
function drawBikes(camx,camz){ const M=MESHIDX; for(const b of BIKES){ if(Math.hypot(b.x-camx,b.z-camz)>160) continue; const c=Math.cos(b.h), s=Math.sin(b.h); const at=(lx,ly,lz)=>[b.x+lx*c+lz*s,ly,b.z-lx*s+lz*c];
  for(const lz of [-.52,.52]){ const [wx,wy,wz]=at(0,.34,lz); P(M.cylX,wx,wy,wz,b.h,.03,.68,.68,MAT.STD+.4,.05,.05,.05,0,b.ph*3,0); }
  const [fx,fy,fz]=at(0,.55,0); P(M.box,fx,fy,fz,b.h,.04,.05,1.0,MAT.STD+.3,...b.col,.5,0,0); const [sx,sy,sz]=at(0,.7,.22); P(M.box,sx,sy,sz,b.h,.04,.42,.05,MAT.STD+.3,...b.col,.5,-.3,0);
  const [hx,hy,hz]=at(0,.98,-.48); P(M.box,hx,hy,hz,b.h,.5,.03,.03,MAT.STD+.3,.1,.1,.1,0);
  // rider: torso leaning forward, pedalling legs
  const lk=b.look; const [tx,ty,tz]=at(0,1.22,.05); P(M.rbox,tx,ty,tz,b.h,.4,.58,.24,MAT.STD+.9,...lk.top,0,-.35,0);
  for(const side of [-1,1]){ const a=Math.sin(b.ph+(side>0?Math.PI:0))*.6; const [lx,ly,lz]=at(side*.11,.72,.05+Math.sin(a)*.12); P(M.rbox,lx,ly,lz,b.h,.13,.62,.14,MAT.STD+.85,...lk.legs,0,a*.7,0);
    const [ax,ay,az]=at(side*.22,1.18,-.22); P(M.rbox,ax,ay,az,b.h,.1,.5,.11,MAT.STD+.9,...lk.top,0,-1.0,0); }
  const [nx,ny,nz]=at(0,1.68,-.1); P(M.head,nx,ny,nz,b.h,.19,.24,.21,MAT.SKIN,...lk.skin,0); const [rx,ry,rz]=at(0,1.75,-.08); P(M.head,rx,ry,rz,b.h,.21,.15,.23,MAT.STD+.85,...lk.hair,0); } }

/* café guests: tables with seated people in front of some shops */
const CAFES=[];
function genCafes(){ CAFES.length=0; for(const w of sidewalks()){ if(Math.random()>.12) continue; const side=(Math.random()*4)|0; const W=w.x1-w.x0, D=w.z1-w.z0;
  const t=rr(.25,.75); const [x,z,h]=loopPoint({x0:w.x0+1.6,z0:w.z0+1.6,x1:w.x1-1.6,z1:w.z1-1.6},side===0?t*(W-3.2):side===1?(W-3.2)+t*(D-3.2):side===2?(W-3.2)+(D-3.2)+t*(W-3.2):2*(W-3.2)+(D-3.2)+t*(D-3.2));
  CAFES.push({x,z,h,guests:[pedLook(),pedLook()],ph:Math.random()*6}); } }
function drawCafes(camx,camz){ const M=MESHIDX; for(const k of CAFES){ if(Math.hypot(k.x-camx,k.z-camz)>110) continue; const c=Math.cos(k.h), s=Math.sin(k.h);
  P(M.cylY,k.x,.38,k.z,0,.05,.76,.05,MAT.STD+.4,.15,.15,.15,.8); P(M.cylY,k.x,.77,k.z,0,.7,.03,.7,MAT.STD+.5,.85,.85,.82,0); P(M.cylY,k.x,.84,k.z,0,.06,.1,.06,MAT.GLASS,.2,.15,.08,.5);
  P(M.cylY,k.x,1.3,k.z,0,.03,2.6,.03,MAT.STD,.3,.3,.3,0); P(M.cone,k.x,2.55,k.z,0,2.4,.5,2.4,MAT.STD+.9,.75,.15,.12,0);
  k.guests.forEach((g,i)=>{ const side=i?1:-1; const gx=k.x+side*.65*c, gz=k.z-side*.65*s; P(M.box,gx,.45,gz,k.h,.42,.05,.42,MAT.STD+.6,.2,.15,.1,0); drawPerson(gx,gz,k.h+(side>0?-Math.PI/2:Math.PI/2),g,0,false,{seated:true}); }); } }

/* banter that reacts to what happens */
const BANTER={
 fast:[['mira','Léo! Das ist kein Rennen. Ich möchte heute noch ankommen.'],['mira','Wenn du so weiterfährst, sammle ich keine Funken, sondern Strafzettel.']],
 crash:[['mira','Autsch. Fidèle hat das gespürt. Ich auch.'],['leo','Das war die Mauer, nicht ich.'],['mira','Vielleicht lenke ich ab jetzt.']],
 slowIdle:[['mira','Worauf warten wir? Die Funken sammeln sich nicht von allein.'],['leo','Kurz durchatmen. Schöne Aussicht hier, oder?']],
 night:[['mira','Es ist richtig dunkel geworden. Gut, dass die Fenster noch leuchten.'],['leo','Nachts sieht die Stadt viel freundlicher aus.']],
 dawn:[['mira','Die Sonne geht auf. Wir sind die ganze Nacht gefahren.'],['leo','Ich brauche einen Kaffee. Einen großen.']],
 rain:[['leo','Regen. Fidèles Scheibenwischer quietschen schon wieder.'],['mira','Ich liebe den Geruch von nassem Asphalt.']],
 swapSmaragd:[['mira','Okay, ich gebe zu: Das Ding fährt sich wie ein Traum.'],['leo','Ich vermisse jetzt schon das Klappern.']],
 swapFidele:[['mira','Willkommen zurück, Fidèle. Riecht wie immer nach altem Kaffee.'],['leo','Da ist sie wieder. Unsere Kiste.']],
 sparks:[['mira','Schau, wie das Glas leuchtet! Das sind schon ziemlich viele.'],['leo','Noch ein paar mehr, dann reicht es für den ganzen Lichtturm.']],
 enterEHV:[['mira','Eindhoven! Schau mal, die vielen Fahrräder.'],['leo','Hier fahren mehr Räder als Autos. Gefällt mir.']],
 enterLUX:[['mira','Zurück in Luxemburg. Fühlt sich an wie nach Hause kommen.']],
 motorway:[['leo','Die A-Route der Lichter. Fenster runter?'],['mira','Mach Musik an. Irgendwas, bei dem man mitsingen kann.']],
 furnace:[['mira','Die Hochöfen sehen nachts aus wie schlafende Riesen.']], canal:[['mira','Der Kanal glitzert. Lass uns irgendwann ein Boot mieten.']],
 cathedral:[['leo','Die Kathedrale. Meine Oma hat hier geheiratet. Glaube ich.']], people:[['mira','Schau, die Leute sitzen draußen im Café. Trotz allem.'],['leo','Solange Menschen draußen sitzen, ist nichts verloren.']]
};
const banterCd={}; let lastBanter=0;
function banter(kind,force){ const now=G.time; if(!force&&(now-lastBanter<14||(banterCd[kind]&&now-banterCd[kind]<120))) return; const l=pick(BANTER[kind]); if(!l) return; banterCd[kind]=now; lastBanter=now; bark(l[0],l[1]); }
let idleT=0, prevRegion='', prevNight=null, prevRain=0;
function updateBanter(dt,pl){ if(G.state!=='drive') return; const kmh=Math.abs(pl.v)*3.6;
  if(kmh>150) banter('fast'); if(pl.bump>6) banter('crash');
  idleT=Math.abs(pl.v)<.5?idleT+dt:0; if(idleT>18){ banter('slowIdle'); idleT=0; }
  const region=pl.x>MOTORWAY.x1?'ehv':pl.x>MOTORWAY.x0?'mw':'lux'; if(region!==prevRegion){ if(prevRegion) banter(region==='ehv'?'enterEHV':region==='mw'?'motorway':'enterLUX',true); prevRegion=region; }
  const night=G.hour>21.5||G.hour<5; if(prevNight!==null&&night!==prevNight) banter(night?'night':'dawn'); prevNight=night;
  if((envCur.rain||0)>.5&&prevRain<=.5) banter('rain'); prevRain=envCur.rain||0;
  if(G.light>0&&G.light%40===0&&G.light!==G._lastSparkBanter){ G._lastSparkBanter=G.light; banter('sparks'); }
  if(LM.licht&&Math.hypot(pl.x-CANAL.x0-300,pl.z-126)<120&&pl.x>CANAL.x0) banter('canal');
  if(pl.z>230&&pl.x<-200&&pl.x>-430) banter('furnace');
  for(const k of CAFES) if(Math.hypot(k.x-pl.x,k.z-pl.z)<25){ banter('people'); break; } }
function updateHumans(dt,pl){ spawnPeds(pl.x,pl.z); if(Math.random()<dt) spawnBikes(pl.x,pl.z); updatePeds(dt,pl); updateBikes(dt,pl); updateBanter(dt,pl); }
function drawHumans(cx,cz){ drawPeds(cx,cz); drawBikes(cx,cz); drawCafes(cx,cz); }
