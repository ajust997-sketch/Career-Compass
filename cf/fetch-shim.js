// Cloudflare's runtime rejects fetch(url, { redirect: "error" }) with
// "Invalid redirect value". worker.js uses that option for Google sign-in keys
// and Gemini/Claude calls, so we emulate it: use "manual" and fail on a redirect.
// Import this module first (before anything that calls fetch).

const nativeFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  if (init && init.redirect === "error") {
    const response = await nativeFetch(input, { ...init, redirect: "manual" });
    if (response.status >= 300 && response.status < 400) throw new TypeError("Unexpected redirect");
    return response;
  }
  return nativeFetch(input, init);
};
