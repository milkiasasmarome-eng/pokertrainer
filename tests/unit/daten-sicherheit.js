/* Sicherheit und Daten (Abschnitt 15): manipulierte Importdateien, ungültige Strukturen, numerische Grenzfälle,
   Größenlimit, Rohsicherung (Wiederherstellung beschädigter lokaler Daten), statische Prüfung auf Netzwerkzugriffe und CSP. */
'use strict';
const fs = require('fs'), path = require('path');
module.exports = function (T) {
  const { PT, test, ok, eq } = T;
  const sim = require('../app-sim.js');
  const ROOT = path.join(__dirname, '..', '..');
  const clone = o => JSON.parse(JSON.stringify(o));
  let DATA = null;
  function data() {
    if (DATA) return DATA;
    const hs = sim(PT, 8, 99), L = PT.training.newLearning();
    DATA = { hands: hs, db: hs.db, hero: hs.hero, learning: L, list: PT.stats.dbList(hs.db) };
    return DATA;
  }
  /** Datenbankdatei mit korrekter Prüfsumme aus (manipulierter) Gegnerliste */
  const DBVER = JSON.parse(PT.stats.dbExport(PT.stats.newDb(), '')).version;  // aktuelles Datenbankformat (seit Gegnergedächtnis 3)
  function dbFile(list) { const body = JSON.stringify(list); return JSON.stringify({ format: 'PokerTrainer-DB', version: DBVER, app: PT.VERSION, exported: '', count: list.length, checksum: PT.util.fnv1a(body), opponents: list }); }
  function backupFile(p) { return PT.stats.backupExport(p, 'x'); }

  test('Import: manipulierte Datenbank mit gültiger Prüfsumme (Typen, NaN-Ersatz, 1e308, negative Zahlen, HTML, __proto__) wird abgelehnt', () => {
    const base = data().list.filter(r => r.hands > 0);
    ok(base.length >= 3, base.length + ' Gegner mit Händen');
    eq(PT.stats.dbImport(dbFile(base)).ok, true, 'unveränderte Datei wird angenommen');
    const muts = [
      ['hands = -1', r => { r.hands = -1; }], ['hands = 1e308', r => { r.hands = 1e308; }], ['hands = 1,5', r => { r.hands = 1.5; }], ['hands = "10"', r => { r.hands = '10'; }],
      ['hands = null', r => { r.hands = null; }], ['VPIP-Zähler > Nenner', r => { r.stats.vpip = [5, 3]; }], ['VPIP negativ', r => { r.stats.vpip = [-1, 3]; }], ['VPIP 1e308', r => { r.stats.vpip = [0, 1e308]; }],
      ['Name mit HTML', r => { r.name = '<img src=x onerror=alert(1)>'; }], ['ID mit Leerzeichen', r => { r.id = 'g 1'; }], ['Status', r => { r.status = 'admin'; }],
      ['zusätzliches Feld', r => { r.extra = 1; }], ['lastSeen Text', r => { r.lastSeen = 'gestern'; }], ['aufgedeckte Karten ungültig', r => { r.shown = [{ hand: 1, ts: 0, pos: 'BTN', cards: 'XxYy', board: '', actions: ['', '', '', ''], net: 0 }]; }],
      ['Aktionen-Text zu lang', r => { r.shown = [{ hand: 1, ts: 0, pos: 'BTN', cards: 'AsKd', board: '', actions: ['x'.repeat(301), '', '', ''], net: 0 }]; }],
      ['agg negativ', r => { r.agg.bet = -2; }], ['Positionswerte', r => { r.pos.BTN.h = r.hands + 1; }]
    ];
    muts.forEach(([name, f]) => { const l = clone(base); f(l[1]); const r = PT.stats.dbImport(dbFile(l)); ok(!r.ok, 'abgelehnt: ' + name + (r.ok ? '' : '')); });
    // Prototype-Pollution über JSON-Schlüssel
    const l2 = clone(base), t2 = dbFile(l2).replace('"stats":{', '"stats":{"__proto__":{"polluted":1},');
    const r2 = PT.stats.dbImport(t2.replace(/"checksum":"[0-9a-f]+"/, '"checksum":"' + PT.util.fnv1a(JSON.stringify(JSON.parse(t2).opponents)) + '"'));
    ok(!r2.ok && ({}).polluted === undefined, '__proto__ abgelehnt, kein Prototyp verändert');
    // JSON kennt kein NaN/Infinity: solche Dateien gelten als beschädigt
    ['NaN', 'Infinity', '-Infinity'].forEach(x => { ok(!PT.stats.dbImport(dbFile(base).replace(/"hands":\d+/, '"hands":' + x)).ok, x + ' abgelehnt'); });
    ok(!PT.stats.dbImport(dbFile(base).replace(/"checksum":"[0-9a-f]+"/, '"checksum":"00000000"')).ok, 'falsche Prüfsumme abgelehnt');
    ok(!PT.stats.dbImport(dbFile(base).slice(0, 500)).ok, 'abgeschnittene Datei abgelehnt');
    ['', '   ', 'null', '[]', '"text"', '{"format":"PokerTrainer-DB","version":99}', '{"format":"anders"}'].forEach(t => ok(!PT.stats.dbImport(t).ok, 'abgelehnt: ' + JSON.stringify(t)));
  });

  test('Import: Sicherung mit manipulierten Händen (Zeit 1e308, Ergebnis als Text, HTML in Namen, fremde Felder) wird abgelehnt', () => {
    const D = data(), P = { opponents: D.list, hero: D.hero, hands: D.hands.slice(), learning: D.learning, settings: null, table: null };
    eq(PT.dataport.parseImport(backupFile(P)).ok, true, 'unveränderte Sicherung wird angenommen');
    const muts = [
      ['ts 1e308', h => { h.ts = 1e308; }], ['ts negativ', h => { h.ts = -1; }], ['no Text', h => { h.no = '<b>1</b>'; }], ['heroNet Text', h => { h.heroNet = '<i>'; }],
      ['net 1e308', h => { h.net[0] = 1e308; }], ['Name HTML', h => { h.seats[1].name = '<img src=x>'; }], ['Position HTML', h => { h.seats[1].pos = '<b>'; }],
      ['Karten', h => { h.hero = '<svg/onload=alert(1)>'; }], ['Board', h => { h.board = ['Zz']; }], ['fremdes Feld', h => { h.script = 'x'; }],
      ['Entscheidung Bewertung', h => { if (h.decisions[0]) h.decisions[0].grade = '<b>Gut</b>'; else h.decisions = [{ grade: '<b>' }]; }],
      ['Entscheidungen zu viele', h => { h.decisions = new Array(51).fill(h.decisions[0] || {}); }], ['Aktionen zu viele', h => { h.actions = new Array(401).fill(h.actions[0]); }]
    ];
    muts.forEach(([name, f]) => { const p = clone(P); f(p.hands[0]); const r = PT.dataport.parseImport(backupFile(p)); ok(!r.ok, 'abgelehnt: ' + name); });
    const p2 = clone(P); p2.extra = 1; ok(!PT.dataport.parseImport(backupFile(p2)).ok, 'unbekannter Bereich abgelehnt');
    const p3 = clone(P); p3.learning.quiz.n = 1e308; ok(!PT.dataport.parseImport(backupFile(p3)).ok, 'Lerndaten 1e308 abgelehnt');
  });

  test('Import: Größenlimit 60 MB (keine Verarbeitung zu großer Dateien), große gültige Sicherung in vertretbarer Zeit', () => {
    const big = '{' + 'x'.repeat(60 * 1024 * 1024 + 10), t0 = Date.now(), r = PT.dataport.parseImport(big);
    ok(!r.ok && /zu groß/.test(r.error), 'über 60 MB abgelehnt: ' + r.error);
    ok(Date.now() - t0 < 1000, 'sofort abgelehnt (' + (Date.now() - t0) + ' ms)');
    const D = data(), hs = []; for (let i = 0; i < 600; i++) { const h = clone(D.hands[i % D.hands.length]); h.id = 'h1-' + i + '-' + (1700000000000 + i); h.ts = 1700000000000 + i; hs.push(h); }
    const txt = backupFile({ opponents: D.list, hero: D.hero, hands: hs, learning: D.learning, settings: null, table: null });
    const t1 = Date.now(), r2 = PT.dataport.parseImport(txt), ms = Date.now() - t1;
    ok(r2.ok && r2.hands.length === 600, 'gültige Sicherung mit 600 Händen (' + Math.round(txt.length / 1048576) + ' MB) angenommen');
    T.ok(ms < 15000, 'Prüfzeit ' + ms + ' ms (im Browser im Web Worker, Oberfläche bleibt bedienbar)');
  });

  test('Rohsicherung: beschädigte lokale Daten werden gesichert, gültige Einträge beim Import übernommen, beschädigte übersprungen', () => {
    const D = data(), opps = clone(D.list), hands = clone(D.hands);
    opps[0].hands = 'NaN'; opps.push('kaputt'); opps.push(null);                 // drei beschädigte Gegner-Einträge
    hands[0].ts = 'Infinity'; hands[1].no = '<img data-pwn=1>';                    // zwei beschädigte Hände
    const raw = { format: 'PokerTrainer-Rohsicherung', version: 1, app: PT.VERSION, created: '2026-11-26T00:00:00Z', reason: 'boot',
      indexedDB: { pokertrainer2: { meta: [{ k: 'state', heroRec: D.hero, settings: { tipMode: '<b>' } }], opps, hands, learn: [{ k: 'learning', v: D.learning }], backup: [] } }, localStorage: {} };
    const r = PT.dataport.parseImport(JSON.stringify(raw));
    ok(r.ok, 'Rohsicherung angenommen ' + (r.error || ''));
    eq(r.raw && r.raw.oppsSkipped, 3, 'beschädigte Gegner übersprungen');
    eq(r.raw && r.raw.handsSkipped, 2, 'beschädigte Hände übersprungen');
    eq(r.count, D.list.length - 1, 'gültige Gegner übernommen');
    eq(r.hands.length, D.hands.length - 2, 'gültige Hände übernommen');
    ok(r.hero && r.learning, 'eigene Werte und Lerndaten übernommen');
    // nur localStorage (Rückfall ohne IndexedDB)
    const ls = {}; D.list.forEach(x => { ls[x.id] = x; });
    const raw2 = { format: 'PokerTrainer-Rohsicherung', version: 1, indexedDB: {}, localStorage: { 'pokertrainer20.opps': JSON.stringify(ls), 'pokertrainer20.hands': '{kaputt' } };
    const r3 = PT.dataport.parseImport(JSON.stringify(raw2));
    ok(r3.ok && r3.count === D.list.length && r3.hands.length === 0, 'Rohsicherung aus localStorage');
    ok(!PT.dataport.parseImport(JSON.stringify(Object.assign({}, raw, { version: 9 }))).ok, 'unbekannte Version abgelehnt');
    ok(!PT.dataport.parseImport('{"format":"PokerTrainer-Rohsicherung","version":1,').ok, 'abgeschnittene Rohsicherung abgelehnt');
  });

  test('Statisch: kein Netzwerkzugriff im App-Code, CSP in Website und Offline-Datei, kein eval', () => {
    const files = ['assets/js/recovery.js', 'assets/js/worker.js', 'sw.js'].concat(fs.readdirSync(path.join(ROOT, 'assets/js/engine')).map(f => 'assets/js/engine/' + f), fs.readdirSync(path.join(ROOT, 'assets/js/ui')).map(f => 'assets/js/ui/' + f));
    const hits = [];
    files.forEach(f => {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      if (/\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|sendBeacon|RTCPeerConnection|\beval\s*\(|new Function\s*\(/.test(src)) hits.push(f + ': verbotene API');
      if (/\bfetch\s*\(/.test(src) && f !== 'sw.js') hits.push(f + ': fetch');
      const urls = (src.match(/https?:\/\/[^\s'"<)]+/g) || []).filter(u => !/^https:\/\/(docs\.github\.com|github\.com\/milkiasasmarome-eng\/pokertrainer)/.test(u));
      if (urls.length) hits.push(f + ': ' + urls.join(' '));
      if (/importScripts\(/.test(src) && f !== 'assets/js/worker.js') hits.push(f + ': importScripts');
    });
    eq(hits.join(' | '), '', 'keine Netzwerkzugriffe außer Service-Worker-Cache');
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    ok(/origin !== self\.location\.origin\) return/.test(sw), 'Service Worker bearbeitet nur Anfragen des eigenen Ursprungs');
    const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), csp = (idx.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
    ok(/default-src 'self'/.test(csp) && /script-src 'self'(;|$)/.test(csp) && /connect-src 'self'/.test(csp) && /object-src 'none'/.test(csp) && /form-action 'none'/.test(csp), 'CSP der Website: ' + csp);
    ok(!/unsafe-eval/.test(csp) && !/script-src[^;]*unsafe-inline/.test(csp), 'Website: kein unsafe-inline/unsafe-eval für Skripte');
    ok(!/<script>(?!\s*$)/.test(idx.replace(/<script src="[^"]+"><\/script>/g, '')), 'Website: keine Inline-Skripte');
    const dist = fs.readFileSync(path.join(ROOT, 'dist', 'PokerTrainer_' + PT.VERSION.split('.').slice(0, 2).join('.') + '.html'), 'utf8');
    ok(/default-src 'none'/.test(dist) && /connect-src 'none'/.test(dist), 'Offline-Datei: CSP ohne jede Netzwerkverbindung');
    ok(!/<(script|link|img)[^>]+(src|href)="https?:/.test(dist), 'Offline-Datei lädt nichts von außen');
  });
};
