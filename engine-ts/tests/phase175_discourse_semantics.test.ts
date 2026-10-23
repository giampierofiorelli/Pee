import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeNeedDiscourse175} from '../src/phase175_disclosure_semantics.js';
import {researchCategoryTransfer174} from '../src/phase174_category_transfer_probe.js';
const run=(q:string)=>analyzeNeedDiscourse175({question:q,language:'en'});
const role=(q:string,f:string)=>run(q).equipment.filter(x=>x.equipment===f).map(x=>x.role);
const examples:[string,string,string][]=[
 ['I already have an espresso machine; I need a coffee grinder.','coffee_machine','already_owned'],
 ['I already have an espresso machine; I need a coffee grinder.','coffee_grinder','requested'],
 ['I currently own a coffee machine; I am looking for a grinder.','coffee_grinder','requested'],
 ['My parents have a vacuum, but I want a robot vacuum.','vacuum_cleaner','third_party_owned'],
 ['My parents have a vacuum, but I want a robot vacuum.','robot_vacuum','requested'],
 ['I have a water filter but need a kettle.','drinking_water_filter','already_owned'],
 ['I have a water filter but need a kettle.','kettle_unspecified','requested'],
 ['I do not own a kettle. I need an electric kettle.','kettle_unspecified','explicitly_not_owned'],
 ['I do not own a kettle. I need an electric kettle.','electric_kettle','requested'],
 ['Need a stovetop kettle for my gas hob.','stovetop_kettle','requested'],
 ['I need a pasta roller.','pasta_roller','requested'],
 ['I want to buy a pasta extruder.','pasta_extruder','requested'],
 ['I have a pasta maker but I do not want a pasta extruder.','pasta_extruder','excluded'],
 ['I have a pasta maker but I do not want a pasta extruder.','pasta_maker_unspecified','already_owned'],
 ['I want a water filter but reverse osmosis is not an option.','reverse_osmosis_system','excluded'],
 ['I want a water filter but reverse osmosis is not an option.','drinking_water_filter','requested'],
 ['My parents own a central vacuum but I need a cordless vacuum.','central_vacuum','third_party_owned'],
 ['My parents own a central vacuum but I need a cordless vacuum.','vacuum_cleaner','requested'],
 ['We own a robot vacuum and need a water filter.','robot_vacuum','already_owned'],
 ['We own a robot vacuum and need a water filter.','drinking_water_filter','requested'],
 ['I am looking for a hand-crank pasta roller.','pasta_roller','requested'],
 ['I have a coffee grinder but I want an espresso machine.','coffee_grinder','already_owned'],
 ['I have a coffee grinder but I want an espresso machine.','coffee_machine','requested'],
];
for(const [q,eq,expected] of examples)test(`role ${expected}: ${q} [${eq}]`,()=>{
 assert.ok(role(q,eq).includes(expected as never),JSON.stringify(run(q).equipment));
});
test('robot vacuum never double counts suffix vacuum',()=>{
 const x=run('My parents have an old vacuum; I want a robot vacuum for them.');
 assert.equal(x.equipment.length,2);assert.deepEqual(x.requestedEquipment,['robot_vacuum']);
});
test('multiple equipment can share one explicit budget',()=>{
 const x=run('I need an espresso machine and grinder. My total budget is $1500 for both.');
 assert.deepEqual(x.requestedEquipment,['coffee_grinder','coffee_machine']);
 assert.deepEqual(x.budget,{currency:'USD',min:null,max:1500,scope:'shared_across_devices',validated:false});
 assert.ok(x.relationshipCandidates.some(r=>r.relation==='shared_purchase_goal'));
});
test('one budget mentioned without clear joint scope cannot be silently shared',()=>{
 const x=run('I need an espresso machine and grinder. Budget $1500.');
 assert.equal(x.budget?.scope,'single_device_or_unresolved');
 assert.ok(x.unresolvedIssues.includes('multiple_requested_devices_no_verified_shared_budget'));
});
test('currency cannot be assumed',()=>assert.equal(run('I need a coffee grinder. Budget 350').budget,null));
test('two competing prices are not silently merged',()=>assert.equal(run('I want a coffee grinder under $300 and an espresso machine under $1200.').budget,null));
test('range parses only when currency and budget context are explicit',()=>{
 assert.deepEqual(run('I need a coffee grinder; budget £200-£350.').budget,
  {currency:'GBP',min:200,max:350,scope:'single_device_or_unresolved',validated:false});
});
test('comparison between technologies is not product shopping',()=>{
 const x=run('Which is better, a water filter or RO system?');
 assert.equal(x.task,'solution_comparison');assert.equal(x.requestedEquipment.length,0);
 assert.deepEqual(x.equipment.map(e=>e.role),['compared','compared']);
});
test('do I need a pasta machine versus making pasta by hand remains comparison',()=>{
 const x=run('Do I really need a pasta machine, or should I make it by hand?');
 assert.equal(x.task,'solution_comparison');assert.equal(x.rankingAuthorized,false);
 assert.ok(x.unknownNeeds.includes('manual_method_may_be_comparator'));
});
test('PFAS from original request is not evidence of certified removal',()=>{
 const x=run('I need a water filter to remove PFAS.');
 assert.equal(x.productEvidenceVerified,false);assert.equal(x.rankingAuthorized,false);
 assert.ok(x.unknownNeeds.includes('specific_contaminant_and_verified_reduction_method'));
 assert.equal(x.inherited174.rankingAuthorized,false);
});
test('unknown unsupported product keeps abstention',()=>{
 const x=run('I need a good espresso tamper with a flat base.');
 assert.equal(x.equipment.length,0);assert.ok(x.unresolvedIssues.includes('no_equipment_anchor_verified'));
});
test('unclear generic kettle does not become an electric one',()=>{
 const x=run('I want a kettle for tea.');assert.deepEqual(x.requestedEquipment,['kettle_unspecified']);
 assert.match(x.clarification??'',/stovetop.*electric/);
});
test('same known roles can yield same limited signature, not universal entailment',()=>{
 const a=run('I already have an espresso machine and need a grinder.');
 const b=run('I have an espresso machine and I need a grinder.');
 assert.equal(a.knownRoleSignature,b.knownRoleSignature);
 assert.notEqual(a.requestSha256,b.requestSha256);
 assert.equal(a.domainSemanticUnderstandingValidated,false);
});
test('materially different ownership changes known-role signature',()=>{
 const a=run('I have an espresso machine and need a grinder.');
 const b=run('I need an espresso machine and grinder.');
 assert.notEqual(a.knownRoleSignature,b.knownRoleSignature);
});
test('explicit negative role changes known-role signature',()=>{
 const a=run('I need an electric kettle.');const b=run('I do not own a kettle. I need an electric kettle.');
 assert.notEqual(a.knownRoleSignature,b.knownRoleSignature);
});
test('source spans are exact copies of the raw question',()=>{
 const q='My parents have a central vacuum but I need a coffee grinder.';
 const x=run(q);
 for(const e of x.equipment){assert.equal(e.span,q.slice(e.start,e.end));
  if(e.roleEvidence)assert.equal(e.roleEvidence.span,q.slice(e.roleEvidence.start,e.roleEvidence.end));}
});
test('phase174 baseline is recomputed exactly and a fake one is rejected',()=>{
 const q='I need a water filter for lead';const base=researchCategoryTransfer174({question:q,language:'en'});
 assert.equal(run(q).inherited174.requestSha256,base.requestSha256);
 assert.equal(analyzeNeedDiscourse175({question:q,language:'en',inherited174:base}).requestSha256,base.requestSha256);
 assert.throws(()=>analyzeNeedDiscourse175({question:q,language:'en',inherited174:{...base,rankingAuthorized:true} as never}),/phase175_prior_not_recomputed/);
});
test('refuses non English mode and invalid length',()=>{
 assert.throws(()=>analyzeNeedDiscourse175({question:'I need a kettle',language:'it' as never}),/phase175_invalid_english_input/);
 assert.throws(()=>run('a'),/phase175_invalid_english_input/);
 assert.throws(()=>run('x'.repeat(5000)),/phase175_invalid_english_input/);
});
test('ranking flags remain false over diverse roles',()=>{
 for(const q of ['I need a coffee grinder and espresso machine.','I own a kettle but want a filter.','Do I need a pasta maker or not?','I want a water filter but reverse osmosis is not an option.']){
  const x=run(q);assert.equal(x.rankingAuthorized,false);assert.equal(x.choiceChangeAuthorized,false);
  assert.equal(x.productEvidenceVerified,false);assert.equal(x.hardExclusionsAuthorized,false);
  assert.ok(x.equipment.every(e=>e.roleCandidateOnly&&!e.referenceIdentityVerified));
 }
});
test('no source retrieval, new model weights or probabilistic confidence is claimed',()=>{
 const x=run('I need a robot vacuum.');
 assert.equal(x.sourceMeasurementsVerified,false);assert.equal(x.domainSemanticUnderstandingValidated,false);
});
test('person using appliance can differ from buyer',()=>{
 const x=run('I need a vacuum for my parents who cannot lift heavy equipment.');
 assert.deepEqual(x.requestedEquipment,['vacuum_cleaner']);
 assert.ok(x.unknownNeeds.includes('purchaser_vs_user_is_distinct'));
 assert.ok(x.unknownNeeds.includes('handling_accessibility_or_burden'));
});
test('old and newly requested devices remain separate role candidates',()=>{
 const x=run('I have an electric kettle but need a pasta roller.');
 assert.ok(x.relationshipCandidates.some(r=>r.relation==='existing_context_for_requested_device'));
});
test('safe behavior for punctuation and nonascii apostrophes',()=>{
 const x=run('I don’t want a pasta extruder, but I need a pasta roller.');
 assert.ok(x.requestedEquipment.includes('pasta_roller'));
 assert.equal(x.rankingAuthorized,false);
});
test('shared purchase language in authentic short extract not mistaken for ownership',()=>{
 const q="I've got about $1500 total to spend on both a grinder and an espresso machine.";
 const x=run(q);
 assert.deepEqual(x.requestedEquipment,['coffee_grinder','coffee_machine']);
 assert.equal(x.budget?.scope,'shared_across_devices');
 assert.ok(x.equipment.every(e=>e.role==='requested'));
});
test('named water contaminants qualify generic filter only as provisional context category',()=>{
 const x=run('I want a filter that will get rid of PFAS and microplastics.');
 assert.ok(x.equipment.some(e=>e.equipment==='drinking_water_filter'&&e.mentionBasis==='bounded_water_context_inference'));
 assert.ok(x.unresolvedIssues.includes('water_filter_category_from_local_contaminant_context_only'));
 assert.equal(x.rankingAuthorized,false);
});
test('coffee filter is not recast as drinking water filter',()=>{
 const x=run('I want a coffee filter for my dripper.');
 assert.ok(!x.equipment.some(e=>e.equipment==='drinking_water_filter'));
});
test('stovetop clue alone cannot invent an exact kettle category',()=>{
 const x=run('I have a gas hob and want something durable for tea.');
 assert.equal(x.equipment.length,0);
 assert.equal(x.rankingAuthorized,false);
});
test('household equipment presence differs from personal ownership',()=>{
 const x=run('My house currently has a central vacuum but I want a cordless vacuum.');
 assert.ok(x.equipment.some(e=>e.equipment==='central_vacuum'&&e.role==='existing_in_household'));
 assert.ok(x.equipment.some(e=>e.role==='requested'));
 assert.ok(x.unresolvedIssues.includes('household_equipment_presence_is_not_legal_ownership'));
});
test('explicit no RO without a full system noun is still a prohibition candidate',()=>{
 const x=run('I want a water filter, no RO.');
 assert.ok(x.equipment.some(e=>e.equipment==='reverse_osmosis_system'&&e.role==='excluded'));
 assert.equal(x.hardExclusionsAuthorized,false);
});
test('a choice whether to buy any pasta machine is not treated as committed shopping',()=>{
 const x=run('I am wondering if I really need a pasta machine at all.');
 assert.equal(x.task,'solution_comparison');
 assert.equal(x.requestedEquipment.length,0);
});

// Repair cases discovered after recovering an interrupted Phase175 workspace.
// These are developer-authored adversarial examples, not an independent benchmark.
const explicitRoleCases:[string,string,string][]=[
 ["I don't want a coffee machine, I just need a grinder.",'coffee_grinder','requested'],
 ["I don't want a coffee machine, I just need a grinder.",'coffee_machine','excluded'],
 ["I don’t want a pasta extruder; I need a pasta roller.",'pasta_extruder','excluded'],
 ['I need a grinder, not an espresso machine.','coffee_machine','excluded'],
 ['I want a water filter without reverse osmosis.','reverse_osmosis_system','excluded'],
 ['I have 200 euros to spend on a kettle.','kettle_unspecified','requested'],
 ["I can't buy a water filter but I need safe drinking water.",'drinking_water_filter','excluded'],
 ["I can't afford an RO system, but need a water filter.",'reverse_osmosis_system','excluded'],
 ['I just bought an espresso machine; which coffee grinder would pair with it?','coffee_grinder','requested'],
 ['I already own a pasta roller and want to buy an extruder.','pasta_extruder','requested'],
 ['I need a pasta roller and extruder, total spend €400.','pasta_extruder','requested'],
 ['I have no vacuum but my parents do. Which should I buy?','vacuum_cleaner','explicitly_not_owned'],
 ["I need a water filter but I'm not sure if I need reverse osmosis.",'reverse_osmosis_system','unresolved'],
];
for(const [q,e,r] of explicitRoleCases)test(`recovery adversarial ${e}/${r}: ${q}`,()=>{
 const graph=run(q);
 assert.ok(graph.equipment.some(m=>m.equipment===e&&m.role===r),JSON.stringify(graph.equipment));
 assert.equal(graph.rankingAuthorized,false);
});
test('bounded bare pasta-extruder inference retains provenance and unresolved scope',()=>{
 const x=run('I need a pasta roller and extruder, total spend €400.');
 assert.ok(x.equipment.some(e=>e.equipment==='pasta_extruder'&&e.mentionBasis==='bounded_pasta_context_inference'));
 assert.ok(x.unresolvedIssues.includes('pasta_extruder_category_from_local_sentence_context_only'));
 assert.equal(x.rankingAuthorized,false);
});
test('bare industrial extruder is not silently classified as pasta equipment',()=>{
 const x=run('I need a 3D printing extruder.');
 assert.equal(x.equipment.length,0);
});
