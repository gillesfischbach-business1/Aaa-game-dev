/* ===== Texture atlas drawn with Canvas2D: number plates and signs (4 x 8 slots of 512 x 128) ===== */
const ATLAS_W=2048, ATLAS_H=1024, SLOT={VAN_PLATE:0,SUP_PLATE:1,BELVAL:2,MONTE:3,CAFE:4,HOTEL:5,PHARMA:6,BOUL:7,PORT:8,RUE:9,BAR:10,SIGN_EHV:11,SIGN_LUX:12,BORDER:13,GLOW:14,LICHT:15,PONT:16,STRAAT:17,FRITES:18,TAXI:19};
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
  return g.getImageData(0,0,ATLAS_W,ATLAS_H).data;
}
