/* Runs on every page.
   1) Shows the AI helpers (anything marked data-ai) only when the server says they're switched on.
   2) Adds the Ask Cherry agent button (assets/agent.js) to the page once the AI is on.
   3) Adds the Cherry voice button (assets/voice.js; it stays hidden until a Vapi public key is set in config.js).
   4) Home: when Cherry remembers you (saved on this device only), a small line under "Hi, I'm Cherry." says your name and progress.
   5) Registers the service worker (sw.js), so Sharp can be added to the home screen and works offline. */
(function(){
"use strict";
var root = document.documentElement;
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
if(known === '1'){ root.classList.add('ai-on'); ready(agent); }
if(window.fetch) fetch(base + 'api/status', { credentials: 'same-origin' })
  .then(function(r){ return r.ok ? r.json() : { ai: false }; })
  .catch(function(){ return { ai: false }; })
  .then(function(s){ var on = !!(s && s.ai); root.classList.toggle('ai-on', on); try{ sessionStorage.setItem('sharp-ai', on ? '1' : '0'); }catch(e){} if(on) ready(agent); });
ready(function(){ var v = document.createElement('script'); v.src = base + 'assets/voice.js'; v.defer = true; document.body.appendChild(v); });
if('serviceWorker' in navigator && window.isSecureContext){
  window.addEventListener('load', function(){ navigator.serviceWorker.register(base + 'sw.js').catch(function(){}); });
}
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
