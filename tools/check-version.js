/* Prüft, dass Website (index.html), Web Worker, PWA (sw.js), Offline-Datei (dist/), Manifest, CHANGELOG und Dokumentation
   denselben Versionsstand haben. Aufruf: node tools/check-version.js   (Rückgabewert 1 bei Abweichungen)
   Als Modul: require('./tools/check-version.js').check(root) → { ok, version, results: [{ name, ok, detail }] } */
'use strict';
const fs = require('fs'), path = require('path');

function check(root) {
  root = root || path.join(__dirname, '..');
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  const results = [];
  const ok = (name, cond, detail) => { results.push({ name, ok: !!cond, detail: detail || '' }); };
  const core = read('assets/js/engine/core.js');
  const V = (core.match(/PT\.VERSION = '([^']+)'/) || [])[1], BUILD = (core.match(/PT\.BUILD = '([^']+)'/) || [])[1];
  ok('PT.VERSION in core.js', /^\d+\.\d+\.\d+$/.test(V || ''), V);
  const MM = V.split('.').slice(0, 2).join('.');
  // Website
  const index = read('index.html');
  const vs = [...index.matchAll(/\?v=([^"']+)["']/g)].map(m => m[1]);
  ok('index.html: alle ?v= = ' + V, vs.length >= 10 && vs.every(x => x === V), [...new Set(vs)].join(', ') + ' (' + vs.length + ' Verweise)');
  ok('index.html: Fußzeile', index.includes('<span id="verText">' + V + '</span>'));
  ok('index.html: Titel und Kopf ' + MM, index.includes('<title>PokerTrainer ' + MM) && index.includes('<span class="ver">' + MM + '</span>'));
  // Worker
  const worker = read('assets/js/worker.js');
  ok('worker.js: ?v=' + V, worker.includes("var v = '?v=" + V + "'"));
  // PWA
  const sw = read('sw.js');
  ok('sw.js: VERSION', sw.includes("var VERSION = '" + V + "'") && sw.includes("CACHE = 'pokertrainer-' + VERSION + '-"));
  const swAssets = JSON.parse((sw.match(/var ASSETS = (\[[\s\S]*?\]);/) || [])[1] || '[]');
  const idxScripts = [...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  ok('sw.js: alle Skripte der Website im Cache', idxScripts.every(s => swAssets.includes(s)) && swAssets.filter(a => /\?v=/.test(a)).every(a => a.endsWith('?v=' + V)), idxScripts.filter(s => !swAssets.includes(s)).join(', '));
  ok('sw.js: alle Cache-Dateien vorhanden', swAssets.filter(a => a !== './').every(a => fs.existsSync(path.join(root, a.replace(/\?.*$/, '')))));
  // Offline-Datei
  const distName = 'dist/PokerTrainer_' + MM + '.html', distOk = fs.existsSync(path.join(root, distName));
  ok('Offline-Datei vorhanden: ' + distName, distOk);
  if (distOk) {
    const dist = read(distName);
    ok('Offline-Datei: PT.VERSION ' + V, dist.includes("PT.VERSION = '" + V + "'") && dist.includes('<span id="verText">' + V + '</span>'));
    ok('Offline-Datei: Startüberwachung und Worker eingebettet', /PTRecovery/.test(dist) && /id="pt-worker"/.test(dist) && !/src="assets\//.test(dist));
    ok('Offline-Datei: CSP ohne Netzwerk', /connect-src 'none'/.test(dist) && /default-src 'none'/.test(dist));
  }
  const others = fs.readdirSync(path.join(root, 'dist')).filter(f => f !== path.basename(distName));
  ok('dist/: keine veralteten Offline-Dateien', others.length === 0, others.join(', '));
  // Manifest
  const man = JSON.parse(read('manifest.webmanifest'));
  ok('Manifest: Name mit ' + MM, String(man.name).includes('PokerTrainer ' + MM));
  // CHANGELOG: erste versionierte Überschrift (ein Abschnitt „Unveröffentlicht“ darüber ist erlaubt)
  const cl = read('CHANGELOG.md'), top = cl.match(/^## \[(\d+\.\d+\.\d+)\] – (\d{4}-\d{2}-\d{2})/m);
  ok('CHANGELOG: oberste Version = ' + V, top && top[1] === V, top ? top[1] : 'keine Version gefunden');
  ok('CHANGELOG: Datum = PT.BUILD ' + BUILD, top && top[2] === BUILD, top ? top[2] : '');
  // Dokumentation
  const readme = read('README.md');
  ok('README: Offline-Datei ' + distName, readme.includes(distName) && readme.includes('# PokerTrainer ' + MM));
  ok('ARCHITEKTUR: Offline-Datei ' + distName, read('docs/ARCHITEKTUR.md').includes(distName));
  return { ok: results.every(r => r.ok), version: V, build: BUILD, results };
}
module.exports = { check };
if (require.main === module) {
  const r = check();
  r.results.forEach(x => console.log((x.ok ? 'OK     ' : 'FEHLER ') + x.name + (x.detail && !x.ok ? ' – ' + x.detail : '')));
  console.log(r.ok ? 'Versionsstand einheitlich: ' + r.version : 'Versionsstand NICHT einheitlich');
  process.exit(r.ok ? 0 : 1);
}
