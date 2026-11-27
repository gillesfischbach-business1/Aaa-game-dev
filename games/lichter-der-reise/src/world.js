/* ===== World generation: four places from the photos ===== */
let seed=1337; const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}; const rr=(a,b)=>a+(b-a)*rnd(); const pick=a=>a[(rnd()*a.length)|0];
const LANES=[-3.4,0,3.4], ROAD_HALF=5.3, CHUNK=30;
let statics=[], genZ=0, side={L:20,R:20}, landmarksDone={};
// static object
function S(m,x,y,z,sx,sy,sz,mat,col,param=0,ry=0,rx=0,rz=0,slot=0){ const o={m:typeof m==='string'?MESHIDX[m]:m,x,y,z,sx,sy,sz,mat,r:col[0],g:col[1],b:col[2],p:param,ry,rx,rz,slot,ext:Math.max(sx,sz)*0.6}; if(GRP) o.grp=GRP; statics.push(o); return o; }
let GRP=null; // while set, new statics belong to one rigid building
function lightAt(o,x,y,z,col,int,rad){ o.L={x,y,z,r:col[0]*int,g:col[1]*int,b:col[2]*int,rad}; return o; }
function partsAt(parts,X,Y,Z,ry=0){ const c=Math.cos(ry), s=Math.sin(ry); for(const q of parts){ const [m,x,y,z,sx,sy,sz,mat,r,g,b,p,rx,pry,rz,slot]=q;
  const o={m,x:X+x*c+z*s,y:Y+y,z:Z-x*s+z*c,sx,sy,sz,mat,r,g,b,p,ry:ry+pry,rx,rz,slot,ext:Math.max(sx,sz)}; if(GRP) o.grp=GRP; statics.push(o); } }

// ----- shared props -----
let SEDANS=null;
function sedanParts(col){ return compileParts([
  ['rbox',0,.62,0,1.78,.62,4.3,MAT.PAINT+.3,col,.6],['rbox',0,1.08,.25,1.56,.5,2.2,MAT.GLASSO,[.03,.035,.04],0],['rbox',0,1.34,.25,1.5,.06,1.9,MAT.PAINT+.3,col,.6],
  ['box',-.6,.68,-2.16,.38,.12,.03,MAT.EMI,[.9,.9,.85],.6],['box',.6,.68,-2.16,.38,.12,.03,MAT.EMI,[.9,.9,.85],.6],
  ['box',-.65,.74,2.16,.32,.12,.03,MAT.EMI,[1,.05,.03],1.5],['box',.65,.74,2.16,.32,.12,.03,MAT.EMI,[1,.05,.03],1.5],
  ...wheelParts(-.78,.32,-1.35,.32,.2,'steel'),...wheelParts(.78,.32,-1.35,.32,.2,'steel'),...wheelParts(-.78,.32,1.35,.32,.2,'steel'),...wheelParts(.78,.32,1.35,.32,.2,'steel')],MESHIDX); }
function sedan(x,z,ry=0){ if(!SEDANS) SEDANS=[[.55,.05,.06],[.1,.12,.2],[.75,.75,.76],[.15,.3,.5],[.06,.06,.065],[.5,.45,.4]].map(sedanParts); partsAt(pick(SEDANS),x,0,z,ry); }
function lamp(x,z,col,style='modern'){ const s=Math.sign(x)||1;
  if(style==='lantern'){ S('cylY',x,1.9,z,.12,3.8,.12,MAT.STD+.5,[.05,.05,.06],.8); S('box',x-s*.35,3.9,z,.7,.05,.05,MAT.STD+.5,[.05,.05,.06],.8);
    S('box',x-s*.65,3.62,z,.3,.42,.3,MAT.GLASSO,[.03,.03,.03],0); const o=S('box',x-s*.65,3.6,z,.24,.34,.24,MAT.EMI,col,7); lightAt(o,x-s*.65,3.4,z,col,30,16); return; }
  S('cylY',x,3.1,z,.14,6.2,.14,MAT.STD+.45,[.32,.33,.35],.9); S('box',x-s*.9,6.15,z,1.8,.08,.1,MAT.STD+.45,[.32,.33,.35],.9);
  S('box',x-s*1.7,6.08,z,.6,.12,.28,MAT.STD+.4,[.2,.2,.22],.8); const o=S('box',x-s*1.7,6.0,z,.5,.03,.22,MAT.EMI,col,14); lightAt(o,x-s*1.7,5.7,z,col,55,20); }
// kind: 'plane' (broad city tree), 'poplar' (tall column), 'pollard' (short, canal)
function tree(x,z,h=rr(5,8),col=[.09,.17,.06],kind='plane'){ const bark=[.13,.095,.06], v=()=>rr(.8,1.25), C=k=>[col[0]*k,col[1]*k,col[2]*k];
  S('cone',x,.18,z,h*.16,.36,h*.16,MAT.STD+.9,bark);
  if(kind==='poplar'){ S('cylY',x,h*.25,z,h*.035,h*.5,h*.035,MAT.STD+.9,bark); for(let k=0;k<4;k++){ const t=k/3; S('sph',x+rr(-.2,.2),h*(.42+t*.5),z+rr(-.2,.2),h*.26*(1-t*.45),h*.34,h*.26*(1-t*.45),MAT.FOLIAGE,C(v()*(.9+t*.3))); } return; }
  if(kind==='pollard'){ S('cylY',x,h*.3,z,h*.07,h*.6,h*.07,MAT.STD+.9,bark); for(let k=0;k<4;k++){ const a=k*1.57+rr(-.3,.3); S('sph',x+Math.cos(a)*h*.14,h*.62+rr(0,.5),z+Math.sin(a)*h*.14,h*.32,h*.26,h*.32,MAT.FOLIAGE,C(v())); } return; }
  const th=h*.45; S('cylY',x,th/2,z,h*.055,th,h*.055,MAT.STD+.9,bark);
  const a0=rr(0,6.28); for(let k=0;k<3;k++){ const a=a0+k*2.09+rr(-.4,.4), t=rr(.6,.9), l=h*.34, dx=Math.sin(t)*Math.sin(a), dy=Math.cos(t), dz=Math.sin(t)*Math.cos(a);
    const o=S('cylY',x+dx*l/2,th*.85+dy*l/2,z+dz*l/2,h*.03,l,h*.03,MAT.STD+.9,bark,0,a,t); o.ext=.5;
    const r=h*rr(.2,.27); S('sph',x+dx*l,th*.85+dy*l+r*.2,z+dz*l,r*2,r*1.5,r*2,MAT.FOLIAGE,C(v())); }
  S('sph',x,h*.9,z,h*.5,h*.36,h*.5,MAT.FOLIAGE,C(1.25*v()));
  for(let k=0;k<2;k++){ const a=a0+1+k*3.1; S('sph',x+Math.cos(a)*h*.14,h*.68,z+Math.sin(a)*h*.14,h*.42,h*.3,h*.42,MAT.FOLIAGE,C(.85*v())); } }
function palm(x,z){ const h=rr(7,9.5); for(let k=0;k<6;k++) S('cylY',x+k*.05,(k+.5)*h/6,z,.36-k*.025,h/6+.05,.36-k*.025,MAT.STD+.95,[.33,.26,.18]);
  for(let k=0;k<9;k++){ const a=k/9*Math.PI*2+rr(-.2,.2); S('sph',x+.3+Math.cos(a)*1.7,h+.1,z+Math.sin(a)*1.7,3.6,.12,.75,MAT.FOLIAGE,[.12,.22,.07],0,-a,0,-.35); } }
function planter(x,z){ S('rbox',x,.45,z,2.2,.9,1.2,MAT.STONE,[.75,.73,.7]); for(let k=0;k<3;k++) S('sph',x-.6+k*.6,1.1+rr(0,.3),z+rr(-.2,.2),1.1,1.1,1.0,MAT.FOLIAGE,[.08,.16,.06]); }
function barrierProp(x,z){ S('box',x,.5,z,2.4,.5,.3,MAT.STD+.6,[.95,.35,.05]); S('box',x,.5,z,2.42,.12,.32,MAT.STD+.6,[.95,.95,.95]); }

// ----- road -----
function roadChunk(z0,z1,ch){ const len=z0-z1, zc=(z0+z1)/2;
  if(ch===2){ S('box',0,-.15,zc,60,.3,len+.05,MAT.PAVER+.4,[.36,.2,.15]); return; }
  S('box',0,-.15,zc,ROAD_HALF*2,.3,len+.05,MAT.ROAD+.6,[.075,.075,.08]);
  for(let z=Math.floor(z0/9)*9;z>z1;z-=9){ if(z>z0)continue; for(const lx of [-1.7,1.7]) S('box',lx,.003,z-1.5,.14,.01,3,MAT.STD+.6,[.75,.75,.72]); }
  for(const sx of [-1,1]){ S('box',sx*(ROAD_HALF-.25),.003,zc,.15,.01,len,MAT.STD+.6,[.75,.72,.6]);
    S('box',sx*(ROAD_HALF+.12),.08,zc,.24,.32,len+.02,MAT.STONE,[.55,.55,.55]);
    S('box',sx*(ROAD_HALF+2.25),.1,zc,4.0,.2,len+.02,MAT.PAVER+.5,ch===3?[.62,.56,.5]:[.4,.39,.38]); }
}

// ----- chapter 1: Belval, blast furnaces at dusk -----
function blastFurnace(x,z){ const h=rr(34,44), R=rr(5,6.5);
  S('cylY',x,h/2,z,R,h,R,MAT.RUST,[.28,.24,.22]);
  for(let k=1;k<6;k++) S('cylY',x,k*h/6,z,R*2.6,.25,R*2.6,MAT.RUST,[.22,.2,.19]);
  for(let k=0;k<4;k++){ const a=k*Math.PI/2+.4; S('cylY',x+Math.cos(a)*R*1.15,h*.45,z+Math.sin(a)*R*1.15,.6,h*.9,.6,MAT.RUST,[.25,.2,.18]); }
  S('cylY',x,h+3,z,R*.45,6,R*.45,MAT.RUST,[.2,.18,.17]); const top=S('cylY',x,h+6.2,z,R*.4,.4,R*.4,MAT.EMI,[1,.4,.1],6); lightAt(top,x+2,h+7,z,[1,.42,.12],900,90);
  S('cylX',x+R+8,h*.78,z,16,1.4,1.4,MAT.RUST,[.26,.22,.2]); S('cylY',x+R+16,h*.4,z,1.3,h*.8,1.3,MAT.RUST,[.26,.22,.2]);
  for(let k=0;k<3;k++){ const sx=x-R-7-k*7.5; S('cylY',sx,h*.38,z+rr(-3,3),3.2,h*.76,3.2,MAT.RUST,[.42,.18,.12]); S('sph',sx,h*.76,z,6.4,4,6.4,MAT.RUST,[.42,.18,.12]); }
  S('box',x+4,h*.55,z+R+4,2,h*1.1,2,MAT.RUST,[.2,.2,.2],0,0,0,.42); // inclined skip conveyor
  for(let k=0;k<8;k++) S('box',x-R-1.5,3+k*4,z-R,3,.15,3,MAT.STD+.6,[.3,.28,.26],.7); // platforms
  const glow=S('box',x,1.5,z+R+.2,4,3,.2,MAT.EMI,[1,.35,.06],3); lightAt(glow,x,2,z+R+3,[1,.35,.08],260,40);
}
function genBelval(z0,z1){
  fillSide('R',z1,z=>{ const r=rnd(); let d;
    if(r<0.45){ d=rr(22,34); const w=rr(14,20), h=rr(14,24); const x=ROAD_HALF+9+w/2;
      S('box',x,h/2,z-d/2,w,h,d-1,MAT.FACADE+.5,[.42,.18,.12],0); S('box',x,h+.3,z-d/2,w+.4,.6,d-.6,MAT.STONE,[.3,.25,.22]);
      if(rnd()<.5) S('quad',x-w/2-.06,h-3.2,z-d/2,9,2.3,1,MAT.DECAL,[1,1,1],.8,-Math.PI/2,0,0,SLOT.BELVAL);
    } else if(r<0.7){ d=rr(24,32); const w=rr(16,24), h=rr(16,26); const x=ROAD_HALF+10+w/2;
      S('box',x,h/2,z-d/2,w,h,d-1,MAT.FACADE+.4,[.62,.08,.07],3);
    } else { d=rr(18,26); // parking with cars and trees
      for(let k=0;k<3;k++) sedan(ROAD_HALF+7+k*2.6,z-rr(3,d-4),Math.PI/2*(rnd()<.5?1:-1));
      tree(ROAD_HALF+5,z-d*.3); S('box',ROAD_HALF+12,-.1,z-d/2,14,.2,d,MAT.PAVER+.5,[.42,.4,.36]); }
    return d; });
  fillSide('L',z1,z=>{ const r=rnd(); let d;
    if(r<0.4){ d=rr(46,60); blastFurnace(-(ROAD_HALF+32+rr(0,10)),z-d/2); }
    else if(r<0.7){ d=rr(14,20); const x=-(ROAD_HALF+12+rr(0,6)), h=rr(26,42); S('cylY',x,h/2,z-d/2,2.2,h,2.2,MAT.STONE,[.45,.22,.16]); S('cylY',x,h+.3,z-d/2,2.5,.6,2.5,MAT.EMI,[1,.4,.12],3); for(let k=1;k<4;k++) S('cylY',x,h*k/4,z-d/2,2.35,.4,2.35,MAT.EMI,[1,.18,.15],1.3); }
    else { d=rr(18,26); const w=rr(10,16), h=rr(6,10); S('box',-(ROAD_HALF+8+w/2),h/2,z-d/2,w,h,d-2,MAT.FACADE+.6,[.33,.3,.3],0); tree(-(ROAD_HALF+4),z-d/2); }
    return d; });
}
// ----- chapter 2: Luxembourg City by night -----
function gableHouse(x,z,w,d,h,col,style=2,rotY=0){ S('box',x,h/2,z,w,h,d,MAT.FACADE+.6,col,style,rotY); S('gable',x,h,z,w*1.04,w*.45,d*1.02,MAT.STONE,[.12,.12,.14],0,rotY+Math.PI/2*0); }
function archViaduct(x,z,len){ const span=10, H=24, pw=2.6, r=(span-pw)/2, yc=H-4.5-r;
  for(let k=0;k*span<len;k++){ const zp=z-k*span, zm=zp-span/2;
    S('box',x,(H-2+-4)/2,zp,4.2,H+2,pw,MAT.STONE,[.5,.46,.4]);
    for(let s2=0;s2<10;s2++){ const a=(s2+.5)/10*Math.PI; S('box',x,yc+Math.sin(a)*r,zm+Math.cos(a)*r,4.3,.9,Math.PI*r/10+.25,MAT.STONE,[.56,.52,.45],0,0,-(a+Math.PI/2)); }
    S('box',x,(yc+r+H)/2,zm,4.2,H-(yc+r)+.4,span-pw+.1,MAT.STONE,[.5,.46,.4]);
    S('box',x,H+.4,zm,4.8,.8,span+.1,MAT.STONE,[.45,.42,.38]);
    if(k%2===0){ const o=S('sph',x+2.6,H+1.4,zp,.3,.3,.3,MAT.EMI,[1,.8,.5],10); lightAt(o,x+2.8,H,zp,[1,.75,.45],80,26); } } }
function genBruecken(z0,z1){
  fillSide('R',z1,z=>{ const d=rr(9,13), w=rr(10,14), h=rr(12,19); const x=ROAD_HALF+5+w/2;
    const pal=pick([[.62,.55,.45],[.55,.5,.44],[.62,.48,.4],[.68,.62,.52],[.5,.52,.55]]);
    gableHouse(x,z-d/2,w,d-.3,h,pal,pick([1,2]));
    const r=rnd();
    if(r<.22){ const c=pick([[.7,.15,1],[.25,.35,1]]); const c2=c[0]>.5?[.25,.35,1]:[.7,.15,1]; const a=S('box',x-w/2-1.2,.3,z-d*.3,.3,.3,.3,MAT.EMI,c,3); lightAt(a,x-w/2-1.4,1,z-d*.3,c,260,18);
      const b=S('box',x-w/2-1.2,.3,z-d*.75,.3,.3,.3,MAT.EMI,c2,3); lightAt(b,x-w/2-1.4,1,z-d*.75,c2,260,18);
      S('quad',x-w/2-.06,3.6,z-d/2,4.5,1.1,1,MAT.DECAL,[1,1,1],3,-Math.PI/2,0,0,SLOT.BAR); }
    else if(r<.36) S('quad',x-w/2-.06,3.5,z-d/2,4.2,1.05,1,MAT.DECAL,[1,1,1],3,-Math.PI/2,0,0,SLOT.BOUL);
    else if(r<.45) S('quad',x-w/2-.06,3.5,z-d/2,4,1,1,MAT.DECAL,[1,1,1],3,-Math.PI/2,0,0,SLOT.PHARMA);
    if(rnd()<.35) sedan(ROAD_HALF+2.9,z-d/2,Math.PI);
    if(rnd()<.4) tree(ROAD_HALF+3.2,z-rr(1,d-1),rr(5,7));
    return d; });
  fillSide('L',z1,z=>{ const d=12;
    S('box',-(ROAD_HALF+1.2),.6,z-d/2,.6,1.2,d+.02,MAT.STONE,[.55,.5,.44]); // parapet
    S('box',-38,-22,z-d/2,60,40,d+.5,MAT.STONE,[.25,.23,.22]); // valley floor
    if(rnd()<.85){ const w=rr(7,11), h=rr(8,14), x=-24-rr(0,30); gableHouse(x,z-d/2,w,d*rr(.55,.9),h,pick([[.66,.6,.5],[.6,.52,.42],[.7,.64,.54]]),2); }
    if(rnd()<.6) tree(-12-rr(0,8),z-rr(0,d),rr(6,9),[.05,.1,.05]);
    // cliff with old town on top
    S('box',-88,6,z-d/2,40,32,d+.5,MAT.STONE,[.36,.32,.28]);
    for(let k=0;k<2;k++){ const w=rr(6,10), h=rr(9,15); gableHouse(-74-k*11-rr(0,4),22+h/2-.01-h/2,w,d*rr(.6,.9),h,pick([[.72,.66,.56],[.66,.6,.5],[.75,.7,.62]]),2); }
    if(rnd()<.18){ const tx=-82; S('cylY',tx,22+11,z-d/2,4,22,4,MAT.STONE,[.62,.58,.5]); S('cone',tx,22+26,z-d/2,4.6,9,4.6,MAT.STONE,[.16,.3,.26]); const sp=S('sph',tx,22+16,z-d/2-2.1,1,1,1,MAT.EMI,[1,.8,.5],8); lightAt(sp,tx,22+12,z-d/2-6,[1,.75,.45],400,40); }
    return d; });
  archViaduct(-46,z0,30);
}
// ----- chapter 3: the square of fire orbs -----
function genGlut(z0,z1){
  for(const sd of [-1,1]) fillSide(sd<0?'L':'R',z1,z=>{ const d=rr(6,9), w=10, h=rr(9,13); const x=sd*(ROAD_HALF+9+w/2);
    S('box',x,h/2,z-d/2,w,h,d-.15,MAT.FACADE+.7,[.3,.13,.09],5); S('gable',x,h,z-d/2,w*.98,rr(2.5,4),d-.1,MAT.STONE,[.1,.08,.08],0,Math.PI/2);
    if(rnd()<.3){ S('box',sd*(ROAD_HALF+5.5),2.6,z-d/2,1.2,5.2,1.2,MAT.GLASSO,[.3,.28,.28],0); S('box',sd*(ROAD_HALF+5.5),.1,z-d/2,1.5,.2,1.5,MAT.STONE,[.2,.2,.2]); }
    if(rnd()<.35) S('box',sd*(ROAD_HALF+6.5),.6,z-d/2,4,1.2,1.4,MAT.FOLIAGE,[.06,.1,.04]);
    if(rnd()<.25) S('quad',x-sd*(w/2+.06),3.5,z-d/2,4,1,1,MAT.DECAL,[1,1,1],2.5,sd>0?-Math.PI/2:Math.PI/2,0,0,SLOT.CAFE);
    return d; });
  for(let z=z0-rr(4,12); z>z1; z-=rr(9,14)){ const x=rr(-15,15), y=rr(7,14), r=rr(1.3,2.8);
    const o=S('sph',x,y,z,r*2,r*2,r*2,MAT.LAVA,[1,1,1],0.55); o.bob=rnd()*6; lightAt(o,x,y-1,z,[1,.4,.1],140,24);
    for(let k=0;k<3;k++) S('sph',x+rr(-.3,.3),y-r-1-k*1.1,z+rr(-.3,.3),.14,1.4,.14,MAT.EMI,[1,.45,.12],4); }
}
// ----- chapter 4: Monte-Carlo harbour at sunset -----
function yacht(x,z,L){ const H=L*.105; const hc=pick([[.92,.92,.94],[.92,.92,.94],[.04,.07,.14],[.6,.62,.65]]);
  partsAt(compileParts([
    ['yHull',0,0,0,L/30,L/30,L/30,MAT.PAINT+.2,hc,.2],['box',0,H*.62,0,L*.168,.12,L*.86,MAT.STD+.5,[.6,.45,.3],0],
    ['box',0,H+.9,L*.06,L*.16,1.8,L*.5,MAT.FACADE+.3,[.95,.95,.96],6],['box',0,H+2.6,L*.1,L*.13,1.5,L*.3,MAT.FACADE+.3,[.95,.95,.96],6],
    ['box',0,H+3.8,L*.14,L*.1,.9,L*.14,MAT.STD+.3,[.95,.95,.96],0],['cylY',0,H+5.5,L*.12,.12,3.5,.12,MAT.STD+.3,[.9,.9,.9],0],
    ['sph',0,H+7.2,L*.12,1.3,1.3,1.3,MAT.STD+.3,[.96,.96,.97],0],['sph',L*.03,H+6.2,L*.17,1,1,1,MAT.STD+.3,[.96,.96,.97],0],
    ['box',0,H+.15,-L*.3,L*.12,.1,L*.25,MAT.STD+.6,[.45,.32,.2],0]],MESHIDX),x,-.4,z,0);
  const m=S('sph',x,H+9.4,z,.25,.25,.25,MAT.EMI,[1,.25,.2],10); lightAt(m,x,H+3,z-L*.2,[1,.85,.6],120,20); }
function genHafen(z0,z1){
  S('box',-120,-.8,(z0+z1)/2,220,.2,CHUNK+.04,MAT.WATER,[.02,.09,.12]);
  S('box',-(ROAD_HALF+6),-.25,(z0+z1)/2,8,1.0,CHUNK+.02,MAT.STONE,[.62,.58,.52]);
  for(let z=z0-5;z>z1;z-=10) S('cylY',-(ROAD_HALF+9.6),.4,z,.3,.6,.3,MAT.STD+.5,[.1,.1,.1]); // bollards
  fillSide('L',z1,z=>{ const L=rr(20,38), d=L+rr(7,16); yacht(-(ROAD_HALF+13+L*.09+rr(0,8)),z-d/2,L); return d; });
  fillSide('R',z1,z=>{ const d=rr(16,24), w=rr(14,20), h=rr(18,36); const x=ROAD_HALF+11+w/2;
    S('box',x,h/2,z-d/2,w,h,d-1,MAT.FACADE+.6,pick([[.88,.85,.78],[.86,.78,.66],[.92,.88,.82],[.82,.72,.62]]),pick([1,4]));
    S('box',x-w/2-1.4,3.2,z-d/2,2.8,.15,d-3,MAT.STD+.7,[.15,.15,.17]);
    if(rnd()<.35) S('quad',x-w/2-.06,h-3,z-d/2,7.2,1.8,1,MAT.DECAL,[1,1,1],.8,-Math.PI/2,0,0,SLOT.MONTE);
    else if(rnd()<.3) S('quad',x-w/2-.06,4.4,z-d/2,5,1.25,1,MAT.DECAL,[1,1,1],2,-Math.PI/2,0,0,SLOT.HOTEL);
    palm(ROAD_HALF+3.4,z-rr(2,d-2)); if(rnd()<.6) planter(ROAD_HALF+6.2,z-rr(2,d-2));
    if(rnd()<.4){ const ux=ROAD_HALF+7.5; S('cylY',ux,1.3,z-d/2,.06,2.6,.06,MAT.STD,[.3,.3,.3]); const u=S('cone',ux,2.65,z-d/2,4,.7,4,MAT.STD+.9,[.94,.9,.84]); lightAt(u,ux,2.1,z-d/2,[1,.75,.45],40,9); }
    // hillside city and mountains
    const hx=ROAD_HALF+48+rr(0,30), hh=rr(18,40); S('box',hx,hh/2+rr(0,14),z-d/2,rr(12,20),hh,d,MAT.FACADE+.6,[.8,.74,.66],1);
    S('box',ROAD_HALF+130,40,z-d/2,60,90,d+2,MAT.STONE,[.32,.3,.27]);
    return d; });
}
function fillSide(k,z1,fn){ while(side[k]>z1){ const d=fn(side[k]); side[k]-=d; } }
