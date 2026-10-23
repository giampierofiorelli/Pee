/** Phase164 — executable, category-aware user-request journey.
 * Reuses reviewed-category projections from 128 and bounded dialogue 125–127.
 * This is NOT a general NLP semantic-equivalence engine. Source review receipts are
 * structurally validated upstream, not independently authenticated in this process.
 * All outputs are hypotheses/research actions; no product ranking or factual approval.
 */
import {createHash} from 'node:crypto';
import {compileCategoryKnowledge128,type CategoryBrain128} from './phase128_category_cognition_dialogue_bridge.js';
import {advanceConversation127,newSession127,registerPresentedCandidates127,reviseSessionBudget127,
 type ConversationSession127,type TurnResult127} from './phase127_stateful_clarification.js';
import {retrieveComposedCandidates125,type Composition125} from './phase125_compositional_dialogue_frame.js';
import type {IndexedPassage122} from './phase122_native_local_retrieval.js';
import {planCategoryCapabilities,type CategoryIdentity} from './category_cognitive_mesh.js';
import {auditRequestContext165,type RequestContextAudit165} from './phase165_request_context_audit.js';

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const ident=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_]{0,80}$/.test(s);
const normalize=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const whole=(text:string,alias:string)=>(' '+normalize(text)+' ').includes(' '+normalize(alias)+' ');
export type RequestAction164='resolve_category'|'resolve_category_collision'|'ask_one_question'|
 'review_meaning'|'research_requested_outcomes'|'research_candidate_sources'|
 'resume_pending_question'|'invalidate_changed_category_schema'|'budget_revision_confirmed'|'budget_revision_declined'|
 'research_unreviewed_category';
export interface RequestSession164 {
 phase:164;sessionId:string;revision:number;epoch:number;
 activeCategoryId:string|null;categorySnapshot:string|null;
 sourcePreference:'independent_professional_only'|'not_specified';
 dialogue:ConversationSession127|null;
 pendingBudgetRevision:{questionTurnId:string;categoryId:string}|null;
 history:readonly {turnId:string;questionSha256:string;categoryId:string|null;
  action:RequestAction164;eventSha256:string}[];
 rankingAuthorized:false;
}
export interface RequestOutput164 {
 phase:164;turnId:string;requestSha256:string;action:RequestAction164;
 categoryId:string|null;candidateResearchCategoryId:string|null;categoryProvenance:'explicit'|'scoped_followup'|'unresolved';
 matchedCategoryAliases:readonly {categoryId:string;alias:string}[];
 frame:Composition125|null;
 contextAudit165:RequestContextAudit165|null;
 dialogueDecision:TurnResult127['decision']|null;
 extraction: {aspects:readonly {aspectId:string;role:string;matchedText:string}[];
  goals:readonly string[];goalOrigin:'current_turn'|'prior_turn_candidate'|'unresolved';
  budgetCandidate:Composition125['userBudget'];
  inheritedCandidateConstraints:readonly {aspectId:string;role:string;originTurnId:string}[]}|null;
 sourcePreference:'independent_professional_only'|'not_specified';
 unhandledConstraintPhrases:readonly string[];
 research: {obligations:readonly string[];candidatePassageIds:readonly string[];
  rightsAssertionIsProof:false;retrievalIsEvidence:false;sourceFactsApproved:false;
  newCategoryTasks:readonly {capability:string;status:string}[]};
 reasons:readonly string[];
 questionToUser:string|null;userNeedsToRunComputer:false;
 sourceMeasurementsVerified:false;publicRecommendationAuthorized:false;rankingAuthorized:false;
 session:RequestSession164;
}
export function newRequestSession164(sessionId:string):RequestSession164{
 if(!ident(sessionId))throw Error('invalid_request_session');
 return {phase:164,sessionId,revision:0,epoch:0,activeCategoryId:null,categorySnapshot:null,
  dialogue:null,sourcePreference:'not_specified',pendingBudgetRevision:null,history:[],rankingAuthorized:false};
}
function validSession(s:RequestSession164){
 if(!s||s.phase!==164||!ident(s.sessionId)||s.rankingAuthorized!==false||
  !Number.isSafeInteger(s.revision)||s.revision<0||s.revision>1000||
  !Number.isSafeInteger(s.epoch)||s.epoch<0||!Array.isArray(s.history)||
  s.history.length!==s.revision||new Set(s.history.map(x=>x.turnId)).size!==s.history.length||
  s.history.some((x,i)=>!ident(x.turnId)||!/^[0-9a-f]{64}$/.test(x.questionSha256)||
  !/^[0-9a-f]{64}$/.test(x.eventSha256)||
  x.eventSha256!==sha(JSON.stringify({turnId:x.turnId,questionSha256:x.questionSha256,
    categoryId:x.categoryId,action:x.action,previous:i?s.history[i-1].eventSha256:null})))||
  (!!s.activeCategoryId&&!ident(s.activeCategoryId))||
  (s.categorySnapshot!==null&&!/^[0-9a-f]{64}$/.test(s.categorySnapshot))||
  (!['independent_professional_only','not_specified'].includes(s.sourcePreference))||
  (!!s.dialogue&&s.dialogue.categoryId!==s.activeCategoryId)||
  (!!s.pendingBudgetRevision&&(!ident(s.pendingBudgetRevision.questionTurnId)||
    s.pendingBudgetRevision.categoryId!==s.activeCategoryId||!s.dialogue?.budget)))throw Error('invalid_or_tampered_request_session');
}
function record(s:RequestSession164,turnId:string,text:string,categoryId:string|null,
 action:RequestAction164):RequestSession164{
 if(!ident(turnId)||s.history.some(x=>x.turnId===turnId))throw Error('replayed_or_invalid_request_turn');
 const questionSha256=sha(text);
 const eventSha256=sha(JSON.stringify({turnId,questionSha256,categoryId,action,
  previous:s.history.at(-1)?.eventSha256??null}));
 return {...s,revision:s.revision+1,history:[...s.history,{turnId,questionSha256,categoryId,action,eventSha256}]};
}
function explicitCategories(question:string,catalog:readonly {categoryId:string;aliases:readonly string[]}[]){
 // Resolve category terms by OCCURRENCE, not only by alias vocabulary. E.g.
 // "air fryer" contains "fryer", but "air fryer AND fryer" mentions two.
 const norm=normalize(question);
 const spans=catalog.flatMap(c=>c.aliases.flatMap(alias=>{
  const term=normalize(alias);const found:{categoryId:string;alias:string;start:number;end:number}[]=[];
  let cursor=0;
  while(term&&cursor<norm.length){
   const i=norm.indexOf(term,cursor);if(i<0)break;
   cursor=i+term.length;
   if((i===0||norm[i-1]===' ')&&(cursor===norm.length||norm[cursor]===' '))
    found.push({categoryId:c.categoryId,alias,start:i,end:cursor});
  }
  return found;
 }));
 const maximal=spans.filter(a=>!spans.some(b=>b.categoryId!==a.categoryId&&
  b.start<=a.start&&b.end>=a.end&&(b.start<a.start||b.end>a.end)));
 return maximal.sort((a,b)=>a.categoryId.localeCompare(b.categoryId)||a.start-b.start||a.alias.localeCompare(b.alias));
}
function isScopedFollowup(question:string):boolean{
 const q=normalize(question);
 return /^(and |but |what if |what about |how about |instead |which one|which of |of those|and if |if |or |same |also |then |e se |e invece |ma |tra questi|quale dei|e per )/.test(q)
  || /\b(?:those|these|them|compared to the previous|same ones|the two models|under £|under \$|under €|only expert reviews|no customer reviews|no user reviews)\b/.test(question.toLowerCase());
}
function sourcePreference(question:string):RequestOutput164['sourcePreference']{
 return /\b(?:no (?:user|customer|amazon) reviews|not (?:user|customer) reviews|only (?:expert|professional|independent) (?:reviews|tests|sources)|experts? only|independent (?:lab|laboratory) tests only)\b/i.test(question)?
  'independent_professional_only':'not_specified';
}
function residualConstraintPhrases(question:string,frame:Composition125|null):string[]{
 if(!frame)return [];
 const n=normalize(question);
 const known=[...frame.aspects.map(x=>normalize(x.matchedText)),
  ...frame.unknownCapabilitySpans.map(normalize)];
 // These phrases are NOT interpreted as resolved. Retain as explicit research
 // obligations instead of pretending that a recognised "best" captures them.
 const out:string[]=[];
 for(const match of n.matchAll(/\b(?:for|with|without|must have|must not have|needs to|that can|what about|how about|prioritize|especially)\s+([^.,;!?]{2,100})/g)){
  const chunks=match[1].split(/\b(?:and|but|or|also|instead of|under|below)\b/g).map(x=>x.trim()).filter(Boolean);
  for(const rawChunk of chunks){
   const chunk=rawChunk.replace(/\b(?:no customer reviews|no user reviews|no amazon reviews|only expert reviews|only professional reviews|experts only)\b/g,'').trim();
   if(!chunk)continue;
   if(known.some(x=>whole(chunk,x)||whole(x,chunk))||
    /^(?:a |an |the )?(?:best|better|worst|value|price|money|experts?|professional|independent|only expert|user reviews)/.test(chunk)||
    /^\d+ (?:person|people)$/.test(chunk)||
    /^(?:under |below )?(?:gbp|usd|eur)? ?\d+$/.test(chunk))continue;
   out.push(chunk.slice(0,100));
  }
 }
 return [...new Set(out)].slice(0,8).sort();
}
function errorReasons(frame:Composition125|null,compiled?:ReturnType<typeof compileCategoryKnowledge128>){
 return [...new Set([...(frame?.hazards??[]),
  ...(compiled?.knowledgeGaps.qualityMethods.length?['reviewed_quality_method_gaps']:[]),
  ...(compiled?.knowledgeGaps.pendingConceptIds.length?['pending_category_concepts']:[]),
  'no_verified_original_product_comparison'])].sort();
}
export function advanceUserRequest164(previous:RequestSession164,input:{
 turnId:string;question:string;language:'en'|'it';brains:readonly CategoryBrain128[];
 passages?:readonly IndexedPassage122[];evidence?:'not_assessed'|'needs_acquisition'|'reviewed_sufficient';
 researchCatalog?:readonly CategoryIdentity[];catalogAsOf?:string;
}):RequestOutput164{
 validSession(previous);
 if(previous.history.some(x=>x.turnId===input.turnId))throw Error('replayed_or_invalid_request_turn');
 if(!ident(input.turnId)||
  typeof input.question!=='string'||input.question.trim().length<3||input.question.length>4000||
  !['en','it'].includes(input.language)||!Array.isArray(input.brains)||input.brains.length>80||
  (input.evidence&& !['not_assessed','needs_acquisition','reviewed_sufficient'].includes(input.evidence))||
  (input.researchCatalog!==undefined&&(!Array.isArray(input.researchCatalog)||
   input.researchCatalog.length>1000||!input.catalogAsOf)))
  throw Error('invalid_user_request');
 const compiled=input.brains.map(compileCategoryKnowledge128);
 if(new Set(compiled.map(x=>x.categoryId)).size!==compiled.length)throw Error('duplicate_category_brain');
 const reviewedEntries=compiled.map(c=>({categoryId:c.categoryId,aliases:c.schema.aliases}));
 const researchEntries=(input.researchCatalog??[]).filter(c=>c.status==='research')
  .map(c=>({categoryId:c.categoryId,aliases:[c.label,...c.aliases]}));
 if(researchEntries.some(r=>reviewedEntries.some(c=>c.categoryId===r.categoryId)))
  throw Error('unreviewed_and_reviewed_category_id_collision');
 const matches=explicitCategories(input.question,[...reviewedEntries,...researchEntries]);
 const categoryIds=[...new Set(matches.map(m=>m.categoryId))];
 const selected=categoryIds.length===1?compiled.find(c=>c.categoryId===categoryIds[0]):undefined;
 const discoveredResearch=matches.filter(m=>researchEntries.some(c=>c.categoryId===m.categoryId));
 const researchIds=[...new Set(discoveredResearch.map(x=>x.categoryId))];
 const researchMatch=categoryIds.length===1&&researchIds.length===1?
  input.researchCatalog?.find(c=>c.categoryId===researchIds[0]):undefined;
 const context=!categoryIds.length&&!researchMatch&&previous.activeCategoryId&&isScopedFollowup(input.question)?
  compiled.find(c=>c.categoryId===previous.activeCategoryId):undefined;
 const active=selected??context;
 const aliasMatches=matches.map(({categoryId,alias})=>({categoryId,alias}));
 const from=selected?'explicit':context?'scoped_followup':'unresolved';
 const newCategory=!!active&&active.categoryId!==previous.activeCategoryId;
 const changed=!!active&&!newCategory&&previous.categorySnapshot!==null&&
  previous.categorySnapshot!==active.ontologySnapshot;
 const budgetReversal=!!active&&!newCategory&&!previous.pendingBudgetRevision&&!!previous.dialogue?.budget&&
  /\b(?:price (?:doesn'?t|does not) matter|no budget limit|budget (?:is )?unlimited|forget (?:the|my) budget|regardless of price|money is no object)\b/i.test(input.question);
 const unresolved:RequestAction164=categoryIds.length>1?
  'resolve_category_collision':'resolve_category';
 let action:RequestAction164=unresolved;
 let frame:Composition125|null=null;let decision:TurnResult127['decision']|null=null;
 let userQuestion:string|null=null;let dialogue=previous.dialogue;
 let next:RequestSession164=previous;
 let retrieved:readonly string[]=[];
 let residual:readonly string[]=[];
 let inheritedGoalCandidate=false;
 let contextAudit165:RequestContextAudit165|null=null;
 let newCategoryTasks:readonly {capability:string;status:string}[]=[];
 const explicitSourcePref=sourcePreference(input.question);
 const sourcePref=explicitSourcePref==='independent_professional_only'?explicitSourcePref:
  !newCategory&&active?previous.sourcePreference:'not_specified';
 if(changed){
  action='invalidate_changed_category_schema';
 }else if(researchMatch){
  const plan=planCategoryCapabilities({label:researchMatch.label,
   catalog:input.researchCatalog!,asOf:input.catalogAsOf!});
  newCategoryTasks=plan.tasks.map(t=>({capability:t.capability,status:t.status}));
  action='research_unreviewed_category';
  next={...next,activeCategoryId:null,dialogue:null,categorySnapshot:null,
   sourcePreference:'not_specified',pendingBudgetRevision:null};
 }else if(budgetReversal){
  next={...next,pendingBudgetRevision:{questionTurnId:input.turnId,categoryId:active!.categoryId}};
  // A revision is not silently ignored and is not silently applied to the
  // earlier budget; it requires a scoped correction event.
  action='review_meaning';
  userQuestion=input.language==='it'?'Vuoi eliminare il limite di spesa precedente?':
   'Do you want to remove your previous budget limit?';
 }else if(previous.pendingBudgetRevision&&!newCategory){
  action='resume_pending_question';
  userQuestion=input.language==='it'?'Vuoi eliminare il limite di spesa precedente?':
   'Do you want to remove your previous budget limit?';
 }else if(active){
  // A domain switch creates a fresh context epoch; preferences from a previous
  // product family MUST NOT become requirements for another one.
  const original=newCategory||!dialogue?newSession127(previous.sessionId+'_e'+(previous.epoch+1)):dialogue;
  if(original.pending){action='resume_pending_question';userQuestion=original.pending.question;}
  else{
   const advanced=advanceConversation127(original,{turnId:input.turnId,question:input.question,
    language:input.language,evidence:input.evidence??'needs_acquisition',
    schema:active.schema,ambiguities:active.ambiguities});
   dialogue=advanced.session;frame=advanced.frame;decision=advanced.decision;
   // Reuse the already ported Phase154 context graph before storing user
   // requirements. If polarity or mandatory strength may be lost, preserve the
   // previous dialogue rather than contaminating its candidate preferences.
   if(input.language==='en')contextAudit165=auditRequestContext165(input.question,active.schema,frame);
   const unsafeScope=contextAudit165?.requiresReview===true;
   if(unsafeScope)dialogue=newCategory?null:previous.dialogue;
   else if(contextAudit165?.candidateCorrections.length){
    // Explicit bounded language patterns can repair candidate preferences;
    // they cannot certify the user's meaning or any product ranking.
    const corrected=[...advanced.session.values];
    for(const correction of contextAudit165.candidateCorrections){
     const k=corrected.findIndex(v=>v.aspectId===correction.aspectId);
     if(k>=0)corrected.splice(k,1);
     if(correction.effect!=='set_optional')corrected.push({
      aspectId:correction.aspectId,originTurnId:input.turnId,status:'candidate',
      role:correction.effect==='set_required'?'required':'excluded'});
    }
    dialogue={...advanced.session,values:corrected};
   }
   residual=residualConstraintPhrases(input.question,frame);
   inheritedGoalCandidate=from==='scoped_followup'&&!frame.goals.length&&
    previous.dialogue!==null&&previous.dialogue.goals.length>0&&
    frame.hazards.every(h=>h==='unresolved_decision_goal');
   action=unsafeScope?'review_meaning':decision.action==='ask_one_question'?'ask_one_question':
    residual.length?'review_meaning':
    inheritedGoalCandidate?'research_requested_outcomes':
    frame.status==='requires_context'?'resolve_category':
    frame.status==='requires_semantic_review'||decision.action==='investigate_interpretations'?
    'review_meaning':decision.action==='ready_for_evidence_review'?
    'research_candidate_sources':'research_requested_outcomes';
   userQuestion=unsafeScope?
    'I may have misunderstood a requirement or exclusion. Could you clarify what is essential, optional or unwanted?':
    decision.pending?.question??null;
   // IndexedPassage122 has no independently verified editorial role. Its
   // rightsReviewed bit alone does NOT prove professional/independent status.
   if(!unsafeScope&&frame.status==='candidate_needs_evidence'&&!residual.length&&
      sourcePref!=='independent_professional_only'&&input.passages){
    const r=retrieveComposedCandidates125(frame,input.question,input.passages);
    retrieved=r.hits.map(x=>x.passageId);
   }
   next={...next,dialogue,activeCategoryId:active.categoryId,
    categorySnapshot:active.ontologySnapshot,epoch:newCategory||!previous.dialogue?previous.epoch+1:previous.epoch,
    pendingBudgetRevision:newCategory?null:previous.pendingBudgetRevision,
    sourcePreference:sourcePref};
  }
 }
 if((!active||changed)&&!budgetReversal&&!researchMatch)userQuestion=changed?null:input.language==='it'?
  categoryIds.length>1?'Quale categoria vuoi confrontare?':'Di quale categoria di prodotto stiamo parlando?':
  categoryIds.length>1?'Which product category do you mean?':'Which product category are you looking for?';
 next=record(next,input.turnId,input.question,active?.categoryId??null,action);
 const effectiveFrame=frame;
 return {phase:164,turnId:input.turnId,requestSha256:sha(input.question),action,
  categoryId:active?.categoryId??null,candidateResearchCategoryId:researchMatch?.categoryId??null,
  categoryProvenance:from,matchedCategoryAliases:aliasMatches,
  frame:effectiveFrame,contextAudit165,dialogueDecision:decision,
  extraction:effectiveFrame?{aspects:effectiveFrame.aspects.map(a=>{
   const correction=contextAudit165?.candidateCorrections.find(c=>c.aspectId===a.aspectId);
   return {aspectId:a.aspectId,
    role:correction?.effect==='set_optional'?'optional':
     correction?.effect==='set_required'?'required':correction?.effect==='set_excluded'?'excluded':a.role,
    baselineCandidateRole:a.role,matchedText:a.matchedText,
    correctedCandidateRole:correction?.effect??null};
  }),
   goals:inheritedGoalCandidate?[...(previous.dialogue?.goals??[])]:[...effectiveFrame.goals],
   goalOrigin:inheritedGoalCandidate?'prior_turn_candidate':effectiveFrame.goals.length?'current_turn':'unresolved',
   budgetCandidate:effectiveFrame.userBudget,
   inheritedCandidateConstraints:(dialogue?.values??[]).filter(x=>x.originTurnId!==input.turnId)
    .map(x=>({aspectId:x.aspectId,role:x.role,originTurnId:x.originTurnId}))}:null,
  sourcePreference:sourcePref,unhandledConstraintPhrases:residual,
  research:{obligations:[...new Set([...(effectiveFrame?.evidenceObligations??[]).filter(k=>
   !(contextAudit165?.candidateCorrections??[]).some(c=>{
    if(c.effect!=='set_optional')return false;
    return active?.schema.aspects.find(a=>a.id===c.aspectId)?.evidenceKeys.includes(k)??false;
   })),
   ...(contextAudit165?.candidateCorrections??[]).filter(c=>c.effect==='set_excluded')
    .map(c=>'verify_absence_of_'+c.aspectId),
   ...(inheritedGoalCandidate?['verify_inherited_goal_before_ranking']:[]),
   ...(sourcePref==='independent_professional_only'?['independent_professional_tests_only']:[]),
   ...(residual.length?['adjudicate_unmapped_user_constraint']:[]),
   ...(contextAudit165?.requiresReview?['adjudicate_user_context_scope_before_committing_preferences']:[]),
   ...(contextAudit165?.candidateCorrections.length?['verify_rule_based_constraint_correction_before_ranking']:[]),
   ...(researchMatch?['category_definition_review','category_specific_test_methods_required']:[])])].sort(),
   candidatePassageIds:retrieved,
   rightsAssertionIsProof:false,retrievalIsEvidence:false,sourceFactsApproved:false,
   newCategoryTasks},
  reasons:changed?['category_ontology_snapshot_changed_invalidate_and_review']:
   previous.pendingBudgetRevision&&!newCategory?['awaiting_budget_revision_answer']:
   budgetReversal?['budget_revision_needs_explicit_user_confirmation']:
   researchMatch?['category_registry_entry_unreviewed_cold_start_required']:
   !active?[categoryIds.length>1?'multiple_explicit_product_categories':'category_not_anchored']:
   [...errorReasons(effectiveFrame,active),
    ...(inheritedGoalCandidate?['inherited_goal_is_unverified_candidate']:[]),
    ...(residual.length?['unmapped_user_constraints_not_silently_discarded']:[]),
    ...(contextAudit165?.requiresReview?['unverified_user_context_scope_not_committed']:[])].sort(),
   questionToUser:userQuestion,
  userNeedsToRunComputer:false,sourceMeasurementsVerified:false,
  publicRecommendationAuthorized:false,rankingAuthorized:false,session:next};
}
/** Explicit candidate-set event from an authorised UI. Structural receipt alone
 * does not independently prove the UI showed those candidates to a user. */
export function registerUserCandidates164(previous:RequestSession164,event:{
 turnId:string;categoryId:string;candidateIds:readonly string[];
 sourceSnapshotId:string;presentedToUser:true;}):RequestSession164{
 validSession(previous);
 if(!previous.dialogue||previous.activeCategoryId!==event.categoryId)throw Error('no_active_category');
 const dialogue=registerPresentedCandidates127(previous.dialogue,event);
 return record({...previous,dialogue},event.turnId,'presented_candidates:'+event.sourceSnapshotId,
  event.categoryId,'research_candidate_sources');
}

/** Consume an explicit yes/no user answer to the previous price-limit question.
 * A new user turn gets an immutable event receipt; a string like "sure" is never
 * interpreted as authorization without an explicit UI/controller decision. */
export function resolveBudgetRevision164(previous:RequestSession164,event:{
 answerTurnId:string;requestTurnId:string;removeLimit:boolean;userConfirmed:true;}):RequestSession164{
 validSession(previous);
 if(!previous.pendingBudgetRevision||!previous.dialogue||
  previous.pendingBudgetRevision.questionTurnId!==event.requestTurnId||
  !ident(event.answerTurnId)||event.userConfirmed!==true)throw Error('budget_revision_not_pending');
 const dialogue=reviseSessionBudget127(previous.dialogue,{turnId:event.answerTurnId,
  newBudget:event.removeLimit?null:previous.dialogue.budget,userConfirmed:true});
 const next={...previous,dialogue,pendingBudgetRevision:null};
 return record(next,event.answerTurnId,'budget_revision_answer:'+event.requestTurnId+':'+event.removeLimit,
   previous.activeCategoryId,event.removeLimit?'budget_revision_confirmed':'budget_revision_declined');
}
