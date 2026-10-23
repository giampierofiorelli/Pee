/** Phase243: budgeted, reversible FIRST-PASS research triage, not a product verdict.
 * Reuses Phase80 population priorities, rather than replacing the evidence/ranking pipeline.
 * Upstream origin/method reviews must be authenticated outside this planning-only module.
 * A negative discovery lead can postpone expensive research, NEVER prove inferior quality.
 */
import {createHash} from 'node:crypto';
import {planProductPopulation,type CandidateForPopulation,type PopulationContext} from './phase80_population_portfolio.js';

export type SignalKind243=
 'reviewed_original_test_problem'|'reviewed_original_test_strength'|
 'reviewed_hard_need_mismatch'|'community_complaint_lead'|'unreviewed_negative_report'|
 'marketplace_stars_lead'|'manufacturer_feature_claim'|'verified_safety_alert';
export interface ResearchSignal243 {
 kind:SignalKind243;
 /** Same original syndicated across websites shares one originalSourceId. */
 originalSourceId:string;publisherId:string;sourceRevisionHash:string;
 /** Attestation must be authenticated by ingestion; this DTO itself is NOT proof. */
 reviewedOriginalMethod:boolean;
 /** For safety alerts and need failures, upstream human/signed review is required. */
 reviewedForExactVariantAndMarket:boolean;
 /** A signal belongs ONLY to this candidate: no brand-wide propagation. */
 productId:string;market:string;
}
export interface CandidateResearch243 {
 product:CandidateForPopulation;
 researchState:'unseen'|'cheap_screened'|'deep_reviewed'|'suspended';
 signals:readonly ResearchSignal243[];
 /** Scope-local, not a permanent rejection. */
 suspendedUnderScope:string|null;
 /** True only after a verified independent-method assessment: not inferred from editorials. */
 reviewedHighPotential:boolean;
}
export interface Policy243 {
 version:string;
 /** Bounded effort units, NOT measured USD, tokens, latency or CPU time. */
 effortBudget:number;
 unitCost:{identity:number;cheap_screen:number;deep_review:number;revisit:number};
 /** During bootstrap use temporarily aggressive screening. */
 mode:'lean_bootstrap'|'expanded_coverage';
 /** Target for opening suspended candidates, NOT automatic search-completeness proof. */
 minimumCredibleCandidateCount:number;
 /** Reserve a minority of *action slots* for alternatives/emerging producers. */
 reservedTailActionPercent:number;
 /** Small periodic rechecks of early-paused records to detect selection mistakes. */
 auditSuspendedMaxPerWave:number;
 auditEveryNWaves:number;
}
export interface WaveContext243 {
 categoryId:string;market:string;scopeKey:string;asOf:string;
 /** Distinct existing pre-validated input, not an LLM self-attestation. */
 population:PopulationContext;
 policy:Policy243;
 /** New market or user need must use another key; never inherit earlier suspensions. */
 explicitUserNeedProductIds:readonly string[];
 /** Second-pass recovery is explicitly authorized after a completed first sweep. */
 recoveryMode:'normal'|'review_suspended_due_to_shortage';
 /** Monotone scheduler wave index. An index is not itself trusted source evidence. */
 waveOrdinal:number;
 /** Reconsider suspended candidates if new source revision, change of policy or need. */
 changedSourceRevisionProductIds:readonly string[];
 /** Protected discovery breadth: no brand exclusion or assumed known-market exhaustiveness. */
}
export type Action243='verify_identity'|'cheap_screen'|'deep_review'|'revisit_suspended';
export interface ProductTriage243 {
 productId:string;baselineBucket:string;
 triage:'priority'|'standard'|'temporarily_deprioritized'|'temporarily_suspended'|'already_deep_reviewed'|'identity_unknown'|'verified_discontinued';
 reasons:readonly string[];distinctNegativeOrigins:number;
 observedOriginalProblemCount:number;
 proposedAction:Action243|null;
 /** A current review action, not ranking or product exclusion. */
 rankingAuthorized:false;permanentExclusion:false;
}
export interface ResearchWave243 {
 schema:'pee243.budgeted-wave.v1';scopeKey:string;categoryId:string;market:string;
 policyVersion:string;mode:Policy243['mode'];
 credibleCandidateCount:number;shortageTriggersRevisit:boolean;
 choices:readonly {productId:string;action:Action243;effortUnits:number;reason:string}[];
 productDecisions:readonly ProductTriage243[];
 spentEffortUnits:number;remainingEffortUnits:number;
 tailActions:number;totalActions:number;auditedSuspendedCount:number;
 /** Scheduling is not proof of suitability, market coverage or rights clearance. */
 rankingAuthorized:false;marketCoverageCertified:false;discoveryMustContinue:true;
 limitations:readonly string[];
}
const id=(s:unknown):s is string=>typeof s==='string'&&/^[a-zA-Z0-9_][a-zA-Z0-9_.:-]{0,127}$/.test(s);
const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
const kinds=new Set<SignalKind243>([
 'reviewed_original_test_problem','reviewed_original_test_strength','reviewed_hard_need_mismatch',
 'community_complaint_lead','unreviewed_negative_report','marketplace_stars_lead',
 'manufacturer_feature_claim','verified_safety_alert']);
const ensure=(v:boolean,msg:string)=>{if(!v)throw Error('phase243_'+msg);};
function checkedInputs(ctx:WaveContext243,all:readonly CandidateResearch243[]):void {
 ensure(!!ctx&&id(ctx.categoryId)&&id(ctx.market)&&id(ctx.scopeKey)&&
   /^\d{4}-\d\d-\d\dT/.test(ctx.asOf)&&Number.isFinite(Date.parse(ctx.asOf)),'context');
 const p=ctx.policy;
 ensure(!!p&&id(p.version)&&['lean_bootstrap','expanded_coverage'].includes(p.mode)&&
  Number.isInteger(p.effortBudget)&&p.effortBudget>=0&&p.effortBudget<=100000&&
  Number.isInteger(p.minimumCredibleCandidateCount)&&p.minimumCredibleCandidateCount>=1&&
  p.minimumCredibleCandidateCount<=50&&Number.isInteger(p.auditSuspendedMaxPerWave)&&
  p.auditSuspendedMaxPerWave>=0&&p.auditSuspendedMaxPerWave<=10&&
  Number.isInteger(p.auditEveryNWaves)&&p.auditEveryNWaves>=1&&p.auditEveryNWaves<=100&&
  Number.isInteger(p.reservedTailActionPercent)&&
  p.reservedTailActionPercent>=0&&p.reservedTailActionPercent<=40,'policy');
 ensure(!!p.unitCost&&Object.values(p.unitCost).length===4&&
  Object.values(p.unitCost).every(v=>Number.isInteger(v)&&v>=1&&v<=10000),'cost');
 ensure(ctx.population.categoryId===ctx.categoryId&&ctx.population.market===ctx.market&&
  Array.isArray(all)&&all.length<=5000&&new Set(all.map(x=>x.product?.id)).size===all.length,'population');
 ensure(Number.isInteger(ctx.waveOrdinal)&&ctx.waveOrdinal>=0&&ctx.waveOrdinal<=100000000&&
  ['normal','review_suspended_due_to_shortage'].includes(ctx.recoveryMode)&&
  Array.isArray(ctx.explicitUserNeedProductIds)&&Array.isArray(ctx.changedSourceRevisionProductIds)&&
  ctx.explicitUserNeedProductIds.length<=5000&&ctx.changedSourceRevisionProductIds.length<=5000&&
  [ctx.explicitUserNeedProductIds,ctx.changedSourceRevisionProductIds].every(a=>
   a.every(x=>id(x)&&all.some(p=>p.product.id===x))&&new Set(a).size===a.length),'reopen');
 for(const c of all){
  ensure(!!c&&['unseen','cheap_screened','deep_reviewed','suspended'].includes(c.researchState)&&
   typeof c.reviewedHighPotential==='boolean'&&
   (c.suspendedUnderScope===null||id(c.suspendedUnderScope))&&
   (c.researchState==='suspended')===(c.suspendedUnderScope!==null)&&
   Array.isArray(c.signals)&&c.signals.length<=80,'candidate');
  for(const s of c.signals){
   ensure(!!s&&kinds.has(s.kind)&&id(s.originalSourceId)&&id(s.publisherId)&&
    /^[0-9a-f]{64}$/.test(s.sourceRevisionHash)&&s.productId===c.product.id&&
    s.market===ctx.market&&typeof s.reviewedOriginalMethod==='boolean'&&
    typeof s.reviewedForExactVariantAndMarket==='boolean','signal');
   if(['reviewed_original_test_problem','reviewed_original_test_strength'].includes(s.kind))
    ensure(s.reviewedOriginalMethod&&s.reviewedForExactVariantAndMarket,'original_attestation');
   if(['reviewed_hard_need_mismatch','verified_safety_alert'].includes(s.kind))
    ensure(s.reviewedForExactVariantAndMarket,'scoped_attestation');
  }
 }
}
function distinctSignals(c:CandidateResearch243):ResearchSignal243[]{
 // Original-source identity collapses syndication or mirrored reviews.
 const m=new Map<string,ResearchSignal243>();
 for(const s of c.signals){
  const k=s.kind+'|'+s.originalSourceId;
  const previous=m.get(k);
  if(previous&&previous.sourceRevisionHash!==s.sourceRevisionHash)
   throw Error('phase243_unresolved_source_revision_conflict');
  m.set(k,s);
 }
 return [...m.values()];
}
function baselinePriority(bucket:string):number{return bucket==='urgent_for_need'?90:bucket==='high_baseline'?55:bucket==='standard'?25:0;}
const tailPriority=(c:CandidateResearch243):boolean=>c.product.editorialAppearances.filter(e=>
 e.independentPublisherAttested&&e.type==='professionally_tested_shortlist').length===0;

/** Deterministic plan over a frozen candidate + signal snapshot. No network or evidence promotion. */
export function planBudgetedCategoryWave243(ctx:WaveContext243,all:readonly CandidateResearch243[]):ResearchWave243 {
 checkedInputs(ctx,all);
 // Reuse Phase80's already established editorial/candidate priorities, keeping its deduping rules.
 const old=planProductPopulation({...ctx.population,enrichmentBudget:0},all.map(x=>x.product));
 const byId=new Map(old.candidates.map(x=>[x.productId,x]));
 const user=new Set(ctx.explicitUserNeedProductIds),changed=new Set(ctx.changedSourceRevisionProductIds);
 const reviewedStrong=all.filter(c=>c.researchState==='deep_reviewed'&&c.reviewedHighPotential&&
  distinctSignals(c).some(s=>s.kind==='reviewed_original_test_strength')).length;
 const shortage=reviewedStrong<ctx.policy.minimumCredibleCandidateCount;
 ensure(ctx.recoveryMode!=='review_suspended_due_to_shortage'||shortage,'recovery_requires_shortage');
 // The audit is deterministic, small, charged to the same effort budget, and
 // cycles through suspended records instead of never looking at the long tail.
 // A review finding a missed good product is recorded separately from weak leads.
 const auditable=all.filter(c=>c.researchState==='suspended'&&!c.product.verifiedDiscontinued&&
  !distinctSignals(c).some(s=>s.kind==='verified_safety_alert'||s.kind==='reviewed_hard_need_mismatch'));
 const auditScheduled=ctx.recoveryMode==='normal'&&ctx.waveOrdinal>0&&
  ctx.waveOrdinal%ctx.policy.auditEveryNWaves===0?
   new Set(auditable.sort((x,y)=>{
    const hx=sha(`${ctx.policy.version}:${ctx.waveOrdinal}:${x.product.id}`);
    const hy=sha(`${ctx.policy.version}:${ctx.waveOrdinal}:${y.product.id}`);
    return hx.localeCompare(hy)||x.product.id.localeCompare(y.product.id);
   }).slice(0,ctx.policy.auditSuspendedMaxPerWave).map(x=>x.product.id)):
   new Set<string>();
 const records=all.map(c=>{
  const orig=distinctSignals(c),bucket=byId.get(c.product.id)!.bucket;
  const negatives=orig.filter(s=>['reviewed_original_test_problem','reviewed_hard_need_mismatch',
    'community_complaint_lead','unreviewed_negative_report','marketplace_stars_lead',
    'verified_safety_alert'].includes(s.kind));
  const trustedProblems=orig.filter(s=>s.kind==='reviewed_original_test_problem');
  const complaints=orig.filter(s=>['community_complaint_lead','unreviewed_negative_report'].includes(s.kind));
  const concernOrigins=new Set(complaints.map(s=>s.originalSourceId)).size;
  const hardMismatch=orig.some(s=>s.kind==='reviewed_hard_need_mismatch');
  const safety=orig.some(s=>s.kind==='verified_safety_alert');
  const positive=orig.some(s=>s.kind==='reviewed_original_test_strength');
  const scopeChanged=c.suspendedUnderScope!==null&&c.suspendedUnderScope!==ctx.scopeKey;
  // Safety alerts cannot be overridden by user enthusiasm or shortlist scarcity.
  // Confirmed hard-need incompatibility is scoped to that need; a changed need
  // can trigger a new review, not a presumption that the product is compatible.
  const needsRevisit=safety?changed.has(c.product.id):hardMismatch?
   changed.has(c.product.id)||scopeChanged:
   (user.has(c.product.id)||changed.has(c.product.id)||auditScheduled.has(c.product.id)||
    scopeChanged||(shortage&&ctx.recoveryMode==='review_suspended_due_to_shortage'));
  let triage:ProductTriage243['triage']='standard';let action:Action243|null=null;
  let priority=baselinePriority(bucket);const reasons:string[]=[`phase80_${bucket}`];
  if(c.product.verifiedDiscontinued){triage='verified_discontinued';reasons.push('reviewed_lifecycle_not_current');}
  else if(!c.product.officialProductIdentityConfirmed||!c.product.marketListingConfirmed){
   triage='identity_unknown';action='verify_identity';priority+=50;reasons.push('identity_or_market_unverified');
   // A reviewed original-test strength already attached to this record makes resolving its identity more valuable.
   if(positive){priority+=30;reasons.push('reviewed_original_test_positive_lead');}
  }else if(c.researchState==='deep_reviewed'){
   triage='already_deep_reviewed';reasons.push('reuse_previously_reviewed_research');
  }else if(c.researchState==='suspended'&&!needsRevisit){
   triage='temporarily_suspended';reasons.push('same_scope_suspension_still_current');
  }else if(c.researchState==='suspended'){
   action='revisit_suspended';triage='priority';priority+=auditScheduled.has(c.product.id)?120:70;
   reasons.push(auditScheduled.has(c.product.id)?'periodic_missed_good_candidate_audit':
    ctx.recoveryMode==='review_suspended_due_to_shortage'&&shortage?
     'shortage_of_independently_reviewed_promising_candidates':'reopened_on_change_or_need');
  }else if(c.researchState==='unseen'){
   action='cheap_screen';triage='standard';reasons.push('low_cost_first_pass');
   if(user.has(c.product.id)){priority+=100;reasons.push('explicit_user_need');triage='priority';}
  }else {
   action='deep_review';triage='priority';reasons.push('deep_research_candidate');
   if(safety||hardMismatch){
    // Verified safety/must-have incompatibility is scoped; no automatic global product rejection.
    triage='temporarily_suspended';action=null;
    reasons.push(safety?'scoped_safety_alert_needs_specialist_review':'scoped_hard_need_mismatch');
   }else if(trustedProblems.length>0&&!positive&&!user.has(c.product.id)&&ctx.recoveryMode==='normal'){
    triage='temporarily_suspended';action=null;
    reasons.push('reviewed_original_test_problem_pause_expensive_research');
   }else if(ctx.policy.mode==='lean_bootstrap'&&concernOrigins>=2&&!positive&&!user.has(c.product.id)&&ctx.recoveryMode==='normal'){
    triage='temporarily_suspended';action=null;
    reasons.push('two_distinct_unverified_concerns_soft_pause_only');
   }else if((concernOrigins>=1||negatives.some(s=>s.kind==='marketplace_stars_lead'))&&!positive&&!user.has(c.product.id)){
    // One weak lead lowers priority but cannot establish poor performance.
    triage='temporarily_deprioritized';priority-=35;
    reasons.push('weak_negatives_reduce_priority_not_product_quality');
   }
   if(positive){priority+=30;reasons.push('reviewed_original_test_positive_lead');}
   if(user.has(c.product.id)){priority+=100;reasons.push('specific_user_need_reopens_attention');}
  }
  if(action!==null&&c.researchState==='cheap_screened'&&ctx.recoveryMode==='review_suspended_due_to_shortage'&&shortage&&
   (trustedProblems.length>0||concernOrigins>=2)){
   reasons.push('shortage_overrides_general_screening_pause');
  }
  const decision:ProductTriage243={productId:c.product.id,baselineBucket:bucket,triage,
   reasons,distinctNegativeOrigins:new Set(negatives.map(s=>s.originalSourceId)).size,
   observedOriginalProblemCount:trustedProblems.length,proposedAction:action,
   rankingAuthorized:false,permanentExclusion:false};
  return {c,decision,action,priority,tail:tailPriority(c)};
 });
 // Reserve initial slots for non-mainstream producers when the budget can fund them.
 // Each selected action is still priced. The reserve is not a brand blacklist or fixed discovery allocation.
 const ranked=records.filter(r=>r.action!==null).sort((a,b)=>
  b.priority-a.priority||a.c.product.id.localeCompare(b.c.product.id));
 // Among equal priorities, alternate between families (round-robin in first-seen order) so one prolific
 // producer or site cannot fill a wave by tie-break alone. Priority order is never overridden.
 const possible:typeof ranked=[];
 for(let i=0;i<ranked.length;){
  let j=i;while(j<ranked.length&&ranked[j].priority===ranked[i].priority)j++;
  const byFam=new Map<string,typeof ranked>();for(const r of ranked.slice(i,j))byFam.set(r.c.product.familyId,[...(byFam.get(r.c.product.familyId)??[]),r]);
  const queues=[...byFam.values()];
  for(let k=0;possible.length<j;k++)for(const q of queues)if(q[k])possible.push(q[k]);
  i=j;
 }
 const affordableMinimum=Math.min(...Object.values(ctx.policy.unitCost));
 const maxSlots=Math.floor(ctx.policy.effortBudget/affordableMinimum);
 const reserve=maxSlots>0?Math.ceil(maxSlots*ctx.policy.reservedTailActionPercent/100):0;
 const selected:typeof possible=[];let remaining=ctx.policy.effortBudget;
 const costs=(a:Action243)=>a==='verify_identity'?ctx.policy.unitCost.identity:
  a==='cheap_screen'?ctx.policy.unitCost.cheap_screen:
  a==='deep_review'?ctx.policy.unitCost.deep_review:ctx.policy.unitCost.revisit;
 const pick=(r:typeof possible[number])=>{const cost=costs(r.action!);
  if(cost>remaining||selected.includes(r))return false;
  remaining-=cost;selected.push(r);return true;};
 const reserved=possible.filter(r=>r.tail);
 for(const r of reserved){
  if(selected.length>=reserve)break;
  pick(r);
 }
 for(const r of possible)pick(r);
 const chosen=new Map(selected.map(s=>[s.c.product.id,s]));
 const decisions=records.map(r=>({ ...r.decision,
  reasons:[...r.decision.reasons,...(r.action&&!chosen.has(r.c.product.id)?['budget_deferred_revisit_later']:[])]}));
 return {schema:'pee243.budgeted-wave.v1',scopeKey:ctx.scopeKey,categoryId:ctx.categoryId,market:ctx.market,
  policyVersion:ctx.policy.version,mode:ctx.policy.mode,
  credibleCandidateCount:reviewedStrong,shortageTriggersRevisit:shortage,
  choices:selected.map(r=>({productId:r.c.product.id,action:r.action!,effortUnits:costs(r.action!),
   reason:r.decision.reasons.join('|')})),productDecisions:decisions,
  spentEffortUnits:ctx.policy.effortBudget-remaining,remainingEffortUnits:remaining,
  tailActions:selected.filter(s=>s.tail).length,totalActions:selected.length,
  auditedSuspendedCount:selected.filter(s=>auditScheduled.has(s.c.product.id)).length,
  rankingAuthorized:false,marketCoverageCertified:false,discoveryMustContinue:true,
  limitations:['Policy effort units are abstract; latency and spend require measured execution.',
   'Untrusted reports and marketplace stars are scheduling leads, never proof of product quality.',
   'Source attestations must be authenticated outside this planner; this module does not access the web.',
   'A temporarily suspended product remains in the searchable candidate inventory.',
   'Suspended candidates undergo bounded periodic audits and second-pass recovery; no automatic quality verdicts.']};
}

export interface Snapshot243 {
 schema:'pee243.budgeted-snapshot.v1';sourceSnapshotHash:string;policyVersion:string;
 scopeKey:string;wave:ResearchWave243;recordHash:string;
 noProductVerdicts:true;
}
/** Hash-checkable decision snapshot for persistence by the calling database. Not a signed receipt. */
export function freezeWave243(wave:ResearchWave243,sourceSnapshotHash:string):Snapshot243 {
 ensure(/^[0-9a-f]{64}$/.test(sourceSnapshotHash)&&wave.schema==='pee243.budgeted-wave.v1'&&
  wave.rankingAuthorized===false&&wave.marketCoverageCertified===false,'snapshot');
 const body={schema:'pee243.budgeted-snapshot.v1' as const,sourceSnapshotHash,
  policyVersion:wave.policyVersion,scopeKey:wave.scopeKey,wave,noProductVerdicts:true as const};
 return {...body,recordHash:sha(JSON.stringify(body))};
}
export function validateSnapshot243(s:Snapshot243):boolean {
 if(!s||s.schema!=='pee243.budgeted-snapshot.v1'||
  s.wave?.schema!=='pee243.budgeted-wave.v1'||s.wave.scopeKey!==s.scopeKey||
  s.policyVersion!==s.wave.policyVersion||s.wave.rankingAuthorized!==false||
  s.wave.marketCoverageCertified!==false||s.wave.discoveryMustContinue!==true||
  s.noProductVerdicts!==true||!/^[0-9a-f]{64}$/.test(s.sourceSnapshotHash))return false;
 const {recordHash,...body}=s;
 return recordHash===sha(JSON.stringify(body));
}

/** Learning-feedback report from separately reviewed audit samples.
 * This is not a model fit, an unbiased prevalence estimate or an automatic policy rewrite.
 * Suppressed-product gold labels must be obtained independently of the scheduler.
 */
export interface AuditedOutcome243 {
 productId:string;
 reviewId:string;
 reviewedGold:'credible_high_potential'|'not_high_potential'|'inconclusive';
 /** Distinct original independent method or documented criterion was reviewed upstream. */
 originalMethodVerified:boolean;
}
export function evaluatePausedMisses243(wave:ResearchWave243,
 outcomes:readonly AuditedOutcome243[]):{
 reviewedCount:number;missedPromisingCount:number;inconclusiveCount:number;
 recommendation:'investigate_premature_suspension'|'continue_audit'|'insufficient_independent_reviews';
 automaticPolicyUpdateAuthorized:false;rankingAuthorized:false;
} {
 ensure(wave?.schema==='pee243.budgeted-wave.v1'&&wave.rankingAuthorized===false&&
  Array.isArray(outcomes)&&outcomes.length<=1000&&
  new Set(outcomes.map(x=>x.productId)).size===outcomes.length,'audit');
 const suspended=new Set(wave.productDecisions.filter(x=>x.triage==='temporarily_suspended').map(x=>x.productId));
 for(const o of outcomes){
  ensure(suspended.has(o.productId)&&id(o.reviewId)&&
   ['credible_high_potential','not_high_potential','inconclusive'].includes(o.reviewedGold)&&
   typeof o.originalMethodVerified==='boolean'&&
   (o.reviewedGold!=='credible_high_potential'||o.originalMethodVerified),'audit_receipt');
 }
 const reviewed=outcomes.filter(x=>x.originalMethodVerified&&x.reviewedGold!=='inconclusive');
 const missed=reviewed.filter(x=>x.reviewedGold==='credible_high_potential').length;
 return {reviewedCount:reviewed.length,missedPromisingCount:missed,
  inconclusiveCount:outcomes.length-reviewed.length,
  recommendation:missed?'investigate_premature_suspension':reviewed.length>0?
   'continue_audit':'insufficient_independent_reviews',
  automaticPolicyUpdateAuthorized:false,rankingAuthorized:false};
}
