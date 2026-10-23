/** Phase238: document-local typed discrepancies among already validated,
 * provisional author claims. Equal label/units alone never imply shared entity.
 * No winner, no majority/recency reasoning, and never ranking evidence.
 */
import type {DocClaim228} from './phase228_document_observer.js';

export type DiscrepancyKind238 = 'programme_control_disagreement'|
 'exact_document_declared_model_scalar_disagreement'|
 'conditional_component_value_disagreement';
export interface DiscrepancyEdge238 {
 kind:DiscrepancyKind238;
 subjectKey:string;leftClaimId:string;rightClaimId:string;
 leftLocator:DocClaim228['locator'];rightLocator:DocClaim228['locator'];
 conflictingFields:readonly string[];
 resolution:'unresolved_source_disagreement';
 scientificEvidenceAdmitted:false;rankingAuthorized:false;
}
export interface DocumentDiscrepancies238 {
 schema:'pee238.document-local-discrepancies.v1';documentSha256:string;
 edges:readonly DiscrepancyEdge238[];
 checkedWithinOneOriginalDocument:true;crossDocumentIdentityEstablished:false;
 authoritativeChoice:null;scientificEvidenceAdmitted:false;rankingAuthorized:false;
}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function safeIdentity(a:DocClaim228):string|null{
 // A document-declared model is *not* a verified retail SKU, but is an
 // unambiguous authored column/variant reference for local contradictions.
 if(a.variantModel && a.variantType==='document_declared_product_variant') return 'variant:'+a.variantModel;
 if(a.catalogModel && a.catalogType==='document_declared_catalog_product') return 'catalog:'+a.catalogModel;
 if(a.componentModel && a.componentType==='document_declared_subcomponent') return 'component:'+a.componentModel;
 if(a.model && a.modelAssignment==='single_declared_model_unverified')return 'declared:'+a.model;
 return null;
}
const loc=(a:DocClaim228)=>a.locator;
const tupleProgram=(a:DocClaim228)=>a.programSetting?.program??a.programTableSetting?.program;
/** Not a generalized natural-language contradiction detector. It only checks
 * comparable typed statements in one verified SHA-256 document. */
export function buildDocumentDiscrepancies238(documentSha256:string,claims:readonly DocClaim228[]):DocumentDiscrepancies238{
 if(!/^[a-f0-9]{64}$/.test(documentSha256)||claims.length>90||claims.some(c=>
  !/^[a-f0-9]{64}$/.test(c.claimId)||c.sourceRole!=='publisher_document_claim_unverified'||
  c.rankingAuthorized!==false||c.exactVariantVerified!==false||c.testedPerformance!==false))
  throw Error('phase238_invalid_discrepancy_inputs');
 const edges:DiscrepancyEdge238[]=[];
 for(let i=0;i<claims.length;i++)for(let j=i+1;j<claims.length;j++){
  const a=claims[i],b=claims[j];if(a.claimId===b.claimId)continue;
  let kind:DiscrepancyKind238|null=null,key='',fields:string[]=[];
  const pa=tupleProgram(a),pb=tupleProgram(b);
  if(pa&&pb&&pa===pb&&(Boolean(a.programSetting) !== Boolean(b.programSetting)) &&
      (a.programTableSetting?.foodType === null || b.programTableSetting?.foodType === null)){
   // Only the programme's global default is comparable to prose settings;
   // specific food rows have a different scope even when the programme matches.
   const prose=a.programSetting?a:b,grid=a.programTableSetting?a:b;
   if(prose.range&&grid.programTableSetting&&prose.programSetting){
    kind='programme_control_disagreement';key='programme:'+pa+':adjustable_duration';
    if(prose.range.unit==='hours'){
     if(prose.range.lower*60!==grid.programTableSetting.adjustableDurationMinutes.lower)fields.push('adjustable_duration.lower');
     if(prose.range.upper*60!==grid.programTableSetting.adjustableDurationMinutes.upper)fields.push('adjustable_duration.upper');
     if(prose.programSetting.defaultValue*60!==grid.programTableSetting.defaultDurationMinutes)fields.push('default_duration');
    }else{kind=null;}
   }
  }
  if(!kind){
   const ia=safeIdentity(a),ib=safeIdentity(b);
   if(ia&&ia===ib&&a.label===b.label&&a.unit===b.unit&&
      a.measurementBasis===b.measurementBasis&&a.condition===b.condition&&
      a.scopeComponent===b.scopeComponent&&a.value!==null&&b.value!==null&&
      a.range===undefined&&b.range===undefined&&a.vector===undefined&&b.vector===undefined&&
      a.configurationDependency===undefined&&b.configurationDependency===undefined){
    kind='exact_document_declared_model_scalar_disagreement';
    key=ia+':'+a.label+':'+a.unit+':'+(a.condition??'none')+':'+(a.measurementBasis??'none');
    if(a.value!==b.value)fields=['value'];
   }
  }
  if(!kind){
   const ca=a.configurationDependency,cb=b.configurationDependency;
   if(ca&&cb&&ca.triggerAccessory===cb.triggerAccessory&&
     ca.triggerState===cb.triggerState&&ca.requirement===cb.requirement&&
     a.scopeComponent===b.scopeComponent&&a.label===b.label&&a.unit===b.unit&&
     a.value!==null&&b.value!==null&&a.condition===b.condition){
      kind='conditional_component_value_disagreement';
      key='condition:'+ca.triggerAccessory+':'+ca.triggerState+':'+a.scopeComponent+':'+a.label+':'+a.unit;
      if(a.value!==b.value)fields=['conditional_value'];
   }
  }
  if(!kind||!fields.length)continue;
  // Never report duplicate independently unrelated statements with no
  // original page anchor; this is local PDF/DOCX source provenance only.
  if(!loc(a)||!loc(b)||same(loc(a),loc(b)))continue;
  edges.push({kind,subjectKey:key,leftClaimId:a.claimId,rightClaimId:b.claimId,
   leftLocator:loc(a),rightLocator:loc(b),conflictingFields:fields,
   resolution:'unresolved_source_disagreement',scientificEvidenceAdmitted:false,rankingAuthorized:false});
 }
 edges.sort((a,b)=>a.subjectKey.localeCompare(b.subjectKey)||a.leftClaimId.localeCompare(b.leftClaimId)||a.rightClaimId.localeCompare(b.rightClaimId));
 return {schema:'pee238.document-local-discrepancies.v1',documentSha256,
  edges,checkedWithinOneOriginalDocument:true,crossDocumentIdentityEstablished:false,
  authoritativeChoice:null,scientificEvidenceAdmitted:false,rankingAuthorized:false};
}
