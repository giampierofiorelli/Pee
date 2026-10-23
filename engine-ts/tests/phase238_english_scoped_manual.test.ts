import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDocumentBytes228} from '../src/phase228_document_observer.js';
const fixture=(n:string)=>readFileSync('evaluation/phase238/SYNTHETIC-'+n+'.pdf');
const read=(n:string)=>parseDocumentBytes228(fixture(n),'pdf');
test('238: native English manual extracts exact typed voltage and frequency ranges',async()=>{
 const result=await read('english-manual-good');
 const voltage=result.claims.find(c=>c.label==='input voltage');
 const hz=result.claims.find(c=>c.label==='input frequency');
 assert.deepEqual(voltage?.range,{lower:220,upper:240,unit:'v'});
 assert.deepEqual(hz?.range,{lower:50,upper:60,unit:'hz'});
 assert.equal(voltage?.value,null);assert.equal(hz?.value,null);
});
test('238: a complete authored measurement triple is a vector and not three unrelated scalars',async()=>{
 const result=await read('english-manual-good');
 const dims=result.claims.find(c=>c.label==='dimensions (h x w x l)');
 assert.deepEqual(dims?.vector,{axes:['height','width','length'],values:[358,220,435],unit:'mm'});
 assert.equal(dims?.value,null);
});
test('238: filter-dependent capacities are distinct and not contradictions',async()=>{
 const result=await read('english-manual-good');
 const tanks=result.claims.filter(c=>c.label==='water tank capacity');
 assert.deepEqual(tanks.map(c=>[c.value,c.unit,c.condition,c.scopeComponent]),
  [[1.5,'l','without filter','water tank'],[1.3,'l','with filter','water tank']]);
 assert.equal(result.discrepancies?.edges.length,0);
});
test('238: distinct standby modes retain the measurement condition',async()=>{
 const result=await read('english-manual-good');
 assert.deepEqual(result.claims.filter(c=>c.label==='power consumption').map(c=>[c.value,c.condition]),
  [[0.6,'networked standby'],[0.47,'low power']]);
 assert.ok(result.claims.every(c=>c.model===null&&c.modelAssignment==='unresolved'));
});
test('238: incomplete water-tank condition abstains instead of generalizing',async()=>{
 const result=await read('english-manual-ambiguous-filter');
 assert.equal(result.claims.filter(c=>c.label==='water tank capacity').length,0);
});
test('238: recipe page cannot masquerade as a bounded technical specification section',async()=>{
 const result=await read('english-manual-no-heading');
 assert.equal(result.claims.filter(c=>c.label==='water tank capacity'||c.label==='nominal power').length,0);
});
test('238: provisional original-source statements never become independent science/ranking',async()=>{
 const result=await read('english-manual-good');
 assert.equal(result.claimCount,9);
 assert.equal(result.rankingAuthorized,false);
 assert.equal(result.scientificEvidenceAdmitted,false);
 assert.ok(result.claims.every(c=>c.sourceRole==='publisher_document_claim_unverified'&&
   c.testedPerformance===false&&c.rankingAuthorized===false&&c.exactVariantVerified===false));
 assert.equal(result.rawTextStored,false);assert.equal(result.rawDocumentStored,false);
 assert.equal(result.discrepancies?.authoritativeChoice,null);
});
