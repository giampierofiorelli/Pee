/** Phase144 — original, bounded extraction of typed evidence OBSERVATIONS.
 * These are language hypotheses, not authenticated facts, verified product
 * identity, a syntactic/semantic parser, causal effects or rankings.
 * Category-neutral: cycle/mode/test roles are determined by surrounding syntax.
 * Source text offsets survive unchanged; external page hints cannot prove identity.
 */
import {createHash} from 'node:crypto';
import {readUnmarkedEnglish139, type ReaderInput139} from './phase139_unmarked_english_candidate_reader.js';
import type {Span131} from './phase131_local_relation_learning.js';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export type QuantityRole144='percentage'|'acoustic_level'|'screen_luminance'|'operating_cost'|'duration';
export type ReportingRole144='manufacturer_claim'|'test_or_reviewer_report'|'unknown';
export type Assignment144='explicit_named_mode'|'ordinal_respectively'|'explicit_surface_subject'|'implicit_or_ambiguous';
export type Decision144='candidate_quarantined'|'claim_only'|'subject_unresolved'|
 'endpoint_unresolved'|'setting_not_outcome'|'alignment_unresolved'|'comparator_unresolved';
export interface EvidenceSpan144 {start:number;end:number;literal:string;sha256:string;}
export interface Quantity144 extends EvidenceSpan144 {role:QuantityRole144;unit:string;value:number;qualifier:'exact_surface'|'about'|'lower_bound'|'upper_bound';}
export interface EvidenceObservation144 {
 id:string; sentenceId:number; evidence:EvidenceSpan144; quantity:Quantity144;
 modeOrSetting:EvidenceSpan144|null; condition:EvidenceSpan144|null;
 sourceSubject:EvidenceSpan144|null; subjectIdentity:'explicit_surface_unverified'|'page_hint_unverified'|'unresolved';
 /** 'outcomeEndpoint' is extracted from same local statement, never derived
  * from neighboring sentences or general category knowledge. */
 outcomeEndpoint:EvidenceSpan144|null;reporting:ReportingRole144;
 assignment:Assignment144;status:Decision144;reasons:string[];
 measuredProductAuthenticated:false;sourceAuthenticated:false;
 scientificReviewRequired:true;rankingAuthorized:false;canonicalWriteAuthorized:false;
}
export interface ObservationGraph144 {
 phase:144;sourceId:string;originalDocumentId:string;documentSha256:string;
 pageIdentityOnlyCallerAsserted:boolean;baseline139Pairs:number;observations:EvidenceObservation144[];
 noCandidateMeaning:'nothing_extracted_not_absence_of_feature';
 coverageTruncated:boolean;truncationReasons:string[];
 independentGoldAnnotations:0;accuracy:null;scientificReviewRequired:true;
 rankingAuthorized:false;canonicalWriteAuthorized:false;
}
interface Sentence144 {id:number;start:number;end:number;}
const checkSpan=(text:string,s:Span131):EvidenceSpan144=>{
 if(!Number.isSafeInteger(s.start)||!Number.isSafeInteger(s.end)||s.start<0||s.end>text.length||s.end<=s.start)throw Error('invalid_evidence_span_144');
 const literal=text.slice(s.start,s.end);return {...s,literal,sha256:digest(literal)};
};
function sentences144(t:string):Sentence144[]{
 let last=0;const out:Sentence144[]=[];
 const add=(end:number)=>{let a=last,b=end;while(a<b&&/\s/.test(t[a]))a++;while(b>a&&/\s/.test(t[b-1]))b--;
  if(b>a)out.push({id:out.length,start:a,end:b});last=end;};
 for(const m of t.matchAll(/(?:[.!?](?=\s|$)|\n\s*\n)/g))add(m.index!+m[0].length);
 add(t.length);return out;
}
/** Only a compact set of quantity *shapes*. Unlike a synonym list, the unit is
 * evidence of dimensional type, never the name of a reviewed feature. */
function quantities144(t:string,s:Sentence144):Quantity144[]{
 const result:Quantity144[]=[];const chunk=t.slice(s.start,s.end);
 // Regex ends must retain '%' and no-space pence; use an alternate boundary check.
 for(const m of chunk.matchAll(/\b(\d+(?:\.\d+)?)(\s*(?:%|dBA|cd\/m[²2]|nits?|hours?|hrs?|minutes?|mins?|pence|p(?=\s|[,.!?]|$)))/gi)){
  const a=s.start+m.index!,end=a+m[0].length,unitRaw=m[2].trim().toLowerCase();
  if(end<t.length&&/[A-Za-z\d]/.test(t[end]))continue;
  const unit=unitRaw==='hrs'||unitRaw==='hr'?'hours':unitRaw.startsWith('min')?'minutes':unitRaw==='pence'?'p':unitRaw;
  const role:QuantityRole144=unit==='%'?'percentage':unit==='dba'?'acoustic_level':
   unit==='cd/m²'||unit==='cd/m2'||unit==='nit'||unit==='nits'?'screen_luminance':
   unit==='p'?'operating_cost':'duration';
  const prev=t.slice(Math.max(s.start,a-25),a);
  const qualifier:Quantity144['qualifier']=/(?:more\s+than|over|exceed(?:s|ed)?|at\s+least)\s*$/i.test(prev)?'lower_bound':
   /(?:less\s+than|under|at\s+most)\s*$/i.test(prev)?'upper_bound':
   /(?:about|around|approximately|roughly|nearly)\s*$/i.test(prev)?'about':'exact_surface';
  result.push({...checkSpan(t,{start:a,end}),role,unit,value:Number(m[1]),qualifier});
 }
 // Compound elapsed duration: 54 hours and 43 minutes is one value.
 const merged:Quantity144[]=[];
 for(let i=0;i<result.length;i++){
  const q=result[i],n=result[i+1];
  if(q.role==='duration'&&q.unit==='hours'&&n?.unit==='minutes'&&
     /^\s+and\s+$/i.test(t.slice(q.end,n.start))){
    const compound=checkSpan(t,{start:q.start,end:n.end});
    merged.push({...compound,role:'duration',unit:'hours_and_minutes',value:q.value+n.value/60,qualifier:q.qualifier});i++;
  }else merged.push(q);
 }
 return merged;
}
const modeNoun='(?:cycle|programme|program|mode|setting|speed|test)';
function mode144(t:string,s:Sentence144,at:number):EvidenceSpan144|null{
 const part=t.slice(s.start,s.end);
 // Explicit noun after a (possibly capitalised) name: 'Heavy Duty cycle', 'Turbo speed'.
 const re=new RegExp(`\\b((?:[A-Za-z0-9-]+\\s+){0,3}${modeNoun})\\b`,'gi');
 const matches=[...part.matchAll(re)].map(m=>({start:s.start+m.index!,end:s.start+m.index!+m[1].length}));
 // Prefer the nearest construction; don't attach settings from distant sentences.
 const sorted=matches.filter(m=>Math.abs(m.start-at)<140).sort((a,b)=>Math.abs(a.start-at)-Math.abs(b.start-at)||a.start-b.start);
 const first=sorted[0];return first?checkSpan(t,first):null;
}
function condition144(t:string,s:Sentence144,q:Quantity144):EvidenceSpan144|null{
 const before=t.slice(s.start,q.start),after=t.slice(q.end,s.end);
 // 'at Turbo speed', 'in our Wi-Fi test (150 cd/m²)' and 'this cycle' are
 // conditions, not automatically features or verified protocols.
 const at=/\b(?:at|in|during|under|with|on)\s+(?:(?:our|the|this|its)\s+)?(?:[A-Za-z0-9-]+\s+){0,3}(?:speed|cycle|mode|test|setting|program(?:me)?)\b/gi;
 const found=[...before.matchAll(at)];
 if(found.length){const last=found[found.length-1];if(before.length-(last.index!+last[0].length)<110)
  return checkSpan(t,{start:s.start+last.index!,end:s.start+last.index!+last[0].length});}
 // 'at Turbo speed' following an observed quantity: do not let it cross
 // 'so', a comparison, or a reported new measurement.
 const next=after.split(/\b(?:so|but|whereas|although|while|than)\b/i)[0].slice(0,75);
 const afterMode=/^\s+(?:at|under|in|on|with)\s+(?:[A-Za-z0-9-]+\s+){1,3}(?:speed|cycle|mode|setting|test)\b/i.exec(next);
 if(afterMode)return checkSpan(t,{start:q.end+afterMode.index!+afterMode[0].indexOf(afterMode[0].trim()),end:q.end+afterMode.index!+afterMode[0].length});
 // Parenthetical measured brightness attached to a locally named test.
 if(q.role==='screen_luminance'&&/\btest\b/i.test(before.slice(-55))) {
  const m=/\b(?:in\s+)?(?:our\s+)?[A-Za-z0-9-]+\s+test\s*\(?\s*$/i.exec(before);
  if(m)return checkSpan(t,{start:q.start-m[0].length,end:q.end});
 }
 const thisCycle=/\bthis\s+cycle\b/i.exec(after.slice(0,70));
 if(thisCycle)return checkSpan(t,{start:q.end+thisCycle.index,end:q.end+thisCycle.index+thisCycle[0].length});
 return null;
}
function endpoint144(t:string,s:Sentence144,q:Quantity144):EvidenceSpan144|null{
 if(q.role==='acoustic_level')return checkSpan(t,{start:q.start+q.literal.toLowerCase().indexOf('dba'),end:q.end});
 if(q.role==='duration'){
  const pre=t.slice(Math.max(s.start,q.start-90),q.start);
  const m=/(?:playback\s+time|battery\s+life|runtime|lasted|shuts\s+itself\s+off)\b/gi;
  const end=[...pre.matchAll(m)].at(-1);if(end)return checkSpan(t,{start:q.start-pre.length+end.index!,end:q.start-pre.length+end.index!+end[0].length});
  return null;
 }
 if(q.role==='operating_cost'){
  const tail=t.slice(q.end,Math.min(s.end,q.end+55));
  const m=/\b(?:to\s+run\s+(?:this|the|a)\s+cycle|per\s+cycle)\b/i.exec(tail);
  return m?checkSpan(t,{start:q.end+m.index!,end:q.end+m.index!+m[0].length}):null;
 }
 if(q.role==='screen_luminance')return null; // Could be test SETTING, not measured brightness.
 const tail=t.slice(q.end,Math.min(s.end,q.end+100));
 const m=/^\s*of\s+(?:the\s+)?(?:(?:[A-Za-z-]+\s+){0,3})(?:stains?|dirt|soil|debris|particles|dust|water|lint|food|residue|rice|hair)\b/i.exec(tail);
 return m?checkSpan(t,{start:q.end+m.index!+m[0].indexOf('of'),end:q.end+m.index!+m[0].length}):null;
}
function reporting144(t:string,s:Sentence144,q:Quantity144):ReportingRole144{
 const pre=t.slice(s.start,q.start);
 // A change of grammatical subject after the attributed assertion closes
 // attribution: 'advertises 60 hours, the headphones lasted 54 hours'.
 const claim=[...pre.matchAll(/\b(?:advertises?|claims?|promises?|says?|states?|lists?)\b/gi)].at(-1);
 const observed=[...pre.matchAll(/\b(?:lasted|measured|found|removed|scored|hit|recorded|tested|achieved|shuts\s+itself\s+off|cost)\b/gi)].at(-1);
 if(claim&&(!observed||claim.index!>observed.index!))return 'manufacturer_claim';
 if(observed||/\b(?:our|my|we|reviewer)\b/i.test(pre))return 'test_or_reviewer_report';
 return 'unknown';
}
function directlyNamedMode144(t:string,s:Sentence144,q:Quantity144):EvidenceSpan144|null{
 const pre=t.slice(s.start,q.start);
 const re=/\b(?:the\s+)?((?:[A-Za-z0-9-]+\s+){1,3}(?:cycle|mode|speed|program(?:me)?|setting))\s+(?:removed|scored|hit|measured|consumed|cost|lasted)\s+(?:about\s+|roughly\s+|more\s+than\s+)?$/i;
 const m=re.exec(pre);
 return m?checkSpan(t,{start:s.start+m.index!+m[0].indexOf(m[1]),end:s.start+m.index!+m[0].indexOf(m[1])+m[1].length}):null;
}
function respectively144(t:string,s:Sentence144,qs:Quantity144[]):Map<number,EvidenceSpan144>{
 const map=new Map<number,EvidenceSpan144>();const raw=t.slice(s.start,s.end);
 if(!/\brespectively\b/i.test(raw)||qs.length<2)return map;
 const first=qs[0];const pre=t.slice(s.start,first.start);
 const m=/^\s*(?:the\s+)?(.+?)\s+(?:scored|measured|recorded|removed|achieved)\s*$/i.exec(pre);
 if(!m)return map;
 // Only align explicit comma-separated list with final 'and', no implicit model assignment.
 const list=m[1].split(/,\s*|\s+and\s+/i).map(x=>x.trim().replace(/^and\s+/i,'')).filter(Boolean);
 if(list.length!==qs.length||list.length>8||list.some(x=>x.length>60||!/^[A-Za-z0-9][\w\s-]*$/.test(x)))return map;
 for(let i=0;i<qs.length;i++){
  const item=list[i],firstAt=pre.indexOf(item);
  if(firstAt<0||pre.indexOf(item,firstAt+item.length)>=0)return new Map();
  map.set(qs[i].start,checkSpan(t,{start:s.start+firstAt,end:s.start+firstAt+item.length}));
 }
 return map;
}
export function readCrossCategoryObservations144(input:ReaderInput139,maxObservations=100):ObservationGraph144{
 // Earlier guards validate source IDs, URL shape, source digest, hint schema,
 // caller bounds and original text. No bypass if no Phase139 pairs are found.
 const base=readUnmarkedEnglish139(input);
 if(!Number.isSafeInteger(maxObservations)||maxObservations<1||maxObservations>300)throw Error('invalid_observation_limit_144');
 const t=input.document.text,out:EvidenceObservation144[]=[];let truncated=false;
 for(const s of sentences144(t)){
  const qs=quantities144(t,s),aligned=respectively144(t,s,qs);
  for(const q of qs){
   if(out.length>=maxObservations){truncated=true;break;}
   const m=aligned.get(q.start)??directlyNamedMode144(t,s,q);
   const c=condition144(t,s,q),endpoint=endpoint144(t,s,q);
   const segment=t.slice(s.start,q.start);
   const comparator=/\b(?:older|previous|compared\s+(?:with|to)|than)\s+[A-Za-z0-9-]+\s*\(\s*$/i.test(segment);
   // Clausal subject changes, including generic 'the headphones', block reuse
   // of a brand mentioned earlier in the same sentence.
   const clauseBoundary=[...segment.matchAll(/,\s*|\b(?:but|whereas|although|so)\b/gi)].at(-1);
   const clauseStart=clauseBoundary? s.start+clauseBoundary.index!+clauseBoundary[0].length:s.start;
   const match=[...base.mentions.filter(x=>x.sentenceId===s.id&&x.type==='product_name'&&x.span.end<=q.start&&x.span.start>=clauseStart)].at(-1);
   // An explicit surface name can refer to a mode, app, old model or accessory.
   // If it's identical to the mode token, do not call it a product.
   const knownSubject=match&&!/^(?:while|although|after|before|during|since|whereas)\s/i.test(match.literal)&&
    !(m&&match.span.start>=m.start&&match.span.end<=m.end)?checkSpan(t,match.span):null;
   const reporting=comparator?'unknown':reporting144(t,s,q);
   const luminancePre=t.slice(Math.max(s.start,q.start-85),q.start);
   const luminanceMeasuring=/\b(?:hit|reached|peaked|recorded|measured|produced|achieved)\s*(?:at\s*)?$/i.test(luminancePre);
   const settingOnly=q.role==='screen_luminance'&&
    (/(?:test|brightness|set\s+to)\s*\(?\s*$/i.test(luminancePre)&&!luminanceMeasuring||
      /(?:at|under)\s*$/i.test(luminancePre)&&!luminanceMeasuring);
   const unresolvedLuminance=q.role==='screen_luminance'&&!settingOnly&&!luminanceMeasuring;
   let status:Decision144,assignment:Assignment144='implicit_or_ambiguous',reasons:string[]=[];
   if(aligned.has(q.start)){assignment='ordinal_respectively';reasons.push('ordered_list_alignment_is_surface_hypothesis');}
   else if(m){assignment='explicit_named_mode';reasons.push('mode_or_cycle_is_not_product_identity');}
   else if(knownSubject){assignment='explicit_surface_subject';reasons.push('surface_subject_not_authenticated');}
   const subjectIdentity=knownSubject?'explicit_surface_unverified':input.pageIdentity?'page_hint_unverified':'unresolved';
   if(comparator){status='comparator_unresolved';reasons.push('older_or_other_model_comparison_not_page_product');}
   else if(settingOnly){status='setting_not_outcome';reasons.push('luminance_in_test_condition_not_product_brightness_result');}
   else if(reporting==='manufacturer_claim'){status='claim_only';reasons.push('manufacturer_or_packaging_statement_not_independent_measurement');}
   else if(q.role==='percentage'&&!endpoint){status='endpoint_unresolved';reasons.push('percentage_lacks_local_measured_endpoint');}
   else if(unresolvedLuminance){status='endpoint_unresolved';reasons.push('cannot_distinguish_screen_setting_from_measured_brightness');}
   else if(!knownSubject){status='subject_unresolved';reasons.push('no_authenticated_product_referent_within_statement');}
   else {status='candidate_quarantined';reasons.push('candidate_requires_source_protocol_and_identity_review');}
   if(c?.literal.toLowerCase().includes('this cycle')){reasons.push('deictic_cycle_identifier_unresolved');if(status==='candidate_quarantined')status='subject_unresolved';}
   if(m?.literal.toLowerCase()==='the')reasons.push('mode_unverified');
   const evidence=checkSpan(t,{start:s.start,end:s.end});
   out.push({id:`q144_${q.start}_${q.end}`,sentenceId:s.id,evidence,quantity:q,
    modeOrSetting:comparator?null:m??(c&&/\b(?:cycle|mode|speed|program(?:me)?|setting)\b/i.test(c.literal)?c:null),
    condition:comparator?null:c,sourceSubject:knownSubject,subjectIdentity,outcomeEndpoint:endpoint,reporting,
    assignment,status,reasons,measuredProductAuthenticated:false,sourceAuthenticated:false,
    scientificReviewRequired:true,canonicalWriteAuthorized:false,rankingAuthorized:false});
  }
  if(truncated)break;
 }
 out.sort((a,b)=>a.quantity.start-b.quantity.start||a.id.localeCompare(b.id));
 return {phase:144,sourceId:base.sourceId,originalDocumentId:base.originalDocumentId,
  documentSha256:base.documentSha256,pageIdentityOnlyCallerAsserted:!!input.pageIdentity,
  baseline139Pairs:base.pairs.length,observations:out,
  noCandidateMeaning:'nothing_extracted_not_absence_of_feature',
  coverageTruncated:truncated||base.coverageTruncated,
  truncationReasons:[...(truncated?['observation_limit']:[]),...base.truncationReasons],
  independentGoldAnnotations:0,accuracy:null,scientificReviewRequired:true,
  canonicalWriteAuthorized:false,rankingAuthorized:false};
}
