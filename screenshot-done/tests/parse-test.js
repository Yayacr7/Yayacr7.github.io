// Run: node screenshot-done/tests/parse-test.js
// Checks the rule-based reader against realistic screenshot text, including
// controls that must NOT produce invented details.
const P = require('../parse.js');
let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.log('FAIL', name, '\n  got ', JSON.stringify(got), '\n  want', JSON.stringify(want)); }
}
const T = { today: '2026-11-19' }; // a Thursday

// 1. Dentist text message
let r = P.parse(`9:41\nMessages\nBright Smile Dental\nReminder: your dental cleaning appointment is on Tue, Nov 24, 2026 at 3:30 PM.\nLocation: 410 Main St, Blaine MN\nReply C to confirm or call 763-555-0142 to reschedule.`, T);
eq('dentist cat', r.category.value, 'appointment');
eq('dentist date', [r.date.value, r.date.level], ['2026-11-24', 'sure']);
eq('dentist time', [r.time.value, r.time.level], ['15:30', 'sure']);
eq('dentist loc', r.location.value, '410 Main St, Blaine MN');
eq('dentist phone', r.phone, '763-555-0142');
eq('dentist first action', r.actions[0], 'event');
eq('dentist status bar time ignored', r.time.value !== '09:41', true);

// 2. Receipt
r = P.parse(`Corner Cafe\nReceipt #2231\nNov 18, 2026 8:12 AM\nLatte $5.25\nBagel $3.50\nSubtotal $8.75\nTax $0.70\nTotal $9.45\nVisa ending 4242`, T);
eq('receipt cat', r.category.value, 'receipt');
eq('receipt total', [r.amount.value, r.amount.level], ['$9.45', 'sure']);
eq('receipt title', r.title.value, 'Receipt: Corner Cafe');
eq('receipt action', r.actions[0], 'receipt');
eq('receipt date', r.date.value, '2026-11-18');

// 3. Assignment, relative date must be confirmed
r = P.parse(`Canvas\nEssay: Causes of the Civil War\nDue next Friday by 11:59 PM\n1000 words, 20 points\n- Pick 3 causes\n- Find 2 sources\n- Write draft`, T);
eq('assign cat', r.category.value, 'assignment');
eq('assign title', r.title.value, 'Essay: Causes of the Civil War');
eq('assign date needs confirm', [r.date.value, r.date.level], [null, 'confirm']);
eq('assign next friday options', r.date.options, ['2026-11-20', '2026-11-27']);
eq('assign time', r.time.value, '23:59');
eq('assign deadline', r.isDeadline, true);
eq('assign checklist', r.checklist, ['Pick 3 causes', 'Find 2 sources', 'Write draft']);
eq('assign first action', r.actions[0], 'reminder');

// 4. Tomorrow must be confirmed (screenshot may be old)
r = P.parse(`Mom\nDon't forget the vet appointment tomorrow at 10am`, T);
eq('tomorrow value', [r.date.value, r.date.level], ['2026-11-20', 'confirm']);
eq('tomorrow time', r.time.value, '10:00');

// 5. No year: guessed, flagged
r = P.parse(`Holiday Lights Concert\nSat Dec 12 · Doors open 6:30 PM\nTickets: lightsfest.org`, T);
eq('concert cat', r.category.value, 'event');
eq('no year guessed', [r.date.value, r.date.level], ['2026-12-12', 'guess']);
eq('link', r.link.value, 'lightsfest.org');

// 6. Weekday mismatch is flagged
r = P.parse(`Party at Sam's\nFriday, Nov 24, 2026 7pm`, T);
eq('weekday mismatch flagged', r.date.level, 'guess');

// 7. Ambiguous slash date flagged; 25/12 read day/month
r = P.parse(`Booking confirmed\n03/04/2027 at 19:00\nTable for 2`, T);
eq('slash ambiguous', [r.date.value, r.date.level], ['2027-03-04', 'guess']);
eq('24h time', r.time.value, '19:00');
eq('booking cat', r.category.value, 'booking');
r = P.parse(`Flight check-in opens 25/12/2026`, T);
eq('day/month', r.date.value, '2026-12-25');

// 8. Time range
r = P.parse(`Team meetup\nNov 30, 2026 6-8pm\nWhere: Community Center`, T);
eq('range', [r.time.value, r.endTime.value], ['18:00', '20:00']);
eq('where label', r.location.value, 'Community Center');

// CONTROLS: nothing invented
r = P.parse(`lol ok see you`, T);
eq('control no date', r.date, null);
eq('control no time', r.time, null);
eq('control no amount', r.amount, null);
eq('control no location', r.location, null);
eq('control cat note', r.category.value, 'note');
r = P.parse('', T);
eq('empty no title', r.title, null);
eq('empty actions', r.actions[0], 'save');
r = P.parse(`Version 2.5.1\nStep 3/4`, T);
eq('control 3/4 is a date guess not sure', r.date ? r.date.level : null, 'guess');
r = P.parse(`Invalid Feb 30, 2026`, T);
eq('invalid date ignored', r.date, null);
r = P.parse(`Small $12 or large $40`, T);
eq('no total largest guess', [r.amount.value, r.amount.level], ['$40.00', 'guess']);
r = P.parse(`may 5pm be fine?`, T);
eq('may not month', r.date, null);
r = P.parse(`Email me at sam@school.edu`, T);
eq('email not link', r.link, null);
eq('email', r.email, 'sam@school.edu');

r = P.parse(`Order confirmed\nOrder #88812\nShipping $4.99\nTotal $36.18\nArrives Mon, Nov 30`, T);
eq('no shop name -> plain Receipt', r.title.value, 'Receipt');
eq('order total', r.amount.value, '$36.18');
r = P.parse(`Coach Dana\nPractice moved to Thursday, Dec 3 at 5:15 PM at Lincoln Park field 2.`, T);
eq('practice is event', r.category.value, 'event');
eq('practice date guess (no year)', [r.date.value, r.date.level], ['2026-12-03', 'guess']);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
