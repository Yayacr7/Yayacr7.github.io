/* =====================================================================
   SHARP SETTINGS — the only file you need to edit.
   Anything left blank stays switched off, and the site says so honestly.
   ===================================================================== */
window.NP_CONFIG = {

  /* Waitlist. Pick ONE provider and paste its ID.
     - "kit":        the number in your Kit form URL (app.kit.com/forms/1234567)
     - "formspree":  the code in https://formspree.io/f/xxxxxxx
     - "formsubmit": the random alias FormSubmit emails you after activation */
  /* Security: pages only allow connections to formsubmit.co. If you switch to Kit or Formspree,
     add app.kit.com or formspree.io to connect-src in index.html, pricing/index.html and trial/index.html. */
  WAITLIST: { provider: "formsubmit", id: "996f64300d619d189bccbba1113b1856" },

  /* Accounts (Supabase, free tier). From Supabase > Project Settings > API:
     the Project URL and the "anon public" key. NEVER paste the service_role key.
     Set google: true after enabling Google in Supabase > Authentication. */
  AUTH: { supabaseUrl: "", supabaseAnonKey: "", google: false },

  /* Payments: Stripe Payment Links (Stripe > Payment Links). */
  PAY: { learner: "", builder: "", founder: "" },

  /* Contact email shown on the privacy, terms and refund pages.
     Use a business address, not a personal one. Blank = "listed here before launch". */
  CONTACT_EMAIL: "contact.yayabuilds@gmail.com",

  /* Cherry voice receptionist (Vapi). Vapi dashboard > API Keys: paste the PUBLIC key only.
     NEVER paste the private key. Blank = the "Speak with Cherry" button stays hidden. */
  VOICE: { vapiPublicKey: "49361516-4f11-447c-bb58-8f4157741d77", assistantId: "39d91e93-6eb5-4bf3-a9a7-82faff683395", voiceId: "Paige" },

  /* Cherry's brain server (cherry-worker/ in the repo), for when the AI can't run on this site's own server.
     The address Cloudflare gives the "cherry" Worker. Blank = off. */
  CHERRY_API: "",

  /* Free trial: days of Founder access, counted from when the account was created. */
  TRIAL_DAYS: 3
};
