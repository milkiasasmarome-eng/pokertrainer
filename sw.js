/* PokerTrainer 2.0.1 – Service Worker (automatisch erzeugt mit tools/build.js). Offline-Betrieb, Cache je Inhaltsstand, kontrollierte Aktualisierung. */
'use strict';
var VERSION = '2.0.1', CACHE = 'pokertrainer-' + VERSION + '-f8366afcec3d';
var ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/css/app.css?v=2.0.1",
  "assets/js/worker.js?v=2.0.1",
  "assets/js/recovery.js?v=2.0.1",
  "assets/js/engine/core.js?v=2.0.1",
  "assets/js/engine/evaluator.js?v=2.0.1",
  "assets/js/engine/preflop-data.js?v=2.0.1",
  "assets/js/engine/rules.js?v=2.0.1",
  "assets/js/engine/ranges.js?v=2.0.1",
  "assets/js/engine/equity.js?v=2.0.1",
  "assets/js/engine/stats.js?v=2.0.1",
  "assets/js/engine/bots.js?v=2.0.1",
  "assets/js/engine/session.js?v=2.0.1",
  "assets/js/engine/ev.js?v=2.0.1",
  "assets/js/engine/cfr.js?v=2.0.1",
  "assets/js/engine/coach.js?v=2.0.1",
  "assets/js/engine/training.js?v=2.0.1",
  "assets/js/engine/export.js?v=2.0.1",
  "assets/js/engine/speech.js?v=2.0.1",
  "assets/js/ui/store.js?v=2.0.1",
  "assets/js/ui/app.js?v=2.0.1",
  "assets/js/ui/views.js?v=2.0.1",
  "assets/icons/favicon.svg",
  "assets/icons/favicon-32.png",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png"
];
self.addEventListener('install', function (e) {
  // cache: 'reload' umgeht den HTTP-Cache, damit ein neuer Stand wirklich frisch geladen wird
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS.map(function (u) { return new Request(u, { cache: 'reload' }); })); }));
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
    // Nur die App selbst (Startseite des Bereichs) kommt aus dem Cache; andere Seiten (README, Einzeldatei, 404) direkt aus dem Netz
    var scope = new URL(self.registration.scope).pathname, p = new URL(req.url).pathname;
    if (p !== scope && p !== scope + 'index.html') return;
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
