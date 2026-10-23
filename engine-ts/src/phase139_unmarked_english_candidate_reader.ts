/** Phase 139. Original bounded English candidate proposal from UNMARKED source text.
 * No marked subject/object spans, relation labels, trained weights, external API,
 * classifier accuracy claim, source authentication, canonical writes or ranking.
 * Heuristic patterns are intentionally incomplete; they must not be confused with
 * full NER, coreference, syntactic parsing or scientific entailment.
 */
import {createHash} from 'node:crypto';
import {modifiersForPair134} from './phase134_atomic_context_evidence.js';
import type {RelationDocument131,Span131} from './phase131_local_relation_learning.js';

const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
const idOk=(v:unknown):v is string=>typeof v==='string'&&/^[a-zA-Z0-9._:-]{1,100}$/.test(v);
const norm=(x:string)=>x.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g,' ').trim();
const word=(c:string)=>/[\p{L}\p{N}]/u.test(c);
const spanValid=(t:string,s:Span131)=>Number.isSafeInteger(s.start)&&Number.isSafeInteger(s.end)&&s.start>=0&&s.end>s.start&&s.end<=t.length;
const tokenRe=/[A-Za-z][A-Za-z0-9-]*/g;
const pronounRe=/\b(?:it|its|they|their)\b/gi;
const actionRe=/\b(?:has|have|delivers?|handles?|collects?|collected|removes?|removed|recogniz(?:e|es|ed)|detects?|detected|improves?|improved|measures?|measured|captures?|captured|achieves?|achieved|performs?|performed|responds?|responded|includes?|included|features?)\b/gi;
const ignorableBefore=new Set(['the','a','an','this','that','closely','related','new','updated','original','our','their']);
const invalidProducts=new Set(['the','this','its','the manufacturer','the reviewer','the closely related','hard floors','power cords','obstacle avoidance','the brand']);
const adjectives=new Set(['outstanding','excellent','strong','good','great','poor','weak','impressive','solid','average','everyday','routine','basic','overall','consistently','always','more','less','much','some','roughly','about','approximately']);
const adverbTail=new Set(['well','poorly','consistently','properly','appropriately','quickly','slowly','effectively','efficiently','successfully','easily']);
const breakWords=new Set(['on','under','over','after','before','while','whereas','although','though','because','with','without','in','at','for','during','but','and','or','which','that','when','from','than','by','through']);
// Structural-feature nominations from a small, domain-neutral lexical pattern.
const featureRe=/\b((?:[a-z][a-z-]*\s+){1,3}(?:system|feature|function|dock|brush|filter|sensor|setting|mode|camera))\b/gi;

export interface PageIdentityHint139 {reviewedProductId:string;reviewedVariantId:string;reviewedAliases:readonly string[];}
export type MentionType139='product_name'|'anaphor'|'feature_phrase'|'outcome_phrase'|'numeric_value';
export type IdentityClaim139='page_alias_asserted_not_authenticated'|'unverified_product_name'|'different_or_unverified_variant'|'unresolved_anaphor'|'not_applicable';
export interface UnmarkedMention139 {id:string;type:MentionType139;span:Span131;literal:string;
 sentenceId:number;identityClaim:IdentityClaim139;productId?:string;variantId?:string;
 detection:'surface_pattern'|'exact_page_alias'|'pronoun_pattern'|'bounded_predicate_pattern';}
export type CandidateDisposition139='candidate_quarantined'|'negative_statement_quarantined'|'unresolved_reference'|
 'variant_not_reviewed'|'missing_measurement_endpoint'|'unresolved_target'|'ambiguous_product_subject'|
 'uncertain_statement'|'lack_of_evidence'|'source_attributed_claim'|'unsupported_context';
export type Pattern139='performance_description'|'numeric_report'|'capability_description'|'feature_description';
export interface UnmarkedPair139 {id:string;subjectMentionId:string;objectMentionId:string|null;
 subjectSpan:Span131;objectSpan:Span131|null;evidenceSpan:Span131;
 pattern:Pattern139|null;status:CandidateDisposition139;reasons:string[];
 /** This field is intentionally not the Phase131 relation label: phrase presence
  * cannot establish causation or even valid measurement comparability. */
 candidateLabel:'untyped_extraction_hypothesis';
 rankingAuthorized:false;canonicalWriteAuthorized:false;scientificReviewRequired:true;}
export interface UnmarkedReader139 {phase:139;documentSha256:string;sourceId:string;originalDocumentId:string;
 mentions:UnmarkedMention139[];pairs:UnmarkedPair139[];sentencesScanned:number;
 anyClaimsScientificallyValidated:false;independentAnnotations:0;
 /** Reaching a configured candidate cap is NOT evidence that no other relations exist. */
 coverageTruncated:boolean;truncationReasons:('mention_limit'|'pair_limit')[];
 sourceAuthenticityVerified:false;rankingAuthorized:false;canonicalWriteAuthorized:false;}
export interface ReaderInput139 {document:RelationDocument131;pageIdentity?:PageIdentityHint139;maxMentions?:number;maxPairs?:number;}
interface Sentence {id:number;span:Span131;}
interface Token {text:string;start:number;end:number;}
function sentences(t:string):Sentence[]{
 const out:Sentence[]=[];let start=0;
 const add=(end:number)=>{let a=start,b=end;while(a<b&&/\s/.test(t[a]))a++;while(b>a&&/\s/.test(t[b-1]))b--;
  if(b>a)out.push({id:out.length,span:{start:a,end:b}});};
 // Split paragraphs and punctuation, not decimal points in measurements.
 for(const m of t.matchAll(/(?:[.!?](?=\s|$)|\n\s*\n)/g)){add(m.index!+m[0].length);start=m.index!+m[0].length;}
 add(t.length);return out;
}
function tokens(t:string,s:Sentence):Token[]{
 return [...t.slice(s.span.start,s.span.end).matchAll(tokenRe)].map(m=>({text:m[0],start:s.span.start+m.index!,end:s.span.start+m.index!+m[0].length}));
}
function modelToken(v:string):boolean{return /\d/.test(v);}
function capital(v:string):boolean{return /^[A-Z][A-Za-z0-9-]*$/.test(v);}
function nameSpans(t:string,s:Sentence,aliases:readonly string[]):{span:Span131;detection:'surface_pattern'|'exact_page_alias'}[]{
 const ts=tokens(t,s);const candidates:{span:Span131;detection:'surface_pattern'|'exact_page_alias'}[]=[];
 for(let k=0;k<ts.length;k++){
  if(!capital(ts[k].text)||ignorableBefore.has(norm(ts[k].text)))continue;
  let j=k;
  while(j+1<ts.length&&j-k<4&&capital(ts[j+1].text)&&
        !ignorableBefore.has(norm(ts[j+1].text))&&/^\s+$/.test(t.slice(ts[j].end,ts[j+1].start)))j++;
  const run=ts.slice(k,j+1);
  if(run.length<2||!run.some(x=>modelToken(x.text))&&run.length<2)continue;
  const raw=t.slice(ts[k].start,ts[j].end);
  if(invalidProducts.has(norm(raw)))continue;
  // A non-numeric name needs >=2 capitalized tokens. Without a model code,
  // apparent proper names remain merely candidates, not product identity.
  candidates.push({span:{start:ts[k].start,end:ts[j].end},detection:'surface_pattern'});
  k=j;
 }
 for(const alias of aliases){
  let at=-1;while((at=t.toLocaleLowerCase('en').indexOf(alias.toLocaleLowerCase('en'),at+1))!==-1){
   const end=at+alias.length;if(at<s.span.start||end>s.span.end)continue;
   if(at>0&&word(t[at-1])||end<t.length&&word(t[end]))continue;
   candidates.push({span:{start:at,end},detection:'exact_page_alias'});
  }
 }
 // Longest matching span wins; alias is preferred for equal spans.
 const sorted=candidates.sort((a,b)=>(b.span.end-b.span.start)-(a.span.end-a.span.start)||
  (a.detection==='exact_page_alias'?-1:1)||(a.span.start-b.span.start));
 const picked:typeof sorted=[];for(const c of sorted){if(!picked.some(x=>c.span.start<x.span.end&&x.span.start<c.span.end))picked.push(c);}
 return picked.sort((a,b)=>a.span.start-b.span.start||a.span.end-b.span.end);
}
function contentTarget(t:string,s:Sentence,action:RegExpExecArray):{span:Span131;pattern:Pattern139;hasEndpoint:boolean}|null{
 const actionEnd=s.span.start+action.index!+action[0].length;
 let start=actionEnd;let rest=t.slice(start,s.span.end);
 // English predicates may carry bounded adverbs, including contracted negation.
 rest=rest.replace(/^\s*(?:(?:not|n't|always|consistently|appropriately|usually|clearly|effectively|reliably|any|more|much|very|quite|particularly|still|also)\s+)*/i,'');
 start=s.span.end-rest.length;
 if(!rest.trim())return null;
 const metric=/^\s*(\d+(?:\.\d+)?\s*%)/.exec(rest);
 if(metric){const at=start+metric[0].indexOf(metric[1]);
  const suffix=t.slice(at+metric[1].length,s.span.end);
  const endpoint=/^\s+of\s+(?:the\s+)?(?:[a-z-]+\s+){0,3}(?:debris|dust|soil|sand|rice|hair|stains?|dirt|particles|water|lint)\b/i.test(suffix);
  return {span:{start:at,end:at+metric[1].length},pattern:'numeric_report',hasEndpoint:endpoint};
 }
 const all=[...t.slice(start,s.span.end).matchAll(tokenRe)].map(m=>({text:m[0],start:start+m.index!,end:start+m.index!+m[0].length}));
 if(!all.length)return null;
 const held:Token[]=[];
 for(const tok of all){if(breakWords.has(norm(tok.text)))break;
  if(held.length>=8)break;
  held.push(tok);
 }
 while(held.length&&(adjectives.has(norm(held[0].text))||/^(a|an|the)$/i.test(held[0].text)))held.shift();
 while(held.length&&adverbTail.has(norm(held[held.length-1].text)))held.pop();
 if(!held.length)return null;
 // An isolated adverb or general outcome adjective is not an entity.
 const literal=t.slice(held[0].start,held[held.length-1].end);
 if(!/[A-Za-z]/.test(literal)||/^(?:well|poorly|more|less|appropriately|better|worse)$/i.test(literal))return null;
 const pattern:Pattern139=/\b(?:has|have|includes?|features?)\b/i.test(action[0])?'feature_description':
  /\b(?:performs?|performed|delivers?|handles?)\b/i.test(action[0])?'performance_description':'capability_description';
 return {span:{start:held[0].start,end:held[held.length-1].end},pattern,hasEndpoint:false};
}
export function readUnmarkedEnglish139(args:ReaderInput139):UnmarkedReader139{
 const d=args?.document;const maxM=args.maxMentions??100,maxP=args.maxPairs??35;
 if(!d||typeof d.text!=='string'||!d.text.trim()||d.text.length>250000||sha(d.text)!==d.sha256||
 !idOk(d.source?.id)||!idOk(d.source?.originalDocumentId)||!/^https:\/\/[^\s/]+\//.test(d.source?.url??'')||
 !Number.isInteger(maxM)||maxM<1||maxM>300||!Number.isInteger(maxP)||maxP<1||maxP>80)throw Error('invalid_document_or_bounds_139');
 const page=args.pageIdentity;
 if(page&&(!idOk(page.reviewedProductId)||!idOk(page.reviewedVariantId)||
 !Array.isArray(page.reviewedAliases)||page.reviewedAliases.length<1||page.reviewedAliases.length>15||
 page.reviewedAliases.some(a=>typeof a!=='string'||a.length<2||a.length>90||!a.trim())))throw Error('invalid_reviewed_page_hint_139');
 const aliases=page?.reviewedAliases??[];const aliasSet=new Set(aliases.map(norm));
 const sentences=sentences139(d.text),mentions:UnmarkedMention139[]=[],pairs:UnmarkedPair139[]=[];
 let mentionLimitReached=false,pairLimitReached=false;
 function add(type:MentionType139,span:Span131,sentenceId:number,identityClaim:IdentityClaim139,
  detection:UnmarkedMention139['detection'],nameInfo?:{productId?:string;variantId?:string}){
  if(!spanValid(d.text,span))throw Error('invalid_generated_span_139');
  const existing=mentions.find(m=>m.span.start===span.start&&m.span.end===span.end&&m.type===type);
  if(existing)return existing;
  if(mentions.length>=maxM){mentionLimitReached=true;return null;}
  const m:UnmarkedMention139={id:`m${String(span.start).padStart(6,'0')}_${type}`,
   type,span,literal:d.text.slice(span.start,span.end),sentenceId,identityClaim,detection,...nameInfo};
  mentions.push(m);return m;
 }
 for(const s of sentences){
  for(const n of nameSpans(d.text,s,aliases)){
   const raw=d.text.slice(n.span.start,n.span.end),isAlias=aliasSet.has(norm(raw));
   // Suffix changes (e.g. PE -> FE) must not inherit page-reviewed identity.
   const sim=!!page&&aliases.some(a=>{
    const u=norm(a).split(/\s+/),v=norm(raw).split(/\s+/);
    return !isAlias&&u.length>=2&&v.length>=2&&u.slice(0,-1).join(' ')===v.slice(0,-1).join(' ');
   });
   const identity:IdentityClaim139=isAlias?'page_alias_asserted_not_authenticated':
    sim?'different_or_unverified_variant':'unverified_product_name';
   add('product_name',n.span,s.id,identity,n.detection,isAlias&&page?{
    productId:page.reviewedProductId,variantId:page.reviewedVariantId}:undefined);
  }
  for(const p of d.text.slice(s.span.start,s.span.end).matchAll(pronounRe)){
   const start=s.span.start+p.index!;
   add('anaphor',{start,end:start+p[0].length},s.id,'unresolved_anaphor','pronoun_pattern');
  }
  const raw=d.text.slice(s.span.start,s.span.end);
  for(const feature of raw.matchAll(featureRe)){
   const phrase=feature[1];const leading=/^(?:(?:its|their|the|a|an|this|that|has|have|includes?|features?|with|contains?|of|on|for)\s+)*/i.exec(phrase)?.[0].length??0;
   const start=s.span.start+feature.index!+leading,end=s.span.start+feature.index!+phrase.length;
   if(start<end)add('feature_phrase',{start,end},s.id,'not_applicable','bounded_predicate_pattern');
  }
  for(const action of raw.matchAll(actionRe)){
   if(pairs.length>=maxP){pairLimitReached=true;break;}
   const verbStart=s.span.start+action.index!;
   const before=mentions.filter(m=>m.sentenceId===s.id&&m.span.end<=verbStart&&
    (m.type==='product_name'||m.type==='anaphor'));
   // Do not resolve competing same-clause entities by mere proximity.
   const names=before.filter(m=>m.type==='product_name');
   let subject:UnmarkedMention139|undefined;
   const pronouns=before.filter(m=>m.type==='anaphor');
   if(pronouns.length&&(!names.length||pronouns[pronouns.length-1].span.start>names[names.length-1].span.start))
    subject=pronouns[pronouns.length-1];
   else subject=names[names.length-1];
   if(!subject)continue;
   const subjectAmbiguous=names.length>1&&subject.type==='product_name';
   const t=contentTarget(d.text,s,action);
   const object=t?add(t.pattern==='numeric_report'?'numeric_value':'outcome_phrase',t.span,s.id,
    'not_applicable','bounded_predicate_pattern'):null;
   const reasons:string[]=[];
   let status:CandidateDisposition139='candidate_quarantined';
   if(subjectAmbiguous){status='ambiguous_product_subject';reasons.push('multiple_explicit_names_precede_predicate');}
   else if(subject.type==='anaphor'){status='unresolved_reference';reasons.push('no_verified_coreference_link');}
   else if(subject.identityClaim==='different_or_unverified_variant'){
    status='variant_not_reviewed';reasons.push('similar_name_does_not_prove_same_variant');}
   else if(!object){status='unresolved_target';reasons.push('predicate_target_not_found_or_bounded');}
   else if(t?.pattern==='numeric_report'&&!t.hasEndpoint){status='missing_measurement_endpoint';
    reasons.push('number_has_no_explicit_measured_endpoint');}
   if(object){
    const context=modifiersForPair134(d.text.slice(s.span.start,s.span.end),
     {start:subject.span.start-s.span.start,end:subject.span.end-s.span.start},
     {start:object.span.start-s.span.start,end:object.span.end-s.span.start});
    const mods=new Set(context.modifiers.map(m=>m.kind));
    if(context.crossClause&&status==='candidate_quarantined'){
     status='unsupported_context';reasons.push('cross_clause_or_bounded_scope');}
    else if(mods.has('lack_of_evidence')&&status==='candidate_quarantined'){
     status='lack_of_evidence';reasons.push('absence_of_evidence_not_proof_of_ineffectiveness');}
    else if(mods.has('direct_negation')&&status==='candidate_quarantined'){
     status='negative_statement_quarantined';reasons.push('direct_negation_never_positive_evidence');}
    else if((mods.has('uncertainty')||mods.has('conditional')||mods.has('ambiguous_negation'))&&status==='candidate_quarantined'){
     status='uncertain_statement';reasons.push('uncertain_or_conditional_scope');}
    if(mods.has('attributed_claim')&&status==='candidate_quarantined'){
     status='source_attributed_claim';reasons.push('manufacturer_attribution_not_independent');}
   }
   if(!reasons.length)reasons.push('unreviewed_bounded_textual_pattern');
   const o=object??null;
   pairs.push({id:`pair_${subject.span.start}_${verbStart}`,subjectMentionId:subject.id,objectMentionId:o?.id??null,
    subjectSpan:subject.span,objectSpan:o?.span??null,evidenceSpan:s.span,pattern:t?.pattern??null,
    status,reasons,candidateLabel:'untyped_extraction_hypothesis',rankingAuthorized:false,
    canonicalWriteAuthorized:false,scientificReviewRequired:true});
  }
 }
 mentions.sort((a,b)=>a.span.start-b.span.start||a.type.localeCompare(b.type));
 pairs.sort((a,b)=>a.evidenceSpan.start-b.evidenceSpan.start||a.id.localeCompare(b.id));
 return {phase:139,documentSha256:d.sha256,sourceId:d.source.id,
  originalDocumentId:d.source.originalDocumentId,mentions,pairs,sentencesScanned:sentences.length,
  anyClaimsScientificallyValidated:false,independentAnnotations:0,
  coverageTruncated:mentionLimitReached||pairLimitReached,
  truncationReasons:[...(mentionLimitReached?['mention_limit' as const]:[]),...(pairLimitReached?['pair_limit' as const]:[])],
  sourceAuthenticityVerified:false,
  rankingAuthorized:false,canonicalWriteAuthorized:false};
}
// Named separately so offset and sentence segmentation are stable across callers.
const sentences139=sentences;
