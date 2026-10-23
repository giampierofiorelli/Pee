import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {executeCategoryResearchCycle,executeColdStartEvidenceStage,
 type LocalCapabilityWorker} from '../src/category_research_execution.js';
import {acquireColdStartCategoryEvidence,type ColdStartSource} from '../src/category_cold_start_intake.js';
import {planCategoryCapabilities,type CapabilityCompletionReceipt,type Capability} from '../src/category_cognitive_mesh.js';
import type {LocalSemanticAdapter,EphemeralSemanticSuggestion} from '../src/phase72_semantic_intake.js';
import type {SourceTransport} from '../src/approved_web_reader.js';
const now='2026-10-10T19:00:00Z';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const catalog=[{categoryId:'headphones',label:'Headphones',aliases:['cuffie'],status:'reviewed' as const,registryVersion:4}];
const source=(n:number):ColdStartSource=>({categoryId:'provisional_dehumidifiers',
 candidate:{id:`candidate_${n}`,sourceId:`lab_${n}`,url:`https://lab${n}.org.uk/results/dehumidifier_${n}`,
  exactVariantId:`dehumidifier_${n}`,originalTestId:`original_test_${n}`,
  lineageAttestationReference:`assessor_original_test_trace_${n}`,kind:'original_lab_data',
  publishedAt:null,updatedAt:null,metadataOrigin:'human_supplied'},
 policy:{sourceId:`lab_${n}`,host:`lab${n}.org.uk`,basis:'written_permission',
  rightsDocumentId:`permission_${n}`,rightsDocumentUrl:`https://lab${n}.org.uk/permission`,
  reviewedBy:'licence_reviewer',reviewedAt:'2026-10-10T18:00:00Z',
  validUntil:'2027-10-10T00:00:00Z',
  permittedOperations:['metadata_discovery','page_retrieval','local_analysis','fact_storage','public_citation'],
  robots:'allowed',robotsCheckedAt:'2026-10-10T18:30:00Z',
  websiteTerms:'reviewed_permitted',termsCheckedAt:'2026-10-10T18:30:00Z',commercialUseReviewed:true}});
const SOURCES=[source(1),source(2)];
const makeBody=(n:number)=>`In our controlled test, the dehumidifier removed ${n===1?14:16} litres per day at a constant room condition.`;
let pageFetches=0,robotFetches=0,adapterCalls=0;
const transport:SourceTransport={async get(url){
 if(url.endsWith('/robots.txt')){robotFetches++;return {status:200,finalUrl:url,contentType:'text/plain',body:'User-agent: *\nAllow: /'};}
 pageFetches++;
 const n=url.includes('lab1')?1:2;
 return {status:200,finalUrl:url,contentType:'text/plain',body:makeBody(n)};
}};
const definition={kind:'field' as const,field:{key:'water_removed_per_day',type:'number' as const,unit:'litres_per_day',
 allowedValues:[],permittedOrigins:['independent_lab_measurement' as const],
 requiresProtocol:true,contextKeys:['room_conditions']}};
const adapter:LocalSemanticAdapter={execution:'local_only',suggestTransient(body){
 adapterCalls++;
 const number=body.includes('14 litres')?14:16;
 const literalText=String(number),anchorText=body;
 return [{id:`obs_${number}`,definition,origin:'independent_lab_measurement',
   value:{type:'number',number,unit:'litres_per_day'},
   context:{room_conditions:'controlled_room'},protocolId:'method_a',protocolVersion:'version_1',
   anchorText,literalText,interpretation:'direct_source_value'}] satisfies EphemeralSemanticSuggestion[];
}};
const requiredBeforeAcquisition:Capability[]=['category_identity','use_case_research','failure_and_safety_research',
 'variant_taxonomy','source_landscape','source_rights_review','test_method_research','criterion_design'];
const receipts=requiredBeforeAcquisition.map(capability=>({categoryId:'provisional_dehumidifiers',capability,
 verifiedBy:'independent_analyst',auditReference:`external_review_${capability}`,verifiedAt:now}));
const inquiry:LocalCapabilityWorker={execution:'local_only',capability:'category_identity',
 async run(task,asOf){assert.equal(task.categoryId,'provisional_dehumidifiers');
  return {outcome:'research_material_collected',reasonCode:'preliminary_reference',
   sourceReferences:[{referenceId:'documentation_1',sourceId:'independent_lab',
     url:'https://lab1.org.uk/documentation',contentSha256:sha('synthetic source'),observedAt:asOf}],
   questions:[{key:'water_removed_per_day',axis:'measurement_methods',contextTags:['indoor'],
     reasonReferenceId:'documentation_1',suggestedField:definition.field}]};
}};

test('unknown category runs a ready capability and produces hypotheses, not approvals',async()=>{
 const r=await executeCategoryResearchCycle({label:'Dehumidifiers',catalog,asOf:now,workers:[inquiry]});
 assert.equal(r.actualWorkExecuted,true);
 assert.equal(r.outcomes[0].status,'executed_pending_independent_review');
 assert.equal(r.completionReceiptsIssued,0);
 assert.equal(r.researchDossier?.status,'hypotheses_not_evidence');
 assert.deepEqual(r.researchDossier?.candidateFieldKeys,['water_removed_per_day']);
 assert.equal(r.plan.tasks.filter(t=>t.status==='ready_for_research').length,1);
 assert.equal(JSON.stringify(r).includes('synthetic source'),false);
 assert.equal(r.rankingEligible,false);
});

test('unknown category alone does not automatically unlock dependencies or fetch pages',async()=>{
 pageFetches=0;robotFetches=0;adapterCalls=0;
 const p=await executeColdStartEvidenceStage({label:'Dehumidifiers',catalog,asOf:now,
  completionReceipts:[],sources:SOURCES,adapter,transport});
 assert.equal(p.status,'blocked_by_research_dependencies');
 assert.equal(p.evidence,null);
 assert.equal(pageFetches+robotFetches+adapterCalls,0);
});

test('reviewed prereqs permit local intake, with distinct original tests and provisional schema',async()=>{
 pageFetches=0;robotFetches=0;adapterCalls=0;
 const p=await executeColdStartEvidenceStage({label:'Dehumidifiers',catalog,asOf:now,
  completionReceipts:receipts,sources:SOURCES,adapter,transport});
 assert.equal(p.status,'evidence_quarantined');
 assert.equal(p.evidence?.actualSourceReads,2);
 assert.equal(robotFetches,2);assert.equal(pageFetches,2);assert.equal(adapterCalls,2);
 assert.equal(p.evidence?.blueprint.readyFields.length,1);
 assert.equal(p.evidence?.blueprint.candidates[0].originalTestCount,2);
 assert.equal(p.evidence?.blueprint.productionSchemaExists,false);
 assert.equal(p.evidence?.publicationReady,false);
 assert.equal(p.evidence?.noSourceTextRetained,true);
 assert.equal(JSON.stringify(p).includes('In our controlled test'),false);
});

test('licence absent or insufficient blocks before network access',async()=>{
 pageFetches=0;robotFetches=0;adapterCalls=0;
 const p=await acquireColdStartCategoryEvidence({categoryId:'provisional_dehumidifiers',asOf:now,
  sources:[{...source(1),policy:{...source(1).policy,permittedOperations:['page_retrieval','local_analysis']}}],
  adapter,transport});
 assert.equal(p.actualSourceReads,0);
 assert.equal(robotFetches+pageFetches+adapterCalls,0);
 assert.equal(p.blueprint.candidates.length,0);
});

test('duplicate original test does not form independent two-test support',async()=>{
 const duplicated={...source(2),candidate:{...source(2).candidate,
   originalTestId:source(1).candidate.originalTestId}};
 const p=await acquireColdStartCategoryEvidence({categoryId:'provisional_dehumidifiers',asOf:now,
  sources:[source(1),duplicated],adapter,transport});
 assert.equal(p.blueprint.candidates.length,1);
 assert.equal(p.blueprint.readyFields.length,0);
 assert.ok(p.blueprint.candidates[0].blockers.includes('requires_more_original_tests'));
});

test('invented AI measurement is excluded before blueprint despite plausible definition',async()=>{
 const lying:LocalSemanticAdapter={execution:'local_only',suggestTransient:()=>[{id:'obs_hallucination',
  definition,origin:'independent_lab_measurement',value:{type:'number',number:999,unit:'litres_per_day'},
  context:{room_conditions:'controlled_room'},protocolId:'method_a',protocolVersion:'version_1',
  anchorText:makeBody(1),literalText:'999',interpretation:'direct_source_value'}]};
 const p=await acquireColdStartCategoryEvidence({categoryId:'provisional_dehumidifiers',asOf:now,
  sources:[source(1)],adapter:lying,transport});
 assert.equal(p.blueprint.candidates.length,0);assert.equal(p.sourceResults[0].rejected,1);
});

test('unreviewed robot policy prevents any source/network/model execution',async()=>{
 pageFetches=0;robotFetches=0;adapterCalls=0;
 const s=source(1);
 const p=await acquireColdStartCategoryEvidence({categoryId:'provisional_dehumidifiers',asOf:now,
  sources:[{...s,policy:{...s.policy,robots:'unknown'}}],adapter,transport});
 assert.equal(p.actualSourceReads,0);assert.equal(pageFetches+robotFetches+adapterCalls,0);
});

test('ambiguous category prevents the research worker from running',async()=>{
 let calls=0;
 const worker:LocalCapabilityWorker={...inquiry,run:async(task,time)=>{calls++;return inquiry.run(task,time);}};
 const r=await executeCategoryResearchCycle({label:'cuffie',catalog:[...catalog,
  {categoryId:'earbuds',label:'Earbuds',aliases:['cuffie'],status:'research' as const,registryVersion:null}],
  asOf:now,workers:[worker]});
 assert.equal(r.actualWorkExecuted,false);assert.equal(calls,0);assert.equal(r.plan.route.status,'ambiguous');
});

test('a malicious worker cannot store raw page text or unsupported references in results',async()=>{
 const malicious:LocalCapabilityWorker={execution:'local_only',capability:'category_identity',
 async run(task,asOf){return {outcome:'research_material_collected',reasonCode:'reference',
  sourceReferences:[{referenceId:'bad',sourceId:'source_1',
    url:'http://127.0.0.1/internal',contentSha256:sha('x'),observedAt:asOf}],
  questions:[],articleText:'SECRET FULL ARTICLE'} as unknown as Awaited<ReturnType<LocalCapabilityWorker['run']>>;}};
 const r=await executeCategoryResearchCycle({label:'Dehumidifiers',catalog,asOf:now,workers:[malicious]});
 assert.equal(r.outcomes[0].status,'worker_rejected');
 assert.equal(JSON.stringify(r).includes('SECRET FULL ARTICLE'),false);
});

test('known category task selection and bounded execution',async()=>{
 const r=await executeCategoryResearchCycle({label:'Headphones',catalog,asOf:now,workers:[],maxTasks:1});
 assert.equal(r.plan.route.status,'known');assert.equal(r.outcomes.length,1);
 assert.equal(r.outcomes[0].status,'missing_local_worker');
 assert.equal(r.actualWorkExecuted,false);
});

test('forged completion receipts with unmet prerequisites fail closed',async()=>{
 const forged:CapabilityCompletionReceipt={categoryId:'provisional_dehumidifiers',
  capability:'source_rights_review',verifiedBy:'operator',auditReference:'unverified',verifiedAt:now};
 assert.throws(()=>planCategoryCapabilities({label:'Dehumidifiers',catalog,asOf:now,completionReceipts:[forged]}));
});


test('a pending capability is not retried before independent review',async()=>{
 let runs=0;const worker:LocalCapabilityWorker={...inquiry,run:async(task,time)=>{runs++;return inquiry.run(task,time);}};
 const r=await executeCategoryResearchCycle({label:'Dehumidifiers',catalog,asOf:now,workers:[worker],
  pendingTaskIds:['provisional_dehumidifiers_category_identity']});
 assert.equal(r.outcomes[0].status,'waiting_for_independent_review');
 assert.equal(r.actualWorkExecuted,false);assert.equal(r.completionReceiptsIssued,0);assert.equal(runs,0);
});

test('source without lineage attestation stays blocked despite correct robots and licence',async()=>{
 pageFetches=0;robotFetches=0;adapterCalls=0;const s=source(1);
 const p=await acquireColdStartCategoryEvidence({categoryId:'provisional_dehumidifiers',asOf:now,
  sources:[{...s,candidate:{...s.candidate,lineageAttestationReference:null}}],adapter,transport});
 assert.equal(p.actualSourceReads,0);assert.equal(pageFetches+robotFetches+adapterCalls,0);
});

test('contradictory field semantics are kept apart and not approved',async()=>{
 const conflict:LocalSemanticAdapter={execution:'local_only',suggestTransient:(body)=>{
 const result=adapter.suggestTransient(body) as EphemeralSemanticSuggestion[];
 return result.map(s=>({...s,definition:{kind:'field',field:{...definition.field,
  unit:body.includes('14 litres')?'litres_per_day':'gallons_per_day'}},
  value:{type:'number',number:body.includes('14 litres')?14:16,
   unit:body.includes('14 litres')?'litres_per_day':'gallons_per_day'}}));
 }};
 const p=await acquireColdStartCategoryEvidence({categoryId:'provisional_dehumidifiers',asOf:now,
  sources:SOURCES,adapter:conflict,transport});
 assert.ok(p.blueprint.candidates.every(c=>c.status==='semantic_conflict'));
 assert.equal(p.blueprint.readyFields.length,0);
});
