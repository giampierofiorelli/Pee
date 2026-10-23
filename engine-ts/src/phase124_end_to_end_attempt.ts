/** Phase124: auditable attempt to connect question -> uncertainty -> local retrieval
 * -> source/product attribution review -> evidence gaps.  It deliberately does
 * NOT produce a public ranking. An absence of locally verified evidence must
 * lead to source acquisition, never to a guessed winner.
 * Fully native TypeScript: no SaaS, hosted LLM or search API dependency.
 */
import {createHash} from 'node:crypto';
import {type NativeModel123,planNativeResearch123} from './phase123_native_learned_intent.js';
import {searchLocalGoalCandidates123} from './phase123_local_semantic_evidence_bridge.js';
import {planQuestionResearch122,type Context122} from './phase122_native_question_to_research.js';
import {searchInternalPassages122} from './phase122_native_local_retrieval.js';
import type {IndexedPassage122} from './phase122_native_local_retrieval.js';

const digest=(s:string)=>createHash('sha256').update(s,'utf8').digest('hex');
const safeId=(x:string)=>/^[a-z][a-z0-9_]{1,100}$/.test(x);
export interface CuratedAnchor124 {
  /** Reviewed manually against an original source; not automatically authenticated. */
  reviewRecordId:string;
  sourceIdentity:string;
  sourceUrl:string;
  exactProductId:string;
  /** Digest of the exact source passage stored in local corpus. */
  passageSha256:string;
  passageId:string;
  /** A source that mentions two products is not automatically evidence for both. */
  reviewerRecordedProducts:readonly string[];
}
export interface Attribution124 {passageId:string;exactProductId:string;
  status:'curated_anchor_match'|'quarantined';reasons:readonly string[];
  /** Neither matching an anchor nor BM25 proves the actual source was fetched. */
  originalSourceAuthenticated:false;measurementValidated:false;
}
/** Integrity check only. The human-reviewed registry itself remains outside
 * the trust boundary and must have separate editorial controls. */
export function auditAttribution124(passage:IndexedPassage122,
 exactProductId:string,anchors:readonly CuratedAnchor124[]):Attribution124 {
 if(!safeId(exactProductId)||!safeId(passage.passageId))throw Error('invalid_attribution_input');
 if(!Array.isArray(anchors)||anchors.length>10000)throw Error('invalid_curated_anchor_register');
 const matches=anchors.filter(x=>x.passageId===passage.passageId);
 const reasons:string[]=[];
 if(!passage.rightsReviewed)reasons.push('rights_not_reviewed');
 if(matches.length!==1)reasons.push('missing_or_ambiguous_reviewed_anchor');
 if(matches.length===1){const a=matches[0];
  if(!safeId(a.reviewRecordId)||!safeId(a.sourceIdentity)||!safeId(a.exactProductId)||
   !a.reviewerRecordedProducts.every(safeId))reasons.push('invalid_curated_anchor');
  if(a.sourceUrl!==passage.sourceUrl||a.sourceIdentity!==passage.sourceIdentity)
   reasons.push('source_url_or_identity_mismatch');
  if(digest(passage.text)!==a.passageSha256)reasons.push('passage_content_changed');
  if(a.exactProductId!==exactProductId||
    !a.reviewerRecordedProducts.includes(exactProductId))reasons.push('product_misattribution');
 }
 return {passageId:passage.passageId,exactProductId,
  status:reasons.length?'quarantined':'curated_anchor_match',reasons,
  originalSourceAuthenticated:false,measurementValidated:false};
}
export type AttemptState124='needs_category_context'|'needs_constraint_adjudication'|
 'needs_semantic_adjudication'|'new_goal_research_required'|'source_acquisition_required'|
 'candidate_sources_found';
export interface EndToEndAttempt124 {phase:124;questionSha256:string;
 state:AttemptState124;modelHash:string;
 interpretation:{learnedLabel:string|null;status:string;legacyObjective:string|null;
  conflictingHypotheses:boolean;categoryEstablished:boolean};
 obligations:readonly string[];
 retrieval:{attemptedQueries:number;candidateHits:readonly {passageId:string;sourceUrl:string;
  lexicalScore:number;registryStatus:'unreviewed_candidate'|'curated_match_needs_source_authentication'}[];
  localCorpusSize:number;externalWebSearchExecuted:false};
 nextActions:readonly string[];
 /** There is no automatic move from local candidate retrieval to approved facts. */
 sourceFactsVerified:false;measurementComparabilityVerified:false;
 originalSourceAuthenticated:false;publicRankingAuthorized:false;
}
/** An actual executable pipeline attempt, not a simulated ranking. The research
 * query is interpreted and run against a supplied local corpus. Online discovery
 * needs a separately approved, rights-aware source-acquisition step. */
export function attemptResearch124(model:NativeModel123,question:string,
 context:Context122,passages:readonly IndexedPassage122[],
 anchors:readonly CuratedAnchor124[]):EndToEndAttempt124 {
 const zero={candidateCount:0,verifiedMetricKeys:[] as [],
  hasIndependentlyReviewedQualityPolicy:false,protocolComparable:false};
 const plan=planNativeResearch123(model,question,zero,context);
 const local=searchLocalGoalCandidates123(plan,passages);
 // A known bounded Phase122 interpretation may propose *research obligations*
 // even when the learned classifier abstains. This does NOT promote the old
 // hypothesis to an accepted intent or grant ranking permissions.
 const legacyResearch=planQuestionResearch122(question,zero,context);
 const canUseLegacyResearch=plan.proposal.status!=='needs_constraint_review'&&
   !plan.parserDisagreement&&legacyResearch.intent.queryState==='bounded_proposal'&&
   legacyResearch.intent.objective!==null;
 const legacyHits=canUseLegacyResearch?
   searchInternalPassages122(legacyResearch,passages,5):null;
 const combinedHits=new Map<string,{passageId:string;sourceUrl:string;lexicalScore:number}>();
 for(const h of local.hits)combinedHits.set(h.passageId,{...h});
 for(const result of legacyHits?.results||[])for(const h of result.hits){
   const old=combinedHits.get(h.passageId);
   if(!old||h.lexicalScore>old.lexicalScore)combinedHits.set(h.passageId,h);
 }
 const retrieved=[...combinedHits.values()].sort((a,b)=>
   b.lexicalScore-a.lexicalScore||a.passageId.localeCompare(b.passageId));
 const anchorByPassage=new Map<string,CuratedAnchor124[]>();
 for(const a of anchors){const list=anchorByPassage.get(a.passageId)||[];
   list.push(a);anchorByPassage.set(a.passageId,list);}
 const hits=retrieved.map(h=>{
  const p=passages.find(p=>p.passageId===h.passageId);
  const a=anchorByPassage.get(h.passageId)||[];
  const match=p&&a.length===1&&a[0].sourceUrl===p.sourceUrl&&
    a[0].sourceIdentity===p.sourceIdentity&&digest(p.text)===a[0].passageSha256&&
    p.rightsReviewed&&a[0].reviewerRecordedProducts.includes(a[0].exactProductId);
  return {passageId:h.passageId,sourceUrl:h.sourceUrl,lexicalScore:h.lexicalScore,
   registryStatus:match?'curated_match_needs_source_authentication' as const:
     'unreviewed_candidate' as const};
 });
 const state:AttemptState124=plan.next==='request_context'?'needs_category_context':
  plan.next==='review_constraints'?'needs_constraint_adjudication':
  plan.next==='semantic_review'?'needs_semantic_adjudication':
  plan.next==='investigate_unknown_goal'?(hits.length?'new_goal_research_required':'source_acquisition_required'):
  hits.length?'candidate_sources_found':'source_acquisition_required';
 const nextActions:string[]=[];
 if(plan.parserDisagreement)nextActions.push('independently_adjudicate_conflicting_intent_hypotheses');
 if(canUseLegacyResearch&&plan.proposal.status!=='proposed')
  nextActions.push('review_legacy_intent_hypothesis_not_accepted_as_ground_truth');
 if(state==='needs_category_context')nextActions.push('obtain_category_context_without_guessing');
 if(state==='needs_constraint_adjudication')nextActions.push('resolve_negation_scope_and_user_constraints');
 if(state==='needs_semantic_adjudication')nextActions.push('human_or_validated_semantic_review');
 if(state==='new_goal_research_required')nextActions.push('independently_define_requested_capability_from_original_sources');
 if(state==='source_acquisition_required')nextActions.push('execute_authorized_in_house_source_discovery_and_acquisition');
 if(hits.length)nextActions.push('authenticate_original_sources_and_exact_product_ids');
 if(hits.length)nextActions.push('extract_and_validate_original_measurements_and_comparable_methods');
 if(plan.unmet.length)nextActions.push('resolve_evidence_obligations_before_comparison');
 return {phase:124,questionSha256:digest(question),state,modelHash:model.hash,
  interpretation:{learnedLabel:plan.proposal.label,status:plan.proposal.status,
    legacyObjective:plan.legacyBoundedCandidate,conflictingHypotheses:plan.parserDisagreement,
    categoryEstablished:plan.proposal.establishedContext},
  obligations:[...new Set([...plan.unmet,...(canUseLegacyResearch?legacyResearch.unknowns:[])])],
  retrieval:{attemptedQueries:local.attemptedQueries+(legacyHits?.queriesAttempted||0),
    candidateHits:hits,localCorpusSize:local.countOfRightsAssertedPassages,
    externalWebSearchExecuted:false},nextActions,
  sourceFactsVerified:false,measurementComparabilityVerified:false,
  originalSourceAuthenticated:false,publicRankingAuthorized:false};
}
