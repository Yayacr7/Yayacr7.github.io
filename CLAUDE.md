# Working with Yaya

## Rules
- Rate every idea or request out of 10 before building it, with a one-line reason.
- Only build ideas rated 7 or higher. For anything under 7, say why and suggest a better version instead.
- Keep everything simple, honest and genuinely useful: no hype, no fake results, no income promises.
- The site must never be a scam. Never put made-up reviews, ratings, client results or numbers into anything a user could copy into a real ad. Label guesses as guesses and templates as templates.
- Always check your work before saying it is done: run it, test it, look at it. Report honestly what was tested, what failed, and what was not checked.
- Remember what Yaya asks for: add every new request or decision to the log below.

## Big decision (Oct 31, 2026)
- The app is "does it for you" first and must NOT feel like a learning app. The Ad Maker is the first screen (one big centered box, "What ad do you want?", Make my ad, and the ad beside it). Extra fields stay hidden under "Edit details" and "More". Keep it this simple.
- KEEP the four guides and the Business Plan. They sit at the end of the menu under "Guides" as Ads Playbook, Brand Playbook, Clients Playbook, Freelance Playbook and Business Plan. Never remove them unless Yaya clearly asks.
- Use tool wording, not school wording: "playbook", "guide", "tool", "Done, next step", "Ready check". Avoid "course", "lesson", "quiz", "practice", "mark done".

## Request log
- Built Yaya AI Ad Lab (`ai-ads/index.html`): learn AI advertising, an ad builder app, an AI audit, client pricing, ways to get clients, demos everywhere, simple language.
- Not childish: professional dark design, no bright candy colors or emoji.
- No long scrolling: each section fits on one centered screen, using steps and tabs.
- Learn every step of AI advertising: 10-step course with a demo in each step.
- Prices lower and tiered, each tier does more: Free audit, Starter $199, Growth $399, Pro $699, Premium $1,199 a month.
- Make the demos look cool and nice.
- Rate ideas out of 10, only build 7+.
- Always check work and be honest. The website must not be a scam.
- Teach how to get first clients on the website: "First Clients" course (9 steps with practice demos).
- Open question: "get clients for the app" may mean selling the app itself as a subscription (like the Free/Plus/Pro plans in Yaya-builds). Ask before building.
- Asked again how to get clients for AI advertising.
- Added a "Grow" course: freelance profiles and proposals (Upwork, Fiverr, Contra), gig pricing, personal brand, content plan, turning gigs into monthly clients, systems, and scaling (8 steps with practice demos). Added freelance marketplaces and your own content to Get Clients.
- Made AI advertising and freelance brand scaling the two main parts of the app: home page and menu grouped into AI advertising, Brand scaling, and Freelance business.
- The site should help you do brand scaling for other businesses: added a Brand Course (8 steps with demos), a Brand Studio (brand check, positioning, voice, brand kit, content plan, channels, 90-day plan, pitch), and brand packages: Brand Kit $299 once, Brand Growth $349/mo, Brand + Ads $699/mo.
- Asked for a free audit + sample ad for a real business (waiting on the business name and city).
- Asked about copying an ad into an email; a "Copy for email" feature was added, then Yaya asked to remove it and forget that request. It is removed. Do not re-add it unless asked.
- Make sure the website helps you make money with AI ads: added a "Make Money" page (today's actions, a money path of 7 milestones detected from real activity, a tracker that only counts payments you log) and a $99 one-time Quick Ad Pack as the fastest first sale.
- Make it genuinely help you make money with AI ads AND brand scaling if you put the work in (no guarantees). Make Money now has: Today's actions (including follow-ups due), a work log with daily goals and a streak, a 14-day scoreboard with your real reply/call/close rates and coaching, income split by ads vs brand, and both first offers ($99 Quick Ad Pack, $299 Brand Kit) plus the money ladder. Lead tracker now sets follow-up dates.
- The app was hard to understand. Made it simpler: home page with one sentence on what the app is and 3 steps (Learn, Practice, Earn) with progress; plain menu names in 3 groups (Learn, Make, Earn): Ad Studio is now Ad Maker, Brand Studio is now Brand Maker, AI Audit is now Business Checkup; a "How this page works" guide on every page (opens once on the first visit); a "Words explained" glossary of 24 terms. Keep all wording plain and simple.
- Asked if the course is factual. Fact-checked key claims against official sources and benchmarks (Oct 2026), fixed what was outdated (Special Ad Categories now "financial products and services", before-and-after rule softened, CTR guide, dentist/salon/med spa lead costs, Upwork fee), and added a "Facts & sources" page with links. Keep facts sourced; label anything unverified as a guess.
- Asked how to get a first client today: gave a same-day plan (warm texts, walk-ins with a sample ad, $99 Quick Ad Pack with a Stripe Payment Link, online messages, log it).
- Asked for a box to type what ad you want (look, purpose) and have it made: added a "Describe" tab (default) in the Ad Maker. On claude.ai it uses Claude via the sample capability to write the ad (with honesty rules: no invented reviews, ratings or results); everywhere else (GitHub Pages) a keyword reader picks business type, name, city, offer, colors, tone and platform and uses templates. The page says which one it used.
- Not a learning app: removed courses and Business Plan; app is now Make an Ad (first screen), Make a Brand, Check a Business, Find Clients, Make Money, Pricing, AI Prompts. Ad Maker simplified to a centered typing box plus the ad. Ads no longer show placeholder proof text; real rating appears only if typed.
- Said: don't remove the four courses, keep them. Restored all four under "Learn (optional)"; tools stay first.
- Said: bring Business Plan back and keep the four courses, but it must not feel like a learning app. Restored Business Plan; renamed courses to playbooks under "Guides"; changed wording (Tool, Done next step, Ready check).
- Bug: after typing a description and clicking Make my ad, the ad did not show. Causes: on phones the ad appeared below the screen; on claude.ai nothing showed until the AI finished. Fixed: the ad now appears instantly from your words and the screen scrolls to it; on claude.ai the AI then writes a better version and swaps it in (quick model, 40 second limit, late answers never undo newer changes). Added a change box under the ad ("make it blue", "more funny", "say 30% off") plus Another version, Change colors and Change style buttons.
- Asked to make the app live: merged PR #21 into main, so the app is public on GitHub Pages at https://yayacr7.github.io/ai-ads/ (template version; AI writing only on the claude.ai link, which Yaya can share from its Share menu).
- Renamed the app to Curve.ai (logo and browser tab). Note: the domain curve.ai is already owned and in use by someone else (also curveai.com, curveads.com), so it cannot be the web address; getcurve.ai and trycurve.ai showed no site. The app still lives at /ai-ads/ on yayacr7.github.io until Yaya picks an address.
- Renamed again from Curve.ai to Sharper.ai because curve.ai is taken. Checked: sharper.ai is registered by someone else (looks parked, maybe for sale), sharperai.com and getsharper.ai are in use, trysharper.ai showed no site. App still lives at yayacr7.github.io/ai-ads/.
- Asked for any free .ai name. Checked with the official .ai registry (RDAP at rdap.identitydigital.services) on Oct 31, 2026: adsharp.ai, sharpads.ai, adzest.ai, adquill.ai and adtonic.ai were not registered. Yaya chose AdSharp.ai: app renamed to AdSharp.ai. Yaya still needs to buy the domain; Claude cannot buy it.
- Bug again: after typing, the ad did not show. Real cause found on a simulated iPhone: pressing Enter/Go on the keyboard only added a new line; only tapping the button made the ad. Fixed: Enter/Go makes the ad (Shift+Enter = new line) and closes the keyboard; the ad also updates by itself when typing pauses; a "Your ad" label shows; on phones the whole ad shows (no cut-off picture) and the screen scrolls to the top of the ad; on computers a hint says to scroll inside the phone frame. Always test with real keyboard input (Enter) on phone sizes, not just button clicks.
- Make it equal on every device (desktop, laptop, Chromebook, iPhone, iPad, tablets). Tested 15 simulated devices in Chromium (Safari and Firefox engines are not installed here, so Apple devices were simulated in Chrome plus a code review for Safari issues). Fixes: top menu bar below 1200px wide (tablets get full width); Words explained and Facts & sources added to the top bar (they were missing on phones and tablets); 16px text in edit boxes on touch screens (stops iPhone/iPad zoom); 36px tap targets on touch; tighter spacing on short laptop/Chromebook screens; vh fallbacks and -webkit-backdrop-filter for older Safari. Known leftovers: 720px-tall Chromebooks scroll a few px on the longest playbook steps.
