import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {planLongSource111,auditContext111,gateRequest111,
  type Reading111,type RequestInterpretations111} from '../src/phase111_long_context_and_query_ambiguity.js';
import {makeEphemeralInventory109} from '../src/phase109_source_wide_semantic_intake.js';
import type {SourceInput110,ExtractionPacket110} from '../src/phase110_local_semantic_extractor.js';
const source='The wash results were strong. '+('In ordinary conditions it cleans reliably. '.repeat(450))+
  ' This conclusion does NOT apply to the eco cycle; the manufacturer claim has not been tested.';
const input:SourceInput110={reportId:'test_article',originalTestId:'original_lab_a',
  sourceUrl:'https://example.org/review/dishwasher',categoryId:'dishwasher',
  inventoryReviewerId:'auditor_a',inventoryReviewReference:'Independent inventory completed by reviewer',
  variants:['wash_a'],blocks:[{segmentId:'main',locator:'#article',surface:'paragraph',accessible:true,
      representation:'complete',content:source},
    {segmentId:'method',locator:'#method',surface:'methodology',accessible:true,
      representation:'complete',content:'Virus inactivation was NOT assessed, but bacteria were.'}]};
const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
const originalManifest=makeEphemeralInventory109({...input,blocks:input.blocks.map(({representation, ...rest})=>rest)});
const fakePacket:ExtractionPacket110={manifest:originalManifest,modelNames:['fake'],problems:[],
  proposed:[{atom:{atomId:'atom_one',segmentId:'main',variantId:'wash_a',relatedVariantIds:[],
    conceptId:'cleaning',criterionId:null,kind:'observation',polarity:'favorable',
    assertionCode:'strong_clean',evidenceMode:'expert_judgement',conditionCodes:[],
    epistemicStatus:'observed',reviewReference:'review evidence reference',isProvisional:true},
    proof:{start:0,end:21,spanSha256:sha(source.slice(0,21))}}],emptySuggested:[],
    unresolvedSegments:[],extractionStatus:'needs_independent_adjudication',
    validationScope:'offset_and_shape_only_not_semantic_entailment'};
const baseRead=(override:Partial<Reading111>={}):Reading111=>({readingId:'reading_one',
  interpretationCode:'relative_quiet_priority',topVariantId:'wash_a',eligibleVariantIds:['wash_a','wash_b'],
  absoluteConstraints:[],relativePreferences:['noise_priority'],evidenceGaps:[],...override});
const gate=(readings:Reading111[],issues:RequestInterpretations111['issues']=[],
  inspection:RequestInterpretations111['inspection']='alternative_meanings_checked')=>
  gateRequest111({requestId:'request_one',inspection,readings,issues});
const issue={issueCode:'sanitize_scope',kind:'capability' as const,
  question:'Intendi riduzione dei batteri oppure anche inattivazione dei virus?',
  options:['Solo batteri','Anche i virus']};
test('long passages split into multiple bounded windows without losing any characters',()=>{
  const p=planLongSource111(input,{windowUnits:2400,overlapUnits:320});
  const ss=p.windows.filter(w=>w.parentId==='main');
  assert.ok(ss.length>5);assert.equal(ss[0].start,0);assert.equal(ss.at(-1)!.end,source.length);
  assert.ok(ss.every(w=>w.end-w.start<=2400));
  for(let i=0;i<ss.length;i++){
    const w=ss[i],body=p.windowedInput.blocks.find(b=>b.segmentId===w.windowId)!.content!;
    assert.equal(body,source.slice(w.start,w.end));assert.equal(sha(body),w.windowSha256);
    if(i)assert.ok(w.start<ss[i-1].end);
  }
  assert.deepEqual(p.crossWindowReviewRequired,['main']);
  assert.equal(p.coverage,'all_accessible_utf16_units_inventoried_not_semantic_recall');
});
test('preserves explicit source methodology segments along with windowed text',()=>{
  const p=planLongSource111(input);
  assert.equal(p.windowedInput.blocks.some(b=>b.surface==='methodology'),true);
  assert.equal(p.windowedInput.originalTestId,'original_lab_a');
});
test('unavailable figures stay inaccessible, never become empty favorable evidence',()=>{
  const p=planLongSource111({...input,blocks:[...input.blocks,
    {segmentId:'chart',locator:'#chart',surface:'figure',representation:'unavailable',accessible:false}]});
  assert.equal(p.windowedInput.blocks.find(b=>b.segmentId==='chart')?.accessible,false);
});
test('no query or preferences can sneak into the canonical source plan',()=>{
  assert.throws(()=>planLongSource111({...input,userQuery:'only virus-killing ones'} as SourceInput110),/invalid_source/);
});
test('rejects unsafe window size/overlap rather than truncating a long source',()=>{
  assert.throws(()=>planLongSource111(input,{windowUnits:700,overlapUnits:200}),/invalid_window_policy/);
  assert.throws(()=>planLongSource111(input,{windowUnits:2400,overlapUnits:1300}),/invalid_window_policy/);
});
test('preserves source utf16 surrogate pairs at window boundaries',()=>{
  const emoji='test '.repeat(300)+'🧪'+' good performance '.repeat(300);
  const p=planLongSource111({...input,blocks:[{...input.blocks[0],content:emoji}]},
    {windowUnits:1300,overlapUnits:220});
  assert.ok(p.windows.every(w=>{const s=p.windowedInput.blocks.find(b=>b.segmentId===w.windowId)!.content!;
    return !/^[\uDC00-\uDFFF]/.test(s) && !/[\uD800-\uDBFF]$/.test(s)}));
});
test('scope audit records reference to later method negation without promoting interpretation',()=>{
  const txt=input.blocks[1].content!,start=txt.indexOf('NOT assessed');
  const a=auditContext111(fakePacket,input,[{atomId:'atom_one',contextSegmentId:'method',
    contextStart:start,contextEnd:start+'NOT assessed'.length,kind:'negation_scope',
    relationship:'qualifies'}]);
  assert.equal(a.findings.length,1);assert.equal(a.problems.length,0);
  assert.equal(a.findings[0].spanSha256,sha('NOT assessed'));
  assert.deepEqual(a.remainingReview,['atom_one']);
  assert.equal(a.status,'needs_independent_document_level_adjudication');
  assert.ok(!JSON.stringify(a).includes('Virus inactivation'));
});
test('scope proposals cannot invent a source quote outside the document',()=>{
  const a=auditContext111(fakePacket,input,[{atomId:'atom_one',contextSegmentId:'method',
    contextStart:999,contextEnd:1008,kind:'negation_scope',relationship:'limits'}]);
  assert.equal(a.problems.length,1);assert.equal(a.findings.length,0);
});
test('scope proposal must refer to an existing observation',()=>{
  const a=auditContext111(fakePacket,input,[{atomId:'fake_atom',contextSegmentId:'method',
    contextStart:0,contextEnd:9,kind:'protocol_scope',relationship:'qualifies'}]);
  assert.equal(a.problems.length,1);
});
test('source scope audit fails when the original inventory changes',()=>{
  assert.throws(()=>auditContext111(fakePacket,{...input,reportId:'other_report'},[]),/different_review_inventory/);
});
test('no detected context issues never implies independently proven comprehension',()=>{
  const a=auditContext111(fakePacket,input,[]);
  assert.deepEqual(a.remainingReview,['atom_one']);
  assert.equal(a.guarantee,'literal_span_only_not_scope_resolution_or_entailment');
});
test('quietest is a relative preference, not a hard exclusion',()=>{
  const x=gate([baseRead()]);
  assert.equal(x.action,'proceed');assert.equal(x.chosenReadingId,'reading_one');
  assert.equal(x.distinctPossibleWinners[0],'wash_a');
});
test('material ambiguity changing recommended winner asks one relevant question',()=>{
  const x=gate([baseRead(),baseRead({readingId:'reading_two',interpretationCode:'absolute_silence',
    topVariantId:'wash_b',absoluteConstraints:['noise_under_threshold'],relativePreferences:[]})],[issue]);
  assert.equal(x.action,'clarify');assert.equal(x.question,issue.question);
  assert.deepEqual(x.options,issue.options);
});
test('different absolute capabilities require clarification even if winner unchanged',()=>{
  const x=gate([baseRead(),baseRead({readingId:'reading_two',interpretationCode:'virus_killing',
    absoluteConstraints:['validated_virucidal_effect']})],[issue]);
  assert.equal(x.action,'clarify');
});
test('different eligibility sets are material regardless of same top product',()=>{
  const x=gate([baseRead(),baseRead({readingId:'reading_two',interpretationCode:'tight_width',
    eligibleVariantIds:['wash_a']})],[issue]);
  assert.equal(x.action,'clarify');
});
test('when all plausible interpretations have the same grounded result no redundant question',()=>{
  const x=gate([baseRead(),baseRead({readingId:'reading_two',interpretationCode:'noise_comfort',
    relativePreferences:['noise_priority','comfort_priority']})],[issue]);
  assert.equal(x.action,'proceed');assert.equal(x.question,null);
});
test('evidence missing is not an ambiguous preference and cannot prove virus removal',()=>{
  const x=gate([baseRead({topVariantId:null,evidenceGaps:['virus_efficacy_unknown']})]);
  assert.equal(x.action,'gather_evidence');
});
test('without alternatives checked must run interpretive pass before ranking',()=>{
  const x=gate([baseRead()],[], 'not_yet_checked');
  assert.equal(x.action,'analyze_alternatives');
});
test('materially different readings without a prepared user question cannot silently rank',()=>{
  const x=gate([baseRead(),baseRead({readingId:'reading_two',interpretationCode:'different',
    topVariantId:'wash_b'})]);
  assert.equal(x.action,'analyze_alternatives');
});
test('invalid user interpretation cannot silently remove impossible best product',()=>{
  assert.throws(()=>gate([baseRead({eligibleVariantIds:['wash_b']})]),/invalid_interpretation/);
});
test('ranking decisions never contain reviewed observations or source prose',()=>{
  const x=gate([baseRead()]);
  assert.equal(x.caution,'rankings_are_private_projections_not_product_facts');
  assert.ok(!JSON.stringify(x).includes('Virus inactivation'));
});

test('changing source text with same inventory identity invalidates scope provenance',()=>{
  const changed={...input,blocks:input.blocks.map(b=>b.segmentId==='method'?{
    ...b,content:'Virus inactivation was assessed and verified.'}:b)};
  assert.throws(()=>auditContext111(fakePacket,changed,[]),/stale_document_revision/);
});

test('end-to-end windowed extraction returns separate provisional claims for overlap review',async()=>{
  const {extractLongReview111}=await import('../src/phase111_long_context_and_query_ambiguity.js');
  // Deliberately short enough to exercise two windows and a uniquely anchored finding.
  const base='Ordinary cleaning was adequate. '.repeat(60);
  const suspicious='Test found a buzzing tone.';
  const reviewText=base+suspicious+' Cleaning improved. '.repeat(40);
  const x={...input,blocks:[{...input.blocks[0],content:reviewText}]};
  let invocations=0;
  const result=await extractLongReview111(x,{name:'controlled_simulation',async extract({mode,blocks}){
    invocations++;
    const claims=blocks.flatMap(b=>{
      if(mode!=='initial'||!b.content.includes(suspicious))return [];
      const start=b.content.indexOf(suspicious);
      return [{segmentId:b.segmentId,candidate:{variantId:'wash_a',relatedVariantIds:[],
        conceptId:'buzzing_noise',criterionId:null,kind:'observation',polarity:'unfavorable',
        assertionCode:'audible_buzz',evidenceMode:'expert_judgement',conditionCodes:[],
        epistemicStatus:'observed',evidenceStart:start,evidenceEnd:start+suspicious.length,
        evidenceText:suspicious}}];
    });
    return {claims,emptySegments:blocks.filter(b=>!b.content.includes(suspicious)).map(b=>b.segmentId)};
  }},{windowUnits:1300,overlapUnits:300});
  assert.equal(result.status,'needs_independent_cross_window_adjudication');
  assert.ok(invocations>=4);
  assert.ok(result.candidates.length>=1);
  for(const c of result.candidates){
    assert.equal(reviewText.slice(c.originalStart,c.originalEnd),suspicious);
    assert.equal(c.parentId,'main');
  }
  assert.ok(!JSON.stringify(result.packet).includes(suspicious));
});

test('nested user query or unexpected block metadata never enters canonical extraction',()=>{
  assert.throws(()=>planLongSource111({...input,blocks:[{...input.blocks[0],
    userIntent:'quietest' } as SourceInput110['blocks'][number]]}),/invalid_source_block/);
});

test('unusually long intact source section can be partitioned, not silently truncated',()=>{
  const massive='Useful data. '.repeat(17000);
  const p=planLongSource111({...input,blocks:[{...input.blocks[0],content:massive}]});
  assert.ok(p.windows.length>10);
  assert.equal(p.windows.at(-1)!.end,massive.length);
});
