/* Offline support. App files: network first (so updates show), cached copy when offline.
   Text reader files: cached after first use (they never change for a version). */
var V = 'sd-v1';
var SHELL = ['./', 'index.html', 'app.css', 'app.js', 'parse.js', 'ics.js', 'store.js', 'manifest.webmanifest', 'icons/icon.svg'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url); if (url.origin !== location.origin) return;
  if (url.pathname.indexOf('/vendor/') >= 0) {
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req).then(function (res) { if (res.ok) { var copy = res.clone(); caches.open(V).then(function (c) { c.put(req, copy); }); } return res; }); }));
    return;
  }
  e.respondWith(fetch(req).then(function (res) { if (res.ok) { var copy = res.clone(); caches.open(V).then(function (c) { c.put(req, copy); }); } return res; }).catch(function () { return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('index.html'); }); }));
});
