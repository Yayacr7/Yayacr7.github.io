// Shared engine for the business booking apps. Each app page sets window.APP (its data) before loading this file.
(function(){
const A = window.APP;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
const KEY = 'bk_' + A.slug;
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const ICONS = {
  phone:'<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z"/>',
  cal:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>'
};
const svg = (k, s=16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;

// ---------- time in Minnesota ----------
function mnNow(){
  const p = new Intl.DateTimeFormat('en-US', {timeZone:'America/Chicago', weekday:'short', hour:'numeric', minute:'numeric', hour12:false}).formatToParts(new Date());
  const g = t => (p.find(x => x.type === t) || {}).value;
  return {day: SHORT.indexOf(g('weekday')), min: (Number(g('hour')) % 24) * 60 + Number(g('minute'))};
}
const toMin = s => { const [h,m] = s.split(':').map(Number); return h*60 + (m||0); };
function fmt(s){ let [h,m] = s.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return m ? `${h}:${String(m).padStart(2,'0')} ${ap}` : `${h} ${ap}`; }
function dayText(d){
  const H = A.hours; if (!H) return '';
  if (!(d in H)) return 'Not listed';
  const v = H[d];
  if (v === null) return 'Closed';
  if (typeof v === 'string') return v;
  return v.map(([a,b]) => `${fmt(a)} – ${fmt(b)}`).join(', ');
}
function status(){
  const H = A.hours; if (!H) return null;
  const n = mnNow();
  const today = H[n.day];
  if (Array.isArray(today)){
    for (const [a,b] of today){
      const o = toMin(a), c = toMin(b);
      if (n.min >= o && n.min < c) return c - n.min <= 45 ? {cls:'soon', t:`Closing soon · ${fmt(b)}`} : {cls:'open', t:`Open now · until ${fmt(b)}`};
      if (n.min < o) return {cls:'', t:`Closed now · opens ${fmt(a)} today`};
    }
  }
  if (!(n.day in H) || (typeof today === 'string')) return {cls:'', t: typeof today === 'string' ? 'Call to check today’s hours' : 'Today’s hours are not listed · call to check'};
  for (let i = 1; i <= 7; i++){
    const d = (n.day + i) % 7, v = H[d];
    if (!(d in H)) return {cls:'', t:`Closed now · ${DAYS[d]}: not listed, call to check`};
    if (Array.isArray(v) && v.length) return {cls:'', t:`Closed now · opens ${i === 1 ? 'tomorrow' : DAYS[d]} ${fmt(v[0][0])}`};
    if (typeof v === 'string') return {cls:'', t:`Closed now · ${DAYS[d]}: ${v}`};
  }
  return {cls:'', t:'Closed'};
}

// ---------- page ----------
const tel = A.phone ? 'tel:' + A.phone : '';
const sms = A.text ? 'sms:' + A.text : '';
const maps = A.address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(A.name + ' ' + A.address) : '';
const primary = A.mode === 'request' ? {label: A.cta || 'Request an appointment', start:true} : (A.links || []).find(l => l.primary);

function header(){
  return `<div class="demo">Demo by AdSharp · not the official ${esc(A.name)} app</div>
  <div class="headband"><div class="wrap"><header class="top">
    <button class="logo" type="button" id="logoBtn" aria-label="${esc(A.name)} home"><span class="mk">${A.mark}</span><span><b>${esc(A.name)}</b><small>${esc(A.kicker)}</small></span></button>
    <span class="sp"></span>
    ${A.mode === 'request' ? `<button class="tbtn" type="button" id="mineBtn">${svg('cal')}<span class="t">My requests</span></button>` : ''}
    ${tel ? `<a class="tbtn solid" href="${tel}">${svg('phone')}<span class="t">${esc(A.phoneShow)}</span></a>` : ''}
  </header></div></div>`;
}
function todayCard(){
  const st = status();
  const n = mnNow();
  const row = (k, v) => `<div><span>${k}</span><span>${v}</span></div>`;
  return `<div class="week">
    ${st ? `<div class="st"><span class="dotlive ${st.cls}"></span><span>${esc(st.t)}</span></div>` : `<div class="st"><span class="dotlive"></span><span>Hours not listed · call to check</span></div>`}
    <div class="rows">
      ${A.hours ? row('Today', esc(dayText(n.day))) : ''}
      ${A.phoneShow ? row('Phone', `<a href="tel:${A.phone}" style="text-decoration:none">${esc(A.phoneShow)}</a>`) : ''}
      ${row('Address', A.address ? esc(A.address.replace(/, MN \d{5}$/, '')) : 'Call to confirm')}
    </div></div>`;
}
const autoLead = () => A.mode === 'request'
  ? `Pick what you need and the days that work. ${A.email || A.text ? 'Your request goes straight to them' : 'Then call them with your request ready'}, and they confirm.`
  : `See their services and hours, then tap “${primary.label}” to book on their own booking page.`;
function ctaButtons(){
  const out = [];
  if (primary) out.push(primary.start ? `<button class="btn hero1" type="button" data-start="">${esc(primary.label)} →</button>` : `<a class="btn hero1" href="${esc(primary.url)}" target="_blank" rel="noopener">${esc(primary.label)} ${svg('ext')}</a>`);
  if (tel) out.push(`<a class="btn hero2" href="${tel}">${svg('phone')} Call</a>`);
  if (sms) out.push(`<a class="btn hero2" href="${sms}">Text</a>`);
  return out.join('');
}
function cardsHTML(group){
  const list = A.services.filter(s => !group || s.group === group);
  return list.map(s => {
    let go = '';
    if (A.mode === 'request') go = `<button class="go" type="button" data-start="${esc(s.name)}">${esc(A.cardCta || 'Request this')} →</button>`;
    else if (s.url || primary) go = `<a class="go" href="${esc(s.url || primary.url)}" target="_blank" rel="noopener">${esc(s.cta || A.cardCta || 'Book')} ↗</a>`;
    return `<div class="card" style="--bar:${s.color || 'var(--accent)'}"><b>${esc(s.name)}</b>${s.price ? `<span class="pr">${esc(s.price)}</span>` : ''}${s.desc ? `<p>${esc(s.desc)}</p>` : ''}${go}</div>`;
  }).join('');
}
function home(){
  const groups = [...new Set(A.services.map(s => s.group).filter(Boolean))];
  return `<main id="home">
  <section class="band b-hero"><div class="glow g1"></div><div class="glow g2"></div><div class="wrap"><div class="hero">
    <div><div class="eyebrow">${esc(A.eyebrow)}</div><h1>${esc(A.name)}</h1><p class="lead">${esc(autoLead())}</p>
      <div class="ctas">${ctaButtons()}</div></div>
    ${todayCard()}
  </div></div></section>
  <section class="band b-s1"><div class="wrap sec">
    <h2>${esc(A.servicesTitle || 'What they offer')}</h2><p class="sub">${esc(A.servicesSub || '')}</p>
    ${groups.length > 1 ? `<div class="tabs" role="tablist">${groups.map((g,i) => `<button type="button" role="tab" data-tab="${esc(g)}" aria-selected="${i===0}">${esc(g)}</button>`).join('')}</div>` : ''}
    <div class="cards" id="cards">${cardsHTML(groups.length > 1 ? groups[0] : null)}</div>
    ${A.priceNote ? `<p class="note">${esc(A.priceNote)}</p>` : ''}
  </div></section>
  <section class="band b-s2"><div class="wrap sec">
    <h2>${esc(A.infoTitle || 'Good to know')}</h2><p class="sub">${esc(A.infoSub || (A.site ? 'Straight from their own website.' : 'From public business listings. Call to confirm.'))}</p>
    <div class="info">
      <div class="panelw"><h3>${A.hours ? 'Hours' : 'Visit'}</h3>${A.hours ? `<div class="hrs">${[1,2,3,4,5,6,0].map(d => `<div class="${d === mnNow().day ? 'today' : ''}"><span>${DAYS[d]}</span><span>${esc(dayText(d))}</span></div>`).join('')}</div>` : `<p style="margin:0;color:var(--dim)">${esc(A.hoursNote || 'Hours are not listed. Call to check.')}</p>`}
        ${A.address ? `<p style="margin:14px 0 0"><b>${esc(A.address)}</b></p><div class="linkrow"><a class="btn ghost sm" href="${maps}" target="_blank" rel="noopener">Directions ↗</a></div>` : ''}
        ${A.locations ? A.locations.map(l => `<p style="margin:14px 0 0"><b>${esc(l.name)}</b><br><span style="color:var(--dim)">${esc(l.address)}${l.phone ? ' · ' + esc(l.phone) : ''}</span></p>`).join('') : ''}</div>
      <div class="panelw"><h3>${esc(A.notesTitle || 'Before you go')}</h3><ul class="notes">${(A.notes || []).map(n => `<li>${esc(n)}</li>`).join('')}</ul>
        ${(A.links || []).filter(l => !l.primary).length ? `<div class="linkrow">${A.links.filter(l => !l.primary).map(l => `<a class="btn ghost sm" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div>` : ''}</div>
    </div>
  </div></section>
  <section class="band b-ink"><div class="wrap sec">
    <h2>Contact ${esc(A.name)}</h2><p class="sub">Everything you need to reach them in one place.</p>
    <div class="cgrid">
      ${tel ? `<a class="cbox" href="${tel}"><span class="k">Phone</span><span class="v">${esc(A.phoneShow)}</span><span class="a">Call →</span></a>` : ''}
      ${sms ? `<a class="cbox" href="${sms}"><span class="k">Text</span><span class="v">${esc(A.textShow || A.phoneShow)}</span><span class="a">Text →</span></a>` : ''}
      ${A.email ? `<a class="cbox" href="mailto:${esc(A.email)}"><span class="k">Email</span><span class="v">${esc(A.email)}</span><span class="a">Email →</span></a>` : ''}
      ${A.address ? `<a class="cbox" href="${maps}" target="_blank" rel="noopener"><span class="k">Address</span><span class="v">${esc(A.address)}</span><span class="a">Directions ↗</span></a>` : ''}
      ${A.site ? `<a class="cbox" href="${esc(A.site)}" target="_blank" rel="noopener"><span class="k">Website</span><span class="v">${esc(A.site.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,''))}</span><span class="a">Visit ↗</span></a>` : ''}
    </div>
    <p class="src">${A.source}</p>
  </div></section>
  <div class="band b-foot"><div class="wrap"><p class="foot">Demo app made by AdSharp to show ${esc(A.name)} what a modern booking app could look like. It is not their official app. ${esc(A.footNote || '')} No reviews or ratings are shown. Prices, if shown, are the ones on their own website and may change.</p></div></div>
  </main>
  <div class="wrap"><section id="flow" class="hide"><div class="flowtop"><div class="bar" id="bar"></div><div class="what" id="stepName"></div></div><div id="stage"></div></section>
  <section id="mine" class="hide" style="padding:24px 0 40px"></section></div>
  <nav class="nav hide" id="nav"><div class="in"><button class="btn ghost" id="backBtn" type="button">Back</button><div class="sum" id="sum"></div><button class="btn main" id="nextBtn" type="button">Continue</button></div></nav>`;
}

// ---------- request flow ----------
const R = A.request || {};
const STEPS = (R.steps || []).concat([{type:'review', title:'Review'}]);
const blank = () => ({svc: [], f: {}, days: [], slot: '', name:'', phone:'', email:'', contact: (R.contactDefault || 'call'), street:'', city: (R.cities || [''])[0], zip:'', notes:''});
let B = Object.assign(blank(), store.get(KEY + '_draft', {}));
const save = () => store.set(KEY + '_draft', B);
let step = 0, viewMonth = null;
const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const fromIso = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const fmtDay = s => fromIso(s).toLocaleDateString('en-US',{weekday:'short', month:'short', day:'numeric'});
const lead = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + (R.leadDays ?? 1)); return d; };
const maxD = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + (R.maxDays || 75)); return d; };
B.days = (B.days || []).filter(d => d >= iso(lead()));

function show(id){ ['home','flow','mine'].forEach(x => $('#'+x).classList.toggle('hide', x !== id)); $('#nav').classList.toggle('hide', id !== 'flow'); window.scrollTo(0,0); }
function start(svc){
  if (svc){ B.svc = [svc]; save(); }
  step = 0; viewMonth = null; show('flow'); render();
}
const visible = f => !f.showIf || [].concat(f.showIf.in).includes(String(B.f[f.showIf.id] ?? ''));
function field(f){
  if (!visible(f)) return '';
  const v = B.f[f.id] ?? f.def ?? '';
  if (B.f[f.id] === undefined && f.def !== undefined) B.f[f.id] = f.def;
  const lab = `${esc(f.label)}${f.optional ? ' <em>(optional)</em>' : ''}`;
  if (f.type === 'seg') return `<h3>${lab}</h3><div class="seg">${f.options.map(o => `<button type="button" data-fs="${esc(f.id)}" data-v="${esc(o)}" aria-pressed="${String(v) === String(o)}">${esc(o)}</button>`).join('')}</div>${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}`;
  if (f.type === 'multi') { const arr = Array.isArray(v) ? v : []; return `<h3>${lab}</h3><div class="opts">${f.options.map(o => `<button type="button" class="opt sq" data-fm="${esc(f.id)}" data-v="${esc(o)}" aria-pressed="${arr.includes(o)}"><b>${esc(o)}</b><i class="chk"></i></button>`).join('')}</div>`; }
  if (f.type === 'count') return `<div style="margin-top:12px" class="cnt"><b>${esc(f.label)}</b><div class="ctl"><button type="button" data-fc="${esc(f.id)}" data-d="-1" aria-label="Less">−</button><output id="o_${esc(f.id)}">${esc(v)}</output><button type="button" data-fc="${esc(f.id)}" data-d="1" aria-label="More">+</button></div></div>`;
  if (f.type === 'select') return `<label class="f" for="f_${esc(f.id)}">${lab}</label><select class="t" id="f_${esc(f.id)}" data-fk="${esc(f.id)}">${f.options.map(o => `<option ${String(v) === String(o) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  if (f.type === 'textarea') return `<label class="f" for="f_${esc(f.id)}">${lab}</label><textarea class="t" id="f_${esc(f.id)}" data-fk="${esc(f.id)}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>`;
  if (f.type === 'date') return `<label class="f" for="f_${esc(f.id)}">${lab}</label><input class="t" type="date" id="f_${esc(f.id)}" data-fk="${esc(f.id)}" min="${iso(lead())}" value="${esc(v)}">`;
  return `<label class="f" for="f_${esc(f.id)}">${lab}</label><input class="t" id="f_${esc(f.id)}" data-fk="${esc(f.id)}" ${f.num ? 'inputmode="numeric"' : ''} placeholder="${esc(f.ph || '')}" value="${esc(v)}">`;
}
function vStep(s){
  if (s.type === 'service'){
    const multi = s.multi;
    const list = (s.options || A.services.map(x => ({name:x.name, desc:x.desc})));
    return `<h2>${esc(s.title)}</h2><p class="sub">${esc(s.sub || '')}</p>
      <div class="opts">${list.map(o => `<button type="button" class="opt${multi ? ' sq' : ''}" data-svc="${esc(o.name)}" aria-pressed="${B.svc.includes(o.name)}"><b>${esc(o.name)}</b>${o.desc ? `<span>${esc(o.desc)}</span>` : ''}<i class="chk"></i></button>`).join('')}</div>
      ${(s.fields || []).map(field).join('')}`;
  }
  if (s.type === 'fields') return `<h2>${esc(s.title)}</h2><p class="sub">${esc(s.sub || '')}</p>${s.fields.map(field).join('')}<div class="err" id="err"></div>`;
  if (s.type === 'when') return vWhen(s);
  if (s.type === 'where') return `<h2>${esc(s.title || 'Where?')}</h2><p class="sub">${esc(s.sub || '')}</p>
    <label class="f" for="street">Street address</label><input class="t" id="street" data-k="street" autocomplete="street-address" placeholder="1234 Main St NE" value="${esc(B.street)}">
    <div class="row2"><div><label class="f" for="city">City</label><select class="t" id="city" data-k="city">${(R.cities || ['Other']).map(c => `<option ${B.city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
    <div><label class="f" for="zip">ZIP code</label><input class="t" id="zip" data-k="zip" inputmode="numeric" maxlength="5" autocomplete="postal-code" value="${esc(B.zip)}"></div></div>
    ${(s.fields || []).map(field).join('')}<div class="err" id="err"></div>`;
  if (s.type === 'contact') return `<h2>${esc(s.title || 'How can they reach you?')}</h2><p class="sub">${esc(s.sub || 'So they can confirm with you.')}</p>
    <label class="f" for="name">Your name</label><input class="t" id="name" data-k="name" autocomplete="name" value="${esc(B.name)}">
    <div class="row2"><div><label class="f" for="phone">Phone</label><input class="t" id="phone" data-k="phone" type="tel" autocomplete="tel" placeholder="(763) 555-0123" value="${esc(B.phone)}"></div>
    <div><label class="f" for="email">Email <em>(optional)</em></label><input class="t" id="email" data-k="email" type="email" autocomplete="email" value="${esc(B.email)}"></div></div>
    <h3>Best way to reach you</h3><div class="seg">${['Call','Text','Email'].map(o => `<button type="button" data-k2="contact" data-v="${o.toLowerCase()}" aria-pressed="${B.contact === o.toLowerCase()}">${o}</button>`).join('')}</div>
    <label class="f" for="notes">Anything else? <em>(optional)</em></label><textarea class="t" id="notes" data-k="notes" placeholder="${esc(s.ph || '')}">${esc(B.notes)}</textarea><div class="err" id="err"></div>`;
  return vReview();
}
const isRange = s => s.mode === 'range' || (s.rangeFor && s.rangeFor.includes(B.svc[0]));
function allowed(d){ const H = A.hours; const w = R.weekdays; if (w) return w.includes(d.getDay()); if (H && d.getDay() in H && H[d.getDay()] === null) return false; return true; }
function vWhen(s){
  const mn = lead(), mx = maxD(), range = isRange(s);
  if (!viewMonth) viewMonth = new Date(mn.getFullYear(), mn.getMonth(), 1);
  const y = viewMonth.getFullYear(), m = viewMonth.getMonth(), first = new Date(y, m, 1).getDay(), n = new Date(y, m+1, 0).getDate();
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<span></span>';
  for (let d = 1; d <= n; d++){
    const dt = new Date(y, m, d), s2 = iso(dt), idx = B.days.indexOf(s2);
    const off = dt < mn || dt > mx || !allowed(dt);
    const inr = range && B.days.length === 2 && s2 > B.days[0] && s2 < B.days[1];
    cells += `<button type="button" class="day${inr ? ' inrange' : ''}" data-day="${s2}" ${off ? 'disabled' : ''} aria-pressed="${idx >= 0}" aria-label="${fmtDay(s2)}">${d}${idx >= 0 && !range ? `<span class="n">${idx+1}</span>` : ''}</button>`;
  }
  const prevOk = new Date(y, m, 1) > new Date(mn.getFullYear(), mn.getMonth(), 1), nextOk = new Date(y, m+1, 1) <= mx;
  const lbl = range ? ['Check-in','Check-out'] : null;
  const picked = B.days.length ? B.days.map((d,i) => `<div><i>${range ? lbl[i] : i+1}</i>${fmtDay(d)}<button type="button" data-unpick="${d}">Remove</button></div>`).join('') + (range && B.days.length === 2 ? `<div><i>Nights</i>${Math.round((fromIso(B.days[1]) - fromIso(B.days[0])) / 864e5)}</div>` : '') : `<div class="empty">${range ? 'Tap your check-in day, then your check-out day' : 'No days picked yet'}</div>`;
  return `<h2>${esc(s.title)}</h2><p class="sub">${esc(s.sub || (range ? 'Pick your check-in and check-out days.' : 'Pick up to 3 days, first choice first. They confirm one.'))}</p>
    <div class="calwrap"><div class="cal"><div class="calhead"><button type="button" id="pm" ${prevOk ? '' : 'disabled'} aria-label="Previous month">‹</button><b>${viewMonth.toLocaleDateString('en-US',{month:'long', year:'numeric'})}</b><button type="button" id="nm" ${nextOk ? '' : 'disabled'} aria-label="Next month">›</button></div>
    <div class="g7">${['S','M','T','W','T','F','S'].map(x => `<span class="dow">${x}</span>`).join('')}${cells}</div></div>
    <div class="side"><div class="pk">${picked}</div><p class="note">${esc(s.note || 'Days they are closed are greyed out. They confirm what is open.')}</p></div></div>
    ${s.slots ? `<h3>${esc(s.slotLabel || 'Time of day')}</h3><div class="seg">${s.slots.map(o => `<button type="button" data-slot="${esc(o)}" aria-pressed="${B.slot === o}">${esc(o)}</button>`).join('')}</div>` : ''}
    ${(s.fields || []).map(field).join('')}`;
}
function lines(){
  const out = [];
  for (const s of STEPS){
    const i = STEPS.indexOf(s);
    if (s.type === 'service' && B.svc.length) out.push([s.label || 'Service', B.svc.join(', '), i]);
    for (const f of (s.fields || [])){ if (!visible(f)) continue; const v = B.f[f.id]; if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) continue; out.push([f.short || f.label, Array.isArray(v) ? v.join(', ') : String(v), i]); }
    if (s.type === 'when') out.push([s.label || (isRange(s) ? 'Dates' : 'Days'), (isRange(s) ? B.days.map(fmtDay).join(' → ') : B.days.map(fmtDay).join(' / ')) + (B.slot ? ' · ' + B.slot : ''), i]);
    if (s.type === 'where') out.push(['Address', `${B.street}, ${B.city}, MN ${B.zip}`, i]);
    if (s.type === 'contact'){ out.push(['Contact', `${B.name} · ${B.phone}${B.email ? ' · ' + B.email : ''} · prefers ${B.contact}`, i]); if (B.notes) out.push(['Notes', B.notes, i]); }
  }
  return out;
}
function vReview(){
  const how = A.email ? `Your email app opens with everything filled in, addressed to ${esc(A.email)}.` : A.text ? `Your messages app opens with everything filled in, to ${esc(A.textShow || A.phoneShow)}.` : `Call ${esc(A.phoneShow)} and read them your request, or copy it.`;
  return `<h2>Review your request</h2><p class="sub">Check the details, then send.</p>
  <div class="rev">${lines().map(([k,v,i]) => `<div class="it"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div><button type="button" data-edit="${i}">Edit</button></div>`).join('')}</div>
  <div class="honest"><b>This is a request, not a confirmed booking.</b> ${esc(A.name)} replies to confirm${R.confirmWhat ? ' ' + esc(R.confirmWhat) : ' the day, time and price'}. ${how}</div>`;
}
function render(){
  $('#bar').innerHTML = STEPS.map((s,i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('');
  $('#stepName').textContent = `${step+1} of ${STEPS.length} · ${STEPS[step].title.replace(/\?$/,'')}`;
  $('#stage').innerHTML = `<div class="panel">${vStep(STEPS[step])}</div>`;
  $('#backBtn').textContent = step === 0 ? 'Home' : 'Back';
  $('#nextBtn').textContent = step === STEPS.length - 1 ? 'Send request' : 'Continue';
  bind(); update();
}
function bind(){
  const s = STEPS[step];
  document.querySelectorAll('[data-svc]').forEach(b => b.onclick = () => { const v = b.dataset.svc; if (s.multi) B.svc = B.svc.includes(v) ? B.svc.filter(x => x !== v) : B.svc.concat(v); else B.svc = [v]; save(); render(); });
  document.querySelectorAll('[data-fs]').forEach(b => b.onclick = () => { B.f[b.dataset.fs] = b.dataset.v; save(); render(); });
  document.querySelectorAll('[data-fm]').forEach(b => b.onclick = () => { const k = b.dataset.fm, v = b.dataset.v, a = Array.isArray(B.f[k]) ? B.f[k] : []; B.f[k] = a.includes(v) ? a.filter(x => x !== v) : a.concat(v); save(); render(); });
  document.querySelectorAll('[data-fc]').forEach(b => b.onclick = () => {
    const k = b.dataset.fc, f = (s.fields || []).find(x => x.id === k); const lo = f.min ?? 0, hi = f.max ?? 10;
    B.f[k] = Math.min(hi, Math.max(lo, Number(B.f[k] ?? f.def ?? 0) + Number(b.dataset.d))); save(); $('#o_' + k).textContent = B.f[k]; update();
  });
  document.querySelectorAll('[data-fk]').forEach(el => el.oninput = el.onchange = () => { B.f[el.dataset.fk] = el.value; save(); update(); const e = $('#err'); if (e) e.textContent = ''; if (el.tagName === 'SELECT') render(); });
  document.querySelectorAll('[data-k]').forEach(el => el.oninput = el.onchange = () => { B[el.dataset.k] = el.value; save(); update(); const e = $('#err'); if (e) e.textContent = ''; });
  document.querySelectorAll('[data-k2]').forEach(b => b.onclick = () => { B[b.dataset.k2] = b.dataset.v; save(); render(); });
  document.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => { B.slot = b.dataset.slot; save(); render(); });
  document.querySelectorAll('[data-day]').forEach(b => b.onclick = () => {
    const d = b.dataset.day;
    if (isRange(s)){
      if (B.days.length !== 1) B.days = [d];
      else if (d > B.days[0]) B.days = [B.days[0], d];
      else B.days = [d];
    } else {
      const i = B.days.indexOf(d);
      if (i >= 0) B.days.splice(i, 1); else if (B.days.length < 3) B.days.push(d); else { B.days.shift(); B.days.push(d); }
    }
    save(); render();
  });
  document.querySelectorAll('[data-unpick]').forEach(b => b.onclick = () => { B.days = isRange(s) ? [] : B.days.filter(d => d !== b.dataset.unpick); save(); render(); });
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { step = Number(b.dataset.edit); render(); window.scrollTo(0,0); });
  const pm = $('#pm'), nm = $('#nm');
  if (pm) pm.onclick = () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth()-1, 1); render(); };
  if (nm) nm.onclick = () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 1); render(); };
}
function problem(){
  const s = STEPS[step];
  if (s.type === 'service' && !B.svc.length) return s.multi ? 'Choose at least 1' : 'Choose one';
  for (const f of (s.fields || [])){
    if (!visible(f) || f.optional) continue;
    const v = B.f[f.id];
    if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) return f.need || `Add: ${f.label.toLowerCase()}`;
  }
  if (s.type === 'when'){
    if (isRange(s) && B.days.length < 2) return B.days.length ? 'Pick the check-out day' : 'Pick the check-in day';
    if (!isRange(s) && !B.days.length) return 'Pick at least 1 day';
    if (s.slots && !B.slot) return 'Choose a time';
  }
  if (s.type === 'where'){
    if (B.street.trim().length < 5) return 'Add the street address';
    if (!/^\d{5}$/.test(B.zip.trim())) return 'Add a 5-digit ZIP code';
  }
  if (s.type === 'contact'){
    if (B.name.trim().length < 2) return 'Add your name';
    if (B.phone.replace(/\D/g,'').length < 10) return 'Add a 10-digit phone number';
    if (B.email && !/^\S+@\S+\.\S+$/.test(B.email)) return 'Check your email address';
    if (B.contact === 'email' && !B.email) return 'Add your email, or choose Call or Text';
  }
  return '';
}
const blocking = () => { const t = STEPS[step].type; return t === 'service' || t === 'when'; };
function update(){
  const p = problem();
  $('#nextBtn').disabled = !!p && blocking();
  $('#sum').innerHTML = p ? esc(p) : B.svc.length ? `<b>${esc(B.svc[0])}</b>${B.days.length ? ' · ' + esc(fmtDay(B.days[0])) : ''}` : '';
}
function next(){
  const p = problem();
  if (p){ const e = $('#err'); if (e) e.textContent = p; update(); return; }
  if (step < STEPS.length - 1){ step++; render(); window.scrollTo(0,0); return; }
  send();
}
function send(){
  const code = (A.code || 'RQ') + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
  const title = R.subject || 'Booking request';
  const text = `${title} (${code})\n\n` + lines().map(([k,v]) => `${k}: ${v}`).join('\n') + `\n\nPlease confirm with me. Thank you!`;
  const list = store.get(KEY + '_requests', []); list.unshift({code, at: Date.now(), text, title: B.svc[0] || title, days: B.days}); store.set(KEY + '_requests', list);
  const keep = {name:B.name, phone:B.phone, email:B.email, contact:B.contact, street:B.street, city:B.city, zip:B.zip};
  B = Object.assign(blank(), keep); save();
  const mail = A.email ? `mailto:${A.email}?subject=${encodeURIComponent(title + ' ' + code)}&body=${encodeURIComponent(text)}` : '';
  const smsL = A.text ? `sms:${A.text}?&body=${encodeURIComponent(text)}` : '';
  $('#nav').classList.add('hide'); $('#bar').innerHTML = ''; $('#stepName').textContent = '';
  $('#stage').innerHTML = `<div class="panel done"><div class="mark"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
    <h2>${mail || smsL ? 'One last tap' : 'Request ready'}</h2>
    <p class="sub">${mail || smsL ? 'Tap a button below: your request opens already filled in. They reply to confirm.' : `Call ${esc(A.phoneShow)} and read them your request.`}</p>
    <p>Request <span class="code">${code}</span></p>
    <div class="acts">${mail ? `<a class="btn main" href="${mail}">Send by email</a>` : ''}${smsL ? `<a class="btn ${mail ? 'ghost' : 'main'}" href="${smsL}">Send by text</a>` : ''}${tel ? `<a class="btn ${mail || smsL ? 'ghost' : 'main'}" href="${tel}">Call ${esc(A.phoneShow)}</a>` : ''}<button class="btn ghost" type="button" id="copyBtn">Copy request</button></div>
    <div class="acts"><button class="btn ghost sm" type="button" id="againBtn">New request</button><button class="btn ghost sm" type="button" id="homeBtn2">Home</button></div></div>`;
  $('#copyBtn').onclick = () => copy(text, $('#copyBtn'));
  $('#againBtn').onclick = () => start(); $('#homeBtn2').onclick = () => show('home');
  window.scrollTo(0,0);
}
function copy(text, btn){
  const old = btn.textContent, ok = () => { btn.textContent = 'Copied'; setTimeout(() => btn.textContent = old, 1600); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fb); else fb();
  function fb(){ const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch(e){} t.remove(); }
}
function mine(){
  const list = store.get(KEY + '_requests', []);
  $('#mine').innerHTML = `<div class="panel"><h2>My requests</h2><p class="sub">Saved on this device. ${esc(A.name)} confirms each one.</p>
  ${list.length ? list.map((r,i) => `<div class="req"><b>${esc(r.title)}</b><span class="tag">REQUESTED</span><div class="m">${esc((r.days || []).map(fmtDay).join(' / '))}</div><div class="m">${esc(r.code)}</div>
    <div class="acts" style="justify-content:flex-start;margin-top:10px"><button class="btn ghost sm" type="button" data-cp="${i}">Copy</button><button class="btn ghost sm" type="button" data-rm="${i}">Remove</button></div></div>`).join('') : '<p class="sub">No requests yet.</p>'}
  <div class="acts" style="justify-content:flex-start"><button class="btn main" type="button" id="newBtn">${esc(primary.label)}</button><button class="btn ghost" type="button" id="homeBtn">Home</button></div></div>`;
  show('mine');
  $('#newBtn').onclick = () => start(); $('#homeBtn').onclick = () => show('home');
  document.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => copy(list[b.dataset.cp].text, b));
  document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { list.splice(Number(b.dataset.rm), 1); store.set(KEY + '_requests', list); mine(); });
}

// ---------- boot ----------
document.body.innerHTML = header() + home();
document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => start(b.dataset.start));
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
  $('#cards').innerHTML = cardsHTML(b.dataset.tab);
  document.querySelectorAll('#cards [data-start]').forEach(x => x.onclick = () => start(x.dataset.start));
});
$('#logoBtn').onclick = () => show('home');
if ($('#mineBtn')) $('#mineBtn').onclick = mine;
$('#backBtn').onclick = () => { if (step === 0) show('home'); else { step--; render(); window.scrollTo(0,0); } };
$('#nextBtn').onclick = next;
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input.t') && !$('#flow').classList.contains('hide')) { e.preventDefault(); e.target.blur(); next(); } });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
