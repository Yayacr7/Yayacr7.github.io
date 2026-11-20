// Checks the recipe data and the matching engine. Run: node dinner-sorted/tests/engine-test.js
const E = require('../engine.js');
const D = E.data, I = D.I;
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) pass++; else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } }
const R = id => D.RECIPES.find(r => r.id === id);

/* ---------- data ---------- */
ok('at least 25 recipes', D.RECIPES.length >= 25, D.RECIPES.length);
const ids = new Set();
D.RECIPES.forEach(r => {
  const errs = E.validateRecipe(r);
  ok('valid recipe ' + r.id, errs.length === 0, errs);
  ok('unique id ' + r.id, !ids.has(r.id)); ids.add(r.id);
  ok('has art ' + r.id, r.art && r.art.colors.length === 3);
  // steps that mention an oven temperature use both F and C
  r.steps.forEach((s, i) => { if (/°F/.test(s.t)) ok('oven temp has °C ' + r.id + ' ' + i, /°C/.test(s.t)); });
});
ok('every common item exists', D.COMMON.every(id => I[id]));
// no recipe needs something pricey without it being flagged (only salmon, shrimp are pricey)
ok('pricey items are flagged', ['salmon', 'shrimp'].every(id => I[id].flags.includes('pricey')));
// all temperature texts match USDA chart numbers
ok('poultry 165', /165°F/.test(D.TEMPS.poultry.text));
ok('ground 160', /160°F/.test(D.TEMPS.ground.text));
ok('fish 145', /145°F/.test(D.TEMPS.fish.text));
ok('egg dish 160', /160°F/.test(D.TEMPS.eggdish.text));
ok('temp source is USDA', /fsis\.usda\.gov/.test(D.TEMP_SOURCE.url));

/* ---------- validator rejects bad (e.g. AI) recipes ---------- */
const good = JSON.parse(JSON.stringify(R('beef-tacos')));
ok('validator accepts copy', E.validateRecipe(good).length === 0);
const bad = (patch, label) => { const r = Object.assign(JSON.parse(JSON.stringify(good)), patch); ok('validator rejects ' + label, E.validateRecipe(r).length > 0, E.validateRecipe(r)); };
bad({ ing: [['dragonfruit_x', 1, ''], ['onion', 1, '']] }, 'unknown ingredient');
bad({ time: 2 }, 'silly time');
bad({ steps: [] }, 'no steps');
bad({ steps: good.steps.map(s => Object.assign({}, s, { ti: undefined, temp: undefined })) }, 'ground beef without safety temp');
bad({ equipment: ['air fryer'] }, 'unknown equipment');
bad({ cost: 'cheap' }, 'bad cost');
bad({ steps: [{ t: 'Cook it.', timer: -5 }] }, 'bad timer');
ok('validator rejects non-object', E.validateRecipe(null).length > 0);

/* ---------- typing -> ingredient ---------- */
const N = {
  '2 chicken breasts': 'chicken', 'Eggs': 'eggs', 'egg': 'eggs', 'spaghetti': 'pasta', 'black pepper': 'black_pepper', 'red pepper': 'bell_pepper',
  'tinned tomatoes': 'canned_tomatoes', 'cheddar': 'cheese', 'scallions': 'green_onion', 'frozen peas': 'frozen_peas', 'a can of chickpeas': 'chickpeas',
  'tomatoes': 'tomato', 'half an onion': 'onion', '1 lb ground beef': 'ground_beef', 'leftover rice': 'rice', 'greek yogurt': 'yogurt', 'sweet potato': 'sweet_potatoes',
  'potatoes': 'potatoes', 'Soy Sauce': 'soy_sauce', 'courgette': 'zucchini'
};
Object.keys(N).forEach(t => ok('normalize "' + t + '"', E.normalize(t) === N[t], E.normalize(t)));
['bananas', 'xyz', '', '   ', 'unicorn steak'].forEach(t => ok('unknown stays unknown "' + t + '"', E.normalize(t) === null, E.normalize(t)));
ok('split list', JSON.stringify(E.splitList('eggs, rice and 2 onions; milk')) === JSON.stringify(['eggs', 'rice', '2 onions', 'milk']));
ok('suggest "chi" starts with chicken', E.suggest('chi')[0] === 'chicken', E.suggest('chi'));
ok('suggest empty', E.suggest('').length === 0);

/* ---------- matching ---------- */
let c = E.choose({ have: ['chicken', 'rice', 'garlic', 'eggs'], people: 2, time: 30 });
ok('three picks', c.picks.length === 3);
ok('every pick uses something', c.picks.every(p => p.used.length > 0));
ok('picks need at most 3 things', c.picks.every(p => p.missing.length <= 3));
ok('in-time meals come first', c.picks[0].over === 0);
ok('egg fried rice is top for chicken/rice/garlic/eggs', c.picks[0].recipe.id === 'egg-fried-rice', c.picks.map(p => p.recipe.id));
// pages cycle and give different meals
const c2 = E.choose({ have: ['chicken', 'rice', 'garlic', 'eggs'], people: 2, time: 30 }, { page: 1 });
ok('page 2 different', c2.picks.every(p => !c.picks.some(q => q.recipe.id === p.recipe.id)));
const cLast = E.choose({ have: ['chicken', 'rice', 'garlic', 'eggs'], people: 2, time: 30 }, { page: c.pages });
ok('pages wrap around', cLast.page === 0);

// nothing they have -> no meals, and the reason is given
c = E.choose({ have: [] });
ok('no ingredients: empty with reason', c.picks.length === 0 && c.why.code === 'no-ingredients');
c = E.choose({ have: ['avocado'], time: 15 });
ok('avocado alone: reason given', c.picks.length === 0 ? !!c.why : true);

// excluding an ingredient removes meals that need it, and regenerates
c = E.choose({ have: ['pasta', 'garlic', 'lemon', 'canned_tuna'], time: 30 });
ok('tuna pasta found', c.all.some(p => p.recipe.id === 'lemon-tuna-pasta'));
const cx = E.choose({ have: ['pasta', 'garlic', 'lemon', 'canned_tuna'], time: 30, exclude: ['canned_tuna'] });
ok('excluding tuna drops tuna pasta', !cx.all.some(p => p.recipe.id === 'lemon-tuna-pasta'));
ok('excluding garlic drops nothing silently: every result still has no garlic line', E.choose({ have: ['pasta', 'garlic'], exclude: ['garlic'] }).all.every(p => !p.lines.some(l => l.id === 'garlic' && l.status !== 'left_out')));

/* ---------- allergies and diets ---------- */
function allSafe(res, flag) { return res.all.every(p => p.lines.every(l => l.status === 'left_out' || !I[l.id].flags.includes(flag))); }
const big = ['chicken', 'ground_beef', 'eggs', 'pasta', 'rice', 'cheese', 'butter', 'tortillas', 'black_beans', 'onion', 'garlic', 'canned_tomatoes', 'soy_sauce', 'peanut_butter', 'shrimp', 'salmon', 'bread', 'milk', 'tofu', 'broccoli', 'spinach', 'potatoes', 'sesame_oil', 'canned_tuna'];
['dairy', 'egg', 'gluten', 'soy', 'peanut', 'fish', 'shellfish', 'sesame'].forEach(a => {
  const res = E.choose({ have: big, allergens: [a] }, { maxMissing: 9 });
  ok('no ' + a + ' in any used line', allSafe(res, a));
  ok('still has meals with ' + a + ' allergy', res.total > 0, res.total);
});
let res = E.choose({ have: big, diet: { vegetarian: true } }, { maxMissing: 9 });
ok('vegetarian: no meat or fish', res.all.every(p => p.lines.every(l => l.status === 'left_out' || !['meat', 'fish', 'shellfish'].some(f => I[l.id].flags.includes(f)))));
res = E.choose({ have: big, diet: { vegan: true } }, { maxMissing: 9 });
ok('vegan: no animal products', res.all.every(p => p.lines.every(l => l.status === 'left_out' || !['meat', 'fish', 'shellfish', 'dairy', 'egg', 'honey'].some(f => I[l.id].flags.includes(f)))));
ok('vegan still has meals', res.total > 0);
// forced swap is marked and uncertain swaps flagged
let p = E.plan(R('aglio-olio'), { have: ['pasta', 'garlic', 'olive_oil'], allergens: ['gluten'] });
ok('gluten: pasta swapped to gf pasta', p.ok && p.lines.some(l => l.forced && l.id === 'gf_pasta'));
ok('gf pasta swap flagged check label', p.swaps.some(s => s.to === 'gf_pasta' && s.unsure));
ok('gf pasta label check listed', p.labelChecks.some(x => x.id === 'gf_pasta'));
p = E.plan(R('peanut-noodles'), { have: ['pasta', 'peanut_butter'], allergens: ['peanut'] });
ok('peanut allergy: peanut butter swapped and flagged', p.ok && p.lines.some(l => l.id === 'sunflower_butter' && l.forced) && p.swaps.some(s => s.unsure));
p = E.plan(R('lemon-garlic-shrimp'), { have: ['pasta', 'shrimp'], allergens: ['shellfish'] });
ok('shellfish allergy: shrimp swapped to chicken', p.ok && p.lines.some(l => l.id === 'chicken'));
ok('swapped-in chicken gets the poultry temperature', p.steps.some(s => s.tempKey === 'poultry'));
ok('no shellfish note left once swapped', !p.steps.some(s => s.tempKey === 'shellfish'));
p = E.plan(R('shakshuka'), { have: ['eggs'], allergens: ['egg'] });
ok('egg allergy blocks shakshuka (no swap)', !p.ok && p.blocked.label === 'egg');
// avoid list
p = E.plan(R('beef-tacos'), { have: ['ground_beef', 'tortillas'], avoid: ['onion'] });
ok('avoid onion: onion left out, recipe still ok', p.ok && p.lines.some(l => l.status === 'left_out' && l.swap && l.swap.from === 'onion'));

/* ---------- equipment and time ---------- */
res = E.choose({ have: ['potatoes', 'cheese', 'tortillas', 'black_beans'], equipment: ['microwave'] });
ok('microwave only: only microwave meals', res.all.length > 0 && res.all.every(p => p.recipe.equipment.every(e => e === 'microwave')));
res = E.choose({ have: ['chicken', 'potatoes', 'carrot', 'onion'], time: 15 });
ok('15 min: nothing over 30 min', res.all.every(p => p.recipe.time <= 30));
ok('over-time meals are labeled', res.all.filter(p => p.recipe.time > 15).every(p => p.over > 0));

/* ---------- pricey items never sneak in ---------- */
res = E.choose({ have: ['soy_sauce', 'honey', 'garlic', 'rice'] }, { maxMissing: 9 });
const salmon = res.all.find(p => p.recipe.id === 'honey-soy-salmon');
ok('salmon shown as needed and pricey', !salmon || (salmon.missing.some(l => l.id === 'salmon') && salmon.pricey.length === 1));
ok('pricey meal ranks below a similar cheap one', !salmon || res.all.indexOf(salmon) > res.all.findIndex(p => p.recipe.id === 'beef-broccoli-bowls'));

/* ---------- basics ---------- */
p = E.plan(R('aglio-olio'), { have: ['pasta', 'garlic', 'olive_oil'], basics: false });
ok('basics off: salt is needed', p.missing.some(l => l.id === 'salt'));
p = E.plan(R('aglio-olio'), { have: ['pasta', 'garlic', 'olive_oil'] });
ok('basics on: salt is a basic', p.lines.find(l => l.id === 'salt').status === 'basic');

/* ---------- scaling ---------- */
ok('fmt ½', E.fmtNum(0.5) === '½');
ok('fmt 1 ½', E.fmtNum(1.5) === '1 ½');
ok('fmt ⅓', E.fmtNum(0.33) === '⅓');
ok('fmt 12', E.fmtNum(12.2) === '12');
ok('eggs scale to whole', E.fmtAmount(3, '', 0.5, 'eggs') === '2');
ok('cups plural', E.fmtAmount(1.5, 'cup', 1) === '1 ½ cups');
ok('null qty keeps label', E.fmtAmount(null, 'to taste', 2) === 'to taste');
p = E.plan(R('beef-tacos'), { have: ['ground_beef'], people: 8 });
ok('8 people doubles beef', p.lines.find(l => l.id === 'ground_beef').amount === '2 lb');

// no "1 ½ cloves" or "½ can" at any serving size, and notes never state a count that would go stale when scaled
let fracBad = [];
D.RECIPES.forEach(r => [1, 2, 3, 5, 8, 12].forEach(n => E.plan(r, { have: [], people: n }).lines.forEach(l => { if (/[½¼¾⅓⅔⅛] (clove|slice|can|pack|fillet|stalk)/.test(l.amount) || /^[½¼¾⅓⅔⅛]$|^\d+ [½¼¾⅓⅔⅛]$/.test(l.amount)) fracBad.push(r.id + ' ' + n + ' ' + l.amount + ' ' + l.name); })));
ok('whole numbers for countable things', fracBad.length === 0, fracBad.slice(0, 5));
ok('notes do not hard-code can counts', D.RECIPES.every(r => r.ing.every(l => !/\b\d+ cans?\b/.test(l[3] || ''))));

/* ---------- share links ---------- */
const items = [{ id: 'eggs', name: 'Eggs', amount: '6', from: 'Shakshuka', done: false }, { id: '', name: 'Crème fraîche & “stuff”', amount: '', from: '', done: false }, { id: 'rice', name: 'Rice', done: true }];
const enc = E.encodeList(items), dec = E.decodeList(enc);
ok('share link round trip', dec && dec.length === 2 && dec[1].name === 'Crème fraîche & “stuff”', dec);
ok('ticked items not shared', !dec.some(x => x.name === 'Rice'));
ok('link is url-safe', /^[A-Za-z0-9_-]+$/.test(enc));
['', 'abc', '!!!', E.encodeList([]).slice(0, 2), Buffer.from('{"a":1}').toString('base64'), Buffer.from(JSON.stringify([[1, 2]])).toString('base64')].forEach((s, i) => ok('damaged link rejected ' + i, E.decodeList(s) === null || (Array.isArray(E.decodeList(s)) && E.decodeList(s).length === 0 && s === E.encodeList([]).slice(0, 2)), E.decodeList(s)));
ok('list text', /• Eggs \(6\) for Shakshuka/.test(E.listText(items)));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
