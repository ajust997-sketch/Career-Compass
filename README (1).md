# Career Compass 6.3 on Cloudflare Workers

This export supports Google study-account sign-in, study circles and personal
Gemini/Claude API connections. A static HTML upload alone cannot run the account,
community or AI endpoints. Google sign-in and connecting a model are separate.

## Update an existing Worker

1. Extract the ZIP. Put the contents of `Career-Compass/` in the existing
   repository's project folder; commit all source and build configuration files.
2. Set the Cloudflare Worker build root to that project folder. Use Node.js 24,
   build command `npm run build`, and deploy command
   `npx wrangler deploy --config portable/wrangler.jsonc --keep-vars`.
3. Check `portable/wrangler.jsonc`: the Worker name should match the existing
   Worker. Its `BUCKET` binding must point to your existing R2 bucket. Retain the
   original bucket name if it differs from the example.
4. Keep runtime `GOOGLE_OAUTH_CLIENT_ID` and secret `AI_KEYS_ENCRYPTION_KEY`
   on the Worker. The encryption key is 64 hexadecimal characters. Do not
   regenerate an existing key: stored personal API keys need it to decrypt.
5. Trigger a build of the latest commit. Check `/#overview`, `/#paid-courses`
   and `/#ai`. `/api/ai/status` should return JSON, not a 404. No sign-in or
   provider key is required to see the Gemini/Claude cards.

Cloudflare uses the R2 `BUCKET` binding. Upstash variables described in the Vercel
guide are not required for this Worker target. Keep the R2 bucket private.
The ZIP has not connected a GitHub account or deployed anything automatically.

## If setting up accounts for the first time

- Create a Google OAuth **Web application** client. Register the exact HTTPS
  site origin in Authorized JavaScript origins, without a path or hash.
- Configure `GOOGLE_OAUTH_CLIENT_ID` and a securely generated encryption key as
  Worker runtime settings. Use a secret for the encryption key; never commit
  it to GitHub. Add test users in Google Auth Platform if the app is in testing.
- After deployment, a learner selects **Connect AI**, signs into a study
  account with Google, then verifies their own Gemini or Claude API key.
- Uploaded-paper AI summaries and attempt analysis are optional and require
  consent. Provider quota, fees and availability apply. A consumer chat
  subscription is not an API credential.

The independent Worker does not trust Sites identity headers. Do not copy
Sites service tokens or set `OWNER_EMAIL` to try to grant ownership on a raw
Worker. The scheduled handler refreshes the shared opportunity feed at
02:30 UTC / 08:00 Asia/Kolkata.

## Static copy

`npm run build` also produces `standalone/index.html` and the bundled
`standalone/worker.js`. The HTML contains the interface, paid course directory
and character artwork. Reading guides, local planning and mock grading work
without an AI provider. External course links, fonts, translation and some
PDF/OCR dependencies require internet access. Account storage, shared feeds,
study circles and AI processing require the deployed server.

For Vercel deployment, use `VERCEL_SETUP.md` instead.
