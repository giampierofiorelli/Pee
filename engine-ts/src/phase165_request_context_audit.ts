/** Phase 165 — source-anchored, fail-closed user-request context audit.
 * Reuses the medSpaCy-inspired bounded ContextGraph154 already adopted for
 * professional-review interpretation. It does not use clinical vocabulary.
 *
 * No LLM/model, rating, product fact or verified user-intent assertion here.
 * A modifier/target edge is a hypothesis; a mismatch blocks committing a
 * potentially inverted/strengthened requirement into conversational memory.
 */
import {buildContextGraph154,type ContextRule154,type ContextTarget154}
 from './phase154_context_graph.js';
import type {CategorySchema125,Composition125} from './phase125_compositional_dialogue_frame.js';

export type ScopeIssue165='optional_not_exclusion'|'required_strength_not_preserved'|
 'exclusion_strength_not_preserved'|'conflicting_modifiers'|
 'scope_ambiguous_negation'|'unmapped_hard_quantity'|'unreviewed_source_policy'|
 'ambiguous_scalar_negation';
export interface ConstraintOccurrence165{
 aspectId:string;start:number;end:number;literal:string;
 modifiers:readonly {category:string;literal:string;start:number;end:number}[];
 proposedMeaning:'required'|'excluded'|'optional'|'preferred'|'unresolved';
 frameRole:string|null;interpretationVerified:false;
}
export interface ScopeIssueReceipt165{
 code:ScopeIssue165;span:{start:number;end:number;literal:string};
 aspectId:string|null;needsUserClarification:boolean;
}
export interface CandidateCorrection165{
 aspectId:string;effect:'set_required'|'set_excluded'|'set_optional';
 supportingText:string;status:'unverified_rule_based_candidate';
}
export interface RequestContextAudit165{
 phase:165;kind:'bounded_english_context_audit';
 occurrences:readonly ConstraintOccurrence165[];
 issues:readonly ScopeIssueReceipt165[];
 candidateCorrections:readonly CandidateCorrection165[];
 requiresReview:boolean;canCommitUnreviewedConstraints:boolean;
 originalUserMeaningVerified:false;scientificEvidenceVerified:false;rankingAuthorized:false;
 contextEngine:'existing_phase154_medspacy_inspired_graph';
}
const rules:readonly ContextRule154[]=[
 {literal:"don't need",category:'OPTIONAL',direction:'FORWARD',maxScopeTokens:9},
 {literal:'do not need',category:'OPTIONAL',direction:'FORWARD',maxScopeTokens:9},
 {literal:'no need for',category:'OPTIONAL',direction:'FORWARD',maxScopeTokens:9},
 {literal:'not necessary',category:'OPTIONAL',direction:'BACKWARD',maxScopeTokens:7},
 {literal:"isn't necessary",category:'OPTIONAL',direction:'BACKWARD',maxScopeTokens:7},
 {literal:'not required',category:'OPTIONAL',direction:'BACKWARD',maxScopeTokens:7},
 {literal:'not essential',category:'OPTIONAL',direction:'BACKWARD',maxScopeTokens:7},
 {literal:"don't want",category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:9},
 {literal:'do not want',category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:9},
 {literal:'must not have',category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:9},
 {literal:'without',category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:8},
 {literal:'avoid',category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:8},
 {literal:'exclude',category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:8},
 {literal:'no',category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:6},
 {literal:'must have',category:'REQUIRED',direction:'FORWARD',maxScopeTokens:9},
 {literal:'has to have',category:'REQUIRED',direction:'FORWARD',maxScopeTokens:9},
 {literal:'have to have',category:'REQUIRED',direction:'FORWARD',maxScopeTokens:9},
 {literal:'need',category:'REQUIRED',direction:'FORWARD',maxScopeTokens:8},
 {literal:'required',category:'REQUIRED',direction:'BACKWARD',maxScopeTokens:6},
 {literal:'essential',category:'REQUIRED',direction:'BACKWARD',maxScopeTokens:6},
 {literal:'prefer',category:'PREFERRED',direction:'FORWARD',maxScopeTokens:9},
 {literal:'ideally',category:'PREFERRED',direction:'FORWARD',maxScopeTokens:9},
 {literal:'would like',category:'PREFERRED',direction:'FORWARD',maxScopeTokens:9},
 {literal:'but',category:'CONTRAST_BOUNDARY',direction:'TERMINATE'},
 {literal:'however',category:'CONTRAST_BOUNDARY',direction:'TERMINATE'},
 {literal:'whereas',category:'CONTRAST_BOUNDARY',direction:'TERMINATE'},
 {literal:'instead',category:'CONTRAST_BOUNDARY',direction:'TERMINATE'},
 {literal:'or',category:'ALTERNATIVE_BOUNDARY',direction:'TERMINATE'},
 {literal:',',category:'CLAUSE_SEPARATOR',direction:'TERMINATE'},
 {literal:';',category:'CLAUSE_SEPARATOR',direction:'TERMINATE'},
];
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const phraseRegex=(alias:string)=>new RegExp('(?<![\\p{L}\\p{N}])'+
 escape(alias.trim()).replace(/\\ /g,'\\s+').replace(/\s+/g,'\\s+')+
 '(?![\\p{L}\\p{N}])','giu');
function collectTargets(text:string,schema:CategorySchema125):{
 targets:ContextTarget154[];infos:{id:string;aspectId:string;start:number;end:number}[]}{
 const raw:{aspectId:string;start:number;end:number;id:string}[]=[];
 for(const aspect of schema.aspects)for(const alias of aspect.aliases){
  if(!alias.trim())continue;
  for(const match of text.matchAll(phraseRegex(alias))){
   const start=match.index!,end=start+match[0].length;
   raw.push({aspectId:aspect.id,start,end,id:''});
  }
 }
 // Favor a longer alias when overlapping, but never conflate different aspects.
 const best=raw.filter(a=>!raw.some(b=>b.aspectId===a.aspectId&&
  b.start<=a.start&&b.end>=a.end&&(b.start<a.start||b.end>a.end)));
 const infos=best.sort((a,b)=>a.start-b.start||a.end-b.end||a.aspectId.localeCompare(b.aspectId))
  .map((x,i)=>({...x,id:'req165_'+i}));
 return {infos,targets:infos.map(x=>({id:x.id,start:x.start,end:x.end,type:'user_aspect'}))};
}
function maskEditorialRestrictions(text:string):string{
 // A source policy such as "no customer reviews" must never leak its "no" to
 // an unrelated product feature. Replace in-place to preserve UTF-16 offsets.
 return text.replace(/\b(?:no|not|without|avoid|exclude|don't use|do not use)\s+(?:customer|user|amazon|consumer|shopper|owner)\s+(?:reviews?|ratings?|comments?)\b/gi,
  m=>' '.repeat(m.length));
}
export function auditRequestContext165(text:string,schema:CategorySchema125,
 frame:Composition125|null):RequestContextAudit165{
 if(typeof text!=='string'||text.length<3||text.length>4000||!schema||!Array.isArray(schema.aspects))
  throw Error('invalid_request_context_165');
 const {targets,infos}=collectTargets(text,schema);
 const g=buildContextGraph154(maskEditorialRestrictions(text),targets,rules,400);
 const mods=new Map(g.modifiers.map(m=>[m.id,m]));
 const issues:ScopeIssueReceipt165[]=[];
 const candidateCorrections:CandidateCorrection165[]=[];
 const issue=(code:ScopeIssue165,start:number,end:number,aspectId:string|null)=>{
  if(!issues.some(i=>i.code===code&&i.span.start===start&&i.aspectId===aspectId))
   issues.push({code,span:{start,end,literal:text.slice(start,end)},aspectId,
    needsUserClarification:!['optional_not_exclusion','required_strength_not_preserved',
     'exclusion_strength_not_preserved'].includes(code)});
 };
 const occurrences:ConstraintOccurrence165[]=infos.map(o=>{
  const attached=g.edges.filter(e=>e.targetId===o.id).map(e=>mods.get(e.modifierId)!)
   .filter(x=>!!x&&!['CONTRAST_BOUNDARY','ALTERNATIVE_BOUNDARY','CLAUSE_SEPARATOR'].includes(x.category));
  const classes=[...new Set(attached.map(m=>m.category))];
  const proposedMeaning:ConstraintOccurrence165['proposedMeaning']=classes.length>1?'unresolved':
   classes[0]==='REQUIRED'?'required':classes[0]==='EXCLUDE'?'excluded':
   classes[0]==='OPTIONAL'?'optional':classes[0]==='PREFERRED'?'preferred':'unresolved';
  const frameRole=frame?.aspects.find(a=>a.aspectId===o.aspectId)?.role??null;
  if(classes.length>1)issue('conflicting_modifiers',o.start,o.end,o.aspectId);
  if(proposedMeaning==='optional'&&frameRole==='excluded')
   issue('optional_not_exclusion',o.start,o.end,o.aspectId);
  // "Don't need X" must not be silently stored as a positive X requirement.
  if(proposedMeaning==='optional'&&['required','requested_capability'].includes(frameRole??''))
   issue('optional_not_exclusion',o.start,o.end,o.aspectId);
  if(proposedMeaning==='required'&&frameRole!=='required')
   issue('required_strength_not_preserved',o.start,o.end,o.aspectId);
  if(proposedMeaning==='excluded'&&frameRole!=='excluded'&&frameRole!=='environment_absent')
   issue('exclusion_strength_not_preserved',o.start,o.end,o.aspectId);
  // Rule-based repairs can only modify candidate state, never assert verified
  // user intent. No repair if several occurrences assign incompatible roles.
  if(proposedMeaning==='optional'&&frameRole!==null)candidateCorrections.push({
   aspectId:o.aspectId,effect:'set_optional',supportingText:text.slice(o.start,o.end),
   status:'unverified_rule_based_candidate'});
  if(proposedMeaning==='required'&&frameRole!==null&&frameRole!=='required')candidateCorrections.push({
   aspectId:o.aspectId,effect:'set_required',supportingText:text.slice(o.start,o.end),
   status:'unverified_rule_based_candidate'});
  if(proposedMeaning==='excluded'&&frameRole!==null&&frameRole!=='excluded'&&frameRole!=='environment_absent')
   candidateCorrections.push({aspectId:o.aspectId,effect:'set_excluded',supportingText:text.slice(o.start,o.end),
    status:'unverified_rule_based_candidate'});
  // Missing scope marker e.g. "not steam wand" is dangerous even with a known aspect.
  if(proposedMeaning==='unresolved'){
   const before=text.slice(Math.max(0,o.start-23),o.start);
   if(/\b(?:not|never|hardly)\s+(?:(?:a|an|the)\s+)?$/i.test(before))
    issue('scope_ambiguous_negation',o.start,o.end,o.aspectId);
  }
  return {aspectId:o.aspectId,start:o.start,end:o.end,literal:text.slice(o.start,o.end),
   modifiers:attached.map(m=>({category:m.category,literal:text.slice(m.start,m.end),start:m.start,end:m.end})),
   proposedMeaning,frameRole,interpretationVerified:false};
 });
 // Explicit quantitative requirements and open-ended scalar negatives are not
 // silently reduced to general 'best' or an arbitrary category preference.
 for(const m of text.matchAll(/\b(?:under|below|less than|at most|at least|over|more than|no more than)\s+\d+(?:\.\d+)?\s*(?:cm|mm|m|lit(?:er|re)s?|l|kg|db|dba|watts?|w|kw|minutes?|mins?|hours?|inches?|in\b|ft\b|°c|degrees?)\b/gi))
  issue('unmapped_hard_quantity',m.index!,m.index!+m[0].length,null);
 for(const m of text.matchAll(/\b(?:not too|not very|not overly|not particularly)\s+(?:noisy|loud|expensive|big|large|small|heavy|slow|powerful)\b/gi))
  issue('ambiguous_scalar_negation',m.index!,m.index!+m[0].length,null);
 // Wider source restrictions are obligations, not an automatic independent
 // editor credential. Phase164 already handles the narrow expert-only grammar.
 for(const m of text.matchAll(/\b(?:don't trust|do not trust|ignore|skip|exclude|don't use|do not use)\s+(?:the\s+)?(?:customer|user|amazon|consumer|shopper|owner)\s+(?:reviews?|ratings?|comments?)\b|\bonly\s+(?:objective|laboratory|third.party|hands.on)\s+(?:reviews?|tests?|measurements?)\b/gi))
  issue('unreviewed_source_policy',m.index!,m.index!+m[0].length,null);
 const ordered=issues.sort((a,b)=>a.span.start-b.span.start||a.code.localeCompare(b.code));
 const disputedAspects=new Set(ordered.filter(i=>i.needsUserClarification||i.code==='conflicting_modifiers')
  .map(i=>i.aspectId));
 // A multi-mention contradiction must never be "fixed" by whichever alias is last.
 const correctionGroups=new Map<string,Set<string>>();
 for(const c of candidateCorrections){
  if(!correctionGroups.has(c.aspectId))correctionGroups.set(c.aspectId,new Set());
  correctionGroups.get(c.aspectId)!.add(c.effect);
 }
 const conflicting=[...correctionGroups].filter(([,effects])=>effects.size>1).map(([id])=>id);
 for(const id of conflicting){
  const occurrence=occurrences.find(o=>o.aspectId===id)!;
  issue('conflicting_modifiers',occurrence.start,occurrence.end,id);
  disputedAspects.add(id);
 }
 const finalIssues=issues.sort((a,b)=>a.span.start-b.span.start||a.code.localeCompare(b.code));
 const safeCorrections=candidateCorrections.filter(c=>!disputedAspects.has(c.aspectId))
  .filter((c,i,all)=>all.findIndex(x=>x.aspectId===c.aspectId&&x.effect===c.effect)===i);
 const requiresReview=finalIssues.some(i=>i.needsUserClarification)||g.truncated;
 return {phase:165,kind:'bounded_english_context_audit',occurrences,issues:finalIssues,
  candidateCorrections:safeCorrections,requiresReview,canCommitUnreviewedConstraints:!requiresReview,
  originalUserMeaningVerified:false,scientificEvidenceVerified:false,rankingAuthorized:false,
  contextEngine:'existing_phase154_medspacy_inspired_graph'};
}
