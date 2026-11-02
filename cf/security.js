// Security headers and the Content-Security-Policy for the main page.
// Used by functions/[[path]].js on every response.
//
// The CSP allows only:
//   - the site itself,
//   - the exact inline scripts that ship with the page (by SHA-256 hash, worked out once per isolate),
//   - the few outside services the page really uses (PDF/OCR libraries, Google Fonts, Google Translate,
//     Unsplash photos, YouTube embeds).
// Any other script — for example one injected through a bug — is blocked by the browser.
// If you add a new outside service, add its domain to the matching list below.

const SOURCES = {
  script: [
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/",
    "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/",
    "https://cdn.jsdelivr.net/npm/tesseract.js@v5.1.1/",
    "https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.1.1/",
    "https://translate.google.com/translate_a/",
    "https://translate.googleapis.com",
    "https://translate-pa.googleapis.com",
    "https://www.gstatic.com",
  ],
  style: ["https://fonts.googleapis.com", "https://www.gstatic.com", "https://translate.googleapis.com"],
  font: ["https://fonts.gstatic.com"],
  img: ["https://images.unsplash.com", "https://*.googleusercontent.com", "https://www.gstatic.com", "https://translate.google.com", "https://translate.googleapis.com", "https://fonts.gstatic.com"],
  connect: ["https://cdn.jsdelivr.net", "https://tessdata.projectnaptha.com", "https://translate.googleapis.com", "https://translate-pa.googleapis.com"],
  frame: ["https://www.youtube-nocookie.com", "https://translate.google.com"],
};

export const BASE_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-frame-options": "SAMEORIGIN",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), interest-cohort=()",
  "cross-origin-opener-policy": "same-origin-allow-popups",
};

async function sha256(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  let bin = "";
  for (const b of new Uint8Array(digest)) bin += String.fromCharCode(b);
  return "'sha256-" + btoa(bin) + "'";
}

// Hashes of every inline <script> (no src) in the page, exactly as the browser will see them.
export async function inlineScriptHashes(html) {
  const hashes = [];
  for (const m of html.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)) hashes.push(await sha256(m[1]));
  return [...new Set(hashes)];
}

export async function pageCSP(html) {
  const hashes = await inlineScriptHashes(html);
  return [
    "default-src 'self'",
    "script-src 'self' " + hashes.join(" ") + " 'wasm-unsafe-eval' " + SOURCES.script.join(" "),
    "style-src 'self' 'unsafe-inline' " + SOURCES.style.join(" "),
    "font-src 'self' data: " + SOURCES.font.join(" "),
    "img-src 'self' data: blob: " + SOURCES.img.join(" "),
    "media-src 'self' blob:",
    "connect-src 'self' blob: data: " + SOURCES.connect.join(" "),
    "worker-src 'self' blob:",
    "frame-src " + SOURCES.frame.join(" "),
    "child-src 'self' blob: " + SOURCES.frame.join(" "),
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

// Adds the base headers to any response, keeping headers the app already set.
export function withSecurityHeaders(response, extra = {}) {
  const res = new Response(response.body, response);
  for (const [k, v] of Object.entries({ ...BASE_HEADERS, ...extra })) if (!res.headers.has(k)) res.headers.set(k, v);
  return res;
}

// Rejects state-changing /api requests that come from another website (defence in depth;
// each API also checks this itself).
export function crossSiteWrite(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return false;
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return false;
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return true;
  const site = request.headers.get("sec-fetch-site");
  return !!site && site !== "same-origin" && site !== "none";
}
