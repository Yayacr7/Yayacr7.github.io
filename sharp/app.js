(function(){
"use strict";

var CFG = window.NP_CONFIG || {};
var WAITLIST = CFG.WAITLIST || { provider: "", id: "" };
var AUTH = CFG.AUTH || { supabaseUrl: "", supabaseAnonKey: "", google: false };
var PAY  = CFG.PAY  || { builder: "", founder: "" };
var TRIAL_DAYS = CFG.TRIAL_DAYS || 3;

/* ---------- theme ---------- */
function load(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function save(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
var root = document.documentElement, t = load('np-theme');
if(t) root.setAttribute('data-theme', t);
(document.getElementById('themeBtn') || document.createElement('i')).addEventListener('click', function(){
  var dark = root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  t = dark ? 'light' : 'dark'; root.setAttribute('data-theme', t); save('np-theme', t);
});

/* ---------- the napkin test ---------- */
function num(id){ var v = parseFloat(document.getElementById(id).value); return isFinite(v) && v > 0 ? v : 0; }
function money(n){ return '$' + Math.round(n).toLocaleString(); }
function napkin(){
  var price = num('n-price'), cost = num('n-cost'), fixed = num('n-fixed'), goal = num('n-goal');
  var per = price - cost, ans = document.getElementById('n-answer'), ver = document.getElementById('n-verdict');
  if(per <= 0){
    ans.innerHTML = '<div class="big"><span class="mark">∞</span> customers</div><div class="line">every sale loses ' + money(-per) + '</div>';
    ver.innerHTML = '<b>Doesn\'t add up yet.</b> Each sale costs more than it earns, so more customers means bigger losses. Raise the price or cut the cost per sale.';
    return;
  }
  var need = Math.ceil((fixed + goal) / per), breakeven = Math.ceil(fixed / per), perDay = need / 30;
  var margin = Math.round(per / price * 100);
  ans.innerHTML = '<div class="big"><span class="mark">' + need.toLocaleString() + '</span> customers</div>' +
    '<div class="line">a month · ≈ ' + (perDay < 10 ? perDay.toFixed(1) : Math.round(perDay)) + ' a day · break-even at ' + breakeven.toLocaleString() + ' · ' + margin + '% margin</div>';
  var v;
  if(perDay <= 3) v = '<b>Doable on paper.</b> About ' + (perDay < 1 ? 'one sale every ' + Math.round(1 / perDay) + ' days' : perDay.toFixed(1) + ' sales a day') + '. The math works. Next question: will strangers actually pay ' + money(price) + '? Prove that before you build more.';
  else if(perDay <= 20) v = '<b>Possible, but it\'s a real business.</b> ' + Math.round(perDay) + ' sales a day takes steady marketing. Test whether a higher price still sells; it cuts this number fast.';
  else v = '<b>That\'s a lot of sales for one person.</b> ' + Math.round(perDay).toLocaleString() + ' a day needs serious traffic or a team. Raise the price, cut costs, or sell something bigger.';
  if(margin < 30 && per > 0) v += ' Your margin is thin (' + margin + '%), so small cost increases will hurt.';
  ver.innerHTML = v;
}
['n-price','n-cost','n-fixed','n-goal'].forEach(function(id){ document.getElementById(id).addEventListener('input', napkin); });
napkin();

/* ---------- waitlist ---------- */
var ENDPOINTS = {
  kit: function(id){ return 'https://app.kit.com/forms/' + encodeURIComponent(id) + '/subscriptions'; },
  formspree: function(id){ return 'https://formspree.io/f/' + encodeURIComponent(id); },
  formsubmit: function(id){ return 'https://formsubmit.co/ajax/' + encodeURIComponent(id); }
};
function send(email, stage){
  var p = WAITLIST.provider, id = WAITLIST.id;
  if(!ENDPOINTS[p] || !id) return Promise.reject(new Error('not-configured'));
  var url = ENDPOINTS[p](id);
  if(p === 'kit'){
    // Kit doesn't allow cross-site reads; a completed request means it was accepted.
    var body = new URLSearchParams({ email_address: email });
    return fetch(url, { method: 'POST', mode: 'no-cors', body: body });
  }
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email: email, stage: stage || '', source: 'sharp-home', _subject: 'New Sharp waitlist signup' })
  }).then(function(r){ if(!r.ok) throw new Error('http-' + r.status); return r; });
}
Array.prototype.forEach.call(document.querySelectorAll('form[data-waitlist]'), function(form){
  var msg = form.querySelector('.msg'), btn = form.querySelector('button[type=submit]');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var email = form.email.value.trim(), stage = form.stage ? form.stage.value : '';
    if(form.tier && form.tier.value) stage = (stage ? stage + ' · ' : '') + 'Wants: ' + form.tier.value;
    msg.className = 'msg';
    if(form._honey.value){ return; }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){
      msg.className = 'msg err'; msg.textContent = 'That email doesn\'t look right. Check it and try again.'; form.email.focus(); return;
    }
    btn.disabled = true; btn.textContent = 'Joining…';
    send(email, stage).then(function(){
      form.classList.add('done');
      msg.className = 'msg ok';
      msg.textContent = WAITLIST.provider === 'kit'
        ? 'Almost there: check your inbox and confirm your email (look in spam too).'
        : 'You\'re on the list. We\'ll email you when new tools and the course are ready.';
    }).catch(function(err){
      msg.className = 'msg err';
      msg.textContent = err && err.message === 'not-configured'
        ? 'The waitlist opens very soon. Please check back in a day or two.'
        : 'Couldn\'t join right now. Check your connection and try again.';
    }).then(function(){ btn.disabled = false; btn.textContent = 'Join the waitlist'; });
  });
});

/* ---------- accounts ---------- */
var dlg = document.getElementById('authDialog'), signinBtn = document.getElementById('signinBtn');
var authMsg = document.getElementById('authMsg'), reasonEl = document.getElementById('authReason');
var sb = null, user = null, pendingPlan = null;
var authReady = !!(AUTH.supabaseUrl && AUTH.supabaseAnonKey);
var PLAN_NAMES = { starter: 'Starter ($10)', builder: 'Builder ($40)', founder: 'Founder ($75)' };

function openAuth(reason){
  reasonEl.textContent = reason || ''; reasonEl.classList.toggle('on', !!reason);
  authMsg.className = 'msg'; authMsg.textContent = '';
  if(dlg.showModal){ if(!dlg.open) dlg.showModal(); } else { dlg.setAttribute('open', ''); }
}
function closeAuth(){ if(dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
dlg.addEventListener('click', function(e){ if(e.target === dlg || e.target.hasAttribute('data-close')) closeAuth(); });
signinBtn.addEventListener('click', function(){ openAuth(); });
document.getElementById('googleBtn').hidden = !(authReady && AUTH.google);
document.querySelector('.or').hidden = !(authReady && AUTH.google);

function render(){
  var who = user && user.email ? user.email : '';
  signinBtn.textContent = who ? 'Account' : 'Sign in';
  signinBtn.classList.toggle('in', !!who);
  dlg.classList.toggle('is-in', !!who);
  document.getElementById('authWho').textContent = who;
  document.getElementById('authTitle').textContent = who ? 'Your account' : 'Sign in to Sharp';
}

function notOpenYet(){
  authMsg.className = 'msg err';
  authMsg.innerHTML = 'Accounts open very soon. <a href="#top-form" data-close>Join the waitlist</a> and you\'ll be first in.';
}

if(authReady){
  var sc = document.createElement('script');
  sc.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
  sc.integrity = 'sha384-Rj26LVGvoeRVR6+mwQmFfcR3QOBEwT+ZmuCWpuiqeTzJpCs0ER4ITAWGb4Hiy3Ok'; sc.crossOrigin = 'anonymous';
  sc.onload = function(){
    sb = window.supabase.createClient(AUTH.supabaseUrl, AUTH.supabaseAnonKey);
    sb.auth.getSession().then(function(r){ user = r.data && r.data.session ? r.data.session.user : null; render(); resumePlan(); });
    sb.auth.onAuthStateChange(function(_e, session){ user = session ? session.user : null; render(); if(user) resumePlan(); });
  };
  sc.onerror = function(){ authReady = false; };
  document.head.appendChild(sc);
}

function redirectUrl(){ return location.origin + location.pathname; }

document.getElementById('emailForm').addEventListener('submit', function(e){
  e.preventDefault();
  var f = e.target, email = f.email.value.trim(), btn = f.querySelector('button');
  authMsg.className = 'msg';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ authMsg.className = 'msg err'; authMsg.textContent = 'That email doesn\'t look right. Check it and try again.'; return; }
  if(!authReady || !sb){ notOpenYet(); return; }
  btn.disabled = true; btn.textContent = 'Sending…';
  sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirectUrl() } }).then(function(r){
    if(r.error) throw r.error;
    authMsg.className = 'msg ok';
    authMsg.textContent = 'Check your inbox for a sign-in link (and your spam folder). You can close this window.';
  }).catch(function(err){
    authMsg.className = 'msg err';
    authMsg.textContent = err && err.status === 429 ? 'Too many tries. Wait a minute, then try again.' : 'Couldn\'t send the link. Check your email address and try again.';
  }).then(function(){ btn.disabled = false; btn.textContent = 'Email me a sign-in link'; });
});

document.getElementById('googleBtn').addEventListener('click', function(){
  if(!authReady || !sb){ notOpenYet(); return; }
  sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl() } });
});
document.getElementById('signOutBtn').addEventListener('click', function(){
  if(sb) sb.auth.signOut().then(function(){ user = null; render(); closeAuth(); });
});
dlg.addEventListener('click', function(e){
  var a = e.target.closest && e.target.closest('a[href="#top-form"]');
  if(a){ e.preventDefault(); closeAuth(); document.getElementById('wl-email-1').focus(); }
});

/* ---------- pricing ---------- */
function payUrl(plan){
  var u = PAY[plan]; if(!u) return '';
  var q = [];
  if(user && user.email) q.push('prefilled_email=' + encodeURIComponent(user.email));
  if(user && user.id) q.push('client_reference_id=' + encodeURIComponent(user.id));
  return u + (q.length ? (u.indexOf('?') < 0 ? '?' : '&') + q.join('&') : '');
}
function reserve(plan){
  var form = document.getElementById('join');
  form.tier.value = PLAN_NAMES[plan];
  var tag = document.getElementById('tierTag');
  tag.textContent = 'Reserving: ' + PLAN_NAMES[plan] + '. Join below and you\'ll get the link the day it opens.';
  tag.classList.add('on');
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(function(){ document.getElementById('wl-email-1').focus({ preventScroll: true }); }, 400);
}
function choose(plan){
  if(plan === 'free'){ openAuth(user ? '' : 'Free account: every lesson and tool, under one sign-in.'); return; }
  if(!PAY[plan]){ reserve(plan); return; }
  if(authReady && !user){
    pendingPlan = plan;
    try{ sessionStorage.setItem('np-plan', plan); }catch(e){}
    openAuth('Sign in first so your ' + PLAN_NAMES[plan] + ' purchase is saved to your account. You\'ll go straight to checkout after.');
    return;
  }
  location.href = payUrl(plan);
}
function resumePlan(){
  var plan = pendingPlan;
  if(!plan){ try{ plan = sessionStorage.getItem('np-plan'); }catch(e){} }
  if(plan && user && PAY[plan]){
    try{ sessionStorage.removeItem('np-plan'); }catch(e){}
    pendingPlan = null; location.href = payUrl(plan);
  }
}
Array.prototype.forEach.call(document.querySelectorAll('[data-plan]'), function(b){
  var plan = b.getAttribute('data-plan');
  b.addEventListener('click', function(){ choose(plan); });
  if(plan !== 'free' && !PAY[plan]){
    b.textContent = 'Reserve ' + PLAN_NAMES[plan].split(' ')[0];
    var n = document.querySelector('[data-note="' + plan + '"]');
    if(n) n.textContent = 'Opens soon. Reserve your spot, no payment yet.';
  } else if(plan !== 'free'){
    var n2 = document.querySelector('[data-note="' + plan + '"]');
    if(n2) n2.textContent = 'Secure checkout by Stripe.';
  }
});

if(location.hash === '#signin') openAuth();
render();
})();
