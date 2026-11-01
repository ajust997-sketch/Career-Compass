// Cloudflare Pages entry: runs worker.js with free Workers KV storage
// (binding CC_KV) in place of the R2 bucket it was written for.
// AI report history is kept only on the learner's device (localStorage):
// a finished report is copied to the device and then deleted from the server.
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

// Runs in the browser before the app. Wraps fetch for /api/ai/jobs only.
const DEVICE_HISTORY = `(()=>{
const F=window.fetch.bind(window);let uid=null;
const K=()=>'cc-ai-history:'+uid;
const load=()=>{try{return JSON.parse(localStorage.getItem(K())||'[]')}catch(e){return[]}};
const save=a=>{try{localStorage.setItem(K(),JSON.stringify(a))}catch(e){console.warn('Could not save AI history on this device',e)}};
const J=d=>new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}});
const del=id=>F('/api/ai/jobs/'+encodeURIComponent(id),{method:'DELETE',credentials:'same-origin',headers:{'content-type':'application/json'},body:'{}'}).catch(()=>{});
const keep=job=>{if(job&&job.status==='completed'&&job.output!==undefined){save([...load().filter(j=>j.id!==job.id),job]);del(job.id);return true}return false};
async function who(){if(!uid){try{const d=await (await F('/api/ai/status',{credentials:'same-origin'})).json();uid=d.user||null}catch(e){}}return uid}
window.fetch=async function(input,init){
 let u;try{u=new URL(typeof input==='string'?input:input.url,location.href)}catch(e){return F(input,init)}
 const method=String((init&&init.method)||(typeof input!=='string'&&input.method)||'GET').toUpperCase();
 if(u.origin!==location.origin||!u.pathname.startsWith('/api/ai/'))return F(input,init);
 if(u.pathname==='/api/ai/status'){const r=await F(input,init);try{uid=(await r.clone().json()).user||null}catch(e){}return r}
 if(u.pathname==='/api/ai/jobs'&&method==='GET'){
  if(!await who())return F(input,init);
  const r=await F('/api/ai/jobs',{credentials:'same-origin'});if(!r.ok)return r;
  const server=[];
  for(const j of (await r.json()).items||[]){
   if(j.status==='completed'){const f=await F('/api/ai/jobs/'+encodeURIComponent(j.id),{credentials:'same-origin'});if(f.ok&&keep(await f.json()))continue}
   server.push(j)}
  const local=load().map(j=>{const c={...j};delete c.output;return c});
  const items=[...server.filter(j=>!local.some(l=>l.id===j.id)),...local].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  return J({items,cursor:null})}
 const m=u.pathname.match(/^\\/api\\/ai\\/jobs\\/([^/]+)$/);
 if(m&&await who()){
  const id=decodeURIComponent(m[1]);
  if(method==='GET'){const hit=load().find(j=>j.id===id);if(hit)return J(hit);
   const r=await F(input,init);if(!r.ok)return r;const job=await r.json();keep(job);return J(job)}
  if(method==='DELETE'){const had=load().some(j=>j.id===id);save(load().filter(j=>j.id!==id));const r=await F(input,init);return r.ok||!had?r:J({deleted:true})}
 }
 return F(input,init)};
})();`;

async function withDeviceHistory(response) {
  if (!(response.headers.get("content-type") || "").includes("text/html")) return response;
  const tag = "<script>" + DEVICE_HISTORY + "</script>";
  if (typeof HTMLRewriter !== "undefined") return new HTMLRewriter().on("head", { element(e) { e.prepend(tag, { html: true }); } }).transform(response);
  const html = (await response.text()).replace("<head>", "<head>" + tag);
  return new Response(html, { status: response.status, headers: response.headers });
}

export async function onRequest(context) {
  const env = { ...context.env, BUCKET: context.env.CC_KV ? kvBucket(context.env.CC_KV) : undefined };
  const ctx = { waitUntil: (p) => context.waitUntil(p), passThroughOnException() {} };
  const response = await app.fetch(context.request, env, ctx);
  const path = new URL(context.request.url).pathname;
  return context.request.method === "GET" && (path === "/" || path === "/index.html") ? withDeviceHistory(response) : response;
}
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
