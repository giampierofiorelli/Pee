import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createHash} from 'node:crypto';
import {KnowledgeStore246,DEFAULT_STORAGE_POLICY246,type StoragePolicy246,type SourceInput246} from '../src/phase246_knowledge_store.js';
import {FACTUAL_CLASS_POLICY249,QUALITATIVE_AMENDMENT270} from '../src/phase249_retention_policy.js';
import {extractSpecifications245} from '../src/phase245_spec_extraction.js';
import {testLeadsFromHtml265,testDocumentSubject268} from '../src/phase265_test_measurements.js';
import {qualitativeObservations269} from '../src/phase269_qualitative_observations.js';

// Phase270 §7. FICTIONAL review written for this test.
process.env.PEE_ALLOW_TMP_STORE='1';
const dir=mkdtempSync(join(tmpdir(),'pee270q-'));let n=0;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const CLASS:StoragePolicy246={...DEFAULT_STORAGE_POLICY246,policyVersion:'pee249-class-policy',classPolicy:FACTUAL_CLASS_POLICY249};
const NAME='Zephyrine Crisp 3 ZC300X Air Fryer';
const HTML=`<html><head><meta property="og:type" content="article" /><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Product',name:`${NAME} review: A fictional tagline`})}</script></head><body><h1>${NAME} review</h1>
<p>I tested it over a week. I cooked frozen chips first and they came out crisp and golden, although a few at the edge were slightly pale.</p>
<p>I made chicken drumsticks next: the skin was crisp and the meat was juicy and cooked through with clear juices.</p></body></html>`;
function ingest(sourceType:SourceInput246['sourceType'],host:string,extra:Record<string,unknown>={}){
 const s=new KnowledgeStore246(join(dir,`q${++n}.sqlite`),CLASS);const url=`https://${host}/reviews/zephyr`;
 const x=testDocumentSubject268(extractSpecifications245(HTML,url),'independent_original_test');
 const r=s.ingestObservation246({source:{sourceId:'src_'+n,host,sourceType,sourceTypeBasis:'operator_asserted'},url,sha256:sha(HTML),bytes:HTML.length,httpStatus:200,
  fetchedAt:'2026-10-17T09:00:00.000Z',runId:'p270q',extractorVersion:'phase245@test',extraction:x,categoryHypotheses:['air_fryers'],testLeads:testLeadsFromHtml265(HTML,url,sha(HTML),x),
  qualitative270:{readerVersion:'phase270-qual-1',observations:qualitativeObservations269(HTML).observations},...extra});
 return {s,r};
}

test('qualitative codes are kept for a test publisher under the v2 amendment: codes only, bound to the page product, never ranking input',()=>{
 const {s,r}=ingest('independent_original_test','www.fryerlab.test');
 assert.ok(r.qualitative270!.persisted>=3,JSON.stringify(r.qualitative270));
 const rows=s.qualitativeObservations270();
 assert.ok(rows.every(q=>q.policy_id===QUALITATIVE_AMENDMENT270.policyId&&q.ranking_input===0&&q.laboratory_measurement===0&&q.independent_finding===0&&q.identity==='page_main_product_unverified'));
 assert.ok(rows.some(q=>q.dish==='chicken'&&q.outcome==='moisture'&&q.direction==='positive'));
 // No text of the review is stored anywhere in the row.
 assert.ok(!JSON.stringify(rows).includes('drumsticks')&&!JSON.stringify(rows).includes('golden'));
 // Re-offering the same bytes is a no-op.
 const again=ingest('independent_original_test','www.fryerlab.test');assert.ok(again.r.qualitative270!.persisted>=3);
 // The schema itself forbids ranking input.
 assert.throws(()=>s.db.prepare('UPDATE qualitative_observations270 SET ranking_input=1').run(),/CHECK constraint/);
 // Public shards carry none of them.
 const out=join(dir,'pub'+n);s.exportShards246(out,{audience:'public'});assert.equal(readFileSync(join(out,'qualitative_observations270.ndjson'),'utf8'),'');
 s.close();again.s.close();
});

test('withheld where source rights do not permit: another source class, a machine-readable reservation, an invalid code',()=>{
 const ed=ingest('editorial','www.magazine.test');assert.equal(ed.r.qualitative270!.persisted,0);assert.equal(ed.r.qualitative270!.reason,'source_class_not_in_amendment');ed.s.close();
 const res=ingest('independent_original_test','www.reserved.test',{reservations:{contentSignalAiInput:'no',tdmReservation:false,noaiMeta:false,checked:{robots:true,page:true}}});
 assert.equal(res.r.qualitative270!.persisted,0);assert.match(res.r.qualitative270!.reason??'',/^revision_retention_/);res.s.close();
 const bad=ingest('independent_original_test','www.fryerlab2.test',{qualitative270:{readerVersion:'phase270-qual-1',observations:[{...qualitativeObservations269(HTML).observations[0],outcome:'tastiness'}]}});
 assert.equal(bad.r.qualitative270!.persisted,0);assert.equal(bad.r.qualitative270!.withheld,1);bad.s.close();
});
