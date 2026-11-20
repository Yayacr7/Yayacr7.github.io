// GetPaid app: screens, saving, voice, sending. Logic lives in core.js (GP).
(function () {
  "use strict";
  const KEY = "getpaid.v1";
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const M = GP.money, today = () => GP.todayISO();
  const centsIn = v => GP.toCents(v);
  const dollars = c => (c ? (c / 100).toFixed(2).replace(/\.00$/, "") : "");

  // ---------- icons ----------
  const I = {
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    jobs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5h9l4 4V21a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 21z"/><path d="M14.5 2.5v4.5H19M9 12h7M9 16h5"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9M10 20a2.2 2.2 0 0 0 4 0"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.4-5.4A8.5 8.5 0 1 1 21 12z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13M7 8l5-5 5 5M5 13v7h14v-7"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20zM12 10v4M12 17.5v.5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.5"/></svg>'
  };

  const MARK = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M12 3h18l-6.5 11H5.5z" fill="#5EEAC4"/><path d="M8.5 18h18L20 29H2z" fill="#3CCBA6"/><path d="M12.5 14 9.5 18h9l3-4z" fill="#2AA88A"/></svg>';
  const LOGO = '<span class="logo">' + MARK + "GetPaid</span>";
  const I2 = {
    quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 7c-2.5 1-4 3.2-4 6.5V17h4.5v-4.5H6.5M19 7c-2.5 1-4 3.2-4 6.5V17h4.5v-4.5h-3"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h1M12 8h4M8 12h1M12 12h4M8 16h1M12 16h4"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M8.5 14l2.5 2.5 4.5-5"/></svg>'
  };
  const SPARK = '<svg class="spark" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4l3.6 12.4L36 20l-12.4 3.6L20 36l-3.6-12.4L4 20l12.4-3.6z" fill="currentColor"/></svg>';

  // ---------- storage (device only) ----------
  let storageOk = true;
  function defaults() {
    return {
      v: 1, seq: { quote: 0, invoice: 0 }, docs: [],
      settings: {
        setupDone: false, pricesConfirmed: false, trade: "detailing",
        bizName: "", yourName: "", phone: "", email: "", payHow: "", payLink: "",
        dueDays: 7, quoteDays: 30, taxRate: 0, note: "Thank you for your business!", tone: "friendly", theme: "",
        services: GP.TRADES.detailing.services.map(s => ({ ...s, words: s.words.slice() }))
      }
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const d = JSON.parse(raw); const def = defaults();
      if (!d || !Array.isArray(d.docs) || !d.settings) return def;
      d.settings = Object.assign(def.settings, d.settings); d.seq = Object.assign(def.seq, d.seq || {});
      return d;
    } catch (e) { storageOk = false; return defaults(); }
  }
  let DB = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); storageOk = true; }
    catch (e) { storageOk = false; }
  }
  const S = () => DB.settings;
  const findDoc = id => DB.docs.find(d => d.id === id);
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function applyTheme() { if (S().theme === "light") document.documentElement.setAttribute("data-theme", "light"); else document.documentElement.removeAttribute("data-theme"); }
  applyTheme();

  // ---------- toast + sheet ----------
  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); }
  let sheetOnClose = null;
  function openSheet(html, onClose) {
    const root = $("#sheetroot");
    root.innerHTML = '<div class="scrim" data-act="closesheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + "</div>";
    sheetOnClose = onClose || null;
    requestAnimationFrame(() => { root.querySelector(".scrim").classList.add("on"); root.querySelector(".sheet").classList.add("on"); const f = root.querySelector("[autofocus]") || root.querySelector("h2"); if (f) { f.setAttribute("tabindex", f.getAttribute("tabindex") || "-1"); f.focus({ preventScroll: true }); } });
  }
  function closeSheet() { const root = $("#sheetroot"); root.innerHTML = ""; const f = sheetOnClose; sheetOnClose = null; if (f) f(); }
  const sheetOpen = () => !!$("#sheetroot .sheet");

  // ---------- helpers ----------
  function initials(n) { const p = (n || "?").replace(/^the\s+/i, "").split(/\s+/).filter(Boolean); return ((p[0] || "?")[0] + (p[1] ? p[1][0] : "")).toUpperCase(); }
  function pill(doc) { const st = GP.status(doc); return '<span class="pill ' + st + '">' + GP.LABELS[st] + "</span>"; }
  function docTitle(d) { return (d.type === "quote" ? "Quote " : "Invoice ") + d.number; }
  function lateDays(d) { return d.dueDate ? GP.daysBetween(d.dueDate, today()) : 0; }
  function nav(active) {
    const due = followDue().length;
    const a = (h, k, ic, label) => '<a href="#' + h + '" class="' + (active === k ? "on" : "") + '"' + (active === k ? ' aria-current="page"' : "") + ">" + ic + "<span>" + label + "</span>" + (k === "follow" && due ? '<i class="badge">' + due + "</i>" : "") + "</a>";
    return '<nav class="nav" aria-label="Main"><div class="in2">' + a("home", "home", I.home, "Home") + a("jobs", "jobs", I.jobs, "Jobs") +
      '<a href="#new" data-act="newvoice" aria-label="New from voice note"><span class="fab">' + I.mic + "</span></a>" +
      a("follow", "follow", I.bell, "Follow-ups") + a("settings", "settings", I.gear, "Settings") + "</div></nav>";
  }
  function top(title, sub, backTo) {
    return '<header class="top">' + (backTo ? '<a class="back" href="#' + backTo + '" aria-label="Back">' + I.back + "</a>" : "") + '<div class="grow"><h1>' + esc(title) + "</h1>" + (sub ? '<div class="sub">' + sub + "</div>" : "") + "</div></header>";
  }
  function storageBanner() { return storageOk ? "" : '<div class="banner">' + I.warn + "<div>This browser is blocking saving (private mode?). Your work will be lost when you close it. Open GetPaid in a normal tab.</div></div>"; }
  function followDue() {
    const out = [];
    DB.docs.forEach(d => { const p = GP.followPlan(d); if (p.next && p.due) out.push({ d, p }); });
    return out.sort((a, b) => (a.p.next.date || "").localeCompare(b.p.next.date || ""));
  }

  // ---------- screens ----------
  function viewWelcome(step) {
    const s = S();
    if (step === "biz") return '<main id="main" class="wrap nonav">' + top("Your business", "Step 1 of 2 · shows on your invoices", "welcome") +
      '<div class="card">' +
      field("Business name", "bizName", s.bizName, "e.g. Shine On Mobile Detailing") +
      field("Your name", "yourName", s.yourName, "First and last") +
      '<div class="two">' + field("Phone", "phone", s.phone, "(612) 555-0100", "tel") + field("Email (optional)", "email", s.email, "you@email.com", "email") + "</div>" +
      field("How customers can pay you", "payHow", s.payHow, "Venmo @name, Zelle 612-555-0100 or cash") +
      field("Payment link (optional)", "payLink", s.payLink, "A Stripe or Square payment link", "url") +
      '<p class="note">GetPaid does not take payments. It puts how to pay on your invoices and messages.</p></div>' +
      '<a class="btn pri full" href="#welcome/prices">Next: your prices</a></main>';
    if (step === "prices") return '<main id="main" class="wrap nonav">' + top("Your prices", "Step 2 of 2 · mobile detailing", "welcome/biz") +
      '<div class="banner">' + I.warn + "<div><b>These are example prices, not market rates.</b> Change them to what you really charge. GetPaid uses them when you don't say a price.</div></div>" +
      '<div class="card">' + priceEditor() + "</div>" +
      '<button class="btn pri full" data-act="pricesok">These are my prices</button>' +
      '<button class="btn ghost full" data-act="pricesskip" style="margin-top:6px">Keep the examples for now</button></main>';
    return '<main id="main" class="wrap nonav"><div class="welcome">' +
      LOGO +
      "<h1>Job done.<br><em class=\"mint\">Invoice next.</em></h1>" +
      '<p class="muted">Talk for 20 seconds about the job. GetPaid writes the invoice, keeps track of who paid, and drafts polite reminders. You check every message before it goes.</p>' +
      '<div class="steps3"><div><span><b>Say what you did.</b><br><span class="muted small">"Full detail on Mike\'s 2019 Pilot, pet hair too, due Friday."</span></span></div>' +
      '<div><span><b>Check the draft and send it.</b><br><span class="muted small">By text or email, from your own phone.</span></span></div>' +
      '<div><span><b>Get a nudge when it\'s late.</b><br><span class="muted small">Friendly reminders, ready for you to approve.</span></span></div></div>' +
      '<a class="btn pri full" href="#welcome/biz">Set up (about 1 minute)</a>' +
      '<p class="note" style="text-align:center">Your jobs and customers stay on this phone. No account needed.</p></div></main>';
  }
  function field(label, key, val, ph, type) {
    return '<label class="field"><span>' + esc(label) + '</span><input class="in" data-set="' + key + '" value="' + esc(val) + '" placeholder="' + esc(ph || "") + '"' + (type ? ' type="' + type + '"' : "") + (type === "tel" ? ' inputmode="tel" autocomplete="tel"' : "") + (type === "email" ? ' autocomplete="email"' : "") + "></label>";
  }
  function priceEditor() {
    return '<div class="svc head"><span>Service</span><span>Car</span><span>SUV / truck</span></div>' +
      S().services.map((s, i) => '<div class="svc"><input class="in" aria-label="Service name" data-svc="' + i + '" data-k="name" value="' + esc(s.name) + '">' +
        '<div class="money-in"><input class="in" aria-label="Price for a car" inputmode="decimal" data-svc="' + i + '" data-k="price" value="' + dollars(s.price) + '"></div>' +
        '<div class="money-in"><input class="in" aria-label="Price for an SUV or truck" inputmode="decimal" data-svc="' + i + '" data-k="big" value="' + (s.big ? dollars(s.big) : "") + '" placeholder="same"></div>' +
        '<label class="svcw tiny muted">Words you say: <input class="in" style="min-height:36px;margin-top:4px;font-size:14px" data-svc="' + i + '" data-k="words" value="' + esc((s.words || []).join(", ")) + '"></label></div>').join("") +
      '<button class="btn sm soft" data-act="addsvc" style="margin-top:10px">Add a service</button>';
  }

  function viewHome() {
    const s = S();
    let owed = 0, unpaid = 0, overdue = 0, overN = 0, paidMonth = 0;
    const month = today().slice(0, 7);
    DB.docs.forEach(d => {
      const st = GP.status(d), T = GP.totals(d);
      if (d.type === "invoice" && (st === "sent" || st === "partly" || st === "overdue")) { owed += T.balance; unpaid++; if (st === "overdue") { overdue += T.balance; overN++; } }
      (d.payments || []).forEach(p => { if ((p.date || "").slice(0, 7) === month) paidMonth += p.amount; });
      if (d.type === "invoice" && d.paidBefore && (d.date || "").slice(0, 7) === month) paidMonth += d.paidBefore;
    });
    const needs = [];
    followDue().forEach(({ d, p }) => needs.push({ d, av: p.next.id === "thanks" ? "go" : "warn", t: p.next.id === "thanks" ? "Say thanks: " + (d.customer.name || "customer") : "Follow up: " + (d.customer.name || "customer"), s: p.next.label + " · " + docTitle(d), amt: p.next.id === "thanks" ? "" : M(GP.totals(d).balance) }));
    DB.docs.filter(d => GP.status(d) === "draft").forEach(d => needs.push({ d, av: "info", t: "Send: " + (d.customer.name || "customer"), s: docTitle(d) + " is still a draft", amt: M(GP.totals(d).total) }));
    DB.docs.filter(d => GP.status(d) === "approved").forEach(d => needs.push({ d, av: "go", t: "Make the invoice: " + (d.customer.name || "customer"), s: "Quote " + d.number + " was approved", amt: M(GP.totals(d).total) }));
    const hello = (s.yourName ? "Hi " + esc(GP.firstName(s.yourName)) + " · " : "") + esc(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
    const dueN = followDue().length, unpaidN = DB.docs.filter(d => d.type === "invoice" && ["sent", "partly", "overdue"].includes(GP.status(d))).length;
    return '<main id="main" class="wrap">' + '<header class="top">' + LOGO + '<span class="tiny muted" style="margin-left:auto;text-align:right">' + hello + "</span></header>" +
      '<section class="hello">' + SPARK + '<h1>Job done.<br><em>Invoice next.</em></h1><p>Talk about the job. Get the invoice. Polite follow-ups you approve.</p></section>' +
      storageBanner() +
      (s.pricesConfirmed ? "" : '<div class="banner">' + I.warn + '<div>Your prices are still the examples. <a href="#settings/prices">Set your real prices</a></div></div>') +
      '<ul class="actions" aria-label="Start">' +
      '<li><a class="act main talk" href="#new" data-act="newvoice"><span class="ic">' + I.mic + '</span><span>Create invoice<small>Tap and talk about the job</small></span><span class="chev">›</span></a></li>' +
      '<li><a class="act" href="#new" data-act="newvoice" data-mode="quote"><span class="ic">' + I2.quote + '</span><span>Create quote<small>Price a job before you do it</small></span><span class="chev">›</span></a></li>' +
      '<li><a class="act" href="#jobs"><span class="ic">' + I2.list + '</span><span>Invoices<small>' + (unpaidN ? unpaidN + " waiting for payment" : "All your quotes and invoices") + '</small></span><span class="chev">›</span></a></li>' +
      '<li><a class="act" href="#follow"><span class="ic">' + I2.cal + '</span><span>Follow-ups<small>' + (dueN ? "Ready for you to review" : "Nothing due right now") + "</small></span>" + (dueN ? '<span class="cnt">' + dueN + "</span>" : "") + '<span class="chev">›</span></a></li></ul>' +
      '<section class="card sum" aria-label="Money summary"><div class="label">Owed to you</div><div class="big">' + M(owed) + '</div><div class="small" style="opacity:.8">' + (unpaid ? unpaid + " unpaid invoice" + (unpaid > 1 ? "s" : "") : "Nothing waiting. Nice.") + "</div>" +
      '<div class="stats"><div><b>' + M(overdue) + "</b><span>Overdue" + (overN ? " (" + overN + ")" : "") + "</span></div><div><b>" + M(paidMonth) + "</b><span>Logged as paid this month</span></div></div></section>" +

      '<section class="card"><div class="row between"><h2>Needs you</h2>' + (needs.length > 4 ? '<a class="small" href="#follow">See all</a>' : "") + "</div>" +
      (needs.length ? '<ul class="list">' + needs.slice(0, 4).map(n => '<li><a class="item" href="#doc/' + n.d.id + '"><span class="av ' + n.av + '">' + initials(n.d.customer.name) + '</span><span class="grow"><div class="t">' + esc(n.t) + '</div><div class="s">' + esc(n.s) + '</div></span><span class="amt"><b>' + n.amt + "</b></span></a></li>").join("") + "</ul>"
        : '<div class="empty"><b>All caught up</b>' + (DB.docs.length ? "No reminders due today." : "Finish a job, then tap the mic.") + "</div>") +
      "</section>" + (DB.docs.length ? "" : '<p class="note" style="text-align:center">Nothing is ever sent by itself. You approve every text and email.</p>') + "</main>" + nav("home");
  }

  // ---- record ----
  const EXAMPLES = [
    "Just finished a full detail on Mike Johnson's 2019 Honda Pilot, added pet hair removal. His number is 612-555-0142. He paid 50 deposit, due Friday.",
    "Interior detail for Dana Brooks, 2017 Toyota Camry, plus odor removal, charge 45 for the odor. 763-555-0199, due in 3 days.",
    "Quote for Sarah Lee, 2021 Tesla Model Y, ceramic coating and paint correction. Email sarah.lee at gmail dot com."
  ];
  let recText = "", recMode = "";
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false, recBase = "";
  function viewNew() {
    return '<main id="main" class="wrap nonav">' + top(recMode === "quote" ? "New quote" : "New invoice", "Talk or type. You'll check everything next.", "home") +
      '<div class="rec">' +
      '<button class="micbig' + (listening ? " on" : "") + '" id="micbtn" data-act="mic" aria-label="' + (listening ? "Stop listening" : "Start talking") + '" aria-pressed="' + listening + '">' + (listening ? I.stop : I.mic) + "</button>" +
      '<div class="micstate" id="micstate" aria-live="polite">' + (SR ? (listening ? "Listening… tap to stop" : "Tap and talk") : "Type, or use your keyboard's mic") + "</div>" +
      '<p class="say">Say <b>who</b>, the <b>car</b>, <b>what you did</b>, any <b>price</b> that differs from your list, what they <b>already paid</b> and <b>when it\'s due</b>.</p>' +
      "</div>" +
      '<label class="field"><span>Your words</span><textarea class="in" id="rectext" rows="5" placeholder="e.g. Full detail on Mike\'s 2019 Pilot, pet hair too, 612-555-0142, due Friday">' + esc(recText) + "</textarea></label>" +
      (SR ? "" : '<p class="note">This browser can\'t listen directly. Tap the box, then the microphone on your keyboard to speak.</p>') +
      '<div class="examples"><div class="label" style="margin-bottom:6px">Try an example</div><div class="chips">' + EXAMPLES.map((e, i) => '<button class="chip" data-act="example" data-i="' + i + '">' + ["Finished job", "With a price change", "A quote"][i] + "</button>").join("") + "</div></div>" +
      '<div class="err" id="recerr" role="alert"></div>' +
      '<button class="btn pri full" data-act="makedraft" style="margin-top:16px">Make my draft</button>' +
      '<p class="note">GetPaid reads your words with simple rules, not AI, and shows what it understood so you can fix it.' + (SR ? " Voice uses your phone's own speech-to-text (on some phones Apple or Google process the audio)." : "") + "</p></main>";
  }
  function startListening() {
    if (!SR) { const ta = $("#rectext"); if (ta) ta.focus(); return; }
    if (listening) return stopListening();
    try {
      rec = new SR(); rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true;
      const ta = $("#rectext"); recBase = ta ? ta.value.trim() : recText.trim();
      rec.onresult = e => {
        let fin = "", int = "";
        for (let i = 0; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else int += r[0].transcript; }
        recText = (recBase ? recBase + " " : "") + (fin + " " + int).replace(/\s+/g, " ").trim();
        const t = $("#rectext"); if (t) t.value = recText;
      };
      rec.onerror = e => {
        const msg = e.error === "not-allowed" || e.error === "service-not-allowed" ? "The microphone is blocked. Allow it for this site in your settings, or type instead." : e.error === "no-speech" ? "I didn't hear anything. Try again a bit closer, or type." : e.error === "network" ? "Speech-to-text needs a connection. Type instead, or try again." : "Voice stopped (" + e.error + "). You can type instead.";
        const el = $("#recerr"); if (el) el.textContent = msg;
      };
      rec.onend = () => { listening = false; updateMic(); };
      rec.start(); listening = true; updateMic();
      const el = $("#recerr"); if (el) el.textContent = "";
    } catch (e) { listening = false; updateMic(); const el = $("#recerr"); if (el) el.textContent = "Voice couldn't start here. Type instead."; }
  }
  function stopListening() { listening = false; try { rec && rec.stop(); } catch (e) { } updateMic(); }
  function updateMic() {
    const b = $("#micbtn"), st = $("#micstate"); if (!b) return;
    b.classList.toggle("on", listening); b.innerHTML = listening ? I.stop : I.mic; b.setAttribute("aria-pressed", listening); b.setAttribute("aria-label", listening ? "Stop listening" : "Start talking");
    if (st) st.textContent = listening ? "Listening… tap to stop" : (SR ? "Tap and talk" : "Type, or use your keyboard's mic");
  }

  // ---- draft / edit ----
  let draft = null; // { doc, heard, checks, transcript, isNew }
  function makeDraft(text) {
    const s = S();
    const r = GP.parseJob(text, { services: s.services, today: today() });
    if (recMode === "quote" && r.type !== "quote") { r.type = "quote"; r.heard.unshift("Quote, because you tapped Create quote"); }
    const doc = {
      id: "", type: r.type, number: "", date: today(),
      customer: r.customer, vehicle: r.vehicle, big: r.big,
      items: r.items.map(x => ({ desc: x.desc, qty: x.qty, price: x.price, serviceId: x.serviceId, custom: x.custom, why: x.why })),
      discount: r.discount, taxRate: +s.taxRate || 0, paidBefore: r.type === "invoice" ? r.paidSoFar : 0,
      dueDate: r.type === "invoice" ? (r.dueDate || GP.addDays(today(), +s.dueDays || 0)) : "",
      validUntil: r.type === "quote" ? GP.addDays(today(), +s.quoteDays || 30) : "",
      note: s.note || "", transcript: text, payments: [], followups: [], history: []
    };
    const heard = r.heard.slice();
    if (r.type === "invoice" && !r.dueDate) heard.push("Due " + GP.fmtDate(doc.dueDate, true) + " (your default: " + s.dueDays + " days)");
    if (r.type === "quote" && r.paidSoFar) r.checks.push("You mentioned a payment of " + M(r.paidSoFar) + ". Quotes don't track payments; turn it into an invoice after the job.");
    draft = { doc, heard, checks: r.checks, transcript: text, isNew: true };
  }
  function editDraft(id) { const d = findDoc(id); if (!d) return null; draft = { doc: JSON.parse(JSON.stringify(d)), heard: [], checks: [], transcript: d.transcript, isNew: false }; return draft; }

  function viewDraft() {
    if (!draft) return null;
    const d = draft.doc, inv = d.type === "invoice";
    const svcOpts = S().services.map((s, i) => '<option value="' + i + '">' + esc(s.name) + " · " + M(d.big && s.big ? s.big : s.price) + "</option>").join("");
    return '<main id="main" class="wrap nonav" style="padding-bottom:110px">' + top(draft.isNew ? "Check your draft" : "Edit " + docTitle(d), draft.isNew ? "Fix anything I got wrong, then save." : "", draft.isNew ? "new" : "doc/" + d.id) +
      '<div class="seg" role="group" aria-label="Type"><button data-act="settype" data-v="invoice" class="' + (inv ? "on" : "") + '" aria-pressed="' + inv + '">Invoice</button><button data-act="settype" data-v="quote" class="' + (!inv ? "on" : "") + '" aria-pressed="' + !inv + '">Quote</button></div>' +
      (draft.checks.length ? '<div class="checks" role="note"><b>Check these</b><ul>' + draft.checks.map(c => "<li>" + esc(c) + "</li>").join("") + "</ul></div>" : "") +
      (draft.transcript ? '<details class="heard card flat"' + (draft.isNew ? " open" : "") + '><summary>What I heard</summary><q>' + esc(draft.transcript) + "</q>" + (draft.heard.length ? "<ul>" + draft.heard.map(h => "<li>" + esc(h) + "</li>").join("") + "</ul>" : "") + '<p class="tiny">Your words stay private. They are not on the invoice.</p></details>' : "") +
      '<section class="card"><h2>Customer</h2>' +
      dfield("Name", "customer.name", d.customer.name, "Customer name", "", "name") +
      '<div class="two">' + dfield("Phone", "customer.phone", d.customer.phone, "(612) 555-0100", "tel") + dfield("Email", "customer.email", d.customer.email, "name@email.com", "email") + "</div>" +
      dfield("Vehicle", "vehicle", d.vehicle, "e.g. 2019 Honda Pilot") +
      '<div class="label" style="margin:10px 0 6px">Size (sets package prices)</div><div class="seg" role="group" aria-label="Vehicle size"><button data-act="setsize" data-v="0" class="' + (!d.big ? "on" : "") + '" aria-pressed="' + !d.big + '">Car</button><button data-act="setsize" data-v="1" class="' + (d.big ? "on" : "") + '" aria-pressed="' + !!d.big + '">SUV / truck / van</button></div>' +
      '<div class="err" id="nameerr" role="alert"></div></section>' +
      '<section class="card"><h2>What you did</h2><div id="lines">' + linesHtml() + "</div>" +
      '<div class="row" style="margin-top:10px"><select class="in grow" id="addsel" aria-label="Add from your price list"><option value="">Add from your prices…</option>' + svcOpts + '<option value="custom">Something else (type it)</option></select></div></section>' +
      '<section class="card"><h2>Money</h2><div class="two">' +
      '<label class="field"><span>Discount</span><div class="money-in"><input class="in" inputmode="decimal" data-d="discount" data-money value="' + dollars(d.discount) + '" placeholder="0"></div></label>' +
      '<label class="field"><span>Tax %</span><input class="in" inputmode="decimal" data-d="taxRate" value="' + (d.taxRate || "") + '" placeholder="0"></label></div>' +
      (inv ? '<label class="field"><span>Already paid (deposit)</span><div class="money-in"><input class="in" inputmode="decimal" data-d="paidBefore" data-money value="' + dollars(d.paidBefore) + '" placeholder="0"></div></label>' : "") +
      '<div class="two"><label class="field"><span>Date</span><input class="in" type="date" data-d="date" value="' + esc(d.date) + '"></label>' +
      (inv ? '<label class="field"><span>Due</span><input class="in" type="date" data-d="dueDate" value="' + esc(d.dueDate) + '"></label>' : '<label class="field"><span>Good until</span><input class="in" type="date" data-d="validUntil" value="' + esc(d.validUntil) + '"></label>') + "</div>" +
      '<label class="field"><span>Note to customer (on the ' + d.type + ')</span><textarea class="in" rows="2" data-d="note">' + esc(d.note) + "</textarea></label>" +
      '<div class="tot" id="tots">' + totsHtml(d) + "</div></section>" +
      '<p class="note">Sales tax rules differ by state and service. GetPaid does not give tax advice; check with your state if you are unsure.</p></main>' +
      '<div class="savebar"><div class="in2"><div class="tt"><span class="tiny muted">' + (inv ? "Balance due" : "Quote total") + '</span><b id="savetot">' + M(inv ? GP.totals(d).balance : GP.totals(d).total) + '</b></div><button class="btn pri" data-act="savedraft">' + (draft.isNew ? "Save " + d.type : "Save changes") + "</button></div></div>";
  }
  function dfield(label, path, val, ph, type, ac) {
    return '<label class="field"><span>' + label + '</span><input class="in" data-d="' + path + '" value="' + esc(val) + '" placeholder="' + esc(ph) + '"' + (type ? ' type="' + type + '"' : "") + (type === "tel" ? ' inputmode="tel"' : "") + (ac ? ' autocomplete="' + ac + '"' : ' autocomplete="off"') + "></label>";
  }
  function linesHtml() {
    const d = draft.doc;
    if (!d.items.length) return '<div class="empty small" style="padding:12px">No lines yet. Add one below.</div>';
    return d.items.map((x, i) => '<div class="line"><input class="in" aria-label="Line ' + (i + 1) + ' description" data-line="' + i + '" data-k="desc" value="' + esc(x.desc) + '">' +
      '<div class="lr"><input class="in" aria-label="Quantity" inputmode="numeric" data-line="' + i + '" data-k="qty" value="' + esc(x.qty) + '">' +
      '<div class="money-in"><input class="in" aria-label="Price each" inputmode="decimal" data-line="' + i + '" data-k="price" value="' + dollars(x.price) + '" placeholder="0"></div>' +
      '<span class="lt" data-lt="' + i + '">' + M(Math.round((+x.qty || 0) * x.price)) + '</span><button class="x" data-act="delline" data-i="' + i + '" aria-label="Remove line">' + I.x + "</button></div>" +
      (x.why && draft.isNew ? '<div class="why">' + esc(x.why) + "</div>" : "") + "</div>").join("");
  }
  function totsHtml(d) {
    const T = GP.totals(d), inv = d.type === "invoice";
    return "<div><span class='muted'>Subtotal</span><span class='num'>" + M(T.sub) + "</span></div>" +
      (T.disc ? "<div><span class='muted'>Discount</span><span class='num'>-" + M(T.disc) + "</span></div>" : "") +
      (T.tax ? "<div><span class='muted'>Tax (" + esc(d.taxRate) + "%)</span><span class='num'>" + M(T.tax) + "</span></div>" : "") +
      "<div class='grand'><span>Total</span><span class='num'>" + M(T.total) + "</span></div>" +
      (inv && T.paid ? "<div><span class='muted'>Paid</span><span class='num'>-" + M(T.paid) + "</span></div><div class='grand'><span>Balance due</span><span class='num'>" + M(T.balance) + "</span></div>" : "");
  }
  function refreshTotals() {
    const d = draft.doc; const t = $("#tots"); if (t) t.innerHTML = totsHtml(d);
    const s = $("#savetot"); if (s) s.textContent = M(d.type === "invoice" ? GP.totals(d).balance : GP.totals(d).total);
    d.items.forEach((x, i) => { const el = document.querySelector('[data-lt="' + i + '"]'); if (el) el.textContent = M(Math.round((+x.qty || 0) * x.price)); });
  }
  function setSize(big) {
    const d = draft.doc; d.big = big;
    d.items.forEach(x => {
      const s = S().services.find(v => v.id === x.serviceId); if (!s || x.custom) return;
      x.price = big && s.big ? s.big : s.price;
      x.desc = s.name + (big && s.big ? " (SUV / truck)" : "");
    });
  }
  function saveDraft() {
    const d = draft.doc;
    if (!d.customer.name.trim()) { const e = $("#nameerr"); if (e) { e.textContent = "Add the customer's name so you know who this is for."; } const n = document.querySelector('[data-d="customer.name"]'); if (n) { n.focus(); n.scrollIntoView({ block: "center" }); } return; }
    d.items = d.items.filter(x => x.desc.trim() || x.price);
    if (!d.items.length) { toast("Add at least one line first."); return; }
    d.items.forEach(x => { x.qty = Math.max(0, +x.qty || 1); delete x.why; });
    if (draft.isNew) {
      const k = d.type; DB.seq[k] = (DB.seq[k] || 0) + 1;
      d.number = (k === "quote" ? "Q-" : "INV-") + String(DB.seq[k]).padStart(4, "0");
      d.id = newId(); d.createdAt = new Date().toISOString();
      d.history = [{ at: d.createdAt, t: "Created " + (k === "quote" ? "quote" : "invoice") }];
      DB.docs.unshift(d);
    } else {
      const i = DB.docs.findIndex(x => x.id === d.id);
      const old = DB.docs[i];
      if (old.type !== d.type) { // switching type keeps a clear number
        DB.seq[d.type] = (DB.seq[d.type] || 0) + 1; d.number = (d.type === "quote" ? "Q-" : "INV-") + String(DB.seq[d.type]).padStart(4, "0");
        if (d.type === "quote") { d.validUntil = d.validUntil || GP.addDays(today(), +S().quoteDays || 30); d.paidBefore = 0; } else d.dueDate = d.dueDate || GP.addDays(today(), +S().dueDays || 0);
      }
      d.history = (d.history || []).concat([{ at: new Date().toISOString(), t: "Edited" }]);
      DB.docs[i] = d;
    }
    save(); const id = d.id; draft = null; recText = ""; recMode = "";
    toast("Saved " + docTitle(d)); go("doc/" + id);
  }

  // ---- doc ----
  function viewDoc(id) {
    const d = findDoc(id); if (!d) return null;
    const T = GP.totals(d), st = GP.status(d), plan = GP.followPlan(d), inv = d.type === "invoice";
    let next = "";
    if (st === "draft") next = nextCard("Send it", "It's saved, but the customer hasn't seen it yet. You'll check the message before it goes.", '<button class="btn pri full" data-act="send" data-id="' + d.id + '">' + I.share + " Send " + d.type + "</button>");
    else if (st === "waiting" || st === "expired") next = nextCard(st === "expired" ? "This quote has expired" : "Waiting for an answer", "Did they say yes?", '<div class="btns"><button class="btn pri" data-act="approve" data-id="' + d.id + '">They said yes</button><button class="btn" data-act="decline" data-id="' + d.id + '">They said no</button></div>');
    else if (st === "approved") next = nextCard("Quote approved", "After the job, turn it into an invoice in one tap.", '<button class="btn pri full" data-act="toinvoice" data-id="' + d.id + '">Turn into invoice</button>');
    else if (st === "invoiced") next = nextCard("Turned into an invoice", "", '<a class="btn soft full" href="#doc/' + d.invoiceId + '">Open the invoice</a>');
    else if (inv && st !== "paid") next = nextCard(st === "overdue" ? lateDays(d) + " day" + (lateDays(d) === 1 ? "" : "s") + " late" : "Waiting for payment", st === "overdue" ? "Send a polite reminder, or log the payment if they paid." : "Due " + GP.fmtDate(d.dueDate, true) + ". Got paid? Log it here.", '<div class="btns"><button class="btn pri" data-act="pay" data-id="' + d.id + '">Log payment</button><button class="btn" data-act="send" data-id="' + d.id + '">Send again</button></div>', st === "overdue");
    else if (st === "paid") next = nextCard("Paid in full", "", plan.next && plan.next.id === "thanks" ? '<div class="btns"><button class="btn pri" data-act="follow" data-id="' + d.id + '">Say thanks</button><button class="btn ghost" data-act="nothanks" data-id="' + d.id + '">Skip</button></div>' : "");
    let fcard = "";
    if (plan.all.length) {
      fcard = '<section class="card"><h2>Follow-up plan</h2><ul class="hist">' + plan.all.map(s => '<li><span class="d">' + GP.fmtDate(s.date, true).replace(/^\w+, /, "") + '</span><span class="g">' + esc(s.label) + "</span>" +
        (s.passed && !s.done ? '<span class="tiny muted">Passed</span>' : s.done ? '<span class="pill ' + ((d.followups.find(f => f.step === s.id) || {}).skipped ? "draft" : "partly") + '">' + ((d.followups.find(f => f.step === s.id) || {}).skipped ? "Skipped" : "Sent") + "</span>" : plan.next && plan.next.id === s.id && plan.due ? '<button class="btn sm pri" data-act="follow" data-id="' + d.id + '">Review</button>' : '<span class="tiny muted">Later</span>') + "</li>").join("") +
        '</ul><p class="note">Nothing goes out by itself. When a step is due, it shows up in Follow-ups for you to review and send.</p>' +
        (plan.all.every(s => s.done || s.passed) && !(plan.next && plan.due) && inv && st !== "paid" ? '<p class="small"><b>All reminders sent.</b> Call them and talk it through. If it stays unpaid, look up your state\'s small claims court rules.</p>' : "") + "</section>";
    }
    return '<main id="main" class="wrap">' + top(docTitle(d), esc(d.customer.name || ""), "jobs") +
      '<section class="hero"><div class="row between">' + pill(d) + '<span class="tiny muted">' + GP.fmtDate(d.date) + "</span></div>" +
      '<div class="amt">' + M(inv && st !== "draft" ? T.balance : T.total) + '</div><div class="muted small">' + (inv ? (st === "draft" ? "Total" : st === "paid" ? "Balance (paid " + M(T.paid) + ")" : "Balance due" + (T.paid ? " · " + M(T.paid) + " paid" : "")) : "Quote total") + (d.vehicle ? " · " + esc(d.vehicle) : "") + "</div></section>" +
      next + fcard + paperHtml(d) +
      '<div class="btns three"><button class="btn sm" data-act="edit" data-id="' + d.id + '">Edit</button><button class="btn sm" data-act="print">Save PDF</button><button class="btn sm" data-act="dupe" data-id="' + d.id + '">Copy as new</button></div>' +
      '<section class="card"><h2>History</h2><ul class="hist">' + historyHtml(d) + "</ul></section>" +
      '<button class="btn danger full" data-act="del" data-id="' + d.id + '">Delete ' + d.type + "</button></main>" + nav("jobs");
  }
  function nextCard(title, p, btns, warn) { return '<section class="card next' + (warn ? " warn" : "") + '"><h2>' + esc(title) + "</h2>" + (p ? "<p>" + esc(p) + "</p>" : "") + btns + "</section>"; }
  function historyHtml(d) {
    const rows = (d.history || []).map(h => ({ at: h.at, t: h.t }));
    (d.payments || []).forEach((p, i) => rows.push({ at: p.date + "T12:00:00", t: "Payment " + M(p.amount) + (p.method ? " · " + p.method : ""), pay: i }));
    rows.sort((a, b) => (a.at || "").localeCompare(b.at || ""));
    return rows.map(r => '<li><span class="d">' + GP.fmtDate((r.at || "").slice(0, 10), true).replace(/^\w+, /, "") + '</span><span class="g">' + esc(r.t) + "</span>" + (r.pay != null ? '<button class="btn sm ghost" data-act="delpay" data-id="' + d.id + '" data-i="' + r.pay + '">Undo</button>' : "") + "</li>").join("");
  }
  function paperHtml(d) {
    const s = S(), T = GP.totals(d), inv = d.type === "invoice", st = GP.status(d);
    return '<article class="paper" aria-label="' + (inv ? "Invoice" : "Quote") + ' preview">' + (st === "draft" ? '<div class="chip-d">Draft · Review before sending</div>' : "") + '<div class="ph"><div><div class="biz">' + esc(s.bizName || "Your business name") + '</div><div class="meta">' + [s.yourName, s.phone, s.email].filter(Boolean).map(esc).join("<br>") + "</div></div>" +
      '<div><div class="kind">' + (inv ? "INVOICE" : "QUOTE") + '</div><div class="meta" style="text-align:right">' + esc(d.number) + "<br>" + GP.fmtDate(d.date) + (inv ? "<br>Due " + GP.fmtDate(d.dueDate) : "<br>Good until " + GP.fmtDate(d.validUntil)) + "</div></div></div>" +
      '<div class="meta"><b style="color:#111">' + (inv ? "Bill to" : "For") + "</b><br>" + esc(d.customer.name) + (d.customer.phone ? "<br>" + esc(d.customer.phone) : "") + (d.customer.email ? "<br>" + esc(d.customer.email) : "") + (d.vehicle ? "<br>Vehicle: " + esc(d.vehicle) : "") + "</div>" +
      '<table><thead><tr><th>Service</th><th class="r">Qty</th><th class="r">Amount</th></tr></thead><tbody>' +
      d.items.map(x => "<tr><td>" + esc(x.desc) + (x.qty != 1 ? '<br><span style="color:#777">' + M(x.price) + " each</span>" : "") + '</td><td class="r">' + esc(x.qty) + '</td><td class="r">' + M(Math.round(x.qty * x.price)) + "</td></tr>").join("") + "</tbody></table>" +
      '<div class="pt"><div><span>Subtotal</span><span>' + M(T.sub) + "</span></div>" + (T.disc ? "<div><span>Discount</span><span>-" + M(T.disc) + "</span></div>" : "") + (T.tax ? "<div><span>Tax (" + esc(d.taxRate) + "%)</span><span>" + M(T.tax) + "</span></div>" : "") +
      '<div class="g"><span>Total</span><span>' + M(T.total) + "</span></div>" + (inv && T.paid ? "<div><span>Paid</span><span>-" + M(T.paid) + '</span></div><div class="g"><span>Balance due</span><span>' + M(T.balance) + "</span></div>" : "") + "</div>" +
      (inv && st === "paid" ? '<div style="margin-top:10px"><span class="stamp">PAID</span></div>' : "") +
      (inv && st !== "paid" && (s.payHow || s.payLink) ? '<div class="pay"><b>How to pay</b><br>' + esc(GP.payLine(s)) + "</div>" : "") +
      (d.note ? '<p style="margin:12px 0 0;color:#444">' + esc(d.note) + "</p>" : "") + "</article>";
  }

  // ---- send / follow-up sheet ----
  let sendCtx = null; // { id, kind, tone, full }
  function sendSheet(id, kind) {
    const d = findDoc(id); if (!d) return;
    sendCtx = { id, kind, tone: S().tone || "friendly", full: kind === "send" && !d.customer.phone && !!d.customer.email };
    renderSendSheet();
  }
  function composed() {
    const d = findDoc(sendCtx.id);
    let m = GP.message(d, sendCtx.kind, S(), sendCtx.tone);
    if (sendCtx.full) m += "\n\n---\n" + GP.docText(d, S());
    return m;
  }
  function renderSendSheet(keepText) {
    const d = findDoc(sendCtx.id), k = sendCtx.kind;
    const plan = GP.followPlan(d);
    const title = k === "send" ? "Send " + docTitle(d) : k === "thanks" ? "Say thanks" : (plan.next ? plan.next.label : "Follow up");
    const text = keepText != null ? keepText : composed();
    const canShare = !!navigator.share;
    openSheet('<h2 id="sheettitle">' + esc(title) + '</h2><p class="small muted" style="margin:0 0 10px">To ' + esc(d.customer.name) + (d.customer.phone ? " · " + esc(d.customer.phone) : "") + (d.customer.email ? " · " + esc(d.customer.email) : "") + "</p>" +
      '<div class="row" style="gap:8px;margin-bottom:8px"><div class="seg" role="group" aria-label="Tone" style="flex:1"><button data-act="tone" data-v="friendly" class="' + (sendCtx.tone === "friendly" ? "on" : "") + '">Friendly</button><button data-act="tone" data-v="short" class="' + (sendCtx.tone === "short" ? "on" : "") + '">Short</button></div></div>' +
      '<label class="field" style="margin-top:0"><span>Message (edit anything)</span><textarea class="in" id="msgtext" rows="7">' + esc(text) + "</textarea></label>" +
      (k === "send" ? '<label class="row small" style="margin:-2px 0 10px;gap:8px;min-height:36px"><input type="checkbox" id="fullchk"' + (sendCtx.full ? " checked" : "") + ' style="width:20px;height:20px"> Add the full itemized ' + d.type + " to the message</label>" : "") +
      '<div class="btns">' +
      '<button class="btn pri" data-act="via" data-v="text"' + (d.customer.phone ? "" : " disabled") + ">" + I.msg + " Text it</button>" +
      '<button class="btn" data-act="via" data-v="email"' + (d.customer.email ? "" : " disabled") + ">" + I.mail + " Email it</button>" +
      (canShare ? '<button class="btn" data-act="via" data-v="share">' + I.share + " Share…</button>" : "") +
      '<button class="btn" data-act="via" data-v="copy">' + I.copy + " Copy</button></div>" +
      (!d.customer.phone && !d.customer.email ? '<p class="err">No phone or email saved. Copy the message, or edit the ' + d.type + " to add one.</p>" : "") +
      '<div id="confirmbox"></div>' +
      '<p class="note">This opens your own Messages or email app with the text filled in. Nothing is sent until you press send there. Need a PDF? Close this and tap Save PDF.</p>');
  }
  function confirmSent(channel) {
    const k = sendCtx.kind;
    const box = $("#confirmbox"); if (!box) return;
    box.innerHTML = '<div class="card flat" style="margin:12px 0 0;background:var(--surf2)"><b>' + (channel === "copy" ? "Copied. Did you send it?" : "Did you send it?") + '</b><div class="btns" style="margin-top:10px"><button class="btn pri" data-act="sentyes" data-v="' + channel + '">Yes, I sent it</button><button class="btn" data-act="closesheet">Not yet</button></div>' +
      (k !== "send" && k !== "thanks" ? '<button class="btn ghost full sm" data-act="skipstep" style="margin-top:6px">Skip this reminder</button>' : "") + "</div>";
    box.scrollIntoView({ block: "nearest" });
  }
  function markSent(channel, skipped) {
    const d = findDoc(sendCtx.id), k = sendCtx.kind, now = new Date().toISOString();
    const via = { text: "by text", email: "by email", share: "by share", copy: "(copied)" }[channel] || "";
    d.history = d.history || []; d.followups = d.followups || [];
    if (k === "send") {
      if (!d.sentAt) d.sentAt = now;
      d.history.push({ at: now, t: (skipped ? "Marked as sent" : "Sent " + via).trim() });
    } else {
      d.followups.push({ step: k, at: now, channel, skipped: !!skipped });
      const label = k === "thanks" ? "Thank-you note" : (GP.STEPS[d.type].find(s => s.id === k) || {}).label || "Follow-up";
      d.history.push({ at: now, t: (skipped ? "Skipped: " : "Sent ") + label + (skipped ? "" : " " + via) });
    }
    save(); closeSheet(); toast(skipped ? "Skipped" : "Logged as sent"); render();
  }

  function paySheet(id) {
    const d = findDoc(id); const T = GP.totals(d);
    openSheet('<h2>Log a payment</h2><p class="small muted" style="margin:0 0 6px">' + esc(docTitle(d)) + " · balance " + M(T.balance) + "</p>" +
      '<label class="field"><span>Amount received</span><div class="money-in"><input class="in" id="payamt" inputmode="decimal" value="' + dollars(T.balance) + '" autofocus></div></label>' +
      '<div class="label" style="margin:6px 0">How they paid</div><div class="chips" id="paymeth">' + ["Cash", "Venmo", "Cash App", "Zelle", "Card", "Check", "Other"].map((m, i) => '<button class="chip' + (i === 0 ? " on" : "") + '" data-act="paymeth" data-v="' + m + '">' + m + "</button>").join("") + "</div>" +
      '<label class="field"><span>Date</span><input class="in" type="date" id="paydate" value="' + today() + '"></label>' +
      '<div class="err" id="payerr" role="alert"></div><button class="btn pri full" data-act="savepay" data-id="' + id + '">Save payment</button>' +
      '<p class="note">Only log money that really arrived. GetPaid never sees or moves your money.</p>');
  }

  // ---- lists ----
  let jobFilter = "all", jobSearch = "";
  function viewJobs() {
    const F = { all: "All", unpaid: "Unpaid", overdue: "Overdue", quotes: "Quotes", paid: "Paid", drafts: "Drafts" };
    const q = jobSearch.trim().toLowerCase();
    const list = DB.docs.filter(d => {
      const st = GP.status(d);
      if (jobFilter === "unpaid" && !(d.type === "invoice" && ["sent", "partly", "overdue"].includes(st))) return false;
      if (jobFilter === "overdue" && st !== "overdue") return false;
      if (jobFilter === "quotes" && d.type !== "quote") return false;
      if (jobFilter === "paid" && st !== "paid") return false;
      if (jobFilter === "drafts" && st !== "draft") return false;
      if (q && !(d.customer.name + " " + d.vehicle + " " + d.number + " " + d.customer.phone).toLowerCase().includes(q)) return false;
      return true;
    });
    return '<main id="main" class="wrap">' + top("Jobs", DB.docs.length + " saved") +
      '<label class="visually-hidden" for="jobsearch">Search jobs</label><input class="in" id="jobsearch" type="search" placeholder="Search name, car or number" value="' + esc(jobSearch) + '">' +
      '<div class="chips scroll" style="margin-top:10px">' + Object.keys(F).map(k => '<button class="chip' + (jobFilter === k ? " on" : "") + '" data-act="filter" data-v="' + k + '" aria-pressed="' + (jobFilter === k) + '">' + F[k] + "</button>").join("") + "</div>" +
      '<section class="card" id="joblist">' + jobListHtml(list) + "</section></main>" + nav("jobs");
  }
  function jobListHtml(list) {
    if (!list.length) return '<div class="empty"><b>' + (DB.docs.length ? "Nothing here" : "No jobs yet") + "</b>" + (DB.docs.length ? "Try another filter." : 'Tap the mic to make your first invoice.') + "</div>";
    return '<ul class="list">' + list.map(d => { const T = GP.totals(d), st = GP.status(d); return '<li><a class="item" href="#doc/' + d.id + '"><span class="av' + (st === "overdue" ? " warn" : st === "paid" ? " go" : "") + '">' + initials(d.customer.name) + '</span><span class="grow"><div class="t">' + esc(d.customer.name || "No name") + '</div><div class="s">' + esc(d.number) + (d.vehicle ? " · " + esc(d.vehicle) : "") + " · " + GP.fmtDate(d.date, true) + '</div></span><span class="amt"><b>' + M(d.type === "invoice" && st !== "draft" && st !== "paid" ? T.balance : T.total) + "</b>" + pill(d) + "</span></a></li>"; }).join("") + "</ul>";
  }
  function viewFollow() {
    const due = followDue();
    const later = [];
    DB.docs.forEach(d => { const p = GP.followPlan(d); if (p.next && !p.due && p.next.date) later.push({ d, p }); });
    later.sort((a, b) => a.p.next.date.localeCompare(b.p.next.date));
    const row = (d, p, btn) => '<li><div class="item"><a href="#doc/' + d.id + '" class="av' + (p.next.id === "thanks" ? " go" : btn ? " warn" : "") + '" style="text-decoration:none">' + initials(d.customer.name) + '</a><a href="#doc/' + d.id + '" class="grow" style="text-decoration:none;color:inherit"><div class="t">' + esc(d.customer.name) + " · " + M(GP.totals(d)[p.next.id === "thanks" ? "total" : "balance"]) + '</div><div class="s">' + esc(p.next.label) + (btn ? "" : " · " + GP.fmtDate(p.next.date, true)) + "</div></a>" + (btn ? '<button class="btn sm pri" data-act="follow" data-id="' + d.id + '">Review</button>' : "") + "</div></li>";
    return '<main id="main" class="wrap">' + top("Follow-ups", "Polite reminders, ready for you to approve") +
      '<section class="card"><h2>Due now' + (due.length ? " (" + due.length + ")" : "") + "</h2>" + (due.length ? '<ul class="list">' + due.map(x => row(x.d, x.p, true)).join("") + "</ul>" : '<div class="empty"><b>Nothing due</b>When an invoice is late, a reminder shows up here.</div>') + "</section>" +
      '<section class="card"><h2>Coming up</h2>' + (later.length ? '<ul class="list">' + later.map(x => row(x.d, x.p, false)).join("") + "</ul>" : '<p class="small muted" style="margin:0">' + (due.length ? "The next reminders get planned after you handle the ones above." : "No reminders planned. Send an invoice or quote to start one.") + "</p>") + "</section>" +
      '<div class="card flat"><h2>How reminders work</h2><p class="small muted" style="margin:0">Invoices: on the due day, then 3, 7 and 14 days late. Quotes: after 2 and 7 days. Each one is polite, says "ignore this if you already paid", and offers to fix any problem. Nothing is sent without you.</p></div></main>' + nav("follow");
  }

  // ---- settings ----
  function viewSettings(sub) {
    const s = S();
    if (sub === "prices") return '<main id="main" class="wrap">' + top("Your prices", "Mobile detailing", "settings") +
      (s.pricesConfirmed ? "" : '<div class="banner">' + I.warn + "<div><b>These are example prices, not market rates.</b> Change them to what you really charge.</div></div>") +
      '<div class="card">' + priceEditor() + '</div><button class="btn pri full" data-act="pricesok2">Save prices</button>' +
      '<p class="note">"Words you say" are how GetPaid spots a service in your voice note. Separate them with commas.</p></main>' + nav("settings");
    return '<main id="main" class="wrap">' + top("Settings") + storageBanner() +
      '<section class="card"><h2>Your business</h2>' + field("Business name", "bizName", s.bizName, "Shine On Mobile Detailing") + field("Your name", "yourName", s.yourName, "First and last") +
      '<div class="two">' + field("Phone", "phone", s.phone, "(612) 555-0100", "tel") + field("Email", "email", s.email, "you@email.com", "email") + "</div></section>" +
      '<section class="card"><h2>Getting paid</h2>' + field("How customers can pay you", "payHow", s.payHow, "Venmo @name, Zelle 612-555-0100 or cash") + field("Payment link (optional)", "payLink", s.payLink, "Stripe or Square payment link", "url") +
      '<div class="two">' + field("Invoices due after (days)", "dueDays", s.dueDays, "7", "number") + field("Quotes good for (days)", "quoteDays", s.quoteDays, "30", "number") + "</div>" +
      field("Default tax %", "taxRate", s.taxRate || "", "0", "number") + '<label class="field"><span>Default note on invoices</span><textarea class="in" rows="2" data-set="note">' + esc(s.note) + "</textarea></label></section>" +
      '<a class="card" href="#settings/prices" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit"><span class="grow"><h2 style="margin:0">Prices</h2><span class="small muted">' + s.services.length + " services · " + (s.pricesConfirmed ? "your prices" : "still examples") + '</span></span><span class="muted">›</span></a>' +
      '<section class="card"><h2>Look</h2><div class="seg" role="group" aria-label="Theme"><button data-act="theme" data-v="" class="' + (s.theme !== "light" ? "on" : "") + '">Indigo (dark)</button><button data-act="theme" data-v="light" class="' + (s.theme === "light" ? "on" : "") + '">Light</button></div></section>' +
      '<section class="card"><h2>Backup</h2><p class="small muted" style="margin:0 0 10px">Everything is saved on this phone only. If you clear your browser or lose the phone, it\'s gone. Download a backup now and then.</p><div class="btns"><button class="btn" data-act="backup">Download backup</button><label class="btn" style="cursor:pointer">Restore<input type="file" id="restore" accept="application/json,.json" class="visually-hidden"></label></div></section>' +
      '<section class="card"><h2>Honest notes</h2><ul class="small muted" style="margin:0;padding-left:18px"><li>GetPaid drafts messages. It never sends anything by itself.</li><li>It does not process payments or hold money.</li><li>It reads your voice notes with simple rules, not AI. Always check the draft.</li><li>Prices it starts with are examples, not market rates.</li><li>Not legal or tax advice. Late fees, tax and collection rules differ by state.</li><li>Install it: in Safari tap Share → Add to Home Screen; in Chrome tap ⋮ → Install app.</li></ul></section>' +
      '<button class="btn danger full" data-act="wipe">Erase everything on this phone</button></main>' + nav("settings");
  }

  // ---------- router ----------
  // change screen now (not on the async hashchange), so a fast tap can't land on the old screen
  function go(h) { if (location.hash !== "#" + h) history.pushState(null, "", "#" + h); render(); }
  window.addEventListener("popstate", render);
  function render() {
    if (listening && !/^#new/.test(location.hash)) stopListening();
    if (sheetOpen()) closeSheet();
    const h = (location.hash || "#").slice(1);
    const [page, arg] = h.split("/");
    let html = null;
    if (!S().setupDone && page !== "welcome") { if (page !== "new" && page !== "draft") { location.replace("#welcome"); return; } }
    if (page === "welcome") html = viewWelcome(arg);
    else if (page === "new") html = viewNew();
    else if (page === "draft") html = viewDraft();
    else if (page === "edit") { if (!draft || draft.doc.id !== arg) editDraft(arg); html = draft ? viewDraft() : null; }
    else if (page === "doc") html = viewDoc(arg);
    else if (page === "jobs") html = viewJobs();
    else if (page === "follow") html = viewFollow();
    else if (page === "settings") html = viewSettings(arg);
    else if (page === "home" || page === "") html = viewHome();
    if (html == null) { location.replace("#home"); return; }
    $("#app").innerHTML = html;
    window.scrollTo(0, 0);
    const t = { welcome: "GetPaid", new: "New job · GetPaid", draft: "Check draft · GetPaid", edit: "Edit · GetPaid", doc: "Job · GetPaid", jobs: "Jobs · GetPaid", follow: "Follow-ups · GetPaid", settings: "Settings · GetPaid" }[page];
    document.title = t || "GetPaid";
    if (page === "new") { const ta = $("#rectext"); if (ta && pendingListen) { pendingListen = false; startListening(); } }
  }
  let pendingListen = false;
  window.addEventListener("hashchange", render);

  // ---------- events ----------
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-act]"); if (!el) return;
    const act = el.dataset.act, id = el.dataset.id;
    switch (act) {
      case "newvoice": // start listening right away from the tap (browsers need a tap to use the mic)
        // render now, inside the tap, so the browser lets the mic start
        e.preventDefault(); recText = ""; draft = null; pendingListen = !!SR; recMode = el.dataset.mode || "";
        if (location.hash !== "#new") history.pushState(null, "", "#new");
        render(); break;
      case "mic": e.preventDefault(); listening ? stopListening() : startListening(); break;
      case "example": { recText = EXAMPLES[+el.dataset.i]; const ta = $("#rectext"); if (ta) ta.value = recText; break; }
      case "makedraft": {
        const ta = $("#rectext"); recText = ta ? ta.value : recText;
        if (listening) stopListening();
        if (!recText.trim()) { $("#recerr").textContent = "Say or type a few words about the job first."; return; }
        makeDraft(recText); go("draft"); break;
      }
      case "settype": { draft.doc.type = el.dataset.v; const s = S(); if (draft.doc.type === "quote") { draft.doc.validUntil = draft.doc.validUntil || GP.addDays(today(), +s.quoteDays || 30); } else { draft.doc.dueDate = draft.doc.dueDate || GP.addDays(today(), +s.dueDays || 0); } rerenderDraft(); break; }
      case "setsize": setSize(el.dataset.v === "1"); rerenderDraft(); break;
      case "delline": draft.doc.items.splice(+el.dataset.i, 1); $("#lines").innerHTML = linesHtml(); refreshTotals(); break;
      case "savedraft": saveDraft(); break;
      case "send": sendSheet(id, "send"); break;
      case "follow": { const p = GP.followPlan(findDoc(id)); if (p.next) sendSheet(id, p.next.id); break; }
      case "tone": sendCtx.tone = el.dataset.v; S().tone = sendCtx.tone; save(); renderSendSheet(); break;
      case "via": viaSend(el.dataset.v); break;
      case "sentyes": markSent(el.dataset.v, false); break;
      case "skipstep": markSent("", true); break;
      case "closesheet": closeSheet(); break;
      case "approve": { const d = findDoc(id); d.approvedAt = new Date().toISOString(); d.history.push({ at: d.approvedAt, t: "Customer said yes" }); save(); render(); break; }
      case "decline": { const d = findDoc(id); d.declinedAt = new Date().toISOString(); d.history.push({ at: d.declinedAt, t: "Customer said no" }); save(); render(); break; }
      case "toinvoice": toInvoice(id); break;
      case "nothanks": { const d = findDoc(id); d.noThanks = true; save(); render(); break; }
      case "pay": paySheet(id); break;
      case "paymeth": document.querySelectorAll("#paymeth .chip").forEach(c => c.classList.toggle("on", c === el)); break;
      case "savepay": savePay(id); break;
      case "delpay": {
        if (el.dataset.armed) { const d = findDoc(id); const p = d.payments.splice(+el.dataset.i, 1)[0]; d.history.push({ at: new Date().toISOString(), t: "Removed payment " + M(p.amount) }); save(); render(); toast("Payment removed"); }
        else { el.dataset.armed = "1"; el.textContent = "Tap to remove"; el.classList.add("danger"); }
        break;
      }
      case "edit": draft = null; go("edit/" + id); break;
      case "dupe": dupe(id); break;
      case "print": window.print(); break;
      case "del": {
        if (el.dataset.armed) { const d = findDoc(id); DB.docs = DB.docs.filter(x => x.id !== id); DB.docs.forEach(x => { if (x.invoiceId === id) delete x.invoiceId; }); save(); toast("Deleted " + docTitle(d)); go("jobs"); }
        else { el.dataset.armed = "1"; el.textContent = "Tap again to delete for good"; }
        break;
      }
      case "filter": jobFilter = el.dataset.v; document.querySelectorAll('[data-act="filter"]').forEach(c => { c.classList.toggle("on", c === el); c.setAttribute("aria-pressed", c === el); }); refreshJobs(); break;
      case "addsvc": S().services.push({ id: "c" + newId(), name: "New service", price: 0, words: [] }); save(); render(); break;
      case "pricesok": S().pricesConfirmed = true; S().setupDone = true; save(); toast("You're set. Tap the mic after your next job."); go("home"); break;
      case "pricesskip": S().setupDone = true; save(); go("home"); break;
      case "pricesok2": S().pricesConfirmed = true; save(); toast("Prices saved"); go("settings"); break;
      case "theme": S().theme = el.dataset.v; save(); applyTheme(); render(); break;
      case "backup": backup(); break;
      case "wipe": {
        if (el.dataset.armed) { DB = defaults(); save(); try { localStorage.removeItem(KEY); } catch (x) { } toast("Everything erased"); go("welcome"); }
        else { el.dataset.armed = "1"; el.textContent = "Tap again: erase all jobs, customers and settings"; }
        break;
      }
    }
  });
  document.addEventListener("input", e => {
    const el = e.target;
    if (el.dataset.set) { const k = el.dataset.set; S()[k] = ["dueDays", "quoteDays", "taxRate"].includes(k) ? (el.value === "" ? 0 : +el.value) : el.value; save(); return; }
    if (el.dataset.svc != null) {
      const s = S().services[+el.dataset.svc], k = el.dataset.k;
      if (k === "price" || k === "big") s[k] = el.value.trim() === "" ? (k === "big" ? 0 : 0) : centsIn(el.value);
      else if (k === "words") s.words = el.value.split(",").map(w => w.trim().toLowerCase()).filter(Boolean);
      else s[k] = el.value;
      save(); return;
    }
    if (el.id === "jobsearch") { jobSearch = el.value; refreshJobs(); return; }
    if (el.id === "rectext") { recText = el.value; return; }
    if (!draft) return;
    if (el.dataset.d) {
      const p = el.dataset.d, d = draft.doc;
      if (p.startsWith("customer.")) { d.customer[p.split(".")[1]] = el.value; if (p === "customer.name") { const n = $("#nameerr"); if (n) n.textContent = ""; } }
      else if (el.dataset.money != null) d[p] = centsIn(el.value);
      else if (p === "taxRate") d.taxRate = Math.max(0, parseFloat(el.value) || 0);
      else d[p] = el.value;
      refreshTotals(); return;
    }
    if (el.dataset.line != null) {
      const x = draft.doc.items[+el.dataset.line], k = el.dataset.k;
      if (k === "price") { x.price = centsIn(el.value); x.custom = true; }
      else if (k === "qty") x.qty = el.value === "" ? 0 : Math.max(0, parseFloat(el.value) || 0);
      else x.desc = el.value;
      refreshTotals();
    }
  });
  document.addEventListener("change", e => {
    const el = e.target;
    if (el.id === "addsel" && el.value !== "") {
      const d = draft.doc;
      if (el.value === "custom") d.items.push({ desc: "", qty: 1, price: 0, serviceId: "", custom: true });
      else { const s = S().services[+el.value]; d.items.push({ desc: s.name + (d.big && s.big ? " (SUV / truck)" : ""), qty: 1, price: d.big && s.big ? s.big : s.price, serviceId: s.id, custom: false }); }
      el.value = ""; $("#lines").innerHTML = linesHtml(); refreshTotals();
      const last = document.querySelectorAll('[data-k="desc"]'); const f = last[last.length - 1]; if (f && !f.value) f.focus();
    }
    if (el.id === "fullchk") { sendCtx.full = el.checked; renderSendSheet(); }
    if (el.id === "restore" && el.files && el.files[0]) restore(el.files[0]);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && sheetOpen()) closeSheet();
    if (e.key === "Enter" && e.target.id === "rectext" && !e.shiftKey && (e.metaKey || e.ctrlKey)) { e.preventDefault(); document.querySelector('[data-act="makedraft"]').click(); }
  });

  function rerenderDraft() { const y = window.scrollY; $("#app").innerHTML = viewDraft(); window.scrollTo(0, y); }
  function refreshJobs() { const el = $("#joblist"); if (!el) return; const sc = window.scrollY; const tmp = document.createElement("div"); tmp.innerHTML = viewJobs(); el.innerHTML = tmp.querySelector("#joblist").innerHTML; window.scrollTo(0, sc); }

  async function viaSend(ch) {
    const d = findDoc(sendCtx.id); const body = $("#msgtext").value;
    const subject = (d.type === "quote" ? "Quote " : "Invoice ") + d.number + (S().bizName ? " from " + S().bizName : "");
    if (ch === "text") { window.location.href = GP.smsLink(d.customer.phone, body); confirmSent("text"); }
    else if (ch === "email") { window.location.href = GP.mailLink(d.customer.email, subject, body); confirmSent("email"); }
    else if (ch === "share") { try { await navigator.share({ title: subject, text: body }); confirmSent("share"); } catch (x) { if (x && x.name !== "AbortError") confirmSent("share"); } }
    else if (ch === "copy") { const ok = await copyText(body); if (ok) confirmSent("copy"); else toast("Couldn't copy. Select the text and copy it yourself."); }
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      const ta = $("#msgtext"); if (!ta) return false; ta.focus(); ta.select(); try { return document.execCommand("copy"); } catch (x) { return false; }
    }
  }
  function savePay(id) {
    const d = findDoc(id); const amt = centsIn($("#payamt").value); const T = GP.totals(d);
    if (amt <= 0) { $("#payerr").textContent = "Type the amount you received."; return; }
    const method = ($("#paymeth .chip.on") || {}).dataset ? $("#paymeth .chip.on").dataset.v : "";
    d.payments = d.payments || []; d.payments.push({ amount: amt, method, date: $("#paydate").value || today() });
    if (!d.sentAt) d.sentAt = new Date().toISOString();
    save(); closeSheet();
    const after = GP.totals(d);
    toast(after.balance === 0 ? "Paid in full" + (amt > T.balance ? " (" + M(after.over) + " extra)" : "") : M(after.balance) + " still owed");
    render();
  }
  function toInvoice(id) {
    const q = findDoc(id); const s = S();
    DB.seq.invoice = (DB.seq.invoice || 0) + 1;
    const now = new Date().toISOString();
    const inv = JSON.parse(JSON.stringify(q));
    Object.assign(inv, { id: newId(), type: "invoice", number: "INV-" + String(DB.seq.invoice).padStart(4, "0"), date: today(), dueDate: GP.addDays(today(), +s.dueDays || 0), validUntil: "", sentAt: "", approvedAt: "", declinedAt: "", invoiceId: "", fromQuote: q.id, payments: [], followups: [], paidBefore: 0, note: s.note || q.note, createdAt: now, history: [{ at: now, t: "Made from quote " + q.number }] });
    q.invoiceId = inv.id; q.history.push({ at: now, t: "Turned into invoice " + inv.number });
    DB.docs.unshift(inv); save(); toast("Invoice " + inv.number + " ready. Check it, then send."); go("doc/" + inv.id);
  }
  function dupe(id) {
    const o = findDoc(id); const c = JSON.parse(JSON.stringify(o)); const s = S();
    c.date = today(); c.sentAt = ""; c.approvedAt = ""; c.declinedAt = ""; c.invoiceId = ""; c.payments = []; c.followups = []; c.paidBefore = 0; c.history = [];
    c.dueDate = c.type === "invoice" ? GP.addDays(today(), +s.dueDays || 0) : ""; c.validUntil = c.type === "quote" ? GP.addDays(today(), +s.quoteDays || 30) : "";
    c.transcript = ""; draft = { doc: c, heard: [], checks: ["Copied from " + o.number + ". Check the customer and prices."], transcript: "", isNew: true };
    go("draft");
  }
  function backup() {
    const blob = new Blob([JSON.stringify(DB, null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "getpaid-backup-" + today() + ".json"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("Backup downloaded");
  }
  function restore(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || !Array.isArray(d.docs) || !d.settings) throw new Error("bad");
        const def = defaults(); d.settings = Object.assign(def.settings, d.settings); d.seq = Object.assign(def.seq, d.seq || {});
        DB = d; save(); applyTheme(); toast("Restored " + d.docs.length + " jobs"); go("home");
      } catch (e) { toast("That file isn't a GetPaid backup."); }
    };
    r.readAsText(file);
  }

  // offline + install
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost") && !/[?&]nosw\b/.test(location.search)) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => { }));
  }
  window.GetPaidApp = { get db() { return DB; }, reload() { DB = load(); render(); } }; // for tests
  render();
})();
