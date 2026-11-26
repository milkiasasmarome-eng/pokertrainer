/* PokerTrainer 2.0 – Web Worker für Coach-Analysen (hält die Oberfläche bedienbar). */
/* global importScripts, self */
(function () {
'use strict';
if (typeof importScripts === 'function' && !self.PT) {
  var v = '?v=2.1.0';
  importScripts('engine/core.js' + v, 'engine/evaluator.js' + v, 'engine/preflop-data.js' + v, 'engine/rules.js' + v, 'engine/ranges.js' + v, 'engine/equity.js' + v,
    'engine/stats.js' + v, 'engine/bots.js' + v, 'engine/session.js' + v, 'engine/ev.js' + v, 'engine/cfr.js' + v, 'engine/coach.js' + v, 'engine/training.js' + v);
}
self.onmessage = function (e) {
  var m = e.data || {};
  try {
    if (m.kind === 'analyze') self.postMessage({ id: m.id, ok: true, result: self.PT.coach.analyze(m.input) });
    else self.postMessage({ id: m.id, ok: false, error: 'unbekannter Auftrag' });
  } catch (err) {
    self.postMessage({ id: m.id, ok: false, error: String(err && err.message || err) });
  }
};
})();
