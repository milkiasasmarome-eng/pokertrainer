/* Berechnet die Preflop-Equity-Tabelle 169×169 (Klasse gegen Klasse) per Monte-Carlo
   und schreibt sie als kompakte Datei assets/js/engine/preflop-data.js. Reproduzierbar (fester Seed). */
'use strict';
const fs = require('fs'), path = require('path');
const PT = require('../tests/load.js').load(['core', 'evaluator']);
const H = PT.hands, E = PT.eval;
const SAMPLES = +(process.argv[2] || 12000);
const part = process.argv[3] ? process.argv[3].split('/').map(Number) : [0, 1];
const combosOf = []; for (let i = 0; i < 169; i++) combosOf.push([]);
for (let k = 0; k < H.NC; k++) combosOf[H.CLS[k]].push(k);
const rng = PT.makeRng('preflop-table-' + part[0]);
const out = {};
const hA = new Array(7), oA = new Array(7), mark = new Int32Array(52); let stamp = 0;
let pairNo = 0;
for (let i = 0; i < 169; i++) for (let j = i; j < 169; j++) {
  if ((pairNo++ % part[1]) !== part[0]) continue;
  let sum = 0, n = 0;
  const A = combosOf[i], B = combosOf[j];
  for (let s = 0; s < SAMPLES; s++) {
    const a = A[Math.floor(rng() * A.length)], b = B[Math.floor(rng() * B.length)];
    const a1 = H.C1[a], a2 = H.C2[a], b1 = H.C1[b], b2 = H.C2[b];
    if (a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2) continue;
    stamp++; mark[a1] = mark[a2] = mark[b1] = mark[b2] = stamp;
    hA[0] = a1; hA[1] = a2; oA[0] = b1; oA[1] = b2;
    for (let q = 2; q < 7; q++) { let c; do { c = Math.floor(rng() * 52); } while (mark[c] === stamp); mark[c] = stamp; hA[q] = oA[q] = c; }
    const x = E.evaluate(hA), y = E.evaluate(oA);
    sum += x > y ? 1 : x === y ? 0.5 : 0; n++;
  }
  out[i * 169 + j] = n ? sum / n : 0.5;
}
fs.writeFileSync(path.join(__dirname, 'preflop-part-' + part[0] + '.json'), JSON.stringify(out));
console.log('fertig', part, Object.keys(out).length);
