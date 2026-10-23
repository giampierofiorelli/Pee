/**
 * Phase159 — auditable bridge for genuinely executed GLiNER2.5 *external*
 * Colab diagnostics. The runner is NOT bundled, weights/checkpoint revision
 * are NOT authenticated, and this is NOT model inference within PEE.
 *
 * Coordinates source-aligned neural entity spans, phase156 heuristic mentions,
 * medSpaCy-inspired context, and Snorkel-inspired vote diagnostics. A neural
 * confidence is not accuracy, a mention is not product identity, and a value
 * in an authored example is not publisher measurement evidence.
 */
import {createHash} from 'node:crypto';
import {analyzeEnglishReview156} from './phase156_review_document_engine.js';
import {buildContextGraph154,PRODUCT_REVIEW_CONTEXT_RULES154} from './phase154_context_graph.js';
import {analyzeLabelMatrix154} from './phase154_label_diagnostics.js';
import type {ReaderInput139} from './phase139_unmarked_english_candidate_reader.js';

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const types=['product_model','brand','product_feature','measured_value'] as const;
type Label159=typeof types[number];
export type MentionStatus159='explicitly_tested'|'explicitly_not_tested'|'both_tested_and_not_tested'|'comparison_only'|'unresolved';
export interface NeuralSpan159 {id:string;label:Label159;text:string;start:number;end:number;confidence:number;
 baselineMatch:'exact'|'overlap'|'not_found';contextCategories:string[];claimValidated:false;
 identityVerified:false;scientificEvidence:false;rankingAuthorized:false;}
export interface ModelInterpretation159 {spanId:string;surface:string;status:MentionStatus159;
 positiveCues:{start:number;end:number;surface:string}[];negativeCues:{start:number;end:number;surface:string}[];
 comparisonCues:{start:number;end:number;surface:string}[];usedUniqueAlias:boolean;
 neuralSourceOnly:true;identityVerified:false;}
export interface FeatureValueCandidate159 {featureSpanId:string;valueSpanId:string;feature:string;value:string;
 sentence:{start:number;end:number};subjectModelSpanId:string|null;assignment:'provisional_name_reference'|'unassigned';
 isPublisherMeasurement:false;scientificEvidence:false;canonicalWriteAuthorized:false;}
export interface Coordinated159 {phase:159;caseId:string;documentSha256:string;reportSha256:string;
 modelId:'fastino/gliner2.5-small-v1';modelArchitecture:'boundary';reportedVersion:string;
 caseStatus:'constructed_diagnostic_not_independent_benchmark'|'published_short_excerpts_not_independent_benchmark'|'rights_permitted_full_review_unannotated';
 provenance:'external_colab_user_supplied_unverified'|'external_offline_worker_unverified';reportedInferenceSeconds:number;
 baseline:ReturnType<typeof analyzeEnglishReview156>;neuralSpans:NeuralSpan159[];
 modelInterpretations:ModelInterpretation159[];featureValueCandidates:FeatureValueCandidate159[];
 contextTruncated:boolean;voteDiagnostics:ReturnType<typeof analyzeLabelMatrix154>;
 unresolved:string[];neuralModelExecutedWithinPEE:false;checkpointAuthenticated:false;
 sourceAuthenticated:false;independentlyAnnotated:false;modelQualityBenchmark:false;
 identityMergeAuthorized:false;canonicalWriteAuthorized:false;rankingAuthorized:false;}
interface RawSpan {text:string;confidence:number;start:number;end:number;}
const saneId=(s:string)=>/^[a-z0-9_]{1,50}$/.test(s);
function sentenceSpans(text:string){
 const out:{start:number;end:number}[]=[];let start=0;
 for(const m of text.matchAll(/(?<!\d)[.!?](?!\d)(?=\s|$)|\n\s*\n/g)){
  const end=m.index!+m[0].length;if(text.slice(start,end).trim())out.push({start,end});start=end;
 }
 if(text.slice(start).trim())out.push({start,end:text.length});
 return out;
}
function clauses(text:string,range:{start:number;end:number}){
 const out:{start:number;end:number}[]=[];let start=range.start;
 const piece=text.slice(range.start,range.end);
 for(const m of piece.matchAll(/;|\b(?:but|whereas|and compared|and contrasted)\b|,(?=\s+(?:but|whereas|however)\b)/gi)){
  const end=range.start+m.index!;
  if(text.slice(start,end).trim())out.push({start,end});start=end;
 }
 if(text.slice(start,range.end).trim())out.push({start,end:range.end});
 return out;
}
const rx=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function aliases(model:NeuralSpan159,all:NeuralSpan159[]){
 // Unique terminal name may carry an unambiguous anaphoric product reference.
 // An alias is NOT a claim that two different SKUs have the same identity.
 const parts=model.text.split(/\s+/);const tail=parts.at(-1)??'';
 const other=all.filter(x=>x.id!==model.id&&x.label==='product_model');
 const unique=tail.length>=6&&!other.some(x=>new RegExp(`\\b${rx(tail)}\\b`,'i').test(x.text));
 return [{literal:model.text,short:false},...(unique?[{literal:tail,short:true}]:[])];
}
function findSpans(text:string,segment:{start:number;end:number},literal:string){
 const piece=text.slice(segment.start,segment.end);const matches:{start:number;end:number;surface:string}[]=[];
 const re=new RegExp(`(?<![\\p{L}\\p{N}])${rx(literal)}(?![\\p{L}\\p{N}])`,'giu');
 for(const m of piece.matchAll(re))matches.push({start:segment.start+m.index!,end:segment.start+m.index!+m[0].length,surface:m[0]});
 return matches;
}
export function analyzeGLiNER25ColabCase159(input:ReaderInput139,report:unknown,caseId:string):Coordinated159 {
 const text=input?.document?.text;
 if(typeof text!=='string'||text.length>250000||sha(text)!==input.document.sha256)throw Error('phase159_invalid_source_digest');
 if(!saneId(caseId)||!obj(report)||report.model_id!=='fastino/gliner2.5-small-v1'||
  report.model_architecture!=='boundary'||!/^\d+\.\d+\.\d+$/.test(String(report.gliner2_version))||
  !['standalone_colab_not_connected_to_PEE','local_offline_worker_not_connected_to_PEE'].includes(String(report.model_integration_status))||
  !['constructed_diagnostic_not_independent_benchmark','published_short_excerpts_not_independent_benchmark','rights_permitted_full_review_unannotated'].includes(String(report.case_status))||!obj(report.cases)||
  Object.keys(report.cases).length>20||!obj(report.cases[caseId]))throw Error('phase159_invalid_report_envelope');
 const raw=report.cases[caseId];if(!obj(raw)||raw.input!==text||!obj(raw.entities)||
  !Array.isArray(raw.offset_errors)||raw.offset_errors.length!==0||
  typeof raw.seconds_inference!=='number'||!Number.isFinite(raw.seconds_inference)||raw.seconds_inference<0||raw.seconds_inference>3600)
  throw Error('phase159_unbound_or_error_inference_case');
 if(['published_short_excerpts_not_independent_benchmark','rights_permitted_full_review_unannotated'].includes(String(report.case_status))&&(
  raw.source_url!==input.document.source.url||raw.source_title!==input.document.source.title|| (report.case_status==='published_short_excerpts_not_independent_benchmark'&&text.length>500) ||(report.case_status==='rights_permitted_full_review_unannotated'&&(text.length>120000||raw.source_sha256!==sha(text)))))
  throw Error('phase159_unbound_published_excerpt_metadata');
 if(Object.keys(raw.entities).sort().join('|')!==[...types].sort().join('|'))throw Error('phase159_invalid_entity_types');
 const predictions:{label:Label159;raw:RawSpan}[]=[];let i=0;
 for(const label of types){const spans=raw.entities[label];if(!Array.isArray(spans)||spans.length>200)throw Error('phase159_entity_budget_exceeded');
  for(const p of spans){if(!obj(p)||typeof p.text!=='string'||p.text.length>160||!Number.isSafeInteger(p.start)||
   !Number.isSafeInteger(p.end)||(p.start as number)<0||(p.end as number)<=(p.start as number)||(p.end as number)>text.length||text.slice(p.start as number,p.end as number)!==p.text||
   typeof p.confidence!=='number'||!Number.isFinite(p.confidence)||p.confidence<0||p.confidence>1)
   throw Error('phase159_invalid_neural_span');
   predictions.push({label,raw:p as unknown as RawSpan});
   if(++i>500)throw Error('phase159_global_candidate_budget_exceeded');
  }
 }
 const baseline=analyzeEnglishReview156(input);
 const sorted=predictions.sort((a,b)=>a.raw.start-b.raw.start||a.raw.end-b.raw.end||a.label.localeCompare(b.label));
 const uniques=new Set<string>();const spans:NeuralSpan159[]=[];
 for(const p of sorted){const key=`${p.label}:${p.raw.start}:${p.raw.end}`;
  if(uniques.has(key))throw Error('phase159_duplicate_neural_span');uniques.add(key);
  const exact=baseline.mentions.some(m=>m.span.start===p.raw.start&&m.span.end===p.raw.end);
  const overlap=baseline.mentions.some(m=>m.span.start<p.raw.end&&p.raw.start<m.span.end);
  spans.push({id:`n159_${p.label}_${p.raw.start}_${p.raw.end}`,label:p.label,text:p.raw.text,
   start:p.raw.start,end:p.raw.end,confidence:p.raw.confidence,
   baselineMatch:exact?'exact':overlap?'overlap':'not_found',contextCategories:[],
   claimValidated:false,identityVerified:false,scientificEvidence:false,rankingAuthorized:false});
 }
 const context=buildContextGraph154(text,spans.map(v=>({id:v.id,start:v.start,end:v.end,type:v.label})),PRODUCT_REVIEW_CONTEXT_RULES154,1200);
 for(const s of spans)s.contextCategories=[...new Set(context.edges.filter(e=>e.targetId===s.id).map(e=>e.category))].sort();
 const models=spans.filter(x=>x.label==='product_model');const sentences=sentenceSpans(text);
 const modelInterpretations:ModelInterpretation159[]=models.map(model=>{
  const positive:ModelInterpretation159['positiveCues']=[],negative:ModelInterpretation159['negativeCues']=[],comparison:ModelInterpretation159['comparisonCues']=[];
  let short=false;
  const al=aliases(model,models);
  for(const sentence of sentences){for(const clause of clauses(text,sentence)){
   const part=text.slice(clause.start,clause.end);const localMatches=al.flatMap(a=>findSpans(text,clause,a.literal).map(m=>({...m,short:a.short})));
   if(!localMatches.length)continue;
   const full=localMatches.filter(m=>!m.short);const hits=full.length?full:localMatches;
   for(const hit of hits){if(hit.short)short=true;
    const prior=text.slice(clause.start,hit.start);const around=text.slice(clause.start,clause.end);
    const isNegative=/\b(?:did\s+not\s+test|not\s+tested|never\s+tested|was\s+not\s+tested|is\s+not\s+tested)\b/i.test(prior);
    const isPositive=!isNegative&&/\b(?:we|our\s+team|reviewers)\s+(?:have\s+)?tested\b|\bour\s+review\s+tests\b/i.test(prior);
    const isCompare=/\b(?:compared?|competitor|comparison|alternative|versus|unlike)\b/i.test(around);
    const dest=isNegative?negative:isPositive?positive:isCompare?comparison:null;
    if(dest&&!dest.some(x=>x.start===hit.start&&x.end===hit.end))dest.push({start:hit.start,end:hit.end,surface:hit.surface});
   }
  }}
  const status:MentionStatus159=positive.length&&negative.length?'both_tested_and_not_tested':
    positive.length?'explicitly_tested':negative.length?'explicitly_not_tested':
    comparison.length?'comparison_only':'unresolved';
  return {spanId:model.id,surface:model.text,status,positiveCues:positive,negativeCues:negative,
   comparisonCues:comparison,usedUniqueAlias:short,neuralSourceOnly:true,identityVerified:false};
 });
 const features=spans.filter(x=>x.label==='product_feature'),values=spans.filter(x=>x.label==='measured_value');
 const pairs:FeatureValueCandidate159[]=[];
 for(const v of values){const sentence=sentences.find(x=>v.start>=x.start&&v.end<=x.end);
  if(!sentence)continue;const same=features.filter(f=>f.start>=sentence.start&&f.end<=sentence.end);
  if(same.length!==1)continue;const f=same[0];
  const brandNames=spans.filter(x=>x.label==='brand'&&x.start>=sentence.start&&x.end<=sentence.end);
  const linking=brandNames.filter(b=>models.some(m=>text.slice(Math.max(0,m.start-60),m.start).includes(b.text)||
   // Only a preceding adjacent brand span is compatible with that exact named product.
   spans.some(z=>z.label==='brand'&&z.text.toLowerCase()===b.text.toLowerCase()&&m.start>=z.end&&m.start-z.end<=3)));
  const matchingModels=models.filter(m=>linking.some(b=>spans.some(z=>z.label==='brand'&&z.text.toLowerCase()===b.text.toLowerCase()&&m.start>=z.end&&m.start-z.end<=3)));
  const subject=matchingModels.length===1?matchingModels[0]:null;
  pairs.push({featureSpanId:f.id,valueSpanId:v.id,feature:f.text,value:v.text,sentence,
   subjectModelSpanId:subject?.id??null,assignment:subject?'provisional_name_reference':'unassigned',
   isPublisherMeasurement:false,scientificEvidence:false,canonicalWriteAuthorized:false});
 }
 const votes=models.map(m=>{
  const it=modelInterpretations.find(x=>x.spanId===m.id)!;
  return [it.positiveCues.length?0:-1,it.negativeCues.length?1:-1,it.comparisonCues.length?2:-1];
 });
 const voteDiagnostics=analyzeLabelMatrix154(votes,['explicit_test_statement','explicit_non_test_statement','local_comparison_statement']);
 const unresolved:string[]=['original_model_checkpoint_revision_not_attested',
  report.case_status==='published_short_excerpts_not_independent_benchmark'?'source_is_unverified_short_editorial_excerpt':
  report.case_status==='rights_permitted_full_review_unannotated'?'source_is_unverified_full_review':'source_is_constructed_diagnostic',
  'external_colab_runtime_not_cryptographically_attested'];
 if(context.truncated)unresolved.push('neural_context_budget_exceeded');
 if(modelInterpretations.some(m=>m.status==='both_tested_and_not_tested'))unresolved.push('contradictory_test_status_requires_review');
 if(models.some(m=>!baseline.mentions.some(b=>b.span.start===m.start&&b.span.end===m.end)))unresolved.push('neural_mentions_not_all_exact_heuristic_matches');
 if(pairs.some(p=>p.assignment==='unassigned'))unresolved.push('unassigned_feature_value_candidate');
 return {phase:159,caseId,documentSha256:sha(text),reportSha256:sha(JSON.stringify(report)),
  modelId:'fastino/gliner2.5-small-v1',modelArchitecture:'boundary',reportedVersion:String(report.gliner2_version),
  caseStatus:report.case_status as Coordinated159['caseStatus'],
  provenance:report.model_integration_status==='local_offline_worker_not_connected_to_PEE'?'external_offline_worker_unverified':'external_colab_user_supplied_unverified',reportedInferenceSeconds:raw.seconds_inference,
  baseline,neuralSpans:spans,modelInterpretations,featureValueCandidates:pairs,
  contextTruncated:context.truncated,voteDiagnostics,unresolved:unresolved.sort(),
  neuralModelExecutedWithinPEE:false,checkpointAuthenticated:false,sourceAuthenticated:false,
  independentlyAnnotated:false,modelQualityBenchmark:false,identityMergeAuthorized:false,canonicalWriteAuthorized:false,rankingAuthorized:false};
}
