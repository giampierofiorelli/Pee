import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadQuantityKnowledge} from '../src/quantity_knowledge.js';
import {loadPropertyDefinitions,relevanceOf} from '../src/property_definitions.js';
import {interpretWithDefinitions,compareByDefinition,definitionPlanMeasurements,attributeProperty} from '../src/definition_interpreter.js';

// S88: declarative property definitions used along the path. Every observation text is invented for this test.
const qk=loadQuantityKnowledge();const defs=loadPropertyDefinitions(qk);
const raw=()=>JSON.parse(readFileSync(new URL('../../resources/property-definitions/property-definitions.v1.json',import.meta.url),'utf8'));

test('S88 loader: every reference resolves in the quantity-knowledge pack; a broken one fails closed',()=>{
 assert.ok(defs.properties.size>=13&&defs.identity.startsWith('pd.'));
 const bad=raw();bad.properties[0].quantity.kinds=['price_or_cost'];
 assert.throws(()=>loadPropertyDefinitions(qk,bad),/kind price_or_cost/);
 const badRel=raw();badRel.properties[0].conditions.push(['tariff','essential']);
 assert.throws(()=>loadPropertyDefinitions(qk,badRel),/relevance/);
 const badState=raw();badState.properties[0].state='proven';
 assert.throws(()=>loadPropertyDefinitions(qk,badState),/state/);
 const badProfile=raw();badProfile.profiles[0].properties.push('no_such_property');
 assert.throws(()=>loadPropertyDefinitions(qk,badProfile),/no_such_property/);
});

test('S88 relevance: a profile overrides it; a basis-qualified condition defines only for its basis',()=>{
 assert.equal(relevanceOf(defs,'run_duration','room_volume','air_purifiers'),'defining');
 assert.equal(relevanceOf(defs,'run_duration','room_volume','dishwashers'),'irrelevant');
 assert.equal(relevanceOf(defs,'energy_consumption','usage_pattern',null,'per_period'),'defining');
 assert.equal(relevanceOf(defs,'energy_consumption','usage_pattern',null,'per_run'),'influencing');
});

test('S88 attribution: a unit kind only nominates; a definition term must support; equal support chooses none',()=>{
 assert.equal(attributeProperty(defs,qk,{value:0.8,unit:'kWh',label:'energy use'}).value,'energy_consumption');
 const life=attributeProperty(defs,qk,{value:8,unit:'hours',label:'battery life'});
 assert.equal(life.value,'battery_runtime','pd.2 defines battery runtime; not a run duration');
 const cycle=attributeProperty(defs,qk,{value:8,unit:'hours',label:'warranty'});
 assert.equal(cycle.value,null);assert.ok(cycle.alternatives.includes('run_duration'),'kind nominated, no term supports it');
 // outside its profile a property needs its object named: a TV's gamut coverage is not a robot's floor coverage
 assert.equal(attributeProperty(defs,qk,{value:95,unit:'%',label:'DCI-P3 gamut coverage',category:'televisions'}).value,null);
 assert.equal(attributeProperty(defs,qk,{value:98,unit:'%',label:'coverage',category:'robot_floor_cleaners'}).value,'coverage');
 assert.equal(attributeProperty(defs,qk,{value:2000,unit:'nits',label:'peak brightness'}).rule,'no_definition_admits_unit_kind');
 assert.equal(attributeProperty(defs,qk,{value:30,unit:'£',label:'running cost'}).value,'running_cost');
});

test('S88 interpretation: conditions typed by dimension with relevance; missing defining dimensions; basis as INI only when a run is named',()=>{
 const r=interpretWithDefinitions(defs,qk,{value:0.85,unit:'kWh',label:'energy use, eco programme, full load',category:'dishwashers'});
 assert.deepEqual(r.conditions.map(c=>[c.dimension,c.value,c.relevance]),[['programme','eco','defining'],['load','full','defining']]);
 assert.deepEqual(r.missingDefining,[]);assert.deepEqual([r.basis.value,r.basis.state],['per_run','inferred']);
 const noRun=interpretWithDefinitions(defs,qk,{value:0.85,unit:'kWh',label:'energy use',category:'dishwashers'});
 assert.equal(noRun.basis.state,'unknown','no run named: the default basis is not assumed');
 const t=interpretWithDefinitions(defs,qk,{value:12,unit:'min',label:'time to clear smoke',context:'on top speed in our test room',conditions:['laser particle counter'],category:'air_purifiers'});
 assert.equal(t.property.value,'run_duration');
 assert.ok(t.conditions.some(c=>c.dimension==='instrument'&&c.relevance==='influencing'));
 assert.ok(t.missingDefining.includes('room_volume'));
 const u=interpretWithDefinitions(defs,qk,{value:1,unit:'kWh',label:'energy use',conditions:['blue lid closed']});
 assert.deepEqual(u.untyped,['blue lid closed'],'an untyped condition is kept, never dropped');
});

test('S88 Q1: defining dimensions decide; unknown ones leave conditions unestablished; one protocol compares within its source',()=>{
 const i=(label:string)=>interpretWithDefinitions(defs,qk,{value:1,unit:'kWh',label,category:'dishwashers'});
 assert.equal(compareByDefinition(defs,i('energy use, eco programme, full load'),i('energy use, intensive programme, full load')).verdict,'not_comparable');
 assert.equal(compareByDefinition(defs,i('energy use, eco programme, full load'),i('energy use, eco programme, full load')).verdict,'comparable');
 assert.equal(compareByDefinition(defs,i('energy use, eco programme'),i('energy use, eco programme')).verdict,'conditions_unestablished');
 assert.equal(compareByDefinition(defs,i('energy use, eco programme'),i('energy use, eco programme'),{sameSourceProtocol:true}).verdict,'comparable_within_source');
});

test('S88 G1: removing one definition changes reading, attribution, interpretation and comparability together',()=>{
 const without=raw();without.properties=without.properties.filter((p:{id:string})=>p.id!=='energy_consumption');
 for(const pr of without.profiles){pr.properties=pr.properties.filter((x:string)=>x!=='energy_consumption');delete pr.relevance.energy_consumption;}
 const d2=loadPropertyDefinitions(qk,without);const o={value:0.85,unit:'kWh',label:'energy use, eco programme, full load',category:'dishwashers'};
 const a=interpretWithDefinitions(defs,qk,o),b=interpretWithDefinitions(d2,qk,o);
 assert.ok(definitionPlanMeasurements(defs,qk,'dishwashers').some(m=>m.id==='energy_consumption'));
 assert.ok(!definitionPlanMeasurements(d2,qk,'dishwashers').some(m=>m.id==='energy_consumption'),'reading');
 assert.equal(a.property.value,'energy_consumption');assert.equal(b.property.value,null,'attribution');
 assert.equal(a.basis.value,'per_run');assert.equal(b.basis.value,null,'interpretation (basis)');
 assert.ok(a.conditions.every(c=>c.relevance==='defining'));assert.ok(b.conditions.every(c=>c.relevance===null),'interpretation (relevance)');
 assert.equal(compareByDefinition(defs,a,a).verdict,'comparable');assert.equal(compareByDefinition(d2,b,b).verdict,'undetermined','evaluation');
});

test('S88 shadow: no operational module imports the definitions',()=>{
 const src=(f:string)=>readFileSync(new URL('../../src/'+f,import.meta.url),'utf8');
 for(const f of ['phase253_request_advice.ts','phase265_test_measurements.ts','phase272_extraction_plan.ts','phase246_knowledge_store.ts'])
  assert.ok(!/property_definitions|definition_interpreter/.test(src(f)),f);
});
