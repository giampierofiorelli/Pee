/** Phase 114: bounded audit for an OVERALL-BEST robot with hygiene capability.
 * No LLM inference, source mutation, ungrounded hygiene claim or publication.
 * This is NOT a general NLP model and NOT a validated consumer ranking.
 */
import {createHash} from 'node:crypto';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export type Objective114='best_overall_with_capability'|'maximize_floor_hygiene'|'undetermined';
export type Scope114='microbial_floor_effect'|'ambiguous_cleaning_vs_microbes';
export function boundedIntent114(q:string){
 if(typeof q!=='string'||q.length<14||q.length>4000)return null;
 const s=q.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(!/\b(?:robot|robotic|robovac)\b/.test(s)||
    !/\b(?:paviment\w*|floor\w*|lavapavimenti)\b/.test(s)||
    !/\b(?:igien\w*|saniti\w*|disinfett\w*|disinfect\w*|germ\w*|virus|viruses|batter\w*)\b/.test(s))return null;
 const max=/\b(?:igien\w*|disinfett\w*|saniti\w*)\s+(?:di\s+piu|meglio)\b|\b(?:most|maximum)\s+(?:hygieni\w*|disinfect\w*)\b/.test(s);
 const best=/\b(?:miglior\w*|best|top|ottim\w*)\b/.test(s);
 const objective:Objective114=max?'maximize_floor_hygiene':best?'best_overall_with_capability':'undetermined';
 const microbial=/\b(?:disinfett\w*|disinfect\w*|batter\w*|virus|viruses|germ\w*)\b/.test(s);
 const scope:Scope114=microbial?'microbial_floor_effect':'ambiguous_cleaning_vs_microbes';
 const microorganismTargets:('bacteria'|'viruses')[]=[
  ...(/\b(?:batter\w*|bacteria)\b/.test(s)?['bacteria' as const]:[]),
  ...(/\b(?:virus|viruses|virali)\b/.test(s)?['viruses' as const]:[])];
 return {objective,category:'robot_vacuum_mop' as const,capability:'floor_hygiene' as const,
   capabilityRole:/\b(?:che|which|that)\b/.test(s)?'eligibility_preference_needing_clarification':'unresolved',
   scope,microorganismTargets,queryHash:hash(q),
   hardRequirements:[] as string[], // never silently invent a non-compensatory veto
   status:'bounded_interpretation_not_approved' as const};
}
export type Kind114='wet_mopping_floor'|'independent_stain_removal'|
 'independent_hard_floor_pickup'|'independent_stain_spreading'|
 'dock_hot_mop_wash'|'continuous_clean_roller_rinse'|
 'manufacturer_floor_germ_claim'|'independent_floor_microbe_test';
export type Origin114='independent_observation'|'manufacturer_declaration';
export interface Fact114 {kind:Kind114;origin:Origin114;sourceUrl:string;
 originalTestId:string;context:string; targetOrganism?:'bacteria'|'viruses';assayMethod?:string;}
export interface Product114 {id:string;name:string;facts:Fact114[];}
export function hygieneKnowledgeAudit114(q:string,products:readonly Product114[],revision:string){
 const intent=boundedIntent114(q);if(!intent)throw Error('unsupported_request');
 if(!/^[\w-]{4,90}$/.test(revision))throw Error('invalid_revision');
 const ids=new Set<string>();
 const rows=products.map(p=>{
  if(!/^[\w-]{3,90}$/.test(p.id)||!p.name||ids.has(p.id))throw Error('invalid_or_duplicate_variant');ids.add(p.id);
  for(const f of p.facts){
   if(!f.sourceUrl.startsWith('https://')||!f.originalTestId||!f.context)throw Error('missing_provenance');
   if(f.kind==='manufacturer_floor_germ_claim'&&f.origin!=='manufacturer_declaration')throw Error('marketing_promoted_to_independent');
   if(f.kind==='independent_floor_microbe_test'&&
    (f.origin!=='independent_observation'||!f.assayMethod||!f.targetOrganism))throw Error('floor_microbiology_unverified');
   if(f.kind!=='independent_floor_microbe_test'&&f.assayMethod)throw Error('assay_wrong_scope');
  }
  const kinds=[...new Set(p.facts.map(f=>f.kind))].sort();
  return {id:p.id,name:p.name,kinds,wetMoppingDocumented:kinds.includes('wet_mopping_floor'),
    independentlyTestedTargets:[...new Set(p.facts.filter(f=>f.kind==='independent_floor_microbe_test').map(f=>f.targetOrganism!))].sort(),
    floorMicrobeEvidence:kinds.includes('independent_floor_microbe_test')?'independently_tested_for_specific_target_only':
      kinds.includes('manufacturer_floor_germ_claim')?'manufacturer_declared_only':'not_found_in_examined_sources',
    sources:[...new Set(p.facts.map(f=>f.sourceUrl))].sort()};
 }).sort((a,b)=>a.id.localeCompare(b.id));
 return {purpose:'phase114_test_not_public_recommendation',revision,intent,rows,
  primaryGoal:intent.objective,secondaryOptionalGoal:intent.objective==='best_overall_with_capability'?
   'maximize_floor_hygiene':'best_overall_with_capability',
  verificationGaps:[
   ...(intent.scope==='ambiguous_cleaning_vs_microbes'?['meaning_of_igienizzare_unverified']:[]),
   ...(!rows.some(r=>r.independentlyTestedTargets.length)?['no_floor_microbiological_qualification_in_checked_evidence']:[]),
   ...intent.microorganismTargets.filter(t=>!rows.some(r=>r.independentlyTestedTargets.includes(t))).map(t=>'no_independent_floor_assay_for_requested_'+t),
   'no_validated_overall_MCDA_for_this_candidate_set'
  ],
  floorDisinfectionCannotBeInferredFromDockWash:true,
  manufacturerClaimCannotBeTreatedAsLabTest:true,
  noProductExcludedBecauseOfMissingTests:true,
  overallRanking:null,secondaryHygieneRanking:null,publicationReady:false,
  canonicalFactsChanged:false,llmCalls:0};
}
