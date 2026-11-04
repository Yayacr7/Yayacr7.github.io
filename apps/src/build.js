// Builds one installable phone web app per business from businesses.json.
// Run: node apps/src/build.js   (then node apps/src/shots.js for the icons and preview pictures)
// Every fact on a page comes from businesses.json (Yaya's list). Nothing is made up: no reviews, ratings, prices or deals.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const list = JSON.parse(fs.readFileSync(path.join(__dirname, 'businesses.json'), 'utf8'));

const slug = s => s.toLowerCase().replace(/[’']/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const KIND = { salon: 'Hair salon', dentist: 'Dentist', restaurant: 'Restaurant', auto: 'Auto repair', hvac: 'Heating and furnace' };
const VERB = { salon: 'Call to book', dentist: 'Call to book', restaurant: 'Call the restaurant', auto: 'Call the shop', hvac: 'Call for service' };

// "Mon-Tue 10:00-21:00; Sat 8:00-16:00; Mon closed" -> [Sun..Sat], each null (not on the list), 'closed' or [openMin, closeMin]
function parseHours(str) {
  const w = Array(7).fill(null);
  const min = t => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
  for (const part of str.split(';').map(s => s.trim()).filter(Boolean)) {
    const [days, time] = part.split(/\s+/);
    const [a, b] = days.split('-').map(d => DAYS.indexOf(d));
    if (a < 0 || (b !== undefined && b < 0)) throw new Error('bad day in ' + part);
    const span = b === undefined ? [a] : Array.from({ length: ((b - a + 7) % 7) + 1 }, (_, i) => (a + i) % 7);
    for (const d of span) w[d] = time === 'closed' ? 'closed' : time.split('-').map(min);
  }
  return w;
}

// colors: pick readable text for a colored button
const lum = hex => { const c = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const onColor = bg => contrast(bg, '#ffffff') >= contrast(bg, '#111111') ? '#ffffff' : '#111111';

// one drawn picture per business type (line art, no photos, no logos)
const ICON = {
  salon: '<circle cx="18" cy="46" r="8"/><circle cx="46" cy="46" r="8"/><path d="M23 40 44 10M41 40 20 10"/>',
  dentist: '<path d="M21 8c-8 0-13 7-12 15 1 7 4 11 5 18 1 8 2 17 7 17 4 0 4-10 7-14 2-3 6-3 8 0 3 4 3 14 7 14 5 0 6-9 7-17 1-7 4-11 5-18 1-8-4-15-12-15-6 0-8 3-11 3s-5-3-11-3z"/>',
  restaurant: '<circle cx="32" cy="34" r="17"/><circle cx="32" cy="34" r="10"/><path d="M7 12v12q0 4 3 5v25M3 12v10M11 12v10M57 12q-6 8-4 18h4v24"/>',
  auto: '<path d="M44 8a12 12 0 0 0-11 16L9 48a5 5 0 0 0 7 7l24-24a12 12 0 0 0 16-11l-7 4-6-3-1-7z"/>',
  hvac: '<path d="M32 6c3 10 16 16 16 31a16 16 0 0 1-32 0c0-8 5-12 7-18 2 5 4 7 6 8 1-8 1-14 3-21z"/><path d="M32 54a7 7 0 0 1-7-7c0-5 4-7 7-12 3 5 7 7 7 12a7 7 0 0 1-7 7z"/>'
};
const svgIcon = (k, stroke, w = 3.4) => `<svg viewBox="0 0 64 64" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
const appIcon = b => { const [bg, ink, acc, acc2] = b.pal, fg = onColor(acc);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${acc}"/><stop offset="1" stop-color="${acc2}"/></linearGradient></defs><rect width="512" height="512" fill="url(#g)"/><circle cx="410" cy="96" r="150" fill="${bg}" opacity=".18"/><g transform="translate(116 116) scale(4.375)" fill="none" stroke="${fg}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">${ICON[b.k]}</g></svg>`; };

const FONTS = { 'Playfair Display': 'Playfair+Display:ital,wght@0,700;0,800;1,700', Fraunces: 'Fraunces:opsz,wght@9..144,700;9..144,800', 'Plus Jakarta Sans': 'Plus+Jakarta+Sans:wght@700;800', 'Archivo Black': 'Archivo+Black' };

function page(b) {
  const [bg, ink, acc, acc2] = b.pal, dark = lum(bg) < .2, s = slug(b.name);
  const week = parseHours(b.hours || '');
  const tel = '+1' + b.phone.replace(/\D/g, '');
  const mapQ = encodeURIComponent(b.addr ? `${b.name}, ${b.addr}, ${b.city}, MN` : `${b.name}, ${b.city}, MN`);
  const maps = 'https://www.google.com/maps/search/?api=1&query=' + mapQ;
  const accOn = onColor(acc), surf = dark ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.72)', line = dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.09)';
  // headline highlight: a marker band on light themes; on dark themes the words take the brand color that stands out most from the text
  const hl = [acc2, acc].filter(c => contrast(c, bg) >= 3).sort((x, y) => contrast(y, ink) - contrast(x, ink))[0] || acc;
  const dim = dark ? 'rgba(255,255,255,.66)' : 'rgba(0,0,0,.6)';
  const hookHTML = b.hooks.map((h, i) => { const w = h.split(' '), k = w.length > 4 ? 2 : 1; return `<span class="hook${i ? '' : ' on'}">${esc(w.slice(0, -k).join(' '))} <mark>${esc(w.slice(-k).join(' '))}</mark></span>`; }).join('');
  const sub = [KIND[b.k], b.city + ', MN', b.who].filter(Boolean).join(' · ');
  const data = { week, emergency: !!b.emergency, name: b.name };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(b.name)}</title>
<meta name="description" content="Demo app for ${esc(b.name)} in ${esc(b.city)}, MN: hours, call and directions. Not the official app.">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="${bg}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${esc(b.name.length > 14 ? b.name.split(' ')[0] : b.name)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${FONTS[b.font]}&family=Inter:wght@400;500;600;700&display=swap">
<style>
:root{--hl:${hl};--bg:${bg};--ink:${ink};--acc:${acc};--acc2:${acc2};--on:${accOn};--surf:${surf};--line:${line};--dim:${dim};--disp:"${b.font}",Georgia,serif}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;min-height:100dvh;background:var(--bg);color:var(--ink);font:16px/1.5 Inter,system-ui,-apple-system,sans-serif;overflow-x:hidden}
a{color:inherit}
.demo{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;padding:8px 16px;padding-top:max(8px,env(safe-area-inset-top));font-size:.74rem;line-height:1.35;text-align:center;background:${dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)'};color:var(--dim)}
.demo b{color:var(--ink);font-weight:600}
.app{max-width:480px;margin:0 auto;padding:0 16px calc(104px + env(safe-area-inset-bottom));position:relative}
.blob{position:absolute;border-radius:50%;filter:blur(48px);opacity:${dark ? '.38' : '.45'};pointer-events:none;z-index:0}
.fx{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.b1{width:260px;height:260px;background:var(--acc);top:-60px;right:max(-90px,calc(50% - 330px));animation:float 14s ease-in-out infinite}
.b2{width:200px;height:200px;background:var(--acc2);top:170px;left:max(-110px,calc(50% - 350px));animation:float 18s ease-in-out infinite reverse}
@keyframes float{50%{transform:translate(-26px,34px) scale(1.1)}}
.top,.hero,.card,.acts{position:relative;z-index:1}
.top{display:flex;align-items:center;gap:12px;padding:22px 0 8px}
.logo{width:52px;height:52px;border-radius:15px;flex:none;display:grid;place-items:center;background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 8px 24px -8px var(--acc)}
.logo svg{width:30px;height:30px}
.top h1{font:800 1.12rem/1.2 var(--disp);margin:0;letter-spacing:-.01em}
.top p{margin:2px 0 0;font-size:.8rem;color:var(--dim)}
.hero{padding:26px 0 8px}
.hooks{display:grid;min-height:3.2em;font:800 clamp(2.05rem,10vw,2.75rem)/1.06 var(--disp);letter-spacing:-.02em}
.hook{grid-area:1/1;opacity:0;transform:translateY(14px);transition:opacity .6s,transform .6s}
.hook.on{opacity:1;transform:none}
${dark ? 'mark{background:none;color:var(--hl)}' : 'mark{background:linear-gradient(transparent 58%,var(--acc2) 58%,var(--acc2) 92%,transparent 92%);color:inherit;padding:0 .04em}'}
.dots{display:flex;gap:6px;margin:14px 0 0}
.dots i{width:7px;height:7px;border-radius:9px;background:var(--line);transition:width .4s,background .4s}
.dots i.on{width:22px;background:var(--acc)}
.status{display:inline-flex;align-items:center;gap:9px;margin-top:20px;padding:9px 14px;border-radius:99px;background:var(--surf);border:1px solid var(--line);font-weight:600;font-size:.9rem;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.status .pulse{width:10px;height:10px;border-radius:50%;background:#9aa0a6;flex:none}
.status.open .pulse{background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.6);animation:pulse 2s infinite}
.status.soon .pulse{background:#f59e0b}
.status.closed .pulse{background:#ef4444}
@keyframes pulse{70%{box-shadow:0 0 0 10px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
.status small{font-weight:500;color:var(--dim)}
.acts{display:grid;grid-template-columns:repeat(${b.email ? 4 : 3},1fr);gap:10px;margin:26px 0 18px}
.act{display:flex;flex-direction:column;align-items:center;gap:7px;padding:14px 4px 12px;border-radius:18px;background:var(--surf);border:1px solid var(--line);text-decoration:none;font:600 .78rem Inter,sans-serif;color:var(--ink);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .15s}
.act:active{transform:scale(.95)}
.act svg{width:24px;height:24px}
.act.main{background:var(--acc);color:var(--on);border-color:transparent;box-shadow:0 10px 26px -12px var(--acc)}
.card{background:var(--surf);border:1px solid var(--line);border-radius:22px;padding:18px;margin:0 0 14px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.card h2{font:800 1.05rem/1.2 var(--disp);margin:0 0 12px}
.why{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.why li{display:flex;gap:12px;align-items:center;font-weight:500}
.why li span{width:34px;height:34px;flex:none;border-radius:11px;display:grid;place-items:center;background:var(--acc);color:var(--on);font:800 .9rem var(--disp)}
.week{display:grid;gap:2px;margin:0}
.week div{display:flex;justify-content:space-between;gap:12px;padding:9px 10px;border-radius:10px;font-size:.94rem}
.week dt{font-weight:600}
.week dd{margin:0;color:var(--dim);text-align:right}
.week div.today{background:var(--acc);color:var(--on)}
.week div.today dd{color:inherit;font-weight:600}
.big{display:flex;align-items:center;gap:14px}
.big svg{width:46px;height:46px;flex:none}
.big b{display:block;font:800 1.25rem/1.15 var(--disp)}
.big p{margin:2px 0 0;color:var(--dim);font-size:.88rem;overflow-wrap:anywhere}
.big>div{min-width:0}
.emerg{background:linear-gradient(135deg,var(--acc),var(--acc2));color:var(--on);border:0}
.emerg p{color:inherit;opacity:.85}
.note{font-size:.76rem;color:var(--dim);text-align:center;margin:18px 8px 0;line-height:1.45}
.install{display:none;margin:14px auto 0;padding:11px 18px;border-radius:99px;border:1px solid var(--line);background:transparent;color:var(--ink);font:600 .86rem Inter,sans-serif;cursor:pointer}
.install.show{display:block}
.bar{position:fixed;left:0;right:0;bottom:0;z-index:5;display:flex;gap:10px;justify-content:center;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:${dark ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.78)'};backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid var(--line)}
.bar a{flex:1;max-width:224px;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:16px;font-weight:700;text-decoration:none;font-size:.98rem}
.bar .call{background:var(--acc);color:var(--on)}
.bar .dir{background:var(--surf);border:1px solid var(--line)}
.bar svg{width:19px;height:19px}
.toast{position:fixed;left:50%;bottom:96px;transform:translate(-50%,20px);opacity:0;background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:12px;font-size:.86rem;transition:.3s;z-index:9;pointer-events:none}
.toast.on{opacity:1;transform:translate(-50%,0)}
.rise{animation:rise .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(18px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media (min-width:700px){.app{padding-top:20px}}
</style>
</head>
<body>
<div class="demo"><span><b>Demo app</b> made by AdSharp to show ${esc(b.name)}. Not their official app.</span><span>Hours may change: call to confirm.</span></div>
<div class="fx" aria-hidden="true"><i class="blob b1"></i><i class="blob b2"></i></div>
<main class="app">
  <header class="top rise"><div class="logo">${svgIcon(b.k, accOn, 4)}</div><div><h1>${esc(b.name)}</h1><p>${esc(sub)}</p></div></header>
  <section class="hero">
    <div class="hooks rise" style="animation-delay:.08s" aria-live="polite">${hookHTML}</div>
    <div class="dots" aria-hidden="true">${b.hooks.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>
    <div class="status rise" id="status" style="animation-delay:.16s"><i class="pulse"></i><span id="stT">Checking hours…</span></div>
  </section>
  <nav class="acts rise" style="animation-delay:.24s" aria-label="Quick actions">
    <a class="act main" href="tel:${tel}">${svgIcon('phone', 'currentColor', 2)}Call</a>
    <a class="act" href="${maps}" target="_blank" rel="noopener">${svgIcon('pin', 'currentColor', 2)}Directions</a>
    ${b.email ? `<a class="act" href="mailto:${esc(b.email)}">${svgIcon('mail', 'currentColor', 2)}Email</a>` : ''}
    <button class="act" id="share" type="button">${svgIcon('share', 'currentColor', 2)}Share</button>
  </nav>
  ${b.emergency ? `<section class="card emerg rise" style="animation-delay:.3s"><div class="big">${svgIcon('hvac', accOn, 3.4)}<div><b>Emergency calls 24/7</b><p>No heat? Call ${esc(b.phone)} any time, day or night.</p></div></div></section>` : ''}
  <section class="card rise" style="animation-delay:.34s"><h2>Why ${esc(b.name)}</h2><ul class="why">${b.facts.map((f, i) => `<li><span>${i + 1}</span>${esc(f)}</li>`).join('')}</ul></section>
  <section class="card rise" style="animation-delay:.4s"><h2>${b.emergency ? 'Office hours' : 'Hours'}</h2>
    ${b.hours ? `<dl class="week" id="week"></dl>` : `<p style="margin:0;color:var(--dim)">Office hours: call ${esc(b.phone)} to ask.</p>`}</section>
  <section class="card rise" style="animation-delay:.46s"><div class="big">${svgIcon(b.k, 'var(--acc)', 3.4)}<div><b>${esc(VERB[b.k])}</b><p><a href="tel:${tel}">${esc(b.phone)}</a>${b.email ? ` · <a href="mailto:${esc(b.email)}">${esc(b.email)}</a>` : ''}<br>${esc(b.addr ? b.addr + ', ' + b.city + ', MN' : b.city + ', Minnesota')}</p></div></div></section>
  <button class="install" id="install" type="button">Add to home screen</button>
  <p class="note">Demo made by AdSharp to show the owner. Not affiliated with or approved by ${esc(b.name)} yet. Hours and phone may change: please call to confirm.</p>
</main>
<div class="bar"><a class="call" href="tel:${tel}">${svgIcon('phone', 'currentColor', 2.4)}Call now</a><a class="dir" href="${maps}" target="_blank" rel="noopener">${svgIcon('pin', 'currentColor', 2.4)}Directions</a></div>
<div class="toast" id="toast" role="status"></div>
<script>
const D = ${JSON.stringify(data)};
const DAYS = ${JSON.stringify(FULL)};
const t12 = m => { const h = Math.floor(m / 60) % 24, mm = m % 60; if (h === 12 && !mm) return 'noon'; if (h === 0 && !mm) return 'midnight'; return (h % 12 || 12) + (mm ? ':' + String(mm).padStart(2, '0') : '') + (h < 12 ? 'am' : 'pm'); };
function now() { // the business's own clock (Minnesota), whatever the phone's time zone
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { d: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), m: (+p.hour % 24) * 60 + +p.minute };
}
function status() {
  const { d, m } = now(), el = document.getElementById('status'), T = document.getElementById('stT'), w = D.week, today = w[d];
  el.className = 'status';
  const set = (cls, html) => { el.classList.add(cls); T.innerHTML = html; };
  if (Array.isArray(today) && m >= today[0] && m < today[1]) {
    const left = today[1] - m;
    return left <= 60 ? set('soon', 'Closing soon <small>· until ' + t12(today[1]) + '</small>') : set('open', 'Open now <small>· until ' + t12(today[1]) + '</small>');
  }
  if (today === null && !D.emergency) { // this day is not on the list: never claim it is closed
    for (let i = 1; i < 8; i++) { const dd = (d + i) % 7, h = w[dd]; if (Array.isArray(h)) return set('unk', 'Today’s hours not listed <small>· call to check</small>'); }
  }
  for (let i = 0; i < 8; i++) { // next opening
    const dd = (d + i) % 7, h = w[dd];
    if (Array.isArray(h) && (i > 0 || m < h[0])) {
      const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAYS[dd];
      return set(D.emergency ? 'open' : 'closed', (D.emergency ? 'Emergency line open 24/7 <small>· office opens ' : 'Closed now <small>· opens ') + when + ' ' + t12(h[0]) + '</small>');
    }
  }
  if (D.emergency) return set('open', 'Emergency line open 24/7');
  set('closed', 'Call to check today’s hours');
}
const wk = document.getElementById('week');
if (wk) { const d = now().d; wk.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(i => { const h = D.week[i]; return '<div' + (i === d ? ' class="today"' : '') + '><dt>' + DAYS[i] + (i === d ? ' · today' : '') + '</dt><dd>' + (h === 'closed' ? 'Closed' : Array.isArray(h) ? t12(h[0]) + ' – ' + t12(h[1]) : 'Not listed: call') + '</dd></div>'; }).join(''); }
status(); setInterval(status, 30000);
// rotating headlines
const hs = [...document.querySelectorAll('.hook')], ds = [...document.querySelectorAll('.dots i')]; let k = 0;
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => { hs[k].classList.remove('on'); ds[k].classList.remove('on'); k = (k + 1) % hs.length; hs[k].classList.add('on'); ds[k].classList.add('on'); }, 3600);
const toast = t => { const e = document.getElementById('toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 2200); };
document.getElementById('share').addEventListener('click', async () => {
  const data = { title: D.name, text: D.name + ': hours, call and directions', url: location.href };
  try { if (navigator.share) { await navigator.share(data); return; } await navigator.clipboard.writeText(location.href); toast('Link copied'); } catch (e) { if (e.name !== 'AbortError') toast('Copy the link from the address bar'); }
});
// install as an app
let ev = null; const ib = document.getElementById('install');
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); ev = e; ib.classList.add('show'); });
if (!standalone && /iphone|ipad|ipod/i.test(navigator.userAgent)) ib.classList.add('show');
ib.addEventListener('click', async () => { if (ev) { ev.prompt(); ev = null; ib.classList.remove('show'); } else toast('Tap Share, then “Add to Home Screen”'); });
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
</script>
</body>
</html>
`;
}

// small UI icons used on the pages
Object.assign(ICON, {
  phone: '<path d="M22 8h-8a4 4 0 0 0-4 4c0 23 19 42 42 42a4 4 0 0 0 4-4v-8l-11-5-6 6c-7-3-15-11-18-18l6-6z"/>',
  pin: '<path d="M32 58S12 38 12 25a20 20 0 0 1 40 0c0 13-20 33-20 33z"/><circle cx="32" cy="25" r="7"/>',
  mail: '<rect x="8" y="14" width="48" height="36" rx="5"/><path d="m10 18 22 17 22-17"/>',
  share: '<path d="M32 40V8M20 20 32 8l12 12M14 30v20a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4V30"/>'
});

const sw = v => `// keeps the app working with no signal (shows the last saved copy)
const C = 'app-${v}';
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(['./', 'manifest.webmanifest', 'icon.svg', 'icon-192.png']))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok && (new URL(e.request.url).origin === location.origin || /fonts\\.(googleapis|gstatic)\\.com/.test(e.request.url))) { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
`;

const VERSION = Date.now().toString(36);
const out = [];
for (const b of list) {
  const s = slug(b.name), dir = path.join(ROOT, s);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(b));
  fs.writeFileSync(path.join(dir, 'icon.svg'), appIcon(b));
  fs.writeFileSync(path.join(dir, 'sw.js'), sw(VERSION));
  fs.writeFileSync(path.join(dir, 'manifest.webmanifest'), JSON.stringify({
    name: b.name, short_name: b.name.length > 12 ? b.name.split(' ').slice(0, 2).join(' ').slice(0, 12) : b.name,
    description: `Hours, call and directions for ${b.name} in ${b.city}, MN (demo).`, start_url: './', scope: './', display: 'standalone',
    background_color: b.pal[0], theme_color: b.pal[0],
    icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }, { src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }]
  }, null, 2));
  out.push({ slug: s, name: b.name, city: b.city, k: b.k, phone: b.phone, check: b.check || '', chain: !!b.chain, acc: b.pal[2], bg: b.pal[0] });
}
fs.writeFileSync(path.join(__dirname, 'apps.json'), JSON.stringify(out, null, 2));

// No page lists all the apps (Yaya's choice, Nov 4, 2026): each owner gets only their own link.
// Yaya finds every app from the "App" buttons in AdSharp's City Ad Packs > Your list.
console.log('built', out.length, 'apps');
