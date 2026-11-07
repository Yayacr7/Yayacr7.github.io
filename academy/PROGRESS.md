# AI Income Academy: Progress log

Read this and `SPEC.md` first when continuing in a new session.

## Done
- Nov 7, 2026 (round 1): built `/academy/` (homepage, questionnaire + path recommendation, dashboard, 6 modules x 2 lessons, quizzes, notes, bookmarks, 13 worksheets, final project, pricing from `config.js`, notes/backup, facts, owner page).
- Nov 7, 2026 (round 2): sourced facts in lessons (IRS, FTC, Stripe, GitHub Docs via official-domain search), common mistakes, stable shuffled quiz options, correct answer highlighted, fuller explanations, accessibility fixes, committed tests.
- Nov 7, 2026 (round 3): wrote `SPEC.md` and this log; independent review against the spec (see below).

## Remaining before a paid launch (owner)
- Payment links (`checkoutUrl` in `config.js`) and a way to lock paid content (course platform or backend + accounts).
- Terms, privacy and refund pages; support email.
- Re-open each source on the Facts page in a normal browser (they were checked through official-domain search).
- 3-5 real beginners test Modules 1-2; testimonials only from real students, with permission.
- Test on real Safari/iPad hardware and with a screen reader.

## How to check
```
node academy/tests/content-check.js
node academy/tests/browser-test.js        # needs Playwright
```
