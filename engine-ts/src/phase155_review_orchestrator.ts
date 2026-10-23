/** Phase155: review-aware cooperation across Phase153 inventory, medSpaCy-derived
 * scoped context (Phase154), and Snorkel-derived vote diagnostics (Phase154).
 * Original upstream sources/licences are retained in third_party/phase154_reference_sources.
 * This module proposes a reversible reading ledger; it NEVER authenticates a
 * commercial identity, source, metric, scientific test, or ranking.
 */
import {createHash} from 'node:crypto';
import type {ReaderInput139} from './phase139_unmarked_english_candidate_reader.js';
import {analyzeEnglishProductDocument154, type IntegratedReview154} from './phase154_integrated_review.js';
import {buildContextGraph154,PRODUCT_REVIEW_CONTEXT_RULES154,type ContextGraph154} from './phase154_context_graph.js';
import {analyzeLabelMatrix154,type LFAnalysis154} from './phase154_label_diagnostics.js';

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const norm=(s:string)=>s.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const whole=(text:string,start:number,end:number)=>start>=0&&end<=text.length&&
 (start===0||!/[\p{L}\p{N}]/u.test(text[start-1]))&&(end===text.length||!/[\p{L}\p{N}]/u.test(text[end]));
const span=(text:string,start:number,end:number)=>({start,end,literal:text.slice(start,end),sha256:sha(text.slice(start,end))});
export type ReviewRole155='reviewed_surface'|'comparison_surface'|'variant_surface'|'unresolved';
export interface ReviewMention155 {id:string;surface:string;span:ReturnType<typeof span>;
 role:ReviewRole155;roleVotes:number[];votingConflict:boolean;
 sources:('phase153'|'explicit_model_shape'|'variant_table'|'title_correspondence')[];reviewedVariantCode:boolean;
 contextCategories:string[];identityVerified:false;canonicalWriteAuthorized:false;rankingAuthorized:false;}
export interface ReviewRelation155 {id:string;subjectMentionId:string|null;objectMentionId:string;
 relation:'comparison'|'similarity'|'variant_of'|'unresolved';evidence:ReturnType<typeof span>;
 justification:'same_sentence_explicit_surfaces'|'local_comparison_with_page_subject';
 validatedRelation:false;requiresHumanReview:true;}
export interface ReviewMeasurement155{id:string;label:ReturnType<typeof span>;quantity:ReturnType<typeof span>;
 value:number;unit:'%'|'dBA'|'cu_ft'|'other';
 reportingClass:'advertised_specification'|'publisher_test_observation_candidate';
 subjectMentionId:string|null;assignment:'review_page_context_unverified'|'unresolved';
 scientificEvidenceVerified:false;canonicalWriteAuthorized:false;rankingAuthorized:false;}
export interface OrchestratedReview155 {phase:155;sourceUrl:string;documentSha256:string;
 baseline:IntegratedReview154;mentions:ReviewMention155[];context:ContextGraph154;
 relations:ReviewRelation155[];measurements:ReviewMeasurement155[];
 voteDiagnostics:LFAnalysis154;voteNames:string[];unresolved:string[];
 truncationReasons:string[];sourceAuthenticated:false;independentlyAnnotated:false;
 canonicalWriteAuthorized:false;rankingAuthorized:false;}
const MODEL=/(?<![\p{L}\p{N}])([A-Z][\p{L}&'-]{1,22}(?:[ \t]+(?:&[ \t]+)?(?:[A-Z][\p{L}&'-]{1,16}|\d{1,4})){0,5})[ \t]+([A-Z]{1,6}[A-Z0-9+\-]*\d[A-Z0-9+\-]{2,})(?![\p{L}\p{N}])/gu;
const weakPrefix=new Set(['the','this','that','our','its','a','an','however','popular','model','code','finish','black','white']);
const STRUCTURAL=/\n|\r/;
const tableHeader=/^model code\s*\|\s*finish\s*$/im;
const variantRow=/^\s*([A-Z][A-Z0-9+\-]*\d[A-Z0-9+\-]{2,})\s*\|\s*([^|\r\n]{2,35})\s*$/gm;
const LABEL_METRIC=/\b(?:moisture retention|humidity level|noise during cooling cycle|usable refrigerator volume|usable freezer volume|advertised refrigerator volume|advertised freezer volume|24-hour ice production|shelf gradient|door bin offset)\b/i;
// Parse only explicit line-oriented label/value observations, not quantities
// inferred from nearby prose; detect values generically, not from SKU tables.
const QUANTITY_LINE=/^\s*(\d+(?:\.\d+)?)\s*(%|dBA|cu\.\s*ft\.)\s*(?:\([^\n]*\))?\s*$/i;

/** Deterministic, opt-in source reading. Review identity and metrics remain
 * unverified even when page title, body and source role correspond. */
export function analyzeEnglishReview155(input:ReaderInput139):OrchestratedReview155 {
 const text=input.document.text;
 if(typeof text!=='string'||text.length>2_000_000||sha(text)!==input.document.sha256)throw Error('invalid_source_digest_155');
 const baseline=analyzeEnglishProductDocument154(input);
 type Draft={start:number;end:number;sources:Set<ReviewMention155['sources'][number]>;};
 const found=new Map<string,Draft>();let capped=false;
 function add(start:number,end:number,source:ReviewMention155['sources'][number]){
  if(end-start>140||end<=start||!whole(text,start,end))return;
  const key=`${start}:${end}`;if(found.has(key)){found.get(key)!.sources.add(source);return;}
  if(found.size>=700){capped=true;return;}
  found.set(key,{start,end,sources:new Set([source])});
 }
 // The earlier inventory is preserved unchanged for comparison, but no
 // multi-line candidate may pass through as a commercial model surface.
 for(const m of baseline.mentions){const s=m.contextualTargetSpan,l=text.slice(s.start,s.end);
  if(!STRUCTURAL.test(l)&&l.length<140)add(s.start,s.end,'phase153');
 }
 // Model-shaped mentions within actual prose, independently of category.
 for(const m of text.matchAll(MODEL)){
  const first=m[1].split(/\s+/).at(0)!.toLowerCase();
  if(weakPrefix.has(first))continue;
  add(m.index!,m.index!+m[0].length,'explicit_model_shape');
 }
 // A layout boundary (heading/row) is not inter-token whitespace. Existing
 // Phase153 odd table/header spans are therefore not copied into the ledger.
 const vm=tableHeader.exec(text);
 let variantStart=-1,variantEnd=-1;
 if(vm){variantStart=vm.index+vm[0].length;const remainder=text.slice(variantStart);
  const after=/\n\s*(?:Popular Refrigerator Comparisons|Test Results|Performance|Design|Our Verdict)\s*\n/i.exec(remainder);
  variantEnd=after?variantStart+after.index:Math.min(text.length,variantStart+1500);
  const section=text.slice(variantStart,variantEnd);
  for(const m of section.matchAll(variantRow)){
   const pos=variantStart+m.index!+m[0].indexOf(m[1]);add(pos,pos+m[1].length,'variant_table');
  }
 }
 const title=norm(input.document.source.title??'');
 const raw=[...found.values()].sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start));
 // A longer mention may contain a phase153 shortened one; select full
 // explicit name at identical start only. Other overlapping proposed surfaces
 // are quarantined rather than silently merged.
 const chosen:Draft[]=[];
 for(const d of raw){const prior=chosen.findIndex(x=>x.start<d.end&&d.start<x.end);
  if(prior<0){chosen.push(d);continue;}
  const old=chosen[prior];if(old.start===d.start&&d.end>old.end){for(const s of old.sources)d.sources.add(s);chosen[prior]=d;}
  else if(old.start===d.start&&old.end>=d.end){for(const s of d.sources)old.sources.add(s);}
 }
 chosen.sort((a,b)=>a.start-b.start||a.end-b.end);
 const titleMatches=chosen.filter(d=>title.includes(norm(text.slice(d.start,d.end)))&&
    /\d/.test(text.slice(d.start,d.end))&&!((variantStart>=0)&&(d.start>=variantStart&&d.end<=variantEnd)));
 const explicitTitleModel=titleMatches.length?titleMatches[0]:null;
 const pageSurfaceKey=explicitTitleModel?norm(text.slice(explicitTitleModel.start,explicitTitleModel.end)):null;
 // Page title gives a strong SOURCE-CORRESPONDENCE signal, not independent
 // commercial identity verification, and never licenses database writes.
 const all:ReviewMention155[]=chosen.map(d=>{
  const literal=text.slice(d.start,d.end),key=norm(literal);
  const isVariant=d.sources.has('variant_table');
  const reviewedCode=pageSurfaceKey?.split(' ').at(-1)??'';
  const reviewedVariantCode=isVariant&&key===reviewedCode;
  const matchesTitle=!!pageSurfaceKey&&key===pageSurfaceKey;
  const excerpt=text.slice(Math.max(0,d.start-160),Math.min(text.length,d.end+100));
  const comparator=/(?:\b(?:competition|competitor|alternative|comparing|compare|versus|vs\.?|better than|mechanical twin|mechanically identical|similar to|identical to|standouts like)\b)/i.test(excerpt);
  // Single-purpose, independent LF votes: 0 reviewed, 1 variant, 2 comparison.
  const votes=[matchesTitle?0:-1,isVariant?1:-1,
   comparator&&!matchesTitle&&!isVariant?2:-1];
  const nonabstain=votes.filter(x=>x!==-1);const conflict=new Set(nonabstain).size>1;
  const role:ReviewRole155=conflict?'unresolved':isVariant&&!matchesTitle?'variant_surface':
   matchesTitle?'reviewed_surface':comparator?'comparison_surface':'unresolved';
  const sources=[...d.sources].sort() as ReviewMention155['sources'];
  if(matchesTitle)sources.push('title_correspondence');
  return {id:`r155_${d.start}_${d.end}`,surface:literal,span:span(text,d.start,d.end),role,
   roleVotes:votes,votingConflict:conflict,sources,reviewedVariantCode,contextCategories:[],
   identityVerified:false as const,canonicalWriteAuthorized:false as const,rankingAuthorized:false as const};
 });
 // Written-surface role evidence propagates only as a tentative discourse role;
 // it never merges product identities or verifies a specification.
 for(const m of all){
  if(m.role!=='unresolved')continue;
  const roles=new Set(all.filter(x=>norm(x.surface)===norm(m.surface)&&x.role!=='unresolved').map(x=>x.role));
  if(roles.size===1&&roles.has('comparison_surface'))m.role='comparison_surface';
 }
 // Context (medSpaCy-derived) receives corrected spans, never heading-spanning
 // Phase153 targets; no `not` generic rule that would negate product identity.
 const context=buildContextGraph154(text,all.map(m=>({id:m.id,start:m.span.start,end:m.span.end,type:'commercial_mention'})),PRODUCT_REVIEW_CONTEXT_RULES154);
 for(const m of all)m.contextCategories=[...new Set(context.edges.filter(e=>e.targetId===m.id).map(e=>e.category))].sort();
 const voteNames=['review_title_match','variant_row','local_comparison_phrase'];
 const voteDiagnostics=analyzeLabelMatrix154(all.map(m=>m.roleVotes),voteNames);
 // Sentence-level relationships: explicit model mentions must be in a bounded
 // sentence, or a comparison lexical cue must identify an alternative against
 // the page reviewed surface. The graph only proposes, never merges products.
 const sentences:{start:number;end:number}[]=[];let last=0;
 for(const m of text.matchAll(/[.!?](?=\s|$)|\n\s*\n/g)){
  if(m.index!>last)sentences.push({start:last,end:m.index!+m[0].length});last=m.index!+m[0].length;
 }
 if(last<text.length)sentences.push({start:last,end:text.length});
 const primary=all.find(m=>m.role==='reviewed_surface'&&m.sources.includes('title_correspondence'));
 const relations:ReviewRelation155[]=[];
 for(const sentence of sentences){const part=text.slice(sentence.start,sentence.end);
  const comparison=/\b(?:competit(?:ion|or)|compared?|better than|similar|mechanical twin|mechanically identical|identical|variant of|alternative|versus|standouts like)\b/i.test(part);
  if(!comparison)continue;
  const residents=all.filter(m=>m.span.start>=sentence.start&&m.span.end<=sentence.end);
  const others=residents.filter(m=>m.role!=='reviewed_surface'&&m.role!=='variant_surface'&&
     m.surface!==primary?.surface&&/[A-Za-z]/.test(m.surface));
  for(const target of others){
   const pageBrand=primary?.surface.split(/\s+/)[0]??'';
   const brandOnly=!!pageBrand&&new RegExp(`\\b(?:the\\s+)?${pageBrand}\\b`,'i').test(part)&&
     !residents.some(m=>m.surface.startsWith(pageBrand+' ')&&m.role!=='reviewed_surface');
   const within=residents.some(m=>m.role==='reviewed_surface')||
    (primary!==undefined&&(brandOnly||/(?:\bcompetit(?:ion|or)\b|\bcompar(?:e|ed|ing)\b|\balternative\b|\bmechanically identical\b|\bversus\b|\bstandouts like\b)/i.test(part)));
   if(!within)continue;
   const relation=/\bvariant of\b/i.test(part)?'variant_of':/\bmechanical twin\b|\bmechanically identical\b|\bidentical\b/i.test(part)?'similarity':'comparison';
   relations.push({id:`rel155_${target.span.start}_${sentence.start}`,subjectMentionId:primary?.id??null,
    objectMentionId:target.id,relation,evidence:span(text,sentence.start,sentence.end),
    justification:residents.some(m=>m.role==='reviewed_surface')?'same_sentence_explicit_surfaces':'local_comparison_with_page_subject',
    validatedRelation:false,requiresHumanReview:true});
  }
 }
 // Section-anchored metrics read ONLY from explicit source label/value lines.
 // No scientific acceptance or cross-model comparability follows from this.
 const measurements:ReviewMeasurement155[]=[];
 const lines=[...text.matchAll(/[^\r\n]+/g)].map(m=>({literal:m[0],start:m.index!,end:m.index!+m[0].length}));
 for(let i=0;i+1<lines.length;i++){
  const label=lines[i],value=lines[i+1];if(!LABEL_METRIC.test(label.literal)||label.literal.length>70)continue;
  const match=QUANTITY_LINE.exec(value.literal);if(!match)continue;
  const unit=match[2].toLowerCase().startsWith('cu')?'cu_ft':match[2]==='%'?'%':'dBA';
  const vs=value.literal.indexOf(match[1]);const ve=value.literal.indexOf(match[2],vs+match[1].length)+match[2].length;
  measurements.push({id:`metric155_${value.start}`,label:span(text,label.start,label.end),
   quantity:span(text,value.start+vs,value.start+ve),value:Number(match[1]),unit,
   subjectMentionId:primary?.id??null,assignment:primary?'review_page_context_unverified':'unresolved',
   reportingClass:/^advertised\b/i.test(label.literal)?'advertised_specification':'publisher_test_observation_candidate',
   scientificEvidenceVerified:false,canonicalWriteAuthorized:false,rankingAuthorized:false});
 }
 const unresolved:string[]=[];
 if(!primary)unresolved.push('review_subject_not_reconciled_with_page_title');
 if(all.some(m=>m.votingConflict))unresolved.push('conflicting_role_votes_require_review');
 if(baseline.truncated||context.truncated||capped)unresolved.push('candidate_coverage_incomplete');
 if(variantStart===-1)unresolved.push('no_explicit_variant_table_detected');
 return {phase:155,sourceUrl:input.document.source.url,documentSha256:sha(text),baseline,
  mentions:all,context,relations,measurements,voteDiagnostics,voteNames,unresolved,
  truncationReasons:[...baseline.reasons,...context.reasons,...(capped?['phase155_candidate_budget_exceeded']:[])],
  sourceAuthenticated:false,independentlyAnnotated:false,canonicalWriteAuthorized:false,rankingAuthorized:false};
}
