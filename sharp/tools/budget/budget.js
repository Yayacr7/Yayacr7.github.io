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
  // Small meters under some cards: [share 0–1, colour key, optional guide mark 0–1, label for screen readers].
  var rate = d.income > 0 ? d.save / d.income : 0;
  var bars = { Expenses: d.income > 0 ? [d.expenses / d.income, 'needs', null, pct(d.expenses, d.income) + ' of income'] : null,
    Savings: d.goal > 0 ? [d.save / d.goal, 'save', null, pct(d.save, d.goal) + ' of your goal'] : null,
    'Savings rate': d.income > 0 ? [rate / 0.3, 'save', 0.2 / 0.3, pct(d.save, d.income) + ', guide 20%'] : null,
    'Business profit': d.sales > 0 && d.profit > 0 ? [d.profit / d.sales, 'save', null, 'keeps ' + pct(d.profit, d.sales) + ' of sales'] : null };
  list.forEach(function(k){
    var c = mk('div', 'kpi'); c.appendChild(mk('span', null, k[0])); c.appendChild(mk('b', k[4] ? 'neg' : null, k[1])); c.appendChild(mk('small', null, k[2]));
    var bm = bars[k[0]];
    if(bm){ var tr = mk('i', 'kpi-bar'); tr.setAttribute('role', 'img'); tr.setAttribute('aria-label', bm[3]);
      var f = mk('i', 'kpi-fill'); f.style.width = Math.min(100, Math.max(0, bm[0]) * 100) + '%'; f.style.background = bm[0] > 1 ? 'var(--s-bad)' : 'var(--c-' + bm[1] + ')'; tr.appendChild(f);
      if(bm[2] != null){ var g = mk('i', 'kpi-mark'); g.style.left = bm[2] * 100 + '%'; tr.appendChild(g); }
      c.appendChild(tr); }
    c.appendChild(mk('em', null, '= ' + k[3])); box.appendChild(c);
  });
}

/* ---------- 2. plain-words summary, using the real numbers ---------- */
function part(box, title){ var sec = mk('div', 'sum-part'); sec.appendChild(mk('h4', null, title)); box.appendChild(sec); return sec; }
function item(list, icon, cls, text){ var li = mk('li', cls); li.appendChild(mk('i', 'ic ' + cls, icon)); li.appendChild(mk('span', null, text)); list.appendChild(li); }
function summary(d){
  var box = clear($('bd-summary'));
  if(d.income <= 0){ box.appendChild(mk('p', null, 'Enter your take-home pay to see your summary. Every other number depends on it.')); return; }
  // Start with what really went well (only true things, from the numbers).
  var wins = [];
  if(d.mode === 'teen' && d.sales > 0 && d.profit > 0) wins.push('You kept ' + pct(d.profit, d.sales) + ' of every sale: ' + money(d.profit) + ' profit from your business.');
  if(d.goal != null && d.goal > 0 && d.save >= d.goal) wins.push('You hit your ' + money(d.goal) + ' savings goal this month.');
  var under = d.cats.filter(function(c){ return c.diff != null && c.diff < 0; }).sort(function(a, b){ return a.diff - b.diff; })[0];
  if(under) wins.push(under.name + ' came in ' + money(-under.diff) + ' under budget.');
  if(d.left > 0) wins.push('You finished the month with ' + money(d.left) + ' spare.');
  if(d.save > 0 && d.save / d.income >= 0.2) wins.push('You saved ' + pct(d.save, d.income) + ' of your income. That beats the 20% rule of thumb.');
  if(wins.length){ var wp = part(box, 'What went well'), wl = mk('ul', 'sum-list'); wins.slice(0, 2).forEach(function(t){ item(wl, '✓', 'good', t); }); wp.appendChild(wl); }
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
  var ob = part(box, over.length || close.length ? 'Where you can win back money' : 'Budget check'), ul2 = mk('ul', 'sum-list');
  if(over.length) over.forEach(function(c){ item(ul2, '✕', 'bad', c.name + ': ' + money(c.diff) + ' to win back. You planned ' + money(c.budget) + ' and spent ' + money(c.spent) + ' (' + pct(c.spent, c.budget) + ' of budget).'); });
  close.forEach(function(c){ item(ul2, '!', 'warn', c.name + ' is close: ' + money(c.spent) + ' of ' + money(c.budget) + ' (' + pct(c.spent, c.budget) + '). Only ' + money(-c.diff) + ' left in it.'); });
  if(!over.length && !close.length) item(ul2, '✓', 'good', 'Every category with a budget is under or on budget.');
  else if(over.length){
    var win = 'Win all of it back and you free ' + money(overTotal) + ' a month.';
    // If they're saving toward a target, show how much sooner they'd get there (simple maths, no interest).
    if(d.target != null && d.saved != null && d.save > 0 && d.target > d.saved){
      var gapT = d.target - d.saved, now = Math.ceil(gapT / d.save), faster = Math.ceil(gapT / (d.save + overTotal));
      if(now > faster) win += ' Saved, that gets you to your ' + money(d.target) + ' target ' + (now - faster) + (now - faster === 1 ? ' month' : ' months') + ' sooner (' + faster + ' instead of ' + now + ', not counting interest).';
    }
    item(ul2, '↑', 'good', win);
  }
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

/* ---------- 3. spent vs budget: each row on its own budget scale (100% = the budget line) ---------- */
// Showing % of each category's own budget keeps small categories readable next to rent.
function ratioMax(cs){
  var hi = cs.reduce(function(a, c){ return c.budget > 0 ? Math.max(a, c.spent / c.budget) : a; }, 0);
  return hi <= 1.25 ? 1.25 : hi <= 1.5 ? 1.5 : 2;
}
var picked = null;
function stWord(c){
  if(c.budget == null) return 'No budget';
  if(c.diff > 0) return money(c.diff) + ' over';
  if(c.diff === 0) return 'On budget';
  return money(-c.diff) + ' left' + (c.status === 'warn' ? ' · close' : '');
}
function showDetail(c, d, why){
  var box = clear($('bd-detail'));
  var head = mk('p', 'bc-dt-h'); if(why) head.appendChild(mk('span', 'bc-dt-why', why)); head.appendChild(mk('b', null, c.name));
  var st = mk('span', 'bc-dt-st'); st.appendChild(mk('i', 'ic ' + c.status, STATUS[c.status][0])); st.appendChild(document.createTextNode(STATUS[c.status][1])); head.appendChild(st);
  box.appendChild(head);
  var dl = mk('dl', 'bc-dt');
  function row(k, v){ var g = mk('div'); g.appendChild(mk('dt', null, k)); g.appendChild(mk('dd', null, v)); dl.appendChild(g); }
  row('Spent', money(c.spent));
  row('Budget', c.budget == null ? 'Not set' : money(c.budget));
  if(c.budget != null) row(c.diff > 0 ? 'Over by' : 'Left', c.diff === 0 ? '$0' : money(Math.abs(c.diff)));
  if(c.budget > 0) row('Used', pct(c.spent, c.budget) + ' of budget');
  if(d.income > 0) row('Share of income', pct(c.spent, d.income));
  box.appendChild(dl);
}
function compare(d){
  var box = clear($('bd-cmp'));
  var maxR = ratioMax(d.cats), x = function(r){ return Math.min(r, maxR) / maxR * 100; };
  box.style.setProperty('--bud', x(1) + '%');
  var axis = mk('div', 'bc-axis'); axis.setAttribute('aria-hidden', 'true');
  axis.appendChild(mk('span', 'bc-a-l', 'Category'));
  var ticks = mk('div', 'bc-ticks');
  [0, .5, 1, 1.5, 2].filter(function(t){ return t <= maxR; }).forEach(function(t){
    var s = mk('span', t === 1 ? 'is-bud' : null, t === 1 ? 'Budget' : Math.round(t * 100) + '%'); s.style.left = x(t) + '%'; ticks.appendChild(s);
  });
  axis.appendChild(ticks); axis.appendChild(mk('span', 'bc-a-r', 'Spent of budget')); box.appendChild(axis);
  var groups = ['needs', 'wants'], all = [];
  groups.forEach(function(g){
    var cs = d.cats.filter(function(c){ return c.group === g; }); if(!cs.length) return;
    var gs = cs.reduce(function(a, c){ return a + c.spent; }, 0), gb = cs.filter(function(c){ return c.budget != null; }).reduce(function(a, c){ return a + c.budget; }, 0);
    var gh = mk('div', 'bc-group'); var sw = mk('i', 'bc-sw'); sw.style.background = 'var(--c-' + g + ')'; gh.appendChild(sw);
    gh.appendChild(mk('b', null, MODES[d.mode].g[g]));
    gh.appendChild(mk('span', null, money(gs) + (gb > 0 ? ' of ' + money(gb) + ' · ' + pct(gs, gb) : '') + (d.income > 0 ? ' · ' + pct(gs, d.income) + ' of income' : '')));
    box.appendChild(gh);
    cs.forEach(function(c){
      all.push(c);
      var row = mk('button', 'bc-row'); row.type = 'button'; row.setAttribute('data-st', c.status);
      row.setAttribute('aria-pressed', picked === c.id ? 'true' : 'false');
      row.setAttribute('aria-label', c.name + ': spent ' + money(c.spent) + (c.budget != null ? ' of ' + money(c.budget) + ' budget, ' + stWord(c) : ', no budget set'));
      row.appendChild(mk('span', 'bc-name', c.name));
      var plot = mk('span', 'bc-plot');
      if(c.budget > 0){
        var r = c.spent / c.budget, f = mk('i', 'bc-fill'); f.style.width = x(Math.min(r, 1)) + '%'; f.style.background = 'var(--c-' + g + ')'; if(c.spent > 0) f.style.minWidth = '4px';
        if(r <= 1) f.classList.add('end'); plot.appendChild(f);
        if(r > 1){ var o = mk('i', 'bc-over'); o.style.left = 'calc(' + x(1) + '% + 2px)'; o.style.width = 'calc(' + (x(r) - x(1)) + '% - 2px)'; plot.appendChild(o);
          if(r > maxR) plot.appendChild(mk('i', 'bc-cap', '›')); }
      } else if(c.budget === 0 && c.spent > 0){ var o2 = mk('i', 'bc-over'); o2.style.left = '0'; o2.style.width = '100%'; plot.appendChild(o2); }
      else plot.appendChild(mk('span', 'bc-none', c.budget == null ? 'No budget set' : ''));
      row.appendChild(plot);
      var v = mk('span', 'bc-val'); v.appendChild(mk('b', null, money(c.spent))); if(c.budget != null) v.appendChild(mk('small', null, ' of ' + money(c.budget)));
      row.appendChild(v);
      var st = mk('span', 'bc-st'); st.appendChild(mk('i', 'ic ' + c.status, STATUS[c.status][0])); st.appendChild(mk('span', null, stWord(c))); row.appendChild(st);
      var show = function(){ picked = c.id; showDetail(c, d); box.querySelectorAll('.bc-row').forEach(function(xr){ xr.setAttribute('aria-pressed', xr === row ? 'true' : 'false'); }); };
      row.addEventListener('click', show); row.addEventListener('focus', show); row.addEventListener('pointerenter', function(e){ if(e.pointerType === 'mouse') show(); });
      box.appendChild(row);
    });
  });
  var tb = all.filter(function(c){ return c.budget != null; }).reduce(function(a, c){ return a + c.budget; }, 0);
  var tot = mk('div', 'bc-total'); tot.appendChild(mk('b', null, 'All spending'));
  tot.appendChild(mk('span', null, money(d.expenses) + (tb > 0 ? ' of ' + money(tb) + ' budgeted · ' + pct(d.expenses, tb) : '')));
  box.appendChild(tot);
  // Default detail: the biggest overspend (the most useful thing to look at), else the closest to its budget.
  var cur = all.filter(function(c){ return c.id === picked; })[0], why = null;
  if(!cur){ var over = all.filter(function(c){ return c.diff > 0; }).sort(function(a, b){ return b.diff - a.diff; });
    cur = over[0] || all.filter(function(c){ return c.budget > 0; }).sort(function(a, b){ return b.spent / b.budget - a.spent / a.budget; })[0];
    why = over.length ? 'Biggest overspend' : 'Closest to its budget'; }
  if(cur) showDetail(cur, d, why); else clear($('bd-detail')).appendChild(mk('p', 'fine', 'Add a budget to see details.'));
}

/* ---------- 4. income split vs the 50/30/20 guide ---------- */
var SEG = { needs: 'Needs and debt', wants: 'Wants', save: 'Savings', left: 'Left over', short: 'Short (spent more than income)' };
function segs(d){ SEG.needs = MODES[d.mode].g.needs; SEG.wants = MODES[d.mode].g.wants; }
function incomeChart(d){
  var box = clear($('bd-inc'));
  segs(d);
  if(d.income <= 0){ box.appendChild(mk('p', 'fine', 'Enter your income to see this chart.')); return; }
  var guide = MODES[d.mode].guide, out = d.needs + d.wants + d.save, scale = Math.max(d.income, out);
  // One bar per row, all on the same dollar scale. "Left over" is the empty part of the bar, not a colour.
  function bar(label, parts, sub){
    var row = mk('div', 'ib-row'); var lab = mk('span', 'ib-lab'); lab.appendChild(mk('b', null, label)); if(sub) lab.appendChild(mk('small', null, sub)); row.appendChild(lab);
    var b = mk('div', 'ib-bar'); b.setAttribute('role', 'img');
    b.setAttribute('aria-label', label + ': ' + parts.filter(function(p){ return p.v > 0; }).map(function(p){ return SEG[p.k] + ' ' + money(p.v) + ' (' + pct(p.v, d.income) + ')'; }).join(', '));
    var x0 = 0;
    parts.forEach(function(p){
      if(p.v <= 0) return;
      var w = p.v / scale * 100, sgm = mk('i', 'ib-seg'); sgm.setAttribute('data-k', p.k);
      sgm.style.left = x0 + '%'; sgm.style.width = 'calc(' + w + '% - 2px)'; x0 += w;
      if(w >= 12) sgm.appendChild(mk('span', null, pct(p.v, d.income)));
      sgm.title = SEG[p.k] + ': ' + money(p.v) + ' (' + pct(p.v, d.income) + ' of income)';
      b.appendChild(sgm);
    });
    if(out > d.income && sub){ var l = mk('i', 'ib-inc'); l.style.left = (d.income / scale * 100) + '%'; b.appendChild(l); }
    row.appendChild(b); return row;
  }
  var you = [{ k: 'needs', v: d.needs }, { k: 'wants', v: d.wants }, { k: 'save', v: d.save }];
  if(d.left < 0) you.push({ k: 'short', v: -d.left });
  box.appendChild(bar('You', you, money(d.income) + ' income'));
  if(guide) box.appendChild(bar('Guide', [{ k: 'needs', v: d.income * 0.5 }, { k: 'wants', v: d.income * 0.3 }, { k: 'save', v: d.income * 0.2 }], '50 / 30 / 20'));
  if(d.left < 0) box.appendChild(mk('p', 'ib-warn', 'Your spending and saving go past your income (the white line) by ' + money(-d.left) + '. That part is money you don\'t have this month.'));
  // Breakdown: always visible, so nothing depends on hovering or tapping.
  var t = mk('table', 'ib-table'); t.appendChild(mk('caption', 'sr', 'Your income split compared with the 50/30/20 guide'));
  var hr = mk('tr'); (guide ? ['Part', 'You', 'Guide', 'Difference'] : ['Part', 'You']).forEach(function(h, i){ var th = mk('th', null, h); th.scope = 'col'; hr.appendChild(th); }); var th0 = mk('thead'); th0.appendChild(hr); t.appendChild(th0);
  var tb = mk('tbody');
  [['needs', d.needs, 0.5, false], ['wants', d.wants, 0.3, false], ['save', d.save, 0.2, true], [d.left >= 0 ? 'left' : 'short', Math.abs(d.left), null, null]].forEach(function(r){
    var tr = mk('tr'), td = mk('th'); td.scope = 'row';
    var sw = mk('i', 'ib-sw'); sw.setAttribute('data-k', r[0]); td.appendChild(sw); td.appendChild(document.createTextNode(r[0] === 'left' ? 'Left over' : r[0] === 'short' ? 'Short' : SEG[r[0]]));
    tr.appendChild(td);
    tr.appendChild(mk('td', null, (r[0] === 'short' ? '−' : '') + money(r[1]) + ' · ' + pct(r[1], d.income)));
    if(guide){
      tr.appendChild(mk('td', null, r[2] == null ? '—' : money(d.income * r[2]) + ' · ' + Math.round(r[2] * 100) + '%'));
      if(r[2] == null) tr.appendChild(mk('td', null, '—'));
      else { var diff = r[1] - d.income * r[2], good = r[3] ? diff >= 0 : diff <= 0, c = mk('td', 'ib-diff ' + (Math.abs(diff) < 0.5 ? '' : good ? 'up' : 'down'));
        c.textContent = Math.abs(diff) < 0.5 ? 'On the guide' : (diff > 0 ? '+' : '−') + money(Math.abs(diff)) + (good ? ' ✓' : ''); tr.appendChild(c); }
    }
    tb.appendChild(tr);
  });
  t.appendChild(tb); box.appendChild(t);
  // Two shares of one total: round the first, give the second the rest, so they always add to 100%.
  var split = function(a){ var p1 = Math.round(a / d.income * 100); return [p1 + '%', (100 - p1) + '%']; };
  if(d.mode === 'teen' && d.income > 0){ var sp = split(d.main || 0); box.appendChild(mk('p', 'fine', 'Income sources: jobs and allowance ' + money(d.main || 0) + ' (' + sp[0] + '), business sales ' + money(d.other || 0) + ' (' + sp[1] + ').')); }
  else if(d.other){ var sq = split(d.main || 0); box.appendChild(mk('p', 'fine', 'Income sources: take-home pay ' + money(d.main || 0) + ' (' + sq[0] + '), other income ' + money(d.other) + ' (' + sq[1] + ').')); }
}

/* ---------- 5. savings progress: two meters + a projection to the target ---------- */
var NS = 'http://www.w3.org/2000/svg';
// Rounds an axis top up to a tidy number (1, 2, 2.5 or 5 times a power of ten, split into 4 steps).
function niceMax(v){
  if(v <= 0) return 100;
  var step = v / 4, p = Math.pow(10, Math.floor(Math.log10(step)));
  var m = [1, 2, 2.5, 5, 10].find(function(x){ return x * p >= step; });
  return m * p * 4;
}
function svgEl(svg, n, a, t){ var e = document.createElementNS(NS, n); for(var k in a) e.setAttribute(k, a[k]); if(t != null) e.textContent = t; svg.appendChild(e); return e; }
function compact(v){ return v >= 10000 ? '$' + Math.round(v / 1000) + 'K' : v >= 1000 ? '$' + (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'K' : money(v); }
function monthName(k, short){ var t = new Date(); t.setDate(1); t.setMonth(t.getMonth() + k); return t.toLocaleDateString('en-US', short ? { month: 'short', year: '2-digit' } : { month: 'long', year: 'numeric' }); }
function meter(label, have, want, note){
  var m = mk('div', 'sv-m'), top = mk('div', 'sv-top'), p = want > 0 ? have / want : 0;
  top.appendChild(mk('span', null, label));
  var v = mk('span', 'sv-v'); v.appendChild(mk('b', null, money(have))); v.appendChild(mk('small', null, ' of ' + money(want))); top.appendChild(v);
  var tr = mk('div', 'sv-track'); tr.setAttribute('role', 'img'); tr.setAttribute('aria-label', label + ': ' + money(have) + ' of ' + money(want) + ', ' + pct(have, want));
  var f = mk('i', 'sv-fill'); f.style.width = Math.min(100, p * 100) + '%'; tr.appendChild(f);
  [25, 50, 75].forEach(function(t){ var k = mk('i', 'sv-tick' + (p * 100 >= t ? ' on' : '')); k.style.left = t + '%'; tr.appendChild(k); });
  var sc = mk('div', 'sv-scale'); sc.setAttribute('aria-hidden', 'true'); ['0%', '25%', '50%', '75%', '100%'].forEach(function(t){ sc.appendChild(mk('span', null, t)); });
  var badge = mk('span', 'sv-pct' + (p >= 1 ? ' done' : ''), p >= 1 ? '✓ Done' : Math.round(p * 100) + '%'); top.insertBefore(badge, v);
  m.appendChild(top); m.appendChild(tr); m.appendChild(sc); if(note) m.appendChild(mk('p', 'sv-note', note)); return m;
}
function projection(saved, target, perMonth){
  var months = Math.ceil((target - saved) / perMonth), W = 560, H = 190, L = 50, R = 18, T = 18, B = 30;
  var x = function(m){ return L + m / months * (W - L - R); }, y = function(v){ return T + (1 - v / target) * (H - T - B); };
  var wrap = mk('div', 'sv-proj'), svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'viz'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Projection: from ' + money(saved) + ' now to ' + money(target) + ' in about ' + months + ' months, by ' + monthName(months) + ', saving ' + money(perMonth) + ' a month.');
  [0, .5, 1].forEach(function(f){ svgEl(svg, 'line', { x1: L, x2: W - R, y1: y(target * f), y2: y(target * f), class: f === 1 ? 'viz-target' : 'viz-grid' }); svgEl(svg, 'text', { x: L - 8, y: y(target * f) + 4, 'text-anchor': 'end', class: 'viz-tick' }, compact(target * f)); });
  svgEl(svg, 'text', { x: W - R, y: y(target) - 7, 'text-anchor': 'end', class: 'viz-lab' }, 'Target ' + money(target));
  var pts = []; for(var m = 0; m <= months; m++) pts.push([x(m), y(Math.min(target, saved + perMonth * m))]);
  svgEl(svg, 'path', { d: 'M' + x(0) + ' ' + y(0) + ' L' + pts.map(function(p){ return p.join(' '); }).join(' L') + ' L' + x(months) + ' ' + y(0) + 'Z', class: 'viz-area' });
  svgEl(svg, 'polyline', { points: pts.map(function(p){ return p.join(','); }).join(' '), class: 'viz-line' });
  var ticksAt = months <= 6 ? Array.from({ length: months + 1 }, function(_, i){ return i; }) : [0, Math.round(months / 3), Math.round(months * 2 / 3), months];
  ticksAt.forEach(function(m){ svgEl(svg, 'text', { x: x(m), y: H - 8, 'text-anchor': m === 0 ? 'start' : m === months ? 'end' : 'middle', class: 'viz-tick' }, m === 0 ? 'Now' : monthName(m, true)); });
  svgEl(svg, 'circle', { cx: x(0), cy: y(saved), r: 5, class: 'viz-dot' });
  svgEl(svg, 'circle', { cx: x(months), cy: y(target), r: 6, class: 'viz-dot end' });
  // Crosshair: follows the pointer and snaps to the nearest month.
  var cross = svgEl(svg, 'line', { y1: T, y2: H - B, class: 'viz-cross', visibility: 'hidden' }), hd = svgEl(svg, 'circle', { r: 5, class: 'viz-dot', visibility: 'hidden' });
  var tip = mk('div', 'viz-tip'); tip.hidden = true;
  function at(m){ var v = Math.min(target, saved + perMonth * m), px = x(m);
    cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible'); hd.setAttribute('cx', px); hd.setAttribute('cy', y(v)); hd.setAttribute('visibility', 'visible');
    tip.textContent = ''; tip.appendChild(mk('b', null, money(v))); tip.appendChild(mk('span', null, m === 0 ? 'Saved now' : monthName(m) + ' · month ' + m));
    tip.hidden = false; tip.style.left = (px / W * 100) + '%'; }
  function move(e){ var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W; at(Math.max(0, Math.min(months, Math.round((px - L) / (W - L - R) * months)))); }
  svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', function(){ cross.setAttribute('visibility', 'hidden'); hd.setAttribute('visibility', 'hidden'); tip.hidden = true; });
  wrap.appendChild(svg); wrap.appendChild(tip);
  // A nudge: about 25% more each month (rounded up to the next $10), and how much sooner that is.
  var more = Math.ceil(perMonth * 1.25 / 10) * 10, m2 = Math.ceil((target - saved) / more);
  var cap = mk('p', 'sv-note'); cap.appendChild(mk('b', null, 'On track for ' + monthName(months) + '.'));
  cap.appendChild(document.createTextNode(' About ' + months + (months === 1 ? ' month' : ' months') + ' at ' + money(perMonth) + ' a month (not counting interest).' + (m2 < months ? ' Saving ' + money(more) + ' a month gets you there in about ' + m2 + (m2 === 1 ? ' month' : ' months') + '.' : '')));
  wrap.appendChild(cap);
  return wrap;
}
function savings(d){
  var box = clear($('bd-sav'));
  if(d.goal != null && d.goal > 0) box.appendChild(meter('This month vs your monthly goal', d.save, d.goal, d.save >= d.goal ? 'Goal met this month.' : money(d.goal - d.save) + ' to go this month.'));
  else box.appendChild(mk('p', 'fine', 'Add a monthly savings goal to see this month\'s progress.'));
  if(d.target != null && d.target > 0 && d.saved != null){
    var left = Math.max(0, d.target - d.saved);
    box.appendChild(meter('Total saved vs your target', d.saved, d.target, left === 0 ? 'Target reached.' : money(left) + ' to go.'));
    if(left > 0 && d.save > 0) box.appendChild(projection(d.saved, d.target, d.save));
    else if(left > 0) box.appendChild(mk('p', 'fine', 'Save something each month to see when you\'ll reach your target.'));
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
  if(months.length < 2){
    var e = mk('div', 'tr-empty'); e.appendChild(mk('b', null, months.length ? '1 of 2 months saved' : 'Your trend starts here'));
    e.appendChild(mk('p', null, months.length ? 'Save one more month to see how your spending and saving change.' : 'Save this month now, then come back next month and save again. With 2 or more months you\'ll see income, spending and saving over time.'));
    var steps = mk('div', 'tr-steps'); [0, 1].forEach(function(i){ steps.appendChild(mk('span', 'tr-step' + (i < months.length ? ' on' : ''), i < months.length ? '✓ ' + label(months[i].m, true) : 'Month ' + (i + 1))); });
    e.appendChild(steps); box.appendChild(e); return;
  }
  var SER = [['i', 'Income', 'tr-inc'], ['e', 'Spent', 'tr-spent'], ['s', 'Saved', 'tr-saved']];
  var W = 560, H = 230, L = 50, R = 16, T = 16, B = 30, max = niceMax(Math.max.apply(null, months.map(function(r){ return Math.max(r.e, r.s, r.i); })));
  var n = months.length, x = function(i){ return L + i * (W - L - R) / (n - 1); }, y = function(v){ return T + (1 - v / max) * (H - T - B); };
  var lg = mk('div', 'viz-legend'); SER.forEach(function(s){ var sp = mk('span'); sp.appendChild(mk('i', 'key ' + s[2])); sp.appendChild(document.createTextNode(s[1])); lg.appendChild(sp); }); box.appendChild(lg);
  var wrap = mk('div', 'sv-proj'), svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'viz'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Income, spending and saving by month: ' + months.map(function(r){ return label(r.m) + ' income ' + money(r.i) + ', spent ' + money(r.e) + ', saved ' + money(r.s); }).join('; '));
  for(var i = 0; i <= 4; i++){ var v = max * i / 4; svgEl(svg, 'line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'viz-grid' }); svgEl(svg, 'text', { x: L - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'viz-tick' }, compact(v)); }
  var every = Math.ceil(n / 6);
  months.forEach(function(r, i){ if(i % every === 0 || i === n - 1) svgEl(svg, 'text', { x: x(i), y: H - 8, 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle', class: 'viz-tick' }, label(r.m, true)); });
  svgEl(svg, 'path', { d: 'M' + x(0) + ' ' + y(0) + months.map(function(r, i){ return ' L' + x(i) + ' ' + y(r.s); }).join('') + ' L' + x(n - 1) + ' ' + y(0) + 'Z', class: 'viz-area tr-saved' });
  SER.forEach(function(s){
    svgEl(svg, 'polyline', { points: months.map(function(r, i){ return x(i) + ',' + y(r[s[0]]); }).join(' '), class: 'viz-line ' + s[2] });
    var last = months[n - 1]; svgEl(svg, 'circle', { cx: x(n - 1), cy: y(last[s[0]]), r: 4.5, class: 'viz-dot ' + s[2] });
  });
  var cross = svgEl(svg, 'line', { y1: T, y2: H - B, class: 'viz-cross', visibility: 'hidden' });
  var dots = SER.map(function(s){ return svgEl(svg, 'circle', { r: 5, class: 'viz-dot ' + s[2], visibility: 'hidden' }); });
  var tip = mk('div', 'viz-tip'); tip.hidden = true;
  function at(i){ var r = months[i], px = x(i);
    cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible');
    SER.forEach(function(s, k){ dots[k].setAttribute('cx', px); dots[k].setAttribute('cy', y(r[s[0]])); dots[k].setAttribute('visibility', 'visible'); });
    tip.textContent = ''; tip.appendChild(mk('span', 'tip-h', label(r.m)));
    SER.forEach(function(s){ var row = mk('span', 'tip-r'); row.appendChild(mk('i', 'key ' + s[2])); row.appendChild(mk('b', null, money(r[s[0]]))); row.appendChild(mk('span', null, s[1])); tip.appendChild(row); });
    tip.hidden = false; tip.style.left = (px / W * 100) + '%'; $('bd-tr-msg').textContent = label(r.m) + ': income ' + money(r.i) + ', spent ' + money(r.e) + ', saved ' + money(r.s) + '.'; }
  function move(e){ var rc = svg.getBoundingClientRect(), px = (e.clientX - rc.left) / rc.width * W; at(Math.max(0, Math.min(n - 1, Math.round((px - L) / (W - L - R) * (n - 1))))); }
  svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', function(){ cross.setAttribute('visibility', 'hidden'); dots.forEach(function(dt){ dt.setAttribute('visibility', 'hidden'); }); tip.hidden = true; });
  svg.setAttribute('tabindex', '0'); var kb = n - 1; svg.addEventListener('keydown', function(e){ if(e.key === 'ArrowLeft'){ kb = Math.max(0, kb - 1); at(kb); } if(e.key === 'ArrowRight'){ kb = Math.min(n - 1, kb + 1); at(kb); } });
  wrap.appendChild(svg); wrap.appendChild(tip); box.appendChild(wrap);
  // Change since the first saved month, in plain words.
  var a0 = months[0], z = months[n - 1], ch = mk('div', 'tr-change');
  [['Spent', z.e - a0.e, false], ['Saved', z.s - a0.s, true]].forEach(function(c){ var good = c[2] ? c[1] >= 0 : c[1] <= 0, sp = mk('span', 'tr-ch ' + (c[1] === 0 ? '' : good ? 'up' : 'down'));
    sp.appendChild(mk('b', null, (c[1] > 0 ? '▲ +' : c[1] < 0 ? '▼ −' : '') + money(Math.abs(c[1])))); sp.appendChild(document.createTextNode(' ' + c[0].toLowerCase() + ' since ' + label(a0.m, true))); ch.appendChild(sp); });
  box.appendChild(ch);
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

/* ---------- phones and iPads: "My numbers" / "Results" tabs and a result bar ---------- */
var grid = form.closest('.bd-grid');
function view(v, scroll){
  grid.setAttribute('data-view', v);
  Array.prototype.forEach.call(document.querySelectorAll('.bd-tabs [data-bdtab]'), function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-bdtab') === v ? 'true' : 'false'); });
  if(scroll){
    // Scroll so the tabs sit just below the site's top bar.
    var t = document.querySelector('.bd-tabs'), head = document.querySelector('.site-head');
    if(t) window.scrollTo(0, t.getBoundingClientRect().top + window.pageYOffset - (head ? head.offsetHeight : 0) - 8);
  }
}
Array.prototype.forEach.call(document.querySelectorAll('[data-bdtab]'), function(b){
  b.addEventListener('click', function(){ view(b.getAttribute('data-bdtab'), !b.closest('.bd-tabs')); });
});
function mini(d){
  var over = d.cats.filter(function(c){ return c.status === 'bad'; }).length;
  $('bd-mini-txt').textContent = (d.left < 0 ? 'Short ' + money(-d.left) : 'Left over ' + money(d.left)) +
    (d.mode === 'teen' ? ' · Profit ' + money(d.profit || 0) : ' · Saving ' + pct(d.save, d.income)) +
    ' · ' + (over ? over + ' to win back' : 'all on budget');
}

/* ---------- run ---------- */
function update(){
  var d = read();
  $('bd-err').textContent = d.errs.length ? 'Check ' + (d.errs.length === 1 ? 'this box' : 'these boxes') + ': ' + d.errs.join(', ') + '. Use a number of 0 or more. Until then it counts as empty.' : '';
  $('bd-inc-help').textContent = d.mode === 'teen'
    ? 'Your money split into business costs, everyday spending, savings and what\'s left. Tap a part for details.'
    : 'Your income split into needs, wants, savings and what\'s left, next to Sharp\'s 50/30/20 guide (a rule of thumb, not a law). Tap a part for details.';
  cards(d); summary(d); compare(d); incomeChart(d); savings(d); mini(d);
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
  view('res');
  $('bd-src').textContent = 'Your numbers from the spending check. Budgets are set from Sharp\'s guide; change them to yours.';
  var b = $('budget'); if(b) b.scrollIntoView();
})();
Array.prototype.forEach.call(document.querySelectorAll('[data-set-mode]'), function(b){ b.addEventListener('click', function(){ setMode(b.getAttribute('data-set-mode')); }); });
setMode(mode); trend();
})();
