/** Phase145: original bounded dimension/measurement candidate extraction.
 * All interpretations are provisional. Scientific and identity review remain external.
 * Phase144 remains unchanged, preserving its previously published behavior.
 */
import {createHash} from 'node:crypto';
import {readCrossCategoryObservations144, type EvidenceSpan144, type EvidenceObservation144} from './phase144_cross_category_observation_graph.js';
import type {ReaderInput139} from './phase139_unmarked_english_candidate_reader.js';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const evidence=(text:string,start:number,end:number):EvidenceSpan144=>{
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end>text.length||start>=end)throw Error('invalid_phase145_offset');
 const literal=text.slice(start,end);return {start,end,literal,sha256:sha(literal)};
};
export type Dimension145='temperature'|'sound_pressure_level'|'frequency'|'energy'|'power'|'volume'|'luminance'|'length'|'mass'|'duration'|'rotation_speed';
export type Role145='observed_candidate'|'specification_or_setting'|'manufacturer_claim'|'indeterminate';
export type LinkStatus145='surface_repeat_candidate_not_verified';
export interface NumericCandidate145 {
 id:string; sentenceId:number; sentenceEvidence:EvidenceSpan144; quantity:EvidenceSpan144;
 originalValue:number; originalUnit:string; dimension:Dimension145;
 canonicalUnit:string; canonicalValue:number; acousticWeighting:'A'|'unknown'|null;
 role:Role145; roleReasons:string[]; context:EvidenceSpan144|null; subjectSurface:EvidenceSpan144|null;
 subjectAuthenticated:false;sourceAuthenticated:false;sourceId:string;originalDocumentId:string;documentSha256:string;
 scientificReviewRequired:true;canonicalWriteAuthorized:false;rankingAuthorized:false;
}
export interface Reference145 {fromId:string;toId:string; repeatedSurface:string;status:LinkStatus145; evidence:[EvidenceSpan144,EvidenceSpan144]; entityIdentityProven:false; relationProven:false; canonicalWriteAuthorized:false;rankingAuthorized:false;}
export interface UnitGraph145 {
 phase:145;sourceId:string;originalDocumentId:string;documentSha256:string;legacy144:EvidenceObservation144[];
 measurements:NumericCandidate145[];surfaceLinks:Reference145[];
 coverageTruncated:boolean;truncationReasons:string[];noCandidateMeans:'no_extraction_not_negative_evidence';
 independentGoldAnnotations:0;accuracy:null;sourceAuthenticated:false;scientificReviewRequired:true;
 rankingAuthorized:false;canonicalWriteAuthorized:false;
}
interface Sentence {id:number;start:number;end:number;}
function splitSentences(text:string):Sentence[]{
 const out:Sentence[]=[];let start=0;
 const push=(end:number)=>{let a=start,b=end;while(a<b&&/\s/.test(text[a]))a++;while(b>a&&/\s/.test(text[b-1]))b--;
  if(a<b)out.push({id:out.length,start:a,end:b});start=end;};
 // Disambiguate decimal points, preserve a bounded document representation.
 for(const m of text.matchAll(/(?:[.!?](?=\s|$)|\n\s*\n)/g))push(m.index!+m[0].length);
 push(text.length);return out;
}
interface UnitDefinition {spell:string;dimension:Dimension145;canonical:string;factor:number;acoustic:'A'|'unknown'|null;offset?:number;}
// Narrow, auditable unit lexicon: dimension labels are not feature or quality labels.
const definitions:UnitDefinition[]=[
 {spell:'°C',dimension:'temperature',canonical:'°C',factor:1,acoustic:null},
 {spell:'°F',dimension:'temperature',canonical:'°C',factor:5/9,offset:-32,acoustic:null},
 {spell:'degrees Celsius',dimension:'temperature',canonical:'°C',factor:1,acoustic:null},
 {spell:'degrees Fahrenheit',dimension:'temperature',canonical:'°C',factor:5/9,offset:-32,acoustic:null},
 {spell:'dB(A)',dimension:'sound_pressure_level',canonical:'dBA',factor:1,acoustic:'A'},
 {spell:'dBA',dimension:'sound_pressure_level',canonical:'dBA',factor:1,acoustic:'A'},
 {spell:'dB',dimension:'sound_pressure_level',canonical:'dB',factor:1,acoustic:'unknown'},
 {spell:'kHz',dimension:'frequency',canonical:'Hz',factor:1000,acoustic:null},
 {spell:'MHz',dimension:'frequency',canonical:'Hz',factor:1000000,acoustic:null},
 {spell:'Hz',dimension:'frequency',canonical:'Hz',factor:1,acoustic:null},
 {spell:'kWh',dimension:'energy',canonical:'Wh',factor:1000,acoustic:null},
 {spell:'Wh',dimension:'energy',canonical:'Wh',factor:1,acoustic:null},
 {spell:'kW',dimension:'power',canonical:'W',factor:1000,acoustic:null},
 {spell:'W',dimension:'power',canonical:'W',factor:1,acoustic:null},
 {spell:'mL',dimension:'volume',canonical:'mL',factor:1,acoustic:null},
 {spell:'litres',dimension:'volume',canonical:'mL',factor:1000,acoustic:null},
 {spell:'liters',dimension:'volume',canonical:'mL',factor:1000,acoustic:null},
 {spell:'L',dimension:'volume',canonical:'mL',factor:1000,acoustic:null},
 {spell:'cd/m²',dimension:'luminance',canonical:'cd/m²',factor:1,acoustic:null},
 {spell:'cd/m2',dimension:'luminance',canonical:'cd/m²',factor:1,acoustic:null},
 {spell:'nits',dimension:'luminance',canonical:'cd/m²',factor:1,acoustic:null},
 {spell:'nit',dimension:'luminance',canonical:'cd/m²',factor:1,acoustic:null},
 {spell:'mm',dimension:'length',canonical:'mm',factor:1,acoustic:null},
 {spell:'cm',dimension:'length',canonical:'mm',factor:10,acoustic:null},
 {spell:'kg',dimension:'mass',canonical:'kg',factor:1,acoustic:null},
 {spell:'ms',dimension:'duration',canonical:'ms',factor:1,acoustic:null},
 {spell:'rpm',dimension:'rotation_speed',canonical:'rpm',factor:1,acoustic:null},
];
// Longest alternatives first; case-sensitive SI symbols matter (W ≠ Wh, mL ≠ L).
const units=[...definitions].sort((a,b)=>b.spell.length-a.spell.length);
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const numberPattern='(?<![\\w.])(-?\\d{1,5}(?:,\\d{3})*(?:\\.\\d+)?)';
const regex=new RegExp(numberPattern+'\\s*('+units.map(x=>escape(x.spell)).join('|')+')(?![A-Za-z0-9/²])','g');
const definitionsBySymbol=new Map(definitions.map(x=>[x.spell,x]));
function localSubject(text:string,s:Sentence,start:number):EvidenceSpan144|null{
 const pre=text.slice(s.start,start),limit=pre.slice(-100);
 // A repeated *surface* expression (not a verified product ID) is usable for
 // conservative candidate links. No implicit pronouns, page hints or titles.
 const m=/(?:^|[,:;]\s*|\b(?:but|whereas|while)\s+)((?:the\s+)?[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z0-9-]+){0,5})\s+(?:reached|hit|held|measured|recorded|produced|used|consumed|peaked\s+at|was\s+(?:measured\s+at|set\s+to))\s*$/i.exec(limit);
 if(!m)return null;
 const name=m[1].trim();
 if(/^(?:it|they|this|that|these|those|we|the\s+(?:older|previous|other|different)\s+\w+)$/i.test(name))return null;
 if(/\b(?:older|previous|another|other|different|compared)\b/i.test(name))return null;
 const rel=pre.length-limit.length+m.index+m[0].lastIndexOf(m[1]);
 return evidence(text,s.start+rel,s.start+rel+name.length);
}
function localContext(text:string,s:Sentence,quantityStart:number,quantityEnd:number):EvidenceSpan144|null {
 // Settings are preserved literally; neither their presence nor a numerical
 // unit makes the setting a measured outcome.
 const tail=text.slice(quantityEnd,Math.min(s.end,quantityEnd+110));
 const post=/^\s*(?:in|under|during|with|at|on)\s+(?:the\s+|its\s+)?[\w-]+(?:\s+[\w-]+){0,4}\s+(?:mode|cycle|setting|speed|enabled|disabled)\b/i.exec(tail);
 if(post)return evidence(text,quantityEnd+post.index!+post[0].search(/\S/),quantityEnd+post.index!+post[0].length);
 const pre=text.slice(Math.max(s.start,quantityStart-100),quantityStart);
 const before=/(?:in|under|during|with|at|on)\s+(?:the\s+|its\s+)?[\w-]+(?:\s+[\w-]+){0,3}\s+(?:mode|cycle|setting|speed|test)\b[^.!?]*?\(?\s*$/i.exec(pre);
 if(before)return evidence(text,quantityStart-pre.length+before.index!,quantityStart);
 return null;
}
function semanticRole(text:string,s:Sentence,start:number,end:number,dim:Dimension145):{role:Role145;reasons:string[]}{
 const pre=text.slice(s.start,start),post=text.slice(end,s.end);
 const claim=/\b(?:claims?|advertises?|promises?|rated\s+at|lists?|manufacturer\s+says|specifies)\b/i.test(pre.slice(-125));
 if(claim)return {role:'manufacturer_claim',reasons:['claim_or_specification_not_observed']};
 const setting=/\b(?:set\s+to|setting\s+of|configured\s+to|rated\s+for|at\s+a\s+target\s+of|target\s+of)\s*$/i.test(pre.slice(-65)) ||
  (dim==='temperature'&&/\b(?:oven|temperature|thermostat)\s+(?:was\s+)?set\s+to\s*$/i.test(pre.slice(-65)));
 if(setting)return {role:'specification_or_setting',reasons:['setting_cannot_be_counted_as_observed_measurement']};
 const observed=/\b(?:measured|recorded|observed|reached|hit|peaked|held|consumed|used|registered|found|produced)\b/i.test(pre.slice(-95));
 if(observed)return {role:'observed_candidate',reasons:['measurement_cue_only_not_independent_proof']};
 if(/\b(?:specification|driver|tweeter|woofer|rated|frequency\s+response)\b/i.test(pre.slice(-90))||/\b(?:driver|woofer|tweeter)\b/i.test(post.slice(0,45)))
   return {role:'specification_or_setting',reasons:['component_specification_not_independent_test']};
 return {role:'indeterminate',reasons:['measurement_role_not_established']};
}
export function readDimensionalContext145(input:ReaderInput139,maxMeasurements=120):UnitGraph145{
 if(!Number.isSafeInteger(maxMeasurements)||maxMeasurements<1||maxMeasurements>300)throw Error('invalid_phase145_budget');
 const baseline=readCrossCategoryObservations144(input); // required upstream validation
 const text=input.document.text,sentences=splitSentences(text);
 const measurements:NumericCandidate145[]=[];
 let exhausted=false;
 for(const s of sentences){
  const chunk=text.slice(s.start,s.end);regex.lastIndex=0;
  for(const m of chunk.matchAll(regex)){
   if(measurements.length>=maxMeasurements){exhausted=true;break;}
   const def=definitionsBySymbol.get(m[2]);if(!def)continue;
   const start=s.start+m.index!,end=start+m[0].length;
   // Optional manufacturer numerals and physical dimensions stay hypotheses.
   const val=Number(m[1].replace(/,/g,''));if(!Number.isFinite(val))continue;
   const canonicalValue=(val+(def.offset??0))*def.factor;
   const scope=evidence(text,s.start,s.end),q=evidence(text,start,end);
   const role=semanticRole(text,s,start,end,def.dimension);
   measurements.push({id:`m145_${start}_${end}`,sentenceId:s.id,sentenceEvidence:scope,quantity:q,
    originalValue:val,originalUnit:def.spell,dimension:def.dimension,canonicalUnit:def.canonical,
    canonicalValue,acousticWeighting:def.acoustic,role:role.role,roleReasons:role.reasons,
    context:localContext(text,s,start,end),subjectSurface:localSubject(text,s,start),
    subjectAuthenticated:false,sourceAuthenticated:false,sourceId:baseline.sourceId,
    originalDocumentId:baseline.originalDocumentId,documentSha256:baseline.documentSha256,
    scientificReviewRequired:true,canonicalWriteAuthorized:false,rankingAuthorized:false});
  }
  if(exhausted)break;
 }
 const surfaceLinks:Reference145[]=[];
 for(let i=1;i<measurements.length;i++){
  const cur=measurements[i],p=measurements[i-1];
  if(cur.sentenceId!==p.sentenceId+1||cur.dimension!==p.dimension||!cur.subjectSurface||!p.subjectSurface)continue;
  const a=p.subjectSurface.literal.replace(/^the\s+/i,'').toLowerCase().trim();
  const b=cur.subjectSurface.literal.replace(/^the\s+/i,'').toLowerCase().trim();
  if(a!==b||a.length<7||!/[a-z]/.test(a))continue;
  const between=text.slice(p.sentenceEvidence.end,cur.sentenceEvidence.start);
  if(/\n\s*\n/.test(between))continue;
  surfaceLinks.push({fromId:p.id,toId:cur.id,repeatedSurface:a,status:'surface_repeat_candidate_not_verified',
   evidence:[p.subjectSurface,cur.subjectSurface],entityIdentityProven:false,relationProven:false,
   canonicalWriteAuthorized:false,rankingAuthorized:false});
 }
 return {phase:145,sourceId:baseline.sourceId,originalDocumentId:baseline.originalDocumentId,documentSha256:baseline.documentSha256,
  legacy144:baseline.observations,measurements,surfaceLinks,
  coverageTruncated:exhausted||baseline.coverageTruncated,
  truncationReasons:[...(exhausted?['dimension_candidate_limit']:[]),...baseline.truncationReasons],
  noCandidateMeans:'no_extraction_not_negative_evidence',independentGoldAnnotations:0,accuracy:null,
  sourceAuthenticated:false,scientificReviewRequired:true,canonicalWriteAuthorized:false,rankingAuthorized:false};
}
