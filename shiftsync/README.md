# ShiftSync

"Your shifts, your time, all together."

For hourly workers whose schedules change, at one job or several. Add each workplace once, add shifts by hand or from a photo of the schedule, check them before saving, and see everything in one calendar with overlaps, tight travel gaps and an estimated gross pay.

Live path (once merged): `yayacr7.github.io/shiftsync/`. Separate app; it only borrows the text-reader files from `../screenshot-done/vendor/ocr/`.

## Screens
| Screen | Route | What it does |
|---|---|---|
| Welcome | `#/welcome` | Promise, 4 honest points, add first workplace or load labelled demo shifts. Shown once. |
| Home | `#/home` | Big Next shift / On shift now card (time, job, paid hours, overnight end, clash), Add / Schedule photo, Needs you (clashes, past shifts to confirm, stale schedules), This week hours by job + estimated gross. |
| Calendar: week | `#/week/<date>` | One row per day: big times, job colour, paid hours, flags (Overlap, Tight travel, Ends next day, Worked, Changed by you), overnight continuation on the next day, a 24-hour strip per day. |
| Calendar: month | `#/month/<yyyy-mm>[/<day>]` | Colour bars per day, clash marks, month hours, tap a day for its shifts. |
| Add / Shift details | `#/add`, `#/shift/<id>` | Workplace, date, start, end (overnight detected live), paid/unpaid breaks, per-shift rate, notes, repeat on other days. Details: clashes, where it came from and when it was confirmed, "What actually happened" (not yet / as scheduled / different hours), calendar file, delete. |
| Import | `#/import` | 1 pick job + photo/text/sample → 2 read on device → (team schedule) pick your row → 3 review and fix every shift (Found / Check tags, week question if no dates) → 4 compare with saved shifts (changed, removed, new, same, kept-as-worked), tick to replace → saved. |
| Workplaces | `#/places`, `#/place/<id>` | Name, colour (10, all ≥4.5:1 on white), time zone, optional rate, travel time, usual unpaid break, address. Shows "schedule last confirmed". |
| Pay | `#/pay/<period>` | Confirmed (worked) vs not confirmed yet, per job, unrated hours, confirm past shifts, hours CSV. |
| Settings | `#/settings` | Reminder alert for calendar files, in-app "shift soon" banner, calendar export, week start, display time zone, travel check, privacy (remember my name, backup/restore, demo, delete all), plans hypothesis, what works vs what needs more. |

## Rules that matter
- Times are stored as the workplace's own wall-clock time and turned into real instants with the browser's time-zone data. An end time at or before the start = ends next day. Overnight shifts across a clock change are counted in real hours (Oct 31→Nov 1 2026, 10 PM–6 AM Chicago = 9 h).
- Unpaid breaks come off paid hours; paid breaks do not.
- Actual hours only count after you mark the shift worked. Scheduled times are kept.
- Overlaps: any two shifts. Travel: back-to-back shifts at different jobs closer than the second job's travel time.
- Replacing: only shifts of that workplace inside the imported dates are compared. Nothing changes until you tick "Yes, replace N saved shifts". Shifts you marked worked are never replaced. "Keep my saved shifts, add only new" is offered too.
- The reader never invents a date: weekdays without dates → you pick the week. AM/PM guesses and worked-out dates are tagged Check.
- Other people's rows are dropped from memory as soon as you pick yours. The photo is never uploaded or stored. Only your own name can be remembered (switch).
- Estimated gross = paid hours × your rates. No taxes, overtime, tips, differentials, holiday pay or rounding. Never presented as a paycheck.
- Nothing here tells or asks an employer anything.

## Works here vs needs more
| Feature | Status |
|---|---|
| Reading schedule photos | Works on device (Tesseract.js 5.1.1, sparse-text mode, word positions map cells to day columns). Weak on handwriting, whiteboards, glare, tilted photos. |
| Calendar | .ics download (UTC times, optional alert). Direct calendar writing or a self-updating feed needs a native app or a server. |
| Reminders | Calendar alerts + in-app banner while open. Push notifications when closed need a native app or push server: not built. |
| Camera scanning / share sheet | Photo picker only. Needs native app. |
| Sync, accounts, payments | Needs a server: not built. Backup/restore file instead. |

## Plans (hypothesis, nothing charged or locked)
Free: one workplace, shifts, photo import, calendar, overlap check, estimate, 2-week calendar file. Plus (guess $3.99/mo or $29/yr): multi-job tools (more workplaces, cross-job overlap + travel, combined pay), advanced exports (CSV, all upcoming, later live feed), customization. Features are tagged "Plus idea" in the app to see what people use.

## Tests
```
node shiftsync/tests/engine-test.js     # 82: dates, time zones, overnight, clock changes, breaks, actual hours, overlaps, travel, earnings, replacement, export, colours
node shiftsync/tests/reader-test.js     # 62: time ranges, dates, grid by position, missing dates, list mode
npx http-server -p 8765 -c-1 .          # from the repo root, then:
node shiftsync/tests/browser-test.js    # 145: full journey with real typing + real OCR, replace, pay, export, backup, 7 screen sizes, blocked storage
node shiftsync/tests/make-samples.js    # rebuilds the 2 sample schedule pictures (made-up names)
```
Not tested: real Safari / iPhone / Android hardware, photos of real paper schedules, .ics import on a phone, screen readers, real users.
