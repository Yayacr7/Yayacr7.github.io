# Study Rescue

“Turn ‘I’m lost’ into a clear next step.” A mobile-first study app: add notes, confirm topics, take a quick check, get a plan that fits your time, practice in short sessions with a second try after a miss.

Live path once merged: `yayacr7.github.io/study-rescue/`

## How it works (honest version)
- **No AI.** `engine.js` is a rule-based reader. It finds headings (markdown `#`, short title lines, “Unit/Chapter…”, big type in PDFs), definitions (“X is…”, “Term: meaning”, “… is called X”) and key words, and writes 4 question types: what a term means, which term fits, fill the gap, explain it in your own words. Every question carries the sentence and line/page it came from.
- Topics with a name only (a topic list) get a “how sure are you?” self-rating, never invented questions.
- Progress labels: Not checked yet / Needs practice / Getting there / Looking solid (needs 3+ answers). Never “mastered”, never a grade prediction.
- The plan is rebuilt from today every time, so a missed day leaves no backlog. Weak topics come back more often; the last day before a test is a light review.
- Wrong answer: the notes line, what the picked option means in the notes, a general tip labeled “not from your notes”, then a second try (counts half).
- Report a problem on any question: it is hidden and not counted; it can be brought back in Progress.
- Files are read on the device: text, PDF (pdf.js 4.10.38 in `vendor/pdfjs`), photos (Tesseract.js, shared from `../screenshot-done/vendor/ocr`, so do not delete that folder). Word/slide files are refused with a message.
- Saved in IndexedDB on the device only. No account or name. “Delete everything” in More.

## Needs a connection that is not set up
Varied AI-written questions and explanations beyond the notes need an AI model (for example the Claude API) behind a small server holding the API key, plus a privacy notice because notes would leave the device.

## Tests
```
npx http-server -p 8765 -c-1 .          # from the repo root
node study-rescue/tests/engine-test.js   # grounding + feedback checks on 6 kinds of notes
node study-rescue/tests/browser-test.js  # full journey, uploads, 5 screen sizes (SHOTS=dir for screenshots)
```
