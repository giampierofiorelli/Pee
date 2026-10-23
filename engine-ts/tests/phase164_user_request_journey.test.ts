import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newRequestSession164,advanceUserRequest164,registerUserCandidates164,resolveBudgetRevision164}
 from '../src/phase164_user_request_journey.js';
import type {CategoryBrain128,Concept128} from '../src/phase128_category_cognition_dialogue_bridge.js';
import type {IndexedPassage122} from '../src/phase122_native_local_retrieval.js';
// Constructed catalogue/receipts for engineering only; not authentic independent source review.
const specs=[
 {id:'air_fryer',aliases:['air fryer','air fryers'],aspects:[
  ['small_household','environment',['for one person','for a single person','live alone','small household']],
  ['quiet_operation','capability',['quiet','low noise','silent']],
  ['dishwasher_safe','capability',['dishwasher safe basket']],
  ['basket_size','capability',['small basket','compact basket']]]},
 {id:'deep_fryer',aliases:['fryer','deep fryer','traditional fryer'],aspects:[
  ['oil_capacity','capability',['oil capacity','large oil tank']]]},
 {id:'coffee_machine',aliases:['coffee machine','espresso machine','coffee maker'],aspects:[
  ['steam_wand','capability',['steam wand']],['quiet_operation','capability',['quiet']]]},
 {id:'refrigerator',aliases:['refrigerator','fridge','fridges'],aspects:[
  ['noise','capability',['quiet','low noise']],['energy','capability',['energy efficient']]]},
 {id:'toaster',aliases:['toaster','toasters'],aspects:[
  ['slots','capability',['four slots','two slots']]]},
 {id:'steamer',aliases:['food steamer','electric steamer','steam cooker'],aspects:[
  ['capacity','capability',['large capacity']]]},
] as const;
function fixtureBrains():CategoryBrain128[]{return specs.map((s,i)=>({
 categoryId:s.id,schemaVersion:1,aliases:[...s.aliases],
 sources:[{id:'fixture_source',url:'https://example.org/constructed-schema-fixture',
  title:'Constructed test-only fixture',originalDocumentId:'fixture_document',role:'original_expert_method'}],
 concepts:s.aspects.map(a=>({id:a[0],kind:a[1],label:a[0],aliases:[...a[2]],
  evidenceKeys:['test_'+a[0]],state:'reviewed_definition',
  review:{reviewId:'fixture_review',reviewerId:'fixture_only_not_authenticated',
   sourceRefIds:['fixture_source'],reviewScope:'category_definition'}})) as Concept128[],
 quality:[],distinctions:[]
}));}
const b=fixtureBrains();
const run=(s:ReturnType<typeof newRequestSession164>,turnId:string,question:string,
 brains=b,passages?:readonly IndexedPassage122[])=>advanceUserRequest164(s,{turnId,question,
 language:'en',brains,passages});

test('a specific household request becomes a category-scoped research obligation, not ranking',()=>{
 const r=run(newRequestSession164('session_alpha'),'t1','Best air fryer for a single person');
 assert.equal(r.categoryId,'air_fryer');assert.equal(r.frame?.scope,'personal');
 assert.ok(r.extraction?.aspects.some(x=>x.aspectId==='small_household'));
 assert.ok(r.research.obligations.includes('test_small_household'));
 assert.equal(r.publicRecommendationAuthorized,false);
});
test('the larger category alias suppresses nested fryer only at the overlapping occurrence',()=>{
 const r=run(newRequestSession164('session_beta'),'t1','What is the best air fryer?');
 assert.equal(r.categoryId,'air_fryer');assert.equal(r.action,'research_requested_outcomes');
 const c=run(newRequestSession164('session_gamma'),'t1','Air fryer or fryer?');
 assert.equal(c.action,'resolve_category_collision');assert.equal(c.categoryId,null);
 assert.equal(c.questionToUser,'Which product category do you mean?');
});
test('multiple explicitly named independent categories are never silently merged',()=>{
 const r=run(newRequestSession164('session_multi'),'turn_1','Which air fryer and toaster is best?');
 assert.equal(r.action,'resolve_category_collision');assert.equal(r.frame,null);
});
test('standalone unknown category does not inherit unrelated context',()=>{
 const a=run(newRequestSession164('session_unknown'),'t1','Best air fryer?');
 const r=run(a.session,'t2','What is the best appliance for my office?');
 assert.equal(r.categoryId,null);assert.equal(r.action,'resolve_category');
 assert.equal(r.session.activeCategoryId,'air_fryer');
});
test('followup inherits only category-scoped interpretation and previous constraints',()=>{
 const a=run(newRequestSession164('session_follow'),'t1','Best air fryer for one person?');
 const r=run(a.session,'t2','And what about a quiet one?');
 assert.equal(r.categoryId,'air_fryer');assert.equal(r.categoryProvenance,'scoped_followup');
 assert.ok(r.extraction?.aspects.some(x=>x.aspectId==='quiet_operation'));
 assert.ok(r.extraction?.inheritedCandidateConstraints.some(x=>x.aspectId==='small_household'));
 assert.equal(r.publicRecommendationAuthorized,false);
 assert.equal(r.extraction?.goalOrigin,'prior_turn_candidate');
 assert.equal(r.action,'research_requested_outcomes');
});
test('an explicitly named new category resets previous personal preferences',()=>{
 const a=run(newRequestSession164('session_switch'),'t1','Best air fryer for one person under £150?');
 const r=run(a.session,'t2','Best coffee machine with a steam wand?');
 assert.equal(r.categoryId,'coffee_machine');
 assert.equal(r.extraction?.inheritedCandidateConstraints.length,0);
 assert.equal(r.session.dialogue?.budget,null);assert.notEqual(a.session.epoch,r.session.epoch);
});
test('price ceiling is explicitly anchored and never inferred from a bare number',()=>{
 const a=run(newRequestSession164('session_money'),'t1','Best espresso machine under £300?');
 assert.deepEqual(a.frame?.userBudget,{currency:'GBP',min:null,max:300});
 const x=run(newRequestSession164('session_money_2'),'t1','Best espresso machine £300?');
 assert.equal(x.frame?.userBudget,null);
 assert.ok(x.frame?.hazards.includes('unparsed_or_conflicting_budget'));
});
test('old price ceiling is not silently retained or removed when user reverses it',()=>{
 const a=run(newRequestSession164('session_budget_edit'),'t1','Best air fryer under £150?');
 const r=run(a.session,'t2','But price does not matter');
 assert.equal(r.action,'review_meaning');
 assert.match(r.questionToUser!,/remove your previous budget limit/);
 assert.deepEqual(r.session.dialogue?.budget,{currency:'GBP',min:null,max:150});
 const repeated=run(r.session,'t3','And another one?');
 assert.equal(repeated.action,'resume_pending_question');
 const yes=resolveBudgetRevision164(repeated.session,{answerTurnId:'answer_1',requestTurnId:'t2',
  removeLimit:true,userConfirmed:true});
 assert.equal(yes.dialogue?.budget,null);
 assert.equal(yes.pendingBudgetRevision,null);
 const next=run(yes,'t4','And with a quiet operation?');
 assert.equal(next.categoryId,'air_fryer');
 assert.equal(next.session.dialogue?.budget,null);
});
test('unresolved which-one comparison asks only one referent question',()=>{
 const a=run(newRequestSession164('session_referent'),'t1','Best fridge?');
 const r=run(a.session,'t2','Which one is better?');
 assert.equal(r.action,'ask_one_question');
 assert.match(r.questionToUser!,/Which models/);
 assert.equal(r.publicRecommendationAuthorized,false);
});
test('a structurally registered presented set resolves referent without fabricating winner',()=>{
 const a=run(newRequestSession164('session_presented'),'t1','Best fridge?');
 const registered=registerUserCandidates164(a.session,{turnId:'present_1',categoryId:'refrigerator',
  sourceSnapshotId:'source_fixture',candidateIds:['model_a','model_b'],presentedToUser:true});
 const r=run(registered,'t2','Which one is better?');
 assert.equal(r.frame?.candidateReference,'verified_context');
 assert.deepEqual(r.frame?.candidateIds,['model_a','model_b']);
 assert.equal(r.publicRecommendationAuthorized,false);
});
test('source rights assertions permit local retrieval candidates, never evidence approval',()=>{
 const corpus:IndexedPassage122[]=[{passageId:'source_passage',sourceUrl:'https://example.org/editorial',
  sourceIdentity:'publisher',rightsReviewed:true,
  text:'This air fryer was evaluated for cooking performance in a small household.'},
  {passageId:'unlicensed_passage',sourceUrl:'https://example.org/unlicensed',
  sourceIdentity:'other_publisher',rightsReviewed:false,
  text:'Best air fryer for one person is a short review of this product.'}];
 const r=run(newRequestSession164('session_retrieval'),'t1','Best air fryer for one person?',b,corpus);
 assert.deepEqual(r.research.candidatePassageIds,['source_passage']);
 assert.equal(r.research.retrievalIsEvidence,false);
 assert.equal(r.research.sourceFactsApproved,false);
});
test('replay and modified event logs fail closed',()=>{
 const a=run(newRequestSession164('session_audit'),'t1','Best toaster?');
 assert.throws(()=>run(a.session,'t1','Best toaster?'),/replayed/);
 const altered=structuredClone(a.session) as any;
 altered.history[0].action='ask_one_question';
 assert.throws(()=>run(altered,'t2','And a four slots toaster?'),/tampered/);
});
test('category schema change invalidates session without leaking stale requirements',()=>{
 const a=run(newRequestSession164('session_schema'),'t1','Best food steamer with large capacity?');
 const changed=fixtureBrains();const p=changed.find(x=>x.categoryId==='steamer')!;
 p.schemaVersion=2;
 const r=run(a.session,'t2','And what about the price?',changed);
 assert.equal(r.action,'invalidate_changed_category_schema');
 assert.equal(r.session.categorySnapshot,a.session.categorySnapshot);
 assert.equal(r.publicRecommendationAuthorized,false);
});
test('semantically equivalent constructed paraphrases preserve normalized conditions, not a verified equivalence claim',()=>{
 const a=run(newRequestSession164('session_para_1'),'t1','Best air fryer for one person?');
 const c=run(newRequestSession164('session_para_2'),'t1','Which air fryer is best for a single person?');
 assert.deepEqual(a.frame?.goals,c.frame?.goals);
 assert.deepEqual(a.frame?.aspects.map(x=>[x.aspectId,x.role]),
  c.frame?.aspects.map(x=>[x.aspectId,x.role]));
 assert.equal(a.publicRecommendationAuthorized,false);
});
test('unknown feature is retained as research or semantic hazard',()=>{
 const r=run(newRequestSession164('session_feature'),'t1','Best air fryer with a self washing basket?');
 assert.ok(r.frame?.hazards.includes('unknown_capability_requires_research'));
 assert.equal(r.action,'review_meaning');
});

test('declining budget revision keeps the old ceiling, and repeated answer is invalid',()=>{
 const a=run(newRequestSession164('session_budget_no'),'t1','Best air fryer under £200?');
 const ask=run(a.session,'t2','But no budget limit');
 const no=resolveBudgetRevision164(ask.session,{answerTurnId:'no_answer',requestTurnId:'t2',
  removeLimit:false,userConfirmed:true});
 assert.equal(no.dialogue?.budget?.max,200);
 assert.throws(()=>resolveBudgetRevision164(no,{answerTurnId:'again',requestTurnId:'t2',
  removeLimit:true,userConfirmed:true}),/not_pending/);
});
test('expressly excludes customer reviews and preserves source restriction as obligation',()=>{
 const r=run(newRequestSession164('session_experts'),'t1',
  'Best air fryer for one person, only expert reviews, no customer reviews');
 assert.equal(r.sourcePreference,'independent_professional_only');
 assert.ok(r.research.obligations.includes('independent_professional_tests_only'));
 assert.equal(r.research.sourceFactsApproved,false);
});
test('unrecognized household condition is not dropped in a superficially valid best query',()=>{
 const r=run(newRequestSession164('session_kitchen'),'t1','Best fridge for a narrow kitchen?');
 assert.deepEqual(r.unhandledConstraintPhrases,['a narrow kitchen']);
 assert.equal(r.action,'review_meaning');
 assert.ok(r.research.obligations.includes('adjudicate_unmapped_user_constraint'));
});
test('independent-only policy persists within category, cannot accept unverified editorial role',()=>{
 const corpus:IndexedPassage122[]=[{passageId:'retailer_customer',
  sourceUrl:'https://example.org/customer-review',sourceIdentity:'retailer',rightsReviewed:true,
  text:'Customer review: I enjoy using this air fryer at home to make dinner.'}];
 const a=run(newRequestSession164('session_policy'),'t1',
  'Best air fryer, no customer reviews',b,corpus);
 assert.equal(a.sourcePreference,'independent_professional_only');
 assert.deepEqual(a.research.candidatePassageIds,[]);
 const continued=run(a.session,'t2','And what about quiet operation?',b,corpus);
 assert.equal(continued.sourcePreference,'independent_professional_only');
 assert.deepEqual(continued.research.candidatePassageIds,[]);
 const switched=run(continued.session,'t3','Best toaster?',b,corpus);
 assert.equal(switched.sourcePreference,'not_specified');
});
test('unreviewed washing-machine category enters existing cold-start plan, not a fake winner',()=>{
 const a=run(newRequestSession164('session_new_category'),'t1','Best toaster?');
 const r=advanceUserRequest164(a.session,{turnId:'t2',question:'Best washing machine for a small bathroom?',
  language:'en',brains:b,researchCatalog:[{categoryId:'washing_machine',label:'washing machine',
   aliases:['washing machine','washer'],status:'research',registryVersion:null}],
   catalogAsOf:'2026-10-12T00:00:00+01:00'});
 assert.equal(r.action,'research_unreviewed_category');
 assert.equal(r.candidateResearchCategoryId,'washing_machine');
 assert.equal(r.categoryId,null);
 assert.ok(r.research.newCategoryTasks.some(t=>t.capability==='category_identity'));
 assert.equal(r.session.dialogue,null);
 assert.equal(r.session.activeCategoryId,null);
 assert.equal(r.publicRecommendationAuthorized,false);
});
test('mixed reviewed and unreviewed categories never silently drop the second category',()=>{
 const r=advanceUserRequest164(newRequestSession164('session_mixed'),
  {turnId:'t1',question:'Air fryer or washing machine?',language:'en',brains:b,
   researchCatalog:[{categoryId:'washing_machine',label:'washing machine',
    aliases:['washing machine'],status:'research',registryVersion:null}],
   catalogAsOf:'2026-10-12T00:00:00+01:00'});
 assert.equal(r.action,'resolve_category_collision');
 assert.equal(r.categoryId,null);
 assert.equal(r.publicRecommendationAuthorized,false);
});
