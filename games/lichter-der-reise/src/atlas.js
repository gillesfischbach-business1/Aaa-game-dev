/* ===== Texture atlas drawn with Canvas2D: number plates and signs (4 x 8 slots of 512 x 128) ===== */
const ATLAS_W=2048, ATLAS_H=1024, SLOT={VAN_PLATE:0,SUP_PLATE:1,BELVAL:2,MONTE:3,CAFE:4,HOTEL:5,PHARMA:6,BOUL:7,PORT:8,RUE:9,BAR:10,SIGN_EHV:11,SIGN_LUX:12,BORDER:13,GLOW:14,LICHT:15,PONT:16,STRAAT:17,FRITES:18,TAXI:19,ZEBRA:20,Z30:21,ARROW:22,SG_PED:23,SG_ONEWAY:24,SG_NOPARK:25,SG_30:26,BIKE:27};
function buildAtlas(){
  const cv=(typeof OffscreenCanvas!=='undefined')?new OffscreenCanvas(ATLAS_W,ATLAS_H):Object.assign(document.createElement('canvas'),{width:ATLAS_W,height:ATLAS_H});
  const g=cv.getContext('2d'); if(!g) return null;
  const cell=i=>[(i%4)*512,Math.floor(i/4)*128];
  const rr=(x,y,w,h,r)=>{ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); };
  const plate=(i,bg,txt,band,code)=>{ const [x,y]=cell(i); g.fillStyle='#111'; rr(x+2,y+6,508,116,14); g.fill(); g.fillStyle=bg; rr(x+8,y+12,496,104,10); g.fill();
    g.fillStyle='#1d3fa8'; g.fillRect(x+8,y+12,62,104); g.fillStyle='#ffd400';
    for(let k=0;k<12;k++){ const a=k/12*Math.PI*2; g.beginPath(); g.arc(x+39+Math.cos(a)*17,y+44+Math.sin(a)*17,3,0,7); g.fill(); }
    g.fillStyle='#fff'; g.font='bold 30px Arial, Helvetica, sans-serif'; g.textAlign='center'; g.fillText(code,x+39,y+104);
    g.fillStyle='#121212'; g.font='bold 84px "Arial Narrow", Arial, Helvetica, sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(txt,x+(band?250:288),y+68,band?350:400); g.textBaseline='alphabetic';
    if(band){ g.fillStyle='#1d3fa8'; g.fillRect(x+442,y+12,62,104); } };
  plate(SLOT.VAN_PLATE,'#f4f4f0','EJ 391 YJ',true,'F');
  plate(SLOT.SUP_PLATE,'#f7cf1c','VH 3107',false,'L');
  const sign=(i,bg,fg,font,lines,glow)=>{ const [x,y]=cell(i); if(bg){ g.fillStyle=bg; g.fillRect(x,y,512,128); } else g.clearRect(x,y,512,128);
    g.fillStyle=fg; g.textAlign='center'; g.textBaseline='middle'; if(glow){ g.shadowColor=fg; g.shadowBlur=14; }
    lines.forEach((l,k)=>{ g.font=l[1]; g.fillText(l[0],x+256,y+l[2],490); }); g.shadowBlur=0; g.textBaseline='alphabetic'; };
  sign(SLOT.BELVAL,null,'#ffffff','',[['BELVAL PLAZA','bold 92px "Arial Narrow", Arial, sans-serif',66]]);
  sign(SLOT.MONTE,'#2b2b2e','#f2f2f2','',[['MONTE-CARLO','600 70px Arial, Helvetica, sans-serif',50],['SOCIÉTÉ DES BAINS DE MER','500 30px Arial, Helvetica, sans-serif',100]]);
  sign(SLOT.CAFE,null,'#ffb060','',[['Café des Étoiles','italic 70px Georgia, serif',64]],true);
  sign(SLOT.HOTEL,null,'#fff1d6','',[['HÔTEL DU PORT','600 76px Georgia, serif',64]],true);
  sign(SLOT.PHARMA,null,'#3dff7a','',[['✚ PHARMACIE','bold 80px Arial, sans-serif',64]],true);
  sign(SLOT.BOUL,null,'#ff7aa8','',[['Boulangerie','italic 84px Georgia, serif',64]],true);
  sign(SLOT.PORT,'#0e2a44','#ffffff','',[['PORT DES LUMIÈRES','bold 56px Arial, sans-serif',64]]);
  sign(SLOT.RUE,'#1c3f8f','#ffffff','',[['Rue des Bâtisseurs','bold 58px Arial, sans-serif',64]]);
  sign(SLOT.BAR,null,'#c78bff','',[['Le Pont Violet','italic 78px Georgia, serif',64]],true);
  sign(SLOT.SIGN_EHV,'#1b4fa0','#ffffff','',[['Eindhoven','bold 70px Arial, sans-serif',52],['A-Route der Lichter  ·  →','500 30px Arial, sans-serif',102]]);
  sign(SLOT.SIGN_LUX,'#1b4fa0','#ffffff','',[['Lëtzebuerg','bold 70px Arial, sans-serif',52],['←  Belval · Altstadt','500 30px Arial, sans-serif',102]]);
  sign(SLOT.BORDER,'#1b4fa0','#ffffff','',[['Nederland','bold 72px Arial, sans-serif',66]]); { const [x,y]=cell(SLOT.BORDER); g.strokeStyle='#ffd400'; g.lineWidth=3; for(let k=0;k<12;k++){ const a=k/12*Math.PI*2; g.beginPath(); g.arc(x+60+Math.cos(a)*30,y+64+Math.sin(a)*30,4,0,7); g.fillStyle='#ffd400'; g.fill(); } }
  sign(SLOT.GLOW,null,'#ff9a3c','',[['GLOW · Glutplatz','bold 76px Arial, sans-serif',64]],true);
  sign(SLOT.LICHT,null,'#d8ecff','',[['LICHTTURM','300 84px Arial, sans-serif',64]],true);
  sign(SLOT.PONT,'#1c3f8f','#ffffff','',[['Pont des Lumières','bold 56px Arial, sans-serif',64]]);
  sign(SLOT.STRAAT,'#0b2f6b','#ffffff','',[['Gloeistraat','bold 64px Arial, sans-serif',64]]);
  sign(SLOT.FRITES,null,'#ffe066','',[['FRITES · Snackbar','bold 66px Arial, sans-serif',64]],true);
  sign(SLOT.TAXI,'#f7cf1c','#111111','',[['TAXI','bold 90px Arial, sans-serif',66]]);
  { const [x,y]=cell(SLOT.ZEBRA); g.clearRect(x,y,512,128); g.fillStyle='rgba(226,226,218,1)'; for(let k=0;k<12;k++) g.fillRect(x+10+k*42,y+3,21,122); }
  // road paint and traffic signs. A cell is 512x128 but is shown on a square (or 1:3) quad, so drawing happens in a stretched frame.
  const paint='rgba(226,226,218,1)'; const inCell=(slot,w,h,f)=>{ const [x,y]=cell(slot); g.clearRect(x,y,512,128); g.save(); g.translate(x,y); g.scale(512/w,128/h); f(); g.restore(); };
  inCell(SLOT.Z30,100,300,()=>{ g.strokeStyle=paint; g.lineWidth=9; g.beginPath(); g.ellipse(50,150,40,140,0,0,7); g.stroke(); g.fillStyle=paint; g.font='bold 62px Arial, sans-serif'; g.textAlign='center'; g.save(); g.translate(50,150); g.scale(1,3.1); g.fillText('30',0,22); g.restore(); });
  inCell(SLOT.ARROW,100,300,()=>{ g.fillStyle=paint; g.fillRect(42,110,16,180); g.beginPath(); g.moveTo(50,8); g.lineTo(88,125); g.lineTo(12,125); g.closePath(); g.fill(); });
  inCell(SLOT.BIKE,100,160,()=>{ g.strokeStyle=paint; g.lineWidth=7; for(const cx of [26,74]){ g.beginPath(); g.arc(cx,112,19,0,7); g.stroke(); } g.beginPath(); g.moveTo(26,112); g.lineTo(44,70); g.lineTo(70,70); g.lineTo(74,112); g.moveTo(44,70); g.lineTo(56,112); g.lineTo(26,112); g.moveTo(66,56); g.lineTo(70,70); g.moveTo(38,58); g.lineTo(50,58); g.stroke(); });
  const disc=(slot,f)=>inCell(slot,100,100,()=>{ g.textAlign='center'; f(); });
  disc(SLOT.SG_PED,()=>{ g.fillStyle='#1d4fb4'; g.fillRect(4,4,92,92); g.fillStyle='#fff'; g.beginPath(); g.moveTo(50,14); g.lineTo(88,84); g.lineTo(12,84); g.closePath(); g.fill(); g.fillStyle='#111'; g.beginPath(); g.arc(50,40,6,0,7); g.fill(); g.fillRect(46,47,8,20); g.fillRect(40,66,7,14); g.fillRect(53,66,7,14); });
  disc(SLOT.SG_ONEWAY,()=>{ g.fillStyle='#1d4fb4'; g.fillRect(4,4,92,92); g.fillStyle='#fff'; g.fillRect(43,40,14,46); g.beginPath(); g.moveTo(50,10); g.lineTo(78,46); g.lineTo(22,46); g.closePath(); g.fill(); });
  disc(SLOT.SG_NOPARK,()=>{ g.fillStyle='#c81e1e'; g.beginPath(); g.arc(50,50,46,0,7); g.fill(); g.fillStyle='#1d4fb4'; g.beginPath(); g.arc(50,50,35,0,7); g.fill(); g.strokeStyle='#c81e1e'; g.lineWidth=10; g.beginPath(); g.moveTo(26,26); g.lineTo(74,74); g.stroke(); });
  disc(SLOT.SG_30,()=>{ g.fillStyle='#c81e1e'; g.beginPath(); g.arc(50,50,46,0,7); g.fill(); g.fillStyle='#fff'; g.beginPath(); g.arc(50,50,36,0,7); g.fill(); g.fillStyle='#111'; g.font='bold 44px Arial, sans-serif'; g.fillText('30',50,66); });
  return g.getImageData(0,0,ATLAS_W,ATLAS_H).data;
}
