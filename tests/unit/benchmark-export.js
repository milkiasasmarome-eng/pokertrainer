/* Benchmark-Export (Abschnitt 12): Schema, strenge Prüfung der neuen Entscheidungsfelder, Trennung Entscheidungszeitpunkt/später,
   keine persönlichen Daten, Reproduzierbarkeit über Seeds. */
'use strict';
module.exports = function (T) {
  const { PT, test, ok, eq, QUICK } = T;
  const sim = require('../app-sim.js');
  let HANDS = null;
  function hands() { if (!HANDS) HANDS = sim(PT, QUICK ? 14 : 40, 4711); return HANDS; }
  const clone = o => JSON.parse(JSON.stringify(o));

  test('Benchmark: neue Entscheidungsfelder werden erzeugt und streng geprüft (alte Datensätze bleiben gültig)', () => {
    const hs = hands();
    let bad = 0, withX = 0, extra = 0;
    hs.forEach(h => { if (PT.training.validHand(h)) bad++; h.decisions.forEach(d => { if (d.x) withX++; if (d.x && d.x.ex.length) extra++; }); });
    eq(bad, 0, 'alle erzeugten Hände gültig');
    ok(withX > 10, withX + ' Entscheidungen mit Zusatzfeldern');
    ok(extra >= 1, extra + ' Entscheidungen mit Nachberechnung (extra)');
    // Datensatz aus 2.0.1 ohne Zusatzfelder bleibt gültig
    const old = clone(hs.find(h => h.decisions.length)); old.decisions.forEach(d => { delete d.x; }); delete old.tseed;
    eq(PT.training.validHand(old), null, 'alter Datensatz ohne x gültig');
    const h0 = hs.find(h => h.decisions.some(d => d.x)), di = h0.decisions.findIndex(d => d.x);
    const bads = [
      ['x.v', d => { d.x.v = 2; }], ['x.sw HTML', d => { d.x.sw = '<b>'; }], ['x.mv zu lang', d => { d.x.mv = 'a'.repeat(41); }], ['x.lvl', d => { d.x.lvl = 'turbo'; }],
      ['x.it negativ', d => { d.x.it = -1; }], ['x.it 1e308', d => { d.x.it = 1e308; }], ['x.ms Text', d => { d.x.ms = '5'; }], ['x.ms Bruch', d => { d.x.ms = 1.5; }],
      ['x.eq.se > 1', d => { d.x.eq.se = 2; }], ['x.eq.m Objekt', d => { d.x.eq.m = {}; }], ['x.best.t', d => { d.x.best.t = 'allin'; }], ['x.ch.a Text', d => { d.x.ch.a = '100'; }],
      ['x.ex zu lang', d => { d.x.ex = [1, 2, 3, 4, 5]; }], ['x.alt zu lang', d => { d.x.alt = new Array(13).fill(d.x.alt[0]); }], ['x.alt.ev Bruch', d => { d.x.alt[0].ev = 0.5; }],
      ['x.alt.l zu lang', d => { d.x.alt[0].l = 'x'.repeat(81); }], ['x unbekanntes Feld', d => { d.x.foo = 1; }], ['x ohne Momentaufnahme', d => { d.snap = null; }],
      ['Entscheidung unbekanntes Feld', d => { d.__proto__x = 1; }], ['eq > 1', d => { d.eq = 1.5; }], ['need negativ', d => { d.need = -0.1; }], ['loss 1e308', d => { d.loss = 1e308; }],
      ['cls HTML', d => { d.cls = '<i>'; }], ['mode', d => { d.mode = 'solver'; }], ['pos HTML', d => { d.pos = '<b>'; }], ['evs.ev Text', d => { d.evs[0].ev = 'x'; }], ['score 1e308', d => { d.score = 1e308; }]
    ];
    bads.forEach(([name, f]) => { const h = clone(h0); f(h.decisions[di]); ok(!!PT.training.validHand(h), 'abgelehnt: ' + name); });
    const hb = [
      ['ts 1e308', h => { h.ts = 1e308; }], ['ts negativ', h => { h.ts = -5; }], ['heroNet Text', h => { h.heroNet = '5'; }], ['heroNet Bruch', h => { h.heroNet = 0.5; }],
      ['tseed', h => { h.tseed = -1; }], ['seed 2^32', h => { h.seed = 4294967296; }], ['won', h => { h.won = [1]; }], ['rake negativ', h => { h.rake = -1; }],
      ['returned', h => { h.returned = [{ seat: 9, amount: 1 }]; }], ['Platz-Typ HTML', h => { h.seats[1].typ = '<img>'; }], ['Platz-ID', h => { h.seats[1].id = 'a b'; }],
      ['Aktion cr Zahl', h => { h.actions[0].cr = 1; }], ['Aktion pot Text', h => { h.actions[0].pot = '1'; }], ['showdown Text', h => { h.showdown = 'ja'; }], ['sawFlop', h => { h.sawFlop = [7]; }]
    ];
    hb.forEach(([name, f]) => { const h = clone(h0); f(h); ok(!!PT.training.validHand(h), 'abgelehnt: ' + name); });
  });

  test('Benchmark: Schema, Trennung Entscheidungszeitpunkt / später, keine persönlichen Daten, byteweise reproduzierbar', () => {
    const hs = hands(), txt = PT.benchmark.exportText(hs), o = JSON.parse(txt);
    eq(o.format, 'PokerTrainer-Benchmark', 'Format'); eq(o.schemaVersion, 1, 'Schema-Version');
    eq(PT.benchmark.validate(o), null, 'Strukturprüfung');
    eq(o.count, hs.reduce((s, h) => s + h.decisions.length, 0), 'eine Zeile je Entscheidung');
    eq(txt, PT.benchmark.exportText(clone(hs).reverse()), 'gleiche Hände in anderer Reihenfolge → gleiche Datei');
    // Trennung: Board passend zur Straße, nur frühere Aktionen, keine später aufgedeckten Karten
    let sepBad = 0, complete = 0;
    o.decisions.forEach(d => {
      if (!d.complete) return; complete++;
      const k = d.knownAtDecision, cards = {};
      k.holeCards.concat(k.board).forEach(c => { cards[c] = 1; });
      if (k.actions.length !== d.actionIndex) sepBad++;
      const pv = JSON.stringify(k.publicView);
      d.revealedLater.shownCards.forEach(s => { if (s.seat !== k.heroSeat) s.cards.match(/../g).forEach(c => { if (cards[c] || pv.includes('"' + c + '"')) sepBad++; }); });
      if (d.revealedLater.finalBoard.slice(0, k.board.length).join() !== k.board.join()) sepBad++;
      if (k.opponents.some(op => op.shown.some(s => s.hand >= d.deal.handNumber))) sepBad++;  // Gegnerwerte nur aus früheren Händen
    });
    eq(sepBad, 0, 'keine späteren Informationen im Entscheidungsabschnitt');
    ok(complete === o.count, complete + ' vollständige Entscheidungen');
    // Keine persönlichen Daten: keine Zeitstempel, Sitzungen, Einstellungen, Lernprofil
    const banned = ['ts', 'session', 'lastSeen', 'firstSeen', 'created', 'exported', 'settings', 'learning', 'heroRec', 'sessionId'];
    const found = []; (function walk(x, p) {
      if (Array.isArray(x)) x.forEach((y, i) => walk(y, p + '[' + i + ']'));
      else if (x && typeof x === 'object') Object.keys(x).forEach(k => { if (banned.includes(k)) found.push(p + '.' + k); walk(x[k], p + '.' + k); });
      else if (typeof x === 'number' && x >= 1e12) found.push(p + '=' + x);
    })(o, '');
    eq(found.slice(0, 5).join(', '), '', 'keine Zeitstempel oder persönlichen Felder');
    ok(!/1700000000000|"Du ist|lernprofil/i.test(txt) && !txt.includes(String(hs[0].ts)), 'kein Zeitstempel im Text');
    // Manipulierter Export wird von validate erkannt
    const m = clone(o); m.decisions[0].revealedLater.heroNet += 1; ok(!!PT.benchmark.validate(m), 'Prüfsumme erkennt Veränderung');
  });

  test('Benchmark: Nachrechnung aus dem Export (gleicher Seed, gleiche Gegnerwerte) ergibt dieselbe Empfehlung und dieselben EV', () => {
    const o = JSON.parse(PT.benchmark.exportText(hands()));
    let same = 0, rec = 0, n = 0;
    o.decisions.slice(0, QUICK ? 24 : 80).forEach(d => {
      const inp = PT.benchmark.coachInput(d); if (!inp) return; n++;
      if (PT.equity.cacheClear) PT.equity.cacheClear();
      const a = PT.coach.analyze(inp);
      if (a.bestLabel === d.coach.recommendation.label) rec++;
      if (a.actions.slice(0, 12).map(x => x.label + ':' + Math.round(x.ev) + ':' + Math.round(x.u)).join('|') === d.coach.alternatives.map(x => x.label + ':' + x.ev + ':' + x.uncertainty).join('|')) same++;
    });
    ok(n >= 10, n + ' Entscheidungen nachgerechnet');
    eq(rec, n, 'gleiche Empfehlung');
    // Zeitlimit von 1,4 s je Analyse kann auf einer überlasteten Maschine die Simulationen begrenzen (dokumentiert); hier ≥ 95 %
    ok(same >= Math.ceil(0.95 * n), 'gleiche EV und Unsicherheit: ' + same + ' von ' + n);
  });
};
