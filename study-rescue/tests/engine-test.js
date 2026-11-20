// Checks that questions come from the uploaded notes and that wrong answers get useful feedback.
// Run: node study-rescue/tests/engine-test.js
const E = require('../engine.js');
const SAMPLES = require('../samples.js');
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) pass++; else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } }
const low = s => s.toLowerCase().replace(/\s+/g, ' ');

// Material the engine was NOT tuned on, in different note styles.
const FIXTURES = {
  chemGlossary: { kind: 'text', text: `CHEMISTRY QUIZ 2 REVIEW

Atoms
Atom: the smallest unit of an element that keeps its properties
Proton: a positive particle in the nucleus of an atom
Neutron: a particle with no charge in the nucleus
Electron: a negative particle that moves around the nucleus

Bonds
Ionic bond: a bond formed when electrons are transferred between atoms
Covalent bond: a bond formed when atoms share electrons
Molecule: two or more atoms joined by covalent bonds` },
  econProse: { kind: 'paste', text: `Supply is the amount of a good that producers are willing to sell at each price. Demand is the amount of a good that buyers are willing to purchase at each price. When the price of a good rises, the quantity demanded usually falls. A market is in equilibrium when the quantity supplied equals the quantity demanded. Inflation is a general rise in prices across the economy over time. Scarcity is the basic problem that resources are limited while wants are unlimited.
Opportunity cost is the value of the next best choice that you give up. A budget helps a family compare income with spending. Interest is the price paid for borrowing money.` },
  markdown: { kind: 'text', text: `# World War I
The **assassination of Archduke Franz Ferdinand** in 1914 triggered the war.
An alliance is an agreement between countries to support each other.
Trench warfare is fighting from long ditches dug into the ground.

# The Treaty of Versailles
The Treaty of Versailles is the 1919 peace treaty that ended the war with Germany.
Reparations are payments a defeated country makes for war damage.
The League of Nations was an international group formed to keep peace.` },
  pdfWrapped: { kind: 'pdf', pages: [`# Unit 5: Ecology
An ecosystem is all the living and nonliving things in an
area interacting with each other.
A producer is an organism that makes its own food, usually
through photosynthesis.
A consumer is an organism that eats other organisms for energy.`, `# Food webs
A food chain is a single path that shows how energy moves
from one organism to the next.
A food web is many connected food chains in one ecosystem.
A decomposer is an organism that breaks down dead material.`] },
  topicList: { kind: 'text', text: `Algebra 1 final - topics
1. Linear equations
2. Slope and intercept
3. Systems of equations
4. Exponents
5. Factoring
6. Quadratic formula` }
};

function docsFor(name) {
  if (SAMPLES[name]) return [{ name: SAMPLES[name].name, kind: 'text', pages: [SAMPLES[name].text] }];
  const f = FIXTURES[name];
  return [{ name, kind: f.kind, pages: f.pages || [f.text] }];
}
function sourceTextOf(docs) { return low(docs.map(d => d.pages.join(' ')).join(' ').replace(/\*\*/g, '')); }

const sets = ['biology', 'history', 'chemGlossary', 'econProse', 'markdown', 'pdfWrapped'];
const totals = { mc: 0, recall: 0 };
for (const name of sets) {
  const docs = docsFor(name), src = sourceTextOf(docs);
  const topics = E.findTopics(docs), qs = E.buildQuestions(topics);
  const mc = qs.filter(q => q.options);
  totals.mc += mc.length; totals.recall += qs.length - mc.length;
  ok(name + ': found topics', topics.length >= 2, topics.map(t => t.name));
  ok(name + ': enough questions', mc.length >= 6, mc.length);
  ok(name + ': every topic has a question', topics.every(t => qs.some(q => q.topicId === t.id)), topics.filter(t => !qs.some(q => q.topicId === t.id)).map(t => t.name));
  for (const q of mc) {
    const id = name + ' ' + q.type + ' "' + q.prompt.slice(0, 60) + '"';
    const quote = low(q.src.quote), right = q.options[q.answer];
    // grounding: the source sentence is really in the material, with a reference
    ok(id + ': source sentence is in the notes', src.includes(quote.replace(/\s+/g, ' ')) || src.replace(/\s+/g, ' ').includes(quote), q.src.quote);
    ok(id + ': has a reference', /^(line \d+|page \d+|photo)/.test(q.src.ref) && !!q.src.doc, q.src);
    ok(id + ': 3-4 different options', q.options.length >= 3 && q.options.length <= 4 && new Set(q.options.map(low)).size === q.options.length, q.options);
    ok(id + ': answer index valid', q.answer >= 0 && q.answer < q.options.length);
    // the marked answer comes from that sentence
    ok(id + ': right answer is in the source sentence', quote.includes(low(right.replace(/…$/, ''))), [right, q.src.quote]);
    if (q.type === 'gap') {
      ok(id + ': filling the gap gives back the notes', low(q.prompt.replace(/^Fill the gap: “|”$/g, '').replace('_____', right)) === quote, [q.prompt, right]);
      q.options.forEach((o, i) => { if (i !== q.answer) ok(id + ': wrong option not already in the sentence', !E.hasWord(q.src.quote, o), o); });
    }
    if (q.type === 'term') ok(id + ': prompt does not give away the term', !E.hasWord(q.prompt, right), [q.prompt, right]);
    // feedback: right answers praise + quote; every wrong pick gets the source line, and points to the other term's own line when there is one
    const good = E.feedback(q, q.answer);
    ok(id + ': right answer recognised', good.right && good.src === q.src);
    q.options.forEach((o, i) => {
      if (i === q.answer) return;
      const fb = E.feedback(q, i);
      ok(id + ': wrong pick is marked wrong', !fb.right);
      ok(id + ': wrong pick shows the correct answer and its line', fb.correct === right && fb.src && fb.src.quote === q.src.quote);
      ok(id + ': wrong pick has a labeled extra tip', typeof fb.extra === 'string' && fb.extra.length > 30);
      if (fb.otherSrc) ok(id + ': "you picked" explanation uses a real line from the notes', src.includes(low(fb.otherSrc.src.quote)) && E.hasWord(fb.otherSrc.src.quote, fb.otherSrc.term), fb.otherSrc);
    });
    if (q.type !== 'gap') ok(id + ': most wrong picks get a "you picked" explanation', q.options.filter((o, i) => i !== q.answer && E.feedback(q, i).otherSrc).length >= q.options.length - 2, q.options);
    // second try exists and keeps the topic
    const retry = E.retryFor(q, qs, 'x');
    ok(id + ': has a second-try question on the same topic', retry && retry.topicId === q.topicId && retry.options.length >= 3);
  }
  for (const q of qs.filter(q => q.type === 'recall')) ok(name + ' recall: compare lines are from the topic', q.compare.every(c => topics.find(t => t.id === q.topicId).sentences.some(s => s.text === c.quote)));
}
console.log('questions checked:', totals.mc, 'multiple-choice +', totals.recall, 'explain-it');

// A topic list only gets "how sure are you?" checks, never invented questions
{
  const topics = E.findTopics(docsFor('topicList')), qs = E.buildQuestions(topics);
  ok('topic list: 6 topics', topics.length === 6, topics.map(t => t.name));
  ok('topic list: names cleaned', topics[0].name === 'Linear equations', topics[0].name);
  ok('topic list: no made-up questions', qs.every(q => q.type === 'self' && q.noNotes), qs.map(q => q.type));
}
// Junk / empty input: no questions, no crash
{
  const t = E.findTopics([{ name: 'x', kind: 'text', pages: ['hello\n\n\n'] }]);
  ok('junk: no questions', E.buildQuestions(t).filter(q => q.options).length === 0);
}
// Specific sanity cases from the samples
{
  const qs = E.buildQuestions(E.findTopics(docsFor('history')));
  ok('"Congress has two parts" is not a term', !qs.some(q => /congress has two parts/i.test(q.prompt + q.options)));
  ok('Bill of Rights asked as singular with "the"', qs.some(q => q.prompt === 'In your notes, what is the Bill of Rights?'));
  const gap = qs.find(q => q.prompt.includes('_____ has two parts'));
  ok('linked term (legislative branch) never offered as a wrong answer to "Congress"', gap && !gap.options.some(o => /legislative/i.test(o)), gap && gap.options);
  const bio = E.buildQuestions(E.findTopics(docsFor('biology')));
  ok('plural grammar: "what are mitochondria"', bio.some(q => q.prompt === 'In your notes, what are mitochondria?'));
  ok('no "Plant _____" style gaps on generic words', !bio.some(q => /_____ (also|do not)/.test(q.prompt)));
}

// Honest estimates
{
  const st = a => E.topicStatus('t', a.map(r => ({ topicId: 't', r })));
  ok('no answers: not checked yet', st([]).key === 'new');
  ok('one right answer is not "solid"', st([1]).key === 'getting' && st([1]).early);
  ok('three right answers: looking solid', st([1, 1, 1]).key === 'solid' && !st([1, 1, 1]).early);
  ok('mostly wrong: needs practice', st([0, 0, 1]).key === 'practice');
  ok('recent answers count most (improvement shows)', st([0, 0, 0, 0, 1, 1, 1, 1, 1, 1]).key === 'solid');
  ok('labels never say mastered', ['new', 'practice', 'getting', 'solid'].every(k => !/master|perfect|guarantee/i.test(JSON.stringify(st(k === 'new' ? [] : k === 'practice' ? [0] : k === 'getting' ? [1, 0.5] : [1, 1, 1])))));
}

// Plan
{
  const topics = E.findTopics(docsFor('biology'));
  const base = { mode: 'test', testDate: '2026-12-04', minutes: 20, days: [0, 1, 2, 3, 4, 5], topics, answers: [] };
  const fri = new Date(2026, 10, 20);
  const p = E.buildPlan(base, fri);
  ok('plan: runs to test day', p.days[p.days.length - 1].kind === 'test' && p.days[p.days.length - 1].date === '2026-12-04');
  ok('plan: Saturday is free (not a study day)', p.days[1].kind === 'rest');
  ok('plan: 20 min = 2 sessions', p.days[0].sessions === 2);
  ok('plan: last study day is a light review', p.days.filter(d => d.kind === 'review').length === 1);
  ok('plan: every topic appears', topics.every(t => p.days.some(d => d.topics.includes(t.id))));
  // weak topics get more days
  const weakId = topics[2].id, ans = topics.flatMap(t => t.id === weakId ? [0, 0, 0] : [1, 1, 1]).map((r, i) => ({ topicId: topics[Math.floor(i / 3)].id, r }));
  const p2 = E.buildPlan(Object.assign({}, base, { answers: ans }), fri);
  const count = id => p2.days.filter(d => d.kind === 'practice' && d.topics.includes(id)).length;
  ok('plan adapts: weak topic planned more often than solid ones', count(weakId) > count(topics[0].id), [count(weakId), count(topics[0].id)]);
  // missing days: the plan simply starts from the new today, nothing to catch up
  const later = E.buildPlan(base, new Date(2026, 10, 26));
  ok('missed days: plan starts from today, no backlog', later.days[0].date === '2026-11-26' && later.days[0].sessions === 2);
  ok('past test date is reported', E.buildPlan(base, new Date(2026, 11, 6)).past);
  ok('test tomorrow: today is study, tomorrow test', (() => { const x = E.buildPlan(Object.assign({}, base, { testDate: '2026-11-21', days: [5] }), fri); return x.days.length === 2 && x.days[0].kind === 'practice' && x.days[1].kind === 'test'; })());
  const tight = E.buildPlan(Object.assign({}, base, { testDate: '2026-11-21', minutes: 10, days: [5] }), fri);
  ok('too little time is said honestly', tight.fits === false);
  const goal = E.buildPlan(Object.assign({}, base, { mode: 'goal', testDate: '' }), fri);
  ok('goal mode: 14 days', goal.days.length === 14 && !goal.days.some(d => d.kind === 'test'));
}

// Next session
{
  const topics = E.findTopics(docsFor('biology')), qs = E.buildQuestions(topics);
  const base = { mode: 'goal', minutes: 20, days: [0, 1, 2, 3, 4, 5, 6], topics, answers: [], flags: {} };
  const s = E.nextSession(base, qs, new Date(2026, 10, 20), 6);
  ok('session: 6 questions', s.questions.length === 6, s.questions.length);
  ok('session: includes one explain-it check', s.questions.filter(q => !q.options).length === 1);
  ok('session: mixes question types', new Set(s.questions.map(q => q.type)).size >= 2);
  const flagged = {}; s.questions.forEach(q => flagged[q.id] = { reason: 'x' });
  const s2 = E.nextSession(Object.assign({}, base, { flags: flagged }), qs, new Date(2026, 10, 20), 6);
  ok('flagged questions never come back', s2.questions.every(q => !flagged[q.id]));
  const missed = qs.find(q => q.options && q.topicId === s.topicIds[0]);
  const s3 = E.nextSession(Object.assign({}, base, { answers: [{ qid: missed.id, topicId: missed.topicId, r: 0 }] }), qs, new Date(2026, 10, 20), 6);
  ok('a missed question comes back first', s3.questions.some(q => q.id === missed.id));
  const one = E.nextSession(base, qs, new Date(2026, 10, 20), 6, topics[1].id);
  ok('practice one topic only', one.questions.every(q => q.topicId === topics[1].id) && one.questions.length >= 3);
  const qc = E.quickCheck(topics, qs, 8);
  ok('quick check: one question per topic', qc.length === topics.length && new Set(qc.map(q => q.topicId)).size === topics.length);
}

// Live graded test warning: control tests both ways
{
  const exam = 'Name: ________  Period: __\nUnit 4 Exam - Time limit 40 minutes\n1. What is osmosis? (2 points)\n2. What is diffusion? (2 points)\n3. Name two organelles. (3 points)\n4. Why do cells divide? (3 points)';
  ok('graded test text is noticed', E.looksLikeGradedTest(exam));
  ok('normal notes are not flagged as a test', !E.looksLikeGradedTest(SAMPLES.biology.text) && !E.looksLikeGradedTest(SAMPLES.history.text) && !E.looksLikeGradedTest(FIXTURES.econProse.text));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
