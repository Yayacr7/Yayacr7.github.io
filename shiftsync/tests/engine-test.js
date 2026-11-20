// Node tests for the ShiftSync engine.  Run: node shiftsync/tests/engine-test.js
const E = require('../engine.js');
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) pass++; else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } }
const CHI = 'America/Chicago', NY = 'America/New_York';
const wpA = { id: 'a', name: 'Corner Grocery', tz: CHI, rate: 15, travelMin: 0 };
const wpB = { id: 'b', name: 'Night Diner', tz: CHI, rate: 18.5, travelMin: 25 };
const wpNY = { id: 'n', name: 'NY Store', tz: NY, rate: null, travelMin: 0 };
let n = 0; const S = (o) => Object.assign({ id: 's' + (++n), breaks: [], worked: false, actual: null, rate: null, notes: '' }, o);

/* dates */
ok('addDays month end', E.addDays('2026-11-30', 1) === '2026-12-01');
ok('addDays year end', E.addDays('2026-12-31', 1) === '2027-01-01');
ok('addDays leap', E.addDays('2028-02-28', 1) === '2028-02-29');
ok('dow Nov 23 2026 is Monday', E.dow('2026-11-23') === 1);
ok('weekStart Sunday', E.weekStart('2026-11-25', 0) === '2026-11-22');
ok('weekStart Monday', E.weekStart('2026-11-22', 1) === '2026-11-16');
ok('validYmd rejects Feb 30', !E.validYmd('2026-02-30'));
ok('validHm', E.validHm('23:59') && !E.validHm('24:00') && !E.validHm('9:00'));

/* time zones */
ok('Chicago 9:00 = 15:00Z in winter', new Date(E.zonedToMs('2026-11-23', '09:00', CHI)).toISOString() === '2026-11-23T15:00:00.000Z');
ok('Chicago 9:00 = 14:00Z in summer', new Date(E.zonedToMs('2026-07-01', '09:00', CHI)).toISOString() === '2026-07-01T14:00:00.000Z');
ok('round trip', JSON.stringify(E.msToZoned(E.zonedToMs('2026-11-23', '22:15', NY), NY)) === JSON.stringify({ ymd: '2026-11-23', hm: '22:15' }));
ok('NY shift shown in Chicago is one hour earlier', E.msToZoned(E.zonedToMs('2026-11-23', '09:00', NY), CHI).hm === '08:00');
ok('bad tz detected', !E.validTz('Mars/Olympus') && E.validTz(CHI));

/* overnight */
let t = E.times(S({ wp: 'a', date: '2026-11-23', start: '22:00', end: '06:00' }), CHI, 'scheduled');
ok('overnight flagged', t.overnight);
ok('overnight = 8 h', t.lengthMin === 480, t.lengthMin);
ok('overnight ends next day', E.msToZoned(t.endMs, CHI).ymd === '2026-11-24');
t = E.times(S({ wp: 'a', date: '2026-11-23', start: '23:30', end: '00:15' }), CHI, 'scheduled');
ok('23:30-00:15 = 45 min', t.lengthMin === 45 && t.overnight, t);
t = E.times(S({ wp: 'a', date: '2026-12-31', start: '20:00', end: '04:00' }), CHI, 'scheduled');
ok('New Year overnight ends Jan 1 2027', E.msToZoned(t.endMs, CHI).ymd === '2027-01-01' && t.lengthMin === 480);
// Clock changes (US: Nov 1 2026 back one hour, Mar 8 2026 forward one hour)
t = E.times(S({ wp: 'a', date: '2026-10-31', start: '22:00', end: '06:00' }), CHI, 'scheduled');
ok('overnight across fall-back = 9 real hours', t.lengthMin === 540, t.lengthMin);
t = E.times(S({ wp: 'a', date: '2026-03-07', start: '22:00', end: '06:00' }), CHI, 'scheduled');
ok('overnight across spring-forward = 7 real hours', t.lengthMin === 420, t.lengthMin);
t = E.times(S({ wp: 'a', date: '2026-11-23', start: '09:00', end: '17:00' }), CHI, 'scheduled');
ok('day shift not overnight', !t.overnight && t.lengthMin === 480);

/* breaks */
let sh = S({ wp: 'a', date: '2026-11-23', start: '09:00', end: '17:30', breaks: [{ min: 30, paid: false }, { min: 15, paid: true }, { min: 15, paid: true }] });
t = E.times(sh, CHI, 'scheduled');
ok('unpaid break subtracted only', t.paidMin === 480 && t.unpaidMin === 30 && t.paidBreakMin === 30, t);
ok('breaks too long rejected', E.validate(S({ wp: 'a', date: '2026-11-23', start: '09:00', end: '10:00', breaks: [{ min: 60, paid: false }] }), CHI).length === 1);
ok('same start and end rejected', E.validate(S({ wp: 'a', date: '2026-11-23', start: '09:00', end: '09:00' }), CHI)[0].includes('same'));
ok('missing date rejected', E.validate(S({ wp: 'a', date: '', start: '09:00', end: '10:00' }), CHI).length === 1);
ok('valid shift passes', E.validate(sh, CHI).length === 0);
ok('negative break ignored', E.breakTotals([{ min: -20, paid: false }]).unpaid === 0);

/* actual hours */
let worked = S({ wp: 'a', date: '2026-11-23', start: '09:00', end: '17:00', worked: true, actual: { start: '09:10', end: '18:05', breaks: [{ min: 30, paid: false }] } });
t = E.times(worked, CHI, 'effective');
ok('actual used when worked', t.actual && t.paidMin === 505, t);
ok('scheduled still available', E.times(worked, CHI, 'scheduled').paidMin === 480);
let notWorked = Object.assign({}, worked, { worked: false });
ok('actual ignored until marked worked', E.times(notWorked, CHI, 'effective').paidMin === 480);
let actualOvernight = S({ wp: 'a', date: '2026-11-23', start: '22:00', end: '06:00', worked: true, actual: { start: '22:00', end: '07:30', breaks: [] } });
ok('actual overnight stayed late', E.times(actualOvernight, CHI, 'effective').paidMin === 570);

/* conflicts */
let wps = [wpA, wpB, wpNY];
let c = E.conflicts([
  S({ id: 'x1', wp: 'a', date: '2026-11-23', start: '09:00', end: '17:00' }),
  S({ id: 'x2', wp: 'b', date: '2026-11-23', start: '16:00', end: '23:00' })
], wps);
ok('overlap found', c.length === 1 && c[0].kind === 'overlap' && c[0].minutes === 60, c);
c = E.conflicts([
  S({ id: 'y1', wp: 'a', date: '2026-11-23', start: '09:00', end: '17:00' }),
  S({ id: 'y2', wp: 'b', date: '2026-11-23', start: '17:10', end: '23:00' })
], wps);
ok('travel gap found (10 < 25 min)', c.length === 1 && c[0].kind === 'travel' && c[0].gapMin === 10 && c[0].needMin === 25, c);
ok('travel check can be off', E.conflicts([
  S({ wp: 'a', date: '2026-11-23', start: '09:00', end: '17:00' }), S({ wp: 'b', date: '2026-11-23', start: '17:10', end: '23:00' })
], wps, { travel: false }).length === 0);
c = E.conflicts([
  S({ wp: 'a', date: '2026-11-23', start: '09:00', end: '17:00' }), S({ wp: 'b', date: '2026-11-23', start: '17:30', end: '23:00' })
], wps);
ok('enough travel time = no flag', c.length === 0, c);
c = E.conflicts([
  S({ wp: 'b', date: '2026-11-23', start: '22:00', end: '06:00' }), S({ wp: 'a', date: '2026-11-24', start: '05:00', end: '13:00' })
], wps);
ok('overnight shift overlaps next morning', c.length === 1 && c[0].kind === 'overlap' && c[0].minutes === 60, c);
c = E.conflicts([
  S({ wp: 'b', date: '2026-11-23', start: '22:00', end: '06:00' }), S({ wp: 'a', date: '2026-11-24', start: '06:00', end: '13:00' })
], wps);
ok('back-to-back same travel 0 = no flag', c.length === 0, c);
c = E.conflicts([
  S({ wp: 'a', date: '2026-11-23', start: '09:00', end: '12:00' }), S({ wp: 'a', date: '2026-11-23', start: '11:00', end: '15:00' })
], wps);
ok('same job double booked = overlap', c.length === 1 && c[0].kind === 'overlap');
c = E.conflicts([
  S({ wp: 'n', date: '2026-11-23', start: '09:00', end: '12:00' }), S({ wp: 'a', date: '2026-11-23', start: '10:30', end: '14:00' })
], wps);
ok('NY 9-12 (= 8-11 Chicago) overlaps Chicago 10:30 by 30 min', c.length === 1 && c[0].minutes === 30, c);
c = E.conflicts([
  S({ wp: 'a', date: '2026-11-23', start: '09:00', end: '17:00' }), S({ wp: 'b', date: '2026-11-23', start: '16:00', end: '23:00', worked: true, actual: { start: '17:00', end: '23:00', breaks: [] } })
], wps);
ok('actual hours used for overlap after worked (now only a travel gap)', c.length === 1 && c[0].kind === 'travel' && c[0].gapMin === 0, c);
c = E.conflicts([S({ wp: 'a', date: '2026-11-23', start: '09:00', end: '17:00' }), S({ wp: 'b', date: '2026-11-25', start: '09:00', end: '17:00' })], wps);
ok('different days no conflict', c.length === 0);

/* earnings */
const from = E.zonedToMs('2026-11-22', '00:00', CHI), to = E.zonedToMs('2026-11-29', '00:00', CHI), now = E.zonedToMs('2026-11-25', '12:00', CHI);
let ear = E.earnings([
  S({ wp: 'a', date: '2026-11-23', start: '09:00', end: '17:30', breaks: [{ min: 30, paid: false }], worked: true }), // 8h x 15 = 120
  S({ wp: 'b', date: '2026-11-24', start: '22:00', end: '06:00', worked: true, actual: { start: '22:00', end: '06:30', breaks: [] } }), // 8.5h x 18.5 = 157.25
  S({ wp: 'a', date: '2026-11-24', start: '09:00', end: '13:00' }), // past, not marked: needs check, scheduled
  S({ wp: 'a', date: '2026-11-27', start: '09:00', end: '13:00', rate: 20 }), // future 4h x 20 = 80 scheduled
  S({ wp: 'n', date: '2026-11-26', start: '09:00', end: '12:00', worked: true }), // no rate
  S({ wp: 'a', date: '2026-11-30', start: '09:00', end: '13:00', worked: true }) // outside week
], wps, from, to, now);
ok('confirmed gross = 277.25', ear.confirmedGross === 277.25, ear);
ok('confirmed minutes = 8 + 8.5 + 3 h', ear.confirmedMin === 480 + 510 + 180, ear.confirmedMin);
ok('scheduled gross = 4h x15 + 4h x20', ear.scheduledGross === 140, ear.scheduledGross);
ok('unrated hours counted not paid', ear.unratedMin === 180 && ear.byWp.n.confirmedGross === 0);
ok('past unmarked shift needs check', ear.needsCheck === 1, ear.needsCheck);
ok('per-shift rate overrides workplace rate', ear.byWp.a.scheduledGross === 140);
ear = E.earnings([S({ wp: 'a', date: '2026-11-28', start: '22:00', end: '06:00', worked: true })], wps, from, to);
ok('overnight shift counts in week it starts', ear.confirmedMin === 480);

/* replacement */
const existing = [
  S({ id: 'e1', wp: 'a', date: '2026-11-23', start: '09:00', end: '17:00', notes: 'bring vest' }),
  S({ id: 'e2', wp: 'a', date: '2026-11-24', start: '09:00', end: '17:00' }),
  S({ id: 'e3', wp: 'a', date: '2026-11-25', start: '12:00', end: '20:00' }),
  S({ id: 'e4', wp: 'a', date: '2026-11-22', start: '09:00', end: '13:00', worked: true }),
  S({ id: 'e5', wp: 'b', date: '2026-11-24', start: '18:00', end: '23:00' }),
  S({ id: 'e6', wp: 'a', date: '2026-12-01', start: '09:00', end: '17:00' })
];
const incoming = [
  S({ id: 'i1', wp: 'a', date: '2026-11-23', start: '09:00', end: '17:00' }),
  S({ id: 'i2', wp: 'a', date: '2026-11-24', start: '10:00', end: '18:00' }),
  S({ id: 'i3', wp: 'a', date: '2026-11-27', start: '22:00', end: '06:00' })
];
let plan = E.planReplace(existing, incoming, 'a', '2026-11-22', '2026-11-28');
ok('plan same', plan.same.length === 1 && plan.same[0].old.id === 'e1');
ok('plan changed', plan.changed.length === 1 && plan.changed[0].old.id === 'e2' && plan.changed[0].neu.id === 'i2');
ok('plan add', plan.add.length === 1 && plan.add[0].id === 'i3');
ok('plan remove (not in new schedule)', plan.remove.length === 1 && plan.remove[0].id === 'e3');
ok('worked shift kept', plan.keptWorked.length === 1 && plan.keptWorked[0].id === 'e4');
ok('replacing count', plan.replacing === 2 && plan.existingCount === 4);
let after = E.applyPlan(existing, plan, 123);
const ids = after.map(s => s.id).sort();
ok('apply result', JSON.stringify(ids) === JSON.stringify(['e1', 'e4', 'e5', 'e6', 'i2', 'i3']), ids);
ok('other workplace untouched', after.some(s => s.id === 'e5'));
ok('outside range untouched', after.some(s => s.id === 'e6'));
ok('unchanged shift keeps notes + gets confirmed time', after.find(s => s.id === 'e1').notes === 'bring vest' && after.find(s => s.id === 'e1').confirmedAt === 123);
ok('input array not changed', existing.length === 6 && existing[0].confirmedAt === undefined);
plan = E.planReplace(existing, incoming, 'a', '2026-11-22', '2026-11-28', { keepWorked: false });
ok('keepWorked false removes worked', plan.remove.some(s => s.id === 'e4'));
plan = E.planReplace([], incoming, 'a', '2026-11-22', '2026-11-28');
ok('empty calendar = nothing replaced', plan.replacing === 0 && plan.add.length === 3);
// worked shift on a day the new schedule changes: kept, new one added
plan = E.planReplace([S({ id: 'w1', wp: 'a', date: '2026-11-24', start: '09:00', end: '17:00', worked: true })], [S({ id: 'w2', wp: 'a', date: '2026-11-24', start: '10:00', end: '18:00' })], 'a', '2026-11-22', '2026-11-28');
ok('worked shift not replaced by changed one', plan.keptWorked.length === 1 && plan.add.length === 1 && plan.changed.length === 0);
// two shifts on one day (split shift)
plan = E.planReplace([S({ id: 'p1', wp: 'a', date: '2026-11-23', start: '07:00', end: '11:00' }), S({ id: 'p2', wp: 'a', date: '2026-11-23', start: '16:00', end: '20:00' })],
  [S({ id: 'p3', wp: 'a', date: '2026-11-23', start: '16:00', end: '20:00' })], 'a', '2026-11-22', '2026-11-28');
ok('split shift: one same, one removed', plan.same.length === 1 && plan.same[0].old.id === 'p2' && plan.remove.length === 1 && plan.remove[0].id === 'p1');

/* export */
let file = E.ics([S({ id: 'k1', wp: 'b', date: '2026-11-24', start: '22:00', end: '06:00', breaks: [{ min: 30, paid: false }] })], wps, { alarmMin: 60, now: Date.UTC(2026, 10, 20) });
ok('ics UTC start', file.includes('DTSTART:20261125T040000Z'), file);
ok('ics overnight end next day', file.includes('DTEND:20261125T120000Z'));
ok('ics alarm', file.includes('TRIGGER:-PT60M'));
ok('ics says employer schedule is official', file.includes('official'));
ok('ics CRLF', file.includes('\r\n') && file.split('\r\n').every(l => l.length <= 75));
ok('ics no alarm when off', !E.ics([S({ wp: 'a', date: '2026-11-24', start: '09:00', end: '10:00' })], wps, {}).includes('VALARM'));
let sheet = E.csv([S({ wp: 'a', date: '2026-11-23', start: '09:00', end: '17:30', breaks: [{ min: 30, paid: false }], worked: true, notes: 'Hi, "there"' })], wps);
ok('csv paid hours + gross', sheet.includes(',8,15.00,120.00,'), sheet);
ok('csv quotes', sheet.includes('"Hi, ""there"""'));

/* colours */
E.COLORS.forEach(col => ok('colour ' + col.name + ' >= 4.5:1 on white', E.contrast(col.hex, '#FFFFFF') >= 4.5, E.contrast(col.hex, '#FFFFFF').toFixed(2)));
ok('colours unique', new Set(E.COLORS.map(c => c.hex)).size === E.COLORS.length);

console.log(`engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
