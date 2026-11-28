/* 2.2 (Prüfer E, E-1): Syntaxprüfung aller ausgelieferten Skripte und der eingebetteten Skripte der Offline-Datei.
   Ein Syntaxfehler in assets/js/ui/views.js blieb in 2.2 zunächst unbemerkt, weil kein Node-Test die Oberfläche lädt. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function (T) {
  const { test, ok, PT } = T, ROOT = path.join(__dirname, '..', '..');
  test('Syntax: alle Skripte der Website und der Offline-Datei kompilieren', () => {
    const files = ['sw.js', 'assets/js/worker.js', 'assets/js/recovery.js'].concat(fs.readdirSync(path.join(ROOT, 'assets/js/ui')).map(f => 'assets/js/ui/' + f), fs.readdirSync(path.join(ROOT, 'assets/js/engine')).map(f => 'assets/js/engine/' + f)).filter(f => f.endsWith('.js'));
    files.forEach(f => { let err = null; try { new vm.Script(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f }); } catch (e) { err = e.message; } ok(!err, f + (err ? ': ' + err : '')); });
    const dist = path.join(ROOT, 'dist', 'PokerTrainer_' + PT.VERSION.split('.').slice(0, 2).join('.') + '.html');
    if (fs.existsSync(dist)) { const html = fs.readFileSync(dist, 'utf8'); let n = 0, bad = 0;
      for (const m of html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)) { if (/type="(text\/plain|application\/json)"/.test(m[0])) continue; n++; try { new vm.Script(m[1]); } catch (e) { bad++; } }
      ok(n > 0 && bad === 0, 'Offline-Datei: ' + n + ' eingebettete Skripte, ' + bad + ' fehlerhaft'); }
  });
};
