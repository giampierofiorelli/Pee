import test from 'node:test';
import assert from 'node:assert/strict';
import {interpretQuestion122,planQuestionResearch122, type Coverage122} from '../src/phase122_native_question_to_research.js';
const empty:Coverage122={candidateCount:0,verifiedMetricKeys:[],hasIndependentlyReviewedQualityPolicy:false,protocolComparable:false};
const context={verifiedCategory:'floor_cleaning_robot' as const};
const q='Quali robot richiedono meno interventi umani?';

test('unprepared autonomy query preserves missing category absent confirmed context',()=>{
  const x=planQuestionResearch122(q,empty);
  assert.equal(x.next,'request_context');assert.equal(x.intent.category,'unknown');
  assert.equal(x.publicRankingAuthorized,false);assert.equal(x.steps.length,0);
});
test('verified conversation category disambiguates robot without inventing user preferences',()=>{
  const x=planQuestionResearch122(q,empty,context);
  assert.equal(x.intent.objective,'least_human_work');
  assert.equal(x.intent.category,'floor_cleaning_robot');assert.equal(x.intent.contextUsed,true);
  assert.equal(x.intent.scope,'undecided');assert.equal(x.next,'continue_research');
  assert.equal(x.steps[0].action,'discover_candidates');
  assert.ok(x.unknowns.includes('unattended_completion'));
  assert.ok(x.unknowns.includes('rescue_interventions'));
  assert.ok(x.unknowns.includes('routine_human_minutes'));
  assert.ok(x.unknowns.includes('unplanned_human_minutes'));
});
test('Italian paraphrases yield same evidence obligations under same verified context',()=>{
  const questions=['Quali robot richiedono meno interventi umani?',
    'Cerco i robot più autonomi','Quali robot hanno meno manutenzione?',
    'Voglio robot senza interventi'];
  const plans=questions.map(y=>planQuestionResearch122(y,empty,context));
  for(const p of plans){assert.equal(p.intent.objective,'least_human_work');
    assert.deepEqual(p.unknowns,plans[0].unknowns);
    assert.deepEqual(p.steps.map(s=>s.action),plans[0].steps.map(s=>s.action));}
});
test('English autonomy intent has equivalent research obligations',()=>{
  const p=planQuestionResearch122('Which robots need the least human intervention?',empty,context);
  assert.equal(p.intent.objective,'least_human_work');
  assert.deepEqual(p.unknowns,planQuestionResearch122(q,empty,context).unknowns);
});
test('the interpreter makes no phantom category assumption from standalone robot',()=>{
  const p=planQuestionResearch122('What are the best robots?',empty);
  assert.equal(p.next,'request_context');assert.equal(p.intent.category,'unknown');
});
test('explicit category is recognized without conversation',()=>{
  const p=planQuestionResearch122('Qual è il miglior robot aspirapolvere?',empty);
  assert.equal(p.intent.category,'floor_cleaning_robot');
  assert.equal(p.intent.objective,'best_performance');
  assert.equal(p.intent.scope,'vacuum');
  assert.ok(p.unknowns.includes('cleaning_outcome'));
});
test('value request does not silently collapse to generic best or require personal scope',()=>{
  const p=planQuestionResearch122('Miglior robot aspirapolvere qualità prezzo',empty);
  assert.equal(p.intent.objective,'best_value');
  assert.equal(p.intent.queryState,'bounded_proposal');
  assert.equal(p.intent.mode,'general');
  assert.ok(p.unknowns.includes('market_price'));
  assert.ok(p.unknowns.includes('cost_of_ownership'));
});
test('personal needs do not rewrite ontology or imply price preference',()=>{
  const p=planQuestionResearch122('Miglior robot aspirapolvere con tappeti per la mia casa',empty);
  assert.equal(p.intent.mode,'personal');assert.equal(p.intent.objective,'best_performance');
  assert.ok(!p.unknowns.includes('market_price'));
});
test('negated features are not treated as positive scope requirements',()=>{
  const p=planQuestionResearch122('Voglio il miglior robot aspirapolvere, non voglio lavaggio',empty);
  assert.equal(p.next,'semantic_review');assert.equal(p.intent.protectedNegation,true);
  assert.equal(p.publicRankingAuthorized,false);
  assert.equal(p.steps.length,0);
});
test('unsupported novel objective must not be guessed as a quality criterion',()=>{
  const p=planQuestionResearch122('Robot aspirapolvere con l algoritmo migliore',empty);
  assert.equal(p.next,'semantic_review');
  assert.equal(p.intent.objective,null);
});
test('autonomy evidence gap is not silently replaced by advertised dock features',()=>{
  const x=planQuestionResearch122(q,{
    ...empty,candidateCount:8,verifiedMetricKeys:['product_discovery','product_identity','cleaning_outcome']
  },context);
  assert.ok(x.unknowns.includes('unattended_completion'));
  assert.ok(x.unknowns.includes('expert_quality_floor'));
  assert.ok(x.unknowns.includes('test_comparability'));
  assert.equal(x.publicRankingAuthorized,false);
});
test('policy and protocol statuses cannot be faked by a coverage metric flag',()=>{
  const x=planQuestionResearch122(q,{candidateCount:10,
    verifiedMetricKeys:['product_discovery','product_identity','expert_quality_floor',
    'cleaning_outcome','unattended_completion','rescue_interventions',
    'routine_human_minutes','unplanned_human_minutes','test_comparability'],
    hasIndependentlyReviewedQualityPolicy:false,protocolComparable:false},context);
  assert.deepEqual(x.unknowns,['expert_quality_floor','test_comparability']);
});
test('full caller-reported coverage still cannot grant ranking or market exhaustion',()=>{
  const x=planQuestionResearch122(q,{candidateCount:10,
    verifiedMetricKeys:['product_discovery','product_identity','expert_quality_floor',
    'cleaning_outcome','unattended_completion','rescue_interventions',
    'routine_human_minutes','unplanned_human_minutes','test_comparability'],
    hasIndependentlyReviewedQualityPolicy:true,protocolComparable:true},context);
  assert.equal(x.next,'review_evidence_receipts');
  assert.equal(x.publicRankingAuthorized,false);
  assert.equal(x.marketExhaustionProven,false);assert.equal(x.searchExecuted,false);
});
test('unknown cost is not silently converted to zero',()=>{
  const p=planQuestionResearch122('Miglior robot lavapavimenti qualità prezzo',empty);
  assert.equal(p.intent.scope,'mop');assert.ok(p.unknowns.includes('cost_of_ownership'));
});
test('invalid coverage is rejected instead of used as evidence',()=>{
  assert.throws(()=>planQuestionResearch122(q,{...empty,candidateCount:-1},context),/invalid_coverage/);
  assert.throws(()=>planQuestionResearch122(q,{...empty,verifiedMetricKeys:['not_a_metric' as never]},context),/invalid_coverage/);
  assert.throws(()=>planQuestionResearch122(q,{...empty,verifiedMetricKeys:['product_identity','product_identity']},context),/invalid_coverage/);
});
test('same query and evidence state yields deterministic plans',()=>{
  const a=planQuestionResearch122(q,empty,context);const b=planQuestionResearch122(q,empty,context);
  assert.deepEqual(a,b);
});
test('best robot for autonomy is autonomy first, not two incompatible objectives',()=>{
  const x=planQuestionResearch122('Quali sono i migliori robot aspirapolvere per autonomia?',empty);
  assert.equal(x.intent.objective,'least_human_work');assert.equal(x.next,'continue_research');
});
test('best robots requiring least intervention is one autonomy objective',()=>{
  const x=planQuestionResearch122('Miglior robot aspirapolvere con meno interventi umani',empty);
  assert.equal(x.intent.objective,'least_human_work');
});

test('two explicitly enumerated requests cannot collapse into value only',()=>{
 const p=planQuestionResearch122('Se io chiedessi 1) miglior robot 2) migliore robot qualità prezzo?',empty,context);
 assert.equal(p.next,'semantic_review');
 assert.equal(p.intent.objective,null);
 assert.ok(p.intent.evidenceSignals.includes('multiple_objectives_need_resolution'));
});
