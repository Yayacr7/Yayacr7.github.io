/* Shared by the "road to rich" tools: Wealth tracker, Money ladder and Road to $1 million.
   Money formatting, reading each tool's saved numbers (localStorage, this device only), and a trading-style
   candle chart with a crosshair. Fixed maths, no AI. Visitor text: textContent only. */
(function(){
"use strict";
var R = window.SharpRich = {};
R.reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
R.$ = function(id){ return document.getElementById(id); };
R.el = function(tag, cls, text, parent){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; if(parent) parent.appendChild(e); return e; };
R.money = function(v){ return (v < 0 ? '-$' : '$') + Math.round(Math.abs(v)).toLocaleString('en-US'); };
// Short money for chart axes and tags: $950, $12k, $1.2M
R.short = function(v){
  var a = Math.abs(v), s = v < 0 ? '-$' : '$';
  if(a >= 1e6) return s + (Math.round(a / 1e5) / 10) + 'M';
  if(a >= 1e4) return s + Math.round(a / 1e3) + 'k';
  if(a >= 1e3) return s + (Math.round(a / 100) / 10) + 'k';
  return s + Math.round(a);
};
R.num = function(id, min, max, dflt){ var v = parseFloat(String(R.$(id).value).replace(/[$,%\s]/g, '')); return isFinite(v) ? Math.max(min, Math.min(max, v)) : dflt; };
R.load = function(key){ try{ var v = JSON.parse(localStorage.getItem(key) || 'null'); return v && typeof v === 'object' ? v : null; }catch(e){ return null; } };
R.save = function(key, v){ try{ localStorage.setItem(key, JSON.stringify(v)); }catch(e){} };
R.pop = function(el, o){ if(window.SharpPop) window.SharpPop(el, o); };
R.plural = function(n, w){ return n + ' ' + w + (n === 1 ? '' : 's'); };

// Money earned in the First $100 Plan's log.
R.firstPlan = function(){ return R.load('sharp-first100'); };
R.firstEarned = function(){ var f = R.firstPlan(), t = 0; if(f && f.logs) f.logs.forEach(function(l){ t += +l.v || 0; }); return t; };
// The Wealth tracker's months, oldest first, with totals and the average kept (saved + invested) per week.
R.tracker = function(){
  var d = R.load('sharp-wealth'), m = d && Array.isArray(d.months) ? d.months.slice() : [];
  m.sort(function(a, b){ return a.m < b.m ? -1 : 1; });
  var t = { months: m, earned: 0, kept: 0, worth: 0 };
  m.forEach(function(x){ t.earned += +x.e || 0; t.kept += (+x.s || 0) + (+x.i || 0); });
  t.worth = m.length ? +m[m.length - 1].w || 0 : 0;
  t.keptWeek = m.length ? t.kept / m.length * 12 / 52 : 0;
  return t;
};

/* Trading-style chart: dark grid, green/red candles, price tags on the right, a crosshair that follows the
   finger, and invisible buttons over each candle for keyboards and screen readers.
   o = { candles: [{ open, close, label, title }], lines: [{ v, text }], head: [big, small], minCols, onPick(i) } */
function svgEl(tag, at, parent){ var e = document.createElementNS('http://www.w3.org/2000/svg', tag); for(var a in at) e.setAttribute(a, at[a]); if(parent) parent.appendChild(e); return e; }
function step(span){ var raw = span / 5, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
R.chart = function(box, o){
  var W = box.clientWidth, H = box.clientHeight; box.textContent = '';
  if(W < 60 || H < 80) return;
  var C = o.candles || [], lines = o.lines || [], n = Math.max(o.minCols || 6, C.length);
  var hi = o.floor || 100; C.forEach(function(c){ hi = Math.max(hi, c.open, c.close); }); lines.forEach(function(l){ hi = Math.max(hi, l.v); });
  var lo = 0; C.forEach(function(c){ lo = Math.min(lo, c.open, c.close); });
  var st = step((hi - lo) * 1.12 || 1), yMax = Math.ceil(hi * 1.08 / st) * st, yMin = lo < 0 ? Math.floor(lo / st) * st : 0;
  var AX = W < 420 ? 52 : 62, TOP = 30, BOT = 26, PW = W - AX - 8, PH = H - TOP - BOT;
  var Y = function(v){ return TOP + (yMax - v) / (yMax - yMin) * PH; }, cw = PW / n, bw = Math.max(3, Math.min(30, cw * .62)), X = function(i){ return 8 + cw * (i + .5); };
  var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', class: 'fl-svg' }, box);
  var grid = svgEl('g', { class: 'fl-grid' }, svg), last = C.length ? C[C.length - 1].close : 0;
  var tagged = lines.map(function(l){ return Y(l.v); }).concat(C.length ? [Y(last)] : []);
  for(var v = yMin; v <= yMax + 1e-6; v += st){
    svgEl('line', { x1: 0, x2: W - AX, y1: Y(v), y2: Y(v), class: Math.abs(v) < 1e-9 && yMin < 0 ? 'zero' : '' }, grid);
    if(tagged.some(function(y){ return Math.abs(y - Y(v)) < 15; })) continue;
    svgEl('text', { x: W - AX + 8, y: Y(v) + 4, class: 'fl-ax' }, svg).textContent = R.short(v);
  }
  var every = Math.max(1, Math.ceil(n * 40 / PW));
  for(var i = 0; i < n; i++) if(i % every === 0) svgEl('line', { x1: X(i), x2: X(i), y1: TOP - 6, y2: TOP + PH }, grid);
  svgEl('line', { x1: W - AX, x2: W - AX, y1: 0, y2: H, class: 'fl-edge' }, svg);
  var tag = function(y, text, cls){
    var g = svgEl('g', { class: 'fl-tag ' + cls, transform: 'translate(' + (W - AX + 2) + ',' + y + ')' }, svg);
    svgEl('rect', { x: 0, y: -10, width: AX - 4, height: 20, rx: 3 }, g); svgEl('text', { x: (AX - 4) / 2, y: 4 }, g).textContent = text;
  };
  lines.forEach(function(l){ svgEl('line', { x1: 0, x2: W - AX, y1: Y(l.v), y2: Y(l.v), class: 'rc-goal' }, svg); if(!C.length || Math.abs(Y(l.v) - Y(last)) > 20) tag(Y(l.v), l.text, 'pos'); });
  C.forEach(function(c, j){
    var up = c.close >= c.open, g = svgEl('g', { class: 'fl-c ' + (up ? 'st-good' : 'st-bad') + (R.reduce ? '' : ' grow ' + (up ? 'up' : 'down')) }, svg);
    var y1 = Y(Math.max(c.open, c.close)), y2 = Y(Math.min(c.open, c.close));
    var b = svgEl('rect', { x: X(j) - bw / 2, y: y1, width: bw, height: Math.max(2, y2 - y1), rx: Math.min(2, bw / 3), class: 'body' }, g);
    if(!R.reduce) b.style.animationDelay = Math.min(j * 25, 700) + 'ms';
    if(j % every === 0 || j === C.length - 1) svgEl('text', { x: X(j), y: TOP + PH + 16, class: 'fl-x' }, svg).textContent = c.label;
  });
  if(C.length) tag(Y(last), R.short(last), last >= C[0].open ? 'pos' : 'neg');
  if(o.head){ var hd = svgEl('text', { x: 10, y: 19, class: 'fl-hd' }, svg); svgEl('tspan', { class: o.head[2] || 'pos' }, hd).textContent = o.head[0]; svgEl('tspan', { class: 'fl-hl', dx: 8 }, hd).textContent = o.head[1]; }
  if(!C.length) return;
  // Crosshair with its own price tag.
  var ch = svgEl('g', { class: 'fl-ch' }, svg); ch.style.display = 'none';
  var chv = svgEl('line', { y1: TOP - 6, y2: TOP + PH }, ch), chh = svgEl('line', { x1: 0, x2: W - AX }, ch), cht = svgEl('g', {}, ch);
  svgEl('rect', { x: W - AX + 2, y: -10, width: AX - 4, height: 20, rx: 3 }, cht); var chx = svgEl('text', { x: W - AX + 2 + (AX - 4) / 2, y: 4 }, cht);
  var aim = function(i, y, val){ ch.style.display = ''; chv.setAttribute('x1', X(i)); chv.setAttribute('x2', X(i)); chh.setAttribute('y1', y); chh.setAttribute('y2', y); cht.setAttribute('transform', 'translate(0,' + y + ')'); chx.textContent = R.short(val); if(o.onPick) o.onPick(i); };
  box.onpointermove = function(e){
    var rc = box.getBoundingClientRect(), py = Math.max(TOP, Math.min(TOP + PH, e.clientY - rc.top));
    var i = Math.max(0, Math.min(C.length - 1, Math.floor((e.clientX - rc.left - 8) / cw)));
    aim(i, py, yMax - (py - TOP) / PH * (yMax - yMin));
  };
  box.onpointerleave = function(){ ch.style.display = 'none'; if(o.onPick) o.onPick(-1); };
  C.forEach(function(c, i){
    var b = document.createElement('button'); b.type = 'button'; b.className = 'fl-hit';
    b.style.left = (X(i) - cw / 2) + 'px'; b.style.width = cw + 'px'; b.style.top = TOP + 'px'; b.style.height = PH + 'px';
    b.setAttribute('aria-label', c.title || (c.label + ': ' + R.money(c.close)));
    b.addEventListener('focus', function(){ aim(i, Y(c.close), c.close); });
    b.addEventListener('blur', function(){ ch.style.display = 'none'; });
    box.appendChild(b);
  });
};
})();
