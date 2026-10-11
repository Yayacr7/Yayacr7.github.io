/* Ask Sharp: sends a question to /api/ask and shows the answer.
   Everything the server sends back is shown with textContent only (never innerHTML). */
(function(){
"use strict";
var $ = function(id){ return document.getElementById(id); };
var form = $('ask-form'), q = $('ask-q'), btn = $('ask-btn'), status = $('ask-status'), lesson = $('ask-lesson');
var out = $('ask-out'), answerEl = $('ask-answer'), badge = $('ask-badge'), srcWrap = $('ask-src-wrap'), srcList = $('ask-src');
var histWrap = $('ask-hist-wrap'), histList = $('ask-hist');
var HIST_KEY = 'sharp-ask-history', MAX_HIST = 8, busy = false, last = null;

function load(){ try{ var v = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); return Array.isArray(v) ? v : []; }catch(e){ return []; } }
function store(v){ try{ localStorage.setItem(HIST_KEY, JSON.stringify(v)); }catch(e){} }

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

function say(text, kind){ status.textContent = text; status.className = 'fine' + (kind ? ' ' + kind : ''); }
function mode(){ var m = form.querySelector('input[name=mode]:checked'); return m ? m.value : 'answer'; }
function setMode(m){ var r = form.querySelector('input[name=mode][value="' + m + '"]'); if(r) r.checked = true; }

/* Turns plain text into paragraphs and "- " lists, safely. */
function render(text){
  answerEl.textContent = '';
  var list = null;
  text.split(/\n+/).forEach(function(line){
    line = line.trim(); if(!line) return;
    var m = line.match(/^[-•*]\s+(.*)$/);
    if(m){ if(!list){ list = document.createElement('ul'); answerEl.appendChild(list); } var li = document.createElement('li'); li.textContent = m[1]; list.appendChild(li); }
    else { list = null; var p = document.createElement('p'); p.textContent = line; answerEl.appendChild(p); }
  });
}

function showAnswer(data, asked){
  render(data.answer);
  badge.textContent = data.covered ? 'From Sharp lessons' : 'Not covered yet';
  badge.className = 'chip ' + (data.covered ? 'ok' : 'no');
  srcList.textContent = '';
  (data.sources || []).forEach(function(s){
    if(typeof s.url !== 'string' || !/^\/(learn|tools|pricing)\//.test(s.url)) return;   // only Sharp's own pages
    var li = document.createElement('li'), a = document.createElement('a');
    a.href = '..' + s.url; a.textContent = s.title; li.appendChild(a); srcList.appendChild(li);
  });
  srcWrap.hidden = !srcList.children.length;
  out.hidden = false;
  last = { q: asked.question, mode: asked.mode, lesson: asked.lesson, answer: data.answer, covered: data.covered, sources: data.sources || [] };
  answerEl.focus({ preventScroll: true });
  out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

var LABEL = { answer: '', simpler: ' (simpler)', example: ' (example)' };
function drawHistory(){
  var h = load(); histList.textContent = ''; histWrap.hidden = !h.length;
  h.forEach(function(item){
    var li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.textContent = item.q + (LABEL[item.mode] || '');
    b.addEventListener('click', function(){ q.value = item.q; setMode(item.mode); lesson.value = item.lesson || ''; count(); showAnswer(item, { question: item.q, mode: item.mode, lesson: item.lesson }); say('Showing a saved answer.', 'ok'); });
    li.appendChild(b); histList.appendChild(li);
  });
}
function remember(item){
  var h = load().filter(function(x){ return !(x.q === item.q && x.mode === item.mode && (x.lesson || '') === (item.lesson || '')); });
  h.unshift(item); store(h.slice(0, MAX_HIST)); drawHistory();
}

function count(){ $('ask-count').textContent = q.value.length + ' / 500'; }

function ask(){
  if(busy) return;                        // one question at a time (stops double taps)
  var question = q.value.replace(/\s+/g, ' ').trim();
  if(question.length < 3){ say('Type a question first.', 'err'); q.focus(); return; }
  var pd = privateDetail(question);
  if(pd){ say('Your question looks like it has ' + pd + ' in it. Please take it out. Sharp never needs private details.', 'err'); q.focus(); return; }
  if(!navigator.onLine){ say("You're offline. Connect to the internet, then try again.", 'err'); return; }
  var asked = { question: question, mode: mode(), lesson: lesson.value };
  busy = true; btn.disabled = true; btn.textContent = 'Thinking…'; form.setAttribute('aria-busy', 'true');
  say('Reading Sharp\'s lessons and writing an answer. This can take up to 20 seconds.');
  var ctrl = 'AbortController' in window ? new AbortController() : null;
  var timer = setTimeout(function(){ if(ctrl) ctrl.abort(); }, 60000);
  fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(asked), signal: ctrl ? ctrl.signal : undefined, credentials: 'same-origin' })
    .then(function(r){
      return r.json().catch(function(){ return { ok: false, message: r.status === 404 || r.status === 405 ? "Ask Sharp isn't switched on yet. The lessons and tools all still work." : 'Something went wrong. Please try again.' }; });
    })
    .then(function(data){
      if(!data || !data.ok || typeof data.answer !== 'string'){ say((data && data.message) || 'Something went wrong. Please try again.', 'err'); return; }
      showAnswer(data, asked);
      remember({ q: question, mode: asked.mode, lesson: asked.lesson, answer: data.answer, covered: !!data.covered, sources: data.sources || [] });
      say(data.cached ? 'Done. This question was asked before, so you got the saved answer.' : 'Done.', 'ok');
    })
    .catch(function(e){
      say(e && e.name === 'AbortError' ? 'That took too long. Please try again.' : "Couldn't reach Sharp. Check your connection and try again.", 'err');
    })
    .then(function(){ clearTimeout(timer); busy = false; btn.disabled = false; btn.textContent = 'Ask Sharp'; form.removeAttribute('aria-busy'); });
}

form.addEventListener('submit', function(e){ e.preventDefault(); ask(); });
q.addEventListener('input', count);
q.addEventListener('keydown', function(e){ if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){ e.preventDefault(); ask(); } });
function followUp(m){ if(!last) return; q.value = last.q; setMode(m); lesson.value = last.lesson || ''; count(); ask(); }
$('ask-simpler').addEventListener('click', function(){ followUp('simpler'); });
$('ask-example').addEventListener('click', function(){ followUp('example'); });
$('ask-copy').addEventListener('click', function(){
  if(!last) return;
  var text = last.answer + '\n\n(From Ask Sharp, sharpbasics.com. AI can be wrong; check the lesson.)';
  var done = function(){ say('Answer copied.', 'ok'); }, failed = function(){ say("Couldn't copy. Select the text and copy it yourself.", 'err'); };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, failed); else failed();
});
$('ask-clear').addEventListener('click', function(){
  if(!confirm('Clear your recent questions from this device?')) return;
  try{ localStorage.removeItem(HIST_KEY); }catch(e){}
  drawHistory(); say('Recent questions cleared.', 'ok');
});

/* Coming from a lesson: ?lesson=money&mode=simpler pre-fills the form. Nothing is sent until you press Ask. */
var params = new URLSearchParams(location.search);
var l = params.get('lesson'), m = params.get('mode');
if(l && lesson.querySelector('option[value="' + l.replace(/[^a-z0-9-]/g, '') + '"]')){
  lesson.value = l;
  var name = lesson.options[lesson.selectedIndex].textContent.replace(/^\d+\.\s*/, '');
  if(m === 'simpler' || m === 'example'){ setMode(m); q.value = (m === 'simpler' ? 'Explain the main idea of "' : 'Give me a real-world example of "') + name + '".'; }
}
count(); drawHistory();
})();
