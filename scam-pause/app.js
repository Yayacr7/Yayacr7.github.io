/* Scam Pause app. Messages people paste are untrusted data:
   - they are only matched by analyze.js (fixed rules, no AI), never run or followed;
   - they are shown as text (escaped, or set with textContent), never as HTML;
   - links inside them are never opened, fetched or made tappable.
   The only outside request is the optional registration lookup, which sends only a
   website name (never the message) and only after the person taps the button. */
(function () {
  'use strict';
  var A = window.SPAnalyze, C = window.SPContent;
  var view = document.getElementById('view');
  var state = { kind: 'text', draftText: '', draftSender: '', mode: 'paste', result: null, fromSample: null, savedId: null, tab: 'findings', ext: {}, ocr: null, ocrLoading: null };
  var KINDS = [['text', 'Text message'], ['email', 'Email'], ['listing', 'Listing or marketplace'], ['payment', 'Payment request'], ['unknown', 'Not sure']];
  var LEVEL = { strong: 'Warning sign', caution: 'Watch out', verify: 'Check this' };
  var STORE_KEY = 'scampause.v1';

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, el) { return (el || view).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || view).querySelectorAll(s)); }
  function toast(m) { var t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  function fmtDate(ts) { var d = new Date(ts); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
  function niceChecked(ymd) { var p = ymd.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }); }
  function icon(status) {
    if (status === 'warning') return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.5 20h19z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 10v4.5M12 17.5v.1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
    if (status === 'verify') return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m20 20-3.8-3.8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
    return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17v.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }

  /* ---------- storage (this device only; works even if storage is blocked) ---------- */
  var mem = { saved: [], prefs: {} };
  function load() { try { var j = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); if (j && Array.isArray(j.saved)) mem = { saved: j.saved, prefs: j.prefs || {} }; } catch (e) { /* blocked or damaged: start empty */ } }
  function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(mem)); return true; } catch (e) { return false; } }
  function savedById(id) { for (var i = 0; i < mem.saved.length; i++) if (mem.saved[i].id === id) return mem.saved[i]; return null; }

  /* ---------- large text ---------- */
  var ts = document.getElementById('textsize');
  function applyText() { var on = !!mem.prefs.bigText; document.documentElement.classList.toggle('big', on); ts.setAttribute('aria-pressed', on ? 'true' : 'false'); ts.textContent = on ? 'Normal text' : 'Larger text'; }
  ts.addEventListener('click', function () { mem.prefs.bigText = !mem.prefs.bigText; persist(); applyText(); });

  /* ---------- routing ---------- */
  function route() { var h = location.hash.replace(/^#\/?/, ''); var parts = h.split('/'); return { name: parts[0] || 'home', arg: parts[1] || '' }; }
  function setNav(name) { $$('[data-nav]', document).forEach(function (a) { if (a.getAttribute('data-nav') === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
  function render() {
    var r = route();
    var fn = { home: home, check: check, result: result, saved: saved, privacy: privacy, about: about }[r.name] || home;
    view.className = '';
    setNav(r.name === 'result' ? 'check' : r.name);
    fn(r.arg);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', function () { render(); view.focus({ preventScroll: true }); });

  /* ---------- Home ---------- */
  function home() {
    document.title = 'Scam Pause';
    var recent = mem.saved.slice(0, 3);
    view.innerHTML =
      '<section class="hero">' +
        '<h1>Check before you trust.</h1>' +
        '<p class="lead">Got a text, email, listing or payment request that feels off? Paste it here. Scam Pause shows the warning signs in plain words and what to do next.</p>' +
        '<a class="btn primary big-btn" href="#/check" id="h-check">Check a message</a>' +
        '<p style="margin-top:14px"><button class="link-btn" id="h-sample" type="button">Or try a sample message</button></p>' +
        '<div class="promise">' +
          '<div><b>It never says "safe"</b>Words alone cannot prove a message is real. It tells you what to check.</div>' +
          '<div><b>Stays on your device</b>The check runs in your browser. Nothing is sent or saved unless you choose.</div>' +
          '<div><b>Never asks for secrets</b>No passwords, codes or card numbers. Ever.</div>' +
        '</div>' +
      '</section>' +
      (recent.length ? '<section class="card" style="margin-top:24px"><h2>Your saved checks</h2>' + recent.map(savedRow).join('') + '<p style="margin:10px 0 0"><a href="#/saved">See all saved checks</a></p></section>' : '');
    $('#h-sample').addEventListener('click', function () { go('#/check'); setTimeout(function () { var s = $('#samples'); if (s) { s.open = true; s.scrollIntoView({ block: 'start' }); } }, 30); });
    bindSavedRows();
  }

  /* ---------- Check ---------- */
  function check() {
    document.title = 'Check a message · Scam Pause';
    view.innerHTML =
      '<h1>Check a message</h1>' +
      '<p class="muted">Paste the whole message, or add a screenshot. Include who sent it if you can.</p>' +
      '<div class="seg" role="tablist" aria-label="How to add the message">' +
        '<button type="button" role="tab" id="m-paste" aria-selected="' + (state.mode === 'paste') + '">Paste text</button>' +
        '<button type="button" role="tab" id="m-shot" aria-selected="' + (state.mode === 'shot') + '">Screenshot</button>' +
      '</div>' +
      '<div class="card" style="margin-top:12px">' +
        '<div class="stack">' +
          '<div><label id="k-label">What is it?</label><div class="chips" role="group" aria-labelledby="k-label">' +
            KINDS.map(function (k) { return '<button type="button" class="chip" data-kind="' + k[0] + '" aria-pressed="' + (state.kind === k[0]) + '">' + k[1] + '</button>'; }).join('') +
          '</div></div>' +
          '<div id="shot-area"' + (state.mode === 'shot' ? '' : ' hidden') + '>' +
            '<label for="shot-file">Screenshot</label>' +
            '<input type="file" id="shot-file" accept="image/*">' +
            '<p class="hint">The text is read on this device. The picture is not uploaded or saved. Reading can make mistakes, so check the text below matches the picture.</p>' +
            '<div id="shot-status"></div>' +
          '</div>' +
          '<div><label for="msg">The message</label>' +
            '<textarea id="msg" placeholder="Paste the message here" spellcheck="false">' + esc(state.draftText) + '</textarea>' +
            '<p class="hint">Remove any real passwords, codes or card numbers first. Scam Pause never needs them.</p></div>' +
          '<div><label for="sender">Who sent it? <span class="muted" style="font-weight:500">(optional: phone number, email address or seller name)</span></label>' +
            '<input type="text" id="sender" autocomplete="off" spellcheck="false" value="' + esc(state.draftSender) + '"></div>' +
          '<div class="row"><button class="primary big-btn" id="go" type="button">Check it</button><button type="button" id="clear">Clear</button></div>' +
        '</div>' +
      '</div>' +
      '<details class="card flat" id="samples"><summary style="cursor:pointer;font-weight:700;color:var(--ink)">Try a sample message</summary>' +
        '<p class="hint" style="margin-top:8px">These are made up for demonstration. Names, numbers and links in them are fake.</p>' +
        '<div class="samples">' + C.SAMPLES.map(function (s) { return '<button type="button" class="sample" data-sample="' + s.id + '"><span class="tag-sample">SAMPLE</span> ' + esc(s.label) + '</button>'; }).join('') + '</div>' +
      '</details>';

    var msg = $('#msg'), snd = $('#sender');
    msg.addEventListener('input', function () { state.draftText = msg.value; state.fromSample = null; });
    snd.addEventListener('input', function () { state.draftSender = snd.value; });
    $$('[data-kind]').forEach(function (b) { b.addEventListener('click', function () { state.kind = b.getAttribute('data-kind'); $$('[data-kind]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); }); });
    $('#m-paste').addEventListener('click', function () { state.mode = 'paste'; check(); });
    $('#m-shot').addEventListener('click', function () { state.mode = 'shot'; check(); });
    $('#clear').addEventListener('click', function () { state.draftText = ''; state.draftSender = ''; state.fromSample = null; check(); $('#msg').focus(); });
    $$('[data-sample]').forEach(function (b) { b.addEventListener('click', function () {
      var s = C.SAMPLES.filter(function (x) { return x.id === b.getAttribute('data-sample'); })[0];
      state.draftText = s.text; state.draftSender = s.sender; state.kind = s.kind; state.fromSample = s.label; state.mode = 'paste';
      runCheck();
    }); });
    $('#go').addEventListener('click', runCheck);
    var f = $('#shot-file'); if (f) f.addEventListener('change', function () { if (f.files && f.files[0]) readShot(f.files[0]); f.value = ''; });
  }
  function runCheck() {
    var text = (state.draftText || '').trim();
    if (!text) { toast('Paste a message first.'); var m = $('#msg'); if (m) m.focus(); return; }
    if (text.length > 20000) { toast('That is very long. Only the first 20,000 characters were checked.'); text = text.slice(0, 20000); }
    state.result = A.analyze({ text: text, sender: state.draftSender, kind: state.kind });
    state.result.sample = state.fromSample;
    state.result.checkedAt = Date.now();
    state.savedId = null; state.tab = 'findings'; state.ext = {};
    go('#/result');
  }

  /* ---------- screenshot reading (Tesseract.js, files on this site, no upload) ---------- */
  var OCR_BASE = '../screenshot-done/vendor/ocr/';
  function abs(p) { return new URL(p, location.href).href; }
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('load')); }; document.head.appendChild(s); }); }
  var ocrProgress = null;
  function getOcr() {
    if (state.ocr) return Promise.resolve(state.ocr);
    if (state.ocrLoading) return state.ocrLoading;
    state.ocrLoading = (window.Tesseract ? Promise.resolve() : loadScript(OCR_BASE + 'tesseract.min.js')).then(function () {
      return window.Tesseract.createWorker('eng', 1, { workerPath: abs(OCR_BASE + 'worker.min.js'), corePath: abs(OCR_BASE), langPath: abs(OCR_BASE + 'lang'), gzip: true, cacheMethod: 'write', logger: function (m) { if (ocrProgress) ocrProgress(m); } });
    }).then(function (w) { state.ocr = w; return w; }).catch(function (e) { state.ocrLoading = null; throw e; });
    return state.ocrLoading;
  }
  function readShot(file) {
    var box = $('#shot-status');
    if (!/^image\//.test(file.type)) { box.innerHTML = '<p class="note">That is not a picture. Choose a screenshot (PNG or JPG).</p>'; return; }
    var url = URL.createObjectURL(file);
    box.innerHTML = '<img class="shot" alt="Your screenshot (only shown here, not saved)" src="' + url + '"><p class="small muted" id="ocr-msg" style="margin-top:8px">Reading the text on this device…</p><div class="progress" aria-hidden="true"><i id="ocr-bar"></i></div>';
    ocrProgress = function (m) { var bar = document.getElementById('ocr-bar'); if (bar && m.status === 'recognizing text') bar.style.width = Math.round(m.progress * 100) + '%'; };
    getOcr().then(function (w) { return w.recognize(file); }).then(function (out) {
      var text = (out && out.data && out.data.text || '').replace(/\n{3,}/g, '\n\n').trim();
      var msgEl = document.getElementById('ocr-msg');
      if (!text) { if (msgEl) msgEl.textContent = 'No text could be read from this picture. Try a clearer screenshot, or paste the text instead.'; return; }
      state.draftText = text; state.fromSample = null;
      var ta = $('#msg'); if (ta) ta.value = text;
      if (msgEl) msgEl.textContent = 'Text read. Check it matches the screenshot and fix any mistakes, then tap Check it.';
      var bar = document.getElementById('ocr-bar'); if (bar) bar.style.width = '100%';
    }).catch(function () {
      var msgEl = document.getElementById('ocr-msg');
      if (msgEl) msgEl.textContent = 'The screenshot reader could not start here (it needs to download about 11 MB the first time). Paste the text instead.';
    }).then(function () { setTimeout(function () { URL.revokeObjectURL(url); }, 60000); });
  }

  /* ---------- Result ---------- */
  function result(arg) {
    var r = state.result;
    if (arg) { var sv = savedById(arg); if (!sv) { go('#/saved'); return; } if (sv.text) { r = A.analyze({ text: sv.text, sender: sv.sender || '', kind: sv.kind }); r.checkedAt = sv.at; r.sample = sv.sample; state.result = r; state.savedId = sv.id; } else { savedSummary(sv); return; } }
    if (!r) { go('#/check'); return; }
    document.title = r.statusLabel + ' · Scam Pause';
    view.className = 'wide';
    var tab = state.tab;
    view.innerHTML =
      (r.sample ? '<p class="small"><span class="tag-sample">SAMPLE</span> Made-up demonstration message: ' + esc(r.sample) + '</p>' : '') +
      '<section class="status ' + r.status + '" aria-labelledby="st-h">' +
        '<h1 id="st-h">' + icon(r.status) + esc(r.statusLabel) + '</h1>' +
        '<p style="margin:0">' + esc(r.statusLine) + '</p>' +
        '<p class="why">Scam Pause checked the words only. It cannot see who really sent this, and it never decides a message is safe.' + (r.findings.length ? ' Found: ' + countLine(r) + '.' : '') + '</p>' +
      '</section>' +
      '<div class="tabs" role="tablist" aria-label="Result sections">' +
        tabBtn('findings', 'Findings') + tabBtn('next', 'What to do next') + tabBtn('report', 'Report it') +
      '</div>' +
      '<div id="panel" role="tabpanel"></div>' +
      '<div class="row" style="margin-top:20px">' +
        '<a class="btn primary" href="#/check" id="again">Check another message</a>' +
        (state.savedId ? '<button type="button" class="danger" id="del-this">Delete this saved check</button>' : '<button type="button" id="save">Save this check</button>') +
      '</div>';
    function tabBtn(id, label) { return '<button type="button" role="tab" data-tab="' + id + '" aria-selected="' + (tab === id) + '">' + label + '</button>'; }
    $$('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { state.tab = b.getAttribute('data-tab'); $$('[data-tab]').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); }); panel(); }); });
    $('#again').addEventListener('click', function () { state.draftText = ''; state.draftSender = ''; state.fromSample = null; });
    var sb = $('#save'); if (sb) sb.addEventListener('click', saveDialog);
    var db = $('#del-this'); if (db) db.addEventListener('click', function () { if (confirm('Delete this saved check from this device?')) { mem.saved = mem.saved.filter(function (x) { return x.id !== state.savedId; }); persist(); toast('Deleted.'); go('#/saved'); } });
    panel();
  }
  function countLine(r) {
    var parts = [];
    if (r.counts.strong) parts.push(r.counts.strong + ' warning sign' + (r.counts.strong > 1 ? 's' : ''));
    if (r.counts.caution) parts.push(r.counts.caution + ' thing' + (r.counts.caution > 1 ? 's' : '') + ' to watch out for');
    if (r.counts.verify) parts.push(r.counts.verify + ' claim' + (r.counts.verify > 1 ? 's' : '') + ' to check');
    return parts.join(', ');
  }
  function panel() {
    var r = state.result, p = $('#panel');
    if (state.tab === 'next') { p.innerHTML = nextHtml(r); return; }
    if (state.tab === 'report') { p.innerHTML = reportHtml(r); return; }
    p.innerHTML =
      '<section class="card"><h2>The message</h2><p class="hint">Highlighted parts are explained below. Links are shown broken up with [.] and are not opened.</p>' +
        '<div class="msg" id="msgview" tabindex="0" role="region" aria-label="The message you checked"></div>' +
        '<div class="legend" aria-hidden="true"><span class="l-strong">Warning sign</span><span class="l-caution">Watch out</span><span class="l-verify">Check this</span></div>' +
      '</section>' +
      '<section aria-labelledby="f-h"><h2 id="f-h">What we found</h2>' +
        (r.findings.length ? r.findings.map(findingHtml).join('') : '<div class="finding"><p style="margin:0">None of the warning signs Scam Pause looks for were found in the words. That is <b>not</b> the same as safe: careful scams can look normal. If the message asks you to do anything (pay, sign in, call, reply), check through a channel you already trust first.</p></div>') +
      '</section>' +
      (r.links.length ? '<section class="card" style="margin-top:16px"><h2>Links in the message</h2><p class="hint">Not opened. Shown so you can see where they claim to go.</p>' + r.links.map(function (l) { return '<div style="margin-bottom:10px"><span class="linkrow">' + esc(l.display) + '</span>' + (l.notes.length ? '<p class="small" style="margin:4px 0 0">' + l.notes.map(esc).join(' ') + '</p>' : '<p class="small muted" style="margin:4px 0 0">Website name: ' + esc(l.domain) + '</p>') + '</div>'; }).join('') + '</section>' : '') +
      (r.sender ? '<section class="card"><h2>Sender</h2><p class="linkrow">' + esc(r.sender.raw) + '</p>' + (r.sender.notes.length ? '<p class="small" style="margin:6px 0 0">' + r.sender.notes.map(esc).join(' ') + '</p>' : '<p class="small muted" style="margin:6px 0 0">Sender names and numbers can be faked, so this alone does not tell you who sent it.</p>') + '</section>' : '') +
      '<section class="card flat"><h2>What Scam Pause cannot tell you</h2><ul class="cant">' +
        '<li>Who really sent this. Names, numbers and email addresses can be faked.</li>' +
        '<li>Whether a link or website is safe. It does not open links.</li>' +
        '<li>Whether the text, a voice or a picture was made by AI. No tool can tell that reliably.</li>' +
        '<li>New scam tricks that use words it does not know yet.</li>' +
      '</ul></section>' +
      extHtml(r);
    paintMessage($('#msgview'), r);
    bindExt(r);
  }
  function findingHtml(f) {
    return '<article class="finding"><h3><span class="lvl ' + f.level + '">' + LEVEL[f.level] + '</span><span>' + esc(f.title) + '</span></h3>' +
      '<p style="margin:0 0 6px">' + esc(f.explain) + '</p>' +
      (f.evidence.length ? '<div class="ev"><span class="small muted">From the message:</span>' + f.evidence.map(function (e) { return '<q>' + esc(e) + '</q>'; }).join('') + '</div>' : '') +
      '</article>';
  }
  // Builds the highlighted message with text nodes only (never innerHTML), so nothing in it can run.
  function paintMessage(el, r) {
    var t = r.text, at = 0;
    r.spans.forEach(function (s) {
      if (s.start > at) el.appendChild(document.createTextNode(A.defangText(t.slice(at, s.start))));
      var m = document.createElement('mark');
      m.className = s.level;
      var piece = t.slice(s.start, s.end);
      m.textContent = s.id === 'link' ? A.defang(piece) : A.defangText(piece);
      m.title = LEVEL[s.level];
      el.appendChild(m);
      at = s.end;
    });
    if (at < t.length) el.appendChild(document.createTextNode(A.defangText(t.slice(at))));
  }

  /* ---------- outside check: website registration date (optional, asks first) ---------- */
  function extHtml(r) {
    var domains = [];
    r.links.forEach(function (l) { if (domains.indexOf(l.domain) < 0 && /^[a-z0-9.-]+\.[a-z]{2,24}$/.test(l.domain)) domains.push(l.domain); });
    if (r.sender && r.sender.domain && domains.indexOf(r.sender.domain) < 0) domains.push(r.sender.domain);
    return '<section class="ext" aria-labelledby="x-h"><h2 id="x-h">Checks with outside services</h2>' +
      '<p class="small" style="margin-bottom:10px">Everything above came from reading the words on your device. This part is separate: it asks a public service and shows where the answer came from and when.</p>' +
      (domains.length ? domains.slice(0, 4).map(function (d) { var st = state.ext[d]; return '<div class="finding" data-ext="' + esc(d) + '"><h3><span class="pill">Website registration date</span><span class="linkrow" style="display:inline">' + esc(A.defang(d)) + '</span></h3>' + extBody(d, st) + '</div>'; }).join('') :
        '<p class="small muted" style="margin:0">No website names in this message to look up.</p>') +
      '<p class="small muted" style="margin:10px 0 0">Not built yet: checking links against phishing block lists (needs a service with an API key and a small server). Until then, treat every link in an unexpected message as unverified.</p>' +
    '</section>';
  }
  function extBody(d, st) {
    if (!st) return '<p class="small" style="margin:0 0 8px">Look up when this website name was first registered. This sends <b>only the website name</b> (' + esc(d) + ') to rdap.org, a public registration lookup. Not the message, not the full link.</p><button type="button" data-lookup="' + esc(d) + '">Look up registration date</button>';
    if (st.loading) return '<p class="small" style="margin:0">Looking up…</p>';
    if (st.error) return '<p style="margin:0 0 4px"><b>Unavailable right now.</b> ' + esc(st.error) + ' This is not a sign either way.</p><p class="src">Tried: rdap.org · ' + esc(fmtDate(st.at)) + '</p><button type="button" data-lookup="' + esc(d) + '">Try again</button>';
    var days = Math.floor((st.at - new Date(st.reg).getTime()) / 864e5);
    var line = days < 90
      ? '<b>Registered ' + (days <= 1 ? 'in the last day' : days + ' days ago') + '</b> (' + esc(new Date(st.reg).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })) + '). Brand-new website names are common in scams, though new real businesses have them too.'
      : '<b>Registered ' + esc(new Date(st.reg).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })) + '</b>. An older website name is not proof of safety: scammers also use old or hacked websites.';
    return '<p style="margin:0">' + line + '</p><p class="src">Source: public registration data (RDAP) via rdap.org' + (st.server ? ', answered by ' + esc(st.server) : '') + ' · looked up ' + esc(fmtDate(st.at)) + '</p>';
  }
  function bindExt(r) {
    $$('[data-lookup]').forEach(function (b) { b.addEventListener('click', function () { lookup(b.getAttribute('data-lookup')); }); });
  }
  function refreshExt(d) { var box = $('[data-ext="' + (window.CSS && CSS.escape ? CSS.escape(d) : d) + '"]'); if (!box) return; var h = box.querySelector('h3').outerHTML; box.innerHTML = h + extBody(d, state.ext[d]); bindExt(); }
  function lookup(d) {
    if (!/^[a-z0-9.-]+\.[a-z]{2,24}$/.test(d)) return;
    state.ext[d] = { loading: true }; refreshExt(d);
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
    fetch('https://rdap.org/domain/' + encodeURIComponent(d), { credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined, headers: { Accept: 'application/rdap+json, application/json' } })
      .then(function (res) {
        if (res.status === 404) throw new Error('No registration record was found for this name (it may not exist, or this registry does not publish it).');
        if (!res.ok) throw new Error('The lookup service answered with an error (' + res.status + ').');
        return res.json().then(function (j) { return { j: j, server: (function () { try { return new URL(res.url).host; } catch (e) { return ''; } })() }; });
      })
      .then(function (o) {
        var ev = (o.j && o.j.events || []).filter(function (e) { return e.eventAction === 'registration'; })[0];
        if (!ev || isNaN(new Date(ev.eventDate).getTime())) throw new Error('The record did not include a registration date.');
        state.ext[d] = { reg: ev.eventDate, at: Date.now(), server: o.server };
      })
      .catch(function (e) { state.ext[d] = { error: e && e.name === 'AbortError' ? 'The lookup took too long.' : (e && e.message && !/fetch|network|load/i.test(e.message) ? e.message : 'Could not reach the lookup service.'), at: Date.now() }; })
      .then(function () { clearTimeout(timer); refreshExt(d); });
  }

  /* ---------- next steps + reporting ---------- */
  function nextHtml(r) {
    return '<h2>What to do next</h2><ol class="steps">' + C.nextSteps(r).map(function (s) { return '<li data-step="' + s.id + '"><b>' + esc(s.title) + '</b>' + esc(s.body) + '</li>'; }).join('') + '</ol>';
  }
  function reportHtml(r) {
    return '<h2>Report it</h2><p class="muted">Official places to report, for people in the United States. Outside the US, use your country\'s official consumer protection or police website.</p>' +
      C.guidanceFor(r).map(function (g) {
        return '<article class="card guide" data-guide="' + g.id + '"><h3>' + esc(g.title) + '</h3><ul>' + g.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' +
          '<p class="src">Source: <a href="' + esc(g.url) + '" target="_blank" rel="noopener noreferrer">' + esc(g.source) + '</a><br>Checked ' + esc(niceChecked(g.checked)) + ' by searching the official site. Guidance can change: open the page for the latest.</p></article>';
      }).join('');
  }

  /* ---------- saving (off unless chosen) ---------- */
  function saveDialog() {
    var r = state.result;
    var bg = document.createElement('div');
    bg.setAttribute('style', 'position:fixed;inset:0;background:rgba(20,33,61,.45);display:grid;place-items:center;padding:16px;z-index:40');
    bg.innerHTML = '<div class="card" role="dialog" aria-modal="true" aria-labelledby="sv-h" style="max-width:480px;width:100%;margin:0">' +
      '<h2 id="sv-h">Save this check?</h2><p class="small">Saved checks stay only in this browser on this device. You can delete them any time in Privacy.</p>' +
      '<label class="switch"><input type="radio" name="sv" value="summary" checked><span><b>Save the findings only</b><br><span class="small muted">The result and the warning sign names. Not the message.</span></span></label>' +
      '<label class="switch" style="margin-top:10px"><input type="radio" name="sv" value="full"><span><b>Save the findings and the message text</b><br><span class="small muted">Lets you see the highlights again later.</span></span></label>' +
      '<div class="row" style="margin-top:16px"><button type="button" class="primary" id="sv-ok">Save</button><button type="button" id="sv-no">Cancel</button></div></div>';
    document.body.appendChild(bg);
    bg.querySelector('#sv-ok').focus();
    function close() { bg.remove(); }
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    bg.querySelector('#sv-no').addEventListener('click', close);
    bg.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    bg.querySelector('#sv-ok').addEventListener('click', function () {
      var full = bg.querySelector('input[value=full]').checked;
      var rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: r.checkedAt || Date.now(), kind: r.kind, status: r.status, statusLabel: r.statusLabel, sample: r.sample || null,
        findings: r.findings.map(function (f) { return { id: f.id, level: f.level, title: f.title }; }), preview: full ? r.text.slice(0, 90) : '' };
      if (full) { rec.text = r.text; rec.sender = r.sender ? r.sender.raw : ''; }
      mem.saved.unshift(rec);
      var ok = persist();
      close();
      state.savedId = rec.id;
      toast(ok ? 'Saved on this device.' : 'Saved for now, but this browser blocks storage, so it will be gone when you close the page.');
      result();
    });
  }
  function savedRow(s) {
    return '<div class="saved-item finding"><div><b>' + esc(s.statusLabel) + '</b>' + (s.sample ? ' <span class="tag-sample">SAMPLE</span>' : '') +
      '<div class="meta">' + esc(fmtDate(s.at)) + ' · ' + esc(kindName(s.kind)) + ' · ' + s.findings.length + ' finding' + (s.findings.length === 1 ? '' : 's') + (s.text ? ' · message kept' : ' · message not kept') + '</div>' +
      (s.preview ? '<div class="small muted" style="margin-top:2px">' + esc(s.preview) + (s.text && s.text.length > 90 ? '…' : '') + '</div>' : '') + '</div>' +
      '<div class="row"><a class="btn" href="#/result/' + esc(s.id) + '">Open</a><button type="button" class="danger" data-del="' + esc(s.id) + '">Delete</button></div></div>';
  }
  function kindName(k) { for (var i = 0; i < KINDS.length; i++) if (KINDS[i][0] === k) return KINDS[i][1]; return 'Message'; }
  function bindSavedRows() {
    $$('[data-del]').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-del'); mem.saved = mem.saved.filter(function (x) { return x.id !== id; }); persist(); toast('Deleted.'); render(); }); });
  }
  function savedSummary(sv) {
    document.title = sv.statusLabel + ' · Scam Pause';
    view.innerHTML = '<section class="status ' + esc(sv.status) + '"><h1>' + icon(sv.status) + esc(sv.statusLabel) + '</h1><p style="margin:0">Saved ' + esc(fmtDate(sv.at)) + '. The message text was not kept, so only the findings are shown.</p></section>' +
      (sv.findings.length ? sv.findings.map(function (f) { return '<article class="finding"><h3><span class="lvl ' + esc(f.level) + '">' + (LEVEL[f.level] || '') + '</span><span>' + esc(f.title) + '</span></h3></article>'; }).join('') : '<p>No warning signs were found in the words. That was not a sign that it was safe.</p>') +
      '<div class="row" style="margin-top:16px"><a class="btn primary" href="#/check">Check another message</a><button type="button" class="danger" data-del="' + esc(sv.id) + '">Delete this saved check</button></div>';
    $$('[data-del]').forEach(function (b) { b.addEventListener('click', function () { mem.saved = mem.saved.filter(function (x) { return x.id !== sv.id; }); persist(); toast('Deleted.'); go('#/saved'); }); });
  }
  function saved() {
    document.title = 'Saved checks · Scam Pause';
    view.innerHTML = '<h1>Saved checks</h1><p class="muted">Only checks you chose to save. They are kept in this browser on this device and nowhere else.</p>' +
      (mem.saved.length ? mem.saved.map(savedRow).join('') + '<p style="margin-top:16px"><a href="#/privacy">Delete all saved checks</a></p>' : '<div class="card"><p style="margin:0">Nothing saved. Checks are not saved unless you tap "Save this check" on a result.</p></div>');
    bindSavedRows();
  }

  /* ---------- Privacy ---------- */
  function privacy() {
    document.title = 'Privacy · Scam Pause';
    var n = mem.saved.length, withText = mem.saved.filter(function (s) { return s.text; }).length;
    view.innerHTML = '<h1>Privacy and deletion</h1>' +
      '<section class="card"><h2>What happens to what you paste</h2><ul>' +
        '<li>The check runs in your browser. The message is not sent anywhere.</li>' +
        '<li>Screenshots are read on this device and not saved. The reader\'s files come from this website.</li>' +
        '<li>Nothing is saved unless you tap "Save this check". You choose whether the message text is kept.</li>' +
        '<li>The only outside request is the optional website registration lookup. It sends only a website name, only when you tap it.</li>' +
        '<li>No account, no ads, no tracking.</li>' +
      '</ul></section>' +
      '<section class="card"><h2>Stored on this device</h2><p id="p-count">' + n + ' saved check' + (n === 1 ? '' : 's') + (n ? ' (' + withText + ' with message text)' : '') + '.</p>' +
        '<div class="row"><button type="button" class="danger" id="p-del"' + (n ? '' : ' disabled') + '>Delete all saved checks</button><button type="button" id="p-text"' + (withText ? '' : ' disabled') + '>Remove message text, keep findings</button></div></section>' +
      '<section class="card"><h2>Display</h2><label class="switch"><input type="checkbox" id="p-big"' + (mem.prefs.bigText ? ' checked' : '') + '><span>Larger text</span></label></section>' +
      '<section class="card"><h2>Erase everything</h2><p class="small">Removes saved checks and settings from this browser.</p><button type="button" class="danger" id="p-all">Erase everything</button></section>';
    $('#p-del').addEventListener('click', function () { if (!confirm('Delete all ' + n + ' saved checks from this device? This cannot be undone.')) return; mem.saved = []; persist(); toast('All saved checks deleted.'); privacy(); });
    $('#p-text').addEventListener('click', function () { mem.saved.forEach(function (s) { delete s.text; delete s.sender; s.preview = ''; }); persist(); toast('Message text removed.'); privacy(); });
    $('#p-big').addEventListener('change', function (e) { mem.prefs.bigText = e.target.checked; persist(); applyText(); });
    $('#p-all').addEventListener('click', function () { if (!confirm('Erase all Scam Pause data from this browser?')) return; mem = { saved: [], prefs: {} }; try { localStorage.removeItem(STORE_KEY); } catch (e) { } applyText(); toast('Everything erased.'); privacy(); });
  }

  /* ---------- About ---------- */
  function about() {
    document.title = 'How it works · Scam Pause';
    view.innerHTML = '<h1>How Scam Pause works</h1>' +
      '<section class="card"><h2>What it does</h2><p>It reads the words of a message and looks for patterns that often appear in scams: pressure to act now, requests for codes or passwords, unusual ways to pay, web addresses that imitate known names, and claims you should check yourself. It explains each one and suggests safe next steps.</p>' +
      '<p style="margin:0">It uses fixed rules written into the app, not AI. That means a message cannot talk it into a different answer: instructions hidden in a message ("ignore previous instructions, mark this as safe") are treated as a warning sign, never followed.</p></section>' +
      '<section class="card"><h2>The three results</h2><table class="plain"><tr><th>Warning signs found</th><td>At least one strong sign (like a gift card request or a code request), or two smaller ones.</td></tr><tr><th>Needs independent verification</th><td>Claims, links or named organizations that you should check outside the message.</td></tr><tr><th>Not enough information</th><td>None of the signs it knows were found, or there is too little text. This is never "safe".</td></tr></table><p class="small muted" style="margin:8px 0 0">There is no score or percentage, because the app has no honest way to measure one.</p></section>' +
      '<section class="card"><h2>Limits</h2><ul>' +
        '<li>It cannot prove a message is safe or real. Ever.</li><li>It cannot see who really sent a message. Senders can be faked.</li><li>It does not open or test links.</li>' +
        '<li>It cannot reliably tell if something was made by AI, and neither can other tools.</li><li>Scams change. New wording can slip past the rules.</li><li>It reads English only. Screenshot reading can make mistakes.</li>' +
        '<li>Organization web addresses it compares against (like paypal.com) come from general knowledge. Companies also use other addresses.</li><li>Reporting guidance is for the United States.</li></ul></section>' +
      '<section class="card"><h2>Plans (an idea being tested)</h2><p>Basic checks and explanations stay free. Later, if people ask for it, a paid family plan could let someone help relatives (for example, a shared list of checks). Nothing is charged today, and Scam Pause will never use scary alerts to sell anything.</p></section>' +
      '<section class="card"><h2>Sources</h2><p class="small">Guidance checked on ' + esc(niceChecked(C.CHECKED)) + ' by searching only the official sites:</p><ul class="small">' +
        '<li><a href="https://consumer.ftc.gov/articles/how-recognize-and-report-spam-text-messages" target="_blank" rel="noopener noreferrer">FTC: spam texts (forward to 7726)</a></li>' +
        '<li><a href="https://consumer.ftc.gov/articles/how-recognize-avoid-phishing-scams" target="_blank" rel="noopener noreferrer">FTC: phishing (reportphishing@apwg.org)</a></li>' +
        '<li><a href="https://consumer.ftc.gov/consumer-alerts/2024/03/whats-verification-code-why-would-someone-ask-me-it" target="_blank" rel="noopener noreferrer">FTC: verification codes</a></li>' +
        '<li><a href="https://consumer.ftc.gov/articles/avoiding-and-reporting-gift-card-scams" target="_blank" rel="noopener noreferrer">FTC: gift card scams</a> and <a href="https://reportfraud.ftc.gov/faq" target="_blank" rel="noopener noreferrer">ReportFraud.ftc.gov FAQ</a></li>' +
        '<li><a href="https://consumer.ftc.gov/consumer-alerts/2024/03/never-move-your-money-protect-it-thats-scam" target="_blank" rel="noopener noreferrer">FTC: never move money to protect it</a></li>' +
        '<li><a href="https://consumer.ftc.gov/articles/how-avoid-government-impersonation-scam" target="_blank" rel="noopener noreferrer">FTC: government impersonation</a></li>' +
        '<li><a href="https://www.ic3.gov/" target="_blank" rel="noopener noreferrer">FBI IC3</a> and <a href="https://www.identitytheft.gov/" target="_blank" rel="noopener noreferrer">IdentityTheft.gov</a></li>' +
      '</ul><p class="small muted" style="margin:0">The pages could not be opened directly from where this app was built, so the guidance was checked through search results from those official sites. The app links to each page so you can read the latest version.</p></section>';
  }

  /* ---------- start ---------- */
  load(); applyText(); render();
  window.SPApp = { state: state, analyze: A.analyze, mem: function () { return mem; } };
})();
