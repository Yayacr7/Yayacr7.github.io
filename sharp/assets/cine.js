/* Home intro: the cinematic scroll story above the app screen (styles in assets/cine.css).
   Scroll moves each scene from start (p = 0) to finished (p = 1). Reduced motion shows every scene finished.
   Returning visitors land straight on the app screen; scrolling up still shows the intro. */
(function(){
"use strict";
var root = document.documentElement, intro = document.getElementById('intro'), app = document.getElementById('app');
if(!intro || !app) return;
var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
var NS = 'http://www.w3.org/2000/svg';
var clamp = function(v){ return v < 0 ? 0 : v > 1 ? 1 : v; };
var ease = function(t){ return 1 - Math.pow(1 - t, 3); };
var money = function(n){ return '$' + Math.round(n).toLocaleString('en-US'); };
function svg(tag, at, parent){ var e = document.createElementNS(NS, tag); for(var k in at) e.setAttribute(k, at[k]); if(parent) parent.appendChild(e); return e; }

if(!still) root.classList.add('cine-js');

/* Returning visitors skip straight to the app (no animation, no jump if they came for a #link). */
var seen = false; try{ seen = localStorage.getItem('sharp-intro') === '1'; }catch(e){}
function markSeen(){ try{ localStorage.setItem('sharp-intro', '1'); }catch(e){} }
function toApp(){ root.style.scrollBehavior = 'auto'; window.scrollTo(0, app.offsetTop); root.style.scrollBehavior = ''; }
// A link into the app screen (like index.html#check) shows the whole app screen, header included.
function hashInApp(){ var t = location.hash && document.getElementById(location.hash.slice(1)); return t && t !== app && app.contains(t); }
if((seen && !location.hash) || hashInApp()) toApp();
addEventListener('load', function(){ if(hashInApp()) toApp(); });
addEventListener('hashchange', function(){ if(hashInApp()) toApp(); });

/* Big words: split into letters that fly in from scattered places. */
var lettered = [].map.call(document.querySelectorAll('[data-letters]'), function(h){
  var text = h.textContent; h.setAttribute('aria-label', text); h.textContent = '';
  var chars = [];
  text.split(' ').forEach(function(word, wi){
    var w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
    word.split('').forEach(function(c){
      var s = document.createElement('span'); s.className = 'ch'; s.textContent = c; w.appendChild(s);
      chars.push({ el: s, dx: (Math.random() - .5) * 260, dy: (Math.random() - .5) * 220, r: (Math.random() - .5) * 90 });
    });
    h.appendChild(w); if(wi < text.split(' ').length - 1) h.appendChild(document.createTextNode(' '));
  });
  return { h: h, chars: chars };
});
function assemble(l, t){
  var n = l.chars.length;
  l.chars.forEach(function(c, i){
    var k = still ? 1 : ease(clamp(t * 1.6 - (i / n) * .6));
    c.el.style.transform = k >= 1 ? '' : 'translate(' + (c.dx * (1 - k)).toFixed(1) + 'px,' + (c.dy * (1 - k)).toFixed(1) + 'px) rotate(' + (c.r * (1 - k)).toFixed(1) + 'deg)';
    c.el.style.opacity = (.08 + .92 * k).toFixed(2);
  });
}

/* Scene 2: a candle chart that builds as you scroll. */
var chart = intro.querySelector('.big-chart'), candles = [], trend, tag, tagText, leftEl = document.getElementById('cine-left');
var DATA = [3200, 2100, 1720, 1500, 1350, 1130, 1000, 860, 760, 700, 640, 520, 450, 250];   // money left after each spend (example)
if(chart){
  var g = chart.querySelector('.grid'), cg = chart.querySelector('.candles');
  trend = chart.querySelector('.trend'); tag = chart.querySelector('.tag'); tagText = tag.querySelector('text');
  for(var y = 60; y <= 500; y += 88) svg('line', { x1: 0, x2: 860, y1: y, y2: y }, g);
  for(var x = 40; x <= 860; x += 82) svg('line', { x1: x, x2: x, y1: 40, y2: 520 }, g);
  var Y = function(v){ return 500 - v / 3400 * 440; }, step = 820 / DATA.length, pts = [];
  DATA.forEach(function(v, i){
    var prev = i ? DATA[i - 1] : 0, x0 = 30 + i * step, top = Y(Math.max(v, prev)), bot = Y(i ? Math.min(v, prev) : 0);
    var cls = i === 0 ? 'up' : (prev - v) > 380 ? 'down' : (prev - v) > 200 ? 'warn' : 'up';
    var grp = svg('g', { 'class': cls }, cg);
    svg('line', { x1: x0 + step * .35, x2: x0 + step * .35, y1: top - 14, y2: bot + 10, stroke: 'currentColor' }, grp);
    svg('rect', { x: x0 + step * .12, y: top, width: step * .46, height: Math.max(6, bot - top) }, grp);
    grp.style.color = cls === 'up' ? '#3ddba5' : cls === 'warn' ? '#f5b52e' : '#ff6b6b';
    grp.style.transformBox = 'fill-box'; grp.style.transformOrigin = 'bottom';
    candles.push(grp); pts.push([x0 + step * .35, Y(v)]);
  });
  trend.setAttribute('d', 'M' + pts.map(function(p){ return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L'));
  var tlen = trend.getTotalLength(); trend.style.strokeDasharray = tlen; chart._tlen = tlen; chart._pts = pts;
}
function drawChart(p){
  if(!chart) return;
  var shown = still ? DATA.length : p * (DATA.length + 1.5);
  candles.forEach(function(c, i){ var k = clamp(shown - i); c.style.transform = 'scaleY(' + ease(k).toFixed(3) + ')'; c.style.opacity = k ? 1 : 0; });
  var f = still ? 1 : clamp(shown / DATA.length);
  trend.style.strokeDashoffset = (chart._tlen * (1 - f)).toFixed(1);
  var idx = Math.max(0, Math.min(DATA.length - 1, Math.floor(shown - .01)));
  var pt = chart._pts[idx]; tag.setAttribute('transform', 'translate(880,' + pt[1].toFixed(1) + ')');
  tagText.textContent = money(DATA[idx]);
  if(leftEl) leftEl.textContent = money(f >= 1 ? 250 : DATA[idx]);
}

/* Scene 3: coins stack up while the money grows. */
var coinBox = intro.querySelector('.coins'), coins = [], countEl = document.getElementById('cine-count'), countL = document.getElementById('cine-count-l');
if(coinBox){
  for(var c = 0; c < 6; c++){
    var col = document.createElement('div'); col.className = 'col'; coinBox.appendChild(col);
    for(var r = 0; r < 4 + c * 3; r++){ var coin = document.createElement('span'); coin.className = 'c'; col.appendChild(coin); coins.push({ el: coin, order: c * 100 + r }); }
  }
  coins.sort(function(a, b){ return a.order - b.order; });
}
var YEAR = 5 * 365, TEN = YEAR * ((Math.pow(1.07, 10) - 1) / .07);   // $1,825 a year; about $25,215 after 10 years at 7%
function drawCoins(p){
  if(!coinBox) return;
  var on = still ? coins.length : Math.round(clamp(p * 1.15) * coins.length);
  coins.forEach(function(c, i){ c.el.classList.toggle('on', i < on); });
  var t = still ? 1 : p, v, l;
  if(t < .3){ v = 5; l = 'a day'; }
  else if(t < .6){ v = 5 + (YEAR - 5) * ease((t - .3) / .3); l = 'a year'; }
  else { v = YEAR + (TEN - YEAR) * ease(clamp((t - .6) / .3)); l = 'after 10 years'; }
  countEl.textContent = money(v); countL.textContent = l;
}

/* Scene 4: the pencil draws the rising line, past four milestones. */
var draw = intro.querySelector('.draw'), dpath, dlen = 0, pencil, marks = [];
if(draw){
  dpath = draw.querySelector('.draw-path'); dlen = dpath.getTotalLength(); pencil = draw.querySelector('.pencil');
  dpath.style.strokeDasharray = dlen;
  var mg = draw.querySelector('.marks');
  [['IDEA', .12], ['PRICE', .38], ['FIRST SALE', .64], ['PROFIT', .93]].forEach(function(m){
    var pt = dpath.getPointAtLength(dlen * m[1]), grp = svg('g', {}, mg);
    svg('circle', { cx: pt.x, cy: pt.y, r: 9 }, grp);
    svg('text', { x: pt.x + (m[1] > .9 ? -14 : 14), y: pt.y + (m[1] > .9 ? 34 : -18), 'text-anchor': m[1] > .9 ? 'end' : 'start' }, grp).textContent = m[0];
    marks.push({ el: grp, at: m[1] });
  });
}
function drawLine(p){
  if(!draw) return;
  var f = still ? 1 : clamp(p * 1.1);
  dpath.style.strokeDashoffset = (dlen * (1 - f)).toFixed(1);
  var a = dpath.getPointAtLength(dlen * f), b = dpath.getPointAtLength(Math.max(0, dlen * f - 2));
  var ang = Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI;
  pencil.setAttribute('transform', 'translate(' + a.x.toFixed(1) + ',' + a.y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')');
  marks.forEach(function(m){ m.el.classList.toggle('on', f >= m.at); });
}

/* Scene 1: tiny candles fly toward you; scrolling speeds them up. */
var cv = document.getElementById('cine-warp'), cx = cv && cv.getContext('2d'), stars = [], speed = 1, running = false, W = 0, H = 0;
function sizeWarp(){
  if(!cv) return; var d = Math.min(devicePixelRatio || 1, 2);
  W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
}
function star(z){ return { x: (Math.random() - .5) * 2, y: (Math.random() - .5) * 2, z: z || Math.random(), c: Math.random() < .62 ? '#3ddba5' : Math.random() < .5 ? '#ff6b6b' : '#ff8f5e' }; }
for(var i = 0; i < 260; i++) stars.push(star());
function frame(){
  if(!running) return;
  cx.clearRect(0, 0, W, H);
  var fx = W / 2, fy = H / 2, sc = Math.max(W, H) * .6;
  stars.forEach(function(s){
    s.z -= .0016 * speed; if(s.z <= .02){ var n = star(1); s.x = n.x; s.y = n.y; s.z = 1; s.c = n.c; }
    var k = 1 / s.z, px = fx + s.x * sc * k * .35, py = fy + s.y * sc * k * .35;
    if(px < -40 || px > W + 40 || py < -40 || py > H + 40) return;
    var size = Math.min(14, (1 - s.z) * 9 + .6), a = Math.min(1, (1 - s.z) * 1.4);
    cx.globalAlpha = a; cx.fillStyle = s.c; cx.strokeStyle = s.c;
    cx.fillRect(px - size * .3, py - size, size * .6, size * 2);                  // candle body
    cx.beginPath(); cx.moveTo(px, py - size * 1.7); cx.lineTo(px, py + size * 1.7); cx.lineWidth = Math.max(.6, size * .12); cx.stroke();   // wick
  });
  cx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
function warp(on){ if(!cv || still || on === running) return; running = on; if(on) requestAnimationFrame(frame); }
if(cv){ sizeWarp(); addEventListener('resize', sizeWarp); if(still){ running = true; frame(); running = false; } }

/* Scroll: work out each scene's progress and draw it. */
var scenes = [].slice.call(intro.querySelectorAll('[data-scene]')), focus = document.getElementById('cine-focus'), bar = document.getElementById('cine-focus-bar');
var lastY = scrollY, raf = 0;
function progress(el){ var r = el.getBoundingClientRect(), span = r.height - innerHeight; return span > 0 ? clamp(-r.top / span) : clamp(1.2 - r.top / innerHeight); }
function update(){
  raf = 0;
  var y = scrollY; speed = 1 + Math.min(14, Math.abs(y - lastY) * .25); lastY = y;
  var p = scenes.map(progress);
  scenes[0].style.setProperty('--p', still ? 0 : p[0].toFixed(3));
  assemble(lettered[0], heroT);
  // Later headlines fly together while their scene slides up into view.
  for(var i = 1; i < lettered.length; i++){ var top = scenes[i].getBoundingClientRect().top; assemble(lettered[i], clamp(1.15 - top / innerHeight)); }
  drawChart(p[1]); drawCoins(p[2]); drawLine(p[3]);
  var total = clamp(y / Math.max(1, app.offsetTop));
  if(focus){ focus.textContent = ('00' + Math.round(total * 100)).slice(-3); bar.style.width = (total * 100).toFixed(1) + '%'; }
  var appTop = app.getBoundingClientRect().top;
  root.classList.toggle('cine-done', appTop <= innerHeight * .55);   // hide the intro's bar and corner numbers as the app arrives
  if(appTop <= 2) markSeen();
  var r0 = scenes[0].getBoundingClientRect(); warp(r0.bottom > 0);
}
addEventListener('scroll', function(){ if(!raf) raf = requestAnimationFrame(update); }, { passive: true });
addEventListener('resize', function(){ if(!raf) raf = requestAnimationFrame(update); });
[].forEach.call(document.querySelectorAll('a[href="#app"]'), function(a){ a.addEventListener('click', markSeen); });

/* The hero headline flies together once on load. */
var heroT = 0, t0 = performance.now();
function intro0(now){ heroT = still ? 1 : clamp((now - t0) / 1400); assemble(lettered[0], heroT); if(heroT < 1) requestAnimationFrame(intro0); }
update(); requestAnimationFrame(intro0);
setInterval(function(){ if(speed > 1){ speed = Math.max(1, speed * .9); } }, 60);
})();
