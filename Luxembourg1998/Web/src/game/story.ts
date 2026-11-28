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
  done: { de: 'Freies Spiel: Stadt erkunden. Fortsetzung (Mission 02, Hollerich) folgt.', fr: 'Jeu libre : explorer la ville. Suite (mission 02, Hollerich) à venir.', en: 'Free roam: explore the city. Mission 02 (Hollerich) coming later.' },
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

export function timeAnnouncement(h: number, m: number): Line {
  return {
    who: 'Zäitansoen',
    lb: `Beim nächsten Toun ass et ${h} Auer ${m} Minutten.`,
    de: `Beim nächsten Ton ist es ${h} Uhr ${m} Minuten.`,
    fr: `Au quatrième top, il sera exactement ${h} heures ${m} minutes.`,
    en: `At the tone, the time will be ${h} hours ${m} minutes.`,
  };
}
