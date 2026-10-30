/* 60 seconds with Cherry: a 3-step demo for new visitors.
   1) Your money: what you could keep this year. 2) Your first $100: how fast. 3) Make the sale: a tough reply.
   Fixed rules, no AI. Nothing leaves the device; "Get my full plan" pre-fills the First $100 Plan (localStorage).
   Business prices match tools/first100/first100.js. Visitor text: textContent only (and there is no free text here). */
(function(){
"use strict";
// Teen or adult (assets/who.js): picked first, so the numbers and examples fit. Nothing picked yet = ask.
var WHO = window.SharpWho ? window.SharpWho.get() : '', ADULT = WHO === 'adult', GOAL = ADULT ? 500 : 100;
var CATS = ADULT ? {
  eat:    { name: 'Eating out',          tip: 'Cook at home two more nights a week.' },
  shop:   { name: 'Shopping',            tip: 'Wait 7 days before buying anything over $50.' },
  subs:   { name: 'Subscriptions',       tip: 'Cancel the one you used least last month.' },
  rides:  { name: 'Rides and delivery',  tip: 'Batch errands into one trip and skip delivery fees.' },
  fun:    { name: 'Going out and fun',   tip: 'Plan one free weekend activity a month.' }
} : {
  food:   { name: 'Food and snacks out', tip: 'Bring snacks from home 3 days a week.' },
  games:  { name: 'Games and apps',      tip: 'Set a monthly game budget and only buy on sale.' },
  clothes:{ name: 'Clothes and shoes',   tip: 'Wait 7 days before buying anything over $30.' },
  rides:  { name: 'Rides and delivery',  tip: 'Walk or bike any trip under 15 minutes.' },
  subs:   { name: 'Subscriptions',       tip: 'Cancel the one you used least last month.' }
};
// Prices come from assets/biz.js (the same list as the First $100 Plan), for a teen or an adult.
var SHORT = { lawn: ['Lawn care', 'mow and edge their yard'], pets: ['Dog walking', 'walk their dog'], tutor: ['Tutoring', 'tutor their kid'],
  bake: ['Baking', 'bake them a dozen cookies'], tech: ['Tech help', 'set up their phone or TV'], social: ['Social posts', 'make 8 posts for their shop'] };
var SKILLS = {};
Object.keys(SHORT).forEach(function(k){ var b = window.SharpBiz.get(k, WHO); SKILLS[k] = { name: SHORT[k][0], act: SHORT[k][1], price: b.price, cost: b.cost, hrs: b.hrs }; });
var ANSWERS = [
  { t: 'No problem. I\'ll knock $5 off if you book today.', ok: false, why: 'Not quite. You cut your price before you knew what worried them. Often the worry isn\'t the price at all, so you just lost $5 for nothing.' },
  { t: 'Of course. What would you need to feel good about deciding?', ok: true, why: 'Yes. You don\'t argue and you don\'t beg. You find the real worry, then answer it honestly. Sometimes it\'s a yes, sometimes a no, and both are fine.' },
  { t: 'Honestly, it\'s the best price around. You won\'t find cheaper.', ok: false, why: 'Not quite. That\'s arguing. Pushing makes people defensive, and being the cheapest is rarely why someone says yes.' }
];
var SAY = {
  1: 'Hi, I\'m Cherry. 60 seconds, 3 steps. First: where does your money go?',
  2: 'Now let\'s earn some. Pick something you could do this week.',
  3: 'Last one, and it\'s the hard part: closing the deal.',
  end: 'That\'s your plan. Now come into Sharp. I\'ll be right there with you.'
};
var st = ADULT ? { inc: 3200, cat: 'eat', sp: 380, skill: 'lawn', hours: 4, picked: -1 } : { inc: 300, cat: 'food', sp: 120, skill: 'lawn', hours: 4, picked: -1 };
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function $(id){ return document.getElementById(id); }
function el(tag, cls, text, parent){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; if(parent) parent.appendChild(e); return e; }
function money(v){ return '$' + Math.round(v).toLocaleString(); }

/* ---------- the maths ---------- */
function keep(){ var month = Math.round(st.sp / 3); return { month: month, year: month * 12 }; }
function share(){ return st.inc > 0 ? st.sp / st.inc : 0; }
function status(){ var s = share(); return s > .5 ? ['bad', '✕', 'Too much'] : s > .3 ? ['warn', '!', 'A bit over'] : ['good', '✓', 'Fine']; }
function earn(){
  var k = SKILLS[st.skill], profit = k.price - k.cost, perWeek = Math.floor(st.hours / k.hrs + 1e-9);
  var jobs = Math.ceil(GOAL / profit), weeks = perWeek > 0 ? Math.ceil(jobs / perWeek) : Infinity;
  return { k: k, profit: profit, perWeek: perWeek, jobs: jobs, weeks: weeks, hourly: profit / k.hrs };
}
function weeksText(w){ return isFinite(w) ? w + (w === 1 ? ' week' : ' weeks') : 'more hours needed'; }

/* ---------- count-up numbers (off for reduced motion) ---------- */
function count(node, to, fmt){
  var from = node.__v || 0; node.__v = to;
  if(reduce || !isFinite(to)){ node.textContent = fmt(to); return; }
  var t0 = performance.now();
  (function tick(t){ var p = Math.min(1, (t - t0) / 450), e = 1 - Math.pow(1 - p, 3); node.textContent = fmt(from + (to - from) * e); if(p < 1) requestAnimationFrame(tick); })(t0);
}

/* ---------- step 1: the money jar (assets/jar.js), filling month by month for a year ---------- */
// The jar is drawn to a fixed size ($600 for a teen, $2,000 for an adult) so it rises and falls as you slide;
// a bigger year just fills it to the top. Coins drop in whenever what you keep goes up.
var JAR = { f: null, t: 0 };
function chart(animate){
  var box = $('dm-chart'); if(!window.SharpJar || box.clientWidth < 40) return;
  var y = keep().year, cap = Math.max(y * 1.12, ADULT ? 2000 : 600), f = y / cap, now = Date.now();
  var drop = animate !== false && (JAR.f == null || f > JAR.f + .004) && now - JAR.t > 700;
  if(drop) JAR.t = now;
  window.SharpJar.draw(box, { fill: f, from: JAR.f == null ? 0 : JAR.f, animate: animate !== false, coins: drop ? 5 : 0, icon: '../assets/cherry.svg' });
  JAR.f = f;
  box.setAttribute('aria-label', 'Money jar: about ' + money(y) + ' kept in a year.');
}

/* ---------- render ---------- */
function live(){ $('dm-live').textContent = money(keep().year) + ' a year kept · ' + money(GOAL) + (isFinite(earn().weeks) ? ' in about ' + weeksText(earn().weeks) : ': more hours needed'); }
function r1(){
  $('dm-inc-o').textContent = money(st.inc);
  var sp = $('dm-sp'); sp.max = st.inc; if(st.sp > st.inc){ st.sp = st.inc; sp.value = st.inc; }
  $('dm-sp-o').textContent = money(st.sp);
  var k = keep(), s = status();
  count($('dm-r1'), k.year, money);
  var chip = $('dm-st'); chip.className = 'dm-st ' + s[0]; $('dm-st-i').textContent = s[1]; $('dm-st-w').textContent = s[2];
  $('dm-share').textContent = Math.round(share() * 100) + '% of your money goes on ' + CATS[st.cat].name.toLowerCase() + '.';
  $('dm-say').textContent = 'Cut it by a third and you keep ' + money(k.month) + ' a month. My tip: ' + CATS[st.cat].tip;
  chart(); live();
}
function r2(){
  $('dm-hrs-o').textContent = st.hours + (st.hours === 1 ? ' hour' : ' hours');
  var e = earn();
  count($('dm-r2'), e.weeks, function(v){ return isFinite(v) ? String(Math.max(1, Math.round(v))) : '–'; });
  $('dm-r2u').textContent = isFinite(e.weeks) ? (e.weeks === 1 ? 'week to ' : 'weeks to ') + money(GOAL) : 'Not enough time yet';
  $('dm-r2l').textContent = e.perWeek < 1 ? 'One job takes about ' + e.k.hrs + ' hours. Give it a bit more time each week.'
    : 'You keep ' + money(e.profit) + ' a job (' + money(e.k.price) + ' minus ' + money(e.k.cost) + ' costs), about ' + money(e.hourly) + ' an hour. ' + e.jobs + ' jobs, ' + e.perWeek + ' a week.';
  var dots = $('dm-dots'); dots.textContent = '';
  for(var i = 0; i < Math.min(e.jobs, 14); i++){ var d = el('i', null, null, dots); d.style.animationDelay = (i * 50) + 'ms'; }
  if(e.jobs > 14) el('span', null, '+' + (e.jobs - 14), dots);
  $('dm-say').textContent = isFinite(e.weeks) && e.weeks <= 4 ? 'Doable this month. ' + e.k.name + ' at ' + money(e.k.price) + ' a job works.' : 'That\'s slow. Raise your price a little or find an extra hour or two a week.';
  live();
}
function r3(){
  var k = SKILLS[st.skill];
  $('dm-scene-a').textContent = 'You offer to ' + k.act + ' for ' + money(k.price) + '. They say:';
  var box = $('dm-ans'); box.textContent = '';
  order.forEach(function(ix, n){
    var a = ANSWERS[ix], b = el('button', 'dm-a', null, box); b.type = 'button';
    el('span', 'dm-a-l', String.fromCharCode(65 + n), b); el('span', null, a.t, b);
    if(st.picked >= 0){ b.disabled = true; if(a.ok) b.classList.add('right'); if(ix === st.picked && !a.ok) b.classList.add('wrong'); }
    b.addEventListener('click', function(){ if(a.ok && window.SharpPop) SharpPop(b, { n: 12, say: 'Best reply. Cherry on top!' }); st.picked = ix; $('dm-why').textContent = a.why; $('dm-why').className = 'dm-why ' + (a.ok ? 'good' : 'bad'); $('dm-to-end').disabled = false; r3(); $('dm-to-end').focus(); });
  });
}
function rEnd(){
  var k = keep(), e = earn(), s = SKILLS[st.skill];
  count($('dm-e1'), k.year, money);
  $('dm-e2').textContent = weeksText(e.weeks);
  $('dm-e2s').textContent = s.name + ', ' + st.hours + ' hours a week';
  $('dm-e3').textContent = '"Hi! I\'m starting a small ' + s.name.toLowerCase() + ' business. For ' + money(s.price) + ' I\'ll ' + s.act.replace(/their/g, 'your').replace(/them/g, 'you') + '. Could I help you this week?"';
  $('dm-e4').textContent = st.picked >= 0 && ANSWERS[st.picked].ok ? 'You picked the best reply first time. Nice.' : 'Remember: find the real worry. Don\'t argue or drop your price.';
}
var order = [0, 1, 2].sort(function(){ return Math.random() - .5; });
var cur = '1', started = false;
function go(to){
  ['1', '2', '3', 'end'].forEach(function(k){ $('dm-' + k).hidden = k !== to; });
  cur = to;
  var n = to === 'end' ? 3 : +to;
  [].forEach.call(document.querySelectorAll('.dm-steps i'), function(b, i){ b.className = i < n ? 'on' : ''; });
  $('dm-n').textContent = to === 'end' ? 'Done · your plan' : 'Step ' + to + ' of 3';
  $('dm-say').textContent = SAY[to];
  if(to === '1') r1(); if(to === '2'){ r2(); $('dm-say').textContent = SAY[2]; } if(to === '3') r3(); if(to === 'end'){ rEnd(); if(window.SharpPop) setTimeout(function(){ SharpPop($('dm-e1'), { n: 16, big: true }); }, 450); }
  if(to === '1') $('dm-say').textContent = SAY[1];
  var h = document.querySelector('#dm-' + to + ' h2'); if(h && started){ h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  started = true;
  var head = document.querySelector('.site-head'), top = $('dm').getBoundingClientRect().top + scrollY - (head ? head.offsetHeight : 80) - 12; if(scrollY > top) scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
}

/* ---------- wire up ---------- */
function radios(name, data, wrap, key, after){
  Object.keys(data).forEach(function(k){
    var lb = el('label', 'dm-chip', null, wrap), r = el('input', null, null, lb); r.type = 'radio'; r.name = name; r.value = k; r.checked = st[key] === k;
    el('span', null, data[k].name, lb);
    r.addEventListener('change', function(){ st[key] = k; after(); });
  });
}
radios('dm-cat', CATS, $('dm-cats'), 'cat', r1);
radios('dm-skill', SKILLS, $('dm-skills'), 'skill', r2);
$('dm-inc').addEventListener('input', function(){ st.inc = +this.value; r1(); });
$('dm-sp').addEventListener('input', function(){ st.sp = +this.value; r1(); });
$('dm-hrs').addEventListener('input', function(){ st.hours = +this.value; r2(); });
[].forEach.call(document.querySelectorAll('[data-go]'), function(b){ b.addEventListener('click', function(){ go(b.getAttribute('data-go')); }); });
$('dm-again').addEventListener('click', function(){ st.picked = -1; $('dm-why').textContent = ''; $('dm-to-end').disabled = true; go('1'); });
$('dm-plan').addEventListener('click', function(){
  // Pre-fill the real First $100 Plan, but never wipe a plan someone already started.
  try{
    var have = JSON.parse(localStorage.getItem('sharp-first100') || 'null');
    if(!have || !have.logs || !have.logs.length){
      var k = SKILLS[st.skill];
      localStorage.setItem('sharp-first100', JSON.stringify({ skill: st.skill, price: k.price, cost: k.cost, hours: st.hours, goal: GOAL, name: '', area: '', done: [], logs: [] }));
    }
  }catch(e){}
});
// Seen the demo: the home page won't send them here again. Going into the app skips the intro too.
try{ localStorage.setItem('sharp-demo', '1'); sessionStorage.setItem('sharp-demo-visit', '1'); }catch(e){}
function intoApp(){ try{ localStorage.setItem('sharp-intro', '1'); }catch(e){} }
$('dm-sharp').addEventListener('click', intoApp); $('dm-skip').addEventListener('click', intoApp);
addEventListener('resize', function(){ if(cur === '1') chart(false); });
// Teen or adult: the words and sliders that change, then ask first if nothing is picked yet.
if(ADULT){
  var inc = $('dm-inc'); inc.min = 500; inc.max = 10000; inc.step = 50; inc.value = st.inc; $('dm-sp').step = 10;
  $('dm-h2').textContent = '2. Your first ' + money(GOAL) + ' on the side';
}
$('dm-go2').textContent = 'Next: your first ' + money(GOAL) + ' →'; $('dm-e2l').textContent = 'Your first ' + money(GOAL); $('dm-plan').textContent = 'Get my full ' + money(GOAL) + ' plan';
function ask(on){
  $('dm-who').hidden = !on; $('dm-1').hidden = on; $('dm-whoami').hidden = on || !WHO; $('dm-live').hidden = on;   // no numbers until we know who it's for
  if(on){ $('dm-say').textContent = 'Hi, I\'m Cherry. First, tell me who you are, so my numbers fit you.'; }
}
$('dm-whoami').textContent = (ADULT ? 'For adults' : 'For teens') + ' · Change';
$('dm-whoami').addEventListener('click', function(){ ['1', '2', '3', 'end'].forEach(function(k){ $('dm-' + k).hidden = true; }); ask(true); $('dm-who-h').setAttribute('tabindex', '-1'); $('dm-who-h').focus(); });
[].forEach.call(document.querySelectorAll('#dm-who button[data-who]'), function(b){ b.addEventListener('click', function(){
  window.SharpWho.set(b.getAttribute('data-who')); location.reload();   // everything above is set up for the new choice
}); });
go('1');
ask(!WHO);
})();
