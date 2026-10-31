// Development-only UI fixture. Never imported into the production Worker.
export function aiFixtureScript(){return `
(()=>{
 const original=window.fetch.bind(window),jobs=new Map();let c=null,prefs={provider:'gemini',language:'hinglish',autoPaper:false,autoAttempt:false};
 const uuid=()=>{const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)};
 const status=()=>({signedIn:true,ready:true,user:'qa-only-user',preferences:prefs,connections:c?[c]:[]});
 const output={summary:'DEMO REPORT — interface test only. Practise SQL grouping and revise percentages. No model was called.',strengths:['You identified the middle value.'],focusTopics:[{topic:'SQL grouping',evidence:'One sample answer needs revision.',practice:'Write three small GROUP BY queries.'}],questionFeedback:[{questionId:'2',explanation:'HAVING filters grouped rows. Review the original solution before relying on an AI explanation.',keyCheck:'Compare against the supplied answer key.'}],nextSteps:['Practise five questions, then review your reasoning.'],updates:[],limitations:['This is a labelled UI test fixture, not real AI output.']};
 window.fetch=async(url,options={})=>{
  if(!String(url).startsWith('/api/ai/'))return original(url,options);
  const input=options.body?JSON.parse(options.body):{};let response={};
  if(url==='/api/ai/status')response=status();
  else if(url==='/api/ai/connect'){c={provider:input.provider,model:'demo-fast-model',models:[{id:'demo-fast-model',name:'Demo fast model'}],connectedAt:new Date().toISOString()};prefs.provider=input.provider;response={connection:c}}
  else if(url==='/api/ai/settings'){prefs={...prefs,...input};response={preferences:prefs}}
  else if(url==='/api/ai/connection'){c=null;response={disconnected:true}}
  else if(url==='/api/ai/jobs'&&options.method==='POST'){
   const id='0000000000000-'+uuid(),job={id,kind:input.kind,title:input.paper?.title||'Demo learning brief',provider:c.provider,model:c.model,status:'completed',createdAt:new Date().toISOString(),metrics:null,sources:[],output:{...output,questionFeedback:input.kind==='attempt'?output.questionFeedback:[]}};jobs.set(id,job);response=job;
  }else if(String(url).startsWith('/api/ai/jobs/')){const id=String(url).split('/').pop();if(options.method==='DELETE'){jobs.delete(id);response={deleted:true}}else response=jobs.get(id)||{error:'No QA report found'}}
  else if(String(url).startsWith('/api/ai/jobs'))response={items:[...jobs.values()].reverse(),cursor:null};
  else if(url==='/api/ai/models')response={connection:c};
  return new Response(JSON.stringify(response),{status:200,headers:{'content-type':'application/json'}});
 };
 document.addEventListener('DOMContentLoaded',()=>{const banner=document.createElement('div');banner.textContent='LOCAL UI TEST — synthetic account and simulated provider; no real AI calls';banner.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#743f94;color:white;text-align:center;padding:6px;font-size:11px;z-index:9999';document.body.append(banner)});
})();`}
