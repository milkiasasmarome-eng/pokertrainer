/* Versionsgleichheit (Abschnitt 16): Website, Worker, PWA (sw.js), Offline-Datei, Manifest, CHANGELOG und Doku haben denselben Stand. */
'use strict';
module.exports = function (T) {
  T.test('Version: Website, PWA, Offline-Datei, CHANGELOG und Dokumentation einheitlich (tools/check-version.js)', () => {
    const r = require('../../tools/check-version.js').check();
    r.results.forEach(x => T.ok(x.ok, x.name + (x.detail ? ' – ' + x.detail : '')));
  });
};
