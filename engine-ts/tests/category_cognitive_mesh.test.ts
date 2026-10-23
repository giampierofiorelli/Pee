import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {routeCategory,planCategoryCapabilities,formCategoryBlueprint,reviewInitialCategorySchema,
 planPreventiveCategoryWork,type CategoryIdentity,type CategoryCriterionSignal} from '../src/category_cognitive_mesh.js';
import type {MatrixFieldDefinition} from '../src/category_evidence_matrix.js';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const now='2026-10-10T19:00:00Z';
const allCold=['category_identity','use_case_research','failure_and_safety_research','variant_taxonomy',
 'source_landscape','source_rights_review','test_method_research','criterion_design',
 'source_acquisition','evidence_independence_audit','category_schema_review'] as const;
const receipts=allCold.map(capability=>({categoryId:'provisional_dehumidifiers',capability,
 verifiedBy:'independent_auditor',auditReference:`audit_${capability}`,verifiedAt:now}));
const known:CategoryIdentity={categoryId:'headphones',label:'Headphones',aliases:['over ear headphones','cuffie'],
 status:'reviewed',registryVersion:4};
const proposal:MatrixFieldDefinition={key:'water_removal_rate',type:'number',unit:'litres_per_day',allowedValues:[],
 permittedOrigins:['independent_lab_measurement'],requiresProtocol:true,contextKeys:['test_temperature','test_humidity']};
function sample(n:number,field:MatrixFieldDefinition=proposal):CategoryCriterionSignal {
 const source=`laboratory_${n}`,originalTest=`test_${n}`,variant=`device_${n}`;
 const url=`https://lab${n}.org.uk/measurements`;
 const anchor=digest('anchor '+n),value=digest('value '+n),body=digest('body '+n);
 return {
  categoryId:'provisional_dehumidifiers',proposedField:field,
  proposedFact:{observationId:`observation_${n}`,fieldKey:field.key,
    origin:'independent_lab_measurement',value:{type:'number',number:13+n,unit:field.unit!},
    context:{test_temperature:'standard_room',test_humidity:'high_humidity'},
    protocolId:'method_1',protocolVersion:'version_1',valueTextSha256:value,anchorSha256:anchor},
  candidate:{id:`candidate_${n}`,sourceId:source,url,exactVariantId:variant,
   originalTestId:originalTest,lineageAttestationReference:`manually_traced_test_${n}`,
   kind:'original_lab_data',publishedAt:now,updatedAt:now,metadataOrigin:'human_supplied'},
  policy:{sourceId:source,host:`lab${n}.org.uk`,basis:'verified_open_licence',
    rightsDocumentId:`rights_${n}`,rightsDocumentUrl:`https://lab${n}.org.uk/licence`,
    reviewedBy:'legal_reviewer',reviewedAt:now,validUntil:'2027-10-10T00:00:00Z',
    permittedOperations:['page_retrieval','local_analysis','fact_storage','public_citation'],
    robots:'allowed',robotsCheckedAt:now,websiteTerms:'reviewed_permitted',termsCheckedAt:now,
    commercialUseReviewed:true},
  processing:{status:'quarantined_human_method_and_rights_review',sourceUrl:url,contentSha256:body,
   observationDigests:[{criterionId:field.key,valueTextSha256:value,anchorSha256:anchor}],
   originalTestId:originalTest,exactVariantId:variant,citations:[url],reasons:['quarantined'],
   rankingEligible:false,publicationReady:false},
  asOf:now
 };
}

test('known category with alias is reused, not cloned',()=>{
 const r=routeCategory('  Cuffie  ',[known]);assert.equal(r.status,'known');
 if(r.status==='known')assert.equal(r.identity.categoryId,'headphones');
});
test('unseen category is provisional; no invented production schema',()=>{
 const r=routeCategory('Dehumidifiers',[known]);assert.equal(r.status,'unknown');
 if(r.status==='unknown'){assert.equal(r.provisionalId,'provisional_dehumidifiers');assert.equal(r.requiresCategoryValidation,true);}
});
test('alias collision stops rather than guessing',()=>{
 const r=routeCategory('Cuffie',[known,{categoryId:'in_ear',label:'Earbuds',aliases:['cuffie'],status:'research',registryVersion:null}]);
 assert.equal(r.status,'ambiguous');
});
test('unsafe or absent label requires clarification',()=>{
 assert.equal(routeCategory('',[known]).status,'needs_clarification');
 assert.equal(routeCategory('<unsafe/>',[known]).status,'needs_clarification');
});
test('cold start queues upstream research, not purchases, web scraping or rankings',()=>{
 const plan=planCategoryCapabilities({label:'Dehumidifiers',catalog:[known],asOf:now});
 assert.equal(plan.tasks.length,11);assert.equal(plan.tasks[0].capability,'category_identity');
 assert.deepEqual(plan.tasks.filter(t=>t.status==='ready_for_research').map(t=>t.capability),['category_identity']);
 assert.ok(plan.tasks.every(t=>t.publicationReady===false&&t.rankingEligible===false&&t.automaticWebAccessAuthorized===false));
 assert.ok(!plan.tasks.some(t=>t.capability==='targeted_backfill'));
});
test('dependencies unlock after verified external completion, no task falsely executed',()=>{
 const plan=planCategoryCapabilities({label:'Dehumidifiers',catalog:[known],asOf:now,completionReceipts:[receipts[0]]});
 const ready=plan.tasks.filter(t=>t.status==='ready_for_research').map(t=>t.capability).sort();
 assert.deepEqual(ready,['failure_and_safety_research','source_landscape','use_case_research','variant_taxonomy']);
 assert.equal(plan.actualWorkExecuted,false);
});
test('known category focuses on gaps and freshness, without cold-start rebuild',()=>{
 const p=planCategoryCapabilities({label:'Headphones',catalog:[known],asOf:now});
 assert.equal(p.tasks.length,4);
 assert.deepEqual(p.tasks.filter(t=>t.status==='ready_for_research').map(t=>t.capability),['coverage_analysis','freshness_review']);
});
test('ambiguous category schedules nothing',()=>{
 const p=planCategoryCapabilities({label:'cuffie',catalog:[known,{...known,categoryId:'earbuds'}],asOf:now});
 assert.equal(p.tasks.length,0);
});
test('one source, however many rows, never creates new reviewed category criterion',()=>{
 const a=sample(1);const b={...sample(2),candidate:{...sample(2).candidate,
  originalTestId:a.candidate.originalTestId}};
 const p=formCategoryBlueprint({categoryId:'provisional_dehumidifiers',signals:[a,b]});
 assert.equal(p.readyFields.length,0);
 assert.ok(p.candidates[0].blockers.includes('requires_more_original_tests'));
 assert.throws(()=>reviewInitialCategorySchema({blueprint:p,acceptedFingerprints:[p.candidates[0].definitionSha256],
  reviewer:'analyst',reviewReference:'audit_1',knownCategories:[known],
  approvedCategoryId:'dehumidifiers',categoryResearchReceipts:receipts,asOf:now}));
});
test('rights check failure prevents experimental category learning',()=>{
 const a=sample(1),bad={...a,policy:{...a.policy,commercialUseReviewed:false}};
 const p=formCategoryBlueprint({categoryId:'provisional_dehumidifiers',signals:[bad]});
 assert.equal(p.candidates.length,0);assert.equal(p.rejected[0].reason,'source_rights_or_provenance_not_verified');
});
test('fabricated anchors and variant-mismatched sources are rejected',()=>{
 const a=sample(1),fake={...a,proposedFact:{...a.proposedFact,anchorSha256:digest('fabricated')}};
 const mismatch={...sample(2),processing:{...sample(2).processing,exactVariantId:'wrong_variant'}};
 const p=formCategoryBlueprint({categoryId:'provisional_dehumidifiers',signals:[fake,mismatch]});
 assert.equal(p.readyFields.length,0);assert.equal(p.rejected.length,2);
});
test('independent support creates only research candidate, then reviewed initial schema',()=>{
 const p=formCategoryBlueprint({categoryId:'provisional_dehumidifiers',signals:[sample(1),sample(2)]});
 assert.equal(p.readyFields.length,1);assert.equal(p.candidates[0].status,'research_schema_candidate');
 assert.equal(p.productionSchemaExists,false);
 const approval=reviewInitialCategorySchema({blueprint:p,acceptedFingerprints:[p.candidates[0].definitionSha256],
  reviewer:'category_scientist',reviewReference:'category_review_1',knownCategories:[known],
  approvedCategoryId:'dehumidifiers',categoryResearchReceipts:receipts,asOf:now});
 assert.equal(approval.registry.categoryId,'dehumidifiers');
 assert.equal(approval.registry.schemaVersion,1);assert.equal(approval.registry.fields[0].key,'water_removal_rate');
 assert.equal(approval.rankingEligible,false);assert.equal(p.productionSchemaExists,false);
});
test('semantic conflict prevents promotion, rather than silently merging dimensions',()=>{
 const alternate:MatrixFieldDefinition={...proposal,unit:'millilitres_per_hour'};
 const p=formCategoryBlueprint({categoryId:'provisional_dehumidifiers',signals:[sample(1),sample(2,alternate)]});
 assert.ok(p.candidates.every(c=>c.status==='semantic_conflict'));
 assert.equal(p.readyFields.length,0);
});
test('duplicates cannot inflate independent support',()=>{
 const p=formCategoryBlueprint({categoryId:'provisional_dehumidifiers',signals:[sample(1),sample(1)]});
 assert.equal(p.candidates[0].sourceCount,1);assert.equal(p.rejected[0].reason,'duplicated_observation');
});
test('already known category cannot be reviewed a second time as new',()=>{
 const p=formCategoryBlueprint({categoryId:'provisional_dehumidifiers',signals:[sample(1),sample(2)]});
 assert.throws(()=>reviewInitialCategorySchema({blueprint:p,acceptedFingerprints:[p.candidates[0].definitionSha256],
  reviewer:'category_scientist',reviewReference:'ticket_1',knownCategories:[{...known,categoryId:'dehumidifiers'}],
  approvedCategoryId:'dehumidifiers',categoryResearchReceipts:receipts,asOf:now}));
});
test('preventive work requires observed gap, enforces budget, never authorizes network',()=>{
 const tasks=planPreventiveCategoryWork({catalog:[known],asOf:now,maxTasks:1,gaps:[
 {categoryId:'headphones',criterion:'staleness',observedGap:true,observedAt:now,referenceId:'audit_1'},
 {categoryId:'headphones',criterion:'staleness',observedGap:true,observedAt:now,referenceId:'audit_1'},
 {categoryId:'other',criterion:'missing_coverage',observedGap:true,observedAt:now,referenceId:'audit_2'}]});
 assert.equal(tasks.length,1);assert.equal(tasks[0].capability,'freshness_review');
 assert.equal(tasks[0].automaticWebAccessAuthorized,false);
});

test('fake task completion with missing dependencies is rejected',()=>{
 assert.throws(()=>planCategoryCapabilities({label:'Dehumidifiers',catalog:[known],asOf:now,
  completionReceipts:[receipts[7]]}));
});
test('category review cannot bypass upstream category research and audit',()=>{
 const p=formCategoryBlueprint({categoryId:'provisional_dehumidifiers',signals:[sample(1),sample(2)]});
 assert.throws(()=>reviewInitialCategorySchema({blueprint:p,acceptedFingerprints:[p.candidates[0].definitionSha256],
  reviewer:'analyst',reviewReference:'review_1',knownCategories:[known],
  approvedCategoryId:'dehumidifiers',categoryResearchReceipts:[receipts[0]],asOf:now}));
});

test('a known but unreviewed category stays in the research lifecycle',()=>{
 const research={categoryId:'provisional_dehumidifiers',label:'Dehumidifiers',aliases:[],
  status:'research' as const,registryVersion:null};
 const p=planCategoryCapabilities({label:'Dehumidifiers',catalog:[research],asOf:now});
 assert.equal(p.tasks[0].capability,'category_identity');
 assert.equal(p.tasks.length,11);
 const prevention=planPreventiveCategoryWork({catalog:[research],asOf:now,maxTasks:3,gaps:[
  {categoryId:research.categoryId,criterion:'category_change',observedGap:true,observedAt:now,referenceId:'ticket_01'}]});
 assert.equal(prevention.length,0);
});
import {createCategoryInvestigationDossier} from '../src/category_cognitive_mesh.js';
test('unknown category can construct upstream needs dossier before ANY test exists',()=>{
 const d=createCategoryInvestigationDossier({categoryId:'provisional_dehumidifiers',questions:[
  {key:'water_removal_rate',axis:'measurement_methods',contextTags:['humid_room'],
   reasonReferenceId:'discovery_request_1',suggestedField:proposal},
  {key:'water_removal_rate',axis:'measurement_methods',contextTags:['humid_room'],
   reasonReferenceId:'discovery_request_1',suggestedField:proposal}]});
 assert.equal(d.questions.length,1);
 assert.ok(d.baselineAxes.includes('failure_modes'));
 assert.equal(d.candidateFieldKeys[0],'water_removal_rate');
 assert.equal(d.automaticallyChangesCategorySchema,false);
 assert.equal(d.rankingEligible,false);
});
test('conflicting initial ideas are flagged and remain unverified questions',()=>{
 const d=createCategoryInvestigationDossier({categoryId:'provisional_dehumidifiers',questions:[
  {key:'water_removal_rate',axis:'measurement_methods',contextTags:[],
   reasonReferenceId:'reason_1',suggestedField:proposal},
  {key:'water_removal_rate',axis:'measurement_methods',contextTags:[],
   reasonReferenceId:'reason_2',suggestedField:{...proposal,unit:'ml_per_hour'}}]});
 assert.equal(d.questions.length,2);
 assert.ok(d.questions.every(q=>q.status==='conflicting_hypotheses'));
});
test('unsafe initial research questions are rejected',()=>{
 assert.throws(()=>createCategoryInvestigationDossier({categoryId:'provisional_dehumidifiers',questions:[
  {key:'scraped<html>',axis:'user_outcomes',contextTags:[],reasonReferenceId:'ref_1'}]}));
});
