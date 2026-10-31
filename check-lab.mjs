import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context={};vm.runInNewContext(await readFile('src/paper-core.js','utf8')+'\nthis.core=PaperCore;',context);const P=context.core;
const data=JSON.parse(await readFile('src/data.json','utf8')),lab=JSON.parse(await readFile('src/new-data.json','utf8'));
const keys=[...data.programs.map(x=>'course:'+x.id),...data.careers.map(x=>'career:'+x.id),...data.exams.map(x=>'exam:'+x.id)];
for(const key of keys){assert(lab.guidance[key]?.before.length>=3,key);const qs=lab.mapping[key].flatMap(k=>lab.quizBanks[k]);assert(qs.length>=3,key);for(const q of qs){assert.equal(q.options.length,4);assert(q.answer>=0&&q.answer<4);assert(q.explanation.length>25)}}
const input='1. What is 2 + 2?\nA. 3\nB. 4\nC. 5\nD. 6\nAnswer: B\nTopic: Addition\nExplanation: Two pairs make four.\n\n2. Which is even?\nA. 3\nB. 5\nC. 8\nD. 9\nTopic: Parity';
const parsed=P.parse(input);assert.equal(parsed.length,2);assert.equal(parsed[0].answer,1);assert.equal(parsed[1].answer,null);
const ungraded=P.analyse(parsed,{0:1,1:0},{0:10,1:20},{correct:4,wrong:1},['Multiplication']);
assert.equal(ungraded.correct,1);assert.equal(ungraded.ungraded,1);assert.equal(ungraded.wrong,0);assert.equal(ungraded.maxScore,4);assert(ungraded.topics.some(t=>t.topic==='Multiplication'&&!t.total));
const keyed=P.applyKey(parsed,'1:B, 2:C');const scored=P.analyse(keyed,{0:1,1:0},{},{correct:4,wrong:1});assert.equal(scored.score,3);assert.equal(scored.accuracy,50);
assert.throws(()=>P.applyKey(parsed,'3:B'));assert.throws(()=>P.parse('1. No options'));assert.throws(()=>P.normalise([{question:'Q',options:['x','y'],answer:4}]));
assert.throws(()=>P.normalise([{id:'a',question:'Q',options:['x','y']},{id:'a',question:'Q2',options:['x','y']}]));
assert.throws(()=>P.parse('1. Q\nA. Alpha\nC. Gamma'));
const source=await readFile('worker/index.js','utf8');const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const memory=new Map();const bucket={
 async get(k){const o=memory.get(k);if(!o)return null;const bytes=typeof o.value==='string'?new TextEncoder().encode(o.value):o.value;return {json:async()=>JSON.parse(new TextDecoder().decode(bytes)),body:bytes,httpMetadata:o.options?.httpMetadata,customMetadata:o.options?.customMetadata}},
 async put(k,value,options){memory.set(k,{value,options})},
 async delete(keys){for(const k of Array.isArray(keys)?keys:[keys])memory.delete(k)},
 async list({prefix='',limit=1000,cursor}={}){const all=[...memory.keys()].filter(k=>k.startsWith(prefix)).sort(),start=Number(cursor)||0;return {objects:all.slice(start,start+limit).map(key=>({key})),truncated:start+limit<all.length,cursor:String(start+limit)}}
};
const env={BUCKET:bucket,OWNER_EMAIL:'owner@example.com'},ctx={waitUntil:p=>p};
async function req(path,body,uid,method='POST',extraHeaders={}){
 const response=await worker.fetch(new Request('https://example.com'+path,{method:body===undefined?'GET':method,headers:{'content-type':'application/json',...(uid?{'oai-authenticated-user-id':uid}:{}),...extraHeaders},...(body!==undefined?{body:JSON.stringify(body)}:{})}),env,ctx);
 const result=await response.json();return {status:response.status,...result};
}
assert.equal((await req('/api/community/profile',{name:'Alice'},null)).status,401);
assert.equal((await req('/api/community/profile',{name:'Alice'},'a','POST',{origin:'https://evil.example'})).status,403);
await req('/api/community/profile',{name:'Alice',shareProgress:false},'a');
await req('/api/community/profile',{name:'Bob',shareProgress:true},'b');
assert.equal((await req('/api/community/join',{goal:'invalid'},'a')).status,400);
await req('/api/community/join',{goal:'course:cse',total:10,completed:2},'a');
await req('/api/community/join',{goal:'course:cse',total:10,completed:4},'a');
await req('/api/community/join',{goal:'course:cse',total:10,completed:5},'b');
let room=await req('/api/community/room?goal=course:cse',undefined);
assert.equal(room.count,2,'Repeat joins must be idempotent');assert.equal(room.members.length,1,'Private progress must stay private');assert.equal(room.members[0].name,'Bob');assert.equal(room.members[0].progress,50);
const bob=room.members[0].id;
await req('/api/community/follow',{goal:'course:cse',target:bob},'a');
room=await req('/api/community/room?goal=course:cse',undefined,'a');assert(room.follows.includes(bob));assert.equal(room.membership.progress,40);
assert.equal((await req('/api/community/material',{goal:'course:cse',title:'Unsafe link',url:'javascript:alert(1)'},'a')).status,400);
let posted=await req('/api/community/material',{goal:'course:cse',title:'My study notes',description:'Original notes',file:{name:'notes.txt',base64:btoa('Test notes')}},'a');assert.equal(posted.status,200);
room=await req('/api/community/room?goal=course:cse',undefined,'a');assert.equal(room.materials.length,1);assert(room.materials[0].owned);assert(!('owner' in room.materials[0]));
const material=room.materials[0];let file=await worker.fetch(new Request('https://example.com'+material.url),env,ctx);assert.equal(file.status,200);assert(file.headers.get('content-disposition').includes('attachment'));assert.equal(await file.text(),'Test notes');
assert.equal((await req('/api/community/material',{goal:'course:cse',id:material.id},'b','DELETE')).status,403);
assert.equal((await req('/api/community/material',{goal:'course:cse',id:material.id},'a','DELETE')).status,200);
file=await worker.fetch(new Request('https://example.com'+material.url),env,ctx);assert.equal(file.status,404);
await req('/api/community/message',{goal:'course:cse',text:'Practising joins today.'},'b');room=await req('/api/community/room?goal=course:cse',undefined);assert.equal(room.messages.length,1);assert.equal(room.messages[0].name,'Bob');
assert.equal((await req('/api/community/message',{goal:'course:cse',text:'Too fast'},'b')).status,429);
await req('/api/community/report',{goal:'course:cse',id:room.messages[0].id,kind:'message'},'a');
assert.equal((await req('/api/community/reports',undefined,'a')).status,403);
assert.equal((await req('/api/community/reports',undefined,'a','GET',{'oai-authenticated-user-email':'owner@example.com'})).items.length,1);
await req('/api/community/profile',{name:'Bob',shareProgress:false},'b');room=await req('/api/community/room?goal=course:cse',undefined);assert.equal(room.members.length,0,'Privacy change must hide existing progress');
await req('/api/community/join',{goal:'course:cse'},'a','DELETE');assert.equal((await req('/api/community/stats?goal=course:cse',undefined)).count,1);
console.log('Passed: 64 guidance/mapping routes, parser/key validation, negative marking, missing-key exclusion, coverage gaps, anonymous and cross-origin writes, profile privacy, unique joins, progress sync, follows, upload/read/remove ownership, posting limits and moderation access.');
