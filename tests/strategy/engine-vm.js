/* Vergleichsrahmen: lädt eine Engine-Version (Ordner mit assets/js/engine) in einen eigenen vm-Kontext.
   So laufen Coach 2.0.1 und 2.1 im selben Prozess, ohne sich den globalen Namensraum PT zu teilen.
   Die Uhr im Kontext steht fest: Zeitbremsen (Deadlines) greifen nicht, Ergebnisse hängen nicht von der Rechnerlast ab.
   Die gemessene Rechenzeit (außerhalb des Kontexts) liegt weit unter den Bremsen, siehe docs/STRATEGIE.md. */
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const MODULES = ['core', 'evaluator', 'preflop-data', 'rules', 'ranges', 'equity', 'stats', 'bots', 'session', 'ev', 'cfr', 'coach'];
const SRC = new Map();
function source(root, m) {
  const f = path.join(root, 'assets', 'js', 'engine', m + '.js'), k = f;
  if (!SRC.has(k)) SRC.set(k, fs.existsSync(f) ? new vm.Script(fs.readFileSync(f, 'utf8'), { filename: f }) : null);
  return SRC.get(k);
}
/** Neue, unabhängige Engine-Instanz (eigene Caches). root: Wurzel eines Arbeitsbaums. */
function loadEngine(root, opts) {
  opts = opts || {};
  const sandbox = { console, Buffer, atob: (s) => Buffer.from(s, 'base64').toString('binary'), Math, Date,
    performance: { now: opts.realClock ? () => performance.now() : () => 0 } };
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);
  MODULES.forEach(m => { const s = source(root, m); if (s) s.runInContext(ctx); });
  const PT = sandbox.PT;
  if (!PT || !PT.coach) throw new Error('Engine unvollständig: ' + root);
  PT.__root = root;
  return PT;
}
module.exports = { loadEngine, MODULES };
