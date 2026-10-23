import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {investigateCategory129,stageCategoryObservations129,approveGrowth129,
 interpretAfterGrowth129,nativeMeasurementNameObserver129,type ObservedDocument129,
 type ConceptSuggestion129,type LocalCategoryExtractor129} from '../src/phase129_category_growth_cycle.js';
import {compileCategoryKnowledge128,type CategoryBrain128,type Review128}
 from '../src/phase128_category_cognition_dialogue_bridge.js';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const asOf='2026-10-11T14:21:00+01:00';
// This original methodological passage is from EPA's published consumer guide.
// Here it is PROVIDED to the program, not fetched live by the program.
const text='Most portable air cleaners are rated according to their clean air delivery rate (CADR). '+
'This number is intended to help consumers select an air cleaner based on the size of the area it will be placed in. '+
'The higher the CADR, the more particles the air cleaner will remove and the larger the area it can serve.';
const source={id:'epa_method',url:'https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home',
 title:'US EPA Guide to Air Cleaners in the Home',originalDocumentId:'epa_air_cleaner_guide',
 role:'original_expert_method' as const};
const brain=():CategoryBrain128=>({categoryId:'portable_air_cleaner',schemaVersion:1,
 aliases:['portable air cleaner','air purifier','purificatore aria'],sources:[],concepts:[],quality:[],distinctions:[]});
const doc=():ObservedDocument129=>({source,text,contentSha256:sha(text),observedAt:asOf,
 permission:{fetchAllowed:true,factExtractionAllowed:true,publicCitationAllowed:true}});
const reviewer=(ref='epa_method'):Review128=>({reviewId:'review_air_method',reviewerId:'reviewer_fixture',
 reviewScope:'category_definition',sourceRefIds:[ref]});
const authority={verify:(r:Review128)=>r.reviewerId==='reviewer_fixture'};
const generic:LocalCategoryExtractor129=nativeMeasurementNameObserver129();
const stage=()=>stageCategoryObservations129({brain:brain(),documents:[doc()],extractor:generic,asOf});

test('unknown category routes into the real Phase73/74 dependency plan, not a new schema',async()=>{
 const r=await investigateCategory129({label:'portable air cleaner',catalog:[],asOf,workers:[]});
 assert.equal(r.research.plan.route.status,'unknown');assert.equal(r.canonicalChanges,0);
 assert.equal(r.research.actualWorkExecuted,false);assert.equal(r.rankingAuthorized,false);
 assert.equal(r.research.outcomes[0].status,'missing_local_worker');
 assert.equal(r.research.plan.tasks.find(t=>t.capability==='source_acquisition')?.status,'awaiting_dependencies');
});
test('category-agnostic local observer finds a real technical term and anchors an exact passage',async()=>{
 const s=await stage();assert.equal(s.claims.length,1);
 assert.equal(s.claims[0].discovery.concept.id,'clean_air_delivery_rate');
 assert.equal(s.claims[0].sourceContentSha256,sha(text));
 assert.equal(s.sourceBodiesRetained,false);assert.equal(s.rankingAuthorized,false);
 assert.equal(s.claims[0].spanSha256,sha('clean air delivery rate (CADR)'));
});
test('source body is not present in quarantined output',async()=>{
 const s=await stage();assert.ok(!JSON.stringify(s).includes('Most portable air cleaners'));
});
test('batch does not change canonical category or language before review',async()=>{
 const b=brain(),old=compileCategoryKnowledge128(b).ontologySnapshot;
 await stageCategoryObservations129({brain:b,documents:[doc()],extractor:generic,asOf});
 assert.equal(compileCategoryKnowledge128(b).ontologySnapshot,old);
 assert.equal(b.concepts.length,0);
});
test('approval requires a separately verified review and changes ontology snapshot',async()=>{
 const s=await stage(),old=brain();const change=approveGrowth129({brain:old,batch:s,
 approvals:[{discoveryId:s.claims[0].discovery.discoveryId,receipt:reviewer()}],authority});
 assert.equal(change.approvedCount,1);assert.equal(change.invalidationRequired,true);
 assert.equal(change.brain.concepts[0].state,'reviewed_definition');
 assert.notEqual(change.oldSnapshot,change.newSnapshot);assert.equal(change.transactionCommitted,false);
 assert.equal(change.rankingAuthorized,false);
});
test('metric is not mistaken for functional benefit nor an adequate product quality threshold',async()=>{
 const s=await stage(),updated=approveGrowth129({brain:brain(),batch:s,
 approvals:[{discoveryId:s.claims[0].discovery.discoveryId,receipt:reviewer()}],authority});
 const compiled=compileCategoryKnowledge128(updated.brain);
 assert.equal(compiled.qualityAxes.length,0);
 assert.equal(compiled.schema.aspects.length,0);
 assert.equal(interpretAfterGrowth129(updated.brain,'air purifier with CADR').rankingAuthorized,false);
});
test('denies material from a source without fact-extraction permissions',async()=>{
 const d=doc();d.permission.factExtractionAllowed=false;
 const s=await stageCategoryObservations129({brain:brain(),documents:[d],extractor:generic,asOf});
 assert.equal(s.claims.length,0);assert.equal(s.rejected[0].reason,'source_not_authorized_or_digest_mismatch');
});
test('rejects document digest forgery before invoking extractor',async()=>{
 const d=doc();d.text+=' fabricated';
 const s=await stageCategoryObservations129({brain:brain(),documents:[d],extractor:generic,asOf});
 assert.equal(s.claims.length,0);
});
test('rejects local extractor if it attaches a quote to the wrong position',async()=>{
 const corrupt:LocalCategoryExtractor129={execution:'local_only',async propose(d){
  const candidate=(await generic.propose(d))[0];return [{...candidate,start:0}];
 }};
 const s=await stageCategoryObservations129({brain:brain(),documents:[doc()],extractor:corrupt,asOf});
 assert.equal(s.claims.length,0);assert.equal(s.rejected[0].reason,'unanchored_or_duplicate_claim');
});
test('rejects attempts to assign evidence to another document',async()=>{
 const corrupt:LocalCategoryExtractor129={execution:'local_only',async propose(d){
  const candidate=(await generic.propose(d))[0];return [{...candidate,originalDocumentId:'wrong_document'}];
 }};
 const s=await stageCategoryObservations129({brain:brain(),documents:[doc()],extractor:corrupt,asOf});
 assert.equal(s.claims.length,0);
});
test('does not accept a remotely executed extractor',async()=>{
 await assert.rejects(()=>stageCategoryObservations129({brain:brain(),documents:[doc()],
  extractor:{...generic,execution:'remote' as 'local_only'},asOf}),/invalid_local_research_bounds/);
});
test('stale original ontology must be rejected at promotion',async()=>{
 const s=await stage();const b=brain();b.schemaVersion=3;
 assert.throws(()=>approveGrowth129({brain:b,batch:s,approvals:[],authority}),/stale_or_tampered/);
});
test('tampered source provenance in the batch is rejected',async()=>{
 const s=await stage();s.claims[0].sourceId='other';
 assert.throws(()=>approveGrowth129({brain:brain(),batch:s,approvals:[],authority}),/stale_or_tampered/);
});
test('unauthenticated reviewer cannot promote new meaning or category fact',async()=>{
 const s=await stage();assert.throws(()=>approveGrowth129({brain:brain(),batch:s,
  approvals:[{discoveryId:s.claims[0].discovery.discoveryId,
   receipt:{...reviewer(),reviewerId:'unknown'}}],authority}),/review_authentication_failed/);
});
test('wrong source receipt rejected by Phase128 even with a permissive review gate',async()=>{
 const s=await stage();assert.throws(()=>approveGrowth129({brain:brain(),batch:s,
  approvals:[{discoveryId:s.claims[0].discovery.discoveryId,receipt:reviewer('unrelated')}],
  authority:{verify:()=>true}}),/missing_or_invalid_review_receipt/);
});
test('no approval leaves no canonical knowledge changes',async()=>{
 const s=await stage(),b=brain(),r=approveGrowth129({brain:b,batch:s,approvals:[],authority});
 assert.equal(r.brain,b);assert.equal(r.invalidationRequired,false);
});
test('duplicate source identifiers not allowed to produce duplicate discoveries',async()=>{
 const s=await stageCategoryObservations129({brain:brain(),documents:[doc(),doc()],extractor:generic,asOf});
 assert.equal(s.claims.length,1);assert.ok(s.rejected.some(x=>x.reason==='source_not_authorized_or_digest_mismatch'));
});
test('ambiguous metric names lacking measured word not promoted by simplistic pattern observer',async()=>{
 const d=doc();d.text='This product has a filter system (FILT) and a remote control (RC).';d.contentSha256=sha(d.text);
 const s=await stageCategoryObservations129({brain:brain(),documents:[d],extractor:generic,asOf});
 assert.equal(s.claims.length,0);
});
import {bootstrapReviewedCategory129} from '../src/phase129_category_growth_cycle.js';
import {planCategoryCapabilities,type CapabilityCompletionReceipt} from '../src/category_cognitive_mesh.js';
test('cannot bootstrap an unknown category with incomplete Phase73 research',()=>{
 assert.throws(()=>bootstrapReviewedCategory129({label:'portable air cleaner',catalog:[],asOf,
  receipts:[{categoryId:'provisional_portable_air_cleaner',capability:'category_identity',
   verifiedBy:'fixture_auditor',auditReference:'fixture_audit',verifiedAt:asOf}],authenticate:()=>true}),
  /category_research_or_authentication_incomplete/);
});
test('category review receipts permit empty reviewed identity but no quality/ranking facts',()=>{
 const label='portable air cleaner',catId='provisional_portable_air_cleaner';
 const capabilities=planCategoryCapabilities({label,catalog:[],asOf}).tasks.map(x=>x.capability);
 const receipts=capabilities.map((capability):CapabilityCompletionReceipt=>({categoryId:catId,capability,
  verifiedBy:'fixture_auditor',auditReference:'fixture_audit',verifiedAt:asOf}));
 const c=bootstrapReviewedCategory129({label,catalog:[],asOf,receipts,authenticate:()=>true});
 assert.equal(c.identity.status,'reviewed');assert.equal(c.brain.categoryId,'portable_air_cleaner');
 assert.equal(c.brain.concepts.length,0);assert.equal(c.rankingAuthorized,false);
 assert.equal(c.transactionCommitted,false);
});
test('category identity cannot be activated with a forged or unauthenticated receipt',()=>{
 const label='portable air cleaner',catId='provisional_portable_air_cleaner';
 const receipts=planCategoryCapabilities({label,catalog:[],asOf}).tasks.map(({capability}):CapabilityCompletionReceipt=>({
  categoryId:catId,capability,verifiedBy:'untrusted',auditReference:'fixture_audit',verifiedAt:asOf}));
 assert.throws(()=>bootstrapReviewedCategory129({label,catalog:[],asOf,receipts,
  authenticate:(r)=>r.verifiedBy==='signed_review'}),/category_research_or_authentication_incomplete/);
});
test('a reviewed TASK from a genuine document updates next question comprehension',async()=>{
 const d=doc();d.text='To filter particles, choose a portable air cleaner with a suitable delivery rate.';d.contentSha256=sha(d.text);
 const phrase='filter particles';const ix=d.text.indexOf(phrase);
 const extractor:LocalCategoryExtractor129={execution:'local_only',async propose(z){return [{
  sourceId:z.source.id,originalDocumentId:z.source.originalDocumentId,
  start:ix,end:ix+phrase.length,literal:phrase,
  concept:{id:'particle_filtering',kind:'task',label:'Particle filtering',
   aliases:['filter particles','particle filtering'],evidenceKeys:['particle_clearance']}
 }];}};
 const before=interpretAfterGrowth129(brain(),'air purifier to filter particles');
 assert.ok(!before.frame.aspects.some(c=>c.aspectId==='particle_filtering'));
 const batch=await stageCategoryObservations129({brain:brain(),documents:[d],extractor,asOf});
 const updated=approveGrowth129({brain:brain(),batch,
  approvals:[{discoveryId:batch.claims[0].discovery.discoveryId,receipt:reviewer()}],authority});
 const after=interpretAfterGrowth129(updated.brain,'air purifier to filter particles');
 assert.ok(after.frame.aspects.some(c=>c.aspectId==='particle_filtering'));
 assert.ok(after.frame.evidenceObligations.includes('particle_clearance'));
 assert.equal(after.rankingAuthorized,false);
});
test('actual Phase74 local worker executes independent research but cannot mint approval receipts',async()=>{
 const worker={execution:'local_only' as const,capability:'category_identity' as const,
  async run(_task:unknown,_when:string){return {
   outcome:'research_material_collected' as const, reasonCode:'primary_reference_found',questions:[],
   sourceReferences:[{referenceId:'epa_reference',sourceId:'epa_method',url:source.url,
    contentSha256:sha(text),observedAt:asOf}]
  };}};
 const r=await investigateCategory129({label:'portable air cleaner',catalog:[],asOf,workers:[worker]});
 assert.equal(r.research.actualWorkExecuted,true);
 assert.equal(r.research.outcomes[0].status,'executed_pending_independent_review');
 assert.equal(r.research.completionReceiptsIssued,0);
 assert.equal(r.canonicalChanges,0);
});
test('a reviewed measured outcome can enter the research vocabulary without becoming a made-up quality score',async()=>{
 const s=await stage(),x=approveGrowth129({brain:brain(),batch:s,
 approvals:[{discoveryId:s.claims[0].discovery.discoveryId,receipt:reviewer()}],authority});
 const r=interpretAfterGrowth129(x.brain,'Which air purifier has the highest CADR?');
 assert.ok(r.reviewedConceptMentions.some(c=>c.conceptId==='clean_air_delivery_rate'));
 assert.ok(r.researchEvidenceKeys.includes('clean_air_delivery_rate'));
 assert.equal(r.rankingAuthorized,false);
});
test('category knowledge must match complete tokens, not misleading substrings',async()=>{
 const s=await stage(),x=approveGrowth129({brain:brain(),batch:s,
 approvals:[{discoveryId:s.claims[0].discovery.discoveryId,receipt:reviewer()}],authority});
 const r=interpretAfterGrowth129(x.brain,'This is a scadr string, not a measure.');
 assert.equal(r.reviewedConceptMentions.length,0);
});
