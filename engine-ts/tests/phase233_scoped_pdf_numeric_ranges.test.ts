import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDocumentBytes228} from '../src/phase228_document_observer.js';
const pdf=(name:string)=>readFileSync(`evaluation/phase233/SYNTHETIC-${name}.pdf`);
const read=(name:string)=>parseDocumentBytes228(pdf(name),'pdf');
const intervals=(r:Awaited<ReturnType<typeof read>>)=>r.claims.filter(c=>c.range!==undefined);

test('Phase233: full numeric intervals preserve both endpoints and units',async()=>{
 const r=await read('valid');assert.equal(r.claimCount,6);
 assert.deepEqual(intervals(r).slice(0,2).map(c=>[c.label,c.range?.lower,c.range?.upper,c.unit,c.scopeComponent]),[
  ['source image distance',89.5,119.5,'cm','frontal c-arm'],
  ['source-image distance',87.9,130.6,'cm','lateral l-arc'],
 ]);
 assert.ok(r.claims.every(c=>c.value===null&&c.model===null&&c.modelAssignment==='unresolved'));
});
test('Phase233: voltage qualifiers are conditions, never inferred variants',async()=>{
 const r=await read('valid');const a=r.claims.filter(c=>c.label==='input voltage');
 assert.deepEqual(a.map(c=>[c.range?.lower,c.range?.upper,c.condition,c.scopeComponent]),[
  [100,120,'low voltage',null],[200,240,'high voltage',null]
 ]);
 assert.ok(a.every(c=>c.variantModel===undefined&&c.optionStatus==='not_established'));
});
test('Phase233: Celsius and pressure ranges retain author-written values',async()=>{
 const r=await read('valid');const m=new Map(r.claims.map(c=>[c.label,c.range]));
 assert.deepEqual(m.get('operating temperature range'),{lower:0,upper:40,unit:'celsius'});
 assert.deepEqual(m.get('water pressure required'),{lower:14.5,upper:116,unit:'psi'});
});
test('Phase233: identical numeric values remain scoped to different components',async()=>{
 const r=await read('scoped');assert.equal(r.claimCount,2);
 assert.notEqual(r.claims[0].claimId,r.claims[1].claimId);
 assert.deepEqual(r.claims.map(c=>c.scopeComponent),['frontal c-arm','lateral l-arc']);
});
test('Phase233: descending, equal or partially parsed intervals abstain',async()=>{
 const r=await read('invalid');assert.equal(r.claimCount,0);
 assert.ok(r.reasonCodes.includes('pdf_interval_ambiguous_or_unhandled'));
});
test('Phase233: prose containing numbers is not a technical specification',async()=>{
 const r=await read('unscoped');assert.equal(r.claimCount,1);
 assert.equal(r.claims[0].scopeComponent,null);
 assert.equal(r.claims[0].range?.upper,18);
});
test('Phase233: manufacturer ranges never become evidence for ranking',async()=>{
 const r=await read('valid');assert.equal(r.rankingAuthorized,false);
 assert.equal(r.scientificEvidenceAdmitted,false);
 for(const c of r.claims){
  assert.equal(c.extractionMethod,'pdf_explicit_scoped_interval_candidate');
  assert.equal(c.testedPerformance,false);assert.equal(c.methodReviewed,false);
  assert.equal(c.exactVariantVerified,false);assert.equal(c.rankingAuthorized,false);
  assert.equal(c.optionStatus,'not_established');
 }
});
test('Phase233: document SHA, location and replay deterministic without article bodies',async()=>{
 const a=await read('valid'),b=await read('valid');assert.deepEqual(a,b);
 assert.ok(a.documentSha256&&a.documentSha256.length===64);
 assert.ok(a.claims.every(c=>c.locator.page===1&&Number.isInteger(c.locator.line)&&c.claimId.length===64));
 assert.equal(a.rawTextStored,false);assert.equal(a.rawDocumentStored,false);
 assert.ok(!JSON.stringify(a).includes('Technical specifications frontal C-arm'));
});
test('Phase233: previous variant PDF weights stay distinct from intervals',async()=>{
 const b=await parseDocumentBytes228(readFileSync('evaluation/phase232/SYNTHETIC-valid.pdf'),'pdf');
 assert.equal(b.claimCount,6);assert.ok(b.claims.every(c=>c.range===undefined&&typeof c.value==='number'));
});
