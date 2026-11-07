// Makes one self-contained page per business (engine inlined, no Yaya domain, no service worker) for private claude.ai preview links.
// Usage: node apps/booking/make-pages.js <output-folder>
const fs = require('fs'), path = require('path');
const outDir = process.argv[2];
if (!outDir) { console.error('give an output folder'); process.exit(1); }
fs.mkdirSync(outDir, {recursive: true});
const list = require('./businesses.js');
const css = fs.readFileSync(path.join(__dirname, 'engine.css'), 'utf8')
  .replace('.wrap{max-width:1000px;margin:0 auto;padding:0 20px}', '.wrap{max-width:1000px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}')
  .replace('padding:12px 20px calc(12px + env(safe-area-inset-bottom));', 'padding:12px max(16px,env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));');
const amyJs = fs.readFileSync(path.join(__dirname, 'amy.js'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8')
  .replace(/if \('serviceWorker' in navigator[^\n]*\n/, '');
const FONT = {
  'DM Serif Display':'family=DM+Serif+Display', 'Fraunces':'family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700',
  'Outfit':'family=Outfit:wght@600;700;800', 'Space Grotesk':'family=Space+Grotesk:wght@600;700', 'Bricolage Grotesque':'family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700'
};
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const made = [];
for (const b of list) {
  const t = b.theme;
  const app = Object.assign({}, b, {mark: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${b.mark}</svg>`});
  delete app.theme;
  const html = `<title>${esc(b.name)} Demo</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${FONT[t.font]}&family=Inter:wght@400;500;600;700&display=swap">
<style>
/* One deliberate look for both themes: dark brand hero, light tinted bands. Colors are all set explicitly. */
:root{color-scheme:light;--ink:#16191d;--dim:#5b6168;--line:#e3e0da;--line2:#d2cdc4;--on-deep:#f6f3ee;--lead-on-deep:rgba(246,243,238,.82);--muted-on-deep:rgba(246,243,238,.6);--ring:rgba(0,0,0,.08);
--deep:${t.deep};--deep2:${t.deep2};--deep3:${t.deep3};--deep-end:${t.deepEnd};--accent:${t.accent};--accent2:${t.accent2};--accent-on-deep:${t.aod};
--soft1:${t.soft1};--soft1b:${t.soft1b};--soft2:${t.soft2};--soft2b:${t.soft2b};--glow1:${t.glow1};--glow2:${t.glow2};--disp:"${t.font}",Georgia,serif;--disp-w:${t.w}}
${css}
body{background:var(--soft1)}
input.t,select.t,textarea.t,.btn.ghost,.opt,.seg button,.cal,.cnt,.panel,.card,.panelw,.tabs,.req,.rev{color:var(--ink)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
</style>
<script>window.APP=${JSON.stringify(app).replace(/</g, '\\u003c')};</script>
<script>
${amyJs}
</script>
<script>
${js}
</script>
`;
  const f = path.join(outDir, b.slug + '.html');
  fs.writeFileSync(f, html);
  made.push(f);
}
console.log(made.length, 'pages in', outDir);
