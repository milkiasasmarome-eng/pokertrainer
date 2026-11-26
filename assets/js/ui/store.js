/* PokerTrainer 2.0 – Persistenz: IndexedDB (Rückfall localStorage, sonst nur Sitzung), Migration aus Entwurf 2. */
(function () {
'use strict';
var PTUI = window.PTUI = window.PTUI || {};
var NAME = 'pokertrainer2', VER = 1, LSK = 'pokertrainer20.', STORES = ['meta', 'opps', 'hands', 'learn', 'backup'];
var KEYS = { meta: 'k', opps: 'id', hands: 'id', learn: 'k', backup: 'k' };
var S = { mode: 'mem', db: null, mem: {} };
STORES.forEach(function (s) { S.mem[s] = {}; });

function reqP(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
function txDone(tx) { return new Promise(function (res, rej) { tx.oncomplete = function () { res(); }; tx.onerror = function () { rej(tx.error || new Error('Schreibfehler')); }; tx.onabort = function () { rej(tx.error || new Error('abgebrochen')); }; }); }
function openIdb() {
  return new Promise(function (res, rej) {
    try {
      if (!window.indexedDB) { rej(new Error('kein IndexedDB')); return; }
      var rq = window.indexedDB.open(NAME, VER);
      rq.onupgradeneeded = function () {
        var d = rq.result;
        STORES.forEach(function (s) { if (!d.objectStoreNames.contains(s)) { var os = d.createObjectStore(s, { keyPath: KEYS[s] }); if (s === 'hands') os.createIndex('ts', 'ts'); } });
      };
      rq.onsuccess = function () { var d = rq.result; d.onversionchange = function () { d.close(); }; res(d); };
      rq.onerror = function () { rej(rq.error || new Error('IndexedDB-Fehler')); };
      rq.onblocked = function () { rej(new Error('IndexedDB blockiert')); };
    } catch (e) { rej(e); }
  });
}
function lsOk() { try { var k = LSK + 'probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; } }
function lsGet(store) { try { return JSON.parse(localStorage.getItem(LSK + store) || '{}'); } catch (e) { return {}; } }
function lsSet(store, obj) { localStorage.setItem(LSK + store, JSON.stringify(obj)); }

var Store = {
  mode: function () { return S.mode; },
  init: function () {
    return openIdb().then(function (d) { S.db = d; S.mode = 'idb'; }, function () { S.mode = lsOk() ? 'ls' : 'mem'; })
      .then(function () { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) { /* leer */ } return S.mode; });
  },
  get: function (store, key) {
    if (S.mode === 'idb') return reqP(S.db.transaction(store, 'readonly').objectStore(store).get(key));
    if (S.mode === 'ls') return Promise.resolve(lsGet(store)[key]);
    return Promise.resolve(S.mem[store][key]);
  },
  all: function (store) {
    if (S.mode === 'idb') return reqP(S.db.transaction(store, 'readonly').objectStore(store).getAll());
    var o = S.mode === 'ls' ? lsGet(store) : S.mem[store];
    return Promise.resolve(Object.keys(o).map(function (k) { return o[k]; }));
  },
  put: function (store, vals, clearFirst) {
    vals = Array.isArray(vals) ? vals : [vals];
    if (S.mode === 'idb') {
      var tx = S.db.transaction(store, 'readwrite'), os = tx.objectStore(store);
      if (clearFirst) os.clear();
      vals.forEach(function (v) { os.put(v); });
      return txDone(tx);
    }
    try {
      var o = clearFirst ? {} : (S.mode === 'ls' ? lsGet(store) : S.mem[store]), kp = KEYS[store];
      vals.forEach(function (v) { o[v[kp]] = v; });
      if (S.mode === 'ls') lsSet(store, o); else S.mem[store] = o;
      return Promise.resolve();
    } catch (e) { return Promise.reject(e); }
  },
  del: function (store, keys) {
    keys = Array.isArray(keys) ? keys : [keys];
    if (S.mode === 'idb') { var tx = S.db.transaction(store, 'readwrite'), os = tx.objectStore(store); keys.forEach(function (k) { os.delete(k); }); return txDone(tx); }
    var o = S.mode === 'ls' ? lsGet(store) : S.mem[store];
    keys.forEach(function (k) { delete o[k]; });
    if (S.mode === 'ls') lsSet(store, o);
    return Promise.resolve();
  },
  clear: function (store) {
    if (S.mode === 'idb') { var tx = S.db.transaction(store, 'readwrite'); tx.objectStore(store).clear(); return txDone(tx); }
    if (S.mode === 'ls') localStorage.removeItem(LSK + store); else S.mem[store] = {};
    return Promise.resolve();
  },
  clearAll: function () { return Promise.all(STORES.map(function (s) { return Store.clear(s); })); },
  /** Hände: neueste zuerst; begrenzt auf max Einträge (älteste werden entfernt) */
  addHand: function (rec, max) {
    return Store.put('hands', rec).then(function () {
      return Store.all('hands').then(function (list) {
        if (list.length <= max) return;
        list.sort(function (a, b) { return a.ts - b.ts; });
        return Store.del('hands', list.slice(0, list.length - max).map(function (h) { return h.id; }));
      });
    });
  },
  /**
   * Sucht Daten aus Entwurf 2 (IndexedDB „pokertrainer-v2“, localStorage „pokertrainer2.*“) im selben Ursprung.
   * Legt keine leere alte Datenbank an.
   */
  findLegacy: function () {
    function viaIdb() {
      return new Promise(function (res) {
        try {
          if (!window.indexedDB) { res(null); return; }
          var created = false, rq = window.indexedDB.open('pokertrainer-v2');
          rq.onupgradeneeded = function (ev) { if (ev.oldVersion === 0) { created = true; try { rq.transaction.abort(); } catch (e) { /* leer */ } } };
          rq.onerror = function () { res(null); };
          rq.onsuccess = function () {
            var d = rq.result;
            if (created || !d.objectStoreNames.contains('gegner')) { d.close(); res(null); return; }
            var tx = d.transaction(['gegner', 'meta'], 'readonly'), out = { opps: [], meta: null, source: 'IndexedDB pokertrainer-v2' };
            var a = tx.objectStore('gegner').getAll(); a.onsuccess = function () { out.opps = a.result || []; };
            var b = tx.objectStore('meta').get('tisch'); b.onsuccess = function () { out.meta = b.result ? b.result.v : null; };
            tx.oncomplete = function () { d.close(); res(out.opps.length || out.meta ? out : null); };
            tx.onerror = function () { d.close(); res(null); };
          };
        } catch (e) { res(null); }
      });
    }
    return viaIdb().then(function (r) {
      if (r) return r;
      try {
        var g = localStorage.getItem('pokertrainer2.gegner'), m = localStorage.getItem('pokertrainer2.meta');
        if (g) return { opps: JSON.parse(g) || [], meta: m ? JSON.parse(m) : null, source: 'localStorage pokertrainer2' };
      } catch (e) { /* leer */ }
      return null;
    });
  }
};
PTUI.Store = Store;
})();
