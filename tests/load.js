/* Lädt die Engine-Module in Node in derselben Reihenfolge wie im Browser. */
'use strict';
const path = require('path');
const MODULES = ['core', 'evaluator', 'preflop-data', 'rules', 'ranges', 'equity', 'stats', 'bots', 'session', 'ev', 'cfr', 'coach', 'training', 'export', 'speech'];
function load(list) {
  const fs = require('fs');
  // PT_ENV_ROOT: Umgebung (Regeln, Gegner-KI, Tisch) aus einem anderen Arbeitsbaum laden, z. B. die unveränderte Gegner-KI 2.1 (Vergleiche)
  const root = process.env.PT_ENV_ROOT || path.join(__dirname, '..');
  (list || MODULES).forEach(function (m) {
    const f = path.join(root, 'assets', 'js', 'engine', m + '.js');
    if (fs.existsSync(f)) require(f);
  });
  return globalThis.PT;
}
module.exports = { load, MODULES };
