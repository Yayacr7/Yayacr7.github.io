# Return Rescue

Keep track of your returns. Keep more of your money.

A manual return tracker: purchases, confirmed return deadlines, a return checklist, reminders and refund tracking. Static web app (HTML/CSS/JS), installable on phones, works offline after one visit. All data stays in the browser on that device (purchases in localStorage, photos in IndexedDB). No account, no server.

## Manual vs connected
| Works now (manual) | Not built (needs real integrations) |
|---|---|
| Type a purchase, paste order-email text (the app picks out store, item, price, order number, dates, "return by" dates and "N-day" windows), attach receipt photos | Reading an email inbox or retailer accounts; reading text from photos (OCR) |
| You confirm the deadline from the seller's policy; unconfirmed dates are labeled and get no reminders | Getting policies from retailers |
| You mark each status after it really happened (with a confirmation tick for requested, sent and refund received) | Submitting returns, live carrier tracking, checking a bank for refunds |
| In-app reminders when the app is opened; "Add to calendar" (.ics with alarms) for reminders while the app is closed | Server push notifications |

## Business model (test)
Free = 5 active returns at a time (samples and completed returns not counted). "Plus" (unlimited, bigger history, household sharing) is shown as an idea, not for sale, no price. Going over 5 shows the plan and lets you continue during the test. "I'd be interested" is saved on the device only.

## Tests
From the repo root: `python3 -m http.server 8765 &` then `node return-rescue/tests/flows.test.js`.
Add `?today=YYYY-MM-DD` to the address to test deadlines and reminders on another date (a "Test" label shows in the header).
