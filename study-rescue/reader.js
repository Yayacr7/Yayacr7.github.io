/* Reads study material on this device. Nothing is uploaded.
   - .txt / .md: read as text
   - .pdf: pdf.js (vendor/pdfjs) reads the text layer; big text becomes a heading
   - photos: Tesseract.js text reader (shared with Screenshot → Done on this site) */
(function (root) {
  'use strict';
  function abs(p) { return new URL(p, location.href).href; }
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + src)); }; document.head.appendChild(s); }); }

  function readText(file) { return file.text().then(function (t) { return { name: file.name, kind: 'text', pages: [t] }; }); }

  var pdfLib = null;
  function readPdf(file, onProgress) {
    pdfLib = pdfLib || import(abs('vendor/pdfjs/pdf.min.mjs')).then(function (m) { m.GlobalWorkerOptions.workerSrc = abs('vendor/pdfjs/pdf.worker.min.mjs'); return m; });
    return pdfLib.then(function (pdfjs) { return file.arrayBuffer().then(function (buf) { return pdfjs.getDocument({ data: new Uint8Array(buf) }).promise; }); }).then(function (doc) {
      var pages = [], n = doc.numPages, i = 0;
      function next() {
        i++; if (i > n) return Promise.resolve();
        if (onProgress) onProgress('Reading page ' + i + ' of ' + n);
        return doc.getPage(i).then(function (page) { return page.getTextContent(); }).then(function (tc) { pages.push(pdfPageText(tc.items)); return next(); });
      }
      return next().then(function () { return { name: file.name, kind: 'pdf', pages: pages }; });
    });
  }
  // Join text pieces into lines; lines in clearly bigger type become "# heading".
  function pdfPageText(items) {
    var lines = [], cur = null;
    items.forEach(function (it) {
      var y = it.transform ? it.transform[5] : 0, h = it.height || Math.abs(it.transform ? it.transform[3] : 0);
      if (cur && Math.abs(y - cur.y) > Math.max(2, h * 0.4)) { lines.push(cur); cur = null; }
      if (!cur) cur = { y: y, text: '', h: 0 };
      if (it.str) { cur.text += (cur.text && !/\s$/.test(cur.text) && !/^\s/.test(it.str) ? ' ' : '') + it.str; cur.h = Math.max(cur.h, h); }
      if (it.hasEOL) { lines.push(cur); cur = null; }
    });
    if (cur) lines.push(cur);
    lines = lines.filter(function (l) { return l.text.trim(); });
    var hs = lines.map(function (l) { return l.h; }).sort(function (a, b) { return a - b; }), median = hs[Math.floor(hs.length / 2)] || 0;
    var out = [], prevY = null;
    lines.forEach(function (l) {
      var t = l.text.replace(/\s+/g, ' ').trim();
      var big = median && l.h >= median * 1.25 && t.split(' ').length <= 10 && !/[.?!]$/.test(t);
      if (prevY !== null && Math.abs(prevY - l.y) > median * 2.2) out.push('');
      out.push(big ? '# ' + t : t); prevY = l.y;
    });
    return out.join('\n');
  }

  var ocr = null;
  function readImage(file, onProgress) {
    ocr = ocr || (window.Tesseract ? Promise.resolve() : loadScript(abs('../screenshot-done/vendor/ocr/tesseract.min.js'))).then(function () {
      return window.Tesseract.createWorker('eng', 1, {
        workerPath: abs('../screenshot-done/vendor/ocr/worker.min.js'), corePath: abs('../screenshot-done/vendor/ocr/'), langPath: abs('../screenshot-done/vendor/ocr/lang'),
        logger: function (m) { if (onProgress && m.status) onProgress((m.status === 'recognizing text' ? 'Reading the photo' : 'Getting the text reader ready') + (m.progress ? ' ' + Math.round(m.progress * 100) + '%' : '')); }
      });
    });
    return ocr.then(function (w) { return w.recognize(file); }).then(function (r) { return { name: file.name, kind: 'image', pages: [r.data.text || ''] }; });
  }

  function read(file, onProgress) {
    var n = (file.name || '').toLowerCase();
    if (/\.pdf$/.test(n) || file.type === 'application/pdf') return readPdf(file, onProgress);
    if (/^image\//.test(file.type) || /\.(png|jpe?g|webp|heic|gif|bmp)$/.test(n)) return readImage(file, onProgress);
    if (/\.(docx?|pages|pptx?|odt)$/.test(n)) return Promise.reject(new Error('Word, Pages and slide files cannot be read here yet. Save it as a PDF, or copy the text and paste it.'));
    return readText(file);
  }
  root.SRReader = { read: read, pdfPageText: pdfPageText };
})(self);
