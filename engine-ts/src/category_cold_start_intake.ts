/**
 * Phase 74 — unknown-category source intake, only after explicitly reviewed
 * source policies and with local, ephemeral extraction. Unlike the Phase 72
 * known-category path this does not require an already accepted registry.
 * No source body or excerpt is persisted or returned, and nothing is promoted.
 */
import {createHash} from 'node:crypto';
import {planWebEvidenceAcquisition,type WebCandidate,type WebSourcePolicy,
 type KnownWebEvidence,type EvidenceProcessingResult} from './web_evidence_acquisition.js';
import {readApprovedSource,type SourceTransport,type TransientWebClaim} from './approved_web_reader.js';
import {validateTransientSuggestionBinding,type LocalSemanticAdapter} from './phase72_semantic_intake.js';
import {validateAdaptiveDefinition,adaptiveSignature} from './adaptive_schema_evolution.js';
import {matrixSourceEligible,type ProposedStructuredFact} from './category_evidence_matrix.js';
import {formCategoryBlueprint,type CategoryCriterionSignal,type CategoryBlueprint} from './category_cognitive_mesh.js';

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const safeId=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_]{0,119}$/.test(s);
export interface ColdStartSource {
  candidate:WebCandidate;
  policy:WebSourcePolicy;
  /** The caller attests this source is relevant to the proposed category; not proof. */
  categoryId:string;
}
export interface ColdStartSourceResult {
  sourceId:string;candidateId:string;
  status:'quarantined'|'blocked';
  extracted:number;rejected:number;contentSha256:string|null;
  reasons:string[];
}
export interface ColdStartAcquisitionResult {
 purpose:'unknown_category_local_evidence_intake';
 categoryId:string;sourceResults:ColdStartSourceResult[];
 blueprint:CategoryBlueprint;
 noSourceTextRetained:true;remoteAIUsed:false;
 actualSourceReads:number;
 rankingEligible:false;publicationReady:false;
}
/** Never instantiate a remote provider behind this adapter. Audit its implementation. */
export async function acquireColdStartCategoryEvidence(input:{
 categoryId:string;asOf:string; sources:readonly ColdStartSource[];
 adapter:LocalSemanticAdapter; transport?:SourceTransport;
 existing?:readonly KnownWebEvidence[];
 maxSources?:number;
}):Promise<ColdStartAcquisitionResult>{
 const limit=input.maxSources??5;
 if(!safeId(input.categoryId)||!input.categoryId.startsWith('provisional_')||
  !Number.isFinite(Date.parse(input.asOf))||!Array.isArray(input.sources)||
  !Number.isInteger(limit)||limit<1||limit>20||input.sources.length>limit||
  input.adapter?.execution!=='local_only')throw Error('Invalid cold-start scope, budget or local adapter');
 const results:ColdStartSourceResult[]=[];
 const signals:CategoryCriterionSignal[]=[];
 const seenSources=new Set<string>();
 let reads=0;
 for(const source of input.sources){
  const {candidate:c,policy:p}=source;
  const row:ColdStartSourceResult={sourceId:c?.sourceId??'invalid',candidateId:c?.id??'invalid',
   status:'blocked',extracted:0,rejected:0,contentSha256:null,reasons:[]};
  results.push(row);
  if(source.categoryId!==input.categoryId||!c||!p||!safeId(c.exactVariantId)||
   seenSources.has(c.id)) {row.reasons=['category_source_mismatch_or_duplicate'];continue;}
  seenSources.add(c.id);
  // The acquisition planner is also used for unknown categories; it checks the
  // exact product variant, original test identity, rights and permitted operations.
  let plan;
  try{plan=planWebEvidenceAcquisition({exactVariantId:c.exactVariantId,
   userQuestion:'Independent original product testing for category research',
   asOf:input.asOf,maxDaysSinceCheck:7,candidates:[c],existing:input.existing??[],policies:[p]});}
  catch{row.reasons=['invalid_source_metadata'];continue;}
  const queueItem=plan.items[0];
  if(queueItem.action!=='retrieve_for_research'||
    !p.permittedOperations.includes('fact_storage')||!p.permittedOperations.includes('public_citation')||
    !c.originalTestId||!c.lineageAttestationReference){
   row.reasons=queueItem.action==='retrieve_for_research'?['fact_storage_or_lineage_not_cleared']:[...queueItem.reasons];
   continue;
  }
  const facts:ProposedStructuredFact[]=[];
  const proposals=new Map<string,CategoryCriterionSignal['proposedField']>();
  let failed=0;
  let read;
  try{
   // The local parser gets the text only inside readApprovedSource. No text is
   // returned, journaled or transferred to a remote model by this module.
   read=await readApprovedSource({plan,queueItem,candidate:c,policy:p,checkedAt:input.asOf,
    transport:input.transport, transientClaimExtractor:async(body)=>{
      const suggestions=await input.adapter.suggestTransient(body);
      if(!Array.isArray(suggestions)||suggestions.length>50)throw Error('Unbounded suggestions');
      const claims:TransientWebClaim[]=[];
      const observationIds=new Set<string>();
      for(const s of suggestions){
       if(!safeId(s?.id)||observationIds.has(s.id)||!s.id.startsWith('obs_')||
         !s.definition||s.definition.kind!=='field'||
         !validateAdaptiveDefinition(s.definition)||
         !validateTransientSuggestionBinding(s,body)||
         s.value?.type!==s.definition.field.type||
         !s.definition.field.permittedOrigins.includes(s.origin)||
         (s.value.type==='number' && (s.value.unit!==s.definition.field.unit||
           !Number.isFinite(s.value.number)))||
         (s.value.type==='enum' && !s.definition.field.allowedValues.includes(s.value.choice))||
         !s.context||Object.keys(s.context).length!==s.definition.field.contextKeys.length||
         !s.definition.field.contextKeys.every((k:string)=>safeId(s.context[k]))||
         (s.definition.field.requiresProtocol&&(!safeId(s.protocolId)||!safeId(s.protocolVersion)))){
          failed++;continue;
       }
       observationIds.add(s.id);
       // One definition for each controlled criterion inside this source.
       const prior=proposals.get(s.definition.field.key);
       if(prior&&adaptiveSignature({kind:'field',field:prior})!==adaptiveSignature(s.definition)){
        failed++;continue;
       }
       proposals.set(s.definition.field.key,s.definition.field);
       facts.push({observationId:s.id,fieldKey:s.definition.field.key,origin:s.origin,
        value:s.value,context:s.context,protocolId:s.protocolId,
        protocolVersion:s.protocolVersion,valueTextSha256:sha(s.literalText),anchorSha256:sha(s.anchorText)});
       claims.push({criterionId:s.definition.field.key,valueText:s.literalText,anchorText:s.anchorText});
      }
      return claims;
    }});
  }catch{row.reasons=['reader_or_local_adapter_failed'];continue;}
  if(read.status!=='quarantined'){row.reasons=read.reasons;continue;}
  reads++;
  row.contentSha256=read.evidence.contentSha256;
  row.rejected=failed;
  const evidence:EvidenceProcessingResult=read.evidence;
  if(!matrixSourceEligible({candidate:c,policy:p,processing:evidence,asOf:input.asOf})){
    row.reasons=['storage_source_rights_or_provenance_denied'];continue;
  }
  for(const fact of facts){
   const def=proposals.get(fact.fieldKey)!;
   const signal:CategoryCriterionSignal={categoryId:input.categoryId,proposedField:def,
    proposedFact:fact,candidate:c,policy:p,processing:evidence,asOf:input.asOf};
   // The blueprint performs its own independent verification as well.
   signals.push(signal);row.extracted++;
  }
  row.status=row.extracted?'quarantined':'blocked';
  if(!row.extracted)row.reasons.push('no_supported_structured_observations');
 }
 return {purpose:'unknown_category_local_evidence_intake',categoryId:input.categoryId,
   sourceResults:results,blueprint:formCategoryBlueprint({categoryId:input.categoryId,signals}),
   noSourceTextRetained:true,remoteAIUsed:false,actualSourceReads:reads,
   rankingEligible:false,publicationReady:false};
}
