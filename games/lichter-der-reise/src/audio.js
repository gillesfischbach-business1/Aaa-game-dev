/* ===== Audio: loop-based engines, natural ambience, reverb, mixer =====
   Engines work the way racing games do it: for every engine a set of seamless loops is prepared once, at fixed engine speeds,
   each in an on-throttle and an off-throttle version. While driving the loops are only played back: their pitch follows the
   rev counter and neighbouring loops are cross-faded by rpm and by load. Nothing is computed per sample at run time, so the
   sound stays clean on phones.
   The loops themselves are built from the physics of a four-stroke engine by inverse FFT (band-limited, no aliasing):
   harmonics of the firing frequency shaped by exhaust resonances, weaker half-orders from uneven cylinders, and intake and
   exhaust noise that pulses with the firing. All loops of one engine share the same phases and start together, so
   cross-fades do not cancel. */
const ENGINE_SPEC={
 // cyl, loop rpm points, exhaust formants [Hz, gain, width], harmonic roll-off [on-load, off-load], cylinder unevenness, noise level [on, off], noise band, level
 fidele:{cyl:4,pts:[850,1350,2000,2800,3700,4600],form:[[105,.6,55],[250,1,110],[600,.95,230],[1400,.5,520],[2600,.18,900]],roll:[.95,1.5],rough:.34,noise:[.16,.07],band:[1100,3600],clatter:.55,wobble:.014,gain:.62},
 petrol:{cyl:4,pts:[800,1500,2400,3400,4500,5600,6400],form:[[165,.55,75],[400,1,170],[900,.9,340],[2100,.5,750],[3800,.16,1200]],roll:[.8,1.4],rough:.1,noise:[.09,.035],band:[700,4400],clatter:0,wobble:.005,gain:.52},
 // 4.0 l twin-turbo flat-plane V8 behind the cabin, 7000 rpm limit. Road tests describe it as mechanical and purposeful rather than sonorous:
 // a coarse lower end, a lot of turbo noise over a muted exhaust, and an audible whine from the electric motors
 smaragd:{cyl:8,flat:true,flatGain:3.3,pts:[1100,1900,2800,3800,4800,5800,6500,7000],form:[[120,.7,70],[260,1,120],[560,.95,220],[1150,.8,420],[2300,.42,800],[4200,.1,1200]],roll:[.86,1.42],rough:.24,noise:[.17,.07],band:[700,4200],clatter:0,wobble:.006,gain:.56} };
const LOOP_SR=22050, LOOP_N=16384;
function fftInverse(re,im){ const n=re.length; // in-place radix-2, returns the real signal in re
  for(let i=1,j=0;i<n;i++){ let b=n>>1; for(;j&b;b>>=1) j^=b; j^=b; if(i<j){ let t=re[i]; re[i]=re[j]; re[j]=t; t=im[i]; im[i]=im[j]; im[j]=t; } }
  for(let len=2;len<=n;len<<=1){ const ang=2*Math.PI/len, wr=Math.cos(ang), wi=Math.sin(ang);
    for(let i=0;i<n;i+=len){ let cr=1, ci=0; for(let k=0;k<len/2;k++){ const a=i+k, b=a+len/2; const xr=re[b]*cr-im[b]*ci, xi=re[b]*ci+im[b]*cr; re[b]=re[a]-xr; im[b]=im[a]-xi; re[a]+=xr; im[a]+=xi; const t=cr*wr-ci*wi; ci=cr*wi+ci*wr; cr=t; } } } }
function engineLoop(ctx,S,rpm,load,seed){ const N=LOOP_N, re=new Float32Array(N), im=new Float32Array(N); let sd=seed>>>0; const rnd=()=>{ sd=(sd*1664525+1013904223)>>>0; return sd/4294967296; };
  const K=Math.max(1,Math.round(rpm/120*N/LOOP_SR)), fc=K*LOOP_SR/N; // whole engine cycles per loop -> seamless
  const form=f=>{ let g=.05; for(const [f0,a,w] of S.form){ const d=(f-f0)/w; g+=a*Math.exp(-d*d); } return g; };
  const put=(bin,a,ph)=>{ if(bin<1||bin>=N/2) return; const r=a*Math.cos(ph), q=a*Math.sin(ph); re[bin]+=r; im[bin]+=q; re[N-bin]+=r; im[N-bin]-=q; };
  const roll=S.roll[load?0:1], bright=load?1:.55;
  for(let h=1;h*fc<9000;h++){ const f=h*fc, n=h/S.cyl, firing=h%S.cyl===0; const ph=rnd()*6.283*(firing&&n<=3?.3:1); // the phase depends only on h: equal in every loop of this engine
    let a=1/Math.pow(Math.max(n,.5),roll); if(!firing) a*=S.rough*((S.flat&&h%(S.cyl/2)===0)?(S.flatGain||2.4):1)*(load?1:1.3);
    a*=form(f)*(f>1200?bright:1); put(h*K,a,ph); }
  fftInverse(re,im); const tone=re.slice();
  // noise: band-limited, pulsing with the firing (intake and exhaust), plus injector clatter for the diesel
  re.fill(0); im.fill(0); const b0=Math.round(S.band[0]*N/LOOP_SR), b1=Math.round(S.band[1]*N/LOOP_SR);
  for(let b=b0;b<b1;b++){ const f=b*LOOP_SR/N, sh=Math.sin(Math.PI*(b-b0)/(b1-b0)); put(b,sh*(.6+.8*rnd())/Math.sqrt(f/1000),rnd()*6.283); }
  fftInverse(re,im); let tr=0, nr=0; for(let i=0;i<N;i++){ const ph=2*Math.PI*S.cyl*K*i/N; const m=S.clatter?Math.pow(.5+.5*Math.cos(ph),6)*S.clatter*3+.25:.55+.45*Math.cos(ph+1.1); re[i]*=m; tr+=tone[i]*tone[i]; nr+=re[i]*re[i]; }
  tr=Math.sqrt(tr/N)||1; nr=Math.sqrt(nr/N)||1; const nl=S.noise[load?0:1]*(.6+.4*Math.min(1,rpm/4000));
  const buf=ctx.createBuffer(1,N,LOOP_SR), d=buf.getChannelData(0); let pk=0; for(let i=0;i<N;i++){ const v=tone[i]/tr*.2*(load?1:.62)+re[i]/nr*.2*nl; d[i]=v; if(Math.abs(v)>pk) pk=Math.abs(v); }
  if(pk>.9) for(let i=0;i<N;i++) d[i]*=.9/pk;
  return {buf,rpm:fc*120}; }
const PETROL={idle:800,red:6400,ratios:[3.6,2.1,1.4,1.05,.82,.66],final:3.9,wheel:.33,up:5400,down:1700};
const GEARS={ kompakt:PETROL, limo:PETROL, suv:PETROL, petrol:PETROL, fidele:{idle:850,red:4600,ratios:[3.8,2.2,1.45,1.05,.8],final:4.1,wheel:.3,up:3800,down:1500},
              smaragd:{idle:1100,red:7000,ratios:[3.4,2.6,2.0,1.6,1.3,1.05,.85,.68],final:3.6,wheel:.36,up:6600,down:2400} };
const Audio_={ ctx:null, muted:false, vol:{master:.85,music:.45,engine:.8,fx:.8,amb:.6}, eng:{}, gear:1, rpm:850, shiftT:0, mood:0, musicOn:false, nextNote:0, step:0,
 init(){ if(this.ctx) return; try{ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return; const c=this.ctx=new AC({latencyHint:'interactive'});
   this.comp=c.createDynamicsCompressor(); this.comp.threshold.value=-12; this.comp.ratio.value=3; { const mk=c.createGain(); mk.gain.value=1.6; const lim=c.createDynamicsCompressor(); lim.threshold.value=-2; lim.knee.value=2; lim.ratio.value=20; lim.attack.value=.002; lim.release.value=.08; this.comp.connect(mk); mk.connect(lim); lim.connect(c.destination); this.out=lim; }
   this.master=c.createGain(); this.master.connect(this.comp);
   // synthetic room impulse for natural reverb (decaying stereo noise)
   const len=c.sampleRate*2.4, ir=c.createBuffer(2,len,c.sampleRate); for(let ch=0;ch<2;ch++){ const d=ir.getChannelData(ch); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)*(i<c.sampleRate*.01?i/(c.sampleRate*.01):1); }
   this.verb=c.createConvolver(); this.verb.buffer=ir; this.verbGain=c.createGain(); this.verbGain.gain.value=.28; this.verb.connect(this.verbGain); this.verbGain.connect(this.master);
   const bus=n=>{ const g=c.createGain(); g.connect(this.master); return g; };
   this.bus={music:bus(),engine:bus(),fx:bus(),amb:bus()}; this.bus.music.connect(this.verb); this.bus.fx.connect(this.verb);
   const nb=c.createBuffer(1,c.sampleRate*3,c.sampleRate); const d=nb.getChannelData(0); let b0=0,b1=0,b2=0;
   for(let i=0;i<d.length;i++){ const w=Math.random()*2-1; b0=.99765*b0+w*.099; b1=.963*b1+w*.2965; b2=.57*b2+w*1.0526; d[i]=(b0+b1+b2+w*.1848)*.18; } this.pink=nb; // pink noise
   const wb=c.createBuffer(1,c.sampleRate*2,c.sampleRate); const wd=wb.getChannelData(0); for(let i=0;i<wd.length;i++) wd[i]=Math.random()*2-1; this.white=wb;
   this.loopNoise=(buf,type,freq,q)=>{ const s=c.createBufferSource(); s.buffer=buf; s.loop=true; const f=c.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q||.7; const g=c.createGain(); g.gain.value=0; s.connect(f); f.connect(g); s.start(); return {f,g}; };
   // tyres, wind, rain, city hum, night crickets
   this.tyre=this.loopNoise(this.pink,'bandpass',420,.9); this.tyre.g.connect(this.bus.fx);
   this.wind=this.loopNoise(this.pink,'lowpass',700); this.wind.g.connect(this.bus.amb);
   this.rain=this.loopNoise(this.white,'bandpass',2400,.5); this.rain.g.connect(this.bus.amb);
   this.city=this.loopNoise(this.pink,'lowpass',260); this.city.g.connect(this.bus.amb);
   this.turbo=this.loopNoise(this.white,'bandpass',3000,1.2); this.turbo.g.connect(this.bus.engine);
   this.night=c.createGain(); this.night.gain.value=0; this.night.connect(this.bus.amb);
   this.applyVolumes(); this.initEngines(); this.nextNote=c.currentTime+.2; setInterval(()=>this.tick(),90);
 }catch(e){ console.warn('audio off',e); this.ctx=null; } },
 /* Build the loops in small portions so the game never stutters: first the engine in use, the others afterwards. */
 initEngines(){ const c=this.ctx; this.engOut=c.createGain(); this.engOut.gain.value=1; this.engOut.connect(this.bus.engine); this.engBuild=[]; this.live=null;
   // electric whine of the hybrid hypercar: one quiet sine that climbs with speed
   this.whine=c.createOscillator(); this.whine.type='sine'; this.whineG=c.createGain(); this.whineG.gain.value=0; this.whine.connect(this.whineG); this.whineG.connect(this.bus.engine); this.whine.start();
   for(const key of ['fidele','petrol','smaragd']){ this.eng[key]={ready:false,loops:[]}; const S=ENGINE_SPEC[key]; S.pts.forEach((rpm,i)=>{ for(const load of [1,0]) this.engBuild.push({key,i,rpm,load}); }); }
   const work=()=>{ if(!this.ctx) return; const want=this.wantKey||'fidele'; let j=this.engBuild.findIndex(b=>b.key===want); if(j<0) j=0; const b=this.engBuild.splice(j,1)[0]; if(!b) return;
     const E=this.eng[b.key], L=engineLoop(c,ENGINE_SPEC[b.key],b.rpm,b.load,b.key.length*7919+1); (E.loops[b.i]||(E.loops[b.i]={rpm:L.rpm}))[b.load?'on':'off']=L.buf;
     if(!this.engBuild.some(x=>x.key===b.key)) E.ready=true; if(this.engBuild.length) setTimeout(work,E.ready?40:4); };
   setTimeout(work,30); },
 /* start the loops of one engine, all at the same instant so their cycles stay in step */
 startEngine(key){ const c=this.ctx, E=this.eng[key], S=ENGINE_SPEC[key]; this.stopEngine(); if(!E||!E.ready) return; const t0=c.currentTime+.03, out=c.createGain(); out.gain.value=0; out.connect(this.engOut);
   const v=[]; for(const L of E.loops){ const o={rpm:L.rpm}; for(const k of ['on','off']){ const src=c.createBufferSource(); src.buffer=L[k]; src.loop=true; src.playbackRate.value=this.rpm/L.rpm; const g=c.createGain(); g.gain.value=0; src.connect(g); g.connect(out); src.start(t0); o[k]={src,g,cur:0}; } v.push(o); }
   this.live={key,out,v,S,load:0}; },
 stopEngine(){ const L=this.live; if(!L) return; const t=this.ctx.currentTime; L.out.gain.setTargetAtTime(0,t,.05); for(const o of L.v) for(const k of ['on','off']){ try{ o[k].src.stop(t+.4); }catch(e){} } setTimeout(()=>{ try{ L.out.disconnect(); }catch(e){} },600); this.live=null; },
 resume(){ if(this.ctx&&this.ctx.state!=='running') this.ctx.resume().catch(()=>{}); },
 applyVolumes(){ if(!this.ctx) return; const t=this.ctx.currentTime; this.master.gain.setTargetAtTime(this.muted?0:this.vol.master,t,.05);
   for(const k of ['music','engine','fx','amb']) this.bus[k].gain.setTargetAtTime(this.vol[k],t,.05); },
 setMuted(m){ this.muted=m; this.applyVolumes(); },
 setVolume(k,v){ this.vol[k]=v; this.applyVolumes(); },
 /* per-frame vehicle sound: speed in m/s, throttle 0..1, active car */
 updateCar(car,speed,thr,brk,on,dt){ if(!this.ctx) return; const t=this.ctx.currentTime, G=GEARS[car]; const v=Math.abs(speed);
   if(this.car!==car){ this.car=car; this.gear=1; }
   // automatic gearbox
   const wheelRpm=v/(2*Math.PI*G.wheel)*60; let rpm=Math.max(G.idle,wheelRpm*G.ratios[this.gear-1]*G.final);
   if(this.shiftT>0){ this.shiftT-=dt; }
   else if(rpm>(thr>.5?G.up:G.up*.72)&&this.gear<G.ratios.length){ this.gear++; this.shiftT=car==='fidele'?.35:.12;
     if(car==='smaragd'&&thr>.5&&rpm>4200&&Math.random()<.6) this.spit(1+((Math.random()*2)|0),.9); } // full-throttle upshift: the ignition cut spits unburnt fuel into the exhaust
   else if(rpm<G.down&&this.gear>1){ this.gear--; this.shiftT=.2; if(car==='smaragd'&&v>12&&Math.random()<.45) this.spit(2+((Math.random()*3)|0),.55); }
   rpm=Math.max(G.idle,wheelRpm*G.ratios[this.gear-1]*G.final);
   if(v<1.2) rpm=G.idle+thr*(G.red-G.idle)*.35;
   if(this.shiftT>0) rpm*=car==='fidele'?.82:.9;
   rpm=Math.min(rpm,G.red); this.rpm+=(rpm-this.rpm)*Math.min(1,dt*(car==='fidele'?6:12));
   const load=this.shiftT>0?.1:clamp(thr*.9+(v>1?.1:0),0,1);
   const ek=GEARS[car]===PETROL?'petrol':car; this.wantKey=ek; // the everyday cars share one four-cylinder petrol engine
   if(on&&(!this.live||this.live.key!==ek)&&this.eng[ek]&&this.eng[ek].ready) this.startEngine(ek);
   const L=this.live;
   if(L){ const S=L.S, wob=1+S.wobble*(Math.sin(t*5.3)+.6*Math.sin(t*12.7))*Math.max(.15,1-this.rpm/3000); const rpm=this.rpm*wob; // an engine never holds its speed perfectly, least of all at idle
     L.load+=(load-L.load)*Math.min(1,dt*9); const v2=L.v; let i=0; while(i<v2.length-2&&rpm>v2[i+1].rpm) i++; const w=clamp((rpm-v2[i].rpm)/(v2[i+1].rpm-v2[i].rpm),0,1);
     for(let k=0;k<v2.length;k++){ const o=v2[k], gk=k===i?1-w:k===i+1?w:0; o.on.src.playbackRate.setTargetAtTime(rpm/o.rpm,t,.025); o.off.src.playbackRate.setTargetAtTime(rpm/o.rpm,t,.025);
       const gOn=gk*L.load, gOff=gk*(1-L.load); if(Math.abs(gOn-o.on.cur)>.004){ o.on.cur=gOn; o.on.g.gain.setTargetAtTime(gOn,t,.03); } if(Math.abs(gOff-o.off.cur)>.004){ o.off.cur=gOff; o.off.g.gain.setTargetAtTime(gOff,t,.03); } }
     L.out.gain.setTargetAtTime(on&&L.key===ek?S.gain*(.55+.45*L.load)*(.8+.2*Math.min(1,this.rpm/4000)):0,t,.08);
     // lift-off pops of the hypercar: a few soft cracks when the throttle closes at high revs
     if(L.key==='smaragd'&&this.prevLoad>.6&&load<.1&&this.rpm>4300){ for(let k=0;k<3;k++) setTimeout(()=>{ if(this.ctx) this.noiseBurst(.05,'bandpass',900+Math.random()*900,.1); },90+k*130+Math.random()*60); } }
   this.prevLoad=load;
   // turbos: a hiss that grows with load and revs, and a short sigh from the blow-off valves when the throttle shuts
   if(this.turbo){ const tb=on&&ek==='smaragd'?clamp((this.rpm-2200)/4000,0,1)*load:0; this.turbo.g.gain.setTargetAtTime(tb*.14,t,.16); this.turbo.f.frequency.setTargetAtTime(1900+this.rpm*.62,t,.14);
     if(ek==='smaragd'&&(this.tbPrev||0)>.45&&load<.15) this.noiseBurst(.3,'highpass',2400,.1); this.tbPrev=tb; }
   this.whine.frequency.setTargetAtTime(420+v*46,t,.08); this.whineG.gain.setTargetAtTime(on&&ek==='smaragd'?(.008+clamp(v/45,0,1)*.022)*(.55+.45*load):0,t,.15);
   // tyres and wind grow with speed; braking adds a scrub
   const sl=on?clamp((this.slide||0)/6,0,1):0; // sliding tyres squeal: louder and higher
   this.tyre.g.gain.setTargetAtTime(on?clamp(v/30,0,1)*.22+(brk&&v>4?.08:0)+sl*.3:0,t,.06); this.tyre.f.frequency.setTargetAtTime(250+v*14+sl*900,t,.06);
   this.wind.g.gain.setTargetAtTime(on?Math.pow(clamp(v/60,0,1),2)*.35:0,t,.2); this.wind.f.frequency.setTargetAtTime(400+v*25,t,.2); },
 setEngine(speed,on,C){ if(!on&&this.live&&this.ctx) this.live.out.gain.setTargetAtTime(0,this.ctx.currentTime,.2); },
 /* ambience: hour of day, rain 0..1, region 'city'|'motorway' */
 ambience(hour,rain,region){ if(!this.ctx) return; const t=this.ctx.currentTime; const night=hour<5.5||hour>21;
   this.rain.g.gain.setTargetAtTime(rain*.12,t,.5); this.city.g.gain.setTargetAtTime(region==='city'?(night?.05:.1):.03,t,1);
   if(night&&region!=='city'){ if(!this._cr||t>this._cr){ this._cr=t+.35+Math.random()*.4; this.cricket(); } } },
 cricket(){ const c=this.ctx,t=c.currentTime; const f=4200+Math.random()*600; for(let k=0;k<3;k++){ const o=c.createOscillator(); o.frequency.value=f; const g=c.createGain(); const s=t+k*.045; g.gain.setValueAtTime(0,s); g.gain.linearRampToValueAtTime(.012,s+.008); g.gain.exponentialRampToValueAtTime(.0001,s+.035); o.connect(g); g.connect(this.bus.amb); o.start(s); o.stop(s+.05); } },
 // ---- effects (natural envelopes, inharmonic partials, filtered noise) ----
 bell(freq,vol=.1,when=0,dest){ const c=this.ctx; if(!c) return; const t=c.currentTime+when;
   for(const [m,a,dc] of [[1,1,1.6],[2.76,.45,.9],[5.4,.25,.5],[8.9,.12,.3]]){ const o=c.createOscillator(); o.frequency.value=freq*m; const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol*a,t+.004); g.gain.exponentialRampToValueAtTime(.0001,t+dc); o.connect(g); g.connect(dest||this.bus.fx); o.start(t); o.stop(t+dc+.05); } },
 noiseBurst(dur,type,freq,vol,dest,sweepTo){ const c=this.ctx; if(!c) return; const t=c.currentTime; const s=c.createBufferSource(); s.buffer=this.pink; s.playbackRate.value=.8+Math.random()*.4;
   const f=c.createBiquadFilter(); f.type=type; f.frequency.setValueAtTime(freq,t); if(sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo,t+dur); const g=c.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
   s.connect(f); f.connect(g); g.connect(dest||this.bus.fx); s.start(t,Math.random()*2); s.stop(t+dur+.05); },
 /* exhaust spit: n short cracks, each a band of noise with a low thump; the game adds the flame */
 spit(n,vol){ if(!this.ctx) return; for(let k=0;k<n;k++) setTimeout(()=>{ if(!this.ctx) return; this.noiseBurst(.035+Math.random()*.03,'bandpass',500+Math.random()*700,.3*vol); this.thump(110+Math.random()*40,.05,.22*vol); this.spitFlag=(this.spitFlag||0)+1; },k*(70+Math.random()*60)); },
 thump(freq,dur,vol){ const c=this.ctx; if(!c) return; const t=c.currentTime; const o=c.createOscillator(); o.frequency.setValueAtTime(freq,t); o.frequency.exponentialRampToValueAtTime(freq*.45,t+dur); const g=c.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(g); g.connect(this.bus.fx); o.start(t); o.stop(t+dur+.05); },
 pickup(i){ const s=[0,2,4,7,9,12][((i%6)+6)%6]; this.bell(1046*Math.pow(2,s/12),.05); },
 noiseHit(dur,freq,vol){ this.noiseBurst(dur*.8,'lowpass',freq*1.5,vol*.9,null,90); this.thump(70,dur*.7,vol*.8); this.noiseBurst(.06,'highpass',3000,vol*.25); },
 hit(){ this.noiseHit(.5,1600,.5); },
 boom(v){ this.noiseBurst(1.1,'lowpass',700,.45*v,null,60); this.thump(48,.9,.4*v); },
 boost(){ this.noiseBurst(.9,'bandpass',300,.28,null,3800); [523,659,784].forEach((n,i)=>this.bell(n,.035,i*.06)); },
 chime(){ [659,784,988,1319].forEach((n,i)=>this.bell(n,.06,i*.13)); },
 click(){ this.bell(1800,.02); },
 setRain(v){},
 // ---- generative score: warm pads, plucked piano-like arpeggios, reverb ----
 MOODS:[{ch:[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],bpm:84},{ch:[[50,53,57],[46,50,53],[48,52,55],[45,48,52]],bpm:80},{ch:[[52,55,59],[48,52,55],[50,53,57],[47,50,54]],bpm:92},{ch:[[53,57,60],[57,60,64],[50,53,57],[55,59,62]],bpm:88},{ch:[[48,52,55,59],[53,57,60,64],[57,60,64,67],[55,59,62,65]],bpm:70}],
 m2f:m=>440*Math.pow(2,(m-69)/12),
 setMood(m){ this.mood=m; this.musicOn=true; },
 tick(){ if(!this.ctx||!this.musicOn) return; const c=this.ctx; const M=this.MOODS[this.mood]; const sp=60/M.bpm/2;
   while(this.nextNote<c.currentTime+.3){ const t=this.nextNote-c.currentTime; const chord=M.ch[(this.step>>4)%M.ch.length]; const s=this.step%16;
     if(s===0){ chord.forEach(n=>this.pad(this.m2f(n-12),sp*16,t)); this.pluck(this.m2f(chord[0]-24),sp*12,t,.09); }
     if(s%2===0&&Math.random()<.85){ const n=chord[[0,1,2,1,2,0,1,2][(s>>1)%8]%chord.length]+12+(s>=8?12:0); this.pluck(this.m2f(n),sp*3,t,.035); }
     this.nextNote+=sp; this.step++; } },
 pluck(freq,dur,when,vol){ const c=this.ctx,t=c.currentTime+when; for(const [m,a] of [[1,1],[2,.35],[3,.12]]){ const o=c.createOscillator(); o.type='sine'; o.frequency.value=freq*m*(1+(Math.random()-.5)*.002); const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol*a,t+.006); g.gain.exponentialRampToValueAtTime(.0001,t+dur*(1.2-m*.2)); o.connect(g); g.connect(this.bus.music); o.start(t); o.stop(t+dur+.1); } },
 pad(freq,dur,when){ const c=this.ctx,t=c.currentTime+when; const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.022,t+dur*.35); g.gain.linearRampToValueAtTime(0,t+dur);
   const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=700; f.Q.value=.5; f.connect(g); g.connect(this.bus.music);
   for(const dt of [-9,0,9]){ const o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=freq; o.detune.value=dt; o.connect(f); o.start(t); o.stop(t+dur+.05); } }
};
