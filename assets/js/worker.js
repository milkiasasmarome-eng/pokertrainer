/* PokerTrainer 2.1 – Web Worker für Coach-Analysen und Importprüfung (hält die Oberfläche bedienbar). */
/* global importScripts, self */
(function () {
'use strict';
if (typeof importScripts === 'function' && !self.PT) {
  var v = '?v=2.1.0';
  importScripts('engine/core.js' + v, 'engine/evaluator.js' + v, 'engine/preflop-data.js' + v, 'engine/rules.js' + v, 'engine/ranges.js' + v, 'engine/equity.js' + v,
    'engine/stats.js' + v, 'engine/bots.js' + v, 'engine/session.js' + v, 'engine/ev.js' + v, 'engine/cfr.js' + v, 'engine/coach.js' + v, 'engine/training.js' + v, 'engine/export.js' + v);
}
self.onmessage = function (e) {
  var m = e.data || {};
  try {
    if (m.kind === 'analyze') self.postMessage({ id: m.id, ok: true, result: self.PT.coach.analyze(m.input) });
    // Prüfung einer Importdatei (Datenbank, Sicherung, Rohsicherung) ohne Blockade der Oberfläche
    else if (m.kind === 'import') self.postMessage({ id: m.id, ok: true, result: self.PT.dataport.parseImport(m.input && m.input.text) });
    else self.postMessage({ id: m.id, ok: false, error: 'unbekannter Auftrag' });
  } catch (err) {
    self.postMessage({ id: m.id, ok: false, error: String(err && err.message || err) });
  }
};
})();
