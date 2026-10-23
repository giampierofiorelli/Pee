import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createHash} from 'node:crypto';
import {KnowledgeStore246,DEFAULT_STORAGE_POLICY246,type StoragePolicy246} from '../src/phase246_knowledge_store.js';
import {extractSpecifications245} from '../src/phase245_spec_extraction.js';
import {FACTUAL_CLASS_POLICY249,detectReservations249} from '../src/phase249_retention_policy.js';
import {testLeadsFromHtml265,readingConfiguration265,readingIdentity265,TEST_LEAD_EXTRACTOR265,type TestLeadsInput265} from '../src/phase265_test_measurements.js';
import {planContentDigest272,type ExtractionPlan272} from '../src/phase272_extraction_plan.js';
import type {TestCandidate225} from '../src/phase225_transient_test_probe.js';
import {readDocumentSemantics1D2} from '../src/document_semantics.js';

// Original roadmap Step 3: versioned plan-guided reading and safe re-derivation, on temporary stores and a FICTIONAL page
// (host pees3-test.test, product "Kettle Co KT5"; written for this test, not publisher content).
process.env.PEE_ALLOW_TMP_STORE='1';
const dir=mkdtempSync(join(tmpdir(),'pee-step3-'));let n=0;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const CLASS:StoragePolicy246={...DEFAULT_STORAGE_POLICY246,policyVersion:'pee249-class-policy',classPolicy:FACTUAL_CLASS_POLICY249};
const PENDING:StoragePolicy246={...DEFAULT_STORAGE_POLICY246,localPendingRightsCache:{enabled:true,expiresAfterDays:1}};
const URL0='https://lab.pees3-test.test/r/kt5';
const HTML=`<html><head><title>F</title><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Product',name:'Kettle Co KT5 Kettle',brand:'Kettle Co',model:'KT5'})}</script></head>
<body><article><h1>Kettle Co KT5 Kettle review</h1><p>We tested the KT5 for a week in our lab.</p><p>In our tests the KT5 boiled a litre in 160 seconds, and its noise level peaked at 61 dB.</p>
<p>The KT5 boil time was 3 minutes on the eco setting.</p></article></body></html>`;
const X=extractSpecifications245(HTML,URL0);
const plan=(units:string[],terms:string[]):ExtractionPlan272=>{const p={schema:'pee272.extraction-plan.v1' as const,categoryId:'kettles',isEvidence:false as const,categoryNouns:['kettle'],
 identity:{requireNamedSubject:true as const,modelCodeBindsResult:true as const},outcomes:[],
 measurements:[{id:'boil_and_noise',outcomes:[],proxyFor:[],dimensions:units.includes('db')?['sound','duration']:['duration'],units,terms,conditions:[]}],units,proxies:[],sectionCues:[],decisionEvidence:[]};
 return {...p,compiledFrom:{items:1,relations:0,digest:sha(JSON.stringify(p))}};};
const PA=plan(['db','seconds','minutes'],['noise','boil','time']),PB=plan(['seconds'],['boil']);
const SEM=readDocumentSemantics1D2(HTML,URL0);
const leads=(p?:ExtractionPlan272,semantics?:unknown)=>testLeadsFromHtml265(HTML,URL0,sha(HTML),X,{category:'kettles',...(p?{plan:p}:{}),...(semantics?{semantics:semantics as never}:{})});
function store(storage:StoragePolicy246=CLASS){const s=new KnowledgeStore246(join(dir,`s${++n}.sqlite`),storage);let m=0;
 const ingest=(t:TestLeadsInput265|null,robots:string|null=null)=>s.ingestObservation246({source:{sourceId:'src_lab',host:'lab.pees3-test.test',sourceType:'independent_original_test',sourceTypeBasis:'operator_asserted'},
  url:URL0,sha256:sha(HTML),bytes:HTML.length,httpStatus:200,fetchedAt:new Date(Date.parse('2026-10-17T09:00:00Z')+(m++)*60000).toISOString(),runId:'run_step3',
  extractorVersion:'phase245@step3',extraction:X,categoryHypotheses:['kettles'],reservations:detectReservations249(robots,HTML),testLeads:t});
 const current=()=>s.testMeasurements265().map(r=>`${r.value} ${r.unit}`).sort();
 return {s,ingest,current};}
/** A synthetic lead set under an arbitrary, configuration-free version (as a base-reader version change would be). */
const custom=(v:string,cands:Partial<TestCandidate225>[]):TestLeadsInput265=>{const base=leads(PA).probe;
 return {extractorVersion:v,probe:{...base,candidates:cands.map(c=>({...base.candidates[0],...c}) as TestCandidate225)}};};
const cols=(s:KnowledgeStore246)=>s.testMeasurements265().map(t=>[t.measurementId,t.value,t.unit,t.methodCue,t.condition,t.locator.blockIndex,t.locator.valueOffset,t.subjectAssignment]).sort();

test('identity: the no-plan reading keeps its historical version and output; a plan-guided one is versioned by its effective configuration',()=>{
 const none=leads();assert.equal(none.extractorVersion,TEST_LEAD_EXTRACTOR265);assert.ok(!('readingConfiguration' in none)&&!('comparativeReaderVersion' in none));
 const a1=leads(PA),a2=leads(PA),b=leads(PB);
 assert.equal(a1.extractorVersion,a2.extractorVersion,'identical inputs, identical identity');assert.deepEqual(a1.readingConfiguration,a2.readingConfiguration);
 assert.notEqual(a1.extractorVersion,b.extractorVersion,'a revised plan is a different reading');
 assert.notEqual(leads(PA,SEM).extractorVersion,a1.extractorVersion,'the semantic reading is part of the identity');
 assert.ok(a1.extractorVersion.startsWith(TEST_LEAD_EXTRACTOR265+'+r1:')&&a1.extractorVersion.length<=80);
 assert.equal(readingIdentity265(a1.readingConfiguration!),a1.extractorVersion,'recoverable: the version is recomputed from the configuration');
 assert.equal(a1.readingConfiguration!.plan.contentDigest,planContentDigest272(PA));assert.equal(a1.readingConfiguration!.plan.digestVerified,true);
 // A relabelled plan (same content, another compiled-digest label) reads the same: same identity; the label is shown as unverified.
 const r=leads({...PA,compiledFrom:{...PA.compiledFrom,digest:'not-the-content'}});
 assert.equal(r.extractorVersion,a1.extractorVersion);assert.equal(r.readingConfiguration!.plan.digestVerified,false);
 // The exploratory pass and the page category do not change the candidates, so they do not change the identity.
 assert.equal(testLeadsFromHtml265(HTML,URL0,sha(HTML),X,{category:'other',plan:PA,exploratory:true}).extractorVersion,a1.extractorVersion);
 assert.equal(readingConfiguration265({}),null);
});
test('same source, same plan: no duplicate observations, no supersession, nothing new journaled',()=>{
 const {s,ingest}=store();const a=leads(PA);
 assert.equal(ingest(a).testMeasurements!.persisted,3);const again=ingest(a);
 assert.deepEqual([again.testMeasurements!.persisted,again.testMeasurements!.alreadyStored],[0,3]);
 assert.equal(s.testMeasurements265({includeSuperseded:true}).length,3);
 assert.equal((s.db.prepare("SELECT COUNT(*) AS n FROM events WHERE kind='test_measurements_ingested'").get() as {n:number}).n,1);
});
test('same source, revised plan: a distinct version; values the new plan does not read stop being current; the source revision is unchanged',()=>{
 const {s,ingest,current}=store();const a=leads(PA),b=leads(PB);
 // S86 (2026-10-19): stored units are the quantity knowledge's canonical keys (were the Phase265 table's lowercase spellings); same unit, same value
 const r1=ingest(a);assert.deepEqual(current(),['160 s','3 min','61 dB']);
 const r2=ingest(b);assert.equal(r2.revisionId,r1.revisionId,'a plan change is not a new source revision');
 assert.deepEqual(current(),['160 s','61 dB'],'the minute value was read only by plan A');
 assert.ok(s.testMeasurements265().every(t=>t.extractorVersion===b.extractorVersion));
 assert.deepEqual(s.testMeasurements265({includeSuperseded:true}).filter(t=>t.state!=='current').map(t=>[t.value,t.state,t.extractorVersion]),[[3,'superseded_by_extractor',a.extractorVersion]]);
});
test('same source, changed semantic-reading configuration: rows of the other configuration are not reused as current',()=>{
 const {s,ingest}=store();const a=leads(PA),as=leads(PA,SEM);
 ingest(a);ingest(as);
 assert.ok(s.testMeasurements265().length>0&&s.testMeasurements265().every(t=>t.extractorVersion===as.extractorVersion));
 assert.equal(s.testMeasurements265({includeSuperseded:true}).length,3,'common leads are re-derived in place, never duplicated');
});
test('a new reading that finds nothing leaves no earlier reading falsely current, and the journal says which reading did it',()=>{
 const {s,ingest,current}=store();ingest(leads(PA));
 const b=leads(PB);const zero={...b,probe:{...b.probe,candidates:[]}};ingest(zero);
 assert.deepEqual(current(),[]);
 const ev=s.db.prepare("SELECT payload_json FROM events WHERE kind='test_measurements_ingested' ORDER BY seq DESC LIMIT 1").get() as {payload_json:string};
 const p=JSON.parse(ev.payload_json);assert.deepEqual([p.offered,p.supersededByExtractor,p.extractorVersion],[0,3,zero.extractorVersion]);
 assert.equal(p.readingConfiguration.plan.contentDigest,planContentDigest272(PB));
});
test('the same lead id under another version: every derived column comes from the reading in force; nothing stale is revived',()=>{
 const {s,ingest}=store();
 ingest(custom('v1',[{methodCue:'plan_guided_measurement_term',condition:null,instrument:null,subjectAssignment:'page_context_unverified',blockIndex:2,valueOffset:40}]));
 assert.ok(s.testMeasurements265()[0].productId,'v1: associated with the page product');
 ingest(custom('v2',[{methodCue:'first_person_test_statement',condition:'20 °c',instrument:'sound meter',subjectAssignment:'not_identified',blockIndex:5,valueOffset:12}]));
 const r=s.testMeasurements265()[0];
 assert.deepEqual([r.extractorVersion,r.methodCue,r.condition,r.instrument,r.subjectAssignment,r.locator.blockIndex,r.locator.valueOffset],
  ['v2','first_person_test_statement','20 °c','sound meter','not_identified',5,12]);
 assert.deepEqual([r.productId,r.subjectAssociation],[null,'subject_unresolved'],'an unidentified subject is never linked to a product by re-derivation');
 assert.equal(s.testMeasurements265({includeSuperseded:true}).length,1);
});
test('rollback: a previously used plan is recognised and reproduces its own reading exactly; the other plan is reported for reconsideration',()=>{
 const {s,ingest}=store();const a=leads(PA),b=leads(PB);
 ingest(a);const firstA=cols(s);ingest(b);ingest(a);
 assert.deepEqual(cols(s),firstA,'plan A again: the same rows, ids and columns');
 assert.ok(s.testMeasurements265().every(t=>t.extractorVersion===a.extractorVersion));
 assert.deepEqual(s.readingConfigurations265().map(c=>[c.extractorVersion,c.verified]).sort(),[[a.extractorVersion,true],[b.extractorVersion,true]].sort());
 assert.deepEqual(s.readingsToReconsider265([{categoryId:'kettles',contentDigest:planContentDigest272(PA)}]),[],'the knowledge in force produced every current row');
 assert.deepEqual(s.readingsToReconsider265([{categoryId:'kettles',contentDigest:planContentDigest272(PB)}]).map(x=>[x.url,x.extractorVersion,x.currentMeasurements,x.planDigestUsed]),
  [[URL0,a.extractorVersion,3,planContentDigest272(PA)]]);
 assert.deepEqual(s.readingsToReconsider265([{categoryId:'toasters',contentDigest:'x'}]),[],'another category is not affected');
});
test('rights: a new reading version never writes values the rights in force forbid',()=>{
 const {s,ingest}=store();ingest(leads(PA));
 const r=ingest(leads(PB),'User-agent: *\nContent-Signal: ai-input=no\nAllow: /');
 assert.equal(r.testMeasurements!.persisted,0);assert.ok(r.testMeasurements!.withheldRights>0);
 assert.equal(s.testMeasurements265().length,0,'the earlier reading is no longer current and no value was written under the reservation');
 // The same version re-offered under the reservation writes nothing either.
 assert.equal(ingest(leads(PB),'User-agent: *\nContent-Signal: ai-input=no\nAllow: /').testMeasurements!.persisted,0);
});
test('rights: expired pending-rights values are never revived by a later reading version',()=>{
 const {s,ingest}=store(PENDING);const first=ingest(leads(PA));
 assert.equal(first.retention,'local_pending_rights_review');
 s.purgeExpired246('2026-10-20T00:00:00.000Z');
 const expired=s.testMeasurements265({includeSuperseded:true}).filter(t=>t.state==='expired_pending_rights');assert.equal(expired.length,3);
 ingest(leads(PB));
 const after=s.testMeasurements265({includeSuperseded:true});
 for(const e of expired){const x=after.find(t=>t.measurementId===e.measurementId)!;assert.deepEqual([x.state,x.value],['expired_pending_rights',null]);}
 assert.equal(s.testMeasurements265().length,0);
});
test('a configuration that does not match its version is refused',()=>{
 const {ingest}=store();
 assert.throws(()=>ingest({...leads(PA),extractorVersion:leads(PB).extractorVersion}),/265_reading_configuration_mismatch/);
});
test('comparative results: a plan change does not supersede them; a reader rollback revives its own rows; a reader finding none leaves none current',()=>{
 const {s,ingest}=store();const cmp=[{appliance:'air_fryer',subject:null,taskIndex:0,taskLabel:'chips',dimension:'duration',value:20,unit:'minutes',approximate:false,conditionCodes:[],form:'prose',blockSha256:sha('b')}];
 const q=()=>(s.db.prepare('SELECT reader_version AS v,state FROM comparative_results271 ORDER BY v').all() as {v:string;state:string}[]).map(r=>r.v.replace(TEST_LEAD_EXTRACTOR265,'BASE')+':'+r.state);
 ingest({...leads(PA),comparative270:cmp as never});ingest({...leads(PB),comparative270:cmp as never});
 assert.deepEqual(q(),['BASE+cmp271:current'],'the comparative reader does not use the plan');
 ingest({...custom('v2',[{}]),comparative270:cmp as never});ingest({...custom('v2b',[{}]),comparativeReaderVersion:TEST_LEAD_EXTRACTOR265,comparative270:cmp as never});
 assert.deepEqual(q(),['BASE+cmp271:current','v2+cmp271:superseded_by_reader'],'rolled back to the base reader: its own rows are current again');
 ingest({...custom('v3',[{}]),comparative270:[]});
 assert.deepEqual(q(),['BASE+cmp271:superseded_by_reader','v2+cmp271:superseded_by_reader']);
});
