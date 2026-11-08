# AI Income Academy: Specification

Working name, changeable in `config.js`. Sources: Yaya's course brief (Nov 7, 2026), Yaya's brand-scaling and coaching update (Nov 8, 2026), and project rules in `/CLAUDE.md`.

## 1. Purpose and audience
- **What it is:** an online coaching and mentorship program. Main track: **freelance brand scaling** (acting as a small marketing agency that runs paid ads on Instagram, TikTok and Google for e-commerce and clothing/streetwear brands). Optional extra tracks: the original AI income foundations with 3 paths.
- **Who:** beginners (adults, and teens with a parent or guardian for money matters) who want to learn a practical skill and are willing to do outreach and client work. Little experience needed; a few hours a week.
- **Not for:** people wanting guaranteed or fast money.
- **Coach:** Yaya runs the live coaching (group calls, 1-on-1 calls, feedback). The course content is the self-paced part.
- **Business goal (owner only):** $1M in program revenue over time. Never shown to students as a result or promise.

## 2. Scope decisions
- **Nov 8, 2026 change (replaces the earlier exclusion):** freelance brand scaling and AI ad management are now the main program. Covered: the agency/middleman model, setting up and accessing ad accounts, tracking, audiences and targeting, AI-driven ad tools, creative, launching and optimizing campaigns, reporting, pitching brands (cold outreach), and retainer models (flat monthly fee, % of ad spend, revenue share).
- **Kept:** the 6 foundation modules and 3 paths (websites/tools, AI assistants/automations, digital products) as optional extra tracks.
- **Program structure (funnel):** free training (mini-course) -> application -> application-based coaching tiers priced $1,500 to $4,800+ (Yaya's decision). Each tier lists exactly what is delivered.
- **Honesty (unchanged, stricter for high-ticket):** no income claims, no invented testimonials, student results, sales numbers or sources. A clear earnings disclaimer on the free training, application and pricing pages. Hypothetical examples labeled. Facts sourced and dated. No fake scarcity or countdowns. General education, not tax or legal advice.

## 3. Essential features
| # | Feature | Must do |
|---|---------|---------|
| F1 | Homepage | Says it is a coaching and mentorship program for brand scaling, who it helps and who it is not for, what is free, how the program works (free training -> apply -> coaching), and that no income is promised. |
| F2 | Starting questionnaire | Asks about interests, experience, time, budget, comfort with customers. Recommends a starting track (brand scaling or one of 3 paths), explains why, lets the student choose another. |
| F3 | Dashboard | One clear "Continue learning" action that follows the chosen track, progress, chosen track, bookmarks, module cards. |
| F4 | Course content | Brand Scaling track: 6 modules x 2 full lessons. Foundations track: 6 modules x 2 full lessons. |
| F5 | Lesson pages | Learning goal, plain-English words, explanation, labeled worked example, practical task, knowledge check, notes, bookmark, complete, previous/next; free-training lessons labeled. |
| F6 | Quizzes | Score only when all answered, explanation for every option, correct answer shown, retry. |
| F7 | Progress | Completion, quiz scores, notes, bookmarks, ticks, worksheets saved; survive reload and return; device-only storage stated; backup/restore. |
| F8 | Resources | Worksheets and templates, including brand-scaling tools (break-even ROAS, retainer pricing, outreach, onboarding, weekly report). |
| F9 | Final project | Portfolio case study with an honesty check, exportable. |
| F10 | Coaching & pricing | Free training, 3 coaching tiers from `config.js` ($1,500-$4,800+) with exact deliverables, earnings disclaimer, application form; clear message while payments and the application link are not set up. |
| F11 | Facts & owner pages | Sources with check status; owner launch checklist (unlinked). Revenue goal only in PROGRESS.md. |

## 4. Design direction
- Colorful but readable: bright blue, purple, mint and orange accents on a light background; text contrast at least 4.5:1.
- Illustrated learning path, clear module cards, progress indicators, subtle completion celebrations.
- Phone, iPad and computer: no sideways scrolling, tap targets about 40px+, 16px inputs.
- Keyboard navigation, visible focus, reduced-motion support. Plain English, one clear next step.

## 5. Technical decisions
- Static HTML/CSS/JS in `academy/`; no build step. Content in `content.js`, settings in `config.js`.
- No accounts, payments, locked content or form submission yet. The application form builds a message to send (or uses `applicationUrl` from config). Owner page lists what is needed.

## 6. Completion criteria
1. New student: home -> questionnaire -> recommended track -> first lesson -> quiz -> complete -> dashboard "Continue learning" goes to the next lesson in that track.
2. Every lesson in both tracks has all F5 parts; every quiz option has an explanation.
3. Progress survives reload and a full browser restart.
4. Navigation works: menu, previous/next, Back, unknown pages; free training -> apply flow works.
5. No sideways scroll or JS errors on phone, iPad and desktop; accessibility scan clean.
6. No income promises or hype; earnings disclaimer on free training, apply and pricing; every platform fact has an official source and check date or is labeled; coaching tiers list concrete deliverables.
7. `node academy/tests/content-check.js` and `node academy/tests/browser-test.js` pass.

## 7. Gaps and conflicts
- **Earlier exclusion of brand scaling:** replaced by Yaya's Nov 8 decision (asked and confirmed).
- **High-ticket pricing:** Claude rated $1,500-$4,800 at launch 5/10 (no student results yet, FTC scrutiny of money-making coaching) and suggested founding prices; Yaya chose $1,500-$4,800 with live coaching. Safeguards: concrete deliverables, no income claims, disclaimer, application instead of instant purchase pressure.
- **Platform features change often:** ad tool names (Advantage+, Smart+, Performance Max) are dated and sourced; lessons teach the principle first.
- **Application wording:** the site says you apply so you can talk before paying; it does not claim applicants are screened for suitability (FTC lists misrepresenting screening as unlawful). Add screening claims only with real written criteria.
- **Public repository:** SPEC.md, PROGRESS.md and CLAUDE.md are public; the site UI never shows the revenue goal.
- **Paid program vs. static site and GitHub Pages terms:** the paid program needs a host or course platform that allows selling, with accounts and locked content (owner task).
- **Country:** legal and tax facts are US-based and labeled.
