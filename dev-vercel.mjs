import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const build=spawnSync(process.execPath,['scripts/assemble.mjs','--vercel'],{stdio:'inherit'});
if(build.status)process.exit(build.status);
const {createHandler}=await import('../platform/vercel-handler.mjs');
const handler=createHandler({defer:p=>p.catch(()=>{}),clientIP:req=>req.headers.get('x-dev-client-ip')});
const staticPaths=new Map([['/','public/index.html'],['/index.html','public/index.html'],['/robots.txt','public/robots.txt'],['/download/career-compass.html','public/download/career-compass.html']]);
const server=http.createServer(async(req,res)=>{
 try{
  const proto=req.headers['x-forwarded-proto']==='https'?'https':'http';
  const url=new URL(req.url,proto+'://'+req.headers.host);
  if(staticPaths.has(url.pathname)&&['GET','HEAD'].includes(req.method)){
   const file=staticPaths.get(url.pathname),data=await readFile(file);
   res.writeHead(200,{'content-type':file.endsWith('.html')?'text/html;charset=utf-8':'text/plain;charset=utf-8','x-content-type-options':'nosniff'});
   res.end(req.method==='HEAD'?undefined:data);return;
  }
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>4*1024*1024){res.writeHead(413);res.end('Too large');return}chunks.push(chunk)}
  const headers={...req.headers,'x-dev-client-ip':req.socket.remoteAddress};
  const request=new Request(url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
  const response=await handler(request);
  const responseHeaders=Object.fromEntries(response.headers);
  const cookies=response.headers.getSetCookie();if(cookies.length)responseHeaders['set-cookie']=cookies;
  res.writeHead(response.status,responseHeaders);res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500,{'content-type':'text/plain'});res.end('Local preview error')}
});
const portArg=process.argv.indexOf('--port');
server.listen(Number(portArg>=0?process.argv[portArg+1]:(process.env.PORT||3000)),'0.0.0.0',()=>console.log('Career Compass Vercel preview ready'));
