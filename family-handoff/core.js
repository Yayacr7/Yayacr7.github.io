/* Family Handoff: the household rules engine.
 *
 * Pure logic, no browser APIs. Every change to a household goes through
 * dispatch(state, actorId, action, now) which checks permissions and
 * revisions, then returns { ok, state } or { ok:false, code, error }.
 * The same file is meant to run on a server later (the server would be the
 * only place allowed to call dispatch, after checking who is signed in).
 *
 * Core rules:
 *  - An invitation or an offer is never an acceptance. A task only has a
 *    responsible person (ownerId) after that person accepts or takes it.
 *  - During a handoff the current person stays responsible until the new
 *    person accepts.
 *  - Only the named person can accept or decline. Nobody accepts for others.
 *  - Every state change needs the task revision the person was looking at.
 *    If someone else changed it first, the change is refused (conflict).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FHCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ROLES = {
    admin: { label: 'Adult · Admin', short: 'Admin', adult: true },
    adult: { label: 'Adult', short: 'Adult', adult: true },
    teen: { label: 'Teen', short: 'Teen', adult: false },
    child: { label: 'Child', short: 'Child', adult: false },
  };
  const KINDS = {
    pickup: { label: 'Pickup / drop-off', short: 'Pickup', needsGrownup: true },
    appointment: { label: 'Appointment', short: 'Appointment', needsGrownup: true },
    errand: { label: 'Errand', short: 'Errand' },
    form: { label: 'Form or permission slip', short: 'Form' },
    chore: { label: 'Chore', short: 'Chore' },
    other: { label: 'Other', short: 'Other' },
  };
  const REPEATS = { none: 'Does not repeat', daily: 'Every day', weekdays: 'Every weekday', weekly: 'Every week' };
  // Member colors: all pass 4.5:1 contrast with white text (checked in tests).
  const COLORS = ['#6B3FA0', '#C2412D', '#0F766E', '#1D4ED8', '#9D174D', '#8A4B08', '#4D6A12', '#5B4B8A'];
  const MAX_ATTACH_BYTES = 400 * 1024;
  const MAX_ATTACH = 3;
  const INVITE_DAYS = 7;
  const SERIES_LIMIT = { daily: 14, weekdays: 10, weekly: 8 };

  /* ---------- small helpers ---------- */
  function E(code, msg, extra) { const e = new Error(msg); e.code = code; if (extra) e.extra = extra; return e; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  let counter = 0;
  function uid(p) { counter = (counter + 1) % 1e6; return p + Math.random().toString(36).slice(2, 8) + counter.toString(36); }
  function inviteCode() {
    const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 6; i++) c += A[Math.floor(Math.random() * A.length)];
    return c;
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return dateStr(d); }
  function validDate(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false; const d = parseDate(s); return dateStr(d) === s; }
  function validTime(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(s || ''); }
  function fmtTime(t) {
    if (!t) return 'Any time';
    let [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + pad(m) + ' ' + ap;
  }
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDay(s, today) {
    if (today) {
      if (s === today) return 'Today';
      if (s === addDays(today, 1)) return 'Tomorrow';
      if (s === addDays(today, -1)) return 'Yesterday';
    }
    const d = parseDate(s);
    return DAYS[d.getDay()] + ' ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
  }
  function when(t, today) { return fmtDay(t.date, today) + (t.time ? ', ' + fmtTime(t.time) : ''); }
  function startMs(t) {
    const d = parseDate(t.date);
    if (t.time) { const [h, m] = t.time.split(':').map(Number); d.setHours(h, m, 0, 0); }
    return d.getTime();
  }
  function clean(s, max) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max); }
  function cleanLong(s, max) { return String(s == null ? '' : s).replace(/\r/g, '').trim().slice(0, max); }

  /* ---------- people and permissions ---------- */
  function member(s, id) { return s.members.find(m => m.id === id) || null; }
  function name(s, id) { const m = member(s, id); return m ? m.name : 'Someone who left'; }
  function isAdult(m) { return !!(m && ROLES[m.role] && ROLES[m.role].adult); }
  function isAdmin(m) { return !!(m && m.role === 'admin'); }

  function canView(s, m, t) {
    if (!m) return false;
    if (m.role !== 'child') return true;
    // Children only see what involves them.
    return t.ownerId === m.id || (t.offer && t.offer.to === m.id) || t.createdBy === m.id;
  }
  function canCreate(m) { return !!m && m.role !== 'child'; }
  function canEdit(m, t) { return isAdult(m) || (m && m.role === 'teen' && t.createdBy === m.id); }
  function canInvite(m) { return isAdult(m); }
  function canOffer(m, t) { return isAdult(m) || t.ownerId === m.id || (m.role === 'teen' && t.createdBy === m.id); }

  const PERMISSIONS = [
    ['See the whole household plan', { admin: 1, adult: 1, teen: 1, child: 'Only their own' }],
    ['Add a responsibility', { admin: 1, adult: 1, teen: 1, child: 0 }],
    ['Ask someone to take it', { admin: 1, adult: 1, teen: 'Their own', child: 'Their own' }],
    ['Accept or decline what is offered to them', { admin: 1, adult: 1, teen: 1, child: 1 }],
    ['Accept on behalf of someone else', { admin: 0, adult: 0, teen: 0, child: 0 }],
    ['Edit or cancel any responsibility', { admin: 1, adult: 1, teen: 'Ones they added', child: 0 }],
    ['Take pickups and appointments', { admin: 1, adult: 1, teen: 1, child: 0 }],
    ['Invite people', { admin: 1, adult: 1, teen: 0, child: 0 }],
    ['Change roles, remove people', { admin: 1, adult: 0, teen: 0, child: 0 }],
  ];

  function checkTarget(s, t, toId) {
    const target = member(s, toId);
    if (!target) {
      const inv = (s.invites || []).find(i => i.id === toId);
      if (inv) throw E('not_joined', inv.name + ' has been invited but has not joined yet. You can ask them once they join.');
      throw E('no_member', 'That person is not in this household.');
    }
    if (KINDS[t.kind] && KINDS[t.kind].needsGrownup && target.role === 'child')
      throw E('child_not_allowed', 'Pickups and appointments can only go to adults or teens.');
    return target;
  }

  /* ---------- task status ---------- */
  function statusOf(t) {
    if (t.cancelledAt) return 'cancelled';
    if (t.completedAt) return 'completed';
    if (t.ownerId) return 'accepted';
    if (t.offer) return 'awaiting';
    return 'unassigned';
  }
  const STATUS_LABEL = { unassigned: 'Still needs someone', awaiting: 'Waiting for an answer', accepted: 'Accepted', completed: 'Done', cancelled: 'Cancelled' };

  // One plain sentence that says who is doing it. Never says "seen".
  function statusSentence(s, t, viewerId) {
    const you = id => (id === viewerId ? 'You' : name(s, id));
    const st = statusOf(t);
    if (st === 'cancelled') return 'Cancelled by ' + you(t.cancelledBy) + '.';
    if (st === 'completed') return 'Done' + (t.completedBy ? ' · marked by ' + you(t.completedBy) : '') + '.';
    if (st === 'accepted') {
      const who = t.ownerId === viewerId ? 'You are doing this' : name(s, t.ownerId) + ' is doing this';
      if (t.offer) return who + '. Asked ' + (t.offer.to === viewerId ? 'you' : name(s, t.offer.to)) + ' to take over, no answer yet.';
      return who + '.';
    }
    if (st === 'awaiting') {
      if (t.offer.to === viewerId) return 'You were asked to take this. It is not yours until you accept.';
      return 'Waiting for ' + name(s, t.offer.to) + ' to accept. Not covered yet.';
    }
    return 'Nobody has accepted this yet.';
  }

  /* ---------- notifications (in-app inbox) ---------- */
  const NOTE_KIND = { offer: 'offers', answer: 'answers', change: 'changes', open: 'stillNeeds', join: 'answers' };
  function notify(s, toId, kind, text, taskId, actor, now) {
    if (!toId || (actor && toId === actor.id)) return;
    const m = member(s, toId);
    if (!m) return;
    const pref = NOTE_KIND[kind];
    if (pref && m.settings && m.settings.notify && m.settings.notify[pref] === false) return;
    s.notes.push({ id: uid('n'), to: toId, kind, text, taskId: taskId || null, at: now, read: false });
    const mine = s.notes.filter(n => n.to === toId);
    if (mine.length > 60) { const drop = mine[0].id; s.notes = s.notes.filter(n => n.id !== drop); }
  }
  function notifyGrownups(s, kind, text, taskId, actor, now) {
    s.members.filter(m => m.role !== 'child').forEach(m => notify(s, m.id, kind, text, taskId, actor, now));
  }

  function log(t, actor, text, now, type) { t.history.push({ at: now, by: actor ? actor.id : null, text, type: type || 'change' }); }
  function bump(t, now) { t.rev++; t.updatedAt = now; }

  function getTask(s, id, actor) {
    const t = s.tasks.find(x => x.id === id);
    if (!t) throw E('not_found', 'This responsibility no longer exists.');
    if (actor && !canView(s, actor, t)) throw E('forbidden', 'You do not have access to this one.');
    return t;
  }
  function checkRev(t, a) {
    if (typeof a.rev !== 'number') throw E('missing_rev', 'Missing version number. Reload and try again.');
    if (t.rev !== a.rev) {
      const last = t.history[t.history.length - 1];
      throw E('conflict', 'This changed while you were looking: ' + (last ? last.text : 'someone updated it') + ' Check the latest version and try again.', { taskId: t.id, rev: t.rev });
    }
  }
  function open(t) { const st = statusOf(t); if (st === 'completed' || st === 'cancelled') throw E('closed', 'This is already ' + (st === 'completed' ? 'done' : 'cancelled') + '.'); }

  function defaultSettings() {
    return { remind: '60', quietStart: '21:00', quietEnd: '07:00', notify: { offers: true, answers: true, changes: true, stillNeeds: true } };
  }
  function nextColor(s) {
    const used = s.members.map(m => m.color);
    return COLORS.find(c => !used.includes(c)) || COLORS[s.members.length % COLORS.length];
  }

  /* ---------- creating a household ---------- */
  function createHousehold(householdName, adminName, now) {
    now = now || Date.now();
    const hn = clean(householdName, 40), an = clean(adminName, 24);
    if (!hn) throw E('invalid', 'Give the household a name.');
    if (!an) throw E('invalid', 'Add your name.');
    const id = uid('m');
    return {
      v: 1,
      household: { id: uid('h'), name: hn, createdAt: now },
      members: [{ id, name: an, role: 'admin', color: COLORS[0], joinedAt: now, settings: defaultSettings() }],
      invites: [], tasks: [], notes: [], rev: 0,
    };
  }

  /* ---------- actions ---------- */
  const H = {};

  H.renameHousehold = (s, me, a) => {
    if (!isAdmin(me)) throw E('forbidden', 'Only an admin can rename the household.');
    const n = clean(a.name, 40); if (!n) throw E('invalid', 'Give the household a name.');
    s.household.name = n;
  };

  H.invite = (s, me, a, now) => {
    if (!canInvite(me)) throw E('forbidden', 'Only adults can invite people.');
    const n = clean(a.name, 24); if (!n) throw E('invalid', 'Add their name.');
    if (!ROLES[a.role]) throw E('invalid', 'Pick a role.');
    if (a.role === 'admin' && !isAdmin(me)) throw E('forbidden', 'Only an admin can invite another admin.');
    if (s.invites.some(i => i.status === 'pending' && i.name.toLowerCase() === n.toLowerCase()))
      throw E('duplicate', n + ' already has an invite waiting.');
    let code; do { code = inviteCode(); } while (s.invites.some(i => i.code === code));
    const inv = { id: uid('i'), code, name: n, role: a.role, createdBy: me.id, createdAt: now, expiresAt: now + INVITE_DAYS * 864e5, status: 'pending' };
    s.invites.push(inv);
    return { code, inviteId: inv.id };
  };

  H.revokeInvite = (s, me, a, now) => {
    const inv = s.invites.find(i => i.id === a.inviteId);
    if (!inv) throw E('not_found', 'Invite not found.');
    if (!(isAdmin(me) || inv.createdBy === me.id)) throw E('forbidden', 'Only an admin or the person who sent it can cancel an invite.');
    if (inv.status !== 'pending') throw E('closed', 'This invite was already ' + inv.status + '.');
    inv.status = 'revoked'; inv.closedAt = now;
  };

  // join has no actor: the person is not a member yet.
  function join(state, code, joinName, now) {
    now = now || Date.now();
    const s = clone(state);
    const c = clean(code, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const inv = s.invites.find(i => i.code === c);
    if (!inv) return fail(E('invite_unknown', 'That code does not match an invite. Check the letters and try again.'));
    if (inv.status === 'joined') return fail(E('invite_used', 'This invite was already used. Ask for a new one.'));
    if (inv.status === 'revoked') return fail(E('invite_revoked', 'This invite was cancelled. Ask for a new one.'));
    if (now > inv.expiresAt) return fail(E('invite_expired', 'This invite has expired. Ask for a new one.'));
    const n = clean(joinName, 24) || inv.name;
    const m = { id: uid('m'), name: n, role: inv.role, color: nextColor(s), joinedAt: now, settings: defaultSettings() };
    s.members.push(m);
    inv.status = 'joined'; inv.memberId = m.id; inv.closedAt = now;
    notify(s, inv.createdBy, 'join', n + ' joined the household.', null, m, now);
    s.rev++;
    return { ok: true, state: s, memberId: m.id };
  }

  H.setRole = (s, me, a) => {
    if (!isAdmin(me)) throw E('forbidden', 'Only an admin can change roles.');
    const m = member(s, a.memberId); if (!m) throw E('no_member', 'That person is not in this household.');
    if (!ROLES[a.role]) throw E('invalid', 'Pick a role.');
    if (m.role === 'admin' && a.role !== 'admin' && s.members.filter(x => x.role === 'admin').length === 1)
      throw E('last_admin', 'A household needs at least one admin. Make someone else admin first.');
    m.role = a.role;
  };

  H.removeMember = (s, me, a, now) => {
    if (!isAdmin(me)) throw E('forbidden', 'Only an admin can remove people.');
    const m = member(s, a.memberId); if (!m) throw E('no_member', 'That person is not in this household.');
    if (m.role === 'admin' && s.members.filter(x => x.role === 'admin').length === 1)
      throw E('last_admin', 'A household needs at least one admin.');
    s.members = s.members.filter(x => x.id !== m.id);
    s.tasks.forEach(t => {
      const st = statusOf(t);
      if (st === 'completed' || st === 'cancelled') return;
      let changed = false;
      if (t.ownerId === m.id) { t.ownerId = null; changed = true; log(t, me, m.name + ' left the household. This needs someone again.', now, 'open'); }
      if (t.offer && t.offer.to === m.id) { t.offer = null; changed = true; log(t, me, m.name + ' left the household, so the request to them was withdrawn.', now); }
      if (changed) bump(t, now);
    });
    s.notes = s.notes.filter(n => n.to !== m.id);
  };

  function makeTask(s, me, a, date, seriesId, now) {
    return {
      id: uid('t'), seriesId: seriesId || null, repeat: a.repeat || 'none',
      title: clean(a.title, 80), kind: KINDS[a.kind] ? a.kind : 'other', date, time: a.time || '',
      details: cleanLong(a.details, 600),
      checklist: (a.checklist || []).map(x => clean(x, 80)).filter(Boolean).slice(0, 20).map(text => ({ id: uid('c'), text, done: false, by: null })),
      attachments: [], ownerId: null, offer: null, createdBy: me.id, createdAt: now, updatedAt: now,
      completedAt: null, completedBy: null, cancelledAt: null, cancelledBy: null, rev: 1, history: [],
    };
  }

  H.createTask = (s, me, a, now) => {
    if (!canCreate(me)) throw E('forbidden', 'Ask an adult to add this one.');
    if (!clean(a.title, 80)) throw E('invalid', 'Say what needs doing.');
    if (!validDate(a.date)) throw E('invalid', 'Pick a date.');
    if (a.time && !validTime(a.time)) throw E('invalid', 'That time does not look right.');
    const rep = REPEATS[a.repeat] ? a.repeat : 'none';
    const to = a.proposeTo || null;
    const probe = { kind: KINDS[a.kind] ? a.kind : 'other' };
    if (to && to !== 'me') { checkTarget(s, probe, to); if (to === me.id) throw E('invalid', 'Choose "I will do it" to take it yourself.'); }
    if (to === 'me') checkTarget(s, probe, me.id);

    // Dates for a repeating responsibility: the next few, each accepted separately.
    const dates = [a.date];
    if (rep !== 'none') {
      let d = a.date;
      while (dates.length < SERIES_LIMIT[rep]) {
        d = addDays(d, rep === 'weekly' ? 7 : 1);
        if (rep === 'weekdays') { const wd = parseDate(d).getDay(); if (wd === 0 || wd === 6) continue; }
        dates.push(d);
      }
      if (rep === 'weekdays') { const wd = parseDate(a.date).getDay(); if (wd === 0 || wd === 6) dates.shift(); }
    }
    const seriesId = rep !== 'none' ? uid('s') : null;
    const ids = [];
    dates.forEach(date => {
      const t = makeTask(s, me, Object.assign({}, a, { repeat: rep }), date, seriesId, now);
      log(t, me, me.name + ' added this' + (rep !== 'none' ? ' (' + REPEATS[rep].toLowerCase() + ')' : '') + '.', now, 'create');
      if (to === 'me') { t.ownerId = me.id; log(t, me, me.name + ' is doing it.', now, 'accept'); }
      else if (to) {
        t.offer = { to, from: me.id, at: now, note: clean(a.note, 140) };
        log(t, me, me.name + ' asked ' + name(s, to) + ' to take it. Not accepted yet.', now, 'offer');
      }
      s.tasks.push(t); ids.push(t.id);
    });
    const first = s.tasks.find(t => t.id === ids[0]);
    const series = ids.length > 1 ? ' (' + REPEATS[rep].toLowerCase() + ', ' + ids.length + ' dates)' : '';
    if (to && to !== 'me') notify(s, to, 'offer', me.name + ' asked you to take: ' + first.title + ', ' + when(first) + series + '.', first.id, me, now);
    if (!to) notifyGrownups(s, 'open', 'Still needs someone: ' + first.title + ', ' + when(first) + series + '.', first.id, me, now);
    return { taskIds: ids };
  };

  H.claim = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me); open(t);
    const st = statusOf(t);
    if (st === 'accepted') throw E('already_taken', (t.ownerId === me.id ? 'You are' : name(s, t.ownerId) + ' is') + ' already doing this.', { taskId: t.id, rev: t.rev });
    if (st === 'awaiting' && t.offer.to !== me.id) throw E('offered_to_other', 'This is waiting for ' + name(s, t.offer.to) + ' to answer. Ask them first, or withdraw the request.', { taskId: t.id, rev: t.rev });
    checkRev(t, a);
    checkTarget(s, t, me.id);
    const from = t.offer && t.offer.from;
    t.ownerId = me.id; t.offer = null;
    log(t, me, me.name + ' took this.', now, 'accept'); bump(t, now);
    notify(s, from || t.createdBy, 'answer', me.name + ' took: ' + t.title + ', ' + when(t) + '.', t.id, me, now);
  };

  H.offer = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me); open(t);
    if (!canOffer(me, t)) throw E('forbidden', 'Only adults or the person doing it can ask someone else.');
    checkRev(t, a);
    if (a.to === me.id) throw E('invalid', 'Use "I will take it" to take it yourself.');
    const target = checkTarget(s, t, a.to);
    if (t.ownerId === target.id) throw E('invalid', target.name + ' is already doing this.');
    if (t.offer) log(t, me, 'The request to ' + name(s, t.offer.to) + ' was withdrawn.', now);
    if (t.offer && t.offer.to !== target.id) notify(s, t.offer.to, 'change', 'No longer needed from you: ' + t.title + '.', t.id, me, now);
    t.offer = { to: target.id, from: me.id, at: now, note: clean(a.note, 140) };
    if (t.ownerId) log(t, me, me.name + ' asked ' + target.name + ' to take over. ' + name(s, t.ownerId) + ' is still responsible until ' + target.name + ' accepts.', now, 'offer');
    else log(t, me, me.name + ' asked ' + target.name + ' to take it. Not accepted yet.', now, 'offer');
    bump(t, now);
    notify(s, target.id, 'offer', me.name + ' asked you to take' + (t.ownerId ? ' over' : '') + ': ' + t.title + ', ' + when(t) + '.', t.id, me, now);
  };

  H.withdrawOffer = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me); open(t);
    if (!t.offer) throw E('no_offer', 'There is no open request on this.');
    if (!(isAdult(me) || t.offer.from === me.id || t.ownerId === me.id)) throw E('forbidden', 'Only the person who asked, the person doing it, or an adult can withdraw this.');
    checkRev(t, a);
    const to = t.offer.to;
    t.offer = null;
    log(t, me, me.name + ' withdrew the request to ' + name(s, to) + '.' + (t.ownerId ? '' : ' It still needs someone.'), now, t.ownerId ? 'change' : 'open');
    bump(t, now);
    notify(s, to, 'change', 'No longer needed from you: ' + t.title + '.', t.id, me, now);
  };

  H.accept = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me); open(t);
    if (!t.offer) throw E('no_offer', statusOf(t) === 'accepted' ? name(s, t.ownerId) + ' is already doing this.' : 'Nobody asked for this yet. Use "I will take it".', { taskId: t.id, rev: t.rev });
    if (t.offer.to !== me.id) throw E('only_target', 'Only ' + name(s, t.offer.to) + ' can accept this. Accepting for someone else would hide whether they really agreed.');
    checkRev(t, a);
    acceptOne(s, me, t, now);
    let more = 0;
    if (a.all && t.seriesId) {
      s.tasks.filter(x => x.seriesId === t.seriesId && x.id !== t.id && x.date >= t.date && statusOf(x) !== 'completed' && statusOf(x) !== 'cancelled' && x.offer && x.offer.to === me.id)
        .forEach(x => { acceptOne(s, me, x, now, true); more++; });
    }
    return { acceptedMore: more };
  };
  function acceptOne(s, me, t, now, quiet) {
    const prev = t.ownerId, from = t.offer.from;
    t.ownerId = me.id; t.offer = null;
    log(t, me, prev ? me.name + ' accepted the handoff from ' + name(s, prev) + '. ' + me.name + ' is responsible now.' : me.name + ' accepted.', now, 'accept');
    bump(t, now);
    if (quiet) return;
    notify(s, from, 'answer', me.name + ' accepted: ' + t.title + ', ' + when(t) + '.', t.id, me, now);
    if (prev && prev !== from) notify(s, prev, 'answer', me.name + ' took over ' + t.title + ' from you.', t.id, me, now);
  }

  H.decline = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me); open(t);
    if (!t.offer) throw E('no_offer', 'There is no open request on this.', { taskId: t.id, rev: t.rev });
    if (t.offer.to !== me.id) throw E('only_target', 'Only ' + name(s, t.offer.to) + ' can decline this.');
    checkRev(t, a);
    const from = t.offer.from, reason = clean(a.reason, 140);
    t.offer = null;
    const why = reason ? ' ("' + reason + '")' : '';
    if (t.ownerId) {
      log(t, me, me.name + ' said no' + why + '. ' + name(s, t.ownerId) + ' is still responsible.', now, 'decline');
      notify(s, t.ownerId, 'answer', me.name + ' cannot take ' + t.title + why + '. You are still responsible.', t.id, me, now);
      if (from !== t.ownerId) notify(s, from, 'answer', me.name + ' cannot take ' + t.title + why + '.', t.id, me, now);
    } else {
      log(t, me, me.name + ' said no' + why + '. It still needs someone.', now, 'open');
      notify(s, from, 'answer', me.name + ' cannot take ' + t.title + why + '. It still needs someone.', t.id, me, now);
    }
    bump(t, now);
  };

  H.release = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me); open(t);
    if (!t.ownerId) throw E('not_owned', 'Nobody is doing this yet.');
    if (!(t.ownerId === me.id || isAdult(me))) throw E('forbidden', 'Only the person doing it or an adult can say they cannot.');
    checkRev(t, a);
    const prev = t.ownerId, reason = clean(a.reason, 140);
    t.ownerId = null;
    const why = reason ? ' ("' + reason + '")' : '';
    const pending = t.offer;
    if (pending) log(t, me, (prev === me.id ? me.name : me.name + ' said ' + name(s, prev)) + ' can no longer do this' + why + '. Still waiting for ' + name(s, pending.to) + ' to accept.', now, 'open');
    else log(t, me, (prev === me.id ? me.name + ' can no longer do this' : me.name + ' said ' + name(s, prev) + ' can no longer do this') + why + '. It needs someone.', now, 'open');
    bump(t, now);
    notifyGrownups(s, 'open', 'Still needs someone: ' + t.title + ', ' + when(t) + ' (' + name(s, prev) + ' cannot' + why + ').', t.id, me, now);
    if (prev !== me.id) notify(s, prev, 'change', me.name + ' marked that you cannot do ' + t.title + '.', t.id, me, now);
  };

  H.complete = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me); open(t);
    const st = statusOf(t);
    if (st === 'awaiting') throw E('awaiting', 'Waiting for ' + name(s, t.offer.to) + ' to answer first. Withdraw the request or take it yourself.');
    if (st === 'accepted' && t.ownerId !== me.id && !isAdult(me)) throw E('forbidden', 'Only ' + name(s, t.ownerId) + ' or an adult can mark this done.');
    checkRev(t, a);
    if (st === 'unassigned') { checkTarget(s, t, me.id); t.ownerId = me.id; }
    if (t.offer) t.offer = null;
    t.completedAt = now; t.completedBy = me.id;
    log(t, me, t.ownerId === me.id ? me.name + ' marked this done.' : me.name + ' marked this done for ' + name(s, t.ownerId) + '.', now, 'done');
    bump(t, now);
    if (t.createdBy !== me.id) notify(s, t.createdBy, 'answer', 'Done: ' + t.title + ' (' + me.name + ').', t.id, me, now);
    if (t.ownerId !== me.id) notify(s, t.ownerId, 'change', me.name + ' marked ' + t.title + ' done.', t.id, me, now);
  };

  H.reopen = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me);
    if (statusOf(t) !== 'completed') throw E('invalid', 'This is not marked done.');
    if (!(t.ownerId === me.id || isAdult(me))) throw E('forbidden', 'Only the person who did it or an adult can undo this.');
    checkRev(t, a);
    t.completedAt = null; t.completedBy = null;
    log(t, me, me.name + ' marked this not done yet.', now);
    bump(t, now);
  };

  H.edit = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me); open(t);
    if (!canEdit(me, t)) throw E('forbidden', 'Only adults, or the teen who added it, can edit this.');
    checkRev(t, a);
    const c = a.changes || {};
    const diffs = [];
    const next = {
      title: c.title !== undefined ? clean(c.title, 80) : t.title,
      date: c.date !== undefined ? c.date : t.date,
      time: c.time !== undefined ? c.time : t.time,
      details: c.details !== undefined ? cleanLong(c.details, 600) : t.details,
      kind: c.kind !== undefined && KINDS[c.kind] ? c.kind : t.kind,
    };
    if (!next.title) throw E('invalid', 'Say what needs doing.');
    if (!validDate(next.date)) throw E('invalid', 'Pick a date.');
    if (next.time && !validTime(next.time)) throw E('invalid', 'That time does not look right.');
    if (next.title !== t.title) diffs.push('renamed it to "' + next.title + '"');
    if (next.date !== t.date) diffs.push('moved the date from ' + fmtDay(t.date) + ' to ' + fmtDay(next.date));
    if (next.time !== t.time) diffs.push('changed the time from ' + fmtTime(t.time) + ' to ' + fmtTime(next.time));
    if (next.kind !== t.kind) diffs.push('changed the type to ' + KINDS[next.kind].short.toLowerCase());
    if (next.details !== t.details) diffs.push('updated the details');
    if (!diffs.length) throw E('no_change', 'Nothing was changed.');
    const timing = next.date !== t.date || next.time !== t.time;
    Object.assign(t, next);
    log(t, me, me.name + ' ' + diffs.join(', ') + '.', now, 'edit');
    // A new kind can make the current person ineligible (a child cannot do pickups).
    const ownerNow = member(s, t.ownerId);
    if (ownerNow && KINDS[t.kind].needsGrownup && ownerNow.role === 'child') {
      log(t, me, ownerNow.name + ' cannot do ' + KINDS[t.kind].short.toLowerCase() + 's, so this needs someone again.', now, 'open');
      t.ownerId = null;
    }
    if (t.offer && KINDS[t.kind].needsGrownup && (member(s, t.offer.to) || {}).role === 'child') t.offer = null;
    // A new time or date means the person has to confirm again.
    if (timing && t.ownerId && t.ownerId !== me.id) {
      const prev = t.ownerId;
      t.ownerId = null;
      t.offer = { to: prev, from: me.id, at: now, note: 'The time changed. Please confirm you can still do it.' };
      log(t, me, name(s, prev) + ' needs to confirm the new time. Not covered until they accept.', now, 'offer');
      notify(s, prev, 'offer', me.name + ' changed ' + t.title + ' to ' + when(t) + '. Can you still do it?', t.id, me, now);
    } else {
      const who = t.ownerId || (t.offer && t.offer.to);
      notify(s, who, 'change', me.name + ' changed ' + t.title + ': ' + diffs.join(', ') + '.', t.id, me, now);
    }
    bump(t, now);
  };

  H.cancel = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me); open(t);
    if (!canEdit(me, t)) throw E('forbidden', 'Only adults, or the teen who added it, can cancel this.');
    checkRev(t, a);
    const reason = clean(a.reason, 140);
    t.cancelledAt = now; t.cancelledBy = me.id;
    log(t, me, me.name + ' cancelled this' + (reason ? ' ("' + reason + '")' : '') + '.', now, 'cancel');
    bump(t, now);
    [t.ownerId, t.offer && t.offer.to].forEach(id => notify(s, id, 'change', 'Cancelled: ' + t.title + ', ' + when(t) + '.', t.id, me, now));
    t.offer = null;
  };

  // Checklist ticks and attachments do not change who is responsible, so they
  // do not bump the revision (no false conflicts), but they are still logged.
  function canTouch(s, me, t) { return isAdult(me) || t.ownerId === me.id || (t.offer && t.offer.to === me.id) || t.createdBy === me.id; }
  H.setCheck = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me); open(t);
    if (!canTouch(s, me, t)) throw E('forbidden', 'Only the person doing it or an adult can tick this list.');
    const it = t.checklist.find(c => c.id === a.itemId); if (!it) throw E('not_found', 'That item was removed.');
    const done = !!a.done;
    if (it.done === done) return;
    it.done = done; it.by = me.id;
    log(t, me, me.name + (done ? ' ticked "' : ' unticked "') + it.text + '".', now, 'check');
    t.updatedAt = now;
  };
  H.addCheck = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me); open(t);
    if (!canTouch(s, me, t)) throw E('forbidden', 'Only the person doing it or an adult can change this list.');
    const text = clean(a.text, 80); if (!text) throw E('invalid', 'Type the item first.');
    if (t.checklist.length >= 20) throw E('invalid', 'A checklist can have up to 20 items.');
    t.checklist.push({ id: uid('c'), text, done: false, by: null });
    log(t, me, me.name + ' added "' + text + '" to the checklist.', now, 'check');
    t.updatedAt = now;
  };
  H.removeCheck = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me); open(t);
    if (!canEdit(me, t)) throw E('forbidden', 'Only adults, or the teen who added it, can remove items.');
    const it = t.checklist.find(c => c.id === a.itemId); if (!it) return;
    t.checklist = t.checklist.filter(c => c.id !== a.itemId);
    log(t, me, me.name + ' removed "' + it.text + '" from the checklist.', now, 'check');
    t.updatedAt = now;
  };
  H.addAttachment = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me); open(t);
    if (!canTouch(s, me, t)) throw E('forbidden', 'Only the person doing it or an adult can add files.');
    if (t.attachments.length >= MAX_ATTACH) throw E('invalid', 'Up to ' + MAX_ATTACH + ' files per responsibility in demo mode.');
    const size = Number(a.size) || 0;
    if (size > MAX_ATTACH_BYTES) throw E('too_big', 'That file is too big for demo mode (400 KB max, because it is kept in this browser).');
    if (!/^(image\/(png|jpeg|webp|gif)|application\/pdf)$/.test(a.mime || '')) throw E('invalid', 'Attach a photo (PNG, JPG, WebP, GIF) or a PDF.');
    const nm = clean(a.name, 60) || 'file';
    t.attachments.push({ id: uid('a'), name: nm, mime: a.mime, size, data: a.data || '', by: me.id, at: now });
    log(t, me, me.name + ' attached "' + nm + '".', now, 'file');
    t.updatedAt = now;
  };
  H.removeAttachment = (s, me, a, now) => {
    const t = getTask(s, a.taskId, me);
    const f = t.attachments.find(x => x.id === a.attachmentId); if (!f) return;
    if (!(isAdult(me) || f.by === me.id)) throw E('forbidden', 'Only the person who added it or an adult can remove it.');
    t.attachments = t.attachments.filter(x => x.id !== f.id);
    log(t, me, me.name + ' removed "' + f.name + '".', now, 'file');
    t.updatedAt = now;
  };

  H.markRead = (s, me) => { s.notes.forEach(n => { if (n.to === me.id) n.read = true; }); };
  H.updateSettings = (s, me, a) => {
    const st = me.settings || defaultSettings();
    const c = a.settings || {};
    if (c.remind !== undefined) { if (!['off', '15', '60', '180', 'evening'].includes(c.remind)) throw E('invalid', 'Pick a reminder time.'); st.remind = c.remind; }
    if (c.quietStart !== undefined) { if (!validTime(c.quietStart)) throw E('invalid', 'Pick a start time.'); st.quietStart = c.quietStart; }
    if (c.quietEnd !== undefined) { if (!validTime(c.quietEnd)) throw E('invalid', 'Pick an end time.'); st.quietEnd = c.quietEnd; }
    if (c.notify) Object.keys(st.notify).forEach(k => { if (c.notify[k] !== undefined) st.notify[k] = !!c.notify[k]; });
    me.settings = st;
  };

  function fail(e) { return { ok: false, code: e.code || 'error', error: e.message, extra: e.extra || null }; }

  function dispatch(state, actorId, action, now) {
    now = now || Date.now();
    if (!state) return fail(E('no_household', 'No household yet.'));
    if (!action || !H[action.type]) return fail(E('unknown', 'Unknown action.'));
    const s = clone(state);
    const me = member(s, actorId);
    if (!me) return fail(E('not_member', 'You are not a member of this household.'));
    try {
      const extra = H[action.type](s, me, action, now) || {};
      s.rev++;
      return Object.assign({ ok: true, state: s }, extra);
    } catch (e) {
      if (e.code) return fail(e);
      throw e;
    }
  }

  /* ---------- views ---------- */
  function visibleTasks(s, viewerId) {
    const me = member(s, viewerId);
    return s.tasks.filter(t => canView(s, me, t)).sort((a, b) => startMs(a) - startMs(b) || (a.time ? 0 : -1));
  }
  function todayPlan(s, viewerId, today) {
    const vis = visibleTasks(s, viewerId);
    const live = t => !['completed', 'cancelled'].includes(statusOf(t));
    const horizon = addDays(today, 7);
    return {
      forYou: vis.filter(t => live(t) && t.offer && t.offer.to === viewerId && t.date >= today),
      stillNeeds: vis.filter(t => statusOf(t) === 'unassigned' && t.date >= today && t.date <= horizon),
      today: vis.filter(t => t.date === today && statusOf(t) !== 'cancelled'),
      counts: {
        needs: vis.filter(t => statusOf(t) === 'unassigned' && t.date === today).length,
        waiting: vis.filter(t => statusOf(t) === 'awaiting' && t.date === today).length,
        covered: vis.filter(t => t.date === today && statusOf(t) === 'accepted').length,
        done: vis.filter(t => t.date === today && statusOf(t) === 'completed').length,
      },
    };
  }
  function pendingHandoffs(s, viewerId) {
    const vis = visibleTasks(s, viewerId).filter(t => t.offer && !['completed', 'cancelled'].includes(statusOf(t)));
    return {
      forYou: vis.filter(t => t.offer.to === viewerId),
      youAsked: vis.filter(t => t.offer.from === viewerId && t.offer.to !== viewerId),
      others: vis.filter(t => t.offer.to !== viewerId && t.offer.from !== viewerId),
    };
  }
  function inQuiet(st, d) {
    const mins = d.getHours() * 60 + d.getMinutes();
    const toM = x => { const [h, m] = x.split(':').map(Number); return h * 60 + m; };
    const a = toM(st.quietStart), b = toM(st.quietEnd);
    return a === b ? false : a < b ? mins >= a && mins < b : mins >= a || mins < b;
  }
  // Gentle, in-app reminders for the viewer. Returns [] during quiet hours.
  function reminders(s, viewerId, now) {
    const me = member(s, viewerId); if (!me) return [];
    const st = me.settings || defaultSettings();
    const d = new Date(now);
    if (inQuiet(st, d)) return [];
    const today = dateStr(d), out = [];
    const lead = { '15': 15, '60': 60, '180': 180 }[st.remind];
    visibleTasks(s, viewerId).forEach(t => {
      const stt = statusOf(t);
      if (stt === 'accepted' && t.ownerId === viewerId && t.time && lead) {
        const mins = Math.round((startMs(t) - now) / 60000);
        if (mins >= 0 && mins <= lead) out.push({ taskId: t.id, text: 'Coming up: ' + t.title + ' at ' + fmtTime(t.time) + (mins < 60 ? ' (in ' + mins + ' min)' : '') + '.' });
      }
      if (stt === 'accepted' && t.ownerId === viewerId && st.remind === 'evening' && d.getHours() >= 18 && t.date === addDays(today, 1))
        out.push({ taskId: t.id, text: 'Tomorrow: ' + t.title + (t.time ? ' at ' + fmtTime(t.time) : '') + '.' });
      if (stt === 'unassigned' && me.role !== 'child' && st.notify.stillNeeds !== false) {
        const hrs = (startMs(t) - now) / 36e5;
        if (t.time ? hrs >= 0 && hrs <= 24 : t.date === today) out.push({ taskId: t.id, open: true, text: 'Still needs someone: ' + t.title + ', ' + when(t, today) + '.' });
      }
    });
    return out.slice(0, 3);
  }

  return {
    ROLES, KINDS, REPEATS, COLORS, PERMISSIONS, STATUS_LABEL, MAX_ATTACH_BYTES,
    createHousehold, dispatch, join, statusOf, statusSentence, visibleTasks, todayPlan, pendingHandoffs, reminders,
    canView, canCreate, canEdit, canOffer, canInvite, isAdult, isAdmin, member, name, checkTarget,
    dateStr, parseDate, addDays, fmtTime, fmtDay, when, startMs, validDate, validTime, inQuiet, defaultSettings, clone,
  };
});
