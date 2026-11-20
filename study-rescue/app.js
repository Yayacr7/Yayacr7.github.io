/* Study Rescue app. Everything stays on this device. No AI: questions come from
   sentences in the student's own notes (see engine.js). */
(function () {
  'use strict';
  var E = window.SREngine, Store = window.SRStore, Reader = window.SRReader, SAMPLES = window.SRSamples;
  var view = document.getElementById('view'), fileInput = document.getElementById('file');
  var S = null, cache = { key: null }, uiSession = null, busyMsg = '';
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var TYPE = { define: 'What it means', term: 'Name the term', gap: 'Fill the gap', recall: 'Explain it', self: 'How sure are you?' };

  /* ---------- helpers ---------- */
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function todayYmd() { return E.ymd(today()); }
  function nice(ymd) { var d = E.parseYmd(ymd); return DOW[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate(); }
  function daysUntil(ymd) { return Math.round((E.parseYmd(ymd) - today()) / 864e5); }
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 2600); }
  function save() { return Store.set('state', S); }
  function go(r) { if (location.hash === r) render(); else location.hash = r; }
  function set() { return S.active && S.sets[S.active]; }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : (b || a + 's')); }

  function derived(st) {
    var key = JSON.stringify([st.id, st.docs.map(function (d) { return d.id; }), st.topicEdits, st.extraTopics]);
    if (cache.key === key) return cache;
    var topics = E.findTopics(st.docs.map(function (d) { return { name: d.name, kind: d.kind, pages: d.pages }; }));
    topics.forEach(function (t) { var e = st.topicEdits[t.id]; if (e) { if (e.name) t.name = e.name; if (e.include === false) t.include = false; } });
    (st.extraTopics || []).forEach(function (x) { var e = st.topicEdits[x.id] || {}; topics.push({ id: x.id, name: e.name || x.name, include: e.include !== false, sentences: [], docs: [], listOnly: true, extra: true }); });
    cache = { key: key, topics: topics, questions: E.buildQuestions(topics) };
    return cache;
  }
  function topicById(st, id) { return derived(st).topics.filter(function (t) { return t.id === id; })[0]; }
  function liveTopics(st) { return derived(st).topics.filter(function (t) { return t.include; }); }
  function status(st, id) { return E.topicStatus(id, st.answers); }
  function refText(src) { return src ? (src.doc + ' · ' + src.ref) : ''; }
  function quote(src, label) { return src ? '<div class="quote">' + h(src.quote) + '<span class="ref">' + (label || 'From your notes') + ': ' + h(refText(src)) + '</span></div>' : ''; }
  function statusPill(stt) { return '<span class="status ' + stt.key + '">' + h(stt.label) + (stt.n && stt.selfOnly ? ' · your rating' : stt.n && stt.early ? ' · early guess' : '') + '</span>'; }
  function topicRefs(t) {
    if (t.listOnly) return t.extra ? 'Added by you · no notes yet' : 'Topic name only · no notes yet';
    var by = {}; t.sentences.forEach(function (s) { (by[s.doc] = by[s.doc] || []).push(s.ref); });
    return Object.keys(by).map(function (d) { var r = by[d]; return d + ' · ' + (r[0] === r[r.length - 1] ? r[0] : r[0] + '–' + r[r.length - 1].replace(/^(line|page) /, '')); }).join('; ');
  }

  /* ---------- router ---------- */
  window.addEventListener('hashchange', render);
  function render() {
    var r = (location.hash || '').replace(/^#\/?/, '').split('/');
    var st = set();
    if (!S.seenWelcome && r[0] !== 'more') r = ['welcome'];
    else if (!st && ['welcome', 'setup', 'more'].indexOf(r[0]) < 0) r = ['setup', '1'];
    else if (st && st.step < 6 && ['setup', 'practice', 'more', 'welcome'].indexOf(r[0]) < 0) r = ['setup', String(st.step)];
    var name = r[0] || 'home';
    document.body.classList.toggle('focus', name === 'welcome' || name === 'setup' || name === 'practice');
    document.querySelectorAll('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === name || (name === 'topic' && a.getAttribute('data-nav') === 'topics') || (name === 'material' && a.getAttribute('data-nav') === 'more')); });
    var fn = { welcome: vWelcome, setup: vSetup, home: vHome, topics: vTopics, topic: vTopic, plan: vPlan, progress: vProgress, practice: vPractice, more: vMore, material: vMaterial }[name] || vHome;
    view.innerHTML = fn(r.slice(1)) || '';
    if (fn.after) fn.after(r.slice(1));
    window.scrollTo(0, 0);
    if (render.focus) { var f = view.querySelector(render.focus); if (f) f.focus(); render.focus = null; }
  }
  function after(fn, cb) { fn.after = cb; }

  /* ---------- welcome ---------- */
  function vWelcome() {
    return '<section class="hero"><span class="blob b1"></span><span class="blob b2"></span>' +
      '<div class="eyebrow" style="color:#FFE79A">Study Rescue</div><h1>Turn “I’m lost” into a clear next step.</h1>' +
      '<p>Add your notes. Study Rescue finds the topics, asks short questions made from your own material, and plans what to practice next, based on the time you have.</p>' +
      '<button class="btn sun big" id="w-go" type="button">Get started</button></section>' +
      '<div class="steps3"><div><b class="n">1</b><span><b>Add your notes</b><br><span class="small muted">Notes, a study guide or a topic list.</span></span></div>' +
      '<div><b class="n">2</b><span><b>Practice in short sessions</b><br><span class="small muted">About 10 minutes. Missed one? Try again.</span></span></div>' +
      '<div><b class="n">3</b><span><b>See what to do next</b><br><span class="small muted">The plan changes as you show what you know.</span></span></div></div>' +
      '<p class="small muted">Private by default: your files are read on this device and never uploaded. No account, no name needed. Study Rescue is for practice and studying, not for answering a live graded test.</p>';
  }
  after(vWelcome, function () { document.getElementById('w-go').onclick = function () { S.seenWelcome = true; save(); go(set() ? '#/home' : '#/setup/1'); }; });

  /* ---------- setup ---------- */
  function dots(step) { var o = '<div class="progress-dots" aria-label="Step ' + step + ' of 5">'; for (var i = 1; i <= 5; i++) o += '<i class="' + (i < step ? 'done' : i === step ? 'on' : '') + '"></i>'; return o + '</div>'; }
  function newSet() {
    var id = 's' + uid();
    S.sets[id] = { id: id, subject: '', mode: 'test', testDate: '', goal: '', docs: [], topicEdits: {}, extraTopics: [], answers: [], flags: {}, minutes: 20, days: [0, 1, 2, 3, 4, 5], sessions: [], step: 1, created: Date.now(), lastActive: Date.now() };
    S.active = id; return S.sets[id];
  }
  function vSetup(args) {
    var st = set(), step = +(args[0] || 1);
    if (!st) { st = newSet(); save(); }
    if (step > st.step) step = st.step;
    var f = [null, setup1, setup2, setup3, setup4, setup5][step] || setup1;
    return dots(step) + f(st);
  }
  after(vSetup, function (args) { var st = set(), step = Math.min(+(args[0] || 1), st.step); [null, bind1, bind2, bind3, bind4, bind5][step](st); });
  function setStep(st, n) { st.step = Math.max(st.step, n); save(); go('#/setup/' + n); }

  function setup1(st) {
    var min = todayYmd();
    return '<div class="eyebrow">Step 1 of 5</div><h1>What are you studying?</h1>' +
      '<div class="card stack"><div><label class="label" for="s-sub">Subject</label><input class="input" id="s-sub" maxlength="60" placeholder="For example: Biology" value="' + h(st.subject) + '" autocomplete="off"></div>' +
      '<div><span class="label">What are you working toward?</span><div class="row" role="group"><button class="pick" type="button" data-mode="test" aria-pressed="' + (st.mode === 'test') + '">A test or exam</button><button class="pick" type="button" data-mode="goal" aria-pressed="' + (st.mode === 'goal') + '">A learning goal</button></div></div>' +
      '<div id="s-test" ' + (st.mode === 'test' ? '' : 'hidden') + '><label class="label" for="s-date">Test date</label><input class="input" type="date" id="s-date" min="' + min + '" value="' + h(st.testDate) + '"></div>' +
      '<div id="s-goal" ' + (st.mode === 'goal' ? '' : 'hidden') + '><label class="label" for="s-goaltxt">Your goal</label><input class="input" id="s-goaltxt" maxlength="120" placeholder="For example: understand cell biology before next term" value="' + h(st.goal) + '"><p class="tiny muted" style="margin:6px 0 0">Without a test date, the plan covers the next 2 weeks and keeps going.</p></div>' +
      '<p class="small muted" style="margin:0" id="s-err" role="alert"></p>' +
      '<button class="btn wide" id="s-next" type="button">Next: add material</button></div>' +
      '<p class="tiny muted" style="margin-top:12px">Only what you type here is saved, on this device. No name or school needed.</p>';
  }
  function bind1(st) {
    view.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { st.mode = b.getAttribute('data-mode'); view.querySelectorAll('[data-mode]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); document.getElementById('s-test').hidden = st.mode !== 'test'; document.getElementById('s-goal').hidden = st.mode !== 'goal'; }; });
    document.getElementById('s-next').onclick = function () {
      var sub = document.getElementById('s-sub').value.trim(), date = document.getElementById('s-date').value, goal = document.getElementById('s-goaltxt').value.trim(), err = document.getElementById('s-err');
      if (!sub) { err.textContent = 'Add a subject name first.'; document.getElementById('s-sub').focus(); return; }
      if (st.mode === 'test' && !date) { err.textContent = 'Pick the test date, or choose “A learning goal”.'; return; }
      if (st.mode === 'test' && daysUntil(date) < 0) { err.textContent = 'That date has passed. Pick today or a later date.'; return; }
      st.subject = sub; st.testDate = st.mode === 'test' ? date : ''; st.goal = st.mode === 'goal' ? goal : '';
      setStep(st, 2);
    };
  }

  function docList(st, removable) {
    if (!st.docs.length) return '';
    return st.docs.map(function (d) {
      var wordsN = d.pages.join(' ').split(/\s+/).filter(Boolean).length;
      return '<div class="doc"><span class="ic"><svg><use href="#i-file"/></svg></span><div class="grow"><div class="nm">' + h(d.name) + '</div><div class="tiny muted">' +
        ({ pdf: 'PDF', image: 'Photo (read on this device)', text: 'Text', paste: 'Pasted text' }[d.kind] || 'Text') + ' · ' + (d.kind === 'pdf' ? plural(d.pages.length, 'page') + ' · ' : '') + plural(wordsN, 'word') +
        (d.sample ? ' · <b>sample notes made up for the demo</b>' : '') + '</div>' + (d.looksLikeTest ? '<div class="tiny" style="color:var(--sun-d)">This looks like a test. Use it to practice, not during a live graded test.</div>' : '') + '</div>' +
        (removable ? '<button class="icon-btn" type="button" data-del="' + d.id + '" aria-label="Remove ' + h(d.name) + '"><svg><use href="#i-x"/></svg></button>' : '') + '</div>';
    }).join('');
  }
  function materialAdder() {
    return '<div class="drop" id="drop"><svg><use href="#i-book"/></svg><p style="margin:8px 0 12px"><b>Drop files here</b> or choose them<br><span class="small muted">Text (.txt, .md), PDF with selectable text, or photos of notes</span></p>' +
      '<button class="btn" type="button" id="m-files">Choose files</button></div>' +
      '<div class="busy" id="m-busy" ' + (busyMsg ? '' : 'hidden') + '><span class="spin" aria-hidden="true"></span><span id="m-busytxt">' + h(busyMsg) + '</span></div>' +
      '<details style="margin-top:12px"><summary>Paste text instead</summary><div class="stack" style="margin-top:8px"><input class="input" id="m-pname" placeholder="Name (for example: Chapter 4 notes)" maxlength="60"><textarea class="input" id="m-ptext" placeholder="Paste notes, a study guide, or one topic per line"></textarea><button class="btn soft" type="button" id="m-padd">Add this text</button></div></details>' +
      '<details style="margin-top:4px"><summary>No notes handy? Try sample notes</summary><p class="small muted" style="margin:6px 0">Made up for this demo, so you can see how it works. Label stays on them.</p><div class="row"><button class="btn ghost" type="button" data-sample="biology">Sample: Biology</button><button class="btn ghost" type="button" data-sample="history">Sample: US government</button></div></details>';
  }
  function addDoc(st, doc) {
    var text = doc.pages.join('\n').trim();
    if (text.replace(/\s/g, '').length < 20) { toast(doc.kind === 'pdf' ? 'No text found in this PDF. It may be a scan: take photos of the pages or paste the text.' : 'No readable text found in ' + doc.name + '.'); return false; }
    if (text.length > 1500000) { toast(doc.name + ' is too big for now (over about 300 pages of text). Add one chapter at a time.'); return false; }
    doc.id = 'd' + uid(); doc.added = Date.now(); doc.looksLikeTest = E.looksLikeGradedTest(text);
    st.docs.push(doc); st.lastActive = Date.now(); save(); return true;
  }
  function bindAdder(st, rerender) {
    var drop = document.getElementById('drop');
    function handle(files) {
      files = Array.prototype.slice.call(files || []); if (!files.length) return;
      var i = 0;
      (function nextFile() {
        if (i >= files.length) { busyMsg = ''; rerender(); return; }
        var f = files[i++]; busyMsg = 'Reading ' + f.name + '…'; var b = document.getElementById('m-busy'); if (b) { b.hidden = false; document.getElementById('m-busytxt').textContent = busyMsg; }
        Reader.read(f, function (m) { var t = document.getElementById('m-busytxt'); if (t) t.textContent = f.name + ': ' + m; }).then(function (doc) { if (addDoc(st, doc)) toast('Added ' + f.name); }).catch(function (e) { toast(e && e.message && e.message.length < 140 ? e.message : 'Could not read ' + f.name + '.'); }).then(nextFile);
      })();
    }
    document.getElementById('m-files').onclick = function () { fileInput.value = ''; fileInput.onchange = function () { handle(fileInput.files); }; fileInput.click(); };
    drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = function () { drop.classList.remove('over'); };
    drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove('over'); handle(e.dataTransfer.files); };
    document.getElementById('m-padd').onclick = function () {
      var t = document.getElementById('m-ptext').value, n = document.getElementById('m-pname').value.trim() || 'Pasted notes';
      if (addDoc(st, { name: n, kind: 'paste', pages: [t] })) { toast('Added ' + n); rerender(); }
    };
    view.querySelectorAll('[data-sample]').forEach(function (b) { b.onclick = function () { var s = SAMPLES[b.getAttribute('data-sample')]; if (st.docs.some(function (d) { return d.name === s.name; })) { toast('Already added'); return; } addDoc(st, { name: s.name, kind: 'text', pages: [s.text], sample: true }); if (!st.subject) st.subject = s.subject; toast('Sample notes added'); rerender(); }; });
    view.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { if (!b.dataset.sure) { b.dataset.sure = 1; b.style.color = 'var(--oops)'; b.setAttribute('aria-label', 'Tap again to remove'); toast('Tap again to remove it'); return; } st.docs = st.docs.filter(function (d) { return d.id !== b.getAttribute('data-del'); }); save(); rerender(); }; });
  }

  function setup2(st) {
    return '<div class="eyebrow">Step 2 of 5 · ' + h(st.subject) + '</div><h1>Add your study material</h1>' +
      '<div class="card">' + materialAdder() + (st.docs.length ? '<hr><h3>Added</h3>' + docList(st, true) : '') + '</div>' +
      '<div class="row" style="margin-top:14px"><button class="btn ghost" type="button" id="s-back">Back</button><button class="btn" style="flex:1" type="button" id="s-next" ' + (st.docs.length ? '' : 'disabled') + '>Next: check the topics</button></div>' +
      '<p class="tiny muted" style="margin-top:12px">Your files are read here, on this device, and are not uploaded. Word or slide files: save as PDF, or paste the text.</p>';
  }
  function bind2(st) { bindAdder(st, render); document.getElementById('s-back').onclick = function () { go('#/setup/1'); }; document.getElementById('s-next').onclick = function () { setStep(st, 3); }; }

  function topicEditor(st) {
    var d = derived(st);
    return d.topics.map(function (t) {
      return '<div class="topic-edit' + (t.include ? '' : ' off') + '"><input class="tog" type="checkbox" data-inc="' + t.id + '" ' + (t.include ? 'checked' : '') + ' aria-label="Include ' + h(t.name) + '">' +
        '<div style="flex:1;min-width:0"><input type="text" data-name="' + t.id + '" value="' + h(t.name) + '" aria-label="Topic name" maxlength="70"><div class="tiny muted" style="padding:0 4px">' + h(topicRefs(t)) +
        (t.listOnly ? '' : ' · ' + plural(t.sentences.length, 'note line')) + (t.sentences.length === 1 ? ' · few notes, few questions' : '') + '</div></div></div>';
    }).join('');
  }
  function bindTopicEditor(st, rerender) {
    view.querySelectorAll('[data-inc]').forEach(function (c) { c.onchange = function () { var id = c.getAttribute('data-inc'); st.topicEdits[id] = Object.assign({}, st.topicEdits[id], { include: c.checked }); save(); c.closest('.topic-edit').classList.toggle('off', !c.checked); cache.key = null; if (rerender) rerender(); }; });
    view.querySelectorAll('[data-name]').forEach(function (inp) { inp.onchange = function () { var id = inp.getAttribute('data-name'), v = inp.value.trim(); if (!v) { inp.value = topicById(st, id).name; return; } st.topicEdits[id] = Object.assign({}, st.topicEdits[id], { name: v }); save(); cache.key = null; }; });
    var add = document.getElementById('t-add');
    if (add) add.onclick = function () { var inp = document.getElementById('t-new'), v = inp.value.trim(); if (!v) { inp.focus(); return; } st.extraTopics.push({ id: 'x' + uid(), name: v }); save(); toast('Topic added'); render(); var dd = view.querySelector('details'); if (dd) dd.open = true; };
  }
  function setup3(st) {
    var d = derived(st), n = d.topics.length, warn = st.docs.some(function (x) { return x.looksLikeTest; });
    var listOnly = d.topics.filter(function (t) { return t.listOnly; }).length;
    return '<div class="eyebrow">Step 3 of 5 · ' + h(st.subject) + '</div><h1>' + (n ? 'We found ' + plural(n, 'topic') + '. Look right?' : 'No topics found yet') + '</h1>' +
      '<p class="muted">Untick anything that is not on your test, and rename topics so they make sense to you.</p>' +
      (warn ? '<div class="note sun" style="margin-bottom:12px"><b>This looks like a test or quiz.</b> Study Rescue is for practice. Please don’t use it during a live graded test. A practice test from your teacher is fine.</div>' : '') +
      (listOnly ? '<div class="note" style="margin-bottom:12px"><b>' + plural(listOnly, 'topic has', 'topics have') + ' a name only.</b> Questions can only be written from notes, so these get a “how sure are you?” check until you add notes for them.</div>' : '') +
      '<div class="card">' + topicEditor(st) + '<div class="row" style="margin-top:12px"><input class="input" id="t-new" placeholder="Add a missing topic" maxlength="70" style="flex:1;min-width:180px"><button class="btn soft" id="t-add" type="button"><svg><use href="#i-plus"/></svg>Add</button></div></div>' +
      '<div class="row" style="margin-top:14px"><button class="btn ghost" type="button" id="s-back">Back</button><button class="btn" style="flex:1" type="button" id="s-next" ' + (liveTopics(st).length ? '' : 'disabled') + '>Looks right</button></div>';
  }
  function bind3(st) { bindTopicEditor(st, function () { var b = document.getElementById('s-next'); if (b) b.disabled = !liveTopics(st).length; }); document.getElementById('s-back').onclick = function () { go('#/setup/2'); }; document.getElementById('s-next').onclick = function () { setStep(st, 4); }; }

  function setup4(st) {
    var qs = E.quickCheck(liveTopics(st), derived(st).questions, 8);
    return '<div class="eyebrow">Step 4 of 5 · ' + h(st.subject) + '</div><h1>A quick check</h1>' +
      '<div class="card"><p>' + (qs.length ? plural(qs.length, 'short question') + ', one per topic, made from your notes. It gives a first rough guess of what needs practice.' : 'Your material does not have enough sentences to write questions yet. You can skip this and add more notes later.') + '</p>' +
      '<p class="small muted">Not knowing is fine. That is what this is for. There is an “I don’t know yet” button.</p>' +
      '<div class="row">' + (qs.length ? '<button class="btn" style="flex:1" id="c-go" type="button"><svg><use href="#i-play"/></svg>Start the quick check</button>' : '') + '<button class="btn ghost" id="c-skip" type="button">Skip for now</button></div></div>';
  }
  function bind4(st) {
    var go1 = document.getElementById('c-go');
    if (go1) go1.onclick = function () { startSession(st, 'check', E.quickCheck(liveTopics(st), derived(st).questions, 8)); };
    document.getElementById('c-skip').onclick = function () { setStep(st, 5); };
  }

  function timeControls(st) {
    var mins = [10, 20, 30, 45, 60];
    var o = '<div><span class="label">Time per day</span><div class="row" role="group" aria-label="Minutes per day">' + mins.map(function (m) { return '<button class="pick" type="button" data-min="' + m + '" aria-pressed="' + (st.minutes === m) + '">' + m + ' min</button>'; }).join('') + '</div></div>' +
      '<div style="margin-top:14px"><span class="label">Study days</span><div class="row" role="group" aria-label="Study days">' + [1, 2, 3, 4, 5, 6, 0].map(function (d) { return '<button class="pick" type="button" data-dow="' + d + '" aria-pressed="' + (st.days.indexOf(d) >= 0) + '">' + DOW[d] + '</button>'; }).join('') + '</div>' +
      '<p class="tiny muted" style="margin:6px 0 0">Missing a planned day is fine. The plan simply starts again from today.</p></div>';
    return o;
  }
  function bindTime(st, rerender) {
    view.querySelectorAll('[data-min]').forEach(function (b) { b.onclick = function () { st.minutes = +b.getAttribute('data-min'); save(); rerender(); }; });
    view.querySelectorAll('[data-dow]').forEach(function (b) { b.onclick = function () { var d = +b.getAttribute('data-dow'), i = st.days.indexOf(d); if (i >= 0) { if (st.days.length === 1) { toast('Keep at least one study day'); return; } st.days.splice(i, 1); } else st.days.push(d); save(); rerender(); }; });
  }
  function setup5(st) {
    var plan = E.buildPlan(planInput(st), today());
    var first = plan.days.filter(function (d) { return d.kind === 'practice' || d.kind === 'review'; }).slice(0, 3);
    return '<div class="eyebrow">Step 5 of 5 · ' + h(st.subject) + '</div><h1>How much time do you have?</h1>' +
      '<div class="card">' + timeControls(st) + '</div>' +
      '<div class="card"><h3>Your first days</h3>' + (first.length ? first.map(function (d) { return dayRow(st, d); }).join('') : '<p class="muted">No study days before the test. Add more days or pick a later date in Plan.</p>') + fitNote(plan) + '</div>' +
      '<button class="btn big wide" style="margin-top:14px" id="s-done" type="button">Start studying</button>';
  }
  function bind5(st) { bindTime(st, render); document.getElementById('s-done').onclick = function () { st.step = 6; save(); go('#/home'); }; }

  /* ---------- plan ---------- */
  function planInput(st) { return { mode: st.mode, testDate: st.testDate, minutes: st.minutes, days: st.days, topics: derived(st).topics, answers: st.answers }; }
  function eset(st) { var o = planInput(st); o.flags = st.flags; return o; }
  function fitNote(plan) { return plan.fits ? '' : '<div class="note sun" style="margin-top:10px"><b>More to cover than time allows.</b> Topics that need the most practice come first. More study days or minutes would let every topic come back twice.</div>'; }
  function dayRow(st, d) {
    var dt = E.parseYmd(d.date), isToday = d.offset === 0;
    var chips = d.kind === 'review' ? '<span class="chip sun">Mixed review of everything</span>' : d.topics.map(function (id) { var t = topicById(st, id); return t ? '<span class="chip">' + h(t.name) + '</span>' : ''; }).join('');
    var title = d.kind === 'test' ? 'Test day' : d.kind === 'rest' ? 'Free day' : d.kind === 'review' ? 'Light review' : plural(d.sessions, 'short session');
    var sub = d.kind === 'test' ? 'Good luck. No new practice planned today.' : d.kind === 'rest' ? 'Nothing planned' : d.kind === 'review' ? 'Last day before the test: a calm mix, then rest.' : 'About ' + (d.sessions * 10) + ' min';
    return '<div class="day ' + (isToday ? 'today ' : '') + d.kind + '"><div class="dt"><span>' + (isToday ? 'Today' : DOW[dt.getDay()]) + '</span><b>' + dt.getDate() + '</b></div><div class="grow"><b>' + title + '</b><div class="small muted">' + sub + '</div>' + (chips ? '<div class="chips">' + chips + '</div>' : '') + '</div></div>';
  }
  function vPlan() {
    var st = set(), plan = E.buildPlan(planInput(st), today());
    var head = st.mode === 'test' ? (plan.past ? 'Your test date has passed' : plan.testToday ? 'Your test is today' : 'Test on ' + nice(st.testDate) + ' · ' + plural(daysUntil(st.testDate), 'day') + ' to go') : 'Goal: ' + (st.goal || 'keep learning ' + st.subject) + ' · next 2 weeks';
    return '<div class="eyebrow">' + h(st.subject) + '</div><h1>Study plan</h1><p class="muted">' + h(head) + '. It changes after every session, based on your answers.</p>' +
      (plan.past ? '<div class="note sun"><b>Pick a new date or switch to a goal</b> to get a new plan.</div>' : '') +
      '<details class="card"><summary>Change time, days or date</summary><div style="margin-top:12px">' + timeControls(st) +
      '<div class="row" style="margin-top:14px"><div style="flex:1;min-width:180px"><label class="label" for="p-date">Test date</label><input class="input" type="date" id="p-date" min="' + todayYmd() + '" value="' + h(st.testDate) + '"></div><button class="btn ghost" type="button" id="p-goal" style="margin-top:28px">' + (st.mode === 'goal' ? 'Using a goal' : 'No test: use a goal') + '</button></div></div></details>' +
      '<div style="margin-top:14px">' + plan.days.map(function (d) { return dayRow(st, d); }).join('') + '</div>' + fitNote(plan);
  }
  after(vPlan, function () {
    var st = set(); bindTime(st, function () { render(); view.querySelector('details').open = true; });
    document.getElementById('p-date').onchange = function (e) { var v = e.target.value; if (v && daysUntil(v) >= 0) { st.testDate = v; st.mode = 'test'; save(); render(); } else toast('Pick today or a later date'); };
    document.getElementById('p-goal').onclick = function () { st.mode = 'goal'; st.testDate = ''; save(); render(); };
  });

  /* ---------- home ---------- */
  function sessionsToday(st) { var t = todayYmd(); return st.sessions.filter(function (s) { return s.date === t && s.kind !== 'check'; }).length; }
  function vHome() {
    var st = set(), d = derived(st), plan = E.buildPlan(planInput(st), today());
    var todayPlan = plan.days[0] || { sessions: 0, kind: 'rest', topics: [] };
    var next = E.nextSession(eset(st), d.questions, today(), 6);
    var done = sessionsToday(st), planned = todayPlan.sessions || 0;
    var pct = planned ? Math.min(100, Math.round(done / planned * 100)) : (done ? 100 : 0);
    var away = st.lastActive && (Date.now() - st.lastActive) > 36 * 3600e3 && st.answers.length;
    var counts = { practice: 0, getting: 0, solid: 0, 'new': 0 };
    liveTopics(st).forEach(function (t) { counts[status(st, t.id).key]++; });
    var others = Object.keys(S.sets).filter(function (k) { return k !== st.id && S.sets[k].step >= 6; });
    var when = st.mode === 'test' && st.testDate ? (daysUntil(st.testDate) > 0 ? plural(daysUntil(st.testDate), 'day') + ' until your test (' + nice(st.testDate) + ')' : daysUntil(st.testDate) === 0 ? 'Test day today' : 'Test date passed: set a new one in Plan') : 'Goal: ' + (st.goal || 'keep learning');
    var topicChips = next.topicIds.slice(0, 4).map(function (id) { var t = topicById(st, id); return t ? '<span class="chip">' + h(t.name) + '</span>' : ''; }).join('');
    var label = planned ? (done >= planned ? 'Today’s plan is done. Extra practice is optional.' : 'Today: ' + done + ' of ' + plural(planned, 'session') + ' done') : (todayPlan.kind === 'test' ? 'Test day: a short warm-up is optional' : 'Not a planned day. A session still helps.');
    return '<div class="subject-bar"><div><div class="sub">' + h(st.subject) + '</div><div class="small muted">' + h(when) + '</div></div>' +
      (others.length ? '<label class="small"><span class="sr">Switch subject</span><select class="input" id="h-switch" style="min-height:40px;padding:6px 10px"><option value="">' + h(st.subject) + '</option>' + others.map(function (k) { return '<option value="' + k + '">' + h(S.sets[k].subject) + '</option>'; }).join('') + '<option value="+">+ New subject</option></select></label>' : '<button class="link small" id="h-new" type="button">+ New subject</button>') + '</div>' +
      (away ? '<div class="note cobalt" style="margin-bottom:14px"><b>Welcome back.</b> Nothing is lost. Your plan starts again from today.</div>' : '') +
      '<section class="next"><div class="ring" style="--p:0" data-p="' + pct + '"><span>' + done + '/' + Math.max(planned, done, 1) + '</span></div>' +
      '<div class="small muted">' + h(label) + '</div>' +
      '<h1 style="margin-top:6px">' + (next.questions.length ? 'Your next session' : 'Nothing to practice yet') + '</h1>' +
      (next.questions.length ? '<div class="small muted">' + plural(next.questions.length, 'question') + ' · about ' + Math.max(5, Math.round(next.questions.length * 1.6)) + ' min</div><div class="chips">' + topicChips + '</div>' +
        '<button class="btn big" id="h-start" type="button"><svg><use href="#i-play"/></svg>Start next session</button>'
        : '<p class="muted">Add notes with full sentences (or bring back flagged questions) so questions can be written.</p><a class="btn" href="#/material">Add material</a>') + '</section>' +
      '<div class="mini-grid"><a class="mini practice" href="#/progress"><b>' + counts.practice + '</b><span>need practice</span></a><a class="mini getting" href="#/progress"><b>' + counts.getting + '</b><span>getting there</span></a><a class="mini solid" href="#/progress"><b>' + counts.solid + '</b><span>looking solid</span></a></div>' +
      (counts['new'] ? '<p class="small muted" style="text-align:center;margin-top:10px">' + plural(counts['new'], 'topic') + ' not checked yet</p>' : '');
  }
  after(vHome, function () {
    var st = set(), b = document.getElementById('h-start');
    var ring = view.querySelector('.ring'); if (ring) requestAnimationFrame(function () { requestAnimationFrame(function () { ring.style.setProperty('--p', ring.getAttribute('data-p')); }); });
    if (b) b.onclick = function () { var n = E.nextSession(eset(st), derived(st).questions, today(), 6); startSession(st, 'session', n.questions); };
    var sw = document.getElementById('h-switch'); if (sw) sw.onchange = function () { if (sw.value === '+') { newSet(); save(); go('#/setup/1'); } else if (sw.value) { S.active = sw.value; cache.key = null; save(); render(); } };
    var nw = document.getElementById('h-new'); if (nw) nw.onclick = function () { newSet(); save(); go('#/setup/1'); };
  });

  /* ---------- topics ---------- */
  function vTopics() {
    var st = set(), d = derived(st);
    return '<div class="eyebrow">' + h(st.subject) + '</div><div class="spread"><h1>Topic map</h1><a class="btn soft" href="#/material">Material</a></div><p class="muted">Tap a topic to see its notes and practice just that topic.</p>' +
      '<div class="tgrid">' + d.topics.map(function (t) {
        var stt = status(st, t.id), nq = d.questions.filter(function (q) { return q.topicId === t.id && !st.flags[q.id]; }).length;
        return '<a class="tcard ' + (t.include ? stt.key : 'off') + '" href="#/topic/' + t.id + '"><h3>' + h(t.name) + '</h3>' + (t.include ? statusPill(stt) : '<span class="status">Not on my test</span>') + '<div class="meta">' + plural(nq, 'question') + ' · ' + h(topicRefs(t)) + '</div></a>';
      }).join('') + '</div>' +
      '<details class="card" style="margin-top:14px"><summary>Edit topics</summary><div style="margin-top:10px">' + topicEditor(st) + '<div class="row" style="margin-top:12px"><input class="input" id="t-new" placeholder="Add a missing topic" maxlength="70" style="flex:1;min-width:180px"><button class="btn soft" id="t-add" type="button">Add</button></div></div></details>';
  }
  after(vTopics, function () { bindTopicEditor(set(), function () { render(); view.querySelector('details').open = true; }); });

  function vTopic(args) {
    var st = set(), t = topicById(st, args[0]);
    if (!t) return '<a class="back" href="#/topics"><svg><use href="#i-back"/></svg>Topics</a><p>That topic is gone (its material may have been removed).</p>';
    var stt = status(st, t.id), qs = derived(st).questions.filter(function (q) { return q.topicId === t.id; });
    var usable = qs.filter(function (q) { return !st.flags[q.id]; });
    return '<a class="back" href="#/topics"><svg><use href="#i-back"/></svg>Topic map</a><h1>' + h(t.name) + '</h1><div class="row" style="margin-bottom:14px">' + statusPill(stt) + '<span class="small muted">' + (stt.n ? 'Based on ' + plural(stt.n, 'answer') : 'No answers yet') + '</span></div>' +
      (usable.length && t.include ? '<button class="btn big wide" id="tp-go" type="button"><svg><use href="#i-play"/></svg>Practice this topic</button>' : '') +
      (!t.include ? '<div class="note">This topic is switched off (not on my test). Turn it back on in Topic map → Edit topics.</div>' : '') +
      '<div class="card" style="margin-top:14px"><h3>Your notes on this topic</h3>' + (t.sentences.length ? t.sentences.map(function (s) { return quote({ quote: s.text, doc: s.doc, ref: s.ref }, 'Source'); }).join('') : '<p class="muted">No notes yet, only the topic name. Add material that covers it so questions can be written.</p><a class="btn soft" href="#/material">Add material</a>') + '</div>' +
      '<div class="card"><h3>' + plural(qs.length, 'question') + ' from these notes</h3><p class="small muted">' + qs.map(function (q) { return TYPE[q.type]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' · ') + (qs.length - usable.length ? ' · ' + plural(qs.length - usable.length, 'flagged question') + ' hidden' : '') + '</p></div>';
  }
  after(vTopic, function (args) { var b = document.getElementById('tp-go'); if (b) b.onclick = function () { var st = set(); startSession(st, 'topic', E.nextSession(eset(st), derived(st).questions, today(), 6, args[0]).questions); }; });

  /* ---------- material ---------- */
  function vMaterial() {
    var st = set();
    return '<a class="back" href="#/topics"><svg><use href="#i-back"/></svg>Topics</a><h1>Study material</h1><p class="muted">' + h(st.subject) + ' · ' + plural(st.docs.length, 'document') + '. Adding or removing material updates the topics and questions. Your answers are kept.</p>' +
      '<div class="card">' + (st.docs.length ? docList(st, true) : '<p class="muted">Nothing added yet.</p>') + '</div><div class="card">' + materialAdder() + '</div>';
  }
  after(vMaterial, function () { bindAdder(set(), render); });

  /* ---------- practice ---------- */
  function startSession(st, kind, questions) {
    if (!questions.length) { toast('No questions available right now'); return; }
    var before = {}; questions.forEach(function (q) { before[q.topicId] = status(st, q.topicId).key; });
    uiSession = { setId: st.id, kind: kind, qs: questions, i: 0, results: [], before: before, phase: 'ask', cur: questions[0], tries: 0, picked: null };
    S.session = uiSession; save(); go('#/practice');
  }
  function record(st, q, r, self) {
    st.answers.push({ qid: q.retryOf || q.origId || q.id, topicId: q.topicId, r: r, self: !!self, at: Date.now() });
    if (st.answers.length > 4000) st.answers = st.answers.slice(-4000);
    st.lastActive = Date.now();
  }
  function vPractice() {
    var u = uiSession, st = set();
    if (!u || !st || u.setId !== st.id) return '<p>No session running.</p><a class="btn" href="#/home">Home</a>';
    if (u.phase === 'end') return endScreen(st, u);
    var q = u.cur, n = u.qs.length, t = topicById(st, q.topicId);
    var bar = '<div class="qbar" aria-label="Question ' + (u.i + 1) + ' of ' + n + '">' + u.qs.map(function (_, i) { var r = u.results[i]; return '<i class="' + (r == null ? (i === u.i ? 'now' : '') : r === 1 ? 'right' : r === 0.5 ? 'second' : r === 'flag' ? '' : 'miss') + '"></i>'; }).join('') + '</div>';
    var head = '<div class="qtop"><button class="icon-btn" id="p-quit" type="button" aria-label="End session"><svg><use href="#i-x"/></svg></button>' + bar + '<span class="small muted" style="min-width:42px;text-align:right">' + (u.i + 1) + '/' + n + '</span></div>';
    var tag = q.type === 'self' ? '<span class="src-tag self">Self-rating · not checked by the app</span>' : q.type === 'recall' ? '<span class="src-tag self">Self-check · you compare with your notes</span>' : '<span class="src-tag"><svg><use href="#i-book"/></svg>From your notes · ' + h(refText(q.src)) + '</span>';
    var o = head + '<div class="qcard" aria-live="polite"><div class="spread"><span class="eyebrow" style="margin:0">' + h(t ? t.name : '') + ' · ' + TYPE[q.type] + (u.tries ? ' · second try' : '') + '</span></div>' + tag +
      '<div class="prompt" id="q-prompt" tabindex="-1">' + h(q.prompt) + '</div>';
    if (q.options) {
      var doneQ = u.phase !== 'ask';
      o += '<div class="opts' + (doneQ ? ' done' : '') + '">' + q.options.map(function (opt, i) {
        var cls = doneQ ? (i === q.answer && (u.fb.right || u.phase === 'final' || u.kind === 'check') ? ' right' : i === u.picked && !u.fb.right ? ' wrong' : '') : '';
        return '<button class="opt' + cls + '" type="button" data-opt="' + i + '" ' + (doneQ ? 'disabled' : '') + '><span class="k">' + 'ABCD'[i] + '</span><span>' + h(opt) + '</span></button>';
      }).join('') + '</div>';
      if (u.phase === 'ask' && u.kind === 'check') o += '<div class="qactions"><button class="btn ghost" id="p-idk" type="button">I don’t know yet</button></div>';
      if (doneQ) o += feedbackHtml(st, u, q);
    } else {
      if (u.phase === 'ask') o += '<label class="sr" for="p-own">Your answer (optional, not saved)</label><textarea class="input" id="p-own" placeholder="Type what you remember (optional, not saved)"></textarea><div class="qactions"><button class="btn" id="p-show" type="button">' + (q.noNotes ? 'Rate myself' : 'Show my notes') + '</button></div>';
      else if (u.phase === 'rate') {
        o += (q.compare ? '<p class="small muted" style="margin-top:10px">Your notes say:</p>' + q.compare.map(function (s) { return quote(s); }).join('') : '<div class="note">There are no notes for this topic, so the app cannot check you. Be honest with yourself.</div>') +
          '<p style="margin:12px 0 6px"><b>How did you do?</b></p><div class="row"><button class="btn soft" data-rate="1" type="button">I had it</button><button class="btn soft" data-rate="0.5" type="button">Partly</button><button class="btn soft" data-rate="0" type="button">Not yet</button></div>' +
          '<div class="extra"><span class="tag">Extra tip · not from your notes</span><div>' + h(E.feedback(q, null).extra) + '</div></div>';
      }
    }
    if (u.phase !== 'end' && !u.flagging) o += '<div style="margin-top:10px;text-align:right"><button class="link small" id="p-flag" type="button"><svg><use href="#i-flag"/></svg> Report a problem with this question</button></div>';
    if (u.flagging) o += '<div class="flagbox"><b>What is wrong?</b><div class="row" style="margin-top:8px"><button class="btn ghost" data-flag="The marked answer is wrong" type="button">The answer is wrong</button><button class="btn ghost" data-flag="Not what my notes mean" type="button">Not what my notes mean</button><button class="btn ghost" data-flag="Confusing wording" type="button">Confusing wording</button><button class="link" id="p-unflag" type="button">Cancel</button></div><p class="tiny muted" style="margin:8px 0 0">Flagged questions stop showing up and are not counted. You can bring them back in Progress.</p></div>';
    return o + '</div>';
  }
  function feedbackHtml(st, u, q) {
    var fb = u.fb, o;
    if (fb.right) o = '<div class="fb good"><h3><svg><use href="#i-check"/></svg>' + (u.tries ? 'Got it on the second try' : 'Right') + '</h3>' + quote(q.src) + '</div>';
    else if (fb.idk) o = '<div class="fb oops"><h3>No problem, now you’ve seen it</h3><p style="margin:0 0 4px">The answer is <b>' + h(fb.correct) + '</b>.</p>' + quote(q.src) + '</div>';
    else {
      o = '<div class="fb oops"><h3>' + (u.tries || u.kind === 'check' ? 'Not this time' : 'Not quite') + '</h3>' +
        (u.tries || u.kind === 'check' ? '<p style="margin:0 0 4px">The answer is <b>' + h(fb.correct) + '</b>.</p>' : '<p style="margin:0 0 4px">Here is what your notes say. Read it, then try again.</p>') + quote(q.src) +
        (fb.otherSrc ? '<p class="small" style="margin:10px 0 2px">You picked <b>' + h(q.options[u.picked]) + '</b>. ' + (fb.otherSrc.type === 'define' ? 'In your notes, that describes <b>' + h(fb.otherSrc.term) + '</b>:' : 'Your notes describe ' + h(fb.otherSrc.term) + ' like this:') + '</p>' + quote(fb.otherSrc.src) : '') +
        '<div class="extra"><span class="tag">Extra tip · not from your notes</span><div>' + h(fb.extra) + '</div></div></div>';
    }
    var canRetry = !fb.right && !fb.idk && !u.tries && u.kind !== 'check';
    var last = u.i === u.qs.length - 1;
    return o + '<div class="qactions">' + (canRetry ? '<button class="btn" id="p-retry" type="button">Try again</button>' : '<button class="btn" id="p-next" type="button">' + (last ? 'Finish' : 'Next question') + '</button>') + '</div>';
  }
  after(vPractice, function () {
    var u = uiSession, st = set(); if (!u || !st) return;
    if (u.phase === 'end') { bindEnd(st, u); return; }
    var q = u.cur;
    var pr = document.getElementById('q-prompt'); if (pr && u.phase === 'ask') pr.focus({ preventScroll: true });
    view.querySelectorAll('[data-opt]').forEach(function (b) { b.onclick = function () { answer(st, u, +b.getAttribute('data-opt')); }; });
    var idk = document.getElementById('p-idk'); if (idk) idk.onclick = function () { u.picked = -1; u.fb = { right: false, idk: true, correct: q.options[q.answer] }; u.phase = 'final'; record(st, q, 0); u.results[u.i] = 0; save(); render(); };
    var rt = document.getElementById('p-retry'); if (rt) rt.onclick = function () { var nq = E.retryFor(q, derived(st).questions, 'r' + Date.now()); nq = Object.assign({}, nq, { origId: q.retryOf || q.origId || q.id, topicId: q.topicId }); u.cur = nq; u.tries = 1; u.phase = 'ask'; u.picked = null; render(); };
    var nx = document.getElementById('p-next'); if (nx) nx.onclick = function () { nextQ(st, u); };
    var sh = document.getElementById('p-show'); if (sh) sh.onclick = function () { u.phase = 'rate'; render(); };
    view.querySelectorAll('[data-rate]').forEach(function (b) { b.onclick = function () { var r = +b.getAttribute('data-rate'); record(st, q, r, true); u.results[u.i] = r; save(); nextQ(st, u); }; });
    var fl = document.getElementById('p-flag'); if (fl) fl.onclick = function () { u.flagging = true; render(); };
    var uf = document.getElementById('p-unflag'); if (uf) uf.onclick = function () { u.flagging = false; render(); };
    view.querySelectorAll('[data-flag]').forEach(function (b) { b.onclick = function () {
      var id = q.origId || q.retryOf || q.id, orig = derived(st).questions.filter(function (x) { return x.id === id; })[0] || q;
      st.flags[id] = { reason: b.getAttribute('data-flag'), at: Date.now(), prompt: orig.prompt, topicId: q.topicId };
      // a flagged question is not counted: drop answers recorded for it in this session
      if (u.results[u.i] != null && u.results[u.i] !== 'flag') { for (var k = st.answers.length - 1; k >= 0; k--) { if (st.answers[k].qid === id) { st.answers.splice(k, 1); break; } } }
      u.results[u.i] = 'flag'; u.flagging = false; save(); toast('Thanks. That question won’t come up again.'); nextQ(st, u);
    }; });
    document.getElementById('p-quit').onclick = function () { if (u.results.filter(function (r) { return r != null; }).length) { u.phase = 'end'; u.ended = true; finish(st, u); } else { uiSession = null; S.session = null; save(); go(st.step < 6 ? '#/setup/' + st.step : '#/home'); } };
  });
  function answer(st, u, i) {
    var q = u.cur; u.picked = i; u.fb = E.feedback(q, i);
    if (u.fb.right) { var r = u.tries ? 0.5 : 1; record(st, q, r); u.results[u.i] = r; u.phase = 'final'; }
    else if (u.tries || u.kind === 'check') { record(st, q, 0); u.results[u.i] = 0; u.phase = 'final'; }
    else u.phase = 'fb';
    save(); render();
    var fb = view.querySelector('.fb'); if (fb && fb.scrollIntoView) { var acts = view.querySelector('.qactions') || fb; acts.scrollIntoView({ block: 'nearest' }); }
  }
  function nextQ(st, u) {
    if (u.i >= u.qs.length - 1) { u.phase = 'end'; finish(st, u); return; }
    u.i++; u.cur = u.qs[u.i]; u.tries = 0; u.phase = 'ask'; u.picked = null; u.fb = null; save(); render();
  }
  function finish(st, u) {
    var counted = u.results.filter(function (r) { return typeof r === 'number'; });
    if (counted.length) st.sessions.push({ date: todayYmd(), at: Date.now(), kind: u.kind, n: counted.length, right: counted.filter(function (r) { return r === 1; }).length });
    if (u.kind === 'check') st.step = Math.max(st.step, 5);
    S.session = null; save(); render();
  }
  function endScreen(st, u) {
    var counted = u.results.filter(function (r) { return typeof r === 'number'; });
    var first = counted.filter(function (r) { return r === 1; }).length, second = counted.filter(function (r) { return r === 0.5; }).length;
    var topics = Object.keys(u.before);
    var colors = ['#FFCC33', '#B8A6F2', '#1F4FE0', '#FFCC33', '#6A4FC9', '#7FA0FF', '#FFCC33', '#B8A6F2', '#1F4FE0', '#FFE07A'];
    var conf = colors.map(function (c, i) { var a = i / colors.length * Math.PI * 2, r = 70 + (i % 3) * 14; return '<i style="background:' + c + ';--x:' + Math.round(Math.cos(a) * r) + 'px;--y:' + Math.round(Math.sin(a) * r) + 'px;animation-delay:' + (0.12 + i * 0.02) + 's"></i>'; }).join('');
    var check = u.kind === 'check';
    return '<div class="card done-card"><div class="burst">' + conf + '<div class="tick"><svg><use href="#i-check"/></svg></div></div>' +
      '<h1>' + (check ? 'Quick check done' : u.ended ? 'Nice work, saved' : 'Session done') + '</h1>' +
      '<p class="muted">' + (counted.length ? first + ' of ' + counted.length + ' right on the first try' + (second ? ', ' + second + ' on the second try' : '') + '.' : 'Nothing was counted this time.') + '</p>' +
      '<div class="moves">' + topics.map(function (id) {
        var t = topicById(st, id); if (!t) return '';
        var a = u.before[id], b = status(st, id);
        var lbl = { 'new': 'Not checked yet', practice: 'Needs practice', getting: 'Getting there', solid: 'Looking solid' };
        return '<div class="move"><b>' + h(t.name) + '</b><span class="small">' + (a !== b.key ? '<span class="muted">' + lbl[a] + '</span> → ' : '') + statusPill(b) + '</span></div>';
      }).join('') + '</div>' +
      '<p class="tiny muted">A rough guess from a few answers. It can’t measure everything you know, and it’s not a prediction of your grade.</p>' +
      (check ? '<button class="btn big wide" id="e-plan" type="button">Next: make my plan</button>' : '<div class="row"><a class="btn ghost" style="flex:1" href="#/home">Home</a><button class="btn" style="flex:1" id="e-again" type="button">Another session</button></div>');
  }
  function bindEnd(st, u) {
    var p = document.getElementById('e-plan'); if (p) p.onclick = function () { uiSession = null; go('#/setup/5'); };
    var a = document.getElementById('e-again'); if (a) a.onclick = function () { uiSession = null; startSession(st, 'session', E.nextSession(eset(st), derived(st).questions, today(), 6).questions); };
    view.querySelectorAll('a[href="#/home"]').forEach(function (x) { x.addEventListener('click', function () { uiSession = null; }); });
  }
  document.addEventListener('keydown', function (e) {
    if (!uiSession || !/^#\/practice/.test(location.hash) || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    var k = e.key; if (/^[1-4]$/.test(k)) { var b = view.querySelector('[data-opt="' + (+k - 1) + '"]:not([disabled])'); if (b) { e.preventDefault(); b.click(); } }
    if (k === 'Enter' && !/^(BUTTON|A)$/.test(e.target.tagName)) { var n = document.getElementById('p-next') || document.getElementById('p-retry'); if (n) { e.preventDefault(); n.click(); } }
  });

  /* ---------- progress ---------- */
  function vProgress() {
    var st = set(), d = derived(st), flags = Object.keys(st.flags);
    var total = st.sessions.length;
    return '<div class="eyebrow">' + h(st.subject) + '</div><h1>Progress by topic</h1><p class="muted">From your recent answers on each topic. ' + plural(total, 'session') + ' done so far.</p>' +
      '<div class="note" style="margin-bottom:14px">These are rough guesses from a few questions each. They can’t measure everything you understand, and they don’t predict a grade. Use them to choose what to practice.</div>' +
      liveTopics(st).map(function (t) {
        var s = status(st, t.id);
        return '<div class="prow"><div class="spread"><a href="#/topic/' + t.id + '" style="color:inherit;font-weight:750;text-decoration:none">' + h(t.name) + '</a>' + statusPill(s) + '</div>' +
          '<div class="track ' + s.key + '" aria-hidden="true"><span></span><span></span><span></span></div><div class="track-l" aria-hidden="true"><span>Needs practice</span><span>Getting there</span><span>Looking solid</span></div>' +
          '<div class="tiny muted" style="margin-top:6px">' + (s.n ? 'Based on ' + plural(s.n, 'answer') + (s.selfOnly ? ' (your own ratings)' : '') : 'Not checked yet: it will come up in your plan') + '</div></div>';
      }).join('') +
      '<div class="card" style="margin-top:14px"><h3>Flagged questions</h3>' + (flags.length ? flags.map(function (id) { var f = st.flags[id]; return '<div class="doc"><div class="grow"><div class="small"><b>' + h(f.reason) + '</b></div><div class="tiny muted">' + h(f.prompt || '') + '</div></div><button class="btn ghost" type="button" data-unflag="' + id + '">Bring back</button></div>'; }).join('') : '<p class="small muted" style="margin:0">None. If a question is wrong or confusing, use “Report a problem” on it.</p>') + '</div>';
  }
  after(vProgress, function () { var st = set(); view.querySelectorAll('[data-unflag]').forEach(function (b) { b.onclick = function () { delete st.flags[b.getAttribute('data-unflag')]; save(); toast('Question is back'); render(); }; }); });

  /* ---------- more: how it works, privacy, plans ---------- */
  function vMore() {
    var st = set();
    return '<h1>More</h1>' +
      (st ? '<div class="card"><div class="spread"><div><h3 style="margin:0">' + h(st.subject) + '</h3><div class="small muted">' + plural(st.docs.length, 'document') + ' · ' + plural(liveTopics(st).length, 'topic') + '</div></div><a class="btn soft" href="#/material">Study material</a></div>' +
        '<div class="row" style="margin-top:12px"><button class="btn ghost" id="m-new" type="button">+ New subject</button><button class="link" id="m-delset" type="button" style="color:var(--oops)">Delete this subject</button></div></div>' : '') +
      '<div class="card"><h3>How the questions are made</h3><p class="small">Questions are written by a built-in reader on this device, <b>not by AI</b>. It looks for definitions (“Osmosis is…”, “Term: meaning”) and key words in your sentences, and makes four kinds of questions: what a term means, which term fits, fill the gap, and explain it in your own words. Every question shows the line it came from.</p>' +
      '<p class="small">Because it only uses your sentences, it can miss ideas, make awkward questions, or only ask “how sure are you?” for topics with no notes. Please report any wrong or confusing question. “Extra tips” are general study tips, clearly labeled, not facts about your subject.</p>' +
      '<div class="note cobalt"><b>Not connected: an AI writer.</b> Varied questions, step-by-step explanations beyond your notes, and better reading of messy notes need an AI model (for example the Claude API). That requires a small server holding an API key, plus a privacy notice, because your notes would be sent to it. That is not set up, so nothing leaves this device.</div></div>' +
      '<div class="card"><h3>Privacy</h3><ul class="small" style="padding-left:18px;margin:0"><li>No account, no name, no email, no school.</li><li>Files are read on this device and are not uploaded. Only the text is kept, on this device, so questions can be made.</li><li>Photos are read by a text reader that runs in your browser. Its files load from this site.</li><li>Storage: ' + (Store.mode() === 'memory' ? 'this browser blocks saving, so everything is lost when you close the page.' : 'saved in this browser only. Clearing site data removes it.') + '</li></ul>' +
      '<button class="btn ghost" id="m-wipe" type="button" style="margin-top:12px;color:var(--oops);border-color:var(--oops-l)">Delete everything on this device</button></div>' +
      '<div class="card"><h3>Plans <span class="chip sun" style="vertical-align:middle">Idea being tested</span></h3><p class="small muted">Nothing is charged and nothing is limited right now. The prices are a guess to learn what students find fair.</p>' +
      '<div class="plans"><div class="plan-card"><b>Free</b><ul class="small"><li>Practice from your own notes, as much as you want</li><li>Topic map, plan and progress</li><li>Up to 3 subjects and 5 documents each (planned)</li></ul></div>' +
      '<div class="plan-card plus"><b>Plus</b> <span class="small muted">about $4.99/month (a guess)</span><ul class="small"><li>Larger document allowance</li><li>More personalised practice written by AI, once connected</li><li>Extra explanations, labeled as going beyond your notes</li></ul></div></div>' +
      '<p class="tiny muted" style="margin:10px 0 0">Study Rescue does not promise better grades. It helps you practice and see what to work on next.</p></div>' +
      '<div class="card"><h3>Credits</h3><p class="small muted" style="margin:0">PDF reading: pdf.js (Mozilla, Apache License 2.0). Photo reading: Tesseract.js (Apache License 2.0). Sample notes were written for this demo.</p></div>';
  }
  after(vMore, function () {
    var w = document.getElementById('m-wipe');
    w.onclick = function () { if (!w.dataset.sure) { w.dataset.sure = 1; w.textContent = 'Tap again to delete everything'; return; } Store.clear().then(function () { S = blank(); uiSession = null; cache.key = null; save(); toast('Everything deleted'); go('#/welcome'); }); };
    var n = document.getElementById('m-new'); if (n) n.onclick = function () { newSet(); save(); go('#/setup/1'); };
    var d = document.getElementById('m-delset'); if (d) d.onclick = function () { if (!d.dataset.sure) { d.dataset.sure = 1; d.textContent = 'Tap again to delete ' + set().subject; return; } delete S.sets[S.active]; S.active = Object.keys(S.sets)[0] || null; cache.key = null; save(); toast('Subject deleted'); go('#/home'); };
  });

  /* ---------- start ---------- */
  function blank() { return { v: 1, active: null, sets: {}, seenWelcome: false, session: null }; }
  Store.get('state', null).then(function (s) {
    S = s && s.v === 1 ? s : blank();
    if (S.session && S.sets[S.session.setId]) uiSession = S.session;
    window.SRApp = { get state() { return S; }, get session() { return uiSession; }, derived: function () { return derived(set()); } };
    if (!location.hash) location.hash = S.seenWelcome ? (uiSession ? '#/practice' : '#/home') : '#/welcome';
    render();
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
