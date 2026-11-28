/* "Start here": a 2-minute warm-up before lesson 1 (owner, 2026-11-28, from a review: "start with a short teen lesson: you
   received $20, what will you spend and save? Introduce harder topics gradually"). One choice, one useful result, no quiz.
   Teens: $20 from mowing a lawn, every week. Adults: $200 extra a month. Teen or adult comes from the choice saved on this
   device (localStorage 'sharp-who', see assets/who.js); nothing picked = the teen version. Numbers only, nothing is sent or saved. */
(function(){
"use strict";
var box = document.getElementById('w20'); if(!box) return;
var adult = false; try{ adult = localStorage.getItem('sharp-who') === 'adult'; }catch(e){}
var A = adult
  ? { amt: 200, step: 5, save: 40, lede: 'A side job paid you $200 extra this month.', every: 'every month', n: 12, h: 'You just got $200 extra.' }
  : { amt: 20, step: 1, save: 5, lede: 'You mowed a neighbour\'s lawn and got $20.', every: 'every week', n: 52, h: 'You just got $20.' };
function $(id){ return document.getElementById(id); }
function money(v){ return '$' + Math.round(v).toLocaleString(); }
var r = $('w20-save');
$('w20-h1').textContent = A.h; $('w20-lede').textContent = A.lede;
r.max = A.amt; r.step = A.step; r.value = A.save;
function draw(){
  var s = Math.max(0, Math.min(A.amt, +r.value || 0)), pct = Math.round(s / A.amt * 100), good = pct >= 20;
  $('w20-o').textContent = money(s); $('w20-sp').textContent = money(A.amt - s);
  r.setAttribute('aria-valuetext', 'Save ' + money(s) + ', spend ' + money(A.amt - s));
  $('w20-year').textContent = money(s * A.n);
  $('w20-how').textContent = 'saved in a year, if you earn ' + money(A.amt) + ' ' + A.every + ' and save ' + money(s) + ' of it.';
  var st = $('w20-st');
  st.className = 'w20-st ' + (good ? 'good' : 'warn');
  $('w20-st-i').textContent = good ? '✓' : '!';
  $('w20-st-w').textContent = good ? 'Good: ' + pct + '%' : 'Try more: ' + pct + '%';
  $('w20-rule').textContent = good
    ? 'That beats Sharp\'s 20% rule: save at least 1 dollar in every 5 you earn, before you spend.'
    : 'Sharp\'s rule: save at least 20% (1 dollar in every 5) before you spend. Here that\'s ' + money(Math.ceil(A.amt * .2)) + '.';
}
r.addEventListener('input', draw);
draw();
})();
