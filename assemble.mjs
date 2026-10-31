import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
const vercel=process.argv.includes('--vercel');
const html=await readFile('src/app.html','utf8');
const experience=(await readFile('src/experience.js','utf8'))+'\n'+(await readFile('src/paper-core.js','utf8'))+'\n'+(await readFile('src/next.js','utf8'))+'\n'+(await readFile('src/practice.js','utf8'))+'\n'+(await readFile('src/personal-ai.js','utf8'))+'\n'+(await readFile('src/discovery.js','utf8'));
const css=(await readFile('src/app.css','utf8'))+'\n'+(await readFile('src/experience.css','utf8'))+'\n'+(await readFile('src/next.css','utf8'))+'\n'+(await readFile('src/personal-ai.css','utf8'))+'\n'+(await readFile('src/discovery.css','utf8'));
const js=(await readFile('src/app.js','utf8')).replace('/*EXPERIENCE*/',()=>experience);
const data=JSON.parse(await readFile('src/data.json','utf8'));
Object.assign(data,JSON.parse(await readFile('src/lectures.json','utf8')),JSON.parse(await readFile('src/cutoffs.json','utf8')));
Object.assign(data,JSON.parse(await readFile('src/new-data.json','utf8')),JSON.parse(await readFile('src/paid-courses.json','utf8')));
const goals=Object.fromEntries([...data.programs.map(x=>['course:'+x.id,x.name]),...data.careers.map(x=>['career:'+x.id,x.name]),...data.exams.map(x=>['exam:'+x.id,x.name])]);
const complete=html.replace('/*APP_CSS*/',()=>css).replace('/*APP_DATA*/',()=>JSON.stringify(data).replace(/</g,'\\u003c')).replace('/*APP_JS*/',()=>('const NATIVE_SIGNIN_AVAILABLE='+(!vercel)+';\n'+js).replace(/<\/script/gi,'<\\/script'));
const server='const GOAL_CATALOG='+JSON.stringify(goals)+';\nconst AI_GUIDANCE='+JSON.stringify(data.guidance)+';\n'+(await readFile('src/paper-core.js','utf8'))+'\n'+(await readFile('src/community-server.js','utf8'))+'\n'+(await readFile('src/google-auth.js','utf8'))+'\n'+(await readFile('src/ai-server.js','utf8'))+'\n'+(await readFile('src/server.js','utf8'));
async function bundle(contents){const result=await build({stdin:{contents,resolveDir:process.cwd(),sourcefile:'career-compass.js'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',legalComments:'inline'});return result.outputFiles[0].text}
await mkdir('worker',{recursive:true});
await writeFile('worker/index.js','// Assembled from src/ by scripts/assemble.mjs.\n'+await bundle('const NATIVE_SIGNIN_AVAILABLE=true;\nconst HTML='+JSON.stringify(complete)+';\n'+server));
await mkdir('standalone',{recursive:true});
await writeFile('standalone/index.html',complete);
const independent=await bundle('const NATIVE_SIGNIN_AVAILABLE=false;\nconst HTML='+JSON.stringify(complete)+';\n'+server.replace("function sitesMemberHeader(request){return request.headers.get('oai-authenticated-user-id')}", "function sitesMemberHeader(request){return null}").replace("const isOwner=(request,env)=>Boolean(env.OWNER_EMAIL&&request.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.OWNER_EMAIL.toLowerCase());", "const isOwner=()=>false;"));
await writeFile('standalone/worker.js',independent);
if(vercel){
 await mkdir('public/download',{recursive:true});await mkdir('generated',{recursive:true});
 await writeFile('public/index.html',complete);
 await writeFile('public/download/career-compass.html',complete);
 await writeFile('public/robots.txt','User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /auth/\nDisallow: /mcp\n');
 await writeFile('generated/vercel-worker.mjs',independent);
}
console.log('Assembled Career Compass ('+Math.round(complete.length/1024)+' KB HTML)');
