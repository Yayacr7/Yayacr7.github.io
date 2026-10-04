# Security checklist — Erupt

What's already built into the site, and what only the owner can do.

## Built in

- **Content Security Policy** on every Erupt and lesson page: the browser only runs scripts from this site and the pinned sign-in library, and only talks to Supabase, the waitlist provider and nothing else. Injected scripts are blocked.
- **No inline code**: all JavaScript lives in `.js` files, so the policy can forbid inline scripts entirely.
- **Integrity check** on the Supabase library: if the CDN copy is ever tampered with, the browser refuses to run it.
- **Referrer policy**: other sites only see the domain, never full page addresses.
- **No passwords stored**: sign-in uses emailed links or Google.
- **Visitor input is never inserted as HTML**: forms and calculators only show numbers and fixed text.
- **Spam trap** on the waitlist forms.
- **Server-side lock ready** for paid content: `supabase/schema.sql`.

## Owner to-do (in order)

1. **Two-factor authentication** on GitHub, your Google account, Supabase, Stripe and Kit. A stolen password on any of these is the most likely way you get hacked.
2. **Never put secret keys in the site, a chat or a repo.** Only the Supabase *anon public* key and Stripe *Payment Link* URLs belong in `erupt/config.js`. The Supabase `service_role` key and Stripe secret keys stay in their dashboards.
3. **Supabase > Authentication > URL Configuration**: set the Site URL to your live address and allow only your own pages as redirect URLs (e.g. `https://yayacr7.github.io/erupt/**`). This stops sign-in links being redirected to other sites.
4. **Run `supabase/schema.sql`** in the Supabase SQL Editor before putting any paid content online, and keep RLS on for every table.
5. **Bot protection**: if fake sign-ups appear, turn on CAPTCHA in Supabase > Authentication > Attack Protection.
6. **Stripe**: when the purchase webhook is added, set its signing secret in Supabase, never in the site.
7. **Check what's public**: everything in this repo is downloadable once the site is live, including `Yayacr7Yayacr7.github.io.pdf`.

## Known limits

- GitHub Pages can't send security headers, so protection against the site being embedded in other pages (clickjacking) isn't possible here. A custom domain behind Cloudflare would fix that.
- Until paid content is moved into Supabase, anything in the website files is readable by anyone who views the page source. Today that's only Module 1 and the cost calculator.
- If the Supabase project uses a custom domain, add it to `connect-src` in the pages' Content-Security-Policy.
