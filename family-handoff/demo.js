/* Sample household for demo mode. Built only through FHCore.dispatch, so it
 * can only contain states the real rules allow. Names are made up. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.FHDemo = factory(root.FHCore);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';
  function build(now) {
    now = now || Date.now();
    const today = C.dateStr(new Date(now));
    const tmr = C.addDays(today, 1), day2 = C.addDays(today, 2), yest = C.addDays(today, -1);
    let t = now - 3 * 864e5; // history starts a few days ago
    const tick = () => (t += 7 * 60000);
    let s = C.createHousehold('The Rivera household', 'Jordan', tick());
    const J = s.members[0].id;
    function run(actor, action) {
      const r = C.dispatch(s, actor, action, tick());
      if (!r.ok) throw new Error('demo: ' + action.type + ': ' + r.error);
      s = r.state; return r;
    }
    function joinAs(code, nm) { const r = C.join(s, code, nm, tick()); if (!r.ok) throw new Error(r.error); s = r.state; return r.memberId; }
    const S = joinAs(run(J, { type: 'invite', name: 'Sam', role: 'adult' }).code, 'Sam');
    const A = joinAs(run(J, { type: 'invite', name: 'Ava', role: 'teen' }).code, 'Ava');
    const L = joinAs(run(J, { type: 'invite', name: 'Leo', role: 'child' }).code, 'Leo');
    run(J, { type: 'invite', name: 'Grandma Rose', role: 'adult' }); // invited, not joined
    const task = id => s.tasks.find(x => x.id === id);
    const add = (actor, a) => run(actor, Object.assign({ type: 'createTask' }, a)).taskIds;

    // Yesterday, done
    const [lunch] = add(S, { title: 'Top up school lunch account', kind: 'errand', date: yest, time: '19:00', proposeTo: 'me' });
    run(S, { type: 'complete', taskId: lunch, rev: task(lunch).rev });

    // Today: accepted pickup with a checklist
    const [pick] = add(J, { title: 'Pick up Leo from school', kind: 'pickup', date: today, time: '15:15', details: 'Side door by the gym. Leo has art club, so he comes out at 3:15, not 3:00.', checklist: ['Booster seat', 'Library book for Leo'], proposeTo: S });
    run(S, { type: 'accept', taskId: pick, rev: task(pick).rev });

    // Today: waiting for Sam
    const [soccer] = add(J, { title: 'Drive Ava to soccer practice', kind: 'pickup', date: today, time: '17:30', details: 'Field 3 at the park. Cleats are in the hallway.', proposeTo: S, note: 'I have a late call, can you?' });

    // Today: nobody yet
    add(S, { title: 'Grocery run for the week', kind: 'errand', date: today, time: '18:30', checklist: ['Milk', 'Eggs', 'Apples', 'Rice'] });

    // Daily chore for Leo, accepted for every date
    const feed = add(J, { title: 'Feed the cat', kind: 'chore', date: today, time: '07:30', repeat: 'daily', proposeTo: L });
    run(L, { type: 'accept', taskId: feed[0], rev: task(feed[0]).rev, all: true });
    run(L, { type: 'complete', taskId: feed[0], rev: task(feed[0]).rev });

    // Tomorrow: permission slip offered to Jordan
    add(S, { title: 'Sign field trip permission slip', kind: 'form', date: tmr, time: '08:00', details: 'Science museum trip. Goes back in Leo\'s folder.', proposeTo: J, note: 'You have the pen at breakfast.' });

    // Tomorrow: Jordan is doing it but asked Sam to take over (handoff pending)
    const [dent] = add(J, { title: 'Leo dentist check-up', kind: 'appointment', date: tmr, time: '16:00', details: 'Bring the insurance card.', proposeTo: 'me' });
    run(J, { type: 'offer', taskId: dent, rev: task(dent).rev, to: S, note: 'Work moved my meeting, could you do this one?' });

    // Weekly recycling, Ava accepted all
    const rec = add(J, { title: 'Take out recycling', kind: 'chore', date: tmr, time: '19:00', repeat: 'weekly', proposeTo: A });
    run(A, { type: 'accept', taskId: rec[0], rev: task(rec[0]).rev, all: true });

    // In two days: open, and one Ava declined
    add(J, { title: 'Return library books', kind: 'errand', date: day2, details: 'Three books, due by closing time.' });
    const [band] = add(J, { title: 'Pick up Ava from band', kind: 'pickup', date: day2, time: '16:45', proposeTo: S });
    run(S, { type: 'decline', taskId: band, rev: task(band).rev, reason: 'I am at work until 6' });
    s.notes.forEach(n => { n.read = true; }); // start with a calm inbox
    return s;
  }
  return { build };
});
