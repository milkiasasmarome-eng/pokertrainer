/* Fügt die Teilergebnisse zu assets/js/engine/preflop-data.js zusammen (Uint16, obere Dreiecksmatrix, Base64). */
'use strict';
const fs = require('fs'), path = require('path');
const parts = fs.readdirSync(__dirname).filter(f => /^preflop-part-\d+\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(path.join(__dirname, f))));
const all = Object.assign({}, ...parts);
const buf = Buffer.alloc(14365 * 2); let k = 0, missing = 0;
for (let i = 0; i < 169; i++) for (let j = i; j < 169; j++, k++) {
  let v = all[i * 169 + j]; if (v == null) { missing++; v = 0.5; }
  if (i === j) v = 0.5; // gleiche Klasse: symmetrisch
  buf.writeUInt16LE(Math.round(v * 65535), 2 * k);
}
if (missing) throw new Error('fehlende Paare: ' + missing);
const b64 = buf.toString('base64');
const js = '/* PokerTrainer 2.0 – Preflop-Equity 169×169 (Klasse gegen Klasse), Monte-Carlo mit 12.000 Stichproben je Paar,\n' +
  '   erzeugt mit tools/precompute-preflop.js (fester Seed). Format: Uint16 (Wert/65535), obere Dreiecksmatrix inkl. Diagonale, Base64. */\n' +
  '(function (G) { G.PT.preflopData = "' + b64 + '"; })(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));\n';
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'js', 'engine', 'preflop-data.js'), js);
console.log('ok', b64.length);
