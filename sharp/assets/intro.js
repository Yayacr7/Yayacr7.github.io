/* The intro (owner asked 2026-11-26: "make that the main intro every time someone enters the app"): the 40-second tour of
   the real app plays full screen once per visit (a visit = one browser session) on the front door (home and the demo page).
   "Skip intro" shows from the first second; when the tour ends it goes straight into the app. Silent (the video has no sound).
   With "reduce motion" it waits on its picture for a tap on Play. Not shown to search bots or test browsers, and it gets out
   of the way if the video can't load (offline). Nothing here is sent anywhere. */
(function(){
"use strict";
try{
  if(window.SharpLeaving || sessionStorage.getItem('sharp-intro') === '1') return;
  if(/bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(navigator.userAgent) || navigator.webdriver) return;
}catch(e){ return; }
var me = document.currentScript && document.currentScript.src;
var base = me ? me.replace(/assets\/intro\.js(\?.*)?$/, '') : '/';
var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

function start(){
  try{ sessionStorage.setItem('sharp-intro', '1'); }catch(e){}
  var css = document.createElement('style');
  css.textContent =
    '.sp-intro{position:fixed;inset:0;z-index:2147482000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:16px;' +
      'background:radial-gradient(60% 50% at 20% 10%,rgba(34,211,238,.18),transparent 70%),radial-gradient(50% 45% at 85% 90%,rgba(59,130,246,.2),transparent 70%),#070b18;' +
      'color:#f2f3f9;opacity:0;transition:opacity .35s ease}' +
    '.sp-intro.on{opacity:1}.sp-intro.off{opacity:0}' +
    '.sp-in-top{position:absolute;top:max(14px,env(safe-area-inset-top));left:16px;right:16px;display:flex;align-items:center;gap:12px}' +
    '.sp-in-brand{display:flex;align-items:center;gap:8px;font:800 1.15rem "Bricolage Grotesque",system-ui,sans-serif}.sp-in-brand img{width:30px;height:30px;border-radius:8px}' +
    '.sp-in-tag{padding:4px 10px;border-radius:999px;border:1px solid rgba(34,211,238,.55);color:#a5f3fc;font:800 .78rem Karla,system-ui,sans-serif}' +
    '.sp-in-skip{margin-left:auto;min-height:44px;padding:10px 18px;border:0;border-radius:999px;cursor:pointer;font:800 1rem Karla,system-ui,sans-serif;color:#03222b;' +
      'background:linear-gradient(135deg,#5ee9fb,#22d3ee 45%,#06b6d4);box-shadow:0 10px 26px -12px rgba(34,211,238,.8)}' +
    '.sp-in-skip:focus-visible,.sp-in-play:focus-visible{outline:3px solid #fff;outline-offset:3px}' +
    '.sp-in-box{position:relative;width:min(1100px,calc(100vw - 32px),calc((100vh - 170px) * 16 / 9));aspect-ratio:16/9;border-radius:16px;overflow:hidden;' +
      'border:1px solid rgba(34,211,238,.45);box-shadow:0 0 90px -24px rgba(34,211,238,.7);background:#000}' +
    '.sp-in-box video{display:block;width:100%;height:100%;object-fit:cover}' +
    '.sp-in-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);min-height:52px;padding:12px 22px;border-radius:999px;border:1px solid rgba(255,255,255,.4);' +
      'background:rgba(7,11,24,.8);color:#fff;font:800 1.05rem Karla,system-ui,sans-serif;cursor:pointer}' +
    '.sp-in-bar{width:min(1100px,calc(100vw - 32px),calc((100vh - 170px) * 16 / 9));height:4px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}' +
    '.sp-in-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#22d3ee,#ffd43b)}' +
    '.sp-in-note{margin:0;color:#a4aac4;font:600 .88rem Karla,system-ui,sans-serif;text-align:center}' +
    '@media (max-width:480px){.sp-in-tag{display:none}.sp-in-skip{padding:10px 14px}}' +
    '@media (prefers-reduced-motion:reduce){.sp-intro{transition:none}}';
  document.head.appendChild(css);

  var box = document.createElement('div'); box.className = 'sp-intro';
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Sharp in 40 seconds: a tour of the app');
  var top = document.createElement('div'); top.className = 'sp-in-top'; box.appendChild(top);
  var brand = document.createElement('span'); brand.className = 'sp-in-brand';
  var logo = document.createElement('img'); logo.src = base + 'icon.svg'; logo.alt = ''; brand.appendChild(logo); brand.appendChild(document.createTextNode('Sharp')); top.appendChild(brand);
  var tag = document.createElement('span'); tag.className = 'sp-in-tag'; tag.textContent = 'Free · no sign-up'; top.appendChild(tag);
  var skip = document.createElement('button'); skip.type = 'button'; skip.className = 'sp-in-skip'; skip.textContent = 'Skip intro →'; top.appendChild(skip);
  var frame = document.createElement('div'); frame.className = 'sp-in-box'; box.appendChild(frame);
  var v = document.createElement('video');
  v.muted = true; v.setAttribute('muted', ''); v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
  v.poster = base + 'demo/sharp-demo.jpg'; v.src = base + 'demo/sharp-demo.mp4';
  v.setAttribute('aria-label', 'A 40-second tour of the real app: what you could keep, Cherry\'s plan, asking Cherry, your first $100, making the sale, Scam check and Is it worth it?');
  frame.appendChild(v);
  var play = document.createElement('button'); play.type = 'button'; play.className = 'sp-in-play'; play.textContent = '▶ Play the tour'; play.hidden = true; frame.appendChild(play);
  var bar = document.createElement('div'); bar.className = 'sp-in-bar'; bar.setAttribute('aria-hidden', 'true'); var fill = document.createElement('i'); bar.appendChild(fill); box.appendChild(bar);
  var note = document.createElement('p'); note.className = 'sp-in-note'; note.textContent = 'A 40-second tour of the real app. No sound. The numbers are examples, not promises.'; box.appendChild(note);

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
      var f = [skip].concat(play.hidden ? [] : [play]), i = f.indexOf(document.activeElement);
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
}
if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
