> Version 6.3: compact Career Overview navigation, larger reading text, four
> source-backed paid course/instructor profiles and embedded theme characters.
> **Connect AI** remains visible in the top bar and above the sidebar groups.
> Open `/#ai` to choose Gemini or Claude before login. The setup panel explains
> missing account/storage/encryption configuration; credential entry still
> requires an authenticated account and configured encrypted storage.

# Career Compass — Vercel & Cloudflare export, version 6.3.0

This package adds a Vercel deployment target to the Career Compass v6 source.
Read **START_HERE.md** for the short Hinglish instructions and **VERCEL_SETUP.md**
for account storage, Google login, AI setup and troubleshooting.

```sh
npm ci
npm run build
npm run test:all
npm run dev
```

Use Node.js 24.x. Vercel framework preset: **Other**. Build: `npm run build`.
Output: `public`. Root directory: the folder containing this `package.json` and
`vercel.json`. The static homepage does not require credentials or a running API.
Do not upload `worker/index.js` as a Vercel function: it is a Cloudflare Worker.

## What changed

- Static `public/index.html` serves courses, local plans, themes and mock practice.
- `api/app.js` supplies the actual Node.js/Vercel entry point and background-job
  bridge. Vercel does not pass Cloudflare's `env` and `ctx` arguments.
- `vercel.json` routes `/api/*`, `/auth/google*`, `/privacy` and `/mcp` to one
  function, while the homepage stays static. Missing configuration gives an
  explicit setup state instead of taking down the whole website.
- `platform/redis-bucket.mjs` adapts the existing storage contract to Upstash
  Redis over HTTPS, including binary attachments, metadata, pagination and
  atomic conditional Lua writes. There is no production in-memory fallback.
- The independent deployment supports Google learner accounts. It does not
  display an unusable ChatGPT sign-in link or trust Sites identity headers.
- Saved Gemini/Claude keys and report bodies retain per-account encryption.
  Google sign-in does not by itself grant access to the Gemini API.

## Files

- `src/`: editable application, content and original backend logic.
- `api/app.js`, `platform/`, `vercel.json`: Vercel integration.
- `scripts/assemble.mjs`: builds both application source and Vercel output.
- `public/`, `generated/`: generated, included for convenient inspection; rebuild
  them whenever source changes. Never edit these as the source of truth.
- `scripts/check-vercel.mjs`: startup, routing, identity and setup-state tests.
- `scripts/check-redis.mjs`, `scripts/redis-qa.py`: optional deeper Redis/Lua tests.
- `docs/SITES_REFERENCE.md`: historical v6 architecture and original Sites setup.
- `worker/`, `standalone/`, `portable/`: original Cloudflare targets retained.

The original repository provenance was commit
`3a0cf5c38b34f2902f632a816107c7790f42d9a5`. This Vercel repair is an exported
source modification; it does not republish or change the original live Site.
The ZIP contains no real `.env` values, user records, API keys or production data.

## Verification

`npm run test:all` runs the existing content, practice, community, personal-AI and
Google-auth tests, plus Vercel-specific startup/routing checks. Provider and
Google responses in tests are synthetic. No paid model request is made.

Optional storage integration check (development only):

```sh
python3 -m pip install 'fakeredis[lua]'
node scripts/check-redis.mjs
```

This executes the adapter's real Lua scripts in a local Redis simulation. It
covers concurrent claims, deletion races, binary/Unicode storage, pagination,
Google replay prevention, encrypted-key isolation and logout. A real Upstash,
Google account and live Vercel deployment still need the owner's configuration.
