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
  // One big overspend (eating out) and two small ones, like the adult example, so Cherry's plan stays short and clear.
  var T = { 's-income': 400, 's-housing': 0, 's-bills': 30, 's-food': 0, 's-transport': 40, 's-eat': 80, 's-shop': 40, 's-subs': 15, 's-fun': 20, 's-save': 60 };
  var L = { 's-income': 'Money you get a month ($)', 's-bills': 'Phone and bills', 's-food': 'Food at home' };
  Object.keys(T).forEach(function(id){ var i = document.getElementById(id); if(i){ i.value = T[id]; i.defaultValue = T[id]; } });
  Object.keys(L).forEach(function(id){ var i = document.getElementById(id), lb = i && i.parentNode; if(lb && lb.firstChild && lb.firstChild.nodeType === 3) lb.firstChild.nodeValue = L[id]; });
}
})();
