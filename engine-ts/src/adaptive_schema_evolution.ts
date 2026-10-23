/**
 * Phase 71 — safe, incremental schema evolution for category evidence.
 * This module is deliberately isolated from commercial ranking and from network IO.
 * It automatically learns a RESEARCH catalog, not production truth or legal permission.
 * Original page text, excerpts, prompts, embeddings and free-form AI prose are prohibited.
 */
import {createHash} from 'node:crypto';
import {
 matrixSourceEligible, matrixCoverageByField,
 type CategoryFieldRegistry,type MatrixFieldDefinition,type ProposedStructuredFact,type MatrixOrigin,
 type QuarantinedMatrixObservation,
} from './category_evidence_matrix.js';
import type {WebCandidate,WebSourcePolicy,EvidenceProcessingResult} from './web_evidence_acquisition.js';

export type SchemaDimension='field'|'relationship';
export interface CategoryRelationDefinition {
 key:string;
 relation:'compatible_with'|'incompatible_with'|'requires'|'tested_with'|'has_accessory';
 targetKind:'product_variant'|'accessory'|'environment';
 contextKeys:readonly string[];
 permittedOrigins:readonly MatrixOrigin[];
}
export interface ProposedRelationFact {
 relationKey:string;
 targetId:string;
 origin:MatrixOrigin;
 context:Readonly<Record<string,string>>;
 valueTextSha256:string;
 anchorSha256:string;
}
export type AdaptiveDefinition=
 {kind:'field'; field:MatrixFieldDefinition}|
 {kind:'relationship'; relation:CategoryRelationDefinition};
export interface GapSignal {
 id:string;
 categoryId:string;
 proposal:AdaptiveDefinition;
 definitionSha256:string;
 exactVariantId:string;
 sourceId:string;
 originalTestId:string;
 lineageReference:string;
 sourceUrl:string;
 sourceSha256:string;
 valueTextSha256:string;
 anchorSha256:string;
 asOf:string;
 provenance:'rights_attested_quarantined_unverified';
}
export type CaptureResult=
 {status:'quarantined_gap_signal';signal:GapSignal}|
 {status:'rejected';reason:string};
const id=(s:unknown):s is string=>typeof s==='string'&&s.length>0&&s.length<=120&&/^[a-z][a-z0-9_]*$/.test(s);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const digest=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const clean=(s:unknown):s is string=>typeof s==='string'&&s.length>0&&s.length<=100&&s.trim()===s&&!/[<>\n\r\t]/.test(s);
const uniqueIds=(xs:readonly string[])=>xs.length>0&&xs.length<=12&&xs.every(id)&&new Set(xs).size===xs.length;
const origins=['independent_lab_measurement','independent_professional_assessment','manufacturer_technical_specification'] as const;
const asTime=(s:string)=>/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s));
const sameContext=(a:Readonly<Record<string,string>>,keys:readonly string[])=>
 !!a&&typeof a==='object'&&!Array.isArray(a)&&Object.keys(a).length===keys.length&&keys.every(k=>Object.hasOwn(a,k)&&id(a[k]));
const kindSupports=(k:WebCandidate['kind'],origin:MatrixOrigin)=>origin==='manufacturer_technical_specification'?
 k==='manufacturer_technical_document':origin==='independent_lab_measurement'?
 ['original_lab_data','original_professional_test'].includes(k):
 ['original_editorial_assessment','original_professional_test'].includes(k);

export function validateAdaptiveDefinition(def:AdaptiveDefinition):boolean {
 if(!def||!['field','relationship'].includes(def.kind))return false;
 if(def.kind==='field'){
  const f=def.field;
  return !!f&&id(f.key)&&['number','boolean','enum'].includes(f.type)&&
   Array.isArray(f.allowedValues)&&Array.isArray(f.contextKeys)&&uniqueIds(f.contextKeys)&&
   Array.isArray(f.permittedOrigins)&&f.permittedOrigins.length>0&&f.permittedOrigins.length<=3&&
   new Set(f.permittedOrigins).size===f.permittedOrigins.length&&f.permittedOrigins.every(x=>origins.includes(x))&&
   typeof f.requiresProtocol==='boolean'&&(
   f.type==='number'?clean(f.unit)&&f.allowedValues.length===0:
   f.type==='boolean'?f.unit===null&&f.allowedValues.length===0:
   f.unit===null&&f.allowedValues.length>=2&&f.allowedValues.length<=40&&
   f.allowedValues.every(id)&&new Set(f.allowedValues).size===f.allowedValues.length);
 }
 const r=def.relation;
 return !!r&&id(r.key)&&['compatible_with','incompatible_with','requires','tested_with','has_accessory'].includes(r.relation)&&
  ['product_variant','accessory','environment'].includes(r.targetKind)&&
  Array.isArray(r.contextKeys)&&uniqueIds(r.contextKeys)&&
  Array.isArray(r.permittedOrigins)&&r.permittedOrigins.length>0&&r.permittedOrigins.length<=3&&
  new Set(r.permittedOrigins).size===r.permittedOrigins.length&&r.permittedOrigins.every(x=>origins.includes(x));
}
/** Order-insensitive ontology arrays. Semantic changes to type, unit, protocol, context or relation are conflicts. */
export function adaptiveSignature(def:AdaptiveDefinition):string {
 if(!validateAdaptiveDefinition(def))throw Error('Unsafe or malformed adaptive definition');
 const canonical=def.kind==='field'?
  {kind:'field',key:def.field.key,type:def.field.type,unit:def.field.unit,
   allowedValues:[...def.field.allowedValues].sort(),
   permittedOrigins:[...def.field.permittedOrigins].sort(),requiresProtocol:def.field.requiresProtocol,
   contextKeys:[...def.field.contextKeys].sort()}:
  {kind:'relationship',key:def.relation.key,relation:def.relation.relation,
   targetKind:def.relation.targetKind,permittedOrigins:[...def.relation.permittedOrigins].sort(),
   contextKeys:[...def.relation.contextKeys].sort()};
 return hash(JSON.stringify(canonical));
}
const keyOf=(d:AdaptiveDefinition)=>d.kind==='field'?d.field.key:d.relation.key;
const contextOf=(d:AdaptiveDefinition)=>d.kind==='field'?d.field.contextKeys:d.relation.contextKeys;
const originsOf=(d:AdaptiveDefinition)=>d.kind==='field'?d.field.permittedOrigins:d.relation.permittedOrigins;
const sourceDigestMatch=(processing:EvidenceProcessingResult,key:string,value:string,anchor:string)=>
 processing.observationDigests.some(d=>d.criterionId===key&&d.valueTextSha256===value&&d.anchorSha256===anchor);
/** A structured gap must come from the same rights-reviewed, anchored transient research input as phase 70. */
export function captureSchemaGap(input:{
 registry:CategoryFieldRegistry; proposal:AdaptiveDefinition;
 fact:ProposedStructuredFact|ProposedRelationFact;
 candidate:WebCandidate; policy:WebSourcePolicy; processing:EvidenceProcessingResult;asOf:string;
}):CaptureResult {
 const {registry,proposal,fact,candidate,policy,processing,asOf}=input;
 const reject=(reason:string):CaptureResult=>({status:'rejected',reason});
 try{matrixCoverageByField(registry,[]);}catch{return reject('baseline_registry_invalid');}
 if(!validateAdaptiveDefinition(proposal))return reject('proposal_definition_invalid');
 const k=keyOf(proposal);
 if(registry.fields.some(f=>f.key===k))return reject('field_already_registered_or_semantic_change_requires_review');
 if(!matrixSourceEligible({candidate,policy,processing,asOf}))return reject('source_rights_or_provenance_unverified');
 if(!candidate.originalTestId||!id(candidate.originalTestId)||
    !candidate.lineageAttestationReference||!clean(candidate.lineageAttestationReference))
    return reject('original_test_lineage_unattested');
 if(!asTime(asOf)||!digest(processing.contentSha256)||!id(candidate.exactVariantId)||!id(candidate.sourceId))
    return reject('untrusted_source_identity');
 if(!fact||!digest(fact.valueTextSha256)||!digest(fact.anchorSha256)||
    !sourceDigestMatch(processing,k,fact.valueTextSha256,fact.anchorSha256))
    return reject('unanchored_observation');
 if(!sameContext(fact.context,contextOf(proposal))||!originsOf(proposal).includes(fact.origin)||
   !kindSupports(candidate.kind,fact.origin))return reject('context_or_origin_incompatible');
 if(proposal.kind==='field'){
  if(!('fieldKey' in fact)||fact.fieldKey!==k||!('value' in fact)||!fact.value||fact.value.type!==proposal.field.type)
    return reject('field_value_incompatible');
  const v=fact.value,f=proposal.field;
  if(v.type==='number'&&(!Number.isFinite(v.number)||v.unit!==f.unit)||
     v.type==='enum'&&!f.allowedValues.includes(v.choice)||
     v.type==='boolean'&&typeof v.boolean!=='boolean')return reject('type_unit_or_enum_mismatch');
  if(f.requiresProtocol?(!id(fact.protocolId)||!id(fact.protocolVersion)):
    ((fact.protocolId!==null&&!id(fact.protocolId))||(fact.protocolVersion!==null&&!id(fact.protocolVersion))))
    return reject('protocol_missing_or_invalid');
 }else{
  if(!('relationKey' in fact)||fact.relationKey!==k||!id(fact.targetId)||fact.targetId===candidate.exactVariantId)
    return reject('invalid_relationship_target');
 }
 const definitionSha256=adaptiveSignature(proposal);
 const signalBase={categoryId:registry.categoryId,proposal,definitionSha256,exactVariantId:candidate.exactVariantId,
  sourceId:candidate.sourceId,originalTestId:candidate.originalTestId,
  lineageReference:candidate.lineageAttestationReference,sourceUrl:candidate.url,
  sourceSha256:processing.contentSha256!,valueTextSha256:fact.valueTextSha256,
  anchorSha256:fact.anchorSha256,asOf,provenance:'rights_attested_quarantined_unverified' as const};
 const signal:GapSignal={...signalBase,id:'gap_'+hash(JSON.stringify({definitionSha256,
  exactVariantId:signalBase.exactVariantId,sourceId:signalBase.sourceId,
  originalTestId:signalBase.originalTestId,sourceSha256:signalBase.sourceSha256,
  anchorSha256:signalBase.anchorSha256})).slice(0,40)};
 return {status:'quarantined_gap_signal',signal};
}
export interface AdaptiveProposal {
 candidateId:string;
 key:string;
 proposal:AdaptiveDefinition;
 definitionSha256:string;
 status:'auto_research_candidate'|'needs_more_evidence'|'semantic_conflict';
 supportCount:number;
 sourceCount:number;
 originalTestCount:number;
 variantCount:number;
 supportingSignalIds:readonly string[];
 blockers:string[];
 publicationReady:false;
 rankingEligible:false;
}
export interface AutoResearchCatalog {
 purpose:'research_only_auto_adaptive_schema';
 categoryId:string;
 parentSchemaVersion:number;
 autoFields:MatrixFieldDefinition[];
 autoRelations:CategoryRelationDefinition[];
 proposals:AdaptiveProposal[];
 publicationReady:false;
 rankingEligible:false;
 requiresPromotionReview:true;
}
/** Deduplicates copies of an original test before counting support. Sources, tests and variants must differ. */
export function discoverAdaptiveSchema(registry:CategoryFieldRegistry,signals:readonly GapSignal[]):AutoResearchCatalog {
 matrixCoverageByField(registry,[]);
 if(!Array.isArray(signals)||signals.length>2000)throw Error('Signal batch invalid');
 const groups=new Map<string,GapSignal[]>(),sigsByKey=new Map<string,Set<string>>();
 const seen=new Set<string>();
 for(const s of signals){
  if(!s||s.categoryId!==registry.categoryId||!s.proposal||!validateAdaptiveDefinition(s.proposal)||
    s.definitionSha256!==adaptiveSignature(s.proposal)||!id(s.exactVariantId)||
    !id(s.sourceId)||!id(s.originalTestId)||!clean(s.lineageReference)||
    !digest(s.sourceSha256)||!digest(s.anchorSha256)||!digest(s.valueTextSha256)||
    !asTime(s.asOf)||s.provenance!=='rights_attested_quarantined_unverified'||
    !/^gap_[a-f0-9]{40}$/.test(s.id)||seen.has(s.id)||
    s.id!=='gap_'+hash(JSON.stringify({definitionSha256:s.definitionSha256,
      exactVariantId:s.exactVariantId,sourceId:s.sourceId,originalTestId:s.originalTestId,
      sourceSha256:s.sourceSha256,anchorSha256:s.anchorSha256})).slice(0,40))continue;
  seen.add(s.id);
  const key=s.proposal.kind+':'+keyOf(s.proposal),sig=s.definitionSha256;
  if(s.proposal.kind==='field'&&registry.fields.some(f=>f.key===keyOf(s.proposal)))continue;
  const gkey=key+':'+sig;
  groups.set(gkey,[...(groups.get(gkey)??[]),s]);
  sigsByKey.set(key,(sigsByKey.get(key)??new Set()).add(sig));
 }
 const proposals:AdaptiveProposal[]=[];
 for(const [_,samples] of groups){
  const first=samples[0],key=keyOf(first.proposal),groupId=first.proposal.kind+':'+key;
  // Test identity is the de-duplication unit, across reprints, updates and mirrors.
  const tests=new Set(samples.map(s=>s.originalTestId)),sources=new Set(samples.map(s=>s.sourceId)),
    variants=new Set(samples.map(s=>s.exactVariantId));
  const conflict=(sigsByKey.get(groupId)?.size??0)>1;
  const blockers:string[]=[];
  if(conflict)blockers.push('incompatible_semantic_definitions');
  if(tests.size<2)blockers.push('insufficient_distinct_original_tests');
  if(sources.size<2)blockers.push('insufficient_distinct_sources');
  if(variants.size<2)blockers.push('insufficient_distinct_product_variants');
  const status=conflict?'semantic_conflict':blockers.length?'needs_more_evidence':'auto_research_candidate';
  proposals.push({candidateId:'candidate_'+first.definitionSha256.slice(0,40),key,
   proposal:first.proposal,definitionSha256:first.definitionSha256,status,
   supportCount:samples.length,originalTestCount:tests.size,sourceCount:sources.size,
   variantCount:variants.size,supportingSignalIds:samples.map(s=>s.id).sort(),blockers,
   publicationReady:false,rankingEligible:false});
 }
 proposals.sort((a,b)=>a.key.localeCompare(b.key)||a.definitionSha256.localeCompare(b.definitionSha256));
 return {purpose:'research_only_auto_adaptive_schema',categoryId:registry.categoryId,
  parentSchemaVersion:registry.schemaVersion,autoFields:proposals.filter(p=>p.status==='auto_research_candidate'&&p.proposal.kind==='field')
   .map(p=>(p.proposal as {kind:'field';field:MatrixFieldDefinition}).field),
  autoRelations:proposals.filter(p=>p.status==='auto_research_candidate'&&p.proposal.kind==='relationship')
   .map(p=>(p.proposal as {kind:'relationship';relation:CategoryRelationDefinition}).relation),
  proposals,publicationReady:false,rankingEligible:false,requiresPromotionReview:true};
}
export interface PromotionReview {candidateId:string;definitionSha256:string;decision:'approve';reviewer:string;reviewReference:string;}
/** Review creates a NEW immutable version; old observations stay on their original version. */
export function promoteReviewedFields(registry:CategoryFieldRegistry,catalog:AutoResearchCatalog,reviews:readonly PromotionReview[]):CategoryFieldRegistry {
 matrixCoverageByField(registry,[]);
 if(catalog.categoryId!==registry.categoryId||catalog.parentSchemaVersion!==registry.schemaVersion||
    catalog.purpose!=='research_only_auto_adaptive_schema'||!Array.isArray(reviews)||reviews.length===0||reviews.length>50)
    throw Error('Stale or invalid promotion batch');
 const additions:MatrixFieldDefinition[]=[];
 const seen=new Set<string>();
 for(const rev of reviews){
  if(!id(rev.reviewer)||!clean(rev.reviewReference)||rev.decision!=='approve'||seen.has(rev.candidateId))
   throw Error('Missing independent review attestation');
  seen.add(rev.candidateId);
  const match=catalog.proposals.find(p=>p.candidateId===rev.candidateId&&p.definitionSha256===rev.definitionSha256&&p.status==='auto_research_candidate');
  if(!match||match.proposal.kind!=='field'||!catalog.autoFields.some(f=>f.key===match.key&&adaptiveSignature({kind:'field',field:f})===match.definitionSha256))
   throw Error('Cannot promote unqualified, conflicting or relationship proposal');
  if(registry.fields.some(f=>f.key===match.key)||additions.some(f=>f.key===match.key))throw Error('Field collision');
  additions.push(match.proposal.field);
 }
 if(registry.fields.length+additions.length>250)throw Error('Field cap exceeded');
 const reviewers=[...new Set(reviews.map(r=>r.reviewer))].sort().join('_');
 const refs=reviews.map(r=>r.reviewReference).sort().join('|');
 if(refs.length>100)throw Error('Review reference too long');
 const result:CategoryFieldRegistry={categoryId:registry.categoryId,schemaVersion:registry.schemaVersion+1,
  reviewedBy:reviewers,reviewReference:refs,fields:[...registry.fields,...additions]};
 matrixCoverageByField(result,[]);
 return result;
}
/** Targeted re-research for newly registered fields, without replaying the entire web. */
export function planAdaptiveBackfill(registry:CategoryFieldRegistry,
 variants:readonly string[],observations:readonly QuarantinedMatrixObservation[],
 newlyRegisteredKeys:readonly string[]){
 matrixCoverageByField(registry,[]);
 if(variants.length>500||newlyRegisteredKeys.length>100||!variants.every(id)||
  !newlyRegisteredKeys.every(k=>registry.fields.some(f=>f.key===k)))throw Error('Invalid backfill request');
 return [...new Set(variants)].sort().flatMap(variant=>[...new Set(newlyRegisteredKeys)].sort().flatMap(key=>{
  const exists=observations.some(o=>o.categoryId===registry.categoryId&&o.exactVariantId===variant&&
   o.fieldKey===key&&o.schemaVersion===registry.schemaVersion);
  return exists?[]:[{categoryId:registry.categoryId,variantId:variant,fieldKey:key,
   action:'search_authorized_source_for_missing_field' as const,automaticFetchAuthorized:false as const}];
 }));
}
/** Read old observations against a new registry only where the field meaning is identical.
 * Values are NOT rewritten, approved, pooled, or converted. Missing historical schema => exclusion.
 */
export function readSchemaCompatibleObservations(input:{
 active:CategoryFieldRegistry;
 historicalRegistries:readonly CategoryFieldRegistry[];
 observations:readonly QuarantinedMatrixObservation[];
}){
 const {active,historicalRegistries,observations}=input;
 matrixCoverageByField(active,[]);
 if(historicalRegistries.length>100||observations.length>100000)throw Error('Unbounded versioned read');
 const byVersion=new Map<number,CategoryFieldRegistry>();
 for(const r of [active,...historicalRegistries]){
  matrixCoverageByField(r,[]);
  if(r.categoryId!==active.categoryId)throw Error('Cross-category version mismatch');
  if(byVersion.has(r.schemaVersion)&&JSON.stringify(byVersion.get(r.schemaVersion))!==JSON.stringify(r))
   throw Error('Conflicting definitions for one immutable version');
  byVersion.set(r.schemaVersion,r);
 }
 const out:QuarantinedMatrixObservation[]=[];
 for(const o of observations){
  if(o.categoryId!==active.categoryId||o.rankingEligible!==false||o.publicationReady!==false)continue;
  const hist=byVersion.get(o.schemaVersion);
  const oldField=hist?.fields.find(f=>f.key===o.fieldKey);
  const newField=active.fields.find(f=>f.key===o.fieldKey);
  if(!oldField||!newField)continue;
  if(adaptiveSignature({kind:'field',field:oldField})!==adaptiveSignature({kind:'field',field:newField}))continue;
  out.push(o);
 }
 return {purpose:'compatible_historical_quarantine_view' as const,
  observations:out,rankingEligible:false as const,publicationReady:false as const,
  warnings:['Source rights and human methodological review remain required.',
   'Historical observations retain their original schema versions and quarantine status.']};
}

/** A relation is a directed, typed, contextual graph edge; it is not a scalar rating. */
export interface QuarantinedKnowledgeRelation {
 id:string;
 categoryId:string;
 schemaVersion:number;
 relationKey:string;
 relation:'compatible_with'|'incompatible_with'|'requires'|'tested_with'|'has_accessory';
 subjectVariantId:string;
 objectId:string;
 objectKind:'product_variant'|'accessory'|'environment';
 context:Record<string,string>;
 origin:MatrixOrigin;
 sourceId:string;
 sourceUrl:string;
 originalTestId:string;
 sourceSha256:string;
 valueTextSha256:string;
 anchorSha256:string;
 reviewed:'quarantined_unverified';
 publicationReady:false;
 rankingEligible:false;
}
/** Auto-registered relationships can be stored only in a quarantined graph. */
export function quarantineAutoRelation(input:{registry:CategoryFieldRegistry;
 catalog:AutoResearchCatalog;proposal:AdaptiveDefinition;fact:ProposedRelationFact;
 candidate:WebCandidate;policy:WebSourcePolicy;processing:EvidenceProcessingResult;asOf:string;
}):QuarantinedKnowledgeRelation|null {
 const {registry,catalog,proposal,fact,candidate,policy,processing,asOf}=input;
 if(proposal.kind!=='relationship'||catalog.categoryId!==registry.categoryId||
  catalog.parentSchemaVersion!==registry.schemaVersion||
  !catalog.proposals.some(p=>p.status==='auto_research_candidate'&&p.definitionSha256===adaptiveSignature(proposal)))return null;
 const capture=captureSchemaGap({registry,proposal,fact,candidate,policy,processing,asOf});
 if(capture.status!=='quarantined_gap_signal')return null;
 const d=proposal.relation;
 const record={categoryId:registry.categoryId,schemaVersion:registry.schemaVersion,relationKey:d.key,
  relation:d.relation,subjectVariantId:candidate.exactVariantId,objectId:fact.targetId,objectKind:d.targetKind,
  context:Object.fromEntries(Object.entries(fact.context).sort(([a],[b])=>a.localeCompare(b))),
  origin:fact.origin,sourceId:candidate.sourceId,sourceUrl:candidate.url,originalTestId:candidate.originalTestId!,
  sourceSha256:processing.contentSha256!,valueTextSha256:fact.valueTextSha256,
  anchorSha256:fact.anchorSha256,reviewed:'quarantined_unverified' as const,
  publicationReady:false as const,rankingEligible:false as const};
 return {...record,id:'edge_'+hash(JSON.stringify(record)).slice(0,40)};
}
/** A demand event contains only hashed question identity and controlled concepts, never user text or IDs. */
export interface AnonymizedSchemaNeed {
 categoryId:string;
 proposedFieldKey:string;
 questionDigestSha256:string;
 scenarioId:string;
 observedAt:string;
}
/** Missing dimensions can be prioritised by demand, but demand NEVER becomes proof of a product fact. */
export function prioritizeSchemaResearch(catalog:AutoResearchCatalog,needs:readonly AnonymizedSchemaNeed[]){
 if(!Array.isArray(needs)||needs.length>50000)throw Error('Unbounded needs input');
 const valid=needs.filter(n=>n&&n.categoryId===catalog.categoryId&&id(n.proposedFieldKey)&&
   digest(n.questionDigestSha256)&&id(n.scenarioId)&&asTime(n.observedAt));
 return catalog.proposals.map(p=>{
  const requests=valid.filter(n=>n.proposedFieldKey===p.key);
  const distinctQuestions=new Set(requests.map(n=>n.questionDigestSha256)).size;
  const scenarios=new Set(requests.map(n=>n.scenarioId)).size;
  return {candidateId:p.candidateId,fieldKey:p.key,proposalStatus:p.status,
   distinctQuestionCount:distinctQuestions,distinctScenarioCount:scenarios,
   priority:'research_only' as const,
   /** These are integer request counts, NEVER product quality / confidence scores. */
   evidenceProofFromDemand:false as const};
 }).sort((a,b)=>b.distinctQuestionCount-a.distinctQuestionCount||a.fieldKey.localeCompare(b.fieldKey));
}
