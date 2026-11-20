// Browser test of the main flows, with the real on-device text reader.
// Needs a local server at the repo root:  npx http-server -p 8765 -c-1 .
// Run: node screenshot-done/tests/browser-test.js   (set SHOTS=dir to save screenshots)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL0 = 'http://localhost:8765/screenshot-done/';
const SHOTS = process.env.SHOTS;
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) pass++; else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } }

async function noOverflow(p, name) {
  const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  ok('no sideways scroll: ' + name, w[0] <= w[1], w);
}
async function shot(p, name, full) { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: !!full }); }
async function waitReview(p) { await p.waitForSelector('#r-next, .card h2:has-text("Could not read")', { timeout: 120000 }); }
async function sample(p, key) { await p.goto(URL0 + '#/home'); await p.waitForTimeout(300); const vw = await p.evaluate(() => window.innerWidth); ok('page never wider than the screen (' + key + ')', vw <= 1440 && vw === p.viewportSize().width, [vw, p.viewportSize().width]); await p.click('#h-sample'); await p.click(`[data-s=${key}]`); await waitReview(p); }
async function readDownload(dl) { const path = await dl.path(); return fs.readFileSync(path, 'utf8'); }

(async () => {
  const b = await chromium.launch();

  /* ---------- iPhone: full journeys ---------- */
  const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  await p.goto(URL0);
  await p.waitForSelector('#w-go');
  ok('first visit shows welcome', p.url().endsWith('#/welcome'));
  await p.waitForTimeout(1600); await shot(p, 'iphone-1-welcome'); await noOverflow(p, 'welcome');
  await p.click('#w-go'); await p.waitForSelector('.addcard');
  ok('home has add button', await p.isVisible('.addcard'));
  ok('home empty state honest', (await p.textContent('#view')).includes('Nothing coming up yet'));
  await shot(p, 'iphone-2-home-empty'); await noOverflow(p, 'home');
  await p.reload(); await p.waitForSelector('.addcard');
  ok('welcome only once', p.url().endsWith('#/home'));

  // A. Dentist -> event -> .ics
  await sample(p, 'dentist');
  let d = await p.evaluate(() => SDApp.state.draft);
  ok('dentist category', d.f.category === 'appointment', d.f.category);
  ok('dentist date', d.f.date === '2026-11-24', d.f.date);
  ok('dentist time', d.f.time === '15:30', d.f.time);
  ok('dentist place', d.f.location === '410 Main St, Blaine MN', d.f.location);
  ok('dentist title guessed + marked', d.lv.title === 'guess');
  ok('nav hidden during review', !(await p.isVisible('.rail')));
  await shot(p, 'iphone-3-review'); await noOverflow(p, 'review');
  ok('event suggested first', (await p.getAttribute('[data-act=event]', 'aria-pressed')) === 'true');
  ok('continue enabled', !(await p.isDisabled('#r-next')));
  await p.click('#r-next'); await p.waitForSelector('#c-go');
  ok('confirm says not in calendar until opened', (await p.textContent('#view')).includes('not in your calendar until you open the file'));
  await p.click('[data-alarm="15"]');
  await shot(p, 'iphone-4-confirm'); await noOverflow(p, 'confirm');
  let [dl] = await Promise.all([p.waitForEvent('download'), p.click('#c-go')]);
  let ics = await readDownload(dl);
  ok('ics file name', dl.suggestedFilename().endsWith('.ics'), dl.suggestedFilename());
  ok('ics start', ics.includes('DTSTART:20261124T153000'), ics);
  ok('ics end +1h', ics.includes('DTEND:20261124T163000'));
  ok('ics alarm 15', ics.includes('TRIGGER:-PT15M'));
  ok('ics location escaped', ics.includes('LOCATION:410 Main St\\, Blaine MN'));
  ok('ics CRLF', ics.includes('\r\n'));
  await p.waitForSelector('.success');
  let txt = await p.textContent('#view');
  ok('done screen is honest', txt.includes('not in your calendar yet'));
  await p.waitForTimeout(900); await shot(p, 'iphone-5-done'); await noOverflow(p, 'done');
  await p.goto(URL0 + '#/home'); await p.waitForSelector('.addcard');
  ok('home asks to confirm calendar', (await p.textContent('#view')).includes('not confirmed'));
  ok('home coming up shows dentist', (await p.textContent('.items')).includes('Bright Smile Dental'));
  await shot(p, 'iphone-6-home-items');
  await p.click('.notice.info'); await p.waitForSelector('#i-added');
  await p.click('#i-added'); await p.waitForSelector('.chip.green');
  ok('marked as added', (await p.textContent('.chip.green')).includes('You marked it as added'));

  // B. Essay: relative date must be confirmed, reminder needs a time the user picks
  await sample(p, 'essay');
  d = await p.evaluate(() => SDApp.state.draft);
  ok('essay date empty until picked', d.f.date === '', d.f.date);
  ok('essay options', JSON.stringify(d.dateOptions) === JSON.stringify(['2026-11-20', '2026-11-27']) || d.dateOptions.length === 2, d.dateOptions);
  ok('continue blocked until date picked', await p.isDisabled('#r-next'));
  ok('hint explains', (await p.textContent('#r-hint')).includes('next Friday'));
  await shot(p, 'iphone-7-review-confirm');
  await p.click('[data-date]:nth-child(2)');
  ok('continue enabled after pick', !(await p.isDisabled('#r-next')));
  d = await p.evaluate(() => SDApp.state.draft);
  ok('picked date', d.f.date === d.dateOptions[1]);
  ok('reminder suggested for assignment', d.action === 'reminder', d.action);
  await p.click('#r-next'); await p.waitForSelector('#c-go');
  ok('reminder needs a time', await p.isDisabled('#c-go'));
  ok('honest about notifications', (await p.textContent('#view')).includes('cannot send phone notifications'));
  await p.fill('#rt', '18:00');
  ok('reminder enabled after time', !(await p.isDisabled('#c-go')));
  await shot(p, 'iphone-8-reminder');
  await p.click('#c-go'); await p.waitForSelector('.success');
  let items = await p.evaluate(() => SDStore.all());
  let rem = items.find(i => i.kind === 'reminder');
  const dayBefore = (x => { const t = new Date(x + 'T12:00'); t.setDate(t.getDate() - 1); return t.toISOString().slice(0, 10); })(rem.date);
  ok('reminder saved day before', rem && rem.remindDate === dayBefore && rem.remindTime === '18:00', rem);
  ok('no calendar claim for in-app reminder', rem && rem.calendar === null);

  // C. Essay as checklist
  await sample(p, 'essay');
  await p.click('[data-date]'); await p.click('[data-act=checklist]'); await p.click('#r-next'); await p.waitForSelector('#cl');
  ok('3 steps from screenshot', (await p.$$('#cl input')).length === 3);
  await p.click('#cl-add'); await p.fill('#cl .cl-row:last-child input', 'Proofread');
  await p.click('#c-go'); await p.waitForSelector('.success');
  await p.click('text=View item'); await p.waitForSelector('#icl');
  for (let i = 0; i < 4; i++) { await p.click(`[data-ci="${i}"]`); await p.waitForTimeout(150); }
  items = await p.evaluate(() => SDStore.all());
  let cl = items.find(i => i.kind === 'checklist');
  ok('checklist 4 items all done -> item done', cl && cl.checklist.length === 4 && cl.done === true, cl);
  await shot(p, 'iphone-9-checklist'); await noOverflow(p, 'item');

  // D. Receipt
  await sample(p, 'receipt');
  d = await p.evaluate(() => SDApp.state.draft);
  ok('receipt category', d.f.category === 'receipt');
  ok('receipt total', d.f.amount === '$9.45', d.f.amount);
  ok('receipt action first', d.action === 'receipt');
  await p.click('#r-next'); await p.click('#c-go'); await p.waitForSelector('.success');
  await p.goto(URL0 + '#/saved'); await p.waitForSelector('#q');
  await p.click('[data-cat=receipt]');
  ok('receipt total shown', (await p.textContent('.totals')).includes('$9.45'));
  [dl] = await Promise.all([p.waitForEvent('download'), p.click('#csv')]);
  const csv = await readDownload(dl);
  ok('csv content', csv.startsWith('Date,Title,Amount') && csv.includes('$9.45'), csv);
  await shot(p, 'iphone-10-saved');
  await p.goto(URL0 + '#/home'); await p.waitForTimeout(400);
  ok('saved receipt shows in Recently saved', (await p.textContent('#view')).includes('Receipt: Corner Cafe'));
  await p.goto(URL0 + '#/saved'); await p.waitForSelector('#q');
  await p.click('[data-cat=all]');
  await p.fill('#q', 'civil');
  ok('search finds essay', (await p.textContent('#list')).includes('Civil War'));
  await p.fill('#q', 'zzzz');
  ok('search no match', (await p.textContent('#list')).includes('Nothing matches'));
  await noOverflow(p, 'saved');

  // E. Typed text with no date: nothing invented, event blocked
  await p.goto(URL0 + '#/paste'); await p.fill('#pt', 'lol ok see you there'); await p.click('#pt-go'); await waitReview(p);
  d = await p.evaluate(() => SDApp.state.draft);
  ok('no date invented', d.f.date === '' && d.f.time === '' && d.f.location === '' && d.f.amount === '', d.f);
  ok('save suggested', d.action === 'save', d.action);
  await p.click('[data-act=reminder]');
  ok('reminder without date blocked', await p.isDisabled('#r-next'));
  ok('blocked hint', (await p.textContent('#r-hint')).includes('needs a date'));
  await p.fill('#f-date', '2026-12-01'); await p.dispatchEvent('#f-date', 'change');
  ok('typed date unblocks', !(await p.isDisabled('#r-next')));

  // F. Real image upload (a rendered screenshot), privacy default: picture not kept
  const shotPage = await ctx.newPage();
  await shotPage.setContent('<body style="font:22px Arial;padding:30px;background:#fff"><b>Riverside Yoga</b><p>Booking confirmed</p><p>Sat, Dec 5, 2026</p><p>9:00 AM - 10:15 AM</p><p>Where: 22 Oak Ave Studio B</p></body>');
  const png = await shotPage.screenshot(); await shotPage.close();
  await p.goto(URL0 + '#/home'); await p.waitForSelector('.addcard');
  await p.setInputFiles('#file', { name: 'IMG_0001.PNG', mimeType: 'image/png', buffer: png });
  await waitReview(p);
  d = await p.evaluate(() => SDApp.state.draft);
  ok('upload: booking', d.f.category === 'booking', d.f.category);
  ok('upload: date', d.f.date === '2026-12-05', d.f.date);
  ok('upload: time range', d.f.time === '09:00' && d.f.endTime === '10:15', [d.f.time, d.f.endTime]);
  ok('upload: place', d.f.location === '22 Oak Ave Studio B', d.f.location);
  await p.click('#r-next'); await p.waitForSelector('#c-go');
  ok('keep picture off by default', !(await p.isChecked('#keepImg')));
  [dl] = await Promise.all([p.waitForEvent('download'), p.click('#c-go')]);
  ics = await readDownload(dl);
  ok('ics range', ics.includes('DTSTART:20261205T090000') && ics.includes('DTEND:20261205T101500'));
  items = await p.evaluate(() => SDStore.all());
  ok('no picture stored', items.every(i => !i.image));
  ok('no raw text stored by default', items.every(i => !i.text));
  let month = await p.evaluate(() => SDStore.getKV('count-' + SDParse.ymd(new Date()).slice(0, 7), 0));
  ok('usage counts real uploads only (not samples)', month === 1, month);

  // keep picture when asked
  await p.goto(URL0 + '#/home'); await p.waitForSelector('.addcard');
  await p.setInputFiles('#file', { name: 'IMG_0002.PNG', mimeType: 'image/png', buffer: png });
  await waitReview(p); await p.click('[data-act=save]'); await p.click('#r-next'); await p.check('#keepImg'); await p.click('#c-go'); await p.waitForSelector('.success');
  items = await p.evaluate(() => SDStore.all());
  const withImg = items.find(i => i.image);
  ok('picture kept when chosen', !!withImg && withImg.image.startsWith('data:image/jpeg'));
  await p.goto(URL0 + '#/item/' + withImg.id); await p.waitForSelector('#i-delimg');
  await shot(p, 'iphone-11-item-image');
  await p.click('#i-delimg'); await p.waitForTimeout(300);
  items = await p.evaluate(() => SDStore.all());
  ok('delete picture copy', items.every(i => !i.image));

  // G. Delete one item, then everything
  const n0 = items.length;
  await p.goto(URL0 + '#/item/' + items[0].id); await p.waitForSelector('#i-del'); await p.click('#i-del'); await p.click('#m-del'); await p.waitForTimeout(300);
  ok('delete one item', (await p.evaluate(() => SDStore.all())).length === n0 - 1);
  await p.goto(URL0 + '#/settings'); await p.waitForSelector('#s-wipe');
  await shot(p, 'iphone-12-settings', true); await noOverflow(p, 'settings');
  ok('settings lists limits', (await p.textContent('#view')).includes('Needs native app'));
  ok('pricing labeled hypothesis', (await p.textContent('#view')).includes('Idea being tested'));
  await p.click('#s-wipe'); await p.click('#m-wipe'); await p.waitForSelector('#w-go');
  ok('wipe empties items', (await p.evaluate(() => SDStore.all())).length === 0);

  // H. Offline after first visit
  await p.goto(URL0 + '#/home'); await p.reload(); await p.waitForTimeout(2000);
  await ctx.setOffline(true); await p.reload(); await p.waitForSelector('#view *', { timeout: 10000 }).catch(() => { });
  ok('opens offline', (await p.textContent('body')).includes('Screenshot'));
  await ctx.setOffline(false);
  ok('no JS errors (iPhone)', errs.length === 0, errs);
  await ctx.close();

  /* ---------- sizes: iPhone SE, iPad mini, iPad Pro landscape, desktop ---------- */
  const sizes = [['iPhone SE', devices['iPhone SE']], ['iPad Mini', devices['iPad Mini']], ['iPad Pro 11 landscape', devices['iPad Pro 11 landscape']], ['Desktop', { viewport: { width: 1440, height: 900 } }]];
  for (const [name, dev] of sizes) {
    const c = await b.newContext({ ...dev });
    const q = await c.newPage(); const e2 = []; q.on('pageerror', e => e2.push(e.message));
    await q.goto(URL0); await q.waitForSelector('#w-go'); await noOverflow(q, name + ' welcome'); await q.click('#w-go'); await q.waitForSelector('.addcard');
    await noOverflow(q, name + ' home');
    await sample(q, 'essay'); await noOverflow(q, name + ' review');
    await q.click('[data-date]'); await shot(q, name.replace(/ /g, '-') + '-review');
    await q.click('#r-next'); await q.fill('#rt', '09:00'); await q.click('#c-go'); await q.waitForSelector('.success');
    for (const h of ['#/home', '#/saved', '#/settings']) { await q.goto(URL0 + h); await q.waitForTimeout(300); await noOverflow(q, name + ' ' + h); }
    await q.goto(URL0 + '#/home'); await q.waitForTimeout(400); await shot(q, name.replace(/ /g, '-') + '-home');
    ok('no JS errors ' + name, e2.length === 0, e2);
    await c.close();
  }
  await b.close();
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
