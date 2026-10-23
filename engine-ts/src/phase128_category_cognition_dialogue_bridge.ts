/** Phase128 — category knowledge evolves first; dialogue schemas are derived projections.
 * Extends Phase71/73/74 and Phase116 WITHOUT another source-of-truth for product facts.
 * Pending discoveries are quarantined; structural review receipts aren't authenticated identities.
 * No numerical quality claims, automatic source promotion, or ranking authority.
 */
import {createHash} from 'node:crypto';
import {routeCategory,planCategoryCapabilities,type CategoryIdentity,type CapabilityCompletionReceipt}
 from './category_cognitive_mesh.js';
import {validateSchema125,composeQuestion125,type CategorySchema125,type DialogueState125}
 from './phase125_compositional_dialogue_frame.js';
import type {ReviewedAmbiguity127} from './phase127_stateful_clarification.js';
import type {CategoryModel116} from './phase116_category_function_model.js';
import {validateModel116} from './phase116_category_function_model.js';

const ident=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_]{0,79}$/.test(s);
const txt=(s:unknown):s is string=>typeof s==='string'&&s.length>0&&s.length<=160&&s.trim()===s&&!/[<>\r\n]/.test(s);
const url=(s:unknown):s is string=>typeof s==='string'&&/^https:\/\/[a-z0-9][^\s]{4,3000}$/i.test(s);
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const sort=(x:readonly string[])=>[...new Set(x)].sort();
// Phase269: 'measurement' names what would establish an outcome (a measurand under a protocol) or a test condition; it has
// no everyday aliases and is never recognised as a user need.
const KIND=['task','environment','capability','meaning','outcome','failure','mechanism','measurement'] as const;
export type ConceptKind128=typeof KIND[number];
export type KnowledgeState128='proposed_unverified'|'reviewed_definition';
export interface SourceRef128 {id:string;url:string;title:string;originalDocumentId:string;
  role:'original_expert_method'|'original_product_test'|'manufacturer_specification'|'user_problem_report';}
export interface Review128 {reviewId:string;reviewerId:string;sourceRefIds:readonly string[];
  /** This is a structurally validated receipt, NOT independently authenticated here. */
  reviewScope:'category_definition'|'quality_method'|'ambiguity_meaning';}
export interface Concept128 {id:string;kind:ConceptKind128;label:string;
  aliases:readonly string[];evidenceKeys:readonly string[];state:KnowledgeState128;
  /** Meaning concepts belong in distinctions, not the ordinary category lexical matcher. */
  review?:Review128;}
export interface Quality128 {id:string;goalConceptId:string;outcomeConceptId:string;
  scope:'general'|'vacuum_only'|'mop_only'|'vacuum_and_mop'|'contextual';
  necessity:'must_meet_demonstrated_threshold'|'assess_quality'|'context_dependent';
  rationale:string;review:Review128;
  /** No universal threshold or score: only a methodology pointer. */
  thresholdCalibrationRefId:string|null;}
export interface DistinctionMeaning128 {conceptId:string;readingId:string;labelIt:string;labelEn:string;
  interpretationCode:string;absoluteConstraintId:string;}
export interface Distinction128 {issueCode:string;triggerAliases:readonly string[];
  questionIt:string;questionEn:string;meanings:readonly DistinctionMeaning128[];
  allowComparison:boolean;review:Review128;}
export interface CategoryBrain128 {categoryId:string;schemaVersion:number;aliases:readonly string[];
  sources:readonly SourceRef128[];concepts:readonly Concept128[];
  quality:readonly Quality128[];distinctions:readonly Distinction128[];
  /** Proposed and reviewed are held side by side; only reviewed reaches query schemas. */
  functionModel116?:CategoryModel116;}
export interface Discovery128 {categoryId:string;concept:Omit<Concept128,'state'|'review'>;
  suggestedSourceRefIds:readonly string[];observedDocumentIds:readonly string[];}
export interface QuarantinedDiscovery128 {discoveryId:string;categoryId:string;
  concept:Omit<Concept128,'state'|'review'>;suggestedSourceRefIds:string[];
  observedDocumentIds:string[];state:'pending_independent_review';}
function validReview(r:Review128,required:Review128['reviewScope'],ids:Set<string>):void{
 if(!r||!ident(r.reviewId)||!ident(r.reviewerId)||r.reviewScope!==required||
   !Array.isArray(r.sourceRefIds)||!r.sourceRefIds.length||
   r.sourceRefIds.some(x=>!ids.has(x))||sort(r.sourceRefIds).length!==r.sourceRefIds.length)
   throw Error('missing_or_invalid_review_receipt');
}
function validConcept(c:Omit<Concept128,'state'|'review'>):void{
 if(!c||!ident(c.id)||!KIND.includes(c.kind)||!txt(c.label)||
   !Array.isArray(c.aliases)||!c.aliases.length||c.aliases.length>40||
   c.aliases.some(a=>!txt(a))||
   new Set(c.aliases.map(x=>x.toLowerCase())).size!==c.aliases.length||
   !Array.isArray(c.evidenceKeys)||c.evidenceKeys.length>30||
   c.evidenceKeys.some(k=>!ident(k))||sort(c.evidenceKeys).length!==c.evidenceKeys.length)
   throw Error('invalid_concept_definition');
}
export function validateBrain128(brain:CategoryBrain128):void{
 if(!brain||!ident(brain.categoryId)||!Number.isInteger(brain.schemaVersion)||brain.schemaVersion<1||
    !Array.isArray(brain.aliases)||!brain.aliases.length||brain.aliases.some((x:string)=>!txt(x))||
    !Array.isArray(brain.sources)||brain.sources.length>3000||
    !Array.isArray(brain.concepts)||brain.concepts.length>3000||
    !Array.isArray(brain.quality)||brain.quality.length>1000||
    !Array.isArray(brain.distinctions)||brain.distinctions.length>1000)
    throw Error('invalid_brain_identity');
 const sources=new Set<string>();
 for(const s of brain.sources){
  if(!s||!ident(s.id)||sources.has(s.id)||!url(s.url)||!txt(s.title)||!ident(s.originalDocumentId)||
    !['original_expert_method','original_product_test','manufacturer_specification','user_problem_report'].includes(s.role))
    throw Error('invalid_source_identity');
  sources.add(s.id);
 }
 const concepts=new Map<string,Concept128>();
 for(const c of brain.concepts){
  validConcept(c);
  if(concepts.has(c.id)||!['proposed_unverified','reviewed_definition'].includes(c.state))throw Error('duplicate_or_invalid_concept');
  if(c.state==='reviewed_definition')validReview(c.review!,'category_definition',sources);
  else if(c.review!==undefined)throw Error('unverified_concept_has_review');
  concepts.set(c.id,c);
 }
 const quality=new Set<string>();
 for(const q of brain.quality){
  if(!q||!ident(q.id)||quality.has(q.id)||!concepts.has(q.goalConceptId)||
   !concepts.has(q.outcomeConceptId)||concepts.get(q.goalConceptId)?.kind!=='task'||
   concepts.get(q.outcomeConceptId)?.kind!=='outcome'||
   concepts.get(q.goalConceptId)?.state!=='reviewed_definition'||
   concepts.get(q.outcomeConceptId)?.state!=='reviewed_definition'||
   !['general','vacuum_only','mop_only','vacuum_and_mop','contextual'].includes(q.scope)||
   !['must_meet_demonstrated_threshold','assess_quality','context_dependent'].includes(q.necessity)||
   !txt(q.rationale)||(q.thresholdCalibrationRefId!==null&&!sources.has(q.thresholdCalibrationRefId)))
   throw Error('invalid_quality_axis');
  validReview(q.review,'quality_method',sources);
  if(!q.review.sourceRefIds.some((id:string)=>brain.sources.find(s=>s.id===id)?.role==='original_expert_method'||
    brain.sources.find(s=>s.id===id)?.role==='original_product_test'))throw Error('quality_requires_expert_or_original_test');
  if(q.necessity==='must_meet_demonstrated_threshold'&&!q.thresholdCalibrationRefId)
   throw Error('mandatory_threshold_needs_calibration_source');
  quality.add(q.id);
 }
 const ambiguities=new Set<string>();
 for(const d of brain.distinctions){
  if(!d||!ident(d.issueCode)||ambiguities.has(d.issueCode)||!d.questionIt||!d.questionEn||
    !d.triggerAliases.length||d.triggerAliases.length>20||d.triggerAliases.some((x:string)=>!txt(x))||
    d.meanings.length<2||d.meanings.length>4||
    new Set(d.meanings.map((m:DistinctionMeaning128)=>m.readingId)).size!==d.meanings.length||
    d.meanings.some((m:DistinctionMeaning128)=>!ident(m.readingId)||!ident(m.interpretationCode)||
      !ident(m.absoluteConstraintId)||!txt(m.labelIt)||!txt(m.labelEn)||
      concepts.get(m.conceptId)?.kind!=='meaning'||
      concepts.get(m.conceptId)?.state!=='reviewed_definition'))throw Error('invalid_ambiguity_definition');
  validReview(d.review,'ambiguity_meaning',sources);
  ambiguities.add(d.issueCode);
 }
 if(brain.functionModel116){
  validateModel116(brain.functionModel116);
  if(brain.functionModel116.categoryId!==brain.categoryId)throw Error('different_function_model_category');
 }
}
/** New observations cannot silently become canonical ontology or product knowledge. */
export function quarantineDiscovery128(brain:CategoryBrain128,discovery:Discovery128):QuarantinedDiscovery128{
 validateBrain128(brain);validConcept(discovery.concept);
 const ids=new Set(brain.sources.map(s=>s.id));
 if(discovery.categoryId!==brain.categoryId||brain.concepts.some(c=>c.id===discovery.concept.id)||
   !discovery.suggestedSourceRefIds.length||discovery.suggestedSourceRefIds.some(x=>!ids.has(x))||
   !discovery.observedDocumentIds.length||discovery.observedDocumentIds.some(x=>!ident(x)))
   throw Error('discovery_not_grounded_or_duplicate');
 const src=brain.sources.filter(s=>discovery.suggestedSourceRefIds.includes(s.id));
 if(!src.some(s=>discovery.observedDocumentIds.includes(s.originalDocumentId)))
   throw Error('discovery_source_document_mismatch');
 const bare={categoryId:brain.categoryId,concept:discovery.concept,
  suggestedSourceRefIds:sort(discovery.suggestedSourceRefIds),
  observedDocumentIds:sort(discovery.observedDocumentIds)};
 return {discoveryId:'discovery_'+hash(bare).slice(0,36),...bare,state:'pending_independent_review'};
}
/** Explicit promotion is a *separate* operation. Review identities must be authenticated upstream. */
export function promoteDiscovery128(brain:CategoryBrain128,proposal:QuarantinedDiscovery128,
 receipt:Review128):{brain:CategoryBrain128;previousVersion:number;newVersion:number;invalidationRequired:true}{
 validateBrain128(brain);
 if(proposal.categoryId!==brain.categoryId||proposal.state!=='pending_independent_review'||
    brain.concepts.some(c=>c.id===proposal.concept.id))throw Error('promotion_scope_or_conflict');
 const nextAliases=new Set(proposal.concept.aliases.map(a=>a.toLowerCase()));
 if(brain.concepts.some(c=>c.kind===proposal.concept.kind&&c.aliases.some(a=>nextAliases.has(a.toLowerCase()))))
   throw Error('semantic_alias_collision_requires_reconciliation');
 validConcept(proposal.concept);
 const expected=quarantineDiscovery128(brain,{categoryId:proposal.categoryId,concept:proposal.concept,
  suggestedSourceRefIds:proposal.suggestedSourceRefIds,observedDocumentIds:proposal.observedDocumentIds});
 if(expected.discoveryId!==proposal.discoveryId)throw Error('proposal_tampered');
 validReview(receipt,'category_definition',new Set(brain.sources.map(s=>s.id)));
 if(!receipt.sourceRefIds.every(id=>proposal.suggestedSourceRefIds.includes(id)))
   throw Error('receipt_not_in_discovery_provenance');
 const updated={...brain,schemaVersion:brain.schemaVersion+1,
  concepts:[...brain.concepts,{...proposal.concept,state:'reviewed_definition' as const,review:receipt}]};
 validateBrain128(updated);
 return {brain:updated,previousVersion:brain.schemaVersion,newVersion:updated.schemaVersion,
  invalidationRequired:true};
}
/** Research may also propose NEW quality definitions and semantic ambiguities.
 * They become reviewed knowledge only after explicit category-scoped review.
 * This adds no verified product performance and gives no user-ranking permission. */
export function promoteQualityMethod128(brain:CategoryBrain128,
 proposal:Omit<Quality128,'review'>,receipt:Review128){
 validateBrain128(brain);
 if(brain.quality.some(q=>q.id===proposal.id))throw Error('quality_method_already_exists');
 const updated:CategoryBrain128={...brain,schemaVersion:brain.schemaVersion+1,
  quality:[...brain.quality,{...proposal,review:receipt}]};
 validateBrain128(updated);
 return {brain:updated,newVersion:updated.schemaVersion,invalidationRequired:true as const,
  rankingAuthorized:false as const};
}
export function promoteMeaningDistinction128(brain:CategoryBrain128,
 proposal:Omit<Distinction128,'review'>,receipt:Review128){
 validateBrain128(brain);
 if(brain.distinctions.some(d=>d.issueCode===proposal.issueCode))throw Error('ambiguity_already_exists');
 const updated:CategoryBrain128={...brain,schemaVersion:brain.schemaVersion+1,
  distinctions:[...brain.distinctions,{...proposal,review:receipt}]};
 validateBrain128(updated);
 return {brain:updated,newVersion:updated.schemaVersion,invalidationRequired:true as const,
  rankingAuthorized:false as const};
}
/** The SAME approved category brain powers query interpretation, research gaps and domain distinctions. */
export function compileCategoryKnowledge128(brain:CategoryBrain128){
 validateBrain128(brain);
 const concepts=brain.concepts.filter(c=>c.state==='reviewed_definition');
 const schema:CategorySchema125={id:brain.categoryId,
  aliases:sort(brain.aliases),schemaReviewId:'category_brain_v'+brain.schemaVersion+'_'+hash(
   [brain.categoryId,brain.schemaVersion,concepts.map(c=>[c.id,c.kind,sort(c.aliases),sort(c.evidenceKeys),c.review?.reviewId]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))]).slice(0,12),
  aspects:concepts.filter(c=>['task','environment','capability'].includes(c.kind))
   .map(c=>({id:c.id,kind:c.kind as 'task'|'environment'|'capability',aliases:sort(c.aliases),
     evidenceKeys:sort(c.evidenceKeys)})).sort((a,b)=>a.id.localeCompare(b.id))};
 validateSchema125(schema);
 const ambiguities:ReviewedAmbiguity127[]=brain.distinctions.map(d=>({
  issueCode:d.issueCode,categoryId:brain.categoryId,schemaReviewId:schema.schemaReviewId,
  triggers:sort(d.triggerAliases),questionIt:d.questionIt,questionEn:d.questionEn,
  meanings:d.meanings.map(m=>({readingId:m.readingId,interpretationCode:m.interpretationCode,
   labelIt:m.labelIt,labelEn:m.labelEn,absoluteConstraintId:m.absoluteConstraintId})),
  allowComparison:d.allowComparison})).sort((a,b)=>a.issueCode.localeCompare(b.issueCode));
 const reviewedGoals=concepts.filter(c=>c.kind==='task');
 const qualityGaps=reviewedGoals.filter(c=>!brain.quality.some(q=>q.goalConceptId===c.id))
   .map(c=>({goalConceptId:c.id,reason:'no_reviewed_quality_method'}));
 const pendingConcepts=brain.concepts.filter(c=>c.state==='proposed_unverified').map(c=>c.id).sort();
 const uncoveredFunctionGoals=brain.functionModel116?.functions.filter(f=>
  !brain.functionModel116!.links.some(l=>l.kind==='measured_by'&&l.to===f.id))
  .map(f=>f.id).sort()??[];
 return {categoryId:brain.categoryId,schemaVersion:brain.schemaVersion,
  schema,ambiguities,qualityAxes:brain.quality.map(q=>({criterionId:q.id,goalConceptId:q.goalConceptId,
   outcomeConceptId:q.outcomeConceptId,scope:q.scope,necessity:q.necessity,
   thresholdCalibrationRefId:q.thresholdCalibrationRefId,
   sourceRefIds:sort(q.review.sourceRefIds)})).sort((a,b)=>a.criterionId.localeCompare(b.criterionId)),
  knowledgeGaps:{qualityMethods:qualityGaps,pendingConceptIds:pendingConcepts,
   unmeasuredFunctionGoals:uncoveredFunctionGoals},
  /** Content-addressed: changing a definition without increasing version still changes snapshot. */
  ontologySnapshot:hash({categoryId:brain.categoryId,version:brain.schemaVersion,
   aliases:sort(brain.aliases),
   sources:brain.sources.map(s=>[s.id,s.url,s.originalDocumentId,s.role]).sort((a,b)=>a[0].localeCompare(b[0])),
   reviewed:concepts.map(c=>[c.id,c.kind,c.label,sort(c.aliases),sort(c.evidenceKeys),
     c.review?.reviewId,c.review?.reviewerId,sort(c.review?.sourceRefIds??[])]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),
   quality:brain.quality.map(q=>[q.id,q.goalConceptId,q.outcomeConceptId,q.scope,q.necessity,
     q.rationale,q.thresholdCalibrationRefId,q.review.reviewId,sort(q.review.sourceRefIds)]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),
   distinctions:brain.distinctions.map(d=>[d.issueCode,sort(d.triggerAliases),d.questionIt,d.questionEn,
     d.meanings.map(m=>[m.readingId,m.conceptId,m.interpretationCode,m.absoluteConstraintId,m.labelIt,m.labelEn]).sort((a,b)=>a[0].localeCompare(b[0])),
     d.review.reviewId,sort(d.review.sourceRefIds)]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),
   functionModelVersion:brain.functionModel116?.modelVersion??null}),
  originalProductTestsAuthenticated:false as const,rankingAuthorized:false as const};
}
export function interpretFromBrain128(brain:CategoryBrain128,question:string,state:DialogueState125={}){
 const compiled=compileCategoryKnowledge128(brain);
 const frame=composeQuestion125(question,[compiled.schema],state);
 return {frame,categorySnapshot:compiled.ontologySnapshot,
  researchNeeds:{qualityGaps:compiled.knowledgeGaps.qualityMethods,
   pendingKnowledge:compiled.knowledgeGaps.pendingConceptIds,
   evidenceKeys:frame.evidenceObligations},
  dialogueAmbiguities:compiled.ambiguities,
  rankingAuthorized:false as const};
}
/** Research obligations are generated from knowledge gaps, not manual per-query lists.
 * The generic execution system in Phase74 owns actual authorized acquisition.
 */
export function planCategoryKnowledgeGrowth128(brain:CategoryBrain128){
 const c=compileCategoryKnowledge128(brain);
 const tasks=[
  ...c.knowledgeGaps.qualityMethods.map(g=>({key:'quality_'+g.goalConceptId,
   capability:'criterion_design' as const,reason:g.reason,reviewRequired:true as const})),
  ...c.knowledgeGaps.pendingConceptIds.map(id=>({key:'concept_'+id,
   capability:'category_schema_review' as const,reason:'new_concept_not_reviewed',reviewRequired:true as const})),
  ...c.knowledgeGaps.unmeasuredFunctionGoals.map(id=>({key:'measure_'+id,
   capability:'test_method_research' as const,reason:'missing_outcome_measure',reviewRequired:true as const}))]
  .sort((a,b)=>a.key.localeCompare(b.key));
 return {categoryId:c.categoryId,ontologySnapshot:c.ontologySnapshot,
  tasks,actualWebResearchPerformed:false as const,publicationReady:false as const};
}
/** Reuses the *existing* Phases73–74 cold-start planner: unknown category is research-only. */
export function routeDiscoveryIntoExistingCategoryResearch128(input:{
 label:string;catalog:readonly CategoryIdentity[];asOf:string;
 completionReceipts?:readonly CapabilityCompletionReceipt[]}){
 const route=routeCategory(input.label,input.catalog);
 const existingPlan=planCategoryCapabilities(input);
 return {route,existingPlan,researchOnly:true as const,
  noAutomaticOntologyPromotion:true as const,noRankingBeforeEvidence:true as const};
}
