/* AI Income Academy: owner settings.
   Change anything in this file and reload the page. No build step needed.

   COACHING TIERS: prices are Yaya's chosen range ($1,500 to $4,800+).
   Before you take a payment, confirm you can deliver EVERY item listed in each tier.
   Only list what you will really do. Never add income promises or results here.

   applicationUrl: a real application form (for example Google Forms or Typeform).
     While empty, the Apply page builds an application message the student copies and sends you.
   bookingUrl: a scheduling link for fit calls (optional).
   supportEmail: where applications and questions go (shown as text). */
window.ACADEMY_CONFIG = {
  courseName: "AI Income Academy",
  tagline: "Online coaching and mentorship for freelance brand scaling: learn to run paid ads for clothing and e-commerce brands, with live coaching from Yaya.",
  coachName: "Yaya",
  currencySymbol: "$",
  applicationUrl: "",
  bookingUrl: "",
  supportEmail: "",
  replyDays: 3,          // how many business days until you answer an application
  tiers: [
    {
      id: "core",
      name: "Group Coaching",
      price: 1500,
      priceLabel: "",     // optional, e.g. "From $1,500"
      length: "8 weeks of live coaching",
      fits: "You want the full program and weekly group coaching to keep you moving.",
      features: [
        "Full Brand Scaling track (12 lessons) and the Foundations track",
        "All worksheets, calculators and templates",
        "8 weekly live group coaching calls with Yaya (60 minutes)",
        "Feedback on your outreach messages during the group calls (bring up to 2 each week)",
        "Program access for the 8 weeks plus 6 months after"
      ],
      highlight: false
    },
    {
      id: "mentor",
      name: "1-on-1 Mentorship",
      price: 2900,
      priceLabel: "",
      length: "8 weeks",
      fits: "You want personal feedback on your pitch and your first campaign.",
      features: [
        "Everything in Group Coaching",
        "4 private 1-on-1 calls with Yaya (45 minutes)",
        "Written review of your first client proposal",
        "Review of your first campaign setup before launch"
      ],
      highlight: true
    },
    {
      id: "roundtable",
      name: "Roundtable",
      price: 4800,
      priceLabel: "From $4,800",
      priceNote: "$4,800 covers 12 weeks. Longer support is priced on your call.",
      length: "12 weeks",
      fits: "You are working with (or about to sign) real clients and want close support.",
      features: [
        "Everything in 1-on-1 Mentorship",
        "Weekly private 1-on-1 calls with Yaya for 12 weeks (45 minutes)",
        "2 small-group roundtable calls a month with other Roundtable members (60 minutes)",
        "Review of live client campaigns and reports",
        "Message support on weekdays, reply within 1 business day"
      ],
      highlight: false
    }
  ],
  paymentPlans: "",       // e.g. "Payment plans available: ask on your fit call." Leave "" if not offered.
  // Shown on the coaching page. Keep it true. Leave "" until you have written a real policy.
  refundNote: "",
  earningsDisclaimer: "Earnings disclaimer: this program teaches skills and gives coaching. It does not promise income. We do not have data on student results yet, so we make no claims about what students earn. Results depend on your effort, skills, clients and many things outside anyone’s control, and you may earn nothing. Clients pay their own ad spend; no one can guarantee ad results.",
  // The owner revenue goal lives in PROGRESS.md only, not in this file.
  _end: true
};
