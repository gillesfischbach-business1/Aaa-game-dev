/* ===== Story: Léo, Mira, their van Fidèle and Valère's green hypercar =====
   A line: {w: speaker, t: text, img?: photo shown as a story card, cap?: caption} */
const NAMES={leo:'Léo',mira:'Mira',val:'Valère',narr:''};
const IMG={belval:'assets/panel_belval.jpg',bruecke:'assets/panel_bruecke.jpg',bar:'assets/panel_bar.jpg',abend:'assets/panel_abend.jpg',glut:'assets/glutplatz.jpg',monaco:'assets/monaco.jpg'};
const STORY={
 prologue:[
  {w:'narr',img:IMG.belval,cap:'Belval, ein Abend im November',t:'Seit dem Großen Erlöschen fällt Glut vom Himmel. Straße für Straße gehen die Lichter aus.'},
  {w:'narr',img:IMG.belval,cap:'Belval, ein Abend im November',t:'Léo und Mira stehen mit Fidèle, ihrem alten weißen Lieferwagen, vor der Belval Plaza. Mira macht ein Foto. Wie immer.'},
  {w:'narr',t:'Da hält neben ihnen ein Wagen, den es eigentlich nicht geben dürfte. Smaragdgrün, goldene Felgen, ein Kennzeichen: VH 3107.'},
  {w:'val',t:'Ihr seid die beiden mit dem Lieferwagen? Ich habe gehört, ihr wollt ans Meer. Nach Monte-Carlo, zum alten Leuchtfeuer.'},
  {w:'mira',t:'Wir sammeln Funken. Wenn genug zusammenkommen, brennt das Leuchtfeuer wieder. So sagt man jedenfalls.'},
  {w:'val',t:'Dann machen wir eine Wette. Ihr fahrt, womit ihr wollt: euren Fidèle oder meinen Smaragd. Ich nehme den anderen. Wer am Hafen die meisten Funken hat, entscheidet, was mit ihnen passiert.'},
  {w:'leo',t:'Du willst freiwillig mit Fidèle fahren?'},
  {w:'val',t:'Ich wollte schon immer wissen, wie es sich anfühlt, wenn ein Motor hustet.'},
  {w:'mira',t:'Pass bloß gut auf sie auf. Sie hat Gefühle.'}],
 tut:[{w:'narr',t:'Lenken: ← → oder A / D. Gas und Bremse: ↑ ↓ oder W / S. Am Handy: Tasten unten. Sammelt goldene Funken. Rote Ringe auf der Straße zeigen, wo Glut einschlägt.'},
      {w:'narr',t:'Lichtstoß (Leertaste): kurz unverwundbar und schneller. Er kostet Funken, die euch am Ende fehlen. Vor jedem Kapitel wählt ihr euer Auto neu.'}],
 ch1end:[
  {w:'narr',img:IMG.bruecke,cap:'Auf dem Weg nach Luxemburg',t:'Hinter den Hochöfen wird es Nacht. Vor ihnen taucht die Altstadt auf, hoch über dem Tal, und sie leuchtet noch.'},
  {w:'mira',img:IMG.bruecke,cap:'Auf dem Weg nach Luxemburg',t:'Schau! Da oben brennen noch Lichter. Fahr über die Brücke, Léo!'},
  {w:'leo',t:'Weil hier jemand nicht aufgegeben hat. Genau wie wir.'}],
 ch2end:[
  {w:'narr',img:IMG.bar,cap:'Die Bar mit dem lila Licht',t:'Vor der kleinen Bar mit dem lila und blauen Licht halten sie an. Zwei Flaschen, ein kurzes Anstoßen.'},
  {w:'mira',img:IMG.bar,cap:'Die Bar mit dem lila Licht',t:'Auf Fidèle. Und auf alle, die noch Licht im Fenster haben.'},
  {w:'narr',img:IMG.abend,cap:'Über dem Grund',t:'Später stehen sie an der Mauer über dem Tal. Der Himmel glüht, die Stadt liegt unter ihnen.'},
  {w:'leo',img:IMG.abend,cap:'Über dem Grund',t:'Hinter dem nächsten Hügel liegt der Glutplatz. Dort fällt das Feuer am dichtesten.'},
  {w:'mira',t:'Dann fahren wir mitten hindurch. Zusammen.'}],
 ch3end:[
  {w:'narr',t:'Mitten auf dem Glutplatz hält Léo an und steigt aus. Um ihn herum schweben brennende Kugeln, still wie Laternen.'},
  {w:'leo',t:'Von Nahem sehen sie gar nicht bedrohlich aus. Eher wie Erinnerungen, die niemand mehr abholt.'},
  {w:'narr',img:IMG.glut,cap:'Der Glutplatz',t:'Mira macht ein Foto von ihm. Es wird später ihr Lieblingsbild von dieser Reise.'},
  {w:'mira',img:IMG.glut,cap:'Der Glutplatz',t:'Manchmal muss man stehen bleiben, um zu sehen, wie weit man schon gekommen ist. Komm. Das Meer wartet.'}],
 finale:[
  {w:'narr',t:'Monte-Carlo. Die Sonne sinkt ins Meer, die Yachten im Hafen glänzen. Am Ende der Promenade steht das alte Leuchtfeuer, dunkel und kalt.'},
  {w:'val',t:'Respekt. Ihr habt es geschafft. Und ich gebe zu: Mehr Funken als ich habt ihr auch.'},
  {w:'val',t:'Also, Wettschulden. Ihr könnt die Funken mir geben, dann gehört der Smaragd euch. Für immer. Oder ihr steckt sie ins Leuchtfeuer, dann bekommt der Hafen sein Licht zurück und der Wagen bleibt bei mir.'},
  {w:'mira',t:'Léo?'},
  {w:'leo',t:'…',choices:[{label:'Ins Leuchtfeuer damit',fn:()=>ending(true)},{label:'Den Smaragd nehmen',fn:()=>ending(false)}]}],
 goodEnd:n=>[
  {w:'leo',t:'Danke, Valère. Aber Fidèle hat uns hierher gebracht. Sie bringt uns auch wieder nach Hause.'},
  {w:'val',t:'Ihr seid völlig verrückt. Wisst ihr das?'},
  {w:'mira',t:'Schon möglich. Aber schau.'},
  {w:'narr',t:'Mira öffnet das Glas. '+n+' Funken steigen auf, tanzen über das Wasser und fließen in das alte Leuchtfeuer. Am Hang gehen die Fenster an, eines nach dem anderen.'},
  {w:'narr',img:IMG.monaco,cap:'Monte-Carlo, genau in diesem Moment',t:'Bevor sie weiterfahren, stellen sich Léo und Mira noch einmal vor den grünen Wagen. Ein letztes Foto. Dieses hier.'}],
 badEnd:[
  {w:'narr',t:'Die Funken wechseln den Besitzer. Der Smaragd schnurrt wie eine Katze. Hinter euch bleibt das Leuchtfeuer dunkel.'},
  {w:'mira',t:'Er fährt sich toll. Er fühlt sich nur nach nichts an.'},
  {w:'leo',t:'Fidèle steht da hinten ganz allein. Das war falsch, oder?'}]
};
const BARKS=[
 [[0.12,'mira','Die Hochöfen. Früher haben sie Stahl gemacht, heute halten sie nur noch die Kälte fern.'],[0.4,'leo','Achtung, da vorne fällt was vom Himmel!'],[0.7,'val','Euer Fidèle zieht nach links. Ist das Absicht?']],
 [[0.15,'mira','Die Brücke! Von hier oben sieht die Stadt aus wie ein Schmuckkästchen.'],[0.42,'leo','Vorsicht, liegengebliebene Autos. Nicht jeder hatte so viel Glück wie wir.'],[0.72,'mira','Lila und blau. Da vorne ist unsere Bar!']],
 [[0.12,'leo','Bleib dicht bei mir, okay? Ich meine, du sitzt eh neben mir, aber trotzdem.'],[0.4,'mira','Der Regen zischt auf der Glut. Einfach weiterfahren!'],[0.72,'val','Ich hätte nie gedacht, dass ich mal einen Lieferwagen vermisse.']],
 [[0.1,'mira','Das Meer! Léo, wir sind fast da.'],[0.38,'val','Letzte Gerade. Mal sehen, wer zuerst am Leuchtfeuer ist.'],[0.7,'leo','Schau dir die Yachten an. Und trotzdem gehen hier die Lichter aus.']]
];
const CH_NAMES=[{sub:'Kapitel I',name:'Die Hochöfen von Belval'},{sub:'Kapitel II',name:'Die Stadt der Brücken'},{sub:'Kapitel III',name:'Der Glutplatz'},{sub:'Kapitel IV',name:'Monte-Carlo'}];
