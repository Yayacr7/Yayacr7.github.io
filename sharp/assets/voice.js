/* Danny Dan: Sharp's voice receptionist (a Vapi voice assistant), on every page.
   - Shows a "Speak with Danny Dan" button only when a Vapi PUBLIC key is set in config.js (VOICE.vapiPublicKey).
   - Nothing loads and no microphone is asked for until a visitor taps the button.
   - The Vapi Web SDK is bundled in assets/vendor/vapi.js (built from @vapi-ai/web), loaded on that first tap.
   - Everything shown is set with textContent only. */
(function(){
"use strict";
if(window.__sharpVoice) return; window.__sharpVoice = true;
var me = document.currentScript && document.currentScript.src;
var base = me ? me.replace(/assets\/voice\.js(\?.*)?$/, '') : '/';
var ASSISTANT = 'f67e6090-46d5-4179-93b4-973291ccf128';     // Danny Dan
var vapi = null, state = 'idle', ui = null, timer = 0, started = 0;

function load(src){ return new Promise(function(ok, bad){ var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); }); }
function cfg(){ var c = window.NP_CONFIG && window.NP_CONFIG.VOICE; return c && typeof c.vapiPublicKey === 'string' ? c : null; }
// Pages that don't load config.js get it here, so the key lives in one place.
function getConfig(){ return window.NP_CONFIG ? Promise.resolve(cfg()) : load(base + 'config.js').then(cfg, function(){ return null; }); }

function el(tag, cls, text, parent){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; if(parent) parent.appendChild(e); return e; }

function build(){
  var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = base + 'assets/voice.css'; document.head.appendChild(css);
  var btn = el('button', 'vo-launch', null, document.body); btn.type = 'button';
  el('span', 'vo-dot', null, btn).setAttribute('aria-hidden', 'true');
  el('span', null, 'Speak with Danny Dan', btn);

  var box = el('section', 'vo-panel', null, document.body); box.hidden = true;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-labelledby', 'vo-title');
  var top = el('div', 'vo-top', null, box);
  var face = el('div', 'vo-face', null, top); face.setAttribute('aria-hidden', 'true'); el('span', null, 'DD', face);
  var tt = el('div', null, null, top);
  el('p', 'vo-title', 'Danny Dan', tt).id = 'vo-title';
  var status = el('p', 'vo-status', 'Ready', tt); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  var clock = el('p', 'vo-clock', '0:00', top); clock.setAttribute('aria-hidden', 'true');
  var bars = el('div', 'vo-bars', null, box); bars.setAttribute('aria-hidden', 'true');
  for(var i = 0; i < 24; i++) el('i', null, null, bars);
  var row = el('div', 'vo-row', null, box);
  var mute = el('button', 'vo-btn', 'Mute', row); mute.type = 'button'; mute.setAttribute('aria-pressed', 'false');
  var end = el('button', 'vo-btn end', 'End call', row); end.type = 'button';
  el('p', 'vo-note', 'Your voice goes to Danny Dan (Vapi) only during the call. Don\'t share private details.', box);

  btn.addEventListener('click', function(){ if(state === 'idle') start(); else box.hidden = false; });
  end.addEventListener('click', stop);
  mute.addEventListener('click', function(){
    if(!vapi) return; var m = !vapi.isMuted(); vapi.setMuted(m);
    mute.textContent = m ? 'Unmute' : 'Mute'; mute.setAttribute('aria-pressed', String(m));
  });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && state !== 'idle') stop(); });
  // Any other "Speak with Danny Dan" button on a page (marked data-voice) starts the same call.
  var inPage = [].slice.call(document.querySelectorAll('[data-voice]'));
  inPage.forEach(function(b){ b.hidden = false; b.addEventListener('click', function(e){ e.preventDefault(); if(state === 'idle') start(); }); });
  // While a page's own Danny button is on screen, hide the floating one so there's only one.
  if(inPage.length && 'IntersectionObserver' in window){
    var seen = new Set();
    var io = new IntersectionObserver(function(es){ es.forEach(function(x){ x.isIntersecting ? seen.add(x.target) : seen.delete(x.target); }); btn.classList.toggle('vo-hide', seen.size > 0 && state === 'idle'); });
    inPage.forEach(function(b){ io.observe(b); });
  }
  ui = { btn: btn, box: box, status: status, clock: clock, bars: [].slice.call(bars.children), mute: mute, end: end };
}

function set(s, text){
  state = s; ui.status.textContent = text;
  ui.box.className = 'vo-panel ' + s; ui.btn.classList.toggle('live', s !== 'idle'); if(s !== 'idle') ui.btn.classList.remove('vo-hide');
  ui.end.textContent = s === 'idle' ? 'Close' : 'End call';
  ui.mute.disabled = s !== 'live' && s !== 'talking';
}
function tick(){ var t = Math.floor((Date.now() - started) / 1000); ui.clock.textContent = Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
function level(v){ ui.bars.forEach(function(b, i){ var k = Math.max(.08, Math.min(1, v * 2.2 * (0.6 + 0.4 * Math.sin(i * 1.7 + Date.now() / 140)))); b.style.transform = 'scaleY(' + k.toFixed(2) + ')'; }); }

function start(){
  ui.box.hidden = false; set('connecting', 'Connecting… allow the microphone if asked.');
  ui.mute.textContent = 'Mute'; ui.mute.setAttribute('aria-pressed', 'false');
  getConfig().then(function(c){
    if(!c || !c.vapiPublicKey) throw new Error('nokey');
    return (window.SharpVapi ? Promise.resolve() : load(base + 'assets/vendor/vapi.js')).then(function(){
      if(!vapi){
        vapi = new window.SharpVapi(c.vapiPublicKey, undefined, { avoidEval: true, alwaysIncludeMicInPermissionPrompt: true });
        vapi.on('call-start', function(){ started = Date.now(); clearInterval(timer); timer = setInterval(tick, 500); set('live', 'Listening. Say hi to Danny Dan.'); });
        vapi.on('speech-start', function(){ if(state !== 'idle') set('talking', 'Danny Dan is talking…'); });
        vapi.on('speech-end', function(){ if(state !== 'idle') set('live', 'Listening…'); });
        vapi.on('volume-level', level);
        vapi.on('call-end', function(){ ended('Call ended. Tap "Speak with Danny Dan" to call again.'); });
        vapi.on('error', function(e){ console.warn('voice error', e); ended(message(e)); });
      }
      return vapi.start(c.assistantId || ASSISTANT);
    });
  }).catch(function(e){ ended(message(e)); });
}
function message(e){
  var t = String((e && (e.message || (e.error && e.error.message) || e.errorMsg)) || e || '');
  if(t === 'nokey') return 'Danny Dan isn\'t switched on yet.';
  if(/permission|NotAllowed|denied/i.test(t)) return 'Danny Dan needs your microphone. Allow it in your browser settings, then try again.';
  if(!navigator.onLine) return 'You\'re offline. Connect to the internet, then try again.';
  return 'Couldn\'t reach Danny Dan just now. Please try again in a minute.';
}
function ended(text){ clearInterval(timer); level(0); set('idle', text); }
function stop(){
  if(state === 'idle'){ ui.box.hidden = true; ui.btn.focus(); return; }
  try{ if(vapi) vapi.stop(); }catch(e){}
  ended('Call ended.');
}
addEventListener('pagehide', function(){ try{ if(vapi && state !== 'idle') vapi.stop(); }catch(e){} });

getConfig().then(function(c){ if(c && c.vapiPublicKey){ if(document.body) build(); else document.addEventListener('DOMContentLoaded', build); } });
})();
