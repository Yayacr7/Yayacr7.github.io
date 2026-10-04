(function(){
"use strict";

/* ---------- storage (best effort only) ---------- */
function load(key, fallback){ try{ var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; } }
function save(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }

/* ---------- theme ---------- */
var themeBtn = document.getElementById('themeBtn');
var theme = load('mds-theme', null);
function applyTheme(t){ if(t){ document.documentElement.setAttribute('data-theme', t); } else { document.documentElement.removeAttribute('data-theme'); } }
applyTheme(theme);
themeBtn.addEventListener('click', function(){
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  theme = isDark ? 'light' : 'dark';
  applyTheme(theme); save('mds-theme', theme);
});

/* ---------- routing ---------- */
var pages = Array.prototype.slice.call(document.querySelectorAll('section.page'));
var navLinks = Array.prototype.slice.call(document.querySelectorAll('nav.side a'));
function route(){
  var id = (location.hash || '#start').slice(1);
  if(!document.getElementById(id) || !document.getElementById(id).classList.contains('page')) id = 'start';
  pages.forEach(function(p){ p.classList.toggle('show', p.id === id); });
  navLinks.forEach(function(a){ a.classList.toggle('active', a.getAttribute('data-page') === id); });
  window.scrollTo(0,0);
  requestAnimationFrame(function(){ window.scrollTo(0,0); });
  var active = document.querySelector('nav.side a.active');
  if(active && active.scrollIntoView && window.innerWidth <= 820){ active.scrollIntoView({block:'nearest', inline:'center'}); }
}
window.addEventListener('hashchange', route);

/* ---------- quizzes ---------- */
// type "mc": choices + answer index. type "num": answer + tol (absolute) + unit.
var QUIZZES = {
  persuasion: [
    {type:'mc', q:'A client says "That\'s too expensive." What\'s the best first response?', c:['Drop the price straight away','"That\'s fair. Compared with what you\'re using now?"','Explain that they\'re wrong','Change the subject'], a:1,
      e:'Acknowledge, then ask. You need to know what they\'re comparing you with before you can answer well.'},
    {type:'mc', q:'Which ask is easiest to say yes to?', c:['"Will you sign a two-year contract?"','"Can we try it for one month, then decide?"','"Think about it and let me know."','"Will you buy everything we offer?"'], a:1,
      e:'Small, clear, low-risk first steps get more yeses. A vague ask gets a vague answer.'},
    {type:'mc', q:'Which line is about THEM, not you?', c:['"I really need this deal."','"We have 40 features."','"You\'ll stop doing the invoicing by hand."','"Our company was founded in 2020."'], a:2,
      e:'People decide based on what they get. Translate every point into their benefit.'},
    {type:'mc', q:'Why avoid fake scarcity like "only 2 left!" when it isn\'t true?', c:['It\'s too slow','It can win one sale but destroys trust, and the relationship, when they find out','Customers like it','It\'s required by law'], a:1,
      e:'Honest persuasion keeps customers. Tricks win once and cost you later.'}
  ],
  pitching: [
    {type:'num', q:'You have $90,000 in the bank and burn $15,000 a month. How many months of runway?', a:6, tol:0.01, unit:'months',
      e:'Runway = cash ÷ burn = 90,000 ÷ 15,000 = 6 months.'},
    {type:'num', q:'You have $120,000 and burn $8,000 a month. How many months of runway?', a:15, tol:0.01, unit:'months',
      e:'120,000 ÷ 8,000 = 15 months.'},
    {type:'mc', q:'Why does "We have no competition" worry investors?', c:['It sounds too modest','Everyone has competition, even if it\'s doing nothing, so it suggests you don\'t understand your market','Investors only fund big markets','It\'s fine to say'], a:1,
      e:'Customers always have an alternative. Name it and explain why you win.'},
    {type:'mc', q:'What is "use of funds"?', c:['Your salary','Exactly what the investment will pay for, and what it will achieve','Your total revenue','The investor\'s fee'], a:1,
      e:'Investors want to see the money turn into specific results, such as hires or launches, and how much runway it buys.'}
  ],
  pressure: [
    {type:'mc', q:'An investor asks for a number you don\'t know exactly. Best answer?', c:['Guess confidently','"I don\'t know that exactly. It\'s around X, and I\'ll send the exact figure tomorrow."','Change the subject','Say it\'s confidential'], a:1,
      e:'Honest plus a follow-up builds trust. A confident wrong guess destroys it, and investors check.'},
    {type:'mc', q:'What\'s the best shape for an answer under pressure?', c:['Long background first, answer at the end','The answer in one sentence, then one or two reasons','A joke, then the answer','Answer a different question you prefer'], a:1,
      e:'Answer first. Rambling is what pressure looks like from the outside.'},
    {type:'mc', q:'Box breathing is…', c:['Breathe in 4, hold 4, out 4, hold 4','Breathe as fast as possible','Hold your breath for 30 seconds','Breathe into a paper bag'], a:0,
      e:'Four slow counts each way, three rounds. It steadies your voice and slows you down.'},
    {type:'mc', q:'Before an investor meeting, the most useful preparation is…', c:['Memorising a script word for word','Writing and practising answers to the 20 questions you least want to be asked','Buying a new outfit','Hoping they don\'t ask hard questions'], a:1,
      e:'Most hard questions are predictable. Preparing them is where calm comes from.'}
  ],
  'mkt-basics': [
    {type:'mc', q:'Which customer description will make your marketing easiest?', c:['Everyone who likes good food','Small businesses','Two-income parents with young kids within 5 miles who order takeaway 3+ nights a week','Anyone with a phone'], a:2,
      e:'The more specific the customer, the easier it is to find them, write to them, and know what they care about.'},
    {type:'mc', q:'Which of these is a BENEFIT rather than a feature?', c:['256-bit encryption','Weekly delivery on Sundays','Five evenings a week back with your kids','Made with stainless steel'], a:2,
      e:'A benefit is what the customer gets out of it. Features are the proof behind the benefit.'},
    {type:'mc', q:'You have no customers yet and $500. What should usually come first?', c:['Spend it all on ads','Talk to 10 people who match your customer and test your message','Design a logo','Build a bigger website'], a:1,
      e:'Ads amplify a message. Find out which message works, cheaply, before paying to amplify it.'},
    {type:'mc', q:'Your real competition is…', c:['Only companies selling the exact same thing','Whatever the customer does today instead, including doing nothing','The biggest brand in your industry','Nobody, if your idea is new'], a:1,
      e:'People compare you with their current habit: a spreadsheet, a competitor, or just living with the problem.'}
  ],
  'mkt-channels': [
    {type:'mc', q:'Where do most businesses find their first 10 customers?', c:['Paid ads','Search engine traffic','People they can reach directly: their network, communities, outreach','TV'], a:2,
      e:'Early on nobody is searching for you. Go to where your customers already are and talk to them.'},
    {type:'mc', q:'Why is an email list more valuable than the same number of social followers?', c:['Emails are prettier','You own the list; a platform can change its rules and hide your posts','Followers can\'t buy things','It isn\'t'], a:1,
      e:'You rent your social audience from the platform. You own your list.'},
    {type:'num', q:'2,000 people visit your page. 4% sign up, and 5% of those sign-ups buy. How many customers is that?', a:4, tol:0.01, unit:'customers',
      e:'2,000 × 4% = 80 sign-ups. 80 × 5% = 4 customers.'},
    {type:'mc', q:'When do paid ads make the most sense?', c:['Before you know who your customer is','Once your message and numbers already work and you want more of the same','When you have no budget','Never'], a:1,
      e:'Ads pour fuel on something that already sells. On a message that doesn\'t work, they just burn money faster.'}
  ],
  'mkt-measure': [
    {type:'num', q:'You spend $600 on marketing and win 12 customers. What is your CAC (cost per customer) in $?', a:50, tol:0.01, unit:'$',
      e:'$600 ÷ 12 = $50 per customer.'},
    {type:'num', q:'A customer pays $25/month at a 60% gross margin and stays 10 months. What is their LTV in $?', a:150, tol:0.01, unit:'$',
      e:'25 × 0.60 × 10 = $150.'},
    {type:'num', q:'Ads cost $500 and bring in $1,500 of sales. What is the ROAS?', a:3, tol:0.01, unit:'×',
      e:'$1,500 ÷ $500 = 3×. Whether that\'s profitable depends on your margin.'},
    {type:'num', q:'1,500 people visit and 30 buy. What is the conversion rate in %?', a:2, tol:0.01, unit:'%',
      e:'30 ÷ 1,500 = 0.02 = 2%.'},
    {type:'mc', q:'Which is a vanity number?', c:['Revenue per subscriber','Profit after ad spend','Number of likes on a post','Customer payback in months'], a:2,
      e:'Likes feel good but don\'t pay bills. Track what turns into sign-ups and sales.'}
  ],
  money: [
    {type:'mc', q:'You have a $4,000 credit card balance at 24% APR and $4,000 in savings beyond your emergency fund. What usually makes the most financial sense?',
      c:['Invest the $4,000 in an index fund','Pay off the credit card','Keep the cash and pay the minimum','Split it 50/50'], a:1,
      e:'Paying off a 24% card is a guaranteed 24% return. Stock markets have historically averaged well under that, and with risk. Kill expensive debt first.'},
    {type:'num', q:'Rule of 72: at an 8% yearly return, roughly how many years does it take money to double?', a:9, tol:0.5, unit:'years',
      e:'72 ÷ 8 = 9 years.'},
    {type:'num', q:'$10,000 grows at 7% a year, compounded yearly, for 30 years. About how much is it worth? (nearest dollar is fine; within 1% counts)', a:76123, tol:761, unit:'$',
      e:'10,000 × 1.07^30 = 10,000 × 7.612 ≈ $76,123.'},
    {type:'mc', q:'Which debt payoff method always costs the least total interest?', c:['Snowball (smallest balance first)','Avalanche (highest rate first)','Pay all debts equally','Pay the newest debt first'], a:1,
      e:'Avalanche minimises interest by definition. Snowball can still be the right choice if motivation is your real bottleneck.'},
    {type:'num', q:'With 3% yearly inflation, how much of today\'s buying power does $100 have after 10 years? (within $1 counts)', a:74.41, tol:1, unit:'$',
      e:'100 ÷ 1.03^10 = 100 ÷ 1.344 ≈ $74.41.'},
    {type:'mc', q:'What is the single biggest factor in most US credit scores?', c:['Your income','Payment history','Number of cards','Your bank balance'], a:1,
      e:'Payment history matters most. Income and bank balance aren\'t in your credit score at all.'}
  ],
  investing: [
    {type:'mc', q:'A friend offers an investment with a "guaranteed 20% a year, zero risk". The best response is:', c:['Invest a small amount to test it','Treat it as a red flag and walk away','Invest if the friend has made money','Ask for 25%'], a:1,
      e:'High returns with no risk don\'t exist. Early "winners" in Ponzi schemes are paid with later investors\' money, so a friend\'s gains prove nothing.'},
    {type:'num', q:'$100,000 grows for 30 years at 6% instead of 7% because of a 1% fee. Roughly how many dollars does the fee cost? (within $3,000 counts)', a:186877, tol:3000, unit:'$',
      e:'100,000 × (1.07^30 − 1.06^30) = 761,226 − 574,349 ≈ $186,877.'},
    {type:'mc', q:'You need money for a house deposit in 2 years. Where should most of it sit?', c:['100% stocks for maximum growth','High-yield savings or short-term bonds','Cryptocurrency','A single promising company'], a:1,
      e:'Short time horizon = low risk tolerance. A 30% crash a year before you buy could wreck the plan.'},
    {type:'mc', q:'Your employer matches 50% of 401(k) contributions up to 6% of salary. What\'s generally smart?', c:['Skip it and invest on your own','Contribute at least 6% to get the full match','Contribute 1%','Wait until you\'re older'], a:1,
      e:'The match is an instant 50% return on that money. Very little else beats it.'},
    {type:'mc', q:'Over long periods, most actively managed funds compared with low-cost index funds:', c:['Beat them easily','Underperform them after fees','Perform exactly the same','Are always safer'], a:1,
      e:'The majority of active funds trail their index over 15+ years once fees are counted.'}
  ],
  business: [
    {type:'num', q:'A product costs $60 and sells for $100. What is the gross MARGIN in %?', a:40, tol:0.5, unit:'%',
      e:'Margin = profit ÷ price = 40 ÷ 100 = 40%. (Markup would be 40 ÷ 60 = 66.7%.)'},
    {type:'num', q:'Same product: cost $60, price $100. What is the MARKUP in %? (one decimal place is fine)', a:66.67, tol:0.5, unit:'%',
      e:'Markup = profit ÷ cost = 40 ÷ 60 = 66.7%.'},
    {type:'num', q:'Fixed costs are $5,000/month, price is $25, variable cost is $15 per unit. How many units a month to break even?', a:500, tol:0.5, unit:'units',
      e:'5,000 ÷ (25 − 15) = 500 units.'},
    {type:'num', q:'Customers pay $50/month, gross margin is 70%, and they stay 24 months on average. What is LTV in $?', a:840, tol:1, unit:'$',
      e:'50 × 0.70 × 24 = $840.'},
    {type:'mc', q:'With LTV of $840 and CAC of $300, the LTV:CAC ratio is 2.8. Against the common 3:1 guideline, this is:', c:['Excellent — scale ad spend hard','Slightly below guideline — improve retention, margin or acquisition cost before scaling','Losing money on every customer','Irrelevant'], a:1,
      e:'2.8:1 is profitable per customer but a bit thin once overheads are included. Tighten the numbers first.'},
    {type:'mc', q:'A business shows a profit every month but keeps running out of cash. The most likely cause?', c:['The accountant made errors','Customers pay slowly and/or cash is tied up in inventory','Profit and cash are always equal','It needs a new logo'], a:1,
      e:'Profit counts a sale when it happens; cash arrives when the customer pays. Slow receivables and inventory eat cash.'}
  ],
  statements: [
    {type:'mc', q:'Which equation always holds on a balance sheet?', c:['Revenue − Costs = Profit','Assets = Liabilities + Equity','Cash = Profit','Assets = Revenue'], a:1,
      e:'Everything owned (assets) was funded either by borrowing (liabilities) or by owners (equity).'},
    {type:'num', q:'Revenue is $200,000 and COGS is $120,000. Gross margin in %?', a:40, tol:0.5, unit:'%',
      e:'(200,000 − 120,000) ÷ 200,000 = 40%.'},
    {type:'num', q:'Current assets $150,000, current liabilities $100,000. Current ratio?', a:1.5, tol:0.01, unit:'',
      e:'150,000 ÷ 100,000 = 1.5. Short-term bills are covered 1.5 times.'},
    {type:'num', q:'Revenue $500,000, net profit $50,000. Net margin in %?', a:10, tol:0.2, unit:'%',
      e:'50,000 ÷ 500,000 = 10%.'},
    {type:'mc', q:'Buying a $40,000 delivery van with cash shows up in which section of the cash flow statement?', c:['Operating','Investing','Financing','It doesn\'t appear'], a:1,
      e:'Buying long-term assets is an investing activity. If you took a loan to buy it, the loan itself would appear under financing.'}
  ],
  funding: [
    {type:'num', q:'You raise $250,000 at a $1,000,000 pre-money valuation. What % does the investor own?', a:20, tol:0.2, unit:'%',
      e:'Post-money = 1,250,000. 250,000 ÷ 1,250,000 = 20%.'},
    {type:'num', q:'What is $1,000 received 3 years from now worth today at a 10% discount rate? (within $1 counts)', a:751.31, tol:1, unit:'$',
      e:'1,000 ÷ 1.1^3 = 1,000 ÷ 1.331 ≈ $751.31.'},
    {type:'mc', q:'A steady local bakery wants money for a second oven. Usually the better-matched funding is:', c:['Venture capital','A small business loan or equipment financing','An ICO','Selling 50% to an angel'], a:1,
      e:'Predictable cash flow and a physical asset suit debt. VC wants massive scale, which a bakery isn\'t designed for.'},
    {type:'mc', q:'Why is a DCF valuation risky to rely on alone?', c:['It ignores cash','Small changes in growth or discount-rate assumptions swing the result a lot','It\'s illegal','It only works for banks'], a:1,
      e:'DCF is right in principle, but the output is only as good as the forecasts fed in.'}
  ],
  negotiation: [
    {type:'mc', q:'What gives you the most power in a negotiation?', c:['Talking first and loudest','A strong alternative if this deal fails (BATNA)','Being liked','Having a lot of time to talk'], a:1,
      e:'If you can walk away to something good, you don\'t need this deal, and both sides can feel it.'},
    {type:'num', q:'A seller won\'t go below $8,000. A buyer won\'t go above $10,000. How wide is the ZOPA in $?', a:2000, tol:1, unit:'$',
      e:'The overlap runs from $8,000 to $10,000, so it\'s $2,000 wide.'},
    {type:'mc', q:'The other side opens with an extreme, insulting number. Best move?', c:['Counter halfway between their number and yours','Name it as far off and re-anchor with your own reasoned number','Accept to keep things friendly','Storm out'], a:1,
      e:'Countering off an extreme anchor lets it pull the result. Refuse to treat it as a reference point.'},
    {type:'mc', q:'You\'ve made an offer. They go quiet. You should:', c:['Immediately lower your offer','Explain your offer again in more detail','Stay quiet and wait','Change the subject'], a:2,
      e:'Filling silence with a lower number is negotiating against yourself. Let them respond.'},
    {type:'mc', q:'They ask for a faster delivery date. The strongest response is:', c:['"Sure, no problem."','"If we deliver two weeks early, can you pay 50% up front?"','"No."','"Let me think about it" and never follow up'], a:1,
      e:'Trade, don\'t give. Every concession should buy something back.'},
    {type:'mc', q:'Which is an INTEREST rather than a position?', c:['"I want $90,000."','"I need enough to cover childcare and feel my experience is valued."','"Final offer: $85,000."','"Take it or leave it."'], a:1,
      e:'Interests are the why behind the number. They open up creative options such as flexible hours or a childcare stipend.'}
  ],
  scripts: [
    {type:'mc', q:'You\'ve just made your salary counter-offer. What next?', c:['Justify it with three more reasons','Say "but I\'m flexible"','Stop talking and let them respond','Lower it slightly to be safe'], a:2,
      e:'Adding "I\'m flexible" or more justification signals weakness. Make your ask, then be quiet.'},
    {type:'mc', q:'Which argument for a raise is strongest?', c:['"My rent went up."','"I\'ve been here three years."','"I cut supplier costs by $40,000 this year, and market rate for this role is $X."','"Others got raises."'], a:2,
      e:'Value delivered plus market data. Your expenses and tenure are not the employer\'s reasons to pay more.'},
    {type:'mc', q:'A car dealer keeps asking what monthly payment you want. Why resist?', c:['Monthly figures are illegal','Focusing on monthly payment lets them stretch the loan term and add extras while the total price rises','Dealers hate it','It doesn\'t matter'], a:1,
      e:'Negotiate the out-the-door total. Financing is a separate negotiation.'},
    {type:'mc', q:'A client says your quote is too expensive. The best first move is usually:', c:['Drop the price 20%','Offer to reduce scope to match their budget','Refuse to discuss it','Add free extras'], a:1,
      e:'Cutting scope protects your rate and keeps the value-for-money link intact.'},
    {type:'mc', q:'You don\'t have another job offer. The recruiter asks if you do. Best answer?', c:['"Yes, a big one." (bluff)','"I\'m talking with a few companies, but this role is my priority." — only if true; otherwise focus on why you\'re a strong fit and market data','"No, I have nothing else, please hire me."','Refuse to answer and hang up'], a:1,
      e:'Don\'t invent offers: bluffs get called and destroy trust. You also don\'t have to volunteer weakness. Lean on value and market data.'}
  ]
};
var QUIZ_IDS = Object.keys(QUIZZES);
var progress = load('mds-progress', {});

function el(tag, attrs, html){ var n = document.createElement(tag); if(attrs) for(var k in attrs) n.setAttribute(k, attrs[k]); if(html != null) n.innerHTML = html; return n; }
function fmt(n, d){ return Number(n).toLocaleString(undefined, {minimumFractionDigits:d||0, maximumFractionDigits:d||0}); }

var LESSON_ORDER = ['money','investing','funding','business','statements','mkt-basics','mkt-channels','mkt-measure','negotiation','scripts','persuasion','pitching','pressure'];
var TOPIC_LESSONS = { finance: ['money','investing','funding'], business: ['business','statements'], marketing: ['mkt-basics','mkt-channels','mkt-measure'], negotiation: ['negotiation','scripts','persuasion'], investors: ['pitching','pressure'] };
function updateProgressUI(){
  var passed = QUIZ_IDS.filter(function(id){ return progress[id] && progress[id].passed; }).length;
  var total = QUIZ_IDS.length;
  var set = function(id, v){ var e = document.getElementById(id); if(e) e.textContent = v; };
  set('progressPill', passed + '/' + total + ' passed');
  set('meterText', passed + '/' + total);
  var mf = document.getElementById('meterFill'); if(mf) mf.style.width = (passed / total * 100) + '%';
  QUIZ_IDS.forEach(function(id){
    var rec = progress[id] || {};
    var t = document.querySelector('[data-tick="' + id + '"]'); if(t) t.textContent = rec.passed ? '✓' : '';
  });
  // learning path
  var order = LESSON_ORDER, next = null;
  order.forEach(function(id){
    var rec = progress[id] || {}, node = document.querySelector('[data-node="' + id + '"]');
    var done = !!rec.passed;
    if(!done && !next) next = id;
    if(node){
      node.classList.toggle('done', done);
      node.classList.toggle('next', id === next);
      var st = document.querySelector('[data-node-s="' + id + '"]');
      if(st) st.textContent = done ? 'Passed · ' + rec.best + '%' : id === next ? 'Start here' : (rec.best != null ? 'Best ' + rec.best + '%' : st.getAttribute('data-min') || st.textContent);
    }
  });
  Object.keys(TOPIC_LESSONS).forEach(function(k){
    var ls = TOPIC_LESSONS[k], n = ls.filter(function(l){ return progress[l] && progress[l].passed; }).length;
    document.querySelectorAll('[data-world="' + k + '"]').forEach(function(c){ c.textContent = n + '/' + ls.length; });
    var bar = document.querySelector('[data-bar="' + k + '"]'); if(bar) bar.style.width = (n / ls.length * 100) + '%';
  });
  var ring = document.getElementById('ringFg'); if(ring) ring.style.strokeDashoffset = (314.16 * (1 - passed / total)).toFixed(1);
  set('ringNum', passed);
  var cont = document.getElementById('continueBtn');
  if(cont){
    if(next){ var idx = order.indexOf(next) + 1, nav = document.querySelector('nav.side a[data-page="' + next + '"]');
      cont.href = '#' + next; cont.textContent = (passed ? 'Continue: ' : 'Start: ') + 'Lesson ' + idx + (nav ? ' · ' + nav.childNodes[1].textContent : '') + ' →'; }
    else { cont.href = '#money'; cont.textContent = 'All passed. Review any lesson →'; }
  }
}
document.querySelectorAll('[data-node-s]').forEach(function(e){ e.setAttribute('data-min', e.textContent); });

function buildQuiz(container){
  var id = container.getAttribute('data-quiz');
  var qs = QUIZZES[id]; if(!qs) return;
  container.appendChild(el('span', {'class':'eyebrow'}, 'Practice'));
  container.appendChild(el('h2', null, 'Check your work'));
  container.appendChild(el('p', {'class':'muted'}, 'You\'ll see right away whether each answer is correct, and why. Score 80% to pass the lesson.'));
  var best = progress[id] && progress[id].best;
  if(best != null) container.appendChild(el('p', {'class':'muted'}, 'Your best so far: ' + best + '%'));
  var dots = el('div', {'class':'qdots', 'aria-hidden':'true'});
  qs.forEach(function(){ dots.appendChild(el('i')); });
  container.appendChild(dots);

  var results = [], boxes = [];
  qs.forEach(function(q, i){
    var box = el('div', {'class':'q'});
    box.appendChild(el('div', {'class':'prompt'}, '<span class="qn">Q' + (i+1) + '</span><span>' + q.q + '</span>'));
    if(q.type === 'mc'){
      q.c.forEach(function(choice, j){
        var lab = el('label', {'class':'opt'});
        var inp = el('input', {type:'radio', name:id + '-' + i, value:String(j)});
        inp.addEventListener('change', function(){ grade(i, j); });
        lab.appendChild(inp); lab.appendChild(el('span', null, choice));
        box.appendChild(lab);
      });
    } else {
      var row = el('div', {'class':'numrow'});
      if(q.unit === '$') row.appendChild(el('span', null, '$'));
      var ni = el('input', {type:'number', step:'any', inputmode:'decimal', 'aria-label':'Your answer', name:id + '-' + i});
      row.appendChild(ni);
      if(q.unit && q.unit !== '$') row.appendChild(el('span', {'class':'muted'}, q.unit));
      var cb = el('button', {type:'button', 'class':'btn'}, 'Check');
      row.appendChild(cb);
      var go = function(){ var raw = ni.value.replace(/,/g,'').trim(); if(raw === '' || isNaN(Number(raw))){ ni.focus(); return; } grade(i, Number(raw)); };
      cb.addEventListener('click', go);
      ni.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); go(); } });
      box.appendChild(row);
    }
    box.appendChild(el('div', {'class':'fb', 'aria-live':'polite'}));
    container.appendChild(box); boxes.push(box);
  });

  var result = el('div', {'class':'result'});
  var scoreEl = el('div', {'class':'score', 'aria-live':'polite'});
  var stampEl = el('div', {'class':'stamp', 'aria-hidden':'true'}); stampEl.hidden = true;
  result.appendChild(scoreEl); result.appendChild(stampEl);
  container.appendChild(result);
  var btns = el('div', {'class':'btnrow'});
  var reset = el('button', {type:'button', 'class':'btn ghost'}, 'Try again');
  reset.hidden = true; btns.appendChild(reset); container.appendChild(btns);

  function grade(i, val){
    if(results[i] != null) return;
    var q = qs[i], box = boxes[i], fb = box.querySelector('.fb'), ok, correctText;
    if(q.type === 'mc'){
      ok = val === q.a; correctText = q.c[q.a];
      box.querySelectorAll('label.opt').forEach(function(l, j){ if(j === q.a) l.classList.add('right'); else if(j === val) l.classList.add('wrong'); });
    } else {
      ok = Math.abs(val - q.a) <= q.tol;
      correctText = (q.unit === '$' ? '$' : '') + fmt(q.a, q.a % 1 ? 2 : 0) + (q.unit && q.unit !== '$' ? ' ' + q.unit : '');
    }
    results[i] = ok;
    box.classList.add(ok ? 'is-ok' : 'is-no', 'locked');
    box.querySelectorAll('input,button').forEach(function(x){ x.disabled = true; });
    dots.children[i].className = ok ? 'ok' : 'no';
    fb.className = 'fb show ' + (ok ? 'ok' : 'no');
    fb.innerHTML = ok ? '<strong>Correct.</strong> ' + q.e : '<strong>Not quite.</strong> Answer: ' + correctText + '. ' + q.e;
    if(results.filter(function(r){ return r != null; }).length === qs.length) finish();
  }
  function finish(){
    var right = results.filter(Boolean).length, pct = Math.round(right / qs.length * 100), passed = pct >= 80;
    scoreEl.textContent = 'Score: ' + right + '/' + qs.length + ' (' + pct + '%). ' + (passed ? 'Passed ✓' : 'Not yet. Reread the explanations, then try again.');
    stampEl.className = 'stamp ' + (passed ? 'pass' : 'review');
    stampEl.innerHTML = (passed ? 'Passed' : 'Review') + '<small>' + right + ' / ' + qs.length + ' correct</small>';
    stampEl.hidden = false; void stampEl.offsetWidth; stampEl.classList.add('hit');
    reset.hidden = false;
    var prev = progress[id] || {};
    progress[id] = {best: Math.max(prev.best || 0, pct), passed: !!(prev.passed || passed)};
    save('mds-progress', progress);
    updateProgressUI();
    result.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  reset.addEventListener('click', function(){
    results = [];
    boxes.forEach(function(box){
      box.className = 'q';
      box.querySelectorAll('input').forEach(function(x){ x.disabled = false; if(x.type === 'radio') x.checked = false; else x.value = ''; });
      box.querySelectorAll('button').forEach(function(x){ x.disabled = false; });
      box.querySelectorAll('label.opt').forEach(function(l){ l.classList.remove('right', 'wrong'); });
      var fb = box.querySelector('.fb'); fb.className = 'fb'; fb.innerHTML = '';
    });
    Array.prototype.forEach.call(dots.children, function(d){ d.className = ''; });
    scoreEl.textContent = ''; stampEl.hidden = true; reset.hidden = true;
  });
}

document.querySelectorAll('[data-quiz]').forEach(buildQuiz);

/* ---------- calculators ---------- */
function calc(id, fn){
  var root = document.getElementById(id), out = root.querySelector('[data-out]');
  function run(){
    var v = {};
    root.querySelectorAll('input').forEach(function(i){ v[i.getAttribute('data-k')] = parseFloat(i.value) || 0; });
    out.innerHTML = fn(v);
  }
  root.addEventListener('input', run); run();
}
calc('c-compound', function(v){
  var n = Math.round(v.y * 12), r = v.r / 100 / 12, fv;
  fv = r === 0 ? v.p + v.m * n : v.p * Math.pow(1 + r, n) + v.m * (Math.pow(1 + r, n) - 1) / r;
  var contributed = v.p + v.m * n;
  return '<div class="k">Final balance</div><div class="big">' + '$' + fmt(fv) + '</div><div class="sub">' + 'You put in $' + fmt(contributed) + ' · growth earned $' + fmt(fv - contributed) + '</div>';
});
calc('c-loan', function(v){
  if(v.n <= 0) return 'Enter a length in months.';
  var r = v.r / 100 / 12, pay = r === 0 ? v.p / v.n : v.p * r * Math.pow(1 + r, v.n) / (Math.pow(1 + r, v.n) - 1);
  return '<div class="k">Monthly payment</div><div class="big">' + '$' + fmt(pay, 2) + '</div><div class="sub">' + 'Total paid $' + fmt(pay * v.n, 2) + ' · interest $' + fmt(pay * v.n - v.p, 2) + '</div>';
});
calc('c-breakeven', function(v){
  var cm = v.p - v.v;
  if(cm <= 0) return '<div class="warnline"><b>o break-even possible:</b> each sale loses money (price ≤ variable cost). Raise price or cut variable cost.</div>';
  var units = v.f / cm;
  return '<div class="k">Break-even per month</div><div class="big">' + fmt(Math.ceil(units)) + ' units' + '</div><div class="sub">' + fmt(units, 1) + ' exactly · revenue needed $' + fmt(Math.ceil(units) * v.p) + ' · $' + fmt(cm, 2) + ' contribution per unit' + '</div>';
});
calc('c-margin', function(v){
  if(v.p <= 0) return 'Enter a selling price.';
  var profit = v.p - v.c;
  var margin = profit / v.p * 100, markup = v.c > 0 ? profit / v.c * 100 : null;
  return '<div class="k">Margin  /  markup</div><div class="big">' + fmt(margin, 1) + '% / ' + (markup == null ? '—' : fmt(markup, 1) + '%') + '</div><div class="sub">' + 'Profit per unit $' + fmt(profit, 2) + ' · same deal, two different percentages' + '</div>';
});
calc('c-debt', function(v){
  var r = v.r / 100 / 12, bal = v.b, months = 0, interest = 0;
  if(bal <= 0) return 'No balance — nothing to pay off.';
  if(v.m <= bal * r) return '<div class="warnline"><b>his payment never pays it off.</b> It doesn\'t even cover the monthly interest of $' + fmt(bal * r, 2) + '. Pay more.</div>';
  while(bal > 0.005 && months < 1200){ var i = bal * r; interest += i; bal = bal + i - v.m; months++; }
  var y = Math.floor(months / 12), m = months % 12;
  return '<div class="k">Debt-free in</div><div class="big">' + months + ' months' + '</div><div class="sub">' + (y ? y + ' yr ' : '') + m + ' mo · total interest $' + fmt(interest, 2) + '</div>';
});

/* ---------- prompts ---------- */
var PROMPTS = [
  {title:'System prompt — Straight-Talk Mentor', kind:'System prompt', note:'Paste into project instructions or custom instructions. It sets the honesty rules for everything after.',
   text:
'You are my straight-talk mentor for business, finance and negotiation.\n\n' +
'How to behave:\n' +
'- Be direct and honest, not agreeable. Do not flatter me or soften bad news into mush.\n' +
'- Challenge my assumptions when they are weak. Name the specific assumption and explain why it is weak.\n' +
'- If I am wrong, say "You\'re wrong about this" and explain why, with numbers or evidence where possible.\n' +
'- When I share an idea, plan or decision, rate it honestly out of 10, then give the 2–3 biggest reasons for the score and what would raise it by 2 points.\n' +
'- If you are uncertain, say so plainly and say what would resolve the uncertainty. Never guess confidently. Separate what you know, what you are estimating, and what you don\'t know.\n' +
'- Show your working for any calculation, step by step, so I can check it. Double-check arithmetic before answering.\n' +
'- Flag when something depends on my country, current law, tax rules or today\'s rates, and tell me to verify it with an official source.\n' +
'- Explain in plain English. Define any jargon the first time you use it.\n' +
'- Keep answers tight. Lead with the answer, then the reasoning.\n' +
'- Disagreeing with me is fine and expected. Being right matters more than being pleasant.\n\n' +
'You are not a licensed financial adviser. For big, irreversible decisions, tell me when a professional is worth paying for.'},

  {title:'Master prompt — Teach me a topic', kind:'Master prompt', note:'Replace the bracketed parts.',
   text:
'Teach me [TOPIC, e.g. "how a balance sheet works"].\n\n' +
'My current level: [beginner / some basics / intermediate].\n' +
'Why I want to know: [goal, e.g. "to read my own business\'s numbers"].\n\n' +
'Do it like this:\n' +
'1. Explain it in plain English in under 200 words, with one concrete real-world example using simple numbers.\n' +
'2. List the 3 most common misunderstandings beginners have about it.\n' +
'3. Give me 3 practice questions, from easy to hard. Don\'t show the answers.\n' +
'4. Wait for my answers. Then mark each one right or wrong, explain any mistake, and tell me honestly whether I actually understand it or am just pattern-matching.\n' +
'5. If I\'m ready, suggest the next topic to learn. If I\'m not, tell me what to review first.'},

  {title:'Master prompt — Check my work', kind:'Master prompt', note:'For calculations, budgets, financial statements or a plan.',
   text:
'Check my work. Be a strict reviewer, not a cheerleader.\n\n' +
'What I\'m trying to do: [GOAL]\n' +
'My work:\n[PASTE NUMBERS, BUDGET, CALCULATION OR PLAN]\n\n' +
'Please:\n' +
'1. Recalculate every number independently and show your working. List each error with the correct figure.\n' +
'2. Point out any wrong formulas or concepts (e.g. margin vs markup, profit vs cash flow).\n' +
'3. List assumptions I made without stating them, and which ones are weakest.\n' +
'4. Tell me what I left out that a professional would include.\n' +
'5. Give an overall accuracy rating out of 10 and say whether I can rely on this as it stands.\n' +
'If anything is ambiguous, ask me instead of guessing.'},

  {title:'Master prompt — Negotiation sparring partner', kind:'Master prompt', note:'Role-play practice. Tell it to make the counterpart tough.',
   text:
'Let\'s role-play a negotiation so I can practise.\n\n' +
'Scenario: [e.g. "I\'m negotiating salary for a marketing manager job offer of $70,000"]\n' +
'My goal: [TARGET]   My walk-away point: [NUMBER — keep it secret in the role-play]\n' +
'My BATNA: [what I\'ll do if this fails]\n\n' +
'Rules:\n' +
'- You play the other side: [recruiter / landlord / supplier / buyer]. Be realistic and moderately tough. Use real tactics: anchoring, silence, "that\'s our policy", deadlines, and asking about my other offers.\n' +
'- Invent a hidden walk-away point and hidden interests for your character, and don\'t reveal them until the end.\n' +
'- Reply only as the character, one message at a time, and wait for my reply.\n' +
'- When I type "SCORE", step out of character and give me: the final result vs my target; your hidden walk-away point (how much I left on the table); every mistake I made, quoting my exact words; what I did well; and a rating out of 10. Be blunt.\n\n' +
'Start the role-play now with your opening line.'},

  {title:'Master prompt — Prepare for a real negotiation', kind:'Master prompt', note:'Use before any real negotiation.',
   text:
'Help me prepare for a real negotiation. Ask me questions one at a time until you have what you need, then build my plan.\n\n' +
'Situation: [DESCRIBE]\n\n' +
'Cover:\n' +
'1. My interests (the why behind what I want) and theirs.\n' +
'2. My BATNA and how to make it stronger before the meeting.\n' +
'3. My walk-away point, target, and opening anchor, each with a one-sentence justification I can say out loud.\n' +
'4. Their likely BATNA, walk-away point and pressure points.\n' +
'5. Things that are cheap for me to give but valuable to them, and the reverse.\n' +
'6. Five questions I should ask them.\n' +
'7. The three toughest things they might say, and how I should respond.\n' +
'8. Where my plan is weak. Be honest even if it\'s uncomfortable. Rate my position out of 10.'},

  {title:'Master prompt — Rate my business idea', kind:'Master prompt', note:'For idea validation before you spend money.',
   text:
'Rate my business idea honestly out of 10. Assume I would rather hear a painful truth now than lose money later.\n\n' +
'Idea: [DESCRIBE]\n' +
'Customer: [WHO EXACTLY]\n' +
'Price: [$]   Estimated cost per sale: [$]   Monthly fixed costs: [$]\n' +
'My advantage: [why me]\n\n' +
'Give me:\n' +
'1. The score, and the single biggest reason it isn\'t higher.\n' +
'2. My 3 weakest assumptions, and a cheap way to test each in under 2 weeks.\n' +
'3. Unit economics: margin, contribution per sale, and break-even volume. Show the maths, and flag any number I need to supply.\n' +
'4. Who already does this, and why a customer would switch to me (or wouldn\'t).\n' +
'5. The most likely way this fails.\n' +
'6. What would make it a 9/10.\n' +
'Say clearly if you don\'t know something rather than inventing market data.'},

  {title:'Master prompt — Review my budget', kind:'Master prompt', note:'Remove account numbers and anything identifying before pasting.',
   text:
'Review my monthly budget like an honest, practical financial coach.\n\n' +
'Take-home income: [$]\n' +
'Expenses:\n[LIST: category — amount]\n' +
'Debts: [type — balance — interest rate — minimum payment]\n' +
'Savings: [emergency fund $, retirement %, other]\n' +
'Country: [COUNTRY]\n' +
'Goal: [e.g. "debt-free in 2 years" / "house deposit of $30k"]\n\n' +
'Please:\n' +
'1. Check my maths and the % of income in each category.\n' +
'2. Tell me the 3 changes with the biggest impact, in order, with dollar amounts.\n' +
'3. Give my debt payoff order (avalanche) with an estimated payoff date, showing working.\n' +
'4. Tell me whether my goal is realistic on this budget. If not, say so and say what would make it realistic.\n' +
'5. Flag anything that depends on my country\'s rules that I should verify.'},

  {title:'Master prompt — The all-in-one tutor', kind:'Master prompt', note:'One prompt that runs a full learning session. Pair it with the system prompt above.',
   text:
'Act as my personal business, finance and negotiation tutor for this session.\n\n' +
'Start by asking me 5 quick diagnostic questions (mixed topics: personal finance, business finance, financial statements, investing, negotiation) to find my level. Ask them one at a time.\n\n' +
'Then:\n' +
'- Tell me honestly where I\'m strong and where I\'m weak, with a score out of 10 for each area.\n' +
'- Teach my weakest area first, in short chunks of under 150 words, each followed by one question to check I understood before moving on.\n' +
'- Use realistic numbers and situations, and show all working on calculations.\n' +
'- When I get something wrong, tell me directly and explain the misconception, not just the right answer.\n' +
'- Every 3 chunks, give me a mixed review question from earlier topics.\n' +
'- At the end, give me a 5-item summary of what I learned and a 1-week practice plan.\n\n' +
'Do not move on until I answer. Do not praise wrong answers. If you\'re unsure about a fact, say so.'}
];

var list = document.getElementById('promptList');
PROMPTS.forEach(function(p, i){
  list.appendChild(el('h2', null, p.title));
  list.appendChild(el('p', {'class':'muted'}, p.note));
  var box = el('div', {'class':'prompt-box'});
  var pre = el('pre'); pre.textContent = p.text;
  box.appendChild(el('span', {'class':'tag'}, p.kind));
  var btn = el('button', {type:'button', 'class':'btn copy'}, 'Copy');
  btn.addEventListener('click', function(){
    function done(ok){ btn.textContent = ok ? 'Copied ✓' : 'Select & copy manually'; setTimeout(function(){ btn.textContent = 'Copy'; }, 1800); }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(p.text).then(function(){ done(true); }, function(){ done(false); });
    } else {
      try{ var r = document.createRange(); r.selectNodeContents(pre); var s = getSelection(); s.removeAllRanges(); s.addRange(r); done(document.execCommand('copy')); }catch(e){ done(false); }
    }
  });
  box.appendChild(pre); box.appendChild(btn);
  list.appendChild(box);
});

/* ---------- guilloche rosette (the security print on banknotes) ---------- */
function drawGuilloche(){
  var c = document.getElementById('guilloche'); if(!c || !c.getContext) return;
  var ctx = c.getContext('2d'), W = c.width, cx = W/2, cy = W/2;
  var cs = getComputedStyle(document.documentElement);
  var inks = [cs.getPropertyValue('--note').trim(), cs.getPropertyValue('--engrave').trim(), cs.getPropertyValue('--gold').trim()];
  ctx.clearRect(0,0,W,W); ctx.lineWidth = 0.9;
  // epitrochoid families: x = (R+r)cos t - d cos((R+r)/r t)
  var sets = [[150,30,92,0,.55],[118,26,70,1,.5],[86,18,54,2,.6],[220,22,40,0,.35]];
  sets.forEach(function(sv){
    var R = sv[0], r = sv[1], d = sv[2];
    ctx.strokeStyle = inks[sv[3]]; ctx.globalAlpha = sv[4];
    for(var k = 0; k < 3; k++){
      var rot = k * Math.PI / 30; ctx.beginPath();
      for(var t = 0; t <= Math.PI * 2 * r / gcd(R, r) + 0.001; t += 0.01){
        var x = (R + r) * Math.cos(t) - d * Math.cos((R + r) / r * t);
        var y = (R + r) * Math.sin(t) - d * Math.sin((R + r) / r * t);
        var xr = x * Math.cos(rot) - y * Math.sin(rot), yr = x * Math.sin(rot) + y * Math.cos(rot);
        var sc = (W/2 - 12) / (R + r + d);
        if(t === 0) ctx.moveTo(cx + xr * sc, cy + yr * sc); else ctx.lineTo(cx + xr * sc, cy + yr * sc);
      }
      ctx.stroke();
    }
  });
  ctx.globalAlpha = 1;
}
function gcd(a, b){ return b ? gcd(b, a % b) : a; }
drawGuilloche();
themeBtn.addEventListener('click', drawGuilloche);
if(window.matchMedia){ var mq = matchMedia('(prefers-color-scheme: dark)'); if(mq.addEventListener) mq.addEventListener('change', drawGuilloche); }

/* ticker: duplicate items so the loop is seamless */
var track = document.getElementById('tickerTrack');
if(track) track.innerHTML += track.innerHTML.replace(/<span>/g, '<span aria-hidden="true">');


/* ---------- tap any jargon word for a plain-English definition ---------- */
(function initTerms(){
  var defs = {}, names = [];
  document.querySelectorAll('dl.gloss div').forEach(function(d){
    var t = d.querySelector('dt'), v = d.querySelector('dd'); if(!t || !v) return;
    defs[t.textContent.trim().toLowerCase()] = { name: t.textContent.trim(), def: v.textContent.trim() };
    names.push(t.textContent.trim());
  });
  if(!names.length) return;
  names.sort(function(a, b){ return b.length - a.length; });
  var esc = function(x){ return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  var re = new RegExp('\\b(' + names.map(esc).join('|') + ')s?\\b', 'gi');
  var SKIP = 'h1,h2,h3,.tldr,.quiz,.formula,.pager,a,button,.lesson-head,th,code,.callout > b,.zopa,.eyebrow';
  var MAX = 8;
  document.querySelectorAll('section.page').forEach(function(sec){
    if(!sec.querySelector('.quiz')) return;
    var used = {}, count = 0;
    var walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, { acceptNode: function(n){
      return n.parentElement && !n.parentElement.closest(SKIP) && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }});
    var nodes = []; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(node){
      if(count >= MAX) return;
      var text = node.nodeValue, m, hit = null; re.lastIndex = 0;
      while((m = re.exec(text))){ var key = m[1].toLowerCase(); if(!used[key] && defs[key]){ hit = { m: m, key: key }; break; } }
      if(!hit) return;
      used[hit.key] = true; count++;
      var after = node.splitText(hit.m.index); after.splitText(hit.m[0].length);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'term'; b.setAttribute('data-term', hit.key);
      b.textContent = after.nodeValue; b.setAttribute('aria-label', after.nodeValue + ': ' + defs[hit.key].def);
      after.parentNode.replaceChild(b, after);
    });
  });
  var tip = document.createElement('div'); tip.id = 'termTip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip);
  var current = null;
  function show(el){
    var d = defs[el.getAttribute('data-term')]; if(!d) return;
    tip.textContent = ''; var bb = document.createElement('b'); bb.textContent = d.name; tip.appendChild(bb); tip.appendChild(document.createTextNode(d.def));
    tip.hidden = false; current = el; place();
  }
  function place(){
    if(!current) return;
    var r = current.getBoundingClientRect();
    if(r.bottom < 0 || r.top > window.innerHeight){ hide(); return; }
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    var top = r.bottom + 8; if(top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hide(){ tip.hidden = true; current = null; }
  document.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('.term');
    if(t) show(t); else if(!tip.contains(e.target)) hide();
  });
  document.addEventListener('focusin', function(e){ if(e.target.classList && e.target.classList.contains('term')) show(e.target); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') hide(); });
  window.addEventListener('scroll', place, { passive: true });
  window.addEventListener('resize', place);
  window.addEventListener('hashchange', hide);
  if(window.matchMedia && matchMedia('(hover: hover)').matches){
    document.addEventListener('mouseover', function(e){ var t = e.target.closest && e.target.closest('.term'); if(t && t !== current) show(t); });
    document.addEventListener('mouseout', function(e){ var t = e.target.closest && e.target.closest('.term'); if(t && !(e.relatedTarget && t.contains(e.relatedTarget))) hide(); });
  }
})();
updateProgressUI();
route();
})();
