import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDocumentBytes228} from '../src/phase228_document_observer.js';
const load=(name:string)=>parseDocumentBytes228(readFileSync(`evaluation/phase239/SYNTHETIC-${name}.pdf`),'pdf');
const guide=(r:Awaited<ReturnType<typeof load>>)=>r.claims.filter(c=>c.cookingGuideSetting);
const manual=(r:Awaited<ReturnType<typeof load>>)=>r.claims.filter(c=>c.manualControlSetting);
test('239: full fictional cooking guide has two typed scoped food/drawer tuples',async()=>{
 const r=await load('guide-good');assert.equal(guide(r).length,2);
 assert.deepEqual(guide(r).map(c=>[c.cookingGuideSetting?.food,c.cookingGuideSetting?.drawer]),[['tofu cubes',1],['vegetable medley',2]]);
});
test('239: source-authored portion, cooking time range and Celsius remain inseparable',async()=>{
 const c=guide(await load('guide-good'))[0];
 assert.deepEqual(c.cookingGuideSetting?.foodLoad,{value:250,unit:'g'});
 assert.deepEqual(c.cookingGuideSetting?.durationMinutes,{lower:8,upper:12});
 assert.equal(c.cookingGuideSetting?.recommendedTemperatureCelsius,180);
});
test('239: preserve source role and prohibit promotion to science/ranking',async()=>{
 const r=await load('guide-good');
 for(const c of guide(r)){
  assert.equal(c.sourceRole,'publisher_document_claim_unverified');
  assert.equal(c.cookingGuideSetting?.context,'manufacturer_cooking_guide_not_test');
  assert.equal(c.testedPerformance,false);assert.equal(c.rankingAuthorized,false);
  assert.equal(c.methodReviewed,false);assert.equal(c.exactVariantVerified,false);
  assert.equal(c.model,null);assert.equal(c.modelAssignment,'unresolved');
  assert.equal(c.value,null);assert.equal(c.unit,'operating_recommendation');
  assert.equal(c.condition,'food: '+c.cookingGuideSetting?.food);
 }
 assert.equal(r.scientificEvidenceAdmitted,false);assert.equal(r.rawTextStored,false);
 assert.equal(r.rawDocumentStored,false);
});
test('239: incomplete row abstains, but independent complete row is retained',async()=>{
 const r=await load('guide-no-load');assert.deepEqual(guide(r).map(c=>c.cookingGuideSetting?.food),['vegetable medley']);
});
test('239: missing authored heading must not invent a table',async()=>{
 assert.equal(guide(await load('guide-no-header')).length,0);
});
test('239: repeated product+drawer association invalidates both candidate rows',async()=>{
 assert.equal(guide(await load('guide-duplicate')).length,0);
});
test('239: high temperature outside the conservative supported range abstains',async()=>{
 assert.equal(guide(await load('guide-unsupported')).length,0);
});
test('239: pictogram-only food identity abstains',async()=>{
 assert.equal(guide(await load('guide-pictograms')).length,0);
});
test('239: actual manual settings are separate typed machine control ranges',async()=>{
 const r=await load('manual-good');assert.equal(manual(r).length,2);
 assert.deepEqual(manual(r).map(c=>[c.manualControlSetting?.parameter,c.manualControlSetting?.lower,c.manualControlSetting?.upper,c.manualControlSetting?.unit]),
 [['thermostat',40,200,'°C'],['timer',0,60,'minutes']]);
});
test('239: impossible manual temperature and reversed timer refuse',async()=>{
 assert.equal(manual(await load('manual-bad')).length,0);
});
test('239: controls cannot be independent test results or product dimensions',async()=>{
 const r=await load('manual-good');
 for(const c of manual(r)){
  assert.equal(c.manualControlSetting?.context,'manufacturer_machine_control_not_test');
  assert.equal(c.testedPerformance,false);assert.equal(c.value,null);
  assert.equal(c.model,null);assert.equal(c.rankingAuthorized,false);
  assert.equal(c.unit,'operating_control');assert.equal(c.scopeComponent,'manual program');
 }
});
test('239: deterministic replay and no embedded manufacturer page bodies',async()=>{
 const a=await load('guide-good');assert.deepEqual(a,await load('guide-good'));
 assert.ok(a.claims.every(c=>!('sourceText' in c)&&!('rawPdf' in c)));
});
