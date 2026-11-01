// Cloudflare Pages entry: runs worker.js with free Workers KV storage
// (binding CC_KV) in place of the R2 bucket it was written for.
import app from "../worker.js";

const enc = new TextEncoder();
const toB64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode(...u8.subarray(i, i + 32768)); return btoa(s); };
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toBytes = (v) => typeof v === "string" ? enc.encode(v) : v instanceof ArrayBuffer ? new Uint8Array(v) : ArrayBuffer.isView(v) ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength) : null;

function kvBucket(kv) {
  const read = async (key) => { const raw = await kv.get(key); return raw === null ? null : JSON.parse(raw); };
  return {
    async get(key) {
      const saved = await read(key);
      if (!saved) return null;
      const bytes = fromB64(saved.b);
      return { key, etag: saved.e, httpEtag: '"' + saved.e + '"', size: bytes.length, httpMetadata: saved.h || {}, customMetadata: saved.c || {}, body: new Blob([bytes]).stream(),
        arrayBuffer: async () => bytes.slice().buffer, text: async () => new TextDecoder().decode(bytes), json: async () => JSON.parse(new TextDecoder().decode(bytes)) };
    },
    async put(key, value, options = {}) {
      const bytes = toBytes(value);
      if (!bytes) throw new Error("Unsupported value");
      const cond = options.onlyIf;
      if (cond) {
        let mode = "", expected = "";
        if (cond instanceof Headers) {
          if (cond.get("if-none-match") === "*") mode = "absent";
          else if (cond.has("if-match")) { mode = "match"; expected = cond.get("if-match").replace(/"/g, ""); }
        } else if (typeof cond.etagMatches === "string") { mode = "match"; expected = cond.etagMatches.replace(/"/g, ""); }
        else if (cond.etagDoesNotMatch === "*") mode = "absent";
        const old = await read(key);
        if (mode === "absent" && old) return null;
        if (mode === "match" && (!old || old.e !== expected)) return null;
      }
      const etag = crypto.randomUUID().replace(/-/g, "");
      await kv.put(key, JSON.stringify({ b: toB64(bytes), e: etag, h: options.httpMetadata, c: options.customMetadata }));
      return { key, etag, httpEtag: '"' + etag + '"', size: bytes.length };
    },
    async delete(input) {
      for (const key of Array.isArray(input) ? input : [input]) await kv.delete(key);
    },
    async list({ prefix = "", limit = 1000, cursor } = {}) {
      const page = await kv.list({ prefix, limit: Math.min(limit, 1000), ...(cursor ? { cursor } : {}) });
      return { objects: page.keys.map((k) => ({ key: k.name })), truncated: !page.list_complete, cursor: page.list_complete ? undefined : page.cursor, delimitedPrefixes: [] };
    },
  };
}

export async function onRequest(context) {
  const env = { ...context.env, BUCKET: context.env.CC_KV ? kvBucket(context.env.CC_KV) : undefined };
  const ctx = { waitUntil: (p) => context.waitUntil(p), passThroughOnException() {} };
  return app.fetch(context.request, env, ctx);
}
