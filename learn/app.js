// Shared behaviour for the Learn pages: quizzes, calculators, copy buttons.
(function () {
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }

  function money(n) {
    if (!isFinite(n)) return '—';
    return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  }
  function num(id) { return parseFloat(document.getElementById(id).value); }

  // ---------- Quiz engine ----------
  // Question shapes:
  //  { q, options: [...], answer: index, why }
  //  { q, numeric: true, answer: number, tolerance: number (absolute), unit, why }
  function renderQuiz(container, set) {
    container.innerHTML = '';
    var total = set.questions.length, done = 0, right = 0;
    var scoreEl = document.createElement('div');
    scoreEl.className = 'score';
    var scoreSpan = document.createElement('span');
    scoreEl.appendChild(scoreSpan);

    function updateScore() {
      scoreSpan.textContent = right + ' / ' + done + ' correct · ' + (total - done) + ' left';
      if (done === total) {
        var best = store('learn-best-' + set.id) || 0;
        if (right > best) store('learn-best-' + set.id, right);
        scoreSpan.textContent = 'Done: ' + right + ' / ' + total +
          (right === total ? ' — clean sweep.' : right / total >= 0.7 ? ' — solid. Re-read the misses.' : ' — go back to the lesson, then retry.');
      }
    }

    set.questions.forEach(function (item, i) {
      var box = document.createElement('div');
      box.className = 'card q';
      var p = document.createElement('p');
      p.className = 'prompt';
      p.textContent = (i + 1) + '. ' + item.q;
      box.appendChild(p);
      var why = document.createElement('div');
      why.className = 'why';
      why.hidden = true;

      function reveal(ok, extra) {
        done++; if (ok) right++;
        why.hidden = false;
        why.className = 'why ' + (ok ? 'right' : 'wrong');
        why.innerHTML = '<strong>' + (ok ? 'Correct. ' : 'Not quite. ') + '</strong>' + (extra || '') + item.why;
        updateScore();
      }

      if (item.numeric) {
        var row = document.createElement('div');
        row.className = 'numrow';
        var input = document.createElement('input');
        input.type = 'number'; input.step = 'any';
        input.placeholder = 'Your answer' + (item.unit ? ' (' + item.unit + ')' : '');
        input.setAttribute('aria-label', 'Answer to question ' + (i + 1));
        var btn = document.createElement('button');
        btn.textContent = 'Check';
        function check() {
          var v = parseFloat(input.value);
          if (isNaN(v)) { input.focus(); return; }
          var ok = Math.abs(v - item.answer) <= (item.tolerance || 0.01);
          input.disabled = true; btn.disabled = true;
          reveal(ok, ok ? '' : 'The answer is <strong>' + item.answer.toLocaleString() + (item.unit ? ' ' + item.unit : '') + '</strong>. ');
        }
        btn.addEventListener('click', check);
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
        row.appendChild(input); row.appendChild(btn);
        box.appendChild(row);
      } else {
        var opts = document.createElement('div');
        opts.className = 'opts';
        var buttons = item.options.map(function (text, j) {
          var b = document.createElement('button');
          b.className = 'opt';
          b.textContent = text;
          b.addEventListener('click', function () {
            buttons.forEach(function (x) { x.disabled = true; });
            buttons[item.answer].classList.add('right');
            if (j !== item.answer) b.classList.add('wrong');
            reveal(j === item.answer);
          });
          opts.appendChild(b);
          return b;
        });
        box.appendChild(opts);
      }
      box.appendChild(why);
      container.appendChild(box);
    });
    container.appendChild(scoreEl);
    updateScore();
  }

  function initQuizzes() {
    var host = document.getElementById('quiz');
    var tabs = document.getElementById('quiz-tabs');
    if (!host || !tabs || !window.QUIZZES) return;
    var tabButtons = window.QUIZZES.map(function (set, i) {
      var b = document.createElement('button');
      b.setAttribute('role', 'tab');
      var best = store('learn-best-' + set.id);
      b.textContent = set.title + (best ? ' (best ' + best + '/' + set.questions.length + ')' : '');
      b.addEventListener('click', function () { select(i); });
      tabs.appendChild(b);
      return b;
    });
    function select(i) {
      tabButtons.forEach(function (b, j) { b.setAttribute('aria-selected', i === j ? 'true' : 'false'); });
      document.getElementById('quiz-desc').textContent = window.QUIZZES[i].desc;
      renderQuiz(host, window.QUIZZES[i]);
      store('learn-last-quiz', i);
    }
    var hash = location.hash.replace('#', '');
    var start = window.QUIZZES.findIndex(function (s) { return s.id === hash; });
    if (start < 0) start = store('learn-last-quiz') || 0;
    select(Math.min(start, window.QUIZZES.length - 1));
  }

  // ---------- Calculators ----------
  var calcs = {
    compound: function () {
      var p = num('c-principal'), m = num('c-monthly'), r = num('c-rate') / 100, y = num('c-years');
      var months = Math.round(y * 12), i = r / 12, bal = p;
      for (var k = 0; k < months; k++) bal = bal * (1 + i) + m;
      var put = p + m * months;
      return 'After ' + y + ' years: ' + money(bal) + '. You put in ' + money(put) +
        '; growth earned ' + money(bal - put) + '.';
    },
    loan: function () {
      var P = num('l-amount'), r = num('l-rate') / 100 / 12, n = Math.round(num('l-years') * 12);
      var pay = r === 0 ? P / n : P * r / (1 - Math.pow(1 + r, -n));
      return 'Monthly payment: ' + money(pay) + '. Total paid: ' + money(pay * n) +
        ', of which interest is ' + money(pay * n - P) + '.';
    },
    breakeven: function () {
      var f = num('b-fixed'), price = num('b-price'), vc = num('b-var');
      if (price <= vc) return 'Price must be above variable cost per unit, otherwise every sale loses money and there is no break-even point.';
      var cm = price - vc, units = Math.ceil(f / cm);
      return 'Contribution margin: ' + money(cm) + ' per unit (' + (cm / price * 100).toFixed(1) + '%). Break-even: ' +
        units.toLocaleString() + ' units, about ' + money(units * price) + ' in revenue.';
    },
    zopa: function () {
      var s = num('z-seller'), b = num('z-buyer');
      if (b < s) return 'No ZOPA: the buyer\'s maximum (' + money(b) + ') is below the seller\'s minimum (' + money(s) +
        '). No deal makes both better off than walking away, unless one side changes its BATNA or you add something besides price.';
      return 'ZOPA runs from ' + money(s) + ' to ' + money(b) + ' (' + money(b - s) + ' wide). Any price in that range beats both sides\' walk-away. Where it lands depends on anchoring, information and BATNAs.';
    }
  };
  function initCalcs() {
    document.querySelectorAll('[data-calc]').forEach(function (form) {
      var out = form.querySelector('.result');
      function run(e) {
        if (e) e.preventDefault();
        try { out.textContent = calcs[form.dataset.calc](); } catch (err) { out.textContent = 'Check your inputs.'; }
      }
      form.addEventListener('submit', run);
      form.addEventListener('input', run);
      run();
    });
  }

  // ---------- Copy buttons ----------
  function initCopy() {
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = document.getElementById(btn.dataset.copy).textContent.trim();
        var done = function () { var t = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = t; }, 1400); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallback(text); done(); });
        } else { fallback(text); done(); }
      });
    });
    function fallback(text) {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  document.addEventListener('DOMContentLoaded', function () { initQuizzes(); initCalcs(); initCopy(); });
})();
