import worker from '../generated/vercel-worker.mjs';
import {createRedisBucket, redisConfiguration} from './redis-bucket.mjs';
import {timingSafeEqual} from 'node:crypto';

const reply = (body,status=200) => Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});

export function createHandler({environment=()=>process.env, defer, clientIP=()=>undefined, bucketFactory=createRedisBucket, application=worker}={}) {
  return async function handle(request) {
    try {
      const settings = environment();
      const url = new URL(request.url);
      // Rewrites pass the original route explicitly; keep ordinary query values.
      const routed = url.searchParams.get('__cc_route');
      url.searchParams.delete('__cc_route');
      if (routed !== null) {
        if (!/^(?:(?:api|auth\/google)(?:\/[a-zA-Z0-9_.:-]+)*|privacy|mcp)$/.test(routed) || routed.split('/').includes('..')) return reply({error:'Not found'},404);
        url.pathname = '/' + routed;
      }
      const headers = new Headers(request.headers);
      for (const key of [...headers.keys()]) if (key.startsWith('oai-') || key === 'cf-connecting-ip') headers.delete(key);
      const ip = clientIP(request);
      if (ip) headers.set('cf-connecting-ip',ip);
      const clean = new Request(url, {method:request.method, headers, ...(!['GET','HEAD'].includes(request.method)?{body:request.body,duplex:'half'}:{})});
      let storage, storageState = 'not-configured';
      try { const config = redisConfiguration(settings); storage = bucketFactory(config); if (storage) storageState = 'configured'; }
      catch { storageState = 'configuration-error'; }
      const env = {BUCKET:storage, GOOGLE_OAUTH_CLIENT_ID:settings.GOOGLE_OAUTH_CLIENT_ID, AI_KEYS_ENCRYPTION_KEY:settings.AI_KEYS_ENCRYPTION_KEY};
      const ctx = {waitUntil(promise) { if (typeof defer !== 'function') throw Error('Background execution unavailable'); defer(Promise.resolve(promise).catch(()=>{})); }};
      if (url.pathname === '/api/health') {
        if (request.method !== 'GET') return reply({error:'Use GET'},405);
        let connected = false;
        if (storage) { try { connected = await storage.ping(); } catch { storageState = 'unavailable'; } }
        return reply({ok:storageState !== 'configuration-error' && storageState !== 'unavailable', platform:'vercel', version:'6.3.0', persistentStorage:connected, storage:storageState, googleConfigured:/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(settings.GOOGLE_OAUTH_CLIENT_ID||''), aiEncryptionConfigured:/^[a-f0-9]{64}$/i.test(settings.AI_KEYS_ENCRYPTION_KEY||'')},['configuration-error','unavailable'].includes(storageState)?503:200);
      }
      // Optional authenticated refresh for a separately configured Vercel Cron.
      // Never accept the old Sites owner headers or a public refresh request.
      if (url.pathname === '/api/cron/refresh') {
        if (request.method !== 'GET') return reply({error:'Use GET'},405);
        const expected = settings.CRON_SECRET ? Buffer.from('Bearer '+settings.CRON_SECRET) : null;
        const actual = Buffer.from(headers.get('authorization')||'');
        if (!expected || settings.CRON_SECRET.length < 32 || actual.length !== expected.length || !timingSafeEqual(actual,expected)) return reply({error:'Unauthorized'},401);
        if (!storage) return reply({error:'Shared storage is not configured.'},503);
        const pending=[];
        await application.scheduled({},env,{waitUntil:promise=>pending.push(promise)});
        await Promise.all(pending);
        return reply({ok:true});
      }
      const response = await application.fetch(clean,env,ctx);
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) response.headers.set('cache-control','no-store');
      return response;
    } catch {
      return reply({error:'This feature is temporarily unavailable. Your local study tools are still available.'},503);
    }
  };
}
