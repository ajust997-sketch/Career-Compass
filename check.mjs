import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const data=JSON.parse(await readFile('src/data.json','utf8'));
Object.assign(data,JSON.parse(await readFile('src/lectures.json','utf8')),JSON.parse(await readFile('src/cutoffs.json','utf8')));
for(const [group,map] of [[data.careers,data.careerLectures],[data.exams,data.examLectures],[data.programs,data.courseLectures]])for(const item of group){assert(map[item.id]?.length,'Missing video coverage: '+item.id);for(const id of map[item.id])assert(data.lectureSources[id]);}
for(const c of data.careers){assert.equal(c.progression.length,4);assert(c.payWhy&&c.difficultyWhy&&c.advice);}
for(const e of data.exams){assert(data.cutoffs[e.id]);assert(e.after.length>1);assert.equal(e.studyTopics.length,4);}
for(const c of data.careers){assert.equal(c.skills.length,4);assert.equal(c.roadmap.length,4);for(const key of c.resources)assert(data.resources[key]);for(const id of c.programs)assert(data.programs.some(p=>p.id===id));}
for(const p of data.programs)assert(data.careers.some(c=>c.programs.includes(p.id)),p.name+' has no paths');
for(const e of data.exams)assert.match(e.url,/^https:\/\//);

const nodes=new Map();const node=()=>({innerHTML:'',textContent:'',value:'',dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},addEventListener(){},getAttribute(){},querySelectorAll(){return []}});
const document={querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)},querySelectorAll(){return []},addEventListener(){},documentElement:{},title:''};
const window={COMPASS_DATA:data,addEventListener(){},scrollTo(){}};
const experience=await readFile('src/experience.js','utf8');
const context={window,document,localStorage:{getItem(){return null},setItem(){}},location:{hash:''},Intl,Date,URL,Blob,TextEncoder,CSS:{escape:s=>s},setTimeout,clearTimeout,console,fetch:async()=>({ok:true,json:async()=>({sources:{},contests:[],hackathons:[],jobs:[],news:[]})})};
const client=(await readFile('src/app.js','utf8')).replace('/*EXPERIENCE*/',()=>experience);
vm.runInNewContext(client,context);
const build=window.COMPASS_TEST.buildSessions;
for(const hours of [.5,1,1.5,3,5,8]){
 const p={target:'software',start:'2026-10-26',hours,weeks:4,time:'08:00',level:'beginner',days:[1,3,5],revision:123};
 const ss=build(p),dates=[...new Set(ss.map(s=>s.date))];assert.equal(dates.length,12);
 const ids=ss.filter(s=>!s.break).map(s=>s.id);assert.equal(new Set(ids).size,ids.length);
 for(const date of dates){const day=ss.filter(s=>s.date===date);assert.equal(day.reduce((n,s)=>n+s.minutes,0),hours*60);assert.equal(day[0].start,'08:00');assert([1,3,5].includes(new Date(date+'T12:00:00').getDay()));for(let i=1;i<day.length;i++)assert.equal(day[i].start,day[i-1].end);}
}
const exam=build({target:'exam:gate',start:'2026-10-26',hours:3,weeks:12,time:'18:00',level:'intermediate',days:[1,2,3,4,5,6],revision:456});assert(exam.some(s=>s.title==='Full mocks & error-log revision'));assert(exam.some(s=>s.title==='Active recall & revision'));

const source=await readFile('worker/index.js','utf8');const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const memory=new Map();const bucket={async get(k){const v=memory.get(k);return v?{json:async()=>JSON.parse(v)}:null},async put(k,v){memory.set(k,v)}};
const originalFetch=globalThis.fetch;
let failJobs=false,requests=0;
globalThis.fetch=async url=>{requests++;if(String(url).includes('codeforces'))return Response.json({status:'OK',result:[{id:1,name:'Test Contest',phase:'BEFORE',durationSeconds:7200,startTimeSeconds:Math.floor(Date.now()/1000)+86400}]});if(String(url).includes('devpost'))return Response.json({hackathons:[{id:2,title:'Test Hackathon',url:'https://example.com/event',displayed_location:{location:'Online'},submission_period_dates:'Next week'}]});if(String(url).includes('remotive'))return failJobs?new Response('down',{status:503}):Response.json({jobs:[{id:3,title:'Test Developer',company_name:'Example',url:'https://remotive.com/test',candidate_required_location:'Worldwide',tags:['Python']}]});return Response.json({hits:[{objectID:'4',title:'Test Tech News',url:'https://example.com/story',created_at:new Date().toISOString()}]});};
try{
 const env={BUCKET:bucket,OWNER_EMAIL:'owner@example.com'},ctx={waitUntil:p=>p};const req=(path,options={})=>new Request('https://example.com'+path,{...options,headers:{'oai-authenticated-user-email':'owner@example.com',...options.headers}});
 let anonymous=await worker.fetch(new Request('https://example.com/api/refresh',{method:'POST'}),env,ctx);assert.equal(anonymous.status,403);
 anonymous=await worker.fetch(new Request('https://example.com/api/opportunities'),env,ctx);assert.equal(anonymous.status,200);assert.equal(requests,0,'Anonymous reads must not fetch or write shared data');
 anonymous=await worker.fetch(new Request('https://example.com/mcp',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:0,method:'tools/call',params:{name:'refresh_opportunities',arguments:{}}})}),env,ctx);assert((await anonymous.json()).result.isError);
 let r=await worker.fetch(req('/api/refresh',{method:'POST',headers:{origin:'https://evil.example'}}),env,ctx);assert.equal(r.status,403);
 r=await worker.fetch(req('/api/refresh',{method:'POST'}),env,ctx);assert.equal(r.status,200);const snapshot=await r.json();assert.equal(snapshot.jobs.length,1);assert.equal(Object.values(snapshot.sources).filter(s=>s.ok).length,4);
 const firstRequests=requests;r=await worker.fetch(req('/api/refresh',{method:'POST'}),env,ctx);assert((await r.json()).cached);assert.equal(requests,firstRequests);
 const previous=JSON.parse(memory.get('opportunities/current.json'));previous.lastAttempt=new Date(Date.now()-25*3600000).toISOString();memory.set('opportunities/current.json',JSON.stringify(previous));failJobs=true;
 r=await worker.fetch(req('/api/refresh',{method:'POST'}),env,ctx);const partial=await r.json();assert.equal(partial.sources.Remotive.ok,false);assert.equal(partial.jobs[0].id,'remotive-3');assert.equal(partial.sources.Remotive.lastSuccess,snapshot.sources.Remotive.lastSuccess);
 r=await worker.fetch(req('/api/status'),env,ctx);assert.equal((await r.json()).counts.jobs,1);
 r=await worker.fetch(req('/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'get_opportunity_status',arguments:{}}})}),env,ctx);assert.equal((await r.json()).result.content[0].type,'text');
 r=await worker.fetch(req('/'),env,ctx);assert.equal(r.status,200);const html=await r.text();assert(html.includes('Your degree is a beginning.'));assert(!html.includes('/*APP_JS*/'));for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
 const course=build({target:'course:bcom',start:'2026-10-26',hours:2,weeks:4,time:'18:00',level:'beginner',days:[1,3,5],revision:789});assert(course.some(s=>s.title.includes('Accounting')));
 const ranked=window.COMPASS_EXPERIENCE_TEST.rankCareers('data');assert(ranked.length);assert(ranked[0].reasons.length);assert(window.COMPASS_EXPERIENCE_TEST.historyBlock('gate').includes('2026'));
 r=await worker.fetch(new Request('https://example.com/download/career-compass.html'),env,ctx);assert.equal(r.status,200);assert(r.headers.get('content-disposition').includes('attachment'));
 console.log('Passed: content mappings, planner budgets/rest days/phases, source refresh/read-back, rate limiting, partial-failure preservation, cross-origin protection and MCP status.');
}finally{globalThis.fetch=originalFetch;}
