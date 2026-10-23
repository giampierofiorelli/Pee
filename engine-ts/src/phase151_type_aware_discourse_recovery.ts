/** Phase151: conservative textual-reference candidate recovery.
 * Makes NO entity identity, scientific truth, source-authenticity or ranking claim.
 * Recovery of a textual subject does NOT transfer experimental observations,
 * conditions, causal attribution or manufacturer claims between sentences.
 */
import {createHash} from 'node:crypto';
import {readBidirectionalDocument149, type BidirectionalDocumentGraph149, type Proposal149} from './phase149_bidirectional_discourse_candidates.js';
import type {NamedAnchor148} from './phase148_document_reference_hypotheses.js';
import type {ReaderInput139} from './phase139_unmarked_english_candidate_reader.js';
import type {EvidenceSpan144} from './phase144_cross_category_observation_graph.js';

const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const norm=(v:string)=>v.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const genericProduct=/^(?:this|the)\s+(?:model|device|unit|player|television|tv|oven|machine|speaker|product|air fryer|washing machine)$/i;
const discourseBreak=/\b(?:unlike|compared\s+(?:with|to)|similar\s+to|relative\s+to|versus|vs\.?|against|in contrast to|different\s+from|instead\s+of)\b/i;
const contrastStatement=/\b(?:not\s+the\s+same\s+(?:model|unit|device|player)|another\s+(?:model|unit|device|player)|the\s+other\s+(?:model|unit|device|player)|(?:a\s+)?different\s+(?:model|unit|device|player)|replaced\s+by)\b/i;
const reportCue=/\b(?:manufacturer|maker|claims?|advertis(?:es|ed|ing)|promises?|packaging|specifications?)\b/i;
const measuredCue=/\b(?:measured|recorded|observed|tested|in\s+our\s+tests|reviewer|laboratory)\b/i;
// A safety-only guard for a plausible *unindexed* multi-token model code.
// It never creates identity or a relation; it can only force abstention.
const spacedModelCode=/\b[A-Z][a-z][A-Za-z-]{2,}\s+[A-Z]{1,5}\s+\d{2,5}\b/g;
const modeCue=/\b(?:HDR|SDR|eco mode|turbo mode|grill mode|air fry mode)\b/gi;
const bounded=(v:number,min:number,max:number)=>Number.isSafeInteger(v)&&v>=min&&v<=max;

export type RecoveryDecision151='typed_backward_candidate_unverified'|'typed_forward_candidate_unverified'|
 'typed_cross_paragraph_candidate_unverified'|'retained_phase149'|'abstain_multiple_named_products'|
 'abstain_variant_collision'|'abstain_explicit_comparison'|'abstain_context_too_distant'|
 'abstain_missing_named_product'|'abstain_only_pronoun'|'abstain_unsupported_form';
export interface RecoveryProposal151 {
 id:string;mention:EvidenceSpan144;decision:RecoveryDecision151;candidateAnchorIds:string[];
 baselineStatus:Proposal149['status'];reasons:string[];subjectType:'product_description'|'pronoun'|'other';
 evidenceChannelSeparated:boolean;experimentalContextTransferAuthorized:false;
 identityAuthenticated:false;entailmentVerified:false;sourceAuthenticated:false;
 independentReviewRequired:true;canonicalWriteAuthorized:false;rankingAuthorized:false;
}
export interface DocumentRecovery151 {
 phase:151;sourceId:string;originalDocumentId:string;documentSha256:string;
 baseline149:BidirectionalDocumentGraph149;proposals:RecoveryProposal151[];coverageTruncated:boolean;
 sourceAuthenticated:false;independentGoldAnnotations:0;accuracy:null;
 noCandidateMeaning:'no_safe_textual_link_does_not_mean_absence_of_product_evidence';
 canonicalWriteAuthorized:false;rankingAuthorized:false;
}
function surface(text:string,s:number,e:number):EvidenceSpan144{
 return {start:s,end:e,literal:text.slice(s,e),sha256:hash(text.slice(s,e))};
}
function variants(anchors:NamedAnchor148[]):boolean{
 for(let i=0;i<anchors.length;i++)for(let j=i+1;j<anchors.length;j++){
  const x=norm(anchors[i].span.literal).split(' '),y=norm(anchors[j].span.literal).split(' ');
  const [short,long]=x.length<y.length?[x,y]:[y,x];
  if(short.length===long.length||!short.some(t=>/\d/.test(t)))continue;
  if(short.every((t,k)=>t===long[k]))return true;
 }
 return false;
}
function unique(anchors:NamedAnchor148[]):NamedAnchor148[]{
 const map=new Map<string,NamedAnchor148[]>();
 for(const a of anchors)map.set(a.nameKey,[...(map.get(a.nameKey)??[]),a]);
 return [...map.values()].map(a=>a[a.length-1]);
}
function containsUnindexedModelCode(text:string,sentenceParagraph:{start:number;end:number},anchors:NamedAnchor148[]):boolean{
 const section=text.slice(sentenceParagraph.start,sentenceParagraph.end);
 for(const m of section.matchAll(spacedModelCode)){
  const start=sentenceParagraph.start+m.index!,end=start+m[0].length;
  if(!anchors.some(a=>a.span.start<=start&&a.span.end>=end))return true;
 }
 return false;
}
function paragraphBounds(text:string,span:EvidenceSpan144):{start:number;end:number}{
 const before=text.slice(0,span.start),last=[...before.matchAll(/\n[ \t]*\n/g)].at(-1);
 const start=last?last.index!+last[0].length:0;
 const next=/\n[ \t]*\n/.exec(text.slice(span.end));
 return {start,end:next?span.end+next.index:text.length};
}
function anyChange(text:string,anchor:NamedAnchor148,mention:EvidenceSpan144):boolean{
 const between=text.slice(Math.min(anchor.span.end,mention.end),Math.max(anchor.span.start,mention.start));
 return reportCue.test(between)&&measuredCue.test(between) ||
  reportCue.test(text.slice(anchor.span.start,anchor.span.end+150))&&measuredCue.test(text.slice(mention.end,mention.end+130));
}
function proposal(text:string,p:Proposal149,decision:RecoveryDecision151,anchors:NamedAnchor148[],reasons:string[]):RecoveryProposal151{
 return {id:'p151_'+p.mention.start+'_'+p.mention.end,
  mention:surface(text,p.mention.start,p.mention.end),decision,
  candidateAnchorIds:anchors.map(a=>a.id),baselineStatus:p.status,reasons,
  subjectType:genericProduct.test(p.mention.literal)?'product_description':/^(?:it|its|they|their)$/i.test(p.mention.literal)?'pronoun':'other',
  evidenceChannelSeparated:anchors.some(a=>anyChange(text,a,p.mention)),
  experimentalContextTransferAuthorized:false,identityAuthenticated:false,entailmentVerified:false,
  sourceAuthenticated:false,independentReviewRequired:true,canonicalWriteAuthorized:false,rankingAuthorized:false};
}
/** One bounded pass over existing source-anchored hypotheses. Never reads annotation gold. */
export function recoverTypedDocumentReferences151(input:ReaderInput139,maxProposals=200,maxForwardSentences=5,maxForwardChars=900):DocumentRecovery151 {
 if(!bounded(maxProposals,1,400)||!bounded(maxForwardSentences,1,8)||!bounded(maxForwardChars,100,2000))
  throw Error('invalid_phase151_bounds');
 const graph=readBidirectionalDocument149(input,Math.max(maxProposals,200),2);
 const base=graph.baseline148,text=input.document.text;
 const out:RecoveryProposal151[]=[];
 for(const p of graph.proposals){
  const sent=base.sentences[p.sentenceId];
  if(!sent)throw Error('invalid_phase151_sentence_reference');
  const lit=p.mention.literal;
  const typed=genericProduct.test(lit);
  const oldAnchors=p.candidateAnchorIds.map(id=>base.anchors.find(a=>a.id===id)).filter((x):x is NamedAnchor148=>!!x);
  const emit=(d:RecoveryDecision151,a:NamedAnchor148[],r:string[])=>out.push(proposal(text,p,d,a,r));
  const currentSentence=sent.span.literal;
  // Recheck *existing* Phase149 proposals: a baseline tentative link is not a
  // safe exemption from an explicit comparison or newly discovered competitor.
  if(typed&&(discourseBreak.test(currentSentence)||contrastStatement.test(currentSentence))){
   emit('abstain_explicit_comparison',oldAnchors,['comparison_or_explicit_identity_contrast_in_reference_sentence']);continue;
  }
  if(typed&&p.status==='forward_candidate_unverified'){
   if(containsUnindexedModelCode(text,paragraphBounds(text,p.mention),base.anchors)){
    emit('abstain_multiple_named_products',oldAnchors,['unindexed_model_code_might_be_second_product']);continue;
   }
   const future=base.anchors.filter(a=>a.paragraphId===sent.paragraphId&&a.span.start>=p.mention.end);
   if(variants(future)) {emit('abstain_variant_collision',future,['additional_named_variant_after_reference']);continue;}
   if(unique(future).length>1){emit('abstain_multiple_named_products',future,['another_named_product_after_proposed_forward_link']);continue;}
   const between=oldAnchors.length?text.slice(p.mention.end,oldAnchors[0].span.start):'';
   if(contrastStatement.test(between)||discourseBreak.test(between)){
    emit('abstain_explicit_comparison',oldAnchors,['intervening_forward_contrast']);continue;
   }
  }
  if(['prior_candidate_unverified','forward_candidate_unverified','cross_paragraph_candidate_unverified'].includes(p.status)){
   emit('retained_phase149',oldAnchors,['phase149_preexisting_unverified_candidate']);continue;
  }
  if(!typed){emit(/^(?:it|its|they|their)$/i.test(lit)?'abstain_only_pronoun':'abstain_unsupported_form',oldAnchors,
   ['no_new_pronoun_coreference_inference']);continue;}
  // Only named models in the immediately preceding paragraph may be considered.
  // A basket, filter or programme is not automatically a competing PRODUCT when
  // the referential NP literally says "this model", but still blocks bare "it".
  const prev=unique(base.anchors.filter(a=>a.paragraphId===sent.paragraphId-1&&a.span.end<=p.mention.start));
  const currentBefore=unique(base.anchors.filter(a=>a.paragraphId===sent.paragraphId&&a.span.end<=p.mention.start));
  if(['blocked_nonproduct_competitor','prior_blocked','blocked_reporting_transition','blocked_mode_transition'].includes(p.status)){
   const candidates=p.direction==='cross_paragraph'||p.baselineDecision==='blocked_paragraph_boundary'?prev:currentBefore;
   if(variants(candidates)){emit('abstain_variant_collision',candidates,['model_family_variants_are_not_equivalent']);continue;}
   if(candidates.length>1){emit('abstain_multiple_named_products',candidates,['multiple_distinct_product_surfaces']);continue;}
   if(candidates.length===1){
    const a=candidates[0];
    const intervening=text.slice(a.span.end,p.mention.start);
    if(contrastStatement.test(intervening)||discourseBreak.test(intervening)){
     emit('abstain_explicit_comparison',[a],['intervening_identity_contrast']);continue;
    }
    emit(p.direction==='cross_paragraph'||p.baselineDecision==='blocked_paragraph_boundary'? 
     'typed_cross_paragraph_candidate_unverified':'typed_backward_candidate_unverified',[a],
     ['literal_product_type_excludes_component_as_referent','identity_still_unverified','observation_transfer_forbidden']);continue;
   }
  }
  if(p.status==='blocked_variant_collision'||p.status==='blocked_competing_candidates'){
   emit(p.status==='blocked_variant_collision'?'abstain_variant_collision':'abstain_multiple_named_products',oldAnchors,
    ['phase149_competing_named_surfaces_not_overridden']);continue;
  }
  if(p.baselineDecision==='blocked_paragraph_boundary'&&prev.length===1){
   const a=prev[0],intervening=text.slice(a.span.end,p.mention.start);
   if(contrastStatement.test(intervening)||discourseBreak.test(intervening)){
    emit('abstain_explicit_comparison',[a],['intervening_identity_contrast']);continue;
   }
   emit('typed_cross_paragraph_candidate_unverified',[a],['adjacent_paragraph_unique_named_product','observations_not_transferred']);continue;
  }
  // Forward referent: a later explicit model in the same paragraph, not a
  // comparison target, with no second competing product anywhere in the paragraph.
  if(p.status==='unresolved_no_safe_candidate'||p.baselineDecision==='unresolved_no_antecedent'){
   if(containsUnindexedModelCode(text,paragraphBounds(text,p.mention),base.anchors)){
    emit('abstain_multiple_named_products',[],['unindexed_model_code_might_be_second_product']);continue;
   }
   const priorNamed=unique(base.anchors.filter(a=>a.paragraphId===sent.paragraphId&&a.span.end<=p.mention.start));
   if(priorNamed.length){emit('abstain_multiple_named_products',priorNamed,['forward_resolution_with_prior_product_antecedent_is_ambiguous']);continue;}
   const allFuture=base.anchors.filter(a=>a.paragraphId===sent.paragraphId&&a.span.start>=p.mention.end);
   const close=unique(allFuture.filter(a=>a.sentenceId-sent.id<=maxForwardSentences&&
    a.span.start-p.mention.end<=maxForwardChars));
   if(variants(allFuture)){emit('abstain_variant_collision',allFuture,['forward_model_variants_compete']);continue;}
   if(unique(allFuture).length>1){emit('abstain_multiple_named_products',allFuture,['multiple_future_named_products']);continue;}
   if(!close.length){emit(allFuture.length?'abstain_context_too_distant':'abstain_missing_named_product',[],
    ['no_single_named_forward_product_inside_bounds']);continue;}
   const a=close[0],between=text.slice(p.mention.end,a.span.start);
   if(discourseBreak.test(between)||contrastStatement.test(between)){
    emit('abstain_explicit_comparison',[a],['forward_named_surface_only_comparison_target']);continue;
   }
   // Named subject appears in same paragraph: candidate, not proof of coreference.
   emit('typed_forward_candidate_unverified',[a],['bounded_forward_named_product_surface','not_a_verified_entity_link']);continue;
  }
  emit('abstain_unsupported_form',oldAnchors,['no_supported_typed_recovery_path']);
 }
 out.sort((a,b)=>a.mention.start-b.mention.start||a.mention.end-b.mention.end);
 const truncated=out.length>maxProposals;
 return {phase:151,sourceId:graph.sourceId,originalDocumentId:graph.originalDocumentId,
  documentSha256:graph.documentSha256,baseline149:graph,proposals:out.slice(0,maxProposals),
  coverageTruncated:graph.coverageTruncated||truncated,sourceAuthenticated:false,independentGoldAnnotations:0,accuracy:null,
  noCandidateMeaning:'no_safe_textual_link_does_not_mean_absence_of_product_evidence',
  canonicalWriteAuthorized:false,rankingAuthorized:false};
}
