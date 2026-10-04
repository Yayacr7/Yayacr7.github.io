/* Sharp game layer: XP, levels, streaks, badges, toasts and confetti.
   Progress lives in this browser only (localStorage), wrapped so the site
   still works when storage is blocked. All text is set with textContent. */
(function(){
"use strict";
var KEY = 'sharp-game';
var LEVELS = [[0, 'Rookie'], [100, 'Apprentice'], [250, 'Builder'], [450, 'Dealmaker'], [700, 'Operator'], [1000, 'Sharp']];
var TOPICS = {
  finance: ['money', 'investing', 'funding'],
  business: ['business', 'statements'],
  marketing: ['mkt-basics', 'mkt-channels', 'mkt-measure'],
  negotiation: ['negotiation', 'scripts', 'persuasion'],
  investors: ['pitching', 'pressure']
};
var TOPIC_NAMES = { finance: 'Finance', business: 'Business', marketing: 'Marketing', negotiation: 'Negotiation', investors: 'Investors' };
var BADGES = {
  'first-lesson':      ['First steps', 'Passed your first lesson'],
  'perfect':           ['Perfect score', 'Got every question right in a quiz'],
  'topic-finance':     ['Money mind', 'Finished every Finance lesson'],
  'topic-business':    ['Business brain', 'Finished every Business lesson'],
  'topic-marketing':   ['Crowd puller', 'Finished every Marketing lesson'],
  'topic-negotiation': ['Deal maker', 'Finished every Negotiation lesson'],
  'topic-investors':   ['Pitch ready', 'Finished every Investors lesson'],
  'streak-3':          ['On a roll', 'Learned 3 days in a row'],
  'toolbox':           ['Toolbox', 'Tried 5 different tools'],
  'pressure-proof':    ['Pressure-proof', 'Nailed 10 investor questions'],
  'all-lessons':       ['Sharp', 'Passed all 13 lessons']
};
var ALL = [].concat.apply([], Object.keys(TOPICS).map(function(k){ return TOPICS[k]; }));

function blank(){ return { xp: 0, lessons: {}, answers: {}, badges: {}, tools: {}, drill: 0, streak: { day: '', count: 0 } }; }
function load(){
  var s = blank();
  try{ var raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if(raw && typeof raw === 'object') for(var k in s) if(raw[k] != null) s[k] = raw[k]; }catch(e){}
  // carry over lessons passed before the game layer existed
  try{
    var old = JSON.parse(localStorage.getItem('mds-progress') || '{}');
    Object.keys(old).forEach(function(id){ if(old[id] && old[id].passed && s.lessons[id] == null && ALL.indexOf(id) >= 0){ s.lessons[id] = old[id].best || 80; s.xp += 50; } });
  }catch(e){}
  return s;
}
var S = load();
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }

function levelInfo(xp){
  var i = 0; while(i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
  var floor = LEVELS[i][0], next = LEVELS[i + 1] ? LEVELS[i + 1][0] : null;
  return { index: i + 1, name: LEVELS[i][1], xp: xp, floor: floor, next: next, pct: next ? Math.round((xp - floor) / (next - floor) * 100) : 100, nextName: LEVELS[i + 1] ? LEVELS[i + 1][1] : null };
}
function day(offset){ var d = new Date(); d.setDate(d.getDate() + (offset || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function touchStreak(){
  var t = day(0); if(S.streak.day === t) return;
  S.streak.count = S.streak.day === day(-1) ? S.streak.count + 1 : 1; S.streak.day = t;
  if(S.streak.count >= 3) badge('streak-3');
}
function streakNow(){ return (S.streak.day === day(0) || S.streak.day === day(-1)) ? S.streak.count : 0; }

/* ---------- UI: toasts, confetti, badge popup, HUD ---------- */
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var toastBox = null, xpToast = null, xpSum = 0, xpTimer = null;
function box(){ if(!toastBox){ toastBox = document.createElement('div'); toastBox.className = 'g-toasts'; toastBox.setAttribute('aria-live', 'polite'); document.body.appendChild(toastBox); } return toastBox; }
function makeToast(big, small){
  var t = document.createElement('div'); t.className = 'g-toast';
  var b = document.createElement('b'); b.textContent = big; t.appendChild(b);
  var s = document.createElement('span'); s.textContent = small || ''; t.appendChild(s);
  box().appendChild(t); return t;
}
function dismiss(t, ms){ return setTimeout(function(){ t.classList.add('out'); setTimeout(function(){ t.remove(); }, 400); }, ms); }
function toast(big, small){ dismiss(makeToast(big, small), 2400); }
// XP gains within a couple of seconds merge into one counter instead of stacking
function xpToastAdd(n, why){
  if(xpToast && xpToast.isConnected && !xpToast.classList.contains('out')){
    xpSum += n; clearTimeout(xpTimer);
    xpToast.firstChild.textContent = '+' + xpSum + ' XP'; xpToast.lastChild.textContent = why;
    xpToast.classList.remove('bump'); void xpToast.offsetWidth; xpToast.classList.add('bump');
  } else { xpSum = n; xpToast = makeToast('+' + n + ' XP', why); }
  xpTimer = dismiss(xpToast, 2400);
}
function confetti(){
  if(reduce) return;
  var c = document.createElement('canvas'); c.className = 'g-confetti'; document.body.appendChild(c);
  var dpr = window.devicePixelRatio || 1, W = innerWidth, H = innerHeight; c.width = W * dpr; c.height = H * dpr;
  var ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  var cs = getComputedStyle(document.documentElement);
  var cols = ['--finance', '--business', '--marketing', '--negotiation', '--investors', '--accent', '--note'].map(function(v){ return cs.getPropertyValue(v).trim(); }).filter(Boolean);
  var P = []; for(var i = 0; i < 140; i++) P.push({ x: W / 2 + (Math.random() - .5) * 120, y: H * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 4, r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - .5) * .3, c: cols[i % cols.length] });
  var start = performance.now();
  (function frame(now){
    var t = now - start; ctx.clearRect(0, 0, W, H);
    P.forEach(function(p){ p.vy += .38; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = Math.max(0, 1 - t / 2200); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
    if(t < 2200) requestAnimationFrame(frame); else c.remove();
  })(start);
}
var queue = [], showing = false;
function badge(id){
  if(!BADGES[id] || S.badges[id]) return;
  S.badges[id] = day(0); queue.push(id); save(); render(); if(!showing) nextBadge();
}
function nextBadge(){
  var id = queue.shift(); if(!id){ showing = false; return; } showing = true;
  var o = document.createElement('div'); o.className = 'g-modal'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Badge unlocked');
  var card = document.createElement('div'); card.className = 'g-modal-card';
  card.appendChild(medal(id, true));
  var k = document.createElement('p'); k.className = 'g-kicker'; k.textContent = 'Badge unlocked'; card.appendChild(k);
  var h = document.createElement('h2'); h.textContent = BADGES[id][0]; card.appendChild(h);
  var p = document.createElement('p'); p.textContent = BADGES[id][1]; card.appendChild(p);
  var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'g-btn'; btn.textContent = 'Nice'; card.appendChild(btn);
  o.appendChild(card); document.body.appendChild(o); btn.focus();
  function close(){ o.remove(); document.removeEventListener('keydown', esc); setTimeout(nextBadge, 150); }
  function esc(e){ if(e.key === 'Escape') close(); }
  btn.addEventListener('click', close); o.addEventListener('click', function(e){ if(e.target === o) close(); }); document.addEventListener('keydown', esc);
  confetti();
}
var ICON = {
  finance: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  business: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  marketing: '<path d="M3 10v4h4l7 5V5l-7 5H3z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
  negotiation: '<path d="M3 5h11v8H8l-3 3v-3H3z"/><path d="M14 9h7v8h-2v3l-3-3h-5v-2"/>',
  investors: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  flame: '<path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.6.7-2.8 1.6-3.7.2 1.4 1 2.2 1.9 2.2 0-2.6-.5-4.7.5-7z"/>',
  tool: '<path d="M14 6a4 4 0 0 0 5 5l-8 8a2 2 0 0 1-3-3l8-8a4 4 0 0 1-2-2z"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>'
};
function svg(name, size){
  var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size || 24); s.setAttribute('height', size || 24); s.setAttribute('aria-hidden', 'true');
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.innerHTML = ICON[name] || ICON.star; // fixed icon markup only
  return s;
}
function badgeIcon(id){ return id.indexOf('topic-') === 0 ? id.slice(6) : id === 'streak-3' ? 'flame' : id === 'toolbox' ? 'tool' : id === 'pressure-proof' ? 'bolt' : 'star'; }
function badgeTopic(id){ return id.indexOf('topic-') === 0 ? id.slice(6) : id === 'pressure-proof' ? 'investors' : id === 'toolbox' ? 'business' : id === 'streak-3' ? 'marketing' : id === 'perfect' ? 'finance' : 'negotiation'; }
function medal(id, big){
  var m = document.createElement('span'); m.className = 'g-medal t-' + badgeTopic(id) + (big ? ' big' : '') + (S.badges[id] ? ' earned' : '');
  m.appendChild(svg(badgeIcon(id), big ? 40 : 24)); return m;
}

function render(){
  var L = levelInfo(S.xp), st = streakNow();
  document.querySelectorAll('[data-g="level"]').forEach(function(e){ e.textContent = L.name; });
  document.querySelectorAll('[data-g="levelnum"]').forEach(function(e){ e.textContent = L.index; });
  document.querySelectorAll('[data-g="xp"]').forEach(function(e){ e.textContent = S.xp.toLocaleString() + ' XP'; });
  document.querySelectorAll('[data-g="tonext"]').forEach(function(e){ e.textContent = L.next ? (L.next - S.xp) + ' XP to ' + L.nextName : 'Top level reached'; });
  document.querySelectorAll('[data-g="bar"]').forEach(function(e){ e.style.width = L.pct + '%'; });
  document.querySelectorAll('[data-g="streak"]').forEach(function(e){ e.textContent = st; });
  document.querySelectorAll('[data-g="passed"]').forEach(function(e){ e.textContent = Object.keys(S.lessons).length; });
  document.querySelectorAll('[data-g="badges"]').forEach(function(e){
    e.textContent = '';
    Object.keys(BADGES).forEach(function(id){
      var b = document.createElement('div'); b.className = 'g-badge' + (S.badges[id] ? ' earned' : '');
      b.appendChild(medal(id));
      var n = document.createElement('b'); n.textContent = BADGES[id][0]; b.appendChild(n);
      var d = document.createElement('span'); d.textContent = S.badges[id] ? BADGES[id][1] : 'Locked: ' + BADGES[id][1].toLowerCase(); b.appendChild(d);
      e.appendChild(b);
    });
  });
  listeners.forEach(function(fn){ try{ fn(S); }catch(e){} });
}
var listeners = [];

function addXP(n, why){
  var before = levelInfo(S.xp).index;
  S.xp += n; touchStreak(); save();
  xpToastAdd(n, why);
  var after = levelInfo(S.xp);
  if(after.index > before){ setTimeout(function(){ toast('Level up!', 'You\'re now ' + after.name); confetti(); }, 500); }
  render();
}

window.SharpGame = {
  TOPICS: TOPICS, TOPIC_NAMES: TOPIC_NAMES, ALL: ALL, BADGES: BADGES, icon: svg,
  state: function(){ return JSON.parse(JSON.stringify(S)); },
  level: function(){ return levelInfo(S.xp); },
  onChange: function(fn){ listeners.push(fn); },
  correct: function(key){ if(S.answers[key]) return false; S.answers[key] = 1; addXP(10, 'Correct answer'); return true; },
  passLesson: function(id, pct){
    var first = S.lessons[id] == null;
    S.lessons[id] = Math.max(S.lessons[id] || 0, pct); save();
    if(first) addXP(50, 'Lesson passed'); else render();
    confetti();
    if(first) badge('first-lesson');
    if(pct === 100) badge('perfect');
    Object.keys(TOPICS).forEach(function(t){ if(TOPICS[t].every(function(l){ return S.lessons[l] != null; })) badge('topic-' + t); });
    if(ALL.every(function(l){ return S.lessons[l] != null; })) badge('all-lessons');
  },
  tool: function(name){ if(S.tools[name]) return; S.tools[name] = 1; addXP(5, 'New tool tried'); if(Object.keys(S.tools).length >= 5) badge('toolbox'); },
  drill: function(){ S.drill++; addXP(15, 'Strong answer'); if(S.drill >= 10) badge('pressure-proof'); },
  render: render
};
save();
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
