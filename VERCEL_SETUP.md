# Vercel setup

## Deploy the public website

Deploy the extracted project directory containing `package.json`, `vercel.json`,
`api/`, `platform/`, and `src/`. Use the **Other** framework preset and Node.js
**24.x**. The included configuration runs `npm ci`, builds with `npm run build`,
and serves `public/`. Rebuild/redeploy after replacing the code; disable reuse of
old build cache for the first repair deployment. Remove old dashboard overrides
that point to `dist`, `worker`, `standalone`, a Next.js build or a different root.

The homepage is static. Courses, career/exam guidance, themes, saved local plans,
practice games and mock import/grading work without server secrets. PDF/OCR and
translation tools still need their external browser downloads. Account sync,
community records, releases, and AI reports need the storage configuration below.

## Durable account storage

In the Vercel project, open **Storage / Marketplace**, choose **Upstash Redis**,
and connect a database to the project. Review the provider plan and limits in
its dashboard. This package uses the authenticated HTTPS REST endpoint, not a
`redis://` URL. Configure these server environment variables:

| Name | Value |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Your database's `https://….upstash.io` REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Its read/write REST token, never the read-only token |
| `GOOGLE_OAUTH_CLIENT_ID` | Your Google Web application client ID |
| `AI_KEYS_ENCRYPTION_KEY` | 32 random bytes encoded as 64 hexadecimal characters |

The adapter also accepts the older names `KV_REST_API_URL` and
`KV_REST_API_TOKEN`. If your integration uses a custom variable prefix, map its
values to the names above. Do not put any token in a `NEXT_PUBLIC_`/`VITE_`
variable, source file or browser storage. Select the appropriate Production and
Preview environments, then redeploy to apply changes.

Use a durable database without cache eviction for account data. Keep backups.
The default Redis namespace is `career-compass:production`, `:preview` or
`:development` according to `VERCEL_ENV`. For separate projects sharing a
single database, set a distinct `CAREER_COMPASS_STORAGE_PREFIX`. Changing a
prefix makes existing records inaccessible until it is restored. Keep preview
accounts separate from production; all previews otherwise share the preview
namespace. There is no in-memory production fallback.

Keys and AI report bodies are AES-256-GCM encrypted before storage. Public
community content, hashed account/session identifiers, metadata and counters
use the same private database. Redis is never directly accessible to browsers.
Conditional writes use atomic Lua; listings use a sorted index and anchored
pagination. Session/credential reads use Redis's write-classified `GETEX`
without changing expiration, and all server requests bypass caches. Expiry is
also enforced by the application. Small expired auth/rate metadata may remain
until maintenance; reports remain until the learner deletes them.

## Encryption key

On your own computer, generate a key once for a **new independent deployment**:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Save that result as the Vercel secret `AI_KEYS_ENCRYPTION_KEY`. Keep it unchanged
across redeploys and store a safe backup. If migrating existing encrypted user
records, retain the original matching secret and migrate the records together;
this ZIP does not export either. Regenerating the key makes existing saved
credentials and reports unreadable. It is not a Gemini API key.

## Google account login

1. In Google Cloud Console / Google Auth Platform, configure Branding/Audience
   and your real support details. Create an OAuth **Web application** client.
2. Add your exact production Vercel/custom domain (for example, the actual
   `https://your-project.vercel.app` you deployed) to **Authorized JavaScript
   origins**. Do not use a path, a trailing slash, or the old ChatGPT Site origin
   as a substitute for this deployment's origin.
3. Set the client ID ending `.apps.googleusercontent.com` as
   `GOOGLE_OAUTH_CLIENT_ID` in Vercel. This flow does not use a client secret.
   It uses a Google popup callback, so no OAuth redirect URI is required.
4. Set your public privacy URL to your own domain plus `/privacy`. Follow any
   Google verification requirements and allow your account as a test user while
   the Google application is in testing. Use a stable domain for testing: each
   different preview origin must be authorized if you want login on it.
5. Redeploy. Open `/#ai`, choose **Continue with Google**, then verify sign-in
   and sign-out. Secure session cookies require HTTPS.

The standalone Vercel deployment does not have Sites' managed ChatGPT sign-in.
It ignores caller-supplied `oai-*` identity headers and does not show that
unavailable login option. Google and existing Sites accounts/data are not
migrated or merged automatically. Original Sites owner moderation/refresh via
`OWNER_EMAIL` is deliberately unavailable on Vercel; Google email does not
silently become an administrator. Contributors can still manage their own
materials. An independent administrator UI/role system is outside this repair.

## Personal Gemini / Claude

After signing in, each learner connects their own key in **Connect AI**.
Do not configure a shared `GEMINI_API_KEY` for this implementation. Google
account sign-in alone does not activate Gemini analysis, subscriptions or API
credit. Learners consent before sharing reviewed paper text and can opt into
automatic analysis. Provider availability, quotas and charges still apply.

The Vercel function uses `@vercel/functions.waitUntil` for short background
analyses. `maxDuration` is 60 seconds; provider calls retain their 22-second
limit. This is not a durable job queue, and interrupted jobs are shown as failed
rather than silently retried with paid usage.

## Opportunity refresh (optional)

The original Site's scheduled job does not automatically migrate to Vercel.
Without a new refresh schedule, the opportunity feed can be empty; links to the
original sources remain available. Tool-release checks have their existing
on-visit cache behavior once storage is configured.

For an optional daily Vercel Cron, set a separate random `CRON_SECRET` of at
least 32 characters and add this top-level property to `vercel.json`:

```json
"crons": [{"path":"/api/cron/refresh","schedule":"0 5 * * *"}]
```

That schedule is 05:00 UTC daily. Vercel supplies the bearer secret to scheduled
requests. The endpoint rejects missing/wrong secrets. No cron is activated in
this ZIP. Shared feed refreshes are bounded by the existing six-hour interval.

## Verify and diagnose

- `/` must render the guide even when storage/login is not configured.
- `/api/health` returns `platform: "vercel"`. A configured, reachable database
  reports `persistentStorage: true`. This endpoint exposes configuration booleans
  only; it never reveals secrets. `storage: "not-configured"` is allowed before
  account setup. Bad/unreachable storage gives a controlled 503 JSON response.
- `/#ai` shows the Google setup state until the storage and Client ID are present.
- `/privacy` is served by the function and works without account configuration.
- If the old `FUNCTION_INVOCATION_FAILED` remains, inspect Vercel Runtime Logs
  for `/api/app`, the selected deployment, root directory and build settings.
  The screenshot alone does not identify a unique exception.
- Never paste secrets into a support chat; redact environment values from logs.

Local verification has passed the original application tests and new startup,
routing, account-isolation and Redis/Lua simulation checks. Browser preview was
checked without credentials. Live Vercel, real Google login and real model calls
cannot be claimed verified until the actual deployment/account is connected.

## Official references

- [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [Vercel storage integrations](https://vercel.com/docs/marketplace-storage)
- [Upstash REST API](https://upstash.com/docs/redis/features/restapi)
- [Google sign-in setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)

## Connect AI is missing or setup is pending

Version 6.2 adds a persistent **Connect AI** button and public provider cards at
`/#ai`. If they are absent, check that the deployment uses the new commit and
the folder containing this package's `package.json`. Redeploy and refresh the
page. `/api/health` should report `version: "6.3.0"`.

If the cards are visible but setup is pending, open **Own this site? View setup
steps**. Status checks show whether storage, Google client and encryption are
configured; they never display secret values. This is not a provider connection
success indicator. Valid storage credentials, the authorized Google origin and
the learner's own valid provider API key still need to work for real use.

Provider choice is the only new AI preference stored on-device. API keys remain
server-side, encrypted and scoped to the signed-in user. No GitHub account access
is required for a learner to connect Gemini or Claude.
