/* Scam check (free). Paste a message, DM, job offer or "money opportunity", and tick what happened. Cherry looks for
   the warning signs money scams use and gives a verdict: Likely scam / Be careful / No big warning signs.
   Fixed rules on this device, no AI: what you paste is never sent anywhere and never saved.
   It spots warning signs; it can't prove a message is safe, and the page says so. Visitor text: textContent only. */
(function(){
"use strict";
var ADULT = !!(window.SharpWho && window.SharpWho.isAdult());
function $(id){ return document.getElementById(id); }
function el(tag, cls, text, parent){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; if(parent) parent.appendChild(e); return e; }

/* The warning signs. w: 3 = a big one (enough on its own), 2 = a clear sign, 1 = a small one.
   re: the words that show it in a message. q: the box you can tick when the message doesn't say it. */
var SIGNS = [
  { id: 'pay', w: 3, name: 'You pay first', q: 'They want me to pay first (a fee, kit, course or deposit)',
    why: 'Real jobs and real customers pay you. Anyone who needs a fee, a "starter kit" or a deposit before you earn is making their money from you.',
    re: [/\bstarter (kit|pack|package|bundle)/, /\b(training|joining|sign[- ]?up|activation|release|clearance|unlock|withdrawal|verification) fee/,
         /\bpay (a |an |the |our )?(small |one[- ]time |quick |tiny )?fee (to|and|before|so|first)\b/, /\bunlock (your |ur )?(earnings|money|payout|withdrawal|profits?)\b/,
         /\bpay to (join|start|unlock|withdraw|get started|begin)\b/, /\bbuy (our |the |a )?(starter|kit|package|course|bundle)\b[^.!?\n]{0,25}\b(to|and|so) (start|join|earn|begin|unlock)/,
         /\b(invest|deposit|pay|send) (just |only )?\$\s?\d[\d,]*\s*(to|and) (start|join|earn|begin|unlock|get started|activate)\b/,
         /\bbuy (one of )?(our|the|a|an) [^.!?\n]{0,30}\b(to|and) (get started|start|join|begin|unlock|qualify)\b/,
         /\b(send|pay|wire)( us| me)? \$\s?\d[\d,]*(\.\d+)? (for|to cover) (the |a |your )?(background check|training|processing|activation|verification|release|clearance|starter kit|starter pack|admin fee|application fee)/] },
  { id: 'odd', w: 3, name: 'Gift cards, crypto or a wire', q: 'They want gift cards, crypto or a wire transfer',
    why: 'Scammers like to be paid in gift cards, crypto or wires, because once it\'s sent it\'s almost impossible to get back. Real businesses don\'t ask for them.',
    re: [/\b(buy|send|get|pay|purchase|pick up|grab)\b[^.!?\n]{0,30}\bgift ?cards?\b/, /\bgift ?card (codes?|numbers?|pins?)\b/, /\b(itunes|google play|steam|razer gold|apple) (gift )?cards?\b/,
         /\bwire (transfer|the money|money|the funds|funds|it|me|us)\b/, /\b(western union|moneygram)\b/,
         /\b(pay|send|transfer|deposit)( it| the money| the fee| us| me)? (in|with|by|via|using) (bitcoin|btc|crypto|usdt|tether|ethereum|eth)\b/] },
  { id: 'code', w: 3, name: 'They want a code or password', q: 'They asked for a code, password or bank details',
    why: 'That code or password is the key to your account. Nobody real ever needs it: not a company, not a buyer, not a friend.',
    re: [/\b(send|give|tell|share|forward|read|text) (me |us |over )?(the |your |ur |that |this )?(\d[- ]digit |six[- ]digit |verification |security |login |log-in |one[- ]time |confirmation )?(code|pin|passcode|password)\b/,
         /\bwhat('s| is) (the |your |ur )(code|pin|password|passcode)\b/, /\b(bank|online banking) (login|log-in|password|pin)\b/, /\bcard (number|pin|details)\b/,
         /\b(social security number|ssn)\b/, /\b(seed phrase|recovery phrase|private key)\b/] },
  { id: 'flip', w: 3, name: 'Send money, get more back',
    why: 'Cash flips and fake checks work the same way: you send real money, and the "more" never comes, or their check bounces days later and you owe the bank.',
    re: [/\b(cash ?flip|money ?flip|flip (your|ur) (money|cash))\b/, /\bsend (me |us )?\$\s?\d[\d,]*[^.!?\n]{0,40}\b(get|receive|make|turn (it |that )?into|send you|get back)\b[^.!?\n]{0,10}\$\s?\d/,
         /\b(send|pay|give|wire|return) (back )?(the rest|the difference|the extra|the remaining|the leftover)\b/, /\boverpa(y|id|yment)\b/,
         /\b(mail|send|give) you a (check|cheque)\b/, /\b(cash|deposit) (the|this|my|our) (check|cheque)\b/], fn: moreBack },
  { id: 'sure', w: 3, name: '"Guaranteed" money',
    why: 'Nobody can guarantee returns. Real investments go up and down, so a promise of sure profit is a lie or a trap.',
    re: [/\bguarantee(d|s)? (returns?|profits?|income|money|results|payouts?|earnings|\d+%)/, /\b(risk[- ]free|no risk|zero risk|can'?t lose|cannot lose)\b/,
         /\b100% (safe|profit|guaranteed|returns?|legit)\b/, /\bdouble (your|ur) (money|cash|investment|bitcoin|crypto)\b/, /\b\d+x (your|ur) (money|investment|cash)\b/,
         /\b\d+(\.\d+)?% (profit|returns?|gains?) (a|per|every|each) (day|week)\b/] },
  { id: 'big', w: 2, name: 'Big money for little work', q: 'It promises big or easy money for little work',
    why: 'Real pay matches real work. "$500 a day from your phone" is how scams and pyramid schemes hook people.',
    re: [/\b(passive income|easy money|quick (money|cash)|fast (money|cash)|get rich|financial freedom|while you sleep|life[- ]changing (money|income))\b/,
         /\bmake money (fast|online|from home|from (your|ur) phone)\b/, /\bfrom (your|ur) (phone|couch|bed)\b/, /\bno experience (needed|required|necessary)\b/,
         /\bquit (your|ur) (job|9[- ]to[- ]5)\b/, /\b(captcha (typing|entry|solving|jobs?)|typing captchas|solve captchas)\b/, /\bturn(s|ed)? \$\s?\d[\d,]*k? into \$\s?\d/], fn: bigPay },
  { id: 'hype', w: 2, name: 'A trading or crypto "opportunity"',
    why: 'Most "investment opportunities" that come to you in a message are scams. Real investing doesn\'t need a mentor, a signal group or an "account manager".',
    re: [/\b(forex|binary options|trading signals?|signal group|crypto (mentor|signals?|investment|opportunity|trading|platform)|trading (mentor|bot|platform|group)|(investment|trading) (opportunity|platform)|account manager)\b/] },
  { id: 'rush', w: 2, name: 'They\'re rushing you', q: 'They\'re rushing me to decide now',
    why: 'Pressure stops you from checking. Real offers are still there tomorrow.',
    re: [/\b(only today|today only|act (now|fast|quickly)|hurry|last chance|offer ends|don'?t miss (out|this))\b/, /\blimited (time|spots?|places|seats|offer)\b/,
         /\bonly \d+ (spots?|places|seats|left)\b/, /\b\d+ (spots?|places|seats) left\b/, /\bexpires? (today|tonight|soon|in \d+)/, /\bwithin (\d+|twenty[- ]four|forty[- ]eight) (hours?|hrs?|minutes?)\b/,
         /\b(before|by) (tonight|midnight|the end of (the )?day)\b/, /\bbefore it'?s (too late|gone)\b/] },
  { id: 'secret', w: 2, name: 'Keep it secret', q: 'They told me to keep it secret',
    why: 'Scammers ask you to keep it quiet so nobody can warn you. Anything real can be shown to your family.',
    re: [/\b(don'?t|do not) tell (anyone|anybody|people|(your |ur |ya )?(parents|mom|mum|dad|family|bank))\b/, /\bkeep (this|it) (a )?(secret|quiet|between us|private|to yourself)\b/, /\bbetween (you and me|us)\b/,
         /\b(don'?t|do not) (ask|show) (your |ur )?(parents|mom|mum|dad|family|bank|anyone)\b/] },
  { id: 'prize', w: 2, name: 'You "won" or were "picked"',
    why: 'You can\'t win something you never entered, or get a job you never applied for. It\'s the hook before a fee or a fake check.',
    re: [/\byou('ve| have)? (won|been (selected|chosen|picked))\b/, /\bcongrat(ulation)?s\b[^.\n]{0,40}\b(won|winner|selected|chosen|prize|reward)\b/,
         /\bclaim (your |ur )?(prize|reward|money|winnings|gift|payout)\b/, /\b(lucky|selected) winner\b/, /\bfree (iphone|ipad|gift card|money|cash)\b/] },
  { id: 'team', w: 2, name: 'You earn by recruiting',
    why: 'If you earn by signing up friends instead of selling to real customers, it\'s a pyramid scheme. Most people in them lose money.',
    re: [/\brecruit(ing|ed)?\b/, /\bbring (in )?(\d+ |your |ur )?(friends|people|members)\b/, /\bjoin my (team|squad|family|group)\b/, /\bbe (your|ur) own boss\b/,
         /\b(brand|campus) ambassador\b/, /\b(downline|residual income|mlm|network marketing)\b/, /\b(every|each|for every) (person|friend|member) (you )?(sign|bring|invite|refer|recruit)/] },
  { id: 'phish', w: 2, name: 'A fake account alert',
    why: 'Messages that say your account or parcel has a problem want you to log in on a fake page. Open the real app yourself instead.',
    re: [/\b(account|card|payment|package|parcel|delivery|order) (has been|is|was|will be|has been temporarily) (locked|suspended|closed|disabled|limited|on hold|held|blocked|frozen)\b/,
         /\bverify (your |ur )?(account|identity|details|payment|information)\b/, /\bunusual (activity|sign[- ]?in|login|log-in)\b/, /\bconfirm (your |ur )?(details|information|identity|payment|account)\b/,
         /\b(re-?schedule|update) (your |ur )?(delivery|payment details|billing)\b/] },
  { id: 'odd2', w: 2, name: 'A strange way to pay or pick up',
    why: 'A buyer who sends a "courier", or pays by check or money order, is how fake-check scams on selling apps start. Take cash or an instant payment in person instead.',
    re: [/\b(pay|paying|pay you) (by|with) (a )?(check|cheque|certified check|money order)\b/, /\b(send|sending|arrange) (a |my )?(courier|shipper|shipping agent|mover)\b/] },
  { id: 'move', w: 1, name: 'Move to a private chat',
    why: 'Scammers move you to private chats like Telegram or WhatsApp, where the app you met on can\'t flag them.',
    re: [/\b(telegram|whatsapp|wickr|kik)\b/, /\b(dm me|message me on|text me on|add me on)\b/] },
  { id: 'link', w: 1, name: 'A link to tap',
    why: 'Links in surprise messages can lead to fake log-in pages. Go to the real site or app yourself.',
    re: [/https?:\/\/|\bwww\./, /\b(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy)\//, /\b[a-z0-9-]+\.(link|xyz|top|click|icu|buzz)\b/] },
  { id: 'cold', w: 1, name: 'A message out of nowhere', q: 'They messaged me first, and I don\'t know them',
    why: 'Most scams start with a message you didn\'t ask for. That alone isn\'t proof, but it\'s a reason to check.', re: [] }
];
var BY = {}; SIGNS.forEach(function(s){ BY[s.id] = s; });

// "$500 a day", "$2k/week": pay that's far above what the work could earn. Ordinary pay ("$15 an hour") is fine.
var LIMIT = { day: 300, hour: 75, hr: 75, week: 1500, wk: 1500, month: 6000, mo: 6000 };
function bigPay(t){
  var m, rate = /\$\s?(\d[\d,]*(?:\.\d+)?)\s*(k)?\s*\+?\s*(?:\/|a|an|per|each|every)\s*(day|hour|hr|week|wk|month|mo)\b/g;
  while((m = rate.exec(t))){ var v = parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1); if(v >= LIMIT[m[3]]) return m[0]; }
  var fast = /\$\s?(\d[\d,]*(?:\.\d+)?)\s*(k)?\s+(?:in|within|after) (?:a|an|one|two|three|\d+) (?:hours?|days?|weeks?)\b/g;
  while((m = fast.exec(t))){ if(parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1) >= 1000) return m[0]; }
  return null;
}
// "Send $20 and I'll send back $100": you send money and are promised much more back.
function moreBack(t){
  var re = /\bsend (me |us |him |her )?\$\s?(\d[\d,]*(?:\.\d+)?)\b[^.!?\n]{0,50}?\$\s?(\d[\d,]*(?:\.\d+)?)/g, m;
  while((m = re.exec(t))){ var a = +m[2].replace(/,/g, ''), b = +m[3].replace(/,/g, ''); if(a > 0 && b >= a * 1.5 && /\b(back|return|get|receive|make|turn|into)\b/.test(m[0])) return m[0]; }
  return null;
}
// "Returns are never guaranteed", "never share your code": a "not" just before the words means the opposite.
var NOT = /\b(not|never|no|don'?t|do not|isn'?t|aren'?t|won'?t|nobody|without)\s+(\S+\s+){0,2}$/;
// The first words that show a sign, and how many different ways the message shows it.
function find(s, t){
  var hit = null, n = 0;
  for(var i = 0; i < s.re.length; i++){
    var re = new RegExp(s.re[i].source, 'gi'), m;
    while((m = re.exec(t))){
      if(!NOT.test(t.slice(Math.max(0, m.index - 30), m.index))){ if(!hit) hit = m[0]; n++; break; }
      if(!m[0]) re.lastIndex++;
    }
  }
  var f = s.fn ? s.fn(t) : null; if(f){ if(!hit) hit = f; n++; }
  return hit ? { hit: hit, n: n } : null;
}

// The whole check, without the page: text (any case) + the ids of the ticked boxes -> the signs found and the verdict.
function scan(text, tickedIds){
  var t = String(text || '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').toLowerCase().slice(0, 4000), ticked = {}, found = [];
  (tickedIds || []).forEach(function(id){ if(BY[id]) ticked[id] = true; });
  SIGNS.forEach(function(s){
    var h = t.trim() ? find(s, t) : null;
    // A clear sign shown two different ways ("$350 a day" and "no experience needed") counts a little more.
    if(h || ticked[s.id]) found.push({ s: s, hit: h ? h.hit : null, you: !h && !!ticked[s.id], w: s.w + (h && h.n > 1 && s.w === 2 ? 1 : 0) });
  });
  found.sort(function(a, b){ return b.s.w - a.s.w; });
  var total = 0, big = 0, has = {}; found.forEach(function(f){ total += f.w; has[f.s.id] = 1; if(f.s.w >= 3) big++; });
  // Bait plus a link to tap is how log-in and prize scams work: together they count for more.
  if(has.link && (has.phish || has.prize || has.big)) total++;
  var empty = !t.trim() && !Object.keys(ticked).length;
  return { empty: empty, found: found, total: total, big: big, verdict: empty ? '' : big || total >= 4 ? 'bad' : total >= 1 ? 'warn' : 'good' };
}
function check(){
  var ids = []; SIGNS.forEach(function(s){ var b = $('sk-q-' + s.id); if(b && b.checked) ids.push(s.id); });
  return scan($('sk-text').value, ids);
}

function render(){
  var r = check(), st, word, head, body;
  var ask = ADULT ? 'Ask someone you trust to look at it too.' : 'Show it to a parent or guardian before you reply.';
  if(r.empty){
    st = ''; word = 'Waiting'; head = 'Paste a message, or tick what happened.';
    body = 'I\'ll look for the warning signs money scams use. What you paste stays on this device.';
  } else if(r.verdict === 'bad'){
    st = 'bad'; word = 'Likely scam'; head = 'Likely a scam. Don\'t pay, and don\'t reply.';
    body = 'Biggest sign: ' + r.found[0].s.name.toLowerCase().replace(/"/g, '') + '. ' + (r.found.length > 1 ? 'I found ' + r.found.length + ' warning signs in all, listed below. ' : '') + ask;
  } else if(r.verdict === 'warn'){
    st = 'warn'; word = 'Be careful'; head = 'Be careful. Check it before you do anything.';
    body = 'I found ' + (r.found.length === 1 ? 'one warning sign' : r.found.length + ' warning signs') + '. On its own that isn\'t proof, so check who it\'s really from before you pay, tap a link or share anything. ' + ask;
  } else {
    st = 'good'; word = 'No big warning signs'; head = 'No big warning signs. Still check who it\'s from.';
    body = 'I didn\'t find the usual scam signs. That doesn\'t prove it\'s safe, because scammers change their words. Never pay to get a job, and get paid when the work is done.';
  }
  var box = $('sk-take'); box.className = 'f1-top sk-take' + (st ? ' ' + st : ' wait');
  var ic = $('sk-st'); ic.className = 'sc-ic ' + (st || 'wait'); ic.textContent = st === 'good' ? '✓' : st === 'warn' ? '!' : st === 'bad' ? '✕' : '…';
  $('sk-stw').textContent = word; $('sk-head').textContent = head; $('sk-body').textContent = body;
  var list = $('sk-signs'); list.textContent = '';
  $('sk-signs-h').textContent = r.found.length ? 'Warning signs I found (' + r.found.length + ')' : 'Warning signs I found';
  if(!r.found.length) el('li', 'sk-none', r.empty ? 'Nothing checked yet.' : 'None of the usual signs.', list);
  r.found.forEach(function(f){
    var li = el('li', f.s.w >= 3 ? 'bad' : 'warn', null, list);
    el('i', 'sc-ic ' + (f.s.w >= 3 ? 'bad' : 'warn'), f.s.w >= 3 ? '✕' : '!', li).setAttribute('aria-hidden', 'true');
    var d = el('div', null, null, li);
    el('b', null, f.s.name + (f.s.w >= 3 ? ' · big sign' : ''), d);
    el('span', null, f.s.why, d);
    el('small', null, f.you ? 'You ticked this.' : 'Found: "' + (f.hit.length > 60 ? f.hit.slice(0, 57) + '...' : f.hit) + '"', d);
  });
  $('sk-do').hidden = r.empty;
}

// Ticks for the signs a message can't show (who sent it, what they asked for in a call).
var qs = $('sk-qs');
SIGNS.forEach(function(s){
  if(!s.q) return;
  var lb = el('label', null, null, qs), cb = el('input', null, null, lb);
  cb.type = 'checkbox'; cb.id = 'sk-q-' + s.id; el('span', null, s.q, lb);
  cb.addEventListener('change', render);
});

// Examples to try: two scams and one real customer, for a teen or an adult.
var EX = ADULT ? [
  ['Fake job', 'Congratulations! You have been selected for a remote data entry role paying $45 an hour. We will mail you a check to buy your equipment. Deposit the check and send the extra to our vendor within 24 hours.'],
  ['"Mentor"', 'My trading mentor turned $1,000 into $12,000 in two weeks 📈 Guaranteed returns, zero risk. Join our private Telegram group to get started.'],
  ['Real customer', 'Hi, I got your number from my neighbour. Could you mow our front and back lawn this Saturday? I can pay $40 when you\'re done. Thanks, Chris']
] : [
  ['"Easy money"', 'Hey!! Want to make $500 a day from your phone? 💸 No experience needed. Just grab our $49 starter kit to unlock your earnings. Only 3 spots left, DM me "READY" before tonight!'],
  ['Cash flip', 'Cash flip 🔥 Send me $50 on a payment app and I\'ll turn it into $500 in an hour. 100% guaranteed. Don\'t tell your parents, they won\'t get it.'],
  ['Real customer', 'Hi, I saw your flyer at the library. Could you walk our dog Max on Tuesday after school? We usually pay $15 for a 30-minute walk. Thanks, Dana']
];
var exBox = $('sk-ex');
EX.forEach(function(x){
  var b = el('button', 'btn ghost sm', x[0], exBox); b.type = 'button';
  b.addEventListener('click', function(){
    $('sk-text').value = x[1];
    SIGNS.forEach(function(s){ var c = $('sk-q-' + s.id); if(c) c.checked = false; });
    render(); show();
  });
});
// On a phone the verdict sits below the form: bring it into view after a check.
function show(){
  var h = $('sk-take');
  var bar = document.querySelector('.site-head'), top = bar ? bar.getBoundingClientRect().bottom : 0, at = h.getBoundingClientRect();
  if(at.top < top || at.top > innerHeight - 160){
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollTo({ top: scrollY + at.top - top - 12, behavior: still ? 'auto' : 'smooth' });   // just under the sticky top bar
  }
  $('sk-head').focus({ preventScroll: true });
}
var tm;
$('sk-text').addEventListener('input', function(){ clearTimeout(tm); tm = setTimeout(render, 120); });
$('sk-go').addEventListener('click', function(){ render(); show(); });
$('sk-clear').addEventListener('click', function(){
  $('sk-text').value = ''; SIGNS.forEach(function(s){ var c = $('sk-q-' + s.id); if(c) c.checked = false; });
  render(); $('sk-text').focus();
});
render();
// For dev/scam.test.mjs: the same rules, without the page.
window.SharpScam = { SIGNS: SIGNS, scan: scan };
})();
