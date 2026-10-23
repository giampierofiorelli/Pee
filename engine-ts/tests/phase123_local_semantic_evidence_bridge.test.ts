import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trainNativeModel123,planNativeResearch123,type LabeledQuestion123} from '../src/phase123_native_learned_intent.js';
import {searchLocalGoalCandidates123} from '../src/phase123_local_semantic_evidence_bridge.js';
import type {IndexedPassage122} from '../src/phase122_native_local_retrieval.js';
const {samples}=JSON.parse(readFileSync('research/phase123_training_examples.json','utf8')) as {samples:LabeledQuestion123[]};
const m=trainNativeModel123(samples.filter((_,i)=>i%5!==4),samples.filter((_,i)=>i%5===4));
const zero={candidateCount:0,verifiedMetricKeys:[] as [],hasIndependentlyReviewedQualityPolicy:false,protocolComparable:false};
const c={verifiedCategory:'floor_cleaning_robot' as const};
const docs:IndexedPassage122[]=[
 {passageId:'steam_test',sourceUrl:'https://example.org/studies/steam',sourceIdentity:'candidate1',rightsReviewed:true,
   text:'Floor cleaning robots may contain a steam generator on board the machine; a steam test should distinguish nozzle output from the floor temperature.'},
 {passageId:'stairs_test',sourceUrl:'https://example.org/studies/stairs',sourceIdentity:'candidate2',rightsReviewed:true,
   text:'Robotic stair climbing means traversing a staircase, and must be distinguished from climbing a low door threshold.'},
 {passageId:'no_rights',sourceUrl:'https://example.org/studies/private',sourceIdentity:'candidate3',rightsReviewed:false,
   text:'Steam robot floor cleaner review observed model features and measurements.'}
];
test('known local sources can provide candidates for an unresolved novel goal',()=>{
 const p=planNativeResearch123(m,'E se cercassimo robot con vapore?',zero,c);
 const r=searchLocalGoalCandidates123(p,docs);
 assert.equal(r.externalSearchExecuted,false);
 assert.equal(r.sourceIdentityVerified,false);
 assert.equal(r.interpretiveGroundingConfirmed,false);
 assert.equal(r.productMeasurementsVerified,false);
 assert.ok(r.hits.length>0);
 assert.equal(r.hits[0].passageId,'steam_test');
 assert.ok(r.hits.every(h=>h.passageId!=='no_rights'));
});
test('local hits do not constitute verified evidence even when all keywords match',()=>{
 const p=planNativeResearch123(m,'robot con vapore',zero,c);
 const r=searchLocalGoalCandidates123(p,docs);
 assert.equal(r.publicRankingAuthorized,false);
 assert.equal(r.next,'independent_semantic_review');
});
test('empty local corpus leads to new source acquisition, not fabricated facts',()=>{
 const p=planNativeResearch123(m,'E se cercassimo robot con vapore?',zero,c);
 const r=searchLocalGoalCandidates123(p,[]);
 assert.equal(r.next,'acquire_new_sources');assert.equal(r.hits.length,0);
});
test('negated unknown requests do not cause speculative discovery',()=>{
 const p=planNativeResearch123(m,'non voglio robot che lavano',zero,c);
 const r=searchLocalGoalCandidates123(p,docs);
 assert.equal(r.next,'request_clarification');assert.equal(r.attemptedQueries,0);
});
test('retrieval is deterministic and rights-unreviewed passages excluded',()=>{
 const p=planNativeResearch123(m,'E se cercassimo robot con vapore?',zero,c);
 assert.deepEqual(searchLocalGoalCandidates123(p,docs),
  searchLocalGoalCandidates123(p,[...docs].reverse()));
});
test('untrusted malformed passage records are rejected by existing local index',()=>{
 const p=planNativeResearch123(m,'E se cercassimo robot con vapore?',zero,c);
 assert.throws(()=>searchLocalGoalCandidates123(p,[{...docs[0],sourceUrl:'javascript:alert(1)'}]),/invalid_local/);
});
