// Amy: a chat receptionist for each business app. She answers only from the business's own info and never guesses.
// Use: Amy.init({biz:{...}, accent:'#hex', onBook:(serviceName|null) => {...}})
(function(){
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mnNow(){
  const p = new Intl.DateTimeFormat('en-US', {timeZone:'America/Chicago', weekday:'short', hour:'numeric', minute:'numeric', hour12:false}).formatToParts(new Date());
  const g = t => (p.find(x => x.type === t) || {}).value;
  return {day: SHORT.indexOf(g('weekday')), min: (Number(g('hour')) % 24) * 60 + Number(g('minute'))};
}
const toMin = s => { const [h,m] = s.split(':').map(Number); return h*60 + (m||0); };
function fmt(s){ let [h,m] = s.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return m ? `${h}:${String(m).padStart(2,'0')} ${ap}` : `${h} ${ap}`; }

function init(cfg){
  const B = cfg.biz, accent = cfg.accent || '#2f6db5';
  const H = B.hours || null;
  const dayText = d => { if (!H) return null; if (!(d in H)) return 'not listed'; const v = H[d]; if (v === null) return 'closed'; if (typeof v === 'string') return v; return v.map(([a,b]) => `${fmt(a)} to ${fmt(b)}`).join(' and '); };
  const openNow = () => { if (!H) return null; const n = mnNow(), v = H[n.day]; if (!Array.isArray(v)) return false; return v.some(([a,b]) => n.min >= toMin(a) && n.min < toMin(b)); };
  const src = B.site ? 'their website' : 'public listings';
  const callBtn = B.phone ? {label:`Call ${B.phoneShow}`, href:'tel:' + B.phone} : null;
  const textBtn = B.text ? {label:'Text them', href:'sms:' + B.text} : null;
  const bookBtn = svc => B.mode === 'request' ? {label: svc ? `Book ${svc}` : (B.bookLabel || 'Start a request'), act:'book', svc} : (B.bookUrl ? {label: B.bookLabel || 'Book now', href: B.bookUrl, ext:true} : null);
  const services = (B.services || []).filter(s => s && s.name);

  // ---------- answers ----------
  function hours(){
    if (!H) return {t:`${B.name} doesn’t list hours on ${src}, so I can’t tell you for sure. The quickest way to check is a call.${B.hoursNote ? ' ' + B.hoursNote : ''}`, b:[callBtn]};
    const n = mnNow(), o = openNow();
    const week = [1,2,3,4,5,6,0].map(d => `${DAYS[d]}: ${dayText(d)}`).join('\n');
    const now = o === true ? `They’re open right now. Today: ${dayText(n.day)}.` : `They’re closed right now. Today: ${dayText(n.day)}.`;
    return {t:`${now}\n\n${week}${B.hoursNote ? '\n\n' + B.hoursNote : ''}`, b:[bookBtn(), callBtn]};
  }
  function where(){
    if (!B.address) return {t:`I don’t have a confirmed address for ${B.name}${B.addressNote ? ' (' + B.addressNote + ')' : ''}. Please call to confirm before you go.`, b:[callBtn]};
    return {t:`They’re at ${B.address}.`, b:[{label:'Directions', href:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(B.name + ' ' + B.address), ext:true}, callBtn]};
  }
  function contact(){
    const parts = [];
    if (B.phone) parts.push(`Phone: ${B.phoneShow}`);
    if (B.text) parts.push(`Text: ${B.textShow || B.phoneShow}`);
    if (B.email) parts.push(`Email: ${B.email}`);
    return {t:`Here’s how to reach ${B.name}:\n${parts.join('\n')}\n\nI’m an automatic assistant, so I can’t take or make phone calls myself, but this button calls them directly.`, b:[callBtn, textBtn, B.email ? {label:'Email them', href:'mailto:' + B.email} : null]};
  }
  function price(svc){
    if (svc){
      if (svc.price) return {t:`${svc.name}: ${svc.price}, as listed on ${src}.${B.priceNote ? ' ' + B.priceNote : ''} The final price can depend on your details.`, b:[bookBtn(svc.name), callBtn]};
      return {t:`${src[0].toUpperCase() + src.slice(1)} doesn’t list a price for ${svc.name}, and I don’t want to guess. ${B.mode === 'request' ? 'Send a request and they’ll give you the price.' : 'You’ll see the price on their booking page, or you can call.'}`, b:[bookBtn(svc.name), callBtn]};
    }
    const priced = services.filter(s => s.price);
    if (!priced.length) return {t:`${B.name} doesn’t list prices on ${src}, so I won’t guess. ${B.mode === 'request' ? 'Send a request and they’ll reply with a price.' : 'Prices show on their booking page, or you can call.'}`, b:[bookBtn(), callBtn]};
    return {t:`Prices listed on ${src}:\n${priced.slice(0, 10).map(s => `• ${s.name}: ${s.price}`).join('\n')}${priced.length > 10 ? '\n…and more on the page.' : ''}${B.priceNote ? '\n\n' + B.priceNote : ''}`, b:[bookBtn(), callBtn]};
  }
  function list(){
    const names = services.slice(0, 12).map(s => '• ' + s.name).join('\n');
    return {t:`Here’s what ${B.name} offers:\n${names}${services.length > 12 ? '\n…and more on this page.' : ''}\n\nAsk me about any of them.`, b:[bookBtn(), callBtn]};
  }
  function book(svc){
    if (B.mode === 'request') return {t:`Happy to help you book${svc ? ' ' + svc.name : ''}! I’ll open the booking steps${svc ? ' with that already picked' : ''}. Pick your days and details, then send it. ${B.name} will confirm with you.`, b:[bookBtn(svc ? svc.name : null), callBtn]};
    return {t:`${B.name} takes bookings on their own booking page, so your spot is real and confirmed there. Tap below to book${svc ? ' ' + svc.name : ''}.`, b:[bookBtn(svc ? svc.name : null), callBtn]};
  }
  function about(svc){
    return {t:`${svc.name}${svc.desc ? ': ' + svc.desc : '.'}${svc.price ? ` Listed price: ${svc.price}.` : ''}`, b:[bookBtn(svc.name), callBtn]};
  }
  function notes(q){
    const words = q.split(/\W+/).filter(w => w.length > 3);
    let best = null, score = 0;
    for (const n of (B.notes || [])){ const s = words.filter(w => n.toLowerCase().includes(w)).length; if (s > score){ score = s; best = n; } }
    return score ? {t: best, b:[bookBtn(), callBtn]} : null;
  }
  function findService(q){
    let best = null, score = 0;
    for (const s of services){
      const words = (s.name + ' ' + (s.syn || '')).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !['and','the','for','with'].includes(w));
      let sc = 0; for (const w of words){ if (q.includes(w)) sc += w.length > 4 ? 2 : 1; else if (w.length > 4 && q.includes(w.slice(0, -1))) sc += 1; }
      if (sc > score){ score = sc; best = s; }
    }
    return score >= 2 ? best : null;
  }
  function answer(raw){
    const q = ' ' + raw.toLowerCase().replace(/[’']/g, '') + ' ';
    const svc = findService(q);
    if (B.emergency && /(emergenc|no heat|flood|burst|leak|gas smell|smell gas|no hot water|no water)/.test(q)) return {t:`That sounds urgent. Please call ${B.name} right now instead of sending a request: ${B.phoneShow}. If you smell gas or anyone is in danger, leave the building and call 911.`, b:[callBtn]};
    if (/\b(hi|hello|hey|good (morning|afternoon|evening))\b/.test(q) && q.trim().split(' ').length <= 4) return greet();
    if (/(thank|thx|appreciate)/.test(q)) return {t:`You’re very welcome! Anything else I can help with?`, b:[]};
    if (/(human|real person|are you (a )?(bot|robot|real|ai)|who are you)/.test(q)) return {t:`I’m Amy, an automatic assistant for this app, not a real person. I answer only from ${B.site ? B.name + '’s website' : 'public listings about ' + B.name}. For anything I can’t answer, the team is one call away.`, b:[callBtn]};
    if (/(book|appointment|schedule|reserv|sign up|signup|enroll|register|estimate|quote|request|order|come in|availability|available|opening)/.test(q)) return book(svc);
    if (/(price|cost|how much|\$|rate|fee|charge|expensive|cheap)/.test(q)) return price(svc);
    if (/(hour|open|close|today|tomorrow|weekend|saturday|sunday|monday|tuesday|wednesday|thursday|friday|when are)/.test(q)) return hours();
    if (/(where are|where is|where r|address|location|located|direction|find you|how do i get)/.test(q)) return where();
    if (/(call|phone|number|talk|speak|text|email|contact|reach)/.test(q)) return contact();
    if (/(gift)/.test(q)){ const g = (B.links || []).find(l => /gift/i.test(l.label)); return g ? {t:`Yes! ${B.name} sells gift cards online.`, b:[{label:g.label, href:g.url, ext:true}]} : (notes(q) || {t:`I don’t see gift cards listed on ${src}. Give them a call to ask.`, b:[callBtn]}); }
    if (svc) return about(svc);
    if (/(service|offer|do you (do|have)|what can|menu|options|classes|treatments)/.test(q)) return list();
    const n = notes(q); if (n) return n;
    return {t:`I’m not sure about that one, and I don’t want to guess. ${B.name} can answer it directly${B.phone ? ' at ' + B.phoneShow : ''}.`, b:[callBtn, bookBtn()]};
  }
  function greet(){
    const o = openNow();
    const st = o === true ? ` They’re open right now.` : o === false ? ` They’re closed at the moment, but you can still ${B.mode === 'request' ? 'send a request' : 'book online'}.` : '';
    return {t:`Hi, I’m Amy, the virtual receptionist for ${B.name}.${st} I can help you book, or answer questions about hours, prices and services. What can I do for you?`, b:[]};
  }

  // ---------- chat window ----------
  const css = `
.amy-btn{position:fixed;right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:40;display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:12px 18px 12px 12px;background:${accent};color:#fff;font:700 15px Inter,system-ui,sans-serif;box-shadow:0 10px 26px rgba(0,0,0,.25);cursor:pointer;transition:bottom .2s}
.amy-btn.up{bottom:calc(88px + env(safe-area-inset-bottom,0px))}
.amy-av{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.22);display:grid;place-items:center;font:700 14px Inter,sans-serif}
.amy-panel{position:fixed;right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:41;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 32px));height:min(560px,calc(100dvh - 32px));display:flex;flex-direction:column;background:#fff;color:#16191d;border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.3);overflow:hidden;font:15px/1.5 Inter,system-ui,sans-serif}
.amy-panel[hidden]{display:none}
.amy-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:${accent};color:#fff}
.amy-head .amy-av{width:36px;height:36px;font-size:16px}
.amy-head b{display:block;font-size:15.5px}
.amy-head small{display:block;font-size:12px;opacity:.85;line-height:1.3}
.amy-head button{margin-left:auto;background:rgba(255,255,255,.18);border:0;color:#fff;width:34px;height:34px;border-radius:10px;font-size:18px;cursor:pointer;flex:none}
.amy-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f6f4f1}
.amy-m{max-width:88%;padding:10px 13px;border-radius:14px;white-space:pre-line;overflow-wrap:anywhere}
.amy-m.a{background:#fff;border:1px solid #e6e2dc;align-self:flex-start;border-bottom-left-radius:4px}
.amy-m.u{background:${accent};color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.amy-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.amy-acts a,.amy-acts button{display:inline-block;border:1.5px solid ${accent};color:${accent};background:#fff;border-radius:999px;padding:6px 12px;font:700 13.5px Inter,sans-serif;text-decoration:none;cursor:pointer}
.amy-chips{display:flex;gap:6px;overflow-x:auto;padding:8px 12px 0;background:#fff;border-top:1px solid #ece8e2}
.amy-chips button{flex:none;border:1px solid #ddd8d0;background:#faf9f7;border-radius:999px;padding:6px 11px;font:600 13px Inter,sans-serif;color:#16191d;cursor:pointer}
.amy-form{display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));background:#fff}
.amy-form input{flex:1;min-width:0;border:1.5px solid #ddd8d0;border-radius:12px;padding:10px 12px;font:16px Inter,sans-serif;color:#16191d;background:#fff;outline:none}
.amy-form input:focus{border-color:${accent}}
.amy-form button{border:0;border-radius:12px;background:${accent};color:#fff;font:700 14px Inter,sans-serif;padding:0 14px;cursor:pointer}
.amy-typing{color:#6b7178;font-size:13px;align-self:flex-start}
.amy-foot{font-size:11.5px;color:#6b7178;text-align:center;padding:0 12px 6px;background:#fff}
@media (prefers-reduced-motion:reduce){.amy-btn{transition:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const wrap = document.createElement('div');
  wrap.innerHTML = `<button class="amy-btn" type="button" aria-label="Chat with Amy"><span class="amy-av">A</span>Ask Amy</button>
  <div class="amy-panel" role="dialog" aria-label="Chat with Amy" hidden>
    <div class="amy-head"><span class="amy-av">A</span><span><b>Amy · receptionist</b><small>Automatic assistant for ${esc(B.name)}, not a real person</small></span><button type="button" aria-label="Close chat">✕</button></div>
    <div class="amy-log" aria-live="polite"></div>
    <div class="amy-chips">${['Book an appointment','Hours','Prices','Services','Where are you?','Call them'].map(c => `<button type="button">${c}</button>`).join('')}</div>
    <form class="amy-form"><label for="amy-in" style="position:absolute;left:-9999px">Message Amy</label><input id="amy-in" autocomplete="off" placeholder="Ask Amy anything…"><button type="submit">Send</button></form>
    <div class="amy-foot">Amy only answers from ${B.site ? esc(B.name) + '’s website' : 'public listings about ' + esc(B.name)} and never guesses.</div>
  </div>`;
  document.body.appendChild(wrap);
  const btn = wrap.querySelector('.amy-btn'), panel = wrap.querySelector('.amy-panel'), log = wrap.querySelector('.amy-log'), input = wrap.querySelector('input');
  let started = false;
  function say(m){
    const d = document.createElement('div'); d.className = 'amy-m a'; d.textContent = m.t;
    const acts = (m.b || []).filter(Boolean);
    if (acts.length){
      const a = document.createElement('div'); a.className = 'amy-acts';
      for (const x of acts){
        if (x.act === 'book'){ const b = document.createElement('button'); b.type = 'button'; b.textContent = x.label; b.onclick = () => { close(); cfg.onBook && cfg.onBook(x.svc || null); }; a.appendChild(b); }
        else { const l = document.createElement('a'); l.href = x.href; l.textContent = x.label; if (x.ext){ l.target = '_blank'; l.rel = 'noopener'; } a.appendChild(l); }
      }
      d.appendChild(a);
    }
    log.appendChild(d); log.scrollTop = log.scrollHeight;
  }
  function user(t){ const d = document.createElement('div'); d.className = 'amy-m u'; d.textContent = t; log.appendChild(d); log.scrollTop = log.scrollHeight; }
  function ask(t){
    if (!t.trim()) return;
    user(t);
    const ty = document.createElement('div'); ty.className = 'amy-typing'; ty.textContent = 'Amy is typing…'; log.appendChild(ty); log.scrollTop = log.scrollHeight;
    setTimeout(() => { ty.remove(); say(t === 'Services' ? list() : t === 'Call them' ? contact() : answer(t)); }, 350);
  }
  function open(){ panel.hidden = false; btn.hidden = true; if (!started){ started = true; say(greet()); } setTimeout(() => input.focus({preventScroll:true}), 50); }
  function close(){ panel.hidden = true; btn.hidden = false; }
  btn.onclick = open;
  wrap.querySelector('.amy-head button').onclick = close;
  wrap.querySelectorAll('.amy-chips button').forEach(b => b.onclick = () => ask(b.textContent));
  wrap.querySelector('form').onsubmit = e => { e.preventDefault(); const t = input.value; input.value = ''; ask(t); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });
  // stay above a fixed bottom bar when one is showing
  const nav = document.getElementById(cfg.bottomBarId || 'nav');
  if (nav){ const upd = () => btn.classList.toggle('up', !nav.classList.contains('hide') && !nav.hidden); upd(); new MutationObserver(upd).observe(nav, {attributes:true}); }
  window.Amy._answer = answer; // for tests
}
window.Amy = {init};
})();
