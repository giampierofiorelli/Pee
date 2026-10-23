import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeGLiNER25ColabCase159} from '../src/phase159_colab_gliner25_coordinator.js';
import type {ReaderInput139} from '../src/phase139_unmarked_english_candidate_reader.js';
const file=JSON.parse(readFileSync('research/phase159/GLINER25-COLAB-CONSTRUCTED-PILOT.json','utf8')) as any;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const inp=(id:string,txt=file.cases[id].input):ReaderInput139=>({document:{text:txt,sha256:sha(txt),source:{
 id,originalDocumentId:id,url:'https://example.org/constructed-diagnostic',
 title:id==='constructed_fridge'?'Maytag MRT311FFFE diagnostic':'DeLonghi Dedica Duo diagnostic',role:'original_product_test'}}});
const clone=()=>structuredClone(file);
test('authentic Colab fridge JSON aligns 7 spans to exact source offsets and runs heuristic coordination',()=>{
 const r=analyzeGLiNER25ColabCase159(inp('constructed_fridge'),file,'constructed_fridge');
 assert.equal(r.neuralSpans.length,7);assert.equal(r.baseline.phase,156);
 assert.ok(r.neuralSpans.some(x=>x.text==='44.9 dBA'&&x.label==='measured_value'));
 for(const x of r.neuralSpans)assert.equal(file.cases.constructed_fridge.input.slice(x.start,x.end),x.text);
 assert.equal(r.modelInterpretations.find(x=>x.surface==='MRT311FFFE')?.status,'explicitly_tested');
 assert.equal(r.modelInterpretations.find(x=>x.surface==='GTS22KGNRWW')?.status,'comparison_only');
 assert.equal(r.featureValueCandidates.length,1);
 assert.equal(r.featureValueCandidates[0].feature,'cooling noise');
 assert.equal(r.featureValueCandidates[0].value,'44.9 dBA');
 assert.equal(r.featureValueCandidates[0].assignment,'provisional_name_reference');
 assert.equal(r.featureValueCandidates[0].scientificEvidence,false);
 assert.equal(r.neuralModelExecutedWithinPEE,false);assert.equal(r.checkpointAuthenticated,false);
 assert.equal(r.canonicalWriteAuthorized,false);assert.equal(r.identityMergeAuthorized,false);
 assert.equal(r.rankingAuthorized,false);
});
test('comparison-only Breville is NOT automatically a contradictory test statement',()=>{
 const r=analyzeGLiNER25ColabCase159(inp('constructed_coffee'),file,'constructed_coffee');
 assert.equal(r.neuralSpans.length,5);
 const de=r.modelInterpretations.find(x=>x.surface==="De'Longhi Dedica Duo");
 const br=r.modelInterpretations.find(x=>x.surface==='Breville Bambino');
 assert.equal(de?.status,'explicitly_tested');assert.equal(br?.status,'explicitly_not_tested');
 assert.equal(br?.positiveCues.length,0);assert.equal(br?.negativeCues.length,1);
 assert.equal(br?.comparisonCues.length,1);assert.equal(br?.usedUniqueAlias,true);
 assert.ok(!r.unresolved.includes('contradictory_test_status_requires_review'));
 assert.ok(r.voteDiagnostics.unverifiedVotes);
});
test('report SHA preserves original file; same input always deterministic',()=>{
 const a=analyzeGLiNER25ColabCase159(inp('constructed_fridge'),file,'constructed_fridge');
 const b=analyzeGLiNER25ColabCase159(inp('constructed_fridge'),file,'constructed_fridge');
 assert.deepEqual(a,b);assert.equal(a.reportSha256,sha(JSON.stringify(file)));
});
test('refuses edited user text even with the same report and correct input digest',()=>{
 const t=file.cases.constructed_fridge.input+' Not in the source.';
 assert.throws(()=>analyzeGLiNER25ColabCase159(inp('constructed_fridge',t),file,'constructed_fridge'),/unbound_or_error_inference_case/);
});
test('refuses source document with bogus declared digest',()=>{
 const i=inp('constructed_fridge');i.document.sha256='00';
 assert.throws(()=>analyzeGLiNER25ColabCase159(i,file,'constructed_fridge'),/invalid_source_digest/);
});
test('rejects false offsets and fabricated predicted surfaces',()=>{
 const r=clone();r.cases.constructed_fridge.entities.measured_value[0].text='99.9 dBA';
 assert.throws(()=>analyzeGLiNER25ColabCase159(inp('constructed_fridge'),r,'constructed_fridge'),/invalid_neural_span/);
});
test('rejects invalid confidence, including >1 and NaN',()=>{
 for(const val of [-0.1,1.00001,NaN]){
  const r=clone();r.cases.constructed_fridge.entities.brand[0].confidence=val;
  assert.throws(()=>analyzeGLiNER25ColabCase159(inp('constructed_fridge'),r,'constructed_fridge'),/invalid_neural_span/);
 }
});
test('refuses invented model ID, external execution being disguised as PEE or attestation changes',()=>{
 for(const change of [{model_id:'fake/gliner'},{model_integration_status:'connected_to_PEE'},{case_status:'independent_benchmark'}]){
  const r=Object.assign(clone(),change);
  assert.throws(()=>analyzeGLiNER25ColabCase159(inp('constructed_fridge'),r,'constructed_fridge'),/invalid_report_envelope/);
 }
});
test('rejects unsupported classes, missing classes, and candidate budgets',()=>{
 for(const mutate of [
  (r:any)=>r.cases.constructed_fridge.entities.unknown=[],
  (r:any)=>delete r.cases.constructed_fridge.entities.brand,
  (r:any)=>r.cases.constructed_fridge.entities.brand=Array(201).fill(r.cases.constructed_fridge.entities.brand[0])]){
  const r=clone();mutate(r);
  assert.throws(()=>analyzeGLiNER25ColabCase159(inp('constructed_fridge'),r,'constructed_fridge'),/invalid_entity_types|entity_budget_exceeded/);
 }
});
test('rejects declared offset errors and duplicate spans',()=>{
 const r=clone();r.cases.constructed_fridge.offset_errors.push('test');
 assert.throws(()=>analyzeGLiNER25ColabCase159(inp('constructed_fridge'),r,'constructed_fridge'),/unbound_or_error_inference_case/);
 const x=clone();x.cases.constructed_fridge.entities.brand.push(x.cases.constructed_fridge.entities.brand[0]);
 assert.throws(()=>analyzeGLiNER25ColabCase159(inp('constructed_fridge'),x,'constructed_fridge'),/duplicate_neural_span/);
});
test('a truly conflicting test/non-test claim is retained rather than resolved',()=>{
 const text='We tested Breville Bambino. We did not test the Bambino.';
 const r=clone();const loc=text.indexOf('Breville Bambino');
 r.cases.constructed_coffee.input=text;
 r.cases.constructed_coffee.entities={product_model:[{text:'Breville Bambino',start:loc,end:loc+16,confidence:0.9}],brand:[],product_feature:[],measured_value:[]};
 const out=analyzeGLiNER25ColabCase159(inp('constructed_coffee',text),r,'constructed_coffee');
 assert.equal(out.modelInterpretations[0].status,'both_tested_and_not_tested');
 assert.ok(out.unresolved.includes('contradictory_test_status_requires_review'));
 assert.equal(out.rankingAuthorized,false);
});
test('short published-excerpt report is accepted only with source metadata, never source authentication',()=>{
 const text='The LG STUDIO SRFB27W3 provides great refrigerator capacity.';
 const r=clone();r.case_status='published_short_excerpts_not_independent_benchmark';
 r.cases.constructed_fridge={
  input:text,source_url:'https://www.rtings.com/refrigerator/reviews/lg/studio-srfb27w3',
  source_title:'LG STUDIO SRFB27W3 Review',
  entities:{product_model:[{text:'LG STUDIO SRFB27W3',start:4,end:22,confidence:0.91}],brand:[],product_feature:[],measured_value:[]},
  seconds_inference:0.4,offset_errors:[]
 };
 const i=inp('constructed_fridge',text);i.document.source.url=r.cases.constructed_fridge.source_url;i.document.source.title=r.cases.constructed_fridge.source_title;
 const out=analyzeGLiNER25ColabCase159(i,r,'constructed_fridge');
 assert.equal(out.caseStatus,'published_short_excerpts_not_independent_benchmark');
 assert.equal(out.neuralSpans.length,1);assert.equal(out.sourceAuthenticated,false);
 assert.equal(out.modelQualityBenchmark,false);assert.equal(out.rankingAuthorized,false);
 assert.ok(out.unresolved.includes('source_is_unverified_short_editorial_excerpt'));
 const altered=clone();altered.case_status=r.case_status;altered.cases.constructed_fridge=r.cases.constructed_fridge;
 altered.cases.constructed_fridge.source_url='https://example.com/other';
 assert.throws(()=>analyzeGLiNER25ColabCase159(i,altered,'constructed_fridge'),/unbound_published_excerpt_metadata/);
});
