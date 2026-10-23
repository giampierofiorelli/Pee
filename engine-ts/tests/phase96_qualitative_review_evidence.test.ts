import {test} from 'node:test';
import assert from 'node:assert/strict';
import {acquireProfessionalQualitativeEvidence,assessQualitativeNeeds,
 type CandidateQualitativeFinding,type QuarantinedQualitativeFinding,type ReviewEvidenceApproval}
 from '../src/phase96_qualitative_review_evidence.js';
import type {WebCandidate,WebSourcePolicy} from '../src/web_evidence_acquisition.js';
import type {SourceTransport} from '../src/approved_web_reader.js';
const asOf='2026-10-10T21:00:00Z';
const url='https://reviews.publicexample.org/sony/wh-1000xm5';
const candidate:WebCandidate={id:'xm5_editorial',sourceId:'publisher_lab',url,
 exactVariantId:'sony_wh_1000xm5',originalTestId:'sony_review_lab_run_1',
 lineageAttestationReference:'reviewed_test_execution_attestation',kind:'original_professional_test',
 publishedAt:null,updatedAt:null,metadataOrigin:'human_supplied'};
const policy:WebSourcePolicy={sourceId:'publisher_lab',host:'reviews.publicexample.org',basis:'written_permission',
 rightsDocumentId:'test_permission_receipt',rightsDocumentUrl:'https://reviews.publicexample.org/policy',
 reviewedBy:'test_officer',reviewedAt:'2026-10-10T20:30:00Z',validUntil:'2026-11-30T00:00:00Z',
 permittedOperations:['metadata_discovery','page_retrieval','local_analysis','fact_storage','public_citation'],
 robots:'allowed',robotsCheckedAt:'2026-10-10T20:45:00Z',websiteTerms:'reviewed_permitted',
 termsCheckedAt:'2026-10-10T20:45:00Z',commercialUseReviewed:true};
const facet={categoryId:'headphones',criterionId:'long_wear_comfort',
 reviewedBy:'test_officer',reviewReference:'field_mapping_receipt_123',
 interpretationGuide:'Comfort of over-ear headphones after extended periods of use'};
const anchor='Sony WH-1000XM5 caused noticeable pressure for our tester during a long wearing session.';
const html=`<html><h1>Sony WH-1000XM5 review</h1><p>${anchor}</p></html>`;
const finding:CandidateQualitativeFinding={findingId:'pressure_long_wear',exactVariantId:candidate.exactVariantId,
 criterionId:facet.criterionId,proposition:'The reviewer reported pressure during extended wearing.',
 polarity:'unfavourable',basis:'hands_on_observation',context:{wear_duration:'long',fit:'tester'},
 anchorText:anchor,methodologyReference:'reviewer_direct_wearing_session',qualification:'A single tester does not establish population-wide fit.'};
const makeTransport=(body=html,seen:string[]=[]):SourceTransport=>({async get(u){seen.push(u);
 return u.endsWith('/robots.txt')?{status:200,finalUrl:u,contentType:'text/plain',body:'User-agent: *\nAllow: /'}:
 {status:200,finalUrl:u,contentType:'text/html',body};}});
const acquire=(override:Record<string,unknown>={})=>acquireProfessionalQualitativeEvidence({
 candidate,policy,asOf,exactModelName:'Sony WH-1000XM5',articleType:'single_product',facet,
 transport:makeTransport(),proposeFromTransientHtml:()=>[finding],...override});
const approval=(o:QuarantinedQualitativeFinding,over:Partial<ReviewEvidenceApproval>={}):ReviewEvidenceApproval=>({
 findingId:o.findingId,reviewerId:'human_assessor',reviewReference:'checked_source_and_conditions',
 validatedSourceSha256:o.sourceSha256,reviewedAt:'2026-10-11T00:00:00Z',
 semanticFaithfulness:'confirmed',methodAssessment:'documented',adequacyAssessment:'documented',
 criterionImplication:o.polarity==='favourable'?'supports':o.polarity==='unfavourable'?'concerns':
 o.polarity==='mixed'?'tradeoff':'undetermined',...over});
const need={criterionId:'long_wear_comfort',importance:'essential' as const,
 context:{wear_duration:'long',fit:'tester'},avoidAdverseFinding:true};

test('real Phase69 guarded reader quarantines qualitative statements without conversion to numbers',async()=>{
 const seen:string[]=[];
 const r=await acquire({transport:makeTransport(html,seen)});
 assert.equal(r.status,'quarantined');assert.equal(seen.length,2);
 assert.equal(r.observations.length,1);
 assert.equal(r.observations[0].polarity,'unfavourable');
 assert.equal(r.observations[0].weight,null);assert.equal(r.observations[0].numericScore,null);
 assert.equal(r.observations[0].quantifiedMeasurement,false);
 assert.equal(r.publicationReady,false);assert.equal(r.rankingEligible,false);
 assert.equal(r.observations[0].sourceSpanSha256.length,64);
 assert.ok(!JSON.stringify(r).includes(anchor));
});
test('reviewed adverse qualitative assertion can trigger hold for an explicit essential constraint',async()=>{
 const r=await acquire(); const x=assessQualitativeNeeds({needs:[need],observations:r.observations,
 approvals:[approval(r.observations[0])]});
 assert.equal(x.assessments[0].status,'potential_essential_constraint_conflict');
 assert.equal(x.assessments[0].recommendationGuard,'hold_for_review');
 assert.equal(x.assessments[0].numericScore,null);
 assert.equal(x.rankingEligible,false);
});
test('a negative claim without a reviewed source/method does not become a product defect',async()=>{
 const r=await acquire();const x=assessQualitativeNeeds({needs:[need],observations:r.observations,approvals:[]});
 assert.equal(x.assessments[0].status,'unresolved_methodology');
 assert.equal(x.assessments[0].recommendationGuard,'no_additional_hold');
});
test('usage context mismatch is not transferred to other users',async()=>{
 const r=await acquire();const x=assessQualitativeNeeds({needs:[{...need,
 context:{wear_duration:'short',fit:'tester'}}],observations:r.observations,approvals:[approval(r.observations[0])]});
 assert.equal(x.assessments[0].status,'not_applicable');
 assert.equal(x.assessments[0].recommendationGuard,'no_additional_hold');
});
test('observations from conflicting original tests are shown as unresolved, not majority votes',async()=>{
 const r=await acquire();const adverse=r.observations[0];
 const good:QuarantinedQualitativeFinding={...adverse,findingId:'comfortable_second_test',
 polarity:'favourable',proposition:'The second tester found the fit comfortable over a long session.',
 originalTestId:'another_independent_execution',sourceUrl:'https://research.publicexample.org/review'};
 const x=assessQualitativeNeeds({needs:[need],observations:[adverse,good],approvals:[approval(adverse),approval(good)]});
 assert.equal(x.assessments[0].status,'conflicting_evidence');
 assert.equal(x.assessments[0].recommendationGuard,'hold_for_review');
});
test('two passages from same test cannot manufacture numerical weight or votes',async()=>{
 const r=await acquire();const a=r.observations[0];
 const b={...a,findingId:'second_passage',proposition:'The reviewer again described extended wearing as uncomfortable.'};
 const x=assessQualitativeNeeds({needs:[need],observations:[a,b],approvals:[approval(a),approval(b)]});
 assert.equal(x.assessments[0].status,'potential_essential_constraint_conflict');
 assert.equal(x.assessments[0].numericScore,null);
});
test('rights denial precedes HTML access and model proposal',async()=>{
 let n=0;const seen:string[]=[];
 const r=await acquire({policy:{...policy,websiteTerms:'unknown'},transport:makeTransport(html,seen),
 proposeFromTransientHtml:()=>{n++;return [finding]}});
 assert.equal(r.status,'blocked');assert.equal(n,0);assert.equal(seen.length,0);
});
test('a proposal that is not anchored in the actual page cannot enter quarantine',async()=>{
 const r=await acquire({proposeFromTransientHtml:()=>[{...finding,anchorText:'Fake reviewer text about pressure during a long session.'}]});
 assert.equal(r.status,'blocked');assert.equal(r.observations.length,0);
});
test('reported third-party claims cannot masquerade as hands-on original testing',async()=>{
 const r=await acquire({proposeFromTransientHtml:()=>[{...finding,basis:'reported_claim'}]});
 assert.equal(r.status,'blocked');
});
test('comparative article requires exact model label in each anchored observation',async()=>{
 const other='Several testers found considerable pressure during a long wearing session.';
 const r=await acquire({articleType:'comparison',transport:makeTransport(html+other),
 proposeFromTransientHtml:()=>[{...finding,anchorText:other}]});
 assert.equal(r.status,'blocked');
});
test('methodological uncertainty prevents false confidence in the claim',async()=>{
 const r=await acquire();const x=assessQualitativeNeeds({needs:[need],observations:r.observations,
 approvals:[approval(r.observations[0],{methodAssessment:'uncertain'})]});
 assert.equal(x.assessments[0].status,'unresolved_methodology');
});
test('mismatched digest invalidates approval after the source changes',async()=>{
 const r=await acquire();const x=assessQualitativeNeeds({needs:[need],observations:r.observations,
 approvals:[approval(r.observations[0],{validatedSourceSha256:'a'.repeat(64)})]});
 assert.equal(x.assessments[0].status,'unresolved_methodology');
});
test('a favourable reviewed statement can support need without fabricating a score',async()=>{
 const r=await acquire({proposeFromTransientHtml:()=>[{...finding,polarity:'favourable',
  proposition:'The reviewer found the fit comfortable in the observed context.'}]});
 const x=assessQualitativeNeeds({needs:[need],observations:r.observations,
 approvals:[approval(r.observations[0])]});
 assert.equal(x.assessments[0].status,'contextual_support');
 assert.equal(x.assessments[0].recommendationGuard,'no_additional_hold');
 assert.equal(x.assessments[0].numericScore,null);
});

test('a neutral/descriptive observed limitation can threaten a user hard constraint when separately reviewed',async()=>{
 const r=await acquire({proposeFromTransientHtml:()=>[{...finding,
  polarity:'descriptive',proposition:'An observed hardware limitation affects long-wear comfort.'}]});
 const x=assessQualitativeNeeds({needs:[need],observations:r.observations,
  approvals:[approval(r.observations[0],{criterionImplication:'concerns'})]});
 assert.equal(x.assessments[0].status,'potential_essential_constraint_conflict');
 assert.equal(x.assessments[0].recommendationGuard,'hold_for_review');
});
test('unmapped descriptive statements are unresolved, not treated as a positive or negative score',async()=>{
 const r=await acquire({proposeFromTransientHtml:()=>[{...finding,
  polarity:'descriptive',proposition:'The reviewer noted a model-specific design constraint.'}]});
 const x=assessQualitativeNeeds({needs:[need],observations:r.observations,
  approvals:[approval(r.observations[0],{criterionImplication:'undetermined'})]});
 assert.equal(x.assessments[0].status,'unresolved_methodology');
 assert.equal(x.assessments[0].numericScore,null);
});
