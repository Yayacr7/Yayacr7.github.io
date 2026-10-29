/* Road to $1 million (free). Your age, what you have now and what you put in each week; Cherry works out when
   investing it could reach $10k, $100k and $1 million, in future dollars and in today's money, and the one change
   that gets you there sooner. Monthly compounding, fixed maths, no AI. Saved in this browser only. */
(function(){
"use strict";
var R = window.SharpRich, $ = R.$, el = R.el, money = R.money, KEY = 'sharp-million', INFL = .03;
// Starting numbers: a 15-year-old putting in $50 a week, or a 30-year-old putting in $100 (assets/who.js).
var s = R.load(KEY) || (window.SharpWho && window.SharpWho.isAdult() ? { age: 30, start: 0, week: 100, g: 7 } : { age: 15, start: 0, week: 50, g: 7 });
var MILES = [1e4, 1e5, 1e6];

// Month by month: add the weekly amount (as a monthly sum), grow at g a year. Stops at endAge.
function grow(age, start, week, g, endAge){
  var rm = Math.pow(1 + g / 100, 1 / 12) - 1, add = week * 52 / 12, bal = start, put = start, months = Math.max(0, Math.round((endAge - age) * 12));
  var hit = {}, years = [bal];
  MILES.forEach(function(t){ if(bal >= t) hit[t] = age; });
  for(var m = 1; m <= months; m++){
    bal = bal * (1 + rm) + add; put += add;
    MILES.forEach(function(t){ if(hit[t] == null && bal >= t) hit[t] = age + m / 12; });
    if(m % 12 === 0 || m === months) years.push(bal);
  }
  return { end: bal, put: put, grew: bal - put, years: years, hit: hit };
}
function endAge(){ return Math.max(65, Math.ceil(s.age) + 10); }
function ageText(a){ var y = Math.floor(a + 1e-9), m = Math.round((a - y) * 12); return m >= 12 ? String(y + 1) : m ? y + ' and ' + R.plural(m, 'month') : String(y); }
function today(v, years){ return v / Math.pow(1 + INFL, years); }
// The smallest weekly amount (to the dollar) that reaches $1 million by the end age.
function weeklyFor(target){
  var lo = 0, hi = 5000;
  if(grow(s.age, s.start, hi, s.g, endAge()).end < target) return Infinity;
  for(var k = 0; k < 40; k++){ var mid = (lo + hi) / 2; if(grow(s.age, s.start, mid, s.g, endAge()).end >= target) hi = mid; else lo = mid; }
  return Math.ceil(hi);
}

function read(){
  s.age = Math.round(R.num('mm-age', 8, 75, 15)); s.start = R.num('mm-start', 0, 1e7, 0);
  s.week = R.num('mm-week', 0, 1e5, 0); s.g = R.num('mm-g', 0, 15, 7);
  R.save(KEY, s); render();
}
function fill(){ $('mm-age').value = s.age; $('mm-start').value = s.start; $('mm-week').value = s.week; $('mm-g').value = s.g; }

function take(r){
  var end = endAge(), yrs = end - s.age, moves = [];
  var hit = r.hit[1e6], st = hit != null ? 'good' : r.hit[1e5] != null ? 'warn' : 'bad';
  var head = s.week <= 0 && s.start <= 0 ? 'Start with something. Even $5 a week.'
    : hit != null ? 'Yes. About $1 million by age ' + ageText(hit) + '.'
    : 'Not by ' + end + ' at this pace: about ' + money(r.end) + '.';
  var body = s.week <= 0 && s.start <= 0 ? 'Nothing grows from zero. Pick an amount you can keep up every week, then raise it every time you earn more.'
    : 'You\'d put in ' + money(r.put) + '. Growth adds ' + money(r.grew) + '. That\'s compounding: your growth starts growing too, so the last years add the most.';
  // The one change that matters most: put in a little more, and don't wait.
  if(s.week > 0 || s.start > 0){
    var more = grow(s.age, s.start, s.week + 10, s.g, end);
    if(hit != null && more.hit[1e6] != null && hit - more.hit[1e6] >= 1) moves.push(['Add $10 a week', 'You\'d reach $1 million ' + R.plural(Math.round(hit - more.hit[1e6]), 'year') + ' sooner, at ' + ageText(more.hit[1e6]) + '.']);
    else if(hit == null && more.hit[1e6] != null) moves.push(['Add $10 a week', 'That alone gets you to $1 million, at about ' + ageText(more.hit[1e6]) + '.']);
    else moves.push(['Add $10 a week', 'You\'d have ' + money(more.end - r.end) + ' more at ' + end + '.']);
    var late = grow(s.age + 5, s.start, s.week, s.g, end);
    moves.push(['Don\'t wait 5 years', 'Starting at ' + (s.age + 5) + ' instead of now leaves you with ' + money(r.end - late.end) + ' less at ' + end + '. The early years matter most.']);
  }
  if(hit == null){
    var need = weeklyFor(1e6);
    moves.push(['What $1 million takes', isFinite(need) ? 'About ' + money(need) + ' a week from now until ' + end + ' at ' + s.g + '% a year. Start with what you can and raise it as you earn more.' : 'More than this planner can show. Grow your income first.']);
  }
  moves.push(['Earn more, then keep more', 'The amount you put in is the part you control. A business that earns an extra $100 a month lets you invest $23 more a week.']);
  return { head: head, body: body, st: st, moves: moves, yrs: yrs };
}

function render(){
  var end = endAge(), r = grow(s.age, s.start, s.week, s.g, end), t = take(r);
  $('mm-head').textContent = t.head; $('mm-body').textContent = t.body;
  var ic = $('mm-st'); ic.className = 'sc-ic ' + t.st; ic.textContent = t.st === 'good' ? '✓' : t.st === 'warn' ? '!' : '✕';
  $('mm-stw').textContent = t.st === 'good' ? 'On track' : t.st === 'warn' ? 'Close' : 'Not yet';
  $('mm-end-l').textContent = 'At ' + end; $('mm-end').textContent = R.short(r.end);
  $('mm-mil').textContent = r.hit[1e6] != null ? 'Age ' + Math.floor(r.hit[1e6] + 1e-9) : 'Not by ' + end;
  $('mm-put').textContent = R.short(r.put); $('mm-grew').textContent = R.short(r.grew);
  $('mm-today').textContent = 'In today\'s money that ' + money(r.end) + ' is worth about ' + money(today(r.end, t.yrs)) + ', if prices rise about 3% a year. Growth of ' + s.g + '% a year is a planning guess, never a promise.';
  var ml = $('mm-miles'); ml.textContent = '';
  MILES.forEach(function(m){
    var a = r.hit[m], li = el('li', a != null ? 'good' : 'bad', null, ml);
    el('i', 'sc-ic ' + (a != null ? 'good' : 'bad'), a != null ? '✓' : '✕', li).setAttribute('aria-hidden', 'true');
    el('b', null, R.short(m), li); el('span', null, a != null ? (a <= s.age ? 'Already there' : 'at age ' + ageText(a)) : 'not by ' + end, li);
  });
  var mv = $('mm-moves'); mv.textContent = '';
  t.moves.forEach(function(m){ var li = el('li', null, null, mv); el('b', null, m[0], li); el('span', null, m[1], li); });
  // One candle per year, or per few years when the road is long, so it stays readable on a phone.
  var yrs = r.years, per = Math.max(1, Math.ceil((yrs.length - 1) / (innerWidth < 640 ? 14 : 26))), C = [];
  for(var i = per; i < yrs.length + per - 1; i += per){
    var a = i - per, b = Math.min(i, yrs.length - 1), age = Math.round(s.age + b);
    C.push({ open: yrs[a], close: yrs[b], label: String(age), title: 'Age ' + age + ': ' + money(yrs[b]) + ' (' + money(today(yrs[b], b)) + ' in today\'s money)' });
    if(b === yrs.length - 1) break;
  }
  var top = Math.max.apply(null, yrs), lines = [];
  MILES.forEach(function(m){ if(m <= top * 1.25 && m >= top * .08) lines.push({ v: m, text: R.short(m) }); });
  R.chart($('mm-chart'), { candles: C, lines: lines, head: ['+' + R.short(r.grew) + ' growth', 'by age ' + end], minCols: 6 });
  var tr = R.tracker(); $('mm-mine').hidden = !(tr.months.length && tr.keptWeek > 0);
  if(tr.months.length) $('mm-mine').textContent = 'Use my Wealth tracker: ' + money(tr.keptWeek) + ' a week';
}

['mm-age', 'mm-start', 'mm-week', 'mm-g'].forEach(function(id){ $(id).addEventListener('input', read); });
$('mm-mine').addEventListener('click', function(){ var tr = R.tracker(); s.week = Math.round(tr.keptWeek); if(tr.worth > 0) s.start = Math.round(tr.worth); fill(); R.save(KEY, s); render(); R.pop($('mm-end'), { n: 8 }); });
fill(); render();
var rt; addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(render, 150); });
})();
