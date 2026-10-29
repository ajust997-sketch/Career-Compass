const PaperCore=(()=>{
 function normalise(source){
  const list=Array.isArray(source)?source:source.questions;
  if(!Array.isArray(list)||!list.length)throw Error('No questions found. Use the example format, or upload a JSON questions array.');
  if(list.length>200)throw Error('Use at most 200 questions per paper.');
  const seen=new Set();return list.map((q,i)=>{
   const id=String(q.id||i+1);if(seen.has(id))throw Error('Question IDs must be unique: '+id);seen.add(id);
   const question=String(q.question||q.prompt||'').trim(),options=Array.isArray(q.options)?q.options.map(String):[];
   if(!question||question.length>10000||options.length<2||options.length>6||Array.from(options).some(x=>typeof x!=='string'||!x.trim()||x.length>4000))throw Error('Question '+(i+1)+' needs a question and 2–6 non-empty answer options.');
   let answer=q.answer??null;
   if(typeof answer==='string')answer=/^[A-F]$/i.test(answer)?answer.toUpperCase().charCodeAt(0)-65:/^\d+$/.test(answer)?Number(answer):null;
   if(answer!==null&&(!Number.isInteger(answer)||answer<0||answer>=options.length))throw Error('Invalid answer for question '+(i+1)+'. JSON answers are zero-based indices or A–F.');
   return {id,topic:String(q.topic||'Unclassified').slice(0,100),question,options,answer,explanation:String(q.explanation||'').slice(0,10000),sourceUrl:String(q.sourceUrl||'').slice(0,2000)};
  });
 }
 function parse(text){
  const value=String(text||'').replace(/\r/g,'').trim();if(!value)throw Error('Add your paper first.');
  if(value.startsWith('[')||value.startsWith('{')){try{return normalise(JSON.parse(value))}catch(e){throw Error('JSON import: '+e.message)}}
  const prepared=value.replace(/([^\n])\s+([B-Fb-f][).])\s+/g,'$1\n$2 ');
  const lines=prepared.split('\n'),questions=[];let q=null,last='';
  for(const raw of lines){
   const line=raw.trim();if(!line)continue;
   const start=line.match(/^(?:(?:Q(?:uestion)?)[.\s]*)?(\d+)[).:\-]\s*(.+)/i);
   const option=line.match(/^\(?([A-F])\s*[).:\-]\s*(.+)$/i);
   const answer=line.match(/^(?:Answer|Ans|Correct answer)\s*[:=\-]\s*([A-F])(?:[).]|\s|$)/i);
   const topic=line.match(/^(?:Topic|Subject)\s*:\s*(.+)/i);
   const explanation=line.match(/^(?:Explanation|Solution)\s*:\s*(.*)/i);
   if(start){if(q)questions.push(q);q={id:start[1],question:start[2],options:[],answer:null,topic:'Unclassified',explanation:''};last='question'}
   else if(q&&answer){q.answer=answer[1].toUpperCase().charCodeAt(0)-65;last='answer'}
   else if(q&&topic){q.topic=topic[1];last='topic'}
   else if(q&&explanation){q.explanation=explanation[1];last='explanation'}
   else if(q&&option){const index=option[1].toUpperCase().charCodeAt(0)-65;q.options[index]=option[2];last='option'}
   else if(q&&last==='option')q.options[q.options.length-1]+=' '+line;
   else if(q&&last==='explanation')q.explanation+=' '+line;
   else if(q&&last==='question')q.question+=' '+line;
  }
  if(q)questions.push(q);
  return normalise(questions);
 }
 function applyKey(questions,keyText){
  if(!String(keyText||'').trim())return questions;
  const copy=questions.map(q=>({...q})),matches=[...String(keyText).matchAll(/(\d+)\s*[:.)=\-]?\s*([A-F])\b/gi)];
  if(!matches.length)throw Error('Use answer-key format: 1:A, 2:C, 3:B.');
  const seen=new Set();
  for(const m of matches){const index=copy.findIndex(q=>String(q.id)===m[1]);if(index<0)throw Error('Answer key refers to missing question '+m[1]);if(seen.has(m[1]))throw Error('Duplicate answer key entry for '+m[1]);seen.add(m[1]);const a=m[2].toUpperCase().charCodeAt(0)-65;if(a>=copy[index].options.length)throw Error('Answer option is missing in question '+m[1]);copy[index].answer=a;}
  return copy;
 }
 function analyse(questions,answers={},timings={},marking={correct:1,wrong:0},covered=[]){
  let correct=0,wrong=0,skipped=0,ungraded=0;
  const topicStats={},details=questions.map((q,i)=>{
   const selected=answers[i],attempted=Number.isInteger(selected),hasKey=Number.isInteger(q.answer);
   const status=!hasKey?'ungraded':!attempted?'skipped':selected===q.answer?'correct':'wrong';
   if(status==='correct')correct++;else if(status==='wrong')wrong++;else if(status==='skipped')skipped++;else ungraded++;
   const t=topicStats[q.topic]??={topic:q.topic,total:0,correct:0,wrong:0,skipped:0,ungraded:0,seconds:0};
   t.total++;t[status]++;t.seconds+=Number(timings[i])||0;
   return {...q,selected:attempted?selected:null,status,seconds:Math.round(Number(timings[i])||0)};
  });
  for(const topic of covered)if(topic.trim()&&!topicStats[topic.trim()])topicStats[topic.trim()]={topic:topic.trim(),total:0,correct:0,wrong:0,skipped:0,ungraded:0,seconds:0};
  const topics=Object.values(topicStats).map(t=>({...t,accuracy:t.correct+t.wrong?Math.round(100*t.correct/(t.correct+t.wrong)):null,action:!t.total?'Not tested: add questions to check coverage.':t.ungraded===t.total?'Add a verified answer key before assessing this topic.':t.wrong?'Relearn the missed concept, solve 10 focused questions, then retry without notes.':t.skipped?'Attempt 5 untimed questions first, then practise a timed set.':'Maintain with spaced recall; attempt a harder question next.'})).sort((a,b)=>(b.wrong*3+b.skipped*2+(!b.total?1:0))-(a.wrong*3+a.skipped*2+(!a.total?1:0)));
  return {correct,wrong,skipped,ungraded,score:correct*marking.correct-wrong*marking.wrong,maxScore:(questions.length-ungraded)*marking.correct,accuracy:correct+wrong?Math.round(100*correct/(correct+wrong)):0,details,topics};
 }
 return {parse,normalise,applyKey,analyse};
})();
