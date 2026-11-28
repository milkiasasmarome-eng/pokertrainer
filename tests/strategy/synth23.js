/* 2.3 (Arbeitspaket 4): parametrische synthetische Gegnerfamilie mit strikt getrennten Gruppen.
   Jedes Profil ist ein fester Parametervektor (aus einem eigenen Zufallsstrom je Gruppe und Nummer gezogen):
   Preflop-Breite, 3-Bet-Anteil, Value-Schwelle, Bluff-Anteil, Slowplay/Check-Raise, Größenzuordnung (direkt, umgekehrt, konstant, polar),
   Größenempfindlichkeit beim Verteidigen, Raise-Neigung, Positionsabhängigkeit, Straßenabhängigkeit und Phasenwechsel.
   Gruppen (Verwendung festgelegt in docs/ABNAHMEKRITERIEN_2.3.md):
     E  Entwicklung      – Ursachenanalyse und Modellentwurf
     Tr Training         – Anpassung freier Parameter (z. B. Schwellen des hybriden Modells)
     Va Validierung      – Modellwahl
     Ka Kalibrierung     – Range- und Equity-Kalibrierung
   Die abschließende Testgruppe liegt nicht hier, sondern in tests/strategy/final23/ (von einem unabhängigen Prüfagenten erstellt).
   Alle Profile sehen nur die öffentliche Sicht ihres Platzes. */
'use strict';
const SIZES = [0.33, 0.5, 0.75, 1, 1.5];
const GROUPS = { E: 12, Tr: 10, Va: 10, Ka: 8 };

function make(PT) {
  const H = PT.hands, R = PT.ranges;
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const top = v => H.classTop(H.classIdx(v.cards[0], v.cards[1]));
  const me = v => v.players[v.seat];
  const strength = v => v.board.length >= 3 ? PT.bots.percentile(v.cards, v.board).p : 1 - top(v);
  const drawStrong = v => v.board.length >= 3 && v.board.length < 5 && R.drawInfo(v.cards[0], v.cards[1], v.board).strong;
  const preRaises = v => v.actions.filter(a => a.st === 0 && (a.t === 'raise' || a.t === 'bet')).length;
  const ipOf = v => { const act = v.players.filter(q => !q.folded); const order = q => (q.seat - v.button - 1 + v.players.length) % v.players.length; return act.every(q => q.seat === v.seat || order(q) < order(me(v))); };
  const iChecked = v => v.actions.some(a => a.st === v.street && a.s === v.seat && a.t === 'check');
  function raiseTo(v, to) { const L = v.legal; if (!L.canRaise) return L.canCall ? { type: 'call' } : { type: 'check' }; return { type: L.isBet ? 'bet' : 'raise', amount: Math.round(clamp(to, L.minTo, L.maxTo)) }; }
  const potBet = (v, f) => me(v).bet + Math.max(v.bb, f * v.pot);

  /** Parametervektor eines Profils (deterministisch aus Gruppe und Nummer) */
  function params(group, i) {
    const r = PT.makeRng('synth23|' + group + '|' + i), u = (a, b) => a + (b - a) * r(), pick = arr => arr[Math.floor(r() * arr.length) % arr.length];
    const p = {
      open: u(0.1, 0.5), threeBet: u(0.03, 0.14), callW: u(0.05, 0.25),
      valueThr: u(0.55, 0.88), bluff: u(0, 0.45), bluffMax: u(0.15, 0.4), trap: r() < 0.35 ? u(0.3, 0.8) : u(0, 0.1),
      sizing: pick(['direkt', 'umgekehrt', 'konstant', 'polar']), base: pick(SIZES), sens: r() < 0.25 ? u(0, 0.3) : u(0.5, 2),
      def0: u(0.25, 0.55), raiseThr: u(0.82, 0.97), raiseBluff: u(0, 0.12), ipBoost: u(-0.1, 0.3), riverAgg: u(0.6, 1.5), shift: r() < 0.3 ? Math.round(u(60, 300)) : 0
    };
    return p;
  }
  /** Phasenwechsel: abwechselnd gespiegelte Aggression (gleiches Profil, andere Phase) */
  function phase(p, info) { if (!p.shift || !info || info.handNo == null) return p; const odd = Math.floor(info.handNo / p.shift) % 2 === 1; if (!odd) return p;
    return Object.assign({}, p, { bluff: clamp(0.45 - p.bluff, 0, 0.45), trap: clamp(0.8 - p.trap, 0, 0.8), sens: clamp(2 - p.sens, 0, 2) }); }
  function sizeFor(p, x, bluffing) {
    const b = p.base, k = SIZES.indexOf(b);
    if (p.sizing === 'konstant') return b;
    if (p.sizing === 'polar') return bluffing || x > 0.9 ? Math.max(b, 1) : 0.33;
    const hi = x > 0.85, sh = (hi ? 1 : 0) * (p.sizing === 'direkt' ? 1 : -1) + (bluffing ? (p.sizing === 'direkt' ? -1 : 1) : 0);
    return SIZES[clamp(k + sh, 0, SIZES.length - 1)];
  }
  function decide(p0, v, rng, info) {
    const p = phase(p0, info), L = v.legal, ip = ipOf(v);
    if (v.street === 0) {
      const t = top(v), rc = preRaises(v), w = clamp(p.open + (ip ? p.ipBoost * 0.3 : 0), 0.05, 0.7);
      if (rc === 0) { if (t <= w) return raiseTo(v, Math.max(2.5 * v.bb, v.cur * 2.5)); return L.canCheck ? { type: 'check' } : { type: 'fold' }; }
      if (t <= p.threeBet / (rc + 1) * 3) return raiseTo(v, v.cur * 3);
      if (t <= w * 0.6 + p.callW / rc) return L.canCall ? { type: 'call' } : { type: 'check' };
      return L.canCheck ? { type: 'check' } : { type: 'fold' };
    }
    const x = strength(v), dr = drawStrong(v), agg = v.street === 3 ? p.riverAgg : 1, ipA = ip ? 1 + p.ipBoost : 1;
    if (L.toCall <= 0) {
      if (x >= p.valueThr) { if (rng() < p.trap && !(v.street === 3 && iChecked(v))) return { type: 'check' }; return raiseTo(v, potBet(v, sizeFor(p, x, false))); }
      if ((x < p.bluffMax || dr) && rng() < clamp(p.bluff * agg * ipA, 0, 0.9)) return raiseTo(v, potBet(v, sizeFor(p, x, true)));
      return { type: 'check' };
    }
    const price = L.toCall / Math.max(1, v.pot + L.toCall);
    const need = clamp(p.def0 + p.sens * (price - 0.25), 0.02, 0.98);
    if (x >= p.raiseThr || (iChecked(v) && x >= p.valueThr && rng() < p.trap)) return raiseTo(v, v.cur * 3 + v.pot * 0.3);
    if (rng() < p.raiseBluff * agg) return raiseTo(v, v.cur * 2.5 + v.pot * 0.2);
    if (x >= need || (dr && price < 0.35)) return L.canCall ? { type: 'call' } : { type: 'check' };
    return L.canCheck ? { type: 'check' } : { type: 'fold' };
  }
  const PROFILES = {};
  Object.keys(GROUPS).forEach(g => { for (let i = 0; i < GROUPS[g]; i++) { const key = 'p23:' + g + ':' + String(i).padStart(2, '0'), p = params(g, i); PROFILES[key] = { group: g, params: p, fn: (v, rng, info) => decide(p, v, rng, info) }; } });
  const keysOf = g => Object.keys(PROFILES).filter(k => PROFILES[k].group === g);
  /** Profil eines Pool-Gegners am Tisch für die Zusammensetzung comp ('p23:<Gruppe>' = je Gegner ein Profil der Gruppe, 'p23:<Gruppe>:<nn>' = alle dasselbe) */
  function forSeat(id, comp) {
    const parts = comp.split(':'); if (parts.length === 3) return PROFILES[comp] ? comp : null;
    const ks = keysOf(parts[1]); if (!ks.length) return null; return ks[PT.rng.hashStr(id + '|p23') % ks.length];
  }
  return { PROFILES, GROUPS, keysOf, forSeat, get: k => PROFILES[k] && PROFILES[k].fn };
}
module.exports = { make, GROUPS };
