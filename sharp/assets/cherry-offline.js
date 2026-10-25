/* Type to Cherry, without the AI: while the AI is switched off, Cherry answers typed questions on this device.
   1) small talk, 2) money maths worked out in code ("if I save $20 a week"), 3) short answers in Sharp's own words for the
   most common questions, 4) otherwise a search of Sharp's free lessons and tools (assets/cherry-index.json, built by
   dev/build_ask_index.py). She remembers the last topic, so "tell me more" and "why?" work. Questions never leave the device.
   When the AI is on, voice.js opens the full AI chat (assets/agent.js) instead. Visitor text: textContent only. */
(function(){
"use strict";
var me = document.currentScript && document.currentScript.src;
var base = me ? me.replace(/assets\/cherry-offline\.js(\?.*)?$/, '') : '/';
var DOCS = null, panel, list, input, chipsBox, last = null;
var STOP = ('a an and are as at be but by can do does for from get got have how i if in is it its me my of on or so that the this to ' +
  'up was what when where which who why will with would you your yours we our should could much many more most any some about into ' +
  'than then them they there their just also very really want need make way best good help tell know start').split(' ').reduce(function(o, w){ o[w] = 1; return o; }, {});
var SUGGEST = ['How do I make money as a teen?', 'If I save $20 a week, how much in a year?', 'How should I price my work?', 'How do I get my first customer?'];
function el(tag, cls, text, parent){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; if(parent) parent.appendChild(e); return e; }
function stem(w){ return w.length > 3 ? w.replace(/(ings|ing|ed|es|s|e)$/, '') : w; }
function words(t){ return (t.toLowerCase().match(/[a-z0-9$%]+/g) || []).filter(function(w){ return !STOP[w] && w.length > 1; }).map(stem); }
function usd(n){ return '$' + (n >= 100 ? Math.round(n).toLocaleString('en-US') : (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })); }
function fv(perMonth, rate, years){ var r = rate / 12, n = years * 12; return r ? perMonth * (Math.pow(1 + r, n) - 1) / r : perMonth * n; }

/* ---------- 1. Small talk ---------- */
var TALK = [
  [/^(hi|hey|hello|yo|sup|hiya|good (morning|afternoon|evening))\b[\s!.]*$/i, ['Hey! I\'m Cherry, your money and business coach. What are you working on: saving, making money, or starting a business?'], ['How do I make money as a teen?', 'How do I save money?']],
  [/\b(who are you|what are you|your name|are you (a )?(bot|ai|real|human))\b/i, ['I\'m Cherry, Sharp\'s helper. Right now I answer from Sharp\'s lessons and do the maths for you on your device. You can also call me and talk out loud.'], ['What can you do?']],
  [/\b(what can you do|help me|how does this work|what do you do)\b/i, ['I can work out money maths (try "if I save $15 a week for 3 years"), help you price your work, plan your first $100, and point you to the right lesson. Ask me anything about money or business.'], ['If I save $15 a week for 3 years?', 'How do I make money as a teen?']],
  [/^(thanks|thank you|thx|ty|cool|ok|okay|nice|great|awesome)\b[\s!.]*$/i, ['Any time. What\'s your next move?'], ['How do I get my first customer?']],
  [/^(bye|goodbye|see you|cya)\b/i, ['See you! Small steps every week beat one big plan.'], []],
  [/\b(scared|nervous|afraid|fail|failing|not good enough|can'?t do (it|this)|bored|unmotivated|lazy)\b|\b(quit|give up|giving up)( on (it|this|my business|everything))?[\s?.!]*$/i,
   ['Don\'t quit. Everyone starting out feels that, and the ones who win just keep going. Make the first step tiny: one message to one person today. A "no" costs you nothing and teaches you what people want.', 'Want a plan you can finish this week?'], ['Make me a first $100 plan']]
];

/* ---------- 2. Money maths ---------- */
function num(s){ var m = String(s).replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k)?/i); return m ? parseFloat(m[1]) * (m[2] ? 1000 : 1) : NaN; }
var PER = { day: 365 / 12, daily: 365 / 12, week: 52 / 12, weekly: 52 / 12, wk: 52 / 12, month: 1, monthly: 1, mo: 1, year: 1 / 12, yearly: 1 / 12 };
function maths(q){
  var t = q.toLowerCase().replace(/,/g, ''), m, years;
  var ym = t.match(/(\d+(?:\.\d+)?)\s*(years?|yrs?)/); years = ym ? parseFloat(ym[1]) : 0;
  var rm = t.match(/(\d+(?:\.\d+)?)\s*%/), rate = rm ? parseFloat(rm[1]) / 100 : 0;
  // "how long to save $500 if I save $25 a week"
  m = t.match(/(?:how long|how many (?:weeks|months|days)).*?\$?\s*(\d+(?:\.\d+)?k?)\b.*?\$?\s*(\d+(?:\.\d+)?k?)\s*(?:dollars?\s*)?(?:a|an|per|every|each|\/)\s*(day|week|month)/);
  if(m){
    var goal = num(m[1]), each = num(m[2]), unit = m[3];
    if(each > goal){ var g = goal; goal = each; each = g; }
    if(goal > 0 && each > 0){
      var n = Math.ceil(goal / each);
      return { say: ['Saving ' + usd(each) + ' a ' + unit + ', you reach ' + usd(goal) + ' in ' + n + ' ' + unit + (n === 1 ? '' : 's') + '.',
        'Make it faster: earn a little more each ' + unit + ' (the First $100 Plan shows how), or cut your biggest overspend first.'],
        links: [['/tools/first100/', 'First $100 Plan'], ['/tools/budget/', 'Budget & savings planner']], next: ['How do I make money as a teen?'] };
    }
  }
  // "save $20 a week (for 5 years) (at 7%)"
  m = t.match(/\$?\s*(\d+(?:\.\d+)?k?)\s*(?:dollars?\s*|bucks\s*)?(?:a|an|per|every|each|\/)\s*(day|daily|week|weekly|wk|month|monthly|mo|year|yearly)\b/);
  if(m && /sav|put|invest|keep|spend|cost|pay|earn|make|get|cut/.test(t)){
    var amt = num(m[1]), pm = amt * PER[m[2]], yr = pm * 12, spend = /spend|cost|pay|cut|habit|coffee|snack/.test(t) && !/sav|invest/.test(t);
    var out = [usd(amt) + ' a ' + m[2].replace(/ly$/, '').replace(/^dai$/, 'day').replace(/^wk$/, 'week').replace(/^mo$/, 'month') + ' is ' + usd(yr) + ' a year.'];
    var y = years || 10, r = rate || .07;
    if(spend) out.push('My take: cut it in half this month. That\'s money you could keep instead. Invested at 7% a year (not guaranteed), ' + usd(yr) + ' a year grows to about ' + usd(fv(pm, .07, 10)) + ' in 10 years.');
    else {
      if(years) out.push('In ' + years + ' year' + (years === 1 ? '' : 's') + ' you put in ' + usd(pm * 12 * years) + '.');
      out.push((rate ? 'At ' + Math.round(rate * 1000) / 10 + '% a year' : 'If you invest it and it grows 7% a year (not guaranteed, it can go down too)') +
        ', after ' + y + ' years you\'d have about ' + usd(fv(pm, r, y)) + ' (you put in ' + usd(pm * 12 * y) + ').');
      out.push('That extra is compound interest: your money earning money.');
    }
    return { say: out, links: [['/learn/#money', 'Lesson 1: Your money'], ['/tools/money-plan/', 'Money plan']], next: ['What is compound interest?', 'Where should I keep my savings?'] };
  }
  // "$1000 at 5% for 10 years"
  m = t.match(/\$?\s*(\d+(?:\.\d+)?k?)\b[^%]*?(?:at|with|earning|for)\s*(\d+(?:\.\d+)?)\s*%/);
  if(m && years){
    var p = num(m[1]), rr = parseFloat(m[2]) / 100, f = p * Math.pow(1 + rr, years);
    return { say: [usd(p) + ' growing ' + m[2] + '% a year for ' + years + ' years becomes about ' + usd(f) + '.',
      'Rule of 72: at ' + m[2] + '%, money doubles about every ' + Math.round(72 / parseFloat(m[2]) * 10) / 10 + ' years.'],
      links: [['/learn/#money', 'Lesson 1: Compound interest']], next: ['What is inflation?'] };
  }
  // "charge $15 per job, 8 jobs" / "if I sell 20 at $5"
  m = t.match(/\b(?:sell|sold|make|bake|do)\s+(\d+)\s+[a-z ]{0,24}?\b(?:at|for)\s*\$\s*(\d+(?:\.\d+)?)/);
  if(m){ var c0 = parseFloat(m[1]), p0 = parseFloat(m[2]);
    if(c0 > 0 && p0 > 0) return { say: [c0 + ' × ' + usd(p0) + ' = ' + usd(c0 * p0) + ' before costs.',
      'Now take away what you spent on supplies. If ingredients cost ' + usd(p0 * c0 * .3) + ', your profit is ' + usd(p0 * c0 * .7) + '. Work out your cost per item so you know your real profit.'],
      links: [['/tools/business-plan/', 'Business plan & pricing']], next: ['How should I price my work?', 'How do I get my first customer?'] }; }
  m = t.match(/(\d+)\s*(?:jobs?|customers?|clients?|items?|cups?|sales?|lawns?|dogs?|walks?|hours?)\b.*?\$\s*(\d+(?:\.\d+)?)/) || t.match(/\$\s*(\d+(?:\.\d+)?)\s*(?:each|a job|per job|an hour|per hour|a pop|per)\b.*?(\d+)\s*(?:jobs?|customers?|clients?|items?|times|hours?|a week)?/);
  if(m && /charge|sell|price|make|earn|jobs?|customers?|hour/.test(t)){
    var a = parseFloat(m[1]), b = parseFloat(m[2]), price = /^\d+(\.\d+)?$/.test(m[1]) && t.indexOf('$' + m[1]) >= 0 ? a : b, count = price === a ? b : a;
    if(price > 0 && count > 0) return { say: [count + ' × ' + usd(price) + ' = ' + usd(count * price) + ' before costs.',
      'Take away what each job costs you (supplies, travel) to see your profit. Most new sellers charge too little, so test a slightly higher price with your next customer.'],
      links: [['/tools/business-plan/', 'Business plan & pricing'], ['/tools/first100/', 'First $100 Plan']], next: ['How should I price my work?'] };
  }
  return null;
}

/* ---------- 3. Short answers in Sharp's own words ---------- */
var ANS = [
  [/\b(get rich|rich|millionaire|wealthy)\b/i,
   ['Forget get-rich-quick: it doesn\'t exist, and anyone selling it is lying. The real recipe: earn money, spend less than you earn, and invest the gap for a long time. Time is your superpower as a teen.',
    'Start earning now with a small business, and save part of every dollar. $20 a week from age 14 adds up to a lot by 30.'],
   [['/tools/first100/', 'First $100 Plan'], ['/learn/#money', 'Lesson 1: Your money']], ['If I save $20 a week for 16 years?', 'How do I make money as a teen?']],
  [/\b(business plan|plan my business|plan for my business)\b/i,
   ['Write one page, not twenty: who your customer is, what problem you solve, your price, what each sale costs you, and how you\'ll find your first 10 customers.',
    'The Business plan & pricing tool works out the numbers for you.'],
   [['/tools/business-plan/', 'Business plan & pricing'], ['/tools/idea-check/', 'Idea check']], ['How should I price my work?']],
  [/\b(make|earn|get)\b.*\b(money|cash|\$)|business for|year old|good business|side hustle|\bjob\b.*\bteen|teen.*\b(job|money)|business ideas?|what business|first \$?100/i,
   ['Start a service, not a product. Pick one people near you already pay for: dog walking, lawn care, babysitting, tutoring, car washing, or selling baked goods. You need almost no money to start.',
    'Pick one, set a price, and message 5 people you know today. The First $100 Plan works out your price, how many jobs you need and how many weeks it takes.'],
   [['/tools/first100/', 'First $100 Plan'], ['/tools/idea-check/', 'Idea check']], ['How should I price my work?', 'How do I get my first customer?']],
  [/\b(price|pricing|charge|how much should i (ask|charge))\b/i,
   ['You\'re probably charging too little. Find three numbers: what a job costs you, what others nearby charge, and how much the result is worth to the customer. Price near what others charge, never below your cost.',
    'Charge for the result, not just your time. Most beginners underprice, so if everyone says yes straight away, raise it a little.'],
   [['/learn/#business', 'Lesson 4: Pricing'], ['/tools/business-plan/', 'Business plan & pricing']], ['If I charge $15 a job and do 8 jobs?', 'How do I get my first customer?']],
  [/\b(first|get|find|more)\b.*\b(customers?|clients?|buyers?)\b|\bsell\b|\bsales?\b|\bhow do i sell\b/i,
   ['Don\'t start with ads or strangers. Your first customers are people you already know: family, neighbours, family friends. Send a short message: what you do, the price, and one easy question like "Want me to do Saturday?"',
    'When you talk to them, ask about their problem first, then connect your offer to their words. Say the price, ask, and stop talking.'],
   [['/tools/first100/', 'First $100 Plan (Make the sale)'], ['/learn/#mkt-channels', 'Lesson 11: Getting customers']], ['What do I say if they say "I need to think about it"?']],
  [/think about it|not sure|too expensive|hesitat|objection|they said no/i,
   ['Don\'t argue. Ask what they\'re unsure about: "Totally fair. What part are you thinking about?" Their answer tells you if it\'s the price, the timing, or trust.',
    'Then answer that one thing. If it\'s still a no, thank them. You\'re looking for a fit, not to convince everyone.'],
   [['/tools/first100/', 'First $100 Plan (Make the sale)'], ['/learn/#persuasion', 'Persuasion lesson']], ['How should I price my work?']],
  [/\b(save|saving|savings)\b.*\b(money|more|how)|\bhow (do|can) i save\b|spend less|stop spending/i,
   ['Save first, spend second. No exceptions. The moment money comes in, move your savings out before you spend anything. Then live on what\'s left.',
    'Track every dollar for one month, find your biggest overspend, and cut that first. One change a week is enough.'],
   [['/tools/budget/', 'Budget & savings planner'], ['/learn/#money', 'Lesson 1: Your money']], ['If I save $20 a week, how much in a year?', 'What is a budget?']],
  [/\bbudget/i,
   ['You need one. A budget is a plan for your money before you spend it. A common start is 50/30/20: 50% needs, 30% wants, 20% savings.',
    'Track one month first so the plan uses real numbers, not guesses.'],
   [['/tools/budget/', 'Budget & savings planner']], ['How do I save money?']],
  [/compound|interest|rule of 72/i,
   ['Start now: time matters more than how much you put in. Compound interest means your money earns money, then that money earns money too. It starts slow and speeds up.',
    'Example: $10,000 at 7% for 30 years becomes about $76,000. Rule of 72: divide 72 by the rate to see how many years it takes to double. It works against you on debt too.'],
   [['/learn/#money', 'Lesson 1: Compound interest']], ['If I save $50 a month for 10 years?']],
  [/\b(crypto|bitcoin|ethereum|nft|meme ?coin|dogecoin)\b/i,
   ['My take: don\'t put money you need into crypto. Prices can drop 50% or more in weeks, and many coins go to zero. Treat it as the riskiest kind of investing, not a way to get rich fast.',
    'If you ever try it, only use money you could lose completely, and never trust anyone promising guaranteed returns: that\'s a scam sign.'],
   [['/learn/#investing', 'Lesson 2: Investing']], ['What is a stock?']],
  [/\b(invest|investing|stocks?|shares|index fund|etf|crypto|bitcoin)\b/i,
   ['Yes, invest, but only after you have an emergency fund. A stock is a tiny piece of one company. Investing means buying things that can grow, like a small piece of many companies through an index fund. Higher possible returns always come with more risk: it can go down.',
    'Only invest money you won\'t need for years, spread it out, and keep an emergency fund first. Under 18, you need a parent to open the account.'],
   [['/learn/#investing', 'Lesson 2: Investing']], ['What is compound interest?']],
  [/emergency fund|rainy day|where (should|do) i (keep|put) (my )?(savings|money)|savings account|bank account/i,
   ['Not under your bed. Keep savings in an insured savings account that pays interest. Build an emergency fund first: enough to cover a few months of your costs.',
    'That money isn\'t for investing. Its job is to stop a surprise cost from turning into debt.'],
   [['/learn/#money', 'Lesson 1: Emergency fund']], ['How do I save money?']],
  [/\b(debt|loan|credit card|credit score|borrow)\b/i,
   ['Avoid credit card debt, full stop. Debt is only worth it if what you buy earns or saves more than the interest costs. Credit cards often charge 20–30% a year, so pay those off first.',
    'Paying off a 24% card is like a guaranteed 24% return.'],
   [['/learn/#money', 'Lesson 1: Debt']], ['What is compound interest?']],
  [/inflation/i,
   ['Inflation is prices going up over time, so each dollar buys less. At 3% a year, $100 buys about $74 worth of today\'s things in 10 years.',
    'That\'s why long-term money should be invested, not left in a 0% account.'],
   [['/learn/#money', 'Lesson 1: Inflation']], ['What is investing?']],
  [/cash ?flow/i,
   ['Cash flow is when money actually comes in and goes out. Profit is on paper; cash pays the bills.',
    'Example: you do $200 of jobs this month but customers pay next month. You made a profit, but you have no cash for supplies. Get paid on the day when you can.'],
   [['/learn/#business', 'Lesson 4: Cash flow is not profit']], ['What is revenue?']],
  [/\b(profit|revenue|margin|break ?even)\b/i,
   ['Revenue is all the money coming in. Profit is what\'s left after costs. A business can have lots of revenue and still lose money.',
    'Know your profit per job: price minus what that job costs you. That\'s the number that matters.'],
   [['/learn/#business', 'Lesson 4: How a business makes money']], ['How should I price my work?']],
  [/\b(market|marketing|advertis|promote|social media|tiktok|instagram|followers|post|video)\b/i,
   ['Stop trying to reach everyone. Pick one type of customer, then show up where they already are with one clear message and one ask.',
    'For videos: hook in the first 2 seconds, show the result, end with one action. Post on a schedule and count what works.'],
   [['/learn/#mkt-basics', 'Lesson 10: Marketing basics'], ['/learn/#mkt-social', 'Lesson 14: Social media']], ['How do I get my first customer?']],
  [/negotiat|haggle|ask for a raise|deal/i,
   ['Never walk in without a plan. Write down four numbers: what you want, what you\'d be happy with, your walk-away point, and your backup plan if it fails.',
    'Ask what they need, not just what they say. Talk about interests, not positions.'],
   [['/learn/#negotiation', 'Lesson 15: Negotiation'], ['/tools/negotiation/', 'Negotiation prep']], []],
  [/\b(investors?|pitch|funding|raise money|valuation|shark tank)\b/i,
   ['You probably don\'t need investors yet. Most young businesses don\'t: start small and use your own sales. If you do pitch, show the problem, real customers, and the numbers in under 2 minutes.',
    'Investors take a part of your business, so only take money that helps you grow faster than you could alone.'],
   [['/learn/#funding', 'Lesson 3: Funding'], ['/tools/investors/', 'Investor pressure drill']], []],
  [/\b(ai|chatgpt|claude|automat)\b/i,
   ['Use AI, but never trust it blindly. It\'s great for first drafts, ideas and boring tasks, but it makes confident mistakes. Always check numbers and facts yourself.',
    'Start with one task you do every week and let AI help with just that.'],
   [['/learn/#ai-at-work', 'Lesson 8: AI at work'], ['/tools/ai/', 'AI at work tools']], []],
  [/\b(sharp|this app|sharp'?s plans?|paid plans?|pay(ing)? for (the )?plans?|worth (it|paying)|free trial|learner|builder|founder|upgrade|subscription)\b/i,
   ['All of Sharp\'s lessons and tools are free. Paid plans add more Cherry and the full courses: Learner $19.99, Builder $29.99, Founder $74.99, paid once. There\'s a 3-day free trial with no card.'],
   [['/pricing/', 'Pricing']], []]
];
function short(q){ for(var i = 0; i < ANS.length; i++) if(ANS[i][0].test(q)) return { say: ANS[i][1], links: ANS[i][2], next: ANS[i][3] }; return null; }

/* ---------- 4. Search the lessons ---------- */
var DF = null;
function prep(){
  DF = {};
  DOCS.forEach(function(d){
    d._t = words(d.text); d._h = words(d.title); var seen = {};
    d._t.concat(d._h).forEach(function(w){ if(!seen[w]){ seen[w] = 1; DF[w] = (DF[w] || 0) + 1; } });
  });
}
function search(q){
  var qs = words(q); if(!qs.length || !DOCS) return [];
  if(!DF) prep();
  var plans = /\b(sharp|subscription|learner|builder|founder)\b/i.test(q);
  // Rare words count more (a lesson that mentions "price" beats one that only says "work").
  var idf = qs.map(function(w){ return Math.log(1 + DOCS.length / (1 + (DF[w] || 0))); }), top = idf.reduce(function(a, b){ return a + b; }, 0);
  return DOCS.map(function(d){
    var s = 0;
    qs.forEach(function(w, k){
      var n = 0; for(var i = 0; i < d._t.length; i++) if(d._t[i] === w) n++;
      if(d._h.indexOf(w) >= 0) s += idf[k] * 2;
      if(n) s += idf[k] * (1 + Math.min(n, 4) * .25);
    });
    if(d.url === '/pricing/' && !plans) s = 0;
    return { d: d, s: s / top };
  }).filter(function(r){ return r.s >= .9; }).sort(function(a, b){ return b.s - a.s; })
    .filter(function(r, i, all){ for(var j = 0; j < i; j++) if(all[j].d.url === r.d.url) return false; return true; });
}
function sentences(text){ return text.replace(/^>\s*/, '').replace(/^The 30-second version\s*/, '').replace(/[←→][^.]*$/, '').split(/(?<=[.!?])\s+/).filter(function(s){ return s.length > 35 && s.indexOf(' / ') < 0; }); }
function best(text, q, n){
  var qs = words(q), parts = sentences(text);
  var scored = parts.map(function(p, i){ var w = words(p), s = 0; qs.forEach(function(x){ if(w.indexOf(x) >= 0) s++; }); return { p: p, i: i, s: s - i * .01 }; });
  var pick = scored.slice().sort(function(a, b){ return b.s - a.s; }).slice(0, n || 2).sort(function(a, b){ return a.i - b.i; });
  return pick.map(function(x){ return x.p.length > 260 ? x.p.slice(0, 257) + '…' : x.p; });
}

/* ---------- Reply ---------- */
function more(){ return /^(more|tell me more|go on|and\??|how\??|why\??|example\??|explain|what do you mean\??|keep going|continue|like what\??)[\s?!.]*$/i; }
function reply(q){
  var t = q.trim(), r;
  for(var i = 0; i < TALK.length; i++) if(TALK[i][0].test(t)) return { say: TALK[i][1], next: TALK[i][2] };
  if(more().test(t)){
    if(!last) return { say: ['More about what? Ask me about saving, pricing, your first customer or investing.'], next: SUGGEST.slice(0, 2) };
    var h = search(last.q).filter(function(x){ return !last.seen[x.d.title] && x.s >= 1.3; })[0];
    if(h){ last.seen[h.d.title] = 1; return { say: best(h.d.text, last.q, 3), links: [[h.d.url, h.d.title]], next: ['Tell me more'] }; }
    return { say: ['That\'s the main idea. The lesson has the full details and a quiz to test yourself.'], links: last.links, next: SUGGEST.slice(0, 2) };
  }
  if(/make me a first \$?100 plan/i.test(t)) return { say: ['Open the First $100 Plan, pick a starter business and your free hours. I\'ll work out the price, the jobs and the weeks, and give you the message to send.'], links: [['/tools/first100/', 'First $100 Plan']], next: [] };
  r = maths(t) || short(t);
  if(!r){
    var hits = search(t);
    if(!hits.length) return { say: ['I don\'t know that one yet, and I\'d rather say so than guess. I\'m best at money and business: saving, pricing, getting customers, investing.', 'You can also call me and ask out loud.'], next: SUGGEST.slice(0, 3) };
    r = { say: best(hits[0].d.text, t, 2), links: hits.slice(0, 2).map(function(x){ return [x.d.url, x.d.title]; }), next: ['Tell me more'] };
  }
  last = { q: t, links: r.links, seen: {} };
  (r.links || []).forEach(function(l){ last.seen[l[1]] = 1; });
  return r;
}

function say(text, who){ var m = el('div', 'co-msg ' + who, null, list); el('p', null, text, m); list.scrollTop = list.scrollHeight; return m; }
function chips(next){
  chipsBox.textContent = '';
  (next || []).forEach(function(s){ var b = el('button', 'co-chip', s, chipsBox); b.type = 'button'; b.addEventListener('click', function(){ answer(s); }); });
  chipsBox.hidden = !(next && next.length);
}
function answer(q){
  say(q, 'me'); chipsBox.hidden = true;
  var dots = el('div', 'co-msg ch co-dots', null, list); dots.setAttribute('aria-label', 'Cherry is typing'); el('i', null, null, dots); el('i', null, null, dots); el('i', null, null, dots);
  list.scrollTop = list.scrollHeight;
  var wait = DOCS ? Promise.resolve() : loading;
  Promise.all([wait, new Promise(function(ok){ setTimeout(ok, 450); })]).then(function(){
    dots.remove();
    var r = reply(q), m = el('div', 'co-msg ch', null, list);
    r.say.forEach(function(s){ el('p', null, s, m); });
    (r.links || []).forEach(function(l){ var c = el('a', 'co-hit', null, m); c.href = base + l[0].replace(/^\//, ''); el('b', null, l[1], c); });
    chips(r.next); list.scrollTop = list.scrollHeight;
  });
}
var loading;
function build(){
  panel = el('section', 'co-panel', null, document.body); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'co-title'); panel.hidden = true;
  var top = el('div', 'co-top', null, panel);
  el('span', 'ch-face co-face', null, top).setAttribute('aria-hidden', 'true');
  var tt = el('div', null, null, top); el('p', 'co-title', 'Cherry', tt).id = 'co-title'; el('p', 'co-sub', 'Quick answers and money maths from Sharp. Your questions stay on this device.', tt);
  var x = el('button', 'co-x', '✕', top); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.addEventListener('click', close);
  list = el('div', 'co-list', null, panel); list.setAttribute('aria-live', 'polite');
  say('Hi, I\'m Cherry. Ask me about money or starting a business, or give me numbers and I\'ll do the maths.', 'ch');
  chipsBox = el('div', 'co-chips', null, panel); chips(SUGGEST);
  var f = el('form', 'co-form', null, panel);
  input = el('input', null, null, f); input.type = 'text'; input.maxLength = 200; input.placeholder = 'Ask Cherry…'; input.setAttribute('aria-label', 'Ask Cherry a question');
  var go = el('button', null, 'Ask', f); go.type = 'submit';
  f.addEventListener('submit', function(e){ e.preventDefault(); var q = input.value.trim(); if(!q) return; input.value = ''; answer(q); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && !panel.hidden) close(); });
  loading = fetch(base + 'assets/cherry-index.json').then(function(r){ return r.json(); }).then(function(d){ DOCS = d; }).catch(function(){ DOCS = []; });
}
function open(){ if(!panel) build(); panel.hidden = false; input.focus(); }
function close(){ panel.hidden = true; var b = document.querySelector('.vo-head, .vo-launch'); if(b) b.focus(); }
window.SharpCherryOffline = { open: open, ask: function(q){ open(); answer(q); }, _reply: reply, _load: function(d){ DOCS = d; } };
})();
