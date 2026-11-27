/* ===== Open world: fictional Luxembourg and Eindhoven, joined by the "A-Route der Lichter" =====
   X = east, Z = south. Heading 0 faces -Z (north). */
const OW={B:72,W:12,P:84};
const CITY={ lux:{cx:0,cz:0,n:5,name:'Luxemburg'}, ehv:{cx:1900,cz:0,n:4,name:'Eindhoven'} };
const VALLEY={x0:-246,x1:-174,z0:-414,z1:246,floor:-32};
const CANAL={x0:1558,x1:2242,z0:90,z1:162,water:-2.2};
const MOTORWAY={x0:420,x1:1564,hw:10};
const WORLD={x0:-1400,x1:3300,z0:-1400,z1:1400};
const LUX_BRIDGES=[-4,-2,1], EHV_BRIDGES=[-3,0,2];
/* ----- the world bend -----
   Streets are laid out on a grid, which keeps collisions, routes and missions simple. Before anything is drawn, every position goes
   through WARP: a smooth displacement that turns the grid into gently winding streets with skewed junctions. WP also holds the local
   Jacobian (a b / c d) so objects can be turned to follow their street. */
const WP={x:0,z:0,a:1,b:0,c:0,d:1};
function WARP(x,z){ const p1=z/118+1.3, p2=z/53+x/210+.5, p3=x/260+2.1, p4=x/127+.7, p5=x/49-z/190+4, p6=z/240+1;
  const c1=Math.cos(p1), c2=Math.cos(p2), c3=Math.cos(p3), c4=Math.cos(p4), c5=Math.cos(p5), c6=Math.cos(p6);
  WP.x=x+24*Math.sin(p1)+13*Math.sin(p2)+14*Math.sin(p3); WP.z=z+20*Math.sin(p4)+12*Math.sin(p5)+12*Math.sin(p6);
  WP.a=1+13*c2/210+14*c3/260; WP.b=24*c1/118+13*c2/53; WP.c=20*c4/127+12*c5/49; WP.d=1-12*c5/190+12*c6/240; return WP; }
function yawW(x,z,h){ WARP(x,z); const sn=Math.sin(h), cs=Math.cos(h); return Math.atan2(WP.a*sn+WP.b*cs,WP.c*sn+WP.d*cs); }
// bake the bend into the static world: buildings stay rigid, long flat pieces are cut into tiles that follow the curve
function bakeWarp(list){ const out=[]; const fac=Math.floor(MAT.FACADE);
  // Standing things (trees, lamps, signs, single props) are moved and turned as a whole.
  const place=(o)=>{ const flat0=o.ry===0&&!o.rx&&!o.rz; WARP(o.x,o.z); const tz=Math.atan2(WP.b,WP.d), tx=-Math.atan2(WP.c,WP.a); const asp=Math.max(o.sx,o.sz)/Math.max(.01,Math.min(o.sx,o.sz));
    const th=(flat0&&asp>2.5)?(o.sx>o.sz?tx:tz):(tx+tz)/2; if(o.L){ const lx=o.L.x-o.x, lz=o.L.z-o.z, c=Math.cos(th), s=Math.sin(th); o.L.x=WP.x+lx*c+lz*s; o.L.z=WP.z-lx*s+lz*c; }
    o.x=WP.x; o.z=WP.z; o.ry+=th; out.push(o); };
  // Ground and everything lying on it (carriageway, pavement, kerbs, paint, rails, walls) stays in grid space and is bent per vertex on the GPU.
  // Neighbouring pieces then share the very same curve: no steps, no overlaps, no cut-up crossings. Long pieces are cut so each edge is short enough to look curved.
  const bent=(o)=>{ WARP(o.x,o.z); o.bend=1; o.cx=WP.x; o.cz=WP.z; out.push(o); };
  for(const o of list){
    if(o.grp){ const g=o.grp; if(g.wx===undefined){ WARP(g.x,g.z); g.wx=WP.x; g.wz=WP.z; g.th=g.ax?-Math.atan2(WP.c,WP.a):Math.atan2(WP.b,WP.d); g.cs=Math.cos(g.th); g.sn=Math.sin(g.th); }
      const rel=(px,pz)=>[g.wx+(px-g.x)*g.cs+(pz-g.z)*g.sn,g.wz-(px-g.x)*g.sn+(pz-g.z)*g.cs]; if(o.L){ const q=rel(o.L.x,o.L.z); o.L.x=q[0]; o.L.z=q[1]; }
      const q=rel(o.x,o.z); o.x=q[0]; o.z=q[1]; o.ry+=g.th; out.push(o); continue; }
    const id=Math.floor(o.mat), big=Math.max(o.sx,o.sz), sm=Math.min(o.sx,o.sz), plain=!o.L&&!o.turbine&&!o.blink&&o.bob===undefined&&id!==fac;
    const lying=o.sy<=.25&&o.y<.6&&!o.rz&&(!o.rx||Math.abs(o.rx+Math.PI/2)<.01); // slabs, paint, manholes, decals on the road
    if(plain&&o.m===MESHIDX.box&&o.ry===0&&!o.rx&&!o.rz&&big>16&&id!==1&&id!==2&&!o.keep){ const T=sm>30?12:9; const nx=Math.ceil(o.sx/T), nz=Math.ceil(o.sz/T), px=o.sx/nx, pz=o.sz/nz;
      for(let i=0;i<nx;i++) for(let j=0;j<nz;j++){ const t={...o,x:o.x-o.sx/2+px*(i+.5),z:o.z-o.sz/2+pz*(j+.5),sx:px,sz:pz}; t.ext=Math.max(px,pz)*.6; bent(t); } continue; }
    if(plain&&(lying||o.keep)){ bent(o); continue; }
    place(o); }
  return out; }
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
const ASPH=[.115,.115,.12], PAINT=[.66,.66,.62];
/* A city street segment, kerb to kerb (12 m): parking lane 2.1 m | lane 3.9 m | lane 3.9 m | parking lane 2.1 m.
   Dressing follows the real thing: dashed centre line, parking lane lines, stop lines on the approaching lane, gutters,
   manholes and drains, parked cars in groups, and now and then a painted 30, an arrow or a bicycle. */
function roadRect(x0,z0,x1,z1,marks=true){ const cx=(x0+x1)/2, cz=(z0+z1)/2, w=Math.abs(x1-x0), d=Math.abs(z1-z0);
  S('box',cx,-.04,cz,w,.1,d,MAT.ROAD+.6,ASPH); roadsList.push({x0:Math.min(x0,x1),z0:Math.min(z0,z1),x1:Math.max(x0,x1),z1:Math.max(z0,z1)}); mapRect('road',x0,z0,x1,z1);
  if(!marks) return; const ax=w>d, L=ax?w:d, W=ax?d:w, hw=W/2;
  // local frame: t along the street, q across it
  const at=(t,q)=>ax?[cx+t,cz+q]:[cx-q,cz+t]; const B=(t,q,lt,lq,y,mat,col,p=0)=>{ const [x,z]=at(t,q); return S('box',x,y,z,ax?lt:lq,.012,ax?lq:lt,mat,col,p); };
  for(let t=-L/2+7;t<L/2-8;t+=7.5) B(t+1.5,0,3,.12,.012,MAT.STD+.6,PAINT);                 // centre line: 3 m dash, 4.5 m gap
  for(const sq of [-1,1]){ B(0,sq*(hw-.2),L,.4,.006,MAT.ROAD+.6,[.06,.06,.064]);              // gutter
    if(L>40) B(0,sq*(hw-2.1),L-18,.1,.012,MAT.STD+.6,PAINT);                                   // parking lane line
    B(sq*(L/2-4.7),sq*(hw-2.1)/2,.42,hw-2.1,.012,MAT.STD+.6,PAINT);                           // stop line across the approaching lane
    for(let t=-L/2+12;t<L/2-10;t+=rr(14,22)){ const [x,z]=at(t,sq*(hw-.25)); S('box',x,.012,z,ax?.5:.3,.012,ax?.3:.5,MAT.STD+.4,[.035,.035,.04],.5); } } // drains
  for(let k=0;k<2;k++){ const [x,z]=at(rr(-L/2+10,L/2-10),rr(-2.8,2.8)); S('cylY',x,.008,z,.72,.02,.72,MAT.STD+.5,[.05,.05,.055],.4); }
  if(L>40){ const r=rnd(); const sgn=rnd()<.5?1:-1, [x,z]=at(sgn*(L/2-13),sgn*2); const ry=ax?(sgn>0?-Math.PI/2:Math.PI/2):(sgn>0?Math.PI:0);
    if(r<.3) S('quad',x,.016,z,1.5,4.6,1,MAT.DECAL,[.9,.9,.88],0,ry,-Math.PI/2,0,SLOT.Z30); else if(r<.5) S('quad',x,.016,z,1.1,3.4,1,MAT.DECAL,[.9,.9,.88],0,ry,-Math.PI/2,0,SLOT.ARROW);
    else if(r<.62){ const [bx,bz]=at(sgn*(L/2-13),sgn*(hw-3)); S('quad',bx,.016,bz,1.0,1.6,1,MAT.DECAL,[.9,.9,.88],0,ry,-Math.PI/2,0,SLOT.BIKE); }
    // parked cars: groups of 2-4 in the parking lanes, none near the junctions
    for(const sq of [-1,1]){ let t=-L/2+13; while(t<L/2-16){ if(rnd()<.45){ const n=2+((rnd()*3)|0); for(let k=0;k<n&&t<L/2-14;k++){ const [x,z]=at(t,sq*(hw-1.12)); GRP={x,z,ax};
            sedan(x,z,ax?(sq>0?Math.PI/2:-Math.PI/2):(sq>0?0:Math.PI)); GRP=null; if(ax) addCol(x-2.15,z-.9,x+2.15,z+.9); else addCol(x-.9,z-2.15,x+.9,z+2.15); t+=5.6; } t+=rr(3,9); } else t+=rr(8,16); } }
    // signs on the pavement at the ends: pedestrian crossing, and sometimes 30 or no parking
    for(const e of [-1,1]){ const sq=e; const [x,z]=at(e*(L/2-5.4),sq*(hw+.7)); const fr=ax?(e>0?-Math.PI/2:Math.PI/2):(e>0?Math.PI:0);
      roadSign(x,z,fr,rnd()<.75?SLOT.SG_PED:SLOT.SG_ONEWAY); if(rnd()<.4){ const [x2,z2]=at(e*(L/2-15),sq*(hw+.7)); roadSign(x2,z2,fr,rnd()<.5?SLOT.SG_30:SLOT.SG_NOPARK); } } } }
function roadSign(x,z,ry,slot){ S('cylY',x,1.3,z,.07,2.6,.07,MAT.STD+.35,[.55,.56,.58],.8); S('box',x,2.3,z,.64,.64,.03,MAT.STD+.4,[.5,.5,.52],.6,ry);
  S('quad',x+Math.sin(ry)*.025,2.3,z+Math.cos(ry)*.025,.6,.6,1,MAT.DECAL,[1,1,1],.25,ry,0,0,slot); addCol(x-.1,z-.1,x+.1,z+.1); }
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
  S('box',(x0+x1)/2,.06,(z0+z1)/2,x1-x0,.12,z1-z0,MAT.PAVER+.5,[.5,.48,.45]); mapRect('block',x0,z0,x1,z1);
  for(const zz of [z0+.14,z1-.14]) S('box',(x0+x1)/2,.09,zz,x1-x0,.2,.28,MAT.STONE,[.5,.49,.47]); for(const xx of [x0+.14,x1-.14]) S('box',xx,.09,(z0+z1)/2,.28,.2,z1-z0,MAT.STONE,[.5,.49,.47]);
  const s=3, D=rr(st.d[0],st.d[1]);
  const rows=[ // [axis along x?, fixed coordinate of facade, inward direction, start, end]
    {ax:true,fz:z0+s,dir:1,a:x0+s,b:x1-s,ry:0},{ax:true,fz:z1-s,dir:-1,a:x0+s,b:x1-s,ry:Math.PI},
    {ax:false,fz:x0+s,dir:1,a:z0+s+D,b:z1-s-D,ry:-Math.PI/2},{ax:false,fz:x1-s,dir:-1,a:z0+s+D,b:z1-s-D,ry:Math.PI/2}];
  for(const r of rows){ let t=r.a; while(t<r.b-3){ let w=Math.min(rr(st.w[0],st.w[1]),r.b-t); if(r.b-t-w<st.w[0]*.6) w=r.b-t; const h=rr(st.h[0],st.h[1]); const col=pick(st.cols); const mid=t+w/2; const cIn=r.fz+r.dir*D/2;
      const x=r.ax?mid:cIn, z=r.ax?cIn:mid, sx=r.ax?w-.15:D, sz=r.ax?D:w-.15;
      GRP={x,z,ax:r.ax};
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
      GRP=null; t+=w; } }
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
/* a car-free lane where a street used to be: pavers, a row of trees, benches, lanterns and strings of lights between the houses */
const PLACES={lanes:[],squares:[]};
function lane(x0,z0,x1,z1,alongX,env){ const cx=(x0+x1)/2, cz=(z0+z1)/2, L=alongX?x1-x0:z1-z0; PLACES.lanes.push({x:cx,z:cz,alongX});
  S('box',cx,.06,cz,x1-x0,.12,z1-z0,MAT.PAVER+.5,[.5,.46,.4]); mapRect('block',x0,z0,x1,z1);
  for(const e of [0,1]){ const t=e?L/2-.5:-L/2+.5; for(let q=-4.5;q<=4.5;q+=1.8) bollard(alongX?cx+t:cx+q,alongX?cz+q:cz+t); if(alongX) addCol(cx+t-.2,z0,cx+t+.2,z1); else addCol(x0,cz+t-.2,x1,cz+t+.2); }
  for(let t=-L/2+9;t<L/2-6;t+=12){ const k=Math.round(t/12); const px=alongX?cx+t:cx, pz=alongX?cz:cz+t;
    if(k%2===0){ tree(px,pz,rr(5.5,7.5)); S('cylY',px,.14,pz,2.2,.06,2.2,MAT.STD+.5,[.12,.1,.09],.3); }
    else { bench(alongX?px:px+1.6,alongX?pz+1.6:pz,alongX?0:Math.PI/2); const o=S('cylY',px,1.6,pz,.1,3.2,.1,MAT.STD+.5,[.05,.05,.06],.8); const l=S('sph',px,3.35,pz,.36,.36,.36,MAT.EMI,env.lamp,6); lightAt(l,px,3.2,pz,env.lamp,22,13); }
    // string lights sagging between the facades
    for(let q=-5;q<=5;q+=1.25){ const sag=4.9-(1-(q/5.4)**2)*.7; S('sphLo',alongX?px+3:px+q,sag,alongX?pz+q:pz+3,.22,.22,.22,MAT.EMI,pick([[1,.75,.4],[1,.55,.3],[1,.85,.6]]),9); } }
}
/* an open town square instead of a block: fountain, ring of trees, market stalls, lanterns */
function townSquare(x0,z0,x1,z1,env){ const cx=(x0+x1)/2, cz=(z0+z1)/2; PLACES.squares.push({x:cx,z:cz}); S('box',cx,.06,cz,x1-x0,.12,z1-z0,MAT.PAVER+.5,[.52,.47,.4]); mapRect('block',x0,z0,x1,z1);
  for(const zz of [z0+.14,z1-.14]) S('box',cx,.09,zz,x1-x0,.2,.28,MAT.STONE,[.5,.49,.47]); for(const xx of [x0+.14,x1-.14]) S('box',xx,.09,cz,.28,.2,z1-z0,MAT.STONE,[.5,.49,.47]);
  S('cylY',cx,.45,cz,9,.9,9,MAT.STONE,[.6,.58,.55]); S('cylY',cx,.82,cz,7.8,.2,7.8,MAT.WATER,[.03,.1,.12]); S('cylY',cx,1.4,cz,1.2,2.8,1.2,MAT.STONE,[.62,.6,.56]); S('sph',cx,3.1,cz,2.2,.7,2.2,MAT.STONE,[.62,.6,.56]); addCol(cx-4.5,cz-4.5,cx+4.5,cz+4.5);
  for(let k=0;k<10;k++){ const a=k/10*6.283+.3, r=24; const tx=cx+Math.cos(a)*r, tz=cz+Math.sin(a)*r; tree(tx,tz,rr(6.5,9)); addCol(tx-.35,tz-.35,tx+.35,tz+.35); S('cylY',tx,.14,tz,2.4,.06,2.4,MAT.STD+.5,[.12,.1,.09],.3); }
  for(let k=0;k<6;k++){ const a=k/6*6.283, r=14; const sx=cx+Math.cos(a)*r, sz=cz+Math.sin(a)*r; const col=pick([[.7,.12,.1],[.12,.32,.22],[.14,.22,.5],[.85,.62,.18],[.8,.78,.7]]);
    S('box',sx,.5,sz,2.6,1,1.4,MAT.STD+.8,[.4,.28,.16],0,-a); S('box',sx,2.5,sz,3.2,.08,2.2,MAT.STD+.95,col,0,-a,0,.12); for(const d of [-1.3,1.3]) S('cylY',sx+Math.cos(a+1.57)*d,1.25,sz+Math.sin(a+1.57)*d,.07,2.5,.07,MAT.STD+.5,[.2,.2,.2],.6);
    for(let q=0;q<4;q++) S('sphLo',sx+Math.cos(a+1.57)*(q*.6-.9),1.12,sz+Math.sin(a+1.57)*(q*.6-.9),.3,.24,.3,MAT.STD+.7,pick([[.85,.2,.1],[.9,.6,.1],[.3,.5,.12],[.7,.1,.3]])); addCol(sx-1.3,sz-1.3,sx+1.3,sz+1.3); }
  for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ const lx=cx+dx*30, lz=cz+dz*30; S('cylY',lx,1.9,lz,.12,3.8,.12,MAT.STD+.5,[.05,.05,.06],.8); const l=S('sph',lx,4,lz,.44,.44,.44,MAT.EMI,env.lamp,7); lightAt(l,lx,3.8,lz,env.lamp,30,18); bench(lx-dx*3,lz-dz*3,dx*dz>0?.78:-.78); }
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
    { const kz=sd*rr(110,260), kw=rr(120,220), kh=rr(7,16); const o=S('sph',x+rr(-40,40),-kh*.25,kz,kw,kh*2,kw*rr(.6,1),MAT.GRASS,pick([[.13,.2,.08],[.16,.23,.09],[.11,.18,.07]])); o.ext=kw; // rolling land
      for(let k=0;k<9;k++) S('sph',x-48+k*12+rr(-2,2),1.1,z-sd*rr(30,34),rr(4,6),rr(2,2.8),rr(2.4,3.4),MAT.FOLIAGE,[.06*rr(.8,1.3),.12*rr(.8,1.3),.04]); // hedgerow
      if(rnd()<.45){ const fx=x+rr(-30,30), fz=sd*rr(70,130); for(let k=0;k<9;k++){ const a=rnd()*6.28, d=rr(0,16); tree(fx+Math.cos(a)*d,fz+Math.sin(a)*d,rr(8,13),[.07*rr(.8,1.2),.14*rr(.8,1.2),.05]); } }
      if(rnd()<.5) for(let k=0;k<5;k++) S('cylX',x+rr(-35,35),.7,sd*rr(45,95),1.5,1.4,1.4,MAT.STD+.95,[.5,.42,.2],0,rr(0,3));
      for(let k=0;k<3;k++){ const b=rr(.6,1.6); S('sph',x+rr(-45,45),b*.2,sd*rr(14,40),b*1.6,b,b*1.3,MAT.STONE,[.36,.35,.33],0,rr(0,3),rr(-.2,.2)); } }
    if(rnd()<.5){ const tx=x+rr(-30,30), tz=sd*rr(200,320); S('cylY',tx,30,tz,2.4,60,2.4,MAT.STD+.4,[.9,.9,.92],.3); S('box',tx,60,tz+1.5,2.4,2.4,5,MAT.STD+.4,[.9,.9,.92],.3); const t=S('box',tx,60,tz-1.2,1.2,1.2,1.2,MAT.STD,[.9,.9,.92]); t.turbine={x:tx,y:60,z:tz-1.4,ph:rnd()*6};
      const red=S('sph',tx,61.5,tz+2,.4,.4,.4,MAT.EMI,[1,.05,.03],6); red.blink=true; } }
  node(M.x0,0); node(M.x1,0); edge(node(M.x0,0),node(M.x1,0),2);
}

// ---------- city grid ----------
function genCity(key,env){ const C=CITY[key], n=C.n, P=OW.P, h=OW.W/2;
  const X=i=>C.cx+i*P, Z=j=>C.cz+j*P;
  // ----- break the grid: some street segments become car-free lanes, so junctions turn into T-junctions and blocks differ -----
  const hsh=(a,b,c)=>{ const v=Math.sin(a*127.1+b*311.7+c*74.7+(key==='lux'?1.3:7.9))*43758.5453; return v-Math.floor(v); };
  const plain=(i,j)=>{ if(i<-n||i>=n||j<-n||j>=n) return false; if(key==='lux'){ if(i<=-2||j>=3||(i===-1&&j===-3)) return false; return ['center','west','altstadt','kirchberg'].includes(luxDistrict(i,j)); }
    if(j>=0&&j<=2) return false; return ['brick','strijp'].includes(ehvDistrict(i,j)); };
  const remH=new Set(), remV=new Set(), usedN=new Set(), nk=(i,j)=>i+','+j;
  for(let j=-n+1;j<n;j++) for(let i=-n+1;i<n-1;i++){ if(j===0||hsh(i,j,1)>.3) continue; if(!plain(i,j-1)||!plain(i,j)) continue; if(usedN.has(nk(i,j))||usedN.has(nk(i+1,j))) continue; remH.add(nk(i,j)); usedN.add(nk(i,j)); usedN.add(nk(i+1,j)); }
  for(let i=-n+1;i<n;i++) for(let j=-n+1;j<n-1;j++){ if(j===0||j===-1||hsh(i,j,2)>.3) continue; if(!plain(i-1,j)||!plain(i,j)) continue; if(usedN.has(nk(i,j))||usedN.has(nk(i,j+1))) continue; remV.add(nk(i,j)); usedN.add(nk(i,j)); usedN.add(nk(i,j+1)); }
  const squares=new Set(); for(let i=-n+1;i<n-1;i++) for(let j=-n+1;j<n-1;j++) if(plain(i,j)&&hsh(i,j,3)<.09) squares.add(nk(i,j));
  const hasH=(i,j)=>{ // horizontal road on line j between columns i and i+1
    if(remH.has(nk(i,j))) return false;
    if(key==='lux'&&i===-3&&j<3&&j>-5) return LUX_BRIDGES.includes(j); return true; };
  const hasV=(i,j)=>{ if(remV.has(nk(i,j))) return false; if(key==='ehv'&&j===1) return EHV_BRIDGES.includes(i); return true; };
  for(let i=-n;i<=n;i++) for(let j=-n;j<=n;j++){ const x=X(i), z=Z(j); S('box',x,-.04,z,OW.W,.1,OW.W,MAT.ROAD+.6,ASPH); mapRect('road',x-h,z-h,x+h,z+h);
    if(key==='lux'&&i===-3&&j<3&&j>-5) continue;
    for(const [dx,dz,ry] of [[0,-h-2.2,0],[0,h+2.2,0],[-h-2.2,0,Math.PI/2],[h+2.2,0,Math.PI/2]]){ if((dz<0&&j===-n)||(dz>0&&j===n)||(dx<0&&i===-n)||(dx>0&&i===n)) continue;
      if((dz<0&&remV.has(nk(i,j-1)))||(dz>0&&remV.has(nk(i,j)))||(dx<0&&remH.has(nk(i-1,j)))||(dx>0&&remH.has(nk(i,j)))) continue;
      S('quad',x+dx,.016,z+dz,OW.W-.5,3.6,1,MAT.DECAL,[.9,.9,.88],0,ry,-Math.PI/2,0,SLOT.ZEBRA); } }
  for(let j=-n;j<=n;j++) for(let i=-n;i<n;i++){ if(!hasH(i,j)) continue; const x0=X(i)+h, x1=X(i+1)-h, z=Z(j);
    const bridge=key==='lux'&&i===-3&&j<3; if(!bridge) roadRect(x0,z-h,x1,z+h); else { roadsList.push({x0,z0:z-h,x1,z1:z+h}); mapRect('road',x0,z-h,x1,z+h); S('box',(x0+x1)/2,-.04,z,x1-x0,.1,OW.W,MAT.ROAD+.6,ASPH); }
    edge(node(X(i),z),node(X(i+1),z)); }
  for(let i=-n;i<=n;i++) for(let j=-n;j<n;j++){ if(!hasV(i,j)) continue; const z0=Z(j)+h, z1=Z(j+1)-h, x=X(i);
    if(key==='ehv'&&j===1){ roadsList.push({x0:x-h,z0,x1:x+h,z1}); mapRect('road',x-h,z0,x+h,z1); S('box',x,-.04,(z0+z1)/2,OW.W,.1,z1-z0,MAT.ROAD+.6,ASPH); } else roadRect(x-h,z0,x+h,z1);
    edge(node(x,Z(j)),node(x,Z(j+1))); }
  for(const k of remH){ const [i,j]=k.split(',').map(Number); lane(X(i)+h,Z(j)-h,X(i+1)-h,Z(j)+h,true,env); }
  for(const k of remV){ const [i,j]=k.split(',').map(Number); lane(X(i)-h,Z(j)+h,X(i)+h,Z(j+1)-h,false,env); }
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
    if(key==='lux'&&i===0&&j===3){ S('box',(x0+x1)/2,.06,(z0+z1)/2,x1-x0,.12,z1-z0,MAT.PAVER+.5,[.5,.48,.45]); mapRect('block',x0,z0,x1,z1); redBuilding((x0+x1)/2,(z0+z1)/2); continue; }
    if(key==='lux'&&j>=3&&i<=-3){ S('box',(x0+x1)/2,.02,(z0+z1)/2,x1-x0,.04,z1-z0,MAT.PAVER+.6,[.3,.28,.26]); mapRect('industry',x0,z0,x1,z1); furnaceBlock((x0+x1)/2,(z0+z1)/2); continue; }
    if(key==='lux'&&i===-1&&j===-3){ S('box',(x0+x1)/2,.06,(z0+z1)/2,x1-x0,.12,z1-z0,MAT.PAVER+.5,[.5,.47,.42]); mapRect('block',x0,z0,x1,z1); cathedral((x0+x1)/2,(z0+z1)/2); continue; }
    if(key==='lux'&&i===-2&&j===0){ fillBlock(x0,z0,x1,z1,STYLE.altstadt,env); continue; }
    if(d==='park'){ parkBlock(x0,z0,x1,z1); continue; }
    if(squares.has(nk(i,j))){ townSquare(x0,z0,x1,z1,env); continue; }
    if(d==='glow'){ glowPlaza(x0,z0,x1,z1); continue; }
    if(d==='lichtturm'){ S('box',(x0+x1)/2,.06,(z0+z1)/2,x1-x0,.12,z1-z0,MAT.PAVER+.5,[.5,.5,.5]); mapRect('block',x0,z0,x1,z1); lichtturm((x0+x1)/2,(z0+z1)/2); continue; }
    if(d==='ufo'){ mapRect('block',x0,z0,x1,z1); ufo((x0+x1)/2,(z0+z1)/2); continue; }
    if(d==='station'){ station(x0,z0,x1,z1); continue; }
    fillBlock(x0,z0,x1,z1,STYLE[d],env); }
  if(key==='lux'){ bar(X(-2)+h+14,Z(1)-h-8); LM.bar={x:X(-2)+h+14,z:Z(1)}; LM.view={x:X(-2),z:Z(-2)+40}; }
}
// ---------- ground (with holes for the valley and the canal) ----------
function genGround(){ const W=WORLD, V=VALLEY, C=CANAL, g=[.13,.2,.08];
  const far=(x0,z0,x1,z1)=>{ if(x1-x0>1&&z1-z0>1) globalStatics.push({m:MESHIDX.box,x:(x0+x1)/2,y:-.3,z:(z0+z1)/2,sx:x1-x0,sy:.3,sz:z1-z0,mat:MAT.GRASS,r:g[0],g:g[1],b:g[2],p:0,ry:0,rx:0,rz:0,slot:0}); };
  // near the cities the ground is laid in tiles that follow the bend (S, culled per cell); beyond, large flat slabs with an overlap
  const I={x0:-640,x1:2640,z0:-640,z1:640}, O=70;
  const rect=(x0,z0,x1,z1)=>{ const ix0=Math.max(x0,I.x0), ix1=Math.min(x1,I.x1), iz0=Math.max(z0,I.z0), iz1=Math.min(z1,I.z1);
    if(ix1-ix0>1&&iz1-iz0>1){ const nx=Math.ceil((ix1-ix0)/40), nz=Math.ceil((iz1-iz0)/40), px=(ix1-ix0)/nx, pz=(iz1-iz0)/nz;
      for(let i=0;i<nx;i++) for(let j=0;j<nz;j++){ const tx=ix0+px*(i+.5), tz=iz0+pz*(j+.5); const town=(Math.abs(tx)<432&&Math.abs(tz)<432)||(Math.abs(tx-1900)<348&&Math.abs(tz)<348); // under the cities the base is dark, so seams between bent tiles never show grass
        const o=S('box',tx,-.3,tz,px*1.07,.3,pz*1.07,town?MAT.ROAD+.6:MAT.GRASS,town?[.07,.07,.075]:g); o.ext=24; o.keep=true; } } // keep: one coarse piece is enough for the base layer
    far(x0,z0,Math.min(x1,I.x0+O),z1); far(Math.max(x0,I.x1-O),z0,x1,z1); far(Math.max(x0,I.x0),z0,Math.min(x1,I.x1),Math.min(z1,I.z0+O)); far(Math.max(x0,I.x0),Math.max(z0,I.z1-O),Math.min(x1,I.x1),z1); };
  rect(W.x0,W.z0,V.x0,W.z1); rect(V.x0,W.z0,V.x1,V.z0); rect(V.x0,V.z1,V.x1,W.z1); rect(V.x1,W.z0,C.x0,W.z1); rect(C.x0,W.z0,C.x1,C.z0); rect(C.x0,C.z1,C.x1,W.z1); rect(C.x1,W.z0,W.x1,W.z1);
  for(const [x,z,w,h,d] of [[-1000,-1000,1300,160,700],[300,-1250,1800,120,500],[1500,-1150,1400,140,600],[2900,-500,900,170,1200],[2700,900,1200,120,600],[900,1200,2000,100,500],[-1100,700,1000,130,900]]) globalStatics.push({m:MESHIDX.sph,x,y:-20,z,sx:w,sy:h*2,sz:d,mat:MAT.GRASS,r:.1,g:.15,b:.07,p:0,ry:.3,rx:0,rz:0,slot:0});
}
// ---------- sparks scattered over the roads ----------
function genSparks(){ sparksAll=[]; for(const r of roadsList){ const len=Math.max(r.x1-r.x0,r.z1-r.z0); const n=Math.floor(len/38); for(let k=0;k<n;k++){ if(rnd()<.55) continue; const t=(k+.5)/n;
    const along=(r.x1-r.x0)>(r.z1-r.z0); const x=along?r.x0+t*(r.x1-r.x0):(r.x0+r.x1)/2+rr(-3,3), z=along?(r.z0+r.z1)/2+rr(-3,3):r.z0+t*(r.z1-r.z0);
    sparksAll.push({x,y:1.1,z,ph:rnd()*6,alive:true}); } } }

function buildWorld(env){ seed=4242; statics=[]; globalStatics=[]; colliders=new Map(); cells=new Map(); roadsList=[]; mapItems=[]; graph={nodes:new Map(),edges:[]};
  genGround(); genCity('lux',env); genValley(env); genMotorway(env); genCity('ehv',env); genCanal(); genSparks();
  statics=bakeWarp(statics);
  for(const o of statics){ o.small=Math.max(o.sx,o.sy,o.sz)<3.2&&!o.L; if(o.ext>CELL*.9){ globalStatics.push(o); continue; } const k=Math.floor((o.bend?o.cx:o.x)/CELL)+','+Math.floor((o.bend?o.cz:o.z)/CELL); let a=cells.get(k); if(!a){ a=[]; cells.set(k,a); } a.push(o); }
  statics=[];
  for(const s of sparksAll){ const k=Math.floor(s.x/CELL)+','+Math.floor(s.z/CELL); let c=cells.get(k); if(!c){ c=[]; cells.set(k,c); } (c.sparks||(c.sparks=[])).push(s); }
}
function onRoad(x,z){ for(const r of roadsList) if(x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1) return true; return false; }
