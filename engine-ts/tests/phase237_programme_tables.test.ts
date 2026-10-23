import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDocumentBytes228} from '../src/phase228_document_observer.js';
const load=async(name:string)=>parseDocumentBytes228(readFileSync(`evaluation/phase237/SYNTHETIC-${name}.pdf`),'pdf');
const table=(r:Awaited<ReturnType<typeof load>>)=>r.claims.filter(c=>c.programTableSetting);

test('237: full multi-axis programme table captures all four independent food tuples',async()=>{
 const r=await load('multi-good');assert.equal(table(r).length,4);
 assert.deepEqual(table(r).map(c=>[c.programTableSetting?.program,c.programTableSetting?.foodType,c.programTableSetting?.defaultDurationMinutes]),
  [['simmer','veg',30],['simmer','fish',40],['simmer','poultry',50],['simmer','meat',60]]);
});
test('237: all tuples preserve programme-wide adjustment and authored temperature',async()=>{
 const r=await load('multi-good');
 for(const c of table(r)){
  assert.deepEqual(c.programTableSetting?.adjustableDurationMinutes,{lower:5,upper:180});
  assert.equal(c.programTableSetting?.defaultTemperatureCelsius,100);
  assert.ok(Number.isInteger(c.locator.line)&&Number.isInteger(c.locator.row));
  assert.equal(c.programTableSetting?.context,'manufacturer_programme_table_not_test');
  assert.equal(c.unit,'operating_settings');assert.equal(c.value,null);
 }
});
test('237: product identity and scientific/ranking admission remain explicitly unresolved',async()=>{
 const r=await load('multi-good');
 for(const c of table(r)){
  assert.equal(c.model,null);assert.equal(c.modelAssignment,'unresolved');
  assert.equal(c.sourceRole,'publisher_document_claim_unverified');
  assert.equal(c.rankingAuthorized,false);assert.equal(c.methodReviewed,false);
  assert.equal(c.exactVariantVerified,false);assert.equal(c.testedPerformance,false);
  assert.equal(c.optionStatus,'not_established');
 }
 assert.equal(r.rawDocumentStored,false);assert.equal(r.rawTextStored,false);
 assert.equal(r.scientificEvidenceAdmitted,false);
});
test('237: repeated or misaligned food cells cause abstention, not an arbitrary value',async()=>{
 assert.equal(table(await load('multi-duplicate-food')).length,0);
});
test('237: missing temperature within a multi-food row must not be imputed',async()=>{
 assert.equal(table(await load('multi-no-temperature')).length,0);
});
test('237: broken adjustable duration fails closed',async()=>{
 assert.equal(table(await load('multi-broken-range')).length,0);
});
test('237: recipe timing tables are not control-setting evidence',async()=>{
 assert.equal(table(await load('multi-unrelated-recipe')).length,0);
});
test('237: simple programme one tuple with bound default',async()=>{
 const r=await load('single-good');assert.equal(table(r).length,1);
 const c=table(r)[0];assert.equal(c.programTableSetting?.program,'braise');
 assert.equal(c.programTableSetting?.foodType,null);
 assert.equal(c.programTableSetting?.defaultDurationMinutes,25);
 assert.equal(c.condition,'program default');
});
test('237: default longer than adjustable upper bound abstains',async()=>{
 const r=await load('single-bad-default');assert.equal(table(r).length,0);
 assert.ok(r.reasonCodes.includes('pdf_programme_table_default_outside_range'));
});
test('237: simple row without an authored temperature abstains',async()=>{
 assert.equal(table(await load('single-no-temperature')).length,0);
});
test('237: repeatability and no stored publisher text',async()=>{
 assert.deepEqual(await load('multi-good'),await load('multi-good'));
 assert.ok((await load('multi-good')).claims.every(c=>!('sourceText' in c)));
});
