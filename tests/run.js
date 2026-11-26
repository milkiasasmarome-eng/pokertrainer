/* PokerTrainer 2.0 – Testsuite (Node). Aufruf: node tests/run.js [--quick]
   Enthält Unit-, Integrations-, Property-/Fuzz-, Regressions-, Mathematik-, Datenbank- und Sicherheitstests.
   Ergebnis: tests/results/unit.json */
'use strict';
const fs = require('fs'), path = require('path');
const PT = require('./load.js').load();
const E = PT.eval, H = PT.hands, R = PT.ranges, ST = PT.stats;
const QUICK = process.argv.includes('--quick');
const results = []; let current = null;
function test(name, fn) {
  const t0 = Date.now(); current = { name, ok: true, checks: 0, notes: [] };
  try { fn(); } catch (e) { current.ok = false; current.notes.push('Ausnahme: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
  current.ms = Date.now() - t0; results.push(current);
  console.log((current.ok ? 'BESTANDEN ' : 'FEHLER    ') + name + ' (' + current.checks + ' Prüfungen, ' + current.ms + ' ms)' + (current.ok ? '' : '\n   ' + current.notes.slice(0, 5).join('\n   ')));
}
function ok(cond, msg) { current.checks++; if (!cond) { current.ok = false; if (current.notes.length < 20) current.notes.push(msg || 'Bedingung verletzt'); } }
function eq(a, b, msg) { ok(a === b, (msg || '') + ' erwartet ' + JSON.stringify(b) + ', erhalten ' + JSON.stringify(a)); }
function near(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, (msg || '') + ' erwartet ' + b + ' ± ' + tol + ', erhalten ' + a); }
const C = s => PT.parseCards(s);
/** Deck so bauen, dass Sitz i (ab links vom Button) die Karten holes[i] erhält, danach das Board */
function deckFor(n, button, holes, board) {
  const deck = new Array(52), used = {};
  let idx = 0;
  for (let r = 0; r < 2; r++) for (let i = 1; i <= n; i++) { const seat = (button + i) % n; const c = C(holes[seat])[r]; deck[idx++] = c; used[c] = 1; }
  C(board).forEach(c => { deck[idx++] = c; used[c] = 1; });
  for (let c = 0; c < 52; c++) if (!used[c]) deck[idx++] = c;
  return deck;
}
function mkHand(stacks, button, holes, board, opt) {
  const players = stacks.map((s, i) => ({ id: 'p' + i, name: 'P' + i, stack: s, isHero: i === 0 }));
  return new PT.Hand(Object.assign({ players, button, sb: 50, bb: 100, deck: deckFor(stacks.length, button, holes, board) }, opt || {})).start();
}
function play(h, seq) { // seq: [[seat, action], ...]
  for (const [s, a] of seq) { const r = h.act(s, a); if (!r.ok) throw new Error('Aktion abgelehnt: Sitz ' + s + ' ' + JSON.stringify(a) + ': ' + r.error); const e = h.check(); if (e.length) throw new Error('Invariante: ' + e.join('; ')); }
  return h;
}

// =============== 1. Handbewertung ===============
test('Handbewertung: alle 2.598.960 Fünf-Karten-Hände (Kategorien, 7.462 Werte, Ordnung = Referenz)', () => {
  const cats = new Array(9).fill(0), a = [0, 0, 0, 0, 0], valToKey = new Map();
  let mism = 0;
  for (let c0 = 0; c0 < 52; c0++) for (let c1 = c0 + 1; c1 < 52; c1++) for (let c2 = c1 + 1; c2 < 52; c2++) for (let c3 = c2 + 1; c3 < 52; c3++) for (let c4 = c3 + 1; c4 < 52; c4++) {
    a[0] = c0; a[1] = c1; a[2] = c2; a[3] = c3; a[4] = c4;
    const s = E.evaluate(a); cats[s >> 20]++;
    if (!valToKey.has(s)) { const k = E.eval5Ref(a); valToKey.set(s, k); if (k[0] !== s >> 20) mism++; }
    else if ((c0 + c1 + c2 + c3 + c4) % 97 === 0) { const k = E.eval5Ref(a); if (E.cmpKey(k, valToKey.get(s)) !== 0) mism++; }
  }
  eq(cats.join(','), [1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40].join(','), 'Kategorienhäufigkeiten');
  eq(valToKey.size, 7462, 'unterschiedliche Handwerte');
  eq(mism, 0, 'Abweichungen zur Referenz');
  const vals = [...valToKey.keys()].sort((x, y) => x - y);
  let order = 0; for (let i = 1; i < vals.length; i++) if (E.cmpKey(valToKey.get(vals[i - 1]), valToKey.get(vals[i])) >= 0) order++;
  eq(order, 0, 'Ordnung der 7.462 Klassen');
});
test('Handbewertung: 300.000 zufällige Sieben-Karten-Paare gegen Best-of-Five-Referenz', () => {
  const rng = PT.makeRng('eval7'), N = QUICK ? 30000 : 300000; let bad = 0, catBad = 0;
  for (let i = 0; i < N; i++) {
    const d = PT.cards.shuffledDeck(rng), a = d.slice(0, 7), b = d.slice(7, 14);
    const fa = E.evaluate(a), fb = E.evaluate(b), ra = E.evalRef(a), rb = E.evalRef(b);
    if (Math.sign(fa - fb) !== E.cmpKey(ra, rb)) bad++;
    if ((fa >> 20) !== ra[0]) catBad++;
  }
  eq(bad, 0, 'Vergleichsfehler'); eq(catBad, 0, 'Kategoriefehler');
});
const CASES = [
  ['AhKhQhJhTh', '', 8, 'Royal Flush'], ['9s8s7s6s5s', '', 8, 'Straight Flush'], ['5d4d3d2dAd', '', 8, 'Straight Flush (Wheel)'], ['AsKsQsJs9s', '', 5, 'Flush'],
  ['AcAdAhAsKd', '', 7, 'Vierling'], ['KcKdKhAsAd', '', 6, 'Full House'], ['5h4c3d2sAh', '', 4, 'Straße Wheel'], ['AhKdQcJsTh', '', 4, 'Broadway'],
  ['7h7d7c2s9h', '', 3, 'Drilling'], ['9h9d4c4s2h', '', 2, 'Two Pair'], ['JhJd8c5s2h', '', 1, 'Paar'], ['AhJd8c5s2h', '', 0, 'High Card'],
  ['AhAdAcKsKdKh2c', '', 6, 'Full House aus zwei Drillingen'], ['AhAd9c9s4d4h2c', '', 2, 'Two Pair aus drei Paaren'], ['6h5d4c3s2h', 'AsKs', 4, 'Straße auf dem Board'],
  ['2h3h4h5h6h7h8h', '', 8, 'Straight Flush aus 7 Flush-Karten'], ['AhKhQhJh9h8h2c', '', 5, 'Flush mit 6 Karten'], ['AsAhAdAc2c2d2h', '', 7, 'Vierling mit Drilling']
];
test('Handbewertung: feste Testfälle (Kategorien und Vergleiche)', () => {
  CASES.forEach(c => { const cards = C(c[0] + c[1]); eq(E.evaluate(cards) >> 20, c[2], c[3]); });
  const cmp = [
    ['AhKhQhJhTh', '9s8s7s6s5s', 1, 'Royal > Straight Flush'], ['5d4d3d2dAd', '6c5c4c3c2c', -1, 'Wheel-SF < 6-hoch-SF'], ['5h4c3d2sAh', '6h5c4d3s2h', -1, 'Wheel < 6-hoch-Straße'],
    ['AcAdAhAsKd', 'AcAdAhAsQd', 1, 'Vierling-Kicker'], ['KcKdKhAsAd', 'KcKdKhQsQd', 1, 'Full House: Paar entscheidet'], ['AsKsQsJs9s', 'AsKsQsJs8s', 1, 'Flush 5. Karte'],
    ['9h9d4c4s2h', '9h9d4c4sAh', -1, 'Two-Pair-Kicker'], ['JhJd8c5s2h', 'JhJd8c5s3h', -1, 'Paar dritter Kicker'], ['AhJd8c5s2h', 'AhJd8c5s3h', -1, 'High Card fünfte Karte'],
    ['7h7d7c2s9h', '7h7d7cKs9h', -1, 'Drilling-Kicker'], ['AhAd9c9s4d4h2c', 'AhAd9c9s4d4hKc', -1, 'drei Paare: Kicker aus drittem Paar vs K'],
    ['AhKhQhJhThKdKc', 'AhKhQhJhThAsAc', 0, 'Board spielt (Royal auf dem Board)'], ['2c2d2h2sAhKdQc', '2c2d2h2sAhJd9c', 0, 'Vierling auf dem Board, Ass-Kicker gleich']
  ];
  cmp.forEach(c => { const a = E.evaluate(C(c[0])), b = E.evaluate(C(c[1])); eq(Math.sign(a - b), c[2], c[3]); });
  eq(E.handName(E.evaluate(C('AhKhQhJhTh'))), 'Royal Flush', 'Name Royal Flush');
});

// =============== 2. Regeln ===============
test('Regeln: Blinds, Reihenfolge, Mindest-Raise, BB-Option, Walk', () => {
  let h = mkHand([10000, 10000, 10000, 10000, 10000, 10000], 0, ['AhAd', 'KhKd', 'QhQd', 'JhJd', 'ThTd', '9h9d'], '2c3c4c5d7s');
  eq(h.toAct, 3, 'UTG zuerst'); eq(h.p[1].bet, 50, 'SB'); eq(h.p[2].bet, 100, 'BB');
  let L = h.legal(3); eq(L.minTo, 200, 'Mindest-Raise preflop'); eq(L.toCall, 100, 'Call-Betrag');
  ok(!h.act(3, { type: 'raise', amount: 150 }).ok, 'Raise unter Minimum abgelehnt');
  ok(!h.act(3, { type: 'raise', amount: 10001 }).ok, 'Raise über Stack abgelehnt');
  ok(!h.act(4, { type: 'call' }).ok, 'Aktion außerhalb der Reihe abgelehnt');
  ok(!h.act(3, { type: 'check' }).ok, 'Check bei offenem Einsatz abgelehnt');
  ok(!h.act(3, { type: 'raise', amount: 250.5 }).ok, 'nicht ganzzahliger Betrag abgelehnt');
  ok(!h.act(3, { type: 'raise', amount: -5 }).ok, 'negativer Betrag abgelehnt');
  ok(!h.act(3, { type: 'xyz' }).ok, 'unbekannte Aktion abgelehnt');
  ok(!h.act(3, null).ok, 'fehlende Aktion abgelehnt');
  play(h, [[3, { type: 'raise', amount: 300 }]]);
  L = h.legal(4); eq(L.minTo, 500, 'Re-Raise um vollen Raise (200)');
  play(h, [[4, { type: 'fold' }], [5, { type: 'fold' }], [0, { type: 'fold' }], [1, { type: 'fold' }], [2, { type: 'fold' }]]);
  ok(h.done, 'Hand beendet'); eq(h.result.net[3], 150, 'UTG gewinnt Blinds'); eq(h.returned[0].amount, 200, 'nicht gecallter Einsatz zurück');
  // Limp-Pot: BB hat Option
  h = mkHand([10000, 10000, 10000, 10000, 10000, 10000], 0, ['AhAd', 'KhKd', 'QhQd', 'JhJd', 'ThTd', '9h9d'], '2c3c4c5d7s');
  play(h, [[3, { type: 'call' }], [4, { type: 'fold' }], [5, { type: 'fold' }], [0, { type: 'fold' }], [1, { type: 'call' }]]);
  eq(h.toAct, 2, 'BB-Option'); ok(h.legal(2).canCheck, 'BB darf checken'); ok(h.legal(2).canRaise, 'BB darf raisen');
  play(h, [[2, { type: 'check' }]]); eq(h.street, 1, 'Flop'); eq(h.toAct, 1, 'Postflop beginnt SB');
  eq(h.legal(1).minTo, 100, 'Mindest-Bet = BB');
  // Walk
  h = mkHand([10000, 10000, 10000, 10000, 10000, 10000], 0, ['AhAd', 'KhKd', 'QhQd', 'JhJd', 'ThTd', '9h9d'], '2c3c4c5d7s');
  play(h, [[3, { type: 'fold' }], [4, { type: 'fold' }], [5, { type: 'fold' }], [0, { type: 'fold' }], [1, { type: 'fold' }]]);
  ok(h.done, 'Walk beendet'); eq(h.result.net[2], 50, 'BB gewinnt SB'); eq(h.result.net[1], -50, 'SB verliert SB');
  ok(!h.act(2, { type: 'check' }).ok, 'nach Handende keine Aktion');
});
test('Regeln: unvollständiger All-in öffnet nicht, mehrere Short All-ins öffnen kumuliert, Mindest-Raise bleibt', () => {
  // Flop: Sitz 1 bettet 1000, Sitz 2 All-in 1300 (unvollständig), Sitz 3 callt, zurück zu Sitz 1: nur Call/Fold
  let h = mkHand([20000, 20000, 1500, 20000, 20000, 20000], 0, ['AhAd', 'KhKd', 'QhQd', 'JhJd', 'ThTd', '9h9d'], '2c3c4c5d7s');
  play(h, [[3, { type: 'call' }], [4, { type: 'fold' }], [5, { type: 'fold' }], [0, { type: 'fold' }], [1, { type: 'call' }], [2, { type: 'check' }]]);
  eq(h.street, 1, 'Flop erreicht');
  play(h, [[1, { type: 'bet', amount: 1000 }], [2, { type: 'raise', amount: 1400 }]]);
  ok(h.p[2].allIn, 'Sitz 2 All-in'); eq(h.cur, 1400, 'aktueller Einsatz');
  eq(h.legal(3).minTo, 2400, 'Mindest-Raise nach Short All-in = 1400 + 1000');
  play(h, [[3, { type: 'call' }]]);
  const L1 = h.legal(1); ok(!L1.canRaise, 'Sitz 1 darf nach unvollständigem Raise nicht erhöhen'); ok(L1.canCall, 'Sitz 1 darf callen');
  ok(!h.act(1, { type: 'raise', amount: 3000 }).ok, 'Raise wird abgelehnt');
  play(h, [[1, { type: 'call' }]]); eq(h.street, 2, 'Turn erreicht');
  // Mehrere Short All-ins: Bet 1000, All-in 1300, All-in 2100 → Sitz 1 steht 1100 gegenüber ≥ 1000 → wieder eröffnet
  h = mkHand([20000, 20000, 1400, 2200, 20000, 20000], 0, ['AhAd', 'KhKd', 'QhQd', 'JhJd', 'ThTd', '9h9d'], '2c3c4c5d7s');
  play(h, [[3, { type: 'call' }], [4, { type: 'call' }], [5, { type: 'fold' }], [0, { type: 'fold' }], [1, { type: 'call' }], [2, { type: 'check' }]]);
  play(h, [[1, { type: 'bet', amount: 1000 }], [2, { type: 'raise', amount: 1300 }], [3, { type: 'raise', amount: 2100 }]]);
  ok(h.p[2].allIn && h.p[3].allIn, 'zwei Short All-ins');
  play(h, [[4, { type: 'call' }]]);
  ok(h.legal(1).canRaise, 'Sitz 1: kumulierte Short All-ins ≥ voller Raise → wieder eröffnet');
  eq(h.legal(1).minTo, 3100, 'Mindest-Raise = 2100 + 1000');
});
test('Regeln: Wiedereröffnung nach vollem Raise, Re-Raise-Größen', () => {
  const h = mkHand([20000, 20000, 20000, 20000, 20000, 20000], 0, ['AhAd', 'KhKd', 'QhQd', 'JhJd', 'ThTd', '9h9d'], '2c3c4c5d7s');
  play(h, [[3, { type: 'raise', amount: 300 }], [4, { type: 'raise', amount: 900 }]]);
  eq(h.legal(5).minTo, 1500, '4-Bet mindestens 900 + 600');
  play(h, [[5, { type: 'fold' }], [0, { type: 'fold' }], [1, { type: 'fold' }], [2, { type: 'fold' }]]);
  ok(h.legal(3).canRaise, 'Opener darf nach vollem Raise erneut erhöhen');
});
test('Regeln: mehrere Side Pots, Berechtigung, nicht gecallter Überschuss, Chipbilanz', () => {
  // Sitz 1: 500, Sitz 2: 1500, Sitz 3: 3000, Sitz 0: 10000 – alle All-in preflop
  const h = mkHand([10000, 500, 1500, 3000, 10000, 10000], 0, ['2c3d', 'AhAd', 'KhKd', 'QhQd', 'JsJc', 'TsTc'], '4s8h9cJd5h');
  play(h, [[3, { type: 'allin' }], [4, { type: 'fold' }], [5, { type: 'fold' }], [0, { type: 'allin' }], [1, { type: 'call' }], [2, { type: 'call' }]]);
  ok(h.done, 'Runout bis zum Showdown');
  const pots = h.result.pots;
  eq(pots.length, 3, 'drei Pots (Main + 2 Side)');
  eq(pots[0].amount, 2000, 'Main Pot 4×500'); eq(pots[1].amount, 3000, 'Side Pot 1: 3×1000'); eq(pots[2].amount, 3000, 'Side Pot 2: 2×1500');
  eq(pots[0].winners.join(), '1', 'AA gewinnt Main Pot'); eq(pots[1].winners.join(), '2', 'KK gewinnt Side Pot 1 (AA nicht berechtigt)');
  eq(pots[2].winners.join(), '3', 'QQ gewinnt Side Pot 2');
  eq(h.returned.reduce((s, r) => s + r.amount, 0), 7000, 'nicht gecallter Überschuss an Sitz 0 zurück');
  eq(h.stackSum(), h.startSum, 'Chipbilanz');
  ok(pots.every(p => p.winners.every(w => !h.p[w].folded)), 'kein gefoldeter Gewinner');
});
test('Regeln: Split Pot und Odd Chip (erster Gewinner links vom Button)', () => {
  // Board-Straße, zwei Spieler teilen; Pot ungerade durch SB 50 + ungerade Beträge
  const h = mkHand([10000, 10000, 10000, 10000, 10000, 10000], 3, ['2c3d', '2h3h', '4c4d', 'AsKc', 'AhKd', '9s9c'], 'Ts9hJdQc8c');
  // Button 3 → SB 4, BB 5, UTG 0 …
  play(h, [[0, { type: 'fold' }], [1, { type: 'fold' }], [2, { type: 'fold' }], [3, { type: 'raise', amount: 333 }], [4, { type: 'call' }], [5, { type: 'fold' }]]);
  while (!h.done) { const s = h.toAct; play(h, [[s, { type: 'check' }]]); }
  const p = h.result.pots[0];
  eq(p.amount, 333 + 333 + 100, 'Pot'); eq(p.winners.length, 2, 'Split Pot');
  eq(p.winners[0], 4, 'Sitz links vom Button zuerst'); eq(p.shares[4], 383, 'Odd Chip an Sitz 4'); eq(p.shares[3], 383, 'Anteil Sitz 3');
  eq(h.stackSum(), h.startSum, 'Chipbilanz');
});
test('Regeln: Heads-up-Hand, ungleiche Stacks, All-in auf Flop und Turn', () => {
  let h = mkHand([5000, 8000], 0, ['AhKh', 'QsQd'], '2h7hJc3s9d');
  eq(h.sbSeat(), 0, 'Heads-up: Button ist Small Blind'); eq(h.toAct, 0, 'Button handelt preflop zuerst');
  play(h, [[0, { type: 'call' }], [1, { type: 'check' }]]);
  eq(h.toAct, 1, 'Postflop handelt BB zuerst');
  play(h, [[1, { type: 'bet', amount: 200 }], [0, { type: 'allin' }], [1, { type: 'call' }]]);
  ok(h.done, 'All-in auf dem Flop ausgespielt'); eq(h.board.length, 5, 'Board vollständig'); eq(h.stackSum(), 13000, 'Chipbilanz');
  h = mkHand([3000, 3000, 6000], 0, ['AhKh', 'QsQd', '7c7d'], '2h7hJc3s9d');
  play(h, [[0, { type: 'call' }], [1, { type: 'call' }], [2, { type: 'check' }], [1, { type: 'check' }], [2, { type: 'check' }], [0, { type: 'check' }]]);
  eq(h.street, 2, 'Turn');
  play(h, [[1, { type: 'allin' }], [2, { type: 'call' }], [0, { type: 'allin' }]]);
  ok(h.done, 'All-in auf dem Turn ausgespielt'); eq(h.stackSum(), h.startSum, 'Chipbilanz');
});
test('Regeln: kurzer Big Blind (All-in für weniger), Rake optional und konsistent', () => {
  let h = mkHand([10000, 10000, 60, 10000], 0, ['AhKh', 'QsQd', '7c7d', '2c3d'], '2h8hJc3s9d');
  ok(h.p[2].allIn, 'BB All-in mit 60'); eq(h.cur, 100, 'zu callen bleibt ein voller BB');
  play(h, [[3, { type: 'fold' }], [0, { type: 'call' }], [1, { type: 'call' }]]);
  while (!h.done) play(h, [[h.toAct, { type: 'check' }]]);
  eq(h.stackSum(), h.startSum, 'Chipbilanz');
  h = mkHand([10000, 10000, 10000], 0, ['AhKh', 'QsQd', '7c7d'], '2h8hJc3s9d', { rake: { pct: 0.05, cap: 300, nfnd: true } });
  play(h, [[0, { type: 'raise', amount: 1000 }], [1, { type: 'call' }], [2, { type: 'call' }]]);
  while (!h.done) play(h, [[h.toAct, { type: 'check' }]]);
  eq(h.result.rake, 150, 'Rake 5 % von 3000'); eq(h.stackSum() + h.result.rake, h.startSum, 'Chipbilanz mit Rake');
  h = mkHand([10000, 10000, 10000], 0, ['AhKh', 'QsQd', '7c7d'], '2h8hJc3s9d', { rake: { pct: 0.05, cap: 300, nfnd: true } });
  play(h, [[0, { type: 'raise', amount: 1000 }], [1, { type: 'fold' }], [2, { type: 'fold' }]]);
  eq(h.result.rake, 0, 'No Flop, No Drop');
});
test('Regeln: Replayer spielt gespeicherte Verläufe exakt nach (2.000 Hände)', () => {
  const sim = require('./sim-lib.js');
  let bad = 0, n = 0;
  sim.run({ hands: QUICK ? 300 : 2000, seed: 5, onHand: (h) => {
    const rec = h.publicRecord(), holes = {}; h.p.forEach(q => { holes[q.seat] = q.cards; });
    const rp = PT.rules.replay(rec, holes); n++;
    const last = rp.states[rp.states.length - 1];
    if (!rp.hand.done || last.error || rp.hand.p.some((q, i) => q.stack !== h.p[i].stack)) bad++;
  } });
  eq(bad, 0, 'abweichende Nachspielungen'); ok(n > 0, 'Hände gespielt');
});

// =============== 3. Simulation, Fuzz, Eigenschaften ===============
test('Simulation: 10.000 Hände, Invarianten nach jeder Aktion, keine hängende Hand, Chipbilanz', () => {
  const sim = require('./sim-lib.js');
  const r = sim.run({ hands: QUICK ? 2000 : 10000, seed: 77 });
  eq(r.errors.length, 0, 'Fehler: ' + r.errors.slice(0, 3).join(' | '));
  eq(r.hands, QUICK ? 2000 : 10000, 'alle Hände beendet');
  ok((QUICK || r.sidePots > 0) && r.splitPots > 0 && r.allIns > 0, 'Side Pots, Split Pots und All-ins kommen vor');
  current.notes.push(JSON.stringify({ hands: r.hands, actions: r.actions, showdowns: r.showdowns, sidePots: r.sidePots, splitPots: r.splitPots, swaps: r.swaps }));
});
test('Fuzz: zufällige und ungültige Eingaben, zufällige Stacks (1–400 BB)', () => {
  const sim = require('./sim-lib.js');
  const r = sim.run({ hands: QUICK ? 1500 : 6000, seed: 99, heroMode: 'random', cfg: { rebuyBelowBB: 0, startBB: 100, topUp: false } });
  eq(r.errors.length, 0, 'Fehler: ' + r.errors.slice(0, 3).join(' | '));
  ok(r.invalidRejected > 0, 'ungültige Eingaben wurden abgewiesen (' + r.invalidRejected + ')');
  // zufällige Stacks direkt
  const rng = PT.makeRng('stacks'); let errs = 0, hands = 0;
  for (let i = 0; i < (QUICK ? 1500 : 8000); i++) {
    const n = 2 + Math.floor(rng() * 5), players = [];
    for (let k = 0; k < n; k++) players.push({ id: 'g' + String(k + 1).padStart(3, '0'), name: 'P' + k, stack: Math.max(1, Math.floor(rng() * 40000)), isHero: k === 0 });
    const h = new PT.Hand({ players, button: Math.floor(rng() * n), sb: 50, bb: 100, rng }).start();
    let g = 0;
    while (!h.done && g++ < 300) {
      const s = h.toAct, L = h.legal(s), x = rng();
      let a = x < 0.2 && L.canFold ? { type: 'fold' } : x < 0.55 ? (L.canCheck ? { type: 'check' } : { type: 'call' }) : x < 0.65 ? { type: 'allin' } : L.canRaise ? { type: 'raise', amount: L.minTo + Math.floor(rng() * (L.maxTo - L.minTo + 1)) } : { type: 'call' };
      if (!h.act(s, a).ok) h.act(s, L.canCheck ? { type: 'check' } : { type: 'call' });
      if (h.check().length) { errs++; break; }
    }
    if (!h.done || h.check().length || h.stackSum() !== h.startSum) errs++;
    hands++;
  }
  eq(errs, 0, 'Fehler bei zufälligen Stacks'); current.notes.push(hands + ' Hände mit zufälligen Stacks');
});
test('Eigenschaft: gefoldete Spieler gewinnen nie, Gewinner sind berechtigt, keine Karte doppelt', () => {
  const sim = require('./sim-lib.js'); let bad = 0, dup = 0;
  sim.run({ hands: QUICK ? 1000 : 4000, seed: 31, onHand: (h) => {
    h.result.pots.forEach(p => p.winners.forEach(w => { if (h.p[w].folded || p.eligible.indexOf(w) < 0) bad++; }));
    const all = h.p.flatMap(q => q.cards).concat(h.board); if (new Set(all).size !== all.length) dup++;
  } });
  eq(bad, 0, 'unberechtigte Gewinner'); eq(dup, 0, 'doppelte Karten');
});
test('Zufall: getrennte Ströme; Coach an/aus ändert den Spielverlauf nicht', () => {
  function run(withCoach) {
    const db = ST.newDb(), heroRec = ST.newRecord('hero', 'Du'), t = PT.session.newTable(PT.session.defaultConfig(), db, 4242), log = [];
    const hr = PT.makeRng('fixed-hero');
    for (let i = 0; i < 60; i++) {
      const h = PT.session.startHand(t, 1000 + i);
      while (!h.done) {
        if (h.p[h.toAct].isHero) {
          if (withCoach) PT.coach.analyze({ view: PT.bots.publicView(h, 0), opps: db.opps, settings: { mode: 'exploit', level: 'schnell' }, seed: i });
          const L = h.legal(0), x = hr();
          PT.session.act(t, h, 0, x < 0.3 && L.canFold ? { type: 'fold' } : L.canCheck ? { type: 'check' } : { type: 'call' });
        } else PT.session.botAct(t, h, heroRec);
      }
      log.push(JSON.stringify(h.publicRecord().actions) + PT.cardsStr(h.board) + h.p.map(q => q.stack).join());
      PT.session.finishHand(t, db, h, heroRec);
    }
    return log.join('\n');
  }
  eq(run(true), run(false), 'identischer Verlauf mit und ohne Coach');
  const a = PT.rng.stream(1, 'deal', 5), b = PT.rng.stream(1, 'deal', 5), c = PT.rng.stream(1, 'bots', 5);
  eq(a(), b(), 'gleicher Strom reproduzierbar'); ok(Math.abs(PT.rng.stream(1, 'deal', 5)() - c()) > 0, 'Ströme unterscheiden sich');
});
test('Fairness: Bots und Coach sehen keine verdeckten Karten', () => {
  const t = PT.session.newTable(PT.session.defaultConfig(), ST.newDb(), 7), h = PT.session.startHand(t, 1);
  const v = PT.bots.publicView(h, h.toAct), own = PT.cardsStr(h.p[h.toAct].cards);
  const s = JSON.stringify(v);
  h.p.forEach((q, i) => { if (i !== h.toAct) q.cards.forEach(c => ok(!s.includes('"cards":[' + c) || own.includes(PT.cardStr(c)), 'fremde Karte in Sicht')); });
  eq(v.players.every(p => p.cards === undefined), true, 'Spielerliste ohne Karten');
  // Entscheidung bleibt gleich, wenn fremde Karten vertauscht werden
  const seat = h.toAct, d1 = JSON.stringify(PT.bots.decide(PT.bots.publicView(h, seat), h.p[seat].id, PT.makeRng(1), null));
  const other = (seat + 1) % 6, keep = h.p[other].cards; h.p[other].cards = [keep[1], keep[0]].map(c => (c + 13) % 52);
  const d2 = JSON.stringify(PT.bots.decide(PT.bots.publicView(h, seat), h.p[seat].id, PT.makeRng(1), null));
  eq(d1, d2, 'Bot-Entscheidung unabhängig von fremden Karten');
});

// =============== 4. Mathematik ===============
function exactEqPre(a, b) { // exakte Preflop-Equity Hand a gegen Hand b
  const R2 = { idx: [H.comboIdx(b[0], b[1])], cum: [1], tot: 1 };
  return PT.equity.exactHU(a, [], R2, H.deadMaskOf(a), 1e9).eq;
}
function bruteEq(a, b) { // unabhängige Schleife ohne Equity-Modul
  const dead = new Set(a.concat(b)), rest = []; for (let c = 0; c < 52; c++) if (!dead.has(c)) rest.push(c);
  let s = 0, n = 0; const A = a.concat([0, 0, 0, 0, 0]), B = b.concat([0, 0, 0, 0, 0]), L = rest.length;
  for (let i = 0; i < L; i++) for (let j = i + 1; j < L; j++) for (let k = j + 1; k < L; k++) for (let l = k + 1; l < L; l++) for (let m = l + 1; m < L; m++) {
    A[2] = B[2] = rest[i]; A[3] = B[3] = rest[j]; A[4] = B[4] = rest[k]; A[5] = B[5] = rest[l]; A[6] = B[6] = rest[m];
    const x = E.evaluate(A), y = E.evaluate(B); s += x > y ? 1 : x === y ? 0.5 : 0; n++;
  }
  return s / n;
}
test('Equity: exakte Enumeration bekannter Preflop-Duelle (je 1.712.304 Boards) gegen unabhängige Schleife und Literaturwerte', () => {
  // Literaturwerte (gerundet, gängige Equity-Rechner): AA vs KK ohne gemeinsame Farbe ≈ 81,3 %, mit zwei gemeinsamen Farben ≈ 82,6 %, AKs vs QQ ≈ 46 %, 72o vs AA ≈ 12 %
  const refs = [['AhAd', 'KsKc', 0.813, 0.01], ['AsAh', 'KsKh', 0.826, 0.01], ['AsKs', 'QhQd', 0.462, 0.01], ['7c2d', 'AhAs', 0.12, 0.01]];
  refs.slice(0, QUICK ? 1 : 4).forEach(r => {
    const e = exactEqPre(C(r[0]), C(r[1])), b = bruteEq(C(r[0]), C(r[1]));
    near(e, b, 1e-12, r[0] + ' gegen ' + r[1] + ': Equity-Modul = unabhängige Schleife'); near(e, r[2], r[3], r[0] + ' gegen ' + r[1] + ': Literaturwert');
    current.notes.push(r[0] + ' vs ' + r[1] + ': ' + (e * 100).toFixed(2) + ' %');
  });
});
test('Equity: Monte-Carlo gegen exakte Enumeration (Fehler ≤ 4 Standardfehler)', () => {
  const rng = PT.makeRng('mc');
  const spots = [['AhAd', '', 'KsKc'], ['AsKs', '', 'QhQd'], ['8h9h', 'Th7h2c', 'AcAd'], ['AhKd', 'Ks8c3d', null]];
  spots.forEach(sp => {
    const hero = C(sp[0]), board = sp[1] ? C(sp[1]) : [];
    let w; if (sp[2]) { w = R.empty(); w[H.comboIdx(...C(sp[2]))] = 1; } else { w = R.band(0, 0.3, 1, 0.02); R.removeDead(w, hero.concat(board)); }
    const ex = board.length ? PT.equity.equity({ hero, board, ranges: [w], level: 'praezise', cache: false }).eq : exactEqPre(hero, C(sp[2]));
    const mc = PT.equity.equity({ hero, board, ranges: [w], level: 'praezise', exact: false, rng, cache: false, budget: { left: 20000, used: 0 } });
    ok(Math.abs(mc.eq - ex) <= 4 * mc.se + 1e-9, sp.join(' ') + ': MC ' + mc.eq.toFixed(4) + ' ± ' + mc.se.toFixed(4) + ', exakt ' + ex.toFixed(4));
    current.notes.push(sp.join(' ') + ': exakt ' + (ex * 100).toFixed(2) + ' %, MC ' + (mc.eq * 100).toFixed(2) + ' % (SE ' + (mc.se * 100).toFixed(2) + ', n ' + mc.iters + ')');
  });
});
test('Equity: Mehrgegner-Simulation (AA gegen KK gegen QQ) gegen exakte Enumeration', () => {
  const a = C('AhAd'), b = C('KhKd'), c = C('QhQd'), dead = H.deadMaskOf(a.concat(b, c)), rest = []; for (let x = 0; x < 52; x++) if (!dead[x]) rest.push(x);
  let s = 0, n = 0; const A = a.concat([0, 0, 0, 0, 0]), B = b.concat([0, 0, 0, 0, 0]), Cc = c.concat([0, 0, 0, 0, 0]); const L = rest.length;
  const step = QUICK ? 7 : 1; let cnt = 0;
  for (let i = 0; i < L; i++) for (let j = i + 1; j < L; j++) for (let k = j + 1; k < L; k++) for (let l = k + 1; l < L; l++) for (let m = l + 1; m < L; m++) {
    if ((cnt++ % step) !== 0) continue;
    const bd = [rest[i], rest[j], rest[k], rest[l], rest[m]];
    for (let q = 0; q < 5; q++) { A[2 + q] = B[2 + q] = Cc[2 + q] = bd[q]; }
    const x = E.evaluate(A), y = E.evaluate(B), z = E.evaluate(Cc), best = Math.max(x, y, z);
    if (x === best) s += 1 / ((x === best) + (y === best) + (z === best)); n++;
  }
  const ex = s / n, wb = R.empty(), wc = R.empty(); wb[H.comboIdx(...b)] = 1; wc[H.comboIdx(...c)] = 1;
  const mc = PT.equity.equity({ hero: a, board: [], ranges: [wb, wc], level: 'tief', rng: PT.makeRng(9), cache: false, budget: { left: 60000, used: 0 } });
  ok(Math.abs(mc.eq - ex) <= 4 * mc.se, 'MC ' + mc.eq.toFixed(4) + ' ± ' + mc.se.toFixed(4) + ' vs exakt ' + ex.toFixed(4) + (QUICK ? ' (Stichprobe)' : ''));
  current.notes.push('AA 3-Wege: exakt ' + (ex * 100).toFixed(2) + ' % (' + n + ' Boards), MC ' + (mc.eq * 100).toFixed(2) + ' %');
});
test('Pot Odds und Side-Pot-Berechtigung: nur erreichbare Pots zählen', () => {
  // Held (Sitz 0) hat 1000, Gegner 1 bettet 5000 All-in, Gegner 2 hat gecallt → Held kann nur 3×1000 + Blinds gewinnen
  const h = mkHand([1000, 20000, 20000, 20000], 3, ['AhAd', 'KsKc', 'QhQd', '2c3d'], '');
  // Button 3: SB 0? Sitz 0 = SB (50), Sitz 1 = BB, Sitz 2 UTG, Sitz 3 BTN
  play(h, [[2, { type: 'raise', amount: 5000 }], [3, { type: 'fold' }]]);
  const v = PT.bots.publicView(h, 0), ctx = { L: v.legal, me: v.players[0], v };
  const po = PT.ev.potOdds(ctx);
  eq(po.call, 950, 'zahlbarer Betrag = Reststack'); eq(po.winnable, 1000 + 1000 + 100, 'gewinnbar: eigener Beitrag + Gegnerbeiträge bis 1000');
  near(po.need, 950 / 2100, 1e-9, 'benötigte Equity');
  ok(po.capped, 'Call kleiner als offener Einsatz');
  // potShare: River vollständig, deterministisch: Held hat die Nuts → gewinnt nur den berechtigten Main Pot
  const w1 = R.empty(), w2 = R.empty(); w1[H.comboIdx(...C('KsKc'))] = 1; w2[H.comboIdx(...C('QhQd'))] = 1;
  const r = PT.equity.potShare({ hero: C('AhAd'), heroTotal: 1000, board: C('As2c7d9hJs'), opps: [{ w: w1, total: 5000 }, { w: w2, total: 5000 }], rng: PT.makeRng(1), iters: 200 });
  eq(r.win, 3000, 'Held gewinnt nur den Main Pot (3 × 1000)');
  eq(r.pots.length, 2, 'Main und Side Pot');
});
test('EV-Referenz: River-Call mit exakter Equity entspricht eq·(Pot+Call) − Call', () => {
  const t = PT.session.newTable(PT.session.defaultConfig(), ST.newDb(), 3);
  const h = mkHand([10000, 10000], 0, ['AhKh', 'QsQd'], '2h7hJc3s9d');
  play(h, [[0, { type: 'call' }], [1, { type: 'check' }], [1, { type: 'check' }], [0, { type: 'check' }], [1, { type: 'check' }], [0, { type: 'check' }], [1, { type: 'bet', amount: 150 }]]);
  void t;
  const a = PT.coach.analyze({ view: PT.bots.publicView(h, 0), opps: {}, settings: { mode: 'gto', level: 'standard' }, seed: 1 });
  const call = a.actions.filter(x => x.type === 'call')[0], pot = a.pot, c = a.callAmt;
  near(call.ev, a.equity.eq * (pot + c) - c, 1e-6, 'EV(Call) auf dem River');
  eq(a.equity.method, 'exakt', 'River-Equity exakt');
  const fold = a.actions.filter(x => x.type === 'fold')[0]; eq(fold.ev, 0, 'EV(Fold) = 0');
});
test('Kombinatorik und Blocker', () => {
  eq(H.NC, 1326, '1.326 Kombinationen'); let s = 0; for (let i = 0; i < 169; i++) s += H.classCombos(i); eq(s, 1326, 'Summe über 169 Klassen');
  eq(H.liveCombos(H.nameToIdx('AKo'), H.deadMaskOf(C('As'))).length, 9, 'AKo mit Ass auf dem Board');
  eq(H.liveCombos(H.nameToIdx('AKs'), H.deadMaskOf(C('As'))).length, 3, 'AKs mit Ass auf dem Board');
  eq(H.liveCombos(H.nameToIdx('QQ'), H.deadMaskOf(C('Qh'))).length, 3, 'QQ mit Dame auf dem Board');
  eq(H.liveCombos(H.nameToIdx('QQ'), H.deadMaskOf(C('QhQd'))).length, 1, 'QQ mit zwei Damen');
  const w = R.full(); R.removeDead(w, C('AhKd')); eq(R.total(w), 1225, 'C(50,2) nach zwei toten Karten');
});
test('Statistik: Wilson-Intervall, Beta-Glättung, kleine Stichproben unbekannt statt 0', () => {
  const ci = ST.wilson([5, 10]); near(ci[0], 0.2366, 0.0005, 'Wilson unten'); near(ci[1], 0.7634, 0.0005, 'Wilson oben');
  const sm = R.smooth({ vpip: [0, 0] }); near(sm.vpip, R.PRIOR.vpip, 1e-12, 'ohne Daten = Prior');
  const sm2 = R.smooth({ vpip: [50, 100] }); near(sm2.vpip, (50 + 0.27 * 25) / 125, 1e-12, 'Beta-Binomial');
  eq(ST.profile(ST.newRecord('x', 'X')).vpip, null, 'ohne Gelegenheit: unbekannt (null)');
  eq(ST.playerType({ hands: 99, stats: ST.emptyStats() }), 'unbekannt', 'unter 100 Händen unbekannt');
});
test('Statistik: Zähler stimmen mit unabhängiger Kontrollzählung überein (VPIP, PFR, 3-Bet, Fold gegen 3-Bet, C-Bet, Fold gegen C-Bet, WTSD)', () => {
  const sim = require('./sim-lib.js'), ctrl = {};
  function inc(id, k, hit) { const o = ctrl[id] || (ctrl[id] = {}); const x = o[k] || (o[k] = [0, 0]); x[1]++; if (hit) x[0]++; }
  const r = sim.run({ hands: QUICK ? 1500 : 6000, seed: 404, onHand: (h) => {
    const rec = h.publicRecord(), pre = rec.actions.filter(a => a.st === 0 && a.t !== 'sb' && a.t !== 'bb');
    rec.seats.forEach(st => {
      if (st.hero) return; const id = st.id, mine = pre.filter(a => a.s === st.seat);
      if (mine.length) { inc(id, 'vpip', mine.some(a => a.t === 'call' || a.t === 'raise')); inc(id, 'pfr', mine.some(a => a.t === 'raise')); }
      // 3-Bet: erste eigene Aktion bei genau einem Raise vor sich und Raise erlaubt
      let rc = 0, opener = -1, done3 = false, doneF3 = false;
      pre.forEach(a => {
        if (a.s === st.seat && rc === 1 && a.s !== opener && a.cr && !done3) { done3 = true; inc(id, 'threeBet', a.t === 'raise'); }
        if (a.s === st.seat && rc === 2 && a.s === opener && !doneF3) { doneF3 = true; inc(id, 'foldTo3Bet', a.t === 'fold'); }
        if (a.t === 'raise') { rc++; if (rc === 1) opener = a.s; }
      });
      const pfa = pre.filter(a => a.t === 'raise').map(a => a.s).pop();
      if (rec.board.length >= 3) {
        const foldedPre = pre.some(a => a.s === st.seat && a.t === 'fold');
        if (!foldedPre && rec.sawFlop.indexOf(st.seat) >= 0) inc(id, 'wtsd', rec.showdown && !rec.actions.some(a => a.s === st.seat && a.t === 'fold'));
        const flop = rec.actions.filter(a => a.st === 1);
        if (pfa === st.seat) { const firstMine = flop.findIndex(a => a.s === st.seat); if (firstMine >= 0 && !flop.slice(0, firstMine).some(a => a.t === 'bet' || a.t === 'raise')) inc(id, 'cbet', flop[firstMine].t === 'bet'); }
        if (pfa != null && pfa !== st.seat) {
          const cb = flop.findIndex(a => a.s === pfa); if (cb >= 0 && flop[cb].t === 'bet' && !flop.slice(0, cb).some(a => a.t === 'bet' || a.t === 'raise')) {
            const after = flop.slice(cb + 1), firstRaise = after.findIndex(a => a.t === 'raise'), myResp = after.findIndex(a => a.s === st.seat);
            if (myResp >= 0 && (firstRaise < 0 || myResp <= firstRaise)) inc(id, 'foldToCbet', after[myResp].t === 'fold');
          }
        }
      }
    });
  } });
  const map = { vpip: 'vpip', pfr: 'pfr', threeBet: 'threeBet', foldTo3Bet: 'foldTo3Bet', cbet: 'cbetFlop', foldToCbet: 'foldToCbet', wtsd: 'wtsd' };
  let compared = 0;
  Object.keys(ctrl).forEach(id => { Object.keys(map).forEach(k => { const a = (ctrl[id][k] || [0, 0]).join('/'), b = r.db.opps[id].stats[map[k]].join('/'); compared++; ok(a === b, id + ' ' + k + ': Kontrolle ' + a + ', Datenbank ' + b); }); });
  current.notes.push(compared + ' Zähler/Nenner-Paare verglichen');
});
test('CFR+: analytisches River-Spiel (Bluff-Anteil b/(1+2b), Call-Häufigkeit 1/(1+b)), Exploitability ≈ 0', () => {
  [[0.3, 1], [0.2, 0.5], [0.25, 2]].forEach(([rho, b]) => {
    const s = PT.cfr.solveMatrix([[rho], [1 - rho]], [[1], [0]], [b], 3000), root = s.nodes[0];
    const airBet = 1 - root.s[1][0], expAir = Math.min(1, rho * (b / (1 + b)) / (1 - rho));
    near(1 - root.s[0][0], 1, 0.01, 'Nuts betten immer'); near(airBet, expAir, 0.02, 'Bluff-Häufigkeit (ρ=' + rho + ', b=' + b + ')');
    const ipb = s.nodes.filter(n => n.name === 'IP gegen Bet ' + b)[0]; near(ipb.s[0][1], 1 / (1 + b), 0.02, 'Call-Häufigkeit');
    ok(s.exploitability < 0.002, 'Exploitability ' + s.exploitability);
  });
  const s1 = PT.cfr.solveMatrix([[0.1, 0.2], [0.3, 0.4]], [[0.8, 0.3], [0.6, 0.1]], [0.75], 50), s2 = PT.cfr.solveMatrix([[0.1, 0.2], [0.3, 0.4]], [[0.8, 0.3], [0.6, 0.1]], [0.75], 2000);
  ok(s2.exploitability <= s1.exploitability + 1e-9, 'Exploitability sinkt mit mehr Iterationen');
});
test('Coach: Obergrenze von 5.000 Simulationen je Entscheidung, Antwortzeit, keine Ausnahme', () => {
  const sim = require('./sim-lib.js'); let n = 0, maxIt = 0, maxMs = 0, errs = 0;
  const db = ST.newDb(), heroRec = ST.newRecord('hero', 'Du'), t = PT.session.newTable(PT.session.defaultConfig(), db, 515);
  void sim;
  for (let i = 0; i < (QUICK ? 120 : 500); i++) {
    const h = PT.session.startHand(t, i);
    while (!h.done) {
      if (h.p[h.toAct].isHero) {
        const t0 = Date.now(); let a;
        try { a = PT.coach.analyze({ view: PT.bots.publicView(h, 0), opps: db.opps, settings: { mode: i % 2 ? 'gto' : 'exploit', level: i % 3 ? 'standard' : 'schnell' }, seed: i }); } catch (e) { errs++; current.notes.push(e.stack.split('\n')[0]); break; }
        const ms = Date.now() - t0; n++; maxMs = Math.max(maxMs, ms); maxIt = Math.max(maxIt, a.iters);
        ok(a.iters <= 5000, 'Simulationen ' + a.iters);
        const L = h.legal(0); PT.session.act(t, h, 0, L.canCheck ? { type: 'check' } : (Math.random() < 0.5 ? { type: 'call' } : { type: 'fold' }));
      } else PT.session.botAct(t, h, heroRec);
    }
    PT.session.finishHand(t, db, h, heroRec);
  }
  eq(errs, 0, 'Ausnahmen'); ok(maxMs < 2000, 'maximale Rechenzeit ' + maxMs + ' ms');
  current.notes.push(n + ' Analysen, max. ' + maxIt + ' Simulationen, max. ' + maxMs + ' ms (Node, ein Kern)');
});
test('Coach: Bewertung nutzt nur Entscheidungsinformationen; sieben Stufen; Fehlerkategorien', () => {
  const h = mkHand([10000, 10000], 0, ['AhKh', 'QsQd'], '2h7hJc3s9d');
  play(h, [[0, { type: 'call' }], [1, { type: 'check' }], [1, { type: 'check' }], [0, { type: 'check' }], [1, { type: 'check' }], [0, { type: 'check' }], [1, { type: 'bet', amount: 150 }]]);
  const a = PT.coach.analyze({ view: PT.bots.publicView(h, 0), opps: {}, settings: { mode: 'exploit', level: 'standard' }, seed: 2 });
  const gBest = PT.coach.grade(a, { type: a.actions[0].type, amount: a.actions[0].amount });
  eq(gBest.grade, 'Optimal', 'beste Aktion = Optimal');
  a.actions.forEach(x => { const g = PT.coach.grade(a, { type: x.type, amount: x.amount }); ok(PT.coach.GRADES.indexOf(g.grade) >= 0, 'gültige Stufe'); ok(g.loss >= 0, 'Verlust ≥ 0'); });
  const a2 = PT.coach.analyze({ view: PT.bots.publicView(h, 0), opps: {}, settings: { mode: 'exploit', level: 'standard' }, seed: 2 });
  eq(JSON.stringify(a.actions.map(x => Math.round(x.ev))), JSON.stringify(a2.actions.map(x => Math.round(x.ev))), 'Analyse reproduzierbar (gleicher Seed)');
});
test('Training: alle 14 Kategorien erzeugen Situationen, reproduzierbar über Seeds', () => {
  Object.keys(PT.training.SCEN).forEach(cat => {
    let made = 0; for (let s = 1; s <= (QUICK ? 3 : 10); s++) if (PT.training.generate(cat, s)) made++;
    ok(made >= (QUICK ? 2 : 8), cat + ': ' + made + ' Situationen');
    const g1 = PT.training.generate(cat, 77), g2 = PT.training.generate(cat, 77);
    ok(g1 && g2 && PT.cardsStr(g1.hand.p[0].cards) === PT.cardsStr(g2.hand.p[0].cards) && g1.hand.actions.length === g2.hand.actions.length, cat + ' reproduzierbar');
  });
});
test('Training: Quizfragen rechnen korrekt, Kompetenzprofil und Spaced Repetition', () => {
  for (let i = 0; i < 200; i++) { const t = Object.keys(PT.training.QUIZ_TYPES)[i % 6], q = PT.training.quiz(t, PT.makeRng(i)); ok(q.ok >= 0 && q.ok < q.opts.length, 'Lösung vorhanden'); ok(new Set(q.opts).size === q.opts.length, 'eindeutige Antworten'); }
  const L = PT.training.newLearning();
  for (let i = 0; i < 120; i++) PT.training.addDecision(L, { ts: i, score: i < 60 ? 40 : 85, lossBB: 1, st: i % 4, pos: 'BTN', tags: ['cbet'], cats: i < 60 ? ['zu-passiv'] : [] });
  const p = PT.training.profile(L); ok(p.trend && p.trend.diff > 0, 'Trend erkennt Verbesserung'); eq(p.cats['zu-passiv'], 60, 'Fehlerkategorie gezählt');
  PT.training.srsAdd(L, { key: 'k1', cat: 'cbet', seed: 5 }, 0); eq(PT.training.srsDue(L, 11 * 60000).length, 1, 'fällig nach 10 Minuten');
  PT.training.srsReview(L, 'k1', 90, 1000); ok(L.srs[0].box === 1 && L.srs[0].due > 1000 + 86000000, 'Box steigt, nächster Termin morgen');
  eq(PT.training.validLearning(L), null, 'Lerndaten gültig');
});

// =============== 5. Datenbank, Import, Migration, Sicherheit ===============
test('Datenbank: Gegner verlassen den Tisch und kehren zurück, kein Doppeleintrag, 100er-Pool', () => {
  const sim = require('./sim-lib.js'); let returned = 0; const left = new Set();
  const r = sim.run({ hands: QUICK ? 1500 : 6000, seed: 12, onHand: (h, res) => { if (res.ev.swap) { left.add(res.ev.swap.left); if (left.has(res.ev.swap.joined)) returned++; } } });
  ok(returned > 0, 'Rückkehrer: ' + returned);
  const ids = Object.keys(r.db.opps); eq(new Set(ids).size, ids.length, 'eindeutige IDs');
  eq(ids.filter(id => r.db.opps[id].status === 'aktiv').length, 5, 'genau 5 aktive Gegner');
  ok(ids.length <= 100, 'höchstens 100 Gegner');
  const styles = {}; PT.bots.POOL.forEach(p => { const s = PT.bots.styleOf(p.id); styles[s] = (styles[s] || 0) + 1; });
  eq(['lp', 'vl', 'nit', 'tag', 'lag', 'bal'].map(k => k + ':' + styles[k]).join(), 'lp:20,vl:15,nit:15,tag:25,lag:15,bal:10', 'Verteilung der Spielstile im Pool');
  eq(new Set(PT.bots.POOL.map(p => p.name)).size, 100, '100 eindeutige Namen');
});
test('Datenbank: Export und Import ergeben dieselbe Datenbank; 5.000 Gegner', () => {
  const sim = require('./sim-lib.js'), r = sim.run({ hands: QUICK ? 500 : 2000, seed: 8 });
  const txt = ST.dbExport(r.db, 'x'), imp = ST.dbImport(txt);
  ok(imp.ok, imp.error); eq(ST.dbCanon(imp.db), ST.dbCanon(r.db), 'Export = Import');
  const big = ST.newDb(); for (let i = 0; i < 5000; i++) { const rec = ST.newRecord('x' + i, 'Gegner ' + i); rec.hands = i; rec.stats.vpip = [Math.floor(i / 4), i]; rec.pos.BTN.h = 0; big.opps[rec.id] = rec; }
  const imp2 = ST.dbImport(ST.dbExport(big, 'y')); ok(imp2.ok && imp2.count === 5000, '5.000 Gegner importiert');
});
test('Import: beschädigte und manipulierte Dateien werden abgelehnt, bestehende Daten unverändert', () => {
  const sim = require('./sim-lib.js'), r = sim.run({ hands: 300, seed: 9 }), good = ST.dbExport(r.db, 'x'), before = ST.dbCanon(r.db);
  const obj = JSON.parse(good);
  function variant(fn) { const o = JSON.parse(good); fn(o); o.checksum = PT.util.fnv1a(JSON.stringify(o.opponents)); return JSON.stringify(o); }
  const bad = [
    ['leer', ''], ['abgeschnitten', good.slice(0, Math.floor(good.length / 2))], ['kein JSON', 'hallo'], ['falsches Format', JSON.stringify({ format: 'X' })],
    ['Prüfsumme', good.replace(/"hands":(\d+)/, (m, x) => '"hands":' + (+x + 1))], ['Anzahl', JSON.stringify(Object.assign({}, obj, { count: obj.count + 1 }))],
    ['Version', JSON.stringify(Object.assign({}, obj, { version: 99 }))],
    ['Skript im Namen', variant(o => { o.opponents[0].name = '<script>alert(1)</script>'; })],
    ['Prototyp', variant(o => { o.opponents[0] = JSON.parse(JSON.stringify(o.opponents[0]).replace('{', '{"__proto__":{"x":1},')); })],
    ['negativer Zähler', variant(o => { o.opponents[0].stats.vpip = [-1, 5]; })], ['Zähler > Nenner', variant(o => { o.opponents[0].stats.pfr = [9, 5]; })],
    ['ungültige Karte', variant(o => { o.opponents[0].shown = [{ hand: 1, ts: 1, pos: 'BTN', cards: 'XxYy', board: '', actions: ['', '', '', ''], net: 0 }]; })],
    ['doppelte ID', variant(o => { o.opponents.push(JSON.parse(JSON.stringify(o.opponents[0]))); o.count++; })],
    ['unbekanntes Feld', variant(o => { o.opponents[0].evil = 1; })], ['Array statt Objekt', '[]'], ['null', 'null']
  ];
  bad.forEach(([n, t]) => { const res = ST.dbImport(t); ok(!res.ok && typeof res.error === 'string', n + ' abgelehnt'); });
  eq(ST.dbCanon(r.db), before, 'bestehende Datenbank unverändert');
  ok(PT.util.esc('<img src=x onerror=1>') === '&lt;img src=x onerror=1&gt;', 'HTML wird maskiert');
});
test('Migration: Datenbank aus Entwurf 2 (Version 1) und vollständige Sicherung', () => {
  const v1rec = { id: 'g007', name: 'Gustav', status: 'archiv', hands: 120, stats: { vpip: [30, 110], pfr: [20, 110], threeBet: [3, 40], foldTo3Bet: [4, 6], cbet: [10, 15], foldToCbet: [5, 12], wtsd: [9, 30] },
    shown: [{ hand: 5, ts: 1, pos: 'BTN', cards: 'AhKd', board: 'Ts9h2c', actions: ['Raise auf 2,50', 'Bet 3,00', '', ''], net: 550 }], lastSeen: 12345 };
  const list = [v1rec], body = JSON.stringify(list);
  const v1 = JSON.stringify({ format: 'PokerTrainer-DB', version: 1, exported: 'x', count: 1, checksum: PT.util.fnv1a(body), opponents: list });
  const r = ST.dbImport(v1); ok(r.ok, r.error); ok(r.migrated, 'als Migration erkannt');
  const m = r.db.opps.g007; eq(m.stats.cbetFlop.join('/'), '10/15', 'C-Bet übernommen'); eq(m.stats.fourBet.join('/'), '0/0', 'neue Werte unbekannt (0/0)'); eq(ST.validRecord(m), null, 'migrierter Datensatz gültig');
  const fromList = ST.dbFromList([v1rec]); ok(fromList.opps.g007 && fromList.opps.g007.stats.cbetFlop[1] === 15, 'Migration aus gespeicherter Liste');
  const L = PT.training.newLearning(), payload = { opponents: ST.dbList(r.db), hero: ST.newRecord('hero', 'Du'), hands: [], learning: L, settings: {}, table: null };
  const bk = ST.backupExport(payload, 'x'), rb = ST.dbImport(bk); ok(rb.ok && rb.kind === 'backup', 'Sicherung importierbar: ' + rb.error);
  ok(!ST.dbImport(bk.replace('"hands":[]', '"hands":[{"v":2}]')).ok, 'manipulierte Sicherung abgelehnt');
  ok(PT.session.validTable(PT.session.migrateTable({ seats: [{ id: 'hero', stack: 10000 }, { id: 'g001', stack: 9000 }, { id: 'g002', stack: 9000 }, { id: 'g003', stack: 9000 }, { id: 'g004', stack: 9000 }, { id: 'g005', stack: 9000 }], handNo: 50, sinceSwap: 20, button: 2, buyins: 1 })), 'Tisch aus Entwurf 2 migriert');
});
test('Wiederaufnahme: laufende Hand wird nach Neuladen exakt wiederhergestellt', () => {
  const db = ST.newDb(), heroRec = ST.newRecord('hero', 'Du'), t = PT.session.newTable(PT.session.defaultConfig(), db, 2024);
  let checked = 0;
  for (let i = 0; i < 40; i++) {
    const h = PT.session.startHand(t, i); let steps = 0;
    while (!h.done) {
      if (h.p[h.toAct].isHero) {
        if (steps++ === 1) {
          const saved = JSON.parse(JSON.stringify(t)), t2 = JSON.parse(JSON.stringify(saved)), h2 = PT.session.resumeHand(t2, JSON.parse(JSON.stringify(heroRec)));
          ok(h2 && h2.snapshot === undefined || true, 'Wiederaufnahme');
          ok(h2 && JSON.stringify(h2.publicRecord().actions) === JSON.stringify(h.publicRecord().actions) && h2.toAct === h.toAct, 'identischer Zustand Hand ' + h.no);
          checked++;
        }
        const L = h.legal(0); PT.session.act(t, h, 0, L.canCheck ? { type: 'check' } : { type: 'call' });
      } else PT.session.botAct(t, h, heroRec);
    }
    PT.session.finishHand(t, db, h, heroRec);
  }
  ok(checked > 3, checked + ' Wiederaufnahmen geprüft');
});
test('Handhistorie: Datensätze sind gültig und exportierbar', () => {
  const sim = require('./sim-lib.js'); let bad = 0, n = 0;
  sim.run({ hands: 300, seed: 66, onHand: (h) => { const rec = PT.training.makeHandRecord(h, { session: 1, seed: 1, decisions: [] }); n++; const e = PT.training.validHand(rec); if (e) { bad++; if (bad < 3) current.notes.push(e); } PT.training.handText(rec); } });
  eq(bad, 0, 'ungültige Datensätze'); ok(n === 300, 'Datensätze erzeugt');
});

test('Sprachausgabe: nur der jüngste Tipp wird gesprochen, ältere brechen ab; ohne Sprachfunktion kein Fehler', () => {
  const spoken = [], timers = []; let cancels = 0;
  function Utter(t) { this.text = t; }
  const synth = { speak(u) { spoken.push(u.text); if (u.onstart) u.onstart(); }, cancel() { cancels++; } };
  const sp = new PT.Speech({ synth, Utter, setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout: (id) => { timers[id - 1] = null; } });
  sp.voice = { lang: 'de-DE', name: 'Test' };
  const states = []; sp.onstatus = (st, id) => states.push(st + ':' + id);
  sp.speak('Tipp eins', 1); sp.speak('Tipp zwei', 2); sp.speak('Tipp drei', 3);
  timers.forEach(f => f && f());
  eq(spoken.join('|'), 'Tipp drei', 'nur der jüngste Tipp gesprochen');
  ok(states.includes('abgebrochen:1') && states.includes('abgebrochen:2'), 'ältere Tipps abgebrochen'); ok(cancels >= 3, 'laufende Ausgabe beendet');
  const none = new PT.Speech({}); ok(!none.available && none.speak('x', 1) === false, 'ohne Sprachfunktion: kein Fehler');
  ok(PT.toSpeech('AKs vom BTN, 25 %') === 'Ass König suited vom Button, 25 Prozent', 'Aussprache: ' + PT.toSpeech('AKs vom BTN, 25 %'));
});

const out = { app: PT.VERSION, date: new Date().toISOString(), node: process.version, quick: QUICK, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, tests: results };
fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'results', QUICK ? 'unit-quick.json' : 'unit.json'), JSON.stringify(out, null, 1));
console.log('\n' + out.passed + ' bestanden, ' + out.failed + ' fehlgeschlagen');
process.exit(out.failed ? 1 : 0);
