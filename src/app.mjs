import {validate,page} from './model.mjs';
import {analyze,compare,decision,setDecision,summary} from './review.mjs';
import {example} from './example.mjs';
import {projectJSON,reportJSON,reviewCSV,reportHTML,summarySVG} from './exports.mjs';
import {readUTF8,downloads} from './files.mjs';
const kindName={key:'Citation key collision',doi:'Literal DOI match',title:'Plain title + year'};
const stateName={unreviewed:'Unreviewed',likely:'Likely duplicates',separate:'Keep separate'};
export function mount(document,options={}){
 const $=id=>document.getElementById(id),save=options.save||downloads(document).save;
 let result=null,original='',fresh=false,revision=0,active='',index=0,warnIndex=0;
 const exports=[...document.querySelectorAll('[data-export]')];
 const element=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n};
 function status(text,kind=''){$('status').textContent=text;$('status').className=kind}
 function stale(){
  revision++;fresh=false;exports.forEach(b=>b.disabled=true);$('review-state').disabled=true;$('review-note').disabled=true;
  $('freshness').textContent=result?'VIEW IS STALE':'NOT BUILT';status('Source or settings changed. Inspect again; previous results are stale.','stale');
 }
 function read(){
  const text=$('source').value,source=text===original.replaceAll('\r\n','\n')?original:text;
  return validate({schema:'bibmargin/1',title:$('title').value,source,notes:$('notes').value,reviews:result&&source===original?result.project.reviews:[]});
 }
 function renderMetrics(){
  const s=summary(result);$('metrics').replaceChildren(...[['entries',s.entries],['candidate groups',s.groups],['reviewed groups',s.reviewed]].map(([label,value])=>{const d=document.createElement('div');d.append(element('strong',value),element('span',label));return d}));
 }
 function selectedGroup(){return result.groups.find(g=>g.id===active)}
 function renderFields(){
  const a=result.entries[Number($('left').value)],b=result.entries[Number($('right').value)];if(!a||!b)return;
  $('fields').replaceChildren(...compare(a,b).map(row=>{
   const tr=document.createElement('tr');tr.dataset.same=String(row.same);tr.append(element('td',row.name,'field-name'));
   for(const f of [row.left,row.right]){const td=document.createElement('td');td.append(element('small',(row.same?'same ':'')+f.state),element('span',f.state==='missing'?'—':f.state==='unresolved'?f.raw:f.text));tr.append(td)}return tr;
  }));
  $('left-raw').textContent=a.raw;$('right-raw').textContent=b.raw;
 }
 function renderComparison(){
  const g=selectedGroup();$('comparison').hidden=!g;if(!g){$('signal').textContent='SELECT A GROUP';$('reason').textContent='Open a candidate group to compare entries.';return}
  $('signal').textContent=kindName[g.kind];$('reason').textContent=g.reason;$('evidence-value').textContent=g.value;
  for(const id of ['left','right'])$(id).replaceChildren(...g.members.map(i=>{const o=element('option',(i+1)+' · '+result.entries[i].key);o.value=i;return o}));
  $('left').value=g.members[0];$('right').value=g.members[1];
  const d=decision(result,g.id);$('review-state').value=d.state;$('review-note').value=d.note;$('review-state').disabled=!fresh;$('review-note').disabled=!fresh;renderFields();
 }
 function renderShelf(){
  const filtered=result.groups.filter(g=>($('kind').value==='all'||g.kind===$('kind').value)&&($('state-filter').value==='all'||decision(result,g.id).state===$('state-filter').value));
  const p=page(filtered,index);index=p.current;$('group-count').textContent=filtered.length+' of '+result.groups.length+' groups';
  $('groups').replaceChildren(...p.items.map(g=>{
   const li=document.createElement('li'),button=document.createElement('button'),d=decision(result,g.id),text=document.createElement('span');
   button.type='button';button.className='group-button';button.setAttribute('aria-pressed',String(g.id===active));
   text.append(element('span',kindName[g.kind],'title'),element('span',g.members.length+' entries · '+g.members.map(i=>result.entries[i].key).join(' / '),'sub'));
   const tag=element('span',stateName[d.state],'state');tag.dataset.state=d.state;button.append(text,tag);
   button.addEventListener('click',()=>{active=g.id;renderShelf();renderComparison()});li.append(button);return li;
  }));
  $('empty').hidden=filtered.length>0;$('empty').textContent='No groups match these filters. This does not prove the bibliography has no duplicates.';
  $('page').textContent='Page '+(index+1)+' of '+p.pages+' · 15 per page';$('previous').disabled=index===0;$('next').disabled=index>=p.pages-1;
 }
 function renderWarnings(){
  const p=page(result.warnings,warnIndex);warnIndex=p.current;$('warning-count').textContent=result.warnings.length+' notes';
  $('warnings').replaceChildren(...p.items.map(w=>element('li',(w.entry===null?'Source':'Entry '+(w.entry+1)+' · '+result.entries[w.entry].key)+': '+w.message)));
  if(!result.warnings.length)$('warnings').append(element('li','No scanner notes. This is not a compilation or completeness check.'));
  $('warn-page').textContent='Page '+(warnIndex+1)+' of '+p.pages;$('warn-prev').disabled=warnIndex===0;$('warn-next').disabled=warnIndex>=p.pages-1;
 }
 function apply(next){
  result=next;original=next.project.source;fresh=true;revision++;index=0;warnIndex=0;active=next.groups[0]?.id||'';
  exports.forEach(b=>b.disabled=false);$('freshness').textContent='CURRENT';renderMetrics();renderShelf();renderComparison();renderWarnings();
  status(result.entries.length+' entries scanned; '+result.groups.length+' independent candidate groups. Source unchanged. Save the project to keep decisions.');
 }
 function install(input){
  const next=analyze(input);
  for(const key of ['title','source','notes'])$(key).value=next.project[key];
  $('kind').value='all';$('state-filter').value='all';apply(next);
 }
 $('source-form').addEventListener('input',stale);
 $('source-form').addEventListener('submit',e=>{e.preventDefault();try{apply(analyze(read()))}catch(error){stale();status(error.message+' Previous view is stale.','error')}});
 $('sample').addEventListener('click',()=>install(example));$('clear').addEventListener('click',()=>install({...example,title:'',source:'',notes:'',reviews:[]}));
 for(const id of ['kind','state-filter'])$(id).addEventListener('change',()=>{if(result){index=0;renderShelf()}});
 for(const id of ['left','right'])$(id).addEventListener('change',()=>{if(result)renderFields()});
 for(const [id,delta,which] of [['previous',-1,'shelf'],['next',1,'shelf'],['warn-prev',-1,'warn'],['warn-next',1,'warn']])$(id).addEventListener('click',()=>{if(!result)return;if(which==='shelf'){index+=delta;renderShelf()}else{warnIndex+=delta;renderWarnings()}});
 function assess(){
  if(!fresh||!selectedGroup())return;
  try{setDecision(result,active,$('review-state').value,$('review-note').value);revision++;renderMetrics();renderShelf();status('Group assessment updated in memory. Save the review project before closing.')}
  catch(error){status(error.message,'error')}
 }
 $('review-state').addEventListener('change',assess);$('review-note').addEventListener('input',assess);
 for(const [id,isProject] of [['bib-file',false],['project-file',true]])$(id).addEventListener('change',async()=>{
  const file=$(id).files?.[0];if(!file)return;const token=++revision;status('Reading locally…');
  try{
   const text=await readUTF8(file,isProject?28000000:4000000);if(token!==revision)return;
   if(isProject){if(text.length>7000000)throw Error('Project text exceeds 7,000,000 units.');install(JSON.parse(text))}
   else install({schema:'bibmargin/1',title:$('title').value,source:text,notes:$('notes').value,reviews:[]});
  }catch(error){if(token===revision)status('Import left existing work intact: '+error.message,'error')}
  finally{$(id).value=''}
 });
 const types={project:['bibmargin-project.json','application/json',projectJSON],csv:['bibmargin-candidates.csv','text/csv',reviewCSV],json:['bibmargin-report.json','application/json',reportJSON],html:['bibmargin-review.html','text/html',reportHTML],source:['original.bib','text/plain',r=>r.project.source],svg:['bibmargin-summary.svg','image/svg+xml',summarySVG]};
 for(const button of exports)button.addEventListener('click',()=>{
  if(!fresh||!result)return;
  try{const [name,type,fn]=types[button.dataset.export];save(name,type+';charset=utf-8',fn(result));status('Downloaded '+name+'. Entire review included, regardless of shelf filters.')}
  catch(error){status('Download failed: '+error.message,'error')}
 });
 return {install,getResult:()=>result,isFresh:()=>fresh};
}
if(typeof document!=='undefined')mount(document);
