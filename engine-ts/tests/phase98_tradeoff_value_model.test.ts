import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCompensatoryTradeoffs,type ReviewedPreferenceModel,
 type IndependentPerformanceAssessment,type HardRequirement} from '../src/phase98_tradeoff_value_model.js';

// ALL scenario values and preference judgments are entirely illustrative inventions.
const crit=(criterionId:string,weight:number)=>({criterionId,swingWeight:weight,
 weightElicitationReceipt:'independent_swing_review_2026',
 valueScaleElicitationReceipt:'reviewed_category_specific_value_scale_2026',
 levels:[{id:'inadequate',value:0,description:'Documented low-end reference outcome'},
  {id:'compromised',value:25,description:'Meaningful drawback but still usable for optional tasks'},
  {id:'adequate',value:70,description:'Ordinary level for this specified use context'},
  {id:'excellent',value:100,description:'Documented high-end reference outcome'}]});
const preferences:ReviewedPreferenceModel={profileReference:'user_profile_confirmed_decision_reference',
 userPreferencesConfirmed:true,independentlyReviewedAdditiveAssumptions:true,
 additiveReviewReference:'researcher_assumed_independence_pending_empirical_validation',
 criteria:[crit('comfort',.2),crit('sound',.4),crit('noise_control',.4)]};
const observed=(variantId:string,criterionId:string,levelId:string,other:Partial<IndependentPerformanceAssessment>={}):IndependentPerformanceAssessment=>({
 variantId,criterionId,levelId,
 evidenceOrigin:'original_professional_qualitative_test',originalTestId:`test_${variantId}_${criterionId}`,
 sourceUrl:`https://original-lab.example.org/reviews/${variantId}`,
 performanceAdjudicationReference:'independent_method_and_semantic_review',
 exactModelConfirmed:true,contextConfirmed:true,methodReviewed:true,...other});
const all=[
 observed('headphone_a','comfort','compromised'),
 observed('headphone_a','sound','excellent'),
 observed('headphone_a','noise_control','excellent'),
 observed('headphone_b','comfort','excellent'),
 observed('headphone_b','sound','adequate'),
 observed('headphone_b','noise_control','adequate'),
];
const run=(other:Partial<Parameters<typeof evaluateCompensatoryTradeoffs>[0]>={})=>
 evaluateCompensatoryTradeoffs({preferenceModel:preferences,variantIds:['headphone_a','headphone_b'],performance:all,hardRequirements:[],...other});
const hard=(aResult:HardRequirement['variantAssessments'][number]['result']):HardRequirement=>({
 criterionId:'comfort',confirmedHardRequirementReference:'signed_user_explicit_nondelegable_wear_need',
 variantAssessments:[
  {variantId:'headphone_a',result:aResult,sourceUrl:'https://original-lab.example.org/reviews/headphone_a',originalTestId:'comfort_test_a',methodReviewed:true},
  {variantId:'headphone_b',result:'demonstrated_pass',sourceUrl:'https://original-lab.example.org/reviews/headphone_b',originalTestId:'comfort_test_b',methodReviewed:true}
 ]});

test('a meaningful comfort drawback contributes negatively without automatically excluding the product',()=>{
 const r=run();
 assert.equal(r.variants[0].eligibility,'tradeoff_eligible');
 assert.equal(r.variants[0].exactTotalValue,85);
 assert.equal(r.variants[1].exactTotalValue,76);
 assert.deepEqual(r.conditionalOrder,['headphone_a','headphone_b']);
 assert.equal(r.variants[0].contributions[0].weightedValueBounds[0],5);
 assert.equal(r.publicationReady,false);assert.equal(r.rankingEligible,false);
});
test('an explicitly confirmed failed hard need vetoes, even though other components score higher',()=>{
 const r=run({hardRequirements:[hard('demonstrated_failure')]});
 assert.equal(r.variants[0].eligibility,'provisionally_excluded');
 assert.equal(r.variants[0].exactTotalValue,null);
 assert.equal(r.rankStatus,'no_eligible_pair');
 assert.deepEqual(r.variants[1].vetoReasons,[]);
});
test('hard need unresolved holds a decision instead of treating missing evidence as failure',()=>{
 const r=run({hardRequirements:[hard('unresolved')]});
 assert.equal(r.variants[0].eligibility,'hold_for_hard_requirement');
 assert.equal(r.variants[0].vetoReasons.length,0);
 assert.equal(r.conditionalOrder,null);
});
test('weak nonessential criterion does not become veto from Phase97 essential flags',()=>{
 const r=run();assert.equal(r.variants[0].vetoReasons.length,0);
});
test('a deliberately unmeasured criterion is unknown, not a zero value',()=>{
 const subset=all.filter(a=>!(a.variantId==='headphone_a'&&a.criterionId==='sound'));
 const r=run({performance:subset});
 assert.equal(r.variants[0].exactTotalValue,null);
 assert.equal(r.variants[0].totalValueBounds?.[0],45);
 assert.equal(r.variants[0].totalValueBounds?.[1],85);
 assert.equal(r.variants[0].missingCriteria[0],'sound');
 assert.equal(r.rankStatus,'unresolved_tradeoff');
});
test('source-informational uncertainty uses model bounds, not a fabricated mean or probability',()=>{
 const p=all.map(x=>x.variantId==='headphone_a'&&x.criterionId==='comfort'?
  {...x,levelId:'adequate',plausibleLevelIds:['compromised','adequate'] as const}:x);
 const r=run({performance:p});
 assert.deepEqual(r.variants[0].totalValueBounds,[85,94]);
 assert.equal(r.variants[0].exactTotalValue,null);
 assert.deepEqual(r.conditionalOrder,['headphone_a','headphone_b']);
});
test('a qualitative negative observation cannot be converted to numerical preference by sentiment alone',()=>{
 assert.throws(()=>run({performance:[{...all[0],levelId:'negative'},...all.slice(1)]}),/unknown_performance_level/);
});
test('reject missing method verification, variant identity or unsupported manufacturer figures',()=>{
 assert.throws(()=>run({performance:[{...all[0],methodReviewed:false as true},...all.slice(1)]}),/unverified_or_misassigned/);
 assert.throws(()=>run({performance:[{...all[0],variantId:'headphone_c'},...all.slice(1)]}),/unverified_or_misassigned/);
 assert.throws(()=>run({performance:[{...all[0],evidenceOrigin:'manufacturer_declared' as never},...all.slice(1)]}),/unverified_or_misassigned/);
});
test('duplicated findings about one criterion do not multiply its weight',()=>{
 assert.throws(()=>run({performance:[...all,all[0]]}),/competing_source_assessments/);
});
test('hard veto requires explicit reference and independent corroborated test',()=>{
 assert.throws(()=>run({hardRequirements:[{...hard('demonstrated_failure'),confirmedHardRequirementReference:'no'}]}),/unverified_hard_requirement/);
 const h=hard('demonstrated_failure');
 const invalid={...h,variantAssessments:h.variantAssessments.map(a=>a.variantId==='headphone_a'?{...a,methodReviewed:undefined}:a)};
 assert.throws(()=>run({hardRequirements:[invalid as HardRequirement]}),/unverified_hard_requirement/);
});
test('reject made-up weights, unanchored utility numbers and missing additive assumption review',()=>{
 assert.throws(()=>run({preferenceModel:{...preferences,criteria:preferences.criteria.map((c,i)=>({...c,swingWeight:i===0?.5:c.swingWeight}))}}),/swing_weights_not_normalized/);
 assert.throws(()=>run({preferenceModel:{...preferences,criteria:preferences.criteria.map((c,i)=>i===0?{...c,levels:[{...c.levels[0],value:4},...c.levels.slice(1)]}:c)}}),/unanchored_criterion_scale/);
 assert.throws(()=>run({preferenceModel:{...preferences,independentlyReviewedAdditiveAssumptions:false as true}}),/invalid_research_preference_model/);
});
test('sources cannot cross product identities when comparing',()=>{
 assert.throws(()=>run({variantIds:['headphone_a','headphone_x']}),/unverified_or_misassigned_performance/);
});
test('near or overlapping value bounds do not fabricate a confident winner',()=>{
 const p=all.map(x=>x.variantId==='headphone_a'&&x.criterionId==='sound'?{...x,plausibleLevelIds:['inadequate','excellent'] as const}:x);
 const r=run({performance:p});assert.equal(r.rankStatus,'unresolved_tradeoff');assert.equal(r.conditionalOrder,null);
});
