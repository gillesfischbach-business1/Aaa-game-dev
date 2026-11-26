/* ===== Story missions in the open world =====
   A line: {w: speaker, t: text, img?: photo card, cap?: caption} */
const NAMES={leo:'Léo',mira:'Mira',val:'Valère',narr:''};
const IMG={belval:'assets/panel_belval.jpg',bruecke:'assets/panel_bruecke.jpg',bar:'assets/panel_bar.jpg',abend:'assets/panel_abend.jpg',glut:'assets/glutplatz.jpg',monaco:'assets/monaco.jpg'};
const STORY={
 prologue:[
  {w:'narr',img:IMG.belval,cap:'Belval, ein Abend im November',t:'Seit dem Großen Erlöschen fällt Glut vom Himmel. In Luxemburg und weit darüber hinaus gehen die Lichter aus, Straße für Straße.'},
  {w:'narr',img:IMG.belval,cap:'Belval, ein Abend im November',t:'Léo und Mira stehen mit Fidèle, ihrem alten weißen Lieferwagen, vor der Belval Plaza. Mira macht ein Foto. Wie immer.'},
  {w:'narr',t:'Neben ihnen hält ein Wagen, den es eigentlich nicht geben dürfte. Smaragdgrün, goldene Felgen, Kennzeichen VH 3107.'},
  {w:'val',t:'Ihr seid die beiden, die Funken sammeln? Man sagt, in Eindhoven steht ein Lichtturm. Wer genug Funken hinbringt, kann ihn wieder entzünden.'},
  {w:'mira',t:'Und dann?'},
  {w:'val',t:'Dann leuchten beide Städte wieder. Ich mache euch ein Angebot: Nehmt meinen Smaragd, wann immer ihr wollt. Ich fahre so lange eure Kiste. Wechselt einfach, wenn ihr steht.'},
  {w:'leo',t:'Pass bloß gut auf Fidèle auf. Sie hat Gefühle.'}],
 tut:[{w:'narr',t:'Fahren: W A S D oder Pfeiltasten. Leertaste: Lichtstoß (kostet 5 Funken). C: Auto wechseln, wenn ihr steht. K: Karte. Am Handy: Tasten am Rand.'},
      {w:'narr',t:'Goldene Funken liegen überall auf den Straßen. Der goldene Lichtstrahl zeigt euer nächstes Ziel.'}],
 bruecke:[{w:'narr',img:IMG.bruecke,cap:'Pont des Lumières',t:'Unter der Brücke liegt das Tal, und auf der anderen Seite die Altstadt. Ihre Fenster leuchten noch.'},
  {w:'mira',img:IMG.bruecke,cap:'Pont des Lumières',t:'Schau! Da oben brennen noch Lichter. Weil hier jemand nicht aufgegeben hat.'},
  {w:'leo',t:'Genau wie wir. Komm, ich lade dich auf was ein. Die Bar mit dem lila Licht ist gleich hinter der Brücke.'}],
 bar:[{w:'narr',img:IMG.bar,cap:'Le Pont Violet',t:'Vor der kleinen Bar mit dem lila und blauen Licht halten sie an. Zwei Flaschen, ein kurzes Anstoßen.'},
  {w:'mira',img:IMG.bar,cap:'Le Pont Violet',t:'Auf Fidèle. Und auf alle, die noch Licht im Fenster haben.'},
  {w:'leo',t:'Lass uns noch zur Mauer über dem Grund fahren. Von dort sieht man die ganze Stadt.'}],
 abend:[{w:'narr',img:IMG.abend,cap:'Über dem Grund',t:'Sie stehen an der Mauer über dem Tal. Unten glänzt der Fluss, oben die Altstadt.'},
  {w:'leo',img:IMG.abend,cap:'Über dem Grund',t:'Eindhoven ist nicht weit. Einmal die A-Route der Lichter runter, dann sind wir da.'},
  {w:'mira',t:'Dann los. Der Lichtturm wartet.'}],
 ehv:[{w:'narr',t:'Willkommen in Eindhoven. Backsteinhäuser, ein Kanal, alte Fabrikhallen. Und mitten in der Stadt glüht der Himmel orange.'},
  {w:'val',t:'Das ist der Glutplatz. Dort fallen die meisten Funken, aber auch die meiste Glut. Passt auf euch auf.'}],
 glowStart:[{w:'mira',t:'Da oben! Die Kugeln fallen. Sammel so viele Funken wie du kannst, und weich den roten Ringen aus!'}],
 glowEnd:[{w:'narr',t:'Mitten auf dem Glutplatz hält Léo an und steigt aus. Um ihn herum schweben brennende Kugeln, still wie Laternen.'},
  {w:'leo',t:'Von Nahem sehen sie gar nicht bedrohlich aus. Eher wie Erinnerungen, die niemand mehr abholt.'},
  {w:'narr',img:IMG.glut,cap:'Der Glutplatz, Eindhoven',t:'Mira macht ein Foto von ihm. Es wird später ihr Lieblingsbild von dieser Reise.'},
  {w:'mira',img:IMG.glut,cap:'Der Glutplatz, Eindhoven',t:'Manchmal muss man stehen bleiben, um zu sehen, wie weit man schon gekommen ist. Komm, gleich geht die Sonne auf. Zum Lichtturm.'}],
 finale:[{w:'narr',t:'Der Morgen dämmert über Eindhoven. Vor dem Lichtturm hält Valère neben euch.'},
  {w:'val',t:'Respekt. Ihr habt mehr Funken gesammelt als irgendwer vor euch.'},
  {w:'val',t:'Also, letztes Angebot. Gebt mir die Funken, dann gehört der Smaragd euch, für immer. Oder ihr bringt sie in den Lichtturm, dann leuchten beide Städte wieder, und der Wagen bleibt bei mir.'},
  {w:'mira',t:'Léo?'},
  {w:'leo',t:'…',choices:[{label:'In den Lichtturm damit',fn:()=>ending(true)},{label:'Den Smaragd nehmen',fn:()=>ending(false)}]}],
 goodEnd:n=>[
  {w:'leo',t:'Danke, Valère. Aber Fidèle hat uns hierher gebracht. Sie bringt uns auch wieder nach Hause.'},
  {w:'val',t:'Ihr seid völlig verrückt. Wisst ihr das?'},
  {w:'narr',t:'Mira öffnet das Glas. '+n+' Funken steigen auf und fließen in den Lichtturm. Er strahlt so hell, dass man ihn bis nach Luxemburg sieht. Überall gehen die Fenster wieder an.'},
  {w:'val',t:'Eins noch. Ich habe ein Haus in Monte-Carlo, direkt am Hafen. Kommt im Sommer vorbei. Und bringt die Kiste mit.'},
  {w:'narr',img:IMG.monaco,cap:'Monte-Carlo, ein paar Monate später',t:'Und das haben sie gemacht. Dieses Foto ist der Beweis.'}],
 badEnd:[{w:'narr',t:'Die Funken wechseln den Besitzer. Der Smaragd schnurrt wie eine Katze. Hinter euch bleibt der Lichtturm dunkel.'},
  {w:'mira',t:'Er fährt sich toll. Er fühlt sich nur nach nichts an.'},
  {w:'leo',t:'Fidèle steht da hinten ganz allein. Das war falsch, oder?'}]
};
const BARKS_FREE=[['mira','Da vorne liegen Funken!'],['leo','Fidèle schnurrt heute richtig.'],['mira','Weißt du noch, wie wir hier das erste Mal lang gefahren sind?'],['val','Funk an Fidèle: Wie fährt sich mein Smaragd?']];
/* missions: target is resolved lazily from landmarks */
const MISSIONS=[
 {title:'Der Pont des Lumières',text:'Fahrt zur großen Bogenbrücke über das Tal.',target:()=>LM.bridge,r:16,lines:'bruecke',time:19.2},
 {title:'Le Pont Violet',text:'Die kleine Bar mit dem lila Licht, gleich hinter der Brücke.',target:()=>({x:LM.bar.x,z:LM.bar.z}),r:12,lines:'bar',time:21.6},
 {title:'Über dem Grund',text:'Fahrt zur Aussichtsmauer am Rand der Altstadt.',target:()=>LM.view,r:13,lines:'abend',time:22.4},
 {title:'Die A-Route der Lichter',text:'Nehmt die Autobahn Richtung Osten nach Eindhoven.',target:()=>({x:MOTORWAY.x1,z:0}),r:22,lines:'ehv',time:23.6},
 {title:'GLOW: Der Glutplatz',text:'Fahrt zum Glutplatz im Zentrum von Eindhoven.',target:()=>({x:LM.glow.x,z:LM.glow.z0-6}),r:18,lines:'glowStart',time:0.6,event:'glow'},
 {title:'Der Lichtturm',text:'Bringt die Funken zum Lichtturm.',target:()=>({x:LM.licht.x,z:LM.licht.z-42}),r:18,lines:'finale',time:5.9,finale:true}
];
