/* Is it worth it? (free). Before you buy something, Cherry shows what it really costs: the hours of work it takes (at
   the pay from your First $100 Plan, or the pay you type), what the money could grow to if you invested it instead
   (an estimate: 7% a year, never a promise), and her verdict from three quick questions. A 48-hour wait list counts
   the money you keep by skipping things. Fixed maths, no AI. Saved in this browser only ('sharp-worth').
   Visitor text (the item's name): textContent only. */
(function(){
"use strict";
var R = window.SharpRich, $ = R.$, el = R.el, money = R.money, KEY = 'sharp-worth', G = 7, WAIT = 48 * 36e5, CARD = 24;
var ADULT = !!(window.SharpWho && window.SharpWho.isAdult());
var BIZ = window.SharpBiz ? window.SharpBiz.all(window.SharpBiz.who()) : {};
var PER = { once: 0, week: 52, month: 12 }, UNIT = { week: 'week', month: 'month' };
var d = R.load(KEY) || {};
var s = d.s && typeof d.s === 'object' ? d.s : (ADULT ? { what: 'New phone', price: 800, often: 'once', years: 10 } : { what: 'New sneakers', price: 180, often: 'once', years: 10 });
s.a = s.a && typeof s.a === 'object' ? s.a : {};
var list = Array.isArray(d.list) ? d.list.filter(function(x){ return x && +x.p > 0; }).slice(-20) : [];
var kept = +d.kept || 0, skipped = +d.skipped || 0;
function save(){ R.save(KEY, { s: s, list: list, kept: kept, skipped: skipped }); }

// Pay an hour from the First $100 Plan: (price - costs) / hours a job. Null when there's no plan with a profit.
function planPay(){
  var f = R.firstPlan(), k = f && BIZ[f.skill];
  if(!k || !(+f.price > +f.cost) || !(k.hrs > 0)) return null;
  return { hour: (f.price - f.cost) / k.hrs, job: f.price - f.cost, k: k, price: +f.price, cost: +f.cost };
}
var PP = planPay();
if(!(s.pay > 0)){ s.pay = PP ? Math.round(PP.hour * 100) / 100 : ADULT ? 20 : 15; s.payFrom = PP ? 'plan' : 'guess'; }

function grow(price, often, years){
  var rm = Math.pow(1 + G / 100, 1 / 12) - 1, add = often === 'once' ? 0 : price * PER[often] / 12, bal = often === 'once' ? price : 0, put = bal, ys = [bal];
  for(var m = 1; m <= years * 12; m++){ bal = bal * (1 + rm) + add; put += add; if(m % 12 === 0) ys.push(bal); }
  return { end: bal, put: put, years: ys };
}
// A credit card at CARD% a year, paying a fixed amount each month: how long it takes and the interest it adds.
function card(B, P){
  var r = CARD / 100 / 12, n = 0, paid = 0, start = B;
  if(P <= B * r) return null;
  while(B > .005 && n < 600){ B *= 1 + r; var p = Math.min(P, B); B -= p; paid += p; n++; }
  return { months: n, extra: paid - start };
}
function hoursText(h){
  if(h < 1) return R.plural(Math.max(1, Math.round(h * 60)), 'minute');
  var v = h < 10 ? Math.round(h * 2) / 2 : Math.round(h);
  return v.toLocaleString('en-US') + (v === 1 ? ' hour' : ' hours');
}
function name(){ return (s.what || '').trim() || 'it'; }

function costs(){
  var rec = s.often !== 'once', year = rec ? s.price * PER[s.often] : s.price, base = year;
  var h = s.pay > 0 ? base / s.pay : Infinity, g = grow(s.price, s.often, s.years);
  var jobs = s.payFrom === 'plan' && PP && Math.abs(PP.hour - s.pay) < .01 ? Math.ceil(base / PP.job - 1e-9) : 0;
  return { rec: rec, year: year, hours: h, g: g, jobs: jobs };
}

function verdict(c){
  var a = s.a, h = c.hours;
  if(!(s.price > 0)) return { st: '', word: 'Waiting', head: 'Type a price to see what it really costs.' };
  if(a.still === 'no') return { st: 'bad', word: 'Skip it', head: 'Skip it. If you won\'t want it in 48 hours, you don\'t want it now.' };
  if(a.have === 'yes' && a.use !== 'yes') return { st: 'bad', word: 'Skip it', head: 'Skip it. You already have something that does the job.' };
  if(a.use === 'no') return h <= 1 ? { st: 'warn', word: 'Wait', head: 'It\'s small, but you won\'t use it much. Is it worth ' + hoursText(h) + ' of work?' }
    : { st: 'bad', word: 'Skip it', head: 'Skip it. You won\'t use it enough to be worth ' + hoursText(h) + ' of work.' };
  if(a.have === 'yes') return { st: 'warn', word: 'Wait', head: 'Only if it\'s a real upgrade. You already have something that does the job.' };
  if(a.use === 'yes' && a.have === 'no' && a.still === 'yes')
    return { st: 'good', word: 'Go ahead', head: h > 40 ? 'Go for it, with money you\'ve saved up. You\'ve thought it through.' : 'Go for it. You\'ve thought it through.' };
  if(c.rec) return { st: 'warn', word: 'Check it', head: 'Check you\'ll use it. It\'s ' + money(c.year) + ' a year.' };
  if(h <= 2) return { st: 'good', word: 'Go ahead', head: 'Small enough. Buy it if you really want it.' };
  if(h <= 20) return { st: 'warn', word: 'Wait', head: 'Wait 48 hours, then decide.' };
  return { st: 'warn', word: 'Wait', head: 'That\'s a big one. Wait 48 hours and save up for it first.' };
}

function render(){
  var c = costs(), v = verdict(c), h = c.hours;
  var ic = $('wi-st'); ic.className = 'sc-ic ' + (v.st || 'wait'); ic.textContent = v.st === 'good' ? '✓' : v.st === 'warn' ? '!' : v.st === 'bad' ? '✕' : '…';
  $('wi-stw').textContent = v.word; $('wi-head').textContent = v.head;
  $('wi-head').parentNode.parentNode.className = 'f1-top' + (v.st === 'bad' || v.st === 'warn' ? ' t-' + v.st : v.st ? '' : ' t-wait');
  var body = '';
  if(s.price > 0){
    body = (c.rec ? 'At ' + money(s.price) + ' a ' + UNIT[s.often] + ', that\'s ' + money(c.year) + ' a year: about ' : 'That\'s about ')
      + hoursText(h) + ' of work at ' + money(s.pay) + ' an hour' + (c.jobs ? ' (' + R.plural(c.jobs, PP.k.biz + ' job') + ')' : '') + '. '
      + 'Invested instead, ' + (c.rec ? 'that money' : 'the ' + money(s.price)) + ' could be about ' + money(c.g.end) + ' in ' + R.plural(s.years, 'year') + ', if it grows ' + G + '% a year (an estimate, never a promise).';
  }
  $('wi-body').textContent = body;
  // The numbers.
  $('wi-h').textContent = s.price > 0 ? hoursText(h) : '–';
  $('wi-h-l').textContent = c.rec ? 'Work a year' : 'Hours of work';
  $('wi-2-l').textContent = c.rec ? 'Costs a year' : c.jobs ? 'Jobs to pay for it' : 'Your pay';
  $('wi-2').textContent = c.rec ? money(c.year) : c.jobs ? String(c.jobs) : money(s.pay) + '/hr';
  $('wi-3-l').textContent = 'Invested, in ' + s.years + ' yrs'; $('wi-3').textContent = s.price > 0 ? R.short(c.g.end) : '–';
  $('wi-4').textContent = s.price > 0 ? R.short(c.g.end - c.g.put) : '–';
  blocks(h);
  // What the money could grow to, year by year, on the same trading-style chart as the other money tools.
  var ys = c.g.years, C = [];
  for(var i = 1; i < ys.length; i++) C.push({ open: 0, close: ys[i], label: 'Y' + i, title: 'After ' + R.plural(i, 'year') + ': about ' + money(ys[i]) + ' if it grows ' + G + '% a year' });
  R.chart($('wi-chart'), { candles: s.price > 0 ? C : [], lines: c.rec ? [] : [{ v: s.price, text: R.short(s.price) }], floor: 1, minCols: 5,
    head: s.price > 0 ? ['+' + R.short(c.g.end - c.g.put) + ' growth', 'in ' + R.plural(s.years, 'year')] : null });
  $('wi-pay-note').textContent = s.payFrom === 'plan' && PP ? 'From your First $100 Plan: ' + money(PP.price) + ' a job minus ' + money(PP.cost) + ' costs, about ' + hoursText(PP.k.hrs) + ' a job.'
    : 'A guess. Change it to what you really earn an hour, after costs.';
  $('wi-mine').hidden = !(PP && s.payFrom !== 'plan');
  moves(c, v);
  waitList();
  ['use', 'have', 'still'].forEach(function(q){
    [].forEach.call(document.querySelectorAll('[data-q="' + q + '"]'), function(b){ b.setAttribute('aria-pressed', s.a[q] === b.getAttribute('data-v') ? 'true' : 'false'); });
  });
}

// One block per hour of work, or per 8-hour day when it's a lot, so the cost is something you can see.
function blocks(h){
  var box = $('wi-blocks'), note = $('wi-blocks-n'); box.textContent = '';
  if(!(s.price > 0) || !isFinite(h)){ note.textContent = ''; return; }
  var day = h > 48, n = day ? h / 8 : h, show = Math.min(60, Math.ceil(n - 1e-9));
  for(var i = 0; i < show; i++){ var b = el('i', null, null, box); if(i === show - 1 && n % 1 > 1e-9) b.style.setProperty('--f', (n % 1).toFixed(2)); }
  note.textContent = (day ? 'Each block is one 8-hour day of work.' : 'Each block is one hour of work.') + (n > 60 ? ' Showing 60 of ' + Math.ceil(n) + '.' : '');
}

function moves(c, v){
  var ol = $('wi-moves'), out = []; ol.textContent = '';
  if(!(s.price > 0)) return;
  var ready = new Date(Date.now() + WAIT).toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
  if(v.st !== 'good') out.push(['Wait 48 hours', 'Add it to your wait list below. If you still want it on ' + ready + ', it\'s probably a real want, not an impulse.']);
  if(c.rec){
    out.push(['Use it or cancel it', 'If you haven\'t used it in the last 2 weeks, cancel it today. You can always sign up again later.']);
    out.push(['Invest it instead', 'Putting ' + money(s.price) + ' a ' + UNIT[s.often] + ' into an index fund instead could be about ' + money(c.g.end) + ' in ' + R.plural(s.years, 'year') + ', if it grows ' + G + '% a year. Not a promise: some years it falls.']);
  } else {
    if(s.price >= 30){
      var w = Math.max(5, Math.ceil(s.price / 8 / 5) * 5), n = Math.ceil(s.price / w - 1e-9);
      out.push(['Save up first', 'Put ' + money(w) + ' a week aside and you\'ll have it in ' + R.plural(n, 'week') + '. Paying with saved money means no interest and no fees.']);
    }
    if(ADULT && s.price >= 200){
      var p = Math.max(25, Math.ceil(s.price * .05 / 5) * 5), k = card(s.price, p);
      if(k) out.push(['Not on a card you can\'t clear', 'On a credit card at ' + CARD + '% a year (a common rate), paying ' + money(p) + ' a month, it would take about ' + R.plural(k.months, 'month') + ' and cost about ' + money(k.extra) + ' extra in interest.']);
    } else if(!ADULT && s.price >= 50){
      out.push(['Careful with "pay later"', '"Buy now, pay later" splits it into smaller payments, but it\'s still ' + money(s.price) + ', and a missed payment can add late fees. Save first, then buy.']);
    }
  }
  if(c.jobs) out.push(['Earn it first', 'That\'s ' + R.plural(c.jobs, PP.k.biz + ' job') + '. Book them this week and pay for it with your profit, not your savings.']);
  else out.push(['Earn it first', 'A small business pays for the things you want. The First $100 Plan shows what to do, what to charge and what to say.']);
  out.forEach(function(m){ var li = el('li', null, null, ol); el('b', null, m[0], li); el('span', null, m[1], li); });
}

// The 48-hour wait list: add it now, decide later. Skipping counts the money you kept (a subscription counts one year).
function waitList(){
  var ul = $('wi-list'); ul.textContent = '';
  $('wi-kept').textContent = money(kept); $('wi-kept-n').textContent = skipped ? 'by skipping ' + R.plural(skipped, 'thing') : 'so far. Skip something on your list to start counting.';
  $('wi-empty').hidden = list.length > 0;
  list.forEach(function(x, i){
    var li = el('li', null, null, ul), left = x.at + WAIT - Date.now(), top = el('div', null, null, li);
    el('b', null, (x.n || 'Something') + ' · ' + money(x.p) + (x.f !== 'once' && UNIT[x.f] ? ' a ' + UNIT[x.f] : ''), top);
    el('span', null, left > 0 ? 'Decide after ' + new Date(x.at + WAIT).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ' (' + hoursText(left / 36e5) + ' to go)' : 'Ready. Do you still want it?', top);
    var row = el('div', 'wi-lact', null, li);
    var buy = el('button', 'btn ghost sm', 'Still want it', row), skip = el('button', 'btn sm', 'Skip it', row);
    buy.type = skip.type = 'button';
    buy.setAttribute('aria-label', 'Still want ' + (x.n || 'it') + ': take it off the list');
    skip.setAttribute('aria-label', 'Skip ' + (x.n || 'it') + ' and count the money as kept');
    buy.addEventListener('click', function(){ list.splice(i, 1); save(); say('Off the list. Buy it with money you\'ve saved.'); render(); });
    skip.addEventListener('click', function(){
      var v = x.f !== 'once' && PER[x.f] ? x.p * PER[x.f] : x.p;
      list.splice(i, 1); kept += v; skipped++; save(); render();
      say('Kept ' + money(v) + '. Put it in savings now, so it really stays kept.');
      R.pop($('wi-kept'), { n: 8, say: '+' + money(v) + ' kept' });
    });
  });
}
function say(t){ $('wi-msg').textContent = t; }

function read(){
  s.what = $('wi-what').value.slice(0, 40); s.price = R.num('wi-price', 0, 1e6, 0);
  s.often = PER.hasOwnProperty($('wi-often').value) ? $('wi-often').value : 'once';
  s.years = [5, 10, 20, 30, 40].indexOf(+$('wi-years').value) >= 0 ? +$('wi-years').value : 10;
  save(); render();
}
function fill(){ $('wi-what').value = s.what || ''; $('wi-price').value = s.price || ''; $('wi-often').value = s.often; $('wi-pay').value = s.pay; $('wi-years').value = String(s.years); }
['wi-what', 'wi-price'].forEach(function(id){ $(id).addEventListener('input', read); });
['wi-often', 'wi-years'].forEach(function(id){ $(id).addEventListener('change', read); });
$('wi-pay').addEventListener('input', function(){ var p = R.num('wi-pay', 0, 10000, 0); if(p > 0){ s.pay = p; s.payFrom = 'you'; save(); render(); } });
$('wi-mine').addEventListener('click', function(){ PP = planPay(); if(!PP) return; s.pay = Math.round(PP.hour * 100) / 100; s.payFrom = 'plan'; fill(); save(); render(); });
[].forEach.call(document.querySelectorAll('[data-q]'), function(b){
  b.addEventListener('click', function(){ var q = b.getAttribute('data-q'), v = b.getAttribute('data-v'); s.a[q] = s.a[q] === v ? '' : v; save(); render(); });
});
$('wi-add').addEventListener('click', function(){
  read();
  if(!(s.price > 0)){ say('Type a price first.'); $('wi-price').focus(); return; }
  list.push({ n: name() === 'it' ? 'Something' : name(), p: s.price, f: s.often, at: Date.now() }); if(list.length > 20) list.shift();
  s.a = {}; save(); render();
  say('Added. Decide after ' + new Date(Date.now() + WAIT).toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' }) + '.');
});
fill(); render();
var rt; addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(render, 150); });
// The wait list counts down: refresh it once a minute while the page is open.
setInterval(waitList, 60000);
// For tests: the same maths, without the page.
window.SharpWorth = { grow: grow, card: card, hoursText: hoursText };
})();
