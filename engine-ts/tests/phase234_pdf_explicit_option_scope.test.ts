import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDocumentBytes228} from '../src/phase228_document_observer.js';
const read=(name:string)=>parseDocumentBytes228(readFileSync(`evaluation/phase234/SYNTHETIC-${name}.pdf`),'pdf');
const statuses=(r:Awaited<ReturnType<typeof read>>)=>r.claims.filter(c=>c.availabilityKind!==undefined);

test('Phase234: one bounded page/column provides distinct standard vs optional accessories',async()=>{
 const r=await read('valid');
 assert.deepEqual(statuses(r).filter(c=>c.availabilityKind==='accessory').map(c=>[c.label,c.optionStatus]),[
  ['mattress','standard'],['patient straps','standard'],['drip stand','standard'],
  ['panhandle','optional'],['arm support, incl. arm pad','optional'],['examination light','optional']
 ]);
});
test('Phase234: conditional arm support is not an unqualified standard accessory',async()=>{
 const r=await read('valid');
 assert.ok(!statuses(r).some(c=>c.label.includes('set of arm supports')));
 assert.ok(r.reasonCodes.includes('pdf_conditional_accessory_not_assigned'));
});
test('Phase234: an unscoped optional-accessories heading cannot create product leads',async()=>{
 const r=await read('no_scope');assert.deepEqual(statuses(r),[]);
});
test('Phase234: an accessory list ends at footnotes and cannot absorb later text',async()=>{
 const r=await read('valid');assert.ok(!statuses(r).some(c=>c.label.includes('another item')));
});
test('Phase234: intervening technical prose ends a scoped list rather than granting accessories',async()=>{
 const r=await read('truncated');
 assert.deepEqual(statuses(r).map(c=>c.label),['mattress']);
});
test('Phase234: explicitly parenthesized feature flags produce distinct categorical leads',async()=>{
 const r=await read('status_only');
 assert.deepEqual(statuses(r).map(c=>[c.label,c.optionStatus,c.availabilityKind]),[
  ['user quality control mode','optional','feature'],['automatic positioning','standard','feature']]);
 assert.ok(!statuses(r).some(c=>c.label.includes('portability')));
});
test('Phase234: all feature and accessory claims are unresolved manufacturer statements',async()=>{
 const r=await read('valid');
 for(const c of statuses(r)){
  assert.equal(c.value,null);assert.equal(c.unit,'availability');
  assert.equal(c.model,null);assert.equal(c.modelAssignment,'unresolved');
  assert.equal(c.variantModel,undefined);assert.equal(c.componentModel,undefined);
  assert.equal(c.sourceRole,'publisher_document_claim_unverified');
  assert.equal(c.exactVariantVerified,false);assert.equal(c.testedPerformance,false);
  assert.equal(c.rankingAuthorized,false);assert.equal(c.range,undefined);
  assert.ok(c.locator.page===1&&typeof c.locator.line==='number');
  assert.ok(c.claimId.length===64);
 }
 assert.equal(r.rankingAuthorized,false);assert.equal(r.scientificEvidenceAdmitted,false);
 assert.equal(r.rawTextStored,false);assert.equal(r.rawDocumentStored,false);
});
test('Phase234: same PDF produces deterministic claim provenance',async()=>{
 assert.deepEqual(await read('valid'),await read('valid'));
});
test('Phase234: prior phase interval and variant types remain structurally separate',async()=>{
 const previous=await parseDocumentBytes228(readFileSync('evaluation/phase233/SYNTHETIC-valid.pdf'),'pdf');
 assert.equal(previous.claimCount,6);
 assert.ok(previous.claims.every(c=>c.range!==undefined&&c.optionStatus==='not_established'&&c.availabilityKind===undefined));
 const weights=await parseDocumentBytes228(readFileSync('evaluation/phase232/SYNTHETIC-valid.pdf'),'pdf');
 assert.equal(weights.claims.filter(c=>c.variantModel).length,6);
 assert.ok(weights.claims.every(c=>c.availabilityKind===undefined));
});
