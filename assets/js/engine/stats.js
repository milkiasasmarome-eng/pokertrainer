/* PokerTrainer 2.0 – Statistik-Engine und Gegnerdatenbank.
   Alle Werte entstehen nur aus öffentlich sichtbaren Aktionen und am Showdown gezeigten Karten.
   Jede Statistik zählt Zähler und Nenner je tatsächlicher Gelegenheit. */
(function (G) {
'use strict';
var PT = G.PT, U = PT.util, isInt = U.isInt;

var STATS = ['vpip', 'pfr', 'threeBet', 'fourBet', 'foldTo3Bet', 'foldTo4Bet', 'steal', 'foldToSteal',
  'cbetFlop', 'cbetTurn', 'cbetRiver', 'foldToCbet', 'foldToCbetTurn', 'checkRaise', 'afq', 'wtsd', 'wsd'];
var STAT_LABEL = { vpip: 'VPIP', pfr: 'PFR', threeBet: '3-Bet', fourBet: '4-Bet', foldTo3Bet: 'Fold gegen 3-Bet', foldTo4Bet: 'Fold gegen 4-Bet',
  steal: 'Attempt to Steal', foldToSteal: 'Fold gegen Steal', cbetFlop: 'C-Bet Flop', cbetTurn: 'C-Bet Turn', cbetRiver: 'C-Bet River',
  foldToCbet: 'Fold gegen C-Bet (Flop)', foldToCbetTurn: 'Fold gegen C-Bet (Turn)', checkRaise: 'Check-Raise', afq: 'Aggression Frequency',
  wtsd: 'WTSD', wsd: 'W$SD' };
var STAT_HELP = {
  vpip: 'Anteil der Hände, in denen freiwillig Geld preflop investiert wurde (Call oder Raise).',
  pfr: 'Anteil der Hände mit einem Preflop-Raise.',
  threeBet: 'Re-Raise gegen genau einen Raise, je Gelegenheit.',
  fourBet: 'Re-Raise gegen eine 3-Bet, je Gelegenheit.',
  foldTo3Bet: 'Fold als Opener gegen eine 3-Bet.',
  foldTo4Bet: 'Fold als 3-Bettor gegen eine 4-Bet.',
  steal: 'Open-Raise aus CO, BTN oder SB, wenn alle davor gefoldet haben.',
  foldToSteal: 'Fold aus SB oder BB gegen einen Steal-Versuch.',
  cbetFlop: 'Bet des Preflop-Aggressors auf dem Flop, wenn vor ihm niemand gesetzt hat.',
  cbetTurn: 'Zweite Bet (Barrel) des Aggressors auf dem Turn nach einer Flop-C-Bet.',
  cbetRiver: 'Dritte Bet auf dem River nach C-Bets auf Flop und Turn.',
  foldToCbet: 'Fold gegen eine Flop-C-Bet.',
  foldToCbetTurn: 'Fold gegen eine Turn-C-Bet.',
  checkRaise: 'Check und anschließender Raise auf derselben Straße, je Gelegenheit.',
  afq: 'Anteil von Bet und Raise an allen Postflop-Aktionen außer Check.',
  wtsd: 'Anteil der gesehenen Flops, die bis zum Showdown gespielt wurden.',
  wsd: 'Anteil der Showdowns mit Gewinn.' };
var V1_STATS = ['vpip', 'pfr', 'threeBet', 'foldTo3Bet', 'cbet', 'foldToCbet', 'wtsd'];
var POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
var SHOWN_MAX = 10;

function emptyStats() { var o = {}; STATS.forEach(function (k) { o[k] = [0, 0]; }); return o; }
function emptyAgg() { return { bet: 0, raise: 0, call: 0, fold: 0, check: 0 }; }
function emptyPos() { var o = {}; POSITIONS.forEach(function (p) { o[p] = { h: 0, vpip: [0, 0], pfr: [0, 0] }; }); return o; }

/** Werte einer Hand je Sitz aus dem öffentlichen Verlauf */
function handStats(rec) {
  var S = {};
  rec.seats.forEach(function (st) { S[st.seat] = { stats: emptyStats(), agg: emptyAgg(), pos: st.pos }; });
  function inc(seat, k, hit) { var x = S[seat].stats[k]; x[1] += 1; if (hit) x[0] += 1; }
  var posOf = {}; rec.seats.forEach(function (st) { posOf[st.seat] = st.pos; });
  var pre = rec.actions.filter(function (a) { return a.st === 0 && a.t !== 'sb' && a.t !== 'bb'; });
  var rc = 0, opener = -1, three = -1, four = -1, limpers = 0, callsAfterOpen = 0, decided = {}, faced = {}, pfa = -1, stealer = -1;
  pre.forEach(function (a) {
    var aggr = a.t === 'raise' || a.t === 'bet', s = a.s, k = s + ':';
    if (!decided[s]) { decided[s] = 1; inc(s, 'vpip', false); inc(s, 'pfr', false); S[s].stats.vpip[1] -= 0; }
    if (a.t === 'call' || aggr) S[s].stats.vpip[0] = 1;
    if (aggr) S[s].stats.pfr[0] = 1;
    // Steal-Versuch
    if (rc === 0 && limpers === 0 && !faced[k + 'st'] && (posOf[s] === 'CO' || posOf[s] === 'BTN' || posOf[s] === 'SB')) { faced[k + 'st'] = 1; inc(s, 'steal', aggr); if (aggr) stealer = s; }
    if (rc === 1 && stealer >= 0 && opener === stealer && callsAfterOpen === 0 && s !== opener && (posOf[s] === 'SB' || posOf[s] === 'BB') && !faced[k + 'fs']) { faced[k + 'fs'] = 1; inc(s, 'foldToSteal', a.t === 'fold'); }
    if (rc === 1 && s !== opener && a.cr && !faced[k + '3']) { faced[k + '3'] = 1; inc(s, 'threeBet', aggr); }
    if (rc === 2 && s !== three && a.cr && !faced[k + '4']) { faced[k + '4'] = 1; inc(s, 'fourBet', aggr); }
    if (rc === 2 && s === opener && !faced[k + 'f3']) { faced[k + 'f3'] = 1; inc(s, 'foldTo3Bet', a.t === 'fold'); }
    if (rc === 3 && s === three && !faced[k + 'f4']) { faced[k + 'f4'] = 1; inc(s, 'foldTo4Bet', a.t === 'fold'); }
    if (a.t === 'call') { if (rc === 0) limpers++; else if (rc === 1) callsAfterOpen++; }
    if (aggr) { rc++; if (rc === 1) opener = s; else if (rc === 2) three = s; else if (rc === 3) four = s; pfa = s; }
  });
  void four;
  // Postflop
  var everFolded = {}; rec.actions.forEach(function (a) { if (a.t === 'fold') everFolded[a.s] = 1; });
  var sawFlop = rec.sawFlop || [];
  var cbetChain = pfa >= 0;
  for (var st = 1; st <= 3; st++) {
    var acts = rec.actions.filter(function (a) { return a.st === st; });
    if (!acts.length) { cbetChain = false; continue; }
    var betSeen = false, pfaActed = false, cbet = false, raised = false, resp = {}, checked = {}, crOpp = {};
    var ck = st === 1 ? 'cbetFlop' : st === 2 ? 'cbetTurn' : 'cbetRiver', fk = st === 1 ? 'foldToCbet' : st === 2 ? 'foldToCbetTurn' : null;
    acts.forEach(function (a) {
      var aggr = a.t === 'raise' || a.t === 'bet', s = a.s, ag = S[s].agg;
      if (a.t === 'check') ag.check++; else if (a.t === 'bet') ag.bet++; else if (a.t === 'raise') ag.raise++; else if (a.t === 'call') ag.call++; else if (a.t === 'fold') ag.fold++;
      if (a.t !== 'check') inc(s, 'afq', aggr);
      if (cbetChain && s === pfa && !pfaActed) {
        pfaActed = true;
        if (!betSeen) { inc(s, ck, aggr); if (aggr) cbet = true; }
      } else if (cbet && fk && !raised && s !== pfa && !resp[s]) { resp[s] = 1; inc(s, fk, a.t === 'fold'); }
      if (checked[s] && betSeen && a.cr && !crOpp[s]) { crOpp[s] = 1; inc(s, 'checkRaise', a.t === 'raise'); }
      if (a.t === 'check') checked[s] = 1;
      if (aggr) { if (cbet && s !== pfa) raised = true; betSeen = true; }
    });
    cbetChain = cbetChain && cbet;
  }
  sawFlop.forEach(function (s) {
    inc(s, 'wtsd', !!(rec.showdown && !everFolded[s]));
    if (rec.showdown && !everFolded[s]) inc(s, 'wsd', (rec.won && rec.won[s] > 0) || rec.net[s] > 0);
  });
  return S;
}

// ---------- Datenbank ----------
function newDb() { return { v: 2, opps: {} }; }
function newRecord(id, name) {
  return { id: id, name: name, status: 'archiv', hands: 0, stats: emptyStats(), agg: emptyAgg(), pos: emptyPos(), shown: [], lastSeen: 0, firstSeen: 0 };
}
function dbEnsure(db, id, name) { var r = db.opps[id]; if (!r) r = db.opps[id] = newRecord(id, name || (PT.bots ? PT.bots.nameOf(id) : id)); return r; }
function shownEntry(rec, seat, cards) {
  var streets = ['', '', '', ''];
  rec.actions.forEach(function (a) { if (a.s !== seat) return; var t = PT.actionText(a); streets[a.st] = streets[a.st] ? streets[a.st] + ', ' + t : t; });
  return { hand: rec.no, ts: rec.ts, pos: rec.seats[seat].pos, cards: cards, board: rec.board.join(''), actions: streets, net: rec.net[seat] };
}
function applyToRecord(r, I, ts) {
  r.hands += 1; r.lastSeen = ts; if (!r.firstSeen) r.firstSeen = ts;
  STATS.forEach(function (k) { r.stats[k][0] += I.stats[k][0]; r.stats[k][1] += I.stats[k][1]; });
  Object.keys(r.agg).forEach(function (k) { r.agg[k] += I.agg[k]; });
  var p = r.pos[I.pos];
  if (p) { p.h += 1; p.vpip[0] += I.stats.vpip[0]; p.vpip[1] += I.stats.vpip[1]; p.pfr[0] += I.stats.pfr[0]; p.pfr[1] += I.stats.pfr[1]; }
}
function dbApplyHand(db, rec, heroRec) {
  var inc = handStats(rec), changed = [];
  rec.seats.forEach(function (st) {
    if (st.hero) { if (heroRec) applyToRecord(heroRec, inc[st.seat], rec.ts); return; }
    var r = dbEnsure(db, st.id, st.name), I = inc[st.seat];
    r.status = 'aktiv';
    applyToRecord(r, I, rec.ts);
    var sh = rec.shown.filter(function (x) { return x.seat === st.seat; })[0];
    if (sh) { r.shown.unshift(shownEntry(rec, st.seat, sh.cards)); if (r.shown.length > SHOWN_MAX) r.shown.length = SHOWN_MAX; }
    changed.push(r.id);
  });
  return changed;
}
function dbList(db) { return Object.keys(db.opps).sort().map(function (k) { return db.opps[k]; }); }

// ---------- Kennzahlen für Anzeige ----------
function rate(nd) { return nd && nd[1] > 0 ? nd[0] / nd[1] : null; }
function pctOf(nd) { var r = rate(nd); return r == null ? null : Math.round(100 * r); }
/** Wilson-Intervall (95 %) für einen Anteil */
function wilson(nd) {
  if (!nd || !nd[1]) return null;
  var n = nd[1], p = nd[0] / n, z = 1.96, z2 = z * z, den = 1 + z2 / n;
  var c = (p + z2 / (2 * n)) / den, h = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / den;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
function af(agg) { return agg && agg.call > 0 ? (agg.bet + agg.raise) / agg.call : (agg && agg.bet + agg.raise > 0 ? Infinity : null); }
function reliability(h) { return h < 100 ? 'unsicher' : h < 500 ? 'Tendenz' : 'belastbar'; }
/** Spielertyp nach Projektregel (erste zutreffende Zeile) */
function playerType(r) {
  var h = r ? r.hands : 0;
  if (h < 100) return 'unbekannt';
  var v = pctOf(r.stats.vpip), p = pctOf(r.stats.pfr);
  v = v == null ? 0 : v; p = p == null ? 0 : p;
  if (v >= 40) return 'sehr loose';
  if (v - p >= 12) return 'loose-passiv';
  if (v < 16) return 'Nit';
  if (v >= 28) return 'LAG';
  return 'TAG';
}
function profile(r) {
  var o = { hands: r ? r.hands : 0 }, st = r ? r.stats : emptyStats();
  STATS.forEach(function (k) { o[k] = pctOf(st[k]); });
  o.af = r ? af(r.agg) : null;
  o.bel = reliability(o.hands); o.typ = playerType(r);
  return o;
}

// ---------- Export / Import ----------
var FORMAT_DB = 'PokerTrainer-DB', FORMAT_BACKUP = 'PokerTrainer-Backup';
function dbExport(db, stamp) {
  var list = dbList(db), body = JSON.stringify(list);
  return '{"format":"' + FORMAT_DB + '","version":2,"app":"' + PT.VERSION + '","exported":' + JSON.stringify(stamp || '') + ',"count":' + list.length +
    ',"checksum":"' + U.fnv1a(body) + '","opponents":[' +
    (list.length ? '\n' + list.map(function (r) { return JSON.stringify(r); }).join(',\n') + '\n' : '') + ']}\n';
}
function backupExport(payload, stamp) {
  var body = JSON.stringify(payload);
  return JSON.stringify({ format: FORMAT_BACKUP, version: 2, app: PT.VERSION, exported: stamp || '', checksum: U.fnv1a(body), payload: payload });
}
function onlyKeys(o, keys) { var k = Object.keys(o); for (var i = 0; i < k.length; i++) if (keys.indexOf(k[i]) < 0) return k[i]; return null; }
var REC_KEYS = ['id', 'name', 'status', 'hands', 'stats', 'agg', 'pos', 'shown', 'lastSeen', 'firstSeen'];
var REC_KEYS_V1 = ['id', 'name', 'status', 'hands', 'stats', 'shown', 'lastSeen'];
var SHOWN_KEYS = ['hand', 'ts', 'pos', 'cards', 'board', 'actions', 'net'];
var NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 .'\-]{1,40}$/;
function validNd(nd, max) { return Array.isArray(nd) && nd.length === 2 && isInt(nd[0], 0, 1e9) && isInt(nd[1], 0, 1e9) && nd[0] <= nd[1] && (max == null || nd[1] <= max); }
function validShown(s, j) {
  if (!s || typeof s !== 'object' || Array.isArray(s) || onlyKeys(s, SHOWN_KEYS)) return 'aufgedecktes Blatt ' + (j + 1) + ' ungültig';
  if (!isInt(s.hand, 0, 1e12) || typeof s.ts !== 'number' || !(s.ts >= 0) || POSITIONS.indexOf(s.pos) < 0) return 'aufgedecktes Blatt ' + (j + 1) + ' ungültig';
  var hc = PT.parseCards(s.cards), bc = PT.parseCards(s.board);
  if (!hc || hc.length !== 2 || !bc || bc.length > 5 || PT.parseCards(s.cards + s.board) === null) return 'Karten in Blatt ' + (j + 1) + ' ungültig';
  if (!Array.isArray(s.actions) || s.actions.length !== 4) return 'Aktionen in Blatt ' + (j + 1) + ' ungültig';
  for (var k = 0; k < 4; k++) if (typeof s.actions[k] !== 'string' || s.actions[k].length > 300) return 'Aktionen in Blatt ' + (j + 1) + ' ungültig';
  if (!isInt(s.net, -1e12, 1e12)) return 'Ergebnis in Blatt ' + (j + 1) + ' ungültig';
  return null;
}
function validRecord(r, v1) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return 'kein Datensatz';
  var extra = onlyKeys(r, v1 ? REC_KEYS_V1 : REC_KEYS); if (extra) return 'unbekanntes Feld „' + String(extra).slice(0, 20) + '“';
  if (typeof r.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(r.id)) return 'ungültige ID';
  if (typeof r.name !== 'string' || !NAME_RE.test(r.name)) return 'ungültiger Name';
  if (r.status !== 'aktiv' && r.status !== 'archiv') return 'ungültiger Status';
  if (!isInt(r.hands, 0, 1e9)) return 'ungültige Handzahl';
  if (!r.stats || typeof r.stats !== 'object' || Array.isArray(r.stats)) return 'Werte fehlen';
  var keys = v1 ? V1_STATS : STATS;
  if (onlyKeys(r.stats, keys) || Object.keys(r.stats).length !== keys.length) return 'Werte unvollständig';
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i], lim = (k === 'afq') ? null : r.hands;
    if (!validNd(r.stats[k], lim)) return 'Wert ' + (STAT_LABEL[k] || k) + ' ungültig';
  }
  if (!v1) {
    if (!r.agg || typeof r.agg !== 'object' || onlyKeys(r.agg, ['bet', 'raise', 'call', 'fold', 'check']) || Object.keys(r.agg).length !== 5) return 'Aktionszähler ungültig';
    for (var a in r.agg) if (!isInt(r.agg[a], 0, 1e10)) return 'Aktionszähler ungültig';
    if (!r.pos || typeof r.pos !== 'object' || onlyKeys(r.pos, POSITIONS) || Object.keys(r.pos).length !== 6) return 'Positionswerte ungültig';
    for (var p = 0; p < POSITIONS.length; p++) {
      var pp = r.pos[POSITIONS[p]];
      if (!pp || typeof pp !== 'object' || onlyKeys(pp, ['h', 'vpip', 'pfr']) || !isInt(pp.h, 0, r.hands) || !validNd(pp.vpip, pp.h) || !validNd(pp.pfr, pp.h)) return 'Positionswerte ungültig';
    }
    if (typeof r.firstSeen !== 'number' || !(r.firstSeen >= 0)) return 'erstmals gesehen ungültig';
  }
  if (!Array.isArray(r.shown) || r.shown.length > SHOWN_MAX) return 'aufgedeckte Blätter ungültig';
  for (var j = 0; j < r.shown.length; j++) { var e = validShown(r.shown[j], j); if (e) return e; }
  if (typeof r.lastSeen !== 'number' || !(r.lastSeen >= 0)) return 'zuletzt gesehen ungültig';
  return null;
}
function cloneRecord(r) {
  var st = {}; STATS.forEach(function (k) { st[k] = [r.stats[k][0], r.stats[k][1]]; });
  var pos = {}; POSITIONS.forEach(function (p) { var x = r.pos[p]; pos[p] = { h: x.h, vpip: [x.vpip[0], x.vpip[1]], pfr: [x.pfr[0], x.pfr[1]] }; });
  return { id: r.id, name: r.name, status: r.status, hands: r.hands, stats: st,
    agg: { bet: r.agg.bet, raise: r.agg.raise, call: r.agg.call, fold: r.agg.fold, check: r.agg.check }, pos: pos,
    shown: r.shown.map(function (s) { return { hand: s.hand, ts: s.ts, pos: s.pos, cards: s.cards, board: s.board, actions: s.actions.slice(), net: s.net }; }),
    lastSeen: r.lastSeen, firstSeen: r.firstSeen };
}
/** Migration eines v1-Datensatzes (Entwurf 2): fehlende Werte bleiben unbekannt (0/0), nicht 0 %. */
function migrateV1(r) {
  var n = newRecord(r.id, r.name);
  n.status = r.status; n.hands = r.hands; n.lastSeen = r.lastSeen; n.firstSeen = r.lastSeen;
  n.stats.vpip = r.stats.vpip.slice(); n.stats.pfr = r.stats.pfr.slice(); n.stats.threeBet = r.stats.threeBet.slice();
  n.stats.foldTo3Bet = r.stats.foldTo3Bet.slice(); n.stats.cbetFlop = r.stats.cbet.slice(); n.stats.foldToCbet = r.stats.foldToCbet.slice();
  n.stats.wtsd = r.stats.wtsd.slice();
  n.shown = r.shown.map(function (s) { return { hand: s.hand, ts: s.ts, pos: s.pos, cards: s.cards, board: s.board, actions: s.actions.slice(), net: s.net }; });
  return n;
}
var MAX_IMPORT = 60 * 1024 * 1024;
function dbImport(text) {
  function fail(m) { return { ok: false, error: m }; }
  if (typeof text !== 'string' || !text.trim()) return fail('Die Datei ist leer.');
  if (text.length > MAX_IMPORT) return fail('Die Datei ist zu groß (über 60 MB).');
  var obj;
  try { obj = JSON.parse(text); } catch (e) { return fail('Die Datei ist beschädigt oder abgeschnitten (kein gültiges JSON).'); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return fail('Die Datei ist keine PokerTrainer-Datei.');
  if (obj.format === FORMAT_BACKUP) return backupImport(obj);
  if (obj.format !== FORMAT_DB) return fail('Die Datei ist keine PokerTrainer-Datenbank.');
  if (obj.version !== 1 && obj.version !== 2) return fail('Unbekannte Version der Datenbank (' + String(obj.version).slice(0, 10) + ').');
  if (!Array.isArray(obj.opponents)) return fail('Die Gegnerliste fehlt.');
  if (obj.count !== obj.opponents.length) return fail('Die Zahl der Gegner stimmt nicht mit der Datei überein.');
  if (U.fnv1a(JSON.stringify(obj.opponents)) !== obj.checksum) return fail('Die Prüfsumme stimmt nicht, die Datei wurde verändert oder ist beschädigt.');
  if (obj.opponents.length > 100000) return fail('Zu viele Einträge.');
  var db = newDb(), v1 = obj.version === 1;
  for (var i = 0; i < obj.opponents.length; i++) {
    var e = validRecord(obj.opponents[i], v1);
    if (e) return fail('Eintrag ' + (i + 1) + ': ' + e + '.');
    var r = obj.opponents[i];
    if (db.opps[r.id]) return fail('Doppelter Eintrag für ' + r.name + '.');
    db.opps[r.id] = v1 ? migrateV1(r) : cloneRecord(r);
  }
  return { ok: true, kind: 'db', db: db, count: obj.opponents.length, migrated: v1, version: obj.version };
}
function backupImport(obj) {
  function fail(m) { return { ok: false, error: m }; }
  if (obj.version !== 2) return fail('Unbekannte Version der Sicherung.');
  if (!obj.payload || typeof obj.payload !== 'object' || Array.isArray(obj.payload)) return fail('Die Sicherung enthält keine Daten.');
  if (U.fnv1a(JSON.stringify(obj.payload)) !== obj.checksum) return fail('Die Prüfsumme stimmt nicht, die Sicherung wurde verändert oder ist beschädigt.');
  var P = obj.payload, extra = onlyKeys(P, ['opponents', 'hero', 'hands', 'learning', 'settings', 'table']);
  if (extra) return fail('Unbekannter Bereich in der Sicherung.');
  if (!Array.isArray(P.opponents)) return fail('Die Gegnerliste fehlt.');
  var db = newDb();
  for (var i = 0; i < P.opponents.length; i++) {
    var e = validRecord(P.opponents[i], false);
    if (e) return fail('Gegner ' + (i + 1) + ': ' + e + '.');
    if (db.opps[P.opponents[i].id]) return fail('Doppelter Gegner.');
    db.opps[P.opponents[i].id] = cloneRecord(P.opponents[i]);
  }
  var hero = null;
  if (P.hero != null) { var eh = validRecord(P.hero, false); if (eh) return fail('Eigene Werte: ' + eh + '.'); hero = cloneRecord(P.hero); }
  var hands = [];
  if (P.hands != null) {
    if (!Array.isArray(P.hands) || P.hands.length > 200000) return fail('Handhistorie ungültig.');
    for (var h = 0; h < P.hands.length; h++) { var eh2 = PT.training ? PT.training.validHand(P.hands[h]) : null; if (eh2) return fail('Hand ' + (h + 1) + ': ' + eh2 + '.'); hands.push(P.hands[h]); }
  }
  var learning = null;
  if (P.learning != null) { var el = PT.training ? PT.training.validLearning(P.learning) : 'unbekannt'; if (el) return fail('Lerndaten: ' + el + '.'); learning = P.learning; }
  return { ok: true, kind: 'backup', db: db, hero: hero, hands: hands, learning: learning, settings: P.settings || null, table: P.table || null, count: P.opponents.length };
}
function dbCanon(db) { return JSON.stringify(dbList(db)); }
function dbFromList(list) {
  var db = newDb(), skipped = 0;
  (list || []).forEach(function (r) {
    if (!validRecord(r, false) && !db.opps[r.id]) db.opps[r.id] = cloneRecord(r);
    else if (!validRecord(r, true) && !db.opps[r.id]) db.opps[r.id] = migrateV1(r);
    else skipped++;
  });
  db.skipped = skipped;
  return db;
}

PT.stats = { STATS: STATS, STAT_LABEL: STAT_LABEL, STAT_HELP: STAT_HELP, POSITIONS: POSITIONS, SHOWN_MAX: SHOWN_MAX,
  emptyStats: emptyStats, emptyAgg: emptyAgg, emptyPos: emptyPos, handStats: handStats, newDb: newDb, newRecord: newRecord,
  dbEnsure: dbEnsure, dbApplyHand: dbApplyHand, applyToRecord: applyToRecord, dbList: dbList, rate: rate, pctOf: pctOf, wilson: wilson, af: af,
  reliability: reliability, playerType: playerType, profile: profile, dbExport: dbExport, backupExport: backupExport, dbImport: dbImport,
  validRecord: validRecord, cloneRecord: cloneRecord, migrateV1: migrateV1, dbCanon: dbCanon, dbFromList: dbFromList, FORMAT_DB: FORMAT_DB };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
