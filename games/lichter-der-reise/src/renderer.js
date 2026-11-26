/* ===== WebGPU renderer: shadow map, HDR forward pass (4x MSAA), transparent glass, bloom chain, ACES composite ===== */
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, smooth=t=>t*t*(3-2*t);
function perspective(out,fovy,aspect,near,far){const f=1/Math.tan(fovy/2);out.fill(0);out[0]=f/aspect;out[5]=f;out[10]=far/(near-far);out[11]=-1;out[14]=near*far/(near-far);return out}
function ortho(out,l,r,b,t,n,f){out.fill(0);out[0]=2/(r-l);out[5]=2/(t-b);out[10]=1/(n-f);out[12]=-(r+l)/(r-l);out[13]=-(t+b)/(t-b);out[14]=n/(n-f);out[15]=1;return out}
function lookAt(out,e,c,u){let zx=e[0]-c[0],zy=e[1]-c[1],zz=e[2]-c[2];let l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;
  let xx=u[1]*zz-u[2]*zy,xy=u[2]*zx-u[0]*zz,xz=u[0]*zy-u[1]*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;
  const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
  out[0]=xx;out[1]=yx;out[2]=zx;out[3]=0;out[4]=xy;out[5]=yy;out[6]=zy;out[7]=0;out[8]=xz;out[9]=yz;out[10]=zz;out[11]=0;
  out[12]=-(xx*e[0]+xy*e[1]+xz*e[2]);out[13]=-(yx*e[0]+yy*e[1]+yz*e[2]);out[14]=-(zx*e[0]+zy*e[1]+zz*e[2]);out[15]=1;return [xx,xy,xz,yx,yy,yz,-zx,-zy,-zz]}
function mul(out,a,b){for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+j]*b[i*4+k];out[i*4+j]=s}return out}
function xform(m,x,y,z){ return [m[0]*x+m[4]*y+m[8]*z+m[12], m[1]*x+m[5]*y+m[9]*z+m[13], m[2]*x+m[6]*y+m[10]*z+m[14]]; }

let MESHIDX={}; const MESHES=[]; const MODEL_GROUPS={};
/* Blender models (blender/models.py -> assets/models.bin, embedded as base64 by build.py) */
function decodeModels(){ const out={}; if(typeof MODELS_B64==='undefined') return out;
  const raw=atob(MODELS_B64); const bin=new Uint8Array(raw.length); for(let i=0;i<raw.length;i++) bin[i]=raw.charCodeAt(i);
  const dv=new DataView(bin.buffer); const hl=dv.getUint32(0,true); const meta=JSON.parse(new TextDecoder().decode(bin.subarray(4,4+hl))); const base=4+hl;
  for(const m of meta){ const mb=new MB(); let o=base+m.vo;
    for(let i=0;i<m.nv;i++,o+=12){ mb.v.push(m.lo[0]+dv.getUint16(o,true)*m.sc[0],m.lo[1]+dv.getUint16(o+2,true)*m.sc[1],m.lo[2]+dv.getUint16(o+4,true)*m.sc[2],dv.getInt8(o+8)/127,dv.getInt8(o+9)/127,dv.getInt8(o+10)/127,0,0); }
    const io=base+m.io; for(let i=0;i<m.ni;i++) mb.ix.push(m.big?dv.getUint32(io+i*4,true):dv.getUint16(io+i*2,true));
    const key=m.model+'|'+m.mat; out[key]=mb; (MODEL_GROUPS[m.model]||(MODEL_GROUPS[m.model]=[])).push({key,mat:m.mat}); }
  return out; }
function buildMeshes(){
  const list={ box:meshBox(), quad:meshQuad(), sph:meshSphere(24,16), sphLo:meshSphere(8,6), cylY:meshCylY(24), cylX:meshLathe([[0,-.5],[.5,-.5],[.5,-.5],[.5,.5],[.5,.5],[0,.5]],24,'x'),
    cone:meshCone(24), gable:meshGable(), rbox:meshRBox(.5,.5,.5,.14,3),
    yHull:meshLoft([{z:-15,w:.12,yb:2.2,yt:3.9,e:2.5,tw:1},{z:-13.6,w:1.1,yb:.9,yt:3.7,e:3,tw:1},{z:-10,w:2.1,yb:.1,yt:3.4,e:4,tw:1},{z:-3,w:2.5,yb:-.4,yt:3.2,e:5,tw:1},{z:8,w:2.5,yb:-.4,yt:3.2,e:6,tw:1},{z:14.2,w:2.3,yb:.2,yt:3.2,e:7,tw:1},{z:15,w:2.2,yb:.6,yt:3.15,e:8,tw:1}],28),
    ...carMeshes(), ...decodeModels() };
  for(const k in list){ MESHIDX[k]=MESHES.length; MESHES.push({key:k,m:list[k]}); }
}
const R={ device:null, ctx:null, fmt:'bgra8unorm', W:1, H:1, scale:1, maxScale:1, needResize:true, ok:false };
const MAXI=48000;
const lists=[]; // per mesh: {op:Float32Array, nop, gl:Float32Array, ngl}
function P(m,x,y,z,ry,sx,sy,sz,mat,r,g,b,p,rx=0,rz=0,slot=0){ const L=lists[m]; const glass=mat>=6&&mat<7; const a=glass?L.gl:L.op; let n=glass?L.ngl:L.nop; if(n>=(glass?400:8000)) return;
  const o=n*16; a[o]=x;a[o+1]=y;a[o+2]=z;a[o+3]=ry;a[o+4]=sx;a[o+5]=sy;a[o+6]=sz;a[o+7]=mat;a[o+8]=r;a[o+9]=g;a[o+10]=b;a[o+11]=p;a[o+12]=rx;a[o+13]=rz;a[o+14]=slot;a[o+15]=0;
  if(glass) L.ngl=n+1; else L.nop=n+1; }
let lightsTmp=[]; function Lt(x,y,z,r,g,b,rad){ lightsTmp.push([x,y,z,r,g,b,rad,0]); }

async function initGPU(canvas){
  if(!navigator.gpu) throw new Error('nogpu');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'}); if(!adapter) throw new Error('noadapter');
  const device=R.device=await adapter.requestDevice();
  device.lost.then(info=>{ if(info.reason!=='destroyed') onDeviceLost(info); });
  R.ctx=canvas.getContext('webgpu'); R.fmt=navigator.gpu.getPreferredCanvasFormat();
  R.ctx.configure({device,format:R.fmt,alphaMode:'opaque',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
  buildMeshes();
  R.mesh=MESHES.map(({m})=>{ const vb=device.createBuffer({size:m.v.length*4,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}); device.queue.writeBuffer(vb,0,new Float32Array(m.v));
    const big=m.n>65535; const ia=big?new Uint32Array(m.ix):new Uint16Array(Math.ceil(m.ix.length/2)*2); if(!big) ia.set(m.ix);
    const ib=device.createBuffer({size:ia.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST}); device.queue.writeBuffer(ib,0,ia); return {vb,ib,n:m.ix.length,fmt:big?'uint32':'uint16'}; });
  for(let i=0;i<MESHES.length;i++) lists.push({op:new Float32Array(8000*16),nop:0,gl:new Float32Array(400*16),ngl:0});
  R.lin=device.createSampler({magFilter:'linear',minFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
  R.cmp=device.createSampler({compare:'less',magFilter:'linear',minFilter:'linear'});
  R.sceneBuf=device.createBuffer({size:336*4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  R.instBuf=device.createBuffer({size:MAXI*64,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
  R.compBuf=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  R.shadowSize=2048; R.shadow=device.createTexture({size:[R.shadowSize,R.shadowSize],format:'depth32float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  // atlas
  R.atlas=device.createTexture({size:[ATLAS_W,ATLAS_H],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});
  let px=null; try{ px=buildAtlas(); }catch(e){ console.warn('atlas',e); }
  if(px) device.queue.writeTexture({texture:R.atlas},px,{bytesPerRow:ATLAS_W*4},[ATLAS_W,ATLAS_H]);
  else device.queue.writeTexture({texture:R.atlas},new Uint8Array(ATLAS_W*ATLAS_H*4).fill(255),{bytesPerRow:ATLAS_W*4},[ATLAS_W,ATLAS_H]);
  const mods={scene:WGSL_SCENE,sky:WGSL_SKY,post:WGSL_POST,comp:WGSL_COMP}, M={};
  for(const k in mods){ M[k]=device.createShaderModule({code:mods[k]}); if(M[k].getCompilationInfo){ const info=await M[k].getCompilationInfo(); for(const msg of info.messages) if(msg.type==='error') throw new Error('WGSL '+k+': '+msg.message+' @'+msg.lineNum+':'+msg.linePos); } }
  const VS=GPUShaderStage.VERTEX, FS=GPUShaderStage.FRAGMENT;
  const bgl=device.createBindGroupLayout({entries:[{binding:0,visibility:VS|FS,buffer:{type:'uniform'}},{binding:1,visibility:VS,buffer:{type:'read-only-storage'}},
    {binding:2,visibility:FS,texture:{sampleType:'depth'}},{binding:3,visibility:FS,sampler:{type:'comparison'}},{binding:4,visibility:FS,texture:{sampleType:'float'}},{binding:5,visibility:FS,sampler:{type:'filtering'}}]});
  const bglS=device.createBindGroupLayout({entries:[{binding:0,visibility:VS|FS,buffer:{type:'uniform'}},{binding:1,visibility:VS,buffer:{type:'read-only-storage'}}]});
  const vbuf=[{arrayStride:32,attributes:[{shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'},{shaderLocation:2,offset:24,format:'float32x2'}]}];
  const HDR='rgba16float', MS=4;
  device.pushErrorScope('validation');
  const lay=device.createPipelineLayout({bindGroupLayouts:[bgl]});
  R.pScene=device.createRenderPipeline({layout:lay,vertex:{module:M.scene,entryPoint:'vs',buffers:vbuf},fragment:{module:M.scene,entryPoint:'fs',targets:[{format:HDR}]},
    primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less'},multisample:{count:MS}});
  R.pGlass=device.createRenderPipeline({layout:lay,vertex:{module:M.scene,entryPoint:'vs',buffers:vbuf},fragment:{module:M.scene,entryPoint:'fsGlass',targets:[{format:HDR,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},
    primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth24plus',depthWriteEnabled:false,depthCompare:'less'},multisample:{count:MS}});
  R.pShadow=device.createRenderPipeline({layout:device.createPipelineLayout({bindGroupLayouts:[bglS]}),vertex:{module:M.scene,entryPoint:'vsShadow',buffers:[{arrayStride:32,attributes:[{shaderLocation:0,offset:0,format:'float32x3'}]}]},
    primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth32float',depthWriteEnabled:true,depthCompare:'less',depthBias:3,depthBiasSlopeScale:2.0,depthBiasClamp:0.01}});
  R.pSky=device.createRenderPipeline({layout:'auto',vertex:{module:M.sky,entryPoint:'vs'},fragment:{module:M.sky,entryPoint:'fs',targets:[{format:HDR}]},primitive:{topology:'triangle-list'},
    depthStencil:{format:'depth24plus',depthWriteEnabled:false,depthCompare:'always'},multisample:{count:MS}});
  R.pDown=device.createRenderPipeline({layout:'auto',vertex:{module:M.post,entryPoint:'vs'},fragment:{module:M.post,entryPoint:'down',targets:[{format:HDR}]},primitive:{topology:'triangle-list'}});
  R.pUp=device.createRenderPipeline({layout:'auto',vertex:{module:M.post,entryPoint:'vs'},fragment:{module:M.post,entryPoint:'up',targets:[{format:HDR,blend:{color:{srcFactor:'one',dstFactor:'one'},alpha:{srcFactor:'one',dstFactor:'one'}}}]},primitive:{topology:'triangle-list'}});
  R.pComp=device.createRenderPipeline({layout:'auto',vertex:{module:M.comp,entryPoint:'vs'},fragment:{module:M.comp,entryPoint:'fs',targets:[{format:R.fmt}]},primitive:{topology:'triangle-list'}});
  const err=await device.popErrorScope(); if(err) throw new Error('Pipeline: '+err.message);
  R.bgScene=device.createBindGroup({layout:bgl,entries:[{binding:0,resource:{buffer:R.sceneBuf}},{binding:1,resource:{buffer:R.instBuf}},{binding:2,resource:R.shadow.createView()},{binding:3,resource:R.cmp},{binding:4,resource:R.atlas.createView()},{binding:5,resource:R.lin}]});
  R.bgShadow=device.createBindGroup({layout:bglS,entries:[{binding:0,resource:{buffer:R.sceneBuf}},{binding:1,resource:{buffer:R.instBuf}}]});
  R.bgSky=device.createBindGroup({layout:R.pSky.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:R.sceneBuf}}]});
  R.canvas=canvas; R.ok=true;
}
const TEX={};
function resizeTargets(){ const d=R.device, c=R.canvas;
  const lim=d.limits.maxTextureDimension2D; R.W=Math.max(1,Math.min(lim,Math.floor(c.clientWidth*R.scale))); R.H=Math.max(1,Math.min(lim,Math.floor(c.clientHeight*R.scale)));
  c.width=R.W; c.height=R.H;
  for(const k in TEX){ const t=TEX[k]; (Array.isArray(t)?t:[t]).forEach(x=>x.destroy()); delete TEX[k]; }
  TEX.msaa=d.createTexture({size:[R.W,R.H],format:'rgba16float',sampleCount:4,usage:GPUTextureUsage.RENDER_ATTACHMENT});
  TEX.depth=d.createTexture({size:[R.W,R.H],format:'depth24plus',sampleCount:4,usage:GPUTextureUsage.RENDER_ATTACHMENT});
  TEX.hdr=d.createTexture({size:[R.W,R.H],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  TEX.mips=[]; let w=R.W,h=R.H; for(let i=0;i<6;i++){ w=Math.max(1,w>>1); h=Math.max(1,h>>1); TEX.mips.push(d.createTexture({size:[w,h],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING})); }
  (R.postBufs||[]).forEach(b=>b.destroy()); R.postBufs=[]; R.down=[]; R.up=[];
  const mk=(pipe,src,vals)=>{ const ub=d.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}); d.queue.writeBuffer(ub,0,new Float32Array(vals)); R.postBufs.push(ub);
    return d.createBindGroup({layout:pipe.getBindGroupLayout(0),entries:[{binding:0,resource:src.createView()},{binding:1,resource:R.lin},{binding:2,resource:{buffer:ub}}]}); };
  let src=TEX.hdr; for(let i=0;i<TEX.mips.length;i++){ R.down.push(mk(R.pDown,src,[1/src.width,1/src.height,1.4,i===0?1:0])); src=TEX.mips[i]; }
  for(let i=TEX.mips.length-1;i>0;i--){ const s=TEX.mips[i]; R.up.push({bg:mk(R.pUp,s,[1/s.width,1/s.height,1.0,1.0]),dst:TEX.mips[i-1]}); }
  R.bgComp=d.createBindGroup({layout:R.pComp.getBindGroupLayout(0),entries:[{binding:0,resource:TEX.hdr.createView()},{binding:1,resource:TEX.mips[0].createView()},{binding:2,resource:R.lin},{binding:3,resource:{buffer:R.compBuf}}]});
  R.needResize=false; }

const sceneF=new Float32Array(336), V16=new Float32Array(16), P16=new Float32Array(16), VP=new Float32Array(16), LV=new Float32Array(16), LP=new Float32Array(16), LVP=new Float32Array(16), compF=new Float32Array(12);
const instAll=new Float32Array(MAXI*16);
/* cam: {pos,tgt,fov}; env: current environment; post: {exposure,bloom,flash,fade,sat,tint,vignette} */
function renderFrame(cam,env,time,post,shadowCenter,snapCb){
  const d=R.device; const c=R.canvas;
  if(R.needResize||Math.abs(c.width-Math.min(d.limits.maxTextureDimension2D,Math.max(1,Math.floor(c.clientWidth*R.scale))))>1) resizeTargets();
  const aspect=R.W/R.H; const fovy=(aspect<1?Math.min(cam.fov*1.35,95):cam.fov)*Math.PI/180;
  const basis=lookAt(V16,cam.pos,cam.tgt,[0,1,0]); perspective(P16,fovy,aspect,0.3,2200); mul(VP,P16,V16);
  // sun shadow camera, snapped to texels
  const sl=Math.hypot(...env.sunDir); const sd=env.sunDir.map(v=>v/sl); const ext=58;
  const sc=shadowCenter; lookAt(LV,[sc[0]+sd[0]*200,sc[1]+sd[1]*200,sc[2]+sd[2]*200],sc,Math.abs(sd[1])>.95?[0,0,1]:[0,1,0]);
  const texel=ext*2/R.shadowSize; const cv=xform(LV,sc[0],sc[1],sc[2]); const snx=Math.round(cv[0]/texel)*texel-cv[0], sny=Math.round(cv[1]/texel)*texel-cv[1];
  ortho(LP,-ext-snx,ext-snx,-ext-sny,ext-sny,10,420); mul(LVP,LP,LV);
  sceneF.set(VP,0); sceneF.set(LVP,16); sceneF.set([...cam.pos,time],32);
  const ty=Math.tan(fovy/2), tx=ty*aspect;
  sceneF.set([basis[0],basis[1],basis[2],tx],36); sceneF.set([basis[3],basis[4],basis[5],ty],40); sceneF.set([basis[6],basis[7],basis[8],0],44);
  sceneF.set([sd[0],sd[1],sd[2],env.shadow],48); sceneF.set([...env.sunCol,env.stars],52); sceneF.set([...env.skyTop,env.clouds],56); sceneF.set([...env.skyHor,env.fog],60);
  sceneF.set([...env.skyGround,env.sunSize],64); sceneF.set([...env.ambTop,env.windows],68); sceneF.set([...env.ambBot,env.wet],72);
  const fx=cam.tgt[0], fz=cam.tgt[2]; const lc=lightsTmp; for(const l of lc) l[7]=Math.hypot(l[0]-fx,(l[2]-fz)*0.7)-l[6]*0.5; lc.sort((a,b)=>a[7]-b[7]); const nL=Math.min(NL,lc.length);
  for(let i=0;i<nL;i++){ const l=lc[i]; sceneF.set([l[0],l[1],l[2],0],80+i*4); sceneF.set([l[3],l[4],l[5],l[6]],208+i*4); }
  sceneF.set([nL,time,1/R.shadowSize,0],76);
  d.queue.writeBuffer(R.sceneBuf,0,sceneF);
  // pack instances
  let off=0; const opF=[], glF=[];
  for(let m=0;m<lists.length;m++){ const L=lists[m]; opF.push(off); if(L.nop&&off+L.nop<=MAXI){ instAll.set(L.op.subarray(0,L.nop*16),off*16); off+=L.nop; } }
  for(let m=0;m<lists.length;m++){ const L=lists[m]; glF.push(off); if(L.ngl&&off+L.ngl<=MAXI){ instAll.set(L.gl.subarray(0,L.ngl*16),off*16); off+=L.ngl; } }
  if(off) d.queue.writeBuffer(R.instBuf,0,instAll,0,off*16);
  compF.set([post.exposure,post.bloom,post.flash,post.fade, time,post.sat,0.018,0.01, post.tint[0],post.tint[1],post.tint[2],post.vignette]);
  d.queue.writeBuffer(R.compBuf,0,compF);
  const enc=d.createCommandEncoder();
  const drawList=(pass,glass)=>{ for(let m=0;m<lists.length;m++){ const L=lists[m]; const n=glass?L.ngl:L.nop; if(!n)continue; const me=R.mesh[m]; pass.setVertexBuffer(0,me.vb); pass.setIndexBuffer(me.ib,me.fmt); pass.drawIndexed(me.n,n,0,0,glass?glF[m]:opF[m]); } };
  // shadow
  const sp=enc.beginRenderPass({colorAttachments:[],depthStencilAttachment:{view:R.shadow.createView(),depthLoadOp:'clear',depthStoreOp:'store',depthClearValue:1}});
  if(env.shadow>0.01){ sp.setPipeline(R.pShadow); sp.setBindGroup(0,R.bgShadow); drawList(sp,false); } sp.end();
  // scene
  const pass=enc.beginRenderPass({colorAttachments:[{view:TEX.msaa.createView(),resolveTarget:TEX.hdr.createView(),loadOp:'clear',storeOp:'discard',clearValue:{r:0,g:0,b:0,a:1}}],
    depthStencilAttachment:{view:TEX.depth.createView(),depthLoadOp:'clear',depthStoreOp:'discard',depthClearValue:1}});
  pass.setPipeline(R.pSky); pass.setBindGroup(0,R.bgSky); pass.draw(3);
  pass.setPipeline(R.pScene); pass.setBindGroup(0,R.bgScene); drawList(pass,false);
  pass.setPipeline(R.pGlass); pass.setBindGroup(0,R.bgScene); drawList(pass,true);
  pass.end();
  for(let i=0;i<TEX.mips.length;i++){ const p=enc.beginRenderPass({colorAttachments:[{view:TEX.mips[i].createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]}); p.setPipeline(R.pDown); p.setBindGroup(0,R.down[i]); p.draw(3); p.end(); }
  for(const u of R.up){ const p=enc.beginRenderPass({colorAttachments:[{view:u.dst.createView(),loadOp:'load',storeOp:'store'}]}); p.setPipeline(R.pUp); p.setBindGroup(0,u.bg); p.draw(3); p.end(); }
  const cur=R.ctx.getCurrentTexture();
  const fp=enc.beginRenderPass({colorAttachments:[{view:cur.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]}); fp.setPipeline(R.pComp); fp.setBindGroup(0,R.bgComp); fp.draw(3); fp.end();
  let snap=null;
  if(snapCb){ const bpr=Math.ceil(R.W*4/256)*256; snap={buf:d.createBuffer({size:bpr*R.H,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),bpr,w:R.W,h:R.H};
    enc.copyTextureToBuffer({texture:cur},{buffer:snap.buf,bytesPerRow:bpr},[R.W,R.H]); }
  d.queue.submit([enc.finish()]);
  if(snap) snap.buf.mapAsync(GPUMapMode.READ).then(()=>{ snapCb({data:new Uint8Array(snap.buf.getMappedRange().slice(0)),bpr:snap.bpr,w:snap.w,h:snap.h,fmt:R.fmt}); snap.buf.destroy(); });
  // reset lists
  for(const L of lists){ L.nop=0; L.ngl=0; } lightsTmp.length=0;
}
