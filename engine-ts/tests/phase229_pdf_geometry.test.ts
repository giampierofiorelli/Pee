/** Phase229: deliberately synthetic PDF layout adversarial tests; no online evidence. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseDocumentBytes228,observeDiscoveredDocuments228} from '../src/phase228_document_observer.js';
import type {Registry220,Run220} from '../src/phase220_autonomous_discovery_worker.js';
const file=(s:string)=>readFileSync('evaluation/phase229/SYNTHETIC-'+s+'.pdf');
const now='2026-10-13T20:30:00Z';
const url='https://docs.fixture.example.org/files/two-columns.pdf';
const registry:Registry220={schema:'pee220.registry.1',vocabulary:[],policies:[],sources:[{watch:{id:'fixture_docs',host:'docs.fixture.example.org',categoryId:'football_boots',channel:'manufacturer_product_index',mechanism:'approved_index_delta',tier:'exploration',rightsClearedForMetadata:false,nextCheckAt:now,lastCheckAt:null,quietChecks:0,errors:0},pathPrefix:'/files/',sitemapPath:'/sitemap.xml'}]};
const run:Run220={schema:'pee220.run.1',mode:'synthetic_fixture',requestSha256:'only-synthetic',intent:{status:'needs_category',categoryId:null,slotValues:{},clarification:null,key:null,confirmedByUser:false},localIntake:{suggestionCount:0,unresolvedIssues:0},decision:'candidate_discovery_attempted',networkRequests:[],plannedSourceIds:[],sourceOutcomes:[],candidates:[{url,sourceId:'fixture_docs',verification:'unverified_url_only'}],limitations:[],rankingAuthorized:false,independentEvidenceVerified:false,checkpoint:{schema:'pee220.checkpoint.1',observations:[],watchSources:[],evidenceReceipts:[],rankingAuthorized:false}};
test('Phase229: Poppler aligned two-column rows are parsed and located, not verified',async()=>{
 const r=await parseDocumentBytes228(file('two-columns'),'pdf');
 assert.equal(r.claimCount,3);assert.equal(r.declaredModel,'BOOT-A1');
 assert.deepEqual(r.claims.map(c=>[c.label,c.value,c.unit]),[['weight',215,'g'],['length',290,'mm'],['height',10,'cm']]);
 assert.ok(r.claims.every(c=>c.extractionMethod==='poppler_aligned_two_column_candidate'&&c.locator.page===1&&c.locator.box?.length===4&&!c.rankingAuthorized));
 assert.ok(r.reasonCodes.includes('pdf_coordinate_rows_unverified'));
 assert.equal(r.scientificEvidenceAdmitted,false);
});
test('Phase229: isolated row is not evidence for a table',async()=>{
 const r=await parseDocumentBytes228(file('single-row'),'pdf');
 assert.equal(r.claimCount,0);assert.ok(r.reasonCodes.includes('pdf_no_stable_two_column_rows'));
});
test('Phase229: parallel value/model columns are refused, not mixed',async()=>{
 const r=await parseDocumentBytes228(file('parallel-variants'),'pdf');
 assert.equal(r.claimCount,0);assert.ok(r.reasonCodes.includes('pdf_parallel_or_ambiguous_columns_skipped'));
});
test('Phase229: multiple explicitly declared models never acquire an exact model',async()=>{
 const r=await parseDocumentBytes228(file('multi-model'),'pdf');
 assert.equal(r.claimCount,2);assert.equal(r.declaredModel,null);
 assert.ok(r.claims.every(c=>c.model===null&&c.modelAssignment==='unresolved'&&c.exactVariantVerified===false));
});
test('Phase229: unrecognized unit does not create plausible evidence',async()=>{
 const r=await parseDocumentBytes228(file('invalid-unit'),'pdf');assert.equal(r.claimCount,0);
});
test('Phase229: a stray intervening column invalidates its row and singleton run',async()=>{
 const r=await parseDocumentBytes228(file('interloper'),'pdf');assert.equal(r.claimCount,0);
});
test('Phase229: duplicate value extracted in key-value and geometry paths counts once',async()=>{
 const r=await parseDocumentBytes228(file('duplicate-two-paths'),'pdf');
 assert.equal(r.claimCount,2);assert.equal(r.claims.filter(c=>c.label==='weight').length,1);
});
test('Phase229: repeat parse is deterministic and does not leak PDF body',async()=>{
 const bytes=file('two-columns');const a=await parseDocumentBytes228(bytes,'pdf');const b=await parseDocumentBytes228(bytes,'pdf');
 assert.deepEqual(a,b);assert.equal(a.documentSha256,createHash('sha256').update(bytes).digest('hex'));
 const text=JSON.stringify(a);assert.ok(!text.includes('Model: BOOT-A1'));assert.ok(!text.includes('Weight Length Height'));
 assert.equal(a.rawDocumentStored,false);assert.equal(a.rawTextStored,false);
});
test('Phase229: existing Phase228 PDF/DOCX paths stay valid',async()=>{
 const a=await parseDocumentBytes228(readFileSync('evaluation/phase228/SYNTHETIC-football-boot-specifications.pdf'),'pdf');
 const b=await parseDocumentBytes228(readFileSync('evaluation/phase228/SYNTHETIC-segregation-bin-specifications.docx'),'docx');
 assert.equal(a.claimCount,2);assert.equal(b.claimCount,3);
});
test('Phase229: existing discovery -> robots -> PDF -> typed claims works offline',async()=>{
 const bytes=file('two-columns');let docGets=0;
 const fixture={async get(target:string){if(target.endsWith('/robots.txt'))return {status:200,finalUrl:target,contentType:'text/plain',body:'User-agent: *\nAllow: /'};
  docGets++;return {status:200,finalUrl:target,contentType:'application/pdf',body:'',rawBytes:bytes};}};
 const o=await observeDiscoveredDocuments228({run,registry,observedAt:now,mode:'synthetic_fixture',fixtureTransport:fixture});
 assert.equal(docGets,1);assert.equal(o.receipts.length,1);assert.equal(o.receipts[0].claims.length,3);
 assert.equal(o.rankingAuthorized,false);assert.equal(o.scientificEvidenceAdmitted,false);assert.equal(o.noDocumentBodiesStored,true);
});
