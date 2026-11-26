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

/* ---------- step 1 chart: the money you keep, adding up month by month for a year (glowing, trading style) ---------- */
function svgEl(tag, at, parent){ var e = document.createElementNS('http://www.w3.org/2000/svg', tag); for(var a in at) e.setAttribute(a, at[a]); if(parent) parent.appendChild(e); return e; }
function grad(defs, id, at, list){ at.id = id; var g = svgEl('linearGradient', at, defs); list.forEach(function(s){ svgEl('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] == null ? 1 : s[2] }, g); }); }
function tw(t, est){ try{ var w = t.getComputedTextLength(); return w > 0 ? w : est; }catch(e){ return est; } }
var CH = { n: 0, drawn: false };
function chart(){
  var box = $('dm-chart'), W = box.clientWidth, H = box.clientHeight; box.textContent = '';
  if(W < 60) return;
  var anim = !CH.drawn && !reduce; CH.drawn = true;   // grow in once; dragging a slider just redraws
  box.setAttribute('aria-label', 'Chart: ' + money(keep().month) + ' a month kept, adding up to ' + money(keep().year) + ' in a year.');
  var m = keep().month, top = Math.max(m * 12, 10) * 1.15, AX = 60, T = 46, B = 22, PW = W - AX - 8, PH = H - T - B;
  var Y = function(v){ return T + (top - v) / top * PH; }, cw = PW / 12, bw = Math.max(6, Math.min(26, cw * .5)), X = function(i){ return 8 + cw * (i + .5); };
  var id = 'dmc' + (++CH.n), url = function(k){ return 'url(#' + id + k + ')'; };
  var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', class: 'fl-svg pc' }, box), defs = svgEl('defs', {}, svg);
  // Green at month 1, gold by the end of the year.
  grad(defs, id + 'l', { gradientUnits: 'userSpaceOnUse', x1: X(0), x2: X(11), y1: 0, y2: 0 }, [[0, '#22d3ee'], [.6, '#a5f3fc'], [1, '#ffd43b']]);
  grad(defs, id + 'b', { x1: 0, x2: 0, y1: 0, y2: 1 }, [[0, '#a5f3fc'], [.45, '#22d3ee'], [1, '#0e7490']]);
  grad(defs, id + 'g', { x1: 0, x2: 1, y1: 0, y2: 0 }, [[0, '#22d3ee', .05], [1, '#ffd43b', .12]]);
  grad(defs, id + 'c', { x1: 0, x2: 0, y1: 0, y2: 1 }, [[0, '#22d3ee', .5], [1, '#22d3ee', .04]]);
  svgEl('rect', { x: 0, y: T - 12, width: W - AX, height: PH + 12, rx: 12, fill: url('g') }, svg);
  var g = svgEl('g', { class: 'fl-grid' }, svg);
  for(var i = 0; i <= 3; i++){ var v = top / 1.15 * i / 3; svgEl('line', { x1: 0, x2: W - AX, y1: Y(v), y2: Y(v) }, g); if(i && i < 3) svgEl('text', { x: W - AX + 8, y: Y(v) + 4, class: 'fl-ax' }, svg).textContent = money(v); }
  svgEl('line', { x1: W - AX, x2: W - AX, y1: 0, y2: H, class: 'fl-edge' }, svg);
  // Header: what you keep a month, and the year in gold.
  var hv = svgEl('text', { x: 10, y: 28, class: 'pc-hd pc-v' }, svg); hv.textContent = '+' + money(m) + '/mo';
  var hs = svgEl('text', { x: 10 + tw(hv, 90) + 12, y: 27, class: 'pc-sub' }, svg);
  svgEl('tspan', {}, hs).textContent = 'kept · '; svgEl('tspan', { class: 'pc-gold' }, hs).textContent = money(m * 12) + ' in a year';
  if(10 + tw(hv, 90) + 12 + tw(hs, 0) > W - AX - 4) hs.remove();
  // Each month is a glowing column of everything kept so far; its bright cap is that month's new money.
  var pts = []; for(i = 0; i < 12; i++) pts.push(X(i).toFixed(1) + ',' + Y(m * (i + 1)).toFixed(1));
  for(i = 0; i < 12; i++){
    var c = svgEl('g', { class: 'fl-c pc-c st-good' + (anim ? ' dm-c' : '') }, svg), y1 = Y(m * (i + 1)), y2 = Y(m * i), r = Math.min(4, bw / 4);
    if(anim) c.style.animationDelay = (i * 45) + 'ms';
    svgEl('rect', { x: X(i) - bw / 2, y: y1, width: bw, height: Math.max(0, T + PH - y1), rx: r, fill: url('c') }, c);
    var b = svgEl('rect', { x: X(i) - bw / 2, y: y1, width: bw, height: Math.max(3, y2 - y1), rx: r, class: 'body' }, c); b.style.fill = url('b');
    if(i === 2 || i === 5 || i === 8 || i === 11) svgEl('text', { x: Math.min(X(i), W - AX - 14), y: H - 5, class: 'fl-x' }, svg).textContent = i === 11 ? '1 yr' : (i + 1) + ' mo';
  }
  var line = svgEl('polyline', { points: pts.join(' '), class: 'fl-trend pc-line' + (anim ? ' draw' : ''), pathLength: 1 }, svg);
  line.style.stroke = url('l'); line.style.filter = 'drop-shadow(0 0 7px rgba(255,212,59,.55))';
  var ex = X(11), ey = Y(m * 12);
  svgEl('circle', { cx: ex, cy: ey, r: 5, fill: '#ffd43b', class: 'pc-pulse' }, svg);
  var dot = svgEl('circle', { cx: ex, cy: ey, r: 5, class: 'pc-end' }, svg); dot.style.stroke = '#ffd43b'; dot.style.filter = 'drop-shadow(0 0 6px #ffd43b)';
  var tg = svgEl('g', { class: 'pc-tag gold', transform: 'translate(' + (W - AX + 1) + ',' + ey + ')' }, svg);
  svgEl('path', { d: 'M0 0L7-10H' + (AX - 4) + 'V10H7Z' }, tg); svgEl('text', { x: (AX + 3) / 2, y: 4 }, tg).textContent = money(m * 12);
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
  makeShare();
}
/* ---------- share my plan: a picture of your own results, drawn on this device ----------
   Made when the plan shows, so tapping Share opens the share sheet at once (Safari needs that). Nothing leaves the device
   unless the visitor shares it. Estimates are labelled as estimates. */
var SHARE = { file: null, url: '' };
function svgImg(src){
  // SVGs get a fixed size first so every browser can draw them on a canvas (data: is allowed by the page's CSP).
  return fetch(src).then(function(r){ return r.text(); }).then(function(t){
    return new Promise(function(res){ var i = new Image(); i.onload = function(){ res(i); }; i.onerror = function(){ res(null); };
      i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t.replace('<svg ', '<svg width="256" height="256" ')); });
  }).catch(function(){ return null; });
}
function rr(x, l, t, w, h, r){ x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
function wrapText(x, text, l, t, maxW, lh){
  var words = text.split(' '), line = '';
  words.forEach(function(w){ var test = line ? line + ' ' + w : w; if(x.measureText(test).width > maxW && line){ x.fillText(line, l, t); line = w; t += lh; } else line = test; });
  if(line) x.fillText(line, l, t);
}
function drawCard(x, img){
  var W = 1080, H = 1350, k = keep(), e = earn(), s = SKILLS[st.skill], D = '"Bricolage Grotesque", sans-serif', B = 'Karla, sans-serif';
  x.fillStyle = '#0b0e1c'; x.fillRect(0, 0, W, H);
  [[140, 120, 680, 'rgba(16,175,205,.5)'], [980, 200, 600, 'rgba(59,130,246,.42)'], [520, 1340, 700, 'rgba(34,211,238,.28)']].forEach(function(g){
    var r = x.createRadialGradient(g[0], g[1], 0, g[0], g[1], g[2]); r.addColorStop(0, g[3]); r.addColorStop(1, 'rgba(11,14,28,0)'); x.fillStyle = r; x.fillRect(0, 0, W, H);
  });
  x.textBaseline = 'middle';
  if(img.icon) x.drawImage(img.icon, 80, 78, 76, 76);
  x.fillStyle = '#fff'; x.font = '800 50px ' + D; x.fillText('Sharp', 176, 118);
  x.textAlign = 'right'; x.fillStyle = '#c9cde0'; x.font = '800 30px ' + B; x.fillText('sharpbasics.com', W - 80, 118); x.textAlign = 'left';
  x.textBaseline = 'alphabetic'; x.font = '800 104px ' + D; x.fillStyle = '#fff'; x.fillText('My money', 80, 296);
  var gr = x.createLinearGradient(80, 0, 480, 0); gr.addColorStop(0, '#22d3ee'); gr.addColorStop(1, '#ffd43b'); x.fillStyle = gr; x.fillText('plan.', 80, 400);
  function card(t, h, label, labelCol, big, bigCol, small){
    rr(x, 80, t, W - 160, h, 34); x.fillStyle = 'rgba(255,255,255,.07)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 2; x.stroke();
    x.fillStyle = labelCol; x.font = '800 30px ' + B; x.fillText(label.toUpperCase(), 124, t + 70);
    x.fillStyle = bigCol; x.font = '800 ' + (big.length > 12 ? 92 : 132) + 'px ' + D; x.shadowColor = bigCol; x.shadowBlur = 40; x.fillText(big, 120, t + (big.length > 12 ? 172 : 196)); x.shadowBlur = 0;
    x.fillStyle = '#dfe3f3'; x.font = '700 34px ' + B; wrapText(x, small, 124, t + 262, W - 260, 42);
  }
  card(462, 346, 'I could keep', '#a5f3fc', money(k.year), '#ffd43b', 'a year, by spending a third less on ' + CATS[st.cat].name.toLowerCase() + '.');
  card(832, 296, 'My first ' + money(GOAL), '#ffe27a', isFinite(e.weeks) ? 'about ' + weeksText(e.weeks) : 'More hours', '#67e8f9', s.name + ', ' + st.hours + (st.hours === 1 ? ' hour' : ' hours') + ' a week.');
  if(img.cherry) x.drawImage(img.cherry, 80, 1160, 96, 96);
  x.fillStyle = '#fff'; x.font = '800 38px ' + B; x.fillText('Made with Cherry, my AI money coach', 196, 1200);
  x.fillStyle = '#b9bfd8'; x.font = '700 28px ' + B; x.fillText('Estimates, not promises. Free, no sign-up.', 196, 1246);
}
function makeShare(){
  SHARE.file = null; $('dm-share-msg').textContent = '';
  var fonts = document.fonts ? Promise.all(['800 100px "Bricolage Grotesque"', '800 30px Karla', '700 30px Karla'].map(function(f){ return document.fonts.load(f); })).catch(function(){}) : Promise.resolve();
  Promise.all([fonts, svgImg('../icon.svg'), svgImg('../assets/cherry.svg')]).then(function(r){
    var c = document.createElement('canvas'); c.width = 1080; c.height = 1350; var x = c.getContext('2d');
    drawCard(x, { icon: r[1], cherry: r[2] });
    var url; try{ url = c.toDataURL('image/jpeg', .9); }catch(err){ x.clearRect(0, 0, 1080, 1350); drawCard(x, {}); url = c.toDataURL('image/jpeg', .9); }   // if a browser won't let the logos in, draw without them
    var im = $('dm-share-img'); im.src = url; im.hidden = false; SHARE.url = url;
    c.toBlob(function(blob){ if(blob) SHARE.file = new File([blob], 'my-sharp-plan.jpg', { type: 'image/jpeg' }); }, 'image/jpeg', .9);
  });
}
function shareText(){
  var k = keep(), e = earn();
  return 'My money plan from Sharp: I could keep about ' + money(k.year) + ' a year' + (isFinite(e.weeks) ? ' and reach my first ' + money(GOAL) + ' in about ' + weeksText(e.weeks) : '') + ' (estimates). Make yours free in 60 seconds:';
}
$('dm-sharebtn').addEventListener('click', function(){
  var msg = $('dm-share-msg'), link = 'https://sharpbasics.com/demo/';
  if(!SHARE.url){ msg.textContent = 'One second, your picture is still being made.'; return; }
  if(SHARE.file && navigator.canShare && navigator.canShare({ files: [SHARE.file] })){
    navigator.share({ files: [SHARE.file], title: 'My money plan', text: shareText() + ' ' + link }).then(function(){ msg.textContent = 'Shared. Cherry on top!'; if(window.SharpPop) SharpPop($('dm-sharebtn'), { n: 10 }); }).catch(function(){});
    return;
  }
  // No share sheet here (most computers): save the picture instead.
  var a = document.createElement('a'); a.href = SHARE.url; a.download = 'my-sharp-plan.jpg'; document.body.appendChild(a); a.click(); a.remove();
  msg.textContent = 'Saved as my-sharp-plan.jpg. Post it anywhere, with sharpbasics.com/demo.';
});

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
addEventListener('resize', function(){ if(cur === '1') chart(); });
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
/* The owner's video: plays silently and loops only while it's on screen (a hidden copy never loads), with a Pause/Play button.
   With "reduce motion" on it stays on its picture until the visitor taps Play. */
[].forEach.call(document.querySelectorAll('.dm-tour-v'), function(w){
  var v = w.querySelector('video'), b = w.querySelector('.dm-vbtn'), stopped = false;
  if(!v || !b) return;
  v.muted = true;
  var say = function(){ var on = !v.paused; b.textContent = on ? 'Pause' : 'Play'; b.setAttribute('aria-label', (on ? 'Pause' : 'Play') + ' the Sharp video'); };
  var play = function(){ var p = v.play(); if(p && p.catch) p.catch(function(){}); };
  b.addEventListener('click', function(){ if(v.paused){ stopped = false; play(); } else { stopped = true; v.pause(); } });
  v.addEventListener('play', say); v.addEventListener('pause', say); say();
  if(reduce || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function(es){ es.forEach(function(e){
    if(e.isIntersecting && !stopped) play(); else if(!e.isIntersecting && !v.paused) v.pause();
  }); }, { threshold: .35 }).observe(v);
});
/* The 40-second tour: real screens recorded from the app. "Watch" opens it in a player over the page; closing it stops it.
   Without <dialog> support the link simply opens the video file. */
(function(){
  var box = $('dm-tourbox'), vid = $('dm-tourvid'), last = null;
  if(!box || !vid || typeof box.showModal !== 'function') return;
  [].forEach.call(document.querySelectorAll('[data-tour]'), function(a){
    a.addEventListener('click', function(e){
      e.preventDefault(); last = a; box.showModal();
      var p = vid.play(); if(p && p.catch) p.catch(function(){});
    });
  });
  $('dm-tb-x').addEventListener('click', function(){ box.close(); });
  box.addEventListener('click', function(e){   // a tap outside the player closes it
    var r = box.getBoundingClientRect();
    if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) box.close();
  });
  box.addEventListener('close', function(){ vid.pause(); if(last) last.focus(); });
})();
go('1');
ask(!WHO);
})();
