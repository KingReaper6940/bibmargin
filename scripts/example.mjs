import {mkdir,writeFile} from 'node:fs/promises';
import {analyze,summary} from '../src/review.mjs';
import {example} from '../src/example.mjs';
import {projectJSON,reviewCSV,reportJSON,reportHTML,summarySVG} from '../src/exports.mjs';
const out=new URL('../examples/',import.meta.url);await mkdir(out,{recursive:true});const r=analyze(example);
for(const [name,text] of [['bibliography.bib',example.source],['project.json',projectJSON(r)],['candidates.csv',reviewCSV(r)],['report.json',reportJSON(r)],['review.html',reportHTML(r)],['summary.svg',summarySVG(r)]])await writeFile(new URL(name,out),text);
console.log('Wrote six complete synthetic example artifacts.');console.log(summary(r));
