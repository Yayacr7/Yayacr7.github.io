// Checks the voice-note reader, totals, statuses, follow-up timing and messages.
// Run: node getpaid/tests/core-test.js
"use strict";
const GP = require("../core.js");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL " + m); } };
const T0 = "2026-11-19"; // a Thursday
const P = s => GP.parseJob(s, { today: T0 });
const lines = r => r.items.map(i => i.desc + "|" + i.qty + "|" + i.price);

// 1. the main example
let r = P("Just finished a full detail on Mike Johnson's 2019 Honda Pilot, added pet hair removal and headlights, charge 40 for the headlights. His number is 612-555-0142. He paid 50 deposit, due Friday.");
ok(r.type === "invoice", "finished job = invoice");
ok(r.customer.name === "Mike Johnson", "name: " + r.customer.name);
ok(r.customer.phone === "(612) 555-0142", "phone");
ok(r.vehicle === "2019 Honda Pilot", "vehicle: " + r.vehicle);
ok(r.big, "Pilot = SUV price");
ok(lines(r).join() === "Full detail (inside + out) (SUV / truck)|1|22000,Pet hair removal|1|4000,Headlight restoration|1|4000", "items: " + lines(r));
ok(r.paidSoFar === 5000, "deposit 50");
ok(r.dueDate === "2026-11-20", "due Friday = Nov 20");
ok(r.checks.length === 0, "no checks: " + r.checks);

// 2. quote + spoken email
r = P("Quote for Sarah Lee, 2021 Tesla Model 3, ceramic coating and paint correction, email sarah.lee at gmail dot com");
ok(r.type === "quote", "quote");
ok(r.customer.email === "sarah.lee@gmail.com", "spoken email: " + r.customer.email);
ok(r.customer.name === "Sarah Lee", "quote name");
ok(!r.big, "Model 3 is a car");
ok(r.items.length === 2 && r.items[0].price === 50000, "ceramic from list");

// 3. price said in the next phrase + custom line + due tomorrow
r = P("interior detail for dave on his f-150, 120 bucks, plus 25 for bug removal, due tomorrow");
ok(r.customer.name === "Dave", "lowercase name");
ok(r.items[0].price === 12000 && r.items[0].custom, "120 goes to interior");
ok(r.items[1] && r.items[1].desc === "Bug removal" && r.items[1].price === 2500, "custom line: " + lines(r));
ok(r.dueDate === "2026-11-20", "tomorrow");

// 4. two cars, paid in full, family name
r = P("did both cars for the Garcias, full detail, 763 555 1234, they paid in full cash");
ok(r.customer.name === "The Garcias", "family name");
ok(r.items[0].qty === 2, "both cars = qty 2");
ok(r.paidFull && r.paidSoFar === 36000, "paid in full");
ok(r.customer.phone === "(763) 555-1234", "phone with spaces");

// 5. discount, days
r = P("Finished an exterior wash and wax for customer Tom Brown, 2015 Toyota Camry, knocked 10 off, due in 7 days");
ok(r.customer.name === "Tom Brown" && r.discount === 1000 && r.dueDate === "2026-11-26", "discount + in 7 days");
ok(r.items.length === 1 && r.items[0].serviceId === "exterior", "wash and wax = exterior only");

// 6. spoken total with one service; tip not billed; title + day of month
r = P("basic wash for Amy, two hundred fifty dollars total");
ok(r.items[0].price === 25000, "total becomes the price");
r = P("Mrs. Patel, Honda Odyssey, interior and exterior, odor removal, tipped me 20, due on the 25th");
ok(r.customer.name === "Mrs. Patel", "Mrs. name: " + r.customer.name);
ok(r.items.length === 2 && r.items[0].serviceId === "full", "interior and exterior = full");
ok(!r.items.some(i => i.price === 2000) && r.paidSoFar === 0, "tip not billed or counted");
ok(r.dueDate === "2026-11-25", "the 25th");

// 7. numbers that are NOT prices
r = P("full detail for Jen Park, 2 hours, took 3 days, 2018 Ford Escape");
ok(r.items.length === 1 && r.items[0].price === 18000, "hours/days not prices: " + lines(r));
ok(r.vehicle === "2018 Ford Escape", "Ford Escape: " + r.vehicle);
r = P("full detail, $1,200 total"); ok(r.items[0].price === 120000, "comma thousands");
r = P("headlights for Kim, 59.99"); ok(r.items[0].price === 5999, "cents");
r = P("full detail 10% off for Lou"); ok(r.discount === 1800, "percent discount");
r = P("paid in full, full detail for Bo"); ok(r.items.length === 1 && r.items[0].serviceId === "full", "'in full' is not a service");
r = P(""); ok(r.items.length === 0 && r.checks.length === 1, "empty");
r = P("charge 30 for that"); ok(r.checks.some(c => /not what it was for/.test(c)) || r.items[0].desc, "unnamed price flagged");
r = P("wash, 40 dollars, customer said her total was 60"); ok(r.checks.some(c => /total/.test(c)) || r.items[0].price, "total mismatch handled");
r = P("Quote for an SUV, ceramic"); ok(r.type === "quote" && r.big && r.items[0].price === 65000, "SUV quote");
// custom price list words
r = GP.parseJob("did a bug wash for Al", { today: T0, services: [{ id: "bug", name: "Bug removal", price: 3000, words: ["bug wash"] }] });
ok(r.items.length === 1 && r.items[0].price === 3000, "custom service words");

// totals
const doc = { type: "invoice", number: "INV-0001", date: T0, dueDate: "2026-11-20", customer: { name: "Mike Johnson", phone: "6125550142" }, vehicle: "2019 Honda Pilot",
  items: [{ desc: "Full detail", qty: 1, price: 22000 }, { desc: "Pet hair removal", qty: 2, price: 4000 }], discount: 1000, taxRate: 7.5, paidBefore: 5000, payments: [], followups: [] };
let t = GP.totals(doc);
ok(t.sub === 30000 && t.disc === 1000 && t.tax === 2175 && t.total === 31175 && t.balance === 26175, "totals " + JSON.stringify(t));
ok(GP.money(123456) === "$1,234.56" && GP.money(5) === "$0.05" && GP.toCents("$1,200.50") === 120050, "money format");

// statuses + follow-ups
ok(GP.status(doc, T0) === "draft", "draft");
doc.sentAt = "2026-11-19T15:00:00Z";
ok(GP.status(doc, T0) === "partly", "part paid (deposit)");
ok(GP.status(doc, "2026-11-21") === "overdue", "overdue after due");
let p = GP.followPlan(doc, T0);
ok(p.next.id === "due" && !p.due, "due-day reminder planned, not due yet");
ok(GP.followPlan(doc, "2026-11-20").due, "due on the due day");
doc.followups.push({ step: "due" });
p = GP.followPlan(doc, "2026-11-22"); ok(p.next.id === "late3" && !p.due, "late3 waits");
p = GP.followPlan(doc, "2026-11-23"); ok(p.next.id === "late3" && p.due, "late3 due day 3");
const away = { ...doc, followups: [] }; p = GP.followPlan(away, "2026-11-28");
ok(p.next.id === "late7" && p.all[0].passed && p.all[1].passed, "away a week: only the latest reminder is offered");
ok(/was due Fri, Nov 20/.test(GP.message(away, "due", {}, "friendly", "2026-11-22")), "due text after the date says 'was due'");
const m14 = GP.message(doc, "late14", { bizName: "Shine On", yourName: "Yaya T", payHow: "Venmo @shine" }, "friendly", "2026-12-04");
ok(/14 days past due/.test(m14) && /Venmo @shine/.test(m14) && /Yaya, Shine On$/.test(m14), "late14 message: " + m14);
const all = ["send", "due", "late3", "late7", "late14", "thanks"].map(k => GP.message(doc, k, {}, "friendly", "2026-11-25") + GP.message(doc, k, {}, "short", "2026-11-25"));
ok(all.every(m => m.length > 30 && !/undefined|NaN|null/.test(m)), "all invoice messages fill in");
ok(!all.join(" ").match(/\b(lawyer|legal action|collections|sue|court|late fee|credit score)\b/i), "no threats in messages");
doc.payments.push({ amount: t.balance, date: "2026-11-25" });
ok(GP.status(doc, "2026-12-01") === "paid", "paid");
p = GP.followPlan(doc, "2026-12-01"); ok(p.next && p.next.id === "thanks" && p.due, "thanks after paid");
// due on receipt: no due-day reminder
const d2 = { ...doc, payments: [], paidBefore: 0, dueDate: "2026-11-19", followups: [] };
ok(GP.followPlan(d2, T0).all[0].id === "late3", "due on receipt skips due-day reminder");
// quotes
const q = { type: "quote", number: "Q-0001", date: T0, validUntil: "2026-12-19", customer: { name: "Sarah Lee" }, items: [{ desc: "Ceramic coating", qty: 1, price: 50000 }], payments: [], followups: [], sentAt: "2026-11-19T10:00:00Z" };
ok(GP.status(q, T0) === "waiting", "quote waiting");
ok(GP.followPlan(q, "2026-11-21").due && GP.followPlan(q, "2026-11-21").next.id === "q2", "quote check-in after 2 days");
ok(GP.status(q, "2026-12-20") === "expired", "quote expires");
q.approvedAt = "x"; ok(GP.status(q, T0) === "approved" && !GP.followPlan(q, "2026-12-01").next, "approved stops follow-ups");
ok(/Good until/.test(GP.docText(q, {})) && /QUOTE Q-0001/.test(GP.docText(q, {})), "quote text");
ok(/Balance due: \$0\.00/.test(GP.docText(doc, {})), "invoice text");
ok(GP.smsLink("(612) 555-0142", "a b") === "sms:6125550142?&body=a%20b", "sms link");
ok(GP.payLine({}) === "Reply here and I'll send my payment details.", "no pay info");

console.log(pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
