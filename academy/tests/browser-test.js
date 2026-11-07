// End-to-end browser test for the academy. Starts its own static server.
// Run: node academy/tests/browser-test.js
// Needs Playwright with Chromium. Optional: AXE_PATH=/path/to/axe.min.js runs an accessibility scan.
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium, devices } = require("playwright");
const ROOT = path.join(__dirname, "..", "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const results = []; const ok = (c, m) => results.push((c ? "PASS " : "FAIL ") + m);
const KEY = "aiacademy.v1";

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const U = "http://localhost:" + server.address().port + "/academy/";
  const b = await chromium.launch();
  // Block web fonts so tests do not depend on the network.
  const ctxOpts = { viewport: { width: 1280, height: 800 } };
  const ctx = await b.newContext(ctxOpts); await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  const L = await (async () => { await p.goto(U); return p.evaluate(() => ACADEMY.LESSONS.map(l => ({ id: l.id, a: l.quiz.map(q => q.answer), n: l.quiz.length }))); })();

  // 1. Learning path: home -> questionnaire -> recommendation
  ok((await p.locator("h1").first().innerText()).includes("Learn to earn"), "home page renders");
  await p.click("text=Find my starting path");
  for (const v of ["save", "ok", "mid", "more", "like"]) { await p.check(`input[value="${v}"]`); await p.keyboard.press("Enter"); await p.waitForTimeout(50); }
  ok((await p.locator("h1").innerText()) === "AI assistants & automations", "questionnaire recommends a path from answers");
  ok(await p.locator("text=We suggest this because").count() === 1, "recommendation is explained");
  ok((await p.locator("main").innerText()).includes("Limits to know"), "path shows limits and expenses");
  await p.click('[data-choose="products"]');
  ok(await p.locator(".tag:has-text('Chosen')").count() === 1, "student can choose another path");
  await p.click("text=Start lesson 1");
  await p.waitForSelector("#quiz");
  ok(p.url().endsWith("#/lesson/m1l1"), "result page leads to lesson 1");

  // 2. Lesson parts
  const main = await p.locator("main").innerText();
  ["Learning goal", "Words in plain English", "Explanation", "Worked example", "HYPOTHETICAL EXAMPLE", "Your task", "Knowledge check", "My notes", "Common mistake"].forEach(t => ok(main.toUpperCase().includes(t.toUpperCase()), "lesson shows: " + t));

  // 3. Quiz feedback
  ok(await p.locator("#complete").isDisabled(), "cannot complete before the knowledge check");
  await p.click("text=Check my answers");
  ok((await p.locator("#qmsg").innerText()).includes("Answer all"), "quiz asks for all answers");
  const wrong = L[0].a.map((a, i) => i === 0 ? (a + 1) % 3 : a);
  for (let i = 0; i < 3; i++) await p.check(`input[name=q${i}][value="${wrong[i]}"]`);
  await p.click("text=Check my answers");
  ok((await p.locator("#qmsg").innerText()).includes("2 of 3"), "score is correct (2 of 3)");
  const fb = await p.locator(".fb.no").innerText();
  ok(fb.includes("Not quite") && fb.includes("Best answer"), "wrong answer gets an explanation and the best answer");
  ok(await p.locator(".fb.ok").count() === 2, "right answers get explanations");
  ok(await p.locator(".qq.checked .opt.is-answer .ans-tag").count() === 3, "correct option is highlighted in every question");
  await p.click("#qreset");
  // keyboard-only answering: focus first radio of each group, then arrow keys
  for (let i = 0; i < 3; i++) await p.check(`input[name=q${i}][value="${L[0].a[i]}"]`);
  await p.locator("form#quiz button[type=submit]").focus(); await p.keyboard.press("Enter");
  ok((await p.locator("#qmsg").innerText()).includes("3 of 3"), "retry by keyboard scores 3 of 3");

  // 4. Notes, bookmark, task ticks, completion, then reload
  await p.fill("#note", "Bakery bio invented a founding year."); await p.waitForTimeout(600);
  await p.click("#bm"); await p.check('[data-step="1"]');
  await p.click("#complete");
  ok((await p.locator("#donebox").innerText()).includes("Lesson complete"), "lesson completes");
  await p.reload(); await p.waitForTimeout(150);
  ok((await p.inputValue("#note")).includes("founding year"), "note survives reload");
  ok((await p.getAttribute("#bm", "aria-pressed")) === "true", "bookmark survives reload");
  ok(await p.isChecked('[data-step="1"]'), "task tick survives reload");
  ok((await p.locator("#donebox").innerText()).includes("Lesson complete"), "completion survives reload");
  ok((await p.locator("main").innerText()).includes("Best score so far: 3 of 3"), "quiz best score survives reload");

  // 5. Navigation
  await p.click("#donebox a.btn"); await p.waitForSelector("text=Write useful prompts"); ok(p.url().endsWith("#/lesson/m1l2"), "Next lesson button");
  await p.click(".pn a >> nth=0"); ok(p.url().endsWith("#/lesson/m1l1"), "Previous link");
  await p.goBack(); ok(p.url().endsWith("#/lesson/m1l2"), "browser Back works");
  for (const [label, hash] of [["Dashboard", "#/dashboard"], ["Course", "#/course"], ["Resources", "#/resources"], ["Final project", "#/project"], ["Notes", "#/notes"], ["Pricing", "#/pricing"], ["Home", "#/"]]) {
    await p.click(`nav.main a:text-is("${label}")`); await p.waitForFunction(h => location.hash === h || (h === "#/" && location.hash === "#/"), hash); await p.waitForTimeout(50); ok(p.url().endsWith(hash) && (await p.getAttribute(`nav.main a:text-is("${label}")`, "aria-current")) === "page", "menu: " + label);
  }
  await p.goto(U + "#/nope"); ok((await p.locator("h1").innerText()) === "Page not found", "unknown page shows Not found");
  await p.goto(U + "#/lesson/zzz"); ok((await p.locator("h1").innerText()) === "Page not found", "unknown lesson shows Not found");

  // 6. Dashboard continue
  await p.goto(U + "#/dashboard");
  const cont = await p.locator(".continue").innerText();
  ok(cont.includes("Continue learning") && cont.includes("Write useful prompts"), "dashboard Continue learning goes to next lesson");
  ok(cont.includes("8%"), "progress ring shows 8%");
  ok((await p.locator("main").innerText()).includes("Digital products"), "dashboard shows the chosen path");

  // 7. Worksheets and calculators
  await p.goto(U + "#/resources/price");
  for (const [k, v] of [["hours", "8"], ["buffer", "30"], ["rate", "30"], ["feep", "2.9"], ["feef", "0.30"], ["tax", "25"]]) await p.fill("#p_" + k, v);
  ok((await p.locator("#pres").innerText()).includes("$321.63"), "price calculator: (312 + 0.30) / 0.971 = $321.63");
  await p.goto(U + "#/resources/money"); await p.click("#addM"); await p.selectOption("[data-c=type]", "in"); await p.fill("[data-c=amt]", "500"); await p.click("#addM"); await p.fill("[data-c=amt] >> nth=1", "120");
  ok((await p.locator("#mres").innerText()).includes("$380"), "expense tracker: 500 - 120 = $380 profit");
  await p.reload(); ok((await p.locator("#mres").innerText()).includes("$380"), "tracker survives reload");
  await p.goto(U + "#/resources/score"); for (let i = 0; i < 5; i++) await p.selectOption("#s0_" + i, "4");
  ok((await p.locator("#scoreRows").innerText()).includes("20 / 25"), "problem scorecard totals");
  await p.goto(U + "#/resources/prompt"); await p.fill("#f_goal", "welcome email");
  ok((await p.locator("#pout").innerText()).includes("Goal: welcome email"), "prompt builder assembles prompt");

  // 8. Final project export is escaped
  await p.goto(U + "#/project"); await p.fill("#pj_title", "Demo <b>x</b>"); await p.fill("#pj_problem", "p"); await p.fill("#pj_solution", "s"); await p.waitForTimeout(400);
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#pjHtml")]);
  const html = fs.readFileSync(await dl.path(), "utf8"); ok(html.includes("Demo &lt;b&gt;x") && !html.includes("<b>x"), "project page download escapes text");

  // 9. Pricing, owner, facts
  await p.goto(U + "#/pricing"); await p.click("[data-nopay] >> nth=0"); ok(await p.locator("#paymsg").isVisible(), "unpaid plan explains payments are not set up");
  await p.goto(U + "#/owner"); ok((await p.locator("main").innerText()).includes("10,310"), "owner goal math ($1M / $97)");
  await p.goto(U + "#/lesson/m5l2"); ok((await p.locator(".facts").innerText()).includes("10 business days"), "checked facts box with source on lesson");

  // 10. All lessons complete
  for (const l of L) { await p.goto(U + "#/lesson/" + l.id); if (!(await p.locator("#complete").count())) continue; for (let i = 0; i < l.n; i++) await p.check(`input[name=q${i}][value="${l.a[i]}"]`); await p.click("text=Check my answers"); await p.click("#complete"); }
  await p.goto(U + "#/dashboard"); ok((await p.locator(".continue").innerText()).includes("All 12 lessons complete"), "all-complete state points to final project");

  // 11. Backup and restore
  await p.goto(U + "#/notes");
  const [bk] = await Promise.all([p.waitForEvent("download"), p.click("#exp")]); const bkPath = await bk.path();
  await p.evaluate(k => localStorage.removeItem(k), KEY); await p.reload();
  await p.goto(U + "#/notes"); await p.setInputFiles("#imp", bkPath); await p.waitForTimeout(200);
  await p.goto(U + "#/dashboard"); ok((await p.locator(".continue").innerText()).includes("All 12 lessons complete"), "backup file restores progress");
  ok(errs.length === 0, "no JavaScript errors in main journey " + errs.join(" | "));
  const state = await p.evaluate(k => localStorage.getItem(k), KEY);

  // 12. Damaged and blocked storage
  const c2 = await b.newContext(); await c2.addInitScript(k => localStorage.setItem(k, "{broken"), KEY);
  const p2 = await c2.newPage(); const e2 = []; p2.on("pageerror", e => e2.push(e.message)); await p2.goto(U + "#/dashboard");
  ok(e2.length === 0 && (await p2.locator(".continue").count()) === 1, "damaged saved data does not break the app");
  const c3 = await b.newContext(); await c3.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("blocked"); }; Storage.prototype.getItem = () => { throw new Error("blocked"); }; });
  const p3 = await c3.newPage(); await p3.goto(U); ok(await p3.locator("#storeWarn").isVisible(), "blocked storage shows a warning and the app still runs");
  await c2.close(); await c3.close();

  // 13. Reduced motion: no confetti
  const rm = await b.newContext({ reducedMotion: "reduce" }); const r = await rm.newPage(); await r.goto(U + "#/lesson/m1l1");
  for (let i = 0; i < 3; i++) await r.check(`input[name=q${i}][value="${L[0].a[i]}"]`); await r.click("text=Check my answers"); await r.click("#complete");
  ok(await r.locator(".confetti").count() === 0, "reduced motion: no confetti"); await rm.close();

  // 14. Devices: no sideways scroll, no errors, tap targets
  const routes = ["", "dashboard", "course", "start", "start/result", "lesson/m1l1", "lesson/m5l2", "resources", "resources/money", "resources/price", "resources/score", "project", "notes", "pricing", "facts", "owner"];
  const devs = [["iPhone SE", devices["iPhone SE"]], ["iPhone 13", devices["iPhone 13"]], ["Pixel 7", devices["Pixel 7"]], ["iPad Mini", devices["iPad Mini"]], ["iPad Pro 11 landscape", devices["iPad Pro 11 landscape"]], ["Laptop 1366x768", { viewport: { width: 1366, height: 768 } }], ["Desktop 1920x1080", { viewport: { width: 1920, height: 1080 } }]];
  const axe = process.env.AXE_PATH && fs.existsSync(process.env.AXE_PATH) ? fs.readFileSync(process.env.AXE_PATH, "utf8") : null;
  for (const [name, d] of devs) {
    const c = await b.newContext(d); await c.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await c.addInitScript(([k, s]) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem(k, s); sessionStorage.setItem("seeded", "1"); } }, [KEY, state]);
    const q = await c.newPage(); const e = []; q.on("pageerror", x => e.push(x.message)); const bad = [], small = [];
    for (const rt of routes) {
      await q.goto(U + "#/" + rt); await q.waitForTimeout(40);
      const sw = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (sw > 1) bad.push(rt + ":" + sw);
      if (d.hasTouch) { const s = await q.evaluate(() => [...document.querySelectorAll("main .btn, main .opt, nav.main a, #menuBtn")].filter(el => el.offsetParent && el.getBoundingClientRect().height < 40).map(el => el.textContent.trim().slice(0, 20))); if (s.length) small.push(rt + ":" + s.join("/")); }
    }
    ok(!bad.length && !e.length, `${name}: ${routes.length} pages, no sideways scroll, no errors ${bad.join(",")} ${e.join("|")}`);
    if (d.hasTouch) ok(!small.length, `${name}: buttons at least 40px tall for touch ${small.join(" ")}`);
    if (d.hasTouch && await (await q.goto(U), q.locator("#menuBtn")).isVisible()) { await q.click("#menuBtn"); ok(await q.locator("#nav").isVisible(), name + ": menu opens"); await q.keyboard.press("Escape"); ok(!(await q.locator("#nav").isVisible()), name + ": Escape closes menu"); }
    if (axe && name === "iPhone 13") {
      const issues = [];
      for (const rt of routes) { await q.goto(U + "#/" + rt); await q.addScriptTag({ content: axe }); const v = await q.evaluate(async () => (await axe.run(document, { resultTypes: ["violations"] })).violations.map(x => x.id + "(" + x.nodes.length + ")")); if (v.length) issues.push(rt + ": " + v.join(",")); }
      ok(!issues.length, "axe accessibility scan, " + routes.length + " pages " + issues.join(" ; "));
    }
    if (process.env.SHOTS) { for (const rt of ["", "dashboard", "lesson/m5l2", "start/result"]) { await q.goto(U + "#/" + rt); await q.screenshot({ path: path.join(process.env.SHOTS, name.replace(/\W+/g, "-") + "-" + (rt.replace(/\W+/g, "-") || "home") + ".png") }); } }
    await c.close();
  }

  // 15. Keyboard: skip link
  await p.goto(U); await p.keyboard.press("Tab"); ok(await p.evaluate(() => document.activeElement.id) === "skip", "first Tab reaches skip link");
  await p.keyboard.press("Enter"); ok(await p.evaluate(() => document.activeElement.id) === "main", "skip link moves focus to content");

  await b.close(); server.close();
  console.log(results.join("\n"));
  const f = results.filter(x => x.startsWith("FAIL")).length;
  console.log(`\n${results.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
})().catch(e => { console.log(results.join("\n")); console.error(e); server.close(); process.exit(1); });
