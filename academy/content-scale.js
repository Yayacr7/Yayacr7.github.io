/* AI Income Academy: Brand Scaling track (main program), added Nov 8, 2026.
   Loads after content.js and adds to window.ACADEMY.
   Every example marked "Hypothetical" is made up to teach. Platform facts were checked Nov 8, 2026
   through web search limited to the official site; see SOURCES. Rules of thumb are labeled. */
(function () {
"use strict";
var A = window.ACADEMY;
function q(text, options, answer, explain) { return { q: text, options: options, answer: answer, explain: explain }; }

/* ---------- tracks ---------- */
A.TRACKS = {
  scale: { id: "scale", name: "Brand Scaling", long: "Brand Scaling track", badge: "Main program",
    desc: "Run paid ads on Instagram, TikTok and Google for clothing and e-commerce brands, as a freelancer or small agency." },
  found: { id: "found", name: "AI Income Foundations", long: "AI Income Foundations", badge: "Optional extra track",
    desc: "Core AI skills plus three other ways to earn: websites and tools, AI assistants and automations, digital products." }
};
A.MODULES.forEach(function (m) { if (!m.track) m.track = "found"; });

/* ---------- facts (checked Nov 8, 2026 via official-domain web search) ---------- */
var F = {
  igAds: { text: "Instagram ads are created and managed in Meta Ads Manager, the same tool as Facebook ads.", src: "Meta Business Help Center", url: "https://www.facebook.com/business/help/1634705703469129" },
  adLib: { text: "Anyone can search the Meta Ad Library for ads currently running on Meta’s apps, so you can see whether a brand is advertising now.", src: "Meta: Ad Library", url: "https://www.facebook.com/help/259468828226154" },
  partners: { text: "On Meta, a business shares assets with an agency through Settings > Users > Partners in its business portfolio, using the agency’s business portfolio ID. It can give full control or partial access (for example, manage ads). No passwords change hands.", src: "Meta: Give a partner access", url: "https://www.facebook.com/business/help/1717412048538897" },
  tiktokBC: { text: "In TikTok Business Center, an admin adds your Business Center as a partner and shares the ad account with Admin, Operator or Analyst access. Pixels and catalogs are shared separately.", src: "TikTok Ads Help: partners in Business Center", url: "https://ads.tiktok.com/resources/help/article/invite-partners-into-tiktok-business-center" },
  mcc: { text: "On Google Ads, an agency’s manager account sends a link request to the client’s customer ID, and an admin on the client’s account accepts it.", src: "Google Ads Help: manager accounts", url: "https://support.google.com/google-ads/answer/7459601" },
  shopifySync: { text: "Shopify has official sales-channel apps for Facebook & Instagram and for Google & YouTube that sync products; TikTok’s Shopify app can turn on the TikTok Events API without coding.", src: "Shopify Help: Google & YouTube channel", url: "https://help.shopify.com/en/manual/online-sales-channels/google" },
  pixelCapi: { text: "The Meta Pixel sends website events from the visitor’s browser; the Conversions API sends them from the store’s server, so ad blockers affect it less. Meta recommends using both and removes duplicate events.", src: "Meta: Conversions API", url: "https://www.facebook.com/business/help/2041148702652965" },
  tiktokPixel: { text: "TikTok works the same way: the TikTok Pixel sends browser events and the Events API sends server events; TikTok recommends both, with duplicates removed.", src: "TikTok Ads Help: Events API", url: "https://ads.tiktok.com/help/article/events-api" },
  advPlus: { text: "Meta renamed Advantage+ shopping campaigns to Advantage+ sales campaigns. Meta’s AI sets the audience, placements and budget; with Advantage+ audience, your targeting is a suggestion, not a hard limit.", src: "Meta: Advantage+ sales campaigns", url: "https://www.facebook.com/business/ads/meta-advantage-plus/sales-campaigns" },
  learning: { text: "Meta ad sets usually leave the learning phase after about 50 optimization events in the 7 days after the last significant edit. Big edits restart learning; ad sets that cannot get there show “Learning limited”.", src: "Meta: About the learning phase", url: "https://www.facebook.com/business/help/112167992830700" },
  smartPlus: { text: "TikTok Smart+ is an AI campaign type: you give goals, creatives and locations, and TikTok automates targeting, bidding and creative choices.", src: "TikTok Ads Help: Smart+", url: "https://ads.tiktok.com/help/article/about-smart-plus-campaign" },
  pmax: { text: "Google Performance Max is one AI-run campaign that shows ads across Google’s channels. Online stores attach a Google Merchant Center product feed.", src: "Google Ads Help: Performance Max", url: "https://support.google.com/google-ads/answer/10724817" },
  merchant: { text: "Google Ads and Merchant Center must be linked before you can create Shopping campaigns.", src: "Google Ads Help: Shopping campaigns", url: "https://support.google.com/google-ads/answer/6275312" },
  aiLabel: { text: "Meta may add an “AI info” label to ad images made or heavily edited with AI. Advertisers must disclose AI use in political or social-issue ads with realistic AI media; no such rule was found for ordinary product ads.", src: "Meta Help: AI labels", url: "https://www.meta.com/help/artificial-intelligence/355108217670024/" },
  endorse: { text: "FTC Endorsement Guides: paid or gifted creator posts must clearly disclose the connection (for example “Gifted by XYZ”). Brands, and agencies involved, can be responsible for creator content they start or pay for.", src: "FTC: Endorsement Guides Q&A", url: "https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking" },
  metaPolicy: { text: "Meta’s ad standards ban misleading claims (exaggerated results, deceptive prices, fake endorsements) and ads that infringe copyright or trademarks.", src: "Meta Transparency Center: ad standards", url: "https://transparency.meta.com/policies/ad-standards/fraud-scams/unacceptable-business-practices/" },
  cml: { text: "TikTok’s Commercial Music Library is pre-cleared music for ads on TikTok only, not other platforms. Other music is not licensed for business use.", src: "TikTok Ads Help: Commercial Music Library", url: "https://ads.tiktok.com/help/article/commercial-music-library" },
  canspam: { text: "CAN-SPAM (US commercial email): accurate header and subject, a clear statement that it is an ad, a valid physical postal address, a clear opt-out, and opt-outs honored within 10 business days. No exception for business-to-business email.", src: "FTC: CAN-SPAM Act compliance guide", url: "https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business" },
  estTax: { text: "US estimated tax: if you expect to owe $1,000 or more for the year, you generally pay in quarterly installments (Form 1040-ES); it covers self-employment tax too.", src: "IRS: Estimated taxes", url: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes" },
  reviews: { text: "The FTC rule on consumer reviews and testimonials took effect October 21, 2024; courts can impose civil penalties for knowing violations.", src: "FTC: Reviews and Testimonials Rule Q&A", url: "https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers" },
  mmo: { text: "FTC (2021 Notice of Penalty Offenses): it is unlawful to make false or unsupported claims about what people will earn from a money-making opportunity, to present unusual results as typical, or to falsely say no experience is needed or that buyers must act immediately.", src: "FTC: Penalty offenses concerning money-making opportunities", url: "https://www.ftc.gov/enforcement/notices-penalty-offenses/penalty-offenses-concerning-money-making-opportunities" }
};
A.FACTS_SCALE = F;

/* ---------- path for the questionnaire ---------- */
A.PATHS.brand = {
  id: "brand", color: "mint", name: "Brand scaling (main program)",
  short: "Run paid ads on Instagram, TikTok and Google for clothing and e-commerce brands.",
  makes: "Ad campaigns for online clothing and streetwear brands: account and tracking setup, ad creatives (often drafted with AI tools), launched tests, weekly optimization and honest reports, paid as a monthly retainer.",
  skills: ["Store math (margins, ROAS, cost per purchase)", "Meta, TikTok and Google ad tools, including their AI campaign types", "Making and testing ad creatives with AI help", "Cold outreach and sales calls", "Clear weekly reporting"],
  work: "You find brands that sell online, pitch them with a short free review, set up access to their ad accounts, launch and manage campaigns with their budget, and report every week. You are paid a retainer (flat fee, % of ad spend, or a revenue share).",
  expenses: "The client pays its own ad spend directly to the platforms, so you can start with $0 in ad money. Your costs: time, maybe a paid AI tool or design tool, and later a website or scheduling tool. Check each tool’s current price on its official site.",
  limits: "Results are never guaranteed: products, prices, season and the store itself matter as much as the ads. Landing the first client takes a lot of outreach. You handle other people’s money and data, so you need care, clear agreements and honesty. Platform tools and rules change often.",
  first: "A full practice plan for a real brand you like (from public info only): break-even ROAS, 5 ad ideas, a test campaign plan and a sample weekly report, clearly labeled as practice."
};
var QI = function (id) { return A.QUESTIONS.filter(function (x) { return x.id === id; })[0]; };
QI("interest").opts.unshift({ v: "brands", label: "Helping online brands sell more with ads", pts: { brand: 3 }, why: "you want to help online brands sell more with ads" });
QI("people").opts.forEach(function (o) { if (o.v === "like") o.pts.brand = 2; if (o.v === "some") o.pts.brand = 1; });
QI("budget").opts.forEach(function (o) { if (o.v === "zero") { o.pts.brand = 1; } });
QI("time").opts.forEach(function (o) { if (o.v === "high") o.pts.brand = 2; if (o.v === "mid") o.pts.brand = 1; });
QI("experience").opts.forEach(function (o) { if (o.v === "ok") o.pts.brand = 1; });

/* ---------- modules ---------- */
[
  { id: "s1", n: 1, track: "scale", color: "mint", title: "Brand scaling basics", sub: "The agency model, what you can promise, and the store numbers that matter." },
  { id: "s2", n: 2, track: "scale", color: "blue", title: "Ad accounts and tracking", sub: "Get access the right way and make sure sales are measured." },
  { id: "s3", n: 3, track: "scale", color: "purple", title: "Audiences and AI creative", sub: "Use the platforms’ AI tools and make ads that stop the scroll." },
  { id: "s4", n: 4, track: "scale", color: "orange", title: "Launch and manage campaigns", sub: "Plan a test, launch it, read the numbers, report weekly." },
  { id: "s5", n: 5, track: "scale", color: "mint", title: "Get clients", sub: "Find brands, pitch with cold outreach, price a retainer." },
  { id: "s6", n: 6, track: "scale", color: "blue", title: "Deliver and grow", sub: "Onboard well, keep clients, grow your agency honestly." }
].forEach(function (m) { A.MODULES.push(m); });

/* ---------- lessons ---------- */
var L = [
{ id: "s1l1", module: "s1", free: true, title: "What freelance brand scaling is", minutes: 15,
  mistake: "Promising a brand sales or a ROAS number. You control the work, not the result.",
  facts: [F.igAds, F.adLib],
  goal: "Explain the brand-scaling agency model: who pays for what, what you do each week, and what you can and cannot promise.",
  terms: [
    ["Brand scaling", "Helping a brand sell more, here mainly through paid ads, while keeping each sale profitable."],
    ["Ad spend", "The money paid to Meta, TikTok or Google to show ads. The brand pays this directly with its own card."],
    ["Retainer", "A monthly fee a client pays you for ongoing work."],
    ["E-commerce brand", "A business that sells products online, often from a Shopify store."]
  ],
  explain: [
    "<p>In freelance brand scaling you act as a small marketing agency, a “middleman” between a brand and the ad platforms. The brand pays the platforms for ads (the <strong>ad spend</strong>) and pays <em>you</em> to plan, launch and manage those ads well.</p>",
    "<h3>What the work really is</h3><ul><li><strong>Setup:</strong> get access to the brand’s ad accounts and check that sales are tracked.</li><li><strong>Creative:</strong> plan and make ad images and videos, often drafted faster with AI tools.</li><li><strong>Launch:</strong> build campaigns on Instagram and Facebook (Meta Ads Manager), TikTok Ads Manager and Google Ads.</li><li><strong>Manage:</strong> read the numbers, stop what loses money, test new ideas, grow what works.</li><li><strong>Report:</strong> a short, honest weekly update.</li></ul>",
    "<h3>Why clothing and streetwear brands</h3><p>Their products are visual, they sell online, and their customers spend time on Instagram and TikTok. Many small brands make great products but have nobody to run ads properly.</p>",
    "<h3>What you can promise, and what you cannot</h3><p>You can promise your <em>process</em>: setup within a week, a set number of new ads a month, weekly reports, fast replies. You cannot promise <em>results</em> like “3x ROAS” or “$10k a month”, because price, product, stock, season, website and competition matter as much as the ads. Honest agencies say this up front.</p>",
    "<p>This is a real skill with real work: landing a first client usually takes many messages, and early months are about learning. The rest of this track teaches each step.</p>"
  ],
  example: { title: "Hypothetical: Dee’s first week as an agency",
    body: "<p>Dee (made up) likes a two-person streetwear brand that posts great photos but runs no ads. Dee checks the Meta Ad Library: no active ads. Dee messages the owner with three specific ideas and offers a free 15-minute review.</p><p>On the call, the owner asks: “Can you get me 5x return?” Dee answers: “I can’t promise a number. I can promise setup in 7 days, 6 new ads a month, a weekly report and a clear test plan. Your ad budget goes straight to Meta on your card.” The owner appreciates the honesty and books a second call.</p>" },
  task: { title: "Build your first brand list",
    steps: ["List 10 clothing or streetwear brands that sell online (Instagram, TikTok or their own store).", "For each, search the Meta Ad Library and note if they run ads right now.", "Write one thing each brand does well and one thing their ads or page could improve.", "Star the 3 brands you would most like to work with."],
    note: "Keep this list in your notes. Module 5 turns it into outreach." },
  quiz: [
    q("In this model, who usually pays the ad spend?", ["You pay the platforms from your own account each month, then invoice the brand for it", "The brand pays the platform directly with its own card", "The platforms pay you"], 1,
      ["Paying ad spend on your own card puts your money at risk if a client pays late or disputes it.", "Right. The brand pays Meta, TikTok or Google directly; you charge for managing the ads.", "Platforms do not pay agencies for running a client’s ads in this model."]),
    q("A brand owner asks you to guarantee 4x ROAS. What is the honest answer?", ["Agree, so you win the client", "Explain you cannot promise results, and describe exactly what you will deliver", "Promise a lower number like 2x so the guarantee feels safe, then explain your plan"], 1,
      ["A results promise you cannot control is misleading and loses trust when it fails.", "Right. Promise your process (setup, number of ads, reports), never the outcome.", "Any results promise has the same problem, whatever the number."]),
    q("Where are Instagram ads created and managed?", ["In the Instagram app only, using the Boost button on each post you want to promote", "In Meta Ads Manager, the same tool as Facebook ads", "In Google Ads"], 1,
      ["The app has a simple Boost button, but agencies manage Instagram ads in Meta Ads Manager.", "Right. Instagram and Facebook ads share Meta Ads Manager.", "Google Ads runs Google’s channels, not Instagram."])
  ]},
{ id: "s1l2", module: "s1", free: true, title: "The numbers every brand owner cares about", minutes: 20,
  mistake: "Celebrating a high ROAS without checking margins. A 3x ROAS can still lose money on a low-margin product.",
  facts: [],
  goal: "Calculate ROAS, cost per purchase, margin per order and break-even ROAS for a real product.",
  terms: [
    ["AOV (average order value)", "The average amount a customer pays per order."],
    ["ROAS (return on ad spend)", "Revenue from ads divided by ad spend. $3,000 from $1,000 of ads is a ROAS of 3."],
    ["CPA (cost per acquisition)", "Ad spend divided by the number of purchases: what one sale costs in ads."],
    ["Margin per order", "What is left from an order after product cost, shipping and payment fees, before ads."],
    ["Break-even ROAS", "The ROAS where ad spend uses up the whole margin, so you neither make nor lose money on that order."]
  ],
  explain: [
    "<p>Brand owners care about one thing: do the ads make them money? To answer, you need four numbers from the store and three formulas. This is math, so you can check every step.</p>",
    "<h3>The formulas</h3><ul><li><strong>ROAS</strong> = revenue from ads ÷ ad spend.</li><li><strong>CPA</strong> = ad spend ÷ purchases.</li><li><strong>Margin per order</strong> = AOV − product cost − shipping and packing − payment fees.</li><li><strong>Break-even ROAS</strong> = AOV ÷ margin per order. <strong>Break-even CPA</strong> = margin per order.</li></ul>",
    "<h3>Why break-even matters</h3><p>A product with a big margin can be profitable at a ROAS of 1.8, while a thin-margin product can lose money at 3. Always compare the ROAS to <em>that brand’s</em> break-even, never to a number someone posted online.</p>",
    "<h3>Platform numbers vs store numbers</h3><p>Each ad platform reports the sales it thinks it caused. Those numbers can overlap and can differ from the store’s real orders (privacy settings and ad blockers hide some activity). Check the store’s total sales too. Repeat customers also matter: a first order at break-even can still be worth it if many buyers come back, but only if the brand can afford to wait.</p>",
    "<p>Ask every new client for: average order value, product cost, shipping cost and their payment fees. If they do not know, work it out together. It is the most useful first conversation you can have.</p>"
  ],
  example: { title: "Hypothetical: a $60 hoodie",
    body: "<p>A made-up brand sells a hoodie: AOV $60, product cost $22, shipping and packing $8. Card fees at Stripe’s standard US rate (2.9% + 30¢) are $2.04. Margin per order = 60 − 22 − 8 − 2.04 = <strong>$27.96</strong>.</p><p><strong>Break-even ROAS</strong> = 60 ÷ 27.96 ≈ <strong>2.15</strong>. <strong>Break-even CPA</strong> = <strong>$27.96</strong>.</p><p>Last week: $700 of ad spend, 25 purchases, $1,500 revenue. ROAS = 1,500 ÷ 700 ≈ 2.14 and CPA = 700 ÷ 25 = $28. Both sit just past break-even (ROAS 2.14 vs 2.15, CPA $28 vs $27.96): the ads roughly paid for themselves, with a tiny loss on each first order. Next step: test new creatives and a bundle that raises the AOV.</p>" },
  task: { title: "Run the numbers on two products",
    steps: ["Pick two products from a brand on your list and note their prices.", "Estimate product cost and shipping (label them as guesses).", "Open the Break-even ROAS calculator in Resources and enter both products.", "Write one sentence each: what ROAS would this product need to be profitable?"],
    note: "Save your results. Real numbers from a real client replace the guesses later." },
  quiz: [
    q("A brand spent $1,000 on ads and the ads brought $3,000 in revenue. What is the ROAS?", ["0.33", "3", "$2,000"], 1,
      ["That is spend divided by revenue, the wrong way round.", "Right. ROAS = revenue ÷ spend = 3,000 ÷ 1,000 = 3.", "$2,000 is revenue minus spend, not ROAS, and it ignores product costs."]),
    q("Product A has a break-even ROAS of 1.6 and Product B of 3.2. Both get a ROAS of 2.5. Which is true?", ["Both are profitable, because any ROAS above 2 means ads make money for every brand", "A is profitable on first orders, B is losing money on them", "Neither is profitable"], 1,
      ["2.5 is below B’s break-even of 3.2, so B loses money on each first order.", "Right. Compare each ROAS to that product’s own break-even.", "2.5 is above A’s break-even of 1.6, so A makes a profit on first orders."]),
    q("Meta reports 40 sales, TikTok reports 30, but the store shows 55 orders from all sources. What should you do?", ["Add the platform numbers together: 70 sales came from ads, more than the store even shows", "Treat platform numbers as estimates and check them against the store’s real orders", "Trust whichever number is highest"], 1,
      ["Platforms can count the same order, so adding them overstates results.", "Right. Platform reports overlap and miss some activity; the store’s orders are the reality check.", "Picking the highest number is how agencies mislead clients."])
  ]},

{ id: "s2l1", module: "s2", title: "Set up access the right way", minutes: 20,
  mistake: "Asking a client for their passwords or putting ad spend on your own card.",
  facts: [F.partners, F.tiktokBC, F.mcc, F.shopifySync],
  goal: "Set up your own agency accounts and request partner access to a client’s Meta, TikTok and Google accounts without touching their passwords.",
  terms: [
    ["Business portfolio", "Meta’s home for a company’s ad accounts, Pages, Instagram accounts and pixels (formerly called Business Manager)."],
    ["Partner access", "Permission a business gives another business (your agency) to work on its assets."],
    ["Ad account", "The account where ads are created and billed. It should belong to the brand."],
    ["Manager account (MCC)", "A Google Ads account that lets an agency manage several client accounts."],
    ["Business Center", "TikTok’s tool for managing ad accounts, pixels and team access."],
    ["Dataset", "Meta\u2019s name for where a brand\u2019s website events (from the Pixel and Conversions API) are stored."]
  ],
  explain: [
    "<p>The golden rule: <strong>the client owns everything, you get access.</strong> The ad account, Page, Instagram account, pixel, product catalog and payment method all stay in the brand’s name. If you ever part ways, they keep their data and you simply lose access. That protects both of you.</p>",
    "<h3>Your agency setup</h3><ul><li><strong>Meta:</strong> your own business portfolio. Clients add it as a partner using your portfolio ID.</li><li><strong>TikTok:</strong> your own Business Center. Clients add your Business Center ID as a partner and share the ad account.</li><li><strong>Google:</strong> a Google Ads manager account. You send a link request to the client’s customer ID and they accept it.</li></ul>",
    "<h3>What to ask for</h3><p>Ask for the smallest access that lets you do the job: usually “manage ads” on the ad account, plus access to the pixel/dataset and catalog for tracking. Write down what you were given and when.</p>",
    "<h3>Store connections</h3><p>Most clothing brands use Shopify. Its official apps connect the store to Meta, Google and TikTok so products sync to the ad platforms. Check these are installed and connected to the brand’s own accounts, not a former agency’s.</p>",
    "<p><strong>Never</strong> ask for passwords, never log in as the owner, and never pay ad spend on your own card (a rule of thumb that keeps you out of debt if a client pays late). Menu names change, so follow the platform’s current help page while you do it.</p>"
  ],
  example: { title: "Hypothetical: the access message",
    body: "<p>After a client signs, Sam (made up) sends: “Thanks for starting! To keep everything in your name, please add my agency as a partner instead of sharing logins: Meta business portfolio ID 1234… with ‘manage ads’ on your ad account plus your dataset; TikTok Business Center ID 5678… with Operator access; and accept my Google Ads manager link request. Here is a 2-minute guide for each.”</p><p>The owner had planned to text a password. Sam explains why partner access is safer, and the owner agrees.</p>" },
  task: { title: "Prepare your agency accounts",
    steps: ["Create your own Meta business portfolio, TikTok Business Center and Google Ads manager account (follow each official help page).", "Write down each ID in a private note (not in this course).", "Write a client access message like Sam’s, with links to each official guide.", "List the exact access you will request on each platform and why."],
    note: "Do not paste account IDs into public places. Your notes here stay on this device." },
  quiz: [
    q("A new client offers to text you their Facebook password. What should you do?", ["Accept it, because logging in as the owner is the fastest way to start work today", "Thank them and ask them to add your business portfolio as a partner instead", "Ask for their email password too"], 1,
      ["Shared passwords are a security risk and make it unclear who did what.", "Right. Partner access keeps assets in their name and needs no passwords.", "Never ask for more personal access than the job needs."]),
    q("Who should own the ad account and its payment method?", ["The agency", "The brand", "Whoever set it up first"], 1,
      ["If the agency owns it, the brand can lose its ad history and data when you part ways.", "Right. The brand owns its assets; the agency gets access.", "Ownership should be clear and in the brand’s name from the start."]),
    q("How does an agency usually get access to a client’s Google Ads account?", ["The client shares their account password so you can log in as them whenever needed", "The agency’s manager account sends a link request that the client accepts", "Google assigns an agency automatically"], 1,
      ["Password sharing is not needed and is less safe.", "Right. A manager account link keeps control with the client.", "Google never assigns agencies on its own."])
  ]},
{ id: "s2l2", module: "s2", title: "Tracking: pixels, server events and checks", minutes: 20,
  mistake: "Launching ads before checking that purchases are tracked. You will be optimizing blind.",
  facts: [F.pixelCapi, F.tiktokPixel],
  goal: "Explain how pixels and server-side events track sales, and run a tracking check before any campaign launches.",
  terms: [
    ["Pixel", "A small piece of code on a website that tells an ad platform what visitors do, like add to cart or purchase."],
    ["Conversions API / Events API", "A way for the store’s server to send the same events directly to Meta (Conversions API) or TikTok (Events API)."],
    ["Event", "One tracked action, such as ViewContent, AddToCart, InitiateCheckout or Purchase."],
    ["Deduplication", "Removing duplicate copies of the same event so one sale is not counted twice."]
  ],
  explain: [
    "<p>The platforms’ AI learns from <strong>events</strong>, especially purchases. If tracking is broken, the AI optimizes for the wrong people and your reports are wrong. Tracking is not exciting, but it is the foundation.</p>",
    "<h3>Two ways events arrive</h3><p>The <strong>pixel</strong> runs in the visitor’s browser. The <strong>server connection</strong> (Meta Conversions API, TikTok Events API) sends events from the store itself, so ad blockers and browser settings affect it less. Both platforms recommend using both, and they remove duplicates when each event carries the same ID.</p>",
    "<h3>The tracking check (do it before every launch)</h3><ol><li>Open the store on your phone, view a product, add to cart, start checkout.</li><li>Watch the platform’s test-events tool: do ViewContent, AddToCart and InitiateCheckout arrive once each?</li><li>For purchases, use a real low-cost test order if the owner agrees, or compare yesterday’s store orders with reported purchases.</li><li>Check there is only <em>one</em> pixel per platform (old agencies sometimes leave a second one).</li></ol>",
    "<h3>Expect gaps</h3><p>Tracking is never perfect. The goal is “close enough and consistent”, checked against the store’s real orders every week.</p>"
  ],
  example: { title: "Hypothetical: the double-counted sales",
    body: "<p>Rio (made up) starts with a new brand. Meta reports 60 purchases last week, but the store shows 34 orders in total. Rio finds two Meta pixels on the site: one from the Shopify app and one pasted in by a former freelancer, so many purchases were counted twice.</p><p>With the owner’s permission, Rio removes the extra code, then repeats the tracking check. Reported purchases now sit close to real orders, and Rio notes the fix and date in the client log.</p>" },
  task: { title: "Write your tracking checklist",
    steps: ["Open the Launch Checklist worksheet and read the tracking items.", "On a store you can test (yours, a friend’s or a demo store), list which events you would check and where.", "Write how you would compare platform purchases with store orders each week.", "Note what you would do if numbers differ by more than you expect."],
    note: "Keep the checklist. You will run it for every client." },
  quiz: [
    q("Why use a server connection (Conversions API) as well as the pixel?", ["It replaces the need for a website", "It sends events from the store’s server, so fewer are lost to ad blockers and browser settings", "It doubles the number of sales the platform reports, which makes results look better to clients"], 1,
      ["You still need the website; this only changes how events are sent.", "Right. Browser and server events together give more complete tracking, with duplicates removed.", "It should not double sales; matching IDs let the platform remove duplicates."]),
    q("The ad platform reports far more purchases than the store’s real orders. What is a likely cause to check first?", ["The ads are working so well that the platform sees sales the store has not recorded yet", "A duplicate pixel or missing deduplication", "The store is hiding orders"], 1,
      ["More reported sales than real orders is a tracking problem, not success.", "Right. Duplicate pixels or events without matching IDs often double count.", "The store’s order list is the most reliable number you have."]),
    q("When should you run the tracking check?", ["Once a year", "Before every launch and whenever the store changes", "Only if the client complains about the numbers in a weekly report, to save time"], 1,
      ["Stores and apps change much more often than that.", "Right. New themes, apps and checkouts can break tracking at any time.", "By then you may have spent weeks optimizing on bad data."])
  ]},

{ id: "s3l1", module: "s3", title: "Targeting and the AI campaign tools", minutes: 25,
  mistake: "Splitting a small budget into many narrow audiences, so no ad set gets enough results to learn.",
  facts: [F.advPlus, F.learning, F.smartPlus, F.pmax, F.merchant],
  goal: "Choose between manual targeting and each platform’s AI campaign type, and plan a budget big enough for the system to learn.",
  terms: [
    ["Broad targeting", "Giving the platform few limits (country, age) and letting its AI find buyers."],
    ["Custom audience", "People who already interacted with the brand, such as site visitors or customers."],
    ["Lookalike audience", "New people the platform thinks are similar to a custom audience."],
    ["Advantage+ / Smart+ / Performance Max", "The AI-driven campaign types on Meta, TikTok and Google."],
    ["Learning phase", "The early period when the platform is still figuring out who to show an ad to."],
    ["Optimization event", "The action you ask the platform to get more of, usually a purchase."]
  ],
  explain: [
    "<p>Years ago, ad managers picked narrow interests by hand. Today the platforms’ AI usually finds buyers better than manual guesses, <em>if</em> it gets good inputs: working purchase tracking, strong creatives, a clear offer and enough budget.</p>",
    "<h3>The AI campaign types</h3><ul><li><strong>Meta Advantage+ sales campaigns</strong> (formerly “shopping” campaigns) automate audience, placements (where ads appear: feeds, Stories, Reels) and budget.</li><li><strong>TikTok Smart+</strong> automates targeting, bidding (how much to offer for each ad view) and creative choices from your goals and creatives.</li><li><strong>Google Performance Max</strong> runs one campaign across Google’s channels and uses a Merchant Center product feed for stores. Classic Shopping campaigns also need Google Ads linked to Merchant Center.</li></ul>",
    "<h3>Your job when the AI targets</h3><p>You still decide the offer, the creatives, the budget, which event to optimize for, which countries to show ads in, and who to exclude (for example, recent buyers). Your creatives become your targeting: a video for runners finds runners.</p>",
    "<h3>Budget and the learning phase</h3><p>Meta says ad sets usually leave learning after about 50 optimization events in 7 days. Multiply 50 by your expected cost per purchase to see the weekly budget one ad set needs. If that is too much for the client, use fewer ad sets, or consider optimizing for an earlier step such as add-to-cart while purchases are few (a trade-off to discuss with the client).</p>",
    "<p>Rule of thumb (from common practice, not an official rule): start simple, with one AI-driven campaign and a few creatives, and add complexity only when you have data.</p>"
  ],
  example: { title: "Hypothetical: does the budget fit?",
    body: "<p>A made-up brand expects a cost per purchase of about $30 (a guess based on its break-even). Fifty purchases in 7 days would need about 50 × $30 = <strong>$1,500 a week</strong>, roughly $214 a day, for one ad set.</p><p>The owner can spend $50 a day. Mo (made up) explains the ad set will probably stay “Learning limited”, so Mo runs one campaign with one ad set and 4 creatives instead of five ad sets, and sets expectations: the first weeks are for learning, not for judging the whole channel.</p>" },
  task: { title: "Plan targeting for a practice brand",
    steps: ["Pick a brand from your list and estimate its break-even CPA.", "Work out the weekly budget one ad set would need for 50 purchases in 7 days.", "Choose one AI campaign type per platform you would start with, and write why.", "List 3 audiences you would exclude or retarget (for example, recent buyers)."],
    note: "Write your plan in notes. It feeds the launch plan in Module 4." },
  quiz: [
    q("What did Meta rename Advantage+ shopping campaigns to?", ["Advantage+ sales campaigns", "Smart+ campaigns", "Performance Max shopping campaigns"], 0,
      ["Right. Meta now calls them Advantage+ sales campaigns.", "Smart+ is TikTok’s AI campaign type.", "Performance Max is Google’s AI campaign type."]),
    q("A client has a small budget. Which setup gives the platform the best chance to learn?", ["Five ad sets, each with different interests, so you learn which audience is best", "One campaign with one ad set and a few strong creatives", "Ten ads in ten campaigns"], 1,
      ["Splitting a small budget means no ad set gets enough results to learn.", "Right. Fewer, better-funded ad sets reach the learning threshold sooner.", "Spreading thin across campaigns has the same problem."]),
    q("If AI picks the audience, what still matters most from you?", ["Nothing, it is fully automatic", "The offer, creatives, tracking and budget you give it", "Choosing 30 detailed interests, because the AI needs a narrow audience to start"], 1,
      ["The AI only works with the inputs you give it.", "Right. Good inputs drive good results; bad tracking or weak creatives limit any AI.", "With AI audiences, interests are suggestions at most."])
  ]},
{ id: "s3l2", module: "s3", title: "Creative that sells clothes, made faster with AI", minutes: 25,
  mistake: "Using trending music or creator videos without permission. Rights problems can get ads removed or worse.",
  facts: [F.endorse, F.metaPolicy, F.cml, F.aiLabel],
  goal: "Plan, draft and check clothing ad creatives with AI help, respecting rights, disclosure and ad policies.",
  terms: [
    ["Creative", "The ad itself: the image or video plus its text."],
    ["Hook", "The first 1–3 seconds or first line that makes someone stop scrolling."],
    ["UGC (user-generated content)", "Videos that look like real customers made them, often filmed by paid creators."],
    ["Creative fatigue", "When the same people have seen an ad so often that results drop."]
  ],
  explain: [
    "<p>With AI-driven targeting, the creative does much of the targeting work. For clothing, the ads that tend to work show the product on real people in real life (a rule of thumb from common practice, not a guarantee).</p>",
    "<h3>Formats to test for clothing</h3><ul><li>Try-on or “get ready with me” videos.</li><li>Styling: three outfits with one piece.</li><li>Close-ups of fabric, stitching and fit.</li><li>Founder story: why the brand exists.</li><li>Drop or restock announcements with real dates.</li></ul>",
    "<h3>Where AI helps</h3><p>Brainstorm 30 hooks, write scripts for creators, draft captions in several lengths, resize and cut videos, remove backgrounds, and translate. Then <strong>you</strong> edit: cut generic lines, check every claim, and keep the brand’s voice. Meta may label ad images made or heavily edited with AI.</p>",
    "<h3>Rules you must follow</h3><ul><li><strong>Rights:</strong> use photos and videos the brand owns or has permission for. On TikTok, use the Commercial Music Library for ads; it is not cleared for other platforms.</li><li><strong>Disclosure:</strong> paid or gifted creators must clearly disclose the connection, and brands and agencies can be responsible for their content.</li><li><strong>No misleading claims:</strong> no fake reviews, fake discounts or invented scarcity. Meta’s ad standards ban them.</li></ul>",
    "<p>Plan to make new creatives every month: fatigue is normal, and testing new ideas is most of the job.</p>"
  ],
  example: { title: "Hypothetical: one shirt, five hooks",
    body: "<p>Ari (made up) asks an AI tool: “Write 20 hooks for a heavyweight boxy tee, for 18–30 streetwear fans, no claims about reviews or sales.” Ari keeps five and rewrites them, for example “The tee that doesn’t shrink after wash #3” (only after confirming the brand pre-shrinks its fabric).</p><p>Ari writes a creator brief: 3 outfits, a close-up of the collar, a natural voice, TikTok Commercial Music Library audio, and the creator’s caption must say “paid partnership”. The AI wrote a line saying “#1 rated tee”; Ari deletes it because nobody can prove it.</p>" },
  task: { title: "Write a creative brief",
    steps: ["Pick one product from a brand on your list.", "Use an AI tool to draft 20 hooks, then keep and rewrite the best 5.", "Write a short creator brief: format, shots, message, music source, disclosure line.", "Check every claim: can the brand prove it? Delete anything it cannot."],
    note: "Save the brief and hooks in your notes as a portfolio sample (labeled practice)." },
  quiz: [
    q("A creator got free hoodies and posts about them for the brand’s ads. What is required?", ["Nothing, it was free", "A clear disclosure of the connection, like “Gifted by” the brand", "Only a hashtag at the very end of a long caption, after all the other hashtags"], 1,
      ["Gifts count as a connection under the FTC Endorsement Guides.", "Right. Paid or gifted posts must clearly disclose the connection.", "A disclosure buried where people may miss it is not clear enough."]),
    q("Can you use a popular song from your music app in a TikTok ad?", ["Yes, if it is trending", "Use tracks from TikTok’s Commercial Music Library for TikTok ads", "Yes, as long as you credit the artist’s name in the caption of the ad"], 1,
      ["Trending does not mean licensed for business use.", "Right. The Commercial Music Library is pre-cleared for ads on TikTok only.", "Crediting the artist is not a license to use the song in an ad."]),
    q("An AI draft says “voted best streetwear brand 2026”. What do you do?", ["Keep it, it sounds good", "Delete it unless the brand can prove it", "Change it to “one of the best streetwear brands” so it is less specific"], 1,
      ["Unproven claims break ad policies and trust.", "Right. Every claim needs proof; AI often invents them.", "A softer unproven claim is still unproven."])
  ]},

{ id: "s4l1", module: "s4", title: "Launch a first test campaign", minutes: 25,
  mistake: "Editing the campaign every day. Big edits restart the learning phase.",
  facts: [F.learning],
  goal: "Plan and launch a simple test campaign with a clear budget, structure, success measure and pre-launch checklist.",
  terms: [
    ["Campaign / ad set / ad", "The three levels: the campaign holds the goal, the ad set holds budget and audience, the ad holds the creative."],
    ["Objective", "What you ask the platform to get, such as sales."],
    ["Test", "A planned comparison with a question, a budget and an end date."],
    ["Naming convention", "A consistent way to name campaigns and ads so reports are easy to read."]
  ],
  explain: [
    "<p>A good first campaign is boring: simple structure, working tracking, a few strong creatives, a budget the client agreed to, and a clear question. “Which of these 4 creatives brings purchases below our break-even CPA?” is a good question.</p>",
    "<h3>Before you launch: the checklist</h3><ul><li>Tracking check passed (Module 2).</li><li>Product pages load fast and look right on a phone.</li><li>Stock is available for the products you advertise.</li><li>Shipping, returns and contact info are easy to find.</li><li>Offer and prices in the ad match the website exactly.</li><li>The client approved the ads in writing.</li></ul>",
    "<h3>Budget and timing</h3><p>Agree on a test budget and a review date before launching. A rule of thumb from common practice (not an official rule): give each creative a chance to spend at least 2–3 times the break-even CPA before judging it, unless it is clearly failing. Avoid big edits for several days, because large changes restart the learning phase.</p>",
    "<h3>Names that help later</h3><p>Use a pattern like <code>Brand_Platform_Goal_Audience_Date</code> for campaigns and <code>Product_Format_Hook</code> for ads. Your weekly report will thank you.</p>"
  ],
  example: { title: "Hypothetical: a launch plan for the hoodie brand",
    body: "<p>Using the made-up hoodie numbers (break-even CPA $27.96), Nia (made up) proposes: one Advantage+ sales campaign, 4 creatives (try-on, styling, close-up, founder story), $60 a day for 10 days ($600), review on day 10.</p><p>Each creative can spend about $56–84 (2–3× break-even CPA) before being judged. Success = a cost per purchase below $27.96 on at least one creative. The owner approves the ads and budget by email, Nia runs the checklist, finds the size chart broken on phones, gets it fixed, then launches.</p>" },
  task: { title: "Write your launch plan",
    steps: ["Open the Launch Checklist worksheet and tick through it for a practice brand.", "Write the test question, budget, length and review date.", "Name the campaign and ads with your naming pattern.", "Write the one-paragraph approval message you would send the client."],
    note: "Keep the plan in notes. It becomes part of your final project." },
  quiz: [
    q("Which is a good test question for a first campaign?", ["Will we go viral?", "Which of these 4 creatives gets purchases below our break-even CPA in 10 days?", "Can we get the best ROAS in the whole clothing industry within our first month?"], 1,
      ["Virality is not a measurable plan.", "Right. Clear question, measure, budget and end date.", "Comparing to vague industry claims tells you nothing about this brand."]),
    q("The ad links to a page with a different price than the ad shows. What should you do?", ["Launch anyway", "Fix it before launch: offer and price must match exactly", "Lower the price in the ad to get more clicks, and fix the page price later"], 1,
      ["Mismatched prices mislead customers and can break ad policies.", "Right. Ads and pages must match.", "Advertising a price that is not real is deceptive."]),
    q("Why avoid big daily edits after launch?", ["Platforms charge a fee for every edit you make to a live campaign", "Big edits restart the learning phase", "Edits delete the ads"], 1,
      ["Edits are free, but they have a cost in learning.", "Right. Significant edits reset learning, so results stay unstable.", "Edits do not delete ads, but they do reset learning."])
  ]},
{ id: "s4l2", module: "s4", title: "Optimize and report every week", minutes: 25,
  mistake: "Only reporting good news. Clients stay with agencies that are honest about bad weeks.",
  facts: [],
  goal: "Read campaign numbers in the right order, decide what to stop, keep or grow, and write an honest weekly report.",
  terms: [
    ["CTR (click-through rate)", "Clicks divided by impressions: how often people who see an ad click it."],
    ["CPM", "Cost per 1,000 impressions: how expensive it is to show the ad."],
    ["Frequency", "The average number of times each person has seen the ad."],
    ["Scaling", "Increasing the budget on what works."]
  ],
  explain: [
    "<h3>Read numbers in this order</h3><ol><li><strong>Money:</strong> purchases, CPA and ROAS compared with break-even, and the store’s real orders.</li><li><strong>Creative signals:</strong> CTR and how many people watch past the first seconds. Low numbers usually mean a weak hook.</li><li><strong>Cost to show:</strong> CPM. Rising CPM can mean competition (holidays) or fatigue.</li><li><strong>Fatigue:</strong> rising frequency plus falling CTR means people are tired of the ad.</li></ol>",
    "<h3>Decisions (rules of thumb, not official rules)</h3><ul><li><strong>Stop</strong> an ad that spent 2–3× break-even CPA with no purchases.</li><li><strong>Keep</strong> ads near break-even while you test new creatives.</li><li><strong>Grow</strong> winners gradually, for example 20–30% budget steps every few days, so results stay stable.</li><li><strong>Refresh</strong> creatives when fatigue shows.</li></ul>",
    "<h3>The weekly report</h3><p>Keep it to one page: spend, purchases, revenue (platform-reported and store), ROAS and CPA against break-even, what you tested, what you learned, what is next, and anything you need from the client (new photos, stock updates). Write it in plain words. If a week was bad, say so and say what you are changing.</p>",
    "<p>Reports build trust and keep clients. They are also your raw material for honest case studies later, with the client’s permission.</p>"
  ],
  example: { title: "Hypothetical: a weekly report",
    body: "<p><strong>Week 2, made-up hoodie brand.</strong> Spend $420. Meta reports 17 purchases and $1,020 revenue (ROAS 2.43, CPA $24.71); the store shows 21 orders from all sources. Break-even ROAS 2.15, so first orders were slightly profitable.</p><p><strong>Tested:</strong> 4 creatives. The styling video had a CPA of $18; the founder story spent $70 with no purchases and was turned off. <strong>Next week:</strong> two new styling videos, budget up 20% on the styling ad. <strong>Need from you:</strong> photos of the new colorway by Thursday.</p><p>Check: 1,020 ÷ 420 ≈ 2.43; 420 ÷ 17 ≈ $24.71.</p>" },
  task: { title: "Write a sample weekly report",
    steps: ["Open the Weekly Client Report worksheet.", "Fill it with made-up numbers for a practice brand, clearly labeled as an example.", "Decide which ad to stop, keep and grow, and explain why in one line each.", "Read it as the brand owner: is anything unclear or overstated?"],
    note: "Add the sample report to your portfolio, labeled “example numbers”." },
  quiz: [
    q("An ad has spent 3× the break-even CPA with zero purchases. What is a sensible move?", ["Double its budget", "Turn it off and test a new creative", "Wait three more months, because ads always need a long time before they work"], 1,
      ["More budget on a clear loser wastes the client’s money.", "Right. It had a fair chance; replace it with a new test.", "Waiting that long burns budget with no learning."]),
    q("Frequency is rising and CTR is falling on your best ad. What is most likely happening?", ["Creative fatigue", "Tracking broke", "The product sold out"], 0,
      ["Right. The same people have seen it too often; refresh the creative.", "Broken tracking shows up as missing purchases, not falling CTR.", "A sellout shows up as zero purchases and stock issues, not this pattern."]),
    q("Last week’s results were poor. What should the report do?", ["Leave the weak numbers out and focus the report only on the good parts of the week instead", "Show the real numbers, explain what you think happened, and say what you will change", "Blame the platform"], 1,
      ["Hiding numbers destroys trust when the client checks their own data.", "Right. Honest reporting with a plan keeps clients.", "Blaming others without a plan does not help the client."])
  ]},

{ id: "s5l1", module: "s5", title: "Find brands and pitch with cold outreach", minutes: 25,
  mistake: "Sending the same generic message to hundreds of brands. Specific, researched messages get replies.",
  facts: [F.adLib, F.canspam],
  goal: "Build a lead list of good-fit brands and send short, specific, respectful cold messages with a free review offer.",
  terms: [
    ["Cold outreach", "Contacting a business that does not know you yet."],
    ["Lead list", "A list of businesses you might work with, with notes and contact details."],
    ["Free review (audit)", "A short, specific look at a brand’s ads or pages that shows you know your stuff."],
    ["Follow-up", "A polite second message if there was no reply."]
  ],
  explain: [
    "<h3>Who is a good fit</h3><p>Brands that already sell online, have decent photos or videos, show signs of sales (reviews from real customers, sold-out sizes, restocks), and look like they can afford both ad spend and your fee. Very new brands with no sales are usually not ready (rule of thumb).</p>",
    "<h3>Where to find them</h3><ul><li>Instagram and TikTok: hashtags, “suggested accounts”, tagged photos.</li><li>Shopify stores in your niche.</li><li>The Meta Ad Library: see which brands run ads now and what those ads look like.</li></ul>",
    "<h3>The message</h3><ol><li>One specific, true observation about their brand or ads.</li><li>One idea you would test.</li><li>A low-pressure offer: a free 10-minute review or a short video walk-through.</li><li>Easy to say no.</li></ol><p>Keep it under 80 words. Send it from a professional account. For email in the US, follow CAN-SPAM: a clear note that it is an offer, your postal address, and an easy opt-out.</p>",
    "<h3>Follow up and track</h3><p>Follow up once or twice, a few days apart, then stop. Track every brand in a sheet: date, channel, reply, next step. Outreach is a numbers game only if each message is still personal. Do not believe anyone’s “reply rate” claims; measure your own.</p>"
  ],
  example: { title: "Hypothetical: a DM that respects the owner’s time",
    body: "<p>“Hi Jay, love the washed black cargos. I noticed your ads in the Ad Library all use the same studio photo. Try-on videos often do better for pants because people want to see fit (worth testing, not a promise). Want a free 10-minute video review of your ads? No worries if not. — Kim, Kim Ads”</p><p>Kim (made up) sends 15 messages like this in a week, each with a different observation, logs them, and follows up once after four days.</p>" },
  task: { title: "Send your first five researched messages",
    steps: ["Turn your Module 1 brand list into a lead list with contact channel and one observation each.", "Use the Brand Outreach template to write 5 messages, each with a different specific observation.", "Send them from a professional account (or save them if you are not ready).", "Log each message and set a follow-up date."],
    note: "Log replies honestly, including no replies. That is your real data." },
  quiz: [
    q("Which opening is best for a cold DM to a clothing brand?", ["“I can double your sales overnight with AI ads! Reply YES and I will send you my results from other brands.”", "“Love the washed cargos. Your Ad Library ads all use one studio photo; try-on videos could be worth testing.”", "“Hey, do you need marketing?”"], 1,
      ["Hype and promises get ignored and can be misleading.", "Right. Specific, true and useful, with a testable idea.", "Too vague; it gives them no reason to reply."]),
    q("How can you see if a brand is running Meta ads right now?", ["Ask Meta support to tell you which brands are running ads right now", "Search the brand in the Meta Ad Library", "You cannot know"], 1,
      ["Meta support does not share other businesses’ data.", "Right. The Ad Library shows ads currently running on Meta’s apps.", "You can: the Ad Library is public."]),
    q("A brand has not replied to two messages. What next?", ["Message them every day until they answer, because persistence shows you care", "Stop, and maybe try again months later with something new", "Post about them"], 1,
      ["Daily messages after silence are spam.", "Right. Two polite tries, then respect the silence.", "Public pressure is disrespectful and damages your reputation."])
  ]},
{ id: "s5l2", module: "s5", title: "Sales calls, proposals and retainer pricing", minutes: 25,
  mistake: "Agreeing to a revenue share without defining which revenue, which tracking source and when you get paid.",
  facts: [],
  goal: "Run a discovery call, compare flat, percent-of-spend and revenue-share retainers, and write a clear proposal.",
  terms: [
    ["Discovery call", "A first call to understand the brand’s goals, numbers and fit."],
    ["Flat retainer", "A fixed monthly fee for agreed work."],
    ["Percent of ad spend", "A fee calculated as a share of the client’s monthly ad spend."],
    ["Revenue share", "A fee calculated as a share of revenue the ads are credited with."],
    ["Minimum term", "The shortest time a client agrees to work with you, such as 3 months."]
  ],
  explain: [
    "<h3>The discovery call (20–30 minutes)</h3><ol><li>Goals: what would a good 3 months look like?</li><li>Numbers: AOV, margins, monthly sales, current ad spend.</li><li>History: what ads they tried and what happened.</li><li>Capacity: can they handle more orders and send new content?</li><li>Budget: ad spend plus your fee, and who decides.</li></ol><p>If it is not a fit, say so. Not every brand is ready.</p>",
    "<h3>Three ways to charge</h3><ul><li><strong>Flat retainer:</strong> predictable for both sides; your fee does not depend on how much they spend.</li><li><strong>Percent of ad spend:</strong> grows as spend grows, which matches more work, but can look like you want them to spend more.</li><li><strong>Revenue share:</strong> aligned with results, but depends on tracking, which revenue counts, data access and trust. Risky for beginners.</li></ul><p>Many agencies combine them, for example a flat base plus a percentage above a spend level. These are common structures, not prices; set yours with the Retainer calculator so you know your effective hourly rate.</p>",
    "<h3>The proposal</h3><p>Write: what you will do each month (setup, number of new creatives, reports, calls), what is not included, the fee and how it is calculated, that ad spend is paid by the client directly, that results are not guaranteed, the term and how to cancel, and payment dates. Simple agreements are not legal advice; consider a proper contract template or a lawyer.</p>"
  ],
  example: { title: "Hypothetical: comparing three fee models",
    body: "<p>A made-up client spends $3,000 a month on ads, and platforms credit the ads with $9,000 of revenue. Option A: flat $800. Option B: 15% of ad spend = $450. Option C: 5% of credited revenue = $450.</p><p>Pat (made up) expects about 16 hours a month of work: A = $50/hour, B and C = about $28/hour. Pat proposes A with a 3-month minimum and a review at month 3. These numbers are examples for the math, not market rates.</p>" },
  task: { title: "Price a retainer and draft a proposal",
    steps: ["Open the Retainer calculator and compare the three models for a realistic practice client.", "Choose your model and write why in two sentences.", "Draft a one-page proposal with every part listed above.", "Ask a friend to read it: what would they expect to get each month?"],
    note: "Keep the proposal. Real clients will ask for one." },
  quiz: [
    q("Why can a revenue share be risky for a beginner?", ["It is illegal", "It depends on tracking, which revenue counts, data access and trust", "It always pays less than a flat fee, so it is never worth offering to clients"], 1,
      ["Revenue shares are legal when clearly agreed.", "Right. Without clear definitions and data access, payment disputes are likely.", "It can pay more or less; the risk is in the definitions."]),
    q("What must the proposal say about ad spend?", ["Nothing", "That the client pays ad spend directly to the platforms, separate from your fee", "That the ad spend is included in your monthly fee and you pay the platforms for them"], 1,
      ["Leaving it out causes surprises and disputes.", "Right. Fee and ad spend are separate and both should be clear.", "Bundling ad spend into your fee puts your money at risk."]),
    q("On a discovery call you learn the brand has no sales yet and no budget for ads. What is honest?", ["Sign them anyway, because ads will create the first sales and then they can afford you", "Say they may not be ready for paid ads yet and suggest what to do first", "Promise ads will fix it"], 1,
      ["Taking money from a brand that cannot benefit damages them and your reputation.", "Right. Honest fit checks build long-term trust and referrals.", "No ad manager can promise that."])
  ]},

{ id: "s6l1", module: "s6", title: "Onboard and manage clients", minutes: 20,
  mistake: "Skipping onboarding and launching in week one without margins, stock info or approvals.",
  facts: [F.estTax],
  goal: "Run a clean onboarding, set a communication rhythm, and keep your own money and records in order.",
  terms: [
    ["Onboarding", "The first steps after a client signs: access, information, kickoff."],
    ["Kickoff call", "The first working call to agree goals, timeline and responsibilities."],
    ["Scope creep", "Extra work added bit by bit without changing the agreement or fee."],
    ["Approval", "The client saying yes in writing before an ad goes live."]
  ],
  explain: [
    "<h3>Onboarding checklist</h3><ul><li>Partner access on each platform (Module 2).</li><li>Tracking check passed.</li><li>Store numbers: AOV, product costs, shipping, margins.</li><li>Product priorities and stock levels; upcoming drops and sales.</li><li>Brand assets: logo, fonts, photos, videos, voice.</li><li>Who approves ads, and how fast.</li></ul>",
    "<h3>A steady rhythm</h3><p>Weekly report, a short monthly call, and an agreed reply time (for example one business day). Get written approval before ads go live. When new requests appear, say kindly: “Happy to. That is outside our current scope, so here is what it would add.”</p>",
    "<h3>Expectations</h3><p>Repeat what you said in the sales call: the first weeks are for learning, results are not guaranteed, and you will report honestly either way.</p>",
    "<h3>Your own money</h3><p>Invoice on time, keep business and personal money separate, track expenses, and set money aside for taxes. In the US, if you expect to owe $1,000 or more for the year, the IRS generally expects quarterly estimated payments. The Foundations track (Module 6) covers revenue vs profit in more detail.</p>"
  ],
  example: { title: "Hypothetical: a calm first week",
    body: "<p>Lee (made up) signs a streetwear brand on Monday. By Wednesday: partner access on Meta and TikTok, tracking checked, margins confirmed, a drop date noted for the 20th, and the owner named as the only approver. Thursday’s kickoff agrees on 6 new creatives a month and a Friday report.</p><p>In week 3 the owner asks for help with email newsletters. Lee replies that it is outside the retainer and offers a separate small project with a price. The owner says not now, and the scope stays clear.</p>" },
  task: { title: "Make your onboarding kit",
    steps: ["Open the Client Onboarding checklist worksheet and adapt it to your offer.", "Write the welcome email you would send on day one.", "Decide your report day, reply time and approval process.", "Write how you will set money aside for taxes each month."],
    note: "Your onboarding kit is reusable. Keep it in one folder." },
  quiz: [
    q("A client asks for extra work that is not in your agreement. What is the best response?", ["Do it for free to be nice, because extra favors always lead to bigger contracts", "Offer it as a separate addition with its own price", "Ignore the request"], 1,
      ["Free extras pile up and quietly lower your rate.", "Right. Kindly treat it as new scope with its own price.", "Ignoring clients damages trust."]),
    q("When should an ad go live?", ["As soon as you finish it", "After the client approves it in writing", "When the platform suggests it in the recommendations tab of Ads Manager"], 1,
      ["Launching without approval risks off-brand or wrong ads.", "Right. Written approval protects both sides.", "Platforms do not approve content for the client."]),
    q("In the US, when are quarterly estimated tax payments generally expected?", ["Never for freelancers", "If you expect to owe $1,000 or more in tax for the year", "Only once your yearly income is above $100,000, like a large business"], 1,
      ["Freelancers often must pay estimated tax.", "Right. That is the IRS’s general threshold; check irs.gov or a tax professional.", "The threshold is about tax owed, and it is much lower than that."])
  ]},
{ id: "s6l2", module: "s6", title: "Keep clients, get referrals, grow your agency", minutes: 20,
  mistake: "Using a client’s results in your marketing without permission, or making your best result look typical.",
  facts: [F.reviews, F.mmo],
  goal: "Keep clients longer, turn real results into honest case studies, and decide when and how to grow.",
  terms: [
    ["Churn", "Clients leaving."],
    ["Case study", "A true story of a client project: problem, what you did, real results, with permission."],
    ["Referral", "A new client introduced by a happy client or contact."],
    ["SOP (standard operating procedure)", "Written steps for a repeated task, so anyone can do it the same way."]
  ],
  explain: [
    "<h3>Keep clients</h3><ul><li>Honest weekly reports and quick replies.</li><li>Bring ideas before they ask: drops, seasons, bundles, new creative formats.</li><li>A quarterly review: what worked, what did not, the plan for next quarter.</li></ul>",
    "<h3>Honest case studies and testimonials</h3><p>Ask permission before naming a client or sharing numbers. Use real numbers with dates and context (spend, period, what else changed). Never write testimonials yourself or buy positive ones; the FTC’s reviews and testimonials rule covers this. One great result is not typical: do not present it as what everyone gets.</p>",
    "<h3>If you ever sell your own coaching</h3><p>The FTC has warned businesses that false or unsupported earnings claims for money-making opportunities are unlawful, including presenting unusual results as typical or saying buyers must act immediately when that is not true.</p>",
    "<h3>When to grow</h3><p>Signs: steady clients for several months, written SOPs, healthy profit (not just revenue), and more work than hours. Ways to grow: raise prices for new clients, specialize (for example streetwear only), hire a freelancer for creative editing, then add an account manager. Each step adds cost and risk, so change one thing at a time. Hiring rules (contractor or employee) depend on your country and state; check them.</p>"
  ],
  example: { title: "Hypothetical: from one result to a case study",
    body: "<p>After 4 months (made up), a brand’s first-order CPA fell from $34 to $25 while monthly ad spend grew from $1,500 to $3,000. Lee asks the owner if this can be shared. The owner agrees, but without revenue numbers.</p><p>Lee’s case study says: “Months 1–4, Meta ads: cost per first purchase from $34 to $25 as spend doubled. New styling videos and a bundle offer. Results vary by brand; this is one client, not a typical result.” The owner also introduces a friend’s brand, Lee’s first referral.</p>" },
  task: { title: "Plan your growth honestly",
    steps: ["Write a quarterly review template for a client.", "Draft a permission request for using a client’s results (or practice results, labeled).", "Write your first two SOPs: tracking check and weekly report.", "List the signs you will wait for before hiring help."],
    note: "Save your next growth move in notes. Your dashboard shows it." },
  quiz: [
    q("You got one client an excellent result. How can you use it in marketing?", ["Say all clients can expect this result, because it shows what your service can really do", "Share it with permission, with context, and make clear it is one client, not typical", "Round the numbers up"], 1,
      ["Presenting an unusual result as typical is misleading.", "Right. Permission, real numbers, context and no “typical” implication.", "Inflating numbers is deceptive."]),
    q("Which is the strongest sign you are ready to hire help?", ["One big month of sales, because it proves the demand is there for good", "Several months of steady clients, written SOPs and healthy profit", "Feeling busy for a day"], 1,
      ["One big month can be a one-off; look for steady demand over months.", "Right. Steady demand plus systems makes hiring manageable.", "A single busy day is not a trend you can hire around."]),
    q("Is it okay to write a few testimonials yourself to get started?", ["Yes, everyone does it", "No. Testimonials must be real, from real clients, shared with permission", "Yes, as long as you only use first names so nobody can check who wrote them"], 1,
      ["Fake testimonials are deceptive and covered by the FTC rule.", "Right. Only real words from real clients, with permission.", "First names do not make a fake testimonial real."])
  ]}
];
L.forEach(function (l) { A.LESSONS.push(l); });
A.LESSONS.forEach(function (l) { if (l.module === "m1") l.free = true; });

/* ---------- brand-scaling worksheets ---------- */
[
  { id: "roas", title: "Break-even ROAS calculator", module: "s1", kind: "roas", desc: "Margin per order, break-even ROAS and break-even cost per purchase. Math only." },
  { id: "launch", title: "Launch Checklist", module: "s4", kind: "checklist", desc: "Run it before every campaign goes live.",
    items: ["Partner access confirmed on each platform", "Tracking check passed: events arrive once each", "Only one pixel per platform on the site", "Product pages load fast and look right on a phone", "Advertised products are in stock", "Shipping, returns and contact info easy to find", "Offer and prices in the ads match the site exactly", "Every claim in the ads can be proven", "Music and footage are licensed; creator disclosures in place", "Client approved ads, budget and review date in writing"] },
  { id: "report", title: "Weekly Client Report", module: "s4", kind: "form", desc: "One honest page every week. Label example numbers as examples.",
    fields: [["week", "Week and brand", "text"], ["spend", "Spend, purchases, revenue (platform and store)", "area"], ["vs", "ROAS and CPA vs break-even", "area"], ["tested", "What we tested", "area"], ["learned", "What we learned", "area"], ["next", "Next week", "area"], ["need", "What I need from you", "area"]] },
  { id: "brandmsg", title: "Brand Outreach Message", module: "s5", kind: "template", desc: "Short, specific, easy to say no. Edit it to sound like you.",
    text: "Hi [name],\n\nLove [one specific, true thing about their product or page].\n\nI noticed [one observation about their ads or page, from the Meta Ad Library or their site]. [One idea worth testing, without promising results.]\n\nWant a free [10]-minute review of your ads? No worries if not.\n\n[Your name], [your agency]\n\n[For marketing email in the US (CAN-SPAM): add a clear note that this is an offer, your postal address, and: Reply “stop” and I won’t email you again.]" },
  { id: "retainer", title: "Retainer calculator", module: "s5", kind: "retainer", desc: "Compare flat, % of ad spend and revenue share, and see your effective hourly rate. Math only, not market rates." },
  { id: "onboard", title: "Client Onboarding checklist", module: "s6", kind: "checklist", desc: "Everything to collect in week one.",
    items: ["Signed agreement: scope, fee, term, cancellation, no results guarantee", "Client pays ad spend directly (their card on their ad accounts)", "Partner access: Meta, TikTok, Google", "Tracking checked and noted", "Store numbers: AOV, product costs, shipping, margins", "Product priorities, stock, drop and sale dates", "Brand assets: logo, fonts, photos, videos, voice", "Approver named and approval process agreed", "Report day, reply time and monthly call booked", "First invoice sent"] }
].forEach(function (w) { A.WORKSHEETS.push(w); });

/* ---------- sources for the Facts page ---------- */
var srcs = [
  [F.igAds], [F.adLib], [F.partners], [F.tiktokBC], [F.mcc], [F.shopifySync, "Partly confirmed: product sync confirmed for all three apps; TikTok Events API through TikTok’s Shopify app confirmed on TikTok’s site."],
  [F.pixelCapi], [F.tiktokPixel], [F.advPlus], [F.learning], [F.smartPlus, "Some Smart+ help pages are over a year old; features may change."], [F.pmax], [F.merchant],
  [F.aiLabel, "Partly confirmed: labels confirmed; no AI-disclosure rule found for ordinary product ads."], [F.endorse], [F.metaPolicy], [F.cml],
  [F.mmo, "The FTC proposed in January 2025 to extend earnings-claim rules to business coaching; whether it is final was not confirmed."]
];
srcs.forEach(function (s) {
  A.SOURCES.unshift({ claim: s[0].text, status: "Checked Nov 8, 2026 through web search limited to the official site. " + (s[1] || "") + " Used in the Brand Scaling track.", url: s[0].url });
});
A.SOURCES.push({ claim: "Brand-scaling rules of thumb (2–3× break-even CPA before judging an ad, 20–30% budget steps, start with one simple campaign, good-fit brand signs).", status: "From common practice, not official rules or research. Labeled in the lessons.", url: "" });
})();
