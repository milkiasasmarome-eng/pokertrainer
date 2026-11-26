/* Build: erzeugt sw.js (versionierte Cache-Liste) und die portable Einzeldatei dist/PokerTrainer_2.0.html.
   Website und Einzeldatei nutzen dieselben Quelldateien. */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const PT = require('../tests/load.js').load(['core']);
const VERSION = PT.VERSION;
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const index = read('index.html');
const scripts = [...index.matchAll(/<script src="([^"?]+)\?v=[^"]*"><\/script>/g)].map(m => m[1]);
const engine = scripts.filter(s => s.includes('/engine/')), ui = scripts.filter(s => s.includes('/ui/'));
// 1) Versionsnummern in index.html und worker.js prüfen
if (!index.includes('?v=' + VERSION)) throw new Error('index.html: Version passt nicht zu PT.VERSION ' + VERSION);
// 2) Service Worker
const assets = ['./', 'index.html', 'manifest.webmanifest', 'assets/css/app.css?v=' + VERSION, 'assets/js/worker.js?v=' + VERSION]
  .concat(scripts.map(s => s + '?v=' + VERSION))
  .concat(['assets/icons/favicon.svg', 'assets/icons/favicon-32.png', 'assets/icons/apple-touch-icon.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png']);
const sw = `/* PokerTrainer ${VERSION} – Service Worker (automatisch erzeugt mit tools/build.js). Offline-Betrieb, versionierter Cache, kontrollierte Aktualisierung. */
'use strict';
var VERSION = '${VERSION}', CACHE = 'pokertrainer-' + VERSION;
var ASSETS = ${JSON.stringify(assets, null, 2)};
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('pokertrainer-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('message', function (e) { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match('index.html').then(function (hit) {
        return hit || fetch(req).catch(function () { return c.match('./'); });
      });
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') c.put(req, res.clone());
        return res;
      });
    });
  }));
});
`;
fs.writeFileSync(path.join(root, 'sw.js'), sw);
// 3) Einzeldatei
const css = read('assets/css/app.css');
const engineSrc = engine.map(f => '/* ' + f + ' */\n' + read(f)).join('\n');
const workerSrc = read('assets/js/worker.js');
const uiSrc = ui.map(f => '/* ' + f + ' */\n' + read(f)).join('\n');
const favicon = 'data:image/svg+xml;base64,' + Buffer.from(read('assets/icons/favicon.svg')).toString('base64');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
let single = index
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\' blob:; style-src \'unsafe-inline\'; img-src data:; worker-src blob:; connect-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">')
  .replace(/<link rel="manifest"[^>]*>\n/, '')
  .replace(/<link rel="icon"[^>]*>\n/g, '').replace(/<link rel="apple-touch-icon"[^>]*>\n/, '')
  .replace(/<meta property="og:[^>]*>\n/g, '').replace(/<meta name="twitter:[^>]*>\n/g, '')
  .replace('<link rel="stylesheet" href="assets/css/app.css?v=' + VERSION + '">', '<link rel="icon" href="' + favicon + '">\n<style>\n' + css + '\n</style>')
  .replace('<img src="assets/icons/favicon.svg"', '<img src="' + favicon + '"')
  .replace(/<!--ENGINE-->[\s\S]*<!--\/ENGINE-->/, () => '<script>window.PT_INLINE = true;</script>\n<script id="pt-engine">\n' + esc(engineSrc) + '\n</script>\n<script id="pt-worker" type="text/plain">\n' + esc(workerSrc) + '\n</script>')
  .replace(/<!--UI-->[\s\S]*<!--\/UI-->/, () => '<script>\n' + esc(uiSrc) + '\n</script>')
  .replace('<title>PokerTrainer 2.0', '<title>PokerTrainer 2.0 (Offline-Datei)');
if (/src="assets\//.test(single) || /href="assets\//.test(single)) throw new Error('Einzeldatei verweist noch auf externe Dateien');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'PokerTrainer_' + VERSION.replace(/\.0$/, '') + '.html'), single);
console.log('Build ' + VERSION + ': sw.js (' + assets.length + ' Dateien), dist/PokerTrainer_' + VERSION.replace(/\.0$/, '') + '.html (' + Math.round(single.length / 1024) + ' KB)');
