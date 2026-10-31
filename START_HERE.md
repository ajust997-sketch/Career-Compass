# Career Compass 6.3 — Simple menu, paid courses & theme characters

## Is ZIP mein kya naya hai?

- **Career Overview** ke andar Government sector, Private sector aur Exams &
  Pathways hain. All career paths, Find my direction aur Previous cutoffs bhi
  yahin milenge. Left menu mein inki duplicate entries hata di gayi hain.
- Reading text, buttons aur menu ka font thoda bada hai. Baaki tools grouped
  sections kholne par milte hain; Connect AI hamesha visible hai.
- **UG course hub → Courses & instructors**, ya **Learning library → Paid
  courses & instructors**: Python, web development, ML aur Figma ke four
  curated paid options. Direct route: `/#paid-courses`.
- Har recommendation mein prerequisites, course link, instructor LinkedIn,
  short career summary, teaching experience/milestone aur source links hain.
  Unverified start year ko guess nahi kiya gaya hai. Prices provider page par
  check karo; paid options optional hain.
- **Themes → Minecraft inspired / Among Us inspired** mein embedded block
  characters / crewmates hain. Calm colours bhi available hai.

## Aapki Cloudflare Workers site update karna

ZIP extract karke **Career-Compass** folder ki files existing GitHub repository
ke same project folder mein replace/commit karo. Cloudflare build root us folder
par set ho, Build command `npm run build` aur Deploy command
`npx wrangler deploy --config portable/wrangler.jsonc --keep-vars` ho.
Build ko latest commit se run karo. Sirf ZIP upload karne se code deploy nahi hota.

Apna existing R2 bucket/binding, Google client ID aur encryption secret retain
karo. **Encryption key rotate mat karo**: saved AI keys usi se decrypt hoti hain.
Cloudflare ke full notes **portable/README.md** mein hain. Vercel ke liye neeche
ke steps use karo. `/#overview`, `/#paid-courses` aur `/#ai` check karo.

## Vercel support

Screenshot mein `500 FUNCTION_INVOCATION_FAILED` tha. Original ZIP ka server
Cloudflare Workers ke liye tha; Vercel ko alag entry, settings aur storage chahiye.
Is package mein Vercel support add hai. Exact original crash log abhi available
nahi hai; fix local build, tests aur browser preview mein check hua hai.

## AI connect option kahan hai?

- Har page ki top bar aur menu ke upar **Connect AI** button hai.
- Direct link: apni live site ke address ke aage `/#ai` lagao.
- **Connect Gemini** aur **Connect Claude** cards login se pehle bhi dikhte hain.
- Provider choose karo → Google se study account login karo → apni API key
  verify karo → model aur automatic mock summary / mistake analysis select karo.
- Agar **Connection setup pending** aaye, isi page ka setup status aur
  **Own this site? View setup steps** kholo. Neeche wali four environment
  values complete karne ke baad Vercel redeploy chahiye.
- Google login se Gemini model automatically connect nahi hota. Gemini/Claude
  ki chat subscription bhi API key ka replacement nahi hai.

Agar top bar mein Connect AI hi nahi hai, purana deployment serve ho raha hai.
Naye files ko existing repository mein commit/push karo aur linked Vercel
project redeploy karo. `/api/health` mein `version: "6.3.0"` check karo.

## Pehle website chalao

1. ZIP extract karo. **Career-Compass** folder ke andar `package.json`,
   `vercel.json`, `api`, `platform` aur `src` milenge.
2. Apne Vercel-connected GitHub/repository mein ye project files replace karo.
   Sirf `worker/index.js` ya ZIP file ko function ke roop mein deploy mat karo.
   Agar folder repository ke andar `Career-Compass` naam se rakha hai, Vercel ka
   **Root Directory = Career-Compass** rakho. Agar files seedhe root par hain,
   Root Directory default rakho.
3. Vercel project → Settings → Build and Deployment:

   | Setting | Value |
   | --- | --- |
   | Framework Preset | Other |
   | Build Command | `npm run build` |
   | Output Directory | `public` |
   | Install Command | `npm ci` |
   | Node.js | `24.x` |

4. Save karke **Redeploy** karo. Purane build cache ko is first redeploy mein
   reuse mat karo. Purane custom `server.js`/`api/index.js` wrappers ko naye ZIP
   ke root par mix mat karo; ye package `api/app.js` use karta hai.
5. Homepage, courses, planner aur mock practice bina API key ke khulne chahiye.
   Apne domain par `/api/health` kholo: `platform: "vercel"` aana chahiye.

## Google login aur Gemini summary bhi chahiye

Ye features code mein hain; inke liye apne Vercel project mein 4 values chahiye:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `GOOGLE_OAUTH_CLIENT_ID`
- `AI_KEYS_ENCRYPTION_KEY`

Upstash ko Vercel project se connect karne aur Google origin add karne ke exact
steps **VERCEL_SETUP.md** mein hain. Bina setup ke Google button "setup pending"
dikhayega. Iska matlab homepage broken nahi hai.

Gemini key har learner sign-in ke baad **Connect AI** form mein dalega.
Google login aur Gemini API connection do alag steps hain. Secret keys ko chat
ya GitHub mein paste mat karo; Vercel Environment Variables mein hi rakho.

## Ab bhi error aaye

- Deployment → Runtime Logs mein failed `/api/app` request ka error dekho.
- `Cannot find module ...generated/vercel-worker.mjs` → build command/root check.
- `public` missing → root/build command check, phir fresh redeploy.
- Homepage par purana function error → old catch-all routing, old root ya old
  deployment serve ho raha ho sakta hai; `vercel.json` aur settings check karo.
- Health mein storage unavailable → Upstash values/access check; homepage phir
  bhi available rehna chahiye.

Live Vercel URL aur redacted error log dene par exact deployed issue check kiya
ja sakta hai. Password, token ya API key log ke saath share mat karo.
