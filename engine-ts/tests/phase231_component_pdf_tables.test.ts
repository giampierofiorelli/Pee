import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDocumentBytes228} from '../src/phase228_document_observer.js';
const fixture=(kind:string)=>readFileSync('evaluation/phase231/SYNTHETIC-'+kind+'.pdf');

test('Phase231: scoped table does not turn component measurements into parent-product measurements',async()=>{
 const r=await parseDocumentBytes228(fixture('normal'),'pdf');
 assert.equal(r.claimCount,6);
 assert.deepEqual(r.claims.filter(x=>x.label==='number of elements').map(x=>[x.componentModel,x.value,x.unit]),
  [['T1-1',80,'count'],['Q2-1',96,'count'],['R3-1',128,'count']]);
 assert.deepEqual(r.claims.filter(x=>x.label==='scanplane aperture').map(x=>[x.componentModel,x.value,x.unit]),
  [['T1-1',12,'mm'],['Q2-1',14,'mm'],['R3-1',16,'mm']]);
 for(const c of r.claims){
  assert.equal(c.model,null);assert.equal(c.modelAssignment,'unresolved');
  assert.equal(c.componentType,'document_declared_subcomponent');
  assert.equal(c.extractionMethod,'poppler_scoped_component_table_candidate');
  assert.equal(c.locator.page,1);assert.ok(c.locator.box?.length===4);
  assert.equal(c.testedPerformance,false);assert.equal(c.exactVariantVerified,false);assert.equal(c.rankingAuthorized,false);
 }
 assert.ok(r.reasonCodes.includes('pdf_component_column_claims_unverified'));
 assert.ok(!r.claims.some(c=>c.value===900||c.label==='net weight'));
 assert.equal(r.rawTextStored,false);assert.equal(r.rawDocumentStored,false);
});

test('Phase231: duplicate model headers abort the table rather than misassign',async()=>{
 const r=await parseDocumentBytes228(fixture('duplicate'),'pdf');
 assert.equal(r.claimCount,0);
 assert.ok(r.reasonCodes.includes('pdf_component_header_ambiguous'));
});

test('Phase231: ambiguous multiple values in one cell abstain for that component',async()=>{
 const r=await parseDocumentBytes228(fixture('ambiguous'),'pdf');
 assert.equal(r.claimCount,5);
 assert.ok(r.reasonCodes.includes('pdf_component_cell_ambiguous'));
 assert.ok(!r.claims.some(c=>c.componentModel==='Q2-1'&&c.label==='scanplane aperture'));
});

test('Phase231: two-column rows without sufficient model-header evidence remain quarantined',async()=>{
 const r=await parseDocumentBytes228(fixture('two'),'pdf');
 assert.equal(r.claimCount,0);
});

test('Phase231: component table extraction is deterministic and non-retentive',async()=>{
 const a=await parseDocumentBytes228(fixture('normal'),'pdf');
 const b=await parseDocumentBytes228(fixture('normal'),'pdf');
 assert.deepEqual(a,b);
 assert.equal(a.scientificEvidenceAdmitted,false);assert.equal(a.rankingAuthorized,false);
 assert.ok(!JSON.stringify(a).includes('Technical component specifications'));
});


test('Phase231: compound units remain speeds rather than silently becoming lengths',async()=>{
 const r=await parseDocumentBytes228(fixture('speed-units'),'pdf');
 assert.deepEqual(r.claims.map(c=>[c.label,c.value,c.unit]),[
  ['speed',6,'cm/s'],['speed',10,'mm/s'],['height',30,'cm']
 ]);
 assert.ok(!r.claims.some(c=>c.value===4));
 assert.equal(r.rankingAuthorized,false);
});
