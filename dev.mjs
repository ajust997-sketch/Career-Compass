import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {aiFixtureScript} from './ai-qa-fixture.mjs';
const built=spawnSync(process.execPath,['scripts/assemble.mjs'],{stdio:'inherit'});if(built.status)process.exit(built.status);
const memory=new Map();
const bucket={
 async get(key){const v=memory.get(key);if(!v)return null;const bytes=typeof v.value==='string'?new TextEncoder().encode(v.value):v.value;return {json:async()=>JSON.parse(new TextDecoder().decode(bytes)),text:async()=>new TextDecoder().decode(bytes),body:bytes,httpMetadata:v.options?.httpMetadata,customMetadata:v.options?.customMetadata}},
 async put(key,value,options){memory.set(key,{value,options});return {}},
 async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])memory.delete(key)},
 async list({prefix='',limit=1000,cursor}={}){const keys=[...memory.keys()].filter(k=>k.startsWith(prefix)).sort();const start=cursor?Number(cursor):0,slice=keys.slice(start,start+limit);return {objects:slice.map(key=>({key})),truncated:start+limit<keys.length,cursor:start+limit<keys.length?String(start+limit):undefined}}
};
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url.startsWith('/_qa/personal-ai-mobile')){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><html><head><title>Personal AI mobile QA</title></head><body style="background:#d7dce3;margin:0;display:flex;justify-content:center"><iframe title="Personal AI phone preview" src="/_qa/personal-ai#ai" style="width:390px;height:844px;border:0;background:white"></iframe></body></html>');return}
  if(req.url.startsWith('/_qa/personal-ai')){const html=await readFile('standalone/index.html','utf8');res.writeHead(200,{'content-type':'text/html'});res.end(html.replace('<head>','<head><script>'+aiFixtureScript()+'</script>'));return}
  if(req.url.startsWith('/_qa/mobile')){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><html><head><title>Mobile layout QA</title></head><body style="background:#d7dce3;margin:0;display:flex;justify-content:center"><iframe title="Career Compass phone preview" src="/#overview" style="width:390px;height:844px;border:0;background:white"></iframe></body></html>');return}
  const source=await readFile('worker/index.js','utf8');const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const chunks=[];for await(const c of req)chunks.push(c);
  const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
  const response=await module.default.fetch(request,{BUCKET:bucket},{waitUntil:p=>p.catch(()=>{})});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e.message);res.writeHead(500);res.end('Preview error')}
});
const portArg=process.argv.indexOf('--port');
server.listen(Number(portArg>=0?process.argv[portArg+1]:(process.env.PORT||3000)),'0.0.0.0',()=>console.log('Career Compass preview ready'));
