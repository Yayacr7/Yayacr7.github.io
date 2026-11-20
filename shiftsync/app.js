/* ShiftSync app. Everything stays on this device (localStorage). */
(function () {
  'use strict';
  var E = window.SSEngine, R = window.SSReader;
  var view = document.getElementById('view'), fileInput = document.getElementById('file');
  var KEY = 'shiftsync-v1';
  var DEVICE_TZ = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })();
  var DEFAULTS = { weekStart: 0, tz: '', travel: true, alarmMin: 60, soon: true, soonMin: 120, rememberName: true, myName: '', welcomed: false };
  var db = { workplaces: [], shifts: [], settings: Object.assign({}, DEFAULTS) };
  var state = { storage: 'local', imp: null, ocr: null, ocrLoading: null, monthSel: null };
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MOL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /* ---------- storage ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var d = JSON.parse(raw); db.workplaces = d.workplaces || []; db.shifts = d.shifts || []; db.settings = Object.assign({}, DEFAULTS, d.settings || {}); }
    } catch (e) { state.storage = 'memory'; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); state.storage = 'local'; }
    catch (e) { state.storage = 'memory'; }
  }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ic(id) { return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function $(s, el) { return (el || view).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || view).querySelectorAll(s)); }
  function tz() { return db.settings.tz && E.validTz(db.settings.tz) ? db.settings.tz : DEVICE_TZ; }
  function now() { return Date.now(); }
  function today() { return E.msToZoned(now(), tz()).ymd; }
  function wpById(id) { return db.workplaces.find(function (w) { return w.id === id; }); }
  function shiftById(id) { return db.shifts.find(function (s) { return s.id === id; }); }
  function color(w) { return (E.COLORS.find(function (c) { return c.id === w.color; }) || E.COLORS[0]).hex; }
  function tint(hex) { return hex + '14'; }
  function cvars(w) { var c = color(w); return '--c:' + c + ';--tint:' + tint(c); }
  function toast(m) { var t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  function fmtT(hm) { var h = +hm.slice(0, 2), m = hm.slice(3); var ap = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; return h + (m === '00' ? '' : ':' + m) + ' ' + ap; }
  function fmtR(a, b) { return fmtT(a) + ' – ' + fmtT(b); }
  function fmtH(min) { var h = Math.floor(min / 60), m = Math.round(min % 60); return (h ? h + ' h' : '') + (m ? (h ? ' ' : '') + m + ' min' : (h ? '' : '0 h')); }
  function fmtHd(min) { return (Math.round(min / 60 * 100) / 100).toString(); }
  function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function pd(ymd) { var p = ymd.split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
  function dShort(ymd) { var p = pd(ymd); return WD[E.dow(ymd)] + ', ' + MO[p.m - 1] + ' ' + p.d; }
  function dLong(ymd) { var p = pd(ymd); return WDL[E.dow(ymd)] + ', ' + MOL[p.m - 1] + ' ' + p.d; }
  function dRange(a, b) { var x = pd(a), y = pd(b); return MO[x.m - 1] + ' ' + x.d + ' – ' + (x.m === y.m ? '' : MO[y.m - 1] + ' ') + y.d; }
  function relDay(ymd) { var d = E.diffDays(today(), ymd); return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d === -1 ? 'Yesterday' : dShort(ymd); }
  function stamp(ms) { var z = E.msToZoned(ms, tz()); return dShort(z.ymd) + ', ' + fmtT(z.hm); }
  function agoDays(ms) { return Math.floor((now() - ms) / 864e5); }
  function untilText(ms) {
    var m = Math.round((ms - now()) / 6e4); if (m < 1) return 'now';
    if (m < 60) return 'in ' + m + ' min';
    var h = Math.floor(m / 60), r = m % 60; if (h < 24) return 'in ' + h + ' h' + (r ? ' ' + r + ' min' : '');
    var d = Math.round(h / 24); return 'in ' + d + ' day' + (d === 1 ? '' : 's');
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
  }
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

  /* shift views in the calendar time zone */
  function sv(s) {
    var w = wpById(s.wp); if (!w) return null;
    var t = E.times(s, w.tz, 'effective'), sc = E.times(s, w.tz, 'scheduled');
    var a = E.msToZoned(sc.startMs, tz()), b = E.msToZoned(sc.endMs, tz());
    return { s: s, w: w, t: t, sc: sc, sd: a.ymd, st: a.hm, ed: b.ymd, et: b.hm, otherTz: w.tz !== tz() };
  }
  function allViews() { return db.shifts.map(sv).filter(Boolean).sort(function (a, b) { return a.sc.startMs - b.sc.startMs; }); }
  function conflictMap() {
    var m = {}; E.conflicts(db.shifts, db.workplaces, { travel: db.settings.travel }).forEach(function (c) { (m[c.a] = m[c.a] || []).push(c); (m[c.b] = m[c.b] || []).push(c); });
    return m;
  }
  function conflictText(c, selfId) {
    var other = shiftById(c.a === selfId ? c.b : c.a), v = other && sv(other);
    var who = v ? v.w.name + ' ' + dShort(v.sd) + ' ' + fmtR(v.st, v.et) : 'another shift';
    if (c.kind === 'overlap') return 'Overlaps ' + who + ' by ' + fmtH(c.minutes);
    return 'Only ' + fmtH(Math.max(0, c.gapMin)) + ' between this and ' + who + ' (you set ' + fmtH(c.needMin) + ' travel)';
  }
  function flagsFor(v, cm) {
    var f = '';
    (cm[v.s.id] || []).forEach(function (c) { f += c.kind === 'overlap' ? '<span class="tag bad">' + ic('i-alert') + 'Overlap</span>' : '<span class="tag check">' + ic('i-car') + 'Tight travel</span>'; });
    if (v.sc.overnight || v.ed !== v.sd) f += '<span class="tag night">' + ic('i-moon') + 'Ends ' + WD[E.dow(v.ed)] + ' ' + fmtT(v.et) + '</span>';
    if (v.s.worked) f += '<span class="tag ok">' + ic('i-check') + 'Worked' + (v.s.actual ? ' ' + fmtR(v.s.actual.start, v.s.actual.end) : '') + '</span>';
    if (v.s.editedAt && v.s.source === 'photo') f += '<span class="tag plain">Changed by you</span>';
    if (v.w.demo) f += '<span class="tag plain">Demo</span>';
    return f;
  }
  function chip(v, cm) {
    var bad = (cm[v.s.id] || []).some(function (c) { return c.kind === 'overlap'; });
    return '<a class="chip' + (bad ? ' bad' : '') + '" style="' + cvars(v.w) + '" href="#/shift/' + v.s.id + '">' +
      '<span class="stripe"></span><span class="grow"><span class="t num">' + fmtR(v.st, v.et) + '</span>' +
      '<span class="w"><span>' + esc(v.w.name) + '</span>' + (v.otherTz ? '<span class="muted tiny">(' + fmtR(v.s.start, v.s.end) + ' local)</span>' : '') + '</span>' +
      (flagsFor(v, cm) ? '<span class="flags">' + flagsFor(v, cm) + '</span>' : '') + '</span>' +
      '<span class="h num">' + fmtH(v.t.paidMin) + '</span></a>';
  }

  /* ---------- routing ---------- */
  function route() {
    var h = location.hash.replace(/^#\/?/, ''), q = {}, qi = h.indexOf('?');
    if (qi >= 0) { h.slice(qi + 1).split('&').forEach(function (p) { var kv = p.split('='); q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); }); h = h.slice(0, qi); }
    return { parts: h.split('/').filter(Boolean), q: q };
  }
  function render() {
    var r = route(), name = r.parts[0] || 'home';
    if (!db.settings.welcomed && name !== 'welcome' && name !== 'place' && name !== 'settings') { location.replace('#/welcome'); return; }
    document.body.classList.toggle('focus-mode', name === 'import' || name === 'welcome');
    $$('#nav [data-nav]', document).forEach(function (a) { var on = a.getAttribute('data-nav') === (name === 'month' ? 'week' : name === 'place' ? 'places' : name); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (name !== 'import' && state.imp) endImport();
    var fn = { home: home, welcome: welcome, week: week, month: month, add: editShift, shift: editShift, import: importView, places: places, place: editPlace, pay: pay, settings: settings }[name] || home;
    fn(r);
    view.focus({ preventScroll: true });
    if (!r.q.keep) window.scrollTo(0, 0);
    soonBanner();
  }

  /* ---------- welcome ---------- */
  function welcome() {
    view.innerHTML = '<div class="welcome"><div class="row"><span class="logo"></span><b style="font-size:19px">Shift<span style="color:var(--violet-d)">Sync</span></b></div>' +
      '<div class="hero">Your shifts, your time, <span>all together.</span></div>' +
      '<p class="muted" style="font-size:17px">For hourly workers with changing schedules, at one job or a few.</p>' +
      '<div class="demo-week" aria-hidden="true"><div><span style="width:34px">Mon</span><i style="width:42%;background:#0F766E"></i><i style="width:24%;background:#6D28D9"></i></div>' +
      '<div><span style="width:34px">Tue</span><i style="width:30%;background:#6D28D9;margin-left:20%"></i></div><div><span style="width:34px">Wed</span><i style="width:56%;background:#0F766E"></i></div></div>' +
      '<ul class="promise">' +
      '<li>' + ic('i-camera') + '<span><b>Photo of the schedule → your shifts.</b> You pick your own row and check every shift before anything is saved.</span></li>' +
      '<li>' + ic('i-alert') + '<span><b>Overlaps and tight travel flagged</b> across all your jobs, overnight shifts included.</span></li>' +
      '<li>' + ic('i-money') + '<span><b>Estimated gross pay</b> from the hours you confirm and the rates you enter. It is an estimate, not a paycheck.</span></li>' +
      '<li>' + ic('i-lock') + '<span><b>Stays on this device.</b> No account. Photos are read here and not kept.</span></li></ul>' +
      '<div class="btns"><a class="btn accent" href="#/place/new?first=1">Add my first workplace</a><button class="btn ghost" id="w-demo">Look around with demo shifts</button></div>' +
      '<p class="tiny muted" style="margin-top:14px">ShiftSync is your own record. It does not talk to your employer, and changes here do not change your official schedule.</p></div>';
    $('#w-demo').onclick = function () { loadDemo(); db.settings.welcomed = true; save(); toast('Demo shifts added. Remove them any time in Settings.'); go('#/home'); };
  }
  function loadDemo() {
    var ws = E.weekStart(today(), db.settings.weekStart), d = function (n) { return E.addDays(ws, n); };
    var g = { id: 'demo-g', name: 'Corner Grocery', color: 'teal', tz: tz(), rate: 16.5, travelMin: 0, defaultBreak: 30, demo: true };
    var n = { id: 'demo-n', name: 'Night Diner', color: 'violet', tz: tz(), rate: 14, travelMin: 20, defaultBreak: 0, demo: true };
    db.workplaces = db.workplaces.filter(function (w) { return !w.demo; }).concat([g, n]);
    var list = [
      ['demo-g', 1, '09:00', '17:30', 30], ['demo-g', 2, '09:00', '17:30', 30], ['demo-n', 2, '17:30', '23:00', 0], ['demo-g', 4, '12:00', '20:30', 30],
      ['demo-n', 5, '22:00', '06:00', 0], ['demo-g', 6, '10:00', '17:00', 30], ['demo-n', 6, '16:00', '22:00', 0],
      ['demo-g', 8, '09:00', '17:30', 30], ['demo-n', 9, '18:00', '23:00', 0], ['demo-g', 10, '07:00', '15:30', 30], ['demo-n', 12, '22:00', '06:00', 0]
    ];
    db.shifts = db.shifts.filter(function (s) { return s.wp.indexOf('demo-') !== 0; });
    list.forEach(function (x) {
      var s = { id: uid(), wp: x[0], date: d(x[1]), start: x[2], end: x[3], breaks: x[4] ? [{ min: x[4], paid: false }] : [], worked: false, actual: null, rate: null, notes: '', source: 'manual', createdAt: now() };
      var v = E.times(s, tz(), 'scheduled'); if (v.endMs < now()) s.worked = true;
      db.shifts.push(s);
    });
    save();
  }

  /* ---------- home ---------- */
  function home() {
    var t0 = today(), vs = allViews(), cm = conflictMap(), nowMs = now();
    var current = vs.find(function (v) { return v.t.startMs <= nowMs && v.t.endMs > nowMs; });
    var next = vs.find(function (v) { return v.sc.startMs > nowMs; });
    var ws = E.weekStart(t0, db.settings.weekStart), we = E.addDays(ws, 7);
    var wFrom = E.zonedToMs(ws, '00:00', tz()), wTo = E.zonedToMs(we, '00:00', tz());
    var weekViews = vs.filter(function (v) { return v.sc.startMs >= wFrom && v.sc.startMs < wTo; });
    var h = '<div class="top"><div><p class="hello">' + dLong(t0) + '</p><h1>Your shifts</h1></div><a class="iconbtn phone-only" href="#/settings" aria-label="Settings">' + ic('i-gear') + '</a></div>';
    if (!db.workplaces.length) {
      h += '<div class="card"><h2>Start with a workplace</h2><p class="muted">Add each job once (name, colour, time zone, pay rate if you want pay estimates). Then add shifts by hand or from a photo of the schedule.</p><a class="btn accent" href="#/place/new">Add a workplace</a></div>';
      view.innerHTML = h; return;
    }
    var hero = current || next;
    if (hero) {
      var cf = (cm[hero.s.id] || [])[0];
      h += '<a class="next" href="#/shift/' + hero.s.id + '"><span class="count">' + (current ? 'Ends ' + untilText(hero.t.endMs) : untilText(hero.sc.startMs).replace(/^in /, 'In ')) + '</span>' +
        '<div class="lbl">' + ic(current ? 'i-spark' : 'i-bell') + (current ? 'On shift now' : 'Next shift') + '</div>' +
        '<div class="when">' + relDay(hero.sd) + (relDay(hero.sd) === dShort(hero.sd) ? '' : ' · ' + dShort(hero.sd)) + '</div>' +
        '<div class="time num">' + fmtR(hero.st, hero.et) + '</div>' +
        '<span class="place"><span class="dot" style="background:' + color(hero.w) + '"></span>' + esc(hero.w.name) + '</span>' +
        '<div class="meta"><span>' + fmtH(hero.t.paidMin) + ' paid</span>' + (hero.t.unpaidMin ? '<span>' + fmtH(hero.t.unpaidMin) + ' unpaid break</span>' : '') +
        (hero.ed !== hero.sd ? '<span>' + ic('i-moon') + ' Ends ' + dShort(hero.ed) + '</span>' : '') + (hero.w.address ? '<span>' + esc(hero.w.address) + '</span>' : '') + '</div>' +
        (cf ? '<div class="warnline">' + ic('i-alert') + esc(conflictText(cf, hero.s.id)) + '</div>' : '') + '</a>';
    } else {
      h += '<div class="next empty"><div class="lbl">' + ic('i-bell') + 'Next shift</div><div class="time" style="font-size:28px;margin-top:10px">Nothing scheduled</div><div class="meta">Add your next shifts so they show here.</div></div>';
    }
    h += '<div class="quick"><a class="btn ghost" href="#/add">' + ic('i-plus') + 'Add a shift</a><a class="btn ghost" href="#/import">' + ic('i-camera') + 'Schedule photo</a></div>';

    // needs you
    var todo = '';
    var upcomingConf = {}; vs.forEach(function (v) { if (v.t.endMs > nowMs - 864e5 && v.sc.startMs < nowMs + 21 * 864e5) (cm[v.s.id] || []).forEach(function (c) { upcomingConf[c.a + c.b] = { c: c, v: v }; }); });
    Object.keys(upcomingConf).slice(0, 3).forEach(function (k) {
      var x = upcomingConf[k], c = x.c, first = shiftById(c.a), fv = sv(first);
      todo += '<div class="todo"><div class="grow small"><span class="tag ' + (c.kind === 'overlap' ? 'bad' : 'check') + '">' + ic(c.kind === 'overlap' ? 'i-alert' : 'i-car') + (c.kind === 'overlap' ? 'Overlap' : 'Tight travel') + ' · ' + dShort(fv.sd) + '</span><div style="margin-top:5px">' + esc(fv.w.name + ' ' + fmtR(fv.st, fv.et) + ': ' + conflictText(c, c.a).replace(/^Overlaps/, 'overlaps').replace(/^Only/, 'only')) + '</div></div><a class="link" href="#/shift/' + c.a + '">Open</a></div>';
    });
    var past = vs.filter(function (v) { return !v.s.worked && v.sc.endMs <= nowMs && v.sc.endMs > nowMs - 14 * 864e5; });
    past.slice(0, 3).forEach(function (v) {
      todo += '<div class="todo"><span class="dot" style="background:' + color(v.w) + '"></span><div class="grow small"><b>Did you work ' + dShort(v.sd) + ' ' + fmtR(v.st, v.et) + '?</b><br><span class="muted">' + esc(v.w.name) + ' · confirm it to count it in pay</span></div><button class="btn sm soft" data-worked="' + v.s.id + '">Worked as scheduled</button></div>';
    });
    if (past.length > 3) todo += '<div class="todo"><div class="grow small muted">' + (past.length - 3) + ' more past shifts to confirm</div><a class="link" href="#/pay">See all</a></div>';
    db.workplaces.forEach(function (w) {
      if (w.lastImport && agoDays(w.lastImport.at) >= 7 && vs.some(function (v) { return v.w.id === w.id && v.sc.startMs > nowMs; }))
        todo += '<div class="todo"><span class="tag check">Check</span><div class="grow small"><b>' + esc(w.name) + '</b> schedule last confirmed ' + agoDays(w.lastImport.at) + ' days ago. Schedules change: check for a newer one.</div><a class="link" href="#/import?wp=' + w.id + '">Update</a></div>';
    });
    if (todo) h += '<div class="card"><h2>Needs you</h2>' + todo + '</div>';

    // this week
    var byWp = {}, total = 0;
    weekViews.forEach(function (v) { byWp[v.w.id] = (byWp[v.w.id] || 0) + v.t.paidMin; total += v.t.paidMin; });
    var ear = E.earnings(db.shifts, db.workplaces, wFrom, wTo, nowMs);
    h += '<div class="card"><div class="row"><h2 class="grow" style="margin:0">This week</h2><span class="muted small">' + dRange(ws, E.addDays(ws, 6)) + '</span></div>' +
      '<div class="hours"><span class="big num">' + fmtHd(total) + ' h</span><span class="muted">scheduled · ' + weekViews.length + ' shift' + (weekViews.length === 1 ? '' : 's') + '</span></div>';
    if (total) {
      h += '<div class="bar" role="img" aria-label="Hours by workplace">' + Object.keys(byWp).map(function (id) { return '<span style="width:' + (byWp[id] / total * 100) + '%;background:' + color(wpById(id)) + '"></span>'; }).join('') + '</div><div class="legend">' +
        Object.keys(byWp).map(function (id) { var w = wpById(id); return '<div class="row"><span class="dot" style="background:' + color(w) + '"></span><span class="grow">' + esc(w.name) + '</span><b>' + fmtHd(byWp[id]) + ' h</b></div>'; }).join('') + '</div>';
    }
    if (ear.confirmedGross || ear.scheduledGross) h += '<p class="small" style="margin:12px 0 0"><b>Estimated gross:</b> ' + money(ear.confirmedGross) + ' confirmed' + (ear.scheduledGross ? ' + ' + money(ear.scheduledGross) + ' if the rest is worked as scheduled' : '') + '. <a href="#/pay">Not a paycheck: see details</a></p>';
    h += '<div class="btns" style="margin-top:14px"><a class="btn ghost sm" href="#/week">Open the week</a></div></div>';
    view.innerHTML = h;
    $$('[data-worked]').forEach(function (b) { b.onclick = function () { var s = shiftById(b.getAttribute('data-worked')); s.worked = true; s.actual = null; save(); toast('Marked as worked'); render(); }; });
  }

  /* ---------- week ---------- */
  function week(r) {
    var start = E.weekStart(r.parts[1] && E.validYmd(r.parts[1]) ? r.parts[1] : today(), db.settings.weekStart), t0 = today();
    var cm = conflictMap(), vs = allViews();
    var from = E.zonedToMs(E.addDays(start, -1), '00:00', tz()), to = E.zonedToMs(E.addDays(start, 7), '00:00', tz());
    var near = vs.filter(function (v) { return v.sc.endMs > from && v.sc.startMs < to; });
    var total = 0, nConf = 0, seen = {};
    var h = '<div class="calhead"><h1>' + dRange(start, E.addDays(start, 6)) + '</h1>' +
      '<div class="tabs" role="group" aria-label="View"><a href="#/week/' + start + '" aria-current="page">Week</a><a href="#/month/' + start.slice(0, 7) + '">Month</a></div></div>' +
      '<div class="row" style="margin-bottom:12px"><a class="iconbtn" href="#/week/' + E.addDays(start, -7) + '" aria-label="Previous week">' + ic('i-left') + '</a>' +
      '<a class="btn ghost sm" href="#/week/' + E.weekStart(t0, db.settings.weekStart) + '">This week</a><a class="iconbtn" href="#/week/' + E.addDays(start, 7) + '" aria-label="Next week">' + ic('i-right') + '</a><span class="grow"></span><a class="btn soft sm" href="#/add?date=' + (E.diffDays(start, t0) >= 0 && E.diffDays(start, t0) < 7 ? t0 : start) + '">' + ic('i-plus') + 'Shift</a></div>';
    var days = '';
    for (var i = 0; i < 7; i++) {
      var d = E.addDays(start, i), dFrom = E.zonedToMs(d, '00:00', tz()), dTo = E.zonedToMs(E.addDays(d, 1), '00:00', tz());
      var starts = near.filter(function (v) { return v.sd === d; });
      var conts = near.filter(function (v) { return v.sd !== d && v.sc.startMs < dFrom && v.sc.endMs > dFrom; });
      var dayMin = 0; starts.forEach(function (v) { dayMin += v.t.paidMin; total += v.t.paidMin; (cm[v.s.id] || []).forEach(function (c) { var k = c.a + c.b; if (!seen[k]) { seen[k] = 1; nConf++; } }); });
      var strip = '<div class="strip" aria-hidden="true"><i style="left:25%"></i><i style="left:50%"></i><i style="left:75%"></i>' + starts.concat(conts).map(function (v) {
        var a = Math.max(v.sc.startMs, dFrom), b = Math.min(v.sc.endMs, dTo);
        return '<span style="left:' + ((a - dFrom) / (dTo - dFrom) * 100).toFixed(2) + '%;width:' + ((b - a) / (dTo - dFrom) * 100).toFixed(2) + '%;background:' + color(v.w) + '"></span>';
      }).join('') + '</div>';
      days += '<section class="day' + (d === t0 ? ' today' : '') + '" aria-label="' + dLong(d) + '"><div class="dlabel"><div class="wd">' + WD[E.dow(d)] + '</div><div class="dn">' + pd(d).d + '</div>' + (dayMin ? '<div class="dh num">' + fmtHd(dayMin) + ' h</div>' : '') + '</div><div class="dshifts">' +
        conts.map(function (v) { return '<a class="chip cont" style="' + cvars(v.w) + '" href="#/shift/' + v.s.id + '"><span class="stripe"></span><span class="grow"><span class="t num">until ' + fmtT(v.et) + '</span><span class="w">' + esc(v.w.name) + ' · from ' + WD[E.dow(v.sd)] + '</span></span><span></span></a>'; }).join('') +
        starts.map(function (v) { return chip(v, cm); }).join('') +
        (!starts.length && !conts.length ? '<div class="free"><span>Free</span><a class="addday" href="#/add?date=' + d + '" aria-label="Add a shift on ' + dLong(d) + '">' + ic('i-plus') + 'Add</a></div>' : '') +
        '</div>' + (starts.length || conts.length ? strip : '') + '</section>';
    }
    h += '<div class="sumline"><span class="tag plain num">' + fmtHd(total) + ' h scheduled</span>' + (nConf ? '<span class="tag bad">' + ic('i-alert') + nConf + ' to check</span>' : '<span class="tag ok">' + ic('i-check') + 'No overlaps</span>') +
      (db.workplaces.length > 1 ? db.workplaces.map(function (w) { return '<span class="tag plain"><span class="dot" style="background:' + color(w) + ';width:9px;height:9px"></span>' + esc(w.name) + '</span>'; }).join('') : '') + '</div>';
    h += '<div class="days">' + days + '</div><div class="stripkey" aria-hidden="true"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span></div>';
    if (tz() !== DEVICE_TZ) h += '<p class="tiny muted" style="margin-top:10px">Times shown in ' + esc(tz()) + '.</p>';
    view.innerHTML = h;
  }

  /* ---------- month ---------- */
  function month(r) {
    var ym = r.parts[1] && /^\d{4}-\d{2}$/.test(r.parts[1]) ? r.parts[1] : today().slice(0, 7), first = ym + '-01', t0 = today();
    var y = +ym.slice(0, 4), m = +ym.slice(5, 7), prev = (m === 1 ? (y - 1) + '-12' : y + '-' + ('0' + (m - 1)).slice(-2)), next = (m === 12 ? (y + 1) + '-01' : y + '-' + ('0' + (m + 1)).slice(-2));
    var gStart = E.weekStart(first, db.settings.weekStart), cm = conflictMap(), vs = allViews(), sel = r.parts[2] && E.validYmd(r.parts[2]) ? r.parts[2] : (t0.slice(0, 7) === ym ? t0 : null);
    var monthMin = 0;
    var h = '<div class="calhead"><h1>' + MOL[m - 1] + ' ' + y + '</h1><div class="tabs" role="group" aria-label="View"><a href="#/week/' + (sel || first) + '">Week</a><a href="#/month/' + ym + '" aria-current="page">Month</a></div></div>' +
      '<div class="row" style="margin-bottom:12px"><a class="iconbtn" href="#/month/' + prev + '" aria-label="Previous month">' + ic('i-left') + '</a><a class="btn ghost sm" href="#/month/' + t0.slice(0, 7) + '">This month</a><a class="iconbtn" href="#/month/' + next + '" aria-label="Next month">' + ic('i-right') + '</a><span class="grow"></span><span class="tag plain num" id="m-total"></span></div>';
    var cells = '';
    for (var i = 0; i < 7; i++) cells += '<div class="mwd">' + WD[(db.settings.weekStart + i) % 7] + '</div>';
    for (i = 0; i < 42; i++) {
      var d = E.addDays(gStart, i); if (i >= 35 && d.slice(0, 7) !== ym) break;
      var ds = vs.filter(function (v) { return v.sd === d; }), inM = d.slice(0, 7) === ym;
      if (inM) ds.forEach(function (v) { monthMin += v.t.paidMin; });
      var bad = ds.some(function (v) { return (cm[v.s.id] || []).length; });
      cells += '<button type="button" class="mcell' + (inM ? '' : ' out') + (d === t0 ? ' today' : '') + '" data-day="' + d + '" aria-pressed="' + (d === sel) + '" aria-label="' + dLong(d) + ': ' + (ds.length ? ds.length + ' shift' + (ds.length > 1 ? 's' : '') : 'free') + (bad ? ', needs checking' : '') + '">' +
        '<span class="row" style="gap:4px"><span class="n">' + pd(d).d + '</span>' + (bad ? '<span class="warnmark">' + ic('i-alert') + '</span>' : '') + '</span>' +
        ds.slice(0, 3).map(function (v) { return '<span class="b' + (ds.length === 1 ? ' one' : '') + '" style="background:' + color(v.w) + '">' + fmtT(v.st).replace(':00', '').replace(' AM', 'a').replace(' PM', 'p').replace(/:(\d\d) ([AP])M/, ':$1$2') + '</span>'; }).join('') +
        (ds.length > 3 ? '<span class="more">+' + (ds.length - 3) + '</span>' : '') + '</button>';
    }
    h += '<div class="month"><div class="mgrid">' + cells + '</div></div>';
    if (sel) {
      var dv = vs.filter(function (v) { return v.sd === sel; });
      h += '<div class="card" style="margin-top:14px"><div class="row"><h2 class="grow" style="margin:0">' + dLong(sel) + '</h2><a class="btn soft sm" href="#/add?date=' + sel + '">' + ic('i-plus') + 'Shift</a></div><div class="dshifts" style="margin-top:12px">' +
        (dv.length ? dv.map(function (v) { return chip(v, cm); }).join('') : '<p class="muted" style="margin:0">Free</p>') + '</div></div>';
    }
    view.innerHTML = h;
    $('#m-total').textContent = fmtHd(monthMin) + ' h this month';
    $$('[data-day]').forEach(function (b) { b.onclick = function () { location.replace('#/month/' + ym + '/' + b.getAttribute('data-day') + '?keep=1'); }; });
  }

  /* ---------- add / edit shift ---------- */
  function editShift(r) {
    var editing = r.parts[0] === 'shift', s0 = editing ? shiftById(r.parts[1]) : null;
    if (editing && !s0) { view.innerHTML = '<div class="card"><h2>Shift not found</h2><p class="muted">It may have been deleted or replaced by a newer schedule.</p><a class="btn ghost" href="#/week">Back to the calendar</a></div>'; return; }
    if (!db.workplaces.length) { view.innerHTML = '<div class="card"><h2>Add a workplace first</h2><p class="muted">Shifts belong to a workplace so they get its colour, time zone and pay rate.</p><a class="btn accent" href="#/place/new">Add a workplace</a></div>'; return; }
    var wp0 = s0 ? wpById(s0.wp) : (wpById(r.q.wp) || db.workplaces[0]);
    var f = s0 ? JSON.parse(JSON.stringify(s0)) : { wp: wp0.id, date: r.q.date && E.validYmd(r.q.date) ? r.q.date : today(), start: '09:00', end: '17:00', breaks: wp0.defaultBreak ? [{ min: wp0.defaultBreak, paid: false }] : [], notes: '', rate: null, worked: false, actual: null };
    var repeat = {};
    var src = '';
    if (s0) {
      src = s0.source === 'photo' || s0.source === 'text' ? 'From a schedule ' + (s0.source === 'photo' ? 'photo' : 'text') + ', confirmed by you ' + stamp(s0.confirmedAt || s0.createdAt) : 'Added by you ' + stamp(s0.createdAt || now());
      if (s0.editedAt) src += ' · changed by you ' + stamp(s0.editedAt);
    }
    function draw() {
      var w = wpById(f.wp), errs = E.validate(f, w.tz), live = '';
      if (!errs.length || (E.validHm(f.start) && E.validHm(f.end) && f.start !== f.end && E.validYmd(f.date))) {
        try { var t = E.times(f, w.tz, 'scheduled'); live = (t.overnight ? '<span class="tag night">' + ic('i-moon') + 'Ends next day, ' + dShort(E.addDays(f.date, 1)) + '</span> ' : '') + '<span class="tag plain num">' + fmtH(t.lengthMin) + ' long · ' + fmtH(t.paidMin) + ' paid</span>'; } catch (e) { live = ''; }
      }
      var rate = f.rate != null && f.rate !== '' ? f.rate : '';
      var h = '<div class="top"><div><a class="link" href="#/week/' + E.weekStart(s0 ? s0.date : f.date, db.settings.weekStart) + '" style="padding-left:0">' + ic('i-left') + ' Calendar</a><h1>' + (editing ? 'Shift' : 'Add a shift') + '</h1>' + (src ? '<p class="sub small">' + esc(src) + '</p>' : '') + '</div></div>';
      if (editing) {
        var v = sv(s0), cm = conflictMap();
        h += '<div class="detailhead" style="' + cvars(v.w) + '"><div class="w"><span class="dot" style="background:' + color(v.w) + '"></span>' + esc(v.w.name) + '</div><div class="t num">' + fmtR(v.st, v.et) + '</div><div class="row wrap"><b>' + dLong(v.sd) + '</b>' + flagsFor(v, cm) + '</div>' +
          (cm[s0.id] || []).map(function (c) { return '<div class="note ' + (c.kind === 'overlap' ? 'warn' : 'amber') + '" style="margin:10px 0 0">' + ic(c.kind === 'overlap' ? 'i-alert' : 'i-car') + '<span>' + esc(conflictText(c, s0.id)) + '</span></div>'; }).join('') + '</div>';
      }
      h += '<div class="card"><div class="field"><span class="f" style="font-weight:700;font-size:14.5px;display:block;margin-bottom:6px">Workplace</span><div class="seg" role="group" aria-label="Workplace">' +
        db.workplaces.map(function (x) { return '<button type="button" data-wp="' + x.id + '" aria-pressed="' + (x.id === f.wp) + '"><span class="dot" style="background:' + color(x) + '"></span>' + esc(x.name) + '</button>'; }).join('') + '</div></div>' +
        '<div class="grid3"><div class="field"><label class="f" for="f-date">Date it starts</label><input class="in" type="date" id="f-date" value="' + f.date + '"></div>' +
        '<div class="field"><label class="f" for="f-start">Start</label><input class="in" type="time" id="f-start" value="' + f.start + '"></div>' +
        '<div class="field"><label class="f" for="f-end">End</label><input class="in" type="time" id="f-end" value="' + f.end + '"></div></div>' +
        '<div class="row wrap" id="f-live" style="margin:-4px 0 12px">' + live + '</div>' +
        (w.tz !== tz() ? '<p class="hint" style="margin-top:-6px">Times are in ' + esc(w.name) + '’s time zone (' + esc(w.tz) + ').</p>' : '') +
        '<div class="field"><span class="f" style="font-weight:700;font-size:14.5px;display:block;margin-bottom:6px">Breaks</span>' + breaksHtml(f.breaks, 'b') +
        '<div class="row wrap"><button type="button" class="btn ghost sm" data-addbreak="30,0">+ 30 min unpaid</button><button type="button" class="btn ghost sm" data-addbreak="15,1">+ 15 min paid</button><button type="button" class="btn ghost sm" data-addbreak="0,0">+ Other</button></div>' +
        '<p class="hint">Unpaid breaks are taken off paid hours. Paid breaks are not.</p></div>' +
        '<div class="grid2"><div class="field"><label class="f" for="f-rate">Pay rate for this shift</label><input class="in" id="f-rate" inputmode="decimal" placeholder="' + (w.rate != null && w.rate !== '' ? money(w.rate) + '/h (job rate)' : 'No rate set') + '" value="' + esc(rate) + '"><p class="hint">Leave empty to use the workplace rate.</p></div>' +
        '<div class="field"><label class="f" for="f-notes">Notes</label><input class="in" id="f-notes" value="' + esc(f.notes || '') + '" placeholder="Role, who to ask…"></div></div>';
      if (!editing) {
        var ws = E.weekStart(f.date, db.settings.weekStart);
        h += '<div class="field"><span class="f" style="font-weight:700;font-size:14.5px;display:block;margin-bottom:6px">Same times on other days this week <span class="muted" style="font-weight:600">(optional)</span></span><div class="dayrow">' +
          [0, 1, 2, 3, 4, 5, 6].map(function (i) { var d = E.addDays(ws, i); return '<button type="button" data-rep="' + d + '" aria-pressed="' + (!!repeat[d] || d === f.date) + '"' + (d === f.date ? ' disabled' : '') + ' aria-label="' + dLong(d) + '">' + WD[E.dow(d)].slice(0, 2) + '</button>'; }).join('') + '</div></div>';
      }
      h += '</div>';
      if (editing) {
        var mode = !f.worked ? 'no' : f.actual ? 'diff' : 'same';
        h += '<div class="card"><h2>What actually happened</h2><p class="small muted">Only shifts you confirm count as worked in pay estimates. This is your own record: it does not change your employer’s schedule or timesheet.</p>' +
          '<div class="seg" role="group" aria-label="Worked"><button type="button" data-wk="no" aria-pressed="' + (mode === 'no') + '">Not yet</button><button type="button" data-wk="same" aria-pressed="' + (mode === 'same') + '">Worked as scheduled</button><button type="button" data-wk="diff" aria-pressed="' + (mode === 'diff') + '">Different hours</button></div>';
        if (mode === 'diff') {
          var a = f.actual;
          h += '<div class="grid3" style="margin-top:12px"><div class="field"><label class="f" for="a-date">Started on</label><input class="in" type="date" id="a-date" value="' + (a.date || f.date) + '"></div><div class="field"><label class="f" for="a-start">Actual start</label><input class="in" type="time" id="a-start" value="' + a.start + '"></div><div class="field"><label class="f" for="a-end">Actual end</label><input class="in" type="time" id="a-end" value="' + a.end + '"></div></div>' +
            '<span class="f" style="font-weight:700;font-size:14.5px;display:block;margin-bottom:6px">Actual breaks</span>' + breaksHtml(a.breaks || [], 'ab') + '<button type="button" class="btn ghost sm" data-addabreak>+ Break</button>';
          try { var at = E.times(f, w.tz, 'actual'), stt = E.times(f, w.tz, 'scheduled'), dif = at.paidMin - stt.paidMin; h += '<p class="small" style="margin:10px 0 0"><b>' + fmtH(at.paidMin) + ' paid</b> · ' + (dif === 0 ? 'same as scheduled' : fmtH(Math.abs(dif)) + (dif > 0 ? ' more' : ' less') + ' than scheduled') + '</p>'; } catch (e) { }
        }
        h += '</div>';
      }
      h += '<p class="errors" id="f-err" role="alert"></p><div class="btns"><button class="btn primary" id="f-save">' + (editing ? 'Save changes' : 'Save shift') + '</button>' +
        (editing ? '<button class="btn ghost" id="f-ics">' + ic('i-down') + 'Calendar file</button><button class="btn danger" id="f-del">Delete</button>' : '') + '</div>';
      view.innerHTML = h;
      wire();
    }
    function breaksHtml(list, p) {
      return list.map(function (b, i) {
        return '<div class="breakrow"><label class="sr" for="' + p + '-m' + i + '">Break minutes</label><input class="in num" id="' + p + '-m' + i + '" data-' + p + 'm="' + i + '" type="number" min="0" max="600" step="5" value="' + b.min + '" aria-label="Break ' + (i + 1) + ' minutes">' +
          '<div class="seg" role="group" aria-label="Break ' + (i + 1) + ' paid or unpaid"><button type="button" data-' + p + 'p="' + i + ',0" aria-pressed="' + !b.paid + '">Unpaid</button><button type="button" data-' + p + 'p="' + i + ',1" aria-pressed="' + !!b.paid + '">Paid</button></div>' +
          '<button type="button" class="iconbtn" data-' + p + 'x="' + i + '" aria-label="Remove break ' + (i + 1) + '">' + ic('i-x') + '</button></div>';
      }).join('');
    }
    function read() {
      f.date = $('#f-date').value; f.start = $('#f-start').value; f.end = $('#f-end').value;
      var rv = $('#f-rate').value.replace(/[$,\s]/g, ''); f.rate = rv === '' ? null : (isNaN(+rv) ? rv : +rv); f.notes = $('#f-notes').value.trim();
      $$('[data-bm]').forEach(function (el) { f.breaks[+el.getAttribute('data-bm')].min = Math.max(0, +el.value || 0); });
      if (f.actual) {
        if ($('#a-start')) { f.actual.date = $('#a-date').value || f.date; f.actual.start = $('#a-start').value; f.actual.end = $('#a-end').value; }
        $$('[data-abm]').forEach(function (el) { f.actual.breaks[+el.getAttribute('data-abm')].min = Math.max(0, +el.value || 0); });
      }
    }
    function wire() {
      $$('[data-wp]').forEach(function (b) { b.onclick = function () { read(); f.wp = b.getAttribute('data-wp'); draw(); }; });
      ['#f-date', '#f-start', '#f-end', '#a-start', '#a-end', '#a-date'].forEach(function (id) { var el = $(id); if (el) el.onchange = function () { read(); draw(); var n = $(id); if (n) n.focus(); }; });
      $$('[data-bm],[data-abm]').forEach(function (el) { el.onchange = function () { read(); draw(); }; });
      $$('[data-addbreak]').forEach(function (b) { b.onclick = function () { read(); var p = b.getAttribute('data-addbreak').split(','); f.breaks.push({ min: +p[0], paid: p[1] === '1' }); draw(); }; });
      $$('[data-bp]').forEach(function (b) { b.onclick = function () { read(); var p = b.getAttribute('data-bp').split(','); f.breaks[+p[0]].paid = p[1] === '1'; draw(); }; });
      $$('[data-bx]').forEach(function (b) { b.onclick = function () { read(); f.breaks.splice(+b.getAttribute('data-bx'), 1); draw(); }; });
      $$('[data-abp]').forEach(function (b) { b.onclick = function () { read(); var p = b.getAttribute('data-abp').split(','); f.actual.breaks[+p[0]].paid = p[1] === '1'; draw(); }; });
      $$('[data-abx]').forEach(function (b) { b.onclick = function () { read(); f.actual.breaks.splice(+b.getAttribute('data-abx'), 1); draw(); }; });
      var ab = $('[data-addabreak]'); if (ab) ab.onclick = function () { read(); f.actual.breaks.push({ min: 30, paid: false }); draw(); };
      $$('[data-rep]').forEach(function (b) { b.onclick = function () { read(); var d = b.getAttribute('data-rep'); if (repeat[d]) delete repeat[d]; else repeat[d] = 1; draw(); }; });
      $$('[data-wk]').forEach(function (b) {
        b.onclick = function () {
          read(); var m = b.getAttribute('data-wk');
          f.worked = m !== 'no'; f.actual = m === 'diff' ? (f.actual || { date: f.date, start: f.start, end: f.end, breaks: JSON.parse(JSON.stringify(f.breaks)) }) : null; draw();
        };
      });
      $('#f-save').onclick = function () {
        read(); var w = wpById(f.wp), errs = E.validate(f, w.tz);
        if (errs.length) { $('#f-err').textContent = errs.join(' '); return; }
        f.breaks = f.breaks.filter(function (b) { return b.min > 0; });
        if (f.actual) f.actual.breaks = (f.actual.breaks || []).filter(function (b) { return b.min > 0; });
        var list = [];
        if (editing) {
          var changed = s0.date !== f.date || s0.start !== f.start || s0.end !== f.end || s0.wp !== f.wp || JSON.stringify(s0.breaks) !== JSON.stringify(f.breaks);
          list.push(Object.assign({}, s0, f, changed ? { editedAt: now() } : {}));
        } else {
          [f.date].concat(Object.keys(repeat).filter(function (d) { return d !== f.date; })).forEach(function (d) {
            list.push(Object.assign({}, JSON.parse(JSON.stringify(f)), { id: uid(), date: d, source: 'manual', createdAt: now(), worked: false, actual: null }));
          });
        }
        var others = db.shifts.filter(function (s) { return !editing || s.id !== s0.id; });
        var cf = E.conflicts(others.concat(list), db.workplaces, { travel: db.settings.travel }).filter(function (c) { return list.some(function (n) { return n.id === c.a || n.id === c.b; }); });
        function commit() {
          db.shifts = others.concat(list); save();
          toast(editing ? 'Saved. Only your calendar changed, not your employer’s schedule.' : (list.length > 1 ? list.length + ' shifts saved' : 'Shift saved'));
          go('#/week/' + E.weekStart(list[0].date, db.settings.weekStart));
        }
        if (!cf.length) { commit(); return; }
        var tmp = db.shifts; db.shifts = others.concat(list);
        var lines = cf.map(function (c) { var self = list.find(function (n) { return n.id === c.a || n.id === c.b; }); return '<li>' + esc(dShort(self.date) + ': ' + conflictText(c, self.id)) + '</li>'; }).join('');
        db.shifts = tmp;
        modal('<h2>' + ic('i-alert') + ' This clashes with another shift</h2><ul class="small" style="padding-left:18px">' + lines + '</ul><p class="small muted">You can save it anyway (for example, if one job already agreed to a change). ShiftSync will keep flagging it.</p><div class="btns"><button class="btn ghost" data-close>Go back</button><button class="btn primary" id="m-anyway">Save anyway</button></div>',
          function (bg, close) { bg.querySelector('#m-anyway').onclick = function () { close(); commit(); }; });
      };
      var ics = $('#f-ics'); if (ics) ics.onclick = function () { download('shift-' + s0.date + '.ics', E.ics([s0], db.workplaces, { alarmMin: db.settings.alarmMin }), 'text/calendar'); toast('Calendar file downloaded. Open it to add the shift.'); };
      var del = $('#f-del'); if (del) del.onclick = function () {
        modal('<h2>Delete this shift?</h2><p class="muted">' + esc(dShort(s0.date) + ' ' + fmtR(s0.start, s0.end) + ' at ' + wpById(s0.wp).name) + '. This only removes it from ShiftSync.</p><div class="btns"><button class="btn ghost" data-close>Keep it</button><button class="btn danger" id="m-del">Delete</button></div>',
          function (bg, close) { bg.querySelector('#m-del').onclick = function () { close(); db.shifts = db.shifts.filter(function (s) { return s.id !== s0.id; }); save(); toast('Shift deleted'); go('#/week/' + E.weekStart(s0.date, db.settings.weekStart)); }; });
      };
    }
    draw();
  }

  /* ---------- workplaces ---------- */
  function places() {
    var vs = allViews(), nowMs = now(), ws = E.weekStart(today(), db.settings.weekStart), wFrom = E.zonedToMs(ws, '00:00', tz()), wTo = E.zonedToMs(E.addDays(ws, 7), '00:00', tz());
    var h = '<div class="top"><div><h1>Workplaces</h1><p class="sub">Each job keeps its own colour, time zone, pay rate and travel time.</p></div><a class="btn accent sm" href="#/place/new">' + ic('i-plus') + 'Add</a></div>';
    if (!db.workplaces.length) h += '<div class="card"><p class="muted" style="margin:0">No workplaces yet.</p></div>';
    db.workplaces.forEach(function (w) {
      var mine = vs.filter(function (v) { return v.w.id === w.id; }), wk = mine.filter(function (v) { return v.sc.startMs >= wFrom && v.sc.startMs < wTo; }), min = 0;
      wk.forEach(function (v) { min += v.t.paidMin; });
      var nx = mine.find(function (v) { return v.sc.startMs > nowMs; });
      var li = w.lastImport;
      h += '<div class="card"><div class="place"><span class="sq" style="background:' + color(w) + '">' + esc(w.name.trim().charAt(0).toUpperCase()) + '</span><div class="grow"><div class="row"><h2 class="grow" style="margin:0">' + esc(w.name) + '</h2>' + (w.demo ? '<span class="tag plain">Demo</span>' : '') + '<a class="btn ghost sm" href="#/place/' + w.id + '">' + ic('i-edit') + 'Edit</a></div>' +
        '<dl class="kv"><dt>This week</dt><dd class="num">' + fmtHd(min) + ' h · ' + wk.length + ' shift' + (wk.length === 1 ? '' : 's') + '</dd><dt>Next</dt><dd>' + (nx ? relDay(nx.sd) + ', ' + fmtR(nx.st, nx.et) : 'Nothing scheduled') + '</dd>' +
        '<dt>Pay rate</dt><dd>' + (w.rate != null && w.rate !== '' ? money(w.rate) + ' an hour (you entered)' : 'Not set') + '</dd><dt>Time zone</dt><dd>' + esc(w.tz) + '</dd>' +
        (w.travelMin ? '<dt>Travel</dt><dd>' + fmtH(w.travelMin) + ' to get here</dd>' : '') +
        '<dt>Schedule</dt><dd>' + (li ? 'Last confirmed ' + stamp(li.at) + ' (' + (li.method === 'photo' ? 'photo' : 'text') + ', ' + dRange(li.from, li.to) + ')' + (agoDays(li.at) >= 7 ? ' <span class="tag check">' + agoDays(li.at) + ' days ago</span>' : '') : 'No schedule imported yet') + '</dd></dl>' +
        '<div class="btns" style="margin-top:12px"><a class="btn soft sm" href="#/import?wp=' + w.id + '">' + ic('i-camera') + 'Import a schedule</a><a class="btn ghost sm" href="#/add?wp=' + w.id + '">' + ic('i-plus') + 'Add a shift</a></div></div></div></div>';
    });
    if (db.workplaces.length > 1) h += '<p class="tiny muted"><span class="tag plus">Plus idea</span> More than one workplace would be part of the paid plan we are testing. In this prototype it works for everyone. <a href="#/settings">Why</a></p>';
    view.innerHTML = h;
  }
  function tzList() {
    var all = []; try { all = Intl.supportedValuesOf('timeZone'); } catch (e) { all = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'UTC']; }
    if (all.indexOf(DEVICE_TZ) < 0) all.unshift(DEVICE_TZ);
    return all;
  }
  function editPlace(r) {
    var isNew = r.parts[1] === 'new' || !r.parts[1], w0 = isNew ? null : wpById(r.parts[1]);
    if (!isNew && !w0) { go('#/places'); return; }
    var used = db.workplaces.map(function (w) { return w.color; });
    var f = w0 ? Object.assign({}, w0) : { name: '', color: (E.COLORS.find(function (c) { return used.indexOf(c.id) < 0; }) || E.COLORS[0]).id, tz: tz(), rate: '', travelMin: 0, defaultBreak: 0, address: '' };
    var common = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'];
    var tzs = tzList();
    var h = '<div class="top"><div><a class="link" href="' + (r.q.first ? '#/welcome' : '#/places') + '" style="padding-left:0">' + ic('i-left') + ' Back</a><h1>' + (isNew ? 'Add a workplace' : 'Edit workplace') + '</h1></div></div><div class="card">' +
      '<div class="field"><label class="f" for="p-name">Name</label><input class="in" id="p-name" value="' + esc(f.name) + '" placeholder="e.g. Corner Grocery" maxlength="40" autocomplete="off"></div>' +
      '<div class="field"><span class="f" style="font-weight:700;font-size:14.5px;display:block;margin-bottom:6px">Colour</span><div class="swatches" role="group" aria-label="Colour">' +
      E.COLORS.map(function (c) { return '<button type="button" data-col="' + c.id + '" style="background:' + c.hex + '" aria-pressed="' + (c.id === f.color) + '" aria-label="' + c.name + (used.indexOf(c.id) >= 0 && (!w0 || w0.color !== c.id) ? ' (used by another job)' : '') + '"></button>'; }).join('') + '</div><p class="hint">All colours are dark enough to read as text on white.</p></div>' +
      '<div class="field"><label class="f" for="p-tz">Time zone</label><select class="in" id="p-tz">' +
      '<optgroup label="Common">' + common.map(function (z) { return '<option' + (z === f.tz ? ' selected' : '') + '>' + z + '</option>'; }).join('') + '</optgroup><optgroup label="All">' +
      tzs.filter(function (z) { return common.indexOf(z) < 0; }).map(function (z) { return '<option' + (z === f.tz ? ' selected' : '') + '>' + esc(z) + '</option>'; }).join('') + '</optgroup></select><p class="hint">Shift times are saved in this zone. This device is set to ' + esc(DEVICE_TZ) + '.</p></div>' +
      '<div class="grid2"><div class="field"><label class="f" for="p-rate">Hourly pay rate <span class="muted" style="font-weight:600">(optional)</span></label><input class="in" id="p-rate" inputmode="decimal" placeholder="$ an hour" value="' + esc(f.rate == null ? '' : f.rate) + '"><p class="hint">Only used for estimates.</p></div>' +
      '<div class="field"><label class="f" for="p-travel">Travel time to get here</label><select class="in" id="p-travel">' + [0, 10, 15, 20, 30, 45, 60, 90].map(function (m) { return '<option value="' + m + '"' + (+f.travelMin === m ? ' selected' : '') + '>' + (m ? m + ' min' : 'Don’t check') + '</option>'; }).join('') + '</select><p class="hint">From your other jobs. Used to flag tight gaps.</p></div></div>' +
      '<div class="grid2"><div class="field"><label class="f" for="p-break">Usual unpaid break</label><select class="in" id="p-break">' + [0, 15, 30, 45, 60].map(function (m) { return '<option value="' + m + '"' + (+f.defaultBreak === m ? ' selected' : '') + '>' + (m ? m + ' min' : 'None') + '</option>'; }).join('') + '</select><p class="hint">Pre-filled on new shifts. You can change it per shift.</p></div>' +
      '<div class="field"><label class="f" for="p-addr">Address <span class="muted" style="font-weight:600">(optional)</span></label><input class="in" id="p-addr" value="' + esc(f.address || '') + '" placeholder="Shown in calendar files"></div></div>' +
      '<p class="errors" id="p-err" role="alert"></p><div class="btns"><button class="btn primary" id="p-save">' + (isNew ? 'Save workplace' : 'Save changes') + '</button>' + (isNew ? '' : '<button class="btn danger" id="p-del">Delete workplace</button>') + '</div></div>';
    if (isNew && db.workplaces.length >= 1) h += '<p class="tiny muted"><span class="tag plus">Plus idea</span> A second workplace would be a paid feature in the plan being tested. Nothing is locked or charged here.</p>';
    view.innerHTML = h;
    $$('[data-col]').forEach(function (b) { b.onclick = function () { f.color = b.getAttribute('data-col'); $$('[data-col]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }; });
    $('#p-save').onclick = function () {
      var name = $('#p-name').value.trim(), rate = $('#p-rate').value.replace(/[$,\s]/g, '');
      if (!name) { $('#p-err').textContent = 'Give the workplace a name.'; $('#p-name').classList.add('err'); $('#p-name').focus(); return; }
      if (rate !== '' && !(+rate >= 0)) { $('#p-err').textContent = 'Pay rate must be a number, like 15.50.'; return; }
      if (db.workplaces.some(function (w) { return w.name.toLowerCase() === name.toLowerCase() && (!w0 || w.id !== w0.id); })) { $('#p-err').textContent = 'You already have a workplace with that name.'; return; }
      var rec = Object.assign({}, f, { name: name, tz: $('#p-tz').value, rate: rate === '' ? null : +rate, travelMin: +$('#p-travel').value, defaultBreak: +$('#p-break').value, address: $('#p-addr').value.trim() });
      if (w0) Object.assign(w0, rec); else { rec.id = uid(); db.workplaces.push(rec); }
      db.settings.welcomed = true; save();
      toast(w0 ? 'Workplace saved' : name + ' added');
      go(r.q.first ? '#/home' : '#/places');
    };
    var del = $('#p-del'); if (del) del.onclick = function () {
      var n = db.shifts.filter(function (s) { return s.wp === w0.id; }).length;
      modal('<h2>Delete ' + esc(w0.name) + '?</h2><p class="muted">This also deletes its ' + n + ' shift' + (n === 1 ? '' : 's') + ' from ShiftSync. It cannot be undone.</p><div class="btns"><button class="btn ghost" data-close>Keep it</button><button class="btn danger" id="m-del">Delete workplace and shifts</button></div>',
        function (bg, close) { bg.querySelector('#m-del').onclick = function () { close(); db.workplaces = db.workplaces.filter(function (w) { return w.id !== w0.id; }); db.shifts = db.shifts.filter(function (s) { return s.wp !== w0.id; }); save(); toast('Workplace deleted'); go('#/places'); }; });
    };
  }

  /* ---------- import a schedule ---------- */
  function endImport() { if (state.imp && state.imp.imgUrl) URL.revokeObjectURL(state.imp.imgUrl); state.imp = null; }
  function abs(p) { return new URL(p, location.href).href; }
  var OCR_DIR = '../screenshot-done/vendor/ocr/';
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Could not load the text reader.')); }; document.head.appendChild(s); }); }
  var progressCb = null;
  function getOcr() {
    if (state.ocr) return Promise.resolve(state.ocr);
    if (state.ocrLoading) return state.ocrLoading;
    state.ocrLoading = (window.Tesseract ? Promise.resolve() : loadScript(OCR_DIR + 'tesseract.min.js')).then(function () {
      return window.Tesseract.createWorker('eng', 1, { workerPath: abs(OCR_DIR + 'worker.min.js'), corePath: abs(OCR_DIR), langPath: abs(OCR_DIR + 'lang'), gzip: true, cacheMethod: 'write', logger: function (m) { if (progressCb) progressCb(m); } });
    }).then(function (w) { return w.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' }).then(function () { state.ocr = w; return w; }); })
      .catch(function (e) { state.ocrLoading = null; throw e; });
    return state.ocrLoading;
  }
  function prepImage(blob) {
    return new Promise(function (resolve) {
      var img = new Image(), url = URL.createObjectURL(blob);
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, s = w < 1000 ? Math.min(2.5, 1600 / w) : (w > 2600 ? 2600 / w : 1);
        var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
        var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
        resolve({ src: c, url: url });
      };
      img.onerror = function () { resolve({ bad: true, url: url }); };
      img.src = url;
    });
  }
  function startImport(q) {
    var wp = wpById(q.wp) || db.workplaces[0];
    state.imp = { step: 'choose', wp: wp ? wp.id : null, method: null, result: null, row: null, draft: [], weekStart: '', err: '' };
  }
  function steps(n) { return '<div class="steps" aria-hidden="true">' + [1, 2, 3, 4].map(function (i) { return '<span class="' + (i <= n ? 'on' : '') + '"></span>'; }).join('') + '</div>'; }
  function importView(r) {
    if (!db.workplaces.length) { view.innerHTML = '<div class="card"><h2>Add a workplace first</h2><p class="muted">Imported shifts are saved to a workplace.</p><a class="btn accent" href="#/place/new">Add a workplace</a></div>'; return; }
    if (!state.imp) startImport(r.q);
    var I = state.imp;
    ({ choose: impChoose, reading: impReading, who: impWho, review: impReview, compare: impCompare, done: impDone }[I.step])();
  }
  function impTop(title, n, sub) {
    return '<div class="top"><div><button class="link" id="i-cancel" style="padding-left:0">' + ic('i-x') + ' Cancel</button><h1>' + title + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div></div>' + steps(n);
  }
  function wireCancel() { var c = $('#i-cancel'); if (c) c.onclick = function () { endImport(); go('#/home'); }; }
  function impChoose() {
    var I = state.imp;
    var h = impTop('Import a schedule', 1, 'Add a photo or screenshot. You will check every shift before anything is saved.') +
      '<div class="card"><div class="field"><span class="f" style="font-weight:700;font-size:14.5px;display:block;margin-bottom:6px">Which job is this schedule for?</span><div class="seg" role="group" aria-label="Workplace">' +
      db.workplaces.map(function (w) { return '<button type="button" data-iwp="' + w.id + '" aria-pressed="' + (w.id === I.wp) + '"><span class="dot" style="background:' + color(w) + '"></span>' + esc(w.name) + '</button>'; }).join('') + '</div></div>' +
      '<button class="pick" id="i-photo"><span class="ico">' + ic('i-camera') + '</span><span><b>Choose a photo or screenshot</b><small>Printed or app schedules read best. Take it straight on, in good light.</small></span></button>' +
      '<button class="pick" id="i-text"><span class="ico">' + ic('i-text') + '</span><span><b>Paste the schedule as text</b><small>From a message or email, one shift per line.</small></span></button>' +
      '<div id="i-textbox" hidden><label class="f" for="i-paste">Schedule text</label><textarea class="in" id="i-paste" placeholder="Mon Nov 23 9:00 AM - 5:00 PM&#10;Tue Nov 24 10p - 6a"></textarea><div class="btns" style="margin-top:10px"><button class="btn primary" id="i-read">Read this text</button></div></div>' +
      '<p class="small muted" style="margin:6px 0 0">No schedule handy? <button class="link" data-sample="team-schedule.png">Try a team schedule</button> or <button class="link" data-sample="my-schedule.png">a personal one</button> (made-up names).</p></div>' +
      '<div class="note">' + ic('i-lock') + '<span>The photo is read on this device and is not uploaded or kept. On a team schedule you pick your own row; the other names and shifts are cleared right after.</span></div>' +
      (I.err ? '<div class="note warn" role="alert">' + ic('i-alert') + '<span>' + esc(I.err) + '</span></div>' : '');
    view.innerHTML = h; wireCancel();
    $$('[data-iwp]').forEach(function (b) { b.onclick = function () { I.wp = b.getAttribute('data-iwp'); $$('[data-iwp]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }; });
    $('#i-photo').onclick = function () { fileInput.value = ''; fileInput.click(); };
    $('#i-text').onclick = function () { $('#i-textbox').hidden = false; $('#i-paste').focus(); };
    $('#i-read').onclick = function () {
      var t = $('#i-paste').value.trim(); if (!t) { $('#i-paste').focus(); return; }
      I.method = 'text'; I.err = ''; handleResult(R.read({ text: t }, { today: today() }));
    };
    $$('[data-sample]').forEach(function (b) { b.onclick = function () { fetch('samples/' + b.getAttribute('data-sample')).then(function (r) { return r.blob(); }).then(function (bl) { readImage(bl, true); }); }; });
  }
  fileInput.addEventListener('change', function () { var f = fileInput.files && fileInput.files[0]; if (f && state.imp) readImage(f, false); });
  function readImage(blob, sample) {
    var I = state.imp; I.method = 'photo'; I.sample = sample; I.step = 'reading'; I.err = ''; I.pct = 0; I.msg = 'Getting the text reader ready…';
    impReading();
    prepImage(blob).then(function (p) {
      if (p.bad) throw new Error('That file could not be opened as a picture. Try a JPG or PNG screenshot.');
      I.imgUrl = p.url;
      progressCb = function (m) {
        if (!state.imp) return;
        if (m.status === 'recognizing text') { I.pct = Math.round(m.progress * 100); I.msg = 'Reading the schedule…'; }
        else if (/load/.test(m.status)) { I.msg = 'Getting the text reader ready (first time only)…'; }
        var bar = document.querySelector('.prog span'), msg = document.getElementById('i-msg');
        if (bar) bar.style.width = Math.max(5, I.pct) + '%'; if (msg) msg.textContent = I.msg;
      };
      return getOcr().then(function (w) { return w.recognize(p.src); });
    }).then(function (res) {
      if (!state.imp) return;
      var words = (res.data.words || []).filter(function (w) { return w.confidence > 30; }).map(function (w) { return { text: w.text, x0: w.bbox.x0, x1: w.bbox.x1, y0: w.bbox.y0, y1: w.bbox.y1 }; });
      handleResult(R.read({ words: words, text: res.data.text }, { today: today() }));
    }).catch(function (e) {
      if (!state.imp) return; I.step = 'choose'; I.err = (e && e.message) || 'The schedule could not be read.'; render();
    });
  }
  function impReading() {
    var I = state.imp;
    view.innerHTML = impTop('Reading the schedule', 2) + '<div class="card"><p id="i-msg" style="font-weight:650">' + esc(I.msg) + '</p><div class="prog"><span style="width:' + Math.max(5, I.pct) + '%"></span></div><p class="small muted" style="margin:0">On this device. The first time can take a moment while the reader loads (about 11 MB, saved for next time).</p></div>';
    wireCancel();
  }
  function handleResult(res) {
    var I = state.imp; I.result = res;
    if (res.mode === 'none') { I.step = 'choose'; I.err = 'No shift times were found. Try a sharper, straight-on photo, crop to the schedule, or add the shifts by hand.'; render(); return; }
    if (res.mode === 'grid') { I.step = 'who'; I.row = null; var name = db.settings.rememberName && db.settings.myName; if (name) { var i = res.rows.findIndex(function (r) { return r.label.toLowerCase() === name.toLowerCase(); }); if (i >= 0) I.row = i; } render(); return; }
    // list: one person's schedule
    I.draft = res.items.map(function (it) { return draftFrom(it.range, it.date, it.dow, { yearGuessed: it.yearGuessed, dowMismatch: it.dowMismatch, raw: it.raw }); });
    I.needsWeek = res.needsWeek; I.columns = null;
    I.step = 'review'; render();
  }
  function draftFrom(range, date, dow, info) {
    var w = wpById(state.imp.wp), check = [];
    if (range && range.guessed) check.push('AM/PM guessed');
    if (info.dateInferred) check.push('Date worked out from the header');
    if (info.dowMismatch) check.push('Date and weekday do not match');
    return { key: uid(), date: date || '', dow: dow, start: range ? range.start : '', end: range ? range.end : '', unpaid: w && w.defaultBreak ? w.defaultBreak : 0, check: check, raw: info.raw || '', off: !!info.off, unclear: !!info.unclear, empty: !!info.empty, removed: false };
  }
  function impWho() {
    var I = state.imp, res = I.result;
    var h = impTop('Which row is you?', 2, 'This looks like a team schedule with ' + res.rows.length + ' rows. Pick your own name.') + '<div class="card">' +
      res.rows.map(function (r, i) {
        var n = r.cells.filter(function (c) { return c.range; }).length + r.extra.length;
        return '<button class="who" data-row="' + i + '" aria-pressed="' + (I.row === i) + '"><span class="av">' + esc(r.label.charAt(0).toUpperCase()) + '</span><span class="grow"><b>' + esc(r.label) + '</b><small>' + n + ' shift' + (n === 1 ? '' : 's') + ' found</small></span>' + (I.row === i ? '<span class="tag ok">' + ic('i-check') + (db.settings.myName && db.settings.myName.toLowerCase() === r.label.toLowerCase() ? 'You last time' : 'Selected') + '</span>' : '') + '</button>';
      }).join('') +
      '<div class="note" style="margin-top:12px">' + ic('i-lock') + '<span>Only your row is kept. Everyone else’s names and shifts are cleared from this device when you continue.</span></div>' +
      '<label class="switch" style="border:0;padding-top:0"><span class="small">Remember my name to pick it next time</span><input type="checkbox" id="i-remember"' + (db.settings.rememberName ? ' checked' : '') + '></label>' +
      '<div class="btns"><button class="btn primary" id="i-next"' + (I.row == null ? ' disabled' : '') + '>Use this row</button></div></div>';
    view.innerHTML = h; wireCancel();
    $$('[data-row]').forEach(function (b) { b.onclick = function () { I.row = +b.getAttribute('data-row'); impWho(); }; });
    $('#i-next').onclick = function () {
      var row = res.rows[I.row], cols = res.columns;
      db.settings.rememberName = $('#i-remember').checked; db.settings.myName = db.settings.rememberName ? row.label : ''; save();
      I.draft = [];
      cols.forEach(function (c, ci) {
        var cell = row.cells[ci], info = { dateInferred: c.dateInferred, dowMismatch: c.dowMismatch, raw: cell.text };
        if (cell.range) I.draft.push(draftFrom(cell.range, c.date, c.dow, info));
        else I.draft.push(draftFrom(null, c.date, c.dow, Object.assign(info, { off: cell.off, unclear: cell.unclear, empty: !cell.text })));
        row.extra.filter(function (x) { return x.col === ci; }).forEach(function (x) { I.draft.push(draftFrom(x.range, c.date, c.dow, Object.assign({}, info, { raw: x.text }))); });
      });
      I.columns = cols.map(function (c) { return { dow: c.dow, date: c.date }; });
      I.needsWeek = res.needsWeek; I.rowsSeen = res.rows.length;
      I.result = null; // other people's rows are dropped here
      I.step = 'review'; render();
    };
  }
  function applyWeek(I) {
    if (!I.needsWeek || !E.validYmd(I.weekStart)) return;
    var firstDow = I.columns ? I.columns[0].dow : I.draft.filter(function (d) { return d.dow != null; })[0].dow;
    I.draft.forEach(function (d) { if (d.dow == null) return; d.date = E.addDays(I.weekStart, (d.dow - firstDow + 7) % 7); });
  }
  function impReview() {
    var I = state.imp, w = wpById(I.wp);
    var firstDow = I.columns ? I.columns[0].dow : (I.draft.filter(function (d) { return d.dow != null; })[0] || {}).dow;
    var weekOk = !I.needsWeek || (E.validYmd(I.weekStart) && E.dow(I.weekStart) === firstDow);
    var shifts = I.draft.filter(function (d) { return !d.removed && !d.off && !d.unclear && !d.empty; });
    var nCheck = shifts.filter(function (d) { return d.check.length; }).length;
    var h = impTop('Check your shifts', 3, 'For <b style="color:' + color(w) + '">' + esc(w.name) + '</b>. Fix anything that is wrong before saving.');
    h += '<div class="review' + (I.imgUrl ? ' withpic' : '') + '">';
    if (I.imgUrl) h += '<div class="pic"><details' + (window.innerWidth >= 1100 ? ' open' : '') + '><summary class="small" style="font-weight:700;cursor:pointer;margin-bottom:8px">Show the photo</summary><img src="' + I.imgUrl + '" alt="The schedule photo you added"></details>' + (I.sample ? '<p class="tiny muted">Sample schedule with made-up names.</p>' : '') + '</div>';
    h += '<div>';
    if (I.needsWeek) {
      h += '<div class="card" style="border-color:' + (weekOk ? 'var(--line)' : 'var(--warn)') + '"><h2>Which week is this?</h2><p class="small muted">The schedule shows weekdays but no dates, so ShiftSync will not guess. Pick the date of the first day (' + WDL[firstDow] + ').</p>' +
        '<div class="seg" style="margin-bottom:10px">' + [0, 7, 14].map(function (o) { var d = E.addDays(E.weekStart(today(), firstDow), o); return '<button type="button" data-week="' + d + '" aria-pressed="' + (I.weekStart === d) + '">' + (o === 0 ? 'This week' : o === 7 ? 'Next week' : 'In 2 weeks') + ' · ' + dShort(d) + '</button>'; }).join('') + '</div>' +
        '<label class="f" for="i-week">Or pick the date</label><input class="in" type="date" id="i-week" value="' + I.weekStart + '">' +
        (I.weekStart && !weekOk ? '<p class="errors" style="margin-top:6px">That date is a ' + WDL[E.dow(I.weekStart)] + '. The first day on the schedule is ' + WDL[firstDow] + '.</p>' : '') + '</div>';
    }
    h += '<div class="card"><div class="row wrap" style="margin-bottom:10px"><h2 class="grow" style="margin:0">' + shifts.length + ' shift' + (shifts.length === 1 ? '' : 's') + '</h2>' + (nCheck ? '<span class="tag check">' + ic('i-alert') + nCheck + ' to check</span>' : '<span class="tag ok">' + ic('i-check') + 'All read clearly</span>') + '</div>' +
      '<p class="small muted">Times come from the ' + (I.method === 'photo' ? 'photo' : 'text') + '. The break is your usual break for this job' + (w.defaultBreak ? ' (' + w.defaultBreak + ' min)' : ' (none set)') + ', not from the schedule.</p>';
    I.draft.forEach(function (d, i) {
      var dateLbl = d.date ? dShort(d.date) : (d.dow != null ? WDL[d.dow] : 'Date needed');
      if (d.off || d.empty || d.unclear) {
        h += '<div class="rs off"><div class="rh" style="margin:0"><b>' + dateLbl + '</b>' + (d.off ? '<span class="tag plain">Off</span>' : d.unclear ? '<span class="tag check">Could not read “' + esc(d.raw) + '”</span>' : '<span class="tag plain">Nothing scheduled</span>') + '<span class="grow"></span><button class="btn ghost sm" data-make="' + i + '">' + ic('i-plus') + 'Add a shift</button></div></div>';
        return;
      }
      if (d.removed) { h += '<div class="rs rem"><div class="rh" style="margin:0"><b>' + dateLbl + '</b><s class="small">' + (d.start ? fmtR(d.start, d.end) : '') + '</s><span class="tag plain">Won’t be saved</span><span class="grow"></span><button class="btn ghost sm" data-undo="' + i + '">Undo</button></div></div>'; return; }
      var bad = !E.validYmd(d.date) || !E.validHm(d.start) || !E.validHm(d.end) || d.start === d.end, night = !bad && E.hmToMin(d.end) <= E.hmToMin(d.start);
      h += '<div class="rs" style="border-color:' + (bad ? 'var(--warn)' : d.check.length ? '#F2C98A' : 'var(--line)') + '"><div class="rh"><b>' + dateLbl + '</b>' +
        (bad ? '<span class="tag bad">Needs a date and times</span>' : d.check.length ? d.check.map(function (c) { return '<span class="tag check">Check: ' + esc(c) + '</span>'; }).join('') : '<span class="tag ok">' + ic('i-check') + 'Found</span>') +
        (night ? '<span class="tag night">' + ic('i-moon') + 'Ends next day</span>' : '') + (d.raw && I.method === 'photo' ? '<span class="tiny muted">read: “' + esc(d.raw) + '”</span>' : '') +
        '<span class="grow"></span><button class="iconbtn" style="width:38px;height:38px" data-rm="' + i + '" aria-label="Don’t save the shift on ' + dateLbl + '">' + ic('i-x') + '</button></div>' +
        '<div class="grid4"><div><label for="d-date' + i + '">Date</label><input class="in" type="date" id="d-date' + i + '" data-d="' + i + '" data-k="date" value="' + d.date + '"' + (I.needsWeek && !weekOk ? ' disabled' : '') + '></div>' +
        '<div><label for="d-s' + i + '">Start</label><input class="in" type="time" id="d-s' + i + '" data-d="' + i + '" data-k="start" value="' + d.start + '"></div>' +
        '<div><label for="d-e' + i + '">End</label><input class="in" type="time" id="d-e' + i + '" data-d="' + i + '" data-k="end" value="' + d.end + '"></div>' +
        '<div><label for="d-b' + i + '">Unpaid break</label><select class="in" id="d-b' + i + '" data-d="' + i + '" data-k="unpaid">' + [0, 15, 30, 45, 60].map(function (m) { return '<option value="' + m + '"' + (+d.unpaid === m ? ' selected' : '') + '>' + (m ? m + ' min' : 'None') + '</option>'; }).join('') + '</select></div></div></div>';
    });
    h += '<button class="btn ghost sm" id="i-addmissing">' + ic('i-plus') + 'Add a shift that’s missing</button></div>';
    var blocked = !weekOk || !shifts.length || shifts.some(function (d) { return !E.validYmd(d.date) || !E.validHm(d.start) || !E.validHm(d.end) || d.start === d.end; });
    h += '<p class="errors" id="i-err" role="alert">' + (!weekOk ? 'Pick which week this is first.' : !shifts.length ? 'There are no shifts to save.' : blocked ? 'Every shift needs a date, a start and an end.' : '') + '</p>' +
      '<div class="btns"><button class="btn primary" id="i-next"' + (blocked ? ' disabled' : '') + '>Continue</button></div></div></div>';
    view.innerHTML = h; wireCancel();
    $$('[data-week]').forEach(function (b) { b.onclick = function () { I.weekStart = b.getAttribute('data-week'); applyWeek(I); impReview(); }; });
    var wk = $('#i-week'); if (wk) wk.onchange = function () { I.weekStart = wk.value; applyWeek(I); impReview(); };
    $$('[data-d]').forEach(function (el) { el.onchange = function () { var d = I.draft[+el.getAttribute('data-d')], k = el.getAttribute('data-k'); d[k] = k === 'unpaid' ? +el.value : el.value; if (k !== 'unpaid') d.check = d.check.filter(function (c) { return k === 'date' ? !/Date|weekday/.test(c) : c !== 'AM/PM guessed'; }); d.edited = true; var id = el.id; impReview(); var n = document.getElementById(id); if (n) n.focus(); }; });
    $$('[data-rm]').forEach(function (b) { b.onclick = function () { I.draft[+b.getAttribute('data-rm')].removed = true; impReview(); }; });
    $$('[data-undo]').forEach(function (b) { b.onclick = function () { I.draft[+b.getAttribute('data-undo')].removed = false; impReview(); }; });
    $$('[data-make]').forEach(function (b) { b.onclick = function () { var d = I.draft[+b.getAttribute('data-make')]; d.off = d.unclear = d.empty = false; d.start = '09:00'; d.end = '17:00'; d.check = ['Times added by you']; impReview(); }; });
    $('#i-addmissing').onclick = function () { var last = I.draft.filter(function (d) { return d.date; }).slice(-1)[0]; I.draft.push({ key: uid(), date: last ? last.date : today(), dow: null, start: '09:00', end: '17:00', unpaid: w.defaultBreak || 0, check: ['Added by you'], raw: '' }); impReview(); };
    $('#i-next').onclick = function () { buildPlan(); I.step = 'compare'; render(); };
  }
  function buildPlan() {
    var I = state.imp, stampMs = now(), importId = uid();
    var keep = I.draft.filter(function (d) { return !d.removed && !d.off && !d.unclear && !d.empty; });
    I.incoming = keep.map(function (d) { return { id: uid(), wp: I.wp, date: d.date, start: d.start, end: d.end, breaks: d.unpaid ? [{ min: +d.unpaid, paid: false }] : [], worked: false, actual: null, rate: null, notes: '', source: I.method, importId: importId, confirmedAt: stampMs, createdAt: stampMs }; });
    var dates = I.incoming.map(function (s) { return s.date; });
    if (I.columns && I.columns[0].date) { dates.push(I.columns[0].date, I.columns[I.columns.length - 1].date); }
    if (I.columns && I.needsWeek && I.weekStart) { dates.push(I.weekStart, E.addDays(I.weekStart, I.columns.length - 1)); }
    dates.sort(); I.from = dates[0]; I.to = dates[dates.length - 1];
    I.plan = E.planReplace(db.shifts, I.incoming, I.wp, I.from, I.to);
    I.stamp = stampMs; I.agree = false;
  }
  function impCompare() {
    var I = state.imp, w = wpById(I.wp), P = I.plan;
    function line(s, extra) { return '<li><b>' + dShort(s.date) + '</b> ' + fmtR(s.start, s.end) + (extra || '') + '</li>'; }
    var after = E.applyPlan(db.shifts, P), afterConf = E.conflicts(after, db.workplaces, { travel: db.settings.travel }).filter(function (c) { return I.incoming.some(function (n) { return n.id === c.a || n.id === c.b; }); });
    var h = impTop(P.existingCount ? 'Replace saved shifts?' : 'Ready to save', 4, esc(w.name) + ' · ' + dRange(I.from, I.to)) + '<div class="card plan">';
    if (!P.existingCount) h += '<p>You have no saved shifts at ' + esc(w.name) + ' for these dates. These will be added:</p><ul>' + I.incoming.map(function (s) { return line(s); }).join('') + '</ul>';
    else {
      h += '<p>You already have ' + P.existingCount + ' shift' + (P.existingCount === 1 ? '' : 's') + ' saved at ' + esc(w.name) + ' for ' + dRange(I.from, I.to) + '. Here is what would change:</p>';
      if (P.changed.length) h += '<h3><span class="tag check">Changed</span> ' + P.changed.length + '</h3><ul>' + P.changed.map(function (c) { return '<li><b>' + dShort(c.old.date) + '</b> <s>' + fmtR(c.old.start, c.old.end) + '</s> → <b>' + fmtR(c.neu.start, c.neu.end) + '</b>' + (c.old.date !== c.neu.date ? ' on ' + dShort(c.neu.date) : '') + '</li>'; }).join('') + '</ul>';
      if (P.remove.length) h += '<h3><span class="tag bad">Removed</span> ' + P.remove.length + ' not on the new schedule</h3><ul>' + P.remove.map(function (s) { return '<li><s>' + dShort(s.date) + ' ' + fmtR(s.start, s.end) + '</s></li>'; }).join('') + '</ul>';
      if (P.add.length) h += '<h3><span class="tag ok">New</span> ' + P.add.length + '</h3><ul>' + P.add.map(function (s) { return line(s); }).join('') + '</ul>';
      if (P.same.length) h += '<h3><span class="tag plain">Same</span> ' + P.same.length + ' (notes kept)</h3><ul>' + P.same.map(function (p) { return line(p.old); }).join('') + '</ul>';
      if (P.keptWorked.length) h += '<h3><span class="tag ok">' + ic('i-check') + 'Kept</span> ' + P.keptWorked.length + ' you already marked as worked</h3><ul>' + P.keptWorked.map(function (s) { return line(s, ' <span class="tiny muted">not replaced</span>'); }).join('') + '</ul>';
    }
    if (afterConf.length) h += '<div class="note warn">' + ic('i-alert') + '<span>After saving, ' + afterConf.length + ' clash' + (afterConf.length > 1 ? 'es' : '') + ' with your other shifts will be flagged: ' + afterConf.slice(0, 3).map(function (c) { var n = I.incoming.find(function (x) { return x.id === c.a || x.id === c.b; }); return esc(dShort(n.date) + ' (' + (c.kind === 'overlap' ? 'overlap' : 'tight travel') + ')'); }).join(', ') + '.</span></div>';
    if (P.replacing) h += '<label class="confirmbox"><input type="checkbox" id="i-agree"' + (I.agree ? ' checked' : '') + '><span>Yes, replace ' + P.replacing + ' saved shift' + (P.replacing === 1 ? '' : 's') + ' at ' + esc(w.name) + ' with this schedule.</span></label>';
    h += '<div class="btns" style="margin-top:12px"><button class="btn primary" id="i-save"' + (P.replacing && !I.agree ? ' disabled' : '') + '>' + (P.replacing ? 'Replace and save' : 'Save ' + I.incoming.length + ' shift' + (I.incoming.length === 1 ? '' : 's')) + '</button>' +
      (P.replacing ? '<button class="btn ghost" id="i-alongside">Keep my saved shifts, add only new</button>' : '') + '<button class="btn ghost" id="i-back">Back to editing</button></div>' +
      '<p class="tiny muted" style="margin:12px 0 0">This updates your ShiftSync calendar only. It does not tell your employer anything or confirm any change with them.</p></div>';
    view.innerHTML = h; wireCancel();
    var ag = $('#i-agree'); if (ag) ag.onchange = function () { I.agree = ag.checked; $('#i-save').disabled = !ag.checked; };
    $('#i-back').onclick = function () { I.step = 'review'; render(); };
    $('#i-save').onclick = function () { if (P.replacing && !I.agree) return; db.shifts = E.applyPlan(db.shifts, P, I.stamp); finishImport(I.incoming.length, P.replacing); };
    var al = $('#i-alongside'); if (al) al.onclick = function () {
      var add = P.add.concat(P.changed.map(function (c) { return c.neu; }));
      db.shifts = db.shifts.concat(add); finishImport(add.length, 0, true);
    };
  }
  function finishImport(n, replaced, alongside) {
    var I = state.imp, w = wpById(I.wp);
    w.lastImport = { at: I.stamp, from: I.from, to: I.to, method: I.method, count: n };
    save();
    if (I.imgUrl) { URL.revokeObjectURL(I.imgUrl); I.imgUrl = null; }
    I.done = { n: n, replaced: replaced, alongside: !!alongside }; I.step = 'done'; render();
  }
  function impDone() {
    var I = state.imp, w = wpById(I.wp), d = I.done;
    view.innerHTML = '<div class="card" style="text-align:center;padding:28px 20px"><div style="width:64px;height:64px;border-radius:20px;margin:0 auto 12px;display:grid;place-items:center;font-size:32px;color:#fff;background:linear-gradient(135deg,var(--teal-d),var(--violet))">' + ic('i-check') + '</div>' +
      '<h1>Schedule saved</h1><p>' + d.n + ' shift' + (d.n === 1 ? '' : 's') + ' at <b>' + esc(w.name) + '</b> for ' + dRange(I.from, I.to) + (d.replaced ? ', replacing ' + d.replaced + ' older one' + (d.replaced === 1 ? '' : 's') : '') + (d.alongside ? '. Your earlier shifts were kept, so check for duplicates' : '') + '.</p>' +
      '<p class="small muted">Confirmed by you ' + stamp(I.stamp) + '. ' + (I.method === 'photo' ? 'The photo has been cleared' + (I.rowsSeen > 1 ? ', along with the other ' + (I.rowsSeen - 1) + ' people’s rows' : '') + '.' : '') + '</p>' +
      '<div class="btns" style="max-width:420px;margin:16px auto 0"><a class="btn primary" href="#/week/' + E.weekStart(I.from, db.settings.weekStart) + '">See the week</a><a class="btn ghost" href="#/home">Home</a></div></div>';
  }

  /* ---------- pay ---------- */
  function pay(r) {
    var per = r.parts[1] || 'week', t0 = today(), from, to, label;
    var ws = E.weekStart(t0, db.settings.weekStart);
    if (per === 'last') { from = E.addDays(ws, -7); to = ws; label = 'Last week'; }
    else if (per === 'month') { from = t0.slice(0, 7) + '-01'; to = E.addDays(from, 40).slice(0, 7) + '-01'; label = 'This month'; }
    else if (per === 'lastmonth') { to = t0.slice(0, 7) + '-01'; from = E.addDays(to, -1).slice(0, 7) + '-01'; label = 'Last month'; }
    else { per = 'week'; from = ws; to = E.addDays(ws, 7); label = 'This week'; }
    var fMs = E.zonedToMs(from, '00:00', tz()), tMs = E.zonedToMs(to, '00:00', tz()), ear = E.earnings(db.shifts, db.workplaces, fMs, tMs, now());
    var h = '<div class="top"><div><h1>Estimated earnings</h1><p class="sub">' + label + ' · ' + dRange(from, E.addDays(to, -1)) + '</p></div></div>' +
      '<div class="tabs" role="group" aria-label="Period" style="margin-bottom:14px;flex-wrap:wrap">' + [['week', 'This week'], ['last', 'Last week'], ['month', 'This month'], ['lastmonth', 'Last month']].map(function (p) { return '<a href="#/pay/' + p[0] + '"' + (p[0] === per ? ' aria-current="page"' : '') + '>' + p[1] + '</a>'; }).join('') + '</div>' +
      '<div class="note amber">' + ic('i-alert') + '<span><b>An estimate, not a paycheck.</b> Gross pay = paid hours × the rates you entered. Not included: taxes and deductions, overtime or premium pay, tips, shift differentials, holiday pay, and your employer’s rounding rules. Your pay stub is the real number.</span></div>' +
      '<div class="money"><div class="card"><div class="small muted" style="font-weight:700">Confirmed worked</div><div class="v num">' + money(ear.confirmedGross) + '</div><div class="small num">' + fmtHd(ear.confirmedMin) + ' paid hours</div></div>' +
      '<div class="card"><div class="small muted" style="font-weight:700">Not confirmed yet</div><div class="v num" style="color:var(--muted)">' + money(ear.scheduledGross) + '</div><div class="small num">' + fmtHd(ear.scheduledMin) + ' h, if worked as scheduled</div></div></div>';
    var ids = Object.keys(ear.byWp);
    if (ids.length) {
      h += '<div class="card"><h2>By workplace</h2><table class="t"><thead><tr><th>Job</th><th class="r">Rate</th><th class="r">Worked</th><th class="r">Est. gross</th></tr></thead><tbody>' +
        ids.map(function (id) { var w = wpById(id), x = ear.byWp[id]; return '<tr><td><span class="row" style="gap:8px"><span class="dot" style="background:' + color(w) + '"></span>' + esc(w.name) + '</span></td><td class="r">' + (w.rate != null && w.rate !== '' ? money(w.rate) : '<a href="#/place/' + id + '">Add rate</a>') + '</td><td class="r">' + fmtHd(x.confirmedMin) + ' h</td><td class="r"><b>' + money(x.confirmedGross) + '</b></td></tr>'; }).join('') +
        '</tbody></table>' + (ear.unratedMin ? '<p class="small muted" style="margin:10px 0 0">' + fmtHd(ear.unratedMin) + ' h have no pay rate, so they are counted in hours but not in money.</p>' : '') + '</div>';
    } else h += '<div class="card"><p class="muted" style="margin:0">No shifts in this period.</p></div>';
    var pend = allViews().filter(function (v) { return !v.s.worked && v.sc.endMs <= now() && v.sc.startMs >= fMs && v.sc.startMs < tMs; });
    if (pend.length) {
      h += '<div class="card"><h2>Confirm past shifts</h2><p class="small muted">Only confirmed shifts count as worked. If the hours were different, open the shift and enter what really happened.</p>' +
        pend.map(function (v) { return '<div class="todo"><span class="dot" style="background:' + color(v.w) + '"></span><a class="grow small" href="#/shift/' + v.s.id + '" style="color:inherit"><b>' + dShort(v.sd) + ' ' + fmtR(v.st, v.et) + '</b><br><span class="muted">' + esc(v.w.name) + ' · ' + fmtH(v.t.paidMin) + '</span></a><button class="btn sm soft" data-worked="' + v.s.id + '">Worked as scheduled</button></div>'; }).join('') + '</div>';
    }
    h += '<div class="card"><div class="row wrap"><h2 class="grow" style="margin:0">Hours sheet</h2><span class="tag plus">Plus idea</span></div><p class="small muted">A spreadsheet of every shift in this period (scheduled and actual times, breaks, paid hours, rate, estimate) to compare with your pay stub.</p><button class="btn ghost sm" id="p-csv">' + ic('i-down') + 'Download CSV</button></div>';
    view.innerHTML = h;
    $$('[data-worked]').forEach(function (b) { b.onclick = function () { var s = shiftById(b.getAttribute('data-worked')); s.worked = true; s.actual = null; save(); toast('Marked as worked'); render(); }; });
    $('#p-csv').onclick = function () {
      var list = allViews().filter(function (v) { return v.sc.startMs >= fMs && v.sc.startMs < tMs; }).map(function (v) { return v.s; });
      download('shiftsync-hours-' + from + '.csv', E.csv(list, db.workplaces), 'text/csv'); toast('Hours sheet downloaded');
    };
  }

  /* ---------- settings ---------- */
  function settings() {
    var S = db.settings, hasDemo = db.workplaces.some(function (w) { return w.demo; });
    function cap(name, status, cls, text) { return '<div class="cap"><b>' + name + '</b><span class="tag ' + cls + '">' + status + '</span><p>' + text + '</p></div>'; }
    var h = '<div class="top"><div><h1>Settings</h1><p class="sub">Reminders, calendar, privacy and plans.</p></div></div>' +
      '<div class="card"><h2>' + ic('i-bell') + ' Reminders</h2>' +
      '<div class="field"><label class="f" for="s-alarm">Alert before each shift (in calendar files)</label><select class="in" id="s-alarm">' + [['', 'No alert'], [0, 'At start time'], [15, '15 min before'], [30, '30 min before'], [60, '1 hour before'], [120, '2 hours before'], [1440, '1 day before']].map(function (o) { return '<option value="' + o[0] + '"' + (String(S.alarmMin) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      '<p class="hint">Your phone’s calendar shows this alert once you add the shifts with a calendar file below.</p></div>' +
      '<label class="switch"><span><b>“Shift soon” banner</b><br><span class="small muted">While ShiftSync is open, show a banner when a shift starts within 2 hours.</span></span><input type="checkbox" id="s-soon"' + (S.soon ? ' checked' : '') + '></label>' +
      '<div class="note" style="margin:8px 0 0">' + ic('i-alert') + '<span>ShiftSync cannot send notifications when it is closed. That needs a phone app or a notification server. Use the calendar alert instead.</span></div></div>' +
      '<div class="card"><h2>' + ic('i-cal') + ' Calendar</h2>' +
      '<div class="btns" style="margin-bottom:12px"><button class="btn ghost sm" id="s-ics14">' + ic('i-down') + 'Next 2 weeks (.ics)</button><button class="btn ghost sm" id="s-icsall">' + ic('i-down') + 'All upcoming (.ics) <span class="tag plus" style="margin-left:4px">Plus idea</span></button></div>' +
      '<p class="hint" style="margin-top:-4px">A calendar file is a one-time copy. If your schedule changes, download it again. Your calendar may then show both the old and new times: delete the old ones there.</p>' +
      '<div class="grid2" style="margin-top:12px"><div class="field"><label class="f" for="s-week">Week starts on</label><select class="in" id="s-week"><option value="0"' + (S.weekStart === 0 ? ' selected' : '') + '>Sunday</option><option value="1"' + (S.weekStart === 1 ? ' selected' : '') + '>Monday</option><option value="6"' + (S.weekStart === 6 ? ' selected' : '') + '>Saturday</option></select></div>' +
      '<div class="field"><label class="f" for="s-tz">Show times in</label><select class="in" id="s-tz"><option value="">This device (' + esc(DEVICE_TZ) + ')</option>' + tzList().map(function (z) { return '<option' + (S.tz === z ? ' selected' : '') + '>' + esc(z) + '</option>'; }).join('') + '</select></div></div>' +
      '<label class="switch"><span><b>Check travel time between jobs</b><br><span class="small muted">Uses the travel time set on each workplace.</span></span><input type="checkbox" id="s-travel"' + (S.travel ? ' checked' : '') + '></label></div>' +
      '<div class="card"><h2>' + ic('i-lock') + ' Privacy</h2><p class="small">Everything is saved <b>only in this browser on this device</b>' + (state.storage === 'memory' ? ' <span class="tag bad">Storage is blocked here: data will be lost when you close the page</span>' : '') + '. No account, no server, no tracking. Schedule photos are read on this device and never uploaded or kept. On team schedules, other people’s names and shifts are cleared as soon as you pick your row.</p>' +
      '<label class="switch"><span><b>Remember my name on team schedules</b><br><span class="small muted">' + (S.myName ? 'Saved: “' + esc(S.myName) + '”' : 'Nothing saved') + '</span></span><input type="checkbox" id="s-name"' + (S.rememberName ? ' checked' : '') + '></label>' +
      '<div class="btns" style="margin-top:10px"><button class="btn ghost sm" id="s-backup">' + ic('i-down') + 'Back up my data</button><button class="btn ghost sm" id="s-restore">Restore a backup</button>' + (hasDemo ? '<button class="btn ghost sm" id="s-demo">Remove demo data</button>' : '<button class="btn ghost sm" id="s-adddemo">Add demo shifts</button>') + '<button class="btn danger sm" id="s-wipe">Delete everything</button></div>' +
      '<input type="file" id="s-file" accept="application/json,.json" hidden></div>' +
      '<div class="card"><h2>' + ic('i-spark') + ' Plans <span class="tag check" style="vertical-align:middle">Idea being tested</span></h2><p class="small muted">Nothing is charged or locked in this prototype. Features marked “Plus idea” work for everyone so we can learn which ones people really use. Prices are guesses.</p><div class="plans">' +
      '<div class="card flat"><h3>Free · basic scheduling</h3><ul><li>One workplace</li><li>Add and edit shifts, overnight shifts, paid and unpaid breaks, actual hours</li><li>Schedule photo import with review</li><li>Week and month calendar, overlap check</li><li>Estimated gross pay for that job</li><li>Calendar file for the next 2 weeks</li></ul></div>' +
      '<div class="card flat" style="border-color:var(--violet)"><h3>Plus · guess: $3.99 a month or $29 a year</h3><ul><li><b>Multi-job tools:</b> any number of workplaces, overlap and travel checks across jobs, one combined pay estimate. <span class="muted">Why: when you work two jobs, the costly mistakes happen between them (double-booked or no time to get across town), and no single employer’s app can see both.</span></li><li><b>Advanced exports:</b> hours sheet (CSV) for any period, all upcoming shifts in one calendar file, later a live calendar link that updates itself. <span class="muted">Why: compare your hours with your pay stub, and stop re-adding shifts by hand.</span></li><li><b>Customization:</b> reminders per job, break presets, more colours. <span class="muted">Why: different jobs need different heads-ups.</span></li></ul></div></div></div>' +
      '<div class="card"><h2>What works here and what needs more</h2>' +
      cap('Reading schedule photos (OCR)', 'Works on device', 'ok', 'Open-source text reader (Tesseract.js) running in your browser. Clear printed or app schedules read well; handwriting, whiteboards, glare and tilted photos often fail. You always review before saving.') +
      cap('Time zones, overnight shifts, clock changes', 'Works', 'ok', 'Uses your browser’s own time zone data.') +
      cap('Calendar export', 'File download', 'check', 'A one-time .ics file. Writing straight into the phone calendar, or a calendar that updates itself, needs a phone app (calendar permission) or a hosted calendar feed (a server).') +
      cap('Notifications when the app is closed', 'Needs phone app', 'bad', 'Needs a native app (local notifications) or a push server and your permission. Not built. Calendar alerts work today.') +
      cap('Camera scanning, cropping, share sheet', 'Needs phone app', 'bad', 'The photo picker works (it can open the camera on phones). Live document scanning and appearing in the iPhone share sheet need a native app.') +
      cap('Sync between devices, accounts, payments', 'Needs a server', 'bad', 'Not built. Use Back up / Restore to move data by hand.') +
      '</div><p class="tiny muted">ShiftSync prototype. Your employer’s schedule and pay records are the official ones. The text reader is Tesseract.js (Apache License 2.0).</p>';
    view.innerHTML = h;
    function set(k, v) { S[k] = v; save(); }
    $('#s-alarm').onchange = function () { set('alarmMin', this.value === '' ? '' : +this.value); toast('Saved'); };
    $('#s-soon').onchange = function () { set('soon', this.checked); soonBanner(); };
    $('#s-week').onchange = function () { set('weekStart', +this.value); toast('Saved'); };
    $('#s-tz').onchange = function () { set('tz', this.value); toast('Saved'); };
    $('#s-travel').onchange = function () { set('travel', this.checked); };
    $('#s-name').onchange = function () { S.rememberName = this.checked; if (!this.checked) S.myName = ''; save(); settings(); };
    function upcoming(days) { var n = now(), lim = days ? n + days * 864e5 : Infinity; return allViews().filter(function (v) { return v.sc.endMs > n && v.sc.startMs < lim; }).map(function (v) { return v.s; }); }
    $('#s-ics14').onclick = function () { var l = upcoming(14); if (!l.length) { toast('No shifts in the next 2 weeks'); return; } download('shifts-next-2-weeks.ics', E.ics(l, db.workplaces, { alarmMin: S.alarmMin }), 'text/calendar'); toast(l.length + ' shifts in the file. Open it to add them.'); };
    $('#s-icsall').onclick = function () { var l = upcoming(0); if (!l.length) { toast('No upcoming shifts'); return; } download('shifts-all-upcoming.ics', E.ics(l, db.workplaces, { alarmMin: S.alarmMin }), 'text/calendar'); toast(l.length + ' shifts in the file. Open it to add them.'); };
    $('#s-backup').onclick = function () { download('shiftsync-backup-' + today() + '.json', JSON.stringify({ app: 'ShiftSync', version: 1, savedAt: new Date().toISOString(), data: db }, null, 1), 'application/json'); toast('Backup downloaded'); };
    $('#s-restore').onclick = function () { $('#s-file').click(); };
    $('#s-file').onchange = function () {
      var f = this.files[0]; if (!f) return;
      f.text().then(function (t) {
        var j = JSON.parse(t); if (!j || j.app !== 'ShiftSync' || !j.data || !Array.isArray(j.data.shifts) || !Array.isArray(j.data.workplaces)) throw new Error();
        modal('<h2>Restore this backup?</h2><p class="muted">It has ' + j.data.workplaces.length + ' workplaces and ' + j.data.shifts.length + ' shifts and replaces everything in ShiftSync now.</p><div class="btns"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="m-ok">Restore</button></div>',
          function (bg, close) { bg.querySelector('#m-ok').onclick = function () { close(); db.workplaces = j.data.workplaces; db.shifts = j.data.shifts; db.settings = Object.assign({}, DEFAULTS, j.data.settings || {}, { welcomed: true }); save(); toast('Backup restored'); go('#/home'); }; });
      }).catch(function () { toast('That file is not a ShiftSync backup'); });
    };
    var dm = $('#s-demo'); if (dm) dm.onclick = function () { db.workplaces = db.workplaces.filter(function (w) { return !w.demo; }); db.shifts = db.shifts.filter(function (s) { return wpById(s.wp); }); save(); toast('Demo data removed'); settings(); };
    var ad = $('#s-adddemo'); if (ad) ad.onclick = function () { loadDemo(); toast('Demo shifts added'); settings(); };
    $('#s-wipe').onclick = function () {
      modal('<h2>Delete everything?</h2><p class="muted">All workplaces, shifts and settings are removed from this device. This cannot be undone. Download a backup first if you might want them.</p><div class="btns"><button class="btn ghost" data-close>Cancel</button><button class="btn danger" id="m-wipe">Delete everything</button></div>',
        function (bg, close) { bg.querySelector('#m-wipe').onclick = function () { close(); db = { workplaces: [], shifts: [], settings: Object.assign({}, DEFAULTS) }; try { localStorage.removeItem(KEY); } catch (e) { } toast('Everything deleted'); go('#/welcome'); }; });
    };
  }

  /* ---------- "shift soon" banner (only while the app is open) ---------- */
  function soonBanner() {
    var el = document.getElementById('soon'), nowMs = now();
    var v = db.settings.soon && allViews().find(function (x) { return x.sc.startMs > nowMs && x.sc.startMs - nowMs <= db.settings.soonMin * 6e4; });
    var name = route().parts[0];
    if (!v || name === 'import' || name === 'welcome') { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = '<a href="#/shift/' + v.s.id + '">' + ic('i-bell') + '<span class="grow">' + esc(v.w.name) + ' starts ' + untilText(v.sc.startMs) + ' · ' + fmtT(v.st) + '</span>' + ic('i-right') + '</a>';
  }

  /* ---------- start ---------- */
  document.getElementById('nav-add').onclick = function () {
    modal('<h2>Add shifts</h2><button class="pick" data-go="#/add"><span class="ico">' + ic('i-plus') + '</span><span><b>Add a shift</b><small>Type the date and times.</small></span></button><button class="pick" data-go="#/import"><span class="ico">' + ic('i-camera') + '</span><span><b>From a schedule photo</b><small>Read on this device, checked by you.</small></span></button><button class="btn ghost block" data-close>Close</button>',
      function (bg, close) { $$('[data-go]', bg).forEach(function (b) { b.onclick = function () { close(); go(b.getAttribute('data-go')); }; }); });
  };
  load();
  window.addEventListener('hashchange', render);
  setInterval(function () { soonBanner(); }, 60000);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { });
  window.SSApp = { db: function () { return db; }, state: state, reload: function () { load(); render(); } };
  render();
})();
