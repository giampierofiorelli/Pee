import test from 'node:test';
import assert from 'node:assert/strict';
import {planBudgetedCategoryWave243,freezeWave243,validateSnapshot243,evaluatePausedMisses243,
 type CandidateResearch243,type ResearchSignal243,type WaveContext243} from '../src/phase243_budgeted_category_search.js';
import type {CandidateForPopulation} from '../src/phase80_population_portfolio.js';
const H='1'.repeat(64);
const p=(id:string,family='typical',stage:CandidateForPopulation['stage']='discovery_stub'):CandidateForPopulation=>({
 id,categoryId:'irons',market:'uk',familyId:family,stage,editorialAppearances:[],
 officialProductIdentityConfirmed:true,marketListingConfirmed:true,
 novelVerifiedTechnicalFeature:false,explicitNeedTriggered:false,
 validatedNicheFit:false,verifiedDiscontinued:false});
const a=(id:string,state:CandidateResearch243['researchState']='unseen',family='typical'):CandidateResearch243=>({
 product:p(id,family),researchState:state,signals:[],suspendedUnderScope:state==='suspended'?'irons_uk_general':null,
 reviewedHighPotential:false});
const s=(pId:string,kind:ResearchSignal243['kind'],source:string):ResearchSignal243=>({
 kind,originalSourceId:source,publisherId:'lab',sourceRevisionHash:H,
 reviewedOriginalMethod:kind==='reviewed_original_test_problem'||kind==='reviewed_original_test_strength',
 reviewedForExactVariantAndMarket:kind==='reviewed_original_test_problem'||kind==='reviewed_original_test_strength'||kind==='verified_safety_alert'||kind==='reviewed_hard_need_mismatch',
 productId:pId,market:'uk'});
const base=():WaveContext243=>({categoryId:'irons',market:'uk',scopeKey:'irons_uk_general',
 asOf:'2026-10-14T13:00:00Z',waveOrdinal:1,explicitUserNeedProductIds:[],changedSourceRevisionProductIds:[],recoveryMode:'normal',
 population:{categoryId:'irons',market:'uk',enrichmentBudget:0,independentDiscoveryPasses:0,
  discoveredNewPlausibleInRecentPasses:0,reviewedFamilyIds:['typical'],demandMode:'general_launch_seed'},
 policy:{version:'pilot_a',mode:'lean_bootstrap',effortBudget:10,
  unitCost:{identity:1,cheap_screen:1,deep_review:4,revisit:2},
  minimumCredibleCandidateCount:2,reservedTailActionPercent:20,
  auditSuspendedMaxPerWave:1,auditEveryNWaves:5}});
const run=(x:CandidateResearch243[],ctx:WaveContext243=base())=>planBudgetedCategoryWave243(ctx,x);
const d=(x:ReturnType<typeof run>,id:string)=>x.productDecisions.find(p=>p.productId===id)!;

test('cheap first-pass is budgeted and cannot complete the market',()=>{
 const r=run(Array.from({length:20},(_,i)=>a('item'+i)));
 assert.equal(r.spentEffortUnits,10);assert.equal(r.choices.length,10);
 assert.ok(r.choices.every(c=>c.action==='cheap_screen'));
 assert.equal(r.marketCoverageCertified,false);assert.equal(r.rankingAuthorized,false);
 assert.equal(r.discoveryMustContinue,true);
});
test('strong reviewed original problem pauses deep research, never rejects product',()=>{
 const x=a('weak','cheap_screened');x.signals=[s('weak','reviewed_original_test_problem','original_1')];
 const r=run([x]);assert.equal(d(r,'weak').triage,'temporarily_suspended');
 assert.equal(d(r,'weak').proposedAction,null);assert.equal(d(r,'weak').permanentExclusion,false);
});
test('a single unverified negative report only reduces priority',()=>{
 const x=a('weak','cheap_screened');x.signals=[s('weak','unreviewed_negative_report','news1')];
 const y=a('other','cheap_screened');
 const r=run([x,y]);assert.equal(d(r,'weak').triage,'temporarily_deprioritized');
 assert.deepEqual(r.choices.map(z=>z.productId),['other','weak']);
});
test('two distinct original community concerns can soft-pause in lean mode',()=>{
 const x=a('weak','cheap_screened');x.signals=[s('weak','community_complaint_lead','thread_1'),
  s('weak','community_complaint_lead','thread_2')];
 assert.equal(d(run([x]),'weak').triage,'temporarily_suspended');
 assert.equal(d(run([x],{...base(),policy:{...base().policy,mode:'expanded_coverage'}}),'weak').proposedAction,'deep_review');
});
test('syndicated duplicate original cannot fake multiple negative signals',()=>{
 const x=a('weak','cheap_screened');x.signals=[s('weak','community_complaint_lead','thread_1'),
  {...s('weak','community_complaint_lead','thread_1'),publisherId:'mirror'}];
 assert.equal(d(run([x]),'weak').distinctNegativeOrigins,1);
 assert.equal(d(run([x]),'weak').proposedAction,'deep_review');
});
test('marketplace stars can only lower research priority, never exclude',()=>{
 const x=a('stars','cheap_screened');x.signals=[s('stars','marketplace_stars_lead','commerce1')];
 assert.equal(d(run([x]),'stars').triage,'temporarily_deprioritized');
 assert.equal(d(run([x]),'stars').permanentExclusion,false);
});
test('suspensions remain suspended during first sweep even if shortlist lacks strong candidates',()=>{
 const x=a('deferred','suspended');
 const r=run([x]);assert.equal(r.credibleCandidateCount,0);
 assert.equal(d(r,'deferred').proposedAction,null);
});
test('second sweep restores suspended model when credible shortlist is inadequate',()=>{
 const x=a('deferred','suspended');const r=run([x],{...base(),recoveryMode:'review_suspended_due_to_shortage'});
 assert.equal(d(r,'deferred').proposedAction,'revisit_suspended');
 assert.equal(r.choices[0].action,'revisit_suspended');
});
test('recovery refuses to reopen after credible target count was met',()=>{
 const x=a('best','deep_reviewed');x.reviewedHighPotential=true;
 x.signals=[s('best','reviewed_original_test_strength','original_1')];
 assert.throws(()=>run([x],{...base(),policy:{...base().policy,minimumCredibleCandidateCount:1},
  recoveryMode:'review_suspended_due_to_shortage'}),/recovery_requires_shortage/);
});
test('a reviewed good candidate changes shortage status but cannot declare a winner',()=>{
 const x=a('best','deep_reviewed');x.reviewedHighPotential=true;
 x.signals=[s('best','reviewed_original_test_strength','original_1')];
 const r=run([x],{...base(),policy:{...base().policy,minimumCredibleCandidateCount:1}});
 assert.equal(r.credibleCandidateCount,1);assert.equal(r.shortageTriggersRevisit,false);
 assert.equal(d(r,'best').triage,'already_deep_reviewed');assert.equal(r.rankingAuthorized,false);
});
test('explicit user need reopens a paused product in same scope',()=>{
 const r=run([a('waiting','suspended')],{...base(),explicitUserNeedProductIds:['waiting']});
 assert.equal(d(r,'waiting').proposedAction,'revisit_suspended');
});
test('updated original source fingerprint reopens suspended item',()=>{
 const r=run([a('waiting','suspended')],{...base(),changedSourceRevisionProductIds:['waiting']});
 assert.equal(d(r,'waiting').proposedAction,'revisit_suspended');
});
test('new user scope prevents reusing a prior general-scope suspension',()=>{
 const r=run([a('waiting','suspended')],{...base(),scopeKey:'irons_uk_silk'});
 assert.equal(d(r,'waiting').proposedAction,'revisit_suspended');
});
test('reviewed safety alert pauses and retains exact variant only',()=>{
 const x=a('unsafe','cheap_screened');x.signals=[s('unsafe','verified_safety_alert','recall')];
 const y=a('other','cheap_screened');const r=run([x,y]);
 assert.equal(d(r,'unsafe').triage,'temporarily_suspended');
 assert.equal(d(r,'other').triage,'priority');
 assert.equal(d(r,'unsafe').permanentExclusion,false);
});
test('verified hard need mismatch is not generalized to another user scope',()=>{
 const x=a('wrong','cheap_screened');x.signals=[s('wrong','reviewed_hard_need_mismatch','test')];
 assert.equal(d(run([x]),'wrong').triage,'temporarily_suspended');
 assert.equal(d(run([{...x,signals:[],researchState:'suspended',suspendedUnderScope:'irons_uk_general'}],
  {...base(),scopeKey:'irons_uk_other'}),'wrong').proposedAction,'revisit_suspended');
});
test('explicit niche request overrides weak reports during first-pass screen',()=>{
 const x=a('requested','cheap_screened');x.signals=[s('requested','community_complaint_lead','a'),s('requested','community_complaint_lead','b')];
 const r=run([x],{...base(),explicitUserNeedProductIds:['requested']});
 assert.equal(d(r,'requested').proposedAction,'deep_review');
});
test('untested manufacturer feature does not become verified strength',()=>{
 const x=a('marketing','deep_reviewed');x.reviewedHighPotential=true;
 x.signals=[s('marketing','manufacturer_feature_claim','pr1')];
 assert.equal(run([x]).credibleCandidateCount,0);
});
test('unconfirmed product identity uses low-cost identity first, not deep review',()=>{
 const x=a('unknown','cheap_screened');x.product.officialProductIdentityConfirmed=false;
 assert.equal(d(run([x]),'unknown').proposedAction,'verify_identity');
});
test('reviewed discontinued item stays searchable as stub without scheduling work',()=>{
 const x=a('obsolete');x.product.verifiedDiscontinued=true;
 assert.equal(d(run([x]),'obsolete').triage,'verified_discontinued');
 assert.equal(d(run([x]),'obsolete').permanentExclusion,false);
});
test('spend never exceeds fixed budget, with heterogeneous action costs',()=>{
 const input=[a('x','cheap_screened'),a('y','unseen'),a('z','suspended')];
 const r=run(input,{...base(),policy:{...base().policy,effortBudget:5}});
 assert.ok(r.spentEffortUnits<=5);assert.equal(r.spentEffortUnits+r.remainingEffortUnits,5);
 assert.deepEqual(new Set(r.choices.map(x=>x.action)),new Set(['cheap_screen','deep_review']));
});
test('non-mainstream discovery candidates receive bounded reserved slot',()=>{
 const high=a('big','cheap_screened'),tail=a('small','unseen');
 high.product.editorialAppearances=[{publisherId:'lab',originalListId:'review_a',
  type:'professionally_tested_shortlist',prominence:'leading',independentPublisherAttested:true}];
 const r=run([high,tail],{...base(),policy:{...base().policy,effortBudget:4,reservedTailActionPercent:20}});
 assert.equal(r.choices[0].productId,'small');assert.equal(r.tailActions>=1,true);
});
test('deterministic under input-order reordering and repeated identical snapshots',()=>{
 const xs=[a('aa','cheap_screened'),a('bb'),a('cc','suspended')];
 const one=run(xs),two=run([...xs].reverse());
 assert.deepEqual(one.choices,two.choices);
 assert.deepEqual(run(xs).choices,one.choices);
});
test('reject forged reviewed method, market mismatch and invalid bounds',()=>{
 const x=a('untrusted','cheap_screened');x.signals=[s('untrusted','reviewed_original_test_problem','source')];
 x.signals=[{...x.signals[0],reviewedOriginalMethod:false}];
 assert.throws(()=>run([x]),/original_attestation/);
 x.signals=[{...s('untrusted','unreviewed_negative_report','source'),market:'us'}];
 assert.throws(()=>run([x]),/signal/);
 assert.throws(()=>run([a('c')],{...base(),policy:{...base().policy,effortBudget:-1}}),/policy/);
});
test('reject a single original with incompatible versions instead of double counting',()=>{
 const x=a('a');x.signals=[s('a','community_complaint_lead','thread'),
  {...s('a','community_complaint_lead','thread'),sourceRevisionHash:'2'.repeat(64)}];
 assert.throws(()=>run([x]),/unresolved_source_revision_conflict/);
});
test('snapshot detects tampering but is not a cryptographic signature',()=>{
 const r=run([a('a')]);const snap=freezeWave243(r,H);
 assert.equal(validateSnapshot243(snap),true);
 assert.equal(validateSnapshot243({...snap,scopeKey:'forged'}),false);
 assert.equal(validateSnapshot243({...snap,wave:{...snap.wave,rankingAuthorized:true as false}}),false);
});

test('periodic audit of suspended candidate is budgeted and rotates',()=>{
 const xs=[a('a','suspended'),a('b','suspended')];
 const one=run(xs,{...base(),waveOrdinal:5}), two=run(xs,{...base(),waveOrdinal:4});
 assert.equal(one.auditedSuspendedCount,1);assert.equal(one.choices[0].action,'revisit_suspended');
 assert.equal(two.auditedSuspendedCount,0);assert.equal(two.choices.length,0);
});
test('audits never exceed effort budget',()=>{
 const xs=[a('a','suspended'),a('b','suspended')];
 const r=run(xs,{...base(),waveOrdinal:5,policy:{...base().policy,effortBudget:1}});
 assert.equal(r.choices.length,0);assert.equal(r.auditedSuspendedCount,0);
});
test('a reviewed good product missed by triage is observable, not silently ignored',()=>{
 const x=a('missed','cheap_screened');x.signals=[s('missed','reviewed_original_test_problem','old_test')];
 const w=run([x]);const audit=evaluatePausedMisses243(w,[{productId:'missed',reviewId:'independent_audit',
  reviewedGold:'credible_high_potential',originalMethodVerified:true}]);
 assert.equal(audit.missedPromisingCount,1);
 assert.equal(audit.recommendation,'investigate_premature_suspension');
 assert.equal(audit.automaticPolicyUpdateAuthorized,false);
});
test('audit cannot forge gold positives with unreviewed method',()=>{
 const x=a('missed','cheap_screened');x.signals=[s('missed','reviewed_original_test_problem','old_test')];
 const w=run([x]);
 assert.throws(()=>evaluatePausedMisses243(w,[{productId:'missed',reviewId:'fake',
  reviewedGold:'credible_high_potential',originalMethodVerified:false}]),/audit_receipt/);
});

test('safety alert cannot be overridden by market shortage, user request or audit wave',()=>{
 const x=a('danger','suspended');x.signals=[s('danger','verified_safety_alert','official_recall')];
 const r=run([x],{...base(),recoveryMode:'review_suspended_due_to_shortage',
  explicitUserNeedProductIds:['danger'],waveOrdinal:5});
 assert.equal(d(r,'danger').proposedAction,null);
 assert.equal(r.auditedSuspendedCount,0);
});
test('confirmed need mismatch cannot be overridden in same scope by a shortage',()=>{
 const x=a('wrong','suspended');x.signals=[s('wrong','reviewed_hard_need_mismatch','scoped_method')];
 assert.equal(d(run([x],{...base(),recoveryMode:'review_suspended_due_to_shortage'}),'wrong').proposedAction,null);
 assert.equal(d(run([x],{...base(),scopeKey:'irons_uk_other'}),'wrong').proposedAction,'revisit_suspended');
});
