// Department photos for course cards, paid-course cards and previous-paper cards.
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
 general:['photo-1580582932707-520aed937b7b','Empty classroom']
};
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

// Course cards (UG course hub)
const photosPreviousCourseCards=courseCards;
courseCards=function(){
 photosPreviousCourseCards();
 $$('#course-results .course-card').forEach(card=>{
  const id=card.querySelector('[data-course]')?.dataset.course;if(!id||!DEPT_PHOTOS[id])return;
  const scene=card.querySelector('.topic-scene');if(!scene||scene.querySelector('.dept-photo'))return;
  scene.classList.add('has-photo');scene.insertAdjacentHTML('beforeend',deptPhoto(id,'',640,320));
 });
};

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
