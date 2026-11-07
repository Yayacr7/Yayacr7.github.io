// Makes the PNG icons and tests every booking app. Needs: python3 -m http.server 8765 (from the repo root).
// Usage: node apps/booking/check.js [screenshot-folder]
const { chromium } = require('playwright');
const list = require('./businesses.js');
const SHOTS = process.argv[2] || '';
(async () => {
  const b = await chromium.launch();
  const ip = await b.newPage();
  for (const x of list) for (const n of [180, 192, 512]) {
    await ip.setViewportSize({width: n, height: n});
    await ip.goto(`http://localhost:8765/apps/${x.slug}/icon.svg`);
    await ip.screenshot({path: `apps/${x.slug}/icon-${n}.png`});
  }
  let fails = 0;
  for (const x of list) {
    const res = [];
    for (const [w, h, dev] of [[390, 844, 'phone'], [820, 1180, 'ipad'], [1440, 900, 'laptop'], [320, 640, 'small']]) {
      const p = await b.newPage({viewport: {width: w, height: h}});
      const errs = [];
      p.on('pageerror', e => errs.push('js: ' + e.message));
      p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
      await p.goto(`http://localhost:8765/apps/${x.slug}/`);
      await p.evaluate(() => localStorage.clear()); await p.reload();
      const over = async tag => { const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) errs.push(`${tag}: sideways scroll ${o}px`); };
      await over('home');
      const body = await p.textContent('body');
      if (!body.includes(x.name)) errs.push('name missing');
      if (x.phoneShow && !body.includes(x.phoneShow)) errs.push('phone missing');
      if (x.email && !body.includes(x.email)) errs.push('email missing');
      if (x.phone && !(await p.$(`a[href="tel:${x.phone}"]`))) errs.push('no call link');
      if (/undefined|NaN|\[object/.test(body)) errs.push('bad text: ' + (body.match(/.{0,30}(undefined|NaN|\[object).{0,30}/) || [''])[0]);
      if (dev === 'phone' && SHOTS) await p.screenshot({path: `${SHOTS}/${x.slug}-home.png`, fullPage: true});
      if (x.mode === 'link') {
        const prim = x.links.find(l => l.primary);
        const a = await p.$('.btn.hero1');
        const href = a && await a.getAttribute('href');
        if (href !== prim.url) errs.push('primary link wrong: ' + href);
        if (a && await a.getAttribute('target') !== '_blank') errs.push('primary not new tab');
        const tabs = await p.$$('[data-tab]');
        if (tabs.length > 1) { await tabs[1].click(); if (!(await p.$$('#cards .card')).length) errs.push('tab empty'); }
      } else {
        await p.click('.btn.hero1');
        for (let guard = 0; guard < 12; guard++) {
          if (await p.$('.done')) break;
          const title = await p.textContent('#stepName');
          if (/Review/.test(title)) {
            const rev = await p.textContent('.rev');
            if (/undefined|NaN/.test(rev)) errs.push('review text bad');
            await p.click('#nextBtn'); continue;
          }
          if (await p.$('[data-svc]')) { const o = await p.$$('[data-svc]'); await o[0].click(); }
          for (let pass = 0; pass < 3; pass++) {
            const groups = await p.$$eval('[data-fs]', els => [...new Set(els.map(e => e.dataset.fs))]);
            for (const g of groups) { if (!(await p.$(`[data-fs="${g}"][aria-pressed=true]`))) { const o = await p.$(`[data-fs="${g}"]`); if (o) await o.click(); } }
          }
          for (const g of await p.$$eval('[data-fm]', els => [...new Set(els.map(e => e.dataset.fm))])) await p.click(`[data-fm="${g}"]`);
          for (const el of await p.$$('input[data-fk]')) { if (!(await el.inputValue())) await el.fill('Test 123'); }
          for (const el of await p.$$('textarea[data-fk]')) { if (!(await el.inputValue())) await el.fill('Test details'); }
          if (await p.$('.day')) {
            const days = await p.$$eval('.day:not(:disabled)', e => e.map(d => d.dataset.day));
            if (!(await p.$('.day[aria-pressed=true]'))) {
              await p.click(`[data-day="${days[0]}"]`);
              if ((await p.textContent('.side')).includes('check-out') || (await p.textContent('#sum')).includes('check-out')) await p.click(`[data-day="${days[3] || days[1]}"]`);
            }
            const s = await p.$('[data-slot]'); if (s && !(await p.$('[data-slot][aria-pressed=true]'))) await s.click();
            if (dev === 'phone' && SHOTS && !(await p.$('.shot-done'))) { await p.waitForTimeout(300); await p.screenshot({path: `${SHOTS}/${x.slug}-when.png`, fullPage: true}); }
          }
          if (await p.$('#street')) { if (!(await p.inputValue('#street'))) await p.fill('#street', '123 Main St NE'); if (!(await p.inputValue('#zip'))) await p.fill('#zip', '55449'); }
          if (await p.$('#name')) { if (!(await p.inputValue('#name'))) await p.type('#name', 'Test Person'); if (!(await p.inputValue('#phone'))) await p.type('#phone', '7635550123'); }
          await over('step ' + title);
          const before = await p.textContent('#stepName');
          await p.click('#nextBtn');
          if ((await p.$('#stepName')) && (await p.textContent('#stepName')) === before && !(await p.$('.done'))) { errs.push(`stuck on "${before}": ${await p.textContent('#sum')} ${(await p.$('#err')) ? await p.textContent('#err') : ''}`); break; }
        }
        if (!(await p.$('.done'))) errs.push('never reached done');
        else {
          if (x.email && !(await p.$(`.done a[href^="mailto:${x.email}"]`))) errs.push('no email send');
          if (x.text && !(await p.$(`.done a[href^="sms:${x.text}"]`))) errs.push('no text send');
          if (x.phone && !(await p.$(`.done a[href="tel:${x.phone}"]`))) errs.push('no call on done');
          await p.reload(); await p.click('#mineBtn');
          if ((await p.$$('.req')).length !== 1) errs.push('request not saved');
        }
      }
      if (errs.length) res.push(`${dev}: ${errs.join(' | ')}`);
      await p.close();
    }
    if (res.length) fails++;
    console.log(x.slug.padEnd(34), res.length ? 'FAIL\n   ' + res.join('\n   ') : 'OK');
  }
  console.log(fails ? `${fails} apps with problems` : 'all apps OK');
  await b.close();
})();
