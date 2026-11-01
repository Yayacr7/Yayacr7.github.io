/* The money jar: a glass jar that fills with the money you keep. Gold coins and green bills = what you keep now;
   a glowing pink layer on top = what Cherry's plan adds; a dashed line = the goal. The caller works out the numbers
   (home Spending check in tools.js, demo step 1 in demo.js) and writes the words next to it; this file only draws.
   Nothing leaves the device. SharpJar.draw(box, { fill, plan, goal, goalText, ticks, leak, from, animate, coins, icon })
   fill/plan/goal/from are 0..1 of the jar's height. Colour is never the only signal: the caller always says it in words. */
(function(){
"use strict";
var NS = 'http://www.w3.org/2000/svg', N = 0;
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function E(tag, at, p){ var e = document.createElementNS(NS, tag); for(var k in at) e.setAttribute(k, at[k]); if(p) p.appendChild(e); return e; }
function stops(g, list){ list.forEach(function(s){ E('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] == null ? 1 : s[2] }, g); }); return g; }
// The jar in a 200 x 260 box: neck at y 44-54, round shoulders, flat sides, round bottom at y 238.
var BODY = 'M60 44h80v10c0 9 34 11 34 34v124c0 17-12 26-30 26H56c-18 0-30-9-30-26V88c0-23 34-25 34-34z';
var BOT = 236, TOP = 70;
function Y(f){ return BOT - Math.max(0, Math.min(1, f || 0)) * (BOT - TOP); }
// A four-point sparkle. The group places it; the star itself twinkles in place (scale about its own centre).
function star(p, x, y, k, color, cls){ var g = E('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + k + ')' }, p); return E('path', { d: 'M0-6l1.6 4.4L6 0l-4.4 1.6L0 6l-1.6-4.4L-6 0l4.4-1.6z', fill: color, class: cls }, g); }
function clamp(f){ return Math.max(0, Math.min(1, +f || 0)); }

function draw(box, o){
  o = o || {};
  var id = 'jar' + (++N), fill = clamp(o.fill), plan = o.plan == null ? null : clamp(o.plan), from = o.from == null ? 0 : clamp(o.from);
  var move = o.animate && !reduce && Math.abs(fill - from) > .004;
  box.textContent = '';
  var svg = E('svg', { viewBox: '0 0 200 260', preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true', focusable: 'false', class: 'jar-svg' + (o.leak ? ' leak' : '') }, box);
  var d = E('defs', {}, svg);
  stops(E('radialGradient', { id: id + 'glow', cx: '.5', cy: '.55', r: '.5' }, d), [[0, '#3ddba5', .55], [.55, '#3ddba5', .16], [1, '#3ddba5', 0]]);
  stops(E('radialGradient', { id: id + 'pglow', cx: '.5', cy: '.5', r: '.5' }, d), [[0, '#ff5fa2', .6], [1, '#ff5fa2', 0]]);
  stops(E('linearGradient', { id: id + 'glass', x1: 0, x2: 1, y1: 0, y2: 0 }, d), [[0, '#ffffff', .13], [.35, '#ffffff', .03], [.8, '#ffffff', .05], [1, '#ffffff', .14]]);
  stops(E('linearGradient', { id: id + 'gold', x1: 0, x2: 0, y1: 0, y2: 1 }, d), [[0, '#ffe58f'], [.18, '#ffc93d'], [.7, '#f29b16'], [1, '#b8640a']]);
  stops(E('linearGradient', { id: id + 'side', x1: 0, x2: 1, y1: 0, y2: 0 }, d), [[0, '#000', .28], [.22, '#000', 0], [.78, '#000', 0], [1, '#000', .3]]);
  stops(E('linearGradient', { id: id + 'coin', x1: 0, x2: 0, y1: 0, y2: 1 }, d), [[0, '#fff3b8'], [.5, '#ffcf4a'], [1, '#d98a12']]);
  stops(E('linearGradient', { id: id + 'plan', x1: 0, x2: 1, y1: 0, y2: 1 }, d), [[0, '#ff7ab8', .9], [.55, '#ff4f9a', .75], [1, '#a86bff', .8]]);
  stops(E('linearGradient', { id: id + 'lid', x1: 0, x2: 0, y1: 0, y2: 1 }, d), [[0, '#fff0b3'], [.3, '#f6c454'], [.62, '#c98a2e'], [1, '#7a4e12']]);
  stops(E('linearGradient', { id: id + 'streak', x1: 0, x2: 0, y1: 0, y2: 1 }, d), [[0, '#fff', .7], [.6, '#fff', .18], [1, '#fff', 0]]);
  stops(E('linearGradient', { id: id + 'bill', x1: 0, x2: 1, y1: 0, y2: 1 }, d), [[0, '#6ff0c0'], [1, '#22a878']]);
  // Coins seen from the side: rows of thin ellipses.
  var pat = E('pattern', { id: id + 'coins', width: 26, height: 8, patternUnits: 'userSpaceOnUse' }, d);
  E('ellipse', { cx: 13, cy: 4, rx: 12, ry: 3.4, fill: 'none', stroke: '#8a4d06', 'stroke-opacity': .45, 'stroke-width': 1 }, pat);
  E('ellipse', { cx: 0, cy: 0, rx: 12, ry: 3.4, fill: 'none', stroke: '#fff6c8', 'stroke-opacity': .35, 'stroke-width': .8 }, pat);
  E('ellipse', { cx: 26, cy: 0, rx: 12, ry: 3.4, fill: 'none', stroke: '#fff6c8', 'stroke-opacity': .35, 'stroke-width': .8 }, pat);
  E('ellipse', { cx: 0, cy: 8, rx: 12, ry: 3.4, fill: 'none', stroke: '#fff6c8', 'stroke-opacity': .35, 'stroke-width': .8 }, pat);
  E('ellipse', { cx: 26, cy: 8, rx: 12, ry: 3.4, fill: 'none', stroke: '#fff6c8', 'stroke-opacity': .35, 'stroke-width': .8 }, pat);
  var ghost = E('pattern', { id: id + 'ghost', width: 26, height: 8, patternUnits: 'userSpaceOnUse' }, d);
  E('ellipse', { cx: 13, cy: 4, rx: 11, ry: 3.2, fill: 'none', stroke: '#fff', 'stroke-opacity': .3, 'stroke-width': .9 }, ghost);
  var stripes = E('pattern', { id: id + 'stripes', width: 12, height: 12, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' }, d);
  E('rect', { x: 0, y: 0, width: 5, height: 12, fill: '#fff', 'fill-opacity': .16 }, stripes);
  var clip = E('clipPath', { id: id + 'in' }, d);
  E('path', { d: BODY, transform: 'translate(100 141) scale(.955 .965) translate(-100 -141)' }, clip);

  // Glow behind, shadow under.
  E('ellipse', { cx: 100, cy: 150, rx: 100, ry: 118, fill: 'url(#' + id + 'glow)' }, svg);
  if(plan != null && plan > fill) E('ellipse', { cx: 100, cy: (Y(plan) + Y(fill)) / 2, rx: 92, ry: 46, fill: 'url(#' + id + 'pglow)', class: 'jar-pglow' }, svg);
  E('ellipse', { cx: 100, cy: 248, rx: 70, ry: 7, fill: '#000', 'fill-opacity': .5 }, svg);
  E('path', { d: BODY, fill: 'url(#' + id + 'glass)' }, svg);

  // What's inside, clipped to the glass. It all moves together when the level changes.
  var inner = E('g', { 'clip-path': 'url(#' + id + 'in)' }, svg), stuff = E('g', { class: 'jar-stuff' }, inner);
  var yf = Y(fill);
  if(plan != null && plan > fill + .004){
    var yp = Y(plan);
    E('rect', { x: 10, y: yp, width: 180, height: yf - yp + 8, fill: 'url(#' + id + 'plan)' }, stuff);
    E('rect', { x: -20, y: yp, width: 230, height: yf - yp + 8, fill: 'url(#' + id + 'stripes)', class: 'jar-shimmer' }, stuff);
    E('rect', { x: 10, y: yp + 3, width: 180, height: yf - yp, fill: 'url(#' + id + 'ghost)' }, stuff);
    E('line', { x1: 10, x2: 190, y1: yp, y2: yp, stroke: '#ffd1ea', 'stroke-width': 2, 'stroke-dasharray': '6 4' }, stuff);
    // Its label sits in the middle of the pink layer, but never on top of the goal line and its label.
    if(o.planText && yf - yp >= 22){
      // Text with baseline y covers y-12..y+2; the goal label covers yg-16..yg+2. Try the middle, then the top, then the bottom.
      var yg0 = o.goal != null && o.goal > 0 && o.goalText ? Y(o.goal) : null, ly = null;
      [(yp + yf) / 2 + 5, yp + 17, yf - 5].some(function(c){ if(c < yp + 15 || c > yf - 2 || (yg0 != null && c + 2 > yg0 - 16 && c - 12 < yg0 + 2)) return false; ly = c; return true; });
      if(ly != null) E('text', { x: 100, y: ly, 'text-anchor': 'middle', class: 'jar-t jar-pt' }, stuff).textContent = o.planText;
    }
  }
  if(fill > .002){
    E('rect', { x: 10, y: yf, width: 180, height: 270 - yf, fill: 'url(#' + id + 'gold)' }, stuff);
    E('rect', { x: 10, y: yf + 3, width: 180, height: 270 - yf, fill: 'url(#' + id + 'coins)' }, stuff);
    // A few green bills tucked in the pile, only where the pile is deep enough to hold them.
    [[60, 24, -14], [128, 58, 11], [84, 100, -6], [140, 132, 16]].forEach(function(b){
      var by = BOT - b[1]; if(by - 16 < yf) return;
      var g = E('g', { transform: 'translate(' + b[0] + ' ' + by + ') rotate(' + b[2] + ')' }, stuff);
      E('rect', { x: -24, y: -11, width: 48, height: 22, rx: 3, fill: 'url(#' + id + 'bill)', stroke: '#0f6a49', 'stroke-width': 1.2 }, g);
      E('rect', { x: -19, y: -7, width: 38, height: 14, rx: 2, fill: 'none', stroke: '#e9fff6', 'stroke-opacity': .6, 'stroke-width': .9 }, g);
      E('circle', { cx: 0, cy: 0, r: 5.5, fill: '#0f6a49', 'fill-opacity': .35 }, g);
      E('text', { x: 0, y: 4, 'text-anchor': 'middle', class: 'jar-bill-t' }, g).textContent = '$';
    });
    E('rect', { x: 10, y: yf, width: 180, height: 270 - yf, fill: 'url(#' + id + 'side)' }, stuff);
    // The bumpy top of the pile: loose coins lying on it.
    for(var i = 0, x = 26; x < 176; i++, x += 14){
      var cy = yf + (i % 3 === 0 ? -2.5 : i % 3 === 1 ? .5 : -1);
      E('ellipse', { cx: x + (i % 2 ? 2 : 0), cy: cy, rx: 9, ry: 3.6, fill: 'url(#' + id + 'coin)', stroke: '#9a5a08', 'stroke-width': .8 }, stuff);
    }
    star(stuff, 62, yf - 4, 1, '#fff', 'jar-spark');
  }
  if(move){
    var dy = Y(from) - yf;
    if(stuff.animate) stuff.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'translateY(0)' }], { duration: 950, delay: o.coins ? 420 : 0, easing: 'cubic-bezier(.2,.85,.25,1)', fill: 'backwards' });
  }

  // Goal line and month marks, drawn on the glass.
  if(o.goal != null && o.goal > 0){
    var yg = Y(o.goal);
    E('line', { x1: 32, x2: 168, y1: yg, y2: yg, stroke: '#fff', 'stroke-opacity': .9, 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }, svg);
    if(o.goalText) E('text', { x: 166, y: yg - 5, 'text-anchor': 'end', class: 'jar-t' }, svg).textContent = o.goalText;
  }
  (o.ticks || []).forEach(function(t){
    var yt = Y(t.f); if(t.f <= 0 || t.f > 1) return;
    E('line', { x1: 31, x2: 41, y1: yt, y2: yt, stroke: '#fff', 'stroke-opacity': .85, 'stroke-width': 1.5 }, svg);
    E('text', { x: 45, y: yt + 3.5, class: 'jar-t' }, svg).textContent = t.text;
  });

  // Glass: highlights and the outline on top of the money.
  E('rect', { x: 37, y: 94, width: 9, height: 112, rx: 4.5, fill: 'url(#' + id + 'streak)' }, svg);
  E('rect', { x: 51, y: 98, width: 3, height: 70, rx: 1.5, fill: '#fff', 'fill-opacity': .22 }, svg);
  E('rect', { x: 159, y: 104, width: 4, height: 92, rx: 2, fill: '#fff', 'fill-opacity': .14 }, svg);
  E('path', { d: 'M64 60c-11 6-22 12-27 26', fill: 'none', stroke: '#fff', 'stroke-opacity': .55, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
  E('path', { d: BODY, fill: 'none', stroke: '#e8fbff', 'stroke-opacity': .7, 'stroke-width': 2.6 }, svg);
  if(o.leak){
    E('path', { d: 'M150 168l-9 11 7 6-10 13', fill: 'none', stroke: '#ff5a6e', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    E('path', { d: 'M138 236c0 0-5 7-5 10a5 5 0 0 0 10 0c0-3-5-10-5-10z', fill: '#ff5a6e', class: 'jar-drip' }, svg);
  }

  // Coins dropping through the slot (drawn before the lid, so they vanish into it).
  var n = move && o.coins ? Math.min(6, o.coins) : 0;
  for(var c = 0; c < n; c++){
    var coin = E('g', { class: 'jar-coin' }, svg);
    coin.style.setProperty('--x', (100 + (c % 2 ? 1 : -1) * (6 + c * 3)) + 'px');
    coin.style.animationDelay = (c * 110) + 'ms';
    E('circle', { r: 8, fill: 'url(#' + id + 'coin)', stroke: '#9a5a08', 'stroke-width': 1 }, coin);
    E('circle', { r: 5, fill: 'none', stroke: '#fff7d0', 'stroke-opacity': .8, 'stroke-width': 1 }, coin);
  }

  // Neck rim and the gold lid with a coin slot and Cherry's badge.
  E('rect', { x: 57, y: 43, width: 86, height: 7, rx: 3.5, fill: '#fff', 'fill-opacity': .16, stroke: '#e8fbff', 'stroke-opacity': .6, 'stroke-width': 1.4 }, svg);
  E('rect', { x: 52, y: 20, width: 96, height: 26, rx: 7, fill: 'url(#' + id + 'lid)', stroke: '#6b420c', 'stroke-width': 1.2 }, svg);
  for(var r = 60; r <= 140; r += 6) if(r < 86 || r > 114) E('line', { x1: r, x2: r, y1: 26, y2: 42, stroke: '#5a3608', 'stroke-opacity': .28, 'stroke-width': 1.4 }, svg);
  E('rect', { x: 55, y: 23, width: 90, height: 3.5, rx: 1.75, fill: '#fff', 'fill-opacity': .45 }, svg);
  E('rect', { x: 82, y: 17.5, width: 36, height: 5.5, rx: 2.75, fill: '#2a1a03', stroke: '#fff0b3', 'stroke-opacity': .7, 'stroke-width': .8 }, svg);
  if(o.icon){ var im = E('image', { x: 88, y: 21, width: 24, height: 24 }, svg); im.setAttribute('href', o.icon); }

  // A little sparkle around the jar.
  [[24, 30, 1], [182, 66, .8], [176, 18, .6], [16, 120, .55]].forEach(function(s, k){
    star(svg, s[0], s[1], s[2], k % 2 ? '#ff9fcf' : '#ffe58f', 'jar-twinkle').style.animationDelay = (k * .7) + 's';
  });
  return svg;
}

// Count a number up from where it was (off for reduced motion). fmt turns the number into text.
function count(node, to, fmt, ms){
  var from = node.__jv == null ? 0 : node.__jv; node.__jv = to;
  if(reduce || !isFinite(to) || from === to){ node.textContent = fmt(to); return; }
  var t0 = performance.now(), d = ms || 700;
  (function tick(t){ var p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 3); node.textContent = fmt(from + (to - from) * e); if(p < 1) requestAnimationFrame(tick); })(t0);
}

window.SharpJar = { draw: draw, count: count };
})();
