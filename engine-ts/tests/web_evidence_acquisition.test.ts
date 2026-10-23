import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planWebEvidenceAcquisition,quarantineRetrievedEvidence,type WebCandidate,type WebSourcePolicy,
 type EvidenceResearchRequest} from '../src/web_evidence_acquisition.js';
const at='2026-10-10T15:00:00Z';
const policy:WebSourcePolicy={sourceId:'independent_lab',host:'independent.example.org',
 basis:'written_permission',rightsDocumentId:'contract_reference_1',
 rightsDocumentUrl:'https://independent.example.org/permission',reviewedBy:'reviewer_1',
 reviewedAt:'2026-10-09T10:00:00Z',validUntil:'2027-01-01T00:00:00Z',
 permittedOperations:['metadata_discovery','page_retrieval','local_analysis','fact_storage','public_citation'],
 robots:'allowed',robotsCheckedAt:'2026-10-10T14:00:00Z',websiteTerms:'reviewed_permitted',
 termsCheckedAt:'2026-10-09T14:00:00Z',commercialUseReviewed:true};
const candidate:WebCandidate={id:'test_candidate',sourceId:'independent_lab',
 url:'https://independent.example.org/review/variant?utm_source=foo',exactVariantId:'model_a_2026',
 originalTestId:'lab_test_one',lineageAttestationReference:'editor_review_reference_1',kind:'original_professional_test',
 publishedAt:'2026-09-01T12:00:00Z',updatedAt:'2026-10-01T12:00:00Z',metadataOrigin:'publisher_feed'};
const request=(overrides:Partial<EvidenceResearchRequest>={}):EvidenceResearchRequest=>({
 exactVariantId:'model_a_2026',userQuestion:'How well does it perform this specific task?',
 asOf:at,maxDaysSinceCheck:7,candidates:[candidate],policies:[policy],existing:[],...overrides});
test('new independently evidenced product yields permission-gated retrieval plan without ranking',()=>{
 const r=planWebEvidenceAcquisition(request());
 assert.equal(r.rankingEligible,false);assert.equal(r.publicationReady,false);
 assert.equal(r.items[0].action,'retrieve_for_research');
 assert.equal(r.items[0].canonicalUrl,'https://independent.example.org/review/variant');
 assert.deepEqual(r.items[0].plannedOperations,['page_retrieval','local_analysis']);
});
test('no rights document, expired or stale robots => never retrieve',()=>{
 for(const patch of [{basis:'unknown' as const},{rightsDocumentId:null},
  {robots:'unknown' as const},{robotsCheckedAt:'2026-10-07T10:00:00Z'},
  {websiteTerms:'reviewed_prohibited' as const},{validUntil:'2026-10-01T00:00:00Z'},
  {commercialUseReviewed:false}]){
  const r=planWebEvidenceAcquisition(request({policies:[{...policy,...patch}]}));
  assert.equal(r.items[0].action,'metadata_only',JSON.stringify(patch));
 }
});
test('robot approval alone with no commercial rights is insufficient',()=>{
 const r=planWebEvidenceAcquisition(request({policies:[{...policy,basis:'unknown',permittedOperations:[]}]}));
 assert.equal(r.items[0].action,'metadata_only');
});
test('stored source no revision and recent check is reused without fetching',()=>{
 const r=planWebEvidenceAcquisition(request({existing:[{canonicalUrl:candidate.url,
  exactVariantId:'model_a_2026',originalTestId:'lab_test_one',
  lastMetadataCheckedAt:'2026-10-10T12:00:00Z',lastPageCheckedAt:'2026-10-09T12:00:00Z',
  lastObservedUpdatedAt:candidate.updatedAt,fingerprintSha256:null,reviewStatus:'approved_for_internal_reuse' as const}]}));
 assert.equal(r.items[0].action,'reuse_existing');
});
test('new update or due refresh plans retrieval',()=>{
 const known={canonicalUrl:candidate.url,exactVariantId:'model_a_2026',
  originalTestId:'lab_test_one',lastMetadataCheckedAt:'2026-10-10T12:00:00Z',
  lastPageCheckedAt:'2026-10-09T12:00:00Z',lastObservedUpdatedAt:'2026-09-15T12:00:00Z',fingerprintSha256:null,reviewStatus:'approved_for_internal_reuse' as const};
 const newer=planWebEvidenceAcquisition(request({existing:[known]}));
 assert.equal(newer.items[0].action,'retrieve_for_research');
 const old=planWebEvidenceAcquisition(request({existing:[{...known,lastPageCheckedAt:'2026-09-20T12:00:00Z',lastObservedUpdatedAt:candidate.updatedAt}]}));
 assert.equal(old.items[0].action,'retrieve_for_research');
});
test('second report on one original test is not independent evidence',()=>{
 const second={...candidate,id:'second_report',url:'https://independent.example.org/report/two'};
 const r=planWebEvidenceAcquisition(request({candidates:[candidate,second]}));
 assert.deepEqual(r.items.map(x=>x.action),['retrieve_for_research','skip_duplicate_report']);
});
test('different variants, syndicated reports and Amazon get no retrieval',()=>{
 const r=planWebEvidenceAcquisition(request({candidates:[
 {...candidate,id:'wrong',exactVariantId:'model_b_2026'},
 {...candidate,id:'report',kind:'syndicated_report'},
 {...candidate,id:'bad',url:'https://www.amazon.co.uk/review/123'},
 {...candidate,id:'local',url:'https://127.0.0.1/internal'}]}));
 assert.deepEqual(r.items.map(x=>x.action),['reject_mismatch','skip_duplicate_report','reject_source','reject_source']);
});
test('unknown source, host mismatch and duplicate grants block all extraction',()=>{
 const missing=planWebEvidenceAcquisition(request({policies:[]}));
 assert.equal(missing.items[0].action,'metadata_only');
 const duplicated=planWebEvidenceAcquisition(request({policies:[policy,policy]}));
 assert.equal(duplicated.items[0].action,'metadata_only');
 const mismatch=planWebEvidenceAcquisition(request({policies:[{...policy,host:'different.example.org'}]}));
 assert.equal(mismatch.items[0].action,'metadata_only');
});
test('transient analysis emits only hashes and original URL; never exposes text as ranking',()=>{
 const plan=planWebEvidenceAcquisition(request());
 const body='Measured resistance in the controlled protocol was moderate; no other result was obtained.';
 const output=quarantineRetrievedEvidence({plan,queueItem:plan.items[0],candidate,policy,
  retrieved:{finalUrl:'https://independent.example.org/review/variant',body,httpStatus:200,contentType:'text/html'},
  claims:[{criterionId:'resistance',valueText:'moderate response in specific protocol',anchorText:'Measured resistance in the controlled protocol was moderate'}]});
 assert.equal(output.status,'quarantined_human_method_and_rights_review');
 assert.equal(output.rankingEligible,false);assert.equal(output.publicationReady,false);
 assert.equal(JSON.stringify(output).includes('Measured resistance'),false);
 assert.deepEqual(output.citations,['https://independent.example.org/review/variant']);
});
test('unanchored, redirected or storage unlicensed analysis is blocked',()=>{
 const plan=planWebEvidenceAcquisition(request());
 const base={plan,queueItem:plan.items[0],candidate,policy,
  retrieved:{finalUrl:candidate.url,body:'Some measured data in this record that is long enough.',httpStatus:200,contentType:'text/plain'},
  claims:[{criterionId:'response',valueText:'moderate result',anchorText:'Some measured data'}]};
 assert.equal(quarantineRetrievedEvidence({...base,claims:[{...base.claims[0],anchorText:'unreported results'}]}).status,'blocked');
 assert.equal(quarantineRetrievedEvidence({...base,retrieved:{...base.retrieved,finalUrl:'https://different.example.com/'}}).status,'blocked');
 assert.equal(quarantineRetrievedEvidence({...base,policy:{...policy,permittedOperations:['metadata_discovery','page_retrieval','local_analysis']}}).status,'blocked');
});

test('a blocked publisher must not prevent a properly authorized original-source copy from being examined',()=>{
 const denied={...candidate,id:'denied_copy',sourceId:'blocked_site',url:'https://blocked-site.example.org/article'};
 const r=planWebEvidenceAcquisition(request({candidates:[denied,candidate]}));
 assert.deepEqual(r.items.map(x=>x.action),['metadata_only','retrieve_for_research']);
});
test('ambiguous existing stored records fail closed',()=>{
 const known={canonicalUrl:candidate.url,exactVariantId:'model_a_2026',originalTestId:'lab_test_one',
 lastMetadataCheckedAt:'2026-10-10T12:00:00Z',lastPageCheckedAt:'2026-10-09T12:00:00Z',
 lastObservedUpdatedAt:candidate.updatedAt,fingerprintSha256:null,reviewStatus:'approved_for_internal_reuse' as const};
 const r=planWebEvidenceAcquisition(request({existing:[known,known]}));
 assert.equal(r.items[0].action,'metadata_only');
});

test('unverified identical original test identifiers are not enough to suppress a distinct original source',()=>{
 const other={...candidate,id:'other_original',url:'https://independent.example.org/other',lineageAttestationReference:null};
 const r=planWebEvidenceAcquisition(request({candidates:[candidate,other]}));
 assert.deepEqual(r.items.map(x=>x.action),['retrieve_for_research','retrieve_for_research']);
});
test('unreviewed cached analysis cannot be silently reused as approved evidence',()=>{
 const r=planWebEvidenceAcquisition(request({existing:[{canonicalUrl:candidate.url,
 exactVariantId:'model_a_2026',originalTestId:'lab_test_one',
 lastMetadataCheckedAt:'2026-10-10T12:00:00Z',lastPageCheckedAt:'2026-10-09T12:00:00Z',
 lastObservedUpdatedAt:candidate.updatedAt,fingerprintSha256:null,reviewStatus:'quarantined_unreviewed'}]}));
 assert.deepEqual(r.items[0].reasons,['existing_record_requires_human_review']);
});
test('an original editorial hands-on assessment is eligible for targeted research, without being a lab measurement',()=>{
 const editorial={...candidate,kind:'original_editorial_assessment' as const,id:'original_editorial'};
 const r=planWebEvidenceAcquisition(request({candidates:[editorial]}));
 assert.equal(r.items[0].action,'retrieve_for_research');
 assert.equal(r.publicationReady,false);
});
