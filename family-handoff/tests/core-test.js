// Rules tests: invitations, permissions, assignment/acceptance, reassignment, conflicts.
// Run: node family-handoff/tests/core-test.js
const C = require('../core.js');
const D = require('../demo.js');
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) pass++; else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } }

const NOW = new Date(2026, 10, 20, 9, 0).getTime(); // Fri Nov 20 2026, 9:00 local
const TODAY = C.dateStr(new Date(NOW)), TMR = C.addDays(TODAY, 1);
let clock = NOW;
const tick = () => (clock += 60000);

function house() {
  let s = C.createHousehold('Test home', 'Alex', tick());
  const A = s.members[0].id;
  const r = (who, a) => { const x = C.dispatch(s, who, a, tick()); if (x.ok) s = x.state; return x; };
  const j = (code, n) => { const x = C.join(s, code, n, tick()); if (x.ok) s = x.state; return x; };
  const B = j(r(A, { type: 'invite', name: 'Blake', role: 'adult' }).code).memberId;
  const T = j(r(A, { type: 'invite', name: 'Tess', role: 'teen' }).code).memberId;
  const K = j(r(A, { type: 'invite', name: 'Kai', role: 'child' }).code).memberId;
  return { get s() { return s; }, set s(v) { s = v; }, r, j, A, B, T, K, task: id => s.tasks.find(t => t.id === id) };
}
function add(h, who, a) { const x = h.r(who, Object.assign({ type: 'createTask', date: TODAY, time: '15:00', kind: 'other' }, a)); if (!x.ok) throw new Error(x.error); return x.taskIds[0]; }

/* ---------- invitations ---------- */
{
  const h = house();
  ok('household has 4 members after 3 joins', h.s.members.length === 4);
  const inv = h.r(h.A, { type: 'invite', name: 'Rose', role: 'adult' });
  ok('invite returns a 6-letter code', inv.ok && /^[A-Z2-9]{6}$/.test(inv.code), inv);
  ok('invited person is NOT a member', !h.s.members.some(m => m.name === 'Rose'));
  const t = add(h, h.A, { title: 'Pickup', kind: 'pickup' });
  const off = h.r(h.A, { type: 'offer', taskId: t, rev: h.task(t).rev, to: inv.inviteId });
  ok('cannot ask an invited person who has not joined', !off.ok && off.code === 'not_joined', off);
  ok('duplicate pending invite refused', h.r(h.A, { type: 'invite', name: 'rose', role: 'adult' }).code === 'duplicate');
  ok('teen cannot invite', h.r(h.T, { type: 'invite', name: 'Pal', role: 'teen' }).code === 'forbidden');
  ok('child cannot invite', h.r(h.K, { type: 'invite', name: 'Pal', role: 'child' }).code === 'forbidden');
  ok('adult (non-admin) cannot invite an admin', h.r(h.B, { type: 'invite', name: 'Boss', role: 'admin' }).code === 'forbidden');
  ok('adult can invite a child', h.r(h.B, { type: 'invite', name: 'Kid2', role: 'child' }).ok);
  ok('unknown code refused', h.j('ZZZZZZ').code === 'invite_unknown');
  const lower = h.j(inv.code.toLowerCase().split('').join(' '), 'Rose');
  ok('join works with lower case and spaces', lower.ok);
  ok('joined member has invited role', C.member(h.s, lower.memberId).role === 'adult');
  ok('used code refused', h.j(inv.code).code === 'invite_used');
  const inv2 = h.r(h.A, { type: 'invite', name: 'Gone', role: 'teen' });
  ok('adult who did not send it cannot revoke', h.r(h.B, { type: 'revokeInvite', inviteId: inv2.inviteId }).code === 'forbidden');
  ok('admin revokes', h.r(h.A, { type: 'revokeInvite', inviteId: inv2.inviteId }).ok);
  ok('revoked code refused', h.j(inv2.code).code === 'invite_revoked');
  const inv3 = h.r(h.A, { type: 'invite', name: 'Late', role: 'teen' });
  const late = C.join(h.s, inv3.code, 'Late', clock + 8 * 864e5);
  ok('expired code refused (after 7 days)', late.code === 'invite_expired');
  ok('member colors are unique', new Set(h.s.members.map(m => m.color)).size === h.s.members.length);
  ok('inviter notified when someone joins', h.s.notes.some(n => n.to === h.A && /Rose joined/.test(n.text)));
}

/* ---------- permissions ---------- */
{
  const h = house();
  ok('child cannot create', h.r(h.K, { type: 'createTask', title: 'x', date: TODAY }).code === 'forbidden');
  ok('teen can create', h.r(h.T, { type: 'createTask', title: 'Ride to practice', date: TODAY, kind: 'pickup', proposeTo: h.A }).ok);
  const pick = add(h, h.A, { title: 'School pickup', kind: 'pickup' });
  ok('pickup cannot be offered to a child', h.r(h.A, { type: 'offer', taskId: pick, rev: h.task(pick).rev, to: h.K }).code === 'child_not_allowed');
  ok('pickup cannot be created for a child', h.r(h.A, { type: 'createTask', title: 'p', date: TODAY, kind: 'pickup', proposeTo: h.K }).code === 'child_not_allowed');
  const chore = add(h, h.A, { title: 'Feed fish', kind: 'chore', proposeTo: h.K });
  const other = add(h, h.A, { title: 'Pay bill', kind: 'errand' });
  const kidView = C.visibleTasks(h.s, h.K).map(t => t.id);
  ok('child sees tasks offered to them', kidView.includes(chore));
  ok('child does not see others\' tasks', !kidView.includes(other) && !kidView.includes(pick));
  ok('child cannot open others\' task', h.r(h.K, { type: 'claim', taskId: other, rev: h.task(other).rev }).code === 'forbidden');
  ok('teen sees everything', C.visibleTasks(h.s, h.T).length === h.s.tasks.length);
  ok('teen cannot edit an adult\'s task', h.r(h.T, { type: 'edit', taskId: other, rev: h.task(other).rev, changes: { title: 'x' } }).code === 'forbidden');
  ok('teen cannot cancel an adult\'s task', h.r(h.T, { type: 'cancel', taskId: other, rev: h.task(other).rev }).code === 'forbidden');
  const teenTask = add(h, h.T, { title: 'Study group snacks', kind: 'errand' });
  ok('teen can edit their own', h.r(h.T, { type: 'edit', taskId: teenTask, rev: h.task(teenTask).rev, changes: { details: 'chips' } }).ok);
  ok('adult cannot change roles', h.r(h.B, { type: 'setRole', memberId: h.T, role: 'adult' }).code === 'forbidden');
  ok('adult cannot remove people', h.r(h.B, { type: 'removeMember', memberId: h.T }).code === 'forbidden');
  ok('last admin cannot demote self', h.r(h.A, { type: 'setRole', memberId: h.A, role: 'adult' }).code === 'last_admin');
  ok('admin promotes Blake', h.r(h.A, { type: 'setRole', memberId: h.B, role: 'admin' }).ok);
  ok('with two admins, one may step down', h.r(h.A, { type: 'setRole', memberId: h.A, role: 'adult' }).ok);
  ok('now Alex cannot change roles', h.r(h.A, { type: 'setRole', memberId: h.T, role: 'adult' }).code === 'forbidden');
  ok('non-member cannot act', C.dispatch(h.s, 'm_nobody', { type: 'createTask', title: 'x', date: TODAY }).code === 'not_member');
  // Nobody can accept for someone else, not even an admin.
  const slip = add(h, h.T, { title: 'Sign slip', kind: 'form', proposeTo: h.B });
  const forced = h.r(h.B === h.A ? h.T : h.A, { type: 'accept', taskId: slip, rev: h.task(slip).rev });
  ok('cannot accept on behalf of someone else', forced.code === 'only_target', forced);
  ok('cannot decline on behalf of someone else', h.r(h.A, { type: 'decline', taskId: slip, rev: h.task(slip).rev }).code === 'only_target');
  ok('still not accepted after refused attempts', C.statusOf(h.task(slip)) === 'awaiting');
}

/* ---------- assignment and acceptance ---------- */
{
  const h = house();
  const t = add(h, h.A, { title: 'Dentist', kind: 'appointment', proposeTo: h.B, note: 'Can you?' });
  const hist0 = h.task(t).history.map(e => e.text);
  ok('assignment is not acceptance', C.statusOf(h.task(t)) === 'awaiting' && h.task(t).ownerId === null);
  ok('target notified of the request', h.s.notes.some(n => n.to === h.B && n.kind === 'offer'));
  ok('status sentence says not covered', /Not covered yet/.test(C.statusSentence(h.s, h.task(t), h.A)));
  ok('no wording claims anyone saw it', !/\bseen\b|\bsaw\b|\bread\b/i.test(JSON.stringify(h.s.tasks.map(x => x.history))));
  ok('Today counts it as waiting, not covered', C.todayPlan(h.s, h.A, TODAY).counts.waiting === 1 && C.todayPlan(h.s, h.A, TODAY).counts.covered === 0);
  ok('it appears in Blake\'s "Asked of you"', C.todayPlan(h.s, h.B, TODAY).forYou.some(x => x.id === t));
  const d = h.r(h.B, { type: 'decline', taskId: t, rev: h.task(t).rev, reason: 'At work' });
  ok('decline works', d.ok);
  ok('declined with no owner -> Still needs someone', C.statusOf(h.task(t)) === 'unassigned' && C.todayPlan(h.s, h.A, TODAY).stillNeeds.some(x => x.id === t));
  ok('asker told about the decline with reason', h.s.notes.some(n => n.to === h.A && /cannot take Dentist \("At work"\)/.test(n.text)));
  ok('offer to Tess', h.r(h.A, { type: 'offer', taskId: t, rev: h.task(t).rev, to: h.T }).ok);
  ok('Tess accepts', h.r(h.T, { type: 'accept', taskId: t, rev: h.task(t).rev }).ok);
  ok('accepted -> owner Tess', C.statusOf(h.task(t)) === 'accepted' && h.task(t).ownerId === h.T);
  ok('asker notified of acceptance', h.s.notes.some(n => n.to === h.A && /Tess accepted/.test(n.text)));
  // Handoff: owner stays responsible until the new person accepts.
  ok('Tess hands off to Blake', h.r(h.T, { type: 'offer', taskId: t, rev: h.task(t).rev, to: h.B }).ok);
  ok('during handoff Tess is still responsible', h.task(t).ownerId === h.T && C.statusOf(h.task(t)) === 'accepted' && h.task(t).offer.to === h.B);
  ok('history says still responsible until accepted', /Tess is still responsible until Blake accepts/.test(h.task(t).history.slice(-1)[0].text));
  ok('Blake declines the handoff', h.r(h.B, { type: 'decline', taskId: t, rev: h.task(t).rev }).ok);
  ok('after declined handoff Tess still owns it', h.task(t).ownerId === h.T && !h.task(t).offer);
  ok('Tess told she is still responsible', h.s.notes.some(n => n.to === h.T && /You are still responsible/.test(n.text)));
  ok('adult suggests Alex take over', h.r(h.B, { type: 'offer', taskId: t, rev: h.task(t).rev, to: h.A }).ok);
  ok('Alex accepts the handoff', h.r(h.A, { type: 'accept', taskId: t, rev: h.task(t).rev }).ok);
  ok('ownership moved only after acceptance', h.task(t).ownerId === h.A);
  ok('previous owner told', h.s.notes.some(n => n.to === h.T && /took over Dentist from you/.test(n.text)));
  ok('cannot offer to the current owner', h.r(h.B, { type: 'offer', taskId: t, rev: h.task(t).rev, to: h.A }).code === 'invalid');
  // Release
  ok('Alex says he cannot', h.r(h.A, { type: 'release', taskId: t, rev: h.task(t).rev, reason: 'Sick' }).ok);
  ok('released -> Still needs someone', C.statusOf(h.task(t)) === 'unassigned');
  ok('everyone except kids told it needs someone', h.s.notes.some(n => n.to === h.B && /Still needs someone: Dentist/.test(n.text)) && !h.s.notes.some(n => n.to === h.K && /Dentist/.test(n.text)));
  // Claim, complete, reopen
  ok('Blake takes it', h.r(h.B, { type: 'claim', taskId: t, rev: h.task(t).rev }).ok);
  ok('teen cannot mark Blake\'s task done', h.r(h.T, { type: 'complete', taskId: t, rev: h.task(t).rev }).code === 'forbidden');
  ok('Blake marks done', h.r(h.B, { type: 'complete', taskId: t, rev: h.task(t).rev }).ok && C.statusOf(h.task(t)) === 'completed');
  ok('cannot offer a done task', h.r(h.A, { type: 'offer', taskId: t, rev: h.task(t).rev, to: h.T }).code === 'closed');
  ok('Blake reopens', h.r(h.B, { type: 'reopen', taskId: t, rev: h.task(t).rev }).ok && C.statusOf(h.task(t)) === 'accepted');
  // Withdraw
  const w = add(h, h.A, { title: 'Groceries', kind: 'errand', proposeTo: h.T });
  ok('withdraw request', h.r(h.A, { type: 'withdrawOffer', taskId: w, rev: h.task(w).rev }).ok && C.statusOf(h.task(w)) === 'unassigned');
  ok('target told it is no longer needed', h.s.notes.some(n => n.to === h.T && /No longer needed from you: Groceries/.test(n.text)));
  ok('awaiting task cannot be completed by someone else', (() => { h.r(h.A, { type: 'offer', taskId: w, rev: h.task(w).rev, to: h.T }); return h.r(h.B, { type: 'complete', taskId: w, rev: h.task(w).rev }).code === 'awaiting'; })());
  ok('history is append-only (earlier entries unchanged)', JSON.stringify(h.task(t).history.slice(0, hist0.length).map(e => e.text)) === JSON.stringify(hist0) && h.task(t).history.length > hist0.length + 10);
}

/* ---------- reassignment by edits and removals ---------- */
{
  const h = house();
  const t = add(h, h.A, { title: 'Pickup Kai', kind: 'pickup', proposeTo: h.B });
  h.r(h.B, { type: 'accept', taskId: t, rev: h.task(t).rev });
  ok('details change keeps the owner', h.r(h.A, { type: 'edit', taskId: t, rev: h.task(t).rev, changes: { details: 'Side door' } }).ok && h.task(t).ownerId === h.B);
  ok('owner told about detail change', h.s.notes.some(n => n.to === h.B && /updated the details/.test(n.text)));
  h.r(h.A, { type: 'edit', taskId: t, rev: h.task(t).rev, changes: { time: '15:45' } });
  ok('time change -> owner must confirm again', h.task(t).ownerId === null && h.task(t).offer && h.task(t).offer.to === h.B);
  ok('history shows the old and new time', h.task(t).history.some(e => /from 3:00 PM to 3:45 PM/.test(e.text)));
  ok('re-confirm', h.r(h.B, { type: 'accept', taskId: t, rev: h.task(t).rev }).ok && h.task(t).ownerId === h.B);
  ok('owner editing their own time stays owner', h.r(h.B, { type: 'edit', taskId: t, rev: h.task(t).rev, changes: { time: '16:00' } }).ok && h.task(t).ownerId === h.B);
  ok('no-op edit refused', h.r(h.A, { type: 'edit', taskId: t, rev: h.task(t).rev, changes: { time: '16:00' } }).code === 'no_change');
  const c = add(h, h.A, { title: 'Walk dog', kind: 'chore', proposeTo: h.K });
  h.r(h.K, { type: 'accept', taskId: c, rev: h.task(c).rev });
  h.r(h.A, { type: 'edit', taskId: c, rev: h.task(c).rev, changes: { kind: 'pickup', title: 'Pick up dog from vet' } });
  ok('changing to a pickup removes a child owner', h.task(c).ownerId === null && C.statusOf(h.task(c)) === 'unassigned');
  const r = add(h, h.A, { title: 'Bank', kind: 'errand', proposeTo: h.T });
  const r2 = add(h, h.A, { title: 'Post office', kind: 'errand', proposeTo: h.T });
  h.r(h.T, { type: 'accept', taskId: r, rev: h.task(r).rev });
  ok('admin removes Tess', h.r(h.A, { type: 'removeMember', memberId: h.T }).ok);
  ok('her accepted task needs someone again', C.statusOf(h.task(r)) === 'unassigned' && /left the household/.test(h.task(r).history.slice(-1)[0].text));
  ok('request to her withdrawn', h.task(r2).offer === null);
  ok('cannot remove the last admin', h.r(h.A, { type: 'removeMember', memberId: h.A }).code === 'last_admin');
  ok('removed member cannot act', h.r(h.T, { type: 'claim', taskId: r, rev: h.task(r).rev }).code === 'not_member');
  ok('cancel keeps the task in history', h.r(h.A, { type: 'cancel', taskId: r2, rev: h.task(r2).rev }).ok && h.task(r2).cancelledAt && h.task(r2).history.length > 1);
}

/* ---------- conflicting updates ---------- */
{
  const h = house();
  const t = add(h, h.A, { title: 'Groceries', kind: 'errand' });
  const base = h.s, rev = h.task(t).rev;
  // Two people tap "I'll take it" on the same screen version.
  const first = C.dispatch(base, h.B, { type: 'claim', taskId: t, rev }, tick());
  ok('first claim wins', first.ok);
  const second = C.dispatch(first.state, h.T, { type: 'claim', taskId: t, rev }, tick());
  ok('second claim refused with a clear message', !second.ok && second.code === 'already_taken' && /Blake is already doing this/.test(second.error), second);
  // Stale edit after someone accepted.
  h.s = first.state;
  const staleEdit = h.r(h.A, { type: 'edit', taskId: t, rev, changes: { time: '18:00' } });
  ok('stale edit refused as conflict', staleEdit.code === 'conflict' && /Blake took this/.test(staleEdit.error), staleEdit);
  ok('nothing changed by refused edit', h.task(t).time === '15:00');
  ok('conflict reports latest rev', staleEdit.extra && staleEdit.extra.rev === h.task(t).rev);
  ok('retry with latest rev works', h.r(h.A, { type: 'edit', taskId: t, rev: h.task(t).rev, changes: { time: '18:00' } }).ok);
  // Offer withdrawn while target was accepting.
  const o = add(h, h.A, { title: 'Library', kind: 'errand', proposeTo: h.T });
  const seen = h.task(o).rev;
  h.r(h.A, { type: 'withdrawOffer', taskId: o, rev: seen });
  const lateAccept = h.r(h.T, { type: 'accept', taskId: o, rev: seen });
  ok('accepting a withdrawn request refused', !lateAccept.ok && C.statusOf(h.task(o)) === 'unassigned', lateAccept);
  // Request moved to someone else while the first person was accepting.
  h.r(h.A, { type: 'offer', taskId: o, rev: h.task(o).rev, to: h.T });
  const seen2 = h.task(o).rev;
  h.r(h.A, { type: 'offer', taskId: o, rev: seen2, to: h.B });
  const wrong = h.r(h.T, { type: 'accept', taskId: o, rev: seen2 });
  ok('accepting after request went to someone else refused', wrong.code === 'only_target' && h.task(o).ownerId === null);
  // Two edits from the same version: second is refused.
  const e1 = h.task(o).rev;
  ok('edit 1 ok', h.r(h.A, { type: 'edit', taskId: o, rev: e1, changes: { title: 'Library run' } }).ok);
  ok('edit 2 from the same version refused', h.r(h.B, { type: 'edit', taskId: o, rev: e1, changes: { title: 'Library trip' } }).code === 'conflict');
  ok('first edit kept', h.task(o).title === 'Library run');
  // Double accept: second tap on an old screen.
  const a1 = h.task(o).rev;
  ok('Blake accepts', h.r(h.B, { type: 'accept', taskId: o, rev: a1 }).ok);
  const again = h.r(h.B, { type: 'accept', taskId: o, rev: a1 });
  ok('double accept refused, no duplicate history', !again.ok && h.task(o).history.filter(x => x.type === 'accept').length === 1);
  // Checklist ticks never cause false conflicts.
  const ck = add(h, h.A, { title: 'Pack bag', kind: 'chore', checklist: ['Water', 'Snack'], proposeTo: 'me' });
  const rv = h.task(ck).rev;
  h.r(h.A, { type: 'setCheck', taskId: ck, itemId: h.task(ck).checklist[0].id, done: true });
  ok('checklist tick does not change revision', h.task(ck).rev === rv);
  ok('complete still works after a tick', h.r(h.A, { type: 'complete', taskId: ck, rev: rv }).ok);
  const fresh = add(h, h.A, { title: 'Fresh', kind: 'errand' });
  ok('missing revision refused (unassigned)', h.r(h.B, { type: 'claim', taskId: fresh }).code === 'missing_rev');
}

/* ---------- recurring ---------- */
{
  const h = house();
  const r = h.r(h.A, { type: 'createTask', title: 'Recycling', kind: 'chore', date: TODAY, time: '19:00', repeat: 'weekly', proposeTo: h.T });
  ok('weekly makes 8 dates', r.taskIds.length === 8);
  ok('one notification for the whole series', h.s.notes.filter(n => n.to === h.T && /Recycling/.test(n.text)).length === 1);
  ok('each date waits for acceptance', r.taskIds.every(id => C.statusOf(h.task(id)) === 'awaiting'));
  const acc = h.r(h.T, { type: 'accept', taskId: r.taskIds[0], rev: h.task(r.taskIds[0]).rev, all: true });
  ok('accept all accepts every date', acc.ok && acc.acceptedMore === 7 && r.taskIds.every(id => h.task(id).ownerId === h.T));
  const wd = h.r(h.A, { type: 'createTask', title: 'School run', kind: 'pickup', date: TODAY, time: '08:00', repeat: 'weekdays' });
  ok('weekdays skip weekends', wd.taskIds.every(id => { const d = C.parseDate(h.task(id).date).getDay(); return d !== 0 && d !== 6; }) && wd.taskIds.length >= 9);
  const dl = h.r(h.A, { type: 'createTask', title: 'Meds', kind: 'chore', date: TODAY, repeat: 'daily', proposeTo: h.B });
  h.r(h.B, { type: 'accept', taskId: dl.taskIds[0], rev: h.task(dl.taskIds[0]).rev });
  ok('accepting one date does not accept the others', h.task(dl.taskIds[1]).ownerId === null);
}

/* ---------- validation, files, notifications, reminders ---------- */
{
  const h = house();
  ok('title required', h.r(h.A, { type: 'createTask', title: '  ', date: TODAY }).code === 'invalid');
  ok('bad date refused', h.r(h.A, { type: 'createTask', title: 'x', date: '2026-02-30' }).code === 'invalid');
  ok('bad time refused', h.r(h.A, { type: 'createTask', title: 'x', date: TODAY, time: '25:00' }).code === 'invalid');
  ok('cannot propose to yourself by id', h.r(h.A, { type: 'createTask', title: 'x', date: TODAY, proposeTo: h.A }).code === 'invalid');
  const t = add(h, h.A, { title: 'Field trip', kind: 'form', proposeTo: 'me' });
  ok('"I will do it" accepts at once', h.task(t).ownerId === h.A);
  ok('attachment too big refused', h.r(h.A, { type: 'addAttachment', taskId: t, name: 'big.jpg', mime: 'image/jpeg', size: 500 * 1024, data: 'x' }).code === 'too_big');
  ok('wrong file type refused', h.r(h.A, { type: 'addAttachment', taskId: t, name: 'a.exe', mime: 'application/x-msdownload', size: 10 }).code === 'invalid');
  for (let i = 0; i < 3; i++) h.r(h.A, { type: 'addAttachment', taskId: t, name: 'p' + i + '.png', mime: 'image/png', size: 100, data: 'data:image/png;base64,AA' });
  ok('max 3 files', h.r(h.A, { type: 'addAttachment', taskId: t, name: 'p4.png', mime: 'image/png', size: 100 }).code === 'invalid' && h.task(t).attachments.length === 3);
  ok('teen cannot add files to an adult\'s task', h.r(h.T, { type: 'addAttachment', taskId: t, name: 'x.png', mime: 'image/png', size: 1 }).code === 'forbidden');
  // Notification settings respected
  h.r(h.B, { type: 'updateSettings', settings: { notify: { offers: false } } });
  const before = h.s.notes.filter(n => n.to === h.B).length;
  add(h, h.A, { title: 'Quiet one', kind: 'errand', proposeTo: h.B });
  ok('offers muted -> no note, but the request still exists', h.s.notes.filter(n => n.to === h.B).length === before && h.s.tasks.some(x => x.title === 'Quiet one' && x.offer.to === h.B));
  ok('actor never notifies themself', !h.s.notes.some(n => n.to === h.A && /Alex asked you/.test(n.text)));
  ok('bad settings refused', h.r(h.A, { type: 'updateSettings', settings: { remind: 'often' } }).code === 'invalid');
  // Reminders
  const soon = add(h, h.A, { title: 'Soon thing', kind: 'errand', time: '09:30', proposeTo: 'me' });
  const rem = C.reminders(h.s, h.A, NOW);
  ok('reminder 30 min before (1 h setting)', rem.some(x => x.taskId === soon && /in 30 min/.test(x.text)), rem);
  ok('reminder wording is gentle', rem.every(x => !/overdue|late|failed|!/i.test(x.text)));
  h.r(h.A, { type: 'updateSettings', settings: { quietStart: '08:00', quietEnd: '10:00' } });
  ok('no reminders in quiet hours', C.reminders(h.s, h.A, NOW).length === 0);
  ok('quiet hours across midnight', C.inQuiet({ quietStart: '21:00', quietEnd: '07:00' }, new Date(2026, 10, 20, 23, 0)) && !C.inQuiet({ quietStart: '21:00', quietEnd: '07:00' }, new Date(2026, 10, 20, 12, 0)));
  ok('child gets no "still needs someone" reminders', C.reminders(h.s, h.K, NOW).every(x => !x.open));
}

/* ---------- demo household and design checks ---------- */
{
  const s = D.build(NOW);
  ok('demo builds through the rules', s.members.length === 4 && s.invites.some(i => i.status === 'pending'));
  const J = s.members[0].id;
  const p = C.todayPlan(s, J, TODAY);
  ok('demo today has each status', p.counts.needs >= 1 && p.counts.waiting >= 1 && p.counts.covered >= 1 && p.counts.done >= 1, p.counts);
  ok('demo has a pending handoff with an owner', s.tasks.some(t => t.ownerId && t.offer));
  ok('demo starts with a calm inbox', s.notes.every(n => n.read));
  // Member colors: white text contrast >= 4.5
  const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = hex => 1.05 / (lum(hex) + 0.05);
  C.COLORS.forEach(c => ok('white on ' + c + ' >= 4.5 (' + ratio(c).toFixed(2) + ')', ratio(c) >= 4.5));
  // No rankings or guilt words anywhere in the rules text.
  const src = require('fs').readFileSync(__dirname + '/../core.js', 'utf8') + require('fs').readFileSync(__dirname + '/../app.js', 'utf8');
  ok('no ranking/guilt words', !/leaderboard|\bscore\b|\branking\b|overdue|you failed|lazy|shame/i.test(src));
  ok('no "guarantee" promise (only the disclaimer)', !/(?<!cannot )guarantees? (your|a) child|keeps? your kids safe/i.test(src) && /cannot guarantee a child/.test(src));
  ok('no location tracking code', !/geolocation|watchPosition/.test(src));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
