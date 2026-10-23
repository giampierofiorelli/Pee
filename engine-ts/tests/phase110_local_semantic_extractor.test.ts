import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SourceWideSemanticMemory109} from '../src/phase109_source_wide_semantic_intake.js';
import {extractReview110,applyHumanReview110,ollamaLocal110,scoreHeldout110,
  type Draft110,type Model110,type SourceInput110,type ExtractionPacket110} from '../src/phase110_local_semantic_extractor.js';

const a='Cleaning was excellent, but the motor whined loudly at maximum power.';
const b='The brush trapped long pet hair. We measured 74.2 dB in maximum mode.';
const meta:SourceInput110={reportId:'review_110',originalTestId:'independent_test_110',
  sourceUrl:'https://reviews.example.org/lab/vacuum',categoryId:'vacuum',
  inventoryReviewerId:'human_auditor',inventoryReviewReference:'independent rendered source inventory',
  variants:['vacuum_a','vacuum_b'],blocks:[
    {segmentId:'paragraph',locator:'#conclusion',surface:'paragraph',accessible:true,
      representation:'complete',content:a},
    {segmentId:'footnote',locator:'#method-footnote',surface:'footnote',accessible:true,
      representation:'complete',content:b},
    {segmentId:'meta',locator:'#publisher-info',surface:'paragraph',accessible:true,
      representation:'complete',content:'Published by Test Lab in 2025.'}]};
function makeClaim(segmentId:string,which:'clean'|'whine'|'hair'|'db'){
  const text=segmentId==='paragraph'?a:b;
  const spans={clean:'Cleaning was excellent',whine:'the motor whined loudly at maximum power',
    hair:'The brush trapped long pet hair',db:'74.2 dB in maximum mode'};
  const span=spans[which];const start=text.indexOf(span);
  const candidate:Draft110={variantId:'vacuum_a',relatedVariantIds:[],
    conceptId:which==='hair'?'hair_wrap':which==='db'?'noise_loudness':which==='whine'?'motor_whine':'cleaning',
    criterionId:null,kind:which==='db'?'measurement':which==='hair'?'maintenance':'observation',
    polarity:which==='clean'?'favorable':'unfavorable',assertionCode:which==='db'?'noise_power_measured':
      which==='hair'?'brush_retains_long_hair':which==='whine'?'whine_at_high_mode':'strong_cleaning',
    evidenceMode:which==='db'?'direct_test':'expert_judgement',
    epistemicStatus:'observed',conditionCodes:which==='db'||which==='whine'?['high_power_mode']:[],
    evidenceStart:start,evidenceEnd:start+span.length,
    ...(which==='db'?{quantity:{value:74.2,unitCode:'db_sound_level',protocolId:'test_protocol_110'}}:{})};
  return {segmentId,candidate};
}
const clean=makeClaim('paragraph','clean'), whine=makeClaim('paragraph','whine'),
  hair=makeClaim('footnote','hair'), db=makeClaim('footnote','db');
function mock(initial:unknown,omission:unknown):Model110{return {name:'simulated_llm_not_a_real_model',
  async extract({mode,blocks}){const raw=(mode==='initial'?initial:omission) as any;
    return {claims:(raw.claims??[]).filter((x:any)=>blocks.some(b=>b.segmentId===x.segmentId)),
      emptySegments:(raw.emptySegments??[]).filter((x:string)=>blocks.some(b=>b.segmentId===x))}}}}
const initial={claims:[clean,hair,db],emptySegments:['meta']};
const omissions={claims:[whine],emptySegments:['meta']};
async function standard(){return extractReview110(meta,mock(initial,omissions))}
test('two passes extract an unexpectedly negative claim missed on first pass',async()=>{
  const r=await standard();
  assert.equal(r.proposed.length,4);assert.deepEqual(r.problems,[]);
  assert.deepEqual(r.unresolvedSegments,[]);
  assert.deepEqual(r.emptySuggested,['meta']);
  assert.deepEqual(r.proposed.map(x=>x.atom.conceptId).sort(),
    ['cleaning','hair_wrap','motor_whine','noise_loudness'].sort());
  assert.equal(r.extractionStatus,'needs_independent_adjudication');
});
test('provenance uses source offsets, hashes, no long review text or search query',async()=>{
  const r=await standard();const dumped=JSON.stringify(r);
  assert.ok(!dumped.includes('Cleaning was excellent'));
  assert.ok(!dumped.includes('The brush trapped'));
  assert.match(r.proposed[0].proof.spanSha256,/^[0-9a-f]{64}$/);
  assert.equal(r.proposed.every(c=>c.atom.isProvisional),true);
  assert.equal(r.manifest.segments.length,3);
});
test('runtime rejects hidden user query or intent metadata',async()=>{
  await assert.rejects(extractReview110({...meta,userQuery:'quiet vacuum'} as SourceInput110,
    mock(initial,omissions)),/query_neutral_input/);
});
test('rejects request-based reinterpretation as a canonical boolean fact',async()=>{
  const mal={...whine,candidate:{...whine.candidate,consumerNeed:'silence at night'}};
  const r=await extractReview110(meta,mock({claims:[mal],emptySegments:['meta']},omissions));
  assert.equal(r.problems.some(x=>x.includes('invalid_candidate_shape_or_span')),true);
});
test('invalid source span is quarantined rather than creating a fact',async()=>{
  const bad={...whine,candidate:{...whine.candidate,evidenceStart:999}};
  const r=await extractReview110(meta,mock({claims:[bad],emptySegments:['meta']},omissions));
  assert.equal(r.problems.length,1);
  assert.ok(!r.proposed.some(x=>x.atom.assertionCode==='whine_at_high_mode')||r.proposed.length===1);
});
test('fabricated measurement whose number is missing from evidence is rejected',async()=>{
  const invalid={...db,candidate:{...db.candidate,quantity:{value:999.9,unitCode:'db_sound_level',protocolId:'lab_protocol'}}};
  const r=await extractReview110(meta,mock({claims:[invalid],emptySegments:['meta']},{claims:[],emptySegments:[]}));
  assert.match(r.problems[0],/unanchored_numeric_value/);
});
test('numeric check does not assert calibrated unit or protocol correctness',async()=>{
  const r=await standard();const m=r.proposed.find(x=>x.atom.kind==='measurement')!;
  assert.equal(m.atom.quantity?.value,74.2);
  assert.equal(r.validationScope,'offset_and_shape_only_not_semantic_entailment');
});
test('missing review of one accessible segment cannot be treated as complete',async()=>{
  const r=await extractReview110(meta,mock({claims:[clean],emptySegments:[]},
    {claims:[],emptySegments:[]}));
  assert.deepEqual(r.unresolvedSegments,['footnote','meta']);
});
test('nontext visual representation partial blocks review even if caption exists',async()=>{
  const extended={...meta,blocks:[...meta.blocks,{segmentId:'chart',locator:'#noise-chart',
    surface:'figure' as const,accessible:true,representation:'partial' as const,
    content:'Figure caption only, graph values cannot be read.'}]};
  const r=await extractReview110(extended,mock(initial,omissions));
  assert.deepEqual(r.unresolvedSegments,['chart']);
});
test('unavailable figure prevents sealing, even if a model claims it was empty',async()=>{
  const extended={...meta,blocks:[...meta.blocks,{segmentId:'figure',locator:'#fig',
    surface:'figure' as const,accessible:false,representation:'unavailable' as const}]};
  const r=await extractReview110(extended,mock(initial,omissions));
  assert.deepEqual(r.unresolvedSegments,['figure']);
});
test('model cannot claim nonexistent segment is empty',async()=>{
  const r=await extractReview110(meta,{name:'malformed_mock',async extract(){
    return {claims:[],emptySegments:['not_a_segment']};}});
  assert.ok(r.problems.some(x=>x.includes('invalid_empty_segment')));
});
test('deduplicates exact identical observations proposed on two model passes',async()=>{
  const r=await extractReview110(meta,mock(initial,{...omissions,claims:[...initial.claims,...omissions.claims]}));
  assert.equal(r.proposed.length,4);
});
test('model says there are no claims but it still requires explicit independent review',async()=>{
  const r=await extractReview110(meta,mock({claims:[],emptySegments:['paragraph','footnote','meta']},
    {claims:[],emptySegments:['paragraph','footnote','meta']}));
  assert.equal(r.proposed.length,0);
  assert.equal(r.extractionStatus,'needs_independent_adjudication');
  const db=new SourceWideSemanticMemory109();try{
    assert.throws(()=>applyHumanReview110(db,r,{reviewerId:'reviewer_one',receipt:'fake_approval',
      decisions:r.manifest.segments.map(s=>({segmentId:s.segmentId,approvedAtomIds:[],
        status:'no_product_observation',noObservationReason:'no_product_claim'}))},()=>false),
      /adjudication_or_source_unresolved/);
  }finally{db.close()}
});
function reviewer(r:ExtractionPacket110){return {reviewerId:'human_auditor_b',
  receipt:'externally_verified_receipt_110',decisions:r.manifest.segments.map(s=>{
    const atoms=r.proposed.filter(c=>c.atom.segmentId===s.segmentId).map(c=>c.atom.atomId);
    return atoms.length?{segmentId:s.segmentId,status:'extracted' as const,approvedAtomIds:atoms}:
      {segmentId:s.segmentId,status:'no_product_observation' as const,approvedAtomIds:[],
        noObservationReason:'publisher_metadata' as const};
  })};}
test('authenticated human approval bridges the source-wide packet to phase109 authoritative memory',async()=>{
  const r=await standard();const db=new SourceWideSemanticMemory109();try{
    applyHumanReview110(db,r,reviewer(r),a=>a.receipt==='externally_verified_receipt_110');
    assert.equal(db.coverage('review_110').sealed,true);
    assert.equal(db.allAtoms('review_110').length,4);
    assert.equal(db.allAtoms('review_110').every(x=>!x.isProvisional),true);
    assert.equal(db.allAtoms('review_110').some(x=>x.conceptId==='hair_wrap'),true);
  }finally{db.close()}
});
test('review refuses to ignore a candidate just because it was not in the query',async()=>{
  const r=await standard();const approval=reviewer(r);
  const d=approval.decisions.find(x=>x.segmentId==='footnote')!;
  d.approvedAtomIds=d.approvedAtomIds.slice(0,1);
  const db=new SourceWideSemanticMemory109();try{
    assert.throws(()=>applyHumanReview110(db,r,approval,()=>true),/unreviewed_candidate_requires_resolution/);
  }finally{db.close()}
});
test('rejected claim cannot be relabeled as empty without independent resolution',async()=>{
  const r=await standard();const approval=reviewer(r);const d=approval.decisions.find(x=>x.segmentId==='footnote')!;
  (d as any).status='no_product_observation';d.approvedAtomIds=[];
  (d as any).noObservationReason='no_product_claim';
  const db=new SourceWideSemanticMemory109();try{
    assert.throws(()=>applyHumanReview110(db,r,approval,()=>true),/unfounded_empty_review/);
  }finally{db.close()}
});
test('unresolved source or invalid candidate blocks all promotion',async()=>{
  const r=await extractReview110(meta,mock({claims:[{...clean,candidate:{...clean.candidate,conceptId:'Untrusted Code'}}],
    emptySegments:['meta']},{claims:[whine],emptySegments:[]}));
  const db=new SourceWideSemanticMemory109();try{
    assert.throws(()=>applyHumanReview110(db,r,reviewer(r),()=>true),/adjudication_or_source_unresolved/);
  }finally{db.close()}
});
test('SQLite retains reviewed atomic observations, not review paragraphs after close/reopen',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'pee110-')),path=join(directory,'memory.sqlite');
  try{const packet=await standard();let db=new SourceWideSemanticMemory109(path);
    applyHumanReview110(db,packet,reviewer(packet),()=>true);db.close();
    db=new SourceWideSemanticMemory109(path);
    assert.equal(db.allAtoms('review_110').length,4);
    assert.equal(db.coverage('review_110').sealed,true);db.close();
    const bytes=readFileSync(path,'utf8');
    assert.equal(bytes.includes('Cleaning was excellent'),false);
    assert.equal(bytes.includes('The brush trapped'),false);
  }finally{rmSync(directory,{recursive:true,force:true})}
});
test('uses a local-only inference endpoint and rejects remote inference',()=>{
  assert.throws(()=>ollamaLocal110('local-model','https://api.commercial.example/api/chat'),/only_local/);
  assert.throws(()=>ollamaLocal110('local-model','http://192.168.0.2:11434/api/chat'),/only_local/);
  assert.equal(ollamaLocal110('local-model').name,'ollama:local-model');
});
test('held-out validation reports real false negatives and stratifies by source surface',()=>{
  const v=scoreHeldout110([{surface:'paragraph',expected:['a','b'],predicted:['a','c']},
    {surface:'footnote',expected:['d'],predicted:[]}]);
  assert.deepEqual([v.tp,v.fp,v.fn],[1,1,2]);
  assert.equal(v.precision,.5);assert.equal(v.recall,1/3);
  assert.equal(v.bySurface.footnote.recall,0);
  assert.equal(v.benchmarkStatus,'requires_independent_real_source_annotation');
});

test('literal evidence anchor determines correct indices, and anchor is discarded',async()=>{
  const c={...clean,candidate:{...clean.candidate,evidenceStart:0,evidenceEnd:8,
    evidenceText:'Cleaning was excellent'}};
  const r=await extractReview110(meta,mock({claims:[c],emptySegments:['meta']},
    {claims:[],emptySegments:['meta']}));
  assert.deepEqual(r.problems,[]);
  const one=r.proposed[0];
  assert.equal(one.proof.start,0);
  assert.equal(one.proof.end,'Cleaning was excellent'.length);
  assert.equal(JSON.stringify(r).includes('Cleaning was excellent'),false);
});
test('fabricated literal anchor cannot become a semantic observation',async()=>{
  const fake={...clean,candidate:{...clean.candidate,evidenceText:'This imaginary device kills all viruses'}};
  const r=await extractReview110(meta,mock({claims:[fake],emptySegments:['meta']},
    {claims:[],emptySegments:['meta']}));
  assert.ok(r.problems.some(x=>x.includes('ambiguous_or_missing_anchor')));
  assert.equal(r.proposed.length,0);
});
test('oversized content is flagged, never silently truncated or sealed',async()=>{
  const review={...meta,blocks:[...meta.blocks,{segmentId:'long_appendix',locator:'#long',
    surface:'methodology' as const,accessible:true,representation:'complete' as const,
    content:'X'.repeat(14001)}]};
  const r=await extractReview110(review,mock(initial,omissions));
  assert.ok(r.unresolvedSegments.includes('long_appendix'));
});
test('local model errors quarantine review instead of auto accepting an empty block',async()=>{
  const r=await extractReview110(meta,{name:'unavailable_local_model',async extract(){
    throw Error('network refused potentially sensitive source');}});
  assert.equal(r.proposed.length,0);
  assert.ok(r.problems.some(x=>x.includes('local_model_unavailable_or_failed')));
  assert.equal(JSON.stringify(r).includes('potentially sensitive source'),false);
});
