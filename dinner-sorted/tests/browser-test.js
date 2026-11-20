// Browser test of the whole Dinner Sorted journey with real typing.
// Needs a local server at the repo root:  npx http-server -p 8765 -c-1 .
// Run: node dinner-sorted/tests/browser-test.js   (SHOTS=dir saves screenshots; AXE_PATH=axe.min.js adds an accessibility scan)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const U = 'http://localhost:8765/dinner-sorted/';
const SHOTS = process.env.SHOTS;
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) pass++; else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } }
const st = p => p.evaluate(() => JSON.parse(JSON.stringify(DSApp.state)));
async function shot(p, n, full) { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: !!full }); }
async function wide(p, n) { const w = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); const vw = p.viewportSize().width; ok('no sideways scroll: ' + n, w[0] <= vw && w[1] === vw, [w, vw]); }
function track(p) { const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); }); return errs; }
// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

(async () => {
  const b = await chromium.launch();

  /* ===== Phone: the main journey ===== */
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage(); const errs = track(p);
  await p.goto(U); await p.waitForSelector('.hero');
  ok('home asks what is for dinner', (await p.textContent('h1')).includes('dinner'));
  ok('own font loaded from the app (works offline)', await p.evaluate(async () => { await document.fonts.ready; return document.fonts.check('900 20px Nunito'); }));
  ok('logo is the gold bowl with steam', await p.isVisible('.brand .logo svg'));
  ok('home scene is a drawing, labeled', (await p.getAttribute('.hero-art .scene', 'aria-label')).startsWith('Drawing'));
  ok('home shows promise', (await p.textContent('.promise')).includes('Your ingredients. Tonight’s dinner.'));
  await shot(p, 'phone-1-home'); await wide(p, 'home');
  await p.click('[data-act=people][data-d="1"]'); await p.click('[data-act=people][data-d="1"]');
  await p.click('[data-act=time][data-v="45"]');
  let s = await st(p);
  ok('people stepper', s.people === 4, s.people);
  ok('time picked', s.time === 45);
  const tabsBox = await p.locator('#tabs').boundingBox();
  ok('phone tab bar sits at the bottom', tabsBox.y + tabsBox.height >= 660, tabsBox);

  await p.click('text=Next: what do you have?'); await p.waitForSelector('#ing-input');
  ok('find disabled with no ingredients', await p.isDisabled('.sticky-go button'));
  // real typing + Enter, with a list and a word we do not know
  await p.click('#ing-input'); await p.keyboard.type('2 chicken breasts, rice, garlic and dragonfruit'); await p.keyboard.press('Enter');
  s = await st(p);
  ok('typed list understood', ['chicken', 'rice', 'garlic'].every(x => s.have.includes(x)), s.have);
  ok('unknown kept as custom, not matched', s.custom.includes('dragonfruit'), s.custom);
  ok('input keeps focus after Enter', await p.evaluate(() => document.activeElement.id === 'ing-input'));
  ok('honest note about unknown items', (await p.textContent('#view')).includes('not in our recipe collection yet'));
  // autocomplete with keyboard
  await p.keyboard.type('spin'); await p.waitForSelector('#ing-input-sugg:not([hidden])');
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
  ok('autocomplete adds spinach', (await st(p)).have.includes('spinach'));
  await p.click('[data-act=tog-have][data-id=eggs]');
  await p.click('[data-act=tog-have][data-id=soy_sauce]');
  ok('chip tap adds', (await st(p)).have.includes('eggs'));
  await p.click('[data-act=rm-custom]');
  ok('remove custom', (await st(p)).custom.length === 0);
  await shot(p, 'phone-2-add'); await wide(p, 'add');

  await p.click('[data-act=find]'); await p.waitForSelector('[data-act=prefs-done]');
  ok('first time asks preferences', p.url().includes('#/prefs'));
  await p.click('[data-act=equip][data-v=microwave]');
  await shot(p, 'phone-3-prefs'); await wide(p, 'prefs');
  await p.click('[data-act=prefs-done]'); await p.waitForSelector('.meal');
  ok('three meal cards', (await p.locator('.meal').count()) === 3);
  const t = await p.textContent('#view');
  ok('estimated time labeled', t.includes('est.'));
  ok('cost labeled as guess', t.includes('guess'));
  ok('cards say what is used', (await p.locator('.fit').count()) === 3);
  await shot(p, 'phone-4-results'); await wide(p, 'results');
  const first = await p.evaluate(() => Array.from(document.querySelectorAll('.meal h2')).map(x => x.textContent));
  // exclude an ingredient: chicken
  await p.click('[data-act=exclude][data-id=chicken]'); await p.waitForTimeout(100);
  const noChicken = await p.evaluate(() => Array.from(document.querySelectorAll('.fit')).map(x => x.textContent).join(' '));
  ok('excluded chicken is no longer used', !/Chicken/.test(noChicken), noChicken);
  ok('excluded chip shown struck', await p.isVisible('.chip.off'));
  await p.click('[data-act=exclude][data-id=chicken]');
  // other ideas
  if (await p.isVisible('[data-act=other]')) {
    await p.click('[data-act=other]'); await p.waitForTimeout(100);
    const second = await p.evaluate(() => Array.from(document.querySelectorAll('.meal h2')).map(x => x.textContent));
    ok('other ideas are different meals', second.every(n => !first.includes(n)), [first, second]);
    await p.click('[data-act=other]'); // keep going; wraps eventually
  }
  // open a chicken recipe directly
  await p.goto(U + '#/recipe/garlic-chicken-rice'); await p.waitForSelector('.recipe');
  ok('recipe shows have', (await p.textContent('#view')).includes('You have'));
  ok('recipe shows still need', (await p.textContent('#view')).includes('You still need'));
  ok('recipe shows swaps', (await p.textContent('#view')).includes('Swaps'));
  ok('chicken temp with USDA source', (await p.textContent('#view')).includes('165°F') && (await p.getAttribute('a[href*="fsis.usda.gov"]', 'href')).includes('safe-temperature-chart'));
  const amt0 = await p.textContent('.ing-list li:has-text("Chicken") .amt');
  await p.click('[data-act=rpeople][data-d="1"]');
  const amt1 = await p.textContent('.ing-list li:has-text("Chicken") .amt');
  ok('servings change amounts', amt0 !== amt1, [amt0, amt1]);
  await p.click('[data-act=to-list]');
  s = await st(p);
  ok('missing items go to list', s.list.length > 0 && s.list.some(x => x.from === 'Garlic butter chicken & rice'), s.list);
  const n1 = s.list.length; await p.click('[data-act=to-list]');
  ok('no duplicate list items', (await st(p)).list.length === n1);
  await p.click('.cta-bar [data-act=fav]');
  ok('favorite saved', (await st(p)).favs.includes('garlic-chicken-rice'));
  await shot(p, 'phone-5-recipe', true); await wide(p, 'recipe');

  /* cooking mode */
  await p.click('text=Start cooking'); await p.waitForSelector('.cook');
  ok('cook mode hides tabs', !(await p.isVisible('#tabs')));
  ok('step 1 of 5', (await p.textContent('#step-n')).includes('Step 1 of 5'));
  const fs1 = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.step-text')).fontSize));
  ok('large step text', fs1 >= 26, fs1);
  await p.click('[data-act=start-timer]');
  ok('timer running', (await st(p)).timers.length === 1);
  ok('timer pill visible', await p.isVisible('.tmr'));
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
  ok('arrow keys move steps', (await p.textContent('#step-n')).includes('Step 3'));
  ok('chicken step shows safety temp', (await p.textContent('.cook')).includes('165°F'));
  await shot(p, 'phone-6-cook');
  await p.click('[data-act=start-timer]');
  // make the second timer finish now
  await p.evaluate(() => { const ts = DSApp.state.timers; ts[1].end = Date.now() - 10; });
  await p.waitForSelector('.alarm', { timeout: 3000 });
  ok('timer done alarm shows', (await p.textContent('.alarm')).includes('Chicken timer is done'));
  await shot(p, 'phone-7-alarm');
  await p.click('[data-act=alarm-off]');
  ok('alarm dismissed and removed', !(await p.isVisible('.alarm')) && (await st(p)).timers.length === 1);
  await p.click('[data-act=drawer]'); ok('ingredients drawer opens', await p.isVisible('.drawer'));
  await p.keyboard.press('Escape'); ok('drawer closes', !(await p.isVisible('.drawer')));
  // reload keeps the step and running timer
  await p.reload(); await p.waitForSelector('.cook');
  ok('reload keeps step', (await p.textContent('#step-n')).includes('Step 3'));
  ok('reload keeps timer', await p.isVisible('.tmr'));
  await p.click('[data-act=step][data-d="1"]'); await p.click('[data-act=step][data-d="1"]');
  ok('last step shows leftovers note', (await p.textContent('.cook')).includes('refrigerate within 2 hours'));
  // pantry: add rice + garlic first so the done screen asks
  await p.evaluate(() => { DSApp.state.pantry.push('rice', 'garlic'); });
  await p.click('[data-act=finish]'); await p.waitForSelector('text=Dinner’s sorted.');
  ok('timers for this recipe cleared', (await st(p)).timers.length === 0);
  ok('asks before changing pantry', await p.isVisible('form[data-form=pantry-used]'));
  ok('nothing pre-ticked', (await p.locator('form[data-form=pantry-used] input:checked').count()) === 0);
  await p.check('#pu-rice'); await shot(p, 'phone-8-done');
  await p.click('form[data-form=pantry-used] button[type=submit]');
  s = await st(p);
  ok('only ticked item removed from pantry', !s.pantry.includes('rice') && s.pantry.includes('garlic'), s.pantry);

  /* a running timer pill never covers the main button */
  await p.goto(U + '#/recipe/chickpea-curry'); await p.waitForSelector('.cta-bar');
  await p.evaluate(() => { DSApp.state.timers.push({ id: 't9', label: 'Rice', end: Date.now() + 600000, total: 600, recipe: 'chickpea-curry', step: 0, done: false }); });
  await p.goto(U + '#/recipe/chickpea-curry?x=1'); await p.waitForSelector('.dock .tmr');
  const dk = await p.locator('.dock').boundingBox(), cta = await p.locator('.cta-bar .btn-primary').boundingBox();
  ok('timer pill does not cover Start cooking', dk.y + dk.height <= cta.y || dk.y >= cta.y + cta.height, [dk, cta]);
  const h1b = await p.locator('h1').boundingBox();
  ok('timer strip does not cover the heading', dk.y + dk.height <= h1b.y, [dk, h1b]);
  await p.evaluate(() => { DSApp.state.timers = DSApp.state.timers.filter(t => t.id !== 't9'); });

  /* shopping list + sharing */
  await p.goto(U + '#/list'); await p.waitForSelector('.list-items');
  await p.fill('#list-input', 'Paper towels'); await p.keyboard.press('Enter');
  ok('typed list item added', (await st(p)).list.some(x => x.name === 'Paper towels'));
  const k0 = (await st(p)).list[0].key; await p.check('#li-' + k0);
  s = await st(p); ok('tick only that item', s.list.filter(x => x.done).length === 1, s.list);
  ok('list count badge', (await p.textContent('#list-count')).trim() !== '');
  await shot(p, 'phone-9-list'); await wide(p, 'list');
  const link = await p.evaluate(() => location.href.split('#')[0] + '#/list?add=' + DSEngine.encodeList(DSApp.state.list));
  const openCount = (await st(p)).list.filter(x => !x.done).length;
  // another person opens the shared link
  const ctx2 = await b.newContext({ ...devices['Pixel 7'] }); const q = await ctx2.newPage(); const errs2 = track(q);
  await q.goto(link); await q.waitForSelector('[data-act=import]', { timeout: 5000 });
  ok('shared list asks before adding', (await q.evaluate(() => DSApp.state.list.length)) === 0);
  await q.click('[data-act=import]');
  ok('shared items imported (unticked only)', (await q.evaluate(() => DSApp.state.list.length)) === openCount);
  await q.goto(U + '#/list?add=not-a-real-list!!'); await q.waitForSelector('.note.danger');
  ok('damaged link explained', (await q.textContent('.note.danger')).includes('damaged'));
  ok('second phone: no errors', errs2.length === 0, errs2);

  /* favorites + pantry pages */
  await p.goto(U + '#/favorites'); await p.waitForSelector('.fav-card');
  ok('favorites list', (await p.locator('.fav-card').count()) === 1); await wide(p, 'favorites');
  await p.goto(U + '#/pantry'); await p.waitForSelector('#pantry-input');
  await p.fill('#pantry-input', 'pasta, canned tomatoes'); await p.keyboard.press('Enter');
  s = await st(p); ok('pantry typed add', s.pantry.includes('pasta') && s.pantry.includes('canned_tomatoes'), s.pantry);
  ok('pantry date note', (await p.textContent('#view')).includes('not a safety guarantee'));
  await shot(p, 'phone-10-pantry'); await wide(p, 'pantry');
  await p.click('[data-act=clear-pantry]');
  ok('pantry clear needs second tap', (await st(p)).pantry.length > 0);
  await p.click('[data-act=clear-pantry]');
  ok('pantry cleared on second tap', (await st(p)).pantry.length === 0);

  /* photo: honest when recognition is off */
  await p.goto(U + '#/add'); await p.waitForSelector('#ing-input');
  await p.setInputFiles('#photo-file', { name: 'fridge.png', mimeType: 'image/png', buffer: PNG });
  await p.waitForSelector('.photo-wrap img');
  const pt = await p.textContent('#view');
  ok('photo: says recognition not connected', pt.includes('Photo recognition is not connected'));
  ok('photo: food safety warning', pt.includes('cannot tell whether food is safe'));
  ok('photo: no ingredients guessed', (await st(p)).have.length === 6, (await st(p)).have);
  await shot(p, 'phone-11-photo'); await wide(p, 'photo');
  await p.setInputFiles('#photo-file', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
  await p.waitForSelector('.note.danger'); ok('non-image rejected kindly', (await p.textContent('.note.danger')).includes('not a picture'));

  /* settings, empty states */
  await p.goto(U + '#/about'); await p.waitForSelector('.status-list');
  ok('about says AI not connected', (await p.textContent('#view')).includes('AI recipe writing: not connected'));
  await wide(p, 'about');
  await p.goto(U + '#/nope'); ok('unknown page handled', (await p.textContent('#view')).includes('does not exist'));
  await p.evaluate(() => { const S = DSApp.state; S.have = ['avocado']; S.exclude = []; S.time = 15; S.prefs.done = true; });
  await p.goto(U + '#/results'); await p.waitForSelector('.empty');
  ok('no-match empty state explains', (await p.textContent('.empty')).includes('Nothing fits'));
  await shot(p, 'phone-12-empty');
  ok('phone: no JS errors', errs.length === 0, errs);

  /* offline: works after first visit */
  await p.goto(U); await p.waitForTimeout(1500); await p.reload(); await p.waitForTimeout(800);
  await ctx.setOffline(true);
  await p.reload(); await p.waitForSelector('.hero', { timeout: 8000 }).catch(() => {});
  ok('loads offline', await p.isVisible('.hero'));
  ok('offline banner', (await p.textContent('#banner')).includes('offline'));
  await shot(p, 'phone-13-offline');
  await ctx.setOffline(false);

  /* ===== Allergy + diet respected in the UI ===== */
  const c3 = await b.newContext({ ...devices['iPhone SE'] }); const r3 = await c3.newPage(); const e3 = track(r3);
  await r3.goto(U); await r3.evaluate(() => { const S = DSApp.state; S.have = ['pasta', 'cheese', 'butter', 'garlic', 'lemon', 'shrimp', 'canned_tomatoes', 'onion', 'eggs', 'milk', 'bread']; S.time = 0; S.prefs = { done: true, diet: 'vegan', allergens: ['dairy'], avoid: [], avoidText: [], equipment: ['stovetop', 'oven', 'microwave'] }; localStorage.setItem('dinner-sorted-v1', JSON.stringify(S)); });
  await r3.goto(U + '#/results'); await r3.waitForSelector('.meal');
  const used = await r3.evaluate(() => Array.from(document.querySelectorAll('.fit')).map(x => x.textContent).join(' '));
  ok('vegan + dairy: no cheese, butter, shrimp, eggs or milk used', !/Cheese|Butter|Shrimp|Eggs|Milk/.test(used), used);
  await r3.click('.meal >> nth=0 >> text=See recipe'); await r3.waitForSelector('.recipe');
  ok('recipe reminds to check packaging', (await r3.textContent('#view')).includes('Check the packaging'));
  await r3.goto(U + '#/recipe/shakshuka'); await r3.waitForSelector('.note.danger');
  ok('opening a non-matching recipe warns', (await r3.textContent('.note.danger')).includes('Not a match'));
  await shot(r3, 'se-allergy-warning'); await wide(r3, 'SE recipe');
  ok('SE: no errors', e3.length === 0, e3);

  /* ===== Photo recognition server (mocked here, off in the real app): must confirm ===== */
  const c4 = await b.newContext({ ...devices['iPhone 13'] }); const r4 = await c4.newPage(); const e4 = track(r4);
  await r4.route('**/dinner-sorted/config.js', rt => rt.fulfill({ contentType: 'text/javascript', body: 'window.DS_CONFIG={recognizeUrl:"/fake-recognize"};' }));
  let mode = 'ok';
  await r4.route('**/fake-recognize', rt => mode === 'ok' ? rt.fulfill({ contentType: 'application/json', body: JSON.stringify({ ingredients: ['Eggs', 'baby spinach', 'mystery jar', 'salt'] }) }) : rt.fulfill({ status: 500, body: 'x' }));
  await r4.goto(U + '#/add'); await r4.waitForSelector('#ing-input');
  await r4.setInputFiles('#photo-file', { name: 'f.png', mimeType: 'image/png', buffer: PNG });
  await r4.waitForSelector('.chip.suggested');
  ok('suggestions shown, nothing added yet', (await r4.evaluate(() => DSApp.state.have.length)) === 0);
  ok('only known foods suggested (no salt, no mystery)', (await r4.locator('.chip.suggested').count()) === 2);
  await shot(r4, 'phone-14-photo-suggest');
  await r4.click('.chip.suggested[data-id=eggs]');
  ok('confirming one adds only that one', JSON.stringify(await r4.evaluate(() => DSApp.state.have)) === '["eggs"]');
  mode = 'fail'; await r4.click('[data-act=photo-pick]').catch(() => {});
  await r4.setInputFiles('#photo-file', { name: 'g.png', mimeType: 'image/png', buffer: PNG });
  await r4.waitForSelector('text=Could not read the photo');
  ok('recognition error is explained', true);
  ok('mock photo: no JS errors', e4.filter(x => !/500/.test(x)).length === 0, e4);

  /* ===== Storage blocked ===== */
  const c5 = await b.newContext({ ...devices['iPhone 13'] });
  await c5.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  const r5 = await c5.newPage(); const e5 = track(r5);
  await r5.goto(U); await r5.waitForSelector('.hero');
  ok('blocked storage: banner warns', (await r5.textContent('#banner')).includes('blocking storage'));
  await r5.click('text=Next: what do you have?'); await r5.fill('#ing-input', 'eggs, spinach, onion'); await r5.keyboard.press('Enter');
  await r5.click('[data-act=find]'); await r5.click('[data-act=prefs-done]'); await r5.waitForSelector('.meal');
  ok('blocked storage: still finds dinners', (await r5.locator('.meal').count()) >= 1);
  ok('blocked storage: no JS errors', e5.length === 0, e5);

  /* ===== Every screen on many devices ===== */
  const sizes = [['iPhone SE', devices['iPhone SE']], ['Pixel 7', devices['Pixel 7']], ['iPad Mini', devices['iPad Mini']], ['iPad Pro 11 landscape', devices['iPad Pro 11 landscape']], ['Desktop 1440', { viewport: { width: 1440, height: 900 } }], ['Laptop 1280x720', { viewport: { width: 1280, height: 720 } }]];
  const routes = ['', 'add', 'prefs', 'results', 'recipe/chickpea-curry', 'cook/chickpea-curry', 'done/chickpea-curry', 'list', 'favorites', 'pantry', 'about', 'photo'];
  const axe = process.env.AXE_PATH && fs.existsSync(process.env.AXE_PATH) ? fs.readFileSync(process.env.AXE_PATH, 'utf8') : null;
  for (const [name, dev] of sizes) {
    const c = await b.newContext(dev); const r = await c.newPage(); const e = track(r);
    await r.goto(U); await r.evaluate(() => { const S = DSApp.state; S.have = ['chickpeas', 'onion', 'garlic', 'rice', 'spinach', 'canned_tomatoes']; S.prefs.done = true; S.favs = ['chickpea-curry', 'beef-tacos']; S.pantry = ['rice']; S.list = [{ key: 'a', id: 'coconut_milk', name: 'Coconut milk (can)', amount: '1 can', from: 'Chickpea & coconut curry', done: false }]; localStorage.setItem('dinner-sorted-v1', JSON.stringify(S)); });
    for (const rt of routes) {
      await r.goto(U + '#/' + rt); await r.waitForTimeout(rt === 'results' ? 700 : 120);
      await wide(r, name + ' #/' + rt);
      if (rt === 'results') ok(name + ': 3 cards', (await r.locator('.meal').count()) === 3);
      if (rt === 'cook/chickpea-curry') {
        const nav = await r.locator('.cook-nav').boundingBox(); const vh = r.viewportSize().height;
        ok(name + ': cook buttons on screen', nav && nav.y + nav.height <= vh + 1, [nav, vh]);
      }
      if (SHOTS && ['', 'results', 'recipe/chickpea-curry', 'cook/chickpea-curry'].includes(rt)) await shot(r, name.replace(/\W+/g, '-') + '-' + (rt.split('/')[0] || 'home'));
    }
    if (axe && name === 'Pixel 7') {
      const issues = [];
      for (const rt of routes) { await r.goto(U + '#/' + rt); await r.waitForTimeout(700); await r.addScriptTag({ content: axe }); const v = await r.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.map(x => x.id + '(' + x.nodes.length + ')')); if (v.length) issues.push(rt + ': ' + v.join(',')); }
      ok('axe accessibility scan', !issues.length, issues);
    }
    // touch targets on phones
    if (/iPhone|Pixel/.test(name)) {
      await r.goto(U + '#/add'); await r.waitForSelector('.chip');
      const small = await r.evaluate(() => Array.from(document.querySelectorAll('button:not(.x), a.btn, .chip')).filter(x => x.offsetParent && x.getBoundingClientRect().height < 30).length);
      ok(name + ': tap targets at least 30px', small === 0, small);
    }
    ok(name + ': no JS errors', e.length === 0, e);
    await c.close();
  }

  /* reduced motion */
  const c6 = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } }); const r6 = await c6.newPage();
  await r6.goto(U); await r6.evaluate(() => { DSApp.state.have = ['eggs']; DSApp.state.prefs.done = true; });
  await r6.goto(U + '#/results'); await r6.waitForSelector('.meal');
  ok('reduced motion turns off card animation', (await r6.evaluate(() => getComputedStyle(document.querySelector('.meal')).animationName)) === 'none');
  const c7 = await b.newContext({ viewport: { width: 1280, height: 800 } }); const r7 = await c7.newPage();
  await r7.goto(U); await r7.evaluate(() => { DSApp.state.have = ['eggs', 'rice']; DSApp.state.prefs.done = true; });
  await r7.goto(U + '#/results'); await r7.waitForSelector('.meal');
  ok('cards animate in on arrival', (await r7.evaluate(() => getComputedStyle(document.querySelector('.meal')).animationName)) === 'rise');
  await r7.waitForTimeout(800); await r7.click('.meal [data-act=fav]');
  ok('no re-animation when tapping a heart', (await r7.evaluate(() => getComputedStyle(document.querySelector('.meal')).animationName)) === 'none');

  console.log(`${pass} passed, ${fail} failed`);
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
