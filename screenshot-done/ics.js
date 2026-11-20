/* Calendar file (.ics) and Google Calendar link builders.
   A website cannot add events to your calendar by itself. These make a file
   your calendar app opens, or a Google Calendar page you confirm there. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SDIcs = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function esc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) { // RFC 5545: lines max 75 octets
    var out = [], s = line;
    while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); }
    out.push(s); return out.join('\r\n');
  }
  function compact(date) { return date.replace(/-/g, ''); }
  function hm(t) { return t.replace(':', '') + '00'; }
  function nextDay(date) { var p = date.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2] + 1); return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }
  function plusMinutes(date, time, mins) {
    var p = date.split('-'), t = time.split(':');
    var d = new Date(+p[0], +p[1] - 1, +p[2], +t[0], +t[1] + mins);
    function z(n) { return ('0' + n).slice(-2); }
    return { date: d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()), time: z(d.getHours()) + ':' + z(d.getMinutes()) };
  }
  function stamp(now) {
    now = now || new Date();
    return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  /* item: {title, date 'YYYY-MM-DD', time 'HH:MM'|null, endTime, location, notes, link}
     alarm: minutes before start (null = no alarm). Times are "floating": your calendar shows them in your own time zone. */
  function build(item, opts) {
    opts = opts || {};
    if (!item.date) throw new Error('A date is needed for a calendar file.');
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Screenshot Done//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT'];
    lines.push('UID:' + (item.id || Math.random().toString(36).slice(2)) + '@screenshot-done');
    lines.push('DTSTAMP:' + stamp(opts.now));
    if (item.time) {
      var end = item.endTime ? { date: item.endTime < item.time ? plusMinutes(item.date, item.endTime, 24 * 60).date : item.date, time: item.endTime } : plusMinutes(item.date, item.time, opts.durationMinutes || 60);
      lines.push('DTSTART:' + compact(item.date) + 'T' + hm(item.time));
      lines.push('DTEND:' + compact(end.date) + 'T' + hm(end.time));
    } else {
      lines.push('DTSTART;VALUE=DATE:' + compact(item.date));
      lines.push('DTEND;VALUE=DATE:' + nextDay(item.date));
    }
    lines.push('SUMMARY:' + esc(item.title || 'From a screenshot'));
    if (item.location) lines.push('LOCATION:' + esc(item.location));
    var desc = [item.notes, item.link].filter(Boolean).join('\n');
    if (desc) lines.push('DESCRIPTION:' + esc(desc));
    if (item.link && /^https?:\/\//i.test(item.link)) lines.push('URL:' + item.link);
    if (opts.alarm != null) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(item.title || 'Reminder'),
        'TRIGGER:' + (opts.alarm === 0 ? 'PT0M' : '-PT' + opts.alarm + 'M'), 'END:VALARM');
    }
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  // Google Calendar's public "create event" page; nothing is saved until you press Save there.
  function googleLink(item) {
    var dates;
    if (item.time) {
      var end = item.endTime ? { date: item.date, time: item.endTime } : plusMinutes(item.date, item.time, 60);
      dates = compact(item.date) + 'T' + hm(item.time) + '/' + compact(end.date) + 'T' + hm(end.time);
    } else dates = compact(item.date) + '/' + nextDay(item.date);
    var q = 'action=TEMPLATE&text=' + encodeURIComponent(item.title || 'From a screenshot') + '&dates=' + dates;
    if (item.location) q += '&location=' + encodeURIComponent(item.location);
    var desc = [item.notes, item.link].filter(Boolean).join('\n');
    if (desc) q += '&details=' + encodeURIComponent(desc);
    return 'https://calendar.google.com/calendar/render?' + q;
  }
  return { build: build, googleLink: googleLink, plusMinutes: plusMinutes };
});
