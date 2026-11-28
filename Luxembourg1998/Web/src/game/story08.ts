// Mission 08 "Millennium": Texte. Alle Personen fiktiv; luxemburgische Saetze von Muttersprachlern pruefen lassen.
import type { Lang, Line } from './story';

const T = (who: string, lb: string, de: string, fr: string, en: string): Line => ({ who, lb, de, fr, en });

export const OBJ08: Record<string, Record<Lang, string>> = {
  wait: { de: 'Zu Hause: die Monate bis Dezember vergehen lassen (Zuhause-Menü)', fr: 'À la maison : laisser passer les mois jusqu’en décembre (menu maison)', en: 'At home: let the months pass until December (home menu)' },
  conversations_future: { de: 'Über die Zukunft reden: Euro, Millennium-Bug, eigene Pläne – mit Jang (Place d’Armes), Tom (Pixel), Mia oder Herrn Muller', fr: 'Parler de l’avenir : euro, bug de l’an 2000, projets – avec Jang (place d’Armes), Tom (Pixel), Mia ou M. Muller', en: 'Talk about the future: the euro, the millennium bug, plans – with Jang (Place d’Armes), Tom (Pixel), Mia or Mr Muller' },
  final_choice: { de: 'Silvester: am 31. Dezember ab 22 Uhr zu Jang auf die Place d’Armes', fr: 'Saint-Sylvestre : le 31 décembre dès 22 h, rejoindre Jang place d’Armes', en: 'New Year’s Eve: from 10 pm on 31 December, meet Jang at Place d’Armes' },
  done: { de: 'Ende des ersten Kapitels. Freies Spiel im Jahr 1999 – das zweite Kapitel folgt.', fr: 'Fin du premier chapitre. Jeu libre en 1999 – le deuxième chapitre suivra.', en: 'End of chapter one. Free roam in 1999 – chapter two will follow.' },
};

export const MONTAGE = [
  T('', 'Mee, Juni, Juli … D’Stad gëtt méi waarm, d’Terrassen am Gronn si voll.', 'Mai, Juni, Juli … Die Stadt wird wärmer, die Terrassen im Grund sind voll.', 'Mai, juin, juillet … La ville se réchauffe, les terrasses du Grund sont pleines.', 'May, June, July … The city warms up, the terraces in the Grund are full.'),
  T('', 'Am Hierscht falen d’Blieder an der Pétrusse. Du schaffs, du spuers, du kenns d’Stad nees.', 'Im Herbst fallen die Blätter im Pétrusse-Tal. Du arbeitest, du sparst, du kennst die Stadt wieder.', 'En automne, les feuilles tombent dans la vallée de la Pétrusse. Tu travailles, tu économises, tu reconnais la ville.', 'In autumn the leaves fall in the Pétrusse valley. You work, you save, you know the city again.'),
  T('', 'Dezember 1998. Iwwerall schwätzen d’Leit vum Euro – a vum Joer 2000.', 'Dezember 1998. Überall reden die Leute vom Euro – und vom Jahr 2000.', 'Décembre 1998. Partout, on parle de l’euro – et de l’an 2000.', 'December 1998. Everyone is talking about the euro – and the year 2000.'),
];

export const TALK = {
  jang: [
    T('Jang', 'De Chrëschtmaart! Wéi fréier. Weess de, ab Januar ass den Euro do – fir d’éischt nëmmen op der Bank, mee awer.', 'Der Weihnachtsmarkt! Wie früher. Weißt du, ab Januar gibt es den Euro – erst nur auf der Bank, aber trotzdem.', 'Le marché de Noël ! Comme avant. Tu sais, dès janvier il y a l’euro – d’abord seulement à la banque, mais quand même.', 'The Christmas market! Like old times. You know, from January there’s the euro – only at the bank at first, but still.'),
    T('Jang', 'Ech hunn eng Iddi fir d’nächst Joer. Komm Silvester op d’Place d’Armes, da schwätze mer.', 'Ich habe eine Idee fürs nächste Jahr. Komm Silvester auf die Place d’Armes, dann reden wir.', 'J’ai une idée pour l’an prochain. Viens à la Saint-Sylvestre place d’Armes, on en parlera.', 'I have an idea for next year. Come to Place d’Armes on New Year’s Eve, we’ll talk.'),
  ],
  tom: [
    T('Tom', 'Millennium-Bug! All d’Computeren, déi d’Joer mat zwou Zifferen späicheren, mengen um 1. Januar 2000, et wier 1900.', 'Millennium-Bug! Alle Computer, die das Jahr mit zwei Ziffern speichern, glauben am 1. Januar 2000, es sei 1900.', 'Le bug de l’an 2000 ! Tous les ordinateurs qui stockent l’année sur deux chiffres croiront le 1er janvier 2000 qu’on est en 1900.', 'The millennium bug! Every computer that stores the year in two digits will think on 1 January 2000 that it’s 1900.'),
    T('Tom', 'Ech hu Wochen dermat ze dinn, Programmer ze flécken. Gutt fir mäi Portmonni – a mäin Diplom ass endlech ofginn!', 'Ich habe wochenlang zu tun, Programme zu flicken. Gut für meinen Geldbeutel – und mein Diplom ist endlich abgegeben!', 'J’en ai pour des semaines à corriger des programmes. Bon pour mon porte-monnaie – et mon diplôme est enfin rendu !', 'I’ll be patching programs for weeks. Good for my wallet – and my thesis is finally handed in!'),
  ],
  mia: [
    T('Mia', 'Ech hunn d’ganzt Joer d’Stad fotograféiert. Wann ech d’Biller nebeneneen leeën, gesäis de, wéi séier sech alles ännert.', 'Ich habe das ganze Jahr die Stadt fotografiert. Wenn ich die Bilder nebeneinanderlege, sieht man, wie schnell sich alles ändert.', 'J’ai photographié la ville toute l’année. Quand je mets les photos côte à côte, on voit à quel point tout change vite.', 'I photographed the city all year. When I put the pictures side by side, you see how fast everything changes.'),
    T('Mia', 'Ech dreemen vun engem eegene Studio. Mee eleng? Schwiereg.', 'Ich träume von einem eigenen Studio. Aber allein? Schwierig.', 'Je rêve d’un studio à moi. Mais seule ? Difficile.', 'I dream of my own studio. But alone? Hard.'),
  ],
  muller: [
    T('Här Muller', 'Den Euro? Ech muss all meng Präislëschte nei maachen. Véierzeg Frang, dräihonnertdrësseg … wien soll dat rechnen!', 'Der Euro? Ich muss alle meine Preislisten neu machen. Vierzig Franken, dreihundertdreißig … wer soll das rechnen!', 'L’euro ? Je dois refaire toutes mes listes de prix. Quarante francs, trois cent trente … qui va calculer ça !', 'The euro? I have to redo all my price lists. Forty francs, three hundred thirty … who’s going to work that out!'),
    T('Här Muller', 'Ech ginn net méi jonk. Iergendwann brauch d’Garage een, deen se iwwerhëlt.', 'Ich werde nicht jünger. Irgendwann braucht die Werkstatt jemanden, der sie übernimmt.', 'Je ne rajeunis pas. Un jour, le garage aura besoin de quelqu’un pour le reprendre.', 'I’m not getting any younger. Someday the garage will need someone to take it over.'),
  ],
  notYet: [T('Jang', 'Silvester, Place d’Armes, ab zéng Auer. Vergiess et net!', 'Silvester, Place d’Armes, ab zehn Uhr. Vergiss es nicht!', 'Saint-Sylvestre, place d’Armes, dès dix heures. N’oublie pas !', 'New Year’s Eve, Place d’Armes, from ten. Don’t forget!')],
  eve: [
    T('Jang', 'Do bass de jo! Kuck, wéi vill Leit. Nach e puer Minutten bis 1999.', 'Da bist du ja! Schau, wie viele Leute. Noch ein paar Minuten bis 1999.', 'Te voilà ! Regarde tout ce monde. Encore quelques minutes avant 1999.', 'There you are! Look at all the people. A few more minutes till 1999.'),
    T('Jang', 'Mäi Plang: ech wëll eppes Eegenes ufänken. Mat dir. Wat mengs du – wat maache mir am nächste Joer?', 'Mein Plan: Ich will etwas Eigenes anfangen. Mit dir. Was meinst du – was machen wir nächstes Jahr?', 'Mon plan : je veux lancer quelque chose à moi. Avec toi. Qu’en penses-tu – que fait-on l’an prochain ?', 'My plan: I want to start something of my own. With you. What do you think – what do we do next year?'),
  ],
  choice: T('Jang', 'Also?', 'Also?', 'Alors ?', 'So?'),
  midnight: [T('', 'Zéng … néng … aacht … – Prost Neijoer! Äddi 1998.', 'Zehn … neun … acht … – Frohes neues Jahr! Adieu 1998.', 'Dix … neuf … huit … – Bonne année ! Adieu 1998.', 'Ten … nine … eight … – Happy New Year! Goodbye 1998.')],
  missed: [T('Äntwerter', 'Jang hei … Du waars net do, Silvester. Ech hunn op dech gewaart. Melle dech, wann s de wëlls.', 'Jang hier … Du warst nicht da, an Silvester. Ich habe auf dich gewartet. Melde dich, wenn du willst.', 'Ici Jang … Tu n’étais pas là à la Saint-Sylvestre. Je t’ai attendu. Appelle-moi si tu veux.', 'Jang here … You weren’t there on New Year’s Eve. I waited for you. Call me if you want.')],
};

export const FINAL_OPTIONS = {
  garage: { de: 'Mit Jang eine eigene Werkstatt aufmachen', fr: 'Ouvrir un garage avec Jang', en: 'Open a garage with Jang' },
  studio: { de: 'Mit Mia und Jang ein Fotostudio gründen', fr: 'Fonder un studio photo avec Mia et Jang', en: 'Found a photo studio with Mia and Jang' },
  stay: { de: 'Bleiben, wie es ist – arbeiten und sparen', fr: 'Rester ainsi – travailler et économiser', en: 'Keep things as they are – work and save' },
  leave: { de: 'Wieder ins Ausland gehen', fr: 'Repartir à l’étranger', en: 'Go abroad again' },
};
