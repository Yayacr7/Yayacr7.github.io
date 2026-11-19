// End-to-end test of GetPaid in Chromium with a fake microphone and a moved clock.
// Run: node getpaid/tests/browser-test.js   (needs Playwright + Chromium)
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium, devices } = require("playwright");
const ROOT = path.join(__dirname, "..", "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL " + m); } };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
});
// Fake speech recognition: speaks window.__say when started, or fails with window.__micError.
const FAKE_SR = `window.webkitSpeechRecognition = class { start(){ window.__started=(window.__started||0)+1; setTimeout(()=>{ if(window.__micError){ this.onerror&&this.onerror({error:window.__micError}); this.onend&&this.onend(); return; } const t=window.__say||''; const r=[[{transcript:t}]]; r[0].isFinal=true; this.onresult&&this.onresult({results:r}); },50); } stop(){ setTimeout(()=>this.onend&&this.onend(),10); } }; window.SpeechRecognition = window.webkitSpeechRecognition;`;
const START = new Date("2026-11-19T10:00:00");
async function newPage(b, opts, fakeSR = true) {
  const ctx = await b.newContext(opts); await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on("pageerror", e => p.errs.push(e.message));
  await p.clock.setFixedTime(START);
  if (fakeSR) await p.addInitScript(FAKE_SR);
  return p;
}
const vis = (p, sel) => p.waitForSelector(sel, { timeout: 3000 }).then(() => true, () => false);
const db = p => p.evaluate(() => JSON.parse(localStorage.getItem("getpaid.v1")));
const noSideScroll = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

(async () => {
  await new Promise(r => server.listen(0, r));
  const U = "http://localhost:" + server.address().port + "/getpaid/?nosw";
  const b = await chromium.launch();
  const p = await newPage(b, { ...devices["iPhone 13"] });

  // --- setup ---
  await p.goto(U);
  ok(await vis(p, "text=Finished the job?"), "welcome shows first");
  await p.click("text=Set up (about 1 minute)");
  await p.fill("[data-set=bizName]", "Shine On Mobile Detailing"); await p.fill("[data-set=yourName]", "Yaya Test");
  await p.fill("[data-set=phone]", "(612) 555-0100"); await p.fill("[data-set=payHow]", "Venmo @shineon or cash");
  await p.click("text=Next: your prices");
  ok(await vis(p, "text=These are example prices, not market rates."), "example prices labeled");
  await p.fill('[data-svc="0"][data-k="price"]', "190");
  await p.click("text=These are my prices");
  let d = await db(p);
  ok(d.settings.setupDone && d.settings.pricesConfirmed && d.settings.services[0].price === 19000, "setup saved, own price 190");
  ok(!(await p.isVisible("text=Your prices are still the examples")), "no example banner after confirming");

  // --- voice note from the home mic ---
  await p.evaluate(() => { window.__say = "Just finished a full detail on Mike Johnson's 2019 Honda Pilot, added pet hair removal. His number is 612-555-0142. He paid 50 deposit, due Friday."; });
  await p.click(".talk");
  await p.waitForFunction(() => document.querySelector("#rectext") && document.querySelector("#rectext").value.length > 20);
  ok(await p.evaluate(() => window.__started === 1), "home mic tap starts listening right away");
  ok(await vis(p, ".micbig.on"), "mic shows listening");
  await p.click("#micbtn"); await p.waitForSelector(".micbig:not(.on)");
  ok(true, "tap again stops");
  await p.click("text=Make my draft");
  ok(await p.inputValue('[data-d="customer.name"]') === "Mike Johnson", "draft name");
  ok(await p.inputValue('[data-d="customer.phone"]') === "(612) 555-0142", "draft phone");
  ok(await p.inputValue('[data-d="vehicle"]') === "2019 Honda Pilot", "draft vehicle");
  ok(await p.inputValue('[data-d="dueDate"]') === "2026-11-20", "draft due Friday");
  ok(await p.textContent("#savetot") === "$210.00", "SUV full detail 220 + pet 40 - 50 = 210: " + await p.textContent("#savetot"));
  ok(await vis(p, "text=What I heard"), "shows what it heard");
  // size toggle uses the user's car price (190)
  await p.click('[data-act=setsize][data-v="0"]');
  ok(await p.textContent("#savetot") === "$180.00", "car price 190 + 40 - 50 = 180");
  await p.click('[data-act=setsize][data-v="1"]');
  await p.fill('[data-line="1"][data-k="price"]', "45");
  ok(await p.textContent("#savetot") === "$215.00", "edit price updates total live");
  await p.selectOption("#addsel", "custom"); await p.fill('[data-line="2"][data-k="desc"]', "Bug removal"); await p.fill('[data-line="2"][data-k="price"]', "20");
  ok(await p.textContent("#savetot") === "$235.00", "custom line adds");
  await p.click('[data-act=delline][data-i="2"]');
  ok(await p.textContent("#savetot") === "$215.00", "remove line");
  ok(await noSideScroll(p), "draft: no sideways scroll");
  await p.click("[data-act=savedraft]");
  await p.waitForSelector(".paper");
  ok(/INV-0001/.test(await p.textContent(".top h1")), "saved as INV-0001");
  ok(await p.textContent(".pill") === "Draft", "status draft");
  ok(/Venmo @shineon/.test(await p.textContent(".paper")), "paper shows how to pay");

  // --- send (approval first) ---
  await p.click("[data-act=send]");
  const msg = await p.inputValue("#msgtext");
  ok(/^Hi Mike,/.test(msg) && /\$215\.00 left to pay/.test(msg) && /Fri, Nov 20/.test(msg) && /Venmo @shineon/.test(msg), "send message: " + msg);
  ok(await p.isDisabled('[data-act=via][data-v="email"]'), "email disabled without email");
  await p.click('[data-act=tone][data-v="short"]');
  ok((await p.inputValue("#msgtext")).length < msg.length, "short tone is shorter");
  await p.fill("#msgtext", "Hi Mike, custom words");
  let href = null; await p.exposeFunction("__nav", h => { href = h; }).catch(() => {});
  await p.evaluate(() => { window.__copy = null; navigator.clipboard.writeText = t => { window.__copy = t; return Promise.resolve(); }; });
  await p.click('[data-act=via][data-v="copy"]');
  ok(await p.evaluate(() => window.__copy) === "Hi Mike, custom words", "copies the edited text");
  ok(await vis(p, "text=Did you send it?"), "asks if it was sent");
  ok((await db(p)).docs[0].sentAt === undefined || !(await db(p)).docs[0].sentAt, "not marked sent before you confirm");
  await p.click("text=Yes, I sent it");
  ok(await p.textContent(".pill") === "Part paid", "deposit + sent = part paid");
  // sms link format
  await p.click("[data-act=send]");
  const sms = await p.evaluate(() => GP.smsLink("(612) 555-0142", document.querySelector("#msgtext").value));
  ok(/^sms:6125550142\?&body=Hi%20Mike/.test(sms), "sms link");
  await p.click("[data-act=closesheet] >> nth=0").catch(() => p.keyboard.press("Escape"));
  await p.keyboard.press("Escape");

  // --- reload keeps everything ---
  await p.reload(); await p.goto(U + "#home");
  ok(/\$215\.00/.test(await p.textContent(".sum .big")), "home owed after reload");

  // --- time passes: overdue + follow-ups ---
  await p.clock.setFixedTime(new Date("2026-11-20T10:00:00")); await p.goto(U + "#follow");
  ok(await vis(p, "text=Friendly reminder (due day)"), "due-day reminder on due day");
  await p.clock.setFixedTime(new Date("2026-11-24T10:00:00")); await p.goto(U + "#home");
  ok(/\$215\.00/.test(await p.textContent(".sum .stats")), "overdue amount on home");
  ok(await p.textContent(".nav .badge") === "1", "follow-up badge");
  await p.goto(U + "#follow");
  await p.click("[data-act=follow] >> nth=0");
  ok(await vis(p, '[data-act=tone][data-v="short"].on'), "remembers the tone you picked");
  await p.click('[data-act=tone][data-v="friendly"]');
  ok(/checking in on invoice INV-0001/.test(await p.inputValue("#msgtext")) && /already sent it, thank you/.test(await p.inputValue("#msgtext")), "4 days late: offers the 3-days-late text (says ignore if paid), not 'due today'");
  await p.evaluate(() => { navigator.clipboard.writeText = () => Promise.resolve(); });
  await p.click('[data-act=via][data-v="copy"]'); await p.click("text=Yes, I sent it");
  d = await db(p);
  ok(d.docs[0].followups.length === 1 && d.docs[0].followups[0].step === "late3", "logged late3");
  ok(await vis(p, "text=Nothing due"), "nothing due after handling");
  await p.clock.setFixedTime(new Date("2026-11-27T10:00:00")); await p.goto(U + "#home"); await p.goto(U + "#follow");
  await p.click("[data-act=follow] >> nth=0");
  ok(/make it right/.test(await p.inputValue("#msgtext")), "1-week text offers to fix problems");
  await p.click('[data-act=via][data-v="copy"]'); await p.click("text=Skip this reminder");
  d = await db(p);
  ok(d.docs[0].followups.length === 2 && d.docs[0].followups[1].skipped, "skip logged");
  ok(await vis(p, "text=Last polite note (2 weeks late)"), "next one coming up");

  // --- payment ---
  await p.goto(U + "#jobs"); await p.click(".item >> nth=0");
  ok(await p.textContent(".pill") === "Overdue", "overdue status");
  await p.click("[data-act=pay] >> nth=0");
  await p.fill("#payamt", "100"); await p.click('[data-act=paymeth][data-v="Zelle"]'); await p.click("[data-act=savepay]");
  ok(/\$115\.00/.test(await p.textContent(".hero .amt")), "partial payment leaves 115");
  await p.click("[data-act=pay] >> nth=0"); await p.click("[data-act=savepay]");
  ok(await p.textContent(".pill") === "Paid", "paid in full");
  ok(await vis(p, ".paper .stamp"), "PAID stamp");
  await p.click("text=Say thanks");
  ok(/^Thanks Mike!/.test(await p.inputValue("#msgtext")), "thank-you text");
  await p.keyboard.press("Escape");
  // undo a payment (two taps)
  await p.click("[data-act=delpay] >> nth=1"); await p.click("[data-act=delpay] >> nth=1");
  ok(await p.textContent(".pill") === "Overdue", "undo payment returns to overdue");
  await p.click("[data-act=pay] >> nth=0"); await p.click("[data-act=savepay]");
  await p.goto(U + "#home");
  ok(/\$265\.00/.test(await p.textContent(".sum .stats")), "paid this month = 50 deposit + 215 logged");
  ok(/\$0\.00/.test(await p.textContent(".sum .big")), "owed back to 0");

  // --- quote flow by typing (example chip) ---
  await p.goto(U + "#new"); await p.click('[data-act=example][data-i="2"]'); await p.click("text=Make my draft");
  ok(await vis(p, '[data-act=settype][data-v="quote"].on'), "quote detected");
  ok(await p.inputValue('[data-d="customer.email"]') === "sarah.lee@gmail.com", "spoken email");
  await p.click("[data-act=savedraft]");
  await p.waitForSelector(".paper");   ok(/Q-0001/.test(await p.textContent(".top h1")), "Q-0001");
  await p.click("[data-act=send]");
  ok(/good until/.test(await p.inputValue("#msgtext")), "quote message");
  await p.check("#fullchk"); ok(/QUOTE Q-0001/.test(await p.inputValue("#msgtext")), "itemized quote added");
  await p.evaluate(() => { navigator.clipboard.writeText = () => Promise.resolve(); });
  await p.click('[data-act=via][data-v="copy"]'); await p.click("text=Yes, I sent it");
  ok(await p.textContent(".pill") === "Waiting", "quote waiting");
  await p.click("text=They said yes"); await p.click("[data-act=toinvoice]"); await p.waitForFunction(() => /INV-0002/.test(document.querySelector(".top h1").textContent));
  ok(/INV-0002/.test(await p.textContent(".top h1")) && await p.textContent(".pill") === "Draft", "quote became draft invoice INV-0002");

  // --- jobs list ---
  await p.goto(U + "#jobs");
  ok(await p.locator(".item").count() === 3, "3 jobs");
  await p.click('[data-act=filter][data-v="quotes"]'); ok(await p.locator(".item").count() === 1, "quotes filter");
  await p.click('[data-act=filter][data-v="all"]'); await p.fill("#jobsearch", "sarah"); ok(await p.locator(".item").count() === 2, "search");
  await p.fill("#jobsearch", "");

  // --- empty / errors ---
  await p.goto(U + "#new"); await p.click("text=Make my draft");
  ok(/few words/.test(await p.textContent("#recerr")), "empty note is refused");
  await p.evaluate(() => { window.__micError = "not-allowed"; }); await p.click("#micbtn");
  await p.waitForFunction(() => /blocked/.test(document.querySelector("#recerr").textContent));
  ok(true, "blocked mic explains itself");
  await p.evaluate(() => { window.__micError = null; });
  await p.fill("#rectext", "full detail for nobody special"); await p.click("text=Make my draft");
  await p.fill('[data-d="customer.name"]', ""); await p.click("[data-act=savedraft]");
  ok(/customer's name/.test(await p.textContent("#nameerr")), "name required");

  // --- edit + delete ---
  await p.goto(U + "#jobs"); await p.click("text=Sarah Lee >> nth=0");
  await p.click("[data-act=edit]"); await p.fill('[data-d="vehicle"]', "2021 Tesla Model Y"); await p.click("[data-act=savedraft]"); await p.waitForSelector("text=Saved");
  ok(/Model Y/.test(await p.textContent(".paper")), "edit saved");
  await p.click("[data-act=del]"); ok((await db(p)).docs.length === 3, "first tap does not delete");
  await p.click("[data-act=del]"); ok((await db(p)).docs.length === 2, "second tap deletes");

  // --- backup / restore ---
  await p.goto(U + "#settings");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("[data-act=backup]")]);
  const saved = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  ok(saved.docs.length === 2, "backup has the jobs");
  const bad = path.join(require("os").tmpdir(), "gp-bad.json"); fs.writeFileSync(bad, "{\"nope\":1}");
  await p.setInputFiles("#restore", bad); await p.waitForTimeout(200);
  ok((await db(p)).docs.length === 2, "bad backup rejected");
  const good = path.join(require("os").tmpdir(), "gp-good.json"); saved.docs.pop(); fs.writeFileSync(good, JSON.stringify(saved));
  await p.setInputFiles("#restore", good); await p.waitForTimeout(200);
  ok((await db(p)).docs.length === 1, "restore works");
  ok(p.errs.length === 0, "no JS errors in journey: " + p.errs.join(" | "));
  const snapshot = await db(p);
  // add an unsent invoice (a long name and many lines) for the screen-size checks
  snapshot.docs.unshift({ ...JSON.parse(JSON.stringify(saved.docs[0])), id: "drafttest", type: "invoice", number: "INV-0099", sentAt: "", approvedAt: "", invoiceId: "", dueDate: "2026-12-01",
    customer: { name: "Alexandria Montgomery-Washington", phone: "(612) 555-0177", email: "alexandria.montgomery@example.com" }, vehicle: "2022 Chevrolet Suburban High Country",
    items: [["Full detail (inside + out) (SUV / truck)", 2, 22000], ["Ceramic coating (SUV / truck)", 1, 65000], ["Seat shampoo / stain removal", 1, 5000], ["Headlight restoration", 1, 6000]].map(([desc, qty, price]) => ({ desc, qty, price })), payments: [], followups: [] });
  await p.context().close();

  // --- browser without speech recognition ---
  const n = await newPage(b, { viewport: { width: 390, height: 844 } }, false);
  await n.addInitScript(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
  await n.addInitScript(s => localStorage.setItem("getpaid.v1", s), JSON.stringify(snapshot));
  await n.goto(U + "#new");
  ok(await vis(n, "text=Type, or use your keyboard's mic"), "no voice support: says to type");
  await n.context().close();

  // --- storage blocked ---
  const s = await newPage(b, { viewport: { width: 390, height: 844 } });
  await s.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); });
  await s.goto(U); await s.click("text=Set up (about 1 minute)"); await s.click("text=Next: your prices"); await s.click("text=Keep the examples for now");
  ok(await vis(s, "text=This browser is blocking saving"), "blocked storage warning");
  ok(await vis(s, "text=Your prices are still the examples"), "example-prices reminder when skipped");
  ok(s.errs.length === 0, "no errors with blocked storage");
  await s.context().close();

  // --- every screen on 6 devices, light and dark ---
  const DEV = [["iPhone SE", devices["iPhone SE"]], ["iPhone 13", devices["iPhone 13"]], ["Pixel 7", devices["Pixel 7"]], ["iPad Mini", devices["iPad Mini"]], ["Laptop", { viewport: { width: 1280, height: 720 } }], ["Desktop", { viewport: { width: 1440, height: 900 } }]];
  const id = "drafttest";
  for (const [name, dev] of DEV) for (const scheme of ["light", "dark"]) {
    const q = await newPage(b, { ...dev, colorScheme: scheme });
    await q.addInitScript(s => localStorage.setItem("getpaid.v1", s), JSON.stringify(snapshot));
    for (const h of ["home", "new", "jobs", "follow", "settings", "settings/prices", "doc/" + id, "edit/" + id, "welcome", "welcome/biz", "welcome/prices"]) {
      await q.goto(U + "#" + h); await q.waitForTimeout(30);
      ok(await noSideScroll(q), name + " " + scheme + " #" + h + " no sideways scroll");
    }
    await q.goto(U + "#doc/" + id); await q.waitForSelector(".paper");
    await q.click("[data-act=send]"); await q.waitForTimeout(450);
    ok(await q.evaluate(() => { const r = document.querySelector(".sheet").getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top >= 0; }), name + " send sheet fits");
    const small = await q.evaluate(() => [...document.querySelectorAll(".sheet button:not([disabled])")].filter(b => b.getBoundingClientRect().height < 36).length);
    ok(small === 0, name + " tap targets >= 36px");
    ok(q.errs.length === 0, name + " " + scheme + " no JS errors: " + q.errs.join("|"));
    await q.context().close();
  }
  await b.close(); server.close();
  console.log(pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
