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
    ['Sign-ups', Math.round(leads).toLocaleString()], ['Customers', (buyers < 10 ? buyers.toFixed(1) : Math.round(buyers).toLocaleString())], ['Revenue per visitor', money(perVisitor, 2)]
  ], v);
  var w = vis > 0 ? 100 : 0;
  $('fn-bars').innerHTML = [['Visitors', vis, vis], ['Sign-ups', leads, vis], ['Customers', buyers, vis]].map(function(r){
    var width = r[2] > 0 ? Math.max(1.5, r[1] / r[2] * w) : 0;
    return '<div class="fn-row"><span>' + r[0] + '</span><div class="fn-track"><i style="width:' + width.toFixed(1) + '%"></i></div><b class="num">' + (r[1] < 10 ? r[1].toFixed(1) : Math.round(r[1]).toLocaleString()) + '</b></div>';
  }).join('');
});

wire('f-email', function(){
  var subs = pos('em-subs'), sends = pos('em-sends'), open = pos('em-open') / 100, click = pos('em-click') / 100, buy = pos('em-buy') / 100, aov = pos('em-aov');
  var orders = subs * sends * open * click * buy, rev = orders * aov, perSub = subs > 0 ? rev / subs : 0;
  $('em-out').innerHTML = result('Email revenue per month', money(rev), [
    ['Orders per month', orders < 10 ? orders.toFixed(1) : Math.round(orders).toLocaleString()], ['Value per subscriber / month', money(perSub, 2)], ['Value per subscriber / year', money(perSub * 12, 2)]
  ], 'Use the yearly value per subscriber as the most you\'d pay to win one new subscriber.');
});

/* ================= BUDGET ================= */
var NEEDS = ['b-rent','b-util','b-food','b-transport','b-insure','b-debtmin'], WANTS = ['b-eat','b-subs','b-shop','b-fun'], SAVE = ['b-save','b-debtextra'];
function sum(ids){ return ids.reduce(function(a, id){ return a + pos(id); }, 0); }
wire('f-budget', function(){
  var inc = pos('b-income'), needs = sum(NEEDS), wants = sum(WANTS), save = sum(SAVE), spent = needs + wants + save, left = inc - spent;
  var p = function(x){ return inc > 0 ? x / inc * 100 : 0; };
  var v;
  if(inc <= 0) v = 'Enter your monthly take-home pay.';
  else if(left < 0) v = '<b>You\'re over by ' + money(-left) + ' a month.</b> Cut wants first; they\'re the easiest to change.';
  else if(p(save) < 10) v = '<b>Saving ' + pct(p(save), 0) + ' of income.</b> Aim for 20%. Move ' + money(Math.max(0, inc * .2 - save)) + ' a month from wants or leftovers into savings, automatically on payday.';
  else v = '<b>Solid.</b> You save ' + pct(p(save), 0) + '. ' + (left > 0 ? 'Give the leftover ' + money(left) + ' a job, or it tends to disappear.' : '');
  $('b-out').innerHTML = result('Left over each month', money(left), [
    ['Needs', money(needs) + ' · ' + pct(p(needs), 0)], ['Wants', money(wants) + ' · ' + pct(p(wants), 0)], ['Savings & extra debt', money(save) + ' · ' + pct(p(save), 0)]
  ], v) + '<div class="bar" aria-hidden="true"><i style="width:' + Math.min(100, p(needs)) + '%;background:var(--business)"></i><i style="width:' + Math.min(100, p(wants)) + '%;background:var(--marketing)"></i><i style="width:' + Math.min(100, p(save)) + '%;background:var(--finance)"></i></div>' +
    '<div class="legend"><span><b style="background:var(--business)"></b>Needs (guide 50%)</span><span><b style="background:var(--marketing)"></b>Wants (guide 30%)</span><span><b style="background:var(--finance)"></b>Savings (guide 20%)</span></div>';
});

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
