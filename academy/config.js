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
      name: "Brand Scaling Program",
      price: 1500,
      priceLabel: "",     // optional, e.g. "From $1,500"
      length: "8 weeks of live coaching",
      fits: "You want the full program and weekly group coaching to keep you moving.",
      features: [
        "Full Brand Scaling track (12 lessons) and the Foundations track",
        "All worksheets, calculators and templates",
        "8 weekly live group coaching calls with Yaya (60 minutes)",
        "Feedback on your outreach messages in the group calls",
        "Course updates while the program is offered"
      ],
      highlight: false
    },
    {
      id: "mentor",
      name: "Mentorship",
      price: 2900,
      priceLabel: "",
      length: "8 weeks",
      fits: "You want personal feedback on your pitch and your first campaign.",
      features: [
        "Everything in the Brand Scaling Program",
        "4 private 1-on-1 calls with Yaya (45 minutes)",
        "Written review of your first client proposal",
        "Review of your first campaign setup before launch"
      ],
      highlight: true
    },
    {
      id: "roundtable",
      name: "1-on-1 Roundtable",
      price: 4800,
      priceLabel: "From $4,800",
      length: "12 weeks",
      fits: "You are working with (or about to sign) real clients and want close support.",
      features: [
        "Everything in Mentorship",
        "Weekly private 1-on-1 calls with Yaya for 12 weeks (45 minutes)",
        "Small-group roundtable calls with other Roundtable members",
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
  // Owner-only goal ($1,000,000 in program revenue). Kept out of the site; see PROGRESS.md.
  revenueGoal: 1000000
};
