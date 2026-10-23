/**
 * Phase 70 — category-aware structured evidence matrix (RESEARCH ONLY).
 * This is NOT a crawler, AI inference engine, rights clearance or scoring adapter.
 * Original page text, excerpts and embeddings must never enter this API.
 * Upstream: Phase 68 planned reading and Phase 69 transient analysis/quarantine.
 */
import {createHash} from 'node:crypto';
import type {EvidenceProcessingResult,WebCandidate,WebSourcePolicy} from './web_evidence_acquisition.js';

export type MatrixValueType='number'|'boolean'|'enum';
export type MatrixOrigin='independent_lab_measurement'|'independent_professional_assessment'|'manufacturer_technical_specification';
export interface MatrixFieldDefinition {
  key:string;
  type:MatrixValueType;
  /** Numbers have an explicitly controlled unit; a unit is not a rating scale. */
  unit:string|null;
  /** Enum labels describe source judgements and are never mapped to invented scores. */
  allowedValues:readonly string[];
  permittedOrigins:readonly MatrixOrigin[];
  /** Requirement for measurement method metadata; not an endorsement of method quality. */
  requiresProtocol:boolean;
  /** Mandatory contextual comparability attributes, e.g. environment and stimulus type. */
  contextKeys:readonly string[];
}
export interface CategoryFieldRegistry {
  categoryId:string;
  schemaVersion:number;
  fields:readonly MatrixFieldDefinition[];
  reviewedBy:string;
  reviewReference:string;
}
export type MatrixValue={type:'number';number:number;unit:string}|{type:'boolean';boolean:boolean}|{type:'enum';choice:string};
/** Proposed interpretation from a transient web-reading step. Contains no original prose. */
export interface ProposedStructuredFact {
  observationId:string;
  fieldKey:string;
  origin:MatrixOrigin;
  value:MatrixValue;
  context:Readonly<Record<string,string>>;
  protocolId:string|null;
  protocolVersion:string|null;
  /** The digests produced by Phase 68, never copied source/AI language. */
  valueTextSha256:string;
  anchorSha256:string;
}
export interface QuarantinedMatrixObservation {
  observationId:string;
  categoryId:string;
  schemaVersion:number;
  exactVariantId:string;
  fieldKey:string;
  origin:MatrixOrigin;
  value:MatrixValue;
  context:Record<string,string>;
  protocolId:string|null;
  protocolVersion:string|null;
  /** Null means independence/test identity cannot be asserted. */
  originalTestId:string|null;
  sourceId:string;
  sourceUrl:string;
  sourceContentSha256:string;
  valueTextSha256:string;
  anchorSha256:string;
  observedAt:string;
  reviewStatus:'quarantined_unreviewed';
  publicationReady:false;
  rankingEligible:false;
  /** One observation is not a verified, calibrated or statistically independent result. */
  inferenceNotVerified:true;
  /** Deterministic candidate fingerprint: not proof of factual accuracy. */
  candidateFingerprintSha256:string;
}
export interface MatrixRejectedFact { observationId:string; reason:string; }
export interface CategoryMatrixResult {
  purpose:'structured_facts_quarantined_research_only';
  categoryId:string;
  schemaVersion:number;
  observations:QuarantinedMatrixObservation[];
  rejected:MatrixRejectedFact[];
  rankingEligible:false;
  publicationReady:false;
  noSourceTextRetained:true;
  warnings:string[];
}
const id=(x:unknown):x is string=>typeof x==='string'&&x.length<=120&&/^[a-z][a-z0-9_]*$/.test(x);
const digest=(x:unknown):x is string=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const checkedTime=(x:unknown):x is string=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x));
const safeUrl=(s:unknown):boolean=>{
 try{const u=new URL(s as string);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!!u.hostname.includes('.')&&!/(?:^|\.)(?:localhost|internal|test|invalid|example)$/.test(u.hostname)}catch{return false;}
};
const compactText=(x:unknown)=>typeof x==='string'&&x.length>0&&x.length<=100&&x.trim()===x&& !/[<>\r\n\t]/.test(x);
const stableEntries=(o:Record<string,string>)=>Object.entries(o).sort(([a],[b])=>a.localeCompare(b));
function validateRegistry(reg:CategoryFieldRegistry):void {
 if(!reg||!id(reg.categoryId)||!Number.isInteger(reg.schemaVersion)||reg.schemaVersion<1||
   !id(reg.reviewedBy)||!compactText(reg.reviewReference)||!Array.isArray(reg.fields)||
   reg.fields.length===0||reg.fields.length>250)throw Error('Unreviewed or malformed category-field registry');
 const keys=new Set<string>();
 for(const f of reg.fields){
  if(!f||!id(f.key)||keys.has(f.key)||!['number','boolean','enum'].includes(f.type)||
    !Array.isArray(f.allowedValues)||!Array.isArray(f.permittedOrigins)||f.permittedOrigins.length===0||
    new Set(f.permittedOrigins).size!==f.permittedOrigins.length||
    f.permittedOrigins.some((v:string)=>!['independent_lab_measurement','independent_professional_assessment','manufacturer_technical_specification'].includes(v))||
    !Array.isArray(f.contextKeys)||f.contextKeys.length===0||f.contextKeys.length>12||
    f.contextKeys.some((v:string)=>!id(v))||new Set(f.contextKeys).size!==f.contextKeys.length||
    typeof f.requiresProtocol!=='boolean'||
    (f.type==='number'&&(!compactText(f.unit)||f.allowedValues.length!==0))||
    (f.type==='boolean'&&(f.unit!==null||f.allowedValues.length!==0))||
    (f.type==='enum'&&(f.unit!==null||f.allowedValues.length<2||f.allowedValues.length>40||
      f.allowedValues.some((v:string)=>!id(v))||new Set(f.allowedValues).size!==f.allowedValues.length)))
   throw Error('Malformed or duplicate controlled field definition');
  keys.add(f.key);
 }
}
function matchesValue(f:MatrixFieldDefinition,v:MatrixValue):boolean {
 if(!v||v.type!==f.type)return false;
 if(v.type==='number')return typeof v.number==='number'&&Number.isFinite(v.number)&&v.unit===f.unit;
 if(v.type==='boolean')return typeof v.boolean==='boolean';
 return f.allowedValues.includes(v.choice);
}
function validContext(context:Readonly<Record<string,string>>,keys:readonly string[]):boolean {
 return !!context && typeof context==='object'&&!Array.isArray(context)&&
  Object.keys(context).length===keys.length &&
  keys.every(k=>Object.hasOwn(context,k)&&id(context[k]));
}
const originalKind=(kind:WebCandidate['kind'],origin:MatrixOrigin):boolean=>
 origin==='manufacturer_technical_specification'?kind==='manufacturer_technical_document':
 origin==='independent_lab_measurement'?kind==='original_lab_data'||kind==='original_professional_test':
 kind==='original_editorial_assessment'||kind==='original_professional_test';
/**
 * Quarantine structured interpretations against previously anchored, hashed, authorized reading.
 * The program does not know whether the AI interpreted the source correctly; human method/identity review remains mandatory.
 */
/** Reusable *metadata* eligibility check. Attestations require independent verification. */
export function matrixSourceEligible(input:{candidate:WebCandidate;policy:WebSourcePolicy;processing:EvidenceProcessingResult;asOf:string}):boolean {
 const {candidate,policy,processing,asOf}=input;
 if(!checkedTime(asOf)||!candidate||!policy||!processing)return false;
 return processing.status==='quarantined_human_method_and_rights_review'&&
  processing.exactVariantId===candidate.exactVariantId&&processing.originalTestId===candidate.originalTestId&&
  processing.citations.includes(candidate.url)&&
  digest(processing.contentSha256)&&policy.sourceId===candidate.sourceId&&
  safeUrl(candidate.url)&&new URL(candidate.url).hostname===policy.host&&
  ['written_permission','verified_open_licence','reviewed_statutory_exception'].includes(policy.basis)&&
  policy.commercialUseReviewed===true&&policy.robots==='allowed'&&policy.websiteTerms==='reviewed_permitted'&&
  policy.permittedOperations.includes('fact_storage')&&policy.permittedOperations.includes('public_citation')&&
  !!policy.rightsDocumentId&&!!policy.rightsDocumentUrl&&!!policy.reviewedBy&&
  !!policy.validUntil&&checkedTime(policy.validUntil)&&Date.parse(policy.validUntil)>=Date.parse(asOf)&&
  checkedTime(policy.reviewedAt)&&Date.parse(policy.reviewedAt)<=Date.parse(asOf)&&
  checkedTime(policy.robotsCheckedAt)&&Date.parse(policy.robotsCheckedAt)<=Date.parse(asOf)&&
  Date.parse(asOf)-Date.parse(policy.robotsCheckedAt)<=86400000&&
  checkedTime(policy.termsCheckedAt)&&Date.parse(policy.termsCheckedAt)<=Date.parse(asOf)&&
  Date.parse(asOf)-Date.parse(policy.termsCheckedAt)<=30*86400000;
}

export function buildCategoryEvidenceMatrix(input:{
 registry:CategoryFieldRegistry;
 candidate:WebCandidate;
 policy:WebSourcePolicy;
 processing:EvidenceProcessingResult;
 asOf:string;
 proposed:readonly ProposedStructuredFact[];
}):CategoryMatrixResult {
 const {registry,candidate,policy,processing,asOf,proposed}=input;
 validateRegistry(registry);
 if(!checkedTime(asOf)||!Array.isArray(proposed)||proposed.length>50||!candidate||!policy||!processing)throw Error('Invalid matrix input');
 const result:CategoryMatrixResult={purpose:'structured_facts_quarantined_research_only',categoryId:registry.categoryId,
  schemaVersion:registry.schemaVersion,observations:[],rejected:[],rankingEligible:false,publicationReady:false,
  noSourceTextRetained:true,warnings:['No stored text is not proof of lawful access or extraction.',
  'Interpretation, variants, test independence, source terms, and commercial reuse remain subject to documented review.']};
 // The upstream reader must have already checked rights, robots and transient anchoring.
 // We additionally require operation-specific structured fact storage to be documented.
 const sourceAllowed=matrixSourceEligible({candidate,policy,processing,asOf});
 if(!sourceAllowed){
  for(const p of proposed)result.rejected.push({observationId:p?.observationId??'invalid',reason:'source_provenance_or_storage_rights_unverified'});
  return result;
 }
 const seen=new Set<string>();
 const observationSlots=new Set<string>();
 for(const p of proposed){
  let reason:string|null=null;
  if(!p||!id(p.observationId)||seen.has(p.observationId))reason='invalid_or_duplicate_observation';
  else seen.add(p.observationId);
  const f=registry.fields.find(f=>f.key===p?.fieldKey);
  if(!reason&&!f)reason='unregistered_category_field';
  if(!reason&&f&&(!f.permittedOrigins.includes(p.origin)||!originalKind(candidate.kind,p.origin)))reason='origin_kind_conflict';
  if(!reason&&f&&!matchesValue(f,p.value))reason='typed_value_or_unit_invalid';
  if(!reason&&f&&!validContext(p.context,f.contextKeys))reason='required_context_missing_or_uncontrolled';
  if(!reason&&f&&(f.requiresProtocol?(!id(p.protocolId)||!id(p.protocolVersion)):
      (p.protocolId!==null&&!id(p.protocolId))||(p.protocolVersion!==null&&!id(p.protocolVersion))))reason='method_protocol_invalid';
  if(!reason&&p.origin==='independent_lab_measurement'&&!id(candidate.originalTestId))reason='original_test_identity_missing';
  const anchored=processing.observationDigests.some(d=>d.criterionId===p?.fieldKey&&
   d.valueTextSha256===p?.valueTextSha256&&d.anchorSha256===p?.anchorSha256);
  if(!reason&&(!digest(p.valueTextSha256)||!digest(p.anchorSha256)||!anchored))reason='candidate_not_anchored_to_processed_source';
  const slot=JSON.stringify([p.fieldKey,p.origin,p.protocolId,p.protocolVersion,p.context?stableEntries(p.context):null]);
  if(!reason&&observationSlots.has(slot))reason='duplicate_same_source_test_field_and_context';
  if(reason){result.rejected.push({observationId:p?.observationId??'invalid',reason});continue;}
  observationSlots.add(slot);
  const record={observationId:p.observationId,categoryId:registry.categoryId,schemaVersion:registry.schemaVersion,
   exactVariantId:candidate.exactVariantId,fieldKey:p.fieldKey,origin:p.origin,value:p.value,
   context:Object.fromEntries(stableEntries(p.context)),protocolId:p.protocolId,protocolVersion:p.protocolVersion,
   originalTestId:candidate.originalTestId,sourceId:policy.sourceId,sourceUrl:candidate.url,
   sourceContentSha256:processing.contentSha256!,valueTextSha256:p.valueTextSha256,anchorSha256:p.anchorSha256,
   observedAt:asOf,reviewStatus:'quarantined_unreviewed' as const,publicationReady:false as const,
   rankingEligible:false as const,inferenceNotVerified:true as const};
  result.observations.push({...record,candidateFingerprintSha256:createHash('sha256').update(JSON.stringify(record)).digest('hex')});
 }
 return result;
}

/** A view for the UI/gap planner; never averages incompatible or duplicate observations. */
export function matrixCoverageByField(registry:CategoryFieldRegistry,observations:readonly QuarantinedMatrixObservation[]) {
 validateRegistry(registry);
 return registry.fields.map(f=>({fieldKey:f.key,
  quarantinedCount:observations.filter(o=>o.categoryId===registry.categoryId&&o.schemaVersion===registry.schemaVersion&&o.fieldKey===f.key).length,
  approvedCount:0 as const,readyForRanking:false as const}));
}
