/* A5 – Range-Kennung (ranges.hashRange): ähnliche, aber verschiedene Verteilungen müssen verschiedene Kennungen
   erhalten, gleiche Verteilungen in anderer Skalierung dieselbe. Vorher: Math.round(w·1000) + 32-Bit-FNV. */
'use strict';
module.exports = function (T) {
  const { PT, test, ok, eq } = T, R = PT.ranges, H = PT.hands, NC = H.NC, C = s => PT.parseCards(s);
  test('A5 Range-Kennung: Unterschiede < 0,0005 ergeben verschiedene Kennungen', () => {
    const base = R.band(0, 0.3, 1, 0.02), hb = R.hash(base);
    // eine einzelne Kombination um 0,0004 verändert (nicht proportional)
    const k0 = base.findIndex(x => x > 0.2 && x < 0.9) >= 0 ? base.findIndex(x => x > 0.2 && x < 0.9) : base.findIndex(x => x > 0);
    const one = base.slice(); one[k0] += 0.0004; ok(R.hash(one) !== hb, 'eine Kombination +0,0004 → andere Kennung');
    // zusätzliche Kombination mit Gewicht 0,0004 (vorher auf 0 gerundet und ignoriert)
    const z = base.findIndex(x => x === 0), add = base.slice(); add[z] = 0.0004; ok(R.hash(add) !== hb, 'neue Kombination mit Gewicht 0,0004 → andere Kennung');
    // sehr kleines Gewicht (Träger zählt immer)
    const tiny = base.slice(); tiny[z] = 1e-12; ok(R.hash(tiny) !== hb, 'Träger: Gewicht 1e-12 → andere Kennung');
    // 500 zufällige Störungen |δ| < 0,0005 auf zufälligen Teilmengen: alle Kennungen verschieden
    const rng = PT.makeRng('a5'), seen = new Set([hb]); let dup = 0;
    for (let i = 0; i < 500; i++) {
      const w = base.slice(); let changed = false;
      for (let k = 0; k < NC; k++) if (w[k] > 0 && rng() < 0.05) { const d = (rng() - 0.5) * 0.0009; if (d !== 0) { w[k] = Math.max(1e-9, w[k] + d); changed = true; } }
      if (!changed) continue;
      const h = R.hash(w); if (seen.has(h)) dup++; seen.add(h);
    }
    eq(dup, 0, 'Kollisionen unter 500 gestörten Verteilungen');
  });
  test('A5 Range-Kennung: gleiche Verteilung in anderer Skalierung → gleiche Kennung; Format', () => {
    const ranges = [R.band(0, 0.3, 1, 0.02), R.band(0.1, 0.6, 0.4, 0.05), R.full()];
    const w3 = new Float64Array(NC); for (let k = 0; k < NC; k += 7) w3[k] = 0.1 + (k % 13) / 17; ranges.push(w3);
    let diff = 0, n = 0;
    ranges.forEach(w => [0.5, 2, 3, 0.37, 7.1, 1000, 1e-3, 0.9996, 1 / 3].forEach(f => { n++; if (R.hash(w.map(x => x * f)) !== R.hash(w)) diff++; }));
    eq(diff, 0, 'abweichende Kennungen bei ' + n + ' Skalierungen');
    const rng = PT.makeRng('a5s'); let d2 = 0; for (let i = 0; i < 400; i++) { const f = Math.exp((rng() - 0.5) * 20); if (R.hash(ranges[1].map(x => x * f)) !== R.hash(ranges[1])) d2++; }
    ok(d2 <= 2, 'zufällige Skalierungen: ' + d2 + ' von 400 abweichend (Rundungsgrenze, nur Cache-Fehlgriff)');
    ok(/^h2[0-9a-f]{16}$/.test(R.hash(ranges[0])), 'Format h2 + 64 Bit');
    eq(R.hash(new Float64Array(NC)), 'h2leer', 'leere Range');
    const nanw = ranges[0].slice(); nanw[nanw.findIndex(x => x === 0)] = NaN; eq(R.hash(nanw), R.hash(ranges[0]), 'NaN zählt wie 0 (wie bei allen Nutzern)');
  });
  test('A5 Equity-Cache: verschiedene Verteilungen mit früher gleicher Kennung liefern ihre eigene Equity', () => {
    // AQ (schlägt den Helden) mit Gewicht 1, alle übrigen Kombinationen mit 0,0004 bzw. 0,0001:
    // früher identische Kennung (Rest auf 0 gerundet), obwohl der Rest 0,45 bzw. 0,11 Kombinationen Masse trägt
    const hero = C('QcJd'), board = C('Qh8d5s3c2h'), a = new Float64Array(NC), b = new Float64Array(NC);
    for (let k = 0; k < NC; k++) { const r1 = H.C1[k] >> 2, r2 = H.C2[k] >> 2, top = (r1 === 12 && r2 === 10) || (r1 === 10 && r2 === 12); a[k] = top ? 1 : 0.0004; b[k] = top ? 1 : 0.0001; }
    PT.equity.cacheClear();
    const ea = PT.equity.equity({ hero, board, ranges: [a], level: 'standard' }), eb = PT.equity.equity({ hero, board, ranges: [b], level: 'standard' });
    const ebRef = PT.equity.equity({ hero, board, ranges: [b], level: 'standard', cache: false });
    ok(ea.exact && ebRef.exact, 'River exakt');
    ok(Math.abs(ea.eq - ebRef.eq) > 0.01, 'Testfall unterscheidet sich in der Equity (' + ea.eq.toFixed(5) + ' / ' + ebRef.eq.toFixed(5) + ')');
    ok(Math.abs(eb.eq - ebRef.eq) < 1e-12, 'Cache liefert die Equity der zweiten Range (' + eb.eq.toFixed(5) + ', richtig ' + ebRef.eq.toFixed(5) + ')');
    PT.equity.cacheClear();
  });
};
