import test from 'node:test';
import assert from 'node:assert/strict';
import {assessAdaptiveSwingPreferences,type OrdinalSwingJudgement} from '../src/phase100_adaptive_preference_envelope.js';
import {compareReviewedQualitativeEvidence,type Phase99QualitativeBundle,
  type Phase99PerformanceMapping} from '../src/phase99_qualitative_tradeoff_bridge.js';
import type {ReviewedPreferenceModel,HardRequirement} from '../src/phase98_tradeoff_value_model.js';
import type {QuarantinedQualitativeFinding,ReviewEvidenceApproval} from '../src/phase96_qualitative_review_evidence.js';

const variants=['headphone_a','headphone_b'] as const;
const criteria=['comfort','sound','noise_control'] as const;
const levels=[{id:'low',value:0,description:'Unsuitable for the intended task'},
  {id:'compromised',value:25,description:'Documented material limitation'},
  {id:'adequate',value:70,description:'Adequate independent outcome'},
  {id:'excellent',value:100,description:'Excellent independent outcome'}];
const prefs=():ReviewedPreferenceModel=>({profileReference:'confirmed_research_values_2026',
  userPreferencesConfirmed:true,independentlyReviewedAdditiveAssumptions:true,
  additiveReviewReference:'independent_additive_review_reference',
  criteria:criteria.map((criterionId,i)=>({criterionId,swingWeight:[.2,.4,.4][i],levels,
    weightElicitationReceipt:'reviewed_swing_weight_anchor_receipt',
    valueScaleElicitationReceipt:'reviewed_performance_value_scale'}))});
const assessed=(v:string,c:string)=>v==='headphone_a'?(c==='comfort'?'compromised':'excellent'):
  (c==='comfort'?'excellent':'adequate');
function fixture(){
  const bundles:Phase99QualitativeBundle[]=variants.map(variantId=>{
    const needs=criteria.map(criterionId=>({criterionId,importance:'important' as const,
      context:{usage:'commute'},avoidAdverseFinding:false}));
    const findings:QuarantinedQualitativeFinding[]=criteria.map(criterionId=>{
      const level=assessed(variantId,criterionId);
      return {findingId:`finding_${variantId}_${criterionId}`,exactVariantId:variantId,
        criterionId,proposition:level==='compromised'?'Pressure increases during longer use.':
          'Professional test reports adequate or better direct performance.',
        polarity:level==='compromised'?'unfavourable':'favourable',basis:'hands_on_observation',
        context:{usage:'commute'},methodologyReference:'documented_hands_on_test_protocol',
        qualification:null,originalTestId:`test_${variantId}_${criterionId}`,
        sourceUrl:`https://original-tests.example.org/${variantId}/${criterionId}`,
        sourceSha256:'a'.repeat(64),sourceSpanSha256:'b'.repeat(64),sourceSpanBytes:80,
        reviewStatus:'quarantined_for_semantic_method_and_rights_review',
        evidenceKind:'original_professional_qualitative_observation',
        quantifiedMeasurement:false,weight:null,numericScore:null};
    });
    const approvals:ReviewEvidenceApproval[]=findings.map(f=>({findingId:f.findingId,
      reviewerId:'original_test_assessor',reviewReference:'independent_source_review_receipt',
      validatedSourceSha256:f.sourceSha256,reviewedAt:'2026-10-09T11:00:00Z',
      semanticFaithfulness:'confirmed',methodAssessment:'documented',adequacyAssessment:'documented',
      criterionImplication:f.polarity==='unfavourable'?'concerns':'supports'}));
    return {variantId,needs,findings,approvals};
  });
  const mappings:Phase99PerformanceMapping[]=bundles.flatMap(b=>b.findings.map(f=>({
    variantId:b.variantId,criterionId:f.criterionId,levelId:assessed(b.variantId,f.criterionId),
    supportingFindingIds:[f.findingId],performanceAssessorId:'different_performance_assessor',
    performanceReviewReference:'independent_level_review_reference',
    performanceReviewDate:'2026-10-10T11:00:00Z',
    reconciliation:'consistent_evidence',originalTestLineageReviewed:true,
    independentlyReviewedContext:true})));
  return {preferenceModel:prefs(),variantIds:variants,qualitativeBundles:bundles,
    performanceMappings:mappings,hardRequirements:[] as HardRequirement[]};
}
function setup(){
  const x=fixture();return {basis:compareReviewedQualitativeEvidence(x),carrier:x.preferenceModel};
}
function run(judgements:OrdinalSwingJudgement[]=[],change?: (x:ReturnType<typeof setup>)=>void){
  const x=setup();change?.(x);
  return assessAdaptiveSwingPreferences({phase99:x.basis,reviewedScaleCarrier:x.carrier,
    ordinalJudgements:judgements,
    preferenceExplorationConfirmed:true,preferenceExplorationReference:'user_authorized_reelicitation_receipt'});
}
function judgment(a:string,b:string,preference:'more_important'|'equally_important'='more_important'):OrdinalSwingJudgement{
  return {firstCriterionId:a,secondCriterionId:b,preference,userConfirmed:true,
    answerReference:'user_confirmed_swing_comparison_receipt'};
}
test('Phase96->Phase99->Phase100 real module path and uncompensated negative evidence',()=>{
  const r=run();assert.equal(r.status,'underdetermined');
  assert.deepEqual(r.sourceVariantIds,variants);
  assert.ok(r.differenceBounds![0]<-74.9&&r.differenceBounds![1]>29.9);
  assert.equal(r.rankingEligible,false);assert.equal(r.publicationReady,false);
  assert.ok(r.compatiblePolytopeVertices>=3);
});
test('asks exactly one grounded swing question when preferences can change choice',()=>{
  const r=run();assert.ok(r.question);
  assert.ok(criteria.includes(r.question!.firstCriterionId as typeof criteria[number]));
  assert.match(r.question!.prompt,/Unsuitable for the intended task/);
  assert.deepEqual(r.question!.responses,['first_more_important','second_more_important','equally_important']);
});
test('no question when it was explicitly disabled',()=>{
  const x=setup();const r=assessAdaptiveSwingPreferences({phase99:x.basis,reviewedScaleCarrier:x.carrier,
    ordinalJudgements:[],suggestQuestion:false,preferenceExplorationConfirmed:true,
    preferenceExplorationReference:'user_authorized_reelicitation_receipt'});assert.equal(r.question,null);
});
test('honours user comparison without turning ordinal words into cardinal numbers',()=>{
  const r=run([judgment('sound','comfort')]);
  assert.equal(r.status,'underdetermined');
  assert.ok(r.admissibleWeightBounds.find(x=>x.criterionId==='comfort')!.maximum<=.5+1e-6);
});
test('three ordinal comparisons can support a necessary choice',()=>{
  const r=run([judgment('sound','comfort'),judgment('noise_control','comfort'),
    judgment('sound','noise_control')]);
  // Because equal weights remain in the closure, a robust result is ONLY
  // asserted if extrema prove it; no fabricated strictness margin is used.
  assert.ok(['necessary_first','underdetermined'].includes(r.status));
  if(r.status==='necessary_first')assert.ok(r.differenceBounds![0]>0);
});
test('repeated conflicting pair judgements are rejected instead of averaged',()=>{
  assert.throws(()=>run([judgment('comfort','sound'),judgment('sound','comfort')]),/duplicate/);
});
test('strict opposite of a confirmed equality is inconsistent',()=>{
  assert.throws(()=>run([judgment('sound','comfort','equally_important'),
    judgment('sound','noise_control'),judgment('noise_control','comfort')]),/inconsistent_confirmed/);
});
test('hard user veto survives preference uncertainty',()=>{
  const x=fixture();const source='https://original-tests.example.org/headphone_a/comfort';
  x.hardRequirements=[{criterionId:'comfort',confirmedHardRequirementReference:'explicit_user_nonnegotiable_confirmed',
    variantAssessments:[{variantId:'headphone_a',result:'demonstrated_failure',
      sourceUrl:source,originalTestId:'test_headphone_a_comfort',methodReviewed:true},
      {variantId:'headphone_b',result:'demonstrated_pass',
      sourceUrl:'https://original-tests.example.org/headphone_b/comfort',
      originalTestId:'test_headphone_b_comfort',methodReviewed:true}]}];
  const basis=compareReviewedQualitativeEvidence(x);
  const r=assessAdaptiveSwingPreferences({phase99:basis,reviewedScaleCarrier:x.preferenceModel,ordinalJudgements:[],preferenceExplorationConfirmed:true,
    preferenceExplorationReference:'user_authorized_reelicitation_receipt'});
  assert.equal(r.status,'hard_requirement_unresolved_or_failed');assert.equal(r.question,null);
});
test('missing source evidence means investigate original reviews rather than interrogate preferences',()=>{
  const r=run([],x=>{x.basis.pendingEvidence.push({variantId:'headphone_a',criterionId:'comfort',
    findingIds:['finding_new'],reason:'unresolved original observation'});});
  assert.equal(r.status,'need_more_evidence');assert.equal(r.question,null);
});
test('tampered or nonmatching criterion model cannot enter sensitivity calculation',()=>{
  assert.throws(()=>run([],x=>{x.carrier.criteria[0].swingWeight=0;}),/unverified_or_nonmatching/);
  assert.throws(()=>run([],x=>{x.carrier.criteria[0].criterionId='battery';}),/unverified_or_nonmatching/);
});
test('unconfirmed comparisons never constrain the recommendation',()=>{
  const j=judgment('sound','comfort');j.userConfirmed=false as true;
  assert.throws(()=>run([j]),/invalid_or_unconfirmed/);
});
test('the procedure is deterministic and does not invoke an LLM',()=>{
  const a=run(),b=run();assert.deepEqual(a,b);
});
test('professional comfort drawback can prevail when user prioritises comfort swing',()=>{
  const r=run([judgment('comfort','sound'),judgment('comfort','noise_control')]);
  assert.equal(r.status,'necessary_second');
  assert.ok(r.differenceBounds![1]<0);
  assert.equal(r.question,null);
});
test('if no preferences are elicited, no single profile may be silently treated as universal',()=>{
  const x=setup();assert.deepEqual(x.basis.conditionalOrder,['headphone_a','headphone_b']);
  const r=assessAdaptiveSwingPreferences({phase99:x.basis,reviewedScaleCarrier:x.carrier,ordinalJudgements:[],preferenceExplorationConfirmed:true,
    preferenceExplorationReference:'user_authorized_reelicitation_receipt'});
  assert.equal(r.status,'underdetermined');
});
test('honours independently documented performance uncertainty across all compatible weights',()=>{
  const x=fixture();x.performanceMappings[0].plausibleLevelIds=['low','excellent'];
  const basis=compareReviewedQualitativeEvidence(x);
  const r=assessAdaptiveSwingPreferences({phase99:basis,reviewedScaleCarrier:x.preferenceModel,ordinalJudgements:[],preferenceExplorationConfirmed:true,
    preferenceExplorationReference:'user_authorized_reelicitation_receipt'});
  assert.ok(r.differenceBounds![0]<0);assert.ok(r.differenceBounds![1]>0);
  assert.equal(r.status,'underdetermined');
});
test('malformed source intervals are never used as a plausible rank',()=>{
  assert.throws(()=>run([],x=>{x.basis.criterionDifferences[0].firstVariantBounds=[-100,999];}),
    /invalid_phase99_value_bounds|unverified_or_nonmatching_scales/);
});

test('evidence-backed large advantages can yield necessary first over all admissible ordinal weights',()=>{
  const x=fixture();
  x.performanceMappings.find(m=>m.variantId==='headphone_a'&&m.criterionId==='comfort')!.levelId='excellent';
  x.performanceMappings.find(m=>m.variantId==='headphone_b'&&m.criterionId==='comfort')!.levelId='adequate';
  const basis=compareReviewedQualitativeEvidence(x);
  const r=assessAdaptiveSwingPreferences({phase99:basis,reviewedScaleCarrier:x.preferenceModel,
    ordinalJudgements:[],preferenceExplorationConfirmed:true,
    preferenceExplorationReference:'user_authorized_reelicitation_receipt'});
  assert.equal(r.status,'necessary_first');assert.ok(r.differenceBounds![0]>0);
  assert.equal(r.question,null);
});
test('must ask permission before reopening a separately confirmed preference model',()=>{
  const x=setup();assert.throws(()=>assessAdaptiveSwingPreferences({phase99:x.basis,
    reviewedScaleCarrier:x.carrier,ordinalJudgements:[],preferenceExplorationConfirmed:false as true,
    preferenceExplorationReference:'user_authorized_reelicitation_receipt'}),
    /invalid_phase99_research_handoff/);
});
