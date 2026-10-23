import {test} from 'node:test';
import assert from 'node:assert/strict';
import {trackNeedConversation176,type Turn176} from '../src/phase176_turn_state_ledger.js';
const user=(turnId:string,text:string):Turn176=>({turnId,speaker:'user',text});
const assistant=(turnId:string,text:string):Turn176=>({turnId,speaker:'assistant',text});
const run=(...turns:Turn176[])=>trackNeedConversation176(turns);
const two=(first:string,second:string)=>run(user('u1',first),user('u2',second));
const categories:[string,string][]=[
 ['I need a water filter for my kitchen','drinking_water_filter'],
 ['I need an espresso machine','coffee_machine'],
 ['I want a pasta roller','pasta_roller'],
 ['I want an electric kettle','electric_kettle'],
 ['I need a vacuum cleaner','vacuum_cleaner'],
 ['I want a robot vacuum','robot_vacuum'],
 ['I need a grinder for espresso','coffee_grinder'],
];
for(const [q,id] of categories)test(`single-prior referent candidate: ${id}`,()=>{
 const x=two(q,'I want that one.');
 assert.deepEqual(x.latestUserFocus,[id]);
 assert.equal(x.references[0].resolvedEquipment,id);
 assert.equal(x.references[0].grounding,'previous_user_turn_unique_candidate');
 assert.equal(x.references[0].referenceVerified,false);
});
test('quote in a user message is retained, never treated as user request',()=>{
 const x=run(user('u1','The reviewer says "I need a robot vacuum". I need a coffee grinder.'));
 assert.equal(x.entries[0].observed.find(m=>m.equipment==='robot_vacuum')?.status,'quoted_or_reported');
 assert.deepEqual(x.latestUserFocus,['coffee_grinder']);
 assert.ok(x.unresolvedIssues.includes('reported_text_is_not_user_requirement'));
});
test('reporting attribution via phase154 context is not user need',()=>{
 const x=run(user('u1','The reviewer says I need a pasta roller.'));
 assert.equal(x.entries[0].observed[0].status,'quoted_or_reported');
 assert.deepEqual(x.latestUserFocus,[]);
});
test('friends report does not turn into user purchase',()=>{
 const x=run(user('u1','My friend says I need a water filter.'));
 assert.equal(x.entries[0].observed[0].status,'quoted_or_reported');
 assert.deepEqual(x.latestUserFocus,[]);
});
test('conditional need not an unconditional demand',()=>{
 const x=run(user('u1','If I need a pasta roller, I will ask.'));
 assert.equal(x.entries[0].observed[0].status,'conditional_or_uncertain');
 assert.deepEqual(x.latestUserFocus,[]);
});
test('uncertain need not a confirmed requirement',()=>{
 const x=run(user('u1','Maybe I need a kettle.'));
 assert.equal(x.entries[0].observed[0].status,'conditional_or_uncertain');
 assert.deepEqual(x.latestUserFocus,[]);
});
test('two targets do not yield a single referent',()=>{
 const x=two('I want a coffee grinder and espresso machine.','I prefer that one.');
 assert.equal(x.references[0].resolvedEquipment,null);
 assert.ok(x.unresolvedIssues.includes('anaphora_ambiguous_or_unresolved'));
 assert.match(x.clarification??'',/Which product/);
});
test('prior owned equipment not automatically focus',()=>{
 const x=two('I already have an espresso machine.','I want that one.');
 assert.equal(x.references[0].resolvedEquipment,null);
});
test('prior comparison not treated as settled choice',()=>{
 const x=two('Do I need a pasta maker or should I work by hand?','I want that one.');
 assert.equal(x.references[0].referenceVerified,false);
 assert.equal(x.hardExclusionsAuthorized,false);
});
test('intervening assistant message blocks referent inference',()=>{
 const x=run(user('u1','I need a kettle.'),assistant('a1','A grinder could work better.'),user('u2','I want that one.'));
 assert.equal(x.references[0].resolvedEquipment,null);
});
test('quoted anaphora does not resolve',()=>{
 const x=two('I need a coffee grinder.','A friend said "I want that one".');
 assert.equal(x.references[0].resolvedEquipment,null);
});
test('hypothetical anaphora does not resolve',()=>{
 const x=two('I need a coffee grinder.','If I want it, I will ask.');
 assert.equal(x.references[0].resolvedEquipment,null);
});
test('referent without action not resolved',()=>{
 const x=two('I need a coffee grinder.','It looks shiny.');
 assert.equal(x.references[0].resolvedEquipment,null);
});
test('explicit material change flags need for criteria snapshot',()=>{
 const x=two('I want a robot vacuum.','Actually I want that one.');
 assert.equal(x.revision,'explicit_correction_candidate');
 assert.ok(x.unresolvedIssues.includes('revision_requires_user_confirmed_criteria_snapshot'));
 assert.equal(x.choiceChangeAuthorized,false);
});
test('alternative frame not proof of a new winner',()=>{
 const x=two('I need a pasta machine.','On second thought I want a different one.');
 assert.equal(x.revision,'possible_revision');
 assert.equal(x.rankingAuthorized,false);
});
test('more than one named category in current turn blocks pronoun reference',()=>{
 const x=two('I need a kettle.','I want a coffee grinder and I want that one.');
 assert.equal(x.references[0].resolvedEquipment,null);
 assert.deepEqual(x.latestUserFocus,['coffee_grinder']);
});
test('current explicit target replaces previous, without verified preference transfer',()=>{
 const x=two('I need a kettle.','Actually I need a coffee grinder.');
 assert.deepEqual(x.latestUserFocus,['coffee_grinder']);
 assert.equal(x.userNeedValidated,false);
});
test('assistant-only text produces no need inference',()=>{
 const x=run(assistant('a1','I recommend a pasta extruder.'),user('u2','I agree.'));
 assert.deepEqual(x.latestUserFocus,[]);
 assert.equal(x.entries[0].original175,null);
});
test('quoted words preserve exact character offsets',()=>{
 const q='The reviewer says "I need a water filter"; I want an electric kettle.';
 const x=run(user('u1',q));
 for(const m of x.entries[0].observed)assert.equal(q.slice(m.start,m.end),m.originalSpan);
});
test('same literal turns yield byte-stable output',()=>{
 const turns=[user('u1','I want a kettle.'),user('u2','I want that one.')];
 assert.deepEqual(run(...turns),run(...turns));
});
test('surface change affects conversation hash even if bounded focus equal',()=>{
 const a=two('I want a kettle.','I want that one.');
 const b=two('I need a kettle.','I want that one.');
 assert.notEqual(a.conversationSha256,b.conversationSha256);
 assert.equal(a.workingStateSignature,b.workingStateSignature);
 assert.equal(a.userNeedValidated,false);
});
test('change of semantic target changes bounded working signature',()=>{
 const a=two('I need an electric kettle.','I want that one.');
 const b=two('I need a pasta roller.','I want that one.');
 assert.notEqual(a.workingStateSignature,b.workingStateSignature);
});
test('cannot replay stale phase175 authority flags through mutation of ledger',()=>{
 const x=run(user('u1','I need a kettle.'));
 assert.equal(x.entries[0].original175?.rankingAuthorized,false);
 assert.equal(x.productEvidenceVerified,false);
 assert.equal(x.sourceMeasurementsVerified,false);
 assert.equal(x.independentSemanticAccuracyMeasured,false);
 assert.equal(x.referenceIdentityVerified,false);
});
test('unique turn IDs required',()=>assert.throws(()=>run(user('same','I need a kettle.'),user('same','I want that one.')),/invalid_turn/));
test('bounded utterance count',()=>assert.throws(()=>run(...Array.from({length:13},(_,i)=>user(`u${i}`,'I need a kettle.'))),/invalid_turn_count/));
test('long request rejected instead of silently truncating',()=>assert.throws(()=>run(user('u1','a'.repeat(4001))),/invalid_turn/));
test('empty or tiny turn rejected',()=>assert.throws(()=>run(user('u1','ok')),/invalid_turn/));
test('last turn must be from user',()=>assert.throws(()=>run(user('u1','I want a kettle.'),assistant('a1','Okay.')),/last_turn/));
test('unsupported language is rejected',()=>assert.throws(()=>trackNeedConversation176([user('u1','Voglio un bollitore.')],'it' as never),/english_only/));
test('unknown product falls back to abstention',()=>{
 const x=run(user('u1','I need an induction motor for a milling machine.'));
 assert.deepEqual(x.latestUserFocus,[]);assert.ok(x.clarification);
});
test('third party item without explicit buyer need not active focus',()=>{
 const x=run(user('u1','My parents own a central vacuum.'));
 assert.deepEqual(x.latestUserFocus,[]);
});
test('metadata never claims ranking across categories and revisions',()=>{
 for(const q of ['I want a coffee grinder.','I need a water filter for lead.','Do I need a pasta machine?','My parents say I need a kettle.']){
  const x=run(user('u1',q));
  for(const k of ['userNeedValidated','rankingAuthorized','hardExclusionsAuthorized','choiceChangeAuthorized','productEvidenceVerified','sourceMeasurementsVerified','referenceIdentityVerified'] as const)assert.equal(x[k],false);
 }
});
test('negative revision correctly removes active target without treating it as a veto',()=>{
 const x=two('I want an electric kettle.','Actually I no longer want it.');
 assert.deepEqual(x.latestUserFocus,[]);
 assert.equal(x.references[0].resolvedEquipment,'electric_kettle');
 assert.equal(x.references[0].stance,'rejected_candidate');
 assert.ok(x.unresolvedIssues.includes('referenced_candidate_rejected_no_new_target_assumed'));
 assert.equal(x.hardExclusionsAuthorized,false);
});
test('uncertain reference is a link but not a confirmed demand',()=>{
 const x=two('I need a coffee grinder.','I am not sure whether I want that one.');
 assert.deepEqual(x.latestUserFocus,[]);
 assert.equal(x.references[0].stance,'uncertain_candidate');
 assert.equal(x.references[0].referenceVerified,false);
});
test('reported claim and separate user need preserve attribution',()=>{
 const x=run(user('u1','I need a vacuum but my friend says I need a robot vacuum.'));
 assert.deepEqual(x.latestUserFocus,['vacuum_cleaner']);
 assert.equal(x.entries[0].observed.find(m=>m.equipment==='robot_vacuum')?.status,'quoted_or_reported');
});
test('conditional dependent equipment is not a direct purchase need',()=>{
 const x=run(user('u1','If I get an espresso machine I will need a grinder.'));
 assert.deepEqual(x.latestUserFocus,[]);
 assert.ok(x.unresolvedIssues.includes('conditional_need_not_confirmed'));
});
