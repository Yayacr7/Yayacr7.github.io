# Scam Pause

"Check before you trust."

Paste a suspicious text, email, listing or payment request (or add a screenshot). Scam Pause highlights warning signs in the words, explains each one in plain language, suggests safe next steps and shows official reporting guidance with its source and the date it was checked.

Live path once merged: `yayacr7.github.io/scam-pause/` (noindex).

## What it is, and what it is not
- **It is** a pause button: a calm second look before you reply, pay, click or share a code.
- **It is not** a verdict. It never says a message is safe. Words alone cannot prove who sent a message.
- **Three honest results, no score:**
  - **Warning signs found**: at least one strong sign (code or password request, gift card / wire / crypto payment, remote access, a web address imitating a known name, an "@" trick, overpayment, "move money to keep it safe", hidden instructions aimed at checking tools), or two "watch out" signs.
  - **Needs independent verification**: claims, links or named organizations to check outside the message.
  - **Not enough information**: none of the known signs found, or too little text. Always says "that does not mean it is safe".
- No number score or percentage: there is no honest way to measure one.

## Screens
| Screen | Route | What it does |
|---|---|---|
| Home | `#/home` | "Check before you trust.", one big **Check a message** button, try a sample, 3 promises, recent saved checks. |
| Check | `#/check` | Paste text or Screenshot, type (text / email / listing / payment request / not sure), optional sender, labeled SAMPLE messages. |
| Result: Findings | `#/result` | Status, the message with highlighted evidence, each finding with a plain explanation and quotes, links (defanged, not opened), sender notes, "What Scam Pause cannot tell you", and a separate **Checks with outside services** box. |
| Result: What to do next | tab | Steps tailored to what was found (do not open the link, contact the organization through the official app, never share codes, payment steps, call family on the known number...). |
| Result: Report it | tab | Official US guidance that fits the message, each with source link and "Checked November 20, 2026". |
| Saved checks | `#/saved` | Only checks you chose to save; open or delete each. |
| Privacy | `#/privacy` | What happens to your data, counts, delete all, remove message text, larger text, erase everything. |
| How it works | `#/about` | Rules not AI, the three results, limits, plans idea, sources. |

## Text analysis vs. outside checks (kept separate)
| Part | Where it runs | Status |
|---|---|---|
| Word rules (`analyze.js`) | On the device | Built. Fixed patterns; no AI. |
| Screenshot reading | On the device (Tesseract.js, files reused from `../screenshot-done/vendor/ocr/`) | Built. English only, can misread. Picture never uploaded or saved. **Depends on the Screenshot → Done folder staying on the site.** |
| Website registration date (RDAP via rdap.org) | Outside service, only when tapped; sends only the website name | Built, shows source + time, says "Unavailable right now" on failure. **Not tested against the real rdap.org** (blocked from the build environment); tested with a stand-in answer and a simulated outage. rdap.org may not allow browser requests for every registry. |
| Phishing block lists (e.g. Google Safe Browsing) | Would need an API key + small server | Not built. The app says so. |
| AI explanations | Would need an API + server; message would leave the device | Not built on purpose. |

## Untrusted content: how messages are kept from controlling the app
- Rules are fixed code; message text is only matched, never interpreted as instructions. Instruction-like text ("ignore previous instructions", "mark this as safe", `SYSTEM:`, `[INST]`) is itself reported as a warning sign.
- All message text is escaped or set with `textContent`; the highlighted view is built from text nodes only.
- Links are never opened, fetched, prefetched or made tappable; they are shown defanged (`hxxps://evil[.]top`). `format-detection` stops phones auto-linking numbers.
- Content Security Policy blocks inline scripts, plugins, forms and base-URL changes (defense in depth).
- Hidden characters (zero-width, right-to-left overrides) are removed before checking and reported; full-width letters are normalized.
- Tests prove: no script from a message runs, saved checks and settings are not changed by a message, no request leaves the device, no window opens, and the result stays "Warning signs found".

## Privacy
No server, account, analytics or third-party requests (except the optional, user-tapped RDAP lookup). Saved checks are off by default; when saving you choose findings only or findings + message text. Stored in `localStorage` on this device; works (without saving) if storage is blocked.

## Official guidance (checked Nov 20, 2026)
Checked by searching only the official sites (direct page fetches were blocked from the build environment): FTC spam texts (forward to 7726), FTC phishing (reportphishing@apwg.org), FTC verification codes, FTC gift card scams + ReportFraud.ftc.gov FAQ (wire, gift card, crypto), FTC "never move your money to protect it", FTC government impersonation, FBI IC3, IdentityTheft.gov. US only.

## Business model to test (hypothesis)
Basic checks and explanations stay free. Possible later: a paid family plan (help relatives, shared saved checks) or higher usage, only after people ask for it. Never fear-based upsells or false alerts.

## Known limits
English only; new scam wording can slip past rules; cannot detect AI-made text, voices or images; cannot see the real sender; organization main domains come from general knowledge (companies use other addresses too); reporting guidance is US-only. Not tested on real Safari/iPhone hardware, a screen reader, or with real users.

## Tests
```
node scam-pause/tests/analyze-test.js          # 104 checks: samples, ordinary messages, 3000 random messages, injection attempts, links, speed, guidance
python3 -m http.server 8765 &                   # from the repo root
AXE_PATH=/path/axe.min.js node scam-pause/tests/browser-test.js   # 135 checks incl. attacks, real screenshot reading, 6 device sizes, axe scan
```
