/* Cherry chat (the Ask Cherry agent): a chat button on every page (loaded by shell.js only when the AI is switched on).
   It sends the chat to /api/agent, which searches Sharp's lessons and replies with an answer,
   next steps and buttons to the right pages. Everything shown is set with textContent only. */
(function(){
"use strict";
if(window.__sharpAgent) return; window.__sharpAgent = true;
var me = document.currentScript && document.currentScript.src;
var base = me ? me.replace(/assets\/agent\.js(\?.*)?$/, '') : '/';
var KEY = 'sharp-agent-chat', MAX = 8, busy = false;
var chat = load();

function load(){ try{ var v = JSON.parse(sessionStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.slice(-MAX) : []; }catch(e){ return []; } }
function save(){ try{ sessionStorage.setItem(KEY, JSON.stringify(chat.slice(-MAX))); }catch(e){} }

/* Same privacy checks as the server (functions/_lib/guard.js), so private details never leave the device. */
function luhn(d){ var s = 0, alt = false; for(var i = d.length - 1; i >= 0; i--){ var n = +d[i]; if(alt){ n *= 2; if(n > 9) n -= 9; } s += n; alt = !alt; } return s % 10 === 0; }
function privateDetail(t){
  var cards = t.match(/(?:\d[ -]?){13,19}/g) || [];
  for(var i = 0; i < cards.length; i++) if(luhn(cards[i].replace(/\D/g, ''))) return 'a card number';
  if(/\b\d{3}-\d{2}-\d{4}\b/.test(t)) return 'an ID number';
  if(/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(t)) return 'an email address';
  if(/(?:^|[^\d$])\(?\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}\b|\b\d{10,12}\b|\+\d[\d\s-]{7,}\d/.test(t)) return 'a phone or account number';
  if(/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/.test(t)) return 'a bank account number';
  if(/\b(password|passcode|pin code|login)\s*[:=]/i.test(t)) return 'a password';
  return null;
}

// The signed-in visitor's Supabase token (if any), so the server can tell which Cherry their plan gets.
function token(){ try{ for(var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if(/^sb-.+-auth-token$/.test(k)){ var v = JSON.parse(localStorage.getItem(k)); if(v && typeof v.access_token === 'string') return v.access_token; } } }catch(e){} return ''; }
function el(tag, cls, text, parent){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; if(parent) parent.appendChild(e); return e; }

// The page path the server knows ("/tools/budget/"), so the agent knows where the visitor is.
var page = location.pathname.replace(/index\.html$/, '');

var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = base + 'assets/agent.css'; document.head.appendChild(css);

var launch = el('button', 'ag-launch', null, document.body);
launch.type = 'button'; launch.setAttribute('aria-haspopup', 'dialog'); launch.setAttribute('aria-controls', 'ag-panel');
el('span', 'ag-face', 'C', launch).setAttribute('aria-hidden', 'true');
el('span', 'ag-launch-t', 'Cherry', launch);

var panel = el('section', 'ag-panel', null, document.body);
panel.id = 'ag-panel'; panel.hidden = true;
panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'false'); panel.setAttribute('aria-labelledby', 'ag-title');
var head = el('div', 'ag-head', null, panel);
var ht = el('div', null, null, head);
var titleEl = el('p', 'ag-title', 'Cherry', ht); titleEl.id = 'ag-title';
var lvlEl = el('span', 'ag-lvl', null, titleEl);
function showLevel(n){ if(typeof n !== 'string' || !/^Cherry (Dan|Tutor|Coach|Pro)$/.test(n)) return; lvlEl.textContent = n === 'Cherry' ? '' : n.split(' ')[1]; try{ sessionStorage.setItem('sharp-agent-level', n); }catch(e){} }
try{ showLevel(sessionStorage.getItem('sharp-agent-level')); }catch(e){}
el('p', 'ag-sub', 'Sharp\'s helper. Cherry reads the lessons and takes you to the right tool.', ht);
var callBtn = el('button', 'ag-icon ag-call', 'Call', head); callBtn.type = 'button'; callBtn.setAttribute('aria-label', 'Call Cherry instead'); callBtn.hidden = true;
var newBtn = el('button', 'ag-icon', 'New', head); newBtn.type = 'button'; newBtn.setAttribute('aria-label', 'Start a new chat');
var closeBtn = el('button', 'ag-icon', '✕', head); closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Close Cherry');

var log = el('div', 'ag-log', null, panel);
log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite'); log.tabIndex = 0;

var form = el('form', 'ag-form', null, panel);
var label = el('label', 'ag-sr', 'Message Cherry', form); label.htmlFor = 'ag-q';
var q = el('textarea', 'ag-q', null, form); q.id = 'ag-q'; q.rows = 1; q.maxLength = 500;
q.placeholder = 'Ask anything…'; q.setAttribute('enterkeyhint', 'send');
var send = el('button', 'ag-send', 'Send', form); send.type = 'submit';
var status = el('p', 'ag-status', '', panel); status.setAttribute('role', 'status');
el('p', 'ag-note', 'AI can be wrong. Don\'t type private details. Numbers in the tools stay on your device.', panel);

var IDEAS = ['Help me save $500', 'I want to start a small business. Where do I start?', 'How do I plan my week?', 'How do I price what I sell?'];

function say(t, kind){ status.textContent = t; status.className = 'ag-status' + (kind ? ' ' + kind : ''); }

function paragraphs(text, parent){
  text.split(/\n+/).forEach(function(line){ line = line.trim(); if(line) el('p', null, line, parent); });
}

function drawBot(m, parent){
  var b = el('div', 'ag-msg bot', null, parent);
  paragraphs(m.text, b);
  if(m.steps && m.steps.length){
    el('p', 'ag-steps-t', 'Your next steps', b);
    var ol = el('ol', 'ag-steps', null, b);
    m.steps.forEach(function(s){ el('li', null, s, ol); });
  }
  if(m.links && m.links.length){
    var row = el('div', 'ag-links', null, b);
    m.links.forEach(function(l){
      if(typeof l.url !== 'string' || !/^\/[a-z0-9\-\/#]*$/.test(l.url)) return;   // only Sharp's own pages
      var a = el('a', 'ag-link', l.label + ' →', row);
      a.href = base.replace(/\/$/, '') + l.url;
    });
  }
}

function draw(){
  log.textContent = '';
  if(!chat.length){
    var w = el('div', 'ag-msg bot', null, log);
    el('p', null, 'Hi, I\'m Cherry! Ask me anything, from saving money and starting a business to planning your week. I\'ll give you a plan and take you to the right tool.', w);
    var row = el('div', 'ag-ideas', null, log);
    IDEAS.forEach(function(t){
      var b = el('button', 'ag-idea', t, row); b.type = 'button';
      b.addEventListener('click', function(){ q.value = t; submit(); });
    });
  }
  chat.forEach(function(m){
    if(m.role === 'user') el('div', 'ag-msg me', m.text, log);
    else drawBot(m, log);
  });
  if(busy){ var t = el('div', 'ag-msg bot ag-typing', null, log); t.setAttribute('aria-label', 'Cherry is working'); el('span', null, null, t); el('span', null, null, t); el('span', null, null, t); }
  // Show the start of the newest reply, not its end.
  var last = log.lastElementChild;
  log.scrollTop = last && last.classList.contains('bot') && chat.length ? Math.max(0, last.offsetTop - log.offsetTop - 8) : log.scrollHeight;
}

function open(){
  callBtn.hidden = !window.SharpVoice;
  panel.hidden = false; launch.setAttribute('aria-expanded', 'true'); document.documentElement.classList.add('ag-open');
  draw(); setTimeout(function(){ q.focus(); }, 30);
}
function close(){
  panel.hidden = true; launch.setAttribute('aria-expanded', 'false'); document.documentElement.classList.remove('ag-open'); launch.focus();
}
/* Keep the button clear of bars stuck to the bottom of the page (like the budget summary bar). */
var lift = 0, raf = 0;
function place(){
  raf = 0;
  var r = launch.getBoundingClientRect(), x = r.left + r.width / 2, need = 0;
  launch.style.visibility = 'hidden';
  [r.bottom - 4 + lift, r.top + 4 + lift].forEach(function(y){
    var hit = document.elementFromPoint(x, Math.min(y, innerHeight - 2));
    for(var n = hit; n && n !== document.body; n = n.parentElement){
      var pos = getComputedStyle(n).position;
      if(pos === 'fixed' || pos === 'sticky'){ var b = n.getBoundingClientRect(); if(b.bottom >= innerHeight - 40) need = Math.max(need, innerHeight - b.top + 10 - 16); break; }
    }
  });
  launch.style.visibility = '';
  if(need !== lift){ lift = need; launch.style.transform = lift ? 'translateY(' + (-lift) + 'px)' : ''; }
}
function later(){ if(!raf) raf = requestAnimationFrame(place); }
addEventListener('scroll', later, { passive: true }); addEventListener('resize', later); setTimeout(place, 300);

launch.addEventListener('click', function(){ panel.hidden ? open() : close(); });
closeBtn.addEventListener('click', close);
callBtn.addEventListener('click', function(){ close(); if(window.SharpVoice) window.SharpVoice.start(); });
window.SharpAgent = { open: open };
newBtn.addEventListener('click', function(){ if(busy) return; chat = []; save(); say(''); draw(); q.focus(); });
document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && !panel.hidden) close(); });

function grow(){ q.style.height = 'auto'; q.style.height = Math.min(q.scrollHeight, 120) + 'px'; }
q.addEventListener('input', grow);
q.addEventListener('keydown', function(e){ if(e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); submit(); } });
form.addEventListener('submit', function(e){ e.preventDefault(); submit(); });

function submit(){
  if(busy) return;
  var text = q.value.replace(/\s+/g, ' ').trim();
  if(text.length < 2){ say('Type a message first.', 'err'); q.focus(); return; }
  var pd = privateDetail(text);
  if(pd){ say('Your message looks like it has ' + pd + ' in it. Please take it out. Sharp never needs private details.', 'err'); return; }
  if(!navigator.onLine){ say("You're offline. Connect to the internet, then try again.", 'err'); return; }
  chat.push({ role: 'user', text: text }); chat = chat.slice(-MAX); save();
  q.value = ''; grow();
  busy = true; send.disabled = true; say('Searching Sharp\'s lessons… this can take up to 30 seconds.'); draw();
  var ctrl = 'AbortController' in window ? new AbortController() : null;
  var timer = setTimeout(function(){ if(ctrl) ctrl.abort(); }, 70000);
  var body = { page: page, messages: chat.map(function(m){ return { role: m.role, text: m.text }; }) };
  var hd = { 'content-type': 'application/json' }, tk = token(); if(tk) hd.authorization = 'Bearer ' + tk;
  fetch((window.SharpAPI || base) + 'api/agent', { method: 'POST', headers: hd, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined, credentials: 'same-origin' })
    .then(function(r){ return r.json().catch(function(){ return { ok: false, message: 'Something went wrong. Please try again.' }; }); })
    .then(function(d){
      if(!d || !d.ok || typeof d.reply !== 'string'){
        chat.pop(); q.value = text; grow();                    // give the message back so it can be sent again
        say((d && d.message) || 'Something went wrong. Please try again.', 'err'); return;
      }
      showLevel(d.level);
      chat.push({ role: 'assistant', text: d.reply, covered: !!d.covered,
        steps: Array.isArray(d.steps) ? d.steps.slice(0, 7) : [], links: Array.isArray(d.links) ? d.links.slice(0, 3) : [] });
      chat = chat.slice(-MAX); save(); say('');
    })
    .catch(function(e){
      chat.pop(); q.value = text; grow();
      say(e && e.name === 'AbortError' ? 'That took too long. Please try again.' : "Couldn't reach Sharp. Check your connection and try again.", 'err');
    })
    .then(function(){ clearTimeout(timer); busy = false; send.disabled = false; save(); draw(); });
}
})();
