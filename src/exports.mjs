import {decision,summary} from './review.mjs';
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const projectJSON=r=>JSON.stringify(r.project,null,2)+'\n';
export function reportJSON(r){
 return JSON.stringify({schema:'bibmargin-report/1',project:r.project,summary:summary(r),groups:r.groups.map(g=>({...g,review:decision(r,g.id),keys:g.members.map(i=>r.entries[i].key)})),entries:r.entries,warnings:r.warnings},null,2)+'\n';
}
const csvCell=value=>{
 const text=String(value),safe=/^[\s]*[=+\-@]/u.test(text)||/^[\t\r]/.test(text)?"'"+text:text;
 return '"'+safe.replaceAll('"','""')+'"';
};
export function reviewCSV(r){
 const rows=[['Signal','Group','Members','Keys','Evidence value','State','Note']];
 for(const g of r.groups){const d=decision(r,g.id);rows.push([g.kind,g.id,g.members.length,g.members.map(i=>r.entries[i].key).join(' | '),g.value,d.state,d.note])}
 return rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
export function reportHTML(r){
 const e=escape,s=summary(r);
 return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;"><title>'+e(r.project.title||'Bibmargin review')+'</title><style>body{font:16px/1.6 system-ui;max-width:1100px;margin:auto;padding:32px;color:#173e38}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 monospace;background:#eff6f4;padding:16px}article{border-top:1px solid #a9c7bd;padding:24px 0}h1{font-size:32px}summary{cursor:pointer;padding:10px}p{overflow-wrap:anywhere}</style><h1>'+e(r.project.title||'Bibmargin review')+'</h1><p>'+e(JSON.stringify(s))+'</p><p>Signals identify candidates, not proven duplicate works. No entries were deleted, merged, looked up or verified. Overlapping signal groups are independent.</p><p>'+e(r.project.notes)+'</p>'+r.groups.map(g=>{const d=decision(r,g.id);return '<article><h2>'+e(g.kind)+' · '+e(g.value)+'</h2><p>'+e(g.reason)+'</p><p>Review: '+e(d.state)+' · '+e(d.note)+'</p>'+g.members.map(i=>'<details><summary>Entry '+(i+1)+' · '+e(r.entries[i].key)+'</summary><pre>'+e(r.entries[i].raw)+'</pre></details>').join('')+'</article>'}).join('')+'<h2>All scanner notes</h2>'+r.warnings.map(w=>'<p>'+e(w.entry===null?'Source':'Entry '+(w.entry+1))+': '+e(w.message)+'</p>').join('')+'<h2>Complete original source</h2><pre>'+e(r.project.source)+'</pre></html>';
}
export function summarySVG(r){
 const e=escape,s=summary(r),title=Array.from(r.project.title||'Untitled bibliography').slice(0,42).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="400" viewBox="0 0 900 400" role="img" aria-labelledby="title desc"><title id="title">'+e(title)+'</title><desc id="desc">Generated review summary, not an application screenshot.</desc><rect width="900" height="400" fill="#123e35"/><g fill="#f1faf7" font-family="system-ui,sans-serif"><text x="42" y="58" font-size="18">BIBMARGIN / BIBLIOGRAPHY REVIEW</text><text x="42" y="118" font-size="30">'+e(title)+'</text><text x="42" y="199" font-size="48">'+s.groups+' candidate groups</text><text x="42" y="248" font-size="21">'+s.entries+' entries · '+s.affected+' involved · '+s.reviewed+' groups reviewed</text><text x="42" y="315" font-size="17">Citation key · Literal DOI · Plain title + year</text><text x="42" y="358" font-size="15">Review signals only. No references deleted, merged or verified.</text></g></svg>\n';
}
