/** Phase 149 — source-anchored, *unverified* bidirectional reference hypotheses.
 * A forward or cross-paragraph candidate is a POSSIBLE textual interpretation,
 * not entity identity, scientifically verified evidence or permission to rank.
 * This module does not implement full coreference, bridging or NLI.
 */
import {createHash} from 'node:crypto';
import {readDocumentReferences148, type DocumentReferenceGraph148, type NamedAnchor148, type ReferenceHypothesis148} from './phase148_document_reference_hypotheses.js';
import type {ReaderInput139} from './phase139_unmarked_english_candidate_reader.js';
import type {EvidenceSpan144} from './phase144_cross_category_observation_graph.js';

const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
const span=(text:string,a:number,b:number):EvidenceSpan144=>({start:a,end:b,literal:text.slice(a,b),sha256:digest(text.slice(a,b))});
const norm=(v:string)=>v.toLocaleLowerCase('en').replace(/^(?:the|this)\s+/,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const parts=(v:string)=>norm(v).split(/\s+/).filter(Boolean);
const nonProduct=/\b(?:the|this|that|its|a|an)\s+(?:(?:\w[\w-]*)\s+){0,2}(?:cycle|programme|program|test|measurement|setting|mode|filter|battery|dock|screen|picture|remote|driver|brush|basket|grill|probe)\b/gi;
const currentClaim=/\b(?:advertis(?:es|ed|ing)|claims?|promises?|manufacturer|maker|according to (?:the )?(?:brand|manufacturer))\b/i;
const reviewMeasurement=/\b(?:measured|recorded|observed|tested|in our tests|our measurements|reviewer)\b/i;
const mode=/\b(?:HDR|SDR|eco mode|turbo mode|grill mode|air fry mode)\b/gi;
const comparisonTarget=/\b(?:similar\s+to|compared\s+(?:with|to)|unlike|versus|vs\.?|than|against|relative\s+to|in\s+contrast\s+to)\b/i;
const descript=/\b(?:this|the)\s+(?:model|device|unit|player|television|tv|oven|machine|speaker|product|air fryer|washing machine)\b/gi;

export type Direction149='backward_existing'|'forward_same_paragraph'|'cross_paragraph';
export type Status149='prior_candidate_unverified'|'prior_blocked'|'forward_candidate_unverified'|'cross_paragraph_candidate_unverified'|
 'blocked_competing_candidates'|'blocked_variant_collision'|'blocked_nonproduct_competitor'|'blocked_reporting_transition'|
 'blocked_mode_transition'|'blocked_comparison_target'|'unresolved_no_safe_candidate';
export interface Proposal149 {id:string;mention:EvidenceSpan144;paragraphId:number;sentenceId:number;
 direction:Direction149|null;status:Status149;candidateAnchorIds:string[];baselineDecision:string|null;
 reasons:string[];sourceEvidenceSha256:string;identityAuthenticated:false;entailmentVerified:false;
 sourceAuthenticated:false;independentReviewRequired:true;canonicalWriteAuthorized:false;rankingAuthorized:false;}
export interface SurfaceCluster149 {nameKey:string;anchorIds:string[];identityAuthenticated:false;
 /** Equal normalized spellings are NOT evidence that model revisions/regions match. */
 samePhysicalProductVerified:false;}
export interface VariantWarning149 {leftAnchorId:string;rightAnchorId:string;kind:'shared_model_stem_variant_not_equivalent';}
export interface BidirectionalDocumentGraph149 {phase:149;sourceId:string;originalDocumentId:string;documentSha256:string;
 baseline148:DocumentReferenceGraph148;proposals:Proposal149[];surfaceClusters:SurfaceCluster149[];
 variantWarnings:VariantWarning149[];coverageTruncated:boolean;truncationReasons:string[];
 noCandidateMeaning:'not_extracted_is_not_evidence_of_absence';independentGoldAnnotations:0;accuracy:null;
 sourceAuthenticated:false;canonicalWriteAuthorized:false;rankingAuthorized:false;}

function variantPair(a:NamedAnchor148,b:NamedAnchor148):boolean{
 const x=parts(a.span.literal),y=parts(b.span.literal);
 if(x.length===0||y.length===0||a.nameKey===b.nameKey)return false;
 const [short,long]=x.length<=y.length?[x,y]:[y,x];
 // A family name alone is not enough. Require at least one shared model-code token.
 if(!short.some(v=>/\d/.test(v))||!short.every((v,i)=>v===long[i]))return false;
 return long.length>short.length;
}
const unique=(items:NamedAnchor148[])=>{
 const byKey=new Map<string,NamedAnchor148>();
 for(const x of items)byKey.set(x.nameKey,x);
 return [...byKey.values()];
};
function shape(text:string,s:DocumentReferenceGraph148['sentences'][number],start:number,end:number,
 baseline:ReferenceHypothesis148|null,ids:string[],direction:Direction149|null,status:Status149,reasons:string[]):Proposal149{
 const evidence=span(text,start,end);
 return {id:'p149_'+start+'_'+end,mention:evidence,paragraphId:s.paragraphId,sentenceId:s.id,
  direction,status,candidateAnchorIds:ids,baselineDecision:baseline?.decision??null,
  reasons,sourceEvidenceSha256:evidence.sha256,identityAuthenticated:false,entailmentVerified:false,
  sourceAuthenticated:false,independentReviewRequired:true,canonicalWriteAuthorized:false,rankingAuthorized:false};
}
function resolveForward(text:string,base:DocumentReferenceGraph148,ref:ReferenceHypothesis148|null,
 sentence:DocumentReferenceGraph148['sentences'][number],start:number,end:number,maxFuture:number):Proposal149{
 // Restrict new links to explicit generic product descriptions; 'it/its/they' cannot be safely inferred forward.
 const literal=text.slice(start,end);
 if(!/^(?:this|the)\s+/i.test(literal))return shape(text,sentence,start,end,ref,[],null,'unresolved_no_safe_candidate',['forward_pronoun_resolution_not_supported']);
 const forward=base.anchors.filter(a=>a.sentenceId>=sentence.id && a.sentenceId<=sentence.id+maxFuture &&
  a.span.start>=end && a.paragraphId===sentence.paragraphId);
 const byName=unique(forward);
 if(!byName.length)return shape(text,sentence,start,end,ref,[],null,'unresolved_no_safe_candidate',['no_forward_named_anchor_within_same_paragraph']);
 const variant=byName.some((a,i)=>byName.slice(i+1).some(b=>variantPair(a,b)));
 if(variant)return shape(text,sentence,start,end,ref,forward.map(a=>a.id),'forward_same_paragraph','blocked_variant_collision',['similarly_named_variants_are_not_interchangeable']);
 if(byName.length>1)return shape(text,sentence,start,end,ref,forward.map(a=>a.id),'forward_same_paragraph','blocked_competing_candidates',['multiple_forward_named_products']);
 if(comparisonTarget.test(text.slice(end,byName[0].span.start))||/\b(?:similar|comparable)\b[^.!?]{0,100}\bto\s+(?:the\s+)?$/i.test(text.slice(end,byName[0].span.start)))
  return shape(text,sentence,start,end,ref,byName.map(a=>a.id),'forward_same_paragraph','blocked_comparison_target',['named_surface_is_comparison_target_not_identified_referent']);
 if([...text.slice(end,byName[0].span.start).matchAll(nonProduct)].length)
  return shape(text,sentence,start,end,ref,byName.map(a=>a.id),'forward_same_paragraph','blocked_nonproduct_competitor',['intervening_accessory_or_test']);
 return shape(text,sentence,start,end,ref,byName.map(a=>a.id),'forward_same_paragraph','forward_candidate_unverified',['forward_surface_alignment_only','identity_not_confirmed']);
}
function resolveParagraph(text:string,base:DocumentReferenceGraph148,ref:ReferenceHypothesis148,
 sentence:DocumentReferenceGraph148['sentences'][number]):Proposal149{
 const prev=base.anchors.filter(a=>a.paragraphId===sentence.paragraphId-1 && a.span.start<ref.mention.start);
 const uniqueNames=unique(prev);
 const variant=uniqueNames.some((a,i)=>uniqueNames.slice(i+1).some(b=>variantPair(a,b)));
 if(variant)return shape(text,sentence,ref.mention.start,ref.mention.end,ref,prev.map(a=>a.id),'cross_paragraph',
  'blocked_variant_collision',['adjacent_paragraph_contains_distinct_model_variants']);
 if(uniqueNames.length!==1)return shape(text,sentence,ref.mention.start,ref.mention.end,ref,prev.map(a=>a.id),'cross_paragraph',
  uniqueNames.length>1?'blocked_competing_candidates':'unresolved_no_safe_candidate',['cross_paragraph_requires_one_named_surface']);
 const anchor=uniqueNames[0];
 const priorPara=base.sentences.filter(s=>s.paragraphId===sentence.paragraphId-1).map(s=>s.span.literal).join(' ');
 const currentPara=base.sentences.filter(s=>s.paragraphId===sentence.paragraphId).map(s=>s.span.literal).join(' ');
 if([...text.slice(anchor.span.end,ref.mention.start).matchAll(nonProduct)].length)
  return shape(text,sentence,ref.mention.start,ref.mention.end,ref,[anchor.id],'cross_paragraph',
   'blocked_nonproduct_competitor',['competing_component_across_paragraph_boundary']);
 if(currentClaim.test(priorPara)&&reviewMeasurement.test(currentPara))
  return shape(text,sentence,ref.mention.start,ref.mention.end,ref,[anchor.id],'cross_paragraph',
   'blocked_reporting_transition',['manufacturer_claim_vs_reviewer_measurement']);
 const lastMode=[...priorPara.matchAll(mode)].at(-1)?.[0]?.toLowerCase();
 const firstMode=[...currentPara.matchAll(mode)][0]?.[0]?.toLowerCase();
 if(lastMode&&firstMode&&lastMode!==firstMode)
  return shape(text,sentence,ref.mention.start,ref.mention.end,ref,[anchor.id],'cross_paragraph',
   'blocked_mode_transition',['explicit_test_mode_changed']);
 return shape(text,sentence,ref.mention.start,ref.mention.end,ref,[anchor.id],'cross_paragraph',
  'cross_paragraph_candidate_unverified',['adjacent_paragraph_single_surface_only','no_verified_discourse_coreference']);
}
export function readBidirectionalDocument149(input:ReaderInput139,maxProposals=200,maxFutureSentences=2):BidirectionalDocumentGraph149{
 if(!Number.isSafeInteger(maxProposals)||maxProposals<1||maxProposals>400||
  !Number.isSafeInteger(maxFutureSentences)||maxFutureSentences<1||maxFutureSentences>3)throw Error('invalid_phase149_bounds');
 const base=readDocumentReferences148(input,300,4);
 const text=input.document.text;
 const proposals:Proposal149[]=[];const seen=new Set<string>();
 for(const r of base.references){
  const s=base.sentences[r.sentenceId];let p:Proposal149;
  if(r.decision==='possible_unique_antecedent_unverified')p=shape(text,s,r.mention.start,r.mention.end,r,r.candidateAnchorIds,'backward_existing',
   'prior_candidate_unverified',['phase148_unique_surface_still_unverified']);
  else if(r.decision==='blocked_paragraph_boundary'&&r.form==='generic_product_description'&&
   r.mention.start===s.span.start)p=resolveParagraph(text,base,r,s);
  else if(r.decision==='unresolved_no_antecedent')p=resolveForward(text,base,r,s,r.mention.start,r.mention.end,maxFutureSentences);
  else p=shape(text,s,r.mention.start,r.mention.end,r,r.candidateAnchorIds,null,'prior_blocked',['phase148_'+r.decision]);
  proposals.push(p);seen.add(`${r.mention.start}:${r.mention.end}`);
 }
 // Support 'the model' which Phase148 does not parse; never silently invent a product.
 for(const s of base.sentences){
  for(const m of s.span.literal.matchAll(descript)){
   const a=s.span.start+m.index!,b=a+m[0].length;
   if(seen.has(`${a}:${b}`)||base.anchors.some(x=>a>=x.span.start&&b<=x.span.end))continue;
   const earlier=base.anchors.filter(x=>x.span.end<=a&&x.paragraphId===s.paragraphId&&s.id-x.sentenceId<=4);
   if(earlier.length){
    const names=unique(earlier);const variant=names.some((x,i)=>names.slice(i+1).some(y=>variantPair(x,y)));
    proposals.push(shape(text,s,a,b,null,earlier.map(x=>x.id),'backward_existing',
     variant?'blocked_variant_collision':names.length>1?'blocked_competing_candidates':'prior_candidate_unverified',
     ['previous_explicit_surface_only','not_verified_identity']));
   }else proposals.push(resolveForward(text,base,null,s,a,b,maxFutureSentences));
   seen.add(`${a}:${b}`);
  }
 }
 proposals.sort((a,b)=>a.mention.start-b.mention.start||a.mention.end-b.mention.end);
 const clusters=new Map<string,string[]>();for(const a of base.anchors)clusters.set(a.nameKey,[...(clusters.get(a.nameKey)??[]),a.id]);
 const surfaceClusters=[...clusters.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([nameKey,anchorIds])=>({
  nameKey,anchorIds,identityAuthenticated:false as const,samePhysicalProductVerified:false as const}));
 const warnings:VariantWarning149[]=[];
 for(let i=0;i<base.anchors.length;i++)for(let j=i+1;j<base.anchors.length;j++){
  if(variantPair(base.anchors[i],base.anchors[j]))warnings.push({leftAnchorId:base.anchors[i].id,
   rightAnchorId:base.anchors[j].id,kind:'shared_model_stem_variant_not_equivalent'});
  if(warnings.length>=300)break;
 }
 const limited=proposals.length>maxProposals;
 return {phase:149,sourceId:base.sourceId,originalDocumentId:base.originalDocumentId,
  documentSha256:base.documentSha256,baseline148:base,proposals:proposals.slice(0,maxProposals),
  surfaceClusters,variantWarnings:warnings,coverageTruncated:base.coverageTruncated||limited||warnings.length>=300,
  truncationReasons:[...base.truncationReasons,...(limited?['reference_proposal_budget_exceeded']:[]),
   ...(warnings.length>=300?['variant_warning_budget_reached']:[])],
  noCandidateMeaning:'not_extracted_is_not_evidence_of_absence',independentGoldAnnotations:0,accuracy:null,
  sourceAuthenticated:false,canonicalWriteAuthorized:false,rankingAuthorized:false};
}
