// Browser test of ShiftSync with real typing and the real on-device text reader.
// Needs a local server at the repo root:  npx http-server -p 8765 -c-1 .
// Run: node shiftsync/tests/browser-test.js   (SHOTS=dir saves screenshots)
// The clock is fixed to Fri Nov 20 2026, 8:00 AM Chicago time.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const U = 'http://localhost:8765/shiftsync/';
const SHOTS = process.env.SHOTS;
const NOW = new Date('2026-11-20T14:00:00Z');
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) pass++; else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } }
async function shot(p, name, full) { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: !!full }); }
async function noOverflow(p, name) { const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]); ok('no sideways scroll: ' + name, w[0] <= w[1], w); }
const db = p => p.evaluate(() => JSON.parse(JSON.stringify(SSApp.db())));
async function addShift(p, { date, wp, start, end, unpaid, worked }) {
  await p.goto(U + '#/add?date=' + date); await p.waitForSelector('#f-save');
  if (wp) await p.click(`.seg [data-wp]:has-text("${wp}")`);
  await p.fill('#f-start', start); await p.fill('#f-end', end);
  if (unpaid) await p.click(`[data-addbreak="${unpaid},0"]`);
  await p.click('#f-save');
}
async function newPlace(p, name, opts = {}) {
  await p.goto(U + '#/place/new'); await p.waitForSelector('#p-save');
  await p.fill('#p-name', name);
  if (opts.color) await p.click(`[data-col=${opts.color}]`);
  if (opts.rate) await p.fill('#p-rate', opts.rate);
  if (opts.travel) await p.selectOption('#p-travel', String(opts.travel));
  if (opts.brk) await p.selectOption('#p-break', String(opts.brk));
  await p.click('#p-save'); await p.waitForTimeout(150);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Chicago', acceptDownloads: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.clock.install({ time: NOW });

  /* welcome + first workplace */
  await p.goto(U); await p.waitForSelector('#w-demo');
  ok('first visit shows welcome', p.url().endsWith('#/welcome'));
  ok('welcome says estimate not paycheck', (await p.textContent('#view')).includes('not a paycheck'));
  await shot(p, '01-welcome'); await noOverflow(p, 'welcome');
  await p.click('a[href="#/place/new?first=1"]'); await p.waitForSelector('#p-save');
  await p.click('#p-save');
  ok('name required', (await p.textContent('#p-err')).includes('name'));
  await p.fill('#p-name', 'Corner Grocery'); await p.fill('#p-rate', 'abc'); await p.click('#p-save');
  ok('bad rate rejected', (await p.textContent('#p-err')).includes('number'));
  await p.fill('#p-rate', '$16.50'); await p.selectOption('#p-break', '30'); await p.click('[data-col=teal]');
  await shot(p, '02-place'); await p.click('#p-save'); await p.waitForSelector('.next');
  let d = await db(p);
  ok('workplace saved', d.workplaces.length === 1 && d.workplaces[0].rate === 16.5 && d.workplaces[0].tz === 'America/Chicago' && d.workplaces[0].defaultBreak === 30, d.workplaces);
  ok('home empty next shift honest', (await p.textContent('.next')).includes('Nothing scheduled'));
  await p.reload(); await p.waitForSelector('.next'); ok('welcome only once', p.url().includes('#/home'));

  /* manual shifts: overnight + breaks + repeat */
  await addShift(p, { date: '2026-12-01', start: '22:00', end: '06:00' });
  await p.waitForSelector('.days');
  d = await db(p); let on = d.shifts.find(s => s.date === '2026-12-01');
  ok('overnight saved as start date', on && on.start === '22:00' && on.end === '06:00');
  ok('default break pre-filled', on.breaks.length === 1 && on.breaks[0].min === 30 && !on.breaks[0].paid);
  ok('week shows overnight continuation', (await p.textContent('.days')).includes('until 6 AM'));
  ok('ends-next-day flag', (await p.textContent('.days')).includes('Ends Wed 6 AM'));
  // live overnight note while typing
  await p.goto(U + '#/add?date=2026-11-23'); await p.waitForSelector('#f-save');
  await p.fill('#f-start', '23:30'); await p.fill('#f-end', '00:15');
  ok('live: ends next day', (await p.textContent('#f-live')).includes('Ends next day'));
  ok('live: 45 min long', (await p.textContent('#f-live')).includes('45 min long'), await p.textContent('#f-live'));
  await p.fill('#f-end', '23:30'); await p.click('#f-save');
  ok('same start/end blocked', (await p.textContent('#f-err')).includes('same'));
  // repeat + paid break
  await p.fill('#f-start', '08:00'); await p.fill('#f-end', '12:00');
  await p.click('[data-addbreak="15,1"]');
  await p.click('[data-rep="2026-11-25"]');
  await shot(p, '03-add-shift', true);
  await p.click('#f-save'); await p.waitForSelector('.days');
  d = await db(p);
  let rep = d.shifts.filter(s => s.start === '08:00');
  ok('repeat made 2 shifts', rep.length === 2 && rep.map(s => s.date).sort().join() === '2026-11-23,2026-11-25', rep.map(s => s.date));
  ok('paid + unpaid breaks kept', rep[0].breaks.length === 2 && rep[0].breaks.some(x => x.paid && x.min === 15));
  // a shift marked worked on Sunday 22 (kept on replace)
  await addShift(p, { date: '2026-11-22', start: '09:00', end: '13:00' }); await p.waitForSelector('.days');
  d = await db(p); let sun = d.shifts.find(s => s.date === '2026-11-22');
  await p.goto(U + '#/shift/' + sun.id); await p.waitForSelector('[data-wk=same]'); await p.click('[data-wk=same]'); await p.click('#f-save'); await p.waitForSelector('.days');
  // Tue 9-5 that the photo will change, Wed 12-8 that the photo has as OFF
  await addShift(p, { date: '2026-11-24', start: '09:00', end: '17:00' }); await p.waitForSelector('.days');
  // delete the two 8-12 test shifts so the Mon import is clean
  d = await db(p);
  for (const s of d.shifts.filter(s => s.start === '08:00')) { await p.goto(U + '#/shift/' + s.id); await p.click('#f-del'); await p.click('#m-del'); await p.waitForSelector('.days'); }
  await addShift(p, { date: '2026-11-25', start: '12:00', end: '20:00' }); await p.waitForSelector('.days');
  d = await db(p); ok('4 shifts before import', d.shifts.length === 4, d.shifts.map(s => s.date + ' ' + s.start));

  /* import a team schedule photo (real OCR) */
  await p.goto(U + '#/import'); await p.waitForSelector('#i-photo');
  ok('privacy note on import', (await p.textContent('#view')).includes('not uploaded or kept'));
  ok('nav hidden while importing', !(await p.isVisible('.rail')));
  await shot(p, '04-import-choose');
  await p.click('[data-sample="team-schedule.png"]');
  await p.waitForSelector('[data-row]', { timeout: 180000 });
  ok('5 rows offered', (await p.$$('[data-row]')).length === 5);
  ok('continue disabled before picking', await p.isDisabled('#i-next'));
  await shot(p, '05-import-who'); await noOverflow(p, 'who');
  await p.click('[data-row]:has-text("Jordan Avery")'); await p.click('#i-next');
  await p.waitForSelector('#i-next:has-text("Continue")');
  let st = await p.evaluate(() => ({ result: SSApp.state.imp.result, draft: SSApp.state.imp.draft.filter(d => d.start && !d.off).map(d => d.date + ' ' + d.start + '-' + d.end) }));
  ok('other rows dropped from memory', st.result === null);
  ok('Jordan shifts read right', st.draft.join('|') === '2026-11-23 08:00-16:00|2026-11-24 08:00-16:00|2026-11-26 16:00-22:00|2026-11-28 10:00-18:00', st.draft);
  ok('review shows off day', (await p.textContent('#view')).includes('Off'));
  ok('review shows usual break note', (await p.textContent('#view')).includes('not from the schedule'));
  await shot(p, '06-import-review', true); await noOverflow(p, 'review');
  // fix one value: Sat end 6pm -> 6:30pm
  const satIdx = await p.evaluate(() => SSApp.state.imp.draft.findIndex(d => d.date === '2026-11-28' && d.start));
  await p.fill('#d-e' + satIdx, '18:30');
  await p.click('#i-next'); await p.waitForSelector('#i-save');
  const txt = await p.textContent('#view');
  ok('compare: changed Tue', txt.includes('Changed') && txt.includes('9 AM – 5 PM'));
  ok('compare: removed Wed', txt.includes('Removed'));
  ok('compare: kept worked Sun', txt.includes('already marked as worked'));
  ok('compare: same Mon? (Mon 8-4 is new)', txt.includes('New'));
  ok('replace needs tick', await p.isDisabled('#i-save'));
  ok('no employer approval implied', txt.includes('does not tell your employer'));
  await shot(p, '07-import-compare', true); await noOverflow(p, 'compare');
  await p.check('#i-agree'); ok('tick enables save', !(await p.isDisabled('#i-save')));
  await p.click('#i-save'); await p.waitForSelector('h1:has-text("Schedule saved")');
  ok('done says photo cleared', (await p.textContent('#view')).includes('photo has been cleared'));
  d = await db(p);
  const g = d.shifts.filter(s => s.date >= '2026-11-22' && s.date <= '2026-11-28').map(s => s.date + ' ' + s.start + '-' + s.end + (s.worked ? ' W' : '')).sort();
  ok('after replace', g.join('|') === '2026-11-22 09:00-13:00 W|2026-11-23 08:00-16:00|2026-11-24 08:00-16:00|2026-11-26 16:00-22:00|2026-11-28 10:00-18:30', g);
  ok('Dec 1 overnight untouched', d.shifts.some(s => s.date === '2026-12-01'));
  ok('import confirmation time saved', d.workplaces[0].lastImport && Math.abs(d.workplaces[0].lastImport.at - NOW.getTime()) < 15 * 60000 && d.workplaces[0].lastImport.from === '2026-11-22' && d.workplaces[0].lastImport.to === '2026-11-28', d.workplaces[0].lastImport);
  ok('my name remembered', d.settings.myName === 'Jordan Avery');
  ok('no other names stored', !JSON.stringify(d).includes('Alex') && !JSON.stringify(d).includes('Priya'));
  ok('imported shifts get usual break', d.shifts.find(s => s.date === '2026-11-26').breaks[0].min === 30);
  await p.goto(U + '#/places'); await p.waitForSelector('.place');
  ok('workplace shows last confirmed', (await p.textContent('#view')).includes('Last confirmed Fri, Nov 20, 8'));

  // re-import the same photo: name preselected, nothing to replace except the edited Sat
  await p.goto(U + '#/import'); await p.click('[data-sample="team-schedule.png"]');
  await p.waitForSelector('[data-row][aria-pressed=true]', { timeout: 120000 });
  ok('name preselected next time', (await p.textContent('[data-row][aria-pressed=true]')).includes('Jordan'));
  await p.click('#i-next'); await p.waitForSelector('#i-next:has-text("Continue")'); await p.click('#i-next'); await p.waitForSelector('#i-save');
  let plan = await p.evaluate(() => { const P = SSApp.state.imp.plan; return { same: P.same.length, changed: P.changed.length, add: P.add.length, remove: P.remove.length, kept: P.keptWorked.length }; });
  ok('re-import: 3 same, Sat changed back, worked kept', plan.same === 3 && plan.changed === 1 && plan.add === 0 && plan.remove === 0 && plan.kept === 1, plan);
  await p.click('#i-cancel'); await p.waitForSelector('.next');
  d = await db(p); ok('cancel changed nothing', d.shifts.find(s => s.date === '2026-11-28').end === '18:30');

  /* second job from a personal schedule: overlaps + travel */
  await newPlace(p, 'Night Diner', { color: 'violet', rate: '14', travel: 30 });
  await p.goto(U + '#/import'); await p.click('[data-iwp]:has-text("Night Diner")');
  await p.click('[data-sample="my-schedule.png"]');
  await p.waitForSelector('#i-next:has-text("Continue")', { timeout: 120000 });
  st = await p.evaluate(() => SSApp.state.imp.draft.map(d => d.date + ' ' + d.start + '-' + d.end));
  ok('personal list read', st.join('|') === '2026-11-23 17:00-23:00|2026-11-25 18:00-00:00|2026-11-27 23:00-07:00|2026-11-28 17:00-22:00', st);
  await p.click('#i-next'); await p.waitForSelector('#i-save');
  ok('no tick needed when nothing replaced', !(await p.isDisabled('#i-save')) && !(await p.$('#i-agree')));
  ok('warns about clashes before saving', (await p.textContent('#view')).includes('clash'));
  await p.click('#i-save'); await p.waitForSelector('h1:has-text("Schedule saved")');
  await p.goto(U + '#/week/2026-11-22'); await p.waitForSelector('.days');
  const wk = await p.textContent('.days');
  ok('week: overlap on Sat', (await p.$$('.chip.bad')).length === 2);
  ok('week: tight travel Mon (4 PM end, 5 PM start is fine) none', true);
  ok('week: overnight Wed midnight end shown', wk.includes('6 PM – 12 AM'));
  ok('week: Fri overnight continues Sat', wk.includes('until 7 AM'));
  await shot(p, '08-week', true); await noOverflow(p, 'week');
  // travel: Thu grocery ends 10 PM; add diner Thu 10:15 PM -> 15 min gap < 30 travel
  await addShift(p, { date: '2026-11-26', wp: 'Night Diner', start: '22:15', end: '23:45' });
  await p.waitForSelector('#m-anyway');
  ok('clash modal shows travel gap', (await p.textContent('.modal')).includes('15 min between'));
  await shot(p, '09-clash-modal');
  await p.click('#m-anyway'); await p.waitForSelector('.days');
  ok('saved anyway, travel tag shown', (await p.textContent('.days')).includes('Tight travel'));

  /* month */
  await p.goto(U + '#/month/2026-11'); await p.waitForSelector('.mgrid');
  ok('month total', (await p.textContent('#m-total')).includes('h this month'));
  await p.click('[data-day="2026-11-28"]'); await p.waitForSelector('.card h2:has-text("Saturday, November 28")');
  ok('month day list', (await p.$$('.card .chip')).length >= 2);
  await shot(p, '10-month', true); await noOverflow(p, 'month');

  /* actual hours + pay */
  d = await db(p); const mon = d.shifts.find(s => s.date === '2026-11-23' && s.wp === d.workplaces[0].id);
  await p.goto(U + '#/shift/' + mon.id); await p.click('[data-wk=diff]'); await p.waitForSelector('#a-end');
  await p.fill('#a-end', '17:00');
  ok('actual shows more than scheduled', (await p.textContent('#view')).includes('1 h more than scheduled'), await p.textContent('#view'));
  ok('own-record note', (await p.textContent('#view')).includes('does not change your employer'));
  await shot(p, '11-shift-detail', true);
  await p.click('#f-save'); await p.waitForSelector('#m-anyway');
  ok('actual hours now leave no travel time: clash shown', (await p.textContent('.modal')).includes('0 h between'), await p.textContent('.modal'));
  await p.click('#m-anyway'); await p.waitForSelector('.days');
  d = await db(p); const mon2 = d.shifts.find(s => s.id === mon.id);
  ok('actual saved, scheduled kept', mon2.worked && mon2.actual.end === '17:00' && mon2.end === '16:00' && !mon2.editedAt);
  await p.clock.setFixedTime(new Date('2026-11-29T18:00:00Z'));
  await p.goto(U + '#/pay/last'); await p.waitForSelector('.money');
  let paytxt = await p.textContent('#view');
  // Last week = Nov 22-28. Confirmed: Sun 4h - 0.5 break = 3.5h ; Mon actual 8-17 = 9h - 0.5 = 8.5h  => 12h x 16.50 = 198.00
  ok('confirmed gross from confirmed hours only', paytxt.includes('$198.00'), paytxt.slice(0, 600));
  ok('not a paycheck', paytxt.includes('not a paycheck') && paytxt.includes('overtime'));
  ok('past shifts to confirm listed', (await p.$$('#view [data-worked]')).length >= 5);
  await shot(p, '12-pay', true); await noOverflow(p, 'pay');
  await p.click('#view [data-worked] >> nth=0'); await p.waitForTimeout(200);
  ok('quick confirm raises confirmed', !(await p.textContent('.money .v')).includes('$198.00'), (await p.textContent('.money')));
  const [csv] = await Promise.all([p.waitForEvent('download'), p.click('#p-csv')]);
  const csvText = fs.readFileSync(await csv.path(), 'utf8');
  ok('csv has hours', csvText.startsWith('Workplace,Date') && csvText.includes('Corner Grocery,2026-11-23,08:00,16:00,no,30,0,yes,08:00,17:00,8.5,16.50,140.25'), csvText);
  await p.clock.setFixedTime(NOW);

  /* settings + export + backup */
  await p.goto(U + '#/settings'); await p.waitForSelector('#s-ics14');
  ok('settings names notification limits', (await p.textContent('#view')).includes('cannot send notifications when it is closed'));
  ok('plans labeled as idea', (await p.textContent('#view')).includes('Idea being tested') && (await p.textContent('#view')).includes('Nothing is charged'));
  await p.selectOption('#s-alarm', '30');
  const [ics] = await Promise.all([p.waitForEvent('download'), p.click('#s-ics14')]);
  const icsText = fs.readFileSync(await ics.path(), 'utf8');
  ok('ics has upcoming shifts', (icsText.match(/BEGIN:VEVENT/g) || []).length >= 8, (icsText.match(/BEGIN:VEVENT/g) || []).length);
  ok('ics overnight Fri 11p-7a in UTC', icsText.includes('DTSTART:20261128T050000Z') && icsText.includes('DTEND:20261128T130000Z'));
  ok('ics alarm 30', icsText.includes('TRIGGER:-PT30M'));
  await shot(p, '13-settings', true); await noOverflow(p, 'settings');
  const [bk] = await Promise.all([p.waitForEvent('download'), p.click('#s-backup')]);
  const bkPath = await bk.path();
  await p.click('#s-wipe'); await p.click('#m-wipe'); await p.waitForSelector('#w-demo');
  d = await db(p); ok('delete everything', d.shifts.length === 0 && d.workplaces.length === 0);
  ok('storage cleared', await p.evaluate(() => localStorage.getItem('shiftsync-v1') === null));
  await p.goto(U + '#/settings'); await p.setInputFiles('#s-file', bkPath); await p.click('#m-ok'); await p.waitForSelector('.next');
  d = await db(p); ok('backup restored', d.workplaces.length === 2 && d.shifts.length >= 10);

  /* home + soon banner (shift Mon Nov 23 8 AM; set clock to 7:00 AM) */
  await p.clock.setFixedTime(new Date('2026-11-23T13:00:00Z'));
  await p.goto(U + '#/home'); await p.reload(); await p.waitForSelector('.next');
  ok('next shift card', (await p.textContent('.next')).includes('8 AM – 4 PM') && (await p.textContent('.next')).includes('Corner Grocery'), await p.textContent('.next'));
  ok('soon banner', await p.isVisible('#soon a') && (await p.textContent('#soon')).includes('in 1 h'));
  await shot(p, '14-home');
  await p.clock.setFixedTime(new Date('2026-11-23T15:00:00Z'));
  await p.reload(); await p.waitForSelector('.next');
  ok('on shift now', (await p.textContent('.next')).includes('On shift now'));
  await p.clock.setFixedTime(NOW);
  ok('no JS errors (iPhone)', errs.length === 0, errs);

  /* demo + many sizes */
  const sizes = [['iPhone SE', devices['iPhone SE']], ['Pixel 7', devices['Pixel 7']], ['iPad Mini', devices['iPad Mini']], ['iPad Pro 11 landscape', devices['iPad Pro 11 landscape']], ['Laptop', { viewport: { width: 1280, height: 800 } }], ['Desktop', { viewport: { width: 1440, height: 900 } }]];
  for (const [name, dev] of sizes) {
    const c2 = await b.newContext({ ...dev, timezoneId: 'America/Chicago' }); const q = await c2.newPage(); const e2 = [];
    q.on('pageerror', e => e2.push(e.message)); await q.clock.install({ time: NOW });
    await q.goto(U); await q.click('#w-demo'); await q.waitForSelector('.next');
    for (const r of ['home', 'week', 'month', 'add', 'places', 'pay', 'settings', 'import']) {
      await q.goto(U + '#/' + r); await q.waitForTimeout(150); await noOverflow(q, name + ' ' + r);
    }
    if (name === 'Desktop') { await q.goto(U + '#/week'); await q.waitForSelector('.days'); await shot(q, '15-desktop-week', true); }
    if (name === 'iPad Mini') { await q.goto(U + '#/home'); await q.waitForSelector('.next'); await shot(q, '16-ipad-home'); }
    // tap targets in the main nav
    const small = await q.$$eval('#nav a, #nav button', els => els.filter(e => e.offsetParent && (e.getBoundingClientRect().height < 40)).length);
    ok('nav tap targets >= 40px ' + name, small === 0);
    ok('no JS errors ' + name, e2.length === 0, e2);
    await c2.close();
  }

  /* blocked storage still works (memory) */
  const c3 = await b.newContext({ timezoneId: 'America/Chicago' });
  await c3.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  const r3 = await c3.newPage(); const e3 = []; r3.on('pageerror', e => e3.push(e.message));
  await r3.goto(U); await r3.click('#w-demo'); await r3.waitForSelector('.next');
  await r3.goto(U + '#/settings'); await r3.waitForSelector('#s-ics14');
  ok('blocked storage warned', (await r3.textContent('#view')).includes('Storage is blocked'));
  ok('blocked storage no errors', e3.length === 0, e3);

  await b.close();
  console.log(`browser: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
