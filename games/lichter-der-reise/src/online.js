/* ===== Online leaderboard (optional). The game works without it; nothing is sent unless the player presses "Eintragen". =====
   Only the chosen nickname and the result are transmitted: no account, no e-mail, no device identifiers. */
const LB={ url:'https://lichter-der-reise-bestenliste.lovable.app/api/public/leaderboard', page:'https://lichter-der-reise-bestenliste.lovable.app/', save:'https://lichter-der-reise-bestenliste.lovable.app/api/public/save' }; // set in build: the leaderboard service and its public page
let lbSent=false;
function lbFmt(t){ t=Math.max(0,Math.round(t)); return Math.floor(t/60)+':'+String(t%60).padStart(2,'0'); }
function lbShow(good){ const w=$('lbWrap'); if(!w) return; if(!LB.url){ w.hidden=true; return; } w.hidden=false; lbSent=false;
  $('lbSend').disabled=false; $('lbMsg').textContent='Zeit: '+lbFmt(G.playT||0)+' · '+G.light+' Funken'; $('lbMore').href=LB.page||'#'; $('lbMore').hidden=!LB.page;
  try{ $('lbName').value=localStorage.getItem('ldr_nick')||''; }catch(e){} G.lbGood=good; lbLoad(); }
async function lbLoad(){ const ol=$('lbList'); try{ const r=await fetch(LB.url+'?limit=5',{headers:{accept:'application/json'}}); if(!r.ok) throw 0; const d=await r.json();
    ol.innerHTML=''; for(const s of (d.scores||[]).slice(0,5)){ const li=document.createElement('li'); const n=document.createElement('span'); n.textContent=s.nickname; const v=document.createElement('b'); v.textContent=s.sparks+' Funken · '+lbFmt(s.time_seconds); li.append(n,v); ol.append(li); }
    if(!ol.children.length){ const li=document.createElement('li'); li.textContent='Noch keine Einträge. Sei die oder der Erste!'; ol.append(li); } }
  catch(e){ ol.innerHTML=''; const li=document.createElement('li'); li.textContent='Die Bestenliste ist gerade nicht erreichbar.'; ol.append(li); } }
async function lbSubmit(){ if(lbSent||!LB.url) return; const name=($('lbName').value||'').trim(); const msg=$('lbMsg');
  if(!/^[\p{L}\p{N} _-]{2,16}$/u.test(name)){ msg.textContent='Bitte 2 bis 16 Zeichen: Buchstaben, Ziffern, Leerzeichen, _ oder -.'; return; }
  $('lbSend').disabled=true; msg.textContent='Wird eingetragen …';
  try{ const r=await fetch(LB.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nickname:name,sparks:Math.min(200,G.light|0),time_seconds:clamp(Math.round(G.playT||0),60,36000),car:G.player.car,ending:G.lbGood?'good':'bad',device:isTouch?'mobile':'desktop'})});
    const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||('Fehler '+r.status));
    lbSent=true; try{ localStorage.setItem('ldr_nick',name); }catch(e){} msg.textContent='Eingetragen! Du stehst auf Platz '+d.rank+'.'; lbLoad(); }
  catch(e){ msg.textContent='Das hat nicht geklappt: '+(e.message||'keine Verbindung')+'.'; $('lbSend').disabled=false; } }

/* ===== Cloud save without an account =====
   Each device makes a random 12-character transfer code. The server keeps the save under a hash of that code, so the code works like a key:
   type it into another device to continue there. No name, no e-mail. */
const CLOUD_ABC='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let cloudBusy=false, cloudLast=0;
function cloudNorm(v){ const c=String(v||'').toUpperCase().replace(/[\s-]/g,''); return c.length===12&&[...c].every(ch=>CLOUD_ABC.includes(ch))?c:null; }
function cloudFmt(c){ return c.slice(0,4)+'-'+c.slice(4,8)+'-'+c.slice(8); }
function cloudCode(){ let c=null; try{ c=cloudNorm(localStorage.getItem('ldr_cloud_code')); }catch(e){} if(!c){ const r=new Uint8Array(12); crypto.getRandomValues(r); c=[...r].map(b=>CLOUD_ABC[b&31]).join(''); try{ localStorage.setItem('ldr_cloud_code',c); }catch(e){} } return c; }
function cloudSay(t){ const m=$('o_cmsg'); if(m) m.textContent=t; }
async function cloudUp(manual){ if(!LB.save||cloudBusy) return; if(!manual&&performance.now()-cloudLast<45000) return; const data=G.player&&(G.state==='drive'||G.state==='pause')?snapshot():readSlot('auto');
  if(!data){ if(manual) cloudSay('Es gibt noch keinen Spielstand zum Sichern.'); return; } cloudBusy=true; if(manual) cloudSay('Wird gesichert …');
  try{ const r=await fetch(LB.save,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({code:cloudCode(),data})}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||('Fehler '+r.status)); cloudLast=performance.now(); if(manual) cloudSay('In der Cloud gesichert.'); }
  catch(e){ if(manual) cloudSay('Sichern hat nicht geklappt: '+(e.message||'keine Verbindung')+'.'); } cloudBusy=false; }
async function cloudDown(){ if(!LB.save||cloudBusy) return; cloudBusy=true; cloudSay('Wird geladen …');
  try{ const r=await fetch(LB.save+'?code='+cloudCode(),{headers:{accept:'application/json'}}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||('Fehler '+r.status));
    if(!d.data||d.data.v!==1) throw new Error('Spielstand unlesbar'); localStorage.setItem('ldr_save_auto',JSON.stringify(d.data)); cloudBusy=false; renderOptions(); cloudSay('Geladen und als Autospeicher abgelegt. Tippe dort auf „Laden“ oder im Titel auf „Weiterspielen“.'); return; }
  catch(e){ cloudSay('Laden hat nicht geklappt: '+(e.message||'keine Verbindung')+'.'); } cloudBusy=false; }
