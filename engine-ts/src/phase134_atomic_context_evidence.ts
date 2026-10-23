/**
 * Phase134 — small ORIGINAL, English-first, dependency-free evidence context graph.
 * Engineering inspirations (NOT imported code): medSpaCy ConText scope, DeepKE
 * document relations, Snorkel weak-label audits, GLiNER2 joint constraints,
 * TypeSafe atomic typed decisions. This is an intentionally bounded lexical
 * screen, NOT entailment, a calibrated probabilistic model, or a fact validator.
 */
import {createHash} from 'node:crypto';
import {assertRelationAnchoring131,type CandidateRelation131,type RelationDocument131,type Span131} from './phase131_local_relation_learning.js';
import type {Label132} from './phase132_contextual_relation_guard.js';

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const spanOk=(t:string,s:Span131)=>Number.isSafeInteger(s?.start)&&Number.isSafeInteger(s?.end)&&s.start>=0&&s.end>s.start&&s.end<=t.length;
export type SignalVote134='supports_candidate'|'opposes_candidate'|'abstains';
export interface IndependentSignal134 {id:string;family:string;vote:SignalVote134;version:string;}
export type SignalStatus134='no_signals'|'insufficient_independent_signals'|'aligned_hypothesis'|'conflicting_signals'|'opposing_signals_only';
export interface SignalAudit134 {status:SignalStatus134;supportFamilies:string[];opposeFamilies:string[];abstentions:number;independenceNotVerified:true;}
/** This is a vote audit, NOT a Snorkel label model or accuracy estimate.
 * Family names are supplied assertions and do not prove independence. */
export function auditSignals134(signals:readonly IndependentSignal134[]):SignalAudit134 {
 if(!Array.isArray(signals)||signals.length>20||signals.some(s=>!s||!/^[-\w]{1,70}$/.test(s.id)||!/^[-\w]{1,70}$/.test(s.family)||!s.version||s.version.length>100||
  !(['supports_candidate','opposes_candidate','abstains'] as const).includes(s.vote)))throw Error('invalid_signal_audit');
 const ids=new Set<string>();const groups=new Map<string,Set<SignalVote134>>();let abstentions=0;
 for(const s of signals){if(ids.has(s.id))throw Error('duplicate_signal');ids.add(s.id);if(s.vote==='abstains')abstentions++;
  const g=groups.get(s.family)??new Set<SignalVote134>();g.add(s.vote);groups.set(s.family,g);}
 const supportFamilies=[...groups].filter(([,v])=>v.has('supports_candidate')).map(([k])=>k).sort();
 const opposeFamilies=[...groups].filter(([,v])=>v.has('opposes_candidate')).map(([k])=>k).sort();
 const conflict=opposeFamilies.length>0&&supportFamilies.length>0||[...groups.values()].some(v=>v.has('supports_candidate')&&v.has('opposes_candidate'));
 const status:SignalStatus134=conflict?'conflicting_signals':
  !supportFamilies.length&&!opposeFamilies.length?'no_signals':
  opposeFamilies.length?'opposing_signals_only':supportFamilies.length<2?'insufficient_independent_signals':'aligned_hypothesis';
 return {status,supportFamilies,opposeFamilies,abstentions,independenceNotVerified:true};
}
export type ModifierType134='lack_of_evidence'|'direct_negation'|'uncertainty'|'conditional'|'pseudo_negation'|'attributed_claim'|'ambiguous_negation';
export interface Modifier134 {kind:ModifierType134;span:Span131;literal:string;scope:Span131;target:'relation_pair';}
export type EvidenceStatus134='quarantined_candidate'|'abstain_for_review'|'rejected_candidate'|'invalid_source';
export type ScopeReason134='scope_uncertain'|'cross_clause'|'unsupported_polarity'|'absence_of_evidence_not_proof_of_absence'|
 'attributed_not_independent'|'hypothetical_not_observed'|'signal_conflict'|'source_integrity_failure'|
 'insufficient_independent_signals'|'signal_opposition'|'clear_bounded_context'|'no_cross_document_identity_transfer';
export interface AtomicEvidenceCandidate134 {
 id:string;label:Label132;subjectSpan:Span131;objectSpan:Span131;evidenceSpan:Span131;
 sourceId:string;originalDocumentId:string;documentSha256:string;evidenceSha256:string;
}
export interface AtomicDecision134 {phase:134;candidateId:string;status:EvidenceStatus134;
 modifiers:Modifier134[];signalAudit:SignalAudit134;reasons:ScopeReason134[];
 spanVerified:boolean;sourceVerified:boolean;rankingAuthorized:false;canonicalWriteAuthorized:false;
 /** Always requires scientific/editorial review: lexical polarity != claim truth. */
 independentReviewRequired:true;
}
interface Clause134 {start:number;end:number}
/** Deliberately conservative segmentation: does not attempt general parsing. */
function clauses134(t:string):Clause134[]{
 const out:Clause134[]=[];const separator=/[.!?;](?=\s|$)|\n|\s*,?\s+\b(?:but|however|whereas|although|nevertheless)\b\s+/gi;
 let start=0;for(const hit of t.matchAll(separator)){let end=hit.index!;
  if(end>start)out.push({start,end});start=hit.index!+hit[0].length;}
 if(start<t.length)out.push({start,end:t.length});return out;
}
const patterns:readonly {kind:ModifierType134;re:RegExp}[]=[
 {kind:'pseudo_negation',re:/\bnot\s+(?:only|just)\b/gi},
 {kind:'ambiguous_negation',re:/\b(?:not\s+necessarily|not\s+unlikely|cannot\s+rule\s+out|not\s+impossible)\b/gi},
 {kind:'lack_of_evidence',re:/\b(?:no\s+(?:(?:independent|published|clear|reliable)\s+)?evidence|insufficient\s+evidence|not\s+(?:been\s+)?(?:shown|demonstrated|proven)|does\s+not\s+(?:prove|establish|demonstrate)|cannot\s+(?:prove|establish)|no\s+(?:published\s+)?study\s+(?:shows|demonstrates))\b/gi},
 {kind:'direct_negation',re:/\b(?:does\s+not|did\s+not|do\s+not|cannot|can't|doesn't|didn't|don't|isn't|aren't|won't|wouldn't|couldn't|is\s+not|are\s+not|never|without|no|not|fails?\s+to)\b/gi},
 {kind:'uncertainty',re:/\b(?:may|might|could|possibly|perhaps|appears?\s+to|suggests?)\b/gi},
 {kind:'conditional',re:/\b(?:if|unless|provided\s+that|assuming\s+that|depending\s+on)\b/gi},
 {kind:'attributed_claim',re:/\b(?:the\s+manufacturer\s+(?:claims|says|reports)|according\s+to\s+the\s+manufacturer|the\s+brand\s+claims)\b/gi}
];
/** modifiers are attached to the explicit pair, not promoted to document facts. */
export function modifiersForPair134(text:string,a:Span131,b:Span131):{modifiers:Modifier134[];crossClause:boolean}{
 if(typeof text!=='string'||text.length>250000||!spanOk(text,a)||!spanOk(text,b))throw Error('invalid_context_input');
 const cs=clauses134(text);const locate=(s:Span131)=>cs.find(c=>s.start>=c.start&&s.end<=c.end);
 const ca=locate(a),cb=locate(b);
 if(!ca||!cb||ca.start!==cb.start||ca.end!==cb.end)return {modifiers:[],crossClause:true};
 const chunk=text.slice(ca.start,ca.end);const mods:Modifier134[]=[];
 // More-specific triggers take precedence over generic 'not' and 'no'.
 const taken:Span131[]=[];
 for(const spec of patterns){for(const match of chunk.matchAll(spec.re)){
  const pos=ca.start+match.index!;const end=pos+match[0].length;
  if(taken.some(s=>s.start<end&&pos<s.end))continue;
  // A modifier following *both* entities cannot safely qualify this pair.
  if(pos>=Math.max(a.end,b.end))continue;
  mods.push({kind:spec.kind,span:{start:pos,end},literal:text.slice(pos,end),
   scope:{start:ca.start,end:ca.end},target:'relation_pair'});taken.push({start:pos,end});
 }}
 return {modifiers:mods.sort((x,y)=>x.span.start-y.span.start||x.kind.localeCompare(y.kind)),crossClause:false};
}
function validDocument134(d:RelationDocument131):boolean{
 return !!d&&typeof d.text==='string'&&d.text.length<=250000&&d.sha256===sha(d.text)&&
  !!d.source?.id&&!!d.source?.originalDocumentId&&/^https:\/\//.test(d.source.url);
}
/** No function in this module can authorize truth, learning promotion or ranking. */
export function inspectAtomicCandidate134(args:{document:RelationDocument131;candidate:AtomicEvidenceCandidate134;
 signals?:readonly IndependentSignal134[]}):AtomicDecision134 {
 const {document:d,candidate:c}=args;const signalAudit=auditSignals134(args.signals??[]);
 if(!c||!/^[-\w]{1,100}$/.test(c.id)||!(['measures','contributes_to','conditioned_on','not_evidence_of'] as const).includes(c.label))
  throw Error('invalid_candidate');
 const sourceVerified=validDocument134(d)&&d.source.id===c.sourceId&&d.source.originalDocumentId===c.originalDocumentId&&d.sha256===c.documentSha256;
 const spanVerified=sourceVerified&&spanOk(d.text,c.evidenceSpan)&&spanOk(d.text,c.subjectSpan)&&spanOk(d.text,c.objectSpan)&&
  c.evidenceSpan.start<=c.subjectSpan.start&&c.evidenceSpan.end>=c.subjectSpan.end&&
  c.evidenceSpan.start<=c.objectSpan.start&&c.evidenceSpan.end>=c.objectSpan.end&&
  sha(d.text.slice(c.evidenceSpan.start,c.evidenceSpan.end))===c.evidenceSha256;
 const base={phase:134 as const,candidateId:c.id,signalAudit,sourceVerified,spanVerified,
  rankingAuthorized:false as const,canonicalWriteAuthorized:false as const,independentReviewRequired:true as const};
 if(!spanVerified)return {...base,status:'invalid_source' as const,modifiers:[],reasons:['source_integrity_failure'] as ScopeReason134[]};
 const {modifiers,crossClause}=modifiersForPair134(d.text.slice(c.evidenceSpan.start,c.evidenceSpan.end),
  {start:c.subjectSpan.start-c.evidenceSpan.start,end:c.subjectSpan.end-c.evidenceSpan.start},
  {start:c.objectSpan.start-c.evidenceSpan.start,end:c.objectSpan.end-c.evidenceSpan.start});
 const located=modifiers.map(m=>({...m,span:{start:m.span.start+c.evidenceSpan.start,end:m.span.end+c.evidenceSpan.start},
  scope:{start:m.scope.start+c.evidenceSpan.start,end:m.scope.end+c.evidenceSpan.start}}));
 let status:EvidenceStatus134='quarantined_candidate';const reasons:ScopeReason134[]=[];
 const kinds=new Set(modifiers.map(m=>m.kind));
 if(crossClause){status='abstain_for_review';reasons.push('cross_clause');}
 else if(kinds.has('ambiguous_negation')){status='abstain_for_review';reasons.push('scope_uncertain');}
 else if(kinds.has('direct_negation')||kinds.has('lack_of_evidence')){
  if(c.label==='not_evidence_of'&&kinds.has('lack_of_evidence')&&!kinds.has('direct_negation')){
   reasons.push('absence_of_evidence_not_proof_of_absence');
  }else{status='rejected_candidate';reasons.push('unsupported_polarity');}
 }
 if(kinds.has('uncertainty')||kinds.has('conditional')){
  if(status==='quarantined_candidate')status='abstain_for_review';reasons.push('hypothetical_not_observed');
 }
 if(kinds.has('attributed_claim'))reasons.push('attributed_not_independent');
 if(signalAudit.status==='conflicting_signals'){
  if(status==='quarantined_candidate')status='abstain_for_review';reasons.push('signal_conflict');
 }else if(signalAudit.status==='opposing_signals_only'){
  if(status==='quarantined_candidate')status='abstain_for_review';reasons.push('signal_opposition');
 }else if(signalAudit.status==='insufficient_independent_signals')reasons.push('insufficient_independent_signals');
 if(!reasons.length)reasons.push('clear_bounded_context');
 return {...base,status,modifiers:located,reasons};
}
/** Candidate-set resolver is order-invariant. Opposed hypotheses sharing the
 * same source/span/entity pair must NOT silently turn into a factual consensus. */
export function inspectCandidateSet134(args:{document:RelationDocument131;
 candidates:readonly AtomicEvidenceCandidate134[];signals?:Readonly<Record<string,readonly IndependentSignal134[]>>}):{
 decisions:AtomicDecision134[];overall:'candidates_for_review'|'no_candidates'|'needs_review'|'invalid_source';
 rankingAuthorized:false;
}{
 if(!Array.isArray(args.candidates)||args.candidates.length>50)throw Error('unbounded_candidate_set');
 const ids=new Set<string>();const seen=new Map<string,AtomicEvidenceCandidate134[]>();
 const decisions=args.candidates.map(c=>{
  if(ids.has(c.id))throw Error('duplicate_candidate_id');ids.add(c.id);
  const key=[c.subjectSpan.start,c.subjectSpan.end,c.objectSpan.start,c.objectSpan.end,c.evidenceSpan.start,c.evidenceSpan.end].join(':');
  seen.set(key,[...(seen.get(key)??[]),c]);
  return inspectAtomicCandidate134({document:args.document,candidate:c,signals:args.signals?.[c.id]});
 });
 for(const group of seen.values()){
  if(new Set(group.map(c=>c.label)).size<2)continue;
  for(const d of decisions){if(group.some(c=>c.id===d.candidateId)&&d.status==='quarantined_candidate'){
    d.status='abstain_for_review';d.reasons=[...new Set([...d.reasons,'scope_uncertain' as const])];
  }}
 }
 decisions.sort((a,b)=>a.candidateId.localeCompare(b.candidateId));
 const overall=!decisions.length?'no_candidates':decisions.some(d=>d.status==='invalid_source')?'invalid_source':
  decisions.some(d=>d.status==='abstain_for_review'||d.status==='rejected_candidate')?'needs_review':'candidates_for_review';
 return {decisions,overall,rankingAuthorized:false};
}

/** Phase131 -> Phase134 *explicit adapter*. The upstream classifier remains
 * the source of hypotheses; the new graph only audits them. A PEE caller may
 * route this output to scientific review, never directly to category promotion.
 */
export function inspectLearnedProposal134(args:{document:RelationDocument131;
 proposal:CandidateRelation131;signals?:readonly IndependentSignal134[]}):AtomicDecision134 {
 const {document:d,proposal:p}=args;
 if(!assertRelationAnchoring131(p,d))throw Error('invalid_phase131_provenance_or_scope');
 const candidate:AtomicEvidenceCandidate134={id:sha(JSON.stringify({originalDocumentId:p.originalDocumentId,
   evidenceSha256:p.evidenceSha256,subjectSpan:p.subjectSpan,objectSpan:p.objectSpan,label:p.label})).slice(0,32),
  label:p.label,subjectSpan:p.subjectSpan,objectSpan:p.objectSpan,evidenceSpan:p.evidenceSpan,
  sourceId:p.sourceId,originalDocumentId:p.originalDocumentId,documentSha256:p.sourceContentSha256,
  evidenceSha256:p.evidenceSha256};
 return inspectAtomicCandidate134({document:d,candidate,signals:args.signals});
}
