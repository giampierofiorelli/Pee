import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDocumentBytes228} from '../src/phase228_document_observer.js';
const f=(name:string)=>readFileSync('evaluation/phase230/SYNTHETIC-'+name+'.pdf');
test('Phase230: synthetic PDF dual-unit labels preserve document-authored metric and part scopes',async()=>{
 const a=await parseDocumentBytes228(f('dual-unit-sectioned'),'pdf');
 const claims=a.claims.map(c=>[c.label,c.value,c.unit]);
 assert.deepEqual(claims,[['height',508,'mm'],['width',305,'mm'],['depth',254,'mm'],['input voltage',120,'v'],
  ['net weight',7,'kg'],['sound power level at airflow setting 2',43,'dba']]);
 assert.ok(a.reasonCodes.includes('component_weight_not_promoted_to_product_weight'));
 assert.ok(a.claims.every(c=>c.model===null&&!c.rankingAuthorized&&!c.testedPerformance));
});
test('Phase230: 19th page is accessible within bounded 24-page PDF preview',async()=>{
 const a=await parseDocumentBytes228(f('page19-specification'),'pdf');
 assert.deepEqual(a.claims.map(c=>[c.label,c.value,c.unit,c.locator.page]),[['rated voltage',14.4,'v',19],['rated power',75,'w',19]]);
 assert.ok(a.claims.every(c=>c.extractionMethod==='poppler_aligned_two_column_candidate'));
});
test('Phase230: same document yields deterministic claims and SHA and no raw paragraphs',async()=>{
 const data=f('dual-unit-sectioned'),a=await parseDocumentBytes228(data,'pdf'),b=await parseDocumentBytes228(data,'pdf');
 assert.deepEqual(a,b);assert.equal(a.rawTextStored,false);assert.equal(a.rawDocumentStored,false);
 assert.ok(!JSON.stringify(a).includes('Synthetic appliance specifications'));
});
test('Phase230: PDF max size remains strictly bounded at 40MB',async()=>{
 await assert.rejects(()=>parseDocumentBytes228(new Uint8Array(40_000_001),'pdf'),/phase228_invalid_binary_size/);
});
test('Phase230: DOCX retains its original 6MB limit',async()=>{
 await assert.rejects(()=>parseDocumentBytes228(new Uint8Array(6_000_001),'docx'),/phase228_invalid_binary_size/);
});
test('Phase230: existing authored PDF geometry fixture remains valid',async()=>{
 const a=await parseDocumentBytes228(readFileSync('evaluation/phase229/SYNTHETIC-two-columns.pdf'),'pdf');
 assert.equal(a.claimCount,3);assert.ok(a.claims.every(c=>!c.rankingAuthorized));
});
