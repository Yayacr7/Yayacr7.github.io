/* Offline support: network first (so updates show), cached copy when offline. */
var V = 'ds-v2';
var SHELL = ['./', 'index.html', 'app.css', 'app.js', 'engine.js', 'data.js', 'art.js', 'config.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'fonts/nunito-latin.woff2'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('ds-') === 0 && k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url); if (url.origin !== location.origin) return;
  e.respondWith(fetch(req).then(function (res) { if (res.ok) { var copy = res.clone(); caches.open(V).then(function (c) { c.put(req, copy); }); } return res; }).catch(function () { return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('index.html'); }); }));
});
