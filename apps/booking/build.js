// Builds one booking app per business into apps/<slug>/.
// Run: node apps/booking/build.js   then   node apps/booking/check.js (needs a local server on port 8765; makes icons and tests every app)
const fs = require('fs'), path = require('path');
const list = require('./businesses.js');
const FONT = {
  'DM Serif Display':'family=DM+Serif+Display', 'Fraunces':'family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700',
  'Outfit':'family=Outfit:wght@600;700;800', 'Space Grotesk':'family=Space+Grotesk:wght@600;700', 'Bricolage Grotesque':'family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700'
};
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const stripTags = s => String(s).replace(/<[^>]+>/g, '');
const lum = hex => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); }); return .2126*c[0] + .7152*c[1] + .0722*c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x,y) + .05) / (Math.min(x,y) + .05); };
const out = [];
for (const b of list){
  const t = b.theme, dir = path.join(__dirname, '..', b.slug);
  fs.mkdirSync(dir, {recursive: true});
  const markSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${b.mark}</svg>`;
  const app = Object.assign({}, b, {theme: undefined, mark: markSvg});
  delete app.theme;
  const desc = `${stripTags(b.lead)} Demo app for ${b.name}, not their official app.`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(b.name)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="${t.deep2}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${esc(b.name.slice(0, 14))}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${FONT[t.font]}&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="../booking/engine.css">
<style>:root{--ink:#16191d;--dim:#5b6168;--line:#e3e0da;--line2:#d2cdc4;--on-deep:#f6f3ee;--lead-on-deep:rgba(246,243,238,.82);--muted-on-deep:rgba(246,243,238,.6);--ring:rgba(0,0,0,.08);
--deep:${t.deep};--deep2:${t.deep2};--deep3:${t.deep3};--deep-end:${t.deepEnd};--accent:${t.accent};--accent2:${t.accent2};--accent-on-deep:${t.aod};
--soft1:${t.soft1};--soft1b:${t.soft1b};--soft2:${t.soft2};--soft2b:${t.soft2b};--glow1:${t.glow1};--glow2:${t.glow2};--disp:"${t.font}",Georgia,serif;--disp-w:${t.w}}</style>
</head>
<body>
<noscript><p style="padding:20px">${esc(b.name)} · ${esc(b.phoneShow || '')}</p></noscript>
<script>window.APP=${JSON.stringify(app).replace(/</g, '\\u003c')};</script>
<script src="../booking/engine.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  fs.writeFileSync(path.join(dir, 'icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.deep2}"/><stop offset="1" stop-color="${t.deepEnd}"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g)"/><g transform="translate(106 106) scale(12.5)" fill="none" stroke="${t.aod}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${b.mark}</g></svg>\n`);
  fs.writeFileSync(path.join(dir, 'manifest.webmanifest'), JSON.stringify({name: b.name, short_name: b.name.slice(0, 14), description: desc, start_url: './', scope: './', display: 'standalone', background_color: t.deep2, theme_color: t.deep2,
    icons: [{src:'icon.svg', sizes:'any', type:'image/svg+xml'}, {src:'icon-192.png', sizes:'192x192', type:'image/png'}, {src:'icon-512.png', sizes:'512x512', type:'image/png'}, {src:'icon-512.png', sizes:'512x512', type:'image/png', purpose:'maskable'}]}, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'sw.js'), `// keeps the app working with no signal (shows the last saved copy)
const C = 'bk-${b.slug}-v1';
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(['./', 'manifest.webmanifest', 'icon.svg', '../booking/engine.js', '../booking/engine.css']))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('bk-${b.slug}') && k !== C).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok && (new URL(e.request.url).origin === location.origin || /fonts\\.(googleapis|gstatic)\\.com/.test(e.request.url))) { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
`);
  // contrast checks for text colors used on light and dark backgrounds
  const checks = [['accent on white', contrast(t.accent, '#ffffff')], ['white on accent', contrast('#ffffff', t.accent)], ['accent-on-deep on deep2', contrast(t.aod, t.deep2)], ['light text on deep', contrast('#f6f3ee', t.deep)]];
  const low = checks.filter(([, v]) => v < 4.5).map(([k, v]) => `${k} ${v.toFixed(2)}`);
  out.push({slug: b.slug, mode: b.mode, low});
}
fs.writeFileSync(path.join(__dirname, 'built.json'), JSON.stringify(out.map(o => ({slug: o.slug, mode: o.mode})), null, 2));
for (const o of out) console.log(o.slug.padEnd(34), o.mode.padEnd(8), o.low.length ? 'LOW CONTRAST: ' + o.low.join(', ') : 'contrast ok');
console.log('built', out.length, 'apps');
