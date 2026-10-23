import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDocumentBytes228} from '../src/phase228_document_observer.js';
const pdf=(caseName:string)=>readFileSync('evaluation/phase232/SYNTHETIC-'+caseName+'.pdf');
const tuples=(r:Awaited<ReturnType<typeof parseDocumentBytes228>>)=>r.claims.map(c=>[c.variantModel,c.label,c.value,c.unit]);
test('Phase232: exact authored variant weights including wrapped continuation',async()=>{
 const r=await parseDocumentBytes228(pdf('valid'),'pdf');
 assert.deepEqual(tuples(r),[
 ['WD04','net weight',4.25,'kg'],['WD05','net weight',4.52,'kg'],['WD06','net weight',8.38,'kg'],
 ['WD04','packaged weight',6.06,'kg'],['WD05','packaged weight',6.64,'kg'],['WD06','packaged weight',12.41,'kg'],
 ]);
 assert.ok(r.claims.every(c=>c.variantType==='document_declared_product_variant'&&c.model===null&&c.modelAssignment==='unresolved'));
 assert.ok(r.claims.every(c=>c.exactVariantVerified===false&&!c.rankingAuthorized&&!c.testedPerformance));
 assert.ok(r.reasonCodes.includes('pdf_explicit_variant_weight_claims_unverified'));
});
test('Phase232: duplicate/conflicting model assignments invalidate whole field',async()=>{
 const r=await parseDocumentBytes228(pdf('duplicate'),'pdf');assert.equal(r.claimCount,0);
 assert.ok(r.reasonCodes.includes('pdf_variant_weight_scope_ambiguous'));
});
test('Phase232: reject partially recognized units rather than cherry-picking variants',async()=>{
 const r=await parseDocumentBytes228(pdf('badunit'),'pdf');assert.equal(r.claimCount,0);
 assert.ok(r.reasonCodes.includes('pdf_variant_weight_scope_ambiguous'));
});
test('Phase232: no range reduced silently to one value',async()=>{
 const r=await parseDocumentBytes228(pdf('range'),'pdf');assert.equal(r.claimCount,0);
});
test('Phase232: one author-declared model is insufficient to infer multi-variant section',async()=>{
 const r=await parseDocumentBytes228(pdf('onemodel'),'pdf');assert.equal(r.claimCount,0);
});
test('Phase232: generic variant codes work without hardcoding Dyson model names',async()=>{
 const r=await parseDocumentBytes228(pdf('different'),'pdf');
 assert.deepEqual(tuples(r),[['HP101','net weight',1.25,'kg'],['HP102','net weight',1.4,'kg']]);
});
test('Phase232: component filter weights are never promoted to product variants',async()=>{
 const r=await parseDocumentBytes228(pdf('component'),'pdf');assert.equal(r.claimCount,0);
});
test('Phase232: appended marketing material invalidates the whole field',async()=>{
 const r=await parseDocumentBytes228(pdf('semanticnoise'),'pdf');assert.equal(r.claimCount,0);
});
test('Phase232: hashes, receipts, no document bodies and deterministic replay',async()=>{
 const a=await parseDocumentBytes228(pdf('valid'),'pdf'),b=await parseDocumentBytes228(pdf('valid'),'pdf');
 assert.deepEqual(a,b);assert.equal(a.rawTextStored,false);assert.equal(a.rawDocumentStored,false);
 assert.equal(a.scientificEvidenceAdmitted,false);assert.equal(a.rankingAuthorized,false);
 assert.ok(a.claims.every(c=>c.claimId.length===64&&c.locator.page===1&&c.locator.line));
 assert.ok(!JSON.stringify(a).includes('Manufacturer technical specification'));
});
