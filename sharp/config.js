/* =====================================================================
   SHARP SETTINGS — the only file you need to edit.
   Anything left blank stays switched off, and the site says so honestly.
   ===================================================================== */
window.NP_CONFIG = {

  /* Waitlist. Pick ONE provider and paste its ID.
     - "kit":        the number in your Kit form URL (app.kit.com/forms/1234567)
     - "formspree":  the code in https://formspree.io/f/xxxxxxx
     - "formsubmit": the random alias FormSubmit emails you after activation */
  WAITLIST: { provider: "formsubmit", id: "996f64300d619d189bccbba1113b1856" },

  /* Accounts (Supabase, free tier). From Supabase > Project Settings > API:
     the Project URL and the "anon public" key. NEVER paste the service_role key.
     Set google: true after enabling Google in Supabase > Authentication. */
  AUTH: { supabaseUrl: "", supabaseAnonKey: "", google: false },

  /* Payments: Stripe Payment Links (Stripe > Payment Links). */
  PAY: { builder: "", founder: "" },

  /* Contact email shown on the privacy, terms and refund pages.
     Use a business address, not a personal one. Blank = "listed here before launch". */
  CONTACT_EMAIL: "contact.yayabuilds@gmail.com",

  /* Free trial: days of Founder access, counted from when the account was created. */
  TRIAL_DAYS: 3
};
