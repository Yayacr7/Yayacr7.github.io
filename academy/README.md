# AI Income Academy (working name)

A beginner course on earning money with AI: understand AI, choose a skill, find a real problem, build a first solution, work toward a first sale, deliver and grow. Three paths: websites & simple tools, AI assistants & automations, digital products. No AI advertising or brand scaling.

**Run it:** open https://yayacr7.github.io/academy/ once this is on `main`, or locally:

```
cd Yayacr7.github.io
python3 -m http.server 8765
# open http://localhost:8765/academy/
```

No build step. Plain HTML, CSS and JavaScript, like the rest of this site.

## Files
- `index.html` – the app (pages, quizzes, progress, notes, bookmarks, worksheets, final project, pricing).
- `content.js` – all course content: paths, questionnaire, 6 modules, 12 lessons, quizzes, worksheets, sources.
- `config.js` – **owner settings**: course name, prices, checkout links, revenue goal.

## Change the name or prices
Edit `config.js`. `courseName` changes the name everywhere. Each plan has `price`, `features` and `checkoutUrl`. While `checkoutUrl` is empty, the button says payments are not set up.

## Where data lives
Progress, quiz scores, notes, bookmarks, worksheets and the final project are saved in the browser's localStorage on that device only. Students can download and restore a backup file (Notes page). There are no accounts.

## Still needed before a paid launch
See the in-app page `#/owner`. In short: payment links, a way to lock paid content (a static site cannot), accounts if you want progress to sync, terms/privacy/refund pages, a real fact check of the items on `#/facts` (official sites could not be reached when this was built), a support email, and real beginner testers.
