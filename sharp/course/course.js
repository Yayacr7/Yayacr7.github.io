/* Course player. Module text is NOT in this site's files: it loads from
   Supabase, where row-level security only returns modules the signed-in
   person has paid for (or has on an active trial). */
(function(){
"use strict";
var CFG = window.NP_CONFIG || {}, AUTH = CFG.AUTH || {};
var authReady = !!(AUTH.supabaseUrl && AUTH.supabaseAnonKey);
var OUTLINE = [
  ['m1', 'The idea check', 'Is the idea worth your evenings?'],
  ['m2', 'Price it so it pays you', 'Value-based pricing, rises and discounts'],
  ['m3', 'Unit economics without the jargon', 'What one customer is really worth'],
  ['m4', 'Cash: don\'t run out', 'The 13-week cash forecast'],
  ['m5', 'Negotiate your first deals', 'Suppliers, clients and partners'],
  ['m6', 'Fund it: save, borrow or raise', 'The cheapest money that does the job'],
  ['d1', 'Workbook & spreadsheets', '4 files for your own numbers'],
  ['k1', 'Essential negotiation scripts', 'Price pushback, discounts, deposits, late pay'],
  ['f1', 'The full script library', '10 more scripts for bigger deals'],
  ['f2', 'Investor pitch kit', 'Deck, emails, 30 questions, deal terms'],
  ['f3', '30-day launch plan', 'Idea to first paying customer']
];
var GROUPS = { m1: 'Launch course', d1: 'Files, scripts & kits' };
var FILE_RE = /^[A-Za-z0-9-]+\.xlsx$/, DEMO = false;
var sb = null, rows = null;
function $(id){ return document.getElementById(id); }
try{ var t = localStorage.getItem('np-theme'); if(t) document.documentElement.setAttribute('data-theme', t); }catch(e){}
($('themeBtn') || document.createElement('i')).addEventListener('click', function(){
  var r = document.documentElement, dark = r.getAttribute('data-theme') === 'dark' || (!r.getAttribute('data-theme') && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  r.setAttribute('data-theme', dark ? 'light' : 'dark'); try{ localStorage.setItem('np-theme', dark ? 'light' : 'dark'); }catch(e){}
});

function show(id){ ['st-off','st-out','st-none','st-founder','st-err'].forEach(function(s){ $(s).hidden = s !== id; }); $('moduleView').hidden = id !== 'module'; }
function current(){ var h = location.hash.replace('#', ''); return /^(m[1-6]|d1|k1|f[1-3])$/.test(h) ? h : 'm1'; }
function have(slug){ return !!(rows && rows.some(function(r){ return r.slug === slug; })); }

function renderNav(){
  var nav = $('mods'); nav.textContent = '';
  OUTLINE.forEach(function(o){
    if(GROUPS[o[0]]){ var gh = document.createElement('p'); gh.className = 'mods-h'; gh.textContent = GROUPS[o[0]]; nav.appendChild(gh); }
    var a = document.createElement('a'); a.className = 'mod' + (rows && !have(o[0]) ? ' locked' : ''); a.href = '#' + o[0];
    if(rows && o[0] === current()) a.setAttribute('aria-current', 'page');
    var n = document.createElement('span'); n.className = 'n'; n.textContent = o[0].charAt(0) === 'm' ? o[0].slice(1) : o[0] === 'k1' ? 'S' : o[0] === 'd1' ? 'W' : 'F' + o[0].slice(1);
    var tx = document.createElement('span'); var b = document.createElement('b'); b.textContent = o[1]; var sm = document.createElement('small'); sm.textContent = o[2];
    tx.appendChild(b); tx.appendChild(sm); a.appendChild(n); a.appendChild(tx); nav.appendChild(a);
  });
}
function renderModule(){
  renderNav();
  if(!rows) return;
  if(!rows.length){ show('st-none'); return; }
  var slug = current(), row = rows.filter(function(r){ return r.slug === slug; })[0];
  if(!row){ show(slug.charAt(0) === 'f' && have('m2') ? 'st-founder' : 'st-none'); return; }
  var idx = OUTLINE.map(function(o){ return o[0]; }).indexOf(slug), view = $('moduleView');
  view.textContent = '';
  var eb = document.createElement('span'); eb.className = 'eyebrow'; eb.textContent = slug === 'd1' ? 'Your files' : slug === 'k1' ? 'Scripts 1 to 4 of 14' : slug.charAt(0) === 'f' ? 'Founder kit ' + slug.slice(1) + ' of 3' : 'Module ' + slug.slice(1) + ' of 6'; view.appendChild(eb);
  var h = document.createElement('h1'); h.textContent = row.title; view.appendChild(h);
  var body = document.createElement('div');
  // Module HTML is written by the site owner and stored where only the owner can edit it.
  // The page's security policy also blocks any script inside it.
  body.innerHTML = row.body_html;
  view.appendChild(body);
  wireFiles(body);
  var pg = document.createElement('div'); pg.className = 'pager';
  var prev = OUTLINE[idx - 1], next = OUTLINE[idx + 1];
  var l = document.createElement('a'); if(prev){ l.href = '#' + prev[0]; l.textContent = '← ' + prev[1]; } pg.appendChild(l);
  var r = document.createElement('a'); if(next){ r.href = '#' + next[0]; r.textContent = next[1] + ' →'; } pg.appendChild(r);
  view.appendChild(pg);
  show('module'); window.scrollTo(0, 0);
}
// Spreadsheets live in a private storage bucket; a short-lived link is made only for people whose plan includes them.
function wireFiles(root){
  Array.prototype.forEach.call(root.querySelectorAll('[data-file]'), function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      var f = btn.getAttribute('data-file'); if(!FILE_RE.test(f)) return;
      if(DEMO){ location.href = 'files/' + f; return; }
      if(!sb) return;
      btn.textContent = 'Preparing…';
      sb.storage.from('sharp-files').createSignedUrl(f, 60, { download: f }).then(function(r){
        if(r.error || !r.data){ btn.textContent = 'Couldn\'t download. Try again'; return; }
        btn.textContent = 'Download'; location.href = r.data.signedUrl;
      });
    });
  });
}
window.addEventListener('hashchange', renderModule);

function load(){
  sb.from('premium_content').select('slug,title,body_html').in('slug', OUTLINE.map(function(o){ return o[0]; })).then(function(res){
    if(res.error){ show('st-err'); return; }
    rows = (res.data || []).sort(function(a, b){ return a.slug < b.slug ? -1 : 1; });
    renderModule();
  });
}

if(window.SHARP_COURSE_DEMO && location.hash.indexOf('demo') >= 0){
  // private preview only: demo data is never part of the live site
  $('previewBar').hidden = false; DEMO = true; rows = window.SHARP_COURSE_DEMO; history.replaceState(null, '', '#m1'); renderModule(); return;
}
renderNav();
if(!authReady){ show('st-off'); return; }
show('st-out');
var sc = document.createElement('script');
sc.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
sc.integrity = 'sha384-Rj26LVGvoeRVR6+mwQmFfcR3QOBEwT+ZmuCWpuiqeTzJpCs0ER4ITAWGb4Hiy3Ok'; sc.crossOrigin = 'anonymous';
sc.onload = function(){
  sb = window.supabase.createClient(AUTH.supabaseUrl, AUTH.supabaseAnonKey);
  sb.auth.getSession().then(function(r){ if(r.data && r.data.session){ $('signOutBtn').hidden = false; load(); } });
  sb.auth.onAuthStateChange(function(_e, s){ if(s && !rows){ $('signOutBtn').hidden = false; load(); } });
};
sc.onerror = function(){ show('st-err'); };
document.head.appendChild(sc);

$('emailForm').addEventListener('submit', function(e){
  e.preventDefault();
  var email = $('authEmail').value.trim(), msg = $('authMsg'), btn = e.target.querySelector('button');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ msg.className = 'msg err'; msg.textContent = 'That email doesn\'t look right.'; return; }
  if(!sb){ msg.className = 'msg err'; msg.textContent = 'Sign-in is still loading. Try again in a moment.'; return; }
  btn.disabled = true;
  sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + location.pathname } }).then(function(r){
    if(r.error) throw r.error;
    msg.className = 'msg ok'; msg.textContent = 'Check your inbox for your sign-in link.';
  }).catch(function(){ msg.className = 'msg err'; msg.textContent = 'Couldn\'t send the link. Check the address and try again.'; })
    .then(function(){ btn.disabled = false; });
});
$('signOutBtn').addEventListener('click', function(){ if(sb) sb.auth.signOut().then(function(){ location.reload(); }); });
})();
