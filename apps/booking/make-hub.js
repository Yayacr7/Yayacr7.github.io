const fs = require('fs'), path = require('path');
const S = '/tmp/claude-0/-home-user/3b398c80-bba8-5685-81c4-381809ea44e4/scratchpad';
const list = require('./businesses.js');
const NOTE = {'walsh-plumbing':'No website: info from your list and public listings. Call first.','fairy-tails-grooming':'Address unclear: listings disagree. Call first.','performance-music-lessons':'Address unclear: listings disagree. Call first.','kristinas-cleaning-company':'No shop address: they come to you.','grooming-station':'No website: info from public listings. Call first.','mns-all-seasons-comforts':'No website: info from public listings. Call first.','mccoys-auto-repair':'No website: info from public listings. Call first.','qc-dance':'Phone and address from your list.'};
const apps = [{slug:'vividly-clean', name:'Vividly Clean', what:'Home & business cleaning', city:'Blaine', accent:'#0f766e', phoneShow:'763.434.0206', phone:'7634340206', email:'Jenni@vividlyclean.com', address:'10130 Davenport St NE #140, Blaine, MN 55449'}]
  .concat(list.map(b => ({slug:b.slug, name:b.name, what:b.eyebrow.split(' · ')[0].replace(/^./, c => c.toUpperCase()), city:b.kicker.replace(/, MN$/,'').replace(/^.* · /,''), accent:b.theme.accent, phoneShow:b.phoneShow, phone:b.phone, textShow: b.text && b.text !== b.phone ? b.textShow : (b.text ? 'same number' : ''), email:b.email || '', address:b.address || ''})));
const pages = {};
for (const a of apps) {
  const body = fs.readFileSync(path.join(S, 'pages', a.slug + '.html'), 'utf8');
  pages[a.slug] = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + body + '</body></html>';
}
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const html = `<title>Local Business App Demos</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600;700&display=swap">
<style>
/* Layout: one column list of businesses on a quiet ground; tapping one opens that app full screen. */
:root{--bg:#f4f1ec;--card:#ffffff;--ink:#1a1d21;--dim:#5f6670;--line:#e3ded6;--top:#15191d;--on-top:#f4f1ec;--hi:#2f6db5;--disp:"Fraunces",Georgia,serif;--body:Inter,system-ui,sans-serif}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#121417;--card:#1b1f24;--ink:#eceae6;--dim:#a3a9b1;--line:#2b3037;--top:#0b0d10;--on-top:#eceae6;--hi:#8cc4ff;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#121417;--card:#1b1f24;--ink:#eceae6;--dim:#a3a9b1;--line:#2b3037;--top:#0b0d10;--on-top:#eceae6;--hi:#8cc4ff;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font:16px/1.5 var(--body);margin:0}
.wrap{max-width:820px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
header{background:var(--top);color:var(--on-top)}
header .wrap{padding-block:28px 26px}
h1{font-family:var(--disp);font-weight:600;font-size:clamp(28px,6vw,40px);line-height:1.1;margin:0 0 6px;text-wrap:balance}
header p{margin:0;opacity:.8;max-width:52ch}
.count{display:inline-block;margin-top:12px;font-size:13px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;opacity:.65}
main .wrap{padding-block:18px 40px}
.list{display:flex;flex-direction:column;gap:10px}
.item{display:flex;align-items:flex-start;gap:14px;width:100%;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.num{font:700 13px var(--body);color:var(--dim);min-width:22px;padding-top:3px;font-variant-numeric:tabular-nums}
dl{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin:8px 0 0;font-size:14px}
dt{color:var(--dim)}
dd{margin:0;overflow-wrap:anywhere;user-select:text}
.warn{margin-top:6px;font-size:13px;color:var(--dim)}
.open{flex:none;align-self:center;background:var(--hi);color:var(--bg);border:0;border-radius:10px;padding:10px 14px;font:700 14px var(--body);cursor:pointer;white-space:nowrap}
@media(max-width:520px){.item{flex-wrap:wrap}.open{width:100%;margin-top:4px}}
.open:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.sw{width:12px;height:40px;border-radius:6px;flex:none}
.item span.t{flex:1;min-width:0}
.item b{display:block;font-size:16.5px}
.item small{display:block;color:var(--dim);font-size:14px}
.item i{font-style:normal;color:var(--hi);font-weight:700;font-size:14px;white-space:nowrap}
.note{color:var(--dim);font-size:13px;margin-top:18px}
#viewer{position:fixed;inset:0;background:var(--bg);display:flex;flex-direction:column;z-index:5}
#viewer[hidden]{display:none}
.bar{display:flex;align-items:center;gap:10px;background:var(--top);color:var(--on-top);padding:calc(10px + env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) 10px max(12px,env(safe-area-inset-left,0px))}
.bar button{background:rgba(255,255,255,.1);color:var(--on-top);border:1px solid rgba(255,255,255,.22);border-radius:10px;padding:8px 14px;font:600 14px var(--body);cursor:pointer}
.bar b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
iframe{flex:1;width:100%;border:0;background:#fff}
</style>
<header><div class="wrap"><h1>Local business app demos</h1><p>Every business with its phone, email and address. Tap “Open app” to show its app.</p><span class="count">${apps.length} apps · Anoka County, MN</span></div></header>
<main><div class="wrap"><div class="list">${apps.map((a, i) => `<div class="item"><span class="num">${i+1}</span><span class="sw" style="background:${a.accent}"></span><span class="t"><b>${esc(a.name)}</b><small>${esc(a.what)} · ${esc(a.city)}</small>
<dl><dt>Phone</dt><dd>${esc(a.phoneShow)}${a.textShow ? ' · text ' + esc(a.textShow) : ''}</dd><dt>Email</dt><dd>${a.email ? esc(a.email) : 'None found'}</dd><dt>Address</dt><dd>${a.address ? esc(a.address) : 'Call to confirm'}</dd></dl>
${NOTE[a.slug] ? `<div class="warn">${esc(NOTE[a.slug])}</div>` : ''}</span><button class="open" type="button" data-app="${a.slug}">Open app →</button></div>`).join('')}</div>
<p class="note">Demos made by AdSharp. These are not the businesses' official apps.</p></div></main>
<div id="viewer" hidden><div class="bar"><button type="button" id="back">← All apps</button><b id="vname"></b></div><iframe id="frame" title="App"></iframe></div>
<script id="data" type="application/json">${JSON.stringify(pages).replace(/</g,'\\u003c')}</script>
<script>
const PAGES = JSON.parse(document.getElementById('data').textContent);
const NAMES = ${JSON.stringify(Object.fromEntries(apps.map(a => [a.slug, a.name])))};
const viewer = document.getElementById('viewer'), frame = document.getElementById('frame');
function open(slug){ if (!PAGES[slug]) return; frame.srcdoc = PAGES[slug]; document.getElementById('vname').textContent = NAMES[slug]; viewer.hidden = false; try { history.replaceState(null, '', '#' + slug); } catch(e){} }
function close(){ viewer.hidden = true; frame.srcdoc = ''; try { history.replaceState(null, '', location.pathname + location.search); } catch(e){} }
document.querySelectorAll('[data-app]').forEach(b => b.addEventListener('click', () => open(b.dataset.app)));
document.getElementById('back').addEventListener('click', close);
const h = location.hash.slice(1); if (h && PAGES[h]) open(h);
</script>
`;
fs.writeFileSync(path.join(S, 'hub', 'app-demos.html'), html);
console.log('hub bytes', html.length, 'apps', apps.length);
