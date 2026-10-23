import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseDocumentBytes228,observeDiscoveredDocuments228,inspectSearchDocuments228} from '../src/phase228_document_observer.js';
import type {SourceTransport,SourceResponse} from '../src/approved_web_reader.js';
import type {Run220,Registry220} from '../src/phase220_autonomous_discovery_worker.js';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const root='evaluation/phase228/';
const pdf=readFileSync(root+'SYNTHETIC-football-boot-specifications.pdf');
const docx=readFileSync(root+'SYNTHETIC-segregation-bin-specifications.docx');
const pdf2=readFileSync(root+'SYNTHETIC-ambiguous-products.pdf');
const scanned=readFileSync(root+'SYNTHETIC-image-only.pdf');
const merged=readFileSync(root+'SYNTHETIC-merged-cells.docx');
const now='2026-10-13T20:00:00Z';
const host='documents.vendor.example.org';
const base='https://'+host;
const purl=base+'/files/specifications.pdf';const durl=base+'/files/specifications.docx';
function fakeResponse(url:string,bytes:Uint8Array,contentType:string):SourceResponse{
 return {status:200,finalUrl:url,body:'',rawBytes:bytes,contentType};
}
function fixture(overrides:{deny?:boolean;mime?:string;noRaw?:boolean;notFound?:boolean}={}):SourceTransport{
 return {async get(url,_agent,maxBytes){
  if(url===base+'/robots.txt')return {status:200,finalUrl:url,contentType:'text/plain',body:overrides.deny?'User-agent: *\nDisallow: /files/':'User-agent: *\nAllow: /'};
  const format=url===purl?'pdf':'docx';const blob=format==='pdf'?pdf:docx;
  if(blob.length>maxBytes)throw Error('cap');
  if(overrides.notFound)return {status:404,finalUrl:url,contentType:'text/plain',body:''};
  const r=fakeResponse(url,blob,overrides.mime??(format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
  if(overrides.noRaw)delete r.rawBytes;
  return r;
 }};
}
const registry:Registry220={schema:'pee220.registry.1',vocabulary:[],policies:[],sources:[{
  watch:{id:'docs_source',host,categoryId:'gear',channel:'manufacturer_product_index',mechanism:'approved_index_delta',
   tier:'exploration',rightsClearedForMetadata:false,nextCheckAt:now,lastCheckAt:null,quietChecks:0,errors:0},
  sitemapPath:'/sitemap.xml',pathPrefix:'/files/'
 }]};
const run:Run220={schema:'pee220.run.1',mode:'synthetic_fixture',requestSha256:sha('same goal'),
 intent:{status:'needs_category',categoryId:null,slotValues:{},clarification:null,key:null,confirmedByUser:false},
 localIntake:{suggestionCount:0,unresolvedIssues:0},decision:'candidate_discovery_attempted',
 plannedSourceIds:[],sourceOutcomes:[],networkRequests:[],limitations:[],
 candidates:[{url:purl,sourceId:'docs_source',verification:'unverified_url_only'},
   {url:durl,sourceId:'docs_source',verification:'unverified_url_only'}],
 rankingAuthorized:false,independentEvidenceVerified:false,
 checkpoint:{schema:'pee220.checkpoint.1',observations:[],watchSources:[],evidenceReceipts:[],rankingAuthorized:false}};
test('Phase228 PDF text retains page/line provenance, PDF digest, not article body',async()=>{
 const result=await parseDocumentBytes228(pdf,'pdf');
 assert.equal(result.declaredModel,'BOOT-A1');assert.equal(result.claimCount,2);
 assert.ok(result.claims.every(c=>c.locator.page===1&&!c.rankingAuthorized));
 assert.equal(result.documentSha256,createHash('sha256').update(pdf).digest('hex'));
 assert.ok(!JSON.stringify(result).includes('Manufacturer declared values'));
});
test('Phase228 Word table capacity scope is not automatically reassigned',async()=>{
 const r=await parseDocumentBytes228(docx,'docx');assert.equal(r.declaredModel,'BIN-40');
 assert.equal(r.claimCount,3);assert.deepEqual(r.claims.map(c=>c.label).sort(),['compartment capacity','height','total capacity']);
 assert.ok(r.claims.some(c=>c.label==='compartment capacity'&&c.value===18));
 assert.ok(r.claims.every(c=>c.locator.table!==undefined));
});
test('Phase228 two models remain unresolved',async()=>{
 const r=await parseDocumentBytes228(pdf2,'pdf');assert.equal(r.declaredModel,null);
 assert.equal(r.claims[0].model,null);assert.ok(r.reasonCodes.includes('multiple_declared_models_unresolved'));
});
test('Phase228 scans require OCR and cannot hallucinate a spec',async()=>{
 const r=await parseDocumentBytes228(scanned,'pdf');assert.equal(r.claimCount,0);
 assert.ok(r.reasonCodes.includes('pdf_image_only_or_needs_ocr'));
});
test('Phase228 Word merged cells are refused instead of inferred',async()=>{
 const r=await parseDocumentBytes228(merged,'docx');assert.ok(r.reasonCodes.some(x=>x.includes('unresolved')));
 assert.ok(!r.claims.some(c=>c.label==='total capacity'));
});
test('Phase228 bad binary rejection and no extra state',async()=>{
 await assert.rejects(()=>parseDocumentBytes228(Buffer.alloc(0),'pdf'));
 const r=await parseDocumentBytes228(Buffer.from('not pdf'),'pdf');
 assert.equal(r.claimCount,0);assert.ok(r.reasonCodes.includes('invalid_pdf_magic'));
});
test('Phase228 actual synthetic fixture transport -> both docs, zero scientific evidence',async()=>{
 const r=await observeDiscoveredDocuments228({run,registry,observedAt:now,mode:'synthetic_fixture',fixtureTransport:fixture()});
 assert.equal(r.receipts.length,2);assert.deepEqual(r.receipts.map(x=>x.status),['parsed_unverified','parsed_unverified']);
 assert.equal(r.receipts[0].claims.length,2);assert.equal(r.receipts[1].claims.length,3);
 assert.equal(r.attemptedUrls.filter(u=>u.endsWith('robots.txt')).length,2);
 assert.equal(r.scientificEvidenceAdmitted,false);assert.ok(!JSON.stringify(r).includes('SYNTHETIC NOT A REAL PRODUCT'));
});
test('Phase228 robots disallow prevents document network access',async()=>{
 const r=await observeDiscoveredDocuments228({run,registry,observedAt:now,mode:'synthetic_fixture',fixtureTransport:fixture({deny:true})});
 assert.equal(r.receipts[0].status,'blocked');assert.equal(r.attemptedUrls.filter(x=>x.endsWith('pdf')).length,0);
});
test('Phase228 explicitly refused site cannot be reopened by fixture',async()=>{
 const forbidden:Registry220={...registry,policies:[{host,basis:'refused',websiteTerms:'reviewed_prohibited',robots:'disallowed'} as Registry220['policies'][number]]};
 const r=await observeDiscoveredDocuments228({run,registry:forbidden,observedAt:now,mode:'synthetic_fixture',fixtureTransport:fixture()});
 assert.equal(r.receipts[0].reasonCodes[0],'registry_explicit_host_prohibition');assert.equal(r.attemptedUrls.length,0);
});
test('Phase228 rejects wrong MIME, missing raw bytes and 404',async()=>{
 for(const opts of [{mime:'text/html'},{noRaw:true},{notFound:true}]){
  const r=await observeDiscoveredDocuments228({run,registry,observedAt:now,mode:'synthetic_fixture',fixtureTransport:fixture(opts)});
  assert.equal(r.receipts[0].status,'blocked');assert.equal(r.receipts[0].claims.length,0);
 }
});
test('Phase228 live fixture injection prohibited',async()=>{
 await assert.rejects(()=>observeDiscoveredDocuments228({...{run,registry,observedAt:now,mode:'live' as const},fixtureTransport:fixture()}));
});
test('Phase228 general search docs are connected to observer',async()=>{
 const sourceId='search_'+sha(host).slice(0,16);
 const search={schema:'pee223.search.v1' as const,mode:'synthetic_fixture' as const,intentKey:'x',
  intentStatus:'bounded_category_hypothesis',queries:[],networkRequests:[],responseDigests:[],reasonCodes:[],
  candidates:[{url:purl,sourceId,verification:'unverified_url_only' as const}],
  noSnippetsOrPageBodiesStored:true as const,rankingAuthorized:false as const,independentEvidenceVerified:false as const};
 const r=await inspectSearchDocuments228({search,registry,observedAt:now,mode:'synthetic_fixture',fixtureTransport:fixture()});
 assert.equal(r.receipts[0].claims.length,2);
});
