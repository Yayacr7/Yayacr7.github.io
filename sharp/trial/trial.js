(function(){
"use strict";
var CFG = window.NP_CONFIG || {};
var AUTH = CFG.AUTH || {}, PAY = CFG.PAY || {}, DAYS = CFG.TRIAL_DAYS || 3;
var authReady = !!(AUTH.supabaseUrl && AUTH.supabaseAnonKey);
var DAY = 86400000, sb = null, user = null, tick = null;
function $(id){ return document.getElementById(id); }

/* theme follows the landing page's choice */
try{ var t = localStorage.getItem('np-theme'); if(t) document.documentElement.setAttribute('data-theme', t); }catch(e){}

function show(id){
  ['st-off','st-out','st-ended','st-area'].forEach(function(s){ $(s).hidden = s !== id; });
}

/* Access rules:
   - a paid plan (set on the account by the payment webhook) unlocks everything
   - otherwise access lasts TRIAL_DAYS from when the account was created.
   Note: this page is static, so the check runs in the browser. Paid course
   content must be served from Supabase behind a server-side check. */
function access(u, now){
  var plan = u && u.app_metadata && u.app_metadata.plan;
  if(plan === 'builder' || plan === 'founder') return { kind: 'paid', plan: plan };
  var start = new Date(u.created_at).getTime(), end = start + DAYS * DAY;
  return end > now ? { kind: 'trial', end: end } : { kind: 'ended', end: end };
}
function leftText(ms){
  var h = Math.max(0, Math.floor(ms / 3600000)), d = Math.floor(h / 24); h = h % 24;
  if(d > 0) return d + (d === 1 ? ' day ' : ' days ') + h + (h === 1 ? ' hour' : ' hours') + ' left';
  if(h > 0) return h + (h === 1 ? ' hour' : ' hours') + ' left';
  var m = Math.max(1, Math.ceil(ms / 60000));
  return m + (m === 1 ? ' minute' : ' minutes') + ' left';
}

function render(u, now){
  var pill = $('statusPill');
  $('signOutBtn').hidden = !u || demo;
  if(!u){ pill.hidden = true; show(authReady ? 'st-out' : 'st-off'); return; }
  var a = access(u, now);
  pill.hidden = false; pill.className = 'pill';
  if(a.kind === 'paid'){
    pill.textContent = (a.plan === 'founder' ? 'Founder' : 'Builder') + ' plan';
    $('countdown').hidden = true; show('st-area'); return;
  }
  if(a.kind === 'ended'){
    pill.textContent = 'Trial ended'; pill.className = 'pill ended';
    setBuyLinks(u); show('st-ended'); return;
  }
  var left = a.end - now;
  pill.textContent = 'Free trial · ' + leftText(left);
  $('leftText').textContent = leftText(left);
  $('leftSub').textContent = 'of your ' + DAYS + '-day Founder trial. Ends ' + new Date(a.end).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) + '.';
  $('countdown').hidden = false; show('st-area');
}

function payUrl(plan, u){
  var base = PAY[plan]; if(!base) return '';
  var q = [];
  if(u && u.email) q.push('prefilled_email=' + encodeURIComponent(u.email));
  if(u && u.id) q.push('client_reference_id=' + encodeURIComponent(u.id));
  return base + (q.length ? (base.indexOf('?') < 0 ? '?' : '&') + q.join('&') : '');
}
function setBuyLinks(u){
  var b = payUrl('builder', u), f = payUrl('founder', u);
  if(b) $('buyBuilder').href = b;
  if(f) $('buyFounder').href = f;
  $('buyNote').textContent = (b || f) ? 'Secure checkout by Stripe.' : 'Paid plans open soon. These buttons take you to pricing to reserve a spot.';
}

/* ---------- demo / preview (#demo, #demo-ended) ---------- */
var demo = /^#demo/.test(location.hash);
function runDemo(){
  var ended = location.hash === '#demo-ended', now = Date.now();
  var created = ended ? now - (DAYS + 1) * DAY : now - (DAY + 9.5 * 3600000);
  $('previewBar').hidden = false;
  render({ id: 'preview', email: 'you@example.com', created_at: new Date(created).toISOString(), app_metadata: {} }, now);
}

/* ---------- live accounts ---------- */
function startLive(){
  if(!authReady){ render(null, Date.now()); return; }
  show('st-out');
  $('googleBtn').hidden = $('orLine').hidden = !AUTH.google;
  var sc = document.createElement('script');
  sc.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
  sc.integrity = 'sha384-Rj26LVGvoeRVR6+mwQmFfcR3QOBEwT+ZmuCWpuiqeTzJpCs0ER4ITAWGb4Hiy3Ok'; sc.crossOrigin = 'anonymous';
  sc.onload = function(){
    sb = window.supabase.createClient(AUTH.supabaseUrl, AUTH.supabaseAnonKey);
    sb.auth.getSession().then(function(r){ user = r.data && r.data.session ? r.data.session.user : null; render(user, Date.now()); });
    sb.auth.onAuthStateChange(function(_e, s){ user = s ? s.user : null; render(user, Date.now()); });
    clearInterval(tick); tick = setInterval(function(){ if(user) render(user, Date.now()); }, 60000);
  };
  sc.onerror = function(){ $('authMsg').className = 'msg err'; $('authMsg').textContent = 'Couldn\'t load sign-in. Check your connection and refresh.'; };
  document.head.appendChild(sc);
}

$('emailForm').addEventListener('submit', function(e){
  e.preventDefault();
  var email = $('authEmail').value.trim(), btn = e.target.querySelector('button'), msg = $('authMsg');
  msg.className = 'msg';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ msg.className = 'msg err'; msg.textContent = 'That email doesn\'t look right. Check it and try again.'; return; }
  if(!sb){ msg.className = 'msg err'; msg.textContent = 'Sign-in is still loading. Try again in a moment.'; return; }
  btn.disabled = true; btn.textContent = 'Sending…';
  sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + location.pathname } }).then(function(r){
    if(r.error) throw r.error;
    msg.className = 'msg ok'; msg.textContent = 'Check your inbox for your sign-in link (and your spam folder). Your 3 days start when your account is created.';
  }).catch(function(err){
    msg.className = 'msg err';
    msg.textContent = err && err.status === 429 ? 'Too many tries. Wait a minute, then try again.' : 'Couldn\'t send the link. Check your email address and try again.';
  }).then(function(){ btn.disabled = false; btn.textContent = 'Start my free trial'; });
});
$('googleBtn').addEventListener('click', function(){ if(sb) sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }); });
$('signOutBtn').addEventListener('click', function(){ if(sb) sb.auth.signOut(); });

/* ---------- module 1 quiz ---------- */
$('m1check').addEventListener('click', function(){
  var right = 0, qs = document.querySelectorAll('#m1quiz .q');
  Array.prototype.forEach.call(qs, function(q){
    var a = Number(q.getAttribute('data-a')), opts = q.querySelectorAll('input'), fb = q.querySelector('.fb'), picked = -1;
    Array.prototype.forEach.call(opts, function(o, i){ if(o.checked) picked = i; });
    var ok = picked === a; if(ok) right++;
    fb.style.color = ok ? 'var(--good)' : 'var(--bad)';
    fb.textContent = ok ? 'Correct.' : (picked < 0 ? 'Pick an answer. ' : 'Not quite. ') + (q === qs[0]
      ? '(200 + 1,800) ÷ (30 − 10) = 2,000 ÷ 20 = 100 customers.'
      : 'Assuming more customers is the free-on-paper fix that fails in real life. Change the price or the product, then re-run the numbers.');
    if(ok && q === qs[0]) fb.textContent = 'Correct. (200 + 1,800) ÷ 20 = 100.';
  });
});

/* ---------- startup cost calculator ---------- */
function v(id){ var n = parseFloat($(id).value); return isFinite(n) && n > 0 ? n : 0; }
function money(n){ return (n < 0 ? '−$' : '$') + Math.round(Math.abs(n)).toLocaleString(); }
function calc(){
  var once = v('c-eq') + v('c-web') + v('c-legal') + v('c-stock') + v('c-other1');
  var monthly = v('c-soft') + v('c-mkt') + v('c-rent') + v('c-other2');
  var months = v('c-months'), savings = v('c-savings');
  var base = once + monthly * months, need = base * 1.2, gap = savings - need;
  var runway = monthly > 0 ? (savings - once) / monthly : Infinity;
  var verdict = gap >= 0
    ? '<b>Covered</b>, with ' + money(gap) + ' to spare. Keep that spare cash untouched; it\'s your safety net if sales come slower than planned.'
    : '<b>You\'re short by ' + money(-gap) + '.</b> Cut a one-time cost (stock is usually the biggest), start smaller, or pre-sell to bring cash in before you spend it.';
  if(savings > 0 && savings < once) verdict += ' Your savings don\'t cover even the one-time costs.';
  $('costResult').innerHTML =
    '<div class="k">Cash you need to start</div><div class="big">' + money(need) + '</div>' +
    '<div class="lines"><div><span>One-time costs</span>' + money(once) + '</div><div><span>Monthly costs</span>' + money(monthly) + ' / mo</div>' +
    '<div><span>Runway on your savings</span>' + (runway === Infinity ? 'No monthly costs' : runway <= 0 ? 'None' : runway.toFixed(1) + ' months') + '</div></div>' +
    '<div class="verdict">' + verdict + '</div>';
}
$('costCalc').addEventListener('input', calc);
$('costCalc').addEventListener('submit', function(e){ e.preventDefault(); });
calc();

if(demo) runDemo(); else startLive();
window.addEventListener('hashchange', function(){ if(/^#demo/.test(location.hash)){ demo = true; runDemo(); } });
})();
