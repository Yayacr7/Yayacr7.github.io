/* Sales practice with Cherry. Cherry plays a real customer for your starter business; you practise Sharp's 6-step sale
   by typing; then she scores it out of 10 with one thing to fix. The server (functions/_lib/practice.js) keeps the
   practice and the daily limits. Your best score stays on this device. Visitor text: textContent only. */
(function(){
"use strict";
var KEY = 'sharp-practice';
var NAMES = { lawn: 'Lawn and yard care', pets: 'Dog walking and pet sitting', car: 'Car washing', tutor: 'Tutoring younger kids', bake: 'Baked goods',
  tech: 'Phone and tech help', resell: 'Reselling', sitter: 'Babysitting', social: 'Social posts for local shops' };   // same as first100.js
var STEPS = ['Find someone who needs it', 'Understand their situation first', 'Check the problem matters', 'Connect your offer to their words', 'Say the price, ask, then stop', 'Explore hesitation without arguing'];
function $(id){ return document.getElementById(id); }
function el(tag, cls, text, parent){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; if(parent) parent.appendChild(e); return e; }
function load(k){ try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } }
function token(){ try{ for(var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if(/^sb-.+-auth-token$/.test(k)){ var v = JSON.parse(localStorage.getItem(k)); if(v && typeof v.access_token === 'string') return v.access_token; } } }catch(e){} return ''; }
var me = document.currentScript && document.currentScript.src, base = me ? me.replace(/tools\/practice\/practice\.js(\?.*)?$/, '') : '/';
var mine = load(KEY) || { best: 0, count: 0 };
var st = { session: '', who: '', msgs: [], busy: false, done: false };

// Business list, starting on the one from your First $100 Plan.
var sel = $('pr-skill'), f1 = load('sharp-first100');
Object.keys(NAMES).forEach(function(k){ var o = el('option', null, NAMES[k], sel); o.value = k; });
if(f1 && NAMES[f1.skill]) sel.value = f1.skill;
var stepsBox = $('pr-steps'); STEPS.forEach(function(s, i){ el('li', null, (i + 1) + '. ' + s, stepsBox); });
function best(){ $('pr-best').textContent = mine.best ? 'Your best: ' + mine.best + '/10 · ' + mine.count + ' practice' + (mine.count === 1 ? '' : 's') : ''; }
best();

function say(t, kind){ var m = $('pr-msg'); m.textContent = t || ''; m.className = 'pr-msg' + (kind ? ' ' + kind : ''); }
function bubble(role, text){
  var b = el('div', 'pr-b ' + (role === 'seller' ? 'me' : 'them'), null, $('pr-chat'));
  el('span', 'pr-who', role === 'seller' ? 'You' : 'Customer', b); el('p', null, text, b);
  b.scrollIntoView({ block: 'nearest' });
}
function post(body){
  var hd = { 'content-type': 'application/json' }, tk = token(); if(tk) hd.authorization = 'Bearer ' + tk; if(window.SharpDevice) hd['x-sharp-device'] = window.SharpDevice;
  var ctrl = 'AbortController' in window ? new AbortController() : null, timer = setTimeout(function(){ if(ctrl) ctrl.abort(); }, 60000);
  return fetch((window.SharpAPI || base) + 'api/practice', { method: 'POST', headers: hd, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined, credentials: 'same-origin' })
    .then(function(r){ return r.json().catch(function(){ return { ok: false, message: 'Something went wrong. Please try again.' }; }); })
    .catch(function(){ return { ok: false, message: navigator.onLine ? 'Cherry took too long. Please try again.' : "You're offline. Connect, then try again." }; })
    .then(function(d){ clearTimeout(timer); return d; });
}
function busy(on, text){ st.busy = on; ['pr-start', 'pr-send', 'pr-score'].forEach(function(id){ $(id).disabled = on || (id === 'pr-score' && sellerCount() < 2) || (id === 'pr-send' && st.done); }); if(on) say(text); }
function sellerCount(){ return st.msgs.filter(function(m){ return m.role === 'seller'; }).length; }

$('pr-start').addEventListener('click', function(){
  if(st.busy) return;
  busy(true, 'Cherry is getting into character…');
  post({ skill: sel.value }).then(function(d){
    busy(false);
    if(!d.ok){ say(d.message || 'Something went wrong. Please try again.', 'err'); return; }
    st = { session: d.session, who: d.who, msgs: [], busy: false, done: false };
    $('pr-setup').hidden = true; $('pr-play').hidden = false; $('pr-result').hidden = true; $('pr-chat').textContent = '';
    $('pr-cust').textContent = 'Your customer: ' + d.who + '.';
    $('pr-left').textContent = d.left == null ? '' : d.left === 0 ? 'This is your practice for today.' : d.left + ' more practice' + (d.left === 1 ? '' : 's') + ' left today.';
    bubble('customer', d.reply); say('Your turn. Ask about their situation before you pitch.'); busy(false); $('pr-q').focus();
  });
});
function send(){
  var t = $('pr-q').value.replace(/\s+/g, ' ').trim();
  if(st.busy || !st.session) return;
  if(t.length < 2){ say('Type your reply first.', 'err'); $('pr-q').focus(); return; }
  st.msgs.push({ role: 'seller', text: t.slice(0, 400) }); bubble('seller', t.slice(0, 400)); $('pr-q').value = '';
  busy(true, 'The customer is thinking…');
  post({ session: st.session, messages: st.msgs }).then(function(d){
    if(!d.ok){ st.msgs.pop(); $('pr-chat').removeChild($('pr-chat').lastChild); $('pr-q').value = t; busy(false); say(d.message || 'Something went wrong. Please try again.', 'err'); return; }
    st.msgs.push({ role: 'customer', text: d.reply }); bubble('customer', d.reply);
    st.done = !!d.done; busy(false);
    say(st.done ? 'The customer has decided. Tap "Score my sale" to see how you did.' : d.turnsLeft <= 2 ? d.turnsLeft + ' replies left. Ask for the sale soon.' : '');
    if(!st.done) $('pr-q').focus(); else $('pr-score').focus();
  });
}
$('pr-form').addEventListener('submit', function(e){ e.preventDefault(); send(); });
$('pr-q').addEventListener('keydown', function(e){ if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send(); } });
$('pr-score').addEventListener('click', function(){
  if(st.busy) return;
  busy(true, 'Cherry is scoring your sale…');
  post({ session: st.session, messages: st.msgs, score: true }).then(function(d){
    busy(false);
    if(!d.ok){ say(d.message || 'Something went wrong. Please try again.', 'err'); return; }
    say(''); $('pr-play').hidden = true; $('pr-result').hidden = false;
    $('pr-score-n').textContent = d.score; $('pr-verdict').textContent = d.answer || '';
    var ring = $('pr-ring'); ring.style.setProperty('--p', (d.score * 10) + '%'); ring.className = 'pr-ring ' + (d.score >= 8 ? 'good' : d.score >= 5 ? 'warn' : 'bad');
    var ul = $('pr-check'); ul.textContent = '';
    (d.stepNames || STEPS).forEach(function(n, i){ var ok = d.steps[i], li = el('li', ok ? 'good' : 'bad', null, ul); el('i', 'sc-ic ' + (ok ? 'good' : 'bad'), ok ? '✓' : '✕', li).setAttribute('aria-hidden', 'true'); el('span', null, (ok ? 'Done: ' : 'Missed: ') + n, li); });
    $('pr-good').textContent = d.good || ''; $('pr-fix').textContent = d.fix || ''; $('pr-try').textContent = d.tryLine || '';
    mine.count = (mine.count || 0) + 1; var newBest = d.score > (mine.best || 0); if(newBest) mine.best = d.score;
    try{ localStorage.setItem(KEY, JSON.stringify(mine)); }catch(e){}
    best(); st.session = '';
    $('pr-result-h').focus();
    if(d.score >= 8 && window.SharpPop) SharpPop($('pr-ring'), { n: 16, big: true, say: d.score >= 9 ? 'Great sale. Cherry on top!' : 'Strong sale. Cherry on top!' });
  });
});
$('pr-again').addEventListener('click', function(){ $('pr-result').hidden = true; $('pr-setup').hidden = false; say(''); $('pr-start').focus(); });
})();
