import test from 'node:test';
import assert from 'node:assert/strict';
import {validateModel116,auditCategoryTemplate116,evaluateCategory116,ROBOT_FLOOR_MODEL116,DISHWASHER_MODEL116,HEADPHONES_MODEL116,adaptHygiene115ToCategory116,type Observed116,type Product116,type CategoryModel116} from '../src/phase116_category_function_model.js';
const URL='https://review.example.org/original';
function obs(nodeId:string,overrides:Partial<Observed116>={}):Observed116{
 const target:Record<string,string>={mop_dock_periodic:'pad',mop_roller_continuous:'pad',water_dirty_onboard:'dirty_water',mop_dock_after:'pad',mop_dock_before:'pad',result_stains:'floor',result_transfer:'floor',result_microbe_floor:'floor'};
 return {nodeId,finding:'present',basis:'independent_observed',sourceUrl:URL,originalTestId:'lab1',condition:'floor:tile; mode:normal',productVariant:'alpha',target:target[nodeId],...overrides};
}
const product=(...observations:Observed116[]):Product116=>({variant:'alpha',observations});
const run=(p:Product116)=>evaluateCategory116(ROBOT_FLOOR_MODEL116,[p],'snapshot116');
const row=(p:Product116)=>run(p).products[0];
const find=(p:Product116,nodeId:string)=>row(p).nodeStates.find(x=>x.nodeId===nodeId)!;

test('model is extensible to three product categories',()=>{for(const c of [ROBOT_FLOOR_MODEL116,DISHWASHER_MODEL116,HEADPHONES_MODEL116])assert.doesNotThrow(()=>validateModel116(c));});
test('category duplication is rejected',()=>{const c:CategoryModel116={...ROBOT_FLOOR_MODEL116,endpoints:[...ROBOT_FLOOR_MODEL116.endpoints,{...ROBOT_FLOOR_MODEL116.endpoints[0]}]};assert.throws(()=>validateModel116(c),/duplicate_node/);});
test('unsupported mechanism relation is rejected',()=>{const c={...ROBOT_FLOOR_MODEL116,links:[{from:'absent',to:'goal_clean_floor',kind:'may_support' as const,qualification:'x'}]};assert.throws(()=>validateModel116(c),/invalid_link/);});
test('rinsing roller is continuous, dock return is periodic, not equivalent',()=>{let r=row(product(obs('mop_roller_continuous'),obs('mop_dock_periodic',{originalTestId:'lab2'})));assert.deepEqual(r.observedMechanisms.map(x=>[x.id,x.cadence]),[['mop_dock_periodic','periodic'],['mop_roller_continuous','continuous']]);});
test('continuous roller generates hypothesis, never microbiology assay',()=>{let r=row(product(obs('mop_roller_continuous')));assert.equal(r.measuredOutcomes.length,0);assert.ok(r.mechanisticHypotheses.some(x=>x.to==='goal_limit_transfer'));assert.ok(r.unmeasuredEndpoints.includes('result_microbe_floor'));});
test('periodic dock visit can support process but does not imply continuous rinsing',()=>{let r=row(product(obs('mop_dock_periodic')));assert.equal(r.observedMechanisms.some(x=>x.id==='mop_roller_continuous'),false);assert.equal(r.mechanisticHypotheses.length,1);});
test('wash after run is not inferred as pre-wash',()=>{let r=row(product(obs('mop_dock_after')));assert.equal(r.nodeStates.find(x=>x.nodeId==='mop_dock_before')?.status,'unknown');});
test('dirty-water tank is unknown unless supported for that exact product',()=>{let r=row(product(obs('mop_roller_continuous')));assert.equal(r.nodeStates.find(x=>x.nodeId==='water_dirty_onboard')?.status,'unknown');});
test('manufacturer-only mechanism is retained but does not trigger independent hypothesis',()=>{let r=row(product(obs('water_dirty_onboard',{basis:'manufacturer_declared'})));assert.deepEqual(r.manufacturerOnlyMechanisms,['water_dirty_onboard']);assert.equal(r.mechanisticHypotheses.length,0);});
test('negative independent observation does not become unknown or positive',()=>{let r=row(product(obs('water_dirty_onboard',{finding:'absent'})));assert.equal(r.nodeStates.find(x=>x.nodeId==='water_dirty_onboard')?.status,'contradicted');assert.equal(r.observedMechanisms.length,0);});
test('different original tests with contradictory claims under SAME context are conflicting',()=>{let r=row(product(obs('water_dirty_onboard'),obs('water_dirty_onboard',{originalTestId:'lab2',finding:'absent'})));assert.equal(r.nodeStates.find(x=>x.nodeId==='water_dirty_onboard')?.status,'conflicting');assert.equal(r.mechanisticHypotheses.length,0);});
test('contextual variation across modes is not falsely recorded as experiment conflict',()=>{let r=row(product(obs('water_dirty_onboard',{condition:'auto',mode:'auto'}),obs('water_dirty_onboard',{originalTestId:'lab2',finding:'absent',condition:'eco',mode:'eco'})));assert.equal(r.nodeStates.find(x=>x.nodeId==='water_dirty_onboard')?.status,'context_dependent');assert.equal(r.mechanisticHypotheses.length,0);assert.equal(find(product(obs('water_dirty_onboard',{condition:'auto',mode:'auto'}),obs('water_dirty_onboard',{originalTestId:'lab2',finding:'absent',condition:'eco',mode:'eco'})),'water_dirty_onboard').byContext.length,2);});
test('direct measured endpoint is required for a performance result',()=>{let r=row(product(obs('result_stains',{basis:'independent_measured',value:81,unit:'percent_soil_removed',testProtocol:'lab_test_v1'})));assert.equal(r.measuredOutcomes[0].measurements[0].value,81);assert.ok(r.unmeasuredEndpoints.includes('result_microbe_floor'));});
test('independent adjective cannot be promoted to numerical measurement',()=>{assert.throws(()=>run(product(obs('result_stains',{value:83}))),/numeric_measurement_without_test/);});
test('manufacturer cannot claim an independent measured result',()=>{assert.throws(()=>run(product(obs('result_microbe_floor',{basis:'independent_measured',value:99.9,unit:'percent'}))),/measurement_not_supported/);});
test('measured endpoint cannot be fabricated by attaching number to feature',()=>{assert.throws(()=>run(product(obs('mop_roller_continuous',{basis:'independent_measured',value:1,unit:'times',testProtocol:'v1'}))),/measurement_not_supported/);});
test('source product variant and target cannot be switched',()=>{assert.throws(()=>run(product(obs('mop_roller_continuous',{productVariant:'beta'}))),/wrong_node_variant_or_target/);assert.throws(()=>run(product(obs('mop_roller_continuous',{target:'floor'}))),/wrong_node_variant_or_target/);});
test('same original test syndication cannot multiply evidence',()=>{let a=obs('mop_roller_continuous');let b={...a,sourceUrl:'https://syndicated.example.com/article'};let r=row(product(a,b));assert.deepEqual(r.nodeStates.find(x=>x.nodeId==='mop_roller_continuous')?.independentOriginalTests,['lab1']);});
test('same original test incompatible metadata fails closed',()=>{assert.throws(()=>run(product(obs('mop_dock_after'),obs('mop_dock_after',{mode:'different_mode'}))),/same_test_conflicting_metadata/);});
test('missing evidence is unknown not failure, and no feature-count ranking',()=>{let x=run(product());assert.equal(x.rankedProducts,null);assert.equal(x.products[0].rankingEligible,false);assert.equal(x.products[0].nodeStates.every(a=>a.status==='unknown'),true);});
test('input order and observation order cannot change canonical response',()=>{let a=product(obs('mop_roller_continuous'),obs('water_dirty_onboard',{originalTestId:'lab2'}));let b:Product116={variant:'beta',observations:[]};let x=evaluateCategory116(ROBOT_FLOOR_MODEL116,[a,b],'snapshot116');let y=evaluateCategory116(ROBOT_FLOOR_MODEL116,[b,{...a,observations:[...a.observations].reverse()}],'snapshot116');assert.deepEqual(x,y);});
test('query absent from category evaluator ensures query neutral results',()=>{let a=run(product(obs('mop_dock_periodic')));assert.equal('query' in a,false);assert.equal(a.categoryModelsAreQueryNeutral,true);});
test('Phase115 adapter refuses to assume cadence from generic during-run rinsing',()=>{const y=adaptHygiene115ToCategory116([{id:'alpha',name:'Alpha',evidence:[{step:'during_cycle_pad_rinsing',target:'pad',finding:'present',origin:'independent_product_test',sourceUrl:URL,originalTestId:'lab1',method:'tester',context:'tile'}]}]);assert.equal(y.products[0].observations.length,0);assert.match(y.unresolved[0].reason,/cadence_not_identified/);});
test('Phase115 adapter maps known after-run wash conservatively',()=>{const y=adaptHygiene115ToCategory116([{id:'alpha',name:'Alpha',evidence:[{step:'post_cycle_pad_washing',target:'pad',finding:'present',origin:'independent_product_test',sourceUrl:URL,originalTestId:'lab1',method:'tester',context:'tile'}]}]);assert.equal(y.products[0].observations[0].nodeId,'mop_dock_after');assert.equal(row(y.products[0]).observedMechanisms[0].stage,'after');});
test('dishwasher template never infers sanitization from heated rinse feature',()=>{let x=evaluateCategory116(DISHWASHER_MODEL116,[{variant:'dish1',observations:[{nodeId:'hot_rinse',finding:'present',basis:'independent_observed',sourceUrl:URL,originalTestId:'lab_dish',condition:'sanitary cycle',productVariant:'dish1',target:'dishes'}]}],'snapshot116');assert.deepEqual(x.products[0].measuredOutcomes,[]);assert.ok(x.products[0].unmeasuredEndpoints.includes('bacteria_assay'));});
test('headphone template never equates ANC hardware to measured noise cancellation',()=>{let x=evaluateCategory116(HEADPHONES_MODEL116,[{variant:'hp1',observations:[{nodeId:'anc_signal',finding:'present',basis:'manufacturer_declared',sourceUrl:URL,originalTestId:'vendor',condition:'default',productVariant:'hp1',target:'ear'}]}],'snapshot116');assert.ok(x.products[0].unmeasuredEndpoints.includes('anc_test'));});
test('periodic dock cycle can preserve manufacturer-declared configurable time',()=>{
 const a=obs('mop_dock_periodic',{basis:'manufacturer_declared',activation:{trigger:'elapsed_time',intervalMinutes:20,note:'default, app adjustable'}});
 const r=row(product(a));const x=r.nodeStates.find(v=>v.nodeId==='mop_dock_periodic')!;
 assert.equal(x.status,'manufacturer_only');assert.equal(x.activations[0].activation.intervalMinutes,20);
 assert.equal(r.mechanisticHypotheses.length,0);
});
test('dock-return interval is not inferred for every floor size',()=>{
 const r=row(product(obs('mop_dock_periodic',{activation:{trigger:'elapsed_time',intervalMinutes:15},condition:'tile; app wash preset 15m'})));
 assert.equal(r.observedMechanisms[0].activations[0].activation.trigger,'elapsed_time');
 assert.equal(r.observedMechanisms[0].activations[0].activation.intervalSquareMeters,undefined);
});
test('continuous roller activation is distinguishable from time-triggered return',()=>{
 const r=row(product(obs('mop_roller_continuous',{activation:{trigger:'always_during_operation'}})));
 assert.equal(r.observedMechanisms[0].activations[0].activation.trigger,'always_during_operation');
});
test('invalid duration or area configuration cannot become a supported observation',()=>{
 assert.throws(()=>run(product(obs('mop_dock_periodic',{activation:{trigger:'elapsed_time',intervalMinutes:-20}}))),/invalid_activation/);
 assert.throws(()=>run(product(obs('mop_dock_periodic',{activation:{trigger:'covered_area',intervalMinutes:20}}))),/invalid_activation/);
});
test('microbiology results require named microorganism and retain its scope',()=>{
 const o=obs('result_microbe_floor',{basis:'independent_measured',value:2.1,unit:'log10_reduction',testProtocol:'documented_assay'});
 assert.throws(()=>run(product(o)),/target_organism_unspecified/);
 const r=row(product({...o,analyte:'specified bacterial strain'}));assert.equal(r.measuredOutcomes[0].measurements[0].analyte,'specified bacterial strain');
});

test('template audit identifies goals without tests rather than claiming category completeness',()=>{
 const r=auditCategoryTemplate116(ROBOT_FLOOR_MODEL116);
 assert.deepEqual(r.uncoveredGoals,['goal_maintain']);
 assert.equal(r.readyForExhaustiveCategoryClaim,false);
 assert.deepEqual(auditCategoryTemplate116(DISHWASHER_MODEL116).uncoveredGoals,['goal_dry']);
 assert.deepEqual(auditCategoryTemplate116(HEADPHONES_MODEL116).uncoveredGoals,['goal_audio']);
});
test('generic engine accepts a novel future category without robot-specific code',()=>{
 const c:CategoryModel116={categoryId:'future_unknown_product',modelVersion:'v116_pilot1',
 functions:[{id:'goal_new',description:'Newly discovered function',kind:'primary_goal'}],
 mechanisms:[{id:'mechanism_new',description:'Unknown process',stage:'cross_cycle',cadence:'unspecified',target:'output'}],
 endpoints:[{id:'result_new',target:'output',endpoint:'task_success',methodScope:'Future review protocol'}],
 links:[{from:'result_new',to:'goal_new',kind:'measured_by',qualification:'Measured only when independent protocol exists'}],failureModes:[],sourceUrls:[]};
 const out=evaluateCategory116(c,[{variant:'future_v1',observations:[]}],'future_snapshot');
 assert.equal(out.products[0].nodeStates.every(n=>n.status==='unknown'),true);
 assert.equal(out.rankedProducts,null);
});
