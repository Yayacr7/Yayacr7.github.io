// Tests Amy in every app: real typing, answers come only from the business's data. Needs the local server on port 8765.
// Usage: node apps/booking/amy-check.js [screenshot-folder]
const { chromium } = require('playwright');
const list = require('./businesses.js');
const SHOTS = process.argv[2] || '';
const apps = [{slug:'vividly-clean', name:'Vividly Clean', mode:'request', phoneShow:'763.434.0206', address:'10130 Davenport St NE #140, Blaine, MN 55449'}].concat(list);
(async () => {
  const b = await chromium.launch(); let fails = 0;
  for (const x of apps) {
    const p = await b.newPage({viewport:{width:390, height:844}});
    const errs = [];
    p.on('pageerror', e => errs.push('js: ' + e.message));
    await p.goto(`http://localhost:8765/apps/${x.slug}/`);
    await p.evaluate(() => { try { localStorage.clear(); } catch(e){} }); await p.reload();
    if (!(await p.$('.amy-btn'))) { console.log(x.slug, 'FAIL no Amy button'); fails++; await p.close(); continue; }
    await p.click('.amy-btn');
    const last = async () => (await p.$$eval('.amy-m.a', e => e[e.length-1].innerText));
    const ask = async q => { await p.fill('#amy-in', q); await p.press('#amy-in', 'Enter'); await p.waitForTimeout(450); return last(); };
    const hello = await last();
    if (!/I’m Amy/.test(hello) || !hello.includes(x.name)) errs.push('greeting: ' + hello.slice(0, 80));
    const hrs = await ask('what are your hours?');
    if (x.hours ? !/(open right now|closed right now)/.test(hrs) : !/doesn’t list hours/.test(hrs)) errs.push('hours: ' + hrs.slice(0, 90));
    const pr = await ask('how much does it cost?');
    if (!/(Prices listed|doesn’t list|won’t guess)/.test(pr)) errs.push('price: ' + pr.slice(0, 90));
    const wh = await ask('where are you located?');
    if (x.address ? !wh.includes(x.address.split(',')[0]) : !/confirm/.test(wh)) errs.push('where: ' + wh.slice(0, 90));
    const ca = await ask('can I call you?');
    if (x.phoneShow && !ca.includes(x.phoneShow)) errs.push('call: ' + ca.slice(0, 90));
    if (!/can’t take or make phone calls/.test(ca)) errs.push('call honesty missing');
    const bot = await ask('are you a real person?');
    if (!/not a real person/.test(bot)) errs.push('bot honesty: ' + bot.slice(0, 80));
    const unk = await ask('is the moon made of cheese?');
    if (!/not sure|don’t want to guess/i.test(unk)) errs.push('unknown: ' + unk.slice(0, 90));
    if (/plumb|seasons/.test(x.slug)) { const em = await ask('help my pipe burst and is flooding'); if (!/urgent/.test(em)) errs.push('emergency: ' + em.slice(0, 80)); }
    if (/\$\d|\d{3,}/.test(unk) && !unk.includes(x.phoneShow || '###')) errs.push('unknown answer has numbers');
    const bk = await ask('I want to book an appointment');
    const actions = await p.$$eval('.amy-m.a:last-child .amy-acts a, .amy-m.a:last-child .amy-acts button', e => e.map(a => ({t:a.textContent, h:a.getAttribute('href')})));
    if (x.mode === 'request') {
      const bb = await p.$('.amy-m.a:last-child .amy-acts button');
      if (!bb) errs.push('no book button'); else { await bb.click(); await p.waitForTimeout(300); const flowShown = await p.$eval('#flow', f => !f.classList.contains('hide')); if (!flowShown) errs.push('book did not open the booking steps'); }
    } else {
      const prim = (x.links || []).find(l => l.primary);
      if (!actions.some(a => a.h === prim.url)) errs.push('book link wrong: ' + JSON.stringify(actions));
    }
    if (SHOTS && ['vividly-clean','augusta-greens','cutting-edge-barbershop','walsh-plumbing'].includes(x.slug)) {
      if (x.mode === 'request') { await p.click('#logoBtn').catch(() => {}); await p.click('.amy-btn'); }
      await p.waitForTimeout(200); await p.screenshot({path: `${SHOTS}/amy-${x.slug}.png`});
    }
    const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) errs.push('sideways ' + o);
    if (errs.length) fails++;
    console.log(x.slug.padEnd(34), errs.length ? 'FAIL\n   ' + errs.join('\n   ') : 'OK');
    await p.close();
  }
  console.log(fails ? fails + ' apps with problems' : 'Amy OK in all apps');
  await b.close();
})();
