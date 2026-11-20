/* Screenshot → Done. All processing happens on this device. */
(function () {
  'use strict';
  var P = window.SDParse, ICS = window.SDIcs, S = window.SDStore;
  var view = document.getElementById('view');
  var fileInput = document.getElementById('file');
  var state = { draft: null, settings: null, ocr: null, ocrLoading: null, lastDone: null };

  var CAT = {
    appointment: { label: 'Appointment', icon: 'i-cal' }, event: { label: 'Event', icon: 'i-spark' },
    assignment: { label: 'Assignment', icon: 'i-check' }, receipt: { label: 'Receipt', icon: 'i-receipt' },
    booking: { label: 'Booking', icon: 'i-book' }, message: { label: 'Message', icon: 'i-text' }, note: { label: 'Note', icon: 'i-book' }
  };
  var ACT = {
    event: { label: 'Create an event', sub: 'Makes a calendar file you add to your calendar', icon: 'i-cal' },
    reminder: { label: 'Set a reminder', sub: 'Shows here when it is due; calendar alert optional', icon: 'i-bell' },
    checklist: { label: 'Make a checklist', sub: 'Tick things off in this app', icon: 'i-check' },
    receipt: { label: 'Save a receipt', sub: 'Keeps the amount, shop and date', icon: 'i-receipt' },
    save: { label: 'Save for later', sub: 'Keeps the details, searchable', icon: 'i-book' }
  };
  var DEFAULT_SETTINGS = { keepImage: false, keepText: false, autoDeleteImagesDays: 7, autoDeleteDoneDays: 0 };

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ic(id) { return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function today() { return P.ymd(new Date()); }
  function $(sel, el) { return (el || view).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || view).querySelectorAll(sel)); }
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function daysBetween(a, b) { return Math.round((P.fromYmd(b) - P.fromYmd(a)) / 864e5); }
  function relDay(date) {
    var d = daysBetween(today(), date);
    if (d === 0) return 'Today'; if (d === 1) return 'Tomorrow'; if (d === -1) return 'Yesterday';
    if (d > 1 && d < 7) return 'In ' + d + ' days'; if (d < 0) return Math.abs(d) + ' days ago';
    return P.niceDate(date).replace(/, \d{4}$/, '');
  }
  function catOf(it) { return CAT[it.category] || CAT.note; }
  function itemSub(it) {
    var parts = [];
    if (it.kind === 'receipt' && it.amount) parts.push(it.amount);
    if (it.date) parts.push(P.niceDate(it.date).replace(/, \d{4}$/, '') + (it.time ? ' · ' + P.niceTime(it.time) : ''));
    if (it.location) parts.push(it.location);
    if (it.kind === 'checklist' && it.checklist) { var d = it.checklist.filter(function (c) { return c.done; }).length; parts.push(d + ' of ' + it.checklist.length + ' done'); }
    if (!parts.length) parts.push(ACT[it.kind] ? ACT[it.kind].label.replace(/^(Create an|Set a|Make a|Save a|Save for later)\s*/i, '') || 'Saved' : 'Saved');
    return parts.join(' · ');
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
  }
  function safeName(s) { return (String(s || 'item').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'item'); }
  function modal(html, onReady) {
    var bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(bg);
    function close() { bg.remove(); }
    bg.addEventListener('click', function (e) { if (e.target === bg || e.target.closest('[data-close]')) close(); });
    var f = bg.querySelector('button'); if (f) f.focus();
    if (onReady) onReady(bg, close);
    return close;
  }

  /* ---------- settings + housekeeping ---------- */
  function loadSettings() {
    return S.getKV('settings', null).then(function (s) { state.settings = Object.assign({}, DEFAULT_SETTINGS, s || {}); });
  }
  function saveSettings() { return S.setKV('settings', state.settings); }
  function housekeeping() {
    return S.all().then(function (items) {
      var now = Date.now(), jobs = [];
      items.forEach(function (it) {
        if (it.image && state.settings.autoDeleteImagesDays && now - it.createdAt > state.settings.autoDeleteImagesDays * 864e5) { delete it.image; jobs.push(S.put(it)); }
        else if (it.done && it.doneAt && state.settings.autoDeleteDoneDays && now - it.doneAt > state.settings.autoDeleteDoneDays * 864e5) jobs.push(S.del(it.id));
      });
      return Promise.all(jobs);
    });
  }
  function countThisMonth() {
    var k = 'count-' + today().slice(0, 7);
    return S.getKV(k, 0).then(function (n) { return S.setKV(k, n + 1); });
  }

  /* ---------- OCR (Tesseract.js, files served from this site) ---------- */
  function abs(p) { return new URL(p, location.href).href; }
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + src)); }; document.head.appendChild(s); }); }
  var progressCb = null;
  function getOcr() {
    if (state.ocr) return Promise.resolve(state.ocr);
    if (state.ocrLoading) return state.ocrLoading;
    state.ocrLoading = (window.Tesseract ? Promise.resolve() : loadScript('vendor/ocr/tesseract.min.js')).then(function () {
      return window.Tesseract.createWorker('eng', 1, {
        workerPath: abs('vendor/ocr/worker.min.js'), corePath: abs('vendor/ocr/'), langPath: abs('vendor/ocr/lang'),
        gzip: true, cacheMethod: 'write',
        logger: function (m) { if (progressCb) progressCb(m); }
      });
    }).then(function (w) { state.ocr = w; return w; }).catch(function (e) { state.ocrLoading = null; throw e; });
    return state.ocrLoading;
  }
  // Small screenshots read better when enlarged first.
  function prepImage(file) {
    return new Promise(function (resolve) {
      var img = new Image(); var url = URL.createObjectURL(file);
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, scale = w < 900 ? Math.min(2.5, 1400 / w) : 1;
        if (scale === 1) { resolve({ src: file, url: url, w: w, h: h }); return; }
        var c = document.createElement('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
        var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
        resolve({ src: c, url: url, w: w, h: h });
      };
      img.onerror = function () { resolve({ src: file, url: url, w: 0, h: 0, bad: true }); };
      img.src = url;
    });
  }
  function smallCopy(url) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, 900 / img.naturalHeight, 480 / img.naturalWidth);
        var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }

  /* ---------- start a draft ---------- */
  function startFromFile(file) {
    if (!file || !/^image\//.test(file.type)) { toast('That is not an image. Choose a screenshot.'); return; }
    state.draft = { id: uid(), source: 'image', status: 'reading', fileName: file.name, keepImage: state.settings.keepImage };
    prepImage(file).then(function (p) {
      state.draft.imageUrl = p.url; state.draft._ocrSrc = p.src;
      if (p.bad) { state.draft.status = 'error'; state.draft.error = 'This image could not be opened.'; }
      go('#/review'); render();
      if (!p.bad) runOcr(state.draft);
    });
  }
  function runOcr(d) {
    progressCb = function (m) {
      if (state.draft !== d) return;
      var label = { 'loading tesseract core': 'Getting the text reader ready', 'initializing tesseract': 'Getting the text reader ready', 'loading language traineddata': 'Loading English (first time only)', 'initializing api': 'Almost ready', 'recognizing text': 'Reading the text' }[m.status] || 'Working';
      var pct = m.status === 'recognizing text' ? 30 + Math.round(m.progress * 70) : Math.round((m.progress || 0) * 28);
      d.progress = { label: label, pct: pct };
      var lab = document.getElementById('ocr-label'), bar = document.getElementById('ocr-bar');
      if (lab) lab.textContent = label + '…'; if (bar) bar.style.width = Math.max(4, pct) + '%';
    };
    getOcr().then(function (w) { return w.recognize(d._ocrSrc); }).then(function (res) {
      if (state.draft !== d) return;
      var text = (res && res.data && res.data.text) || '';
      d.confidence = res && res.data ? Math.round(res.data.confidence) : null;
      finishRead(d, text);
    }).catch(function (e) {
      if (state.draft !== d) return;
      d.status = 'error'; d.error = 'The text reader could not start (' + (e && e.message ? e.message : 'unknown error') + '). You can type or paste the text instead.';
      render();
    });
  }
  function startFromText(text, source, sampleMeta) {
    state.draft = { id: uid(), source: source || 'text', status: 'reading', keepImage: false, sample: sampleMeta || null };
    if (sampleMeta && sampleMeta.imageUrl) { state.draft.imageUrl = sampleMeta.imageUrl; }
    finishRead(state.draft, text);
    go('#/review');
  }
  function finishRead(d, text) {
    d.text = text;
    var r = P.parse(text);
    d.parsed = r;
    var L = function (f) { return f ? f.level : 'missing'; };
    d.f = {
      category: r.category.value, title: r.title ? r.title.value : '', date: r.date && r.date.value ? r.date.value : '',
      time: r.time ? r.time.value : '', endTime: r.endTime ? r.endTime.value : '', location: r.location ? r.location.value : '',
      amount: r.amount ? r.amount.value : '', link: r.link ? r.link.value : '', notes: ''
    };
    d.lv = { category: r.category.level, title: L(r.title), date: L(r.date), time: L(r.time), endTime: L(r.endTime), location: L(r.location), amount: L(r.amount), link: L(r.link) };
    d.notes = { title: r.title && r.title.note, date: r.date && r.date.note, time: r.time && r.time.note, location: r.location && r.location.note, amount: r.amount && r.amount.note, link: r.link && r.link.note };
    d.dateOptions = r.date && r.date.options ? r.date.options : (r.dateOptions && r.dateOptions.length ? [r.date.value].concat(r.dateOptions) : null);
    d.needsConfirm = r.date && r.date.level === 'confirm' ? { date: true } : {};
    d.checklist = r.checklist.map(function (t) { return { t: t, done: false }; });
    d.actions = r.actions; d.action = r.actions[0];
    d.isDeadline = r.isDeadline;
    d.extras = { phone: r.phone, email: r.email };
    d.status = text.trim().length < 3 ? 'empty' : 'ready';
    if (d.source === 'image' && !d.sample) countThisMonth();
    if (location.hash === '#/review') render();
  }

  /* ---------- sample screenshots (made up, drawn on this device, then really read by the OCR) ---------- */
  var SAMPLES = [
    { key: 'dentist', label: 'Dentist text', cat: 'appointment', kind: 'chat', header: 'Bright Smile Dental',
      lines: ['Reminder: your dental cleaning', 'appointment is on Tue, Nov 24,', '2026 at 3:30 PM.', 'Location: 410 Main St, Blaine MN', 'Reply C to confirm.'] },
    { key: 'receipt', label: 'Cafe receipt', cat: 'receipt', kind: 'receipt', header: 'Corner Cafe',
      lines: ['Receipt #2231', 'Nov 18, 2026 8:12 AM', 'Latte          $5.25', 'Bagel          $3.50', 'Subtotal       $8.75', 'Tax            $0.70', 'Total          $9.45', 'Visa ending 4242'] },
    { key: 'essay', label: 'Assignment', cat: 'assignment', kind: 'doc', header: 'Canvas',
      lines: ['Essay: Causes of the Civil War', 'Due next Friday by 11:59 PM', '1000 words, 20 points', '- Pick 3 causes', '- Find 2 sources', '- Write a draft'] }
  ];
  function drawSample(s) {
    var c = document.createElement('canvas'); c.width = 750; c.height = 1334;
    var x = c.getContext('2d');
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#111'; x.font = '600 30px -apple-system, Segoe UI, Arial, sans-serif'; x.fillText('9:41', 48, 56);
    x.fillText('100%', 620, 56);
    x.fillStyle = '#F4F4F6'; x.fillRect(0, 84, 750, 120);
    x.fillStyle = '#111'; x.font = '700 40px -apple-system, Segoe UI, Arial, sans-serif'; x.fillText(s.header, 48, 160);
    var y = 290;
    if (s.kind === 'chat') {
      var h = s.lines.length * 52 + 50;
      x.fillStyle = '#E9E9EB'; roundRect(x, 40, y - 50, 640, h, 34); x.fill();
      x.fillStyle = '#111'; x.font = '400 36px -apple-system, Segoe UI, Arial, sans-serif';
      s.lines.forEach(function (l, i) { x.fillText(l, 72, y + i * 52); });
    } else {
      x.fillStyle = '#111'; x.font = s.kind === 'receipt' ? '500 36px Menlo, Consolas, monospace' : '400 36px -apple-system, Segoe UI, Arial, sans-serif';
      s.lines.forEach(function (l, i) { x.fillText(l, 60, y + i * 62); });
    }
    x.fillStyle = '#888'; x.font = '400 24px -apple-system, Segoe UI, Arial, sans-serif'; x.fillText('Made-up sample screenshot', 48, 1290);
    return c;
  }
  function roundRect(x, l, t, w, h, r) { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
  function startSample(key) {
    var s = SAMPLES.filter(function (x) { return x.key === key; })[0];
    var c = drawSample(s);
    c.toBlob(function (blob) {
      var f = new File([blob], 'sample-' + key + '.png', { type: 'image/png' });
      startFromFile(f);
      state.draft.sample = true;
    }, 'image/png');
  }

  /* ---------- router ---------- */
  function render() {
    var h = location.hash || '';
    var parts = h.replace(/^#\/?/, '').split('/');
    var page = parts[0] || 'home';
    document.body.classList.toggle('hide-nav', page === 'welcome' || page === 'review' || page === 'confirm');
    $$('[data-nav]', document).forEach(function (a) { if (a.dataset.nav === (page === 'item' ? 'saved' : page)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var fn = { welcome: pWelcome, home: pHome, review: pReview, confirm: pConfirm, done: pDone, saved: pSaved, item: pItem, settings: pSettings, paste: pPaste }[page] || pHome;
    if ((page === 'review' || page === 'confirm') && !state.draft) fn = pHome;
    Promise.resolve(fn(parts[1])).then(function () { view.classList.remove('fade'); void view.offsetWidth; view.classList.add('fade'); });
  }
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });

  /* ---------- welcome ---------- */
  function pWelcome() {
    view.innerHTML =
      '<section class="welcome">' +
      '<div class="transform" aria-hidden="true">' +
        '<div class="shot"><div class="scr"><div class="scan"></div><div class="ln" style="width:40%"></div><div class="ln b"></div><div class="ln p"></div><div class="ln"></div><div class="ln" style="width:60%"></div><div class="ln b" style="width:80%"></div><div class="ln"></div></div></div>' +
        '<div class="flow">' + ic('i-arrow') + '</div>' +
        '<div class="result-stack">' +
          '<div class="mini"><i class="a-event">' + ic('i-cal') + '</i><span>Dentist<small>Tue · 3:30 PM</small></span></div>' +
          '<div class="mini"><i class="a-checklist">' + ic('i-check') + '</i><span>Essay checklist<small>0 of 3 done</small></span></div>' +
          '<div class="mini"><i class="a-receipt">' + ic('i-receipt') + '</i><span>Corner Cafe<small>$9.45 saved</small></span></div>' +
        '</div>' +
      '</div>' +
      '<div><h1>Turn screenshots into things you <span class="grad">actually get done.</span></h1>' +
      '<p class="lead">Add a screenshot of an appointment, event, assignment or receipt. Check what it found, then turn it into an event, reminder, checklist or saved receipt.</p></div>' +
      '<div class="points">' +
        '<div>' + ic('i-lock') + '<span><b>Stays on this device.</b> The text is read right here. Your screenshot is not uploaded.</span></div>' +
        '<div>' + ic('i-alert') + '<span><b>Never guesses quietly.</b> Unsure details are marked, and dates like "next Friday" wait for you.</span></div>' +
        '<div>' + ic('i-check') + '<span><b>Nothing happens until you confirm.</b></span></div>' +
      '</div>' +
      '<div class="stack"><button class="btn btn-primary btn-block" id="w-go" type="button">Get started ' + ic('i-arrow') + '</button></div>' +
      '</section>';
    $('#w-go').onclick = function () { S.setKV('welcomed', true).then(function () { go('#/home'); }); };
  }

  /* ---------- home ---------- */
  function greeting() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
  function rowHtml(it, withDate) {
    var c = catOf(it);
    var left = withDate && it.date ? '<span class="datebox"><small>' + P.niceDate(it.date).slice(5, 8) + '</small><b>' + P.fromYmd(it.date).getDate() + '</b></span>' : '<span class="ic c-' + (it.category || 'note') + '">' + ic(c.icon) + '</span>';
    var when = withDate && it.date ? '<span class="when">' + relDay(it.date) + (it.time ? '<br><span class="muted" style="font-weight:600">' + P.niceTime(it.time) + '</span>' : '') + '</span>' : '';
    return '<a class="item' + (it.done ? ' done' : '') + '" href="#/item/' + it.id + '">' + left + '<span class="main"><span class="t">' + esc(it.title || 'Untitled') + '</span><span class="s">' + esc(itemSub(it)) + '</span></span>' + when + '</a>';
  }
  function pHome() {
    return S.all().then(function (items) {
      var t = today();
      var open = items.filter(function (i) { return !i.done; });
      var upcoming = open.filter(function (i) { return i.date && i.date >= t; }).sort(function (a, b) { return (a.date + (a.time || '99')) < (b.date + (b.time || '99')) ? -1 : 1; });
      var overdue = open.filter(function (i) { return (i.kind === 'reminder' && i.remindDate && i.remindDate <= t) || (i.date && i.date < t && (i.kind === 'reminder' || i.kind === 'checklist' || i.isDeadline)); });
      var nowIds = overdue.map(function (i) { return i.id; });
      upcoming = upcoming.filter(function (i) { return nowIds.indexOf(i.id) < 0; });
      var waiting = open.filter(function (i) { return i.calendar === 'file' || i.calendar === 'google'; });
      var shown = upcoming.concat(overdue).map(function (i) { return i.id; });
      var recent = items.filter(function (i) { return shown.indexOf(i.id) < 0; }).sort(function (a, b) { return b.createdAt - a.createdAt; }).slice(0, 4);
      var html = '<div class="wrap"><div class="hello"><p class="eyebrow">' + greeting() + '</p><h1>What did you screenshot?</h1></div>' +
        '<button class="addcard" type="button" data-add><span class="deco"></span><span class="deco2"></span><span class="big"><span class="plus">' + ic('i-plus') + '</span><span><h2>Add screenshot</h2><p>Pick one from your photos' + (matchMedia('(hover:hover)').matches ? ', drop it here, or paste it' : '') + '.</p></span></span></button>' +
        '<div class="home-tools"><a class="btn btn-ghost btn-sm" href="#/paste">' + ic('i-text') + 'Type or paste text</a><button class="btn btn-ghost btn-sm" type="button" id="h-sample">' + ic('i-image') + 'Try a sample</button></div>';
      if (waiting.length) {
        html += '<a class="notice info" href="#/item/' + waiting[0].id + '" style="text-decoration:none;margin-bottom:6px">' + ic('i-cal') + '<span><b>' + waiting.length + ' calendar ' + (waiting.length === 1 ? 'entry' : 'entries') + ' not confirmed.</b> We can\'t see your calendar. Open ' + (waiting.length === 1 ? 'it' : 'each one') + ' and tap "I added it" once it is in.</span></a>';
      }
      html += '<div class="homegrid"><div>';
      if (overdue.length) html += '<div class="section-h"><h2>Needs you now</h2></div><div class="items">' + overdue.slice(0, 4).map(function (i) { return rowHtml(i, true); }).join('') + '</div>';
      html += '<div class="section-h"><h2>Coming up</h2>' + (upcoming.length > 6 ? '<a href="#/saved">See all</a>' : '') + '</div>';
      html += upcoming.length ? '<div class="items">' + upcoming.slice(0, 6).map(function (i) { return rowHtml(i, true); }).join('') + '</div>'
        : '<div class="empty">' + ic('i-cal') + '<p style="margin:0"><b>Nothing coming up yet.</b><br>Dated things you save show here.</p></div>';
      html += '</div><div>';
      html += '<div class="section-h"><h2>Recently saved</h2>' + (items.length ? '<a href="#/saved">All items</a>' : '') + '</div>';
      html += recent.length ? '<div class="items">' + recent.map(function (i) { return rowHtml(i, false); }).join('') + '</div>'
        : '<div class="empty">' + ic('i-book') + '<p style="margin:0">Receipts, checklists and notes show here.</p></div>';
      html += '</div></div></div>';
      view.innerHTML = html;
      $('#h-sample').onclick = sampleChooser;
    });
  }
  function sampleChooser() {
    modal('<h2>Try a sample</h2><p class="muted small">These are made-up screenshots drawn on your device. The real text reader then reads them, so you see exactly how it works.</p>' +
      '<div class="samples">' + SAMPLES.map(function (s) { return '<button class="sample" type="button" data-s="' + s.key + '"><span class="ic c-' + s.cat + '">' + ic(CAT[s.cat].icon) + '</span>' + s.label + '</button>'; }).join('') + '</div>' +
      '<div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn btn-ghost btn-sm" data-close type="button">Cancel</button></div>',
      function (bg, close) { $$('[data-s]', bg).forEach(function (b) { b.onclick = function () { close(); startSample(b.dataset.s); }; }); });
  }

  /* ---------- paste text ---------- */
  function pPaste() {
    view.innerHTML = '<div class="wrap" style="max-width:640px"><div class="topbar"><a class="iconbtn" href="#/home" aria-label="Back">' + ic('i-back') + '</a><h1>Type or paste text</h1></div>' +
      '<p class="muted">Useful when the text reader gets something wrong, or for a message you can copy. It is read the same way as a screenshot.</p>' +
      '<label class="sr" for="pt">Text</label><textarea id="pt" class="paste" placeholder="e.g. Haircut with Ana, Sat Dec 5 at 11:00 AM, 22 Oak Ave"></textarea>' +
      '<div class="row" style="margin-top:14px"><button class="btn btn-primary" id="pt-go" type="button">Read it ' + ic('i-arrow') + '</button></div></div>';
    $('#pt-go').onclick = function () { var v = $('#pt').value; if (!v.trim()) { toast('Type or paste some text first.'); return; } startFromText(v, 'text'); };
  }

  /* ---------- review ---------- */
  function levelTag(l) {
    return { sure: '<span class="tag sure">Found</span>', guess: '<span class="tag guess">Check this</span>', confirm: '<span class="tag confirm">Confirm</span>', missing: '<span class="tag missing">Not found</span>', edited: '<span class="tag sure">Edited</span>' }[l] || '';
  }
  function fieldHtml(d, key, label, icon, input) {
    var l = d.lv[key] || 'missing';
    var cls = l === 'confirm' && d.needsConfirm[key] ? 'confirm' : l === 'guess' ? 'guess' : l === 'missing' ? 'empty-f' : 'sure';
    var note = d.notes[key];
    return '<div class="field ' + cls + '" data-field="' + key + '"><span class="fi">' + ic(icon) + '</span><label for="f-' + key + '">' + label + ' ' + levelTag(l === 'confirm' && !d.needsConfirm[key] ? 'edited' : l) + '</label>' + input + (note ? '<span class="note">' + esc(note) + '</span>' : '') + '</div>';
  }
  function pReview() {
    var d = state.draft;
    var img = d.imageUrl ? '<div class="imgframe"><img src="' + d.imageUrl + '" alt="Your screenshot">' + (d.status === 'reading' ? '<div class="scanbar"></div>' : '') + '</div>'
      : '<div class="imgframe"><div class="textonly">' + esc(d.text || '') + '</div></div>';
    var left = '<div class="imgcol">' + img + (d.sample ? '<p class="small muted" style="margin-top:8px">Made-up sample screenshot.</p>' : '') + '</div>';
    var right;
    if (d.status === 'reading') {
      var p = d.progress || { label: 'Starting the text reader', pct: 3 };
      right = '<div class="card"><p class="eyebrow">Step 1 of 3</p><h2>Reading your screenshot</h2><p class="muted">The text is read on this device. The first time takes longer because the reader (about 11 MB) loads once.</p>' +
        '<div class="progress"><div class="bar"><i id="ocr-bar" style="width:' + Math.max(4, p.pct) + '%"></i></div><p class="small muted" style="margin-top:8px" id="ocr-label">' + esc(p.label) + '…</p></div>' +
        '<button class="btn btn-ghost btn-sm" type="button" id="r-cancel">Cancel</button></div>';
    } else if (d.status === 'error' || d.status === 'empty') {
      right = '<div class="card"><h2>' + (d.status === 'empty' ? 'No text found' : 'Could not read it') + '</h2><p class="muted">' + esc(d.status === 'empty' ? 'The reader did not find any words. Try a sharper screenshot, or type the details yourself.' : d.error) + '</p>' +
        '<div class="row"><a class="btn btn-primary" href="#/paste">Type it instead</a><button class="btn btn-ghost" type="button" data-add>Try another screenshot</button></div></div>';
    } else {
      right = reviewForm(d);
    }
    view.innerHTML = '<div class="wrap"><div class="topbar"><a class="iconbtn" href="#/home" aria-label="Back to home" id="r-back">' + ic('i-back') + '</a><h1>Check the details</h1></div><div class="review">' + left + '<div>' + right + '</div></div></div>';
    var c = $('#r-cancel'); if (c) c.onclick = function () { discardDraft(); go('#/home'); };
    if (d.status === 'ready') wireReview(d);
  }
  function reviewForm(d) {
    var f = d.f, c = CAT[f.category] || CAT.note;
    var catOpts = Object.keys(CAT).map(function (k) { return '<option value="' + k + '"' + (k === f.category ? ' selected' : '') + '>' + CAT[k].label + '</option>'; }).join('');
    var dateInput = '<input type="date" id="f-date" value="' + esc(f.date) + '">';
    var opts = '';
    if (d.dateOptions && d.dateOptions.length) {
      opts = '<div class="opts" role="group" aria-label="Pick the date">' + d.dateOptions.map(function (o) { return '<button type="button" class="opt" data-date="' + o + '" aria-pressed="' + (o === f.date) + '">' + P.niceDate(o).replace(/, \d{4}$/, '') + '</button>'; }).join('') + '</div>';
    }
    var confirmBtn = d.needsConfirm.date && f.date ? '<button type="button" class="btn btn-sm btn-danger confirmbtn" id="date-ok">Yes, ' + esc(P.niceDate(f.date)) + ' is right</button>' : '';
    var dateField = fieldHtml(d, 'date', d.isDeadline ? 'Due date' : 'Date', 'i-cal', dateInput);
    dateField = dateField.slice(0, -6) + opts + confirmBtn + '</div>';
    var guessCount = Object.keys(d.lv).filter(function (k) { return d.lv[k] === 'guess'; }).length;
    var html = '<div class="card">' +
      '<div class="kind"><span class="ic c-' + f.category + '">' + ic(c.icon) + '</span><div style="flex:1"><p class="eyebrow" style="margin:0">Step 2 of 3 · Looks like</p>' +
      '<label class="sr" for="f-category">Type</label><select id="f-category" style="border:0;background:none;font-size:22px;font-weight:800;padding:0;margin-left:-2px">' + catOpts + '</select></div>' + levelTag(d.lv.category === 'sure' ? 'sure' : 'guess') + '</div>' +
      '<p class="small muted" style="margin:4px 0 0">Read by rules on this device, not AI. ' + (guessCount ? '<b style="color:var(--coral-d)">' + guessCount + ' detail' + (guessCount > 1 ? 's' : '') + ' to check</b> (dashed). ' : '') + 'Tap any detail to change it.</p>' +
      '<div class="fields">' +
      fieldHtml(d, 'title', 'Title', 'i-text', '<input id="f-title" value="' + esc(f.title) + '" placeholder="Give it a name">') +
      dateField +
      fieldHtml(d, 'time', 'Time', 'i-clock', '<div class="timeinputs"><input type="time" id="f-time" value="' + esc(f.time) + '" aria-label="Start time"><span>to</span><input type="time" id="f-endTime" value="' + esc(f.endTime) + '" aria-label="End time (optional)"></div>') +
      fieldHtml(d, 'location', 'Place', 'i-pin', '<input id="f-location" value="' + esc(f.location) + '" placeholder="Not in screenshot. Add if you know it">') +
      '<div class="two">' +
      fieldHtml(d, 'amount', 'Amount', 'i-money', '<input id="f-amount" inputmode="decimal" value="' + esc(f.amount) + '" placeholder="None found">') +
      fieldHtml(d, 'link', 'Link', 'i-link', '<input id="f-link" inputmode="url" value="' + esc(f.link) + '" placeholder="None found">') +
      '</div>' +
      '<div class="field"><span class="fi">' + ic('i-book') + '</span><label for="f-notes">Notes</label><textarea id="f-notes" placeholder="Anything to add (optional)">' + esc(f.notes) + '</textarea></div>' +
      '</div>' +
      (d.extras.phone || d.extras.email ? '<p class="small muted" style="margin:12px 0 0">Also found: ' + [d.extras.phone, d.extras.email].filter(Boolean).map(esc).join(' · ') + ' (added to notes when you save).</p>' : '') +
      '<details class="raw"><summary>See all text it read' + (d.confidence != null ? ' (reader confidence ' + d.confidence + '%)' : '') + '</summary><pre>' + esc(d.text) + '</pre></details>' +
      '</div>' +
      '<div class="card" style="margin-top:16px"><p class="eyebrow">Step 3 of 3</p><h2>What do you want to do?</h2><div class="actions" role="group" aria-label="Choose an action">' +
      d.actions.map(function (a, i) { var A = ACT[a]; return '<button type="button" class="action" data-act="' + a + '" aria-pressed="' + (a === d.action) + '"><span class="ic a-' + a + '">' + ic(A.icon) + '</span><span>' + (i === 0 ? '<span class="best">Suggested</span>' : '') + '<b>' + A.label + '</b><small>' + A.sub + '</small></span></button>'; }).join('') +
      '</div></div>' +
      '<div class="sticky-cta"><p class="hint" id="r-hint" hidden></p><button class="btn btn-primary btn-block" id="r-next" type="button">Continue ' + ic('i-arrow') + '</button></div>';
    return html;
  }
  function blockers(d) {
    var b = [];
    if (d.needsConfirm.date) b.push(d.f.date ? 'Confirm the date first (it was written as "' + d.parsed.date.raw + '").' : 'Pick the date first ("' + d.parsed.date.raw + '" does not say which week).');
    if ((d.action === 'event' || d.action === 'reminder') && !d.f.date) b.push((d.action === 'event' ? 'An event' : 'A reminder') + ' needs a date. Add one, or choose another action.');
    if (!d.f.title.trim()) b.push('Add a title.');
    return b;
  }
  function updateCta(d) {
    var b = blockers(d), btn = $('#r-next'), hint = $('#r-hint');
    if (!btn) return;
    btn.disabled = b.length > 0; hint.hidden = !b.length; hint.textContent = b[0] || '';
  }
  function wireReview(d) {
    ['title', 'location', 'amount', 'link', 'notes'].forEach(function (k) {
      var el = $('#f-' + k); el.addEventListener('input', function () { d.f[k] = el.value; if (d.lv[k] && d.lv[k] !== 'sure') { markEdited(k); } updateCta(d); });
    });
    $('#f-time').addEventListener('change', function () { d.f.time = this.value; markEdited('time'); });
    $('#f-endTime').addEventListener('change', function () { d.f.endTime = this.value; });
    $('#f-date').addEventListener('change', function () { d.f.date = this.value; d.needsConfirm.date = false; d.lv.date = this.value ? 'edited' : 'missing'; pReviewKeep(); });
    $$('[data-date]').forEach(function (b) { b.onclick = function () { d.f.date = b.dataset.date; d.needsConfirm.date = false; d.lv.date = 'edited'; pReviewKeep(); }; });
    var ok = $('#date-ok'); if (ok) ok.onclick = function () { d.needsConfirm.date = false; d.lv.date = 'edited'; pReviewKeep(); };
    $('#f-category').addEventListener('change', function () {
      d.f.category = this.value; d.lv.category = 'sure';
      d.actions = P.suggest({ category: { value: d.f.category }, date: d.f.date ? {} : null, amount: d.f.amount ? {} : null, checklist: d.checklist });
      d.action = d.actions[0]; d.isDeadline = d.f.category === 'assignment' || d.isDeadline && d.f.category !== 'receipt';
      pReviewKeep();
    });
    $$('[data-act]').forEach(function (b) { b.onclick = function () { d.action = b.dataset.act; $$('[data-act]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); updateCta(d); }; });
    $('#r-next').onclick = function () { if (!blockers(d).length) go('#/confirm'); };
    updateCta(d);
  }
  function markEdited(k) { var el = view.querySelector('[data-field="' + k + '"]'); if (el && !el.classList.contains('sure')) { el.className = 'field sure'; var t = el.querySelector('.tag'); if (t) t.outerHTML = levelTag('edited'); } state.draft.lv[k] = 'edited'; }
  function pReviewKeep() { var y = window.scrollY; pReview(); window.scrollTo(0, y); }
  function discardDraft() { if (state.draft && state.draft.imageUrl && state.draft.imageUrl.indexOf('blob:') === 0) URL.revokeObjectURL(state.draft.imageUrl); state.draft = null; }

  /* ---------- confirm ---------- */
  function summaryHtml(f, isDeadline) {
    var rows = [];
    rows.push(['i-text', '<b>' + esc(f.title) + '</b>']);
    if (f.date) rows.push(['i-cal', (isDeadline ? 'Due ' : '') + esc(P.niceDate(f.date))]);
    if (f.time) rows.push(['i-clock', esc(P.niceTime(f.time)) + (f.endTime ? ' to ' + esc(P.niceTime(f.endTime)) : '')]);
    if (f.location) rows.push(['i-pin', esc(f.location)]);
    if (f.amount) rows.push(['i-money', esc(f.amount)]);
    if (f.link) rows.push(['i-link', esc(f.link)]);
    return '<div class="summary">' + rows.map(function (r) { return '<div>' + ic(r[0]) + '<span>' + r[1] + '</span></div>'; }).join('') + '</div>';
  }
  function pConfirm() {
    var d = state.draft, f = d.f, a = d.action;
    if (blockers(d).length) { go('#/review'); return; }
    d.opt = d.opt || { alarm: f.time ? 60 : null, remindDate: f.date, remindTime: '', remindWhen: d.isDeadline ? 'daybefore' : 'onday', calendarAlert: false, keepImage: d.keepImage, keepText: state.settings.keepText };
    var o = d.opt;
    var body = '', will = [], wont = [];
    if (a === 'event') {
      body = '<h3 style="margin-top:6px">Alert in your calendar</h3><div class="opt-row" role="group" aria-label="Alert">' +
        [[null, 'None'], [0, 'At start'], [15, '15 min before'], [60, '1 hour before'], [1440, '1 day before']].map(function (x) { return '<button type="button" class="seg" data-alarm="' + x[0] + '" aria-pressed="' + (o.alarm === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
      will = ['Saves it to your list on this device.', 'Downloads a calendar file (.ics) with these details. Open it to add it to Calendar, Google Calendar or Outlook.'];
      wont = ['It is not in your calendar until you open the file and tap Add. A website cannot add it for you.'];
      if (!f.time) will.push('No time was found, so it will be an all-day event.');
    } else if (a === 'reminder') {
      body = '<h3 style="margin-top:6px">Remind me</h3><div class="opt-row" role="group" aria-label="When">' +
        (d.isDeadline ? '<button type="button" class="seg" data-rw="daybefore" aria-pressed="' + (o.remindWhen === 'daybefore') + '">1 day before</button>' : '') +
        '<button type="button" class="seg" data-rw="onday" aria-pressed="' + (o.remindWhen === 'onday') + '">On the day</button>' +
        '<button type="button" class="seg" data-rw="custom" aria-pressed="' + (o.remindWhen === 'custom') + '">Pick a date</button></div>' +
        (o.remindWhen === 'custom' ? '<div class="field" style="margin-top:10px"><span class="fi">' + ic('i-cal') + '</span><label for="rd">Reminder date</label><input type="date" id="rd" value="' + esc(o.remindDate || '') + '"></div>' : '') +
        '<div class="field" style="margin-top:10px"><span class="fi">' + ic('i-clock') + '</span><label for="rt">Reminder time <span class="tag missing">You choose</span></label><input type="time" id="rt" value="' + esc(o.remindTime) + '"><span class="note" style="color:var(--muted)">We don\'t pick a time for you.</span></div>' +
        '<label class="check"><input type="checkbox" id="calAlert"' + (o.calendarAlert ? ' checked' : '') + '><span><b>Also make a calendar alert</b><br><span class="muted small">Downloads a calendar file with an alert. This is the only way your phone can alert you while this app is closed.</span></span></label>';
      will = ['Saves the reminder on this device. It shows on Home when it is due.'];
      wont = ['This app cannot send phone notifications. That needs a native app or a push server, which this version does not have.'];
      if (o.calendarAlert) will.push('Downloads a calendar file with an alert at the reminder time. Open it and tap Add.');
    } else if (a === 'checklist') {
      if (!d.checklist.length) d.checklist = [{ t: '', done: false }];
      body = '<h3 style="margin-top:6px">Checklist</h3><p class="small muted">' + (d.parsed.checklist.length ? 'These lines came from your screenshot.' : 'No list was found in the screenshot. Add the steps yourself.') + '</p><div class="cl" id="cl"></div><button class="btn btn-soft btn-sm" style="margin-top:8px" type="button" id="cl-add">' + ic('i-plus') + 'Add a step</button>';
      will = ['Saves a checklist on this device you can tick off.'];
      if (f.date) will.push('Shows on Home ' + (d.isDeadline ? 'until it is due' : 'by its date') + '.');
    } else if (a === 'receipt') {
      will = ['Saves the receipt details on this device. Receipts can be filtered and exported as a spreadsheet file (CSV).'];
      wont = ['It is not sent to any expense app or bank.'];
      if (!f.amount) wont.push('No amount was found. You can still save it.');
    } else {
      will = ['Saves the details on this device so you can search for them later.'];
    }
    var keep = '<div class="card" style="margin-top:14px"><h3>Privacy for this item</h3>' +
      (d.imageUrl && !d.sample ? '<label class="check"><input type="checkbox" id="keepImg"' + (o.keepImage ? ' checked' : '') + '><span><b>Keep a small copy of the screenshot</b><br><span class="muted small">Off by default. Stored only on this device' + (state.settings.autoDeleteImagesDays ? ', removed after ' + state.settings.autoDeleteImagesDays + ' days' : '') + '.</span></span></label>' : '') +
      '<label class="check"><input type="checkbox" id="keepTxt"' + (o.keepText ? ' checked' : '') + '><span><b>Keep all the text it read</b><br><span class="muted small">Makes more words searchable. Off keeps only the details above.</span></span></label></div>';
    var label = { event: 'Save and download calendar file', reminder: o.calendarAlert ? 'Save and download alert file' : 'Save reminder', checklist: 'Save checklist', receipt: 'Save receipt', save: 'Save for later' }[a];
    view.innerHTML = '<div class="confirm-wrap"><div class="topbar"><a class="iconbtn" href="#/review" aria-label="Back to details">' + ic('i-back') + '</a><h1>' + ACT[a].label + '</h1></div>' +
      '<div class="card">' + summaryHtml(f, d.isDeadline) + body + '</div>' +
      '<div class="card" style="margin-top:14px"><h3>What will happen</h3><ul class="will">' + will.map(function (w) { return '<li>' + ic('i-check') + '<span>' + w + '</span></li>'; }).join('') + wont.map(function (w) { return '<li class="no">' + ic('i-alert') + '<span>' + w + '</span></li>'; }).join('') + '</ul>' +
      (a === 'event' ? '<p class="small muted" style="margin:12px 0 0">Use Google Calendar? <a href="' + esc(ICS.googleLink(f)) + '" target="_blank" rel="noopener" id="gcal">Open it in Google Calendar instead</a>; it is saved only when you press Save there.</p>' : '') + '</div>' +
      keep +
      '<div class="sticky-cta"><p class="hint" id="c-hint" hidden></p><button class="btn btn-primary btn-block" id="c-go" type="button">' + label + '</button></div></div>';
    // wiring
    $$('[data-alarm]').forEach(function (b) { b.onclick = function () { o.alarm = b.dataset.alarm === 'null' ? null : +b.dataset.alarm; pConfirmKeep(); }; });
    $$('[data-rw]').forEach(function (b) { b.onclick = function () { o.remindWhen = b.dataset.rw; pConfirmKeep(); }; });
    var rd = $('#rd'); if (rd) rd.onchange = function () { o.remindDate = rd.value; check(); };
    var rt = $('#rt'); if (rt) rt.onchange = rt.oninput = function () { o.remindTime = rt.value; check(); };
    var ca = $('#calAlert'); if (ca) ca.onchange = function () { o.calendarAlert = ca.checked; pConfirmKeep(); };
    var ki = $('#keepImg'); if (ki) ki.onchange = function () { o.keepImage = ki.checked; };
    $('#keepTxt').onchange = function () { o.keepText = this.checked; };
    var g = $('#gcal'); if (g) g.onclick = function () { save(d, { calendar: 'google' }); };
    if (a === 'checklist') drawChecklist(d);
    function check() {
      var msg = '';
      if (a === 'reminder') {
        if (!o.remindTime) msg = 'Choose a reminder time.';
        else if (o.remindWhen === 'custom' && !o.remindDate) msg = 'Choose a reminder date.';
      }
      if (a === 'checklist' && !d.checklist.some(function (c) { return c.t.trim(); })) msg = 'Add at least one step.';
      $('#c-go').disabled = !!msg; var h = $('#c-hint'); h.hidden = !msg; h.textContent = msg;
      return !msg;
    }
    check(); d._check = check;
    $('#c-go').onclick = function () { if (check()) save(d, {}); };
  }
  function pConfirmKeep() { var y = window.scrollY; pConfirm(); window.scrollTo(0, y); }
  function drawChecklist(d) {
    var box = $('#cl');
    box.innerHTML = d.checklist.map(function (c, i) { return '<div class="cl-row"><input type="text" data-i="' + i + '" value="' + esc(c.t) + '" placeholder="Step ' + (i + 1) + '" aria-label="Step ' + (i + 1) + '"><button type="button" data-rm="' + i + '" aria-label="Remove step ' + (i + 1) + '">×</button></div>'; }).join('');
    $$('#cl input').forEach(function (inp) { inp.oninput = function () { d.checklist[+inp.dataset.i].t = inp.value; d._check && d._check(); }; });
    $$('#cl [data-rm]').forEach(function (b) { b.onclick = function () { d.checklist.splice(+b.dataset.rm, 1); if (!d.checklist.length) d.checklist.push({ t: '', done: false }); drawChecklist(d); d._check && d._check(); }; });
    $('#cl-add').onclick = function () { d.checklist.push({ t: '', done: false }); drawChecklist(d); var l = $$('#cl input'); l[l.length - 1].focus(); };
  }
  function reminderMoment(d) {
    var o = d.opt;
    var date = o.remindWhen === 'custom' ? o.remindDate : o.remindWhen === 'daybefore' ? P.ymd(new Date(P.fromYmd(d.f.date).getTime() - 864e5)) : d.f.date;
    return { date: date, time: o.remindTime };
  }

  /* ---------- save ---------- */
  function save(d, extra) {
    var f = d.f, o = d.opt, a = d.action;
    var notes = f.notes;
    var extras = [d.extras.phone, d.extras.email].filter(Boolean);
    if (extras.length) notes = (notes ? notes + '\n' : '') + extras.join(' · ');
    var item = {
      id: d.id, createdAt: Date.now(), kind: a, category: f.category, title: f.title.trim(), date: f.date || null, time: f.time || null, endTime: f.endTime || null,
      location: f.location || null, amount: f.amount || null, link: f.link || null, notes: notes || '', isDeadline: !!d.isDeadline,
      checklist: a === 'checklist' ? d.checklist.filter(function (c) { return c.t.trim(); }) : null,
      done: false, calendar: null, source: d.sample ? 'sample' : d.source
    };
    if (a === 'reminder') { var m = reminderMoment(d); item.remindDate = m.date; item.remindTime = m.time; }
    if (o.keepText) item.text = d.text;
    var jobs = [];
    if (o.keepImage && d.imageUrl && !d.sample) jobs.push(smallCopy(d.imageUrl).then(function (u) { if (u) item.image = u; }));
    return Promise.all(jobs).then(function () {
      var file = null;
      if (extra.calendar === 'google') item.calendar = 'google';
      else if (a === 'event') { file = ICS.build(item, { alarm: o.alarm }); item.calendar = 'file'; item.alarm = o.alarm; }
      else if (a === 'reminder' && o.calendarAlert) {
        file = ICS.build({ id: item.id, title: 'Reminder: ' + item.title, date: item.remindDate, time: item.remindTime, location: item.location, notes: item.notes, link: item.link }, { alarm: 0, durationMinutes: 15 });
        item.calendar = 'file';
      }
      return S.put(item).then(function () {
        if (file) download(safeName(item.title) + '.ics', file, 'text/calendar');
        state.lastDone = { id: item.id, file: !!file, google: extra.calendar === 'google' };
        discardDraft();
        if (extra.calendar !== 'google') go('#/done/' + item.id); else go('#/done/' + item.id);
      });
    }).catch(function (e) { toast('Could not save: ' + (e && e.message || 'storage error')); });
  }

  /* ---------- done ---------- */
  function pDone(id) {
    return S.get(id).then(function (it) {
      if (!it) { go('#/home'); return; }
      var info = state.lastDone && state.lastDone.id === id ? state.lastDone : {};
      var colors = ['#7C3AED', '#2563FF', '#FF6B57', '#14855C', '#9B5CFF', '#FF9A6B'];
      var sparks = colors.concat(colors).map(function (c, i) { var ang = i / 12 * Math.PI * 2; return '<i style="background:' + c + ';--x:' + Math.round(Math.cos(ang) * 70) + 'px;--y:' + Math.round(Math.sin(ang) * 70) + 'px"></i>'; }).join('');
      var msg = { event: 'Saved to your list.', reminder: 'Reminder saved on this device.', checklist: 'Checklist saved.', receipt: 'Receipt saved.', save: 'Saved for later.' }[it.kind];
      var next = '';
      if (info.file) next = '<div class="notice info" style="text-align:left;margin-top:16px">' + ic('i-down') + '<span><b>A calendar file was downloaded.</b> It is <b>not in your calendar yet.</b> Open the file (iPhone/iPad: tap it in the download bar or the Files app, then Add to Calendar). Then come back and tap "I added it".</span></div>';
      if (info.google) next = '<div class="notice info" style="text-align:left;margin-top:16px">' + ic('i-cal') + '<span>Google Calendar opened in a new tab. <b>It is saved there only if you pressed Save.</b> Tap "I added it" when it is in.</span></div>';
      view.innerHTML = '<div class="success"><div class="burst">' + sparks + '<span class="core">' + ic('i-check') + '</span></div><h1>' + esc(msg) + '</h1>' +
        '<p class="muted">' + esc(it.title) + (it.date ? ' · ' + esc(P.niceDate(it.date)) : '') + '</p>' + next +
        '<div class="stack" style="margin-top:22px">' + (it.calendar === 'file' || it.calendar === 'google' ? '<button class="btn btn-primary btn-block" id="d-added" type="button">I added it to my calendar</button>' : '') +
        '<div class="row" style="justify-content:center"><a class="btn btn-soft" href="#/item/' + it.id + '">View item</a><button class="btn btn-ghost" type="button" data-add>Add another</button><a class="btn btn-ghost" href="#/home">Home</a></div>' +
        (it.calendar === 'file' ? '<button class="btn btn-ghost btn-sm" id="d-again" type="button">' + ic('i-down') + 'Download the file again</button>' : '') + '</div></div>';
      var ad = $('#d-added'); if (ad) ad.onclick = function () { it.calendar = 'confirmed'; S.put(it).then(function () { toast('Marked as added to your calendar.'); go('#/item/' + it.id); }); };
      var ag = $('#d-again'); if (ag) ag.onclick = function () { downloadIcs(it); };
    });
  }
  function downloadIcs(it) {
    var file = it.kind === 'reminder'
      ? ICS.build({ id: it.id, title: 'Reminder: ' + it.title, date: it.remindDate, time: it.remindTime, location: it.location, notes: it.notes, link: it.link }, { alarm: 0, durationMinutes: 15 })
      : ICS.build(it, { alarm: it.alarm != null ? it.alarm : null });
    download(safeName(it.title) + '.ics', file, 'text/calendar');
  }

  /* ---------- saved ---------- */
  var savedState = { q: '', cat: 'all', done: false };
  function matches(it, q) {
    if (!q) return true;
    var hay = [it.title, it.location, it.notes, it.amount, it.link, catOf(it).label, ACT[it.kind] && ACT[it.kind].label, it.text, it.date && P.niceDate(it.date), (it.checklist || []).map(function (c) { return c.t; }).join(' ')].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
  }
  function pSaved() {
    return S.all().then(function (items) {
      var counts = {}; items.forEach(function (i) { counts[i.category] = (counts[i.category] || 0) + 1; });
      var cats = [['all', 'All']].concat(Object.keys(CAT).filter(function (k) { return counts[k]; }).map(function (k) { return [k, CAT[k].label + 's']; }));
      view.innerHTML = '<div class="wrap"><div class="topbar"><h1>Saved</h1><span class="chip gray">' + items.length + ' item' + (items.length === 1 ? '' : 's') + '</span></div>' +
        '<label class="searchbox">' + ic('i-search') + '<span class="sr">Search saved items</span><input id="q" type="search" placeholder="Search titles, places, notes, amounts" value="' + esc(savedState.q) + '" autocomplete="off"></label>' +
        '<div class="filters" role="group" aria-label="Filter">' + cats.map(function (c) { return '<button type="button" data-cat="' + c[0] + '" aria-pressed="' + (savedState.cat === c[0]) + '">' + c[1] + (c[0] !== 'all' ? ' · ' + counts[c[0]] : '') + '</button>'; }).join('') +
        '<button type="button" data-done aria-pressed="' + savedState.done + '">Show done</button></div>' +
        '<div id="list"></div></div>';
      function draw() {
        var list = items.filter(function (i) { return (savedState.cat === 'all' || i.category === savedState.cat) && (savedState.done || !i.done) && matches(i, savedState.q); })
          .sort(function (a, b) { if (a.date && b.date) return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; if (a.date) return -1; if (b.date) return 1; return b.createdAt - a.createdAt; });
        var html = '';
        var receipts = list.filter(function (i) { return i.kind === 'receipt' || i.category === 'receipt'; });
        if (savedState.cat === 'receipt' && receipts.length) {
          var sum = {}; receipts.forEach(function (r) { if (r.amount) { var cur = r.amount[0]; sum[cur] = (sum[cur] || 0) + parseFloat(r.amount.slice(1).replace(/,/g, '')); } });
          html += '<div class="totals"><span>' + receipts.length + ' receipt' + (receipts.length > 1 ? 's' : '') + ' · ' + (Object.keys(sum).map(function (c) { return c + sum[c].toFixed(2); }).join(' + ') || 'no amounts') + '</span><button class="btn btn-sm btn-ghost" style="background:#fff" type="button" id="csv">' + ic('i-down') + 'Export CSV</button></div>';
        }
        html += list.length ? '<div class="savedgrid">' + list.map(function (i) { return rowHtml(i, !!i.date); }).join('') + '</div>'
          : '<div class="empty">' + ic('i-search') + '<p style="margin:0">' + (items.length ? 'Nothing matches.' : '<b>Nothing saved yet.</b><br>Add a screenshot to get started.') + '</p></div>';
        $('#list').innerHTML = html;
        var c = $('#csv'); if (c) c.onclick = function () { exportCsv(receipts); };
      }
      $('#q').addEventListener('input', function () { savedState.q = this.value; draw(); });
      $$('[data-cat]').forEach(function (b) { b.onclick = function () { savedState.cat = b.dataset.cat; $$('[data-cat]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); draw(); }; });
      $('[data-done]').onclick = function () { savedState.done = !savedState.done; this.setAttribute('aria-pressed', savedState.done); draw(); };
      draw();
    });
  }
  function exportCsv(list) {
    function q(s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
    var rows = [['Date', 'Title', 'Amount', 'Place', 'Notes']].concat(list.map(function (r) { return [r.date || '', r.title, r.amount || '', r.location || '', r.notes || '']; }));
    download('receipts.csv', rows.map(function (r) { return r.map(q).join(','); }).join('\n'), 'text/csv');
  }

  /* ---------- item detail ---------- */
  function pItem(id) {
    return S.get(id).then(function (it) {
      if (!it) { view.innerHTML = '<div class="wrap"><div class="empty">This item was deleted.</div><p style="margin-top:12px"><a href="#/saved">Back to saved</a></p></div>'; return; }
      var c = catOf(it);
      var cal = '';
      if (it.date && (it.kind === 'event' || it.calendar)) {
        var st = it.calendar === 'confirmed' ? '<span class="chip green">' + ic('i-check') + 'You marked it as added</span>' : it.calendar === 'file' ? '<span class="chip coral">Calendar file downloaded · not confirmed</span>' : it.calendar === 'google' ? '<span class="chip coral">Opened in Google Calendar · not confirmed</span>' : '<span class="chip gray">Not in a calendar</span>';
        cal = '<div class="card" style="margin-top:14px"><h3>Calendar</h3><p>' + st + '</p><p class="small muted">This app cannot see your calendar, so it only knows what you tell it.</p><div class="row">' +
          '<button class="btn btn-soft btn-sm" type="button" id="i-ics">' + ic('i-down') + 'Download calendar file</button>' +
          (it.kind !== 'reminder' ? '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" id="i-g" href="' + esc(ICS.googleLink(it)) + '">Google Calendar</a>' : '') +
          (it.calendar !== 'confirmed' ? '<button class="btn btn-ghost btn-sm" type="button" id="i-added">I added it</button>' : '') + '</div></div>';
      }
      var cl = '';
      if (it.checklist) {
        cl = '<div class="card" style="margin-top:14px"><div class="spread"><h3 style="margin:0">Checklist</h3><span class="chip">' + it.checklist.filter(function (x) { return x.done; }).length + ' of ' + it.checklist.length + '</span></div><div class="cl" id="icl">' +
          it.checklist.map(function (x, i) { return '<label class="cl-row' + (x.done ? ' done' : '') + '"><input type="checkbox" data-ci="' + i + '"' + (x.done ? ' checked' : '') + '><input type="text" data-ct="' + i + '" value="' + esc(x.t) + '" aria-label="Step ' + (i + 1) + '"></label>'; }).join('') +
          '</div><button class="btn btn-soft btn-sm" style="margin-top:8px" type="button" id="icl-add">' + ic('i-plus') + 'Add a step</button></div>';
      }
      var rem = it.kind === 'reminder' ? '<div class="notice' + (it.remindDate <= today() && !it.done ? '' : ' info') + '" style="margin-top:14px">' + ic('i-bell') + '<span>Reminder: ' + esc(P.niceDate(it.remindDate)) + ' at ' + esc(P.niceTime(it.remindTime)) + '. Shown on Home. ' + (it.calendar ? '' : 'No phone alert is set (this app cannot send notifications).') + '</span></div>' : '';
      view.innerHTML = '<div class="wrap" style="max-width:860px"><div class="topbar"><a class="iconbtn" href="#/saved" aria-label="Back to saved">' + ic('i-back') + '</a><span class="chip c-' + (it.category || 'note') + '">' + ic(c.icon) + c.label + '</span><span class="chip gray">' + ACT[it.kind].label + '</span></div>' +
        '<div class="review" style="' + (it.image ? '' : 'grid-template-columns:1fr') + '">' +
        (it.image ? '<div class="imgcol"><div class="imgframe"><img src="' + it.image + '" alt="Saved copy of the screenshot"></div><button class="btn btn-ghost btn-sm" style="margin-top:10px" id="i-delimg" type="button">' + ic('i-trash') + 'Delete screenshot copy</button></div>' : '') +
        '<div><div class="card"><div class="fields" style="margin-top:0">' +
        '<div class="field sure"><span class="fi">' + ic('i-text') + '</span><label for="e-title">Title</label><input id="e-title" value="' + esc(it.title) + '"></div>' +
        '<div class="two"><div class="field sure"><span class="fi">' + ic('i-cal') + '</span><label for="e-date">' + (it.isDeadline ? 'Due date' : 'Date') + '</label><input type="date" id="e-date" value="' + esc(it.date || '') + '"></div>' +
        '<div class="field sure"><span class="fi">' + ic('i-clock') + '</span><label for="e-time">Time</label><input type="time" id="e-time" value="' + esc(it.time || '') + '"></div></div>' +
        '<div class="field sure"><span class="fi">' + ic('i-pin') + '</span><label for="e-location">Place</label><input id="e-location" value="' + esc(it.location || '') + '" placeholder="None"></div>' +
        '<div class="two"><div class="field sure"><span class="fi">' + ic('i-money') + '</span><label for="e-amount">Amount</label><input id="e-amount" value="' + esc(it.amount || '') + '" placeholder="None"></div>' +
        '<div class="field sure"><span class="fi">' + ic('i-link') + '</span><label for="e-link">Link ' + (it.link ? '<a href="' + esc(/^https?:/i.test(it.link) ? it.link : 'https://' + it.link) + '" target="_blank" rel="noopener noreferrer">Open</a>' : '') + '</label><input id="e-link" value="' + esc(it.link || '') + '" placeholder="None"></div></div>' +
        '<div class="field sure"><span class="fi">' + ic('i-book') + '</span><label for="e-notes">Notes</label><textarea id="e-notes">' + esc(it.notes || '') + '</textarea></div>' +
        '</div><div class="row" style="margin-top:12px"><button class="btn btn-primary btn-sm" type="button" id="i-save">Save changes</button><button class="btn btn-soft btn-sm" type="button" id="i-done">' + (it.done ? 'Mark not done' : ic('i-check') + 'Mark done') + '</button></div></div>' +
        rem + cl + cal +
        (it.text ? '<details class="raw card" style="margin-top:14px"><summary>Text it read</summary><pre>' + esc(it.text) + '</pre><button class="btn btn-ghost btn-sm" id="i-deltext" type="button" style="margin-top:8px">' + ic('i-trash') + 'Delete this text</button></details>' : '') +
        '<div class="row" style="margin-top:18px"><button class="btn btn-danger btn-sm" type="button" id="i-del">' + ic('i-trash') + 'Delete item</button><span class="small muted">Saved ' + new Date(it.createdAt).toLocaleDateString() + (it.source === 'sample' ? ' · from a made-up sample' : '') + '</span></div>' +
        '</div></div></div>';
      function put(msg) { return S.put(it).then(function () { if (msg) toast(msg); }); }
      $('#i-save').onclick = function () {
        ['title', 'date', 'time', 'location', 'amount', 'link', 'notes'].forEach(function (k) { var v = $('#e-' + k).value; it[k] = v || (k === 'notes' ? '' : null); });
        if (!it.title) { toast('Add a title.'); it.title = 'Untitled'; }
        if (it.calendar === 'confirmed' || it.calendar === 'file') it.calendar = it.calendar === 'confirmed' ? 'file' : it.calendar;
        put('Changes saved.' + (it.calendar ? ' If it is in your calendar, update it there too.' : '')).then(function () { pItem(id); });
      };
      $('#i-done').onclick = function () { it.done = !it.done; it.doneAt = it.done ? Date.now() : null; put(it.done ? 'Marked done.' : 'Marked not done.').then(function () { pItem(id); }); };
      $('#i-del').onclick = function () {
        modal('<h2>Delete this item?</h2><p class="muted">It is removed from this device. It cannot be undone. Anything you added to your calendar stays there.</p><div class="row" style="justify-content:flex-end"><button class="btn btn-ghost" data-close type="button">Cancel</button><button class="btn btn-danger" id="m-del" type="button">Delete</button></div>',
          function (bg, close) { bg.querySelector('#m-del').onclick = function () { S.del(id).then(function () { close(); toast('Deleted.'); go('#/saved'); }); }; });
      };
      var di = $('#i-delimg'); if (di) di.onclick = function () { delete it.image; put('Screenshot copy deleted.').then(function () { pItem(id); }); };
      var dt = $('#i-deltext'); if (dt) dt.onclick = function () { delete it.text; put('Text deleted.').then(function () { pItem(id); }); };
      var ics = $('#i-ics'); if (ics) ics.onclick = function () { if (!it.date) { toast('Add a date first.'); return; } downloadIcs(it); if (it.calendar !== 'confirmed') { it.calendar = 'file'; put(); } };
      var ig = $('#i-g'); if (ig) ig.onclick = function () { if (it.calendar !== 'confirmed') { it.calendar = 'google'; put(); } };
      var ia = $('#i-added'); if (ia) ia.onclick = function () { it.calendar = 'confirmed'; put('Marked as added.').then(function () { pItem(id); }); };
      $$('[data-ci]').forEach(function (b) { b.onchange = function () { it.checklist[+b.dataset.ci].done = b.checked; if (it.checklist.every(function (x) { return x.done; }) && it.checklist.length) { it.done = true; it.doneAt = Date.now(); toast('All done. Nice.'); } put().then(function () { pItem(id); }); }; });
      $$('[data-ct]').forEach(function (b) { b.onchange = function () { it.checklist[+b.dataset.ct].t = b.value; put(); }; });
      var ca = $('#icl-add'); if (ca) ca.onclick = function () { it.checklist.push({ t: 'New step', done: false }); it.done = false; put().then(function () { pItem(id); }); };
    });
  }

  /* ---------- settings ---------- */
  function pSettings() {
    var s = state.settings;
    return Promise.all([S.all(), S.getKV('count-' + today().slice(0, 7), 0), navigator.storage && navigator.storage.estimate ? navigator.storage.estimate().catch(function () { return null; }) : null]).then(function (r) {
      var items = r[0], count = r[1], est = r[2];
      var imgs = items.filter(function (i) { return i.image; }).length, texts = items.filter(function (i) { return i.text; }).length;
      var sw = function (id, on) { return '<span class="switch"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span></span></span>'; };
      var cap = function (name, st, what) { return '<tr><td>' + name + '</td><td><span class="status ' + st[0] + '">' + st[1] + '</span><div style="margin-top:4px">' + what + '</div></td></tr>'; };
      view.innerHTML = '<div class="wrap"><div class="topbar"><h1>Settings</h1></div><div class="set-grid">' +
        '<div class="card"><h2>' + ic('i-lock') + ' Privacy</h2>' +
        '<div class="notice ok" style="margin-bottom:8px">' + ic('i-lock') + '<span>Screenshots are read <b>on this device</b>. Nothing is uploaded, there is no account, and this app has no server. Data is stored only in this browser' + (S.mode() === 'memory' ? ' <b>(storage is blocked here, so it is kept only until you close the page)</b>' : '') + '.</span></div>' +
        '<div class="toggle"><label for="s-img"><b>Keep a small copy of screenshots</b><span class="muted small">Default for new items. Off means the screenshot is forgotten after reading.</span></label>' + sw('s-img', s.keepImage) + '</div>' +
        '<div class="toggle"><label for="s-txt"><b>Keep all the text that was read</b><span class="muted small">Makes more words searchable. Off keeps only the details you confirm.</span></label>' + sw('s-txt', s.keepText) + '</div>' +
        '<div class="toggle"><label for="s-ai"><b>Remove screenshot copies after 7 days</b><span class="muted small">The details stay; only the picture goes.</span></label>' + sw('s-ai', !!s.autoDeleteImagesDays) + '</div>' +
        '<div class="toggle"><label for="s-ad"><b>Delete done items after 30 days</b></label>' + sw('s-ad', !!s.autoDeleteDoneDays) + '</div>' +
        '<p class="small muted" style="margin:12px 0">Stored now: ' + items.length + ' item' + (items.length === 1 ? '' : 's') + ', ' + imgs + ' screenshot cop' + (imgs === 1 ? 'y' : 'ies') + ', ' + texts + ' full text' + (texts === 1 ? '' : 's') + (est && est.usage != null ? ' · about ' + (est.usage / 1048576).toFixed(1) + ' MB used by this site (includes the text reader files)' : '') + '.</p>' +
        '<div class="row"><button class="btn btn-ghost btn-sm" id="s-delimgs" type="button"' + (imgs ? '' : ' disabled') + '>' + ic('i-image') + 'Delete all screenshot copies</button><button class="btn btn-danger btn-sm" id="s-wipe" type="button">' + ic('i-trash') + 'Delete everything</button></div></div>' +

        '<div class="card"><h2>What works and what needs more</h2><table class="caps"><tbody>' +
        cap('Reading text (OCR)', ['works', 'Works here'], 'Tesseract.js runs in your browser. Its files (about 11 MB) come from this site and are cached after the first use. Works best on clear, light screenshots; handwriting and fancy fonts often fail.') +
        cap('Understanding it', ['works', 'Works · rules'], 'Plain rules find dates, times, amounts, links and places, and guess the type. It is not AI, so unusual layouts can be misread. That is why everything is checked by you.') +
        cap('Smarter understanding (AI)', ['needs', 'Needs a service'], 'Would need an AI service, an API key and a small server, and the screenshot text would leave your device. Not built.') +
        cap('Create an event', ['alt', 'Calendar file'], 'Websites cannot add to your calendar. You get a .ics file to open (Apple Calendar, Google, Outlook) or a Google Calendar page to save. Direct adding needs a native app with calendar permission.') +
        cap('Reminders', ['alt', 'In-app + file'], 'Reminders show on Home. For a real alert, choose the calendar alert file. Push notifications need a native app or a push server: not built.') +
        cap('Share from Photos', ['needs', 'Needs native app'], 'The iPhone/iPad share sheet only lists native apps. Here: Add screenshot picks from Photos, and on iPad or a computer you can drag or paste. (Android can share to installed web apps; not built yet.)') +
        cap('Checklists, receipts, search', ['works', 'Works here'], 'Saved on this device. Receipts export as CSV.') +
        cap('Sync between devices', ['needs', 'Needs accounts'], 'Needs accounts and a server. Not built.') +
        '</tbody></table></div>' +

        '<div class="card"><h2>Plans <span class="chip coral" style="vertical-align:middle">Idea being tested</span></h2>' +
        '<p class="muted small">These prices are a guess to test, not a proven business model. There is no payment and no limit in this version.</p>' +
        '<div class="plans"><div class="plan"><h3>Free</h3><div class="price">$0</div><ul><li>30 screenshots a month</li><li>Events, reminders, checklists, receipts</li><li>Search and categories</li><li>Everything stays on your device</li></ul></div>' +
        '<div class="plan hi"><h3>Plus</h3><div class="price">$3.99<span class="muted" style="font-size:15px;font-weight:600"> /month (guess)</span></div><ul><li>Unlimited screenshots</li><li>Folders, tags and saved filters</li><li>Receipt reports by month</li><li>Optional AI reading and sync (would need servers)</li></ul></div></div>' +
        '<p class="small muted" style="margin-top:12px">You have added ' + count + ' screenshot' + (count === 1 ? '' : 's') + ' this month (counted on this device only).</p></div>' +

        '<div class="card"><h2>Add to Home Screen</h2><p class="muted small">iPhone/iPad: open this page in Safari, tap Share, then "Add to Home Screen". It opens like an app and the reader works offline after the first use.</p>' +
        '<p class="small muted" style="margin:0">Uses Tesseract.js and its English data (Apache License 2.0). <a href="#/welcome">See the welcome screen</a></p></div>' +
        '</div></div>';
      function bindSw(id, fn) { $('#' + id).onchange = function () { fn(this.checked); saveSettings().then(function () { toast('Saved.'); }); }; }
      bindSw('s-img', function (v) { s.keepImage = v; });
      bindSw('s-txt', function (v) { s.keepText = v; });
      bindSw('s-ai', function (v) { s.autoDeleteImagesDays = v ? 7 : 0; });
      bindSw('s-ad', function (v) { s.autoDeleteDoneDays = v ? 30 : 0; });
      $('#s-delimgs').onclick = function () { Promise.all(items.filter(function (i) { return i.image; }).map(function (i) { delete i.image; return S.put(i); })).then(function () { toast('All screenshot copies deleted.'); pSettings(); }); };
      $('#s-wipe').onclick = function () {
        modal('<h2>Delete everything?</h2><p class="muted">All items, screenshot copies, text and settings are removed from this device, plus the cached text reader. This cannot be undone. Calendar entries you added stay in your calendar.</p><div class="row" style="justify-content:flex-end"><button class="btn btn-ghost" data-close type="button">Cancel</button><button class="btn btn-danger" id="m-wipe" type="button">Delete everything</button></div>',
          function (bg, close) {
            bg.querySelector('#m-wipe').onclick = function () {
              var jobs = [S.clear()];
              if (window.caches) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }));
              try { jobs.push(new Promise(function (res) { var r = indexedDB.deleteDatabase('keyval-store'); r.onsuccess = r.onerror = r.onblocked = function () { res(); }; })); } catch (e) { }
              Promise.all(jobs).then(function () { state.settings = Object.assign({}, DEFAULT_SETTINGS); close(); toast('Everything was deleted.'); go('#/welcome'); });
            };
          });
      };
    });
  }

  /* ---------- global input: add button, paste, drag and drop ---------- */
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-add]'); if (b) { e.preventDefault(); fileInput.value = ''; fileInput.click(); } });
  fileInput.addEventListener('change', function () { if (fileInput.files[0]) startFromFile(fileInput.files[0]); });
  document.addEventListener('paste', function (e) {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    var items = (e.clipboardData && e.clipboardData.files) || [];
    for (var i = 0; i < items.length; i++) if (/^image\//.test(items[i].type)) { e.preventDefault(); startFromFile(items[i]); return; }
  });
  var drop = document.getElementById('drop'), dragN = 0;
  document.addEventListener('dragenter', function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0) { dragN++; drop.classList.add('on'); } });
  document.addEventListener('dragleave', function () { dragN = Math.max(0, dragN - 1); if (!dragN) drop.classList.remove('on'); });
  document.addEventListener('dragover', function (e) { e.preventDefault(); });
  document.addEventListener('drop', function (e) { e.preventDefault(); dragN = 0; drop.classList.remove('on'); var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) startFromFile(f); });

  /* ---------- start ---------- */
  loadSettings().then(housekeeping).then(function () { return S.getKV('welcomed', false); }).then(function (w) {
    if (!w && (!location.hash || location.hash === '#/home')) location.replace('#/welcome');
    render();
  });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () { });
  window.SDApp = { state: state, startFromText: startFromText, SAMPLES: SAMPLES };
})();
