/* Hauptvergleich 2.1: Der gleichgewichtsnahe Modus überbluffte (jede schwache Hand bei EV-Gleichstand Bet). Bei Gleichstand innerhalb der
   Unsicherheit empfiehlt er die passive Aktion und nennt den Bluff als gleichwertige Alternative; der exploitative Modus bleibt unberührt. */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T;
  test('Gleichgewichtsnaher Modus: kein Bluff als alleinige Empfehlung bei Gleichstand; exploitativ ohne Mischhinweis', () => {
    const db = PT.stats.newDb(), heroRec = PT.stats.newRecord('hero', 'Du'), t = PT.session.newTable(PT.session.defaultConfig(), db, 4711);
    let n = 0, mixed = 0, bluffBest = 0, exMix = 0;
    for (let i = 1; i <= 150 && n < 40; i++) {
      const h = PT.session.startHand(t, i); let g = 0;
      while (!h.done && g++ < 200) {
        if (h.p[h.toAct].isHero) {
          if (h.street > 0 && n < 40) {
            const view = PT.bots.publicView(h, 0); n++;
            const a = PT.coach.analyze({ view, opps: db.opps, settings: { mode: 'gto', level: 'standard' }, seed: i, live: true });
            if (a.mix) { mixed++; if (a.best === 'bet' || a.best === 'raise') bluffBest++; }
            const e = PT.coach.analyze({ view, opps: db.opps, settings: { mode: 'exploit', level: 'standard' }, seed: i, live: true });
            if (e.mix) exMix++;
          }
          const L = h.legal(0); PT.session.act(t, h, 0, L.canCheck ? { type: 'check' } : { type: 'call' });
        } else PT.session.botAct(t, h, heroRec);
      }
      PT.session.finishHand(t, db, h, heroRec);
    }
    ok(n >= 20, 'Postflop-Spots geprüft: ' + n + ', davon Gleichstand-Bluff ' + mixed);
    ok(bluffBest === 0, 'bei Gleichstand nie Bluff als Empfehlung');
    ok(exMix === 0, 'exploitativer Modus ohne Mischhinweis');
  });
};
