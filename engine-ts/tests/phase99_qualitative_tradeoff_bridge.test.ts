import test from 'node:test';
import assert from 'node:assert/strict';
import {compareReviewedQualitativeEvidence,type Phase99PerformanceMapping,
 type Phase99QualitativeBundle} from '../src/phase99_qualitative_tradeoff_bridge.js';
import {type ReviewedPreferenceModel,type HardRequirement} from '../src/phase98_tradeoff_value_model.js';
import {type QuarantinedQualitativeFinding,type ReviewEvidenceApproval}
 from '../src/phase96_qualitative_review_evidence.js';

// Entire suite uses synthetic observations and assumed elicited preferences.
// No real reviewers, live review publishers, observed user preferences or QA labels.
const sha='a'.repeat(64), span='b'.repeat(64);
const criteria=['comfort','sound','noise_control'] as const;
const models=['headphone_a','headphone_b'] as const;
const levels=[
 {id:'inadequate',value:0,description:'Reviewed zero reference for this criterion'},
 {id:'compromised',value:25,description:'Reviewed meaningfully compromised functional outcome'},
 {id:'adequate',value:70,description:'Reviewed adequate functional outcome in context'},
 {id:'excellent',value:100,description:'Reviewed excellent outcome in the declared context'}
];
const preference=(ref='confirmed_user_profile_primary',weights=[.2,.4,.4]):ReviewedPreferenceModel=>({
 profileReference:ref,userPreferencesConfirmed:true,
 independentlyReviewedAdditiveAssumptions:true,
 additiveReviewReference:'independent_additive_assumptions_receipt',
 criteria:criteria.map((criterionId,i)=>({criterionId,
 swingWeight:weights[i],levels,
 weightElicitationReceipt:'independent_swing_comparison_receipt',
 valueScaleElicitationReceipt:'criterion_anchored_value_levels_review'}))
});
const source=(model:string,criterion:string)=>`https://original-tests.example.org/reviews/${model}/${criterion}`;
const valueFor=(v:string,c:string)=>v==='headphone_a'?(c==='comfort'?'compromised':'excellent'):
 (c==='comfort'?'excellent':'adequate');
function makeInput(){
 const bundles:Phase99QualitativeBundle[]=models.map(variantId=>{
  const needs=criteria.map(criterionId=>({criterionId,importance:'important' as const,
   context:{usage:'commute'},avoidAdverseFinding:false}));
  const findings=criteria.map(criterionId=>{
   const level=valueFor(variantId,criterionId);
   const findingId=`finding_${variantId}_${criterionId}`;
   return {findingId,exactVariantId:variantId,criterionId,
    proposition:level==='compromised'?'The tester observed pressure during extended listening.':
      `Tester observed ${level} performance in the described task.`,
    polarity:level==='compromised'?'unfavourable' as const:'favourable' as const,
    basis:'hands_on_observation' as const,context:{usage:'commute'},
    methodologyReference:'documented_hands_on_testing_method',qualification:null,
    originalTestId:`test_${variantId}_${criterionId}`,
    sourceUrl:source(variantId,criterionId),sourceSha256:sha,sourceSpanSha256:span,
    sourceSpanBytes:80,reviewStatus:'quarantined_for_semantic_method_and_rights_review' as const,
    evidenceKind:'original_professional_qualitative_observation' as const,
    quantifiedMeasurement:false as const,weight:null,numericScore:null};
  });
  const approvals:ReviewEvidenceApproval[]=findings.map(f=>({
   findingId:f.findingId,reviewerId:'source_reviewer_one',
   reviewReference:'source_semantics_review_2026',validatedSourceSha256:sha,
   reviewedAt:'2026-10-09T11:00:00Z',semanticFaithfulness:'confirmed',
   methodAssessment:'documented',adequacyAssessment:'documented',
   criterionImplication:f.polarity==='unfavourable'?'concerns':'supports'
  }));
  return {variantId,needs,findings,approvals};
 });
 const mappings:Phase99PerformanceMapping[]=bundles.flatMap(b=>b.findings.map(f=>({
  variantId:b.variantId,criterionId:f.criterionId,
  levelId:valueFor(b.variantId,f.criterionId),supportingFindingIds:[f.findingId],
  performanceAssessorId:'different_performance_reviewer',
  performanceReviewReference:'independently_mapped_observation_to_scale',
  performanceReviewDate:'2026-10-10T11:00:00Z',
  reconciliation:'consistent_evidence',
  originalTestLineageReviewed:true,independentlyReviewedContext:true
 })));
 return {preferenceModel:preference(),variantIds:models,qualitativeBundles:bundles,
   performanceMappings:mappings,hardRequirements:[] as HardRequirement[]};
}
const run=(change:(x:ReturnType<typeof makeInput>)=>void=()=>{})=>{
 const x=makeInput();change(x);return compareReviewedQualitativeEvidence(x);
};
const addClaim=(x:ReturnType<typeof makeInput>,variantId:string,criterionId:string,polarity:'favourable'|'unfavourable')=>{
 const bundle=x.qualitativeBundles.find(b=>b.variantId===variantId)!;
 const original=bundle.findings.find(f=>f.criterionId===criterionId)!;
 const addition:QuarantinedQualitativeFinding={...original,findingId:`extra_${variantId}_${criterionId}_${polarity}`,
  proposition:'A second independent professional finding describes the relevant tested outcome.',
  originalTestId:`other_test_${variantId}_${criterionId}`,polarity,
  sourceUrl:`https://other-original-tests.example.org/reviews/${variantId}/${criterionId}`};
 (bundle.findings as QuarantinedQualitativeFinding[]).push(addition);
 (bundle.approvals as ReviewEvidenceApproval[]).push({
   ...bundle.approvals.find(a=>a.findingId===original.findingId)!,findingId:addition.findingId,
   criterionImplication:polarity==='favourable'?'supports':'concerns'});
 return addition;
};

test('qualitative drawback is a compensable criterion contribution, not a veto',()=>{
 const r=run();
 assert.equal(r.comparisonAssessment,'conditional_under_one_elicited_profile');
 assert.deepEqual(r.conditionalOrder,['headphone_a','headphone_b']);
 assert.equal(r.primary.variants[0].exactTotalValue,85);
 assert.equal(r.primary.variants[1].exactTotalValue,76);
 assert.equal(r.primary.variants[0].eligibility,'tradeoff_eligible');
 assert.equal(r.criterionDifferences[0].interpretation,'second_advantage');
 assert.equal(r.criterionDifferences[1].interpretation,'first_advantage');
 assert.equal(r.publicationReady,false);
 assert.equal(r.rankingEligible,false);
});
test('no sentiment score is generated, levels are supplied by distinct adjudicator',()=>{
 const r=run();
 assert.equal(r.qualitativeTrace.length,6);
 assert.deepEqual(r.qualitativeTrace[0].originalTestIds,['test_headphone_a_comfort']);
 assert.match(r.qualitativeTrace[0].propositions[0],/pressure/);
 assert.equal(r.primary.variants[0].contributions[0].weightedValueBounds[0],5);
});
test('reviewer cannot certify own performance mapping',()=>{
 assert.throws(()=>run(x=>{x.performanceMappings[0].performanceAssessorId='source_reviewer_one';}),
  /unapproved_or_context_mismatched/);
});
test('missing or uncertain semantic-method approval blocks numeric mapping',()=>{
 assert.throws(()=>run(x=>{x.qualitativeBundles[0].approvals[0].semanticFaithfulness='uncertain';}),
  /unapproved_or_context_mismatched/);
 assert.throws(()=>run(x=>{x.qualitativeBundles[0].approvals[0].methodAssessment='concern';}),
  /unapproved_or_context_mismatched/);
});
test('product and original finding cannot be misattributed or reused',()=>{
 assert.throws(()=>run(x=>{x.performanceMappings[0].supportingFindingIds=[x.performanceMappings[3].supportingFindingIds[0]];}),
 /unattributed_or_reused/);
 assert.throws(()=>run(x=>{x.performanceMappings.push({...x.performanceMappings[0]});}),
 /invalid_or_duplicate/);
});
test('performance assignment uses exact confirmed usage context',()=>{
 assert.throws(()=>run(x=>{x.qualitativeBundles[0].findings[0].context.usage='office';}),
 /unapproved_or_context_mismatched/);
});
test('conflicting original tests are not reconciled by average or by frequency',()=>{
 assert.throws(()=>run(x=>{
   const f=addClaim(x,'headphone_a','comfort','favourable');
   x.performanceMappings[0].supportingFindingIds=[...x.performanceMappings[0].supportingFindingIds,f.findingId];
 }),/unreconciled_opposing_findings/);
});
test('a separate documented assessment may reconcile conflicting test claims',()=>{
 const r=run(x=>{
  const f=addClaim(x,'headphone_a','comfort','favourable');
  x.performanceMappings[0].supportingFindingIds=[...x.performanceMappings[0].supportingFindingIds,f.findingId];
  x.performanceMappings[0].reconciliation='contradictions_adjudicated';
  x.performanceMappings[0].reconciliationRationale='Two independent original tests disagree on duration; assessed limitations and applicability by a distinct reviewer.';
 });
 assert.equal(r.qualitativeTrace[0].originalTestIds.length,2);
 assert.equal(r.primary.variants[0].contributions[0].weightedValueBounds[0],5);
});
test('two passages from one test do not produce a second criterion vote',()=>{
 const r=run(x=>{
  const bundle=x.qualitativeBundles[0];const original=bundle.findings[0];
  const f={...original,findingId:'second_passage_same_test'};
  (bundle.findings as QuarantinedQualitativeFinding[]).push(f);
  (bundle.approvals as ReviewEvidenceApproval[]).push({...bundle.approvals[0],findingId:f.findingId});
  x.performanceMappings[0].supportingFindingIds=[...x.performanceMappings[0].supportingFindingIds,f.findingId];
 });
 assert.deepEqual(r.qualitativeTrace[0].originalTestIds,['test_headphone_a_comfort']);
 assert.equal(r.primary.variants[0].exactTotalValue,85);
});
test('unused relevant negative evidence holds a winner rather than disappearing',()=>{
 const r=run(x=>{addClaim(x,'headphone_a','comfort','unfavourable');});
 assert.equal(r.comparisonAssessment,'missing_or_unadjudicated_evidence');
 assert.equal(r.conditionalOrder,null);
 assert.equal(r.pendingEvidence[0].criterionId,'comfort');
});
test('no arbitrary preference scenario: checked alternative may reverse order',()=>{
 const r=compareReviewedQualitativeEvidence({...makeInput(),
  sensitivityPreferenceModels:[preference('alternative_confirmed_profile_reviewed',[.7,.15,.15])]});
 assert.equal(r.comparisonAssessment,'scenario_sensitive');
 assert.equal(r.conditionalOrder,null);
 assert.deepEqual(r.scenarioResults[1].conditionalOrder,['headphone_b','headphone_a']);
});
test('reviewed sensitivity scenario supporting same winner yields conditional robustness across those scenarios',()=>{
 const r=compareReviewedQualitativeEvidence({...makeInput(),
  sensitivityPreferenceModels:[preference('second_confirmed_profile_reviewed',[.25,.375,.375])]});
 assert.equal(r.comparisonAssessment,'robust_across_reviewed_scenarios');
 assert.deepEqual(r.conditionalOrder,['headphone_a','headphone_b']);
});
test('explicit hard veto needs linked independent test and is never overwritten by strengths',()=>{
 const x=makeInput();
 x.hardRequirements=[{criterionId:'comfort',confirmedHardRequirementReference:'signed_user_nonnegotiable_long_wear_need',
  variantAssessments:[{variantId:'headphone_a',result:'demonstrated_failure',
   originalTestId:'test_headphone_a_comfort',sourceUrl:source('headphone_a','comfort'),methodReviewed:true},
   {variantId:'headphone_b',result:'demonstrated_pass',
   originalTestId:'test_headphone_b_comfort',sourceUrl:source('headphone_b','comfort'),methodReviewed:true}]}];
 const r=compareReviewedQualitativeEvidence(x);
 assert.equal(r.primary.variants[0].eligibility,'provisionally_excluded');
 assert.equal(r.conditionalOrder,null);
 assert.equal(r.comparisonAssessment,'not_comparable');
});
test('unsupported hard veto cannot be smuggled through a prose assertion',()=>{
 assert.throws(()=>run(x=>{x.hardRequirements=[{criterionId:'comfort',
  confirmedHardRequirementReference:'user_claimed_confirmed_hard_need',
  variantAssessments:[{variantId:'headphone_a',result:'demonstrated_failure',
   originalTestId:'not_matching_original_test',sourceUrl:source('headphone_a','comfort'),methodReviewed:true},
  {variantId:'headphone_b',result:'unresolved'}]}];}),/unlinked_hard_evidence/);
});
test('missing criterion is not a low score, and wide bounds suppress overconfident winner',()=>{
 const r=run(x=>{x.performanceMappings.splice(1,1);});
 assert.equal(r.primary.variants[0].missingCriteria.includes('sound'),true);
 assert.equal(r.conditionalOrder,null);
});
test('same original passage cannot inflate distinct criteria',()=>{
 assert.throws(()=>run(x=>{
  x.qualitativeBundles[0].findings[1].originalTestId=x.qualitativeBundles[0].findings[0].originalTestId;
 }),/same_original_passage_counted_as_multiple_criteria/);
});
test('rejected original source finding cannot drive ranking',()=>{
 assert.throws(()=>run(x=>{x.qualitativeBundles[0].approvals[0].semanticFaithfulness='rejected';}),
  /unapproved_or_context_mismatched/);
});
test('manufacturer, review stars and affiliate variables are absent from the accepted bridge',()=>{
 const r=run();assert.equal(r.primary.publicationReady,false);
 assert.equal(r.primary.rankingEligible,false);
 assert.equal(r.qualitativeTrace.every(t=>t.sourceUrls.every(u=>u.startsWith('https://original-tests.example.org/'))),true);
});
test('invalid comparison profile or re-used scenario identifier fails safely',()=>{
 assert.throws(()=>compareReviewedQualitativeEvidence({...makeInput(),
  sensitivityPreferenceModels:[preference()]}),/noncomparable_or_reused/);
});
