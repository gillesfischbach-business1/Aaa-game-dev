import type { MissionDef } from '../core/missions';
import type { PayphoneTariff } from '../core/comms';

// Alle Personen, Nummern, Adressen und Firmen sind FIKTIV (Kategorie D).
// Luxemburgische Saetze: vor Veroeffentlichung von Muttersprachlern pruefen lassen.

export type Lang = 'de' | 'fr' | 'en';
export interface Line { who: string; lb: string; de: string; fr: string; en: string }

export const START = { date: { year: 1998, month: 4, day: 20 }, hour: 7.75 };  // Mo 20.04.1998 07:45
export const START_MONEY = { cash: 3500, bank: 12000 };  // Spielbalance, keine historische Angabe

// Telefonzelle: Testtarif (Kategorie D, Platzhalter bis P&T-Tarife 1998 belegt sind)
export const PAYPHONE_TARIFF: PayphoneTariff = { pricePerUnit: 10, secondsPerUnitLocal: 120, minimumInsert: 10 };
// Muenzen in LUF (Nennwerte 1, 5, 20, 50 – vor Ausbau gegen Quellen pruefen)
export const COINS = [5, 20, 50];

export const NUMBERS = {
  home: '44 71 98',   // eigener Anschluss in der Wohnung (mit Anrufbeantworter)
  garage: '49 33 05',
  parts: '40 77 12',
  jang: '48 61 27',
  weis: '22 45 90',
  taxi: '48 00 48',
  pizza: '40 12 33',
  time: '1 21',
};

export const PHONEBOOK = [
  { number: NUMBERS.jang, name: 'Hoffmann, Jang', address: 'Rue fictive 12, Ville Haute', district: 'Ville Haute' },
  { number: NUMBERS.weis, name: 'Weis, Immobilien (Madame Weis)', address: 'Avenue de la Liberté (fiktive Hausnr.)', district: 'Gare', isBusiness: true },
  { number: NUMBERS.taxi, name: 'Taxi Stad (fiktiv)', address: '—', district: 'Gare', isBusiness: true },
  { number: NUMBERS.pizza, name: 'Pizzeria Bella Pétrusse (fiktiv)', address: 'Rue fictive 3, Gare', district: 'Gare', isBusiness: true },
  { number: NUMBERS.time, name: 'Zäitansoen (Zeitansage)', address: '—', district: '—', isBusiness: true },
  { number: NUMBERS.garage, name: 'Garage Muller (fiktiv)', address: "Rue de l'Abattoir (fiktive Hausnr.), Hollerich", district: 'Hollerich', isBusiness: true },
  { number: NUMBERS.parts, name: 'Autosdeeler Wagner (fiktiv)', address: "Route d'Esch (fiktive Hausnr.), Hollerich", district: 'Hollerich', isBusiness: true },
  { number: NUMBERS.home, name: 'Kremer (eigene Wohnung)', address: 'Avenue de la Liberté, 3. Stock', district: 'Gare' },
];

export const M01: MissionDef = {
  id: 'M01_ZERECK_AN_DSTAD',
  objectives: [
    { id: 'arrive_station', isCheckpoint: true },
    { id: 'call_friend' },
    { id: 'get_key', isCheckpoint: true },
    { id: 'find_car' },
    { id: 'visit_friend' },
  ],
  failConditions: ['car_wrecked'],
};

export const OBJECTIVE_TEXT: Record<string, { de: string; fr: string; en: string }> = {
  arrive_station: { de: 'Am Bahnhof ankommen', fr: 'Arriver à la gare', en: 'Arrive at the station' },
  call_friend: { de: 'Jang aus der Telefonzelle vor dem Bahnhof anrufen (Nummer im Notizbuch)', fr: 'Appeler Jang depuis la cabine devant la gare (numéro dans le carnet)', en: 'Call Jang from the phone booth outside the station (number in notebook)' },
  get_key: { de: 'Schlüssel bei Madame Weis abholen – Avenue de la Liberté', fr: 'Récupérer les clés chez Madame Weis – avenue de la Liberté', en: 'Pick up the keys from Madame Weis – Avenue de la Liberté' },
  find_car: { de: 'Onkels alten Wagen an der Place de Paris finden', fr: 'Trouver la vieille voiture de l’oncle place de Paris', en: "Find your uncle's old car at Place de Paris" },
  visit_friend: { de: 'Zu Jang fahren – Place d’Armes in der Oberstadt', fr: 'Rejoindre Jang – place d’Armes, Ville Haute', en: 'Drive to Jang – Place d’Armes, upper town' },
  done: { de: 'Freies Spiel: Stadt erkunden. Fortsetzung folgt.', fr: 'Jeu libre : explorer la ville. Suite à venir.', en: 'Free roam: explore the city. More to come.' },
  // Mission 02
  listen_message: { de: 'Jang wollte anrufen – später den Anrufbeantworter in der Wohnung abhören (Avenue de la Liberté)', fr: 'Jang voulait appeler – écouter plus tard le répondeur à l’appartement (avenue de la Liberté)', en: 'Jang said he’d call – check the answering machine at the flat later (Avenue de la Liberté)' },
  meet_contact: { de: 'Zur Garage Muller in Hollerich (Rue de l’Abattoir) – rechtzeitig!', fr: 'Aller au garage Muller à Hollerich (rue de l’Abattoir) – à l’heure !', en: 'Go to Garage Muller in Hollerich (Rue de l’Abattoir) – on time!' },
  'group:trial': { de: 'Probearbeit: Bremse am Kombi reparieren (Werkbank in der Garage)', fr: 'Essai : réparer les freins du break (établi au garage)', en: 'Trial job: fix the estate car’s brakes (workbench at the garage)' },
  buy_parts: { de: 'Bremsteile beim Autosdeeler Wagner an der Route d’Esch kaufen (ca. 1 800 F)', fr: 'Acheter les pièces chez Wagner, route d’Esch (env. 1 800 F)', en: 'Buy brake parts at Wagner’s on Route d’Esch (about 1,800 F)' },
  test_drive: { de: 'Probefahrt: an den Pylonen vorbei (Route d’Esch – Rond-Point Merl) und zurück zur Garage', fr: 'Essai routier : passer les cônes (route d’Esch – rond-point Merl) et revenir au garage', en: 'Test drive: pass the cones (Route d’Esch – Rond-Point Merl) and return to the garage' },
  report_to_owner: { de: 'Herrn Muller Bericht erstatten', fr: 'Faire le rapport à Monsieur Muller', en: 'Report to Mr Muller' },
  done02: { de: 'Probearbeit erledigt. Freies Spiel – weitere Missionen folgen.', fr: 'Essai terminé. Jeu libre – d’autres missions suivront.', en: 'Trial job done. Free roam – more missions to come.' },
};

export const DIALOGUE = {
  intro: [
    { who: '', lb: 'Lëtzebuerg, Gare. Méindeg, den 20. Abrëll 1998.', de: 'Luxemburg, Bahnhof. Montag, 20. April 1998.', fr: 'Luxembourg, gare. Lundi 20 avril 1998.', en: 'Luxembourg, station. Monday, 20 April 1998.' },
    { who: '', lb: 'No Joren am Ausland bass de erëm hei. E Koffer, e bësse Geld, an eng Telefonsnummer am Carnet.', de: 'Nach Jahren im Ausland bist du zurück. Ein Koffer, etwas Geld und eine Telefonnummer im Notizbuch.', fr: 'Après des années à l’étranger, te revoilà. Une valise, un peu d’argent et un numéro dans le carnet.', en: 'After years abroad, you are back. A suitcase, a little money and a phone number in your notebook.' },
  ] as Line[],
  callJang: [
    { who: 'Jang', lb: 'Hoffmann, allo?', de: 'Hoffmann, hallo?', fr: 'Hoffmann, allô ?', en: 'Hoffmann, hello?' },
    { who: 'Jang', lb: 'Neen! Bass du dat? Du bass erëm zeréck an der Stad? Wëllkomm doheem!', de: 'Nein! Bist du das? Du bist wieder in der Stadt? Willkommen zu Hause!', fr: 'Non ! C’est toi ? Tu es de retour en ville ? Bienvenue à la maison !', en: 'No way! Is that you? You’re back in town? Welcome home!' },
    { who: 'Jang', lb: 'Gëff bei der Madame Weis laanscht, Avenue de la Liberté. Si huet de Schlëssel fir deng Wunneng – an och dee vum Monni sengem Auto.', de: 'Geh bei Madame Weis vorbei, Avenue de la Liberté. Sie hat den Schlüssel für deine Wohnung – und auch den für das Auto deines Onkels.', fr: 'Passe chez Madame Weis, avenue de la Liberté. Elle a la clé de ton appartement – et celle de la voiture de ton oncle.', en: 'Stop by Madame Weis on Avenue de la Liberté. She has the key to your flat – and the one for your uncle’s car.' },
    { who: 'Jang', lb: 'Duerno komm op d’Place d’Armes. Ech waarden do op dech. Bis gläich!', de: 'Danach komm zur Place d’Armes. Ich warte dort auf dich. Bis gleich!', fr: 'Ensuite, viens place d’Armes. Je t’y attends. À tout de suite !', en: 'Then come to Place d’Armes. I’ll wait for you there. See you soon!' },
  ] as Line[],
  weis: [
    { who: 'Madame Weis', lb: 'Moien! Dir sidd dann d’Famill vum Här Kremer? Mäi Bäileed nach emol.', de: 'Guten Tag! Sie sind also die Familie von Herrn Kremer? Nochmals mein Beileid.', fr: 'Bonjour ! Vous êtes donc de la famille de Monsieur Kremer ? Encore toutes mes condoléances.', en: 'Hello! So you are Mr Kremer’s family? My condolences once more.' },
    { who: 'Madame Weis', lb: 'Hei ass de Schlëssel. D’Wunneng ass am drëtte Stack. An dat hei sinn d’Autosschlësselen – den Auto steet op der Place de Paris.', de: 'Hier ist der Schlüssel. Die Wohnung ist im dritten Stock. Und das sind die Autoschlüssel – der Wagen steht an der Place de Paris.', fr: 'Voici la clé. L’appartement est au troisième étage. Et voici les clés de la voiture – elle est garée place de Paris.', en: 'Here is the key. The flat is on the third floor. And these are the car keys – it’s parked at Place de Paris.' },
    { who: 'Madame Weis', lb: 'Fuert virsiichteg. D’Stad ass net méi déi selwecht wéi fréier – iwwerall gëtt gebaut.', de: 'Fahren Sie vorsichtig. Die Stadt ist nicht mehr dieselbe wie früher – überall wird gebaut.', fr: 'Conduisez prudemment. La ville n’est plus la même qu’avant – on construit partout.', en: 'Drive carefully. The city isn’t what it used to be – they’re building everywhere.' },
  ] as Line[],
  car: [
    { who: '', lb: 'De Monni säin ale Won. Silwer, e bëssen Rascht, awer hie leeft nach.', de: 'Der alte Wagen des Onkels. Silbern, etwas Rost, aber er läuft noch.', fr: 'La vieille voiture de l’oncle. Argentée, un peu rouillée, mais elle roule encore.', en: 'Your uncle’s old car. Silver, a little rust, but it still runs.' },
  ] as Line[],
  jangMeet: [
    { who: 'Jang', lb: 'Do bass de jo! Lass mech dech kucken – du hues dech guer net verännert.', de: 'Da bist du ja! Lass dich ansehen – du hast dich gar nicht verändert.', fr: 'Te voilà ! Laisse-moi te regarder – tu n’as pas changé du tout.', en: 'There you are! Let me look at you – you haven’t changed a bit.' },
    { who: 'Jang', lb: 'Hei, fir den Ufank: zweedausend Frang. Du gëss se mer zeréck, wann s de eng Aarbecht hues.', de: 'Hier, für den Anfang: zweitausend Franken. Du gibst sie mir zurück, wenn du Arbeit hast.', fr: 'Tiens, pour commencer : deux mille francs. Tu me les rendras quand tu auras du travail.', en: 'Here, to get started: two thousand francs. Pay me back once you’ve found work.' },
    { who: 'Jang', lb: 'Ech kennen een an enger Garage zu Hollerich. Ech ruff dech un. Elo gi mer awer fir d’éischt e Kaffi drénken.', de: 'Ich kenne jemanden in einer Werkstatt in Hollerich. Ich ruf dich an. Aber jetzt trinken wir erst mal einen Kaffee.', fr: 'Je connais quelqu’un dans un garage à Hollerich. Je t’appellerai. Mais d’abord, allons boire un café.', en: 'I know someone at a garage in Hollerich. I’ll call you. But first, let’s grab a coffee.' },
  ] as Line[],
  taxi: [{ who: 'Taxi Stad', lb: 'Taxi Stad, gudde Moien. All eis Won sinn de Moment ënnerwee – probéiert et méi spéit nach emol.', de: 'Taxi Stad, guten Morgen. Alle Wagen sind gerade unterwegs – versuchen Sie es später noch einmal.', fr: 'Taxi Stad, bonjour. Toutes nos voitures sont en route – rappelez plus tard.', en: 'Taxi Stad, good morning. All our cars are out – please try again later.' }] as Line[],
  pizza: [{ who: 'Pizzeria', lb: 'Pizzeria Bella Pétrusse, buongiorno! Mir maachen eréischt um hallwer zwielef op.', de: 'Pizzeria Bella Pétrusse, buongiorno! Wir öffnen erst um halb zwölf.', fr: 'Pizzeria Bella Pétrusse, buongiorno ! Nous n’ouvrons qu’à onze heures et demie.', en: 'Pizzeria Bella Pétrusse, buongiorno! We only open at half past eleven.' }] as Line[],
  noAnswer: [{ who: '', lb: '… Et mellt keen sech.', de: '… Niemand meldet sich.', fr: '… Personne ne répond.', en: '… Nobody answers.' }] as Line[],
  invalid: [{ who: '', lb: '„Kee Clientsanschloss ënner dëser Nummer.“', de: '„Kein Anschluss unter dieser Nummer.“', fr: '« Il n’y a pas d’abonné au numéro demandé. »', en: '“The number you have dialled is not in service.”' }] as Line[],
  busy: [{ who: '', lb: 'Besat.', de: 'Besetzt.', fr: 'Occupé.', en: 'Busy.' }] as Line[],
};

export const DIALOGUE02 = {
  machineEmpty: [{ who: 'Äntwerter', lb: 'Dir hutt keng nei Noriichten.', de: 'Sie haben keine neuen Nachrichten.', fr: 'Vous n’avez pas de nouveau message.', en: 'You have no new messages.' }] as Line[],
  jangMessage: [
    { who: 'Äntwerter', lb: 'Dir hutt eng nei Noriicht.', de: 'Sie haben eine neue Nachricht.', fr: 'Vous avez un nouveau message.', en: 'You have one new message.' },
    { who: 'Jang', lb: 'Moien, ech sinn et. Ech hu mam Här Muller geschwat – Garage Muller zu Hollerich, Rue de l’Abattoir.', de: 'Hallo, ich bin’s. Ich habe mit Herrn Muller gesprochen – Garage Muller in Hollerich, Rue de l’Abattoir.', fr: 'Salut, c’est moi. J’ai parlé à Monsieur Muller – garage Muller à Hollerich, rue de l’Abattoir.', en: 'Hi, it’s me. I talked to Mr Muller – Garage Muller in Hollerich, Rue de l’Abattoir.' },
    { who: 'Jang', lb: 'Hie gëtt dir eng Chance fir eng Prouf. Mee pass op: hien ass streng mat der Zäit. Gëff séier laanscht!', de: 'Er gibt dir eine Chance zur Probearbeit. Aber pass auf: Er ist streng mit der Zeit. Geh bald vorbei!', fr: 'Il te donne une chance pour un essai. Mais attention : il est strict sur l’heure. Passe vite !', en: 'He’ll give you a trial. But careful: he’s strict about time. Go by soon!' },
  ] as Line[],
  mullerClosed: [{ who: '', lb: 'Op der Dier: „Garage Muller – Méindeg bis Freideg 8–18 Auer, Samschdeg 8–12 Auer.“', de: 'An der Tür: „Garage Muller – Montag bis Freitag 8–18 Uhr, Samstag 8–12 Uhr.“', fr: 'Sur la porte : « Garage Muller – du lundi au vendredi 8 h–18 h, samedi 8 h–12 h. »', en: 'On the door: “Garage Muller – Mon–Fri 8 am–6 pm, Sat 8 am–noon.”' }] as Line[],
  mullerLate: [
    { who: 'Här Muller', lb: 'Elo kommt Dir? Ech hat gesot, Dir sollt séier kommen. Esou eppes hunn ech net gär.', de: 'Jetzt kommen Sie? Ich hatte gesagt, Sie sollen bald kommen. So etwas mag ich nicht.', fr: 'Vous arrivez maintenant ? J’avais dit de venir vite. Je n’aime pas ça.', en: 'Now you show up? I said come soon. I don’t like that.' },
    { who: 'Här Muller', lb: 'Kommt muer de Moien um néng Auer. Dat ass Är lescht Chance.', de: 'Kommen Sie morgen früh um neun. Das ist Ihre letzte Chance.', fr: 'Revenez demain matin à neuf heures. C’est votre dernière chance.', en: 'Come back tomorrow at nine. That’s your last chance.' },
  ] as Line[],
  mullerJob: [
    { who: 'Här Muller', lb: 'Dir sidd dem Jang säi Frënd? Gutt. Ech hu keng Zäit fir vill Gespréich.', de: 'Sie sind Jangs Freund? Gut. Ich habe keine Zeit für lange Gespräche.', fr: 'Vous êtes l’ami de Jang ? Bien. Je n’ai pas le temps pour de longues discussions.', en: 'You’re Jang’s friend? Good. I don’t have time for long chats.' },
    { who: 'Här Muller', lb: 'Dee roude Kombi do – d’Bremse virun quietschen a ruppen. D’Madame Schroeder brauch en den Owend.', de: 'Der rote Kombi da – die Vorderbremsen quietschen und rubbeln. Frau Schroeder braucht ihn heute Abend.', fr: 'Ce break rouge là – les freins avant grincent et broutent. Madame Schroeder en a besoin ce soir.', en: 'That red estate car – the front brakes squeal and judder. Mrs Schroeder needs it tonight.' },
  ] as Line[],
  mullerChoice: { who: 'Här Muller', lb: 'Wéi wëllt Dir et maachen?', de: 'Wie wollen Sie es machen?', fr: 'Comment voulez-vous faire ?', en: 'How do you want to do it?' } as Line,
  mullerHonest: [{ who: 'Här Muller', lb: 'Richteg esou. D’Deeler kritt Dir beim Wagner op der Route d’Esch. Ech bezuelen se Iech zeréck.', de: 'Richtig so. Die Teile bekommen Sie bei Wagner an der Route d’Esch. Ich erstatte sie Ihnen.', fr: 'C’est bien. Les pièces, vous les trouverez chez Wagner, route d’Esch. Je vous les rembourserai.', en: 'Good. You’ll get the parts at Wagner’s on Route d’Esch. I’ll pay you back.' }] as Line[],
  mullerShortcut: [{ who: 'Här Muller', lb: 'Hm. Séier geet et, dat stëmmt. Et ass Är Prouf – Dir musst wëssen, wat Dir maacht.', de: 'Hm. Schnell geht es, das stimmt. Es ist Ihre Probe – Sie müssen wissen, was Sie tun.', fr: 'Hm. C’est rapide, c’est vrai. C’est votre essai – à vous de savoir ce que vous faites.', en: 'Hm. It’s quick, that’s true. It’s your trial – you need to know what you’re doing.' }] as Line[],
  mullerNeedParts: [{ who: 'Här Muller', lb: 'Ouni nei Bremsbeleeg braucht Dir guer net unzefänken. Wagner, Route d’Esch.', de: 'Ohne neue Bremsbeläge brauchen Sie gar nicht anzufangen. Wagner, Route d’Esch.', fr: 'Sans plaquettes neuves, inutile de commencer. Wagner, route d’Esch.', en: 'Without new brake pads there’s no point starting. Wagner, Route d’Esch.' }] as Line[],
  mullerTestDrive: [{ who: 'Här Muller', lb: 'Fäerdeg? Da maacht eng Probefahrt: d’Route d’Esch erof bis bei de Rond-Point Merl an zeréck. Ech hunn Pylonen opgestallt. Den Auto net futti maachen!', de: 'Fertig? Dann machen Sie eine Probefahrt: die Route d’Esch hinunter bis zum Rond-Point Merl und zurück. Ich habe Pylonen aufgestellt. Den Wagen nicht kaputt machen!', fr: 'Terminé ? Alors faites un essai : descendez la route d’Esch jusqu’au rond-point Merl et revenez. J’ai posé des cônes. N’abîmez pas la voiture !', en: 'Done? Then take it for a test drive: down Route d’Esch to Rond-Point Merl and back. I’ve set out cones. Don’t wreck the car!' }] as Line[],
  wagner: [
    { who: 'Här Wagner', lb: 'Bremsbeleeg a Scheiwe fir e Kombi? Hunn ech hei. Dat mécht eedausendaachthonnert Frang.', de: 'Bremsbeläge und Scheiben für einen Kombi? Habe ich hier. Das macht eintausendachthundert Franken.', fr: 'Plaquettes et disques pour un break ? J’ai ça. Ça fait mille huit cents francs.', en: 'Pads and discs for an estate? Got them. That’s eighteen hundred francs.' },
  ] as Line[],
  wagnerNoMoney: [{ who: 'Här Wagner', lb: 'Dat geet net duer. Bancomat ass um Gare – oder kommt méi spéit erëm.', de: 'Das reicht nicht. Ein Geldautomat ist am Bahnhof – oder kommen Sie später wieder.', fr: 'Ça ne suffit pas. Il y a un distributeur à la gare – ou revenez plus tard.', en: 'That’s not enough. There’s a cash machine at the station – or come back later.' }] as Line[],
  brakesFade: { who: '', lb: 'D’Bremse gi mëll – de Pedal geet bal bis op de Buedem!', de: 'Die Bremsen werden weich – das Pedal geht fast bis zum Boden!', fr: 'Les freins deviennent mous – la pédale va presque au plancher !', en: 'The brakes are going soft – the pedal almost hits the floor!' } as Line,
  reportHonest: [
    { who: 'Här Muller', lb: 'Ech hunn d’Bremse gekuckt. Proper Aarbecht. Esou eppes gesinn ech net all Dag.', de: 'Ich habe mir die Bremsen angesehen. Saubere Arbeit. So etwas sehe ich nicht jeden Tag.', fr: 'J’ai regardé les freins. Du travail propre. Je ne vois pas ça tous les jours.', en: 'I checked the brakes. Clean work. I don’t see that every day.' },
    { who: 'Här Muller', lb: 'Hei sinn Är Deeler zeréck an Äre Loun. Wann Dir wëllt: Méindes um aacht Auer fänkt Dir hei un.', de: 'Hier sind Ihre Teile zurück und Ihr Lohn. Wenn Sie wollen: Montag um acht fangen Sie hier an.', fr: 'Voici le remboursement des pièces et votre paie. Si vous voulez : vous commencez lundi à huit heures.', en: 'Here’s your money for the parts and your pay. If you want: you start here Monday at eight.' },
  ] as Line[],
  reportShortcut: [
    { who: 'Här Muller', lb: 'D’Madame Schroeder huet ugeruff: d’Bremse quietschen nach ëmmer. Ech hunn dat gemierkt.', de: 'Frau Schroeder hat angerufen: Die Bremsen quietschen immer noch. Das habe ich gemerkt.', fr: 'Madame Schroeder a appelé : les freins grincent toujours. Je l’ai remarqué.', en: 'Mrs Schroeder called: the brakes still squeal. I noticed.' },
    { who: 'Här Muller', lb: 'Hei ass Äre Loun fir den Dag. Fir eng feste Plaz … mol kucken. Ech ruffen den Jang un.', de: 'Hier ist Ihr Lohn für den Tag. Für eine feste Stelle … mal sehen. Ich rufe Jang an.', fr: 'Voici votre paie du jour. Pour un poste fixe … on verra. J’appellerai Jang.', en: 'Here’s your pay for the day. A permanent job … we’ll see. I’ll call Jang.' },
  ] as Line[],
  reportDamaged: { who: 'Här Muller', lb: 'An do ass eng nei Bull un der Karosserie. Déi geet vun Ärem Loun of.', de: 'Und da ist eine neue Beule an der Karosserie. Die geht von Ihrem Lohn ab.', fr: 'Et il y a une nouvelle bosse sur la carrosserie. Elle sera retenue sur votre paie.', en: 'And there’s a new dent in the bodywork. That comes out of your pay.' } as Line,
  wrecked: [{ who: 'Här Muller', lb: 'Wat hutt Dir gemaach?! Den Dépannage hëlt en elo mat. Kommt muer erëm – dann probéiere mer et nach eng Kéier.', de: 'Was haben Sie gemacht?! Der Abschleppdienst holt ihn jetzt. Kommen Sie morgen wieder – dann versuchen wir es noch einmal.', fr: 'Qu’avez-vous fait ?! La dépanneuse l’emmène. Revenez demain – on réessaiera.', en: 'What have you done?! The tow truck is taking it. Come back tomorrow – we’ll try again.' }] as Line[],
};

export const PAY = { honest: 4500, partsCost: 1800, shortcut: 2000, damagePenalty: 1500 };

export function timeAnnouncement(h: number, m: number): Line {
  return {
    who: 'Zäitansoen',
    lb: `Beim nächsten Toun ass et ${h} Auer ${m} Minutten.`,
    de: `Beim nächsten Ton ist es ${h} Uhr ${m} Minuten.`,
    fr: `Au quatrième top, il sera exactement ${h} heures ${m} minutes.`,
    en: `At the tone, the time will be ${h} hours ${m} minutes.`,
  };
}
