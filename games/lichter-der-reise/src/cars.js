/* ===== Vehicles and characters, modelled after the photos =====
   Part: [meshKey, x,y,z, sx,sy,sz, mat, color, param, rx, ry, rz, slot]
   Forward is -Z, origin on the ground in the middle of the car. */
const MAT={STD:0,EMI:1,LAVA:2,WATER:3,FACADE:4,PAVER:5,GLASS:6,ROAD:7,PAINT:8,DECAL:9,TYRE:10,FOLIAGE:11,GLASSO:12,STONE:13,SKIN:14,RUST:15,GRASS:16};
const COL={black:[.025,.025,.028],plastic:[.05,.05,.055],chrome:[.75,.75,.78],steel:[.45,.46,.48],gold:[.72,.5,.2],skin:[.78,.53,.4],skin2:[.85,.6,.47]};

function carMeshes(){
  return {
  // Citroën C15-style van: low nose, slanted windscreen, tall cargo box
  vanBody: meshLoft([
    {z:-2.07,w:.70,yb:.30,yt:.80,e:6},{z:-2.03,w:.79,yb:.26,yt:.90,e:7},{z:-1.88,w:.805,yb:.25,yt:.99,e:8,tw:.96},
    {z:-1.5,w:.81,yb:.25,yt:1.05,e:8,tw:.95},{z:-1.14,w:.81,yb:.25,yt:1.11,e:8,tw:.93},{z:-0.96,w:.81,yb:.25,yt:1.37,e:8,tw:.9},
    {z:-0.74,w:.81,yb:.25,yt:1.63,e:8,tw:.89},{z:-0.6,w:.81,yb:.25,yt:1.67,e:8,tw:.9},{z:-0.43,w:.81,yb:.25,yt:1.68,e:8,tw:.9},
    {z:-0.40,w:.825,yb:.25,yt:1.89,e:10,tw:.95},{z:1.93,w:.825,yb:.25,yt:1.89,e:10,tw:.95},{z:2.02,w:.81,yb:.28,yt:1.86,e:9,tw:.94},{z:2.06,w:.76,yb:.34,yt:1.80,e:7}
  ],36),
  // Aston-Martin-Valhalla-style hypercar body (lower shell) and teardrop canopy
  supBody: meshLoft([
    {z:-2.37,w:.62,yb:.17,yt:.36,e:3.2},{z:-2.28,w:.84,yb:.12,yt:.48,e:4},{z:-2.05,w:.95,yb:.11,yt:.6,e:4.5,tw:.78},
    {z:-1.6,w:.99,yb:.12,yt:.72,e:5,tw:.66},{z:-1.15,w:.99,yb:.13,yt:.74,e:5,tw:.6},{z:-0.7,w:.93,yb:.15,yt:.74,e:5,tw:.7},
    {z:-0.1,w:.9,yb:.15,yt:.76,e:5,tw:.74},{z:0.5,w:.97,yb:.15,yt:.82,e:5,tw:.68},{z:1.1,w:1.0,yb:.16,yt:.86,e:5,tw:.62},
    {z:1.7,w:.98,yb:.19,yt:.85,e:5,tw:.66},{z:2.15,w:.92,yb:.27,yt:.8,e:6,tw:.75},{z:2.38,w:.84,yb:.33,yt:.74,e:6}
  ],40),
  supCanopy: meshLoft([
    {z:-1.2,w:.46,yb:.69,yt:.71,e:2.4},{z:-0.85,w:.62,yb:.69,yt:.96,e:2.6,tw:.72},{z:-0.35,w:.67,yb:.7,yt:1.12,e:2.6,tw:.62},
    {z:0.15,w:.65,yb:.72,yt:1.15,e:2.6,tw:.56},{z:0.65,w:.57,yb:.76,yt:1.08,e:2.6,tw:.52},{z:1.15,w:.42,yb:.8,yt:.96,e:2.4},{z:1.5,w:.2,yb:.83,yt:.88,e:2.2}
  ],32),
  supSpine: meshLoft([{z:-0.15,w:.05,yb:1.08,yt:1.13,e:3},{z:0.2,w:.13,yb:1.05,yt:1.2,e:3},{z:0.75,w:.16,yb:1.0,yt:1.2,e:3},{z:1.4,w:.14,yb:.86,yt:1.05,e:3},{z:2.0,w:.1,yb:.8,yt:.9,e:3}],20),
  tyre: meshTyre(), rim: meshRim(), spoke: meshSpoke(),
  head: meshSphere(20,14),
  };
}

function wheelParts(x,y,z,r,w,kind){ // returns parts for one wheel (spin applied per frame on rx of tagged parts)
  const side=Math.sign(x), p=[];
  p.push(['tyre',x,y,z,w,r*2,r*2,MAT.TYRE,COL.black,0,0,0,0,0,'spin']);
  if(kind==='steel'){
    p.push(['rim',x+side*0.01,y,z,w*0.9*side,r*1.72,r*1.72,MAT.STD+.35,[.5,.51,.53],1,0,0,0,0,'spin']);
    p.push(['cylX',x+side*w*0.32,y,z,0.03,r*0.5,r*0.5,MAT.STD+.3,[.6,.6,.62],1]);
  } else {
    p.push(['cylX',x-side*0.02,y,z,0.05,r*1.2,r*1.2,MAT.STD+.35,[.35,.35,.36],1]); // brake disc
    p.push(['box',x-side*0.0,y+r*0.32,z-r*0.2,0.09,r*0.35,r*0.5,MAT.PAINT+.3,[.02,.08,.05],1]); // caliper
    p.push(['rim',x+side*0.01,y,z,w*0.85*side,r*1.74,r*1.74,MAT.STD+.22,COL.gold,1,0,0,0,0,'spin']);
    for(let k=0;k<10;k++) p.push(['spoke',x+side*w*0.32,y,z,1,r*1.74,r*1.74,MAT.STD+.22,COL.gold,1,k*Math.PI/5,0,0,0,'spin']);
    p.push(['cylX',x+side*w*0.36,y,z,0.04,r*0.3,r*0.3,MAT.STD+.3,[.08,.08,.08],1]);
  }
  return p; }

// Seated person (head, hair, shoulders). who: 'leo' | 'mira'
function personParts(who,x,y,z){
  const p=[];
  if(who==='leo'){
    p.push(['rbox',x,y-0.25,z,0.5,0.45,0.32,MAT.STD+.8,[.03,.03,.035],0]); // dark hoodie
    p.push(['head',x,y+0.08,z,0.2,0.25,0.22,MAT.SKIN,COL.skin,0]);
    p.push(['head',x,y+0.19,z+0.02,0.22,0.15,0.24,MAT.STD+.9,[.06,.04,.03],0]); // messy hair
    p.push(['head',x,y-0.02,z-0.03,0.19,0.16,0.18,MAT.STD+.95,[.05,.035,.025],0]); // beard
  } else {
    p.push(['rbox',x,y-0.25,z,0.48,0.42,0.3,MAT.STD+.95,[.24,.15,.09],0]); // knit sweater
    p.push(['head',x,y+0.08,z,0.19,0.24,0.21,MAT.SKIN,COL.skin2,0]);
    p.push(['head',x,y+0.15,z+0.03,0.215,0.18,0.23,MAT.STD+.85,[.22,.12,.06],0]); // curly hair
    p.push(['head',x,y+0.27,z+0.08,0.13,0.12,0.13,MAT.STD+.85,[.22,.12,.06],0]); // bun
    p.push(['box',x,y+0.09,z-0.1,0.19,0.07,0.02,MAT.STD+.3,[.85,.5,.6],0]); // pink glasses
  }
  return p; }

function vanParts(){ const W=[.86,.86,.83], p=[];
  p.push(['vanBody',0,0,0,1,1,1,MAT.PAINT+.32,W,0.15]);
  // bumpers + plastic trim
  p.push(['rbox',0,.38,-2.02,1.66,.27,.22,MAT.STD+.75,COL.plastic,0]);
  p.push(['rbox',0,.42,2.03,1.66,.26,.2,MAT.STD+.75,COL.plastic,0]);
  for(const s of [-1,1]){
    p.push(['box',s*.828,.74,.45,.03,.11,4.3,MAT.STD+.7,[.12,.12,.13],0]); // rubbing strip
    p.push(['box',s*.828,.32,-1.28,.05,.42,.9,MAT.STD+.8,COL.plastic,0]); // arch flare
    p.push(['box',s*.828,.32,1.25,.05,.42,.9,MAT.STD+.8,COL.plastic,0]);
    p.push(['box',s*.818,1.08,-0.42,.02,1.6,.012,MAT.STD,[.15,.15,.16],0]); // door gap
    p.push(['box',s*.814,1.36,-0.75,.012,.44,.6,MAT.GLASSO,[.03,.035,.04],0,0,0,0]); // cab window
    p.push(['rbox',s*.97,1.2,-1.0,.08,.2,.14,MAT.STD+.6,COL.plastic,0]); // mirror
    p.push(['box',s*.89,1.18,-0.95,.14,.03,.04,MAT.STD,COL.plastic,0]);
    p.push(['box',s*.818,1.02,-0.55,.02,.04,.18,MAT.STD+.3,COL.chrome,1]); // handle
    // headlight, indicator
    p.push(['box',s*.52,.77,-2.07,.36,.22,.05,MAT.EMI,[1,.9,.72],3.2,0,0,0,0,'head']);
    p.push(['box',s*.52,.77,-2.055,.4,.26,.04,MAT.STD+.3,COL.chrome,1]);
    p.push(['box',s*.52,.55,-2.075,.34,.07,.04,MAT.EMI,[1,.45,.05],1.2]);
    // tail lights (vertical) + reversing
    p.push(['box',s*.66,.66,2.075,.15,.34,.04,MAT.EMI,[1,.05,.03],3,0,0,0,0,'tail']);
    p.push(['box',s*.66,.86,2.075,.15,.07,.04,MAT.EMI,[1,.45,.05],.8]);
    // rear door window
    p.push(['box',s*.42,1.48,2.07,.6,.48,.012,MAT.GLASSO,[.03,.035,.04],0]);
  }
  // grille with horizontal bars (between headlights)
  p.push(['box',0,.76,-2.07,.62,.24,.04,MAT.STD+.6,[.04,.04,.045],0]);
  for(let k=0;k<3;k++) p.push(['box',0,.68+k*.075,-2.085,.6,.025,.02,MAT.STD+.3,[.3,.3,.32],.8]);
  // windscreen (sloped) + wipers
  p.push(['box',0,1.37,-0.86,1.5,.6,.02,MAT.GLASSO,[.03,.035,.04],0,0.64,0,0]);
  p.push(['box',-.3,1.13,-1.08,.55,.02,.03,MAT.STD,COL.black,0,0,0,0.12]); p.push(['box',.3,1.13,-1.08,.55,.02,.03,MAT.STD,COL.black,0,0,0,0.12]);
  // side cargo window (left side, like the comic)
  p.push(['box',-.832,1.42,.55,.012,.46,.78,MAT.GLASSO,[.03,.035,.04],0]);
  p.push(['box',-.83,1.42,.55,.016,.54,.86,MAT.STD+.6,[.2,.2,.21],0]);
  // rear doors: centre split, handle, plate, bumper step
  p.push(['box',0,1.1,2.068,.015,1.5,.01,MAT.STD,[.15,.15,.16],0]);
  p.push(['box',.14,1.08,2.075,.14,.04,.03,MAT.STD+.3,COL.chrome,1]);
  p.push(['quad',0,.46,2.15,.52,.11,1,MAT.DECAL,[1,1,1],0,0,0,0,0]);
  p.push(['quad',0,.43,-2.14,.52,.11,1,MAT.DECAL,[1,1,1],0,0,Math.PI,0,0]);
  // roof refrigeration unit with grille slats (comic detail)
  p.push(['rbox',0,1.99,.45,1.32,.22,1.05,MAT.PAINT+.35,[.88,.88,.86],0.1]);
  for(let k=0;k<5;k++) p.push(['box',-.4+k*.2,1.99,-.08,.1,.12,.02,MAT.STD+.6,[.45,.45,.46],0]);
  p.push(['cylY',.55,2.25,-.25,.012,.5,.012,MAT.STD,COL.black,0]); // antenna
  p.push(['box',0,.24,0,1.5,.04,3.6,MAT.STD,[.02,.02,.02],0]); // underbody
  p.push(['cylX',.35,.24,2.1,.05,.05,.05,MAT.STD,[.2,.2,.2],1]);
  for(const [x,z] of [[-.74,-1.28],[.74,-1.28],[-.74,1.25],[.74,1.25]]) p.push(...wheelParts(x,.3,z,.3,.19,'steel'));
  return p; }

function supParts(){ const G=[.012,.1,.055], p=[];
  p.push(['supBody',0,0,0,1,1,1,MAT.PAINT+.2,G,1.0]);
  p.push(['supCanopy',0,0,0,1,1,1,MAT.GLASS,[.015,.025,.022],0.72]);
  p.push(['supSpine',0,0,0,1,1,1,MAT.PAINT+.2,G,1.0]);
  p.push(['box',0,1.16,0.18,.16,.1,.06,MAT.STD+.6,COL.black,0]); // roof snorkel intake
  // front: splitter, intakes, headlights, plate
  p.push(['rbox',0,.13,-2.2,1.7,.05,.35,MAT.STD+.5,[.03,.03,.035],0]);
  p.push(['box',0,.3,-2.33,.9,.12,.06,MAT.STD+.7,[.01,.01,.012],0]);
  for(const s of [-1,1]){
    p.push(['box',s*.62,.5,-2.13,.42,.07,.12,MAT.STD+.3,[.02,.02,.025],0,0,s*.3,0]); // headlight housing
    p.push(['box',s*.62,.52,-2.17,.36,.03,.04,MAT.EMI,[.85,.92,1],6,0,s*.3,0,0,'head']);
    p.push(['box',s*.44,.38,-2.3,.32,.16,.05,MAT.STD+.7,[.01,.01,.012],0,0,s*.4,0]); // lower intakes
    p.push(['box',s*.96,.48,.75,.05,.3,.9,MAT.STD+.7,[.01,.01,.012],0]); // side intake
    p.push(['box',s*.94,.25,-0.3,.05,.12,2.2,MAT.STD+.6,[.02,.02,.025],0]); // side blade
    p.push(['rbox',s*.76,.9,-.55,.16,.08,.12,MAT.PAINT+.2,G,1]); p.push(['box',s*.7,.86,-.55,.12,.02,.03,MAT.STD,COL.black,0]); // mirrors
    p.push(['cylY',s*.24,.86,1.75,.07,.12,.07,MAT.STD+.25,[.25,.25,.27],1]); // top exhausts
    p.push(['box',s*.05,.95,2.0,.04,.22,.18,MAT.STD+.5,COL.black,0]); // wing pylons
    p.push(['seat',s*.33,.5,.15]);
  }
  p.push(['rbox',0,1.06,2.06,1.62,.035,.32,MAT.PAINT+.2,G,1]); // rear wing
  p.push(['box',0,.7,2.38,1.6,.035,.04,MAT.EMI,[1,.04,.02],4,0,0,0,0,'tail']); // full-width LED bar
  for(let k=0;k<5;k++) p.push(['box',-.6+k*.3,.25,2.25,.02,.16,.4,MAT.STD+.6,COL.black,0]); // diffuser fins
  p.push(['box',0,.2,2.3,1.5,.03,.4,MAT.STD+.6,COL.black,0]);
  p.push(['quad',0,.24,-2.39,.52,.11,1,MAT.DECAL,[1,1,1],0,-0.15,Math.PI,0,1]);
  p.push(['quad',0,.48,2.4,.52,.11,1,MAT.DECAL,[1,1,1],0,0,0,0,1]);
  p.push(['box',0,.12,0,1.7,.03,4.2,MAT.STD,[.02,.02,.02],0]);
  for(const [x,z,r,w] of [[-.86,-1.42,.36,.27],[.86,-1.42,.36,.27],[-.87,1.46,.37,.32],[.87,1.46,.37,.32]]) p.push(...wheelParts(x,r,z,r,w,'sport'));
  return p; }

/* expand 'seat' helper and compile to flat arrays for fast per-frame instancing */
function compileParts(list,meshIndex){ const out=[];
  for(const q of list){
    if(q[0]==='seat'){ const [,x,y,z]=q; out.push(compileParts([['rbox',x,y,z,.5,.12,.55,MAT.STD+.8,[.05,.04,.04],0],['rbox',x,y+.32,z+.3,.48,.6,.12,MAT.STD+.8,[.05,.04,.04],0]],meshIndex)); continue; }
    const [mk,x,y,z,sx,sy,sz,mat,col,param,rx=0,ry=0,rz=0,slot=0,tag='',off=0]=q;
    out.push([[meshIndex[mk],x,y,z,sx,sy,sz,mat,col[0],col[1],col[2],param,rx,ry,rz,slot,tag,off]]); }
  return out.flat(); }
