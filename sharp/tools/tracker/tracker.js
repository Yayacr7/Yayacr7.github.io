/* Wealth tracker (free). Once a month: what you earned, saved and invested, and what it's all worth now. Cherry shows
   how much you kept, your worth month by month on a trading-style chart, and the next milestone. Fixed rules, no AI.
   Saved in this browser only (localStorage 'sharp-wealth'). Visitor text: textContent only. */
(function(){
"use strict";
var R = window.SharpRich, $ = R.$, el = R.el, money = R.money, KEY = 'sharp-wealth';
var MILES = [1000, 10000, 100000, 1000000];
var NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var d = R.load(KEY) || { months: [] }; if(!Array.isArray(d.months)) d.months = [];
function sorted(){ return d.months.slice().sort(function(a, b){ return a.m < b.m ? -1 : 1; }); }
function label(m, short){ var p = m.split('-'), n = NAMES[+p[1] - 1] || ''; return short ? n.slice(0, 3) + (p[1] === '01' ? ' ' + p[0].slice(2) : '') : n + ' ' + p[0]; }
function kept(x){ return (+x.s || 0) + (+x.i || 0); }
function rate(x){ return +x.e > 0 ? kept(x) / x.e : null; }
function next(w){ for(var i = 0; i < MILES.length; i++) if(w < MILES[i]) return MILES[i]; return null; }

// The last 24 months to choose from, newest first.
(function(){
  var sel = $('wt-m'), now = new Date(), y = now.getFullYear(), m = now.getMonth();
  for(var i = 0; i < 24; i++){ var v = y + '-' + String(m + 1).padStart(2, '0'), o = el('option', null, label(v), sel); o.value = v; if(--m < 0){ m = 11; y--; } }
})();

function take(M){
  if(!M.length) return { st: 'warn', head: 'Log your first month.', body: 'Write down what you earned, saved and invested this month. One minute a month. Cherry shows your real progress and keeps you honest.' };
  var last = M[M.length - 1], r = rate(last), w = +last.w || 0, nx = next(w), avg = 0;
  M.forEach(function(x){ avg += kept(x); }); avg /= M.length;
  var to = nx && avg > 0 ? Math.ceil((nx - w) / avg) : null;
  var after = nx ? (to ? ' Next milestone: ' + money(nx) + ', about ' + R.plural(to, 'month') + ' at your pace.' : ' Next milestone: ' + money(nx) + '.') : ' You\'re past $1 million. Keep going.';
  if(r == null) return { st: kept(last) > 0 ? 'good' : 'warn', head: 'You\'re worth ' + money(w) + '.', body: 'No earnings logged for ' + label(last.m) + '.' + after };
  var pct = Math.round(r * 100), gap = Math.max(0, Math.ceil(last.e * .2 - kept(last)));
  if(r >= .2) return { st: 'good', head: 'You kept ' + pct + '% in ' + label(last.m) + '. That\'s the habit that builds wealth.', body: 'Keep 20% or more of what you earn, month after month. Over years, that is what builds real savings.' + after };
  if(r >= .1) return { st: 'warn', head: 'You kept ' + pct + '%. Aim for 20%.', body: 'That\'s ' + money(gap) + ' more a month. Move it to savings on the day you get paid, before you spend anything.' + after };
  return { st: 'bad', head: (pct > 0 ? 'You kept only ' + pct + '%.' : 'You kept nothing this month.') + ' Fix this first.', body: 'Earning more won\'t make you rich if it all gets spent. Start with 10% of every payment, then work up to 20%: that\'s ' + money(gap) + ' a month.' + after };
}

function render(){
  var M = sorted(), t = take(M), last = M[M.length - 1];
  $('wt-head').textContent = t.head; $('wt-body').textContent = t.body;
  var ic = $('wt-st'); ic.className = 'sc-ic ' + t.st; ic.textContent = t.st === 'good' ? '✓' : t.st === 'warn' ? '!' : '✕';
  $('wt-stw').textContent = !M.length ? 'Start' : t.st === 'good' ? 'Growing' : t.st === 'warn' ? 'Improve' : 'Fix first';
  var tr = R.tracker();
  $('wt-s1').textContent = money(tr.worth);
  $('wt-s2').textContent = last && rate(last) != null ? Math.round(rate(last) * 100) + '%' : '–';
  $('wt-s3').textContent = M.length ? money(tr.kept / M.length) : '$0';
  $('wt-s4').textContent = M.length;
  var C = M.map(function(x, i){
    var open = i ? +M[i - 1].w || 0 : Math.max(0, (+x.w || 0) - kept(x));
    return { open: open, close: +x.w || 0, label: label(x.m, true), title: label(x.m) + ': worth ' + money(+x.w || 0) + ', earned ' + money(+x.e || 0) + ', kept ' + money(kept(x)) };
  });
  var w = tr.worth, nx = next(w), lines = nx && nx <= Math.max(w, 1) * 3 ? [{ v: nx, text: R.short(nx) }] : [];
  var grew = C.length ? C[C.length - 1].close - C[0].open : 0;
  R.chart($('wt-chart'), { candles: C, lines: lines, minCols: 6, head: C.length ? [(grew >= 0 ? '+' : '') + R.short(grew), 'since ' + label(M[0].m), grew >= 0 ? 'pos' : 'neg'] : ['$0', 'log a month to start'] });
  var ul = $('wt-logs'); ul.textContent = '';
  M.slice().reverse().forEach(function(x){
    var r = rate(x), li = el('li', r == null ? '' : r >= .2 ? 'good' : r >= .1 ? 'warn' : 'bad', null, ul);
    el('b', null, label(x.m), li);
    el('span', null, 'Earned ' + money(+x.e || 0) + ' · kept ' + money(kept(x)) + (r != null ? ' (' + Math.round(r * 100) + '%)' : '') + ' · worth ' + money(+x.w || 0), li);
  });
  $('wt-empty').hidden = M.length > 0; $('wt-undo').hidden = !M.length;
  $('wt-road').hidden = !M.length;
}

$('wt-form').addEventListener('submit', function(e){
  e.preventDefault();
  var m = $('wt-m').value, E = R.num('wt-e', 0, 1e8, 0), S = R.num('wt-s', 0, 1e8, 0), I = R.num('wt-i', 0, 1e8, 0);
  var rawW = String($('wt-w').value).trim(), W = rawW ? R.num('wt-w', -1e9, 1e10, NaN) : NaN;
  if(!E && !S && !I && !rawW){ $('wt-msg').textContent = 'Type at least one number, like what you earned this month.'; return; }
  $('wt-msg').textContent = '';
  var before = R.tracker().worth, M = sorted().filter(function(x){ return x.m !== m; });
  var prev = M.filter(function(x){ return x.m < m; }).pop();
  if(!isFinite(W)) W = (prev ? +prev.w || 0 : 0) + S + I;   // no worth typed: last month's worth plus what you kept
  d.months = M.concat([{ m: m, e: E, s: S, i: I, w: W }]); R.save(KEY, d);
  ['wt-e', 'wt-s', 'wt-i', 'wt-w'].forEach(function(id){ $(id).value = ''; });
  render(); $('wt-head').focus();
  var now = R.tracker().worth, crossed = MILES.filter(function(x){ return before < x && now >= x; }).pop(), r = E > 0 ? (S + I) / E : null;
  if(crossed) R.pop($('wt-s1'), { n: 18, big: true, say: 'You passed ' + money(crossed) + '! Cherry on top.' });
  else if(r != null && r >= .2) R.pop($('wt-s2'), { n: 10, say: 'Kept ' + Math.round(r * 100) + '%. Cherry on top!' });
});
$('wt-undo').addEventListener('click', function(){ var M = sorted(); M.pop(); d.months = M; R.save(KEY, d); render(); });
$('wt-reset').addEventListener('click', function(){ if(confirm('Start over? Every month you logged will be cleared from this device.')){ d = { months: [] }; try{ localStorage.removeItem(KEY); }catch(e){} render(); } });
render();
var rt; addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(render, 150); });
})();
