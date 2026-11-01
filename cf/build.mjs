// Builds the main app for Cloudflare Pages from the source files in the repo root.
// Cloudflare runs this on every deploy (build command: npm ci && node cf/build.mjs).
//
// Output:
//   worker.js              the app server + full HTML (imported by functions/[[path]].js)
//   index.html             static copy of the page
//   career-compass.html    downloadable copy of the page
//
// To add a new front-end module: create name.js / name.css in the repo root and
// add it to CLIENT_JS / CLIENT_CSS below. Order matters: later files can use
// everything defined by earlier ones (they all share one scope inside app.js).
// Run locally:  npm ci && node cf/build.mjs

import { readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const CLIENT_JS = ["experience.js", "paper-core.js", "next.js", "practice.js", "personal-ai.js", "discovery.js", "papers.js", "photos.js", "layout.js"];
const CLIENT_CSS = ["app.css", "experience.css", "next.css", "personal-ai.css", "discovery.css", "papers.css", "photos.css", "layout.css"];
const DATA = ["data.json", "lectures.json", "cutoffs.json", "new-data.json", "paid-courses.json"];
const SERVER = ["paper-core.js", "community-server.js", "google-auth.js", "ai-server.js", "server.js"];

const read = (f) => readFile(f, "utf8");
const join = async (files) => (await Promise.all(files.map(read))).join("\n");

const html = await read("app.html");
const experience = await join(CLIENT_JS);
const css = await join(CLIENT_CSS);
const js = (await read("app.js")).replace("/*EXPERIENCE*/", () => experience);
const data = {};
for (const f of DATA) Object.assign(data, JSON.parse(await read(f)));

const goals = Object.fromEntries([...data.programs.map((x) => ["course:" + x.id, x.name]), ...data.careers.map((x) => ["career:" + x.id, x.name]), ...data.exams.map((x) => ["exam:" + x.id, x.name])]);
const page = html
  .replace("/*APP_CSS*/", () => css)
  .replace("/*APP_DATA*/", () => JSON.stringify(data).replace(/</g, "\\u003c"))
  .replace("/*APP_JS*/", () => ("const NATIVE_SIGNIN_AVAILABLE=false;\n" + js).replace(/<\/script/gi, "<\\/script"));

let server = "const GOAL_CATALOG=" + JSON.stringify(goals) + ";\nconst AI_GUIDANCE=" + JSON.stringify(data.guidance) + ";\n" + (await join(SERVER));
// This deployment has no ChatGPT Sites identity and no Sites owner account.
server = server
  .replace("function sitesMemberHeader(request){return request.headers.get('oai-authenticated-user-id')}", "function sitesMemberHeader(request){return null}")
  .replace("const isOwner=(request,env)=>Boolean(env.OWNER_EMAIL&&request.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.OWNER_EMAIL.toLowerCase());", "const isOwner=()=>false;");

const bundled = await build({
  stdin: { contents: "const NATIVE_SIGNIN_AVAILABLE=false;\nconst HTML=" + JSON.stringify(page) + ";\n" + server, resolveDir: process.cwd(), sourcefile: "career-compass.js" },
  bundle: true, write: false, format: "esm", platform: "browser", target: "es2022", legalComments: "inline",
});

await writeFile("worker.js", bundled.outputFiles[0].text);
await writeFile("index.html", page);
await writeFile("career-compass.html", page);
console.log("Built Career Compass: worker.js (" + Math.round(bundled.outputFiles[0].text.length / 1024) + " KB), page " + Math.round(page.length / 1024) + " KB");
