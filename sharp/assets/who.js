/* Who the visitor is: a teen (13-17) or an adult (18+), picked in the 60-second demo or in any page's footer.
   Saved on this device only (localStorage 'sharp-who'). Sets <html data-who="teen|adult"> so pages can show the right
   lines (.who-teen / .who-adult), and gives scripts window.SharpWho.get(). Nothing chosen = the teen version (Sharp's
   original). On the home page, teens get teen-sized example numbers in the Spending check. Load it before tools.js. */
(function(){
"use strict";
function get(){ try{ var w = localStorage.getItem('sharp-who'); return w === 'adult' || w === 'teen' ? w : ''; }catch(e){ return ''; } }
function set(w){ try{ if(w === 'adult' || w === 'teen') localStorage.setItem('sharp-who', w); }catch(e){} document.documentElement.setAttribute('data-who', w); }
window.SharpWho = { get: get, set: set, isAdult: function(){ return get() === 'adult'; } };
var who = get(); if(who) document.documentElement.setAttribute('data-who', who);
// Home Spending check: a teen's month (money from jobs and allowance; no rent), before tools.js draws it.
if(who === 'teen' && document.getElementById('s-income')){
  // One big overspend (eating out) and two small ones, like the adult example, so Rome's plan stays short and clear.
  var T = { 's-income': 400, 's-housing': 0, 's-bills': 30, 's-food': 0, 's-transport': 40, 's-eat': 80, 's-shop': 40, 's-subs': 15, 's-fun': 20, 's-save': 60 };
  var L = { 's-income': 'Money you get a month ($)', 's-bills': 'Phone and bills', 's-food': 'Food at home' };
  Object.keys(T).forEach(function(id){ var i = document.getElementById(id); if(i){ i.value = T[id]; i.defaultValue = T[id]; } });
  Object.keys(L).forEach(function(id){ var i = document.getElementById(id), lb = i && i.parentNode; if(lb && lb.firstChild && lb.firstChild.nodeType === 3) lb.firstChild.nodeValue = L[id]; });
}
// The 60-second demo's numbers carry into the home Spending check (owner, 2026-11-28: "carry the demo's numbers into the app,
// and clearly label any remaining example data"): the money a month and the one thing the visitor set in demo step 1. The other
// rows are the example, scaled to that money (to the nearest $5); tools.js and the "My numbers" note say which is which.
// Only for the same teen/adult choice. Read from this device only (localStorage 'sharp-demo-nums', written by demo/demo.js).
var D = null; try{ D = JSON.parse(localStorage.getItem('sharp-demo-nums') || 'null'); }catch(e){}
var ROW = { food: 's-eat', eat: 's-eat', games: 's-fun', fun: 's-fun', clothes: 's-shop', shop: 's-shop', rides: 's-transport', subs: 's-subs' };
var NAME = { food: 'food and snacks out', eat: 'eating out', games: 'games and apps', fun: 'going out and fun', clothes: 'clothes and shoes', shop: 'shopping', rides: 'rides and delivery', subs: 'subscriptions' };
var inc0 = document.getElementById('s-income');
if(inc0 && D && who && D.who === who && isFinite(D.inc) && D.inc > 0 && D.inc <= 1e6 && ROW.hasOwnProperty(D.cat) && isFinite(D.sp) && D.sp >= 0){
  var inc = Math.round(D.inc), sp = Math.round(Math.min(D.sp, D.inc));
  var put = function(id, v){ var i = document.getElementById(id); if(i){ i.value = v; i.defaultValue = v; } };
  // Scale the other example rows to the demo's money, but never past what's left after the demo's category, so the
  // example never invents overspending the visitor didn't choose (rounded down to $5).
  var rest = ['s-housing', 's-bills', 's-food', 's-transport', 's-eat', 's-shop', 's-subs', 's-fun', 's-save'].filter(function(id){ return id !== ROW[D.cat] && document.getElementById(id); });
  var base = rest.reduce(function(t, id){ return t + (+document.getElementById(id).value || 0); }, 0);
  var k = Math.min(D.inc / (+inc0.value || 1), base > 0 ? Math.max(0, inc - sp) / base : 1);
  rest.forEach(function(id){ put(id, Math.floor((+document.getElementById(id).value || 0) * k / 5) * 5); });
  put('s-income', inc); put(ROW[D.cat], sp);
  window.SharpDemoNums = { inc: inc, sp: sp, row: ROW[D.cat] };
  var note = document.getElementById('s-src');
  if(note) note.textContent = 'From your demo: $' + inc.toLocaleString() + ' a month and $' + sp.toLocaleString() + ' on ' + NAME[D.cat] + '. The other rows are examples: change them to yours.';
}
})();
