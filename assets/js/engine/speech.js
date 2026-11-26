/* PokerTrainer 2.0 – Sprachausgabe (Steuerung). Die Browserfunktion wird von außen übergeben.
   Gesprochen wird nur der jüngste Tipp; ein noch laufender älterer bricht ab. Nur lokale deutsche Stimmen. */
(function (G) {
'use strict';
var PT = G.PT;
function pickVoice(voices) {
  var loc = (voices || []).filter(function (v) { return v && v.localService !== false && /^de([-_]|$)/i.test(v.lang || ''); });
  loc.sort(function (a, b) { return (/^de[-_]DE/i.test(b.lang) ? 1 : 0) - (/^de[-_]DE/i.test(a.lang) ? 1 : 0) || (b.default ? 1 : 0) - (a.default ? 1 : 0); });
  return loc[0] || null;
}
function Speech(env) {
  this.env = env || {}; this.synth = this.env.synth || null; this.Utter = this.env.Utter || null;
  this.available = !!(this.synth && this.Utter && typeof this.synth.speak === 'function');
  this.enabled = true; this.voice = null; this.seq = 0; this.cur = null; this.timer = null; this.onstatus = null; this.rate = 1.05;
}
Speech.prototype._emit = function (state, id, extra) { if (this.onstatus) this.onstatus(state, id, extra); };
Speech.prototype.speak = function (text, id, onStart) {
  if (!this.available || !this.enabled || !this.voice) return false;
  var self = this, env = this.env, token = ++this.seq;
  if (this.cur) this._emit('abgebrochen', this.cur.id);
  try { this.synth.cancel(); } catch (e) { /* leer */ }
  if (this.timer) env.clearTimeout(this.timer);
  this.cur = { id: id };
  this.timer = env.setTimeout(function () {
    self.timer = null;
    if (token !== self.seq) return;
    var u = new self.Utter(text);
    u.lang = self.voice.lang || 'de-DE'; u.voice = self.voice; u.rate = self.rate;
    u.onstart = function () { if (token === self.seq) { self._emit('spricht', id); if (onStart) onStart(); } };
    u.onend = function () { if (token === self.seq) { self.cur = null; self._emit('fertig', id); } };
    u.onerror = function (e) { if (token === self.seq) { self.cur = null; self._emit('fehler', id, e && e.error); } };
    try { self.synth.speak(u); } catch (e) { self._emit('fehler', id); }
  }, 40);
  return true;
};
Speech.prototype.stop = function () {
  this.seq++;
  if (this.timer) { this.env.clearTimeout(this.timer); this.timer = null; }
  if (this.cur) this._emit('abgebrochen', this.cur.id);
  this.cur = null;
  try { if (this.synth) this.synth.cancel(); } catch (e) { /* leer */ }
};
var SPEAK_RANK = { A: 'Ass', K: 'König', Q: 'Dame', J: 'Bube', T: 'Zehn', 9: 'Neun', 8: 'Acht', 7: 'Sieben', 6: 'Sechs', 5: 'Fünf', 4: 'Vier', 3: 'Drei', 2: 'Zwei' };
var SPEAK_POS = { UTG: 'Under the Gun', HJ: 'Hijack', CO: 'Cutoff', BTN: 'Button', SB: 'Small Blind', BB: 'Big Blind' };
function toSpeech(text) {
  return String(text)
    .replace(/\b([AKQJT2-9])([AKQJT2-9])([so])?\b(?!\s?(?:%|Prozent|BB|Hände|Kombinationen|Entscheidungen))(?![,.]\d)/g, function (m, a, b, s) {
      // reine Zahlen (z. B. „25“) nicht als Hand lesen: nur mit Suffix, mit Bildkarte/Zehn oder als Paar
      if (!s && /^\d\d$/.test(a + b) && a !== b) return m;
      if (a === b) return 'Paar ' + SPEAK_RANK[a];
      return SPEAK_RANK[a] + ' ' + SPEAK_RANK[b] + (s === 's' ? ' suited' : s === 'o' ? ' offsuit' : '');
    })
    .replace(/\b(UTG|HJ|CO|BTN|SB|BB)\b/g, function (m) { return SPEAK_POS[m]; })
    .replace(/(\d+),00\b/g, '$1').replace(/(\d+),(\d)0\b/g, '$1,$2')
    .replace(/ %/g, ' Prozent').replace(/%/g, ' Prozent').replace(/Ø/g, 'im Schnitt').replace(/−/g, 'minus').replace(/±/g, 'plus minus')
    .replace(/⅓/g, 'ein Drittel').replace(/½/g, 'halber').replace(/¾/g, 'drei Viertel').replace(/×/g, ' mal');
}
PT.speech = { Speech: Speech, pickVoice: pickVoice, toSpeech: toSpeech };
PT.Speech = Speech; PT.toSpeech = toSpeech; PT.pickVoice = pickVoice;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
