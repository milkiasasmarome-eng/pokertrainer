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

  test('Prüfung C14: Importgrenze deckt die größte eigene Sicherung (3.000 Hände) ab; Oberfläche nutzt dieselbe Grenze', () => {
    const hs = require('../app-sim.js')(PT, 12, 4242), mean = hs.reduce((a, h) => a + JSON.stringify(h).length, 0) / hs.length;
    const need = 3000 * mean + 2 * 1048576;
    ok(PT.stats.MAX_IMPORT >= need, 'Grenze ' + Math.round(PT.stats.MAX_IMPORT / 1048576) + ' MB ≥ 3.000 × ' + Math.round(mean / 1024) + ' KB = ' + Math.round(need / 1048576) + ' MB');
    const v = fs.readFileSync(path.join(ROOT, 'assets/js/ui/views.js'), 'utf8');
    ok(/MAX_FILE = PT\.stats\.MAX_IMPORT/.test(v) && /backupNow\('vor-Import', true\)/.test(v) && /backupNow\('vor-Loeschen', true\)/.test(v), 'Dateigrenze = Importgrenze; Sicherung vor Ersetzen/Löschen bricht bei Überschreitung ab');
    // Datei knapp über der alten Grenze (60 MB) wird nicht mehr wegen der Größe abgelehnt
    const r = PT.dataport.parseImport('{' + ' '.repeat(61 * 1048576) + '}');
    ok(!r.ok && !/zu groß/.test(r.error), '61 MB: Formatprüfung statt Größenablehnung (' + r.error + ')');
  });

  test('Prüfung C2: Archivfassung 2.0.1 (gleiche IndexedDB) wird nicht im selben Ursprung veröffentlicht', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/pages.yml'), 'utf8');
    const cp = yml.split('\n').filter(l => /^\s*cp -r .*_site\/\s*$/.test(l));
    ok(cp.length >= 1 && cp.every(l => !/\barchiv\b/.test(l)), 'Kopierliste ohne archiv/: ' + cp.map(l => l.trim()).join(' | '));
    const arch = fs.readFileSync(path.join(ROOT, 'archiv/PokerTrainer_2.0.1.html'), 'utf8');
    ok(/'pokertrainer2'/.test(arch), 'Begründung weiterhin gültig: Archiv nutzt die IndexedDB „pokertrainer2“ (Datei unverändert)');
  });

  test('Prüfung C6: Trainingskategorie „constructor“ (aus Object.prototype) erzeugt keine Ausnahme', () => {
    ok(!PT.training.hasScen('constructor') && !PT.training.hasScen('__proto__') && !PT.training.hasScen(5) && PT.training.hasScen('preflop-open'), 'hasScen prüft nur eigene Kategorien');
    let g = null, err = null;
    try { g = PT.training.generate('constructor', 1, { difficulty: 'gemischt', ts: 1 }); } catch (e) { err = e; }
    ok(!err && g && g.hand, 'generate fällt auf eine bekannte Kategorie zurück' + (err ? ': ' + err.message : ''));
    const src = fs.readFileSync(path.join(ROOT, 'assets/js/ui/views.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'assets/js/ui/app.js'), 'utf8');
    ok(!/SCEN\[x\.cat\]\s*\?/.test(src) && /hasScen\(cat\)/.test(src), 'Oberfläche nutzt die Prüfung (Wiederholung und Trainingsstart)');
  });
};
