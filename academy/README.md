# AI Income Academy (working name)

A beginner course on earning money with AI: understand AI, choose a skill, find a real problem, build a first solution, work toward a first sale, deliver and grow. Three paths: websites & simple tools, AI assistants & automations, digital products. No AI advertising or brand scaling.

**Run it:** open https://yayacr7.github.io/academy/ once this is on `main`, or locally:

```
cd Yayacr7.github.io
python3 -m http.server 8765
# open http://localhost:8765/academy/
```

No build step. Plain HTML, CSS and JavaScript, like the rest of this site.

## Test it
```
node academy/tests/content-check.js     # content: structure, quiz keys, honesty rules, example math (no installs)
node academy/tests/browser-test.js      # full journey in Chromium + 7 device sizes (needs Playwright)
AXE_PATH=/path/to/axe.min.js node academy/tests/browser-test.js   # adds an accessibility scan
```

## Design decisions
- **Plain HTML/JS, no framework or build.** Matches the rest of this repo (static GitHub Pages). A React/Vite app would add a build step without changing what students see.
- **Progress in localStorage + backup file**, not accounts. Accounts need a backend and keys; that is a launch task, not a first-version need.
- **Content separate from code** (`content.js`), so lessons can be edited without touching app logic. Quiz options are shown in a fixed shuffled order so the right answer is not always in the same place.
- **Facts are dated and sourced** (Facts & sources page). Tool prices and free tiers are deliberately not listed because they change often.

## Files
- `index.html` – the app (pages, quizzes, progress, notes, bookmarks, worksheets, final project, pricing).
- `content.js` – all course content: paths, questionnaire, 6 modules, 12 lessons, quizzes, worksheets, sources.
- `config.js` – **owner settings**: course name, prices, checkout links, revenue goal.
- `tests/` – content check and browser test.

## Change the name or prices
Edit `config.js`. `courseName` changes the name everywhere. Each plan has `price`, `features` and `checkoutUrl`. While `checkoutUrl` is empty, the button says payments are not set up.

## Where data lives
Progress, quiz scores, notes, bookmarks, worksheets and the final project are saved in the browser's localStorage on that device only. Students can download and restore a backup file (Notes page). There are no accounts.

## Still needed before a paid launch
See the in-app page `#/owner`. In short: payment links, a way to lock paid content (a static site cannot), accounts if you want progress to sync, terms/privacy/refund pages, a final look at the items on `#/facts` (they were checked through searches limited to the official sites, not by opening the pages), a support email, and real beginner testers.
