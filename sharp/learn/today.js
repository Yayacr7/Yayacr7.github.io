/* Sharp Daily, "pick up where you left off", lesson notes and saved lessons.
   Everything here is saved in this browser only (localStorage). Nothing is sent anywhere. */
(function(){
"use strict";
function load(k, d){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } }
function save(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
function mk(tag, cls, text){ var n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; }

/* One practical challenge and the matching tool for each lesson. Each takes about 10 minutes. */
var PRACTICE = {
  'money':            ['Write down everything you spent yesterday, then mark each one need or want.', '../tools/budget/index.html', 'Budget & savings planner'],
  'investing':        ['Find the yearly fee (expense ratio) of one fund you have heard of. Work out what it costs on $1,000.', '../learn/index.html#calculators', 'Money calculators'],
  'funding':          ['Pick a business you know. Would it suit a bank loan, investors or neither? Write one line on why.', '../tools/business-plan/index.html', 'Business plan & pricing'],
  'business':         ['Choose a product you bought this week. Guess its price, its cost and its margin.', '../tools/idea-check/index.html', 'Idea check'],
  'statements':       ['Write a 3-line profit and loss for a lemonade stand: sales, costs, profit. Use made-up numbers.', '../tools/business-plan/index.html', 'Business plan & pricing'],
  'why-business':     ['List three problems you or people you know complained about this week. Circle the one someone would pay to fix.', '../tools/idea-check/index.html', 'Idea check'],
  'buy-back-time':    ['List five things you did today. Mark one you could hand off, automate or drop.', '../tools/ai/index.html', 'AI at work'],
  'ai-at-work':       ['Use an AI tool for one real task. Check every fact it gave you, and count how many were wrong.', '../tools/ai/index.html', 'AI at work'],
  'mkt-basics':       ['Write one sentence: who your customer is, what problem they have, and why they would pick you.', '../tools/marketing/index.html', 'Marketing calculators'],
  'mkt-channels':     ['Pick one place your customers already spend time. Write how you would reach them there for free.', '../tools/marketing/index.html', 'Marketing calculators'],
  'mkt-measure':      ['Made-up example: $200 of ads brought 8 customers. Work out the cost per customer.', '../tools/marketing/index.html', 'Marketing calculators'],
  'mkt-words':        ['Rewrite one sentence from any website so a 12-year-old would understand it.', '../tools/marketing/index.html', 'Marketing calculators'],
  'mkt-social':       ['Write five hooks under ten words each for a business you like. Pick the strongest.', '../tools/marketing/index.html', 'Marketing calculators'],
  'negotiation':      ['Before your next purchase or deal, write your walk-away point and your best alternative.', '../tools/negotiation/index.html', 'Negotiation prep'],
  'scripts':          ['Say the price-pushback script out loud three times, until it sounds like you.', '../tools/negotiation/index.html', 'Negotiation prep'],
  'persuasion':       ['Find one ad that uses social proof or scarcity. Ask yourself: is it honest?', '../tools/negotiation/index.html', 'Negotiation prep'],
  'pitching':         ['Write a one-sentence pitch: who you help, what result they get, and your best proof.', '../tools/investors/index.html', 'Investor pressure drill'],
  'pressure':         ['Do three rounds of box breathing, then answer one tough question out loud.', '../tools/investors/index.html', 'Investor pressure drill'],
  'voice':            ['Record yourself for 30 seconds. Count your filler words, then record it again.', '../tools/investors/index.html', 'Investor pressure drill'],
  'investor-interest':['Write the three numbers an investor would ask about first for an idea you like.', '../tools/investors/index.html', 'Investor pressure drill'],
  'best-of-investors':['Write two questions you would ask an investor before taking their money.', '../tools/investors/index.html', 'Investor pressure drill']
};
var REFLECT = [
  'What is one money decision you made this week? Would you make it again?',
  'What is one thing you learned today that you could teach a friend in one minute?',
  'Which idea from Sharp did you actually use this week?',
  'What problem around you would you pay someone to fix?',
  'What did you spend on this week that you would not miss?',
  'When did you last say yes when you wanted to say no? What would you say now?',
  'What is one skill that would make you more money in a year?',
  'Who could you ask for honest feedback on your idea this week?',
  'What are you putting off? What is the smallest first step?',
  'If you started a business tomorrow, who would your first customer be?',
  'What is one thing you would like to understand better about money?',
  'What did you learn from your last mistake?',
  'What would you do with an extra hour every day?',
  'What would make you trust a new business enough to buy from it?'
];

var start = document.getElementById('start');
var order = Array.prototype.map.call(document.querySelectorAll('nav.side a[data-page]'), function(a){ return a.getAttribute('data-page'); })
  .filter(function(id){ return PRACTICE[id]; });
function title(id){ var a = document.querySelector('nav.side a[data-page="' + id + '"]'); return a && a.childNodes[1] ? a.childNodes[1].textContent.trim() : id; }
function num(id){ return order.indexOf(id) + 1; }
function passed(id){ var p = load('mds-progress', {}); return !!(p[id] && p[id].passed); }
function today(){ var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function dayNumber(){ var d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }

/* ---------- remember the last lesson opened ---------- */
function track(){ var id = location.hash.slice(1); if(PRACTICE[id]) save('sharp-last', { id: id, at: today() }); }
window.addEventListener('hashchange', function(){ track(); renderToday(); });
track();

/* ---------- Sharp Daily ---------- */
var todayBox = null;
function renderToday(){
  if(!start) return;
  var date = today(), dn = dayNumber();
  var next = order.filter(function(id){ return !passed(id); })[0] || null;
  var last = load('sharp-last', null);
  var done = order.filter(passed);
  // Practise something you've already learned; before any lesson is passed, practise lesson 1.
  var pid = done.length ? done[dn % done.length] : order[0];
  var lessonId = last && last.id && !passed(last.id) ? last.id : (next || order[dn % order.length]);
  var lessonLabel = last && last.id === lessonId && !passed(lessonId) ? 'Pick up where you left off' : (next ? 'Your next lesson' : 'Review a lesson');
  var state = load('sharp-daily', { date: '', done: [], days: 0 });
  if(state.date !== date){ state = { date: date, done: [], days: state.days || 0 }; }
  var items = [
    { k: 'lesson', label: lessonLabel, text: 'Lesson ' + num(lessonId) + ': ' + title(lessonId), href: '#' + lessonId, go: 'Open lesson' },
    { k: 'challenge', label: 'Today\'s challenge · from ' + title(pid), text: PRACTICE[pid][0] },
    { k: 'tool', label: 'Try a tool', text: PRACTICE[pid][2], href: PRACTICE[pid][1], go: 'Try this tool' },
    { k: 'reflect', label: 'Think about it', text: REFLECT[dn % REFLECT.length] }
  ];

  if(!todayBox){
    todayBox = mk('section', 'today'); todayBox.setAttribute('aria-labelledby', 'todayH');
    var dash = start.querySelector('.dash'); start.insertBefore(todayBox, dash ? dash.nextSibling : start.firstChild);
  }
  todayBox.textContent = '';
  var head = mk('div', 'today-top');
  var h = mk('h2', null, 'Sharp Daily'); h.id = 'todayH'; head.appendChild(h);
  var count = mk('span', 'today-count', state.done.length + ' of 4 done today'); head.appendChild(count);
  todayBox.appendChild(head);
  todayBox.appendChild(mk('p', 'today-sub', 'One lesson, one challenge, one tool and one question. About 15 minutes. Tick them off as you go.'));
  var list = mk('ol', 'today-list');
  items.forEach(function(it){
    var li = mk('li', 'today-item' + (state.done.indexOf(it.k) > -1 ? ' is-done' : ''));
    var box = mk('input'); box.type = 'checkbox'; box.id = 'td-' + it.k; box.checked = state.done.indexOf(it.k) > -1;
    var lab = mk('label'); lab.htmlFor = box.id;
    lab.appendChild(mk('span', 'today-k', it.label)); lab.appendChild(mk('span', 'today-t', it.text));
    box.addEventListener('change', function(){
      var s = load('sharp-daily', state); if(s.date !== date) s = { date: date, done: [], days: s.days || 0 };
      var had = s.done.length === 4;
      s.done = s.done.filter(function(x){ return x !== it.k; }); if(box.checked) s.done.push(it.k);
      if(s.done.length === 4 && !had) s.days = (s.days || 0) + 1;
      if(had && s.done.length < 4) s.days = Math.max(0, (s.days || 0) - 1);
      save('sharp-daily', s); state = s; renderToday();
      var again = document.getElementById(box.id); if(again) again.focus();
    });
    li.appendChild(box); li.appendChild(lab);
    if(it.href){ var a = mk('a', 'today-go', it.go + ' →'); a.href = it.href; li.appendChild(a); }
    list.appendChild(li);
  });
  todayBox.appendChild(list);
  var foot = mk('p', 'today-foot');
  foot.textContent = state.done.length === 4 ? 'All done for today. Nice work. Come back tomorrow for a new set.' :
    (state.days ? 'You\'ve finished Sharp Daily on ' + state.days + (state.days === 1 ? ' day.' : ' days.') : 'Saved on this device only.');
  todayBox.appendChild(foot);
  renderSaved();
}

/* ---------- saved lessons and notes ---------- */
var notes = load('sharp-notes', {}), marks = load('sharp-saved', []);
var savedBox = null;
function renderSaved(){
  if(!start || !todayBox) return;
  var withNotes = order.filter(function(id){ return notes[id] && notes[id].trim(); });
  var ids = order.filter(function(id){ return marks.indexOf(id) > -1 || withNotes.indexOf(id) > -1; });
  if(!savedBox){ savedBox = mk('section', 'saved-box'); savedBox.setAttribute('aria-labelledby', 'savedH'); start.insertBefore(savedBox, todayBox.nextSibling); }
  savedBox.hidden = !ids.length; savedBox.textContent = '';
  if(!ids.length) return;
  var top = mk('div', 'today-top'); var h = mk('h2', null, 'Your saved lessons and notes'); h.id = 'savedH'; top.appendChild(h);
  var dl = mk('button', 'btn ghost', 'Download my notes'); dl.type = 'button'; dl.addEventListener('click', downloadNotes); top.appendChild(dl);
  savedBox.appendChild(top);
  var ul = mk('ul', 'saved-list');
  ids.forEach(function(id){
    var li = mk('li'), a = mk('a', null, 'Lesson ' + num(id) + ': ' + title(id)); a.href = '#' + id; li.appendChild(a);
    var tags = [];
    if(marks.indexOf(id) > -1) tags.push('Saved'); if(withNotes.indexOf(id) > -1) tags.push('Has notes');
    li.appendChild(mk('span', 'saved-tag', tags.join(' · '))); ul.appendChild(li);
  });
  savedBox.appendChild(ul);
}
function downloadNotes(){
  var out = 'My Sharp notes (sharpbasics.com)\nDownloaded ' + today() + '\n';
  order.forEach(function(id){ if(notes[id] && notes[id].trim()) out += '\n\nLesson ' + num(id) + ': ' + title(id) + '\n' + '-'.repeat(30) + '\n' + notes[id].trim(); });
  var url = URL.createObjectURL(new Blob([out], { type: 'text/plain' }));
  var a = mk('a'); a.href = url; a.download = 'sharp-notes-' + today() + '.txt'; document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1000);
}

order.forEach(function(id){
  var sec = document.getElementById(id); if(!sec) return;
  // Save button next to the lesson title.
  var head = sec.querySelector('.lesson-head');
  if(head){
    var b = mk('button', 'save-lesson'); b.type = 'button';
    var paint = function(){ var on = marks.indexOf(id) > -1; b.textContent = on ? '★ Saved' : '☆ Save lesson'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); };
    b.addEventListener('click', function(){
      var i = marks.indexOf(id); if(i > -1) marks.splice(i, 1); else marks.push(id);
      save('sharp-saved', marks); paint(); renderSaved();
    });
    paint(); head.appendChild(b);
  }
  // Notes box above the Previous/Next bar. Saves as you type.
  var pager = sec.querySelector(':scope > .pager');
  var box = mk('section', 'notes-box'); box.setAttribute('aria-label', 'My notes for this lesson');
  var lab = mk('label', 'notes-h', 'My notes'); lab.htmlFor = 'note-' + id;
  var ta = mk('textarea'); ta.id = 'note-' + id; ta.rows = 3; ta.maxLength = 4000; ta.value = notes[id] || '';
  ta.placeholder = 'What do you want to remember from this lesson? How will you use it?';
  var st = mk('span', 'notes-st', notes[id] ? 'Saved on this device.' : 'Saves on this device as you type.'); st.setAttribute('aria-live', 'polite');
  var timer;
  ta.addEventListener('input', function(){
    clearTimeout(timer); st.textContent = 'Saving…';
    timer = setTimeout(function(){
      notes[id] = ta.value; if(!ta.value.trim()) delete notes[id];
      st.textContent = save('sharp-notes', notes) ? 'Saved on this device.' : 'Couldn\'t save: this browser is blocking storage (private mode?). Copy your note somewhere safe.';
      renderSaved();
    }, 500);
  });
  box.appendChild(lab); box.appendChild(ta); box.appendChild(st);
  var cta = sec.querySelector(':scope > .ask-cta');
  sec.insertBefore(box, cta || pager || null);
});

renderToday();
})();
