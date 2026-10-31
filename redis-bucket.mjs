import {randomUUID} from 'node:crypto';

// The small R2 contract used by this application, backed by durable Redis.
// Conditional writes and the listing index change in ONE atomic Lua operation.
const PUT = `
local old = redis.call('GET', KEYS[1])
if ARGV[3] == 'absent' and old then return 0 end
if ARGV[3] == 'match' then
  if not old or cjson.decode(old).etag ~= ARGV[4] then return 0 end
end
redis.call('SET', KEYS[1], ARGV[1])
redis.call('ZADD', KEYS[2], 0, ARGV[2])
return 1`;
const DELETE = `
for i = 2, #KEYS do
  redis.call('DEL', KEYS[i])
  redis.call('ZREM', KEYS[1], ARGV[i - 1])
end
return 1`;
const failure = () => Object.assign(new Error('Shared storage is temporarily unavailable. Please try again later.'), {status:503});
const validKey = key => typeof key === 'string' && key.length <= 2048 && /^[\x20-\x7e]+$/.test(key);

export function redisConfiguration(env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url && !token) return null;
  try {
    const parsed = new URL(url);
    if (!token || parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.upstash.io') || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || parsed.pathname !== '/') throw Error();
    const stage = ['production','preview','development'].includes(env.VERCEL_ENV) ? env.VERCEL_ENV : 'development';
    const prefix = env.CAREER_COMPASS_STORAGE_PREFIX || 'career-compass:' + stage;
    if (!/^[a-zA-Z0-9:_-]{1,100}$/.test(prefix)) throw Error();
    return {url:parsed.origin, token, prefix};
  } catch { throw failure(); }
}

export function createRedisBucket(configuration, {fetchImpl = globalThis.fetch} = {}) {
  if (!configuration) return undefined;
  const {url, token, prefix} = configuration;
  const base = '{' + prefix + '}:';
  const index = base + 'index';
  const storageKey = key => {
    if (!validKey(key)) throw failure();
    return base + 'object:' + key;
  };
  async function command(args) {
    try {
      const response = await fetchImpl(url, {method:'POST', redirect:'error', cache:'no-store', signal:AbortSignal.timeout(8000), headers:{authorization:'Bearer ' + token, 'content-type':'application/json'}, body:JSON.stringify(args)});
      if (!response.ok) { await response.body?.cancel(); throw failure(); }
      const payload = await response.json();
      if (!payload || payload.error || !Object.hasOwn(payload,'result')) throw failure();
      return payload.result;
    } catch { throw failure(); } // Never echo a credential, URL, or provider error.
  }
  return {
    async ping() { return await command(['PING']) === 'PONG'; },
    async get(key) {
      // GETEX is routed as a write command and avoids replica reads for sessions.
      // No expiry option is supplied, so the record and its lifetime are unchanged.
      const raw = await command(['GETEX',storageKey(key)]);
      if (raw === null) return null;
      let saved;
      try { saved = JSON.parse(raw); } catch { throw failure(); }
      if (typeof saved.body !== 'string' || typeof saved.etag !== 'string') throw failure();
      const bytes = Buffer.from(saved.body,'base64');
      return {etag:saved.etag, body:bytes, httpMetadata:saved.httpMetadata, customMetadata:saved.customMetadata, text:async()=>bytes.toString('utf8'), json:async()=>JSON.parse(bytes.toString('utf8'))};
    },
    async put(key, value, options = {}) {
      const objectKey = storageKey(key);
      const bytes = typeof value === 'string' ? Buffer.from(value,'utf8') : value instanceof ArrayBuffer ? Buffer.from(value) : ArrayBuffer.isView(value) ? Buffer.from(value.buffer,value.byteOffset,value.byteLength) : null;
      if (!bytes || bytes.length > 2 * 1024 * 1024) throw failure();
      const condition = options.onlyIf;
      let mode = 'any', expected = '';
      if (condition instanceof Headers) {
        if (condition.get('if-none-match') === '*') mode = 'absent';
        else if (condition.has('if-match')) { mode = 'match'; expected = condition.get('if-match'); }
        else throw failure();
      } else if (condition) {
        if (typeof condition.etagMatches === 'string') { mode = 'match'; expected = condition.etagMatches; }
        else if (condition.etagDoesNotMatch === '*') mode = 'absent';
        else throw failure();
      }
      const etag = randomUUID();
      const saved = JSON.stringify({body:bytes.toString('base64'), etag, httpMetadata:options.httpMetadata, customMetadata:options.customMetadata});
      const result = await command(['EVAL',PUT,2,objectKey,index,saved,key,mode,expected]);
      if (result === 0) return null;
      if (result !== 1) throw failure();
      return {etag};
    },
    async delete(input) {
      const keys = Array.isArray(input) ? input : [input];
      if (!keys.length) return;
      if (keys.length > 1000) throw failure();
      await command(['EVAL',DELETE,keys.length + 1,index,...keys.map(storageKey),...keys]);
    },
    async list({prefix:match = '', limit = 1000, cursor} = {}) {
      if ((match && !validKey(match)) || !Number.isInteger(limit) || limit < 1 || limit > 1000) throw failure();
      let last;
      if (cursor) {
        try {
          if (typeof cursor !== 'string' || cursor.length > 6000) throw Error();
          const decoded = JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'));
          if (decoded.prefix !== match || !validKey(decoded.last) || !decoded.last.startsWith(match)) throw Error();
          last = decoded.last;
        } catch { throw Object.assign(new Error('Invalid page cursor.'),{status:400}); }
      }
      const keys = await command(['ZRANGEBYLEX',index,last ? '(' + last : match ? '[' + match : '-', match ? '[' + match + '\x7f' : '+','LIMIT',0,limit + 1]);
      if (!Array.isArray(keys) || keys.some(key=>!validKey(key) || !key.startsWith(match))) throw failure();
      const truncated = keys.length > limit;
      const selected = keys.slice(0,limit);
      return {objects:selected.map(key=>({key})), truncated, cursor:truncated ? Buffer.from(JSON.stringify({prefix:match,last:selected.at(-1)})).toString('base64url') : undefined};
    }
  };
}
