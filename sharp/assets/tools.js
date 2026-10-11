/* Sharp tools. Each tool starts only if its form is on the page.
   Rule: visitor-typed text is only ever inserted with textContent, never innerHTML. */
(function(){
"use strict";

/* ---------- shared ---------- */
function $(id){ return document.getElementById(id); }
function n(id){ var el = $(id); if(!el) return 0; var v = parseFloat(String(el.value).replace(/,/g, '')); return isFinite(v) ? v : 0; }
function pos(id){ return Math.max(0, n(id)); }
function money(v, d){ var neg = v < 0; v = Math.abs(v); return (neg ? '−$' : '$') + v.toLocaleString(undefined, { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
function pct(v, d){ return (isFinite(v) ? v.toFixed(d == null ? 1 : d) : '—') + '%'; }
function txt(id){ var el = $(id); return el ? el.value.trim() : ''; }
function result(k, big, lines, verdict){
  // Numbers and fixed wording only; safe to build as HTML.
  return '<div class="k">' + k + '</div><div class="big">' + big + '</div>' +
    (lines && lines.length ? '<div class="lines">' + lines.map(function(l){ return '<div><span>' + l[0] + '</span>' + l[1] + '</div>'; }).join('') + '</div>' : '') +
    (verdict ? '<div class="verdict-line">' + verdict + '</div>' : '');
}
function wire(formId, fn){
  var f = $(formId); if(!f) return;
  f.addEventListener('input', fn); f.addEventListener('change', fn);
  f.addEventListener('submit', function(e){ e.preventDefault(); });
  fn();
}

/* contact email from config.js (legal pages); built with textContent only */
(function(){
  var e = (window.NP_CONFIG || {}).CONTACT_EMAIL;
  if(!e || !/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(e)) return;
  Array.prototype.forEach.call(document.querySelectorAll('[data-contact]'), function(el){
    var a = document.createElement('a'); a.href = 'mailto:' + e; a.textContent = e; el.textContent = ''; el.appendChild(a);
  });
})();

/* theme */
try{ var t = localStorage.getItem('np-theme'); if(t) document.documentElement.setAttribute('data-theme', t); }catch(e){}
var tb = $('themeBtn');
if(tb) tb.addEventListener('click', function(){
  var r = document.documentElement, dark = r.getAttribute('data-theme') === 'dark' || (!r.getAttribute('data-theme') && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  r.setAttribute('data-theme', dark ? 'light' : 'dark');
  try{ localStorage.setItem('np-theme', dark ? 'light' : 'dark'); }catch(e){}
});

/* ================= MARKETING ================= */
wire('f-roas', function(){
  var spend = pos('roas-spend'), sales = pos('roas-sales'), price = pos('roas-price'), cost = pos('roas-cost');
  var rev = sales * price, roas = spend > 0 ? rev / spend : 0, profit = sales * (price - cost) - spend;
  var per = price - cost, be = per > 0 ? price / per : Infinity, cpa = sales > 0 ? spend / sales : 0;
  var v = per <= 0 ? '<b>Each sale loses money</b> before ads even start. Fix price or cost first.'
    : profit >= 0 ? '<b>These ads make money.</b> You earn ' + money(profit) + ' after the ad bill. Test spending a little more and watch whether ROAS holds.'
    : '<b>These ads lose ' + money(-profit) + '.</b> You need a ROAS of at least ' + be.toFixed(2) + ' to break even. Improve the ad, the landing page, or the price.';
  $('roas-out').innerHTML = result('Return on ad spend (ROAS)', roas.toFixed(2) + '×', [
    ['Revenue from ads', money(rev)], ['Profit after ads', money(profit)], ['Cost per sale', money(cpa, 2)], ['Break-even ROAS', isFinite(be) ? be.toFixed(2) + '×' : '—']
  ], v);
});

wire('f-cac', function(){
  var spend = pos('cac-spend'), cust = pos('cac-new'), arpu = pos('cac-rev'), margin = pos('cac-margin') / 100, life = pos('cac-life');
  var cac = cust > 0 ? spend / cust : 0, gp = arpu * margin, payback = gp > 0 ? cac / gp : Infinity, ltv = gp * life, ratio = cac > 0 ? ltv / cac : 0;
  var v = cust === 0 ? 'Enter how many new customers that spend brings in.'
    : ratio >= 3 ? '<b>Healthy.</b> Each customer is worth ' + ratio.toFixed(1) + '× what they cost to win. The common guideline is at least 3×.'
    : ratio >= 1 ? '<b>Thin.</b> Customers are worth ' + ratio.toFixed(1) + '× their cost, below the 3× guideline. Lower ad costs or keep customers longer before scaling.'
    : '<b>Losing money on every customer.</b> They cost more to win than they ever pay you. Don\'t scale this.';
  $('cac-out').innerHTML = result('Cost to win a customer (CAC)', money(cac, 2), [
    ['Gross profit / customer / month', money(gp, 2)], ['Months to earn CAC back', isFinite(payback) ? payback.toFixed(1) : 'Never'],
    ['Lifetime value (LTV)', money(ltv)], ['LTV : CAC', ratio.toFixed(1) + ' : 1']
  ], v);
});

wire('f-funnel', function(){
  var vis = pos('fn-visitors'), sr = pos('fn-signup') / 100, br = pos('fn-buy') / 100, price = pos('fn-price'), goal = pos('fn-goal');
  var leads = vis * sr, buyers = leads * br, rev = buyers * price, perVisitor = vis > 0 ? rev / vis : 0;
  var need = (sr > 0 && br > 0 && price > 0) ? Math.ceil(goal / (price * sr * br)) : Infinity;
  var v = goal > 0 && isFinite(need) ? 'To reach ' + money(goal) + ' a month at these rates you need about <b>' + need.toLocaleString() + ' visitors a month</b>. Raising either conversion rate cuts that number faster than more traffic.' : '';
  $('fn-out').innerHTML = result('Revenue per month', money(rev), [
    ['Sign-ups', Math.round(leads).toLocaleString()], ['Customers', buyers < 10 && buyers % 1 ? 'about ' + Math.max(0, Math.round(buyers)) + ' (' + buyers.toFixed(1) + ')' : Math.round(buyers).toLocaleString()], ['Revenue per visitor', money(perVisitor, 2)]
  ], v);
  // Funnel chart. Only numbers and fixed words go into this HTML (nothing a visitor typed as text).
  function cnt(v){ return v < 10 && v % 1 ? (v < 1 ? v.toFixed(2) : v.toFixed(1)) : Math.round(v).toLocaleString(); }
  function step(name, v, note){ var w = vis > 0 ? Math.max(2.5, v / vis * 100) : 0;
    return '<div class="fx-step"><div class="fx-lab"><b>' + name + '</b><span>' + cnt(v) + ' / month</span></div><div class="fx-plot"><i class="fx-bar" style="width:' + w.toFixed(2) + '%"></i></div><span class="fx-pct">' + (vis > 0 ? (v === 0 ? 0 : v / vis * 100 < 1 ? (v / vis * 100).toFixed(2) : Math.round(v / vis * 100)) + '%' : '—') + '<small>' + note + '</small></span></div>'; }
  var leak = sr > 0 && br > 0 ? (sr <= br ? 1 : 2) : 0;
  function conv(rate, lost, verb, i){ return '<div class="fx-conv' + (leak === i ? ' leak' : '') + '"><span class="fx-ar" aria-hidden="true">↓</span><b>' + (rate * 100).toFixed(1) + '%</b> ' + verb + ' <span class="fx-lost">· ' + cnt(lost) + ' don\'t</span>' + (leak === i ? '<span class="fx-tag">Lowest rate</span>' : '') + '</div>'; }
  var html = '<div class="fx" role="img" aria-label="Funnel: ' + Math.round(vis) + ' visitors, ' + Math.round(leads) + ' sign-ups, ' + buyers.toFixed(1) + ' customers a month">' +
    step('Visitors', vis, 'of visitors') + conv(sr, vis - leads, 'sign up', 1) + step('Sign-ups', leads, 'of visitors') + conv(br, leads - buyers, 'buy', 2) + step('Customers', buyers, 'of visitors') + '</div>';
  if(goal > 0 && isFinite(need) && vis > 0){
    var top = Math.max(vis, need), times = need / vis;
    html += '<div class="fx-goal"><p class="fx-gh">Traffic for your ' + money(goal) + ' goal</p>' +
      '<div class="fx-g"><span>You have</span><div class="fx-plot"><i class="fx-bar have" style="width:' + Math.max(2, vis / top * 100).toFixed(2) + '%"></i></div><b>' + Math.round(vis).toLocaleString() + '</b></div>' +
      '<div class="fx-g"><span>You need</span><div class="fx-plot"><i class="fx-bar need" style="width:' + Math.max(2, need / top * 100).toFixed(2) + '%"></i></div><b>' + need.toLocaleString() + '</b></div>' +
      '<p class="fx-gn">' + (times <= 1 ? '<span class="fx-ok">✓ Enough traffic</span> At these rates your current visitors reach the goal.' : '<b>' + (times < 10 ? times.toFixed(1) : Math.round(times)) + '× more visitors</b> at these rates, or double one conversion rate to halve that number.') + '</p></div>';
  }
  $('fn-bars').innerHTML = html;
});

wire('f-email', function(){
  var subs = pos('em-subs'), sends = pos('em-sends'), open = pos('em-open') / 100, click = pos('em-click') / 100, buy = pos('em-buy') / 100, aov = pos('em-aov');
  var orders = subs * sends * open * click * buy, rev = orders * aov, perSub = subs > 0 ? rev / subs : 0;
  $('em-out').innerHTML = result('Email revenue per month', money(rev), [
    ['Orders per month', orders < 10 ? orders.toFixed(1) : Math.round(orders).toLocaleString()], ['Value per subscriber / month', money(perSub, 2)], ['Value per subscriber / year', money(perSub * 12, 2)]
  ], 'Use the yearly value per subscriber as the most you\'d pay to win one new subscriber.');
});

/* ================= BUDGET =================
   The monthly budget dashboard lives in tools/budget/budget.js. */

wire('f-goal', function(){
  var goal = pos('g-goal'), have = pos('g-have'), monthly = pos('g-monthly'), r = n('g-rate') / 100 / 12, months = pos('g-months');
  var bal = have, m = 0;
  if(monthly > 0 || (r > 0 && have > 0)) while(bal < goal && m < 1200){ bal = bal * (1 + r) + monthly; m++; }
  var reach = bal >= goal ? m : Infinity;
  var need = 0;
  if(months > 0){ var f = r > 0 ? (Math.pow(1 + r, months) - 1) / r : months; need = Math.max(0, (goal - have * Math.pow(1 + r, months)) / f); }
  var y = Math.floor(reach / 12), mo = reach % 12;
  $('g-out').innerHTML = result('Time to reach your goal', isFinite(reach) ? (reach === 0 ? 'Done already' : (y ? y + ' yr ' : '') + mo + ' mo') : 'Not at this rate', [
    ['Goal', money(goal)], ['To hit it in ' + (months || '—') + ' months, save', months > 0 ? money(need, 0) + ' / mo' : '—']
  ], isFinite(reach) ? '' : 'Add a monthly amount to get there.');
});

wire('f-efund', function(){
  var ess = pos('e-ess'), months = pos('e-months'), have = pos('e-have'), save = pos('e-save');
  var target = ess * months, gap = Math.max(0, target - have), t = save > 0 ? Math.ceil(gap / save) : Infinity;
  $('e-out').innerHTML = result('Emergency fund target', money(target), [
    ['Still to save', money(gap)], ['Months to get there', gap === 0 ? 'Done' : isFinite(t) ? t + ' months' : 'Add a monthly amount']
  ], gap === 0 ? '<b>Fully funded.</b> Keep it in an easy-to-reach savings account, separate from spending money.' : 'Keep this in a separate savings account you can reach in a day, not invested.');
});

/* ================= SPENDING CHECK ================= */
var SC_VIEW = 'blocks', SC_LAST = null, SC_SIZE = '', SC_WORD = { good: 'Fine', warn: 'A bit over', bad: 'Too much' }, SC_SHORT = { 'Rent or mortgage': 'Rent', 'Subscriptions': 'Subs', 'Fun & hobbies': 'Fun', 'Groceries': 'Food', 'Transport': 'Travel', 'Eating out': 'Eat out', 'Shopping': 'Shop', 'Left over': 'Left' };  // blocks picture state (see drawTree below)
var scWatched = null, scRO = window.ResizeObserver ? new ResizeObserver(function(){ drawTree(false); }) : null;
// Each category is judged as a share of take-home pay. Guides, not laws: [green up to %, yellow up to %].
var SPEND = [
  ['s-housing', 'Rent or mortgage', 30, 40, 'It\'s hard to change fast. At your next lease, look at a cheaper place or a roommate.'],
  ['s-bills', 'Bills', 10, 15, 'Call your phone and insurance companies and ask for a cheaper plan. It often works.'],
  ['s-food', 'Groceries', 15, 20, 'Plan meals for the week and shop with a list.'],
  ['s-transport', 'Transport', 10, 15, 'Check your car payment, insurance and fuel. Could you share rides or take transit sometimes?'],
  ['s-eat', 'Eating out', 5, 10, 'Cook two more meals a week at home.'],
  ['s-shop', 'Shopping', 5, 10, 'Wait 48 hours before buying anything that isn\'t a need.'],
  ['s-subs', 'Subscriptions', 2, 4, 'Cancel anything you didn\'t use in the last 30 days.'],
  ['s-fun', 'Fun & hobbies', 5, 10, 'Keep some fun, just set a monthly limit and stick to it.']
];
var STATUS = {
  good: { cls: 'good', icon: '✓', word: 'Keep doing this' },
  warn: { cls: 'warn', icon: '!', word: 'Think about it' },
  bad:  { cls: 'bad',  icon: '✕', word: 'Cut back' }
};
wire('f-spend', function(){
  var inc = pos('s-income'), out = $('s-out');
  if(inc <= 0){ out.innerHTML = '<p class="sc-empty">Enter your monthly take-home pay to see your chart.</p>'; return; }
  var rows = [], total = 0;
  SPEND.forEach(function(c){
    var v = pos(c[0]); total += v;
    var share = v / inc * 100, st = share <= c[2] ? 'good' : share <= c[3] ? 'warn' : 'bad';
    rows.push({ name: c[1], v: v, share: share, st: st, tip: c[4], target: inc * c[2] / 100, g: c[2], y: c[3] });
  });
  var save = pos('s-save'), saveShare = save / inc * 100;
  var saveSt = saveShare >= 15 ? 'good' : saveShare >= 5 ? 'warn' : 'bad';
  rows.push({ name: 'Saving', v: save, share: saveShare, st: saveSt, saving: true, target: inc * .15 });
  total += save;
  var left = inc - total;

  // All text below is numbers and fixed wording only (no visitor-typed text), so it is safe as HTML.
  var html = '<div class="sc-sum"><div><span>Take-home pay</span><b>' + money(inc) + '</b></div><div><span>Spent + saved</span><b>' + money(total) + '</b></div><div><span>Left over</span><b class="' + (left < 0 ? 'neg' : '') + '">' + money(left) + '</b></div></div>';
  if(left < 0) html += '<p class="sc-alert"><span class="sc-ic bad" aria-hidden="true">✕</span><span><b>You spend ' + money(-left) + ' a month more than you earn.</b> Fix the red rows first.</span></p>';
  // Simple limit chart: each row's line in the middle is that category's limit (a goal for saving).
  // Before the line = fine, past the line = too much. Plain dollars, no percent scale.
  // Toolbar: what the colours mean, and a switch between the blocks picture and the bar list.
  html += '<div class="sc-bar-row"><div class="sc-legend" aria-hidden="true"><span><i class="sc-ic good">✓</i>Fine</span><span><i class="sc-ic warn">!</i>A bit over</span><span><i class="sc-ic bad">✕</i>Too much</span><span class="sc-size">Bigger block = more money</span></div>' +
    '<div class="sc-switch" role="group" aria-label="Chart style"><button type="button" data-scview="blocks" aria-pressed="' + (SC_VIEW === 'blocks') + '">Blocks</button><button type="button" data-scview="list" aria-pressed="' + (SC_VIEW === 'list') + '">List</button></div></div>';
  html += '<div class="sc-tree" role="group" aria-label="Your take-home pay as blocks: the bigger the block, the more money goes there"' + (SC_VIEW === 'list' ? ' hidden' : '') + '></div>';
  html += '<div class="sc-listview"' + (SC_VIEW === 'blocks' ? ' hidden' : '') + '>';
  html += '<div class="sc-axis" aria-hidden="true"><span></span><span><b style="left:0">$0</b><b class="lim" style="left:50%">Limit</b><b style="left:100%">2× limit</b></span><span>Spent / limit</span><span></span></div>';
  html += '<ul class="sc-chart" aria-label="What you spend in each category compared with your limit">';
  rows.forEach(function(r){
    var S = STATUS[r.st], word = r.saving ? (r.st === 'good' ? 'Goal met' : 'Save more') : { good: 'Fine', warn: 'A bit over', bad: 'Too much' }[r.st];
    var lim = Math.max(1, r.target), w = Math.min(100, r.v / (2 * lim) * 100);
    var label = r.saving ? 'goal' : 'limit';
    html += '<li class="' + S.cls + '" tabindex="0" title="' + r.name + ': you spend ' + money(r.v) + '. Your ' + label + ' is ' + money(r.target) + '. ' + word + '.">' +
      '<span class="sc-name">' + r.name + '</span>' +
      '<span class="sc-track' + (r.v > 2 * lim ? ' over' : '') + '"><i style="width:' + (r.v > 0 ? Math.max(1.5, w).toFixed(2) : 0) + '%"></i>' + (r.v > 2 * lim ? '<b class="sc-cap" aria-hidden="true">›</b>' : '') + '</span>' +
      '<span class="sc-val">' + money(r.v) + ' <small>/ ' + money(r.target) + '</small></span>' +
      '<span class="sc-st"><i class="sc-ic ' + S.cls + '" aria-hidden="true">' + S.icon + '</i><span class="sc-w">' + word + '</span></span></li>';
  });
  html += '</ul>';
  html += '<p class="sc-axt">The line is your limit. A bar past the line means too much. For saving, the line is your goal: try to reach it.</p></div>';
  html += '<p class="sc-detail" aria-live="polite"></p>';
  var bad = rows.filter(function(r){ return r.st === 'bad'; }), warn = rows.filter(function(r){ return r.st === 'warn'; });
  var todo = [];
  bad.concat(warn).forEach(function(r){
    if(r.saving) todo.push('<li class="' + r.st + '"><b>Saving:</b> aim for about ' + money(r.target) + ' a month (15% of your pay). Set it to move automatically on payday.</li>');
    else todo.push('<li class="' + r.st + '"><b>' + r.name + ':</b> ' + (r.st === 'bad' ? 'cut back to about ' + money(r.target) + ' a month. ' : 'a little high. ') + r.tip + '</li>');
  });
  html += todo.length ? '<h3 class="sc-h">What to do</h3><ul class="sc-todo">' + todo.join('') + '</ul>' : '<p class="sc-ok"><span class="sc-ic good" aria-hidden="true">✓</span> Everything is inside the usual guides. Keep doing what you\'re doing.</p>';
  // Short version for wide screens, where the chart and the boxes share one screen.
  if(todo.length){
    var mini = bad.map(function(r){ return '<li class="bad"><b>Cut back:</b> ' + (r.saving ? 'save about ' + money(r.target) + ' a month' : r.name + ' to about ' + money(r.target) + ' a month') + '.</li>'; });
    if(warn.length) mini.push('<li class="warn"><b>Think about:</b> ' + warn.map(function(r){ return r.name; }).join(', ') + '.</li>');
    html += '<ul class="sc-mini">' + mini.join('') + '</ul>';
  }
  out.innerHTML = html;
  SC_LAST = { rows: rows, inc: inc, left: left, total: total };
  drawTree(true);
});

/* ---------- Spending check: the "blocks" picture (a treemap) ----------
   Each block's area is its share of the money. Colour + icon + word give the status.
   Squarified layout keeps blocks close to square so they're easy to compare. */
function scWorst(row, side){ var s = 0, mx = 0, mn = Infinity; row.forEach(function(r){ s += r.a; mx = Math.max(mx, r.a); mn = Math.min(mn, r.a); }); return Math.max(side * side * mx / (s * s), s * s / (side * side * mn)); }
function squarify(items, W, H){
  var total = items.reduce(function(a, it){ return a + it.v; }, 0), rects = [], x = 0, y = 0, w = W, h = H;
  var rest = items.map(function(it){ return { it: it, a: it.v / total * W * H }; });
  while(rest.length){
    var side = Math.min(w, h), row = [], best = Infinity, i = 0;
    while(i < rest.length){ var cand = row.concat([rest[i]]), r = scWorst(cand, side); if(r <= best){ row = cand; best = r; i++; } else break; }
    var sum = row.reduce(function(a, r){ return a + r.a; }, 0), thick = sum / side;
    if(w >= h){ var yy = y; row.forEach(function(r){ var hh = r.a / thick; rects.push({ it: r.it, x: x, y: yy, w: thick, h: hh }); yy += hh; }); x += thick; w -= thick; }
    else { var xx = x; row.forEach(function(r){ var ww = r.a / thick; rects.push({ it: r.it, x: xx, y: y, w: ww, h: thick }); xx += ww; }); y += thick; h -= thick; }
    rest = rest.slice(row.length);
  }
  return rects;
}
function scInfo(r, inc){
  if(r.left) return { title: 'Left over', line: money(r.v) + ' · ' + pct(r.v / inc * 100, 0) + ' of your pay not spent or saved yet. Give it a job: savings or debt.' };
  var word = r.saving ? (r.st === 'good' ? 'Goal met' : 'Save more') : SC_WORD[r.st];
  var base = money(r.v) + ' · ' + pct(r.share, 0) + ' of pay · ' + (r.saving ? 'goal ' : 'limit ') + money(r.target) + ' · ' + word;
  var tip = r.saving ? (r.st === 'good' ? 'Nice: you save at least 15% of your pay.' : 'Aim for about ' + money(r.target) + ' a month (15% of your pay), moved automatically on payday.')
    : r.st === 'good' ? 'Inside the guide. Keep it there.' : r.tip;
  return { title: r.name, line: base + '. ' + tip };
}
function scShow(r, inc){
  var p = document.querySelector('#s-out .sc-detail'); if(!p) return;
  var info = scInfo(r, inc); p.textContent = '';
  var b = document.createElement('b'); b.textContent = info.title + ': '; p.appendChild(b); p.appendChild(document.createTextNode(info.line));
  Array.prototype.forEach.call(document.querySelectorAll('#s-out .sc-tile'), function(t){ t.classList.toggle('on', t.getAttribute('data-name') === info.title); });
}
function drawTree(animate){
  var box = document.querySelector('#s-out .sc-tree'); if(!box || !SC_LAST || box.hidden) return;
  var W = box.clientWidth, H = box.clientHeight; if(W < 40 || H < 40) return;
  if(!animate && W + 'x' + H === SC_SIZE && box.firstChild) return;  // same size as last time: nothing to redraw
  SC_SIZE = W + 'x' + H;
  if(scRO && box !== scWatched){ if(scWatched) scRO.unobserve(scWatched); scRO.observe(box); scWatched = box; }
  var d = SC_LAST, items = d.rows.filter(function(r){ return r.v > 0; }).map(function(r){ return r; });
  if(d.left > 0) items.push({ name: 'Left over', v: d.left, left: true });
  items.sort(function(a, b){ return b.v - a.v; });
  box.textContent = '';
  if(!items.length){ var e = document.createElement('p'); e.className = 'sc-empty'; e.textContent = 'Enter what you spend to see your blocks.'; box.appendChild(e); return; }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  squarify(items, W, H).forEach(function(rc, i){
    var r = rc.it, st = r.left ? 'left' : r.st, t = document.createElement('button');
    t.type = 'button'; t.className = 'sc-tile st-' + st; t.setAttribute('data-name', r.left ? 'Left over' : r.name);
    t.style.left = rc.x + 'px'; t.style.top = rc.y + 'px'; t.style.width = Math.max(0, rc.w - 3) + 'px'; t.style.height = Math.max(0, rc.h - 3) + 'px';
    var info = scInfo(r, d.inc); t.setAttribute('aria-label', info.title + ': ' + info.line);
    var size = rc.w >= 118 && rc.h >= 74 ? 'l' : rc.w >= 76 && rc.h >= 46 ? 'm' : rc.w >= 44 && rc.h >= 28 ? 's' : 'xs';
    t.classList.add('sz-' + size);
    var top = document.createElement('span'); top.className = 't-top';
    if(!r.left){ var ic = document.createElement('i'); ic.className = 'sc-ic ' + r.st; ic.setAttribute('aria-hidden', 'true'); ic.textContent = STATUS[r.st].icon; top.appendChild(ic); }
    if(size !== 'xs'){ var full = r.left ? 'Left over' : r.name, nm = document.createElement('b'); nm.className = 't-name';
      // Short names in narrow blocks so nothing gets cut off; the full name is in the detail line and for screen readers.
      nm.textContent = (rc.w < 130 || size === 's') && SC_SHORT[full] ? SC_SHORT[full] : full; top.appendChild(nm); }
    t.appendChild(top);
    if(size === 'l' || size === 'm'){ var v = document.createElement('b'); v.className = 't-val'; v.textContent = money(r.v); t.appendChild(v); }
    if(size === 'l'){ var sub = document.createElement('span'); sub.className = 't-sub';
      sub.textContent = r.left || rc.w < 165 ? pct((r.left ? r.v / d.inc * 100 : r.share), 0) + ' of pay' : pct(r.share, 0) + ' of pay · ' + (r.saving ? 'goal ' : 'limit ') + money(r.target); t.appendChild(sub);
      if(!r.left){ var w = document.createElement('span'); w.className = 't-word'; w.textContent = r.saving ? (r.st === 'good' ? 'Goal met' : 'Save more') : SC_WORD[r.st]; t.appendChild(w); } }
    if(animate && !reduce){ t.style.animationDelay = (i * 35) + 'ms'; t.classList.add('grow'); }
    var show = function(){ scShow(r, d.inc); };
    t.addEventListener('click', show); t.addEventListener('focus', show); t.addEventListener('pointerenter', function(e){ if(e.pointerType === 'mouse') show(); });
    box.appendChild(t);
  });
  // Start on the most useful block: the biggest overspend, else the biggest block.
  var worst = d.rows.filter(function(r){ return r.st === 'bad' && !r.saving; }).sort(function(a, b){ return (b.v - b.target) - (a.v - a.target); })[0] || d.rows.filter(function(r){ return r.st !== 'good'; })[0] || items[0];
  scShow(worst, d.inc);
}
document.addEventListener('click', function(e){
  var b = e.target.closest && e.target.closest('[data-scview]'); if(!b) return;
  SC_VIEW = b.getAttribute('data-scview');
  var out = document.getElementById('s-out');
  out.querySelector('.sc-tree').hidden = SC_VIEW !== 'blocks'; out.querySelector('.sc-listview').hidden = SC_VIEW !== 'list';
  Array.prototype.forEach.call(out.querySelectorAll('[data-scview]'), function(x){ x.setAttribute('aria-pressed', String(x === b)); });
  if(SC_VIEW === 'blocks') drawTree(false);
});
// Redraw only when the blocks area itself changes size (not when the detail text below changes).
if(!scRO) window.addEventListener('resize', function(){ drawTree(false); });


// "See the full breakdown": hand this browser's numbers to the budget dashboard (stays on this device).
(function(){
  var a = $('s-full'); if(!a) return;
  a.addEventListener('click', function(){
    var h = {}; ['income','housing','bills','food','transport','eat','shop','subs','fun','save'].forEach(function(k){ h[k] = pos('s-' + k); });
    try{ localStorage.setItem('sharp-budget-handoff', JSON.stringify(h)); }catch(e){}
  });
})();

// Phone view of the home page: one panel at a time so nothing needs scrolling.
Array.prototype.forEach.call(document.querySelectorAll('[data-sctab]'), function(b){
  b.addEventListener('click', function(){
    var box = document.querySelector('.sc-first'); if(!box) return;
    box.setAttribute('data-view', b.getAttribute('data-sctab'));
    Array.prototype.forEach.call(document.querySelectorAll('[data-sctab]'), function(x){ x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
  });
});

/* ================= IDEA CHECK ================= */
wire('f-idea', function(){
  var price = pos('i-price'), cost = pos('i-cost'), fixed = pos('i-fixed'), goal = pos('i-goal'), per = price - cost;
  if(per <= 0){
    $('i-out').innerHTML = result('Customers needed each month', 'Never', [['Each sale loses', money(-per, 2)]], '<b>Doesn\'t add up yet.</b> Each sale costs more than it earns, so more customers means bigger losses. Raise the price or cut the cost per sale.');
    return;
  }
  var need = Math.ceil((fixed + goal) / per), be = Math.ceil(fixed / per), day = need / 30, margin = per / price * 100, v;
  if(day <= 3) v = '<b>Doable on paper.</b> About ' + (day < 1 ? 'one sale every ' + Math.round(1 / day) + ' days' : day.toFixed(1) + ' sales a day') + '. Next question: will strangers actually pay ' + money(price) + '? Prove that before you build more.';
  else if(day <= 20) v = '<b>Possible, but it\'s a real business.</b> ' + Math.round(day) + ' sales a day takes steady marketing. Test whether a higher price still sells; it cuts this number fast.';
  else v = '<b>That\'s a lot of sales for one person.</b> ' + Math.round(day).toLocaleString() + ' a day needs serious traffic or a team. Raise the price, cut costs, or sell something bigger.';
  if(margin < 30) v += ' Your margin is thin (' + pct(margin, 0) + '), so small cost increases will hurt.';
  $('i-out').innerHTML = result('Customers needed each month', need.toLocaleString(), [
    ['Per day', day < 10 ? day.toFixed(1) : Math.round(day).toLocaleString()], ['Each sale keeps', money(per, 2)], ['Break-even (bills only)', be.toLocaleString() + ' a month'], ['Margin', pct(margin, 0)]
  ], v);
});

/* ================= MONEY PLAN ================= */
function monthName(k){ var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + k); return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }); }
function round5(v){ return Math.round(v / 5) * 5; }
// Month-by-month: safety fund first, then high-interest debt, then full emergency fund, then the business fund.
function simulate(A, o){
  var cash = o.saved, debt = o.debt, biz = 0, done = {}, m;
  for(m = 0; m <= 600; m++){
    if(done.starter == null && cash >= o.starter) done.starter = m;
    if(done.debt == null && debt <= 0.5) done.debt = m;
    if(done.full == null && done.starter != null && done.debt != null && cash >= o.full) done.full = m;
    if(done.goal == null && done.full != null && biz >= o.goal) done.goal = m;
    if(done.goal != null) break;
    var avail = A;
    if(debt > 0){ debt = debt * (1 + o.r) - o.min; if(debt < 0){ avail += -debt; debt = 0; } } else avail += o.min;
    if(avail <= 0) continue;
    var put;
    if(cash < o.starter){ put = Math.min(avail, o.starter - cash); cash += put; avail -= put; }
    if(avail > 0 && debt > 0){ put = Math.min(avail, debt); debt -= put; avail -= put; }
    if(avail > 0 && cash < o.full){ put = Math.min(avail, o.full - cash); cash += put; avail -= put; }
    if(avail > 0 && biz < o.goal){ put = Math.min(avail, o.goal - biz); biz += put; avail -= put; }
  }
  return done;
}
wire('f-mplan', function(){
  var inc = pos('m-income'), housing = pos('m-housing'), must = housing + pos('m-bills') + pos('m-food') + pos('m-transport');
  var WANT = [['m-eat', 'Eating out'], ['m-shop', 'Shopping'], ['m-fun', 'Fun & hobbies'], ['m-subs', 'Subscriptions']];
  var wants = WANT.reduce(function(a, w){ return a + pos(w[0]); }, 0);
  var rate = pos('m-rate'), min = pos('m-min'), debtBal = pos('m-debt'), high = debtBal > 0 && rate >= 8;
  var steady = !$('m-steady') || $('m-steady').value !== 'irregular';
  var free = inc - must - wants - min, p = function(x){ return inc > 0 ? x / inc * 100 : 0; };
  var o = { saved: pos('m-saved'), debt: high ? debtBal : 0, r: rate / 100 / 12, min: high ? min : 0, starter: must, full: must * (steady ? 3 : 6), goal: pos('m-goal') };
  var out = $('m-out');
  if(inc <= 0){ out.innerHTML = result('Your money plan', '—', [], 'Enter your monthly take-home pay to start.'); return; }

  // What to stop or cut
  var tight = high || o.saved < must, target = inc * (tight ? .2 : .3), cut = Math.max(0, wants - target), cuts = [];
  if(free < 0) cuts.push('<b>You spend ' + money(-free) + ' a month more than you earn.</b> This comes first: nothing else works until it\'s fixed.');
  if(cut >= 5){
    var parts = WANT.filter(function(w){ return pos(w[0]) > 0; }).map(function(w){ return w[1] + ' −' + money(round5(pos(w[0]) / wants * cut)); });
    cuts.push('<b>Trim nice-to-haves by ' + money(round5(cut)) + ' a month</b>, to ' + (tight ? '20%' : '30%') + ' of your pay' + (tight ? ' until your safety fund is built and high-interest debt is gone' : '') + ': ' + parts.join(', ') + '.');
  }
  if(high) cuts.push('<b>Stop putting new spending on the ' + rate + '% debt.</b> Pay with money you already have until it\'s paid off.');
  if(pos('m-subs') > 0) cuts.push('<b>Cancel any subscription you haven\'t used in the last 30 days.</b> Check your bank statement; most people find at least one.');
  if(p(housing) > 40) cuts.push('<b>Housing is ' + pct(p(housing), 0) + ' of your pay.</b> It\'s the hardest cost to change but the biggest. At your next lease, look at a cheaper place or a roommate.');
  if(p(pos('m-transport')) > 15) cuts.push('<b>Transport is ' + pct(p(pos('m-transport')), 0) + ' of your pay.</b> Check car payment, insurance and fuel; it\'s often the second-biggest leak.');
  if(debtBal > 0 && !high) cuts.push('Your debt\'s rate is under 8%, so keep paying the minimum and don\'t rush it. Building savings matters more. (8% is a common rule of thumb, not a law.)');
  if(!cuts.length) cuts.push('<b>Nothing big to cut.</b> Your spending is inside the usual guides. Keep it that way as your pay grows.');

  var A = free + (cut >= 5 ? round5(cut) : 0);
  var html = result('Money to put to work each month', money(Math.max(0, A)), [
    ['Take-home pay', money(inc)], ['Must-pays', money(must) + ' · ' + pct(p(must), 0)], ['Nice-to-haves', money(wants) + ' · ' + pct(p(wants), 0)], ['Debt minimums', money(min)]
  ], A > 0 ? (cut >= 5 ? 'That includes the ' + money(round5(cut)) + ' freed up by the cuts below.' : '') : '<b>No money left to plan with.</b> Make the cuts below first.');

  // What to spend on, and when
  var steps = [];
  function when(m){ return m == null ? 'Not within 50 years at this rate' : m === 0 ? 'Done already' : 'By ' + monthName(m) + ' · ' + m + (m === 1 ? ' month' : ' months'); }
  steps.push(['Every payday, first', 'Must-pays and minimum payments: ' + money(must + min) + ' a month.', 'Now, every month']);
  if(A > 0){
    var d = simulate(A, o), base = free > 0 && free < A ? simulate(free, o) : null;
    steps.push(['Starter safety fund: ' + money(o.starter), 'One month of must-pays, so a surprise bill doesn\'t go on a card.', when(d.starter)]);
    if(high) steps.push(['Pay off the ' + rate + '% debt: ' + money(debtBal), 'High interest costs more than almost any investment earns. Every extra dollar here is a guaranteed return.', when(d.debt)]);
    steps.push(['Full emergency fund: ' + money(o.full), (steady ? '3' : '6') + ' months of must-pays' + (steady ? '' : ', because irregular income needs a bigger cushion') + '. Keep it in a separate savings account.', when(d.full)]);
    if(o.goal > 0) steps.push(['Business fund: ' + money(o.goal), 'Money to start your business without borrowing.', when(d.goal)]);
    var last = o.goal > 0 ? d.goal : d.full;
    steps.push(['Then: invest for the long term', 'About ' + money(A + (high ? min : 0)) + ' a month. The Investing lesson explains the basics.', last == null ? '—' : 'From ' + monthName(last)]);
    var lastBase = base ? (o.goal > 0 ? base.goal : base.full) : null;
    if(base && last != null) html += '<p class="mp-note">' + (lastBase == null ? 'Without the cuts, this plan doesn\'t finish within 50 years.' : 'Without the cuts it takes ' + lastBase + ' months instead of ' + last + '.') + '</p>';
  }
  html += '<h3 class="mp-h">Spend on this, in this order</h3><ol class="mp-steps">' + steps.map(function(s){ return '<li><b>' + s[0] + '</b><span>' + s[1] + '</span><em>' + s[2] + '</em></li>'; }).join('') + '</ol>';
  html += '<h3 class="mp-h">Stop or cut</h3><ul class="mp-cuts">' + cuts.map(function(c){ return '<li>' + c + '</li>'; }).join('') + '</ul>';
  out.innerHTML = html;
});

/* ================= AI AT WORK ================= */
wire('f-aisave', function(){
  var before = pos('as-before'), after = pos('as-after'), rate = pos('as-rate'), cost = pos('as-cost');
  var hrs = (before - after) * 52 / 12, value = hrs * rate, net = value - cost, v;
  if(before <= 0) v = 'Enter how long the task took without AI.';
  else if(hrs <= 0) v = '<b>AI isn\'t saving time here.</b> Checking and fixing take as long as doing it yourself. Try a better prompt or a different task.';
  else if(net <= 0) v = '<b>It saves time, but costs more than that time is worth.</b> Cut the tool or use it for more tasks.';
  else v = '<b>Worth it.</b> AI gives you back about ' + Math.round(hrs) + ' hours a month. Decide now what you\'ll do with them, or they turn into more email.';
  $('as-out').innerHTML = result('Value saved each month, after the AI bill', money(net), [
    ['Hours saved a month', hrs.toFixed(1)], ['Value of that time', money(value)], ['AI cost', money(cost)]
  ], v);
});

wire('f-aicost', function(){
  var subs = pos('ac-subs'), use = pos('ac-usage'), cust = pos('ac-cust'), price = pos('ac-price'), unused = Math.min(pos('ac-unused'), subs);
  var total = subs + use, per = cust > 0 ? total / cust : 0, share = price > 0 ? per / price * 100 : 0, v;
  if(cust <= 0) v = 'Enter how many customers you have a month.';
  else if(share > 20) v = '<b>AI eats ' + pct(share, 0) + ' of each sale.</b> That\'s a lot. Cut unused tools, set spending limits, or raise your price.';
  else if(share > 10) v = '<b>Watch it.</b> AI costs ' + pct(share, 0) + ' of each sale. Set a monthly spending limit with each AI provider so one big job can\'t surprise you.';
  else v = '<b>Healthy.</b> AI is ' + pct(share, 0) + ' of each sale. Keep a monthly limit on pay-per-use tools anyway.';
  if(unused > 0) v += ' Cancelling unused subscriptions saves ' + money(unused * 12) + ' a year.';
  $('ac-out').innerHTML = result('AI cost per customer', money(per, 2), [
    ['Total AI cost a month', money(total)], ['Share of each sale', pct(share, 0)], ['Wasted on unused tools a year', money(unused * 12)]
  ], v);
});

// Before-you-paste check: runs only on this device. Results are shown with textContent only.
var PC_RULES = [
  ['Email addresses', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]'],
  ['Passwords or API keys', /\b(?:sk|pk|rk)[-_][A-Za-z0-9_-]{16,}\b|\b(?:password|passcode|pwd)\s*[:=]\s*\S+/gi, '[SECRET]'],
  ['Card numbers', /\b(?:\d[ -]?){13,19}\b/g, '[CARD]', function(m){ var d = m.replace(/\D/g, ''), sum = 0; for(var i = 0; i < d.length; i++){ var n = +d[d.length - 1 - i]; if(i % 2){ n *= 2; if(n > 9) n -= 9; } sum += n; } return d.length >= 13 && sum % 10 === 0; }],
  ['ID numbers (like SSNs)', /\b\d{3}-\d{2}-\d{4}\b/g, '[ID]'],
  ['Phone numbers', /(?:\+?\d{1,3}[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/g, '[PHONE]']
];
function pcCheck(){
  var text = $('pc-text').value, clean = text, found = [], out = $('pc-out');
  PC_RULES.forEach(function(r){
    var n = 0;
    clean = clean.replace(r[1], function(m){ if(r[3] && !r[3](m)) return m; n++; return r[2]; });
    if(n) found.push([r[0], n]);
  });
  out.textContent = '';
  var k = document.createElement('div'); k.className = 'k'; k.textContent = text.trim() ? (found.length ? 'Found private info' : 'Nothing obvious found') : 'Paste some text to check it'; out.appendChild(k);
  if(!text.trim()) return clean;
  if(found.length){
    var ul = document.createElement('ul'); ul.className = 'pc-list';
    found.forEach(function(f){ var li = document.createElement('li'), a = document.createElement('span'), b = document.createElement('span'); a.textContent = f[0]; b.textContent = f[1]; li.appendChild(a); li.appendChild(b); ul.appendChild(li); });
    out.appendChild(ul);
  }
  var p = document.createElement('p'); p.className = 'fine'; p.textContent = found.length ? 'Cleaned copy (private info replaced):' : 'No emails, phone, card or ID numbers, or keys found. Still read it: names, addresses and money details can\'t all be caught automatically.'; out.appendChild(p);
  if(found.length){ var pre = document.createElement('div'); pre.className = 'pc-clean'; pre.textContent = clean; out.appendChild(pre); }
  return clean;
}
if($('f-paste')){
  $('pc-text').addEventListener('input', pcCheck); pcCheck();
  $('f-paste').addEventListener('submit', function(e){ e.preventDefault(); });
  $('pc-clear').addEventListener('click', function(){ $('pc-text').value = ''; pcCheck(); });
  $('pc-copy').addEventListener('click', function(){
    var t = pcCheck(), btn = this;
    function done(ok){ btn.textContent = ok ? 'Copied ✓' : 'Select the text and copy it'; setTimeout(function(){ btn.textContent = 'Copy cleaned text'; }, 1800); }
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function(){ done(true); }, function(){ done(false); }); else done(false);
  });
}

// Prompt library: saved on this device only (localStorage). Rendered with textContent only.
var PR_KEY = 'sharp-prompts', DAY = 86400000;
function prLoad(){ try{ var v = JSON.parse(localStorage.getItem(PR_KEY) || '[]'); return Array.isArray(v) ? v : []; }catch(e){ return []; } }
function prSave(list){ try{ localStorage.setItem(PR_KEY, JSON.stringify(list)); return true; }catch(e){ return false; } }
function prCopy(text, btn, label){
  function done(ok){ btn.textContent = ok ? 'Copied ✓' : 'Select and copy'; setTimeout(function(){ btn.textContent = label; }, 1600); }
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(false); }); else done(false);
}
function prRender(){
  var list = prLoad(), box = $('pr-list'); box.textContent = '';
  var k = document.createElement('div'); k.className = 'k'; k.textContent = list.length ? 'Your prompts (' + list.length + ')' : 'No prompts saved yet'; box.appendChild(k);
  if(!list.length){ var e = document.createElement('p'); e.className = 'fine'; e.textContent = 'Save your first prompt on the left. It stays on this device only.'; box.appendChild(e); return; }
  list.forEach(function(item, i){
    var d = document.createElement('div'); d.className = 'pr-item';
    var h = document.createElement('h3'); h.textContent = item.name; d.appendChild(h);
    var pre = document.createElement('pre'); pre.textContent = item.text; d.appendChild(pre);
    var row = document.createElement('div'); row.className = 'row';
    var age = Math.floor((Date.now() - (item.tested || 0)) / DAY), st = document.createElement('span');
    st.className = age > 30 ? 'pr-old' : 'pr-ok'; st.textContent = age > 30 ? '! Last tested ' + age + ' days ago. Test it again.' : 'Tested ' + (age === 0 ? 'today' : age + (age === 1 ? ' day ago' : ' days ago'));
    var c = document.createElement('button'); c.type = 'button'; c.className = 'btn sm'; c.textContent = 'Copy';
    c.addEventListener('click', function(){ prCopy(item.text, c, 'Copy'); });
    var t = document.createElement('button'); t.type = 'button'; t.className = 'btn sm ghost'; t.textContent = 'I tested it today';
    t.addEventListener('click', function(){ var l = prLoad(); if(l[i]){ l[i].tested = Date.now(); prSave(l); prRender(); } });
    var x = document.createElement('button'); x.type = 'button'; x.className = 'btn sm ghost'; x.textContent = 'Delete';
    x.addEventListener('click', function(){ var l = prLoad(); l.splice(i, 1); prSave(l); prRender(); });
    row.appendChild(c); row.appendChild(t); row.appendChild(x); row.appendChild(st); d.appendChild(row); box.appendChild(d);
  });
}
if($('f-prompts')){
  $('f-prompts').addEventListener('submit', function(e){ e.preventDefault(); });
  $('pr-save').addEventListener('click', function(){
    var name = txt('pr-name'), text = txt('pr-text'), msg = $('pr-msg');
    if(!name || !text){ msg.textContent = 'Add a name and the prompt first.'; return; }
    var list = prLoad(); list.unshift({ name: name.slice(0, 80), text: text.slice(0, 4000), tested: Date.now() });
    if(!prSave(list.slice(0, 100))){ msg.textContent = 'Couldn\'t save: your browser is blocking storage (private mode?).'; return; }
    $('pr-name').value = ''; $('pr-text').value = ''; msg.textContent = 'Saved on this device.'; prRender();
  });
  $('pr-copyall').addEventListener('click', function(){
    var all = prLoad().map(function(p){ return p.name + '\n' + p.text; }).join('\n\n---\n\n');
    prCopy(all || 'No prompts saved yet.', this, 'Copy all prompts');
  });
  prRender();
}

/* ================= BUSINESS PLAN & PRICING ================= */
var PLAN_FIELDS = [
  ['pl-name', 'Business'], ['pl-problem', 'The problem'], ['pl-customer', 'Who it\'s for'], ['pl-solution', 'What I sell'],
  ['pl-why', 'Why me'], ['pl-price', 'Price'], ['pl-channels', 'How customers find me'], ['pl-costs', 'Costs'],
  ['pl-goal', '90-day goal'], ['pl-risk', 'Biggest risk and how I\'ll test it']
];
function buildPlan(){
  var out = $('pl-out'); if(!out) return;
  out.textContent = '';
  var any = false;
  PLAN_FIELDS.forEach(function(f){
    var v = txt(f[0]); if(!v) return; any = true;
    if(f[0] === 'pl-name'){ var h = document.createElement('h3'); h.textContent = v + ': one-page plan'; h.style.marginTop = '0'; out.appendChild(h); return; }
    var hh = document.createElement('h3'); hh.textContent = f[1]; out.appendChild(hh);
    var p = document.createElement('p'); p.textContent = v; out.appendChild(p);
  });
  if(!any){ var e = document.createElement('p'); e.className = 'fine'; e.textContent = 'Fill in the boxes and your plan appears here.'; out.appendChild(e); }
  try{ var d = {}; PLAN_FIELDS.forEach(function(f){ d[f[0]] = txt(f[0]); }); localStorage.setItem('sharp-plan', JSON.stringify(d)); }catch(e){}
}
if($('f-plan')){
  try{ var saved = JSON.parse(localStorage.getItem('sharp-plan') || 'null'); if(saved) PLAN_FIELDS.forEach(function(f){ if(saved[f[0]] && $(f[0])) $(f[0]).value = saved[f[0]]; }); }catch(e){}
  wire('f-plan', buildPlan);
  $('pl-copy').addEventListener('click', function(){
    var lines = []; PLAN_FIELDS.forEach(function(f){ var v = txt(f[0]); if(v) lines.push(f[0] === 'pl-name' ? v.toUpperCase() + ': ONE-PAGE PLAN' : f[1] + ':\n' + v); });
    var text = lines.join('\n\n'), btn = this;
    function done(ok){ btn.textContent = ok ? 'Copied ✓' : 'Select the text and copy it'; setTimeout(function(){ btn.textContent = 'Copy plan'; }, 1800); }
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(false); }); else done(false);
  });
  $('pl-clear').addEventListener('click', function(){ PLAN_FIELDS.forEach(function(f){ $(f[0]).value = ''; }); buildPlan(); });
}

wire('f-price', function(){
  var cost = pos('pr-cost'), m = Math.min(95, pos('pr-margin')) / 100, comp = pos('pr-comp');
  var price = m < 1 ? cost / (1 - m) : 0, markup = cost > 0 ? (price - cost) / cost * 100 : 0;
  var v = '';
  if(comp > 0){
    var diff = (price - comp) / comp * 100;
    v = Math.abs(diff) < 5 ? 'That\'s right around the competition (' + money(comp, 2) + ').'
      : diff > 0 ? 'That\'s <b>' + pct(diff, 0) + ' above</b> the competitor at ' + money(comp, 2) + '. You need a clear reason to be worth more: better quality, faster, more personal.'
      : 'That\'s <b>' + pct(-diff, 0) + ' below</b> the competitor at ' + money(comp, 2) + '. You may be leaving money on the table; most new businesses underprice.';
  }
  $('pr-out').innerHTML = result('Price for a ' + pct(m * 100, 0) + ' margin', money(price, 2), [
    ['Profit per sale', money(price - cost, 2)], ['Markup on cost', pct(markup, 0)]
  ], v);
});

wire('f-pnl', function(){
  var units = pos('pn-units'), price = pos('pn-price'), cost = pos('pn-cost'), fixed = pos('pn-rent') + pos('pn-soft') + pos('pn-mkt') + pos('pn-pay'), tax = pos('pn-tax') / 100;
  var rev = units * price, cogs = units * cost, gross = rev - cogs, op = gross - fixed, taxes = op > 0 ? op * tax : 0, net = op - taxes;
  var gm = rev > 0 ? gross / rev * 100 : 0, nm = rev > 0 ? net / rev * 100 : 0;
  $('pn-out').innerHTML = result('Net profit per month', money(net), [
    ['Revenue', money(rev)], ['Cost of goods', money(cogs)], ['Gross profit', money(gross) + ' · ' + pct(gm, 0)], ['Fixed costs', money(fixed)],
    ['Tax (estimate)', money(taxes)], ['Net margin', pct(nm, 0)], ['Net profit per year', money(net * 12)]
  ], net < 0 ? '<b>Losing money.</b> At this price and cost you need ' + (price - cost > 0 ? Math.ceil(fixed / (price - cost)).toLocaleString() + ' units a month to break even.' : 'a price above your cost per unit first.') : '');
});

/* ================= NEGOTIATION PREP ================= */
var SCRIPTS = {
  salary:   { open: 'Thank you, I\'m excited about this role. Based on the market and what I bring, I was expecting {anchor}. Is there flexibility on base?', low: 'I appreciate it. That\'s below what similar roles pay. What would it take to get closer to {target}?', close: 'If we can do {target}, I\'m ready to accept today.', walk: 'I\'ve thought about it carefully, and I can\'t go below {walk}. If that doesn\'t work, I understand, and I\'d love to stay in touch.' },
  buying:   { open: 'I\'m ready to buy this week, and I\'m comparing options. I can do {anchor} today.', low: 'That\'s more than I can do. If you can get to {target}, we can sign today.', close: 'At {target}, we have a deal.', walk: '{walk} is the most I can pay. If that doesn\'t work, I\'ll go with my other option, no hard feelings.' },
  selling:  { open: 'For this scope, the price is {anchor}. That covers [the result they get].', low: 'I understand. Rather than cut the price, we could reduce the scope to fit your budget. Which part matters most to you?', close: 'At {target} with the scope we agreed, I can start [date].', walk: 'Below {walk} I can\'t do the work properly, so I\'d rather pass than do it badly.' },
  rent:     { open: 'I\'ve been a reliable tenant and I\'d like to stay. Similar places nearby are listed around {anchor}. Could we keep it there if I sign a longer lease?', low: 'I understand costs go up. Could we meet at {target} with a 12-month lease?', close: 'At {target}, I\'ll sign the renewal this week.', walk: 'Above {walk} it makes more sense for me to move, which I\'d rather avoid.' },
  supplier: { open: 'We\'re looking for a long-term supplier. At our volume we\'d expect around {anchor} per unit.', low: 'That\'s above what we\'re seeing elsewhere. If you can do {target}, we can commit to [volume / length].', close: 'At {target} with those terms, let\'s put it in writing.', walk: 'Above {walk} the numbers don\'t work for us, so we\'d go with another supplier.' },
  other:    { open: 'Based on what I\'ve seen, I\'m proposing {anchor}.', low: 'That\'s further apart than I expected. How did you arrive at that number?', close: 'If we can agree on {target}, I\'m ready to move forward.', walk: 'I can\'t go past {walk}. If that doesn\'t work, I understand.' }
};
function negPlan(){
  var out = $('ng-out'); if(!out) return;
  var type = $('ng-type').value, dir = $('ng-dir').value; // 'up' = you want a higher number, 'down' = lower
  var target = pos('ng-target'), walk = pos('ng-walk'), theirs = pos('ng-theirs');
  var batna = txt('ng-batna'), trade = txt('ng-trade'), ask = txt('ng-ask');
  out.textContent = '';
  function sec(title){ var h = document.createElement('h3'); h.textContent = title; out.appendChild(h); }
  function para(t, cls){ var p = document.createElement('p'); if(cls) p.className = cls; p.textContent = t; out.appendChild(p); return p; }
  function list(items){ var ul = document.createElement('ul'); items.forEach(function(i){ var li = document.createElement('li'); li.textContent = i; ul.appendChild(li); }); out.appendChild(ul); }

  if(!target || !walk){ para('Enter your target and your walk-away point to get a plan.', 'fine'); return; }
  var up = dir === 'up', bad = up ? walk > target : walk < target;
  if(bad){ para(up ? 'Your walk-away point is above your target. Your walk-away should be the lowest you\'d accept, below your target.' : 'Your walk-away point is below your target. When you\'re paying, your walk-away is the most you\'d pay, above your target.', 'fine'); return; }

  var gap = Math.abs(target - walk), anchor = up ? target + Math.max(gap * .5, target * .05) : Math.max(0, target - Math.max(gap * .5, target * .05));
  var f = function(v){ return money(Math.round(v)); };
  var stepTotal = Math.abs(anchor - target), steps = [.5, .3, .2].map(function(s, i, a){ var moved = a.slice(0, i + 1).reduce(function(x, y){ return x + y; }, 0) * stepTotal; return up ? anchor - moved : anchor + moved; });

  sec('1. Your numbers');
  list(['Opening offer: ' + f(anchor) + ' (ambitious, but have a reason ready)', 'Target: ' + f(target), 'Walk-away: ' + f(walk) + '. Decide now; don\'t change it in the room.']);
  if(theirs){
    var overlap = up ? theirs - walk : walk - theirs;
    para(overlap >= 0 ? 'Deal zone: there\'s about ' + f(overlap) + ' of overlap between their likely limit (' + f(theirs) + ') and your walk-away. A deal is possible.' : 'Warning: their likely limit (' + f(theirs) + ') is past your walk-away. On price alone there\'s no deal, so change the deal: terms, timing, scope or extras.');
  }
  sec('2. Your alternative (BATNA)');
  para(batna ? 'If this fails, you will: ' + batna + '. The better this is, the calmer you can be. Improve it before the conversation if you can.' : 'You haven\'t written one. This is your biggest weakness: without a real alternative, you can\'t walk away. Find one before you negotiate.');
  sec('3. Concessions, in shrinking steps');
  list(steps.map(function(s, i){ return 'Move ' + (i + 1) + ': ' + f(s) + (i === 2 ? ' (your target; stop here unless they trade something)' : ''); }));
  para('Never move twice in a row without them moving. Each step is smaller than the last, which signals you\'re near your limit.', 'fine');
  if(trade || ask){
    sec('4. Trade, don\'t give');
    if(trade) para('Cheap for you, valuable to them: ' + trade);
    if(ask) para('Ask for in return: ' + ask);
    para('Wording: "If you can do [their ask], I can do [your offer]."', 'fine');
  }
  var s = SCRIPTS[type] || SCRIPTS.other;
  var fill = function(t){ return t.replace('{anchor}', f(anchor)).replace('{target}', f(target)).replace('{walk}', f(walk)); };
  sec((trade || ask ? '5' : '4') + '. What to say');
  [['Opening', s.open], ['If they lowball you', s.low], ['Closing', s.close], ['Walking away', s.walk]].forEach(function(r){
    var p = document.createElement('p'); var b = document.createElement('strong'); b.textContent = r[0] + ': '; p.appendChild(b); p.appendChild(document.createTextNode('"' + fill(r[1]) + '"')); out.appendChild(p);
  });
  para('After you make an offer, stop talking. Silence is pressure on them, not you.', 'fine');
}
wire('f-neg', negPlan);
var dirSel = $('ng-dir');
var typeSel = $('ng-type');
if(typeSel && dirSel) typeSel.addEventListener('change', function(){
  var d = { salary: 'up', selling: 'up', buying: 'down', rent: 'down', supplier: 'down' }[this.value];
  if(d && dirSel.value !== d){ dirSel.value = d; dirSel.dispatchEvent(new Event('change', { bubbles: true })); }
});
if(dirSel) dirSel.addEventListener('change', function(){
  var lbl = $('ng-walk-label'); if(lbl) lbl.firstChild.nodeValue = this.value === 'up' ? 'Walk-away: the lowest you\'d accept ($)' : 'Walk-away: the most you\'d pay ($)';
});
})();

/* ================= INVESTOR PRESSURE DRILL ================= */
(function(){
  if(!document.getElementById('drill')) return;
  function $(id){ return document.getElementById(id); }
  var Q = [
    ['Numbers','What\'s your monthly revenue, and how fast is it growing?','Do you know your numbers, and is there momentum?','Exact number, growth rate, time period: "$4,200 last month, up 18% a month for four months."','Rounding up, or quoting a forecast as if it were real.'],
    ['Numbers','How much runway do you have?','When do you run out of money, and how desperate are you?','Months, then the plan: "Seven months at our current burn. This round takes us to 20 months and break-even."','Not knowing. Runway = cash ÷ monthly burn; know it cold.'],
    ['Numbers','What does it cost you to win a customer?','Can you grow without burning cash?','CAC, LTV and payback: "About $40 to win, worth $160 over a year, paid back in three months."','"We don\'t really track that yet."'],
    ['Market','How big is the market?','Can this become big enough to matter?','Build it bottom-up: number of real customers × what each pays per year.','"If we get just 1% of a $50 billion market…" Top-down guesses sound lazy.'],
    ['Competition','Who are your competitors?','Do you understand the alternatives, and why you win?','Name two or three, including "doing nothing", then one clear difference.','"We have no competition." Everyone does.'],
    ['Competition','What stops a big company from copying you?','What\'s your real edge?','Something specific: focus on a niche, speed, customer relationships, data, or know-how.','"They won\'t bother." Hope isn\'t a strategy.'],
    ['Team','Why are you the right person to build this?','Will you get through the hard parts?','One relevant experience plus one proof you get things done.','A generic list of strengths with no evidence.'],
    ['Team','What\'s the hardest thing you\'ve dealt with in this business so far?','How do you handle setbacks?','A short story: the problem, what you did, the result, what you learned.','Pretending nothing has gone wrong.'],
    ['Risk','What\'s the biggest risk to this business?','Are you honest and self-aware?','Name a real risk, then how you\'re testing or reducing it.','"There isn\'t really one."'],
    ['Risk','Why hasn\'t someone done this already?','Is there a hidden reason this fails?','What changed recently (why now), or what you know that others don\'t.','"Nobody thought of it." Usually someone did.'],
    ['Money','How much are you raising, and what will you do with it?','Have you planned how money becomes results?','Amount, two or three uses with rough shares, the milestone it reaches, and the runway it buys.','"We\'ll use it to grow." Too vague.'],
    ['Money','What valuation are you looking for?','Are you reasonable and informed?','A range with a reason (comparable companies, traction), or invite their view while stating your priorities.','A big number you can\'t explain.'],
    ['Customers','Why do customers choose you?','Is there real demand, in customers\' own words?','Quote a real customer and give one specific result they got.','Listing features instead of customer reasons.'],
    ['Customers','How many customers have left, and why?','Do people stay, and are you honest about churn?','The number, the main reason, and what you changed.','Hiding it. They\'ll find out in due diligence.'],
    ['Pressure','This seems like a small idea. Why should we care?','Can you think big and stay calm when challenged?','Agree it starts small, then show the path from this niche to a bigger market.','Getting defensive or overselling.'],
    ['Pressure','Your numbers look weak. Convince me.','Can you face facts without panicking?','Agree on the facts, show the trend or what you learned, and say what changes next.','Arguing with the data.'],
    ['Pressure','Other investors passed. Why?','Do you learn from feedback?','The honest reason, and what you changed because of it.','Blaming the investors.'],
    ['Plan','Where will you be in 18 months?','Is there a concrete plan?','Two or three measurable milestones: customers, revenue, a key hire or launch.','Vague dreams with no numbers.'],
    ['Plan','What happens if you don\'t raise this money?','Are you desperate, or do you have a plan B?','A real plan B: slower growth funded by revenue. It shows you\'re not desperate.','"We\'d have to shut down." It hands them all the power.'],
    ['Plan','Why now?','Is the timing right?','What changed in the world, technology or customer behaviour that makes this work now.','"Because I\'m ready." Investors care about the market\'s timing.']
  ];
  var cat = $('dr-cat'), time = $('dr-time'), qEl = $('dr-q'), chip = $('dr-chip'), clock = $('dr-clock'), reveal = $('dr-reveal');
  var startBtn = $('dr-start'), showBtn = $('dr-show'), nextBtn = $('dr-next');
  var tally = { nailed: 0, shaky: 0, again: 0 }, deck = [], cur = null, timer = null, left = 0;
  var cats = ['All'].concat(Q.map(function(q){ return q[0]; }).filter(function(c, i, a){ return a.indexOf(c) === i; }));
  cats.forEach(function(c){ var o = document.createElement('option'); o.value = c; o.textContent = c === 'All' ? 'All topics' : c; cat.appendChild(o); });
  function shuffle(a){ for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function build(){ deck = shuffle(Q.filter(function(q){ return cat.value === 'All' || q[0] === cat.value; }).slice()); }
  function stop(){ clearInterval(timer); timer = null; startBtn.textContent = 'Start timer'; }
  function fmt(s){ return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function next(){
    stop(); if(!deck.length) build();
    cur = deck.shift();
    chip.textContent = cur[0]; qEl.textContent = cur[1];
    left = parseInt(time.value, 10); clock.textContent = fmt(left); clock.className = 'dr-clock';
    reveal.hidden = true; showBtn.hidden = false;
  }
  startBtn.addEventListener('click', function(){
    if(timer){ stop(); return; }
    if(left <= 0) left = parseInt(time.value, 10);
    startBtn.textContent = 'Pause';
    timer = setInterval(function(){
      left--; clock.textContent = fmt(Math.max(0, left));
      if(left <= 10) clock.className = 'dr-clock low';
      if(left <= 0){ stop(); clock.textContent = 'Time\'s up'; showAnswer(); }
    }, 1000);
  });
  function showAnswer(){
    $('dr-real').textContent = cur[2]; $('dr-shape').textContent = cur[3]; $('dr-trap').textContent = cur[4];
    reveal.hidden = false; showBtn.hidden = true;
  }
  showBtn.addEventListener('click', function(){ stop(); showAnswer(); });
  nextBtn.addEventListener('click', next);
  cat.addEventListener('change', function(){ build(); next(); });
  time.addEventListener('change', function(){ stop(); left = parseInt(time.value, 10); clock.textContent = fmt(left); clock.className = 'dr-clock'; });
  Array.prototype.forEach.call(document.querySelectorAll('[data-rate]'), function(b){
    b.addEventListener('click', function(){
      var r = b.getAttribute('data-rate'); tally[r]++;
      if(r !== 'nailed' && cur) deck.splice(Math.min(deck.length, 3), 0, cur);
      $('dr-tally').textContent = 'This session: ' + tally.nailed + ' nailed · ' + tally.shaky + ' shaky · ' + tally.again + ' to practise again';
      next();
    });
  });
  build(); next();
})();

/* ---------- Tools page: search and topic filter ---------- */
(function(){
  var q = document.getElementById('tool-q'); if(!q) return;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.tool-card'));
  var btns = Array.prototype.slice.call(document.querySelectorAll('.tool-cat'));
  var none = document.getElementById('tool-none'), count = document.getElementById('tool-n'), cat = 'all';
  // Everyday words people search for, mapped to the words used on the cards.
  var ALSO = { price:'pricing', prices:'pricing', pitch:'investor', pitches:'investor', save:'savings', saving:'savings', spend:'spending', spending:'budget',
    ads:'ad', advert:'ad', customer:'customers', deal:'negotiation', deals:'negotiation', loan:'loan', debt:'card payoff', profit:'profit', startup:'startup', chatgpt:'ai', interest:'compound' };
  function words(s){ return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); }
  function apply(){
    var ws = words(q.value), shown = 0;
    cards.forEach(function(c){
      var text = c.textContent.toLowerCase();
      var okText = ws.every(function(w){ return text.indexOf(w) > -1 || (ALSO[w] && text.indexOf(ALSO[w]) > -1); });
      var ok = okText && (cat === 'all' || c.getAttribute('data-cat') === cat);
      c.hidden = !ok; if(ok) shown++;
    });
    none.hidden = shown > 0;
    count.textContent = (ws.length || cat !== 'all') ? 'Showing ' + shown + ' of ' + cards.length : '';
  }
  btns.forEach(function(b){ b.addEventListener('click', function(){
    cat = b.getAttribute('data-cat'); btns.forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); apply();
  }); });
  q.addEventListener('input', apply);
  apply();
})();
