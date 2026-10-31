# Verification of Vercel repair

- Clean `npm ci` and Vercel-target build succeeded on Node.js 24.22.1.
- Original content/planner/feed tests passed.
- Original learning-lab, mock scoring and community authorization tests passed.
- Original personal-AI and cryptographic Google-auth tests passed with simulated providers.
- New Vercel startup, route/query, missing-configuration, spoofed-header, protected refresh and background bridge tests passed.
- Actual storage Lua executed in fakeredis + Lua: concurrent create/update claims, deletion races, prefix pagination, binary/Unicode data, per-account encrypted keys and Google sign-out passed.
- Official @vercel/node 28.0.1 builder traced 21 required runtime files; @vercel/routing-utils 6.6.1 accepted and transformed all configured routes. No secret files were bundled. This is a local builder check, not a live deployment.
- Browser preview verified homepage, Google-only setup-pending UI and mock-paper controls without configured credentials.

No real Google sign-in, paid AI generation, live Upstash database or live Vercel account was used. The original live Sites project and its Git checkout were not changed.


## Version 6.2 — AI connection visibility

- `npm run build` and `npm run test:all` passed. After adding rendering and
  provider-choice regression checks, `npm run test:vercel` also passed.
- Top-bar and pinned sidebar entry open `/#ai`; Gemini/Claude options are
  visible before login and even without deployment secrets.
- Tests cover signed-out, incomplete setup and signed-in states. Key entry
  stays unavailable without authentication and configured encryption/storage.
- Provider choice updates key instructions and Claude workspace visibility,
  clears a key when switching providers, and stores only the chosen provider
  name on-device. No real credential was used in browser testing.
- Local browser checks covered an unconfigured Vercel server and simulated
  account/provider form flow. Responsive frames at 390 and 790 CSS pixels had
  no horizontal page overflow. Synthetic Gemini verification displayed the
  model and automatic mock-analysis settings.
- Google OAuth, a live Upstash database and real Gemini/Claude calls are still
  unverified for the user's deployment. No GitHub remote or Vercel deployment
  was changed by this repair.


## Version 6.3 — Career overview, instructor directory and theme characters

Reviewed 31 October 2026.

- Sidebar groups now keep government, private sector, exams, career explorer,
  direction finder and cutoffs under Career Overview. Existing hash routes
  still work. The three sector/pathway cards and their return buttons were
  exercised in the browser.
- Four paid skill courses include provider links, prerequisites, instructor
  LinkedIn profiles, original career summaries and attributed teaching
  milestones/experience. Start years are not inferred from company or channel
  creation dates. Hitesh Choudhary's teaching start year remains explicitly
  unconfirmed. Course fees are left to current provider pages.
- Browser checks covered the UG course entry, paid-course deep link, instructor
  search, subject filtering, language empty state, expanded biographies and
  returning to free video lectures. All four instructor LinkedIn destinations
  were read from the rendered cards. Public profile identities were cross-checked
  through web search and official biographies; LinkedIn may require sign-in.
- Minecraft and Among Us theme switching renders original embedded vector
  characters in the sidebar and overview. Calm remains available. The character
  art makes no external image requests and has no motion or flashing effects.
- Phone and tablet iframe previews at 375 and 768 CSS pixels had content widths
  of 360 and 753 pixels after scrollbar allocation, with matching scroll widths.
  The phone header, filters, cards and instructor disclosures remained readable.
- Build, existing core/lab/AI/Google-auth/Vercel regression checks and whitespace
  checks passed. The auth/provider tests use mocked identities and model replies;
  no real sign-in, key connection or billable generation was performed.
- This is a local source ZIP update. No Cloudflare, Vercel or original Sites
  deployment was changed. Cloudflare setup notes now describe the included
  Google/AI backend and retaining the existing R2 bucket and encryption secret.
