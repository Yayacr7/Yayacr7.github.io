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
   ['That feeling is normal. Don\'t let it stop you: everyone starting out feels it, and the ones who win just keep going. Make the first step tiny: one message to one person today. A "no" costs you nothing and teaches you what people want.', 'Want a plan you can finish this week?'], ['Make me a first $100 plan']]
];
// Second replies, so she doesn't repeat herself word for word.
TALK[0][3] = ['Hey again. What do you want to work on: earning, saving or selling?'];
TALK[1][3] = ['Still Cherry. Ask me a money or business question and I\'ll give you my honest take.'];
TALK[2][3] = ['Try me with a real problem: "I want $200 by summer", "how much should I charge for lawn mowing", or "should I invest".'];
TALK[3][3] = ['Good. Go do one thing from that today, then come back and tell me how it went.'];
TALK[4][3] = ['Bye. Do one small thing for your goal before tomorrow.'];
TALK.push([/^(?:i'?m|i am)\s+(1[0-9]|[0-9])(\s*(years?|yrs?)(\s*old)?)?\s*[.!]?$/i,
  ['Great age to start. Pick a service people near you already pay for, like dog walking, lawn care or tutoring, and book one job this week.'], ['How do I make money as a teen?']]);
TALK[6][3] = ['Still a great age. Your biggest edge is time: start small now and you\'ll be years ahead.'];
TALK[5][3] = ['Feeling stuck is normal. Shrink the goal: one $15 job this week. Finish that, and the next one feels easy.', 'What business are you working on? I\'ll give you a first step.'];

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

/* ---------- 4. Search the lessons ---------- */
var DF = null;
function prep(){
  DF = {};
  DOCS.forEach(function(d){
    d._t = words(d.text); d._h = words(d.title); var seen = {};
    d._t.concat(d._h).forEach(function(w){ if(!seen[w]){ seen[w] = 1; DF[w] = (DF[w] || 0) + 1; } });
  });
}
function search(q, all){
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
    .filter(function(r, i, list){ if(all) return true; for(var j = 0; j < i; j++) if(list[j].d.url === r.d.url) return false; return true; });
}
function sentences(text){ return text.replace(/^>\s*/, '').replace(/^The 30-second version\s*/, '').replace(/[←→][^.]*$/, '').split(/(?<=[.!?])\s+/).filter(function(s){ return s.length > 35 && s.indexOf(' / ') < 0; }); }
function best(text, q, n){
  var qs = words(q), parts = sentences(text);
  var scored = parts.map(function(p, i){ var w = words(p), s = 0; qs.forEach(function(x){ if(w.indexOf(x) >= 0) s++; }); return { p: p, i: i, s: s - i * .01 }; });
  var pick = scored.slice().sort(function(a, b){ return b.s - a.s; }).slice(0, n || 2).sort(function(a, b){ return a.i - b.i; });
  return pick.map(function(x){ return x.p.length > 260 ? x.p.slice(0, 257) + '…' : x.p; });
}

/* ---------- 3. Cherry's own answers ----------
   Each topic has different answers for different kinds of question (what / how / should / why / any), several of each.
   USED remembers what she already said in this chat, so she never repeats the same words: she picks a fresh answer,
   then a new passage from the lessons. All in our own words, firm (owner asked), matched to the lessons. */
var USED = {};
function T(id, re, links, next, a){ return { id: id, re: re, links: links, next: next, a: a }; }
var L = { money: ['/learn/#money', 'Lesson 1: Your money'], invest: ['/learn/#investing', 'Lesson 2: Investing'], fund: ['/learn/#funding', 'Lesson 3: Funding'],
  biz: ['/learn/#business', 'Lesson 4: How a business makes money'], ai: ['/learn/#ai-at-work', 'Lesson 8: AI at work'], mkt: ['/learn/#mkt-basics', 'Lesson 10: Marketing basics'],
  chan: ['/learn/#mkt-channels', 'Lesson 11: Getting customers'], social: ['/learn/#mkt-social', 'Lesson 14: Social media'], neg: ['/learn/#negotiation', 'Lesson 15: Negotiation'],
  first: ['/tools/first100/', 'First $100 Plan'], budget: ['/tools/budget/', 'Budget & savings planner'], mplan: ['/tools/money-plan/', 'Money plan'],
  bplan: ['/tools/business-plan/', 'Business plan & pricing'], idea: ['/tools/idea-check/', 'Idea check'], negt: ['/tools/negotiation/', 'Negotiation prep'],
  inv: ['/tools/investors/', 'Investor pressure drill'], pricing: ['/pricing/', 'Pricing'], mkt2: ['/tools/marketing/', 'Marketing calculators'] };
var TOPICS = [
  T('drop', /\bdropship\w*\b/i, [L.first], ['How do I make money as a teen?'], {
    any: [["Not as your first business. Most beginners lose money on ads before they make a sale, and you don't control the product or delivery.", "Start with a service near you instead: you get paid on day one with almost no costs."],
          ["If you try it later, test with a tiny ad budget you can afford to lose, and work out your profit per order after ads and refunds first."]] }),
  T('scam', /\b(scam|pyramid|mlm|forex|get paid to|too good to be true|passive income|course that|guru)\b/i, [L.money], ['How do I make money as a teen?'], {
    should: [["No. If someone needs you to pay first to \"unlock\" earnings, it's a scam. Real businesses pay you for work.", "Rule of thumb: guaranteed returns, pressure to decide now, or \"recruit your friends\" means walk away."]],
    what: [["A scam promises easy money and takes yours. The signs: you pay first, results are \"guaranteed\", and they rush you.", "If it sounds too good to be true, it is. Tell a parent before you send anyone money."]],
    any: [["Stay away. Most \"make money online fast\" offers make money for the person selling them, not for you.", "A boring service business beats every get-rich scheme: someone pays you, you do the job, you keep the profit."],
          ["Here's my test: can you explain who pays you and why? If the only answer is \"other people who join\", it's a pyramid. Skip it."]] }),
  T('crypto', /\b(crypto|bitcoin|btc|ethereum|eth|nft|meme ?coin|dogecoin|solana)\b/i, [L.invest], ['What is a stock?', 'How do I start investing?'], {
    should: [["No, not with money you need. Crypto can drop 50% or more in weeks, and many coins go to zero.", "If you ever try it, use only money you could lose completely, and only after you have savings and an emergency fund."]],
    what: [["Crypto is digital money with no bank or government behind it. Its price moves on what people will pay, which is why it swings so wildly.", "My view: it's the riskiest kind of investing. Learn it, but don't bet on it."]],
    why: [["Because nothing holds the price up except demand. When people get scared, it can fall 50% fast, and there's no company profit underneath it like a stock has."]],
    any: [["My take: skip it for now. Build an emergency fund and learn index funds first. That's where most long-term wealth comes from.", "Anyone promising crypto profits is selling something."]] }),
  T('rich', /\b(get rich|rich|millionaire|wealthy|financial freedom)\b/i, [L.first, L.money], ['If I save $20 a week for 16 years?', 'How do I make money as a teen?'], {
    how: [["Earn, keep, grow. Earn money with a small business, keep more than you spend, and invest the gap for a long time.", "Time is your superpower: $20 a week from 14 to 30 grows to tens of thousands if it's invested."],
          ["Skills first. The people who get rich learn to sell, save and invest early. Start with your first $100 this month."]],
    should: [["Wanting to be rich is fine. Aim it at something: what would you do with $10,000? A clear goal is easier to save for."]],
    any: [["Forget get-rich-quick: it doesn't exist, and anyone selling it is lying. Earn money, spend less than you earn, invest the gap for years."],
          ["The boring truth wins: one small business, a savings habit, and patience. Start the business part this week."]] }),
  T('bplan', /\b(business plan|plan my business|plan for my business|plan a business)\b/i, [L.bplan, L.idea], ['How should I price my work?'], {
    what: [["A business plan is one page that answers: who buys, what problem you fix, your price, your cost per sale, and how you'll find the first 10 customers."]],
    should: [["Yes, but one page, not twenty. Spend an hour on it, then go talk to customers. Talking teaches you more than planning."]],
    any: [["Write one page: customer, problem, price, cost per sale, first 10 customers. The Business plan & pricing tool works out the numbers for you."],
          ["Test before you write: ask 5 possible customers if they'd pay. Then plan around what they said, not what you guessed."]] }),
  T('name', /\b(name|logo|brand(ing)?)\b.*\b(business|company|brand)\b|\bbusiness name\b|\blogo\b/i, [L.mkt], ['How do I get my first customer?'], {
    any: [["Don't spend more than an hour on it. Use your name plus what you do, like \"Sam's Dog Walks\". Customers care about the service, not the logo."],
          ["Pick a name people can say and spell after hearing it once. Get your first customers first; you can rebrand later."]] }),
  T('web', /\b(website|web site|online store|shopify|a site for|landing page)\b/i, [L.chan], ['How do I get my first customer?'], {
    should: [["Not yet. For your first 10 customers, a text message and a flyer beat a website. Build one once people are already paying you."]],
    any: [["Skip it for now. Your first customers are people you know; talk to them directly. A simple page helps later so new people can find you."],
          ["If you want one, keep it to one page: what you do, your price, photos of your work, and how to book."]] }),
  T('comp', /\b(competition|competitors?|someone else (already|is)|already (someone|exists|doing)|someone (is )?already|too many people|other kids)\b/i, [L.mkt], ['How should I price my work?'], {
    should: [["Yes, still do it. Competition proves people pay for it. You win by being more reliable or more specific, not by being first."]],
    any: [["Competition is good news: it means there's demand. Beat them on one thing: faster, friendlier, or for a group they ignore."],
          ["Don't compete on price. Compete on trust: show up on time, do great work, and ask happy customers to tell a friend."]] }),
  T('partner', /\b(partner|co-?founder)\b|business with (a |my )?friends?|\bfriend\b.*\b(business|start)\b/i, [L.biz], ['How should I price my work?'], {
    should: [["Only if you both work equally. Write down who does what and how you split money before you earn a dollar. Most friend partnerships fail on that."]],
    any: [["Agree on three things first, in writing: who does what, how you split money, and what happens if one of you quits."]] }),
  T('tax', /\b(tax|taxes|license|licence|legal|permit|insurance|irs|register (my|a) business)\b/i, [L.biz], [], {
    any: [["Ask a parent or a trusted adult about this one: the rules depend on where you live. For small teen jobs it's usually simple, but check.", "Keep a list of every dollar you earn and spend from day one. That makes any tax question easy."]] }),
  T('objection', /think about it|not sure|too expensive|hesitat|objection|they said no|said no|ghost(ed)?|won'?t reply/i, [L.first, ['/learn/#persuasion', 'Persuasion lesson']], ['How should I price my work?'], {
    any: [["Don't argue. Ask: \"Totally fair. What part are you thinking about?\" Their answer tells you if it's price, timing or trust.", "Fix that one thing. If it's still no, thank them. You're looking for a fit, not to convince everyone."],
          ["A no is information. Ask one question: \"What would make this a yes?\" Then stop talking and listen.", "If they say price, offer a smaller version, not a discount."],
          ["Follow up once, two days later, with something useful, like a time slot. Then let it go and ask the next person."]] }),
  T('price', /\b(price|prices|pricing|charge|how much (should|do|can) i (ask|charge|get)|rates?)\b/i, [L.biz, L.bplan], ['If I charge $15 a job and do 8 jobs?', 'How do I get my first customer?'], {
    how: [["Find three numbers: what a job costs you, what others nearby charge, and what it's worth to the customer. Price near the others, never below your cost."],
          ["Start at the local going rate, then raise it $2–5 every time three people in a row say yes without blinking."]],
    should: [["Charge more than you think. Most beginners underprice. If everyone says yes instantly, you're too cheap."],
             ["Don't go cheapest. Cheap prices attract the pickiest customers. Be the reliable one at a fair price."]],
    why: [["Because price is the fastest way to more profit. On a 20% margin, raising price 5% lifts profit 25% if you keep the same customers."]],
    any: [["You're probably charging too little. Charge for the result, not just your time."],
          ["Give two options: a basic price and a bigger one. Most people pick the bigger one more than you'd expect."]] }),
  T('customers', /\b(first|get|find|more|new)\b.*\b(customers?|clients?|buyers?)\b|\bhow do i sell\b|\bsell (my|more)\b|\bget (my )?first (job|sale)\b/i, [L.first, L.chan], ['What do I say if they say "I need to think about it"?'], {
    how: [["Start with people you know: family, neighbours, family friends. Text five today: what you do, the price, and \"Want me to do Saturday?\""],
          ["Ask your first three happy customers for one name each. Referrals are the cheapest customers you'll ever get."],
          ["Put a simple flyer where your customers already are: the neighbourhood board, the local shop, the school newsletter (with a parent's okay)."]],
    any: [["Don't start with ads or strangers. People who already know you say yes fastest.", "When you talk to them, ask about their problem first, then connect your offer to their words. Say the price, ask, and stop talking."],
          ["Make it easy to say yes: one clear offer, one price, one time slot. \"Saturday at 10, $25\" beats \"let me know if you ever need anything.\""]] }),
  T('ideas', /\b(make|earn|get)\b.*\b(money|cash|\$)|business for|year old|good business|side hustle|\bjob\b.*\bteen|teen.*\b(job|money)|business ideas?|(what|which) business|business (is )?best|first \$?100|start (a|my) (business|company)|where (do|should) i start|get started|first step/i, [L.first, L.idea], ['How should I price my work?', 'How do I get my first customer?'], {
    what: [["The best first businesses are services people near you already pay for: dog walking, lawn care, babysitting, tutoring, car washing, baking, or tech help for older people."]],
    how: [["Pick one service, set a price, and message 5 people you know today. That's the whole first step.", "The First $100 Plan works out your price, how many jobs you need and how many weeks it takes."],
          ["Start this week: pick something you're already good at, do the first job for someone you know, and ask them for a referral."]],
    should: [["Yes. Start small this month. A tiny business teaches you more than any class, and it costs almost nothing."]],
    any: [["Start a service, not a product. You need almost no money and you get paid on day one."],
          ["Go with what people already ask you to help with. If neighbours ask you to fix their phone, that's your business."]] }),
  T('buy', /\b(should i buy|should i get (a|an|the|new|this|that|some) (?!loan|credit)|worth buying|can i afford|buy (a|an|the|new)|spend (my )?(money )?on|want to buy)\b/i, [L.budget, L.mplan], ['How do I save money?'], {
    should: [["Wait 48 hours first. If you still want it, it fits your budget, and you can pay cash, buy it. If you'd need credit, don't."],
             ["Ask: will I use it every week? If not, skip it. Things you use daily are worth paying for; things you'll forget aren't."]],
    any: [["Use the 48-hour rule: wait two days before any purchase over $30. Most of the urge goes away."],
          ["Work out the hours: if it costs $90 and you earn $15 an hour, that's 6 hours of work. Still worth it?"]] }),
  T('goal', /\bsave (up )?for (a|an|my|the)\b|saving for\b|\bgoal\b/i, [L.budget, L.first], ['If I save $20 a week, how much in a year?'], {
    how: [["Take the price, pick a date, and divide. A $300 phone in 12 weeks is $25 a week. Then move $25 out the day you get paid."]],
    any: [["Make the goal specific: what, how much, by when. Then automate it so the saving happens before you can spend it."],
          ["Save faster by earning, not just cutting. Two extra jobs a week can halve the time to your goal."]] }),
  T('save', /\b(save|saving|savings)\b|spend less|stop spending|overspend/i, [L.budget, L.money], ['If I save $20 a week, how much in a year?', 'What is a budget?'], {
    how: [["Save first, spend second. The moment money comes in, move your savings out. Then live on what's left."],
          ["Track every dollar for one month, find your biggest overspend, and cut that first. One change a week is enough."],
          ["Make it automatic: a separate savings account you don't carry a card for. Out of sight, out of mind."]],
    why: [["So a surprise cost doesn't become debt, and so your money can grow. Savings are your freedom fund."]],
    any: [["Pick a fixed amount, even $5 a week, and never skip it. The habit matters more than the amount."],
          ["Cut the small daily spends first. $5 a day is over $1,800 a year."]] }),
  T('budget', /\bbudget|50\/30\/20/i, [L.budget], ['How do I save money?'], {
    what: [["A budget is a plan for your money before you spend it. A common start is 50/30/20: 50% needs, 30% wants, 20% savings."]],
    how: [["Track one month first so the plan uses real numbers. Then set a limit for each type of spending and check it every week."]],
    any: [["You need one. Even a simple list of what comes in and what goes out shows you where your money really goes."],
          ["Keep it simple: one savings number, one fun-money number, everything else is needs. Check it every Sunday."]] }),
  T('compound', /compound|interest|rule of 72/i, [L.money], ['If I save $50 a month for 10 years?'], {
    what: [["Compound interest means your money earns money, then that money earns money too. It starts slow and speeds up."]],
    why: [["Because growth stacks: each year you earn on everything so far, not just what you put in. That's why starting at 15 beats starting at 25."]],
    any: [["Start now: time matters more than how much you put in. $10,000 at 7% for 30 years becomes about $76,000."],
          ["Rule of 72: divide 72 by the rate to see how many years it takes to double. At 8%, about 9 years. It works against you on debt too."]] }),
  T('invest', /\b(invest|investing|stocks?|shares|index fund|etf|stock market)\b/i, [L.invest], ['What is compound interest?'], {
    what: [["A stock is a tiny piece of one company. An index fund holds small pieces of hundreds of companies, so one bad company can't sink you."]],
    how: [["Build an emergency fund first. Then, with a parent, open an account and put a little into a low-cost index fund every month. Don't touch it for years."]],
    should: [["Yes, invest, but only after you have an emergency fund, and only money you won't need for 5+ years."]],
    why: [["Because cash loses value to inflation. Long-term, owning pieces of companies has grown faster than a savings account, though it can drop along the way."]],
    any: [["Spread it out. One index fund beats picking single stocks for almost everyone.", "Under 18 you need a parent to open the account."]] }),
  T('bank', /emergency fund|rainy day|where (should|do) i (keep|put)|savings account|bank account|open an account/i, [L.money], ['How do I save money?'], {
    any: [["Not under your bed. Keep savings in an insured savings account that pays interest. A parent can help you open one."],
          ["Build an emergency fund first: enough to cover a few months of your costs. Its only job is to stop a surprise from turning into debt."]] }),
  T('debt', /\b(debt|loan|credit card|credit score|borrow|owe)\b/i, [L.money], ['What is compound interest?'], {
    should: [["No, avoid credit card debt. Borrow only if what you buy earns or saves more than the interest costs."]],
    what: [["Debt is borrowed money you pay back with interest. Credit cards often charge 20–30% a year, which is brutal."]],
    any: [["Pay the most expensive debt first. Paying off a 24% card is like a guaranteed 24% return."],
          ["Never borrow for wants. Borrow, if ever, only for something that pays you back."]] }),
  T('inflation', /inflation|prices (go|going) up/i, [L.money], ['What is investing?'], {
    any: [["Inflation is prices going up over time, so each dollar buys less. At 3% a year, $100 buys about $74 of today's things in 10 years."],
          ["It's why long-term money should be invested, not left sitting at 0%."]] }),
  T('cash', /cash ?flow/i, [L.biz], ['What is revenue?'], {
    any: [["Cash flow is when money actually comes in and goes out. Profit is on paper; cash pays the bills."],
          ["Get paid on the day you do the job. Waiting for money is how small businesses run out of cash."]] }),
  T('profit', /\b(profit|revenue|margin|break ?even|costs?)\b/i, [L.biz], ['How should I price my work?'], {
    what: [["Revenue is all the money coming in. Profit is what's left after costs. A business can have lots of revenue and still lose money."]],
    how: [["Raise profit three ways: charge more, cut the cost of each job, or do more jobs. Price is usually the fastest."]],
    any: [["Know your profit per job: price minus what that job costs you. That's the number that matters."]] }),
  T('marketing', /\b(market|marketing|advertis\w*|promote|social media|tiktok|instagram|youtube|followers|post|video|flyer)\b/i, [L.mkt, L.social], ['How do I get my first customer?'], {
    how: [["Pick one type of customer, then show up where they already are with one clear message and one ask."],
          ["For videos: hook in the first 2 seconds, show the result, end with one action. Post on a schedule and count what works."]],
    should: [["Yes, but one platform, not five. Pick where your customers actually are and post there three times a week."]],
    any: [["Stop trying to reach everyone. A message for \"busy dog owners on my street\" beats one for \"everyone\"."],
          ["Show, don't tell: before-and-after photos and happy-customer quotes sell better than any slogan."]] }),
  T('neg', /negotiat|haggle|ask for a raise|\bdeal\b|lower (the|their) price/i, [L.neg, L.negt], [], {
    any: [["Never walk in without a plan. Write down what you want, what you'd accept, your walk-away point, and your backup plan."],
          ["Ask what they need, not just what they say. Talk about interests, not positions. Then let them speak first on price."]] }),
  T('investors', /\b(investors?|pitch|funding|raise money|valuation|shark tank|venture)\b/i, [L.fund, L.inv], [], {
    should: [["Not yet. Most young businesses don't need investors. Grow from your own sales first; you keep all of it."]],
    how: [["Show the problem, real paying customers, and your numbers in under 2 minutes. Investors back proof, not ideas."]],
    any: [["Investors take part of your business, so only take money that helps you grow faster than you could alone."]] }),
  T('ai', /\b(ai|chatgpt|claude|gemini|automat\w*)\b/i, [L.ai, ['/tools/ai/', 'AI at work tools']], [], {
    any: [["Use AI, but never trust it blindly. It's great for first drafts and boring tasks, and it makes confident mistakes."],
          ["Start with one weekly task, like writing your customer messages, and let AI help with just that. Check every number yourself."]] }),
  T('time', /\b(no time|too busy|balance (it|school|business)|work.life balance|with school|school and|homework and)\b/i, [L.first], [], {
    any: [["School comes first. Pick a business that fits 3–4 hours a week, like weekend lawn jobs or one babysitting night."],
          ["Block one fixed time each week for your business, like Saturday 10–12. Small and steady beats big and random."]] }),
  T('sharp', /\b(sharp|this app|sharp'?s plans?|paid plans?|pay(ing)? for (the )?plans?|worth (it|paying)|free trial|learner|builder|founder|upgrade|subscription)\b/i, [L.pricing], [], {
    any: [["All of Sharp's lessons and tools are free. Paid plans add more Cherry and the full courses: Learner $19.99, Builder $29.99, Founder $74.99, paid once. There's a 3-day free trial with no card."]] })
];
function qtype(q){
  if(/^why\b|\bwhy (is|do|does|should|would)\b/i.test(q)) return 'why';
  if(/^(what|whats|what's|which|define)\b|\bmeaning of\b/i.test(q)) return 'what';
  if(/^how\b/i.test(q)) return 'how';
  if(/\b(should (i|we)|is it (a )?(good|bad|worth|smart|safe)|worth it|good idea|do you think|would you|can i afford)\b/i.test(q)) return 'should';
  if(/\bwhat (is|are|does)\b/i.test(q)) return 'what';
  if(/^how\b|\bhow (do|can|should|to|would)\b|\bways to\b|\btips?\b|\bsteps?\b/i.test(q)) return 'how';
  return 'any';
}
// The first answer she hasn't used yet: the question's own kind first, then any other kind.
function fresh(t, kind){
  var order = [kind, 'any', 'how', 'what', 'should'];
  for(var i = 0; i < order.length; i++){
    var list = t.a[order[i]] || [];
    for(var j = 0; j < list.length; j++){ var k = t.id + ':' + order[i] + j; if(!USED[k]){ USED[k] = 1; return list[j]; } }
  }
  return null;
}

/* Starter businesses: same prices as the First $100 Plan (tools/first100/first100.js). Keep them in sync. */
var BIZ = [
  [/\b(lawn|mow\w*|yard|garden\w*|leaves|raking)\b/i, 'lawn care', 'mowing a yard', 25, 2, 20, 40, 'neighbours with big yards, older neighbours and busy families', 'Offer every-week mowing. One regular customer is worth ten one-offs.', "Who looks after your yard right now?"],
  [/\b(dog|dogs|pet|pets|walking dogs|dog walk\w*)\b/i, 'dog walking', 'a 30-minute walk', 15, 0, 10, 20, 'dog owners who work all day, and families going away', 'Meet the dog first, free. Owners book people their dog already likes.', "What does your dog do while you're at work?"],
  [/\b(car wash\w*|wash\w* cars?|detail\w*)\b/i, 'car washing', 'washing a car inside and out', 20, 3, 15, 35, 'neighbours, family friends and people who drive for work', 'Take before-and-after photos every time (with permission). They sell the next job.', "How do you usually get your car cleaned?"],
  [/\btutor\w*\b/i, 'tutoring', 'a 1-hour session', 15, 0, 12, 25, 'parents of younger kids at your school or in your area', 'Tell parents one thing their child got better at after every session.', "How is homework going for them right now?"],
  [/\b(bak\w*|cookies?|cupcakes?|brownies?|cakes?)\b/i, 'baking', 'a box of a dozen cookies', 12, 4, 10, 18, 'family friends, neighbours and people planning parties', 'Take orders first, then bake. You never waste ingredients that way.', "Is there an event coming up you need treats for?"],
  [/\b(tech help|phone help|set ?up phones?|computer help|fix(ing)? phones?)\b/i, 'tech help', 'setting up a phone, tablet or TV', 20, 0, 15, 30, 'grandparents, older neighbours and busy parents', 'Leave a short written how-to behind. People call back the helper who did that.', "What's confusing about your phone or TV?"],
  [/\b(resell\w*|flip\w*|thrift\w*|sneakers?)\b/i, 'reselling', 'one item bought cheap and sold', 25, 10, 15, 40, "buyers on local selling apps (with a parent's okay)", 'Only buy things you have already seen sell for at least double.', "What are you looking for, and by when?"],
  [/\b(babysit\w*|nanny|childcare)\b/i, 'babysitting', 'a 3-hour evening', 45, 0, 36, 60, 'families you or your parents already know', 'A first-aid course makes parents say yes faster, and lets you charge more.', "Who watches the kids when you go out?"],
  [/\bsocial media (manag\w*|for)|posts? for (shops|businesses)|content for\b/i, 'social posts for local shops', 'a pack of 8 posts', 40, 0, 30, 75, 'small local shops, cafés and salons with quiet pages', 'Make one free sample post for the shop first. Showing beats telling.', "How do new customers find you right now?"]
];
function bizOf(q){ for(var i = 0; i < BIZ.length; i++) if(BIZ[i][0].test(q)) return BIZ[i]; return null; }
function bizReply(q, b){
  var name = b[1], job = b[2], price = b[3], cost = b[4], lo = b[5], hi = b[6], who = b[7], tip = b[8], ask = b[9];
  var per = price - cost, n = Math.ceil(100 / per), cap = name.charAt(0).toUpperCase() + name.slice(1);
  var intent = /\b(pric\w*|charge|how much|rates?|cost)\b/i.test(q) ? 'price' : /\b(customers?|clients?|find|get (people|jobs|work)|sell|advertis\w*|market\w*|flyer)\b/i.test(q) ? 'cust' : /\b(should|start|good idea|worth|can i)\b/i.test(q) ? 'start' : 'plan';
  var opts = {
    price: [["Charge " + usd(price) + " for " + job + ". Most people charge " + usd(lo) + "–" + usd(hi) + ", so " + usd(price) + " is fair for a beginner.",
             (cost ? "Your cost is about " + usd(cost) + ", so you keep " + usd(per) + " a job. " : "") + n + " jobs gets you to $100."],
            ["Once you have 3 happy customers, go up to " + usd(Math.min(hi, price + 5)) + ". Repeat customers rarely mind a small rise when you're reliable."]],
    cust: [["Your best first customers for " + name + ": " + who + ".", tip],
           ["Open with a question, not a pitch. Try: \"" + ask + "\" Then listen, and offer the job in their own words."]],
    start: [["Yes. " + cap + " is a strong first business: about " + usd(price) + " a job, " + n + " jobs to $100, and " + (cost ? "very little" : "nothing") + " to start.", tip],
            ["Do it this week: tell 5 people you know, book one job, and do it brilliantly. Then ask that customer for one referral."]],
    plan: [["My plan for " + name + ": charge " + usd(price) + " for " + job + ", start with " + who + ", and aim for " + n + " jobs to hit $100.", tip],
           ["Next step: open the First $100 Plan and pick " + name + ". It gives you the message to send and a 30-day checklist."]]
  };
  var order = [intent, 'plan', 'start', 'price', 'cust'];
  for(var i = 0; i < order.length; i++) for(var j = 0; j < opts[order[i]].length; j++){
    var k = 'biz:' + name + ':' + order[i] + j;
    if(!USED[k]){ USED[k] = 1; return { say: opts[order[i]][j], links: [L.first], next: ['How do I get my first customer for ' + name + '?'] }; }
  }
  return null;
}

/* Lesson passages she hasn't quoted yet in this chat. */
var SAID = {};
function freshLesson(q, intro, urls){
  var hits = search(q, true).filter(function(h){ return !urls || urls.some(function(u){ return h.d.url === u[0]; }); });
  for(var i = 0; i < hits.length && i < 8; i++){
    var s = best(hits[i].d.text, q, 3).filter(function(x){ return !SAID[x] && !/employer|mortgage|401|\bIRA\b|tax-advantaged|pension|salary|payroll/i.test(x); }).slice(0, 2);
    if(s.length){ s.forEach(function(x){ SAID[x] = 1; }); return { say: (intro ? [intro] : []).concat(s), links: [[hits[i].d.url, hits[i].d.title]] }; }
  }
  return null;
}
// Specific topics win over broad ones ("should I get investors" is about investors, not shopping).
var FIRST = /^(scam|drop|crypto|investors|debt|comp|objection|partner|tax|neg|web|name|cash|compound|inflation|sharp)$/;
function topicOf(q){
  var i;
  for(i = 0; i < TOPICS.length; i++) if(FIRST.test(TOPICS[i].id) && TOPICS[i].re.test(q)) return TOPICS[i];
  for(i = 0; i < TOPICS.length; i++) if(TOPICS[i].re.test(q)) return TOPICS[i];
  return null;
}

/* ---------- Cherry remembers you (owner asked 2026-10-25) ----------
   First name, business and goal, saved only on this device (localStorage 'sharp-cherry-me'), plus progress from the
   First $100 Plan ('sharp-first100'). Never sent anywhere. "What do you know about me?" shows it; "forget me" clears it. */
var ME_KEY = 'sharp-cherry-me';
var F100 = { lawn: 'lawn care', pets: 'dog walking', car: 'car washing', tutor: 'tutoring', bake: 'baking', tech: 'tech help', resell: 'reselling', sitter: 'babysitting', social: 'social posts for local shops' };
function store(k, v){
  try{
    if(v === undefined) return JSON.parse(localStorage.getItem(k) || 'null');
    if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v));
  }catch(e){ return null; }
}
function mine(){
  var m = store(ME_KEY) || {}, f = store('sharp-first100');
  var out = { name: m.name || '', biz: m.biz || '', goal: +m.goal || 0, earned: 0, f100: false };
  if(f && typeof f === 'object'){
    out.f100 = true;
    if(!out.name && f.name) out.name = String(f.name).split(/\s+/)[0].replace(/[^A-Za-z'-]/g, '').slice(0, 20);
    if(!out.biz && F100[f.skill]) out.biz = F100[f.skill];
    if(!out.goal && f.goal) out.goal = +f.goal || 0;
    (f.logs || []).forEach(function(l){ out.earned += +l.v || 0; });
  }
  return out;
}
function remember(patch){ var m = store(ME_KEY) || {}; for(var k in patch) m[k] = patch[k]; store(ME_KEY, m); }
function bizByName(n){ for(var i = 0; i < BIZ.length; i++) if(BIZ[i][1] === n) return BIZ[i]; return null; }
function progress(m){
  if(!m.goal) return '';
  var left = Math.max(0, m.goal - m.earned), b = m.biz && bizByName(m.biz);
  if(!left) return 'You hit your ' + usd(m.goal) + ' goal. Time to set a bigger one.';
  return 'You\'re at ' + usd(m.earned) + ' of your ' + usd(m.goal) + ' goal' + (b ? ': about ' + Math.ceil(left / Math.max(1, b[3] - b[4])) + ' more ' + m.biz + ' jobs to go.' : '.');
}
function summary(m){
  var parts = [];
  if(m.name) parts.push('You\'re ' + m.name + '.');
  if(m.biz) parts.push('Your business: ' + m.biz + '.');
  if(m.goal) parts.push(progress(m));
  return parts.join(' ');
}
// Learns from what they type: "my name is Sam", "I do dog walking", "my goal is $300". First name only, never more.
var NOTNAME = /^(a|an|the|so|not|just|really|very|trying|going|starting|thinking|good|fine|ok|okay|new|here|back|bored|scared|tired|broke|stuck|sure|sorry|ready|in|on|at|from|years?)$/i;
function learn(t){
  var got = [], m;
  m = t.match(/\b(?:my name is|my name's|call me|i'?m called)\s+([a-z]{2,20})\b/i) || t.match(/^(?:[Hh]i|[Hh]ey|[Hh]ello)?[,!\s]*(?:[Ii]'?m|[Ii] am|[Ii]t'?s)\s+([A-Z][a-z]{1,19})\s*[.!]?\s*$/);
  if(m && !NOTNAME.test(m[1])){ var nm = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase(), old = (store(ME_KEY) || {}).name; remember({ name: nm }); got.push(old === nm ? 'same' : 'name'); }
  if(/\b(i (do|run|have|started|am starting|want to start|wanna start)|i'?m (starting|doing)|my business is|my (side )?hustle is)\b/i.test(t)){
    var b = bizOf(t); if(b){ remember({ biz: b[1] }); got.push('biz'); }
  }
  m = t.match(/\b(?:my goal is|i want to (?:make|save|earn|get|have)|i'?m saving|saving up|i need)\b[^$\d]{0,30}\$?\s?(\d[\d,]{0,6})\b/i);
  if(m && !/^\s*(dollars?\s*)?(a|an|per|each|every)\s*(day|week|month|hour|job)/i.test(t.slice(m.index + m[0].length))){
    var g = +m[1].replace(/,/g, ''); if(g >= 5 && g <= 1000000){ remember({ goal: g }); got.push('goal'); }
  }
  return got;
}
function memoryReply(t){
  var m;
  if(/\b(forget (me|everything|it all|my (name|info|stuff))|delete my (info|data)|clear my (info|data))\b/i.test(t)){
    store(ME_KEY, null); m = mine();
    return { say: ['Done. I\'ve forgotten what you told me on this device.' + (m.f100 ? ' Your First $100 Plan is still saved on its own page; clear it there if you want.' : '')], next: SUGGEST.slice(0, 2) };
  }
  if(/\b(what do you (know|remember) about me|who am i|do you remember me|what('s| is) my (name|goal|business))\b/i.test(t)){
    m = mine();
    if(!m.name && !m.biz && !m.goal) return { say: ['Nothing yet. Tell me like this: "I\'m Sam, I do dog walking, my goal is $300." I\'ll keep it on this device only.'], next: [] };
    return { say: [summary(m), 'It\'s saved only on this device. Say "forget me" any time.'], next: ['What should I do next?'] };
  }
  if(/^(what should i do next|what('s| is) next|next step|what now)\??$/i.test(t)){
    m = mine();
    if(!m.biz && !m.goal) return { say: ['First, tell me your business and your goal, like "I do lawn care and my goal is $200." Then I\'ll give you your next step.'], next: [] };
    var b = m.biz && bizByName(m.biz);
    return { say: [progress(m) || ('You\'re doing ' + m.biz + '. Set a goal, like "my goal is $200".'),
      b ? (m.earned ? 'Next: ask your last happy customer for one referral, and book two more jobs this week.' : 'Next: text 5 people you know today. Say what you do, ' + usd(b[3]) + ', and "Want me to do Saturday?"') : 'Next: pick one starter business and book your first job this week.'],
      links: [L.first], next: [] };
  }
  return null;
}
function greeting(){
  var m = mine(), hi = m.name ? 'Hey ' + m.name + '.' : 'Hey, welcome back.';
  if(m.goal) return hi + ' ' + progress(m) + ' What do you want to work on?';
  if(m.biz) return hi + ' Still working on ' + m.biz + '? Ask me anything, or tell me your goal.';
  return 'Hi, I\'m Cherry. Ask me about money or starting a business, or give me numbers and I\'ll do the maths. Tell me your first name and business and I\'ll remember them on this device.';
}

/* ---------- Reply ---------- */
function more(){ return /^(more|tell me more|go on|and\??|how\??|why\??|example\??|explain|what do you mean\??|keep going|continue|like what\??)[\s?!.]*$/i; }
function reply(q){
  var t = q.trim(), r = memoryReply(t);
  if(r) return r;
  var got = learn(t);
  r = answerOf(t);
  if(got.length){
    var m = mine(), ack = got.indexOf('same') >= 0 ? 'I know, ' + m.name + '. I remember you.' : got.indexOf('name') >= 0 ? 'Nice to meet you, ' + m.name + '. I\'ll remember that on this device.' : 'Got it. I\'ll remember that on this device.';
    var intro = /^(?:hi|hey|hello)?[,!\s]*(?:i'?m|i am|it'?s|my name is|my name's|call me)\s+[a-z]+\s*[.!]?\s*$/i.test(t);
    if(r.idk || r.small || intro){
      var bb = m.biz && bizByName(m.biz), more2 = bb && bizReply('plan', bb);
      r = { say: [ack].concat(progress(m) ? [progress(m)] : []).concat(more2 ? more2.say : [got.indexOf('same') >= 0 ? 'Tell me your business and goal, and I\'ll make you a plan.' : 'What business are you working on, and what\'s your goal?']), links: more2 ? more2.links : [], next: ['What should I do next?'] };
    } else r.say = [ack].concat(r.say);
  }
  return r;
}
function answerOf(q){
  var t = q.trim(), r, b, tp, m = mine();
  if(m.name && /^(hi|hey|hello|yo|sup|hiya)\b[\s!.]*$/i.test(t) && !USED.hiName){ USED.hiName = 1; return { say: ['Hey ' + m.name + '. ' + (progress(m) || 'What are we working on today?')], next: ['What should I do next?'], small: true }; }
  for(var i = 0; i < TALK.length; i++) if(TALK[i][0].test(t)){ var k = 'talk' + i; if(!USED[k] || !TALK[i][3]){ USED[k] = 1; return { say: TALK[i][1], next: TALK[i][2], small: true }; } return { say: TALK[i][3], next: TALK[i][2], small: true }; }
  if(more().test(t)){
    if(!last) return { say: ['More about what? Ask me about saving, pricing, your first customer or investing.'], next: SUGGEST.slice(0, 2) };
    var deeper = /^why/i.test(t) ? 'why' : /^how/i.test(t) ? 'how' : /example|like what/i.test(t) ? 'any' : 'any';
    var f = last.topic && fresh(last.topic, deeper);
    var extra = (last.biz && bizReply(last.q, last.biz)) || (f && { say: f, links: last.topic.links }) || freshLesson(last.q, 'From the lessons:', last.topic && last.topic.links);
    if(extra) return { say: extra.say, links: extra.links, next: ['Tell me more'] };
    var k = 'done:' + last.q; if(USED[k]) return { say: ['Nothing new left on that one. Pick a fresh question below.'], next: SUGGEST.slice(0, 3) };
    USED[k] = 1;
    return { say: ['That\'s everything I have on that. Open the lesson for the full detail and a quiz, or ask me something new.'], links: last.links, next: SUGGEST.slice(0, 2) };
  }
  if(/make me a first \$?100 plan/i.test(t)) return { say: ['Open the First $100 Plan, pick a starter business and your free hours. I\'ll work out the price, the jobs and the weeks, and give you the message to send.'], links: [L.first], next: [] };
  r = maths(t);
  tp = !r && topicOf(t);
  if(tp && !/^(comp|objection|partner|tax|scam|drop|web|name|time|neg|investors|sharp)$/.test(tp.id)) tp = null;
  b = !r && !tp && (bizOf(t) || (m.biz && /\b(charge|price|pricing|rates?|customers?|clients?|my business|more jobs|more money|grow)\b/i.test(t) && bizByName(m.biz)));
  if(b) r = bizReply(t, b);
  if(!r && !tp) tp = topicOf(t);
  if(!r && tp){
    var said = fresh(tp, qtype(t));
    if(said) r = { say: said, links: tp.links, next: tp.next };
    else r = freshLesson(t, 'You asked me that already, so here\'s another angle from the lessons:', tp.links) ||
      { say: ['I\'ve told you everything I know on that. The best next step is to try it: open the tool below and put in your own numbers.'], links: tp.links, next: SUGGEST.slice(0, 2) };
  }
  if(!r){
    r = freshLesson(t);
    if(!r && USED.idk) return { idk: true, say: ['That one\'s outside what I know. Ask me about money, selling or starting a business and I\'ll give you a straight answer.'], next: SUGGEST.slice(0, 3) };
    if(!r){ USED.idk = 1; return { idk: true, say: ['I don\'t know that one yet, and I\'d rather say so than guess. I\'m best at money and business: saving, pricing, getting customers, investing.', 'You can also call me and ask out loud.'], next: SUGGEST.slice(0, 3) }; }
    r.next = ['Tell me more'];
  }
  last = { q: t, links: r.links, topic: tp || null, biz: b || null };
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
  var tt = el('div', null, null, top); el('p', 'co-title', 'Cherry', tt).id = 'co-title'; el('p', 'co-sub', 'Quick answers and money maths. What I remember stays on this device.', tt);
  var x = el('button', 'co-x', '✕', top); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.addEventListener('click', close);
  list = el('div', 'co-list', null, panel); list.setAttribute('aria-live', 'polite');
  say(greeting(), 'ch');
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
