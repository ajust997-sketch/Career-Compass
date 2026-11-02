// Department photos for courses, careers, exams, lectures, recommendations and previous papers:
// cards, the detail pop-up (with related courses / careers / exams), the course picker and an opened paper.
// Photos are free-licence Unsplash images (https://unsplash.com/license), loaded from
// Unsplash's CDN. If a photo fails to load, the card keeps its old illustration.
// To change a photo: replace the id below with another images.unsplash.com "photo-…" id.
const DEPT_PHOTOS={
 cse:['photo-1542831371-29b0f74f9713','Code on a computer screen'],
 ai:['photo-1677442135703-1787eea5ce01','Circuit board with a brain illustration'],
 it:['photo-1580106815433-a5b1d1d53d85','Data centre corridor'],
 ece:['photo-1562408590-e32931084e23','Electronic circuit board'],
 ee:['photo-1413882353314-73389f63b6fd','Power transmission towers'],
 me:['photo-1711199694531-e982a79ea381','Close-up of machine gears'],
 civil:['photo-1531834685032-c34bf0d84c77','Workers on a building site'],
 bca:['photo-1555099962-4199c345e5dd','Laptop showing code'],
 bscs:['photo-1498050108023-c5249f4df085','Laptop with code on a desk'],
 math:['photo-1509228468518-180dd4864904','System of linear equations'],
 science:['photo-1532094349884-543bc11b234d','Laboratory glassware'],
 bio:['photo-1581594549595-35f6edc7b762','Gloved hands working in a lab'],
 bcom:['photo-1707157284454-553ef0a4ed0d','Desk with financial charts and a calculator'],
 bba:['photo-1542744173-8e7e53415bb0','Team meeting with laptops'],
 arts:['photo-1524995997946-a1c2e315a42f','Library bookshelves'],
 econ:['photo-1611974789855-9c2a0a7236a3','Market chart on a screen'],
 design:['photo-1587440871875-191322ee64b0','Sketching a design on paper'],
 law:['photo-1768839719921-6a554fb3e847','Statue of justice with scales'],
 pharma:['photo-1642055514517-7b52288890ec','Pharmacy shelves'],
 nursing:['photo-1584432810601-6c7f27d2362b','Nurse in uniform'],
 mbbs:['photo-1532938911079-1b06ac7ceec7','Doctor holding a stethoscope'],
 agri:['photo-1615811361523-6bd03d7748e7','Tractor in a green field'],
 hospitality:['photo-1616734755909-bb016ce64930','Chef cooking in a kitchen'],
 paper:['photo-1606326608606-aa0b62935f2b','Student writing an exam paper'],
 general:['photo-1580582932707-520aed937b7b','Empty classroom'],
 government:['photo-1760872646618-13594fc00567','Government building with columns and a dome'],
 cyber:['photo-1614064641938-3bbee52942c7','Padlock on a computer keyboard'],
 data:['photo-1608222351212-18fe0ec7b13b','Laptop showing a data dashboard'],
 gate:['photo-1581091226033-d5c48150dbaa','Engineering students working in a lab'],
 abroad:['photo-1541339907198-e08756dedf3f','Graduates throwing caps in the air'],
 research:['photo-1562789233-495f52b583dd','Researcher using a microscope'],
 marketing:['photo-1519389950473-47ba0277781c','Team working on laptops']
};
// Careers and exams → which photo to use (courses use their own id).
const CAREER_DEPT={software:'cse',data:'data',ml:'ai',cyber:'cyber',cloud:'it',ux:'design',product:'bba',research:'research',embedded:'ece',vlsi:'ece',electrical:'ee',mechanical:'me',civileng:'civil',finance:'bcom',ca:'bcom',marketing:'marketing',lawyer:'law',pharmacist:'pharma',nurse:'nursing',doctor:'mbbs',agritech:'agri',hospitalitycareer:'hospitality',public:'government',bioindustry:'bio'};
const EXAM_DEPT={gate:'gate',cat:'bba',jam:'science',nimcet:'bca',cuet:'arts',upsc:'government',ssc:'government',bank:'bcom',ese:'ee',psu:'ece',cmat:'bba',net:'research',caexam:'bcom',aibe:'law',medical:'mbbs',gpat:'pharma',gre:'abroad'};
// Free lecture sources → photo of their subject (no channel logos or thumbnails).
const LECTURE_DEPT={nptel:'gate',nptelgate:'gate',cs50:'cse',freecodecamp:'bscs',mit:'research',campusx:'ai',statquest:'data',threeblue:'math',gatesmashers:'bca',neso:'ece',figma:'design',icai:'bcom',cec:'arts',ncertvideo:'science',icarvideo:'agri',ibiology:'bio',nursingvideo:'nursing',stanfordmedical:'mbbs',rodha:'bba',adda:'government',drishti:'government',sathee:'paper',toeflvideo:'abroad',hubspotvideo:'marketing'};
const PAID_COURSE_DEPT={'python-angela':'bca','web-hitesh':'bscs','ml-andrew':'ai','figma-daniel':'design'};
// Keyword → department, checked in order (first match wins).
const DEPT_KEYWORDS=[
 ['ai',/\b(ai|artificial intelligence|machine learning|ml|deep learning|data science)\b/],
 ['ece',/\b(ece|electronics?|digital|analog|signals?|communication|vlsi|microprocessors?|microcontrollers?|embedded)\b/],
 ['ee',/\b(ee|electrical|power systems?|machines|circuits?|control systems?)\b/],
 ['it',/\b(information technology|computer networks?|networking|cloud computing|cyber ?security)\b/],
 ['cse',/\b(cse|computer|dsa|data structures?|algorithms?|programming|operating systems?|os|dbms|databases?|software|compiler|toc|automata|oops?|c\+\+|java|python|web)\b/],
 ['bca',/\b(bca|mca)\b/],
 ['math',/\b(maths?|mathematics|discrete|probability|statistics|calculus|algebra|numerical)\b/],
 ['me',/\b(mechanical|thermo\w*|fluids?|manufacturing|mechanics|cad|automobile)\b/],
 ['civil',/\b(civil|structures?|structural|surveying|concrete|geotech\w*|transportation)\b/],
 ['agri',/\b(agri\w*|agronomy|horticulture|soil|crop|forestry|veterinary|dairy|fisheries)\b/],
 ['bio',/\b(bio\w*|life sciences?|microbiology|genetics|botany|zoology)\b/],
 ['science',/\b(physics|chemistry|science)\b/],
 ['pharma',/\b(pharma\w*)\b/],
 ['nursing',/\b(nursing)\b/],
 ['mbbs',/\b(mbbs|medicine|anatomy|physiology|pathology|medical)\b/],
 ['law',/\b(law|llb|legal|constitution)\b/],
 ['econ',/\b(economics?)\b/],
 ['bcom',/\b(b\.?com|commerce|accounting|accounts?|finance|tax\w*|audit\w*)\b/],
 ['bba',/\b(bba|mba|management|marketing|hr|business)\b/],
 ['design',/\b(design|ux|ui)\b/],
 ['hospitality',/\b(hotel|hospitality|catering|tourism)\b/],
 ['arts',/\b(history|political|sociology|english|literature|psychology|philosophy|geography|humanities|hindi)\b/]
];
function deptFor(text){const s=String(text||'').toLowerCase();for(const [k,re] of DEPT_KEYWORDS)if(re.test(s))return k;return 'paper'}
function deptPhotoUrl(key,w=640,h=360){const p=DEPT_PHOTOS[key]||DEPT_PHOTOS.general;return 'https://images.unsplash.com/'+p[0]+'?w='+w+'&h='+h+'&fit=crop&auto=format&q=70'}
function deptPhoto(key,cls,w,h){const p=DEPT_PHOTOS[key]||DEPT_PHOTOS.general;return `<img class="dept-photo ${cls||''}" src="${deptPhotoUrl(key,w,h)}" alt="${esc(p[1])}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`}

// Which photo belongs to a course, career or exam object (null for anything else).
function itemPhotoKey(item){
 if(!item)return null;
 if(D.programs.includes(item))return DEPT_PHOTOS[item.id]?item.id:null;
 if(D.careers.includes(item))return CAREER_DEPT[item.id]||null;
 if(D.exams.includes(item))return EXAM_DEPT[item.id]||null;
 return null;
}
// topicScene draws the banner on course, career and exam cards and in the detail pop-up.
const photosPreviousTopicScene=topicScene;
topicScene=function(item,compact){
 const html=photosPreviousTopicScene(item,compact);const key=itemPhotoKey(item);if(!key)return html;
 return html.replace(/^<div class="topic-scene([^"]*)"/,'<div class="topic-scene$1 has-photo"').replace(/^(<div[^>]*>)/,'$1'+deptPhoto(key,'',800,400));
};

// "Find my direction" recommendations
const photosPreviousRecommend=recommendResults;
recommendResults=function(){
 const html=photosPreviousRecommend();const ranked=rankCareers().slice(0,4);
 const parts=html.split('<div class="recommend-body">');
 return parts.map((part,i)=>{if(!i)return part;const c=ranked[i-1]?.c;const key=c&&CAREER_DEPT[c.id];return '<div class="recommend-body">'+(key?deptPhoto(key,'recommend-photo',900,300):'')+part}).join('');
};

// Course picker (Edit profile): show the selected course's photo
function photosProfilePreview(){
 const select=$('#profile-program');if(!select)return;
 let box=$('#profile-photo');
 if(!box){(document.querySelector('label[for="profile-program"]')||select).insertAdjacentHTML('beforebegin','<div id="profile-photo" class="profile-photo"></div>');box=$('#profile-photo')}
 if(box)box.innerHTML=DEPT_PHOTOS[select.value]?deptPhoto(select.value,'',800,300):'';
}
const photosPreviousOpenProfile=openProfile;
openProfile=function(){photosPreviousOpenProfile();photosProfilePreview()};
document.addEventListener('change',e=>{if(e.target.id==='profile-program')photosProfilePreview()});

// Paid course cards (learning library → paid courses)
const photosPreviousPaidCard=paidCourseCard;
paidCourseCard=function(course){
 const html=photosPreviousPaidCard(course);const key=PAID_COURSE_DEPT[course.id]||deptFor(course.subject);
 return html.replace(`<div class="paid-course-cover paid-${course.id}">`,`<div class="paid-course-cover paid-${course.id} has-photo">${deptPhoto(key,'',640,280)}`);
};

// Previous paper cards
const photosPreviousPaintList=ppPaintList;
ppPaintList=function(){
 photosPreviousPaintList();
 $$('#pp-list .pp-card').forEach(card=>{
  if(card.querySelector('.dept-photo'))return;
  const id=card.querySelector('[data-pp-open]')?.dataset.ppOpen;const p=ppItems.find(x=>x.id===id);if(!p)return;
  const key=deptFor([p.subject,p.branch,p.course,p.title].join(' '));
  card.classList.add('has-photo');card.insertAdjacentHTML('afterbegin',deptPhoto(key,'pp-photo',360,240));
 });
};

// Opened paper (view / edit panel)
const photosPreviousPaintPanel=ppPaintPanel;
ppPaintPanel=function(){
 photosPreviousPaintPanel();
 const view=$('#pp-panel .pp-view');if(!view||!ppOpen||view.querySelector('.dept-photo'))return;
 const key=deptFor([ppOpen.subject,ppOpen.branch,ppOpen.course,ppOpen.title].join(' '));
 view.insertAdjacentHTML('afterbegin',deptPhoto(key,'pp-view-photo',1000,300));
};

// Free lecture cards (learning library and the "Free lectures" part of every detail pop-up)
const photosPreviousLectureCards=lectureCards;
lectureCards=function(ids){
 const html=photosPreviousLectureCards(ids);const list=(ids||[]).filter(id=>D.lectureSources[id]);
 const parts=html.split('<div class="lecture-cover">');
 return parts.map((part,i)=>{if(!i)return part;const id=list[i-1];const key=LECTURE_DEPT[id]||'general';return '<div class="lecture-cover has-photo">'+deptPhoto(key,'',640,280)+part}).join('');
};

// Small photo cards used inside the detail pop-up
function photoMini(kind,item,key,sub){return `<button class="photo-mini" data-${kind}="${esc(item.id)}">${deptPhoto(key,'',320,180)}<span><strong>${esc(item.name)}</strong>${sub?`<small>${esc(sub)}</small>`:''}</span></button>`}

// Course pop-up: careers it leads to and its exams get photos
const photosPreviousCourseDetail=courseDetail;
courseDetail=function(id){
 let html=photosPreviousCourseDetail(id);
 html=html.replace(/<button data-career="([^"]+)"><span class="square-icon">[\s\S]*?<\/span>/g,(m,cid)=>{const key=CAREER_DEPT[cid];return key?`<button data-career="${cid}" class="has-photo">`+deptPhoto(key,'path-photo',160,120):m});
 html=html.replace(/<button class="chip" data-exam="([^"]+)">/g,(m,eid)=>{const key=EXAM_DEPT[eid];return key?`<button class="chip photo-chip" data-exam="${eid}">`+deptPhoto(key,'chip-photo',80,80):m});
 return html;
};

// Career pop-up: courses that lead here and exams for this path, with photos
const photosPreviousCareerDetail=careerDetail;
careerDetail=function(id,tab='overview'){
 const html=photosPreviousCareerDetail(id,tab);const c=D.careers.find(x=>x.id===id);
 if(!c||tab!=='overview')return html;
 const courses=D.programs.filter(p=>(c.programs||[]).includes(p.id));
 const exams=D.exams.filter(e=>(e.relatedCareers||[]).includes(id));
 let extra='';
 if(courses.length)extra+=`<h3>Courses that lead here</h3><div class="photo-mini-grid">${courses.map(p=>photoMini('course',p,p.id,p.group)).join('')}</div>`;
 if(exams.length)extra+=`<h3>Exams for this path</h3><div class="photo-mini-grid">${exams.map(e=>photoMini('exam',e,EXAM_DEPT[e.id]||'paper',e.category)).join('')}</div>`;
 if(!extra)return html;
 const at=html.indexOf('<h3>References behind this guide</h3>');
 return at>-1?html.slice(0,at)+extra+html.slice(at):html;
};
