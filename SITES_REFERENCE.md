# Career Compass

Public India-focused degree, career and exam guide with 23 UG groups, 24 career paths and 17 exam routes.

## Build and check

- npm ci installs the pinned build/verification dependencies.
- node scripts/assemble.mjs assembles the browser application and bundles the Worker (including jose) from src/.
- node scripts/check.mjs checks existing guide, planner, feed and MCP behavior.
- node scripts/check-lab.mjs checks practice coverage, paper grading and shared community authorization/privacy.
- node scripts/check-ai.mjs checks encrypted personal AI connections, account boundaries, provider adapters, job lifecycle and error handling with mocked provider responses.
- node scripts/check-google-auth.mjs checks cryptographic Google token verification, login CSRF/replay protection, sessions, account separation and sign-out with simulated Google accounts/JWKS.
- bash scripts/build.sh creates the deployment output.
- node scripts/validate-artifact.mjs verifies the Worker package.

The site is an existing Sites Worker ESM app using the BUCKET R2 binding. Preserve .openai/hosting.json, its project ID and its audience. worker/index.js is generated, not the source of truth.

## Features

- Calm multicolour design, optional Minecraft-inspired block palette and Among Us-inspired space palette.
- Existing interview prompts and checklist preserved; verified media and clearly labelled topic searches are additive.
- Route-specific reasons, responsibilities, starting skills and a small try-it task for all 64 catalogue routes.
- 12 curated student benefits with eligibility and limitations.
- 72 original foundation questions across 18 banks; every route has mapped questions for two light practice games.
- Google full-page language widget plus native English/Hindi/Hinglish interface.
- Signed-in study circles with anonymous membership totals, opt-in public display names/progress, follow lists, discussion and resource sharing.
- PDF/TXT community attachments up to 1 MB, owner/contributor deletion, reports and owner review.
- Browser-local mock paper import: TXT/JSON, PDF text extraction, image OCR and limited scanned PDF OCR. Review before attempting, timer, flags, configurable marking, topic error log and targeted retry.
- Dated, source-linked workforce snapshots with geography; no fabricated live India headcounts or seniority splits.
- Official tool-release radar with six-hour on-visit refresh and source-linked learning exercises.
- My AI assistant: each signed-in learner can connect a Gemini or Claude API key, select an available text model, and generate private paper summaries, mistake analyses and source-linked learning briefs. Auto analysis is opt-in after question review and after mock submission.

## Runtime and data

Sites supplies trusted visitor headers. Public browsing does not require login. Community writes require a signed-in Site identity or verified Google session, a chosen display name and same-origin JSON requests. Email is never returned by the community API. The profile's shareProgress setting is false unless explicitly selected.

R2 namespaces:

- opportunities/: retained opportunity feed snapshots
- industry/: official release cache
- community/profiles/, members/, follows/: learner-controlled state
- community/materials/, files/, messages/: public contributions
- community/reports/, limits/: owner moderation and request limits

Joining the same goal again updates its record; it does not inflate counts. Profile visibility is evaluated on every room read. Counts are capped at 20,000 scanned records and explicitly marked "at least" beyond that. Rooms page through members, contributions and messages. Discussion refreshes every 20 seconds while open, except while a contribution is being typed.

Mock files are processed in the browser, not sent to the Worker. PDF.js 4.10.38 and Tesseract.js 5.1.1 load from jsDelivr. OCR language data also requires internet. Parsing supports single-choice questions with 2–6 options, at most 200 questions, 10 MB, 30 PDF pages and 10 scanned pages per import. OCR may miss formulas, diagrams and multi-column layouts. Questions and keys are editable. Missing-key questions are excluded from scores; explanations are supplied by the imported paper, not generated or fabricated. Coverage gaps refer only to the learner's entered topic list.

The degree/exam curriculum remains editorial. Official releases supplement it and do not silently replace university syllabuses. The pre-existing daily opportunity automation is not altered by this version.

## Portability

The standalone HTML supports device-local planning and practice. Community and release endpoints require a hosted Worker with trusted identity and storage. The independent standalone Worker disables Sites identity headers and Sites owner operations, so it cannot accept forged platform headers. Google login can work there only after its own HTTPS origin and OAuth client are configured.

OWNER_EMAIL controls existing owner operations and community moderation on Sites; use a runtime variable, not source. The existing /signin-with-chatgpt, /signout-with-chatgpt and /callback routes remain owned by Sites. The separately requested Google learner login uses /auth/google routes and never changes Sites access policies or owner permissions.

## Personal AI connections

The owner provisions AI_KEYS_ENCRYPTION_KEY as a Sites runtime secret (32 random bytes in hexadecimal). Provider API keys are supplied only by learners in the secure website form; there is no shared provider key and no consumer-chat account impersonation. Gemini/Claude app subscriptions are separate from API access. The connect action validates a key with the provider model-list API before saving it. Google keys go only to generativelanguage.googleapis.com and Claude keys only to api.anthropic.com, in headers; redirects are rejected. Claude workspace ID is optional for keys that require it. No OpenAI API connection is included in this release.

Keys and AI report bodies are encrypted with AES-256-GCM, fresh nonces, and account/purpose-bound additional authenticated data. Records live under personal-ai/<site-user-hash>/. Client responses never contain keys or ciphertext. Authenticated account ID, not a request-body user ID, selects all private records. Browser storage keeps only opaque report references; it never stores API keys or report contents. Original uploaded files stay on-device. With explicit manual consent or saved opt-in automation preferences, reviewed question text, supplied keys, answers/timings/error reasons are sent to the selected provider. The provider's own quota, billing and data-use terms apply.

Normal marks are recalculated server-side from the provided answer key and remain separate from AI commentary. Missing keys stay ungraded. Context includes up to 60 questions, prioritising missed questions, plus metrics for the full paper; generated feedback is limited to eight question IDs. Paper summaries suppress question-feedback fields before an attempt. A strict text-only output shape is validated and escaped; model output cannot edit a course, call tools or publish shared content. Learning briefs use built-in course guidance and allowlisted dated release sources; they do not browse arbitrary URLs or certify current exam rules.

Jobs return 202 and run through ctx.waitUntil with a 22-second provider timeout, within the Workers 30-second post-response budget. Reports persist privately and can be opened later; this is short background work, not a durable queue or scheduled ongoing agent. Interrupted jobs become visibly failed after 45 seconds; no automatic paid retry occurs. Request IDs are claimed with conditional R2 puts to avoid duplicate generation. Per-account conditional counters limit generation to four starts per minute and 30 per UTC day; provider limits still apply. Key verification/model refresh has a separate six-per-minute limit. Failure text never echoes raw provider errors or credentials.

Disconnect removes the saved provider key and disables auto analysis for that provider. Conditional connection writes prevent a delayed model refresh or settings save from restoring a removed or replaced key. Already-submitted requests may finish. Report deletion uses a conditional completion write so an in-flight job cannot recreate a deleted report. Reports remain until the learner deletes them; small request IDs and rate counters contain no paper bodies. Preserve the encryption secret across deployments; rotating it without migration makes saved keys/reports unreadable. Normal keys and reports are never sent to public community APIs.

Development-only /_qa/personal-ai and /_qa/personal-ai-mobile render visibly labelled synthetic provider fixtures for browser QA. They are served only by scripts/dev.mjs and do not exist in the production Worker. Provider contract tests use mocks; without a learner's real key, live generation is not claimed as verified.

## Verification

The original interviews() and interviewQuestions() source is retained unchanged. Automated checks cover scoring, missing keys, duplicate IDs, sparse options, same-origin/authentication checks, private progress, unique joins, follows, file ownership, upload/read/delete, rate limits and owner-only reports. Browser QA covers desktop and 390 px phone layouts, themes, course details, Google language options, practice feedback, mock review/attempt/results and PDF import. Personal AI browser QA uses a clearly labelled synthetic account/provider and covers connection setup, model preferences, automatic reviewed-paper summaries, automatic submitted-attempt analysis, learning briefs and private report history. Real provider generation requires a learner-owned API key and has not been exercised in this checkout.

## Google learner login activation

The user requested a Google-account alternative to ChatGPT sign-in. This public Site now includes that additional learner identity flow while preserving Sites authentication and owner operations. Google sign-in is inactive until `GOOGLE_OAUTH_CLIENT_ID` is configured. The UI explicitly says setup pending; it does not pretend that a disabled button is a working login. Google account login does not grant Gemini API access or use a consumer Gemini subscription: learners still connect their own Gemini API key after signing in.

One-time owner setup, following [Google Identity setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid):

1. In Google Cloud Console, select the project owned by the site owner. Configure Google Auth Platform Branding/Audience using the owner's real support/contact details. Homepage: `https://best-career-compass.nik921463.chatgpt.site`; privacy URL: `https://best-career-compass.nik921463.chatgpt.site/privacy`. Complete any Google-required domain/branding verification. Keep testing restricted to intended test users until the owner is ready to publish the Google app.
2. Create an OAuth client of type **Web application**. Add exactly `https://best-career-compass.nik921463.chatgpt.site` under **Authorized JavaScript origins** (scheme and hostname, no path). This implementation uses Google's popup JavaScript callback, so no OAuth redirect URI is needed.
3. Set the returned public client ID (ends in `.apps.googleusercontent.com`) as the Sites runtime value `GOOGLE_OAUTH_CLIENT_ID`, then deploy the saved version to apply it. No Google client secret, password or API key belongs in this setting. Keep `AI_KEYS_ENCRYPTION_KEY` unchanged.
4. Test with the configured Google test account on the live HTTPS Site: continue with Google, return to My AI assistant, verify the Google session label, connect a personal Gemini key, generate a report, sign out and verify that private data is unavailable. Complete Google app publishing/verification before offering sign-in to everyone.

`/auth/google` renders the official Google Identity Services button only when configured. The login page creates a random ten-minute challenge in a Secure/HttpOnly/host-only cookie. The same-origin JSON callback claims that challenge once using a conditional R2 write and validates the Google ID token with jose against Google's fixed JWKS endpoint. RS256 signature, issuer, audience, issued-at, expiry, authorised party and nonce are checked. Token verification never trusts an email as an identity or permission. Bad/expired/replayed tokens cannot create sessions. Return routes use a fixed allowlist.

A successful Google login creates a new opaque 256-bit session token; only its SHA-256 hash is stored, with a seven-day expiry. Cookie attributes are Secure, HttpOnly, SameSite=Lax and Path=/ with the __Host- prefix. Logout deletes the stored session and cookie. A configured client change invalidates existing sessions. Expired sessions are rejected; small expired session/challenge/counter records may remain until maintenance, without Google emails/names, ID tokens, API keys or paper contents. An explicit Google session takes precedence over an existing Sites learner identity. Google and ChatGPT accounts remain separate; matching emails never merge private records. Sites owner authorization is preserved and cannot be obtained from Google claims.

The sign-in page's CSP permits the official Google Identity script/frame and same-origin callback only. It uses the popup-compatible COOP policy. Original upload processing and opt-in AI sharing remain unchanged. API keys and reports keep their existing per-account encryption.

Verification so far: deterministic tests use locally signed synthetic Google tokens and mocked JWKS (including invalid signatures, wrong audience/issuer/nonce, expiry, concurrent replay, CSRF, owner boundaries and sign-out). Google client creation and a real Google login have not been performed because no owner OAuth client ID is available. Browser QA checks the honest unconfigured state; activation remains a separate runtime configuration step.
