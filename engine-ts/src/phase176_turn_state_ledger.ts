/** Phase176: bounded turn-state ledger for *candidate* upstream user meaning.
 * Not a learned parser, independent semantic gold, source validation, coreference proof,
 * product identity resolution, authenticated preference store, or ranking engine.
 * Reuses the executed Phase175→174→173→172 path and review-era Phase154 ConText scope.
 */
import {createHash} from 'node:crypto';
import {analyzeNeedDiscourse175, type Equipment175, type EquipmentMention175, type NeedGraph175} from './phase175_disclosure_semantics.js';
import {buildContextGraph154, type ContextRule154} from './phase154_context_graph.js';

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const unique=<T>(items:readonly T[]):T[]=>[...new Set(items)];
export interface Turn176 {turnId:string;speaker:'user'|'assistant';text:string;}
export type Grounding176='current_turn_explicit_candidate'|'previous_user_turn_unique_candidate'|'ambiguous_or_missing';
export type Status176='user_candidate'|'quoted_or_reported'|'conditional_or_uncertain';
export interface ScopedMention176 {
 turnId:string;equipment:Equipment175;role:EquipmentMention175['role'];start:number;end:number;
 originalSpan:string;status:Status176;scopeReason:string;roleCandidateOnly:true;
}
export interface TurnLedgerEntry176 {
 turnId:string;speaker:Turn176['speaker'];textSha256:string;
 observed:readonly ScopedMention176[];quoteSpans:readonly {start:number;end:number}[];
 candidateFocus:readonly Equipment175[];unresolved:readonly string[];
 original175:NeedGraph175|null;
}
export interface CandidateReference176 {
 phrase:string;start:number;end:number;resolvedEquipment:Equipment175|null;
 grounding:Grounding176;antecedentTurnId:string|null;
 stance:'affirmed_candidate'|'rejected_candidate'|'uncertain_candidate';referenceVerified:false;
}
export interface StateLedger176 {
 phase:176;schemaVersion:'176.1';conversationSha256:string;entries:readonly TurnLedgerEntry176[];
 latestUserTurnId:string;latestUserFocus:readonly Equipment175[];
 references:readonly CandidateReference176[];
 revision:'explicit_correction_candidate'|'possible_revision'|'none';
 unresolvedIssues:readonly string[];clarification:string|null;workingStateSignature:string;
 independentSemanticAccuracyMeasured:false;referenceIdentityVerified:false;
 userNeedValidated:false;sourceMeasurementsVerified:false;productEvidenceVerified:false;
 hardExclusionsAuthorized:false;rankingAuthorized:false;choiceChangeAuthorized:false;
}
const quotedRanges=(s:string):{start:number;end:number}[]=>{
 const out:{start:number;end:number}[]=[];
 let opening=-1;let right='';
 for(let i=0;i<s.length;i++){
  const c=s[i];if(c==='\\'){i++;continue;}
  if(opening>=0){if(c===right){out.push({start:opening,end:i+1});opening=-1;right='';}continue;}
  if(c==='"'||c==='“'){opening=i;right=c==='“'?'”':'"';}
 }
 return out;
};
const reportRules176:readonly ContextRule154[]=[
 {literal:'reviewer says',category:'REPORTED',direction:'FORWARD',maxScopeTokens:26},
 {literal:'review says',category:'REPORTED',direction:'FORWARD',maxScopeTokens:26},
 {literal:'the review claims',category:'REPORTED',direction:'FORWARD',maxScopeTokens:26},
 {literal:'the seller claims',category:'REPORTED',direction:'FORWARD',maxScopeTokens:26},
 {literal:'my friend says',category:'REPORTED',direction:'FORWARD',maxScopeTokens:26},
 {literal:'my parents say',category:'REPORTED',direction:'FORWARD',maxScopeTokens:26},
 {literal:'they say',category:'REPORTED',direction:'FORWARD',maxScopeTokens:26},
 {literal:'according to',category:'REPORTED',direction:'FORWARD',maxScopeTokens:26},
 {literal:'if',category:'CONDITIONAL',direction:'FORWARD',maxScopeTokens:25},
 {literal:'unless',category:'CONDITIONAL',direction:'FORWARD',maxScopeTokens:25},
 {literal:'maybe',category:'UNCERTAIN',direction:'FORWARD',maxScopeTokens:20},
 {literal:'perhaps',category:'UNCERTAIN',direction:'FORWARD',maxScopeTokens:20},
 {literal:'but',category:'BREAK',direction:'TERMINATE'},
 {literal:'however',category:'BREAK',direction:'TERMINATE'},
 {literal:'instead',category:'BREAK',direction:'TERMINATE'},
];
const singularReference=/\b(?:it|that\s+one|this\s+one|the\s+same\s+one|a\s+different\s+one|another\s+one)\b/gi;
const explicitCorrection=/\b(?:actually|correction|i\s+meant|i\s+changed\s+my\s+mind|scratch\s+that|forget\s+that|no\s+longer)\b/i;
const possibleRevision=/\b(?:instead|rather|different\s+one|another\s+one|what\s+if|on\s+second\s+thought)\b/i;
const referentialAction=/\b(?:want|need|buy|replace|choose|prefer|consider|looking\s+for|rather|instead|keep|avoid|not\s+want|don't\s+want|do\s+not\s+want)\b/i;
const standalonePronoun=/(?:^|[.!?;]\s*)(?:no|yes|yeah|actually|instead|wait|but|so)?[,\s]*(?:i\s+)?(?:want|need|prefer|would\s+like|don't\s+want|do\s+not\s+want|keep|avoid|replace|choose|buy|get)\s+(?:it|that\s+one|this\s+one|the\s+same\s+one|a\s+different\s+one|another\s+one)\b/i;
function validateTurns176(turns:readonly Turn176[]):void{
 if(!Array.isArray(turns)||turns.length<1||turns.length>12)throw Error('phase176_invalid_turn_count');
 const ids=new Set<string>();
 for(const t of turns){
  if(!t||typeof t.turnId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(t.turnId)||ids.has(t.turnId)||
   !['user','assistant'].includes(t.speaker)||typeof t.text!=='string'||t.text.length<3||t.text.length>4000)
   throw Error('phase176_invalid_turn');
  ids.add(t.turnId);
 }
 if(turns[turns.length-1].speaker!=='user')throw Error('phase176_last_turn_must_be_user');
}
/** All observations are source bounded. A quote or third-party claim stays visible but never feeds the active focus. */
function observe176(t:Turn176):TurnLedgerEntry176{
 if(t.speaker==='assistant')return {turnId:t.turnId,speaker:t.speaker,textSha256:sha(t.text),observed:[],quoteSpans:[],candidateFocus:[],unresolved:[],original175:null};
 const base=analyzeNeedDiscourse175({question:t.text,language:'en'});
 const quotes=quotedRanges(t.text);
 const graph=buildContextGraph154(t.text.replace(/[‘’]/g,"'"),base.equipment.map((m,i)=>({id:`p${i}`,start:m.start,end:m.end,type:'EQUIPMENT'})),reportRules176);
 const observed:ScopedMention176[]=base.equipment.map((m,i)=>{
  const inQuote=quotes.some(q=>m.start>=q.start&&m.end<=q.end);
  const cues=graph.edges.filter(e=>e.targetId===`p${i}`).map(e=>e.category);
  // A quoted request or somebody else's account must not be promoted into the user's own request.
  const reported=inQuote||cues.includes('REPORTED');
  const conditional=cues.includes('CONDITIONAL')||cues.includes('UNCERTAIN');
  return {turnId:t.turnId,equipment:m.equipment,role:m.role,start:m.start,end:m.end,
   originalSpan:m.span,status:reported?'quoted_or_reported':conditional?'conditional_or_uncertain':'user_candidate',
   scopeReason:inQuote?'paired_double_quote':cues.includes('REPORTED')?'attribution_scope':
    conditional?'conditional_or_uncertain_scope':'unqualified_current_turn',roleCandidateOnly:true};
 });
 const active=observed.filter(m=>m.status==='user_candidate'&&['requested','compared'].includes(m.role));
 const unresolved:string[]=[];
 if(graph.truncated)unresolved.push('context_scope_truncated');
 if(observed.some(m=>m.status==='quoted_or_reported'))unresolved.push('reported_text_is_not_user_requirement');
 if(observed.some(m=>m.status==='conditional_or_uncertain'))unresolved.push('conditional_need_not_confirmed');
 if(observed.some(m=>m.role==='unresolved'))unresolved.push('device_role_unresolved');
 return {turnId:t.turnId,speaker:t.speaker,textSha256:sha(t.text),observed,quoteSpans:quotes,
  candidateFocus:unique(active.map(m=>m.equipment)).sort(),unresolved,original175:base};
}
/** This is a *hypothesis ledger*, never an authorization to mutate a verified ranking. */
export function trackNeedConversation176(turns:readonly Turn176[],language:'en'='en'):StateLedger176{
 if(language!=='en')throw Error('phase176_english_only');
 validateTurns176(turns);
 const entries=turns.map(observe176);
 const last=turns[turns.length-1],latest=entries[entries.length-1];
 const preceding=entries.slice(0,-1).filter(x=>x.speaker==='user');
 const previous=preceding[preceding.length-1]??null;
 const references:CandidateReference176[]=[];
 // Only the immediately preceding USER turn can supply a bounded candidate, not assistant guesses.
 const prevCandidates=turns.length>=2&&turns[turns.length-2].speaker==='user'?(previous?.candidateFocus??[]):[];
 const currentMentions=latest.observed.filter(x=>x.status==='user_candidate');
 const activeExplicit=latest.candidateFocus;
 const noReferenceResolution=latest.unresolved.includes('reported_text_is_not_user_requirement')||
  latest.unresolved.includes('conditional_need_not_confirmed');
 for(const m of last.text.matchAll(singularReference)){
  const at=m.index!,prev=last.text.slice(Math.max(0,at-110),at);
  // Never resolve references embedded in quoted passages, or on reported/hedged lines.
  const quote=latest.quoteSpans.some(q=>at>=q.start&&at<q.end);
  const inAttributed=/(?:review(?:er)?|seller|my\s+friend|my\s+parents|they)\s+(?:says?|claims?)\b[^.!?;]*$/i.test(prev);
  const uncertainty=/\b(?:if|unless|maybe|perhaps|might|could|hypothetically|not\s+sure(?:\s+whether|\s+if)?)\b[^.!?;]*$/i.test(prev);
  const rejection=/\b(?:no\s+longer\s+want|don'?t\s+want|do\s+not\s+want|never\s+want|not\s+buying|won'?t\s+buy|wouldn'?t\s+buy)\b[^.!?;]*$/i.test(prev);
  const action=referentialAction.test(prev.slice(-90))||standalonePronoun.test(last.text.slice(Math.max(0,at-35),m.index!+m[0].length));
  const conditionalRef=/\b(?:if|unless|hypothetically)\b[^.!?;]*$/i.test(prev);
  const guarded=quote||inAttributed||conditionalRef||noReferenceResolution||!action||currentMentions.length>0;
  const resolved=(!guarded&&prevCandidates.length===1)?prevCandidates[0]:null;
  references.push({phrase:m[0],start:at,end:at+m[0].length,resolvedEquipment:resolved,
   grounding:resolved?'previous_user_turn_unique_candidate':'ambiguous_or_missing',
   antecedentTurnId:resolved?previous!.turnId:null,
   stance:rejection?'rejected_candidate':uncertainty?'uncertain_candidate':'affirmed_candidate',referenceVerified:false});
 }
 // Explicit latest mention wins local focus. A pronoun link is a candidate only, never confirmed.
 const resolvedRefs=unique(references.filter(x=>x.resolvedEquipment&&x.stance==='affirmed_candidate').map(x=>x.resolvedEquipment!));
 const latestUserFocus=activeExplicit.length?activeExplicit:resolvedRefs;
 const revision:StateLedger176['revision']=explicitCorrection.test(last.text)?'explicit_correction_candidate':
  possibleRevision.test(last.text)?'possible_revision':'none';
 const issues=unique([
  ...latest.unresolved,
  ...(references.some(x=>!x.resolvedEquipment)?['anaphora_ambiguous_or_unresolved']:[]),
  ...(references.some(x=>x.resolvedEquipment)?['anaphora_candidate_not_confirmed']:[]),
  ...(references.some(x=>x.stance==='rejected_candidate')?['referenced_candidate_rejected_no_new_target_assumed']:[]),
  ...(references.some(x=>x.stance==='uncertain_candidate')?['referenced_candidate_uncertain_not_requirement']:[]),
  ...(activeExplicit.length>1?['multiple_active_product_candidates']:[]),
  ...(revision!=='none'?['revision_requires_user_confirmed_criteria_snapshot']:[]),
  ...(latestUserFocus.length===0?['no_unambiguous_active_purchase_target']:[]),
 ]).sort();
 const clarification=references.some(x=>!x.resolvedEquipment)?
  'Which product do you mean by that?':latestUserFocus.length>1?
  'Which of these products are you referring to?':latestUserFocus.length===0?
  'Which product or outcome are you deciding about?':null;
 const workingStateSignature=sha(JSON.stringify({focus:latestUserFocus,revision,unresolved:issues,
  references:references.map(r=>[r.resolvedEquipment,r.grounding,r.stance])}));
 return {phase:176,schemaVersion:'176.1',conversationSha256:sha(JSON.stringify(turns)),entries,
  latestUserTurnId:last.turnId,latestUserFocus,references,revision,unresolvedIssues:issues,
  clarification,workingStateSignature,independentSemanticAccuracyMeasured:false,
  referenceIdentityVerified:false,userNeedValidated:false,sourceMeasurementsVerified:false,
  productEvidenceVerified:false,hardExclusionsAuthorized:false,rankingAuthorized:false,choiceChangeAuthorized:false};
}
