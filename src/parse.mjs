import {LIMITS} from './model.mjs';
export function parse(source,limits=LIMITS){
 if(typeof source!=='string'||source.length>limits.source||!source.isWellFormed())throw Error('Source exceeds text limits or contains an unpaired surrogate.');
 let i=0;const entries=[],blocks=[],warnings=[];
 const fail=message=>{const before=source.slice(0,i),line=before.split('\n').length,column=i-before.lastIndexOf('\n');throw Error(message+' At line '+line+', column '+column+'. No partial review was built.')};
 const ws=()=>{while(i<source.length&&/\s/u.test(source[i]))i++};
 function braced(){
  const start=++i;let depth=1;
  while(i<source.length){
   const c=source[i++];
   if(c==='{'){if(++depth>limits.depth)fail('Brace-depth limit exceeded.')}
   if(c==='}')depth--;
   // Backslashed braces count too: this scanner does not execute TeX.
   if(c==='}'&&depth===0)return source.slice(start,i-1);
  }
  fail('Unterminated braced value.');
 }
 function quoted(){
  const start=++i;let depth=0;
  while(i<source.length){
   const c=source[i++];
   if(c==='{'){if(++depth>limits.depth)fail('Brace-depth limit exceeded.')}
   else if(c==='}'){if(--depth<0)fail('Unexpected closing brace in quoted value.')}
   else if(c==='"'&&depth===0)return source.slice(start,i-1);
  }
  fail('Unterminated quoted value.');
 }
 function expression(){
  const start=i,parts=[];let resolved=true;
  for(;;){
   if(parts.length>=limits.parts)fail('Field-part limit exceeded.');
   ws();
   if(source[i]==='{')parts.push(braced());
   else if(source[i]==='"')parts.push(quoted());
   else{
    const match=/^[A-Za-z0-9_:.+\/-]+/.exec(source.slice(i));
    if(!match)fail('Expected a braced, quoted, numeric or macro field value.');
    i+=match[0].length;parts.push(match[0]);if(!/^[0-9]+$/.test(match[0]))resolved=false;
   }
   ws();if(source[i]!=='#')break;i++;
  }
  return {text:parts.join(''),resolved,raw:source.slice(start,i).trimEnd()};
 }
 while(i<source.length){
  if(source[i]==='%'){const end=source.indexOf('\n',i);i=end<0?source.length:end+1;continue}
  if(source[i]!=='@'){i++;continue}
  const start=i++;const type=/^[A-Za-z]+/.exec(source.slice(i));
  if(!type)fail('Expected an entry type after @.');
  i+=type[0].length;ws();const opener=source[i],close=opener==='{'?'}':')';
  if(!['{','('].includes(opener))fail('Use a braced or parenthesized entry block.');
  const kind=type[0].toLowerCase();
  if(blocks.length>=limits.blocks)fail('Block limit exceeded.');
  if(['comment','string','preamble'].includes(kind)){
   if(opener==='{'&&kind==='comment')braced();
   else{
    i++;
    while(i<source.length&&source[i]!==close){
     if(source[i]==='{')braced();else if(source[i]==='"')quoted();else i++;
    }
    if(source[i]!==close)fail('Unterminated special block.');i++;
   }
   blocks.push({type:kind,start,end:i});warnings.push({entry:null,message:'@'+kind+' block preserved; macros and preambles are not evaluated.'});continue;
  }
  if(entries.length>=limits.entries)fail('Entry limit exceeded.');
  i++;ws();const keyStart=i;
  while(i<source.length&&![' ', '\t','\n','\r',',',close].includes(source[i]))i++;
  const key=source.slice(keyStart,i);if(!key||key.length>128||/[{}()"#%=\\]/.test(key))fail('Unsupported citation key (use 1–128 plain non-whitespace characters).');
  ws();if(source[i]!==',')fail('Expected a comma after the citation key.');i++;
  const fields=[];ws();
  while(i<source.length&&source[i]!==close){
   if(fields.length>=limits.fields)fail('Field-count limit exceeded.');
   const m=/^[A-Za-z][A-Za-z0-9_:-]*/.exec(source.slice(i));if(!m)fail('Expected a field name. Comments inside entries are unsupported.');
   const name=m[0].toLowerCase();i+=m[0].length;ws();if(source[i]!=='=')fail('Expected = after field name.');i++;ws();
   fields.push({name,...expression()});ws();
   if(source[i]===','){i++;ws()}else if(source[i]!==close)fail('Expected a comma or block end.');
  }
  if(source[i]!==close)fail('Unterminated entry.');i++;
  const entry={id:entries.length,key,type:kind,start,end:i,raw:source.slice(start,i),fields};entries.push(entry);blocks.push({type:kind,start,end:i});
  const counts=new Map();for(const f of fields)counts.set(f.name,(counts.get(f.name)||0)+1);
  for(const [name,n] of counts)if(n>1)warnings.push({entry:entry.id,message:'Duplicate '+name+' fields are ambiguous and cannot supply a match signal.'});
  for(const f of fields)if(!f.resolved)warnings.push({entry:entry.id,message:f.name+' contains an unevaluated macro; omitted from value matching.'});
 }
 return {entries,blocks,warnings};
}
