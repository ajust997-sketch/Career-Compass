// "College previous papers" API. Anyone can browse papers and take them as a
// mock test; signed-in (Google) users can upload, edit (with revision history),
// edit with their own AI, and report papers. Only the uploader (or a site admin
// listed in env.PAPERS_ADMINS) can delete a paper.
//
// Storage: Workers KV namespace CC_KV
//   papers/index          JSON array of paper summaries (what the list shows)
//   papers/item/<id>      full paper: summary fields + text + answerKey + revisions
//   papers/file/<id>      optional original upload (PDF/image), raw bytes
//   papers/limits/<uid>/<yyyy-mm-dd>   per-user daily counters
//
// Routes (all JSON):
//   GET    /api/papers                  list (hidden/reported papers excluded)
//   GET    /api/papers/me               { signedIn, user, isAdmin }
//   GET    /api/papers/:id              full paper
//   GET    /api/papers/:id/file         original file download
//   POST   /api/papers                  upload (login)
//   PUT    /api/papers/:id              edit (login) - keeps last 10 revisions
//   POST   /api/papers/:id/restore      restore revision { index } (login)
//   POST   /api/papers/:id/report       report { reason } (login)
//   DELETE /api/papers/:id              delete (uploader or admin)
//   POST   /api/papers/ai               { text, instruction } -> AI-edited text (login, not saved)

import { aiRewrite } from "./ai-rewrite.js";

const LIMITS = { upload: 10, edit: 60, ai: 30, report: 20 };
const MAX_TEXT = 200000, MAX_FILE = 5 * 1024 * 1024, MAX_REVISIONS = 10, HIDE_AFTER_REPORTS = 3;
const META = { title: 160, college: 120, course: 80, branch: 80, subject: 120, year: 9, semester: 20, examType: 40 };
const EXAM_TYPES = ["Mid-semester", "End-semester", "Quiz / class test", "Practical", "Other"];

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json;charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
const clean = (v, max) => typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max) : "";
const today = () => new Date().toISOString().slice(0, 10);
const newId = () => Date.now().toString(36) + "-" + crypto.randomUUID().slice(0, 8);
const validId = (id) => /^[a-z0-9]{6,12}-[a-f0-9]{8}$/.test(id || "");

async function readJSON(kv, key, fallback = null) {
  const raw = await kv.get(key);
  return raw === null ? fallback : JSON.parse(raw);
}

// Who is calling? Reuses the site's Google session via worker.js's /api/ai/status.
async function identity(request, env, app) {
  const url = new URL(request.url);
  const probe = new Request(url.origin + "/api/ai/status", { headers: { cookie: request.headers.get("cookie") || "" } });
  try {
    const status = await (await app.fetch(probe, env, { waitUntil() {}, passThroughOnException() {} })).json();
    if (!status.user) return null;
    const admins = String(env.PAPERS_ADMINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    return { uid: status.user, isAdmin: admins.includes(status.user) };
  } catch {
    return null;
  }
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return false;
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}

async function readBody(request, max) {
  // Only JSON from this site's own scripts (a JSON content type also forces a CORS pre-check for other sites).
  if (!/^application\/json\b/i.test(request.headers.get("content-type") || "")) throw fail("Send JSON.", 415);
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > max) throw fail("This upload is too large.", 413);
  const text = await request.text();
  if (text.length > max) throw fail("This upload is too large.", 413);
  try { return JSON.parse(text); } catch { throw fail("Send valid JSON."); }
}

async function count(env, uid, kind) {
  const key = "papers/limits/" + uid + "/" + today();
  const counts = await readJSON(env.CC_KV, key, {});
  if ((counts[kind] || 0) >= LIMITS[kind]) throw fail("Daily limit reached for this action. Try again tomorrow.", 429);
  counts[kind] = (counts[kind] || 0) + 1;
  await env.CC_KV.put(key, JSON.stringify(counts), { expirationTtl: 60 * 60 * 48 });
}

function readMeta(input) {
  const meta = {};
  for (const [field, max] of Object.entries(META)) meta[field] = clean(input[field], max);
  if (!EXAM_TYPES.includes(meta.examType)) meta.examType = "Other";
  if (!meta.title || !meta.college || !meta.subject) throw fail("Title, college and subject are required.");
  return meta;
}

function readText(input) {
  const text = typeof input.text === "string" ? input.text.replace(/\r\n/g, "\n").trim() : "";
  if (text.length < 10) throw fail("Add the paper's questions before saving.");
  if (text.length > MAX_TEXT) throw fail("The paper text is too long. Split it into parts.", 413);
  return { text, answerKey: clean(input.answerKey, 4000) };
}

const summary = (p) => ({ id: p.id, title: p.title, college: p.college, course: p.course, branch: p.branch, subject: p.subject, year: p.year, semester: p.semester, examType: p.examType, questions: p.questions, hasFile: !!p.file, createdAt: p.createdAt, updatedAt: p.updatedAt, reports: (p.reports || []).length });
const publicPaper = (p, who) => ({ ...summary(p), text: p.text, answerKey: p.answerKey, file: p.file ? { name: p.file.name, type: p.file.type, size: p.file.size } : null, mine: !!who && p.owner === who.uid, canDelete: !!who && (p.owner === who.uid || who.isAdmin), reportedByMe: !!who && (p.reports || []).includes(who.uid), revisions: (p.revisions || []).map((r) => ({ at: r.at, note: r.note })) });
const countQuestions = (text) => (text.match(/^\s*(?:Q\.?\s*)?\d+\s*[.)]/gim) || []).length;

async function updateIndex(env, paper, remove = false) {
  const index = await readJSON(env.CC_KV, "papers/index", []);
  const rest = index.filter((p) => p.id !== paper.id);
  if (!remove) rest.unshift(summary(paper));
  await env.CC_KV.put("papers/index", JSON.stringify(rest.slice(0, 5000)));
}

function decodeFile(file) {
  if (!file) return null;
  const type = clean(file.type, 60), name = clean(file.name, 120) || "paper";
  if (!/^(application\/pdf|image\/(png|jpeg))$/.test(type)) throw fail("Attach a PDF, PNG or JPG file only.");
  let bytes;
  try { bytes = Uint8Array.from(atob(String(file.data || "")), (c) => c.charCodeAt(0)); } catch { throw fail("The attached file could not be read."); }
  if (!bytes.length || bytes.length > MAX_FILE) throw fail("Attach a file smaller than 5 MB.", 413);
  // The file's first bytes must match its declared type (stops renamed or disguised files).
  const starts = (...sig) => sig.every((b, i) => bytes[i] === b);
  const real = starts(0x25, 0x50, 0x44, 0x46, 0x2d) ? "application/pdf" : starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) ? "image/png" : starts(0xff, 0xd8, 0xff) ? "image/jpeg" : null;
  if (real !== type) throw fail("This file is not a real PDF, PNG or JPG.");
  return { name, type, size: bytes.length, bytes };
}

export async function handlePapers(request, env, app) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/papers")) return null;
  try {
    if (!env.CC_KV) throw fail("Paper storage is not configured.", 503);
    const parts = url.pathname.split("/").filter(Boolean).slice(2); // after "api/papers"
    const method = request.method;
    const [id, action] = parts;

    if (method === "GET" && !id) {
      const index = await readJSON(env.CC_KV, "papers/index", []);
      return json({ items: index.filter((p) => p.reports < HIDE_AFTER_REPORTS), examTypes: EXAM_TYPES });
    }
    if (method === "GET" && id === "me") {
      const who = await identity(request, env, app);
      return json({ signedIn: !!who, user: who?.uid || null, isAdmin: !!who?.isAdmin });
    }
    if (method === "GET" && validId(id) && !action) {
      const paper = await readJSON(env.CC_KV, "papers/item/" + id);
      if (!paper) throw fail("Paper not found.", 404);
      return json(publicPaper(paper, await identity(request, env, app)));
    }
    if (method === "GET" && validId(id) && action === "file") {
      const paper = await readJSON(env.CC_KV, "papers/item/" + id);
      const bytes = paper?.file ? await env.CC_KV.get("papers/file/" + id, "arrayBuffer") : null;
      if (!bytes) throw fail("Original file not found.", 404);
      const safeName = paper.file.name.replace(/[^\w.\- ]/g, "_");
      return new Response(bytes, { headers: { "content-type": paper.file.type, "content-disposition": 'inline; filename="' + safeName + '"', "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox", "cache-control": "public, max-age=3600" } });
    }

    if (!["POST", "PUT", "DELETE"].includes(method)) throw fail("Method not allowed.", 405);
    if (!sameOrigin(request)) throw fail("Use this website to change papers.", 403);
    const who = await identity(request, env, app);
    if (!who) throw fail("Sign in with Google to upload or edit papers.", 401);

    if (method === "POST" && id === "ai") {
      const input = await readBody(request, 300000);
      const instruction = clean(input.instruction, 1500);
      if (!instruction) throw fail("Tell the AI what to change.");
      const { text } = readText(input);
      await count(env, who.uid, "ai");
      return json(await aiRewrite(env, who.uid, text, instruction));
    }

    if (method === "POST" && !id) {
      const input = await readBody(request, 8 * 1024 * 1024);
      if (input.rights !== true) throw fail("Confirm that you can share this paper and it has no personal details.");
      const meta = readMeta(input), body = readText(input), file = decodeFile(input.file);
      await count(env, who.uid, "upload");
      const now = new Date().toISOString(), paperId = newId();
      const paper = { id: paperId, ...meta, ...body, questions: countQuestions(body.text), owner: who.uid, createdAt: now, updatedAt: now, reports: [], revisions: [], file: file ? { name: file.name, type: file.type, size: file.size } : null };
      if (file) await env.CC_KV.put("papers/file/" + paperId, file.bytes);
      await env.CC_KV.put("papers/item/" + paperId, JSON.stringify(paper));
      await updateIndex(env, paper);
      return json(publicPaper(paper, who), 201);
    }

    if (!validId(id)) throw fail("Paper not found.", 404);
    const paper = await readJSON(env.CC_KV, "papers/item/" + id);
    if (!paper) throw fail("Paper not found.", 404);

    if (method === "PUT" && !action) {
      const input = await readBody(request, 300000);
      const meta = readMeta({ ...paper, ...input }), body = readText(input);
      await count(env, who.uid, "edit");
      paper.revisions = [{ at: paper.updatedAt, note: clean(input.note, 200) || "Edit", text: paper.text, answerKey: paper.answerKey }, ...(paper.revisions || [])].slice(0, MAX_REVISIONS);
      Object.assign(paper, meta, body, { questions: countQuestions(body.text), updatedAt: new Date().toISOString() });
      await env.CC_KV.put("papers/item/" + id, JSON.stringify(paper));
      await updateIndex(env, paper);
      return json(publicPaper(paper, who));
    }
    if (method === "POST" && action === "restore") {
      const input = await readBody(request, 1000);
      const rev = (paper.revisions || [])[Number(input.index)];
      if (!rev) throw fail("That version was not found.", 404);
      await count(env, who.uid, "edit");
      paper.revisions = [{ at: paper.updatedAt, note: "Before restore", text: paper.text, answerKey: paper.answerKey }, ...paper.revisions].slice(0, MAX_REVISIONS);
      Object.assign(paper, { text: rev.text, answerKey: rev.answerKey, questions: countQuestions(rev.text), updatedAt: new Date().toISOString() });
      await env.CC_KV.put("papers/item/" + id, JSON.stringify(paper));
      await updateIndex(env, paper);
      return json(publicPaper(paper, who));
    }
    if (method === "POST" && action === "report") {
      if ((paper.reports || []).includes(who.uid)) return json(publicPaper(paper, who));
      await count(env, who.uid, "report");
      paper.reports = [...(paper.reports || []), who.uid];
      await env.CC_KV.put("papers/item/" + id, JSON.stringify(paper));
      await updateIndex(env, paper);
      return json(publicPaper(paper, who));
    }
    if (method === "DELETE" && !action) {
      if (paper.owner !== who.uid && !who.isAdmin) throw fail("Only the person who uploaded this paper can delete it.", 403);
      await env.CC_KV.delete("papers/item/" + id);
      if (paper.file) await env.CC_KV.delete("papers/file/" + id);
      await updateIndex(env, paper, true);
      return json({ deleted: true });
    }
    throw fail("Unknown papers request.", 404);
  } catch (e) {
    return json({ error: e.status ? e.message : "Papers are temporarily unavailable. Please try again." }, e.status || 500);
  }
}
