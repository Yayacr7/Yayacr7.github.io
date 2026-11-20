/* Dinner Sorted app. All data stays on this device. */
(function () {
  'use strict';
  var E = window.DSEngine, D = E.data, I = D.I, ART = window.DSArt.art, CFG = window.DS_CONFIG || {};
  var KEY = 'dinner-sorted-v1';
  var view = document.getElementById('view');

  /* ---------- storage ---------- */
  var storageOK = true;
  function defaults() {
    return { v: 1, people: 2, time: 30, have: [], custom: [], basics: true, exclude: [], page: 0,
      prefs: { done: false, diet: 'none', allergens: [], avoid: [], avoidText: [], equipment: ['stovetop', 'oven', 'microwave'] },
      favs: [], pantry: [], usePantry: true, list: [], cooked: [], timers: [], cook: null, wide: false };
  }
  function load() {
    var s = defaults();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); if (o && o.v === 1) { s = Object.assign(s, o); s.prefs = Object.assign(defaults().prefs, o.prefs || {}); } }
    } catch (e) { storageOK = false; }
    // drop anything that no longer exists
    s.have = s.have.filter(function (id) { return I[id]; });
    s.pantry = s.pantry.filter(function (id) { return I[id]; });
    s.favs = s.favs.filter(function (id) { return byId(id); });
    if (!Array.isArray(s.list)) s.list = [];
    if (!Array.isArray(s.timers)) s.timers = [];
    return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { if (storageOK) { storageOK = false; showBanners(); } } }
  function byId(id) { for (var i = 0; i < D.RECIPES.length; i++) if (D.RECIPES[i].id === id) return D.RECIPES[i]; return null; }
  var S = load();
  var T = { photoUrl: null, suggested: [], recog: 'idle', recogMsg: '', sugIndex: -1, focus: null, peopleView: null, drawer: false, clearArm: null, wake: null, alarmOn: null };

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icon(n) { return '<svg aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  var toastT;
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function names(ids) { return ids.map(function (id) { return I[id] ? I[id].name : id; }); }
  function joinNice(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function timeLabel(t) { return t ? 'up to ' + t + ' min' : 'any time'; }
  function ctx(people) {
    var have = S.have.slice();
    if (S.usePantry) S.pantry.forEach(function (id) { if (have.indexOf(id) < 0) have.push(id); });
    return { have: have, basics: S.basics, people: people || S.people, time: S.time || null, diet: { vegetarian: S.prefs.diet === 'vegetarian', vegan: S.prefs.diet === 'vegan' },
      allergens: S.prefs.allergens, avoid: S.prefs.avoid, exclude: S.exclude, equipment: S.prefs.equipment };
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(function () { return true; }, fallback);
    return Promise.resolve(fallback());
    function fallback() { try { var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; } }
  }

  /* ---------- banners: offline, storage ---------- */
  function showBanners() {
    var b = document.getElementById('banner'), msgs = [];
    if (!navigator.onLine) msgs.push('You are offline. Everything still works on this device; sharing a list will wait until you are back online.');
    if (!storageOK) msgs.push('Your browser is blocking storage, so your ingredients, list and favorites will be lost when you close this tab.');
    b.hidden = !msgs.length; b.textContent = msgs.join(' ');
  }
  window.addEventListener('online', showBanners); window.addEventListener('offline', showBanners);

  /* ---------- router ---------- */
  function parse() {
    var h = location.hash.replace(/^#\/?/, ''), q = '';
    var i = h.indexOf('?'); if (i >= 0) { q = h.slice(i + 1); h = h.slice(0, i); }
    var parts = h.split('/').filter(Boolean);
    return { name: parts[0] || 'home', arg: parts[1] ? decodeURIComponent(parts[1]) : null, q: new URLSearchParams(q) };
  }
  var lastRoute = '';
  function route() {
    var r = parse(), fn = VIEWS[r.name] || notFound;
    var key = r.name + '/' + (r.arg || '');
    var changed = key !== lastRoute; lastRoute = key;
    if (r.name !== 'cook') leaveCook();
    document.body.classList.toggle('has-tabs', r.name !== 'cook');
    var nav = { home: 'home', add: 'home', photo: 'home', prefs: 'home', results: 'home', recipe: 'home', done: 'home', list: 'list', favorites: 'favorites', pantry: 'pantry' }[r.name];
    document.querySelectorAll('[data-nav]').forEach(function (a) { if (a.dataset.nav === nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    try { view.innerHTML = fn(r); }
    catch (e) { console.error(e); view.innerHTML = errorCard(); }
    if (changed) { window.scrollTo(0, 0); if (r.name !== 'cook') view.focus({ preventScroll: true }); view.classList.add('fresh'); clearTimeout(route.t); route.t = setTimeout(function () { view.classList.remove('fresh'); }, 700); }
    after(r);
    updateCount(); renderDock();
  }
  function rerender() { var y = window.scrollY; var r = parse(); try { view.innerHTML = (VIEWS[r.name] || notFound)(r); } catch (e) { console.error(e); view.innerHTML = errorCard(); } after(r); window.scrollTo(0, y); updateCount(); renderDock(); }
  function after(r) {
    if (T.focus) { var el = document.getElementById(T.focus); T.focus = null; if (el) { el.focus(); if (el.setSelectionRange) { var n = el.value.length; el.setSelectionRange(n, n); } } }
    if (r.name === 'cook') enterCook();
    document.title = ({ home: 'Dinner Sorted', add: 'Your ingredients · Dinner Sorted', results: 'Tonight\'s dinners · Dinner Sorted', list: 'Shopping list · Dinner Sorted', favorites: 'Favorites · Dinner Sorted', pantry: 'Pantry · Dinner Sorted', about: 'How it works · Dinner Sorted', prefs: 'Preferences · Dinner Sorted', photo: 'Photo · Dinner Sorted' }[r.name]) || (r.arg && byId(r.arg) ? byId(r.arg).name + ' · Dinner Sorted' : 'Dinner Sorted');
  }
  function errorCard() { return '<div class="card pad empty narrow"><h2>Something went wrong on this screen</h2><p>Your saved ingredients and list are fine. Try going back, or reload the page.</p><div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/">Go home</a><button class="btn btn-ghost" data-act="reload">Reload</button></div></div>'; }
  function notFound() { return '<div class="card pad empty narrow"><h2>That page does not exist</h2><p>The link may be old or typed wrong.</p><a class="btn btn-primary" href="#/">Go home</a></div>'; }
  function updateCount() { var n = S.list.filter(function (x) { return !x.done; }).length, c = document.getElementById('list-count'); c.hidden = !n; c.textContent = n; }

  /* ---------- HOME ---------- */
  function stepper(act, val, label) {
    return '<div class="stepper" role="group" aria-label="' + label + '"><button type="button" data-act="' + act + '" data-d="-1" aria-label="Fewer">' + icon('minus') + '</button><output aria-live="polite">' + val + '</output><button type="button" data-act="' + act + '" data-d="1" aria-label="More">' + icon('plus') + '</button></div>';
  }
  function home() {
    var times = [[15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 hour'], [0, 'Any']];
    var h = '<section class="hero"><div>' +
      '<h1>What’s for <em>dinner?<svg class="burst" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 13 2 7M10 11V2M15 13l4-5" stroke="#F2B53A" stroke-width="2.6" stroke-linecap="round"/></svg></em></h1><p class="promise">Your ingredients. Tonight’s dinner.</p>' +
      '<div class="card pad ask">' +
      '<div class="ask-row"><span class="ask-label">' + icon('people') + 'How many are eating?</span>' + stepper('people', S.people, 'People eating') + '</div>' +
      '<div class="ask-row"><span class="ask-label">' + icon('clock') + 'How much time?</span><div class="seg" role="group" aria-label="Time you have">' +
      times.map(function (t) { return '<button type="button" data-act="time" data-v="' + t[0] + '" aria-pressed="' + (S.time === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
      '<a class="btn btn-primary btn-big btn-block" href="#/add">Next: what do you have?' + icon('arrow') + '</a></div>';
    if (S.have.length) h += '<div class="resume"><span><b>' + S.have.length + ' ingredient' + (S.have.length > 1 ? 's' : '') + '</b> from last time: ' + esc(joinNice(names(S.have.slice(0, 4)))) + (S.have.length > 4 ? '…' : '') + '</span><span class="row"><button class="btn btn-green" data-act="find">Show dinners</button><button class="link" data-act="fresh">Start fresh</button></span></div>';
    h += '<div class="trust"><span>' + icon('check') + D.RECIPES.length + ' hand-picked recipes</span><span>' + icon('check') + 'Works offline</span><span>' + icon('check') + 'No account. Nothing uploaded.</span></div>';
    h += '</div><div class="hero-art" aria-hidden="true">' + window.DSArt.scene() + '</div></section>';
    return h;
  }

  /* ---------- ADD INGREDIENTS ---------- */
  var CATS = [['protein', 'Protein'], ['carb', 'Rice, pasta & bread'], ['veg', 'Vegetables & fruit'], ['dairy', 'Dairy'], ['pantry', 'Sauces & cans'], ['spice', 'Spices']];
  function haveChips() {
    if (!S.have.length && !S.custom.length) return '<p class="muted">Nothing added yet. Try typing “eggs, rice, spinach”.</p>';
    return '<div class="chips" aria-label="Your ingredients">' + S.have.map(function (id) {
      return '<span class="chip have">' + esc(I[id].name) + '<button class="x" type="button" data-act="rm-have" data-id="' + id + '" aria-label="Remove ' + esc(I[id].name) + '">' + icon('x') + '</button></span>';
    }).join('') + S.custom.map(function (t, i) {
      return '<span class="chip custom" title="Not in our recipe collection yet">' + esc(t) + '<button class="x" type="button" data-act="rm-custom" data-i="' + i + '" aria-label="Remove ' + esc(t) + '">' + icon('x') + '</button></span>';
    }).join('') + '</div>';
  }
  function pickGroups(selected, act) {
    var common = D.COMMON;
    var html = '<p class="group-h">Common</p><div class="chips">' + common.map(function (id) { return pick(id); }).join('') + '</div>';
    html += '<details class="more-ing"><summary class="link" style="display:inline-block;margin-top:12px">More ingredients</summary>';
    CATS.forEach(function (c) {
      var ids = Object.keys(I).filter(function (id) { return I[id].cat === c[0] && common.indexOf(id) < 0 && !isSwapOnly(id); });
      if (ids.length) html += '<p class="group-h">' + c[1] + '</p><div class="chips">' + ids.map(pick).join('') + '</div>';
    });
    return html + '</details>';
    function pick(id) { return '<button type="button" class="chip" data-act="' + act + '" data-id="' + id + '" aria-pressed="' + (selected.indexOf(id) >= 0) + '">' + esc(I[id].name) + '</button>'; }
  }
  function isSwapOnly(id) { return ['tamari', 'coconut_aminos', 'gf_pasta', 'corn_tortillas', 'dairy_free_cheese', 'sunflower_butter', 'gf_bread'].indexOf(id) >= 0; }
  function add() {
    var pantryN = S.pantry.filter(function (id) { return S.have.indexOf(id) < 0; }).length;
    var h = '<div class="narrow"><a class="back" href="#/">' + icon('back') + 'Back</a>' +
      '<div class="page-h"><h1>What’s in your kitchen?</h1><p>Type, tap or use a photo. Rough is fine: “eggs, rice, half an onion”.</p></div>' +
      entryBox('ing-input', 'Add an ingredient', 'add-typed') +
      '<div class="mine" id="mine">' + haveChips() + '</div>' +
      (S.custom.length ? '<p class="tiny muted">Yellow items are not in our recipe collection yet, so they do not change the suggestions.</p>' : '') +
      '<button class="photo-btn" type="button" data-act="photo-pick">' + icon('camera') + '<span><b>Add from a photo</b><span class="small muted">You confirm every item. Your photo stays on this device.</span></span></button>' +
      '<div class="stack" style="margin-top:12px">' +
      toggle('basics', S.basics, 'I have salt, pepper and cooking oil', 'Most recipes need these. Turn off if you are out.') +
      (S.pantry.length ? toggle('use-pantry', S.usePantry, 'Also use my pantry', pantryN ? 'Adds ' + pantryN + ' more item' + (pantryN > 1 ? 's' : '') + ' you saved in Pantry.' : 'Everything in your pantry is already added.') : '') +
      '</div>' + pickGroups(S.have, 'tog-have') +
      '<div class="sticky-go">' + (S.have.length || (S.usePantry && S.pantry.length) ? '<button class="btn btn-primary btn-big btn-block" data-act="find">Find 3 dinners' + icon('arrow') + '</button>' : '<button class="btn btn-big btn-block" disabled>Add at least one ingredient</button>') + '</div></div>';
    return h;
  }
  function entryBox(id, ph, act) {
    return '<div class="entry"><form class="entry-box" data-form="' + act + '" autocomplete="off"><label class="sr" for="' + id + '">' + ph + '</label><input id="' + id + '" type="text" enterkeyhint="done" placeholder="' + ph + '" role="combobox" aria-expanded="false" aria-controls="' + id + '-sugg" aria-autocomplete="list" maxlength="200"><button class="btn btn-green" type="submit">Add</button></form><div class="sugg" id="' + id + '-sugg" role="listbox" hidden></div></div>';
  }
  function toggle(act, on, title, sub) {
    return '<div class="toggle-row"><label class="switch"><input type="checkbox" data-act="' + act + '" ' + (on ? 'checked' : '') + ' aria-label="' + esc(title) + '"><span></span></label><div><b>' + esc(title) + '</b><div class="small muted">' + esc(sub) + '</div></div></div>';
  }
  function addTyped(text, target) {
    var parts = E.splitList(text), added = [], unknown = [];
    parts.forEach(function (p) {
      var id = E.normalize(p);
      if (id) { if (target.indexOf(id) < 0) { target.push(id); added.push(I[id].name); } }
      else if (p.length <= 40) unknown.push(p);
    });
    return { added: added, unknown: unknown };
  }

  /* ---------- PHOTO ---------- */
  function photo() {
    var h = '<div class="narrow" style="max-width:1000px"><a class="back" href="#/add">' + icon('back') + 'Back to ingredients</a><div class="page-h"><h1>Add from a photo</h1></div>';
    if (!T.photoUrl) {
      return h + '<div class="card pad empty"><h2>No photo yet</h2><p>Take a photo of your fridge or shelf, or pick one you already have.</p><button class="btn btn-primary" data-act="photo-pick">' + icon('camera') + 'Choose a photo</button>' + (T.recogMsg ? '<div class="note danger" style="margin-top:16px;text-align:left">' + icon('alert') + '<span>' + esc(T.recogMsg) + '</span></div>' : '') + '</div></div>';
    }
    h += '<div class="photo-wrap"><img src="' + T.photoUrl + '" alt="Your photo"><div class="stack">';
    if (CFG.recognizeUrl) {
      if (T.recog === 'loading') h += '<div class="card pad" aria-busy="true"><span class="loading-dots"><i></i><i></i><i></i></span> <b>Looking at your photo…</b><p class="small muted" style="margin-top:6px">This can take a few seconds. Nothing is added until you confirm it.</p></div>';
      if (T.recog === 'error') h += '<div class="note danger">' + icon('alert') + '<span><b>Could not read the photo.</b> ' + esc(T.recogMsg) + ' You can still tap what you see below.</span></div><button class="btn btn-ghost" data-act="recog-retry">Try again</button>';
      if (T.recog === 'done') {
        if (T.suggested.length) h += '<div class="card pad"><b>These might be in your photo. Tap each one you really have.</b><p class="small muted" style="margin:4px 0 10px">Suggestions can be wrong. Nothing is added until you tap it.</p><div class="chips">' + T.suggested.map(function (id) { return '<button class="chip suggested" data-act="confirm-sug" data-id="' + id + '">' + icon('plus') + esc(I[id].name) + '</button>'; }).join('') + '</div><div class="row" style="margin-top:12px"><button class="btn btn-soft" data-act="confirm-all">Yes, I have all ' + T.suggested.length + '</button><button class="link" data-act="ignore-sug">Ignore suggestions</button></div></div>';
        else h += '<div class="note">' + icon('info') + '<span>No ingredients were suggested from this photo. Tap what you see below.</span></div>';
      }
    } else {
      h += '<div class="note">' + icon('info') + '<span><b>Photo recognition is not connected in this version</b>, so the app will not guess. Look at your photo and tap what you have.</span></div>';
    }
    h += '<div class="mine">' + haveChips() + '</div>' + pickGroups(S.have, 'tog-have');
    h += '<div class="note warn">' + icon('alert') + '<span>This app cannot tell whether food is safe to eat from a photo, and a date on a package is not a safety guarantee. Check the food and its packaging. When in doubt, throw it out.</span></div>';
    h += '<p class="tiny muted">Your photo stays on this device and is not saved. It is gone when you leave this screen or reload.</p>';
    h += '<a class="btn btn-primary btn-block" href="#/add">Done' + icon('arrow') + '</a></div></div></div>';
    return h;
  }
  function onPhoto(file) {
    T.recogMsg = '';
    if (!file) return;
    if (!/^image\//.test(file.type || '')) { T.photoUrl = null; T.recogMsg = 'That file is not a picture. Try a JPG, PNG or HEIC photo.'; go('#/photo'); rerender(); return; }
    if (file.size > 25 * 1024 * 1024) { T.photoUrl = null; T.recogMsg = 'That photo is too large (over 25 MB). Try a smaller one.'; go('#/photo'); rerender(); return; }
    if (T.photoUrl) URL.revokeObjectURL(T.photoUrl);
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { T.photoUrl = url; T.file = file; T.suggested = []; if (CFG.recognizeUrl) recognize(); go('#/photo'); rerender(); };
    img.onerror = function () { URL.revokeObjectURL(url); T.photoUrl = null; T.recogMsg = 'This browser could not open that photo. Some formats (like HEIC on some computers) do not work. Try a screenshot or a JPG.'; go('#/photo'); rerender(); };
    img.src = url;
  }
  function recognize() {
    T.recog = 'loading'; T.suggested = [];
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    fetch(CFG.recognizeUrl, { method: 'POST', body: T.file, headers: { 'Content-Type': T.file.type || 'application/octet-stream' }, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('The server answered with an error (' + r.status + ').'); return r.json(); })
      .then(function (j) {
        // validate: only a short list of short strings, matched to known ingredients
        if (!j || !Array.isArray(j.ingredients) || j.ingredients.length > 40) throw new Error('The answer was not in the expected format.');
        var ids = [];
        j.ingredients.forEach(function (s) { if (typeof s !== 'string' || s.length > 60) return; var id = E.normalize(s); if (id && ids.indexOf(id) < 0 && S.have.indexOf(id) < 0 && !I[id].flags.includes('staple')) ids.push(id); });
        T.suggested = ids; T.recog = 'done';
      })
      .catch(function (e) { T.recog = 'error'; T.recogMsg = !navigator.onLine ? 'You are offline.' : (e.name === 'AbortError' ? 'It took too long.' : e.message); })
      .then(function () { clearTimeout(timer); if (parse().name === 'photo') rerender(); });
  }

  /* ---------- PREFERENCES ---------- */
  function prefs(r) {
    var P = S.prefs, next = r.q.get('next');
    var h = '<div class="narrow"><a class="back" href="' + (next ? '#/add' : '#/results') + '">' + icon('back') + 'Back</a>' +
      '<div class="page-h"><h1>A few quick things</h1><p>Asked once and remembered. Change them any time from the dinner page.</p></div><div class="card pad">' +
      '<div class="pref-sec"><h2>Diet</h2><div class="seg" role="group" aria-label="Diet">' + [['none', 'No preference'], ['vegetarian', 'Vegetarian'], ['vegan', 'Vegan']].map(function (d) { return '<button type="button" data-act="diet" data-v="' + d[0] + '" aria-pressed="' + (P.diet === d[0]) + '">' + d[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="pref-sec"><h2>Allergies</h2><p>Meals with these are left out, or the ingredient is swapped and flagged. Brands differ, so always check the packaging.</p><div class="chips">' +
      D.ALLERGENS.map(function (a) { return '<button type="button" class="chip" data-act="allergen" data-v="' + a + '" aria-pressed="' + (P.allergens.indexOf(a) >= 0) + '">' + esc(cap(E.ALLERGEN_LABEL[a])) + '</button>'; }).join('') + '</div></div>' +
      '<div class="pref-sec"><h2>Anything else to avoid?</h2><p>For example “mushrooms” or “cilantro”.</p>' + entryBox('avoid-input', 'Add something to avoid', 'add-avoid') +
      '<div class="chips" style="margin-top:10px">' + P.avoid.map(function (id) { return '<span class="chip need">' + esc(I[id].name) + '<button class="x" type="button" data-act="rm-avoid" data-id="' + id + '" aria-label="Stop avoiding ' + esc(I[id].name) + '" style="border:0;background:none;display:grid">' + icon('x') + '</button></span>'; }).join('') +
      P.avoidText.map(function (t, i) { return '<span class="chip custom">' + esc(t) + '<button class="x" type="button" data-act="rm-avoidtext" data-i="' + i + '" aria-label="Remove ' + esc(t) + '" style="border:0;background:none;display:grid">' + icon('x') + '</button></span>'; }).join('') + '</div>' +
      (P.avoidText.length ? '<div class="note warn" style="margin-top:10px">' + icon('alert') + '<span>We do not know “' + esc(P.avoidText.join('”, “')) + '”, so we cannot check for it automatically. Read each recipe’s ingredients yourself.</span></div>' : '') + '</div>' +
      '<div class="pref-sec"><h2>What can you cook with?</h2><div class="chips">' + [['stovetop', 'Stovetop'], ['oven', 'Oven'], ['microwave', 'Microwave']].map(function (e) { return '<button type="button" class="chip" data-act="equip" data-v="' + e[0] + '" aria-pressed="' + (P.equipment.indexOf(e[0]) >= 0) + '">' + e[1] + '</button>'; }).join('') + '</div></div>' +
      '</div><div class="sticky-go"><button class="btn btn-primary btn-big btn-block" data-act="prefs-done">Show my dinners' + icon('arrow') + '</button></div></div>';
    return h;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function prefsSummary() {
    var P = S.prefs, bits = [];
    if (P.diet !== 'none') bits.push(cap(P.diet));
    if (P.allergens.length) bits.push('No ' + P.allergens.map(function (a) { return E.ALLERGEN_LABEL[a]; }).join(', '));
    if (P.avoid.length || P.avoidText.length) bits.push('Avoiding ' + (P.avoid.length + P.avoidText.length));
    if (P.equipment.length < 3) bits.push(P.equipment.map(cap).join(' + ') + ' only');
    return bits.length ? bits.join(' · ') : 'No diet limits';
  }

  /* ---------- RESULTS ---------- */
  function results() {
    var c = ctx(), res = E.choose(c, { page: S.page, maxMissing: S.wide ? 5 : 3 });
    if (S.page !== res.page) { S.page = res.page; save(); }
    var mineIds = c.have.filter(function (id) { return !I[id].flags.includes('staple'); });
    var exIds = mineIds.concat(S.exclude.filter(function (id) { return mineIds.indexOf(id) < 0; }));
    var h = '<div class="results-h"><div><p class="eyebrow">Tonight</p><h1>' + (res.picks.length ? (res.picks.length === 3 ? 'Three dinners for you' : (res.picks.length === 2 ? 'Two dinners for you' : 'One dinner for you')) : 'No dinners yet') + '</h1>' +
      '<div class="summary"><a class="tag" href="#/">' + icon('people') + S.people + (S.people > 1 ? ' people' : ' person') + '</a><a class="tag" href="#/">' + icon('clock') + timeLabel(S.time) + '</a><a class="tag green" href="#/add">' + mineIds.length + ' ingredient' + (mineIds.length === 1 ? '' : 's') + '</a><a class="tag" href="#/prefs">' + esc(prefsSummary()) + '</a></div></div></div>';
    if (exIds.length) h += '<div class="exclude"><span class="lbl">Not feeling something? Tap to leave it out.</span><div class="chips">' + exIds.map(function (id) { var off = S.exclude.indexOf(id) >= 0; return '<button class="chip sm ' + (off ? 'off' : '') + '" data-act="exclude" data-id="' + id + '" aria-pressed="' + off + '">' + esc(I[id].name) + '</button>'; }).join('') + '</div></div>';
    if (!res.picks.length) return h + noMatch(res, c);
    h += '<div class="meals">' + res.picks.map(function (p, i) { return mealCard(p, i + res.page * 3); }).join('') + '</div>';
    h += '<div class="more">' + (res.total > 3 ? '<button class="btn btn-ghost" data-act="other">Show 3 other ideas</button><span class="small muted" style="align-self:center">Ideas ' + (res.page * 3 + 1) + '–' + Math.min(res.total, res.page * 3 + 3) + ' of ' + res.total + ' that fit</span>' : '<span class="small muted">These are all the meals that fit right now. Add an ingredient for more.</span>') + '</div>';
    if (S.wide) h += '<p class="small muted" style="text-align:center;margin-top:8px">Showing meals that need up to 5 more things. <button class="link" data-act="narrow">Back to 3</button></p>';
    h += '<p class="tiny muted" style="text-align:center;margin-top:14px">Times are estimates. $ signs are rough cost guesses, not checked prices. Meals only ask you to buy what is listed under “Still need”.</p>';
    return h;
  }
  function mealCard(p, i) {
    var r = p.recipe, fav = S.favs.indexOf(r.id) >= 0;
    var usedNames = p.used.map(function (l) { return l.name; });
    var tags = '<span class="tag">' + icon('clock') + '≈ ' + r.time + ' min <span class="est">est.</span></span><span class="tag" title="Rough guess, not a checked price">' + r.cost + ' <span class="est">guess</span></span>';
    if (p.over) tags += '<span class="tag gold">About ' + p.over + ' min over your time</span>';
    E.badges(p).forEach(function (b) { tags += '<span class="tag green">' + b + '</span>'; });
    p.pricey.forEach(function (l) { tags += '<span class="tag red">Pricier item: ' + esc(l.name) + '</span>'; });
    var swaps = p.swaps.filter(function (s) { return s.to; });
    return '<article class="card meal"><div class="meal-art">' + ART(r, 'art') + '<span class="rank">' + (i + 1) + '</span><button class="icon-btn fav" data-act="fav" data-id="' + r.id + '" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Remove from favorites' : 'Save to favorites') + '">' + icon(fav ? 'heart-fill' : 'heart') + '</button></div>' +
      '<div class="meal-body"><h2>' + esc(r.name) + '</h2><p class="small muted">' + esc(r.blurb) + '</p><div class="meal-meta">' + tags + '</div>' +
      '<p class="fit">Uses <b>' + p.used.length + '</b> of yours: ' + esc(joinNice(usedNames)) + '</p>' +
      (p.missing.length ? '<div class="need-line">Still need: <div class="chips" style="margin-top:6px">' + p.missing.map(function (l) { return '<span class="chip sm need">' + esc(l.name) + '</span>'; }).join('') + '</div></div>' : '<p class="need-line"><b style="color:var(--leaf-dk)">Nothing to buy</b> (plus the basics)</p>') +
      (swaps.length ? '<p class="small">' + icon('swap') + ' ' + swaps.map(function (s) { return 'Uses ' + esc(s.toName) + ' instead of ' + esc(I[s.from].name.toLowerCase()); }).join('; ') + '</p>' : '') +
      '<a class="btn btn-green btn-block" href="#/recipe/' + r.id + '">See recipe' + icon('arrow') + '</a></div></article>';
  }
  function noMatch(res, c) {
    var w = res.why || {}, tips = [];
    if (w.code === 'no-ingredients') return '<div class="card pad empty">' + emptyArt() + '<h2>Add a few ingredients first</h2><p>Dinner Sorted works from what you already have.</p><a class="btn btn-primary" href="#/add">Add ingredients</a></div>';
    var k = w.counts || {};
    if (S.exclude.length) tips.push('<li>You left out ' + esc(joinNice(names(S.exclude))) + '. <button class="link" data-act="clear-exclude">Bring them back</button></li>');
    if (k.time) tips.push('<li>Some meals take longer than ' + (S.time || 0) + ' minutes. <button class="link" data-act="time-any">Allow any time</button></li>');
    if (k.missing && !S.wide) tips.push('<li>Some meals need a few more things than usual. <button class="link" data-act="wide">Show meals that need up to 5 more</button></li>');
    if (k.equipment) tips.push('<li>' + k.equipment + ' meal' + (k.equipment > 1 ? 's need' : ' needs') + ' equipment you turned off. <a href="#/prefs">Check equipment</a></li>');
    if (k.allergy || k.diet) tips.push('<li>' + ((k.allergy || 0) + (k.diet || 0)) + ' meals were left out for your allergies or diet. That is on purpose.</li>');
    if (!S.basics) tips.push('<li>You said you have no salt, pepper or oil. <button class="link" data-act="basics-on">I do have them</button></li>');
    tips.push('<li><a href="#/add">Add another ingredient</a>: one more can open up several meals.</li>');
    var unknown = S.custom.length ? '<p class="small">“' + esc(S.custom.slice(0, 3).join('”, “')) + '” ' + (S.custom.length > 1 ? 'are' : 'is') + ' not in our recipes yet.</p>' : '';
    return '<div class="card pad empty">' + emptyArt() + '<h2>Nothing fits all of that yet</h2><p>None of our ' + D.RECIPES.length + ' recipes match everything right now. Here is what would help:</p>' + unknown + '<ul>' + tips.join('') + '</ul></div>';
  }
  function emptyArt() { return '<div class="art-wrap" aria-hidden="true"><svg viewBox="0 0 200 120"><ellipse cx="100" cy="100" rx="70" ry="10" fill="#000" opacity=".06"/><ellipse cx="100" cy="70" rx="80" ry="34" fill="#FFFDF8" stroke="#EADFCB" stroke-width="2"/><ellipse cx="100" cy="70" rx="60" ry="24" fill="none" stroke="#F1E8D6" stroke-width="2"/><path d="M40 20v30M34 20v14a6 6 0 0 0 12 0V20M160 20c-8 6-8 20 0 26v24" stroke="#C9BBA4" stroke-width="3" fill="none" stroke-linecap="round"/></svg></div>'; }

  /* ---------- RECIPE ---------- */
  function recipePlan(r, people) {
    var c = ctx(people), p = E.plan(r, c), blocked = null;
    if (!p.ok) { blocked = p.blocked; p = E.plan(r, { have: c.have, basics: c.basics, people: c.people }); }
    p.blockedBy = blocked; return p;
  }
  function recipe(rt) {
    var r = byId(rt.arg); if (!r) return notFound();
    var people = T.peopleView && T.peopleView.id === r.id ? T.peopleView.n : S.people;
    var p = recipePlan(r, people), fav = S.favs.indexOf(r.id) >= 0;
    var have = p.lines.filter(function (l) { return l.status === 'have' || l.status === 'basic'; }), need = p.missing, opt = p.lines.filter(function (l) { return l.status === 'optional'; }), out = p.lines.filter(function (l) { return l.status === 'left_out'; });
    var h = '<a class="back" href="#/results">' + icon('back') + 'Back to dinners</a><div class="recipe"><div class="side stack"><div class="recipe-art">' + ART(r, 'art') + '</div>' +
      '<div class="facts"><div class="fact"><div class="k">Serves</div>' + stepper('rpeople', people, 'Servings') + '</div><div class="fact"><div class="k">Time</div><div class="v">≈ ' + r.time + ' min</div><div class="tiny muted">estimate</div></div><div class="fact"><div class="k">Cost</div><div class="v">' + r.cost + '</div><div class="tiny muted">rough guess</div></div></div>' +
      '<div class="row">' + r.equipment.map(function (e) { return '<span class="tag">' + cap(e) + '</span>'; }).join('') + E.badges(p).map(function (b) { return '<span class="tag green">' + b + '</span>'; }).join('') + '</div></div>';
    h += '<div class="stack"><h1>' + esc(r.name) + '</h1><p class="muted">' + esc(r.blurb) + '</p>';
    if (p.blockedBy) h += '<div class="note danger">' + icon('alert') + '<span><b>' + (p.blockedBy.kind === 'equipment' ? 'This needs: ' + esc(p.blockedBy.label) + '.' : 'Not a match for your settings: it contains ' + esc(I[p.blockedBy.id].name.toLowerCase()) + ' (' + esc(p.blockedBy.label) + ').') + '</b> It is shown as written so you can read it. <a href="#/prefs">Check settings</a></span></div>';
    var forced = p.lines.filter(function (l) { return l.forced; });
    if (forced.length) h += '<div class="note warn">' + icon('swap') + '<span><b>Changed for you:</b> ' + forced.map(function (l) { return l.swap.to ? esc(l.swap.toName) + ' instead of ' + esc(I[l.swap.from].name.toLowerCase()) + ' (' + esc(l.why) + ')' : esc(I[l.swap.from].name) + ' left out (' + esc(l.why) + ')'; }).join('; ') + '.</span></div>';
    var unsure = p.swaps.filter(function (s) { return s.unsure; });
    var checks = p.labelChecks;
    if (unsure.length || checks.length || S.prefs.allergens.length) {
      h += '<div class="note warn">' + icon('alert') + '<span><b>Check the packaging.</b> ' +
        (S.prefs.allergens.length ? 'You told us: no ' + esc(S.prefs.allergens.map(function (a) { return E.ALLERGEN_LABEL[a]; }).join(', ')) + '. We checked our ingredient list, but recipes and brands differ. ' : '') +
        checks.map(function (c) { return esc(c.text); }).join(' ') + (unsure.length ? ' Swaps marked “check label” are not always safe for allergies.' : '') + '</span></div>';
    }
    h += '<section class="card pad"><div class="sec-h"><h2>You have</h2><span class="tag green">' + have.length + '</span></div><ul class="ing-list">' + have.map(lineLi).join('') + '</ul></section>';
    if (need.length) h += '<section class="card pad"><div class="sec-h"><h2>You still need</h2><button class="btn btn-soft" data-act="to-list" data-id="' + r.id + '">' + icon('plus') + 'Add ' + need.length + ' to list</button></div><ul class="ing-list">' + need.map(lineLi).join('') + '</ul>' + (p.pricey.length ? '<p class="small" style="margin-top:8px">' + esc(joinNice(p.pricey.map(function (l) { return l.name; }))) + ' can cost more than the rest. Check the swaps below.</p>' : '') + '</section>';
    else h += '<div class="note safe">' + icon('check') + '<span><b>You have everything you need.</b></span></div>';
    if (opt.length || out.length) h += '<section class="card pad"><div class="sec-h"><h2>Optional extras</h2></div><ul class="ing-list">' + opt.map(lineLi).join('') + out.map(lineLi).join('') + '</ul></section>';
    var allSubs = r.subs || [];
    if (allSubs.length) {
      var c = ctx(people);
      h += '<section class="card pad"><div class="sec-h"><h2>Swaps</h2></div><ul class="swap-list">' + allSubs.map(function (s) {
        var bad = s.u ? E.conflicts(s.u, c).filter(function (x) { return x.kind !== 'exclude'; }) : [];
        return '<li>No ' + esc(I[s.f].name.toLowerCase()) + '? <b>' + (s.u ? 'Use ' + esc(I[s.u].name.toLowerCase()) : 'Leave it out') + '.</b> ' + esc(s.n) +
          (s.unsure ? ' <span class="tag gold">Check label</span>' : '') + (bad.length ? ' <span class="tag red">Not for you: ' + esc(bad[0].label) + '</span>' : '') + '</li>';
      }).join('') + '</ul></section>';
    }
    var temps = p.steps.filter(function (s) { return s.temp; });
    h += '<section class="card pad"><div class="sec-h"><h2>Steps</h2><span class="tag">' + p.steps.length + ' steps</span></div><ol class="steps-pre">' + p.steps.map(function (s) { return '<li>' + esc(s.text) + (s.timer ? ' <span class="tag">' + icon('timer') + fmtTime(s.timer) + '</span>' : '') + '</li>'; }).join('') + '</ol>' +
      (temps.length ? '<div class="note" style="margin-top:10px">' + icon('thermo') + '<span>' + temps.map(function (s) { return esc(s.temp.text); }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' ') + ' <a href="' + D.TEMP_SOURCE.url + '" target="_blank" rel="noopener">Source: USDA</a></span></div>' : '') +
      '<p class="tiny muted" style="margin-top:8px">Timers are a guide. Stoves, pans and microwaves vary, so check the food.</p></section>';
    h += '<div class="cta-bar"><a class="btn btn-primary btn-big" href="#/cook/' + r.id + '">Start cooking' + icon('arrow') + '</a><button class="icon-btn" style="width:58px;height:58px" data-act="fav" data-id="' + r.id + '" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Remove from favorites' : 'Save to favorites') + '">' + icon(fav ? 'heart-fill' : 'heart') + '</button></div></div></div>';
    return h;
  }
  function lineLi(l) {
    var dot = l.status === 'need' ? 'need' : (l.status === 'have' || l.status === 'basic' ? 'have' : 'opt');
    var ic = dot === 'need' ? 'plus' : (dot === 'have' ? 'check' : 'minus');
    var sub = [];
    if (l.note) sub.push(l.note);
    if (l.status === 'basic') sub.push('a basic you said you have');
    if (l.status === 'optional') sub.push('optional');
    if (l.status === 'left_out') sub.push(l.swap ? 'left out: ' + l.swap.note : 'left out (' + l.why + ')');
    if (l.swap && l.swap.to) sub.push('instead of ' + I[l.swap.from].name.toLowerCase() + ': ' + l.swap.note + (l.swap.unsure ? ' Check the label.' : ''));
    var nm = l.status === 'left_out' && l.swap && !l.swap.to ? I[l.swap.from].name : l.name;
    return '<li><span class="dot ' + dot + '">' + icon(ic) + '</span><span style="flex:1"><span class="amt">' + esc(l.amount) + '</span> ' + esc(nm) + (sub.length ? '<span class="sub">' + esc(sub.join(' · ')) + '</span>' : '') + '</span></li>';
  }

  /* ---------- COOKING MODE ---------- */
  function cook(rt) {
    var r = byId(rt.arg); if (!r) return notFound();
    if (!S.cook || S.cook.id !== r.id) { S.cook = { id: r.id, step: 0, people: T.peopleView && T.peopleView.id === r.id ? T.peopleView.n : S.people }; save(); }
    var p = recipePlan(r, S.cook.people), n = p.steps.length, i = Math.min(S.cook.step, n - 1), st = p.steps[i];
    var running = S.timers.filter(function (t) { return t.recipe === r.id && t.step === i && !t.done; })[0];
    var h = '<div class="cook" role="dialog" aria-modal="true" aria-label="Cooking ' + esc(r.name) + '">' +
      '<div class="cook-top"><a class="icon-btn" href="#/recipe/' + r.id + '" aria-label="Leave cooking mode">' + icon('x') + '</a><span class="title">' + esc(r.name) + ' · serves ' + S.cook.people + '</span><button class="btn btn-ghost" data-act="drawer" style="min-height:44px">Ingredients</button></div>' +
      '<div class="prog" aria-hidden="true">' + p.steps.map(function (s, k) { return '<i class="' + (k < i ? 'on' : (k === i ? 'now' : '')) + '"></i>'; }).join('') + '</div>' +
      '<div class="timers" id="cook-timers">' + timerPills(true) + '</div>' +
      '<div class="cook-main" id="cook-main"><p class="step-n" id="step-n">Step ' + (i + 1) + ' of ' + n + '</p>';
    if (i === 0) {
      var sw = p.lines.filter(function (l) { return l.swap; });
      if (sw.length) h += '<div class="note warn">' + icon('swap') + '<span>' + sw.map(function (l) { return l.swap.to ? 'Using ' + esc(l.swap.toName.toLowerCase()) + ' instead of ' + esc(I[l.swap.from].name.toLowerCase()) : 'Leaving out ' + esc(I[l.swap.from].name.toLowerCase()); }).join('. ') + '. The steps still name the original.</span></div>';
    }
    h += '<p class="step-text" aria-live="polite">' + esc(st.text) + '</p>';
    if (st.temp) h += '<div class="temp">' + icon('thermo') + '<span><b>Food safety</b>' + esc(st.temp.text) + ' <a href="' + D.TEMP_SOURCE.url + '" target="_blank" rel="noopener">USDA</a></span></div>';
    if (st.timer) h += running ? '<p class="small muted">' + icon('timer') + ' Timer running at the top. You can keep going.</p>' : '<button class="btn btn-green timer-go" data-act="start-timer" data-s="' + st.timer + '" data-l="' + esc(st.timerLabel) + '" data-step="' + i + '">' + icon('timer') + 'Start ' + fmtTime(st.timer) + ' timer</button>';
    if (i === n - 1) h += '<p class="small muted">Leftovers: refrigerate within 2 hours and reheat to 165°F (74°C). <a href="https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety" target="_blank" rel="noopener">USDA</a></p>';
    if (T.wake === 'on') h += '<p class="tiny muted">Your screen will stay on while cooking.</p>';
    h += '</div><div class="cook-nav"><button class="btn btn-ghost" data-act="step" data-d="-1" ' + (i === 0 ? 'disabled' : '') + '>' + icon('back') + 'Back</button>' +
      (i < n - 1 ? '<button class="btn btn-primary next" data-act="step" data-d="1">Next step' + icon('arrow') + '</button>' : '<button class="btn btn-green next" data-act="finish" data-id="' + r.id + '">' + icon('check') + 'Done cooking</button>') + '</div>';
    if (T.drawer) h += '<div class="scrim" data-act="drawer"></div><div class="drawer" role="dialog" aria-label="Ingredients"><div class="spread"><h2>Ingredients · serves ' + S.cook.people + '</h2><button class="icon-btn" data-act="drawer" aria-label="Close">' + icon('x') + '</button></div><ul class="ing-list">' + p.lines.filter(function (l) { return l.status !== 'left_out'; }).map(lineLi).join('') + '</ul></div>';
    return h + '</div>';
  }
  function enterCook() {
    document.body.classList.add('cooking');
    if (T.wake === null && 'wakeLock' in navigator) {
      T.wake = 'asking';
      navigator.wakeLock.request('screen').then(function (l) { T.wakeLock = l; T.wake = 'on'; l.addEventListener('release', function () { if (T.wake === 'on') T.wake = null; }); }, function () { T.wake = 'no'; });
    }
  }
  function leaveCook() {
    document.body.classList.remove('cooking'); T.drawer = false;
    if (T.wakeLock) { var l = T.wakeLock; T.wakeLock = null; T.wake = null; l.release().catch(function () {}); } else if (T.wake === 'no') T.wake = null;
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && document.body.classList.contains('cooking') && T.wake === null) enterCook(); });

  /* ---------- DONE ---------- */
  function done(rt) {
    var r = byId(rt.arg); if (!r) return notFound();
    var p = recipePlan(r, S.people), fav = S.favs.indexOf(r.id) >= 0;
    var inPantry = S.pantry.filter(function (id) { return p.finalIds.indexOf(id) >= 0 && !I[id].flags.includes('staple'); });
    var h = '<div class="narrow stack"><div class="card pad empty"><div class="art-wrap">' + ART(r, 'art') + '</div><h1 style="font-size:30px;margin-bottom:8px">Dinner’s sorted.</h1><p>Enjoy your ' + esc(r.name.toLowerCase()) + '.</p><div class="row" style="justify-content:center"><button class="btn ' + (fav ? 'btn-soft' : 'btn-primary') + '" data-act="fav" data-id="' + r.id + '" aria-pressed="' + fav + '">' + icon(fav ? 'heart-fill' : 'heart') + (fav ? 'Saved to favorites' : 'Save to favorites') + '</button></div></div>';
    if (inPantry.length && S.usePantry) {
      h += '<form class="card pad" data-form="pantry-used"><h2 style="font-size:20px">Did you use anything up?</h2><p class="small muted" style="margin:4px 0 10px">Tick only what is finished. Nothing is removed from your pantry unless you say so.</p><ul class="list-items">' +
        inPantry.map(function (id) { return '<li><input class="check" type="checkbox" id="pu-' + id + '" value="' + id + '"><label for="pu-' + id + '">' + esc(I[id].name) + '</label></li>'; }).join('') +
        '</ul><div class="row" style="margin-top:12px"><button class="btn btn-green" type="submit">Update pantry</button><button class="btn btn-ghost" type="button" data-act="keep-pantry">Keep pantry as is</button></div></form>';
    }
    h += '<div class="note">' + icon('info') + '<span>Leftovers: refrigerate within 2 hours (1 hour if it is above 90°F) and eat within 3 to 4 days. Reheat to 165°F (74°C). <a href="https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety" target="_blank" rel="noopener">USDA</a></span></div>';
    h += '<div class="row" style="justify-content:center"><a class="btn btn-ghost" href="#/">Back to start</a></div></div>';
    return h;
  }

  /* ---------- SHOPPING LIST ---------- */
  function list(rt) {
    var incoming = rt.q.get('add'), h = '<div class="narrow" style="max-width:820px"><div class="page-h"><h1>Shopping list</h1><p>Only what you add. Tick things off as you shop.</p></div>';
    if (incoming) {
      var items = E.decodeList(incoming);
      if (!items) h += '<div class="note danger" style="margin-bottom:14px">' + icon('alert') + '<span><b>This shared list link is damaged or incomplete.</b> Ask the sender to share it again. <a href="#/list">Dismiss</a></span></div>';
      else if (!items.length) h += '<div class="note" style="margin-bottom:14px">' + icon('info') + '<span>The shared list was empty. <a href="#/list">Dismiss</a></span></div>';
      else h += '<div class="card pad stack" style="margin-bottom:16px;border-color:#C6E0BF"><b>Someone shared ' + items.length + ' item' + (items.length > 1 ? 's' : '') + ' with you</b><div class="chips">' + items.map(function (x) { return '<span class="chip sm">' + esc(x.name) + (x.amount ? ' · ' + esc(x.amount) : '') + '</span>'; }).join('') + '</div><div class="row"><button class="btn btn-green" data-act="import" data-v="' + esc(incoming) + '">Add to my list</button><a class="btn btn-ghost" href="#/list">No thanks</a></div></div>';
    }
    h += '<div class="grid-2"><div class="card pad"><form class="entry-box" data-form="list-add" autocomplete="off"><label class="sr" for="list-input">Add an item</label><input id="list-input" type="text" placeholder="Add an item" maxlength="80" enterkeyhint="done" style="flex:1;min-width:0;height:50px;padding:0 14px;border-radius:14px;border:2px solid var(--line);background:var(--paper)"><button class="btn btn-green" type="submit">Add</button></form>';
    if (!S.list.length) h += '<div class="empty"><h2>Your list is empty</h2><p>When a recipe needs something you do not have, tap “Add to list” and it shows up here.</p><a class="btn btn-ghost" href="#/">Find a dinner</a></div>';
    else {
      var open = S.list.filter(function (x) { return !x.done; }), got = S.list.filter(function (x) { return x.done; });
      h += '<ul class="list-items" style="margin-top:10px">' + open.concat(got).map(function (x) { return '<li class="' + (x.done ? 'done' : '') + '"><input class="check" type="checkbox" id="li-' + x.key + '" data-act="tick" data-k="' + x.key + '" ' + (x.done ? 'checked' : '') + '><label for="li-' + x.key + '">' + esc(x.name) + (x.amount ? ' <span class="muted">· ' + esc(x.amount) + '</span>' : '') + (x.from ? '<span class="from">for ' + esc(x.from) + '</span>' : '') + '</label><button class="rm" data-act="rm-item" data-k="' + x.key + '" aria-label="Remove ' + esc(x.name) + '">' + icon('x') + '</button></li>'; }).join('') + '</ul>';
      h += '<div class="row" style="margin-top:12px">' + (got.length ? '<button class="btn btn-ghost" data-act="clear-done">Clear ' + got.length + ' ticked</button>' : '') + '<button class="link" data-act="clear-list">' + (T.clearArm === 'list' ? 'Tap again to clear everything' : 'Clear list') + '</button></div>';
    }
    h += '</div><div class="card pad stack"><h2 style="font-size:19px">Share the list</h2><p class="small muted">Send a copy to someone who is shopping. It is a copy, not a live list: if you change it, share it again.</p>' +
      '<button class="btn btn-primary btn-block" data-act="share" ' + (S.list.some(function (x) { return !x.done; }) ? '' : 'disabled') + '>' + icon('share') + 'Share list</button>' +
      '<button class="btn btn-ghost btn-block" data-act="copy-list" ' + (S.list.some(function (x) { return !x.done; }) ? '' : 'disabled') + '>Copy as text</button>' +
      '<p class="tiny muted">The shared link opens this app and asks before adding anything to their list.</p></div></div></div>';
    return h;
  }
  function addToList(r) {
    var p = recipePlan(r, T.peopleView && T.peopleView.id === r.id ? T.peopleView.n : S.people), n = 0;
    p.missing.forEach(function (l) {
      var ex = S.list.filter(function (x) { return x.id === l.id && !x.done; })[0];
      if (ex) { if (ex.from.indexOf(r.name) < 0) ex.from = ex.from ? ex.from + ', ' + r.name : r.name; return; }
      S.list.push({ key: key(), id: l.id, name: l.name, amount: l.amount, from: r.name, done: false }); n++;
    });
    save(); return n;
  }
  function key() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function shareLink() { return location.href.split('#')[0] + '#/list?add=' + E.encodeList(S.list); }

  /* ---------- FAVORITES ---------- */
  function favorites() {
    var h = '<div class="page-h"><h1>Favorites</h1><p>Meals you saved. Tap one to see what you need for it tonight.</p></div>';
    if (!S.favs.length) return h + '<div class="card pad empty">' + emptyArt() + '<h2>No favorites yet</h2><p>Tap the heart on any dinner to keep it here.</p><a class="btn btn-primary" href="#/">Find a dinner</a></div>';
    return h + '<div class="fav-grid">' + S.favs.map(function (id) {
      var r = byId(id), p = recipePlan(r, S.people);
      return '<a class="card fav-card" href="#/recipe/' + id + '">' + ART(r, 'art') + '<span><h2 class="fav-h">' + esc(r.name) + '</h2><span class="small muted">≈ ' + r.time + ' min · ' + (p.blockedBy ? '<span style="color:var(--tomato-dk)">not a match for your settings</span>' : (p.missing.length ? 'need ' + p.missing.length + ' thing' + (p.missing.length > 1 ? 's' : '') : 'you have everything')) + '</span></span></a>';
    }).join('') + '</div>';
  }

  /* ---------- PANTRY ---------- */
  function pantry() {
    var h = '<div class="narrow" style="max-width:820px"><div class="page-h"><h1>Pantry</h1><p>Optional. A rough list of things you usually have, so you do not have to type them every night. No amounts, no dates to keep up to date.</p></div>' +
      '<div class="stack">' + toggle('use-pantry', S.usePantry, 'Use my pantry when finding dinners', S.pantry.length ? S.pantry.length + ' item' + (S.pantry.length > 1 ? 's' : '') + ' saved' : 'Nothing saved yet') +
      entryBox('pantry-input', 'Add to pantry', 'add-pantry') +
      '<div class="mine">' + (S.pantry.length ? '<div class="chips">' + S.pantry.map(function (id) { return '<span class="chip have">' + esc(I[id].name) + '<button class="x" type="button" data-act="rm-pantry" data-id="' + id + '" aria-label="Remove ' + esc(I[id].name) + ' from pantry" style="border:0">' + icon('x') + '</button></span>'; }).join('') + '</div>' : '<p class="muted">Your pantry is empty. Add things like rice, pasta, canned tomatoes or soy sauce.</p>') + '</div>';
    var fromTonight = S.have.filter(function (id) { return S.pantry.indexOf(id) < 0; });
    if (fromTonight.length) h += '<button class="btn btn-soft" data-act="have-to-pantry">Save tonight’s ' + fromTonight.length + ' ingredient' + (fromTonight.length > 1 ? 's' : '') + ' here</button>';
    h += '<div class="note">' + icon('info') + '<span>Dates on packages are mostly about best quality, not a safety guarantee, and this app cannot tell whether food is still safe. Check the food and its packaging. When in doubt, throw it out. <a href="https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/food-product-dating" target="_blank" rel="noopener">USDA on date labels</a></span></div>';
    h += pickGroups(S.pantry, 'tog-pantry');
    if (S.pantry.length) h += '<p style="margin-top:16px"><button class="link" data-act="clear-pantry">' + (T.clearArm === 'pantry' ? 'Tap again to empty the pantry' : 'Empty pantry') + '</button></p>';
    return h + '</div></div>';
  }

  /* ---------- ABOUT ---------- */
  function about() {
    function st(ok, t, d) { return '<li><span class="dot ' + (ok ? 'have' : 'opt') + '" style="width:24px;height:24px;border-radius:50%;display:grid;place-items:center;flex:none">' + icon(ok ? 'check' : 'minus') + '</span><span><b>' + t + '</b><br><span class="small muted">' + d + '</span></span></li>'; }
    return '<div class="narrow about"><div class="page-h"><h1>How Dinner Sorted works</h1><p>Plain answers about what this app does and does not do.</p></div>' +
      '<ul class="status-list">' +
      st(true, 'Recipes: ' + D.RECIPES.length + ' hand-picked dinners', 'Written for this app and checked by a script for missing ingredients, timers and safety notes. Not AI-generated.') +
      st(true, 'Matching happens on your device', 'Meals that use more of your ingredients and need fewer extras come first. Nothing you type is sent anywhere.') +
      st(!!CFG.recognizeUrl, 'Photo recognition: ' + (CFG.recognizeUrl ? 'connected' : 'not connected'), CFG.recognizeUrl ? 'Suggestions from a photo are shown as “tap to confirm” and never added on their own.' : 'A photo is shown so you can tap what you see. The app does not guess ingredients from it.') +
      st(false, 'AI recipe writing: not connected', 'If it is added later, it must run on a secure server and every recipe must pass the same checks as the curated ones.') +
      st(true, 'Shared list: copies, not live sync', 'Sharing sends a copy as text or a link. It does not update on the other phone when you change yours.') +
      st(true, 'Works offline after the first visit', 'Recipes, timers and your list are saved on this device.') +
      st(storageOK, storageOK ? 'Saved on this device only' : 'Storage is blocked', storageOK ? 'No account. Clearing your browser data removes it.' : 'Your browser is blocking storage, so nothing is kept after you close this tab.') +
      '</ul><h2>Honest labels</h2><ul><li>Cooking times are estimates for a home kitchen.</li><li>$ to $$$ are rough cost guesses, not checked against any store.</li><li>Meals only list what you would need to buy. Pricier items (salmon, shrimp) are flagged and ranked lower.</li><li>Illustrations are drawings, not photos of the dish.</li></ul>' +
      '<h2>Food safety</h2><ul><li>The app never decides whether food is safe from a photo or a date label. Date labels are mostly about quality (<a href="https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/food-product-dating" target="_blank" rel="noopener">USDA</a>).</li><li>Allergies you enter remove or swap ingredients, and uncertain swaps are marked “check label”. Always check packaging: brands differ.</li><li>Cooking temperatures come from the <a href="' + D.TEMP_SOURCE.url + '" target="_blank" rel="noopener">USDA FSIS Safe Minimum Internal Temperature Chart</a>, checked November 20, 2026: chicken 165°F, ground beef 160°F, fish 145°F, egg dishes 160°F, leftovers 165°F.</li></ul>' +
      '<h2>Your data</h2><p>Everything stays in this browser. <button class="link" data-act="reset">' + (T.clearArm === 'all' ? 'Tap again to erase everything' : 'Erase all my data') + '</button></p></div>';
  }

  var VIEWS = { home: home, add: add, photo: photo, prefs: prefs, results: results, recipe: recipe, cook: cook, done: done, list: list, favorites: favorites, pantry: pantry, about: about };

  /* ---------- TIMERS ---------- */
  function timerPills(inCook) {
    return S.timers.map(function (t) {
      var left = (t.end - Date.now()) / 1000;
      return '<span class="tmr ' + (t.done ? 'done' : '') + '" data-tid="' + t.id + '"><span class="l">' + esc(t.label) + '</span><span class="t">' + (t.done ? 'Done' : fmtTime(left)) + '</span>' +
        (t.done ? '' : '<button data-act="timer-add" data-tid="' + t.id + '" aria-label="Add one minute">+1</button>') + '<button data-act="timer-stop" data-tid="' + t.id + '" aria-label="' + (t.done ? 'Dismiss timer' : 'Cancel timer') + '">' + (t.done ? 'OK' : '✕') + '</button>' +
        (!inCook && t.recipe ? '<a href="#/cook/' + t.recipe + '" style="color:inherit;font-size:13px;padding:0 8px 0 2px">Open</a>' : '') + '</span>';
    }).join('');
  }
  function renderDock() {
    var d = document.getElementById('dock');
    d.innerHTML = parse().name === 'cook' ? '' : timerPills(false);
  }
  function startTimer(secs, label, step) {
    unlockAudio();
    S.timers.push({ id: key(), label: label, end: Date.now() + secs * 1000, total: secs, recipe: S.cook && S.cook.id, step: step, done: false });
    save(); rerender();
  }
  var actx = null;
  function unlockAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { actx = null; } }
  function beep() {
    if (!actx) return;
    try { [0, 0.25].forEach(function (d) { var o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, actx.currentTime + d); g.gain.exponentialRampToValueAtTime(0.3, actx.currentTime + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d + 0.2); o.connect(g); g.connect(actx.destination); o.start(actx.currentTime + d); o.stop(actx.currentTime + d + 0.22); }); } catch (e) {}
  }
  function alarm(t) {
    if (T.alarmOn) return;
    var el = document.createElement('div'); el.className = 'alarm'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', 'Timer done');
    el.innerHTML = '<div><h2>' + esc(t.label) + ' timer is done</h2><p>Check the food.</p><button class="btn btn-big" data-act="alarm-off">OK</button></div>';
    document.body.appendChild(el); T.alarmOn = { el: el, id: t.id, n: 0 };
    el.querySelector('button').focus();
    try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (e) {}
    beep();
    T.alarmOn.iv = setInterval(function () { if (!T.alarmOn) return; T.alarmOn.n++; if (T.alarmOn.n < 30) beep(); }, 1500);
  }
  function alarmOff() { if (!T.alarmOn) return; clearInterval(T.alarmOn.iv); T.alarmOn.el.remove(); T.alarmOn = null; }
  setInterval(function () {
    var changed = false;
    S.timers.forEach(function (t) {
      if (!t.done && Date.now() >= t.end) { t.done = true; changed = true; alarm(t); }
    });
    if (changed) save();
    document.querySelectorAll('.tmr').forEach(function (el) {
      var t = S.timers.filter(function (x) { return x.id === el.dataset.tid; })[0];
      if (!t) return;
      var tt = el.querySelector('.t');
      if (t.done && !el.classList.contains('done')) changed = true;
      else if (!t.done) tt.textContent = fmtTime((t.end - Date.now()) / 1000);
    });
    if (changed) { renderDock(); var ct = document.getElementById('cook-timers'); if (ct) ct.innerHTML = timerPills(true); }
  }, 500);

  /* ---------- ACTIONS ---------- */
  var A = {
    people: function (el) { S.people = Math.max(1, Math.min(12, S.people + +el.dataset.d)); S.page = 0; save(); rerender(); },
    rpeople: function (el) { var id = parse().arg, cur = T.peopleView && T.peopleView.id === id ? T.peopleView.n : S.people; T.peopleView = { id: id, n: Math.max(1, Math.min(12, cur + +el.dataset.d)) }; rerender(); },
    time: function (el) { S.time = +el.dataset.v; S.page = 0; save(); rerender(); },
    find: function () { S.page = 0; save(); go(S.prefs.done ? '#/results' : '#/prefs?next=results'); },
    fresh: function () { S.have = []; S.custom = []; S.exclude = []; S.page = 0; save(); go('#/add'); },
    'tog-have': function (el) { tog(S.have, el.dataset.id); S.exclude = S.exclude.filter(function (x) { return x !== el.dataset.id; }); S.page = 0; save(); rerender(); },
    'rm-have': function (el) { tog(S.have, el.dataset.id); S.page = 0; save(); rerender(); },
    'rm-custom': function (el) { S.custom.splice(+el.dataset.i, 1); save(); rerender(); },
    basics: function (el) { S.basics = el.checked; S.page = 0; save(); rerender(); },
    'basics-on': function () { S.basics = true; save(); rerender(); },
    'use-pantry': function (el) { S.usePantry = el.checked; S.page = 0; save(); rerender(); },
    'photo-pick': function () { var f = document.getElementById('photo-file'); f.value = ''; f.click(); },
    'confirm-sug': function (el) { var id = el.dataset.id; if (S.have.indexOf(id) < 0) S.have.push(id); T.suggested = T.suggested.filter(function (x) { return x !== id; }); save(); rerender(); toast('Added ' + I[id].name); },
    'confirm-all': function () { T.suggested.forEach(function (id) { if (S.have.indexOf(id) < 0) S.have.push(id); }); toast('Added ' + T.suggested.length + ' ingredients'); T.suggested = []; save(); rerender(); },
    'ignore-sug': function () { T.suggested = []; rerender(); },
    'recog-retry': function () { recognize(); rerender(); },
    diet: function (el) { S.prefs.diet = el.dataset.v; save(); rerender(); },
    allergen: function (el) { tog(S.prefs.allergens, el.dataset.v); save(); rerender(); },
    equip: function (el) { var e = S.prefs.equipment; if (e.indexOf(el.dataset.v) >= 0 && e.length === 1) { toast('Keep at least one way to cook'); return; } tog(e, el.dataset.v); save(); rerender(); },
    'rm-avoid': function (el) { tog(S.prefs.avoid, el.dataset.id); save(); rerender(); },
    'rm-avoidtext': function (el) { S.prefs.avoidText.splice(+el.dataset.i, 1); save(); rerender(); },
    'prefs-done': function () { S.prefs.done = true; S.page = 0; save(); go('#/results'); },
    exclude: function (el) { tog(S.exclude, el.dataset.id); S.page = 0; save(); rerender(); },
    'clear-exclude': function () { S.exclude = []; save(); rerender(); },
    'time-any': function () { S.time = 0; save(); rerender(); },
    wide: function () { S.wide = true; save(); rerender(); },
    narrow: function () { S.wide = false; S.page = 0; save(); rerender(); },
    other: function () { S.page++; save(); rerender(); var m = document.querySelector('.meals'); if (m) m.scrollIntoView({ block: 'start', behavior: 'smooth' }); },
    fav: function (el) { var id = el.dataset.id, on = tog(S.favs, id); save(); rerender(); toast(on ? 'Saved to favorites' : 'Removed from favorites'); },
    'to-list': function (el) { var n = addToList(byId(el.dataset.id)); updateCount(); toast(n ? 'Added ' + n + ' item' + (n > 1 ? 's' : '') + ' to your list' : 'Already on your list'); },
    drawer: function () { T.drawer = !T.drawer; rerender(); },
    step: function (el) { var r = byId(S.cook.id), n = r.steps.length; S.cook.step = Math.max(0, Math.min(n - 1, S.cook.step + +el.dataset.d)); save(); rerender(); var m = document.getElementById('cook-main'); if (m) m.scrollTop = 0; },
    'start-timer': function (el) { startTimer(+el.dataset.s, el.dataset.l, +el.dataset.step); },
    'timer-add': function (el) { S.timers.forEach(function (t) { if (t.id === el.dataset.tid) t.end += 60000; }); save(); },
    'timer-stop': function (el) { S.timers = S.timers.filter(function (t) { return t.id !== el.dataset.tid; }); if (T.alarmOn && T.alarmOn.id === el.dataset.tid) alarmOff(); save(); rerender(); },
    'alarm-off': function () { var id = T.alarmOn && T.alarmOn.id; alarmOff(); S.timers = S.timers.filter(function (t) { return t.id !== id; }); save(); rerender(); },
    finish: function (el) { var id = el.dataset.id; S.cooked.unshift({ id: id, at: Date.now() }); S.cooked = S.cooked.slice(0, 50); S.timers = S.timers.filter(function (t) { return t.recipe !== id; }); S.cook = null; T.peopleView = null; save(); go('#/done/' + id); },
    'keep-pantry': function () { toast('Pantry kept as is'); go('#/'); },
    tick: function (el) { S.list.forEach(function (x) { if (x.key === el.dataset.k) x.done = el.checked; }); save(); rerender(); },
    'rm-item': function (el) { S.list = S.list.filter(function (x) { return x.key !== el.dataset.k; }); save(); rerender(); },
    'clear-done': function () { S.list = S.list.filter(function (x) { return !x.done; }); save(); rerender(); },
    'clear-list': function () { if (arm('list')) { S.list = []; save(); toast('List cleared'); } rerender(); },
    share: function () {
      var text = E.listText(S.list), link = shareLink();
      if (navigator.share) navigator.share({ title: 'Shopping list', text: text + '\n\nAdd it to Dinner Sorted: ' + link }).catch(function (e) { if (e && e.name !== 'AbortError') A['copy-link'](); });
      else A['copy-link']();
    },
    'copy-link': function () { copyText(E.listText(S.list) + '\n\nAdd it to Dinner Sorted: ' + shareLink()).then(function (ok) { toast(ok ? 'Copied list and link. Paste it in a message.' : 'Could not copy. Your browser blocked it.'); }); },
    'copy-list': function () { copyText(E.listText(S.list)).then(function (ok) { toast(ok ? 'List copied' : 'Could not copy. Your browser blocked it.'); }); },
    import: function (el) { var items = E.decodeList(el.dataset.v) || [], n = 0; items.forEach(function (x) { if (!S.list.some(function (y) { return !y.done && y.name.toLowerCase() === x.name.toLowerCase(); })) { S.list.push({ key: key(), id: x.id, name: x.name, amount: x.amount, from: x.from, done: false }); n++; } }); save(); toast(n ? 'Added ' + n + ' item' + (n > 1 ? 's' : '') : 'You already had all of these'); go('#/list'); },
    'tog-pantry': function (el) { tog(S.pantry, el.dataset.id); save(); rerender(); },
    'rm-pantry': function (el) { tog(S.pantry, el.dataset.id); save(); rerender(); },
    'have-to-pantry': function () { S.have.forEach(function (id) { if (S.pantry.indexOf(id) < 0) S.pantry.push(id); }); save(); toast('Saved to pantry'); rerender(); },
    'clear-pantry': function () { if (arm('pantry')) { S.pantry = []; save(); toast('Pantry emptied'); } rerender(); },
    reset: function () { if (arm('all')) { try { localStorage.removeItem(KEY); } catch (e) {} S = defaults(); save(); toast('All data erased'); go('#/'); return; } rerender(); },
    reload: function () { location.reload(); }
  };
  function tog(arr, v) { var i = arr.indexOf(v); if (i >= 0) { arr.splice(i, 1); return false; } arr.push(v); return true; }
  function arm(what) { if (T.clearArm === what) { T.clearArm = null; return true; } T.clearArm = what; setTimeout(function () { if (T.clearArm === what) { T.clearArm = null; rerender(); } }, 4000); return false; }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'INPUT') return;
    var fn = A[el.dataset.act]; if (!fn) return;
    e.preventDefault(); fn(el, e);
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.id === 'photo-file') { onPhoto(el.files && el.files[0]); return; }
    if (el.tagName === 'INPUT' && el.dataset.act && A[el.dataset.act]) A[el.dataset.act](el, e);
  });
  document.addEventListener('submit', function (e) {
    var f = e.target, kind = f.dataset.form; if (!kind) return;
    e.preventDefault();
    var inp = f.querySelector('input[type=text]');
    var sel = f.parentNode.querySelector('.sugg:not([hidden]) button.on');
    var val = sel ? sel.dataset.text : (inp ? inp.value.trim() : '');
    if (kind === 'pantry-used') {
      var used = Array.prototype.map.call(f.querySelectorAll('input:checked'), function (x) { return x.value; });
      S.pantry = S.pantry.filter(function (id) { return used.indexOf(id) < 0; });
      save(); toast(used.length ? 'Removed ' + used.length + ' from your pantry' : 'Pantry kept as is'); go('#/'); return;
    }
    if (!val) { if (inp) inp.focus(); return; }
    var res;
    if (kind === 'add-typed') {
      res = addTyped(val, S.have);
      res.unknown.forEach(function (u) { if (S.custom.indexOf(u) < 0 && S.custom.length < 20) S.custom.push(u); });
      S.page = 0; save(); T.focus = 'ing-input'; rerender();
      toast(res.added.length ? 'Added ' + joinNice(res.added) : (res.unknown.length ? 'Added “' + res.unknown[0] + '” (not in our recipes yet)' : 'Already on your list'));
    } else if (kind === 'add-pantry') {
      res = addTyped(val, S.pantry); save(); T.focus = 'pantry-input'; rerender();
      toast(res.added.length ? 'Added ' + joinNice(res.added) : (res.unknown.length ? 'We do not know “' + res.unknown[0] + '” yet' : 'Already in your pantry'));
    } else if (kind === 'add-avoid') {
      res = addTyped(val, S.prefs.avoid);
      res.unknown.forEach(function (u) { if (S.prefs.avoidText.indexOf(u) < 0) S.prefs.avoidText.push(u); });
      save(); T.focus = 'avoid-input'; rerender();
    } else if (kind === 'list-add') {
      S.list.push({ key: key(), id: E.normalize(val) || '', name: val.slice(0, 80), amount: '', from: '', done: false }); save(); T.focus = 'list-input'; rerender();
    }
  });
  // autocomplete
  document.addEventListener('input', function (e) {
    var inp = e.target; if (inp.getAttribute('role') !== 'combobox') return;
    var box = document.getElementById(inp.id + '-sugg'), q = inp.value, last = E.splitList(q).pop() || '';
    var ids = /[,;]$/.test(q.trim()) ? [] : E.suggest(last, 6).filter(function (id) { return !isSwapOnly(id); });
    if (!ids.length || !last) { box.hidden = true; inp.setAttribute('aria-expanded', 'false'); return; }
    var prefix = q.slice(0, q.length - last.length);
    box.innerHTML = ids.map(function (id, i) { return '<button type="button" role="option" id="' + inp.id + '-o' + i + '" data-pick="' + id + '" data-text="' + esc(prefix + I[id].name) + '">' + esc(I[id].name) + '<small>' + esc(({ protein: 'protein', carb: 'carbs', veg: 'veg', dairy: 'dairy', pantry: 'pantry', spice: 'spice', basic: 'basic' })[I[id].cat]) + '</small></button>'; }).join('');
    box.hidden = false; inp.setAttribute('aria-expanded', 'true');
  });
  document.addEventListener('keydown', function (e) {
    var inp = e.target;
    if (inp.getAttribute && inp.getAttribute('role') === 'combobox' && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Escape')) {
      var box = document.getElementById(inp.id + '-sugg'); if (box.hidden) return;
      var bs = Array.prototype.slice.call(box.querySelectorAll('button')), i = bs.findIndex(function (b) { return b.classList.contains('on'); });
      if (e.key === 'Escape') { box.hidden = true; inp.setAttribute('aria-expanded', 'false'); return; }
      e.preventDefault(); bs.forEach(function (b) { b.classList.remove('on'); });
      i = e.key === 'ArrowDown' ? Math.min(bs.length - 1, i + 1) : Math.max(-1, i - 1);
      if (i >= 0) { bs[i].classList.add('on'); inp.setAttribute('aria-activedescendant', bs[i].id); } else inp.removeAttribute('aria-activedescendant');
      return;
    }
    if (parse().name === 'cook' && !e.target.closest('input') && S.cook) {
      if (e.key === 'ArrowRight') { var nb = document.querySelector('.cook-nav .next[data-act=step]'); if (nb) nb.click(); }
      if (e.key === 'ArrowLeft') { var bb = document.querySelector('.cook-nav [data-d="-1"]'); if (bb && !bb.disabled) bb.click(); }
      if (e.key === 'Escape' && T.drawer) A.drawer();
    }
  });
  document.addEventListener('mousedown', function (e) { if (e.target.closest('[data-pick]')) e.preventDefault(); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pick]'); if (!b) { document.querySelectorAll('.sugg').forEach(function (s) { if (!s.parentNode.contains(e.target)) s.hidden = true; }); return; }
    var box = b.parentNode, inp = document.getElementById(box.id.replace(/-sugg$/, ''));
    box.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
    inp.form.requestSubmit ? inp.form.requestSubmit() : inp.form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });
  // swipe between cooking steps
  var tx0 = null, ty0 = null;
  document.addEventListener('touchstart', function (e) { if (parse().name !== 'cook' || T.drawer) return; tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (tx0 === null) return; var dx = e.changedTouches[0].clientX - tx0, dy = e.changedTouches[0].clientY - ty0; tx0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50 && !e.target.closest('button,a')) { var b = dx < 0 ? document.querySelector('.cook-nav .next[data-act=step]') : document.querySelector('.cook-nav [data-d="-1"]'); if (b && !b.disabled) b.click(); }
  }, { passive: true });

  window.addEventListener('hashchange', route);
  window.addEventListener('error', function (e) { if (!view.querySelector('.recipe, .meals, .hero, .cook, .page-h')) view.innerHTML = errorCard(); });
  showBanners();
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
  window.DSApp = { get state() { return S; }, T: T };
})();
