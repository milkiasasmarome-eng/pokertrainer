/* 2.1 Strategie: Populationsmodell der Reaktionen (exploitativ, postflop), Grenzen und Eigenschaften */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T;
  function betFolds(h, mode, opps) {
    const a = PT.coach.analyze({ view: PT.bots.publicView(h, 0), opps: opps || {}, settings: { mode, level: 'standard' }, seed: 9, live: true });
    const bets = a.actions.filter(x => x.type === 'bet').sort((p, q) => p.amount - q.amount);
    return { a, bets, f: bets.map(b => b.parts.folds[0].f), r: bets.map(b => b.parts.folds[0].r), basis: bets.length ? bets[0].parts.folds[0].basis : '' };
  }
  test('Reaktionsmodell 2.1: Fold steigt mit der Einsatzgröße, Wahrscheinlichkeiten gültig, gleichgewichtsnaher Modus bleibt MDF', () => {
    const h = T.spot('BTN', 'KhQd', '9c7d2s', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check']]);
    const e = betFolds(h, 'exploit'), g = betFolds(h, 'gto');
    ok(/Populationsmodell|Aktionstabelle/.test(e.basis), 'exploitativ: Populationsmodell (' + e.basis + ')');
    ok(/MDF/.test(g.basis), 'gleichgewichtsnah: MDF (' + g.basis + ')');
    for (let i = 1; i < e.f.length; i++) ok(e.f[i] >= e.f[i - 1] - 1e-9, 'Fold monoton in der Größe: ' + e.f.map(x => x.toFixed(3)).join(' < '));
    e.bets.forEach(b => { const r = b.parts.folds[0]; ok(r.f >= 0 && r.c >= 0 && r.r >= 0 && Math.abs(r.f + r.c + r.r - 1) < 1e-6, 'Summe der Reaktionen = 1 (' + b.label + ')'); });
    ok(e.f[0] > 0.2 && e.f[e.f.length - 1] < 0.95, 'plausibler Bereich (' + e.f[0].toFixed(2) + ' … ' + e.f[e.f.length - 1].toFixed(2) + ')');
  });
  test('Reaktionsmodell 2.1: Gegnerwerte verschieben die Schwelle in die richtige Richtung (Fold gegen C-Bet, WTSD)', () => {
    const h = T.spot('BTN', 'KhQd', '9c7d2s', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check']]);
    const bb = h.p.find(q => q.pos === 'BB');
    function rec(fcb, wtsd) { const r = PT.stats.newRecord(bb.id, bb.name); r.hands = 400; r.stats.vpip = [120, 400]; r.stats.pfr = [70, 400]; r.stats.foldToCbet = [Math.round(fcb * 100), 100]; r.stats.wtsd = [Math.round(wtsd * 120), 120]; return { [bb.id]: r }; }
    const folder = betFolds(h, 'exploit', rec(0.75, 0.22)), station = betFolds(h, 'exploit', rec(0.2, 0.45)), none = betFolds(h, 'exploit', {});
    ok(folder.f[1] > none.f[1] && none.f[1] > station.f[1], 'Fold ½ Pot: viel foldend ' + folder.f[1].toFixed(3) + ' > ohne Daten ' + none.f[1].toFixed(3) + ' > Calling Station ' + station.f[1].toFixed(3));
  });
  test('Reaktionsmodell 2.1: Callrange und Raiserange zerlegen die Weiterspielrange; Raise unmöglich, wenn der Gegner nur noch callen kann', () => {
    const h = T.spot('CO', 'AsJd', 'Jc8h4d', [['H', 'raise', 2.5], ['BTN', 'call'], ['BB', 'fold']]);
    const v = PT.bots.publicView(h, 0), a = PT.coach.analyze({ view: v, opps: {}, settings: { mode: 'exploit', level: 'standard' }, seed: 2, live: true });
    ok(a.actions.some(x => x.type === 'bet'), 'Bet-Kandidaten vorhanden');
    const X = PT.ev, opp = { p: v.players.find(q => q.pos === 'BTN'), w: new Float64Array(1326).fill(1), sm: PT.ranges.smooth(null), raw: PT.stats.emptyStats() };
    PT.ranges.removeDead(opp.w, v.cards.concat(v.board));
    const ctx = { street: 1, board: v.board, me: v.players[0], L: v.legal, mode: 'exploit' };
    const r = X.popRespond(opp, ctx, 300, v.pot, 1, 'cbet');
    let dev = 0; for (let k = 0; k < 1326; k++) dev = Math.max(dev, Math.abs(r.contW[k] - r.callW[k] - r.raiseW[k]));
    ok(dev < 1e-9, 'contW = callW + raiseW');
    const opp2 = Object.assign({}, opp, { p: Object.assign({}, opp.p, { stack: 200 }) }), r2 = X.popRespond(opp2, ctx, 300, v.pot, 1, 'cbet');
    ok(r2.r === 0, 'Gegner kann nur callen: kein Raise (' + r2.r + ')');
  });
};
