import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {researchUserGoal172,explainGoalResearch172,explainGoalChange172} from '../src/phase172_goal_suitability_guide.js';
import type {RequestOutput164} from '../src/phase164_user_request_journey.js';
const plan=(question:string)=>researchUserGoal172({question,language:'en'});
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');

test('being single is a use clue, not evidence for buying the smallest basket',()=>{
 const p=plan('Best air fryer for someone living alone');
 assert.equal(p.category,'air_fryer');
 assert.ok(p.candidates.some(x=>x.id==='airfryer_single'));
 assert.equal(p.questions[0].id,'airfryer_batch_or_single');
 assert.equal(p.candidates.every(x=>!x.engineeringVerified&&!x.confirmedByUser),true);
 assert.equal(p.rankingAuthorized,false);
 assert.equal(p.productExclusionsAuthorized,false);
});
test('batch cooking neutralizes portion-size follow-up and adds geometry hypotheses',()=>{
 const p=plan('Air fryer for one person, but I meal prep several meals');
 assert.ok(p.candidates.some(x=>x.id==='airfryer_batch'));
 assert.equal(p.questions.length,0);
 assert.ok(p.unresolvedDimensions.includes('load_uniformity'));
});
test('crispiness does not imply invented performance results',()=>{
 const p=plan('I want crunchy chips in an air fryer');
 assert.ok(p.candidates.some(x=>x.id==='airfryer_crisp'));
 assert.equal(p.independentEvidenceVerified,false);
 assert.equal(p.publicationAuthorized,false);
});
test('a locally negated outcome does not become a positive goal',()=>{
 const p=plan("I have an air fryer but I don't want crispy chips");
 assert.ok(!p.candidates.some(x=>x.id==='airfryer_crisp'));
});
test('beginner coffee workflow is not a license to claim best machine',()=>{
 const p=plan('I am a beginner looking for an easy to clean coffee machine');
 assert.equal(p.category,'coffee_machine');
 assert.ok(p.candidates.some(x=>x.id==='coffee_easy'));
 assert.equal(explainGoalResearch172(p).noVerifiedProductRecommendation,true);
});
test('goal-first coffee search can suggest investigating solution families, not selling one',()=>{
 const p=plan('I want to make good coffee at home, what do I need?');
 assert.equal(p.category,'coffee_machine');
 assert.ok(p.possibleSolutionFamilies.includes('manual_brewer_plus_grinder'));
 assert.equal(p.questions[0].id,'coffee_drink_type');
 assert.equal(p.solutionFamiliesVerified,false);
});
test('explicit only espresso machine stops expansion as a constraint hypothesis',()=>{
 const p=plan('I specifically want an espresso machine to make good coffee at home');
 assert.equal(p.possibleSolutionFamilies.length,0);
});
test('vacuums need pet-specific evidence and a surface question, not a generic suction assertion',()=>{
 const p=plan('Need a vacuum for dog hair');
 assert.ok(p.candidates.some(x=>x.id==='vacuum_pets'));
 assert.equal(p.questions[0].id,'vacuum_surface');
 assert.ok(p.researchActions.some(x=>x.includes('pet_hair_pickup_by_surface')));
});
test('existing mention of floor type avoids needless question',()=>{
 const p=plan('Need a vacuum for dog hair and carpet');
 assert.equal(p.questions.length,0);
});
test('stairs imply handling research distinct from pickup',()=>{
 const p=plan('Vacuum for pets on carpets and several floors with stairs');
 assert.ok(p.candidates.some(x=>x.id==='vacuum_stairs'));
 assert.ok(p.unresolvedDimensions.includes('carried_weight'));
});
test('washer fit invites installation envelope, never product-specific verdict',()=>{
 const p=plan('Washing machine for a tight space');
 assert.equal(p.questions[0].id,'washer_installation_space');
 assert.ok(p.candidates[0].potentialFailureModes.includes('physically_cannot_install_or_access'));
 assert.equal(p.productExclusionsAuthorized,false);
});
test('refrigerator quiet mention produces procedural research, not dBA-to-disturbance conversion',()=>{
 const p=plan('I want a quiet fridge in my studio apartment');
 assert.ok(p.unresolvedDimensions.includes('measured_noise_protocol'));
 assert.equal(p.candidates[0].engineeringVerified,false);
});
test('new category without mapped usage is not invented',()=>{
 const p=plan('Best toaster for me');
 assert.equal(p.category,'unknown');
 assert.equal(p.candidates.length,0);
 assert.ok(p.researchActions.includes('discover_real_world_goal_and_category_before_technical_inference'));
});
test('concise view cannot hide verification gap or possible hard mismatch',()=>{
 const view=explainGoalResearch172(plan('A washing machine for a tight space'));
 assert.ok(view.brief.length<=2);
 assert.ok(view.mustSeeNow.some(x=>x.includes('not verified')));
 assert.ok(view.mustSeeNow.some(x=>x.includes('clearance')));
 assert.ok(view.optionalDetails.some(x=>x.heading==='Possible problems to rule out'));
});
test('non-persuasive view does not claim a winner',()=>{
 const view=explainGoalResearch172(plan('Good coffee at home, coffee machine')); 
 assert.equal(view.noVerifiedProductRecommendation,true);
 assert.ok(!view.brief.join(' ').includes('best choice'));
});
test('different usage changes research dimensions but not ranking',()=>{
 const a=plan('Air fryer for one person');
 const b=plan('Air fryer for one person, but I meal prep several meals');
 const view=explainGoalChange172(a,b);
 assert.equal(view.mode,'context_changed_research_again');
 assert.ok(view.changedDecisionDimensions.includes('cycles_needed'));
 assert.equal(view.newWinnerClaimed,false);
});
test('paraphrase holding same detected dimensions does not claim verified semantic equivalence',()=>{
 const a=plan('Best air fryer for someone living alone');
 const b=plan('Air fryer for one person');
 const view=explainGoalChange172(a,b);
 assert.equal(view.mode,'no_detected_change');
 assert.ok(view.brief.includes('does not prove'));
});
test('changes of category require re-assessment',()=>{
 const view=explainGoalChange172(plan('Best air fryer for one person'),plan('Easy to clean coffee machine for a beginner'));
 assert.equal(view.mode,'context_changed_research_again');
 assert.ok(view.details.some(x=>x.includes('category:')));
});
test('request bound to different original question is rejected',()=>{
 const p=plan('Air fryer for one person');
 const fake={phase:164,requestSha256:sha('wrong'),rankingAuthorized:false,session:{history:[{questionSha256:sha('wrong')}],activeCategoryId:'air_fryer'},categoryId:'air_fryer'} as unknown as RequestOutput164;
 assert.throws(()=>researchUserGoal172({question:'Air fryer for one person',language:'en',request:fake}),/mismatch/);
 assert.equal(p.candidates[0].start>=0,true);
});
test('untrusted phases and declarations cannot create a recommendation view',()=>{
 const p=plan('Air fryer for one person');
 assert.throws(()=>explainGoalResearch172({...p,rankingAuthorized:true as never}),/untrusted/);
 assert.throws(()=>explainGoalChange172(p,{...p,independentEvidenceVerified:true as never}),/untrusted/);
});
test('no unsupported languages, empty inputs or unbounded strings',()=>{
 assert.throws(()=>researchUserGoal172({question:'',language:'en'}),/bounded/);
 assert.throws(()=>researchUserGoal172({question:'x'.repeat(4001),language:'en'}),/bounded/);
 assert.throws(()=>researchUserGoal172({question:'Cerco un frigorifero',language:'it' as 'en'}),/english/);
});

test('goal-first category discovery is provisional for users who do not know the product name',()=>{
 const p=plan('I need something to remove dog hair on carpets and stairs');
 assert.equal(p.category,'vacuum_cleaner');
 assert.equal(p.categoryBasis,'usage_clue_only');
 assert.ok(p.possibleSolutionFamilies.includes('canister_vacuum'));
 assert.equal(p.productExclusionsAuthorized,false);
});
test('two different categories in the request prevent speculative category resolution',()=>{
 const p=plan('Should I buy a fridge or a coffee machine?');
 assert.equal(p.category,'unknown');
 assert.equal(p.candidates.length,0);
});

test('integration accepts the actual phase164 category context for the exact turn',async()=>{
 const {advanceUserRequest164,newRequestSession164}=await import('../src/phase164_user_request_journey.js');
 const actualQuestion='Best air fryer for one person';
 const brain={categoryId:'air_fryer',schemaVersion:1,aliases:['air fryer'],sources:[],concepts:[],quality:[],distinctions:[]};
 const prev=advanceUserRequest164(newRequestSession164('session_172_test'),{
  turnId:'turn_172_test',question:actualQuestion,language:'en',brains:[brain]});
 const p=researchUserGoal172({question:actualQuestion,language:'en',request:prev});
 assert.equal(p.category,'air_fryer');
 assert.equal(p.categoryBasis,'explicit_or_reviewed_journey');
 assert.equal(p.requestSha256,prev.requestSha256);
});
