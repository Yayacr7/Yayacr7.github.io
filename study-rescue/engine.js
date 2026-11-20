/* Study Rescue engine: finds topics in notes, writes practice questions ONLY from
   sentences in the notes, estimates what needs practice, and builds a plan.
   No AI. Pure functions, so it runs in the browser and in Node tests. */
(function (root) {
  'use strict';

  var STOP = ('a an the and or but if then than so of to in on at by for from with without into onto over under about as is are was were be been being ' +
    'it its this that these those they them their there here he she his her we our you your i me my not no yes do does did done can could will would ' +
    'should may might must also very more most less least some any all each every both either neither such which who whom whose what when where why how ' +
    'one two three four five first second third other another same many much few lot lots used use uses using make makes made called means mean refers ' +
    'refer known like just only even still well into out up down off again new old way ways part parts thing things kind type types example examples ' +
    'notes note sample unit chapter topic lesson section page study guide').split(' ');
  var STOPSET = {}; STOP.forEach(function (w) { STOPSET[w] = 1; });
  var PRONOUN = /^(it|this|these|they|that|those|there|he|she|we|you|i|its|their|them|here|such|both|also|then|so|but|and|or)\b/i;

  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function words(s) { return String(s || '').trim().split(/\s+/).filter(Boolean); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function rng(seed) { var x = (parseInt(hash(String(seed)), 36) % 2147483646) + 1; return function () { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }
  function shuffle(arr, seed) { var a = arr.slice(), r = rng(seed); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function trimEnd(s) { return String(s).replace(/[\s.;:,!]+$/, ''); }
  function shorten(s, n) { var w = words(s); return w.length > n ? w.slice(0, n).join(' ') + '…' : s; }
  function hasWord(text, term) { return new RegExp('(^|[^a-z0-9])' + esc(term.toLowerCase()) + '($|[^a-z0-9])').test(text.toLowerCase()); }

  /* ---------- 1. Text -> units (lines/sentences with a reference) ---------- */
  var BULLET = /^\s*(?:[-•*▪●◦·–]|\(?\d{1,2}[.)]|\(?[a-z][.)])\s+/;
  function stripBullet(l) { return l.replace(BULLET, '').trim(); }
  function isBullet(l) { return BULLET.test(l) && !/^\s*\d{1,2}\.\d/.test(l); }

  function headingText(line) {
    var l = line.trim(), m;
    if ((m = l.match(/^#{1,6}\s+(.+)$/))) return trimEnd(m[1].replace(/\*\*/g, ''));
    if (l.length > 80) return null;
    var w = words(l);
    if (/^(chapter|unit|topic|section|lesson|part|module|week)\s+[\w.]+\b/i.test(l) && w.length <= 12 && !/[.?!]$/.test(l)) return trimEnd(l);
    if (/^(\d+(\.\d+)*|[IVX]+|[A-H])[.)]\s+\S/.test(l) && w.length <= 8 && !/[.?!,;]$/.test(l)) return trimEnd(l.replace(/^(\d+(\.\d+)*|[IVX]+|[A-H])[.)]\s+/, ''));
    if (isBullet(l)) return null;
    if (w.length <= 6 && l.length <= 50 && /^[A-Z0-9"']/.test(l) && !/[.?!,;]$/.test(l) && !/\S:\s+\S/.test(l) && !/\b(is|are|was|were)\b/i.test(l)) return trimEnd(l);
    return null;
  }

  // pages: array of strings. kind: 'pdf' -> "page N", otherwise "line N".
  function toUnits(doc) {
    var units = [];
    (doc.pages || []).forEach(function (page, pi) {
      var lines = String(page || '').replace(/\r/g, '').split('\n');
      var cur = null;
      function flush() { if (cur) { units.push(cur); cur = null; } }
      lines.forEach(function (raw, li) {
        var line = raw.replace(/\t/g, ' ').replace(/\s+$/, '');
        var ref = doc.kind === 'pdf' ? 'page ' + (pi + 1) : doc.kind === 'image' ? 'photo' + (doc.pages.length > 1 ? ' ' + (pi + 1) : '') : 'line ' + (li + 1);
        if (!line.trim()) { flush(); return; }
        var h = headingText(line);
        if (h !== null && !isBullet(line)) { flush(); units.push({ heading: h, ref: ref }); return; }
        var t = stripBullet(line).replace(/\*\*/g, '');
        if (cur && !isBullet(line) && !/[.!?:;]$/.test(cur.text) && /^[a-z(]/.test(t)) { cur.text += ' ' + t; return; }
        flush(); cur = { text: t, ref: ref };
      });
      flush();
    });
    // split long units into sentences
    var out = [];
    units.forEach(function (u) {
      if (u.heading !== undefined) { out.push(u); return; }
      u.text.replace(/([.!?])\s+(?=["'(]?[A-Z0-9])/g, '$1\n').split('\n').forEach(function (s) { s = s.trim(); if (s) out.push({ text: s, ref: u.ref }); });
    });
    return out;
  }

  function isTopicList(units) {
    var body = units.filter(function (u) { return u.text; });
    var heads = units.filter(function (u) { return u.heading !== undefined; });
    var all = body.length + heads.length;
    if (all < 3) return false;
    var shortish = body.filter(function (u) { return words(u.text).length <= 8 && !/[.!?]$/.test(u.text); }).length + heads.length;
    var sentences = body.filter(function (u) { return words(u.text).length >= 6 && /[.!?]$/.test(u.text); }).length;
    return shortish / all >= 0.75 && sentences <= 1;
  }

  /* ---------- 2. Topics ---------- */
  function findTopics(docs) {
    var topics = [], byName = {}, listOnly = [];
    function add(name, sentences, docName) {
      name = cap(trimEnd(name).replace(/\s+/g, ' ')).slice(0, 70);
      var key = norm(name); if (!key) return;
      if (byName[key]) { byName[key].sentences = byName[key].sentences.concat(sentences); if (byName[key].docs.indexOf(docName) < 0) byName[key].docs.push(docName); return; }
      var t = { id: 't' + hash(key), name: name, include: true, sentences: sentences, docs: [docName] };
      byName[key] = t; topics.push(t);
    }
    docs.forEach(function (doc) {
      var units = toUnits(doc);
      if (isTopicList(units)) {
        units.forEach(function (u, i) { var n = u.heading !== undefined ? u.heading : trimEnd(u.text);
          if (i === 0 && /\b(topics?|review|study guide|final|exam|test|quiz|midterm|outline|syllabus)\b/i.test(n)) return; // the list's title
          if (n && words(n).length <= 10) { add(n, [], doc.name); listOnly.push(norm(n)); } });
        return;
      }
      var heads = units.filter(function (u) { return u.heading !== undefined; }).length;
      if (heads >= 2) {
        var cur = null, before = [];
        units.forEach(function (u) {
          if (u.heading !== undefined) { if (cur && cur.s.length) add(cur.name, cur.s, doc.name); cur = { name: u.heading, s: [] }; return; }
          var s = { text: u.text, doc: doc.name, ref: u.ref };
          if (cur) cur.s.push(s); else before.push(s);
        });
        if (cur && cur.s.length) add(cur.name, cur.s, doc.name);
        if (before.length >= 2) add(nameFor(before) || 'Introduction', before, doc.name);
        return;
      }
      // prose with no headings: groups of about 6 sentences, named by their main terms
      var sents = units.filter(function (u) { return u.text; }).map(function (u) { return { text: u.text, doc: doc.name, ref: u.ref }; });
      for (var i = 0; i < sents.length; i += 6) {
        var chunk = sents.slice(i, i + 6);
        if (chunk.length < 2 && topics.length) { topics[topics.length - 1].sentences = topics[topics.length - 1].sentences.concat(chunk); continue; }
        add(nameFor(chunk) || (doc.name + ' part ' + (i / 6 + 1)), chunk, doc.name);
      }
    });
    topics.forEach(function (t) { t.listOnly = !t.sentences.length; });
    return topics;
  }

  function nameFor(sents) {
    var defs = []; sents.forEach(function (s) { var d = parseDefinition(s.text); if (d) defs.push(d.term); });
    if (defs.length) return defs.length > 1 ? cap(defs[0]) + ' and ' + defs[1] : cap(defs[0]);
    var freq = {};
    sents.forEach(function (s) { norm(s.text).split(' ').forEach(function (w) { if (w.length >= 5 && !STOPSET[w]) freq[w] = (freq[w] || 0) + 1; }); });
    var top = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a] || (a < b ? -1 : 1); });
    return top.length ? cap(top[0]) + (top[1] ? ' and ' + top[1] : '') : null;
  }

  /* ---------- 3. Facts ---------- */
  function cleanTerm(t) { return t.replace(/^(the|a|an)\s+/i, '').replace(/\*\*/g, '').trim(); }
  function okTerm(t) {
    var w = words(t);
    return w.length >= 1 && w.length <= 5 && t.length <= 40 && !PRONOUN.test(t) && /[a-z]/i.test(t) && !/[,;()]/.test(t) && !STOPSET[t.toLowerCase()] &&
      !/^(main|key|important|first|last|next|answer|question|result|reason|goal|problem|idea|point|step)s?\b/i.test(t) &&
      !/^(inputs?|outputs?|effects?|causes?|purpose|function|role|difference|benefits?|advantages?|disadvantages?|process|system|answer|results?)$/i.test(t) &&
      !/\b(has|have|had|is|are|was|were|can|could|will|do|does|did|need|needs|makes?|gives?|takes?|uses?)\b/i.test(t);
  }
  function lowerDef(d) { return /^[A-Z][a-z]/.test(d) && !/^(I|[A-Z][a-z]+ [A-Z])/.test(d) ? d.charAt(0).toLowerCase() + d.slice(1) : d; }
  function parseDefinition(text) {
    var s = text.trim(), m;
    if ((m = s.match(/^([^:–—]{1,40}?)\s*(?::|\s[–—-]\s)\s*(.{8,})$/))) {
      var t1 = cleanTerm(m[1]);
      if (okTerm(t1) && words(m[2]).length >= 3) return { term: t1, def: lowerDef(trimEnd(m[2])), kind: 'gloss' };
    }
    if ((m = s.match(/^(.{12,}?)\s+(?:is|are) called\s+(?:the |an? )?([^,.;]{1,40}?)[.!]?$/i))) {
      var t3 = cleanTerm(m[2]);
      if (okTerm(t3) && !PRONOUN.test(m[1])) return { term: t3, def: lowerDef(trimEnd(m[1])), kind: 'called' };
    }
    if ((m = s.match(/^(?:the |an? )?(.{1,40}?)\s+(is|are|was|were|means|refers to|is defined as|are defined as|is known as)\s+(.{8,})$/i))) {
      var t2 = cleanTerm(m[1]), art = (s.match(/^(the|an?)\s/i) || [])[1];
      if (okTerm(t2) && words(m[3]).length >= 3 && !/^(not|also|very|usually|often|always|never|important|made|found|located|used|able|in|on|at|when|because|called)\b/i.test(m[3])) {
        var def = trimEnd(m[3]);
        return { term: t2, def: def, kind: 'is', article: art ? art.toLowerCase() : '', plural: /^(are|were)$/i.test(m[2]) ? true : /^(is|was)/i.test(m[2]) ? false : undefined };
      }
    }
    return null;
  }

  function keyTerms(topics, defs) {
    var terms = {}, freq = {}, display = {};
    defs.forEach(function (d) { terms[d.term.toLowerCase()] = { term: d.term, topicId: d.topicId, def: true }; });
    topics.forEach(function (t) {
      t.sentences.forEach(function (s) {
        var seen = {};
        norm(s.text).split(' ').forEach(function (w) { if (w.length >= 5 && !STOPSET[w] && !/^\d+$/.test(w) && !seen[w]) { seen[w] = 1; freq[w] = (freq[w] || 0) + 1; display[w] = display[w] || t.id; } });
      });
    });
    var total = 0, allTxt = []; topics.forEach(function (t) { total += t.sentences.length; t.sentences.forEach(function (s) { allTxt.push(s.text.toLowerCase()); }); });
    Object.keys(freq).filter(function (w) { return freq[w] >= 3 && freq[w] <= Math.max(4, total * 0.3) && !/^(cells?|things?|people|students?|teachers?|release|produce|contain|include|carry|become|allow|cause|create|change|provide|require|follow|decide|happen|start|build|move|keep|show|stored)$/.test(w) && !allTxt.some(function (x) { return new RegExp('\\bto ' + w + '\\b').test(x); }); }).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 30).forEach(function (w) {
      if (!terms[w] && !Object.keys(terms).some(function (k) { return hasWord(k, w); })) terms[w] = { term: w, topicId: display[w], def: false };
    });
    return Object.keys(terms).map(function (k) { return terms[k]; });
  }

  /* ---------- 4. Questions (grounded in one sentence each) ---------- */
  function buildQuestions(topics) {
    var live = topics.filter(function (t) { return t.include; });
    var defs = [], qs = [];
    live.forEach(function (t) {
      t.sentences.forEach(function (s) { var d = parseDefinition(s.text); if (d) { d.topicId = t.id; d.src = s; defs.push(d); } });
    });
    // one definition per term (first one wins)
    var seenTerm = {}; defs = defs.filter(function (d) { var k = d.term.toLowerCase(); if (seenTerm[k]) return false; seenTerm[k] = 1; return true; });
    var terms = keyTerms(live, defs);
    var topicDoc = {}; live.forEach(function (t) { topicDoc[t.id] = t.docs && t.docs[0]; });
    var allText = []; live.forEach(function (t) { t.sentences.forEach(function (s) { allText.push(s.text); }); });
    // the way a term is written in the middle of a sentence (keeps "Constitution", lowers "Osmosis")
    var caseMemo = {};
    function natural(term) {
      var k = term.toLowerCase(); if (caseMemo[k]) return caseMemo[k];
      var out = null;
      if (/^[A-Z0-9]{2,}$/.test(term)) out = term;
      for (var i = 0; !out && i < allText.length; i++) {
        var re = new RegExp('[^.!?:\\s]\\s+(' + esc(term) + ')(?=$|[^A-Za-z0-9])', 'ig'), mm;
        while ((mm = re.exec(allText[i]))) { out = mm[1]; break; }
      }
      if (!out) { var ws = words(term); out = ws.length > 1 && ws.every(function (w) { return /^[A-Z]/.test(w) || /^(of|and|the|for|in|on|to)$/.test(w); }) ? term : term.toLowerCase(); }
      caseMemo[k] = out; return out;
    }
    function articleFor(d) {
      if (d.article) return d.article === 'the' ? 'the ' : (/^[aeiou]/i.test(d.term) ? 'an ' : 'a ');
      if (d.kind !== 'is' && !isPlural(d.term) && /^[a-z]/.test(natural(d.term)) && words(d.term).length <= 3) return /^[aeiou]/i.test(d.term) ? 'an ' : 'a ';
      return '';
    }
    function isPlural(t) { return /(^|\s)(mitochondria|bacteria|data|criteria|phenomena|media|people|children)$/i.test(t) || /[^siu]s$/i.test(t) || /\band\b/.test(t) && !/checks and balances/i.test(t); }

    function src(s) { return { quote: s.text, doc: s.doc, ref: s.ref }; }
    function pickBy(pool, topicId, n, seed, filter) {
      var same = pool.filter(function (x) { return x.topicId === topicId && filter(x); });
      var other = pool.filter(function (x) { return x.topicId !== topicId && filter(x); });
      var doc = (topicDoc[topicId] || ''), sameDoc = other.filter(function (x) { return topicDoc[x.topicId] === doc; });
      var rest = other.filter(function (x) { return sameDoc.indexOf(x) < 0; });
      return shuffle(same, seed).concat(shuffle(sameDoc, seed + 'd'), shuffle(rest, seed + 'o')).slice(0, n);
    }

    defs.forEach(function (d) {
      var defShort = shorten(d.def, 16);
      // A. What does TERM mean?  (options = definitions from the notes)
      var others = pickBy(defs, d.topicId, 3, d.term, function (x) { return x !== d && !hasWord(x.def, d.term) && norm(x.def) !== norm(d.def); });
      if (others.length >= 2) {
        var opts = [defShort].concat(others.map(function (x) { return shorten(x.def, 16); }));
        qs.push(mc('define', d.topicId, 'In your notes, what ' + ((d.plural !== undefined ? d.plural : isPlural(d.term)) ? 'are ' : 'is ') + articleFor(d) + natural(d.term) + '?', opts, src(d.src), d.term,
          others.map(function (x) { return { opt: shorten(x.def, 16), about: x.term, src: src(x.src) }; })));
      }
      // B. Which term matches this description?
      if (!hasWord(d.def, d.term)) {
        var tOthers = pickBy(defs, d.topicId, 3, d.term + 'b', function (x) { return x !== d && !hasWord(d.def, x.term) && x.term.toLowerCase() !== d.term.toLowerCase(); });
        if (tOthers.length >= 2) {
          qs.push(mc('term', d.topicId, 'Which term do your notes describe as “' + defShort + '”?', [cap(d.term)].concat(tOthers.map(function (x) { return cap(x.term); })), src(d.src), d.term,
            tOthers.map(function (x) { return { opt: cap(x.term), about: x.term, src: src(x.src) }; })));
        }
      }
    });

    // C. Fill the gap with the right word from the notes
    live.forEach(function (t) {
      t.sentences.forEach(function (s) {
        var w = words(s.text).length;
        if (w < 6 || w > 38 || PRONOUN.test(s.text) || /\?$/.test(s.text)) return;
        var d = parseDefinition(s.text);
        var inside = terms.filter(function (k) { return hasWord(s.text, k.term) && !(d && k.term.toLowerCase() === d.term.toLowerCase()); });
        if (!inside.length) return;
        inside.sort(function (a, b) { return (b.def - a.def) || (b.term.length - a.term.length); });
        var ans = inside[0];
        var re = new RegExp('(^|[^A-Za-z0-9])(' + esc(ans.term) + ')(?=$|[^A-Za-z0-9])', 'i');
        var mm = s.text.match(re); if (!mm) return;
        if (s.text.toLowerCase().split(ans.term.toLowerCase()).length > 2) return; // term appears twice
        var shown = mm[2];
        var after = s.text.slice(mm.index + mm[0].length), before = s.text.slice(0, mm.index + mm[1].length);
        if (!ans.def && /^[A-Z]/.test(shown) && mm.index > 0 && (/[A-Z][a-z]*\s*$/.test(before) || /^\s+[A-Z]/.test(after))) return; // part of a name, like "United States"
        var gap = s.text.replace(re, '$1_____');
        if (/^_____/.test(gap) && w < 7) return;
        var plural = isPlural(ans.term);
        // never offer a word that the notes link to the answer (it could also be right)
        var linked = defs.filter(function (x) { return hasWord(x.def, ans.term) || x.term.toLowerCase() === ans.term.toLowerCase(); }).map(function (x) { return x.term.toLowerCase(); });
        var ansDef = defs.filter(function (x) { return x.term.toLowerCase() === ans.term.toLowerCase(); })[0];
        var pool = terms.filter(function (k) {
          return k !== ans && !hasWord(s.text, k.term) && k.term.toLowerCase() !== ans.term.toLowerCase() && !hasWord(k.term, ans.term) && !hasWord(ans.term, k.term) &&
            linked.indexOf(k.term.toLowerCase()) < 0 && !(ansDef && hasWord(ansDef.def, k.term)) &&
            !words(k.term).some(function (w) { return w.length > 3 && hasWord(s.text, w); });
        });
        // distractors: same kind of word (concept vs plain word) and same singular/plural, if there are enough
        var good = pool.filter(function (k) { return isPlural(k.term) === plural && k.def === ans.def; });
        if (good.length < 3) good = good.concat(pool.filter(function (k) { return isPlural(k.term) === plural && good.indexOf(k) < 0; }));
        if (good.length < 2) good = pool;
        var dis = pickBy(good, t.id, 3, s.text, function () { return true; });
        dis = good.filter(function (k) { return dis.indexOf(k) >= 0; }).length >= 2 ? dis : [];
        if (dis.length < 2) return;
        var atStart = /^_____/.test(gap);
        var answerTxt = atStart ? cap(shown) : shown;
        qs.push(mc('gap', t.id, 'Fill the gap: “' + gap + '”', [answerTxt].concat(dis.map(function (k) { return atStart ? cap(natural(k.term)) : natural(k.term); })), src(s), ans.term,
          dis.map(function (k) { var dd = defs.filter(function (x) { return x.term.toLowerCase() === k.term.toLowerCase(); })[0]; return { opt: k.term, about: k.term, src: dd ? src(dd.src) : null }; })));
      });
    });

    // D. Explain it in your own words (self-check). Every topic gets one.
    live.forEach(function (t) {
      if (t.listOnly) {
        qs.push({ id: 'q' + hash('self|' + t.id), type: 'self', topicId: t.id, prompt: 'How sure do you feel about “' + t.name + '”? Say or write what you remember, then rate yourself.', noNotes: true, src: null });
      } else if (t.sentences.length >= 2) {
        var key = t.sentences.slice(0, 4).map(src);
        qs.push({ id: 'q' + hash('recall|' + t.id), type: 'recall', topicId: t.id, prompt: 'Without looking: what are the main points of “' + t.name + '”? Say or write them, then compare with your notes.', src: key[0], compare: key });
      }
    });

    // remove exact duplicate ids
    var ids = {}; return qs.filter(function (q) { if (ids[q.id]) return false; ids[q.id] = 1; return true; });
  }

  function mc(type, topicId, prompt, options, source, term, wrongInfo) {
    var id = 'q' + hash(type + '|' + source.quote + '|' + term);
    var uniq = [], seen = {};
    options.forEach(function (o, i) { var k = norm(o); if (!seen[k]) { seen[k] = 1; uniq.push({ text: o, right: i === 0 }); } });
    var order = shuffle(uniq, id);
    return { id: id, type: type, topicId: topicId, prompt: prompt, options: order.map(function (o) { return o.text; }), answer: order.findIndex(function (o) { return o.right; }), term: term, src: source, wrong: wrongInfo || [] };
  }

  /* ---------- 5. Feedback ---------- */
  var EXTRA = {
    define: 'Say the definition out loud in your own words, then check it against the sentence from your notes. If you can explain it to a friend, you are close.',
    term: 'Cover the options and try to name the term first. Then look. Naming it from memory sticks better than picking it.',
    gap: 'Read the whole sentence again and ask which word makes it true. Picture where this idea sits in your notes.',
    recall: 'Try the same topic again tomorrow without looking. Remembering after a gap is what makes it stick.',
    self: 'Add notes for this topic (a page from your textbook or class notes) so the app can ask real questions about it.'
  };
  function feedback(q, picked) {
    var right = picked === q.answer;
    var out = { right: right, correct: q.options ? q.options[q.answer] : null, src: q.src, extra: EXTRA[q.type] };
    if (!right && q.options && picked != null && picked >= 0) {
      var p = q.options[picked];
      var info = (q.wrong || []).filter(function (w) { return norm(w.opt) === norm(p); })[0];
      if (info && info.src) out.otherSrc = { term: info.about, src: info.src, type: q.type };
    }
    return out;
  }

  // a different question about the same idea, for the second try
  function retryFor(q, all, seed) {
    if (!q.options) return null;
    var sib = all.filter(function (x) { return x.id !== q.id && x.options && x.topicId === q.topicId && x.term && q.term && x.term.toLowerCase() === q.term.toLowerCase(); });
    if (sib.length) return sib[0];
    var opts = shuffle(q.options.map(function (o, i) { return { t: o, r: i === q.answer }; }), q.id + (seed || 'r'));
    return Object.assign({}, q, { retryOf: q.id, options: opts.map(function (o) { return o.t; }), answer: opts.findIndex(function (o) { return o.r; }) });
  }

  /* ---------- 6. Estimates (never "mastered") ---------- */
  // answers: [{qid, topicId, r: 1 | 0.5 | 0, self?: bool, at}]
  function topicStatus(topicId, answers) {
    var mine = answers.filter(function (a) { return a.topicId === topicId; });
    var recent = mine.slice(-6);
    if (!recent.length) return { key: 'new', label: 'Not checked yet', score: null, n: 0 };
    var score = recent.reduce(function (s, a) { return s + a.r; }, 0) / recent.length;
    var key = score < 0.5 ? 'practice' : score < 0.8 ? 'getting' : 'solid';
    if (key === 'solid' && mine.length < 3) key = 'getting'; // one or two right answers is not enough to say "solid"
    var label = { practice: 'Needs practice', getting: 'Getting there', solid: 'Looking solid' }[key];
    return { key: key, label: label, score: score, n: mine.length, early: mine.length < 3, selfOnly: recent.every(function (a) { return a.self; }) };
  }

  /* ---------- 7. Plan ---------- */
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }

  // set: {mode, testDate, minutes, days:[0..6 weekdays], topics, answers}; today: Date
  function buildPlan(set, today) {
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var live = set.topics.filter(function (t) { return t.include; });
    var minutes = set.minutes || 20, perSession = 2;
    var sessions = Math.max(1, Math.floor(minutes / 10));
    var weekdays = set.days && set.days.length ? set.days : [0, 1, 2, 3, 4, 5, 6];
    var end, hasTest = set.mode === 'test' && set.testDate;
    if (hasTest) end = parseYmd(set.testDate); else end = addDays(today, 14);
    var span = Math.round((end - today) / 864e5);
    var out = { days: [], fits: true, past: hasTest && span < 0, testToday: hasTest && span === 0, span: span };
    if (out.past) return out;
    var need = {}, last = {};
    live.forEach(function (t) { var st = topicStatus(t.id, set.answers || []); need[t.id] = st.key === 'new' ? 0.8 : Math.max(0.15, 1 - st.score); last[t.id] = -1; });
    var studyDays = [];
    for (var i = 0; i < span || (!hasTest && i < 14); i++) { var d = addDays(today, i); if (weekdays.indexOf(d.getDay()) >= 0) studyDays.push(i); }
    var slots = studyDays.length * sessions * perSession;
    var needy = live.filter(function (t) { return need[t.id] >= 0.5; }).length;
    out.fits = slots >= needy * 2;
    var lastStudy = studyDays.length ? studyDays[studyDays.length - 1] : -1;
    for (var k = 0; k < (hasTest ? span + 1 : 14); k++) {
      var date = addDays(today, k), day = { date: ymd(date), dow: date.getDay(), offset: k, topics: [], sessions: 0, kind: 'rest' };
      if (hasTest && k === span) { day.kind = 'test'; out.days.push(day); continue; }
      if (studyDays.indexOf(k) >= 0) {
        day.sessions = sessions;
        if (k === lastStudy && hasTest && live.length > 2 && studyDays.length > 1) { day.kind = 'review'; day.topics = live.map(function (t) { return t.id; }); }
        else {
          day.kind = 'practice';
          var ranked = live.slice().sort(function (a, b) {
            var pa = need[a.id] * (1 + 0.35 * (k - last[a.id])), pb = need[b.id] * (1 + 0.35 * (k - last[b.id]));
            return pb - pa || (a.id < b.id ? -1 : 1);
          });
          day.topics = ranked.slice(0, Math.min(live.length, sessions * perSession)).map(function (t) { return t.id; });
          day.topics.forEach(function (id) { need[id] = Math.max(0.15, need[id] - 0.25); last[id] = k; });
        }
      }
      out.days.push(day);
    }
    return out;
  }

  /* ---------- 8. Next session ---------- */
  // Picks about 6 questions: missed ones first, then new ones, from the plan's topics.
  function nextSession(set, questions, today, size, onlyTopic) {
    size = size || 6;
    var flags = set.flags || {}, answers = set.answers || [];
    var usable = questions.filter(function (q) { return !flags[q.id]; });
    var topicIds;
    if (onlyTopic) topicIds = [onlyTopic];
    else {
      var plan = buildPlan(set, today);
      var day = plan.days.filter(function (d) { return d.topics.length; })[0];
      topicIds = day ? day.topics.slice() : set.topics.filter(function (t) { return t.include; }).map(function (t) { return t.id; });
    }
    var lastBy = {}, missed = {};
    answers.forEach(function (a, i) { lastBy[a.qid] = i; if (a.r < 1 && !a.self) missed[a.qid] = true; else if (a.r === 1) delete missed[a.qid]; });
    function rank(q) { if (missed[q.id]) return 0; if (lastBy[q.id] === undefined) return 1; return 2; }
    var picked = [], per = Math.max(1, Math.ceil(size / Math.max(1, topicIds.length)));
    topicIds.forEach(function (tid) {
      var qs = usable.filter(function (q) { return q.topicId === tid; });
      var mcq = qs.filter(function (q) { return q.options; }).sort(function (a, b) { return rank(a) - rank(b) || ((lastBy[a.id] === undefined ? -1 : lastBy[a.id]) - (lastBy[b.id] === undefined ? -1 : lastBy[b.id])) || (a.id < b.id ? -1 : 1); });
      // vary the types: take one of each type first
      var byType = [], used = {};
      mcq.forEach(function (q) { if (!used[q.type] && rank(q) <= 1) { used[q.type] = 1; byType.push(q); } });
      var order = byType.concat(mcq.filter(function (q) { return byType.indexOf(q) < 0; }));
      var take = order.slice(0, per);
      if (!take.length) take = qs.filter(function (q) { return !q.options; }).slice(0, 1);
      picked = picked.concat(take);
    });
    // one explain-in-your-own-words check per session, if there is room
    var recall = usable.filter(function (q) { return (q.type === 'recall' || q.type === 'self') && topicIds.indexOf(q.topicId) >= 0 && picked.indexOf(q) < 0; })
      .sort(function (a, b) { return (lastBy[a.id] === undefined ? -1 : lastBy[a.id]) - (lastBy[b.id] === undefined ? -1 : lastBy[b.id]); })[0];
    picked = picked.slice(0, recall ? size - 1 : size);
    if (recall) picked.push(recall);
    return { topicIds: topicIds, questions: picked };
  }

  // Quick check: one question per topic (up to max), to make a first rough guess.
  function quickCheck(topics, questions, max) {
    max = max || 8;
    var live = topics.filter(function (t) { return t.include; });
    var withQ = live.filter(function (t) { return questions.some(function (q) { return q.topicId === t.id && q.options; }); });
    withQ.sort(function (a, b) { return b.sentences.length - a.sentences.length; });
    return withQ.slice(0, max).map(function (t) {
      var qs = questions.filter(function (q) { return q.topicId === t.id && q.options; });
      return qs.filter(function (q) { return q.type === 'define'; })[0] || qs[0];
    });
  }

  function looksLikeGradedTest(text) {
    var n = 0;
    if (/^\s*name\s*[:_]/im.test(text)) n += 2;
    n += (text.match(/\(\s*\d+\s*(points?|pts|marks)\s*\)/gi) || []).length;
    if (/\b(time limit|do not open|exam form|answer sheet|proctor|submit your answers)\b/i.test(text)) n += 2;
    n += Math.min(4, (text.match(/^\s*(question\s*)?\d+[.)]\s.+\?\s*$/gim) || []).length / 2);
    return n >= 4;
  }

  var api = { hash: hash, norm: norm, toUnits: toUnits, headingText: headingText, findTopics: findTopics, parseDefinition: parseDefinition, buildQuestions: buildQuestions,
    feedback: feedback, retryFor: retryFor, topicStatus: topicStatus, buildPlan: buildPlan, nextSession: nextSession, quickCheck: quickCheck,
    looksLikeGradedTest: looksLikeGradedTest, shuffle: shuffle, ymd: ymd, parseYmd: parseYmd, addDays: addDays, hasWord: hasWord, isTopicList: isTopicList };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SREngine = api;
})(typeof self !== 'undefined' ? self : this);
