# Career Compass — guide for AI coding assistants

Read this file first. It is the single source of truth for how this repo works.
(CLAUDE.md and GEMINI.md point here; Codex, Copilot, Cursor and others read AGENTS.md directly.)

Live site: https://career-compass-2ak.pages.dev
Hosting: Cloudflare Pages project `career-compass`, deployed automatically on every push to `main`.

## How the site is built

```
root source files ──node cf/build.mjs──▶ worker.js (+ index.html) ──▶ functions/[[path]].js ──▶ Cloudflare
```

- Cloudflare's build command is `npm ci && node cf/build.mjs`, so **never edit `worker.js`,
  `index.html` or `career-compass.html` by hand** — they are regenerated on every deploy.
  Edit the source files below instead.
- There is no framework. The front end is plain JavaScript that runs in one shared scope.

## Where things are

| What | File(s) |
| --- | --- |
| Page shell (HTML) | `app.html` |
| Core app: routing, navigation, store, icons, helpers | `app.js` |
| Front-end modules (concatenated in this order) | `experience.js`, `paper-core.js`, `next.js`, `practice.js`, `personal-ai.js`, `discovery.js`, `papers.js`, `layout.js` |
| Styles (same order) | `app.css`, `experience.css`, `next.css`, `personal-ai.css`, `discovery.css`, `papers.css`, `layout.css` |
| Content data (courses, careers, exams, lectures, cutoffs, paid courses) | `data.json`, `lectures.json`, `cutoffs.json`, `new-data.json`, `paid-courses.json` |
| App server (APIs, Google sign-in, personal AI, community, opportunity feed) | `server.js`, `google-auth.js`, `ai-server.js`, `community-server.js` |
| Mock paper parsing and scoring (shared by browser and server) | `paper-core.js` |
| Mock paper lab (upload, OCR, timed test, results) | `practice.js` |
| Connect AI page (Gemini/Claude keys, reports) | `personal-ai.js` |
| Sidebar groups | `discovery.js` (`renderNav`) |
| College previous papers page (`#papers`) | `papers.js`, `papers.css` |
| Page looks + rectangular blocks (loaded last). Overview has no welcome/hero. `LOOK_LEARN` routes get the course-catalogue look (blue, navy title band), `LOOK_PATH` routes (mock, resources, practice) get the learning-path look (gray canvas, slate/teal). Only applies with the calm theme | `layout.js`, `layout.css` |
| Build script (file lists live here) | `cf/build.mjs` |
| Cloudflare entry point (request router) | `functions/[[path]].js` |
| Previous papers API (`/api/papers`) | `cf/papers-api.js` |
| AI editing of papers with the user's own Gemini/Claude key | `cf/ai-rewrite.js` |
| Free KV storage adapter used as `env.BUCKET` | `cf/kv-bucket.js` |
| Fix for `fetch(..., {redirect:"error"})` on Cloudflare | `cf/fetch-shim.js` |
| Scripts injected into the page (AI history on device, AI connect guide) | `cf/html-inject.js` |

### Front-end conventions
- All front-end modules share the scope of `app.js`. Useful helpers: `$`, `$$`, `esc` (always escape
  user text), `heading(title, subtitle, actions)`, `toast(msg)`, `icon(name)`, `api(path, body, method)`,
  `navigate(route)`, `store.get/set` (localStorage, prefixed `cc-`), `downloadFile`.
- A page is a route: push `[id, label, iconName]` to `nav`, wrap `setRoute` (see the end of
  `papers.js` for the pattern), and add the id to a sidebar group in `discovery.js`.
- Icons available: arrow bell book bookmark briefcase building calendar chart chat chip clock close
  cloud code coffee compass download external flask globe grid heart info leaf megaphone menu pen
  planner refresh related scale search settings shield target trophy wallet.
- Mock paper text format (used everywhere, including AI editing):
  ```
  1. Question text
  A. option
  B. option
  Answer: B
  Topic: Unit 2
  Explanation: optional
  ```
- To add a new module: create `name.js` / `name.css` in the repo root and add them to
  `CLIENT_JS` / `CLIENT_CSS` in `cf/build.mjs`.

### Server conventions
- `worker.js` exports `{ fetch(request, env, ctx), scheduled() }`. `functions/[[path]].js` calls it.
- New server features: add a module in `cf/` and call it from `functions/[[path]].js` before
  `app.fetch` (see `handlePapers`). Use `env.CC_KV` (Workers KV) for storage.
- Know who is signed in: see `identity()` in `cf/papers-api.js` (asks the app's `/api/ai/status`).
- Writes must check same-origin and sign-in. Never trust user input; never log secrets.

## Cloudflare settings (dashboard → Workers & Pages → career-compass → Settings)
- Build command `npm ci && node cf/build.mjs`, output directory `/`, no framework preset.
- Binding: KV namespace `career-compass-data` as **`CC_KV`**.
- Variables: `GOOGLE_OAUTH_CLIENT_ID` (text), `AI_KEYS_ENCRYPTION_KEY` (secret, 64 hex chars —
  never change it, or saved AI keys become unreadable), optional `PAPERS_ADMINS`
  (comma-separated user ids that may delete any paper; a user's id is `user` in `/api/ai/status`).
- Free KV allows about 1000 writes per day. Avoid writing to KV on every page view.

## Test before you push
```
npm ci
node cf/build.mjs                       # must print "Built Career Compass"
node --check papers.js                  # syntax check any file you changed
```
For a full local run use Miniflare/Wrangler with a KV namespace bound as `CC_KV`:
`npx wrangler pages dev . --kv CC_KV` (after building). Google sign-in needs the real domain.

## Do not
- Do not edit generated files (`worker.js`, `index.html`, `career-compass.html`).
- Do not commit secrets, API keys or `.env` files. Users' AI keys are stored encrypted server-side.
- Do not remove the sign-in, same-origin or rate-limit checks.
- Do not use `fetch` option `redirect: "error"` without `cf/fetch-shim.js` (Cloudflare rejects it).

## Legacy files (not used by the live site)
`src/` and `scripts/` (old v4 copies), `worker/`, `portable/`, `standalone/`, `.openai/`,
`assemble.mjs`, `build.sh`, `vercel.json`, `vercel-handler.mjs`, `vercel-worker.mjs`, `redis-bucket.mjs`,
`dev*.mjs`, `check*.mjs`, `index.js`, `app (1).js`, `app (2).js`, `README (1).md`, `START-HERE.md`,
`START_HERE.md`, `VERCEL_SETUP.md`, `UPDATE_GUIDE.md`, `VERIFICATION.md`, `SITES_REFERENCE.md`,
`wrangler.jsonc`, `env.example`. They are kept for history; edit the files in the table above instead.
