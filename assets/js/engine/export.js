/* PokerTrainer 2.1 – Datenaustausch (kein DOM, läuft im Browser, im Web Worker und in Node):
   - PT.benchmark: versionierter Export je Entscheidung für unabhängige Offline-Vergleiche (Schema: docs/BENCHMARK_EXPORT.md).
     Zum Entscheidungszeitpunkt bekannte Informationen und spätere Informationen (Showdown, Ergebnis) stehen in getrennten Abschnitten.
     Keine persönlichen Daten: keine Zeitstempel, keine Sitzungskennungen, keine Einstellungen außer Analysemodus und -stufe, kein Lernprofil.
   - PT.dataport: Einlesen von Importdateien einschließlich der Rohsicherung aus der Startüberwachung (assets/js/recovery.js). */
(function (G) {
'use strict';
var PT = G.PT, U = PT.util, isInt = U.isInt;
var FORMAT = 'PokerTrainer-Benchmark', SCHEMA = 1;
var TYPES = ['fold', 'check', 'call', 'bet', 'raise', 'sb', 'bb'];
var STREETS = ['preflop', 'flop', 'turn', 'river'];
var SEPARATION = 'knownAtDecision enthält ausschließlich Informationen, die dem Spieler zum Entscheidungszeitpunkt vorlagen (eigene Karten, öffentliche Aktionen, Board bis zur aktuellen Straße, beobachtete Gegnerwerte aus früheren Händen). revealedLater enthält Informationen, die erst danach bekannt wurden (spätere Aktionen, weitere Boardkarten, aufgedeckte Karten, Ergebnis) und darf für die Bewertung der Entscheidung nicht verwendet werden.';

function modelVersion() { return (PT.coach && PT.coach.MODEL_VERSION) || ('coach-' + PT.VERSION); }
/** Stabile, nicht sprechende Hand-ID (enthält keinen Zeitstempel). */
function handId(h) { var s = String(h.id); return 'H' + U.fnv1a(s) + U.fnv1a(s + '|' + h.no + '|' + h.seed); }
function card(c) { return PT.cardStr(c); }
function num(x, d) { if (typeof x !== 'number' || !isFinite(x)) return null; var f = Math.pow(10, d == null ? 4 : d); return Math.round(x * f) / f; }
function intOrNull(x) { return isInt(x, -1e13, 1e13) ? x : null; }

/** Gegnerwerte zum Entscheidungszeitpunkt ohne Zeitstempel. */
function oppOut(r) {
  var stats = {}; Object.keys(r.stats || {}).forEach(function (k) { stats[k] = [r.stats[k][0], r.stats[k][1]]; });
  var pos = {}; Object.keys(r.pos || {}).forEach(function (p) { var x = r.pos[p]; pos[p] = { h: x.h, vpip: x.vpip.slice(), pfr: x.pfr.slice() }; });
  return { id: r.id, name: r.name, hands: r.hands, stats: stats, agg: r.agg ? { bet: r.agg.bet, raise: r.agg.raise, call: r.agg.call, fold: r.agg.fold, check: r.agg.check } : null, pos: pos,
    shown: (r.shown || []).map(function (s) { return { hand: s.hand, pos: s.pos, cards: s.cards, board: s.board, actions: s.actions.slice(), net: s.net }; }) };
}
/** Rückweg für Nachrechnungen: Export-Gegner → Datenbank-Datensatz (Zeitstempel 0). */
function oppIn(o) {
  return { id: o.id, name: o.name, status: 'aktiv', hands: o.hands, stats: JSON.parse(JSON.stringify(o.stats)), agg: o.agg ? Object.assign({}, o.agg) : { bet: 0, raise: 0, call: 0, fold: 0, check: 0 },
    pos: JSON.parse(JSON.stringify(o.pos)), shown: o.shown.map(function (s) { return { hand: s.hand, ts: 0, pos: s.pos, cards: s.cards, board: s.board, actions: s.actions.slice(), net: s.net }; }), lastSeen: 0, firstSeen: 0 };
}
function actOut(a) { return { street: STREETS[a.st], seat: a.s, type: a.t, amount: a.a, allIn: !!a.ai }; }

function decisionOut(h, d, seq) {
  var v = d.snap && d.snap.view, x = d.x || null, dId = handId(h) + '-A' + d.i;
  var known = null;
  if (v) {
    known = {
      street: STREETS[v.street], heroSeat: v.seat, position: (v.players[v.seat] || {}).pos || d.pos || null,
      holeCards: v.cards.map(card), board: v.board.map(card), button: v.button, blinds: { sb: v.sb, bb: v.bb }, potTotal: v.pot,
      toCall: v.legal.toCall,
      stacks: v.players.map(function (q) { return { seat: q.seat, name: q.name, position: q.pos, stack: q.stack, bet: q.bet, committed: q.total, start: q.start, folded: q.folded, allIn: q.allIn, hero: !!q.hero }; }),
      actions: v.actions.map(actOut),
      legal: { fold: v.legal.canFold, check: v.legal.canCheck, call: v.legal.canCall, callAmount: v.legal.callAmt, raise: v.legal.canRaise, isBet: v.legal.isBet, minTo: v.legal.minTo, maxTo: v.legal.maxTo },
      opponents: Object.keys(d.snap.opps || {}).sort().map(function (id) { return oppOut(d.snap.opps[id]); }),
      publicView: JSON.parse(JSON.stringify(v))
    };
  }
  var coach = {
    analysisMode: d.mode || null,
    level: x ? x.lvl : null,
    recommendation: { label: d.rec || null, type: x ? x.best.t : null, amount: x ? x.best.a : null },
    classification: d.cls || null,
    alternatives: x ? x.alt.map(function (y) { return { label: y.l, type: y.t, amount: y.a, ev: y.ev, uncertainty: y.u }; })
      : (d.evs || []).map(function (y) { return { label: y.l, type: null, amount: null, ev: y.ev, uncertainty: y.u }; }),
    equity: { value: num(d.eq, 4), standardError: x ? x.eq.se : null, method: x ? x.eq.m : null, rangeLow: x ? x.eq.lo : null, rangeHigh: x ? x.eq.hi : null },
    potOddsNeed: num(d.need, 4),
    iterations: x ? x.it : null, maxIterations: x ? x.max : null, durationMs: x ? x.ms : null,
    modelVersion: x ? x.mv : null, softwareVersion: x ? x.sw : null,
    seed: d.snap ? d.snap.seed : null, extraSizes: x ? x.ex.slice() : []
  };
  var player = { label: d.chosen || null, type: x ? x.ch.t : null, amount: x ? x.ch.a : null, grade: d.grade, score: num(d.score, 2), evLoss: intOrNull(d.loss) };
  var later = {
    notice: 'Erst nach der Entscheidung bekannt – nicht für die Bewertung der Entscheidung verwenden.',
    laterActions: h.actions.slice(d.i + 1).map(actOut),
    finalBoard: h.board.slice(),
    shownCards: (h.shown || []).map(function (s) { return { seat: s.seat, name: (h.seats[s.seat] || {}).name || null, cards: s.cards }; }),
    showdown: !!h.showdown, heroNet: h.heroNet,
    pots: (h.pots || []).map(function (p) { return { amount: p.amount, winners: p.winners.slice() }; })
  };
  return { decisionId: dId, handId: handId(h), actionIndex: d.i, sequence: seq, training: h.training || null, complete: !!(x && known),
    // Austeilen reproduzierbar: Deck = PT.rng.stream(tableSeed, 'deal', handNumber) bzw. Trainingssituation aus trainingSeed
    deal: { tableSeed: isInt(h.seed, 0, 4294967295) ? h.seed : null, handNumber: h.no, trainingSeed: h.tseed != null ? h.tseed : null },
    knownAtDecision: known, coach: coach, playerDecision: player, revealedLater: later };
}

/**
 * Baut den Benchmark-Export aus Handdatensätzen (PT.training.makeHandRecord). Ungültige Datensätze werden übersprungen.
 * Gleiche Eingabe → byteweise gleiche Ausgabe (kein Exportzeitpunkt im Inhalt).
 */
function build(hands) {
  var list = (hands || []).filter(function (h) { return PT.training && !PT.training.validHand(h); });
  list.sort(function (a, b) { return a.ts !== b.ts ? a.ts - b.ts : (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
  var decisions = [], skipped = (hands || []).length - list.length;
  list.forEach(function (h) { (h.decisions || []).slice().sort(function (a, b) { return a.i - b.i; }).forEach(function (d, k) { decisions.push(decisionOut(h, d, k + 1)); }); });
  var body = JSON.stringify(decisions);
  return { format: FORMAT, schemaVersion: SCHEMA, software: { name: 'PokerTrainer', version: PT.VERSION }, modelVersion: modelVersion(),
    units: { money: 'Cent Spielgeld (blinds.bb = 1 Big Blind)', equity: 'Anteil 0–1', ev: 'Cent, Erwartungswert der Aktion gegenüber Fold ab dem Entscheidungszeitpunkt' },
    separation: SEPARATION, hands: list.length, skippedHands: skipped, count: decisions.length, contentHash: U.fnv1a(body), decisions: decisions };
}
function exportText(hands) { return JSON.stringify(build(hands), null, 1) + '\n'; }

/** Strukturprüfung eines Benchmark-Exports (für Empfänger und Tests). Gibt null oder eine Fehlerbeschreibung zurück. */
function validate(o) {
  if (!o || typeof o !== 'object' || o.format !== FORMAT) return 'kein Benchmark-Export';
  if (o.schemaVersion !== SCHEMA) return 'unbekannte Schema-Version ' + o.schemaVersion;
  if (!Array.isArray(o.decisions) || o.count !== o.decisions.length) return 'Entscheidungsliste ungültig';
  if (U.fnv1a(JSON.stringify(o.decisions)) !== o.contentHash) return 'Prüfsumme stimmt nicht';
  var ids = {};
  for (var i = 0; i < o.decisions.length; i++) {
    var d = o.decisions[i], k = d.knownAtDecision, c = d.coach, lt = d.revealedLater, n = 'Entscheidung ' + (i + 1) + ': ';
    if (typeof d.decisionId !== 'string' || ids[d.decisionId]) return n + 'ID fehlt oder doppelt'; ids[d.decisionId] = 1;
    if (typeof d.handId !== 'string' || !isInt(d.actionIndex, 0, 400)) return n + 'Hand-ID/Index';
    if (!c || !Array.isArray(c.alternatives) || !c.equity || !lt || !Array.isArray(lt.laterActions)) return n + 'Abschnitte fehlen';
    if (d.complete) {
      if (!k || !Array.isArray(k.holeCards) || k.holeCards.length !== 2 || !Array.isArray(k.board) || [0, 3, 4, 5][STREETS.indexOf(k.street)] !== k.board.length) return n + 'Karten/Straße';
      if (!k.legal || !Array.isArray(k.stacks) || !Array.isArray(k.actions) || !k.publicView) return n + 'Spielzustand';
      if (typeof c.modelVersion !== 'string' || typeof c.softwareVersion !== 'string' || !isInt(c.iterations, 0, 1e8) || !isInt(c.durationMs, 0, 1e8)) return n + 'Versionen/Rechenangaben';
      if (!isInt(c.seed, 0, 4294967295) || ['exploit', 'gto'].indexOf(c.analysisMode) < 0) return n + 'Seed/Modus';
      for (var j = 0; j < c.alternatives.length; j++) { var a = c.alternatives[j]; if (TYPES.indexOf(a.type) < 0 || typeof a.ev !== 'number' || typeof a.uncertainty !== 'number') return n + 'Alternative ' + (j + 1); }
      // Keine Karte, die erst später aufgedeckt wurde, darf im Abschnitt der Entscheidung stehen (Gegnerwerte enthalten nur frühere Hände)
      var seen = {}; k.holeCards.concat(k.board).forEach(function (x) { seen[x] = 1; });
      var pv = k.publicView; if (pv.players.some(function (q) { return q.cards; })) return n + 'verdeckte Karten im Spielzustand';
      for (var s = 0; s < lt.shownCards.length; s++) { var sc = lt.shownCards[s]; if (sc.seat !== k.heroSeat && sc.cards.match(/../g).some(function (x) { return seen[x]; })) return n + 'spätere Karten im Entscheidungsabschnitt'; }
    }
  }
  return null;
}
/** Eingabe für eine unabhängige Nachrechnung mit PT.coach.analyze (gleicher Seed, gleiche Gegnerwerte, gleiche Stufe). */
function coachInput(d) {
  if (!d || !d.complete) return null;
  var opps = {}; d.knownAtDecision.opponents.forEach(function (o) { opps[o.id] = oppIn(o); });
  return { view: JSON.parse(JSON.stringify(d.knownAtDecision.publicView)), opps: opps, settings: { mode: d.coach.analysisMode, level: d.coach.level }, seed: d.coach.seed,
    extra: d.coach.extraSizes.length ? d.coach.extraSizes.slice() : undefined, live: d.coach.level === 'schnell' || d.coach.level === 'standard' };
}

// ---------- Import einschließlich Rohsicherung ----------
var RAW = 'PokerTrainer-Rohsicherung', MAX_HANDS = 3000;
function rawStores(o) {
  var out = { meta: [], opps: [], hands: [], learn: [] }, idb = o.indexedDB && typeof o.indexedDB === 'object' ? o.indexedDB.pokertrainer2 : null;
  if (idb && typeof idb === 'object') Object.keys(out).forEach(function (k) { if (Array.isArray(idb[k])) out[k] = idb[k]; });
  var ls = o.localStorage && typeof o.localStorage === 'object' ? o.localStorage : {};
  Object.keys(out).forEach(function (k) {
    if (out[k].length || typeof ls['pokertrainer20.' + k] !== 'string') return;
    try { var m = JSON.parse(ls['pokertrainer20.' + k]); if (m && typeof m === 'object' && !Array.isArray(m)) out[k] = Object.keys(m).map(function (x) { return m[x]; }); } catch (e) { /* beschädigt */ }
  });
  return out;
}
/** Rohsicherung → reguläre Sicherung: gültige Einträge übernehmen, beschädigte zählen und überspringen. */
function rawToBackup(o) {
  var st = rawStores(o), T = PT.training, S = PT.stats, info = { opps: 0, oppsSkipped: 0, hands: 0, handsSkipped: 0, hero: false, learning: 'fehlt' };
  var objs = st.opps.filter(function (r) { return r && typeof r === 'object' && !Array.isArray(r); });
  var db = S.dbFromList(objs); info.opps = Object.keys(db.opps).length; info.oppsSkipped = st.opps.length - info.opps;
  var meta = st.meta.filter(function (m) { return m && m.k === 'state'; })[0] || null, hero = null;
  if (meta && meta.heroRec && !S.validRecord(meta.heroRec)) { hero = S.cloneRecord(meta.heroRec); info.hero = true; }
  var hands = st.hands.filter(function (h) { return !T.validHand(h); });
  info.handsSkipped = st.hands.length - hands.length;
  hands.sort(function (a, b) { return a.ts - b.ts; }); hands = hands.slice(-MAX_HANDS); info.hands = hands.length;
  var lrec = st.learn.filter(function (m) { return m && m.k === 'learning'; })[0], learning = null;
  if (lrec && lrec.v) {
    if (!T.validLearning(lrec.v)) { learning = lrec.v; info.learning = 'übernommen'; }
    else { var rep = T.repairLearning(lrec.v); if (rep) { learning = rep.learning; info.learning = 'repariert (' + rep.removed + ' Einträge entfernt)'; } else info.learning = 'beschädigt, nicht übernommen'; }
  }
  var payload = { opponents: S.dbList(db), hero: hero, hands: hands, learning: learning, settings: null, table: null };
  return { text: S.backupExport(payload, 'aus Rohsicherung ' + String(o.created || '').slice(0, 40)), info: info };
}
/** Liest eine Importdatei (Datenbank, Sicherung oder Rohsicherung). Ergebnis wie PT.stats.dbImport, bei Rohsicherung mit .raw. */
function parseImport(text) {
  if (typeof text === 'string' && text.length <= 60 * 1024 * 1024 && /^\s*\{\s*"format"\s*:\s*"PokerTrainer-Rohsicherung"/.test(text.slice(0, 120))) {
    var o; try { o = JSON.parse(text); } catch (e) { return { ok: false, error: 'Die Rohsicherung ist beschädigt oder abgeschnitten (kein gültiges JSON).' }; }
    if (!o || o.format !== RAW || o.version !== 1) return { ok: false, error: 'Unbekannte Version der Rohsicherung.' };
    var conv = rawToBackup(o), r = PT.stats.dbImport(conv.text);
    if (r.ok) { r.raw = conv.info; r.kind = 'backup'; }
    return r;
  }
  return PT.stats.dbImport(text);
}

PT.benchmark = { FORMAT: FORMAT, SCHEMA: SCHEMA, build: build, exportText: exportText, validate: validate, coachInput: coachInput, handId: handId, modelVersion: modelVersion, SEPARATION: SEPARATION };
PT.dataport = { parseImport: parseImport, rawToBackup: rawToBackup, RAW: RAW };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
