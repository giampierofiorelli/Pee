/**
 * Phase 73 — research-only category cognition / cold-start orchestration.
 * Specialized capabilities share an immutable, versioned evidence store; they are
 * NOT independently sentient LLMs. No web access, model calls, publication,
 * automatic legal authorization, or database writes are performed here.
 */
import {createHash} from 'node:crypto';
import {adaptiveSignature,validateAdaptiveDefinition} from './adaptive_schema_evolution.js';
import {matrixSourceEligible,type CategoryFieldRegistry,type MatrixFieldDefinition,type ProposedStructuredFact} from './category_evidence_matrix.js';
import type {WebCandidate,WebSourcePolicy,EvidenceProcessingResult} from './web_evidence_acquisition.js';

const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const id=(v:unknown):v is string=>typeof v==='string'&&v.length<=120&&/^[a-z][a-z0-9_]*$/.test(v);
const short=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=120&&v.trim()===v&&!/[<>\r\n\t]/.test(v);
const stamp=(v:string)=>/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const normalize=(value:string)=>value.trim().toLowerCase().replace(/\s+/g,' ');
const slug=(value:string)=>normalize(value).replace(/[^a-z0-9 ]/g,'').replace(/ +/g,'_').slice(0,120);

export interface CategoryIdentity {
  categoryId:string;
  label:string;
  aliases:readonly string[];
  status:'reviewed'|'research';
  /** Reviewed does not imply calibrated evidence or permission to publish recommendations. */
  registryVersion:number|null;
}
export type CategoryRoute=
  | {status:'known';identity:CategoryIdentity}
  | {status:'ambiguous';candidateCategoryIds:string[];reason:'alias_collision'}
  | {status:'unknown';provisionalId:string;label:string;requiresCategoryValidation:true}
  | {status:'needs_clarification';reason:'category_missing_or_unsafe'};
/** A constrained label match, not an LLM assertion that one category resembles another. */
export function routeCategory(label:string,catalog:readonly CategoryIdentity[]):CategoryRoute {
  if(typeof label!=='string'||!Array.isArray(catalog)||catalog.length>1000)throw Error('Invalid category route input');
  const normalized=normalize(label);
  if(!short(label.trim())||normalized.length>90||/[<>]/.test(label)||!slug(label)||!/^[a-z]/.test(slug(label)))
    return {status:'needs_clarification',reason:'category_missing_or_unsafe'};
  const matches:CategoryIdentity[]=[];
  const used=new Set<string>();
  for(const category of catalog){
    if(!id(category.categoryId)||used.has(category.categoryId)||!short(category.label)||
      !Array.isArray(category.aliases)||category.aliases.length>30||
      category.aliases.some((a:string)=>!short(a))||!['reviewed','research'].includes(category.status)||
      (category.status==='reviewed'&&category.registryVersion===null)||
      (category.registryVersion!==null&&(!Number.isInteger(category.registryVersion)||category.registryVersion<1)))
      throw Error('Malformed category catalog');
    used.add(category.categoryId);
    if([category.label,...category.aliases].some(a=>normalize(a)===normalized))matches.push(category);
  }
  if(matches.length>1)return {status:'ambiguous',candidateCategoryIds:matches.map(m=>m.categoryId).sort(),reason:'alias_collision'};
  if(matches.length===1)return {status:'known',identity:matches[0]};
  return {status:'unknown',provisionalId:`provisional_${slug(label)}`,label:normalized,requiresCategoryValidation:true};
}

export type Capability=
 'category_identity'|'use_case_research'|'failure_and_safety_research'|'variant_taxonomy'|
 'source_landscape'|'source_rights_review'|'test_method_research'|'criterion_design'|
 'source_acquisition'|'evidence_independence_audit'|'category_schema_review'|
 'coverage_analysis'|'targeted_backfill'|'freshness_review'|'category_change_watch';
export interface CognitiveTask {
  id:string;
  capability:Capability;
  categoryId:string;
  dependsOn:readonly string[];
  status:'ready_for_research'|'awaiting_dependencies'|'blocked_ambiguous_category';
  /** A ready task only permits the planned analysis; it is never authorization to crawl. */
  automaticWebAccessAuthorized:false;
  publicationReady:false;
  rankingEligible:false;
  purpose:'category_research';
}
const coldTasks:{key:Capability;deps:Capability[]}[]=[
 {key:'category_identity',deps:[]},
 {key:'use_case_research',deps:['category_identity']},
 {key:'failure_and_safety_research',deps:['category_identity']},
 {key:'variant_taxonomy',deps:['category_identity']},
 {key:'source_landscape',deps:['category_identity']},
 {key:'source_rights_review',deps:['source_landscape']},
 {key:'test_method_research',deps:['source_landscape','failure_and_safety_research']},
 {key:'criterion_design',deps:['use_case_research','test_method_research','variant_taxonomy']},
 {key:'source_acquisition',deps:['criterion_design','source_rights_review']},
 {key:'evidence_independence_audit',deps:['source_acquisition']},
 {key:'category_schema_review',deps:['criterion_design','evidence_independence_audit']}
];
const knownTasks:{key:Capability;deps:Capability[]}[]=[
 {key:'coverage_analysis',deps:[]},
 {key:'freshness_review',deps:[]},
 {key:'targeted_backfill',deps:['coverage_analysis']},
 {key:'category_change_watch',deps:['freshness_review']}
];
export interface CapabilityCompletionReceipt {
  categoryId:string;
  capability:Capability;
  verifiedBy:string;
  auditReference:string;
  verifiedAt:string;
}
/** These are audit references, NOT cryptographic proof. A trusted execution layer must authenticate reviewers. */
function completedFromReceipts(categoryId:string, spec:readonly {key:Capability;deps:Capability[]}[],
 receipts:readonly CapabilityCompletionReceipt[],asOf:string):Capability[]{
 if(!stamp(asOf)||!Array.isArray(receipts)||receipts.length>20)throw Error('Invalid audit snapshot');
 const seen=new Set<Capability>();
 for(const r of receipts){
   if(!r||r.categoryId!==categoryId||!spec.some(t=>t.key===r.capability)||
     !id(r.verifiedBy)||!short(r.auditReference)||!stamp(r.verifiedAt)||
     Date.parse(r.verifiedAt)>Date.parse(asOf)||seen.has(r.capability))
     throw Error('Unverifiable, stale-scope or duplicate completion receipt');
   seen.add(r.capability);
 }
 for(const task of spec){
   if(seen.has(task.key)&&!task.deps.every(d=>seen.has(d)))
     throw Error('Completion receipt has unmet prior tasks');
 }
 return [...seen];
}
export interface CategoryTaskPlan {
  purpose:'research_only_cognitive_capability_plan';
  route:CategoryRoute;
  tasks:CognitiveTask[];
  unknownCategoryNeverAutoRanked:true;
  noUnreviewedCategorySchemaWrites:true;
  actualWorkExecuted:false;
}
/** A completed capability is only recorded after an external verified executor finishes it. */
export function planCategoryCapabilities(input:{
 label:string;catalog:readonly CategoryIdentity[];asOf:string;
 completionReceipts?:readonly CapabilityCompletionReceipt[];
}):CategoryTaskPlan {
  const route=routeCategory(input.label,input.catalog);
  const result:CategoryTaskPlan={purpose:'research_only_cognitive_capability_plan',route,tasks:[],
   unknownCategoryNeverAutoRanked:true,noUnreviewedCategorySchemaWrites:true,actualWorkExecuted:false};
  if(route.status==='needs_clarification'||route.status==='ambiguous')return result;
  const categoryId=route.status==='known'?route.identity.categoryId:route.provisionalId;
  const spec=route.status==='known'&&route.identity.status==='reviewed'?knownTasks:coldTasks;
  const completed=completedFromReceipts(categoryId,spec,input.completionReceipts??[],input.asOf);
  result.tasks=spec.filter(t=>!completed.includes(t.key)).map(t=>({
    id:`${categoryId}_${t.key}`,categoryId,capability:t.key,
    dependsOn:t.deps.map(d=>`${categoryId}_${d}`),
    status:t.deps.every(d=>completed.includes(d))?'ready_for_research':'awaiting_dependencies',
    automaticWebAccessAuthorized:false,publicationReady:false,rankingEligible:false,
    purpose:'category_research' as const
  }));
  return result;
}

/** A research dossier can be built *before* a lab test exists. No field is activated. */
export type CategoryResearchAxis=
 'user_outcomes'|'failure_modes'|'variant_boundaries'|'measurement_methods'|
 'compatibility'|'source_landscape'|'decision_tradeoffs'|'safety_constraints';
export interface InitialCategoryQuestion {
  key:string;
  axis:CategoryResearchAxis;
  contextTags:readonly string[];
  reasonReferenceId:string;
  /** Optional *hypothesis* for how an answer might be stored, never evidence. */
  suggestedField?:MatrixFieldDefinition;
}
export interface CategoryInvestigationDossier {
 categoryId:string;
 status:'hypotheses_not_evidence';
 baselineAxes:CategoryResearchAxis[];
 questions:{key:string;axis:CategoryResearchAxis;contextTags:readonly string[];
   reasonReferenceId:string;fieldSignature:string|null;status:'unverified_question'|'conflicting_hypotheses'}[];
 candidateFieldKeys:string[];
 rankingEligible:false;publicationReady:false;
 automaticallyChangesCategorySchema:false;
}
const BASELINE_AXES:CategoryResearchAxis[]=['user_outcomes','failure_modes','variant_boundaries',
 'measurement_methods','compatibility','source_landscape','decision_tradeoffs','safety_constraints'];
/** A provisional question catalog, seeded by user needs / reviewed operator hypotheses. */
export function createCategoryInvestigationDossier(input:{
 categoryId:string;questions:readonly InitialCategoryQuestion[];
}):CategoryInvestigationDossier {
 if(!id(input.categoryId)||!Array.isArray(input.questions)||input.questions.length>200)
  throw Error('Invalid investigation scope');
 const seen=new Set<string>(),byKey=new Map<string,Set<string>>();
 const questions:CategoryInvestigationDossier['questions']=[];
 for(const q of input.questions){
  if(!q||!id(q.key)||!BASELINE_AXES.includes(q.axis)||!id(q.reasonReferenceId)||
     !Array.isArray(q.contextTags)||q.contextTags.length>12||
     q.contextTags.some((t:string)=>!id(t))||new Set(q.contextTags).size!==q.contextTags.length||
     (q.suggestedField&&!validateAdaptiveDefinition({kind:'field',field:q.suggestedField})))
    throw Error('Invalid research question');
  const signature=q.suggestedField?adaptiveSignature({kind:'field',field:q.suggestedField}):null;
  if(q.suggestedField&&q.suggestedField.key!==q.key)
    throw Error('Hypothetical field must match question key');
  const dedup=hash(JSON.stringify([q.key,q.axis,[...q.contextTags].sort(),signature,q.reasonReferenceId]));
  if(seen.has(dedup))continue;
  seen.add(dedup);
  byKey.set(q.key,(byKey.get(q.key)??new Set()).add(signature??'no_field'));
  questions.push({key:q.key,axis:q.axis,contextTags:[...q.contextTags].sort(),
    reasonReferenceId:q.reasonReferenceId,fieldSignature:signature,status:'unverified_question'});
 }
 for(const q of questions)if((byKey.get(q.key)?.size??0)>1)q.status='conflicting_hypotheses';
 questions.sort((a,b)=>a.axis.localeCompare(b.axis)||a.key.localeCompare(b.key));
 return {categoryId:input.categoryId,status:'hypotheses_not_evidence',
   baselineAxes:[...BASELINE_AXES],questions,
   candidateFieldKeys:[...new Set(questions.filter(q=>q.fieldSignature).map(q=>q.key))].sort(),
   rankingEligible:false,publicationReady:false,automaticallyChangesCategorySchema:false};
}

/** An observation obtained from a source already processed by the Phase 69/72 rights-gated reader. */
export interface CategoryCriterionSignal {
  categoryId:string;
  proposedField:MatrixFieldDefinition;
  proposedFact:ProposedStructuredFact;
  candidate:WebCandidate;
  policy:WebSourcePolicy;
  processing:EvidenceProcessingResult;
  asOf:string;
}
export interface CategoryCriterionCandidate {
  key:string;definitionSha256:string;definition:MatrixFieldDefinition;
  status:'needs_more_evidence'|'research_schema_candidate'|'semantic_conflict';
  sourceCount:number;originalTestCount:number;variantCount:number;
  blockers:string[];signalFingerprints:string[];
  rankingEligible:false;publicationReady:false;
}
export interface CategoryBlueprint {
  categoryId:string;status:'provisional_research_blueprint';
  candidates:CategoryCriterionCandidate[];rejected:{index:number;reason:string}[];
  readyFields:MatrixFieldDefinition[];
  productionSchemaExists:false;publicationReady:false;rankingEligible:false;
}
/** Candidate extraction cannot bypass the existing rights, anchoring and variant gates. */
function verifyCategorySignal(s:CategoryCriterionSignal,categoryId:string):string|null {
  if(!s||s.categoryId!==categoryId||!id(categoryId)||!s.proposedField||
    !validateAdaptiveDefinition({kind:'field',field:s.proposedField}))return 'invalid_category_or_field';
  if(!matrixSourceEligible({candidate:s.candidate,policy:s.policy,processing:s.processing,asOf:s.asOf}))
    return 'source_rights_or_provenance_not_verified';
  const c=s.candidate,f=s.proposedFact,field=s.proposedField;
  if(!id(c.originalTestId)||!short(c.lineageAttestationReference)||!f||f.fieldKey!==field.key||
    !field.permittedOrigins.includes(f.origin)||!f.context||
    Object.keys(f.context).length!==field.contextKeys.length||
    !field.contextKeys.every(k=>id(f.context[k]))||!stamp(s.asOf))return 'lineage_or_fact_metadata_incomplete';
  if(!s.processing.observationDigests.some(d=>d.criterionId===f.fieldKey&&
    d.valueTextSha256===f.valueTextSha256&&d.anchorSha256===f.anchorSha256))
    return 'fact_not_anchored_to_approved_source';
  if(f.value.type!==field.type||
    (f.value.type==='number'&&(!Number.isFinite(f.value.number)||f.value.unit!==field.unit))||
    (f.value.type==='enum'&&!field.allowedValues.includes(f.value.choice))||
    (f.value.type==='boolean'&&typeof f.value.boolean!=='boolean')||
    (field.requiresProtocol&&(!id(f.protocolId)||!id(f.protocolVersion))))
    return 'incompatible_value_or_method';
  if(f.origin==='manufacturer_technical_specification'&&c.kind!=='manufacturer_technical_document'||
     f.origin==='independent_lab_measurement'&&!['original_lab_data','original_professional_test'].includes(c.kind)||
     f.origin==='independent_professional_assessment'&&!['original_editorial_assessment','original_professional_test'].includes(c.kind))
    return 'publication_does_not_support_origin';
  return null;
}
export function formCategoryBlueprint(input:{categoryId:string;signals:readonly CategoryCriterionSignal[];
 existing?:CategoryFieldRegistry}):CategoryBlueprint {
  const {categoryId,signals}=input;
  if(!id(categoryId)||!Array.isArray(signals)||signals.length>2000||input.existing)
    throw Error('Blueprint only for bounded, previously unknown categories');
  const groups=new Map<string,CategoryCriterionSignal[]>(),byKey=new Map<string,Set<string>>();
  const rejected:{index:number;reason:string}[]=[];
  const seen=new Set<string>();
  signals.forEach((s,index)=>{
    const error=verifyCategorySignal(s,categoryId);
    if(error){rejected.push({index,reason:error});return;}
    const signature=adaptiveSignature({kind:'field',field:s.proposedField});
    const unique=hash(JSON.stringify([signature,s.candidate.sourceId,s.candidate.originalTestId,
      s.candidate.exactVariantId,s.proposedFact.anchorSha256,s.processing.contentSha256]));
    if(seen.has(unique)){rejected.push({index,reason:'duplicated_observation'});return;}
    seen.add(unique);
    const group=`${s.proposedField.key}:${signature}`;
    groups.set(group,[...(groups.get(group)??[]),s]);
    byKey.set(s.proposedField.key,(byKey.get(s.proposedField.key)??new Set()).add(signature));
  });
  const candidates:CategoryCriterionCandidate[]=[];
  for(const ss of groups.values()){
    const first=ss[0],key=first.proposedField.key;
    const sig=adaptiveSignature({kind:'field',field:first.proposedField});
    const sources=new Set(ss.map(s=>s.candidate.sourceId)),tests=new Set(ss.map(s=>s.candidate.originalTestId)),
      variants=new Set(ss.map(s=>s.candidate.exactVariantId));
    const blockers:string[]=[];
    if((byKey.get(key)?.size??0)>1)blockers.push('conflicting_definitions');
    if(tests.size<2)blockers.push('requires_more_original_tests');
    if(sources.size<2)blockers.push('requires_more_independent_sources');
    if(variants.size<2)blockers.push('requires_more_product_variants');
    const status=blockers.includes('conflicting_definitions')?'semantic_conflict':blockers.length?'needs_more_evidence':'research_schema_candidate';
    candidates.push({key,definitionSha256:sig,definition:first.proposedField,status,
      sourceCount:sources.size,originalTestCount:tests.size,variantCount:variants.size,
      blockers,signalFingerprints:ss.map(s=>hash(JSON.stringify([s.processing.contentSha256,
       s.proposedFact.anchorSha256,s.candidate.originalTestId]))).sort(),rankingEligible:false,publicationReady:false});
  }
  candidates.sort((a,b)=>a.key.localeCompare(b.key)||a.definitionSha256.localeCompare(b.definitionSha256));
  return {categoryId,status:'provisional_research_blueprint',candidates,rejected,
   readyFields:candidates.filter(c=>c.status==='research_schema_candidate').map(c=>c.definition),
   productionSchemaExists:false,publicationReady:false,rankingEligible:false};
}
/** Human attestation creates a category registry, NOT permission to rank or publish its observations. */
export function reviewInitialCategorySchema(input:{
 blueprint:CategoryBlueprint;acceptedFingerprints:readonly string[];
 approvedCategoryId:string;reviewer:string;reviewReference:string;
 categoryResearchReceipts:readonly CapabilityCompletionReceipt[];asOf:string;
 knownCategories:readonly CategoryIdentity[];
}):{registry:CategoryFieldRegistry;categoryIdentity:CategoryIdentity;publicationReady:false;rankingEligible:false} {
  const {blueprint:b,acceptedFingerprints:acceptedFingerprints,reviewer,reviewReference,knownCategories}=input;
  const required:Capability[]=['category_identity','use_case_research','failure_and_safety_research',
    'variant_taxonomy','source_landscape','source_rights_review','test_method_research',
    'criterion_design','source_acquisition','evidence_independence_audit','category_schema_review'];
  const completed=completedFromReceipts(b.categoryId,coldTasks,input.categoryResearchReceipts,input.asOf);
  if(!required.every(k=>completed.includes(k)))throw Error('Initial category research not completed and reviewed');
  if(b.status!=='provisional_research_blueprint'||!id(b.categoryId)||!id(reviewer)||!short(reviewReference)||
    !Array.isArray(acceptedFingerprints)||acceptedFingerprints.length<1||acceptedFingerprints.length>100||
    new Set(acceptedFingerprints).size!==acceptedFingerprints.length||
    !id(input.approvedCategoryId)||input.approvedCategoryId.startsWith('provisional_')||
    knownCategories.some(c=>c.categoryId===input.approvedCategoryId)||b.productionSchemaExists!==false)
    throw Error('Invalid, duplicate or already registered category approval');
  const selected=acceptedFingerprints.map(sig=>b.candidates.find(c=>c.definitionSha256===sig&&
    c.status==='research_schema_candidate'&&b.readyFields.some(f=>adaptiveSignature({kind:'field',field:f})===sig)));
  if(selected.some(x=>!x))throw Error('Unsupported category fields cannot be promoted');
  const fields=selected.map(x=>x!.definition);
  if(new Set(fields.map(f=>f.key)).size!==fields.length)throw Error('Ambiguous field definition');
  const registry:CategoryFieldRegistry={categoryId:input.approvedCategoryId,schemaVersion:1,
    reviewedBy:reviewer,reviewReference,fields};
  const identity:CategoryIdentity={categoryId:input.approvedCategoryId,label:input.approvedCategoryId.replace(/_/g,' '),aliases:[],
    status:'reviewed',registryVersion:1};
  return {registry,categoryIdentity:identity,publicationReady:false,rankingEligible:false};
}

export interface PreventiveResearchCandidate {
 categoryId:string;
 criterion:'category_change'|'staleness'|'missing_coverage'|'methods_changed';
 observedGap:true;observedAt:string;referenceId:string;
}
/** Proactive research is justified by an explicit gap; it never triggers crawling by itself. */
export function planPreventiveCategoryWork(input:{catalog:readonly CategoryIdentity[];
 gaps:readonly PreventiveResearchCandidate[];asOf:string;maxTasks:number}):CognitiveTask[] {
  if(!stamp(input.asOf)||!Number.isInteger(input.maxTasks)||input.maxTasks<0||input.maxTasks>100||
    input.gaps.length>1000)throw Error('Invalid preventive planning budget');
  const known=new Set(input.catalog.filter(c=>c.status==='reviewed').map(c=>c.categoryId));
  const kindMap:Record<PreventiveResearchCandidate['criterion'],Capability>={
    category_change:'category_change_watch',staleness:'freshness_review',
    missing_coverage:'coverage_analysis',methods_changed:'test_method_research'};
  const dedup=new Set<string>();const result:CognitiveTask[]=[];
  for(const g of [...input.gaps].sort((a,b)=>a.categoryId.localeCompare(b.categoryId)||
      a.criterion.localeCompare(b.criterion)||a.referenceId.localeCompare(b.referenceId))){
    if(!g.observedGap||!known.has(g.categoryId)||!id(g.referenceId)||!stamp(g.observedAt)||
      Date.parse(g.observedAt)>Date.parse(input.asOf)||!(g.criterion in kindMap))continue;
    const key=`${g.categoryId}_${kindMap[g.criterion]}`;
    if(dedup.has(key)||result.length>=input.maxTasks)continue;
    dedup.add(key);result.push({id:key,categoryId:g.categoryId,capability:kindMap[g.criterion],
      dependsOn:[],status:'ready_for_research',automaticWebAccessAuthorized:false,
      publicationReady:false,rankingEligible:false,purpose:'category_research'});
  }
  return result;
}
