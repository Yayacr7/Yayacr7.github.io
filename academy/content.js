/* AI Income Academy: course content.
   Every example marked "Hypothetical" is made up to teach. It is not a real person or a real result.
   Tool facts: see SOURCES at the bottom. Anything not checked is labeled. */
(function () {
"use strict";

var PATHS = {
  web: {
    id: "web", color: "blue", name: "Websites & simple tools",
    short: "Build websites and small tools with AI helping you write the code.",
    makes: "One-page websites for local groups and small businesses, booking or contact pages, small calculators, simple internal tools (for example a price quote form).",
    skills: ["Clear prompting", "Basic HTML and CSS (AI helps, but you must read it)", "Testing on phones and computers", "Explaining tech in plain English"],
    work: "You meet a customer, write down what the page must do, build it with an AI coding assistant, test it on several devices, publish it, then make small changes when asked.",
    expenses: "Many beginners start at $0: free hosting exists for simple static sites, and some AI assistants have free tiers. Common later costs: a paid AI assistant plan, a domain name (usually billed yearly), and sometimes a paid website builder. Check each tool’s current price on its official site.",
    limits: "AI writes code that looks right but can be broken or insecure. You are responsible for what you deliver. Anything with logins, payments or personal data needs much more care than a beginner project. Many cheap website builders compete for the same customers.",
    first: "A one-page site for a real club, friend or local group, with their name, what they do, hours and a working contact link."
  },
  assist: {
    id: "assist", color: "purple", name: "AI assistants & automations",
    short: "Set up AI helpers and automatic workflows that save people time.",
    makes: "A question-answering assistant trained on a business’s own FAQ, an email-draft helper, a form that saves answers to a spreadsheet and sends a confirmation, a weekly report that builds itself.",
    skills: ["Mapping a process step by step", "Prompting and writing clear instructions for an assistant", "Using no-code automation tools (connect app A to app B)", "Testing with tricky questions", "Handling private data carefully"],
    work: "You watch how someone does a repeated task, find the boring steps, set up an assistant or automation, test it with real examples, then write a short how-to so they can use it without you.",
    expenses: "Automation tools and AI services often have free tiers with low limits, then charge monthly or per use. Costs can grow with usage, so estimate before you promise a price. Check each tool’s current pricing on its official site.",
    limits: "AI assistants can give wrong answers with confidence, so they need limits (“only answer from this FAQ, otherwise say you don’t know”) and a human for anything important. Never put private customer data into a tool without the owner’s permission and without reading the tool’s data policy. Automations break when an app changes, so plan for upkeep.",
    first: "An FAQ assistant for a pretend or real small business that answers only from 10 written questions and says “I don’t know, please call us” for anything else."
  },
  products: {
    id: "products", color: "orange", name: "Digital products",
    short: "Create and sell useful digital products, with AI helping you draft and design.",
    makes: "Printable planners and checklists, templates (spreadsheets, documents, slides), short practical guides, prompt packs for a specific job, worksheets for teachers or parents.",
    skills: ["Finding a specific audience and problem", "Editing AI drafts until they are accurate and genuinely useful", "Simple design and layout", "Writing a clear product page", "Patience: products often sell slowly at first"],
    work: "You pick a specific group with a specific problem, make a small product that solves it, test it with a few people, put it on a store or your own page, and improve it from feedback.",
    expenses: "Can start near $0 with free design tools and a marketplace that takes a fee per sale instead of a monthly fee. Later: design tools, your own domain, maybe paid ads (risky for beginners). Check each platform’s current fees on its official site.",
    limits: "Selling is usually the hard part, not making. Many AI-made products are generic and do not sell. You need permission for any images, fonts or text you use, and you must not copy other people’s products. Income usually starts small and is not guaranteed.",
    first: "A one-page printable checklist for a group you know well (new dog owners, first-time renters, a hobby), tested by 3 people from that group."
  }
};

/* Questionnaire. Each option adds points to paths. "why" is shown in the explanation. */
var QUESTIONS = [
  { id: "interest", q: "Which sounds most fun to you?", opts: [
    { v: "build", label: "Building things people click and use", pts: { web: 3, assist: 1 }, why: "you enjoy building things people click and use" },
    { v: "save", label: "Making boring work faster for people", pts: { assist: 3, web: 1 }, why: "you like making repeated work faster" },
    { v: "create", label: "Creating something once and selling it many times", pts: { products: 3 }, why: "you like making something once and selling it many times" },
    { v: "unsure", label: "I am not sure yet", pts: { web: 1, assist: 1, products: 1 }, why: "you are still exploring, so we picked the easiest start" }
  ]},
  { id: "experience", q: "How comfortable are you with computers right now?", opts: [
    { v: "new", label: "New: I mostly use my phone", pts: { products: 2, assist: 1 }, why: "you are new to computer work, and products need the fewest technical steps" },
    { v: "ok", label: "Comfortable: documents, spreadsheets, email", pts: { assist: 2, products: 1 }, why: "you already use documents and spreadsheets, which automations build on" },
    { v: "tech", label: "Techy: I have made a website or written a little code", pts: { web: 3 }, why: "you have some website or code experience" }
  ]},
  { id: "time", q: "How much time can you give each week?", opts: [
    { v: "low", label: "2–4 hours", pts: { products: 2 }, why: "you have a few hours a week, and products can be built in small pieces" },
    { v: "mid", label: "5–9 hours", pts: { assist: 1, web: 1, products: 1 }, why: "you have a medium amount of time, which works for any path" },
    { v: "high", label: "10+ hours", pts: { web: 2, assist: 1 }, why: "you have 10+ hours a week, enough for client projects" }
  ]},
  { id: "budget", q: "What can you spend on tools each month?", opts: [
    { v: "zero", label: "$0 for now", pts: { products: 1, web: 1 }, why: "you want to start at $0, which is possible for simple websites and products" },
    { v: "small", label: "Up to about $30", pts: { web: 1, assist: 1, products: 1 }, why: "a small budget covers one paid AI tool if you need it" },
    { v: "more", label: "More than $30", pts: { assist: 2 }, why: "automation tools often charge monthly, and you can cover that" }
  ]},
  { id: "people", q: "How do you feel about talking to customers?", opts: [
    { v: "like", label: "I like talking to people", pts: { web: 2, assist: 2 }, why: "you like talking to people, which client work needs" },
    { v: "some", label: "Okay in small doses, mostly by message", pts: { web: 1, assist: 1, products: 1 }, why: "you are fine with some messaging" },
    { v: "alone", label: "I would rather work alone", pts: { products: 3 }, why: "you prefer working alone, and products need the least one-on-one contact" }
  ]}
];

function q(text, options, answer, explain) { return { q: text, options: options, answer: answer, explain: explain }; }

var MODULES = [
  { id: "m1", n: 1, color: "blue", title: "Understand AI", sub: "What it does well, where it slips, and how to use it safely." },
  { id: "m2", n: 2, color: "purple", title: "Choose a useful skill", sub: "Pick a realistic starting skill and try it on a small project." },
  { id: "m3", n: 3, color: "mint", title: "Find a problem worth solving", sub: "Talk to people and check the problem is real before you build." },
  { id: "m4", n: 4, color: "orange", title: "Build a first solution", sub: "Make a small version, test it, and collect feedback." },
  { id: "m5", n: 5, color: "blue", title: "Work toward a first sale", sub: "Explain your offer, set the scope, price it, and ask respectfully." },
  { id: "m6", n: 6, color: "purple", title: "Deliver, improve, and grow", sub: "Support customers, track money, improve quality, and grow carefully." }
];

var LESSONS = [
/* ---------------- MODULE 1 ---------------- */
{ id: "m1l1", module: "m1", title: "What AI can do, and where it goes wrong", minutes: 15,
  mistake: "Trusting a confident tone. AI sounds equally sure when it is right and when it is wrong.",
  facts: [],
  goal: "Name three kinds of work AI helps with and four common ways it makes mistakes.",
  terms: [
    ["AI (artificial intelligence)", "Software that does tasks that used to need a person, like writing a paragraph or sorting photos."],
    ["Chatbot / AI assistant", "An AI you type to (or talk to) in plain language, and it types back."],
    ["Hallucination", "When AI states something false as if it were true, such as a made-up fact, quote or link."],
    ["Training data", "The huge amount of text and images an AI learned from. It can be old, incomplete or biased."]
  ],
  explain: [
    "<p>The AI tools most people use today are <strong>language models</strong>: they learned patterns from enormous amounts of text, and they predict what a helpful answer looks like. That makes them very good at <em>words and structure</em>, and less reliable on <em>facts they cannot check</em>.</p>",
    "<h3>Where AI is genuinely useful</h3><ul><li><strong>First drafts:</strong> emails, product descriptions, outlines, page text.</li><li><strong>Rewriting:</strong> shorter, friendlier, simpler, another language.</li><li><strong>Explaining:</strong> “Explain this error message like I am new.”</li><li><strong>Code help:</strong> writing and fixing small pieces of code you then test.</li><li><strong>Brainstorming:</strong> 20 ideas in a minute, so you can pick the 2 good ones.</li></ul>",
    "<h3>Where it goes wrong</h3><ol><li><strong>Made-up facts (hallucinations).</strong> It may invent prices, laws, quotes, studies or links that look real.</li><li><strong>Out-of-date information.</strong> Its knowledge stops at some date unless the tool searches the web, and even then it can misread pages.</li><li><strong>Confident mistakes in math and logic.</strong> Totals, dates and step-by-step reasoning can be wrong while sounding sure.</li><li><strong>Bias and blind spots.</strong> It can repeat stereotypes or assume one country’s rules apply everywhere.</li><li><strong>Privacy risk.</strong> What you paste in may be stored or used by the provider, depending on its policy and your settings.</li></ol>",
    "<p><strong>The rule for this whole course:</strong> AI drafts, <em>you</em> decide. Anything you give a customer is your responsibility, so you check it first.</p>"
  ],
  example: { title: "Hypothetical: the bakery hours that were never real",
    body: "<p>Sam (a made-up student) asks an AI assistant: “Write an About section for Rosa’s Bakery on Main Street.” The draft is warm and well written. It also says the bakery “has served the town since 1987” and is “open 7 days a week from 6 am.”</p><p>Sam never gave those facts. The AI filled the gap with likely-sounding details. Sam asks Rosa, learns the bakery opened in 2019 and is closed Mondays, and fixes the text before showing it to anyone.</p><p><strong>Lesson:</strong> the writing help was real; the facts were invented. Give AI your facts, and check every fact it adds.</p>" },
  task: { title: "Test an AI tool on things you already know",
    steps: ["Open any AI assistant you have access to (many offer a free tier).", "Ask it 3 questions where you know the true answer: one about your town, one about a hobby, one simple math or date question.", "Ask it to write a short bio of a small local business you know, without giving it facts.", "Write down: what it got right, what it got wrong, and anything it invented."],
    note: "Record your results in the notes box below. This becomes your personal “where AI slips” list." },
  quiz: [
    q("An AI draft includes a statistic you did not give it. What should you do?", ["Keep it, AI tools are trained on lots of data", "Find a reliable source for it, or remove it", "Change the number slightly so it is your own"], 1,
      ["Training on lots of data does not make each number true. Language models can invent statistics that sound right.", "Right. If you cannot find a reliable source, remove it. You are responsible for what you publish.", "Changing a number you cannot verify just creates a different unverified number."]),
    q("Which task is AI usually MOST reliable at?", ["Rewriting your own paragraph to be shorter and friendlier", "Telling you today’s exact price of a product", "Quoting a law word for word"], 0,
      ["Right. Rewriting text you supplied plays to its strength: words and structure, with your facts.", "Prices change, and AI may be out of date or guess. Check the official site.", "AI can misquote or invent legal text. Read the official source."]),
    q("What is a “hallucination” in AI?", ["When the AI refuses to answer", "When the AI states something false as if it were true", "When the AI is slow"], 1,
      ["A refusal is a different behavior. A hallucination is a confident false statement.", "Right. Made-up facts, quotes and links are all hallucinations.", "Speed has nothing to do with it. A hallucination is about accuracy, not timing."])
  ]},
{ id: "m1l2", module: "m1", title: "Write useful prompts and check the output", minutes: 20,
  mistake: "Asking for a whole project in one giant prompt. Break it into small steps you can check one by one.",
  facts: [],
  goal: "Write a five-part prompt and check AI output with a four-step routine before using it.",
  terms: [
    ["Prompt", "The instructions you type to an AI."],
    ["Context", "Background facts the AI needs: who it is for, what you already have, what matters."],
    ["Constraint", "A limit, like “under 80 words” or “do not mention prices”."],
    ["Iterate", "Improve step by step: ask, look, adjust, ask again."]
  ],
  explain: [
    "<p>Vague prompts get generic answers. A good prompt gives the AI what a smart new helper would need on their first day.</p>",
    "<h3>The five-part prompt</h3><ol><li><strong>Goal:</strong> what you want and why. “I need a friendly reminder email so clients pay late invoices.”</li><li><strong>Context:</strong> who it is for and key facts. “Clients are small cafes. Invoice #104, $180, due Oct 1.”</li><li><strong>Task:</strong> the exact job. “Write the email.”</li><li><strong>Format:</strong> shape of the answer. “Subject line + 3 short paragraphs.”</li><li><strong>Limits:</strong> what to avoid. “Under 100 words. Polite, not pushy. Do not invent late fees.”</li></ol>",
    "<p><strong>Tip:</strong> add “If you need information I did not give you, ask me instead of guessing.” It reduces invented details.</p>",
    "<h3>The four-step check</h3><ol><li><strong>Facts:</strong> underline every name, number, date, price and claim. Did <em>you</em> provide it, or can you confirm it from an official source?</li><li><strong>Fit:</strong> does it do the job you asked, for the person it is for?</li><li><strong>Run it:</strong> code must be run, links must be clicked, steps must be followed once by you.</li><li><strong>Read it aloud:</strong> it should sound like a person, not a brochure. Cut hype words.</li></ol>"
  ],
  example: { title: "Hypothetical: before and after",
    body: "<p><strong>Weak prompt:</strong> “Write a welcome email for my yoga class.”<br><em>Result:</em> generic text with invented class times and a “20% off” that does not exist.</p><p><strong>Five-part prompt:</strong> “Goal: welcome new students so they arrive prepared. Context: beginner class, Saturdays 9 am, community center room B, bring a mat and water, first class free. Task: write the welcome email. Format: subject line + 4 short bullet points + one friendly closing line. Limits: under 90 words, warm, no discounts, ask me if anything is missing.”</p><p><em>Result:</em> a short email with only true details. The check finds one problem: it says “Room 8” instead of “Room B”, so the student fixes it.</p>" },
  task: { title: "Upgrade a weak prompt",
    steps: ["Pick a real small writing task you have (a message, a description, a plan).", "Write it as a one-line prompt and save the answer.", "Rewrite it with all five parts (use the Prompt Builder worksheet in Resources).", "Compare the two answers and run the four-step check on the better one.", "Note which part of the prompt made the biggest difference."],
    note: "Paste both prompts and your check results in your notes." },
  quiz: [
    q("Which line most reduces made-up details?", ["“Be creative!”", "“If you need information I did not give you, ask me instead of guessing.”", "“Make it sound professional.”"], 1,
      ["Asking for creativity invites more invention, not less.", "Right. It gives the AI permission to ask instead of filling gaps.", "Tone instructions help style, not accuracy."]),
    q("AI wrote some website code for you. What is the most important check?", ["Read it once quickly", "Run it and try it on a phone and a computer", "Ask the AI if the code is correct"], 1,
      ["A quick read misses many bugs.", "Right. Code is only checked when it runs and you try it where people will use it.", "The AI can say “yes” and still be wrong. Test it yourself."]),
    q("In the five-part prompt, “Under 100 words, no prices” is an example of…", ["Context", "Limits", "Goal"], 1,
      ["Context is background facts. This is a rule for the answer.", "Right. Limits tell the AI what to avoid and how big the answer should be.", "The goal is what you want and why."])
  ]},

/* ---------------- MODULE 2 ---------------- */
{ id: "m2l1", module: "m2", title: "Match a skill to your time, money and interests", minutes: 15,
  mistake: "Choosing the path that sounds most impressive instead of the one where you can actually reach customers.",
  facts: [],
  goal: "Choose one starting path with a clear reason, and know its main costs and limits.",
  terms: [
    ["Service", "Work you do for someone, usually paid per project or per month (a website, an automation)."],
    ["Product", "Something you make once and sell many times (a template, a guide)."],
    ["Niche", "A specific group you focus on, like “dog groomers” instead of “small businesses”."],
    ["Overhead", "Costs you pay even when you are not selling, like monthly tool fees."]
  ],
  explain: [
    "<p>A <strong>useful skill</strong> is one where someone would pay to have the result. “I can use AI” is not yet a skill people buy; “I can build a clear one-page site for a local club in a week” is.</p>",
    "<h3>Services vs products</h3><p><strong>Services</strong> (websites, automations) usually reach a first payment faster because one customer is enough, but you trade time for money and must talk to people. <strong>Products</strong> can sell many times without more work per sale, but most sell slowly at first and you need an audience to see them.</p>",
    "<h3>Four honest questions</h3><ol><li><strong>Time:</strong> How many hours a week, really? Client work needs reliable time for replies and deadlines.</li><li><strong>Money:</strong> What can you spend monthly without stress? Start with free tiers where possible.</li><li><strong>Interest:</strong> Which work would you still do on a tired Tuesday?</li><li><strong>Access:</strong> Who do you already know? A path with people you can reach beats a “better” path with no one to ask.</li></ol>",
    "<p>Your questionnaire result is a <em>suggestion</em>, not a rule. Pick one path for the next 30 days. Switching every week is the most common way beginners stall.</p>"
  ],
  example: { title: "Hypothetical: Jordan picks a path",
    body: "<p>Jordan (made up) has about 5 hours a week, a $0 budget, likes spreadsheets, and knows the owner of a small cleaning company who “spends Sunday nights copying bookings into a calendar.”</p><p>Websites sound exciting, but Jordan has no code experience. Digital products need an audience Jordan does not have. <strong>Automations</strong> fit: Jordan already knows spreadsheets, there is a real person with a real repeated task, and free tiers can cover a first test.</p><p>Jordan writes: “For 30 days I am learning simple automations, starting with booking form → spreadsheet → calendar.”</p>" },
  task: { title: "Fill in the Skill Picker",
    steps: ["Open the Skill Picker worksheet in Resources.", "Write your real weekly hours and monthly budget.", "List 5 people or groups you could talk to this month.", "Choose one path for 30 days and write one sentence on why.", "Write the biggest limit of that path and how you will handle it."],
    note: "Save your one-sentence choice in your notes so you can see it each time you return." },
  quiz: [
    q("Why do services often reach a first payment faster than products?", ["They are always more profitable", "One customer saying yes is enough to get paid", "They need no communication"], 1,
      ["Not always. Products can be more profitable over time.", "Right. A product usually needs many people to find it; a service needs one yes.", "Services need more communication, not less."]),
    q("Which is a skill people would pay for?", ["“I know how to use AI”", "“I set up a booking form that fills your calendar automatically”", "“I am good with computers”"], 1,
      ["Too vague: it does not say what result someone gets.", "Right. It names a specific, useful result.", "Too vague to buy: nobody knows what result they would be paying for."]),
    q("The questionnaire suggested a path you are unsure about. What is best?", ["Switch paths every week until one works", "Pick one path for 30 days, then review honestly", "Do all three paths at once"], 1,
      ["Constant switching means never finishing anything.", "Right. A fixed trial period gives you real information.", "Splitting a few hours across three paths makes progress very slow."])
  ]},
{ id: "m2l2", module: "m2", title: "Your first practice project", minutes: 25,
  mistake: "Making the practice project so big it never gets finished. Small and finished teaches more.",
  facts: [{ text: "GitHub Pages: published sites can be up to 1 GB, with a soft bandwidth limit of 100 GB per month. Plenty for simple practice and small-business sites.", src: "GitHub Docs: GitHub Pages limits", url: "https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits" }],
  goal: "Finish a small 2–4 hour practice project for your path and write down what you learned.",
  terms: [
    ["Practice project", "A small project nobody is paying for, made to learn. You may show it as a sample, labeled as practice."],
    ["Scope", "What a project includes and what it does not."],
    ["Static website", "A simple site made of files (HTML, CSS) with no login or database. Easy and cheap to host."],
    ["Trigger", "In automation: the event that starts it, like “new form answer”."]
  ],
  explain: [
    "<p>A practice project proves to <em>you</em> that you can finish something, and gives you a sample to show later. Keep it small enough to finish in one or two sittings.</p>",
    "<h3>Websites & simple tools</h3><p>Build a one-page site for a real club or friend (with permission) or a made-up business clearly labeled as a sample. Sections: name, what they do, hours or schedule, a contact link. Ask an AI coding assistant for the HTML/CSS, then read each part and ask it to explain anything you do not understand. Test on your phone.</p>",
    "<h3>AI assistants & automations</h3><p>Write 10 real-sounding FAQ answers for a sample business. Set up an assistant with instructions: “Answer only from this FAQ. If the answer is not there, say you do not know and give the phone number.” Then test it with 10 questions, including 3 that are <em>not</em> in the FAQ. Or build one automation: form answer → new spreadsheet row → confirmation email.</p>",
    "<h3>Digital products</h3><p>Make a one-page printable checklist for a group you know well. Use AI to brainstorm items, then cut, reorder and fact-check them yourself. Design it to be readable when printed in black and white.</p>",
    "<p><strong>Finish line for every path:</strong> it works, you tested it, and you wrote 3 things you learned and 1 thing you would do differently.</p>"
  ],
  example: { title: "Hypothetical: a practice FAQ assistant",
    body: "<p>Priya (made up) builds an FAQ assistant for a sample “Riverside Bike Repair”. In testing she asks: “Do you fix electric scooters?” The FAQ does not say. The first version answers “Yes, we repair all scooters!” (invented). She tightens the instructions: “If the FAQ does not answer it, reply: I am not sure, please call 555-0100.” On re-test it answers correctly.</p><p>She labels it “Practice project: sample business” in her portfolio and notes: “Always test questions that are not in the FAQ.”</p>" },
  task: { title: "Build and finish your practice project",
    steps: ["Choose the version for your path above.", "Set a timer: aim for 2–4 hours total.", "Build it with AI help, checking each fact and testing each feature.", "Test it: on a phone, on a computer, and with one other person if you can.", "Write 3 things you learned and 1 thing you would change."],
    note: "Save a link or description of your project in your notes. You will reuse it in the final project." },
  quiz: [
    q("Your FAQ assistant answers a question that is not in the FAQ with a confident guess. Best fix?", ["Add more friendly wording", "Tell it to say “I do not know” and give a contact when the FAQ has no answer", "Hope customers do not ask that"], 1,
      ["Friendlier guesses are still guesses.", "Right. Clear limits plus a human fallback keep the assistant honest.", "Customers will ask unexpected questions. Test them before launch so the assistant does not invent answers."]),
    q("How should you show a practice project in a portfolio?", ["As paid client work", "Clearly labeled as a practice or sample project", "Hide it, practice does not count"], 1,
      ["Calling it client work would be misleading.", "Right. Practice projects are good proof of skill when labeled honestly.", "It does count as a sample of your skill."]),
    q("What makes a good practice project size?", ["Something you can finish in 2–4 hours", "A full online store with payments", "As big as possible, to impress"], 0,
      ["Right. Finishing small beats starting big.", "Payments and stores add security and legal complexity. Not a first project.", "Big projects often stall before they teach you anything."])
  ]},

/* ---------------- MODULE 3 ---------------- */
{ id: "m3l1", module: "m3", title: "Talk to potential customers", minutes: 20,
  mistake: "Describing your idea in the first few minutes. From then on, people talk about your idea instead of their problem.",
  facts: [],
  goal: "Run a 15-minute problem conversation that learns about past behavior without pitching.",
  terms: [
    ["Potential customer", "Someone who might have the problem and might pay to fix it."],
    ["Problem interview", "A short conversation to learn about someone’s work and problems, not to sell."],
    ["Leading question", "A question that pushes toward the answer you want, like “Wouldn’t this be great?”"],
    ["Workaround", "How someone handles a problem today without a proper solution."]
  ],
  explain: [
    "<p>Before you build for someone, learn how their work really goes. People are kind: if you describe your idea, many will say “that sounds great” even if they would never pay. So ask about <strong>what they already did</strong>, not what they might do.</p>",
    "<h3>Good questions</h3><ul><li>“Walk me through the last time you did [task]. What happened?”</li><li>“What was the hardest part?”</li><li>“What have you tried to fix it? What did that cost?”</li><li>“How often does this happen?”</li><li>“Who else should I talk to about this?”</li></ul>",
    "<h3>Questions to avoid</h3><ul><li>“Would you buy an app that does X?” (future guesses are unreliable)</li><li>“Don’t you hate when…?” (leading)</li><li>Describing your solution in the first 10 minutes.</li></ul>",
    "<h3>Being respectful</h3><p>Ask for a short, specific amount of time (“15 minutes”), keep to it, say thank you, and never use the chat to hard-sell. Take notes, and ask before you record. Start with people you know or are introduced to.</p>",
    "<p>This approach is popular among founders and is described in Rob Fitzpatrick’s book <em>The Mom Test</em>.</p>"
  ],
  example: { title: "Hypothetical: a conversation with a tutor",
    body: "<p>Alex (made up) talks to a math tutor. Instead of “Would you use a scheduling tool?” Alex asks: “Tell me about last week’s scheduling.”</p><p>The tutor says: “I texted back and forth with six parents. Two sessions got double-booked. I spent maybe two hours on texts.” Alex asks what they tried: “A free booking app, but parents didn’t like making accounts.”</p><p>Alex now knows three real things: the problem happens weekly, it costs about two hours, and <em>accounts</em> were the deal-breaker. That is far more useful than “sounds great!”</p>" },
  task: { title: "Talk to three people",
    steps: ["Pick a group linked to your path (for example local business owners, teachers, hobby groups).", "Message 5–10 people you know or are introduced to, asking for 15 minutes to learn about their work.", "Use the Interview Script worksheet. Ask about the last time, not the future.", "Have 3 conversations. Write notes straight after each one.", "Highlight any problem that came up more than once."],
    note: "Write each person’s main problem and how they handle it today in your notes (no private details)." },
  quiz: [
    q("Which question gives the most reliable information?", ["“Would you pay for a tool that does this?”", "“Tell me about the last time this happened.”", "“Don’t you think this is annoying?”"], 1,
      ["People guess badly about future buying.", "Right. Real past events reveal real problems and real costs.", "This is a leading question: it pushes them to agree, so the answer tells you little."]),
    q("Someone says “What a great idea, I’d totally use that!” What does that tell you?", ["They will buy it", "Very little: compliments are not commitment", "You should start building today"], 1,
      ["Kind words often do not turn into purchases.", "Right. Look for past behavior and real commitments instead.", "Not on a compliment alone. Wait for real behavior or a commitment before building."]),
    q("What is a respectful way to ask for a conversation?", ["Message strangers again and again until they answer", "Ask for 15 minutes, explain you want to learn, not sell", "Start with your price"], 1,
      ["Repeated messages after no reply are pushy.", "Right. Specific, short and honest about the purpose.", "This is a learning conversation, not a pitch."])
  ]},
{ id: "m3l2", module: "m3", title: "Check if the problem is worth solving", minutes: 20,
  mistake: "Counting compliments as proof. Only actions (time, examples, introductions, money) count.",
  facts: [],
  goal: "Score a problem on five factors and test it with a small real commitment.",
  terms: [
    ["Validate", "Check with real evidence that people want something before you spend a lot of time on it."],
    ["Commitment", "Something a person gives up to show real interest: time, a deposit, an introduction."],
    ["Pilot", "A small first trial with one customer, often at a lower price or free, with clear limits."],
    ["Pain", "How much a problem hurts in time, money or stress."]
  ],
  explain: [
    "<p>Not every problem is worth solving. Some are rare, some are mild, and some belong to people who cannot or will not pay. Score each problem before you build.</p>",
    "<h3>The five-factor scorecard (1–5 each)</h3><ol><li><strong>Frequency:</strong> How often does it happen? Weekly beats yearly.</li><li><strong>Pain:</strong> How much time, money or stress does it cost?</li><li><strong>Current workaround:</strong> Are they already spending money or effort on it? That is a good sign.</li><li><strong>Ability to pay:</strong> Do they have a budget, or is this a hobby with no money?</li><li><strong>Reach:</strong> Can you actually contact people with this problem?</li></ol><p>A problem scoring 18+ out of 25 is a strong start. Under 12, look for another. (These cut-offs are a rule of thumb, not research.)</p>",
    "<h3>Ask for a small commitment</h3><p>The best check is someone doing something, not just saying something: booking a second meeting to see a rough version, sending you real examples, introducing you to a friend with the same problem, or agreeing to a small paid pilot. If nobody will give even 20 minutes, the problem may not hurt enough.</p>",
    "<h3>Check the solution would actually help</h3><p>Describe your idea in one sentence and ask: “If this existed, what would you stop doing?” If the answer is “nothing”, the idea is not solving the painful part.</p>"
  ],
  example: { title: "Hypothetical: scoring two problems",
    body: "<p>From her interviews, Lee (made up) has two problems:</p><p><strong>A. A dog groomer misses calls while working.</strong> Frequency 5 (daily), Pain 4 (lost bookings), Workaround 3 (pays a teen to answer some afternoons), Ability to pay 4, Reach 4 (Lee knows three groomers). <strong>Total 20.</strong></p><p><strong>B. A book club wants a nicer meeting schedule.</strong> Frequency 2, Pain 1, Workaround 1, Ability to pay 1, Reach 5. <strong>Total 10.</strong></p><p>Lee picks A and asks the groomer to send 20 examples of the questions callers ask. The groomer sends them the same day: a real commitment.</p>" },
  task: { title: "Score your problems",
    steps: ["Take the problems from your conversations.", "Score each in the Problem Scorecard worksheet.", "Pick the top one and write it in one sentence: “[Who] struggles with [what], which costs them [time/money].”", "Ask one person with that problem for a small commitment (examples, a follow-up meeting, an introduction).", "Write down what they did, not just what they said."],
    note: "Save the one-sentence problem statement in your notes. Module 4 builds on it." },
  quiz: [
    q("Which is the strongest sign a problem is real?", ["Several people said it sounds interesting", "Someone already pays or spends effort on a workaround", "You think it is a big problem"], 1,
      ["Interest is cheap. Look for behavior.", "Right. Existing spending shows the problem matters to them.", "Your opinion is a starting point, not evidence."]),
    q("You ask “If this existed, what would you stop doing?” and they say “Nothing really.” What does it suggest?", ["Your idea may not solve the painful part", "They will buy it anyway", "Build it bigger"], 0,
      ["Right. Go back and find what actually costs them time or money.", "Unlikely if nothing changes for them.", "Bigger does not fix a mismatch."]),
    q("Which is a small real commitment?", ["“Keep me posted”", "Sending you 20 real examples of the problem", "A thumbs-up emoji"], 1,
      ["Polite, but it costs them nothing, so it does not show real interest.", "Right. They spent real effort, which shows real interest.", "Friendly, but it took no time or effort, so it is not a commitment."])
  ]},

/* ---------------- MODULE 4 ---------------- */
{ id: "m4l1", module: "m4", title: "Plan and build a small first version", minutes: 25,
  mistake: "Adding nice-to-have features before the must-haves work.",
  facts: [],
  goal: "Write a must-have list for a first version and build it with AI help, checking each part.",
  terms: [
    ["MVP (minimum viable product)", "The smallest version that solves the main problem well enough to test with real people."],
    ["Must-have / nice-to-have", "A way to sort features: what it cannot work without vs what can wait."],
    ["Bug", "A mistake that makes something not work as intended."],
    ["Version", "A saved state of your work, so you can go back if something breaks."]
  ],
  explain: [
    "<p>Your first solution should solve <strong>one main problem</strong> for <strong>one kind of person</strong>. Write three lists: <em>Must have</em> (it fails without it), <em>Nice to have</em> (later), and <em>Not now</em> (a different project). Build only the first list.</p>",
    "<h3>Build steps for any path</h3><ol><li>Write the problem statement from Module 3 at the top of your plan.</li><li>Ask AI to help you break the must-haves into small steps.</li><li>Build one step at a time. After each, test it before moving on.</li><li>Save versions as you go (a copy of the file, or a version history), so a bad change is easy to undo.</li><li>Keep a “things I checked” list: facts, links, numbers, tricky inputs.</li></ol>",
    "<h3>Path outlines</h3><p><strong>Websites & tools:</strong> one page that answers the top 3 customer questions and has one clear action (call, book, email). Ask AI for code in small parts and ask it to explain anything unclear.</p><p><strong>Assistants & automations:</strong> one assistant or one workflow for the most painful step. Write clear instructions, limits, and a human fallback. Use test data, not real private data, until the owner agrees.</p><p><strong>Digital products:</strong> the one page or template that solves the main problem. Edit AI drafts heavily, check every fact, and make it usable without explanation.</p>",
    "<p><strong>Watch out for scope creep:</strong> “While I’m at it, let me add…” is how small projects become unfinished ones.</p>"
  ],
  example: { title: "Hypothetical: the groomer’s missed calls",
    body: "<p>Lee (made up, from Module 3) plans a first version for the dog groomer. <strong>Must have:</strong> a simple web page with prices the groomer wrote, the 8 most-asked answers, and a booking request form that emails the groomer. <strong>Nice to have:</strong> automatic text reminders. <strong>Not now:</strong> online payments.</p><p>Lee asks an AI assistant for the form code, tests it with 5 fake requests, and finds the email arrives without the dog’s name. Lee fixes the form field, re-tests, and notes “form tested 5 times, all fields arrive” in the checked list.</p>" },
  task: { title: "Plan your MVP and build it",
    steps: ["Open the MVP Scope worksheet and fill in Must have / Nice to have / Not now.", "Limit Must have to 3–5 items.", "Build one item at a time with AI help, testing each.", "Keep a “things I checked” list as you go.", "Stop when all must-haves work. Resist adding more."],
    note: "Write your must-have list and your checked list in your notes." },
  quiz: [
    q("What belongs in a first version (MVP)?", ["Every feature the customer mentioned", "Only what is needed to solve the main problem", "Whatever is fun to build"], 1,
      ["That is usually too much for a first version.", "Right. Small enough to finish and test with real people.", "Fun is good, but focus on the main problem."]),
    q("Why test after each small step instead of only at the end?", ["It is faster to find which change caused a problem", "It is not needed with AI-written code", "Tests are only for experts"], 0,
      ["Right. Small steps mean small, findable bugs.", "AI-written code needs testing as much as any code.", "Basic testing is for everyone."]),
    q("Your automation needs customer data. Before the owner agrees, you should…", ["Use their real customer list to make it realistic", "Use made-up test data", "Post the data in a public forum for help"], 1,
      ["Using real private data without permission is not okay.", "Right. Test data lets you build safely.", "Never share private data publicly."])
  ]},
{ id: "m4l2", module: "m4", title: "Test it and collect useful feedback", minutes: 20,
  mistake: "Testing only on your own computer with normal inputs. Real people use phones and type unexpected things.",
  facts: [],
  goal: "Test your solution with a checklist and collect feedback from three people in a feedback log.",
  terms: [
    ["User test", "Watching a real person try to use your work, without helping them."],
    ["Edge case", "An unusual input that might break things: a very long name, an empty form, a strange question."],
    ["Accessibility", "Making things usable for people with disabilities, for example readable contrast and keyboard use."],
    ["Feedback log", "A list of what testers said, how often, and what you decided to do."]
  ],
  explain: [
    "<h3>Your testing checklist</h3><ul><li><strong>Does it do the main job?</strong> Try it start to finish 3 times.</li><li><strong>Devices:</strong> phone, tablet or small window, and a computer.</li><li><strong>Edge cases:</strong> empty fields, very long text, wrong formats, questions outside the FAQ.</li><li><strong>Facts:</strong> every name, price, hour and link checked against what the owner gave you.</li><li><strong>Accessibility basics:</strong> text easy to read, works with keyboard (Tab key), images have descriptions.</li><li><strong>Privacy:</strong> no private data visible, nothing collected that you do not need.</li></ul>",
    "<h3>Watch someone use it</h3><p>Give a tester a task (“Book a grooming for Friday”) and stay quiet. Note where they pause, click the wrong thing, or ask a question. Confusion is your fault, not theirs. That is the most useful feedback you will get.</p>",
    "<h3>Ask good feedback questions</h3><ol><li>What did you expect to happen that did not?</li><li>What was the most confusing moment?</li><li>What would you change first?</li><li>Would you use this instead of what you do now? Why or why not?</li></ol>",
    "<h3>Decide what to fix</h3><p>Fix anything that stops the main job first. Then fix what two or more people mentioned. One person’s taste can wait.</p>"
  ],
  example: { title: "Hypothetical: three testers, one big fix",
    body: "<p>Lee (made up) watches three people try the groomer’s booking page. Two of them scroll past the form because it sits below the price list. One types a phone number with dashes and the form rejects it.</p><p>Feedback log: “Missed the form — 2 of 3 — move form above prices.” “Phone with dashes rejected — 1 of 3, but blocks booking — fix now.” “Wants a darker color — 1 of 3 — later.” Lee fixes the first two and re-tests with one new person, who books in under a minute.</p>" },
  task: { title: "Test and collect feedback",
    steps: ["Run the testing checklist yourself and fix what you find.", "Find 3 testers who match your customer.", "Give each a task and watch silently. Then ask the 4 feedback questions.", "Fill in the Feedback Log worksheet: what, how many people, decision.", "Fix the top issues and re-test once."],
    note: "Write the 2 most important things you changed after feedback. These go into your final project." },
  quiz: [
    q("A tester gets stuck. What should you do during the test?", ["Explain right away how it works", "Stay quiet, note where they got stuck, and ask afterward", "Tell them they are using it wrong"], 1,
      ["Helping hides the problem you need to see.", "Right. Their confusion shows you what to fix.", "Confusion usually means the design needs work."]),
    q("Which feedback should you fix first?", ["Anything that stops the main job from working", "One person’s favorite color", "Features nobody asked for"], 0,
      ["Right. If the main job fails, nothing else matters.", "One person\u2019s taste can wait until the main job works for everyone.", "Not until the main job works well."]),
    q("Which is an edge case?", ["Submitting a form with every field empty", "A normal booking", "Reading the homepage"], 0,
      ["Right. Unusual inputs often reveal bugs.", "That is the normal path. Edge cases are unusual inputs, like an empty form.", "That is normal use. Edge cases are the unusual inputs that are easy to forget."])
  ]},

/* ---------------- MODULE 5 ---------------- */
{ id: "m5l1", module: "m5", title: "Explain your offer and set a clear scope", minutes: 20,
  mistake: "Starting work before the scope and payment terms are agreed in writing.",
  facts: [],
  goal: "Write a one-sentence offer, show proof of your work honestly, and write a clear project scope.",
  terms: [
    ["Offer", "What you do, for whom, the result, the time and the price, in plain words."],
    ["Deliverable", "The specific thing the customer receives (a page, a working automation, a PDF)."],
    ["Revision", "A round of changes after the first version."],
    ["Case study", "A short, true story of a project: problem, what you did, what happened."]
  ],
  explain: [
    "<h3>The one-sentence offer</h3><p><strong>“I help [who] [get what result] by [what you deliver], in [time], for [price].”</strong></p><p>Example: “I help home cleaning companies stop copying bookings by hand by setting up a form that fills their calendar automatically, in one week, for $X.” Avoid hype like “revolutionary” or “10x your income”. Plain and specific is more believable.</p>",
    "<h3>Show your work honestly</h3><ul><li><strong>Live demo:</strong> show it working, on their phone if possible.</li><li><strong>Practice projects:</strong> label them “practice” or “sample”.</li><li><strong>A mock-up for them:</strong> a rough version using their public info, clearly marked as a draft.</li><li><strong>Results:</strong> only real ones, only with permission. Never invent reviews or numbers.</li></ul>",
    "<h3>Write a clear scope</h3><p>Most project fights come from unclear scope. Before any money changes hands, write down:</p><ol><li><strong>Included:</strong> each deliverable.</li><li><strong>Not included:</strong> what you will not do (for example, writing all their text, ongoing support).</li><li><strong>Revisions:</strong> how many rounds (for example, two).</li><li><strong>Timeline:</strong> start date, check-in, delivery date.</li><li><strong>What they provide:</strong> text, photos, logins, approvals, and by when.</li><li><strong>Price and payment:</strong> amount, when it is due, what happens if the project is cancelled.</li></ol><p>This is a simple agreement, not legal advice. For bigger projects, consider a proper contract.</p>"
  ],
  example: { title: "Hypothetical: a one-page scope",
    body: "<p><strong>Project:</strong> FAQ assistant for a sample yoga studio (made up).<br><strong>Included:</strong> assistant set up with up to 25 FAQ answers you provide; tested with 30 questions; one-page how-to guide.<br><strong>Not included:</strong> writing FAQ answers, connecting to booking software, monthly upkeep.<br><strong>Revisions:</strong> 2 rounds within 14 days of delivery.<br><strong>Timeline:</strong> start Mon; draft Thu; final the following Tue (if FAQ received by Mon).<br><strong>You provide:</strong> FAQ text and phone number for the “I don’t know” reply.<br><strong>Price:</strong> placeholder $X, half to start, half on delivery.</p>" },
  task: { title: "Write your offer and scope",
    steps: ["Open the Offer & Scope worksheet.", "Write your one-sentence offer. Read it aloud. Remove any hype.", "List your proof: practice projects (labeled) and any real results (with permission).", "Fill in all six scope parts for one realistic project.", "Ask one friend: “What would you expect to get?” If their answer differs from your scope, make it clearer."],
    note: "Save your one-sentence offer in your notes." },
  quiz: [
    q("Which offer sentence is best?", ["“I revolutionize businesses with cutting-edge AI.”", "“I help tutors stop double-bookings with a simple booking page, in one week.”", "“I do AI stuff.”"], 1,
      ["Hype words, no specific result.", "Right. Who, result, what and time are clear.", "Too vague: it does not say who you help, what result they get, or by when."]),
    q("You have no paid clients yet. How should you show your work?", ["Make up a few positive reviews", "Show practice projects clearly labeled as practice", "Say you have worked with big brands"], 1,
      ["Fake reviews are deceptive and can be illegal.", "Right. Honest samples build real trust.", "False claims destroy trust and may be illegal."]),
    q("Why write “Not included” in a scope?", ["To prevent misunderstandings about extra work", "To look professional only", "It is not needed"], 0,
      ["Right. Clear limits prevent most project arguments.", "It is more than looks: it protects both sides.", "Skipping it is a common source of disputes."])
  ]},
{ id: "m5l2", module: "m5", title: "Price your work and approach people respectfully", minutes: 25,
  mistake: "Pricing only the build hours and forgetting messages, fixes, payment fees and taxes.",
  facts: [{ text: "Stripe\u2019s standard US rate for domestic online card payments is 2.9% + 30\u00a2 per successful payment, with no setup or monthly fee. International cards and currency conversion cost extra.", src: "Stripe pricing (confirm the current rate)", url: "https://stripe.com/pricing" }, { text: "US self-employment tax is 15.3% (12.4% Social Security + 2.9% Medicare), generally on 92.35% of net self-employment earnings, and usually applies once net earnings reach $400 in a year.", src: "IRS: Self-employment tax", url: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes" }, { text: "CAN-SPAM (US commercial email): accurate header and subject, a valid physical postal address, a clear opt-out, and opt-outs honored within 10 business days. You may not charge a fee or ask for extra personal details to opt out.", src: "FTC: CAN-SPAM Act compliance guide", url: "https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business" }],
  goal: "Calculate a price that covers your time, costs, fees and taxes, and write a respectful outreach message.",
  terms: [
    ["Revenue", "All the money customers pay you."],
    ["Expenses", "What you spend to do the work: tools, fees, ads."],
    ["Profit", "Revenue minus expenses. What you actually keep before personal taxes."],
    ["Payment processing fee", "What a payment company charges per payment, often a percent plus a small fixed amount."],
    ["Outreach", "Contacting people who might want your offer."]
  ],
  explain: [
    "<h3>Price from your costs up</h3><ol><li><strong>Hours:</strong> estimate honestly, then add 30% for messages, fixes and surprises. Beginners usually under-estimate.</li><li><strong>Hourly target:</strong> what your time is worth to you right now.</li><li><strong>Direct costs:</strong> tools or services used only for this project.</li><li><strong>Payment fees:</strong> check your payment provider’s current fee on its official pricing page.</li><li><strong>Tax set-aside:</strong> money you keep aside for taxes. Rules depend on your country. In the US, once your net self-employment earnings reach $400 in a year you generally owe self-employment tax (15.3%, applied to 92.35% of net earnings) on top of income tax. Other countries differ; check your tax authority or a tax professional.</li></ol><p>Use the <strong>Price Calculator</strong> in Resources to do the math. It is math only, not advice about what the market will pay.</p>",
    "<h3>Approach people respectfully</h3><ul><li>Start with people you know, introductions, and local groups where offers are allowed.</li><li>Make it about them: mention something specific and true about their business.</li><li>One clear, low-pressure ask: “Would a 10-minute look be useful?”</li><li>Follow up once or twice at most, then stop. A “no” is a complete answer.</li><li>Follow platform rules, and for commercial email follow anti-spam laws (in the US, the CAN-SPAM Act: accurate sender details and subject line, a valid physical postal address, a clear way to opt out, and opt-outs honored within 10 business days).</li></ul>",
    "<p><strong>Never</strong> pretend to be a customer, invent urgency (“only 2 spots left!” when it is not true), or promise results you cannot control.</p>"
  ],
  example: { title: "Hypothetical: pricing a booking page",
    body: "<p>Morgan (made up) estimates 8 hours for a booking page, adds 30% (10.4 hours), and sets a beginner hourly target of $30: <strong>$312</strong>. Direct costs: $0 (free hosting). Morgan will be paid by card through Stripe, whose standard US rate is 2.9% + 30\u00a2 per successful card payment (confirm the current rate on Stripe\u2019s pricing page): about $10 on this price. Morgan rounds the price to <strong>$325</strong> and sets aside 25% of profit for taxes (a personal choice, not a rule).</p><p><strong>Outreach message:</strong> “Hi Dana, I noticed the studio’s class times are only in Instagram posts. I build simple booking pages and made a rough sample for you (attached, just a draft). Would a 10-minute call this week be useful? If not, no worries at all. — Morgan”</p>" },
  task: { title: "Price one project and write one message",
    steps: ["Open the Price Calculator and price the project from your scope.", "Look up your payment provider’s real fee on its official page and enter it.", "Write one outreach message using the Outreach Message template.", "Check it: specific, true, one low-pressure ask, easy to say no.", "Send it to one person you know or were introduced to, and log what happened."],
    note: "Write your price, how you calculated it, and the message you sent." },
  quiz: [
    q("Revenue is $500 and expenses are $120. What is the profit (before personal taxes)?", ["$500", "$380", "$620"], 1,
      ["That is revenue, not profit.", "Right. Profit is revenue minus expenses: $500 − $120 = $380.", "You subtract expenses, not add them."]),
    q("Someone did not reply to your first message. What is respectful?", ["Message them every day until they answer", "Follow up once or twice, then stop", "Post about them publicly"], 1,
      ["That is pushy and can break platform rules.", "Right. One or two polite follow-ups, then accept the silence.", "Publicly shaming someone for not replying is disrespectful, can break platform rules, and damages your reputation."]),
    q("Under the US CAN-SPAM Act, someone replies \u201cplease stop emailing me\u201d to your marketing email. What must you do?", ["Stop within 10 business days, without asking for a fee or extra details", "Send one last offer first", "Keep emailing, because they run a business"], 0,
      ["Right. Opt-outs must be honored within 10 business days, with no fee or extra personal information required.", "More marketing email after an opt-out is exactly what the law prohibits.", "CAN-SPAM covers commercial email to businesses too."]),
    q("Why add about 30% to your hour estimate?", ["To trick the customer", "Messages, fixes and surprises usually take extra time", "It is required by law"], 1,
      ["It is not a trick: it covers real work.", "Right. Beginners usually under-estimate.", "It is a rule of thumb, not a law."])
  ]},

/* ---------------- MODULE 6 ---------------- */
{ id: "m6l1", module: "m6", title: "Deliver well, support customers, track money", minutes: 20,
  mistake: "Mixing personal and business money, then guessing at tax time.",
  facts: [{ text: "US self-employment tax is 15.3% (12.4% Social Security + 2.9% Medicare), generally on 92.35% of net self-employment earnings, and usually applies once net earnings reach $400 in a year.", src: "IRS: Self-employment tax", url: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes" }, { text: "Stripe\u2019s standard US rate for domestic online card payments is 2.9% + 30\u00a2 per successful payment, with no setup or monthly fee. International cards and currency conversion cost extra.", src: "Stripe pricing (confirm the current rate)", url: "https://stripe.com/pricing" }],
  goal: "Plan a clean handoff, a support window, and a simple expense and profit tracker.",
  terms: [
    ["Handoff", "The moment you give the finished work to the customer, with instructions."],
    ["Support window", "A set time after delivery when you fix problems at no extra cost."],
    ["Receipt", "Proof of a payment. Keep them for every business expense."],
    ["Profit margin", "Profit as a percent of revenue. $380 profit on $500 revenue is a 76% margin."]
  ],
  explain: [
    "<h3>Deliver like a professional</h3><ol><li><strong>Kickoff:</strong> confirm scope, dates and what they provide.</li><li><strong>Check-in:</strong> a short update halfway, even if all is fine.</li><li><strong>Handoff:</strong> deliver the work, a short how-to (one page), any logins they need, and what is and is not covered next.</li><li><strong>Support window:</strong> for example 14 days for bug fixes. New requests are new projects.</li></ol>",
    "<h3>When something goes wrong</h3><p>Reply quickly, say what happened in plain words, fix it, and explain how you will prevent it. Owning a mistake keeps more customers than hiding it.</p>",
    "<h3>Revenue vs profit</h3><p><strong>Revenue</strong> is what customers pay. <strong>Profit</strong> is what is left after expenses. A month with $1,000 revenue and $700 expenses is only $300 profit. Track both, every month.</p>",
    "<h3>Track expenses simply</h3><p>One spreadsheet or the tracker in Resources: date, what, amount, category, receipt saved (yes/no). Keep business and personal money separate if you can, for example a separate account. Tax rules vary by country; ask a tax professional what you can deduct.</p>"
  ],
  example: { title: "Hypothetical: a month of numbers",
    body: "<p>Riley (made up) has one month of small projects: revenue $650 (two projects). Expenses: AI tool $20, card payment fees $19.45 (2.9% + 30\u00a2 on each of the two payments, Stripe\u2019s standard US rate), a template pack $25. <strong>Total expenses $64.45. Profit $585.55.</strong> Margin about 90%.</p><p><strong>Tax check (US):</strong> if Riley\u2019s net self-employment earnings for the year reach $400 or more, self-employment tax applies. On this month\u2019s profit that is about $82.74 ($585.55 \u00d7 92.35% \u00d7 15.3%), plus any income tax. So Riley moves about a quarter of the profit to a separate savings account each month. The quarter is Riley\u2019s own cushion, not a rule.</p><p>Riley also notices 3 hours went to unpaid revisions on one project, because “two revision rounds” was not written in the scope. Next month the scope says it clearly.</p>" },
  task: { title: "Set up your handoff and money tracker",
    steps: ["Write a one-page handoff template (use the Handoff Checklist in Resources).", "Decide your support window and write it into your scope.", "Open the Expense & Profit tracker and enter every cost you have had so far, even $0 months.", "Save your receipts in one folder.", "Write your current monthly revenue, expenses and profit, even if they are all zero. Honest numbers only."],
    note: "Note your support window and where you keep receipts." },
  quiz: [
    q("A customer asks for a new feature after delivery. In most cases it is…", ["Free forever, as part of support", "A new small project with its own scope and price", "Something to ignore"], 1,
      ["Support covers fixing what was promised, not new work.", "Right. New requests get a new scope and price.", "Ignoring them loses trust. Reply politely and offer it as a new, separately priced piece of work."]),
    q("Revenue is $1,000 and expenses are $700. Which is true?", ["You made $1,000", "Profit is $300", "Profit is $1,700"], 1,
      ["You received $1,000 but spent $700 of it.", "Right. Revenue minus expenses.", "Expenses are subtracted from revenue, not added: $1,000 \u2212 $700 = $300."]),
    q("You made a mistake in delivered work. Best response?", ["Hope they do not notice", "Tell them quickly, fix it, and explain how you will prevent it", "Blame the AI tool"], 1,
      ["They usually notice, and trust drops.", "Right. Fast, honest fixes keep trust.", "You chose to deliver it; it is your responsibility."])
  ]},
{ id: "m6l2", module: "m6", title: "Improve quality, earn repeat work, and decide when to grow", minutes: 20,
  mistake: "Celebrating revenue growth while profit quietly shrinks.",
  facts: [{ text: "The FTC rule on consumer reviews and testimonials took effect October 21, 2024. It targets fake reviews and testimonials, and courts can impose civil penalties for knowing violations.", src: "FTC: Consumer Reviews and Testimonials Rule Q&A", url: "https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers" }],
  goal: "Turn feedback into improvements, offer a sensible repeat service, and check if you are ready to expand.",
  terms: [
    ["Repeat business", "A past customer buying again."],
    ["Retainer", "A monthly arrangement for ongoing work, like upkeep and small changes."],
    ["Testimonial", "A customer’s real words about working with you, shared with their permission."],
    ["Process", "Written steps for how you do the work, so it is consistent and easier to teach or hand off."]
  ],
  explain: [
    "<h3>Improve quality on purpose</h3><p>After each project, write a short review: what went well, what took longer than expected, what the customer was confused by. Pick <em>one</em> improvement for next time. Turn repeated steps into a checklist.</p>",
    "<h3>Earn repeat work</h3><ul><li><strong>Ask:</strong> 30 days after delivery, check in. “Is it still working? Anything new that’s slowing you down?”</li><li><strong>Offer something sensible:</strong> monthly upkeep, a second automation, a new product in a series. Only if it truly helps them.</li><li><strong>Testimonials:</strong> ask for honest words and permission to share them. Never write them yourself, pay for positive ones, or edit their meaning. In the US, the FTC\u2019s rule on consumer reviews and testimonials has been in effect since October 21, 2024, and courts can impose civil penalties for knowing violations.</li></ul>",
    "<h3>When to expand</h3><p>Good signs: steady demand for a few months, a waiting list, a written process, healthy profit (not just revenue), and work that someone else could do with your checklist. Warning signs: you are always behind, refunds or complaints are rising, or you would need to borrow money to grow.</p><p>Expanding can mean raising prices, adding a related offer, using a helper for specific tasks, or turning your process into a product. Each adds cost or risk, so change one thing at a time and watch your profit.</p>"
  ],
  example: { title: "Hypothetical: Jordan’s growth check",
    body: "<p>After four months (made up), Jordan has done 5 booking automations. Two customers asked for monthly upkeep. Jordan has a written 12-step setup checklist, and each new project now takes 6 hours instead of 14.</p><p>Jordan’s growth check: demand steady (yes), waiting list (no), written process (yes), profit healthy (yes, small), always behind (no). Decision: offer a small monthly upkeep plan to past customers and raise the setup price slightly for new ones. No hiring yet.</p>" },
  task: { title: "Run your growth check",
    steps: ["Write a short review of your last project (or practice project).", "Pick one improvement and add it to your process checklist.", "Draft a 30-day check-in message for a customer.", "Answer the Growth Check worksheet honestly.", "Write your one next move for the coming month."],
    note: "Save your one next move. Your dashboard shows it." },
  quiz: [
    q("What is an honest way to get testimonials?", ["Write some and ask friends to post them", "Ask real customers for their words and permission to share", "Offer a discount only for 5-star reviews"], 1,
      ["Fake testimonials are deceptive and can be illegal.", "Right. Real words, real permission.", "Paying only for positive reviews makes them misleading."]),
    q("Which is the strongest sign you are ready to expand?", ["One very good month", "Steady demand for months and a written process", "You feel excited"], 1,
      ["One good month can be luck or a one-off. Look for steady demand over several months.", "Right. Repeated demand plus a process means growth is manageable.", "Excitement is great, but check the numbers."]),
    q("Your revenue went up but profit went down. What should you look at first?", ["Your expenses and time per project", "Nothing, revenue matters most", "Your logo"], 0,
      ["Right. Rising costs or slower work can eat your profit.", "Profit is what you keep. It matters more.", "A logo does not change your costs or how long each project takes, so it is unlikely to be the cause."])
  ]}
];

/* ---------------- WORKSHEETS & TEMPLATES ---------------- */
var WORKSHEETS = [
  { id: "skill", title: "Skill Picker", module: "m2", kind: "form", desc: "Choose one path for 30 days with a clear reason.",
    fields: [["hours", "Real hours per week", "text"], ["budget", "Monthly tool budget", "text"], ["people", "5 people or groups I can talk to", "area"], ["path", "My path for 30 days", "text"], ["why", "Why this path (one sentence)", "area"], ["limit", "Its biggest limit and my plan for it", "area"]] },
  { id: "prompt", title: "Prompt Builder", module: "m1", kind: "prompt", desc: "Build a five-part prompt, then copy it into any AI tool.",
    fields: [["goal", "Goal: what you want and why", "area"], ["context", "Context: who it is for, key facts", "area"], ["task", "Task: the exact job", "text"], ["format", "Format: shape of the answer", "text"], ["limits", "Limits: length, tone, what to avoid", "text"]] },
  { id: "check", title: "Output Check", module: "m1", kind: "checklist", desc: "Run this before you use any AI output.",
    items: ["Every name, number, date and price was given by me or confirmed from an official source", "No invented quotes, reviews, statistics or links", "It does the job I asked, for the right person", "Code was run; links were clicked; steps were followed once", "Read aloud: sounds like a person, no hype", "No private information that should not be there"] },
  { id: "interview", title: "Interview Script & Notes", module: "m3", kind: "form", desc: "15-minute problem conversation. Ask about the past, not the future.",
    fields: [["who", "Who (role only, no private details)", "text"], ["last", "“Walk me through the last time you did [task].”", "area"], ["hard", "“What was the hardest part?”", "area"], ["tried", "“What have you tried? What did it cost?”", "area"], ["often", "“How often does it happen?”", "text"], ["refer", "“Who else should I talk to?”", "text"]] },
  { id: "score", title: "Problem Scorecard", module: "m3", kind: "score", desc: "Score each problem 1–5 on five factors. 18+ of 25 is a strong start.",
    factors: ["Frequency", "Pain", "Current workaround", "Ability to pay", "Reach"] },
  { id: "mvp", title: "MVP Scope", module: "m4", kind: "form", desc: "Keep the first version small enough to finish.",
    fields: [["problem", "Problem statement", "area"], ["must", "Must have (3–5 items)", "area"], ["nice", "Nice to have (later)", "area"], ["not", "Not now", "area"], ["checked", "Things I checked", "area"]] },
  { id: "feedback", title: "Feedback Log", module: "m4", kind: "form", desc: "Write what testers did and said, and your decision.",
    fields: [["task", "Task I gave testers", "text"], ["stuck", "Where they got stuck (and how many of 3)", "area"], ["said", "What they said (their words)", "area"], ["fix", "Fix now / later / no, with reason", "area"]] },
  { id: "offer", title: "Offer & Scope", module: "m5", kind: "form", desc: "One-sentence offer and a six-part scope. Not legal advice.",
    fields: [["offer", "I help [who] [result] by [what], in [time], for [price].", "area"], ["proof", "My honest proof (practice labeled, real results only with permission)", "area"], ["inc", "Included", "area"], ["exc", "Not included", "area"], ["rev", "Revisions", "text"], ["time", "Timeline", "text"], ["they", "What they provide, by when", "area"], ["pay", "Price and payment terms", "text"]] },
  { id: "price", title: "Price Calculator", module: "m5", kind: "price", desc: "Math only. It does not tell you what customers will pay." },
  { id: "outreach", title: "Outreach Message", module: "m5", kind: "template", desc: "A respectful first message. Fill the brackets, then edit it to sound like you.",
    text: "Hi [name],\n\nI noticed [one specific, true thing about their business].\n\nI [what you do, in one plain sentence]. [Optional: I made a rough sample for you, attached. It is only a draft.]\n\nWould a [10]-minute [call / look] this week be useful? If not, no worries at all.\n\n[Your name]\n[How to reach you]" },
  { id: "money", title: "Expense & Profit Tracker", module: "m6", kind: "money", desc: "Log real money in and out. Totals update as you type. Saved on this device only." },
  { id: "handoff", title: "Handoff Checklist", module: "m6", kind: "checklist", desc: "Use it every time you deliver.",
    items: ["Final work delivered (link or files)", "One-page how-to written in plain words", "Logins or access handed over safely", "What is and is not covered next is written down", "Support window dates stated", "Invoice or receipt sent", "30-day check-in date in my calendar"] },
  { id: "growth", title: "Growth Check", module: "m6", kind: "checklist", desc: "Tick only what is true right now.",
    items: ["Steady demand for at least 3 months", "People waiting or asking to start", "My process is written down", "Profit (not just revenue) is healthy", "I am not constantly behind", "Complaints and refunds are rare", "I would not need to borrow money to grow"] }
];

/* ---------------- FINAL PROJECT ---------------- */
var PROJECT = {
  intro: "Turn your work into a one-page case study you can show to future customers. It must be true: practice projects are labeled as practice, results are real, and anyone named has agreed.",
  fields: [
    ["title", "Project title", "text", "e.g. Booking request page for a dog groomer (practice project)"],
    ["kind", "Practice project or real client work?", "text", "Practice / Real client (with permission to share)"],
    ["problem", "The problem", "area", "Who had the problem, how you learned about it (Module 3), what it cost them."],
    ["solution", "What I built", "area", "Your first version and its must-haves (Module 4)."],
    ["ai", "How I used AI and what I checked", "area", "Which steps AI helped with and how you checked facts, code and wording."],
    ["testing", "Testing and feedback", "area", "Who tested it, what they found, what you changed."],
    ["results", "Results (only real ones)", "area", "Only what really happened. “Not measured yet” is a fine answer."],
    ["next", "What I would improve next", "area", ""],
    ["link", "Link or screenshot description", "text", "https://…"]
  ],
  checklist: ["Practice vs real work is clearly labeled", "Every number is real or marked as a guess", "Any customer named has agreed to be named", "No private customer data is shown", "Someone else read it and understood it"]
};

/* ---------------- SOURCES / FACT STATUS ---------------- */
var SOURCES = [
  { claim: "US self-employment tax: 15.3% (12.4% Social Security + 2.9% Medicare), generally on 92.35% of net earnings, usually owed once net self-employment earnings reach $400 a year.", status: "Checked Nov 7, 2026 through web search limited to irs.gov (direct page access was blocked from the build machine). Used in Modules 5 and 6.", url: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes" },
  { claim: "CAN-SPAM: accurate headers and subject, a valid physical postal address, a clear opt-out honored within 10 business days, no fee or extra details to opt out, and no exception for business-to-business email.", status: "Checked Nov 7, 2026 through web search limited to ftc.gov. Used in Module 5.", url: "https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business" },
  { claim: "The FTC rule on consumer reviews and testimonials has been in effect since October 21, 2024; courts can impose civil penalties for knowing violations.", status: "Checked Nov 7, 2026 through web search limited to ftc.gov. Used in Module 6.", url: "https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers" },
  { claim: "Stripe standard US pricing: 2.9% + 30\u00a2 per successful domestic online card payment; no setup or monthly fee.", status: "Seen in web search results limited to stripe.com on Nov 7, 2026. The search index copy may be old, so confirm on the live pricing page before you rely on it. Used in Modules 5 and 6 and as the calculator hint.", url: "https://stripe.com/pricing" },
  { claim: "GitHub Pages: published sites up to 1 GB; soft bandwidth limit of 100 GB per month.", status: "Checked Nov 7, 2026 through web search limited to docs.github.com. Used in Module 2.", url: "https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits" },
  { claim: "Language models can state false information confidently (\u201challucinations\u201d).", status: "General, widely documented behavior; AI providers warn about it in their own help pages. Not tied to one source.", url: "" },
  { claim: "Prices, free tiers and limits of specific AI assistants, automation tools and marketplaces.", status: "Deliberately not listed: they change often. Lessons tell students to check each official pricing page.", url: "" },
  { claim: "Problem-interview approach (ask about past behavior, not future guesses).", status: "Described in the book The Mom Test by Rob Fitzpatrick. A teaching method, not a statistic.", url: "" },
  { claim: "Rules of thumb in lessons (add 30% to hour estimates, a 1\u20135 problem scorecard with 18+ as a strong start, follow up once or twice).", status: "From common practice, not official rules or research. Labeled as guidance.", url: "" }
];

/* Stable shuffled display order for quiz options, so the right answer is not always in the same place. */
function optionOrder(seed, n) {
  var h = 2166136261;
  for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  var rnd = function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  var a = []; for (var k = 0; k < n; k++) a.push(k);
  for (var j = n - 1; j > 0; j--) { var r = Math.floor(rnd() * (j + 1)); var t = a[j]; a[j] = a[r]; a[r] = t; }
  return a;
}

window.ACADEMY = { optionOrder: optionOrder, PATHS: PATHS, QUESTIONS: QUESTIONS, MODULES: MODULES, LESSONS: LESSONS, WORKSHEETS: WORKSHEETS, PROJECT: PROJECT, SOURCES: SOURCES };
})();
