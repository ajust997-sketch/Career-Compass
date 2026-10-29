# Career Compass — Gemini editing context

This is a source export of the existing public Career Compass website.
Live URL: https://best-career-compass.nik921463.chatgpt.site/
Source commit: 56802417f82dc52064dccab5b8727e989efadea1

## Goal and boundaries
Help the owner edit this local source. This package does not contain production credentials, visitor data or a deployment connection. Local changes do not update the live website.
The current remote MCP endpoint exposes only get_opportunity_status and refresh_opportunities. It cannot edit source or publish releases. Do not claim a connection or publication unless verified.

## Project
Buildless JavaScript browser app plus a Cloudflare Worker. Node.js 20+ is required for Gemini CLI. The application itself has no npm dependencies.
Edit src/ rather than generated worker/index.js. Preserve existing content and features unless the user requests a change.
- src/app.html, app.css, app.js: original application
- src/experience.js, experience.css: existing guide enhancements
- src/next.js, next.css: themes, route details, community, benefits, skills radar
- src/practice.js, paper-core.js: games and mock-paper import/scoring
- src/data.json, new-data.json, lectures.json, cutoffs.json: source-linked educational content
- src/server.js, community-server.js: hosted APIs and MCP
- scripts/assemble.mjs: generates the Worker and standalone output

## Checks and preview
Run from this folder:
node scripts/assemble.mjs
node scripts/check.mjs
node scripts/check-lab.mjs
node scripts/dev.mjs
Then open http://localhost:3000/ for local preview. Stop with Ctrl+C. The preview uses temporary in-memory storage; it has no real ChatGPT sign-in.
Run checks appropriate to the change and describe any untested behavior. The original deployment build uses bash scripts/build.sh; use a Bash shell when needed on Windows.

## Preserve these contracts
Retain the existing interview section, readable multicolour design, optional game-inspired themes, and phone layouts. Mock extraction needs user review; missing answer keys remain ungraded; never fabricate explanations. Workforce figures must retain their source, date and geography.
Never remove authorization or fabricate trusted identity headers to make local community sign-in work. Sites owns authentication on the hosted site. Independent deployments require their own verified auth and storage; the standalone Worker deliberately disables community identity.
Preserve .openai/hosting.json and its existing project_id. Do not change the current site's audience. Never put credentials in source or browser code.

## Returning edits for publication
Keep a summary of edited files and checks. Zip the project source after editing and return it to the owner. The owner can attach it to the original ChatGPT Career Compass conversation for review and publication to the existing URL.
Production publishing requires the authenticated Sites workflow; no public deployment API or production credential is supplied in this export. Do not describe local edits, git commits or MCP calls as a production deployment.
