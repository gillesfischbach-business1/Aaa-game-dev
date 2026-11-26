/* ===== Procedural mesh builders =====
   Vertex layout: position(3) normal(3) uv(2) = 8 floats.
   Rendering uses cullMode 'none' and flips normals toward the viewer, so winding never breaks shading. */
class MB{
  constructor(){ this.v=[]; this.ix=[]; }
  get n(){ return this.v.length/8; }
  vert(x,y,z,nx,ny,nz,u=0,w=0){ this.v.push(x,y,z,nx,ny,nz,u,w); return this.n-1; }
  tri(a,b,c){ this.ix.push(a,b,c); }
  quad(a,b,c,d){ this.ix.push(a,b,c,a,c,d); }
  add(o,tx=0,ty=0,tz=0){ const b=this.n; for(let i=0;i<o.v.length;i+=8) this.v.push(o.v[i]+tx,o.v[i+1]+ty,o.v[i+2]+tz,o.v[i+3],o.v[i+4],o.v[i+5],o.v[i+6],o.v[i+7]); for(const i of o.ix) this.ix.push(i+b); return this; }
  smoothNormals(){ const v=this.v, n=new Float32Array(this.n*3);
    for(let k=0;k<this.ix.length;k+=3){ const a=this.ix[k]*8,b=this.ix[k+1]*8,c=this.ix[k+2]*8;
      const ux=v[b]-v[a],uy=v[b+1]-v[a+1],uz=v[b+2]-v[a+2], wx=v[c]-v[a],wy=v[c+1]-v[a+1],wz=v[c+2]-v[a+2];
      const nx=uy*wz-uz*wy, ny=uz*wx-ux*wz, nz=ux*wy-uy*wx;
      for(const q of [this.ix[k],this.ix[k+1],this.ix[k+2]]){ n[q*3]+=nx; n[q*3+1]+=ny; n[q*3+2]+=nz; } }
    for(let i=0;i<this.n;i++){ const l=Math.hypot(n[i*3],n[i*3+1],n[i*3+2])||1; v[i*8+3]=n[i*3]/l; v[i*8+4]=n[i*3+1]/l; v[i*8+5]=n[i*3+2]/l; }
    return this; }
}
// unit cube centred at origin, flat normals, uv per face
function meshBox(){ const m=new MB(); const F=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  for(const n of F){ const u=n[1]!==0?[1,0,0]:[0,1,0]; const w=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]]; const b=m.n;
    for(const [s,t] of [[-1,-1],[1,-1],[1,1],[-1,1]]) m.vert(n[0]*.5+(u[0]*s+w[0]*t)*.5,n[1]*.5+(u[1]*s+w[1]*t)*.5,n[2]*.5+(u[2]*s+w[2]*t)*.5,n[0],n[1],n[2],(s+1)/2,(t+1)/2);
    m.quad(b,b+1,b+2,b+3); } return m; }
// plane in XY facing +Z, uv 0..1 (decals)
function meshQuad(){ const m=new MB(); m.vert(-.5,-.5,0,0,0,1,0,1); m.vert(.5,-.5,0,0,0,1,1,1); m.vert(.5,.5,0,0,0,1,1,0); m.vert(-.5,.5,0,0,0,1,0,0); m.quad(0,1,2,3); return m; }
function meshSphere(sl,st){ const m=new MB(); for(let i=0;i<=st;i++){ const th=i/st*Math.PI; for(let j=0;j<=sl;j++){ const ph=j/sl*Math.PI*2; const x=Math.sin(th)*Math.cos(ph),y=Math.cos(th),z=Math.sin(th)*Math.sin(ph); m.vert(x*.5,y*.5,z*.5,x,y,z,j/sl,i/st); } }
  for(let i=0;i<st;i++) for(let j=0;j<sl;j++){ const a=i*(sl+1)+j,b=a+sl+1; m.quad(a,a+1,b+1,b); } return m; }
// lathe: profile [[r,h],...] revolved around axis ('y' or 'x'); h along axis
function meshLathe(profile,seg,axis='y',smooth=true){ const m=new MB(); const P=profile.length;
  for(let i=0;i<P;i++){ const [r,h]=profile[i]; for(let j=0;j<=seg;j++){ const a=j/seg*Math.PI*2, c=Math.cos(a)*r, s=Math.sin(a)*r;
      axis==='y'? m.vert(c,h,s,0,0,0,j/seg,i/(P-1)) : m.vert(h,c,s,0,0,0,j/seg,i/(P-1)); } }
  for(let i=0;i<P-1;i++) for(let j=0;j<seg;j++){ const a=i*(seg+1)+j,b=a+seg+1; m.quad(a,a+1,b+1,b); }
  return m.smoothNormals(); }
const meshCylY=seg=>meshLathe([[0,-.5],[.5,-.5],[.5,-.5],[.5,.5],[.5,.5],[0,.5]],seg,'y');
const meshCone=seg=>meshLathe([[0,-.5],[.5,-.5],[.5,-.5],[0,.5]],seg,'y');
// rounded box with half extents and bevel radius r (n bevel steps)
function meshRBox(hx,hy,hz,r,n=4){ const m=new MB(); const H=[hx,hy,hz], I=H.map(h=>Math.max(0,h-r));
  const axisVals=k=>{ const a=[]; for(let i=0;i<=n;i++){ const t=i/n*Math.PI/2; a.push(-I[k]-r*Math.cos(t)); } if(I[k]>0){ a.push(0); } for(let i=0;i<=n;i++){ const t=(n-i)/n*Math.PI/2; a.push(I[k]+r*Math.cos(t)); } return a; };
  const V=[axisVals(0),axisVals(1),axisVals(2)];
  const faces=[[0,1,2,1],[0,1,2,-1],[1,2,0,1],[1,2,0,-1],[2,0,1,1],[2,0,1,-1]]; // [axis u, axis v, axis n, sign]
  for(const [ua,va,na,sg] of faces){ const U=V[ua], W=V[va], b=m.n;
    for(let j=0;j<W.length;j++) for(let i=0;i<U.length;i++){ const c=[0,0,0]; c[ua]=U[i]; c[va]=W[j]; c[na]=sg*H[na];
      const ci=c.map((x,k)=>Math.max(-I[k],Math.min(I[k],x))); let d=[c[0]-ci[0],c[1]-ci[1],c[2]-ci[2]]; let l=Math.hypot(...d);
      if(l<1e-6){ d=[0,0,0]; d[na]=sg; l=1; } const nn=d.map(x=>x/l); m.vert(ci[0]+nn[0]*r,ci[1]+nn[1]*r,ci[2]+nn[2]*r,nn[0],nn[1],nn[2],i/(U.length-1),j/(W.length-1)); }
    for(let j=0;j<W.length-1;j++) for(let i=0;i<U.length-1;i++){ const a=b+j*U.length+i; m.quad(a,a+1,a+1+U.length,a+U.length); } }
  return m; }
/* loft along Z. stations: {z, w (half width), yb (bottom), yt (top), e (superellipse exponent: 2 round … 8 boxy), cx (x offset), tw (top half-width factor 0..1 for tumblehome)} */
function meshLoft(st,ring=28,caps=true){ const m=new MB(); const R=ring;
  for(let s=0;s<st.length;s++){ const S=st[s]; const cy=(S.yb+S.yt)/2, hh=(S.yt-S.yb)/2, e=S.e||4, tw=S.tw===undefined?1:S.tw;
    for(let j=0;j<=R;j++){ const a=j/R*Math.PI*2; const c=Math.cos(a), s2=Math.sin(a);
      let x=Math.sign(c)*Math.pow(Math.abs(c),2/e)*S.w, y=Math.sign(s2)*Math.pow(Math.abs(s2),2/e)*hh;
      if(y>0) x*=lerp(1,tw,y/hh);
      m.vert(x+(S.cx||0),cy+y,S.z,0,0,0,j/R,s/(st.length-1)); } }
  for(let s=0;s<st.length-1;s++) for(let j=0;j<R;j++){ const a=s*(R+1)+j,b=a+R+1; m.quad(a,a+1,b+1,b); }
  if(caps) for(const s of [0,st.length-1]){ const S=st[s]; const c=m.vert(S.cx||0,(S.yb+S.yt)/2,S.z,0,0,0,.5,.5); for(let j=0;j<R;j++) m.tri(c,s*(R+1)+j,s*(R+1)+j+1); }
  return m.smoothNormals(); }
// gable roof prism: base 1x1 at y=0, ridge at y=1 along Z
function meshGable(){ const m=new MB(); const p=[[-.5,0],[.5,0],[0,1]];
  for(const z of [-.5,.5]){ const b=m.n; for(const [x,y] of p) m.vert(x,y,z,0,0,Math.sign(z)); m.tri(b,b+1,b+2); }
  const sl=Math.SQRT1_2; const sides=[[[-.5,0],[0,1],-sl,sl],[[.5,0],[0,1],sl,sl]];
  for(const [[x0,y0],[x1,y1],nx,ny] of sides){ const b=m.n; m.vert(x0,y0,-.5,nx,ny,0,0,0); m.vert(x1,y1,-.5,nx,ny,0,1,0); m.vert(x1,y1,.5,nx,ny,0,1,1); m.vert(x0,y0,.5,nx,ny,0,0,1); m.quad(b,b+1,b+2,b+3); }
  return m; }
// tyre around X axis: radius 0.5 total, width 1 (scaled per instance)
function meshTyre(){ const p=[]; const N=14; for(let i=0;i<=N;i++){ const a=i/N*Math.PI; p.push([0.36+0.14*Math.sin(a)*1.0+0.0, -0.5+ i/N]); }
  // inner lip
  p.unshift([0.33,-0.5]); p.push([0.33,0.5]); return meshLathe(p.map(([r,h])=>[r,h*0.98]),40,'x'); }
// rim dish (disc with lip) around X
function meshRim(){ return meshLathe([[0.0,0.05],[0.12,0.06],[0.13,0.02],[0.3,0.0],[0.335,0.06],[0.34,-0.2],[0.33,-0.45]],36,'x'); }
// one spoke for a multi-spoke wheel: box from r=0.09 to 0.33 along +Y, thin in Z
function meshSpoke(){ const m=meshRBox(0.04,0.12,0.022,0.015,2); for(let i=0;i<m.v.length;i+=8) m.v[i+1]+=0.21; return m; }
