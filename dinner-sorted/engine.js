/* Dinner Sorted: ingredient matching, filters, scaling and validation. Runs on the device; nothing is sent anywhere. */
(function (root) {
  'use strict';
  var D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.DSData;
  var I = D.I;

  var ALLERGEN_LABEL = { dairy: 'milk/dairy', egg: 'egg', gluten: 'wheat/gluten', soy: 'soy', peanut: 'peanut', treenut: 'tree nut', fish: 'fish', shellfish: 'shellfish', sesame: 'sesame' };
  var DEFAULT_TEMP = { chicken: 'poultry', ground_beef: 'ground', sausage: 'sausage', salmon: 'fish', shrimp: 'shellfish', eggs: 'eggs' };
  var MAX_MISSING = 3;
  var ONE = { carrot: 'Carrot', potatoes: 'Potato', sweet_potatoes: 'Sweet potato', eggs: 'Egg', green_onion: 'Green onion', tortillas: 'Tortilla', tomato: 'Fresh tomato' };

  /* ---------- typing -> ingredient ---------- */
  var ALIAS = [];
  Object.keys(I).forEach(function (id) {
    var it = I[id];
    [it.name.toLowerCase().replace(/\s*\(.*\)/, ''), id.replace(/_/g, ' ')].concat(it.aliases).forEach(function (a) { ALIAS.push([clean(a), id]); });
  });
  ALIAS.sort(function (a, b) { return b[0].length - a[0].length; });
  function clean(s) {
    return String(s || '').toLowerCase().replace(/[’']/g, '').replace(/\b\d+([.,/]\d+)?\b/g, ' ')
      .replace(/\b(lbs?|pounds?|oz|ounces?|cups?|cans?|tins?|packs?|packets?|bags?|boxes?|jars?|bunch(es)?|heads?|some|a|an|the|of|fresh|frozen bag of|leftover|half|whole|large|small|medium|bottle)\b/g, ' ')
      .replace(/[^a-z\- ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function singular(w) { return w.replace(/ies$/, 'y').replace(/(oes)$/, 'o').replace(/([^s])s$/, '$1'); }
  function normalize(text) {
    var t = clean(text);
    if (!t) return null;
    var tries = [t, t.split(' ').map(singular).join(' ')];
    for (var k = 0; k < tries.length; k++) for (var i = 0; i < ALIAS.length; i++) if (ALIAS[i][0] === tries[k]) return ALIAS[i][1];
    // longest known name contained in the text ("2 chicken breasts" -> chicken)
    for (var j = 0; j < ALIAS.length; j++) {
      var a = ALIAS[j][0]; if (a.length < 3) continue;
      var re = new RegExp('(^| )' + a.replace(/[-]/g, '\\-') + '( |$)');
      if (re.test(tries[0]) || re.test(tries[1])) return ALIAS[j][1];
    }
    return null;
  }
  // Split "eggs, rice and 2 onions" into separate items
  function splitList(text) {
    return String(text || '').split(/,|;|\n|\band\b|\+|&/i).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function suggest(text, limit) {
    var t = clean(text); if (!t) return [];
    var seen = {}, out = [];
    ALIAS.forEach(function (a) {
      if (seen[a[1]] || I[a[1]].swapOnly) return;
      if (a[0].indexOf(t) === 0 || a[0].indexOf(' ' + t) > 0) { seen[a[1]] = 1; out.push(a[1]); }
    });
    out.sort(function (x, y) { return (I[x].name.toLowerCase().indexOf(t) === 0 ? 0 : 1) - (I[y].name.toLowerCase().indexOf(t) === 0 ? 0 : 1); });
    return out.slice(0, limit || 6);
  }

  /* ---------- conflicts: allergy, diet, excluded ---------- */
  function conflicts(id, ctx) {
    var it = I[id], out = [];
    if (!it) return out;
    (ctx.allergens || []).forEach(function (a) { if (it.flags.indexOf(a) >= 0) out.push({ kind: 'allergy', label: ALLERGEN_LABEL[a] || a }); });
    var diet = ctx.diet || {};
    if ((diet.vegetarian || diet.vegan) && (has(it, 'meat') || has(it, 'fish') || has(it, 'shellfish'))) out.push({ kind: 'diet', label: diet.vegan ? 'vegan' : 'vegetarian' });
    else if (diet.vegan && (has(it, 'dairy') || has(it, 'egg') || has(it, 'honey'))) out.push({ kind: 'diet', label: 'vegan' });
    if ((ctx.exclude || []).indexOf(id) >= 0) out.push({ kind: 'exclude', label: 'excluded' });
    if ((ctx.avoid || []).indexOf(id) >= 0) out.push({ kind: 'allergy', label: 'on your avoid list' });
    return out;
  }
  function has(it, f) { return it.flags.indexOf(f) >= 0; }

  /* ---------- plan one recipe against what the user has ---------- */
  function plan(recipe, ctx) {
    var have = new Set(ctx.have || []);
    var basics = ctx.basics !== false;
    var lines = [], notes = [], missing = [], used = [], swaps = [], labelChecks = [];
    var blocked = null;
    var people = ctx.people || recipe.serves, factor = people / recipe.serves;
    function owned(id) { return have.has(id) || (basics && I[id] && has(I[id], 'staple')); }

    recipe.ing.forEach(function (l) {
      var id = l[0], qty = l[1], unit = l[2] || '', note = l[3] || '', optional = !!l[4];
      var line = { id: id, name: I[id].name, qty: qty, unit: unit, note: note, optional: optional, amount: fmtAmount(qty, unit, factor, id) };
      if (line.amount === '1' && ONE[id]) line.name = ONE[id];
      var bad = conflicts(id, ctx);
      var subs = (recipe.subs || []).filter(function (s) { return s.f === id; });
      if (bad.length) {
        if (optional) { line.status = 'left_out'; line.why = bad[0].label; lines.push(line); return; }
        // find a swap that does not conflict; prefer one the user has
        var ok = subs.filter(function (s) { return s.u === null || !conflicts(s.u, ctx).length; });
        ok.sort(function (a, b) { return (b.u && owned(b.u) ? 1 : 0) - (a.u && owned(a.u) ? 1 : 0); });
        var s = ok[0];
        if (!s) { blocked = blocked || { id: id, label: bad[0].label, kind: bad[0].kind }; return; }
        line.status = s.u === null ? 'left_out' : (owned(s.u) ? 'have' : 'need');
        line.forced = true; line.why = bad[0].label;
        swapLine(line, s);
        lines.push(line); return;
      }
      if (owned(id)) { line.status = has(I[id], 'staple') && !have.has(id) ? 'basic' : 'have'; lines.push(line); return; }
      // user does not have it: a swap they do have?
      var mine = subs.filter(function (s) { return s.u && owned(s.u) && !conflicts(s.u, ctx).length; })[0];
      if (mine && !optional) { line.status = 'have'; swapLine(line, mine); lines.push(line); return; }
      line.status = optional ? 'optional' : 'need';
      lines.push(line);
    });
    function swapLine(line, s) {
      line.swap = { from: line.id, to: s.u, toName: s.u ? I[s.u].name : null, note: s.n, unsure: !!s.unsure };
      swaps.push(line.swap);
      if (s.u) { line.id = s.u; line.name = I[s.u].name; }
    }
    if (blocked) return { recipe: recipe, ok: false, blocked: blocked };

    var equip = ctx.equipment && ctx.equipment.length ? ctx.equipment : D.EQUIPMENT;
    var noEquip = recipe.equipment.filter(function (e) { return equip.indexOf(e) < 0; });
    if (noEquip.length) return { recipe: recipe, ok: false, blocked: { kind: 'equipment', label: noEquip.join(', ') } };

    lines.forEach(function (l) {
      if (l.status === 'need') missing.push(l);
      if (l.status === 'have' && have.has(l.id)) used.push(l);
      if (l.status !== 'left_out' && l.status !== 'optional' && I[l.id].check) labelChecks.push({ id: l.id, name: I[l.id].name, text: I[l.id].check });
    });
    var pricey = missing.filter(function (l) { return has(I[l.id], 'pricey'); });
    var over = ctx.time ? Math.max(0, recipe.time - ctx.time) : 0;
    var finalIds = lines.filter(function (l) { return l.status !== 'left_out'; }).map(function (l) { return l.id; });
    // score: use what they have, avoid shopping, prefer exact fit
    var score = used.length * 3 + (used.length / Math.max(1, countCore(recipe))) * 4 - missing.length * 4 - pricey.length * 6 - (over ? 3 + over / 5 : 0);
    if (ctx.vegFirst && !finalIds.some(function (id) { return has(I[id], 'meat'); })) score += 0.5;
    return { recipe: recipe, ok: true, lines: lines, missing: missing, used: used, pricey: pricey, swaps: swaps, labelChecks: dedupe(labelChecks), over: over, score: score, people: people, factor: factor, finalIds: finalIds, steps: stepsFor(recipe, lines, finalIds) };
  }
  function countCore(r) { return r.ing.filter(function (l) { return !l[4] && !has(I[l[0]], 'staple'); }).length; }
  function dedupe(arr) { var s = {}; return arr.filter(function (x) { if (s[x.id]) return false; s[x.id] = 1; return true; }); }

  function stepsFor(recipe, lines, finalIds) {
    var replaced = {};
    lines.forEach(function (l) { if (l.swap) replaced[l.swap.from] = l.swap.to; });
    return recipe.steps.map(function (s) {
      var temp = null;
      if (s.temp && s.ti) {
        if (finalIds.indexOf(s.ti) >= 0) temp = s.temp;
        else if (replaced[s.ti] && DEFAULT_TEMP[replaced[s.ti]]) temp = DEFAULT_TEMP[replaced[s.ti]];
      }
      return { text: s.t, timer: s.timer || 0, timerLabel: s.tl || 'Timer', temp: temp ? D.TEMPS[temp] : null, tempKey: temp };
    });
  }

  /* ---------- three choices ---------- */
  function choose(ctx, opts) {
    opts = opts || {};
    var maxMissing = opts.maxMissing || MAX_MISSING;
    var all = D.RECIPES.map(function (r) { return plan(r, ctx); });
    var ok = all.filter(function (p) { return p.ok && p.used.length > 0 && p.missing.length <= maxMissing; });
    var inTime = ok.filter(function (p) { return p.over === 0; });
    var nearTime = ok.filter(function (p) { return p.over > 0 && p.over <= 15; });
    var byScore = function (a, b) { return b.score - a.score || a.recipe.time - b.recipe.time; };
    inTime.sort(byScore); nearTime.sort(byScore);
    var list = inTime.concat(nearTime);
    var page = opts.page || 0, size = 3, pages = Math.max(1, Math.ceil(list.length / size));
    var p = list.length ? page % pages : 0;
    return { all: list, picks: list.slice(p * size, p * size + size), page: p, pages: pages, total: list.length, why: whyNone(all, ctx, list.length) };
  }
  // When nothing matches, say what is blocking it.
  function whyNone(all, ctx, n) {
    if (n) return null;
    if (!(ctx.have || []).length) return { code: 'no-ingredients' };
    var counts = { allergy: 0, diet: 0, exclude: 0, equipment: 0, missing: 0, time: 0, none: 0 };
    all.forEach(function (p) {
      if (!p.ok) { counts[p.blocked.kind] = (counts[p.blocked.kind] || 0) + 1; return; }
      if (!p.used.length) counts.none++;
      else if (p.missing.length > MAX_MISSING) counts.missing++;
      else counts.time++;
    });
    return { code: 'no-match', counts: counts };
  }

  /* ---------- amounts ---------- */
  var FR = [[0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.5, '½'], [0.667, '⅔'], [0.75, '¾']];
  function fmtNum(n) {
    if (n >= 10) return String(Math.round(n));
    var w = Math.floor(n), f = n - w, best = null;
    if (f < 0.07) return String(w || (n > 0 ? '⅛' : '0'));
    if (f > 0.93) return String(w + 1);
    FR.forEach(function (x) { if (!best || Math.abs(x[0] - f) < Math.abs(best[0] - f)) best = x; });
    return (w ? w + ' ' : '') + best[1];
  }
  var COUNTABLE = { '': 1, clove: 1, slice: 1, can: 1, pack: 1, fillet: 1, stalk: 1, head: 1 };
  function fmtAmount(qty, unit, factor, id) {
    if (qty === null || qty === undefined) return unit || '';
    var n = qty * factor;
    if (unit === 'head') n = Math.max(0.5, Math.round(n * 2) / 2);
    else if (COUNTABLE[unit] !== undefined) n = Math.max(1, Math.round(n));
    if (unit === '') n = Math.max(1, Math.round(n));
    var u = unit;
    if (u && n > 1 && ['cup', 'clove', 'slice', 'can', 'pack', 'fillet', 'stalk', 'head'].indexOf(u) >= 0) u = u + 's';
    return (fmtNum(n) + (u ? ' ' + u : '')).trim();
  }

  /* ---------- diet badges for a recipe as written ---------- */
  function badges(p) {
    var ids = p.finalIds, out = [];
    var anyMeat = ids.some(function (id) { return has(I[id], 'meat') || has(I[id], 'fish') || has(I[id], 'shellfish'); });
    if (!anyMeat) out.push('Vegetarian');
    if (!anyMeat && !ids.some(function (id) { return has(I[id], 'dairy') || has(I[id], 'egg') || has(I[id], 'honey'); })) out.push('Vegan');
    return out;
  }

  /* ---------- shopping list text + share link ---------- */
  function listText(items) {
    var open = items.filter(function (x) { return !x.done; });
    return 'Shopping list (Dinner Sorted)\n' + open.map(function (x) { return '• ' + x.name + (x.amount ? ' (' + x.amount + ')' : '') + (x.from ? ' for ' + x.from : ''); }).join('\n');
  }
  function encodeList(items) {
    var slim = items.filter(function (x) { return !x.done; }).slice(0, 60).map(function (x) { return [x.id || '', x.name, x.amount || '', x.from || '']; });
    var json = JSON.stringify(slim);
    var b64 = (typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, 'utf8').toString('base64'));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeList(s) {
    try {
      var b = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
      var json = typeof atob !== 'undefined' ? decodeURIComponent(escape(atob(b))) : Buffer.from(b, 'base64').toString('utf8');
      var arr = JSON.parse(json);
      if (!Array.isArray(arr) || arr.length > 60) return null;
      var out = [];
      for (var i = 0; i < arr.length; i++) {
        var x = arr[i];
        if (!Array.isArray(x) || typeof x[1] !== 'string' || !x[1].trim() || x[1].length > 80) return null;
        out.push({ id: I[x[0]] ? x[0] : '', name: x[1].slice(0, 80), amount: String(x[2] || '').slice(0, 40), from: String(x[3] || '').slice(0, 80) });
      }
      return out;
    } catch (e) { return null; }
  }

  /* ---------- validation: curated data now, AI output later ---------- */
  function validateRecipe(r) {
    var e = [];
    if (!r || typeof r !== 'object') return ['not an object'];
    if (!/^[a-z0-9-]{3,60}$/.test(r.id || '')) e.push('bad id');
    if (typeof r.name !== 'string' || r.name.length < 3 || r.name.length > 60) e.push('bad name');
    if (!(r.serves >= 1 && r.serves <= 12)) e.push('bad serves');
    if (!(r.time >= 5 && r.time <= 240)) e.push('bad time');
    if (['$', '$$', '$$$'].indexOf(r.cost) < 0) e.push('bad cost');
    if (!Array.isArray(r.equipment) || !r.equipment.length || r.equipment.some(function (x) { return D.EQUIPMENT.indexOf(x) < 0; })) e.push('bad equipment');
    if (!Array.isArray(r.ing) || r.ing.length < 2) e.push('too few ingredients');
    else r.ing.forEach(function (l, i) {
      if (!Array.isArray(l) || !I[l[0]]) e.push('unknown ingredient ' + (l && l[0]));
      else if (l[1] !== null && !(typeof l[1] === 'number' && l[1] > 0 && l[1] < 100)) e.push('bad qty for ' + l[0]);
    });
    if (Array.isArray(r.ing) && !r.ing.some(function (l) { return !l[4] && I[l[0]] && !has(I[l[0]], 'staple'); })) e.push('no main ingredient');
    (r.subs || []).forEach(function (s) {
      if (!r.ing.some(function (l) { return l[0] === s.f; })) e.push('swap for missing ingredient ' + s.f);
      if (s.u !== null && !I[s.u]) e.push('swap to unknown ' + s.u);
    });
    if (!Array.isArray(r.steps) || !r.steps.length) e.push('no steps');
    else r.steps.forEach(function (s, i) {
      if (typeof s.t !== 'string' || s.t.length < 8 || s.t.length > 260) e.push('bad step ' + (i + 1));
      if (s.timer !== undefined && !(Number.isInteger(s.timer) && s.timer > 0 && s.timer <= 14400)) e.push('bad timer step ' + (i + 1));
      if (s.temp && !D.TEMPS[s.temp]) e.push('bad temp step ' + (i + 1));
      if (s.temp && !s.ti) e.push('temp without ingredient step ' + (i + 1));
    });
    // safety: any recipe with raw meat, fish, shellfish or eggs must carry a temperature note on a step
    ['chicken', 'ground_beef', 'sausage', 'salmon', 'shrimp', 'eggs'].forEach(function (id) {
      if (Array.isArray(r.ing) && r.ing.some(function (l) { return l[0] === id; }) && Array.isArray(r.steps) && !r.steps.some(function (s) { return s.ti === id; })) e.push('no safety temp for ' + id);
    });
    return e;
  }

  var api = { normalize: normalize, splitList: splitList, suggest: suggest, conflicts: conflicts, plan: plan, choose: choose, fmtAmount: fmtAmount, fmtNum: fmtNum, badges: badges, listText: listText, encodeList: encodeList, decodeList: decodeList, validateRecipe: validateRecipe, ALLERGEN_LABEL: ALLERGEN_LABEL, MAX_MISSING: MAX_MISSING, data: D };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DSEngine = api;
})(this);
