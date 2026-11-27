/* 2.1 Strategie: Regressionstests zu den Befunden der Strategieprüfung B (docs/audit-2.1/PRUEFUNG_B.md).
   Reproduktionen nach /home/claude/review2-b (Skripte e1–e13), auf kleine, schnelle Fälle verkürzt. */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T;
  const C = s => PT.parseCards(s);
  const coach = (h, mode, more) => PT.coach.analyze(Object.assign({ view: PT.bots.publicView(h, 0), opps: {}, settings: { mode: mode || 'exploit', level: 'standard' }, seed: 7, live: true, skipModel: true }, more || {}));

  /** Spot mit wählbarer Stacktiefe (alle Spieler gleich tief) */
  function deep(heroPos, cards, board, script, stackBB) {
    const button = (0 - PT.POS6.indexOf(heroPos) + 6) % 6, ids = ['g001', 'g002', 'g003', 'g004', 'g005'];
    const players = [{ id: 'hero', name: 'Du', stack: stackBB * 100, isHero: true }].concat(ids.map(id => ({ id, name: PT.bots.nameOf(id), stack: stackBB * 100 })));
    const deck = PT.rules.deckFor({ n: 6, button, board: board ? (PT.parseCards(board) || []).map(PT.cardStr) : [], seats: players }, { 0: C(cards) });
    const h = new PT.Hand({ players, button, sb: 50, bb: 100, deck, no: 1 }).start(), seatOf = p => p === 'H' ? 0 : h.p.findIndex(q => q.pos === p);
    for (const [p, t, amt] of script) { const sx = seatOf(p); let g = 0; while (h.toAct !== sx && g++ < 20) { const L = h.legal(h.toAct); h.act(h.toAct, L.canCheck ? { type: 'check' } : { type: 'fold' }); }
      const r = h.act(sx, amt ? { type: t, amount: Math.round(amt * 100) } : { type: t }); if (!r.ok) throw new Error(p + ' ' + t + ': ' + r.error); }
    let g = 0; while (h.toAct !== 0 && !h.done && g++ < 20) { const L = h.legal(h.toAct); h.act(h.toAct, L.canCheck ? { type: 'check' } : { type: 'fold' }); }
    return h;
  }

  test('Prüfer B 1: Chart-Anker misst Fold am Chartgewicht (kein Fold mit Händen, die der Chart zu 100 % spielt)', () => {
    const cases = [
      ['BTN', 'As5s', [['UTG', 'call']], 'aggr', 'A5s BTN gegen Limper'],
      ['BTN', 'KsJh', [['UTG', 'call']], 'aggr', 'KJo BTN gegen Limper'],
      ['BTN', '2s2h', [['UTG', 'call']], 'aggr', '22 BTN gegen Limper'],
      ['BTN', 'KsQh', [['H', 'raise', 2.5], ['BB', 'raise', 11]], 'call', 'KQo gegen 3-Bet'],
      ['BTN', 'JsTs', [['HJ', 'raise', 2.5]], 'call', 'JTs gegen HJ-Open']];
    for (const [pos, cards, script, want, name] of cases) for (const mode of ['exploit', 'gto']) {
      const a = coach(T.spot(pos, cards, '', script), mode), b = a.actions[0], g = b.type === 'bet' || b.type === 'raise' ? 'aggr' : b.type;
      ok(a.chart && a.chart.fold < 0.12 && g === want, name + ' [' + mode + ']: ' + b.label + ' (Chart F ' + (a.chart ? a.chart.fold : '-') + ')');
      // Ein Fold dieser Hand wird gedeckelt und als Abweichung vom Chart erklärt
      const gf = PT.coach.grade(a, { type: 'fold' });
      ok(gf.score <= 45 && /Fold/.test(gf.text) && /Chart/.test(gf.text), name + ' [' + mode + ']: Fold → ' + gf.grade);
    }
    // Ausnahme: reiner Call oder Fold gegen ein All-in bleibt Rechnung (kein Chart-Anker)
    const j = coach(T.spot('BB', '7c2d', '', [['BTN', 'allin']]), 'exploit');
    ok(!j.chart || !j.chart.applied, 'Call/Fold gegen All-in: kein Chart-Anker');
  });

  test('Prüfer B 9: Kurzzeit- und Langzeitwerte nicht gemischt (VPIP ≥ PFR)', () => {
    const r = PT.stats.newRecord('g002', PT.bots.nameOf('g002'));
    r.hands = 1000; r.stats.vpip = [210, 1000]; r.stats.pfr = [170, 1000];
    r.recent.h = 140; r.recent.stats.vpip = [12, 120, 60]; r.recent.stats.pfr = [11, 120, 60];
    r.chg = { vpip: [900, -1] };
    const eff = PT.stats.effectiveStats(r);
    ok(eff.changed.join() === 'vpip' && eff.linked.join() === 'pfr', 'VPIP mit Alarm, PFR verknüpft (' + eff.changed + ' / ' + eff.linked + ')');
    ok(eff.stats.pfr[1] === 120 && eff.stats.pfr[0] === 11, 'PFR aus derselben Zeitskala wie VPIP');
    const sm = PT.ranges.smooth(eff.stats); ok(sm.vpip >= sm.pfr, 'geglättet VPIP ' + sm.vpip.toFixed(3) + ' ≥ PFR ' + sm.pfr.toFixed(3));
    const pr = PT.stats.profile(r); ok(pr.estSrc.pfr === 'kurzzeit' && pr.est.vpip >= pr.est.pfr, 'Profil: beste Schätzung PFR ebenfalls kurzfristig');
    // Coach: auch bei inkonsistenten Eingaben nie PFR > VPIP
    r.recent.stats.pfr = [16, 120, 60];
    const h = T.spot('BTN', 'AhQd', '', [['HJ', 'raise', 2.5]]), hj = h.p.find(q => q.pos === 'HJ'), rr = JSON.parse(JSON.stringify(r)); rr.id = hj.id; rr.name = hj.name;
    const a = coach(h, 'exploit', { opps: { [hj.id]: rr } }), o = a.opponents.find(x => x.name === hj.name);
    ok(o.sm.vpip >= o.sm.pfr, 'Coach: VPIP ' + o.sm.vpip.toFixed(3) + ' ≥ PFR ' + o.sm.pfr.toFixed(3));
  });

  test('Prüfer B 12: respond.inner wird auch nach einer Ausnahme zurückgesetzt', () => {
    const opp = { p: { bet: 0, stack: 9750, name: 'X' }, w: PT.ranges.removeDead(PT.ranges.full(), C('Th7c2d9s8s')), sm: PT.ranges.smooth(null), prof: null, raw: {} };
    const ctx = { street: 1, mode: 'exploit', board: C('Th7c2d'), me: { bet: 0 }, L: { toCall: 0 }, bb: 100 };
    let thrown = false; try { PT.ev.respond(opp, ctx, 300, 550, 1, 'cbet'); } catch (e) { thrown = true; }
    ok(thrown && !PT.ev.respond.inner, 'Ausnahme ausgelöst, Flag zurückgesetzt');
    const a = coach(T.spot('BTN', '9s8s', 'Th7c2d', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check']]), 'exploit');
    ok(/Populationsmodell/.test(a.actions.find(x => x.type === 'bet').parts.folds[0].basis), 'Populationsmodell bleibt aktiv');
  });
  test('Prüfer B 6: Ergebnis unabhängig von Reihenfolge der Modi, Cache-Zustand und Wiederholung (Seeds 77 und 991)', () => {
    let n = 0, diff = 0, mw = 0;
    for (const seed of [77, 991]) {
      const db = PT.stats.newDb(), heroRec = PT.stats.newRecord('hero', 'Du'), t = PT.session.newTable(PT.session.defaultConfig(), db, seed), list = [];
      for (let i = 0; list.length < (T.QUICK ? 18 : 50) && i < 300; i++) {
        const h = PT.session.startHand(t, i);
        while (!h.done) {
          if (h.p[h.toAct].isHero) { list.push({ view: PT.bots.publicView(h, 0), opps: JSON.parse(JSON.stringify(db.opps)) }); const L = h.legal(0); PT.session.act(t, h, 0, L.canCall && L.callAmt <= 300 ? { type: 'call' } : L.canCheck ? { type: 'check' } : { type: 'fold' }); }
          else PT.session.botAct(t, h, heroRec);
        }
        PT.session.finishHand(t, db, h, heroRec);
      }
      list.forEach((s, i) => {
        const run = order => PT.coach.analyze({ view: s.view, opps: s.opps, settings: { mode: 'exploit', level: 'standard' }, seed: seed * 1000 + i, live: true, skipModel: true, _order: order });
        const sig = a => a.actions.map(x => x.label + ':' + x.ev.toFixed(6)).join('|') + '#' + a.otherMode.actions.map(x => x.label + ':' + (x.ev || 0).toFixed(6)).join('|') + '#' + a.iters;
        PT.equity.cacheClear(); const cold = sig(run(['exploit', 'gto']));
        const warm = sig(run(['gto', 'exploit'])), again = sig(run(['exploit', 'gto']));
        n++; if (cold !== warm || cold !== again) diff++;
        if (s.view.players.filter(q => !q.folded && q.seat !== 0).length > 1) mw++;
      });
    }
    ok(diff === 0, n + ' Entscheidungen (' + mw + ' Multiway): kalt, umgekehrt und wiederholt gleich (' + diff + ' verschieden)');
    // cacheClear leert auch den Cache der Equity je Kombination
    const hero = C('AhKd'), board = C('Qs7c2d'), w = PT.ranges.removeDead(PT.ranges.full(), hero.concat(board));
    const o = () => ({ budget: { left: 2000, used: 0 }, rng: PT.makeRng('b6'), exactMax: 1000, maxIter: 2000 });
    PT.ev.comboEquities(hero, board, w, o()); const hit = PT.ev.comboEquities(hero, board, w, o()); PT.equity.cacheClear(); const miss = PT.ev.comboEquities(hero, board, w, o());
    ok(hit.info.cached && !miss.info.cached, 'PT.equity.cacheClear leert ev.comboEquities-Cache');
  });
  test('Prüfer B 5: kein Exploit ohne eigene Beobachtung; Beleg auf der Fold-Rate, die das Modell verwendet', () => {
    // Ohne Gegnerdaten: keine Abweichung vom Chart über den Exploit-Weg (früher 23 Fälle, z. B. HJ 22, SB T7s, BB 3-Bet AJo/44)
    const cases = [['HJ', '2s2h', []], ['SB', 'Ts7s', []], ['BB', 'AsJh', [['BTN', 'raise', 2.5]]], ['BB', '4s4h', [['BTN', 'raise', 2.5]]], ['CO', '2s2h', []]];
    let ex = 0; for (const [pos, cards, script] of cases) { const a = coach(T.spot(pos, cards, '', script), 'exploit'); if (a.chart && a.chart.exploit) ex++; }
    ok(ex === 0, 'ohne Beobachtungen kein Exploit (' + ex + ' von ' + cases.length + ')');
    const steal = (rate, n, cards) => {
      const h = T.spot('BTN', cards || '7c2d', '', []), bb = h.p.find(q => q.pos === 'BB'), r = PT.stats.newRecord(bb.id, bb.name);
      r.hands = Math.max(3 * n, 1); r.stats.foldToSteal = [Math.round(rate * n), n]; r.stats.vpip = [Math.round(0.75 * n), 3 * n]; r.stats.pfr = [Math.round(0.54 * n), 3 * n];
      return coach(h, 'exploit', { opps: { [bb.id]: r } });
    };
    // Konsistenz: an der Schwelle r* erreicht die Modell-Fold-Rate genau fBe
    const a10 = steal(0.9, 10), ev = a10.chart && a10.chart.evidence;
    ok(ev && ev.w > 0 && ev.fBeRaw > 0, 'Beleg berechnet (n = 10)');
    if (ev) {
      const top = a10.actions.find(x => x.type === 'raise' && x.amount === ev.to), fr = top && top.parts.folds.find(x => x.pf && x.pf.key === 'foldToSteal' && x.pf.w > 0);
      ok(fr && Math.abs(fr.pf.chartF * (1 - fr.pf.w) + ev.fBeRaw * fr.pf.g.mul * fr.pf.w - ev.fBe) < 1e-9, 'chartF·(1 − w) + g(r*)·w = fBe');
    }
    // Anpassung bleibt möglich: 90 % Fold über 100 Gelegenheiten → Steal mit 72o
    ok(steal(0.9, 100).actions[0].type === 'raise', 'BB foldet 90 % (n = 100): Steal mit 72o');
  });
  test('Prüfer B 8: Short Stack – keine Raises ab einem Drittel des effektiven Stacks außer All-in (Commitment)', () => {
    const sits = [['BB', [['BTN', 'raise', 2.2]], ['Ks9s', 'Ks8s', 'As5s', 'JsJh']], ['CO', [['H', 'raise', 2.2], ['BTN', 'raise', 5.5]], ['As5s', 'Ks9s', 'AsKh']]];
    let bad = 0, n = 0;
    for (const [pos, script, hands] of sits) for (const cards of hands) for (const mode of ['exploit', 'gto']) {
      const a = coach(deep(pos, cards, '', script, 20), mode), eff = 2000;
      a.actions.forEach(x => { if ((x.type === 'raise' || x.type === 'bet') && !x.allin && x.amount >= eff / 3) bad++; });
      const b = a.actions[0]; n++; if ((b.type === 'raise') && !b.allin) bad++;
    }
    ok(bad === 0, n + ' Analysen bei 20 BB: kein Nicht-All-in-Raise ab ⅓ Stack (' + bad + ')');
    const deepA = coach(deep('BB', 'AsKh', '', [['BTN', 'raise', 2.5]], 100), 'exploit');
    ok(deepA.actions.some(x => x.type === 'raise' && !x.allin), '100 BB: normale 3-Bet-Größen bleiben');
  });
  test('Prüfer B 3: Gegner-KI – starke Hände folden je nach Stil gegen sehr große Einsätze, kleine Einsätze unverändert', () => {
    const byStyle = {}; PT.bots.POOL.forEach(p => { const st = PT.bots.styleOf(p.id); (byStyle[st] = byStyle[st] || []).push(p.id); });
    function rate(style, betBB) {
      let c = 0, n = 0;
      for (const id of byStyle[style].slice(0, 2)) for (let k = 0; k < 50; k++) {
        const h = deep('BTN', 'AhQh', '', [], 100), bb = h.p.findIndex(q => q.pos === 'BB');
        const holes = { 0: h.p[0].cards }; holes[bb] = C('KdTc');
        const players = h.p.map(q => ({ id: q.id, name: q.name, stack: 10000, isHero: !!q.isHero }));
        const deck = PT.rules.deckFor({ n: 6, button: h.button, board: ['Ks', '7c', '2d'], seats: players }, holes);
        const g = new PT.Hand({ players, button: h.button, sb: 50, bb: 100, deck, no: 1 }).start();
        let q = 0; while (g.toAct !== 0 && q++ < 10) g.act(g.toAct, { type: 'fold' });
        g.act(0, { type: 'raise', amount: 250 }); q = 0; while (g.toAct !== bb && q++ < 10) g.act(g.toAct, { type: 'fold' });
        g.act(bb, { type: 'call' }); g.act(bb, { type: 'check' }); g.act(0, { type: 'bet', amount: Math.min(g.p[0].stack, Math.round(betBB * 100)) });
        const a = PT.bots.decide(PT.bots.publicView(g, bb), id, PT.makeRng('b3|' + id + '|' + k + '|' + betBB), { heroStats: null });
        n++; if (a.type !== 'fold') c++;
      }
      return c / n;
    }
    const big = {}, small = {}; ['lp', 'nit', 'tag', 'lag'].forEach(st => { big[st] = rate(st, 97.5); small[st] = rate(st, 2); });
    ok(big.nit <= 0.2 && big.tag <= 0.2 && big.lag <= 0.2, 'Top Pair guter Kicker gegen 17,7-fachen Pot: Nit/TAG/LAG spielen selten weiter (' + JSON.stringify(big) + ')');
    ok(big.lp >= 0.5, 'Calling Station (loose-passiv) callt weiterhin meist (' + big.lp + ')');
    ok(Object.values(small).every(x => x >= 0.95), 'gegen ⅓ Pot spielen alle Stile weiter (' + JSON.stringify(small) + ')');
  });
  test('Prüfer B 11: River-Lead in den Aggressor – Range wertlastig geschätzt, kein Raise mit dem Bluffcatcher', () => {
    const script = [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check'], ['H', 'bet', 2], ['BB', 'call'], ['BB', 'check'], ['H', 'check'], ['BB', 'bet', 9.5]];
    for (const mode of ['exploit', 'gto']) {
      const a = coach(T.spot('BTN', 'KsJd', 'Kh8c4d2s7h', script), mode);
      ok(a.equity.eq < 0.7 && a.actions[0].type !== 'raise' && a.classification !== 'eindeutig', mode + ': Equity ' + a.equity.eq.toFixed(3) + ' (früher 0,866), ' + a.bestLabel + ' (' + a.classification + ')');
    }
    // Lead-Erkennung nur aus öffentlichen Aktionen: C-Bet des Preflop-Raisers und Bet nach Check des Aggressors sind kein Lead
    const acts = [{ st: 1, s: 0, t: 'bet' }, { st: 1, s: 2, t: 'call' }, { st: 2, s: 2, t: 'bet' }];
    ok(PT.ranges.isLead(acts, acts[2], 2, 0) && !PT.ranges.isLead(acts, acts[0], 0, 0), 'Donk-Bet in den Aggressor erkannt, C-Bet nicht');
    const acts2 = [{ st: 1, s: 0, t: 'bet' }, { st: 1, s: 2, t: 'call' }, { st: 2, s: 0, t: 'check' }, { st: 2, s: 2, t: 'bet' }];
    ok(!PT.ranges.isLead(acts2, acts2[3], 2, 0), 'Bet nach Check des Aggressors ist kein Lead');
  });
  test('Prüfer B 2: frei gewählte Größen – große Verluste nie „Gut“/„Vertretbar“, Extrapolation nie Empfehlung', () => {
    const fl = [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check']];
    for (const mode of ['exploit', 'gto']) {
      const hb = T.spot('BTN', '3h2h', 'KsQd9s', fl), allin = PT.bots.publicView(hb, 0).legal.maxTo;
      const ab = coach(hb, mode, { extra: [allin] }), gb = PT.coach.grade(ab, { type: 'bet', amount: allin });
      ok(gb.loss > 0.4 * ab.pot && gb.score <= 20, mode + ': Luft-All-in in 5,5 BB → ' + gb.grade + ' (Verlust ' + gb.lossBB.toFixed(1) + ' BB)');
      const hv = T.spot('BTN', '7h7d', 'Ks7c2d', fl), av = coach(hv, mode, { extra: [allin] }), gv = PT.coach.grade(av, { type: 'bet', amount: allin });
      ok(!av.actions[0].extrapolated && av.actions[0].amount < allin && gv.extrapolated && gv.score <= 80, mode + ': Value-All-in mit 17,7-fachem Pot nicht Empfehlung (' + av.bestLabel + '), Note ' + gv.grade);
    }
    // Interpolation ohne Nachrechnung: Verluste über 0,4 Pot nie „Vertretbar“ oder besser
    const hr = T.spot('BTN', '5c4c', 'KsQd9s2h8d', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check'], ['H', 'bet', 2], ['BB', 'call'], ['BB', 'check'], ['H', 'bet', 5], ['BB', 'call'], ['BB', 'check']]);
    let bad = 0, n = 0; for (const mode of ['exploit', 'gto']) { const a = coach(hr, mode); [1.25, 2, 3].forEach(x => { const amt = Math.round(a.pot * x); if (amt > PT.bots.publicView(hr, 0).legal.maxTo) return; const g = PT.coach.grade(a, { type: 'bet', amount: amt }); n++; if (g.loss > 0.4 * a.pot && g.loss > 4 * a.bb && g.score >= 65) bad++; }); }
    ok(n > 0 && bad === 0, n + ' interpolierte Größen: kein Verlust über 0,4 Pot mit „Vertretbar“ oder besser (' + bad + ')');
  });

  test('Prüfer B 7: gleichgewichtsnaher Modus – reiner Bluff gegen MDF-Verteidigung nicht strukturell −EV', () => {
    const hr = T.spot('BTN', '5c4c', 'KsQd9s2h8d', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check'], ['H', 'bet', 2], ['BB', 'call'], ['BB', 'check'], ['H', 'bet', 5], ['BB', 'call'], ['BB', 'check']]);
    const a = coach(hr, 'gto'), pot = a.actions.find(x => x.label === 'Bet Pot'), chk = a.actions.find(x => x.type === 'check');
    ok(pot && Math.abs(pot.ev - chk.ev) < 0.05 * a.pot, 'River-Bluff Pot gleichgewichtsnah ≈ Check (' + (pot.ev / 100).toFixed(2) + ' vs ' + (chk.ev / 100).toFixed(2) + ' BB)');
    const g = PT.coach.grade(a, { type: 'bet', amount: pot.amount }); ok(g.score >= 65, 'Note des ausgewogenen Bluffs ' + g.grade + ' (früher „Fehler“)');
    // Fold-Rate gleichgewichtsnah = MDF ohne Populationskorrekturen (heads-up, keine starke Untergrenze)
    const f = pot.parts.folds[0].f, mdfF = 1 - a.pot / (a.pot + (pot.amount - 0)); ok(Math.abs(f - mdfF) < 0.02 || f > mdfF, 'Fold-Rate ' + f.toFixed(3) + ' ≥ 1 − MDF ' + mdfF.toFixed(3));
  });
  test('Prüfer B 4: Callrange-Zusammensetzung scharf bei gleicher Fold-Rate (keine mit der Größe wachsende Überschätzung der Equity)', () => {
    const h = T.spot('BTN', 'AhKd', 'Kc8s4d2h', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check'], ['H', 'bet', 2], ['BB', 'call'], ['BB', 'check']]);
    const old = PT.ev.POP.tauC, run = tc => { PT.ev.POP.tauC = tc; PT.equity.cacheClear(); const a = coach(h, 'exploit'); PT.ev.POP.tauC = old; return a.actions.filter(x => x.type === 'bet' && !x.allin).sort((p, q) => p.amount - q.amount); };
    const soft = run(0), sharp = run(old);
    ok(old > 0 && old < PT.ev.POP.tau, 'τc (' + old + ') kleiner als τ (' + PT.ev.POP.tau + ')');
    let sameF = true, lower = true;
    soft.forEach((x, i) => { const y = sharp[i], e0 = x.parts.branches.find(b => b.eq != null).eq, e1 = y.parts.branches.find(b => b.eq != null).eq;
      if (Math.abs(x.parts.folds[0].f - y.parts.folds[0].f) > 0.002) sameF = false; if (!(e1 <= e0 + 0.005)) lower = false; });
    ok(sameF, 'Fold-Rate je Größe unverändert'); ok(lower, 'Equity gegen die Callrange nicht höher als mit weicher Zusammensetzung (Toleranz 0,005: Equity ist nur näherungsweise monoton in der Stärke)');
    const big = soft.length - 1, d0 = soft[0].parts.branches.find(b => b.eq != null).eq - sharp[0].parts.branches.find(b => b.eq != null).eq, d1 = soft[big].parts.branches.find(b => b.eq != null).eq - sharp[big].parts.branches.find(b => b.eq != null).eq;
    ok(d1 >= d0, 'Abschlag wächst mit der Größe (⅓: ' + d0.toFixed(3) + ', größte: ' + d1.toFixed(3) + ')');
  });
};
