/* Scam Pause: text analysis.
   Rule-based and local. It never runs, opens or follows anything inside the message.
   The message is treated as data only: it is matched against fixed patterns and
   nothing in it can change these rules, the result wording or the app.
   Works in the browser (window.SPAnalyze) and in Node (module.exports). */
(function (root) {
  'use strict';

  var HIDDEN = /[​-‏‪-‮⁠-⁤⁦-⁩﻿­]/g;

  /* ---------- organizations: main web addresses (general knowledge; companies also use other addresses) ---------- */
  var ORGS = [
    { name: 'PayPal', re: /\bpay\s?pal\b/i, domains: ['paypal.com'] },
    { name: 'Amazon', re: /\bamazon\b/i, domains: ['amazon.com'] },
    { name: 'Apple', re: /\b(apple|icloud|itunes)\b/i, domains: ['apple.com', 'icloud.com'] },
    { name: 'Netflix', re: /\bnetflix\b/i, domains: ['netflix.com'] },
    { name: 'USPS', re: /\b(usps|postal service)\b/i, domains: ['usps.com'] },
    { name: 'UPS', re: /\bups\b(?!\s*and downs)/, domains: ['ups.com'] },
    { name: 'FedEx', re: /\bfed\s?ex\b/i, domains: ['fedex.com'] },
    { name: 'DHL', re: /\bdhl\b/i, domains: ['dhl.com'] },
    { name: 'the IRS', re: /\b(irs|internal revenue service)\b/i, domains: ['irs.gov'] },
    { name: 'Social Security', re: /\bsocial security (administration|office)\b|\bSSA\b/, domains: ['ssa.gov'] },
    { name: 'Chase', re: /\bchase\b(?= (bank|fraud|alert|account|card|online|security))|\bjpmorgan\b/i, domains: ['chase.com'] },
    { name: 'Wells Fargo', re: /\bwells\s?fargo\b/i, domains: ['wellsfargo.com'] },
    { name: 'Bank of America', re: /\bbank of america\b|\bbofa\b/i, domains: ['bankofamerica.com'] },
    { name: 'Microsoft', re: /\b(microsoft|outlook|office 365|windows defender)\b/i, domains: ['microsoft.com', 'live.com', 'outlook.com', 'office.com'] },
    { name: 'Google', re: /\b(google|gmail)\b(?! voice code)/i, domains: ['google.com'] },
    { name: 'Meta / Facebook', re: /\b(facebook|instagram|meta)\b(?! ?(marketplace|tag))/i, domains: ['facebook.com', 'instagram.com', 'meta.com'] },
    { name: 'Coinbase', re: /\bcoinbase\b/i, domains: ['coinbase.com'] },
    { name: 'Venmo', re: /\bvenmo\b/i, domains: ['venmo.com'] },
    { name: 'Cash App', re: /\bcash\s?app\b/i, domains: ['cash.app', 'square.com'] },
    { name: 'Geek Squad', re: /\bgeek\s?squad\b/i, domains: ['geeksquad.com', 'bestbuy.com'] },
    { name: 'Norton', re: /\bnorton\b/i, domains: ['norton.com'] },
    { name: 'McAfee', re: /\bmcafee\b/i, domains: ['mcafee.com'] },
    { name: 'Walmart', re: /\bwalmart\b/i, domains: ['walmart.com'] },
    { name: 'Xfinity', re: /\b(xfinity|comcast)\b/i, domains: ['xfinity.com', 'comcast.net'] },
    { name: 'Verizon', re: /\bverizon\b/i, domains: ['verizon.com'] },
    { name: 'E-ZPass / toll service', re: /\b(e-?z ?pass|toll (service|road|services)|unpaid tolls?)\b/i, domains: [] }
  ];
  var FREE_MAIL = ['gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com', 'aol.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'gmx.com', 'mail.com', 'yandex.com'];
  var SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 'tiny.cc', 'rb.gy', 't.ly', 'tiny.one', 's.id', 'qrco.de'];
  var TWO_LEVEL = ['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'co.jp', 'com.br', 'com.mx', 'co.in', 'co.za', 'com.cn'];
  var TLDS = 'com|net|org|gov|edu|mil|io|co|us|info|biz|top|xyz|site|online|club|shop|store|live|app|link|click|me|ly|gl|ru|cn|tk|ml|ga|cf|gq|icu|buzz|vip|cc|ws|pw|today|support|help|services|center|win|bid|loan|work|cloud|digital|world|space|website|tech|pro|uk|ca|au|de|fr|in|ai|tv|sbs|cfd|lat|mobi|asia|cyou|rest|bond';
  var URL_RE = new RegExp('\\b(?:(?:https?|hxxps?):\\/\\/[^\\s<>"\'()]+|www\\.[^\\s<>"\'()]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+(?:' + TLDS + ')(?:\\/[^\\s<>"\'()]*)?(?![a-z0-9.-]*@))', 'gi');
  var EMAIL_RE = /\b[a-z0-9._%+-]+@((?:[a-z0-9-]+\.)+[a-z]{2,24})\b/gi;

  /* ---------- word rules ---------- */
  // level: 'strong' = a warning sign on its own; 'caution' = a pressure or trick; 'verify' = a claim to check yourself.
  var RULES = [
    /* pressure */
    { id: 'urgent', group: 'pressure', level: 'caution', title: 'Pressure to act right now',
      explain: 'The message pushes you to act fast. Real organizations give you time. A deadline stops you from checking, which is what a scammer wants.',
      res: [/\b(act|respond|reply|pay|call|verify|confirm|update|click)\s+(now|immediately|right away|today|asap)\b/i, /\b(immediately|urgent(ly)?|asap|right away|final (notice|warning|reminder)|last (chance|warning|notice)|time[- ]sensitive|expires? (today|tonight|soon|in \d+))\b/i, /\bwithin\s+(\d+|one|two|twenty[- ]four|24|48|72)\s*(minutes?|hours?|hrs?|mins?)\b/i, /\b(today only|before it'?s too late|don'?t delay|do not delay)\b/i] },
    { id: 'threat', group: 'pressure', level: 'caution', title: 'A threat if you do not act',
      explain: 'It warns that something bad will happen (account closed, arrest, fine, lost package) unless you act. Fear makes people skip checking.',
      res: [/\b(account|card|service|access|number)\s+(will be|has been|is being|was)\s+(suspended|locked|closed|terminated|disabled|deactivated|frozen|restricted|blocked)\b/i, /\b(suspended|locked|deactivat\w+|frozen)\s+(account|card)\b/i, /\b(arrest|warrant|legal action|lawsuit|police|deport\w*|jail)\b/i, /\b(late fee|penalt(y|ies)|will be (returned|destroyed|charged))\b/i] },
    { id: 'secret', group: 'pressure', level: 'caution', title: 'Asks you to keep it secret',
      explain: 'It tells you not to talk to anyone, or to keep this quiet. Scammers isolate people so nobody can warn them.',
      skipIfNext: /^[^.!?\n]{0,30}\b(code|password|pin|passcode)\b/i,
      res: [/\b(don'?t|do not|never)\s+(tell|tell anyone|talk to|mention|share this with|inform)\b/i, /\b(keep (this|it) (secret|private|confidential|between us)|strictly confidential)\b/i] },
    /* secrets */
    { id: 'code', group: 'secrets', level: 'strong', title: 'Asks for a verification code',
      explain: 'It asks you to share a one-time code. Those codes prove you are you. Anyone who gets one can get into your account. The FTC says never share a verification code.',
      neg: true,
      res: [/\b(send|share|tell|read|give|reply with|forward|provide|text|confirm|repeat)\b[^.!?\n]{0,40}\b(code|otp|passcode)\b/i, /\b(what is|what's) the (code|number) (you|that) (got|received|just got)\b/i] },
    { id: 'codemention', group: 'secrets', level: 'verify', title: 'Contains a verification code',
      explain: 'If you did not just try to sign in or sign up, someone may be trying to get into your account with your number. Never share the code with anyone, even someone who says they are from the company.',
      res: [/\b(verification|security|one[- ]time|confirmation|login|access|authentication)\s+(code|pin|passcode)\b/i, /\b(otp|2fa code|google voice code)\b/i] },
    { id: 'password', group: 'secrets', level: 'strong', title: 'Asks for a password or PIN',
      explain: 'It asks for your password, PIN or login. A real company never needs you to send these in a message or through a link.',
      neg: true,
      res: [/\b(send|share|enter|confirm|verify|provide|reply with|tell|give|type|update|re-?enter|submit)\s+(us\s+|me\s+)?(your\s+|the\s+)?(password|passcode|pin|login details|log-?in credentials|credentials|sign-?in details|security answers?)\b/i, /\bmother'?s maiden name\b/i] },
    { id: 'personal', group: 'secrets', level: 'caution', title: 'Asks for personal or card details',
      explain: 'It asks for details like your Social Security number, card number or bank login. Only give these on a site or app you opened yourself, never through a link in a message.',
      res: [/\b(social security number|ssn|card number|cvv|cvc|expiration date|routing number|account number|bank (login|details)|date of birth|driver'?s license)\b/i, /\b(confirm|verify|update)\s+(your\s+)?(identity|billing|payment (info|information|details|method)|personal (info|information|details)|account (info|information|details))\b/i] },
    { id: 'remote', group: 'control', level: 'strong', title: 'Asks you to install an app or give remote access',
      explain: 'It asks you to install software or let someone control your device. That can give them your bank and email. Real support does not start this way.',
      res: [/\b(anydesk|teamviewer|ultraviewer|logmein|quick ?assist|screen ?connect|rustdesk|supremo)\b/i, /\b(remote (access|control|session|desktop)|share your screen|screen sharing)\b/i, /\b(download|install)\s+(this|the|our)\s+(app|software|program|tool|apk)\b/i] },
    /* payment */
    { id: 'giftcard', group: 'payment', level: 'strong', title: 'Wants payment by gift card',
      explain: 'Gift cards are like cash and cannot be traced or reversed. The FTC says anyone who tells you to pay with gift cards is a scammer.',
      res: [/\b(gift ?cards?|itunes cards?|google play cards?|steam cards?|apple cards?|ebay cards?|target cards?|vanilla (visa|card)|card numbers? (on|from) the back|scratch (off )?the back)\b/i] },
    { id: 'wire', group: 'payment', level: 'strong', title: 'Wants a wire, crypto or cash payment',
      explain: 'Wire transfers, cryptocurrency, cash and crypto ATMs are hard or impossible to get back. The FTC says anyone who insists you pay this way is a scammer.',
      res: [/\b(wire (transfer|the money|money|funds)|western union|moneygram|money ?gram|bitcoin|btc|crypto(currency)?|usdt|tether|ethereum|crypto (atm|wallet)|bitcoin (atm|machine)|cash (by mail|in an envelope|courier)|send cash|courier will (pick|collect)|money order)\b/i] },
    { id: 'p2p', group: 'payment', level: 'caution', title: 'Wants a payment app transfer',
      explain: 'Apps like Zelle, Venmo and Cash App are made for paying people you know. Money sent to a stranger is usually gone. Be extra careful if they say "friends and family" or "send it to yourself".',
      res: [/\b(zelle|venmo|cash ?app|paypal friends|friends (and|&) family)\b(?=[^.!?\n]{0,80}\b(pay|send|transfer|deposit|fee|money|\$))|\b(pay|send|transfer|deposit)[^.!?\n]{0,60}\b(zelle|venmo|cash ?app)\b/i] },
    { id: 'safeacct', group: 'payment', level: 'strong', title: 'Asks you to move money to "keep it safe"',
      explain: 'It asks you to move your money to a "safe" or "secure" account, or to yourself. The FTC says never move your money to protect it: that is a scam.',
      res: [/\b(safe|secure|protected|new|holding)\s+(bank\s+)?account\b(?=[^.!?\n]{0,60}\b(move|transfer|send|deposit))|\b(move|transfer|send)\s+(your|the)\s+(money|funds|savings)\s+(to|into)\s+(a\s+)?(safe|secure|protected|new|holding)\b|\bsend (the )?(money|it) to yourself\b/i] },
    { id: 'overpay', group: 'payment', level: 'strong', title: 'An overpayment or "send back the difference"',
      explain: 'They send a check or payment for too much and ask you to send part back. The first payment usually bounces later, and the money you sent is gone.',
      res: [/\b(overpa(id|yment)|extra (amount|money)|send (back|me back) the (difference|rest|extra)|refund the (difference|extra)|deposit (the|this) check)\b/i, /\b(check|cheque)\b[^.!?\n]{0,60}\b(buy|purchase)\b[^.!?\n]{0,40}\b(equipment|supplies|gift)/i] },
    { id: 'fee', group: 'payment', level: 'caution', title: 'A fee to receive money or a prize',
      explain: 'You are asked to pay something first to get a prize, refund, loan or package. Real prizes and refunds do not ask you to pay to receive them.',
      res: [/\b(processing|release|delivery|redelivery|customs|shipping|clearance|activation|unlock|insurance|transfer|small|handling)\s+fee\b/i, /\bpay\s+(a\s+)?\$?\d+(\.\d\d)?\s+(to|for)\s+(receive|release|claim|reschedule|redeliver|unlock)/i] },
    { id: 'deposit', group: 'payment', level: 'caution', title: 'Wants a deposit before you can see it',
      explain: 'It asks for a deposit or payment before you can see the place or item in person. Fake listings often do this, and the "owner" is often "away".',
      res: [/\b(deposit|first month|holding fee|application fee)\b[^.!?\n]{0,80}\b(before|to hold|to secure|to reserve)\b/i, /\b(out of (the )?(country|town|state)|overseas|on a mission|deployed|working abroad)\b[^.!?\n]{0,80}\b(keys?|ship|mail|deliver)\b/i, /\b(keys? will be (mailed|sent|shipped))\b/i] },
    { id: 'offplatform', group: 'payment', level: 'caution', title: 'Wants to move off the app or site',
      explain: 'It asks to talk or pay outside the marketplace or app. That removes the buyer and seller protections the platform gives you.',
      res: [/\b(text|email|whatsapp|telegram|signal|message) me (at|on)\b/i, /\b(off (the )?(app|platform|site|marketplace)|outside (the )?(app|platform|site))\b/i, /\b(contact|message|text|reach|add|chat with) me (on|via|through) (whatsapp|telegram|signal)\b/i] },
    /* claims to check */
    { id: 'prize', group: 'claims', level: 'verify', title: 'Says you won something',
      explain: 'It says you won a prize, lottery or giveaway. If you did not enter, you did not win. Real prizes never ask you to pay or share codes.',
      res: [/\b(you('ve| have)? (won|been selected|been chosen)|winner|congratulations|lottery|sweepstakes|jackpot|claim your (prize|reward|gift))\b/i] },
    { id: 'refund', group: 'claims', level: 'verify', title: 'Promises a refund or money back',
      explain: 'It says you are owed a refund or money. Check by signing in to the real account yourself, not through the message.',
      res: [/\b(refund|reimburse\w*|money back|unclaimed (funds|money)|stimulus|rebate|overcharged)\b/i] },
    { id: 'delivery', group: 'claims', level: 'verify', title: 'A delivery problem',
      explain: 'It says a package could not be delivered or needs a fee or address update. Check with the tracking number in the shipper\'s official app or site.',
      res: [/\b(package|parcel|shipment|delivery)\b[^.!?\n]{0,60}\b(failed|on hold|could not|couldn'?t|unable|pending|held|undeliverable|incomplete address|reschedule|redeliver\w*)\b/i, /\b(redelivery|re-delivery|update your (address|delivery))\b/i] },
    { id: 'account', group: 'claims', level: 'verify', title: 'A problem with your account or a charge',
      explain: 'It says there is unusual activity, a charge you did not make or a problem with your account. Check by opening the official app or typing the site address yourself.',
      res: [/\b(unusual|suspicious|unauthori[sz]ed|unrecogni[sz]ed) (activity|sign-?in|log-?in|login|charge|transaction|purchase|access)\b/i, /\b(problem|issue) with your (account|payment|order|billing)\b/i, /\b(your (order|purchase|invoice|subscription|renewal)\b[^.!?\n]{0,60}\$\s?\d)/i, /\b(if you did not (make|authori[sz]e|place) (this|the))\b/i] },
    { id: 'gov', group: 'claims', level: 'verify', title: 'Says it is from a government agency',
      explain: 'It claims to be from a government agency. Agencies usually contact you by mail first, and none will demand gift cards, crypto or wire transfers.',
      res: [/\b(irs|internal revenue|social security|ssa|medicare|fbi|ftc|dmv|homeland security|customs|border patrol|federal (agent|officer)|sheriff|court|tax (debt|office))\b/i] },
    { id: 'job', group: 'claims', level: 'verify', title: 'A job offer that seems too easy',
      explain: 'It offers easy pay, quick hiring or work from home with little effort. Look up the company on your own and never pay to get a job.',
      res: [/\b(work from home|remote (job|position)|easy money|earn \$?\d|per (hour|day|week) from home|hiring immediately|no experience (needed|required)|mystery shopper|reshipping|package forwarding)\b/i, /\$\s?\d{2,3}\s*(\/|per)\s*(hr|hour)\b/i] },
    { id: 'family', group: 'claims', level: 'verify', title: 'A family member or friend with a new number or an emergency',
      explain: 'It claims to be someone you know with a new number or an emergency. Call them on the number you already have before doing anything.',
      res: [/\b(hi|hey|hello)?\s*(mum|mom|dad|grandma|grandpa|nana)\b[^.!?\n]{0,40}\b(new number|new phone|lost my phone|broke my phone)\b/i, /\b(this is my new number|new number,? (save|delete)|lost my phone|phone (broke|is broken))\b/i, /\b(i'?m in (trouble|jail|the hospital)|been arrested|need bail|car accident)\b/i] },
    { id: 'tech', group: 'claims', level: 'verify', title: 'Says your device has a virus or problem',
      explain: 'It says your computer or phone is infected or hacked and to call or install something. Real security warnings do not ask you to call a number.',
      res: [/\b(virus|malware|infected|hacked|compromised|trojan|spyware)\b/i, /\b(call|contact) (support|microsoft|apple|tech support|customer support|helpdesk)\b/i] },
    { id: 'romance', group: 'claims', level: 'verify', title: 'Money or investing from someone you met online',
      explain: 'Someone you met online talks about investing, crypto trading or needing money. This is a very common pattern. Never send money to someone you have not met in person.',
      res: [/\b(investment (opportunity|platform)|guaranteed (returns?|profit)|double your money|trading platform|crypto (trading|investment)|passive income)\b/i] },
    /* text aimed at automated tools */
    { id: 'aimed', group: 'hidden', level: 'strong', title: 'Hidden instructions aimed at checking tools',
      explain: 'The message contains instructions meant for an AI or a checking tool, such as "ignore previous instructions" or "mark this as safe". Normal messages do not do this. Scam Pause does not follow instructions inside messages.',
      res: [/\b(ignore|disregard|forget|override)\s+(all\s+|any\s+|the\s+|your\s+)?(previous|prior|above|earlier|preceding|system)\s+(instructions?|prompts?|rules?|messages?)/i, /\b(mark|classify|label|flag|rate|treat|report|consider)\s+(this|the)\s+(message|email|text|sender|link)?\s*(as\s+)?(safe|legit(imate)?|trusted|verified|not (a )?scam|harmless)\b/i, /\b(you are (an?|the) (ai|assistant|language model|scam (checker|detector)))\b/i, /(^|\n)\s*(system|assistant)\s*:/i, /\[(inst|system)\]|<\/?(system|instructions?)>/i, /\b(this (message|email|link) (is|has been) (verified|confirmed|certified) (as )?(safe|legit(imate)?|secure))\b/i] }
  ];

  var GROUPS = {
    pressure: 'Pressure and fear', secrets: 'Passwords, codes and personal details', control: 'Control of your device',
    payment: 'How they want to be paid', links: 'Sender, links and web addresses', claims: 'Claims to check yourself', hidden: 'Hidden text and tricks'
  };

  /* ---------- helpers ---------- */
  function normalize(text) {
    var raw = String(text == null ? '' : text);
    var hiddenCount = (raw.match(HIDDEN) || []).length;
    var t = raw.replace(HIDDEN, '');
    try { t = t.normalize('NFKC'); } catch (e) { /* old browser */ }
    t = t.replace(/\r\n?/g, '\n');
    return { text: t, hiddenCount: hiddenCount };
  }
  function registrable(host) {
    var h = host.toLowerCase().replace(/\.$/, '');
    var parts = h.split('.');
    if (parts.length <= 2) return h;
    var last2 = parts.slice(-2).join('.');
    if (TWO_LEVEL.indexOf(last2) >= 0) return parts.slice(-3).join('.');
    return last2;
  }
  function deleet(s) { return s.replace(/0/g, 'o').replace(/[1!|]/g, 'l').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/rn/g, 'm').replace(/vv/g, 'w'); }
  function defang(u) { return u.replace(/^http/i, 'hxxp').replace(/\./g, '[.]'); }
  function parseUrl(raw) {
    var s = raw.replace(/[.,;:!?)\]]+$/, '');
    var u = s.replace(/^hxxp/i, 'http');
    if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
    var m = u.match(/^(https?):\/\/([^\/?#]+)(.*)$/i);
    if (!m) return null;
    var auth = m[2], userinfo = '';
    if (auth.indexOf('@') >= 0) { userinfo = auth.slice(0, auth.lastIndexOf('@')); auth = auth.slice(auth.lastIndexOf('@') + 1); }
    var host = auth.replace(/:\d+$/, '').toLowerCase();
    if (!host) return null;
    return { raw: s, scheme: /^https?:\/\//i.test(s) ? m[1].toLowerCase() : '', host: host, path: m[3] || '', userinfo: userinfo, domain: registrable(host), ip: /^\d{1,3}(\.\d{1,3}){3}$/.test(host) };
  }
  function orgsIn(text) {
    var out = [];
    ORGS.forEach(function (o) { if (o.re.test(text)) out.push(o); });
    return out;
  }
  function officialFor(domain) {
    for (var i = 0; i < ORGS.length; i++) if (ORGS[i].domains.indexOf(domain) >= 0) return ORGS[i];
    return null;
  }
  function lookalike(host, domain) {
    // returns the org whose name hides in this address while the address is not that org's
    if (officialFor(domain)) return null;
    var labels = deleet(host.replace(/^www\./, '')).split(/[.\-]/);
    var flat = deleet(host).replace(/[.\-]/g, '');
    for (var i = 0; i < ORGS.length; i++) {
      var o = ORGS[i];
      for (var j = 0; j < o.domains.length; j++) {
        var key = o.domains[j].split('.')[0];
        if (key.length < 4) { if (labels.indexOf(key) >= 0) return o; continue; }
        if (flat.indexOf(key) >= 0) return o;
      }
    }
    return null;
  }

  /* ---------- main ---------- */
  function analyze(input) {
    input = input || {};
    var kind = input.kind || 'unknown';
    var n = normalize(input.text);
    var text = n.text;
    var senderN = normalize(input.sender || '');
    var sender = senderN.text.trim();
    var findings = [];
    var spans = [];
    function add(f) {
      var have = null;
      for (var i = 0; i < findings.length; i++) if (findings[i].id === f.id) have = findings[i];
      if (have) { f.evidence.forEach(function (e) { if (have.evidence.indexOf(e) < 0 && have.evidence.length < 4) have.evidence.push(e); }); if (f.detail && !have.detail) have.detail = f.detail; return; }
      findings.push(f);
    }

    // word rules
    RULES.forEach(function (r) {
      var ev = [];
      r.res.forEach(function (re) {
        var g = new RegExp(re.source, re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g');
        var m, guard = 0;
        while ((m = g.exec(text)) && guard++ < 50) {
          if (!m[0].trim()) { g.lastIndex++; continue; }
          var st = m.index + (m[0].length - m[0].replace(/^\s+/, '').length);
          var en = m.index + m[0].replace(/\s+$/, '').length;
          if (r.neg && /(don'?t|do not|never|not|no one|nobody|won'?t|will never)\s+(\w+\s+){0,2}$/i.test(text.slice(Math.max(0, st - 30), st))) continue;
          if (r.skipIfNext && r.skipIfNext.test(text.slice(en, en + 40))) continue;
          spans.push({ start: st, end: en, id: r.id, level: r.level });
          var e = text.slice(st, en);
          if (ev.indexOf(e) < 0) ev.push(e);
        }
      });
      if (ev.length) add({ id: r.id, group: r.group, level: r.level, title: r.title, explain: r.explain, evidence: ev.slice(0, 4) });
    });
    // "gov" rule on its own is weak: only keep it if there is any request or pressure too
    var orgs = orgsIn(text + ' ' + sender);

    // links
    var links = [], seen = {};
    var um, guard2 = 0;
    URL_RE.lastIndex = 0;
    while ((um = URL_RE.exec(text)) && guard2++ < 100) {
      var before = text.slice(Math.max(0, um.index - 1), um.index);
      if (before === '@') continue; // part of an email address
      var p = parseUrl(um[0]);
      if (!p || seen[p.raw.toLowerCase()]) continue;
      seen[p.raw.toLowerCase()] = 1;
      p.start = um.index; p.end = um.index + p.raw.length; p.display = defang(p.raw); p.notes = [];
      links.push(p);
    }
    links.forEach(function (l) {
      var off = officialFor(l.domain);
      var look = lookalike(l.host, l.domain);
      var claimed = orgs.filter(function (o) { return o.domains.length && o.domains.indexOf(l.domain) < 0; });
      var level = null;
      if (l.host.indexOf('xn--') >= 0) { l.notes.push('Uses special look-alike letters (the address starts with "xn--").'); level = 'strong'; add({ id: 'puny', group: 'links', level: 'strong', title: 'A web address with look-alike letters', explain: 'This address uses letters from other alphabets that can look like normal letters, so it can imitate a real site.', evidence: [l.display] }); }
      if (look) { l.notes.push('Contains "' + look.name + '" but is not ' + look.name + '\'s main address (' + look.domains[0] + ').'); level = 'strong'; add({ id: 'lookalike', group: 'links', level: 'strong', title: 'A web address that imitates a known name', explain: 'The link contains a well-known name (like ' + look.name + ') but goes to a different website (' + l.domain + '). Scammers build addresses like this to look real. The real site\'s address ends in ' + look.domains[0] + '.', evidence: [l.display] }); }
      else if (!off && claimed.length) { l.notes.push('The message mentions ' + claimed[0].name + ', but this goes to ' + l.domain + '.'); level = level || 'strong'; add({ id: 'mismatch', group: 'links', level: 'strong', title: 'The link does not match who it says it is from', explain: 'The message says it is from ' + claimed[0].name + ', but the link goes to ' + l.domain + ', not ' + claimed[0].domains[0] + '. Companies sometimes use other addresses, so do not guess: open the official app or type the address yourself.', evidence: [l.display] }); }
      if (l.ip) { l.notes.push('Goes to a number address (IP) instead of a name.'); level = level || 'caution'; add({ id: 'ip', group: 'links', level: 'caution', title: 'A link to a number address', explain: 'The link goes to a string of numbers instead of a website name. Real companies almost always use their name.', evidence: [l.display] }); }
      if (SHORTENERS.indexOf(l.domain) >= 0 || SHORTENERS.indexOf(l.host) >= 0) { l.notes.push('A short link: it hides where it really goes.'); level = level || 'caution'; add({ id: 'short', group: 'links', level: 'caution', title: 'A short link that hides the real address', explain: 'Short links hide where they lead. You cannot see the real website until you open it, so do not open it.', evidence: [l.display] }); }
      if (l.userinfo) { l.notes.push('Has an "@" trick: the real site is after the @.'); level = 'strong'; add({ id: 'attrick', group: 'links', level: 'strong', title: 'A link with an "@" trick', explain: 'Everything before the "@" in a web address is ignored. The real destination is ' + l.host + '.', evidence: [l.display] }); }
      if (l.scheme === 'http' && !l.ip) { l.notes.push('Not a secure (https) address.'); level = level || 'caution'; }
      if (off) l.notes.push('This is ' + off.name + '\'s main address. That is not proof the message is real: check in the official app.');
      l.level = level || 'verify';
      spans.push({ start: l.start, end: l.end, id: 'link', level: l.level });
    });
    if (links.length && !findings.some(function (f) { return f.group === 'links'; })) {
      add({ id: 'haslink', group: 'links', level: 'verify', title: 'Contains a link', explain: 'Links in messages can lead to fake sign-in pages. Scam Pause does not open links. Go to the website by typing the address you already know, or use the official app.', evidence: links.slice(0, 3).map(function (l) { return l.display; }) });
    }

    // sender (typed field or a From: line)
    var fromLine = (text.match(/^\s*from:\s*(.+)$/im) || [])[1] || '';
    var replyTo = (text.match(/^\s*reply-to:\s*(.+)$/im) || [])[1] || '';
    var senderAll = (sender || fromLine).trim();
    var senderInfo = null;
    if (senderAll) {
      var em = senderAll.match(/[a-z0-9._%+-]+@((?:[a-z0-9-]+\.)+[a-z]{2,24})/i);
      var phone = senderAll.replace(/[^\d+]/g, '');
      senderInfo = { raw: senderAll, email: em ? em[0].toLowerCase() : '', domain: em ? registrable(em[1]) : '', notes: [] };
      if (em) {
        var sd = senderInfo.domain;
        var sOff = officialFor(sd);
        var sLook = lookalike(em[1].toLowerCase(), sd);
        var named = orgs.filter(function (o) { return o.domains.length; });
        if (sLook) { senderInfo.notes.push('Contains "' + sLook.name + '" but the address is at ' + sd + '.'); add({ id: 'senderlook', group: 'links', level: 'strong', title: 'The sender address imitates a known name', explain: 'The sender\'s address contains ' + sLook.name + ' but is at ' + sd + ', not ' + sLook.domains[0] + '. The name shown on an email can be anything; the address after the @ matters more, and even that can be faked.', evidence: [senderInfo.email] }); }
        else if (FREE_MAIL.indexOf(sd) >= 0 && named.length && !sOff) { senderInfo.notes.push('A free email address for an organization.'); add({ id: 'freemail', group: 'links', level: 'caution', title: 'An organization writing from a free email address', explain: 'It says it is from ' + named[0].name + ' but was sent from a free ' + sd + ' address. Big organizations use their own addresses.', evidence: [senderInfo.email] }); }
        else if (!sOff && named.length && FREE_MAIL.indexOf(sd) < 0) { senderInfo.notes.push('Mentions ' + named[0].name + ', sent from ' + sd + '.'); add({ id: 'senderdiff', group: 'links', level: 'caution', title: 'The sender\'s address does not match the company named', explain: 'It mentions ' + named[0].name + ' but came from ' + sd + '. Some companies use other addresses for email, so check in the official app instead of replying.', evidence: [senderInfo.email] }); }
        if (sOff) senderInfo.notes.push('This looks like ' + sOff.name + '\'s address, but sender addresses can be faked. That is not proof it is real.');
      } else if (phone.length >= 5 && phone.length <= 6 && /^\d+$/.test(phone)) {
        senderInfo.notes.push('A short code. Real companies use these too, and so do scammers.');
      } else if (phone.length >= 10) {
        senderInfo.notes.push('A regular phone number. Companies usually text from short codes, but this alone proves nothing.');
      }
      if (replyTo) {
        var rm = replyTo.match(/@((?:[a-z0-9-]+\.)+[a-z]{2,24})/i);
        if (rm && senderInfo.domain && registrable(rm[1]) !== senderInfo.domain) add({ id: 'replyto', group: 'links', level: 'caution', title: 'Replies go to a different address', explain: 'If you reply, it goes to ' + registrable(rm[1]) + ', not the address it came from. Scammers do this to get your answer.', evidence: [replyTo.trim()] });
      }
    }

    // highlight sender evidence where it appears in the message (e.g. a From: line)
    findings.forEach(function (f) {
      if (['senderlook', 'freemail', 'senderdiff', 'replyto'].indexOf(f.id) < 0) return;
      f.evidence.forEach(function (e) {
        var key = (e.match(/[a-z0-9._%+-]+@[a-z0-9.-]+/i) || [e])[0];
        var i = text.toLowerCase().indexOf(key.toLowerCase());
        if (key && i >= 0) spans.push({ start: i, end: i + key.length, id: f.id, level: f.level });
      });
    });

    // hidden characters
    if (n.hiddenCount || senderN.hiddenCount) add({ id: 'hiddenchars', group: 'hidden', level: 'caution', title: 'Hidden characters in the text', explain: 'The text had ' + (n.hiddenCount + senderN.hiddenCount) + ' invisible character(s). These can hide words from filters or change how text looks. They were removed before checking. Normal messages rarely have them.', evidence: [] });

    // call this number (helps next steps)
    var phoneAsk = /\b(call|text|contact)\s+(us\s+)?(at|on|now)?\s*:?\s*\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/i.test(text);

    // gov claim alone with nothing else is not a sign; drop to keep it calm
    var nonClaim = findings.filter(function (f) { return f.level !== 'verify'; });

    // status (never "safe")
    var strong = findings.filter(function (f) { return f.level === 'strong'; }).length;
    var caution = findings.filter(function (f) { return f.level === 'caution'; }).length;
    var verify = findings.filter(function (f) { return f.level === 'verify'; }).length;
    var words = (text.match(/[A-Za-z]{2,}/g) || []).length;
    var status;
    if (strong || caution >= 2) status = 'warning';
    else if (caution || verify || links.length || orgs.length || phoneAsk) status = 'verify';
    else status = 'unknown';

    var STATUS = {
      warning: { label: 'Warning signs found', line: 'This message has signs that are common in scams. Do not reply, pay, or open its links. Check through a channel you trust.' },
      verify: { label: 'Needs independent verification', line: 'This message makes claims or contains links you should check yourself, outside the message, before you act.' },
      unknown: { label: 'Not enough information', line: words < 6 ? 'There is too little text to check. Paste the whole message, including who sent it.' : 'We did not find the warning signs we look for. That does not mean it is safe: scams can use normal words. If it asks you to act, check first.' }
    };

    // order findings: strong, caution, verify
    var rank = { strong: 0, caution: 1, verify: 2 };
    findings.sort(function (a, b) { return rank[a.level] - rank[b.level]; });

    return {
      version: 1,
      kind: kind,
      text: text,
      status: status,
      statusLabel: STATUS[status].label,
      statusLine: STATUS[status].line,
      findings: findings,
      groups: findings.reduce(function (acc, f) { if (acc.indexOf(f.group) < 0) acc.push(f.group); return acc; }, []),
      spans: mergeSpans(spans),
      links: links.map(function (l) { return { display: l.display, domain: l.domain, host: l.host, level: l.level, notes: l.notes }; }),
      sender: senderInfo,
      orgs: orgs.map(function (o) { return { name: o.name, domain: o.domains[0] || '' }; }),
      phoneAsk: phoneAsk,
      counts: { strong: strong, caution: caution, verify: verify, nonClaim: nonClaim.length },
      words: words
    };
  }

  function mergeSpans(spans) {
    var rank = { strong: 0, caution: 1, verify: 2 };
    spans.sort(function (a, b) { return a.start - b.start || b.end - a.end; });
    var out = [];
    spans.forEach(function (s) {
      var last = out[out.length - 1];
      if (last && s.start < last.end) {
        if (s.end > last.end) last.end = s.end;
        if (rank[s.level] < rank[last.level]) { last.level = s.level; last.id = s.id; }
        return;
      }
      out.push({ start: s.start, end: s.end, id: s.id, level: s.level });
    });
    return out;
  }

  // Breaks every web address in a piece of text so it cannot be tapped or auto-linked.
  function defangText(t) {
    var re = new RegExp(URL_RE.source, 'gi');
    return String(t).replace(re, function (m, off, all) { return all.charAt(off - 1) === '@' ? m : defang(m); });
  }

  var API = { analyze: analyze, defangText: defangText, normalize: normalize, registrable: registrable, defang: defang, GROUPS: GROUPS, ORGS: ORGS, RULES: RULES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.SPAnalyze = API;
})(this);
