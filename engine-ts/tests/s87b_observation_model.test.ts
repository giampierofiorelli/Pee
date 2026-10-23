import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadQuantityKnowledge} from '../src/quantity_knowledge.js';
import {classifyCondition87,interpretObservation87,measurandBasis87} from '../src/observation_model.js';

// S87b: the category-free observation model. Every example is invented for this test (none comes from the evaluation corpus).
const qk=loadQuantityKnowledge();
const cls=(t:string,k:string|null=null)=>classifyCondition87(qk,t,k);
test('S87b conditions are typed by structure: another quantity by its kind, settings, instruments, methods',()=>{
 assert.deepEqual([cls('at 2 m').class,cls('at 2 m').kind],['quantity','length']);
 assert.deepEqual([cls('ambient 23 °C').class,cls('ambient 23 °C').kind],['quantity','temperature']);
 assert.equal(cls('eco programme').class,'operating_setting');
 assert.equal(cls('fan level 3').class,'operating_setting');
 assert.equal(cls('decibel meter at 1 m').class,'instrument','the head of the phrase decides');
 assert.equal(cls('IEC 60436 procedure').class,'method_or_protocol');
 assert.equal(cls('from cold').class,'procedure_state');
 assert.equal(cls('same load in both machines').class,'comparison_or_basis','a relation between observations is the design, whatever it mentions');
 assert.equal(cls('PM2.5 challenge').class,'sample_or_challenge');
 assert.equal(cls('after three hours').kind,'duration','number words are numbers');
 assert.equal(cls('qwerty').class,'unclassified','no cue: abstain');
});
test('S87b the value\'s own kind is not a condition axis; money is a quantity',()=>{
 assert.notEqual(cls('at 45 dB',null).class,'unclassified');
 const m=interpretObservation87(qk,{value:12,unit:'p',words:'cost of one cycle',conditions:['tariff 24.5p/kWh']});
 assert.equal(m.measurand.kind,'price_or_cost');assert.equal(m.conditions[0]!.kind,'price_or_tariff');
});
test('S87b measurand basis: per task, per time period, from words or unit',()=>{
 assert.equal(measurandBasis87('energy per cycle','kWh').basis,'per_task_or_cycle');
 assert.equal(measurandBasis87('running cost','£/yr').basis,'per_time_period');
 assert.equal(measurandBasis87('annual consumption','kWh').basis,'per_time_period');
 assert.equal(measurandBasis87('peak output','W').basis,'none');
 assert.equal(interpretObservation87(qk,{value:9,unit:'min',words:'time to boil a litre'}).measurand.basis,'per_task_or_cycle','a duration naming its end state lasts one task');
});
test('S87b comparability key: same kind, basis and settings align; a different setting does not',()=>{
 const a=interpretObservation87(qk,{value:50,unit:'W',words:'power draw',conditions:['fan level 3']});
 const b=interpretObservation87(qk,{value:55,unit:'W',words:'power draw',conditions:['fan level 3']});
 const c=interpretObservation87(qk,{value:20,unit:'W',words:'power draw',conditions:['fan level 1']});
 assert.equal(a.comparabilityKey,b.comparabilityKey);assert.notEqual(a.comparabilityKey,c.comparabilityKey);
});
test('S87b the model never consults category teaching or the store (category-free by construction)',()=>{
 const src=readFileSync(new URL('../../src/observation_model.ts',import.meta.url),'utf8');
 assert.doesNotMatch(src,/phase246_knowledge_store|categoryItems|CATEGORY_REGISTRY|phase27\d_category_teaching/);
});
