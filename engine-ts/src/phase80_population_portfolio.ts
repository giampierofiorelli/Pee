/** Phase 80 — choose which product RECORDS to populate first, before detailed testing.
 * Editorial-list presence is a candidate DISCOVERY PRIOR only, never a verdict.
 * All signals and independent publisher identities require trusted upstream attestation.
 * This prototype does not claim market coverage, calibrated probabilities, or rights clearance.
 */
export type CandidateStage='discovery_stub'|'structured_record'|'independently_appraised';
export type FirstPassDisposition='populate_now'|'confirm_identity_first'|'retain_stub_for_later'|'already_populated'|'excluded_by_verified_lifecycle';
export interface EditorialAppearance {
 publisherId:string; originalListId:string;
 type:'professionally_tested_shortlist'|'editorial_shortlist'|'commercial_or_unknown';
 prominence:'leading'|'included';
 /** An independent publisher, not a mirrored or syndicated publication. */
 independentPublisherAttested:boolean;
}
export interface CandidateForPopulation {
 id:string;categoryId:string;market:string;familyId:string;
 stage:CandidateStage;
 /** Lightweight identifiers/sources held even when full enrichment is deferred. */
 editorialAppearances:readonly EditorialAppearance[];
 officialProductIdentityConfirmed:boolean;
 marketListingConfirmed:boolean;
 /** First-party spec discovery is a triage signal, NOT evidence of performance. */
 novelVerifiedTechnicalFeature:boolean;
 /** Triggered by distinct user needs, not generic editorial popularity. */
 explicitNeedTriggered:boolean;
 /** Candidate satisfies a verified niche constraint not met by most existing candidates. */
 validatedNicheFit:boolean;
 /** Market-level product lifecycle must be verified separately. */
 verifiedDiscontinued:boolean;
}
export interface PopulationContext {
 categoryId:string;market:string;
 /** Product records are expensive; cap this wave rather than claiming full coverage. */
 enrichmentBudget:number;
 /** Candidate discovery is periodically run separately, including tail candidates. */
 independentDiscoveryPasses:number;
 discoveredNewPlausibleInRecentPasses:number;
 /** A *reviewed* category-family coverage inventory, not a self-reported model guess. */
 reviewedFamilyIds:readonly string[];
 /** If true, user has a specific demand that outranks category-general priorities. */
 demandMode:'general_launch_seed'|'specific_user_need';
}
export interface PopulationDecision {
 selectedForEnrichment:string[];
 candidates:ReadonlyArray<{productId:string;bucket:'urgent_for_need'|'high_baseline'|'standard'|'deferred';
  disposition:FirstPassDisposition;reasons:string[];independentEditorialPublishers:number}>;
 /** Only says whether this enrichment wave may pause, never whether the market is exhausted. */
 wave:'continue_priority_population'|'pause_after_budget'|'seed_sufficient_to_pause'|'no_candidate_yet';
 discoveredCount:number;populatedCount:number;backlogCount:number;
 ongoingDiscoveryRequired:true;
 decisionQualityCertified:false;marketCoverageCertified:false;rankingChanged:false;
}
const key=(s:unknown):s is string=>typeof s==='string'&&/^[a-z0-9][a-z0-9_.:-]{0,127}$/.test(s);
function unique<T>(a:readonly T[]):T[]{return [...new Set(a)];}
export function planProductPopulation(context:PopulationContext, records:readonly CandidateForPopulation[]):PopulationDecision {
 if(!context||!key(context.categoryId)||!key(context.market)||!Number.isInteger(context.enrichmentBudget)||
 context.enrichmentBudget<0||context.enrichmentBudget>500||
 !Number.isInteger(context.independentDiscoveryPasses)||context.independentDiscoveryPasses<0||
 !Number.isInteger(context.discoveredNewPlausibleInRecentPasses)||context.discoveredNewPlausibleInRecentPasses<0||
 !['general_launch_seed','specific_user_need'].includes(context.demandMode)||
 !Array.isArray(context.reviewedFamilyIds)||context.reviewedFamilyIds.length>500||
 (!context.reviewedFamilyIds.every(key)||new Set(context.reviewedFamilyIds).size!==context.reviewedFamilyIds.length)||!Array.isArray(records)||records.length>5000||
 new Set(records.map(p=>p.id)).size!==records.length)throw Error('Invalid population portfolio');
 for(const p of records){
  if(!key(p.id)||!key(p.categoryId)||!key(p.market)||!key(p.familyId)||p.categoryId!==context.categoryId||
    p.market!==context.market||!['discovery_stub','structured_record','independently_appraised'].includes(p.stage)||
    !Array.isArray(p.editorialAppearances)||p.editorialAppearances.length>100||
    !p.editorialAppearances.every((e:EditorialAppearance)=>key(e.publisherId)&&key(e.originalListId)&&
      ['professionally_tested_shortlist','editorial_shortlist','commercial_or_unknown'].includes(e.type)&&
      ['leading','included'].includes(e.prominence)&&typeof e.independentPublisherAttested==='boolean')||
    ['officialProductIdentityConfirmed','marketListingConfirmed','novelVerifiedTechnicalFeature',
      'explicitNeedTriggered','validatedNicheFit','verifiedDiscontinued'].some(k=>typeof p[k as keyof CandidateForPopulation]!=='boolean'))
    throw Error('Invalid discovery candidate');
 }
 const familyCount=new Map<string,number>();
 for(const p of records)if(p.stage!=='discovery_stub'&&!p.verifiedDiscontinued)
  familyCount.set(p.familyId,(familyCount.get(p.familyId)??0)+1);
 const evaluated=records.map(p=>{
  // Multiple syndicated list URLs from the same original are one discovery lead.
  const genuine=new Map<string,EditorialAppearance>();
  for(const e of p.editorialAppearances){
   if(!e.independentPublisherAttested||e.type==='commercial_or_unknown')continue;
   const original=`${e.publisherId}/${e.originalListId}`;
   const old=genuine.get(original);
   if(!old||e.prominence==='leading')genuine.set(original,e);
  }
  const publishers=new Set([...genuine.values()].map(e=>e.publisherId));
  const tested=[...genuine.values()].filter(e=>e.type==='professionally_tested_shortlist');
  const lead=[...genuine.values()].filter(e=>e.prominence==='leading');
  const reason:string[]=[];
  const niche=context.demandMode==='specific_user_need'&&p.explicitNeedTriggered&&p.validatedNicheFit;
  if(niche)reason.push('verified_demand_specific_niche_candidate');
  if(p.explicitNeedTriggered&&!niche)reason.push('specific_user_need_requires_fit_review');
  if(publishers.size>=2)reason.push('multiple_independent_editorial_discovery_leads');
  else if(publishers.size===1)reason.push('one_editorial_discovery_lead');
  if(tested.length>0)reason.push('appears_in_professional_test_shortlist');
  if(p.novelVerifiedTechnicalFeature)reason.push('new_verified_technical_differentiator_unproven_performance');
  if(!familyCount.has(p.familyId)&&context.reviewedFamilyIds.includes(p.familyId))reason.push('unrepresented_reviewed_solution_family');
  if(!p.officialProductIdentityConfirmed||!p.marketListingConfirmed)reason.push('identity_or_market_presence_needs_confirmation');
  const bucket:'urgent_for_need'|'high_baseline'|'standard'|'deferred'=niche?'urgent_for_need':
   ((publishers.size>=2&&tested.length>0)||(publishers.size>=2&&lead.length>0)||
    (p.novelVerifiedTechnicalFeature&&p.officialProductIdentityConfirmed)||
    (context.reviewedFamilyIds.includes(p.familyId)&&!familyCount.has(p.familyId)))?'high_baseline':
   p.explicitNeedTriggered||publishers.size>0||p.marketListingConfirmed?'standard':'deferred';
  const score=niche?100:bucket==='high_baseline'?60:bucket==='standard'?20:0;
  return {p,bucket,reason,publishers:publishers.size,score};
 });
 // Populate representative product families before filling lower-signal duplicates;
 // stable order makes reruns reproducible.
 const sorted=[...evaluated].sort((a,b)=>b.score-a.score||
  Number(context.reviewedFamilyIds.includes(b.p.familyId)&&!familyCount.has(b.p.familyId))-
  Number(context.reviewedFamilyIds.includes(a.p.familyId)&&!familyCount.has(a.p.familyId))||
  b.publishers-a.publishers||a.p.id.localeCompare(b.p.id));
 const selected:string[]=[];
 const output=new Map<string,PopulationDecision['candidates'][number]>();
 for(const v of sorted){
  const disposition:FirstPassDisposition=v.p.verifiedDiscontinued?'excluded_by_verified_lifecycle':
   v.p.stage!=='discovery_stub'?'already_populated':
   (!v.p.officialProductIdentityConfirmed||!v.p.marketListingConfirmed)?'confirm_identity_first':
   selected.length<context.enrichmentBudget?'populate_now':'retain_stub_for_later';
  if(disposition==='populate_now')selected.push(v.p.id);
  output.set(v.p.id,{productId:v.p.id,bucket:v.bucket,disposition,
    reasons:[...v.reason,...(v.p.verifiedDiscontinued?['verified_lifecycle_exclusion']:[])],
    independentEditorialPublishers:v.publishers});
 }
 const backlog=sorted.filter(x=>['retain_stub_for_later','confirm_identity_first'].includes(
  output.get(x.p.id)?.disposition??'')).length;
 const unpopulatedImportant=sorted.some(v=>v.p.stage==='discovery_stub'&&!v.p.verifiedDiscontinued&&
   (v.bucket==='high_baseline'||v.bucket==='urgent_for_need')&&
   ['retain_stub_for_later','confirm_identity_first'].includes(output.get(v.p.id)?.disposition??''));
 const missingReviewedFamily=context.reviewedFamilyIds.some(f=>!records.some(p=>p.familyId===f&&!p.verifiedDiscontinued));
 const candidateTypesCovered=records.some(p=>p.stage!=='discovery_stub'&&!p.verifiedDiscontinued);
 const canPause=context.independentDiscoveryPasses>=2&&context.discoveredNewPlausibleInRecentPasses===0&&
  !unpopulatedImportant&&!missingReviewedFamily&&candidateTypesCovered;
 let wave:PopulationDecision['wave'];
 if(records.length===0||records.every(p=>p.verifiedDiscontinued))wave='no_candidate_yet';
 else if(canPause)wave='seed_sufficient_to_pause';
 else if(selected.length>=context.enrichmentBudget&&context.enrichmentBudget>0)wave='pause_after_budget';
 else wave='continue_priority_population';
 return {selectedForEnrichment:selected,candidates:records.map(r=>output.get(r.id)!),wave,
  discoveredCount:records.length,populatedCount:records.filter(p=>p.stage!=='discovery_stub').length,
  backlogCount:backlog,ongoingDiscoveryRequired:true,decisionQualityCertified:false,
  marketCoverageCertified:false,rankingChanged:false};
}
