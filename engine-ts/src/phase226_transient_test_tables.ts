/** Phase226: research-only, conservative HTML test TABLE lead parser.
 * Runs on already fetched transient HTML; no network / storage / evidence admission.
 * A table cell is NOT an independently authenticated performance measurement.
 * Reject complex/malformed tables rather than guess associations. */
import {PAGE_MAX_BYTES} from './approved_web_reader.js';
import {createHash} from 'node:crypto';
import type {TestCandidate225} from './phase225_transient_test_probe.js';
import {loadQuantityKnowledge,typeObservedValue,type QuantityKnowledge} from './quantity_knowledge.js';
import {safeMetadataUrl75} from './phase75_source_discovery.js';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const entities=(s:string)=>s.replace(/&#(x[0-9a-f]+|\d+);|&(amp|lt|gt|quot|apos|nbsp);/gi,(_m,n:string|undefined,k:string|undefined)=>{
 if(k)return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '} as Record<string,string>)[k.toLowerCase()]??' ';
 const cp=n?.toLowerCase().startsWith('x')?parseInt(n.slice(1),16):parseInt(n??'0',10);
 return cp&&cp>31&&cp<0x110000?String.fromCodePoint(cp):' ';
});
const txt=(s:string)=>entities(s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
const normalize=(s:string)=>s.toLocaleLowerCase('en').replace(/[^a-z0-9]+/g,' ').trim();
const attribute=(attrs:string,name:string):string|null=>{
 const m=new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]{0,100})"|'([^']{0,100})'|([^\\s>]{1,100}))`,'i').exec(attrs);
 return m?(m[1]??m[2]??m[3]):null;
};
interface Cell{tag:'th'|'td';attrs:string;content:string;value:string;}
const tableHeaders=/\b(?:measured?|weight|mass|volume|capacity|noise|runtime|duration|thickness|height|width|length|power|energy|time|force)\b/i;
// S86b (capability audit, shared safety gap): "Rated power (W)" passed (the list had "rating" but not "rated")
const unsafeHeader=/\b(?:advertised|manufacturer|stated|quoted|claimed|price|retail|rating|rated|star|specification|msrp|list price|target)\b/i;
const methodCue=/\b(?:we (?:tested|measured|recorded|timed|weighed)|our (?:test|tests|measurements|testing)|during our testing|in our lab)\b/i;
const explicitMethod=/\b(?:we (?:tested|measured|recorded|timed|weighed)|our (?:test|tests|measurements)|during our testing|in our lab)\b/i;
const noTest=/\b(?:did not test|not tested|didn't test|not measured|not our test|according to|manufacturer|advertised|press release|third.party|other reviewers)\b/i;
const measuredUnit=/\b(g|kg|mm|cm|l|litres?|liters?|db(?:a)?|%|ms|seconds?|minutes?|hours?|w|watts?|kwh|mah)\b/i;
// S86: header and cell units are read by the quantity knowledge (were a closed list, so a "(m³/h)", "(CFM)" or "(dB(A))"
// column was never read); the header's measurand is what the knowledge's metric terms or the unit's single kind establish
// ("CADR (m³/h)" is cadr, "Max airflow (m³/h)" free_airflow, "Weight (kg)" mass). The coarse heading words below remain
// only where the knowledge leaves the kind open (a "Noise (dB)" column: pressure or power level).
let QK226:QuantityKnowledge|null=null;const qk226=()=>QK226??=loadQuantityKnowledge();
const headerUnit=/\(([^()]{1,12}(?:\([a-z]\))?)\)\s*$/i;
const normalizeUnit=(s:string):string|null=>{const t=typeObservedValue(qk226(),{value:null,unit:s});return t.status==='unit_not_recognised'?null:t.unit;};
// The publisher's heading is its declaration of what the column measures: a metric the knowledge names wins; otherwise the
// heading's own word (it may contradict the unit, "Measured time (W)", and the screen then withholds the value); only a
// heading that names nothing takes the unit's single kind (S86, first test run: the unit had silently overridden the word).
const measurandOf226=(heading:string,unit:string):string=>{const t=typeObservedValue(qk226(),{value:null,unit,labels:[heading]});
 if(t.metric)return t.metric;const word=dimension(heading);return word!=='other'?word:t.kind??'other';};
const dimension=(heading:string):string=>
 /\b(?:mass|weight)\b/i.test(heading)?'mass':/\b(?:volume|capacity)\b/i.test(heading)?'volume':
 /\bnoise\b/i.test(heading)?'noise':/\b(?:runtime|duration|time)\b/i.test(heading)?'duration':
 /\b(?:thickness|height|width|length)\b/i.test(heading)?'length':
 /\bpower\b/i.test(heading)?'power':/\benergy\b/i.test(heading)?'energy':'other';
const singleValue=/^\s*(\d{1,7}(?:\.\d{1,3})?)\s*([^\d\s][^\s]{0,11})?\s*$/i;
export interface TableProbe226{
 schema:'pee226.table-probe.v1'; candidates:readonly TestCandidate225[];
 examinedTables:number;acceptedTableCells:number;skippedAmbiguousTables:number;
 truncated:boolean; sourceBodiesStored:false;scientificEvidenceAdmitted:false;rankingAuthorized:false;
}
/** Conservative subset only: explicit, one-row thead, no spans, a scoped row
 * model header, and near-table first-person methodology. No inferred units. */
export function probeTransientTestTables226(html:string,sourceUrl:string,opts:{documentSha256?:string|null;
 productLeads?:readonly {name:string;model:string|null;sku:string|null}[];}={}):TableProbe226{
 const out:TableProbe226={schema:'pee226.table-probe.v1',candidates:[],examinedTables:0,acceptedTableCells:0,
  skippedAmbiguousTables:0,truncated:false,sourceBodiesStored:false,scientificEvidenceAdmitted:false,rankingAuthorized:false};
 let trustedSyntax=false;
 try{const u=new URL(sourceUrl);trustedSyntax=safeMetadataUrl75(sourceUrl,u.hostname);}catch{}
 if(html.length>PAGE_MAX_BYTES||html.length<20||!/<html\b/i.test(html)||!trustedSyntax)return out;
 const stripped=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|svg|template|noscript|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 const tables=[...stripped.matchAll(/<table\b[^>]{0,500}>([\s\S]{0,60000}?)<\/table\s*>/gi)];
 if(tables.length>12)out.truncated=true;
 const results:TestCandidate225[]=[];
 for(const [ti,match] of tables.slice(0,12).entries()){
  out.examinedTables++;
  const table=match[1], prior=stripped.slice(Math.max(0,(match.index??0)-1200),match.index);
  const paragraphs=[...prior.matchAll(/<p\b[^>]{0,400}>([\s\S]{0,700}?)<\/p\s*>/gi)];
  const lastParagraph=paragraphs.at(-1);
  const near=lastParagraph&&prior.length-(lastParagraph.index??0)-lastParagraph[0].length<=280?
   txt(lastParagraph[1]):'';
  const cap=/<caption\b[^>]{0,200}>([\s\S]{0,400}?)<\/caption\s*>/i.exec(table)?.[1];
  const context=near+' '+(cap?txt(cap):'');
  // Prose or caption must explicitly state the publisher actually tested it.
  if(!explicitMethod.test(near)||!/^.*\bwe (?:tested|measured|recorded|timed|weighed)\b/i.test(near)||
    noTest.test(context)||!methodCue.test(context)||
    /<table\b/i.test(table)||!/<thead\b/i.test(table)||!/<tbody\b/i.test(table)||
    /\b(?:colspan|rowspan)\s*=/i.test(table)){
   out.skippedAmbiguousTables++;continue;
  }
  const thead=/<thead\b[^>]*>([\s\S]*?)<\/thead\s*>/i.exec(table)?.[1]??'';
  const tbody=/<tbody\b[^>]*>([\s\S]*?)<\/tbody\s*>/i.exec(table)?.[1]??'';
  const headerRows=[...thead.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)];
  const bodyRows=[...tbody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)];
  if(headerRows.length!==1||bodyRows.length===0||bodyRows.length>35||/<(?:td|th)\b/i.test(tbody.replace(/<tr\b[^>]*>[\s\S]*?<\/tr\s*>/gi,''))){
   out.skippedAmbiguousTables++;continue;
  }
  const cells=(s:string):Cell[]|null=>{
   const parts=[...s.matchAll(/<(th|td)\b([^>]{0,300})>([\s\S]{0,600}?)<\/\1\s*>/gi)];
   // Prevent unmatched / nested cells and mixed markup / ambiguous grid.
   const remain=s.replace(/<(th|td)\b([^>]{0,300})>([\s\S]{0,600}?)<\/\1\s*>/gi,'')
    .replace(/\s+/g,'');
   if(remain||!parts.length||parts.length>8||parts.some(p=>/<(?:th|td|table)\b/i.test(p[3])))return null;
   return parts.map(p=>({tag:p[1].toLowerCase() as 'th'|'td',attrs:p[2],content:p[3],value:txt(p[3])}));
  };
  const headers=cells(headerRows[0][1]);
  // Phase227: W3C H43 permits explicit id/headers relationships. Accept a
  // *flat, fully specified* subset only; id/headers on unrelated markup do
  // not prove ownership of a measurement. Never infer spanning grids.
  const explicitLinks=bodyRows.some(r=>/\bheaders\s*=/i.test(r[1]));
  const safeId=(v:string|null):v is string=>v!==null&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(v);
  const columnIds=explicitLinks&&headers?headers.map(h=>attribute(h.attrs,'id')):[];
  const uniqueColumnIds=columnIds.every(safeId)&&new Set(columnIds).size===columnIds.length;
  const validHeaders=headers&&(explicitLinks?
   uniqueColumnIds&&headers.every(h=>h.tag==='th'&&
     [null,'col'].includes(attribute(h.attrs,'scope'))&&attribute(h.attrs,'headers')===null):
   /^(?:col|auto)$/i.test(attribute(headers[0].attrs,'scope')??'col')&&
   headers.every(h=>h.tag==='th'&&attribute(h.attrs,'scope')==='col'));
  if(!headers||headers.length<2||headers[0].tag!=='th'||!validHeaders||
   !/\b(?:model|product|boot|bin|item|variant)\b/i.test(headers[0].value)){
   out.skippedAmbiguousTables++;continue;
  }
  const columns=headers.slice(1).map((h,i)=>{
   const unit=headerUnit.exec(h.value)?.[1];const u=unit?normalizeUnit(unit):null;
   // a measurement header: a measurement word, or a metric the knowledge names ("CADR (m³/h)"); never a declared value
   if(unsafeHeader.test(h.value)||!(tableHeaders.test(h.value)||(u&&typeObservedValue(qk226(),{value:null,unit:u,labels:[h.value]}).metric)))return null;
   return u?{index:i+1,unit:u,label:h.value}:null;
  });
  if(columns.every(x=>x===null)) {out.skippedAmbiguousTables++;continue;}
  let ambiguous=false;
  const staged:TestCandidate225[]=[];
  const seenRowIds=new Set<string>(columnIds.filter(safeId));
  for(let ri=0;ri<bodyRows.length;ri++){
   const row=cells(bodyRows[ri][1]);
   if(!row||row.length!==headers.length||row[0].tag!=='th'||
      row.slice(1).some(c=>c.tag!=='td')){ambiguous=true;break;}
   if(explicitLinks){
    const rowId=attribute(row[0].attrs,'id');
    if(!safeId(rowId)||seenRowIds.has(rowId)||
       ![null,'row'].includes(attribute(row[0].attrs,'scope'))||
       attribute(row[0].attrs,'headers')!==null){ambiguous=true;break;}
    seenRowIds.add(rowId);
    // Each value explicitly references exactly its *own* row and column.
    // Reject missing, duplicate, extra, out-of-order column or cross-row ids.
    for(let ci=1;ci<row.length;ci++){
     const cell=row[ci],refs=attribute(cell.attrs,'headers');
     if(attribute(cell.attrs,'id')!==null||!refs){ambiguous=true;break;}
     const ids=refs.trim().split(/\s+/);
     if(ids.length!==2||new Set(ids).size!==2||
        !ids.includes(rowId)||!ids.includes(columnIds[ci]!)){
      ambiguous=true;break;
     }
    }
    if(ambiguous)break;
   }else if(attribute(row[0].attrs,'scope')!=='row'||
      row.slice(1).some(c=>attribute(c.attrs,'headers')!==null)){
    ambiguous=true;break;
   }
   const token=normalize(row[0].value);
   if(!token||token.length>120){ambiguous=true;break;}
   const matches=(opts.productLeads??[]).filter(p=>[p.model,p.sku,p.name].some(v=>v&&normalize(v)===token));
   // The row's publisher-declared model may narrow a lead, never authenticate it.
   if(matches.length!==1)continue;
   const subject={name:matches[0].name,model:matches[0].model,sku:matches[0].sku};
   for(const col of columns){
    if(!col)continue;
    const content=row[col.index].value;
    const numeric=singleValue.exec(content);
    if(!numeric)continue;
    const unit=normalizeUnit(numeric[2]??col.unit);
    if(unit!==col.unit)continue; // never guess incompatible units or conversions
    const value=Number(numeric[1]);
    if(!Number.isFinite(value)||value<0||value>1e7)continue;
    const blockSha256=hash(JSON.stringify([headers.map(x=>x.value),row.map(x=>x.value),col.index]));
    const blockIndex=380+ti*36+ri;const valueOffset=col.index;
    const id=hash(JSON.stringify([sourceUrl,blockSha256,valueOffset,value,unit,subject]));
    staged.push({id,sourceUrl,documentSha256:opts.documentSha256??null,blockSha256,blockIndex,valueOffset,
     value,unit,instrument:null,condition:null,
     publisherDeclaredDimension:measurandOf226(col.label,col.unit),
     publisherDeclaredTargetScope:/\b(?:compartment|section)\b/i.test(col.label)?'compartment_unspecified':'whole_product_unspecified',
     methodCue:'bounded_table_result_with_local_method',
     subject,subjectAssignment:'table_row_declared_model_unverified',
     classification:'publisher_reported_measurement_lead_only',methodReviewed:false,originalWorkReviewed:false,
     reviewerIndependent:false,exactVariantVerified:false,market:'unknown',scientificEvidenceAdmitted:false,rankingAuthorized:false});
   }
  }
  if(ambiguous){out.skippedAmbiguousTables++;continue;}
  for(const c of staged){if(results.length>=20){out.truncated=true;break;}results.push(c);}
  if(results.length>=20)break;
 }
 return {...out,candidates:results,acceptedTableCells:results.length};
}
