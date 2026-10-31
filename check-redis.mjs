// Optional deeper check: python3 -m pip install 'fakeredis[lua]' first.
// Runs the actual Lua scripts, not a JavaScript rewrite of their behaviour.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {createRedisBucket} from '../platform/redis-bucket.mjs';
import {createHandler} from '../platform/vercel-handler.mjs';

const child=spawn(process.env.PYTHON||'python3',['scripts/redis-qa.py'],{stdio:['pipe','pipe','inherit']});
const waiting=[];
createInterface({input:child.stdout}).on('line',line=>waiting.shift()?.resolve(JSON.parse(line)));
child.on('exit',()=>{for(const entry of waiting)entry.reject(Error('Install fakeredis[lua] to run this optional test.'));waiting.length=0});
function command(args){return new Promise((resolve,reject)=>{waiting.push({resolve,reject});child.stdin.write(JSON.stringify(args)+'\n')})}
const config={url:'https://test.upstash.io',token:'synthetic-test-token',prefix:'test:vercel'};
const rest=async(url,options)=>{assert.equal(url,config.url);assert.equal(options.headers.authorization,'Bearer '+config.token);assert.equal(options.redirect,'error');const r=await command(JSON.parse(options.body));return Response.json(r,{status:r.error?400:200})};
const bucket=createRedisBucket(config,{fetchImpl:rest});
const realFetch=globalThis.fetch;
try{
 assert(await bucket.ping());assert.equal(await bucket.get('missing'),null);
 await bucket.put('notes/one',JSON.stringify({text:'नमस्ते ✓'}),{httpMetadata:{contentType:'application/json'}});
 let saved=await bucket.get('notes/one');assert.deepEqual(await saved.json(),{text:'नमस्ते ✓'});assert.equal(saved.httpMetadata.contentType,'application/json');
 const binary=Buffer.from([0,255,13,10,200,0]);await bucket.put('files/a',binary,{customMetadata:{ext:'pdf'}});saved=await bucket.get('files/a');assert.deepEqual(saved.body,binary);assert.equal(saved.customMetadata.ext,'pdf');
 const once=await Promise.all(Array.from({length:20},()=>bucket.put('claims/request','one',{onlyIf:new Headers({'If-None-Match':'*'})})));
 assert.equal(once.filter(Boolean).length,1,'Exactly one create claim succeeds');
 const before=await bucket.get('claims/request');
 const claims=await Promise.all(Array.from({length:20},(_,i)=>bucket.put('claims/request',String(i),{onlyIf:{etagMatches:before.etag}})));
 assert.equal(claims.filter(Boolean).length,1,'Exactly one version claim succeeds');
 await bucket.delete('claims/request');assert.equal(await bucket.put('claims/request','late result',{onlyIf:{etagMatches:before.etag}}),null,'A late completion cannot recreate a deleted record');
 for(const key of ['a','b','c','d'])await bucket.put('page/'+key,key);
 await bucket.put('page-other/x','excluded');
 const first=await bucket.list({prefix:'page/',limit:2});assert.deepEqual(first.objects.map(x=>x.key),['page/a','page/b']);assert(first.truncated);
 await bucket.delete('page/a');
 const second=await bucket.list({prefix:'page/',limit:2,cursor:first.cursor});assert.deepEqual(second.objects.map(x=>x.key),['page/c','page/d']);assert.equal(second.truncated,false);
 await assert.rejects(()=>bucket.list({prefix:'other/',cursor:first.cursor}),error=>error.status===400);
 await bucket.delete(['page/c','page/d']);assert.deepEqual((await bucket.list({prefix:'page/'})).objects,[{key:'page/b'}]);
 const other=createRedisBucket({...config,prefix:'test:other'},{fetchImpl:rest});assert.equal(await other.get('notes/one'),null);
 await assert.rejects(()=>bucket.put('files/large',Buffer.alloc(2*1024*1024+1)));
 const clientId='123456789-test.apps.googleusercontent.com';
 const settings={UPSTASH_REDIS_REST_URL:config.url,UPSTASH_REDIS_REST_TOKEN:config.token,GOOGLE_OAUTH_CLIENT_ID:clientId,AI_KEYS_ENCRYPTION_KEY:'b'.repeat(64),OWNER_EMAIL:'owner@example.com'};
 const handler=createHandler({environment:()=>settings,bucketFactory:()=>bucket,defer:p=>p,clientIP:()=> '203.0.113.5'});
 const {publicKey,privateKey}=await generateKeyPair('RS256');
 const jwk={...await exportJWK(publicKey),kid:'qa',alg:'RS256',use:'sig'};
 globalThis.fetch=async(url)=>{
  if(String(url)==='https://www.googleapis.com/oauth2/v3/certs')return Response.json({keys:[jwk]});
  if(String(url).startsWith('https://generativelanguage.googleapis.com/v1beta/models?'))return Response.json({models:[{name:'models/gemini-test',supportedGenerationMethods:['generateContent']}]});
  throw Error('Unexpected network request in test');
 };
 const cookieNamed=(r,n)=>r.headers.getSetCookie().find(c=>c.startsWith(n+'='))?.split(';')[0];
 const request=(path,{cookie,body,headers={}}={})=>handler(new Request('https://career.example'+path,{method:body===undefined?'GET':'POST',headers:{...headers,...(cookie?{cookie}:{}),...(body===undefined?{}:{origin:'https://career.example','content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})}));
 async function start(sub){const r=await request('/auth/google');assert.equal(r.status,200);const html=await r.text(),nonce=JSON.parse(html.match(/const config=(\{[^;]+\});let started/)[1]).nonce;const now=Math.floor(Date.now()/1000);const token=await new SignJWT({iss:'https://accounts.google.com',aud:clientId,sub,nonce,iat:now,exp:now+600}).setProtectedHeader({alg:'RS256',kid:'qa'}).sign(privateKey);return {cookie:cookieNamed(r,'__Host-cc_google_challenge'),body:{credential:token}}}
 const pending=await start('alice');const logins=await Promise.all([request('/auth/google/verify',pending),request('/auth/google/verify',pending)]);assert.equal(logins.filter(x=>x.status===200).length,1,'Real Lua prevents replay during Google login');
 const alice=cookieNamed(logins.find(x=>x.status===200),'__Host-cc_google_session');assert(alice);
 let response=await request('/api/ai/status',{cookie:alice});assert.equal((await response.json()).signedIn,true);
 response=await request('/api/ai/connect',{cookie:alice,body:{provider:'gemini',key:'synthetic-test-gemini-key-only',consent:true}});assert.equal(response.status,200);
 let aliceState=await (await request('/api/ai/status',{cookie:alice})).json();assert.equal(aliceState.connections.length,1);
 const bobLogin=await request('/auth/google/verify',await start('bob'));assert.equal(bobLogin.status,200);const bob=cookieNamed(bobLogin,'__Host-cc_google_session');
 assert.equal((await (await request('/api/ai/status',{cookie:bob})).json()).connections.length,0);
 const connection=await bucket.get('personal-ai/'+aliceState.user+'/connections/gemini.json');assert(connection);assert(!(await connection.text()).includes('synthetic-test-gemini-key-only'));
 assert.equal((await request('/api/refresh',{cookie:alice,headers:{'oai-authenticated-user-email':'owner@example.com'},body:{}})).status,403);
 assert.equal((await request('/auth/google/signout',{cookie:alice,body:{}})).status,200);
 assert.equal((await (await request('/api/ai/status',{cookie:alice})).json()).signedIn,false);
 console.log('Passed Redis/Lua simulation: binary/Unicode storage, atomic conditional writes under concurrency, safe deletion, prefix pagination, isolation, Google login replay, encrypted Gemini key separation and sign-out through the Vercel adapter. No live Google/AI/Upstash accounts used.');
}finally{globalThis.fetch=realFetch;child.stdin.end();child.kill()}
