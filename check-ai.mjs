import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile('worker/index.js','utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const memory=new Map();let serial=0;
const bucket={
 async get(k){const o=memory.get(k);return o?{etag:o.etag,json:async()=>JSON.parse(o.value)}:null},
 async put(k,value,options={}){const old=memory.get(k),cond=options.onlyIf;if(cond instanceof Headers&&cond.get('If-None-Match')==='*'&&old)return null;if(cond?.etagMatches&&old?.etag!==cond.etagMatches)return null;const v={value,etag:String(++serial)};memory.set(k,v);return {etag:v.etag}},
 async delete(k){for(const key of Array.isArray(k)?k:[k])memory.delete(key)},
 async list({prefix='',limit=1000,cursor}={}){const keys=[...memory.keys()].filter(k=>k.startsWith(prefix)).sort(),start=Number(cursor)||0;return {objects:keys.slice(start,start+limit).map(key=>({key})),truncated:start+limit<keys.length,cursor:String(start+limit)}}
};
const env={BUCKET:bucket,AI_KEYS_ENCRYPTION_KEY:'a'.repeat(64)},pending=[];
const ctx={waitUntil:p=>pending.push(p)};
async function drain(){await Promise.all(pending.splice(0))}
async function req(path,body,uid='alice',method='POST',extraHeaders={}){const r=await worker.fetch(new Request('https://example.com'+path,{method:body===undefined?'GET':method,headers:{'content-type':'application/json',...(uid?{'oai-authenticated-user-id':uid}:{}),...extraHeaders},...(body===undefined?{}:{body:JSON.stringify(body)})}),env,ctx);return {...await r.json(),httpStatus:r.status}}
const providerCalls=[];let failStatus=0,malformed=false,delayProvider=null,delayModels=null,onModels=null;
const realFetch=globalThis.fetch;
const sampleOutput={summary:'Review percentages and SQL grouping.',strengths:['Median identified correctly.'],focusTopics:[{topic:'SQL',evidence:'One missed grouping question.',practice:'Write three GROUP BY queries.'}],questionFeedback:[{questionId:'1',explanation:'Compare the increase with the original value.',keyCheck:'Check the supplied key.'},{questionId:'999',explanation:'fabricated',keyCheck:''}],nextSteps:['Try five percentage questions.'],updates:[{title:'Unverified',detail:'This must not survive validation.',sourceIds:['invented']}],limitations:['Reasons for mistakes need your review.']};
globalThis.fetch=async(url,options={})=>{
 providerCalls.push({url:String(url),options});
 if(failStatus)return Response.json({error:{message:'private-provider-echo-do-not-leak'}},{status:failStatus});
 if(String(url).includes('api.github.com'))return Response.json({tag_name:'v-test',html_url:'https://github.com/nodejs/node/releases/tag/v-test',published_at:'2026-10-28T00:00:00Z'});
 if(String(url).includes('models?pageSize')){if(delayModels){onModels?.();await delayModels}return Response.json({models:[{name:'models/gemini-test-flash',displayName:'Test Flash',supportedGenerationMethods:['generateContent']},{name:'models/gemini-test-image',supportedGenerationMethods:['generateContent']},{name:'models/embedding-test',supportedGenerationMethods:['embedContent']}]})}
 if(String(url).includes('/v1/models?'))return Response.json({data:[{id:'claude-test-haiku',display_name:'Test Haiku'}]});
 if(delayProvider)await delayProvider;
 if(String(url).includes('generateContent'))return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:malformed?'not json':JSON.stringify(sampleOutput)}]}}]});
 if(String(url).endsWith('/v1/messages'))return Response.json({stop_reason:'end_turn',content:[{type:'text',text:malformed?'not json':JSON.stringify(sampleOutput)}]});
 throw Error('Unexpected outbound host');
};
const key='test-provider-key-not-a-real-secret',connect={provider:'gemini',key,consent:true};
const paper={title:'Private mock',goal:'course:cse',marking:{correct:4,wrong:1},covered:['Algebra'],questions:[{id:'1',question:'2+2?',options:['3','4'],answer:1,topic:'__proto__'},{id:'2',question:'3+3?',options:['5','6'],answer:null,topic:'Addition'}]};
const jobInput=kind=>({kind,requestId:crypto.randomUUID(),consent:true,paper,attempt:{answers:{0:0,1:1},timings:{0:12,1:8},reasons:{0:'calculation'}}});
try{
 assert.equal((await req('/api/ai/status',undefined,null)).signedIn,false);
 assert.equal((await req('/api/ai/connect',connect,null)).httpStatus,401);
 assert.equal((await req('/api/ai/connect',connect,'alice','POST',{origin:'https://evil.example'})).httpStatus,403);
 assert.equal((await req('/api/ai/connect',{...connect,consent:false})).httpStatus,400);
 assert.equal((await req('/api/ai/connect',{...connect,provider:'https://evil.example'})).httpStatus,400);
 assert.equal(providerCalls.length,0);
 let connected=await req('/api/ai/connect',connect);assert.equal(connected.httpStatus,200);assert.equal(connected.connection.models.length,1);assert(!JSON.stringify(connected).includes(key));
 let status=await req('/api/ai/status',undefined);assert.equal(status.connections.length,1);assert.equal(status.preferences.autoPaper,false);
 assert.equal((await req('/api/ai/status',undefined,'bob')).connections.length,0);
 const recordKey=[...memory.keys()].find(k=>k.includes('/connections/gemini'));assert(recordKey);assert(!memory.get(recordKey).value.includes(key));assert(!JSON.stringify(status).includes('secret'));
 assert.equal((await req('/api/ai/settings',{provider:'gemini',model:'unlisted-model',language:'en'})).httpStatus,400);
 assert.equal((await req('/api/ai/settings',{provider:'gemini',model:'gemini-test-flash',language:'hinglish',autoPaper:true,consent:false})).httpStatus,400);
 assert.equal((await req('/api/ai/jobs',{...jobInput('paper'),automatic:true})).httpStatus,403);
 await req('/api/ai/settings',{provider:'gemini',model:'gemini-test-flash',language:'hinglish',autoPaper:true,autoAttempt:true,consent:true});
 const input=jobInput('attempt');let accepted=await req('/api/ai/jobs',input);assert.equal(accepted.httpStatus,202);assert.equal(accepted.metrics.score,-1);assert.equal(accepted.metrics.maxScore,4);assert.equal(accepted.metrics.ungraded,1);
 await drain();let report=await req('/api/ai/jobs/'+accepted.id,undefined);assert.equal(report.httpStatus,200);assert.equal(report.output.questionFeedback.length,1);assert.equal(report.output.updates.length,0);assert(report.output.summary);
 const generation=providerCalls.find(x=>x.url.includes('generateContent'));assert.equal(generation.options.headers['x-goog-api-key'],key);assert(!generation.url.includes(key));assert(JSON.parse(generation.options.body).systemInstruction.parts[0].text.includes('untrusted'));assert.equal(JSON.parse(JSON.parse(generation.options.body).contents[0].parts[0].text).metrics.ungraded,1);
 assert.equal((await req('/api/ai/jobs/'+accepted.id,undefined,'bob')).httpStatus,404);
 const rawReport=memory.get([...memory.keys()].find(k=>k.endsWith('/jobs/'+accepted.id+'.json'))).value;assert(!rawReport.includes(sampleOutput.summary));
 const count=providerCalls.length;let duplicate=await req('/api/ai/jobs',input);assert.equal(duplicate.id,accepted.id);await drain();assert.equal(providerCalls.length,count,'Retrying same ID must not generate another response');
 let summary=await req('/api/ai/jobs',{...jobInput('paper'),automatic:true});await drain();summary=await req('/api/ai/jobs/'+summary.id,undefined);assert.equal(summary.output.questionFeedback.length,0,'No answer explanations in pre-attempt summary');
 assert.equal((await req('/api/ai/jobs',jobInput('bad'))).httpStatus,400);
 assert.equal((await req('/api/ai/jobs',{...jobInput('paper'),consent:false})).httpStatus,400);
 const malformedPaper=jobInput('paper');malformedPaper.paper={...paper,questions:[...paper.questions,{id:'1',question:'Duplicate',options:['x','y']}]};assert.equal((await req('/api/ai/jobs',malformedPaper)).httpStatus,400);
 assert.equal((await req('/api/ai/jobs/'+accepted.id,{},'bob','DELETE')).httpStatus,404);
 assert.equal((await req('/api/ai/jobs/'+accepted.id,{},'alice','DELETE')).httpStatus,200);assert.equal((await req('/api/ai/jobs/'+accepted.id,undefined)).httpStatus,404);
 // Associated data prevents transplanting Alice's encrypted key into Bob's account.
 const bobStatus=await req('/api/ai/status',undefined,'bob');memory.set(recordKey.replace(status.user,bobStatus.user),memory.get(recordKey));
 const transplant=await req('/api/ai/models',{provider:'gemini'},'bob');assert.equal(transplant.httpStatus,409);memory.delete(recordKey.replace(status.user,bobStatus.user));
 let claude=await req('/api/ai/connect',{provider:'claude',key:'test-claude-key-not-a-real-secret',workspace:'wrkspc_demo',consent:true},'bob');assert.equal(claude.httpStatus,200);
 let claudeJob=await req('/api/ai/jobs',jobInput('attempt'),'bob');await drain();assert((await req('/api/ai/jobs/'+claudeJob.id,undefined,'bob')).output.summary);
 const claudeCall=providerCalls.find(x=>x.url.endsWith('/v1/messages'));assert.equal(claudeCall.options.headers['anthropic-workspace-id'],'wrkspc_demo');assert.equal(JSON.parse(claudeCall.options.body).model,'claude-test-haiku');
 failStatus=429;let failed=await req('/api/ai/jobs',jobInput('attempt'),'bob');await drain();failed=await req('/api/ai/jobs/'+failed.id,undefined,'bob');assert.equal(failed.error.includes('quota'),true);assert(!JSON.stringify(failed).includes('private-provider-echo'));failStatus=0;
 malformed=true;let invalid=await req('/api/ai/jobs',jobInput('attempt'),'bob');await drain();invalid=await req('/api/ai/jobs/'+invalid.id,undefined,'bob');assert(invalid.error.includes('usable report'));malformed=false;
 await req('/api/ai/connection',{provider:'gemini'},'alice','DELETE');assert.equal((await req('/api/ai/status',undefined)).connections.length,0);assert.equal((await req('/api/ai/jobs',jobInput('paper'))).httpStatus,409);
 // Provider errors must not echo API keys or raw provider details.
 failStatus=401;let badKey=await req('/api/ai/connect',connect,'carol');assert.equal(badKey.httpStatus,502);assert(!JSON.stringify(badKey).includes('private-provider-echo'));failStatus=0;
 await req('/api/ai/connect',connect,'dave');
 let unblock;delayProvider=new Promise(resolve=>{unblock=resolve});const race=await req('/api/ai/jobs',jobInput('attempt'),'dave');await req('/api/ai/jobs/'+race.id,{},'dave','DELETE');unblock();await drain();delayProvider=null;assert.equal((await req('/api/ai/jobs/'+race.id,undefined,'dave')).httpStatus,404,'Deleted report must not reappear');
 const sourceReply=await req('/api/ai/jobs',{kind:'learning',goal:'course:cse',focus:'SQL practice',requestId:crypto.randomUUID(),consent:true},'dave');await drain();const brief=await req('/api/ai/jobs/'+sourceReply.id,undefined,'dave');assert.equal(brief.output.updates.length,0);assert(brief.sources.length>0);
 // A delayed model refresh must never restore a key after disconnection.
 await req('/api/ai/connect',connect,'erin');let releaseModels;delayModels=new Promise(resolve=>{releaseModels=resolve});const modelsStarted=new Promise(resolve=>{onModels=resolve});const refreshingModels=req('/api/ai/models',{provider:'gemini'},'erin');await modelsStarted;await req('/api/ai/connection',{provider:'gemini'},'erin','DELETE');releaseModels();assert.equal((await refreshingModels).httpStatus,409);delayModels=null;onModels=null;assert.equal((await req('/api/ai/status',undefined,'erin')).connections.length,0);
 const unready={...env,AI_KEYS_ENCRYPTION_KEY:undefined};const locked=await worker.fetch(new Request('https://example.com/api/ai/status'),unready,ctx);assert.equal((await locked.json()).ready,false);
 const standalone=(await import('data:text/javascript;base64,'+Buffer.from(await readFile('standalone/worker.js','utf8')).toString('base64'))).default;
 const forged=await standalone.fetch(new Request('https://example.com/api/ai/status',{headers:{'oai-authenticated-user-id':'alice'}}),env,ctx);assert.equal((await forged.json()).signedIn,false);
 // All client code parses, including escaped provider output and private routes.
 const html=await (await worker.fetch(new Request('https://example.com/'),env,ctx)).text();for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);assert(html.includes('My AI assistant'));
 console.log('Passed: encrypted per-user keys/reports, consent and CSRF, provider/model validation, Gemini/Claude adapters, deterministic grading, missing keys, prototype-like topic names, private history, duplicate requests, deletion races, redacted failures, source filtering and independent-worker auth isolation. Provider responses are mocked; no paid generation was made.');
}finally{globalThis.fetch=realFetch}
