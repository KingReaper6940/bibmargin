import {validate,field} from './model.mjs';
import {parse} from './parse.mjs';
export function doi(value){
 if(value.state!=='literal')return '';
 const text=value.text.trim().replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i,'').toLowerCase();
 return /^10\.[0-9]{4,9}\/[\x21-\x7e]+$/.test(text)&&!/[{}\\]/.test(text)?text:'';
}
export function titleYear(entry){
 const t=field(entry,'title'),y=field(entry,'year');
 if(t.state!=='literal'||y.state!=='literal'||t.text.includes('\\')||!/^\s*[0-9]{4}\s*$/.test(y.text))return '';
 const title=t.text.replace(/[{}]/g,'').normalize('NFC').toLowerCase().replace(/\s+/gu,' ').trim();
 return title.length>=8?title+' · '+y.text.trim():'';
}
export const REASONS={
 key:'Same citation key after lowercasing. This is a collision, not proof of the same work.',
 doi:'Same literal DOI after removing a resolver / doi: prefix and lowercasing. Identifier was not looked up.',
 title:'Same plain title and four-digit year after case, brace and whitespace normalization. Candidate only; editions and distinct works can match.'
};
export function analyze(input){
 const project=validate(input),parsed=parse(project.source),groups=[];
 for(const kind of ['key','doi','title']){
  const map=new Map();
  for(const entry of parsed.entries){
   const value=kind==='key'?entry.key.toLowerCase():kind==='doi'?doi(field(entry,'doi')):titleYear(entry);
   if(!value)continue;if(!map.has(value))map.set(value,[]);map.get(value).push(entry.id);
  }
  for(const [value,members] of map)if(members.length>1)groups.push({id:kind+':'+members.join(','),kind,value,members,reason:REASONS[kind]});
 }
 const ids=new Set(groups.map(g=>g.id));
 if(project.reviews.some(r=>!ids.has(r.id)))throw Error('Project decisions reference groups absent from this source. Rebuild from source to start a new review.');
 return {project,...parsed,groups};
}
export function decision(result,id){return result.project.reviews.find(r=>r.id===id)||{id,state:'unreviewed',note:''}}
export function compare(a,b){
 const names=[...new Set([...a.fields,...b.fields].map(f=>f.name))].sort();
 return names.map(name=>{
  const left=field(a,name),right=field(b,name);
  return {name,left,right,same:left.state===right.state&&left.text===right.text&&left.state==='literal'};
 });
}
export function setDecision(result,id,state,note){
 const next=structuredClone(result.project),r={id,state,note};
 next.reviews=next.reviews.filter(item=>item.id!==id);next.reviews.push(r);
 validate(next);if(!result.groups.some(g=>g.id===id))throw Error('Unknown review group.');
 result.project=next;return result;
}
export function summary(result){
 const affected=new Set(result.groups.flatMap(g=>g.members)),reviewed=result.groups.filter(g=>decision(result,g.id).state!=='unreviewed').length;
 return {entries:result.entries.length,groups:result.groups.length,affected:affected.size,reviewed,warnings:result.warnings.length};
}
