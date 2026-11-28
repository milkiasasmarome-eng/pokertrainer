/* 2.4: Regressionstests zu offenen Prüfbefunden aus 2.3 (docs/audit-2.3/PRUEFUNG_2.3.md) und zur Entwicklung 2.4. */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T;
  test('Prüfbefund E23-14: Kürzung langer Aktionsfolgen hinterlässt keine Lücke (nach der ersten Überschreitung endet die Straße mit „…“)', () => {
    const acts = [{ st: 0, s: 1, t: 'call', a: 100, pot: 150 }];
    for (let i = 0; i < 40; i++) acts.push({ st: 1, s: 1, t: i % 2 ? 'raise' : 'bet', a: 100000 + i, pot: 2000, cur: 0 });
    acts.push({ st: 1, s: 1, t: 'call', a: 5, pot: 2000 });   /* kurze Aktion nach der Überschreitung: darf nicht angehängt werden */
    const rec = { no: 1, ts: 1, seats: [0, 1, 2, 3, 4, 5].map(i => ({ seat: i, id: i ? 'g00' + i : 'hero', name: 'x' + i, pos: PT.POS6[i], hero: i === 0 })), actions: acts,
      board: PT.parseCards('AsKdQh5cJd'), shown: [{ seat: 1, cards: 'AhAd' }], net: [0, 0, 0, 0, 0, 0], button: 0 };
    const db = PT.stats.newDb(), hero = PT.stats.newRecord('hero', 'Du'); PT.stats.dbApplyHand(db, rec, hero);
    const s = db.opps.g001.shown[0].actions[1], toks = s.split(', ');
    ok(s.length <= 300, 'Länge ' + s.length);
    ok(toks[toks.length - 1] === '…', 'endet mit „…“: ' + toks.slice(-2).join(' | '));
    ok(!/^Call/.test(toks[toks.length - 2] || ''), 'kein späterer Call hinter der Lücke');
    /* Negativtest: kurze Folgen bleiben unverändert und ohne Auslassungszeichen */
    const rec2 = Object.assign({}, rec, { actions: acts.slice(0, 4) }), db2 = PT.stats.newDb(); PT.stats.dbApplyHand(db2, rec2, PT.stats.newRecord('hero', 'Du'));
    ok(db2.opps.g001.shown[0].actions[1].indexOf('…') < 0, 'kurze Folge ohne Kürzung: ' + db2.opps.g001.shown[0].actions[1]);
  });
  test('Prüfbefund E23-10: Erklärung nennt bei Raises „Der Raise“, bei Bets „Die Bet“', () => {
    const h = T.spot('BTN', '5c4c', 'KsQd9s2h8d', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check'], ['H', 'bet', 2], ['BB', 'call'], ['BB', 'check'], ['H', 'bet', 5], ['BB', 'call'], ['BB', 'check']]);
    const a = PT.coach.analyze({ view: PT.bots.publicView(h, 0), opps: {}, settings: { mode: 'exploit', level: 'standard' }, seed: 7, live: true, skipModel: true });
    const mk = (type, label) => { const b = JSON.parse(JSON.stringify(a)); b.actions[0] = Object.assign({}, b.actions[0], { type, label, allin: false, parts: Object.assign({}, b.actions[0].parts, { pAllFold: 0.4 }) }); b.equity = Object.assign({}, b.equity, { eq: 0.2 }); b.mix = null; return PT.coach.explain(b).einsteiger; };
    const tr = mk('raise', 'Raise auf 9'), tb = mk('bet', 'Bet 6');
    ok(/Der Raise gewinnt/.test(tr) && !/Die Bet gewinnt/.test(tr), tr.slice(0, 120));
    ok(/Die Bet gewinnt/.test(tb), tb.slice(0, 120));
  });
  test('2.4: Entwicklungsschalter des gleichgewichtsnahen Modus sind im Produktstand aus und ändern den exploitativen Modus nicht', () => {
    ok(!PT.ranges.ABL.gtoRaiseAdj && !PT.ranges.ABL.gtoPopAdj, JSON.stringify(PT.ranges.ABL));
    const h = T.spot('BTN', 'AhKd', 'Kc8s4d2h', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check'], ['H', 'bet', 2], ['BB', 'raise', 7]]);
    const run = (mode, abl) => { Object.assign(PT.ranges.ABL, abl); PT.equity.cacheClear(); const a = PT.coach.analyze({ view: PT.bots.publicView(h, 0), opps: {}, settings: { mode, level: 'standard' }, seed: 7, live: true, skipModel: true });
      delete PT.ranges.ABL.gtoRaiseAdj; delete PT.ranges.ABL.gtoPopAdj; return a.actions.map(x => x.label + ':' + x.ev.toFixed(3)).join('|'); };
    ok(run('exploit', {}) === run('exploit', { gtoRaiseAdj: true }), 'exploitativ unabhängig vom Schalter');
    const g0 = run('gto', {}), gR = run('gto', { gtoRaiseAdj: true });
    ok(g0 !== gR, 'Negativtest: Schalter wirkt im gleichgewichtsnahen Modus auf den Raise-Zweig');
    ok(JSON.stringify(PT.ranges.ABL) === JSON.stringify({ hybrid: true }), 'Schalter zurückgesetzt');
  });
};
