/* ===== Free driving: arcade vehicle physics, collisions, traffic ===== */
const VEH={
 fidele:{max:33,rev:9,accel:7.5,brake:16,grip:5.5,steer:.62,wb:2.55,half:[.86,2.1],cam:[4.0,11.5],eng:[34,1.4],mass:1.4},
 smaragd:{max:64,rev:12,accel:17,brake:26,grip:9,steer:.55,wb:2.85,half:[1.0,2.35],cam:[3.2,10.5],eng:[50,1.25],mass:1}
};
function newCar(car,x,z,h){ return {car,x,z,h,v:0,lat:0,steer:0,yawRate:0,roll:0,pitch:0,spin:0,brake:false,bump:0}; }
const _cols=[];
function stepCar(c,thr,brk,steerIn,dt,boost){ const V=VEH[c.car];
  // longitudinal
  const max=V.max*(boost?1.3:1);
  if(thr>0){ const a=V.accel*(boost?1.8:1)*thr*(1-Math.max(0,c.v)/max); c.v+=a*dt; }
  if(brk>0){ if(c.v>0.6) c.v-=V.brake*brk*dt; else c.v=Math.max(-V.rev,c.v-V.accel*.6*brk*dt); }
  if(thr<=0&&brk<=0) c.v-=Math.sign(c.v)*Math.min(Math.abs(c.v),(1.2+Math.abs(c.v)*.03)*dt);
  c.v-=c.v*Math.abs(c.v)*0.0009*dt;
  // steering: bicycle model with speed-dependent lock
  const lock=V.steer*lerp(1,.28,clamp(Math.abs(c.v)/V.max,0,1));
  c.steer+=(steerIn*lock-c.steer)*Math.min(1,dt*7);
  const yawRate=c.v/V.wb*Math.tan(c.steer); c.yawRate=yawRate;
  c.h-=yawRate*dt;
  // lateral slip (a little drift at speed)
  const targetLat=-yawRate*c.v*0.035; c.lat+=(targetLat-c.lat)*Math.min(1,dt*V.grip);
  const fx=-Math.sin(c.h), fz=-Math.cos(c.h), rx=Math.cos(c.h), rz=-Math.sin(c.h);
  const ps=c.v;
  c.x+=(fx*c.v+rx*c.lat)*dt; c.z+=(fz*c.v+rz*c.lat)*dt;
  c.roll=lerp(c.roll,clamp(yawRate*c.v*(c.car==='fidele'?.012:.005),-.08,.08),Math.min(1,dt*5));
  c.pitch=lerp(c.pitch,clamp(-(c.v-ps)/Math.max(dt,1e-3)*.002,-.05,.05),Math.min(1,dt*5));
  c.spin+=c.v*dt/.33; c.brake=brk>0&&c.v>0.5;
  // collisions: two circles along the car body against AABBs
  const r=V.half[0]+.05, off=V.half[1]-V.half[0];
  let hit=0;
  for(const s of [-1,1]){ const px=c.x+fx*off*s, pz=c.z+fz*off*s;
    colsNear(px,pz,_cols);
    for(const b of _cols){ const qx=clamp(px,b.x0,b.x1), qz=clamp(pz,b.z0,b.z1); let dx=px-qx, dz=pz-qz; let d=Math.hypot(dx,dz);
      if(d<r){ if(d<1e-4){ const l=px-b.x0, rr2=b.x1-px, t=pz-b.z0, bt=b.z1-pz; const m=Math.min(l,rr2,t,bt); dx=m===l?-1:m===rr2?1:0; dz=m===t?-1:m===bt?1:0; d=0; }
        else { dx/=d; dz/=d; }
        const pen=r-d; c.x+=dx*pen; c.z+=dz*pen;
        const vx=fx*c.v+rx*c.lat, vz=fz*c.v+rz*c.lat; const vn=vx*dx+vz*dz;
        if(vn<0){ const nvx=vx-dx*vn*1.35, nvz=vz-dz*vn*1.35; c.v=(nvx*fx+nvz*fz)*.82; c.lat=(nvx*rx+nvz*rz)*.6; hit=Math.max(hit,-vn); } } } }
  c.bump=hit; return hit; }

// ---------- traffic ----------
const TRAFFIC=[]; let TRAFFIC_PARTS=null;
const TCOL=[[.55,.05,.06],[.1,.12,.2],[.75,.75,.76],[.15,.3,.5],[.06,.06,.065],[.5,.45,.4],[.85,.82,.75],[.2,.35,.25]];
function trafficParts(){ if(!TRAFFIC_PARTS) TRAFFIC_PARTS=TCOL.map(c=>sedanParts(c)); return TRAFFIC_PARTS; }
function laneOffset(e){ return e.lanes>1?5:3; }
function spawnTraffic(px,pz){ const E=graph.edges; if(!E.length) return;
  for(let tries=0;tries<12&&TRAFFIC.length<16;tries++){ const e=E[(Math.random()*E.length)|0]; const t=Math.random(); const x=lerp(e.a.x,e.b.x,t), z=lerp(e.a.z,e.b.z,t); const d=Math.hypot(x-px,z-pz);
    if(d<90||d>320) continue; const fwd=Math.random()<.5; TRAFFIC.push({e,from:fwd?e.a:e.b,to:fwd?e.b:e.a,t:fwd?t:1-t,v:rr(9,13)*(e.lanes>1?2:1),vmax:rr(9,13)*(e.lanes>1?2.2:1),parts:pick(trafficParts()),x,z,h:0,spin:0,wait:0}); } }
function updateTraffic(dt,P,others){
  for(let i=TRAFFIC.length-1;i>=0;i--){ const c=TRAFFIC[i];
    const dx=c.to.x-c.from.x, dz=c.to.z-c.from.z, L=Math.hypot(dx,dz)||1, ux=dx/L, uz=dz/L;
    // slow down for the player or other cars ahead in the same lane
    let want=c.vmax; const ax=c.x+ux*7, az=c.z+uz*7;
    if(Math.hypot(P.x-ax,P.z-az)<7){ want=0; c.blocked=(c.blocked||0)+dt; } else c.blocked=0;
    for(const o of TRAFFIC){ if(o!==c&&Math.hypot(o.x-ax,o.z-az)<5.5) { want=Math.min(want,o.v*.8); c.blocked=(c.blocked||0)+dt*.5; } }
    if(c.blocked>5){ TRAFFIC.splice(i,1); continue; }
    if(c.wait>0){ c.wait-=dt; want=0; }
    c.v+=(want-c.v)*Math.min(1,dt*(want<c.v?3:1)); c.t+=c.v*dt/L; c.spin+=c.v*dt/.32;
    if(c.t>=1){ const n=c.to; const opts=n.edges.filter(e=>e!==c.e); const e=opts.length?pick(opts):c.e; c.from=n; c.to=e.a===n?e.b:e.a; c.e=e; c.t=0; continue; }
    const off=laneOffset(c.e); c.x=lerp(c.from.x,c.to.x,c.t)-uz*off; c.z=lerp(c.from.z,c.to.z,c.t)+ux*off;
    const th=Math.atan2(-ux,-uz); let dh=th-c.h; while(dh>Math.PI) dh-=2*Math.PI; while(dh<-Math.PI) dh+=2*Math.PI; c.h+=dh*Math.min(1,dt*6);
    if(Math.hypot(c.x-P.x,c.z-P.z)>380) TRAFFIC.splice(i,1); }
  // player vs traffic
  for(const c of TRAFFIC){ const dx=P.x-c.x, dz=P.z-c.z, d=Math.hypot(dx,dz); const V=VEH[P.car]; const rr2=V.half[1]+1.6;
    if(d<rr2&&d>1e-3){ const nx=dx/d, nz=dz/d; P.x+=nx*(rr2-d)*.7; P.z+=nz*(rr2-d)*.7; const fx=-Math.sin(P.h), fz=-Math.cos(P.h); const vn=(fx*P.v)*nx+(fz*P.v)*nz;
      if(vn<0){ P.v*=.55; P.bump=Math.max(P.bump,-vn); c.wait=2.5; } } }
}

// ---------- GPS: shortest path over the road graph ----------
function nearestNode(x,z){ let best=null,bd=1e9; for(const n of graph.nodes.values()){ const d=Math.hypot(n.x-x,n.z-z); if(d<bd){ bd=d; best=n; } } return best; }
function findRoute(x,z,tx,tz){ const a=nearestNode(x,z), b=nearestNode(tx,tz); if(!a||!b) return [];
  const dist=new Map([[a,0]]), prev=new Map(), open=[a], done=new Set();
  while(open.length){ let bi=0; for(let i=1;i<open.length;i++) if(dist.get(open[i])<dist.get(open[bi])) bi=i; const n=open.splice(bi,1)[0]; if(n===b) break; if(done.has(n)) continue; done.add(n);
    for(const e of n.edges){ const m=e.a===n?e.b:e.a; const nd=dist.get(n)+Math.hypot(m.x-n.x,m.z-n.z); if(nd<(dist.has(m)?dist.get(m):1e18)){ dist.set(m,nd); prev.set(m,n); open.push(m); } } }
  const path=[]; let c=b; while(c){ path.unshift(c); if(c===a) break; c=prev.get(c); } if(path[0]!==a) return [];
  const offLine=(A,B)=>{ const ux=B.x-A.x, uz=B.z-A.z, L=Math.hypot(ux,uz)||1; return Math.abs((x-A.x)*uz-(z-A.z)*ux)/L; };
  while(path.length>1&&offLine(path[0],path[1])<5&&Math.hypot(x-path[1].x,z-path[1].z)<Math.hypot(path[0].x-path[1].x,path[0].z-path[1].z)) path.shift();
  return path; }
