# AI Income Academy: Progress log

Read this and `SPEC.md` first when continuing in a new session.

## Done
- Nov 7, 2026 (round 1): built `/academy/` (homepage, questionnaire + path recommendation, dashboard, 6 modules x 2 lessons, quizzes, notes, bookmarks, 13 worksheets, final project, pricing from `config.js`, notes/backup, facts, owner page).
- Nov 7, 2026 (round 2): sourced facts in lessons (IRS, FTC, Stripe, GitHub Docs via official-domain search), common mistakes, stable shuffled quiz options, correct answer highlighted, fuller explanations, accessibility fixes, committed tests.
- Nov 7, 2026 (round 3): wrote `SPEC.md` and this log. Two independent reviewers (product/QA and content) compared the work with the spec. Every finding was re-checked, then fixed:
  - Product: tracker and long notes caused sideways scroll on phones; quiz revealed answers before all were answered; focus lost after checking; "Continue learning" followed the last opened lesson; Reduce motion switch did not stop smooth scroll; file-restore button had no focus ring; owner revenue goal was one tap from student pages (now removed from the site); opening a worksheet marked it Started; price calculator accepted negative numbers; menu did not close on outside tap; lesson header did not update to Completed; small footer tap targets.
  - Content: GitHub Pages may not host a business or store (GitHub Terms), so paid client sites and the paid course need another host; CAN-SPAM needs a clear "this is an ad" and postal address, now in the lesson, fact box and email template; Digital products path now has offer, pricing and support sections in Modules 5-6; static forms need a form service; assistants are given an FAQ, not "trained"; under-18 note; IRS estimated tax ($1,000 rule); softer tagline and headline; "Course updates while it is offered" instead of "Lifetime updates"; small consistency fixes.
  - Tests: 559 content checks, 90 browser checks, plus a start-to-finish run with a full browser restart on iPhone 13, iPad Mini and desktop.

- Nov 8, 2026 (round 4): scope change from Yaya: brand scaling coaching program is the main track (content-scale.js, coaching tiers, free training, apply). Tests 1,112 + 104 pass. Merged live (PR #52). Independent review found 14 issues; fixed: FTC screening wording softened (no suitability-screening claim), revenue goal removed from config.js, s3l1 formula (multiply, not divide), quiz answers no longer given away by length (65 of 73 were longest, now 3), jargon defined, hoodie example wording, Applications-not-open notice, age answer required, tier names and deliverables clearer, Facts header, stale owner items, empty ROAS calculator, phone path-map labels. Tests: 1,113 content + 106 browser checks pass.

## Owner notes (not on the site)
- Revenue goal: $1,000,000 in program revenue. Arithmetic only: about 667 sales at $1,500, 345 at $2,900 or 209 at $4,800, before fees, refunds, taxes and costs.
- Note: this repository is public, so this file, SPEC.md and CLAUDE.md can be read by anyone at github.com and on the live site. Keep private notes somewhere private.

## Remaining before a paid launch (owner)
- Confirm every coaching deliverable in config.js (calls, reviews, reply times) and remove anything you cannot keep.
- Set applicationUrl (a real form), bookingUrl and supportEmail in config.js.
- Coaching agreement + refund policy (ideally lawyer-reviewed); set refundNote.
- No income claims anywhere, including social posts and sales calls (FTC money-making opportunities notice).
- Host the paid version somewhere that allows selling (GitHub's terms do not allow Pages to run an online business or store).
- Payment links (sent after the fit call) and a way to lock paid content (course platform or backend + accounts).
- Only claim applicants are screened if you really accept or decline against written criteria (FTC).
- Terms, privacy and refund pages; support email.
- Re-open each source on the Facts page in a normal browser (they were checked through official-domain search).
- 3-5 real beginners test Modules 1-2; testimonials only from real students, with permission.
- Test on real Safari/iPad hardware and with a screen reader.

## How to check
```
node academy/tests/content-check.js
node academy/tests/browser-test.js        # needs Playwright
```
