/* Runs on every page.
   1) Shows the AI helpers (anything marked data-ai) only when the server says they're switched on.
   2) Registers the service worker (sw.js), so Sharp can be added to the home screen and works offline. */
(function(){
"use strict";
var root = document.documentElement;
var me = document.currentScript && document.currentScript.src;
var base = me ? me.replace(/assets\/shell\.js(\?.*)?$/, '') : '/';
// Remember the answer for this visit so the AI parts don't flicker on every page.
var known = null; try{ known = sessionStorage.getItem('sharp-ai'); }catch(e){}
if(known === '1') root.classList.add('ai-on');
if(window.fetch) fetch(base + 'api/status', { credentials: 'same-origin' })
  .then(function(r){ return r.ok ? r.json() : { ai: false }; })
  .catch(function(){ return { ai: false }; })
  .then(function(s){ var on = !!(s && s.ai); root.classList.toggle('ai-on', on); try{ sessionStorage.setItem('sharp-ai', on ? '1' : '0'); }catch(e){} });
if('serviceWorker' in navigator && window.isSecureContext){
  window.addEventListener('load', function(){ navigator.serviceWorker.register(base + 'sw.js').catch(function(){}); });
}
})();
