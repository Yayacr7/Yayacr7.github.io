/* Money ladder (free): $100 -> $1,000 -> $10,000 -> invest the profit. Reads what you earned in the First $100 Plan
   (and the Wealth tracker), works out the jobs and weeks to the next rung from your own price and hours, and gives
   Cherry's moves for each rung with tick boxes. Fixed rules, no AI. Saved in this browser only. */
(function(){
"use strict";
var R = window.SharpRich, $ = R.$, el = R.el, money = R.money, KEY = 'sharp-ladder';
// Job length and usual top price per starter business. Keep in sync with SKILLS in tools/first100/first100.js.
var SKILLS = { lawn: ['Lawn and yard care', 1.5, 40], pets: ['Dog walking and pet sitting', .75, 20], car: ['Car washing', 1, 35], tutor: ['Tutoring younger kids', 1, 25],
  bake: ['Baked goods', 1.5, 18], tech: ['Phone and tech help', 1, 30], resell: ['Reselling', 1, 40], sitter: ['Babysitting', 3, 60], social: ['Social posts for local shops', 3, 75] };
var RUNGS = [
  { t: 100, name: 'Your first $100', goal: 'Prove someone will pay you.', weeks: 4, link: ['../first100/index.html', 'Open the First $100 Plan'], steps: [
    'Pick one service and one fair price.',
    'Send your offer to 10 people you or your family know.',
    'Do your first job well, and log the money the same day.'] },
  { t: 1000, name: '$1,000', goal: 'Turn one-off jobs into regular customers.', weeks: 26, steps: [
    'Offer every customer the same slot every week or month.',
    'Ask each happy customer: "Do you know one person who needs this?"',
    'Raise your price $5 for new customers once you\'re booked up.',
    'Keep a customer list: name, what they bought, when to ask again.',
    'Save 20% of every payment before you spend any of it.'] },
  { t: 10000, name: '$10,000', goal: 'Run it like a real business.', weeks: 78, steps: [
    'Add a second service your customers already ask you for.',
    'Sell a package paid up front, like 4 weekly visits for one price.',
    'Bring in a helper you pay per job, only with a parent\'s okay.',
    'Log your profit every month in the Wealth tracker.',
    'Put money aside for tax, and check the rules with a trusted adult.'] },
  { t: 0, name: 'Invest the profit', goal: 'Make your money earn money. Start any time, not just at $10,000.', link: ['../million/index.html', 'Open Road to $1 million'], steps: [
    'Build an emergency fund first: about 3 months of what you spend.',
    'Invest a set amount every month in a broad index fund. Under 18, a parent or guardian opens the account.',
    'Never invest money you\'ll need this year, and walk away from anything that promises sure returns.',
    'See how far it can go on your Road to $1 million.'] }
];
var s = R.load(KEY) || { done: [], seen: 0 };
if(!Array.isArray(s.done)) s.done = [];

function biz(){
  var f = R.firstPlan(), k = f && SKILLS[f.skill] ? f.skill : 'lawn', sk = SKILLS[k];
  var price = f && +f.price > 0 ? +f.price : 25, cost = f && +f.cost >= 0 ? +f.cost : 2, hours = f && +f.hours > 0 ? +f.hours : 4;
  return { started: !!f, name: sk[0], hrs: sk[1], hi: sk[2], price: price, cost: cost, hours: hours, profit: price - cost, perWeek: Math.floor(hours / sk[1] + 1e-9) };
}
// Business money only: what you log in the First $100 Plan (the Wealth tracker also counts pay and gifts).
function earned(){ return R.firstEarned(); }
function pace(b, left, profit){
  var jobs = profit > 0 ? Math.ceil(left / profit) : Infinity, weeks = b.perWeek > 0 && isFinite(jobs) ? Math.ceil(jobs / b.perWeek) : Infinity;
  return { jobs: jobs, weeks: weeks };
}
function weeksText(w){ return !isFinite(w) ? 'never at this pace' : w > 104 ? 'about ' + Math.round(w / 52) + ' years' : R.plural(w, 'week'); }

function take(b, E, at){
  if(at >= 3) return { st: 'good', head: 'You passed $10,000. Now make it grow.', body: 'You\'ve built a real business. Keep it running, keep 20% or more of what you earn, and invest part of it every month.' };
  var r = RUNGS[at], left = r.t - E, p = pace(b, left, b.profit), out = [];
  if(b.perWeek < 1) return { st: 'bad', head: 'Not enough time for one job a week.', body: 'A ' + b.name.toLowerCase() + ' job takes about ' + b.hrs + ' hours and you have ' + b.hours + '. Find more hours in the First $100 Plan, or pick a quicker job.' };
  if(b.profit <= 0) return { st: 'bad', head: 'Your price doesn\'t cover your costs.', body: 'Each job costs ' + money(b.cost) + ' and you charge ' + money(b.price) + '. Fix your price in the First $100 Plan first.' };
  if(!b.started) out.push('Start at the bottom: the First $100 Plan. Until then, this uses lawn care at $25 a job and 4 hours a week as an example.');
  out.push('At ' + money(b.price) + ' a job (' + money(b.profit) + ' after costs) and ' + b.hours + ' hours a week, that\'s ' + R.plural(p.jobs, 'job') + ', ' + weeksText(p.weeks) + '.');
  var st = p.weeks <= r.weeks ? 'good' : p.weeks <= r.weeks * 2 ? 'warn' : 'bad';
  if(st !== 'good'){
    var up = Math.min(b.hi, b.price + 5), q = up > b.price ? pace(b, left, up - b.cost) : null;
    if(q) out.push('Too slow on your own. Charge ' + money(up) + ' and it\'s ' + weeksText(q.weeks) + '. Regular customers and a second service do the rest.');
    else out.push('Your price is already at the top, so grow the number of jobs: regular slots, packages and, later, a helper.');
  }
  var head = st === 'good' ? 'Next rung: ' + money(r.t) + '. ' + R.plural(p.jobs, 'more job') + '.' : 'Next rung: ' + money(r.t) + '. At this pace: ' + weeksText(p.weeks) + '.';
  return { st: st, head: head, body: out.join(' '), p: p };
}

function render(){
  var b = biz(), E = earned(), at = 0;
  while(at < 3 && E >= RUNGS[at].t) at++;
  var t = take(b, E, at);
  $('ld-head').textContent = t.head; $('ld-body').textContent = t.body;
  var ic = $('ld-st'); ic.className = 'sc-ic ' + t.st; ic.textContent = t.st === 'good' ? '✓' : t.st === 'warn' ? '!' : '✕';
  $('ld-stw').textContent = t.st === 'good' ? 'Climbing' : t.st === 'warn' ? 'Slow' : 'Fix first';
  $('ld-s1').textContent = money(E); $('ld-s2').textContent = at < 3 ? R.short(RUNGS[at].t) : 'Invest';
  $('ld-s3').textContent = t.p && isFinite(t.p.jobs) ? t.p.jobs : '–'; $('ld-s4').textContent = t.p && isFinite(t.p.weeks) ? (t.p.weeks > 104 ? Math.round(t.p.weeks / 52) + ' yrs' : t.p.weeks) : '–';
  var box = $('ld-rungs'); box.textContent = '';
  RUNGS.forEach(function(r, i){
    var done = r.t && E >= r.t, here = i === at || (i === 3 && at >= 3), li = el('li', 'ld-rung' + (done ? ' done' : '') + (here ? ' here' : ''), null, box);
    var top = el('div', 'ld-rtop', null, li), badge = el('span', 'ld-badge', done ? '✓ Done' : here ? 'You\'re here' : i === 3 ? 'Any time' : 'Next', top);
    if(done) badge.className = 'ld-badge good';
    el('h3', null, r.name, top);
    el('p', 'ld-goal', r.goal, li);
    if(r.t){
      var bar = el('div', 'ld-bar', null, li), fill = el('i', null, null, bar);
      fill.style.width = Math.min(100, E / r.t * 100).toFixed(1) + '%';
      bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', money(Math.min(E, r.t)) + ' of ' + money(r.t));
      el('span', 'ld-of', money(Math.min(E, r.t)) + ' of ' + money(r.t), li);
    }
    var ul = el('ul', 'ld-steps', null, li);
    r.steps.forEach(function(txt, j){
      var key = i + '-' + j, sli = el('li', null, null, ul), lb = el('label', null, null, sli), cb = el('input', null, null, lb);
      cb.type = 'checkbox'; cb.checked = s.done.indexOf(key) >= 0; el('span', null, txt, lb);
      cb.addEventListener('change', function(){
        var k = s.done.indexOf(key); if(cb.checked && k < 0) s.done.push(key); if(!cb.checked && k >= 0) s.done.splice(k, 1);
        R.save(KEY, s); if(cb.checked) R.pop(cb, { n: 5 });
      });
    });
    if(r.link){ var a = el('a', 'btn ghost ld-link', r.link[1] + ' →', li); a.href = r.link[0]; }
  });
  // A rung reached since the last visit gets its moment, once.
  if(at > (+s.seen || 0)){ var reached = RUNGS[at - 1]; s.seen = at; R.save(KEY, s); setTimeout(function(){ R.pop($('ld-s1'), { n: 18, big: true, say: 'You reached ' + money(reached.t) + '! Cherry on top.' }); }, 600); }
}
render();
})();
