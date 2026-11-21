import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mount} from '../src/app.mjs';
import {example} from '../src/example.mjs';
import {readUTF8,downloads} from '../src/files.mjs';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
function setup(){const dom=new JSDOM(html),saved=[];return {dom,d:dom.window.document,app:mount(dom.window.document,{save:(...args)=>saved.push(args)}),saved}}
function event(t,id,type){t.d.getElementById(id).dispatchEvent(new t.dom.window.Event(type,{bubbles:true,cancelable:true}))}
function edit(t,id,value){t.d.getElementById(id).value=value;event(t,id,'input')}
function change(t,id,value){t.d.getElementById(id).value=value;event(t,id,'change')}
test('simulated sample workflow opens all candidates and exports all six artifacts',()=>{
 const t=setup();t.d.getElementById('sample').click();assert.equal(t.d.querySelectorAll('.group-button').length,3);
 assert.equal(t.d.getElementById('comparison').hidden,false);assert.match(t.d.getElementById('fields').textContent,/title/);
 for(const b of t.d.querySelectorAll('[data-export]'))b.click();assert.equal(t.saved.length,6);assert.equal(t.saved.find(x=>x[0]==='original.bib')[2],example.source);t.dom.window.close();
});
test('group assessment remains portable and shelf filters do not hide exported groups',()=>{
 const t=setup();t.app.install(example);change(t,'review-state','separate');edit(t,'review-note','Different titles.');
 change(t,'state-filter','unreviewed');assert.equal(t.d.querySelectorAll('.group-button').length,2);
 t.d.querySelector('[data-export=project]').click();const project=JSON.parse(t.saved[0][2]);assert.equal(project.reviews[0].note,'Different titles.');
 t.d.querySelector('[data-export=json]').click();assert.equal(JSON.parse(t.saved[1][2]).groups.length,3);t.app.install(project);assert.equal(t.d.getElementById('review-state').value,'separate');t.dom.window.close();
});
test('stale drafts block assessments and downloads; failed scans keep previous result',()=>{
 const t=setup();t.app.install(example);const previous=t.app.getResult();edit(t,'source','@bad{');
 assert.equal(t.app.isFresh(),false);assert.equal(t.d.getElementById('review-state').disabled,true);
 event(t,'source-form','submit');assert.equal(t.app.getResult(),previous);assert.match(t.d.getElementById('status').textContent,/stale/);
 for(const b of t.d.querySelectorAll('[data-export]'))assert.equal(b.disabled,true);t.dom.window.close();
});
test('metadata-only edits keep decisions and CRLF; edited source starts fresh decisions',()=>{
 const t=setup();t.app.install(example);change(t,'review-state','likely');edit(t,'title','Changed');event(t,'source-form','submit');
 assert.equal(t.app.getResult().project.source,example.source);assert.equal(t.app.getResult().project.reviews.length,1);
 edit(t,'source',example.source+'\n');event(t,'source-form','submit');assert.equal(t.app.getResult().project.reviews.length,0);t.dom.window.close();
});
test('comparison dropdowns expose full raw entries and untrusted markup is literal',()=>{
 const t=setup(),source='@misc{x,title={<img src=x onerror=alert(1)> Long title},year=2024}\n@misc{X,title={Other title},year=2025,note={'+'z'.repeat(700)+'}}';
 t.app.install({...example,source});change(t,'right','1');assert.ok(t.d.getElementById('fields').textContent.includes('z'.repeat(700)));assert.equal(t.d.querySelectorAll('#comparison img').length,0);assert.ok(t.d.getElementById('left-raw').textContent.includes('<img'));t.dom.window.close();
});
test('an in-flight file import cannot overwrite later review decisions',async()=>{
 const t=setup();t.app.install(example);let release;
 Object.defineProperty(t.d.getElementById('bib-file'),'files',{configurable:true,value:[{size:12,arrayBuffer:()=>new Promise(r=>{release=r})}]});
 event(t,'bib-file','change');change(t,'review-state','separate');release(new TextEncoder().encode('@misc{new,}').buffer);await new Promise(r=>setTimeout(r,0));
 assert.equal(t.app.getResult().project.source,example.source);assert.equal(t.app.getResult().project.reviews[0].state,'separate');t.dom.window.close();
});
test('project and bibliography imports validate before replacing current work',async()=>{
 const t=setup();t.app.install(example);
 for(const [id,text] of [['bib-file','@misc{a,}\r\n'],['project-file','{"schema":"wrong"}']]){
  const bytes=new TextEncoder().encode(text);Object.defineProperty(t.d.getElementById(id),'files',{configurable:true,value:[{size:bytes.length,arrayBuffer:async()=>bytes.buffer}]});event(t,id,'change');await new Promise(r=>setTimeout(r,0));
 }
 assert.equal(t.app.getResult().project.source,'@misc{a,}\r\n');assert.match(t.d.getElementById('status').textContent,/intact/);t.d.getElementById('clear').click();assert.equal(t.app.getResult().entries.length,0);t.dom.window.close();
});
test('UTF8 reading and Blob payloads preserve bytes without native download claims',async()=>{
 await assert.rejects(()=>readUTF8({size:99},3),/size/);await assert.rejects(()=>readUTF8({size:1,arrayBuffer:async()=>new Uint8Array([255]).buffer},5));
 const t=setup(),oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL,blobs=[],revoked=[];
 URL.createObjectURL=b=>{blobs.push(b);return 'blob:'+blobs.length};URL.revokeObjectURL=u=>revoked.push(u);t.dom.window.HTMLAnchorElement.prototype.click=function(){};
 try{const d=downloads(t.d);d.save('a.bib','text/plain',example.source);assert.equal(await blobs[0].text(),example.source);d.save('b','text/plain','b');d.dispose();assert.equal(revoked.length,2)}
 finally{URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;t.dom.window.close()}
});
test('simulated labels, status, skip target, caption and responsive CSS exist',async()=>{
 const t=setup();for(const e of t.d.querySelectorAll('input:not([type=file]),textarea,select'))assert.ok(t.d.querySelector('label[for="'+e.id+'"]'),e.id);
 assert.ok(t.d.querySelector(t.d.querySelector('.skip').getAttribute('href')));assert.equal(t.d.getElementById('status').getAttribute('role'),'status');assert.ok(t.d.querySelector('table caption'));
 const css=await readFile(new URL('../style.css',import.meta.url),'utf8');assert.match(css,/max-width:760px/);assert.match(css,/focus-visible/);assert.match(css,/white-space:pre-wrap/);t.dom.window.close();
});
