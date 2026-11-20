/* On-device storage (IndexedDB). Nothing here is sent anywhere.
   Falls back to memory if the browser blocks storage (private mode etc.). */
(function (root) {
  'use strict';
  var DB = 'study-rescue', db = null, memory = {}, mode = 'idb';
  var ready = new Promise(function (resolve) {
    try {
      var req = indexedDB.open(DB, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('kv'); };
      req.onsuccess = function () { db = req.result; resolve(); };
      req.onerror = req.onblocked = function () { mode = 'memory'; resolve(); };
    } catch (e) { mode = 'memory'; resolve(); }
  });
  function tx(rw, fn) {
    return new Promise(function (resolve, reject) {
      try {
        var t = db.transaction('kv', rw ? 'readwrite' : 'readonly'), r = fn(t.objectStore('kv'));
        t.oncomplete = function () { resolve(r && 'result' in r ? r.result : undefined); };
        t.onerror = function () { reject(t.error); };
      } catch (e) { reject(e); }
    });
  }
  root.SRStore = {
    ready: ready,
    mode: function () { return mode; },
    get: function (k, d) { return ready.then(function () { if (mode === 'memory') return k in memory ? memory[k] : d; return tx(false, function (s) { return s.get(k); }).then(function (v) { return v === undefined ? d : v; }); }).catch(function () { return d; }); },
    set: function (k, v) { return ready.then(function () { if (mode === 'memory') { memory[k] = v; return; } return tx(true, function (s) { s.put(v, k); }); }).catch(function () { mode = 'memory'; memory[k] = v; }); },
    clear: function () { return ready.then(function () { memory = {}; if (mode === 'memory') return; return tx(true, function (s) { s.clear(); }); }); }
  };
})(self);
