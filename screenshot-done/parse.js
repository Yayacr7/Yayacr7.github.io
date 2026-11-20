/* Screenshot → Done: text reader.
   Turns OCR text into fields + suggested actions using plain rules (no AI).
   Every field says how sure it is:
     sure    = written plainly in the screenshot ("Nov 21, 2026", "$42.10" on a Total line)
     guess   = worked out by a rule (title from the first line, year assumed, month/day order)
     confirm = must be checked by a person before anything happens (relative dates like "next Friday")
   Nothing is invented: if a detail is not in the text, the field stays empty. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SDParse = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  var MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
  var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  var DAY_RE = '(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)';
  var DAY_FULL_RE = '(sunday|monday|tuesday|wednesday|thursday|friday|saturday)';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function validDate(y, m, d) { var x = new Date(y, m, d); return x.getFullYear() === y && x.getMonth() === m && x.getDate() === d; }
  function monthIndex(s) { return MONTHS.indexOf(s.slice(0, 3).toLowerCase()); }
  function dayIndex(s) { var k = s.slice(0, 3).toLowerCase(); for (var i = 0; i < 7; i++) if (DAYS[i].slice(0, 3) === k) return i; return -1; }

  var LONG_DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var LONG_MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function niceDate(s) {
    if (!s) return '';
    var d = fromYmd(s);
    return LONG_DAY[d.getDay()].slice(0, 3) + ', ' + LONG_MONTH[d.getMonth()].slice(0, 3) + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  function niceTime(t) {
    if (!t) return '';
    var p = t.split(':'), h = +p[0], m = p[1];
    var ap = h >= 12 ? 'PM' : 'AM'; var h12 = h % 12 || 12;
    return h12 + ':' + m + ' ' + ap;
  }

  /* ---------- clean OCR text ---------- */
  function cleanLines(text) {
    return String(text || '')
      .replace(/\r/g, '')
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .split('\n')
      .map(function (l) { return l.replace(/\s+/g, ' ').trim(); })
      .filter(function (l) { return l.length > 0; });
  }

  // Phone status bar lines ("9:41", "100%", "LTE") are not content.
  function isNoise(line) {
    var l = line.toLowerCase();
    if (/^\d{1,2}:\d{2}\s*(am|pm)?$/.test(l)) return true;
    if (/^[\W\d\s%]*$/.test(l)) return true;
    if (/^(lte|5g|4g|wi-?fi|\d{1,3}\s?%)(\s|$)/.test(l)) return true;
    if (/\b\d{1,3}%\s*$/.test(l) && l.length < 20) return true;
    if (/^(<|‹)?\s*(back|messages|inbox|done|cancel|edit)$/i.test(l)) return true;
    return false;
  }

  /* ---------- dates ---------- */
  function findDates(text, today) {
    var out = [];
    var t = text;
    var used = [];
    function overlaps(a, b) { for (var i = 0; i < used.length; i++) if (a < used[i][1] && b > used[i][0]) return true; return false; }
    function push(o, idx, len) { if (!o || overlaps(idx, idx + len)) return; used.push([idx, idx + len]); o.index = idx; out.push(o); }
    var m, re;

    // 2026-11-21
    re = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g;
    while ((m = re.exec(t))) {
      var y = +m[1], mo = +m[2] - 1, d = +m[3];
      if (validDate(y, mo, d)) push({ value: ymd(new Date(y, mo, d)), level: 'sure', raw: m[0] }, m.index, m[0].length);
    }
    // (Fri,) Nov 21(st)(, 2026)
    re = new RegExp('\\b(?:' + DAY_RE + '\\.?,?\\s+)?' + MONTH_RE + '\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(20\\d{2}))?', 'gi');
    while ((m = re.exec(t))) {
      var mi = monthIndex(m[2]); var dd = +m[3];
      if (m[2].toLowerCase() === 'may' && !m[1] && !m[4] && /^may\s+\d{1,2}\s*(?:am|pm|:)/i.test(m[0] + t.slice(m.index + m[0].length, m.index + m[0].length + 3))) continue;
      push(absolute(mi, dd, m[4] ? +m[4] : null, today, m[0], m[1]), m.index, m[0].length);
    }
    // 21 Nov(ember) (2026)
    re = new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?' + MONTH_RE + '\\.?\\b(?:,?\\s+(20\\d{2}))?', 'gi');
    while ((m = re.exec(t))) {
      push(absolute(monthIndex(m[2]), +m[1], m[3] ? +m[3] : null, today, m[0], null), m.index, m[0].length);
    }
    // 11/21/2026, 11/21/26, 11/21  (read as month/day, the US order)
    re = /(^|[^\d/$.])(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?(?![\d/])/g;
    while ((m = re.exec(t))) {
      var a = +m[2], b = +m[3], yy = m[4] ? (+m[4] < 100 ? 2000 + +m[4] : +m[4]) : null;
      var idx = m.index + m[1].length, raw = m[0].slice(m[1].length);
      var o;
      if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
        o = absolute(a - 1, b, yy, today, raw, null);
        if (o && a <= 12 && b <= 12 && a !== b) { o.level = 'guess'; o.note = 'Read as month/day (US order). If it means ' + b + ' ' + LONG_MONTH[a - 1].slice(0, 3) + ', change it.'; }
      } else if (b >= 1 && b <= 12 && a > 12 && a <= 31) {
        o = absolute(b - 1, a, yy, today, raw, null);
        if (o) { o.level = 'guess'; o.note = 'Read as day/month because ' + a + ' cannot be a month.'; }
      }
      if (o) push(o, idx, raw.length);
    }
    // today / tonight / tomorrow
    re = /\b(today|tonight|tomorrow|tmrw|tmr)\b/gi;
    while ((m = re.exec(t))) {
      var w = m[1].toLowerCase(); var off = (w === 'today' || w === 'tonight') ? 0 : 1;
      push({ value: ymd(addDays(today, off)), level: 'confirm', raw: m[0], relative: true,
        note: '"' + m[0] + '" is counted from today (' + niceDate(ymd(today)) + '). If the screenshot is older, change the date.' }, m.index, m[0].length);
    }
    // next Friday / this Friday / on Friday / Friday
    re = new RegExp('\\b(?:(next|this|on|coming)\\s+)?' + DAY_FULL_RE + '\\b', 'gi');
    while ((m = re.exec(t))) {
      var di = dayIndex(m[2]); var word = (m[1] || '').toLowerCase();
      var base = today.getDay(); var diff = (di - base + 7) % 7;
      var first = addDays(today, diff === 0 ? 0 : diff);
      var options;
      if (word === 'next') {
        // "next Friday" is genuinely ambiguous: the coming one or the one after.
        var c = diff === 0 ? addDays(today, 7) : first;
        options = [ymd(c), ymd(addDays(c, 7))];
      } else {
        options = [ymd(diff === 0 ? today : first), ymd(addDays(diff === 0 ? today : first, 7))];
      }
      push({ value: null, level: 'confirm', raw: m[0], relative: true, options: options,
        note: '"' + m[0] + '" does not say which week. Pick the right date.' }, m.index, m[0].length);
    }
    out.sort(function (x, y) { return x.index - y.index; });
    return out.filter(Boolean);
  }

  function absolute(mi, d, y, today, raw, weekdayWord) {
    if (mi < 0 || d < 1 || d > 31) return null;
    var o = { raw: raw, level: 'sure' };
    if (y) {
      if (!validDate(y, mi, d)) return null;
      o.value = ymd(new Date(y, mi, d));
    } else {
      var ty = today.getFullYear();
      var cand = new Date(ty, mi, d);
      if (!validDate(ty, mi, d) && !validDate(ty + 1, mi, d)) return null;
      // No year written: use the next time this date comes round (allow 30 days back for recent receipts).
      if (cand < addDays(startOfDay(today), -30)) cand = new Date(ty + 1, mi, d);
      o.value = ymd(cand);
      o.level = 'guess';
      o.note = 'No year in the screenshot: ' + cand.getFullYear() + ' assumed.';
    }
    if (weekdayWord) {
      var wd = dayIndex(weekdayWord);
      if (wd >= 0 && fromYmd(o.value).getDay() !== wd) {
        o.level = 'guess';
        o.note = 'The screenshot says ' + LONG_DAY[wd] + ', but ' + niceDate(o.value) + ' is a ' + LONG_DAY[fromYmd(o.value).getDay()] + '. Check the date.';
      }
    }
    return o;
  }

  /* ---------- times ---------- */
  function toHM(h, m, ap) {
    h = +h; m = +(m || 0);
    if (ap) { ap = ap.replace(/\./g, '').toLowerCase(); if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0; }
    if (h > 23 || m > 59) return null;
    return pad(h) + ':' + pad(m);
  }
  function findTimes(lines) {
    var res = [];
    lines.forEach(function (line, li) {
      if (isNoise(line)) return; // skip the status-bar clock
      var m;
      var range = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:-|to|until)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i.exec(line);
      if (range && (range[2] || range[3] || range[6])) {
        var ap1 = range[3] || range[6];
        var start = toHM(range[1], range[2], ap1), end = toHM(range[4], range[5], range[6]);
        if (start && end && !range[3] && start > end) start = toHM(range[1], range[2], range[6] && /p/i.test(range[6]) ? 'am' : 'pm');
        if (start && end) { res.push({ value: start, end: end, level: 'sure', line: li }); return; }
      }
      var re = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?=$|[^a-z])/gi;
      var found = false;
      while ((m = re.exec(line))) { var v = toHM(m[1], m[2], m[3]); if (v) { res.push({ value: v, level: 'sure', line: li }); found = true; } }
      if (found) return;
      if (/\bnoon\b/i.test(line)) { res.push({ value: '12:00', level: 'sure', line: li }); return; }
      re = /(^|[^\d:$.])([01]?\d|2[0-3]):([0-5]\d)(?![\d:])/g;
      while ((m = re.exec(line))) {
        var h = +m[2];
        var o = { value: pad(h) + ':' + m[3], level: 'sure', line: li };
        if (h >= 1 && h <= 7) { o.level = 'guess'; o.note = 'No AM/PM in the screenshot. Read as ' + niceTime(o.value) + '.'; }
        res.push(o);
      }
    });
    return res;
  }

  /* ---------- money ---------- */
  function findAmount(lines) {
    var re = /(?:([$€£])\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{2}))?|(\d+(?:,\d{3})*)\.(\d{2})\s?(USD|EUR|GBP))/g;
    var all = [];
    lines.forEach(function (line, li) {
      var m;
      while ((m = re.exec(line))) {
        var cur = m[1] || ({ USD: '$', EUR: '€', GBP: '£' })[m[6]] || '$';
        var whole = (m[2] || m[4]).replace(/,/g, ''), cents = m[3] || m[5] || '00';
        all.push({ value: cur + whole + '.' + cents, num: parseFloat(whole + '.' + cents), line: li, text: line });
      }
    });
    if (!all.length) return null;
    var totals = all.filter(function (a) { return /\b(grand\s+)?total\b|amount\s+(paid|due|charged)|you\s+paid|charged|balance\s+due/i.test(a.text) && !/sub\s?-?total/i.test(a.text); });
    if (totals.length) {
      var best = totals[totals.length - 1];
      return { value: best.value, level: 'sure', note: 'From the line "' + best.text.slice(0, 50) + '".' };
    }
    if (all.length === 1) return { value: all[0].value, level: 'sure' };
    var max = all.slice().sort(function (a, b) { return b.num - a.num; })[0];
    return { value: max.value, level: 'guess', note: 'No "Total" line found. This is the largest amount in the screenshot.' };
  }

  /* ---------- links, emails, phones ---------- */
  function findLink(text) {
    var noEmail = text.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, ' ');
    var m = /\bhttps?:\/\/[^\s<>"']+/i.exec(noEmail) || /\bwww\.[^\s<>"']+/i.exec(noEmail) ||
      /\b[a-z0-9][a-z0-9-]*\.(?:com|org|net|edu|io|co|gov|app|ly|us|me|gg|tv|link)(?:\/[^\s<>"']*)?(?=$|[\s),.;!?])/i.exec(noEmail);
    if (!m) return null;
    var v = m[0].replace(/[),.;:!?'"]+$/, '');
    return { value: v, level: /^https?:/i.test(v) ? 'sure' : 'guess', note: /^https?:/i.test(v) ? '' : 'Link read from text. Check it before opening.' };
  }
  function findEmail(text) { var m = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(text); return m ? m[0] : null; }
  function findPhone(text) { var m = /(?:\+1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/.exec(text); return m ? m[0].trim() : null; }

  /* ---------- location ---------- */
  function findLocation(lines) {
    for (var i = 0; i < lines.length; i++) {
      var m = /^(?:location|where|address|venue|place|at)\s*[:\-]\s*(.+)$/i.exec(lines[i]);
      if (m && m[1].length > 2) return { value: m[1], level: 'sure' };
    }
    var street = /\b\d{1,6}\s+(?:[NSEW]\.?\s+)?[A-Za-z0-9.'\s]{2,40}?\b(?:st(?:reet)?|ave(?:nue)?|rd|road|blvd|boulevard|dr(?:ive)?|ln|lane|way|ct|court|pl(?:ace)?|pkwy|parkway|hwy|highway|sq(?:uare)?)\b\.?(?:[^\n]{0,40})?/i;
    for (var j = 0; j < lines.length; j++) {
      var s = street.exec(lines[j]);
      if (s && !/\$|total|order/i.test(lines[j])) return { value: s[0].trim().replace(/[,.]$/, ''), level: 'guess', note: 'Looks like an address. Check it.' };
    }
    return null;
  }

  /* ---------- category ---------- */
  var CATS = {
    appointment: { label: 'Appointment', words: ['appointment', 'appt', 'dentist', 'dental', 'doctor', 'dr.', 'clinic', 'checkup', 'check-up', 'reschedule', 'please arrive', 'arrive 10', 'arrive 15', 'haircut', 'salon', 'therapy', 'visit', 'vet ', 'confirm your', 'reply c to confirm', 'cancel or reschedule'] },
    event: { label: 'Event', words: ['event', 'practice', 'rehearsal', 'meeting', 'game day', 'tryout', 'tickets', 'ticket', 'concert', 'rsvp', 'doors open', 'party', 'festival', 'show', 'game', 'meetup', 'webinar', 'join us', 'invite', 'invited', 'birthday', 'wedding', 'admit', 'live at'] },
    assignment: { label: 'Assignment', words: ['assignment', 'homework', 'due', 'submit', 'submission', 'essay', 'quiz', 'exam', 'midterm', 'final', 'project', 'canvas', 'blackboard', 'google classroom', 'points', 'deadline', 'turn in', 'chapter', 'worksheet'] },
    receipt: { label: 'Receipt', words: ['receipt', 'subtotal', 'total', 'tax', 'paid', 'payment', 'visa', 'mastercard', 'amex', 'order #', 'order number', 'purchase', 'refund', 'thank you for your order', 'qty', 'tip', 'change due', 'card ending'] },
    booking: { label: 'Booking', words: ['reservation', 'reserved', 'booking', 'booked', 'confirmation number', 'confirmation code', 'conf #', 'check-in', 'check in', 'check-out', 'flight', 'gate', 'boarding', 'hotel', 'table for', 'party of', 'seat', 'rental', 'pickup', 'pick-up'] },
    message: { label: 'Message', words: ['sent', 'delivered', 'read ', 'imessage', 'text message', 'reply', 'hey', 'hi ', 'lol', 'can you', 'don\'t forget', 'dont forget', 'remember to', 'let me know', 'call me'] }
  };
  function classify(text) {
    var l = ' ' + text.toLowerCase() + ' ';
    var scores = {};
    Object.keys(CATS).forEach(function (k) {
      var s = 0; CATS[k].words.forEach(function (w) { if (l.indexOf(w) >= 0) s += (w.length > 6 ? 2 : 1); }); scores[k] = s;
    });
    if (/\$\s?\d/.test(l) && /total/.test(l)) scores.receipt += 3;
    var best = 'note', bestS = 0, second = 0;
    Object.keys(scores).forEach(function (k) { if (scores[k] > bestS) { second = bestS; bestS = scores[k]; best = k; } else if (scores[k] > second) second = scores[k]; });
    if (bestS < 2) return { value: 'note', level: 'guess', scores: scores };
    return { value: best, level: bestS - second >= 3 ? 'sure' : 'guess', scores: scores };
  }

  /* ---------- title ---------- */
  function findTitle(lines, cat) {
    for (var i = 0; i < lines.length; i++) {
      var m = /^(?:event|title|subject|assignment|re|what)\s*[:\-]\s*(.+)$/i.exec(lines[i]);
      if (m && m[1].length > 2) return { value: m[1].slice(0, 80), level: 'sure' };
    }
    var content = lines.filter(function (l) { return !isNoise(l) && /[a-z]{3}/i.test(l); });
    if (!content.length) return null;
    var pick = content[0];
    if (cat === 'receipt') {
      var merchant = content.find(function (l) { return !/receipt|order|thank|date|invoice|total|tax|ship|paid|arriv|deliver|^\d|[$€£]|\d{3,}|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d/i.test(l) && l.length <= 40; });
      if (!merchant) return { value: 'Receipt', level: 'guess', note: 'No shop name found. Add one so you can find it later.' };
      return { value: 'Receipt: ' + merchant.slice(0, 60), level: 'guess', note: 'Made from the shop name in the screenshot. Rename it if you like.' };
    }
    // Prefer a short line mentioning the main keyword (e.g. "Dental cleaning appointment").
    var key = { event: /concert|party|festival|show|event|game|night|practice|rehearsal|meeting|tryout/i, assignment: /essay|assignment|homework|quiz|exam|project|lab|worksheet/i, booking: /reservation|booking|flight|hotel|table/i }[cat];
    if (key) { var k = content.find(function (l) { return key.test(l) && l.length <= 70; }); if (k) pick = k; }
    return { value: pick.replace(/[:\-–]+$/, '').slice(0, 80), level: 'guess', note: 'Taken from the screenshot text. Rename it if you like.' };
  }

  /* ---------- checklist lines ---------- */
  function findChecklist(lines) {
    var items = [];
    lines.forEach(function (l) {
      var m = /^(?:[-•*·▪◦]|\[\s?\]|☐|□|\d{1,2}[.)])\s+(.{2,100})$/.exec(l);
      if (m) items.push(m[1].trim());
    });
    return items;
  }

  /* ---------- main ---------- */
  function parse(text, opts) {
    opts = opts || {};
    var today = startOfDay(opts.today ? (typeof opts.today === 'string' ? fromYmd(opts.today) : opts.today) : new Date());
    var lines = cleanLines(text);
    var joined = lines.join('\n');
    var cat = classify(joined);
    var dates = findDates(joined, today);
    var times = findTimes(lines);
    var r = {
      category: cat,
      title: findTitle(lines, cat.value),
      date: null, dateOptions: [], time: null, endTime: null,
      location: findLocation(lines),
      amount: findAmount(lines),
      link: findLink(joined),
      email: findEmail(joined), phone: findPhone(joined),
      checklist: findChecklist(lines),
      isDeadline: false,
      lineCount: lines.length
    };
    if (dates.length) {
      var abs = dates.filter(function (d) { return !d.relative; });
      var main = abs[0] || dates[0];
      r.date = { value: main.value, level: main.level, note: main.note || '', raw: main.raw, options: main.options || null };
      var distinct = {};
      dates.forEach(function (d) { if (d.value) distinct[d.value] = 1; });
      var others = Object.keys(distinct).filter(function (v) { return v !== main.value; });
      if (others.length) {
        r.dateOptions = others.slice(0, 4);
        if (r.date.level === 'sure') { r.date.level = 'guess'; }
        r.date.note = (r.date.note ? r.date.note + ' ' : '') + 'More than one date in the screenshot: check this is the right one.';
      }
      // A relative word next to an absolute date ("Tomorrow, Nov 20") is fine: the absolute date wins.
    }
    if (times.length) {
      var t0 = times[0];
      r.time = { value: t0.value, level: t0.level, note: t0.note || '' };
      if (t0.end) r.endTime = { value: t0.end, level: 'sure' };
      var distinctT = {}; times.forEach(function (x) { distinctT[x.value] = 1; });
      if (Object.keys(distinctT).length > 1 && !t0.end) {
        r.time.level = r.time.level === 'sure' ? 'guess' : r.time.level;
        r.time.note = (r.time.note ? r.time.note + ' ' : '') + 'More than one time in the screenshot: check this is the right one.';
      }
    }
    r.isDeadline = /\b(due|deadline|submit by|turn in by|closes|expires|last day)\b/i.test(joined) || cat.value === 'assignment';
    if (cat.value === 'receipt') r.isDeadline = false;
    r.actions = suggest(r);
    return r;
  }

  function suggest(r) {
    var c = r.category.value, hasDate = !!r.date, list = [];
    if (c === 'receipt') list = ['receipt', 'save'];
    else if (c === 'assignment') list = ['reminder', 'checklist', 'event', 'save'];
    else if (c === 'appointment' || c === 'event' || c === 'booking') list = ['event', 'reminder', 'save'];
    else list = hasDate ? ['reminder', 'event', 'save'] : ['save', 'checklist', 'reminder'];
    if (r.checklist.length >= 2 && list.indexOf('checklist') < 0) list.splice(1, 0, 'checklist');
    if (r.amount && c !== 'receipt' && list.indexOf('receipt') < 0) list.push('receipt');
    if (list.indexOf('checklist') < 0) list.push('checklist');
    return list;
  }

  return { parse: parse, suggest: suggest, niceDate: niceDate, niceTime: niceTime, ymd: ymd, fromYmd: fromYmd, CATS: CATS, _cleanLines: cleanLines };
});
