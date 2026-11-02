// Page looks and block layout (loaded last, see cf/build.mjs).
// - Overview: no welcome heading and no hero; the profile strip and Career Overview come first.
// - Every page: sections sit in clear rectangular blocks.
// - "learn" look (courses, careers, exams, papers…): clean course-catalogue style,
//   blue accents, unit-style lists. Inspired by Khan Academy course pages; original CSS.
// - "path" look (mock lab, learning library, practice): gray canvas, white cards with
//   divided headers, slate/teal buttons. Inspired by The Odin Project paths; original CSS.
// Looks apply in every theme (calm, Minecraft, Among Us).
const LOOK_LEARN=['overview','courses','careers','government','private','exams','recommend','cutoffs','papers','planner','industry','interview'];
const LOOK_PATH=['mock','resources','practice'];
(function layoutFonts(){
 if(document.getElementById('lx-fonts'))return;
 const link=document.createElement('link');link.id='lx-fonts';link.rel='stylesheet';
 link.href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lato:wght@400;700;900&display=swap';
 document.head.appendChild(link);
})();
function layoutLook(){
 const hash=location.hash.slice(1);
 if(hash==='paid-courses')return 'learn';
 if(LOOK_PATH.includes(route))return 'path';
 if(LOOK_LEARN.includes(route))return 'learn';
 return 'base';
}
function layoutTrimOverview(view){
 const page=view.querySelector(':scope > .fade-in');if(!page)return;
 page.querySelector(':scope > .page-heading')?.remove();
 page.querySelector(':scope > .hero')?.remove();
}
function layoutBlocks(view){
 view.querySelectorAll('.fade-in > .section-head').forEach(head=>{
  if(head.parentElement.classList.contains('lx-block'))return;
  const next=head.nextElementSibling;
  const block=document.createElement('section');block.className='lx-block';
  head.before(block);block.appendChild(head);
  if(next&&!next.classList.contains('section-head'))block.appendChild(next);
 });
}
const layoutPreviousRoute=setRoute;
setRoute=function(value){
 layoutPreviousRoute(value);
 const view=$('#view');if(!view)return;
 document.body.dataset.look=layoutLook();
 document.body.dataset.route=route;
 if(route==='overview')layoutTrimOverview(view);
 layoutBlocks(view);
};
