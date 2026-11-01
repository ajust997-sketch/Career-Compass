// College previous papers (route #papers).
// Concatenated into the app bundle by cf/build.mjs, after practice.js, so it can
// use the app's helpers: $, esc, heading, toast, icon, api, navigate, store,
// PaperCore, extractPaper, persistMock, paintMock and the mock state
// (paper, mockAttempt, mockResult). Server API: cf/papers-api.js.

nav.push(['papers','College previous papers','pen']);
Object.assign(dict.hi,{papers:'कॉलेज पिछले पेपर'});Object.assign(dict.hinglish,{papers:'College previous papers'});

let ppItems=[],ppMe=null,ppOpen=null,ppEditing=false,ppUploading=false,ppAiUndo=null,ppFilter={q:'',college:'',subject:''};
const PP_EXAMS=['Mid-semester','End-semester','Quiz / class test','Practical','Other'];
const ppSignIn=()=>'<a class="btn primary" href="/auth/google?return_to='+encodeURIComponent('/#papers')+'">Continue with Google</a>';
const ppMeta=p=>[p.college,p.course,p.branch,p.subject,p.semester&&('Sem '+p.semester),p.year,p.examType].filter(Boolean).map(esc).join(' · ');
const ppCountQs=text=>{try{return PaperCore.parse(text).length}catch{return 0}};

function papersPage(){return '<div class="fade-in">'+heading('College previous papers.','Find past papers from your college, share one you have, and turn any paper into a timed mock test.','<button class="btn primary" id="pp-new">+ Upload a paper</button>')+'<div id="pp-panel"></div><div class="filter-bar pp-filters"><input id="pp-q" type="search" placeholder="Search title, subject, college…" value="'+esc(ppFilter.q)+'"><select id="pp-college"><option value="">All colleges</option></select><select id="pp-subject"><option value="">All subjects</option></select></div><div id="pp-list" class="pp-list"><p class="loading">Loading papers…</p></div></div>'}

async function ppLoad(){
 try{const [list,me]=await Promise.all([api('/api/papers'),api('/api/papers/me')]);ppItems=list.items||[];ppMe=me}catch(e){ppItems=[];if($('#pp-list'))$('#pp-list').innerHTML='<div class="callout peach">'+esc(e.message)+'</div>';return}
 ppPaintFilters();ppPaintList();if(ppOpen)ppPaintPanel();
}
function ppPaintFilters(){
 const uniq=k=>[...new Set(ppItems.map(p=>p[k]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 const fill=(id,k,label)=>{const el=$(id);if(el)el.innerHTML='<option value="">'+label+'</option>'+uniq(k).map(v=>'<option '+(ppFilter[k]===v?'selected':'')+'>'+esc(v)+'</option>').join('')};
 fill('#pp-college','college','All colleges');fill('#pp-subject','subject','All subjects');
}
function ppPaintList(){
 const el=$('#pp-list');if(!el)return;const q=ppFilter.q.toLowerCase();
 const items=ppItems.filter(p=>(!ppFilter.college||p.college===ppFilter.college)&&(!ppFilter.subject||p.subject===ppFilter.subject)&&(!q||[p.title,p.subject,p.college,p.course,p.branch,p.year].join(' ').toLowerCase().includes(q)));
 el.innerHTML=items.length?items.map(p=>'<article class="panel pp-card"><div><span class="tag">'+esc(p.examType||'Paper')+'</span><h3>'+esc(p.title)+'</h3><p class="muted">'+ppMeta(p)+'</p><small class="muted">'+(p.questions||0)+' questions'+(p.hasFile?' · original file attached':'')+' · updated '+esc(String(p.updatedAt||'').slice(0,10))+'</small></div><div class="detail-actions"><button class="btn primary" data-pp-mock="'+esc(p.id)+'">Give as mock →</button><button class="btn outline" data-pp-open="'+esc(p.id)+'">View / edit</button></div></article>').join(''):'<div class="empty"><h3>'+(ppItems.length?'No paper matches your search':'No papers yet')+'</h3><p>'+(ppItems.length?'Try another college or subject.':'Be the first to upload a previous paper from your college.')+'</p></div>';
}

function ppUploadForm(){
 if(!ppMe?.signedIn)return '<section class="panel"><h2>Upload a previous paper</h2><p>Sign in with Google to upload. Browsing and giving mocks does not need sign-in.</p><div class="detail-actions">'+ppSignIn()+'<button class="text-btn" id="pp-close">Cancel</button></div></section>';
 return '<section class="panel pp-form"><div class="section-head"><div><span class="eyebrow">SHARE A PAPER</span><h2>Upload a previous paper</h2></div><button class="text-btn" id="pp-close">Close</button></div>'
 +'<label class="upload-zone" for="pp-file"><span class="square-icon">'+icon('book')+'</span><strong>Choose the paper (PDF, JPG, PNG, TXT or JSON)</strong><small>Text is read in your browser. Scanned pages use OCR, so check the result.</small><input type="file" id="pp-file" accept=".pdf,.png,.jpg,.jpeg,.txt,.json"></label><div id="extract-status" class="form-help" role="status"></div>'
 +'<div class="two-fields"><div><label for="ocr-language">Scan language</label><select id="ocr-language"><option value="eng">English</option><option value="hin+eng">Hindi + English</option></select></div><div><label class="check-label"><input type="checkbox" id="pp-attach" checked> Also attach the original file (max 5 MB)</label></div></div>'
 +ppMetaFields({})
 +'<label for="pp-text">Questions (editable)</label><textarea id="pp-text" rows="14" placeholder="1. Question text&#10;A. First option&#10;B. Second option&#10;C. Third option&#10;D. Fourth option&#10;Answer: B&#10;Topic: Unit 2"></textarea><p class="form-help" id="pp-count"></p>'
 +'<label for="pp-key">Separate answer key (optional)</label><input id="pp-key" placeholder="1:B, 2:C, 3:A">'
 +ppAiBox()
 +'<label class="check-label"><input type="checkbox" id="pp-rights"> I can share this paper, and it has no personal details (names, roll numbers, phone numbers).</label>'
 +'<p id="pp-error" class="form-error" role="alert"></p><div class="detail-actions"><button class="btn primary" id="pp-submit">Upload paper</button></div></section>';
}
function ppMetaFields(p){return '<div class="two-fields"><div><label for="pp-title">Paper title *</label><input id="pp-title" maxlength="160" value="'+esc(p.title||'')+'" placeholder="DSA End-semester 2025"></div><div><label for="pp-college-in">College *</label><input id="pp-college-in" maxlength="120" value="'+esc(p.college||'')+'" placeholder="GBPUAT Pantnagar"></div></div>'
 +'<div class="two-fields"><div><label for="pp-subject-in">Subject *</label><input id="pp-subject-in" maxlength="120" value="'+esc(p.subject||'')+'" placeholder="Data Structures"></div><div><label for="pp-course">Course / branch</label><input id="pp-course" maxlength="80" value="'+esc(p.course||'')+'" placeholder="B.Tech CSE"></div></div>'
 +'<div class="two-fields"><div><label for="pp-year">Year</label><input id="pp-year" maxlength="9" value="'+esc(p.year||'')+'" placeholder="2025"></div><div><label for="pp-sem">Semester</label><input id="pp-sem" maxlength="20" value="'+esc(p.semester||'')+'" placeholder="3"></div></div>'
 +'<label for="pp-exam">Exam type</label><select id="pp-exam">'+PP_EXAMS.map(x=>'<option '+(p.examType===x?'selected':'')+'>'+x+'</option>').join('')+'</select>'}
function ppAiBox(){return '<div class="callout pp-ai"><div><strong>Edit with your AI</strong><p class="form-help">Uses your own connected Gemini or Claude (<a href="#ai">AI page</a>). Nothing is saved until you press save. AI answers can be wrong, so check them.</p><div class="pp-ai-row"><input id="pp-ai-instruction" maxlength="1500" placeholder="e.g. Fix OCR mistakes and put it in question format. Don\'t invent answers."><button class="btn outline" id="pp-ai-run">Run AI edit</button></div><div class="pp-ai-quick"><button class="text-btn" data-pp-ai-quick="Convert this raw text into the question format, fix spelling and OCR mistakes, keep all questions. Do not invent answers.">Format OCR text</button><button class="text-btn" data-pp-ai-quick="Add the correct answer for every question that has no answer, with a short explanation.">Add answers</button><button class="text-btn" data-pp-ai-quick="Add a Topic line to every question based on its subject unit.">Add topics</button><button class="text-btn" data-pp-ai-quick="Translate every question and option into simple English, keeping the format.">Translate to English</button></div><p id="pp-ai-status" class="form-help" role="status"></p></div></div>'}

function ppPaintPanel(){
 const el=$('#pp-panel');if(!el)return;
 if(ppUploading){el.innerHTML=ppUploadForm();ppUpdateCount();return}
 if(!ppOpen){el.innerHTML='';return}
 const p=ppOpen,signed=ppMe?.signedIn;
 el.innerHTML='<section class="panel pp-view"><div class="section-head"><div><span class="eyebrow">'+esc(p.examType||'PAPER')+'</span><h2>'+esc(p.title)+'</h2><p class="muted">'+ppMeta(p)+' · '+(p.questions||0)+' questions</p></div><button class="text-btn" id="pp-close">Close</button></div>'
 +'<div class="detail-actions"><button class="btn primary" data-pp-mock="'+esc(p.id)+'">Give as mock →</button>'+(p.file?'<a class="btn outline" href="/api/papers/'+esc(p.id)+'/file" target="_blank" rel="noopener">Original file ↗</a>':'')+(signed&&!ppEditing?'<button class="btn outline" id="pp-edit">Edit</button>':'')+(!signed?ppSignIn().replace('btn primary','btn outline').replace('Continue with Google','Sign in to edit'):'')+'</div>'
 +(ppEditing?ppMetaFields(p)+'<label for="pp-text">Questions</label><textarea id="pp-text" rows="16">'+esc(p.text)+'</textarea><p class="form-help" id="pp-count"></p><label for="pp-key">Separate answer key (optional)</label><input id="pp-key" value="'+esc(p.answerKey||'')+'">'+ppAiBox()+'<label for="pp-note">What did you change?</label><input id="pp-note" maxlength="200" placeholder="Fixed Q4 options"><p id="pp-error" class="form-error" role="alert"></p><div class="detail-actions"><button class="btn primary" id="pp-save">Save changes</button><button class="btn outline" id="pp-cancel-edit">Cancel</button></div>'
  :'<pre class="pp-text">'+esc(p.text)+'</pre>'+(p.answerKey?'<p class="form-help">Answer key: '+esc(p.answerKey)+'</p>':''))
 +(p.revisions?.length?'<details class="pp-revisions"><summary>Edit history ('+p.revisions.length+')</summary>'+p.revisions.map((r,i)=>'<div class="pp-rev"><span>'+esc(String(r.at||'').slice(0,16).replace('T',' '))+' · '+esc(r.note||'Edit')+'</span>'+(signed?'<button class="text-btn" data-pp-restore="'+i+'">Restore this version</button>':'')+'</div>').join('')+'</details>':'')
 +'<div class="detail-actions pp-danger">'+(signed&&!p.reportedByMe?'<button class="text-btn" id="pp-report">Report wrong or unsafe paper</button>':'')+(p.reportedByMe?'<span class="muted">You reported this paper.</span>':'')+(p.canDelete?'<button class="text-btn" id="pp-delete">Delete paper</button>':'')+'</div><div id="pp-confirm"></div></section>';
 ppUpdateCount();el.scrollIntoView({behavior:'smooth',block:'start'});
}
function ppUpdateCount(){const t=$('#pp-text'),c=$('#pp-count');if(t&&c){const n=ppCountQs(t.value);c.textContent=n?n+' question(s) detected in mock format.':'No questions detected yet. Use the format shown, or try "Format OCR text" with AI.'}}
function ppReadForm(){return {title:$('#pp-title').value,college:$('#pp-college-in').value,subject:$('#pp-subject-in').value,course:$('#pp-course').value,year:$('#pp-year').value,semester:$('#pp-sem').value,examType:$('#pp-exam').value,text:$('#pp-text').value,answerKey:$('#pp-key').value}}
const ppFileData=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('The file could not be read.'));r.readAsDataURL(file)});

function ppStartMock(p){
 const questions=PaperCore.applyKey(PaperCore.parse(p.text),p.answerKey||'');
 paper={title:p.title,goal:labGoal,questions,minutes:Math.max(10,Math.min(180,questions.length*2)),marking:{correct:1,wrong:0},covered:[],sourcePaper:p.id};
 mockAttempt=null;mockResult=null;clearInterval(mockTimer);persistMock();navigate('mock');toast('Paper loaded. Check the questions, then start the timed attempt.');
}

const ppPreviousRoute=setRoute;
setRoute=function(value){
 if(value!=='papers')return ppPreviousRoute(value);
 if(roomPoll){clearInterval(roomPoll);roomPoll=null}
 route='papers';renderNav();$('#view').innerHTML=papersPage();hydrateIcons($('#view'));applyLanguage();closeMenu();document.title='College previous papers — Career Compass';window.scrollTo(0,0);ppLoad();
};

document.addEventListener('input',e=>{if(route!=='papers')return;if(e.target.id==='pp-q'){ppFilter.q=e.target.value;ppPaintList()}if(e.target.id==='pp-text')ppUpdateCount()});
document.addEventListener('change',async e=>{
 if(route!=='papers')return;const t=e.target;
 if(t.id==='pp-college'){ppFilter.college=t.value;ppPaintList()}
 if(t.id==='pp-subject'){ppFilter.subject=t.value;ppPaintList()}
 if(t.id==='pp-file'&&t.files[0]){
  const file=t.files[0];$('#pp-error').textContent='';
  try{$('#extract-status').textContent='Reading your file…';const text=await extractPaper(file);$('#pp-text').value=String(text).trim();ppUpdateCount();$('#extract-status').textContent='Text extracted. Check it below, or use "Format OCR text" with AI.';if(!$('#pp-title').value)$('#pp-title').value=file.name.replace(/\.[^.]+$/,'').slice(0,160)}
  catch(err){$('#extract-status').textContent='';$('#pp-error').textContent=err.message}
 }
});
document.addEventListener('click',async e=>{
 if(route!=='papers')return;const b=e.target.closest('button');if(!b)return;
 try{
  if(b.id==='pp-new'){ppUploading=true;ppOpen=null;ppEditing=false;ppAiUndo=null;ppPaintPanel();$('#pp-panel').scrollIntoView({behavior:'smooth'})}
  if(b.id==='pp-close'){ppUploading=false;ppOpen=null;ppEditing=false;ppPaintPanel()}
  if(b.dataset.ppOpen){ppUploading=false;ppEditing=false;ppAiUndo=null;ppOpen=await api('/api/papers/'+b.dataset.ppOpen);ppPaintPanel()}
  if(b.dataset.ppMock){
   if(mockAttempt&&!confirm('You have a mock attempt in progress. Replace it with this paper?'))return;
   const p=ppOpen?.id===b.dataset.ppMock?ppOpen:await api('/api/papers/'+b.dataset.ppMock);ppStartMock(p)}
  if(b.id==='pp-edit'){ppEditing=true;ppAiUndo=null;ppPaintPanel()}
  if(b.id==='pp-cancel-edit'){ppEditing=false;ppPaintPanel()}
  if(b.dataset.ppAiQuick){$('#pp-ai-instruction').value=b.dataset.ppAiQuick;$('#pp-ai-run').click()}
  if(b.id==='pp-ai-run'){
   const instruction=$('#pp-ai-instruction').value.trim(),text=$('#pp-text').value;if(!instruction)throw Error('Write what the AI should change.');
   b.disabled=true;$('#pp-ai-status').textContent='Your AI is editing the paper… this can take up to 30 seconds.';
   try{const r=await api('/api/papers/ai',{text,instruction});ppAiUndo=text;$('#pp-text').value=r.text;ppUpdateCount();$('#pp-ai-status').innerHTML='Done with '+esc(r.provider)+' ('+esc(r.model)+'). Check the result before saving. <button class="text-btn" id="pp-ai-undo">Undo AI change</button>'}
   finally{b.disabled=false}
  }
  if(b.id==='pp-ai-undo'&&ppAiUndo!==null){$('#pp-text').value=ppAiUndo;ppAiUndo=null;ppUpdateCount();$('#pp-ai-status').textContent='AI change undone.'}
  if(b.id==='pp-submit'){
   const data=ppReadForm();if(!$('#pp-rights').checked)throw Error('Please confirm you can share this paper and it has no personal details.');
   if(!ppCountQs(data.text))throw Error('No questions detected. Put the paper in question format first (AI "Format OCR text" can help).');
   const file=$('#pp-file')?.files?.[0];
   if(file&&$('#pp-attach').checked&&/\.(pdf|png|jpe?g)$/i.test(file.name)){if(file.size>5*1024*1024)throw Error('The original file is over 5 MB. Untick "attach original file" or use a smaller file.');data.file={name:file.name,type:file.type||'application/pdf',data:await ppFileData(file)}}
   b.disabled=true;try{ppOpen=await api('/api/papers',{...data,rights:true});ppUploading=false;toast('Paper uploaded. Thank you for sharing!');await ppLoad()}finally{b.disabled=false}
  }
  if(b.id==='pp-save'){b.disabled=true;try{ppOpen=await api('/api/papers/'+ppOpen.id,{...ppReadForm(),note:$('#pp-note').value},'PUT');ppEditing=false;toast('Changes saved.');await ppLoad()}finally{b.disabled=false}}
  if(b.dataset.ppRestore){ppOpen=await api('/api/papers/'+ppOpen.id+'/restore',{index:Number(b.dataset.ppRestore)});toast('Older version restored.');await ppLoad()}
  if(b.id==='pp-report')$('#pp-confirm').innerHTML='<div class="callout peach"><div>Report this paper as wrong, spam or unsafe? Papers with 3 reports are hidden.<div class="detail-actions"><button class="btn outline" id="pp-report-yes">Report</button><button class="text-btn" id="pp-confirm-no">Cancel</button></div></div></div>';
  if(b.id==='pp-report-yes'){ppOpen=await api('/api/papers/'+ppOpen.id+'/report',{});toast('Thanks, the paper was reported.');await ppLoad()}
  if(b.id==='pp-delete')$('#pp-confirm').innerHTML='<div class="callout peach"><div>Delete this paper for everyone? This cannot be undone.<div class="detail-actions"><button class="btn outline" id="pp-delete-yes">Delete paper</button><button class="text-btn" id="pp-confirm-no">Keep paper</button></div></div></div>';
  if(b.id==='pp-confirm-no')$('#pp-confirm').innerHTML='';
  if(b.id==='pp-delete-yes'){await api('/api/papers/'+ppOpen.id,{},'DELETE');ppOpen=null;toast('Paper deleted.');await ppLoad();ppPaintPanel()}
 }catch(err){const box=$('#pp-error')||$('#pp-ai-status');if(box&&$('#pp-panel')?.contains(box))box.textContent=err.message;else toast(err.message)}
});
