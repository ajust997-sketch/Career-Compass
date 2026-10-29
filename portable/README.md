# Run Career Compass independently

The application has no OpenAI API dependency, paid AI endpoint or ChatGPT sign-in requirement in its source. Personal profile data, preferences, bookmarks, timetables and progress are local to the visitor's browser.

## Standalone static copy

Run `npm run build`. The build creates `standalone/index.html`, a complete self-contained application. Open it locally or publish it on a static web host. Career guides, cutoff references, video links, recommendations, planning and exports work without a server. Internet access is needed for external lectures and translation. Shared live feeds require the Worker deployment below; the static copy links to the original job and event directories if no feed endpoint exists.

## Worker with its own daily feed schedule

1. Use a Cloudflare account and an R2 bucket named `career-compass-opportunities`.
2. Build, then deploy with the official Wrangler CLI using `portable/wrangler.jsonc`.
3. The Worker contains an internal scheduled handler. The configured `02:30 UTC` daily trigger corresponds to `08:00 Asia/Kolkata`, independent of ChatGPT Automations.
4. The first scheduled invocation writes the shared snapshot. Public visitors can read it, but cannot call the refresh writer.

The example configuration contains no credentials or Site identity. Provider free-tier eligibility and usage limits apply. This does not provision an external hosting account or automatically deploy outside Sites.

Do not set `OWNER_EMAIL` on a raw independent Worker: that authorisation branch relies on verified identity headers supplied by Sites. On the independent deployment, leave it unset and use only the internal scheduled handler for refresh. Do not copy Site service tokens into source or browser code.
