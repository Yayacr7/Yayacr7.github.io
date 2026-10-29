/* Runs on every page.
   1) Shows the AI helpers (anything marked data-ai) only when the server says they're switched on.
   2) Adds the Ask Cherry agent button (assets/agent.js) to the page once the AI is on.
   3) Adds the Cherry voice button (assets/voice.js; it stays hidden until a Vapi public key is set in config.js).
   4) Home: when Cherry remembers you (saved on this device only), a small line under "Hi, I'm Cherry." says your name and progress.
   5) Registers the service worker (sw.js), so Sharp can be added to the home screen and works offline.
   6) Cherry on top: window.SharpPop(element, {n, big, say}) bursts a few little cherries from an element at a real win
      (best reply, quiz passed, money logged, goal hit). Decoration only; one still cherry when less motion is asked for. */
(function(){
"use strict";
var root = document.documentElement;
// A random code for this browser, so daily limits count each device on its own (classmates on one school Wi-Fi each get
// their own). It says nothing about you; the server only ever sees it mixed into a scrambled daily code.
(function(){ var d = ''; try{ d = localStorage.getItem('sharp-device') || '';
  if(!/^[A-Za-z0-9-]{16,64}$/.test(d)){ d = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 40); localStorage.setItem('sharp-device', d); }
}catch(e){} window.SharpDevice = /^[A-Za-z0-9-]{16,64}$/.test(d) ? d : ''; })();
var me = document.currentScript && document.currentScript.src;
var base = me ? me.replace(/assets\/shell\.js(\?.*)?$/, '') : '/';
// Remember the answer for this visit so the AI parts don't flicker on every page.
var known = null; try{ known = sessionStorage.getItem('sharp-ai'); }catch(e){}
var agentAdded = false;
function agent(){
  if(agentAdded || !document.body) return; agentAdded = true;
  var s = document.createElement('script'); s.src = base + 'assets/agent.js'; s.defer = true; document.body.appendChild(s);
}
function ready(fn){ if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
// Where the AI lives: this site's own /api/, or Cherry's brain server (CHERRY_API in config.js) when the site's is off.
// AI pages call window.SharpAPI + 'api/...'.
var brain = null; try{ brain = sessionStorage.getItem('sharp-api'); }catch(e){}
window.SharpAPI = brain || base;
if(known === '1'){ root.classList.add('ai-on'); ready(agent); }
function status(api){
  return fetch(api + 'api/status', { credentials: 'same-origin' })
    .then(function(r){ return r.ok ? r.json() : { ai: false }; })
    .then(function(s){ return !!(s && s.ai); }, function(){ return false; });
}
function config(){
  if(window.NP_CONFIG) return Promise.resolve(window.NP_CONFIG);
  return new Promise(function(ok){ var s = document.createElement('script'); s.src = base + 'config.js'; s.onload = function(){ ok(window.NP_CONFIG || {}); }; s.onerror = function(){ ok({}); }; document.head.appendChild(s); });
}
if(window.fetch) status(base).then(function(on){
  if(on) return base;
  return config().then(function(c){
    var api = c && c.CHERRY_API ? String(c.CHERRY_API).replace(/\/?$/, '/') : '';
    return api && /^https:\/\//.test(api) ? status(api).then(function(ok){ return ok ? api : null; }) : null;
  });
}).then(function(api){
  var on = !!api; if(api) window.SharpAPI = api;
  root.classList.toggle('ai-on', on);
  try{ sessionStorage.setItem('sharp-ai', on ? '1' : '0'); if(api && api !== base) sessionStorage.setItem('sharp-api', api); else sessionStorage.removeItem('sharp-api'); }catch(e){}
  if(on) ready(agent);
});
ready(function(){ var v = document.createElement('script'); v.src = base + 'assets/voice.js'; v.defer = true; document.body.appendChild(v); });
if('serviceWorker' in navigator && window.isSecureContext){
  window.addEventListener('load', function(){ navigator.serviceWorker.register(base + 'sw.js').catch(function(){}); });
}
// Cherry on top.
var popCss = false;
window.SharpPop = function(from, o){
  o = o || {}; if(!document.body) return;
  if(!popCss){
    popCss = true; var css = document.createElement('style');
    css.textContent = '.sp-box{position:fixed;inset:0;pointer-events:none;z-index:2147483000;overflow:hidden}' +
      '.sp-box i{position:absolute;background:url(' + base + 'assets/cherry-pop.svg) center/contain no-repeat;filter:drop-shadow(0 4px 8px rgba(0,0,0,.45));animation:spPop 1s cubic-bezier(.15,.75,.35,1) both}' +
      '@keyframes spPop{0%{transform:translate(-50%,-50%) scale(.3);opacity:0}12%{opacity:1}55%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1) rotate(var(--r));opacity:1}' +
      '100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy) + 80px)) scale(.8) rotate(calc(var(--r) * 1.7));opacity:0}}' +
      '.sp-box b{position:absolute;padding:7px 16px;border-radius:999px;background:#0d2a22;border:1px solid #3ddba5;color:#e9fff6;font:800 1rem/1.2 var(--f-display,system-ui),sans-serif;white-space:nowrap;box-shadow:0 0 34px -6px rgba(61,219,165,.85);animation:spSay 1.8s ease both}' +
      '@keyframes spSay{0%{opacity:0;transform:translate(-50%,-20%) scale(.8)}14%{opacity:1;transform:translate(-50%,-120%) scale(1.04)}24%{transform:translate(-50%,-120%) scale(1)}78%{opacity:1;transform:translate(-50%,-140%)}100%{opacity:0;transform:translate(-50%,-165%)}}' +
      '@keyframes spStill{0%,100%{opacity:0;transform:translate(-50%,-150%)}20%,80%{opacity:1;transform:translate(-50%,-150%)}}' +
      '@media (prefers-reduced-motion:reduce){.sp-box i,.sp-box b{animation:spStill 1.6s ease both}}';
    document.head.appendChild(css);
  }
  var r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  var x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 40);
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var n = still ? (o.say ? 0 : 1) : Math.max(1, Math.min(o.n || 10, 18));
  var box = document.createElement('div'); box.className = 'sp-box'; box.setAttribute('aria-hidden', 'true');
  for(var i = 0; i < n; i++){
    var c = document.createElement('i'), a = -Math.PI / 2 + (Math.random() - .5) * 2.6, d = 55 + Math.random() * (o.big ? 140 : 75), z = 16 + Math.random() * 14;
    c.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + z + 'px;height:' + z + 'px;--dx:' + Math.round(Math.cos(a) * d) + 'px;--dy:' + Math.round(Math.sin(a) * d) +
      'px;--r:' + Math.round((Math.random() - .5) * 150) + 'deg;animation-delay:' + (i * 16) + 'ms';
    box.appendChild(c);
  }
  var t = null;
  if(o.say){ t = document.createElement('b'); t.textContent = o.say; t.style.cssText = 'left:' + x + 'px;top:' + Math.max(70, y) + 'px'; box.appendChild(t); }
  document.body.appendChild(box);
  if(t){ var half = t.offsetWidth / 2 + 12; t.style.left = Math.max(half, Math.min(innerWidth - half, x)) + 'px'; }   // keep the words on screen
  setTimeout(function(){ if(box.parentNode) box.parentNode.removeChild(box); }, o.say ? 1900 : 1300);
};
// Home: tap Cherry's big face and she hops, pops a few cherries and opens.
ready(function(){
  var f = document.querySelector('.hc-cherry .ch-face'); if(!f) return;
  f.addEventListener('click', function(){
    f.classList.remove('hop'); void f.offsetWidth; f.classList.add('hop'); window.SharpPop(f, { n: 8 });
    setTimeout(function(){ if(window.SharpCherry && window.SharpCherry.open) window.SharpCherry.open(); }, 380);
  });
});
// Cherry remembers you: name, business and goal from Cherry's chat ('sharp-cherry-me') and the First $100 Plan ('sharp-first100').
ready(function(){
  var line = document.querySelector('.hc-me'); if(!line) return;
  var m = null, f = null; try{ m = JSON.parse(localStorage.getItem('sharp-cherry-me') || 'null'); f = JSON.parse(localStorage.getItem('sharp-first100') || 'null'); }catch(e){}
  m = m || {}; f = f && typeof f === 'object' ? f : null;
  var name = m.name || (f && f.name ? String(f.name).split(/\s+/)[0].replace(/[^A-Za-z'-]/g, '').slice(0, 20) : '');
  var goal = +m.goal || (f && +f.goal) || 0, got = 0;
  if(f && f.logs) f.logs.forEach(function(l){ got += +l.v || 0; });
  if(!name && !goal) return;
  var usd = function(n){ return '$' + Math.round(n).toLocaleString('en-US'); };
  line.textContent = 'Welcome back' + (name ? ', ' + name : '') + '.' +
    (goal ? (got >= goal ? ' You hit your ' + usd(goal) + ' goal!' : ' ' + usd(got) + ' of your ' + usd(goal) + ' goal.') : '');
  line.hidden = false;
});
})();
