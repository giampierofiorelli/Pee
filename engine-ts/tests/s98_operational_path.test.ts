import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createHash} from 'node:crypto';
import {KnowledgeStore246,DEFAULT_STORAGE_POLICY246,declarationKey246,type SourceInput246,type ObservationInput246} from '../src/phase246_knowledge_store.js';
import {extractSpecifications245} from '../src/phase245_spec_extraction.js';
import {testLeadsFromHtml265} from '../src/phase265_test_measurements.js';
import {readPage98,declarationKey98} from '../src/scientific_reading98.js';
import type {WebSourcePolicy} from '../src/web_evidence_acquisition.js';

// S98: semantic preservation across the operational boundaries: page -> existing extractors -> shared scientific reading
// -> store (gated, retention-bound) -> retrieval. Every page text is invented for this test.
process.env.PEE_ALLOW_TMP_STORE='1';
const dir=mkdtempSync(join(tmpdir(),'pee98-'));let n=0;const db=()=>join(dir,`s${++n}.sqlite`);
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');const AT='2026-10-20T10:00:00.000Z';const HOST='lab.example';const URL='https://lab.example/review/acme-p1';
const approved:WebSourcePolicy={sourceId:'pol_lab',host:HOST,basis:'written_permission',rightsDocumentId:'rights_lab',rightsDocumentUrl:'https://rights.pee-tests.org/lab',
 reviewedBy:'rights_reviewer',reviewedAt:'2026-10-01T00:00:00Z',validUntil:'2027-10-01T00:00:00Z',permittedOperations:['metadata_discovery','page_retrieval','local_analysis','fact_storage'],
 robots:'allowed',robotsCheckedAt:'2026-10-20T06:00:00Z',websiteTerms:'reviewed_permitted',termsCheckedAt:'2026-10-10T00:00:00Z',commercialUseReviewed:true};
const source=(policy:WebSourcePolicy|undefined):SourceInput246=>({sourceId:'src_lab',host:HOST,sourceType:'independent_original_test',sourceTypeBasis:'operator_asserted',policy});
const html=`<!doctype html><html><head><title>Acme P1 monitor review</title><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Product',name:'Acme P1',brand:{'@type':'Brand',name:'Acme'},mpn:'P1-27'})}</script></head>
<body><main><h1>Acme P1 monitor review</h1>
<h2>Specifications</h2><table><tr><th>Peak brightness</th><td>1000 nits</td></tr><tr><th>Refresh rate</th><td>240 Hz</td></tr></table>
<h2>Brightness and latency</h2>
<p>In our tests the Acme P1 reached a peak brightness of 412 nits on a 10% window, well below the claim.</p>
<p>We measured an input lag of 9.8 ms, which is excellent for gaming.</p>
</main></body></html>`;
const observation=(policy:WebSourcePolicy|undefined):ObservationInput246=>{const x=extractSpecifications245(html,URL);const leads=testLeadsFromHtml265(html,URL,sha(html),x,{category:'monitors'});
 return {source:source(policy),url:URL,sha256:sha(html),bytes:html.length,httpStatus:200,fetchedAt:AT,runId:'run_s98',extractorVersion:'phase245@s98test',extraction:x,
  categoryHypotheses:['monitors'],testLeads:leads,scientific98:readPage98(html,URL,sha(html),x,leads,[],'monitors','independent_test_or_review')};};

test('the declaration key is the same on both sides of the boundary', ()=>{
 const x=extractSpecifications245(html,URL);assert.ok(x.facts.length>0);for(const f of x.facts)assert.equal(declarationKey98(f),declarationKey246(f));});

test('readings survive extraction -> interpretation -> store -> retrieval with conditions, nature and product kept', ()=>{
 const s=new KnowledgeStore246(db(),{...DEFAULT_STORAGE_POLICY246,scientificReadings98:true});s.ingestObservation246(observation(approved));
 const rs=s.scientificReadings98();assert.ok(rs.length>=2,'readings stored');
 const prose=rs.find(r=>r.subject_table==='document_quantity'&&r.value===412);assert.ok(prose,'the prose measurement the extractors missed is kept');
 assert.equal(prose!.property_id,'qkm_peak_luminance');assert.equal(prose!.nature,'measured');
 assert.ok(prose!.conditions.some(c=>c.id==='window_size'&&c.state==='explicit'),'the stated window size is preserved as an explicit condition');
 assert.equal(prose!.product_association,'page_main_product_unverified');assert.ok(prose!.product_id);
 const spec=rs.find(r=>r.subject_table==='declarations'&&r.property_id==='qkm_peak_luminance');assert.ok(spec,'the specification declaration is typed');
 assert.equal(spec!.nature,'declared');assert.ok(spec!.missing.includes('window_size'),'the unstated window size stays missing, never assumed');
 const lag=rs.find(r=>r.property_id==='qkm_input_lag');assert.ok(lag);assert.ok(lag!.missing.includes('signal_mode'));
 assert.ok(rs.every(r=>r.ranking_input===0&&(r.knowledge_state==='candidate'||r.knowledge_state==='uncertain')),'never a ranking input, never verified automatically');
 s.close();});

test('gated: no readings without the storage switch, and none without the right to keep values', ()=>{
 const off=new KnowledgeStore246(db(),DEFAULT_STORAGE_POLICY246);off.ingestObservation246(observation(approved));assert.equal(off.scientificReadings98().length,0);off.close();
 const norights=new KnowledgeStore246(db(),{...DEFAULT_STORAGE_POLICY246,scientificReadings98:true});norights.ingestObservation246(observation(undefined));
 assert.equal(norights.scientificReadings98().length,0,'readings follow the retention of the values they describe');norights.close();});

test('readings never reach a public export', ()=>{
 const s=new KnowledgeStore246(db(),{...DEFAULT_STORAGE_POLICY246,scientificReadings98:true});s.ingestObservation246(observation(approved));
 const out=join(dir,'pub'+n);const r=s.exportShards246(out,{audience:'public'});assert.equal(r.files['scientific_readings98.ndjson'].rows,0);s.close();});
