import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {loadQuantityKnowledge} from '../src/quantity_knowledge.js';
import {reconstructDeclaration,reconstructTestValue} from '../src/observation_reconstruction.js';

// S87e: reconstruction of contract slots from document context (shadow). Every example is invented for this test.
const qk=loadQuantityKnowledge();
const decl=(label:string,raw:string,valueJson:Record<string,unknown>,extra:Record<string,unknown>={})=>({label,rawValue:raw,valueJson,...extra});
test('S87e declarations: the kind comes from the unit knowledge; a unit stated in a header is found by role filling',()=>{
 assert.equal(reconstructDeclaration(qk,decl('Rated power','1200 W',{kind:'quantity',number:1200,unit:'W'}),'C').quantityKind.value,'power');
 const noUnit=decl('Weight','2.3',{kind:'number',number:2.3},{colHeader:'Weight (kg)'});
 assert.equal(reconstructDeclaration(qk,noUnit,'A').quantityKind.state,'undetermined','A reads only the value and its label');
 assert.equal(reconstructDeclaration(qk,noUnit,'B').quantityKind.value,'mass','B finds the unit in the column header');
 assert.equal(reconstructDeclaration(qk,decl('Price','£55',{kind:'price',amount:55,currency:'GBP'}),'C').quantityKind.value,'price');
});
test('S87e declarations: conditions are the label\'s modifiers; scales come from knowledge; nothing is invented',()=>{
 const r=reconstructDeclaration(qk,decl('Power consumption (sleep mode)','<0.5 W',{kind:'quantity',number:0.5,unit:'W'}),'C');
 assert.ok(r.constraints.some(c=>/sleep/.test(c.value)));
 assert.equal(reconstructDeclaration(qk,decl('Energy class','B',{kind:'text',text:'B'}),'C').categoricalScale.value,'ordinal');
 assert.equal(reconstructDeclaration(qk,decl('Remote control','Yes',{kind:'boolean',value:true}),'C').categoricalScale.value,'boolean');
 const plain=reconstructDeclaration(qk,decl('Colour','Red',{kind:'text',text:'Red'}),'C');
 assert.equal(plain.basis.state,'undetermined');assert.equal(plain.procedure.state,'undetermined');assert.deepEqual(plain.constraints,[]);
 const gross=decl('Gross weight','5 kg',{kind:'quantity',number:5,unit:'kg'});
 assert.equal(reconstructDeclaration(qk,gross,'C').objectOfInterest.state,'undetermined','the rejected object rule is off by default');
 assert.equal(reconstructDeclaration(qk,gross,'C',{rejectedObjectRule:true}).objectOfInterest.value,'package','only for reproducing the first run');
});
test('S87e test values: a value alone in a table cell takes its basis and property from the row header',()=>{
 const bare=reconstructTestValue(qk,{value:0.9,unit:'kWh',block:'0.9 kWh',offset:0},'C');
 assert.equal(bare.basis.state,'undetermined','no words, no basis');
 const cell=reconstructTestValue(qk,{value:0.9,unit:'kWh',block:'0.9 kWh',offset:0,rowHeader:'Energy consumption eco clean',colHeader:'Model X'},'C');
 assert.equal(cell.quantityKind.value,'energy');assert.equal(cell.basis.value,'per_cycle_or_use');assert.match(cell.property.value!,/energy consumption/);
 for(const s of [cell.quantityKind,cell.basis,cell.property])assert.ok(s.rule,'every inferred slot names its rule');
});
test('S87e reconstruction is shadow: no operational module imports it',()=>{
 const dir=new URL('../../src/',import.meta.url);const users=readdirSync(dir).filter(f=>f.endsWith('.ts')&&f!=='observation_reconstruction.ts'&&/observation_reconstruction/.test(readFileSync(new URL(f,dir),'utf8')));
 assert.deepEqual(users,[]);
});
