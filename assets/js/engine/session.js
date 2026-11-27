/* PokerTrainer 2.0 – Tisch und Session: Plätze, Button, Nachkäufe, Gegnerwechsel, Schwierigkeit,
   getrennte Zufallsströme (Austeilen, Bots, Tisch) und Wiederaufnahme einer laufenden Hand. */
(function (G) {
'use strict';
var PT = G.PT, U = PT.util, S = PT.stats, B = PT.bots, isInt = U.isInt;
var N = 6;

var DIFFICULTY = {
  gemischt: { name: 'Gemischtes Teilnehmerfeld', w: null },
  anfaenger: { name: 'Anfänger', w: { lp: 3, vl: 2, nit: 2, tag: 0.4, lag: 0.3, bal: 0.2 } },
  fortgeschritten: { name: 'Fortgeschritten', w: { lp: 1, vl: 1, nit: 1, tag: 1.6, lag: 1.1, bal: 1 } },
  experte: { name: 'Experte', w: { lp: 0.1, vl: 0.2, nit: 0.3, tag: 2, lag: 1.6, bal: 2.2 } }
};
function defaultConfig() {
  return { sb: 50, bb: 100, startBB: 100, rebuyBelowBB: 1, topUp: false, swapEvery: 30, difficulty: 'gemischt',
    composition: null, rake: { on: false, pct: 0.05, capBB: 3, nfnd: true } };
}
function validConfig(c) {
  if (!c || typeof c !== 'object') return false;
  if (!isInt(c.bb, 2, 1e7) || !isInt(c.sb, 1, c.bb) || !isInt(c.startBB, 10, 1000) || typeof c.rebuyBelowBB !== 'number' || !(c.rebuyBelowBB >= 0 && c.rebuyBelowBB <= 1000)) return false;
  if (!isInt(c.swapEvery, 0, 10000) || !DIFFICULTY[c.difficulty]) return false;
  if (!c.rake || typeof c.rake.on !== 'boolean' || !(c.rake.pct >= 0 && c.rake.pct <= 0.1) || !(c.rake.capBB >= 0 && c.rake.capBB <= 20)) return false;
  return true;
}
function weightsFor(cfg) {
  if (cfg.composition) return cfg.composition;
  return DIFFICULTY[cfg.difficulty] ? DIFFICULTY[cfg.difficulty].w : null;
}
function pickIds(rng, n, exclude, cfg) {
  var w = weightsFor(cfg || defaultConfig()), cand = (cfg && Array.isArray(cfg.pool) && cfg.pool.length >= N ? cfg.pool.filter(function (id) { return !!B.paramsOf(id); }) : B.POOL.map(function (p) { return p.id; })).filter(function (id) { return exclude.indexOf(id) < 0; }), out = [];
  for (var i = 0; i < n && cand.length; i++) {
    var tot = 0, ws = cand.map(function (id) { var x = w ? (w[B.styleOf(id)] || 0) : 1; tot += x; return x; });
    var r = rng() * tot, k = 0;
    if (tot <= 0) k = Math.floor(rng() * cand.length);
    else { while (k < ws.length - 1 && r >= ws[k]) { r -= ws[k]; k++; } }
    out.push(cand.splice(k, 1)[0]);
  }
  return out;
}
function syncStatuses(t, db) {
  var seated = {};
  t.seats.forEach(function (s, i) { if (i > 0) { seated[s.id] = 1; S.dbEnsure(db, s.id, B.nameOf(s.id)).status = 'aktiv'; } });
  Object.keys(db.opps).forEach(function (id) { if (!seated[id]) db.opps[id].status = 'archiv'; });
}
function newTable(cfg, db, seed) {
  cfg = cfg || defaultConfig();
  seed = seed == null ? PT.rng.newSeed() : seed >>> 0;
  var r = PT.rng.stream(seed, 'tisch', 0), start = cfg.startBB * cfg.bb;
  var ids = pickIds(r, N - 1, [], cfg);
  var t = { v: 2, seed: seed, handNo: 0, sinceSwap: 0, button: Math.floor(r() * N), buyins: 1, rebuys: 0, rakeTotal: 0, lastLeft: null, cfg: U.deepClone(cfg),
    seats: [{ id: 'hero', stack: start }].concat(ids.map(function (id) { return { id: id, stack: start }; })), running: null, session: { start: Date.now ? Date.now() : 0, hands: 0 } };
  if (db) syncStatuses(t, db);
  return t;
}
function validTable(t) {
  if (!t || typeof t !== 'object' || !Array.isArray(t.seats) || t.seats.length !== N) return false;
  if (!isInt(t.seed, 0, 4294967295) || !isInt(t.handNo, 0, 1e12) || !isInt(t.button, 0, N - 1) || !isInt(t.buyins, 1, 1e9)) return false;
  if (!validConfig(t.cfg) || !isInt(t.sinceSwap, 0, Math.max(0, t.cfg.swapEvery))) return false;
  if (t.seats[0].id !== 'hero') return false;
  var seen = {};
  for (var i = 0; i < N; i++) {
    var s = t.seats[i];
    if (!s || !isInt(s.stack, 1, 1e12)) return false;
    if (i > 0) { if (!B.paramsOf(s.id) || seen[s.id]) return false; seen[s.id] = 1; }
  }
  return true;
}
/** Migration des Tisch-Formats aus Entwurf 2 (v1) */
function migrateTable(old, db) {
  var cfg = defaultConfig(), t = newTable(cfg, null, PT.rng.newSeed());
  if (old && Array.isArray(old.seats) && old.seats.length === N && old.seats[0] && old.seats[0].id === 'hero') {
    var ok = old.seats.every(function (s, i) { return s && isInt(s.stack, 1, 1e12) && (i === 0 || B.paramsOf(s.id)); });
    if (ok) {
      t.seats = old.seats.map(function (s) { return { id: s.id, stack: s.stack }; });
      if (isInt(old.handNo, 0, 1e12)) t.handNo = old.handNo;
      if (isInt(old.button, 0, N - 1)) t.button = old.button;
      if (isInt(old.buyins, 1, 1e9)) t.buyins = old.buyins;
      if (isInt(old.sinceSwap, 0, 29)) t.sinceSwap = old.sinceSwap;
    }
  }
  if (db) syncStatuses(t, db);
  return t;
}
function streams(t, no) {
  return { deal: PT.rng.stream(t.seed, 'deal', no), bots: PT.rng.stream(t.seed, 'bots', no), table: PT.rng.stream(t.seed, 'tisch', no) };
}
/** Neue Hand. Button rückt vor; Deck stammt aus dem Austeil-Strom (unabhängig von Coach und Bots). */
function startHand(t, ts, deck) {
  var no = t.handNo + 1, button = (t.button + 1) % N, st = streams(t, no);
  var players = t.seats.map(function (s, i) { return { id: s.id, name: i === 0 ? 'Du' : B.nameOf(s.id), stack: s.stack, isHero: i === 0 }; });
  var rake = t.cfg.rake && t.cfg.rake.on ? { pct: t.cfg.rake.pct, cap: Math.round(t.cfg.rake.capBB * t.cfg.bb), nfnd: t.cfg.rake.nfnd } : null;
  var h = new PT.Hand({ players: players, button: button, sb: t.cfg.sb, bb: t.cfg.bb, no: no, ts: ts || 0, rake: rake,
    deck: deck || PT.cards.shuffledDeck(st.deal) }).start();
  h.botRng = st.bots;
  t.button = button;
  t.running = { no: no, button: button, ts: ts || 0, acts: [] };
  return h;
}
/** Führt eine Aktion aus und protokolliert sie für die Wiederaufnahme. */
function act(t, h, seat, a) {
  var r = h.act(seat, a);
  if (r.ok && t.running && t.running.no === h.no) {
    var x = { s: seat, type: r.action.t };
    if (r.action.t === 'bet' || r.action.t === 'raise') x.amount = r.action.a;
    t.running.acts.push(x);
  }
  return r;
}
function heroCtx(heroRec) {
  if (!heroRec) return null;
  return { raw: heroRec.stats, sm: PT.ranges.smooth(heroRec.stats), hands: heroRec.hands };
}
function botAct(t, h, heroRec) {
  var s = h.toAct; if (s < 0 || h.p[s].isHero) return null;
  var a = B.decideFor(h, s, h.botRng, { heroStats: heroCtx(heroRec) });
  var r = act(t, h, s, a);
  if (!r.ok) {
    var L = h.legal(s);
    r = act(t, h, s, L.canCheck ? { type: 'check' } : { type: 'call' });
    r.fallback = true;
  }
  return r;
}
/** Stellt eine beim Neuladen laufende Hand exakt wieder her (gleicher Seed, gleiche Aktionen). */
function resumeHand(t, heroRec) {
  var run = t.running; if (!run) return null;
  t.handNo = run.no - 1; t.button = (run.button - 1 + N) % N;
  var acts = run.acts.slice();
  var h = startHand(t, run.ts);
  for (var i = 0; i < acts.length; i++) {
    var x = acts[i], s = h.toAct;
    if (s !== x.s) return null;
    if (!h.p[s].isHero) { var bot = botAct(t, h, heroRec); if (!bot || !bot.ok || bot.action.t !== x.type) return null; }
    else { var r = act(t, h, s, x.amount != null ? { type: x.type, amount: x.amount } : { type: x.type }); if (!r.ok) return null; }
  }
  return h;
}
/** Nach der Hand: Werte, Stacks, Nachkäufe, Gegnerwechsel. */
function finishHand(t, db, h, heroRec) {
  var rec = h.publicRecord(), st = streams(t, h.no), ev = { rebuys: [], swap: null };
  var changed = S.dbApplyHand(db, rec, heroRec);
  h.p.forEach(function (q, i) { t.seats[i].stack = q.stack; });
  t.handNo = h.no; t.sinceSwap += 1; t.running = null; t.rakeTotal += h.result.rake || 0;
  if (t.session) t.session.hands = (t.session.hands || 0) + 1;
  var start = t.cfg.startBB * t.cfg.bb, below = Math.max(1, Math.round(t.cfg.rebuyBelowBB * t.cfg.bb));
  t.seats.forEach(function (s, i) {
    if (s.stack < below || (t.cfg.topUp && s.stack < start)) {
      var add = start - s.stack; if (add <= 0) return;
      s.stack = start; if (i === 0) { t.buyins += 1; t.rebuys += 1; t.heroAdded = (t.heroAdded || 0) + add; } ev.rebuys.push({ seat: i, amount: add });
    }
  });
  if (t.cfg.swapEvery > 0 && t.sinceSwap >= t.cfg.swapEvery) {
    t.sinceSwap = 0;
    var seat = 1 + Math.floor(st.table() * (N - 1)), left = t.seats[seat].id;
    var excl = t.seats.map(function (s) { return s.id; });
    var joined = pickIds(st.table, 1, excl, t.cfg)[0];
    t.seats[seat] = { id: joined, stack: start };
    if (db.opps[left]) db.opps[left].status = 'archiv';
    S.dbEnsure(db, joined, B.nameOf(joined)).status = 'aktiv';
    t.lastLeft = left;
    ev.swap = { seat: seat, left: left, joined: joined, leftName: B.nameOf(left), joinedName: B.nameOf(joined) };
    changed.push(left, joined);
  }
  return { rec: rec, changed: changed, ev: ev };
}
/** Spielgeld-Ergebnis des Helden: aktueller Stack minus eingezahltes Geld */
function heroNet(t) {
  var start = t.cfg.startBB * t.cfg.bb;
  return t.seats[0].stack - start - (t.heroAdded != null ? t.heroAdded : (t.buyins - 1) * start);
}

PT.session = { N: N, DIFFICULTY: DIFFICULTY, defaultConfig: defaultConfig, validConfig: validConfig, pickIds: pickIds, syncStatuses: syncStatuses,
  newTable: newTable, validTable: validTable, migrateTable: migrateTable, streams: streams, startHand: startHand, act: act, botAct: botAct,
  heroCtx: heroCtx, resumeHand: resumeHand, finishHand: finishHand, heroNet: heroNet };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
