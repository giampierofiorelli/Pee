import {test} from 'node:test';
import assert from 'node:assert/strict';
import {floorRobotSchema125,type CategorySchema125} from '../src/phase125_compositional_dialogue_frame.js';
import {newSession127,advanceConversation127,resolveConversationReply127,
 registerPresentedCandidates127,correctMeaning127,dismissPending127,contextSnapshot127,
 type ReviewedAmbiguity127,type ReviewedImpact127} from '../src/phase127_stateful_clarification.js';

const stair:ReviewedAmbiguity127={issueCode:'stair_scope',categoryId:floorRobotSchema125.id,
 schemaReviewId:'schema_stairs_1',triggers:['scalini','stairs','gradini'],
 questionIt:'Intendi piccole soglie oppure una scala completa?',
 questionEn:'Do you mean door thresholds or an entire staircase?',
 meanings:[{readingId:'door_threshold',interpretationCode:'threshold',labelIt:'Piccole soglie',
  labelEn:'Door thresholds',absoluteConstraintId:'threshold_traversal'},
 {readingId:'staircase',interpretationCode:'whole_staircase',labelIt:'Una scala completa',
  labelEn:'An entire staircase',absoluteConstraintId:'staircase_traversal'}],allowComparison:true};
const impact:ReviewedImpact127={issueCode:stair.issueCode,categoryId:stair.categoryId,
 schemaReviewId:stair.schemaReviewId,evidenceSnapshotId:'snapshot_01',reviewerId:'reviewer_01',
 projections:[{readingId:'door_threshold',topVariantId:'robot_a',eligibleVariantIds:['robot_a'],evidenceGaps:[]},
 {readingId:'staircase',topVariantId:'robot_b',eligibleVariantIds:['robot_b'],evidenceGaps:[]}]};
const turn=(turnId:string,question:string,more:object={})=>({turnId,question,language:'it' as const,
 evidence:'needs_acquisition' as const,schema:floorRobotSchema125,...more});
const ask=(id='turn_one')=>advanceConversation127(newSession127('conversation_1'),turn(id,
 'Cerco robot aspirapolvere che salgono gli scalini',{ambiguities:[stair],impactReviews:[impact]}));

test('empty session has no hidden constraints or ranking authority',()=>{
 const s=newSession127('session_a');assert.equal(s.revision,0);assert.deepEqual(s.values,[]);
 assert.equal(s.rankingAuthorized,false);assert.equal(s.categoryId,null);
});
test('general best request does not force clarification',()=>{
 const r=advanceConversation127(newSession127('session_a'),turn('turn_a','Qual è il miglior robot aspirapolvere?'));
 assert.equal(r.decision.action,'continue_research');assert.equal(r.session.pending,null);
 assert.equal(r.session.revision,1);assert.equal(r.rankingAuthorized,false);
});
test('schema registered but no external impact: research first; do not manufacture a question',()=>{
 const r=advanceConversation127(newSession127('session_a'),turn('turn_a',
 'Robot aspirapolvere che salgono gli scalini',{ambiguities:[stair]}));
 assert.deepEqual(r.detectedIssues,['stair_scope']);assert.equal(r.impactStatus,'needs_original_evidence');
 assert.equal(r.decision.action,'investigate_interpretations');assert.equal(r.decision.pending,null);
});
test('reviewed alternative projections => Phase111/126 chooses single question',()=>{
 const r=ask();assert.equal(r.decision.action,'ask_one_question');
 assert.equal(r.session.pending?.choices.length,3);assert.equal(r.session.pending?.choices[2].kind,'compare');
 assert.deepEqual(r.session.askedIssueCodes,['stair_scope']);
});
test('answer resolves reading in conversation state and does not rewrite source facts',()=>{
 const first=ask();const q=first.session.pending!;
 const out=resolveConversationReply127(first.session,{questionId:q.id,answerTurnId:'reply_1',choiceId:'staircase'});
 assert.equal(out.next,'resume_research');assert.equal(out.session.knownReadings.stair_scope,'staircase');
 assert.equal(out.session.pending,null);assert.equal(out.session.rankingAuthorized,false);
 assert.equal(out.session.revision,2);
 const resumed=advanceConversation127(out.session,turn('followup_1','Robot aspirapolvere con meno manutenzione',
  {ambiguities:[stair],impactReviews:[impact]}));
 assert.equal(resumed.decision.action,'continue_research');
 assert.equal(resumed.session.knownReadings.stair_scope,'staircase');
});
test('compare both is exploration, not conjunction of mutually exclusive meanings',()=>{
 const first=ask();const q=first.session.pending!;
 const out=resolveConversationReply127(first.session,{questionId:q.id,answerTurnId:'reply_1',choiceId:'compare_both'});
 assert.equal(out.next,'compare_scenarios');assert.deepEqual(out.session.comparisonsRequested,['stair_scope']);
 assert.equal(out.session.knownReadings.stair_scope,undefined);
});
test('free answer requires interpretation and does not confirm a reading',()=>{
 const first=ask();const q=first.session.pending!;
 const out=resolveConversationReply127(first.session,{questionId:q.id,answerTurnId:'reply_1',
  freeText:'Tre gradini di una scala vera'});
 assert.equal(out.next,'interpret_free_text');assert.deepEqual(out.session.knownReadings,{});
});
test('skip means no invented preference',()=>{
 const first=ask();const q=first.session.pending!;
 const out=resolveConversationReply127(first.session,{questionId:q.id,answerTurnId:'reply_1',skip:true});
 assert.equal(out.next,'investigate_interpretations');assert.deepEqual(out.session.knownReadings,{});
});
test('pending clarification blocks another question and cannot be overwritten',()=>{
 const first=ask();
 assert.throws(()=>advanceConversation127(first.session,turn('turn_b','Il miglior robot aspirapolvere')),
  /pending_reply_requires_resolution/);
});
test('previous option cannot answer another unrelated pending question',()=>{
 const first=ask();const q=first.session.pending!;
 assert.throws(()=>resolveConversationReply127(first.session,{questionId:'some_other_question',
  answerTurnId:'reply_1',choiceId:'staircase'}),/stale/);
});
test('duplicate turn cannot be replayed',()=>{
 const first=ask();const q=first.session.pending!;
 assert.throws(()=>resolveConversationReply127(first.session,{questionId:q.id,
  answerTurnId:'turn_one',choiceId:'staircase'}),/stale/);
});
test('memory preserves explicit constraints across unrelated turns without promoting them to product facts',()=>{
 const a=advanceConversation127(newSession127('session_a'),turn('turn_a',
  'Robot aspirapolvere senza lavaggio per la moquette'));
 const mop=a.session.values.find(x=>x.aspectId==='mopping');
 assert.ok(mop);assert.equal(mop?.role,'excluded');assert.equal(mop?.status,'candidate');
 const b=advanceConversation127(a.session,turn('turn_b','Robot aspirapolvere che richiede meno manutenzione'));
 assert.equal(b.session.values.find(x=>x.aspectId==='mopping')?.role,'excluded');
 assert.equal(b.session.values.find(x=>x.aspectId==='mopping')?.originTurnId,'turn_a');
});
test('contradictory negation is not committed as a new constraint',()=>{
 const a=advanceConversation127(newSession127('session_a'),turn('turn_a','Robot aspirapolvere senza lavaggio'));
 const b=advanceConversation127(a.session,turn('turn_b','Robot aspirapolvere con lavaggio ma senza lavaggio'));
 assert.equal(b.decision.action,'investigate_interpretations');
 assert.equal(b.session.values.find(x=>x.aspectId==='mopping')?.role,'excluded');
});
test('unmatched or unsupported language never becomes material ambiguity automatically',()=>{
 const a=advanceConversation127(newSession127('session_a'),turn('turn_a',
  'Robot aspirapolvere che pulisce con vapore',{ambiguities:[stair],impactReviews:[impact]}));
 assert.deepEqual(a.detectedIssues,[]);assert.equal(a.decision.action,'investigate_interpretations');
});
test('equivalent evidence projections do not cause pointless question unless hard constraints differ',()=>{
 const equivalent={...stair,meanings:stair.meanings.map(m=>({...m,absoluteConstraintId:'generic_traversal'}))};
 const same={...impact,projections:impact.projections.map(x=>({...x,topVariantId:'robot_a',eligibleVariantIds:['robot_a']}))};
 const a=advanceConversation127(newSession127('session_a'),turn('turn_a','Robot aspirapolvere che salgono gli scalini',
  {ambiguities:[equivalent],impactReviews:[same]}));
 assert.notEqual(a.decision.action,'ask_one_question');assert.equal(a.session.pending,null);
});
test('misaligned reviewed impact is rejected rather than inventing product assignments',()=>{
 const bad={...impact,projections:[...impact.projections.slice(0,1),
  {...impact.projections[1],readingId:'another_meaning'}]};
 assert.throws(()=>advanceConversation127(newSession127('session_a'),turn('turn_a',
  'Robot aspirapolvere che salgono gli scalini',{ambiguities:[stair],impactReviews:[bad]})),
 /unverified_or_misaligned/);
});
test('independent context is session-scoped',()=>{
 const a=ask();const b=newSession127('session_b');
 assert.equal(b.pending,null);assert.deepEqual(b.knownReadings,{});assert.notEqual(a.session.sessionId,b.sessionId);
});
test('the session is serializable and preserves pending across a JSON round trip',()=>{
 const first=ask();const rehydrated=JSON.parse(JSON.stringify(first.session));
 const q=first.session.pending!;
 const out=resolveConversationReply127(rehydrated,{questionId:q.id,answerTurnId:'reply_1',choiceId:'door_threshold'});
 assert.equal(out.session.knownReadings.stair_scope,'door_threshold');
});
test('category mismatch never silently transfers a vacuum task to another category',()=>{
 const a=advanceConversation127(newSession127('session_a'),turn('turn_a','Robot aspirapolvere senza lavaggio'));
 const different:CategorySchema125={id:'dishwashers',aliases:['dishwasher'],aspects:[],schemaReviewId:'schema_dish'};
 assert.throws(()=>advanceConversation127(a.session,{...turn('turn_b','Which is the best one?'),schema:different}),/category_context_mismatch/);
});
test('material issue prompts do not leak into a new session',()=>{
 const first=ask();assert.ok(first.session.pending);
 const other=advanceConversation127(newSession127('session_other'),turn('new_question',
  'Robot aspirapolvere che salgono gli scalini',{ambiguities:[stair],impactReviews:[impact]}));
 assert.equal(other.decision.action,'ask_one_question');
});
test('explicit user correction replaces previously confirmed meaning with an audit event',()=>{
 const first=ask(), q=first.session.pending!;
 const answer=resolveConversationReply127(first.session,{questionId:q.id,answerTurnId:'reply_1',choiceId:'staircase'});
 const corrected=correctMeaning127(answer.session,{turnId:'correction_1',definition:stair,
   readingId:'door_threshold',userConfirmed:true});
 assert.equal(corrected.knownReadings.stair_scope,'door_threshold');
 assert.equal(corrected.history.at(-1)?.eventKind,'meaning_correction');
 assert.equal(corrected.rankingAuthorized,false);
});
test('invented correction is rejected',()=>{
 const first=ask(), q=first.session.pending!;
 const answer=resolveConversationReply127(first.session,{questionId:q.id,answerTurnId:'reply_1',choiceId:'staircase'});
 assert.throws(()=>correctMeaning127(answer.session,{turnId:'correction_1',definition:stair,
  readingId:'mop_stairs',userConfirmed:true}),/unverified_meaning_correction/);
});
test('unanswered clarification can be dismissed without falsely confirming an option',()=>{
 const first=ask();const stopped=dismissPending127(first.session,{turnId:'dismiss_1',reason:'new_topic'});
 assert.equal(stopped.pending,null);assert.deepEqual(stopped.knownReadings,{});
 assert.equal(stopped.history.at(-1)?.eventKind,'pending_dismissal');
});
test('presented verified candidate set grounds an elliptical follow-up',()=>{
 const first=advanceConversation127(newSession127('session_a'),turn('turn_a','Qual è il miglior robot aspirapolvere?'));
 const presented=registerPresentedCandidates127(first.session,{turnId:'present_1',
  categoryId:floorRobotSchema125.id,candidateIds:['product_a','product_b'],
  sourceSnapshotId:'evidence_snapshot_1',presentedToUser:true});
 const followup=advanceConversation127(presented,{...turn('turn_b','Which one would you choose?'),language:'en'});
 assert.equal(followup.frame.candidateReference,'verified_context');
 assert.deepEqual(followup.frame.candidateIds,['product_a','product_b']);
 assert.equal(followup.session.candidatesVerified,true);
 assert.equal(followup.rankingAuthorized,false);
});
test('product candidates cannot enter state without provenance or presentation',()=>{
 const first=advanceConversation127(newSession127('session_a'),turn('turn_a','Qual è il miglior robot aspirapolvere?'));
 assert.throws(()=>registerPresentedCandidates127(first.session,{turnId:'present_1',
  categoryId:floorRobotSchema125.id,candidateIds:['a','a'],sourceSnapshotId:'source_a',
  presentedToUser:true}),/candidate_set_not_grounded/);
});
test('context snapshot distinguishes user candidates from verified product evidence',()=>{
 const first=advanceConversation127(newSession127('session_a'),turn('turn_a',
  'Robot aspirapolvere senza lavaggio'));
 const snapshot=contextSnapshot127(first.session);
 assert.equal(snapshot.candidateConstraints.find(x=>x.aspectId==='mopping')?.status,'candidate');
 assert.equal(snapshot.rankingAuthorized,false);
});
test('Phase100 swing preference is persisted without mutating product evidence',()=>{
 const question={firstCriterionId:'hair',secondCriterionId:'stains',
  prompt:'Preferisci migliore raccolta dei peli o migliore lavaggio?',
  responses:['first_more_important','second_more_important','equally_important'] as
   ['first_more_important','second_more_important','equally_important'],
  conditionalFirstMore:[-1,1] as [number,number],conditionalSecondMore:[-1,1] as [number,number]};
 const preference={question,exactPhase100EvidenceReady:true as const,
  indeterminateTradeoff:true as const,userApprovedExploration:true as const};
 const first=advanceConversation127(newSession127('session_a'),{
  ...turn('turn_a','Qual è il miglior robot aspirapolvere?',
   {evidence:'reviewed_sufficient' as const}),preference});
 assert.equal(first.decision.action,'ask_one_question');assert.equal(first.session.pendingSwing?.firstCriterionId,'hair');
 const q=first.session.pending!;
 const resolved=resolveConversationReply127(first.session,{questionId:q.id,answerTurnId:'reply_1',
  choiceId:'first_more_important'});
 assert.equal(resolved.session.swingPreferences.length,1);
 assert.deepEqual(resolved.session.swingPreferences[0],{firstCriterionId:'hair',
  secondCriterionId:'stains',preferenceValue:'first_more_important',originTurnId:'reply_1'});
 const next=advanceConversation127(resolved.session,{...turn('turn_b','Robot aspirapolvere quale migliore?'),
  evidence:'reviewed_sufficient',preference});
 assert.notEqual(next.decision.action,'ask_one_question');assert.equal(next.session.pending,null);
 assert.equal(next.session.rankingAuthorized,false);
});
