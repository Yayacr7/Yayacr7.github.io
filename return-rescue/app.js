/* Return Rescue — manual return tracker. Everything is stored on this device only.
   No retailer, email, shipping or banking connection exists in this version. */
(function () {
'use strict';

/* ---------- Config ---------- */
const CONFIG = {
  freeActiveLimit: 5,          // business-model test: free plan size (samples not counted)
  storageKey: 'returnRescue.v1',
  defaults: { reminders: [7, 3, 1], actSoon: 7, followUp: 14, currency: 'USD' }
};

const STATUSES = [
  { id: 'deciding',        label: 'Deciding',                 hint: 'You have not started the return yet.' },
  { id: 'requested',       label: 'Return requested',         hint: 'The seller accepted your return request.' },
  { id: 'ready',           label: 'Ready to send or drop off', hint: 'Packed and ready to go.' },
  { id: 'sent',            label: 'Sent',                     hint: 'You handed it over or returned it.' },
  { id: 'refund_pending',  label: 'Refund pending',           hint: 'Waiting for the money to come back.' },
  { id: 'refund_received', label: 'Refund received',          hint: 'You saw the refund on your account.' }
];
const CLOSED = { kept: 'Kept it', missed: 'Not returned' };
const ORDER = STATUSES.map(s => s.id);
const BEFORE_SENT = ['deciding', 'requested', 'ready'];
const WAITING = ['sent', 'refund_pending'];
const DONE = ['refund_received', 'kept', 'missed'];

const METHODS = {
  mail:    { label: 'Ship it back',            sub: 'Pack it and send it with a label' },
  dropoff: { label: 'Drop off at a location',  sub: 'A drop-off point, often with a QR code' },
  store:   { label: 'Return in a store',       sub: 'Take it to a shop in person' },
  pickup:  { label: 'Pickup from home',        sub: 'A carrier collects it' },
  unknown: { label: 'Not sure yet',            sub: 'You can choose later' }
};
const CHECKLISTS = {
  mail: ["Check the seller's return conditions for this item (tags, packaging, condition)", 'Request the return from the seller', 'Get the return label or return number', 'Pack the item with everything it came with', 'Attach the label (or write the return number on the box)', 'Send it and keep the drop-off receipt', 'Save the tracking number in Return Rescue'],
  dropoff: ["Check the seller's return conditions for this item", 'Request the return from the seller', 'Get the QR code or label for the drop-off place', 'Pack the item with everything it came with', 'Take it to the drop-off place before the deadline', 'Keep the drop-off receipt and save its reference here'],
  store: ["Check the store's return conditions and opening hours", 'Find the receipt or order number', 'Bring the card you paid with (some stores ask for it)', 'Bring the item with tags, packaging and all parts', 'Ask for a refund receipt', 'Save a photo of the refund receipt here'],
  pickup: ["Check the seller's return conditions for this item", 'Request the return and book a pickup', 'Pack the item and attach the label', 'Be ready on pickup day and get a pickup confirmation', 'Save the pickup reference here'],
  unknown: ["Check the seller's return conditions for this item", 'Decide how to return it (ship, drop off or in store)', 'Request the return from the seller if needed', 'Pack the item with everything it came with', 'Return it before the deadline and keep proof', 'Save the tracking or receipt reference here']
};
const SOURCES = {
  policy: "Seller's return policy page",
  receipt: 'Receipt or order confirmation',
  support: "Seller's customer service",
  other: 'Somewhere else / my guess'
};

/* ---------- Dates (local calendar days; ?today=YYYY-MM-DD overrides for testing) ---------- */
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const isISO = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseISO(s)) && iso(parseISO(s)) === s;
function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(s, n) { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); }
function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
const TEST_TODAY = (() => { try { const t = new URLSearchParams(location.search).get('today'); return isISO(t) ? t : null; } catch (e) { return null; } })();
const today = () => TEST_TODAY || iso(new Date());
function fmtDate(s, opts) {
  if (!isISO(s)) return '';
  const d = parseISO(s), sameYear = d.getFullYear() === parseISO(today()).getFullYear();
  return d.toLocaleDateString('en-US', Object.assign({ month: 'short', day: 'numeric' }, sameYear ? {} : { year: 'numeric' }, opts || {}));
}
const fmtLong = s => fmtDate(s, { weekday: 'short', year: 'numeric' });
// Within the next 6 days a weekday name is unambiguous: "Tomorrow", "Friday"
function dayName(s) { const n = daysBetween(today(), s); if (n === 0) return 'today'; if (n === 1) return 'tomorrow'; return parseISO(s).toLocaleDateString('en-US', { weekday: 'long' }); }
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

/* ---------- Storage ---------- */
let storageOK = true;
let state = load();
function blank() { return { v: 1, purchases: [], settings: Object.assign({}, CONFIG.defaults), interest: null }; }
function load() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return blank();
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.purchases)) return blank();
    s.settings = Object.assign({}, CONFIG.defaults, s.settings || {});
    s.purchases.forEach(normalize);
    return s;
  } catch (e) { storageOK = false; return blank(); }
}
function save() {
  try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(state)); storageOK = true; }
  catch (e) { storageOK = false; toast('Could not save. Your browser may be blocking storage or it is full.'); }
}
function normalize(p) {
  p.checklist = p.checklist || []; p.tracking = p.tracking || []; p.photos = p.photos || [];
  p.history = p.history || []; p.dismissed = p.dismissed || [];
  if (!ORDER.includes(p.status) && !CLOSED[p.status]) p.status = 'deciding';
  return p;
}
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const byId = id => state.purchases.find(p => p.id === id);

/* Photos live in IndexedDB (too big for localStorage). */
const PhotoDB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('returnRescuePhotos', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('photos');
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  },
  async tx(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('photos', mode); const st = t.objectStore('photos'); const out = fn(st); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }); },
  put(id, blob) { return this.tx('readwrite', st => st.put(blob, id)); },
  get(id) { return this.tx('readonly', st => st.get(id)); },
  del(id) { return this.tx('readwrite', st => st.delete(id)); },
  keys() { return this.tx('readonly', st => st.getAllKeys()); }
};
const urlCache = {};
async function photoURL(id) {
  if (urlCache[id]) return urlCache[id];
  try { const b = await PhotoDB.get(id); if (!b) return null; return (urlCache[id] = URL.createObjectURL(b)); } catch (e) { return null; }
}
function hydratePhotos(root) {
  (root || document).querySelectorAll('img[data-photo]').forEach(async img => {
    const u = await photoURL(img.dataset.photo);
    if (u) img.src = u; else { const box = img.closest('.thumb'); if (box) { img.remove(); } else img.alt = 'Photo not found on this device'; }
  });
}
function resizeImage(file, max) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.naturalWidth * s)); c.height = Math.max(1, Math.round(im.naturalHeight * s));
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? res(b) : rej(new Error('resize failed')), 'image/jpeg', 0.84);
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Not an image this browser can open')); };
    im.src = url;
  });
}
async function storePhoto(file) { const b = await resizeImage(file, 1600); const id = 'ph_' + uid(); await PhotoDB.put(id, b); return id; }
async function cleanOrphanPhotos() {
  try {
    const used = new Set();
    state.purchases.forEach(p => { p.photos.forEach(x => used.add(x)); if (p.itemPhoto) used.add(p.itemPhoto); });
    if (draft) { draft.p.photos.forEach(x => used.add(x)); if (draft.p.itemPhoto) used.add(draft.p.itemPhoto); }
    const keys = await PhotoDB.keys();
    for (const k of keys) if (!used.has(k)) await PhotoDB.del(k);
  } catch (e) { /* photos unavailable; nothing to clean */ }
}

/* ---------- Logic ---------- */
const S = () => state.settings;
const isActive = p => !DONE.includes(p.status);
const beforeSent = p => BEFORE_SENT.includes(p.status);
const statusLabel = id => CLOSED[id] || (STATUSES.find(s => s.id === id) || {}).label || id;
function money(n) {
  if (n === null || n === undefined || n === '' || isNaN(n)) return '';
  try { return Number(n).toLocaleString('en-US', { style: 'currency', currency: S().currency || 'USD' }); } catch (e) { return '$' + Number(n).toFixed(2); }
}
const num = v => { if (v === '' || v === null || v === undefined) return null; const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : Math.round(n * 100) / 100; };

function deadlineInfo(p) {
  if (!p.deadline) return { kind: 'none', text: 'No deadline yet', left: null };
  const left = daysBetween(today(), p.deadline);
  const est = !p.deadlineConfirmed;
  if (!beforeSent(p)) return { kind: 'met', text: 'Deadline was ' + fmtDate(p.deadline), left };
  if (left < 0) return { kind: 'past', text: (est ? 'Estimated deadline passed ' : 'Deadline passed ') + fmtDate(p.deadline), left };
  if (est) return { kind: 'est', text: 'Unconfirmed: ' + fmtDate(p.deadline), left };
  if (left === 0) return { kind: 'soon', text: 'Last day today', left };
  if (left <= 6) return { kind: 'soon', text: 'Return by ' + dayName(p.deadline) + ' · ' + plural(left, 'day') + ' left', left };
  if (left <= S().actSoon) return { kind: 'soon', text: plural(left, 'day') + ' left · ' + fmtDate(p.deadline), left };
  return { kind: 'ok', text: 'Return by ' + fmtDate(p.deadline) + ' · ' + plural(left, 'day'), left };
}
function followUpDate(p) {
  if (p.followUpDate) return p.followUpDate;
  const base = p.sentDate || lastChange(p) || today();
  return addDays(base, S().followUp);
}
function lastChange(p) { const h = p.history[p.history.length - 1]; return h ? h.on : null; }
function reminderOffsets(p) { return (Array.isArray(p.reminders) ? p.reminders : S().reminders).slice().sort((a, b) => b - a); }

/* Due reminders: one per purchase. Deadline reminders only for CONFIRMED deadlines. */
function dueReminders() {
  const out = [];
  state.purchases.forEach(p => {
    if (!isActive(p)) return;
    if (beforeSent(p) && p.deadline && p.deadlineConfirmed) {
      const left = daysBetween(today(), p.deadline);
      if (left >= 0) {
        const hits = reminderOffsets(p).filter(n => n >= left);
        if (hits.length) {
          const n = Math.min(...hits), key = 'd' + n + '@' + p.deadline;
          if (!p.dismissed.includes(key)) out.push({ p, key, kind: 'deadline', left });
        }
      }
    }
    if (WAITING.includes(p.status)) {
      const f = followUpDate(p);
      const key = 'f@' + f;
      if (f <= today() && !p.dismissed.includes(key)) out.push({ p, key, kind: 'refund' });
    }
  });
  return out.sort((a, b) => (a.left ?? 999) - (b.left ?? 999));
}

function addHistory(p, to, note) { p.history.push({ on: today(), at: new Date().toISOString(), from: p.status, to, note: note || '' }); }
function setStatus(p, to, extra) {
  extra = extra || {};
  addHistory(p, to, extra.note);
  p.status = to;
  if (to === 'sent') { p.sentDate = extra.date || today(); p.followUpDate = null; }
  if (to === 'refund_pending' && !p.sentDate) p.sentDate = extra.date || today();
  if (to === 'refund_received') { p.receivedRefund = extra.amount; p.refundDate = extra.date; p.refundType = extra.refundType || 'original'; }
  if (DONE.includes(to)) p.closedOn = today(); else p.closedOn = null;
  if (extra.reference) p.returnRef = extra.reference;
  if (extra.tracking) p.tracking.push({ id: uid(), ref: extra.tracking, label: extra.carrier || '', link: '', added: today() });
  save();
}
function checklistFor(method) { return (CHECKLISTS[method] || CHECKLISTS.unknown).map(t => ({ id: uid(), text: t, done: false })); }
const activeCount = () => state.purchases.filter(p => isActive(p) && !p.sample).length;

/* ---------- Order text reader (pasted text only; no photo reading in this version) ---------- */
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
// guess: 'past' for order/delivery dates, 'future' for return-by dates (only used when the year is missing)
function mkDate(y, m, d, guess) {
  if (y < 100) y += 2000;
  const dt = new Date(y, m, d);
  if (dt.getMonth() !== m || dt.getDate() !== d) return null;
  let s = iso(dt);
  if (guess === 'past' && daysBetween(today(), s) > 7) s = iso(new Date(y - 1, m, d));
  if (guess === 'future' && daysBetween(s, today()) > 60) s = iso(new Date(y + 1, m, d));
  return s;
}
function findDates(line, guess) {
  guess = guess || 'past';
  const out = [], ty = parseISO(today()).getFullYear(); let m;
  const mon = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
  const r1 = new RegExp('\\b' + mon + '\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?', 'gi');
  while ((m = r1.exec(line))) { const d = mkDate(m[3] ? +m[3] : ty, MONTHS[m[1].toLowerCase()], +m[2], m[3] ? null : guess); if (d) out.push({ i: m.index, d }); }
  const r2 = new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+' + mon + ',?(?:\\s+(\\d{4}))?', 'gi');
  while ((m = r2.exec(line))) { const d = mkDate(m[3] ? +m[3] : ty, MONTHS[m[2].toLowerCase()], +m[1], m[3] ? null : guess); if (d) out.push({ i: m.index, d }); }
  const r3 = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  while ((m = r3.exec(line))) { const d = mkDate(+m[1], +m[2] - 1, +m[3]); if (d) out.push({ i: m.index, d }); }
  const r4 = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g; // US month/day/year
  while ((m = r4.exec(line))) { const d = mkDate(+m[3], +m[1] - 1, +m[2]); if (d) out.push({ i: m.index, d }); }
  return out.sort((a, b) => a.i - b.i).map(x => x.d);
}
const AMOUNT = /(?:US\s?)?\$\s?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+(?:\.\d{2})?)/g;
const amounts = line => { const a = []; let m; AMOUNT.lastIndex = 0; while ((m = AMOUNT.exec(line))) a.push(parseFloat(m[1].replace(/,/g, ''))); return a; };
const NOT_ITEM = /(sub-?total|total|tax|shipping|delivery|discount|saving|saved|gift card|paid|refund|balance|estimated|points|promo|coupon|fee|charged|payment|you pay)/i;
const NOISE_DOMAINS = /^(gmail|yahoo|outlook|hotmail|icloud|ups|usps|fedex|dhl|google|mail|email|order|orders|help|support|account|example)$/i;
function cleanName(s) { return s.replace(/\s+/g, ' ').replace(/^[\s\-–•*:|]+|[\s\-–•*:|,.]+$/g, '').replace(/\b(inc|llc|ltd)\.?$/i, '').trim().slice(0, 80); }

function parseOrderText(text) {
  const out = {};
  if (!text || !text.trim()) return out;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const joined = lines.join('\n');
  const dateNear = (i, g) => { const a = findDates(lines[i], g); if (a.length) return a[0]; if (lines[i + 1]) { const b = findDates(lines[i + 1], g); if (b.length) return b[0]; } return null; };
  const RET = /(return(?:s)?\s+(?:by|until|before|through|thru|window\s+closes|eligible\s+(?:through|until))|returnable\s+(?:until|through|by)|last\s+day\s+to\s+return|return\s+deadline)/i;
  lines.forEach((l, i) => {
    if (!out.returnBy && RET.test(l)) { const d = dateNear(i, 'future'); if (d) out.returnBy = d; return; }
    if (/return/i.test(l)) return;
    if (!out.orderDate && /(order(?:ed)?\s*(?:date|placed|on)?|placed\s+on|purchase(?:d)?\s*(?:date|on)?|date\s+of\s+purchase)/i.test(l)) { const d = dateNear(i); if (d) out.orderDate = d; }
    if (!out.deliveredDate && /(deliver(?:ed|y)|arriv(?:ed|es|ing)|received\s+on)/i.test(l)) { const d = dateNear(i); if (d) out.deliveredDate = d; }
  });
  // Order number
  const onRe = /(?:order|confirmation)\s*(?:number|no\.?|#|id)?\s*[:#]?\s*#?\s*([A-Z0-9][A-Z0-9\-]{3,})/gi; let m;
  while ((m = onRe.exec(joined))) { if (/\d/.test(m[1]) && !/^(19|20)\d\d$/.test(m[1])) { out.orderNo = m[1]; break; } }
  if (!out.orderNo) lines.forEach((l, i) => { if (!out.orderNo && /^(order|confirmation)\s*(number|no\.?|#|id)\s*:?$/i.test(l) && lines[i + 1] && /^#?[A-Z0-9\-]{4,}$/i.test(lines[i + 1]) && /\d/.test(lines[i + 1])) out.orderNo = lines[i + 1].replace(/^#/, ''); });
  // Return window in days
  const w = joined.match(/(\d{1,3})[- ]days?\b[^.\n]{0,40}\breturn/i) || joined.match(/\breturn[^.\n]{0,40}?\b(\d{1,3})[- ]days?\b/i);
  if (w && +w[1] > 0 && +w[1] <= 730) out.windowDays = +w[1];
  // Money
  lines.forEach((l, i) => {
    if (/\b(order total|grand total|total)\b/i.test(l) && !/sub-?total/i.test(l)) { const a = amounts(l).length ? amounts(l) : amounts(lines[i + 1] || ''); if (a.length && out.total === undefined) out.total = a[a.length - 1]; }
  });
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]; const a = amounts(l);
    if (!a.length || NOT_ITEM.test(l)) continue;
    out.itemPrice = a[0];
    let name = cleanName(l.replace(AMOUNT, '').replace(/\b(qty|quantity)\s*:?\s*\d+/i, '').replace(/\bx\s?\d+\b/i, '').replace(/\b(price|each|item)\s*:?/ig, ''));
    if (name.replace(/[^a-z]/gi, '').length < 3 && i > 0 && !NOT_ITEM.test(lines[i - 1]) && !findDates(lines[i - 1]).length && !/order|thank|hello|hi\b/i.test(lines[i - 1])) name = cleanName(lines[i - 1].replace(/\b(qty|quantity)\s*:?\s*\d+/i, ''));
    if (name.replace(/[^a-z]/gi, '').length >= 3) out.item = name;
    break;
  }
  if (!out.item) { const it = joined.match(/\bitem(?: name)?\s*:\s*([^\n]{3,80})/i); if (it) out.item = cleanName(it[1]); }
  if (!out.item) lines.forEach((l, i) => { if (!out.item && /^(qty|quantity)\b/i.test(l) && i > 0) out.item = cleanName(lines[i - 1]); });
  // Store
  const st = [
    /thank(?:s| you) for (?:shopping|your order|ordering|your purchase)\s+(?:at|with|from)\s+([A-Z0-9][\w&'’. -]{1,40}?)(?=[.!,\n]|$)/im,
    /(?:[Ss]old [Bb]y|[Ss]hipped [Bb]y|[Oo]rder [Ff]rom|[Pp]urchased [Ff]rom|[Rr]eceipt [Ff]rom)\s*:?\s+([A-Z0-9][\w&'’.-]*(?: [A-Z0-9&][\w&'’.-]*){0,4})/m,
    /\b[Yy]our ([A-Z][\w&'’.-]*(?: [A-Z][\w&'’.-]*){0,3}) order\b/m,
    /^from:\s*"?([^"<\n]{2,40}?)"?\s*</im
  ];
  for (const r of st) { const x = joined.match(r); if (x) { const n = cleanName(x[1]); if (n && !/^(us|our|the)$/i.test(n)) { out.store = n; break; } } }
  if (!out.store) { const d = joined.match(/\b(?:www\.)?([a-z0-9-]{2,30})\.(?:com|co|store|shop|net|co\.uk|ca)\b/i); if (d && !NOISE_DOMAINS.test(d[1])) out.store = d[1].charAt(0).toUpperCase() + d[1].slice(1); }
  return out;
}

/* ---------- Calendar file (.ics) with alarms: works without this app being open ---------- */
function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
function makeICS(p) {
  const d = p.deadline.replace(/-/g, ''), next = addDays(p.deadline, 1).replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const what = (p.item || 'Return') + (p.store ? ' (' + p.store + ')' : '');
  const title = (p.deadlineConfirmed ? 'Return deadline: ' : 'UNCONFIRMED return deadline: ') + what;
  const desc = [p.deadlineConfirmed ? 'You confirmed this deadline' + (p.deadlineSource ? ' (' + SOURCES[p.deadlineSource] + ')' : '') + '.' : 'This date is an estimate. Check the seller\'s policy.',
    p.policyUrl ? 'Policy: ' + p.policyUrl : '', p.orderNo ? 'Order: ' + p.orderNo : '', 'Made with Return Rescue. Some stores count deadlines in their own time zone, so aim to finish a day early.'].filter(Boolean).join('\n');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Return Rescue//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    'UID:' + p.id + '-' + d + '@return-rescue', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + next,
    'SUMMARY:' + icsEscape(title), 'DESCRIPTION:' + icsEscape(desc), 'TRANSP:TRANSPARENT'];
  reminderOffsets(p).forEach(n => {
    // all-day event starts at 00:00 on the deadline; fire at 9:00 local, n days before
    const trig = n === 0 ? 'PT9H' : '-PT' + (n * 24 - 9) + 'H';
    L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape((n === 0 ? 'Last day to return: ' : n + ' day' + (n === 1 ? '' : 's') + ' left to return: ') + what), 'TRIGGER:' + trig, 'END:VALARM');
  });
  L.push('END:VEVENT', 'END:VCALENDAR');
  return L.join('\r\n') + '\r\n';
}
function download(name, content, type) {
  const b = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------- Sample data (clearly fake) ---------- */
function makeSamples() {
  const t = today();
  const mk = (o) => normalize(Object.assign({ id: 's_' + uid(), sample: true, createdOn: t, photos: [], tracking: [], history: [{ on: t, at: new Date().toISOString(), from: null, to: o.status, note: 'Sample added' }], dismissed: [], reminders: null }, o));
  return [
    mk({ store: 'Sample: Northwind Outfitters', item: 'Rain jacket (size M)', price: 89, orderDate: addDays(t, -20), deliveredDate: addDays(t, -16), deadline: addDays(t, 3), deadlineConfirmed: true, deadlineSource: 'policy', deadlineNote: 'Made-up example: "unworn, tags attached".', method: 'mail', status: 'requested', returnRef: 'RMA-SAMPLE-1', expectedRefund: 89, checklist: checklistFor('mail').map((c, i) => Object.assign(c, { done: i < 3 })) }),
    mk({ store: 'Sample: Lumen Home', item: 'Table lamp', price: 42.5, orderDate: addDays(t, -9), deadline: addDays(t, 21), deadlineConfirmed: true, deadlineSource: 'receipt', method: 'store', status: 'deciding', expectedRefund: 42.5, checklist: checklistFor('store') }),
    mk({ store: 'Sample: Pixel Parade', item: 'Phone case', price: 19.99, orderDate: addDays(t, -6), deadline: addDays(t, 6), deadlineConfirmed: false, deadlineSource: 'other', deadlineNote: 'Guess. Not checked yet.', method: 'unknown', status: 'deciding', checklist: checklistFor('unknown') }),
    mk({ store: 'Sample: Trailhead Shoes', item: 'Running shoes', price: 120, orderDate: addDays(t, -30), deadline: addDays(t, 15), deadlineConfirmed: true, deadlineSource: 'policy', method: 'dropoff', status: 'refund_pending', sentDate: addDays(t, -5), expectedRefund: 120, tracking: [{ id: uid(), ref: 'SAMPLE123456', label: 'Drop-off receipt', link: '', added: addDays(t, -5) }], checklist: checklistFor('dropoff').map(c => Object.assign(c, { done: true })) }),
    mk({ store: 'Sample: Maple & Moss', item: 'Wool scarf', price: 35, orderDate: addDays(t, -40), deadline: addDays(t, -10), deadlineConfirmed: true, deadlineSource: 'policy', method: 'mail', status: 'refund_received', sentDate: addDays(t, -14), expectedRefund: 35, receivedRefund: 29, refundDate: addDays(t, -3), refundType: 'original', closedOn: addDays(t, -3), deadlineNote: 'Made-up example of a refund with a return shipping fee taken off.', checklist: checklistFor('mail').map(c => Object.assign(c, { done: true })) })
  ];
}

/* ---------- Rendering helpers ---------- */
const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r) => (r || document).querySelector(s);
const view = () => $('#view');
const I = {
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>',
  paste: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
  box: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="M10 22 32 10l22 12v22L32 56 10 44z"/><path d="M10 22l22 12 22-12M32 34v22"/></svg>'
};
function badge(status) { return '<span class="badge s-' + status + '">' + esc(statusLabel(status)) + '</span>'; }
function dlChip(p) {
  const d = deadlineInfo(p);
  if (d.kind === 'met') return '';
  const cls = { none: 'none', past: 'past', est: 'est', soon: 'soon', ok: '' }[d.kind];
  return '<span class="dl ' + cls + '">' + (d.kind === 'soon' ? I.clock : '') + esc(d.text) + '</span>';
}
function thumb(p, big) {
  const ini = esc(((p.item || p.store || '?').replace(/^Sample:\s*/, '')).trim().charAt(0).toUpperCase());
  return '<div class="thumb' + (big ? ' big' : '') + '" aria-hidden="true">' + (p.itemPhoto ? '<img data-photo="' + esc(p.itemPhoto) + '" alt="">' : ini) + '</div>';
}
function card(p, opts) {
  opts = opts || {};
  const d = deadlineInfo(p);
  const right = opts.money ? opts.money(p) : (p.price ? money(p.price) : '');
  return '<a class="pcard' + (d.kind === 'soon' ? ' soon' : '') + '" href="#/p/' + esc(p.id) + '" data-card="' + esc(p.id) + '">' + thumb(p) +
    '<div class="meta"><div class="name">' + esc(p.item || 'Unnamed item') + '</div><div class="store">' + esc(p.store || 'Store not added') + (p.orderDate ? ' · bought ' + fmtDate(p.orderDate) : '') + '</div>' +
    '<div class="row">' + badge(p.status) + (opts.noDeadline ? '' : dlChip(p)) + '</div></div>' + (right ? '<div class="amt">' + right + '</div>' : '') + '</a>';
}
function section(title, list, opts) {
  if (!list.length) return '';
  return '<h2>' + esc(title) + ' <span class="count">' + list.length + '</span></h2>' + (opts && opts.note ? '<p class="small" style="margin:-4px 0 10px">' + opts.note + '</p>' : '') + '<div class="stack">' + list.map(p => card(p, opts)).join('') + '</div>';
}
let toastTimer;
function toast(msg) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 3200);
}
function sheet(html, onMount) {
  const L = $('#layer');
  L.innerHTML = '<div class="scrim" data-act="close-sheet-bg"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' + html + '</div></div>';
  const s = $('.sheet', L); hydratePhotos(s);
  const f = s.querySelector('input:not([type=hidden]),button,select,textarea'); if (f) f.focus();
  if (onMount) onMount(s);
}
function closeSheet() { $('#layer').innerHTML = ''; }
function sampleBanner() {
  if (!state.purchases.some(p => p.sample)) return '';
  return '<div class="notice sand" style="margin-bottom:12px">' + I.info + '<div class="grow"><b>Sample purchases are showing.</b> They are made up, so their refunds are not counted as money you got back.</div><button class="btn sm ghost" data-act="remove-samples">Remove</button></div>';
}

/* ---------- Screens ---------- */
function renderHome() {
  const P = state.purchases, actSoon = S().actSoon;
  const act = P.filter(p => beforeSent(p) && p.deadline && p.deadlineConfirmed && deadlineInfo(p).left >= 0 && deadlineInfo(p).left <= actSoon).sort((a, b) => a.deadline.localeCompare(b.deadline));
  const passed = P.filter(p => beforeSent(p) && p.deadline && deadlineInfo(p).left < 0);
  const check = P.filter(p => beforeSent(p) && (!p.deadline || !p.deadlineConfirmed) && !passed.includes(p));
  const later = P.filter(p => beforeSent(p) && p.deadline && p.deadlineConfirmed && deadlineInfo(p).left > actSoon).sort((a, b) => a.deadline.localeCompare(b.deadline));
  const waiting = P.filter(p => WAITING.includes(p.status));
  const done = P.filter(p => DONE.includes(p.status));
  const real = P.filter(p => !p.sample);
  const expected = real.filter(p => WAITING.includes(p.status) && p.expectedRefund).reduce((s, p) => s + p.expectedRefund, 0);
  const got = real.filter(p => p.status === 'refund_received' && p.receivedRefund).reduce((s, p) => s + p.receivedRefund, 0);
  const rem = dueReminders();

  if (!P.length) {
    return '<section class="hero"><h1>Keep track of your returns.<br>Keep more of your money.</h1><p>Add a purchase, confirm its return deadline with the seller\'s policy, and get a checklist and reminders.</p><div class="btnrow"><a class="btn mint" href="#/add">Add a purchase</a><button class="btn ghost" data-act="add-samples">Try with sample purchases</button></div></section>' +
      '<div class="how card"><div><i>1</i><span><b>Add what you bought.</b> Type it, paste the order email text, or add a receipt photo.</span></div><div><i>2</i><span><b>Confirm the deadline.</b> Return windows differ by store, item, membership and condition. Nothing is assumed.</span></div><div><i>3</i><span><b>Follow the checklist.</b> Track it from deciding to refund received.</span></div></div>' +
      '<p class="small" style="margin-top:14px">' + I.info.replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-3px"') + ' Manual tracking. Return Rescue is not connected to stores, email, carriers or banks. Your data stays on this device. <a href="#/about">How it works</a></p>';
  }
  let h = sampleBanner();
  h += '<h1>Your returns</h1><div class="summary">' +
    '<div class="stat"><b>' + P.filter(isActive).length + '</b><span>Active returns</span></div>' +
    '<div class="stat"><b>' + (money(expected) || '$0.00') + '</b><span>Expected, not received yet</span></div>' +
    '<div class="stat mint"><b>' + (money(got) || '$0.00') + '</b><span>Refunds you recorded</span></div></div>';
  if (rem.length) {
    h += '<h2>' + I.bell.replace('<svg', '<svg style="width:20px;height:20px;color:var(--orange)"') + 'Reminders <span class="count">' + rem.length + '</span></h2>';
    h += rem.map(r => {
      const p = r.p;
      const msg = r.kind === 'deadline'
        ? (r.left === 0 ? '<b>Last day today</b> to return ' : '<b>' + plural(r.left, 'day') + ' left</b> to return ') + esc(p.item || 'this item') + (p.store ? ' to ' + esc(p.store) : '') + ' (by ' + (r.left > 0 && r.left <= 6 ? dayName(p.deadline) + ', ' : '') + fmtDate(p.deadline) + '). Status: ' + esc(statusLabel(p.status)) + '.'
        : '<b>No refund recorded yet</b> for ' + esc(p.item || 'this item') + (p.store ? ' from ' + esc(p.store) : '') + '. Check your account or statement. If nothing is there, contact the seller. Refund times vary.';
      return '<div class="remind" data-reminder="' + esc(p.id) + '">' + I.bell.replace('<svg', '<svg style="width:20px;height:20px;color:var(--orange);flex:none;margin-top:2px"') + '<div class="grow">' + msg + '<div class="acts"><a class="btn sm primary" href="#/p/' + esc(p.id) + '">Open</a><button class="btn sm ghost" data-act="dismiss" data-id="' + esc(p.id) + '" data-key="' + esc(r.key) + '">' + (r.kind === 'deadline' ? 'Got it' : 'Remind me in 7 days') + '</button></div></div></div>';
    }).join('');
  }
  h += section('Act soon', act, { note: 'Confirmed deadlines in the next ' + plural(actSoon, 'day') + '.' });
  h += section('Deadline passed', passed, { note: 'Some sellers still help if you ask. If not, mark it as kept or not returned.' });
  h += section('Check the deadline', check, { note: 'These dates are missing or not confirmed, so they get no reminders yet. Check the seller\'s policy for each item.' });
  h += section('Coming up', later);
  h += section('Waiting on refunds', waiting, { noDeadline: true, money: p => p.expectedRefund ? '<span class="tiny">expected</span><br>' + money(p.expectedRefund) : '' });
  if (!act.length && !passed.length && !check.length && !later.length && !waiting.length) h += '<div class="empty card">' + I.box + '<p><b>No active returns.</b><br>Add a purchase you might send back.</p><a class="btn primary" href="#/add">Add a purchase</a></div>';
  if (done.length) h += '<p style="margin-top:20px"><a class="btn ghost block" href="#/archive">See completed returns (' + done.length + ')</a></p>';
  return h;
}

/* ----- Add / edit wizard ----- */
let draft = null;
function newDraft() {
  return { mode: 'add', step: 1, start: null, text: '', parsed: {}, foundKeys: [], dlMode: null, calcDays: '', calcFrom: 'delivery',
    p: { id: null, store: '', item: '', price: '', orderNo: '', orderDate: '', deliveredDate: '', deadline: '', deadlineConfirmed: false, deadlineSource: '', policyUrl: '', deadlineNote: '', method: 'unknown', instructions: '', expectedRefund: '', reminders: null, photos: [], itemPhoto: null, notes: '' } };
}
function editDraft(p) {
  const d = newDraft(); d.mode = 'edit'; d.step = 2; d.start = 'type';
  Object.keys(d.p).forEach(k => { if (p[k] !== undefined && p[k] !== null) d.p[k] = Array.isArray(p[k]) ? p[k].slice() : p[k]; });
  d.p.id = p.id; d.dlMode = p.deadline ? 'exact' : 'unknown';
  return d;
}
function stepBar(n) { return '<div class="steps" aria-label="Step ' + n + ' of 4">' + [1, 2, 3, 4].map(i => '<i class="' + (i < n ? 'done' : i === n ? 'on' : '') + '"></i>').join('') + '</div>'; }
function field(k, label, type, opt, extra) {
  const v = draft.p[k] === null || draft.p[k] === undefined ? '' : draft.p[k];
  const found = draft.foundKeys.includes(k) ? '<span class="found">Found in your text</span>' : '';
  return '<label class="f" for="f-' + k + '">' + label + (opt ? ' <span class="opt">(optional)</span>' : '') + found + '</label><input class="in" id="f-' + k + '" data-k="' + k + '" type="' + (type || 'text') + '" value="' + esc(v) + '"' + (extra || '') + '>';
}
function photoStrip(ids, act) {
  return ids.length ? '<div class="photo-prev">' + ids.map(id => '<div class="ph"><img data-photo="' + esc(id) + '" alt="Receipt photo" data-act="view-photo" data-photo-id="' + esc(id) + '"><button type="button" aria-label="Remove photo" data-act="' + act + '" data-photo-id="' + esc(id) + '">×</button></div>').join('') + '</div>' : '';
}
function renderWizard() {
  const d = draft, p = d.p;
  const title = d.mode === 'edit' ? 'Edit purchase' : 'Add a purchase';
  let h = '<h1>' + title + '</h1>' + stepBar(d.step);
  if (d.step === 1) {
    h += '<p class="lead">How do you want to start? You can review everything before it is saved.</p><div class="choice">' +
      opt('start', 'photo', I.camera, 'Receipt or order screenshot', 'Save the photo with your purchase, then fill in the details') +
      opt('start', 'paste', I.paste, 'Paste order text', 'Copy the text of an order email or order page and the app picks out the details') +
      opt('start', 'type', I.pen, 'Type it in', 'Works for anything, no email or account needed') + '</div>';
    if (d.start === 'photo') {
      h += '<div class="card" style="margin-top:14px"><label class="drop" for="receipt-file">' + I.camera + '<span>Choose a receipt photo or screenshot</span><span class="tiny">JPG, PNG, HEIC (if your browser opens it). Saved on this device only.</span><input id="receipt-file" type="file" accept="image/*" multiple data-upload="receipt"></label>' + photoStrip(p.photos, 'rm-draft-photo') +
        '<div class="notice sand" style="margin-top:12px">' + I.info + '<div>This version does not read text from photos. Tip: on most phones you can press and hold text in a photo to copy it, then paste it below.</div></div>' +
        '<label class="f" for="paste-text">Text from the receipt <span class="opt">(optional)</span></label><textarea class="in" id="paste-text" data-draft="text" placeholder="Paste any text you copied from the receipt">' + esc(d.text) + '</textarea></div>';
    }
    if (d.start === 'paste') {
      h += '<div class="card" style="margin-top:14px"><label class="f" for="paste-text" style="margin-top:0">Paste the order text</label><textarea class="in" id="paste-text" data-draft="text" style="min-height:170px" placeholder="For example:\nThank you for shopping at Example Store\nOrder #A12345\nOrdered on November 3, 2026\nBlue denim jacket   $64.00\nOrder total $69.12">' + esc(d.text) + '</textarea><p class="tiny" style="margin:8px 0 0">The text is read on this device. Nothing is sent anywhere.</p></div>';
    }
    h += '<div class="btnrow end"><a class="btn quiet" href="#/home">Cancel</a><button class="btn primary" data-act="wiz-next" ' + (d.start ? '' : 'disabled') + '>Next</button></div>';
  }
  if (d.step === 2) {
    if (d.foundKeys.length) h += '<div class="notice">' + I.check.replace('stroke-width="3"', 'stroke-width="2.5"') + '<div>We picked out ' + d.foundKeys.length + ' detail' + (d.foundKeys.length === 1 ? '' : 's') + ' from your text. <b>Check each one</b>: the reader can be wrong.</div></div>';
    else if (d.text.trim() && d.mode === 'add') h += '<div class="notice sand">' + I.info + '<div>We could not pick out details from that text. Please type them in.</div></div>';
    h += '<div class="card" style="margin-top:12px">' + field('item', 'What did you buy?', 'text', false, ' placeholder="e.g. Blue denim jacket, size M" autocomplete="off"') +
      field('store', 'Store or seller', 'text', false, ' placeholder="Where you bought it" autocomplete="off"') +
      '<div class="grid2">' + field('price', 'Price paid', 'text', true, ' inputmode="decimal" placeholder="0.00"') + field('orderNo', 'Order number', 'text', true) +
      field('orderDate', 'Purchase date', 'date', true) + field('deliveredDate', 'Delivered or picked up', 'date', true) + '</div>' +
      '<label class="f">Item photo <span class="opt">(optional, shown on the card)</span></label>' +
      (p.itemPhoto ? photoStrip([p.itemPhoto], 'rm-item-photo') : '<label class="btn ghost sm" for="item-file">' + I.camera.replace('<svg', '<svg style="width:18px;height:18px"') + 'Add item photo<input id="item-file" type="file" accept="image/*" class="sr" data-upload="item"></label>') +
      (d.start !== 'photo' ? '<label class="f">Receipt photos <span class="opt">(optional)</span></label>' + photoStrip(p.photos, 'rm-draft-photo') + '<label class="btn ghost sm" for="receipt-file2">' + I.camera.replace('<svg', '<svg style="width:18px;height:18px"') + 'Add receipt photo<input id="receipt-file2" type="file" accept="image/*" multiple class="sr" data-upload="receipt"></label>' : '') +
      '</div><div class="btnrow end">' + (d.mode === 'add' ? '<button class="btn quiet" data-act="wiz-back">Back</button>' : '<a class="btn quiet" href="#/p/' + esc(p.id) + '">Cancel</a>') + '<button class="btn primary" data-act="wiz-next">Next: return deadline</button></div>';
  }
  if (d.step === 3) {
    h += '<p class="lead">When is the last day to return <b>' + esc(p.item || 'it') + '</b>?</p>' +
      '<div class="notice sand">' + I.info + '<div>Return windows are not always 30 days. They can depend on the item, the seller, your membership, the item\'s condition and when you bought it. Check the seller\'s own policy.</div></div>';
    if (d.parsed.returnBy || d.parsed.windowDays) h += '<div class="notice" style="margin-top:8px">' + I.info + '<div>Your text mentions ' + (d.parsed.returnBy ? 'a return date of <b>' + fmtLong(d.parsed.returnBy) + '</b>' : '') + (d.parsed.returnBy && d.parsed.windowDays ? ' and ' : '') + (d.parsed.windowDays ? 'a <b>' + d.parsed.windowDays + '-day</b> return window' : '') + '. Make sure it applies to this item.</div></div>';
    h += '<div class="choice" style="margin-top:12px">' + opt('dlMode', 'exact', '', 'I have the exact date', 'From the receipt, order page or policy') + opt('dlMode', 'calc', '', 'Work it out from the policy', 'For example "30 days from delivery"') + opt('dlMode', 'unknown', '', "I don't know yet", 'Saved without reminders until you add a date') + '</div>';
    if (d.dlMode === 'exact') h += '<div class="card" style="margin-top:12px">' + field('deadline', 'Last day to return', 'date') + '</div>';
    if (d.dlMode === 'calc') {
      h += '<div class="card" style="margin-top:12px"><div class="calc"><input class="in" id="calc-days" data-draft="calcDays" inputmode="numeric" aria-label="Number of days" value="' + esc(d.calcDays) + '" placeholder="days"> <span>days from the</span> <select class="in" data-draft="calcFrom" aria-label="Counted from"><option value="delivery"' + (d.calcFrom === 'delivery' ? ' selected' : '') + '>delivery date</option><option value="purchase"' + (d.calcFrom === 'purchase' ? ' selected' : '') + '>purchase date</option></select></div><div id="calc-out">' + calcOut() + '</div></div>';
    }
    if (d.dlMode && d.dlMode !== 'unknown') {
      h += '<div class="card" style="margin-top:12px"><label class="f" for="f-src" style="margin-top:0">Where is this date from?</label><select class="in" id="f-src" data-k="deadlineSource"><option value="">Choose one</option>' + Object.keys(SOURCES).map(k => '<option value="' + k + '"' + (p.deadlineSource === k ? ' selected' : '') + '>' + SOURCES[k] + '</option>').join('') + '</select>' +
        field('policyUrl', 'Link to the policy', 'url', true, ' placeholder="https://" inputmode="url"') +
        field('deadlineNote', 'Policy note', 'text', true, ' placeholder="e.g. unworn with tags, members get extra days"') +
        '<label class="check"><input type="checkbox" id="f-confirm" data-k="deadlineConfirmed"' + (p.deadlineConfirmed ? ' checked' : '') + (p.deadlineSource === 'other' ? ' disabled' : '') + '><span><b>I checked this date against the seller\'s policy for this item.</b><br><span class="small">' + (p.deadlineSource === 'other' ? 'A guess can\'t be confirmed. It is saved as unconfirmed.' : 'Only confirmed deadlines get reminders and show in "Act soon". Unconfirmed dates are labeled as unconfirmed.') + '</span></span></label><div id="dl-warn">' + deadlineWarn() + '</div></div>';
    }
    h += '<div class="btnrow end"><button class="btn quiet" data-act="wiz-back">Back</button><button class="btn primary" data-act="wiz-next" ' + (d.dlMode ? '' : 'disabled') + '>Next: return plan</button></div>';
  }
  if (d.step === 4) {
    const offs = Array.isArray(p.reminders) ? p.reminders : S().reminders;
    h += '<p class="lead">How will you return it? This sets up your checklist.</p><div class="choice">' + Object.keys(METHODS).map(k => opt('method', k, '', METHODS[k].label, METHODS[k].sub)).join('') + '</div>' +
      '<div class="card" style="margin-top:12px"><label class="f" for="f-ins" style="margin-top:0">Return instructions <span class="opt">(optional)</span></label><textarea class="in" id="f-ins" data-k="instructions" placeholder="Paste the seller\'s steps, the return address or drop-off details">' + esc(p.instructions) + '</textarea>' +
      field('expectedRefund', 'Refund you expect', 'text', true, ' inputmode="decimal" placeholder="' + (num(p.price) !== null ? num(p.price).toFixed(2) : '0.00') + '"') + '<p class="tiny" style="margin:6px 0 0">Some sellers take off shipping or restocking fees. Use what their policy says.</p>' +
      '<label class="f">Remind me before the deadline</label><div class="chips" role="group" aria-label="Reminder days">' + [14, 7, 3, 1, 0].map(n => '<button type="button" class="chip' + (offs.includes(n) ? ' on' : '') + '" aria-pressed="' + offs.includes(n) + '" data-act="toggle-rem" data-n="' + n + '">' + (n === 0 ? 'On the day' : n + (n === 1 ? ' day' : ' days')) + '</button>').join('') + '</div>' +
      '<p class="tiny" style="margin:8px 0 0">' + (p.deadline && p.deadlineConfirmed ? 'Reminders show in the app. You can also add them to your phone calendar from the purchase page.' : 'Reminders start once the deadline is confirmed.') + '</p></div>' +
      '<div class="btnrow end"><button class="btn quiet" data-act="wiz-back">Back</button><button class="btn primary" data-act="wiz-save">' + (d.mode === 'edit' ? 'Save changes' : 'Save purchase') + '</button></div>';
  }
  return h;
}
function opt(key, val, icon, title, sub) {
  const on = (key === 'start' ? draft.start : key === 'dlMode' ? draft.dlMode : draft.p[key]) === val;
  return '<button type="button" class="opt-card' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="pick" data-key="' + key + '" data-val="' + val + '">' + icon + '<div><b>' + esc(title) + '</b><span>' + esc(sub) + '</span></div></button>';
}
function calcBase() { return draft.calcFrom === 'delivery' ? draft.p.deliveredDate : draft.p.orderDate; }
function calcResult() { const n = parseInt(draft.calcDays, 10), b = calcBase(); if (!n || n < 1 || n > 730 || !isISO(b)) return null; return addDays(b, n); }
function calcOut() {
  const n = parseInt(draft.calcDays, 10), b = calcBase();
  if (!draft.calcDays) return '<p class="small" style="margin:10px 0 0">Type the number of days from the seller\'s policy. There is no default.</p>';
  if (!n || n < 1 || n > 730) return '<p class="small" style="margin:10px 0 0;color:var(--orange-ink)">Type a number of days from 1 to 730.</p>';
  if (!isISO(b)) return '<p class="small" style="margin:10px 0 0;color:var(--orange-ink)">Add the ' + (draft.calcFrom === 'delivery' ? 'delivery' : 'purchase') + ' date on the previous step first.</p>';
  return '<div class="result">Last day: ' + fmtLong(addDays(b, n)) + '</div><p class="tiny" style="margin:6px 0 0">Counted as day 1 = the day after ' + fmtDate(b) + '. Some sellers count differently; check their wording.</p>';
}
function deadlineWarn() {
  const dl = draft.dlMode === 'calc' ? calcResult() : draft.p.deadline;
  if (!isISO(dl)) return '';
  const w = [];
  if (isISO(draft.p.orderDate) && dl < draft.p.orderDate) w.push('This date is before the purchase date. Check it.');
  if (dl < today()) w.push('This date has already passed. You can still save it and ask the seller.');
  return w.length ? '<div class="notice orange" style="margin-top:10px">' + I.info + '<div>' + w.join(' ') + '</div></div>' : '';
}
function wizardValidate() {
  const p = draft.p;
  if (draft.step === 2) {
    if (!p.item.trim() && !p.store.trim()) return 'Add what you bought or the store.';
    if (p.price !== '' && num(p.price) === null) return 'The price should be a number, like 24.99.';
    if (p.orderDate && !isISO(p.orderDate)) return 'Check the purchase date.';
  }
  if (draft.step === 3) {
    if (draft.dlMode === 'exact' && !isISO(p.deadline)) return 'Pick the last day to return it, or choose "I don\'t know yet".';
    if (draft.dlMode === 'calc' && !calcResult()) return 'Finish the days calculation, or choose another option.';
    if (p.policyUrl && !/^https?:\/\//i.test(p.policyUrl)) return 'The policy link should start with https://';
  }
  if (draft.step === 4) { if (p.expectedRefund !== '' && num(p.expectedRefund) === null) return 'The expected refund should be a number.'; }
  return null;
}
function applyParsed() {
  const r = parseOrderText(draft.text); draft.parsed = r; draft.foundKeys = [];
  const map = { store: 'store', item: 'item', orderNo: 'orderNo', orderDate: 'orderDate', deliveredDate: 'deliveredDate' };
  Object.keys(map).forEach(k => { if (r[k] && !draft.p[map[k]]) { draft.p[map[k]] = r[k]; draft.foundKeys.push(map[k]); } });
  const price = r.itemPrice !== undefined ? r.itemPrice : r.total;
  if (price !== undefined && draft.p.price === '') { draft.p.price = price.toFixed(2); draft.foundKeys.push('price'); }
  if (r.returnBy && !draft.p.deadline) { draft.p.deadline = r.returnBy; draft.dlMode = 'exact'; draft.p.deadlineSource = 'receipt'; }
  else if (r.windowDays && !draft.p.deadline) { draft.calcDays = String(r.windowDays); draft.dlMode = 'calc'; draft.calcFrom = draft.p.deliveredDate ? 'delivery' : 'purchase'; }
}
function finishWizard(force) {
  const d = draft, f = d.p;
  if (d.mode === 'add' && !force && activeCount() >= CONFIG.freeActiveLimit) return planSheet(true);
  let deadline = '';
  if (d.dlMode === 'exact') deadline = f.deadline; else if (d.dlMode === 'calc') deadline = calcResult();
  const confirmed = !!deadline && !!f.deadlineConfirmed && f.deadlineSource !== 'other';
  const base = {
    store: f.store.trim(), item: f.item.trim(), price: num(f.price), orderNo: f.orderNo.trim(), orderDate: isISO(f.orderDate) ? f.orderDate : '', deliveredDate: isISO(f.deliveredDate) ? f.deliveredDate : '',
    deadline: deadline || '', deadlineConfirmed: confirmed, deadlineSource: deadline ? f.deadlineSource : '', policyUrl: deadline ? f.policyUrl.trim() : '', deadlineNote: deadline ? f.deadlineNote.trim() : '',
    deadlineBasis: d.dlMode === 'calc' ? d.calcDays + ' days from ' + (d.calcFrom === 'delivery' ? 'delivery' : 'purchase') : '',
    deadlineCheckedOn: confirmed ? today() : '', method: f.method, instructions: f.instructions.trim(),
    expectedRefund: f.expectedRefund !== '' ? num(f.expectedRefund) : num(f.price), reminders: f.reminders, photos: f.photos.slice(), itemPhoto: f.itemPhoto
  };
  let p;
  if (d.mode === 'edit') {
    p = byId(f.id); if (!p) { draft = null; return go('#/home'); }
    const changedDl = p.deadline !== base.deadline || p.deadlineConfirmed !== base.deadlineConfirmed;
    const oldMethod = p.method;
    Object.assign(p, base);
    if (changedDl) p.history.push({ on: today(), at: new Date().toISOString(), from: p.status, to: p.status, note: 'Deadline changed to ' + (base.deadline ? fmtDate(base.deadline) + (base.deadlineConfirmed ? ' (confirmed)' : ' (unconfirmed)') : 'none') });
    if (oldMethod !== base.method && !p.checklist.some(c => c.done)) p.checklist = checklistFor(base.method);
    toast('Changes saved');
  } else {
    p = normalize(Object.assign({ id: 'p_' + uid(), createdOn: today(), status: 'deciding', checklist: checklistFor(base.method), tracking: [], history: [{ on: today(), at: new Date().toISOString(), from: null, to: 'deciding', note: 'Added' }], dismissed: [], notes: '' }, base));
    state.purchases.unshift(p);
    toast('Purchase saved');
  }
  save(); draft = null; closeSheet(); go('#/p/' + p.id);
}

/* ----- Purchase detail ----- */
function renderDetail(p, tab) {
  tab = tab || 'details';
  let h = sampleBanner() + '<div class="dhead">' + thumb(p, true) + '<div class="meta"><h1>' + esc(p.item || 'Unnamed item') + '</h1><div class="small">' + esc(p.store || 'Store not added') + (p.price !== null && p.price !== undefined ? ' · ' + money(p.price) : '') + '</div><div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">' + badge(p.status) + dlChip(p) + '</div></div></div>';
  h += '<nav class="seg" aria-label="Purchase sections">' + [['details', 'Details'], ['checklist', 'Checklist'], ['refund', 'Refund']].map(([k, l]) => '<a href="#/p/' + esc(p.id) + (k === 'details' ? '' : '/' + k) + '" class="' + (tab === k ? 'on' : '') + '"' + (tab === k ? ' aria-current="page"' : '') + '>' + l + (k === 'checklist' && p.checklist.length ? ' ' + p.checklist.filter(c => c.done).length + '/' + p.checklist.length : '') + '</a>').join('') + '</nav>';
  if (tab === 'details') h += detailTab(p);
  if (tab === 'checklist') h += checklistTab(p);
  if (tab === 'refund') h += refundTab(p);
  return h;
}
function nextActions(p) {
  const a = [];
  if (p.status === 'deciding') { a.push(['requested', 'I started the return', 'primary']); if (p.method === 'store') a.push(['ready', 'Ready to take to the store', 'ghost']); a.push(['kept', 'I\'ll keep it', 'quiet']); }
  if (p.status === 'requested') a.push(['ready', 'It\'s packed and ready', 'primary']);
  if (p.status === 'ready') a.push(['sent', p.method === 'store' ? 'I returned it at the store' : 'I sent it / dropped it off', 'primary']);
  if (p.status === 'sent') { a.push(['refund_pending', 'Waiting for the refund', 'primary']); a.push(['refund_received', 'Refund already received', 'ghost']); }
  if (p.status === 'refund_pending') a.push(['refund_received', 'I received the refund', 'mint']);
  return a;
}
function detailTab(p) {
  const d = deadlineInfo(p);
  let h = '';
  if (d.kind === 'past' && beforeSent(p)) h += '<div class="notice orange">' + I.info + '<div class="grow"><b>The ' + (p.deadlineConfirmed ? '' : 'estimated ') + 'deadline has passed.</b> Some sellers still accept returns if you ask. Otherwise mark how it ended.<div class="btnrow" style="margin-top:8px"><button class="btn sm ghost" data-act="status" data-to="missed" data-id="' + esc(p.id) + '">Not returned</button><button class="btn sm ghost" data-act="status" data-to="kept" data-id="' + esc(p.id) + '">I kept it</button><a class="btn sm quiet" href="#/edit/' + esc(p.id) + '">Fix the date</a></div></div></div>';
  if (p.deadline && !p.deadlineConfirmed && beforeSent(p) && d.kind !== 'past') h += '<div class="notice sand">' + I.info + '<div class="grow"><b>Deadline not confirmed.</b> Check the seller\'s policy for this item, then confirm it to get reminders.<div class="btnrow" style="margin-top:8px"><a class="btn sm primary" href="#/edit/' + esc(p.id) + '?step=3">Confirm deadline</a></div></div></div>';
  if (!p.deadline && beforeSent(p)) h += '<div class="notice orange">' + I.info + '<div class="grow"><b>No return deadline yet.</b> Find it in the seller\'s policy so you don\'t miss it.<div class="btnrow" style="margin-top:8px"><a class="btn sm primary" href="#/edit/' + esc(p.id) + '?step=3">Add deadline</a></div></div></div>';
  // Progress
  const idx = ORDER.indexOf(p.status);
  h += '<div class="card" style="margin-top:12px"><h3>Return progress</h3>';
  if (CLOSED[p.status]) h += '<p class="small" style="margin:0">' + esc(CLOSED[p.status]) + (p.closedOn ? ' · ' + fmtDate(p.closedOn) : '') + '. No refund is counted.</p>';
  else {
    h += '<ol class="track">' + STATUSES.map((s, i) => {
      const cls = i < idx || (i === idx && s.id === 'refund_received') ? 'done' : i === idx ? 'now' : '';
      const when = histDate(p, s.id);
      return '<li class="' + cls + '"><span class="dot">' + (cls === 'done' ? I.check : '') + '</span><div><b>' + s.label + '</b><span>' + (when ? 'You marked this on ' + fmtDate(when) : cls === 'done' ? 'Done' : i === idx ? 'Now' : s.hint) + '</span></div></li>';
    }).join('') + '</ol>';
  }
  const na = nextActions(p);
  if (na.length) h += '<div class="btnrow" style="margin-top:4px">' + na.map(([to, l, c]) => '<button class="btn ' + c + '" data-act="status" data-to="' + to + '" data-id="' + esc(p.id) + '">' + esc(l) + '</button>').join('') + '</div>';
  h += '<div class="btnrow" style="margin-top:8px"><button class="btn quiet sm" data-act="status-any" data-id="' + esc(p.id) + '">Change status</button></div>';
  h += '<p class="tiny" style="margin:6px 0 0">Return Rescue only records what you tell it. It does not contact the seller, carrier or bank.</p></div>';
  // Deadline & policy
  h += '<div class="card"><h3>Return deadline</h3><dl class="kv">' +
    '<dt>Last day</dt><dd>' + (p.deadline ? fmtLong(p.deadline) : 'Not added') + '</dd>' +
    '<dt>Status</dt><dd>' + (p.deadline ? (p.deadlineConfirmed ? '<span class="yes">Confirmed by you</span>' + (p.deadlineCheckedOn ? ' on ' + fmtDate(p.deadlineCheckedOn) : '') : '<span style="color:var(--orange-ink);font-weight:650">Unconfirmed</span>') : '—') + '</dd>' +
    (p.deadlineSource ? '<dt>Source</dt><dd>' + esc(SOURCES[p.deadlineSource] || '') + '</dd>' : '') +
    (p.deadlineBasis ? '<dt>Rule</dt><dd>' + esc(p.deadlineBasis) + '</dd>' : '') +
    (p.policyUrl ? '<dt>Policy</dt><dd><a href="' + esc(p.policyUrl) + '" target="_blank" rel="noopener noreferrer">Open the policy ↗</a></dd>' : '') +
    (p.deadlineNote ? '<dt>Note</dt><dd>' + esc(p.deadlineNote) + '</dd>' : '') +
    '<dt>Reminders</dt><dd>' + (p.deadlineConfirmed ? reminderOffsets(p).map(n => n === 0 ? 'on the day' : n + 'd before').join(', ') || 'Off' : 'Start once confirmed') + '</dd></dl>' +
    '<div class="btnrow"><a class="btn ghost sm" href="#/edit/' + esc(p.id) + '?step=3">Edit deadline</a>' + (p.deadline ? '<button class="btn ghost sm" data-act="ics" data-id="' + esc(p.id) + '">Add to calendar</button>' : '') + '</div>' +
    (p.deadline ? '<p class="tiny" style="margin:8px 0 0">Calendar reminders work even when this app is closed. They use the reminder days above.</p>' : '') + '</div>';
  // Instructions
  h += '<div class="card"><h3>How to return it</h3><p style="margin:0 0 6px"><b>' + esc((METHODS[p.method] || METHODS.unknown).label) + '</b></p>' + (p.instructions ? '<p class="small" style="white-space:pre-wrap;margin:0">' + esc(p.instructions) + '</p>' : '<p class="small" style="margin:0">No instructions saved. Paste the seller\'s steps with Edit.</p>') + (p.returnRef ? '<p class="small" style="margin:8px 0 0">Return reference: <b>' + esc(p.returnRef) + '</b></p>' : '') + '</div>';
  // Purchase
  h += '<div class="card"><h3>Purchase</h3><dl class="kv">' + (p.orderNo ? '<dt>Order</dt><dd>' + esc(p.orderNo) + '</dd>' : '') + '<dt>Bought</dt><dd>' + (p.orderDate ? fmtLong(p.orderDate) : '—') + '</dd>' + (p.deliveredDate ? '<dt>Delivered</dt><dd>' + fmtLong(p.deliveredDate) + '</dd>' : '') + '<dt>Price</dt><dd>' + (p.price !== null && p.price !== undefined ? money(p.price) : '—') + '</dd></dl>' +
    '<h3 style="margin-top:14px">Receipt photos</h3>' + (p.photos.length ? photoStrip(p.photos, 'rm-photo') : '<p class="small" style="margin:0">None yet.</p>') + '<div class="btnrow"><label class="btn ghost sm" for="add-photo">' + I.camera.replace('<svg', '<svg style="width:18px;height:18px"') + 'Add photo<input id="add-photo" type="file" accept="image/*" multiple class="sr" data-upload="detail" data-id="' + esc(p.id) + '"></label><a class="btn ghost sm" href="#/edit/' + esc(p.id) + '">Edit details</a></div></div>';
  // Tracking
  h += '<div class="card"><h3>Tracking and receipt references</h3>' + (p.tracking.length ? '<ul class="cl">' + p.tracking.map(t => '<li><div style="flex:1;min-width:0"><b style="word-break:break-all">' + esc(t.ref) + '</b><div class="tiny">' + esc(t.label || 'Reference') + ' · added ' + fmtDate(t.added) + (t.link ? ' · <a href="' + esc(t.link) + '" target="_blank" rel="noopener noreferrer">open link ↗</a>' : '') + '</div></div><button class="x" aria-label="Copy" data-act="copy" data-text="' + esc(t.ref) + '" title="Copy">⧉</button><button class="x" aria-label="Remove reference" data-act="rm-track" data-id="' + esc(p.id) + '" data-tid="' + esc(t.id) + '">×</button></li>').join('') + '</ul>' : '<p class="small" style="margin:0">Save tracking numbers, drop-off receipts or return numbers here. The app does not look them up.</p>') +
    '<div class="btnrow"><button class="btn ghost sm" data-act="add-track" data-id="' + esc(p.id) + '">Add reference</button></div></div>';
  // History
  h += '<div class="card"><h3>History</h3><ul class="hist">' + p.history.slice().reverse().map(x => '<li><b>' + fmtDate(x.on) + '</b> · ' + (x.from === null ? 'Added' : x.from === x.to ? esc(x.note) : 'Marked ' + esc(statusLabel(x.to)) + (x.note ? ' — ' + esc(x.note) : '')) + '</li>').join('') + '</ul>' +
    '<div class="btnrow"><button class="btn danger sm" data-act="delete" data-id="' + esc(p.id) + '">Delete purchase</button></div></div>';
  return h;
}
function histDate(p, status) { for (let i = p.history.length - 1; i >= 0; i--) if (p.history[i].to === status && p.history[i].from !== status) return p.history[i].on; return null; }
function checklistTab(p) {
  const done = p.checklist.filter(c => c.done).length, n = p.checklist.length;
  let h = '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h3 style="margin:0">Return checklist</h3><span class="small">' + done + ' of ' + n + ' done</span></div><div class="bar" aria-hidden="true"><i style="width:' + (n ? Math.round(done / n * 100) : 0) + '%"></i></div>' +
    '<ul class="cl" style="margin-top:8px">' + p.checklist.map(c => '<li class="' + (c.done ? 'done' : '') + '"><input type="checkbox" id="c-' + esc(c.id) + '" data-act="tick" data-id="' + esc(p.id) + '" data-cid="' + esc(c.id) + '"' + (c.done ? ' checked' : '') + '><label for="c-' + esc(c.id) + '">' + esc(c.text) + '</label><button class="x" aria-label="Remove step" data-act="rm-step" data-id="' + esc(p.id) + '" data-cid="' + esc(c.id) + '">×</button></li>').join('') + '</ul>' +
    '<form data-form="add-step" data-id="' + esc(p.id) + '" style="display:flex;gap:8px;margin-top:10px"><input class="in" name="step" placeholder="Add your own step" aria-label="New step"><button class="btn ghost">Add</button></form>' +
    '<div class="btnrow"><button class="btn quiet sm" data-act="reset-steps" data-id="' + esc(p.id) + '">Use the standard steps for "' + esc((METHODS[p.method] || METHODS.unknown).label) + '"</button></div></div>';
  if (n && done === n && beforeSent(p)) h += '<div class="notice" style="margin-top:12px">' + I.check.replace('stroke-width="3"', 'stroke-width="2.5"') + '<div class="grow">All steps ticked. Ticking steps does not change the status by itself.<div class="btnrow" style="margin-top:8px">' + nextActions(p).filter(a => a[0] !== 'kept').slice(0, 1).map(([to, l]) => '<button class="btn sm primary" data-act="status" data-to="' + to + '" data-id="' + esc(p.id) + '">' + esc(l) + '</button>').join('') + '</div></div></div>';
  if (p.instructions) h += '<div class="card"><h3>Seller\'s instructions</h3><p class="small" style="white-space:pre-wrap;margin:0">' + esc(p.instructions) + '</p></div>';
  return h;
}
function refundTab(p) {
  const exp = p.expectedRefund, got = p.status === 'refund_received' ? p.receivedRefund : null;
  let h = '<div class="card"><h3>Refund</h3><div class="refbox"><div class="stat"><span>Expected</span><b>' + (exp !== null && exp !== undefined ? money(exp) : '—') + '</b></div><div class="stat' + (got !== null ? ' mint' : '') + '"><span>Received</span><b>' + (got !== null ? money(got) : 'Not yet') + '</b></div></div>';
  if (got !== null) {
    h += '<p class="small" style="margin:10px 0 0">You recorded ' + money(got) + ' on ' + fmtLong(p.refundDate) + (p.refundType && p.refundType !== 'original' ? ' as ' + (p.refundType === 'credit' ? 'store credit' : 'a gift card') : '') + '.</p>';
    if (exp && Math.abs(exp - got) >= 0.01) h += '<div class="notice sand diff">' + I.info + '<div>' + (got < exp ? 'That is ' + money(exp - got) + ' less than you expected. A shipping or restocking fee may explain it. If not, ask the seller.' : 'That is ' + money(got - exp) + ' more than you expected.') + '</div></div>';
  } else if (CLOSED[p.status]) {
    h += '<p class="small" style="margin:10px 0 0">' + esc(CLOSED[p.status]) + '. No refund counted.</p>';
  } else {
    h += '<form data-form="expected" data-id="' + esc(p.id) + '"><label class="f" for="exp-in">Refund you expect</label><div style="display:flex;gap:8px"><input class="in" id="exp-in" name="exp" inputmode="decimal" value="' + (exp !== null && exp !== undefined ? exp.toFixed(2) : '') + '"><button class="btn ghost">Save</button></div></form>';
    if (WAITING.includes(p.status)) {
      h += '<label class="f" for="fu-in">Check on the refund on</label><form data-form="followup" data-id="' + esc(p.id) + '" style="display:flex;gap:8px"><input class="in" id="fu-in" name="fu" type="date" value="' + esc(followUpDate(p)) + '"><button class="btn ghost">Save</button></form><p class="tiny" style="margin:6px 0 0">You\'ll get a reminder in the app that day if no refund is recorded.</p>';
      h += '<div class="btnrow"><button class="btn mint" data-act="status" data-to="refund_received" data-id="' + esc(p.id) + '">I received the refund</button></div>';
    } else h += '<p class="tiny" style="margin:8px 0 0">You can record the refund after the item is sent or returned.</p>';
  }
  h += '</div>';
  return h;
}

/* ----- Refunds, archive, search ----- */
function renderRefunds() {
  const P = state.purchases;
  const waiting = P.filter(p => WAITING.includes(p.status));
  const got = P.filter(p => p.status === 'refund_received').sort((a, b) => (b.refundDate || '').localeCompare(a.refundDate || ''));
  const real = x => x.filter(p => !p.sample);
  const sumE = real(waiting).reduce((s, p) => s + (p.expectedRefund || 0), 0), sumG = real(got).reduce((s, p) => s + (p.receivedRefund || 0), 0);
  let h = sampleBanner() + '<h1>Refunds</h1><p class="lead">Only refunds you record as received are counted as money back.</p><div class="refbox"><div class="stat"><span>Expected, not received yet</span><b>' + money(sumE) + '</b></div><div class="stat mint"><span>Received (recorded by you)</span><b>' + money(sumG) + '</b></div></div>';
  h += section('Waiting', waiting, { noDeadline: true, money: p => p.expectedRefund ? '<span class="tiny">expected</span><br>' + money(p.expectedRefund) : '<span class="tiny">no amount</span>' });
  h += section('Received', got, { noDeadline: true, money: p => money(p.receivedRefund) + (p.expectedRefund && p.receivedRefund < p.expectedRefund - 0.005 ? '<br><span class="tiny" style="color:var(--orange-ink)">' + money(p.expectedRefund - p.receivedRefund) + ' less</span>' : '') });
  if (!waiting.length && !got.length) h += '<div class="empty card">' + I.box + '<p>No refunds to track yet. Once you mark a return as sent, it shows here.</p></div>';
  return h;
}
function renderArchive() {
  const done = state.purchases.filter(p => DONE.includes(p.status)).sort((a, b) => (b.closedOn || '').localeCompare(a.closedOn || ''));
  let h = sampleBanner() + '<h1>Completed</h1><p class="lead">Refunds received, items you kept, and returns that did not happen.</p>';
  h += done.length ? '<div class="stack">' + done.map(p => card(p, { noDeadline: true, money: x => x.status === 'refund_received' ? money(x.receivedRefund) : '' })).join('') + '</div>' : '<div class="empty card">' + I.box + '<p>Nothing completed yet.</p></div>';
  return h;
}
const searchState = { q: '', status: '', dateField: 'orderDate', from: '', to: '' };
function searchResults() {
  const s = searchState, q = s.q.trim().toLowerCase();
  return state.purchases.filter(p => {
    if (q) { const hay = [p.store, p.item, p.orderNo, p.returnRef, p.deadlineNote, p.instructions, ...(p.tracking || []).map(t => t.ref)].join(' ').toLowerCase(); if (!q.split(/\s+/).every(w => hay.includes(w))) return false; }
    if (s.status === 'active' && !isActive(p)) return false;
    if (s.status && s.status !== 'active' && p.status !== s.status) return false;
    const dv = p[s.dateField];
    if ((s.from || s.to) && !dv) return false;
    if (s.from && dv < s.from) return false;
    if (s.to && dv > s.to) return false;
    return true;
  }).sort((a, b) => (b[s.dateField] || '').localeCompare(a[s.dateField] || ''));
}
function renderSearch() {
  const s = searchState;
  const r = searchResults();
  return '<h1>Search</h1><div class="card filters"><input class="in" type="search" id="q" data-search="q" value="' + esc(s.q) + '" placeholder="Store, item, order or tracking number" aria-label="Search">' +
    '<div class="row2"><select class="in" data-search="status" aria-label="Status"><option value="">Any status</option><option value="active"' + (s.status === 'active' ? ' selected' : '') + '>All active</option>' + STATUSES.map(x => '<option value="' + x.id + '"' + (s.status === x.id ? ' selected' : '') + '>' + x.label + '</option>').join('') + Object.keys(CLOSED).map(k => '<option value="' + k + '"' + (s.status === k ? ' selected' : '') + '>' + CLOSED[k] + '</option>').join('') + '</select>' +
    '<select class="in wide" data-search="dateField" aria-label="Date type"><option value="orderDate"' + (s.dateField === 'orderDate' ? ' selected' : '') + '>Purchase date</option><option value="deadline"' + (s.dateField === 'deadline' ? ' selected' : '') + '>Return deadline</option><option value="refundDate"' + (s.dateField === 'refundDate' ? ' selected' : '') + '>Refund date</option></select>' +
    '<span></span></div><div class="row2"><label class="small">From<input class="in" type="date" data-search="from" value="' + esc(s.from) + '"></label><label class="small">To<input class="in" type="date" data-search="to" value="' + esc(s.to) + '"></label><button class="btn quiet" data-act="clear-search" style="align-self:end">Clear</button></div></div>' +
    '<div id="results">' + resultsHTML(r) + '</div>';
}
function resultsHTML(r) { return '<p class="small" style="margin:14px 0 8px" aria-live="polite">' + plural(r.length, 'result') + '</p>' + (r.length ? '<div class="stack">' + r.map(p => card(p)).join('') + '</div>' : ''); }

/* ----- More, about, plans ----- */
function renderMore() {
  const s = S();
  return '<h1>Settings and help</h1>' +
    '<div class="card"><h3>Default reminders</h3><p class="small" style="margin:0 0 10px">For confirmed deadlines. Each purchase can change its own.</p><div class="chips" role="group" aria-label="Default reminder days">' + [14, 7, 3, 1, 0].map(n => '<button class="chip' + (s.reminders.includes(n) ? ' on' : '') + '" aria-pressed="' + s.reminders.includes(n) + '" data-act="set-rem" data-n="' + n + '">' + (n === 0 ? 'On the day' : n + (n === 1 ? ' day' : ' days')) + '</button>').join('') + '</div>' +
    '<label class="f" for="set-act">"Act soon" shows deadlines within</label><select class="in" id="set-act" data-setting="actSoon">' + [3, 5, 7, 10, 14].map(n => '<option value="' + n + '"' + (s.actSoon === n ? ' selected' : '') + '>' + n + ' days</option>').join('') + '</select>' +
    '<label class="f" for="set-fu">Remind me to check on a refund after</label><select class="in" id="set-fu" data-setting="followUp">' + [7, 10, 14, 21, 30].map(n => '<option value="' + n + '"' + (s.followUp === n ? ' selected' : '') + '>' + n + ' days</option>').join('') + '</select>' +
    '<label class="f" for="set-cur">Currency</label><select class="in" id="set-cur" data-setting="currency">' + ['USD', 'CAD', 'GBP', 'EUR', 'AUD'].map(c => '<option' + (s.currency === c ? ' selected' : '') + '>' + c + '</option>').join('') + '</select>' +
    '<p class="tiny" style="margin:10px 0 0">In-app reminders show when you open Return Rescue. For alerts when the app is closed, use "Add to calendar" on a purchase.</p></div>' +
    '<div class="card"><h3>Your data</h3><p class="small" style="margin:0 0 4px">Saved only in this browser on this device. No account. Clearing your browser data deletes it, so keep a backup.</p>' + (storageOK ? '' : '<div class="notice orange" style="margin:8px 0">' + I.info + '<div>Your browser is blocking storage. Changes will be lost when you close this page.</div></div>') +
    '<div class="btnrow"><button class="btn ghost sm" data-act="export">Download backup</button><label class="btn ghost sm" for="imp">Restore backup<input id="imp" type="file" accept="application/json,.json" class="sr" data-upload="import"></label>' + (state.purchases.some(p => p.sample) ? '<button class="btn ghost sm" data-act="remove-samples">Remove samples</button>' : '<button class="btn ghost sm" data-act="add-samples">Add sample purchases</button>') + '<button class="btn danger sm" data-act="wipe">Delete everything</button></div></div>' +
    '<div class="card"><h3>More</h3><div class="btnrow" style="margin-top:0"><a class="btn ghost sm" href="#/about">How it works</a><a class="btn ghost sm" href="#/plans">Plans</a><a class="btn ghost sm" href="#/archive">Completed returns</a></div></div>';
}
function renderAbout() {
  const row = (a, b, c) => '<tr><td>' + a + '</td><td>' + b + '</td><td>' + c + '</td></tr>';
  return '<h1>How it works</h1><p class="lead">Return Rescue is a manual tracker. It helps you remember and organize. It does not act for you.</p>' +
    '<div class="card"><table class="cmp"><thead><tr><th>Thing</th><th>This version</th><th>Not built (would need a real connection)</th></tr></thead><tbody>' +
    row('Purchases', '<span class="yes">You add them</span> by typing, pasting order text or adding a photo', 'Reading your email inbox or store accounts automatically') +
    row('Receipt photos', '<span class="yes">Saved with the purchase</span>', 'Reading text from photos (OCR)') +
    row('Return deadline', '<span class="yes">You confirm it</span> from the seller\'s policy; unconfirmed dates are labeled', 'Getting the policy from the retailer') +
    row('Return request', '<span class="yes">You mark it</span> after the seller confirms', 'Submitting a return to a store') +
    row('Shipping', '<span class="yes">You save the tracking number</span>', 'Live carrier tracking') +
    row('Refund', '<span class="yes">You record it</span> after you see it', 'Checking your bank or card') +
    row('Reminders', '<span class="yes">In the app</span> when you open it, and in your calendar via "Add to calendar"', 'Push notifications from a server') +
    '</tbody></table></div>' +
    '<div class="card"><h3>Promises this app keeps</h3><ul class="small" style="margin:0;padding-left:18px"><li>No return window is assumed. You add the deadline from the seller.</li><li>A return is never shown as requested, sent or refunded unless you mark it.</li><li>"Refunds you recorded" only counts refunds you marked as received. Sample data is never counted.</li><li>Data stays on your device.</li></ul></div>';
}
function planSheet(fromSave) {
  sheet('<h2 id="sheet-title">' + (fromSave ? 'You\'re tracking ' + activeCount() + ' active returns' : 'Plans') + '</h2>' +
    (fromSave ? '<p class="small">The free plan we\'re testing covers ' + CONFIG.freeActiveLimit + ' active returns at a time. Completed returns don\'t count.</p>' : '') +
    plansHTML() +
    '<div class="btnrow end">' + (fromSave ? '<button class="btn quiet" data-act="close-sheet">Back</button><button class="btn primary" data-act="force-save">Continue (free during the test)</button>' : '<button class="btn primary" data-act="close-sheet">Close</button>') + '</div>');
}
function plansHTML() {
  return '<div class="plans" style="margin-top:12px"><div class="plan"><b>Free</b><ul><li>Up to ' + CONFIG.freeActiveLimit + ' active returns</li><li>Deadlines, checklists, reminders, refund tracker</li><li>Unlimited completed history</li></ul></div>' +
    '<div class="plan alt"><b>Plus</b> <span class="pill-test">Idea, not for sale</span><ul><li>Unlimited active returns</li><li>Larger purchase history with search</li><li>Household sharing (not built yet)</li></ul><p class="tiny" style="margin:8px 0 0">No price set. Nothing can be bought.</p></div></div>' +
    '<div class="notice" style="margin-top:12px">' + I.info + '<div class="grow">' + (state.interest ? 'You said you\'d be interested on ' + fmtDate(state.interest) + '. ' : 'Would you want Plus? ') + 'This is saved only on this device. Nothing is sent and nothing is charged.' + (state.interest ? '' : '<div class="btnrow" style="margin-top:8px"><button class="btn sm ghost" data-act="interest">I\'d be interested</button></div>') + '</div></div>';
}
function renderPlans() { return '<h1>Plans</h1><p class="lead">We\'re testing a simple model: free for a small number of active returns, a paid plan later for bigger histories and households.</p>' + plansHTML(); }

/* ----- Status change sheets (confirmation required) ----- */
function statusSheet(p, to) {
  const store = p.method === 'store';
  let body = '', need = false;
  if (to === 'requested') { body = '<p>Only mark this after the <b>seller accepted your return request</b>, for example you got a return label, a return number or a confirmation email. Return Rescue can\'t send requests to stores.</p><label class="f" for="s-ref">Return number or reference <span class="opt">(optional)</span></label><input class="in" id="s-ref" name="reference" value="' + esc(p.returnRef || '') + '">'; need = 'The seller confirmed my return request'; }
  if (to === 'ready') body = '<p>Packed with everything it came with, label or QR code ready?</p>';
  if (to === 'sent') { body = '<p>' + (store ? 'Mark this after you handed the item over at the store.' : 'Mark this after you <b>handed the package over</b> or dropped it off.') + '</p><label class="f" for="s-date">Date</label><input class="in" id="s-date" name="date" type="date" value="' + today() + '" max="' + today() + '">' + (store ? '' : '<label class="f" for="s-trk">Tracking or drop-off receipt number <span class="opt">(optional)</span></label><input class="in" id="s-trk" name="tracking"><label class="f" for="s-car">Carrier or place <span class="opt">(optional)</span></label><input class="in" id="s-car" name="carrier">'); need = store ? 'I returned the item at the store' : 'I handed over or dropped off the package'; }
  if (to === 'refund_pending') body = '<p>The item is with the seller (or on its way) and you\'re waiting for the money. You\'ll get a reminder to check on it after ' + plural(S().followUp, 'day') + ' if no refund is recorded.</p>';
  if (to === 'refund_received') { body = '<p>Record the refund only once you can <b>see it</b> on your account, card statement or a refund receipt.</p><div class="grid2"><div><label class="f" for="s-amt">Amount received</label><input class="in" id="s-amt" name="amount" inputmode="decimal" placeholder="' + (p.expectedRefund ? p.expectedRefund.toFixed(2) : '0.00') + '"></div><div><label class="f" for="s-rd">Date received</label><input class="in" id="s-rd" name="date" type="date" value="' + today() + '" max="' + today() + '"></div></div><label class="f" for="s-type">Refunded as</label><select class="in" id="s-type" name="refundType"><option value="original">Money back to how I paid</option><option value="credit">Store credit</option><option value="giftcard">Gift card</option></select>'; need = 'I can see this refund on my account, statement or a refund receipt'; }
  if (to === 'kept') body = '<p>Move this to Completed as kept. No refund will be counted.</p>';
  if (to === 'missed') body = '<p>Move this to Completed as not returned. No refund will be counted.</p>';
  if (DONE.includes(p.status) && !DONE.includes(to)) body = '<p>Reopen this purchase as "' + esc(statusLabel(to)) + '"?' + (p.status === 'refund_received' ? ' The recorded refund will be removed from your total.' : '') + '</p>' + body;
  sheet('<h2 id="sheet-title">' + esc(statusLabel(to)) + '</h2><form data-form="status" data-id="' + esc(p.id) + '" data-to="' + to + '">' + body +
    (need ? '<label class="check"><input type="checkbox" name="confirm"><span>' + esc(need) + '</span></label>' : '') +
    '<p class="err small" role="alert" style="color:#9B2C2C;margin:8px 0 0"></p><div class="btnrow end"><button type="button" class="btn quiet" data-act="close-sheet">Cancel</button><button class="btn ' + (to === 'refund_received' ? 'mint' : 'primary') + '">Confirm</button></div></form>');
}
function anyStatusSheet(p) {
  const all = ORDER.concat(Object.keys(CLOSED)).filter(s => s !== p.status);
  sheet('<h2 id="sheet-title">Change status</h2><p class="small">This changes your own record. Use it to fix a mistake or skip a step.</p><div class="choice">' + all.map(s => '<button class="opt-card" data-act="status" data-to="' + s + '" data-id="' + esc(p.id) + '"><div><b>' + esc(statusLabel(s)) + '</b></div></button>').join('') + '</div><div class="btnrow end"><button class="btn quiet" data-act="close-sheet">Cancel</button></div>');
}
function submitStatus(form) {
  const p = byId(form.dataset.id), to = form.dataset.to, fd = new FormData(form), err = $('.err', form);
  if (!p) return closeSheet();
  if (form.querySelector('[name=confirm]') && !fd.get('confirm')) { err.textContent = 'Tick the box to confirm. If it hasn\'t happened yet, leave the status as it is.'; return; }
  const extra = { note: '' };
  if (to === 'requested') { extra.reference = (fd.get('reference') || '').trim(); if (extra.reference) extra.note = 'Reference ' + extra.reference; }
  if (to === 'sent') {
    const d = fd.get('date'); if (!isISO(d) || d > today()) { err.textContent = 'Pick the date you sent it (today or earlier).'; return; }
    extra.date = d; extra.tracking = (fd.get('tracking') || '').trim(); extra.carrier = (fd.get('carrier') || '').trim();
    extra.note = 'on ' + fmtDate(d) + (extra.tracking ? ', reference ' + extra.tracking : '');
  }
  if (to === 'refund_received') {
    const a = num(fd.get('amount')), d = fd.get('date');
    if (a === null || a <= 0) { err.textContent = 'Type the amount you received, like 24.99.'; return; }
    if (!isISO(d) || d > today()) { err.textContent = 'Pick the date you received it (today or earlier).'; return; }
    extra.amount = a; extra.date = d; extra.refundType = fd.get('refundType'); extra.note = money(a) + ' on ' + fmtDate(d);
  }
  if (p.status === 'refund_received' && to !== 'refund_received') { p.receivedRefund = null; p.refundDate = null; }
  setStatus(p, to, extra);
  closeSheet();
  if (to === 'refund_received') celebrate(p); else toast('Marked as ' + statusLabel(to));
  render();
}
function celebrate(p) {
  const dots = Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2, r = 80 + (i % 3) * 18; return '<i class="dot' + (i % 5 === 0 ? ' o' : i % 3 === 0 ? ' t' : '') + '" style="--x:' + Math.round(Math.cos(a) * r) + 'px;--y:' + Math.round(Math.sin(a) * r) + 'px"></i>'; }).join('');
  const el = document.createElement('div'); el.className = 'success'; el.setAttribute('role', 'status');
  el.innerHTML = '<div class="box">' + dots + '<svg class="ring" viewBox="0 0 110 110" aria-hidden="true"><circle cx="55" cy="55" r="48"/><path d="M34 57l14 14 28-30"/></svg><h2>Refund recorded</h2><div class="money">' + money(p.receivedRefund) + '</div><p class="small">back from ' + esc(p.store || 'the seller') + (p.sample ? ' (sample, not counted)' : '') + '. Moved to Completed.</p><button class="btn primary" data-act="close-success">Nice</button></div>';
  document.body.appendChild(el); el.querySelector('button').focus();
}

/* ---------- Router ---------- */
function go(h) { if (location.hash === h) render(); else location.hash = h; }
function route() {
  const raw = (location.hash || '#/home').slice(1), [path, qs] = raw.split('?'), parts = path.split('/').filter(Boolean);
  return { parts, q: new URLSearchParams(qs || '') };
}
function render() {
  const { parts, q } = route(), v = view(), name = parts[0] || 'home';
  let html = '', tab = name;
  if (name === 'home') html = renderHome();
  else if (name === 'add') { if (!draft || draft.mode !== 'add') draft = newDraft(); html = renderWizard(); }
  else if (name === 'edit') {
    const p = byId(parts[1]); if (!p) return go('#/home');
    if (!draft || draft.mode !== 'edit' || draft.p.id !== p.id) { draft = editDraft(p); const st = parseInt(q.get('step'), 10); if (st >= 2 && st <= 4) draft.step = st; }
    html = renderWizard(); tab = '';
  }
  else if (name === 'p') { const p = byId(parts[1]); if (!p) { html = '<div class="empty card"><p>This purchase was not found. It may have been deleted.</p><a class="btn primary" href="#/home">Home</a></div>'; } else html = renderDetail(p, parts[2]); tab = '' }
  else if (name === 'search') html = renderSearch();
  else if (name === 'refunds') html = renderRefunds();
  else if (name === 'archive') html = renderArchive();
  else if (name === 'more') { html = renderMore(); tab = ''; }
  else if (name === 'about') { html = renderAbout(); tab = ''; }
  else if (name === 'plans') { html = renderPlans(); tab = ''; }
  else return go('#/home');
  if (name !== 'add' && name !== 'edit' && draft && draft.mode === 'edit') draft = null;
  v.innerHTML = html;
  document.querySelectorAll('.tab').forEach(t => { const on = t.dataset.tab === tab; t.classList.toggle('on', on); if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
  $('#testpill').innerHTML = TEST_TODAY ? '<span class="pill-test" title="Test date set in the address">Test ' + esc(fmtDate(TEST_TODAY, { year: undefined })) + '</span>' : '';
  hydratePhotos(v);
  const titles = { home: 'Home', add: 'Add a purchase', edit: 'Edit purchase', p: 'Purchase', search: 'Search', refunds: 'Refunds', archive: 'Completed', more: 'Settings', about: 'How it works', plans: 'Plans' };
  document.title = (titles[name] ? titles[name] + ' · ' : '') + 'Return Rescue';
}
let lastPath = '';
window.addEventListener('hashchange', () => {
  const ov = $('.success'); if (ov) ov.remove();
  const p = route().parts.join('/');
  render();
  if (p !== lastPath) { window.scrollTo(0, 0); view().focus({ preventScroll: true }); }
  lastPath = p;
});

/* ---------- Events ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const act = t.dataset.act, id = t.dataset.id, p = id ? byId(id) : null;
  if (act === 'close-sheet-bg') { if (e.target === t) closeSheet(); return; }
  if (act !== 'tick') e.preventDefault();
  switch (act) {
    case 'close-sheet': closeSheet(); break;
    case 'close-success': t.closest('.success').remove(); go('#/p/' + (route().parts[1] || '')); break;
    case 'pick': {
      const k = t.dataset.key, val = t.dataset.val;
      if (k === 'start') draft.start = val; else if (k === 'dlMode') draft.dlMode = val; else draft.p[k] = val;
      render(); break;
    }
    case 'wiz-next': {
      if (draft.step === 1) { if (draft.text.trim()) applyParsed(); draft.step = 2; render(); window.scrollTo(0, 0); break; }
      const err = wizardValidate(); if (err) { toast(err); break; }
      draft.step++; render(); window.scrollTo(0, 0); break;
    }
    case 'wiz-back': draft.step = Math.max(draft.mode === 'edit' ? 2 : 1, draft.step - 1); render(); break;
    case 'wiz-save': { const err = wizardValidate(); if (err) { toast(err); break; } finishWizard(false); break; }
    case 'force-save': finishWizard(true); break;
    case 'toggle-rem': {
      const n = +t.dataset.n, cur = (Array.isArray(draft.p.reminders) ? draft.p.reminders : S().reminders).slice();
      draft.p.reminders = cur.includes(n) ? cur.filter(x => x !== n) : cur.concat(n); render(); break;
    }
    case 'set-rem': { const n = +t.dataset.n, r = S().reminders; S().reminders = r.includes(n) ? r.filter(x => x !== n) : r.concat(n); save(); render(); break; }
    case 'rm-draft-photo': { draft.p.photos = draft.p.photos.filter(x => x !== t.dataset.photoId); PhotoDB.del(t.dataset.photoId).catch(() => {}); render(); break; }
    case 'rm-item-photo': { const pid = draft.p.itemPhoto; draft.p.itemPhoto = null; if (!(draft.mode === 'edit' && byId(draft.p.id) && byId(draft.p.id).itemPhoto === pid)) PhotoDB.del(pid).catch(() => {}); render(); break; }
    case 'rm-photo': { const pp = byId(route().parts[1]); if (pp && confirm('Remove this photo?')) { pp.photos = pp.photos.filter(x => x !== t.dataset.photoId); save(); PhotoDB.del(t.dataset.photoId).catch(() => {}); render(); } break; }
    case 'view-photo': { const u = await photoURL(t.dataset.photoId); if (u) sheet('<h2 id="sheet-title">Photo</h2><div class="viewer"><img src="' + u + '" alt="Receipt photo"></div><div class="btnrow end"><button class="btn primary" data-act="close-sheet">Close</button></div>'); break; }
    case 'status': if (p) { closeSheet(); statusSheet(p, t.dataset.to); } break;
    case 'status-any': if (p) anyStatusSheet(p); break;
    case 'dismiss': {
      if (!p) break; const key = t.dataset.key;
      if (key.startsWith('f@')) { p.followUpDate = addDays(today(), 7); toast('We\'ll remind you on ' + fmtDate(p.followUpDate)); }
      else { p.dismissed.push(key); const later = reminderOffsets(p).filter(n => n < daysBetween(today(), p.deadline)); toast(later.length ? 'Next reminder: ' + (Math.max(...later) === 0 ? 'on the day' : plural(Math.max(...later), 'day') + ' before') : 'No more reminders for this one'); }
      save(); render(); break;
    }
    case 'tick': {
      if (!p) break; const c = p.checklist.find(x => x.id === t.dataset.cid); if (c) { c.done = t.checked; save(); setTimeout(render, 0); } break;
    }
    case 'rm-step': if (p) { p.checklist = p.checklist.filter(x => x.id !== t.dataset.cid); save(); render(); } break;
    case 'reset-steps': if (p && confirm('Replace this checklist with the standard steps? Your ticks will be cleared.')) { p.checklist = checklistFor(p.method); save(); render(); } break;
    case 'add-track': if (p) sheet('<h2 id="sheet-title">Add a reference</h2><form data-form="track" data-id="' + esc(p.id) + '"><label class="f" for="t-ref">Tracking, receipt or return number</label><input class="in" id="t-ref" name="ref" required><label class="f" for="t-l">What is it? <span class="opt">(optional)</span></label><input class="in" id="t-l" name="label" placeholder="e.g. Carrier tracking, drop-off receipt"><label class="f" for="t-link">Link <span class="opt">(optional, from your email)</span></label><input class="in" id="t-link" name="link" type="url" placeholder="https://"><p class="err small" role="alert" style="color:#9B2C2C"></p><div class="btnrow end"><button type="button" class="btn quiet" data-act="close-sheet">Cancel</button><button class="btn primary">Save</button></div></form>'); break;
    case 'rm-track': if (p) { p.tracking = p.tracking.filter(x => x.id !== t.dataset.tid); save(); render(); } break;
    case 'copy': try { await navigator.clipboard.writeText(t.dataset.text); toast('Copied'); } catch (er) { toast('Could not copy. Press and hold to select it.'); } break;
    case 'ics': if (p) { download('return-' + (p.item || 'purchase').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) + '.ics', makeICS(p), 'text/calendar'); toast('Calendar file downloaded. Open it to add the reminders.'); } break;
    case 'delete': if (p && confirm('Delete "' + (p.item || 'this purchase') + '" and its photos? This can\'t be undone.')) { state.purchases = state.purchases.filter(x => x !== p); save(); p.photos.concat(p.itemPhoto || []).forEach(ph => PhotoDB.del(ph).catch(() => {})); toast('Deleted'); go('#/home'); } break;
    case 'add-samples': state.purchases = state.purchases.concat(makeSamples()); save(); toast('Sample purchases added. They are made up.'); go('#/home'); break;
    case 'remove-samples': state.purchases = state.purchases.filter(x => !x.sample); save(); toast('Samples removed'); render(); break;
    case 'clear-search': Object.assign(searchState, { q: '', status: '', dateField: 'orderDate', from: '', to: '' }); render(); break;
    case 'interest': state.interest = today(); save(); toast('Saved on this device. Nothing was sent.'); if ($('.sheet')) planSheet(route().parts[0] === 'add'); else render(); break;
    case 'export': {
      const photos = {};
      for (const pp of state.purchases) for (const ph of pp.photos.concat(pp.itemPhoto || [])) { try { const b = await PhotoDB.get(ph); if (b) photos[ph] = await blobToDataURL(b); } catch (er) {} }
      download('return-rescue-backup-' + today() + '.json', JSON.stringify({ app: 'return-rescue', exported: new Date().toISOString(), data: state, photos }, null, 1), 'application/json');
      toast('Backup downloaded'); break;
    }
    case 'wipe': if (confirm('Delete all purchases, photos and settings on this device? This can\'t be undone.')) { state = blank(); save(); try { const ks = await PhotoDB.keys(); for (const k of ks) await PhotoDB.del(k); } catch (er) {} toast('Everything deleted'); go('#/home'); } break;
  }
});
function blobToDataURL(b) { return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); }

document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.k && draft) {
    draft.p[t.dataset.k] = t.type === 'checkbox' ? t.checked : t.value;
    if (t.dataset.k === 'deadlineSource') { if (t.value === 'other') draft.p.deadlineConfirmed = false; render(); return; }
    if (['deadline', 'orderDate'].includes(t.dataset.k) && $('#dl-warn')) $('#dl-warn').innerHTML = deadlineWarn();
  }
  if (t.dataset.draft && draft) {
    draft[t.dataset.draft] = t.value;
    if ($('#calc-out')) { $('#calc-out').innerHTML = calcOut(); if ($('#dl-warn')) $('#dl-warn').innerHTML = deadlineWarn(); }
  }
  if (t.dataset.search) { searchState[t.dataset.search] = t.value; $('#results').innerHTML = resultsHTML(searchResults()); }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset.search && t.tagName === 'SELECT') { searchState[t.dataset.search] = t.value; $('#results').innerHTML = resultsHTML(searchResults()); }
  if (t.dataset.setting) { S()[t.dataset.setting] = t.dataset.setting === 'currency' ? t.value : +t.value; save(); toast('Saved'); }
  if (t.dataset.k === 'deadlineConfirmed' && draft) draft.p.deadlineConfirmed = t.checked;
  if (t.dataset.draft === 'calcFrom' && draft) { draft.calcFrom = t.value; $('#calc-out').innerHTML = calcOut(); }
  if (t.dataset.upload) {
    const files = Array.from(t.files || []); if (!files.length) return;
    if (t.dataset.upload === 'import') return importBackup(files[0]);
    const ids = [];
    for (const f of files.slice(0, 6)) { try { ids.push(await storePhoto(f)); } catch (er) { toast(er && er.message && /image/.test(er.message) ? 'That file could not be opened as a photo.' : 'Photos can\'t be saved in this browser.'); } }
    if (!ids.length) return;
    if (t.dataset.upload === 'receipt') draft.p.photos = draft.p.photos.concat(ids);
    if (t.dataset.upload === 'item') draft.p.itemPhoto = ids[0];
    if (t.dataset.upload === 'detail') { const p = byId(t.dataset.id); if (p) { p.photos = p.photos.concat(ids); save(); } }
    toast(ids.length === 1 ? 'Photo saved on this device' : ids.length + ' photos saved on this device');
    render();
  }
});
document.addEventListener('submit', e => {
  const f = e.target; if (!f.dataset.form) return; e.preventDefault();
  const p = byId(f.dataset.id), fd = new FormData(f);
  if (f.dataset.form === 'status') return submitStatus(f);
  if (!p) return;
  if (f.dataset.form === 'add-step') { const s = (fd.get('step') || '').trim(); if (s) { p.checklist.push({ id: uid(), text: s.slice(0, 140), done: false }); save(); render(); setTimeout(() => { const i = $('[name=step]'); if (i) i.focus(); }, 0); } }
  if (f.dataset.form === 'expected') { const v = fd.get('exp'); const n = num(v); if (v.trim() && n === null) return toast('Type a number, like 24.99'); p.expectedRefund = n; save(); toast('Saved'); render(); }
  if (f.dataset.form === 'followup') { const v = fd.get('fu'); if (!isISO(v)) return toast('Pick a date'); p.followUpDate = v; save(); toast('We\'ll remind you on ' + fmtDate(v)); render(); }
  if (f.dataset.form === 'track') {
    const ref = (fd.get('ref') || '').trim(), link = (fd.get('link') || '').trim();
    if (!ref) { $('.err', f).textContent = 'Type the number.'; return; }
    if (link && !/^https?:\/\//i.test(link)) { $('.err', f).textContent = 'The link should start with https://'; return; }
    p.tracking.push({ id: uid(), ref: ref.slice(0, 80), label: (fd.get('label') || '').trim().slice(0, 60), link, added: today() }); save(); closeSheet(); render();
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { const s = $('.success'); if (s) { s.remove(); return; } if ($('.scrim')) closeSheet(); }
});
async function importBackup(file) {
  try {
    const j = JSON.parse(await file.text());
    if (!j || j.app !== 'return-rescue' || !j.data || !Array.isArray(j.data.purchases)) throw new Error('bad');
    if (!confirm('Replace everything on this device with this backup (' + plural(j.data.purchases.length, 'purchase') + ')?')) return;
    for (const [k, v] of Object.entries(j.photos || {})) { try { const b = await (await fetch(v)).blob(); await PhotoDB.put(k, b); } catch (er) {} }
    state = j.data; state.settings = Object.assign({}, CONFIG.defaults, state.settings || {}); state.purchases.forEach(normalize);
    save(); toast('Backup restored'); go('#/home');
  } catch (er) { toast('That file is not a Return Rescue backup.'); }
}

/* ---------- Start ---------- */
lastPath = route().parts.join('/');
render();
if (!storageOK) toast('Your browser is blocking storage. Nothing will be saved.');
cleanOrphanPhotos();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__RR = { parseOrderText, makeICS, dueReminders, deadlineInfo, state: () => state, today };
})();
