import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {composeQuestion125,floorRobotSchema125,type Composition125} from '../src/phase125_compositional_dialogue_frame.js';
import {decideDialogue126,processReply126,type DialogueRequest126,type MaterialAmbiguity126} from '../src/phase126_conversational_clarification_policy.js';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const frame=(q='Qual è il miglior robot aspirapolvere?',extras:Partial<Composition125>={})=>({
 ...composeQuestion125(q,[floorRobotSchema125]),...extras});
const req=(f=frame(),extras:Partial<DialogueRequest126>={}):DialogueRequest126=>({
 turnId:'turn_1',frame:f,evidence:'needs_acquisition',language:'it',...extras});
const material=():MaterialAmbiguity126=>({
 reviewed:{requestId:'stairs_request',inspection:'alternative_meanings_checked',readings:[
  {readingId:'threshold',interpretationCode:'single_door_threshold',topVariantId:'robot_a',
   eligibleVariantIds:['robot_a','robot_b'],absoluteConstraints:['threshold_traversal'],relativePreferences:[],evidenceGaps:[]},
  {readingId:'staircase',interpretationCode:'full_staircase',topVariantId:'robot_c',
   eligibleVariantIds:['robot_c'],absoluteConstraints:['staircase_traversal'],relativePreferences:[],evidenceGaps:[]}
 ],issues:[{issueCode:'stairs_meaning',kind:'capability',
  question:'Intendi piccoli dislivelli oppure una scala vera?',options:[
   'Piccoli gradini o soglie','Una scala completa']} ]},
 options:[{label:'Piccoli gradini o soglie',choiceId:'threshold',readingId:'threshold'},
  {label:'Una scala completa',choiceId:'staircase',readingId:'staircase'}],allowComparison:true
});
const staircase=()=>frame('Cerco un robot aspirapolvere in grado di salire gli scalini');

test('broad best request is not interrogated: start evidence acquisition',()=>{
 const x=decideDialogue126(req());assert.equal(x.action,'continue_research');
 assert.equal(x.pending,null);assert.equal(x.rankingAuthorized,false);
});
test('generic performance and value lenses do not force a task selection',()=>{
 const f=frame('Miglior robot aspirapolvere qualità prezzo e migliori in assoluto');
 const x=decideDialogue126(req(f));assert.equal(x.action,'continue_research');
 assert.equal(x.pending,null);
});
test('ambiguous stairs with decision-changing readings gets ONE question and grounded options',()=>{
 const x=decideDialogue126(req(staircase(),{ambiguity:material()}));
 assert.equal(x.action,'ask_one_question');assert.equal(x.pending?.choices.length,3);
 assert.equal(x.pending?.kind,'material_ambiguity');
 assert.equal(x.pending?.choices[2].kind,'compare');
 assert.equal(x.pending?.allowsFreeText,true);
});
test('a verified first clarification response maps only to its reading',()=>{
 const x=decideDialogue126(req(staircase(),{ambiguity:material()}));
 const r=processReply126(x.pending!,{questionId:x.pending!.id,answerTurnId:'reply_1',choiceId:'staircase'});
 assert.equal(r.outcome,'reading_confirmed');assert.equal(r.confirmedReadingId,'staircase');
 assert.equal(r.productFactsChanged,false);assert.equal(r.rankingAuthorized,false);
});
test('explicit compare both is not silently rewritten into a mandatory two-function requirement',()=>{
 const x=decideDialogue126(req(staircase(),{ambiguity:material()}));
 const r=processReply126(x.pending!,{questionId:x.pending!.id,answerTurnId:'reply_1',choiceId:'compare_both'});
 assert.equal(r.outcome,'scenario_comparison_requested');assert.equal(r.confirmedReadingId,null);
});
test('missing independent evidence triggers research, not clarification',()=>{
 const x=decideDialogue126(req(frame('Miglior robot aspirapolvere che richieda meno manutenzione')));
 assert.equal(x.action,'continue_research');assert.equal(x.pending,null);
});
test('stale or absent interpretation coverage does NOT permit an improvised question',()=>{
 const a=material();a.reviewed.inspection='not_yet_checked';
 const x=decideDialogue126(req(staircase(),{ambiguity:a}));
 assert.equal(x.action,'investigate_interpretations');assert.equal(x.pending,null);
});
test('same eligible set and winner does not ask irrelevant question',()=>{
 const a=material();a.reviewed.readings[1]={...a.reviewed.readings[1],
  topVariantId:'robot_a',eligibleVariantIds:['robot_a','robot_b'],absoluteConstraints:['threshold_traversal']};
 const x=decideDialogue126(req(staircase(),{ambiguity:a}));
 assert.equal(x.action,'continue_research');assert.equal(x.pending,null);
});
test('an invented option to a nonexistent reading must not be offered',()=>{
 const a=material();a.options=[...a.options.slice(0,1),{...a.options[1],readingId:'made_up'}];
 const x=decideDialogue126(req(staircase(),{ambiguity:a}));
 assert.equal(x.action,'investigate_interpretations');assert.equal(x.pending,null);
});
test('duplicate answer bindings are rejected',()=>{
 const a=material();a.options=[...a.options.slice(0,1),{...a.options[1],readingId:'threshold'}];
 assert.equal(decideDialogue126(req(staircase(),{ambiguity:a})).action,'investigate_interpretations');
});
test('free-text reply is routed to re-interpretation, not presumed confirmed',()=>{
 const x=decideDialogue126(req(staircase(),{ambiguity:material()}));
 const r=processReply126(x.pending!,{questionId:x.pending!.id,answerTurnId:'reply_2',freeText:'Una soglia di 4,5 cm'});
 assert.equal(r.outcome,'free_text_needs_interpretation');assert.equal(r.newUserText,'Una soglia di 4,5 cm');
 assert.equal(r.confirmedReadingId,null);
});
test('stale question response fails closed',()=>{
 const x=decideDialogue126(req(staircase(),{ambiguity:material()}));
 assert.throws(()=>processReply126(x.pending!,{questionId:'another_question',answerTurnId:'reply_2',choiceId:'threshold'}),/stale/);
 assert.throws(()=>processReply126(x.pending!,{questionId:x.pending!.id,answerTurnId:x.pending!.turnId,choiceId:'threshold'}),/stale/);
});
test('no accidental two choices in one answer',()=>{
 const x=decideDialogue126(req(staircase(),{ambiguity:material()}));
 assert.throws(()=>processReply126(x.pending!,{questionId:x.pending!.id,answerTurnId:'reply_2',choiceId:'threshold',freeText:'else'}),/multiple/);
});
test('optional answer can be skipped without assigning preference',()=>{
 const x=decideDialogue126(req(staircase(),{ambiguity:material()}));
 const r=processReply126(x.pending!,{questionId:x.pending!.id,answerTurnId:'reply_3',skip:true});
 assert.equal(r.outcome,'skipped');assert.equal(r.confirmedReadingId,null);
});
test('unknown capabilities require grounded research rather than speculative feature choices',()=>{
 const f=frame('Cerco un robot aspirapolvere con laser al plasma');
 const x=decideDialogue126(req(f));assert.equal(x.action,'continue_research');
 assert.equal(x.pending,null);
});
test('contradictory hard requirements block a fabricated ranking or reply',()=>{
 const f=frame('Cerco un robot aspirapolvere con lavaggio ma senza lavaggio');
 assert.ok(f.hazards.includes('contradictory_aspect_polarity'));
 const x=decideDialogue126(req(f));assert.equal(x.action,'investigate_interpretations');
});
test('unresolved previous candidate reference elicits a single open question',()=>{
 const f=frame('Which one would you choose?',{candidateReference:'unresolved'});
 const x=decideDialogue126(req(f,{language:'en'}));assert.equal(x.action,'ask_one_question');
 assert.equal(x.pending?.choices.length,0);assert.ok(x.pending?.question.includes('Which models'));
});
test('once a user has a pending question no second simultaneous question is produced',()=>{
 const x=decideDialogue126(req(staircase(),{ambiguity:material()}));
 const y=decideDialogue126(req(staircase(),{ambiguity:material(),pending:x.pending}));
 assert.equal(y.action,'await_user_reply');assert.equal(y.pending?.id,x.pending?.id);
});
test('pending from a different turn cannot be reused',()=>{
 const x=decideDialogue126(req(staircase(),{ambiguity:material()}));
 assert.throws(()=>decideDialogue126(req(staircase(),{turnId:'turn_2',pending:x.pending})),/stale/);
});
test('a supplied Phase100 question only occurs with sufficient evidence and approved exploration',()=>{
 const preference={question:{firstCriterionId:'hair',secondCriterionId:'stains',
  prompt:'Preferisci migliore raccolta di peli o migliore lavaggio delle macchie?',
  responses:['first_more_important','second_more_important','equally_important'] as
   ['first_more_important','second_more_important','equally_important'],
  conditionalFirstMore:[-1,1] as [number,number],conditionalSecondMore:[-1,1] as [number,number]},
  exactPhase100EvidenceReady:true as const,indeterminateTradeoff:true as const,
  userApprovedExploration:true as const};
 const f=frame();
 assert.equal(decideDialogue126(req(f,{preference})).action,'continue_research');
 const x=decideDialogue126(req(f,{preference,evidence:'reviewed_sufficient'}));
 assert.equal(x.action,'ask_one_question');assert.equal(x.pending?.choices.length,3);
 const y=processReply126(x.pending!,{questionId:x.pending!.id,answerTurnId:'reply_1',choiceId:'second_more_important'});
 assert.equal(y.outcome,'swing_preference_confirmed');assert.equal(y.preferenceValue,'second_more_important');
});
test('missing category is investigated, not converted into default robot assumption',()=>{
 const f=frame('I want the best?',{categoryId:null,categoryFrom:'unresolved'});
 const x=decideDialogue126(req(f));assert.equal(x.action,'investigate_interpretations');
});
test('grounded comparison never releases a published winner merely because options were answered',()=>{
 const x=decideDialogue126(req(frame(),{evidence:'reviewed_sufficient'}));
 assert.equal(x.action,'ready_for_evidence_review');assert.equal(x.rankingAuthorized,false);
});

test('already asked issue is not repeated: comparative scenarios instead',()=>{
 const x=decideDialogue126(req(staircase(),{ambiguity:material(),
  alreadyAskedIssueCodes:['stairs_meaning']}));
 assert.equal(x.action,'compare_scenarios');assert.equal(x.pending,null);
});
test('already asked issue without grounded comparison avoids repeating an interrogatory',()=>{
 const a=material();a.allowComparison=false;
 const x=decideDialogue126(req(staircase(),{ambiguity:a,
  alreadyAskedIssueCodes:['stairs_meaning']}));
 assert.equal(x.action,'investigate_interpretations');assert.equal(x.pending,null);
});
test('unrecognized decision goal needs semantic review rather than a best-product claim',()=>{
 const f=frame('robot aspirapolvere con il colore blu');
 assert.ok(f.hazards.includes('unresolved_decision_goal'));
 const x=decideDialogue126(req(f,{evidence:'reviewed_sufficient'}));
 assert.equal(x.action,'investigate_interpretations');
});
