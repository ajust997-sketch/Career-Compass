// A smaller navigation, source-backed course choices and quiet theme companions.
nav.find(entry=>entry[0]==='overview')[1]='Career Overview';
dict.hi.overview='करियर का अवलोकन';
dict.hinglish.overview='Career Overview';
const overviewRoutes=['overview','government','private','exams','careers','recommend','cutoffs'];


renderNav=function(){
 const groups=[['START HERE',['overview','courses']],['LEARN & PRACTISE',['planner','practice','mock','papers','interview','resources','benefits','industry']],['COMMUNITY & OPPORTUNITIES',['community','competitions','jobs','saved']]];
 $('#nav').innerHTML=`<a class="nav-link ai-nav-link ${route==='ai'?'active':''}" href="#ai" ${route==='ai'?'aria-current="page"':''}>${icon('spark')}<span><strong data-t="ai">Connect AI</strong><small>Gemini · Claude</small></span></a>`+groups.map(([title,ids],i)=>`<details class="nav-group" ${i===0||ids.includes(route)?'open':''}><summary>${title}</summary>${ids.map(id=>{
  const entry=nav.find(x=>x[0]===id),active=route===id||(id==='overview'&&overviewRoutes.includes(route));
  return `<a class="nav-link ${active?'active':''}" href="#${id}" ${route===id?'aria-current="page"':''}>${icon(entry[2])}<span data-t="${id}">${entry[1]}</span></a>`;
 }).join('')}</details>`).join('');
 $('#page-name').textContent=t(route,nav.find(n=>n[0]===route)?.[1]||'Sources');
 $$('.avatar').forEach(e=>e.textContent=(profile.name||'N')[0].toUpperCase());
};

const externalLink=(url,label,cls='text-btn')=>`<a class="${cls}" href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
function paidCourseCard(course){
 const teacher=course.instructor;
 return `<article class="paid-course-card"><div class="paid-course-cover paid-${course.id}"><span class="square-icon">${icon(course.icon)}</span><span>${esc(course.subject)}</span><span class="tag">Paid option</span></div><div class="paid-course-body"><p class="paid-provider">${esc(course.provider)}</p><h3>${esc(course.name)}</h3><div class="skills-row"><span class="tag">${esc(course.level)}</span><span class="tag">${esc(course.language)}</span></div><p>${esc(course.why)}</p><dl class="course-facts"><div><dt>What you’ll learn</dt><dd>${esc(course.learn)}</dd></div><div><dt>Before you start</dt><dd>${esc(course.before)}</dd></div></dl><div class="instructor-strip"><span class="instructor-initials" aria-hidden="true">${teacher.initials}</span><div><strong>${esc(teacher.name)}</strong><small>${esc(teacher.teaching)}</small></div></div><details class="instructor-story"><summary>Instructor career summary & sources</summary><p class="instructor-role">${esc(teacher.role)}</p><p>${esc(teacher.bio)}</p><h4>Career at a glance</h4><ul>${teacher.milestones.map(item=>`<li>${esc(item)}</li>`).join('')}</ul><h4>How long have they taught?</h4><p>${esc(teacher.teachingNote)}</p><p class="form-help">Short editorial biography, based on the sources below.</p><div class="instructor-sources">${teacher.sources.map(source=>externalLink(source.url,source.label)).join('')}</div></details><div class="paid-course-actions">${externalLink(course.url,'View course','btn primary')}${externalLink(teacher.linkedin,'LinkedIn profile','btn outline')}</div><p class="course-access">${esc(course.access)} · Preview lessons and check current access, refund and renewal terms before paying.</p></div></article>`;
}

function matchingPaidCourses(key){
 // These are skill courses, not verified exam-preparation packages.
 if(key.startsWith('exam:'))return [];
 const tags=tagsFor(key);
 return (D.paidCourses||[]).filter(course=>course.tags.some(tag=>tags.includes(tag)));
}
function paidCourseSection(key){
 const matches=matchingPaidCourses(key);
 return `<details class="extras-disclosure paid-goal-section"><summary>Paid courses & instructor profiles${matches.length?' · '+matches.length+' options':''}</summary><p class="form-help">Optional skill courses. These do not replace a degree or an official exam syllabus.</p>${matches.length?`<div class="paid-course-grid">${matches.map(paidCourseCard).join('')}</div>`:'<p>No paid course has been verified for this specific path yet. Use the free subject resources below, or browse the wider skills catalogue.</p>'}<button class="btn outline" data-paid-library>Browse all paid courses ${icon('arrow')}</button></details>`;
}
const originalGoalExtras=goalExtras;
goalExtras=function(key){return originalGoalExtras(key)+paidCourseSection(key)};

const originalCoursePage=coursePage;
coursePage=function(){return originalCoursePage().replace('<div class="filter-bar">',`<section class="paid-library-banner"><div><span class="eyebrow">MEET THE PERSON BEHIND THE COURSE</span><h2>Considering a paid course?</h2><p>Compare what you’ll learn, the skills you need and your instructor’s career.</p></div><button class="btn outline" data-paid-library>Courses & instructors ${icon('arrow')}</button></section><div class="filter-bar">`)};

resources=function(){
 return `<div class="fade-in">${heading('Learn something worth keeping.','Free resources and optional paid courses, with clear information about the people teaching you.')}<div class="resource-tabs" aria-label="Learning resource type"><button class="chip active" data-library="lectures" aria-pressed="true">Free video lectures</button><button class="chip" data-library="materials" aria-pressed="false">Reading & practice</button><button class="chip" data-library="paid" aria-pressed="false">Paid courses & instructors</button></div><div class="filter-bar"><div class="input-wrap">${icon('search')}<input id="learning-search" type="search" placeholder="Search lectures, subject or educator…" aria-label="Search learning resources"></div><select id="learning-language" aria-label="Course or lecture language"><option value="all">All languages</option><option value="Hindi">Hindi / Hinglish</option><option value="English">English</option></select><select id="paid-subject" aria-label="Paid course subject" hidden><option value="all">All subjects</option>${(D.paidCourses||[]).map(c=>`<option value="${esc(c.subject)}">${esc(c.subject)}</option>`).join('')}</select></div><div id="free-learning-note">${lectureNotice()}</div><div id="paid-learning-note" class="paid-library-note" hidden><strong>Choose the fit, then check the fee.</strong><p>Four curated starting points in coding, AI and design. Recommendations reflect the curriculum and prerequisites, not a ranking. Current prices and availability are on the provider’s website; no affiliate links are used.</p><small>Sources reviewed ${esc(D.paidCoursesReviewedAt)}. Experience claims are attributed; unconfirmed start dates are marked. LinkedIn may ask you to sign in.</small></div><div id="learning-results" aria-live="polite"></div></div>`;
};
const originalUpdateLearning=updateLearning;
updateLearning=function(){
 const paid=libraryMode==='paid';
 $('#paid-subject').hidden=!paid;
 $('#paid-learning-note').hidden=!paid;
 $('#free-learning-note').hidden=paid;
 $('#learning-language').hidden=libraryMode==='materials';
 $('#learning-search').placeholder=paid?'Search Python, Figma, instructor…':'Search resources, subject or educator…';
 $$('[data-library]').forEach(button=>{button.classList.toggle('active',button.dataset.library===libraryMode);button.setAttribute('aria-pressed',String(button.dataset.library===libraryMode))});
 if(!paid)return originalUpdateLearning();
 const q=$('#learning-search').value.trim().toLowerCase(),subject=$('#paid-subject').value,language=$('#learning-language').value;
 const matches=(D.paidCourses||[]).filter(course=>(subject==='all'||course.subject===subject)&&(language==='all'||course.language.includes(language))&&[course.name,course.subject,course.instructor.name,course.provider,course.learn].join(' ').toLowerCase().includes(q));
 $('#learning-results').innerHTML=matches.length?`<div class="paid-course-grid">${matches.map(paidCourseCard).join('')}</div>`:'<div class="empty"><h3>No matching paid course yet</h3><p>Try a different subject, instructor or language. Free lectures are available in the other tab.</p></div>';
};

// Original vector artwork; embedded in every export, with no external image requests.
function themeCharacterArt(theme){
 if(theme==='minecraft')return `<svg class="theme-character-svg" viewBox="0 0 300 180" aria-hidden="true" focusable="false"><rect x="16" y="148" width="268" height="14" fill="#8ca562"/><path d="M16 162h268v14H16z" fill="#ba9373"/><path d="M16 162h32v7H16zm58 7h32v7H74zm146-7h25v7h-25z" fill="#9b775b"/><rect x="222" y="21" width="28" height="28" fill="#f4d99a"/><path d="M32 48h38v11H32zm12-10h16v10H44zM228 75h44v9h-44zm13-9h20v9h-20z" fill="#fffefa"/><path d="M90 87h28v50H90zm28 0h27v50h-27z" fill="#547f93"/><path d="M92 126h22v29H92zm29 0h22v29h-22z" fill="#6e668e"/><path d="M89 151h27v7H89zm31 0h27v7h-27z" fill="#4f5062"/><rect x="91" y="43" width="50" height="45" fill="#c38b65"/><path d="M91 43h50v13H91zm0 13h8v12h-8zm42 0h8v12h-8z" fill="#664a39"/><path d="M101 64h9v7h-9zm22 0h9v7h-9z" fill="#f8f2de"/><path d="M105 64h5v7h-5zm18 0h5v7h-5z" fill="#54668e"/><path d="M109 77h18v6h-18z" fill="#704c38"/><path d="M74 89h16v41H74zm71 0h16v41h-16z" fill="#c38b65"/><path d="M74 87h16v14H74zm71 0h16v14h-16z" fill="#588f9b"/><path d="M85 111h29v24H85zm29 0h29v24h-29z" fill="#fff5db"/><path d="M85 133h58v4H85zm28-22h3v24h-3z" fill="#bd9569"/><rect x="193" y="98" width="30" height="45" fill="#84a85d"/><path d="M183 67h49v36h-49z" fill="#91b869"/><path d="M189 72h10v9h-10zm27 9h10v10h-10zm-14 11h8v9h-8z" fill="#a8c681"/><path d="M192 79h10v9h-10zm22 0h10v9h-10zm-12 8h12v16h-12zm-6 7h24v9h-24z" fill="#3c563b"/><path d="M185 137h20v18h-20zm28 0h20v18h-20z" fill="#739750"/><path d="M184 152h22v6h-22zm28 0h23v6h-23z" fill="#4e6b3e"/><rect x="46" y="125" width="20" height="23" fill="#bd9872"/><rect x="44" y="119" width="24" height="9" fill="#87a66a"/></svg>`;
 if(theme==='amongus')return `<svg class="theme-character-svg" viewBox="0 0 300 180" aria-hidden="true" focusable="false"><ellipse cx="151" cy="157" rx="126" ry="12" fill="#dddced"/><path d="M46 25h4v13h-4zm-5 5h14v4H41zm197 6h4v13h-4zm-5 5h14v4h-14z" fill="#d9bf81"/><circle cx="173" cy="25" r="3" fill="#aaa8d3"/><circle cx="266" cy="93" r="3" fill="#aaa8d3"/><circle cx="28" cy="92" r="3" fill="#aaa8d3"/><path d="M70 83c-14-4-21 3-21 17v28c0 10 6 15 21 13z" fill="#453f5b"/><path d="M69 91c-8-2-12 2-12 11v25c0 5 3 8 12 7z" fill="#ac5970"/><path d="M65 88c0-29 13-43 39-43s41 16 41 43v62c0 9-6 13-17 13h-12v-25h-12v25H83c-12 0-18-5-18-15z" fill="#453f5b"/><path d="M73 89c0-24 10-36 31-36s33 13 33 36v60c0 4-4 6-13 6v-25H96v25H83c-7 0-10-3-10-8z" fill="#cb7187"/><path d="M99 67h31c13 0 20 8 20 19s-8 19-20 19h-31c-13 0-20-8-20-19s7-19 20-19z" fill="#453f5b"/><path d="M99 75h31c8 0 12 4 12 11s-4 11-12 11h-31c-8 0-12-4-12-11s4-11 12-11z" fill="#b8dbe5"/><path d="M98 77h22c5 0 5 5 0 5H98c-5 0-5-5 0-5z" fill="#f5fbfc"/><path d="M229 94c14-4 21 3 21 17v26c0 10-7 15-21 12z" fill="#453f5b"/><path d="M230 102c8-2 12 2 12 11v22c0 5-4 8-12 6z" fill="#57989c"/><path d="M164 102c0-29 14-43 35-43s36 14 36 43v48c0 9-7 13-17 13h-13v-22h-11v22h-13c-11 0-17-5-17-14z" fill="#453f5b"/><path d="M172 102c0-24 10-35 27-35s28 12 28 35v47c0 4-3 6-14 6v-22h-27v22h-5c-7 0-9-3-9-8z" fill="#80bbc0"/><path d="M173 80h29c13 0 20 8 20 19s-7 19-20 19h-29c-13 0-20-8-20-19s7-19 20-19z" fill="#453f5b"/><path d="M173 88h29c8 0 12 4 12 11s-4 11-12 11h-29c-8 0-12-4-12-11s4-11 12-11z" fill="#c9e2ed"/><path d="M172 90h22c5 0 5 5 0 5h-22c-5 0-5-5 0-5z" fill="#f5fbfc"/><path d="m121 120 29 6 28-6v29l-28 6-29-6z" fill="#e2bf7f"/><path d="m126 121 24 5v24l-24-5zm48 0-24 5v24l24-5z" fill="#fff2d4"/><path d="M149 126h3v29h-3z" fill="#bb965d"/></svg>`;
 return '';
}
function characterScene(){return `<div class="theme-character-scene theme-minecraft">${themeCharacterArt('minecraft')}<span>Build your next skill, one block at a time.</span></div><div class="theme-character-scene theme-amongus">${themeCharacterArt('amongus')}<span>Your crew. Your next learning mission.</span></div>`}
const originalHeroArt=heroArt;
heroArt=function(){return originalHeroArt()+`<div class="hero-companions">${characterScene()}</div>`};
const originalThemeDialog=themeDialog;
themeDialog=function(){return originalThemeDialog().replace('<strong>Minecraft inspired</strong>',themeCharacterArt('minecraft')+'<strong>Minecraft inspired</strong>').replace('<strong>Among Us inspired</strong>',themeCharacterArt('amongus')+'<strong>Among Us inspired</strong>')};
themes.minecraft.note='A block builder and a friendly Creeper, with grass greens and warm sand.';
themes.amongus.note='Colourful crewmates share a study mission in a soft space palette.';
const originalSetTheme=setTheme;
setTheme=function(value){
 originalSetTheme(value);
 const buddy=$('#theme-buddy');
 if(buddy&&!buddy.hasChildNodes())buddy.innerHTML=characterScene();
};

const discoverySetRoute=setRoute;
setRoute=function(value){
 const paid=value==='paid-courses';
 discoverySetRoute(paid?'resources':value);
 if(paid){libraryMode='paid';updateLearning();document.title='Paid courses & instructors — Career Compass'}
 if(overviewRoutes.includes(route)&&route!=='overview')$('#view').insertAdjacentHTML('afterbegin','<button class="text-btn back-overview" data-route="overview">← Career Overview</button>');
 setTheme(selectedTheme);
};
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-paid-library]');
 if(button){$('#detail-dialog').close();navigate('paid-courses')}
});
document.addEventListener('change',event=>{if(event.target.id==='paid-subject')updateLearning()});
