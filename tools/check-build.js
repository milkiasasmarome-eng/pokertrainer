/* Build-Reproduzierbarkeit: baut zweimal und vergleicht die Ausgaben (sw.js, dist/*.html) byteweise.
   Zusätzlich: Weicht die Ausgabe vom vorherigen Stand im Arbeitsverzeichnis ab, war der eingecheckte Build veraltet.
   Aufruf: node tools/check-build.js   (Rückgabewert 1 bei Abweichung) */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
function outputs() { return ['sw.js'].concat(fs.readdirSync(path.join(root, 'dist')).map(f => 'dist/' + f)); }
function hashes() { const o = {}; outputs().forEach(f => { o[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex'); }); return o; }
const before = hashes();
execFileSync(process.execPath, [path.join(root, 'tools', 'build.js')], { stdio: 'ignore' });
const first = hashes();
execFileSync(process.execPath, [path.join(root, 'tools', 'build.js')], { stdio: 'ignore' });
const second = hashes();
let fail = false;
Object.keys(second).forEach(f => {
  const same = first[f] === second[f], fresh = before[f] === first[f];
  console.log((same ? 'OK     ' : 'FEHLER ') + f + ' ' + second[f].slice(0, 16) + (same ? ' (zweimal gebaut: identisch)' : ' (zweiter Build weicht ab)') + (fresh ? '' : ' – eingecheckter Stand war veraltet'));
  if (!same || !fresh) fail = true;
});
if (Object.keys(first).join() !== Object.keys(second).join()) { console.log('FEHLER Ausgabedateien unterscheiden sich'); fail = true; }
fs.mkdirSync(path.join(root, 'tests', 'results'), { recursive: true });
fs.writeFileSync(path.join(root, 'tests', 'results', 'build-check.json'), JSON.stringify({ ok: !fail, before, first, second }, null, 1));
console.log(fail ? 'Build nicht reproduzierbar oder nicht aktuell – node tools/build.js ausführen und committen' : 'Build reproduzierbar und aktuell');
process.exit(fail ? 1 : 0);
