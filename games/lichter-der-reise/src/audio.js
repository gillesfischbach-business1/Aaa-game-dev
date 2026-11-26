/* ===== Audio: physically modelled engines, natural ambience, reverb, mixer =====
   Engines are synthesised per sample in an AudioWorklet from crank speed, cylinder count and firing order:
   - Fidèle: 1.8 l four-cylinder diesel (Citroën C15 D), 2 firings per revolution, injector knock, rattly idle.
   - Smaragd: 4.0 l twin-turbo flat-plane V8 with hybrid motors (Valhalla-like), 4 firings per revolution,
     intake howl, turbo whistle, electric whine and overrun crackle.
   Falls back to a simpler oscillator engine where AudioWorklet is unavailable. */
const ENGINE_WORKLET=`
class Engine extends AudioWorkletProcessor{
  static get parameterDescriptors(){ return [{name:'rpm',defaultValue:850},{name:'load',defaultValue:0},{name:'gain',defaultValue:0},{name:'whine',defaultValue:0},{name:'boost',defaultValue:0}]; }
  constructor(o){ super(); const p=o.processorOptions||{}; this.type=p.type||'diesel'; this.ph=0; this.lastFire=-1; this.pulses=[]; this.seed=1;
    this.lp=0; this.bp1={x1:0,x2:0,y1:0,y2:0}; this.bp2={x1:0,x2:0,y1:0,y2:0}; this.hp=0; this.hpx=0; this.wph=0; this.tph=0; this.jit=0; this.crack=0; this.prevLoad=0; this.cyl=0; }
  rnd(){ this.seed=(this.seed*16807)%2147483647; return this.seed/2147483647; }
  biquadBP(st,x,f,q){ const w=2*Math.PI*Math.min(f,sampleRate*.45)/sampleRate, al=Math.sin(w)/(2*q), cw=Math.cos(w), a0=1+al;
    const y=(al/a0)*x-(al/a0)*st.x2-(-2*cw/a0)*st.y1-((1-al)/a0)*st.y2; st.x2=st.x1; st.x1=x; st.y2=st.y1; st.y1=y; return y; }
  process(_,out,P){ const o=out[0][0]; const N=o.length; const diesel=this.type==='diesel';
    const cyl=diesel?4:8, firesPerRev=cyl/2;
    for(let i=0;i<N;i++){
      const rpm=P.rpm.length>1?P.rpm[i]:P.rpm[0], load=P.load.length>1?P.load[i]:P.load[0], g=P.gain.length>1?P.gain[i]:P.gain[0];
      const whine=P.whine[0], boost=P.boost[0];
      const f=rpm/60; this.ph+=f/sampleRate*(1+this.jit);
      const firePhase=this.ph*firesPerRev; const k=Math.floor(firePhase);
      if(k!==this.lastFire){ this.lastFire=k; this.cyl=(this.cyl+1)%cyl;
        // per-cylinder character: diesel idles unevenly, the V8 is smooth but not identical per bank
        const v=diesel?(0.75+0.5*this.rnd())*(1-0.25*(this.cyl%2)):(0.88+0.18*Math.sin(this.cyl*2.1));
        this.jit=diesel?(this.rnd()-.5)*0.06*Math.max(0,1-rpm/2500):(this.rnd()-.5)*0.01;
        const amp=v*(0.35+0.65*load);
        this.pulses.push({t:0,a:amp,f1:diesel?95+rpm*0.02:140+rpm*0.03,f2:diesel?520+this.rnd()*260:900+rpm*0.08,click:diesel?1:0.25});
        if(this.pulses.length>24) this.pulses.shift();
        if(!diesel&&load<0.05&&rpm>3500&&this.prevLoad>0.5&&this.rnd()<0.18) this.crack=0.06; }
      let s=0;
      for(const p of this.pulses){ const t=p.t; const e1=Math.exp(-t*(diesel?55:38)), e2=Math.exp(-t*(diesel?420:260));
        s+=p.a*(e1*Math.sin(2*Math.PI*p.f1*t)*0.9 + e2*Math.sin(2*Math.PI*p.f2*t)*0.45*p.click); p.t+=1/sampleRate; }
      this.pulses=this.pulses.filter(p=>p.t<0.12);
      const n=this.rnd()*2-1;
      if(diesel){ // injector knock and valvetrain clatter: band-passed noise gated by the firing pulses
        const clat=this.biquadBP(this.bp1,n,2600,3)*0.10*(0.5+load)*Math.min(1,rpm/900); s+=clat*(this.pulses.length?1:0.4);
        s+=this.biquadBP(this.bp2,n,180+rpm*0.04,1.2)*0.08*load;
      } else { // intake howl, turbo whistle, hybrid whine, overrun crackle
        s+=this.biquadBP(this.bp1,n,300+rpm*0.11,2.5)*0.18*load;
        this.tph+=(1800+boost*4200)/sampleRate; s+=Math.sin(2*Math.PI*this.tph)*0.035*boost;
        this.wph+=(120+whine*9000)/sampleRate; s+=Math.sin(2*Math.PI*this.wph)*0.012*Math.min(1,whine*3)*(1-load*0.5);
        if(this.crack>0){ this.crack-=1/sampleRate; if(this.rnd()<0.02) s+=(this.rnd()*2-1)*1.4; } }
      this.prevLoad=load;
      // exhaust: one-pole low-pass that opens with rpm and load, plus DC block, soft saturation
      const c=Math.min(0.95,(diesel?900:1600+rpm*0.35)*(0.6+0.6*load)/sampleRate*6.28);
      this.lp+=(s-this.lp)*c; const y=this.lp-this.hpx+0.995*this.hp; this.hpx=this.lp; this.hp=y;
      o[i]=Math.tanh(y*(diesel?0.9:1.0))*g;
    }
    for(let ch=1;ch<out[0].length;ch++) out[0][ch].set(o);
    return true; } }
registerProcessor('engine',Engine);`;

const GEARS={ fidele:{idle:850,red:4600,ratios:[3.8,2.2,1.45,1.05,.8],final:4.1,wheel:.3,up:3800,down:1500},
              smaragd:{idle:1100,red:7200,ratios:[3.4,2.6,2.0,1.6,1.3,1.05,.85,.68],final:3.6,wheel:.36,up:6600,down:2400} };
const Audio_={ ctx:null, muted:false, vol:{master:.85,music:.45,engine:.8,fx:.8,amb:.6}, worklet:false, eng:{}, gear:1, rpm:850, shiftT:0, mood:0, musicOn:false, nextNote:0, step:0,
 init(){ if(this.ctx) return; try{ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return; const c=this.ctx=new AC({latencyHint:'interactive'});
   this.comp=c.createDynamicsCompressor(); this.comp.threshold.value=-12; this.comp.ratio.value=3; this.comp.connect(c.destination);
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
   this.rain=this.loopNoise(this.white,'highpass',3500); this.rain.g.connect(this.bus.amb);
   this.city=this.loopNoise(this.pink,'lowpass',260); this.city.g.connect(this.bus.amb);
   this.night=c.createGain(); this.night.gain.value=0; this.night.connect(this.bus.amb);
   this.applyVolumes(); this.initEngines(); this.nextNote=c.currentTime+.2; setInterval(()=>this.tick(),90);
 }catch(e){ console.warn('audio off',e); this.ctx=null; } },
 async initEngines(){ const c=this.ctx;
   try{ const url=URL.createObjectURL(new Blob([ENGINE_WORKLET],{type:'application/javascript'})); await c.audioWorklet.addModule(url);
     for(const [car,type] of [['fidele','diesel'],['smaragd','v8']]){ const n=new AudioWorkletNode(c,'engine',{numberOfOutputs:1,outputChannelCount:[2],processorOptions:{type}}); const g=c.createGain(); g.gain.value=type==='diesel'?.55:.5; n.connect(g); g.connect(this.bus.engine); this.eng[car]=n; }
     this.worklet=true;
   }catch(e){ // fallback: two detuned oscillators through a filter
     for(const car of ['fidele','smaragd']){ const o=c.createOscillator(); o.type='sawtooth'; const o2=c.createOscillator(); o2.type='square'; const f=c.createBiquadFilter(); f.type='lowpass'; const g=c.createGain(); g.gain.value=0;
       o.connect(f); o2.connect(f); f.connect(g); g.connect(this.bus.engine); o.start(); o2.start(); this.eng[car]={fallback:true,o,o2,f,g}; } } },
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
   else if(rpm>(thr>.5?G.up:G.up*.72)&&this.gear<G.ratios.length){ this.gear++; this.shiftT=car==='fidele'?.35:.12; }
   else if(rpm<G.down&&this.gear>1){ this.gear--; this.shiftT=.2; }
   rpm=Math.max(G.idle,wheelRpm*G.ratios[this.gear-1]*G.final);
   if(v<1.2) rpm=G.idle+thr*(G.red-G.idle)*.35;
   if(this.shiftT>0) rpm*=car==='fidele'?.82:.9;
   rpm=Math.min(rpm,G.red); this.rpm+=(rpm-this.rpm)*Math.min(1,dt*(car==='fidele'?6:12));
   const load=this.shiftT>0?.1:clamp(thr*.9+(v>1?.1:0),0,1);
   for(const k in this.eng){ const e=this.eng[k], active=k===car&&on;
     if(e.fallback){ const f=GEARS[k]; e.o.frequency.setTargetAtTime(this.rpm/60*(k==='fidele'?2:4),t,.05); e.o2.frequency.setTargetAtTime(this.rpm/60,t,.05); e.f.frequency.setTargetAtTime(300+this.rpm*.4*(.5+load),t,.05); e.g.gain.setTargetAtTime(active?.06:0,t,.1); continue; }
     e.parameters.get('rpm').setTargetAtTime(active?this.rpm:GEARS[k].idle,t,.03); e.parameters.get('load').setTargetAtTime(load,t,.03);
     e.parameters.get('gain').setTargetAtTime(active?.7:0,t,.15); e.parameters.get('whine').setTargetAtTime(k==='smaragd'?clamp(v/80,0,1):0,t,.05);
     e.parameters.get('boost').setTargetAtTime(k==='smaragd'?clamp((this.rpm-2500)/4000,0,1)*load:0,t,.1); }
   // tyres and wind grow with speed; braking adds a scrub
   this.tyre.g.gain.setTargetAtTime(on?clamp(v/30,0,1)*.22+(brk&&v>4?.08:0):0,t,.1); this.tyre.f.frequency.setTargetAtTime(250+v*14,t,.1);
   this.wind.g.gain.setTargetAtTime(on?Math.pow(clamp(v/60,0,1),2)*.35:0,t,.2); this.wind.f.frequency.setTargetAtTime(400+v*25,t,.2); },
 setEngine(speed,on,C){ if(!on&&this.ctx) for(const k in this.eng){ const e=this.eng[k]; if(e.fallback) e.g.gain.setTargetAtTime(0,this.ctx.currentTime,.2); else e.parameters.get('gain').setTargetAtTime(0,this.ctx.currentTime,.25); } },
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
