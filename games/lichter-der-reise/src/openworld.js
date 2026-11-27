/* ===== Open world: fictional Luxembourg and Eindhoven, joined by the "A-Route der Lichter" =====
   X = east, Z = south. Heading 0 faces -Z (north). */
const OW={B:72,W:12,P:84};
const CITY={ lux:{cx:0,cz:0,n:5,name:'Luxemburg'}, ehv:{cx:1900,cz:0,n:4,name:'Eindhoven'} };
const VALLEY={x0:-246,x1:-174,z0:-414,z1:246,floor:-32};
const CANAL={x0:1558,x1:2242,z0:90,z1:162,water:-2.2};
const MOTORWAY={x0:420,x1:1564,hw:10};
const WORLD={x0:-1400,x1:3300,z0:-1400,z1:1400};
const LUX_BRIDGES=[-4,-2,1], EHV_BRIDGES=[-3,0,2];
let colliders=new Map(), cells=new Map(), globalStatics=[], roadsList=[], graph={nodes:new Map(),edges:[]}, mapItems=[], sparksAll=[];
const CC=32, CELL=64;
function addCol(x0,z0,x1,z1,tag){ const c={x0:Math.min(x0,x1),z0:Math.min(z0,z1),x1:Math.max(x0,x1),z1:Math.max(z0,z1),tag};
  for(let gx=Math.floor(c.x0/CC);gx<=Math.floor(c.x1/CC);gx++) for(let gz=Math.floor(c.z0/CC);gz<=Math.floor(c.z1/CC);gz++){ const k=gx+','+gz; let a=colliders.get(k); if(!a){ a=[]; colliders.set(k,a); } a.push(c); } return c; }
function colsNear(x,z,out){ out.length=0; const gx=Math.floor(x/CC), gz=Math.floor(z/CC); for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++){ const a=colliders.get((gx+i)+','+(gz+j)); if(a) for(const c of a) if(!out.includes(c)) out.push(c); } return out; }
function boxCol(x,z,w,d,ry=0){ const sw=Math.abs(Math.cos(ry))*w+Math.abs(Math.sin(ry))*d, sd=Math.abs(Math.sin(ry))*w+Math.abs(Math.cos(ry))*d; return addCol(x-sw/2,z-sd/2,x+sw/2,z+sd/2); }
function mapRect(kind,x0,z0,x1,z1){ mapItems.push({kind,x0:Math.min(x0,x1),z0:Math.min(z0,z1),x1:Math.max(x0,x1),z1:Math.max(z0,z1)}); }
function node(x,z){ const k=Math.round(x)+','+Math.round(z); let n=graph.nodes.get(k); if(!n){ n={x,z,edges:[]}; graph.nodes.set(k,n); } return n; }
function edge(a,b,lanes=1){ const e={a,b,lanes}; a.edges.push(e); b.edges.push(e); graph.edges.push(e); }

// ---------- road pieces ----------
function roadRect(x0,z0,x1,z1,marks=true){ const cx=(x0+x1)/2, cz=(z0+z1)/2, w=Math.abs(x1-x0), d=Math.abs(z1-z0);
  S('box',cx,-.04,cz,w,.1,d,MAT.ROAD+.6,[.075,.075,.08]); roadsList.push({x0:Math.min(x0,x1),z0:Math.min(z0,z1),x1:Math.max(x0,x1),z1:Math.max(z0,z1)}); mapRect('road',x0,z0,x1,z1);
  if(!marks) return; const along=w>d;
  const L=along?w:d; for(let t=-L/2+3;t<L/2-3;t+=8){ if(along) S('box',cx+t,.012,cz,3,.01,.14,MAT.STD+.6,[.72,.72,.68]); else S('box',cx,.012,cz+t,.14,.01,3,MAT.STD+.6,[.72,.72,.68]); } }
function lampAt(x,z,ry,col,style){ const c=Math.cos(ry), s=Math.sin(ry); // arm points along local -X rotated by ry
  if(style==='lantern'){ S('cylY',x,1.9,z,.12,3.8,.12,MAT.STD+.5,[.05,.05,.06],.8); const ax=x-c*.6, az=z+s*.6; S('box',(x+ax)/2,3.9,(z+az)/2,.62,.05,.05,MAT.STD+.5,[.05,.05,.06],.8,ry);
    S('box',ax,3.62,az,.3,.42,.3,MAT.GLASSO,[.03,.03,.03],0,ry); const o=S('box',ax,3.6,az,.24,.34,.24,MAT.EMI,col,7,ry); lightAt(o,ax,3.4,az,col,30,16); }
  else { S('cylY',x,3.1,z,.14,6.2,.14,MAT.STD+.45,[.32,.33,.35],.9); const ax=x-c*1.7, az=z+s*1.7; S('box',x-c*.9,6.15,z+s*.9,1.8,.08,.1,MAT.STD+.45,[.32,.33,.35],.9,ry);
    S('box',ax,6.08,az,.6,.12,.28,MAT.STD+.4,[.2,.2,.22],.8,ry); const o=S('box',ax,6.0,az,.5,.03,.22,MAT.EMI,col,14,ry); lightAt(o,ax,5.7,az,col,55,20); }
  addCol(x-.25,z-.25,x+.25,z+.25); }

// ---------- street furniture ----------
function bench(x,z,ry){ S('box',x,.45,z,1.8,.06,.45,MAT.STD+.7,[.35,.22,.12],0,ry); S('box',x,.72,z,1.8,.4,.06,MAT.STD+.7,[.35,.22,.12],0,ry,-.15); for(const d of [-.75,.75]) S('box',x+Math.cos(ry)*d,.22,z-Math.sin(ry)*d,.06,.44,.4,MAT.STD+.4,[.1,.1,.11],.8,ry); }
function bin(x,z){ S('cylY',x,.45,z,.42,.9,.42,MAT.STD+.5,[.12,.22,.15],.5); S('cylY',x,.92,z,.46,.06,.46,MAT.STD+.4,[.1,.1,.1],.8); }
function bollard(x,z){ S('cylY',x,.45,z,.16,.9,.16,MAT.STD+.4,[.12,.12,.13],.6); S('cylY',x,.85,z,.17,.08,.17,MAT.STD+.3,[.8,.8,.8],1); }
function parkedBike(x,z,ry){ const c=Math.cos(ry), s2=Math.sin(ry), col=pick([[.08,.08,.09],[.5,.1,.08],[.15,.3,.45],[.85,.85,.8],[.2,.4,.25]]);
  for(const d of [-.5,.5]) S('cylX',x+s2*d,.34,z+c*d,.03,.66,.66,MAT.STD+.4,[.05,.05,.05],0,ry);
  S('box',x,.55,z,.04,.05,.95,MAT.STD+.3,col,.5,ry); S('box',x+s2*.2,.72,z+c*.2,.05,.35,.05,MAT.STD+.3,col,.5,ry); S('box',x-s2*.47,.95,z-c*.47,.48,.03,.03,MAT.STD+.3,[.1,.1,.1],0,ry); S('box',x+s2*.22,.92,z+c*.22,.12,.04,.22,MAT.STD+.6,[.08,.06,.05],0,ry); }
function awning(x,z,ry,w){ const col=pick([[.6,.1,.1],[.1,.3,.2],[.12,.2,.45],[.8,.6,.2],[.3,.3,.32]]); S('box',x,3.25,z,w,.06,1.6,MAT.STD+.95,col,0,ry,.32); }
// ---------- districts ----------
const STYLE={
 altstadt:{fac:2,cols:[[.72,.66,.56],[.66,.6,.5],[.75,.7,.62],[.7,.62,.5]],h:[11,17],d:[11,14],w:[7,11],gable:true,roof:[.14,.14,.16],lamp:'lantern',shops:.35,trees:.2},
 west:{fac:1,cols:[[.82,.78,.7],[.78,.72,.64],[.86,.82,.74],[.7,.72,.74]],h:[9,15],d:[12,15],w:[9,14],gable:true,roof:[.2,.2,.22],lamp:'lantern',shops:.15,trees:.5},
 center:{fac:1,cols:[[.85,.8,.72],[.8,.74,.66],[.62,.55,.48],[.88,.85,.8],[.7,.6,.52]],h:[14,22],d:[13,16],w:[10,16],gable:false,roof:[.2,.2,.22],lamp:'modern',shops:.45,trees:.35},
 kirchberg:{fac:3,cols:[[.35,.42,.5],[.55,.12,.1],[.2,.25,.3],[.6,.62,.64]],h:[26,70],d:[18,26],w:[18,30],gable:false,roof:[.15,.15,.16],lamp:'modern',shops:.1,trees:.4},
 belval:{fac:0,cols:[[.42,.18,.12],[.5,.22,.15]],h:[14,24],d:[16,22],w:[18,30],gable:false,roof:[.2,.18,.17],lamp:'modern',shops:.1,trees:.3},
 brick:{fac:5,cols:[[.36,.16,.11],[.3,.13,.09],[.42,.2,.14],[.28,.14,.11]],h:[8,12],d:[10,12],w:[5.5,8],gable:true,roof:[.1,.08,.08],lamp:'modern',shops:.3,trees:.45},
 strijp:{fac:0,cols:[[.4,.2,.14],[.34,.18,.13]],h:[16,28],d:[20,28],w:[24,40],gable:false,roof:[.12,.12,.13],lamp:'modern',shops:.15,trees:.2}
};
function luxDistrict(i,j){ if(i===-3&&j<3) return 'valley'; if(j>=3) return 'belval'; if(i>=-2&&i<=0&&j<=-1) return 'altstadt'; if(i>=2&&j<=-1) return 'kirchberg'; if(i===1&&j===1) return 'park'; if(i<=-4) return 'west'; return 'center'; }
function ehvDistrict(i,j){ if(j===1) return 'canal'; if(i===0&&j===-2) return 'glow'; if(i===-1&&j===-1) return 'lichtturm'; if(i===2&&j===2) return 'ufo'; if(i===1&&j===2) return 'station'; if(i===2&&j===-3) return 'park'; if(i<=-3) return 'strijp'; return 'brick'; }

function fillBlock(x0,z0,x1,z1,st,env){
  S('box',(x0+x1)/2,.06,(z0+z1)/2,x1-x0,.12,z1-z0,MAT.PAVER+.5,[.42,.4,.38]); mapRect('block',x0,z0,x1,z1);
  for(const zz of [z0+.14,z1-.14]) S('box',(x0+x1)/2,.09,zz,x1-x0,.2,.28,MAT.STONE,[.5,.49,.47]); for(const xx of [x0+.14,x1-.14]) S('box',xx,.09,(z0+z1)/2,.28,.2,z1-z0,MAT.STONE,[.5,.49,.47]);
  const s=3, D=rr(st.d[0],st.d[1]);
  const rows=[ // [axis along x?, fixed coordinate of facade, inward direction, start, end]
    {ax:true,fz:z0+s,dir:1,a:x0+s,b:x1-s,ry:0},{ax:true,fz:z1-s,dir:-1,a:x0+s,b:x1-s,ry:Math.PI},
    {ax:false,fz:x0+s,dir:1,a:z0+s+D,b:z1-s-D,ry:-Math.PI/2},{ax:false,fz:x1-s,dir:-1,a:z0+s+D,b:z1-s-D,ry:Math.PI/2}];
  for(const r of rows){ let t=r.a; while(t<r.b-3){ let w=Math.min(rr(st.w[0],st.w[1]),r.b-t); if(r.b-t-w<st.w[0]*.6) w=r.b-t; const h=rr(st.h[0],st.h[1]); const col=pick(st.cols); const mid=t+w/2; const cIn=r.fz+r.dir*D/2;
      const x=r.ax?mid:cIn, z=r.ax?cIn:mid, sx=r.ax?w-.15:D, sz=r.ax?D:w-.15;
      S('box',x,h/2+.1,z,sx,h,sz,MAT.FACADE+.6,col,st.fac); addCol(x-sx/2,z-sz/2,x+sx/2,z+sz/2);
      { // facade depth kit: plinth, shop-floor band, cornice, pilaster, recessed entrance, bay
        const F=(al,y,len,hg,dp,mat,c,par=0)=>{ const cc=r.fz-r.dir*(dp/2-.02); return S('box',r.ax?al:cc,y,r.ax?cc:al,r.ax?len:dp,hg,r.ax?dp:len,mat,c,par); };
        const dk=[col[0]*.5,col[1]*.5,col[2]*.5], lt=[Math.min(1,col[0]*1.12),Math.min(1,col[1]*1.12),Math.min(1,col[2]*1.12)];
        if(st.fac!==3){ F(mid,.5,w-.15,.9,.22,MAT.STONE,dk); F(mid,3.75,w-.15,.28,.3,MAT.STONE,st.fac===5||st.fac===0?[.62,.6,.56]:lt);
          F(mid,h-.12,w+.1,.42,.55,MAT.STONE,st.fac===5||st.fac===0?[.5,.48,.45]:lt); F(t+.2,h/2+.1,.36,h,.16,MAT.STONE,[col[0]*.85,col[1]*.85,col[2]*.85]);
          const dx=mid+(rnd()<.5?-1:1)*w*.25; F(dx,1.45,1.3,2.5,.12,MAT.STD+.5,[.05,.04,.04],.2); F(dx,2.85,1.7,.2,.3,MAT.STONE,lt);
          if(st.gable&&st.fac!==5&&h>10&&rnd()<.3){ const bh=h-7; F(mid-(dx>mid?1:-1)*w*.2,3.9+bh/2,2.6,bh,.9,MAT.FACADE+.6,col,st.fac); F(mid-(dx>mid?1:-1)*w*.2,3.9+bh+.12,2.9,.24,1.1,MAT.STONE,lt); }
          if(st.fac===5&&rnd()<.4) F(mid,h+.75,w-.3,1.5,.3,MAT.FACADE+.6,col,st.fac);
        } else { F(mid,2.2,w-.15,4.2,.25,MAT.STD+.3,[.07,.08,.09],.6); F(mid,4.5,w+.1,.3,.8,MAT.STD+.4,[.6,.62,.64],.7);
          if(h>40){ S('box',x,h+1.6,z,sx*.5,2.4,sz*.5,MAT.STD+.5,[.3,.32,.35],.5); S('cylY',x,h+8,z,.25,11,.25,MAT.STD+.4,[.6,.6,.62],.8); S('sph',x,h+13.6,z,.5,.5,.5,MAT.EMI,[1,.05,.03],6); } }
      }
      if(st.gable) S('gable',x,h+.1,z,r.ax?D*1.02:w*.98,Math.min(w,D)*.42,r.ax?w*.98:D*1.02,MAT.STONE,st.roof,0,r.ax?Math.PI/2:0);
      else if(st===STYLE.strijp){ const n=Math.max(2,Math.round((r.ax?sx:sz)/7)); for(let q=0;q<n;q++){ const o=-((r.ax?sx:sz)/2)+((r.ax?sx:sz)/n)*(q+.5); S('gable',r.ax?x+o:x,h+.1,r.ax?z:z+o,r.ax?(sx/n)*.98:sx*.98,3.2,r.ax?sz*.98:(sz/n)*.98,MAT.GLASSO,[.12,.14,.16],0,r.ax?0:Math.PI/2); } }
      else S('box',x,h+.4,z,sx*.96,.6,sz*.96,MAT.STONE,st.roof);
      if(rnd()<st.shops){ const slot=pick([SLOT.BOUL,SLOT.PHARMA,SLOT.CAFE,SLOT.HOTEL,SLOT.FRITES]); const off=.07; // sign on facade facing the street
        const fx=r.ax?mid:r.fz-r.dir*off, fz2=r.ax?r.fz-r.dir*off:mid; const fr=r.ax?(r.dir>0?Math.PI:0):(r.dir>0?-Math.PI/2:Math.PI/2); S('quad',fx,4.2,fz2,Math.min(w*.8,5),Math.min(w*.8,5)/4,1,MAT.DECAL,[1,1,1],2.2,fr,0,0,slot);
        if(st.fac!==3&&rnd()<.7){ const ax2=r.ax?mid:r.fz-r.dir*.8, az2=r.ax?r.fz-r.dir*.8:mid; awning(ax2,az2,fr,Math.min(w*.85,6)); } }
      if((st.fac===1||st.fac===2)&&h>11&&rnd()<.35){ const fr=r.ax?(r.dir>0?Math.PI:0):(r.dir>0?-Math.PI/2:Math.PI/2); const fl=st.fac===2?3.2:3.2; for(let y=fl*1+.2;y<h-2;y+=fl){ for(const o of [-w*.25,w*.25]){ const bx=r.ax?mid+o:r.fz-r.dir*.6, bz=r.ax?r.fz-r.dir*.6:mid+o;
          S('box',bx,y,bz,2.2,.14,1.2,MAT.STONE,[.7,.68,.64],0,fr); const rx2=r.ax?bx:bx-r.dir*.55, rz2=r.ax?bz-r.dir*.55:bz; S('box',rx2,y+.5,rz2,2.2,.9,.04,MAT.STD+.4,[.1,.1,.11],.6,fr); } } }
      if(st.gable&&rnd()<.5){ const cx2=x+(r.ax?rr(-sx/3,sx/3):0), cz2=z+(r.ax?0:rr(-sz/3,sz/3)); S('box',cx2,h+Math.min(w,D)*.3,cz2,.7,1.6,.7,MAT.FACADE+.6,[.4,.2,.14],5); }
      else if(!st.gable&&st!==STYLE.strijp&&rnd()<.6){ S('box',x+rr(-sx/4,sx/4),h+1.1,z+rr(-sz/4,sz/4),2.2,1.2,1.6,MAT.STD+.5,[.55,.56,.58],.6); }
      t+=w; } }
  // courtyard
  const ix0=x0+s+D, ix1=x1-s-D, iz0=z0+s+D, iz1=z1-s-D;
  if(st===STYLE.strijp&&rnd()<.6){ const cx=(x0+x1)/2+rr(-6,6), cz=(z0+z1)/2+rr(-6,6), H=rr(38,50); S('cylY',cx,H/2,cz,3.2,H,3.2,MAT.FACADE+.6,[.4,.18,.12],5); S('cylY',cx,H+.4,cz,3.6,.8,3.6,MAT.STONE,[.25,.2,.18]); addCol(cx-1.6,cz-1.6,cx+1.6,cz+1.6); }
  if(ix1-ix0>6&&iz1-iz0>6){ S('box',(ix0+ix1)/2,.14,(iz0+iz1)/2,ix1-ix0,.04,iz1-iz0,MAT.GRASS,[.12,.2,.08]); if(rnd()<.8) tree((ix0+ix1)/2+rr(-4,4),(iz0+iz1)/2+rr(-4,4)); }
  // lamps and street trees along the four sidewalks
  for(const [ax,c,a,b,ry] of [[true,z0+1.4,x0+6,x1-6,-Math.PI/2],[true,z1-1.4,x0+6,x1-6,Math.PI/2],[false,x0+1.4,z0+6,z1-6,0],[false,x1-1.4,z0+6,z1-6,Math.PI]]){
    for(let t=a+rr(0,6);t<b;t+=26){ if(ax) lampAt(t,c,ry,env.lamp,st.lamp); else lampAt(c,t,ry,env.lamp,st.lamp); }
    if(rnd()<st.trees) for(let t=a+13;t<b;t+=26){ const tx=ax?t:c, tz=ax?c:t; tree(tx,tz,rr(5,7)); addCol(tx-.3,tz-.3,tx+.3,tz+.3); }
    // furniture between lamps: benches, bins, bike racks (Eindhoven), bollards at the corners
    for(let t=a+6.5;t<b-2;t+=26){ const r2=rnd(); const tx=ax?t:c+(c<(x0+x1)/2?.4:-.4), tz=ax?c+(c<(z0+z1)/2?.4:-.4):t;
      if(r2<.28) bench(tx,tz,ax?0:Math.PI/2); else if(r2<.45){ bin(tx,tz); addCol(tx-.25,tz-.25,tx+.25,tz+.25); }
      else if(r2<.75&&(st===STYLE.brick||st===STYLE.strijp)) for(let q=0;q<4;q++) parkedBike(ax?tx+q*.7-1:tx,ax?tz:tz+q*.7-1,ax?0:Math.PI/2); }
    for(const [bx,bz] of [[x0+.5,z0+.5],[x1-.5,z0+.5],[x0+.5,z1-.5],[x1-.5,z1-.5]]) if(rnd()<.5) bollard(bx,bz); }
}
function parkBlock(x0,z0,x1,z1){ S('box',(x0+x1)/2,.05,(z0+z1)/2,x1-x0,.1,z1-z0,MAT.GRASS,[.1,.19,.07]); mapRect('park',x0,z0,x1,z1);
  for(let k=0;k<14;k++){ const tx=rr(x0+4,x1-4), tz=rr(z0+4,z1-4); tree(tx,tz,rr(6,9)); addCol(tx-.4,tz-.4,tx+.4,tz+.4); }
  S('cylY',(x0+x1)/2,.4,(z0+z1)/2,10,.8,10,MAT.STONE,[.6,.58,.55]); S('cylY',(x0+x1)/2,.75,(z0+z1)/2,8.6,.2,8.6,MAT.WATER,[.03,.1,.12]); addCol((x0+x1)/2-5,(z0+z1)/2-5,(x0+x1)/2+5,(z0+z1)/2+5); }

// ---------- landmarks ----------
const LM={};
function cathedral(x,z){ const w=20,d=36; S('box',x,9,z,w,18,d,MAT.FACADE+.6,[.7,.64,.54],2); S('gable',x,18,z,w*1.02,9,d*1.02,MAT.STONE,[.15,.3,.26]); addCol(x-w/2,z-d/2,x+w/2,z+d/2);
  for(const dx of [-6,6]){ S('box',x+dx,20,z+d/2-4,7,40,7,MAT.FACADE+.6,[.72,.66,.56],2); S('cone',x+dx,46,z+d/2-4,7.4,12,7.4,MAT.STONE,[.15,.3,.26]); const o=S('sph',x+dx,53,z+d/2-4,.6,.6,.6,MAT.EMI,[1,.8,.5],8); lightAt(o,x+dx,30,z+d/2,[1,.75,.45],500,40); } }
function bar(x,z){ // "Le Pont Violet", the purple and blue lit house from the comic
  S('box',x,7,z,14,14,12,MAT.FACADE+.6,[.6,.55,.6],1); S('gable',x,14,z,14.3,5,12.3,MAT.STONE,[.12,.12,.14],0,Math.PI/2); addCol(x-7,z-6,x+7,z+6);
  S('quad',x,4.2,z+6.08,6,1.5,1,MAT.DECAL,[1,1,1],3,0,0,0,SLOT.BAR);
  for(const [dx,c] of [[-4,[.7,.15,1]],[4,[.25,.35,1]]]){ const o=S('box',x+dx,.3,z+7.5,.3,.3,.3,MAT.EMI,c,3); lightAt(o,x+dx,1,z+8,c,320,20); }
  for(const dx of [-3,0,3]){ S('cylY',x+dx,.5,z+9,.5,1,.5,MAT.STD+.4,[.1,.1,.1],.8); } }
function belvalPlaza(x0,z0,x1,z1){ const x=(x0+x1)/2, z=(z0+z1)/2;
  S('box',(x0+x1)/2,.06,(z0+z1)/2,x1-x0,.12,z1-z0,MAT.PAVER+.5,[.45,.42,.38]); mapRect('block',x0,z0,x1,z1);
  S('box',x,10,z+8,60,20,40,MAT.FACADE+.5,[.42,.18,.12],0); addCol(x-30,z-12,x+30,z+28); S('box',x,20.3,z+8,60.4,.6,40.4,MAT.STONE,[.3,.25,.22]);
  S('quad',x,16,z-12.08,18,4.5,1,MAT.DECAL,[1,1,1],1.2,Math.PI,0,0,SLOT.BELVAL);
  for(let k=0;k<4;k++) sedan(x-24+k*3,z-26,Math.PI/2); }
function redBuilding(x,z){ S('box',x,13,z,50,26,44,MAT.FACADE+.4,[.62,.08,.07],3); addCol(x-25,z-22,x+25,z+22); }
function furnaceBlock(x,z){ blastFurnace(x,z); addCol(x-30,z-30,x+30,z+30); }
function lichtturm(x,z){ // white tower with a glass light crown (fictional "Lichtturm")
  S('box',x,1,z,30,2,30,MAT.STONE,[.62,.6,.58]); S('box',x,26,z,16,52,16,MAT.FACADE+.4,[.9,.9,.88],1); addCol(x-8,z-8,x+8,z+8);
  S('box',x,57,z,18,10,18,MAT.GLASSO,[.08,.1,.12],0); const top=S('box',x,57,z,16.5,9,16.5,MAT.EMI,[.7,.85,1],.25); LM.lichtTop=top; S('box',x,62.6,z,18.6,1.2,18.6,MAT.STD+.4,[.85,.85,.85],.6);
  S('quad',x,8,z-8.08,10,2.5,1,MAT.DECAL,[1,1,1],2,Math.PI,0,0,SLOT.LICHT); LM.licht={x,z}; }
function glowPlaza(x0,z0,x1,z1){ const x=(x0+x1)/2, z=(z0+z1)/2; LM.glow={x,z,x0,z0,x1,z1};
  S('box',x,.04,z,x1-x0,.08,z1-z0,MAT.PAVER+.4,[.36,.2,.15]); mapRect('plaza',x0,z0,x1,z1);
  for(let k=0;k<8;k++){ const mx=x0+6+rnd()*(x1-x0-12), mz=z0+6+rnd()*(z1-z0-12); S('box',mx,2.6,mz,1.2,5.2,1.2,MAT.GLASSO,[.3,.28,.28],0); S('box',mx,.1,mz,1.5,.2,1.5,MAT.STONE,[.2,.2,.2]); addCol(mx-.75,mz-.75,mx+.75,mz+.75); }
  for(let k=0;k<12;k++){ const ox=x0+6+rnd()*(x1-x0-12), oz=z0+6+rnd()*(z1-z0-12), y=rr(7,14), r=rr(1.3,2.8);
    const o=S('sph',ox,y,oz,r*2,r*2,r*2,MAT.LAVA,[1,1,1],.55); o.bob=rnd()*6; lightAt(o,ox,y-1,oz,[1,.4,.1],140,24);
    for(let q=0;q<3;q++) S('sph',ox+rr(-.3,.3),y-r-1-q*1.1,oz+rr(-.3,.3),.14,1.4,.14,MAT.EMI,[1,.45,.12],4); }
  S('quad',x,6,z0-.2,14,3.5,1,MAT.DECAL,[1,1,1],3,Math.PI,0,0,SLOT.GLOW);
  for(const [hx,hz] of [[x0-1,z0-1],[x1+1,z0-1],[x0-1,z1+1],[x1+1,z1+1]]) S('box',hx,.6,hz,1.2,1.2,1.2,MAT.STONE,[.4,.4,.4]); }
function ufo(x,z){ S('box',(x),.06,z,72,.12,72,MAT.PAVER+.5,[.5,.5,.52]); for(let k=0;k<6;k++){ const a=k/6*Math.PI*2; S('cylY',x+Math.cos(a)*14,4,z+Math.sin(a)*14,1.4,8,1.4,MAT.STONE,[.8,.8,.8]); addCol(x+Math.cos(a)*14-.8,z+Math.sin(a)*14-.8,x+Math.cos(a)*14+.8,z+Math.sin(a)*14+.8); }
  S('sph',x,11,z,52,10,52,MAT.PAINT+.25,[.85,.86,.88],.3); S('cylY',x,11,z,52.5,.6,52.5,MAT.EMI,[.6,.85,1],2.5); S('sph',x,15,z,22,6,22,MAT.GLASSO,[.08,.1,.12],0); LM.ufo={x,z}; }
function station(x0,z0,x1,z1){ const x=(x0+x1)/2, z=(z0+z1)/2; S('box',x,.06,z,x1-x0,.12,z1-z0,MAT.PAVER+.5,[.45,.44,.42]); mapRect('block',x0,z0,x1,z1);
  S('box',x,9,z+14,64,18,24,MAT.FACADE+.4,[.3,.32,.35],3); addCol(x-32,z+2,x+32,z+26); S('box',x,19,z+14,66,2,26,MAT.STONE,[.2,.2,.22]);
  S('cylY',x+26,14,z-20,1.4,28,1.4,MAT.STONE,[.7,.7,.7]); const c=S('box',x+26,27,z-20,4,2,.4,MAT.EMI,[1,.95,.85],2); lightAt(c,x+26,26,z-18,[1,.9,.8],60,20); addCol(x+25,z-21,x+27,z-19);
  for(let k=0;k<5;k++) partsAt(compileParts([['rbox',0,.7,0,1.8,.7,4.3,MAT.PAINT+.3,[.95,.8,.1],.6],['rbox',0,1.15,.25,1.56,.5,2.2,MAT.GLASSO,[.03,.035,.04],0],['quad',0,1.5,.25,.9,.22,1,MAT.DECAL,[1,1,1],1.5,0,Math.PI/2,0,SLOT.TAXI],...wheelParts(-.78,.32,-1.35,.32,.2,'steel'),...wheelParts(.78,.32,-1.35,.32,.2,'steel'),...wheelParts(-.78,.32,1.35,.32,.2,'steel'),...wheelParts(.78,.32,1.35,.32,.2,'steel')],MESHIDX),x-24+k*6,0,z-8,Math.PI/2); }

// ---------- valley (Luxembourg) and canal (Eindhoven) ----------
function genValley(env){ const V=VALLEY, cx=(V.x0+V.x1)/2, cz=(V.z0+V.z1)/2, L=V.z1-V.z0;
  S('box',cx,V.floor-.5,cz,V.x1-V.x0,1,L,MAT.GRASS,[.08,.15,.06]); S('box',cx,V.floor+.05,cz,14,.1,L,MAT.WATER,[.03,.08,.09]); mapRect('valley',V.x0,V.z0,V.x1,V.z1);
  for(const [x,dir] of [[V.x0,1],[V.x1,-1]]){ S('box',x-dir*2,V.floor/2,cz,4,-V.floor,L+8,MAT.STONE,[.42,.38,.33]); for(let z=V.z0+20;z<V.z1;z+=40) S('box',x+dir*rr(.5,2),V.floor/2+rr(-4,4),z,rr(2,4),rr(8,16),rr(10,20),MAT.STONE,[.38,.35,.31]); }
  for(const z of [V.z0,V.z1]) S('box',cx,V.floor/2,z+(z===V.z0?-2:2),V.x1-V.x0+8,-V.floor,4,MAT.STONE,[.42,.38,.33]);
  // parapets on the plateau edges, with gaps at the bridges
  const bz=LUX_BRIDGES.map(j=>j*OW.P);
  for(const x of [V.x0-.6,V.x1+.6]){ let z=V.z0; const stops=bz.map(b=>[b-6.5,b+6.5]).sort((a,b)=>a[0]-b[0]); for(const [g0,g1] of stops.concat([[V.z1,V.z1]])){ if(g0>z){ S('box',x,.55,(z+g0)/2,.7,1.1,g0-z,MAT.STONE,[.6,.56,.5]); addCol(x-.35,z,x+.35,g0); } z=g1; } }
  addCol(V.x0,V.z1-1,V.x1,V.z1); addCol(V.x0,V.z0,V.x1,V.z0+1); for(const z of [V.z0+.4,V.z1-.4]) S('box',(V.x0+V.x1)/2,.55,z,V.x1-V.x0,1.1,.7,MAT.STONE,[.6,.56,.5]);
  // Grund: houses and trees on the valley floor
  for(let z=V.z0+20;z<V.z1-20;z+=rr(14,24)){ for(const side of [-1,1]){ if(rnd()<.6){ const w=rr(7,10),h=rr(8,13); const x=cx+side*rr(15,26); S('box',x,V.floor+h/2,z,w,h,rr(8,11),MAT.FACADE+.6,pick(STYLE.altstadt.cols),2); S('gable',x,V.floor+h,z,w*1.04,w*.45,11,MAT.STONE,[.14,.14,.16]); } else tree(cx+side*rr(10,28),z,rr(6,9),[.07,.13,.05]); } }
  // bridges
  for(const j of LUX_BRIDGES){ const z=j*OW.P; const big=j===1;
    S('box',cx,-.6,z,V.x1-V.x0+2,1.2,12,MAT.STONE,[.55,.5,.43]);
    for(const dz of [-6.6,6.6]){ S('box',cx,.6,z+dz,V.x1-V.x0,1.2,.6,MAT.STONE,[.58,.53,.46]); addCol(V.x0,z+dz-.3,V.x1,z+dz+.3); }
    if(big){ const span=V.x1-V.x0, r=span/2-4, yc=V.floor+6; for(let s2=0;s2<18;s2++){ const a=(s2+.5)/18*Math.PI; S('box',cx+Math.cos(a)*r,yc+Math.sin(a)*r,z,Math.PI*r/18+.3,2.2,10,MAT.STONE,[.56,.52,.45],0,0,0,a-Math.PI/2); }
      for(const sx of [-1,1]) S('box',cx+sx*(r+2),(V.floor+yc)/2,z,6,yc-V.floor,10,MAT.STONE,[.5,.46,.4]);
      for(let k=-3;k<=3;k++){ const ax=cx+k*8; const top=-1.2, bot=yc+Math.sqrt(Math.max(0,r*r-(k*8)*(k*8))); if(top>bot) S('box',ax,(top+bot)/2,z,1.5,top-bot,9,MAT.STONE,[.5,.46,.4]); }
      S('quad',V.x1+2,3,z+7.5,6,1.5,1,MAT.DECAL,[1,1,1],0,0,0,0,SLOT.PONT); LM.bridge={x:cx,z}; }
    else for(const px of [cx-18,cx,cx+18]) S('box',px,(V.floor-1.2)/2,z,5,-V.floor-1.2,9,MAT.STONE,[.5,.46,.4]);
    for(const dz of [-6.6,6.6]) for(let px=V.x0+8;px<V.x1;px+=24){ const o=S('cylY',px,2.1,z+dz,.1,3,.1,MAT.STD,[.05,.05,.05]); const l=S('box',px,3.7,z+dz,.25,.35,.25,MAT.EMI,env.lamp,7); lightAt(l,px,3.4,z+dz*.6,env.lamp,30,16); } }
}
function genCanal(){ const C=CANAL, cx=(C.x0+C.x1)/2, cz=(C.z0+C.z1)/2, L=C.x1-C.x0;
  S('box',cx,C.water-1.5,cz,L,1,C.z1-C.z0,MAT.STONE,[.2,.2,.2]); S('box',cx,C.water,cz,L,.1,C.z1-C.z0,MAT.WATER,[.03,.07,.07]); mapRect('water',C.x0,C.z0,C.x1,C.z1);
  for(const z of [C.z0,C.z1]){ S('box',cx,C.water/2-.5,z+(z===C.z0?-.6:.6),L,-C.water+1,1.2,MAT.STONE,[.45,.32,.26]); }
  for(const x of [C.x0,C.x1]) S('box',x,C.water/2-.5,cz,1.2,-C.water+1,C.z1-C.z0,MAT.STONE,[.45,.32,.26]);
  const bx=EHV_BRIDGES.map(i=>CITY.ehv.cx+i*OW.P);
  for(const z of [C.z0-.5,C.z1+.5]){ let x=C.x0; for(const b of bx.concat([C.x1+7])){ const g0=b-7, g1=b+7; if(g0>x){ S('box',(x+Math.min(g0,C.x1))/2,.55,z,Math.min(g0,C.x1)-x,1.1,.25,MAT.STD+.4,[.1,.1,.12],.7); addCol(x,z-.3,Math.min(g0,C.x1),z+.3); } x=g1; } }
  for(const b of bx){ S('box',b,-.4,cz,12,.8,C.z1-C.z0+2,MAT.STONE,[.5,.4,.32]); for(const dx of [-6.4,6.4]){ S('box',b+dx,.55,cz,.3,1.1,C.z1-C.z0,MAT.STD+.4,[.1,.1,.12],.7); addCol(b+dx-.2,C.z0,b+dx+.2,C.z1); } }
  for(let x=C.x0+30;x<C.x1-30;x+=rr(40,70)){ if(bx.some(b=>Math.abs(b-x)<16)) continue; partsAt(compileParts([['yHull',0,0,0,.22,.22,.22,MAT.PAINT+.3,pick([[.12,.25,.18],[.5,.12,.1],[.1,.12,.2]]),.2],['box',0,1.1,1,1.6,.9,2.6,MAT.STD+.6,[.85,.82,.76],0]],MESHIDX),x,C.water+.2,C.z0+4,Math.PI/2); }
}
// ---------- motorway and countryside ----------
function genMotorway(env){ const M=MOTORWAY, cx=(M.x0+M.x1)/2, L=M.x1-M.x0;
  roadRect(M.x0,-M.hw,M.x1,M.hw,false);
  for(let x=M.x0+4;x<M.x1;x+=12) for(const z of [-5,5]) S('box',x,.012,z,4,.01,.16,MAT.STD+.6,[.75,.75,.72]);
  for(const z of [-.2,.2]) S('box',cx,.012,z,L,.01,.14,MAT.STD+.6,[.85,.75,.3]);
  const GX0=M.x0+8, GX1=M.x1-8; // guard rails stop before the cities' ring roads
  for(const z of [-M.hw-1,M.hw+1]){ for(let x=GX0;x<GX1;x+=100){ const w=Math.min(100,GX1-x); S('box',x+w/2,.6,z,w,.35,.12,MAT.STD+.3,[.6,.62,.64],.9); addCol(x,z-.3,x+w,z+.3); }
    for(let x=GX0;x<=GX1;x+=4) S('box',x,.3,z,.12,.6,.12,MAT.STD,[.35,.35,.36],.6); }
  for(let x=M.x0+30;x<M.x1;x+=70) for(const z of [-M.hw-3,M.hw+3]) lampAt(x,z,z<0?Math.PI/2:-Math.PI/2,env.lamp,'modern');
  for(const [x,slot,face] of [[560,SLOT.SIGN_EHV,0],[990,SLOT.BORDER,0],[1440,SLOT.SIGN_LUX,Math.PI]]){ for(const z of [-M.hw-2,M.hw+2]) S('box',x,4,z,.5,8,.5,MAT.STD+.4,[.4,.4,.42],.8); S('box',x,7.2,0,.4,.4,2*M.hw+4,MAT.STD+.4,[.4,.4,.42],.8); S('quad',x+(face?.25:-.25),6,0,14,3.5,1,MAT.DECAL,[1,1,1],.4,face?Math.PI/2:-Math.PI/2,0,0,slot); }
  for(let x=M.x0+40;x<M.x1;x+=rr(90,140)) for(const sd of [-1,1]){ // fields, farms, trees, wind turbines
    const z=sd*rr(60,180); S('box',x,.02,z,rr(70,110),.04,rr(60,110),MAT.GRASS,pick([[.35,.3,.12],[.15,.25,.08],[.28,.3,.1],[.4,.33,.18]]),1);
    if(rnd()<.35){ const fz=sd*rr(40,60); S('box',x+20,4,fz,14,8,10,MAT.FACADE+.6,[.45,.2,.14],5); S('gable',x+20,8,fz,14.2,6,10.2,MAT.STONE,[.12,.1,.1],0,Math.PI/2); addCol(x+13,fz-5,x+27,fz+5); }
    for(let k=0;k<4;k++) tree(x+rr(-40,40),sd*rr(22,40),rr(6,10)); for(let k=0;k<5;k++) tree(x-30+k*15,sd*17.5,rr(11,14),[.08,.16,.06],'poplar');
    if(rnd()<.5){ const tx=x+rr(-30,30), tz=sd*rr(200,320); S('cylY',tx,30,tz,2.4,60,2.4,MAT.STD+.4,[.9,.9,.92],.3); S('box',tx,60,tz+1.5,2.4,2.4,5,MAT.STD+.4,[.9,.9,.92],.3); const t=S('box',tx,60,tz-1.2,1.2,1.2,1.2,MAT.STD,[.9,.9,.92]); t.turbine={x:tx,y:60,z:tz-1.4,ph:rnd()*6};
      const red=S('sph',tx,61.5,tz+2,.4,.4,.4,MAT.EMI,[1,.05,.03],6); red.blink=true; } }
  node(M.x0,0); node(M.x1,0); edge(node(M.x0,0),node(M.x1,0),2);
}

// ---------- city grid ----------
function genCity(key,env){ const C=CITY[key], n=C.n, P=OW.P, h=OW.W/2;
  const X=i=>C.cx+i*P, Z=j=>C.cz+j*P;
  const hasH=(i,j)=>{ // horizontal road on line j between columns i and i+1
    if(key==='lux'&&i===-3&&j<3&&j>-5) return LUX_BRIDGES.includes(j); return true; };
  const hasV=(i,j)=>{ if(key==='ehv'&&j===1) return EHV_BRIDGES.includes(i); return true; };
  for(let i=-n;i<=n;i++) for(let j=-n;j<=n;j++){ const x=X(i), z=Z(j); S('box',x,-.04,z,OW.W,.1,OW.W,MAT.ROAD+.6,[.075,.075,.08]); mapRect('road',x-h,z-h,x+h,z+h);
    if(key==='lux'&&i===-3&&j<3&&j>-5) continue;
    for(const [dx,dz,ry] of [[0,-h-2.2,0],[0,h+2.2,0],[-h-2.2,0,Math.PI/2],[h+2.2,0,Math.PI/2]]){ if((dz<0&&j===-n)||(dz>0&&j===n)||(dx<0&&i===-n)||(dx>0&&i===n)) continue;
      S('quad',x+dx,.016,z+dz,OW.W-.6,3.2,1,MAT.DECAL,[.9,.9,.88],0,ry,-Math.PI/2,0,SLOT.ZEBRA); } }
  for(let j=-n;j<=n;j++) for(let i=-n;i<n;i++){ if(!hasH(i,j)) continue; const x0=X(i)+h, x1=X(i+1)-h, z=Z(j);
    const bridge=key==='lux'&&i===-3&&j<3; if(!bridge) roadRect(x0,z-h,x1,z+h); else { roadsList.push({x0,z0:z-h,x1,z1:z+h}); mapRect('road',x0,z-h,x1,z+h); S('box',(x0+x1)/2,-.04,z,x1-x0,.1,OW.W,MAT.ROAD+.6,[.075,.075,.08]); }
    edge(node(X(i),z),node(X(i+1),z)); }
  for(let i=-n;i<=n;i++) for(let j=-n;j<n;j++){ if(!hasV(i,j)) continue; const z0=Z(j)+h, z1=Z(j+1)-h, x=X(i);
    if(key==='ehv'&&j===1){ roadsList.push({x0:x-h,z0,x1:x+h,z1}); mapRect('road',x-h,z0,x+h,z1); S('box',x,-.04,(z0+z1)/2,OW.W,.1,z1-z0,MAT.ROAD+.6,[.075,.075,.08]); } else roadRect(x-h,z0,x+h,z1);
    edge(node(x,Z(j)),node(x,Z(j+1))); }
  // dead ends at the valley / canal
  if(key==='lux') for(let j=-n+1;j<3;j++) if(!LUX_BRIDGES.includes(j)) for(const [x,d] of [[X(-3)+h,1],[X(-2)-h,-1]]){ S('box',x+d*.4,.5,Z(j),.5,1,OW.W,MAT.STD+.5,[.95,.95,.95]); addCol(x+d*.15,Z(j)-h,x+d*.65,Z(j)+h); }
  // outer ring wall so cars stay on the map (except the motorway exit)
  const R0=X(-n)-h-1, R1=X(n)+h+1, Q0=Z(-n)-h-1, Q1=Z(n)+h+1;
  addCol(R0,Q0-1,R1,Q0); addCol(R0,Q1,R1,Q1+1);
  if(key==='lux'){ addCol(R1,Q0,R1+1,-MOTORWAY.hw-1); addCol(R1,MOTORWAY.hw+1,R1+1,Q1); } else { addCol(R1,Q0,R1+1,Q1); }
  if(key==='ehv'){ addCol(R0-1,Q0,R0,-MOTORWAY.hw-1); addCol(R0-1,MOTORWAY.hw+1,R0,Q1); }
  else addCol(R0-1,Q0,R0,Q1);
  // blocks
  for(let i=-n;i<n;i++) for(let j=-n;j<n;j++){ const x0=X(i)+h, x1=X(i+1)-h, z0=Z(j)+h, z1=Z(j+1)-h;
    const d=key==='lux'?luxDistrict(i,j):ehvDistrict(i,j);
    if(d==='valley'||d==='canal') continue;
    if(key==='lux'&&i===-1&&j===3){ belvalPlaza(x0,z0,x1,z1); LM.belval={x:(x0+x1)/2,z:z0-6}; continue; }
    if(key==='lux'&&i===0&&j===3){ S('box',(x0+x1)/2,.06,(z0+z1)/2,x1-x0,.12,z1-z0,MAT.PAVER+.5,[.42,.4,.38]); mapRect('block',x0,z0,x1,z1); redBuilding((x0+x1)/2,(z0+z1)/2); continue; }
    if(key==='lux'&&j>=3&&i<=-3){ S('box',(x0+x1)/2,.02,(z0+z1)/2,x1-x0,.04,z1-z0,MAT.PAVER+.6,[.3,.28,.26]); mapRect('industry',x0,z0,x1,z1); furnaceBlock((x0+x1)/2,(z0+z1)/2); continue; }
    if(key==='lux'&&i===-1&&j===-3){ S('box',(x0+x1)/2,.06,(z0+z1)/2,x1-x0,.12,z1-z0,MAT.PAVER+.5,[.5,.47,.42]); mapRect('block',x0,z0,x1,z1); cathedral((x0+x1)/2,(z0+z1)/2); continue; }
    if(key==='lux'&&i===-2&&j===0){ fillBlock(x0,z0,x1,z1,STYLE.altstadt,env); continue; }
    if(d==='park'){ parkBlock(x0,z0,x1,z1); continue; }
    if(d==='glow'){ glowPlaza(x0,z0,x1,z1); continue; }
    if(d==='lichtturm'){ S('box',(x0+x1)/2,.06,(z0+z1)/2,x1-x0,.12,z1-z0,MAT.PAVER+.5,[.5,.5,.5]); mapRect('block',x0,z0,x1,z1); lichtturm((x0+x1)/2,(z0+z1)/2); continue; }
    if(d==='ufo'){ mapRect('block',x0,z0,x1,z1); ufo((x0+x1)/2,(z0+z1)/2); continue; }
    if(d==='station'){ station(x0,z0,x1,z1); continue; }
    fillBlock(x0,z0,x1,z1,STYLE[d],env); }
  if(key==='lux'){ bar(X(-2)+h+14,Z(1)-h-8); LM.bar={x:X(-2)+h+14,z:Z(1)}; LM.view={x:X(-2),z:Z(-2)+40}; }
}
// ---------- ground (with holes for the valley and the canal) ----------
function genGround(){ const W=WORLD, V=VALLEY, C=CANAL, g=[.13,.2,.08];
  const rect=(x0,z0,x1,z1)=>{ if(x1-x0>1&&z1-z0>1) globalStatics.push({m:MESHIDX.box,x:(x0+x1)/2,y:-.3,z:(z0+z1)/2,sx:x1-x0,sy:.3,sz:z1-z0,mat:MAT.GRASS,r:g[0],g:g[1],b:g[2],p:0,ry:0,rx:0,rz:0,slot:0}); };
  rect(W.x0,W.z0,V.x0,W.z1); rect(V.x0,W.z0,V.x1,V.z0); rect(V.x0,V.z1,V.x1,W.z1); rect(V.x1,W.z0,C.x0,W.z1); rect(C.x0,W.z0,C.x1,C.z0); rect(C.x0,C.z1,C.x1,W.z1); rect(C.x1,W.z0,W.x1,W.z1);
  for(const [x,z,w,h,d] of [[-1000,-1000,1300,160,700],[300,-1250,1800,120,500],[1500,-1150,1400,140,600],[2900,-500,900,170,1200],[2700,900,1200,120,600],[900,1200,2000,100,500],[-1100,700,1000,130,900]]) globalStatics.push({m:MESHIDX.sph,x,y:-20,z,sx:w,sy:h*2,sz:d,mat:MAT.GRASS,r:.1,g:.15,b:.07,p:0,ry:.3,rx:0,rz:0,slot:0});
}
// ---------- sparks scattered over the roads ----------
function genSparks(){ sparksAll=[]; for(const r of roadsList){ const len=Math.max(r.x1-r.x0,r.z1-r.z0); const n=Math.floor(len/38); for(let k=0;k<n;k++){ if(rnd()<.55) continue; const t=(k+.5)/n;
    const along=(r.x1-r.x0)>(r.z1-r.z0); const x=along?r.x0+t*(r.x1-r.x0):(r.x0+r.x1)/2+rr(-3,3), z=along?(r.z0+r.z1)/2+rr(-3,3):r.z0+t*(r.z1-r.z0);
    sparksAll.push({x,y:1.1,z,ph:rnd()*6,alive:true}); } } }

function buildWorld(env){ seed=4242; statics=[]; globalStatics=[]; colliders=new Map(); cells=new Map(); roadsList=[]; mapItems=[]; graph={nodes:new Map(),edges:[]};
  genGround(); genCity('lux',env); genValley(env); genMotorway(env); genCity('ehv',env); genCanal(); genSparks();
  for(const o of statics){ o.small=Math.max(o.sx,o.sy,o.sz)<3.2&&!o.L; if(o.ext>CELL*.9){ globalStatics.push(o); continue; } const k=Math.floor(o.x/CELL)+','+Math.floor(o.z/CELL); let a=cells.get(k); if(!a){ a=[]; cells.set(k,a); } a.push(o); }
  statics=[];
  for(const s of sparksAll){ const k=Math.floor(s.x/CELL)+','+Math.floor(s.z/CELL); let c=cells.get(k); if(!c){ c=[]; cells.set(k,c); } (c.sparks||(c.sparks=[])).push(s); }
}
function onRoad(x,z){ for(const r of roadsList) if(x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1) return true; return false; }
