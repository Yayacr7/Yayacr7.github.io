// Node tests for the schedule reader.  Run: node shiftsync/tests/reader-test.js
const R = require('../reader.js');
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) pass++; else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } }
const TODAY = '2026-11-20';
function rg(s) { const r = R.parseRange(s); return r ? r.start + '-' + r.end + (r.guessed ? '?' : '') : null; }

/* times */
[['9a-5p', '09:00-17:00'], ['9:00 AM - 5:30 PM', '09:00-17:30'], ['9:00a–5:30p', '09:00-17:30'], ['10p-6a', '22:00-06:00'],
 ['22:00-06:00', '22:00-06:00'], ['06:00-14:30', '06:00-14:30'], ['0600-1430', '06:00-14:30'], ['9-5p', '09:00-17:00'],
 ['11-7p', '11:00-19:00'], ['5-11p', '17:00-23:00'], ['9a-5', '09:00-17:00'], ['10p-6', '22:00-06:00'], ['noon to 8pm', '12:00-20:00'],
 ['4pm - midnight', '16:00-00:00'], ['9.30am-6pm', '09:30-18:00'], ['7:00 a.m. - 3:00 p.m.', '07:00-15:00'], ['12p-8:30p', '12:00-20:30'],
 ['9-5', '09:00-17:00?'], ['2-10', '14:00-22:00?'], ['10-6', '10:00-18:00?'], ['6-2', '06:00-14:00?'], ['Cashier 7a-3p', '07:00-15:00'],
 ['9:O0a-5:00p', '09:00-17:00']
].forEach(([i, o]) => ok('range ' + i, rg(i) === o, rg(i)));
['OFF', 'call me', '13a-5p', '25:00-26:00', '9a-9a', 'Nov 23', '11/23'].forEach(i => ok('not a range: ' + i, rg(i) === null, rg(i)));
ok('overnight flag', R.parseRange('10p-6a').overnight && !R.parseRange('9a-5p').overnight);

/* dates */
ok('11/23 -> 2026', R.parseDate('11/23', TODAY).ymd === '2026-11-23' && R.parseDate('11/23', TODAY).yearGuessed);
ok('1/4 near year end -> next year', R.parseDate('1/4', '2026-12-28').ymd === '2027-01-04');
ok('Nov 23rd', R.parseDate('Mon, Nov 23rd', TODAY).ymd === '2026-11-23');
ok('23 Nov', R.parseDate('23 Nov', TODAY).ymd === '2026-11-23');
ok('11/23/2026 not guessed', !R.parseDate('11/23/2026', TODAY).yearGuessed);
ok('2/30 rejected', R.parseDate('2/30', TODAY) === null);
ok('time is not a date', R.parseDate('9:00', TODAY) === null);

/* grid: words with positions, like a team schedule photo */
function W(text, x, y, w) { return { text, x0: x, x1: x + (w || text.length * 9), y0: y, y1: y + 16 }; }
const X = [200, 300, 400, 500, 600, 700, 800]; // column centres
function rowWords(label, y, cells) {
  const out = []; label.split(' ').forEach((t, i) => out.push(W(t, 20 + i * 60, y)));
  cells.forEach((c, i) => { if (!c) return; const parts = c.split(' '); let x = X[i] - parts.join(' ').length * 4.5; parts.forEach(p => { out.push(W(p, x, y + (Math.random() * 3 - 1.5))); x += p.length * 9 + 6; }); });
  return out;
}
let words = [W('Week', 20, 10), W('of', 70, 10), W('Nov', 95, 10), W('22', 130, 10)];
['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((d, i) => words.push(W(d, X[i] - 13, 50, 27)));
['11/22', '11/23', '11/24', '11/25', '11/26', '11/27', '11/28'].forEach((d, i) => words.push(W(d, X[i] - 22, 72, 45)));
words = words.concat(
  rowWords('Name', 51, []),
  rowWords('Alex Rivera', 110, ['OFF', '9a-5p', '9a-5p', '', '12p-8p', '10p-6a', 'OFF']),
  rowWords('Sam Okafor', 140, ['7a-3p', 'OFF', '', '7a-3p', '7a-3p', 'OFF', '8a-4p']),
  rowWords('Jo Kim', 170, ['', '', '4p-10p', '4p-10p', 'OFF', '', '4p-10p']),
  rowWords('', 190, ['', '', '', '', '', '', '11p-2a'])
);
let g = R.read({ words }, { today: TODAY });
ok('grid mode', g.mode === 'grid', g.mode);
ok('7 columns', g.columns.length === 7);
ok('dates found', g.columns.map(c => c.date).join() === '2026-11-22,2026-11-23,2026-11-24,2026-11-25,2026-11-26,2026-11-27,2026-11-28', g.columns);
ok('no week question', !g.needsWeek);
ok('3 rows (header "Name" not a row)', g.rows.length === 3, g.rows.map(r => r.label));
ok('row labels', g.rows.map(r => r.label).join('|') === 'Alex Rivera|Sam Okafor|Jo Kim', g.rows.map(r => r.label));
let alex = g.rows[0];
ok('Alex Mon 9-5', alex.cells[1].range && alex.cells[1].range.start === '09:00');
ok('Alex Wed empty (column kept even though blank)', !alex.cells[3].range && !alex.cells[3].off && !alex.cells[3].text);
ok('Alex Thu 12-8 in the right column', alex.cells[4].range.start === '12:00' && alex.cells[4].range.end === '20:00');
ok('Alex Fri overnight', alex.cells[5].range.overnight);
ok('Alex Sun off', alex.cells[0].off);
ok('Jo second line added as extra shift', g.rows[2].extra.length === 1 && g.rows[2].extra[0].col === 6, g.rows[2].extra);
ok('weekday check passes', g.columns.every(c => !c.dowMismatch));

// header with weekdays only -> must ask which week
let w2 = [];
['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((d, i) => w2.push(W(d, X[i] - 13, 50, 27)));
w2 = w2.concat(rowWords('Pat Lee', 100, ['9-5', 'OFF', '9-5', '9-5', '', '10a-2p', '']));
g = R.read({ words: w2 }, { today: TODAY });
ok('no dates -> needsWeek', g.mode === 'grid' && g.needsWeek && g.columns[0].date === null, g);
ok('guessed meridiem flagged', g.rows[0].cells[0].range.guessed);

// one date only -> the others are worked out and marked
let w3 = [];
['Mon', 'Tue', 'Wed'].forEach((d, i) => w3.push(W(d, X[i] - 13, 50, 27)));
w3.push(W('11/23', X[0] - 22, 72, 45));
w3 = w3.concat(rowWords('Pat', 100, ['9a-5p', '9a-5p', 'sick?']));
g = R.read({ words: w3 }, { today: TODAY });
ok('dates inferred from one', g.columns[2].date === '2026-11-25' && g.columns[2].dateInferred && !g.columns[0].dateInferred, g.columns);
ok('unclear cell flagged', g.rows[0].cells[2].unclear);

// wrong weekday for date
let w4 = [];
['Mon', 'Tue', 'Wed'].forEach((d, i) => w4.push(W(d, X[i] - 13, 50, 27)));
['11/22', '11/23', '11/24'].forEach((d, i) => w4.push(W(d, X[i] - 22, 72, 45)));
w4 = w4.concat(rowWords('Pat', 100, ['9a-5p', '9a-5p', '9a-5p']));
g = R.read({ words: w4 }, { today: TODAY });
ok('weekday mismatch warned', g.warnings.length >= 1 && g.columns[0].dowMismatch);

/* list mode: your own schedule from an app or text */
let list = R.read({ text: 'My shifts\nMon, Nov 23  9:00 AM - 5:00 PM  Cashier\nTue Nov 24\n10p - 6a  Stock\nThursday 11/26 off\nFri 11/27 12:00-20:00\nRandom 4-5 line before nothing' }, { today: TODAY });
ok('list mode', list.mode === 'list', list);
ok('list 3 shifts', list.items.length === 3, list.items);
ok('list dates', list.items.map(i => i.date).join() === '2026-11-23,2026-11-24,2026-11-27', list.items);
ok('list time on next line uses date above', list.items[1].range.start === '22:00');
let noWeek = R.read({ text: 'Mon 9a-5p\nWed 2p-10p' }, { today: TODAY });
ok('list weekdays only -> needsWeek', noWeek.needsWeek && noWeek.items.length === 2 && noWeek.items[1].dow === 3);
ok('nothing found', R.read({ text: 'hello world' }, { today: TODAY }).mode === 'none');

console.log(`reader: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
