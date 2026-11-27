/* ===== Online leaderboard (optional). The game works without it; nothing is sent unless the player presses "Eintragen". =====
   Only the chosen nickname and the result are transmitted: no account, no e-mail, no device identifiers. */
const LB={ url:'https://lichter-der-reise-bestenliste.lovable.app/api/public/leaderboard', page:'https://lichter-der-reise-bestenliste.lovable.app/' }; // set in build: the leaderboard service and its public page
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
