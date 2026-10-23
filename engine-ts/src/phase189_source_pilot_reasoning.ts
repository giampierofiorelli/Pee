/** Phase189: externally sourced, manually annotated research-case evaluator.
 * READ-ONLY PILOT. Does not verify online original bytes, grant source rights,
 * sign or admit evidence, modify Phase181 rankings, or publish product advice.
 * Tests protocol/scope/variant gates and the independence of summaries.
 */
export type Kind189='instrument_measurement'|'structured_expert_assessment'|
 'contextual_expert_observation'|'editorial_interpretation'|'owner_anecdote'|'manufacturer_statement';
export interface SourcePage189{ id:string;publisher:string;url:string;model:string;method:string;notes:string; }
export interface SourceRecord189{
 id:string;sourceId:string;category:string;variantId:string;field:string;kind:Kind189;
 originalGroup:string;protocol:string;condition:string;position:string;context:string;
 value?:number;unit?:string;derivedFrom?:readonly string[];
}
export interface ResearchDossier189{
 status:'research_only_not_reviewed_or_admitted';preparedOn:string;method:string;market:string;
 sourcePages:readonly SourcePage189[];records:readonly SourceRecord189[];
}
export type Question189={id:string;category:string;variantId:string;field:string;condition:string;
 protocol:string;kind:'numeric_minimum'|'numeric_maximum'|'experiential_context';
 threshold?:number;unit?:string;};
export interface ResearchFinding189{
 questionId:string;variantId:string;field:string;
 state:'observed_threshold_met'|'observed_threshold_missed'|'conflicting_originals'|
  'context_observed_only'|'not_established';
 eligibleOriginalObservationIds:readonly string[];excludedOrDerivedIds:readonly string[];
 originalGroups:readonly string[];sourceUrls:readonly string[];limitations:readonly string[];
 rankingAllowed:false;independentSourceRightsVerified:false;
}
const names=(x:unknown)=>typeof x==='string'&&/^[a-z][a-z0-9_.:-]{0,100}$/.test(x);
const noCopies=(a:readonly string[])=>new Set(a).size===a.length;
const https=(x:unknown)=>typeof x==='string'&&/^https:\/\/[^/?\s]+\//.test(x);
const kinds:Kind189[]=['instrument_measurement','structured_expert_assessment',
 'contextual_expert_observation','editorial_interpretation','owner_anecdote','manufacturer_statement'];
/** Fails on corpus tampering or unsupported structure, not a proof of source authenticity. */
export function validateDossier189(d:ResearchDossier189):void{
 if(!d||d.status!=='research_only_not_reviewed_or_admitted'||!names(d.market)||
 !/^\d{4}-\d\d-\d\d$/.test(d.preparedOn)||typeof d.method!=='string'||d.method.length<50||
 !Array.isArray(d.records)||!d.records.length||d.records.length>500||
 !Array.isArray(d.sourcePages)||!d.sourcePages.length||d.sourcePages.length>80)
 throw Error('invalid189_dossier');
 const sources=new Set<string>();
 for(const s of d.sourcePages){
  if(!names(s?.id)||sources.has(s.id)||!https(s.url)||
   ![s.publisher,s.model,s.method,s.notes].every(v=>typeof v==='string'&&v.length>2))throw Error('invalid189_source');
  sources.add(s.id);
 }
 const ids=new Set<string>();
 for(const r of d.records){
  if(![r?.id,r?.sourceId,r?.category,r?.variantId,r?.field,r?.originalGroup,r?.protocol,r?.condition].every(names)||
   ids.has(r.id)||!sources.has(r.sourceId)||!kinds.includes(r.kind)||
   typeof r.position!=='string'||r.position.length<4||typeof r.context!=='string'||r.context.length<25||
   (r.derivedFrom!==undefined&&(!Array.isArray(r.derivedFrom)||!r.derivedFrom.every(names)||!noCopies(r.derivedFrom)))||
   (r.value!==undefined&&(!Number.isFinite(r.value)||typeof r.unit!=='string'||!names(r.unit)))||
   (r.kind==='instrument_measurement'&&(typeof r.value!=='number'||typeof r.unit!=='string'))||
   (r.kind!=='instrument_measurement'&&r.kind!=='manufacturer_statement'&&r.value!==undefined))throw Error('invalid189_record');
  ids.add(r.id);
 }
 const nodes=new Map(d.records.map(r=>[r.id,r]));const visited=new Set<string>(),pending=new Set<string>();
 const traverse=(r:SourceRecord189):void=>{
  if(pending.has(r.id))throw Error('cycle189');if(visited.has(r.id))return;pending.add(r.id);
  if(r.kind==='editorial_interpretation'&&!(r.derivedFrom?.length))throw Error('unanchored189_editorial');
  for(const p of r.derivedFrom??[]){const parent=nodes.get(p);
   if(!parent||parent.id===r.id||parent.originalGroup!==r.originalGroup||parent.variantId!==r.variantId||
    parent.field!==r.field||parent.category!==r.category)throw Error('cross_group189_derivation');
   traverse(parent);
  }
  pending.delete(r.id);visited.add(r.id);
 };
 for(const r of d.records)traverse(r);
 // One original-group cannot be assigned to different categories/models/fields.
 const groups=new Map<string,string>();
 for(const r of d.records){const identity=[r.category,r.variantId,r.field].join(':');
  if(groups.has(r.originalGroup)&&groups.get(r.originalGroup)!==identity)throw Error('mixed_scope189_origin');
  groups.set(r.originalGroup,identity);
 }
}
/** Only the question's exact model, field, method, condition and unit can serve as numeric evidence.
 * Contextual signals remain useful but cannot satisfy numeric thresholds. */
export function assessQuestion189(d:ResearchDossier189,q:Question189):ResearchFinding189{
 validateDossier189(d);
 if(![q?.id,q?.category,q?.variantId,q?.field,q?.condition,q?.protocol].every(names)||
 !['numeric_minimum','numeric_maximum','experiential_context'].includes(q.kind)||
 (q.kind==='experiential_context'&&(q.threshold!==undefined||q.unit!==undefined))||
 (q.kind!=='experiential_context'&&(!Number.isFinite(q.threshold)||!names(q.unit))))throw Error('invalid189_question');
 const candidates=d.records.filter(r=>r.variantId===q.variantId&&r.category===q.category&&r.field===q.field);
 const scoped=candidates.filter(r=>r.protocol===q.protocol&&r.condition===q.condition);
 const direct=scoped.filter(r=>!r.derivedFrom?.length&&r.kind!=='editorial_interpretation');
 const numerical=direct.filter(r=>r.kind==='instrument_measurement'&&q.kind!=='experiential_context'&&r.unit===q.unit);
 const contextual=direct.filter(r=>['contextual_expert_observation','structured_expert_assessment'].includes(r.kind));
 const independent=new Map<string,SourceRecord189[]>();
 for(const r of numerical){const bucket=independent.get(r.originalGroup)??[];bucket.push(r);independent.set(r.originalGroup,bucket);}
 const values=[...independent.values()].flatMap(rs=>rs.map(r=>r.value!));
 const distinctValues=new Set(values); // same-root repeated raw readings are not different experiments; hold if divergent
 const divergent=[...independent.values()].some(rs=>new Set(rs.map(r=>r.value)).size>1);
 let state:ResearchFinding189['state']='not_established';
 if(q.kind==='experiential_context'&&contextual.length)state='context_observed_only';
 if(q.kind!=='experiential_context'&&values.length){
  if(divergent||distinctValues.size>1)state='conflicting_originals';
  else state=(q.kind==='numeric_minimum'?values[0]>=q.threshold!:values[0]<=q.threshold!)?
   'observed_threshold_met':'observed_threshold_missed';
 }
 const exclusion=scoped.filter(r=>!numerical.includes(r)&&!contextual.includes(r)).map(r=>r.id);
 const ignored=candidates.filter(r=>!scoped.includes(r)).map(r=>r.id);
 const limitations=['Manual web-page annotation, not independently authenticated original source bytes or publisher reuse rights.',
  'This single-criterion assessment cannot establish overall product quality or authorize a recommendation.'];
 if(!values.length&&q.kind!=='experiential_context')limitations.push('No matching original instrument measurement; opinions are not substituted as numeric proof.');
 if(q.kind==='experiential_context')limitations.push('Contextual expert observations require a separate reviewed rubric for any ranking impact.');
 if(state==='conflicting_originals')limitations.push('Conflicting original measurements: review conditions and methodology; no mean or favorable selection.');
 if(candidates.length>scoped.length)limitations.push('Other-method or other-condition evidence was excluded from this question.');
 return {questionId:q.id,variantId:q.variantId,field:q.field,state,
  eligibleOriginalObservationIds: (q.kind==='experiential_context'?contextual:numerical).map(r=>r.id).sort(),
  excludedOrDerivedIds:[...new Set([...exclusion,...ignored])].sort(),
  originalGroups:[...new Set((q.kind==='experiential_context'?contextual:numerical).map(r=>r.originalGroup))].sort(),
  sourceUrls:[...new Set((q.kind==='experiential_context'?contextual:numerical).map(r=>d.sourcePages.find(s=>s.id===r.sourceId)!.url))].sort(),
  limitations,rankingAllowed:false,independentSourceRightsVerified:false};
}
/** Pareto test for two products with the same original protocol and condition on all considered fields.
 * Uses neither speculative trade-off weights nor candidate-set normalized scores. It is NOT an overall rank. */
export function auditStrictPareto189(d:ResearchDossier189,opts:{category:string;variantA:string;variantB:string;
 criteria:readonly {field:string;protocol:string;condition:string;unit:string;direction:'higher'|'lower'}[]}):
 {state:'a_dominates_on_selected_fields'|'b_dominates_on_selected_fields'|'not_dominated'|'incomparable';
  evidenceFields:readonly string[];caution:string}{
 validateDossier189(d);
 if(![opts.category,opts.variantA,opts.variantB].every(names)||opts.variantA===opts.variantB||
 !Array.isArray(opts.criteria)||opts.criteria.length<2||opts.criteria.length>30||!noCopies(opts.criteria.map(c=>c.field))||
 opts.criteria.some(c=>![c.field,c.protocol,c.condition,c.unit].every(names)||!['higher','lower'].includes(c.direction)))throw Error('invalid189_pareto');
 const a:number[]=[],b:number[]=[];
 for(const c of opts.criteria){
  const values=(variantId:string)=>d.records.filter(r=>r.variantId===variantId&&r.category===opts.category&&r.field===c.field&&
   r.protocol===c.protocol&&r.condition===c.condition&&r.unit===c.unit&&r.kind==='instrument_measurement'&&!r.derivedFrom?.length);
  const av=values(opts.variantA),bv=values(opts.variantB);
  if(av.length!==1||bv.length!==1)return {state:'incomparable',evidenceFields:[],caution:'Missing/ambiguous exact-method evidence: no product ordering is inferred.'};
  a.push(c.direction==='higher'?av[0].value!:-av[0].value!);
  b.push(c.direction==='higher'?bv[0].value!:-bv[0].value!);
 }
 const ad=a.every((v,i)=>v>=b[i])&&a.some((v,i)=>v>b[i]);
 const bd=b.every((v,i)=>v>=a[i])&&b.some((v,i)=>v>a[i]);
 return {state:ad?'a_dominates_on_selected_fields':bd?'b_dominates_on_selected_fields':'not_dominated',
  evidenceFields:opts.criteria.map(c=>c.field),
  caution:'Only Pareto relations for chosen comparable measured fields; experiential factors, coverage, error bars and price remain unassessed.'};
}
