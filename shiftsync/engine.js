/* ShiftSync engine: dates, time zones, shift math, conflicts, earnings,
   schedule replacement and calendar export. No DOM; tested in Node.
   Times are stored as the workplace's own wall-clock time (date + HH:MM in its
   time zone) and turned into real instants only for maths and display. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SSEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DAY = 864e5, MIN = 6e4;

  /* ---------- plain dates (YYYY-MM-DD) ---------- */
  function z(n) { return (n < 10 ? '0' : '') + n; }
  function ymdParts(s) { var p = s.split('-'); return [+p[0], +p[1], +p[2]]; }
  function ymdFromUTC(ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + z(d.getUTCMonth() + 1) + '-' + z(d.getUTCDate()); }
  function addDays(s, n) { var p = ymdParts(s); return ymdFromUTC(Date.UTC(p[0], p[1] - 1, p[2] + n)); }
  function dow(s) { var p = ymdParts(s); return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(); } // 0 = Sunday
  function diffDays(a, b) { var x = ymdParts(a), y = ymdParts(b); return Math.round((Date.UTC(y[0], y[1] - 1, y[2]) - Date.UTC(x[0], x[1] - 1, x[2])) / DAY); }
  function weekStart(s, startDow) { var d = dow(s); return addDays(s, -((d - (startDow || 0) + 7) % 7)); }
  function validYmd(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false; var p = ymdParts(s); return ymdFromUTC(Date.UTC(p[0], p[1] - 1, p[2])) === s; }
  function validHm(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(s || ''); }
  function hmToMin(s) { var p = s.split(':'); return +p[0] * 60 + +p[1]; }

  /* ---------- time zones (uses the browser's own time zone database) ---------- */
  var fmtCache = {};
  function fmt(tz) {
    if (!fmtCache[tz]) fmtCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' });
    return fmtCache[tz];
  }
  function validTz(tz) { try { fmt(tz); return true; } catch (e) { return false; } }
  function partsAt(ms, tz) {
    var o = {}; fmt(tz).formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
  }
  function offsetAt(ms, tz) { var p = partsAt(ms, tz); return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000; }
  // Wall-clock time in a zone -> real instant. A time skipped by a clock change moves forward.
  function zonedToMs(ymd, hm, tz) {
    var p = ymdParts(ymd), t = hm.split(':');
    var guess = Date.UTC(p[0], p[1] - 1, p[2], +t[0], +t[1]);
    var o1 = offsetAt(guess - offsetAt(guess, tz), tz);
    var ms = guess - o1;
    var o2 = offsetAt(ms, tz);
    if (o2 !== o1) ms = guess - o2;
    return ms;
  }
  function msToZoned(ms, tz) { var p = partsAt(ms, tz); return { ymd: p.y + '-' + z(p.mo) + '-' + z(p.d), hm: z(p.h) + ':' + z(p.mi) }; }

  /* ---------- shifts ---------- */
  function breakTotals(breaks) {
    var paid = 0, unpaid = 0;
    (breaks || []).forEach(function (b) { var m = Math.max(0, Math.round(+b.min || 0)); if (b.paid) paid += m; else unpaid += m; });
    return { paid: paid, unpaid: unpaid };
  }
  // which: 'scheduled' | 'actual' | 'effective' (actual when the shift is marked worked and has actual times)
  function times(shift, tz, which) {
    var useActual = which === 'actual' || (which !== 'scheduled' && shift.worked && shift.actual);
    var src = useActual && shift.actual ? shift.actual : shift;
    var date = src.date || shift.date;
    var startMs = zonedToMs(date, src.start, tz);
    var overnight = hmToMin(src.end) <= hmToMin(src.start);
    var endMs = zonedToMs(overnight ? addDays(date, 1) : date, src.end, tz);
    var br = breakTotals(src.breaks || shift.breaks);
    var lengthMin = Math.round((endMs - startMs) / MIN);
    return { startMs: startMs, endMs: endMs, overnight: overnight, lengthMin: lengthMin, unpaidMin: br.unpaid, paidBreakMin: br.paid, paidMin: Math.max(0, lengthMin - br.unpaid), actual: !!(useActual && shift.actual) };
  }
  function validate(shift, tz) {
    var e = [];
    if (!validYmd(shift.date)) e.push('Pick a date.');
    if (!validHm(shift.start)) e.push('Pick a start time.');
    if (!validHm(shift.end)) e.push('Pick an end time.');
    if (e.length) return e;
    if (shift.start === shift.end) e.push('Start and end are the same time.');
    var t = times(shift, tz, 'scheduled');
    if (t.unpaidMin + t.paidBreakMin >= t.lengthMin && t.lengthMin > 0) e.push('Breaks are as long as the shift.');
    if (shift.actual) {
      if (!validHm(shift.actual.start) || !validHm(shift.actual.end)) e.push('Actual start and end are needed.');
      else if (shift.actual.start === shift.actual.end) e.push('Actual start and end are the same time.');
      else { var a = times(shift, tz, 'actual'); if (a.unpaidMin + a.paidBreakMin >= a.lengthMin) e.push('Actual breaks are as long as the shift.'); }
    }
    if (shift.rate != null && shift.rate !== '' && !(+shift.rate >= 0)) e.push('Pay rate must be a number.');
    return e;
  }

  function wpMap(wps) { var m = {}; (wps || []).forEach(function (w) { m[w.id] = w; }); return m; }
  function withTimes(shifts, wps, which) {
    var m = wpMap(wps);
    return shifts.filter(function (s) { return m[s.wp]; }).map(function (s) { return { s: s, w: m[s.wp], t: times(s, m[s.wp].tz, which || 'effective') }; })
      .sort(function (a, b) { return a.t.startMs - b.t.startMs || a.t.endMs - b.t.endMs; });
  }

  /* Overlaps (any two shifts, even at the same job) and travel gaps (back-to-back
     shifts at different workplaces closer together than the travel time you set
     for the second workplace). */
  function conflicts(shifts, wps, opts) {
    opts = opts || {};
    var list = withTimes(shifts, wps, 'effective'), out = [];
    for (var i = 0; i < list.length; i++) {
      for (var j = i + 1; j < list.length; j++) {
        var a = list[i], b = list[j];
        if (b.t.startMs >= a.t.endMs + 24 * 60 * MIN) break;
        if (b.t.startMs < a.t.endMs) {
          out.push({ kind: 'overlap', a: a.s.id, b: b.s.id, minutes: Math.round((Math.min(a.t.endMs, b.t.endMs) - b.t.startMs) / MIN) });
        } else if (opts.travel !== false && a.w.id !== b.w.id) {
          var need = Math.max(0, +b.w.travelMin || 0), gap = Math.round((b.t.startMs - a.t.endMs) / MIN);
          if (need > 0 && gap < need) out.push({ kind: 'travel', a: a.s.id, b: b.s.id, gapMin: gap, needMin: need });
        }
      }
    }
    return out;
  }

  /* Estimated GROSS pay. Confirmed = shifts you marked as worked. Scheduled =
     not yet marked, shown separately ("if worked as scheduled").
     No taxes, overtime, tips, differentials or employer rounding. */
  function earnings(shifts, wps, fromMs, toMs, nowMs) {
    var res = { byWp: {}, confirmedMin: 0, scheduledMin: 0, confirmedGross: 0, scheduledGross: 0, unratedMin: 0, needsCheck: 0 };
    withTimes(shifts, wps, 'effective').forEach(function (x) {
      if (x.t.startMs < fromMs || x.t.startMs >= toMs) return;
      var rate = x.s.rate != null && x.s.rate !== '' ? +x.s.rate : (x.w.rate != null && x.w.rate !== '' ? +x.w.rate : null);
      var r = res.byWp[x.w.id] || (res.byWp[x.w.id] = { confirmedMin: 0, scheduledMin: 0, confirmedGross: 0, scheduledGross: 0, unratedMin: 0, shifts: 0 });
      r.shifts++;
      var money = rate == null ? 0 : Math.round(x.t.paidMin / 60 * rate * 100) / 100;
      if (rate == null) { r.unratedMin += x.t.paidMin; res.unratedMin += x.t.paidMin; }
      if (x.s.worked) { r.confirmedMin += x.t.paidMin; r.confirmedGross += money; res.confirmedMin += x.t.paidMin; res.confirmedGross += money; }
      else {
        r.scheduledMin += x.t.paidMin; r.scheduledGross += money; res.scheduledMin += x.t.paidMin; res.scheduledGross += money;
        if (nowMs != null && x.t.endMs <= nowMs) res.needsCheck++;
      }
    });
    res.confirmedGross = Math.round(res.confirmedGross * 100) / 100;
    res.scheduledGross = Math.round(res.scheduledGross * 100) / 100;
    return res;
  }

  /* Replacing a schedule. Compares the shifts you are importing with the shifts
     already saved for that workplace in the same dates. Nothing changes until
     applyPlan() runs, and the app only runs it after you confirm.
     Shifts you already marked as worked are kept unless keepWorked is false. */
  function planReplace(all, incoming, wpId, fromYmd, toYmd, opts) {
    opts = opts || {}; var keepWorked = opts.keepWorked !== false;
    var existing = all.filter(function (s) { return s.wp === wpId && s.date >= fromYmd && s.date <= toYmd; });
    var plan = { same: [], changed: [], add: [], remove: [], keptWorked: [] };
    var pool = existing.slice(), rest = [];
    incoming.forEach(function (n) {
      var i = pool.findIndex(function (o) { return o.date === n.date && o.start === n.start && o.end === n.end; });
      if (i >= 0) { plan.same.push({ old: pool[i], neu: n }); pool.splice(i, 1); } else rest.push(n);
    });
    rest.forEach(function (n) {
      var i = pool.findIndex(function (o) { return o.date === n.date; });
      if (i >= 0) {
        var o = pool[i]; pool.splice(i, 1);
        if (o.worked && keepWorked) { plan.keptWorked.push(o); plan.add.push(n); }
        else plan.changed.push({ old: o, neu: n });
      } else plan.add.push(n);
    });
    pool.forEach(function (o) { if (o.worked && keepWorked) plan.keptWorked.push(o); else plan.remove.push(o); });
    plan.replacing = plan.changed.length + plan.remove.length;
    plan.existingCount = existing.length;
    return plan;
  }
  function applyPlan(all, plan, stamp) {
    var drop = {};
    plan.remove.forEach(function (o) { drop[o.id] = 1; });
    plan.changed.forEach(function (c) { drop[c.old.id] = 1; });
    var out = all.filter(function (s) { return !drop[s.id]; });
    plan.changed.forEach(function (c) { out.push(Object.assign({}, c.neu, { notes: c.old.notes || c.neu.notes || '' })); });
    plan.add.forEach(function (n) { out.push(n); });
    plan.same.forEach(function (p) { var i = out.indexOf(p.old); if (i >= 0) out[i] = Object.assign({}, p.old, { importId: p.neu.importId || p.old.importId, confirmedAt: stamp || p.old.confirmedAt }); });
    return out;
  }

  /* ---------- export ---------- */
  function icsEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function icsUtc(ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function fold(line) { var out = [], s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); } out.push(s); return out.join('\r\n'); }
  function ics(shifts, wps, opts) {
    opts = opts || {};
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ShiftSync//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEsc(opts.name || 'My shifts')];
    withTimes(shifts, wps, 'scheduled').forEach(function (x) {
      L.push('BEGIN:VEVENT', 'UID:' + x.s.id + '@shiftsync', 'DTSTAMP:' + icsUtc(opts.now || Date.now()),
        'DTSTART:' + icsUtc(x.t.startMs), 'DTEND:' + icsUtc(x.t.endMs), 'SUMMARY:' + icsEsc('Shift: ' + x.w.name));
      if (x.w.address) L.push('LOCATION:' + icsEsc(x.w.address));
      var d = ['Scheduled ' + x.s.start + '-' + x.s.end + (x.t.overnight ? ' (ends next day)' : '') + ' ' + x.w.tz];
      if (x.t.unpaidMin) d.push('Unpaid break: ' + x.t.unpaidMin + ' min');
      if (x.s.notes) d.push(x.s.notes);
      d.push('From ShiftSync. Your employer\'s schedule is the official one.');
      L.push('DESCRIPTION:' + icsEsc(d.join('\n')));
      if (opts.alarmMin != null && opts.alarmMin !== '' && +opts.alarmMin >= 0) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc('Shift at ' + x.w.name), 'TRIGGER:' + (+opts.alarmMin === 0 ? 'PT0M' : '-PT' + (+opts.alarmMin) + 'M'), 'END:VALARM');
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  function csvCell(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function csv(shifts, wps) {
    var rows = [['Workplace', 'Date', 'Scheduled start', 'Scheduled end', 'Ends next day', 'Unpaid break (min)', 'Paid break (min)', 'Worked', 'Actual start', 'Actual end', 'Paid hours', 'Rate', 'Estimated gross', 'Notes']];
    withTimes(shifts, wps, 'effective').forEach(function (x) {
      var rate = x.s.rate != null && x.s.rate !== '' ? +x.s.rate : (x.w.rate != null && x.w.rate !== '' ? +x.w.rate : null);
      var hrs = Math.round(x.t.paidMin / 60 * 100) / 100;
      rows.push([x.w.name, x.s.date, x.s.start, x.s.end, x.t.overnight ? 'yes' : 'no', x.t.unpaidMin, x.t.paidBreakMin, x.s.worked ? 'yes' : 'no',
        x.s.actual ? x.s.actual.start : '', x.s.actual ? x.s.actual.end : '', hrs, rate == null ? '' : rate.toFixed(2), rate == null ? '' : (hrs * rate).toFixed(2), x.s.notes || '']);
    });
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }

  /* Workplace colours: all reach at least 4.5:1 contrast on white, so they also work as text. */
  var COLORS = [
    { id: 'teal', hex: '#0F766E', name: 'Teal' }, { id: 'violet', hex: '#6D28D9', name: 'Violet' },
    { id: 'rose', hex: '#BE123C', name: 'Rose' }, { id: 'amber', hex: '#B45309', name: 'Amber' },
    { id: 'blue', hex: '#1D4ED8', name: 'Blue' }, { id: 'green', hex: '#15803D', name: 'Green' },
    { id: 'fuchsia', hex: '#A21CAF', name: 'Fuchsia' }, { id: 'orange', hex: '#C2410C', name: 'Orange' },
    { id: 'sky', hex: '#0369A1', name: 'Sky' }, { id: 'slate', hex: '#475569', name: 'Slate' }
  ];
  function lum(hex) { var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  return {
    addDays: addDays, dow: dow, diffDays: diffDays, weekStart: weekStart, validYmd: validYmd, validHm: validHm, hmToMin: hmToMin,
    validTz: validTz, zonedToMs: zonedToMs, msToZoned: msToZoned, offsetAt: offsetAt,
    breakTotals: breakTotals, times: times, validate: validate, withTimes: withTimes,
    conflicts: conflicts, earnings: earnings, planReplace: planReplace, applyPlan: applyPlan,
    ics: ics, csv: csv, COLORS: COLORS, contrast: contrast
  };
});
