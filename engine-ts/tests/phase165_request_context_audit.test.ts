import {test} from 'node:test';
import assert from 'node:assert/strict';
import {composeQuestion125,type CategorySchema125} from '../src/phase125_compositional_dialogue_frame.js';
import {auditRequestContext165} from '../src/phase165_request_context_audit.js';
import {advanceUserRequest164,newRequestSession164} from '../src/phase164_user_request_journey.js';
import type {CategoryBrain128,Concept128} from '../src/phase128_category_cognition_dialogue_bridge.js';

// Fixture data only. These are NOT genuine reviewer sign-offs.
const schema:CategorySchema125={id:'coffee_machine',schemaReviewId:'phase165_constructed_fixture',
 aliases:['coffee machine','espresso machine','coffee maker'],aspects:[
  {id:'steam_wand',kind:'capability',aliases:['steam wand'],evidenceKeys:['steam_test']},
  {id:'quiet_operation',kind:'capability',aliases:['quiet'],evidenceKeys:['noise_test']},
  {id:'app_control',kind:'capability',aliases:['app control'],evidenceKeys:['app_test']},
 ]};
const brain:CategoryBrain128={categoryId:'coffee_machine',schemaVersion:1,
 aliases:[...schema.aliases],sources:[{id:'fixture_source',url:'https://example.org/phase165-constructed-fixture',
 title:'Constructed source',originalDocumentId:'constructed_doc',role:'original_expert_method'}],
 concepts:schema.aspects.map(a=>({id:a.id,kind:a.kind,label:a.id,aliases:[...a.aliases],
  evidenceKeys:[...a.evidenceKeys],state:'reviewed_definition',review:{reviewId:'fixture_review',
   reviewerId:'not_a_real_reviewer',sourceRefIds:['fixture_source'],reviewScope:'category_definition'}})) as Concept128[],
 quality:[],distinctions:[]};
const audit=(q:string)=>auditRequestContext165(q,schema,composeQuestion125(q,[schema]));
const request=(q:string,id='first')=>advanceUserRequest164(newRequestSession164('phase165_'+id),{
 turnId:'t1',question:q,language:'en',brains:[brain]});

test('reuse Phase154 context graph on positive explicit exclusion',()=>{
 const a=audit('Best coffee machine without a steam wand');
 assert.equal(a.contextEngine,'existing_phase154_medspacy_inspired_graph');
 assert.deepEqual(a.occurrences.map(x=>x.proposedMeaning),['excluded']);
 assert.equal(a.requiresReview,false);
 assert.equal(a.occurrences[0].literal,'steam wand');
 assert.equal(a.occurrences[0].modifiers[0].literal,'without');
});
test('simple optionality is not mistaken for positive product requirement',()=>{
 const r=request("Best coffee machine, I don't need a steam wand",'optional');
 assert.equal(r.frame?.aspects[0].role,'requested_capability'); // audit sees baseline error
 assert.equal(r.contextAudit165?.occurrences[0].proposedMeaning,'optional');
 assert.deepEqual(r.contextAudit165?.candidateCorrections.map(c=>c.effect),['set_optional']);
 assert.ok(!r.session.dialogue?.values.some(x=>x.aspectId==='steam_wand'));
 assert.equal(r.extraction?.aspects[0].role,'optional');
 assert.ok(!r.research.obligations.includes('steam_test'));
 assert.equal(r.research.sourceFactsApproved,false);
 assert.equal(r.rankingAuthorized,false);
});
test('mandatory request strength is kept as candidate, not overstated as verified',()=>{
 const r=request('Best coffee machine must have a steam wand','mandatory');
 assert.equal(r.contextAudit165?.requiresReview,false);
 assert.deepEqual(r.session.dialogue?.values.map(x=>[x.aspectId,x.role]),[['steam_wand','required']]);
 assert.equal(r.extraction?.aspects[0].role,'required');
 assert.equal(r.contextAudit165?.candidateCorrections[0].status,'unverified_rule_based_candidate');
 assert.equal(r.publicRecommendationAuthorized,false);
});
test('source policy negation cannot spill onto a product feature',()=>{
 const a=audit('Best coffee machine, no customer reviews, must have a steam wand');
 assert.deepEqual(a.occurrences[0].modifiers.map(m=>m.category),['REQUIRED']);
 const r=request('Best coffee machine, no customer reviews, must have a steam wand','source_mask');
 assert.equal(r.sourcePreference,'independent_professional_only');
 assert.equal(r.session.dialogue?.values.find(x=>x.aspectId==='steam_wand')?.role,'required');
});
test('contrast terminator prevents negation scope crossing clauses',()=>{
 const a=audit('Best coffee machine no steam wand but ideally with app control');
 assert.deepEqual(a.occurrences.map(x=>[x.aspectId,x.proposedMeaning]),
  [['steam_wand','excluded'],['app_control','preferred']]);
 assert.equal(a.requiresReview,false);
});
test('constraints can apply to multiple adjacent features without invented evidence',()=>{
 const a=audit('Best coffee machine must have quiet and app control');
 assert.deepEqual(a.occurrences.map(x=>x.proposedMeaning),['required','required']);
 assert.equal(a.originalUserMeaningVerified,false);
});
test('explicit upper dimensional bound becomes an unresolved research obligation',()=>{
 const r=request('Best coffee machine with a steam wand under 35 cm','dimension');
 assert.ok(r.contextAudit165?.issues.some(x=>x.code==='unmapped_hard_quantity'));
 assert.equal(r.action,'review_meaning');
 assert.ok(r.research.obligations.includes('adjudicate_user_context_scope_before_committing_preferences'));
 assert.ok(!r.session.dialogue?.values.some(v=>v.aspectId==='steam_wand'));
});
test('scalar negation is not treated as a binary exclusion',()=>{
 const r=request('Best coffee machine quiet but not too expensive','scalar');
 assert.ok(r.contextAudit165?.issues.some(x=>x.code==='ambiguous_scalar_negation'));
 assert.equal(r.action,'review_meaning');
 assert.equal(r.session.dialogue,null);
});
test('source restrictions beyond old grammar are not silently dropped',()=>{
 const r=request("Best coffee machine, don't trust customer ratings",'source_extended');
 assert.ok(r.contextAudit165?.issues.some(x=>x.code==='unreviewed_source_policy'));
 assert.equal(r.action,'review_meaning');
 assert.equal(r.publicRecommendationAuthorized,false);
});
test('normal source policy does not require a neural checkpoint',()=>{
 const a=audit('Best coffee machine only expert reviews, with a steam wand');
 assert.ok(!a.occurrences.some(x=>x.proposedMeaning==='excluded'));
});
test('direct negation without a clear grammar boundary fails closed',()=>{
 const a=audit('Best coffee machine not a steam wand');
 assert.ok(a.issues.some(x=>x.code==='scope_ambiguous_negation'));
 assert.equal(a.requiresReview,true);
});
test('disjunctive feature statements are not conflated into a single negation scope',()=>{
 const a=audit('Best coffee machine without steam wand or app control');
 assert.deepEqual(a.occurrences.map(x=>x.proposedMeaning),['excluded','unresolved']);
});
test('malformed input is rejected before processing',()=>{
 assert.throws(()=>auditRequestContext165('',schema,null),/invalid_request_context/);
 assert.throws(()=>auditRequestContext165('a'.repeat(4001),schema,null),/invalid_request_context/);
});
test('same request and category schema produce identical candidate corrections',()=>{
 const a=audit("Best coffee machine don't need a steam wand, but must have quiet");
 const b=audit("Best coffee machine don't need a steam wand, but must have quiet");
 assert.deepEqual(a,b);
 assert.deepEqual(a.candidateCorrections.map(x=>[x.aspectId,x.effect]),
  [['steam_wand','set_optional'],['quiet_operation','set_required']]);
});
test('followup remains scoped, but incorrect new requirement is not committed',()=>{
 const a=request('Best coffee machine with a steam wand','multi');
 const next=advanceUserRequest164(a.session,{turnId:'t2',question:"And I don't need a steam wand",
  language:'en',brains:[brain]});
 assert.equal(next.categoryProvenance,'scoped_followup');
 assert.ok(!next.session.dialogue?.values.some(x=>x.aspectId==='steam_wand'));
 assert.equal(next.rankingAuthorized,false);
});
test('an unresolved context issue cannot poison an earlier stored preference',()=>{
 const a=request('Best coffee machine with a steam wand','safety');
 const next=advanceUserRequest164(a.session,{turnId:'t2',question:'And under 30 cm',
  language:'en',brains:[brain]});
 assert.equal(next.action,'review_meaning');
 assert.deepEqual(next.session.dialogue?.values,a.session.dialogue?.values);
 assert.equal(next.research.sourceFactsApproved,false);
});
