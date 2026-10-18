/* Danny's weekly check-in (Builder, Founder and the free trial).
   Danny Dan saves the visitor's weekly plan (from the home Spending check) and, once a week, they tell him
   what they spent. The chart shows their real weeks against his plan. Everything stays in this browser
   (localStorage); only the plan check (which plan you have) talks to Supabase. Visitor text: textContent only. */
(function(){
"use strict";
var CFG = window.NP_CONFIG || {}, AUTH = CFG.AUTH || {};
var authReady = !!(AUTH.supabaseUrl && AUTH.supabaseAnonKey);
var KEY = 'sharp-checkin', HANDOFF = 'sharp-budget-handoff';
var DEMO_NUMS = { income: 3200, housing: 1100, bills: 280, food: 350, transport: 220, eat: 380, shop: 220, subs: 60, fun: 140, save: 200 };
var STATUS = { good: ['✓', 'On plan'], warn: ['!', 'Close'], bad: ['✕', 'Went up'] };
var demo = true, state = null;
function $(id){ return document.getElementById(id); }
function money(v){ var neg = v < 0; v = Math.abs(v); return (neg ? '−$' : '$') + Math.round(v).toLocaleString(); }
function el(tag, cls, text, parent){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; if(parent) parent.appendChild(e); return e; }
function load(k){ try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } }
function save(){ if(demo) return; try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }

// A plan is built from monthly numbers with the home Spending check's own rules (assets/tools.js).
function makeState(nums){
  var p = window.SharpDannyPlan && window.SharpDannyPlan(nums); if(!p) return null;
  return { nums: nums, start: new Date().toISOString().slice(0, 10), now: p.plan.now, goal: p.plan.goal,
    weeks: p.plan.weeks.map(function(w){ return { n: w.n, v: w.v, focus: w.r ? w.r.name : '', tip: w.r ? w.r.tip : '', to: w.r ? w.r.target * 12 / 52 : 0, cut: w.cut || 0 }; }),
    logs: [] };
}
function demoState(){ var s = makeState(DEMO_NUMS); if(!s) return null; s.logs = [{ n: 1, v: 592 }, { n: 2, v: 549 }, { n: 3, v: 536 }]; return s; }
function planAt(n){ var w = state.weeks; return n < w.length ? w[n].v : state.goal; }
function weekInfo(n){ var w = state.weeks; return n < w.length ? w[n] : { n: n, v: state.goal, focus: '' }; }
function statusOf(log, prev){ return log.v <= planAt(log.n) + 1 ? 'good' : log.v < prev ? 'warn' : 'bad'; }

/* ---------- Danny's words (fixed rules, no AI, nothing leaves the device) ---------- */
function dannySays(){
  var L = state.logs, next = L.length + 1, w = weekInfo(next);
  var focus = w.focus ? 'This week\'s one change: ' + w.focus + ', down to about ' + money(w.to) + ' a week. ' + w.tip : 'No new cut this week. Hold steady at about ' + money(planAt(next)) + ' a week and move what you freed into savings.';
  if(!L.length) return { head: 'Let\'s start, week 1.', body: 'You spend about ' + money(state.now) + ' a week now. My goal for you: ' + money(state.goal) + '. ' + focus };
  var last = L[L.length - 1], prev = L.length > 1 ? L[L.length - 2].v : state.now, st = statusOf(last, prev);
  var head = st === 'good' ? 'Nice, week ' + last.n + ' was on plan.' : st === 'warn' ? 'Close. Week ' + last.n + ' went down, just not all the way.' : 'Week ' + last.n + ' went up. No stress, we go again.';
  var body = (state.now - last.v > 0 ? 'Compared with where you started, that\'s about ' + money(state.now - last.v) + ' a week less. ' : '') + focus;
  return { head: head, body: body };
}

/* ---------- Chart: trading style. Candles = your real weeks, dashed line = Danny's plan. ---------- */
function svgEl(tag, at, parent){ var e = document.createElementNS('http://www.w3.org/2000/svg', tag); for(var k in at) e.setAttribute(k, at[k]); if(parent) parent.appendChild(e); return e; }
function step(span){ var raw = span / 5, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
function k(v){ return '$' + Math.round(v); }
function draw(){
  var box = $('ci-chart'), W = box.clientWidth, H = box.clientHeight; box.textContent = '';
  if(W < 60 || H < 80) return;
  var L = state.logs, n = Math.max(state.weeks.length, L.length + 2), vals = [state.now, state.goal].concat(L.map(function(l){ return l.v; }));
  var hi = Math.max.apply(null, vals), lo = Math.min.apply(null, vals), pad = Math.max((hi - lo) * .15, 10);
  var st = step(hi - lo + 2 * pad), yMin = Math.max(0, Math.floor((lo - pad) / st) * st), yMax = Math.ceil((hi + pad) / st) * st;
  var AX = W < 420 ? 50 : 60, TOP = 30, BOT = 42, PW = W - AX - 8, PH = H - TOP - BOT;
  var Y = function(v){ return TOP + (yMax - v) / (yMax - yMin) * PH; }, cw = PW / n, bw = Math.max(8, Math.min(34, cw * .5)), X = function(i){ return 8 + cw * (i + .5); };
  var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', class: 'fl-svg' }, box);
  var grid = svgEl('g', { class: 'fl-grid' }, svg), last = L.length ? L[L.length - 1].v : state.now;
  for(var v = yMin; v <= yMax + 1e-6; v += st){
    svgEl('line', { x1: 0, x2: W - AX, y1: Y(v), y2: Y(v) }, grid);
    if(Math.abs(Y(v) - Y(state.goal)) < 15 || Math.abs(Y(v) - Y(last)) < 15) continue;
    svgEl('text', { x: W - AX + 8, y: Y(v) + 4, class: 'fl-ax' }, svg).textContent = k(v);
  }
  for(var i = 0; i < n; i++) svgEl('line', { x1: X(i), x2: X(i), y1: TOP - 6, y2: TOP + PH }, grid);
  svgEl('line', { x1: W - AX, x2: W - AX, y1: 0, y2: H, class: 'fl-edge' }, svg);
  // Danny's plan: dashed line week by week, then his goal line + tag.
  var pts = []; for(i = 0; i < n; i++) pts.push(X(i).toFixed(1) + ',' + Y(planAt(i)).toFixed(1));
  svgEl('polyline', { points: pts.join(' '), class: 'ci-plan' }, svg);
  svgEl('line', { x1: 0, x2: W - AX, y1: Y(state.goal), y2: Y(state.goal), class: 'fl-now pos' }, svg);
  var tg = svgEl('g', { class: 'fl-tag pos', transform: 'translate(' + (W - AX + 2) + ',' + Y(state.goal) + ')' }, svg);
  svgEl('rect', { x: 0, y: -10, width: AX - 4, height: 20, rx: 3 }, tg); svgEl('text', { x: (AX - 4) / 2, y: 4 }, tg).textContent = k(state.goal);
  // Week 0 = where you started.
  var g0 = svgEl('g', { class: 'fl-c st-warn' }, svg);
  svgEl('line', { x1: X(0), x2: X(0), y1: Y(state.now) - 10, y2: Y(state.now) + 10, class: 'wick' }, g0);
  svgEl('rect', { x: X(0) - bw / 2, y: Y(state.now) - 2, width: bw, height: 4, rx: 2, class: 'body' }, g0);
  svgEl('text', { x: X(0), y: TOP + PH + 16, class: 'fl-x' }, svg).textContent = 'Start';
  // Your real weeks.
  var prev = state.now;
  L.forEach(function(l){
    var s = statusOf(l, prev), x = X(l.n), g = svgEl('g', { class: 'fl-c st-' + s }, svg);
    var y1 = Y(Math.max(prev, l.v)), y2 = Y(Math.min(prev, l.v));
    svgEl('rect', { x: x - bw / 2, y: y1, width: bw, height: Math.max(2, y2 - y1), rx: 2, class: 'body' }, g);
    svgEl('text', { x: x, y: TOP + PH + 16, class: 'fl-x' }, svg).textContent = (cw < 46 ? 'W' : 'Wk ') + l.n;
    var ic = svgEl('g', { class: 'fl-ic ' + s, transform: 'translate(' + x + ',' + (H - 12) + ')' }, svg);
    svgEl('circle', { r: 7.5 }, ic); svgEl('text', { y: 3.5 }, ic).textContent = STATUS[s][0];
    prev = l.v;
  });
  // Next week waiting for a check-in.
  var nx = L.length + 1; if(nx < n){ svgEl('text', { x: X(nx), y: TOP + PH + 16, class: 'fl-x ci-next' }, svg).textContent = 'Next'; }
  // Latest price tag on the right, like a trading chart.
  if(L.length){
    var lt = svgEl('g', { class: 'fl-tag ' + (last <= planAt(L[L.length - 1].n) + 1 ? 'pos' : 'neg'), transform: 'translate(' + (W - AX + 2) + ',' + Y(last) + ')' }, svg);
    svgEl('rect', { x: 0, y: -10, width: AX - 4, height: 20, rx: 3 }, lt); svgEl('text', { x: (AX - 4) / 2, y: 4 }, lt).textContent = k(last);
  }
  // Ticker header.
  var hd = svgEl('text', { x: 10, y: 19, class: 'fl-hd' }, svg), diff = state.now - last;
  svgEl('tspan', { class: diff >= 0 ? 'pos' : 'neg' }, hd).textContent = (diff >= 0 ? '−' : '+') + money(Math.abs(diff)) + '/wk';
  svgEl('tspan', { class: 'fl-hl', dx: 8 }, hd).textContent = L.length ? 'since you started' : 'Danny\'s goal: ' + money(state.goal) + '/wk';
}

/* ---------- Page ---------- */
function render(){
  var said = dannySays();
  $('ci-head').textContent = said.head; $('ci-body').textContent = said.body;
  var L = state.logs, next = L.length + 1;
  $('ci-week').textContent = 'Week ' + next;
  $('ci-label').textContent = 'What did you spend in week ' + next + '? Everything except saving ($)';
  $('ci-plan').textContent = 'Danny\'s plan for week ' + next + ': about ' + money(planAt(next)) + '.';
  var last = L.length ? L[L.length - 1] : null, total = 0;
  L.forEach(function(l){ total += Math.max(0, state.now - l.v); });
  $('ci-s1').textContent = L.length; $('ci-s2').textContent = money(total); $('ci-s3').textContent = last ? money(last.v) : money(state.now);
  var list = $('ci-list'); list.textContent = '';
  L.slice().reverse().forEach(function(l, i){
    var p = i < L.length - 1 ? L[L.length - 2 - i].v : state.now, s = statusOf(l, p), li = el('li', 'st-' + s, null, list);
    el('b', null, 'Week ' + l.n, li); el('span', null, money(l.v) + ' spent · plan ' + money(planAt(l.n)), li);
    var w = el('span', 'ci-st', null, li); el('i', 'sc-ic ' + s, STATUS[s][0], w).setAttribute('aria-hidden', 'true'); el('span', null, STATUS[s][1], w);
  });
  $('ci-empty').hidden = L.length > 0;
  draw();
}
function setMode(isDemo, why){
  demo = isDemo;
  $('ci-lock').hidden = !isDemo; $('ci-form').hidden = isDemo; $('ci-tools').hidden = isDemo;
  if(isDemo){ $('ci-why').textContent = why; $('ci-setup').hidden = true; $('ci-main').hidden = false; state = demoState(); render(); return; }
  state = load(KEY);
  var h = load(HANDOFF);
  if(h && (!state || location.hash === '#new')){ state = makeState(h); try{ localStorage.removeItem(HANDOFF); }catch(e){} save(); }
  $('ci-setup').hidden = !!state; $('ci-main').hidden = !state;
  if(state) render();
}
$('ci-form').addEventListener('submit', function(e){
  e.preventDefault();
  var v = parseFloat(String($('ci-spent').value).replace(/,/g, ''));
  if(!isFinite(v) || v < 0 || v > 100000){ $('ci-msg').textContent = 'Type what you spent this week, like 540.'; return; }
  $('ci-msg').textContent = '';
  state.logs.push({ n: state.logs.length + 1, v: v, at: new Date().toISOString().slice(0, 10) }); save();
  $('ci-spent').value = ''; render(); $('ci-head').focus();
});
$('ci-undo').addEventListener('click', function(){ if(state.logs.length){ state.logs.pop(); save(); render(); } });
$('ci-reset').addEventListener('click', function(){ if(confirm('Start over? Your weeks will be cleared from this device.')){ try{ localStorage.removeItem(KEY); }catch(e){} setMode(false); } });
addEventListener('resize', function(){ if(state && !$('ci-main').hidden) draw(); });

// Who may use it: Builder, Founder or an active trial (checked with Supabase). Everyone else sees a demo.
setMode(true, 'This is a demo with example numbers.');
if(authReady){
  var sc = document.createElement('script');
  sc.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
  sc.integrity = 'sha384-Rj26LVGvoeRVR6+mwQmFfcR3QOBEwT+ZmuCWpuiqeTzJpCs0ER4ITAWGb4Hiy3Ok'; sc.crossOrigin = 'anonymous';
  sc.onload = function(){
    var sb = window.supabase.createClient(AUTH.supabaseUrl, AUTH.supabaseAnonKey);
    sb.auth.getSession().then(function(r){
      if(!(r.data && r.data.session)){ setMode(true, 'Sign in with Builder or Founder to use your own numbers. This is a demo.'); return; }
      return sb.rpc('np_access_level').then(function(x){
        var lvl = x && x.data;
        if(lvl === 'builder' || lvl === 'founder' || lvl === 'trial') setMode(false);
        else setMode(true, 'The weekly check-in comes with Builder and Founder. This is a demo.');
      });
    }).catch(function(){ setMode(true, 'Couldn\'t check your plan just now. This is a demo.'); });
  };
  document.head.appendChild(sc);
}
})();
