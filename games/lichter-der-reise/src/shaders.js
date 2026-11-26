/* ===== WGSL shaders =====
   Scene uniform layout (floats): viewProj 0, lightVP 16, camPos 32, camRight 36 (w tanX), camUp 40 (w tanY), camFwd 44,
   sunDir 48 (w shadow strength), sunCol 52 (w stars), skyTop 56 (w clouds), skyHor 60 (w fog), skyGround 64 (w sun size),
   ambTop 68 (w window light), ambBot 72 (w wetness), misc 76 (x lightCount, y time, z shadow texel, w ground haze), lightPos 80, lightCol 208 */
const NL=32;
const WGSL_COMMON=/* wgsl */`
const PI=3.14159265;
struct Scene{
  viewProj:mat4x4f, lightVP:mat4x4f, camPos:vec4f, camRight:vec4f, camUp:vec4f, camFwd:vec4f,
  sunDir:vec4f, sunCol:vec4f, skyTop:vec4f, skyHor:vec4f, skyGround:vec4f, ambTop:vec4f, ambBot:vec4f, misc:vec4f,
  lightPos:array<vec4f,${NL}>, lightCol:array<vec4f,${NL}>
};
@group(0) @binding(0) var<uniform> S:Scene;
fn hash3(p:vec3f)->f32{ var q=fract(p*0.3183099+vec3f(0.11,0.17,0.13)); q*=17.0; return fract(q.x*q.y*q.z*(q.x+q.y+q.z)); }
fn hash2(p:vec2f)->f32{ var q=fract(p*vec2f(0.1031,0.1030)); q+=dot(q,q.yx+33.33); return fract((q.x+q.y)*q.x); }
fn noise3(x:vec3f)->f32{ let i=floor(x); let f=fract(x); let u=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3f(1,0,0)),u.x),mix(hash3(i+vec3f(0,1,0)),hash3(i+vec3f(1,1,0)),u.x),u.y),
             mix(mix(hash3(i+vec3f(0,0,1)),hash3(i+vec3f(1,0,1)),u.x),mix(hash3(i+vec3f(0,1,1)),hash3(i+vec3f(1,1,1)),u.x),u.y),u.z); }
fn noise2(x:vec2f)->f32{ let i=floor(x); let f=fract(x); let u=f*f*(3.0-2.0*f);
  return mix(mix(hash2(i),hash2(i+vec2f(1,0)),u.x),mix(hash2(i+vec2f(0,1)),hash2(i+vec2f(1,1)),u.x),u.y); }
fn fbm3(p:vec3f)->f32{ var a=0.5; var s=0.0; var q=p; for(var i=0;i<4;i++){ s+=a*noise3(q); q=q*2.03+vec3f(1.7,9.2,3.1); a*=0.5; } return s; }
fn fbm2(p:vec2f)->f32{ var a=0.5; var s=0.0; var q=p; for(var i=0;i<4;i++){ s+=a*noise2(q); q=q*2.03+vec2f(1.7,9.2); a*=0.5; } return s; }
fn skyColor(dir:vec3f)->vec3f{
  let y=dir.y;
  var c=mix(S.skyHor.rgb,S.skyTop.rgb,pow(clamp(y,0.0,1.0),0.5));
  if(y<0.0){ c=mix(S.skyHor.rgb*0.9,S.skyGround.rgb,clamp(-y*5.0,0.0,1.0)); }
  let sd=S.sunDir.xyz; let mu=max(dot(dir,sd),0.0);
  c+=S.sunCol.rgb*(pow(mu,5.0)*0.22+pow(mu,40.0)*0.5)*smoothstep(-0.25,0.05,y+0.1);
  return c;
}`;

const WGSL_SCENE=WGSL_COMMON+/* wgsl */`
struct Inst{ a:vec4f, b:vec4f, c:vec4f, d:vec4f };
@group(0) @binding(1) var<storage,read> I:array<Inst>;
@group(0) @binding(2) var shadowTex:texture_depth_2d;
@group(0) @binding(3) var shadowSmp:sampler_comparison;
@group(0) @binding(4) var atlas:texture_2d<f32>;
@group(0) @binding(5) var linSmp:sampler;
struct VO{ @builtin(position) pos:vec4f, @location(0) wp:vec3f, @location(1) n:vec3f, @location(2) lp:vec3f, @location(3) on:vec3f,
  @location(4) col:vec4f, @location(5) @interpolate(flat) mat:vec4f, @location(6) uv:vec2f, @location(7) @interpolate(flat) sc:vec4f };
fn rot(v:vec3f,it:Inst)->vec3f{
  var p=v; let cx=cos(it.d.x); let sx=sin(it.d.x); p=vec3f(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);
  let cz=cos(it.d.y); let sz=sin(it.d.y); p=vec3f(p.x*cz-p.y*sz,p.x*sz+p.y*cz,p.z);
  let cy=cos(it.a.w); let sy=sin(it.a.w); return vec3f(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);
}
@vertex fn vs(@location(0) p:vec3f,@location(1) n:vec3f,@location(2) uv:vec2f,@builtin(instance_index) ii:u32)->VO{
  let it=I[ii]; let s=it.b.xyz; let lp=p*s; let wp=rot(lp,it)+it.a.xyz;
  var o:VO; o.pos=S.viewProj*vec4f(wp,1.0); o.wp=wp; o.n=rot(normalize(n/max(s,vec3f(1e-4))),it); o.lp=lp; o.on=n; o.col=it.c;
  o.mat=vec4f(floor(it.b.w),fract(it.b.w),fract(it.a.x*0.137+it.a.z*0.0713+it.a.y*0.31),it.d.z); o.uv=uv; o.sc=vec4f(s,it.d.w);
  return o;
}
@vertex fn vsShadow(@location(0) p:vec3f,@builtin(instance_index) ii:u32)->@builtin(position) vec4f{
  let it=I[ii]; let wp=rot(p*it.b.xyz,it)+it.a.xyz; return S.lightVP*vec4f(wp,1.0);
}
fn shadowAt(P:vec3f,N:vec3f)->f32{
  if(S.sunDir.w<=0.001){ return 1.0; }
  let q=S.lightVP*vec4f(P+N*0.06,1.0); let uv=vec2f(q.x*0.5+0.5,0.5-q.y*0.5);
  if(any(uv<vec2f(0.001)) || any(uv>vec2f(0.999)) || q.z>1.0){ return 1.0; }
  let t=S.misc.z; var s=0.0;
  for(var y=-1;y<=1;y++){ for(var x=-1;x<=1;x++){ s+=textureSampleCompareLevel(shadowTex,shadowSmp,uv+vec2f(f32(x),f32(y))*t*1.2,q.z-0.0015); } }
  s/=9.0;
  let edge=smoothstep(0.85,1.0,max(abs(q.x),abs(q.y)));
  return mix(1.0,mix(1.0,s,S.sunDir.w),1.0-edge);
}
fn Dggx(nh:f32,a:f32)->f32{ let a2=a*a; let d=nh*nh*(a2-1.0)+1.0; return a2/(PI*d*d+1e-6); }
fn Vis(nl:f32,nv:f32,a:f32)->f32{ return 0.5/(nl*(nv*(1.0-a)+a)+nv*(nl*(1.0-a)+a)+1e-5); }
fn Fs(f0:vec3f,c:f32)->vec3f{ return f0+(vec3f(1.0)-f0)*pow(1.0-c,5.0); }
struct Surf{ alb:vec3f, rough:f32, metal:f32, em:vec3f, n:vec3f, ao:f32, wet:f32, coat:f32, wrap:f32 };
fn hemi(N:vec3f)->vec3f{ return mix(S.ambBot.rgb,S.ambTop.rgb,N.y*0.5+0.5); }
fn shade(P:vec3f,V:vec3f,s:Surf,sh:f32)->vec3f{
  let N=s.n; let nv=max(dot(N,V),1e-3); let a=max(s.rough*s.rough,0.002);
  let f0=mix(vec3f(0.04),s.alb,s.metal); let dc=s.alb*(1.0-s.metal);
  var col=vec3f(0.0);
  // sun / moon
  let L=S.sunDir.xyz; let nlr=dot(N,L); let nl=max(nlr,0.0); let H=normalize(L+V);
  let wrapD=max((nlr+s.wrap)/(1.0+s.wrap),0.0);
  let F=Fs(f0,max(dot(H,V),0.0));
  col+=S.sunCol.rgb*sh*(dc*wrapD/PI*(vec3f(1.0)-F) + F*Dggx(max(dot(N,H),0.0),a)*Vis(nl,nv,a)*nl);
  if(s.coat>0.0){ col+=S.sunCol.rgb*sh*s.coat*Fs(vec3f(0.04),max(dot(H,V),0.0))*Dggx(max(dot(N,H),0.0),0.012)*Vis(nl,nv,0.012)*nl; }
  // ambient: hemisphere diffuse + sky reflection
  col+=dc*hemi(N)*s.ao;
  let R=reflect(-V,N);
  let Fr=f0+(max(vec3f(1.0-s.rough),f0)-f0)*pow(1.0-nv,5.0);
  let env=skyColor(normalize(vec3f(R.x,max(R.y,-0.2),R.z)));
  col+=env*Fr*mix(1.0,0.15,s.rough)*s.ao*mix(0.5,1.0,sh);
  if(s.coat>0.0){ col+=env*s.coat*(0.04+0.96*pow(1.0-nv,5.0))*mix(0.6,1.0,sh); }
  // point lights
  let cnt=i32(S.misc.x);
  let rightH=normalize(vec3f(-V.z,0.0,V.x)+vec3f(1e-4,0.0,0.0));
  for(var i=0;i<${NL};i++){
    if(i>=cnt){ break; }
    let lc=S.lightCol[i]; var Lp=S.lightPos[i].xyz-P; let d=length(Lp); if(d>lc.w){ continue; }
    Lp/=d; let x=d/lc.w; let win=clamp(1.0-x*x*x*x,0.0,1.0);
    let att=win*win/(d*d+0.6);
    let pnl=max((dot(N,Lp)+s.wrap)/(1.0+s.wrap),0.0); let Hp=normalize(Lp+V);
    let Fp=Fs(f0,max(dot(Hp,V),0.0));
    col+=lc.rgb*att*(dc*pnl/PI + Fp*Dggx(max(dot(N,Hp),0.0),a)*Vis(max(dot(N,Lp),0.0),nv,a)*max(dot(N,Lp),0.0));
    if(s.coat>0.0){ col+=lc.rgb*att*s.coat*0.04*Dggx(max(dot(N,Hp),0.0),0.015)*Vis(max(dot(N,Lp),0.0),nv,0.015)*max(dot(N,Lp),0.0); }
    if(s.wet>0.0){ let dd=R-Lp; let e1=dot(dd,rightH); let e2=dd.y;
      col+=lc.rgb*s.wet*exp(-(e1*e1*(700.0+600.0*(1.0-s.rough))+e2*e2*10.0))*win*0.09; }
  }
  return col+s.em;
}
fn bump(N:vec3f,dx:f32,dy:f32)->vec3f{ let T=normalize(cross(vec3f(0.0,1.0,0.0),N)+vec3f(1e-4,0.0,0.0)); let B=cross(N,T); return normalize(N+T*dx+B*dy); }
fn flatBump(N:vec3f,dx:f32,dz:f32)->vec3f{ return normalize(N+vec3f(dx,0.0,dz)); }

// ---------- facade ----------
fn facade(i:VO,N:vec3f,V:vec3f,fw:f32)->Surf{
  var s:Surf; s.n=N; s.ao=1.0; s.wet=0.0; s.coat=0.0; s.wrap=0.0; s.metal=0.0; s.em=vec3f(0.0);
  let style=i.col.a; let base=i.col.rgb; let on=i.on; let seed=i.mat.z;
  if(on.y>0.5){ // roof
    let g=noise2(i.wp.xz*3.0); s.alb=vec3f(0.08,0.08,0.085)*(0.7+0.6*g); s.rough=0.85; return s; }
  if(on.y<-0.5){ s.alb=base*0.3; s.rough=0.9; return s; }
  var u=select(i.lp.x*sign(on.z),i.lp.z*-sign(on.x),abs(on.x)>0.5);
  let v=i.lp.y+i.sc.y*0.5;
  var fh=3.2; var sp=2.6; var ww=1.15; var wh=1.6; var sill=0.8;
  if(style>2.5&&style<3.5){ fh=3.6; sp=1.5; ww=1.35; wh=3.0; sill=0.3; }
  if(style>5.5){ fh=1.1; sp=1.0; ww=0.98; wh=0.42; sill=0.35; }
  let fl=floor(v/fh); let fv=v-fl*fh;
  let cellU=floor(u/sp+0.5); let x=u-cellU*sp;
  var gw=ww; var gh=wh; var gs=sill;
  if(fl<0.5&&style<5.5&&style!=3.0){ gw=sp*0.78; gh=2.3; gs=0.25; }
  let inWin=abs(x)<gw*0.5 && fv>gs && fv<gs+gh && v<i.sc.y-0.6;
  let edgeX=gw*0.5-abs(x); let edgeY=min(fv-gs,gs+gh-fv);
  let fade=clamp(1.0-fw*6.0,0.0,1.0);
  // wall
  var wall=base; var rough=0.85; var dx=0.0; var dy=0.0;
  let gr=fbm2(vec2f(u,v)*vec2f(0.35,0.5)+seed*20.0);
  if(style<0.5||(style>4.5&&style<5.5)){ // brick
    let bu=u/0.25; let row=floor(v/0.075); let bx=bu+select(0.0,0.5,fract(row*0.5)>0.25);
    let fx=fract(bx); let fy=fract(v/0.075);
    let mortar=(1.0-smoothstep(0.0,0.06,min(fx,1.0-fx)*0.25/0.075))*0.0+ (1.0-smoothstep(0.03,0.09,min(fy,1.0-fy)))*0.5+(1.0-smoothstep(0.01,0.05,min(fx,1.0-fx)))*0.5;
    let bh=hash2(vec2f(floor(bx),row)+seed);
    wall=mix(base*(0.75+0.5*bh),vec3f(0.42,0.4,0.37),clamp(mortar,0.0,1.0)*fade);
    dy=(fy-0.5)*0.0; dx=0.0; rough=0.9;
  } else if(style<1.5){ // plaster
    wall=base*(0.86+0.22*gr); wall*=mix(0.75,1.0,smoothstep(0.0,1.6,v)); rough=0.9;
    let streak=noise2(vec2f(u*3.0,v*0.15))*smoothstep(0.0,0.6,gs+gh-fv+0.0)*0.0; wall*=1.0-streak;
  } else if(style<2.5){ // sandstone blocks
    let bx=u/0.9; let row=floor(v/0.45); let ox=bx+select(0.0,0.5,fract(row*0.5)>0.25);
    let fx=fract(ox); let fy=fract(v/0.45); let j=(1.0-smoothstep(0.0,0.04,min(fx,1.0-fx)))+(1.0-smoothstep(0.0,0.06,min(fy,1.0-fy)));
    wall=base*(0.8+0.35*hash2(vec2f(floor(ox),row)+seed))*(0.85+0.3*gr); wall=mix(wall,wall*0.55,clamp(j,0.0,1.0)*fade); rough=0.88;
  } else if(style<3.5){ // modern red metal grid
    wall=base*(0.9+0.1*gr); rough=0.45; s.metal=0.6;
  } else if(style<4.5){ // white hotel with balcony slabs
    wall=base*(0.9+0.12*gr); rough=0.8;
    if(fv<0.22){ wall=base*1.05; dy=-0.6; }
    if(fv>0.22&&fv<0.5){ s.ao=0.55; }
  } else { // yacht white
    wall=base; rough=0.25; s.coat=0.6;
  }
  // cornice band between floors
  if(style<2.5&&fv<0.16&&fl>0.5){ wall=mix(wall,base*1.15+0.06,0.7); dy=0.5; }
  s.alb=wall; s.rough=rough;
  // grime near ground
  s.alb*=mix(0.55,1.0,smoothstep(0.0,1.2,v));
  if(inWin){
    let fr=0.07;
    if(edgeX<fr||edgeY<fr){ // frame
      s.alb=select(vec3f(0.85,0.84,0.8),vec3f(0.06,0.06,0.07),style>2.5&&style<3.5); s.rough=0.5;
      if(style>2.5&&style<3.5){ s.alb=base*0.6; s.metal=0.5; }
      dx=select(0.0,sign(x)*0.6,edgeX<fr); dy=select(0.0,0.6,edgeY<fr&&fv-gs<fr);
    } else {
      let h=hash2(vec2f(cellU,fl)+seed*13.0);
      let lit=step(1.0-0.62*S.ambTop.w,h);
      // interior: warm room, ceiling lamp falloff, curtain
      let wx=(x/(gw*0.5)); let wy=(fv-gs)/gh;
      var room=mix(vec3f(1.0,0.62,0.3),vec3f(0.8,0.85,1.0),step(0.82,h));
      room*=mix(0.35,1.0,wy)*(1.0-0.5*wx*wx);
      let curt=step(0.6,hash2(vec2f(cellU,fl)+3.1)); let cpos=abs(wx)>0.55-0.2*h;
      if(curt>0.5&&cpos){ room*=vec3f(0.9,0.6,0.45)*(0.8+0.2*sin(wx*40.0)); }
      let env=skyColor(reflect(-V,N));
      let fres=0.05+0.95*pow(1.0-max(dot(N,V),0.0),5.0);
      s.alb=vec3f(0.02); s.rough=0.08;
      s.em=room*lit*1.5*S.ambTop.w*(0.6+0.5*hash2(vec2f(cellU*1.7,fl*3.1))) + env*fres*0.6;
      s.ao=0.6;
      let top=gs+gh-fv; if(top<0.25){ s.em*=mix(0.4,1.0,top/0.25); }
      if(style>2.5&&style<3.5){ let mull=abs(fract((x/gw)*2.0+0.5)-0.5)<0.02; if(mull){ s.alb=base*0.5; s.em=vec3f(0.0); s.metal=0.6; s.rough=0.4; } }
    }
    // sill below window
  } else if(fv<gs&&fv>gs-0.12&&abs(x)<gw*0.5+0.08&&style<2.5){ s.alb=vec3f(0.75,0.73,0.7); dy=0.7; s.rough=0.6; }
  else if(fv<gs&&fv>gs-0.5&&abs(x)<gw*0.5&&style<2.5){ s.ao=0.85; }
  s.n=bump(N,dx*fade,dy*fade);
  return s;
}

@fragment fn fs(i:VO,@builtin(front_facing) ff:bool)->@location(0) vec4f{
  let fwW=length(fwidth(i.wp)); let fwL=length(fwidth(i.lp));
  var N=normalize(i.n); if(!ff){ N=-N; }
  let toC=S.camPos.xyz-i.wp; let dist=length(toC); let V=toC/dist;
  let mat=i.mat.x; let t=S.misc.y; let wetG=S.ambBot.w;
  var s:Surf; s.alb=i.col.rgb; s.rough=max(i.mat.y,0.03); s.metal=0.0; s.em=vec3f(0.0); s.n=N; s.ao=1.0; s.wet=0.0; s.coat=0.0; s.wrap=0.0;
  var col=vec3f(0.0); var direct=true;
  if(mat<0.5){ s.metal=i.col.a; }
  else if(mat<1.5){ col=i.col.rgb*i.col.a; direct=false; }
  else if(mat<2.5){ // lava orb
    let q=i.lp/max(i.sc.x,0.01)*2.6+vec3f(0.0,t*0.25,i.mat.z*10.0);
    let f=fbm3(q); let veins=pow(1.0-abs(f*2.0-1.0),8.0);
    let fres=pow(1.0-max(dot(N,V),0.0),2.0);
    let crust=smoothstep(0.42,0.62,fbm3(q*1.7+3.0));
    var c=mix(vec3f(2.6,0.9,0.18),vec3f(0.35,0.05,0.01),crust);
    c+=vec3f(6.0,2.6,0.6)*veins+vec3f(2.6,0.8,0.15)*fres;
    col=c*i.col.a; direct=false;
  }
  else if(mat<3.5){ // water
    let w=i.wp.xz;
    var g=vec2f(0.0);
    g+=vec2f(cos(w.x*0.21+w.y*0.05+t*0.9),0.0)*0.9; g+=vec2f(0.0,cos(w.y*0.33-w.x*0.11+t*1.2))*0.7;
    g+=vec2f(cos(dot(w,vec2f(0.7,0.5))*1.3+t*1.9),cos(dot(w,vec2f(-0.4,0.8))*1.7+t*2.3))*0.35;
    g+=(vec2f(noise2(w*1.8+t*0.6),noise2(w*1.8-t*0.5+5.0))-0.5)*0.7;
    let fade=clamp(1.0-fwW*0.8,0.15,1.0);
    let Nw=normalize(vec3f(g.x*0.08*fade,1.0,g.y*0.08*fade));
    let R=reflect(-V,Nw); var rc=skyColor(vec3f(R.x,abs(R.y),R.z));
    let mu=max(dot(R,S.sunDir.xyz),0.0); rc+=S.sunCol.rgb*pow(mu,600.0)*60.0*fade;
    let fr=0.02+0.98*pow(1.0-max(dot(Nw,V),0.0),5.0);
    let deep=i.col.rgb*(hemi(vec3f(0.0,1.0,0.0))*0.6);
    var ws:Surf; ws.alb=vec3f(0.0); ws.rough=0.05; ws.metal=0.0; ws.em=vec3f(0.0); ws.n=Nw; ws.ao=1.0; ws.wet=1.6; ws.coat=0.0; ws.wrap=0.0;
    col=mix(deep,rc,clamp(fr,0.0,1.0))+shade(i.wp,V,ws,1.0)*0.6; direct=false;
  }
  else if(mat<4.5){ s=facade(i,N,V,fwL); }
  else if(mat<5.5){ // pavers / cobbles
    let p=i.wp.xz/vec2f(0.32,0.16); let row=floor(p.y); let px=vec2f(p.x+select(0.0,0.5,fract(row*0.5)>0.25),p.y);
    let f=fract(px); let id=floor(px); let e=min(min(f.x,1.0-f.x)*0.32,min(f.y,1.0-f.y)*0.16);
    let fade=clamp(1.0-fwW*14.0,0.0,1.0);
    let joint=1.0-smoothstep(0.0,0.022,e); let hv=hash2(id);
    s.alb=i.col.rgb*(0.7+0.55*hv)*mix(1.0,0.35,joint*fade);
    let puddle=smoothstep(0.55,0.62,fbm2(i.wp.xz*0.18)+wetG*0.15);
    s.wet=wetG; s.rough=mix(mix(0.6,0.22,wetG),0.03,puddle*wetG);
    let gx=select(0.0,sign(f.x-0.5),min(f.x,1.0-f.x)*0.32<0.03); let gz=select(0.0,sign(f.y-0.5),min(f.y,1.0-f.y)*0.16<0.03);
    s.n=flatBump(N,gx*0.35*fade*(1.0-puddle),gz*0.35*fade*(1.0-puddle)); s.ao=mix(1.0,0.5,joint*fade);
    s.alb*=mix(1.0,0.55,wetG*(1.0-joint*0.5));
  }
  else if(mat<6.5){ col=vec3f(0.0); direct=false; } // transparent glass handled in fsGlass
  else if(mat<7.5){ // asphalt
    let fade=clamp(1.0-fwW*4.0,0.0,1.0);
    let ag=noise2(i.wp.xz*9.0)*fade; let pch=fbm2(i.wp.xz*0.08);
    let crack=(1.0-smoothstep(0.0,0.025,abs(fbm2(i.wp.xz*0.35)-0.5)))*smoothstep(0.5,0.7,pch);
    s.alb=i.col.rgb*(0.75+0.5*ag)*(0.85+0.3*pch)*(1.0-crack*0.6);
    let track=exp(-pow((fract((i.wp.x+0.8)/3.2)-0.5)*3.2/0.5,2.0));
    let puddle=smoothstep(0.58,0.66,fbm2(i.wp.xz*0.11+vec2f(3.0,1.0))+wetG*0.12);
    s.wet=max(wetG,0.35); s.rough=mix(mix(0.75,0.35,wetG),0.03,puddle*max(wetG,0.3))*(1.0-track*0.15);
    s.alb*=mix(1.0,0.5,wetG);
    s.n=flatBump(N,(ag-0.5)*0.04*(1.0-puddle),(noise2(i.wp.zx*9.0)-0.5)*0.04*fade*(1.0-puddle));
  }
  else if(mat<8.5){ // car paint with metallic flakes + clearcoat
    let fl=hash3(floor(i.wp*420.0)); let fade=clamp(1.0-fwW*60.0,0.0,1.0);
    s.alb=i.col.rgb*(1.0+(fl-0.5)*0.35*fade*i.col.a); s.metal=0.45*i.col.a; s.coat=1.0; s.rough=max(i.mat.y,0.18);
  }
  else if(mat<9.5){ // decal from atlas
    let slot=i.mat.w; let cell=vec2f(slot%4.0,floor(slot/4.0));
    let uv=(cell+clamp(i.uv,vec2f(0.002),vec2f(0.998)))/vec2f(4.0,8.0);
    let tx=textureSampleLevel(atlas,linSmp,uv,0.0);
    if(tx.a<0.5){ discard; }
    s.alb=tx.rgb*i.col.rgb; s.rough=0.5; s.em=tx.rgb*i.col.a;
  }
  else if(mat<10.5){ // tyre
    let ang=atan2(i.lp.y,i.lp.z); let radial=abs(i.on.x)<0.6;
    let groove=select(0.0,step(0.85,fract(ang*9.55)),radial)+select(0.0,step(0.88,fract(i.lp.x/max(i.sc.x,0.01)*4.0+0.5)),radial);
    s.alb=vec3f(0.035)*(1.0-0.5*clamp(groove,0.0,1.0)); s.rough=0.85;
  }
  else if(mat<11.5){ // foliage
    let g=noise3(i.wp*2.2); s.alb=i.col.rgb*(0.6+0.8*g); s.rough=0.7; s.wrap=0.6;
    let back=pow(max(dot(-V,S.sunDir.xyz),0.0),4.0); s.em=i.col.rgb*S.sunCol.rgb*back*0.25*shadowAt(i.wp,N);
  }
  else if(mat<12.5){ // opaque glass (car windows, shop glass)
    let R=reflect(-V,N); let fres=0.04+0.96*pow(1.0-max(dot(N,V),0.0),5.0);
    s.alb=i.col.rgb; s.rough=0.05; s.em=skyColor(R)*fres*0.9;
  }
  else if(mat<13.5){ // stone / rock / concrete
    let q=i.wp*vec3f(0.6,0.9,0.6); let f=fbm3(q); let f2=noise3(q*4.0);
    s.alb=i.col.rgb*(0.6+0.7*f)*(0.85+0.3*f2); s.rough=0.9;
    let dx=noise3(q*2.0+vec3f(0.3,0.0,0.0))-noise3(q*2.0-vec3f(0.3,0.0,0.0)); let dy=noise3(q*2.0+vec3f(0.0,0.3,0.0))-noise3(q*2.0-vec3f(0.0,0.3,0.0));
    s.n=bump(N,dx*1.5,dy*1.5);
  }
  else if(mat<14.5){ s.wrap=0.45; s.rough=0.55; } // skin
  else { // rusted metal (blast furnace)
    let f=fbm3(i.wp*vec3f(0.8,1.6,0.8)); let rust=smoothstep(0.42,0.7,f);
    s.alb=mix(i.col.rgb,vec3f(0.32,0.12,0.05),rust); s.metal=mix(0.7,0.1,rust); s.rough=mix(0.45,0.9,rust);
    let band=step(0.92,fract(i.wp.y*0.8)); s.alb*=1.0-band*0.4; s.ao=1.0-band*0.4;
  }
  if(direct){ let sh=shadowAt(i.wp,N); col=shade(i.wp,V,s,sh); }
  // atmosphere: distance + height fog tinted by sky in view direction
  let fogD=S.skyHor.w;
  let hz=exp(-max(i.wp.y,0.0)*0.045);
  let f=1.0-exp(-dist*fogD*mix(0.55,1.0,hz));
  col=mix(col,skyColor(-V)*0.92,clamp(f,0.0,0.985));
  return vec4f(col,1.0);
}
@fragment fn fsGlass(i:VO,@builtin(front_facing) ff:bool)->@location(0) vec4f{
  var N=normalize(i.n); if(!ff){ N=-N; }
  let toC=S.camPos.xyz-i.wp; let dist=length(toC); let V=toC/dist;
  let R=reflect(-V,N); let nv=max(dot(N,V),0.0); let fres=0.06+0.94*pow(1.0-nv,5.0);
  var refl=skyColor(R)*fres;
  let L=S.sunDir.xyz; let H=normalize(L+V); refl+=S.sunCol.rgb*shadowAt(i.wp,N)*Dggx(max(dot(N,H),0.0),0.01)*0.04*max(dot(N,L),0.0);
  let cnt=i32(S.misc.x);
  for(var k=0;k<${NL};k++){ if(k>=cnt){ break; } let lc=S.lightCol[k]; var Lp=S.lightPos[k].xyz-i.wp; let d=length(Lp); if(d>lc.w){ continue; } Lp/=d;
    let Hp=normalize(Lp+V); refl+=lc.rgb*0.04*Dggx(max(dot(N,Hp),0.0),0.01)*max(dot(N,Lp),0.0)/(d*d+0.6); }
  let a=clamp(mix(i.col.a,1.0,fres),0.0,1.0);
  var col=i.col.rgb*hemi(N)*a+refl;
  let f=1.0-exp(-dist*S.skyHor.w); col=mix(col,skyColor(-V)*0.92*a,clamp(f,0.0,0.985));
  return vec4f(col,a);
}`;

const WGSL_SKY=WGSL_COMMON+/* wgsl */`
struct VO{ @builtin(position) pos:vec4f, @location(0) ndc:vec2f };
@vertex fn vs(@builtin(vertex_index) vi:u32)->VO{ var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3)); var o:VO; o.pos=vec4f(p[vi],1.0,1.0); o.ndc=p[vi]; return o; }
@fragment fn fs(i:VO)->@location(0) vec4f{
  let d=normalize(S.camFwd.xyz+S.camRight.xyz*i.ndc.x*S.camRight.w+S.camUp.xyz*i.ndc.y*S.camUp.w);
  var c=skyColor(d); let t=S.misc.y;
  let sd=S.sunDir.xyz; let mu=dot(d,sd); let ss=S.skyGround.w;
  if(ss>0.0){ let disc=smoothstep(1.0-ss,1.0-ss*0.6,mu); c+=S.sunCol.rgb*disc*12.0; }
  if(d.y>-0.02){
    let sp=d.xz/max(d.y+0.12,0.05);
    let cl=fbm2(sp*0.55+vec2f(t*0.004,0.0)); let cl2=fbm2(sp*1.6+vec2f(t*0.01,3.0));
    let cov=smoothstep(0.5-S.skyTop.w*0.18,0.85,cl*0.75+cl2*0.35)*S.skyTop.w*smoothstep(-0.02,0.2,d.y);
    let lit=S.skyHor.rgb*0.7+S.sunCol.rgb*(0.25+pow(max(mu,0.0),3.0)*0.9)*(0.6+0.6*cl2);
    c=mix(c,lit*0.8+S.skyTop.rgb*0.25,cov*0.9);
    let g=floor(d*480.0); let h=hash3(g);
    let st=step(0.9972,h)*S.sunCol.w*smoothstep(0.02,0.3,d.y)*(1.0-cov)*(0.55+0.45*sin(t*2.0+h*90.0));
    c+=vec3f(st*2.4)*vec3f(0.9,0.95,1.0);
  }
  return vec4f(c,1.0);
}`;

const WGSL_POST=/* wgsl */`
struct VO{ @builtin(position) pos:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) vi:u32)->VO{ var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3)); var o:VO; o.pos=vec4f(p[vi],0.0,1.0); o.uv=vec2f(p[vi].x*0.5+0.5,0.5-p[vi].y*0.5); return o; }
@group(0) @binding(0) var src:texture_2d<f32>;
@group(0) @binding(1) var smp:sampler;
@group(0) @binding(2) var<uniform> P:vec4f;
fn tap(uv:vec2f)->vec3f{ return textureSampleLevel(src,smp,uv,0.0).rgb; }
@fragment fn down(i:VO)->@location(0) vec4f{
  let t=P.xy; let uv=i.uv;
  let a=tap(uv+t*vec2f(-2,-2)); let b=tap(uv+t*vec2f(0,-2)); let c=tap(uv+t*vec2f(2,-2));
  let d=tap(uv+t*vec2f(-2,0)); let e=tap(uv); let f=tap(uv+t*vec2f(2,0));
  let g=tap(uv+t*vec2f(-2,2)); let h=tap(uv+t*vec2f(0,2)); let k=tap(uv+t*vec2f(2,2));
  let j=tap(uv+t*vec2f(-1,-1)); let l=tap(uv+t*vec2f(1,-1)); let m=tap(uv+t*vec2f(-1,1)); let n=tap(uv+t*vec2f(1,1));
  var o=e*0.125+(a+c+g+k)*0.03125+(b+d+f+h)*0.0625+(j+l+m+n)*0.125;
  if(P.w>0.5){ let br=max(o.r,max(o.g,o.b)); let kn=P.z*0.5; var rq=clamp(br-P.z+kn,0.0,2.0*kn); rq=rq*rq/(4.0*kn+1e-4);
    let w=max(rq,br-P.z)/max(br,1e-4); o=min(o*w,vec3f(30.0)); }
  return vec4f(o,1.0);
}
@fragment fn up(i:VO)->@location(0) vec4f{
  let t=P.xy*P.z; let uv=i.uv;
  let o=tap(uv)*4.0+(tap(uv+vec2f(-t.x,0))+tap(uv+vec2f(t.x,0))+tap(uv+vec2f(0,-t.y))+tap(uv+vec2f(0,t.y)))*2.0
    +tap(uv+vec2f(-t.x,-t.y))+tap(uv+vec2f(t.x,-t.y))+tap(uv+vec2f(-t.x,t.y))+tap(uv+vec2f(t.x,t.y));
  return vec4f(o/16.0*P.w,1.0);
}`;
const WGSL_COMP=/* wgsl */`
struct VO{ @builtin(position) pos:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) vi:u32)->VO{ var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3)); var o:VO; o.pos=vec4f(p[vi],0.0,1.0); o.uv=vec2f(p[vi].x*0.5+0.5,0.5-p[vi].y*0.5); return o; }
@group(0) @binding(0) var hdr:texture_2d<f32>;
@group(0) @binding(1) var blm:texture_2d<f32>;
@group(0) @binding(2) var smp:sampler;
@group(0) @binding(3) var<uniform> C:array<vec4f,3>; // [exposure,bloom,flash,fade] [time,saturation,grain,chromatic] [tint rgb, vignette]
fn aces(x:vec3f)->vec3f{
  let m1=mat3x3f(vec3f(0.59719,0.07600,0.02840),vec3f(0.35458,0.90834,0.13383),vec3f(0.04823,0.01566,0.83777));
  let m2=mat3x3f(vec3f(1.60475,-0.10208,-0.00327),vec3f(-0.53108,1.10813,-0.07276),vec3f(-0.07367,-0.00605,1.07602));
  let v=m1*x; let a=v*(v+0.0245786)-0.000090537; let b=v*(0.983729*v+0.4329510)+0.238081; return clamp(m2*(a/b),vec3f(0.0),vec3f(1.0)); }
@fragment fn fs(i:VO)->@location(0) vec4f{
  let uv=i.uv; let cc=uv-0.5; let r2=dot(cc,cc); let ca=C[1].w*r2;
  let h=vec3f(textureSampleLevel(hdr,smp,uv-cc*ca,0.0).r,textureSampleLevel(hdr,smp,uv,0.0).g,textureSampleLevel(hdr,smp,uv+cc*ca,0.0).b);
  let b=textureSampleLevel(blm,smp,uv,0.0).rgb;
  var col=(h+b*C[0].y)*C[0].x*C[2].rgb;
  col+=vec3f(1.0,0.12,0.05)*C[0].z*(0.3+r2*3.0);
  col=aces(col);
  let l=dot(col,vec3f(0.2126,0.7152,0.0722)); col=mix(vec3f(l),col,C[1].y);
  col*=1.0-C[2].w*smoothstep(0.12,0.8,r2*1.7);
  col=pow(max(col,vec3f(0.0)),vec3f(1.0/2.2));
  let gn=fract(sin(dot(uv*vec2f(1931.0,1097.0)+C[1].x*61.0,vec2f(12.9898,78.233)))*43758.5453)-0.5;
  col+=gn*C[1].z; col*=1.0-C[0].w;
  return vec4f(col,1.0);
}`;
