/* Regressionstests zur unabhängigen Prüfung 2.1 (Prüfer C: Architektur, Performance, Sicherheit, Datenbank).
   Befunde und Begründungen: docs/audit-2.1/PRUEFUNG_C_D.md. Browser-Regressionen: tests/e2e/pruefung-cd.js */
'use strict';
const fs = require('fs'), path = require('path');
module.exports = function (T) {
  const { PT, test, ok, eq } = T;
  const ROOT = path.join(__dirname, '..', '..');
  function rec(id, name) { const r = PT.stats.newRecord(id, name); r.hands = 5; r.lastSeen = 1700000000000; r.firstSeen = 1700000000000; return r; }
  function dbFile(recs) { const body = JSON.stringify(recs); return '{"format":"PokerTrainer-DB","version":3,"app":"x","exported":"","halfLife":' + PT.stats.MEMORY.HALF_LIFE + ',"count":' + recs.length + ',"checksum":"' + PT.util.fnv1a(body) + '","opponents":' + body + '}'; }

  test('Prüfung C1: Zahlenüberlauf (1e999 → Infinity) wird beim Import abgelehnt, Export→Import bleibt verlustfrei', () => {
    const good = dbFile([rec('g001', 'Anton')]);
    eq(PT.dataport.parseImport(good).ok, true, 'gültige Datei angenommen');
    // Prüfsumme wird nach dem Parsen über JSON.stringify gebildet (Infinity → null): manipulierte Datei mit passender Prüfsumme
    const o = JSON.parse(good); o.opponents[0].lastSeen = 'INF';
    o.checksum = PT.util.fnv1a(JSON.stringify(JSON.parse(JSON.stringify(o.opponents).replace(/"INF"/g, '1e999'))));
    const evil = JSON.stringify(o).replace(/"INF"/g, '1e999');
    ok(PT.stats.dbImport(evil).ok, 'Ausgangslage: die reine Formatprüfung nimmt die Datei an');
    const r = PT.dataport.parseImport(evil);
    ok(!r.ok && /ungültige Zahlen/.test(r.error), 'abgelehnt: ' + r.error);
    // Sicherung mit Lerndaten (decisions[].ts = 1e999)
    const L = PT.training.newLearning();
    L.decisions.push({ ts: 1, s: 50, l: 0, st: 0, p: 'BTN', t: [], c: [], o: null, tr: null, g: PT.coach.GRADES[0], se: 0 });
    const bk = JSON.parse(PT.stats.backupExport({ opponents: [rec('g001', 'Anton')], hero: null, hands: [], learning: L, settings: null, table: null }, 'x'));
    bk.payload.learning.decisions[0].ts = 'INF';
    bk.checksum = PT.util.fnv1a(JSON.stringify(JSON.parse(JSON.stringify(bk.payload).replace(/"INF"/g, '1e999'))));
    const r2 = PT.dataport.parseImport(JSON.stringify(bk).replace(/"INF"/g, '1e999'));
    ok(!r2.ok && /ungültige Zahlen/.test(r2.error), 'Sicherung mit Infinity in Lerndaten abgelehnt: ' + r2.error);
    ok(PT.dataport.allFinite({ a: [1, 2, { b: 3 }] }) && !PT.dataport.allFinite({ a: [1, { b: -Infinity }] }) && !PT.dataport.allFinite([NaN]), 'Hilfsprüfung allFinite');
  });

  test('Prüfung C4: Gegner-ID „__proto__“ wird abgelehnt (vorher gezählt, aber verschwunden), kein Prototyp verändert', () => {
    const a = rec('g001', 'Anton'), p = JSON.parse(JSON.stringify(a)); p.id = '__proto__'; p.name = 'Proto';
    const r = PT.dataport.parseImport(dbFile([a, p]));
    ok(!r.ok && /Gegner-ID/.test(r.error), 'abgelehnt: ' + (r.error || 'angenommen'));
    ok(({}).name === undefined && ({}).stats === undefined, 'Object.prototype unverändert');
    const r2 = PT.dataport.parseImport(dbFile([a, rec('constructor', 'Kon')]));
    ok(r2.ok && Object.keys(r2.db.opps).length === 2, 'ID „constructor“ ist ein normaler eigener Schlüssel und bleibt erhalten');
  });
};
