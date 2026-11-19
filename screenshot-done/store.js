/* On-device storage (IndexedDB). Nothing here is sent anywhere.
   Falls back to memory if the browser blocks storage (private mode etc.). */
(function (root) {
  'use strict';
  var DB = 'screenshot-done', VER = 1, db = null, memory = { items: {}, kv: {} }, mode = 'idb';
  function open() {
    return new Promise(function (resolve) {
      try {
        var req = indexedDB.open(DB, VER);
        req.onupgradeneeded = function () {
          var d = req.result;
          if (!d.objectStoreNames.contains('items')) d.createObjectStore('items', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        };
        req.onsuccess = function () { db = req.result; resolve(); };
        req.onerror = function () { mode = 'memory'; resolve(); };
        req.onblocked = function () { mode = 'memory'; resolve(); };
      } catch (e) { mode = 'memory'; resolve(); }
    });
  }
  function tx(store, rw, fn) {
    if (mode === 'memory') return Promise.resolve(fn(null));
    return new Promise(function (resolve, reject) {
      var t = db.transaction(store, rw ? 'readwrite' : 'readonly');
      var s = t.objectStore(store); var out = fn(s);
      t.oncomplete = function () { resolve(out && 'result' in out ? out.result : out); };
      t.onerror = function () { reject(t.error); };
    });
  }
  var api = {
    ready: open(),
    mode: function () { return mode; },
    all: function () {
      return api.ready.then(function () {
        if (mode === 'memory') return Object.values(memory.items);
        return tx('items', false, function (s) { return s.getAll(); });
      });
    },
    get: function (id) { return api.ready.then(function () { return mode === 'memory' ? memory.items[id] : tx('items', false, function (s) { return s.get(id); }); }); },
    put: function (item) { return api.ready.then(function () { if (mode === 'memory') { memory.items[item.id] = item; return item; } return tx('items', true, function (s) { s.put(item); }); }); },
    del: function (id) { return api.ready.then(function () { if (mode === 'memory') { delete memory.items[id]; return; } return tx('items', true, function (s) { s.delete(id); }); }); },
    clear: function () { return api.ready.then(function () { memory = { items: {}, kv: {} }; if (mode === 'memory') return; return Promise.all([tx('items', true, function (s) { s.clear(); }), tx('kv', true, function (s) { s.clear(); })]); }); },
    getKV: function (k, d) { return api.ready.then(function () { if (mode === 'memory') return k in memory.kv ? memory.kv[k] : d; return tx('kv', false, function (s) { return s.get(k); }).then(function (v) { return v === undefined ? d : v; }); }); },
    setKV: function (k, v) { return api.ready.then(function () { if (mode === 'memory') { memory.kv[k] = v; return; } return tx('kv', true, function (s) { s.put(v, k); }); }); }
  };
  root.SDStore = api;
})(self);
