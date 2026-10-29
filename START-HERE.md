# Career Compass ko Gemini se edit karein

Yeh full source-code package hai, automatic live-site connection nahi.

## 1. Download aur unzip
ZIP ko apne computer par extract karein. Uske Career-Compass folder mein terminal open karein.
Node.js 20+ aur Gemini CLI ke supported operating system ki zaroorat hai.
Official installation: https://geminicli.com/docs/get-started/installation/

## 2. Gemini CLI shuru karein
Terminal mein:

    npx @google/gemini-cli

Google ka package download hoga. Apne account ka login Gemini ke official flow mein complete karein. Password ya login token chat/code mein paste na karein.

## 3. Gemini ko yeh prompt dein

    Read GEMINI.md and inspect the source. Update Career Compass according to my next request. Preserve the existing features. Run the relevant checks and show the local preview. Do not claim the live site was updated without a verified deployment.

Ab apna change Hinglish mein bata sakte hain, jaise:

    Student benefits cards ko mobile par aur readable banao. Existing interview section as it is rakho.

## 4. Preview aur checks
Application dependencies install karne ki zaroorat nahi. Commands:

    node scripts/assemble.mjs
    node scripts/check.mjs
    node scripts/check-lab.mjs
    node scripts/dev.mjs

Preview: http://localhost:3000/
Local community storage temporary hai. Real ChatGPT sign-in local preview mein available nahi.

## 5. Same live website par publish
Gemini ki changes local files mein hongi. Automatic publication configured nahi hai.
Updated project ko ZIP karke original ChatGPT Career Compass chat mein attach karein aur likhein:

    Gemini ke changes review karke meri existing Career Compass site par publish karo. Existing URL aur audience same rakho.

Current live URL: https://best-career-compass.nik921463.chatgpt.site/

## Optional existing MCP tools
Existing endpoint: https://best-career-compass.nik921463.chatgpt.site/mcp
It only exposes opportunity status and owner-authorized opportunity refresh. It does not edit source or deploy the website.
Gemini-CLI-MCP-example.json shows the documented configuration format, not a verified Gemini connection. Remote authentication has not been completed. A non-authenticated external connection check was blocked with HTTP 403; ChatGPT's own plugin connection works. Do not bypass that protection or copy private Sites credentials.
Official MCP setup: https://geminicli.com/docs/tools/mcp-server/

For Gemini's normal web/mobile app, Google's current documentation limits custom MCP apps to eligible personal accounts in the US, age 18+, with Keep Activity enabled, in English. Availability can change:
https://support.google.com/gemini/answer/17209137?hl=en-JS

## Contents and exclusions
Includes published version 4 source (56802417f82dc52064dccab5b8727e989efadea1), GEMINI.md and this guide. No Git credentials, production secrets, learner records or uploaded user files are included. Source export prepared on 2026-10-28.
