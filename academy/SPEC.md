# AI Income Academy: Specification

Working name, changeable in `config.js`. Source: Yaya's course brief (Nov 7, 2026) plus project rules in `/CLAUDE.md`.

## 1. Purpose and audience
- **Who:** complete beginners (teens and adults) who want a practical, honest path toward earning income with AI skills, products and services. Little or no technical experience, a few hours a week, a small or $0 budget.
- **Not for:** people wanting guaranteed or fast money; experienced developers.
- **Business goal (owner only):** $1M in course revenue over time. An ambition, never shown to students as a result or promise.

## 2. Scope decisions (fixed)
- **Excluded:** AI advertising and freelance brand scaling. No lessons, examples or worksheets about them.
- **Three paths:** (1) websites and simple tools with AI assistance, (2) AI assistants and business automations, (3) digital products with AI assistance. Each path explains its skills, work, expenses and limits.
- **Honesty:** no invented testimonials, student earnings, sales numbers, completed tests or sources. Hypothetical examples are labeled. Facts are sourced and dated; anything unverified is labeled. General education, not tax or legal advice.

## 3. Essential features
| # | Feature | Must do |
|---|---------|---------|
| F1 | Homepage | Explains the course, who it helps and who it is not for, the 6-step path, the 3 paths, and that no income is promised. |
| F2 | Starting questionnaire | Asks about interests, experience, time, budget (and comfort with customers). Recommends one path, explains why, and lets the student pick another. |
| F3 | Dashboard | One clear "Continue learning" action, overall progress, chosen path, bookmarks, module cards. |
| F4 | Course content | 6 modules (Understand AI; Choose a useful skill; Find a problem worth solving; Build a first solution; Work toward a first sale; Deliver, improve, and grow), at least 2 full lessons each. |
| F5 | Lesson pages | Learning goal, plain-English word list, explanation, labeled worked example, practical task, knowledge check, notes, bookmark, complete, previous/next. |
| F6 | Quizzes | Score, an explanation for the chosen answer, the correct answer shown, retry. |
| F7 | Progress | Completion, quiz scores, notes, bookmarks, task ticks, worksheets saved; survive reload; device-only storage stated clearly; backup/restore. |
| F8 | Resources | Practical worksheets and templates (fill in, save, copy, download, print). |
| F9 | Final project | Portfolio case study the student can export and share, with an honesty check. |
| F10 | Pricing | Plans and prices from a config file; clear message while payments are not set up. |
| F11 | Facts & owner pages | Sources with check status; owner launch checklist and goal math. |

## 4. Design direction
- Colorful but readable: bright blue, purple, mint and orange accents on a light background; text contrast at least 4.5:1 (WCAG AA).
- Illustrated learning path, clear module cards, progress indicators, subtle completion celebrations.
- Comfortable on phone, iPad and computer: no sideways scrolling, tap targets about 40px+, 16px inputs.
- Keyboard navigation (skip link, visible focus, real buttons/radios), reduced-motion support.
- Plain English, one clear next step at a time. Welcoming, not childish.

## 5. Technical decisions
- Static HTML/CSS/JS in `academy/`, hosted on GitHub Pages like the rest of the repo; no build step. Content in `content.js`, settings in `config.js`.
- No accounts or payments in this version (needs a backend and owner keys). The site says so.

## 6. Completion criteria
1. A new student can go home -> questionnaire -> recommended path -> lesson 1 -> quiz -> complete -> dashboard shows "Continue learning" to lesson 2.
2. Every lesson has all F5 parts; every quiz question has an explanation for every option.
3. Progress (F7) survives a reload and returning later in a new browser tab.
4. All navigation works: menu, previous/next, browser Back, unknown pages.
5. No sideways scroll or JS errors on phone, iPad (portrait and landscape) and desktop sizes; automated accessibility scan clean.
6. No AI advertising or brand-scaling content; no hype or income promises; every fact has a source and check date or is labeled.
7. `node academy/tests/content-check.js` and `node academy/tests/browser-test.js` pass.

## 7. Gaps and conflicts (resolved without asking)
- **Colorful vs. earlier "professional dark, no candy colors" rule:** that rule was for AdSharp. This brief asks for color; resolved as bright accents on a light, readable base.
- **"Course/lesson/quiz" words vs. AdSharp's no-school-words rule:** that rule is AdSharp-only; this product is a course.
- **Paid course vs. static site:** content cannot be locked or paid for yet. Prices are placeholders; buttons say payments are not set up. Owner page lists what is needed.
- **Country:** facts are US-based and labeled "US"; other countries differ.
- **"Verify tool info with official sources":** the build machine cannot open official pages directly; facts were confirmed through web search limited to the official domain and are labeled that way. Tool prices and free tiers are not listed because they change often.
