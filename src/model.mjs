export const LIMITS=Object.freeze({source:1000000,entries:1000,blocks:1500,fields:80,depth:32,parts:100});
export const STATES=['unreviewed','likely','separate'];
export function validate(input){
 const keys=['schema','title','source','notes','reviews'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join('|')!==keys.sort().join('|')||input.schema!=='bibmargin/1')throw Error('Expected a Bibmargin version 1 project.');
 for(const [key,limit] of [['title',100],['source',LIMITS.source],['notes',4000]])if(typeof input[key]!=='string'||input[key].length>limit||!input[key].isWellFormed())throw Error(key+' exceeds its text limit or contains an unpaired surrogate.');
 if(!Array.isArray(input.reviews)||input.reviews.length>1500)throw Error('Review list exceeds its limit.');
 const ids=new Set();
 for(const r of input.reviews){
  if(!r||Object.keys(r).sort().join('|')!=='id|note|state'||typeof r.id!=='string'||r.id.length>8000||ids.has(r.id)||!STATES.includes(r.state)||typeof r.note!=='string'||r.note.length>500||!r.note.isWellFormed())throw Error('Invalid or duplicated review decision.');
  ids.add(r.id);
 }
 return structuredClone(input);
}
export function field(entry,name){
 const matches=entry.fields.filter(f=>f.name===name.toLowerCase());
 if(matches.length>1)return {state:'ambiguous',text:'Duplicate field names'};
 if(!matches.length)return {state:'missing',text:''};
 return {state:matches[0].resolved?'literal':'unresolved',text:matches[0].text,raw:matches[0].raw};
}
export function page(items,n,size=15){
 const pages=Math.max(1,Math.ceil(items.length/size)),current=Math.max(0,Math.min(Number.isInteger(n)?n:0,pages-1));
 return {items:items.slice(current*size,(current+1)*size),current,pages};
}
