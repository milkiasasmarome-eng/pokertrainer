/* 2.3 (Arbeitspaket 9): Regressionstests zu den offenen und teilweise behobenen Prüfbefunden aus 2.2 (docs/audit-2.2/PRUEFUNG_2.2.md). */
'use strict';
module.exports = function (T) {
  const { test, ok, PT } = T;
  test('Prüfbefund C-7: Reparatur der Lerndaten zählt jede verworfene oder gekürzte Struktur und hält die Grenzen der Prüfung ein', () => {
    const L = PT.training.newLearning();
    const srs = []; for (let i = 0; i < 400; i++) srs.push({ key: 'k' + i, cat: 'cbet', box: 1, due: 0, seed: i, label: 'Spot ' + i, reviews: 0 });
    const good = Object.assign({}, L, { srs });
    ok(PT.training.validLearning(good) === null, 'Testdaten gültig: ' + PT.training.validLearning(good));
    // 1) pp kein Array → gezählt
    const r1 = PT.training.repairLearning(Object.assign({}, good, { pp: 'kaputt' }));
    ok(r1 && r1.removed >= 1 && r1.learning.pp === undefined, 'pp kein Array: removed ' + (r1 && r1.removed));
    // 2) gültige Wiederholungen bis 1.000 bleiben erhalten (vorher still auf 300 gekürzt)
    const r2 = PT.training.repairLearning(Object.assign({}, good, { quiz: null }));
    ok(r2.learning.srs.length === good.srs.length, 'Wiederholungen erhalten: ' + r2.learning.srs.length + ' von ' + good.srs.length);
    // 3) Sessions bleiben erhalten (vorher verworfen)
    const r3 = PT.training.repairLearning(Object.assign({}, good, { sessions: [{ t: 1, n: 5 }, { t: 2, n: 3 }], quiz: null }));
    ok(r3.learning.sessions.length === 2, 'Sessions erhalten: ' + r3.learning.sessions.length);
    // 4) ungültige Session zählt
    const r4 = PT.training.repairLearning(Object.assign({}, good, { sessions: [{ t: 1 }, 7] }));
    ok(r4.removed === 1 && r4.learning.sessions.length === 1, 'ungültige Session gezählt: removed ' + r4.removed);
    // 5) reparierte Daten bestehen die Prüfung
    ok(PT.training.validLearning(r3.learning) === null, 'repariert gültig: ' + PT.training.validLearning(r3.learning));
  });

  test('Prüfbefund D-6: Tabellengewicht 0 heißt Reaktionsmodell 2.1 (nicht reine Tabelle)', () => {
    const h = T.spot('BTN', 'AhKd', 'Ks8c3d7h', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check'], ['H', 'bet', 3], ['BB', 'call'], ['BB', 'check']]);
    const P = PT.ev.POP, t0 = P.tabBlend;
    try {
      P.tabBlend = 0; const a = T.coachOn(h); P.tabBlend = t0;
      PT.ranges.ABL.respLegacy = true; const b = T.coachOn(h); delete PT.ranges.ABL.respLegacy;
      const ev = an => an.actions.map(x => x.label + ':' + x.ev.toFixed(2)).join('|');
      ok(ev(a) === ev(b), 'gleiche Bewertung: ' + ev(a).slice(0, 120) + ' / ' + ev(b).slice(0, 120));
    } finally { P.tabBlend = t0; delete PT.ranges.ABL.respLegacy; }
  });
  test('Prüfbefund D-5: Range-Zelle mit der tatsächlichen Spielerzahl', () => {
    const acts = [{ st: 1, s: 1, t: 'bet', a: 300, pot: 600, cur: 0 }];
    const c2 = PT.ranges.cellAt(acts, 0, 1, 1, 2), c6 = PT.ranges.cellAt(acts, 0, 1, 1, 6);
    ok(/\|h$/.test(c2.key) && /\|m$/.test(c6.key), 'HU-Zelle ' + c2.key + ', mit sechs Plätzen ' + c6.key);
    const orig = PT.ranges.narrowPostflop, seen = [];
    PT.ranges.narrowPostflop = function (w, a, s, b, p, f, u, opt) { if (!(opt && opt.legacy)) seen.push(opt && opt.nPlayers); return orig.apply(this, arguments); };
    try { T.coachOn(T.spot('BTN', 'AhKd', 'Ks8c3d', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check']])); } finally { PT.ranges.narrowPostflop = orig; }
    ok(seen.length > 0 && seen.every(n => n === 6), 'Spielerzahl übergeben: ' + [...new Set(seen)].join(','));
  });
  test('Prüfbefund A-15: Mehrgegnerzelle zählt auch All-in-Spieler (wie in den Daten)', () => {
    const NC = 1326, w = new Float64Array(NC).fill(1), keys = [], orig = PT.ranges.likDist;
    PT.ranges.likDist = function (k) { keys.push(k); return orig.apply(this, arguments); };
    const board = PT.parseCards('Ks8c3d');
    const opp = { w, p: { bet: 0, stack: 9000, allIn: false }, sm: null, raw: {} }, allin = { w, p: { bet: 500, stack: 0, allIn: true } };
    try { PT.ev.likRespond(opp, { street: 1, board, me: { bet: 0 }, L: { toCall: 0 }, opps: [opp, allin] }, 300, 600, 1); } finally { PT.ranges.likDist = orig; }
    ok(keys.length > 0 && keys.every(k => /\|m$/.test(k)), 'Zellen: ' + [...new Set(keys)].join(','));
  });
  test('Prüfbefund D-11: Open unter der Nenngröße nennt den tatsächlichen All-in-Betrag', () => {
    const players = [{ id: 'hero', name: 'Du', stack: 200, isHero: true }].concat(['g001', 'g002', 'g003', 'g004', 'g005'].map(id => ({ id, name: PT.bots.nameOf(id), stack: 10000 })));
    const button = (0 - PT.POS6.indexOf('SB') + 6) % 6 === 0 ? 5 : (0 - PT.POS6.indexOf('SB') + 6) % 6;
    const deck = PT.rules.deckFor({ n: 6, button, board: [], seats: players }, { 0: PT.parseCards('AhAd') });
    const h = new PT.Hand({ players, button, sb: 50, bb: 100, deck, no: 1 }).start(); let g = 0;
    while (h.toAct !== 0 && !h.done && g++ < 20) { const L = h.legal(h.toAct); h.act(h.toAct, L.canCheck ? { type: 'check' } : { type: 'fold' }); }
    if (h.done || h.toAct !== 0) { ok(true, 'Spot nicht erreichbar (übersprungen)'); return; }
    const an = T.coachOn(h), ai = an.actions.filter(a => a.amount === h.legal(0).maxTo && (a.type === 'raise' || a.type === 'bet'));
    ok(ai.length > 0 && ai.every(a => !/2,5 BB/.test(a.label)), 'Beschriftungen: ' + an.actions.map(a => a.label).join(', '));
  });
  test('Prüfbefund C-12: Gegner aus Format 1 (Aktionszähler 0) werden wie Gegner ohne Zähler nach Händen bewertet', () => {
    const h = T.spot('BTN', 'AhKd', 'Ks8c3d', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check']]);
    const bbId = h.p.find(q => q.pos === 'BB').id, base = PT.stats.newRecord(bbId, 'x');
    base.hands = 2000; Object.keys(base.stats).forEach(k => { base.stats[k] = [Math.round(base.stats[k][0]), base.stats[k][1]]; });
    base.stats.foldToCbet = [125, 250]; base.stats.vpip = [500, 2000]; base.stats.pfr = [360, 2000];
    const zero = JSON.parse(JSON.stringify(base)); Object.keys(zero.agg || {}).forEach(k => { zero.agg[k] = 0; });
    const none = JSON.parse(JSON.stringify(base)); delete none.agg;
    const run = r => PT.coach.analyze({ view: PT.bots.publicView(h, 0), opps: { [bbId]: r }, settings: { mode: 'exploit', level: 'standard' }, seed: 3, live: true });
    const ev = an => an.actions.map(x => x.label + ':' + x.ev.toFixed(1) + ':' + x.u.toFixed(1)).join('|');
    ok(ev(run(zero)) === ev(run(none)), ev(run(zero)).slice(0, 100) + ' / ' + ev(run(none)).slice(0, 100));
  });
};
