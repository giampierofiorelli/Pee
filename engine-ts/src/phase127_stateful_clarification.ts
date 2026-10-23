/** Phase127: native stateful mixed-initiative coordinator (bounded research prototype).
 * Reuses Phase125 parsing, Phase111 decision impact, and Phase126 user clarification.
 * A domain-reviewed ambiguity lexicon triggers HYPOTHESES, not product truth.
 * Independently reviewed projections are required before decision-impact questions.
 * User assertions remain session-scoped and never alter canonical product evidence.
 */
import {createHash} from 'node:crypto';
import {composeQuestion125,type CategorySchema125,type Composition125,
 type Goal125,type Modifier125,type DialogueState125} from './phase125_compositional_dialogue_frame.js';
import {decideDialogue126,processReply126,type Pending126,type Reply126,
 type DialogueDecision126,type MaterialAmbiguity126,type PreferencePrompt126} from './phase126_conversational_clarification_policy.js';
import type {Reading111} from './phase111_long_context_and_query_ambiguity.js';

const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const ident=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_]{0,80}$/.test(s);
const unique=<T>(xs:readonly T[]):T[]=>[...new Set(xs)];
const normalize=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^a-z0-9]+/g,' ').trim();
function phrase(haystack:string,needle:string):boolean{
 const n=normalize(needle);return !!n&&(' '+normalize(haystack)+' ').includes(' '+n+' ');
}
export interface Meaning127 {readingId:string;interpretationCode:string;labelIt:string;labelEn:string;
 /** Domain definition: does NOT assert any product can perform it. */
 absoluteConstraintId:string;}
export interface ReviewedAmbiguity127 {issueCode:string;categoryId:string;schemaReviewId:string;
 triggers:readonly string[];questionIt:string;questionEn:string;
 meanings:readonly Meaning127[];allowComparison:boolean;}
export interface Projection127 {readingId:string;topVariantId:string|null;
 eligibleVariantIds:readonly string[];evidenceGaps:readonly string[];}
/** A separate evidence-reviewer MUST verify these projections against original source data.
 * This module only checks consistency, not whether the reviewer told the truth. */
export interface ReviewedImpact127 {issueCode:string;categoryId:string;schemaReviewId:string;
 evidenceSnapshotId:string;reviewerId:string;projections:readonly Projection127[];}
export interface SessionValue127 {aspectId:string;role:Modifier125;originTurnId:string;
  status:'candidate'|'confirmed';}
export interface ConversationSession127 {phase:127;sessionId:string;revision:number;
 categoryId:string|null;categoryVerified:boolean;lastTurnId:string|null;
 goals:readonly Goal125[];values:readonly SessionValue127[];
 budget:Composition125['userBudget'];pending:Pending126|null;
 knownReadings:Readonly<Record<string,string>>;
 /** Choices elicited using Phase100 swing comparisons; scoped, not product facts. */
 swingPreferences:readonly {firstCriterionId:string;secondCriterionId:string;
  preferenceValue:'first_more_important'|'second_more_important'|'equally_important';originTurnId:string}[];
 pendingSwing: {firstCriterionId:string;secondCriterionId:string}|null;
 askedIssueCodes:readonly string[];comparisonsRequested:readonly string[];
 /** Turn ids for replay protection; each event has an immutable semantic audit digest. */
 history:readonly {turnId:string;eventKind:string;eventSha256:string}[];
 candidateIds:readonly string[];candidatesVerified:boolean;rankingAuthorized:false;}
export interface Turn127 {turnId:string;question:string;language:'it'|'en';
 evidence:'not_assessed'|'needs_acquisition'|'reviewed_sufficient';
 schema:CategorySchema125;ambiguities?:readonly ReviewedAmbiguity127[];
 impactReviews?:readonly ReviewedImpact127[];preference?:PreferencePrompt126;}
export interface TurnResult127 {session:ConversationSession127;frame:Composition125;
 decision:DialogueDecision126;detectedIssues:readonly string[];
 impactStatus:'not_applicable'|'needs_original_evidence'|'reviewed_material_or_immaterial';
 rankingAuthorized:false;}
export function newSession127(sessionId:string):ConversationSession127{
 if(!ident(sessionId))throw Error('invalid_session_id');
 return {phase:127,sessionId,revision:0,categoryId:null,categoryVerified:false,lastTurnId:null,
  goals:[],values:[],budget:null,pending:null,knownReadings:{},askedIssueCodes:[],
  comparisonsRequested:[],swingPreferences:[],pendingSwing:null,history:[],candidateIds:[],candidatesVerified:false,
  rankingAuthorized:false};
}
function validSession(s:ConversationSession127){
 if(!s||s.phase!==127||!ident(s.sessionId)||!Number.isInteger(s.revision)||s.revision<0||
  s.rankingAuthorized!==false||!Array.isArray(s.history)||s.history.length!==s.revision||
  !Array.isArray(s.values)||!Array.isArray(s.goals)||!Array.isArray(s.askedIssueCodes)||
  !Array.isArray(s.comparisonsRequested)||!Array.isArray(s.candidateIds)||
  !Array.isArray(s.swingPreferences)||
  s.history.some(e=>!ident(e.turnId)||!e.eventKind||!/^([0-9a-f]{64})$/.test(e.eventSha256))||
  new Set(s.history.map(x=>x.turnId)).size!==s.history.length)throw Error('invalid_conversation_state');
}
function append(s:ConversationSession127,turnId:string,kind:string,payload:unknown):ConversationSession127{
 if(!ident(turnId)||s.history.some(x=>x.turnId===turnId))throw Error('replayed_or_invalid_turn');
 const entry={turnId,eventKind:kind,eventSha256:hash(JSON.stringify({turnId,kind,payload,prev:
   s.history.at(-1)?.eventSha256??null}))};
 return {...s,revision:s.revision+1,lastTurnId:turnId,history:[...s.history,entry]};
}
function validAmbiguity(a:ReviewedAmbiguity127){
 if(!ident(a.issueCode)||!ident(a.categoryId)||!a.schemaReviewId||
  !a.triggers.length||a.triggers.some(x=>!x||x.length>100)||
  a.meanings.length<2||a.meanings.length>4||
  a.meanings.some(m=>!ident(m.readingId)||!ident(m.interpretationCode)||
   !ident(m.absoluteConstraintId)||!m.labelIt||!m.labelEn)||
  unique(a.meanings.map(m=>m.readingId)).length!==a.meanings.length||
  !a.questionIt||!a.questionEn)throw Error('invalid_reviewed_ambiguity_schema');
}
export function discoverCandidateIssues127(frame:Composition125,rawText:string,
 definitions:readonly ReviewedAmbiguity127[]):readonly ReviewedAmbiguity127[]{
 if(!Array.isArray(definitions)||definitions.length>100)throw Error('invalid_ambiguity_registry');
 definitions.forEach(validAmbiguity);
 if(unique(definitions.map(x=>x.categoryId+':'+x.issueCode)).length!==definitions.length)
   throw Error('duplicate_ambiguity_issue');
 return definitions.filter(x=>x.categoryId===frame.categoryId&&
   x.triggers.some((t:string)=>phrase(rawText,t))).sort((a,b)=>a.issueCode.localeCompare(b.issueCode));
}
function makeReviewedAlternative127(a:ReviewedAmbiguity127,review:ReviewedImpact127|undefined,
 lang:'it'|'en',turnId:string):MaterialAmbiguity126|null{
 if(!review)return null;
 if(!ident(review.issueCode)||review.issueCode!==a.issueCode||review.categoryId!==a.categoryId||
  review.schemaReviewId!==a.schemaReviewId||!ident(review.evidenceSnapshotId)||
  !ident(review.reviewerId)||review.projections.length!==a.meanings.length||
  unique(review.projections.map(p=>p.readingId)).length!==review.projections.length||
  review.projections.some(p=>!a.meanings.some(m=>m.readingId===p.readingId)||
   p.eligibleVariantIds.some(v=>!ident(v))||unique(p.eligibleVariantIds).length!==p.eligibleVariantIds.length||
   p.evidenceGaps.some(v=>!ident(v))||
   (p.topVariantId!==null&&(!ident(p.topVariantId)||!p.eligibleVariantIds.includes(p.topVariantId)))))
  throw Error('unverified_or_misaligned_impact_review');
 const readings:Reading111[]=a.meanings.map(m=>{
  const p=review.projections.find(p=>p.readingId===m.readingId)!;
  return {readingId:m.readingId,interpretationCode:m.interpretationCode,
   topVariantId:p.topVariantId,eligibleVariantIds:[...p.eligibleVariantIds],
   absoluteConstraints:[m.absoluteConstraintId],relativePreferences:[],
   evidenceGaps:[...p.evidenceGaps]};
 });
 const choices=a.meanings.map(m=>lang==='it'?m.labelIt:m.labelEn);
 return {reviewed:{requestId:'req_'+hash(turnId+':'+a.issueCode).slice(0,22),
    inspection:'alternative_meanings_checked',readings,
    issues:[{issueCode:a.issueCode,kind:'meaning',question:lang==='it'?a.questionIt:a.questionEn,
     options:choices}]},
   options:a.meanings.map((m,i)=>({label:choices[i],choiceId:m.readingId,
    readingId:m.readingId})),allowComparison:a.allowComparison};
}
/** The caller owns review of the schema and of evidence projections. No network or LLM dependency. */
export function advanceConversation127(previous:ConversationSession127,input:Turn127):TurnResult127{
 validSession(previous);
 if(!ident(input.turnId)||previous.history.some(e=>e.turnId===input.turnId)||
  !input.question||input.question.length>4000||
  !['it','en'].includes(input.language)||!['not_assessed','needs_acquisition','reviewed_sufficient'].includes(input.evidence))
  throw Error('invalid_turn');
 if(previous.pending)throw Error('pending_reply_requires_resolution');
 if(input.schema.id!==previous.categoryId&&previous.categoryId&&previous.categoryVerified){
  // Explicit switch of domain requires a fresh scoped conversation; never leak old constraints.
  // A new session is valid. A history-specific category change is not silently accepted.
  if(!phrase(input.question,input.schema.aliases[0]||''))throw Error('category_context_mismatch');
 }
 const useContext:DialogueState125={categoryId:previous.categoryId??undefined,
  categoryVerified:previous.categoryVerified,candidates:previous.candidateIds,
  candidatesVerified:previous.candidatesVerified,confirmedGoals:previous.goals,
  contextTurnId:previous.lastTurnId??undefined};
 const frame=composeQuestion125(input.question,[input.schema],useContext);
 const domainChange=previous.categoryId!==null&&frame.categoryId!==previous.categoryId;
 const candidates=discoverCandidateIssues127(frame,input.question,input.ambiguities||[])
  .filter(a=>!previous.knownReadings[a.issueCode]);
 const first=candidates[0];
 const chosen=first?makeReviewedAlternative127(first,(input.impactReviews||[])
  .find(r=>r.issueCode===first.issueCode),input.language,input.turnId):null;
 // If domain ambiguity is recognized but no independently reviewed product impact exists,
 // forbid improvising a 'material' question. Research is the only responsible next step.
 let decision:DialogueDecision126;
 if(first&&!chosen){
  decision={phase:126,action:'investigate_interpretations',reason:'needs_independent_impact_evidence',
   pending:null,nextSteps:['review_alternative_eligibility_and_outcomes'],rankingAuthorized:false,
   originalEvidenceAuthenticated:false,meaningConfirmed:false};
 }else{
  const alreadySwing=input.preference && previous.swingPreferences.some(v=>
     v.firstCriterionId===input.preference?.question.firstCriterionId&&
     v.secondCriterionId===input.preference?.question.secondCriterionId);
  decision=decideDialogue126({turnId:input.turnId,frame,evidence:input.evidence,
   ambiguity:chosen??undefined,preference:alreadySwing?undefined:input.preference,
   alreadyAskedIssueCodes:domainChange?[]:previous.askedIssueCodes,language:input.language});
 }
 // New statements can override same aspect, but unreviewed contradictions are never committed.
 const nextValues=domainChange?[]:[...previous.values];
 if(!frame.hazards.some(h=>['contradictory_aspect_polarity','unbound_negation',
  'logical_scope_needs_review','negation_modality_needs_review'].includes(h))){
  for(const a of frame.aspects){
   const idx=nextValues.findIndex(x=>x.aspectId===a.aspectId);
   const v:SessionValue127={aspectId:a.aspectId,role:a.role,originTurnId:input.turnId,status:'candidate'};
   if(idx>=0)nextValues.splice(idx,1);
   nextValues.push(v);
  }
 }
 const goals=unique([...(domainChange?[]:previous.goals),...frame.goals]).sort();
 const asked=decision.pending?.questionIssueCode?unique([...previous.askedIssueCodes,
  decision.pending.questionIssueCode]):[...previous.askedIssueCodes];
 const updated=append({...previous,categoryId:frame.categoryId,categoryVerified:frame.categoryFrom==='explicit'||
  (previous.categoryVerified&&!domainChange),values:nextValues,goals,budget:frame.userBudget??
  (domainChange?null:previous.budget),pending:decision.pending,askedIssueCodes:asked,
  knownReadings:domainChange?{}:previous.knownReadings,
  comparisonsRequested:domainChange?[]:previous.comparisonsRequested,
  swingPreferences:domainChange?[]:previous.swingPreferences,
  pendingSwing:decision.pending?.kind==='swing_preference'&&input.preference?{
   firstCriterionId:input.preference.question.firstCriterionId,
   secondCriterionId:input.preference.question.secondCriterionId}:null,
  candidateIds:domainChange?[]:previous.candidateIds,
  candidatesVerified:domainChange?false:previous.candidatesVerified},input.turnId,'question',{
   questionSha256:frame.questionSha256,action:decision.action,issue:first?.issueCode??null});
 return {session:updated,frame,decision,detectedIssues:candidates.map(a=>a.issueCode),
  impactStatus:!first?'not_applicable':!chosen?'needs_original_evidence':
    'reviewed_material_or_immaterial',rankingAuthorized:false};
}
export interface ReplyResult127 {session:ConversationSession127;
 outcome:'reading_confirmed'|'scenario_comparison_requested'|'swing_preference_confirmed'|
 'free_text_needs_interpretation'|'skipped'|'invalid_choice';next:'resume_research'|'compare_scenarios'|
 'interpret_free_text'|'investigate_interpretations';rankingAuthorized:false;}
export function resolveConversationReply127(previous:ConversationSession127,reply:Reply126):ReplyResult127{
 validSession(previous);if(!previous.pending)throw Error('no_pending_question');
 if(previous.history.at(-1)?.turnId!==previous.pending.turnId)throw Error('stale_pending_question');
 const receipt=processReply126(previous.pending,reply);
 const known={...previous.knownReadings};
 const compare=[...previous.comparisonsRequested];
 const swing=[...previous.swingPreferences];
 if(receipt.outcome==='reading_confirmed'&&receipt.confirmedReadingId&&
    previous.pending.questionIssueCode)known[previous.pending.questionIssueCode]=receipt.confirmedReadingId;
 if(receipt.outcome==='scenario_comparison_requested'&&previous.pending.questionIssueCode)
  compare.push(previous.pending.questionIssueCode);
 if(receipt.outcome==='swing_preference_confirmed'&&receipt.preferenceValue&&previous.pendingSwing)
  swing.push({...previous.pendingSwing,preferenceValue:receipt.preferenceValue,
   originTurnId:reply.answerTurnId});
 const next=append({...previous,pending:null,pendingSwing:null,knownReadings:known,
  swingPreferences:swing,comparisonsRequested:unique(compare)},reply.answerTurnId,'clarification_reply',{
   questionId:receipt.questionId,outcome:receipt.outcome,
   reading:receipt.confirmedReadingId,freeTextHash:receipt.newUserText?hash(receipt.newUserText):null});
 return {session:next,outcome:receipt.outcome,
  next:receipt.outcome==='free_text_needs_interpretation'?'interpret_free_text':
   receipt.outcome==='scenario_comparison_requested'?'compare_scenarios':
   receipt.outcome==='reading_confirmed'||receipt.outcome==='swing_preference_confirmed'?
   'resume_research':'investigate_interpretations',rankingAuthorized:false};
}

/** Data produced by the UI/product-evidence layer after showing an authenticated candidate set;
 * caller assertion is checked structurally but NOT cryptographically authenticated here. */
export function registerPresentedCandidates127(previous:ConversationSession127,
 event:{turnId:string;categoryId:string;candidateIds:readonly string[];
 sourceSnapshotId:string;presentedToUser:true}):ConversationSession127{
 validSession(previous);
 if(previous.pending||event.presentedToUser!==true||!ident(event.sourceSnapshotId)||
  event.categoryId!==previous.categoryId||event.candidateIds.length<2||
  event.candidateIds.length>100||event.candidateIds.some(x=>!ident(x))||
  unique(event.candidateIds).length!==event.candidateIds.length)
  throw Error('candidate_set_not_grounded');
 return append({...previous,candidateIds:[...event.candidateIds].sort(),candidatesVerified:true},
  event.turnId,'presented_candidates',{category:event.categoryId,
    candidates:[...event.candidateIds].sort(),sourceSnapshotId:event.sourceSnapshotId});
}
/** Explicit reviewed user correction; never infer a new reading from the text automatically. */
export function correctMeaning127(previous:ConversationSession127,
 event:{turnId:string;definition:ReviewedAmbiguity127;readingId:string;
 userConfirmed:true}):ConversationSession127{
 validSession(previous);validAmbiguity(event.definition);
 if(previous.pending||event.userConfirmed!==true||
  previous.categoryId!==event.definition.categoryId||
  !event.definition.meanings.some(m=>m.readingId===event.readingId)||
  !previous.knownReadings[event.definition.issueCode])throw Error('unverified_meaning_correction');
 const before=previous.knownReadings[event.definition.issueCode];
 return append({...previous,knownReadings:{...previous.knownReadings,
  [event.definition.issueCode]:event.readingId}},event.turnId,'meaning_correction',{
   issueCode:event.definition.issueCode,before,after:event.readingId});
}
/** User can interrupt an open question; this does not confirm or delete the original need. */
export function dismissPending127(previous:ConversationSession127,
 event:{turnId:string;reason:'new_topic'|'not_now'}):ConversationSession127{
 validSession(previous);
 if(!previous.pending||!['new_topic','not_now'].includes(event.reason))
   throw Error('no_pending_to_dismiss');
 return append({...previous,pending:null,pendingSwing:null},event.turnId,'pending_dismissal',{
   questionId:previous.pending.id,reason:event.reason});
}
/** Query-state projection only, NOT canonical evidence and never a verified user intent by itself. */
export function contextSnapshot127(session:ConversationSession127){
 validSession(session);
 return {categoryId:session.categoryId,categoryVerified:session.categoryVerified,
  candidateGoals:[...session.goals],candidateConstraints:session.values.map(v=>({...v})),
  confirmedReadings:{...session.knownReadings},swingPreferences:[...session.swingPreferences],
  budgetCandidate:session.budget,
  candidateIds:session.candidatesVerified?[...session.candidateIds]:[],
  rankingAuthorized:false as const};
}

/** User-confirmed budget correction scoped to this dialogue. An explicit event
 * is needed because simply parsing "price doesn't matter" is not permission
 * to discard a previously stated numerical hard constraint. */
export function reviseSessionBudget127(previous:ConversationSession127,
 event:{turnId:string;newBudget:Composition125['userBudget'];userConfirmed:true;}):ConversationSession127{
 validSession(previous);
 if(previous.pending||event.userConfirmed!==true||
   (event.newBudget!==null&&(!['GBP','EUR','USD'].includes(event.newBudget.currency)||
   !Number.isFinite(event.newBudget.max)||event.newBudget.max!<=0||
   (event.newBudget.min!==null&&(!Number.isFinite(event.newBudget.min)||
   event.newBudget.min<0||event.newBudget.min>event.newBudget.max!)))))
   throw Error('invalid_confirmed_budget_revision');
 return append({...previous,budget:event.newBudget},event.turnId,'confirmed_budget_revision',
  {previous:previous.budget,newBudget:event.newBudget});
}
