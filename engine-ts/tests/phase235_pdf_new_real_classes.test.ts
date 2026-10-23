import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDocumentBytes228} from '../src/phase228_document_observer.js';
const get=(name:string)=>parseDocumentBytes228(readFileSync(`evaluation/phase235/SYNTHETIC-${name}.pdf`),'pdf');

test('235: full catalogue headers preserve separate product models and three typed rows', async()=>{
 const r=await get('catalog');
 assert.equal(r.claimCount,9);
 assert.deepEqual(r.claims.filter(c=>c.label==='net weight').map(c=>[c.catalogModel,c.value,c.unit]),
  [['PWM 507',98,'kg'],['PWM 507 Hygiene',101,'kg'],['PWM 508 MopStar',103,'kg']]);
});
test('235: model columns remain provisional, never exact verified product/variant',async()=>{
 const r=await get('catalog');
 for(const c of r.claims){
  assert.equal(c.catalogType,'document_declared_catalog_product');
  assert.equal(c.variantModel,undefined);
  assert.equal(c.componentModel,undefined);
  assert.equal(c.model,null);
  assert.equal(c.modelAssignment,'unresolved');
  assert.equal(c.rankingAuthorized,false);
  assert.equal(c.exactVariantVerified,false);
  assert.equal(c.sourceRole,'publisher_document_claim_unverified');
 }
});
test('235: duplicated catalogue header abstains from whole table',async()=>{
 const r=await get('guard');
 assert.equal(r.claims.filter(c=>c.catalogModel!==undefined).length,0);
});
test('235: table-header fragment (optional) is not a product feature',async()=>{
 const r=await get('guard');
 assert.ok(!r.claims.some(c=>c.label.includes('of pasta')));
 assert.ok(r.reasonCodes.includes('pdf_fragmentary_optional_heading_rejected'));
});
test('235: model-specific rice bowl remains unresolved and conditional',async()=>{
 const r=await get('guard');
 const [c]=r.claims.filter(c=>c.optionStatus==='conditional_unresolved');
 assert.equal(c.label,'rice bowl');
 assert.equal(c.condition,'on certain models only');
 assert.equal(c.model,null);
 assert.equal(c.scopeComponent,null);
 assert.equal(c.rankingAuthorized,false);
});
test('235: unrelated explicit optional feature still accepted with unresolved SKU',async()=>{
 const r=await get('guard');
 const [c]=r.claims.filter(c=>c.optionStatus==='optional');
 assert.equal(c.label,'user quality control mode');
 assert.equal(c.availabilityKind,'feature');
 assert.equal(c.model,null);
 assert.equal(c.rankingAuthorized,false);
});
test('235: technical sheets preserve 3-axis dimensions as one vector, not scalar',async()=>{
 const r=await get('sheet');
 const [c]=r.claims.filter(c=>c.vector);
 assert.deepEqual(c.vector,{axes:['height','width','depth'],values:[850,596,643],unit:'mm'});
 assert.equal(c.value,null);
 assert.equal(c.model,null);
 assert.equal(c.rankingAuthorized,false);
});
test('235: rate denominator is not product capacity',async()=>{
 const r=await get('sheet');
 const [c]=r.claims.filter(c=>c.measurementBasis);
 assert.equal(c.label,'weighted water consumption');
 assert.equal(c.unit,'l');
 assert.equal(c.value,48);
 assert.equal(c.measurementBasis,'per cycle');
 assert.equal(c.rankingAuthorized,false);
});
test('235: deterministic SHA and exact claim IDs across same original binary',async()=>{
 assert.deepEqual(await get('catalog'),await get('catalog'));
});
test('235: no artificial rank/scientific performance verdict for any new leads',async()=>{
 for(const f of ['catalog','sheet','guard']){
  const r=await get(f);
  assert.equal(r.rankingAuthorized,false);
  assert.equal(r.scientificEvidenceAdmitted,false);
  assert.equal(r.rawDocumentStored,false);
  assert.equal(r.rawTextStored,false);
  assert.ok(r.claims.every(c=>c.rankingAuthorized===false&&c.testedPerformance===false));
 }
});
test('235: split table label retains kWh per 100 operating cycles',async()=>{
 const r=await get('sheet');
 const [c]=r.claims.filter(c=>c.measurementBasis==='per 100 operating cycles; wash cycle');
 assert.equal(c.value,49);
 assert.equal(c.unit,'kwh');
 assert.equal(c.label,'weighted energy consumption');
 assert.equal(c.model,null);
 assert.equal(c.rankingAuthorized,false);
});
test('235: typed electrical intervals never promote low endpoint to scalar',async()=>{
 const r=await get('sheet');
 assert.deepEqual(r.claims.filter(c=>c.range).map(c=>[c.label,c.range,c.value]),[
  ['voltage',{lower:220,upper:240,unit:'v'},null],
  ['total rated load',{lower:2.1,upper:2.4,unit:'kw'},null]
 ]);
});
test('235: split Model identifier label cannot become fictitious identifier-model',async()=>{
 const r=await get('sheet');
 assert.equal(r.declaredModel,null);
 assert.ok(r.claims.every(c=>c.model===null&&c.modelAssignment==='unresolved'));
});
