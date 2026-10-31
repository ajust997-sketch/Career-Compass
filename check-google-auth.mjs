import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import vm from 'node:vm';
const source=await readFile('worker/index.js','utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const memory=new Map();let serial=0;
const bucket={
 async get(key){const v=memory.get(key);return v?{etag:v.etag,json:async()=>JSON.parse(v.value)}:null},
 async put(key,value,options={}){const old=memory.get(key),cond=options.onlyIf;if(cond instanceof Headers&&cond.get('If-None-Match')==='*'&&old)return null;if(cond?.etagMatches&&old?.etag!==cond.etagMatches)return null;const saved={value,etag:String(++serial)};memory.set(key,saved);return {etag:saved.etag}},
 async delete(key){memory.delete(key)},
 async list({prefix='',limit=1000}={}){return {objects:[...memory.keys()].filter(k=>k.startsWith(prefix)).sort().slice(0,limit).map(key=>({key})),truncated:false}}
};
const clientId='123456789-test.apps.googleusercontent.com';
const env={BUCKET:bucket,GOOGLE_OAUTH_CLIENT_ID:clientId,AI_KEYS_ENCRYPTION_KEY:'b'.repeat(64),OWNER_EMAIL:'owner@example.com'};
const {publicKey,privateKey}=await generateKeyPair('RS256');
const jwk={...await exportJWK(publicKey),kid:'test-google-key',alg:'RS256',use:'sig'};
const originalFetch=globalThis.fetch;let certRequests=0;
globalThis.fetch=async(url,options)=>{assert.equal(options.redirect,'error');if(String(url)==='https://www.googleapis.com/oauth2/v3/certs'){certRequests++;return Response.json({keys:[jwk]})}if(String(url).startsWith('https://generativelanguage.googleapis.com/v1beta/models?'))return Response.json({models:[{name:'models/gemini-test-flash',supportedGenerationMethods:['generateContent']}]});throw Error('Unexpected network request')};
async function call(path,{body,cookie,headers={},settings=env,handler=worker}={}){return handler.fetch(new Request('https://example.com'+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'content-type':'application/json',origin:'https://example.com'}),...(cookie?{cookie}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})}),settings,{waitUntil:p=>p})}
const cookieNamed=(response,name)=>response.headers.getSetCookie().find(c=>c.startsWith(name+'='))?.split(';')[0];
async function begin(returnTo='/#ai'){const r=await call('/auth/google?return_to='+encodeURIComponent(returnTo));assert.equal(r.status,200);const html=await r.text(),config=JSON.parse(html.match(/const config=(\{[^;]+\});let started/)[1]);for(const m of html.matchAll(/<script nonce="[^"]+">([\s\S]*?)<\/script>/g))new vm.Script(m[1]);assert(html.includes('accounts.google.com/gsi/client'));assert(r.headers.get('content-security-policy').includes("frame-ancestors 'self'"));return {cookie:cookieNamed(r,'__Host-cc_google_challenge'),nonce:config.nonce}}
async function credential(nonce,overrides={},signingKey=privateKey){const now=Math.floor(Date.now()/1000);return new SignJWT({iss:'https://accounts.google.com',aud:clientId,sub:'google-alice',iat:now,exp:now+3600,nonce,email:'owner@example.com',name:'Private Google Name',...overrides}).setProtectedHeader({alg:'RS256',kid:'test-google-key'}).sign(signingKey)}
async function login(sub='google-alice'){const b=await begin(),r=await call('/auth/google/verify',{cookie:b.cookie,body:{credential:await credential(b.nonce,{sub})}});assert.equal(r.status,200);return cookieNamed(r,'__Host-cc_google_session')}
try{
 let r=await call('/api/ai/status',{settings:{...env,GOOGLE_OAUTH_CLIENT_ID:''}});assert.equal((await r.json()).googleSignInAvailable,false);
 r=await call('/auth/google',{settings:{...env,GOOGLE_OAUTH_CLIENT_ID:''}});assert.equal(r.status,503);assert((await r.text()).includes('not active yet'));assert.equal(certRequests,0);
 const b=await begin('https://evil.example/steal');const jwt=await credential(b.nonce);
 assert.equal((await call('/auth/google/verify',{cookie:b.cookie,body:{credential:jwt},headers:{origin:'https://evil.example'}})).status,403);
 assert.equal((await call('/auth/google/verify',{cookie:b.cookie,body:{credential:jwt},headers:{origin:''}})).status,403);
 assert.equal((await call('/auth/google/verify',{body:{credential:jwt}})).status,401);
 r=await call('/auth/google/verify',{cookie:b.cookie,body:{credential:jwt}});assert.equal(r.status,200);assert.equal((await r.json()).returnTo,'/#ai');
 const alice=cookieNamed(r,'__Host-cc_google_session');assert(alice);assert(r.headers.getSetCookie().every(c=>c.includes('Secure')&&c.includes('HttpOnly')&&c.includes('Path=/')&&c.includes('SameSite=Lax')&&!c.includes('Domain=')));
 assert.equal((await call('/auth/google/verify',{cookie:b.cookie,body:{credential:jwt}})).status,401,'A used challenge cannot be replayed');
 let status=await (await call('/api/ai/status',{cookie:alice})).json();assert(status.signedIn);assert.equal(status.loginProvider,'google');const aliceId=status.user;
 const community=await (await call('/api/community/me',{cookie:alice})).json();assert.equal(community.id,aliceId);assert.equal(community.isOwner,false,'Google email matching the owner must not grant owner privileges');
 assert.equal((await call('/api/community/reports',{cookie:alice})).status,403);
 assert.equal((await call('/api/community/profile',{cookie:alice,body:{name:'Google learner',shareProgress:false}})).status,200);
 assert.equal((await call('/api/ai/connect',{cookie:alice,body:{provider:'gemini',key:'test-gemini-key-only-for-tests',consent:true}})).status,200);
 assert.equal((await (await call('/api/ai/status',{cookie:alice})).json()).connections.length,1);
 const native=await (await call('/api/ai/status',{headers:{'oai-authenticated-user-id':'google-alice','oai-authenticated-user-email':'owner@example.com'}})).json();assert.notEqual(native.user,aliceId);assert.equal(native.connections.length,0,'Same email never links accounts');
 const both=await (await call('/api/ai/status',{cookie:alice,headers:{'oai-authenticated-user-id':'native-alice'}})).json();assert.equal(both.user,aliceId,'An explicit Google session is the active learner identity');
 const bob=await login('google-bob');const bobStatus=await (await call('/api/ai/status',{cookie:bob})).json();assert.notEqual(bobStatus.user,aliceId);assert.equal(bobStatus.connections.length,0);
 const saved=JSON.stringify([...memory.values()]);assert(!saved.includes('Private Google Name'));assert(!saved.includes('owner@example.com'));assert(!saved.includes(jwt));assert(!saved.includes(alice.split('=')[1]));
 // A valid signature alone is insufficient: issuer, audience, time and nonce matter.
 for(const overrides of [{aud:'other.apps.googleusercontent.com'},{iss:'https://attacker.example'},{exp:1},{iat:Math.floor(Date.now()/1000)-1800},{nonce:'wrong-nonce'},{azp:'another-client'}]){const c=await begin();assert.equal((await call('/auth/google/verify',{cookie:c.cookie,body:{credential:await credential(c.nonce,overrides)}})).status,401)}
 const badKey=await generateKeyPair('RS256'),bad=await begin();assert.equal((await call('/auth/google/verify',{cookie:bad.cookie,body:{credential:await credential(bad.nonce,{},badKey.privateKey)}})).status,401);
 const exp=await begin();const expKey=[...memory.keys()].find(k=>k.startsWith('auth/google/challenges/')&&JSON.parse(memory.get(k).value).nonce===exp.nonce);memory.get(expKey).value=JSON.stringify({...JSON.parse(memory.get(expKey).value),expiresAt:0});assert.equal((await call('/auth/google/verify',{cookie:exp.cookie,body:{credential:await credential(exp.nonce)}})).status,401);
 const race=await begin(),raceToken=await credential(race.nonce,{sub:'concurrent'}),raceResults=await Promise.all([call('/auth/google/verify',{cookie:race.cookie,body:{credential:raceToken}}),call('/auth/google/verify',{cookie:race.cookie,body:{credential:raceToken}})]);assert.equal(raceResults.filter(x=>x.status===200).length,1,'A challenge can create only one session');
 assert.equal((await call('/auth/google/signout',{cookie:alice,body:{},headers:{origin:'https://evil.example'}})).status,403);
 r=await call('/auth/google/signout',{cookie:alice,body:{}});assert.equal(r.status,200);assert(r.headers.get('set-cookie').includes('Max-Age=0'));assert.equal((await (await call('/api/ai/status',{cookie:alice})).json()).signedIn,false);
 assert.equal((await (await call('/api/ai/status',{cookie:bob,settings:{...env,GOOGLE_OAUTH_CLIENT_ID:'987654321-new.apps.googleusercontent.com'}})).json()).signedIn,false,'Changing the OAuth client invalidates old sessions');
 const bobSession=[...memory.keys()].find(k=>k.startsWith('auth/google/sessions/')&&JSON.parse(memory.get(k).value).id===bobStatus.user);memory.get(bobSession).value=JSON.stringify({...JSON.parse(memory.get(bobSession).value),expiresAt:0});assert.equal((await (await call('/api/ai/status',{cookie:bob})).json()).signedIn,false);
 const standalone=(await import('data:text/javascript;base64,'+Buffer.from(await readFile('standalone/worker.js','utf8')).toString('base64'))).default;
 assert.equal((await (await call('/api/ai/status',{handler:standalone,headers:{'oai-authenticated-user-id':'forged'}})).json()).signedIn,false);
 console.log('Passed: signed Google ID tokens, issuer/audience/time/nonce checks, CSRF, replay and concurrency, secure opaque cookies, account isolation, native-login preservation, owner boundary, sign-out and expiry. Google JWKS and accounts were simulated; real Google OAuth activation still needs an owner client ID.');
}finally{globalThis.fetch=originalFetch}
