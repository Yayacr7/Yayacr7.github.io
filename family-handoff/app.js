/* Family Handoff UI (local demonstration mode). All changes go through
 * FHCore.dispatch inside FHStore.transact, never by editing state directly. */
(function () {
  'use strict';
  const C = window.FHCore, S = window.FHStore, D = window.FHDemo;
  const $ = (q, el) => (el || document).querySelector(q);
  const $$ = (q, el) => Array.from((el || document).querySelectorAll(q));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let state = S.load();
  let actor = S.getActor();
  let flash = null;          // {kind, text} shown once at the top of the view
  let calMonth = null, calDay = null, handoffTab = 'forYou';
  let staleRemote = false;   // a change came in while a form was being edited

  const view = $('#view'), top = $('#top'), tabs = $('#tabs');
  const today = () => C.dateStr(new Date());
  const me = () => (state ? C.member(state, actor) : null);
  const kids = m => m && m.role === 'child';

  /* ---------- icons ---------- */
  const I = {
    unassigned: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2.4"/></svg>',
    awaiting: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 4.6V8l2.4 1.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    accepted: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="m4.8 8.2 2.2 2.1 4.2-4.4" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    completed: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="m2.5 8.5 3 3 7-7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cancelled: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    bell: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    today: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5V20H4z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.9"/></svg>',
    cal: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 10h17M8 3v4m8-4v4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    plus: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>',
    hand: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h12m-3-3 3 3-3 3M20 15H8m3-3-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    home: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="3.2" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="16.5" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 19c.8-3.4 3-5 5.5-5s4.7 1.6 5.5 5M14.5 14.4c2.6-.5 5 .9 6 4.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    logo: '<svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#5B2A86"/><circle cx="23" cy="25" r="8" fill="#F0644B"/><circle cx="41" cy="25" r="8" fill="#35BF98"/><path d="M14 46c2-7 7-10 13-10m23 10c-2-7-7-10-13-10" stroke="#FFF9F3" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M26 44h12m-4-4 4 4-4 4" stroke="#FFF9F3" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  };

  /* ---------- small pieces ---------- */
  function av(id, size) {
    const m = C.member(state, id);
    const cls = 'av' + (size ? ' ' + size : '');
    if (!m) return '<span class="' + cls + ' open" aria-hidden="true">?</span>';
    return '<span class="' + cls + '" style="background:' + m.color + '" aria-hidden="true">' + esc(m.name.trim()[0].toUpperCase()) + '</span>';
  }
  function avOpen(size) { return '<span class="av ' + (size || '') + ' open" aria-hidden="true">?</span>'; }
  function pill(st) { return '<span class="pill p-' + st + '">' + I[st] + C.STATUS_LABEL[st] + '</span>'; }
  function nm(id) { return id === actor ? 'You' : C.name(state, id); }
  function ago(ms) {
    const m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    const d = new Date(ms); return C.fmtDay(C.dateStr(d), today()) + ', ' + C.fmtTime(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
  }
  function whoLine(t) {
    const st = C.statusOf(t);
    if (st === 'unassigned') return pill(st);
    if (st === 'awaiting') return pill(st) + '<span class="av pending" style="background:' + (C.member(state, t.offer.to) || {}).color + '" aria-hidden="true">' + esc(C.name(state, t.offer.to)[0]) + '</span><span>' + (t.offer.to === actor ? 'Asked you' : 'Asked ' + esc(C.name(state, t.offer.to))) + '</span>';
    if (st === 'accepted') return pill(st) + av(t.ownerId) + '<span>' + (t.ownerId === actor ? 'You' : esc(C.name(state, t.ownerId))) + (t.offer ? ' · handing off to ' + esc(nm(t.offer.to).replace('You', 'you')) : '') + '</span>';
    if (st === 'completed') return pill(st) + av(t.ownerId) + '<span>' + (t.ownerId === actor ? 'You' : esc(C.name(state, t.ownerId))) + '</span>';
    return pill(st);
  }
  function card(t, opts) {
    opts = opts || {};
    const st = C.statusOf(t);
    const timeTxt = opts.showDay ? C.fmtDay(t.date, today()) + (t.time ? '<br>' + C.fmtTime(t.time) : '') : (t.time ? C.fmtTime(t.time) : 'Any time');
    return '<div class="card st-' + st + (opts.ask ? ' ask' : '') + '" data-task="' + t.id + '">' +
      '<a class="stretch" href="#/task/' + t.id + '" aria-label="' + esc(t.title + ', ' + C.when(t, today()) + ', ' + C.STATUS_LABEL[st]) + '"></a>' +
      '<div class="time">' + timeTxt + '</div><div class="body">' +
      (opts.ask ? '<div class="from">' + esc(C.name(state, t.offer.from)) + ' asked you' + (t.ownerId && t.ownerId !== actor ? ' to take over from ' + esc(C.name(state, t.ownerId)) : '') + '</div>' : '') +
      '<div class="title">' + esc(t.title) + '</div>' +
      (opts.ask ? '' : '<div class="who">' + whoLine(t) + '</div>') +
      (opts.ask && t.offer.note ? '<div class="quote">“' + esc(t.offer.note) + '”</div>' : '') +
      (opts.acts || '') + '</div></div>';
  }
  function askActs(t) {
    const series = t.seriesId ? state.tasks.filter(x => x.seriesId === t.seriesId && x.offer && x.offer.to === actor && x.date >= t.date && !x.completedAt && !x.cancelledAt).length : 0;
    return '<div class="acts"><button class="btn mint sm" data-act="accept" data-id="' + t.id + '" data-rev="' + t.rev + '">Accept</button>' +
      (series > 1 ? '<button class="btn sm" data-act="acceptAll" data-id="' + t.id + '" data-rev="' + t.rev + '">Accept all ' + series + '</button>' : '') +
      '<button class="btn coral sm" data-act="decline" data-id="' + t.id + '" data-rev="' + t.rev + '">I can\'t</button></div>';
  }
  function openActs(t) {
    const m = me();
    const canTake = !(C.KINDS[t.kind].needsGrownup && m.role === 'child');
    return '<div class="acts">' + (canTake ? '<button class="btn primary sm" data-act="claim" data-id="' + t.id + '" data-rev="' + t.rev + '">I\'ll take it</button>' : '') +
      (C.canOffer(m, t) ? '<button class="btn sm" data-act="offer" data-id="' + t.id + '" data-rev="' + t.rev + '">Ask someone</button>' : '') + '</div>';
  }
  function flashHtml() {
    if (!flash) return '';
    const f = flash; flash = null;
    return '<div class="banner ' + (f.kind || 'info') + '" role="alert">' + esc(f.text) + '</div>';
  }
  function say(text, bad) {
    $('#live').textContent = text;
    const old = $('.toast'); if (old) old.remove();
    const el = document.createElement('div'); el.className = 'toast' + (bad ? ' bad' : ''); el.textContent = text; el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el); setTimeout(() => el.remove(), bad ? 6000 : 3800);
  }

  /* ---------- actions ---------- */
  async function act(action, okText) {
    const r = await S.transact(latest => latest ? C.dispatch(latest, actor, action) : { ok: false, code: 'no_household', error: 'This household was reset.' });
    state = S.load() || state;
    // State is now the latest, so close any open sheet without a second redraw
    // (a second redraw would hide the warning below).
    const sc = $('#scrim'); if (sc) sc.remove();
    const pl = $('.refresh-pill'); if (pl) pl.remove();
    staleRemote = false;
    if (r.ok) { if (okText) say(typeof okText === 'function' ? okText(r) : okText); }
    else {
      // Never leave an older "Saved" toast next to a "Not saved" warning.
      const old = $('.toast'); if (old) old.remove();
      flash = { kind: 'warn', text: (r.code === 'conflict' ? 'Not saved. ' : '') + r.error };
      $('#live').textContent = flash.text;
    }
    render();
    return r;
  }

  /* ---------- sheet (bottom dialog) ---------- */
  let lastFocus = null;
  function sheet(html, onSubmit) {
    closeSheet();
    lastFocus = document.activeElement;
    const sc = document.createElement('div');
    sc.className = 'scrim'; sc.id = 'scrim';
    sc.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-title"><form id="sh-form" data-hold="1">' + html + '</form></div>';
    document.body.appendChild(sc);
    sc.addEventListener('click', e => { if (e.target === sc || e.target.closest('[data-close]')) closeSheet(); });
    sc.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSheet();
      if (e.key === 'Tab') {
        const f = $$('button,input,select,textarea,a[href]', sc).filter(x => !x.disabled && x.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    const form = $('#sh-form');
    form.addEventListener('submit', async e => { e.preventDefault(); if (onSubmit) { const keep = await onSubmit(new FormData(form), form); if (keep !== true) closeSheet(); } });
    const first = $('input:not([type=hidden]):not([disabled]),select,textarea,button[type=submit]', form);
    if (first) first.focus();
  }
  function closeSheet() {
    const sc = $('#scrim'); if (!sc) return;
    sc.remove();
    if (staleRemote) applyRemote();
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function personPicker(t, nameAttr, opts) {
    opts = opts || {};
    const rows = state.members.filter(m => m.id !== actor && !(t && t.ownerId === m.id) && !(opts.exclude || []).includes(m.id)).map(m => {
      const blocked = t && C.KINDS[t.kind].needsGrownup && m.role === 'child';
      return '<label class="person"><input type="radio" name="' + nameAttr + '" value="' + m.id + '"' + (blocked ? ' disabled' : '') + '><span class="pc">' + av(m.id) + '<span><b>' + esc(m.name) + '</b><small>' + (blocked ? 'Not for pickups' : C.ROLES[m.role].short) + '</small></span></span></label>';
    });
    const invited = state.invites.filter(i => i.status === 'pending').map(i =>
      '<label class="person"><input type="radio" name="' + nameAttr + '" value="' + i.id + '" disabled><span class="pc">' + avOpen() + '<span><b>' + esc(i.name) + '</b><small>Invited, not joined</small></span></span></label>');
    return rows.concat(invited).join('');
  }

  function offerSheet(t) {
    sheet('<h2 id="sh-title">' + (t.ownerId ? 'Ask someone to take over' : 'Ask someone to take it') + '</h2>' +
      '<p class="muted small">' + esc(t.title) + ' · ' + esc(C.when(t, today())) + '</p>' +
      (t.ownerId ? '<div class="banner info small">' + esc(nm(t.ownerId)) + (t.ownerId === actor ? ' stay' : ' stays') + ' responsible until the new person accepts.</div>' : '') +
      '<div class="field"><span class="legend" id="lg-to">Who?</span><div class="people" role="radiogroup" aria-labelledby="lg-to">' + personPicker(t, 'to') + '</div></div>' +
      '<label class="field"><span>Note (optional)</span><input type="text" name="note" maxlength="140" placeholder="e.g. I have a late meeting"></label>' +
      '<div class="err" id="sh-err" role="alert"></div>' +
      '<div class="btnrow"><button class="btn primary" type="submit">Send request</button><button class="btn" type="button" data-close>Back</button></div>',
      async (fd, form) => {
        const to = fd.get('to');
        if (!to) { $('#sh-err', form).textContent = 'Pick a person.'; return true; }
        await act({ type: 'offer', taskId: t.id, rev: t.rev, to, note: fd.get('note') }, 'Asked ' + C.name(state, to) + '. It is not theirs until they accept.');
      });
  }
  function reasonSheet(t, type) {
    const title = type === 'decline' ? 'Say no to this' : 'You can\'t do it anymore';
    const help = type === 'decline'
      ? (t.ownerId ? esc(C.name(state, t.ownerId)) + ' stays responsible. They will see your answer.' : 'It goes back to "Still needs someone" and ' + esc(C.name(state, t.offer.from)) + ' will see your answer.')
      : 'It goes to "Still needs someone" so the household can see it needs a person.';
    sheet('<h2 id="sh-title">' + title + '</h2><p class="muted small">' + esc(t.title) + ' · ' + esc(C.when(t, today())) + '</p>' +
      '<p class="small">' + help + '</p>' +
      '<label class="field"><span>Reason (optional)</span><input type="text" name="reason" maxlength="140" placeholder="e.g. I am at work until 6"></label>' +
      '<div class="btnrow"><button class="btn coral" type="submit">' + (type === 'decline' ? 'Send "I can\'t"' : 'I can\'t do it') + '</button><button class="btn" type="button" data-close>Back</button></div>',
      async fd => { await act({ type, taskId: t.id, rev: t.rev, reason: fd.get('reason') }, type === 'decline' ? 'Answer sent. Thanks for saying so early.' : 'Marked as needing someone.'); });
  }
  function switchSheet() {
    sheet('<h2 id="sh-title">Who is using this?</h2>' +
      '<p class="muted small">Demo only. In a real version each person signs in on their own phone and only sees what their role allows. Tip: open this page in a second tab and pick someone else to try two people at once.</p>' +
      '<div class="people" style="margin-top:12px">' + state.members.map(m =>
        '<label class="person"><input type="radio" name="who" value="' + m.id + '"' + (m.id === actor ? ' checked' : '') + '><span class="pc">' + av(m.id) + '<span><b>' + esc(m.name) + '</b><small>' + C.ROLES[m.role].label + '</small></span></span></label>').join('') + '</div>' +
      '<div class="btnrow"><button class="btn primary" type="submit">Switch</button><button class="btn" type="button" data-close>Back</button></div>',
      fd => { const w = fd.get('who'); if (w) { actor = w; S.setActor(w); say('Now viewing as ' + C.name(state, w) + '.'); location.hash = '#/today'; render(); } });
  }
  function demoSheet() {
    sheet('<h2 id="sh-title">Local demo mode</h2>' +
      '<ul class="small" style="padding-left:18px;margin:10px 0 0">' +
      '<li>Everything is saved only in this browser on this device. Nothing is sent to a server, and other phones cannot see it.</li>' +
      '<li>There is no real sign-in. "Viewing as" lets you switch person to see each role. A real version needs accounts, so nobody can act as someone else.</li>' +
      '<li>Invite codes only work in this browser.</li>' +
      '<li>Reminders show inside the app while it is open. It cannot send phone notifications.</li>' +
      '<li>Two tabs of this browser do sync, with conflict checks, so you can try two people at once.</li></ul>' +
      '<p class="small" style="margin-top:12px"><a href="#/about">What a real shared version needs</a></p>' +
      '<div class="btnrow"><button class="btn primary" type="button" data-close>Got it</button></div>');
  }

  /* ---------- screens ---------- */
  function renderTop() {
    const m = me();
    const unread = state.notes.filter(n => n.to === actor && !n.read).length;
    top.hidden = false;
    top.innerHTML = '<a class="brandmark" href="#/today" aria-label="Family Handoff, today">' + I.logo + '</a>' +
      '<div class="grow"><div style="font-weight:700;font-size:15px">Family Handoff</div><div class="hh">' + esc(state.household.name) + '</div></div>' +
      '<a class="iconbtn" href="#/inbox" aria-label="Notifications' + (unread ? ', ' + unread + ' new' : '') + '">' + I.bell + (unread ? '<span class="dot">' + unread + '</span>' : '') + '</a>' +
      '<button class="who-btn" id="who" type="button" aria-label="Viewing as ' + esc(m.name) + ', switch person">' + av(m.id) + '<span><span class="n">' + esc(m.name) + '</span><small>Switch</small></span></button>';
  }
  function renderTabs(route) {
    const m = me();
    const pend = C.pendingHandoffs(state, actor).forYou.length;
    const items = [['today', 'Today', I.today], ['calendar', 'Calendar', I.cal]];
    if (C.canCreate(m)) items.push(['add', 'Add', I.plus]);
    items.push(['handoffs', 'Handoffs', I.hand], ['household', kids(m) ? 'Me' : 'Household', I.home]);
    tabs.hidden = false;
    tabs.innerHTML = '<div class="in">' + items.map(([k, label, ic]) => {
      const cur = route === k || (k === 'household' && ['settings', 'plans', 'about', 'inbox'].includes(route));
      if (k === 'add') return '<a href="#/add" class="add"' + (cur ? ' aria-current="page"' : '') + '><span class="plus">' + ic + '</span>' + label + '</a>';
      return '<a href="#/' + k + '"' + (cur ? ' aria-current="page"' : '') + '>' + ic + label + (k === 'handoffs' && pend ? '<span class="badge" aria-label="' + pend + ' waiting for you">' + pend + '</span>' : '') + '</a>';
    }).join('') + '</div>';
  }

  function viewToday() {
    const m = me(), t0 = today();
    const p = C.todayPlan(state, actor, t0);
    const d = new Date();
    const dateLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    let headline;
    if (kids(m)) headline = p.today.filter(t => C.statusOf(t) === 'accepted').length ? 'Here is what you said you would do today.' : 'Nothing for you today.';
    else if (p.counts.needs) headline = p.counts.needs === 1 ? '1 thing today still needs someone.' : p.counts.needs + ' things today still need someone.';
    else if (p.counts.waiting) headline = 'Everything today has someone asked. ' + p.counts.waiting + ' still waiting for an answer.';
    else if (p.today.length) headline = 'Everything today has someone.';
    else headline = 'Nothing planned for today yet.';
    const rem = C.reminders(state, actor, Date.now());
    let h = '<h1>Hi ' + esc(m.name) + '</h1><p class="date">' + esc(dateLabel) + '</p>' + flashHtml() +
      '<p class="lede" id="headline">' + esc(headline) + '</p>';
    if (!kids(m)) h += '<div class="tiles" aria-label="Today at a glance">' +
      '<a class="tile t-open" href="#needs"><b>' + p.counts.needs + '</b><span>Still needs someone</span></a>' +
      '<a class="tile t-wait" href="#/handoffs"><b>' + p.counts.waiting + '</b><span>Waiting for an answer</span></a>' +
      '<a class="tile t-ok" href="#todaylist"><b>' + p.counts.covered + '</b><span>Covered' + (p.counts.done ? ' · ' + p.counts.done + ' done' : '') + '</span></a></div>';
    rem.forEach(r => { h += '<div class="banner gentle' + (r.open ? ' open' : '') + '">' + esc(r.text) + ' <a href="#/task/' + r.taskId + '">Open</a></div>'; });
    if (p.forYou.length) h += '<h2>Asked of you <span class="count">' + p.forYou.length + '</span></h2><div class="list">' + p.forYou.map(t => card(t, { ask: true, showDay: true, acts: askActs(t) })).join('') + '</div>';
    if (!kids(m)) {
      h += '<h2 id="needs">Still needs someone <span class="count">' + p.stillNeeds.length + '</span></h2>';
      h += p.stillNeeds.length ? '<div class="list">' + p.stillNeeds.map(t => card(t, { showDay: true, acts: openActs(t) })).join('') + '</div>' : '<div class="empty">Everything in the next 7 days has someone or has been asked.</div>';
    }
    h += '<h2 id="todaylist">Today <span class="count">' + p.today.length + '</span></h2>';
    h += p.today.length ? '<div class="list">' + p.today.map(t => card(t)).join('') + '</div>' : '<div class="empty">' + (C.canCreate(m) ? 'Nothing today. <a href="#/add">Add a responsibility</a>' : 'Nothing for you today.') + '</div>';
    return h;
  }

  function viewTask(id) {
    const t = state.tasks.find(x => x.id === id);
    const m = me();
    if (!t || !C.canView(state, m, t)) return '<a class="back" href="#/today">← Today</a>' + flashHtml() + '<div class="empty" style="margin-top:12px">This responsibility is not available. It may have been removed, or it is not shared with your role.</div>';
    const st = C.statusOf(t);
    const live = st !== 'completed' && st !== 'cancelled';
    const acts = [];
    const btn = (a, label, cls) => acts.push('<button class="btn ' + (cls || '') + '" data-act="' + a + '" data-id="' + t.id + '" data-rev="' + t.rev + '">' + label + '</button>');
    if (live) {
      if (t.offer && t.offer.to === actor) {
        btn('accept', 'Accept', 'mint');
        const n = t.seriesId ? state.tasks.filter(x => x.seriesId === t.seriesId && x.offer && x.offer.to === actor && x.date >= t.date && !x.completedAt && !x.cancelledAt).length : 0;
        if (n > 1) btn('acceptAll', 'Accept all ' + n + ' dates');
        btn('decline', 'I can\'t', 'coral');
      } else if (st === 'unassigned') {
        if (!(C.KINDS[t.kind].needsGrownup && m.role === 'child')) btn('claim', 'I\'ll take it', 'primary');
        if (C.canOffer(m, t)) btn('offer', 'Ask someone');
        if (!(C.KINDS[t.kind].needsGrownup && m.role === 'child')) btn('complete', 'Already done');
      } else if (st === 'accepted') {
        if (t.ownerId === actor) btn('complete', 'Mark done', 'mint');
        else if (C.isAdult(m)) btn('complete', 'Mark done for ' + esc(C.name(state, t.ownerId)));
        if (C.canOffer(m, t)) btn('offer', t.offer ? 'Ask someone else' : (t.ownerId === actor ? 'Hand it off' : 'Suggest someone else'));
        if (t.ownerId === actor) btn('release', 'I can\'t do it', 'coral');
        else if (C.isAdult(m)) btn('release', esc(C.name(state, t.ownerId)) + ' can\'t', 'coral');
      }
      if (t.offer && t.offer.to !== actor && (C.isAdult(m) || t.offer.from === actor || t.ownerId === actor)) btn('withdraw', 'Withdraw request', 'ghost');
      if (C.canEdit(m, t)) { btn('edit', 'Edit', 'ghost'); btn('cancel', 'Cancel it', 'ghost'); }
    } else if (st === 'completed' && (t.ownerId === actor || C.isAdult(m))) btn('reopen', 'Not done after all', 'ghost');

    let statusAv;
    if (st === 'unassigned') statusAv = avOpen('lg');
    else if (st === 'awaiting') statusAv = av(t.offer.to, 'lg pending');
    else if (t.offer) statusAv = av(t.ownerId, 'lg') + '<span class="arrow" aria-hidden="true">→</span>' + av(t.offer.to, 'lg pending');
    else statusAv = av(t.ownerId, 'lg');

    const touch = live && (C.isAdult(m) || t.ownerId === actor || (t.offer && t.offer.to === actor) || t.createdBy === actor);
    let h = '<a class="back" href="#/today">← Today</a>' + flashHtml() +
      '<div style="margin-top:6px"><span class="kind">' + esc(C.KINDS[t.kind].short) + '</span></div>' +
      '<h1 id="task-title">' + esc(t.title) + '</h1>' +
      '<p class="date">' + esc(C.when(t, today())) + (t.repeat !== 'none' ? ' · ' + esc(C.REPEATS[t.repeat]) : '') + '</p>' +
      '<section class="status st-' + st + '" aria-labelledby="st-say"><div class="row">' + statusAv + '<div><div class="say" id="st-say">' + esc(C.statusSentence(state, t, actor)) + '</div>' +
      (t.offer ? '<div class="small muted">Asked by ' + esc(nm(t.offer.from)) + ' ' + ago(t.offer.at) + '</div>' : '') + '</div></div>' +
      (t.offer && t.offer.note ? '<div class="quote">“' + esc(t.offer.note) + '”</div>' : '') +
      (t.offer ? '<p class="note">A request is not an acceptance. A notification does not show that someone saw it. Only their answer counts.</p>' : '') +
      (acts.length ? '<div class="btnrow">' + acts.join('') + '</div>' : '') + '</section>';
    if (t.details) h += '<div class="panel"><h2 class="ph">Details</h2><div class="details">' + esc(t.details) + '</div></div>';
    h += '<div class="panel"><h2 class="ph">Checklist</h2>' + (t.checklist.length ? t.checklist.map(c =>
      '<label class="check' + (c.done ? ' done' : '') + '"><input type="checkbox" data-check="' + c.id + '" data-id="' + t.id + '"' + (c.done ? ' checked' : '') + (touch ? '' : ' disabled') + '><span>' + esc(c.text) + '</span>' + (c.done && c.by ? '<span class="by">' + esc(nm(c.by)) + '</span>' : '') + '</label>').join('') : '<p class="muted small" style="margin:0">No checklist.</p>') +
      (touch ? '<form class="two" id="add-check" style="margin-top:10px;grid-template-columns:1fr auto"><input type="text" name="text" maxlength="80" placeholder="Add an item" aria-label="New checklist item"><button class="btn sm" type="submit">Add</button></form>' : '') + '</div>';
    h += '<div class="panel"><h2 class="ph">Files</h2><div class="files">' + (t.attachments.length ? t.attachments.map(f =>
      '<div class="file">' + (f.mime.startsWith('image/') && f.data ? '<img src="' + esc(f.data) + '" alt="">' : '<span class="ico">PDF</span>') +
      '<div style="flex:1;min-width:0"><a href="' + esc(f.data) + '" download="' + esc(f.name) + '" style="overflow-wrap:anywhere">' + esc(f.name) + '</a><div class="small muted">' + Math.max(1, Math.round(f.size / 1024)) + ' KB · ' + esc(nm(f.by)) + '</div></div>' +
      ((C.isAdult(m) || f.by === actor) ? '<button class="btn ghost sm" data-act="rmfile" data-id="' + t.id + '" data-file="' + f.id + '" aria-label="Remove ' + esc(f.name) + '">Remove</button>' : '') + '</div>').join('') : '<p class="muted small" style="margin:0">No files. Optional: a photo of the slip, a map, a PDF.</p>') + '</div>' +
      (touch && t.attachments.length < 3 ? '<label class="btn sm" style="margin-top:10px">Attach a photo or PDF<input type="file" id="attach" data-id="' + t.id + '" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" class="sr"></label><p class="note">Demo mode keeps files in this browser only (up to 400 KB each, 3 per item).</p>' : '') + '</div>';
    h += '<div class="panel"><h2 class="ph">History</h2><ol class="hist" reversed>' + t.history.slice().reverse().map(e =>
      '<li class="t-' + e.type + '">' + av(e.by) + '<div><div>' + esc(e.text) + '</div><time datetime="' + new Date(e.at).toISOString() + '">' + ago(e.at) + '</time></div></li>').join('') + '</ol>' +
      '<p class="note">History cannot be edited or deleted, so everyone sees the same story.</p></div>';
    return h;
  }

  function editSheet(t, keepValues, msg) {
    const v = keepValues || { title: t.title, kind: t.kind, date: t.date, time: t.time, details: t.details };
    sheet('<h2 id="sh-title">Edit</h2>' + (msg ? '<div class="banner warn" role="alert">' + esc(msg) + '</div>' : '') +
      '<input type="hidden" name="rev" value="' + t.rev + '">' +
      '<label class="field"><span>What</span><input type="text" name="title" maxlength="80" required value="' + esc(v.title) + '"></label>' +
      '<label class="field"><span>Type</span><select name="kind">' + Object.keys(C.KINDS).map(k => '<option value="' + k + '"' + (k === v.kind ? ' selected' : '') + '>' + C.KINDS[k].label + '</option>').join('') + '</select></label>' +
      '<div class="two"><label class="field"><span>Date</span><input type="date" name="date" required value="' + esc(v.date) + '"></label><label class="field"><span>Time</span><input type="time" name="time" value="' + esc(v.time) + '"></label></div>' +
      '<label class="field"><span>Details</span><textarea name="details" maxlength="600">' + esc(v.details) + '</textarea></label>' +
      (t.ownerId && t.ownerId !== actor ? '<p class="note">If you change the date or time, ' + esc(C.name(state, t.ownerId)) + ' will need to confirm again.</p>' : '') +
      '<div class="err" id="sh-err" role="alert"></div>' +
      '<div class="btnrow"><button class="btn primary" type="submit">Save changes</button><button class="btn" type="button" data-close>Back</button></div>',
      async (fd, form) => {
        const changes = { title: fd.get('title'), kind: fd.get('kind'), date: fd.get('date'), time: fd.get('time') || '', details: fd.get('details') };
        const rev = Number(fd.get('rev'));
        const r = await S.transact(latest => C.dispatch(latest, actor, { type: 'edit', taskId: t.id, rev, changes }));
        state = S.load() || state;
        if (r.ok) { closeSheet(); render(); say('Saved.'); return true; }
        if (r.code === 'conflict') {
          const latest = state.tasks.find(x => x.id === t.id);
          closeSheet(); render();
          if (latest) editSheet(latest, changes, 'Someone changed this while you were editing, so your changes were not saved yet. ' + r.error.replace('This changed while you were looking: ', 'Latest: ').replace(' Check the latest version and try again.', '') + ' Your edits are kept below. Press Save to apply them on top of the latest version.');
          return true;
        }
        $('#sh-err', form).textContent = r.error; return true;
      });
  }

  function viewAdd(params) {
    const m = me();
    if (!C.canCreate(m)) return '<div class="empty">Ask an adult to add this one.</div>';
    const date = C.validDate(params.date) ? params.date : today();
    return '<h1>Add a responsibility</h1><p class="date">Say what, when, and who you want to ask. It only counts as covered once they accept.</p>' + flashHtml() +
      '<form id="add-form" novalidate>' +
      '<label class="field"><span>What needs doing?</span><input class="big-input" type="text" name="title" maxlength="80" required placeholder="e.g. Pick up Leo from school" autocomplete="off"></label>' +
      '<div class="field"><span class="legend" id="lg-kind">Type</span><div class="chips" role="radiogroup" aria-labelledby="lg-kind">' + Object.keys(C.KINDS).map((k, i) =>
        '<label class="chip"><input type="radio" name="kind" value="' + k + '"' + (k === 'other' ? ' checked' : '') + '><span>' + C.KINDS[k].short + '</span></label>').join('') + '</div></div>' +
      '<div class="two"><label class="field"><span>Date</span><input type="date" name="date" required value="' + date + '"></label><label class="field"><span>Time (optional)</span><input type="time" name="time"></label></div>' +
      '<div class="field"><span class="legend" id="lg-who">Who should do it?</span><div class="people" role="radiogroup" aria-labelledby="lg-who">' +
      '<label class="person"><input type="radio" name="who" value="" checked><span class="pc">' + avOpen() + '<span><b>Nobody yet</b><small>Shows in Still needs someone</small></span></span></label>' +
      '<label class="person"><input type="radio" name="who" value="me"><span class="pc">' + av(actor) + '<span><b>I\'ll do it</b><small>You accept it now</small></span></span></label>' +
      personPicker({ kind: 'other' }, 'who') + '</div></div>' +
      '<label class="field" id="note-field" hidden><span>Note to them (optional)</span><input type="text" name="note" maxlength="140" placeholder="e.g. I have a late meeting, can you?"></label>' +
      '<details class="more"><summary>Details, checklist, repeat</summary>' +
      '<label class="field"><span>Details (optional)</span><textarea name="details" maxlength="600" placeholder="Where, what to bring, who to ask for"></textarea></label>' +
      '<label class="field"><span>Checklist (optional, one item per line)</span><textarea name="checklist" placeholder="Booster seat&#10;Signed form"></textarea></label>' +
      '<label class="field"><span>Repeat</span><select name="repeat">' + Object.keys(C.REPEATS).map(k => '<option value="' + k + '">' + C.REPEATS[k] + '</option>').join('') + '</select></label>' +
      '<p class="note">Repeating items are made for the next few dates (2 weeks of days, or 8 weeks). Each date is accepted on its own, with "Accept all" for convenience. You can attach files after saving.</p></details>' +
      '<div class="err" id="add-err" role="alert"></div>' +
      '<div class="btnrow"><button class="btn primary block" type="submit">Add responsibility</button></div></form>';
  }
  function bindAdd() {
    const f = $('#add-form'); if (!f) return;
    const sync = () => {
      const kind = (f.querySelector('[name=kind]:checked') || {}).value;
      const grown = C.KINDS[kind] && C.KINDS[kind].needsGrownup;
      $$('[name=who]', f).forEach(inp => {
        const mm = C.member(state, inp.value);
        if (mm) {
          const blocked = grown && mm.role === 'child';
          inp.disabled = blocked;
          inp.nextElementSibling.querySelector('small').textContent = blocked ? 'Not for pickups' : C.ROLES[mm.role].short;
          if (blocked && inp.checked) { inp.checked = false; f.querySelector('[name=who][value=""]').checked = true; }
        }
      });
      const who = (f.querySelector('[name=who]:checked') || {}).value;
      $('#note-field').hidden = !who || who === 'me';
      f.dataset.hold = f.title.value.trim() ? '1' : '';
    };
    f.addEventListener('change', sync); f.addEventListener('input', sync); sync();
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(f);
      const who = fd.get('who') || null;
      const a = { type: 'createTask', title: fd.get('title'), kind: fd.get('kind'), date: fd.get('date'), time: fd.get('time') || '', details: fd.get('details'), checklist: String(fd.get('checklist') || '').split('\n'), repeat: fd.get('repeat'), proposeTo: who, note: fd.get('note') };
      const r = await S.transact(latest => C.dispatch(latest, actor, a));
      state = S.load() || state;
      if (!r.ok) { $('#add-err').textContent = r.error; return; }
      f.dataset.hold = '';
      const n = r.taskIds.length;
      const msg = who === 'me' ? 'Added. You are doing it.' : who ? 'Sent to ' + C.name(state, who) + '. It is not covered until they accept.' : 'Added to Still needs someone.';
      flash = { kind: 'info', text: msg + (n > 1 ? ' (' + n + ' dates)' : '') };
      location.hash = '#/task/' + r.taskIds[0];
    });
  }

  function viewCalendar() {
    const t0 = today();
    if (!calMonth) calMonth = t0.slice(0, 7);
    if (!calDay) calDay = t0;
    const [y, mo] = calMonth.split('-').map(Number);
    const first = new Date(y, mo - 1, 1);
    const start = C.addDays(C.dateStr(first), -first.getDay());
    const vis = C.visibleTasks(state, actor).filter(t => !t.cancelledAt);
    const byDay = {};
    vis.forEach(t => { (byDay[t.date] = byDay[t.date] || []).push(t); });
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = C.addDays(start, i);
      const inMonth = d.slice(0, 7) === calMonth;
      if (i >= 35 && !inMonth && C.addDays(start, 35).slice(0, 7) !== calMonth) break;
      const list = byDay[d] || [];
      const counts = {}; list.forEach(t => { const s = C.statusOf(t); counts[s] = (counts[s] || 0) + 1; });
      const desc = list.length ? list.length + ' item' + (list.length > 1 ? 's' : '') + (counts.unassigned ? ', ' + counts.unassigned + ' still need someone' : '') + (counts.awaiting ? ', ' + counts.awaiting + ' waiting' : '') : 'nothing';
      cells += '<button type="button" data-day="' + d + '" class="' + (inMonth ? '' : 'out') + (d === t0 ? ' today' : '') + '" aria-pressed="' + (d === calDay) + '" aria-label="' + esc(C.fmtDay(d) + ': ' + desc) + '">' + Number(d.slice(8)) +
        '<span class="dots">' + list.slice(0, 4).map(t => '<i class="d-' + C.statusOf(t) + '"></i>').join('') + '</span></button>';
    }
    const dayList = (byDay[calDay] || []);
    return '<div class="calhead"><button class="iconbtn" data-cal="-1" aria-label="Previous month">‹</button><h1>' + first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '</h1><button class="iconbtn" data-cal="1" aria-label="Next month">›</button></div>' +
      '<div class="cal" role="group" aria-label="Month">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x, i) => '<div class="dow" aria-hidden="true">' + x + '</div>').join('') + cells + '</div>' +
      '<div class="legend-row"><span><i style="background:var(--coral)"></i>Still needs someone</span><span><i style="background:var(--purple-2)"></i>Waiting</span><span><i style="background:var(--mint)"></i>Accepted</span><span><i style="background:var(--line-2)"></i>Done</span></div>' +
      '<h2>' + esc(C.fmtDay(calDay, t0)) + ' <span class="count">' + dayList.length + '</span></h2>' +
      (dayList.length ? '<div class="list">' + dayList.map(t => card(t)).join('') + '</div>' : '<div class="empty">Nothing on this day.' + (C.canCreate(me()) ? ' <a href="#/add?date=' + calDay + '">Add something</a>' : '') + '</div>');
  }

  function viewHandoffs() {
    const p = C.pendingHandoffs(state, actor);
    const m = me();
    const tabsList = [['forYou', 'For you', p.forYou], ['youAsked', 'You asked', p.youAsked]];
    if (!kids(m)) tabsList.push(['others', 'Others', p.others]);
    if (!tabsList.find(x => x[0] === handoffTab)) handoffTab = 'forYou';
    const cur = tabsList.find(x => x[0] === handoffTab);
    const body = cur[2].length ? '<div class="list">' + cur[2].map(t => {
      if (handoffTab === 'forYou') return card(t, { ask: true, showDay: true, acts: askActs(t) });
      return card(t, { showDay: true, acts: '<div class="small muted" style="position:relative;margin-top:6px">Asked ' + ago(t.offer.at) + ' by ' + esc(nm(t.offer.from)) + ' · no answer yet</div>' });
    }).join('') + '</div>'
      : '<div class="empty">' + (handoffTab === 'forYou' ? 'Nobody is waiting on you right now.' : handoffTab === 'youAsked' ? 'You have no open requests.' : 'No other open requests.') + '</div>';
    return '<h1>Handoffs</h1><p class="date">Requests that nobody has answered yet. Until someone accepts, it is not theirs.</p>' + flashHtml() +
      '<div class="seg" role="tablist" aria-label="Handoffs">' + tabsList.map(([k, l, arr]) => '<button role="tab" data-htab="' + k + '" aria-selected="' + (k === handoffTab) + '">' + l + ' (' + arr.length + ')</button>').join('') + '</div>' +
      '<div style="margin-top:12px" role="tabpanel">' + body + '</div>';
  }

  function viewHousehold() {
    const m = me();
    const admin = C.isAdmin(m);
    let h = '<h1>' + (kids(m) ? 'Me' : 'Household') + '</h1><p class="date">' + esc(state.household.name) + '</p>' + flashHtml();
    h += '<h2>People <span class="count">' + state.members.length + '</span></h2><div class="panel" style="margin-top:0">' + state.members.map(x =>
      '<div class="mem">' + av(x.id, 'lg') + '<div class="grow"><b>' + esc(x.name) + (x.id === actor ? ' (you)' : '') + '</b><small>' + C.ROLES[x.role].label + '</small></div>' +
      (admin ? '<label class="sr" for="role-' + x.id + '">Role for ' + esc(x.name) + '</label><select id="role-' + x.id + '" data-role="' + x.id + '">' + Object.keys(C.ROLES).map(r => '<option value="' + r + '"' + (r === x.role ? ' selected' : '') + '>' + C.ROLES[r].short + '</option>').join('') + '</select>' +
        (x.id !== actor ? '<button class="btn ghost sm" data-act="remove" data-member="' + x.id + '" aria-label="Remove ' + esc(x.name) + '">Remove</button>' : '') : '') + '</div>').join('') + '</div>';
    if (!kids(m)) {
      const pending = state.invites.filter(i => i.status === 'pending');
      h += '<h2>Invites</h2>';
      h += pending.length ? '<div class="panel" style="margin-top:0">' + pending.map(i => {
        const expired = Date.now() > i.expiresAt;
        return '<div class="mem">' + avOpen('lg') + '<div class="grow"><b>' + esc(i.name) + '</b><small>' + C.ROLES[i.role].short + ' · ' + (expired ? 'Expired' : 'Invited, not joined yet') + '</small><div style="margin-top:4px"><span class="code">' + i.code + '</span></div></div>' +
          '<div style="display:flex;flex-direction:column;gap:4px"><button class="btn sm" data-act="demoJoin" data-code="' + i.code + '">Join as ' + esc(i.name.split(' ')[0]) + '</button>' +
          ((admin || i.createdBy === actor) ? '<button class="btn ghost sm" data-act="revoke" data-invite="' + i.id + '">Cancel invite</button>' : '') + '</div></div>';
      }).join('') + '<p class="note">An invite is not membership. People only appear in the household, and can be asked to do things, after they join. "Join as" is a demo shortcut for opening the invite on their phone.</p></div>' : '<p class="muted small">No invites waiting.</p>';
      if (C.canInvite(m)) h += '<form class="panel" id="invite-form"><h2 class="ph">Invite someone</h2><div class="two"><label class="field" style="margin-top:0"><span>Name</span><input type="text" name="name" maxlength="24" required placeholder="e.g. Grandpa Joe"></label>' +
        '<label class="field" style="margin-top:0"><span>Role</span><select name="role">' + Object.keys(C.ROLES).filter(r => admin || r !== 'admin').map(r => '<option value="' + r + '"' + (r === 'adult' ? ' selected' : '') + '>' + C.ROLES[r].short + '</option>').join('') + '</select></label></div>' +
        '<div class="err" id="inv-err" role="alert"></div><div class="btnrow"><button class="btn primary" type="submit">Create invite code</button></div></form>';
      h += '<h2>What each role can do</h2><div class="panel" style="margin-top:0;overflow-x:auto" tabindex="0" role="region" aria-label="What each role can do"><table class="perm"><thead><tr><th scope="col">Action</th>' + Object.keys(C.ROLES).map(r => '<th scope="col">' + C.ROLES[r].short + '</th>').join('') + '</tr></thead><tbody>' +
        C.PERMISSIONS.map(([label, v]) => '<tr><th scope="row" style="font-weight:600;text-align:left">' + esc(label) + '</th>' + Object.keys(C.ROLES).map(r => {
          const x = v[r]; return x === 1 ? '<td class="y">Yes</td>' : x === 0 ? '<td class="n">No</td>' : '<td class="p">' + esc(x) + '</td>';
        }).join('') + '</tr>').join('') + '</tbody></table><p class="note">Nobody can accept for someone else, not even an admin. That keeps "accepted" honest.</p></div>';
    }
    h += '<h2>More</h2><div class="panel" style="margin-top:0">' +
      '<a class="linkrow" href="#/settings"><span>Notifications and reminders<small>Your own settings</small></span>›</a>' +
      '<a class="linkrow" href="#/inbox"><span>Notification inbox<small>What was sent to you</small></span>›</a>' +
      (kids(m) ? '' : '<a class="linkrow" href="#/plans"><span>Household plan<small>One price for the whole home (being tested)</small></span>›</a>') +
      '<a class="linkrow" href="#/about"><span>About this demo<small>What is real, what a shared version needs, safety</small></span>›</a></div>';
    if (admin) h += '<div class="btnrow"><button class="btn ghost" data-act="reset">Start over (delete demo data)</button></div>';
    return h;
  }

  function viewSettings() {
    const st = me().settings;
    const tog = (k, label, help) => '<label class="toggle"><span>' + label + '<small class="muted" style="display:block;font-size:13px">' + help + '</small></span><input type="checkbox" data-notify="' + k + '"' + (st.notify[k] ? ' checked' : '') + '></label>';
    return '<a class="back" href="#/household">← ' + (kids(me()) ? 'Me' : 'Household') + '</a><h1>Notifications</h1><p class="date">Gentle by default. These are your settings only.</p>' + flashHtml() +
      '<div class="panel"><h2 class="ph">Remind me about things I accepted</h2><select id="set-remind" aria-label="Reminder timing">' +
      [['off', 'No reminders'], ['15', '15 minutes before'], ['60', '1 hour before'], ['180', '3 hours before'], ['evening', 'The evening before (after 6 PM)']].map(([v, l]) => '<option value="' + v + '"' + (st.remind === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>' +
      '<div class="panel"><h2 class="ph">Quiet hours</h2><div class="two"><label class="field" style="margin-top:0"><span>From</span><input type="time" id="set-qs" value="' + st.quietStart + '"></label><label class="field" style="margin-top:0"><span>To</span><input type="time" id="set-qe" value="' + st.quietEnd + '"></label></div><p class="note">No reminders show during quiet hours.</p></div>' +
      '<div class="panel"><h2 class="ph">Tell me when</h2>' + tog('offers', 'Someone asks me to take something', 'Requests and handoffs to you') + tog('answers', 'Someone answers my request', 'Accepted, declined, done') + tog('changes', 'Something I am doing changes', 'New time, cancelled, withdrawn') + (kids(me()) ? '' : tog('stillNeeds', 'Something still needs someone', 'Open items for the household')) + '</div>' +
      '<div class="banner info small">Being honest about notifications: in demo mode they appear only inside this app while it is open. A real version would send phone notifications through a server. Either way, a notification only shows that a message was sent, not that someone saw it. Only an answer counts.</div>';
  }

  function viewInbox() {
    const notes = state.notes.filter(n => n.to === actor).slice().reverse();
    const h = '<a class="back" href="#/household">← Back</a><h1>Notifications</h1><p class="date">Messages sent to you inside the app.</p>' +
      (notes.length ? '<div class="list" style="margin-top:12px">' + notes.map(n => '<a class="card" href="' + (n.taskId ? '#/task/' + n.taskId : '#/household') + '" style="' + (n.read ? '' : 'border-color:var(--purple-line);background:var(--purple-soft)') + '"><div class="body"><div class="title" style="font-weight:' + (n.read ? 600 : 700) + '">' + esc(n.text) + '</div><div class="who">' + ago(n.at) + (n.read ? '' : ' · new') + '</div></div></a>').join('') + '</div>'
        : '<div class="empty" style="margin-top:12px">No notifications yet.</div>');
    if (notes.some(n => !n.read)) setTimeout(() => act({ type: 'markRead' }), 1200);
    return h;
  }

  function viewPlans() {
    return '<a class="back" href="#/household">← Household</a><h1>Household plan</h1><p class="date">An idea being tested. Nothing is charged and nothing is limited in this demo.</p>' +
      '<div class="plan" style="margin-top:14px"><h2 class="ph">Free</h2><p class="small muted" style="margin:4px 0 0">The basics stay useful for everyone in the home.</p><ul><li>Unlimited responsibilities and people</li><li>Ask, accept, decline, hand off</li><li>Still needs someone, Today, calendar</li><li>Full history of changes</li><li>Adult, teen and child roles</li></ul></div>' +
      '<div class="plan plus" style="margin-top:10px"><h2 class="ph">Household Plus</h2><p class="small" style="margin:4px 0 0"><b>One price for the whole household, not per person.</b> Price not set yet.</p><ul><li>Attachments stored in the cloud (bigger files)</li><li>Repeating items without an end date</li><li>Two-way sync with Google or Apple calendars</li><li>Shared household notes (codes, contacts, routines)</li></ul></div>' +
      '<p class="note">What we want to learn: would a household pay for extras once the free plan is part of their week? Coordination itself is never put behind a paywall.</p>';
  }

  function viewAbout() {
    return '<a class="back" href="#/household">← Back</a><h1>About this demo</h1>' +
      '<div class="panel"><h2 class="ph">What Family Handoff is</h2><p class="small" style="margin:0">A shared household plan where every responsibility has one clear status: still needs someone, waiting for an answer, accepted, or done. Asking someone is not the same as them agreeing, so nothing counts as covered until the person accepts.</p></div>' +
      '<div class="panel"><h2 class="ph">Safety</h2><p class="small" style="margin:0">Family Handoff is a planning tool. It is not an emergency service and it cannot guarantee a child\'s safety or that anyone will show up. If something is urgent, call the person directly. In an emergency, call your local emergency number. The app does not track anyone\'s location and has no public profiles.</p></div>' +
      '<div class="panel"><h2 class="ph">What is real in this demo</h2><ul class="small" style="margin:0;padding-left:18px"><li>The rules: permissions, accept/decline, handoffs, history, conflict checks</li><li>Sync between tabs of this browser (try two tabs as two people)</li><li>Saving on this device</li></ul></div>' +
      '<div class="panel"><h2 class="ph">What a real shared version needs</h2><ul class="small" style="margin:0;padding-left:18px"><li>Real sign-in for each person, so nobody can act as someone else</li><li>A server that checks every change with the same rules, and refuses changes based on an old version</li><li>Shared, synced storage so every phone sees the same plan</li><li>Push notifications for requests and gentle reminders</li><li>Parent-managed accounts for children, with consent and minimal data</li></ul></div>' +
      '<p class="note">Names in the sample household are made up.</p>';
  }

  function viewWelcome() {
    return '<div class="hero">' + I.logo.replace('width="30" height="30"', 'width="64" height="64"') +
      '<h1>Know who\'s doing what.</h1><p>Family Handoff is a shared household plan. Each pickup, appointment or errand has one clear owner, and nothing counts as covered until that person says yes.</p></div>' +
      '<ol class="steps"><li><span class="num" style="background:var(--purple-soft);color:var(--purple)">1</span>Add a responsibility and ask someone to do it.</li>' +
      '<li><span class="num" style="background:var(--mint-soft);color:var(--mint-ink)">2</span>They accept or say they can\'t. Everyone sees the answer.</li>' +
      '<li><span class="num" style="background:var(--coral-soft);color:var(--coral-ink)">3</span>Anything without a yes shows under "Still needs someone".</li></ol>' +
      '<div class="banner info small" style="margin-top:16px">Local demo mode: saved only in this browser, with no real sign-in. Not an emergency service.</div>' +
      flashHtml() +
      '<div class="btnrow" style="flex-direction:column"><button class="btn primary block" data-act="demo" id="w-demo">Try a sample household</button>' +
      '<button class="btn block" data-act="startOwn" id="w-own">Start my own household</button>' +
      '<button class="btn ghost block" data-act="joinCode" id="w-join">I have an invite code</button></div>';
  }

  /* ---------- router ---------- */
  function parseRoute() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, q] = h.split('?');
    const parts = path.split('/');
    const params = {}; (q || '').split('&').forEach(kv => { const [k, v] = kv.split('='); if (k) params[k] = decodeURIComponent(v || ''); });
    return { name: parts[0] || 'today', id: parts[1], params };
  }
  function render() {
    const r = parseRoute();
    if (!state) {
      top.hidden = true; tabs.hidden = true;
      view.innerHTML = viewWelcome(); return;
    }
    if (!me()) {
      // This tab has no person yet (or they were removed): pick one.
      actor = state.members[0].id; S.setActor(actor);
    }
    renderTop(); renderTabs(r.name);
    const scrollKeep = view.dataset.route === location.hash ? window.scrollY : 0;
    let html;
    switch (r.name) {
      case 'task': html = viewTask(r.id); break;
      case 'add': html = viewAdd(r.params); break;
      case 'calendar': html = viewCalendar(); break;
      case 'handoffs': html = viewHandoffs(); break;
      case 'household': html = viewHousehold(); break;
      case 'settings': html = viewSettings(); break;
      case 'inbox': html = viewInbox(); break;
      case 'plans': html = viewPlans(); break;
      case 'about': html = viewAbout(); break;
      default: html = viewToday();
    }
    view.innerHTML = html;
    view.dataset.route = location.hash;
    if (r.name === 'task') view.dataset.taskRev = (state.tasks.find(t => t.id === r.id) || {}).rev || '';
    if (r.name === 'add') bindAdd();
    window.scrollTo(0, scrollKeep);
  }

  // A change from another tab.
  function applyRemote() {
    const fresh = S.load();
    staleRemote = false;
    const pill = $('.refresh-pill'); if (pill) pill.remove();
    if (!fresh) { state = null; render(); return; }
    const r = parseRoute();
    let note = null;
    if (r.name === 'task' && state) {
      const before = state.tasks.find(t => t.id === r.id), after = fresh.tasks.find(t => t.id === r.id);
      if (before && after && after.history.length > before.history.length) {
        const e = after.history[after.history.length - 1];
        if (e.by !== actor) note = 'Just updated: ' + e.text;
      }
    }
    state = fresh;
    if (note) flash = { kind: 'info', text: note };
    render();
  }
  S.onChange(() => {
    const holding = $('#scrim') || $('form[data-hold="1"]');
    if (holding) {
      staleRemote = true;
      if (!$('.refresh-pill')) {
        const b = document.createElement('button'); b.className = 'refresh-pill'; b.type = 'button'; b.textContent = 'Someone made changes · Show';
        b.onclick = () => { closeSheet(); applyRemote(); };
        document.body.appendChild(b);
      }
      // Keep the in-memory state current for checks, without redrawing the form.
      const fresh = S.load(); if (fresh) state = fresh;
      return;
    }
    applyRemote();
  });

  /* ---------- events ---------- */
  document.addEventListener('click', async e => {
    if (e.target.closest('#who')) { switchSheet(); return; }
    if (e.target.closest('#demo-why')) { demoSheet(); return; }
    const cal = e.target.closest('[data-cal]');
    if (cal) { const [y, m] = calMonth.split('-').map(Number); const d = new Date(y, m - 1 + Number(cal.dataset.cal), 1); calMonth = C.dateStr(d).slice(0, 7); calDay = C.dateStr(d); render(); return; }
    const day = e.target.closest('[data-day]');
    if (day) { calDay = day.dataset.day; if (calDay.slice(0, 7) !== calMonth) calMonth = calDay.slice(0, 7); render(); const b = $('[data-day="' + calDay + '"]'); if (b) b.focus(); return; }
    const ht = e.target.closest('[data-htab]');
    if (ht) { handoffTab = ht.dataset.htab; render(); const b = $('[data-htab="' + handoffTab + '"]'); if (b) b.focus(); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act, id = b.dataset.id, rev = Number(b.dataset.rev);
    const t = id && state ? state.tasks.find(x => x.id === id) : null;
    // Use the version shown on screen, not the newest one, so stale clicks are caught.
    const shown = t ? Object.assign({}, t, { rev }) : null;
    switch (a) {
      case 'accept': return act({ type: 'accept', taskId: id, rev }, 'Accepted. Everyone can see it is yours now.');
      case 'acceptAll': return act({ type: 'accept', taskId: id, rev, all: true }, r => 'Accepted ' + (1 + r.acceptedMore) + ' dates.');
      case 'decline': return reasonSheet(shown, 'decline');
      case 'release': return reasonSheet(shown, 'release');
      case 'claim': return act({ type: 'claim', taskId: id, rev }, 'It is yours. Everyone can see you took it.');
      case 'offer': return offerSheet(shown);
      case 'withdraw': return act({ type: 'withdrawOffer', taskId: id, rev }, 'Request withdrawn.');
      case 'complete': return act({ type: 'complete', taskId: id, rev }, 'Marked done. Thank you.');
      case 'reopen': return act({ type: 'reopen', taskId: id, rev }, 'Marked not done.');
      case 'edit': return editSheet(shown);
      case 'cancel':
        return sheet('<h2 id="sh-title">Cancel this?</h2><p class="small">' + esc(t.title) + ' will be marked cancelled. It stays in the history.</p><label class="field"><span>Reason (optional)</span><input type="text" name="reason" maxlength="140"></label><div class="btnrow"><button class="btn coral" type="submit">Cancel it</button><button class="btn" type="button" data-close>Keep it</button></div>',
          async fd => { await act({ type: 'cancel', taskId: id, rev, reason: fd.get('reason') }, 'Cancelled.'); });
      case 'rmfile': return act({ type: 'removeAttachment', taskId: id, attachmentId: b.dataset.file }, 'File removed.');
      case 'revoke': return act({ type: 'revokeInvite', inviteId: b.dataset.invite }, 'Invite cancelled. The code no longer works.');
      case 'remove': {
        const mm = C.member(state, b.dataset.member);
        return sheet('<h2 id="sh-title">Remove ' + esc(mm.name) + '?</h2><p class="small">Anything ' + esc(mm.name) + ' accepted that is not done goes back to "Still needs someone". History is kept.</p><div class="btnrow"><button class="btn coral" type="submit">Remove</button><button class="btn" type="button" data-close>Back</button></div>',
          async () => { await act({ type: 'removeMember', memberId: mm.id }, mm.name + ' was removed.'); });
      }
      case 'demoJoin': return joinSheet(b.dataset.code);
      case 'reset':
        return sheet('<h2 id="sh-title">Delete all demo data?</h2><p class="small">This removes the household from this browser. It cannot be undone.</p><div class="btnrow"><button class="btn coral" type="submit">Delete</button><button class="btn" type="button" data-close>Back</button></div>',
          () => { S.clear(); state = null; location.hash = '#/'; render(); });
      case 'demo': {
        state = D.build(Date.now()); S.save(state);
        actor = state.members[0].id; S.setActor(actor);
        location.hash = '#/today'; render(); say('Sample household loaded. You are Jordan.'); return;
      }
      case 'startOwn':
        return sheet('<h2 id="sh-title">Start your household</h2><label class="field"><span>Household name</span><input type="text" name="hh" maxlength="40" required placeholder="e.g. The Lee household"></label><label class="field"><span>Your name</span><input type="text" name="me" maxlength="24" required></label><div class="err" id="sh-err" role="alert"></div><div class="btnrow"><button class="btn primary" type="submit">Create</button><button class="btn" type="button" data-close>Back</button></div>',
          (fd, form) => {
            try { state = C.createHousehold(fd.get('hh'), fd.get('me')); } catch (err) { $('#sh-err', form).textContent = err.message; return true; }
            S.save(state); actor = state.members[0].id; S.setActor(actor); location.hash = '#/household'; render(); say('Household created. Invite the people you share responsibilities with.');
          });
      case 'joinCode': return joinSheet('');
    }
  });

  function joinSheet(code) {
    sheet('<h2 id="sh-title">Join a household</h2><p class="small muted">Demo: invite codes only work in this browser.</p>' +
      '<label class="field"><span>Invite code</span><input type="text" name="code" maxlength="12" required autocapitalize="characters" autocomplete="off" value="' + esc(code) + '" style="font-family:ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase"></label>' +
      '<label class="field"><span>Your name (optional)</span><input type="text" name="name" maxlength="24"></label>' +
      '<div class="err" id="sh-err" role="alert"></div><div class="btnrow"><button class="btn primary" type="submit">Join</button><button class="btn" type="button" data-close>Back</button></div>',
      async (fd, form) => {
        let out;
        const r = await S.transact(latest => { if (!latest) return { ok: false, error: 'That code does not match an invite in this browser.' }; out = C.join(latest, fd.get('code'), fd.get('name')); return out; });
        if (!r.ok) { $('#sh-err', form).textContent = r.error; return true; }
        state = S.load(); actor = r.memberId; S.setActor(actor);
        location.hash = '#/today'; render(); say('Welcome, ' + C.name(state, actor) + '. You joined ' + state.household.name + '.');
      });
  }

  document.addEventListener('change', async e => {
    const ck = e.target.closest('[data-check]');
    if (ck) return act({ type: 'setCheck', taskId: ck.dataset.id, itemId: ck.dataset.check, done: ck.checked });
    const role = e.target.closest('[data-role]');
    if (role) return act({ type: 'setRole', memberId: role.dataset.role, role: role.value }, 'Role updated.');
    if (e.target.id === 'set-remind') return act({ type: 'updateSettings', settings: { remind: e.target.value } }, 'Saved.');
    if (e.target.id === 'set-qs' || e.target.id === 'set-qe') return act({ type: 'updateSettings', settings: { [e.target.id === 'set-qs' ? 'quietStart' : 'quietEnd']: e.target.value } }, 'Saved.');
    const nt = e.target.closest('[data-notify]');
    if (nt) return act({ type: 'updateSettings', settings: { notify: { [nt.dataset.notify]: nt.checked } } }, 'Saved.');
    if (e.target.id === 'attach') {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > C.MAX_ATTACH_BYTES) { flash = { kind: 'warn', text: 'That file is too big for demo mode (400 KB max, because it is kept in this browser).' }; render(); return; }
      const data = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(''); fr.readAsDataURL(f); });
      return act({ type: 'addAttachment', taskId: e.target.dataset.id, name: f.name, mime: f.type, size: f.size, data }, 'Attached.');
    }
  });
  document.addEventListener('submit', async e => {
    if (e.target.id === 'add-check') {
      e.preventDefault();
      const id = parseRoute().id, text = e.target.text.value;
      return act({ type: 'addCheck', taskId: id, text });
    }
    if (e.target.id === 'invite-form') {
      e.preventDefault();
      const fd = new FormData(e.target);
      const r = await S.transact(latest => C.dispatch(latest, actor, { type: 'invite', name: fd.get('name'), role: fd.get('role') }));
      state = S.load() || state;
      if (!r.ok) { $('#inv-err').textContent = r.error; return; }
      flash = { kind: 'info', text: 'Invite code for ' + fd.get('name') + ': ' + r.code + '. They are not a member until they join with it. (Demo: the code only works in this browser.)' };
      render();
    }
  });
  window.addEventListener('hashchange', () => { closeSheet(); render(); view.focus({ preventScroll: true }); window.scrollTo(0, 0); });
  // Reminders depend on the clock.
  setInterval(() => { if (state && !$('#scrim') && !$('form[data-hold="1"]') && parseRoute().name === 'today') render(); }, 60000);

  if (!S.persistent()) flash = { kind: 'warn', text: 'This browser is blocking storage, so nothing will be kept after you close the page.' };
  render();
})();
