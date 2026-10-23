import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildCategoryEvidenceMatrix,matrixCoverageByField,type CategoryFieldRegistry,type ProposedStructuredFact} from '../src/category_evidence_matrix.js';
import type {EvidenceProcessingResult,WebCandidate,WebSourcePolicy} from '../src/web_evidence_acquisition.js';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const now='2026-10-10T19:00:00Z';
const registry:CategoryFieldRegistry={categoryId:'headphones',schemaVersion:1,reviewedBy:'human_editor',reviewReference:'controlled_field_review',fields:[
 {key:'speech_noise_reduction',type:'enum',unit:null,allowedValues:['high','medium','low','mixed'],
  permittedOrigins:['independent_professional_assessment'],requiresProtocol:false,contextKeys:['environment','noise_type']},
 {key:'battery_runtime',type:'number',unit:'hours',allowedValues:[],permittedOrigins:['independent_lab_measurement'],requiresProtocol:true,contextKeys:['anc_mode','playback_level']},
 {key:'has_bluetooth',type:'boolean',unit:null,allowedValues:[],permittedOrigins:['manufacturer_technical_specification'],requiresProtocol:false,contextKeys:['market']}]};
const candidate:WebCandidate={id:'candidate_1',sourceId:'licensed_publisher',url:'https://licensed.example.org/review/headphones',exactVariantId:'headphones_model_a',originalTestId:'test_a',lineageAttestationReference:'editor_identity_review',kind:'original_professional_test',publishedAt:now,updatedAt:now,metadataOrigin:'publisher_feed'};
const policy:WebSourcePolicy={sourceId:'licensed_publisher',host:'licensed.example.org',basis:'written_permission',rightsDocumentId:'rights_reference',rightsDocumentUrl:'https://licensed.example.org/rights',reviewedBy:'legal_reviewer',reviewedAt:now,validUntil:'2027-10-10T00:00:00Z',permittedOperations:['page_retrieval','local_analysis','fact_storage','public_citation'],robots:'allowed',robotsCheckedAt:now,websiteTerms:'reviewed_permitted',termsCheckedAt:now,commercialUseReviewed:true};
const p:ProposedStructuredFact={observationId:'obs_one',fieldKey:'speech_noise_reduction',origin:'independent_professional_assessment',value:{type:'enum',choice:'mixed'},context:{environment:'office',noise_type:'speech'},protocolId:null,protocolVersion:null,valueTextSha256:hash('a subjective source judgment'),anchorSha256:hash('source segment')};
const processing:EvidenceProcessingResult={status:'quarantined_human_method_and_rights_review',sourceUrl:candidate.url,contentSha256:hash('page'),observationDigests:[{criterionId:p.fieldKey,valueTextSha256:p.valueTextSha256,anchorSha256:p.anchorSha256}],originalTestId:'test_a',exactVariantId:candidate.exactVariantId,citations:[candidate.url],reasons:['hashes_only'],rankingEligible:false,publicationReady:false};
const run=(opts:Partial<Parameters<typeof buildCategoryEvidenceMatrix>[0]>={})=>buildCategoryEvidenceMatrix({registry,candidate,policy,processing,asOf:now,proposed:[p],...opts});
test('replaces prose with typed contextual fact, strictly research quarantine',()=>{
 const result=run();assert.equal(result.observations.length,1);const o=result.observations[0];
 assert.equal(o.value.type,'enum');assert.equal(o.reviewStatus,'quarantined_unreviewed');assert.equal(o.rankingEligible,false);
 assert.equal(o.schemaVersion,1);assert.equal(o.sourceUrl,candidate.url);
 assert.equal(JSON.stringify(result).includes('subjective source judgment'),false);
 assert.equal(JSON.stringify(result).includes('source segment'),false);
 assert.equal(matrixCoverageByField(registry,result.observations)[0].approvedCount,0);
});
test('unknown field cannot be created freely by a language model',()=>{
 const out=run({proposed:[{...p,fieldKey:'ai_invented_unregistered'}]});
 assert.deepEqual(out.rejected.map(r=>r.reason),['unregistered_category_field']);
});
test('numeric invented star-score cannot inhabit an editorial enum field',()=>{
 const out=run({proposed:[{...p,value:{type:'number',number:8.7,unit:'stars'}}]});
 assert.equal(out.rejected[0].reason,'typed_value_or_unit_invalid');
});
test('matching user context must be complete and category controlled',()=>{
 for(const context of ([{environment:'office'},{environment:'office',noise_type:'speech',memo:'original_prose'},{}] as Readonly<Record<string,string>>[])){
  assert.equal(run({proposed:[{...p,context}]}).rejected[0].reason,'required_context_missing_or_uncontrolled');
 }
});
test('independent measurement requires protocol and identified original test',()=>{
 const measured:ProposedStructuredFact={...p,fieldKey:'battery_runtime',origin:'independent_lab_measurement',value:{type:'number',number:20,unit:'hours'},context:{anc_mode:'on',playback_level:'specified'},protocolId:null,protocolVersion:null};
 assert.equal(run({proposed:[measured]}).rejected[0].reason,'method_protocol_invalid');
 assert.equal(run({proposed:[{...measured,protocolId:'test_protocol',protocolVersion:'version_one'}],candidate:{...candidate,originalTestId:null}}).observations.length,0);
});
test('the same field supports distinct contextual observations, not one global rating',()=>{
 const other:ProposedStructuredFact={...p,observationId:'obs_two',context:{environment:'train',noise_type:'engine'}};
 const result=run({proposed:[p,other]});
 assert.equal(result.observations.length,2);assert.notDeepEqual(result.observations[0].context,result.observations[1].context);
});
test('unsupported ingestion rights, blocked analysis or source mismatch exclude everything',()=>{
 assert.equal(run({policy:{...policy,permittedOperations:['page_retrieval']}}).observations.length,0);
 assert.equal(run({processing:{...processing,status:'blocked'}}).observations.length,0);
 assert.equal(run({policy:{...policy,host:'other.example.org'}}).observations.length,0);
 assert.equal(run({policy:{...policy,robotsCheckedAt:'2026-09-30T00:00:00Z'}}).observations.length,0);
 assert.equal(run({policy:{...policy,termsCheckedAt:'2026-07-01T00:00:00Z'}}).observations.length,0);
});
test('metadata hash changes never imply scientific validation or scoring approval',()=>{
 const result=run({processing:{...processing,contentSha256:hash('different revision')}});
 assert.equal(result.observations.length,1);assert.equal(result.observations[0].rankingEligible,false);
 assert.notEqual(result.observations[0].candidateFingerprintSha256,run().observations[0].candidateFingerprintSha256);
});
test('an unsupported manufacturer marketing source cannot impersonate a laboratory report',()=>{
 const source={...candidate,kind:'manufacturer_technical_document' as const};
 assert.equal(run({candidate:source}).rejected[0].reason,'origin_kind_conflict');
});
test('alternative categories can define their own dimensions without altering old categories',()=>{
 const appliance:CategoryFieldRegistry={...registry,categoryId:'washing_machines',fields:[
  {key:'water_consumption',type:'number',unit:'litres',allowedValues:[],permittedOrigins:['independent_lab_measurement'],requiresProtocol:true,contextKeys:['cycle']} ]};
 assert.deepEqual(matrixCoverageByField(appliance,[]),[{fieldKey:'water_consumption',quarantinedCount:0,approvedCount:0,readyForRanking:false}]);
});
test('unsupported or unanchored observations rejected, even when proposed by AI',()=>{
 assert.equal(run({proposed:[{...p,valueTextSha256:hash('unmatched') }]}).rejected[0].reason,'candidate_not_anchored_to_processed_source');
});

test('the same original test and context cannot be counted twice',()=>{
 const extra:ProposedStructuredFact={...p,observationId:'obs_two'};
 const result=run({proposed:[p,extra]});
 assert.equal(result.observations.length,1);
 assert.equal(result.rejected[0].reason,'duplicate_same_source_test_field_and_context');
});
