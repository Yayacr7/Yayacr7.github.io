# Screenshot → Done

"Turn screenshots into things you actually get done."

Add a screenshot (appointment text, event flyer, assignment, receipt, booking). The app reads the text **on the device**, fills in an editable summary (title, date, time, place, amount, link), marks anything unsure, suggests an action (event, reminder, checklist, receipt, save) and does nothing until the person confirms.

## Who it is for (strongest audience first)
1. **Students (high school and college).** They screenshot assignment pages, due dates and group-chat plans all day, and the cost of forgetting is real (a missed deadline). Checklists + "due" reminders fit them best.
2. **Busy parents / people juggling appointments.** Dentist texts, school flyers, practice changes, booking confirmations.
3. **Freelancers and side-hustlers** saving receipts for taxes (receipt list + CSV export).

Start with students: one clear job ("never miss a due date you screenshotted"), easy to reach (schools, TikTok/Instagram), and they already live in screenshots. This is a hypothesis to test, not a proven market.

## Screens
| Screen | Route | What it does |
|---|---|---|
| Welcome | `#/welcome` | One screen: the benefit, an animated screenshot → event/checklist/receipt, 3 honest promises. Shown once. |
| Home | `#/home` | Big "Add screenshot" card, "Type or paste text", "Try a sample", Needs you now, Coming up, Recently saved, unconfirmed calendar entries. |
| Review | `#/review` | Original image beside the details (side by side on iPad). Found / Check this / Confirm / Not found tags. Relative dates block Continue until picked or confirmed. Choose the action. |
| Confirm | `#/confirm` | Exactly what will and will not happen, action options (alert time, reminder time, checklist steps), per-item privacy. |
| Done | `#/done/<id>` | Truthful result ("A calendar file was downloaded. It is not in your calendar yet"), "I added it" button. |
| Saved | `#/saved` | Search, category filters, show done, receipt total + CSV export. |
| Item | `#/item/<id>` | Edit, mark done, tick checklist, calendar status, re-download .ics, delete picture/text/item. |
| Settings | `#/settings` | Privacy switches, delete all, what works vs what needs a service, pricing hypothesis, Add to Home Screen. |

## What works here vs. what needs more
| Feature | Status | Notes |
|---|---|---|
| OCR | Works on device | Tesseract.js 5.1.1 + English (best_int), served from `vendor/ocr/` on this site (~11 MB, cached after first use). No CDN, no upload. Weak on handwriting and stylized fonts. |
| Understanding | Works, rules | `parse.js`: dates, times, ranges, amounts (prefers the Total line), links, emails, phones, places, checklist lines, type. Not AI. |
| Create event | Calendar file | `.ics` download (+ optional alert) or Google Calendar's own "create event" page. A website cannot write to the calendar; a native app with calendar permission (EventKit / Calendar Provider) could. |
| Reminders | In app + optional .ics alert | Push notifications need a native app or a push server: not built. |
| Share sheet | Needs native app | iOS share sheet lists native apps only. Web Share Target works only for installed web apps on Android: not built. Alternatives here: photo picker, drag and drop, paste. |
| AI understanding | Needs a service | Would need an AI API, a key, a small server, and the text would leave the device. |
| Sync, accounts, payments | Not built | |

## Privacy
No server, no account, no analytics, no third-party requests. Items live in IndexedDB on the device. The screenshot is forgotten after reading unless the person ticks "Keep a small copy" (off by default, auto-removed after 7 days by default). Full OCR text is not kept unless chosen. Delete one item, all pictures, or everything (also clears the cached reader).

## Pricing (hypothesis, not proven)
Free: 30 screenshots a month, all core actions. Plus: $3.99/month guess, unlimited, folders/tags, monthly receipt reports, optional AI reading and sync (those need servers). Nothing is charged or limited in this version; a monthly count is kept on the device only so the free-allowance idea can be tested.

## Tests
```
node screenshot-done/tests/parse-test.js            # 49 reader checks, incl. "nothing invented" controls
npx http-server -p 8765 -c-1 .                      # from the repo root
node screenshot-done/tests/browser-test.js          # 110 checks, real OCR, iPhone SE/13, iPad Mini, iPad Pro, desktop
```
Not tested: real iPhone/iPad hardware or Safari (Chromium emulation only), opening the .ics on a real phone, real users.
