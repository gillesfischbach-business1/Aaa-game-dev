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
  reding: '45 19 98',
  fund: '47 96 20',
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
  { number: '22 06 41', name: 'Reding, M.', address: 'Rue fictive 7, Ville Haute', district: 'Ville Haute' },
  { number: '48 32 10', name: 'Reding, J.-P.', address: 'Rue fictive 22, Gare', district: 'Gare' },
  { number: '44 90 57', name: 'Reding, A.', address: 'Rue fictive 5, Hollerich', district: 'Hollerich' },
  { number: NUMBERS.fund, name: 'Fundbüro / Objets trouvés (fiktiv)', address: 'Rue fictive 1, bei der Place de Metz', district: 'Ville Haute', isBusiness: true },
  { number: '49 05 81', name: 'Feller, Mia – Fotolabo (fiktiv)', address: 'Rue fictive 9, Gare', district: 'Gare', isBusiness: true },
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
  // Mission 03
  buy_newspaper: { de: 'Zeitung kaufen – Kiosk an der Place de Paris (Kleinanzeigen lesen)', fr: 'Acheter le journal – kiosque place de Paris (lire les petites annonces)', en: 'Buy a newspaper – kiosk at Place de Paris (read the classifieds)' },
  'group:contact': { de: 'Die Nummer aus der Kleinanzeige anrufen (nur 18–20 Uhr) – Telefonzelle oder von zu Hause', fr: 'Appeler le numéro de l’annonce (18 h–20 h seulement) – cabine ou depuis chez soi', en: 'Call the number from the ad (6–8 pm only) – phone booth or from home' },
  meet_stranger: { de: 'Treffen im Pétrusse-Tal unter dem Pont Adolphe', fr: 'Rendez-vous dans la vallée de la Pétrusse sous le pont Adolphe', en: 'Meeting in the Pétrusse valley below Pont Adolphe' },
  combine_clues: { de: 'Die Kiste zur Schwester bringen – Hinweise im Notizbuch kombinieren, die richtige Tür finden', fr: 'Apporter la boîte à la sœur – combiner les indices du carnet, trouver la bonne porte', en: 'Bring the box to the sister – combine the clues in your notebook, find the right door' },
  done03: { de: 'Freies Spiel – Schichten in der Garage Muller, Stadt erkunden. Weitere Missionen folgen.', fr: 'Jeu libre – postes au garage Muller, explorer la ville. D’autres missions suivront.', en: 'Free roam – shifts at Garage Muller, explore the city. More missions to come.' },
  // Mission 05
  listen_tom: { de: 'Neue Nachricht auf dem Anrufbeantworter? Zu Hause nachhören (Avenue de la Liberté)', fr: 'Nouveau message sur le répondeur ? Écouter chez soi (avenue de la Liberté)', en: 'New message on the answering machine? Check at home (Avenue de la Liberté)' },
  talk_technician: { de: 'Tom Kieffer im Cybercafé Pixel beim Bahnhof besuchen', fr: 'Rendre visite à Tom Kieffer au cybercafé Pixel près de la gare', en: 'Visit Tom Kieffer at Cybercafé Pixel near the station' },
  'group:find_disk': { de: 'Die blaue Diskette „TK – Diplom“ finden – Internet (Forum), Telefonbuch oder Leute an der Bushaltestelle fragen', fr: 'Retrouver la disquette bleue « TK – Diplom » – Internet (forum), annuaire ou témoins à l’arrêt de bus', en: 'Find the blue disk “TK – Diplom” – internet (forum), phone book or ask people at the bus stop' },
  return_disk: { de: 'Die Diskette Tom ins Cybercafé zurückbringen', fr: 'Rapporter la disquette à Tom au cybercafé', en: 'Bring the disk back to Tom at the cybercafé' },
  done05: { de: 'Freies Spiel – Stadt erkunden, im Cybercafé surfen, in der Garage arbeiten. Weitere Missionen folgen.', fr: 'Jeu libre – explorer, surfer au cybercafé, travailler au garage. D’autres missions suivront.', en: 'Free roam – explore, surf at the cybercafé, work at the garage. More missions to come.' },
  // Mission 06
  listen_invite: { de: 'Jang hat sicher wieder angerufen – Anrufbeantworter zu Hause abhören', fr: 'Jang a sûrement rappelé – écouter le répondeur à la maison', en: 'Jang probably called again – check the answering machine at home' },
  arrive_grund: { de: 'Abends (21–3 Uhr) auf die Terrasse „Am Pëtz“ im Grund, unten an der Alzette', fr: 'Le soir (21 h–3 h) sur la terrasse « Am Pëtz » au Grund, au bord de l’Alzette', en: 'In the evening (9 pm–3 am) to the “Am Pëtz” terrace in the Grund, down by the Alzette' },
  'group:outcome': { de: 'Der Abend im Grund – wie gehst du mit Steve um?', fr: 'La soirée au Grund – comment réagir face à Steve ?', en: 'The evening in the Grund – how do you handle Steve?' },
  done06: { de: 'Freies Spiel – Stadt erkunden, arbeiten, Radio hören (im Auto: C). Weitere Missionen folgen.', fr: 'Jeu libre – explorer, travailler, écouter la radio (en voiture : C). D’autres missions suivront.', en: 'Free roam – explore, work, listen to the radio (in the car: C). More missions to come.' },
  // Mission 07
  listen_mia: { de: 'Mia hat angerufen? Anrufbeantworter zu Hause abhören', fr: 'Mia a appelé ? Écouter le répondeur à la maison', en: 'Did Mia call? Check the answering machine at home' },
  get_camera: { de: 'Ins Fotolabo Feller beim Bahnhof – Mia hat einen Auftrag', fr: 'Au labo photo Feller près de la gare – Mia a une commande', en: 'Go to Fotolabo Feller near the station – Mia has a job' },
  photograph_old_building: { de: 'Fotografieren (F): Pont Adolphe, die alte Schlosserei an der Route d’Esch, den Bahnhof', fr: 'Photographier (F) : pont Adolphe, la vieille serrurerie route d’Esch, la gare', en: 'Photograph (F): Pont Adolphe, the old metal workshop on Route d’Esch, the station' },
  interview_resident: { de: 'Mit Madame Thill an der alten Schlosserei sprechen', fr: 'Parler à Madame Thill près de la vieille serrurerie', en: 'Talk to Madame Thill at the old workshop' },
  deliver_film: { de: 'Den Film bei Mia abgeben (Fotolabo, 9–18 Uhr)', fr: 'Déposer la pellicule chez Mia (labo, 9 h–18 h)', en: 'Drop off the film with Mia (lab, 9 am–6 pm)' },
  decide_story: { de: 'Mit Mia entscheiden, welche Geschichte die Zeitung erzählt', fr: 'Décider avec Mia quelle histoire le journal racontera', en: 'Decide with Mia which story the paper will tell' },
  done07: { de: 'Freies Spiel – Fotoaufträge bei Mia, Schichten bei Muller, Stadt erkunden. Weitere Missionen folgen.', fr: 'Jeu libre – commandes photo chez Mia, postes chez Muller, explorer. D’autres missions suivront.', en: 'Free roam – photo jobs for Mia, shifts at Muller’s, explore. More missions to come.' },
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

export const NEWSPAPER_PRICE = 30;  // Platzhalter (Kategorie D), siehe Data/Economy/prices_1998.csv

// Fiktive Lokalzeitung. Keine echten Meldungen; Inhalte bewusst allgemein und als erfunden gekennzeichnet.
export const NEWSPAPER = {
  title: 'D’Stater Owendblat',
  subtitle: 'Fiktive Lokalzeitung · Méindeg, 20. Abrëll 1998 · 30 F',
  stories: [
    { h: 'Neue Busfahrpläne ab Mai', t: 'Die Stadt kündigt geänderte Abfahrtszeiten auf mehreren Linien an. Fahrgäste sollen die Aushänge an den Haltestellen beachten.' },
    { h: 'Frühlingsmarkt auf der Place Guillaume', t: 'Händler aus dem ganzen Land bieten am Samstag Gemüse, Blumen und Honig an.' },
    { h: 'Werkstätten melden viel Arbeit', t: 'Nach dem langen Winter sind Bremsen und Reifen gefragt, berichten Betriebe in Hollerich und Bonnevoie.' },
  ],
  ads: [
    { id: 'flat', t: 'Zu vermieten: 2-Zi.-Wohnung, Bonnevoie, 3. Stock, ruhig. Tel. 49 12 77 (abends).' },
    { id: 'car', t: 'Verk. Kompaktwagen, Bj. 1991, 120 000 km, TÜV neu. Preis VB. Tel. 40 55 31.' },
    { id: 'reding', t: 'Suche ehrlichen Menschen mit Auto für einen kleinen Botengang. Kein Risiko, gute Belohnung. Chiffre 4711 – Tel. 45 19 98, nur zwischen 18 und 20 Uhr.', special: true },
    { id: 'piano', t: 'Gebe Klavierunterricht für Kinder und Erwachsene, Limpertsberg. Tel. 47 08 26.' },
    { id: 'dog', t: 'Entlaufen: brauner Mischlingshund „Bosco“, hört auf seinen Namen. Belohnung! Tel. 43 21 65.' },
  ],
  footer: 'Alle Meldungen, Anzeigen, Personen und Telefonnummern in diesem Spiel sind frei erfunden.',
};

export const DIALOGUE03 = {
  kiosk: [{ who: 'Kiosk', lb: 'Moien! D’Owendblat? Dat mécht drësseg Frang.', de: 'Guten Tag! Das Owendblat? Das macht dreißig Franken.', fr: 'Bonjour ! L’Owendblat ? Ça fait trente francs.', en: 'Hello! The Owendblat? That’s thirty francs.' }] as Line[],
  kioskAgain: [{ who: 'Kiosk', lb: 'Dir hutt d’Zeitung vun haut schonn. Muer gëtt et eng nei!', de: 'Sie haben die Zeitung von heute schon. Morgen gibt es eine neue!', fr: 'Vous avez déjà le journal du jour. Demain il y en aura un nouveau !', en: 'You already have today’s paper. There’s a new one tomorrow!' }] as Line[],
  noAnswer: [{ who: '', lb: '… Et mellt keen sech. An der Annonce stoung: nëmmen tëscht 18 an 20 Auer.', de: '… Niemand meldet sich. In der Anzeige stand: nur zwischen 18 und 20 Uhr.', fr: '… Personne ne répond. L’annonce disait : seulement entre 18 h et 20 h.', en: '… No answer. The ad said: only between 6 and 8 pm.' }] as Line[],
  call: [
    { who: 'Här Reding', lb: 'Reding. … Dir rufft wéinst der Annonce un? Gutt. Ech sinn en ale Mann, ech fueren net méi.', de: 'Reding. … Sie rufen wegen der Anzeige an? Gut. Ich bin ein alter Mann, ich fahre nicht mehr.', fr: 'Reding. … Vous appelez pour l’annonce ? Bien. Je suis un vieil homme, je ne conduis plus.', en: 'Reding. … You’re calling about the ad? Good. I’m an old man, I don’t drive anymore.' },
    { who: 'Här Reding', lb: 'Ech hunn eng Këscht mat ale Bréiwer fir meng Schwëster. Mir hunn eis viru Joren zerstridden. Si soll se kréien.', de: 'Ich habe eine Kiste mit alten Briefen für meine Schwester. Wir haben uns vor Jahren zerstritten. Sie soll sie bekommen.', fr: 'J’ai une boîte de vieilles lettres pour ma sœur. Nous nous sommes brouillés il y a des années. Elle doit les avoir.', en: 'I have a box of old letters for my sister. We fell out years ago. She should have them.' },
    { who: 'Här Reding', lb: 'Kommt muer tëscht 10 an 12 Auer an de Pétrusdall, ënnert de Pont Adolphe. Ech sëtzen op der Bänk.', de: 'Kommen Sie morgen zwischen 10 und 12 Uhr ins Pétrusse-Tal, unter den Pont Adolphe. Ich sitze auf der Bank.', fr: 'Venez demain entre 10 h et midi dans la vallée de la Pétrusse, sous le pont Adolphe. Je serai sur le banc.', en: 'Come tomorrow between 10 and 12 to the Pétrusse valley, under Pont Adolphe. I’ll be on the bench.' },
  ] as Line[],
  callAgain: [{ who: 'Här Reding', lb: 'Mir hu jo ofgemaach: muer, Pétrusdall, ënnert dem Pont Adolphe.', de: 'Wir haben es ja abgemacht: morgen, Pétrusse-Tal, unter dem Pont Adolphe.', fr: 'C’est convenu : demain, vallée de la Pétrusse, sous le pont Adolphe.', en: 'We agreed: tomorrow, Pétrusse valley, under Pont Adolphe.' }] as Line[],
  notYet: [{ who: 'Här Reding', lb: 'Dir sidd ze fréi – oder ze spéit? Tëscht 10 an 12 Auer, hat ech gesot.', de: 'Sie sind zu früh – oder zu spät? Zwischen 10 und 12 Uhr, hatte ich gesagt.', fr: 'Vous êtes trop tôt – ou trop tard ? Entre 10 h et midi, avais-je dit.', en: 'You’re too early – or too late? Between 10 and 12, I said.' }] as Line[],
  meet: [
    { who: 'Här Reding', lb: 'Dir sidd komm. Merci. Hei ass d’Këscht.', de: 'Sie sind gekommen. Danke. Hier ist die Kiste.', fr: 'Vous êtes venu. Merci. Voici la boîte.', en: 'You came. Thank you. Here is the box.' },
    { who: 'Här Reding', lb: 'Hir Adress hunn ech net méi. Ech weess nëmmen: si wunnt an der Uewerstad, net wäit vun enger Kierch, wou d’Klacke ronderëm ze héieren sinn.', de: 'Ihre Adresse habe ich nicht mehr. Ich weiß nur: Sie wohnt in der Oberstadt, nicht weit von einer Kirche, deren Glocken man ringsum hört.', fr: 'Je n’ai plus son adresse. Je sais seulement : elle habite la Ville Haute, pas loin d’une église dont on entend les cloches partout.', en: 'I no longer have her address. I only know: she lives in the upper town, near a church whose bells you hear all around.' },
    { who: 'Här Reding', lb: 'Op der Récksäit vun dësem Foto stinn eng Hausnummer – siwen – an „gréng Dier“. Hire Virnumm ass Marie.', de: 'Auf der Rückseite dieses Fotos stehen eine Hausnummer – sieben – und „grüne Tür“. Ihr Vorname ist Marie.', fr: 'Au dos de cette photo il y a un numéro – sept – et « porte verte ». Son prénom est Marie.', en: 'On the back of this photo: a house number – seven – and “green door”. Her first name is Marie.' },
  ] as Line[],
  missed: [{ who: 'Äntwerter', lb: 'Reding hei. Dir waart net do. Ech probéieren et muer nach eng Kéier – selwecht Zäit, selwechte Plaz.', de: 'Hier Reding. Sie waren nicht da. Ich versuche es morgen noch einmal – gleiche Zeit, gleicher Ort.', fr: 'Ici Reding. Vous n’étiez pas là. J’essaie encore demain – même heure, même endroit.', en: 'Reding here. You weren’t there. I’ll try again tomorrow – same time, same place.' }] as Line[],
  wrongDoor: (who: string): Line[] => [{ who, lb: 'Neen, hei wunnt keng Marie Reding. Dir sidd falsch.', de: 'Nein, hier wohnt keine Marie Reding. Sie sind falsch.', fr: 'Non, il n’y a pas de Marie Reding ici. Vous vous êtes trompé.', en: 'No, no Marie Reding here. Wrong door.' }],
  rightDoor: [
    { who: 'Madame Marie Reding', lb: 'Jo? … Bréiwer? Vu mengem Brudder?', de: 'Ja? … Briefe? Von meinem Bruder?', fr: 'Oui ? … Des lettres ? De mon frère ?', en: 'Yes? … Letters? From my brother?' },
    { who: 'Madame Marie Reding', lb: 'Dräisseg Joer hu mir net méi mateneen geschwat. … Merci. Wierklech, merci. Huelt dat hei, ech bestinn drop.', de: 'Dreißig Jahre haben wir nicht mehr miteinander gesprochen. … Danke. Wirklich, danke. Nehmen Sie das, ich bestehe darauf.', fr: 'Trente ans que nous ne nous sommes pas parlé. … Merci. Vraiment, merci. Prenez ceci, j’insiste.', en: 'Thirty years we haven’t spoken. … Thank you. Truly, thank you. Take this, I insist.' },
  ] as Line[],
};

const T = (who: string, lb: string, de: string, fr: string, en: string): Line => ({ who, lb, de, fr, en });
export const DIALOGUE05 = {
  tomMessage: [
    T('Äntwerter', 'Moien, hei ass den Tom Kieffer – de Jang huet mir Är Nummer ginn. Ech brauch dréngend Hëllef.', 'Hallo, hier ist Tom Kieffer – Jang hat mir Ihre Nummer gegeben. Ich brauche dringend Hilfe.', 'Bonjour, ici Tom Kieffer – Jang m’a donné votre numéro. J’ai besoin d’aide d’urgence.', 'Hi, this is Tom Kieffer – Jang gave me your number. I urgently need help.'),
    T('Äntwerter', 'Kommt w.e.g. an de Cybercafé Pixel bei der Gare. Ech sinn do bis owes.', 'Kommen Sie bitte ins Cybercafé Pixel beim Bahnhof. Ich bin dort bis abends.', 'Venez s’il vous plaît au cybercafé Pixel près de la gare. J’y suis jusqu’au soir.', 'Please come to Cybercafé Pixel near the station. I’m there until the evening.'),
  ],
  tomIntro: [
    T('Tom', 'Gutt, datt Dir do sidd! Ech hunn eng Diskett verluer – meng Diplomaarbecht, d’Backup. Blo, drop steet „TK – Diplom“.', 'Gut, dass Sie da sind! Ich habe eine Diskette verloren – meine Diplomarbeit, die Sicherung. Blau, darauf steht „TK – Diplom“.', 'Heureusement que vous êtes là ! J’ai perdu une disquette – mon mémoire, la sauvegarde. Bleue, avec « TK – Diplom » dessus.', 'Glad you’re here! I lost a floppy disk – my thesis backup. Blue, labelled “TK – Diplom”.'),
    T('Tom', 'Meng Festplack ass gëschter futti gaangen. Ouni déi Diskett sinn sechs Méint Aarbecht fort. Ech muss se freides ofginn.', 'Meine Festplatte ist gestern kaputtgegangen. Ohne diese Diskette sind sechs Monate Arbeit weg. Ich muss sie Freitag abgeben.', 'Mon disque dur a lâché hier. Sans cette disquette, six mois de travail sont perdus. Je dois la rendre vendredi.', 'My hard drive died yesterday. Without that disk, six months of work are gone. It’s due Friday.'),
    T('Tom', 'Ech war mam Bus ënnerwee, iwwer d’Place de Paris. Kuckt um Internet – hei sinn d’Computeren – oder am Telefonbuch, oder frot d’Leit um Busarrêt.', 'Ich war mit dem Bus unterwegs, über die Place de Paris. Schauen Sie im Internet – hier sind die Computer – oder im Telefonbuch, oder fragen Sie die Leute an der Bushaltestelle.', 'J’ai pris le bus, par la place de Paris. Cherchez sur Internet – les ordinateurs sont ici – ou dans l’annuaire, ou demandez aux gens à l’arrêt de bus.', 'I took the bus, via Place de Paris. Check the internet – the computers are here – or the phone book, or ask people at the bus stop.'),
  ],
  tomWaiting: [T('Tom', 'Hutt Dir eppes fonnt? Ech kann net méi schlofen …', 'Haben Sie etwas gefunden? Ich kann nicht mehr schlafen …', 'Vous avez trouvé quelque chose ? Je n’arrive plus à dormir …', 'Found anything? I can’t sleep anymore …')],
  tomThanks: [
    T('Tom', 'Dat ass se! Lo kucken … all d’Fichieren sinn nach do! Dir hutt mech gerett.', 'Das ist sie! Mal sehen … alle Dateien sind noch da! Sie haben mich gerettet.', 'C’est elle ! Voyons … tous les fichiers sont là ! Vous m’avez sauvé.', 'That’s it! Let’s see … all the files are still there! You saved me.'),
    T('Tom', 'Hei, fir Iech. An d’Computeren hei sinn fir Iech ëmmer gratis – soulaang ech hei schaffen.', 'Hier, für Sie. Und die Computer hier sind für Sie immer gratis – solange ich hier arbeite.', 'Tenez, pour vous. Et les ordinateurs ici sont gratuits pour vous – tant que je travaille ici.', 'Here, for you. And the computers here are always free for you – as long as I work here.'),
  ],
  nilles: [
    T('Här Nilles', 'Eng Diskett? … Jo! Gëschter huet eng jonk Fra eppes Bloes hei vum Buedem opgehuewen. Rouden Rucksak.', 'Eine Diskette? … Ja! Gestern hat eine junge Frau hier etwas Blaues vom Boden aufgehoben. Roter Rucksack.', 'Une disquette ? … Oui ! Hier une jeune femme a ramassé quelque chose de bleu ici. Sac à dos rouge.', 'A floppy disk? … Yes! Yesterday a young woman picked up something blue here. Red backpack.'),
    T('Här Nilles', 'Ech gesinn se all Dag. Si geet ëmmer an deen Internetcafé bei der Gare, mëttes.', 'Ich sehe sie jeden Tag. Sie geht immer in dieses Internetcafé beim Bahnhof, nachmittags.', 'Je la vois tous les jours. Elle va toujours dans ce café Internet près de la gare, l’après-midi.', 'I see her every day. She always goes to that internet café near the station, afternoons.'),
  ],
  nillesIdle: [T('Här Nilles', 'De Bus huet nees Verspéidung …', 'Der Bus hat wieder Verspätung …', 'Le bus est encore en retard …', 'The bus is late again …')],
  sandraBusy: [T('Sandra', 'Sorry, ech sinn amgaang ze schreiwen.', 'Sorry, ich bin am Schreiben.', 'Désolée, je suis en train d’écrire.', 'Sorry, I’m busy writing.')],
  sandraGiveForum: [T('Sandra', 'Dir hutt mir gemailt? Super! Hei ass d’Diskett. Vill Gléck dem Tom!', 'Sie haben mir gemailt? Super! Hier ist die Diskette. Viel Glück für Tom!', 'C’est vous qui m’avez écrit ? Super ! Voici la disquette. Bonne chance à Tom !', 'You emailed me? Great! Here’s the disk. Good luck to Tom!')],
  sandraGiveWitness: [T('Sandra', 'Eng blo Diskett vum Busarrêt? Jo, déi hunn ech! Ech hat se am Forum gemellt. Hei.', 'Eine blaue Diskette von der Bushaltestelle? Ja, die habe ich! Ich hatte sie im Forum gemeldet. Hier.', 'Une disquette bleue de l’arrêt de bus ? Oui, je l’ai ! Je l’avais signalée sur le forum. Tenez.', 'A blue disk from the bus stop? Yes, I have it! I posted about it in the forum. Here.')],
  sandraHandedIn: [T('Sandra', 'D’Diskett? Déi hunn ech de Moien op d’Fundbüro bruecht – bei der Place de Metz.', 'Die Diskette? Die habe ich heute Morgen ins Fundbüro gebracht – bei der Place de Metz.', 'La disquette ? Je l’ai apportée ce matin aux objets trouvés – près de la place de Metz.', 'The disk? I took it to the lost and found this morning – near Place de Metz.')],
  fundNothing: [T('Fundbüro', 'Objets trouvés, moien. Eng Diskett? Neen, haut ass näischt ofginn ginn. Probéiert et muer nach eng Kéier.', 'Fundbüro, guten Tag. Eine Diskette? Nein, heute wurde nichts abgegeben. Versuchen Sie es morgen noch einmal.', 'Objets trouvés, bonjour. Une disquette ? Non, rien n’a été déposé aujourd’hui. Rappelez demain.', 'Lost and found, hello. A floppy disk? No, nothing handed in today. Try again tomorrow.')],
  fundYes: [T('Fundbüro', 'Eng blo Diskett mat „TK“? Jo, déi ass de Moien ofginn ginn. Kommt laanscht – bei der Place de Metz, mat 50 Frang Gebühr.', 'Eine blaue Diskette mit „TK“? Ja, die wurde heute Morgen abgegeben. Kommen Sie vorbei – bei der Place de Metz, 50 Franken Gebühr.', 'Une disquette bleue avec « TK » ? Oui, elle a été déposée ce matin. Passez – près de la place de Metz, 50 francs de frais.', 'A blue disk with “TK”? Yes, handed in this morning. Come by – near Place de Metz, 50 francs fee.')],
  fundClosed: [T('', 'Op der Dier: „Objets trouvés – Méindeg bis Freideg 8–12 an 14–17 Auer.“', 'An der Tür: „Fundbüro – Montag bis Freitag 8–12 und 14–17 Uhr.“', 'Sur la porte : « Objets trouvés – du lundi au vendredi 8 h–12 h et 14 h–17 h. »', 'On the door: “Lost and found – Mon–Fri 8–12 and 2–5 pm.”')],
  fundCounter: [T('Fundbüro', 'Hei ass Är Diskett. Dat mécht 50 Frang. Ënnerschreift w.e.g. hei.', 'Hier ist Ihre Diskette. Das macht 50 Franken. Bitte hier unterschreiben.', 'Voici votre disquette. Ça fait 50 francs. Signez ici s’il vous plaît.', 'Here’s your disk. That’s 50 francs. Please sign here.')],
  fundEmpty: [T('Fundbüro', 'Mir hu keng Diskett hei. Wann eppes ofginn gëtt, rufft eis un.', 'Wir haben keine Diskette hier. Wenn etwas abgegeben wird, rufen Sie uns an.', 'Nous n’avons pas de disquette. Si quelque chose est déposé, appelez-nous.', 'We don’t have a disk here. If something comes in, give us a call.')],
  sandraMail: { subject: 'Re: Diskett', body: 'Moien!\n\nSuper, datt de Besëtzer sech mellt! Ech sinn all Dag vu 14 bis 20 Auer am Cybercafé Pixel bei der Gare – roude Rucksak. Kommt einfach laanscht.\n\nSandra' },
};

export const DIALOGUE06 = {
  invite: [
    T('Äntwerter', 'Moien, ech sinn et, de Jang. Haut den Owend um néng Auer am Gronn – op der Terrass vum „Am Pëtz“, direkt un der Alzette.', 'Hallo, ich bin’s, Jang. Heute Abend um neun im Grund – auf der Terrasse vom „Am Pëtz“, direkt an der Alzette.', 'Salut, c’est Jang. Ce soir à neuf heures au Grund – sur la terrasse de « Am Pëtz », au bord de l’Alzette.', 'Hi, it’s Jang. Tonight at nine in the Grund – on the terrace of “Am Pëtz”, right by the Alzette.'),
    T('Äntwerter', 'Ech stellen dir e puer Leit vir. Kënnt bis dräi Auer, du weess jo, wéi dat ass.', 'Ich stelle dir ein paar Leute vor. Kann bis drei Uhr gehen, du weißt ja, wie das ist.', 'Je te présenterai quelques personnes. Ça peut durer jusqu’à trois heures, tu sais comment c’est.', 'I’ll introduce you to some people. Might go on till three, you know how it is.'),
  ],
  early: [T('Jang', 'Du bass fréi! Déi aner kommen eréischt géint néng Auer.', 'Du bist früh! Die anderen kommen erst gegen neun.', 'Tu es en avance ! Les autres arrivent vers neuf heures.', 'You’re early! The others come around nine.')],
  intro: [
    T('Jang', 'Do bass de! Dat hei ass d’Mia – si fotograféiert alles, wat sech beweegt. An dat do ass de Steve, mir waren zesummen an der Schoul.', 'Da bist du! Das hier ist Mia – sie fotografiert alles, was sich bewegt. Und das ist Steve, wir waren zusammen in der Schule.', 'Te voilà ! Voici Mia – elle photographie tout ce qui bouge. Et voilà Steve, on était à l’école ensemble.', 'There you are! This is Mia – she photographs anything that moves. And that’s Steve, we were at school together.'),
    T('Mia', 'Moien! De Jang huet vill vun dir erzielt. Du bass zeréck aus dem Ausland?', 'Hallo! Jang hat viel von dir erzählt. Du bist zurück aus dem Ausland?', 'Salut ! Jang m’a beaucoup parlé de toi. Tu es revenu de l’étranger ?', 'Hi! Jang told me a lot about you. You’re back from abroad?'),
    T('Steve', 'Ha! Den neie Mechaniker vum Muller. Fréier am Ausland, elo schmiereg Hänn. Schéi Karriär!', 'Ha! Der neue Mechaniker von Muller. Früher im Ausland, jetzt schmierige Hände. Schöne Karriere!', 'Ha ! Le nouveau mécano de Muller. Avant à l’étranger, maintenant les mains pleines de graisse. Belle carrière !', 'Ha! Muller’s new mechanic. Abroad before, greasy hands now. Great career!'),
    T('', 'De Steve wénkt mat sengem Glas – a stéisst dem Mia seng Kamera vum Dësch. Si fält mat engem Kraach op d’Pavé.', 'Steve fuchtelt mit seinem Glas – und stößt Mias Kamera vom Tisch. Sie fällt krachend aufs Pflaster.', 'Steve gesticule avec son verre – et fait tomber l’appareil de Mia de la table. Il tombe sur les pavés.', 'Steve waves his glass – and knocks Mia’s camera off the table. It crashes onto the cobblestones.'),
  ],
  choice: T('', 'Alleguer kucken dech un. Wat méchs du?', 'Alle schauen dich an. Was tust du?', 'Tout le monde te regarde. Que fais-tu ?', 'Everyone looks at you. What do you do?'),
  friendship: [
    T('Du', 'Komm, Steve, et ass näischt geschitt. Ech bezuelen eng Ronn fir jiddereen.', 'Komm, Steve, es ist nichts passiert. Ich gebe eine Runde für alle aus.', 'Allez, Steve, il ne s’est rien passé. Je paie une tournée pour tout le monde.', 'Come on, Steve, no harm done. I’ll buy a round for everyone.'),
    T('Steve', '… Hm. Merci. Sorry, Mia.', '… Hm. Danke. Entschuldige, Mia.', '… Hm. Merci. Désolé, Mia.', '… Hm. Thanks. Sorry, Mia.'),
    T('Jang', 'Siss de, dofir hunn ech dech vermësst. Du bréngs d’Leit zesummen.', 'Siehst du, deshalb habe ich dich vermisst. Du bringst die Leute zusammen.', 'Tu vois, c’est pour ça que tu m’as manqué. Tu rassembles les gens.', 'See, that’s why I missed you. You bring people together.'),
  ],
  conflict: [
    T('Du', 'Steve, du hues genuch. Entschëlleg dech beim Mia – oder géi.', 'Steve, du hast genug. Entschuldige dich bei Mia – oder geh.', 'Steve, ça suffit. Excuse-toi auprès de Mia – ou va-t’en.', 'Steve, that’s enough. Apologise to Mia – or leave.'),
    T('Steve', 'Wéi schwätz du mat mir? Dat vergiessen ech der net.', 'Wie redest du mit mir? Das vergesse ich dir nicht.', 'Tu me parles comment ? Je ne l’oublierai pas.', 'Who do you think you’re talking to? I won’t forget this.'),
    T('Jang', '… Dat war elo net néideg. Mee hie war och ze wäit gaangen.', '… Das war jetzt nicht nötig. Aber er war auch zu weit gegangen.', '… Ce n’était pas nécessaire. Mais il était allé trop loin aussi.', '… That wasn’t necessary. But he went too far too.'),
  ],
  job: [
    T('Du', 'Waart, Mia – weis mol. D’Objektiv ass ganz, nëmmen de Deckel ass ofgesprongen.', 'Warte, Mia – zeig mal. Das Objektiv ist heil, nur der Deckel ist abgesprungen.', 'Attends, Mia – montre. L’objectif est intact, seul le bouchon a sauté.', 'Wait, Mia – let me see. The lens is fine, only the cap popped off.'),
    T('Mia', 'Du kenns dech mat Kameraen aus? Ech hunn e klenge Fotolabo bei der Gare. Ech brauch een, deen Fotoe fir d’Zeitung mécht – Stroossen, Haiser, Leit.', 'Du kennst dich mit Kameras aus? Ich habe ein kleines Fotolabor beim Bahnhof. Ich brauche jemanden, der Fotos für die Zeitung macht – Straßen, Häuser, Leute.', 'Tu t’y connais en appareils ? J’ai un petit labo photo près de la gare. Il me faut quelqu’un pour faire des photos pour le journal – rues, maisons, gens.', 'You know cameras? I have a small photo lab near the station. I need someone to shoot photos for the paper – streets, houses, people.'),
    T('Mia', 'Ruff mech un, wann s de Loscht hues. Meng Nummer schreiwen ech der an de Carnet.', 'Ruf mich an, wenn du Lust hast. Meine Nummer schreibe ich dir ins Notizbuch.', 'Appelle-moi si ça te dit. J’écris mon numéro dans ton carnet.', 'Call me if you’re interested. I’ll write my number in your notebook.'),
  ],
  after: [T('Jang', 'Schéin Owend, oder? Komm gutt heem.', 'Schöner Abend, oder? Komm gut heim.', 'Belle soirée, non ? Rentre bien.', 'Nice evening, right? Get home safe.')],
  steveRevenge: [T('Äntwerter', 'Jang hei. De Steve ass nach ëmmer sauer … ech mengen, hien huet eppes mat dengem Auto gemaach. Kuck emol no. Sorry.', 'Jang hier. Steve ist immer noch sauer … ich glaube, er hat etwas mit deinem Auto gemacht. Schau mal nach. Sorry.', 'Ici Jang. Steve est toujours fâché … je crois qu’il a fait quelque chose à ta voiture. Va voir. Désolé.', 'Jang here. Steve’s still angry … I think he did something to your car. Have a look. Sorry.')],
};

export const DIALOGUE07 = {
  message: [T('Äntwerter', 'Moien, hei ass d’Mia. Ech hunn e Projet fir d’Zeitung: „D’Stad am Wandel“. Ech brauch een, dee fotograféiert. Komm an de Labo bei der Gare!', 'Hallo, hier ist Mia. Ich habe ein Projekt für die Zeitung: „Die Stadt im Wandel“. Ich brauche jemanden, der fotografiert. Komm ins Labor beim Bahnhof!', 'Salut, c’est Mia. J’ai un projet pour le journal : « La ville en mutation ». Il me faut un photographe. Passe au labo près de la gare !', 'Hi, it’s Mia. I have a project for the paper: “The city in transition”. I need someone to take photos. Come to the lab near the station!')],
  closed: [T('', 'Op der Dier: „Fotolabo Feller – Méindeg bis Samschdeg 9–18 Auer.“', 'An der Tür: „Fotolabo Feller – Montag bis Samstag 9–18 Uhr.“', 'Sur la porte : « Labo photo Feller – du lundi au samedi 9 h–18 h. »', 'On the door: “Fotolabo Feller – Mon–Sat 9 am–6 pm.”')],
  camera: [
    T('Mia', 'Hei, meng al Kamera – en analoge Spigelreflex. 24 Biller pro Film. Mat F kuck s de duerch de Sicher.', 'Hier, meine alte Kamera – eine analoge Spiegelreflex. 24 Bilder pro Film. Mit F schaust du durch den Sucher.', 'Tiens, mon vieil appareil – un reflex argentique. 24 vues par pellicule. Avec F tu regardes dans le viseur.', 'Here, my old camera – an analogue SLR. 24 shots per roll. Press F to look through the viewfinder.'),
    T('Mia', 'Ech brauch dräi Motiver: de Pont Adolphe, déi al Schlosserei op der Route d’Esch – déi gëtt geschwënn ofgerappt – an d’Gare.', 'Ich brauche drei Motive: den Pont Adolphe, die alte Schlosserei an der Route d’Esch – die wird bald abgerissen – und den Bahnhof.', 'Il me faut trois motifs : le pont Adolphe, la vieille serrurerie route d’Esch – elle sera bientôt démolie – et la gare.', 'I need three subjects: Pont Adolphe, the old metal workshop on Route d’Esch – it’s being torn down soon – and the station.'),
    T('Mia', 'An schwätz mat der Madame Thill, si wunnt niewent der Schlosserei. Si weess vill. Bei Dag fotograféieren – nuets gëtt näischt drop!', 'Und sprich mit Madame Thill, sie wohnt neben der Schlosserei. Sie weiß viel. Bei Tageslicht fotografieren – nachts wird nichts drauf sein!', 'Et parle à Madame Thill, elle habite à côté. Elle sait beaucoup de choses. Photographie de jour – la nuit, rien ne sortira !', 'And talk to Madame Thill, she lives next to the workshop. She knows a lot. Shoot in daylight – nothing will come out at night!'),
  ],
  waiting: [T('Mia', 'Hues de alles? Dräi Motiver an d’Gespréich mat der Madame Thill.', 'Hast du alles? Drei Motive und das Gespräch mit Madame Thill.', 'Tu as tout ? Trois motifs et l’entretien avec Madame Thill.', 'Got everything? Three subjects and the talk with Madame Thill.')],
  thill: [
    T('Madame Thill', 'Dir sidd vun der Zeitung? … Ech wunnen hei zënter 1961. Do an der Schlosserei huet mäi Mann geschafft.', 'Sie sind von der Zeitung? … Ich wohne hier seit 1961. In der Schlosserei hat mein Mann gearbeitet.', 'Vous êtes du journal ? … J’habite ici depuis 1961. Mon mari travaillait à la serrurerie.', 'You’re from the paper? … I’ve lived here since 1961. My husband worked at the workshop.'),
    T('Madame Thill', 'Fréier huet een hei de ganzen Dag d’Hummer héieren. Elo kommen Büroen. Dat ass de Laf vun der Zäit, mee et deet wéi.', 'Früher hörte man hier den ganzen Tag die Hämmer. Jetzt kommen Büros. Das ist der Lauf der Zeit, aber es tut weh.', 'Avant, on entendait les marteaux toute la journée. Maintenant viennent des bureaux. C’est le cours du temps, mais ça fait mal.', 'You used to hear hammers here all day. Now offices are coming. That’s how time goes, but it hurts.'),
    T('Madame Thill', 'Mäi Jong seet, et bréngt Aarbecht fir d’Jonk. Vläicht huet hie Recht. Schreift dat och.', 'Mein Sohn sagt, es bringt Arbeit für die Jungen. Vielleicht hat er recht. Schreiben Sie das auch.', 'Mon fils dit que ça apporte du travail aux jeunes. Il a peut-être raison. Écrivez-le aussi.', 'My son says it brings jobs for young people. Maybe he’s right. Write that too.'),
  ],
  deliver: [T('Mia', 'Super! Ech entwéckelen de Film direkt. … Hei sinn d’Kontaktofzich.', 'Super! Ich entwickle den Film sofort. … Hier sind die Kontaktabzüge.', 'Super ! Je développe la pellicule tout de suite. … Voici les planches-contacts.', 'Great! I’ll develop the film right away. … Here are the contact sheets.')],
  missing: [T('Mia', 'Mir feelen nach Biller. Ech brauch de Pont Adolphe, d’Schlosserei an d’Gare – gutt belicht, net ze wäit ewech.', 'Mir fehlen noch Bilder. Ich brauche den Pont Adolphe, die Schlosserei und den Bahnhof – gut belichtet, nicht zu weit weg.', 'Il me manque des photos. Il me faut le pont Adolphe, la serrurerie et la gare – bien exposés, pas trop loin.', 'I’m still missing photos. I need Pont Adolphe, the workshop and the station – well exposed, not too far away.')],
  choice: T('Mia', 'Wéi eng Geschicht erzielen mir?', 'Welche Geschichte erzählen wir?', 'Quelle histoire raconte-t-on ?', 'Which story do we tell?'),
  after: [T('Mia', 'Muer steet et an der Zeitung! Kaaf der eng um Kiosk. A wann s de méi Aufträg wëlls – komm laanscht.', 'Morgen steht es in der Zeitung! Kauf dir eine am Kiosk. Und wenn du mehr Aufträge willst – komm vorbei.', 'Demain ce sera dans le journal ! Achètes-en un au kiosque. Et si tu veux d’autres commandes – passe.', 'It’ll be in the paper tomorrow! Get one at the kiosk. And if you want more jobs – drop by.')],
};

export const STORY_ANGLES = {
  preserve: { label: { de: 'Was verloren geht: Erinnerungen, Handwerk, Nachbarschaft', fr: 'Ce qui se perd : souvenirs, artisanat, voisinage', en: 'What is being lost: memories, craft, neighbourhood' }, h: 'Wann d’Hummere schweigen', t: 'In Hollerich verschwindet eine alte Schlosserei. Anwohner erzählen von Jahrzehnten Handwerk (Reportage, fiktiv).' },
  progress: { label: { de: 'Was entsteht: neue Arbeitsplätze, eine Stadt im Aufbruch', fr: 'Ce qui naît : nouveaux emplois, une ville en mouvement', en: 'What is emerging: new jobs, a city on the move' }, h: 'Eng Stad am Opbroch', t: 'Wo früher Funken flogen, sollen Büros entstehen. Junge Leute hoffen auf Arbeit (Reportage, fiktiv).' },
  balanced: { label: { de: 'Beides zeigen: Abschied und Aufbruch nebeneinander', fr: 'Montrer les deux : adieu et renouveau côte à côte', en: 'Show both: farewell and new beginning side by side' }, h: 'D’Stad am Wandel', t: 'Zwischen Abschied und Aufbruch: Bilder vom Pont Adolphe bis Hollerich (Reportage, fiktiv).' },
} as const;

export const PHOTO_JOB_PAY = 800;  // je Auftragsfoto (Platzhalter, Kategorie D)

export const ROUND_PRICE = 600;  // eine Runde fuer vier (Platzhalter, Kategorie D)

export const NET_PRICE = 75;  // halbe Stunde Internet (Platzhalter, Kategorie D)

export const SLEEP_LINE: Line = { who: '', lb: 'Bis muer de Moien schlofen?', de: 'Bis morgen früh schlafen?', fr: 'Dormir jusqu’à demain matin ?', en: 'Sleep until tomorrow morning?' };

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
