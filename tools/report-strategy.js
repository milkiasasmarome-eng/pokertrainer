/* Bericht zum strategischen Vergleich: erzeugt Tabellen und Kennzahlen ausschließlich aus tests/results/strategy.json.
   Alle Aussagen (Anzahl Läufe, in denen ein Held vorn lag, Urteil „belegt“/„nicht belegt“) werden aus den Daten berechnet,
   damit Fließtext und Tabellen nicht auseinanderlaufen können. Mehrfach verwendete Läufe (z. B. derselbe Bot-Lauf als Basis
   für mehrere Coach-Vergleiche) werden gekennzeichnet; sie sind dort keine unabhängigen Stichproben.
   Verwendung: require('./report-strategy.js').lines(data) → Markdown-Zeilen; node tools/report-strategy.js schreibt den
   automatisch erzeugten Block in docs/STRATEGIE.md (zwischen den Markierungen AUTO-STRATEGIE). */
'use strict';
const fs = require('fs'), path = require('path');
const de = (x, d) => x == null || !isFinite(x) ? '–' : Number(x).toFixed(d == null ? 1 : d).replace('-', '−').replace('.', ',');
const n0 = x => x == null ? '–' : Number(x).toLocaleString('de-DE');
const ci = r => '[' + de(r.lo) + '; ' + de(r.hi) + ']';
function verdictText(c) { return c.adj.blocks != null && c.adj.blocks < 20 ? 'zu wenig Blöcke für ein Intervall' : c.adj.lo > 0 ? '**belegt besser**' : c.adj.hi < 0 ? '**belegt schlechter**' : 'nicht belegt (Intervall enthält 0)'; }
function lines(d) {
  const L = [];
  if (!d || !d.comparisons) { L.push('**Strategischer Vergleich nicht ausgeführt** (keine Datei tests/results/strategy.json mit Vergleichen).', ''); return L; }
  const T = d.totals || {};
  L.push('Erzeugt aus `tests/results/strategy.json` (Plan „' + d.plan + '“, ' + d.date + ', Node ' + d.node + ', ' + d.cpus + ' Kerne). ' +
    n0(T.runs) + ' Läufe, ' + n0(T.hands) + ' Hände, ' + n0(T.coachDecisions) + ' Coach-Entscheidungen, davon von den Regeln abgelehnt: **' + n0(T.invalidCoach) + '**. Rechenzeit ' + n0(T.cpuSeconds) + ' s (Summe der Läufe).', '');
  L.push('Methode: ' + d.method.primary + '. 95-%-Intervalle per Block-Bootstrap (Blöcke von ' + d.method.bootstrap.blockHands + ' aufeinanderfolgenden Händen, ' + d.method.bootstrap.reps + ' Wiederholungen, geschichtet ' + d.method.bootstrap.stratified + '). ' +
    'Urteil: ' + d.method.verdict + '. ' + d.method.stacks + '. Zufallsströme: ' + d.method.streams + '. Versionen: 2.1 (' + d.versions.v21.coachHash + '), 2.0.1 (' + d.versions.v201.coachHash + '), Umgebung ' + d.versions.envHash + '.', '');
  const main = d.comparisons.filter(c => c.id === 'v21-v201')[0];
  if (main) {
    const nRuns = main.runsA.length;
    L.push('### Hauptvergleich: Coach 2.1 − Coach 2.0.1', '',
      'Differenz **' + de(main.adj.diff) + ' BB/100** ' + ci(main.adj) + ' über ' + n0(main.adj.hands) + ' gepaarte Hände (roh, ohne All-in-Bereinigung: ' + de(main.raw.diff) + ' ' + ci(main.raw) + '). Urteil: ' + verdictText(main) + '. ' +
      'In ' + main.aAhead + ' von ' + nRuns + ' gepaarten Läufen lag 2.1 vorn, in ' + (nRuns - main.aAhead) + ' 2.0.1 (Einzelläufe streuen stark; maßgeblich ist das Intervall). ' +
      'Entscheidungen: 2.1 ' + n0(main.decisionsA) + ', 2.0.1 ' + n0(main.decisionsB) + '; abgelehnte Empfehlungen 2.1 ' + main.invalidA + ', 2.0.1 ' + main.invalidB + '.', '');
    ['stack', 'comp'].forEach(k => {
      if (!main.split[k]) return;
      L.push('| ' + (k === 'stack' ? 'Stacktiefe' : 'Zusammensetzung') + ' | Differenz BB/100 (bereinigt) | 95-%-Intervall | roh | Hände | 2.1 vorn | Urteil |', '|---|---:|---|---:|---:|---:|---|');
      main.split[k].forEach(r => L.push('| ' + r.value + ' | ' + de(r.diff) + ' | ' + ci(r) + ' | ' + de(r.rawDiff) + ' | ' + n0(r.hands) + ' | ' + r.aAhead + '/' + r.pairs + ' | ' + (r.lo > 0 ? 'besser' : r.hi < 0 ? '**schlechter**' : 'offen') + ' |'));
      L.push('');
    });
    const worse = [].concat(main.split.stack || [], main.split.comp || [], main.split.cond || []).filter(r => r.hi < 0);
    L.push(worse.length ? '**Verschlechterung belegt** in: ' + worse.map(r => r.value).join(', ') + '.' : 'In keiner Teilgruppe (Stacktiefe, Zusammensetzung, Bedingung) liegt das Intervall ganz unter 0.', '');
  }
  L.push('### Alle Vergleiche', '', '| Vergleich | Differenz BB/100 (bereinigt) | 95-%-Intervall | roh | Hände | A vorn | Urteil | geteilte Läufe |', '|---|---:|---|---:|---:|---:|---|---|');
  d.comparisons.forEach(c => L.push('| ' + c.title + ' | ' + de(c.adj.diff) + ' | ' + ci(c.adj) + ' | ' + de(c.raw.diff) + ' | ' + n0(c.adj.hands) + ' | ' + c.aAhead + '/' + c.runsA.length + ' | ' + verdictText(c).replace(/\*/g, '') + ' | ' +
    (c.sharedRuns.length ? c.sharedRuns.length + ' Läufe auch in: ' + c.sharedWith.join(', ') : '–') + ' |'));
  L.push('', 'Läufe, die in mehreren Vergleichen vorkommen (z. B. ein Lauf der Gegner-KI als Held, der für 2.1 und 2.0.1 als Basis dient), sind dort **keine unabhängigen Stichproben**: Die Intervalle der betroffenen Vergleiche sind einzeln gültig, ihre Differenzen untereinander aber korreliert.', '');
  const unk = d.comparisons.filter(c => c.id === 'v21-v201-unbekannt')[0];
  if (unk && unk.split.comp) {
    L.push('#### Gegen dem Coach unbekannte Strategien (2.1 − 2.0.1)', '', '| Gegnerstrategie | Differenz BB/100 | 95-%-Intervall | Hände | Urteil |', '|---|---:|---|---:|---|');
    unk.split.comp.forEach(r => L.push('| ' + r.value + ' | ' + de(r.diff) + ' | ' + ci(r) + ' | ' + n0(r.hands) + ' | ' + (r.lo > 0 ? 'besser' : r.hi < 0 ? '**schlechter**' : 'offen') + ' |'));
    L.push('');
  }
  L.push('### Absolute Ergebnisse je Held und Bedingung', '', '| Gruppe | Held | Bedingung | BB/100 (bereinigt) | 95-%-Intervall | roh | Hände | Entscheidungen | abgelehnt |', '|---|---|---|---:|---|---:|---:|---:|---:|');
  d.absolute.forEach(a => L.push('| ' + a.group + ' | ' + a.heroName + ' | ' + a.condName + ' | ' + de(a.adj.bb100) + ' | ' + ci(a.adj) + ' | ' + de(a.raw.bb100) + ' | ' + n0(a.adj.hands) + ' | ' + n0(a.decisions) + ' | ' + a.invalid + ' |'));
  L.push('');
  // Größenverteilung und Rechenzeit der Coach-Läufe
  const agg = hero => { const o = { labels: {}, n: 0, ms: 0, maxMs: 0, maxIt: 0, dec: 0, chart: 0 }; d.runs.filter(r => r.hero === hero).forEach(r => { Object.keys(r.labels || {}).forEach(k => { o.labels[k] = (o.labels[k] || 0) + r.labels[k]; }); o.ms += (r.avgMs || 0) * r.decisions; o.dec += r.decisions; o.maxMs = Math.max(o.maxMs, r.maxMs); o.maxIt = Math.max(o.maxIt, r.maxIters || 0); o.chart += r.chartApplied || 0; }); return o; };
  const A = agg('coach21'), B = agg('coach201');
  if (A.dec && B.dec) {
    const keys = ['⅓', '½', '¾', 'Pot', 'Overbet', 'All-in'];
    L.push('### Empfohlene Einsatzgrößen postflop (Bet ohne offenen Einsatz)', '', '| Version | ' + keys.join(' | ') + ' | Check | Call | Fold |', '|---|' + keys.map(() => '---:').join('|') + '|---:|---:|---:|');
    [['2.1', A], ['2.0.1', B]].forEach(([nm, o]) => L.push('| ' + nm + ' | ' + keys.map(k => n0(o.labels[k] || 0)).join(' | ') + ' | ' + n0(o.labels.check || 0) + ' | ' + n0(o.labels.call || 0) + ' | ' + n0(o.labels.fold || 0) + ' |'));
    L.push('', 'Rechenzeit je Entscheidung (Node, ohne Zeitbremse): 2.1 Ø ' + de(A.ms / A.dec) + ' ms, höchstens ' + n0(A.maxMs) + ' ms; 2.0.1 Ø ' + de(B.ms / B.dec) + ' ms, höchstens ' + n0(B.maxMs) + ' ms. Höchstzahl Simulationen je Entscheidung: 2.1 ' + n0(A.maxIt) + ', 2.0.1 ' + n0(B.maxIt) + ' (Grenze 5.000).', '');
  }
  return L;
}
function sizingLines(d) {
  const L = [], S = d && d.sizing ? d.sizing : null;
  if (!S) return L;
  Object.keys(S).sort().forEach(k => {
    const s = S[k];
    L.push('#### Größenstudie „' + k + '“ (' + n0(s.spots) + ' Spots, davon ' + n0(s.betSpots) + ' ohne offenen Einsatz)', '', '| Größe | Beobachtungen | Fold beobachtet | Fold Modell | Raise beobachtet | Raise Modell |', '|---|---:|---:|---:|---:|---:|');
    s.calibration.bySize.forEach(r => L.push('| ' + r.key + ' Pot | ' + n0(r.n) + ' | ' + de(100 * r.obsFold, 0) + ' % | ' + de(100 * r.predFold, 0) + ' % | ' + de(100 * r.obsRaise, 0) + ' % | ' + de(100 * r.predRaise, 0) + ' % |'));
    L.push('', '| Strategie über dieselben Spots | Wert gegen „immer Check“ (BB je Spot) | Standardfehler |', '|---|---:|---:|');
    s.policies.all.rows.forEach(r => L.push('| ' + r.policy + ' | ' + de(r.vsCheck, 2) + ' | ' + de(r.se, 2) + ' |'));
    L.push('');
  });
  return L;
}
function cfrLines(d) {
  const L = [], c = d && d.cfr ? d.cfr.summary : null;
  if (!c) return L;
  L.push('#### River-Modellspiel (' + c.spots + ' Spots aus Simulationen)', '', '| Stärkegruppen | Exploitability im Kombinationsspiel Ø | max. | Rechenzeit Ø |', '|---:|---:|---:|---:|');
  Object.keys(c.buckets).forEach(B => L.push('| ' + B + ' | ' + de(100 * c.buckets[B].comboExplMean, 2) + ' % Pot | ' + de(100 * c.buckets[B].comboExplMax, 2) + ' % | ' + de(c.buckets[B].msMean, 0) + ' ms |'));
  L.push('', '| Stärkegruppen | Lösung ohne Raises im Spiel mit Raises Ø (max.) | Lösung mit Raises Ø (max.) | Rechenzeit mit Raises |', '|---:|---:|---:|---:|');
  Object.keys(c.raise).forEach(B => L.push('| ' + B + ' | ' + de(100 * c.raise[B].noRaiseInRaiseGameMean, 2) + ' % (' + de(100 * c.raise[B].noRaiseInRaiseGameMax, 2) + ' %) | ' + de(100 * c.raise[B].raiseInRaiseGameMean, 2) + ' % (' + de(100 * c.raise[B].raiseInRaiseGameMax, 2) + ' %) | ' + de(c.raise[B].msMean, 0) + ' ms |'));
  L.push('', 'Konvergenz (10 Gruppen, mit Raises, Exploitability im Modellspiel): ' + Object.keys(c.convergence).map(it => it + ' Iterationen ' + de(100 * c.convergence[it], 3) + ' %').join(', ') + '.', '');
  return L;
}
function all(d) { return lines(d).concat(sizingLines(d), cfrLines(d)); }
if (require.main === module) {
  const root = path.join(__dirname, '..'), file = path.join(root, 'docs', 'STRATEGIE.md');
  let data = null; try { data = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'results', 'strategy.json'), 'utf8')); } catch (e) { /* fehlt */ }
  const block = '<!-- AUTO-STRATEGIE-START (erzeugt mit node tools/report-strategy.js, nicht von Hand bearbeiten) -->\n' + all(data).join('\n') + '\n<!-- AUTO-STRATEGIE-ENDE -->';
  let doc = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '# Strategie\n\n' + block + '\n';
  doc = /<!-- AUTO-STRATEGIE-START[\s\S]*?AUTO-STRATEGIE-ENDE -->/.test(doc) ? doc.replace(/<!-- AUTO-STRATEGIE-START[\s\S]*?AUTO-STRATEGIE-ENDE -->/, () => block) : doc + '\n' + block + '\n';
  fs.writeFileSync(file, doc);
  console.log('docs/STRATEGIE.md: automatischer Block aktualisiert');
}
module.exports = { lines, sizingLines, cfrLines, all };
