/* Idea to Plan: sends the visitor's answers to /api/plan and shows an editable plan.
   Everything from the server is shown with textContent only (never innerHTML).
   The latest plan and its edits are saved in this browser only. */
(function(){
"use strict";
var $ = function(id){ return document.getElementById(id); };
var form = $('pl-form'), btn = $('pl-btn'), status = $('pl-status'), out = $('pl-out');
var KEY = 'sharp-plan', busy = false, cur = null;
var F = ['idea','customer','stage','hours','price','cost','goal','worry'];

function load(){ try{ return JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){ return null; } }
function store(v){ try{ localStorage.setItem(KEY, JSON.stringify(v)); return true; }catch(e){ return false; } }
function mk(tag, cls, text){ var n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; }
function say(t, kind){ status.textContent = t; status.className = 'fine' + (kind ? ' ' + kind : ''); }

/* Same privacy checks as the server (functions/_lib/guard.js). */
function luhn(d){ var s = 0, alt = false; for(var i = d.length - 1; i >= 0; i--){ var n = +d[i]; if(alt){ n *= 2; if(n > 9) n -= 9; } s += n; alt = !alt; } return s % 10 === 0; }
function privateDetail(t){
  var cards = t.match(/(?:\d[ -]?){13,19}/g) || [];
  for(var i = 0; i < cards.length; i++) if(luhn(cards[i].replace(/\D/g, ''))) return 'a card number';
  if(/\b\d{3}-\d{2}-\d{4}\b/.test(t)) return 'an ID number';
  if(/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(t)) return 'an email address';
  if(/(?:^|[^\d$])\(?\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}\b|\b\d{10,12}\b|\+\d[\d\s-]{7,}\d/.test(t)) return 'a phone or account number';
  return null;
}

function answers(){ var a = {}; F.forEach(function(k){ a[k] = $('pl-' + k).value.trim(); }); return a; }
function fill(a){ F.forEach(function(k){ if(a && a[k] != null) $('pl-' + k).value = a[k]; }); }
function mark(field){ F.forEach(function(k){ $('pl-' + k).removeAttribute('aria-invalid'); }); if(field && $('pl-' + field)){ $('pl-' + field).setAttribute('aria-invalid', 'true'); $('pl-' + field).focus(); } }

function render(state){
  var p = state.plan;
  var sc = $('pl-score'); sc.textContent = p.rating + ' / 10';
  sc.className = 'pl-score ' + (p.rating >= 7 ? 'hi' : p.rating >= 4 ? 'mid' : 'lo');
  sc.setAttribute('aria-label', 'Idea score ' + p.rating + ' out of 10');
  $('pl-verdict').textContent = p.verdict;
  var nums = $('pl-nums'); nums.textContent = '';
  (state.numbers || []).forEach(function(n){ var d = mk('div'); d.appendChild(mk('span', null, n.label)); d.appendChild(mk('b', null, n.value)); d.appendChild(mk('span', null, n.note)); nums.appendChild(d); });
  nums.hidden = !nums.children.length;
  [['pl-good', p.strengths], ['pl-risk', p.risks]].forEach(function(x){ var ul = $(x[0]); ul.textContent = ''; x[1].forEach(function(t){ ul.appendChild(mk('li', null, t)); }); });
  $('pl-today').textContent = p.today;
  var wk = $('pl-weeks'); wk.textContent = '';
  p.weeks.forEach(function(w, wi){
    var box = mk('section', 'pl-week'); box.setAttribute('aria-label', 'Week ' + (wi + 1));
    box.appendChild(mk('h3', null, 'Week ' + (wi + 1) + ': ' + w.title));
    w.tasks.forEach(function(t, ti){
      var id = 'pl-t-' + wi + '-' + ti, done = !!(state.done && state.done[id]);
      var row = mk('div', 'pl-task' + (done ? ' done' : ''));
      var cb = mk('input'); cb.type = 'checkbox'; cb.id = id; cb.checked = done; cb.setAttribute('aria-label', 'Done: week ' + (wi + 1) + ' task ' + (ti + 1));
      var tx = mk('input'); tx.type = 'text'; tx.value = t; tx.maxLength = 220; tx.setAttribute('aria-label', 'Week ' + (wi + 1) + ' task ' + (ti + 1) + ' (you can edit it)');
      cb.addEventListener('change', function(){ state.done = state.done || {}; state.done[id] = cb.checked; row.classList.toggle('done', cb.checked); saved(); });
      tx.addEventListener('input', function(){ p.weeks[wi].tasks[ti] = tx.value; saved(); });
      row.appendChild(cb); row.appendChild(tx); box.appendChild(row);
    });
    wk.appendChild(box);
  });
  var les = $('pl-les'); les.textContent = '';
  (p.lessons || []).forEach(function(l){ if(!/^\/learn\/#[a-z-]+$/.test(l.url)) return; var li = mk('li'), a = mk('a', null, l.title); a.href = '..' + l.url; li.appendChild(a); les.appendChild(li); });
  $('pl-les-wrap').hidden = !les.children.length;
  out.hidden = false; cur = state;
}
var t;
function saved(){ clearTimeout(t); t = setTimeout(function(){ $('pl-saved').textContent = store(cur) ? 'Saved on this device.' : "Couldn't save: this browser is blocking storage. Download your plan to keep it."; }, 400); }

function build(){
  if(busy) return;
  var a = answers(); mark(null);
  if(a.idea.length < 10){ say('Describe your idea in a sentence or two.', 'err'); mark('idea'); return; }
  if(a.customer.length < 3){ say('Say who would buy it, for example "busy parents near me".', 'err'); mark('customer'); return; }
  var pd = privateDetail([a.idea, a.customer, a.worry].join(' '));
  if(pd){ say('Your answers look like they include ' + pd + '. Please take it out.', 'err'); return; }
  if(cur && !confirm('Build a new plan? Your current plan on this device will be replaced.')) return;
  if(!navigator.onLine){ say("You're offline. Connect to the internet, then try again.", 'err'); return; }
  busy = true; btn.disabled = true; btn.textContent = 'Building…'; form.setAttribute('aria-busy', 'true');
  say('Reading your idea and writing your plan. This can take up to 30 seconds.');
  var ctrl = 'AbortController' in window ? new AbortController() : null, timer = setTimeout(function(){ if(ctrl) ctrl.abort(); }, 70000);
  fetch('/api/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(a), signal: ctrl ? ctrl.signal : undefined, credentials: 'same-origin' })
    .then(function(r){ return r.json().catch(function(){ return { ok: false, message: r.status === 404 || r.status === 405 ? "The AI plan builder isn't switched on yet. The Idea check tool and the lessons still work." : 'Something went wrong. Please try again.' }; }); })
    .then(function(d){
      if(!d || !d.ok || !d.plan){ say((d && d.message) || 'Something went wrong. Please try again.', 'err'); if(d && d.field) mark(d.field); return; }
      var state = { answers: a, numbers: d.numbers || [], plan: d.plan, done: {}, at: new Date().toISOString() };
      render(state); store(state); $('pl-saved').textContent = 'Saved on this device.';
      say(d.cached ? 'Done. These answers were planned before, so you got the saved plan.' : 'Done. Your plan is below.', 'ok');
      $('pl-out-h').focus && out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    })
    .catch(function(e){ say(e && e.name === 'AbortError' ? 'That took too long. Please try again.' : "Couldn't reach Sharp. Check your connection and try again.", 'err'); })
    .then(function(){ clearTimeout(timer); busy = false; btn.disabled = false; btn.textContent = 'Build my plan'; form.removeAttribute('aria-busy'); });
}

form.addEventListener('submit', function(e){ e.preventDefault(); build(); });
$('pl-new').addEventListener('click', function(){
  if(!confirm('Start a new plan? Your current plan will be deleted from this device.')) return;
  try{ localStorage.removeItem(KEY); }catch(e){}
  cur = null; out.hidden = true; form.reset(); $('pl-saved').textContent = ''; say('Plan deleted. Fill in your new idea above.', 'ok'); $('pl-idea').focus();
});
$('pl-dl').addEventListener('click', function(){
  if(!cur) return;
  var p = cur.plan, s = 'My Idea to Plan (sharpbasics.com)\n\nIdea: ' + cur.answers.idea + '\nWho buys it: ' + cur.answers.customer + '\nScore: ' + p.rating + '/10\n' + p.verdict + '\n';
  if(cur.numbers.length) s += '\nNumbers:\n' + cur.numbers.map(function(n){ return '- ' + n.label + ': ' + n.value + ' (' + n.note + ')'; }).join('\n') + '\n';
  s += '\nStrengths:\n- ' + p.strengths.join('\n- ') + '\n\nRisks to check:\n- ' + p.risks.join('\n- ') + '\n\nDo this today: ' + p.today + '\n';
  p.weeks.forEach(function(w, wi){ s += '\nWeek ' + (wi + 1) + ': ' + w.title + '\n' + w.tasks.map(function(x, ti){ return (cur.done && cur.done['pl-t-' + wi + '-' + ti] ? '[x] ' : '[ ] ') + x; }).join('\n') + '\n'; });
  s += '\nMade with AI on Sharp. AI can be wrong; this is a starting point, not advice.\n';
  var url = URL.createObjectURL(new Blob([s], { type: 'text/plain' })), a = mk('a'); a.href = url; a.download = 'sharp-plan.txt';
  document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1000);
});

var prev = load();
if(prev && prev.plan && prev.answers){ fill(prev.answers); render(prev); say('Showing your saved plan.', 'ok'); }
})();
