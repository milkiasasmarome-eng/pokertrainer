/* Lädt die Engine-Module in Node in derselben Reihenfolge wie im Browser. */
'use strict';
const path = require('path');
const MODULES = ['core', 'evaluator', 'preflop-data', 'rules', 'ranges', 'equity', 'stats', 'bots', 'session', 'ev', 'cfr', 'coach', 'training', 'export', 'speech'];
function load(list) {
  const fs = require('fs');
  (list || MODULES).forEach(function (m) {
    const f = path.join(__dirname, '..', 'assets', 'js', 'engine', m + '.js');
    if (fs.existsSync(f)) require(f);
  });
  return globalThis.PT;
}
module.exports = { load, MODULES };
