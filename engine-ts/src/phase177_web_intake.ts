/** Phase177: read-only suggestion and presentation adapter for website intake.
 * Reuses Phase175 (Phase154 / Phase174 / Phase173 / Phase172) as hypotheses,
 * not as canonical truth or rank evidence. No mandatory chat history.
 */
import {createHash} from 'node:crypto';
import {analyzeNeedDiscourse175} from './phase175_disclosure_semantics.js';
import {trackNeedConversation176} from './phase176_turn_state_ledger.js';
import {createDecision177,applyDecisionBatch177,assertDecisionSnapshot177,type DecisionSnapshot177,type DecisionAction177} from './phase177_decision_snapshot.js';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
export interface IntakeSuggestion177 {key:string;label:string;observedSpan:string;start:number;end:number;sourceHash:string;
 proposedAction:Extract<DecisionAction177,{type:'propose_candidate'}>;
 engineeringReviewed:false;userConfirmed:false;exclusionAuthorized:false;rankingAuthorized:false;}
export interface WebIntake177 {
 phase:177;language:'en';questionHash:string;originalEnglishRequest:string;unmappedGoalText:string|null;equipmentRoles:readonly {equipment:string;role:string;span:string}[];
 suggestions:readonly IntakeSuggestion177[];unresolvedIssues:readonly string[];
 hasConfirmedNeeds:false;rankingAuthorized:false;exclusionsAuthorized:false;
}
export function proposeWebIntake177(input:string):WebIntake177 {
 if(typeof input!=='string'||input.trim().length<3||input.length>4000)throw Error('phase177_invalid_english_intake');
 const source=analyzeNeedDiscourse175({question:input,language:'en'});
 // Phase176 is reused as an OPTIONAL single-utterance quotation guard, not
 // as a compulsory conversation state. Unclosed quotation marks remain a gap.
 const quoteSpans=/["“]/.test(input)?trackNeedConversation176([{turnId:'intake',speaker:'user',text:input}]).entries[0].quoteSpans:[];
 const candidates=new Map<string,IntakeSuggestion177>();
 const raw=[...source.inherited174.facets.map(f=>({key:`f.${f.id}`,label:f.goal,span:f.observedSpan,start:f.start,end:f.end,kind:f.polarity})),
  ...source.inherited174.inherited173.inherited.candidates.map(c=>({key:`f.${c.id}`,label:c.goal,span:c.observedUsageSpan,start:c.start,end:c.end,kind:'wanted'}))];
 for(const x of raw){
  if(x.kind!=='wanted'||candidates.has(x.key)||quoteSpans.some(q=>x.start>=q.start&&x.end<=q.end))continue;
  // A candidate value means "research this need", NOT that a product satisfies it.
  const proposedAction:Extract<DecisionAction177,{type:'propose_candidate'}>={type:'propose_candidate',source:'english_intake_candidate',key:x.key,
   label:x.label,value:{kind:'boolean',value:true},referenceHash:sha(input)};
  candidates.set(x.key,{key:x.key,label:x.label,observedSpan:x.span,start:x.start,end:x.end,sourceHash:sha(input),proposedAction,
   engineeringReviewed:false,userConfirmed:false,exclusionAuthorized:false,rankingAuthorized:false});
 }
 return {phase:177,language:'en',questionHash:sha(input),originalEnglishRequest:input,
  unmappedGoalText:candidates.size===0?input:null,equipmentRoles:source.equipment.map(x=>({equipment:x.equipment,role:x.role,span:x.span})),
  suggestions:[...candidates.values()].sort((a,b)=>a.key.localeCompare(b.key)),unresolvedIssues:source.unresolvedIssues,
  hasConfirmedNeeds:false,rankingAuthorized:false,exclusionsAuthorized:false};
}
export function proposeIntakeOnDecision177(snapshot:DecisionSnapshot177,intake:WebIntake177){
 if(intake.phase!==177||intake.hasConfirmedNeeds!==false||intake.rankingAuthorized!==false||
  sha(intake.originalEnglishRequest)!==intake.questionHash)throw Error('phase177_untrusted_intake_envelope');
 // Each NLP candidate adds only to the tentative list, preserving confirmed edits.
 const actions:Extract<DecisionAction177,{type:'propose_candidate'}>[]=[];
 for(const s of intake.suggestions){
  if(s.sourceHash!==intake.questionHash||s.proposedAction.referenceHash!==intake.questionHash||
   s.proposedAction.key!==s.key||s.proposedAction.label!==s.label||
   s.observedSpan!==intake.originalEnglishRequest.slice(s.start,s.end)||
   s.proposedAction.type!=='propose_candidate'||s.proposedAction.source!=='english_intake_candidate')
    throw Error('phase177_unbound_intake_suggestion');
  actions.push(s.proposedAction);
 }
 return applyDecisionBatch177(snapshot,actions).snapshot;
}
export interface WebDecisionView177 {
 phase:177;revision:number;headline:string;firstLayer:readonly string[];
 visibleCautions:readonly string[];
 editableCriteria:readonly {key:string;label:string;status:string;priority:string;value:string}[];
 optionalDetails:readonly string[];showVerifiedRankedProducts:false;
 canEditCriteria:true;canAskInEnglish:true;rankingAuthorized:false;
}
export function renderWebDecision177(snapshot:DecisionSnapshot177):WebDecisionView177{
 // Integrity is checked by the difference routine even when comparing with self.
 // Prevent false confidence from externally modified object fields.
 assertDecisionSnapshot177(snapshot);
 const confirmed=snapshot.criteria.filter(c=>c.status==='confirmed');
 const candidates=snapshot.criteria.filter(c=>c.status==='candidate');
 const hard=confirmed.filter(c=>c.priority==='hard');
 const visibleCautions=[
  ...(hard.length?['Essential requirements are user-confirmed, but no product has been independently verified against them.']:[]),
  ...(candidates.length?[`${candidates.length} suggested criteria remain unconfirmed; they cannot exclude products.`]:[]),
  'No source- and variant-verified product ranking is available from this decision state.'
 ];
 return {phase:177,revision:snapshot.revision,headline:'Your product-choice criteria',
  firstLayer:[`${confirmed.length} confirmed criteria. You can correct or change them at any time.`,
   'Product recommendations will require independently checked professional evidence.'],
  visibleCautions,editableCriteria:snapshot.criteria.map(c=>({key:c.key,label:c.label,status:c.status,priority:c.priority,
   value:c.value.kind==='quantity'?`${c.value.value} ${c.value.unit}`:String(c.value.value)})),
  optionalDetails:[`Task: ${snapshot.scope.task}; category: ${snapshot.scope.category??'not confirmed'}.`,
   'Language suggestions are provisional. Methods, test conditions and product-variant identity must be verified separately.'],
  showVerifiedRankedProducts:false,canEditCriteria:true,canAskInEnglish:true,rankingAuthorized:false};
}
export function initWebsiteDecision177(decisionId:string,question:string){
 const state=createDecision177(decisionId),intake=proposeWebIntake177(question);
 return {snapshot:proposeIntakeOnDecision177(state,intake),intake};
}
