/* 2.2: Regressionstests zu den Arbeitspaketen 1–8 und zu den bestätigten Befunden des Folgeaudits (docs/audit-2.2/FOLGEAUDIT.md) */
'use strict';
module.exports = function (T) {
  const { PT, test, ok, eq, spot } = T;
  const R = PT.ranges, near = (a, b, t, m) => ok(Math.abs(a - b) <= t, m + ': ' + a + ' ≈ ' + b + ' ± ' + t);

  test('2.2 AP1/F4: Range-Likelihood aus der Aktionstabelle nach absoluter Stärke (River-Bet wertlastig, Draws und Mehrgegner getrennt)', () => {
    ok(!!R.likelihoodTable() && R.likelihoodTable().total > 100000, 'Tabelle geladen (' + (R.likelihoodTable() || {}).total + ' Beobachtungen)');
    const bet = xb => { const d = R.likDist('3|ag|h', 0, xb); return (d.bl || 0) + (d.bo || 0); };
    ok(bet(9) > bet(5) && bet(5) < 0.4, 'River-Bet ≥ ¾ Pot als Aggressor: stärkste Klasse ' + bet(9).toFixed(2) + ' > mittlere ' + bet(5).toFixed(2));
    const callBig = xb => { const d = R.likDist('3|s4|h', 0, xb); return d.c + d.r; };
    ok(callBig(9) > 0.8 && callBig(2) < 0.2, 'gegen Pot-Bet am River: Nuts spielen weiter (' + callBig(9).toFixed(2) + '), Luft foldet (' + callBig(2).toFixed(2) + ')');
    // Legacy-Pfad bleibt verfügbar und unterscheidet sich (Vergleichsstudien)
    const h = spot('BTN', 'AhQd', 'Ks9c4d7h2s', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check'], ['H', 'bet', 3], ['BB', 'call'], ['BB', 'check'], ['H', 'check'], ['BB', 'bet', 11]]);
    const v = PT.bots.publicView(h, 0), bb = v.players.findIndex(q => q.pos === 'BB'), sm = R.smooth(null);
    const w1 = R.preflopRange(PT.coach.lineOf(v, bb), sm, false), w2 = Float64Array.from(w1);
    R.removeDead(w1, v.cards.concat(v.board)); R.removeDead(w2, v.cards.concat(v.board));
    R.narrowPostflop(w1, v.actions, bb, v.board, R.profileOf(sm), v.pfa, 3, { sm });
    R.narrowPostflop(w2, v.actions, bb, v.board, R.profileOf(sm), v.pfa, 3, { legacy: true });
    const e1 = PT.ev.rangeEq(PT.ev.comboEquities(v.cards, v.board, w1, { maxIter: 0 }).e, w1), e2 = PT.ev.rangeEq(PT.ev.comboEquities(v.cards, v.board, w2, { maxIter: 0 }).e, w2);
    ok(e1 < 0.5 && Math.abs(e1 - e2) > 0.005, 'Bluffcatcher gegen River-Lead ≈ Pot: Equity ' + e1.toFixed(3) + ' (Tabelle) gegen ' + e2.toFixed(3) + ' (Faustregel 2.1)');
  });

  test('2.2 AP2: Reaktionsmodell – Fold steigt mit der Größe, Mischung aus Tabelle und 2.1-Modell, gleichgewichtsnah weiter MDF', () => {
    const h = spot('BTN', 'KhQd', '9c7d2s', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check']]);
    const a = PT.coach.analyze({ view: PT.bots.publicView(h, 0), opps: {}, settings: { mode: 'exploit', level: 'standard' }, seed: 9, live: true });
    const bets = a.actions.filter(x => x.type === 'bet').sort((p, q) => p.amount - q.amount), f = bets.map(b => b.parts.folds[0].f);
    for (let i = 1; i < f.length; i++) ok(f[i] >= f[i - 1] - 1e-9, 'monoton: ' + f.map(x => x.toFixed(3)).join(' ≤ '));
    ok(/Aktionstabelle gemittelt/.test(bets[0].parts.folds[0].basis), 'Basis: ' + bets[0].parts.folds[0].basis);
    const g = PT.coach.analyze({ view: PT.bots.publicView(h, 0), opps: {}, settings: { mode: 'gto', level: 'standard' }, seed: 9, live: true });
    ok(/MDF/.test(g.actions.filter(x => x.type === 'bet')[0].parts.folds[0].basis), 'gleichgewichtsnah: MDF');
    ok(a.iters <= 5000 && g.iters <= 5000, 'höchstens 5.000 Simulationen (' + a.iters + ', ' + g.iters + ')');
  });

  test('2.2 AP4: Push/Fold-Modellspiel – Lösung mit kleiner Exploitability, Charts monoton in Position und Stack', () => {
    const P = R.PF_TABLE(); ok(!!P, 'Lösung eingebettet');
    Object.keys(P.expl).forEach(S => ok(P.expl[S] <= 0.005, S + ' BB: Exploitability ' + P.expl[S] + ' BB/Hand ≤ 0,005'));
    const width = (pos, bb) => { const ch = R.chart('push', { pos, bb }); let s = 0, t = 0; for (let i = 0; i < 169; i++) { const w = PT.hands.CLS_W ? PT.hands.CLS_W[i] : 1; s += ch[i].raise * w; t += w; } return s / t; };
    ok(width('UTG', 10) < width('CO', 10) && width('CO', 10) < width('BTN', 10) && width('BTN', 10) < width('SB', 10), 'Position: UTG < CO < BTN < SB');
    ok(width('BTN', 8) > width('BTN', 15) && width('BTN', 15) > width('BTN', 25), 'Stack: 8 > 15 > 25 BB');
    const aa = PT.hands.classIdx(PT.parseCards('AsAh')[0], PT.parseCards('AsAh')[1]), t72 = PT.hands.classIdx(PT.parseCards('7s2h')[0], PT.parseCards('7s2h')[1]);
    eq(R.chart('push', { pos: 'UTG', bb: 15 })[aa].raise, 1, 'AA immer All-in'); eq(R.chart('push', { pos: 'UTG', bb: 15 })[t72].raise, 0, '72o nie von UTG');
    ok(R.chart('callPush', { jammer: 'SB', pos: 'BB', bb: 10 })[aa].call === 1, 'Call-Chart BB gegen SB: AA callt');
  });

  test('2.2 AP5: Gegner-KI – Eigenheiten fest je Gegner, größenunabhängig nur bei Calling Stations, Phasenwechsel über die öffentliche Handnummer', () => {
    let s = 0, p = 0, sh = 0, bad = 0; PT.bots.POOL.forEach(b => { const P = PT.bots.paramsOf(b.id), st = PT.bots.styleOf(b.id);
      if (P.sizeSens < 1) { s++; if (st !== 'lp' && st !== 'vl') bad++; } if (P.posAgg) p++; if (P.shift) sh++; });
    ok(s > 0 && p > 0 && sh > 0 && bad === 0, 'Eigenheiten: ' + s + ' größenunempfindlich (nur lp/vl), ' + p + ' positionsabhängig, ' + sh + ' wechselnd');
    const h = spot('BTN', 'AhKd', 'Ks7c2d', [['H', 'raise', 2.5], ['BB', 'call']]);
    ok(PT.bots.publicView(h, 0).no === h.no, 'öffentliche Sicht enthält die Handnummer (öffentliche Information)');
    const G = require('../strategy/groups.js').make(PT), all = G.E.concat(G.V, G.T);
    eq(new Set(all).size, 100, 'Gruppen E/V/T disjunkt und vollständig'); eq(G.E.length + '/' + G.V.length + '/' + G.T.length, '52/26/22', 'Gruppengrößen (je Stil gerundet)');
  });

  test('2.2 AP6/F5: Belastbarkeit nach Gelegenheiten; Coach nutzt Aktionszähler; Hypothesen getrennt von Beobachtungen', () => {
    eq(PT.training.statReliability([3, 19]), 'unsicher', '19 Gelegenheiten'); eq(PT.training.statReliability([30, 99]), 'Tendenz', '99'); eq(PT.training.statReliability([50, 100]), 'belastbar', '100');
    const r = PT.stats.newRecord('g001', 'A'); r.hands = 40; r.agg = { bet: 30, raise: 5, call: 20, fold: 25, check: 40 };
    const st = PT.coach._intern.oppStats(r); eq(st.agg.nFace, 50, 'Gelegenheiten gegen Einsätze = Fold + Call + Raise'); eq(st.agg.n, 120, 'alle Postflop-Entscheidungen');
    ok(st.sm.aggFirst > 0.3 && st.sm.aggFold > 0.4, 'geglättete Raten vorhanden');
    r.stats.foldToCbet = [60, 80]; const hy = PT.training.hypotheses(r);
    ok(hy.some(x => x.key === 'foldToCbet' && x.level === 'gestützt'), 'Hypothese „foldet oft gegen C-Bets“ gestützt');
    ok(!hy.some(x => x.key === 'vpip'), 'ohne Gelegenheiten keine Hypothese');
  });

  test('2.2 AP7: Lernsystem – Fehlerfelder, wiederkehrende Fehler, Verbesserung, Vorher-Nachher-Test mit Prüfung und Reparatur', () => {
    const L = PT.training.newLearning();
    for (let i = 0; i < 40; i++) PT.training.addDecision(L, { ts: i, score: i < 20 ? 35 : 85, lossBB: i < 20 ? 2 : 0.1, st: 1, pos: 'BTN', tags: ['cbet'], cats: i < 20 ? ['betgroesse', 'pot-odds'] : [], grade: i < 20 ? 'Fehler' : 'Gut' });
    const ar = PT.training.errorAreas(L); ok(ar.length === 2 && ar.every(a => a.n === 20), 'Fehlerfelder Einsatzgröße und Pot Odds je 20');
    const rc = PT.training.recurring(L); ok(rc.length === 2 && rc[0].n === 20, 'wiederkehrend: ' + rc.map(x => x.cat + ' ' + x.n).join(', '));
    const im = PT.training.improvement(L).filter(x => x.spot === 'cbet')[0]; ok(im && im.problem && im.sure && im.diff === 50, 'Verbesserung in zuvor schwacher Situation: +' + (im && im.diff));
    const t = PT.training.prePostNew(L, { now: 5, cats: ['cbet', 'river-call'] }), q = PT.training.prePostQueue(t, 'pre');
    eq(q.length, 8, 'Vorher-Test: 2 Kategorien × 4 Situationen'); ok(q.every(x => x.diff === 'gemischt'), 'festes Gegnerfeld');
    const qp = PT.training.prePostQueue(t, 'post'); ok(qp.every((x, i) => x.seed !== q[i].seed && x.cat === q[i].cat), 'Nachher: vergleichbare, nicht identische Situationen');
    q.forEach(x => PT.training.prePostRecord(L, x.key, 40, 1)); eq(t.state, 'training', 'nach dem Vorher-Test: Training');
    qp.forEach(x => PT.training.prePostRecord(L, x.key, 70, 0.3)); eq(t.state, 'fertig', 'fertig'); eq(PT.training.prePostResult(t).diff, 30, 'Differenz +30');
    eq(PT.training.validLearning(L), null, 'Lerndaten mit Test gültig');
    const bad = JSON.parse(JSON.stringify(L)); bad.pp[0].cats = ['<script>']; ok(!!PT.training.validLearning(bad), 'ungültige Kategorie abgelehnt');
    const rep = PT.training.repairLearning(bad); ok(rep.removed >= 1 && rep.learning.pp.length === 0, 'Reparatur entfernt den ungültigen Test');
  });

  test('2.2 AP8: Ereignisstrom – nur Beobachtbares, getrennte Kanäle, Prüfung erkennt Manipulation', () => {
    const hs = require('../app-sim.js')(PT, 8, 2202), ev = PT.events.build(hs);
    eq(PT.events.validate(ev), null, 'gültig (' + ev.events + ' Ereignisse)');
    ok(ev.payload.every(h => h.events.every(e => e.recommendations.pai === null)), 'Kanal „pai“ bleibt leer');
    const x = JSON.parse(JSON.stringify(ev)), e = x.payload.find(h => h.events.some(y => y.complete)).events.find(y => y.complete);
    e.observed.actions.push({ t: 'fold' }); x.contentHash = PT.util.fnv1a(JSON.stringify(x.payload));
    ok(/spätere Aktionen/.test(PT.events.validate(x) || ''), 'zukünftige Aktion im beobachteten Zustand erkannt');
  });

  test('2.2 F1: Berichtsurteil folgt der Blockregel (unter 20 Blöcken kein Beleg, auch wenn das Intervall 0 ausschließt)', () => {
    const { verdictText } = require('../../tools/report-22.js');
    ok(/zu wenig/.test(verdictText({ adj: { lo: -35, hi: -7, blocks: 10 } })), '10 Blöcke: zu wenig');
    ok(/belegt schlechter/.test(verdictText({ adj: { lo: -35, hi: -7, blocks: 20 } })), '20 Blöcke, Intervall < 0: belegt schlechter');
    ok(/nicht belegt/.test(verdictText({ adj: { lo: -3, hi: 7, blocks: 200 } })), 'Intervall enthält 0: nicht belegt');
  });
};
