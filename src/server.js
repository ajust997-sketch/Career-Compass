const SNAPSHOT_KEY='opportunities/current.json';
const DAY=24*60*60*1000, MIN_REFRESH=6*60*60*1000;
let refreshing;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const textClean=(v,max=400)=>String(v||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim().slice(0,max);
const validURL=(v,fallback='')=>{try{const u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:fallback}catch{return fallback}};
const asDate=v=>{if(!v)return null;const n=typeof v==='number'?v:new Date(v).getTime();return Number.isFinite(n)?new Date(n).toISOString():null};
const checkStored=async env=>{if(!env.BUCKET)return null;const object=await env.BUCKET.get(SNAPSHOT_KEY);return object?await object.json():null};
async function getJSON(url){const r=await fetch(url,{headers:{'accept':'application/json','user-agent':'CareerCompass/1.0 (+educational opportunity directory)'},signal:AbortSignal.timeout(14000)});if(!r.ok)throw new Error('Source returned HTTP '+r.status);const value=await r.json();return value;}
const providers={
 'Codeforces':{key:'contests',async load(now){const body=await getJSON('https://codeforces.com/api/contest.list?gym=false');if(body.status!=='OK'||!Array.isArray(body.result))throw Error('Unexpected contest response');return body.result.filter(c=>c.startTimeSeconds&&(c.phase==='BEFORE'||c.phase==='CODING')&&(c.startTimeSeconds+c.durationSeconds)*1000>now).sort((a,b)=>a.startTimeSeconds-b.startTimeSeconds).slice(0,18).map(c=>({id:'cf-'+c.id,name:textClean(c.name,180),source:'Codeforces',sourceUrl:'https://codeforces.com/contests',url:'https://codeforces.com/contest/'+c.id,category:'Coding contest',start:asDate(c.startTimeSeconds*1000),end:asDate((c.startTimeSeconds+c.durationSeconds)*1000),location:'Online',dateLabel:Math.round(c.durationSeconds/60)+' minutes',description:'Check the contest division, registration requirements and permitted programming languages.',lastVerified:new Date(now).toISOString()}))}},
 'Devpost':{key:'hackathons',async load(now){const body=await getJSON('https://devpost.com/api/hackathons?status[]=open&order_by=deadline');if(!Array.isArray(body.hackathons))throw Error('Unexpected hackathon response');return body.hackathons.filter(h=>h.open_state!=='closed').slice(0,14).map(h=>({id:'devpost-'+h.id,name:textClean(h.title,180),source:'Devpost',sourceUrl:'https://devpost.com/hackathons',url:validURL(h.url,'https://devpost.com/hackathons'),category:'Hackathon',location:textClean(h.displayed_location?.location||h.location||'Check location',100),dateLabel:textClean(h.submission_period_dates||'Check submission dates',120),description:[textClean(h.organization_name,80),textClean(h.prize_amount,80),h.participants_count?Number(h.participants_count)+' participants':''].filter(Boolean).join(' · ')||'Read the event page for team, age, location and prize eligibility.',lastVerified:new Date(now).toISOString()}))}},
 'Remotive':{key:'jobs',async load(now){const body=await getJSON('https://remotive.com/api/remote-jobs?limit=80');if(!Array.isArray(body.jobs))throw Error('Unexpected job response');return body.jobs.filter(j=>/software|data|devops|sysadmin|qa|engineering/i.test(j.category||'Software')).slice(0,35).map(j=>({id:'remotive-'+j.id,name:textClean(j.title,160),company:textClean(j.company_name,100),source:'Remotive',sourceUrl:validURL(j.url,'https://remotive.com/remote-jobs'),url:validURL(j.url,'https://remotive.com/remote-jobs'),category:textClean(j.category||'Remote tech job',60),location:textClean(j.candidate_required_location||'Location not specified — verify with employer',120),salary:textClean(j.salary||'Pay not disclosed',100),published:asDate(j.publication_date),description:textClean(j.company_name,100)+' · '+textClean(j.job_type||'See listing',50),tags:Array.isArray(j.tags)?j.tags.slice(0,10).map(t=>textClean(t,50)):[],lastVerified:new Date(now).toISOString()}))}},
 'Hacker News':{key:'news',async load(now){const body=await getJSON('https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=points%3E40&hitsPerPage=12');if(!Array.isArray(body.hits))throw Error('Unexpected news response');return body.hits.filter(n=>n.title&&n.url).slice(0,8).map(n=>({id:'hn-'+n.objectID,name:textClean(n.title,180),source:'Hacker News',sourceUrl:'https://news.ycombinator.com/item?id='+n.objectID,url:validURL(n.url,'https://news.ycombinator.com/item?id='+n.objectID),category:'Tech discussion',description:'Community-shared tech story. Read the original source and check context.',published:asDate(n.created_at),lastVerified:new Date(now).toISOString()}))}}
};
async function refreshSnapshot(env,{force=false}={}){
 if(!env.BUCKET)throw new Error('Persistent opportunity storage is not available.');
 const previous=await checkStored(env),now=Date.now();
 if(previous?.lastAttempt&&now-new Date(previous.lastAttempt).getTime()<MIN_REFRESH)return {...previous,cached:true};
 if(refreshing)return refreshing;
 refreshing=(async()=>{
  const snapshot={schemaVersion:1,lastAttempt:new Date(now).toISOString(),lastSuccessfulRefresh:previous?.lastSuccessfulRefresh||null,contests:previous?.contests||[],hackathons:previous?.hackathons||[],jobs:previous?.jobs||[],news:previous?.news||[],sources:{...previous?.sources}};
  const entries=Object.entries(providers);
  const outcomes=await Promise.allSettled(entries.map(([,p])=>p.load(now)));
  let successful=0;
  for(let i=0;i<entries.length;i++){
   const [name,provider]=entries[i],outcome=outcomes[i];
   if(outcome.status==='fulfilled'){
    snapshot[provider.key]=outcome.value;snapshot.sources[name]={ok:true,lastAttempt:new Date(now).toISOString(),lastSuccess:new Date(now).toISOString(),count:outcome.value.length};successful++;
   }else snapshot.sources[name]={ok:false,lastAttempt:new Date(now).toISOString(),lastSuccess:previous?.sources?.[name]?.lastSuccess||null,count:(snapshot[provider.key]||[]).length,error:outcome.reason?.message?.startsWith('Source returned HTTP')?outcome.reason.message:'Source is temporarily unavailable; keeping the last successful snapshot.'};
  }
  if(successful)snapshot.lastSuccessfulRefresh=new Date(now).toISOString();
  await env.BUCKET.put(SNAPSHOT_KEY,JSON.stringify(snapshot),{httpMetadata:{contentType:'application/json'}});
  return {...snapshot,cached:false};
 })();
 try{return await refreshing}finally{refreshing=null}
}
const describe=s=>({lastAttempt:s?.lastAttempt||null,lastSuccessfulRefresh:s?.lastSuccessfulRefresh||null,sources:s?.sources||{},counts:{contests:s?.contests?.length||0,hackathons:s?.hackathons?.length||0,jobs:s?.jobs?.length||0,news:s?.news?.length||0}});
// Sites supplies verified identity headers. Independent Worker deployments use
// the internal scheduled() handler and must not trust client-supplied identity.
const isOwner=(request,env)=>Boolean(env.OWNER_EMAIL&&request.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.OWNER_EMAIL.toLowerCase());
async function mcp(request,env){
 let input;try{input=await request.json()}catch{return json({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}},400)}
 const id=input.id??null;
 const success=result=>json({jsonrpc:'2.0',id,result});
 if(input.method==='server/discover')return success({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
 if(input.method==='initialize')return success({protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'career-compass',version:'1.0.0'}});
 if(input.method==='notifications/initialized')return new Response(null,{status:202});
 if(input.method==='tools/list')return success({tools:[{name:'get_opportunity_status',description:'Read the current stored opportunity snapshot health and last successful source refresh times.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},{name:'refresh_opportunities',description:'Refresh public Codeforces, Devpost, Remotive and Hacker News feeds, persist a shared snapshot, preserve last good data on source errors, and return read-back health. At most once every six hours.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:true}}]});
 if(input.method==='tools/call'){
  try{let s;if(input.params?.name==='get_opportunity_status')s=await checkStored(env);else if(input.params?.name==='refresh_opportunities'){if(!isOwner(request,env))throw Error('Only the Site owner may refresh shared opportunity data.');await refreshSnapshot(env);s=await checkStored(env)}else throw Error('Unknown tool');return success({content:[{type:'text',text:JSON.stringify({...describe(s),canRefresh:isOwner(request,env)})}]});}catch(e){return success({isError:true,content:[{type:'text',text:e.message}]})}
 }
 return json({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}});
}
function canWrite(request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return false;const site=request.headers.get('sec-fetch-site');if(site&&site!=='same-origin'&&site!=='none')return false;return true;}
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  try{
   const community=await communityAPI(request,env,url);if(community)return community;
   if(url.pathname==='/mcp')return request.method==='POST'?await mcp(request,env):new Response('Use POST',{status:405,headers:{Allow:'POST'}});
   if(url.pathname==='/api/health')return json({ok:true,persistentStorage:!!env.BUCKET,version:'3.0.0'});
   if(url.pathname==='/api/status')return json(describe(await checkStored(env)));
   if(url.pathname==='/api/opportunities'){
    const stored=await checkStored(env);
    if(stored){if(isOwner(request,env)&&Date.now()-new Date(stored.lastAttempt).getTime()>DAY&&ctx?.waitUntil)ctx.waitUntil(refreshSnapshot(env).catch(()=>{}));return json(stored)}
    if(isOwner(request,env))return json(await refreshSnapshot(env));
    return json({sources:{},contests:[],hackathons:[],jobs:[],news:[],lastAttempt:null,lastSuccessfulRefresh:null});
   }
   // Public readers cannot trigger shared writes or supply feed URLs.
   if(url.pathname==='/api/refresh'){
    if(request.method!=='POST')return json({error:'Use POST'},405);
    if(!canWrite(request))return json({error:'Cross-origin write rejected'},403);
    if(!isOwner(request,env))return json({error:'Only the Site owner may refresh shared opportunity data.'},403);
    return json(await refreshSnapshot(env));
   }
   if(url.pathname==='/robots.txt')return new Response('User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /mcp\n',{headers:{'content-type':'text/plain'}});
   if(url.pathname==='/download/career-compass.html')return new Response(HTML,{headers:{'content-type':'text/html;charset=utf-8','content-disposition':'attachment; filename="career-compass.html"','x-content-type-options':'nosniff'}});
   if(url.pathname!=='/'&&url.pathname!=='/index.html')return new Response('Not found',{status:404});
   if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
   return new Response(request.method==='HEAD'?null:HTML,{headers:{'content-type':'text/html;charset=utf-8','cache-control':'public, max-age=60','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','permissions-policy':'camera=(), microphone=(), geolocation=()'}});
  }catch(e){if(e.status)return json({error:e.message},e.status);return json({error:'The service is temporarily unavailable. Use original source links and try again later.'},503)}
 },
 async scheduled(event,env,ctx){ctx.waitUntil(refreshSnapshot(env));}
};
