/* AI Income Academy: owner settings.
   Change anything in this file and reload the page. No build step needed.

   PRICES BELOW ARE PLACEHOLDERS. Pick your real prices before launch.
   checkoutUrl: paste a real checkout link (for example a Stripe Payment Link)
   when you have one. While it is empty the button says payments are not set up. */
window.ACADEMY_CONFIG = {
  courseName: "AI Income Academy",
  tagline: "A practical path from “What is AI?” to your first paying customer.",
  currencySymbol: "$",
  plans: [
    {
      id: "preview",
      name: "Free preview",
      price: 0,
      period: "",
      blurb: "Try the first module and the starting questionnaire.",
      features: ["Starting questionnaire + path", "Module 1: Understand AI", "Prompt Builder worksheet"],
      cta: "Start free",
      checkoutUrl: "#/start",
      highlight: false
    },
    {
      id: "full",
      name: "Full course",
      price: 97,
      period: "one-time",
      blurb: "All six modules, every worksheet and the final project.",
      features: ["All 6 modules, 12 lessons", "13 worksheets and calculators", "Final portfolio project", "Lifetime updates to the course"],
      cta: "Get the full course",
      checkoutUrl: "",
      highlight: true
    },
    {
      id: "feedback",
      name: "Course + project review",
      price: 247,
      period: "one-time",
      blurb: "Everything in Full, plus a written review of your final project.",
      // Only sell this if you will really do the reviews.
      features: ["Everything in Full course", "One written review of your final project", "One follow-up question by email"],
      cta: "Get course + review",
      checkoutUrl: "",
      highlight: false
    }
  ],
  // Shown under the plans. Keep it true. Leave "" to hide.
  refundNote: "",
  supportEmail: "",
  // Owner-only goal used on the #/owner page. Never shown to students.
  revenueGoal: 1000000
};
