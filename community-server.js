const COMMUNITY_VERSION=1;
const communityJSON=(body,status=200)=>json(body,status);
const publicGoal=g=>Object.hasOwn(GOAL_CATALOG,g);
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
async function memberId(request,env){return (await appIdentity(request,env))?.id||null;}
async function storedJSON(env,key){const obj=await env.BUCKET.get(key);return obj?obj.json():null;}
async function putJSON(env,key,value,metadata){return env.BUCKET.put(key,JSON.stringify(value),{httpMetadata:{contentType:'application/json'},...(metadata?{customMetadata:metadata}:{})});}
async function readSmallJSON(request,max=160000){
 const reader=request.body?.getReader();if(!reader)throw Object.assign(Error('A request body is required.'),{status:400});
 const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Object.assign(Error('This entry is too large.'),{status:413})}chunks.push(value)}
 const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength}
 try{return JSON.parse(new TextDecoder().decode(body))}catch{throw Object.assign(Error('Use a valid JSON request.'),{status:400})}
}
function cleanURL(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.hostname==='localhost'||/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname))return '';return u.href.slice(0,1500)}catch{return ''}}
async function listRecords(env,prefix,limit=100,cursor){
 const listed=await env.BUCKET.list({prefix,limit,...(cursor?{cursor}:{})});
 const items=(await Promise.all(listed.objects.map(o=>storedJSON(env,o.key)))).filter(Boolean);
 return {items,truncated:listed.truncated,cursor:listed.truncated?listed.cursor:null};
}
async function goalCounts(env,g){
 let cursor,count=0,pages=0;
 do{const list=await env.BUCKET.list({prefix:'community/members/'+g+'/',limit:1000,...(cursor?{cursor}:{})});count+=list.objects.length;cursor=list.truncated?list.cursor:null;pages++}while(cursor&&pages<20);
 return {count,atLeast:Boolean(cursor)};
}
async function limitPost(env,uid,kind){
 const key='community/limits/'+uid+'/'+kind;
 const previous=await storedJSON(env,key),now=Date.now();
 if(previous&&now-previous.at<10000)throw Object.assign(Error('Please wait a few seconds before posting again.'),{status:429});
 await putJSON(env,key,{at:now});
}
const RELEASE_SOURCES=[
 {repo:'python/cpython',title:'Python',tags:['coding','data','research','technology'],learn:'Review release notes; practise one change in a small script, then run its tests.'},
 {repo:'nodejs/node',title:'Node.js',tags:['coding','technology','cloud'],learn:'Check runtime compatibility and test your API with the current supported release.'},
 {repo:'pytorch/pytorch',title:'PyTorch',tags:['data','ai','research'],learn:'Re-run a small model with a fixed validation set; compare correctness, speed and memory.'},
 {repo:'kubernetes/kubernetes',title:'Kubernetes',tags:['cloud','systems','cyber'],learn:'Practise the change in a disposable local cluster; check deployment and rollback behaviour.'}
];
async function industryUpdates(env){
 const key='industry/releases-v1.json',prior=await storedJSON(env,key);
 if(prior&&Date.now()-Date.parse(prior.checkedAt)<6*3600000)return prior;
 const results=await Promise.allSettled(RELEASE_SOURCES.map(async source=>{
  const r=await fetch('https://api.github.com/repos/'+source.repo+'/releases/latest',{headers:{accept:'application/vnd.github+json','user-agent':'CareerCompass-learning'},signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('Release source unavailable');
  const v=await r.json();if(!v.tag_name||!v.html_url)throw Error('No release record');
  return {...source,version:textClean(v.tag_name,60),url:validURL(v.html_url),publishedAt:asDate(v.published_at),ok:true};
 }));
 const items=results.map((r,i)=>r.status==='fulfilled'?r.value:{...(prior?.items.find(v=>v.repo===RELEASE_SOURCES[i].repo)||RELEASE_SOURCES[i]),ok:false});
 const result={checkedAt:new Date().toISOString(),items,note:'Official release feed, checked at most once every six hours on visits. A new release is not automatically a change to your university syllabus.'};
 await putJSON(env,key,result);return result;
}
async function communityAPI(request,env,url){
 const path=url.pathname;
 if(!path.startsWith('/api/community/')&&!path.startsWith('/api/material-file/')&&path!=='/api/industry')return null;
 if(!env.BUCKET&&path==='/api/community/me'&&request.method==='GET')return communityJSON({signedIn:false,isOwner:false,id:null,loginProvider:null,googleSignInAvailable:false,storageReady:false,profile:null});
 if(!env.BUCKET)return communityJSON({error:'Shared storage is unavailable. Please try again later.'},503);
 if(path==='/api/industry'){
  if(request.method!=='GET')return communityJSON({error:'Use GET'},405);
  return communityJSON(await industryUpdates(env));
 }
 const account=await appIdentity(request,env),uid=account?.id||null;
 if(path==='/api/community/me'){
  if(request.method!=='GET')return communityJSON({error:'Use GET'},405);
  return communityJSON({signedIn:!!uid,isOwner:isOwner(request,env),id:uid,loginProvider:account?.provider||null,googleSignInAvailable:googleReady(env),profile:uid?await storedJSON(env,'community/profiles/'+uid+'.json'):null,signin:'/signin-with-chatgpt?return_to='+encodeURIComponent('/#community')});
 }
 if(path==='/api/community/stats'&&request.method==='GET'){
  const g=url.searchParams.get('goal');if(!publicGoal(g))return communityJSON({error:'Choose a valid course or exam.'},400);
  return communityJSON({goal:g,...await goalCounts(env,g)});
 }
 if(path==='/api/community/room'&&request.method==='GET'){
  const g=url.searchParams.get('goal');if(!publicGoal(g))return communityJSON({error:'Unknown study room.'},400);
  const [members,materials,messages,membership]=await Promise.all([
   listRecords(env,'community/members/'+g+'/',80,url.searchParams.get('membersCursor')),
   listRecords(env,'community/materials/'+g+'/',60,url.searchParams.get('materialsCursor')),
   listRecords(env,'community/messages/'+g+'/',50,url.searchParams.get('messagesCursor')),
   uid?storedJSON(env,'community/members/'+g+'/'+uid+'.json'):null
  ]);
  const profiles=await Promise.all(members.items.map(async m=>{const p=await storedJSON(env,'community/profiles/'+m.id+'.json');return p?.shareProgress?{id:m.id,name:p.name,progress:m.progress||0,completed:m.completed||0,total:m.total||0,updatedAt:m.updatedAt}:null}));
  const visible=profiles.filter(Boolean);
  const follows=uid?(await listRecords(env,'community/follows/'+uid+'/',100)).items.map(x=>x.target):[];
  return communityJSON({goal:g,members:visible,materials:materials.items.map(m=>({...m,owned:m.owner===uid||isOwner(request,env),owner:undefined})),messages:messages.items.map(m=>({...m,owned:m.owner===uid||isOwner(request,env),owner:undefined})),membership,follows,cursors:{members:members.cursor,materials:materials.cursor,messages:messages.cursor},...await goalCounts(env,g)});
 }
 if(path==='/api/community/reports'&&request.method==='GET'){
  if(!isOwner(request,env))return communityJSON({error:'Owner access required'},403);
  const records=await listRecords(env,'community/reports/',100,url.searchParams.get('cursor'));
  return communityJSON(records);
 }
 if(path.startsWith('/api/material-file/')&&request.method==='GET'){
  const id=path.split('/').pop();if(!/^[a-f0-9-]{36}$/.test(id))return communityJSON({error:'Unknown file'},404);
  const file=await env.BUCKET.get('community/files/'+id);
  if(!file)return communityJSON({error:'File no longer available'},404);
  return new Response(file.body,{headers:{'content-type':file.httpMetadata?.contentType||'application/octet-stream','content-disposition':'attachment; filename="study-material.'+(file.customMetadata?.ext||'txt')+'"','x-content-type-options':'nosniff','cache-control':'private, max-age=60','content-security-policy':"default-src 'none'; sandbox"}});
 }
 if(!['POST','PUT','DELETE'].includes(request.method))return communityJSON({error:'Method not allowed'},405);
 if(!canWrite(request))return communityJSON({error:'Cross-origin write rejected'},403);
 if(!uid)return communityJSON({error:'Sign in to join, sync progress or contribute.'},401);
 if(!request.headers.get('content-type')?.includes('application/json'))return communityJSON({error:'Use JSON'},415);
 if(Number(request.headers.get('content-length')||0)>1500000)return communityJSON({error:'File is too large.'},413);
 const input=await readSmallJSON(request,path==='/api/community/material'?1500000:160000);
 if(path==='/api/community/profile'){
  const name=textClean(input.name,36);if(name.length<2)return communityJSON({error:'Choose a display name with at least 2 characters.'},400);
  const profile={name,shareProgress:input.shareProgress===true,updatedAt:new Date().toISOString()};
  await putJSON(env,'community/profiles/'+uid+'.json',profile);return communityJSON({profile});
 }
 const profile=await storedJSON(env,'community/profiles/'+uid+'.json');
 if(!profile)return communityJSON({error:'Save your community display name first.'},400);
 const g=input.goal;if(!publicGoal(g))return communityJSON({error:'Choose a valid course or exam.'},400);
 if(path==='/api/community/join'){
  const key='community/members/'+g+'/'+uid+'.json';
  if(request.method==='DELETE'){await env.BUCKET.delete(key);return communityJSON({joined:false})}
  const old=await storedJSON(env,key);
  const total=Math.max(0,Math.min(10000,Math.floor(Number(input.total)||0))),completed=Math.max(0,Math.min(total,Math.floor(Number(input.completed)||0)));
  const record={id:uid,goal:g,total,completed,progress:total?Math.round(completed/total*100):0,joinedAt:old?.joinedAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  await putJSON(env,key,record);return communityJSON({joined:true,membership:record});
 }
 if(path==='/api/community/follow'){
  const target=String(input.target||'');if(!/^u[a-f0-9]{32}$/.test(target)||target===uid)return communityJSON({error:'Choose another learner.'},400);
  if(!await storedJSON(env,'community/members/'+g+'/'+target+'.json'))return communityJSON({error:'Learner is not in this room.'},404);
  const key='community/follows/'+uid+'/'+target+'.json';
  if(request.method==='DELETE')await env.BUCKET.delete(key);else await putJSON(env,key,{target,goal:g});
  return communityJSON({following:request.method!=='DELETE'});
 }
 if(path==='/api/community/message'){
  if(request.method==='DELETE'){
   const id=String(input.id||'');if(!/^\d{13}-[a-f0-9-]{36}$/.test(id))return communityJSON({error:'Unknown message'},400);
   const key='community/messages/'+g+'/'+id+'.json',old=await storedJSON(env,key);
   if(!old)return communityJSON({error:'Message unavailable'},404);
   if(old.owner!==uid&&!isOwner(request,env))return communityJSON({error:'You can remove only your own message.'},403);
   await env.BUCKET.delete(key);return communityJSON({deleted:true});
  }
  const message=textClean(input.text,800);if(message.length<2)return communityJSON({error:'Write a short study question or update.'},400);
  await limitPost(env,uid,'message');
  const id=String(9999999999999-Date.now())+'-'+crypto.randomUUID();
  await putJSON(env,'community/messages/'+g+'/'+id+'.json',{id,owner:uid,name:profile.name,text:message,createdAt:new Date().toISOString()});
  return communityJSON({ok:true});
 }
 if(path==='/api/community/material'){
  if(request.method==='DELETE'){
   const id=String(input.id||'');if(!/^\d{13}-[a-f0-9-]{36}$/.test(id))return communityJSON({error:'Unknown resource'},400);
   const key='community/materials/'+g+'/'+id+'.json',old=await storedJSON(env,key);
   if(!old)return communityJSON({error:'Material unavailable'},404);
   if(old.owner!==uid&&!isOwner(request,env))return communityJSON({error:'You can remove only your own contribution.'},403);
   await env.BUCKET.delete(key);if(old.fileId)await env.BUCKET.delete('community/files/'+old.fileId);
   return communityJSON({deleted:true});
  }
  const title=textClean(input.title,120),description=textClean(input.description,500),link=cleanURL(input.url),file=input.file;
  if(title.length<3||(!link&&!file))return communityJSON({error:'Add a title and an HTTPS link or PDF/text file.'},400);
  let fileId=null,ext=null,mime=null,bytes=null;
  if(file){
   ext=String(file.name||'').split('.').pop().toLowerCase();if(!['pdf','txt'].includes(ext))return communityJSON({error:'Only PDF or TXT files can be shared.'},400);
   const b64=String(file.base64||'');if(b64.length>1400000)return communityJSON({error:'Share files smaller than 1 MB, or add a link.'},413);
   try{bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0))}catch{return communityJSON({error:'Invalid file'},400)}
   if(bytes.length>1024*1024)return communityJSON({error:'File limit: 1 MB.'},413);
   if(ext==='pdf'&&!new TextDecoder().decode(bytes.slice(0,5)).startsWith('%PDF-'))return communityJSON({error:'The file is not a valid PDF.'},400);
   mime=ext==='pdf'?'application/pdf':'text/plain';fileId=crypto.randomUUID();
  }
  await limitPost(env,uid,'material');
  if(fileId)await env.BUCKET.put('community/files/'+fileId,bytes,{httpMetadata:{contentType:mime},customMetadata:{ext}});
  const id=String(9999999999999-Date.now())+'-'+crypto.randomUUID();
  const material={id,owner:uid,name:profile.name,title,description,url:link||'/api/material-file/'+fileId,fileId,createdAt:new Date().toISOString(),label:'Community contribution · not independently verified'};
  await putJSON(env,'community/materials/'+g+'/'+id+'.json',material);return communityJSON({ok:true});
 }
 if(path==='/api/community/report'){
  const id=String(input.id||''),kind=input.kind;if(!['message','material'].includes(kind)||!/^\d{13}-[a-f0-9-]{36}$/.test(id))return communityJSON({error:'Unknown contribution'},400);
  await putJSON(env,'community/reports/'+g+'/'+kind+'-'+id+'/'+uid+'.json',{goal:g,kind,id,reason:textClean(input.reason,240)||'Flagged for review',createdAt:new Date().toISOString()});
  return communityJSON({ok:true});
 }
 return communityJSON({error:'Unknown action'},404);
}
