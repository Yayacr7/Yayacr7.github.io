/* ShiftSync schedule reader. Rules, not AI.
   Input: words with positions (from the on-device text reader) or plain text lines.
   Output: either a GRID (team schedule: rows of people x columns of days, you pick
   your row) or a LIST (your own schedule: one shift per line).
   It never invents a date: if the photo has weekdays but no dates, needsWeek is true
   and the app asks which week it is. Anything guessed is marked so the app can say "Check". */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SSReader = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DAYS = { sun: 0, sunday: 0, su: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  var OFF = /^(off|x|-+|—|–|rdo|pto|vac|vacation|req|request|requested|n\/a|na|closed|day off)$/i;
  function z(n) { return (n < 10 ? '0' : '') + n; }

  function dayOf(word) { var w = String(word).toLowerCase().replace(/[^a-z]/g, ''); return w in DAYS && w !== 'su' ? DAYS[w] : null; }

  /* ---- times ---- */
  function clean(s) {
    return String(s).toLowerCase()
      .replace(/[–—−‒]/g, '-').replace(/\bto\b|\btil+\b|\buntil\b/g, '-')
      .replace(/\bnoon\b/g, '12:00p').replace(/\bmidnight\b/g, '12:00a').replace(/\bclose\b/g, '')
      .replace(/(\d)\s*([ap])\.?\s*m\.?/g, '$1$2').replace(/(\d)\s*\.\s*(\d\d)/g, '$1:$2')
      .replace(/:\s*o/g, ':0').replace(/(\d)\s*:\s*(\d)/g, '$1:$2').replace(/(\d)[oO](\d)?/g, function (m, a, b) { return a + '0' + (b || ''); })
      .replace(/\s+/g, ' ').trim();
  }
  var T = '(\\d{1,2})(?::(\\d{2}))?\\s*([ap])?';
  var T4 = '(\\d{3,4})\\s*([ap])?';
  var RANGE = new RegExp('(?:^|[^\\d:])' + T + '\\s*-\\s*' + T + '(?![\\d:])');
  var RANGE4 = new RegExp('(?:^|\\D)' + T4 + '\\s*-\\s*' + T4 + '(?!\\d)');
  function to24(h, m, ap) { if (ap === 'a') h = h % 12; else if (ap === 'p') h = h % 12 + 12; return h * 60 + m; }
  function hm(min) { min = ((min % 1440) + 1440) % 1440; return z(Math.floor(min / 60)) + ':' + z(min % 60); }
  function parseRange(raw) {
    var s = clean(raw), m = s.match(RANGE), h1, m1, a1, h2, m2, a2, fourDigit = false;
    if (m) { h1 = +m[1]; m1 = +(m[2] || 0); a1 = m[3]; h2 = +m[4]; m2 = +(m[5] || 0); a2 = m[6]; }
    else {
      m = s.match(RANGE4); if (!m) return null; fourDigit = true;
      var p = function (d) { d = d.length === 3 ? '0' + d : d; return [+d.slice(0, 2), +d.slice(2)]; };
      var x = p(m[1]), y = p(m[3]); h1 = x[0]; m1 = x[1]; a1 = m[2]; h2 = y[0]; m2 = y[1]; a2 = m[4];
    }
    if (h1 > 23 || h2 > 23 || m1 > 59 || m2 > 59) return null;
    if ((a1 && (h1 < 1 || h1 > 12)) || (a2 && (h2 < 1 || h2 > 12))) return null;
    var start, end, guessed = false;
    var is24 = !a1 && !a2 && (h1 > 12 || h2 > 12 || h1 === 0 || h2 === 0 || /(^|\D)0\d:/.test(s) || fourDigit);
    if (is24 || (a1 && a2)) { start = is24 ? h1 * 60 + m1 : to24(h1, m1, a1); end = is24 ? h2 * 60 + m2 : to24(h2, m2, a2); }
    else if (a2 && !a1) { // "9-5p": start takes the meridiem that gives a sensible length
      end = to24(h2, m2, a2);
      var same = to24(h1, m1, a2), other = to24(h1, m1, a2 === 'a' ? 'p' : 'a');
      var ls = (end - same + 1440) % 1440, lo = (end - other + 1440) % 1440;
      start = (ls > 0 && ls <= 14 * 60) ? same : other;
      if (!(ls > 0 && ls <= 14 * 60) && !(lo > 0 && lo <= 14 * 60)) guessed = true;
    } else if (a1 && !a2) {
      start = to24(h1, m1, a1);
      var e1 = to24(h2, m2, 'a'), e2 = to24(h2, m2, 'p');
      var l1 = (e1 - start + 1440) % 1440, l2 = (e2 - start + 1440) % 1440;
      end = (l1 > 0 && (l1 <= l2 || l2 === 0)) ? e1 : e2;
    } else { // no am/pm at all: a guess the person must check
      guessed = true;
      start = (h1 >= 6 && h1 <= 11) ? h1 * 60 + m1 : (h1 === 12 ? 12 * 60 + m1 : (h1 % 12 + 12) * 60 + m1);
      var c1 = (h2 % 12) * 60 + m2, c2 = c1 + 720;
      var d1 = (c1 - start + 1440) % 1440, d2 = (c2 - start + 1440) % 1440;
      end = (d1 > 0 && d1 <= d2) || d2 === 0 ? c1 : c2;
    }
    if (start === end) return null;
    return { start: hm(start), end: hm(end), overnight: end <= start, guessed: guessed };
  }

  /* ---- dates ---- */
  function nearestYear(mo, d, today) {
    var ty = +today.slice(0, 4), best = null, bestDiff = Infinity;
    [ty - 1, ty, ty + 1].forEach(function (y) {
      var ms = Date.UTC(y, mo - 1, d), dt = new Date(ms);
      if (dt.getUTCMonth() !== mo - 1) return;
      var diff = Math.abs(ms - Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10)));
      if (diff < bestDiff) { bestDiff = diff; best = y; }
    });
    return best;
  }
  function parseDate(raw, today) {
    var s = String(raw).toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, '$1'), m, mo, d, y;
    if ((m = s.match(/(?:^|\D)(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?(?!\d)/))) { mo = +m[1]; d = +m[2]; y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null; }
    else if ((m = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s*(\d{1,2})(?:,?\s*(\d{4}))?\b/))) { mo = MONTHS[m[1]]; d = +m[2]; y = m[3] ? +m[3] : null; }
    else if ((m = s.match(/\b(\d{1,2})[\s-]*(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?(?:\s*(\d{4}))?\b/))) { mo = MONTHS[m[2]]; d = +m[1]; y = m[3] ? +m[3] : null; }
    else return null;
    if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return null;
    var yearGuessed = !y; if (!y) y = nearestYear(mo, d, today);
    if (y == null) return null;
    var dt = new Date(Date.UTC(y, mo - 1, d)); if (dt.getUTCMonth() !== mo - 1) return null;
    return { ymd: y + '-' + z(mo) + '-' + z(d), yearGuessed: yearGuessed };
  }
  function addDays(s, n) { var p = s.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return d.getUTCFullYear() + '-' + z(d.getUTCMonth() + 1) + '-' + z(d.getUTCDate()); }
  function dowOf(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }

  /* ---- layout ---- */
  function lines(words) {
    var ws = words.filter(function (w) { return String(w.text).trim(); }).map(function (w) {
      return { text: String(w.text).trim(), x0: w.x0, x1: w.x1, y0: w.y0, y1: w.y1, xc: (w.x0 + w.x1) / 2, yc: (w.y0 + w.y1) / 2, h: Math.max(1, w.y1 - w.y0) };
    }).sort(function (a, b) { return a.yc - b.yc; });
    var out = [];
    ws.forEach(function (w) {
      var L = out.length ? out[out.length - 1] : null;
      if (L && Math.abs(w.yc - L.yc) <= Math.max(L.h, w.h) * 0.6) { L.words.push(w); L.yc = (L.yc * (L.words.length - 1) + w.yc) / L.words.length; L.h = Math.max(L.h, w.h); }
      else out.push({ words: [w], yc: w.yc, h: w.h });
    });
    out.forEach(function (L) { L.words.sort(function (a, b) { return a.x0 - b.x0; }); L.text = L.words.map(function (w) { return w.text; }).join(' '); });
    return out;
  }
  function textOf(ws) { return ws.map(function (w) { return w.text; }).join(' ').replace(/\s+/g, ' ').trim(); }

  function readGrid(L, hi, today) {
    var header = L[hi];
    var cols = header.words.map(function (w) { return { dow: dayOf(w.text), xc: w.xc, x0: w.x0, x1: w.x1 }; }).filter(function (c) { return c.dow != null; });
    cols.sort(function (a, b) { return a.xc - b.xc; });
    var spacing = cols.length > 1 ? (cols[cols.length - 1].xc - cols[0].xc) / (cols.length - 1) : 100;
    var labelEdge = cols[0].xc - spacing / 2;
    function colOf(xc) { var best = 0, bd = Infinity; cols.forEach(function (c, i) { var d = Math.abs(c.xc - xc); if (d < bd) { bd = d; best = i; } }); return bd <= spacing * 0.75 ? best : -1; }
    // dates on the header line or just under it
    var firstRow = hi + 1;
    for (var k = hi; k < Math.min(L.length, hi + 3); k++) {
      if (k > hi && Math.abs(L[k].yc - header.yc) > header.h * 3.2) break;
      var hits = 0;
      L[k].words.forEach(function (w) {
        if (w.xc < labelEdge) return;
        var d = parseDate(w.text, today); if (!d) return;
        var ci = colOf(w.xc); if (ci < 0 || cols[ci].date) return;
        cols[ci].date = d.ymd; cols[ci].yearGuessed = d.yearGuessed; hits++;
      });
      if (k > hi && hits) firstRow = k + 1;
    }
    // fill missing dates from neighbours (columns are consecutive days)
    var anchor = cols.findIndex(function (c) { return c.date; }), warnings = [];
    cols.forEach(function (c, i) {
      if (anchor < 0) return;
      var expect = addDays(cols[anchor].date, i - anchor);
      if (!c.date) { c.date = expect; c.dateInferred = true; }
      else if (c.date !== expect) warnings.push('The dates in the header are not consecutive. Check each day.');
      if (dowOf(c.date) !== c.dow) { c.dowMismatch = true; warnings.push('A date does not match its weekday. Check the dates.'); }
    });
    var rows = [];
    for (var r = firstRow; r < L.length; r++) {
      var label = [], cells = cols.map(function () { return []; });
      L[r].words.forEach(function (w) { if (w.x1 <= labelEdge + spacing * 0.15 && w.xc < labelEdge) label.push(w); else { var ci = colOf(w.xc); if (ci >= 0) cells[ci].push(w); } });
      var cellOut = cells.map(function (ws, ci) {
        var t = textOf(ws), rg = t ? parseRange(t) : null;
        return { col: ci, text: t, range: rg, off: !rg && OFF.test(t), unclear: !!t && !rg && !OFF.test(t) };
      });
      var found = cellOut.some(function (c) { return c.range || c.off; });
      var lab = textOf(label).replace(/[|_]+/g, '').trim();
      if (!found) continue;
      if (!/[a-z]/i.test(lab)) {
        if (rows.length) { // a second line of times for the row above (split shift)
          var prev = rows[rows.length - 1];
          cellOut.forEach(function (c, i) { if (c.range) prev.extra.push({ col: i, text: c.text, range: c.range }); });
        }
        continue;
      }
      rows.push({ label: lab, cells: cellOut, extra: [] });
    }
    var uniq = []; warnings.forEach(function (w) { if (uniq.indexOf(w) < 0) uniq.push(w); });
    return { mode: 'grid', columns: cols.map(function (c) { return { dow: c.dow, date: c.date || null, dateInferred: !!c.dateInferred, yearGuessed: !!c.yearGuessed, dowMismatch: !!c.dowMismatch }; }),
      rows: rows, needsWeek: anchor < 0, warnings: uniq };
  }

  function readList(L, today) {
    var items = [], cur = null;
    L.forEach(function (line) {
      var t = line.text, d = parseDate(t, today), wd = null;
      t.split(/[\s,]+/).some(function (w) { var x = dayOf(w); if (x != null) { wd = x; return true; } return false; });
      var rg = parseRange(t), here = null;
      if (d || wd != null) here = { date: d ? d.ymd : null, dow: d ? dowOf(d.ymd) : wd, yearGuessed: d ? d.yearGuessed : false, dowMismatch: !!(d && wd != null && dowOf(d.ymd) !== wd) };
      // A day line with no time of its own carries down to the time lines right under it.
      var use = here || cur;
      if (here) cur = rg ? null : here; else if (!rg) cur = null;
      if (!rg || !use) return;
      items.push({ date: use.date, dow: use.dow, yearGuessed: use.yearGuessed, dowMismatch: use.dowMismatch, range: rg, raw: t });
    });
    return { mode: items.length ? 'list' : 'none', items: items, needsWeek: items.some(function (i) { return !i.date; }), warnings: [] };
  }

  // words: [{text,x0,y0,x1,y1}] (positions) or null; text: fallback plain text
  function read(input, opts) {
    opts = opts || {}; var today = opts.today || new Date().toISOString().slice(0, 10);
    var L;
    if (input.words && input.words.length) L = lines(input.words);
    else L = String(input.text || '').split(/\r?\n/).map(function (t) { return { text: t.trim(), words: [] }; }).filter(function (l) { return l.text; });
    var hi = -1, best = 0;
    L.forEach(function (line, i) { var n = 0, seen = {}; line.words.forEach(function (w) { var d = dayOf(w.text); if (d != null && !seen[d]) { seen[d] = 1; n++; } }); if (n > best) { best = n; hi = i; } });
    if (best >= 3) { var g = readGrid(L, hi, today); if (g.rows.length) return g; }
    return readList(L, today);
  }

  return { read: read, parseRange: parseRange, parseDate: parseDate, lines: lines, dayOf: dayOf };
});
