// Browser test of the upload-to-practice journey.
// Needs a local server at the repo root:  npx http-server -p 8765 -c-1 .
// Run: node study-rescue/tests/browser-test.js   (set SHOTS=dir to save screenshots)
const { chromium, devices } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const URL0 = 'http://localhost:8765/study-rescue/';
const SHOTS = process.env.SHOTS;
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) pass++; else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-'));
const NOW = new Date('2026-11-20T10:00:00');

const CHEM = `Chemistry notes

Atoms
Atom: the smallest unit of an element that keeps its properties
Proton: a positive particle in the nucleus of an atom
Neutron: a particle with no charge in the nucleus
Electron: a negative particle that moves around the nucleus

Bonds
Ionic bond: a bond formed when electrons are transferred between atoms
Covalent bond: a bond formed when atoms share electrons
Molecule: two or more atoms joined by covalent bonds

Reactions
A reactant is a substance that is used up in a chemical reaction.
A product is a substance that is made in a chemical reaction.
A catalyst is a substance that speeds up a reaction without being used up.`;

async function noOverflow(p, name) { const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]); ok('no sideways scroll: ' + name, w[0] <= w[1], w); }
async function shot(p, name, full) { if (SHOTS) { await p.waitForTimeout(450); await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: !!full }); } }
async function cur(p) { return p.evaluate(() => SRApp.session && SRApp.session.cur); }
async function answerRight(p) { const q = await cur(p); if (q.options) { await p.click(`[data-opt="${q.answer}"]`); } else { await p.click('#p-show'); await p.click('[data-rate="1"]'); return; } await p.click('#p-next'); }
async function quickSetup(pg, sample) {
  await pg.waitForSelector('#drop'); await pg.click('summary:has-text("sample")'); await pg.click('[data-sample=' + sample + ']');
  await pg.click('#s-next'); await pg.waitForSelector('#t-new'); await pg.click('#s-next'); await pg.waitForSelector('#c-skip'); await pg.click('#c-skip'); await pg.waitForSelector('#s-done'); await pg.click('#s-done'); await pg.waitForSelector('#h-start');
}
async function finishSession(p) { for (let i = 0; i < 20 && !(await p.$('.done-card')); i++) await answerRight(p); }

(async () => {
  const b = await chromium.launch();
  fs.writeFileSync(path.join(tmp, 'chem-notes.txt'), CHEM);
  fs.writeFileSync(path.join(tmp, 'essay.docx'), 'not really a docx');
  fs.writeFileSync(path.join(tmp, 'unit4-exam.txt'), 'Name: ________\nUnit 4 Exam - Time limit 40 minutes\n1. What is osmosis? (2 points)\n2. What is diffusion? (2 points)\n3. Name two organelles. (3 points)\nOsmosis is the diffusion of water across a membrane.\nDiffusion is the movement of particles from high to low concentration.\nA vacuole is a sac that stores water in a cell.');
  // A real PDF with a text layer, made by Chromium
  { const pg = await b.newPage(); await pg.setContent('<h1>Ecology</h1><p>An ecosystem is all the living and nonliving things in an area.</p><p>A producer is an organism that makes its own food.</p><p>A consumer is an organism that eats other organisms for energy.</p><h1>Food webs</h1><p>A food chain is a single path that shows how energy moves between organisms.</p><p>A decomposer is an organism that breaks down dead material.</p><p>A herbivore is an animal that eats only plants.</p>');
    await pg.pdf({ path: path.join(tmp, 'ecology.pdf') });
    await pg.setViewportSize({ width: 900, height: 420 }); await pg.setContent('<body style="margin:30px;font:26px Arial;background:#fff">Photosynthesis<br>Chlorophyll is the green pigment that absorbs light.<br>Osmosis is the diffusion of water across a membrane.<br>A vacuole is a sac that stores water in a plant cell.</body>');
    await pg.screenshot({ path: path.join(tmp, 'notes-photo.png') }); await pg.setContent('<div style="width:200px;height:200px;background:#333"></div>'); await pg.pdf({ path: path.join(tmp, 'scan.pdf') }); await pg.close(); }

  /* ---------------- iPhone 13: the whole journey ---------------- */
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  await p.clock.install({ time: NOW });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errs.push(m.text()); });
  await p.goto(URL0); await p.waitForSelector('#w-go');
  ok('welcome first', p.url().endsWith('#/welcome'));
  ok('welcome states the promise', (await p.textContent('h1')).includes('Turn “I’m lost” into a clear next step.'));
  ok('welcome: private + not for live graded tests', /never uploaded/.test(await p.textContent('#view')) && /not for answering a live graded test/.test(await p.textContent('#view')));
  await shot(p, 'p01-welcome'); await noOverflow(p, 'welcome');
  await p.click('#w-go');

  // Step 1 validation
  await p.click('#s-next'); ok('subject required', (await p.textContent('#s-err')).includes('subject'));
  await p.fill('#s-sub', 'Chemistry'); await p.click('#s-next'); ok('date required', (await p.textContent('#s-err')).includes('test date'));
  await p.fill('#s-date', '2026-11-01'); await p.click('#s-next'); ok('past date refused', (await p.textContent('#s-err')).includes('passed'));
  await p.fill('#s-date', '2026-12-04'); await shot(p, 'p02-subject'); await p.click('#s-next');

  // Step 2: real uploads
  await p.waitForSelector('#drop');
  ok('next disabled with no material', await p.isDisabled('#s-next'));
  const fileChooser = async files => { const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#m-files')]); await fc.setFiles(files); };
  await fileChooser([path.join(tmp, 'essay.docx')]); await p.waitForTimeout(400);
  ok('Word file refused with a clear message', (await p.textContent('#toast')).toLowerCase().includes('save it as a pdf'), await p.textContent('#toast'));
  await fileChooser([path.join(tmp, 'scan.pdf')]); await p.waitForFunction(() => /No text found/.test(document.getElementById('toast').textContent), null, { timeout: 20000 });
  ok('PDF with no text explained (scan)', true);
  await fileChooser([path.join(tmp, 'chem-notes.txt'), path.join(tmp, 'ecology.pdf')]);
  await p.waitForFunction(() => SRApp.state.sets[SRApp.state.active].docs.length === 2, null, { timeout: 30000 }); await p.waitForTimeout(300);
  const docs = await p.evaluate(() => SRApp.state.sets[SRApp.state.active].docs.map(d => ({ name: d.name, kind: d.kind, pages: d.pages.length, text: d.pages.join('\n') })));
  ok('txt read', docs[0].name === 'chem-notes.txt' && docs[0].text === CHEM);
  ok('pdf read with text', docs[1].kind === 'pdf' && /producer is an organism that makes its own food/.test(docs[1].text), docs[1].text.slice(0, 200));
  ok('pdf headings found from big type', /# Ecology/.test(docs[1].text) && /# Food webs/.test(docs[1].text), docs[1].text.slice(0, 200));
  ok('busy spinner hidden after reading', await p.isHidden('#m-busy'));
  await shot(p, 'p03-material', true); await noOverflow(p, 'material');
  await p.click('#s-next'); await p.waitForSelector('#t-new');

  // Step 3: topics
  let topics = await p.evaluate(() => SRApp.derived().topics.map(t => t.name));
  ok('topics from both files', ['Atoms', 'Bonds', 'Reactions', 'Ecology', 'Food webs'].every(n => topics.includes(n)), topics);
  ok('title line is not a topic', !topics.includes('Chemistry notes'), topics);
  await p.fill('[data-name]:nth-of-type(1) >> nth=0', 'Atom parts'); await p.press('[data-name] >> nth=0', 'Tab');
  await p.fill('#t-new', 'Balancing equations'); await p.click('#t-add');
  topics = await p.evaluate(() => SRApp.derived().topics.map(t => t.name));
  ok('rename topic', topics.includes('Atom parts'), topics);
  ok('add a topic by name', topics.includes('Balancing equations'));
  ok('name-only topic explained', (await p.textContent('#view')).includes('a name only'));
  await shot(p, 'p04-topics', true); await noOverflow(p, 'topics confirm');
  await p.click('#s-next');

  // Step 4: quick check
  await p.click('#c-go'); await p.waitForSelector('.opt');
  ok('quick check: one per topic with notes', (await p.evaluate(() => SRApp.session.qs.length)) === 5);
  let q = await cur(p);
  const tagTxt = await p.textContent('.src-tag');
  ok('question shows its source line', /From your notes · (chem-notes\.txt · line \d+|ecology\.pdf · page \d)/.test(tagTxt), tagTxt);
  // the shown line really holds that sentence in the uploaded file
  const checkRef = (qq) => { const m = qq.src.ref.match(/line (\d+)/); if (m) return CHEM.split('\n')[+m[1] - 1].includes(qq.src.quote.split(' ').slice(0, 5).join(' ')); return docs[1].text.includes(qq.src.quote); };
  ok('source line matches the uploaded file', checkRef(q), q.src);
  await shot(p, 'p05-check');
  await p.click('#p-idk');
  ok('"I don\'t know yet" shows the answer kindly', (await p.textContent('.fb')).includes('now you’ve seen it') && (await p.$('.opt.right')) !== null);
  await p.click('#p-next'); q = await cur(p);
  await p.click(`[data-opt="${(q.answer + 1) % q.options.length}"]`);
  ok('check: wrong shows right answer + notes, no retry', (await p.$('.opt.right')) && (await p.textContent('.fb')).includes('The answer is') && !(await p.$('#p-retry')));
  await p.click('#p-next'); await finishSession(p);
  ok('quick check done screen', (await p.textContent('h1')).includes('Quick check done'));
  ok('done screen: honest about estimates', (await p.textContent('#view')).includes('can’t measure everything you know'));
  ok('no "solid" from one answer', !(await p.textContent('.moves')).includes('Looking solid'));
  await shot(p, 'p06-check-done', true);
  await p.click('#e-plan');

  // Step 5: time
  await p.click('[data-min="30"]'); await p.click('[data-dow="6"]');
  let st = await p.evaluate(() => { const s = SRApp.state.sets[SRApp.state.active]; return { m: s.minutes, d: s.days }; });
  ok('time saved', st.m === 30 && st.d.includes(6));
  ok('plan preview shows 3 sessions for 30 min', (await p.textContent('.day')).includes('3 short sessions'));
  await shot(p, 'p07-time', true); await p.click('#s-done');

  // Home
  await p.waitForSelector('#h-start');
  ok('home: one clear start button', (await p.$$('.btn.big')).length === 1 && (await p.textContent('#h-start')).includes('Start next session'));
  ok('home: countdown', (await p.textContent('.subject-bar')).includes('14 days until your test'));
  ok('home: quick check does not count as a planned session', (await p.textContent('.next')).includes('0 of 3 sessions'));
  await shot(p, 'p08-home'); await noOverflow(p, 'home');

  // Practice: wrong -> explanation -> try again
  await p.click('#h-start'); await p.waitForSelector('.qcard');
  const sessionQs = await p.evaluate(() => SRApp.session.qs);
  ok('session questions all grounded in the uploads', sessionQs.filter(x => x.src).every(checkRef), sessionQs.map(x => x.src && x.src.ref));
  for (let i = 0; i < 6; i++) { q = await cur(p); if (q.options && q.type !== 'gap') break; await answerRight(p); }
  q = await cur(p);
  const wrong = (q.answer + 1) % q.options.length;
  await p.click(`[data-opt="${wrong}"]`);
  let fb = await p.textContent('.fb');
  ok('wrong: gentle wording', fb.includes('Not quite') && !/wrong!|fail/i.test(fb));
  ok('wrong: quote from the notes with reference', fb.includes(q.src.quote) && fb.includes(q.src.ref));
  ok('wrong: answer not revealed before the second try', !(await p.$('.opt.right')));
  ok('wrong: extra tip labeled as not from notes', (await p.textContent('.extra .tag')).includes('not from your notes'));
  ok('wrong: explains what the picked option means in the notes', fb.includes('You picked'), fb);
  ok('try again offered', await p.isVisible('#p-retry'));
  await shot(p, 'p09-wrong', true); await noOverflow(p, 'feedback');
  await p.click('#p-retry'); const q2 = await cur(p);
  ok('second try: same topic', q2.topicId === q.topicId && (await p.textContent('.eyebrow')).includes('second try'));
  await p.click(`[data-opt="${q2.answer}"]`);
  ok('second try right: credited as second try', (await p.textContent('.fb')).includes('second try'));
  let ans = await p.evaluate(() => { const a = SRApp.state.sets[SRApp.state.active].answers; return a[a.length - 1]; });
  ok('second try counts 0.5 for the original question', ans.r === 0.5 && ans.qid === q.id, ans);
  await shot(p, 'p10-second-try', true);
  await p.click('#p-next');

  // Flag a question
  q = await cur(p);
  if (!q.options) { await p.click('#p-show'); await p.click('[data-rate="1"]'); q = await cur(p); }
  await p.click('#p-flag'); await p.click('[data-flag="Confusing wording"]');
  const flags = await p.evaluate(() => SRApp.state.sets[SRApp.state.active].flags);
  ok('flag saved with reason', flags[q.origId || q.id] && flags[q.origId || q.id].reason === 'Confusing wording');
  // Keyboard: answer with number keys
  q = await cur(p);
  if (q.options) { await p.keyboard.press(String(q.answer + 1)); ok('number key answers', (await p.textContent('.fb')).includes('Right')); await p.click('#p-next'); }
  // explain-it question
  for (let i = 0; i < 8; i++) { q = await cur(p); if (!q || !q.options || await p.$('.done-card')) break; await answerRight(p); }
  if (!(await p.$('.done-card'))) {
    q = await cur(p);
    if (q.type === 'self') {
      ok('name-only topic: labeled a self-rating the app cannot check', (await p.textContent('.src-tag')).includes('not checked by the app'));
      await p.click('#p-show'); ok('name-only topic: says it cannot check you', (await p.textContent('.qcard')).includes('cannot check you'));
    } else {
      ok('explain-it is labeled a self-check', (await p.textContent('.src-tag')).includes('Self-check'));
      await p.fill('#p-own', 'protons, neutrons'); await p.click('#p-show');
      ok('explain-it shows notes to compare', (await p.$$('.quote')).length >= 2);
    }
    await shot(p, 'p11-explain', true);
    await p.click('[data-rate="0.5"]');
  }
  await finishSession(p);
  ok('session done screen', (await p.textContent('h1')).includes('Session done'));
  ok('completion animation present', (await p.$$('.burst i')).length === 10);
  await shot(p, 'p12-done', true);
  await p.click('.done-card a[href="#/home"]');
  ok('home: 1 of 3 sessions done', (await p.textContent('.next')).includes('1 of 3 sessions'));

  // Topic map, topic page, plan, progress
  await p.goto(URL0 + '#/topics'); await p.waitForSelector('.tcard');
  ok('topic map cards', (await p.$$('.tcard')).length === 6);
  await shot(p, 'p13-topics', true); await noOverflow(p, 'topic map');
  await p.click('.tcard >> nth=1'); await p.waitForSelector('#tp-go');
  ok('topic page shows notes with references', (await p.textContent('.card')).includes('Source: chem-notes.txt · line'));
  await p.click('#tp-go'); const one = await p.evaluate(() => SRApp.session);
  ok('practice one topic', one.qs.every(x => x.topicId === one.qs[0].topicId));
  await p.click('#p-quit');
  await p.goto(URL0 + '#/plan'); await p.waitForSelector('.day');
  ok('plan runs to test day', (await p.textContent('#view')).includes('Test day'));
  ok('plan has a light review day', (await p.textContent('#view')).includes('Light review'));
  ok('plan says missing a day is fine', (await p.textContent('#view')).includes('Missing a planned day is fine'));
  await shot(p, 'p14-plan', true); await noOverflow(p, 'plan');
  await p.goto(URL0 + '#/progress'); await p.waitForSelector('.prow');
  const prog = await p.textContent('#view');
  ok('progress: honest note', prog.includes('can’t measure everything you understand'));
  ok('progress: never says mastered or grade promise', !/master|guarantee|will pass|improve your grade/i.test(prog));
  ok('progress lists flagged question', prog.includes('Confusing wording'));
  await p.click('[data-unflag]'); ok('bring back a flagged question', Object.keys(await p.evaluate(() => SRApp.state.sets[SRApp.state.active].flags)).length === 0);
  await shot(p, 'p15-progress', true); await noOverflow(p, 'progress');
  await p.goto(URL0 + '#/more'); await p.waitForSelector('#m-wipe');
  const more = await p.textContent('#view');
  ok('more: says no AI is connected and what it needs', more.includes('not by AI') && more.includes('API key'));
  ok('more: pricing labeled as a test, nothing charged', more.includes('Idea being tested') && more.includes('Nothing is charged'));
  ok('more: no fear-based selling', !/fail your|don.t fail|before it.s too late|last chance/i.test(more));
  await shot(p, 'p16-more', true); await noOverflow(p, 'more');

  // Reload keeps everything; a session in progress resumes
  await p.goto(URL0 + '#/home'); await p.click('#h-start'); await p.waitForSelector('.qcard');
  await p.reload(); await p.waitForSelector('.qcard', { timeout: 5000 }).catch(() => {});
  ok('session resumes after reload', await p.$('.qcard') !== null);
  await p.click('#p-quit');

  // Away for 4 days: kind welcome back, plan from today, no penalty
  await p.clock.setSystemTime(new Date('2026-11-24T18:00:00')); await p.goto(URL0 + '#/home'); await p.reload(); await p.waitForSelector('#h-start');
  const home2 = await p.textContent('#view');
  ok('welcome back, nothing lost', home2.includes('Welcome back') && home2.includes('Nothing is lost'));
  ok('no streak or guilt wording', !/streak|missed \d|you missed|behind/i.test(home2));
  ok('countdown moved', home2.includes('10 days until'));
  await shot(p, 'p17-welcome-back');

  // A test-like upload gets a note (control: normal notes did not)
  await p.goto(URL0 + '#/material'); await fileChooser([path.join(tmp, 'unit4-exam.txt')]); await p.waitForTimeout(500);
  ok('graded-test note on a test-like file', (await p.textContent('#view')).includes('not during a live graded test'));
  ok('no test note on normal notes', (await p.evaluate(() => SRApp.state.sets[SRApp.state.active].docs.filter(d => d.looksLikeTest).map(d => d.name))).join() === 'unit4-exam.txt');

  // A photo of notes is read on the device (Tesseract.js from this site)
  await fileChooser([path.join(tmp, 'notes-photo.png')]);
  await p.waitForFunction(() => SRApp.state.sets[SRApp.state.active].docs.some(d => d.kind === 'image'), null, { timeout: 120000 });
  const photo = await p.evaluate(() => SRApp.state.sets[SRApp.state.active].docs.find(d => d.kind === 'image').pages[0]);
  ok('photo of notes read on the device', /chlorophyll is the green pigment/i.test(photo) && /osmosis is the diffusion of water/i.test(photo), photo);
  ok('photo notes become questions', await p.evaluate(() => SRApp.derived().questions.some(q => q.src && q.src.doc === 'notes-photo.png' && q.src.ref === 'photo')));

  // Second subject with a sample, then switch
  await p.goto(URL0 + '#/more'); await p.click('#m-new'); await p.fill('#s-sub', 'History'); await p.click('[data-mode=goal]'); await p.click('#s-next');
  await p.waitForSelector('#drop'); await p.click('summary:has-text("sample")'); await p.click('[data-sample=history]');
  ok('sample labeled as made up', (await p.textContent('.doc')).includes('sample notes made up for the demo'));
  await p.click('#s-next'); await p.waitForSelector('#t-new'); await p.click('#s-next'); await p.waitForSelector('#c-skip'); await p.click('#c-skip'); await p.waitForSelector('#s-done'); await p.click('#s-done'); await p.waitForSelector('#h-start');
  ok('goal mode home', (await p.textContent('.subject-bar')).includes('Goal'));
  await p.selectOption('#h-switch', { label: 'Chemistry' }); await p.waitForTimeout(200);
  ok('switch subject', (await p.textContent('.sub')) === 'Chemistry');

  // Delete everything
  await p.goto(URL0 + '#/more'); await p.click('#m-wipe'); await p.click('#m-wipe'); await p.waitForSelector('#w-go');
  ok('delete everything', (await p.evaluate(() => Object.keys(SRApp.state.sets).length)) === 0);
  await p.reload(); await p.waitForSelector('#w-go'); ok('still empty after reload', true);
  ok('no JS errors (iPhone journey)', errs.length === 0, errs);
  await ctx.close();

  /* ---------------- blocked storage ---------------- */
  { const c = await b.newContext(); await c.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { get() { throw new Error('blocked'); } }); });
    const pg = await c.newPage(); const e2 = []; pg.on('pageerror', e => e2.push(e.message));
    await pg.goto(URL0); await pg.click('#w-go'); await pg.fill('#s-sub', 'Bio'); await pg.click('[data-mode=goal]'); await pg.click('#s-next');
    await quickSetup(pg, 'biology'); await pg.goto(URL0 + '#/more');
    ok('blocked storage: app still works and says so', (await pg.textContent('#view')).includes('blocks saving'));
    ok('blocked storage: no errors', e2.length === 0, e2); await c.close(); }

  /* ---------------- other screens sizes ---------------- */
  for (const [name, opts] of [['iPhone SE', devices['iPhone SE']], ['iPad Mini', devices['iPad Mini']], ['Desktop', { viewport: { width: 1440, height: 900 } }], ['Laptop', { viewport: { width: 1280, height: 720 } }]]) {
    console.log('  size:', name); const c = await b.newContext(opts); const pg = await c.newPage(); await pg.clock.install({ time: NOW }); const e3 = []; pg.on('pageerror', e => e3.push(e.message));
    await pg.goto(URL0); await pg.click('#w-go'); await pg.fill('#s-sub', 'Biology'); await pg.fill('#s-date', '2026-12-04'); await pg.click('#s-next');
    await quickSetup(pg, 'biology');
    for (const r of ['home', 'topics', 'plan', 'progress', 'more', 'material']) { await pg.goto(URL0 + '#/' + r); await pg.waitForTimeout(150); await noOverflow(pg, name + ' ' + r); }
    await pg.goto(URL0 + '#/home'); await pg.click('#h-start'); await pg.waitForSelector('.opt'); const qq = await pg.evaluate(() => SRApp.session.cur);
    await pg.click(`[data-opt="${(qq.answer + 1) % qq.options.length}"]`); await noOverflow(pg, name + ' feedback');
    const vis = await pg.evaluate(() => { const r = document.getElementById('p-retry').getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top >= 0; });
    ok(name + ': Try again button is on screen after a wrong answer', vis);
    const small = await pg.evaluate(() => [...document.querySelectorAll('.opt,.btn,.rail a')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 40).length);
    ok(name + ': tap targets at least 40px', small === 0, small);
    if (SHOTS) { await pg.goto(URL0 + '#/home'); await pg.waitForTimeout(900); await pg.screenshot({ path: `${SHOTS}/z-${name.replace(/ /g, '')}-home.png` }); }
    ok(name + ': no JS errors', e3.length === 0, e3); await c.close();
  }

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
