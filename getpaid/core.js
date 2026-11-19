// GetPaid core: reads a job description, works out totals, statuses and follow-up messages.
// No network, no AI: plain rules. Works in the browser (window.GP) and in Node (require) for tests.
(function (root) {
  "use strict";

  // ---------- trades (only mobile detailing for now) ----------
  // Prices are EXAMPLES so a first draft is not empty. The app asks the user to set their own.
  const TRADES = {
    detailing: {
      name: "Mobile detailing",
      services: [
        { id: "full", name: "Full detail (inside + out)", price: 18000, big: 22000, pkg: true, words: ["full detail", "complete detail", "inside and out", "inside and outside", "interior and exterior", "exterior and interior", "full package", "full"] },
        { id: "interior", name: "Interior detail", price: 12000, big: 15000, pkg: true, words: ["interior detail", "interior", "inside detail", "inside only"] },
        { id: "exterior", name: "Exterior wash + wax", price: 8000, big: 10000, pkg: true, words: ["exterior detail", "wash and wax", "exterior", "outside only", "wax"] },
        { id: "wash", name: "Basic wash", price: 4000, big: 5000, pkg: true, words: ["basic wash", "quick wash", "hand wash", "car wash", "wash"] },
        { id: "pet", name: "Pet hair removal", price: 4000, words: ["pet hair", "dog hair", "cat hair", "animal hair"] },
        { id: "headlight", name: "Headlight restoration", price: 6000, words: ["headlight restoration", "headlights", "headlight", "head lights", "head light"] },
        { id: "engine", name: "Engine bay cleaning", price: 4000, words: ["engine bay", "engine"] },
        { id: "odor", name: "Odor removal", price: 5000, words: ["odor removal", "odor", "odour", "smoke smell", "smell", "ozone"] },
        { id: "clay", name: "Clay bar + sealant", price: 7000, big: 9000, words: ["clay bar", "clay", "sealant"] },
        { id: "shampoo", name: "Seat shampoo / stain removal", price: 5000, words: ["seat shampoo", "carpet shampoo", "shampoo", "stain removal", "stains", "stain"] },
        { id: "ceramic", name: "Ceramic coating", price: 50000, big: 65000, words: ["ceramic coating", "ceramic"] },
        { id: "paint", name: "Paint correction", price: 30000, big: 40000, words: ["paint correction", "swirl removal", "swirls", "polish", "buff"] },
        { id: "travel", name: "Travel fee", price: 2000, words: ["travel fee", "trip fee", "travel", "mileage"] }
      ]
    }
  };

  const BIG_WORDS = ["suv", "truck", "pickup", "van", "minivan", "crossover", "third row", "3 row", "three row", "jeep",
    "pilot", "tahoe", "suburban", "yukon", "escalade", "explorer", "expedition", "highlander", "4runner", "rav4", "rav 4", "cr-v", "crv",
    "cx-5", "cx-9", "rogue", "pathfinder", "equinox", "traverse", "durango", "wrangler", "cherokee", "telluride", "palisade", "sorento",
    "santa fe", "odyssey", "sienna", "pacifica", "f-150", "f150", "f 150", "f-250", "f250", "silverado", "sierra", "ram", "tacoma", "tundra",
    "ranger", "frontier", "model x", "model y", "bronco", "4 runner", "acadia", "enclave", "atlas", "tiguan", "outback", "forester", "ascent", "x5", "q7", "gx", "rx"];
  const SMALL_WORDS = ["sedan", "coupe", "hatchback", "compact", "civic", "corolla", "camry", "accord", "altima", "model 3", "mustang", "elantra", "sentra", "jetta", "prius", "malibu", "fusion"];
  const MAKES = ["acura", "audi", "bmw", "buick", "cadillac", "chevy", "chevrolet", "chrysler", "dodge", "ford", "gmc", "genesis", "honda", "hyundai", "infiniti", "jeep", "kia", "lexus", "lincoln", "mazda", "mercedes", "mini", "mitsubishi", "nissan", "porsche", "ram", "rivian", "subaru", "tesla", "toyota", "volkswagen", "vw", "volvo"];
  const UPPER = { bmw: "BMW", gmc: "GMC", vw: "VW", rav4: "RAV4", "cr-v": "CR-V", crv: "CR-V", "cx-5": "CX-5", "cx-9": "CX-9", "f-150": "F-150", f150: "F-150", "f-250": "F-250", x5: "X5", q7: "Q7", gx: "GX", rx: "RX", suv: "SUV", "4runner": "4Runner" };

  const NUMW = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  const STOP = new Set(["the", "a", "an", "his", "her", "their", "my", "our", "your", "this", "that", "it", "him", "them", "me", "us", "today", "tomorrow", "yesterday", "tonight", "now", "just", "and", "also", "plus", "with", "on", "at", "in", "of", "to", "by", "from", "both", "car", "cars", "truck", "suv", "van", "job", "work", "free", "extra", "same", "everything", "all", "some", "her", "she", "he", "they", "we", "i", "you", "was", "is", "be", "been", "paid", "deposit", "cash", "due", "invoice", "quote", "estimate", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "next", "week", "days", "day", "inside", "outside", "dollars", "bucks", "total", "about", "around", "only", "new", "old", "customer", "client"]);
  const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

  // ---------- small helpers ----------
  const pad = n => String(n).padStart(2, "0");
  function isoOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function todayISO() { return isoOf(new Date()); }
  function dateOf(iso) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
  function addDays(iso, n) { const d = dateOf(iso); d.setDate(d.getDate() + n); return isoOf(d); }
  function daysBetween(a, b) { return Math.round((dateOf(b) - dateOf(a)) / 86400000); } // b - a
  function fmtDate(iso, withDay) {
    if (!iso) return "";
    const d = dateOf(iso);
    return d.toLocaleDateString("en-US", withDay ? { weekday: "short", month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
  }
  function money(cents) {
    const neg = cents < 0; const c = Math.abs(Math.round(cents || 0));
    const s = "$" + Math.floor(c / 100).toLocaleString("en-US") + "." + pad(c % 100);
    return neg ? "-" + s : s;
  }
  function toCents(v) { // "40", "40.5", "$1,200.00" -> cents
    if (typeof v === "number") return Math.round(v * 100);
    const n = parseFloat(String(v || "").replace(/[$,\s]/g, ""));
    return isFinite(n) ? Math.round(n * 100) : 0;
  }
  function titleCase(s) {
    return s.split(/\s+/).filter(Boolean).map(w => UPPER[w.toLowerCase()] || (w[0].toUpperCase() + w.slice(1).toLowerCase())).join(" ");
  }
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // "two hundred fifty dollars" -> "250 dollars", "forty bucks" -> "40 bucks"
  function spokenMoney(t) {
    const w = "(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|and|-)";
    const re = new RegExp("\\b((?:" + w + "\\s*)+)(dollars?|bucks)\\b", "gi");
    return t.replace(re, (m, words, unit) => {
      let total = 0, cur = 0, any = false;
      for (const raw of words.toLowerCase().split(/[\s-]+/)) {
        if (!raw || raw === "and") continue;
        if (raw in NUMW) { cur += NUMW[raw]; any = true; }
        else if (raw === "hundred") { cur = (cur || 1) * 100; any = true; }
        else if (raw === "thousand") { total += (cur || 1) * 1000; cur = 0; any = true; }
      }
      return any ? (total + cur) + " " + unit : m;
    });
  }

  // ---------- the reader ----------
  // Turns words like "Finished a full detail for Mike Johnson, 2019 Honda Pilot, pet hair too, he paid 50, due Friday"
  // into a draft. Everything it guesses is listed in `heard` so the user can check it.
  function parseJob(text, opts) {
    opts = opts || {};
    const services = opts.services || TRADES.detailing.services;
    const today = opts.today || todayISO();
    const out = { type: "invoice", customer: { name: "", phone: "", email: "" }, vehicle: "", big: false, items: [], paidSoFar: 0, paidFull: false, discount: 0, saidTotal: 0, dueDate: "", heard: [], checks: [] };
    if (!text || !text.trim()) { out.checks.push("Say or type a few words about the job first."); return out; }

    let t = " " + spokenMoney(text.replace(/[‘’]/g, "'").replace(/\s+/g, " ")) + " ";
    let low = t.toLowerCase();
    // spans already used (phone, email, year...) are blanked so their digits are not read as prices
    const blank = (start, end) => { t = t.slice(0, start) + " ".repeat(end - start) + t.slice(end); low = t.toLowerCase(); };

    // type
    const quoteWord = /\b(quote|quoted|estimate|estimated|bid|how much (?:would|will|for)|would cost|wants a price|price it)\b/.test(low);
    const invoiceWord = /\b(invoice|bill him|bill her|bill them|bill|billed)\b/.test(low);
    if (quoteWord && !invoiceWord) { out.type = "quote"; out.heard.push("Quote, because you said \"" + low.match(/\b(quote|quoted|estimate|estimated|bid|how much (?:would|will|for)|would cost|wants a price|price it)\b/)[1] + "\""); }

    // email (spoken "mike at gmail dot com" too)
    let em = low.replace(/\s+at\s+([a-z0-9-]+)\s+dot\s+(com|net|org|edu|us|co|io)\b/g, "@$1.$2").replace(/\s+dot\s+(com|net|org|edu|us|co|io)\b/g, ".$1");
    const emM = em.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
    if (emM) {
      out.customer.email = emM[0];
      // blank the spoken or written form in t
      const spoken = low.match(/[a-z0-9._%+-]+(?:\s+at\s+|@)[a-z0-9-]+(?:\s+dot\s+|\.)[a-z]{2,}/);
      if (spoken) blank(spoken.index, spoken.index + spoken[0].length);
    }

    // phone
    const ph = t.match(/(?:\+?1[\s.-]?)?\(?\b(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/);
    if (ph) { out.customer.phone = "(" + ph[1] + ") " + ph[2] + "-" + ph[3]; blank(ph.index, ph.index + ph[0].length); }

    // due date
    const dueRe = /\b(?:due|pay(?:s|ing)? (?:me )?by|payment by|paid by|needs to pay by|pay on)\s+(?:on\s+)?(?:the\s+)?(today|tomorrow|now|on receipt|upon receipt|end of (?:the )?week|next week|(?:this |next )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|in\s+(\d+|one|two|three|four|five|six|seven|ten|fourteen|thirty)\s+(days?|weeks?)|(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?|(\d{1,2})(?:st|nd|rd|th))\b/;
    const dm = low.match(dueRe);
    if (dm) {
      const what = dm[1]; let iso = "";
      if (what === "today" || what === "now" || /receipt/.test(what)) iso = today;
      else if (what === "tomorrow") iso = addDays(today, 1);
      else if (what === "next week") iso = addDays(today, 7);
      else if (/end of/.test(what)) { const wd = dateOf(today).getDay(); iso = addDays(today, (5 - wd + 7) % 7 || 7); }
      else if (dm[2]) { const n = /\d/.test(dm[2]) ? +dm[2] : NUMW[dm[2]]; iso = addDays(today, n * (/week/.test(dm[3]) ? 7 : 1)); }
      else if (dm[4]) { const y = dateOf(today).getFullYear(); let d = new Date(y, MONTHS.indexOf(dm[4]), +dm[5]); if (isoOf(d) < today) d = new Date(y + 1, MONTHS.indexOf(dm[4]), +dm[5]); iso = isoOf(d); }
      else if (dm[6]) { const td = dateOf(today); let d = new Date(td.getFullYear(), td.getMonth(), +dm[6]); if (isoOf(d) < today) d = new Date(td.getFullYear(), td.getMonth() + 1, +dm[6]); iso = isoOf(d); }
      else { const wd = WEEKDAYS.findIndex(w => what.includes(w)); const cur = dateOf(today).getDay(); let add = (wd - cur + 7) % 7 || 7; if (/^next /.test(what) && add < 7) add += 7; iso = addDays(today, add); }
      if (iso) { out.dueDate = iso; out.heard.push("Due " + fmtDate(iso, true) + " (you said \"" + dm[0].trim() + "\")"); }
      blank(dm.index, dm.index + dm[0].length);
    }

    // vehicle
    const yearM = t.match(/\b(19[5-9]\d|20[0-4]\d)\s+([A-Za-z][A-Za-z0-9-]*)(?:\s+([A-Za-z0-9][A-Za-z0-9-]*))?(?:\s+([A-Za-z0-9][A-Za-z0-9-]*))?/);
    const isServiceWord = w => services.some(s => s.words.some(x => x.split(" ")[0] === w.toLowerCase()));
    if (yearM) {
      const parts = [yearM[2], yearM[3], yearM[4]].filter(Boolean);
      const keep = [];
      for (const p of parts) { const pl = p.toLowerCase(); if (STOP.has(pl) && !MAKES.includes(pl) && pl !== "suv" && pl !== "truck" && pl !== "van") break; if (isServiceWord(p) || /^(for|with|and|that|who|he|she|they)$/i.test(p)) break; keep.push(p); if (keep.length && !MAKES.includes(keep[0].toLowerCase())) break; if (keep.length === 2 && !/^\d/.test(parts[2] || "x") && !BIG_WORDS.includes((parts[2] || "").toLowerCase())) break; }
      if (keep.length) { out.vehicle = yearM[1] + " " + titleCase(keep.join(" ")); blank(yearM.index, yearM.index + yearM[1].length); }
    }
    if (!out.vehicle) {
      const mk = low.match(new RegExp("\\b(" + MAKES.join("|") + ")\\b(?:\\s+([a-z0-9][a-z0-9-]*))?"));
      if (mk) { const next = mk[2] && !STOP.has(mk[2]) && !isServiceWord(mk[2]) ? " " + mk[2] : ""; out.vehicle = titleCase(mk[1] + next); }
    }
    // size
    const sizeHit = BIG_WORDS.find(w => new RegExp("\\b" + escRe(w) + "\\b").test(low));
    const smallHit = SMALL_WORDS.find(w => new RegExp("\\b" + escRe(w) + "\\b").test(low));
    if (sizeHit && !smallHit) { out.big = true; out.heard.push("Priced as SUV / truck because you said \"" + sizeHit + "\""); }
    if (!out.vehicle && sizeHit) out.vehicle = titleCase(sizeHit);
    if (out.vehicle) out.heard.push("Vehicle: " + out.vehicle);

    // customer name
    const nameOk = w => w && /^[a-z][a-z'-]{1,}$/i.test(w) && !STOP.has(w.toLowerCase()) && !MAKES.includes(w.toLowerCase()) && !isServiceWord(w) && !BIG_WORDS.includes(w.toLowerCase()) && !SMALL_WORDS.includes(w.toLowerCase());
    let name = "";
    const strip = w => (w || "").replace(/'s$/i, "");
    let m1 = t.match(/\b(?:customer|client|name is|named|customer's name is|his name is|her name is|it's for)\s+(?:is\s+)?(?:mr\.?\s+|mrs\.?\s+|ms\.?\s+|miss\s+)?([A-Za-z][A-Za-z'-]+)(?:\s+([A-Za-z][A-Za-z'-]+))?/i);
    if (m1 && nameOk(strip(m1[1]))) name = strip(m1[1]) + (nameOk(strip(m1[2])) && !/'s$/i.test(m1[1]) ? " " + strip(m1[2]) : "");
    if (!name) { const mt = t.match(/\b(Mr|Mrs|Ms|Miss|Dr)\.?\s+([A-Z][a-z'-]+)/); if (mt && nameOk(strip(mt[2]))) name = mt[1] + (mt[1] === "Miss" ? " " : ". ") + strip(mt[2]); }
    if (!name) { const mf = t.match(/\b(?:for|on) the ([A-Z][a-z]+s)\b/); if (mf && !MAKES.includes(mf[1].toLowerCase())) name = "The " + mf[1]; }
    if (!name) { // "Mike Johnson's" (capitalized) or "Mike's"
      const re = /\b([A-Z][a-z'-]+)(?:\s+([A-Z][a-z'-]+))?'s\b/g; let m;
      while ((m = re.exec(t))) {
        const a = m[1], b = m[2];
        if (b && nameOk(a) && nameOk(b)) { name = a + " " + b; break; }
        const single = b || a; if (nameOk(single) && !/^(it|that|what|there|here|today|he|she|let)$/i.test(single)) { name = (b && nameOk(a) ? a + " " : "") + single; break; }
      }
    }
    if (!name) { // "for Mike Johnson", "for mrs. lee"
      const re = /\bfor\s+(?:mr\.?\s+|mrs\.?\s+|ms\.?\s+|miss\s+)?([A-Za-z][A-Za-z'-]+)(?:\s+([A-Za-z][A-Za-z'-]+))?/gi; let m;
      while ((m = re.exec(t))) {
        const a = strip(m[1]);
        if (nameOk(a)) { name = a + (!/'s$/i.test(m[1]) && nameOk(strip(m[2])) ? " " + strip(m[2]) : ""); break; }
      }
    }
    if (name) { out.customer.name = titleCase(name); out.heard.push("Customer: " + out.customer.name); }

    // quantity of vehicles
    let qty = 1;
    const qm = low.match(/\b(\d|two|three|four|five|six|both)\s+(?:of (?:their|his|her|the) )?(cars|vehicles|trucks|suvs|vans)\b/) || low.match(/\bboth (cars|vehicles|trucks)\b/);
    if (qm) { qty = qm[1] === "both" || qm[1] === "cars" || qm[1] === "vehicles" || qm[1] === "trucks" ? 2 : (/\d/.test(qm[1]) ? +qm[1] : NUMW[qm[1]]); blank(qm.index, qm.index + qm[0].length); if (qty > 1) out.heard.push(qty + " vehicles: package lines set to " + qty); }

    // services: longest words first, no overlaps
    const spans = [];
    const all = [];
    services.forEach(s => (s.words || []).forEach(w => all.push({ s, w: w.toLowerCase() })));
    all.sort((a, b) => b.w.length - a.w.length);
    for (const { s, w } of all) {
      if (!w) continue;
      const re = new RegExp("\\b" + escRe(w) + "\\b", "g"); let m;
      while ((m = re.exec(low))) {
        const a = m.index, b = a + w.length;
        if (spans.some(x => a < x.b && b > x.a)) continue;
        // "full" alone only counts next to detail words ("the full", "full one")
        if (w === "full" && !/\bfull\s+(detail|one|job|thing|package|service|works|clean|treatment)?\b/.test(low.slice(a, a + 25))) continue;
        if (w === "full" && /\bpaid in full|in full\b/.test(low.slice(Math.max(0, a - 8), b))) continue;
        spans.push({ a, b, s, w });
      }
    }
    spans.sort((x, y) => x.a - y.a);

    // amounts
    const amounts = [];
    const amtRe = /(\$\s?(\d{1,3}(?:,\d{3})+|\d{1,6})(?:\.(\d{1,2}))?)|\b(\d{1,3}(?:,\d{3})+|\d{1,6})(?:\.(\d{1,2}))?\s*(?:dollars?|bucks|usd)\b|\b(\d{1,3}(?:,\d{3})+|\d{1,6})(?:\.(\d{1,2}))?\b(?!\s*(?:%|percent|cars?|vehicles?|days?|weeks?|hours?|hrs?|minutes?|mins?|st|nd|rd|th|am|pm|a\.m|p\.m|o'clock|miles?|years?|seats?|rows?|doors?|dogs?|cats?|times?|x)\b)/gi;
    let am;
    while ((am = amtRe.exec(t))) {
      const whole = am[2] || am[4] || am[6], cents = am[3] || am[5] || am[7] || "";
      const isBare = !am[1] && !/dollar|buck|usd/i.test(am[0]);
      if (isBare) {
        const before = low.slice(Math.max(0, am.index - 22), am.index);
        const after = low.slice(am.index + am[0].length, am.index + am[0].length + 6);
        if (!/(charge|charged|charging|price|priced|cost|costs|is|was|for|paid|pay|gave|deposit|of|plus|extra|add|added|total|to|at|it's|its|be|me|another|did|only|off|discount|tip|tipped|about|around|minus|knocked|took|down)\s*$/.test(before) && !/^\s*(for|on|off|deposit|down)\b/.test(after) && !(/(^|[,;:]\s*)$/.test(before) && /^\s*([,.;!?]|$)/.test(after) && +whole.replace(/,/g, "") >= 5 && !/^(19[5-9]\d|20[0-4]\d)$/.test(whole))) continue;
        if (+whole.replace(/,/g, "") > 50000) continue;
      }
      amounts.push({ a: am.index, b: am.index + am[0].length, cents: Math.round(parseFloat(whole.replace(/,/g, "") + "." + (cents || "0")) * 100) });
    }
    const pctM = [...low.matchAll(/\b(\d{1,2})\s*(?:%|percent)\s*(?:off|discount)?/g)];

    // clauses: split on punctuation and joining words, then read each part
    const cuts = [0];
    const cutRe = /[,;.!?]|\s(?:and|also|plus|then|but|with)\s/g; let cm;
    while ((cm = cutRe.exec(low))) {
      const pos = cm.index;
      if (spans.some(x => pos > x.a && pos < x.b)) continue; // inside "inside and out"
      if (/[.,]/.test(cm[0]) && /\d/.test(low[pos - 1] || "") && /\d/.test(low[pos + 1] || "")) continue; // 1,200 or 40.50
      cuts.push(pos);
    }
    cuts.push(low.length);
    const clauses = [];
    for (let i = 0; i < cuts.length - 1; i++) clauses.push({ a: cuts[i], b: cuts[i + 1] });
    const inC = (c, x) => x.a >= c.a && x.a < c.b;
    const lines = new Map(); // service id -> line
    const addLine = (s, price, why) => {
      if (lines.has(s.id)) { if (price != null) { lines.get(s.id).price = price; lines.get(s.id).custom = true; lines.get(s.id).why = why; } return; }
      const base = out.big && s.big ? s.big : s.price;
      lines.set(s.id, { desc: s.name + (out.big && s.big ? " (SUV / truck)" : ""), qty: s.pkg ? qty : 1, price: price != null ? price : base, serviceId: s.id, custom: price != null, why: why || "from your price list" });
    };
    const customs = [];
    let prevSpans = [];
    for (const c of clauses) {
      const txt = low.slice(c.a, c.b);
      const ss = spans.filter(x => inC(c, x));
      const aa = amounts.filter(x => inC(c, x));
      const isPaid = /\b(paid|gave me|deposit|upfront|up front|put down|sent me|venmoed|zelled|cash apped|already)\b/.test(txt) && !/\b(needs? to pay|will pay|has to pay|going to pay|gonna pay|pay by|wants a deposit|ask for a deposit)\b/.test(txt);
      const isOff = /\b(off|discount|knocked|knock|minus|less|took)\b/.test(txt) && !/\bdrop(ped)? off\b/.test(txt);
      const isTotal = /\b(total|totals|altogether|all together|all in|came to|comes to|in all)\b/.test(txt);
      const isTip = /\btip(ped)?\b/.test(txt);
      if (/\b(paid in full|paid it all|paid everything|paid the whole|paid already in full)\b/.test(txt)) { out.paidFull = true; out.heard.push("Paid in full (you said so)"); }
      if (!aa.length) { ss.forEach(x => addLine(x.s)); if (ss.length) prevSpans = ss; else if (txt.trim().length > 25) prevSpans = []; continue; }
      if (isTip) { out.heard.push("Tip of " + money(aa[0].cents) + " left off the invoice (tips are not owed)"); ss.forEach(x => addLine(x.s)); continue; }
      if (isPaid) { const v = aa.reduce((n, x) => n + x.cents, 0); out.paidSoFar += v; out.heard.push("Already paid " + money(v)); ss.forEach(x => addLine(x.s)); continue; }
      if (isOff) { out.discount += aa[0].cents; out.heard.push("Discount " + money(aa[0].cents)); ss.forEach(x => addLine(x.s)); continue; }
      if (isTotal && !ss.length) { out.saidTotal = aa[aa.length - 1].cents; out.heard.push("You said the total is " + money(out.saidTotal)); continue; }
      if (ss.length) {
        prevSpans = [];
        ss.forEach((x, i) => addLine(x.s, i === ss.length - 1 || ss.length === 1 ? aa[0].cents : null, "you said " + money(aa[0].cents)));
        if (ss.length > 1) out.checks.push("One price (" + money(aa[0].cents) + ") was said for " + ss.map(x => x.s.name).join(" + ") + ". It was put on " + ss[ss.length - 1].s.name + ".");
        continue;
      }
      // a price with no known service: make a custom line from the words
      let d = txt.replace(/\$\s?[\d,.]+|\b[\d,.]+\s*(dollars?|bucks|usd)?\b/g, " ").replace(/\b(charge|charged|charging|i|we|he|she|they|it|it's|was|is|for|the|a|an|his|her|their|extra|add|added|another|also|plus|did|and|me|price|cost|costs|of|to|at|be|about|around|that|this|so|just|then|with|then|um|uh|like|did)\b/g, " ").replace(/\s+/g, " ").trim();
      if (/^[^a-z]*$/.test(d)) d = "";
      if (d.length > 40) d = d.slice(0, 40).trim();
      if (!d && prevSpans.length) { // "interior detail for dave, 120 bucks": the price belongs to the service just before
        const x = prevSpans[prevSpans.length - 1]; addLine(x.s, aa[0].cents, "you said " + money(aa[0].cents)); prevSpans = []; continue;
      }
      customs.push({ desc: d ? d[0].toUpperCase() + d.slice(1) : "Other work (add a description)", qty: 1, price: aa[0].cents, serviceId: "", custom: true, why: "you said " + money(aa[0].cents) });
      if (!d) out.checks.push("You said " + money(aa[0].cents) + " but not what it was for. Add a description.");
    }
    if (pctM.length && !out.discount) { const p = +pctM[0][1]; out.discountPct = p; out.heard.push(p + "% discount"); }

    out.items = [...lines.values(), ...customs];
    if (out.saidTotal && out.items.length === 1 && !out.items[0].custom) { // "basic wash, 250 total"
      const it = out.items[0]; it.price = Math.round((out.saidTotal + out.discount) / (it.qty || 1)); it.custom = true; it.why = "from the total you said";
    }
    // when both interior and exterior were named separately, they stay separate (the user can merge)
    const sub = out.items.reduce((n, x) => n + x.qty * x.price, 0);
    if (out.discountPct) out.discount = Math.round(sub * out.discountPct / 100);
    if (out.paidFull) out.paidSoFar = Math.max(out.paidSoFar, sub - out.discount);

    // checks
    if (!out.items.length) out.checks.push("No services heard. Add at least one line.");
    if (!out.customer.name) out.checks.push("Add the customer's name.");
    if (!out.customer.phone && !out.customer.email) out.checks.push("Add a phone number or email so you can send it.");
    if (out.saidTotal && out.saidTotal !== sub - out.discount) out.checks.push("You said the total is " + money(out.saidTotal) + " but the lines add up to " + money(sub - out.discount) + ". Check the prices.");
    out.items.forEach(x => { if (!x.price) out.checks.push("Set a price for " + x.desc + "."); });
    return out;
  }

  // ---------- totals and status ----------
  function totals(doc) {
    const sub = (doc.items || []).reduce((n, x) => n + Math.round((+x.qty || 0) * (x.price || 0)), 0);
    const disc = Math.min(doc.discount || 0, sub);
    const tax = Math.round((sub - disc) * (+doc.taxRate || 0) / 100);
    const total = sub - disc + tax;
    const paid = (doc.paidBefore || 0) + (doc.payments || []).reduce((n, p) => n + (p.amount || 0), 0);
    return { sub, disc, tax, total, paid, balance: Math.max(0, total - paid), over: Math.max(0, paid - total) };
  }

  const LABELS = { draft: "Draft", sent: "Sent", waiting: "Waiting", approved: "Approved", declined: "Declined", expired: "Expired", invoiced: "Invoiced", partly: "Part paid", overdue: "Overdue", paid: "Paid" };
  function status(doc, today) {
    today = today || todayISO();
    const T = totals(doc);
    if (doc.type === "quote") {
      if (doc.invoiceId) return "invoiced";
      if (doc.approvedAt) return "approved";
      if (doc.declinedAt) return "declined";
      if (!doc.sentAt) return "draft";
      if (doc.validUntil && today > doc.validUntil) return "expired";
      return "waiting";
    }
    if (T.total > 0 && T.balance === 0 && (doc.sentAt || T.paid > 0)) return "paid";
    if (!doc.sentAt) return "draft";
    if (doc.dueDate && today > doc.dueDate) return "overdue";
    if (T.paid > 0) return "partly";
    return "sent";
  }

  // ---------- follow-ups ----------
  // Polite steps. The app only drafts them; the user reviews and sends each one.
  const STEPS = {
    invoice: [
      { id: "due", from: "due", days: 0, label: "Friendly reminder (due day)" },
      { id: "late3", from: "due", days: 3, label: "Check-in (3 days late)" },
      { id: "late7", from: "due", days: 7, label: "Follow-up (1 week late)" },
      { id: "late14", from: "due", days: 14, label: "Last polite note (2 weeks late)" }
    ],
    quote: [
      { id: "q2", from: "sent", days: 2, label: "Did you get my quote? (2 days)" },
      { id: "q7", from: "sent", days: 7, label: "Last check-in on the quote (1 week)" }
    ]
  };
  function stepDate(doc, step) {
    const base = step.from === "due" ? doc.dueDate : (doc.sentAt || "").slice(0, 10);
    return base ? addDays(base, step.days) : "";
  }
  function followPlan(doc, today) {
    today = today || todayISO();
    const st = status(doc, today);
    const done = doc.followups || [];
    const isDone = id => done.some(f => f.step === id);
    let steps = [];
    if (doc.type === "invoice" && (st === "sent" || st === "partly" || st === "overdue")) {
      steps = STEPS.invoice.filter(s => !(s.id === "due" && doc.sentAt && doc.sentAt.slice(0, 10) >= doc.dueDate));
    } else if (doc.type === "quote" && st === "waiting") steps = STEPS.quote;
    else if (doc.type === "invoice" && st === "paid" && !isDone("thanks") && !doc.noThanks) return { next: { id: "thanks", label: "Say thanks for paying", date: today }, due: true, all: [] };
    const all = steps.map(s => ({ ...s, date: stepDate(doc, s), done: isDone(s.id) }));
    // if several reminders are due (you were away), only the latest one is offered; older ones are "passed"
    let lastDone = -1; all.forEach((s, i) => { if (s.done) lastDone = i; });
    all.forEach((s, i) => { if (!s.done && i < lastDone) s.passed = true; });
    const open = all.filter((s, i) => i > lastDone);
    const dueNow = open.filter(s => s.date && today >= s.date);
    if (dueNow.length > 1) dueNow.slice(0, -1).forEach(s => { s.passed = true; });
    const next = dueNow.length ? dueNow[dueNow.length - 1] : (open[0] || null);
    return { next, due: !!(next && next.date && today >= next.date), all };
  }

  function firstName(n) { return (n || "").trim().split(/\s+/)[0] || "there"; }
  function payLine(set) {
    const how = (set.payHow || "").trim(), link = (set.payLink || "").trim();
    if (how && link) return "You can pay here: " + link + " or by " + how.replace(/^(you can )?pay (by|with)\s*/i, "") + ".";
    if (link) return "You can pay here: " + link;
    if (how) return "You can pay by " + how.replace(/^(you can )?pay (by|with)\s*/i, "").replace(/\.$/, "") + ".";
    return "Reply here and I'll send my payment details.";
  }
  function whatLine(doc) {
    const names = (doc.items || []).map(x => x.desc.replace(/\s*\([^)]*\)/g, "").toLowerCase()).slice(0, 3);
    const w = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : (names[0] || "the work");
    return w + (doc.vehicle ? " on your " + doc.vehicle : "");
  }

  // kind: "send" | step id | "thanks"; tone: "friendly" | "short"
  function message(doc, kind, set, tone, today) {
    set = set || {}; today = today || todayISO();
    const T = totals(doc), f = firstName(doc.customer && doc.customer.name), me = set.yourName ? set.yourName.split(" ")[0] : "", biz = set.bizName || "";
    const sign = "\n\n" + (me && biz ? me + ", " + biz : me || biz);
    const num = doc.number, pay = payLine(set), bal = money(T.balance), short = tone === "short";
    const late = doc.dueDate ? Math.max(0, daysBetween(doc.dueDate, today)) : 0;
    const dueTxt = doc.dueDate ? (doc.dueDate === today ? "today" : fmtDate(doc.dueDate, true)) : "";
    let m;
    if (kind === "send" && doc.type === "quote") {
      m = short ? `Hi ${f}, here's quote ${num}: ${money(T.total)} for ${whatLine(doc)}. Good until ${fmtDate(doc.validUntil, true)}. Reply yes to book it.`
        : `Hi ${f}, thanks for reaching out! Here's your quote ${num} for ${whatLine(doc)}: ${money(T.total)} total. It's good until ${fmtDate(doc.validUntil, true)}. Just reply yes and we'll pick a time, or ask me anything.`;
    } else if (kind === "send") {
      m = short ? `Hi ${f}, here's invoice ${num} for ${bal}, due ${dueTxt}. ${pay}`
        : `Hi ${f}, thanks for choosing ${biz || "me"}! Here's your invoice ${num} for ${whatLine(doc)}: ${bal}${T.paid ? " left to pay (you already paid " + money(T.paid) + ", thank you)" : ""}, due ${dueTxt}. ${pay}`;
    } else if (kind === "due") {
      const when = late > 0 ? "was due " + fmtDate(doc.dueDate, true) : "is due today";
      m = short ? `Hi ${f}, reminder: invoice ${num} (${bal}) ${when}. ${pay}`
        : `Hi ${f}, just a friendly reminder that invoice ${num} for ${bal} ${when}. ${pay} Thanks again!`;
    } else if (kind === "late3") {
      m = short ? `Hi ${f}, invoice ${num} (${bal}) was due ${fmtDate(doc.dueDate, true)}. If you've already paid, thank you! ${pay}`
        : `Hi ${f}, checking in on invoice ${num} for ${bal}, which was due ${fmtDate(doc.dueDate, true)}. If you've already sent it, thank you and please ignore this. ${pay}`;
    } else if (kind === "late7") {
      m = short ? `Hi ${f}, I still show ${bal} open on invoice ${num}. When can you send it? ${pay}`
        : `Hi ${f}, I haven't seen payment for invoice ${num} (${bal}) yet. Could you let me know when you can send it? If anything about the job wasn't right, tell me and I'll make it right. ${pay}`;
    } else if (kind === "late14") {
      m = short ? `Hi ${f}, invoice ${num} (${bal}) is now ${late} days past due. Please send it this week or reply so we can sort it out. ${pay}`
        : `Hi ${f}, invoice ${num} for ${bal} is now ${late} days past due. Please send payment this week, or reply and we can set up a plan that works for you, like paying in two parts. ${pay}`;
    } else if (kind === "q2") {
      m = short ? `Hi ${f}, did my quote ${num} (${money(T.total)}) come through? Happy to answer questions.`
        : `Hi ${f}, just checking that you got my quote ${num} for ${money(T.total)}. Happy to answer any questions or adjust it to fit what you need.`;
    } else if (kind === "q7") {
      m = short ? `Hi ${f}, last check-in on quote ${num}. It's good until ${fmtDate(doc.validUntil, true)}. No pressure either way.`
        : `Hi ${f}, last check-in on quote ${num} (${money(T.total)}). If now isn't the right time, no problem at all. The price is good until ${fmtDate(doc.validUntil, true)} if you'd like to book.`;
    } else if (kind === "thanks") {
      m = short ? `Thanks ${f}! Got your payment for invoice ${num}. Paid in full.`
        : `Thanks ${f}! I received your payment for invoice ${num}, so you're all paid up. I appreciate your business, and I'm here whenever ${doc.vehicle ? "your " + doc.vehicle : "your car"} needs another clean.`;
    } else m = "";
    return m + sign.replace(/\n\n$/, "");
  }

  // full itemized text (for email or "include the full invoice")
  function docText(doc, set) {
    set = set || {}; const T = totals(doc), L = [];
    const kind = doc.type === "quote" ? "QUOTE" : "INVOICE";
    if (set.bizName) L.push(set.bizName);
    const contact = [set.phone, set.email].filter(Boolean).join(" · "); if (contact) L.push(contact);
    L.push("", kind + " " + doc.number + " · " + fmtDate(doc.date));
    L.push("For: " + [doc.customer.name, doc.vehicle].filter(Boolean).join(" · "));
    L.push("");
    doc.items.forEach(x => L.push(x.desc + (x.qty != 1 ? " (" + x.qty + " × " + money(x.price) + ")" : "") + ": " + money(Math.round(x.qty * x.price))));
    L.push("");
    if (T.disc || T.tax) L.push("Subtotal: " + money(T.sub));
    if (T.disc) L.push("Discount: -" + money(T.disc));
    if (T.tax) L.push("Tax (" + doc.taxRate + "%): " + money(T.tax));
    L.push("Total: " + money(T.total));
    if (doc.type === "invoice") {
      if (T.paid) L.push("Paid: -" + money(T.paid));
      L.push("Balance due: " + money(T.balance) + (doc.dueDate ? " (due " + fmtDate(doc.dueDate, true) + ")" : ""));
      L.push("", payLine(set));
    } else if (doc.validUntil) L.push("Good until " + fmtDate(doc.validUntil, true));
    if (doc.note) L.push("", doc.note);
    return L.join("\n");
  }

  // sms link that works on iPhone and Android
  function smsLink(phone, body) { const n = (phone || "").replace(/[^\d+]/g, ""); return "sms:" + n + "?&body=" + encodeURIComponent(body); }
  function mailLink(email, subject, body) { return "mailto:" + encodeURIComponent(email || "") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body); }

  const GP = { TRADES, parseJob, totals, status, LABELS, followPlan, STEPS, message, docText, money, toCents, todayISO, addDays, daysBetween, fmtDate, firstName, smsLink, mailLink, payLine };
  if (typeof module !== "undefined" && module.exports) module.exports = GP; else root.GP = GP;
})(typeof self !== "undefined" ? self : this);
