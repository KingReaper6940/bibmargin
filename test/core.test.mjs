import test from 'node:test';
import assert from 'node:assert/strict';
import {LIMITS,validate,field,page} from '../src/model.mjs';
import {parse} from '../src/parse.mjs';
import {analyze,doi,titleYear,compare,decision,setDecision,summary} from '../src/review.mjs';
import {example} from '../src/example.mjs';
import {projectJSON,reportJSON,reviewCSV,reportHTML,summarySVG} from '../src/exports.mjs';
const p=(source,extra={})=>({...example,source,...extra}),entry=source=>parse(source).entries[0];
test('strict project schema and decision validation have no shared mutable alias',()=>{
 const copy=validate(example);copy.title='Changed';assert.notEqual(copy.title,example.title);
 for(const extra of [{schema:'wrong'},{other:1},{source:'\ud800'},{notes:'a'.repeat(4001)},{reviews:[{id:'x',state:'auto',note:''}]},{reviews:[{id:'x',state:'likely',note:''},{id:'x',state:'likely',note:''}]}])assert.throws(()=>validate({...example,...extra}));
});
test('nested braces and brace-protected quotes retain literal text and raw spans',()=>{
 const source='intro\r\n@Article{key, TITLE = {A {Nested} Title}, note = "A {quoted "word"} here", year=2024,}\r\nend';
 const r=parse(source),e=r.entries[0];assert.equal(e.type,'article');assert.equal(field(e,'title').text,'A {Nested} Title');assert.equal(field(e,'note').text,'A {quoted "word"} here');
 assert.equal(source.slice(e.start,e.end),e.raw);assert.equal(source.slice(0,e.start)+e.raw+source.slice(e.end),source);
});
test('parenthesized regular entries and literal concatenation are supported',()=>{
 const e=entry('@misc(key,title="River " # {Garden}, year=20 # 24)');
 assert.equal(field(e,'title').text,'River Garden');assert.equal(field(e,'year').text,'2024');assert.equal(field(e,'title').state,'literal');
});
test('macros remain unresolved including numeric macro mixtures',()=>{
 const r=parse('@string{j="Journal"}\n@article{k,journal=j,title={A} # suffix,month=jan}');
 assert.equal(r.blocks.length,2);assert.equal(field(r.entries[0],'journal').state,'unresolved');assert.equal(field(r.entries[0],'title').state,'unresolved');assert.equal(r.warnings.length,4);
});
test('special blocks and percent comments outside entries do not become records',()=>{
 const r=parse('% @article{ignored,}\n@comment{Nested {comment} with @misc{not,}}\n@preamble{"{safe}"}\n@misc{yes,}');
 assert.equal(r.entries.length,1);assert.equal(r.entries[0].key,'yes');assert.equal(r.blocks.length,3);
});
test('malformed and unsupported syntax rejects atomically with source location',()=>{
 for(const source of ['@misc{x,title={oops}','@misc{x title={x}}','@misc{x,title="oops}','@misc{x,title={x} year=2024}','@misc{x,% inline comment\n year=2024}','@misc{x,title=}','@misc{x,title={a} # }','@misc{x,title={ok}}\n@bad']){
  assert.throws(()=>parse(source),/line .*column .*No partial/);
 }
});
test('backslashed braces still count instead of silently repairing TeX source',()=>{
 const slash=String.fromCharCode(92);
 assert.throws(()=>parse('@misc{k,title={literal '+slash+'{ open}}'),/No partial/);
 const e=entry('@misc{k,title={A {'+slash+'"o} garden},year=2024}');
 assert.equal(titleYear(e),'');assert.ok(field(e,'title').text.includes(slash));
});
test('resource budgets reject dense, deep and excessive source',()=>{
 assert.throws(()=>parse('abc',{...LIMITS,source:2}),/limits/);
 assert.throws(()=>parse('@misc{a,}\n@misc{b,}',{...LIMITS,entries:1}),/Entry limit/);
 assert.throws(()=>parse('@misc{a,x=1,y=2}',{...LIMITS,fields:1}),/Field-count/);
 assert.throws(()=>parse('@misc{a,x={{{x}}}}',{...LIMITS,depth:2}),/depth/);
 assert.throws(()=>parse('@misc{a,x={a}#{b}}',{...LIMITS,parts:1}),/part/);
 assert.throws(()=>parse('@comment{x}\n@comment{y}',{...LIMITS,blocks:1}),/Block limit/);
});
test('duplicate field names remain ambiguous rather than last-wins',()=>{
 const e=entry('@misc{k,DOI={10.5555/a},doi={10.5555/b}}');
 assert.equal(e.fields.length,2);assert.equal(field(e,'doi').state,'ambiguous');assert.equal(doi(field(e,'doi')),'');
 assert.equal(field(e,'absent').state,'missing');
});
test('DOI normalization is lexical, never URL decoding or fuzzy identity inference',()=>{
 const val=text=>({state:'literal',text});
 for(const text of ['10.5555/ABC','doi: 10.5555/abc','HTTPS://DX.DOI.ORG/10.5555/abc'])assert.equal(doi(val(text)),'10.5555/abc');
 for(const text of ['10.5/a','not a doi','10.5555/a b','10.5555/{x}'])assert.equal(doi(val(text)),'');
 assert.notEqual(doi(val('10.5555/a%2fb')),doi(val('10.5555/a/b')));
});
test('plain title-year normalization is explicit and deliberately conservative',()=>{
 const a=entry('@misc{a,title={A {River} Garden},year=2024}');
 const b=entry('@misc{b,title="a river   garden",year={2024}}');
 assert.equal(titleYear(a),titleYear(b));assert.equal(titleYear(entry('@misc{c,title={Short},year=2024}')),'');
 assert.equal(titleYear(entry('@misc{c,title={A River Garden},year={2024-2025}}')),'');
 assert.notEqual(titleYear(a),titleYear(entry('@misc{c,title={A River Garden!},year=2024}')));
});
test('independent signal groups do not create transitive duplicate clusters',()=>{
 const r=analyze(example);assert.deepEqual(r.groups.map(g=>[g.kind,g.members]),[['key',[0,2]],['doi',[0,1]],['title',[0,1,3]]]);
 assert.deepEqual(summary(r),{entries:5,groups:3,affected:4,reviewed:0,warnings:2});assert.equal(r.project.source,example.source);
});
test('field comparison exposes every field and literal differences',()=>{
 const a=entry('@misc{a,title={same},year=2024,note=jan}');
 const b=entry('@misc{b,title="same",year=2025,pages={1--5}}');
 const rows=compare(a,b);assert.equal(rows.find(r=>r.name==='title').same,true);assert.equal(rows.find(r=>r.name==='year').same,false);assert.equal(rows.find(r=>r.name==='note').right.state,'missing');assert.equal(rows.find(r=>r.name==='pages').left.state,'missing');
});
test('review decisions persist exactly with source and unknown IDs are rejected',()=>{
 const r=analyze(example),id=r.groups[0].id;setDecision(r,id,'separate','Different works');
 const round=analyze(JSON.parse(projectJSON(r)));assert.equal(decision(round,id).note,'Different works');assert.equal(summary(round).reviewed,1);
 assert.throws(()=>setDecision(r,id,'merge',''),/Invalid/);assert.throws(()=>analyze({...example,reviews:[{id:'unknown',state:'likely',note:''}]}),/absent/);
});
test('CSV covers all independent groups and guards formula-leading data',()=>{
 const r=analyze(example);setDecision(r,r.groups[0].id,'likely','=HYPERLINK("bad")');
 const csv=reviewCSV(r);assert.equal(csv.split('\r\n').length,5);assert.match(csv,/'=HYPERLINK/);assert.match(csv,/"Signal","Group"/);
});
test('full JSON and HTML reports retain all source and escape imported markup',()=>{
 const r=analyze({...example,title:'</title><script>alert(1)</script>',notes:'<img src=x onerror=alert(1)>'});
 const json=JSON.parse(reportJSON(r));assert.equal(json.entries.length,5);assert.equal(json.project.source,example.source);
 const html=reportHTML(r);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.match(html,/&lt;img/);
 assert.match(summarySVG(r),/not an application screenshot/);assert.ok(!summarySVG(r).includes('<script>'));
});
test('offset spans reconstruct generated records independently of field casing and delimiters',()=>{
 for(let n=0;n<100;n++){
  const open=n%2?'(':'{',close=n%2?')':'}',source='prefix\n@Misc'+open+'key'+n+', TITLE={Garden '+n+' {nested}}, year='+String(2000+n)+close+'\nsuffix';
  const e=parse(source).entries[0];assert.equal(field(e,'title').text,'Garden '+n+' {nested}');assert.equal(e.raw,source.slice(e.start,e.end));assert.equal(field(e,'year').text,String(2000+n));
 }
});
test('pagination visits every candidate without duplicates or truncating the complete index',()=>{
 const all=Array.from({length:41},(_,i)=>i);assert.deepEqual([0,1,2].flatMap(i=>page(all,i).items),all);assert.equal(page(all,99).items.length,11);assert.equal(page([],0).pages,1);
});
test('parenthesized comments reject atomically instead of leaking nested records',()=>{assert.throws(()=>parse('@comment(outer (inner) @misc{phantom,})'),/Only braced/)});
