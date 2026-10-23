import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDocumentBytes228} from '../src/phase228_document_observer.js';
const read=(name:string)=>parseDocumentBytes228(readFileSync(`evaluation/phase236/SYNTHETIC-${name}.pdf`),'pdf');

test('236: paired optional configuration creates two distinct scoped manufacturer rules',async()=>{
 const r=await read('conditional-pair');assert.equal(r.claimCount,2);
 assert.deepEqual(r.claims.map(c=>[c.label,c.value,c.unit,c.scopeComponent,c.condition]),[
  ['milk tube length',50,'cm','milk tube','fridge present'],
  ['milk tube length',40,'cm','milk tube','fridge absent']]);
 assert.deepEqual(r.claims.map(c=>c.configurationDependency?.triggerState),['present','absent']);
});
test('236: optional fridge not falsely included in the commercial product',async()=>{
 const r=await read('conditional-pair');
 for(const c of r.claims){
  assert.equal(c.model,null);assert.equal(c.modelAssignment,'unresolved');
  assert.equal(c.optionStatus,'not_established');assert.equal(c.availabilityKind,undefined);
  assert.equal(c.exactVariantVerified,false);assert.equal(c.rankingAuthorized,false);
  assert.equal(c.testedPerformance,false);assert.equal(c.sourceRole,'publisher_document_claim_unverified');
 }
});
test('236: missing otherwise branch abstains',async()=>{
 const r=await read('missing-else');assert.equal(r.claimCount,0);
});
test('236: missing explicit kit context abstains',async()=>{
 const r=await read('missing-kit');assert.equal(r.claimCount,0);
 assert.ok(r.reasonCodes.includes('pdf_configuration_component_context_unresolved'));
});
test('236: inconsistent author-written unit pairs abstain',async()=>{
 const r=await read('conflicting-conversion');assert.equal(r.claimCount,0);
 assert.ok(r.reasonCodes.includes('pdf_configuration_unit_or_branch_conflict'));
});
test('236: unrelated intervening text cannot create a conditional pair',async()=>{
 assert.equal((await read('unpaired-section')).claimCount,0);
});
test('236: even one document model does not verify a conditional SKU',async()=>{
 const r=await read('conditional-with-declared-model');assert.equal(r.claimCount,2);
 assert.ok(r.claims.every(c=>c.model===null&&c.modelAssignment==='unresolved'));
});
test('236: machine menu programme duration is a typed setting not a measurement',async()=>{
 const r=await read('program');assert.equal(r.claimCount,1);
 const c=r.claims[0];
 assert.deepEqual(c.range,{lower:6,upper:12,unit:'hours'});
 assert.deepEqual(c.programSetting,{program:'yogurt',setting:'cooking_duration',defaultValue:8,unit:'hours',context:'operating_instruction_not_test'});
 assert.equal(c.value,null);assert.equal(c.scopeComponent,'yogurt program');
 assert.equal(c.condition,'user-adjustable');assert.equal(c.rankingAuthorized,false);
 assert.equal(c.testedPerformance,false);assert.equal(c.exactVariantVerified,false);
});
test('236: food preparation advice cannot become programme specification',async()=>{
 assert.equal((await read('recipe-only')).claimCount,0);
});
test('236: contradictory bounds without valid author pairing abstain',async()=>{
 assert.equal((await read('program-contradiction')).claimCount,0);
});
test('236: two programme sections on same page refuse attribution',async()=>{
 assert.equal((await read('program-unrelated-heading')).claimCount,0);
});
test('236: duplicate statements refuse promotion',async()=>{
 assert.equal((await read('program-duplicate')).claimCount,0);
});
test('236: repeated extraction deterministic and body not stored',async()=>{
 const a=await read('conditional-pair'),b=await read('conditional-pair');
 assert.deepEqual(a,b);assert.equal(a.rawDocumentStored,false);assert.equal(a.rawTextStored,false);
 assert.equal(a.scientificEvidenceAdmitted,false);
});
