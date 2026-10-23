import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {planCategoryLearning179,runCategoryInvestigation179,stageNeedEvidence179,
 summarizeResearchGaps179,stageExistingCategoryConcepts179,STREAMS179,
 type NeedEdgeSuggestion179} from '../src/phase179_category_learning.js';
import {nativeMeasurementNameObserver129} from '../src/phase129_category_growth_cycle.js';
import type {ObservedDocument129} from '../src/phase129_category_growth_cycle.js';
import type {CategoryBrain128} from '../src/phase128_category_cognition_dialogue_bridge.js';
const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
const asOf='2026-10-12T19:00:00+01:00';
const categories=['vacuum cleaner','water filter','washing machine','electric kettle','pasta maker','air purifier','solar lantern'];
const passage='A hypothetical original method measures the collection of particles under a defined test protocol.';
function document(i=1,body=passage):ObservedDocument129{
 return {source:{id:`test_method_${i}`,url:`https://independent-source-${i}.org/method`,title:`Synthetic method ${i}`,
  originalDocumentId:`method_version_${i}`,role:'original_expert_method'},text:body,contentSha256:sha(body),
  observedAt:asOf,permission:{fetchAllowed:true,factExtractionAllowed:true,publicCitationAllowed:true}};
}
function suggestion(d:ObservedDocument129):NeedEdgeSuggestion179{return {
 categoryId:'air_purifier',sourceId:d.source.id,originalDocumentId:d.source.originalDocumentId,
 start:0,end:d.text.length,literal:d.text,goalId:'cleaner_air',outcomeId:'less_particulate',
 mechanismId:'filtration',observableId:'particle_removal',methodId:'protocol_particle',
 relationType:'suggested_need_to_test_path',statedLimits:['conditions differ across methods']};}
const submit=(ds:ObservedDocument129[],ps:NeedEdgeSuggestion179[])=>stageNeedEvidence179({categoryId:'air_purifier',documents:ds,proposals:ps,asOf});
const brain=():CategoryBrain128=>({categoryId:'air_purifier',schemaVersion:1,aliases:['air purifier'],sources:[],concepts:[],quality:[],distinctions:[]});
for(const label of categories)test(`category research agenda generalises without a new handwritten rule: ${label}`,()=>{
 const p=planCategoryLearning179({label,catalog:[],asOf});
 assert.equal(p.originalRoute,'unknown');assert.equal(p.tasks.length,9);
 assert.equal(new Set(p.tasks.map(x=>x.stream)).size,9);
 assert.equal(p.categoryActivation,'requires_phase129_research');
 assert.equal(p.automaticSourceAccessGuaranteed,false);assert.equal(p.rankingAuthorized,false);
 assert.ok(p.capabilityTasks.length>0);
});
test('technical study includes methods, failure boundaries, source disagreement and held-out English validation',()=>{
 const x=planCategoryLearning179({label:'air purifier',catalog:[],asOf});
 for(const name of ['original_test_methods','critical_feasibility','contradictions_and_limits','independent_user_validation'])
  assert.ok(x.tasks.some(t=>t.stream===name));
 assert.deepEqual(x.tasks.map(t=>t.stream),[...STREAMS179]);
});
test('known category uses existing canonical category identity and keeps research pending',()=>{
 const identity={categoryId:'air_purifier',label:'air purifier',aliases:[],status:'reviewed' as const,registryVersion:1};
 const p=planCategoryLearning179({label:'air purifier',catalog:[identity],asOf});
 assert.equal(p.originalRoute,'known');assert.equal(p.categoryId,'air_purifier');
 assert.equal(p.categoryActivation,'existing_reviewed');assert.equal(p.scientificValidationComplete,false);
});
test('unsafe category inputs are rejected without research or network',()=>{
 for(const label of ['', '<script>', 'a', 'air purifier\nmalicious', 'https://evil.test/steal', 'a'.repeat(101)])
  assert.throws(()=>planCategoryLearning179({label,catalog:[],asOf}),/phase179_invalid_category_input/);
});
test('invalid time and non-catalog data cannot produce a category plan',()=>{
 assert.throws(()=>planCategoryLearning179({label:'air purifier',catalog:[],asOf:'not-a-date'}));
 assert.throws(()=>planCategoryLearning179({label:'air purifier',catalog:null as never,asOf}));
});
test('actual Phase129/74 called; no local workers means missing worker, not completed autonomous search',async()=>{
 const r=await runCategoryInvestigation179({label:'air purifier',catalog:[],asOf,workers:[],maxTasks:2});
 assert.equal(r.execution.actualWorkExecuted,false);assert.equal(r.execution.completionReceiptsIssued,0);
 assert.equal(r.execution.outcomes[0].status,'missing_local_worker');
 assert.equal(r.canonicalKnowledgeChanged,false);assert.equal(r.rankingAuthorized,false);
});
test('empty corpus stages zero knowledge without a fictional source',()=>{
 const b=submit([],[]);assert.equal(b.originalDocumentCount,0);
 assert.equal(b.candidateEdges.length,0);assert.equal(b.canonicalGraphUnchanged,true);
 assert.ok(summarizeResearchGaps179(b).nextActions.includes('collect_permitted_original_category_sources'));
});
test('anchored candidate link is placed in quarantine and does not retain article body',()=>{
 const d=document(),b=submit([d],[suggestion(d)]);
 assert.equal(b.candidateEdges.length,1);
 assert.equal(b.candidateEdges[0].documentHash,d.contentSha256);
 assert.equal(b.candidateEdges[0].anchor.spanSha256,sha(d.text));
 assert.equal(b.candidateEdges[0].causalLinkEstablished,false);
 assert.equal(b.candidateEdges[0].rankingAuthorized,false);
 assert.equal(b.hardExclusionsAuthorized,false);
 assert.ok(!JSON.stringify(b).includes(passage));
});
test('same input has a stable batch ID and candidate identity',()=>{
 const d=document(),a=submit([d],[suggestion(d)]),b=submit([d],[suggestion(d)]);
 assert.deepEqual(a,b);
});
test('source order and candidate order do not alter deterministic research batch',()=>{
 const a=document(1),b=document(2);
 assert.deepEqual(submit([a,b],[suggestion(a),suggestion(b)]),submit([b,a],[suggestion(b),suggestion(a)]));
});
test('a distinct original document containing the same candidate relation does not constitute proof',()=>{
 const a=document(1),b=document(2),result=summarizeResearchGaps179(submit([a,b],[suggestion(a),suggestion(b)]));
 assert.equal(result.crossDocumentCandidates.length,1);
 assert.equal(result.crossDocumentCandidates[0].documentCount,2);
 assert.equal(result.proofOfCausality,false);
});
test('same document attributed under another identifier is not counted as independent original document',()=>{
 const a=document(1),b={...document(2),source:{...document(2).source,originalDocumentId:a.source.originalDocumentId}};
 const r=summarizeResearchGaps179(submit([a,b],[suggestion(a),suggestion(b)]));
 assert.equal(r.crossDocumentCandidates.length,0);
});
test('critical method gaps are discoverable without inventing a protocol',()=>{
 const d=document(),p={...suggestion(d),methodId:null};
 const gap=summarizeResearchGaps179(submit([d],[p]));
 assert.equal(gap.missingMethodCandidates.length,1);
 assert.ok(gap.nextActions.includes('find_original_comparable_test_methods'));
});
test('a method label is not evidence that the protocol was verified',()=>{
 const d=document(),r=submit([d],[suggestion(d)]);
 assert.equal(r.candidateEdges[0].methodComparable,false);
 assert.equal(r.candidateEdges[0].productMeasurementEstablished,false);
});
test('candidate mentions of PFAS and lead remain different relations',()=>{
 const d=document(),a={...suggestion(d),goalId:'reduce_pfas'},b={...suggestion(d),goalId:'reduce_lead'};
 const batch=submit([d],[a,b]);
 assert.equal(new Set(batch.candidateEdges.map(e=>e.identityHash)).size,2);
});
test('pasta rolling versus extruding are different candidate mechanisms',()=>{
 const d=document(),a={...suggestion(d),mechanismId:'sheet_rolling'},b={...suggestion(d),mechanismId:'extrusion'};
 assert.equal(new Set(submit([d],[a,b]).candidateEdges.map(e=>e.identityHash)).size,2);
});
test('suggestion for wrong category is not imported into another category',()=>{
 const d=document(),x=submit([d],[{...suggestion(d),categoryId:'vacuum_cleaner'}]);
 assert.equal(x.candidateEdges.length,0);assert.equal(x.rejected.length,1);
});
test('document cross-reference cannot be reattached to another source',()=>{
 const d=document(),x=submit([d],[{...suggestion(d),originalDocumentId:'different_source'}]);
 assert.equal(x.candidateEdges.length,0);
});
test('wrong literal or offsets are rejected',()=>{
 const d=document();for(const prop of [{literal:'fabricated'},{start:-1},{end:9000},{end:0}]){
  const x=submit([d],[{...suggestion(d),...prop}]);assert.equal(x.candidateEdges.length,0);
 }});
test('source text changed without digest update rejects document',()=>{
 const d=document();d.text+=' Some addition';const x=submit([d],[suggestion(d)]);
 assert.equal(x.originalDocumentCount,0);assert.equal(x.candidateEdges.length,0);
});
test('source authorization is required for extraction',()=>{
 const d=document();d.permission.factExtractionAllowed=false;
 assert.equal(submit([d],[suggestion(d)]).candidateEdges.length,0);
});
test('future-dated sources are rejected',()=>{
 const d=document();d.observedAt='2099-01-01T00:00:00Z';
 assert.equal(submit([d],[suggestion(d)]).candidateEdges.length,0);
});
test('duplicate source ID rejects later document and duplicate edge',()=>{
 const d=document();const x=submit([d,d],[suggestion(d),suggestion(d)]);
 assert.equal(x.originalDocumentCount,1);assert.equal(x.candidateEdges.length,1);
 assert.equal(x.rejected.length,2);
});
test('mutated inferred source role is not a route for promoting a ranking',()=>{
 const d=document(),x=submit([d],[suggestion(d)]);
 assert.equal(x.knowledgeClaimsUnverified,true);assert.equal(x.productRankingsAuthorized,false);
});
test('untrusted candidate batch claiming ranking is rejected by analysis',()=>{
 const d=document(),x=submit([d],[suggestion(d)]);
 assert.throws(()=>summarizeResearchGaps179({...x,productRankingsAuthorized:true as false}),/untrusted/);
});
test('untrusted candidate promotion flags are rejected',()=>{
 const d=document(),x=submit([d],[suggestion(d)]);
 assert.throws(()=>summarizeResearchGaps179({...x,candidateEdges:[{...x.candidateEdges[0],rankingAuthorized:true as false}]}),/unsafe_candidate/);
});
test('document budget is enforced',()=>{
 assert.throws(()=>stageNeedEvidence179({categoryId:'air_purifier',documents:[document(1),document(2)],
  proposals:[],asOf,maxDocuments:1}),/unbounded/);
});
test('proposal budget is enforced',()=>{
 const d=document();assert.throws(()=>stageNeedEvidence179({categoryId:'air_purifier',documents:[d],
  proposals:[suggestion(d),suggestion(d)],asOf,maxProposals:1}),/unbounded/);
});
test('stated limitations appear in structured relation metadata and are sorted',()=>{
 const d=document(),s={...suggestion(d),statedLimits:['z limit','a limit','a limit']};
 assert.deepEqual(submit([d],[s]).candidateEdges[0].statedLimits,['a limit','z limit']);
});
test('Phase129 concept staging stays in source quarantine via reuse rather than a new ontology',async()=>{
 const body='This instrument has a Clean Air Delivery Rate (CADR) measurement.';
 const d=document(1,body),batch=await stageExistingCategoryConcepts179({brain:brain(),documents:[d],
  extractor:nativeMeasurementNameObserver129(),asOf});
 assert.equal(batch.state,'quarantined_not_canonical');assert.equal(batch.rankingAuthorized,false);
 assert.equal(batch.claims.length,1);
});
import {openResearchLedger179,appendResearchBatch179} from '../src/phase179_category_learning.js';
test('unverified category learning has a stable, separate empty research ledger',()=>{
 const a=openResearchLedger179('air_purifier'),b=openResearchLedger179('air_purifier');
 assert.deepEqual(a,b);assert.equal(a.revision,0);assert.equal(a.rankingsAuthorized,false);
});
test('a learning batch produces an append-only research revision without promoting the canonical graph',()=>{
 const base=openResearchLedger179('air_purifier'),d=document(),batch=submit([d],[suggestion(d)]);
 const next=appendResearchBatch179({ledger:base,batch,expectedRevision:0,expectedSnapshotHash:base.snapshotHash});
 assert.equal(next.revision,1);assert.equal(base.revision,0);
 assert.notEqual(next.snapshotHash,base.snapshotHash);
 assert.equal(next.canonicalKnowledgePublished,false);
 assert.deepEqual(next.history[0].edgeIds,[batch.candidateEdges[0].edgeId]);
});
test('duplicate research batches do not create meaningless revisions',()=>{
 const base=openResearchLedger179('air_purifier'),d=document(),batch=submit([d],[suggestion(d)]);
 const first=appendResearchBatch179({ledger:base,batch,expectedRevision:0,expectedSnapshotHash:base.snapshotHash});
 const second=appendResearchBatch179({ledger:first,batch,expectedRevision:1,expectedSnapshotHash:first.snapshotHash});
 assert.equal(second.revision,1);assert.equal(second.snapshotHash,first.snapshotHash);
});
test('optimistic revision gating rejects stale writes',()=>{
 const base=openResearchLedger179('air_purifier'),batch=submit([],[]);
 const newer=appendResearchBatch179({ledger:base,batch,expectedRevision:0,expectedSnapshotHash:base.snapshotHash});
 assert.throws(()=>appendResearchBatch179({ledger:newer,batch,expectedRevision:0,expectedSnapshotHash:base.snapshotHash}),/stale/);
});
test('learning batch cannot be appended to another category',()=>{
 const base=openResearchLedger179('vacuum_cleaner');
 assert.throws(()=>appendResearchBatch179({ledger:base,batch:submit([],[]),expectedRevision:0,expectedSnapshotHash:base.snapshotHash}),/untrusted/);
});
test('tampering with saved research history is rejected',()=>{
 const base=openResearchLedger179('air_purifier'),batch=submit([],[]);
 const newLedger=appendResearchBatch179({ledger:base,batch,expectedRevision:0,expectedSnapshotHash:base.snapshotHash});
 const modified={...newLedger,history:[{...newLedger.history[0],edgeIds:['a'.repeat(64)]}]};
 assert.throws(()=>appendResearchBatch179({ledger:modified,batch,expectedRevision:1,expectedSnapshotHash:modified.snapshotHash}),/corrupt/);
});
test('sequential category research revisions preserve anchored batch identities',()=>{
 const base=openResearchLedger179('air_purifier'),a=document(1),b=document(2);
 const firstBatch=submit([a],[suggestion(a)]),secondBatch=submit([b],[suggestion(b)]);
 const first=appendResearchBatch179({ledger:base,batch:firstBatch,expectedRevision:0,expectedSnapshotHash:base.snapshotHash});
 const second=appendResearchBatch179({ledger:first,batch:secondBatch,expectedRevision:1,expectedSnapshotHash:first.snapshotHash});
 assert.equal(second.revision,2);assert.deepEqual(second.history.map(x=>x.batchId),[firstBatch.batchId,secondBatch.batchId]);
 assert.equal(second.rankingsAuthorized,false);
});

test('public citation permission is required just as in inherited Phase129 staging',()=>{
 const d=document();d.permission.publicCitationAllowed=false;
 assert.equal(submit([d],[suggestion(d)]).candidateEdges.length,0);
});
test('fabricated original professional source role is rejected at runtime',()=>{
 const d=document();const corrupt={...d,source:{...d.source,role:'pretend_expert'}};
 assert.equal(submit([corrupt as never],[suggestion(d)]).candidateEdges.length,0);
});
