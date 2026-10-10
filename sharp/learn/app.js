(function(){
"use strict";

/* ---------- storage (best effort only) ---------- */
function load(key, fallback){ try{ var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; } }
function save(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }

/* ---------- theme ---------- */
var themeBtn = document.getElementById('themeBtn') || document.createElement('i');
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
  var cur = document.querySelector('nav.side a[data-page="' + id + '"]');
  openGroup(cur ? cur.getAttribute('data-g') : null);
  var active = document.querySelector('nav.side a.active');
  if(active && active.scrollIntoView && window.innerWidth <= 820){ active.scrollIntoView({block:'nearest', inline:'center'}); }
}
window.addEventListener('hashchange', route);
// Side menu: only one topic's lessons open at a time (desktop).
function openGroup(g){
  document.querySelectorAll('nav.side .gbtn').forEach(function(b){ b.setAttribute('aria-expanded', b.getAttribute('data-grp') === g ? 'true' : 'false'); });
  document.querySelectorAll('nav.side a[data-g]').forEach(function(a){ a.classList.toggle('in', a.getAttribute('data-g') === g); });
}
document.querySelectorAll('nav.side .gbtn').forEach(function(b){
  b.addEventListener('click', function(){ openGroup(b.getAttribute('aria-expanded') === 'true' ? null : b.getAttribute('data-grp')); });
});

/* ---------- quizzes ---------- */
// type "mc": choices c, answer index a, and w = one explanation per choice (same order as c).
// type "num": answer a, tol (absolute), unit, worked solution e, and traps = common wrong answers {v, why}.
var QUIZZES = {
  "money": [
    {"type":"mc","q":"Priya freelances, so her income changes month to month. Her essential costs are $2,000 a month. Which emergency fund best matches the lesson?","c":["$6,000 in an insured, easy-to-reach savings account","$12,000 in an insured, easy-to-reach savings account","$12,000 in a low-fee stock index fund","$18,000 saved, covering six months of all spending, including wants"],"a":1,"w":["Three months is the low end. With irregular income, the lesson says aim for the higher end: 6 × $2,000.","Irregular income means aim high: 6 months × $2,000 essentials = $12,000, kept safe and easy to reach.","Right size, wrong place. An emergency fund isn't an investment; a stock drop could hit right when the car breaks.","Tempting to over-save, but the rule counts essential costs, not wants. Six months of essentials is $12,000."]},
    {"type":"num","q":"Jamal ignores a credit card balance at 18% yearly interest. Using the Rule of 72, about how many years until the balance doubles?","a":4,"tol":0.01,"unit":"years","e":"Rule of 72: years to double ≈ 72 ÷ rate = 72 ÷ 18 = 4 years.","traps":[{"v":0.25,"why":"You divided the rate by 72. Flip it: 72 ÷ rate."},{"v":5.56,"why":"That's 100% ÷ 18%, which ignores compounding. Interest on interest makes it double faster."}]},
    {"type":"mc","q":"Ana owes: Card A $500 at 18%, Card B $2,400 at 27%, car loan $6,000 at 8%. She pays all minimums and has $300 extra a month. Using the avalanche method, where does the $300 go?","c":["Card A, because clearing the smallest balance first is quickest","Card B, because it has the highest interest rate","The car loan, because it is the biggest balance","$100 to each debt, so every balance shrinks evenly"],"a":1,"w":["That's the snowball method. It gives a quick win but costs more interest overall.","Avalanche sends extra money to the highest rate. Card B's 27% costs her the most per dollar owed.","Biggest balance feels most urgent, but its 8% rate is the cheapest. Avalanche ranks by rate, not size.","Splitting feels fair but leaves more money sitting on the 27% card, so she pays more interest."]},
    {"type":"mc","q":"Leo, 19, pays his card bills by hand and has forgotten twice this year. He wants a better US credit score. Which move matters most?","c":["Close his oldest card, since he never uses it anymore","Open a store card and a car loan to improve his credit mix","Turn on autopay for at least the minimum on every card","Pay his whole balance in full, but whenever he remembers"],"a":2,"w":["Feels tidy, but length of history counts, and the lesson says to keep old no-fee cards open. Payment history matters even more.","Credit mix and new applications are minor factors. Payment history matters far more.","Payment history is the top factor. Autopay for at least the minimum means he never misses again.","Paying in full is good, but late is still late. Missed due dates hurt payment history, the biggest factor."]},
    {"type":"num","q":"Maya has two cards, each with a $2,500 limit. She owes $1,200 in total. How many dollars must she pay off to get her utilisation across both cards down to 10%?","a":700,"tol":0.01,"unit":"$","e":"Total limit = $5,000. 10% of it = $500. Pay off $1,200 − $500 = $700.","traps":[{"v":950,"why":"You used one card's limit ($2,500). Utilisation here is across both cards: $5,000."},{"v":1080,"why":"You took 10% of her balance. Utilisation is a % of the limit, not the balance."}]},
    {"type":"num","q":"Lena, 18, invests $5,000 and earns 8% a year, every year. Use the Rule of 72 to estimate what it's worth after 36 years.","a":80000,"tol":200,"unit":"$","e":"Doubles every 72 ÷ 8 = 9 years. 36 ÷ 9 = 4 doublings: $5,000 → 10k → 20k → 40k → $80,000.","traps":[{"v":20000,"why":"You multiplied by 4. Four doublings is ×2×2×2×2 = ×16."},{"v":19400,"why":"That's simple interest (8% of $5,000 each year). Compounding earns returns on returns."}]}
  ],
  "investing": [
    {"type":"mc","q":"Kofi is saving $8,000 for a used car he'll buy in 18 months. Where should most of it sit?","c":["An S&P 500 index fund, since it's diversified and cheap","An insured savings account, since he needs it soon","One stock he knows well, for faster growth","Half in stocks, half in a property fund"],"a":1,"w":["Index funds are great for long-term money, but stocks can fall 30–50% in a year. 18 months is too short.","Money needed within about 5 years shouldn't be heavily in stocks. Cash is for safety and short-term needs.","One company is the least diversified choice, and stocks can crash right before he needs the cash.","Mixing feels safer, but half is still in stocks, which can fall 30–50% in a bad year. Wrong for an 18-month goal."]},
    {"type":"mc","q":"Two offers. A: a stock index fund that averaged 7% a year but once fell 35%. B: \"a guaranteed 1.5% every month, never a down month.\" Which view fits the lesson?","c":["B is safer, because it has never had a single losing month","A is too risky for anyone, because it once fell 35%","Test B with a small amount first, to see if it really pays","B has red flags; A's swings are normal for higher returns"],"a":3,"w":["Smoothness is the trap. \"Guaranteed\" high returns and suspiciously smooth returns are both red flags in the lesson.","Big swings are the price of higher long-run returns. The lesson says stocks can fall 30–50% in a bad year.","A red flag stays a red flag. A small test that seems to pay early proves nothing about the risk.","Higher returns come with bigger swings. The lesson says anyone offering high returns with no risk is mistaken or lying."]},
    {"type":"num","q":"Ravi earns $40,000. His employer matches 50% of what he puts in, up to 6% of salary. He puts in only 4%. Assume he's fully vested. How many dollars of match a year is he missing?","a":400,"tol":0.01,"unit":"$","e":"Full match: 6% × $40,000 × 50% = $1,200. He gets 4% × $40,000 × 50% = $800. Missing: $400.","traps":[{"v":800,"why":"That's the extra 2% of salary he'd put in. The employer only matches 50% of that."},{"v":1200,"why":"That's the full match. He already gets $800 of it."}]},
    {"type":"mc","q":"Zoe has a $500 starter emergency fund, a $2,000 card at 22%, and a job whose 401(k) matches 100% of what she saves, up to a limit. What's her next step, per the lesson?","c":["Pay off the 22% card before saving anything for retirement","Save enough in the 401(k) to get the full match","Build a full 3–6 month emergency fund first","Put as much as allowed into the 401(k)"],"a":1,"w":["Close, and that's step three. A 100% match is an instant 100% return, which beats even a 22% card.","After a starter fund, the lesson's order is: get the full employer match, then pay off high-interest debt.","The full fund comes after the match and the high-interest debt in the lesson's order.","Maxing out comes later. Beyond the match, her 22% card is the better use of money first."]},
    {"type":"mc","q":"Mia's friend beat the S&P 500 last year picking stocks on an app. He says she should copy his picks with her 30-year retirement money. Best reasoning?","c":["Copy his picks for one year, then switch if he starts to fall behind","Pick a fund run by a professional manager, who has a research team","Use a low-cost index fund; most pros don't beat one after fees","Hold cash until the market feels calm, then invest it all at once"],"a":2,"w":["One good year proves little. Over 15+ years, even pros with research teams mostly fail to beat a low-cost index fund.","Sounds safer, but over 15+ years the large majority of professional managers fail to beat a low-cost index fund after fees.","If most professionals can't beat a cheap index fund over 15+ years, a friend picking on a phone app almost certainly won't.","Waiting feels careful, but cash loses to inflation over long periods. Long-term money is the money to invest."]},
    {"type":"num","q":"Ines invests $20,000 for 30 years. Fund A earns 7% a year. Fund B is the same but charges 1% more in fees, so earns 6%. To the nearest $100, how much more does Fund A end with?","a":37400,"tol":50,"unit":"$","e":"A: 20,000 × 1.07^30 ≈ $152,245. B: 20,000 × 1.06^30 ≈ $114,870. Gap ≈ $37,400.","traps":[{"v":6000,"why":"That's 1% of $20,000 for 30 years. The fee is charged on the growing balance, and lost growth compounds too."},{"v":200,"why":"That's 1% charged once. The fee is charged every year, forever."}]}
  ],
  "funding": [
    {"type":"mc","q":"Omar's bakery has steady, predictable cash flow. He needs $20,000 within a month for a second oven that will boost sales. He wants to keep full ownership. Best fit?","c":["Save up from sales until he can pay cash, to keep full control","A bank loan he repays from his steady monthly cash flow","Sell 20% to an angel investor, so there are no repayments","Pitch venture capital firms, since they can fund growth fast"],"a":1,"w":["Bootstrapping keeps full control, but you give up speed. He needs the money within a month.","Debt suits cash flow predictable enough to cover repayments. He pays interest but gives up no ownership.","Skipping repayments is tempting, but equity means giving up ownership, which he wants to keep.","VCs push for huge, risky growth, which is often bad for a steady, profitable business. He'd also give up ownership."]},
    {"type":"num","q":"Jin raises $300,000 at a $1,200,000 pre-money valuation. What % of the company does the investor own? (whole %)","a":20,"tol":0.5,"unit":"%","e":"Post-money = 1,200,000 + 300,000 = $1,500,000. Share = 300,000 ÷ 1,500,000 = 20%.","traps":[{"v":25,"why":"You divided by the pre-money value. Use post-money: pre-money + investment."}]},
    {"type":"num","q":"Ada and Ben own 100% of their app. They raise $500,000 at a $2,000,000 POST-money valuation. What % do the founders own together afterwards? (whole %)","a":75,"tol":0.5,"unit":"%","e":"Investor = 500,000 ÷ 2,000,000 = 25%. Founders keep 100% − 25% = 75%.","traps":[{"v":80,"why":"You treated $2M as pre-money and added the $500k. It's already post-money."},{"v":25,"why":"That's the investor's share. The question asks what the founders keep."}]},
    {"type":"mc","q":"Kai owns 100% of a business worth $800,000 pre-money. He raises $200,000. Right after the deal, which is true?","c":["He owns 80% of $800,000, so his stake fell to $640,000","He owns 75%, since $200,000 is 25% of $800,000","He owns 80%, and his stake is worth $1,000,000","He owns 80%, still worth $800,000 on paper"],"a":3,"w":["You used the pre-money value. After the deal the business is worth $1,000,000, and 80% of that is $800,000.","Dividing by pre-money is a common slip. Investor = 200k ÷ 1M post-money = 20%, so Kai keeps 80%.","$1,000,000 is the whole business. Kai owns 80% of it: $800,000.","Post-money = $1M; Kai owns 80% = $800,000. Smaller slice, same value. He gains only if the money grows the pie."]},
    {"type":"num","q":"A client offers Mei $5,000 today or $6,000 in 2 years. Using a 10% yearly rate, what is the $6,000 worth today? (nearest dollar)","a":4959,"tol":1,"unit":"$","e":"PV = 6,000 ÷ 1.1² = 6,000 ÷ 1.21 ≈ $4,959. So $5,000 today is the better deal.","traps":[{"v":5455,"why":"You discounted for one year only. It's 2 years: divide by 1.1 twice."},{"v":5000,"why":"You divided by 1.2 (10% × 2). Discounting compounds: use 1.1² = 1.21."},{"v":4800,"why":"You took 20% off. Present value divides by (1 + rate)^years; it doesn't subtract."}]},
    {"type":"mc","q":"Bea's cleaning business makes $60,000 a year in owner earnings on $200,000 revenue. Similar businesses sell for about 3× owner earnings. Its equipment would sell for $40,000. Her DCF says $900,000. Most sensible view?","c":["About $900,000, since DCF is the method that's correct in theory","About $180,000 as a starting point; the final price is negotiated","About $600,000, using the 3× multiple on her yearly revenue","About $40,000, since buyers only pay what the assets would sell for"],"a":1,"w":["DCF is correct in theory but very sensitive: small changes to growth or discount rate swing it enormously. $900,000 is 15× her owner earnings.","3 × $60,000 = $180,000, in line with similar businesses. Valuation is part maths, part negotiation: it's worth what a buyer will pay.","The 3× multiple is for owner earnings, not revenue. Using revenue inflates the value.","Asset value is mainly a floor. A business earning $60,000 a year is usually worth more than its equipment."]}
  ],
  "business": [
    {"type":"mc","q":"Lena buys phone cases for $8 and sells them for $20. She tells a friend her margin is 150%. What's going on?","c":["She worked out markup (12 ÷ 8). Her margin is 60% (12 ÷ 20).","She's right. Margins over 100% just mean very strong pricing.","Her margin is 60%, and her markup is 250% (20 ÷ 8).","She's close. Margin is profit ÷ cost, so it's 150%."],"a":0,"w":["Profit is $20 − $8 = $12. Markup = 12 ÷ 8 = 150%. Margin = 12 ÷ 20 = 60%. Same deal, two very different numbers.","Tempting because markup can go over 100%. But margin is profit ÷ price, and it can never pass 100%.","The margin part is right, but 20 ÷ 8 is price ÷ cost. Markup is profit ÷ cost: 12 ÷ 8 = 150%.","Profit ÷ cost is markup, not margin. Margin divides by price, so it's 12 ÷ 20 = 60%."]},
    {"type":"num","q":"Omar's candle business has $1,800 a month in fixed costs. Each candle sells for $24 and costs $9 in wax, jar and shipping. How many candles a month must he sell to break even?","a":120,"tol":0.01,"unit":"units","e":"Each candle contributes $24 − $9 = $15. Break-even = 1,800 ÷ 15 = 120 candles a month.","traps":[{"v":75,"why":"Divided by the price and forgot the $9 variable cost of each candle."},{"v":200,"why":"Divided by the variable cost. Divide by what each sale contributes: price − variable cost."}]},
    {"type":"mc","q":"Tomás's furniture shop shows a profit, but he can't pay suppliers. Customers pay him in 60 days; suppliers want paying in 30. Orders just doubled. What's the best read?","c":["More orders will fix it, since more sales means more profit and more cash.","His prices must be too low, because a profitable shop can't run short of cash.","Growth makes it worse: he pays for materials long before customers pay.","It's fine to wait. Profit on paper means the cash will catch up soon."],"a":2,"w":["Tempting, since more sales usually feels like good news. But each new order needs cash up front, so the gap gets bigger.","Tempting, but profit is not cash. A profitable shop can still run dry when money comes in later than it goes out.","He pays suppliers at 30 days but gets paid at 60. Doubling orders doubles the cash stuck in that gap. Profit is not cash.","Waiting feels safe, but bills are due now. Lack of cash, not profit, is behind many small-business failures. Watch the bank balance."]},
    {"type":"num","q":"Zara's app charges $10 a month. Gross margin is 80%, and customers stay 15 months on average. She spent $3,000 on ads and won 75 new customers. What is LTV ÷ CAC?","a":3,"tol":0.01,"unit":"x","e":"LTV = 10 × 0.8 × 15 = $120. CAC = 3,000 ÷ 75 = $40. LTV ÷ CAC = 120 ÷ 40 = 3x, right at the guideline.","traps":[{"v":3.75,"why":"Left out the 80% gross margin, so LTV came out as $150 instead of $120."},{"v":0.33,"why":"Flipped it: that's CAC ÷ LTV."}]},
    {"type":"mc","q":"Kofi buys a lamp for $30 and wants a 25% margin on it. What price should he charge?","c":["$37.50, because 25% of $30 is $7.50 added to the cost.","$40, because the $10 profit is then 25% of the price.","$120, because then the $30 cost is 25% of the price.","$45, because a 25% margin means a 50% markup on cost."],"a":1,"w":["That's a 25% markup. Profit $7.50 ÷ price $37.50 is only a 20% margin.","Margin = profit ÷ price. At $40, profit is $10, and 10 ÷ 40 = 25%.","Tempting mix-up: here the cost is 25% of the price, so the margin would be 75%, not 25%.","Right idea that margin and markup differ, wrong size. At $45, profit is $15 and margin is 15 ÷ 45 = 33%."]},
    {"type":"num","q":"Priya's shop makes $50,000 in sales and $5,000 profit (a 10% margin). She raises prices by 4%, sells the same amount, and her costs don't change. By what % does her profit go up?","a":40,"tol":0.5,"unit":"%","e":"Extra sales = 4% × 50,000 = $2,000, all of it profit. New profit = $7,000. Rise = 2,000 ÷ 5,000 = 40%.","traps":[{"v":4,"why":"Assumed profit rises by the same % as price. The extra $2,000 is all profit, so profit grows much faster."},{"v":14,"why":"Added the 4% to the 10% margin. That isn't how much profit grew."}]}
  ],
  "statements": [
    {"type":"mc","q":"Jin's bakery did four things this year. Which one goes in the INVESTING part of the cash flow statement?","c":["Taking out a $20,000 bank loan","Buying a new $15,000 oven","Collecting $8,000 from café customers","Paying the owners a $5,000 dividend"],"a":1,"w":["Tempting because the loan may pay for equipment, but borrowing is a financing cash flow.","Buying equipment is investing cash flow, like buying property or other businesses.","Cash from running the business, like customer sales, is operating cash flow.","Dividends go to owners, so they sit under financing, with loans and raising equity."]},
    {"type":"num","q":"Maya's shop has cash $20,000, inventory $15,000 and equipment $25,000. It owes a bank loan of $30,000 and supplier bills of $10,000. What is the owners' equity in $?","a":20000,"tol":0.01,"unit":"$","e":"Assets = 20,000 + 15,000 + 25,000 = $60,000. Liabilities = $40,000. Equity = assets − liabilities = $20,000.","traps":[{"v":100000,"why":"Added everything. Debts are subtracted from assets, not added."},{"v":30000,"why":"Forgot the supplier bills. Payables are liabilities too."}]},
    {"type":"num","q":"A shop has cash $12,000, customer receivables $8,000 and inventory $10,000 (all current assets). Current liabilities are supplier bills $15,000 and taxes due $5,000. What is the current ratio?","a":1.5,"tol":0.01,"unit":"x","e":"Current assets = $30,000. Current liabilities = $20,000. Current ratio = 30,000 ÷ 20,000 = 1.5.","traps":[{"v":0.6,"why":"Counted only cash. Receivables and inventory are current assets too."},{"v":0.67,"why":"Flipped it: that's liabilities ÷ assets."}]},
    {"type":"num","q":"A café has total assets of $180,000 and total liabilities of $120,000. Net profit this year was $18,000. What is its return on equity (ROE) in %?","a":30,"tol":0.5,"unit":"%","e":"Equity = 180,000 − 120,000 = $60,000. ROE = net profit ÷ equity = 18,000 ÷ 60,000 = 30%.","traps":[{"v":10,"why":"Divided by total assets instead of equity."},{"v":15,"why":"Divided by liabilities instead of equity."}]},
    {"type":"mc","q":"Ana's company reports a net profit three years running, but its operating cash flow is negative every year. It keeps borrowing to cover the gap. What's the best read?","c":["Healthy. New loans show as positive financing cash flow, which balances it out.","A warning sign. Profit on paper isn't turning into cash from running the business.","Healthy. Profit is what counts, and cash timing evens out over a few years.","Only a problem if the balance sheet stops balancing, since that means the books are off."],"a":1,"w":["Loans do bring cash in, but borrowing to cover running costs hides the problem. It doesn't fix it.","Positive profit with negative operating cash flow year after year is a warning sign. Operating cash flow is the most important part.","Positive profit with negative operating cash flow year after year is the pattern the lesson calls a warning sign. Waiting won't fix it.","The balance sheet always balances. That says nothing about whether the business makes cash."]},
    {"type":"mc","q":"Both firms have a 3% net margin. Supermarket A was at 2% last year; similar supermarkets make 2-3%. Software firm B was at 20% last year; similar firms make about 20%. Which conclusion fits?","c":["Both are equally healthy, since their net margins match.","Both are weak, since 3% is a low net margin for any business.","A looks solid and B looks like it's struggling.","B looks better, because software margins usually bounce back."],"a":2,"w":["Same number, different meaning. Good ratios vary a lot by industry.","There's no universal good number. For a supermarket, 3% can be excellent.","Compare each with its own history and similar firms. A improved and beats peers; B fell from 20% and trails peers.","Hoping for a bounce isn't a reading of the numbers. B dropped sharply and trails similar firms."]}
  ],
  "why-business": [
    {"type":"mc","q":"Lou draws maps of his town. Friends say they're cool, but nobody has offered to pay. Which part of a business is Lou missing so far?","c":["A cheaper way to make and deliver the maps, so each one earns more.","Proof that people will pay. Liking it isn't paying for it.","A big online audience first, since trust comes before the sale.","Nothing yet. If friends like them, the problem is clearly real."],"a":1,"w":["Costs matter, but there's no income yet to compare them against. The first gap is buyers.","A business needs a problem, a solution people will pay for, and delivery that costs less. Nobody will pay means no income.","Audience first is a common way to start, but an audience still has to pay. The gap is buyers.","Compliments aren't sales. Without people who'll pay, it's a hobby, not a business."]},
    {"type":"mc","q":"Nia and five rival bakeries all use the same free AI tools for writing and design. What gives Nia a lasting edge?","c":["Using AI more, since it does the work of a team.","Cutting prices, since AI makes her costs much lower.","Knowing her customers better than her rivals do.","Posting far more often, since AI makes content cheap."],"a":2,"w":["The rivals have the same tools, so more AI alone doesn't set her apart.","Rivals' costs fell too, so they can cut prices just as easily.","When everyone has the same tools, the edge is knowing your customer.","Rivals can post just as often with the same tools. Volume isn't an edge."]},
    {"type":"mc","q":"Kai starts a $9-a-month study-notes subscription and 200 people sign up in month one. What risk does the lesson warn about?","c":["Unused subscriptions get cancelled, so he has to keep earning it.","Monthly income is less steady than one-off sales, so subscriptions are riskier.","None. 200 sign-ups in month one means his steady income is locked in.","Monthly prices put buyers off, so he should charge once up front."],"a":0,"w":["Subscriptions give steady income only while people keep finding them useful. Unused ones get cancelled.","The lesson says the opposite: steady monthly income is the attraction. The risk is people cancelling.","Sign-ups aren't locked in. People now cancel subscriptions they don't use.","He already got 200 sign-ups, so price format isn't the issue. Keeping people is."]},
    {"type":"mc","q":"Which idea fills every line of the formula: a real problem, a solution people pay for, and delivery that costs less than they pay?","c":["A free homework app students love, with no plan for anyone to pay.","Gold-plated pencil cases at $40 that nobody has asked for.","Fixing classmates' cracked screens for $30, with $12 of parts per fix.","Same-day cake delivery people pay $25 for, but it costs $32 to deliver."],"a":2,"w":["Solves a problem, but nobody pays, so there's no income.","Nice product, but no real problem it solves, so nobody buys.","Real problem, people pay $30, and it costs $12 to deliver. Every line is filled.","People want it and pay, but each sale costs $7 more than it brings in. Every sale loses money."]},
    {"type":"num","q":"Dev sells custom sneakers for $80 a pair. Each pair costs $65 in materials and $25 for a paid helper's time. He sells 40 pairs. How much money does he LOSE in total, in $?","a":400,"tol":0.01,"unit":"$","e":"Cost per pair = 65 + 25 = $90. Loss per pair = 90 − 80 = $10. Total loss = 10 × 40 = $400.","traps":[{"v":600,"why":"Forgot the helper's cost. That shows a $600 profit, but really each pair loses $10."},{"v":10,"why":"That's the loss on one pair. Multiply by the 40 pairs sold."}]},
    {"type":"mc","q":"A café owner cuts staff pay sharply to boost this year's profit. Customers are still happy. What does the lesson suggest?","c":["Smart. Owners take the risk and put in the money, so their return comes first.","Fine, because customers are the only group that really counts.","Fine, because higher profit is the signal the café is doing well.","Risky. Squeezing workers hard usually comes back to bite."],"a":3,"w":["Owners do deserve a return, but lasting businesses keep all four groups reasonably happy.","Customers matter most for sales, but workers, owners and the community count too.","The lesson says profit signals you solved a problem well. Profit from squeezing staff isn't that, and squeezing one group usually comes back to bite.","Lasting businesses keep customers, owners, workers and the community reasonably happy. Squeezing one group hard usually backfires."]}
  ],
  "buy-back-time": [
    {"type":"num","q":"Inés earns $52,000 a year. Using 2,000 working hours, what is her buyback rate (hourly value ÷ 4) in $?","a":6.5,"tol":0.01,"unit":"$","e":"Hourly value = 52,000 ÷ 2,000 = $26. Buyback rate = 26 ÷ 4 = $6.50 an hour.","traps":[{"v":26,"why":"That's her hourly value. The buyback rate divides it by 4."},{"v":104,"why":"Multiplied by 4 instead of dividing."}]},
    {"type":"mc","q":"Leo edits videos for clients. It pays well, but it drains him. In the DRIP idea, what kind of task is it?","c":["Delegate: hand it off first, since it drains him.","Replace: train or hire someone to take it over.","Invest: keep time for it, since it builds his skills.","Produce: spend more time here, since it pays well."],"a":1,"w":["Tempting because it drains him, but Delegate is for tasks that make little money, like inbox and scheduling. This one pays well.","Makes money but drains energy = Replace. Train or hire someone to do it.","Invest is for things that give energy but don't pay yet, like learning and health. This pays now and drains him.","Tempting because it pays well, but Produce needs both money and energy. This one drains him."]},
    {"type":"mc","q":"Ari earns $80,000 a year. A helper would handle her inbox for $15 an hour. Using the buyback rate rule, what should she do?","c":["Hand it off now: $15 is well below her $40 hourly value, so it's cheap.","Hand it off now: $15 is above her $10 buyback rate.","Hold off by this rule: $15 is above her $10 buyback rate.","Never hand it off: inbox work is an Invest task."],"a":2,"w":["Tempting, but the rule uses the buyback rate, not the hourly value. $40 ÷ 4 = $10.","Got the numbers but flipped the rule. Hand off tasks that cost LESS than the buyback rate.","Hourly value = 80,000 ÷ 2,000 = $40. Buyback rate = $10. $15 is more, so not yet by this rule.","Inbox work is a Delegate task: little money, drains energy. Price is the reason to wait."]},
    {"type":"mc","q":"Which message to a mentor follows the 1-3-1 rule?","c":["Sales fell, ads are pricey, my supplier is late and my site is slow. What should I do?","Sales fell 20%. I could cut prices, run ads or email past buyers. Which would you pick?","Sales fell 20%. Cut prices, run ads or email past buyers? I'd email: cheapest to test.","Sales fell 20%, so I'm emailing past buyers this week. Just letting you know how it goes."],"a":2,"w":["Four problems and no options. 1-3-1 starts with one problem, stated clearly.","One problem and three options, but no recommendation. It still asks the mentor to decide.","One problem, three options, one recommendation with a reason. It turns a question into a decision.","Has a pick, but no other options were weighed. 1-3-1 needs three possible solutions."]},
    {"type":"mc","q":"Mia, 16, runs a small online shop. Packing orders earns money but drains her, and she re-explains it to her brother every week. She can't pay anyone yet. Best first move?","c":["Wait until she can afford to hire, then think about handing it off.","Call it Produce, since it earns money, and keep doing it herself.","Pay her brother anyway, since buying back time always comes first.","Film herself packing once, explaining each step, and reuse it."],"a":3,"w":["Waiting wastes time now. With little money, start with free time-savers like recorded how-tos.","Produce needs money AND energy. Packing drains her, so it's a Replace task.","She can't pay yet. The lesson says start with free time-savers first.","This is the camcorder method: teach once on video, never explain it twice. It costs nothing."]},
    {"type":"num","q":"Ty wants to hand off tasks that cost $9 an hour. What yearly income makes $9 exactly his buyback rate? (Use 2,000 hours and hourly value ÷ 4.)","a":72000,"tol":0.01,"unit":"$","e":"Hourly value = 9 × 4 = $36. Yearly income = 36 × 2,000 = $72,000.","traps":[{"v":18000,"why":"Forgot the ÷ 4 step. That treats $9 as his full hourly value."},{"v":4500,"why":"Divided by 4 instead of multiplying when working backwards."}]}
  ],
  "ai-at-work": [
    {"type":"num","q":"Writing product descriptions by hand takes Jo 5 hours a week. With AI, writing takes 30 minutes and checking takes 3 hours. How many hours a week does AI save?","a":1.5,"tol":0.01,"unit":"hours","e":"Time with AI = 0.5 + 3 = 3.5 hours. Saved = 5 − 3.5 = 1.5 hours a week.","traps":[{"v":4.5,"why":"Forgot the checking time. Checking is part of the real cost."},{"v":2,"why":"Counted the checking but forgot the 30 minutes of writing."}]},
    {"type":"mc","q":"Lu's AI drafts four messages. Which one most needs a person to check it before it goes out?","c":["A warm thank-you reply posted under a customer's 5-star review","A customer reply saying refunds are allowed within 30 days","A summary of this week's customer emails for the team meeting","A list of blog post ideas for Lu to choose from"],"a":1,"w":["It goes to a customer, but has no price, promise or policy to get wrong.","It states a policy and a number to a customer. AI can invent rules, so a person checks first.","This is an inside job. Mistakes here don't reach customers.","Ideas are an inside job. Lu picks from them before anything goes public."]},
    {"type":"mc","q":"Rosa wants a free AI chatbot to sort a sheet of customer names, emails and card numbers. What's the best move?","c":["Paste it, then delete the chat right afterward so nothing is kept.","Paste only the names and card numbers, leaving the emails out to be safe.","Paste it as is. The tool is popular with businesses, so it must be safe.","Remove the emails and card numbers before pasting anything in."],"a":3,"w":["Deleting later doesn't undo what the tool may already have saved or trained on.","Card numbers are the most private item of all. They don't belong in free tools.","Popular doesn't mean private. Check what the settings say about saving and training on your data.","Emails and card numbers don't belong in free AI tools. Remove them first. A business plan, after checking its data settings, is the other safe route."]},
    {"type":"mc","q":"A team's best prompt for writing quotes worked last month but now gives different totals. It lives in one person's chat history. What's the right fix?","c":["Switch to a newer AI tool whenever answers start to change.","Save it in a shared place and re-test it every month.","Assume the person typed it wrong and keep using it as is.","Leave it running. Small changes should even out over time."],"a":1,"w":["Newer tools get updated too, so this just restarts the problem. The lesson says pick one or two tools and learn them well.","AI tools update, so a prompt that worked last month can drift. Keep it in one shared place and re-test it every month.","Tempting, but tools change. A prompt that worked last month can give different answers now.","Different totals won't fix themselves, and quotes reach customers. Anything with a number gets checked by a person before a customer sees it."]},
    {"type":"mc","q":"A client saw a perfect AI demo online. She asks Zane to build a bot that answers every customer question with no mistakes. What should he say up front?","c":["Yes. That demo proves the idea works, so we can launch it next week.","It will sometimes be wrong, so we'll test it on 50 of your real examples.","It can do anything once tuned, so I'll include every feature in this quote.","With good prompts it won't make mistakes, so no one needs to check it."],"a":1,"w":["A demo works once. Real customer questions are messier than a demo.","Be honest up front: it will sometimes be wrong. Test on 50 real examples before relying on it, and have a person check the important parts.","Promising everything sets up a fight later. Say what this version does well; anything else is a new quote.","AI makes confident mistakes even with good prompts. A person must check what matters."]},
    {"type":"num","q":"Ben pays $20 a month for an AI tool. It saves him 6 hours of writing a month but adds 4 hours of checking. His time is worth $15 an hour. What is the tool's net value per month in $?","a":10,"tol":0.01,"unit":"$","e":"Real time saved = 6 − 4 = 2 hours. Value = 2 × $15 = $30. Net = 30 − 20 = $10 a month.","traps":[{"v":70,"why":"Forgot the 4 hours of checking. Count the checking, not just the writing."},{"v":30,"why":"Forgot to subtract the $20 cost of the tool."}]}
  ],
  "mkt-basics": [
    {"type":"mc","q":"Ana's budgeting app has automatic bank sync. Which line leads with the benefit and uses the feature as proof?","c":["Automatic bank sync, custom categories and 24/7 support, all packed into one simple app.","The most advanced budgeting app on the market today, built by a team of experts.","Know where every dollar went without typing a thing, thanks to bank sync.","A budgeting app for everyone out there who wants to manage their money better."],"a":2,"w":["Feels thorough, but it's a list of features. It says what the app is, not what it does for the user.","Sounds confident, but it's a vague claim with no benefit and no proof.","It opens with what changes for the user (no typing, full picture) and then names bank sync as the reason to believe it.","Aims at everyone, so it lands with no one. It also gives no feature as proof of what the user gets."]},
    {"type":"mc","q":"Kai makes healthy snack boxes. Which customer description gives him the best start?","c":["Anyone who gets hungry during the day and likes to eat healthy food","Parents of kids on travel soccer teams who pack weekend game snacks","Busy adults aged 18 to 65 across the US who want quick, healthy snacks","Health-conscious consumers in the fast-growing healthy snack market"],"a":1,"w":["Feels like the biggest market, but 'for everyone' means the message lands with no one.","Clear who, clear problem, and clear where to find them (team groups, games). He could find ten of them this week.","An age range feels specific, but it's still millions of very different people with different problems.","Sounds professional, but you couldn't find ten of these people this week. It's a category, not a customer."]},
    {"type":"mc","q":"Maya built an app for splitting house chores. Her target roommates now use a group chat and a whiteboard. What is her real competition?","c":["Other chore-splitting apps already listed in the app store","Nobody yet, since no one has built her exact app","Big tech companies that could copy her idea quickly","The group chat and whiteboard they already use"],"a":3,"w":["Tempting because they look like her, but her customers aren't choosing between apps. They're choosing whether to leave their current habit.","Feels true for a new idea, but the lesson says what customers use now instead of you is your real competition.","A common worry, but it's not what her customers weigh up when deciding to switch.","What customers use now instead of you is your real competition, even if it's a whiteboard or 'doing nothing'."]},
    {"type":"mc","q":"Omar has $300 and a message that says 'Quality products for everyone.' Sales are slow. What's the smartest next move?","c":["Pick one customer and write a clear positioning sentence first","Spend all $300 on ads right away to find out who actually buys","Split the $300 across four ad platforms to reach more people fast","Keep the message but buy ads with brighter, bolder images"],"a":0,"w":["Ads amplify a message. With a vague message they amplify nothing. Fix who it's for and why him first.","The most common first-time mistake: buying ads before knowing who the customer is. If the message is vague, ads amplify nothing, at his expense.","More reach feels safer, but spreading a vague message wider still amplifies nothing.","Better images feel like a fix, but the message is still vague, and ads amplify the message."]},
    {"type":"mc","q":"Lena reads her positioning sentence to a stranger. After 5 seconds they say, 'It's... some kind of software?' What should she do?","c":["Add more features so the sentence sounds more impressive and complete","Simplify it until a stranger can say what it does and who it's for","Test it on friends instead, since they already know the product well","Keep it as is, since strangers aren't her real customers anyway"],"a":1,"w":["Feels like more detail helps, but the test is whether a stranger can repeat it. More features won't make that easier.","That's the lesson's test: if a stranger can't repeat what you do and who it's for after 5 seconds, simplify.","Friends already know the product, so they'd 'get it' anyway. That hides the problem instead of fixing it.","Feels reasonable, but the lesson's test uses a stranger on purpose: if they can't repeat it after 5 seconds, simplify."]},
    {"type":"mc","q":"Sam knows his customer and his message works: ads get good clicks. But his page says 'Price on request' and offers no guarantee. Few people buy. Best fix?","c":["Double the ad budget so even more people land on the page","Widen his target so more types of customers see the ads","Show a clear price, a simple bundle and a fair guarantee","Rewrite the ad headline so it gets even more clicks"],"a":2,"w":["More traffic feels like progress, but if the offer stops people buying, he'd pay to lose more of them.","Tempting when sales are low, but his customer isn't the problem. Going broader weakens the message.","The offer is part of the marketing. A clear price, simple bundle and fair guarantee often lift sales more than a better ad.","The clicks are already good. The drop happens on the page, at the offer."]}
  ],
  "mkt-channels": [
    {"type":"mc","q":"Zoe just started a dog-walking business and has zero customers. What's the fastest way to her first 10?","c":["Write helpful articles so dog owners find her in search","Run paid ads to reach every dog owner in town","Wait for happy customers to refer their friends","Message neighbors and people she knows who have dogs"],"a":3,"w":["Useful later, but content and search are slow: months before free traffic arrives.","Ads are fast, but they come last, after she knows her message and numbers.","Referrals need people who already love the product. She has no customers yet.","Direct outreach is fast and costs only time. First customers come from people you can reach directly."]},
    {"type":"mc","q":"Ravi has 5,000 followers on one app and 200 email subscribers. Which statement matches the lesson?","c":["The 200 emails are his; followers can vanish if the app changes rules","The 5,000 followers matter more, because that number is so much bigger","Both are equally safe, since people chose to follow him in both places","He should move his email subscribers over to social so he grows faster"],"a":0,"w":["Own your audience. Social followers can vanish with a rule change; an email list is yours.","Bigger feels better, but he doesn't control whether those followers ever see him again.","They both opted in, but only one can be taken away by someone else's rule change.","Growth feels like the goal, but that moves people from what he owns to what he rents."]},
    {"type":"mc","q":"Ines sells candles online. Plenty of people visit, add to cart and ask questions. Most leave at checkout when shipping costs appear. Which stage should she fix first?","c":["Aware: get more people to hear about her","Interested: get more people to visit and follow","Buy: the checkout step where people drop out","Return: get buyers to come back and tell friends"],"a":2,"w":["More traffic is the usual reflex, but it would just pour more people into the same leak.","Visits and interest are already strong, so this isn't where she's losing people.","Find the stage where you lose people and fix that first. Here they decide to buy, then quit at payment.","Repeat buyers matter, but few people are buying at all yet, so it's not the bottleneck."]},
    {"type":"mc","q":"Ben has three tutoring clients. He hasn't tested which message works or tracked any numbers. Should he spend $500 on ads now?","c":["Yes, because ads are the fastest channel and he needs customers now","Yes, but split it across five platforms so he can test them all","No, because paid ads just don't work for small businesses like his","Not yet: learn his message and numbers first, then use ads"],"a":3,"w":["Ads are fast, but the lesson says spend on ads only once you know your message and your numbers. He doesn't yet.","Feels like testing, but five half-done channels usually lose to one done properly, and it's still too early for ads.","Right to wait, wrong reason. Ads work well for scaling something that already sells.","Ads come last. Once he knows his message and numbers, ads pour fuel on something that already works."]},
    {"type":"mc","q":"Chloe posts on five apps, sends an occasional email and runs small ads. Everything is half done and results are weak. What should she do?","c":["Add a sixth channel so her posts reach even more new people each week","Pick one or two channels that reach her customers and do them well","Split her time evenly across all of them so no channel falls behind","Drop everything else and rely only on word of mouth from now on"],"a":1,"w":["More channels feels like more reach, but it spreads her thinner and makes each one worse.","Focus on one or two channels. Five half-done channels usually lose to one done properly.","Feels fair, but equal effort keeps every channel half done.","Referrals are low cost, but they come once people love the product. She still needs a way to reach people."]},
    {"type":"mc","q":"Diego sells seed kits and joins an online forum for new gardeners. What should he do first?","c":["Answer questions first; mention his kit once members trust him","Post his product link in every thread so lots of people see it","Ask members to follow his social account before he posts anything","Skip posting and run paid ads aimed at the forum's members instead"],"a":0,"w":["Communities work best when you help first and pitch second. Answering questions is helping first.","Feels efficient, but it's pitching first. The lesson's rule for communities is help first, pitch second.","He wants an audience, but asking for something before giving anything is still pitching first.","Ads come last. A community is a fast channel that costs only time, if he helps first."]}
  ],
  "mkt-measure": [
    {"type":"mc","q":"Nia's video got 40,000 views and 3,000 likes. Which number tells her if it helped the business?","c":["The 3,000 likes, because they show people enjoyed it","The 40,000 views, because more reach means more buyers","The new followers it brought to her account","How many sign-ups and sales came from those views"],"a":3,"w":["Likes feel like proof, but they're a vanity number. Liking isn't buying.","Reach is tempting, but views only matter if some turn into sales.","Followers are on the lesson's 'feels good' list too. They don't pay bills by themselves.","Views and likes feel good; sign-ups and sales from those views are what actually matter."]},
    {"type":"num","q":"Kofi had 15 customers. This month he spent $900 on marketing and now has 45 customers. What is his CAC (cost per new customer) in $?","a":30,"tol":0.01,"unit":"$","e":"New customers = 45 − 15 = 30. CAC = spend ÷ new customers = 900 ÷ 30 = $30.","traps":[{"v":20,"why":"Divided by all 45 customers, not just the 30 new ones."},{"v":60,"why":"Divided by the 15 old customers instead of the 30 new ones."}]},
    {"type":"mc","q":"Lucia changed her headline, price and product photo on the same day. Sales rose 20%. What can she conclude?","c":["The headline worked, since it's the first thing people see","She can't tell which change, if any, caused the rise","The new price worked, since price is what most buyers check first","All three changes helped by about the same amount each"],"a":1,"w":["A believable guess, but nothing in her results separates the headline from the other two changes.","Change one thing at a time. With three changes at once she can't tell which worked, and a small test can swing by luck.","Price feels like the obvious driver, but she can't separate it from the other two changes.","Feels fair, but one change might have done all the work, or one might have hurt."]},
    {"type":"num","q":"Each of Dev's customers pays $40 a month at a 50% gross margin and stays 8 months. What is the LTV in $?","a":160,"tol":0.01,"unit":"$","e":"LTV = revenue per month × gross margin × months = 40 × 0.5 × 8 = $160.","traps":[{"v":320,"why":"Forgot the gross margin: that's revenue, not what each customer is worth after costs."},{"v":20,"why":"Only one month's margin; forgot to multiply by the 8 months they stay."}]},
    {"type":"num","q":"Rosa's CAC is $90. Each customer pays $30 a month at a 60% gross margin. How many months until a customer pays back their CAC?","a":5,"tol":0.01,"unit":"months","e":"Monthly margin = 30 × 0.6 = $18. Payback = CAC ÷ 18 = 90 ÷ 18 = 5 months.","traps":[{"v":3,"why":"Used revenue ($30) instead of gross margin ($18) per month."},{"v":1.8,"why":"Multiplied by the margin instead of dividing by the monthly margin."}]},
    {"type":"mc","q":"Plan A: CAC $60, LTV $200. Plan B: CAC $20, LTV $50. Which meets the 3:1 LTV:CAC guideline?","c":["Plan A only: 200 ÷ 60 ≈ 3.3 to 1","Plan B only: its customers cost just $20 each","Both: each customer is worth more than they cost","Plan B only: 20 ÷ 50 is the smaller, safer ratio"],"a":0,"w":["LTV ÷ CAC: A = 200 ÷ 60 ≈ 3.3, above 3:1. B = 50 ÷ 20 = 2.5, below it.","Cheap customers feel like a win, but the guideline compares what they're worth to what they cost. B is only 2.5:1.","Worth more than cost is a start, but the healthy guideline is about 3 times, not just above 1.","That flips the ratio (CAC ÷ LTV). The guideline is LTV ÷ CAC, and B gives 2.5:1."]}
  ],
  "mkt-words": [
    {"type":"mc","q":"Which headline passes the five-second test for Jade's mobile dog-grooming van?","c":["Welcome to Pawsome Pets, where every dog is family!","Innovative pet care solutions for today's busy modern dog owners","Dog grooming in your driveway, booked in 2 minutes","The best dog groomers in the whole city, guaranteed!"],"a":2,"w":["Friendly, but it doesn't say what she does. A stranger still can't tell what she sells.","Sounds polished, but it's vague. 'Solutions' could mean anything.","Specific beats clever: a stranger instantly knows what she does, where, and how easy it is.","Big claims aren't believable or specific, and they don't say what you get."]},
    {"type":"mc","q":"Femi's page offers a free study plan. Which button text is best?","c":["Submit","Get my free study plan","Follow, share and sign up today","Continue"],"a":1,"w":["Common on forms, but it doesn't say what they get. The lesson's example: 'Get my free plan' beats 'Submit'.","One ask, starting with a verb and saying what happens. They know exactly what they'll get.","Feels like more chances for action, but several asks at once usually means they do nothing.","Short and verb-first, but it doesn't say what happens next."]},
    {"type":"mc","q":"Tara's flyer: 'Tired of messy closets? I'll organize any closet in one afternoon. Used by 12 neighbors.' People read it but nobody books. Which part is missing?","c":["The proof: a reason to believe she can do it","The promise: what changes for the customer","The problem: the pain in the customer's words","The ask: one clear next step to take"],"a":3,"w":["'Used by 12 neighbors' is real proof, so that part is there.","'Organize any closet in one afternoon' is a clear promise of what changes.","'Tired of messy closets?' names the pain, so the problem is covered.","It has problem, promise and proof, but no ask. No ask: they don't act."]},
    {"type":"mc","q":"Customers keep telling Nora, 'I never know what to cook on weeknights.' Which headline should she test for her meal-plan service?","c":["Optimized meal planning for efficient modern households","Chef-curated recipes for elevated home dining","Never wonder what to cook on a weeknight again","Welcome to Nora's Weekly Meal Plans"],"a":2,"w":["Sounds professional, but these aren't words her customers use. Clear beats clever.","Sounds premium, but it's her words, not theirs, and it skips the real pain: not knowing what to cook.","It reuses her customers' own words. The best copy is stolen from customers, and it names a clear result.","A friendly name, but it doesn't say what they get, so it fails the five-second test."]},
    {"type":"mc","q":"Leo's lawn-care business has 5 customers so far, and 4 came back for a second job. What proof should he use?","c":["\"4 of my first 5 customers booked me again.\"","\"Trusted by hundreds of happy homeowners.\"","Five-star reviews written by friends, posted as customers","No proof yet; wait until he has 100 customers"],"a":0,"w":["Real proof, even small, is enough. Coming back is strong evidence people liked his work.","Sounds stronger, but it's invented. It destroys trust when people find out.","Feels like a harmless boost, but fake reviews destroy trust and in the US can break consumer-protection law.","Feels honest, but without proof people don't believe. Small, real proof works now."]},
    {"type":"mc","q":"Jules's sign-up page gets visits, but people say they're not sure it's worth it. Which change fits the lesson best?","c":["Add 'Free for 7 days, no card needed' to lower the risk","Add a countdown saying the offer ends tonight, reset daily","Add more asks: follow, share and subscribe too","Make the headline more clever and playful"],"a":0,"w":["Their doubt is risk. Lowering it, like a free trial with no card, makes saying yes easier.","Urgency is tempting, but a deadline that resets is fake. Fake deadlines destroy trust.","More options feel like more chances, but several asks at once usually means they do nothing.","Clever feels fresh, but clear beats clever, and it doesn't answer 'is it worth it?'"]}
  ],
  "mkt-social": [
    {"type":"mc","q":"Ayo sells custom phone cases. Which video opening best works as a hook?","c":["\"Hi everyone, welcome back, today I want to talk about...\"","\"Please like and follow for more phone case content!\"","\"3 mistakes that crack your phone case in a week\"","\"Check out our brand-new phone case collection!\""],"a":2,"w":["A common way to start, but slow intros waste the 2 seconds that decide if people stay.","Asking first feels natural, but a hook must earn attention before any ask.","It gives a reason to stop in the first 2 seconds and promises one useful idea.","That's shouting, not teaching, and it gives no reason to stop in the first 2 seconds."]},
    {"type":"mc","q":"Aisha sells bookkeeping services to small law firms across the country. Which platform should she start with?","c":["TikTok","A local Facebook group","Instagram Reels","LinkedIn"],"a":3,"w":["Great for being discovered by strangers, but the lesson points to LinkedIn for selling to businesses.","Good for local businesses and tight niches, but her customers are spread across the country.","Short video helps strangers discover you, but the lesson names LinkedIn for selling to businesses and professionals.","LinkedIn is good for selling to businesses and professionals, which is where her customers are."]},
    {"type":"mc","q":"Post A: 10,000 likes, 4 link clicks. Post B: 800 likes, 120 saves, 60 site clicks, 15 email sign-ups. Which did more for the business?","c":["Post A: 10,000 likes shows much bigger demand for the product","Post B: saves, clicks and sign-ups lead toward buying","Post A: big reach like that always turns into sales later on","They're about equal once you add up all the numbers together"],"a":1,"w":["Likes feel like demand, but only 4 people clicked. Liking isn't buying.","Likes are vanity. Saves, shares, clicks and email sign-ups are what move people toward buying.","Hoped-for, but a big audience can be the wrong audience, and reach from the wrong audience sells nothing.","Adding likes to clicks mixes vanity numbers with real ones. Only B moved people toward buying."]},
    {"type":"mc","q":"Marco posted 4 videos over 2 weeks and got few results. He wants to quit the platform. What does the lesson suggest?","c":["Quit now, since two weeks of weak results shows it won't work","Start on three more platforms so he finds the right one faster","Buy followers so the platform starts showing his posts more","Post steadily, like 3 times a week, for a few months first"],"a":3,"w":["Feels like a fair test, but 4 posts is far too little to judge a platform.","Feels faster, but one platform done well beats four done badly.","Tempting shortcut, but buying followers ruins your reach and fools no one.","The rule of thumb: post steadily, such as 3 times a week, for a few months before judging a platform."]},
    {"type":"mc","q":"Kim has 3,000 followers on one app. What's the best way to protect that audience long term?","c":["Offer a free useful tool for an email sign-up, linked in her bio","Ask for more follows in every post, since followers are her audience","Post more often until she reaches 10,000 followers","Copy all her posts to every other platform she can"],"a":0,"w":["Followers can vanish if a platform changes. Moving them to her email list gives her an audience she owns.","Feels like growth, but followers still belong to the platform, not to her.","A bigger number feels safer, but a rule change can wipe out 10,000 as easily as 3,000.","Feels like spreading risk, but those are still followers a platform can take away, and one platform done well beats four done badly."]},
    {"type":"mc","q":"Ty's funny video for his local lawn-care business got 2 million views, mostly from other countries, and zero bookings. His usual posts reach 300 neighbors and bring 5 bookings a month. What's the lesson?","c":["Chase more viral videos, since reach turns into sales over time","Keep posting for the 300 neighbors who see him every week","Buy followers to keep the viral momentum going","Count the 2 million views as his best marketing result"],"a":1,"w":["Feels like the big chance, but going viral is mostly luck, and these viewers can't hire a local lawn service.","A small group of the right people who see you every week builds a business. Viral reach from the wrong audience sells nothing.","Feels like keeping a hot streak, but buying followers ruins your reach and fools no one.","Views feel like success, but they're a vanity number. Zero bookings means it didn't help the business."]}
  ],
  "negotiation": [
    {"type":"mc","q":"Dev has one job offer and negotiates tomorrow. Which prep step gives him the most power?","c":["Plan to talk first and fill every silence, so he stays in control of the talk","Line up a real alternative, like a second interview or staying in his current job","Keep his walk-away point open, so he can decide once he hears what they offer","Be ready to say he has another offer, since that pushes them to pay more"],"a":1,"w":["Talking feels like control, but the lesson says to listen more than you talk and use silence. People fill silence with concessions and information.","Your BATNA, what you'll do if the deal fails, is your power. The lesson says improve it before you negotiate.","Waiting feels flexible, but the lesson says set your walk-away point from your BATNA, before you're in the room.","A fake offer feels like instant power, but it's lying about facts. The lesson says that's easy to call out and ruins trust."]},
    {"type":"num","q":"Lena lists her used van at $18,000 but won't go below $14,500. Omar opens at $13,000 but will pay up to $16,000. How wide is the ZOPA, in dollars?","a":1500,"tol":0.01,"unit":"$","e":"ZOPA = buyer's walk-away − seller's walk-away = $16,000 − $14,500 = $1,500. Opening numbers don't set it.","traps":[{"v":5000,"why":"That uses the opening numbers (asking price and first offer), not the walk-away points."},{"v":3000,"why":"That's the gap between Omar's opening offer and his max, not the overlap with Lena."},{"v":3500,"why":"That's Lena's own range from asking price to walk-away, not the overlap."}]},
    {"type":"mc","q":"Ava is pricing her first freelance logo job and has no idea what the market pays. How should she handle the first number?","c":["Name a high number first anyway, since the first number always pulls the result","Pick a low number so the client sees her as reasonable and says yes fast","Let the client go first, or anchor with research on what similar jobs pay","Suggest they each name a number and then split the difference"],"a":2,"w":["Anchoring is real, but the lesson says to open first when you know the market well, with a reason attached. She doesn't know it.","Feels safe, but the first number pulls the result toward it. A low guess drags her price down before the client even responds.","When you don't know the market, let them go first or anchor with research (\"Similar jobs pay $X–Y\"). That protects her from a bad guess.","Sounds fair, but the lesson says splitting the difference early rewards whoever anchored more extremely, and she has no idea what's normal yet."]},
    {"type":"num","q":"Jae has a real offer from another café: $17/hour for 25 hours a week. A new café offers 20 hours a week. If only weekly pay matters, what's the lowest hourly rate he should accept? (to the cent)","a":21.25,"tol":0.01,"unit":"$","e":"BATNA pays 17 × 25 = $425 a week. At 20 hours: 425 ÷ 20 = $21.25/hour. Set the walk-away point from the BATNA.","traps":[{"v":17,"why":"That matches the hourly rate but ignores that he'd work 5 fewer hours, so he'd earn $85 less a week."},{"v":13.6,"why":"That flips the hours. It would pay only $272 a week, well below his BATNA."}]},
    {"type":"mc","q":"Kofi is selling 200 custom shirts to a school club. He's already dropped from $15 to $13 a shirt. They ask for more. Best next move?","c":["\"If you can pay half up front, I can do $12.50.\"","\"OK, I can go to $11 if that gets it done today.\"","\"Let's split the difference between my $13 and your $9.\"","\"I'll do $12.50 and add free delivery as a goodwill gesture.\""],"a":0,"w":["It trades instead of gives (\"If you X, I Y\"), and the 50-cent step is smaller than his last $2 drop, signaling he's near his limit.","Feels like closing, but it's the same $2 drop as last time, so it doesn't signal he's near his limit, and he gets nothing back.","Feels fair, but the lesson says splitting the difference early rewards whoever anchored more extremely. Meeting at $11 rewards their $9.","Goodwill feels smart, but the lower price and the free delivery are both given away for nothing. The lesson says never make a concession for free."]},
    {"type":"mc","q":"Sam won't cater a 100-person party for under $2,400. The client says $2,000 is their max and means it. What's Sam's best move?","c":["Offer $2,200 so they meet in the middle and each side gives up a little","Ask what matters most to them, then change the deal, like a simpler menu","Say another client will pay $2,400 for that date, to push their budget up","Accept $2,000, since some deal is better than no deal at all for his business"],"a":1,"w":["Meeting in the middle sounds fair, but $2,200 is above their max and below Sam's walk-away. Both sides say no.","There's no ZOPA on price alone, so the lesson says change the deal itself. Asking why finds trades that cost Sam little and matter to them.","Tempting pressure, but if it isn't true it's a lie about facts. The lesson says that's easy to call out and ruins trust.","Feels practical, but $2,000 is below Sam's walk-away point, the worst deal he'll accept. Taking it is worse than his own limit."]}
  ],
  "scripts": [
    {"type":"mc","q":"Early in an interview, the recruiter asks Rosa what salary she expects. Which reply best follows the script?","c":["\"I'd like to learn more about the role. What's the budgeted range?\"","\"I'd take $48k, but I'm flexible on that, depending on the role itself.\"","\"I'm making $41k now, so something a bit above that would work.\"","\"Whatever you think is fair for this role is fine with me.\""],"a":0,"w":["It's the script for when they ask early: learn more about the role first and get their budgeted range before naming a number.","Tempting to be helpful, but it names a number before she knows the role, then says she'd move on it. That's skipping the script.","Feels honest, but it ties her offer to her old pay instead of the role. The script asks for their budgeted range instead.","Sounds polite, but it gives them the whole decision and asks nothing back. The script asks for their budgeted range."]},
    {"type":"mc","q":"Leo is a shift lead asking for a raise. Which opening is strongest?","c":["\"My rent went up $200 a month, so I need more to keep up with it.\"","\"I've been here three years now and never once missed a single shift.\"","\"I'm working harder than anyone else on the team, so I deserve more pay.\"","\"I cut food waste by $3,000 this year. Market data shows leads earn more.\""],"a":3,"w":["Real and fair to feel, but it's his problem, not theirs. The lesson says bring results, not needs.","Loyalty matters, but time served isn't a result with a number. It gives them no business reason to pay more.","Effort feels like a strong case, but it has no number or proof, so it's easy to disagree with.","A concrete result with a number, plus market data, is exactly what the raise script asks for."]},
    {"type":"mc","q":"Nadia's offer arrives at $60k. Market data for the role shows $62–68k. Which reply best follows the script?","c":["\"That's lower than I need, since rent is high here. Could you do $67k?\"","\"Thanks, I'm excited. Market data says closer to $67k. Is base flexible?\"","\"I was hoping for $67k, but if that's too much I understand, I'm flexible.\"","\"I'll accept $60k now, then ask for a raise once I've proved myself here.\""],"a":1,"w":["Asking for a number is good, but the lesson says bring results and market data, not personal needs like rent.","Thanks, enthusiasm, a reason (market data), a target and a question. Then the script says stop talking and let them answer.","The target is right, but she backs off before they reply. The script says make your ask, then stop talking.","Feels safe, but the script says to ask for your target when the offer arrives. A later raise isn't promised, and $60k is below market."]},
    {"type":"num","q":"Same car, $0 down. Offer A: $350 a month for 60 months. Offer B: $420 a month for 48 months. How many dollars more does Offer A cost in total?","a":840,"tol":0.01,"unit":"$","e":"A = 350 × 60 = $21,000. B = 420 × 48 = $20,160. A costs 21,000 − 20,160 = $840 more, despite the lower monthly payment.","traps":[{"v":70,"why":"That's the difference in monthly payment. It ignores that A runs 12 months longer."},{"v":3360,"why":"That assumes both loans last 48 months. A runs 60 months."},{"v":21000,"why":"That's A's total, not how much more it costs than B."}]},
    {"type":"mc","q":"Mina quotes $1,200 for a 6-page website with a shop. The client says, \"Too expensive, we have $900.\" Best reply?","c":["\"OK, I can do the full site for $900 this time, just to win you over.\"","\"Which part matters most? We could build the shop and 3 pages for $900.\"","\"I'll keep it at $1,200 but add a free logo so it feels worth it.\"","\"Let me walk you through why every page and feature is worth the full price.\""],"a":1,"w":["Feels like winning the client, but the lesson says discounting trains clients to push back every time. Cut scope, not price.","Ask which part matters most, then cut scope, not price. She keeps her rate and fits their budget.","Adding value sounds clever, but the price is still over their budget, and she gives away work for free.","Tempting to defend the quote, but it ignores their budget. The script asks which part matters most, then cuts scope."]},
    {"type":"mc","q":"A recruiter tells Theo, \"Base salary is fixed at $55k, no exceptions.\" What's his strongest next move?","c":["\"Could you stretch to $57k base? It would really help me out.\"","\"Fine, but my rent is high here, so I really need more than that.\"","\"I understand. Could we look at a signing bonus or extra leave?\"","\"OK, I accept $55k. Thank you, I'm excited to start with the team.\""],"a":2,"w":["Feels persistent, but they just said base is fixed. The script moves to other things they can still give.","Feels honest, but rent is a personal need. The lesson says bring results and market data, not needs, and base is fixed anyway.","When base is fixed, the script asks about other things: a signing bonus, extra leave, a title change or a review at six months.","Ending politely feels safe, but he skips the script's next step: asking about a bonus, leave, title or an early review."]}
  ],
  "persuasion": [
    {"type":"mc","q":"Tess sells booking software to a dog groomer. Which line best makes it about the groomer?","c":["\"Our app has 40 features, including smart scheduling.\"","\"I need two more sign-ups to hit my target this month.\"","\"You'll stop losing Saturday bookings to missed calls.\"","\"We're one of the newest booking apps in town.\""],"a":2,"w":["Features feel impressive, but they describe the product. She has to translate them into what the groomer gets.","Honest, but it's her reason, not theirs. Your target isn't a reason for them to buy.","It names a real gain for the groomer: bookings they're losing now. Translate every point into what they get.","A fact about her company, not a benefit to the groomer. It gives them no reason to say yes."]},
    {"type":"mc","q":"Jamal bakes muffins and wants a local café to sell them. Which ask is easiest to say yes to?","c":["\"Will you stock my muffins every week for the next whole year?\"","\"Can I drop off 12 muffins Friday, and you pay for what sells?\"","\"Let me know if you're ever interested in some local baked goods.\"","\"Will you commit to weekly orders if I give you 10% off the price?\""],"a":1,"w":["Clear, but it's a big, long commitment from a stranger. A small first step is easier to agree to.","Small, clear and easy: they know exactly what happens and can try it first. The lesson says make the first step easy.","Feels low-pressure, but it's vague. A vague ask gets a vague answer, usually nothing.","The discount sweetens it, but it's still a big commitment. A small, easy first step is easier to say yes to."]},
    {"type":"mc","q":"A gym owner says, \"I'm not sure we have the budget for this.\" Which reply follows acknowledge, ask, answer, check, in order?","c":["\"It pays for itself fast, since most gyms save with it. Shall we sign today?\"","\"Budgets are tight. What are you using now? It cuts no-shows. Want a trial?\"","\"That's fair. What do you use now? We cost less than that. Does that cover it?\"","\"That's fair, price matters. It costs less than most tools. What do you use now?\""],"a":2,"w":["Jumps straight to answering and closing. It skips acknowledging and never asks what they're comparing with.","Close, but it ends with a new ask instead of checking whether the worry is answered.","Acknowledge, ask what they compare with, answer with one clear reason, then check. All four steps, in order.","Starts well, but it answers before asking, so the answer may miss the real worry, and it never checks."]},
    {"type":"mc","q":"Priya sells a no-show reminder app to hair salons. Which line backs up her pitch best?","c":["\"Honestly, it's the best no-show tool out there for any salon.\"","\"Everyone who's tried it so far really loves it, every single one.\"","\"Only 2 spots left at this price!\" (there's no real limit)","\"One salon nearby went from 10 no-shows a week to 4.\""],"a":3,"w":["Confidence feels persuasive, but it's a claim with no proof. Anyone can say it.","Sounds like proof, but it's vague. No number, no result, no example they can check.","Creates urgency, but it's fake scarcity. It may win one yes and lose the relationship when they find out.","Proof is a number, a result, a short example. A nearby salon with a real before-and-after is hard to argue with."]},
    {"type":"mc","q":"Ray offers lawn care. A neighbor says, \"The last guy kept showing up late and I had to chase him.\" Best next line?","c":["\"We're cheaper than he was, so you'll save money too.\"","\"So reliability matters more to you than price?\"","\"Our plan includes mowing, edging and leaf blowing.\"","\"I'm never late, I promise. Want to book now?\""],"a":1,"w":["Tempting to lead with price, but the neighbor didn't mention price. It answers a worry they don't have.","Repeating the concern back shows he understands it. People say yes more readily to someone who gets the problem.","A list of features, not their worry. It ignores what the neighbor just told him.","Reassuring, but it's a claim with no proof and rushes to the ask before showing he understood."]},
    {"type":"mc","q":"Zoe tutors math. A parent said earlier, \"I want her ready for the June exam,\" but now hesitates at a 10-session package. Zoe has open spots. Best move?","c":["\"You said June is the goal. Could we start with 4 sessions and review?\"","\"Spots are filling fast, so it's best to decide on the package soon.\"","\"The package covers 10 topics, 3 workbooks and online notes too.\"","\"I need a few more students to fill up my week, so this would really help.\""],"a":0,"w":["It links the ask to what the parent already said they want, and makes the first step smaller. Honest and easy to say yes to.","Urgency feels like it helps them decide, but her spots aren't filling. That's fake scarcity, which can lose the relationship.","More detail feels helpful, but it's features. It doesn't connect to the parent's goal of being ready for June.","Honest, but it's her reason, not theirs. It doesn't show what the student gets."]}
  ],
  "pitching": [
    {"type":"mc","q":"Nia practises her 60-second pitch, but it keeps taking 3 minutes. What does that tell her?","c":["It isn't clear yet, so she should tighten each of the six lines","Investors like detail, so a three-minute pitch is fine if it's thorough","She should talk faster until the same words fit inside 60 seconds","She should drop the numbers, since they take the most time to explain"],"a":0,"w":["The lesson says if you can't say it in 60 seconds, it isn't clear yet. Trim each of the six lines to its core.","Tempting because detail feels thorough. But the lesson's pitch is 60 seconds; if it runs long, it isn't clear yet.","Tempting as a quick fix. But faster words aren't clearer words; the lesson says a pitch that won't fit isn't clear yet.","Tempting because numbers take time. But not knowing your numbers makes investors nervous, and proof (customers, sales, growth) is one of the six lines."]},
    {"type":"num","q":"Jo's startup has $84,000 in the bank. Each month it spends $20,000 and brings in $8,000 from sales. How many months of runway does it have?","a":7,"tol":0.01,"unit":"months","e":"Burn = 20,000 − 8,000 = $12,000 a month. Runway = cash ÷ burn = 84,000 ÷ 12,000 = 7 months.","traps":[{"v":4.2,"why":"Used total spending, not burn. Burn is only what you spend beyond what comes in."},{"v":10.5,"why":"Divided by sales coming in, not by the cash going out each month."}]},
    {"type":"mc","q":"An investor asks Priya, who sells a study-planner app, \"Who's your competition?\" Which answer is strongest?","c":["\"Nobody does exactly what we do, so we really have no competition at all.\"","\"Our competitors are weak and slow, so we don't spend time worrying about them.\"","\"Most students use paper planners or nothing. Here's why they switch to us.\"","\"Students are a huge market, so there's plenty of room for everyone in it.\""],"a":2,"w":["Tempting because it sounds strong. But everyone has competition, even if it's doing nothing, and this line makes investors nervous.","Tempting because it sounds confident. But it doesn't say who she competes with or why she wins, so it dodges the question.","It names what students do today, including doing nothing, and says why they switch. That shows she can win.","Tempting because a big market sounds good. But it avoids the question; everyone has competition, even if it's doing nothing."]},
    {"type":"mc","q":"Leo is asked what the money is for. Which answer is best?","c":["\"$200,000 for growth, marketing and hiring, so we can scale fast across the country.\"","\"$200,000: two sales hires and ads, to reach 1,000 customers in a year.\"","\"$200,000, because startups at our stage with similar sales usually raise about that.\"","\"$200,000 to give us 18 months of runway while we test what works next.\""],"a":1,"w":["Tempting because it sounds ambitious. But 'growth and marketing' doesn't say exactly what it pays for or what it will achieve.","Use of funds means exactly what the money pays for and what it will achieve. This answer gives both: hires and ads, to reach 1,000 customers.","Tempting because it sounds normal. But it says nothing about what the money pays for, which makes investors nervous.","Tempting because runway matters. But 'test what works' doesn't say what the money pays for or what it will achieve, which makes investors nervous."]},
    {"type":"num","q":"Ravi has $30,000 and burns $10,000 a month. He raises $150,000 and hires two people, so his burn rises to $18,000 a month. How many months of runway does he have now?","a":10,"tol":0.01,"unit":"months","e":"New cash = 30,000 + 150,000 = $180,000. Runway = 180,000 ÷ 18,000 = 10 months.","traps":[{"v":18,"why":"Used the old burn. The new hires raise burn to $18,000."},{"v":8.33,"why":"Forgot the $30,000 already in the bank."},{"v":3,"why":"That's Ravi's runway before the raise."}]},
    {"type":"mc","q":"Ana's shop is profitable and growing from its own sales. An investor offers money but wants a large share. What gives Ana the most power here?","c":["A bigger estimate of how large her market could be","Agreeing quickly before the investor changes their mind","Her BATNA: she can keep growing without this investor","Explaining how many hours she has put into the shop"],"a":2,"w":["Tempting because big markets sound exciting. But a bigger claim doesn't change what she can do if she says no; her options do.","Tempting if you fear losing the deal. But investors are buying a share, so this is a negotiation, and agreeing fast ignores her power.","Your BATNA (another investor, or growing without them) is your power. Ana's shop already grows from its own sales, so she can walk away.","Tempting because effort feels like it should count. But hours don't change what happens if she says no; her alternatives do."]}
  ],
  "pressure": [
    {"type":"mc","q":"An investor asks Marco for his exact runway. He thinks it's about 8 months but isn't sure. What's the best reply?","c":["\"12 months.\" Said firmly, because a confident, round number makes him look prepared","\"About 8 months. I'll send the exact figure tomorrow.\" Then he sends it","\"Let me tell you about our customer growth instead, since that's our best number.\"","\"That's really my co-founder's area, so it's best to ask her about it later.\""],"a":1,"w":["Tempting because it sounds sure. But guessing confidently and being wrong is far worse than admitting you don't know exactly.","Honest, gives a rough answer, and promises the exact number. The lesson says then actually send it.","Tempting because it steers to a strength. But the lesson says answer the question honestly first, then connect it to a strength.","Tempting because it sounds careful. But it gives no rough answer and no follow-up, and runway is one of the numbers the lesson says to prepare."]},
    {"type":"num","q":"Before a meeting, Zoe does box breathing: in 4 seconds, hold 4, out 4, hold 4. That's one round. She does 3 rounds. How many seconds does it take?","a":48,"tol":0.01,"unit":"seconds","e":"One round = 4 + 4 + 4 + 4 = 16 seconds. Three rounds = 16 × 3 = 48 seconds.","traps":[{"v":16,"why":"That's only one round."},{"v":36,"why":"Missed the second hold after breathing out."},{"v":12,"why":"Counted only the breathing in."}]},
    {"type":"mc","q":"An investor asks, \"What's your revenue?\" Kim has last year's actual ($40,000) and this year's forecast ($120,000). Best first move?","c":["Say $120,000, since the bigger number makes a stronger case","Ask, \"Do you mean last year's numbers or the forecast?\"","Start with how the business began, then build up to the numbers","Say about $80,000, a fair middle point between the two"],"a":1,"w":["Tempting because it sounds impressive. But a forecast isn't revenue; passing it off as one is misleading and breaks trust.","Clarifying avoids answering the wrong question and buys a moment to think, just as the lesson suggests.","Tempting because context feels helpful. But the lesson says answer first, then explain; rambling is what pressure looks like.","Tempting as a compromise. But it's neither real number, so it's a guess that will be wrong."]},
    {"type":"mc","q":"An investor asks, \"Why would anyone pick you over BigMart's delivery?\" Which reply has the best shape?","c":["\"Great question. So, when we started back in 2024, we noticed lots of people…\"","\"Honestly, BigMart is terrible at delivery. Their one-star reviews prove it to anyone.\"","\"We don't really see BigMart as competition, since we serve a different kind of shopper.\"","\"Same-day delivery. BigMart takes 3 days, and repeat buyers say speed is why they stay.\""],"a":3,"w":["Tempting because a story feels engaging. But it delays the answer; lead with the answer in one sentence, then explain.","Tempting because it sounds bold. But attacking a rival isn't an answer and doesn't show why customers pick you.","Tempting because it sounds confident. But it sidesteps the question; it never says why anyone would pick you.","Answer first in one sentence, then one or two reasons with facts. That's the shape the lesson teaches."]},
    {"type":"mc","q":"An investor says sharply, \"Teens can't run a real company. Why should I take you seriously?\" Best reply?","c":["\"That's an unfair thing to say to us, and I don't think it's okay to ask.\"","\"Fair challenge. Our data: 300 paying customers and 9 months of runway.\"","\"You're right, we're young and still learning, but we're working really hard on it.\"","\"Plenty of famous founders started as teens, so age doesn't matter at all here.\""],"a":1,"w":["Tempting because the question feels rude. But the lesson says stay polite and don't argue tone; answer with facts.","Acknowledge the concern, answer with facts, stay calm. You're also judging how this investor treats you.","Tempting because it sounds humble. But hard work isn't a fact about the business, so the concern stays unanswered.","Tempting because it pushes back. But it's a general claim, not facts about your business."]},
    {"type":"num","q":"An investor asks, \"If sales stopped completely, how many months could you last?\" You have $54,000. You spend $9,000 a month and sales bring in $3,000 a month.","a":6,"tol":0.01,"unit":"months","e":"With no sales, burn = all spending = $9,000. Runway = 54,000 ÷ 9,000 = 6 months.","traps":[{"v":9,"why":"That's today's runway with sales. The question removes sales, so burn is the full $9,000."},{"v":18,"why":"Divided by sales, which the question says have stopped."}]}
  ],
  "voice": [
    {"type":"mc","q":"Sam says, \"We have 200 customers?\" with his voice rising at the end. What's the problem?","c":["It sounds too slow and unsure, so he should speed up to show energy","The rising end makes a fact sound like a question","He should add \"basically\" in front so he sounds more relaxed","Nothing; a rising end sounds friendly, open and easy to talk to"],"a":1,"w":["Tempting because energy feels good. But speed isn't the issue here, and the lesson says slower sounds confident.","The lesson says let your voice drop at the end of a statement. Rising makes facts sound like questions.","Tempting if you want to sound casual. But fillers like 'basically' sound unsure.","Tempting because it can feel warm. But it makes his fact sound like a question, so it sounds unsure."]},
    {"type":"num","q":"Ella records a 2-minute pitch and counts 14 \"um\"s. After a week of practice, a 2-minute take has 4. By how many \"um\"s per minute did she cut?","a":5,"tol":0.01,"unit":"per minute","e":"Cut = 14 − 4 = 10 ums over 2 minutes. 10 ÷ 2 = 5 fewer ums per minute.","traps":[{"v":10,"why":"That's the total cut over 2 minutes, not per minute."},{"v":7,"why":"That's how many ums per minute she had at the start."}]},
    {"type":"mc","q":"Kai's best fact is \"We grew 40% last quarter.\" How should he say it?","c":["Quickly and lightly, so the number doesn't sound like he's bragging","Read it off the slide word for word, so the number is exactly right","Pause, then say it slowly, stressing \"40%\" and letting his voice drop","With his voice rising at the end, to show excitement and invite questions"],"a":2,"w":["Tempting because modesty feels polite. But the lesson says slower sounds confident, and stressing the number tells them what matters.","Tempting for accuracy. But staring at slides breaks contact; know the number and look at the person.","Pause on purpose, stress the key word, and land the sentence. Leaning on the number tells them what matters.","Tempting because questions mean interest. But a rising end makes a fact sound like a question."]},
    {"type":"mc","q":"Lena pitches on video. Her laptop sits low on the desk and a window is behind her. Which fix follows the lesson?","c":["Keep the window behind her, raise the camera, and look at the investor's face on screen","Raise the camera to eye level, face the window, and look at the investor's face throughout","Raise the camera to eye level, face the window, look at the lens for her key point","Face the window, keep the laptop low, and read her key point from notes so it's exact"],"a":2,"w":["Tempting because daylight feels natural. But the lesson says face a window or lamp so they can see your face, and look at the lens for key points.","Tempting because their face feels like the person. But the lesson says look at the lens when you make your key point.","Camera at eye level, light on your face, and look at the lens when you make your key point. All three are in the lesson.","Tempting for accuracy. But the camera should be at eye level, and staring at notes is on the lesson's avoid list."]},
    {"type":"mc","q":"Watching his recording, Omar sees he says \"um\" 9 times, slouches, and rushes. What's the best next step?","c":["Fix all three at once, then record one final take","Pick ONE of them to fix, then record again","Rewrite the pitch script, since the words must be the problem","Pitch it to a friend now and ask what they remember"],"a":1,"w":["Tempting because it seems faster. But the lesson's practice steps say fix ONE thing, then record again.","The lesson's steps: fix ONE thing, record again, and keep going.","Tempting because the script feels in your control. But these are delivery habits, not word problems.","Tempting because feedback helps. But in the lesson that's the last step, after you've fixed things in your own recordings."]},
    {"type":"mc","q":"Ari is a smooth speaker but guesses at his margin. Bea is a bit shaky but knows every number and is honest about one weakness. Who is in the stronger spot?","c":["Ari, because investors judge how you say it as well as what you say","Both are equal, because his smooth delivery balances out her strong numbers","Neither, because a shaky voice sinks a pitch however good the numbers are","Bea, since knowing the numbers and being honest matter most"],"a":3,"w":["Tempting because the lesson says delivery matters. But it says a nervous founder who knows their numbers beats a smooth talker who doesn't.","Tempting as a fair middle. But the lesson is clear: knowing your numbers wins over smooth delivery.","Tempting if you fear nerves. But nobody expects a perfect speaker; voice is a skill you can practise.","Investors expect you to know your business and tell the truth. A slightly nervous founder who does beats a smooth talker who doesn't."]}
  ],
  "investor-interest": [
    {"type":"mc","q":"Tomas runs a dog-walking app. Which is the best one-line hook?","c":["\"We're a passionate team of dog lovers building the future of pet care.\"","\"We help busy dog owners book a walk in a minute, and 220 book weekly.\"","\"We help dog owners in a huge, fast-growing market get better, safer walks.\"","\"Our app has GPS tracking, live chat and photo updates on every single walk.\""],"a":1,"w":["Tempting because passion sounds good. But it says nothing about who, what result, or proof.","It fits the lesson's hook: 'We help [who] [get what result], and we've already [your best proof].'","Tempting because it names a customer. But 'huge market' isn't proof, and it has no real traction.","Tempting because features sound concrete. But it skips who it helps, the result, and any proof."]},
    {"type":"num","q":"Your first email to an investor said 140 paying customers. Now you have 182. Your follow-up says customers grew by X%. What is X? Round to the nearest whole %.","a":30,"tol":0.5,"unit":"%","e":"Growth = (new − old) ÷ old = (182 − 140) ÷ 140 = 0.30 = 30%.","traps":[{"v":42,"why":"That's the number of new customers, not the % growth."},{"v":23,"why":"Divided by the new total. Growth % divides by where you started."}]},
    {"type":"mc","q":"Rosa runs an early-stage meal-kit startup. Who should go at the top of her target list?","c":["An investor who has backed two early food startups in her area","A big famous fund that only invests in large software companies","Every investor on a big online list, with the same cold email","An investor who mostly backs late-stage firms, since they have more money"],"a":0,"w":["Look for investors who've backed businesses at your stage and in your area. This one has.","Tempting because a famous name feels like a win. But don't pitch someone who never invests in your kind of business.","Tempting because more emails feels like more chances. But the lesson says make a target list, and a warm introduction beats a cold email.","Tempting because more money sounds better. But they back a different stage, so they're unlikely to fund her."]},
    {"type":"mc","q":"Which first email to an investor follows the lesson?","c":["Your founding story, then your hook at the end, then a full deck attached","Your hook, three proof points, and an ask for a 20-minute call","Your hook, ten proof points, and an ask to meet whenever suits them","Your hook, your full plan attached, and an ask for $250,000"],"a":1,"w":["Tempting because stories engage. But the hook should be your first line, and the email should stay short.","The lesson's first email: your hook, three proof points, and one ask, a 20-minute call.","Tempting because more proof feels stronger. But the lesson says keep it short: three proof points and one ask, a 20-minute call.","Tempting because it's direct. But the lesson's first email has one ask, a 20-minute call, and stays short."]},
    {"type":"mc","q":"The investor has asked lots of questions and you have 5 minutes left. What's the best way to finish?","c":["Rush through your last 8 slides so they see everything you prepared","Say another fund is close to investing, though talks are only early","Agree a clear next step and date, then send a thank-you note that day","Thank them warmly and wait for them to get in touch whenever they're ready"],"a":2,"w":["Tempting because you prepared them. But questions mean interest, and the lesson says end with a clear next step and date.","Tempting to create pressure. But faking interest from other investors can close every door; investors talk.","End with a clear next step and date, and send a short thank-you note the same day.","Tempting because it feels polite. But the lesson says end with a clear next step and date, not an open wait."]},
    {"type":"mc","q":"You ask, \"What would you need to see to invest?\" The investor says, \"100 paying customers and half of them coming back.\" What's the best next move?","c":["Work toward those two goals, then follow up with progress on them","Email every week to \"just check in\" so they keep you in mind until then","Explain politely why 100 customers is too many to ask for at your stage","Treat it as a polite no and move straight on to other investors on your list"],"a":0,"w":["The lesson says their answer is your to-do list. Follow up with real progress against it.","Tempting because staying in touch matters. But the lesson says follow up with progress, not 'just checking in'.","Tempting if the bar feels high. But arguing wastes what they told you; their answer is your to-do list.","Tempting if you fear rejection. But they've told you exactly what would change their mind."]}
  ],
  "best-of-investors": [
    {"type":"mc","q":"Before accepting an investor, which call will tell Maya the most about them?","c":["A founder they backed whose business became a big success","A founder they backed whose business struggled","A partner at the investor's own firm","The quotes from founders on the investor's website"],"a":1,"w":["Tempting because success stories are easy to find. But the lesson asks how the investor acted when things went wrong.","The lesson says include a founder whose business struggled: how the investor acted when things went wrong shows what they're really like.","Tempting because they know the investor well. But they work with the investor, so they're not the founders the lesson says to ask.","Tempting because it's quick. But the investor chose those quotes, so they only show the best side."]},
    {"type":"mc","q":"Your investor says, \"Let me know if I can help.\" You need a bookkeeper. Which ask is best?","c":["\"We'd love any help with hiring that you can offer us this spring.\"","\"Can you help us grow our finance team a bit faster this year?\"","\"Feel free to send over any introductions you think might fit us.\"","\"Do you know a part-time bookkeeper we could hire by March?\""],"a":3,"w":["Tempting because it's polite. But it's vague, and the lesson says specific asks get specific help.","Tempting because it sounds focused. But 'grow faster' isn't one clear thing they can act on.","Tempting because it leaves room for them. But it puts the work on them; specific asks get specific help.","One clear role and a date. The lesson says specific asks get specific help."]},
    {"type":"num","q":"For her monthly update, Jada needs months of runway. She has $60,000. She spends $16,000 a month and sales bring in $4,000 a month. Burn = spending minus money coming in. Runway?","a":5,"tol":0.01,"unit":"months","e":"Burn = 16,000 − 4,000 = $12,000. Runway = 60,000 ÷ 12,000 = 5 months.","traps":[{"v":3.75,"why":"Used total spending instead of burn (spending minus sales)."},{"v":15,"why":"Divided by sales, not by burn."}]},
    {"type":"mc","q":"Sales fell 20% this month. What should Dan do about his monthly investor update?","c":["Send it as usual, with the drop as his one honest problem","Skip this month and send a stronger update next month once sales pick up","Send it, but list only the wins so investors stay positive about the business","Wait until sales recover, then explain the dip and the fix together"],"a":0,"w":["The lesson says send it every month, even bad ones. Investors who hear bad news early help.","Tempting to avoid an awkward email. But the lesson says send it every month; investors who are surprised stop trusting you.","Tempting to keep the mood up. But the update needs one honest problem; investors who are surprised later stop trusting you.","Tempting because a fix sounds better. But waiting means a surprise, and investors who are surprised stop trusting you."]},
    {"type":"mc","q":"An investor offers $50,000 if Mia signs the terms today, before her lawyer can read them. What should she do?","c":["Sign now; she can always change the terms later","Sign now, since money today beats perfect terms","Ask for time so a lawyer can read the terms first","Read them herself tonight and sign if they look fine"],"a":2,"w":["Tempting because it removes the pressure. But the lesson says read the terms with a lawyer before you say yes; bad terms can cost more than no money.","Tempting when cash is tight. But money with bad terms can cost you more than no money.","The lesson says read the terms with a lawyer before you say yes. Taking investment is like hiring a boss you can't easily fire.","Tempting because it seems careful. But the lesson says read the terms with a lawyer, not alone."]},
    {"type":"mc","q":"Your investor strongly says to raise prices now. Your numbers suggest waiting. Your agreement doesn't give them a say on prices. What's right?","c":["Raise prices; they own a share, so their advice is an order","Listen, thank them, weigh it against your numbers, then decide","Ignore the advice; investors shouldn't shape your decisions","Ask them to make the final call, so the risk sits with them instead"],"a":1,"w":["Tempting because they own part of the business. But advice is input, not orders, unless the agreement says otherwise.","Advice is input, not orders, unless your agreement says otherwise. Listen, thank them, then decide. You'll live with the result.","Tempting to protect your control. But advice is input; the lesson says listen and thank them, then decide.","Tempting to share the risk. But it's your business and you'll live with the result, so the decision is yours."]}
  ]
};
var QUIZ_IDS = Object.keys(QUIZZES);
var progress = load('mds-progress', {});

function el(tag, attrs, html){ var n = document.createElement(tag); if(attrs) for(var k in attrs) n.setAttribute(k, attrs[k]); if(html != null) n.innerHTML = html; return n; }
function fmt(n, d){ return Number(n).toLocaleString(undefined, {minimumFractionDigits:d||0, maximumFractionDigits:d||0}); }

var LESSON_ORDER = ['money','investing','funding','business','statements','why-business','buy-back-time','ai-at-work','mkt-basics','mkt-channels','mkt-measure','mkt-words','mkt-social','negotiation','scripts','persuasion','pitching','pressure','voice','investor-interest','best-of-investors'];
/* ---------- Ask Sharp: a small "stuck?" box above each lesson's Previous/Next bar ---------- */
LESSON_ORDER.concat(['glossary']).forEach(function(id){
  var sec = document.getElementById(id), pager = sec && sec.querySelector(':scope > .pager');
  if(!sec || !pager) return;
  var box = document.createElement('aside'); box.className = 'ask-cta'; box.setAttribute('aria-label', 'Ask Sharp about this lesson');
  var t = document.createElement('p'); var b = document.createElement('b'); b.textContent = 'Stuck on something? '; t.appendChild(b);
  t.appendChild(document.createTextNode('Ask Sharp, our AI helper. It answers from these lessons only.'));
  var row = document.createElement('div'); row.className = 'ask-cta-row';
  [['', 'Ask a question'], ['simpler', 'Explain it simpler'], ['example', 'Give me an example']].forEach(function(x){
    var a = document.createElement('a'); a.className = 'btn sm ghost';
    a.href = '../ask/index.html?lesson=' + id + (x[0] ? '&mode=' + x[0] : ''); a.textContent = x[1]; row.appendChild(a);
  });
  box.appendChild(t); box.appendChild(row); sec.insertBefore(box, pager);
});
var TOPIC_LESSONS = { finance: ['money','investing','funding'], business: ['business','statements','why-business','buy-back-time','ai-at-work'], marketing: ['mkt-basics','mkt-channels','mkt-measure','mkt-words','mkt-social'], negotiation: ['negotiation','scripts','persuasion'], investors: ['pitching','pressure','voice','investor-interest','best-of-investors'] };
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
  var need = Math.ceil(qs.length * 0.8);
  // Quiz text is written by us, but it is still set with textContent (never innerHTML).
  function tx(tag, cls, text){ var n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; }
  function shuffle(n){ var o = []; for(var i = 0; i < n; i++) o.push(i); for(var j = n - 1; j > 0; j--){ var k = Math.floor(Math.random() * (j + 1)), t = o[j]; o[j] = o[k]; o[k] = t; } return o; }
  function money(q, v){ return (q.unit === '$' ? '$' : '') + fmt(v, v % 1 ? 2 : 0) + (q.unit && q.unit !== '$' ? (q.unit === '%' || q.unit === 'x' ? q.unit : ' ' + q.unit) : ''); }
  container.appendChild(tx('span', 'eyebrow', 'Practice'));
  container.appendChild(tx('h2', null, 'Check your work'));
  container.appendChild(tx('p', 'muted', qs.length + ' questions. Some are tricky on purpose: the wrong answers are real mistakes people make. Every answer explains itself. Get ' + need + ' of ' + qs.length + ' right to pass.'));
  var bestP = tx('p', 'muted'); container.appendChild(bestP);
  function showBest(){ var b = progress[id] && progress[id].best; bestP.textContent = b != null ? 'Your best so far: ' + b + '%' : ''; bestP.hidden = b == null; }
  showBest();
  var dots = tx('div', 'qdots'); dots.setAttribute('aria-hidden', 'true');
  qs.forEach(function(){ dots.appendChild(document.createElement('i')); });
  container.appendChild(dots);

  var results = [], boxes = [];
  qs.forEach(function(q, i){
    var box = tx('div', 'q'); box.id = 'q-' + id + '-' + i;
    var pr = tx('div', 'prompt'); pr.appendChild(tx('span', 'qn', 'Q' + (i + 1))); pr.appendChild(tx('span', null, q.q)); box.appendChild(pr);
    if(q.type === 'mc'){
      var opts = tx('div', 'opts'); box.appendChild(opts);
    } else {
      var row = tx('div', 'numrow');
      if(q.unit === '$') row.appendChild(tx('span', null, '$'));
      var ni = document.createElement('input'); ni.type = 'number'; ni.step = 'any'; ni.setAttribute('inputmode', 'decimal'); ni.setAttribute('aria-label', 'Your answer to question ' + (i + 1)); ni.name = id + '-' + i;
      row.appendChild(ni);
      if(q.unit && q.unit !== '$') row.appendChild(tx('span', 'muted', q.unit));
      var cb = tx('button', 'btn', 'Check'); cb.type = 'button'; row.appendChild(cb);
      var go = function(){ var raw = ni.value.replace(/,/g, '').trim(); if(raw === '' || isNaN(Number(raw))){ ni.focus(); return; } grade(i, Number(raw)); };
      cb.addEventListener('click', go);
      ni.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); go(); } });
      box.appendChild(row);
    }
    var fb = tx('div', 'fb'); fb.setAttribute('aria-live', 'polite'); box.appendChild(fb);
    container.appendChild(box); boxes.push(box);
  });

  // Answer order is shuffled on every try, so the position of the right answer tells you nothing.
  function layout(){
    qs.forEach(function(q, i){
      if(q.type !== 'mc') return;
      var opts = boxes[i].querySelector('.opts'); opts.textContent = '';
      shuffle(q.c.length).forEach(function(j){
        var lab = tx('label', 'opt'); lab.setAttribute('data-j', j);
        var inp = document.createElement('input'); inp.type = 'radio'; inp.name = id + '-' + i; inp.value = String(j);
        inp.addEventListener('change', function(){ grade(i, j); });
        var body = tx('span', 'opt-b'); body.appendChild(tx('span', 'opt-t', q.c[j]));
        lab.appendChild(inp); lab.appendChild(body); opts.appendChild(lab);
      });
    });
  }
  layout();

  var result = tx('div', 'result');
  var scoreEl = tx('div', 'score'); scoreEl.setAttribute('aria-live', 'polite');
  var stampEl = tx('div', 'stamp'); stampEl.setAttribute('aria-hidden', 'true'); stampEl.hidden = true;
  var review = tx('div', 'q-review'); review.hidden = true;
  result.appendChild(scoreEl); result.appendChild(stampEl);
  container.appendChild(result); container.appendChild(review);
  var btns = tx('div', 'btnrow');
  var reset = tx('button', 'btn ghost', 'Try again (new order)'); reset.type = 'button';
  reset.hidden = true; btns.appendChild(reset); container.appendChild(btns);

  function grade(i, val){
    if(results[i] != null) return;
    var q = qs[i], box = boxes[i], fb = box.querySelector('.fb'), ok, head, rest = '';
    fb.textContent = '';
    if(q.type === 'mc'){
      ok = val === q.a;
      // Every choice gets its own explanation, written right under it.
      box.querySelectorAll('label.opt').forEach(function(l){
        var j = +l.getAttribute('data-j'), b = l.querySelector('.opt-b');
        if(j === q.a) l.classList.add('right'); else if(j === val) l.classList.add('wrong');
        var tag = j === q.a ? '✓ Right answer' : j === val ? '✗ Your answer' : '';
        if(tag) b.insertBefore(tx('span', 'opt-tag', tag), b.firstChild);
        var why = q.w ? q.w[j] : (j === q.a ? q.e : '');
        if(why) b.appendChild(tx('span', 'opt-why', why));
      });
      head = ok ? 'Correct.' : 'Not quite.';
      rest = ok ? ' Read why the other answers are wrong: that\'s where the learning is.' : ' The right answer and why each choice is right or wrong are shown above.';
    } else {
      ok = Math.abs(val - q.a) <= q.tol;
      var trap = !ok && (q.traps || []).filter(function(t){ return Math.abs(val - t.v) <= Math.max(q.tol, Math.abs(t.v) * 0.005); })[0];
      head = ok ? 'Correct.' : 'Not quite.';
      rest = (ok ? ' ' : ' You typed ' + money(q, val) + '. ' + (trap ? trap.why + ' ' : '') + 'Answer: ' + money(q, q.a) + '. ') + q.e;
    }
    results[i] = ok;
    box.classList.add(ok ? 'is-ok' : 'is-no', 'locked');
    box.querySelectorAll('input,button').forEach(function(x){ x.disabled = true; });
    dots.children[i].className = ok ? 'ok' : 'no';
    fb.className = 'fb show ' + (ok ? 'ok' : 'no');
    fb.appendChild(tx('strong', null, (ok ? '✓ ' : '✗ ') + head)); fb.appendChild(document.createTextNode(rest));
    if(results.filter(function(r){ return r != null; }).length === qs.length) finish();
  }
  function finish(){
    var right = results.filter(Boolean).length, pct = Math.round(right / qs.length * 100), passed = right >= need;
    scoreEl.textContent = 'Score: ' + right + '/' + qs.length + ' (' + pct + '%). ' + (passed ? 'Passed ✓' : 'Not yet. You need ' + need + '. Read the explanations, then try again.');
    stampEl.className = 'stamp ' + (passed ? 'pass' : 'review');
    stampEl.textContent = passed ? 'Passed' : 'Review'; stampEl.appendChild(tx('small', null, right + ' / ' + qs.length + ' correct'));
    stampEl.hidden = false; void stampEl.offsetWidth; stampEl.classList.add('hit');
    review.textContent = '';
    var missed = []; results.forEach(function(r, i){ if(!r) missed.push(i); });
    if(missed.length){
      review.appendChild(tx('p', null, 'Go back to what you missed:'));
      var row = tx('div', 'q-review-row');
      missed.forEach(function(i){ var a = tx('a', 'btn sm ghost', 'Q' + (i + 1)); a.href = '#q-' + id + '-' + i;
        a.addEventListener('click', function(e){ e.preventDefault(); boxes[i].scrollIntoView({ behavior: 'smooth', block: 'center' }); boxes[i].setAttribute('tabindex', '-1'); boxes[i].focus({ preventScroll: true }); });
        row.appendChild(a); });
      review.appendChild(row); review.hidden = false;
    } else review.hidden = true;
    reset.hidden = false;
    var prev = progress[id] || {};
    progress[id] = {best: Math.max(prev.best || 0, pct), passed: !!(prev.passed || passed)};
    save('mds-progress', progress);
    updateProgressUI(); showBest();
    result.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  reset.addEventListener('click', function(){
    results = [];
    boxes.forEach(function(box){
      box.className = 'q';
      box.querySelectorAll('input').forEach(function(x){ x.disabled = false; if(x.type !== 'radio') x.value = ''; });
      box.querySelectorAll('button').forEach(function(x){ x.disabled = false; });
      var fb = box.querySelector('.fb'); fb.className = 'fb'; fb.textContent = '';
    });
    layout();
    Array.prototype.forEach.call(dots.children, function(d){ d.className = ''; });
    scoreEl.textContent = ''; stampEl.hidden = true; reset.hidden = true; review.hidden = true;
    boxes[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  var SKIP = 'h1,h2,h3,.tldr,.quiz,.ask-cta,.formula,.pager,a,button,.lesson-head,th,code,.callout > b,.zopa,.eyebrow';
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
