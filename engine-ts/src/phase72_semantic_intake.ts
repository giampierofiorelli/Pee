/**
 * Phase 72 — transient, typed AI-suggestion boundary for *any* category.
 * A local inference adapter may suggest new dimensions; it does not create evidence.
 * Byte-access authorization is enforced upstream by readApprovedSource, and
 * suggested values must be explicitly bound to a passage in those same bytes.
 * No remote-model calls, persisted text, approval, or recommendation output here.
 */
import {createHash} from 'node:crypto';
import {readApprovedSource,type SourceTransport,type TransientWebClaim} from './approved_web_reader.js';
import {planWebEvidenceAcquisition,type WebCandidate,type WebSourcePolicy,type KnownWebEvidence} from './web_evidence_acquisition.js';
import {buildCategoryEvidenceMatrix,type CategoryFieldRegistry,type MatrixValue,type ProposedStructuredFact,type QuarantinedMatrixObservation,type MatrixOrigin} from './category_evidence_matrix.js';
import {captureSchemaGap,discoverAdaptiveSchema,adaptiveSignature,type AdaptiveDefinition,type GapSignal,type AutoResearchCatalog} from './adaptive_schema_evolution.js';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');

/** These two raw evidence slices exist ONLY during transient execution. */
export interface EphemeralSemanticSuggestion {
 id:string;
 definition:AdaptiveDefinition & {kind:'field'};
 origin:MatrixOrigin;
 value:MatrixValue;
 context:Record<string,string>;
 protocolId:string|null;
 protocolVersion:string|null;
 anchorText:string;
 literalText:string;
 interpretation:'direct_source_value'|'semantic_assessment';
}
export interface LocalSemanticAdapter {
 execution:'local_only';
 /** Implementations must not transmit/log/persist source bytes. The caller must audit this. */
 suggestTransient(body:string):Promise<readonly EphemeralSemanticSuggestion[]>|readonly EphemeralSemanticSuggestion[];
}
export type SemanticIngestResult={
 purpose:'quarantined_cross_category_semantic_intake';status:'blocked'|'quarantined';
 sourceUrl:string;reasons:string[];sourceSha256:string|null;
 observations:QuarantinedMatrixObservation[];gapSignals:GapSignal[];
 catalog:AutoResearchCatalog|null;
 invalidSuggestions:number;acceptedSuggestions:number;
 noTextStored:true;remoteAIUsed:false;rankingEligible:false;publicationReady:false;
};
export function validateTransientSuggestionBinding(s:EphemeralSemanticSuggestion,body:string):boolean {
 if(!s||typeof s.anchorText!=='string'||s.anchorText.length<10||s.anchorText.length>300||
   typeof s.literalText!=='string'||s.literalText.length<1||s.literalText.length>90||
   /[<>\r\n]/.test(s.anchorText)||/[<>\r\n]/.test(s.literalText)||
   !body.includes(s.anchorText)||!s.anchorText.includes(s.literalText))return false;
 if(s.interpretation==='semantic_assessment')return s.value?.type!=='number';
 if(s.interpretation!=='direct_source_value')return false;
 if(s.value?.type==='number'){
  if(!/^-?\d+(?:\.\d+)?$/.test(s.literalText)||!Number.isFinite(s.value.number)||
   Number(s.literalText)!==s.value.number)return false;
  // Prevent recognizing "4" as evidence for 4 when the source contains "14".
  const escaped=s.literalText.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp('(?:^|[^0-9.])'+escaped+'(?:$|[^0-9.])').test(s.anchorText);
 }
 if(s.value?.type==='enum')return s.value.choice.replace(/_/g,' ')===s.literalText.toLowerCase();
 if(s.value?.type==='boolean')return ['true','false'].includes(s.literalText.toLowerCase())&&
  String(s.value.boolean)===s.literalText.toLowerCase();
 return false;
}
/** Source anchor matching is only a syntactic check; semantic meaning still requires independent review. */
export async function acquireSuggestedCategoryEvidence(input:{
 registry:CategoryFieldRegistry;candidate:WebCandidate;policy:WebSourcePolicy;
 asOf:string;adapter:LocalSemanticAdapter;transport?:SourceTransport;
 existing?:readonly KnownWebEvidence[];
}):Promise<SemanticIngestResult>{
 const {registry,candidate,policy,asOf,adapter}=input;
 const out:SemanticIngestResult={purpose:'quarantined_cross_category_semantic_intake',status:'blocked',
  sourceUrl:candidate.url,sourceSha256:null,reasons:[],observations:[],gapSignals:[],catalog:null,
  invalidSuggestions:0,acceptedSuggestions:0,noTextStored:true,remoteAIUsed:false,
  rankingEligible:false,publicationReady:false};
 if(adapter?.execution!=='local_only'||!Array.isArray(registry?.fields)||
    registry.categoryId.length>120){out.reasons=['local_adapter_or_registry_invalid'];return out;}
 const plan=planWebEvidenceAcquisition({exactVariantId:candidate.exactVariantId,userQuestion:'independent product assessment',
  asOf,maxDaysSinceCheck:7,candidates:[candidate],existing:input.existing??[],policies:[policy]});
 const queued=plan.items[0];
 if(queued.action!=='retrieve_for_research'){out.reasons=[...queued.reasons];return out;}
 const parsed:ProposedStructuredFact[]=[];
 const definitions=new Map<string,AdaptiveDefinition & {kind:'field'}>();
 let invalid=0;
 const read=await readApprovedSource({plan,queueItem:queued,candidate,policy,checkedAt:asOf,
  transport:input.transport,transientClaimExtractor:async(body)=>{
    const suggestions=await adapter.suggestTransient(body);
    if(!Array.isArray(suggestions)||suggestions.length>50)throw Error('Unbounded AI suggestions');
    const claims:TransientWebClaim[]=[];
    for(const s of suggestions){
     if(!validateTransientSuggestionBinding(s,body)||!/^obs_[a-z0-9_]{1,90}$/.test(s.id)||
       s.value.type!==s.definition?.field?.type||
       definitions.has(s.id)){invalid++;continue;}
     definitions.set(s.id,s.definition);
     const criterionId=s.definition.field.key;
     const p:ProposedStructuredFact={observationId:s.id,fieldKey:criterionId,origin:s.origin,
       value:s.value,context:s.context,protocolId:s.protocolId,protocolVersion:s.protocolVersion,
       valueTextSha256:sha(s.literalText),anchorSha256:sha(s.anchorText)};
     parsed.push(p);
     claims.push({criterionId,valueText:s.literalText,anchorText:s.anchorText});
    }
    return claims;
  }});
 if(read.status!=='quarantined'){out.reasons=read.reasons;return out;}
 out.sourceSha256=read.evidence.contentSha256;
 out.invalidSuggestions=invalid;
 const discovered:GapSignal[]=[];
 const uniqueSlots=new Set<string>();
 for(const p of parsed){
  const def=definitions.get(p.observationId)!;
  const slot=JSON.stringify([p.fieldKey,p.origin,p.context,p.protocolId,p.protocolVersion]);
  if(uniqueSlots.has(slot)){out.reasons.push(`${p.observationId}:duplicate_field_context_from_source`);continue;}
  uniqueSlots.add(slot);
  const registered=registry.fields.find(f=>f.key===p.fieldKey);
  if(registered){
   // Do not allow a model to silently reinterpret an established criterion.
   let semanticsMatch=false;
   try{semanticsMatch=adaptiveSignature({kind:'field',field:registered})===adaptiveSignature(def);}
   catch{semanticsMatch=false;}
   if(!semanticsMatch){
    out.reasons.push(`${p.observationId}:existing_field_semantic_conflict`);continue;
   }
   const result=buildCategoryEvidenceMatrix({registry,candidate,policy,processing:read.evidence,
    asOf,proposed:[p]});
   if(result.observations.length>0)out.observations.push(...result.observations);
   out.reasons.push(...result.rejected.map(e=>`${e.observationId}:${e.reason}`));
  }else{
   const captured=captureSchemaGap({registry,proposal:def,fact:p,candidate,policy,
    processing:read.evidence,asOf});
   if(captured.status==='quarantined_gap_signal')discovered.push(captured.signal);
   else out.reasons.push(`${p.observationId}:${captured.reason}`);
  }
 }
 out.gapSignals=discovered;
 out.acceptedSuggestions=out.observations.length+discovered.length;
 out.catalog=discovered.length?discoverAdaptiveSchema(registry,discovered):null;
 out.status=out.acceptedSuggestions?'quarantined':'blocked';
 if(!out.acceptedSuggestions)out.reasons.push('no_supported_suggestions');
 return out;
}
