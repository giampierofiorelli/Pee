import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateBrain128,compileCategoryKnowledge128,quarantineDiscovery128,promoteDiscovery128,
 interpretFromBrain128,routeDiscoveryIntoExistingCategoryResearch128,
 promoteQualityMethod128,promoteMeaningDistinction128,planCategoryKnowledgeGrowth128,
 type CategoryBrain128,type Concept128,type Review128} from '../src/phase128_category_cognition_dialogue_bridge.js';
import {discoverCandidateIssues127,newSession127,advanceConversation127}
 from '../src/phase127_stateful_clarification.js';

// CONSTRUCTED FIXTURE. Source URL represents review metadata, NOT an authenticated
// real-world product finding; test names aren't performance claims.
const original='https://www.rtings.com/robot-vacuum/tests/changelogs/1-1';
const method='https://www.nist.gov/publications/core-product-model-representing-design-information';
const review=(scope:Review128['reviewScope'],id='source_method'):Review128=>({
 reviewId:'review_'+scope,reviewerId:'fixture_reviewer',reviewScope:scope,sourceRefIds:[id]});
const concept=(id:string,kind:Concept128['kind'],aliases:string[],evidenceKeys:string[]=[],
 state:Concept128['state']='reviewed_definition'):Concept128=>({
 id,kind,label:id,aliases,evidenceKeys,state,...(state==='reviewed_definition'?{review:review('category_definition')}:{} )});
function base():CategoryBrain128{return {
 categoryId:'floor_cleaning_robot',schemaVersion:1,
 aliases:['robot aspirapolvere','robot lavapavimenti','robot vacuum'],
 sources:[
  {id:'source_method',url:method,title:'Category design model',originalDocumentId:'method_original',role:'original_expert_method'},
  {id:'source_robot_test',url:original,title:'Robot test methodology',originalDocumentId:'robot_original',role:'original_product_test'},
  {id:'source_manufacturer',url:'https://www.example.com/specification',title:'Test fixture',originalDocumentId:'spec_original',role:'manufacturer_specification'}
 ],
 concepts:[concept('vacuuming','task',['aspirazione','aspirare','vacuum'],['debris_pickup']),
  concept('mopping','task',['lavaggio','lavare','mop'],['stain_removal']),
  concept('carpet','environment',['moquette','carpet'],['carpet_debris_pickup']),
  concept('stairs','capability',['scalini','stairs'],['staircase_traversal']),
  concept('door_threshold','meaning',['piccole soglie']),
  concept('full_staircase','meaning',['una scala completa']),
  concept('vacuum_result','outcome',['rimozione dello sporco']),
  concept('stain_result','outcome',['rimozione delle macchie']),
  concept('steam','capability',['vapore','steam'],['actual_floor_steam_application'],'proposed_unverified')],
 quality:[{id:'vacuum_quality',goalConceptId:'vacuuming',outcomeConceptId:'vacuum_result',
  scope:'general',necessity:'assess_quality',rationale:'Measured cleaning outcome contextualized',
  review:review('quality_method','source_robot_test'),thresholdCalibrationRefId:null}],
 distinctions:[{issueCode:'stairs_meaning',triggerAliases:['scalini','stairs'],
  questionIt:'Soglie o una rampa di scale?',questionEn:'Thresholds or a staircase?',
  meanings:[{conceptId:'door_threshold',readingId:'threshold',labelIt:'Soglie',labelEn:'Thresholds',
   interpretationCode:'traverse_threshold',absoluteConstraintId:'threshold_traversal'},
   {conceptId:'full_staircase',readingId:'staircase',labelIt:'Scale complete',labelEn:'Full staircase',
   interpretationCode:'traverse_staircase',absoluteConstraintId:'staircase_traversal'}],
  allowComparison:true,review:review('ambiguity_meaning')}]
};}
const steamDiscovery={categoryId:'floor_cleaning_robot',concept:{id:'steam_new',kind:'capability' as const,
 label:'Steam floor application',aliases:['applicazione di vapore','steam cleaning'],evidenceKeys:['steam_on_floor']},
 suggestedSourceRefIds:['source_robot_test'],observedDocumentIds:['robot_original']};

test('valid category brain builds reusable reviewed query schema',()=>{
 const b=base();validateBrain128(b);const c=compileCategoryKnowledge128(b);
 assert.equal(c.schema.id,'floor_cleaning_robot');assert.ok(c.schema.aspects.some(a=>a.id==='vacuuming'));
 assert.ok(c.schema.aspects.some(a=>a.id==='carpet'));
 assert.ok(c.schema.aspects.some(a=>a.id==='stairs'));
});
test('unverified steam hypothesis never becomes category vocabulary',()=>{
 const c=compileCategoryKnowledge128(base());assert.ok(!c.schema.aspects.some(a=>a.id==='steam'));
 assert.deepEqual(c.knowledgeGaps.pendingConceptIds,['steam']);
});
test('the schema is derived rather than a second manual dialogue ontology',()=>{
 const res=interpretFromBrain128(base(),'Robot aspirapolvere per moquette, senza lavaggio');
 assert.equal(res.frame.categoryId,'floor_cleaning_robot');
 assert.ok(res.frame.aspects.some(x=>x.aspectId==='carpet'));
 assert.ok(res.frame.aspects.some(x=>x.aspectId==='mopping'&&x.role==='excluded'));
 assert.equal(res.rankingAuthorized,false);
});
test('the same reviewed brain yields a Phase127-compatible ambiguity',()=>{
 const c=compileCategoryKnowledge128(base());assert.equal(c.ambiguities.length,1);
 const frame=interpretFromBrain128(base(),'Robot aspirapolvere che salgono gli scalini').frame;
 const issues=discoverCandidateIssues127(frame,'Robot aspirapolvere che salgono gli scalini',c.ambiguities);
 assert.deepEqual(issues.map(i=>i.issueCode),['stairs_meaning']);
});
test('reviewed meanings alone cannot decide to ask when no ranking consequences exist',()=>{
 const b=base(),c=compileCategoryKnowledge128(b);
 const r=advanceConversation127(newSession127('fixture_session'),{
  turnId:'fixture_turn',question:'Robot aspirapolvere che salgono gli scalini',language:'it',
  evidence:'needs_acquisition',schema:c.schema,ambiguities:c.ambiguities});
 assert.equal(r.decision.action,'investigate_interpretations');
 assert.equal(r.session.pending,null);assert.equal(r.rankingAuthorized,false);
});
test('a category without a reviewed outcome method has a research gap',()=>{
 const c=compileCategoryKnowledge128(base());
 assert.deepEqual(c.knowledgeGaps.qualityMethods.map(g=>g.goalConceptId),['mopping']);
});
test('a manufacturer claim cannot become a reviewed quality method',()=>{
 const b=base(); b.quality=[{...b.quality[0],review:review('quality_method','source_manufacturer')}];
 assert.throws(()=>validateBrain128(b),/quality_requires_expert_or_original_test/);
});
test('mandatory minima require a grounded calibration citation',()=>{
 const b=base();b.quality=[{...b.quality[0],necessity:'must_meet_demonstrated_threshold'}];
 assert.throws(()=>validateBrain128(b),/mandatory_threshold_needs_calibration_source/);
});
test('new category is routed into existing cold-start capabilities, not automatically approved',()=>{
 const r=routeDiscoveryIntoExistingCategoryResearch128({label:'purificatore aria',catalog:[],asOf:'2026-10-11T14:00:00+01:00'});
 assert.equal(r.route.status,'unknown');assert.equal(r.noAutomaticOntologyPromotion,true);
 assert.ok(r.existingPlan.tasks.some(x=>x.capability==='use_case_research'));
 assert.equal(r.existingPlan.actualWorkExecuted,false);
});
test('known reviewed categories use monitoring and gap plan rather than cold-start',()=>{
 const r=routeDiscoveryIntoExistingCategoryResearch128({label:'Robot vacuum',
  catalog:[{categoryId:'floor_cleaning_robot',label:'robot aspirapolvere',aliases:['Robot vacuum'],
   status:'reviewed',registryVersion:3}],asOf:'2026-10-11T14:00:00+01:00'});
 assert.equal(r.route.status,'known');assert.ok(r.existingPlan.tasks.some(x=>x.capability==='coverage_analysis'));
});
test('new concept is quarantined, never changing previously compiled schema',()=>{
 const b=base(),snapshot=compileCategoryKnowledge128(b).ontologySnapshot;
 const staged=quarantineDiscovery128(b,steamDiscovery);
 assert.equal(staged.state,'pending_independent_review');
 assert.equal(compileCategoryKnowledge128(b).ontologySnapshot,snapshot);
});
test('quarantine rejects fabricated source linkage',()=>{
 const b=base();assert.throws(()=>quarantineDiscovery128(b,{...steamDiscovery,observedDocumentIds:['wrong_test']}),
  /source_document_mismatch/);
});
test('quarantine rejects unrecognized source identifier',()=>{
 const b=base();assert.throws(()=>quarantineDiscovery128(b,{...steamDiscovery,suggestedSourceRefIds:['not_known']}),
  /not_grounded_or_duplicate/);
});
test('reviewed promotion triggers new schema version and cache invalidation',()=>{
 const b=base();const staged=quarantineDiscovery128(b,steamDiscovery);
 const updated=promoteDiscovery128(b,staged,review('category_definition','source_robot_test'));
 assert.equal(updated.newVersion,2);assert.equal(updated.invalidationRequired,true);
 assert.notEqual(compileCategoryKnowledge128(updated.brain).ontologySnapshot,compileCategoryKnowledge128(b).ontologySnapshot);
 assert.ok(compileCategoryKnowledge128(updated.brain).schema.aspects.some(x=>x.id==='steam_new'));
});
test('a promoted concept is discoverable in later user requests',()=>{
 const b=base(),p=quarantineDiscovery128(b,steamDiscovery);
 const promoted=promoteDiscovery128(b,p,review('category_definition','source_robot_test'));
 const result=interpretFromBrain128(promoted.brain,'Robot aspirapolvere con applicazione di vapore');
 assert.ok(result.frame.aspects.some(x=>x.aspectId==='steam_new'));
 assert.equal(result.rankingAuthorized,false);
});
test('promotion cannot use an unrelated source as the review rationale',()=>{
 const b=base(),p=quarantineDiscovery128(b,steamDiscovery);
 assert.throws(()=>promoteDiscovery128(b,p,review('category_definition','source_method')),
  /receipt_not_in_discovery_provenance/);
});
test('promotion cannot be repeated on the new snapshot',()=>{
 const b=base(),p=quarantineDiscovery128(b,steamDiscovery),r=review('category_definition','source_robot_test');
 const promoted=promoteDiscovery128(b,p,r);
 assert.throws(()=>promoteDiscovery128(promoted.brain,p,r),/promotion_scope_or_conflict/);
});
test('tampered proposal cannot be promoted',()=>{
 const b=base(),p=quarantineDiscovery128(b,steamDiscovery);p.concept.label='Changed claim';
 assert.throws(()=>promoteDiscovery128(b,p,review('category_definition','source_robot_test')),/proposal_tampered/);
});
test('proposed definition with manufactured review is rejected',()=>{
 const b=base();b.concepts=[...b.concepts,{...concept('proposed_feature','capability',['x']),state:'proposed_unverified'}];
 assert.throws(()=>validateBrain128(b),/unverified_concept_has_review/);
});
test('quality outcome does not exist merely because a mechanism is present',()=>{
 const b=base(); b.concepts=[...b.concepts,concept('roller_mechanism','mechanism',['rullo'])];
 const compiled=compileCategoryKnowledge128(b);
 assert.equal(compiled.qualityAxes.length,1);assert.equal(compiled.qualityAxes[0].outcomeConceptId,'vacuum_result');
});
test('two separate categories do not share semantic snapshots',()=>{
 const a=base(),b=base();b.categoryId='other_category';b.aliases=['other device'];
 assert.notEqual(compileCategoryKnowledge128(a).ontologySnapshot,compileCategoryKnowledge128(b).ontologySnapshot);
});
test('missing review receipt prohibits a reviewed new concept',()=>{
 const b=base();b.concepts=[...b.concepts,{...concept('new_goal','task',['new action']),review:undefined}];
 assert.throws(()=>validateBrain128(b),/missing_or_invalid_review_receipt/);
});
test('ambiguous reading must belong to reviewed meaning concepts',()=>{
 const b=base();b.distinctions=[{...b.distinctions[0],meanings:[
  {...b.distinctions[0].meanings[0],conceptId:'steam'},b.distinctions[0].meanings[1]]}];
 assert.throws(()=>validateBrain128(b),/invalid_ambiguity_definition/);
});
test('source identity conflicts are rejected',()=>{
 const b=base();b.sources=[...b.sources,b.sources[0]];
 assert.throws(()=>validateBrain128(b),/invalid_source_identity/);
});
test('query order does not change the permanent knowledge snapshot',()=>{
 const b=base(),a=compileCategoryKnowledge128(b).ontologySnapshot;
 interpretFromBrain128(b,'Robot aspirapolvere per moquette');
 interpretFromBrain128(b,'Robot aspirapolvere senza lavaggio');
 assert.equal(compileCategoryKnowledge128(b).ontologySnapshot,a);
});
test('schema normalizes concept ordering for equivalent approved knowledge',()=>{
 const b=base(),reordered={...b,concepts:[...b.concepts].reverse()};
 assert.deepEqual(compileCategoryKnowledge128(b).schema.aspects,
  compileCategoryKnowledge128(reordered).schema.aspects);
 assert.equal(compileCategoryKnowledge128(b).ontologySnapshot,
  compileCategoryKnowledge128(reordered).ontologySnapshot);
});
test('schema snapshot changes if reviewed aliases mutate without version increment',()=>{
 const a=base(),b=base();
 b.concepts=b.concepts.map(c=>c.id==='vacuuming'?{...c,aliases:[...c.aliases,'aspirare a fondo']}:c);
 assert.notEqual(compileCategoryKnowledge128(a).ontologySnapshot,compileCategoryKnowledge128(b).ontologySnapshot);
 assert.notEqual(compileCategoryKnowledge128(a).schema.schemaReviewId,compileCategoryKnowledge128(b).schema.schemaReviewId);
});
test('semantically colliding reviewed aliases are not silently promoted',()=>{
 const b=base();const proposal=quarantineDiscovery128(b,{...steamDiscovery,
  concept:{...steamDiscovery.concept,aliases:['scalini','new capability']}});
 assert.throws(()=>promoteDiscovery128(b,proposal,review('category_definition','source_robot_test')),
  /semantic_alias_collision_requires_reconciliation/);
});

test('quality research gap can produce a reviewed new method without adding product scores',()=>{
 const b=base(); const outcome=b.concepts.find(c=>c.id==='stain_result');assert.ok(outcome);
 const promoted=promoteQualityMethod128(b,{id:'mop_quality',goalConceptId:'mopping',
 outcomeConceptId:'stain_result',scope:'mop_only',necessity:'assess_quality',
 rationale:'Residue at a comparable observation horizon',thresholdCalibrationRefId:null},
 review('quality_method','source_robot_test'));
 assert.equal(promoted.invalidationRequired,true);
 assert.equal(compileCategoryKnowledge128(promoted.brain).knowledgeGaps.qualityMethods.length,0);
 assert.equal(promoted.rankingAuthorized,false);
});
test('attempting to add an ungrounded compulsory quality rule is blocked',()=>{
 const b=base();assert.throws(()=>promoteQualityMethod128(b,{id:'made_up_threshold',
 goalConceptId:'mopping',outcomeConceptId:'stain_result',scope:'general',
 necessity:'must_meet_demonstrated_threshold',rationale:'No empirical basis',
 thresholdCalibrationRefId:null},review('quality_method','source_robot_test')),
 /mandatory_threshold_needs_calibration_source/);
});
test('learned reviewed meanings can extend an existing category without hand-editing the parser',()=>{
 const b=base();b.distinctions=[];
 const next=promoteMeaningDistinction128(b,{
 issueCode:'stairs_meaning',triggerAliases:['stairs','scalini'],
 questionIt:'Soglia o scale?',questionEn:'Threshold or stairs?',
 meanings:base().distinctions[0].meanings,allowComparison:true},review('ambiguity_meaning'));
 assert.equal(compileCategoryKnowledge128(next.brain).ambiguities.length,1);
 assert.equal(next.invalidationRequired,true);
});
test('ambiguous meanings cannot be promoted when a referenced concept is not reviewed',()=>{
 const b=base();b.distinctions=[];
 const bad={...base().distinctions[0],meanings:[
 {...base().distinctions[0].meanings[0],conceptId:'steam'},base().distinctions[0].meanings[1]]};
 assert.throws(()=>promoteMeaningDistinction128(b,bad,review('ambiguity_meaning')),
 /invalid_ambiguity_definition/);
});
test('research needs are derived across quality, pending knowledge, and function graph',()=>{
 const tasks=planCategoryKnowledgeGrowth128(base());
 assert.ok(tasks.tasks.some(t=>t.key==='quality_mopping'));
 assert.ok(tasks.tasks.some(t=>t.key==='concept_steam'));
 assert.equal(tasks.actualWebResearchPerformed,false);
});
