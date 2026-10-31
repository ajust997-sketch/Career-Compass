import {createRemoteJWKSet,jwtVerify,customFetch} from 'jose';

// Additional learner sign-in for this public Site. Sites still owns its own
// sign-in routes, access policy, trusted headers and owner permissions.
const GOOGLE_SESSION='__Host-cc_google_session',GOOGLE_CHALLENGE='__Host-cc_google_challenge';
const googleClient=env=>/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_OAUTH_CLIENT_ID||'')?env.GOOGLE_OAUTH_CLIENT_ID:null;
const googleReady=env=>Boolean(env.BUCKET&&googleClient(env));
const authError=(message,status=400)=>Object.assign(new Error(message),{status});
const authRandom=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const authEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const authReturn=value=>['/#ai','/#community','/#mock'].includes(value)?value:'/#ai';
function sitesMemberHeader(request){return request.headers.get('oai-authenticated-user-id')}
function authCookie(request,name){const matches=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));return matches.length===1?matches[0].slice(name.length+1):null}
const authSetCookie=(name,value,age)=>name+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+age;
function authSameOrigin(request){return request.headers.get('origin')===new URL(request.url).origin&&canWrite(request)}
async function googleSession(request,env){
 if(!googleReady(env))return null;
 const token=authCookie(request,GOOGLE_SESSION);if(!/^[a-f0-9]{64}$/.test(token||''))return null;
 const key='auth/google/sessions/'+await digest(token),saved=await storedJSON(env,key);
 if(!saved||saved.expiresAt<=Date.now()||saved.client!==await digest(googleClient(env))||!/^u[a-f0-9]{32}$/.test(saved.id))return null;
 return {id:saved.id,provider:'google',sessionKey:key};
}
async function appIdentity(request,env){
 const google=await googleSession(request,env);if(google)return google;
 const id=sitesMemberHeader(request);return id?{id:'u'+(await digest(id)).slice(0,32),provider:'chatgpt'}:null;
}
function authPage(title,body,{script='',nonce=authRandom(),status=200,cookies=[]}={}){
 const headers=new Headers({'content-type':'text/html;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','cross-origin-opener-policy':'same-origin-allow-popups','content-security-policy':"default-src 'none'; script-src 'nonce-"+nonce+"' https://accounts.google.com/gsi/client; style-src 'unsafe-inline' https://accounts.google.com/gsi/style; frame-src https://accounts.google.com/gsi/; connect-src 'self' https://accounts.google.com/gsi/; img-src data: https://*.googleusercontent.com; base-uri 'none'; form-action 'self'; frame-ancestors 'self'"});
 for(const c of cookies)headers.append('set-cookie',c);
 return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+authEscape(title)+' — Career Compass</title><style>*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:#f5f6fb;color:#263b35;font-family:system-ui,sans-serif;line-height:1.65;padding:32px 18px}.card{max-width:560px;margin:5vh auto;background:white;border:1px solid #e0e8e3;border-radius:22px;padding:32px;box-shadow:0 12px 40px #253e3610}.brand{font-size:15px;font-weight:750;color:#3f7061;text-decoration:none}h1{font-size:29px;line-height:1.2;margin:30px 0 16px}p{color:#63746e;font-size:15px}.step{font-size:11px;letter-spacing:.12em;color:#6d7194}.note{padding:16px;background:#f1eff9;border-radius:12px;font-size:13px}a{color:#306452;overflow-wrap:anywhere}.action{display:inline-block;border-radius:10px;padding:12px 18px;background:#356b5d;color:white;text-decoration:none;font-size:14px;margin:12px 0}.muted{font-size:12px}#google-button{margin:25px 0;min-height:44px}#login-error{color:#a23f36;font-size:14px}code{overflow-wrap:anywhere}@media(max-width:450px){.card{padding:24px;margin:20px auto}h1{font-size:25px}}</style></head><body><main class="card"><a class="brand" href="/">career compass.</a>'+body+'</main>'+(script?'<script nonce="'+nonce+'">'+script+'</script><script nonce="'+nonce+'" src="https://accounts.google.com/gsi/client" async defer></script>':'')+'</body></html>',{status,headers});
}
async function authStart(request,env,url){
 const back=authReturn(url.searchParams.get('return_to'));
 if(!googleReady(env))return authPage('Google sign-in setup pending','<span class="step"> GOOGLE ACCOUNT</span><h1>Google sign-in is not active yet.</h1><p>The site owner needs to finish Google login setup. You can still browse Career Compass'+(NATIVE_SIGNIN_AVAILABLE?' or use the existing ChatGPT sign-in.':'. Courses, your planner and mock practice are available without an account.')+'</p><p class="note">Signing in with Google and connecting Gemini are separate steps. Gemini analysis uses your personal API connection.</p><a class="action" href="'+authEscape(back)+'">Back to Career Compass</a>',{status:503});
 if(url.protocol!=='https:')throw authError('Google sign-in requires a secure HTTPS connection.',400);
 // Abuse control stores an IP hash only. It is never used as an identity.
 const ip=request.headers.get('cf-connecting-ip')||'unknown';
 try{await aiCounter(env,'auth/google/limits/'+(await digest(ip)).slice(0,32)+'/'+Math.floor(Date.now()/60000),ip==='unknown'?30:12)}catch{throw authError('Too many sign-in attempts. Please try again in a minute.',429)}
 const token=authRandom(),nonce=authRandom(),key='auth/google/challenges/'+await digest(token);
 await putJSON(env,key,{nonce,returnTo:back,expiresAt:Date.now()+10*60000,used:false,client:await digest(googleClient(env))});
 const config=JSON.stringify({clientId:googleClient(env),nonce}).replace(/</g,'\\u003c');
 const script='const config='+config+';let started=false;const error=document.getElementById("login-error");async function receiveGoogle(response){if(started)return;started=true;error.textContent="Checking your Google account…";try{const r=await fetch("/auth/google/verify",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({credential:response.credential})});const result=await r.json();if(!r.ok)throw Error(result.error||"Google sign-in could not be completed.");location.replace(result.returnTo)}catch(e){error.textContent=e.message;document.getElementById("restart").hidden=false;document.getElementById("google-button").hidden=true}}window.addEventListener("load",()=>{if(!window.google?.accounts?.id){error.textContent="Google sign-in could not load. Check your connection and try again.";document.getElementById("restart").hidden=false;return}google.accounts.id.initialize({client_id:config.clientId,nonce:config.nonce,callback:receiveGoogle,auto_select:false,ux_mode:"popup"});google.accounts.id.renderButton(document.getElementById("google-button"),{theme:"outline",size:"large",text:"continue_with",shape:"rectangular",width:Math.min(340,document.getElementById("google-button").clientWidth)})});';
 return authPage('Continue with Google','<p class="step">SIGN IN · THEN CONNECT YOUR AI</p><h1>Your Google account.<br>Your study space.</h1><p>Sign in with the Google account you use for Gemini. No ChatGPT account is required for this option.</p><div id="google-button"></div><p id="login-error" role="status" aria-live="polite"></p><a class="action" id="restart" hidden href="'+authEscape(url.pathname+url.search)+'">Try Google sign-in again</a><p class="note">After sign-in, connect your Gemini API key to generate mock summaries. Your Gemini chat subscription does not connect automatically.</p><p class="muted">'+(NATIVE_SIGNIN_AVAILABLE?'Google and ChatGPT sign-ins have separate saved reports and community profiles. Existing accounts are not merged by email.':'Your Google account keeps your saved reports and community profile private to you.')+'</p><p class="muted">We use a verified Google account identifier and a secure session cookie. <a href="/privacy">Privacy details</a></p><a href="'+authEscape(back)+'">← Back to Career Compass</a>',{script,cookies:[authSetCookie(GOOGLE_CHALLENGE,token,600)]});
}
async function authVerify(request,env){
 if(!googleReady(env))throw authError('The site owner has not activated Google sign-in yet.',503);
 if(!authSameOrigin(request))throw authError('Start Google sign-in from this website.',403);
 if(!request.headers.get('content-type')?.includes('application/json'))throw authError('Use JSON.',415);
 const input=await readSmallJSON(request,20000),token=authCookie(request,GOOGLE_CHALLENGE);
 if(!/^[a-f0-9]{64}$/.test(token||'')||typeof input?.credential!=='string'||input.credential.length>16000)throw authError('Restart Google sign-in and try again.',401);
 const challengeKey='auth/google/challenges/'+await digest(token),stored=await env.BUCKET.get(challengeKey),challenge=stored?await stored.json():null;
 if(!challenge||challenge.used||challenge.expiresAt<=Date.now()||challenge.client!==await digest(googleClient(env)))throw authError('This sign-in expired or was already used. Start again.',401);
 // Claim exactly once before token verification. Failed attempts require a fresh challenge.
 const claimed=await env.BUCKET.put(challengeKey,JSON.stringify({...challenge,used:true}),{onlyIf:{etagMatches:stored.etag}});
 if(claimed===null)throw authError('This sign-in is already being completed. Start again if needed.',409);
 let claims;
 try{
  const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'),{timeoutDuration:8000,[customFetch]:async(url,options)=>{const r=await fetch(url,{...options,redirect:'error'});if(!r.ok)throw Error('Google keys unavailable');const body=await readSmallJSON(r,100000);return Response.json(body)}});
  const verified=await jwtVerify(input.credential,keys,{algorithms:['RS256'],audience:googleClient(env),issuer:['https://accounts.google.com','accounts.google.com'],requiredClaims:['sub','iat','exp','nonce'],maxTokenAge:'10 minutes',clockTolerance:30});
  claims=verified.payload;
  if(claims.nonce!==challenge.nonce||typeof claims.sub!=='string'||!/^[a-zA-Z0-9_-]{1,255}$/.test(claims.sub)||claims.azp&&claims.azp!==googleClient(env))throw Error('Invalid account claims');
 }catch{throw authError('Google sign-in could not be verified. Restart and try again.',401)}
 const sessionToken=authRandom(),sessionKey='auth/google/sessions/'+await digest(sessionToken),id='u'+(await digest('google:'+claims.sub)).slice(0,32);
 await putJSON(env,sessionKey,{id,client:await digest(googleClient(env)),expiresAt:Date.now()+7*86400000});
 const old=authCookie(request,GOOGLE_SESSION);if(/^[a-f0-9]{64}$/.test(old||''))await env.BUCKET.delete('auth/google/sessions/'+await digest(old));
 await env.BUCKET.delete(challengeKey);
 const response=json({signedIn:true,provider:'google',returnTo:authReturn(challenge.returnTo)});
 response.headers.append('set-cookie',authSetCookie(GOOGLE_SESSION,sessionToken,7*86400));response.headers.append('set-cookie',authSetCookie(GOOGLE_CHALLENGE,'',0));return response;
}
async function googleAuthAPI(request,env,url){
 if(url.pathname==='/privacy'&&request.method==='GET')return authPage('Privacy','<h1>Your learning data</h1><p>Public pages can be browsed without an account. When Google sign-in is enabled, Career Compass verifies your Google identity and uses a hashed account identifier. Google email, name, photo, ID tokens and passwords are not saved by this login flow.</p><p>A secure, HTTP-only session cookie keeps Google users signed in for up to seven days. Sign out removes the session. Short-lived login challenges and hashed request counters prevent replay and abuse; they contain no mock papers.</p><p>'+(NATIVE_SIGNIN_AVAILABLE?'Each sign-in provider has a separate account. Google login does not grant access to a ChatGPT account or its reports, even if both use the same email.':'This independently hosted website uses its own accounts and storage. Reports and accounts from the earlier hosted website are not copied automatically.')+'</p><p>Personal AI keys and report contents are encrypted and scoped to your signed-in account. Reviewed paper text is sent to your selected provider only when you request an analysis or enable automatic analysis. Original uploads stay in your browser. Disconnect removes the stored key; reports can be deleted in My AI assistant.</p><p>Community posts and resources are public under your chosen display name. Progress is public only if you opt in. Device-local plans and mock papers stay in browser storage.</p><p>Google sign-in does not connect a Gemini subscription or grant API credit. The selected AI provider’s own terms and charges apply.</p><a class="action" href="/#ai">Back to My AI assistant</a>');
 if(!url.pathname.startsWith('/auth/google'))return null;
 if(url.pathname==='/auth/google'&&request.method==='GET')return authStart(request,env,url);
 if(url.pathname==='/auth/google/verify'&&request.method==='POST')return authVerify(request,env);
 if(url.pathname==='/auth/google/signout'&&request.method==='POST'){
  if(!authSameOrigin(request))throw authError('Sign out from this website.',403);
  const token=authCookie(request,GOOGLE_SESSION);if(env.BUCKET&&/^[a-f0-9]{64}$/.test(token||''))await env.BUCKET.delete('auth/google/sessions/'+await digest(token));
  const response=json({signedOut:true});response.headers.append('set-cookie',authSetCookie(GOOGLE_SESSION,'',0));return response;
 }
 throw authError('Unknown sign-in action.',404);
}
