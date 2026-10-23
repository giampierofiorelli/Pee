/** Phase191: source-integrity and sparse-evidence overlay on Phase189's exact-scope
 * original-source research dossier. Research-only; never authors public ranks.
 * One scarce but well-scoped observation is not automatically worthless, and
 * commercial disclosure is not, by itself, proof of fabricated information.
 * Inspired by Cochrane Handbook ch7 and FTC endorsement/disclosure guidance;
 * these are methodological analogies, NOT external endorsements of PEE.
 */
import {assessQuestion189,validateDossier189,
 type ResearchDossier189,type Question189,type ResearchFinding189,type SourceRecord189}
 from './phase189_source_pilot_reasoning.js';

export type Relationship191='independent_editorial'|'manufacturer_owned'|'retailer_owned'|
 'official_registry'|'consumer_community'|'unknown';
export type Money191='affiliate_disclosed'|'sponsored'|'advertising_disclosed'|
 'no_material_connection_reported'|'undisclosed_or_unknown';
export type Method191='original_measurement_protocol_described'|'observational_method_described'|
 'certificate_scope_documented'|'method_not_established';
export interface SourceContext191 {
 sourceId:string;relationship:Relationship191;money:Money191;method:Method191;
 productSupply:'purchased'|'loaned'|'provided_free'|'not_applicable'|'unknown';
 /** Reviewed by *analyst* against this precise source, NOT cryptographic custody. */
 provenanceLevel:'publisher_statement_checked'|'unverified_annotation';
 evidenceLocator:string;independenceNote:string;
}
/** Origin of EACH claim, not the outlet hosting it. An editorial website may quote
 * a manufacturer-supplied test; URL reputation cannot confer independence. */
export interface RecordOrigin191 {
 recordId:string;origin:'publisher_performed_original_test'|'outside_lab_original_test'|
  'manufacturer_provided_claim'|'manufacturer_commissioned_test'|'consumer_experience'|
  'republication_or_inference'|'unresolved';
 methodTrace:'manually_traced_to_original_method'|'source_attribution_only'|'not_traced';
 originLocator:string;
}
export interface Candidate191 {category:string;variantId:string;name:string;}
export interface FieldRequest191 {candidate:Candidate191;question:Question189;required:boolean;}
export type KnowledgeState191='reported_original_test_unadmitted'|'reported_registry_field_unadmitted'|
 'manufacturer_specification_provisional'|'professional_usage_observation_only'|
 'commercial_promotion_only'|'consumer_experience_only'|'unverified_report'|'conflicting_measurements'|'not_yet_documented';
export interface ProductFinding191 {
 variantId:string;name:string;category:string;field:string;knowledgeState:KnowledgeState191;
 /** This is about the evidentiary basis, not how good the product is. */
 visibility:'retained_with_evidence'|'retained_provisional'|'retained_research_needed';
 sourceCoverage:'none_found'|'single_original_root'|'multiple_original_roots';
 rootCount:number;originalRecordIds:readonly string[];otherRecordIds:readonly string[];
 sourceUrl:readonly string[];commercialSignals:readonly string[];
 limitations:readonly string[];researchActions:readonly string[];
 thresholdFinding:ResearchFinding189['state']|'not_applicable';
 rankingPermitted:false;absenceMeansPoorPerformance:false;sourceNatureNotProofOfTruth:true;
}
export interface EvidenceLandscape191 {phase:191;schema:'191.1';state:'research_only';
 market:string;findings:readonly ProductFinding191[];
 knownCandidates:number;uncoveredCandidateIds:readonly string[];
 sourceReviewIsNotProofOfScientificValidity:true;publicRankingAllowed:false; }
const id=(x:unknown):x is string=>typeof x==='string'&&/^[a-z][a-z0-9_.:-]{0,100}$/.test(x);
const text=(x:unknown)=>typeof x==='string'&&x.length>=12&&x.length<=1000&&x.trim()===x;
const unique=(a:readonly string[])=>a.length===new Set(a).size;
const relationships:Relationship191[]=['independent_editorial','manufacturer_owned','retailer_owned','official_registry','consumer_community','unknown'];
const monies:Money191[]=['affiliate_disclosed','sponsored','advertising_disclosed','no_material_connection_reported','undisclosed_or_unknown'];
const methods:Method191[]=['original_measurement_protocol_described','observational_method_described','certificate_scope_documented','method_not_established'];
const sourceSupplies:SourceContext191['productSupply'][]=['purchased','loaned','provided_free','not_applicable','unknown'];
const distinct=(v:readonly string[])=>[...new Set(v)].sort();
const owned=(s:SourceContext191)=>s.relationship==='manufacturer_owned'||s.relationship==='retailer_owned';
const promoted=(s:SourceContext191)=>owned(s)||s.money==='sponsored';
/** Annotation validation; an analyst classification never makes itself independently true. */
export function validateSourceContext191(d:ResearchDossier189,contexts:readonly SourceContext191[]):void{
 validateDossier189(d);
 if(!Array.isArray(contexts)||contexts.length!==d.sourcePages.length||contexts.length>100||
 contexts.length!==new Set(contexts.map(x=>x?.sourceId)).size||
 contexts.some(x=>!id(x?.sourceId)||!relationships.includes(x.relationship)||!monies.includes(x.money)||
 !methods.includes(x.method)||!sourceSupplies.includes(x.productSupply)||
 !['publisher_statement_checked','unverified_annotation'].includes(x.provenanceLevel)||
 !text(x.evidenceLocator)||!text(x.independenceNote))||
 !d.sourcePages.every(s=>contexts.some(x=>x.sourceId===s.id)))throw Error('invalid191_source_context');
}
/** Query scoped candidate is always retained even if research knows nothing about it.
 * No scoring, source popularity votes, blanket affiliate penalties or inferred zeroes. */
export function inspectSparseEvidence191(args:{dossier:ResearchDossier189;
 contexts:readonly SourceContext191[];origins:readonly RecordOrigin191[];requests:readonly FieldRequest191[]}):EvidenceLandscape191{
 const {dossier:d,contexts,origins,requests}=args;validateSourceContext191(d,contexts);
 if(!Array.isArray(origins)||origins.length!==d.records.length||origins.length>500||
  origins.length!==new Set(origins.map(x=>x?.recordId)).size||
  !d.records.every(r=>origins.some(x=>x.recordId===r.id))||
  origins.some(o=>!id(o?.recordId)||!['publisher_performed_original_test','outside_lab_original_test',
   'manufacturer_provided_claim','manufacturer_commissioned_test','consumer_experience',
   'republication_or_inference','unresolved'].includes(o.origin)||
   !['manually_traced_to_original_method','source_attribution_only','not_traced'].includes(o.methodTrace)||
   !text(o.originLocator)))throw Error('invalid191_record_origins');
 if(!Array.isArray(requests)||requests.length<1||requests.length>100||
 !unique(requests.map(r=>`${r?.candidate?.variantId}:${r?.question?.field}`))||
 requests.some(r=>!id(r?.candidate?.category)||!id(r.candidate.variantId)||
 typeof r.candidate.name!=='string'||r.candidate.name.length<2||r.candidate.name.length>150||
 r.candidate.name.trim()!==r.candidate.name||typeof r.required!=='boolean'||
 r.question?.category!==r.candidate.category||r.question?.variantId!==r.candidate.variantId))
 throw Error('invalid191_requests');
 const sources=new Map(contexts.map(c=>[c.sourceId,c]));
 const originByRecord=new Map(origins.map(x=>[x.recordId,x]));
 const results:ProductFinding191[]=[];
 for(const item of requests){
  const {question:q,candidate:c}=item;
  // Existing Phase189 validates request + exact variant/field/protocol/condition.
  const baseline=assessQuestion189(d,q);
  const scoped=d.records.filter(r=>r.category===q.category&&r.variantId===q.variantId&&r.field===q.field&&
   r.protocol===q.protocol&&r.condition===q.condition&&
   (q.kind==='experiential_context'||r.unit===q.unit||r.unit===undefined));
  const direct=scoped.filter(r=>!r.derivedFrom?.length&&r.kind!=='editorial_interpretation');
  const numbers=direct.filter(r=>typeof r.value==='number');
  const eligibleMethod=numbers.filter(r=>{
   const s=sources.get(r.sourceId)!;
   return r.kind==='instrument_measurement'&&
    (s.relationship==='independent_editorial'&&s.method==='original_measurement_protocol_described'||
     s.relationship==='official_registry'&&s.method==='certificate_scope_documented')&&!promoted(s)&&
    ['publisher_performed_original_test','outside_lab_original_test'].includes(originByRecord.get(r.id)!.origin)&&
    originByRecord.get(r.id)!.methodTrace==='manually_traced_to_original_method';
  });
  const commercialNumbers=numbers.filter(r=>promoted(sources.get(r.sourceId)!)||
   ['manufacturer_provided_claim','manufacturer_commissioned_test'].includes(originByRecord.get(r.id)!.origin));
  const manufacturerStatements=direct.filter(r=>r.kind==='manufacturer_statement'||
   ['manufacturer_provided_claim','manufacturer_commissioned_test'].includes(originByRecord.get(r.id)!.origin));
  const experts=direct.filter(r=>['structured_expert_assessment','contextual_expert_observation'].includes(r.kind));
  const independentExperts=experts.filter(r=>{
   const s=sources.get(r.sourceId)!,origin=originByRecord.get(r.id)!;
   return s.relationship==='independent_editorial'&&s.method!=='method_not_established'&&!promoted(s)&&
    origin.origin==='publisher_performed_original_test'&&origin.methodTrace!=='not_traced';
  });
  const rootCounts=distinct(eligibleMethod.map(r=>r.originalGroup));
  const roots=distinct(direct.map(r=>r.originalGroup));
  // Reuse the Phase189 numeric comparator after suppressing purported lab readings
  // whose claim origin does not qualify. A retailer reprinting a manufacturer's
  // number must not create a false original-lab conflict or establish a threshold.
  const admittedForQuestion=new Set(eligibleMethod.map(r=>r.id));
  const screened:ResearchDossier189={...d,records:d.records.map(r=>
   r.kind==='instrument_measurement'&&!admittedForQuestion.has(r.id)?
    {...r,kind:'manufacturer_statement' as const}:r)};
  const screenedFinding=assessQuestion189(screened,q);
  const commercialDisagreement=eligibleMethod.length>0&&commercialNumbers.some(r=>
   !eligibleMethod.some(other=>other.value===r.value));
  const conflicts=rootCounts.length>1&&new Set(eligibleMethod.map(r=>r.value)).size>1 ||
   rootCounts.some(root=>new Set(eligibleMethod.filter(r=>r.originalGroup===root).map(r=>r.value)).size>1);
  let knowledgeState:KnowledgeState191='not_yet_documented';
  if(conflicts)knowledgeState='conflicting_measurements';
  else if(eligibleMethod.some(r=>sources.get(r.sourceId)!.relationship==='independent_editorial'))knowledgeState='reported_original_test_unadmitted';
  else if(eligibleMethod.some(r=>sources.get(r.sourceId)!.relationship==='official_registry'))knowledgeState='reported_registry_field_unadmitted';
  else if(manufacturerStatements.length||commercialNumbers.length){
   const leading=sources.get((manufacturerStatements[0]??commercialNumbers[0]).sourceId)!;
   knowledgeState=manufacturerStatements.some(r=>
    ['manufacturer_provided_claim','manufacturer_commissioned_test'].includes(originByRecord.get(r.id)!.origin))||
    leading.relationship==='manufacturer_owned'||leading.relationship==='retailer_owned'?
    'manufacturer_specification_provisional':promoted(leading)?'commercial_promotion_only':'unverified_report';
  }
  else if(independentExperts.length)knowledgeState='professional_usage_observation_only';
  else if(direct.length&&direct.every(r=>promoted(sources.get(r.sourceId)!)))knowledgeState='commercial_promotion_only';
  else if(direct.length&&direct.every(r=>r.kind==='owner_anecdote'))knowledgeState='consumer_experience_only';
  else if(direct.length)knowledgeState='unverified_report';
  const documented=knowledgeState==='reported_original_test_unadmitted'||knowledgeState==='reported_registry_field_unadmitted';
  const visibility:ProductFinding191['visibility']=documented?'retained_with_evidence':
   knowledgeState==='not_yet_documented'||knowledgeState==='conflicting_measurements'?'retained_research_needed':'retained_provisional';
  const signals:string[]=[],actions:string[]=[],limits:string[]=[];
  for(const r of scoped){const s=sources.get(r.sourceId)!;
   if(owned(s))signals.push(`${r.sourceId}: brand/retailer ownership disclosed by research annotation`);
   if(['affiliate_disclosed','sponsored','advertising_disclosed'].includes(s.money))signals.push(`${r.sourceId}: ${s.money}`);
   if(s.money==='undisclosed_or_unknown')signals.push(`${r.sourceId}: financial relationships not established`);
   if(s.productSupply==='provided_free'||s.productSupply==='loaned')signals.push(`${r.sourceId}: ${s.productSupply} product`);
   if(s.provenanceLevel==='unverified_annotation')signals.push(`${r.sourceId}: source relationship not externally verified`);
   const origin=originByRecord.get(r.id)!;
   if(['manufacturer_provided_claim','manufacturer_commissioned_test'].includes(origin.origin))
    signals.push(`${r.id}: original measurement supplied or commissioned by manufacturer, even if republished elsewhere`);
   if(origin.origin==='unresolved'||origin.methodTrace==='not_traced')
    signals.push(`${r.id}: claim origin or method not traced`);
  }
  if(!roots.length)actions.push('Find at least one relevant original source or exact-model specification; do not infer the product is poor.');
  if(!eligibleMethod.length&&q.kind!=='experiential_context')actions.push('Seek condition-matched independent measurement or a scoped certification; retain attributed specifications meanwhile.');
  if(conflicts)actions.push('Resolve original measurements and protocol/condition differences; do not select the favorable result or average.');
  if(commercialDisagreement)actions.push('Investigate disagreement between promotional numbers and the original method, without treating them as equal experiments.');
  if(direct.some(r=>sources.get(r.sourceId)!.method==='method_not_established'||
   originByRecord.get(r.id)!.methodTrace==='not_traced'))actions.push('Request method and test conditions behind reported performance claims.');
  if(direct.some(r=>originByRecord.get(r.id)!.origin==='unresolved'))
   actions.push('Trace the individual claim to its originating tester; a professional publisher may merely repeat marketing material.');
  if(direct.some(r=>sources.get(r.sourceId)!.money==='undisclosed_or_unknown'))actions.push('Verify material connections and identify who actually conducted the test.');
  if(item.required&&!documented)actions.push('Mandatory requirement remains unverified: ask one high-value clarification or continue targeted evidence research.');
  limits.push('Source type and disclosed funding are bias signals, not proof that a statement is true or false.');
  limits.push('No minimum number of sources can establish product failure; one scoped original result can be informative but incomplete.');
  limits.push('Provenance is annotated research, not authenticated publisher bytes, independent scientific review, or licensed reuse.');
  if(commercialNumbers.length||manufacturerStatements.length)limits.push('Commercial claims may support a provisional specification, never an independently measured performance result.');
  if(commercialDisagreement)limits.push('Commercial claims disagree with an original measurement: the original test remains distinct, while the contradiction needs scrutiny.');
  if(baseline.state==='observed_threshold_met'&&!documented)limits.push('Phase189 raw numeric threshold match is NOT independently substantiated by the current source context.');
  results.push({variantId:c.variantId,name:c.name,category:c.category,field:q.field,knowledgeState,visibility,
   sourceCoverage:roots.length===0?'none_found':roots.length===1?'single_original_root':'multiple_original_roots',
   rootCount:roots.length,originalRecordIds:distinct(direct.map(r=>r.id)),
   otherRecordIds:distinct(scoped.filter(r=>!direct.includes(r)).map(r=>r.id)),
   sourceUrl:distinct(scoped.map(r=>d.sourcePages.find(p=>p.id===r.sourceId)!.url)),
   commercialSignals:distinct(signals),limitations:limits,researchActions:distinct(actions),
   thresholdFinding:documented&&!conflicts?screenedFinding.state:'not_applicable',
   rankingPermitted:false,absenceMeansPoorPerformance:false,sourceNatureNotProofOfTruth:true});
 }
 return {phase:191,schema:'191.1',state:'research_only',market:d.market,
  findings:results.sort((a,b)=>a.variantId.localeCompare(b.variantId)||a.field.localeCompare(b.field)),
  knownCandidates:new Set(requests.map(r=>r.candidate.variantId)).size,
  uncoveredCandidateIds:distinct(results.filter(r=>r.sourceCoverage==='none_found').map(r=>r.variantId)),
  sourceReviewIsNotProofOfScientificValidity:true,publicRankingAllowed:false};
}
