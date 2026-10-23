/**
 * Full-document, explicit-opt-in analytical ledger. Coordinates the retained
 * medSpaCy and Snorkel adaptations (154/155), GLiNER2 deterministic overlap
 * and long-text procedures, and DeepKE's sentence-evidence document graph.
 * NO learned GLiNER2/DeepKE extraction is asserted. No source verification,
 * identity merge, approval of measures, database writes or ranking mutation.
 */
import {createHash} from 'node:crypto';
import type {ReaderInput139} from './phase139_unmarked_english_candidate_reader.js';
import {analyzeEnglishReview155, type ReviewMention155, type ReviewRelation155, type ReviewMeasurement155} from './phase155_review_orchestrator.js';
import {buildContextGraph154,PRODUCT_REVIEW_CONTEXT_RULES154} from './phase154_context_graph.js';
import {analyzeLabelMatrix154} from './phase154_label_diagnostics.js';
import {resolveSpans156,wordWindows156} from './phase156_gliner_portable.js';
import {buildDocumentGraph156} from './phase156_deepke_document_graph.js';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
type Mention=ReviewMention155&{windowIds:number[];candidateScore:number;};
export interface Review156 {phase:156;documentSha256:string;sourceUrl:string;windowCount:number;
 windows:{index:number;start:number;end:number;sha256:string;candidateCount:number;unresolved:string[]}[];
 mentions:Mention[];discardedOverlapCount:number;context:ReturnType<typeof buildContextGraph154>;
 voteDiagnostics:ReturnType<typeof analyzeLabelMatrix154>;
 relations:(ReviewRelation155&{windowIds:number[]})[];
 measurements:(ReviewMeasurement155&{windowIds:number[]})[];
 documentGraph:ReturnType<typeof buildDocumentGraph156>;
 unresolved:string[];truncationReasons:string[];
 sourceAuthenticated:false;independentlyAnnotated:false;canonicalWriteAuthorized:false;rankingAuthorized:false;
 modelInferencePerformed:false;}
const score=(m:ReviewMention155)=>
  1+(m.sources.includes('explicit_model_shape')?2:0)+(m.sources.includes('title_correspondence')?2:0)+
  (m.sources.includes('variant_table')?1:0)+(m.sources.includes('phase153')?.25:0)+
  Math.min(m.surface.length,80)/500;
export function analyzeEnglishReview156(input:ReaderInput139,opts:{windowWords?:number;overlapWords?:number}={}):Review156{
 const text=input.document.text;
 if(typeof text!=='string'||text.length>2_000_000||sha(text)!==input.document.sha256)
  throw Error('invalid_source_digest_156');
 const windows=wordWindows156(text,opts.windowWords??384,opts.overlapWords??64);
 if(windows.length>800)throw Error('review_window_budget_156');
 const mentions=new Map<string,Mention>(),relationMap=new Map<string,Review156['relations'][number]>(),
  measurementMap=new Map<string,Review156['measurements'][number]>();
 const reasons=new Set<string>();let chunkTruncated=false;
 const windowAudit:Review156['windows']=[];
 for(let i=0;i<windows.length;i++){
  const w=windows[i];
  const source={...input.document.source,id:`${input.document.source.id}:window:${i}`,
   originalDocumentId:input.document.source.originalDocumentId};
  const local:ReaderInput139={document:{...input.document,text:w.text,sha256:sha(w.text),source}};
  const r=analyzeEnglishReview155(local);
  for(const reason of r.truncationReasons){chunkTruncated=true;reasons.add(`window_${i}:${reason}`);}
  windowAudit.push({index:i,start:w.startChar,end:w.endChar,sha256:sha(w.text),candidateCount:r.mentions.length,unresolved:r.unresolved});
  const remapId=(id:string)=>{const old=r.mentions.find(m=>m.id===id);
   return old?`mention_${w.startChar+old.span.start}_${w.startChar+old.span.end}`:null;};
  for(const m of r.mentions){
   const start=w.startChar+m.span.start,end=w.startChar+m.span.end;
   if(text.slice(start,end)!==m.surface)throw Error('invalid_global_span_mapping_156');
   const key=`${start}:${end}`;
   const rewritten:Mention={...m,id:`mention_${start}_${end}`,span:{start,end,literal:m.surface,sha256:sha(m.surface)},
    candidateScore:score(m),windowIds:[i]};
   const prev=mentions.get(key);
   if(!prev){mentions.set(key,rewritten);continue;}
   prev.windowIds.push(i);
   // A better textual reading wins; role conflicts remain visibly unresolved.
   const ambiguous=prev.role!=='unresolved'&&rewritten.role!=='unresolved'&&prev.role!==rewritten.role;
   if(ambiguous){prev.role='unresolved';prev.votingConflict=true;reasons.add(`conflicting_window_role:${key}`);}
   else if(rewritten.candidateScore>prev.candidateScore+1e-9){
    const ids=prev.windowIds;mentions.set(key,{...rewritten,windowIds:ids,
     role:prev.votingConflict?'unresolved':rewritten.role,votingConflict:prev.votingConflict||rewritten.votingConflict});
   }
  }
  for(const rel of r.relations){
   const head=rel.subjectMentionId?remapId(rel.subjectMentionId):null,tail=remapId(rel.objectMentionId);
   if(!tail)continue;
   const start=w.startChar+rel.evidence.start,end=w.startChar+rel.evidence.end;
   if(text.slice(start,end)!==rel.evidence.literal)throw Error('invalid_relation_evidence_mapping_156');
   const id=`${head}|${tail}|${rel.relation}|${start}:${end}`;
   const prev=relationMap.get(id);
   if(prev){prev.windowIds.push(i);continue;}
   relationMap.set(id,{...rel,id:`rel156_${start}_${end}_${tail}`,subjectMentionId:head,objectMentionId:tail,
    evidence:{start,end,literal:rel.evidence.literal,sha256:sha(rel.evidence.literal)},windowIds:[i]});
  }
  for(const measurement of r.measurements){
   const pos=w.startChar+measurement.quantity.start,labelStart=w.startChar+measurement.label.start;
   if(text.slice(pos,pos+measurement.quantity.literal.length)!==measurement.quantity.literal)throw Error('invalid_measure_mapping_156');
   const id=`${labelStart}:${pos}`,prior=measurementMap.get(id);
   if(prior){prior.windowIds.push(i);continue;}
   measurementMap.set(id,{...measurement,id:`metric156_${pos}`,
    label:{...measurement.label,start:labelStart,end:w.startChar+measurement.label.end},
    quantity:{...measurement.quantity,start:pos,end:w.startChar+measurement.quantity.end},
    subjectMentionId:measurement.subjectMentionId?remapId(measurement.subjectMentionId):null,windowIds:[i]});
  }
 }
 const proposed=[...mentions.values()];
 const selected=resolveSpans156(proposed.map(ref=>({start:ref.span.start,end:ref.span.end,score:ref.candidateScore,ref})),'disallow').map(x=>x.ref);
 const chosenSet=new Set(selected.map(m=>m.id));
 const title=norm(input.document.source.title??'');
 // Title-based role correspondence, not identity assertion, across windows.
 // All matching written occurrences can be provisional reviewed surfaces.
 for(const m of selected){
  if(!m.votingConflict&&!m.sources.includes('variant_table')&&
    norm(m.surface).split(' ').length>=3&&title.startsWith(norm(m.surface))){
   // Full brand/family names can be written in words; requiring digits would
   // silently lose air fryers and coffee machines. This is only a page match.
   m.role='reviewed_surface';m.roleVotes[0]=0;
   if(!m.sources.includes('title_correspondence'))m.sources=[...m.sources,'title_correspondence'];
  }
  m.windowIds=[...new Set(m.windowIds)].sort((a,b)=>a-b);
 }
 selected.sort((a,b)=>a.span.start-b.span.start||a.span.end-b.span.end);
 const context=buildContextGraph154(text,selected.map(m=>({id:m.id,start:m.span.start,end:m.span.end,type:'commercial_mention'})),
  PRODUCT_REVIEW_CONTEXT_RULES154,2000);
 for(const m of selected)m.contextCategories=[...new Set(context.edges.filter(e=>e.targetId===m.id).map(e=>e.category))].sort();
 const voteDiagnostics=analyzeLabelMatrix154(selected.map(m=>m.roleVotes),['review_title_match','variant_row','local_comparison_phrase']);
 const relations=[...relationMap.values()].filter(r=>chosenSet.has(r.objectMentionId)&&
   (r.subjectMentionId===null||chosenSet.has(r.subjectMentionId)));
 for(const r of relations)r.windowIds=[...new Set(r.windowIds)].sort((a,b)=>a-b);
 const metrics=[...measurementMap.values()].sort((a,b)=>a.quantity.start-b.quantity.start);
 for(const m of metrics){m.windowIds=[...new Set(m.windowIds)].sort((a,b)=>a-b);
  if(m.subjectMentionId&&!chosenSet.has(m.subjectMentionId)){
   m.subjectMentionId=null;m.assignment='unresolved';
  }
 }
 // A title match can be an anchor but is not verified model identity.
 const graph=buildDocumentGraph156(text,selected.map(m=>({id:m.id,start:m.span.start,end:m.span.end,
  surface:m.surface,role:m.role,contextCategories:m.contextCategories})),
  relations.filter(r=>r.subjectMentionId).map(r=>({headMentionId:r.subjectMentionId!,tailMentionId:r.objectMentionId,
   type:r.relation,evidenceStart:r.evidence.start,evidenceEnd:r.evidence.end})));
 if(context.truncated)reasons.add('document_context_budget_exceeded');
 if(!selected.some(m=>m.role==='reviewed_surface'))reasons.add('reviewed_model_not_observed_in_body');
 if(chunkTruncated)reasons.add('window_extraction_incomplete');
 if(metrics.some(m=>m.assignment==='unresolved'))reasons.add('some_measurements_unassigned');
 return {phase:156,documentSha256:sha(text),sourceUrl:input.document.source.url,windowCount:windows.length,
  windows:windowAudit,mentions:selected,discardedOverlapCount:proposed.length-selected.length,
  context,voteDiagnostics,relations,measurements:metrics,documentGraph:graph,
  unresolved:[...reasons].sort(),truncationReasons:[...reasons].filter(r=>/budget|incomplete/.test(r)).sort(),
  sourceAuthenticated:false,independentlyAnnotated:false,canonicalWriteAuthorized:false,rankingAuthorized:false,modelInferencePerformed:false};
}
