/* Monthly budget dashboard (tools/budget). Everything is worked out in this browser; nothing is sent anywhere.
   All page text is built with textContent / createElement, never innerHTML. */
(function(){
"use strict";
var form = document.getElementById('f-budget'); if(!form) return;
var $ = function(id){ return document.getElementById(id); };
function mk(tag, cls, text){ var n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; }
function clear(el){ while(el.firstChild) el.removeChild(el.firstChild); return el; }
function money(v){
  var neg = v < 0, a = Math.round(Math.abs(v) * 100) / 100, whole = a === Math.floor(a);
  return (neg ? '−$' : '$') + a.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
}
function pct(part, whole){ return whole > 0 ? Math.round(part / whole * 100) + '%' : '—'; }
function store(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
function load(k, d){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } }

/* Two modes share one dashboard. Each mode has its own income boxes and spending groups. */
var MODES = {
  adult: { inc: [['b-inc-main', 'Take-home pay'], ['b-inc-other', 'Other income']], g: { needs: 'Needs and debt', wants: 'Wants' }, guide: true },
  teen:  { inc: [['t-inc-jobs', 'Jobs and allowance'], ['t-inc-sales', 'Sales from my business']], g: { needs: 'My business', wants: 'Everyday spending' }, guide: false }
};
var mode = load('sharp-budget-mode', 'adult') === 'teen' ? 'teen' : 'adult';
function cats(){
  var box = form.querySelector('[data-mode="' + mode + '"]');
  return Array.prototype.map.call(box.querySelectorAll('[data-cat]'), function(el){
    var id = el.getAttribute('data-cat');
    return { id: id, name: el.getAttribute('data-name'), group: el.getAttribute('data-group'), spentId: el.id, budId: box.querySelector('[data-bud="' + id + '"]').id };
  });
}
// Example savings numbers for each mode. They only change if the visitor hasn't typed their own.
var SAVE_EX = { adult: { 'b-save': 300, 'b-savegoal': 400, 'b-saved': 1500, 'b-target': 6000 }, teen: { 'b-save': 80, 'b-savegoal': 100, 'b-saved': 300, 'b-target': 1000 } };
var saveTouched = false;
['b-save', 'b-savegoal', 'b-saved', 'b-target'].forEach(function(id){ $(id).addEventListener('input', function(){ saveTouched = true; }); });
function setMode(m){
  mode = m; store('sharp-budget-mode', m);
  if(!saveTouched) Object.keys(SAVE_EX[m]).forEach(function(id){ $(id).value = SAVE_EX[m][id]; });
  Array.prototype.forEach.call(form.querySelectorAll('[data-mode]'), function(b){ b.hidden = b.getAttribute('data-mode') !== m; });
  Array.prototype.forEach.call(document.querySelectorAll('[data-set-mode]'), function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-set-mode') === m ? 'true' : 'false'); });
  picked = null; update();
}
var STATUS = { good: ['✓', 'Under or on budget'], warn: ['!', 'Close to budget (90–99%)'], bad: ['✕', 'Over budget'], none: ['–', 'No budget set'] };

/* Reads one box. Empty = null. Anything not a number 0 or more is an error (and counts as 0). */
function val(id, errs, label){
  var el = $(id), raw = String(el.value).trim().replace(/,/g, '');
  el.removeAttribute('aria-invalid');
  if(raw === '') return null;
  var v = Number(raw);
  if(!isFinite(v) || v < 0){ el.setAttribute('aria-invalid', 'true'); errs.push(label); return null; }
  return Math.round(v * 100) / 100;
}
function read(){
  var errs = [], d = {};
  var M = MODES[mode];
  d.mode = mode;
  d.main = val(M.inc[0][0], errs, M.inc[0][1]); d.other = val(M.inc[1][0], errs, M.inc[1][1]);
  d.income = (d.main || 0) + (d.other || 0);
  d.cats = cats().map(function(c){
    var spent = val(c.spentId, errs, c.name + ' (spent)'), bud = val(c.budId, errs, c.name + ' (budget)');
    var s = spent || 0, st = bud == null ? 'none' : s > bud ? 'bad' : s < bud && s >= bud * 0.9 ? 'warn' : 'good';
    return { id: c.id, name: c.name, group: c.group, spent: s, budget: bud, status: st, diff: bud == null ? null : s - bud };
  });
  d.save = val('b-save', errs, 'Saved this month') || 0;
  d.goal = val('b-savegoal', errs, 'Monthly savings goal');
  d.saved = val('b-saved', errs, 'Total saved so far');
  d.target = val('b-target', errs, 'Savings target');
  d.expenses = d.cats.reduce(function(a, c){ return a + c.spent; }, 0);
  d.needs = d.cats.filter(function(c){ return c.group === 'needs'; }).reduce(function(a, c){ return a + c.spent; }, 0);
  d.wants = d.expenses - d.needs;
  d.left = d.income - d.expenses - d.save;
  // Teen mode: business profit = sales − business costs (both typed by the visitor).
  if(mode === 'teen'){ d.sales = d.other || 0; d.profit = d.sales - d.needs; }
  d.errs = errs;
  return d;
}

/* ---------- 1. overview cards ---------- */
function cards(d){
  var box = clear($('bd-cards'));
  var teen = d.mode === 'teen';
  box.classList.toggle('six', teen);
  var list = [[ 'Income', money(d.income), teen ? money(d.main || 0) + ' jobs + ' + money(d.other || 0) + ' sales' : d.other ? money(d.main || 0) + ' pay + ' + money(d.other) + ' other' : 'what comes in each month', teen ? 'jobs + business sales' : 'pay + other income'],
   ['Expenses', money(d.expenses), pct(d.expenses, d.income) + ' of income', 'all spending boxes added up'],
   ['Savings', money(d.save), d.goal != null ? 'goal ' + money(d.goal) : 'kept separate from expenses', 'what you put away this month'],
   ['Remaining', money(d.left), d.left < 0 ? 'you are short this month' : 'not given a job yet', 'income − expenses − savings', d.left < 0],
   ['Savings rate', pct(d.save, d.income), 'of your income is saved', 'savings ÷ income']];
  if(teen) list.push(['Business profit', money(d.profit), d.sales > 0 ? 'you keep ' + pct(d.profit, d.sales) + ' of each sale' : 'add your sales to see it', 'sales − business costs', d.profit < 0]);
  list.forEach(function(k){
    var c = mk('div', 'kpi'); c.appendChild(mk('span', null, k[0])); c.appendChild(mk('b', k[4] ? 'neg' : null, k[1])); c.appendChild(mk('small', null, k[2]));
    c.appendChild(mk('em', null, '= ' + k[3])); box.appendChild(c);
  });
}

/* ---------- 2. plain-words summary, using the real numbers ---------- */
function part(box, title){ var sec = mk('div', 'sum-part'); sec.appendChild(mk('h4', null, title)); box.appendChild(sec); return sec; }
function item(list, icon, cls, text){ var li = mk('li', cls); li.appendChild(mk('i', 'ic ' + cls, icon)); li.appendChild(mk('span', null, text)); list.appendChild(li); }
function summary(d){
  var box = clear($('bd-summary'));
  if(d.income <= 0){ box.appendChild(mk('p', null, 'Enter your take-home pay to see your summary. Every other number depends on it.')); return; }
  var big = part(box, 'The big picture');
  big.appendChild(mk('p', null, 'You bring home ' + money(d.income) + ' a month. You spend ' + money(d.expenses) + ' (' + pct(d.expenses, d.income) + ' of it) and save ' + money(d.save) + ' (' + pct(d.save, d.income) + '). ' +
    (d.left > 0 ? 'That leaves ' + money(d.left) + ' with no plan yet.' : d.left === 0 ? 'Every dollar has a job. Nice.' : 'That is ' + money(-d.left) + ' more than you bring in, so something has to give.')));
  if(d.mode === 'teen'){
    var bz = part(box, 'Your business');
    bz.appendChild(mk('p', null, d.sales > 0
      ? 'You sold ' + money(d.sales) + ' and spent ' + money(d.needs) + ' on your business, so your profit is ' + money(d.profit) + '. ' +
        (d.profit > 0 ? 'You keep ' + pct(d.profit, d.sales) + ' of every sale.' : d.profit === 0 ? 'You broke even: no profit, no loss.' : 'Your business lost money this month. Look at what each sale costs you.')
      : 'Add your sales from your business to see your profit.' + (d.needs > 0 ? ' Right now you have ' + money(d.needs) + ' of business costs and no sales.' : '')));
  }
  var top = d.cats.filter(function(c){ return c.spent > 0; }).sort(function(a, b){ return b.spent - a.spent; }).slice(0, 3);
  if(top.length){
    var tp = part(box, 'Where most of your money goes'), ul = mk('ul', 'sum-list');
    top.forEach(function(c){ var li = mk('li'); li.appendChild(mk('span', null, c.name + ': ' + money(c.spent) + ', which is ' + pct(c.spent, d.expenses) + ' of your spending and ' + pct(c.spent, d.income) + ' of your income.')); ul.appendChild(li); });
    tp.appendChild(ul);
  }
  var over = d.cats.filter(function(c){ return c.status === 'bad'; }).sort(function(a, b){ return b.diff - a.diff; });
  var close = d.cats.filter(function(c){ return c.status === 'warn'; });
  var overTotal = over.reduce(function(a, c){ return a + c.diff; }, 0);
  var ob = part(box, 'Budget check'), ul2 = mk('ul', 'sum-list');
  if(over.length) over.forEach(function(c){ item(ul2, '✕', 'bad', c.name + ' is over by ' + money(c.diff) + '. You planned ' + money(c.budget) + ' and spent ' + money(c.spent) + ' (' + pct(c.spent, c.budget) + ' of budget).'); });
  close.forEach(function(c){ item(ul2, '!', 'warn', c.name + ' is close: ' + money(c.spent) + ' of ' + money(c.budget) + ' (' + pct(c.spent, c.budget) + '). Only ' + money(-c.diff) + ' left in it.'); });
  if(!over.length && !close.length) item(ul2, '✓', 'good', 'Every category with a budget is under or on budget.');
  else if(over.length) item(ul2, '=', 'none', 'Total over budget: ' + money(overTotal) + ' a month.');
  ob.appendChild(ul2);
  var steps = [];
  if(d.left < 0) steps.push('You are short ' + money(-d.left) + '. Cover it first by cutting the categories marked ✕.');
  over.slice(0, 2).forEach(function(c){ steps.push('Bring ' + c.name + ' back to ' + money(c.budget) + '. That frees ' + money(c.diff) + ' a month.'); });
  if(d.goal != null && d.save < d.goal){
    var gap = d.goal - d.save;
    steps.push('Save ' + money(gap) + ' more to reach your ' + money(d.goal) + ' monthly goal.' + (overTotal > 0 ? ' Fixing the over-budget categories would free ' + money(Math.min(overTotal, gap)) + ' of that.' : ''));
  }
  if(d.left > 0) steps.push('Give the leftover ' + money(d.left) + ' a job. If you saved it, your savings rate would go from ' + pct(d.save, d.income) + ' to ' + pct(d.save + d.left, d.income) + '.');
  if(d.save / d.income < 0.2) steps.push('A common rule of thumb is to save 20% of income. For you that is ' + money(d.income * 0.2) + ' a month; you save ' + money(d.save) + '.');
  if(steps.length){ var ns = part(box, 'What to do next'), ol = mk('ol', 'sum-steps'); steps.slice(0, 4).forEach(function(t){ ol.appendChild(mk('li', null, t)); }); ns.appendChild(ol); }
}

/* ---------- 3. spent vs budget chart (one dollar scale for every row) ---------- */
function niceMax(v){
  if(v <= 0) return 100;
  var step = v / 4, p = Math.pow(10, Math.floor(Math.log10(step)));
  var m = [1, 2, 2.5, 5, 10].find(function(x){ return x * p >= step; });
  return m * p * 4;
}
var picked = null;
function detail(c, d){
  var t = c.name + ': spent ' + money(c.spent);
  if(c.budget == null) t += '. No budget set, so it can\'t be over or under.';
  else t += ', budget ' + money(c.budget) + '. ' + (c.diff > 0 ? 'Over by ' + money(c.diff) : c.diff < 0 ? 'Under by ' + money(-c.diff) : 'Exactly on budget') +
    (c.budget > 0 ? ' (' + pct(c.spent, c.budget) + ' of budget).' : '.');
  if(d.income > 0) t += ' That is ' + pct(c.spent, d.income) + ' of your income.';
  return t;
}
function compare(d){
  var box = clear($('bd-cmp'));
  var max = niceMax(Math.max.apply(null, d.cats.map(function(c){ return Math.max(c.spent, c.budget || 0); })));
  var axis = mk('div', 'bd-axis'); axis.setAttribute('aria-hidden', 'true'); axis.appendChild(mk('span', null, 'Category'));
  var ticks = mk('div', 'ticks'); for(var i = 0; i <= 4; i++){ var s = mk('span', null, money(max * i / 4)); s.style.left = (i * 25) + '%'; if(i === 4){ s.style.left = 'auto'; s.style.right = '0'; s.style.transform = 'none'; } ticks.appendChild(s); }
  axis.appendChild(ticks); axis.appendChild(mk('span', null, 'Spent / budget')); box.appendChild(axis);
  var lastGroup = null;
  d.cats.forEach(function(c){
    if(c.group !== lastGroup){
      lastGroup = c.group;
      var g = d.cats.filter(function(x){ return x.group === c.group; }), gs = g.reduce(function(a, x){ return a + x.spent; }, 0);
      var gb = g.filter(function(x){ return x.budget != null; }).reduce(function(a, x){ return a + x.budget; }, 0);
      var gh = mk('p', 'cmp-group', MODES[d.mode].g[c.group] + ': spent ' + money(gs) + (gb > 0 ? ' of ' + money(gb) + ' budgeted (' + pct(gs, gb) + ')' : '') + (d.income > 0 ? ' · ' + pct(gs, d.income) + ' of income' : ''));
      box.appendChild(gh);
    }
    var row = mk('button', 'cmp-row ' + c.status); row.type = 'button';
    row.setAttribute('aria-pressed', picked === c.id ? 'true' : 'false');
    row.setAttribute('aria-label', detail(c, d));
    row.appendChild(mk('span', 'cmp-name', c.name));
    var tr = mk('span', 'cmp-track'), bar = mk('i', 'cmp-bar');
    bar.style.width = (c.spent / max * 100).toFixed(2) + '%'; if(c.spent > 0) bar.style.minWidth = '3px';
    tr.appendChild(bar);
    if(c.budget != null){ var m = mk('i', 'cmp-mark'); m.style.left = (c.budget / max * 100).toFixed(2) + '%'; tr.appendChild(m); }
    row.appendChild(tr);
    var v = mk('span', 'cmp-val');
    v.appendChild(mk('b', null, money(c.spent) + (c.budget != null ? ' / ' + money(c.budget) : '')));
    var st = mk('span', 'cmp-st'); st.appendChild(mk('i', 'ic ' + c.status, STATUS[c.status][0]));
    st.appendChild(document.createTextNode(c.budget == null ? 'No budget' : c.diff > 0 ? money(c.diff) + ' over · ' + pct(c.spent, c.budget) : c.diff < 0 ? money(-c.diff) + ' under · ' + pct(c.spent, c.budget) : 'On budget'));
    v.appendChild(st); row.appendChild(v);
    row.addEventListener('click', function(){ picked = c.id; $('bd-detail').textContent = detail(c, d); box.querySelectorAll('.cmp-row').forEach(function(x){ x.setAttribute('aria-pressed', x === row ? 'true' : 'false'); }); });
    box.appendChild(row);
  });
  var cur = d.cats.filter(function(c){ return c.id === picked; })[0];
  $('bd-detail').textContent = cur ? detail(cur, d) : 'Tap a row to see its details.';
}

/* ---------- 4. income split vs the 50/30/20 guide ---------- */
var SEG = { needs: 'Needs and debt', wants: 'Wants', save: 'Savings', left: 'Left over', short: 'Short (spent more than income)' };
function segs(d){ SEG.needs = MODES[d.mode].g.needs; SEG.wants = MODES[d.mode].g.wants; }
function incomeChart(d){
  var box = clear($('bd-inc'));
  segs(d);
  if(d.income <= 0){ box.appendChild(mk('p', 'fine', 'Enter your income to see this chart.')); return; }
  var out = d.needs + d.wants + d.save, scale = Math.max(d.income, out);
  var detailP = mk('p', 'bd-detail', 'Tap a part of a bar to see its details.'); detailP.setAttribute('role', 'status');
  function bar(label, parts, showIncomeLine){
    var row = mk('div', 'inc-row'); row.appendChild(mk('span', null, label));
    var b = mk('div', 'inc-bar');
    parts.forEach(function(p){
      if(p.v <= 0) return;
      var s = mk('button', 'inc-seg'); s.type = 'button'; s.setAttribute('data-k', p.k);
      var w = p.v / scale * 100; s.style.flex = '0 0 calc(' + w.toFixed(3) + '% - 2px)';
      var txt = SEG[p.k] + ': ' + money(p.v) + ' (' + pct(p.v, d.income) + ' of income)';
      if(w >= 14) s.textContent = pct(p.v, d.income);
      s.setAttribute('aria-label', label + ', ' + txt);
      s.addEventListener('click', function(){ detailP.textContent = label + ': ' + txt + (p.note ? '. ' + p.note : '.'); });
      b.appendChild(s);
    });
    if(showIncomeLine && out > d.income){ var l = mk('i', 'inc-inc'); l.style.left = (d.income / scale * 100) + '%'; l.title = 'Your income'; b.appendChild(l); }
    row.appendChild(b); return row;
  }
  var you = d.left >= 0
    ? [{ k: 'needs', v: d.needs }, { k: 'wants', v: d.wants }, { k: 'save', v: d.save }, { k: 'left', v: d.left }]
    : [{ k: 'needs', v: d.needs }, { k: 'wants', v: d.wants }, { k: 'save', v: d.save }];
  box.appendChild(bar('You', you, true));
  if(MODES[d.mode].guide) box.appendChild(bar('Guide', [{ k: 'needs', v: d.income * 0.5, note: 'Guide: 50% of income' }, { k: 'wants', v: d.income * 0.3, note: 'Guide: 30% of income' }, { k: 'save', v: d.income * 0.2, note: 'Guide: 20% of income' }], false));
  if(d.left < 0) box.appendChild(mk('p', 'fine', 'Your bar is longer than your income (the white line) by ' + money(-d.left) + '. That gap is spending you can\'t cover this month.'));
  var lg = mk('div', 'inc-legend');
  ['needs', 'wants', 'save', 'left'].forEach(function(k){ var s = mk('span'); var i = mk('i'); i.style.background = 'var(--c-' + k + ')'; s.appendChild(i); s.appendChild(document.createTextNode(SEG[k])); lg.appendChild(s); });
  box.appendChild(lg); box.appendChild(detailP);
  // The same numbers as a table, for screen readers and exact values.
  var t = mk('table', 'inc-table'), cap = mk('caption', 'sr', 'Your income split compared with the 50/30/20 guide'); t.appendChild(cap);
  var guide = MODES[d.mode].guide;
  var h = mk('tr'); (guide ? ['', 'You', 'Guide'] : ['', 'You']).forEach(function(x){ h.appendChild(mk('th', null, x)); }); t.appendChild(h);
  [[SEG.needs, d.needs, 0.5], [SEG.wants, d.wants, 0.3], ['Savings', d.save, 0.2], [d.left >= 0 ? 'Left over' : 'Short', Math.abs(d.left), null]].forEach(function(r){
    var tr = mk('tr'); tr.appendChild(mk('td', null, r[0])); tr.appendChild(mk('td', null, money(r[1]) + ' · ' + pct(r[1], d.income)));
    if(guide) tr.appendChild(mk('td', null, r[2] == null ? '—' : money(d.income * r[2]) + ' · ' + Math.round(r[2] * 100) + '%'));
    t.appendChild(tr);
  });
  box.appendChild(t);
  // Two shares of one total: round the first, give the second the rest, so they always add to 100%.
  var split = function(a){ var p1 = Math.round(a / d.income * 100); return [p1 + '%', (100 - p1) + '%']; };
  if(d.mode === 'teen' && d.income > 0){ var sp = split(d.main || 0); box.appendChild(mk('p', 'fine', 'Income sources: jobs and allowance ' + money(d.main || 0) + ' (' + sp[0] + '), business sales ' + money(d.other || 0) + ' (' + sp[1] + ').')); }
  else if(d.other){ var sq = split(d.main || 0); box.appendChild(mk('p', 'fine', 'Income sources: take-home pay ' + money(d.main || 0) + ' (' + sq[0] + '), other income ' + money(d.other) + ' (' + sq[1] + ').')); }
}

/* ---------- 5. savings progress ---------- */
function meter(label, have, want, extra){
  var m = mk('div', 'meter'), top = mk('div', 'meter-top');
  top.appendChild(mk('span', null, label)); top.appendChild(mk('b', null, money(have) + ' of ' + money(want) + ' · ' + pct(have, want)));
  var tr = mk('div', 'meter-track'); tr.setAttribute('role', 'img'); tr.setAttribute('aria-label', label + ': ' + money(have) + ' of ' + money(want) + ', ' + pct(have, want));
  var i = mk('i'); i.style.width = Math.min(100, want > 0 ? have / want * 100 : 0) + '%'; tr.appendChild(i);
  m.appendChild(top); m.appendChild(tr); if(extra) m.appendChild(mk('p', 'fine', extra)); return m;
}
function savings(d){
  var box = clear($('bd-sav'));
  if(d.goal != null && d.goal > 0) box.appendChild(meter('This month vs your monthly goal', d.save, d.goal, d.save >= d.goal ? 'Goal met. Nice.' : money(d.goal - d.save) + ' to go this month.'));
  else box.appendChild(mk('p', 'fine', 'Add a monthly savings goal to see this month\'s progress.'));
  if(d.target != null && d.target > 0 && d.saved != null){
    var left = Math.max(0, d.target - d.saved), months = d.save > 0 ? Math.ceil(left / d.save) : null;
    box.appendChild(meter('Total saved vs your target', d.saved, d.target, left === 0 ? 'Target reached.' :
      money(left) + ' to go. ' + (months ? 'At ' + money(d.save) + ' a month, that is about ' + months + (months === 1 ? ' month' : ' months') + ' (not counting interest).' : 'Save something each month to get a time estimate.')));
  } else box.appendChild(mk('p', 'fine', 'Add your total saved so far and a savings target to see your progress.'));
}

/* ---------- 6. monthly trend: only months the visitor saved ---------- */
var MKEY = 'sharp-budget-months';
function trend(){
  var months = load(MKEY, []), box = clear($('bd-trend')), list = clear($('bd-months'));
  months.sort(function(a, b){ return a.m < b.m ? -1 : 1; });
  months.forEach(function(r){
    var li = mk('li', null, label(r.m)), x = mk('button', null, '×'); x.type = 'button'; x.setAttribute('aria-label', 'Delete ' + label(r.m));
    x.addEventListener('click', function(){ store(MKEY, load(MKEY, []).filter(function(y){ return y.m !== r.m; })); $('bd-tr-msg').textContent = label(r.m) + ' deleted.'; trend(); });
    li.appendChild(x); list.appendChild(li);
  });
  if(months.length < 2){ box.appendChild(mk('p', 'fine', months.length ? 'You\'ve saved 1 month. Save one more month to see your trend.' : 'No months saved yet. The trend appears once you save 2 or more months.')); return; }
  var W = 560, H = 220, L = 52, R = 14, T = 14, B = 34, max = niceMax(Math.max.apply(null, months.map(function(r){ return Math.max(r.e, r.s, r.i); })));
  var x = function(i){ return L + (months.length === 1 ? 0 : i * (W - L - R) / (months.length - 1)); }, y = function(v){ return T + (1 - v / max) * (H - T - B); };
  var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'tr-svg'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Spending and saving by month: ' + months.map(function(r){ return label(r.m) + ' spent ' + money(r.e) + ', saved ' + money(r.s); }).join('; '));
  function el(n, a, t){ var e = document.createElementNS(NS, n); for(var k in a) e.setAttribute(k, a[k]); if(t != null) e.textContent = t; svg.appendChild(e); return e; }
  for(var i = 0; i <= 4; i++){ var v = max * i / 4; el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: 'var(--line)', 'stroke-width': 1 }); el('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end' }, money(v)); }
  months.forEach(function(r, i){ el('text', { x: x(i), y: H - 10, 'text-anchor': 'middle' }, label(r.m, true)); });
  var detailP = $('bd-tr-msg');
  [['e', '#6a83e8', 'Spent'], ['s', '#1fa877', 'Saved']].forEach(function(sr){
    el('polyline', { points: months.map(function(r, i){ return x(i) + ',' + y(r[sr[0]]); }).join(' '), fill: 'none', stroke: sr[1], 'stroke-width': 2, 'stroke-linejoin': 'round' });
    months.forEach(function(r, i){
      var hit = el('circle', { cx: x(i), cy: y(r[sr[0]]), r: 16, fill: 'transparent', 'aria-hidden': 'true' });
      var c = el('circle', { cx: x(i), cy: y(r[sr[0]]), r: 5, fill: sr[1], stroke: 'var(--surface-2)', 'stroke-width': 2, tabindex: 0, role: 'button', 'aria-label': label(r.m) + ': ' + sr[2] + ' ' + money(r[sr[0]]) });
      var show = function(){ detailP.textContent = label(r.m) + ': spent ' + money(r.e) + ', saved ' + money(r.s) + ', income ' + money(r.i) + '.'; };
      c.addEventListener('click', show); hit.addEventListener('click', show); c.addEventListener('focus', show);
    });
  });
  var lg = mk('div', 'tr-legend'); [['#6a83e8', 'Spent'], ['#1fa877', 'Saved']].forEach(function(s){ var sp = mk('span'), i = mk('i'); i.style.background = s[0]; sp.appendChild(i); sp.appendChild(document.createTextNode(s[1])); lg.appendChild(sp); });
  box.appendChild(lg); box.appendChild(svg);
}
function label(m, short){ var p = m.split('-'), d = new Date(+p[0], +p[1] - 1, 1); return d.toLocaleDateString('en-US', short ? { month: 'short', year: '2-digit' } : { month: 'long', year: 'numeric' }); }
var monthIn = $('bd-month'), now = new Date(); monthIn.value = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2);
$('bd-save-month').addEventListener('click', function(){
  var d = read(), m = monthIn.value, msg = $('bd-tr-msg');
  if(!/^\d{4}-\d{2}$/.test(m)){ msg.textContent = 'Pick a month first.'; return; }
  if(d.errs.length){ msg.textContent = 'Fix the boxes marked in red before saving.'; return; }
  if(d.income <= 0){ msg.textContent = 'Enter your income before saving a month.'; return; }
  var all = load(MKEY, []), had = all.some(function(r){ return r.m === m; });
  all = all.filter(function(r){ return r.m !== m; }); all.push({ m: m, i: d.income, e: d.expenses, s: d.save });
  msg.textContent = store(MKEY, all) ? (had ? label(m) + ' updated.' : label(m) + ' saved on this device.') : 'Couldn\'t save: this browser is blocking storage.';
  trend();
});

/* ---------- run ---------- */
function update(){
  var d = read();
  $('bd-err').textContent = d.errs.length ? 'Check ' + (d.errs.length === 1 ? 'this box' : 'these boxes') + ': ' + d.errs.join(', ') + '. Use a number of 0 or more. Until then it counts as empty.' : '';
  $('bd-inc-help').textContent = d.mode === 'teen'
    ? 'Your money split into business costs, everyday spending, savings and what\'s left. Tap a part for details.'
    : 'Your income split into needs, wants, savings and what\'s left, next to Sharp\'s 50/30/20 guide (a rule of thumb, not a law). Tap a part for details.';
  cards(d); summary(d); compare(d); incomeChart(d); savings(d);
}
form.addEventListener('input', update); form.addEventListener('change', update);
form.addEventListener('submit', function(e){ e.preventDefault(); });

/* Numbers sent over from the home page spending check (same device only). Budgets come from Sharp's guide. */
(function(){
  var h = load('sharp-budget-handoff', null); if(!h || location.hash !== '#from-check') return;
  try{ localStorage.removeItem('sharp-budget-handoff'); }catch(e){}
  var inc = +h.income || 0, set = function(id, v){ $(id).value = v == null ? '' : v; };
  mode = 'adult'; store('sharp-budget-mode', 'adult');
  set('b-inc-main', inc); set('b-inc-other', 0);
  var MAP = { rent: ['housing', 30], util: ['bills', 10], food: ['food', 15], transport: ['transport', 10], eat: ['eat', 5], shop: ['shop', 5], subs: ['subs', 2], fun: ['fun', 5] };
  cats().forEach(function(c){
    var m = MAP[c.id];
    if(m){ set(c.spentId, +h[m[0]] || 0); set(c.budId, Math.round(inc * m[1]) / 100); }
    else { set(c.spentId, 0); set(c.budId, ''); }
  });
  saveTouched = true;
  set('b-save', +h.save || 0); set('b-savegoal', Math.round(inc * 15) / 100); set('b-saved', ''); set('b-target', '');
  $('bd-src').textContent = 'Your numbers from the spending check. Budgets are set from Sharp\'s guide; change them to yours.';
  var b = $('budget'); if(b) b.scrollIntoView();
})();
Array.prototype.forEach.call(document.querySelectorAll('[data-set-mode]'), function(b){ b.addEventListener('click', function(){ setMode(b.getAttribute('data-set-mode')); }); });
setMode(mode); trend();
})();
