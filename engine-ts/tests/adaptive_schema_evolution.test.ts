import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {captureSchemaGap,discoverAdaptiveSchema,adaptiveSignature,promoteReviewedFields,quarantineAutoRelation,
 planAdaptiveBackfill,readSchemaCompatibleObservations,type AdaptiveDefinition,type GapSignal} from '../src/adaptive_schema_evolution.js';
import {buildCategoryEvidenceMatrix,type CategoryFieldRegistry,type ProposedStructuredFact} from '../src/category_evidence_matrix.js';
import type {WebCandidate,WebSourcePolicy,EvidenceProcessingResult} from '../src/web_evidence_acquisition.js';
const h=(x:string)=>createHash('sha256').update(x).digest('hex');
const t='2026-10-10T19:00:00Z';
const registry:CategoryFieldRegistry={categoryId:'headphones',schemaVersion:1,
 reviewedBy:'human_editor',reviewReference:'legacy_review',fields:[
  {key:'battery_runtime',type:'number',unit:'hours',allowedValues:[],contextKeys:['anc_mode'],
   requiresProtocol:true,permittedOrigins:['independent_lab_measurement']}]};
const gap:AdaptiveDefinition={kind:'field',field:{key:'speech_intelligibility_with_anc',type:'enum',unit:null,
 allowedValues:['poor','fair','good'],contextKeys:['environment','noise_type'],
 requiresProtocol:false,permittedOrigins:['independent_professional_assessment']}};
const candidate=(n:number):WebCandidate=>({id:'candidate_'+n,sourceId:'editorial_'+n,
 url:`https://review${n}.org.uk/headphones`,exactVariantId:'variant_'+n,
 originalTestId:'original_test_'+n,lineageAttestationReference:'human_checked_original_test_'+n,
 kind:'original_professional_test',publishedAt:t,updatedAt:t,metadataOrigin:'human_supplied'});
const policy=(n:number):WebSourcePolicy=>({sourceId:'editorial_'+n,host:`review${n}.org.uk`,basis:'written_permission',
 rightsDocumentId:'permission_'+n,rightsDocumentUrl:`https://review${n}.org.uk/permissions`,
 reviewedBy:'human_legal_reviewer',reviewedAt:t,validUntil:'2027-12-01T00:00:00Z',
 permittedOperations:['page_retrieval','local_analysis','fact_storage','public_citation'],
 robots:'allowed',robotsCheckedAt:t,websiteTerms:'reviewed_permitted',termsCheckedAt:t,commercialUseReviewed:true});
const fact=(n:number):ProposedStructuredFact=>({observationId:'observation_'+n,fieldKey:'speech_intelligibility_with_anc',
 origin:'independent_professional_assessment',value:{type:'enum',choice:'fair'},
 context:{environment:'office',noise_type:'human_speech'},protocolId:null,protocolVersion:null,
 valueTextSha256:h('value'+n),anchorSha256:h('anchor'+n)});
const processing=(n:number):EvidenceProcessingResult=>({status:'quarantined_human_method_and_rights_review',
 sourceUrl:candidate(n).url,contentSha256:h('body'+n),observationDigests:[
  {criterionId:gap.kind==='field'?gap.field.key:'',valueTextSha256:fact(n).valueTextSha256,anchorSha256:fact(n).anchorSha256}],
 originalTestId:candidate(n).originalTestId,exactVariantId:candidate(n).exactVariantId,
 citations:[candidate(n).url],reasons:['quarantined'],rankingEligible:false,publicationReady:false});
const grab=(n:number,proposal:AdaptiveDefinition=gap)=>captureSchemaGap({registry,proposal,
 fact:proposal.kind==='relationship'?{relationKey:proposal.relation.key,targetId:'device_'+n,
  origin:'independent_professional_assessment',context:{environment:'office'},
  valueTextSha256:fact(n).valueTextSha256,anchorSha256:fact(n).anchorSha256}:fact(n),
 candidate:candidate(n),policy:policy(n),processing:proposal.kind==='relationship'?{
  ...processing(n),observationDigests:[{criterionId:proposal.relation.key,valueTextSha256:fact(n).valueTextSha256,
   anchorSha256:fact(n).anchorSha256}]}:processing(n),asOf:t});
const signal=(n:number)=>{
 const r=grab(n);assert.equal(r.status,'quarantined_gap_signal');
 if(r.status!=='quarantined_gap_signal')throw Error('No signal');return r.signal;
};

test('an authorized, anchored missing category field creates quarantined gap only',()=>{
 const r=grab(1);assert.equal(r.status,'quarantined_gap_signal');
 if(r.status==='quarantined_gap_signal'){
  assert.equal(r.signal.categoryId,'headphones');
  assert.equal(JSON.stringify(r.signal).includes('review article'),false);
  assert.equal(r.signal.provenance,'rights_attested_quarantined_unverified');
 }
});
test('unreviewed rights, wrong host, expired robots and fabricated digests are rejected',()=>{
 const common={registry,proposal:gap,fact:fact(1),candidate:candidate(1),policy:policy(1),processing:processing(1),asOf:t};
 assert.equal(captureSchemaGap({...common,policy:{...policy(1),commercialUseReviewed:false}}).status,'rejected');
 assert.equal(captureSchemaGap({...common,policy:{...policy(1),host:'unrelated.org.uk'}}).status,'rejected');
 assert.equal(captureSchemaGap({...common,policy:{...policy(1),robotsCheckedAt:'2026-09-01T00:00:00Z'}}).status,'rejected');
 assert.equal(captureSchemaGap({...common,fact:{...fact(1),anchorSha256:h('fake')}}).status,'rejected');
});
test('cannot silently overwrite a field even with a different declared meaning',()=>{
 const old:AdaptiveDefinition={kind:'field',field:{...registry.fields[0],unit:'minutes'}};
 const f:ProposedStructuredFact={...fact(1),fieldKey:'battery_runtime',value:{type:'number',number:200,unit:'minutes'}};
 assert.deepEqual(captureSchemaGap({registry,proposal:old,fact:f,candidate:candidate(1),
  policy:policy(1),processing:processing(1),asOf:t}),{status:'rejected',reason:'field_already_registered_or_semantic_change_requires_review'});
});
test('single source or duplicate cannot create research schema field',()=>{
 const one=signal(1),out=discoverAdaptiveSchema(registry,[one,one]);
 assert.equal(out.autoFields.length,0);assert.equal(out.proposals[0].status,'needs_more_evidence');
 assert.equal(out.proposals[0].originalTestCount,1);
});
test('independent test, source and variant signals auto-extend RESEARCH catalogue',()=>{
 const out=discoverAdaptiveSchema(registry,[signal(1),signal(2)]);
 assert.equal(out.autoFields.length,1);assert.equal(out.parentSchemaVersion,1);
 assert.equal(out.autoFields[0].key,'speech_intelligibility_with_anc');
 assert.equal(out.proposals[0].status,'auto_research_candidate');
 assert.equal(out.publicationReady,false);assert.equal(out.rankingEligible,false);
 assert.equal('reviewedBy' in out,false);
});
test('two web pages reporting ONE original test cannot satisfy independence',()=>{
 const first=signal(1),copy:GapSignal={...signal(2),originalTestId:first.originalTestId};
 const out=discoverAdaptiveSchema(registry,[first,copy]);
 assert.equal(out.autoFields.length,0);
 assert.ok(out.proposals[0].blockers.includes('insufficient_distinct_original_tests'));
});
test('same field name with incompatible units becomes semantic conflict, no silent conversion',()=>{
 const alter=gap.kind==='field'?{kind:'field' as const,field:{...gap.field,type:'number' as const,
  unit:'decibels',allowedValues:[],requiresProtocol:true}}:gap;
 const alternative=captureSchemaGap({registry,proposal:alter,
  fact:{...fact(2),value:{type:'number',number:5,unit:'decibels'},protocolId:'method',protocolVersion:'v1'},
  candidate:candidate(2),policy:policy(2),processing:processing(2),asOf:t});
 assert.equal(alternative.status,'quarantined_gap_signal');
 if(alternative.status!=='quarantined_gap_signal')return;
 const out=discoverAdaptiveSchema(registry,[signal(1),alternative.signal]);
 assert.equal(out.autoFields.length,0);
 assert.ok(out.proposals.every(p=>p.status==='semantic_conflict'));
});
test('requires explicit reviewer before new immutable operational registry version',()=>{
 const discovered=discoverAdaptiveSchema(registry,[signal(1),signal(2)]);
 const p=discovered.proposals[0];
 assert.throws(()=>promoteReviewedFields(registry,discovered,[]));
 assert.throws(()=>promoteReviewedFields(registry,discovered,[{candidateId:p.candidateId,
  definitionSha256:h('stale'),decision:'approve',reviewer:'scientific_reviewer',reviewReference:'review_ticket_1'}]));
 const next=promoteReviewedFields(registry,discovered,[{candidateId:p.candidateId,
  definitionSha256:p.definitionSha256,decision:'approve',reviewer:'scientific_reviewer',reviewReference:'review_ticket_1'}]);
 assert.equal(next.schemaVersion,2);assert.equal(next.fields.length,2);
 assert.equal(registry.schemaVersion,1);assert.equal(registry.fields.length,1);
 assert.deepEqual(next.fields[0],registry.fields[0]);
 const tasks=planAdaptiveBackfill(next,['variant_1','variant_2','variant_1'],[],[p.key]);
 assert.equal(tasks.length,2);assert.equal(tasks[0].automaticFetchAuthorized,false);
});
test('new relationship types become research graph relations rather than fake scalar fields',()=>{
 const rel:AdaptiveDefinition={kind:'relationship',relation:{key:'headset_works_with_console',relation:'compatible_with',
  targetKind:'product_variant',contextKeys:['environment'],permittedOrigins:['independent_professional_assessment']}};
 const a=grab(1,rel),b=grab(2,rel);
 assert.equal(a.status,'quarantined_gap_signal');assert.equal(b.status,'quarantined_gap_signal');
 if(a.status!=='quarantined_gap_signal'||b.status!=='quarantined_gap_signal')return;
 const out=discoverAdaptiveSchema(registry,[a.signal,b.signal]);
 assert.equal(out.autoRelations.length,1);assert.equal(out.autoFields.length,0);
 const edge=quarantineAutoRelation({registry,catalog:out,proposal:rel,fact:{relationKey:rel.kind==='relationship'?rel.relation.key:'',
   targetId:'device_1',origin:'independent_professional_assessment',context:{environment:'office'},
   valueTextSha256:fact(1).valueTextSha256,anchorSha256:fact(1).anchorSha256},candidate:candidate(1),
   policy:policy(1),processing:{...processing(1),observationDigests:[{criterionId:'headset_works_with_console',
    valueTextSha256:fact(1).valueTextSha256,anchorSha256:fact(1).anchorSha256}]},asOf:t});
 assert.equal(edge?.relation,'compatible_with');
 assert.equal(edge?.rankingEligible,false);
 assert.equal(edge?.objectId,'device_1');
 assert.throws(()=>promoteReviewedFields(registry,out,[{candidateId:out.proposals[0].candidateId,
  definitionSha256:out.proposals[0].definitionSha256,decision:'approve',reviewer:'scientific_reviewer',
  reviewReference:'review_ticket_1'}]));
});
test('historical quarantined observations remain readable when unchanged across schema versions',()=>{
 const old=registry;
 const mock={...buildCategoryEvidenceMatrix({registry:old,candidate:candidate(1),policy:policy(1),processing:processing(1),
  asOf:t,proposed:[]})};
 assert.deepEqual(mock.observations,[]);
 const newer=promoteReviewedFields(old,discoverAdaptiveSchema(old,[signal(1),signal(2)]),[
  {candidateId:'candidate_'+adaptiveSignature(gap).slice(0,40),definitionSha256:adaptiveSignature(gap),decision:'approve',
   reviewer:'scientific_reviewer',reviewReference:'review_ticket_1'}]);
 const oldRecord={observationId:'obs_old',categoryId:'headphones',schemaVersion:1,
  exactVariantId:'variant_1',fieldKey:'battery_runtime',origin:'independent_lab_measurement' as const,
  value:{type:'number' as const,number:20,unit:'hours'},context:{anc_mode:'on'},protocolId:'p',protocolVersion:'v',
  originalTestId:'original_test_1',sourceId:'editorial_1',sourceUrl:candidate(1).url,
  sourceContentSha256:h('page'),valueTextSha256:h('value'),anchorSha256:h('anchor'),observedAt:t,
  reviewStatus:'quarantined_unreviewed' as const,publicationReady:false as const,rankingEligible:false as const,
  inferenceNotVerified:true as const,candidateFingerprintSha256:h('record')};
 const result=readSchemaCompatibleObservations({active:newer,historicalRegistries:[old],observations:[oldRecord]});
 assert.equal(result.observations.length,1);
 assert.equal(result.observations[0].schemaVersion,1);
 const incompatible:CategoryFieldRegistry={...newer,fields:[{...newer.fields[0],unit:'minutes'},newer.fields[1]]};
 assert.equal(readSchemaCompatibleObservations({active:incompatible,historicalRegistries:[old],observations:[oldRecord]}).observations.length,0);
});
test('unknown or invalid independent statements never gain auto-research status',()=>{
 const s=signal(1);
 const out=discoverAdaptiveSchema(registry,[{...s,definitionSha256:h('tampered')},
  {...s,provenance:'rights_attested_quarantined_unverified',originalTestId:''}]);
 assert.equal(out.proposals.length,0);
});

test('unmet needs prioritize incremental research but cannot independently create facts',async()=>{
 const {prioritizeSchemaResearch}=await import('../src/adaptive_schema_evolution.js');
 const cat=discoverAdaptiveSchema(registry,[signal(1)]);
 const priorities=prioritizeSchemaResearch(cat,[
  {categoryId:'headphones',proposedFieldKey:'speech_intelligibility_with_anc',questionDigestSha256:h('anonymous-question-1'),scenarioId:'office',observedAt:t},
  {categoryId:'headphones',proposedFieldKey:'speech_intelligibility_with_anc',questionDigestSha256:h('anonymous-question-2'),scenarioId:'train',observedAt:t},
  {categoryId:'headphones',proposedFieldKey:'speech_intelligibility_with_anc',questionDigestSha256:h('anonymous-question-2'),scenarioId:'train',observedAt:t}
 ]);
 assert.equal(priorities[0].distinctQuestionCount,2);
 assert.equal(priorities[0].distinctScenarioCount,2);
 assert.equal(priorities[0].evidenceProofFromDemand,false);
 assert.equal(cat.autoFields.length,0);
});
