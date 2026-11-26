/* ===== Generative score and sound effects (WebAudio) ===== */
const Audio_={ctx:null,master:null,muted:false,engine:null,engGain:null,engFilter:null,rain:null,music:null,nextNote:0,step:0,chord:0,mood:0,
 init(){ if(this.ctx)return; try{ const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return; const c=this.ctx=new AC();
   const comp=c.createDynamicsCompressor(); comp.threshold.value=-14; comp.ratio.value=4; comp.connect(c.destination);
   this.master=c.createGain(); this.master.gain.value=this.muted?0:0.8; this.master.connect(comp);
   this.musicBus=c.createGain(); this.musicBus.gain.value=0.32; this.musicBus.connect(this.master);
   const dl=c.createDelay(1.0); dl.delayTime.value=0.33; const fb=c.createGain(); fb.gain.value=0.35; const wet=c.createGain(); wet.gain.value=0.3;
   this.musicBus.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(this.master);
   // engine
   const o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=48; const o2=c.createOscillator(); o2.type='square'; o2.frequency.value=24;
   const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=300; const g=c.createGain(); g.gain.value=0;
   o.connect(f); o2.connect(f); f.connect(g); g.connect(this.master); o.start(); o2.start(); this.engine=o; this.engine2=o2; this.engGain=g; this.engFilter=f;
   // noise buffer
   const nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate); const d=nb.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; this.noise=nb;
   const rs=c.createBufferSource(); rs.buffer=nb; rs.loop=true; const rf=c.createBiquadFilter(); rf.type='highpass'; rf.frequency.value=2500; const rg=c.createGain(); rg.gain.value=0;
   rs.connect(rf); rf.connect(rg); rg.connect(this.master); rs.start(); this.rainGain=rg;
   this.nextNote=c.currentTime+0.1;
   setInterval(()=>this.schedule(),90);
 }catch(e){ console.warn('audio off',e); this.ctx=null; } },
 resume(){ if(this.ctx&&this.ctx.state!=='running')this.ctx.resume().catch(()=>{}); },
 setMuted(m){ this.muted=m; if(this.master)this.master.gain.setTargetAtTime(m?0:0.8,this.ctx.currentTime,0.05); },
 setEngine(speed,on,C){ if(!this.ctx)return; const t=this.ctx.currentTime; const e=C?C.eng:[38,1.6]; this.engine.frequency.setTargetAtTime(e[0]+speed*e[1],t,0.1); this.engine2.frequency.setTargetAtTime((e[0]+speed*e[1])/2,t,0.1);
   this.engFilter.frequency.setTargetAtTime(180+speed*9,t,0.1); this.engGain.gain.setTargetAtTime(on?0.06:0,t,0.3); },
 setRain(v){ if(this.ctx)this.rainGain.gain.setTargetAtTime(v*0.05,this.ctx.currentTime,0.5); },
 tone(freq,dur,type='sine',vol=0.2,when=0,dest){ if(!this.ctx)return; const c=this.ctx,t=c.currentTime+when; const o=c.createOscillator(); o.type=type; o.frequency.setValueAtTime(freq,t);
   const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.01); g.gain.exponentialRampToValueAtTime(0.0005,t+dur); o.connect(g); g.connect(dest||this.master); o.start(t); o.stop(t+dur+0.05); },
 noiseHit(dur,freq,vol){ if(!this.ctx)return; const c=this.ctx,t=c.currentTime; const s=c.createBufferSource(); s.buffer=this.noise; const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(freq,t); f.frequency.exponentialRampToValueAtTime(60,t+dur);
   const g=c.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0005,t+dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t+dur+0.05); },
 pickup(combo){ const base=[880,988,1109,1319,1480,1760][Math.min(combo,5)]; this.tone(base,0.25,'sine',0.12); this.tone(base*1.5,0.3,'triangle',0.05,0.04); },
 hit(){ this.noiseHit(0.5,1800,0.5); this.tone(90,0.5,'sine',0.4); },
 boom(v){ this.noiseHit(0.8,900,0.35*v); this.tone(55,0.7,'sine',0.3*v); },
 boost(){ if(!this.ctx)return; const c=this.ctx,t=c.currentTime; const s=c.createBufferSource(); s.buffer=this.noise; const f=c.createBiquadFilter(); f.type='bandpass'; f.Q.value=2; f.frequency.setValueAtTime(300,t); f.frequency.exponentialRampToValueAtTime(4000,t+0.6);
   const g=c.createGain(); g.gain.setValueAtTime(0.3,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.9); s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t+1);
   [523,659,784,1047].forEach((n,i)=>this.tone(n,0.4,'triangle',0.08,i*0.05)); },
 chime(){ [659,784,988,1319,1568].forEach((n,i)=>this.tone(n,1.4,'sine',0.09,i*0.12)); },
 // simple generative score: per mood a chord loop
 MOODS:[ // [root midi for chords], tempo
   {ch:[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],bpm:88},   // A minor-ish, Hochöfen
   {ch:[[50,53,57],[46,50,53],[48,52,55],[45,48,52]],bpm:84},   // D minor, Brücken
   {ch:[[52,55,59],[48,52,55],[50,53,57],[47,50,54]],bpm:96},   // E minor, Glut
   {ch:[[53,57,60],[57,60,64],[50,53,57],[55,59,62]],bpm:90},   // F major, Hafen
   {ch:[[48,52,55,59],[53,57,60,64],[57,60,64,67],[55,59,62,65]],bpm:72} // ending
 ],
 m2f:m=>440*Math.pow(2,(m-69)/12),
 schedule(){ if(!this.ctx||!this.musicOn)return; const c=this.ctx; const M=this.MOODS[this.mood]; const sp=60/M.bpm/2;
   while(this.nextNote<c.currentTime+0.3){ const t=this.nextNote-c.currentTime; const chord=M.ch[(this.step>>4)%M.ch.length]; const s=this.step%16;
     if(s===0){ chord.forEach(n=>{ this.pad(this.m2f(n-12),sp*16,t); }); this.tone(this.m2f(chord[0]-24),sp*15,'sine',0.16,t,this.musicBus); }
     const arp=[0,1,2,1,2,0,1,2]; if(s%2===0||this.mood===2){ const n=chord[arp[(s>>(this.mood===2?0:1))%8]%chord.length]+12+(s>=8&&this.mood!==4?12:0); this.tone(this.m2f(n),sp*1.6,'triangle',0.045,t,this.musicBus); }
     if(this.mood!==4&&s%4===0){ this.tone(60,0.18,'sine',s%8===0?0.22:0.1,t,this.musicBus); }
     this.nextNote+=sp; this.step++; } },
 pad(freq,dur,when){ const c=this.ctx,t=c.currentTime+when; const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.03,t+dur*0.3); g.gain.linearRampToValueAtTime(0,t+dur);
   const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=900; f.connect(g); g.connect(this.musicBus);
   for(const dt of [-7,7]){ const o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=freq; o.detune.value=dt; o.connect(f); o.start(t); o.stop(t+dur+0.05); } },
 setMood(m){ this.mood=m; this.musicOn=true; }
};

