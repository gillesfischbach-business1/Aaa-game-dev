// Fiktives, komplett offline simuliertes Internet von 1998 (Spezifikation Abschnitt 09).
// Keine echte Netzwerkverbindung. Alle Seiten, Namen, Adressen und Beitraege sind erfunden (Kategorie D).

export interface Mail { id: string; from: string; to: string; subject: string; body: string; read: boolean; atHours: number }

export interface InternetHost {
  now(): number;                      // Spielzeit in Stunden (absHours)
  formatTime(abs: number): string;
  onMailSent(to: string, subject: string, body: string): void;
  onPageVisited(route: string): void;
  playerName: string;
}

const DOMAIN = 'stadnet-fiktiv.lu';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export class Internet {
  mails: Mail[] = [];
  guestbook: { name: string; text: string; when: string }[] = [
    { name: 'Pit', text: 'Cool Säit! Weider esou!', when: '12.03.1998' },
    { name: 'Claudine', text: 'Wou fannen ech d’Fotoe vum Fuesbal?', when: '28.02.1998' },
  ];
  chatLog: string[] = [];
  visitedForumFund = false;
  connectedOnce = false;
  private history: string[] = [];
  private route = 'portal';
  private mailView: 'inbox' | 'read' | 'compose' = 'inbox';
  private readingMail: string | null = null;
  private app: 'browser' | 'mail' = 'browser';
  private chatTimer = 0;
  private audio: AudioContext | null = null;
  muted = false;

  constructor(private host: InternetHost) {}

  get address(): string { return `${host(this.host)}@${DOMAIN}`; }

  addMail(m: Omit<Mail, 'read'>): void {
    if (this.mails.some((x) => x.id === m.id)) return;
    this.mails.push({ ...m, read: false });
  }

  unread(): number { return this.mails.filter((m) => !m.read && m.atHours <= this.host.now()).length; }

  // ---------- Oberflaeche ----------
  open(): void {
    const root = document.getElementById('computer')!;
    root.classList.remove('hidden');
    this.app = 'browser';
    this.history = [];
    this.route = 'portal';
    if (!this.connectedOnce) {
      this.connectedOnce = true;
      this.addMail({ id: 'welcome', from: `admin@${DOMAIN}`, to: this.address, subject: 'Wëllkomm bei StadNet!', body: `Moien!\n\nÄre neie E-Mail-Kont ass ageriicht: ${this.address}\n\nVill Spaass um Internet!\nÄr StadNet-Equipe (fiktiv)`, atHours: this.host.now() });
      this.playModem();
      this.renderLoading('Verbindung gëtt hiergestallt … 28 800 bps', 1800, () => this.render());
    } else this.render();
  }

  close(): void {
    document.getElementById('computer')!.classList.add('hidden');
    window.clearInterval(this.chatTimer);
    try { this.audio?.close(); } catch { /* egal */ }
    this.audio = null;
  }

  private shell(): HTMLElement { return document.querySelector('#computer .crtscreen') as HTMLElement; }

  private renderLoading(text: string, ms: number, then: () => void): void {
    const win = document.querySelector('#computer .content') as HTMLElement | null;
    const target = win ?? this.shell();
    target.innerHTML = `<div class="loading"><div>${esc(text)}</div><div class="bar"><i></i></div></div>`;
    const bar = target.querySelector('.bar i') as HTMLElement;
    let t = 0;
    const id = window.setInterval(() => {
      t += 100;
      bar.style.width = `${Math.min(100, (t / ms) * 100)}%`;
      if (t >= ms) { window.clearInterval(id); then(); }
    }, 100);
  }

  render(): void {
    const unread = this.unread();
    this.shell().innerHTML = `
      <div class="win">
        <div class="titlebar"><span>${this.app === 'browser' ? 'NetNavigator 3.0 (fiktiv)' : 'StadMail (fiktiv)'}</span><button data-act="logoff" title="Ofmellen">×</button></div>
        ${this.app === 'browser' ? `<div class="toolbar"><button data-act="back">◄ Zréck</button><button data-nav="portal">Heem</button><span class="addr">http://www.${DOMAIN}/${this.route === 'portal' ? '' : this.route.replace('/', '_') + '.html'}</span></div>` : `<div class="toolbar"><button data-act="inbox">Agank</button><button data-act="compose">Nei Mail</button><span class="addr">${esc(this.address)}</span></div>`}
        <div class="content"></div>
      </div>
      <div class="taskbar"><span class="start">LuxOS 4.0</span><button data-app="browser" class="${this.app === 'browser' ? 'on' : ''}">NetNavigator</button><button data-app="mail" class="${this.app === 'mail' ? 'on' : ''}">StadMail${unread ? ` (${unread})` : ''}</button><button data-act="mute">${this.muted ? 'Toun aus' : 'Toun un'}</button><span class="clock">${esc(this.host.formatTime(this.host.now()).slice(-5))}</span></div>`;
    const content = this.shell().querySelector('.content') as HTMLElement;
    content.innerHTML = this.app === 'browser' ? this.page(this.route) : this.mailPage();
    this.bind();
  }

  private bind(): void {
    const s = this.shell();
    s.querySelectorAll<HTMLElement>('[data-nav]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); this.navigate(el.dataset.nav!); }));
    s.querySelectorAll<HTMLElement>('[data-app]').forEach((el) => el.addEventListener('click', () => { this.app = el.dataset.app as 'browser' | 'mail'; this.mailView = 'inbox'; this.render(); }));
    s.querySelectorAll<HTMLElement>('[data-mail]').forEach((el) => el.addEventListener('click', () => { this.readingMail = el.dataset.mail!; this.mailView = 'read'; this.render(); }));
    s.querySelectorAll<HTMLElement>('[data-act]').forEach((el) => el.addEventListener('click', () => this.action(el.dataset.act!, el)));
    const gb = s.querySelector('#gbform') as HTMLFormElement | null;
    gb?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (gb.querySelector('[name=n]') as HTMLInputElement).value.trim() || this.host.playerName;
      const text = (gb.querySelector('[name=t]') as HTMLTextAreaElement).value.trim();
      if (!text) return;
      this.guestbook.unshift({ name, text, when: this.host.formatTime(this.host.now()).split(' ')[1] });
      this.render();
    });
    const compose = s.querySelector('#composeform') as HTMLFormElement | null;
    compose?.addEventListener('submit', (e) => {
      e.preventDefault();
      const to = (compose.querySelector('[name=to]') as HTMLInputElement).value.trim().toLowerCase();
      const subject = (compose.querySelector('[name=su]') as HTMLInputElement).value.trim() || '(kee Sujet)';
      const body = (compose.querySelector('[name=bo]') as HTMLTextAreaElement).value.trim();
      if (!to.includes('@')) { (compose.querySelector('.err') as HTMLElement).textContent = 'Adress ass ongëlteg.'; return; }
      this.mails.push({ id: `sent.${this.mails.length}`, from: this.address, to, subject, body, read: true, atHours: this.host.now() });
      this.host.onMailSent(to, subject, body);
      this.renderLoading('Mail gëtt verschéckt …', 900, () => { this.mailView = 'inbox'; this.render(); });
    });
    const chat = s.querySelector('#chatform') as HTMLFormElement | null;
    chat?.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = chat.querySelector('input') as HTMLInputElement;
      if (!inp.value.trim()) return;
      this.chatLog.push(`<b>&lt;${esc(this.host.playerName)}&gt;</b> ${esc(inp.value.trim())}`);
      inp.value = '';
      window.setTimeout(() => { this.chatLog.push(CHAT_REPLIES[this.chatLog.length % CHAT_REPLIES.length]); if (this.route === 'chat') this.render(); }, 1200);
      this.render();
    });
    if (this.route === 'chat' && this.app === 'browser') {
      window.clearInterval(this.chatTimer);
      this.chatTimer = window.setInterval(() => {
        if (document.getElementById('computer')!.classList.contains('hidden') || this.route !== 'chat') { window.clearInterval(this.chatTimer); return; }
        this.chatLog.push(CHAT_IDLE[Math.floor(Math.random() * CHAT_IDLE.length)]);
        this.render();
      }, 6000);
    }
  }

  private action(act: string, el: HTMLElement): void {
    if (act === 'logoff') { document.dispatchEvent(new CustomEvent('lux98-logoff')); return; }
    if (act === 'back') { const prev = this.history.pop(); if (prev) { this.route = prev; this.renderLoading('Lueden …', 500, () => this.render()); } return; }
    if (act === 'inbox') { this.mailView = 'inbox'; this.render(); return; }
    if (act === 'compose') { this.mailView = 'compose'; this.readingMail = null; this.render(); return; }
    if (act === 'reply' && this.readingMail) { this.mailView = 'compose'; this.render(); return; }
    if (act === 'mute') { this.muted = !this.muted; el.textContent = this.muted ? 'Toun aus' : 'Toun un'; }
  }

  navigate(route: string): void {
    this.history.push(this.route);
    this.route = route;
    this.app = 'browser';
    this.host.onPageVisited(route);
    if (route === 'forum/fund') this.visitedForumFund = true;
    // 1998: Seiten laden langsam ueber das Modem
    this.renderLoading(`Lueden … www.${DOMAIN}`, 700 + Math.random() * 700, () => this.render());
  }

  // ---------- Seiten ----------
  private page(route: string): string {
    const link = (r: string, t: string) => `<a href="#" data-nav="${r}">${t}</a>`;
    switch (route) {
      case 'portal':
        return `<div class="site portal"><h1>StadNet</h1><p class="tag">D’Stad am Netz · fiktiven Internetportal</p>
          <table class="nav"><tr><td>${link('news', 'Presse')}</td><td>${link('forum', 'Forum')}</td><td>${link('ads', 'Kleinannoncen')}</td></tr>
          <tr><td>${link('jobs', 'Aarbecht')}</td><td>${link('guestbook', 'Gäschtebuch')}</td><td>${link('chat', 'Chat #lëtzebuerg')}</td></tr>
          <tr><td colspan="3">${link('tom', 'Tom’s Computerdokter (Homepage)')}</td></tr></table>
          <p class="small">Dir sidd de Besucher Nr. <span class="counter">004711</span> · Optimiséiert fir 800×600 · Lescht Aktualiséierung: 14.04.1998</p>
          <p class="small">Alles op dëser Säit ass erfonnt (Spill).</p></div>`;
      case 'news':
        return `<div class="site"><h2>StadNet Presse</h2>${NEWS.map((n) => `<h3>${n.h}</h3><p>${n.t}</p>`).join('')}<p class="small">Fiktiv Meldungen. ${link('portal', 'Zréck op d’Startsäit')}</p></div>`;
      case 'forum':
        return `<div class="site"><h2>StadNet Forum</h2><table class="forum"><tr><th>Thema</th><th>Äntwerten</th><th>Lescht</th></tr>
          ${FORUM.map((t) => `<tr><td>${link(`forum/${t.id}`, t.title)}</td><td>${t.posts.length - 1}</td><td>${t.posts[t.posts.length - 1].who}</td></tr>`).join('')}</table></div>`;
      case 'ads':
        return `<div class="site"><h2>Kleinannoncen</h2>${ADS.map((a) => `<div class="ad"><b>${a.cat}</b> – ${a.t}</div>`).join('')}</div>`;
      case 'jobs':
        return `<div class="site"><h2>Aarbecht an der Stad</h2>${JOBS.map((a) => `<div class="ad">${a}</div>`).join('')}</div>`;
      case 'guestbook':
        return `<div class="site"><h2>Gäschtebuch</h2><form id="gbform"><input name="n" placeholder="Numm" maxlength="20" /><textarea name="t" rows="2" maxlength="200" placeholder="Är Noriicht"></textarea><button>Aschreiwen</button></form>
          ${this.guestbook.map((g) => `<div class="gb"><b>${esc(g.name)}</b> <span class="small">${esc(g.when)}</span><br/>${esc(g.text)}</div>`).join('')}</div>`;
      case 'chat':
        if (!this.chatLog.length) this.chatLog.push(...CHAT_START);
        return `<div class="site chat"><h2>#lëtzebuerg</h2><div class="log">${this.chatLog.slice(-14).map((l) => `<div>${l}</div>`).join('')}</div>
          <form id="chatform"><input placeholder="Schreiwen …" maxlength="120" /><button>Schécken</button></form></div>`;
      case 'tom':
        return `<div class="site tom"><h2>Tom’s Computerdokter</h2><p class="blink">*** UNDER CONSTRUCTION ***</p>
          <p>PCs zesummebauen · Modems installéieren · Disketten retten · Windows nei opsetzen</p>
          <p>Dir fannt mech am Cybercafé Pixel bei der Gare (fiktiv).</p><p class="small">Säit gemaach mat Notepad. Dir sidd Besucher Nr. 000042.</p></div>`;
      default: {
        const t = FORUM.find((x) => `forum/${x.id}` === route);
        if (t) return `<div class="site"><h2>${t.title}</h2>${t.posts.map((p) => `<div class="post"><b>${p.who}</b> <span class="small">${p.when}</span><br/>${p.t}</div>`).join('')}<p>${link('forum', '« Zréck op d’Forum')}</p></div>`;
        return `<div class="site"><h2>404 – Säit net fonnt</h2><p>${link('portal', 'Startsäit')}</p></div>`;
      }
    }
  }

  private mailPage(): string {
    const now = this.host.now();
    const visible = this.mails.filter((m) => m.atHours <= now);
    if (this.mailView === 'read' && this.readingMail) {
      const m = this.mails.find((x) => x.id === this.readingMail);
      if (m) {
        m.read = true;
        return `<div class="mail"><div class="hdr">Vun: ${esc(m.from)}<br/>Un: ${esc(m.to)}<br/>Sujet: <b>${esc(m.subject)}</b><br/>Den: ${esc(this.host.formatTime(m.atHours))}</div><pre>${esc(m.body)}</pre>
          ${m.from !== this.address ? '<button data-act="reply">Äntweren</button>' : ''}</div>`;
      }
    }
    if (this.mailView === 'compose') {
      const re = this.readingMail ? this.mails.find((x) => x.id === this.readingMail) : null;
      return `<form id="composeform" class="mail"><label>Un <input name="to" value="${re ? esc(re.from) : ''}" /></label><label>Sujet <input name="su" value="${re ? 'Re: ' + esc(re.subject) : ''}" /></label>
        <textarea name="bo" rows="7"></textarea><span class="err"></span><button>Schécken</button></form>`;
    }
    const rows = visible.slice().reverse().map((m) => `<tr data-mail="${m.id}" class="${m.read ? '' : 'new'}"><td>${esc(m.from === this.address ? 'Un: ' + m.to : m.from)}</td><td>${esc(m.subject)}</td><td>${esc(this.host.formatTime(m.atHours).slice(-11))}</td></tr>`).join('');
    return `<div class="mail"><table class="inbox"><tr><th>Vun</th><th>Sujet</th><th>Den</th></tr>${rows}</table></div>`;
  }

  // ---------- Modem-Geraeusch (WebAudio, erzeugt – keine Aufnahme) ----------
  private playModem(): void {
    if (this.muted) return;
    try {
      const ctx = new AudioContext();
      this.audio = ctx;
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      gain.connect(ctx.destination);
      const tone = (f1: number, f2: number, t0: number, d: number) => {
        for (const f of [f1, f2]) {
          const o = ctx.createOscillator();
          o.frequency.value = f;
          o.connect(gain);
          o.start(ctx.currentTime + t0);
          o.stop(ctx.currentTime + t0 + d);
        }
      };
      // Waehlton, einige Tonwahl-Ziffern, Traegerton, Rauschen
      tone(350, 440, 0, 0.6);
      [[697, 1209], [770, 1336], [852, 1477], [941, 1336], [697, 1336]].forEach(([a, b], i) => tone(a, b, 0.7 + i * 0.13, 0.08));
      tone(2100, 2100, 1.5, 0.5);
      tone(1650, 980, 2.0, 0.3);
      const len = ctx.sampleRate * 0.8;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.connect(gain);
      noise.start(ctx.currentTime + 2.3);
    } catch { /* Ton nicht moeglich (z. B. ohne Nutzergeste) */ }
  }

  // ---------- Spielstand ----------
  save(): Record<string, string> {
    return {
      'net.mails': JSON.stringify(this.mails),
      'net.guestbook': JSON.stringify(this.guestbook.slice(0, 20)),
      'net.flags': [this.connectedOnce ? 'c' : '', this.visitedForumFund ? 'f' : ''].join(''),
    };
  }

  load(d: Record<string, string>): void {
    try { this.mails = JSON.parse(d['net.mails'] ?? '[]'); } catch { this.mails = []; }
    try { const g = JSON.parse(d['net.guestbook'] ?? 'null'); if (Array.isArray(g)) this.guestbook = g; } catch { /* Standard behalten */ }
    const f = d['net.flags'] ?? '';
    this.connectedOnce = f.includes('c');
    this.visitedForumFund = f.includes('f');
  }
}

function host(h: InternetHost): string { return h.playerName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'gast'; }

const NEWS = [
  { h: 'StadNet huet elo 2 000 Memberen', t: 'Ëmmer méi Leit an der Stad hunn e Modem doheem oder ginn an en Internetcafé.' },
  { h: 'Tipps: Wéi een eng E-Mail schreift', t: 'Adress, Sujet, Text – a verschécken. Méi ass et net!' },
  { h: 'Disketten richteg ophiewen', t: 'Ewech vu Magnéiten, Hëtzt an Waasser. Ëmmer eng Kopie maachen!' },
];

const FORUM = [
  { id: 'fund', title: 'Fundsaachen – wien huet eppes verluer?', posts: [
    { who: 'admin', when: '01.04.1998', t: 'Hei kënnt Dir Saache mellen, déi Dir fonnt oder verluer hutt.' },
    { who: 'mimi', when: '15.04.1998', t: 'Roude Prabbeli um Glacis vergiess. Huet deen een?' },
    { who: 'sandra_77', when: '20.04.1998', t: 'Hunn um Busarrêt Place de Paris eng blo Diskett fonnt, drop steet „TK – Diplom – BACKUP“. Wiem gehéiert se? Schreift mer: sandra77@stadnet-fiktiv.lu – soss bréngen ech se op d’Fundbüro.' },
  ] },
  { id: 'fritten', title: 'Bescht Fritten an der Stad?', posts: [
    { who: 'jeff', when: '10.04.1998', t: 'Wou kritt ee bei der Gare déi bescht Fritten?' },
    { who: 'nico', when: '11.04.1998', t: 'Kee Kommentar, ech iessen nëmme Bouneschlupp ;-)' },
  ] },
  { id: 'modem', title: 'Mäi Modem mécht komesch Geräischer', posts: [
    { who: 'opa_net', when: '18.04.1998', t: 'Ass dat normal, dass et esou päift a kraacht?' },
    { who: 'tk_doc', when: '18.04.1998', t: 'Jo, dat ass normal. Dat ass d’Handshake. Bei Problemer kommt an de Pixel.' },
  ] },
  { id: 'amiga', title: 'Verkafen Heemcomputer mat 40 Spiller', posts: [
    { who: 'retro_lux', when: '19.04.1998', t: 'Alles fonctionnéiert, mat Joystick. Präis no Ofsprooch.' },
  ] },
];

const ADS = [
  { cat: 'Autoen', t: 'Kombi, Bj. 1989, roud, nei Bremsen. Tel. 49 33 05 (fiktiv).' },
  { cat: 'Computer', t: 'Modem 33 600 bps, kaum gebraucht. Mail: bit@stadnet-fiktiv.lu' },
  { cat: 'Wunnengen', t: 'Studio Limpertsberg, ab 1. Juni. Tel. 47 11 08 (fiktiv).' },
  { cat: 'Musek', t: 'Band sicht Drummer (Eurodance & Rock). Mail: beat@stadnet-fiktiv.lu' },
];

const JOBS = [
  'Garage sicht Mechaniker, Hollerich – Kontakt iwwer Telefonbuch.',
  'Cybercafé sicht Aushëllef fir de Weekend (Kees, Kaffi, Computer).',
  'Kurier mat eegenem Won gesicht – Frankophon a Lëtzebuergesch.',
];

const CHAT_START = [
  '<i>*** Dir sidd am Kanal #lëtzebuerg ***</i>',
  '<b>&lt;pit&gt;</b> moien alleguer',
  '<b>&lt;claudine&gt;</b> moien pit :)',
  '<b>&lt;retro_lux&gt;</b> huet een e Spill fir mäin Heemcomputer ze verkafen?',
];
const CHAT_IDLE = [
  '<b>&lt;pit&gt;</b> wie geet den Owend op d’Stad?',
  '<b>&lt;claudine&gt;</b> mäi Modem ass sou lues haut :(',
  '<b>&lt;tk_doc&gt;</b> deen huet bestëmmt nëmmen 14 400 :P',
  '<i>*** jeff ass komm ***</i>',
  '<b>&lt;jeff&gt;</b> lol',
];
const CHAT_REPLIES = [
  '<b>&lt;pit&gt;</b> moien! ;-)',
  '<b>&lt;claudine&gt;</b> wëllkomm am Chat',
  '<b>&lt;tk_doc&gt;</b> haha, genee',
];
