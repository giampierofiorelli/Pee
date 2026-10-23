/** Phase270 — comparative test results: one task (a dish or meal) cooked in several appliances, with the time, energy
 * and cost the TESTER reports for each. Written for the documents Phase269/270 could not read (owner brief §8): result
 * lists separated by line breaks, result tables (appliance rows, measurand columns) and first-person prose.
 *
 * Separation of measurands: duration (min), energy (kWh) and cost (pence or cents; a cost is the tester's energy reading
 * multiplied by a tariff, so it is reported as 'cost', never as energy) are distinct; a tariff ("26p per kWh"), a
 * power rating, a quantity and an annualised or hypothetical figure ("you'd save", "if you", "per year") are not results.
 * Bounds ("at least 10 minutes", "under five minutes") and ranges ("12p to 17p") are not extracted.
 *
 * Attribution: each value goes to one appliance of its own clause (the appliance named right after it, else before it in
 * the clause, else the document's tested appliance); several appliances in a clause with one value give 'several'.
 * A class row ("Air fryer") is resolved to a named product only when the document's own test-subject statement names
 * exactly one product of that class ("Our appliances: … air fryer"); otherwise it stays a class. Names are never merged.
 * Transient: values, codes and block hashes only; no sentence is kept.
 */
import {createHash} from 'node:crypto';
import {textBlocks225,NEGATED_METHOD225,SECONDARY_SOURCE225,declaredInClause225} from './phase225_transient_test_probe.js';

export type ApplianceClass270='air_fryer'|'oven'|'grill'|'microwave'|'hob'|'slow_cooker'|'halogen_oven'|'deep_fat_fryer';
export interface ComparativeResult270 {
 appliance:ApplianceClass270|'several';taskIndex:number;dimension:'duration'|'energy'|'cost';value:number;unit:'minutes'|'kwh'|'p'|'cents';
 approximate:boolean;form:'line_list'|'table_row'|'prose';
 subject:{name:string;model:string|null;sku:null}|null;
 subjectAssignment:'class_row_resolved_by_document_appliance_list'|'appliance_class_only'|'document_tested_product'|'several_appliances';
 conditionCodes:readonly ComparativeCondition270[];blockSha256:string;blockIndex:number;
 /** Phase271: the task (dish) as a PEE code from the result's heading or meal line, or null when not stated. */
 taskLabel:string|null;
 classification:'publisher_reported_comparative_result_lead_only';rankingInput:false;
}
/** Phase271 condition codes: 'same_food_load' (the document states equal quantities in every appliance), 'quantity_reduced'
 * (this task's load was reduced in one appliance: not comparable), 'quality_assessed_same_task' (the document grades the
 * cooked result of the same task, so the time and energy refer to a completed cook). */
export type ComparativeCondition270='includes_preheat'|'power_meter'|'same_food_load'|'quantity_reduced'|'quality_assessed_same_task';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
// Phase271 (developed on the Phase270 documents, now development data): task labels from headings and meal lines.
const TASKS:readonly [string,RegExp][]=[['snacks',/\bsnacks?|nuggets|tenders\b/i],['chicken',/\bchicken|drumsticks?|wings?\b/i],['chips',/\bchips|fries\b/i],['potatoes',/\bpotato(?:es)?\b/i],['cake',/\bcakes?|sponge|muffins?\b/i],
 ['sausages',/\bsausages?\b/i],['bacon',/\bbacon\b/i],['pie',/\bpies?\b/i],['vegetables',/\bvegetables?|veg\b/i],['snacks',/\bsnacks?|nuggets|tenders\b/i],['fish',/\bfish|salmon\b/i]];
export const taskLabel271=(s:string):string|null=>TASKS.find(([,re])=>re.test(s))?.[0]??null;
const SAME_LOAD=/\b(?:quantities of (?:all )?the foods? were the same|the (?:exact )?same (?:meal|quantity|amount)|same quantit(?:y|ies) (?:in|for) (?:each|both))\b/i;
const REDUCED=/\b(?:smaller|half the size|reduced|had to be halved|cut (?:it )?in half)\b/i;
const CLASS_RE=/\b(halogen ovens?|air[- ]?fryers?|deep[- ]fat fryers?|slow cookers?|microwaves?(?: ovens?)?|(?:(?:built-in|electric|fan|conventional|regular|single|double)[- ]){0,3}ovens?|grills?|hobs?)\b/gi;
const classOf=(s:string):ApplianceClass270=>{const x=s.toLowerCase();return x.includes('halogen')?'halogen_oven':/air[- ]?fryer/.test(x)?'air_fryer':x.includes('deep')?'deep_fat_fryer':
 x.includes('slow')?'slow_cooker':x.includes('microwave')?'microwave':x.includes('grill')?'grill':x.includes('hob')?'hob':'oven';};
const WORDS:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,
 sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60};
// value, unit. Money: £1.30 is read as 130 p. A tariff (per kWh, /kWh) is excluded after matching.
const VALUE=/(?<![\d.,£$])(£\s?\d{1,3}(?:\.\d{2})?|\d{1,4}(?:\.\d{1,3})?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty)\s?(mins?|minutes?|kwh|p|pence|c|cents)?(?![a-z0-9])/gi;
const TARIFF_BEFORE=/\bunit (?:cost|price|rate) of\s*$|\btariff of\s*$|\brate of\s*$/i;
const ADJUSTMENT=/\b(?:an extra|another|additional|added|add)\s*$/i;
const BOUND=/\b(?:at least|up to|over|under|more than|less than|fewer than|no more than|within)\s*$/i;
const APPROX=/\b(?:around|about|approximately|roughly|only|just|nearly|almost)\s*$/i;
const HYPOTHETICAL=/\b(?:would|you'd|we'd|if (?:you|we|i)|if it|assum\w*|for example|e\.g\.|per year|a year|annual\w*|each year|multiply|divid\w*|could save|you could|estimate[ds]?)\b/i;
const TARIFF_AFTER=/^\s*(?:\/\s*kwh|per\s+(?:kwh|unit|kilowatt))/i;
// Cues from the development documents (CHOICE: "I used my smart meter app"; Consumer NZ: "in our lab", "our tests";
// Expert Reviews: "power meter") and their plain synonyms; no cue was taken from the Phase270 held-out documents.
const DOC_TEST=/\b(?:I|we)\s+(?:used|measured|cooked|tested|timed|tried)\b|\bour (?:test|tests|lab)\b/i;
const DOC_METER=/\b(?:smart meter|energy (?:meter|monitor)|power meter|plug-in (?:meter|monitor)|lab|laboratory)\b/i;
const PREHEAT_DOC=/\b(?:times|figures) include (?:the )?(?:energy used during )?preheat/i;
const SUBJECT_CUE=/\b(?:picked up the|bought the|head-to-head|i tested the|we tested the|model we tested|i used the|our appliances|appliances we used|the appliances (?:we|i) (?:used|tested)|i opted to test)\b/i;
const MODEL=/\b(?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{3,}\b/;

function unitOf(u:string|undefined):{dimension:ComparativeResult270['dimension'];unit:ComparativeResult270['unit']}|null{
 const x=(u??'').toLowerCase();
 if(/^min/.test(x))return {dimension:'duration',unit:'minutes'};if(x==='kwh')return {dimension:'energy',unit:'kwh'};
 if(x==='p'||x==='pence')return {dimension:'cost',unit:'p'};if(x==='c'||x==='cents')return {dimension:'cost',unit:'cents'};return null;
}
interface Hit {value:number;dimension:ComparativeResult270['dimension'];unit:ComparativeResult270['unit'];at:number;end:number;approximate:boolean}
function values(text:string):Hit[]{
 const out:Hit[]=[];
 for(const m of text.matchAll(VALUE)){
  const raw=m[1];let u=m[2];const before=text.slice(Math.max(0,m.index!-24),m.index!),after=text.slice(m.index!+m[0].length);
  let value:number;
  // A pound amount of £10 or more in a cooking text is a price or a total, not the cost of one cooking task.
  if(raw.startsWith('£')){value=Math.round(Number(raw.replace(/[£\s]/g,''))*100);u='p';if(value>=1000)continue;}
  else value=WORDS[raw.toLowerCase()]??Number(raw);
  const k=unitOf(u);if(!k||!Number.isFinite(value))continue;
  if(TARIFF_AFTER.test(after)||TARIFF_BEFORE.test(before)||BOUND.test(before)||ADJUSTMENT.test(before))continue;
  // A range ("12p to 17p", "10-15 minutes") is not a single result.
  if(/^\s*(?:to|-|–|and)\s*£?\d/.test(after)||/\d\s*[a-z]*\s*(?:to|-|–|and)\s*$/i.test(before)||/\bbetween\s*$/i.test(before))continue;
  out.push({value,...k,at:m.index!,end:m.index!+m[0].length,approximate:APPROX.test(before)});
 }
 return out;
}
/** Named test subjects: '<Capitalised name> [model] [modifiers] <class>' in the document's own test-subject statements. */
function namedSubjects(blocks:readonly string[]):Map<ApplianceClass270,{name:string;model:string|null}[]>{
 const out=new Map<ApplianceClass270,{name:string;model:string|null}[]>();
 blocks.forEach((b,i)=>{
  const ctx=SUBJECT_CUE.test(b)||(i>0&&SUBJECT_CUE.test(blocks[i-1])&&blocks[i-1].length<60)||(i>1&&SUBJECT_CUE.test(blocks[i-2])&&blocks[i-2].length<60);
  if(!ctx)return;
  const re=/((?:[A-Z][\w&'-]*|\d[\w-]*)(?:\s+(?:[A-Z][\w&'-]*|\d[\w.-]*))*)\s+((?:(?:built-in|electric|fan)\s+)*(?:[Hh]alogen [Oo]vens?|[Aa]ir[- ]?[Ff]ryers?|[Oo]vens?|[Gg]rills?|[Mm]icrowaves?|[Ss]low [Cc]ookers?|[Hh]obs?))\b((?:\s+[A-Z][\w-]*){0,2})/g;
  for(const m of b.matchAll(re)){
   const name=m[1].replace(/^(?:(?:Our|The|My|A|An|I|We|Appliances|Opted|Then|Naturally)\s+)+/,'').trim();
   const trailing=(m[3]??'').trim();
   const full=(/air[- ]?fryer/i.test(m[2])&&!/fryer/i.test(name)||trailing?`${name} ${m[2]} ${trailing}`:name).replace(/\s+/g,' ').trim();
   if(!/^[A-Z][a-z]/.test(name)||full.split(/\s+/).length<2||/^(?:Our|The|My|This|That|Built-in)\b/.test(full))continue;
   const cls=classOf(m[2]);const model=MODEL.exec(full)?.[0]??null;
   const list=out.get(cls)??[];if(!list.some(x=>x.name===full))list.push({name:full,model});out.set(cls,list);
  }
 });
 return out;
}
/** Phase271: the document's own named test subjects by equipment class (shared with the qualitative reader). */
export function documentSubjects271(html:string):Map<ApplianceClass270,{name:string;model:string|null}[]>{
 return namedSubjects(textBlocks225(html,{splitLineBreaks:true,maxBlocks:1500}).blocks);
}
/** Appliance classes named in a text, in order (shared with the qualitative reader). */
export const applianceMentions270=(text:string)=>[...text.matchAll(CLASS_RE)].map(m=>({cls:classOf(m[0]),at:m.index!,end:m.index!+m[0].length}));
/** Phase271 (development: Which? "At only 6p, and baking in less time than the oven, the air fryer …"): a mention introduced
 * by "than (the)" is the comparison target, dropped when the clause names another appliance. */
const mentions=(text:string)=>{const all=[...text.matchAll(CLASS_RE)].map(m=>({cls:classOf(m[0]),at:m.index!,end:m.index!+m[0].length,
 than:/\bthan\s+(?:the\s+|an?\s+|your\s+|my\s+)?$/i.test(text.slice(Math.max(0,m.index!-14),m.index!))}));return all.some(m=>!m.than)?all.filter(m=>!m.than):all;};

export function comparativeResults270(html:string,opts:{testedClass?:ApplianceClass270}={}):{results:ComparativeResult270[];gated:boolean;
 /** S86: values of sentences or clauses that quote another source, state a declaration or a test not done */
 declaredSkipped?:number}{
 // Navigation-heavy pages hold the article after hundreds of menu blocks (the CHOICE page: 1,084 blocks, article after
 // the probe's 380-block bound), so this reader reads up to 1,500.
 const {blocks,tags=[]}=textBlocks225(html,{splitLineBreaks:true,maxBlocks:1500});
 const doc=blocks.join('\n');
 if(!DOC_TEST.test(doc)||!DOC_METER.test(doc))return {results:[],gated:false};
 const subjects=namedSubjects(blocks);const docCodes:ComparativeCondition270[]=['power_meter'];if(PREHEAT_DOC.test(doc))docCodes.unshift('includes_preheat');
 if(SAME_LOAD.test(doc))docCodes.push('same_food_load');
 // "The quantities … were the same in each appliance (except for the cake in the air fryer)": that task is reduced.
 const excepted=new Set([...doc.matchAll(/\bexcept (?:for )?the (\w+)/gi)].map(m=>taskLabel271(m[1])).filter((x):x is string=>!!x));
 let label:string|null=null;const reducedTasks=new Set<string>(excepted);const gradedTasks=new Set<string>();
 const tested=opts.testedClass??null;
 const resolve=(cls:ApplianceClass270|'several',rowLabel?:string):Pick<ComparativeResult270,'subject'|'subjectAssignment'>=>{
  if(cls==='several')return {subject:null,subjectAssignment:'several_appliances'};
  let named=subjects.get(cls)??[];
  // Phase271: several products of one class ("Zephyrine air fryer", "Nimbus air fryer" rows): a row names one listed
  // product when its own words (beyond the class name) occur in exactly one listed name. Exact tokens, never similarity.
  if(named.length>1&&rowLabel){const words=rowLabel.toLowerCase().replace(CLASS_RE,' ').split(/[^a-z0-9]+/).filter(w=>w.length>2&&!['built','the','and'].includes(w));
   const hit=words.length?named.filter(x=>words.every(w=>x.name.toLowerCase().split(/[^a-z0-9]+/).includes(w))):[];if(hit.length===1)named=hit;}
  if(named.length===1)return {subject:{name:named[0].name,model:named[0].model,sku:null},subjectAssignment:cls===tested&&!named[0].model?'document_tested_product':'class_row_resolved_by_document_appliance_list'};
  return {subject:null,subjectAssignment:'appliance_class_only'};
 };
 const out:ComparativeResult270[]=[];const seen=new Set<string>(),seenAny=new Set<string>();let task=0;let declaredSkipped=0;
 const push=(cls:ApplianceClass270|'several',h:Hit,form:ComparativeResult270['form'],block:string,bi:number,extra:('includes_preheat')[]=[],rowLabel?:string)=>{
  // A list or table value is one result per task; a prose value repeating any earlier result is not a new one.
  const who=resolve(cls,rowLabel);const any=[cls,who.subject?.name??'',h.dimension,h.value,h.unit].join('|'),key=any+'|'+task;
  if(seen.has(key)||(form==='prose'&&seenAny.has(any)))return;seen.add(key);seenAny.add(any);
  out.push({appliance:cls,taskIndex:task,taskLabel:label,dimension:h.dimension,value:h.value,unit:h.unit,approximate:h.approximate,form,...who,
   conditionCodes:[...new Set([...docCodes,...extra])].sort(),blockSha256:sha(block),blockIndex:bi,classification:'publisher_reported_comparative_result_lead_only',rankingInput:false});
 };
 // 1. Tables: a header row naming at least two of time / energy / cost; the first cell of each row is the appliance.
 for(const t of html.matchAll(/<table\b[\s\S]{0,40000}?<\/table>/gi)){
  const rows=[...t[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(r=>[...r[0].matchAll(/<(t[dh])\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(c=>textBlocks225(`<p>${c[2]}</p>`).blocks.join(' ')));
  const hi=rows.findIndex(r=>r.filter(c=>/\b(?:time|duration)\b|\benergy\b|\bcost\b/i.test(c)).length>=2);if(hi<0)continue;
  const head=rows[hi].map(c=>/\b(?:time|duration)\b/i.test(c)?'duration':/\benergy\b/i.test(c)?'energy':/\bcost\b/i.test(c)?'cost':null);
  task++;
  // The task is named by the nearest heading before the table; the text up to the next heading may say the load was reduced.
  const before=html.slice(Math.max(0,t.index!-6000),t.index!);const hs=[...before.matchAll(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/gi)];
  label=hs.length?taskLabel271(textBlocks225(`<p>${hs.at(-1)![1]}</p>`).blocks.join(' ')):null;
  const afterT=html.slice(t.index!+t[0].length,t.index!+t[0].length+8000).split(/<h[2-4]\b/i)[0];
  if(label&&REDUCED.test(textBlocks225(afterT).blocks.join(' ')))reducedTasks.add(label);
  if(label&&head.length>head.filter(Boolean).length+1)gradedTasks.add(label);
  for(const r of rows.slice(hi+1)){const m=mentions(r[0]??'');if(m.length!==1)continue;
   r.forEach((cell,ci)=>{const dim=head[ci];if(!dim||ci===0)return;for(const h of values(cell))if(h.dimension===dim)push(m[0].cls,h,'table_row',r.join('|'),-1,[],r[0]);});}
 }
 // 2. Blocks: list lines ("Oven – 36min, 31 cents") and first-person prose.
 blocks.forEach((b,bi)=>{
  if(/^h[1-6]$/.test(tags[bi]??'')||/^(?:meal|test|dish)\s*\d+\b/i.test(b)){task++;label=taskLabel271(b);return;}
  const line=/^\s*([A-Za-z][A-Za-z -]{2,40}?)\s*(?:–|—|-|:)\s+(.{3,160})$/.exec(b);
  if(line&&mentions(line[1]).length===1&&line[1].length<=40){
   const cls=mentions(line[1])[0].cls;const hs=values(line[2]);
   // S86: a list line that quotes another source, a test not done or a declaration is not this tester's result
   if(hs.length&&(SECONDARY_SOURCE225.test(b)||NEGATED_METHOD225.test(b)||declaredInClause225(line[2]))){declaredSkipped+=hs.length;return;}
   const pre=/including\s+(?:\d+|[a-z]+)\s*min(?:ute)?s?\s+preheat/i.test(line[2]);
   const kept=hs.filter(h=>!/including\s*$/i.test(line[2].slice(Math.max(0,h.at-12),h.at)));
   if(kept.length){for(const h of kept)push(cls,h,'line_list',b,bi,pre?['includes_preheat']:[]);return;}
  }
  if(b.length>900)return;
  for(const sent of b.split(/(?<=[.!?])\s+(?=[A-Z£])/)){
   if(HYPOTHETICAL.test(sent))continue;
   // S86 (owner: a test publisher's page also quotes the maker and mentions methods it did not perform): a sentence that
   // reports another source or a test not done gives no comparative result (the probe's own screens, shared)
   if(SECONDARY_SOURCE225.test(sent)||NEGATED_METHOD225.test(sent)){declaredSkipped++;continue;}
   // A prose result names its own task when the heading does not ("We could cook four medium potatoes …").
   const sentenceTask=taskLabel271(sent);if(sentenceTask)label=sentenceTask;
   if(label&&REDUCED.test(sent))reducedTasks.add(label);
   // Clauses: a comparison word starts a new clause.
   const clauses=sent.split(/\b(?=compared (?:to|with)\b|\bwhereas\b|\bwhile\b|\bbut\b|\bversus\b|\bvs\.?\s)/i);
   for(const c of clauses){
    const hs=values(c);if(!hs.length)continue;const ms=mentions(c);
    // S86: a clause that states a declaration ("the maker claims chips in 15 minutes") is not this tester's result
    if(declaredInClause225(c)){declaredSkipped+=hs.length;continue;}
    for(const h of hs){
     // Cost and energy need a cooking context in the clause (not a price "sells for £149.99").
     if(/\b(?:priced|costs? (?:from|between)|rrp)\b/i.test(c))continue;
     const after=ms.find(m=>m.at>=h.end&&m.at-h.end<=24&&/^\s*(?:in|on|under|using|with|from)\s+(?:the|an|a|one|my|our)?\s*/i.test(c.slice(h.end,m.at)));
     const before=[...ms].reverse().find(m=>m.end<=h.at);
     let cls:ApplianceClass270|'several'|null=after?.cls??null;
     if(!cls&&new Set(ms.map(m=>m.cls)).size>1&&ms.every(m=>m.end<=h.at)&&/\band\b/.test(c.slice(ms[0].end,ms.at(-1)!.at)))cls='several';
     // No appliance in the clause: the clause contrasts with the tested appliance only when the sentence names another one.
     cls??=before?.cls??ms.find(m=>m.at>=h.end)?.cls??(mentions(sent).length?tested:null);
     if(!cls)continue;push(cls,h,'prose',b,bi);
    }
   }
  }
 });
 // Comparative evidence names at least two appliance classes with results; otherwise this reader yields nothing (a
 // single-product review is the Phase225 probe's job).
 if(new Set(out.map(x=>x.appliance).filter(a=>a!=='several')).size<2)return {results:[],gated:true,declaredSkipped};
 for(const r of out){const c=new Set(r.conditionCodes);if(r.taskLabel&&reducedTasks.has(r.taskLabel)){c.delete('same_food_load');c.add('quantity_reduced');}
  if(r.taskLabel&&gradedTasks.has(r.taskLabel))c.add('quality_assessed_same_task');(r as {conditionCodes:readonly ComparativeCondition270[]}).conditionCodes=[...c].sort();}
 return {results:out.slice(0,80),gated:true,declaredSkipped};
}
