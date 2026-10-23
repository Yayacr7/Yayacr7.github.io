/* First $100 Plan (free). Pick a starter business, your free hours and a goal. Danny Dan works out the price
   maths, how many jobs and weeks it takes, gives a 30-day checklist and the exact message to send, then tracks
   the money you really earn on a trading-style chart. Fixed rules, no AI. Everything stays in this browser
   (localStorage). Visitor text: textContent only. */
(function(){
"use strict";
var KEY = 'sharp-first100';
// price, cost and hours are per job. lo/hi = a fair price range for a teen starting out (US, 2026).
var SKILLS = {
  lawn:   { name: 'Lawn and yard care', job: 'mow and edge a front and back yard', price: 25, cost: 2, hrs: 1.5, lo: 20, hi: 40, who: 'neighbours with big yards, older neighbours and busy families', tip: 'Offer every-week mowing. One regular customer is worth ten one-offs.' },
  pets:   { name: 'Dog walking and pet sitting', job: 'a 30-minute dog walk', price: 15, cost: 0, hrs: .75, lo: 10, hi: 20, who: 'dog owners who work all day, and families going away', tip: 'Ask to meet the dog first, free. Owners book people their dog already likes.' },
  car:    { name: 'Car washing', job: 'wash and dry a car, and clean the inside', price: 20, cost: 3, hrs: 1, lo: 15, hi: 35, who: 'neighbours, family friends and people who drive for work', tip: 'Before-and-after photos sell this. Take them every time (with permission).' },
  tutor:  { name: 'Tutoring younger kids', job: 'a 1-hour homework or reading session', price: 15, cost: 0, hrs: 1, lo: 12, hi: 25, who: 'parents of younger kids at your school or in your area', tip: 'Tell parents one thing their child got better at after each session.' },
  bake:   { name: 'Baked goods', job: 'a box of a dozen cookies', price: 12, cost: 4, hrs: 1.5, lo: 10, hi: 18, who: 'family friends, neighbours and people planning parties', tip: 'Take orders first, then bake. You never waste ingredients that way.' },
  tech:   { name: 'Phone and tech help', job: 'set up a phone, tablet or TV and show how it works', price: 20, cost: 0, hrs: 1, lo: 15, hi: 30, who: 'grandparents, older neighbours and busy parents', tip: 'Leave a short written how-to behind. People call back the helper who did that.' },
  resell: { name: 'Reselling (buy low, sell higher)', job: 'one item bought cheap, cleaned up and sold', price: 25, cost: 10, hrs: 1, lo: 15, hi: 40, who: 'buyers on local selling apps and at school (with a parent\'s okay)', tip: 'Only buy things you have already seen sell for at least double.' },
  sitter: { name: 'Babysitting', job: 'a 3-hour evening of babysitting', price: 45, cost: 0, hrs: 3, lo: 36, hi: 60, who: 'families you or your parents already know', tip: 'A first-aid course makes parents say yes faster, and lets you charge more.' },
  social: { name: 'Social posts for local shops', job: 'a pack of 8 photos and posts for a shop\'s page', price: 40, cost: 0, hrs: 3, lo: 30, hi: 75, who: 'small local shops, cafés and salons with quiet social pages', tip: 'Make one free sample post for the shop first. Showing beats telling.' }
};
var STEPS = [
  ['Week 1 · Get ready', [
    'Ask a parent or guardian first. Agree where you can work and who you work for.',
    'Write your offer in one line: what you do and the price (use Danny\'s line below).',
    'Send your message to 10 people you or your family already know.'
  ]],
  ['Week 2 · First jobs', [
    'Do your first job. Turn up early and finish what you promised.',
    'Ask your customer: "Could you tell one friend about me?"',
    'Log every dollar you earn here the same day.'
  ]],
  ['Week 3 · Grow', [
    'Offer repeat customers the same day every week.',
    'If you\'re fully booked, raise your price by $2 to $5 for new customers.',
    'Ask one happy customer for a short review you can show others.'
  ]],
  ['Week 4 · Hit your goal', [
    'Put at least 20% of what you earned into savings before you spend any.',
    'Count it up. Look at what worked and what didn\'t.',
    'Pick your next goal, or try a second skill.'
  ]]
];
var s = load() || { skill: 'lawn', price: 25, cost: 2, hours: 4, goal: 100, name: '', area: '', done: [], logs: [] };
function $(id){ return document.getElementById(id); }
function el(tag, cls, text, parent){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; if(parent) parent.appendChild(e); return e; }
function money(v){ return '$' + (Math.round(v * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function load(){ try{ return JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){ return null; } }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){} }
function num(id, min, max){ var v = parseFloat(String($(id).value).replace(/[$,]/g, '')); return isFinite(v) ? Math.max(min, Math.min(max, v)) : NaN; }
function earned(){ var t = 0; s.logs.forEach(function(l){ t += l.v; }); return t; }

/* ---------- The plan maths (shown on the page, never guessed by an AI) ---------- */
function plan(){
  var k = SKILLS[s.skill], profit = s.price - s.cost, left = Math.max(0, s.goal - earned());
  var perWeek = Math.floor(s.hours / k.hrs + 1e-9);
  var jobs = profit > 0 ? Math.ceil(left / profit) : Infinity;
  var weeks = perWeek > 0 && isFinite(jobs) ? Math.ceil(jobs / perWeek) : Infinity;
  return { k: k, profit: profit, left: left, perWeek: perWeek, jobs: jobs, weeks: weeks, hourly: profit / k.hrs };
}
function take(p){
  var k = p.k, out = [];
  if(p.left <= 0) return { head: 'You did it. ' + money(earned()) + ' earned.', body: 'That\'s real money from your own business. Put some in savings, then set a bigger goal below.', st: 'good' };
  if(p.profit <= 0) return { head: 'Your price doesn\'t cover your costs.', body: 'Each job costs ' + money(s.cost) + ' and you charge ' + money(s.price) + ', so you lose money every time. Charge more than it costs you.', st: 'bad' };
  if(p.perWeek < 1) return { head: 'Not enough time for one job a week.', body: 'One ' + k.job + ' takes about ' + k.hrs + ' hours and you have ' + s.hours + '. Find ' + Math.ceil(k.hrs - s.hours + .01) + ' more hour' + (Math.ceil(k.hrs - s.hours + .01) > 1 ? 's' : '') + ' a week, or pick a quicker job.', st: 'bad' };
  out.push('You make ' + money(p.profit) + ' a job (' + money(s.price) + ' price minus ' + money(s.cost) + ' costs), about ' + money(p.hourly) + ' an hour.');
  out.push('You need ' + p.jobs + ' more job' + (p.jobs === 1 ? '' : 's') + '. With ' + s.hours + ' hours a week you can do ' + p.perWeek + ' a week, so about ' + p.weeks + ' week' + (p.weeks === 1 ? '' : 's') + '.');
  if(s.price < k.lo) out.push('Your price is below what most people charge (' + money(k.lo) + ' to ' + money(k.hi) + '). Cheap can look unsure. Try ' + money(k.lo) + '.');
  else if(s.price > k.hi) out.push('Your price is above the usual ' + money(k.lo) + ' to ' + money(k.hi) + '. That\'s fine if you do extra, but expect more no\'s at first.');
  var st = p.weeks <= 4 ? 'good' : p.weeks <= 8 ? 'warn' : 'bad';
  if(p.weeks > 4){
    var up = s.price + 5, j2 = Math.ceil(p.left / (up - s.cost)), w2 = Math.ceil(j2 / p.perWeek);
    out.push('That\'s longer than 30 days. Charging ' + money(up) + ' gets you there in ' + w2 + ' week' + (w2 === 1 ? '' : 's') + ', or find a few more hours a week.');
  }
  var head = st === 'good' ? 'Doable. ' + money(s.goal) + ' in about ' + p.weeks + ' week' + (p.weeks === 1 ? '' : 's') + '.' : st === 'warn' ? 'Possible, but slow: about ' + p.weeks + ' weeks.' : 'Too slow as it is: about ' + (isFinite(p.weeks) ? p.weeks : 'many') + ' weeks.';
  return { head: head, body: out.join(' '), st: st };
}
function line(){
  var k = SKILLS[s.skill], who = s.name ? 'it\'s ' + s.name : 'it\'s me';
  return 'Hi! ' + (s.area ? who.charAt(0).toUpperCase() + who.slice(1) + ' from ' + s.area + '. ' : who.charAt(0).toUpperCase() + who.slice(1) + '. ') +
    'I\'m starting a small ' + k.name.toLowerCase() + ' business. For ' + money(s.price) + ' I\'ll ' + k.job + '. Could I help you this week?';
}

/* ---------- Chart: trading style. Each candle = money you logged, stacking up to the goal line. ---------- */
function svgEl(tag, at, parent){ var e = document.createElementNS('http://www.w3.org/2000/svg', tag); for(var a in at) e.setAttribute(a, at[a]); if(parent) parent.appendChild(e); return e; }
function step(span){ var raw = span / 5, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
function draw(){
  var box = $('f1-chart'), W = box.clientWidth, H = box.clientHeight; box.textContent = '';
  if(W < 60 || H < 80) return;
  var L = s.logs, total = earned(), n = Math.max(6, L.length + 2), yMax0 = Math.max(s.goal, total) * 1.15;
  var st = step(yMax0), yMax = Math.ceil(yMax0 / st) * st;
  var AX = W < 420 ? 50 : 60, TOP = 30, BOT = 26, PW = W - AX - 8, PH = H - TOP - BOT;
  var Y = function(v){ return TOP + (yMax - v) / yMax * PH; }, cw = PW / n, bw = Math.max(8, Math.min(34, cw * .5)), X = function(i){ return 8 + cw * (i + .5); };
  var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', class: 'fl-svg' }, box);
  var grid = svgEl('g', { class: 'fl-grid' }, svg);
  for(var v = 0; v <= yMax + 1e-6; v += st){
    svgEl('line', { x1: 0, x2: W - AX, y1: Y(v), y2: Y(v) }, grid);
    if(Math.abs(Y(v) - Y(s.goal)) < 15 || (L.length && Math.abs(Y(v) - Y(total)) < 15)) continue;
    svgEl('text', { x: W - AX + 8, y: Y(v) + 4, class: 'fl-ax' }, svg).textContent = '$' + Math.round(v);
  }
  for(var i = 0; i < n; i++) svgEl('line', { x1: X(i), x2: X(i), y1: TOP - 6, y2: TOP + PH }, grid);
  svgEl('line', { x1: W - AX, x2: W - AX, y1: 0, y2: H, class: 'fl-edge' }, svg);
  svgEl('line', { x1: 0, x2: W - AX, y1: Y(s.goal), y2: Y(s.goal), class: 'f1-goal' }, svg);
  var tg = svgEl('g', { class: 'fl-tag pos', transform: 'translate(' + (W - AX + 2) + ',' + Y(s.goal) + ')' }, svg);
  svgEl('rect', { x: 0, y: -10, width: AX - 4, height: 20, rx: 3 }, tg); svgEl('text', { x: (AX - 4) / 2, y: 4 }, tg).textContent = 'Goal';
  var run = 0;
  L.forEach(function(l, j){
    var g = svgEl('g', { class: 'fl-c st-good' }, svg), y1 = Y(run + l.v), y2 = Y(run);
    svgEl('rect', { x: X(j) - bw / 2, y: y1, width: bw, height: Math.max(2, y2 - y1), rx: 2, class: 'body' }, g);
    svgEl('text', { x: X(j), y: TOP + PH + 16, class: 'fl-x' }, svg).textContent = '#' + (j + 1);
    run += l.v;
  });
  if(L.length){
    var lt = svgEl('g', { class: 'fl-tag pos', transform: 'translate(' + (W - AX + 2) + ',' + Y(total) + ')' }, svg);
    svgEl('rect', { x: 0, y: -10, width: AX - 4, height: 20, rx: 3 }, lt); svgEl('text', { x: (AX - 4) / 2, y: 4 }, lt).textContent = '$' + Math.round(total);
  }
  var hd = svgEl('text', { x: 10, y: 19, class: 'fl-hd' }, svg);
  svgEl('tspan', { class: 'pos' }, hd).textContent = '+' + money(total);
  svgEl('tspan', { class: 'fl-hl', dx: 8 }, hd).textContent = total >= s.goal ? 'goal reached' : money(s.goal - total) + ' to go';
}

/* ---------- Page ---------- */
function render(){
  var p = plan(), t = take(p);
  $('f1-head').textContent = t.head; $('f1-body').textContent = t.body;
  var ic = $('f1-st'); ic.className = 'sc-ic ' + t.st; ic.textContent = t.st === 'good' ? '✓' : t.st === 'warn' ? '!' : '✕';
  $('f1-stw').textContent = t.st === 'good' ? 'On track' : t.st === 'warn' ? 'Slow' : 'Fix this first';
  $('f1-range').textContent = 'Most people charge ' + money(p.k.lo) + ' to ' + money(p.k.hi) + ' for ' + p.k.job + '. About ' + p.k.hrs + ' hours a job.';
  $('f1-s1').textContent = money(earned()); $('f1-s2').textContent = isFinite(p.jobs) ? p.jobs : '–'; $('f1-s3').textContent = isFinite(p.weeks) ? p.weeks : '–';
  $('f1-who').textContent = 'Who to ask: ' + p.k.who + '.'; $('f1-tip').textContent = 'Danny\'s tip: ' + p.k.tip;
  $('f1-line').textContent = line();
  var list = $('f1-steps'); list.textContent = ''; var id = 0, done = 0;
  STEPS.forEach(function(w){
    var sec = el('li', 'f1-wk', null, list); el('h3', null, w[0], sec); var ul = el('ul', null, null, sec);
    w[1].forEach(function(txt){
      var key = id++, li = el('li', null, null, ul), lb = el('label', null, null, li), cb = el('input', null, null, lb);
      cb.type = 'checkbox'; cb.checked = s.done.indexOf(key) >= 0; if(cb.checked) done++;
      el('span', null, txt, lb);
      cb.addEventListener('change', function(){ var at = s.done.indexOf(key); if(cb.checked && at < 0) s.done.push(key); if(!cb.checked && at >= 0) s.done.splice(at, 1); save(); render(); });
    });
  });
  $('f1-prog').textContent = done + ' of ' + id + ' steps done';
  var lg = $('f1-logs'); lg.textContent = '';
  s.logs.slice().reverse().forEach(function(l){ var li = el('li', null, null, lg); el('b', null, money(l.v), li); el('span', null, (l.note ? l.note + ' · ' : '') + l.at, li); });
  $('f1-empty').hidden = s.logs.length > 0; $('f1-undo').hidden = !s.logs.length;
  $('f1-next').hidden = earned() < s.goal;
  draw();
}
function fill(){
  $('f1-skill').value = s.skill; $('f1-price').value = s.price; $('f1-cost').value = s.cost; $('f1-hours').value = s.hours;
  $('f1-goal').value = s.goal; $('f1-name').value = s.name || ''; $('f1-area').value = s.area || '';
}
var sel = $('f1-skill');
Object.keys(SKILLS).forEach(function(k){ var o = el('option', null, SKILLS[k].name, sel); o.value = k; });
sel.addEventListener('change', function(){ var k = SKILLS[sel.value]; s.skill = sel.value; s.price = k.price; s.cost = k.cost; fill(); save(); render(); });
['f1-price', 'f1-cost', 'f1-hours', 'f1-goal'].forEach(function(id){
  $(id).addEventListener('input', function(){
    var v = { 'f1-price': num('f1-price', 0, 10000), 'f1-cost': num('f1-cost', 0, 10000), 'f1-hours': num('f1-hours', 0, 80), 'f1-goal': num('f1-goal', 1, 100000) }[id];
    if(!isFinite(v)) return;
    s[{ 'f1-price': 'price', 'f1-cost': 'cost', 'f1-hours': 'hours', 'f1-goal': 'goal' }[id]] = v; save(); render();
  });
});
['f1-name', 'f1-area'].forEach(function(id){ $(id).addEventListener('input', function(){ s[id === 'f1-name' ? 'name' : 'area'] = $(id).value.slice(0, 40); save(); $('f1-line').textContent = line(); }); });
$('f1-copy').addEventListener('click', function(){
  var t = line(), b = $('f1-copy');
  function ok(){ b.textContent = 'Copied'; setTimeout(function(){ b.textContent = 'Copy message'; }, 1600); }
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function(){ b.textContent = 'Select and copy it'; });
  else b.textContent = 'Select and copy it';
});
$('f1-log').addEventListener('submit', function(e){
  e.preventDefault();
  var v = num('f1-amt', 0, 100000);
  if(!isFinite(v) || v <= 0){ $('f1-msg').textContent = 'Type how much you earned, like 25.'; return; }
  $('f1-msg').textContent = '';
  s.logs.push({ v: v, note: $('f1-note').value.slice(0, 40), at: new Date().toISOString().slice(0, 10) }); save();
  $('f1-amt').value = ''; $('f1-note').value = ''; render(); $('f1-head').focus();
});
$('f1-undo').addEventListener('click', function(){ s.logs.pop(); save(); render(); });
$('f1-next').addEventListener('click', function(){ s.goal = Math.round(Math.max(s.goal, earned()) * 2.5 / 50) * 50; s.done = []; fill(); save(); render(); $('f1-head').focus(); });
$('f1-reset').addEventListener('click', function(){ if(confirm('Start over? Your plan and money log will be cleared from this device.')){ try{ localStorage.removeItem(KEY); }catch(e){} s = { skill: 'lawn', price: 25, cost: 2, hours: 4, goal: 100, name: '', area: '', done: [], logs: [] }; fill(); render(); } });
addEventListener('resize', draw);
fill(); render();
})();
