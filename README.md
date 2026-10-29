# Career Compass

Public India-focused degree, career and exam guide with 23 UG groups, 24 career paths and 17 exam routes.

## Build and check

- node scripts/assemble.mjs assembles the browser application and Worker from src/.
- node scripts/check.mjs checks existing guide, planner, feed and MCP behavior.
- node scripts/check-lab.mjs checks practice coverage, paper grading and shared community authorization/privacy.
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

## Runtime and data

Sites supplies trusted visitor headers. Public browsing does not require login. Community writes require a signed-in Site identity, a chosen display name and same-origin JSON requests. Email is never returned by the community API. The profile's shareProgress setting is false unless explicitly selected.

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

The standalone HTML supports device-local planning and practice. Community and release endpoints require a hosted Worker with trusted identity and storage. The independent standalone Worker has community identity disabled, so it cannot accept untrusted Sites identity headers. Add verified authentication before enabling community writes on an independent deployment.

OWNER_EMAIL controls existing owner operations and community moderation on Sites; use a runtime variable, not source. Sign-in/sign-out and authentication callbacks are owned by Sites.

## Verification

The original interviews() and interviewQuestions() source is retained unchanged. Automated checks cover scoring, missing keys, duplicate IDs, sparse options, same-origin/authentication checks, private progress, unique joins, follows, file ownership, upload/read/delete, rate limits and owner-only reports. Browser QA covers desktop and 390 px phone layouts, themes, course details, Google language options, practice feedback, mock review/attempt/results and PDF import.
