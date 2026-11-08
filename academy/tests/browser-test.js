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
async function stepTo(pg, k) { await pg.click(`.stepnav button[data-goto="${k}"]`); }
async function answerQuiz(pg, arr) { await stepTo(pg, 5); for (let i = 0; i < arr.length; i++) { await pg.click(`.qnav button[data-qi="${i}"]`); await pg.check(`input[name=q${i}][value="${arr[i]}"]`); } }
async function finishLesson(pg, arr) { await answerQuiz(pg, arr); await pg.click("#qsubmit"); await stepTo(pg, 6); await pg.click("#complete"); }

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
  ok((await p.locator("h1").first().innerText()).includes("Learn to run ads"), "home page renders as a coaching program");
  ok((await p.locator('[role="tab"]').count()) >= 4 && (await p.locator(".tabpanel:visible").innerText()).includes("Free training") && (await p.locator(".disc").count()) === 1, "home: tabs (How it works first) and the earnings disclaimer");
  await p.click('[role="tab"][data-tab="learn"]'); ok((await p.locator(".tabpanel:visible").innerText()).includes("Ad accounts and tracking"), "home tab switches to What you will learn");
  await p.keyboard.press("ArrowRight"); ok((await p.getAttribute('[role="tab"][data-tab="who"]', "aria-selected")) === "true", "tabs work with arrow keys");
  await p.click("text=Take the 1-minute questionnaire");
  for (const v of ["save", "ok", "mid", "more", "like"]) { await p.check(`input[value="${v}"]`); await p.keyboard.press("Enter"); await p.waitForTimeout(50); }
  ok((await p.locator("h1").innerText()) === "AI assistants & automations", "questionnaire recommends a path from answers");
  ok(await p.locator("text=We suggest this because").count() === 1, "recommendation is explained");
  ok((await p.locator("main").innerText()).includes("Limits to know"), "path shows limits and expenses");
  await p.click('[data-choose="products"]');
  ok(await p.locator(".tag:has-text('Chosen')").count() === 1, "student can choose another path");
  await p.click("text=Start lesson 1");
  await p.waitForSelector("#quiz", { state: "attached" });
  ok(p.url().endsWith("#/lesson/m1l1"), "result page leads to lesson 1");

  // 2. Lesson parts: one step per screen
  ok(await p.locator(".lstep:visible").count() === 1 && (await p.locator(".stepnav button").count()) === 7, "lesson shows one step at a time (7 steps)");
  const texts = await p.evaluate(() => document.querySelector("main").textContent.toUpperCase());
  ["Learning goal", "Words in plain English", "Explanation", "Worked example", "HYPOTHETICAL EXAMPLE", "Your task", "Knowledge check", "My notes", "Common mistake"].forEach(t => ok(texts.includes(t.toUpperCase()), "lesson has: " + t));
  await p.click("#snext"); ok(await p.locator('.lstep[data-ls="1"]').isVisible() && (await p.locator("#scount").innerText()) === "Step 2 of 7", "Next button moves to step 2");
  await p.locator("body").focus(); await p.keyboard.press("ArrowRight"); await p.waitForTimeout(50);
  ok(await p.locator('.lstep[data-ls="2"]').isVisible() || await p.locator('.lstep[data-ls="1"] .xcount').innerText() !== "", "arrow key moves forward");
  await stepTo(p, 0); ok(await p.locator('.lstep[data-ls="0"]').isVisible(), "step buttons jump to a step");

  // 3. Quiz feedback (one question at a time)
  await stepTo(p, 6); ok(await p.locator("#complete").isDisabled(), "cannot complete before the knowledge check");
  await stepTo(p, 5);
  ok(await p.locator("#quiz fieldset:visible").count() === 1, "quiz shows one question at a time");
  await p.click('.qnav button[data-qi="2"]'); await p.click("#qsubmit");
  ok((await p.locator("#qmsg").innerText()).includes("Answer all"), "quiz asks for all answers");
  ok(await p.locator('#quiz fieldset[data-q="0"]').isVisible(), "missing answer: jumps back to the first unanswered question");
  await p.check(`input[name=q0][value="${(L[0].a[0] + 1) % 3}"]`); await p.click('.qnav button[data-qi="2"]'); await p.click("#qsubmit");
  ok(await p.locator(".fb.ok, .qq.wrong").count() === 0 && !(await p.evaluate(() => document.querySelector("#kc").textContent)).includes("Best answer"), "partial answers reveal no correct answers");
  const wrong = L[0].a.map((a, i) => i === 0 ? (a + 1) % 3 : a);
  await answerQuiz(p, wrong); await p.click("#qsubmit");
  ok((await p.locator("#qmsg").innerText()).includes("2 of 3"), "score is correct (2 of 3)");
  await p.click('.qnav button[data-qi="0"]');
  const fb = await p.locator('#quiz fieldset[data-q="0"] .fb').innerText();
  ok(fb.includes("Not quite") && fb.includes("Best answer"), "wrong answer gets an explanation and the best answer");
  ok(await p.locator(".fb.ok").count() === 2, "right answers get explanations");
  ok(await p.locator(".qq.checked .opt.is-answer .ans-tag").count() === 3, "correct option is highlighted in every question");
  ok(await p.locator(".qnav button.wrong").count() === 1 && await p.locator(".qnav button.right").count() === 2, "question buttons show right and wrong");
  await p.click("#qreset");
  // keyboard: arrow keys inside each question, Enter on the submit button
  for (let i = 0; i < 3; i++) { await p.click(`.qnav button[data-qi="${i}"]`); await p.check(`input[name=q${i}][value="${L[0].a[i]}"]`); }
  await p.locator("#qsubmit").focus(); await p.keyboard.press("Enter");
  ok((await p.locator("#qmsg").innerText()).includes("3 of 3"), "retry by keyboard scores 3 of 3");

  // 4. Notes, bookmark, task ticks, completion, then reload
  await stepTo(p, 6); await p.fill("#note", "Bakery bio invented a founding year."); await p.waitForTimeout(600);
  await p.click("#bm"); await stepTo(p, 4); await p.check('[data-step="1"]');
  await stepTo(p, 6); await p.click("#complete");
  ok((await p.locator("#donebox").innerText()).includes("Lesson complete"), "lesson completes");
  ok((await p.locator("#lmeta").innerText()).includes("Completed"), "lesson header shows Completed right away");
  await p.reload(); await p.waitForTimeout(150);
  ok(await p.locator('.lstep[data-ls="6"]').isVisible(), "lesson reopens on the step you were on");
  ok((await p.inputValue("#note")).includes("founding year"), "note survives reload");
  ok((await p.getAttribute("#bm", "aria-pressed")) === "true", "bookmark survives reload");
  ok(await p.isChecked('[data-step="1"]'), "task tick survives reload");
  ok((await p.locator("#donebox").innerText()).includes("Lesson complete"), "completion survives reload");
  ok((await p.evaluate(() => document.querySelector("#kc").textContent)).includes("Best so far: 3 of 3"), "quiz best score survives reload");

  // 5. Navigation
  await p.click("#snext"); await p.waitForSelector("text=Write useful prompts"); ok(p.url().endsWith("#/lesson/m1l2"), "Next lesson button on the last step");
  await p.click("#sback"); ok(p.url().endsWith("#/lesson/m1l1"), "Previous lesson from step 1");
  await p.goBack(); ok(p.url().endsWith("#/lesson/m1l2"), "browser Back works");
  for (const [label, hash] of [["Dashboard", "#/dashboard"], ["Course", "#/course"], ["Resources", "#/resources"], ["Final project", "#/project"], ["Notes", "#/notes"], ["Free training", "#/free"], ["Coaching", "#/coaching"], ["Home", "#/"]]) {
    await p.click(`nav.main a:text-is("${label}")`); await p.waitForFunction(h => location.hash === h || (h === "#/" && location.hash === "#/"), hash); await p.waitForTimeout(50); ok(p.url().endsWith(hash) && (await p.getAttribute(`nav.main a:text-is("${label}")`, "aria-current")) === "page", "menu: " + label);
  }
  await p.goto(U + "#/nope"); ok((await p.locator("h1").innerText()) === "Page not found", "unknown page shows Not found");
  await p.goto(U + "#/lesson/zzz"); ok((await p.locator("h1").innerText()) === "Page not found", "unknown lesson shows Not found");

  // 6. Dashboard continue
  await p.goto(U + "#/lesson/m5l1"); await p.waitForSelector("#quiz", { state: "attached" });
  await p.goto(U + "#/dashboard");
  const cont = await p.locator(".continue").innerText();
  ok(cont.includes("Continue learning") && cont.includes("Write useful prompts"), "dashboard Continue learning goes to next lesson in order (even after peeking at Module 5)");
  ok(cont.includes("4%"), "progress ring shows 4% (1 of 24)");
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
  await p.goto(U + "#/resources/growth"); await p.goto(U + "#/resources");
  ok(!(await p.locator('a[href="#/resources/growth"]').innerText()).includes("Started"), "opening a worksheet does not mark it Started");
  await p.goto(U + "#/resources/price"); await p.fill("#p_hours", "-10");
  ok((await p.locator("#pres").innerText()).includes("cannot be negative"), "price calculator rejects negative numbers"); await p.fill("#p_hours", "8");
  await p.goto(U + "#/resources/prompt"); await p.fill("#f_goal", "welcome email");
  ok((await p.locator("#pout").innerText()).includes("Goal: welcome email"), "prompt builder assembles prompt");

  // 8. Final project export is escaped
  await p.goto(U + "#/project"); await p.fill("#pj_title", "Demo <b>x</b>"); await p.fill("#pj_problem", "p"); await p.fill("#pj_solution", "s"); await p.waitForTimeout(400);
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#pjHtml")]);
  const html = fs.readFileSync(await dl.path(), "utf8"); ok(html.includes("Demo &lt;b&gt;x") && !html.includes("<b>x"), "project page download escapes text");

  // 9. Pricing, owner, facts
  // Coaching and application funnel
  await p.goto(U + "#/pricing"); ok((await p.locator(".plan").count()) === 3 && (await p.locator("main").innerText()).includes("$1,500") && (await p.locator("main").innerText()).includes("From $4,800"), "old pricing link shows the 3 coaching tiers ($1,500 to From $4,800)");
  ok((await p.locator(".disc").count()) === 1 && !/\d+ spots left|guaranteed income|act now/i.test(await p.locator("main").innerText()), "coaching page: disclaimer, no fake urgency");
  await p.click('a[href="#/apply/mentor"]'); await p.waitForSelector("#apf");
  ok((await p.inputValue("#ap_tier")) === "mentor", "Apply button preselects the tier");
  await p.click("#apf button[type=submit]"); ok((await p.locator("#aperr").innerText()).includes("Please fill in"), "application requires the key fields");
  await p.fill("#ap_name", "Test Student"); await p.fill("#ap_contact", "test@example.com"); await p.fill("#ap_hours", "6"); await p.fill("#ap_goal", "Land a first brand client");
  await p.click("#apf button[type=submit]"); ok((await p.locator("#aperr").innerText()).includes("18 or older"), "application requires an age answer (no default)");
  await p.check('input[name=adult][value="yes"]');
  await p.click("#apf button[type=submit]"); ok((await p.locator("#aperr").innerText()).includes("no income promise"), "application requires the no-income-promise acknowledgment");
  ok((await p.locator("main").innerText()).includes("Applications are not open yet"), "apply page says up front when no application link is set");
  await p.check("#ap_ok"); await p.click("#apf button[type=submit]");
  ok(await p.locator("#apout").isVisible() && (await p.locator("#aptext").innerText()).includes("Mentorship") && (await p.locator("#aptext").innerText()).includes("Test Student"), "application message is prepared with tier and answers");
  await p.reload(); await p.waitForSelector("#apf"); ok((await p.inputValue("#ap_name")) === "Test Student", "application draft survives reload");
  // Brand-scaling calculators
  await p.goto(U + "#/resources/roas"); for (const [k, v] of [["aov", "60"], ["cost", "22"], ["ship", "8"], ["feep", "2.9"], ["feef", "0.30"]]) await p.fill("#r_" + k, v);
  const rr = await p.locator("#rres").innerText(); ok(rr.includes("$27.96") && rr.includes("2.15"), "break-even ROAS calculator: margin $27.96, break-even 2.15");
  await p.goto(U + "#/resources/retainer"); for (const [k, v] of [["spend", "3000"], ["hrs", "16"], ["flat", "800"], ["pct", "15"], ["rev", "9000"], ["rs", "5"]]) await p.fill("#t_" + k, v);
  const tr = await p.locator("#tres").innerText(); ok(tr.includes("$800") && tr.includes("$50/h") && tr.includes("$450"), "retainer calculator compares the three models");
  await p.goto(U + "#/owner"); ok(!/1,000,000|10,310/.test(await p.locator("main").innerText()), "revenue goal is not shown on the site");
  ok(await p.locator('footer a[href="#/owner"]').count() === 0, "no owner link in the student footer");
  // Long unbroken text must not push the page sideways
  await p.goto(U + "#/lesson/m6l2"); await p.waitForSelector("#note", { state: "attached" }); await stepTo(p, 6); await p.fill("#note", "https://example.com/" + "a".repeat(400)); await p.waitForTimeout(600);
  for (const rt of ["notes", "dashboard"]) { await p.goto(U + "#/" + rt); ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "long note does not cause sideways scroll on " + rt); }
  await p.goto(U + "#/lesson/m5l2"); ok((await p.locator(".facts").innerText()).includes("10 business days"), "checked facts box with source on lesson");

  // 10. All lessons complete
  for (const l of L) { await p.goto(U + "#/lesson/" + l.id); await p.waitForSelector("#quiz", { state: "attached" }); if (!(await p.locator("#complete").count())) continue; await finishLesson(p, l.a); }
  await p.goto(U + "#/dashboard"); ok((await p.locator(".continue").innerText()).includes("All 24 lessons complete"), "all-complete state points to final project");

  // 11. Backup and restore
  await p.goto(U + "#/notes");
  const [bk] = await Promise.all([p.waitForEvent("download"), p.click("#exp")]); const bkPath = await bk.path();
  await p.evaluate(k => localStorage.removeItem(k), KEY); await p.reload();
  await p.goto(U + "#/notes"); await p.setInputFiles("#imp", bkPath); await p.waitForTimeout(200);
  await p.goto(U + "#/dashboard"); ok((await p.locator(".continue").innerText()).includes("All 24 lessons complete"), "backup file restores progress");
  ok(errs.length === 0, "no JavaScript errors in main journey " + errs.join(" | "));
  const state = await p.evaluate(k => localStorage.getItem(k), KEY);

  // 11b. Brand path: questionnaire -> brand scaling -> free lesson s1l1
  const cb = await b.newContext(); const pb = await cb.newPage(); await pb.goto(U + "#/start");
  for (const v of ["brands", "ok", "high", "zero", "like"]) { await pb.check(`input[value="${v}"]`); await pb.click("#qform button[type=submit]"); await pb.waitForTimeout(50); }
  ok((await pb.locator("h1").innerText()).startsWith("Brand scaling"), "questionnaire can recommend brand scaling");
  await pb.click("text=Start lesson 1"); await pb.waitForSelector("#quiz", { state: "attached" }); ok(pb.url().endsWith("#/lesson/s1l1") && (await pb.locator(".lhead2").innerText()).includes("Free training"), "brand path starts at free lesson s1l1");
  await pb.goto(U + "#/free"); ok((await pb.locator("main").innerText()).includes("0 of 4 done"), "free training page lists 4 free lessons");
  await pb.goto(U + "#/dashboard"); ok((await pb.locator(".continue").innerText()).includes("Brand Scaling"), "dashboard continues in the Brand Scaling track"); await cb.close();

  // 12. Damaged and blocked storage
  const c2 = await b.newContext(); await c2.addInitScript(k => localStorage.setItem(k, "{broken"), KEY);
  const p2 = await c2.newPage(); const e2 = []; p2.on("pageerror", e => e2.push(e.message)); await p2.goto(U + "#/dashboard");
  ok(e2.length === 0 && (await p2.locator(".continue").count()) === 1, "damaged saved data does not break the app");
  const c3 = await b.newContext(); await c3.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("blocked"); }; Storage.prototype.getItem = () => { throw new Error("blocked"); }; });
  const p3 = await c3.newPage(); await p3.goto(U); ok(await p3.locator("#storeWarn").isVisible(), "blocked storage shows a warning and the app still runs");
  await c2.close(); await c3.close();

  // 13. Reduced motion: no confetti
  const rm = await b.newContext({ reducedMotion: "reduce" }); const r = await rm.newPage(); await r.goto(U + "#/lesson/m1l1");
  await r.waitForSelector("#quiz", { state: "attached" }); await finishLesson(r, L[0].a);
  ok(await r.locator(".confetti").count() === 0, "reduced motion: no confetti"); await rm.close();
  await p.goto(U); await p.check("#reduceToggle");
  ok(await p.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior) === "auto", "Reduce motion switch turns off smooth scrolling"); await p.uncheck("#reduceToggle");

  // 14. Devices: no sideways scroll, no errors, tap targets
  const routes = ["", "dashboard", "course", "start", "start/result", "free", "coaching", "apply", "lesson/m1l1", "lesson/m5l2", "lesson/s3l1", "lesson/s5l2", "resources/roas", "resources/retainer", "resources", "resources/money", "resources/price", "resources/score", "project", "notes", "pricing", "facts", "owner"];
  const devs = [["iPhone SE", devices["iPhone SE"]], ["iPhone 13", devices["iPhone 13"]], ["Pixel 7", devices["Pixel 7"]], ["iPad Mini", devices["iPad Mini"]], ["iPad Pro 11 landscape", devices["iPad Pro 11 landscape"]], ["Laptop 1366x768", { viewport: { width: 1366, height: 768 } }], ["Desktop 1920x1080", { viewport: { width: 1920, height: 1080 } }]];
  const axe = process.env.AXE_PATH && fs.existsSync(process.env.AXE_PATH) ? fs.readFileSync(process.env.AXE_PATH, "utf8") : null;
  for (const [name, d] of devs) {
    const c = await b.newContext(d); await c.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await c.addInitScript(([k, s]) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem(k, s); sessionStorage.setItem("seeded", "1"); } }, [KEY, state]);
    const q = await c.newPage(); const e = []; q.on("pageerror", x => e.push(x.message)); const bad = [], small = [];
    for (const rt of routes) {
      await q.goto(U + "#/" + rt); await q.waitForTimeout(40);
      if (rt === "resources/money") { await q.click("#addM"); }
      const vw = (d.viewport || {}).width || 1280;
      const sw = await q.evaluate(w => Math.max(document.documentElement.scrollWidth, innerWidth) - w, vw); if (sw > 1) bad.push(rt + ":" + sw);
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
