/* Type to Cherry, without the AI: while the AI is switched off, Cherry answers typed questions by searching Sharp's own
   free lessons and tools on this device (assets/cherry-index.json, built by dev/build_ask_index.py). Questions never leave
   the device in this mode. When the AI is on, voice.js opens the full AI chat (assets/agent.js) instead.
   Visitor text: textContent only. */
(function(){
"use strict";
var me = document.currentScript && document.currentScript.src;
var base = me ? me.replace(/assets\/cherry-offline\.js(\?.*)?$/, '') : '/';
var DOCS = null, panel, list, input;
var STOP = ('a an and are as at be but by can do does for from get got have how i if in is it its me my of on or so that the this to ' +
  'up was what when where which who why will with would you your yours we our should could much many more most any some about into ' +
  'than then them they there their just also very really want need make way best good help tell know start').split(' ').reduce(function(o, w){ o[w] = 1; return o; }, {});
var SUGGEST = ['How do I save money?', 'How should I price my work?', 'How do I get my first customer?', 'What is compound interest?'];
function el(tag, cls, text, parent){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; if(parent) parent.appendChild(e); return e; }
function stem(w){ return w.length > 3 ? w.replace(/(ings|ing|ed|es|s|e)$/, '') : w; }
function words(t){ return (t.toLowerCase().match(/[a-z0-9$%]+/g) || []).filter(function(w){ return !STOP[w] && w.length > 1; }).map(stem); }

var DF = null;
function prep(){
  DF = {};
  DOCS.forEach(function(d){
    d._t = words(d.text); d._h = words(d.title); var seen = {};
    d._t.concat(d._h).forEach(function(w){ if(!seen[w]){ seen[w] = 1; DF[w] = (DF[w] || 0) + 1; } });
  });
}
// Common questions that the best answer is a tool, not a lesson.
var SHORT = [
  [/\b(start|starting|first)\b.*\b(business|money|\$?100|customer|job)|\b(mow|lawn|dog|babysit|tutor|car wash|bake|sell)/i, '/tools/first100/',
   'First $100 Plan', 'Pick a starter business, your free hours and a goal. Cherry works out your price, how many jobs and how many weeks, plus the message to send.'],
  [/\b(price|prices|pricing|charge|how much should i)\b/i, '/learn/#business', 'Lesson 4: How a business makes money: Pricing',
   'Value-based: price based on the value to the customer. Harder, usually more profitable. Most small businesses underprice.'],
  [/\b(budget|save|saving|savings|spend|spending)\b/i, '/tools/budget/', 'Budget & savings planner', 'Put in what comes in and what goes out. See where your money goes and how much you can save each month.']
];
function search(q){
  var qs = words(q); if(!qs.length) return [];
  var out = [];
  SHORT.forEach(function(x){ if(x[0].test(q)) out.push({ d: { url: x[1], title: x[2], text: x[3] }, s: 9 }); });
  var plans = /\b(sharp|plan|plans|pric(e|es|ing) of sharp|subscription|learner|builder|founder)\b/i.test(q) && !/\bmy\b/i.test(q);
  if(!DF) prep();
  // Rare words count more (a lesson that mentions "price" beats one that only says "work").
  var idf = qs.map(function(w){ return Math.log(1 + DOCS.length / (1 + (DF[w] || 0))); }), top = idf.reduce(function(a, b){ return a + b; }, 0);
  var ranked = DOCS.map(function(d){
    var s = 0;
    qs.forEach(function(w, k){
      var n = 0; for(var i = 0; i < d._t.length; i++) if(d._t[i] === w) n++;
      if(d._h.indexOf(w) >= 0) s += idf[k] * 2;
      if(n) s += idf[k] * (1 + Math.min(n, 4) * .25);
    });
    if(d.url === '/pricing/' && !plans) s = 0;
    return { d: d, s: s / top };
  }).filter(function(r){ return r.s >= .9; }).sort(function(a, b){ return b.s - a.s; });
  return out.concat(ranked).filter(function(r, i, all){ for(var j = 0; j < i; j++) if(all[j].d.url === r.d.url) return false; return true; }).slice(0, 3);
}
function snippet(text, q){
  var qs = words(q), parts = text.replace(/^>\s*/, '').split(/(?<=[.!?])\s+/), best = parts[0], bs = -1;
  parts.forEach(function(p){ var w = words(p), s = 0; qs.forEach(function(x){ if(w.indexOf(x) >= 0) s++; }); if(s > bs){ bs = s; best = p; } });
  return best.length > 220 ? best.slice(0, 217) + '…' : best;
}
function say(text, who){ var m = el('div', 'co-msg ' + who, null, list); el('p', null, text, m); list.scrollTop = list.scrollHeight; return m; }
function answer(q){
  var chips = panel.querySelector('.co-chips'); if(chips) chips.hidden = true;   // room for the answers
  say(q, 'me');
  if(!DOCS){ say('One second, I\'m opening the lessons…', 'ch'); return; }
  var hits = search(q), m = el('div', 'co-msg ch', null, list);
  if(!hits.length){
    el('p', null, 'I couldn\'t find that in Sharp\'s lessons yet. Try asking about saving, pricing, your first customer, marketing, negotiating or investors. Or call me and ask out loud.', m);
  } else {
    el('p', null, hits.length === 1 ? 'Here\'s what Sharp says:' : 'Here\'s what I found in Sharp:', m);
    hits.forEach(function(h){
      var c = el('a', 'co-hit', null, m); c.href = base + h.d.url.replace(/^\//, '');
      el('b', null, h.d.title, c); el('span', null, snippet(h.d.text, q), c);
    });
  }
  list.scrollTop = list.scrollHeight;
}
function build(){
  panel = el('section', 'co-panel', null, document.body); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'co-title'); panel.hidden = true;
  var top = el('div', 'co-top', null, panel);
  el('span', 'ch-face co-face', null, top).setAttribute('aria-hidden', 'true');
  var tt = el('div', null, null, top); el('p', 'co-title', 'Cherry', tt).id = 'co-title'; el('p', 'co-sub', 'Answers from Sharp\'s lessons. Your questions stay on this device.', tt);
  var x = el('button', 'co-x', '✕', top); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.addEventListener('click', close);
  list = el('div', 'co-list', null, panel); list.setAttribute('aria-live', 'polite');
  say('Hi, I\'m Cherry. Ask me about money or starting a business, and I\'ll find the answer in Sharp.', 'ch');
  var chips = el('div', 'co-chips', null, panel);
  SUGGEST.forEach(function(s){ var b = el('button', 'co-chip', s, chips); b.type = 'button'; b.addEventListener('click', function(){ answer(s); }); });
  var f = el('form', 'co-form', null, panel);
  input = el('input', null, null, f); input.type = 'text'; input.maxLength = 200; input.placeholder = 'Ask Cherry…'; input.setAttribute('aria-label', 'Ask Cherry a question');
  var go = el('button', null, 'Ask', f); go.type = 'submit';
  f.addEventListener('submit', function(e){ e.preventDefault(); var q = input.value.trim(); if(!q) return; input.value = ''; answer(q); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && !panel.hidden) close(); });
  fetch(base + 'assets/cherry-index.json').then(function(r){ return r.json(); }).then(function(d){ DOCS = d; }).catch(function(){
    say('I couldn\'t open the lessons just now. Check your connection, or call me instead.', 'ch');
  });
}
function open(){ if(!panel) build(); panel.hidden = false; input.focus(); }
function close(){ panel.hidden = true; var b = document.querySelector('.vo-head, .vo-launch'); if(b) b.focus(); }
window.SharpCherryOffline = { open: open, ask: function(q){ open(); answer(q); } };
})();
