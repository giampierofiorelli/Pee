/** Phase131: tiny deterministic, locally TRAINED relation classifier and provenance gate.
 * Purpose: compare actual statistical generalisation with Phase130 rules, not to
 * assert general language competence, source truth, or product superiority.
 * Entity spans must be supplied by an independent annotator/recogniser.
 * No remotely hosted model and no new third-party runtime package.
 */
import {createHash} from 'node:crypto';
import type {SourceRef128} from './phase128_category_cognition_dialogue_bridge.js';
import {screenRelationContext132} from './phase132_contextual_relation_guard.js';

export const RELATIONS131=['measures','contributes_to','conditioned_on','not_evidence_of','unrelated'] as const;
export type Relation131=typeof RELATIONS131[number];
export interface Span131 {start:number;end:number}
export interface RelationExample131 {text:string;subject:Span131;object:Span131;label:Relation131}
export interface MarkedRecord131 {marked:string;label:Relation131;domain?:string;source?:string}
export interface RelationDocument131 {source:SourceRef128;text:string;sha256:string}
export interface CandidateRelation131 {
 subject:string;object:string;label:Exclude<Relation131,'unrelated'>;
 subjectSpan:Span131;objectSpan:Span131;evidenceSpan:Span131;
 sourceId:string;originalDocumentId:string;sourceContentSha256:string;evidenceSha256:string;
 margin:number;rankingAuthorized:false;status:'hypothesis_requires_scientific_review';
}
export interface RelationModel131 {algorithm:'multinomial_naive_bayes_from_scratch';
 labels:readonly Relation131[];classes:Record<Relation131,Record<string,number>>;
 counts:Record<Relation131,number>;totals:Record<Relation131,number>;
 vocabulary:readonly string[];smoothing:1;trainingCount:number;
 modelVersion:string;
}
const digest=(x:string)=>createHash('sha256').update(x).digest('hex');
const words=(s:string)=>s.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
function spanOk(t:string,p:Span131):boolean {return Number.isSafeInteger(p?.start)&&Number.isSafeInteger(p?.end)&&p.start>=0&&p.end>p.start&&p.end<=t.length;}
const approxTokenLimit=3000;
export function verifyRelationExample131(x:RelationExample131):void{
 if(typeof x?.text!=='string'||!x.text.trim()||x.text.length>12000||
 !spanOk(x.text,x.subject)||!spanOk(x.text,x.object)||
 !RELATIONS131.includes(x.label)||words(x.text).length>approxTokenLimit||
 !(x.subject.end<=x.object.start||x.object.end<=x.subject.start)) throw Error('invalid_relation_example');
}
/** Marked spans are upstream human/extractor annotations, not discovered by this classifier. */
export function parseMarked131(marked:string,label:Relation131):RelationExample131{
 if(typeof marked!=='string'||marked.length>12000||!RELATIONS131.includes(label))throw Error('invalid_marked_input');
 let raw=marked;const spans:{S?:Span131;O?:Span131}={};
 for(const [tag,k] of [['S','S'],['O','O']] as const){
  const open=`<${tag}>`,close=`</${tag}>`;
  if(raw.split(open).length!==2||raw.split(close).length!==2)throw Error('missing_or_duplicate_entity_marker');
 }
 // Parse left-to-right, preserving exact offsets after markup removal.
 let plain='';let i=0;let active:'S'|'O'|null=null;
 while(i<marked.length){
  const match=/^<\/?[SO]>/.exec(marked.slice(i));
  if(match){const tok=match[0];const isClose=tok.startsWith('</');const key=tok.includes('S')?'S':'O';
   if(isClose){if(active!==key||!spans[key])throw Error('unbalanced_spans');spans[key]!.end=plain.length;active=null;}
   else{if(active||spans[key])throw Error('nested_or_duplicate_spans');spans[key]={start:plain.length,end:plain.length};active=key;}
   i+=tok.length;continue;
  }
  plain+=marked[i++];
 }
 if(active||!spans.S||!spans.O)throw Error('unbalanced_spans');
 const x:RelationExample131={text:plain,subject:spans.S,object:spans.O,label};verifyRelationExample131(x);return x;
}
function features131(x:RelationExample131):string[]{
 verifyRelationExample131(x);
 const t=x.text;const s=x.subject,o=x.object;
 const first=s.start<o.start?s:o;const second=s.start<o.start?o:s;
 const between=t.slice(first.end,second.start);
 const masked=t.slice(0,first.start)+' ENTA '+t.slice(first.end,second.start)+' ENTB '+t.slice(second.end);
 const w=words(masked),b=words(between); const f:string[]=[];
 f.push(`direction=${s.start<o.start?'forward':'reverse'}`);
 for(const v of w)f.push('global:'+v);
 for(const v of b)f.push('between:'+v);
 for(let i=0;i<b.length-1;i++)f.push('between2:'+b[i]+'_'+b[i+1]);
 const leading=words(t.slice(Math.max(0,first.start-80),first.start));
 const trailing=words(t.slice(second.end,Math.min(t.length,second.end+80)));
 for(const v of leading.slice(-4))f.push('leading:'+v);
 for(const v of trailing.slice(0,4))f.push('trailing:'+v);
 if(b.length<=3)f.push('distance:short');else if(b.length<=14)f.push('distance:medium');else f.push('distance:long');
 if(/\b(?:not|never|no|cannot|without|insufficient|nothing)\b/i.test(t))f.push('polarity:negation');
 return f;
}
export function trainRelations131(examples:readonly RelationExample131[]):RelationModel131{
 if(examples.length<10||examples.length>10000)throw Error('invalid_training_size');
 const classes=Object.fromEntries(RELATIONS131.map(k=>[k,{}])) as Record<Relation131,Record<string,number>>;
 const counts=Object.fromEntries(RELATIONS131.map(k=>[k,0])) as Record<Relation131,number>;
 const totals=Object.fromEntries(RELATIONS131.map(k=>[k,0])) as Record<Relation131,number>;
 const vocab=new Set<string>();
 for(const e of examples){const f=features131(e);counts[e.label]++;
  for(const v of f){classes[e.label][v]=(classes[e.label][v]??0)+1;totals[e.label]++;vocab.add(v);}
 }
 if(RELATIONS131.some(k=>counts[k]===0))throw Error('training_missing_relation_class');
 const vocabulary=[...vocab].sort();
 const modelVersion=digest(JSON.stringify({classes,counts,totals,vocabulary})).slice(0,16);
 return {algorithm:'multinomial_naive_bayes_from_scratch',labels:RELATIONS131,classes,counts,totals,vocabulary,smoothing:1,
  trainingCount:examples.length,modelVersion};
}
export interface RelationPrediction131 {label:Relation131|'abstain';rawWinner:Relation131; margin:number;
 accepted:boolean;reason:'accepted_candidate_only'|'insufficient_evidence'|'unknown_language_pattern';
 modelVersion:string;rankingAuthorized:false}
/** Scores are log-likelihood ratios, NOT calibrated probabilities. */
export function predictRelation131(model:RelationModel131,e:RelationExample131,minMargin:number):RelationPrediction131{
 if(!Number.isFinite(minMargin)||minMargin<0)throw Error('invalid_margin');
 const feats=features131(e);const v=new Set(model.vocabulary);
 const usable=feats.filter(f=>v.has(f));
 const order=model.labels.map(label=>{
  const total=model.totals[label]+model.vocabulary.length;
  const score=Math.log((model.counts[label]+1)/(model.trainingCount+model.labels.length))+
   usable.reduce((sum,f)=>sum+Math.log(((model.classes[label][f]??0)+1)/total),0);
  return {label,score};
 }).sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label));
 const margin=order[0].score-order[1].score;
 const accepted=usable.length>=2 && margin>=minMargin && order[0].label!=='unrelated';
 const reason=usable.length<2?'unknown_language_pattern':accepted?'accepted_candidate_only':'insufficient_evidence';
 return {label:accepted?order[0].label:'abstain',rawWinner:order[0].label,
  margin,accepted,reason,modelVersion:model.modelVersion,rankingAuthorized:false};
}
export interface Calibration131 {margin:number;accepted:number;correct:number;validationN:number;
 minPrecisionRequested:number;observedPrecision:number|null;status:'validation_only_not_probability';}
/** Choose margin ONLY on development/calibration, maximize coverage under precision floor.
 * Cannot claim real calibration based on tiny authored fixture data. */
export function calibrateMargin131(model:RelationModel131,val:readonly RelationExample131[],precisionFloor=0.9):Calibration131{
 if(!val.length||val.length>10000||precisionFloor<=0||precisionFloor>1)throw Error('invalid_calibration');
 const base=val.map(e=>({e,p:predictRelation131(model,e,0)}));
 const thresholds=[0,...new Set(base.map(x=>x.p.margin))].sort((a,b)=>a-b);
 let best:{margin:number;accepted:number;correct:number}|undefined;
 for(const m of thresholds){
  const selected=base.filter(x=>predictRelation131(model,x.e,m).accepted);
  const correct=selected.filter(x=>x.p.rawWinner===x.e.label).length;
  if(!selected.length||correct/selected.length<precisionFloor)continue;
  if(!best||selected.length>best.accepted||selected.length===best.accepted&&m>best.margin)
   best={margin:m,accepted:selected.length,correct};
 }
 if(!best)return {margin:Number.MAX_VALUE,accepted:0,correct:0,validationN:val.length,minPrecisionRequested:precisionFloor,
  observedPrecision:null,status:'validation_only_not_probability'};
 return {...best,validationN:val.length,minPrecisionRequested:precisionFloor,observedPrecision:best.correct/best.accepted,
  status:'validation_only_not_probability'};
}
/** The model can propose a RELATION only; canonical category truth still needs an independent review. */
function tBoundary(prefix:string):number {
 // Start just after the most recent explicit sentence boundary or newline.
 let last=0;for(const m of prefix.matchAll(/[.!?](?=\s|$)|\n/g))last=m.index!+m[0].length;
 while(last<prefix.length&&/\s/.test(prefix[last]))last++;
 return last;
}
function tNextBoundary(text:string,from:number):number {
 const rest=text.slice(from);const m=/[.!?](?=\s|$)|\n/.exec(rest);
 return m?from+m.index+m[0].length:text.length;
}
export function proposeRelation131(args:{document:RelationDocument131;subject:Span131;object:Span131;
 model:RelationModel131;calibration:Calibration131}):CandidateRelation131|null{
 const d=args.document;
 if(!d?.source?.id||!d.source.originalDocumentId||!/^https:\/\//.test(d.source.url)||
  digest(d.text)!==d.sha256)throw Error('unverified_document_integrity');
 const e:RelationExample131={text:d.text,subject:args.subject,object:args.object,label:'unrelated'};
 verifyRelationExample131(e);
 const p=predictRelation131(args.model,e,args.calibration.margin);
 if(!p.accepted||p.label==='abstain'||p.label==='unrelated')return null;
 // Anchor the WHOLE sentence, including negation or qualifier before the entities.
 // Do not silently claim a multi-sentence inference from a local bag-of-words model.
 const startEntity=Math.min(e.subject.start,e.object.start),endEntity=Math.max(e.subject.end,e.object.end);
 const prev=tBoundary(d.text.slice(0,startEntity)),next=tNextBoundary(d.text,endEntity);
 const evidenceSpan={start:prev,end:next};
 if(next-prev>1200||/[.!?](?:\s|$)/.test(d.text.slice(startEntity,endEntity-1)))return null;
 const scopeCheck132=screenRelationContext132({text:d.text.slice(prev,next),
  subject:{start:e.subject.start-prev,end:e.subject.end-prev},
  object:{start:e.object.start-prev,end:e.object.end-prev},label:p.label});
 if(!scopeCheck132.allowHypothesis)return null;
 const {start,end}=evidenceSpan;
 return {subject:e.text.slice(e.subject.start,e.subject.end),object:e.text.slice(e.object.start,e.object.end),
  label:p.label,subjectSpan:e.subject,objectSpan:e.object,evidenceSpan,
  sourceId:d.source.id,originalDocumentId:d.source.originalDocumentId,sourceContentSha256:d.sha256,
  evidenceSha256:digest(d.text.slice(start,end)),margin:p.margin,
  status:'hypothesis_requires_scientific_review',rankingAuthorized:false};
}
export function assertRelationAnchoring131(c:CandidateRelation131,doc:RelationDocument131):boolean{
 const a=c.evidenceSpan;return c.rankingAuthorized===false&&c.status==='hypothesis_requires_scientific_review'&&
 c.sourceId===doc.source.id&&c.originalDocumentId===doc.source.originalDocumentId&&c.sourceContentSha256===doc.sha256&&
 digest(doc.text)===doc.sha256&&spanOk(doc.text,a)&&spanOk(doc.text,c.subjectSpan)&&spanOk(doc.text,c.objectSpan)&&
 a.start<=c.subjectSpan.start&&a.end>=c.subjectSpan.end&&a.start<=c.objectSpan.start&&a.end>=c.objectSpan.end&&
 doc.text.slice(c.subjectSpan.start,c.subjectSpan.end)===c.subject&&doc.text.slice(c.objectSpan.start,c.objectSpan.end)===c.object&&
 digest(doc.text.slice(a.start,a.end))===c.evidenceSha256&&
 screenRelationContext132({text:doc.text.slice(a.start,a.end),
  subject:{start:c.subjectSpan.start-a.start,end:c.subjectSpan.end-a.start},
  object:{start:c.objectSpan.start-a.start,end:c.objectSpan.end-a.start},label:c.label}).allowHypothesis;
}
export function evaluateRelations131(model:RelationModel131,data:readonly RelationExample131[],minMargin:number){
 let accepted=0,correct=0,abstained=0;const perClass=Object.fromEntries(RELATIONS131.map(k=>[k,{total:0,accepted:0,correct:0}])) as Record<Relation131,{total:number;accepted:number;correct:number}>;
 const items=data.map((e,i)=>{const p=predictRelation131(model,e,minMargin);perClass[e.label].total++;
  if(p.accepted){accepted++;perClass[e.label].accepted++;if(p.label===e.label){correct++;perClass[e.label].correct++;}}
  else abstained++;
  return {index:i,expected:e.label,predicted:p.label,rawWinner:p.rawWinner,margin:Number(p.margin.toFixed(4)),accepted:p.accepted};});
 return {size:data.length,accepted,correct,wrong:accepted-correct,abstained,coverage:accepted/data.length,
  precisionWhenAccepted:accepted?correct/accepted:null,perClass,items};
}
/** A learned relation never becomes a category quality rule directly.
 * These are work items for the existing reviewed-knowledge pipeline, not claims. */
export interface RelationFollowup131 {
 relation:CandidateRelation131['label'];subject:string;object:string;
 sourceId:string;originalDocumentId:string;sourceContentSha256:string;evidenceSha256:string;
 reviewType:'definition_and_endpoint'|'causal_mechanism'|'protocol_comparability'|'negative_scope';
 request:string;productRankingBlocked:true;
}
export function planRelationReview131(proposals:readonly CandidateRelation131[]):RelationFollowup131[]{
 const seen=new Set<string>();const out:RelationFollowup131[]=[];
 for(const p of proposals){
  if(p.rankingAuthorized!==false||p.status!=='hypothesis_requires_scientific_review')throw Error('only_unverified_relationships');
  const key=[p.sourceId,p.originalDocumentId,p.sourceContentSha256,p.evidenceSha256,p.label,p.subject,p.object].join('|');
  if(seen.has(key))continue;seen.add(key);
  const plan:Record<CandidateRelation131['label'],{reviewType:RelationFollowup131['reviewType'];request:string}>={
   measures:{reviewType:'definition_and_endpoint',request:'Verify original definition, units, test procedure, endpoint and whether the measure represents the claimed user outcome.'},
   contributes_to:{reviewType:'causal_mechanism',request:'Find controlled empirical evidence for direction, effect size, confounders and conditions; do not infer causality from mechanism alone.'},
   conditioned_on:{reviewType:'protocol_comparability',request:'Verify the full stated test horizon, substrate, setting, protocol version and comparability across products.'},
   not_evidence_of:{reviewType:'negative_scope',request:'Validate negation scope and identify precisely which consumer outcome is not supported by this source.'}
  };
  out.push({relation:p.label,subject:p.subject,object:p.object,
   sourceId:p.sourceId,originalDocumentId:p.originalDocumentId,
   sourceContentSha256:p.sourceContentSha256,evidenceSha256:p.evidenceSha256,
   ...plan[p.label],productRankingBlocked:true});
 }
 return out.sort((a,b)=>a.sourceId.localeCompare(b.sourceId)||a.evidenceSha256.localeCompare(b.evidenceSha256));
}
