// Browser test with real clicks and typing. Two tabs act as two people.
// Needs a local server at the repo root:  npx http-server -p 8765 -c-1 .
// Run: node family-handoff/tests/browser-test.js
// Optional: AXE_PATH=/path/to/axe.min.js runs an accessibility scan. SHOTS=dir saves screenshots.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const U = 'http://localhost:8765/family-handoff/';
const SHOTS = process.env.SHOTS;
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) pass++; else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } }
const text = async (p, sel) => (await p.textContent(sel || '#view')) || '';
async function shot(p, name) { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); }
async function noOverflow(p, name) { const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]); ok('no sideways scroll: ' + name, w[0] <= w[1], w); }
async function switchTo(p, who) {
  await p.click('#who'); await p.waitForSelector('.sheet');
  await p.click(`.sheet label.person:has-text("${who}")`); await p.click('.sheet button[type=submit]');
  await p.waitForSelector('#headline');
}
async function openTask(p, title) { await p.goto(U + '#/calendar'); await p.goto(U + '#/today'); await p.click(`.card:has-text("${title}") .stretch`); await p.waitForSelector('#task-title'); }
function watch(p, errs) { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); }

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const A = await ctx.newPage(); const errs = []; watch(A, errs);

  /* ---------- first run ---------- */
  await A.goto(U);
  await A.waitForSelector('#w-demo');
  ok('welcome explains the promise', (await text(A)).includes('Know who\'s doing what.'));
  ok('demo mode is labeled on first screen', (await text(A, 'body')).includes('Local demo') && (await text(A)).includes('Not an emergency service'));
  await shot(A, '01-welcome'); await noOverflow(A, 'welcome');
  await A.click('#w-demo'); await A.waitForSelector('#headline');
  ok('today headline is one plain sentence', /still needs someone|has someone|Nothing planned/.test(await text(A, '#headline')));
  ok('three status tiles', (await A.$$('.tile')).length === 3);
  ok('"Still needs someone" section visible', await A.isVisible('#needs'));
  ok('Asked of you shows the permission slip', (await text(A)).includes('Sign field trip permission slip'));
  await shot(A, '02-today'); await noOverflow(A, 'today');

  /* ---------- accept from Today ---------- */
  await A.click('.card.ask:has-text("permission slip") [data-act=accept]');
  await A.waitForSelector('.toast:has-text("Accepted")');
  ok('accepting shows confirmation', (await text(A, '.toast')).includes('Accepted'));
  ok('accepted card leaves "Asked of you"', !(await text(A)).includes('Asked of you'));

  /* ---------- add a responsibility with real typing ---------- */
  await A.click('nav.tabs a.add'); await A.waitForSelector('#add-form');
  await A.fill('[name=title]', 'Pick up Ava from art class');
  await A.click('label.chip:has-text("Pickup")');
  const leoDisabled = await A.$eval('.person:has-text("Leo") input', i => i.disabled);
  ok('child cannot be picked for a pickup', leoDisabled);
  ok('invited (not joined) person cannot be picked', await A.$eval('.person:has-text("Grandma Rose") input', i => i.disabled));
  await A.click('label.person:has-text("Sam")');
  ok('Sam radio selected by tapping the card', await A.isChecked('.person:has-text("Sam") input'));
  ok('note field appears when someone is picked', await A.isVisible('#note-field'));
  await A.fill('[name=note]', 'I am in a meeting till 5');
  await A.fill('[name=time]', '16:30');
  await A.press('[name=note]', 'Enter');
  await A.waitForSelector('#task-title');
  ok('Enter submits the add form', (await text(A, '#task-title')).includes('art class'));
  ok('after adding: not covered until Sam accepts', (await text(A, '#st-say')).includes('Waiting for Sam to accept'));
  ok('honest note about notifications', (await text(A)).includes('A notification does not show that someone saw it'));
  await shot(A, '03-task-awaiting'); await noOverflow(A, 'task');
  const artUrl = A.url();

  /* ---------- second tab = Sam ---------- */
  const B = await ctx.newPage(); const errsB = []; watch(B, errsB);
  await B.goto(U + '#/today'); await B.waitForSelector('#headline');
  await switchTo(B, 'Sam');
  ok('tab B is Sam', (await text(B, '#who')).includes('Sam'));
  ok('tab A is still Jordan', (await text(A, '#who')).includes('Jordan'));
  ok('Sam sees the new request', (await text(B)).includes('Pick up Ava from art class'));
  ok('Sam sees Jordan\'s note', (await text(B)).includes('I am in a meeting till 5'));
  ok('Handoffs badge shows requests for Sam', Number(await text(B, 'nav.tabs .badge')) >= 2);
  await B.click('.card.ask:has-text("art class") [data-act=accept]');
  await B.waitForSelector('.toast:has-text("Accepted")');
  await A.waitForFunction(() => document.querySelector('#st-say') && document.querySelector('#st-say').textContent.includes('Sam is doing this'), null, { timeout: 4000 });
  ok('tab A updates by itself when Sam accepts', (await text(A, '#st-say')).includes('Sam is doing this'));
  ok('tab A says what just changed', (await text(A)).includes('Just updated: Sam accepted.'));

  /* ---------- handoff: owner stays responsible until accepted ---------- */
  await openTask(B, 'art class');
  await B.click('[data-act=offer]'); await B.waitForSelector('.sheet');
  ok('handoff sheet says Sam stays responsible', (await text(B, '.sheet')).includes('You stay responsible until the new person accepts'));
  await B.click('.sheet button[type=submit]');
  ok('must pick a person', (await text(B, '#sh-err')).includes('Pick a person'));
  await B.click('.sheet .person:has-text("Ava")'); await B.click('.sheet button[type=submit]');
  await B.waitForSelector('.toast:has-text("Asked Ava")');
  ok('during handoff Sam still responsible', (await text(B, '#st-say')).includes('You are doing this. Asked Ava to take over'));
  const C3 = await ctx.newPage(); const errsC = []; watch(C3, errsC);
  await C3.goto(U + '#/today'); await C3.waitForSelector('#headline'); await switchTo(C3, 'Ava');
  await C3.click('nav.tabs a[href="#/handoffs"]'); await C3.waitForSelector('.seg');
  await C3.click('.card.ask:has-text("art class") [data-act=decline]'); await C3.waitForSelector('.sheet');
  await C3.fill('.sheet [name=reason]', 'I have band');
  await C3.press('.sheet [name=reason]', 'Enter');
  await B.waitForFunction(() => document.querySelector('#st-say') && document.querySelector('#st-say').textContent === 'You are doing this.', null, { timeout: 4000 });
  ok('Ava declines: Sam still responsible, request gone', (await text(B, '#st-say')) === 'You are doing this.');
  ok('history keeps the reason', (await text(B)).includes('Ava said no ("I have band"). Sam is still responsible.'));

  /* ---------- conflicting update: edit while someone else acts ---------- */
  await A.goto(U + '#/today'); await A.waitForSelector('#headline');
  await openTask(A, 'Grocery run');
  const groceryUrl = A.url();
  await A.click('[data-act=edit]'); await A.waitForSelector('.sheet');
  await A.fill('.sheet [name=time]', '19:15');
  await B.goto(groceryUrl); await B.waitForSelector('#task-title');
  await B.click('[data-act=claim]'); await B.waitForSelector('.toast:has-text("It is yours")');
  await A.waitForSelector('.refresh-pill', { timeout: 4000 });
  ok('editing tab is not redrawn under the user, shows a pill', await A.isVisible('.refresh-pill') && await A.isVisible('.sheet'));
  await A.click('.sheet button[type=submit]');
  await A.waitForSelector('.sheet .banner.warn');
  const warn = await text(A, '.sheet .banner.warn');
  ok('conflict explained in plain words', warn.includes('your changes were not saved yet') && warn.includes('Sam took this'), warn);
  ok('your edits are kept', (await A.inputValue('.sheet [name=time]')) === '19:15');
  await A.click('.sheet button[type=submit]');
  await A.waitForFunction(() => !document.querySelector('.sheet'));
  ok('second save applies on the latest version', (await text(A)).includes('changed the time from 6:30 PM to 7:15 PM'));
  ok('time change: Sam must confirm again', (await text(A, '#st-say')).includes('Waiting for Sam to accept'));

  /* ---------- conflicting update: two people grab the same task ---------- */
  await A.goto(U + '#/today'); await A.waitForSelector('#headline');
  await openTask(A, 'Return library books');
  const libUrl = A.url();
  await A.click('[data-act=offer]'); await A.waitForSelector('.sheet'); // A is looking at the old version
  await B.goto(libUrl); await B.waitForSelector('#task-title');
  await B.click('[data-act=claim]'); await B.waitForSelector('.toast:has-text("It is yours")');
  await A.click('.sheet .person:has-text("Ava")'); await A.click('.sheet button[type=submit]');
  await A.waitForSelector('.banner.warn');
  ok('no leftover "Saved" toast beside the warning', !(await A.$('.toast')));
  ok('late request refused, nothing overwritten', (await text(A, '.banner.warn')).includes('Not saved.') && (await text(A, '#st-say')).includes('Sam is doing this'));
  await shot(A, '04-conflict');

  /* ---------- invitations ---------- */
  await A.goto(U + '#/household'); await A.waitForSelector('#invite-form');
  await A.fill('#invite-form [name=name]', 'Grandpa Joe');
  await A.selectOption('#invite-form [name=role]', 'teen');
  await A.click('#invite-form button[type=submit]');
  await A.waitForSelector('.banner.info');
  const code = (await text(A, '.banner.info')).match(/: ([A-Z2-9]{6})\./)[1];
  ok('invite code shown, with "not a member until they join"', !!code && (await text(A, '.banner.info')).includes('not a member until they join'));
  ok('invited person listed as not joined', (await text(A)).includes('Invited, not joined yet'));
  ok('people count unchanged by invite', (await text(A, 'h2:has-text("People") .count')) === '4');
  const D2 = await ctx.newPage(); watch(D2, errs);
  await D2.goto(U + '#/household'); await D2.waitForSelector('[data-act=demoJoin]');
  await D2.click('[data-act=demoJoin][data-code="' + code + '"]'); await D2.waitForSelector('.sheet');
  await D2.fill('.sheet [name=code]', 'WRONG1'); await D2.click('.sheet button[type=submit]');
  await D2.waitForSelector('#sh-err:has-text("does not match")', { timeout: 3000 }).catch(() => {});
  ok('wrong code refused', (await text(D2, '#sh-err')).includes('does not match'));
  await D2.fill('.sheet [name=code]', code.toLowerCase()); await D2.fill('.sheet [name=name]', 'Joe');
  await D2.click('.sheet button[type=submit]'); await D2.waitForSelector('#headline');
  ok('joined and now acting as Joe', (await text(D2, '#who')).includes('Joe'));
  await A.waitForFunction(() => document.querySelector('h2 .count') && document.querySelector('h2 .count').textContent === '5', null, { timeout: 4000 });
  ok('Jordan\'s tab shows Joe as a member', (await text(A)).includes('Joe') && (await text(A, 'h2:has-text("People") .count')) === '5');
  await D2.goto(U + '#/household'); await D2.waitForSelector('h1');
  ok('teen cannot invite', !(await D2.$('#invite-form')));
  ok('teen cannot change roles', !(await D2.$('[data-role]')));
  await D2.close();

  /* ---------- permissions: child and teen ---------- */
  const K = await ctx.newPage(); watch(K, errs);
  await K.goto(U + '#/today'); await K.waitForSelector('#headline'); await switchTo(K, 'Leo');
  ok('child has no Add tab', !(await K.$('nav.tabs a.add')));
  ok('child does not see "Still needs someone"', !(await K.$('#needs')));
  ok('child does not see adults\' pickups', !(await text(K)).includes('Pick up Leo from school'));
  await K.goto(groceryUrl); await K.waitForSelector('.empty');
  ok('child opening someone else\'s task by link is refused', (await text(K)).includes('not shared with your role'));
  await K.goto(U + '#/calendar'); await K.waitForSelector('.cal');
  ok('child calendar only shows own items', !(await text(K)).includes('Grocery'));
  await K.goto(U + '#/household'); await K.waitForSelector('h1');
  ok('child sees "Me" not household admin tools', (await text(K, 'h1')) === 'Me' && !(await K.$('#invite-form')) && !(await K.$('table.perm')));
  await shot(K, '05-child'); await K.close();
  await switchTo(C3, 'Ava');
  await C3.goto(groceryUrl); await C3.waitForSelector('#task-title');
  ok('teen cannot edit an adult\'s task', !(await C3.$('[data-act=edit]')) && !(await C3.$('[data-act=cancel]')));
  ok('teen cannot accept for Sam', !(await C3.$('[data-act=accept]')));

  /* ---------- admin role change and removal ---------- */
  await A.goto(U + '#/household'); await A.waitForSelector('[data-role]');
  const avaId = await A.$eval('.mem:has-text("Ava") select', s => s.dataset.role);
  await A.selectOption('[data-role="' + avaId + '"]', 'adult'); await A.waitForSelector('.toast');
  ok('admin changes Ava to adult', (await text(A, '.mem:has-text("Ava") small')) === 'Adult');
  await A.click('.mem:has-text("Ava") [data-act=remove]'); await A.waitForSelector('.sheet');
  ok('remove explains what happens', (await text(A, '.sheet')).includes('goes back to "Still needs someone"'));
  await A.click('.sheet button[type=submit]'); await A.waitForSelector('.toast:has-text("was removed")');
  ok('Ava removed', !(await text(A, '.panel')).includes('Ava'));
  await openTask(A, 'Feed the cat').catch(() => {});
  await A.goto(U + '#/calendar'); await A.waitForSelector('.cal');
  const tmr = await A.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); return FHCore.dateStr(d); });
  await A.click(`[data-day="${tmr}"]`);
  ok('calendar day list: recycling needs someone after Ava left', (await text(A)).includes('Take out recycling') && (await A.$(`.card.st-unassigned:has-text("Take out recycling")`)) !== null);
  await A.click('[data-cal="1"]'); ok('next month', (await text(A, '.calhead h1')).length > 4);
  await A.click('[data-cal="-1"]');
  await shot(A, '06-calendar'); await noOverflow(A, 'calendar');

  /* ---------- settings, inbox, files, sheet keyboard ---------- */
  await A.goto(U + '#/settings'); await A.waitForSelector('#set-remind');
  await A.selectOption('#set-remind', '15'); await A.waitForSelector('.toast');
  await A.uncheck('[data-notify=stillNeeds]'); await A.waitForTimeout(150);
  await A.reload(); await A.waitForSelector('#set-remind');
  ok('settings persist after reload', (await A.inputValue('#set-remind')) === '15' && !(await A.isChecked('[data-notify=stillNeeds]')));
  ok('settings are honest about notifications', (await text(A)).includes('not that someone saw it'));
  await A.goto(U + '#/inbox'); await A.waitForSelector('h1');
  ok('inbox lists real messages', (await text(A)).includes('Sam accepted: Pick up Ava from art class'));
  await A.goto(artUrl); await A.waitForSelector('#task-title');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await A.setInputFiles('#attach', { name: 'map.png', mimeType: 'image/png', buffer: png });
  await A.waitForSelector('.file img');
  ok('photo attached and logged', (await text(A)).includes('map.png') && (await text(A)).includes('attached "map.png"'));
  await A.setInputFiles('#attach', { name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(500 * 1024) });
  await A.waitForSelector('.banner.warn');
  ok('too-big file refused', (await text(A, '.banner.warn')).includes('too big'));
  await A.fill('#add-check [name=text]', 'Snack'); await A.press('#add-check [name=text]', 'Enter');
  await A.waitForSelector('.check:has-text("Snack")');
  await A.click('.check:has-text("Snack") input');
  await A.waitForSelector('.check.done:has-text("Snack")');
  ok('checklist add + tick works', true);
  await A.click('#who'); await A.waitForSelector('.sheet'); await A.keyboard.press('Escape');
  ok('Escape closes a sheet', !(await A.$('.sheet')));
  await A.goto(U + '#/plans'); await A.waitForSelector('h1');
  ok('plan page: one household price, nothing charged', (await text(A)).includes('One price for the whole household') && (await text(A)).includes('Nothing is charged'));
  await A.goto(U + '#/about'); await A.waitForSelector('h1');
  ok('about: not an emergency service, no location tracking', (await text(A)).includes('not an emergency service') && (await text(A)).includes('does not track anyone\'s location'));

  ok('no JS errors in any tab', !errs.length && !errsB.length && !errsC.length, errs.concat(errsB, errsC));
  await ctx.close();

  /* ---------- blocked storage ---------- */
  const bctx = await b.newContext({ ...devices['iPhone SE'] });
  await bctx.addInitScript(() => { const thrower = { get() { throw new Error('blocked'); } }; Object.defineProperty(window, 'localStorage', thrower); Object.defineProperty(window, 'sessionStorage', thrower); });
  const bp = await bctx.newPage(); const be = []; watch(bp, be);
  await bp.goto(U); await bp.waitForSelector('#w-demo');
  ok('blocked storage: warning shown', (await text(bp)).includes('blocking storage'));
  await bp.click('#w-demo'); await bp.waitForSelector('#headline');
  await bp.click('.card.ask [data-act=accept]'); await bp.waitForSelector('.toast:has-text("Accepted")');
  ok('blocked storage: app still works in memory', (await text(bp, '.toast')).includes('Accepted'));
  ok('blocked storage: no errors', !be.length, be);
  await bctx.close();

  /* ---------- screen sizes ---------- */
  const axe = process.env.AXE_PATH && fs.existsSync(process.env.AXE_PATH) ? fs.readFileSync(process.env.AXE_PATH, 'utf8') : null;
  const routes = ['today', 'calendar', 'add', 'handoffs', 'household', 'settings', 'inbox', 'plans', 'about'];
  for (const [label, opt] of [['iPhone SE', devices['iPhone SE']], ['Pixel 7', devices['Pixel 7']], ['iPad Mini', devices['iPad Mini']], ['Desktop 1440', { viewport: { width: 1440, height: 900 } }]]) {
    const c = await b.newContext(opt); const p = await c.newPage(); const e = []; watch(p, e);
    await p.goto(U); await p.click('#w-demo'); await p.waitForSelector('#headline');
    for (const r of routes) { await p.goto(U + '#/' + r); await p.waitForTimeout(120); await noOverflow(p, label + ' ' + r); }
    await p.goto(U + '#/today'); await p.waitForSelector('#headline'); await p.click('.card .stretch'); await p.waitForSelector('#task-title'); await noOverflow(p, label + ' task');
    const small = await p.evaluate(() => Array.from(document.querySelectorAll('button,a.btn,nav.tabs a')).filter(el => el.offsetParent && el.getBoundingClientRect().height < 36).map(el => el.textContent.trim().slice(0, 20)));
    ok(label + ': tap targets at least 36px tall', !small.length, small);
    if (axe && label === 'iPhone SE') {
      const issues = [];
      for (const r of routes.concat(['task'])) {
        if (r === 'task') { await p.goto(U + '#/today'); await p.waitForSelector('#headline'); await p.click('.card .stretch'); await p.waitForSelector('#task-title'); } else { await p.goto(U + '#/' + r); await p.waitForTimeout(150); }
        await p.addScriptTag({ content: axe });
        const v = await p.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.map(x => x.id + '(' + x.nodes.length + ')'));
        if (process.env.AXE_DETAIL) console.log(r, JSON.stringify(await p.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.map(x => [x.id, x.nodes.map(n => n.target.join(' ')).slice(0, 4)]))));
        if (v.length) issues.push(r + ': ' + v.join(','));
      }
      ok('axe accessibility scan, ' + (routes.length + 1) + ' pages', !issues.length, issues);
    }
    if (label === 'Desktop 1440') await shot(p, '07-desktop');
    ok(label + ': no JS errors', !e.length, e);
    await c.close();
  }

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
