/* The intro (owner asked 2026-11-26: "make that the main intro every time someone enters the app", then: "give the person the
   option... every time, sometimes, or never"): the 40-second tour of the real app plays full screen on the front door (home and
   the demo page). Each person picks how often, saved on this device (localStorage `sharp-intro-pref`):
     always    = once every visit (a visit = one browser session; the default)
     sometimes = about once a week (`sharp-intro-last` = when it last showed)
     never     = not again (they can turn it back on at the bottom of any page with a footer; see shell.js)
   "Skip intro" shows from the first second; when the tour ends it goes into the app. Silent. If the device won't autoplay
   (iPhone/iPad Low Power Mode, or "reduce motion"), it waits on the opener picture with a big Play button. Not shown to bots or
   test browsers, and it gets out of the way if the video can't load. Nothing here is sent anywhere. */
(function(){
"use strict";
var PREF = 'sharp-intro-pref', LAST = 'sharp-intro-last', WEEK = 7 * 864e5;
function pref(){ try{ var p = localStorage.getItem(PREF); return p === 'sometimes' || p === 'never' ? p : 'always'; }catch(e){ return 'always'; } }
try{
  if(window.SharpLeaving || sessionStorage.getItem('sharp-intro') === '1') return;
  if(/bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(navigator.userAgent) || navigator.webdriver) return;
  var p0 = pref();
  if(p0 === 'never') return;
  if(p0 === 'sometimes' && Date.now() - (parseInt(localStorage.getItem(LAST), 10) || 0) < WEEK) return;
}catch(e){ return; }
var me = document.currentScript && document.currentScript.src;
var base = me ? me.replace(/assets\/intro\.js(\?.*)?$/, '') : '/';
var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function el(tag, cls, text, parent){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; if(parent) parent.appendChild(e); return e; }

function start(){
  try{ sessionStorage.setItem('sharp-intro', '1'); localStorage.setItem(LAST, String(Date.now())); }catch(e){}
  // Room for the top bar (76px) and the bar, choice and note under the video (about 150px); svh = the visible height on phones.
  var W = 'min(1100px,calc(100vw - 32px),calc((100vh - 240px) * 16 / 9))', WS = 'min(1100px,calc(100vw - 32px),calc((100svh - 240px) * 16 / 9))';
  var css = el('style');
  css.textContent =
    '.sp-intro{position:fixed;inset:0;z-index:2147482000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;' +
      'padding:76px 16px 16px;overflow:auto;background:radial-gradient(60% 50% at 20% 10%,rgba(34,211,238,.18),transparent 70%),' +
      'radial-gradient(50% 45% at 85% 90%,rgba(59,130,246,.2),transparent 70%),#070b18;color:#f2f3f9;opacity:0;transition:opacity .35s ease}' +
    '.sp-intro.on{opacity:1}.sp-intro.off{opacity:0}' +
    '.sp-in-top{position:absolute;top:max(14px,env(safe-area-inset-top));left:16px;right:16px;display:flex;align-items:center;gap:12px}' +
    '.sp-in-brand{display:flex;align-items:center;gap:8px;font:800 1.15rem "Bricolage Grotesque",system-ui,sans-serif}.sp-in-brand img{width:30px;height:30px;border-radius:8px}' +
    '.sp-in-tag{padding:4px 10px;border-radius:999px;border:1px solid rgba(34,211,238,.55);color:#a5f3fc;font:800 .78rem Karla,system-ui,sans-serif}' +
    '.sp-in-skip{margin-left:auto;min-height:44px;padding:10px 18px;border:0;border-radius:999px;cursor:pointer;font:800 1rem Karla,system-ui,sans-serif;color:#03222b;' +
      'background:linear-gradient(135deg,#5ee9fb,#22d3ee 45%,#06b6d4);box-shadow:0 10px 26px -12px rgba(34,211,238,.8)}' +
    '.sp-intro button:focus-visible{outline:3px solid #fff;outline-offset:3px}' +
    '.sp-in-box,.sp-in-bar{flex:none;width:' + W + '}@supports (height:100svh){.sp-in-box,.sp-in-bar{width:' + WS + '}}' +
    '.sp-in-box{position:relative;aspect-ratio:16/9;border-radius:16px;overflow:hidden;border:1px solid rgba(34,211,238,.45);box-shadow:0 0 90px -24px rgba(34,211,238,.7);background:#000}' +
    '.sp-in-box video{display:block;width:100%;height:100%;object-fit:cover}' +
    '.sp-in-play{position:absolute;left:50%;bottom:9%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;min-height:56px;padding:12px 24px;border:0;border-radius:999px;' +
      'cursor:pointer;color:#03222b;font:800 1.1rem Karla,system-ui,sans-serif;white-space:nowrap;background:linear-gradient(135deg,#5ee9fb,#22d3ee 45%,#06b6d4);box-shadow:0 0 50px -6px rgba(34,211,238,.9)}' +
    '.sp-in-bar{height:4px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}.sp-in-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#22d3ee,#ffd43b)}' +
    '.sp-in-pref{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;color:#cfd6ea;font:700 .92rem Karla,system-ui,sans-serif}' +
    '.sp-in-pref button{min-height:40px;padding:6px 14px;border-radius:999px;border:1.5px solid #283050;background:transparent;color:#f2f3f9;font:700 .9rem Karla,system-ui,sans-serif;cursor:pointer}' +
    '.sp-in-pref button[aria-pressed=true]{border-color:#22d3ee;background:rgba(34,211,238,.14);color:#ecfeff}' +
    '.sp-in-note{margin:0;min-height:1.3em;color:#a4aac4;font:600 .86rem Karla,system-ui,sans-serif;text-align:center}' +
    '@media (max-width:480px){.sp-in-tag{display:none}.sp-in-skip{padding:10px 14px}.sp-in-pref>span{width:100%;text-align:center}.sp-in-play{min-height:44px;padding:8px 16px;font-size:.95rem;bottom:6%}}' +
    '@media (prefers-reduced-motion:reduce){.sp-intro{transition:none}}';
  document.head.appendChild(css);

  var box = el('div', 'sp-intro');
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Sharp in 40 seconds: a tour of the app');
  var top = el('div', 'sp-in-top', null, box), brand = el('span', 'sp-in-brand', null, top), logo = el('img', null, null, brand);
  logo.src = base + 'icon.svg'; logo.alt = ''; brand.appendChild(document.createTextNode('Sharp'));
  el('span', 'sp-in-tag', 'Free · no sign-up', top);
  var skip = el('button', 'sp-in-skip', 'Skip intro →', top); skip.type = 'button';
  var frame = el('div', 'sp-in-box', null, box), v = el('video', null, null, frame);
  v.muted = true; v.setAttribute('muted', ''); v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
  v.poster = base + 'demo/sharp-demo.jpg'; v.src = base + 'demo/sharp-demo.mp4';
  v.setAttribute('aria-label', 'A 40-second tour of the real app: what you could keep, Cherry\'s plan, asking Cherry, your first $100, making the sale, Scam check and Is it worth it?');
  var play = el('button', 'sp-in-play', null, frame); play.type = 'button'; play.hidden = true;
  el('span', null, '▶', play).setAttribute('aria-hidden', 'true'); play.appendChild(document.createTextNode('Play the 40-second tour'));
  var bar = el('div', 'sp-in-bar', null, box); bar.setAttribute('aria-hidden', 'true'); var fill = el('i', null, null, bar);
  // How often: every visit, sometimes (about once a week) or never. Saved on this device only.
  var row = el('div', 'sp-in-pref', null, box); row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'How often to show this intro');
  el('span', null, 'Show this intro:', row);
  var note = el('p', 'sp-in-note', 'A 40-second tour of the real app. No sound. The numbers are examples, not promises.', box);
  note.setAttribute('role', 'status');
  var SAID = { always: 'Saved: you\'ll see it every visit.', sometimes: 'Saved: you\'ll see it about once a week.', never: 'Saved: you won\'t see it again. Turn it back on at the bottom of the demo or any Tools page.' };
  var opts = [['always', 'Every visit'], ['sometimes', 'Sometimes'], ['never', 'Never']].map(function(o){
    var b = el('button', null, o[1], row); b.type = 'button'; b.setAttribute('data-pref', o[0]);
    b.addEventListener('click', function(){
      try{ localStorage.setItem(PREF, o[0]); }catch(e){}
      opts.forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      note.textContent = SAID[o[0]];
    });
    return b;
  });
  opts.forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-pref') === pref() ? 'true' : 'false'); });

  var html = document.documentElement, overflow = html.style.overflow, done = false;
  function close(){
    if(done) return; done = true;
    v.pause(); box.classList.add('off'); html.style.overflow = overflow;
    document.removeEventListener('keydown', key, true);
    setTimeout(function(){ box.remove(); css.remove(); }, still ? 0 : 360);
    var h = document.querySelector('main h1, #app h1, h1'); if(h){ if(!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1'); try{ h.focus({ preventScroll: true }); }catch(e){} }
  }
  function key(e){
    if(e.key === 'Escape'){ e.preventDefault(); close(); }
    else if(e.key === 'Tab'){   // keep the keyboard inside the intro while it's open
      var f = [skip].concat(play.hidden ? [] : [play], opts), i = f.indexOf(document.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
    }
  }
  function go(){ play.hidden = true; var p = v.play(); if(p && p.catch) p.catch(function(){ play.hidden = false; }); }
  skip.addEventListener('click', close);
  play.addEventListener('click', go);
  v.addEventListener('timeupdate', function(){ if(v.duration) fill.style.width = (v.currentTime / v.duration * 100) + '%'; });
  v.addEventListener('ended', function(){ fill.style.width = '100%'; skip.textContent = 'Go to the app →'; setTimeout(close, 700); });
  v.addEventListener('error', close);   // offline or missing video: never block the app
  document.addEventListener('keydown', key, true);

  html.style.overflow = 'hidden';
  document.body.appendChild(box);
  requestAnimationFrame(function(){ box.classList.add('on'); });
  skip.focus();
  if(still) play.hidden = false; else go();
  setTimeout(function(){ if(!done && v.paused) play.hidden = false; }, 2500);   // still not playing: offer the button
}
if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
