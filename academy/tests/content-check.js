// Checks the course content for structure, quiz correctness and honesty rules.
// Run: node academy/tests/content-check.js   (no installs needed)
"use strict";
const path = require("path");
global.window = {};
require(path.join(__dirname, "..", "config.js"));
require(path.join(__dirname, "..", "content.js"));
require(path.join(__dirname, "..", "content-scale.js"));
const A = window.ACADEMY, C = window.ACADEMY_CONFIG;
let fails = 0, passes = 0;
function check(cond, msg) { if (cond) passes++; else { fails++; console.log("FAIL " + msg); } }
const strip = s => String(s).replace(/<[^>]+>/g, " ");

// Structure
check(A.MODULES.length === 12, "12 modules (6 per track)");
["scale", "found"].forEach(t => check(A.MODULES.filter(m => m.track === t).length === 6, t + " track has 6 modules"));
check(A.TRACKS && A.TRACKS.scale && A.TRACKS.found, "two tracks defined");
const ids = new Set();
A.LESSONS.forEach(l => { check(!ids.has(l.id), "unique lesson id " + l.id); ids.add(l.id); });
A.MODULES.forEach(m => check(A.LESSONS.filter(l => l.module === m.id).length >= 2, "module " + m.n + " has 2+ lessons"));
check(Object.keys(A.PATHS).length === 4 && A.PATHS.brand, "4 paths including brand scaling");
Object.values(A.PATHS).forEach(p => ["makes", "work", "expenses", "limits", "first"].forEach(k => check(p[k] && p[k].length > 40, p.id + " has " + k)));

A.LESSONS.forEach(l => {
  const t = l.id + ": ";
  check(A.MODULES.some(m => m.id === l.module), t + "valid module");
  check(l.goal && l.goal.length > 30, t + "learning goal");
  check(l.terms.length >= 3 && l.terms.every(x => x[0] && x[1]), t + "3+ explained terms");
  check(strip(l.explain.join(" ")).split(/\s+/).length >= 150, t + "explanation of 150+ words");
  check(/^Hypothetical/.test(l.example.title) && l.example.body.length > 200, t + "worked example labeled Hypothetical");
  check(l.task.steps.length >= 3, t + "practical task with 3+ steps");
  check(l.mistake && l.mistake.length > 20, t + "common mistake");
  check(l.quiz.length >= 3, t + "3+ quiz questions");
  l.quiz.forEach((q, i) => {
    const s = t + "Q" + (i + 1) + " ";
    check(q.options.length >= 3, s + "has 3+ options");
    check(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, s + "answer index in range");
    check(q.explain.length === q.options.length, s + "one explanation per option");
    q.explain.forEach((e, j) => check(e.length >= 28, s + "option " + j + " explanation is long enough to teach: " + e));
    check(/^Right\./.test(q.explain[q.answer]), s + "correct option explanation starts with Right.");
    q.explain.forEach((e, j) => { if (j !== q.answer) check(!/^Right\b/.test(e), s + "wrong option " + j + " not marked Right"); });
    check(new Set(q.options).size === q.options.length, s + "options are distinct");
  });
  (l.facts || []).forEach(f => check(/^https:\/\//.test(f.url) && f.src && f.text, t + "fact has https source"));
});

// Answer positions should not all be the same letter (guessable)
// Displayed position = where the correct option lands after the stable shuffle.
const pos = A.LESSONS.flatMap(l => l.quiz.map((q, i) => A.optionOrder(l.id + ":" + i, q.options.length).indexOf(q.answer)));
const counts = [0, 1, 2].map(k => pos.filter(p => p === k).length);
check(counts.every(c => c >= pos.length / 6), "correct answers spread across displayed positions " + JSON.stringify(counts));
const longest = A.LESSONS.flatMap(l => l.quiz).filter(q => { const L = q.options.map(o => o.length); return L[q.answer] === Math.max(...L); }).length;
const totalQ = A.LESSONS.flatMap(l => l.quiz).length;
check(longest <= totalQ * 0.4, "correct answer is not usually the longest option (" + longest + " of " + totalQ + ")");

// Scope and honesty rules
const all = JSON.stringify(A);
// Nov 8, 2026: brand scaling is now the main program (scope change confirmed by Yaya).
const scaleText = JSON.stringify(A.LESSONS.filter(l => /^s/.test(l.id)));
["agency", "retainer", "ad spend", "Meta Ads Manager", "TikTok", "Performance Max", "cold", "AI"].forEach(k => check(scaleText.includes(k), "brand track covers: " + k));
check(A.LESSONS.filter(l => l.free).length >= 3, "free training has 3+ lessons");
check(A.LESSONS.filter(l => l.free).every(l => ["s1", "m1"].includes(l.module)), "free training = Brand Scaling module 1 + Understand AI");
check(!/get rich|passive income|financial freedom|\b10x\b(?! your income)|guaranteed (income|results)/i.test(all.replace(/“10x your income”/g, "")), "no hype or income promises");
check(!/\d+\s*(students|graduates)\s+(earned|made)|testimonial from/i.test(all), "no invented student results");
A.SOURCES.forEach(s => check(s.status && s.status.length > 20, "source has a check status: " + s.claim.slice(0, 40)));

// Worksheets
const wsIds = new Set();
A.WORKSHEETS.forEach(w => { check(!wsIds.has(w.id), "unique worksheet " + w.id); wsIds.add(w.id); check(A.MODULES.some(m => m.id === w.module), w.id + " valid module"); });

// Worked-example arithmetic (Module 6, Riley)
const fee = +(0.029 * 650 + 0.60).toFixed(2), exp = +(20 + fee + 25).toFixed(2), prof = +(650 - exp).toFixed(2), se = +(prof * 0.9235 * 0.153).toFixed(2);
const m6 = A.LESSONS.find(l => l.id === "m6l1").example.body;
[fee, exp, prof, se].forEach(n => check(m6.includes("$" + n.toFixed(2)), "Riley example contains $" + n.toFixed(2)));

// Hoodie example arithmetic (Brand Scaling module 1)
const hf = +(0.029 * 60 + 0.30).toFixed(2), hm = +(60 - 22 - 8 - hf).toFixed(2), hbe = (60 / hm).toFixed(2);
const s1 = A.LESSONS.find(l => l.id === "s1l2").example.body;
check(s1.includes("$" + hf.toFixed(2)) && s1.includes("$" + hm.toFixed(2)) && s1.includes(hbe), "hoodie example: fees $" + hf + ", margin $" + hm + ", break-even " + hbe);

// Config: coaching tiers (Yaya chose $1,500-$4,800+)
check(typeof C.courseName === "string" && C.courseName, "config course name");
check(Array.isArray(C.tiers) && C.tiers.length === 3, "3 coaching tiers");
C.tiers.forEach(t => {
  check(typeof t.price === "number" && t.price >= 1500 && t.price <= 4800, t.id + " price in $1,500-$4,800");
  check(Array.isArray(t.features) && t.features.length >= 3, t.id + " lists 3+ concrete deliverables");
  check(!/guarantee|earn|income|\$\d+k|six figures|spots left|only \d+/i.test(t.features.join(" ") + " " + t.fits), t.id + " has no income claims or scarcity");
});
check(/does not promise income/.test(C.earningsDisclaimer || ""), "earnings disclaimer says it does not promise income");

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
