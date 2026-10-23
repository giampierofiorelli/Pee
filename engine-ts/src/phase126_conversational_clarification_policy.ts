/** Phase126 — locally owned, evidence-bound mixed-initiative clarification controller.
 * Reuses Phase111's decision-relevant ambiguity gate, Phase100 preference prompts,
 * and Phase125's compositional candidate frame without reinterpreting source facts.
 * Never infers that a missing field warrants a question; never authorizes ranking.
 * Inputs representing alternative readings and evidence sufficiency remain supplied
 * by separate vetted upstream systems, NOT verified by this controller.
 */
import {createHash} from 'node:crypto';
import {gateRequest111,type RequestInterpretations111} from './phase111_long_context_and_query_ambiguity.js';
import type {Composition125} from './phase125_compositional_dialogue_frame.js';
import type {AdaptivePreferenceQuestion} from './phase100_adaptive_preference_envelope.js';

export type TurnAction126='continue_research'|'compare_scenarios'|'ready_for_evidence_review'|
 'investigate_interpretations'|'ask_one_question'|'await_user_reply';
export type AnswerKind126='reading'|'compare'|'preference'|'unsure';
export interface Choice126 {id:string;label:string;kind:AnswerKind126;
  /** Never an unreviewed NLP string or a product/source fact. */
  readingId?:string;preferenceValue?:'first_more_important'|'second_more_important'|'equally_important';}
export interface Pending126 {id:string;turnId:string;frameSha256:string;kind:'material_ambiguity'|'swing_preference'|'missing_referent';
 question:string;choices:readonly Choice126[];allowsFreeText:true;optional:true;
 questionIssueCode:string|null;scope:'current_conversation';}
export interface DialogueDecision126 {phase:126;action:TurnAction126;reason:string;
 pending:Pending126|null;nextSteps:readonly string[];rankingAuthorized:false;
 originalEvidenceAuthenticated:false;meaningConfirmed:false;}
export interface Alternative126 {label:string;choiceId:string;readingId:string;}
export interface MaterialAmbiguity126 {reviewed:RequestInterpretations111;
 /** Explicit mapping; Phase111 free-form labels must never be treated as reading identifiers. */
 options:readonly Alternative126[];allowComparison:boolean;}
export interface PreferencePrompt126 {question:AdaptivePreferenceQuestion;
 /** Only a separately validated Phase100 result may set this. */
 exactPhase100EvidenceReady:true;indeterminateTradeoff:true;userApprovedExploration:true;}
export interface DialogueRequest126 {turnId:string;frame:Composition125;
 evidence:'not_assessed'|'needs_acquisition'|'reviewed_sufficient';
 ambiguity?:MaterialAmbiguity126;preference?:PreferencePrompt126;
 pending?:Pending126|null;alreadyAskedIssueCodes?:readonly string[];language:'it'|'en';}
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const identifier=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_]{0,80}$/.test(s);
const clean=(s:unknown,max=160):s is string=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
const unique=(a:readonly string[])=>new Set(a).size===a.length;
const output=(action:TurnAction126,reason:string,pending:Pending126|null,steps:string[]=[]):DialogueDecision126=>({
 phase:126,action,reason,pending,nextSteps:steps,rankingAuthorized:false,
 originalEvidenceAuthenticated:false,meaningConfirmed:false});
function pending(input:DialogueRequest126,kind:Pending126['kind'],question:string,
 choices:readonly Choice126[],issueCode:string|null):Pending126{
 if(!clean(question,240)||!choices.length&&kind!=='missing_referent'||choices.length>5||
    choices.some(c=>!identifier(c.id)||!clean(c.label,120))||!unique(choices.map(c=>c.id)))
    throw Error('invalid_single_clarification');
 const identity=sha(JSON.stringify({turn:input.turnId,frame:input.frame.questionSha256,kind,question,
   choices,issueCode}));
 return {id:identity,turnId:input.turnId,frameSha256:input.frame.questionSha256,
  kind,question,choices:[...choices],allowsFreeText:true,optional:true,
  questionIssueCode:issueCode,scope:'current_conversation'};
}
/** One focused request OR research/alternatives; never a questionnaire.
 * General scope is a legitimate request, not itself a reason to clarify.
 * Source-data gaps must trigger acquisition rather than questions to the user.
 */
export function decideDialogue126(input:DialogueRequest126):DialogueDecision126{
 if(!input||!clean(input.turnId,100)||input.frame?.phase!==125||
    !/^[a-f0-9]{64}$/.test(input.frame.questionSha256)||
    !['not_assessed','needs_acquisition','reviewed_sufficient'].includes(input.evidence)||
    !['it','en'].includes(input.language))throw Error('invalid_dialogue_request');
 if(input.alreadyAskedIssueCodes && (!Array.isArray(input.alreadyAskedIssueCodes)||
   input.alreadyAskedIssueCodes.some(x=>!identifier(x))||
   !unique(input.alreadyAskedIssueCodes)))throw Error('invalid_issue_history');
 if(input.pending){
  if(input.pending.turnId!==input.turnId||input.pending.frameSha256!==input.frame.questionSha256)
    throw Error('stale_pending_context');
  return output('await_user_reply','existing_pending_question',input.pending);
 }
 const f=input.frame;
 // Unresolved deictic comparatives need a grounded referent, not a product guess.
 if(f.candidateReference==='unresolved'){
  const q=input.language==='it'?'Quali modelli vuoi confrontare?':
    'Which models would you like to compare?';
  return output('ask_one_question','referent_missing',pending(input,'missing_referent',q,[],null));
 }
 // A contradiction or uncertain negation cannot be repaired by an automatic default.
 const structural=f.hazards.filter(h=>[
  'contradictory_aspect_polarity','unbound_negation','logical_scope_needs_review',
  'negation_modality_needs_review','multiple_explicit_categories',
  'negated_goal_requires_review'].includes(h));
 // Phase111 is the authority on whether alternative readings would change a decision.
 if(input.ambiguity){
  const x=input.ambiguity,gate=gateRequest111(x.reviewed);
  if(gate.action==='clarify'){
   const issueCode=x.reviewed.issues[0]?.issueCode;
   if(issueCode&&input.alreadyAskedIssueCodes?.includes(issueCode)){
    return x.allowComparison?output('compare_scenarios',
      'same_clarification_already_offered_show_scenarios',null):
      output('investigate_interpretations','repeat_question_suppressed',null);
   }
   const question=x.reviewed.issues[0]?.question;
   const options=x.options;
   const readingIds=new Set(x.reviewed.readings.map(r=>r.readingId));
   if(!question||options.length<2||options.length>4||
      options.some(o=>!identifier(o.choiceId)||!clean(o.label,120)||!readingIds.has(o.readingId))||
      !unique(options.map(o=>o.choiceId))||!unique(options.map(o=>o.readingId))||
      options.length!==x.reviewed.readings.length||
      options.some(o=>!x.reviewed.issues[0].options.includes(o.label))){
    return output('investigate_interpretations','unverified_clarification_option_binding',null);
   }
   const opts:Choice126[]=options.map(o=>({id:o.choiceId,label:o.label,
     kind:'reading',readingId:o.readingId}));
   if(x.allowComparison)opts.push({id:'compare_both',label:input.language==='it'? 
     'Mostrami entrambe le possibilità':'Show both possibilities',kind:'compare'});
   if(opts.length>5)return output('investigate_interpretations','too_many_choices',null);
   return output('ask_one_question','phase111_material_ambiguity',pending(input,
     'material_ambiguity',question,opts,x.reviewed.issues[0].issueCode));
  }
  if(gate.action==='analyze_alternatives')return output('investigate_interpretations',gate.reason,null);
  if(gate.action==='gather_evidence')return output('continue_research','phase111_missing_evidence',null,
      ['acquire_missing_original_evidence']);
  // If readings agree, do not ask; still honor unresolved structural language.
 }
 if(structural.length)return output('investigate_interpretations',
     'linguistic_scope_or_constraint_unresolved',null,structural);
 if(f.hazards.some(h=>h!=='unknown_capability_requires_research'&&
    h!=='unresolved_comparative_referent'))
   return output('investigate_interpretations','unadjudicated_semantic_hazard',null,
     [...f.hazards]);
 if(!f.categoryId)return output('investigate_interpretations','category_requires_grounding',null);
 if(f.hazards.includes('unknown_capability_requires_research'))
  return output('continue_research','unknown_capability_requires_evidence',null,
    ['research_meaning_and_original_capability_tests']);
 if(input.evidence!=='reviewed_sufficient')return output('continue_research',
     'missing_evidence_cannot_be_solved_by_user_preference',null,
     ['discover_sources','verify_original_evidence','review_comparability']);
 if(input.preference){
  const p=input.preference;
  if(p.exactPhase100EvidenceReady!==true||p.indeterminateTradeoff!==true||
    p.userApprovedExploration!==true||
    !clean(p.question?.prompt,240)||!Array.isArray(p.question.responses)||
    p.question.responses.join('|')!=='first_more_important|second_more_important|equally_important')
    throw Error('unverified_preference_prompt');
  const labels=input.language==='it'?[
    'Conta di più il primo miglioramento','Conta di più il secondo miglioramento',
    'Per me hanno lo stesso valore']:[
    'The first improvement matters more','The second improvement matters more',
    'Both improvements matter equally'];
  const choices:Choice126[]=p.question.responses.map((v,i)=>({id:v,label:labels[i],
    kind:'preference' as const,preferenceValue:v}));
  return output('ask_one_question','phase100_decision_relevant_preference',pending(input,
    'swing_preference',p.question.prompt,choices,'phase100_swing'));
 }
 return output('ready_for_evidence_review','no_material_user_clarification_needed',null,
   ['review_candidate_results_before_public_ranking']);
}

export type ReplyOutcome126='reading_confirmed'|'scenario_comparison_requested'|
 'swing_preference_confirmed'|'free_text_needs_interpretation'|'skipped'|'invalid_choice';
export interface Reply126 {questionId:string;answerTurnId:string;
 choiceId?:string;freeText?:string;skip?:boolean;}
export interface ReplyReceipt126 {questionId:string;answerTurnId:string;outcome:ReplyOutcome126;
 /** A receipt authorizes revisiting the request, not publishing a winner. */
 confirmedReadingId:string|null;preferenceValue:Choice126['preferenceValue']|null;
 newUserText:string|null;rankingAuthorized:false;productFactsChanged:false;}
/** Never guess what a free-text response means. It becomes the next utterance for
 * Phase125 parsing + Phase111 alternative interpretation review. */
export function processReply126(question:Pending126,reply:Reply126):ReplyReceipt126{
 if(!question||!reply||reply.questionId!==question.id||!clean(reply.answerTurnId,100)||
   reply.answerTurnId===question.turnId)throw Error('stale_or_invalid_reply');
 const chosen=reply.choiceId?question.choices.find(c=>c.id===reply.choiceId):undefined;
 const free=reply.freeText?.trim();
 if([Boolean(reply.choiceId),Boolean(free),reply.skip===true].filter(Boolean).length!==1)
   throw Error('multiple_or_missing_reply_modes');
 const base={questionId:question.id,answerTurnId:reply.answerTurnId,
   confirmedReadingId:null as string|null,preferenceValue:null as Choice126['preferenceValue']|null,
   newUserText:null as string|null,rankingAuthorized:false as const,productFactsChanged:false as const};
 if(reply.skip)return {...base,outcome:'skipped'};
 if(free){if(free.length>2000)throw Error('reply_too_long');
  return {...base,outcome:'free_text_needs_interpretation',newUserText:free};}
 if(!chosen)return {...base,outcome:'invalid_choice'};
 if(chosen.kind==='reading')return {...base,outcome:'reading_confirmed',
   confirmedReadingId:chosen.readingId||null};
 if(chosen.kind==='compare')return {...base,outcome:'scenario_comparison_requested'};
 if(chosen.kind==='preference')return {...base,outcome:'swing_preference_confirmed',
   preferenceValue:chosen.preferenceValue||null};
 return {...base,outcome:'skipped'};
}
