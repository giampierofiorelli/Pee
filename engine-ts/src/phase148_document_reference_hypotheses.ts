/** Phase148 — bounded discourse-reference candidates over English review text.
 * This is NOT a coreference resolver. A unique surface antecedent is still an
 * unverified proposal. Paragraph changes, competing names and context changes
 * must never silently produce an evidence fact or verified product identity.
 */
import {createHash} from 'node:crypto';
import {readLocalClaimAttachment147, type ClaimAttachment147, type ClaimAttachmentGraph147} from './phase147_local_claim_attachment.js';
import type {ReaderInput139} from './phase139_unmarked_english_candidate_reader.js';
import type {EvidenceSpan144} from './phase144_cross_category_observation_graph.js';

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const surface=(text:string,start:number,end:number):EvidenceSpan144=>({start,end,literal:text.slice(start,end),sha256:sha(text.slice(start,end))});
const normalize=(s:string)=>s.toLocaleLowerCase('en').replace(/^(?:the|this)\s+/,'').replace(/\s+/g,' ').trim();
const word=(c:string)=>/[\p{L}\p{N}]/u.test(c);
interface Unit148 {id:number;paragraphId:number;span:EvidenceSpan144;}
export interface NamedAnchor148 {id:string;sentenceId:number;paragraphId:number;span:EvidenceSpan144;
 nameKey:string;basis:'caller_asserted_page_alias'|'model_shaped_surface';identityAuthenticated:false;}
export type ReferenceDecision148='possible_unique_antecedent_unverified'|'blocked_competing_antecedents'|
 'blocked_paragraph_boundary'|'blocked_competing_nonproduct_referent'|'blocked_context_change'|'blocked_reporting_change'|'blocked_polarity_change'|
 'unresolved_no_antecedent'|'unresolved_unsupported_expression';
export interface ReferenceHypothesis148 {id:string;sentenceId:number;paragraphId:number;mention:EvidenceSpan144;
 form:'pronoun'|'generic_product_description';candidateAnchorIds:string[];
 decision:ReferenceDecision148;reasons:string[];linkedAttachmentIds:string[];
 identityAuthenticated:false;entailmentVerified:false;measurementComparable:false;
 independentReviewRequired:true;canonicalWriteAuthorized:false;rankingAuthorized:false;}
export interface DocumentReferenceGraph148 {phase:148;sourceId:string;originalDocumentId:string;documentSha256:string;
 baseline147:ClaimAttachmentGraph147;sentences:Unit148[];anchors:NamedAnchor148[];references:ReferenceHypothesis148[];
 coverageTruncated:boolean;truncationReasons:string[];
 noCandidateMeaning:'not_extracted_is_not_evidence_of_absence';
 sourceAuthenticated:false;independentGoldAnnotations:0;accuracy:null;
 canonicalWriteAuthorized:false;rankingAuthorized:false;}
function splitSentences(text:string):Unit148[]{
 const out:Unit148[]=[];
 // Paragraph breaks are boundaries even when the preceding line has no full stop.
 let cursor=0,paragraphId=0;
 const para=/\n[ \t]*\n/g;
 const parts:{start:number;end:number;paragraphId:number}[]=[];
 for(const match of text.matchAll(para)){
  parts.push({start:cursor,end:match.index!,paragraphId});cursor=match.index!+match[0].length;paragraphId++;
 }
 parts.push({start:cursor,end:text.length,paragraphId});
 for(const p of parts){let start=p.start;
  const push=(end:number)=>{
   let a=start,b=end;while(a<b&&/\s/.test(text[a]))a++;while(b>a&&/\s/.test(text[b-1]))b--;
   if(a<b)out.push({id:out.length,paragraphId:p.paragraphId,span:surface(text,a,b)});
   start=end;
  };
  // Decimal points (e.g. 1.5) and product codes without whitespace are preserved.
  for(const m of text.slice(p.start,p.end).matchAll(/[.!?](?=\s|$)/g))push(p.start+m.index!+m[0].length);
  push(p.end);
 }
 return out;
}
const nonProductModels=/^(?:hdr|sdr|iso|usb|pcm|dsd|wi-fi|full|hd|4k|8k|uhd|heavy|duty|turbo|eco|cycle|picture|test)\b/i;
const modelPattern=/\b(?:[A-Z][A-Za-z-]+\s+){1,3}[A-Z][A-Za-z-]*\d[A-Za-z\d-]*\b/g;
function anchorsFor(text:string,sentences:Unit148[],aliases:readonly string[]):NamedAnchor148[]{
 const gathered:NamedAnchor148[]=[];
 const add=(s:Unit148,start:number,end:number,basis:NamedAnchor148['basis'])=>{
  const lit=text.slice(start,end),k=normalize(lit);
  if(k.length<3||nonProductModels.test(k)||gathered.some(a=>a.span.start===start&&a.span.end===end))return;
  gathered.push({id:'a148_'+start+'_'+end,sentenceId:s.id,paragraphId:s.paragraphId,
   span:surface(text,start,end),nameKey:k,basis,identityAuthenticated:false});
 };
 for(const s of sentences){
  const t=s.span.literal;
  for(const match of t.matchAll(modelPattern)){
   let a=s.span.start+match.index!,b=a+match[0].length;
   // Remove articles without changing source-character offsets for the model.
   const prefix=/^(?:The|This)\s+/.exec(text.slice(a,b));if(prefix)a+=prefix[0].length;
   add(s,a,b,'model_shaped_surface');
  }
  for(const alias of aliases){
   if(typeof alias!=='string'||alias.length<3||alias.length>120)continue;
   let at=0;const lower=t.toLocaleLowerCase('en'),needle=alias.toLocaleLowerCase('en');
   while((at=lower.indexOf(needle,at))>=0){
    const end=at+needle.length;
    if((at===0||!word(t[at-1]))&&(end===t.length||!word(t[end]))){
     const a=s.span.start+at,b=s.span.start+end;
     // If the automatic candidate is contained in the exact page alias, use only the alias.
     gathered.splice(0,gathered.length,...gathered.filter(v=>!(v.sentenceId===s.id&&v.span.start>=a&&v.span.end<=b)));
     add(s,a,b,'caller_asserted_page_alias');
    }
    at=end;
   }
  }
 }
 return gathered.sort((a,b)=>a.span.start-b.span.start||a.span.end-b.span.end);
}
const competingParts=/\b(?:the|this|that|its|a|an)\s+(?:(?:[A-Za-z-]+)\s+){0,2}(?:cycle|programme|program|test|measurement|setting|mode|filter|battery|dock|screen|picture|remote|driver|brush)\b/gi;
const referencePattern=/\b(?:it|its|they|their|this\s+(?:model|device|unit|player|television|tv|oven|machine|speaker|product)|the\s+(?:unit|player|device))\b/gi;
function attached(s:Unit148,base:ClaimAttachment147[]):ClaimAttachment147[]{
 return base.filter(a=>a.quantity.start>=s.span.start&&a.quantity.end<=s.span.end);
}
function referents(text:string,units:Unit148[],anchors:NamedAnchor148[],attachments:ClaimAttachment147[],maxWindow:number):ReferenceHypothesis148[]{
 const result:ReferenceHypothesis148[]=[];
 for(const s of units){
  for(const m of s.span.literal.matchAll(referencePattern)){
   const a=s.span.start+m.index!,b=a+m[0].length;
   // Literal mention inside a verified? no: caller-asserted product alias is not authenticated either.
   if(anchors.some(v=>a>=v.span.start&&b<=v.span.end))continue;
   const candidates=anchors.filter(v=>v.sentenceId<s.id&&s.id-v.sentenceId<=maxWindow);
   const current=anchors.filter(v=>v.sentenceId===s.id&&v.span.end<=a);
   const available=[...candidates,...current];
   const keys=[...new Set(available.map(v=>v.nameKey))];
   const samePara=available.filter(v=>v.paragraphId===s.paragraphId);
   const sameKeys=[...new Set(samePara.map(v=>v.nameKey))];
   let decision:ReferenceDecision148;let chosen:NamedAnchor148[]=[];
   let reasons:string[]=[];
   if(!available.length){decision='unresolved_no_antecedent';reasons=['no_explicit_named_antecedent_in_window'];}
   else if(sameKeys.length===0){decision='blocked_paragraph_boundary';reasons=['antecedent_only_in_other_paragraph'];}
   else if(keys.length>1||sameKeys.length>1){decision='blocked_competing_antecedents';reasons=['multiple_distinct_surface_products_in_window'];}
   else {
    const prior=samePara.filter(v=>v.nameKey===sameKeys[0]);chosen=prior.slice(-1);
    decision='possible_unique_antecedent_unverified';reasons=['one_compatible_named_surface_not_confirmed_coreference'];
    // A recent component, test, or programme can be the actual antecedent of 'it'.
    // Do not resolve by merely selecting the last named PRODUCT in the document.
    const between=text.slice(chosen[0].span.end,a);
    if([...between.matchAll(competingParts)].length){
     decision='blocked_competing_nonproduct_referent';
     reasons=['recent_component_or_test_could_be_referent'];
    }
    const previousSentence=units.filter(u=>u.id>=chosen[0].sentenceId&&u.id<s.id).at(-1);
    const priorLiteral=previousSentence?.span.literal??'';
    const currentLiteral=s.span.literal;
    const priorClaim=/\b(?:advertis(?:es|ed)|claims?|promises?|manufacturer|maker)\b/i.test(priorLiteral);
    const currentMeasured=/\b(?:measured|recorded|observed|tested|reviewer)\b/i.test(currentLiteral);
    if(priorClaim&&currentMeasured&&decision==='possible_unique_antecedent_unverified'){
      decision='blocked_reporting_change';reasons=['publisher_claim_versus_review_measurement'];
    }
    const observations=attached(s,attachments);
    // A competing reporting channel/mode/polarity is a blocker to transitive evidence.
    const antecedentObservations=attachments.filter(x=>x.quantity.end<=chosen[0].span.end+600&&x.quantity.start>=chosen[0].span.start&&
      units.some(u=>u.id>=chosen[0].sentenceId&&u.id<s.id&&x.quantity.start>=u.span.start&&x.quantity.end<=u.span.end));
    const last=antecedentObservations.at(-1);
    for(const cur of observations){
     if(!last||decision!=='possible_unique_antecedent_unverified')break;
     if(last.attribution!==cur.attribution&&last.attribution!=='undetermined'&&cur.attribution!=='undetermined'){
      decision='blocked_reporting_change';reasons=['claim_or_reporting_channel_changed'];break;
     }
     if(last.polarity!==cur.polarity){decision='blocked_polarity_change';reasons=['polarity_surface_changed'];break;}
     if(last.surfaceMode&&cur.surfaceMode&&last.surfaceMode!==cur.surfaceMode){
      decision='blocked_context_change';reasons=['explicit_measurement_mode_changed'];break;
     }
    }
   }
   const span=surface(text,a,b);
   result.push({id:`r148_${a}_${b}`,sentenceId:s.id,paragraphId:s.paragraphId,mention:span,
    form:/^(?:it|its|they|their)$/i.test(span.literal)?'pronoun':'generic_product_description',
    candidateAnchorIds:(decision==='possible_unique_antecedent_unverified'?chosen:available).map(v=>v.id),
    decision,reasons,linkedAttachmentIds:attached(s,attachments).map(x=>x.id),
    identityAuthenticated:false,entailmentVerified:false,measurementComparable:false,
    independentReviewRequired:true,canonicalWriteAuthorized:false,rankingAuthorized:false});
  }
 }
 return result;
}
export function readDocumentReferences148(input:ReaderInput139,maxReferences=140,maxSentenceWindow=2):DocumentReferenceGraph148{
 if(!Number.isSafeInteger(maxReferences)||maxReferences<1||maxReferences>300||
  !Number.isSafeInteger(maxSentenceWindow)||maxSentenceWindow<1||maxSentenceWindow>4)throw Error('invalid_phase148_budget');
 const base=readLocalClaimAttachment147(input); // original document and source SHA validated in earlier stages
 const text=input.document.text;
 const allSentences=splitSentences(text);
 const sentenceCap=1500;
 const sentences=allSentences.slice(0,sentenceCap);
 const sentenceClipped=allSentences.length>sentenceCap;
 const aliases=input.pageIdentity?.reviewedAliases??[];
 const allAnchors=anchorsFor(text,sentences,aliases);
 const anchorCap=900;const anchors=allAnchors.slice(0,anchorCap);
 const anchorClipped=allAnchors.length>anchorCap;
 const all=referents(text,sentences,anchors,base.attachments,maxSentenceWindow);
 const clipped=all.length>maxReferences;
 const references=all.slice(0,maxReferences);
 return {phase:148,sourceId:base.sourceId,originalDocumentId:base.originalDocumentId,
  documentSha256:base.documentSha256,baseline147:base,sentences,anchors,references,
  coverageTruncated:base.coverageTruncated||clipped||sentenceClipped||anchorClipped,
  truncationReasons:[...base.truncationReasons,...(clipped?['document_reference_budget_exceeded']:[]),
   ...(sentenceClipped?['sentence_scan_budget_exceeded']:[]),...(anchorClipped?['named_anchor_budget_exceeded']:[])],
  noCandidateMeaning:'not_extracted_is_not_evidence_of_absence',
  sourceAuthenticated:false,independentGoldAnnotations:0,accuracy:null,
  canonicalWriteAuthorized:false,rankingAuthorized:false};
}
