import test from 'node:test';import assert from 'node:assert/strict';
import {planQuestionResearch122} from '../src/phase122_native_question_to_research.js';
import {searchInternalPassages122,type IndexedPassage122} from '../src/phase122_native_local_retrieval.js';
const plan=planQuestionResearch122('Robot aspirapolvere con meno interventi umani',
 {candidateCount:0,verifiedMetricKeys:[],hasIndependentlyReviewedQualityPolicy:false,protocolComparable:false});
const docs:IndexedPassage122[]=[
 {passageId:'review_method',sourceUrl:'https://www.rtings.com/robot-vacuum/tests/obstacle-avoidance',
  sourceIdentity:'rtings_tests',rightsReviewed:true,
  text:'Robot vacuum obstacle avoidance testing reports intervention rate on a carpet and bare floor test course, not the number of automatic dock functions.'},
 {passageId:'irrelevant_source',sourceUrl:'https://www.iec.ch/',sourceIdentity:'standards',rightsReviewed:true,
  text:'Electric powered washers and surface cleaning appliances have standards and certifications.'},
 {passageId:'unauthorized_note',sourceUrl:'https://publisher.example.org/review',sourceIdentity:'unverified',rightsReviewed:false,
  text:'Robot vacuum intervention rate was measured in a laboratory.'}
];
test('local native retriever finds expert-method candidate before unrelated text',()=>{
 const r=searchInternalPassages122(plan,docs,2);
 const intervention=r.results.find(x=>x.metric==='rescue_interventions');
 assert.ok(intervention);assert.equal(intervention.hits[0]?.passageId,'review_method');
 assert.equal(intervention.retrievalIsEvidence,false);
 assert.equal(intervention.sourceIdentityVerified,false);
 assert.equal(r.publicRankingAuthorized,false);
});
test('rights-unreviewed content never enters local fulltext index',()=>{
 const r=searchInternalPassages122(plan,docs);
 assert.equal(r.corpusPassages,2);
 assert.ok(r.results.every(x=>x.hits.every(h=>h.passageId!=='unauthorized_note')));
});
test('no passages means no hallucinated retrieval hits',()=>{
 const r=searchInternalPassages122(plan,[]);
 assert.equal(r.corpusPassages,0);assert.ok(r.results.every(x=>x.hits.length===0));
});
test('retrieval results are deterministic under document permutation',()=>{
 const a=searchInternalPassages122(plan,docs);const b=searchInternalPassages122(plan,[...docs].reverse());
 assert.deepEqual(a,b);
});
test('duplicate passage ids and untrusted malformed records are rejected',()=>{
 assert.throws(()=>searchInternalPassages122(plan,[docs[0],docs[0]]),/invalid_local/);
 assert.throws(()=>searchInternalPassages122(plan,[{...docs[0],text:''}]),/invalid_local/);
});
