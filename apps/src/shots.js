// Makes the PNG app icons (Android/iPhone need PNG) and a preview picture of each app for the gallery.
// Needs a local server at http://localhost:8765 serving the repo root, and Playwright.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const apps = JSON.parse(fs.readFileSync(path.join(__dirname, 'apps.json'), 'utf8'));
(async () => {
  const b = await chromium.launch(), pg = await b.newPage();
  for (const a of apps) {
    const dir = path.join(__dirname, '..', a.slug), svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
    for (const s of [180, 192, 512]) {
      await pg.setViewportSize({ width: s, height: s });
      await pg.setContent(`<style>html,body{margin:0}svg{display:block;width:${s}px;height:${s}px}</style>${svg}`);
      await pg.screenshot({ path: path.join(dir, `icon-${s}.png`) });
    }
  }
  const ph = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  for (const a of apps) {
    await ph.goto(`http://localhost:8765/apps/${a.slug}/`, { waitUntil: 'networkidle' }); await ph.waitForTimeout(1200);
    await ph.screenshot({ path: path.join(__dirname, '..', a.slug, 'preview.png') });
  }
  await b.close(); console.log('icons + previews for', apps.length);
})();
