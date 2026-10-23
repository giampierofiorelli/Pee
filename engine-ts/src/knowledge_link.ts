/**
 * R2 (owner S68, 2026-10-19): the typed, reversible link between the newer reader's values and the category teaching.
 *
 * Why this module. R1 (docs/plans/r1-conformity.md §7) showed two links, both inadequate:
 * - the inherited lexical link (`linkToMeasure272`) attaches a value to a taught measurement when one dimension word is
 *   shared, so it links values where no taught measurement applies;
 * - the R1 typed seam selected candidates from the same dimension words, so values with a known metric found no
 *   candidate (gamut coverage), and values of different measurands met as rivals (CADR vs air changes).
 * No existing module owns the alignment of taught measurements with typed measurands: the extraction plan
 * (`phase272_extraction_plan.ts`) is the older reader's guide and its identity must not change, and the quantity
 * knowledge (`quantity_knowledge.ts`) knows metrics, kinds and condition axes but not the teaching.
 *
 * What it does. Two steps, both reversible views (nothing is written to the store):
 * 1. **Translation with provenance.** Each taught measurement is read with the quantity knowledge's own vocabulary
 *    (metric terms, kind terms, unit forms, condition values), giving a typed descriptor: the measurands it measures
 *    (named in the concept's head, or only mentioned in its statement), the condition values it fixes, and the
 *    condition axes its requirements name. Every element records the words it came from.
 * 2. **Inference with proofs.** The link and its evidential force are derived by the KR programs `link` and
 *    `evidence` (the file named by LINK_RULES_FILE; older link-rules files are replay data only, see
 *    `resources/quantity-knowledge/README.md`), so every link, abstention and force carries its
 *    derivation.
 *
 * What it does not do. It adds no recogniser and no category-specific rule. Taught words the quantity knowledge does not
 * type (e.g. "SDR" as a signal mode) are reported as untyped: a gap in the knowledge, never guessed. Nothing is written
 * to the store and no ranking decision changes: on the advice path its conclusions appear only in the shadow
 * `derivedConditions` trace (S83).
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileRuleSet,evaluate,type CompiledProgram,type Fact,type Model,type RuleSet} from './knowledge_rules.js';
import {namedPhrases,normText,parseUnit,type QuantityKnowledge,type TypedQuantity} from './quantity_knowledge.js';
import type {KnowledgeStore246} from './phase246_knowledge_store.js';
import {relations247,sufficiencyOf247} from './phase247_category_relations.js';
import {compareQuantities,findQuantities,loadQuantityKnowledge,typeQuantity,typeStoredQuantity,type ComparisonResult} from './quantity_knowledge.js';

/** lk.9 (S82 kr82.1: a condition is shown only whole; within-source scope kept; no-requirement verdict named);
 * lk.8 (S81: condition concepts, comparability under the teaching, attribute proxies); v1-v8 stay loadable to
 * reproduce earlier runs. */
export const LINK_RULES_FILE='link-rules.v9.json';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');

/** A teaching concept as the store holds it: its id (the concept's name), its statement and aliases. */
export interface TaughtConcept {id:string;statement:string;aliases?:readonly string[]}
/** The evidential force of a measured_by relation, from the source verification (R1 §7.1): direct = the measurement
 * establishes the outcome; partial = it contributes to assessing it; unverified = no verdict. */
export type RelationForce='direct'|'partial'|'unverified';
export interface TeachingMeasurement {concept:TaughtConcept;
 /** measured_by relations: the outcome and the force the verification gives the relation */
 outcomes:{outcome:string;force:RelationForce;relation:string}[];
 /** not_sufficient_for relations: outcomes for which the teaching says this measurement is an indirect indicator only */
 indirectFor:string[];
 /** requires_condition targets */
 conditions:TaughtConcept[]}
export interface TeachingView {category:string;measurements:TeachingMeasurement[];
 /** what the view was built from, so a reading that used it is reproducible */
 basis:{items:number;relations:number;forceOverlay:string|null}}
/** Source-verification verdicts by relation id (`support`, `sufficiency`), as `pee-knowledge/knowledge-overlays/`. */
export interface ForceOverlay {id:string;relations:Record<string,{support:string;sufficiency?:string}>}

/** Build the teaching view of a category from the store (read only). Taught measurements that are themselves the target
 * of a requires_condition relation are conditions, not measurements (as in the extraction plan). A relation the
 * verification found not supported, or not found in the source, is left out; its force otherwise follows the verdict. */
export function teachingView(store:KnowledgeStore246,category:string,overlay?:ForceOverlay|null):TeachingView{
 // S81: with no overlay argument, the force comes from the store's own source-citing assessments (relation_assessments,
 // S78). Before S81 a caller that passed none got 'unverified' for every relation although the store held the verdicts.
 // Pass null for the pre-S81 view (no verdicts), or an overlay file to reproduce earlier runs.
 if(overlay===undefined)overlay=storeForceOverlay(store,category);
 const items=store.categoryItems246(category);const rels=relations247(store,category);
 const byItem=new Map(items.map(i=>[i.itemId,i]));const ref=(r:string)=>r.startsWith('item:')?byItem.get(r.slice(5)):undefined;
 const concept=(i:NonNullable<ReturnType<typeof ref>>):TaughtConcept=>({id:i.concept!.id,statement:i.statement,aliases:i.concept!.aliases});
 const condIds=new Set(rels.filter(r=>r.kind==='requires_condition').map(r=>ref(r.to)?.concept?.id).filter(Boolean));
 const verdict=(rid:string)=>overlay?.relations[rid];
 const usable=(rid:string)=>{const v=verdict(rid);return !v||v.support==='supported'||v.support==='partially_supported';};
 const force=(rid:string):RelationForce=>{const s=verdict(rid)?.sufficiency;return s==='establishes'?'direct':s==='informs_only'?'partial':'unverified';};
 const ms=items.filter(i=>i.concept?.kind==='measurement'&&!condIds.has(i.concept.id));
 const seen=new Set<string>();const measurements:TeachingMeasurement[]=[];
 for(const m of ms){if(seen.has(m.concept!.id))continue;seen.add(m.concept!.id);
  const mine=rels.filter(r=>ref(r.from)?.concept?.id===m.concept!.id&&usable(r.relationId));
  const to=(r:typeof rels[number])=>ref(r.to);
  measurements.push({concept:concept(m),
   outcomes:mine.filter(r=>r.kind==='measured_by'&&to(r)?.concept).map(r=>({outcome:to(r)!.concept!.id,force:force(r.relationId),relation:r.relationId})),
   indirectFor:[...new Set(mine.filter(r=>r.kind==='not_sufficient_for'&&to(r)?.concept).map(r=>to(r)!.concept!.id))],
   conditions:mine.filter(r=>r.kind==='requires_condition'&&to(r)?.concept).map(r=>concept(to(r)!))});}
 measurements.sort((a,b)=>a.concept.id.localeCompare(b.concept.id));
 return {category,measurements,basis:{items:items.length,relations:rels.length,forceOverlay:overlay?.id??null}};
}

export interface Measurand {kind:string;metric:string|null;level:'head'|'body';from:string}
export interface MeasurementDescriptor {id:string;measurands:Measurand[];fixed:{axis:string;value:string;from:string}[];
 axes:{axis:string;from:string}[];
 /** words of the concept's name that the quantity knowledge does not type: what the teaching says and PEE cannot read */
 untyped:string[];
 /** R3: the untyped words of the measurand part (before by/at/per...): qualifiers of what is measured, not axes it varies over */
 qualifiers:string[]}

/** "<measurand> by|at|per <conditions>": what precedes the first such word names what is measured. */
const HEAD_SPLIT=/\s(?:by|at|per|for|with|across|under|versus|vs|in|on|over)\s/;
/** S82: nouns that name the act of testing ("empty run", "cooking test"); they qualify no measurand. */
const PROCEDURE_NOUNS=new Set(['run','runs','test','tests','trial','trials','task','tasks','assessment','assessments']);
const STOP=new Set(['and','or','the','a','an','of','to','vs','versus','by','at','per','for','with','in','on','over','under','across','plus']);
/** The first sentence of a teaching statement, without the "Condition:" prefix and the source tail. */
export function statementHead(s:string):string{return (s.replace(/^Condition:\s*/,'').split(/(?<=[.;])\s|\s\[|\sPackage\s/)[0]??s).trim();}
const words=(s:Set<string>)=>[...s].flatMap(h=>h.split(' '));

/** Step 1: translate a taught measurement into a typed descriptor with the quantity knowledge's vocabulary. */
export function describeMeasurement(qk:QuantityKnowledge,c:TaughtConcept,conditions:readonly TaughtConcept[]=[]):MeasurementDescriptor{
 const heads=[c.id.replace(/_/g,' '),...(c.aliases??[])];
 const head=heads.join(' ; ');
 // the split word must follow a first word ("in situ sound pressure" is all measurand)
 const measurandPart=heads.map(h=>h.split(HEAD_SPLIT)[0]).join(' ; ');
 const conditionPart=heads.map(h=>{const i=h.search(HEAD_SPLIT);return i<0?'':h.slice(i);}).join(' ; ');
 const body=statementHead(c.statement);
 const measurands:Measurand[]=[];const typed=new Set<string>();
 const add=(m:Measurand)=>{const same=measurands.find(x=>x.kind===m.kind&&x.metric===m.metric);if(!same)measurands.push(m);else if(same.level==='body'&&m.level==='head')Object.assign(same,m);};
 for(const [text,level] of [[measurandPart,'head'],[body,'body']] as const){
  for(const m of qk.metrics.values()){const hit=namedPhrases(text,m.terms);if(hit.size){add({kind:m.kind,metric:m.id,level,from:[...hit].join('/')});if(level==='head')for(const w of words(hit))typed.add(w);}}
  if(level==='body')continue; // kinds and units only from the name: a statement mentions many quantities it does not measure
  for(const k of qk.kinds.values()){const hit=namedPhrases(text,k.terms);if(hit.size){add({kind:k.id,metric:null,level,from:[...hit].join('/')});for(const w of words(hit))typed.add(w);}}
  for(const tok of normText(text).split(/[\s;]+/)){if(tok.length<2||/^\d+$/.test(tok)||STOP.has(tok))continue;const u=parseUnit(qk,tok);
   if(u&&u.kinds.length===1&&u.atoms.length){add({kind:u.kinds[0],metric:null,level,from:tok});typed.add(tok);}}}
 const fixed:{axis:string;value:string;from:string}[]=[];const axes:{axis:string;from:string}[]=[];
 const need=(axis:string,from:string)=>{if(qk.axes.has(axis)&&!axes.some(x=>x.axis===axis))axes.push({axis,from});};
 for(const a of qk.axes.values()){
  for(const [v,terms] of Object.entries(a.values??{})){const hit=namedPhrases(head,terms);if(hit.size){fixed.push({axis:a.id,value:v,from:[...hit].join('/')});for(const w of words(hit))typed.add(w);}}
  // the concept's name may name an axis by its name or a distinctive cue ("by window"); a requires_condition statement
  // must name the axis itself ("the same fan setting"): cues are too general for running text
  const inName=namedPhrases(conditionPart,[a.id.replace(/_/g,' '),...(a.cues??[]).filter(x=>x.length>=6)]);
  if(inName.size){need(a.id,`name (${[...inName].join('/')})`);for(const w of words(inName))typed.add(w);}
  for(const k of conditions){const hit=namedPhrases(k.id.replace(/_/g,' ')+' ; '+statementHead(k.statement),[a.id.replace(/_/g,' ')]);if(hit.size)need(a.id,`requires_condition:${k.id}`);}}
 // a metric's own required conditions belong to its values (TypedQuantity.missingConditions), not to the measurement:
 // a CADR needs its pollutant, the sound level measured in the same programme does not
 // S82: generic procedure nouns name the act of testing, not what is measured or under what: never an untyped part
 const untyped=[...new Set(normText(c.id.replace(/_/g,' ')).split(/\s+/))].filter(w=>w.length>1&&!STOP.has(w)&&!typed.has(w)&&!PROCEDURE_NOUNS.has(w));
 const measurandWords=new Set(normText(measurandPart).split(/[\s;]+/));
 const qualifiers=untyped.filter(w=>measurandWords.has(w));
 return {id:c.id,measurands,fixed,axes,untyped,qualifiers};
}

// ---------------------------------------------------------------------------------------------------------------------
let cached:{rules:Map<string,CompiledProgram>;version:string;digest:string}|null=null;
/** Load (and validate) the link rules. Pass a rule set to evaluate another version. */
export function loadLinkRules(rs?:RuleSet):{rules:Map<string,CompiledProgram>;version:string;digest:string}{
 if(!rs&&cached)return cached;
 const src=rs?JSON.stringify(rs):readFileSync(new URL('../../resources/quantity-knowledge/'+LINK_RULES_FILE,import.meta.url),'utf8');
 const parsed=rs??JSON.parse(src) as RuleSet;const out={rules:compileRuleSet(parsed),version:parsed.version,digest:sha(src)};if(!rs)cached=out;return out;
}

/** A value the newer reader found, as the link needs it. */
export interface LinkValue {id:string;quantity:TypedQuantity;product:string|null;
 /** S70: the source document the value comes from */
 source?:string|null;
 /** S71/S72: the identified test RUN (one execution of an experiment) the value comes from, within its source. A protocol
  * or a named test procedure is not a run. Absent = unknown, never assumed. */
 test?:string|null;
 /** S72: the identified procedure (protocol statement or named test procedure) the value was obtained with: it supports
  * compatibility, never identity. */
 protocol?:string|null;
 /** S81: condition concepts the value's record states (taught condition id -> the record's description). */
 states?:Readonly<Record<string,string>>}
export type LinkStatus='linked'|'linked_condition_not_shown'|'linked_equivalent'|'ambiguous'|'member_only'|'no_taught_measurement'|'not_linked';
export interface LinkResult {value:string;status:LinkStatus;measurements:string[];
 /** S69: the analytical sets the value is a member of (not exclusive, not evidence of the set's relationship) */
 memberships:string[];
 /** S69/S71: the original observation the value reports (shared by repeated reports); null = identity unknown */
 observation:string|null;
 /** what the value bears on: outcome, force (direct, partial, unverified, indirect, conditions_not_shown), measurement */
 evidence:{outcome:string;force:string;measurement:string}[];
 /** for an ambiguity: condition axes that would decide it and the value does not state; empty = nothing in the
  * knowledge tells the candidates apart */
 decidingAxes:string[];
 derivation:string[]}
export interface OutcomeAssessment {product:string;outcome:string;assessment:string;derivation:string[]}
export interface LinkReading {schema:'pee.r2.knowledge-link.v1';rules:string;view:TeachingView['basis'];descriptors:MeasurementDescriptor[];
 results:LinkResult[];outcomes:OutcomeAssessment[];
 /** S69: relationships of analytical sets supported by aligned observations (a point at one setting, or two or more points) */
 relationships:{product:string;measurement:string;kind:'aligned_point'|'relationship_at_points'|'compatibility_not_shown';axis:string|null;setting:string|null;
  /** S70: how compatibility is shown: same_document (one source's protocol) or stated_method */
  basis:string|null;derivation:string[]}[];
 /** S69: values that report the same observation */
 repeatedReports:[string,string][];
 /** shadow only: never stored, never a ranking input */
 rankingInput:false}

/** S69: the measurand groups of a descriptor (head measurands only). Measurands named by the same words, or of the same
 * kind, are one group ("noise" gives two sound kinds; a metric and its kind are one); a measurement of two or more
 * groups is an analytical set. */
export function measurandGroups(d:MeasurementDescriptor):{group:string;kinds:string[];metrics:string[]}[]{
 const gs:{group:string;kinds:Set<string>;metrics:Set<string>;from:Set<string>}[]=[];
 for(const m of d.measurands.filter(x=>x.level==='head')){
  const hit=gs.filter(g=>g.from.has(m.from)||g.kinds.has(m.kind));
  const g=hit[0]??{group:'',kinds:new Set<string>(),metrics:new Set<string>(),from:new Set<string>()};if(!hit.length)gs.push(g);
  for(const o of hit.slice(1)){o.kinds.forEach(k=>g.kinds.add(k));o.metrics.forEach(k=>g.metrics.add(k));o.from.forEach(k=>g.from.add(k));gs.splice(gs.indexOf(o),1);}
  g.kinds.add(m.kind);if(m.metric)g.metrics.add(m.metric);g.from.add(m.from);}
 return gs.map(g=>({group:[...g.from].sort().join('+'),kinds:[...g.kinds].sort(),metrics:[...g.metrics].sort()}));
}
/** S69-S71: the identity of an original observation (SOSA/SSN: the act of observation, not its numerical result). It is
 * established only from an identified test within a known source: then one test reported twice (a table and the prose)
 * is one observation, and two tests with the same number are two. Without a test identity it is null: neither
 * equivalence nor independence is assumed. */
export function observationKey(v:LinkValue):string|null{const q=v.quantity;
 if(!v.source||!v.product||!v.test)return null;
 const prop=q.metric.id??q.kind.id??q.kind.candidates.join('|');const val=q.si?.value??q.value;
 return [v.source,v.test,v.product,prop,String(val),q.conditions.map(c=>c.axis+'='+c.value).sort().join(';')].join('\u0001');
}
/** S71/S72: the procedure identity a reading supplies for a value, when it has one: the protocol statement that covers
 * the value (QK), or the named test procedure the reader attached as its method ("our particle removal test"). It is a
 * procedure, shared by every run that used it: a compatibility basis, never an observation's identity. The reader
 * supplies no run identity today, so identity stays unknown for reader values. */
export function readerProcedureIdentity(q:TypedQuantity):string|null{
 if(q.protocol)return 'protocol:'+q.protocol;const m=q.conditions.find(c=>c.axis==='method'&&/\b(?:test|tests|testing|benchmark|trial)\b/.test(c.value));
 return m?'named_test:'+m.value:null;
}
/** lk.4 reproduction only: lk.4 used the procedure as the test identity (superseded by S72). */
export const readerTestIdentity=readerProcedureIdentity;
/** The input facts of the `link` program for a set of values and descriptors (exported for tests and the census). */
export function linkFacts(view:TeachingView,descriptors:readonly MeasurementDescriptor[],values:readonly LinkValue[],qk?:QuantityKnowledge):Record<string,(string|number)[][]>{
 const I:Record<string,(string|number)[][]>={value:[],value_kind:[],value_metric:[],value_condition:[],value_missing:[],value_product:[],value_source:[],value_test:[],value_protocol:[],observation:[],incomplete:[],unread_qualifier:[],closed_axis:[],operating_axis:[],measurement:[],measures:[],measures_metric:[],group_kind:[],group_metric:[],fixes:[],requires_axis:[],leads_to:[],indirect_for:[]};
 for(const v of values){const q=v.quantity;I.value.push([v.id]);
  for(const k of q.kind.id?[q.kind.id]:q.kind.candidates)I.value_kind.push([v.id,k]);
  if(q.metric.id)I.value_metric.push([v.id,q.metric.id]);
  for(const c of q.conditions)I.value_condition.push([v.id,c.axis,c.value]);
  for(const a of q.missingConditions)I.value_missing.push([v.id,a]);
  if(v.product)I.value_product.push([v.id,v.product]);
  if(v.source)I.value_source.push([v.id,v.source]);
  if(v.test&&v.source)I.value_test.push([v.id,v.source+'#'+v.test]);
  if(v.protocol&&v.source)I.value_protocol.push([v.id,v.source+'#'+v.protocol]);
  const ok=observationKey(v);if(ok)I.observation.push([v.id,ok]);
  for(const [c,w] of Object.entries(v.states??{}))(I.value_states??=[]).push([v.id,c,w]);}
 // S81: every taught requirement is a fact (condition concept), typed by the axes it names when the quantity knowledge
 // is given; lk.6 saw only the requirements that happened to name an axis and treated the others as met
 if(qk)for(const m of view.measurements)for(const c of m.conditions){const cc=conditionConcept(qk,c);
  (I.requires_cond??=[]).push([m.concept.id,cc.id]);if(cc.identity)(I.identity_cond??=[]).push([cc.id]);for(const a of cc.axes)(I.cond_axis??=[]).push([cc.id,a]);
  if(cc.axes.length&&!cc.whole)(I.cond_partial??=[]).push([cc.id]);}
 for(const d of descriptors){I.measurement.push([d.id]);if(d.untyped.length)I.incomplete.push([d.id]);if(d.qualifiers?.length)I.unread_qualifier.push([d.id]);
  for(const g of measurandGroups(d)){for(const k of g.kinds)I.group_kind.push([d.id,g.group,k]);for(const x of g.metrics)I.group_metric.push([d.id,g.group,x]);}
  for(const m of d.measurands){if(m.metric)I.measures_metric.push([d.id,m.metric,m.level]);
   if(!m.metric||m.level==='head')I.measures.push([d.id,m.kind,m.level]);}
  for(const f of d.fixed)I.fixes.push([d.id,f.axis,f.value]);for(const a of d.axes){I.requires_axis.push([d.id,a.axis]);
   // S82: an axis named by a required condition is checked through that condition when the record states it as a concept
   const via=/^requires_condition:(.+)$/.exec(a.from);if(via)(I.requires_axis_via??=[]).push([d.id,a.axis,via[1]]);}}
 for(const m of view.measurements){for(const o of m.outcomes)I.leads_to.push([m.concept.id,o.outcome,o.force]);for(const o of m.indirectFor)I.indirect_for.push([m.concept.id,o]);}
 if(qk)for(const a of qk.axes.values()){if(Object.keys(a.values??{}).length)I.closed_axis.push([a.id]);if(a.operatingCondition)I.operating_axis.push([a.id]);}
 for(const k of Object.keys(I))I[k]=[...new Map(I[k].map(r=>[r.join('\u0001'),r])).values()];
 return I;
}

/** Step 2: link values to taught measurements and grade what they bear on, with the KR programs `link` and `evidence`. */
export function linkValues(qk:QuantityKnowledge,view:TeachingView,values:readonly LinkValue[],opts:{rules?:RuleSet;descriptors?:MeasurementDescriptor[]}={}):LinkReading{
 const R=loadLinkRules(opts.rules);const link=R.rules.get('link'),ev=R.rules.get('evidence');if(!link||!ev)throw Error('knowledge_link_rules_missing_program');
 const descriptors=opts.descriptors??view.measurements.map(m=>describeMeasurement(qk,m.concept,m.conditions));
 const I=linkFacts(view,descriptors,values,qk);
 // a rule version receives only the facts its vocabulary declares (lk.1 reproduces earlier runs)
 const only=(p:CompiledProgram,F:Record<string,(string|number)[][]>)=>Object.fromEntries(Object.entries(F).filter(([k])=>p.vocab.has(k)&&(p.vocab.get(k)!.role==='input'||!p.rules.some(r=>r.head.pred===k))));
 const ml=evaluate(link,only(link,I),{record:'the values and the teaching view'});
 const pass=(m:Model,pred:string)=>m.all(pred).map(f=>f.args);
 const me=evaluate(ev,only(ev,{...I,member:pass(ml,'member'),member_group:pass(ml,'member_group'),
  identity_unknown:pass(ml,'identity_unknown'),
  link_to:[...pass(ml,'linked').map(a=>[a[0],a[1]]),...pass(ml,'linked_equivalent')],assumes_condition:pass(ml,'linked').filter(a=>a[2]==='condition_not_shown').map(a=>[a[0],a[1]])}),
  {record:'the links and the teaching view'});
 const results:LinkResult[]=values.map(v=>{const linked=ml.match('linked',[v.id,null,null]),eq=ml.match('linked_equivalent',[v.id,null]),amb=ml.match('ambiguous',[v.id,null]);
  const none=ml.match('no_taught_measurement',[v.id]),mem=ml.match('member',[v.id,null]);
  const status:LinkStatus=linked.length?(linked[0].args[2]==='condition_not_shown'?'linked_condition_not_shown':'linked'):eq.length?'linked_equivalent':amb.length?'ambiguous':
   ml.has('member_only',[v.id])?'member_only':none.length?'no_taught_measurement':'not_linked';
  const measurements=[...new Set([...linked,...eq,...amb].map(f=>f.args[1]))].sort();
  const evidence=me.match('evidence_force',[v.id,null,null,null]).map(f=>({outcome:f.args[1],force:f.args[2],measurement:f.args[3]}));
  const decidingAxes=[...new Set(ml.match('deciding_axis',[v.id,null]).map(f=>f.args[1]))].sort();
  const shown:Fact[]=[...linked,...eq,...amb,...mem,...none].slice(0,3);
  return {value:v.id,status,measurements,memberships:mem.map(f=>f.args[1]).sort(),observation:observationKey(v),evidence,decidingAxes,derivation:shown.flatMap(f=>ml.why(f))};});
 const outcomes:OutcomeAssessment[]=me.all('outcome_assessment').map(f=>({product:f.args[0],outcome:f.args[1],assessment:f.args[2],derivation:me.why(f)}));
 const relationships=[...me.all('aligned_point').map(f=>({product:f.args[0],measurement:f.args[1],kind:'aligned_point' as const,axis:f.args[2],setting:f.args[3],basis:f.args[4]??null,derivation:me.why(f)})),
  ...me.all('compatibility_not_shown').map(f=>({product:f.args[0],measurement:f.args[1],kind:'compatibility_not_shown' as const,axis:f.args[2],setting:f.args[3],basis:null,derivation:me.why(f)})),
  ...me.all('relationship_at_points').map(f=>({product:f.args[0],measurement:f.args[1],kind:'relationship_at_points' as const,axis:null,setting:null,basis:null,derivation:me.why(f)}))];
 const repeatedReports=ml.all('repeated_report').map(f=>[f.args[0],f.args[1]] as [string,string]).filter(([a,b])=>a<b);
 return {schema:'pee.r2.knowledge-link.v1',rules:`${R.version}:${R.digest.slice(0,12)}`,view:view.basis,descriptors,results,outcomes,relationships,repeatedReports,rankingInput:false};
}

// =====================================================================================================================
// S81 (owner brief 2026-10-19, "make scientific knowledge operational"). The S81 trace and battery
// (evaluation/s81) found that the acquired teaching reached the reasoning only in part:
//  - requires_condition relations were checked only when the condition named a quantity-knowledge axis (23 of 79);
//    every other requirement (56 of 79 in the store) was treated as met: a conclusion from an absence over an
//    incomplete record;
//  - pairwise comparability (QK program `compare`) never consulted the teaching's requirements;
//  - the 49 not_sufficient_for relations from DECLARED attributes (capacity, filter class, peak-brightness claims)
//    were not available to any inference;
//  - a caller of teachingView got 'unverified' force although the store held the source verdicts.
// The functions below give the existing KR programs (link, evidence, comparable of LINK_RULES_FILE) the whole teaching
// as facts. They add no category rule and no vocabulary: what changes a
// conclusion is the knowledge in the store.
// Nothing here is written to the store or changes a ranking decision (S83: the advice trace shows it as shadow).
export const KR81_VERSION='kr82.1';

/** The store's own source-citing sufficiency verdicts (relation_assessments, S78) as a force overlay. */
export function storeForceOverlay(store:KnowledgeStore246,category:string):ForceOverlay{
 const relations:ForceOverlay['relations']={};
 for(const r of relations247(store,category))if(r.kind==='measured_by'){const s=sufficiencyOf247(store,r.relationId).state;
  relations[r.relationId]={support:'supported',...(s==='established'?{sufficiency:'establishes'}:s==='informs_only'?{sufficiency:'informs_only'}:{})};}
 return {id:'store:relation_assessments',relations};
}

/** A taught condition as a reasoning object. `identity`: it binds each result to its exact product (its name says
 * variant or model), so it is shown per result and never required to be equal across products. `axes`: the
 * quantity-knowledge condition axes its name or statement names (a result stating them shows it). */
export interface ConditionConcept {id:string;statement:string;identity:boolean;axes:string[];
 /** S82 (owner review of S81): whether its axes cover the WHOLE condition. A condition whose statement names more than
  * its axes (the dishwasher acoustic condition names the programme among quantity, distance, room and installation) is
  * only partly typed: stating its axes shows a component, never the condition. `residue`: the statement's content
  * words no axis, value, quantity term or requirement word accounts for (the same test as a measurement's untyped
  * words). */
 whole:boolean;residue:string[];
 /** S82: values the teaching enumerates for the condition's axis ("the exact programme (eco, auto, quick, intensive,
  * sanitise)"): distinct members of one enumeration are documented-different states. */
 enumerated:string[]}
// S82: an identity condition binds a result to its exact product: its name says variant or model. "identity" alone is
// not enough: programme_identity is the exact programme, a condition of the result (kr81 typed it as product identity).
const IDENTITY_NAME=/(?:^|_)(?:variant|model)(?:_|$)/;
/** English words that frame a requirement (compare, record, state, every, same...): never a component of a condition. */
const REQUIREMENT_WORDS=new Set(('a an the of to for and or with in on at by from as is are be been being must should every each all any only when same both its their this that these those than '+
 'so not no it they there which while compare compared comparison comparisons measured measure measurement measurements result results value values number numbers performance '+
 'record recorded records state stated states name named keep store tie bind need needs use using used include included including match matched matching eg e g such example whether '+
 'whose kept attached separate separately apply applies exact').split(/\s+/));
const typedTermWords=new WeakMap<QuantityKnowledge,Set<string>>();
function quantityTermWords(qk:QuantityKnowledge):Set<string>{let s=typedTermWords.get(qk);if(s)return s;s=new Set();
 for(const m of qk.metrics.values())for(const t of m.terms)for(const w of normText(t).split(/\s+/))s.add(w);
 for(const k of qk.kinds.values())for(const t of k.terms??[])for(const w of normText(t).split(/\s+/))s.add(w);
 typedTermWords.set(qk,s);return s;}
export function conditionConcept(qk:QuantityKnowledge,c:TaughtConcept):ConditionConcept{
 const head=statementHead(c.statement);const text=c.id.replace(/_/g,' ')+' ; '+head;
 const axes=[...qk.axes.values()].filter(a=>namedPhrases(text,[a.id.replace(/_/g,' ')]).size).map(a=>a.id).sort();
 const covered=new Set(quantityTermWords(qk));const valueTerms:string[]=[];
 for(const id of axes){const ax=qk.axes.get(id)!;for(const w of id.split('_'))covered.add(w);for(const t of ax.cues??[])for(const w of normText(t).split(/\s+/))covered.add(w);
  for(const ts of Object.values(ax.values??{}))for(const t of ts){valueTerms.push(normText(t));for(const w of normText(t).split(/\s+/))covered.add(w);}}
 // an enumeration in parentheses that holds a known value of the condition's axis lists values of that axis
 // ("the exact programme (eco, auto, quick, intensive, sanitise)"); one that holds none lists components ("the same food
 // (state, cut, starting temperature)"), which stay part of the condition
 const enumerated:string[]=[];
 for(const m of head.matchAll(/\(([^)]*)\)/g)){const members=m[1].split(/,|\band\b|\bor\b/).map(x=>normText(x).trim()).filter(Boolean);
  if(members.some(x=>valueTerms.includes(x))){for(const x of members){enumerated.push(x);for(const w of x.split(/\s+/))covered.add(w);}}}
 const residue=axes.length?[...new Set(normText(head).split(/[^a-z0-9]+/).filter(w=>w.length>1&&!/^\d+$/.test(w)&&!REQUIREMENT_WORDS.has(w)&&!covered.has(w)))]:[];
 return {id:c.id,statement:head,identity:IDENTITY_NAME.test(c.id),axes,whole:axes.length>0&&!residue.length,residue,enumerated:[...new Set(enumerated)]};
}

/** A declared attribute the teaching marks not sufficient for an outcome (a not_sufficient_for relation from attr:). */
export interface AttributeLimit {attribute:string;outcome:string;relation:string}
const normAttr=(s:string)=>s.toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
export type KnowledgeAblation='conditions'|'proxies'|'assessments';
/** Everything a category's teaching gives the reasoning, as one reproducible object. `ablate` removes one kind of
 * knowledge (for knowledge-on/off experiments); `dropRelation` removes one relation (metamorphic tests). */
export interface CategoryKnowledge {category:string;view:TeachingView;descriptors:MeasurementDescriptor[];attributeLimits:AttributeLimit[];
 basis:TeachingView['basis']&{kr:string;ablated:KnowledgeAblation|null;dropped:string|null}}
export function categoryKnowledge(store:KnowledgeStore246,category:string,opts:{qk?:QuantityKnowledge;ablate?:KnowledgeAblation|null;
 dropRelation?:{from:string;to:string;kind:'measured_by'|'not_sufficient_for'}|null;overlay?:ForceOverlay|null}={}):CategoryKnowledge{
 const qk=opts.qk??defaultQk();const ab=opts.ablate??null;const drop=opts.dropRelation??null;
 const base=teachingView(store,category,ab==='assessments'?null:opts.overlay);
 const measurements=base.measurements.map(m=>({...m,
  outcomes:m.outcomes.filter(o=>!(drop?.kind==='measured_by'&&drop.from===m.concept.id&&drop.to===o.outcome)),
  indirectFor:ab==='proxies'?[]:m.indirectFor.filter(o=>!(drop?.kind==='not_sufficient_for'&&drop.from===m.concept.id&&drop.to===o)),
  conditions:ab==='conditions'?[]:m.conditions}));
 const view:TeachingView={...base,measurements};
 const items=new Map(store.categoryItems246(category).map(i=>['item:'+i.itemId,i]));
 const attributeLimits=ab==='proxies'?[]:relations247(store,category).filter(r=>r.kind==='not_sufficient_for'&&r.from.startsWith('attr:')&&items.get(r.to)?.concept)
  .map(r=>({attribute:normAttr(r.from.slice(5)),outcome:items.get(r.to)!.concept!.id,relation:r.relationId}))
  .filter(a=>!(drop?.kind==='not_sufficient_for'&&normAttr(drop.from)===a.attribute&&drop.to===a.outcome));
 return {category,view,descriptors:measurements.map(m=>describeMeasurement(qk,m.concept,m.conditions)),attributeLimits,
  basis:{...view.basis,kr:KR81_VERSION,ablated:ab,dropped:drop?`${drop.kind}:${drop.from}->${drop.to}`:null}};
}
let qkDefault:QuantityKnowledge|null=null;
function defaultQk():QuantityKnowledge{return qkDefault??=loadQuantityKnowledge();}

/** A result or reading as the S81 reasoning takes it. `measurement`: the taught measurement when the record identifies it
 * (a structured statement); otherwise the link program infers it from `quantity`. `axes` and `states`: the conditions
 * the record states, as axis values and as condition concepts. */
export interface ObservedValue {id:string;product:string|null;measurement?:string|null;quantity:TypedQuantity|null;
 axes?:readonly (readonly [string,string])[];states?:Readonly<Record<string,string>>;source?:string|null;test?:string|null}
const asLinkValue=(v:ObservedValue):LinkValue|null=>v.quantity?{id:v.id,quantity:withAxes(v.quantity,v.axes),product:v.product,source:v.source??null,test:v.test??null,states:v.states}:null;
const withAxes=(q:TypedQuantity,axes?:ObservedValue['axes'])=>!axes?.length?q:{...q,conditions:[...q.conditions,...axes.filter(([a])=>!q.conditions.some(c=>c.axis===a)).map(([axis,value])=>({axis,value,raw:value,from:'labels' as const}))]};
const onlyFor=(p:CompiledProgram,F:Record<string,(string|number)[][]>)=>Object.fromEntries(Object.entries(F).filter(([k])=>p.vocab.has(k)&&(p.vocab.get(k)!.role==='input'||!p.rules.some(r=>r.head.pred===k))));
/** Input facts of the S81 programs for a set of values (the link facts, plus identified links and stated conditions). */
function knowledgeFacts(qk:QuantityKnowledge,k:CategoryKnowledge,values:readonly ObservedValue[]):Record<string,(string|number)[][]>{
 const lv=values.map(asLinkValue).filter((x):x is LinkValue=>!!x);
 const I=linkFacts(k.view,k.descriptors,lv,qk);
 const add=(p:string,row:(string|number)[])=>{(I[p]??=[]).push(row);};
 for(const v of values){if(!v.quantity){add('value',[v.id]);if(v.product)add('value_product',[v.id,v.product]);
   for(const [a,x] of v.axes??[])add('value_condition',[v.id,a,x]);for(const [c,w] of Object.entries(v.states??{}))add('value_states',[v.id,c,w]);}}
 for(const key of Object.keys(I))I[key]=[...new Map(I[key].map(r=>[r.join('\u0001'),r])).values()];
 return I;
}
export interface EvidenceUnderKnowledge {rules:string;knowledge:CategoryKnowledge['basis'];
 results:{value:string;outcome:string;force:string;measurement:string;derivation:string[]}[];
 /** outcome -> the forces the values bear on it (unverified reported as not_verified) */
 byOutcome:Record<string,string[]>;
 outcomes:OutcomeAssessment[];
 /** per value: the required condition concepts its record does not show, by measurement */
 conditionsNotShown:{value:string;measurement:string;condition:string}[];rankingInput:false}
/** What each value is evidence of, under the teaching: the link (given or inferred), the force the source assessment
 * gives it, every required condition shown or not, proxies as indirect only. Program `evidence` of LINK_RULES_FILE. */
export function evidenceUnderKnowledge(qk:QuantityKnowledge,k:CategoryKnowledge,values:readonly ObservedValue[],opts:{rules?:RuleSet}={}):EvidenceUnderKnowledge{
 const R=loadLinkRules(opts.rules);const link=R.rules.get('link')!,ev=R.rules.get('evidence')!;
 const I=knowledgeFacts(qk,k,values);const known=new Set(k.view.measurements.map(m=>m.concept.id));
 const given=values.filter(v=>v.measurement&&known.has(v.measurement));
 const inferred=values.filter(v=>!v.measurement&&v.quantity);
 let linkTo:(string|number)[][]=given.map(v=>[v.id,v.measurement!]);let assumes:(string|number)[][]=[];const pass:Record<string,(string|number)[][]>={member:[],member_group:[],identity_unknown:[]};
 if(inferred.length){const ml=evaluate(link,onlyFor(link,I),{record:'the values and the teaching'});const ids=new Set(inferred.map(v=>v.id));
  const p=(pred:string)=>ml.all(pred).map(f=>f.args).filter(a=>ids.has(String(a[0])));
  linkTo=[...linkTo,...p('linked').map(a=>[a[0],a[1]]),...p('linked_equivalent')];assumes=p('linked').filter(a=>a[2]==='condition_not_shown').map(a=>[a[0],a[1]]);
  pass.member=p('member');pass.member_group=p('member_group');pass.identity_unknown=p('identity_unknown');}
 const me=evaluate(ev,onlyFor(ev,{...I,...pass,link_to:linkTo,assumes_condition:assumes,link_identified:given.map(v=>[v.id,v.measurement!])}),{record:'the values, their links and the teaching'});
 const results=me.all('evidence_force').map(f=>({value:String(f.args[0]),outcome:String(f.args[1]),force:f.args[2]==='unverified'?'not_verified':String(f.args[2]),measurement:String(f.args[3]),derivation:me.why(f)}));
 const byOutcome:Record<string,string[]>={};for(const r of results)(byOutcome[r.outcome]??=[]).push(r.force);
 return {rules:`${R.version}:${R.digest.slice(0,12)}`,knowledge:k.basis,results,byOutcome,
  outcomes:me.all('outcome_assessment').map(f=>({product:String(f.args[0]),outcome:String(f.args[1]),assessment:String(f.args[2]),derivation:me.why(f)})),
  conditionsNotShown:me.all('cond_unshown').map(f=>({value:String(f.args[0]),measurement:String(f.args[1]),condition:String(f.args[2])})),rankingInput:false};
}
/** What declared attributes bear on under the teaching: indirect only, for the outcomes it marks them not sufficient
 * for; nothing otherwise (rule EA1). Attribute names are matched as written, after case and separator normalisation. */
export function attributeEvidence(k:CategoryKnowledge,declarations:readonly {id:string;product:string|null;attribute:string}[],opts:{rules?:RuleSet}={}):Pick<EvidenceUnderKnowledge,'results'|'byOutcome'|'rules'>{
 const R=loadLinkRules(opts.rules);const ev=R.rules.get('evidence')!;
 const F:Record<string,(string|number)[][]>={declares:declarations.map(d=>[d.id,normAttr(d.attribute)]),value_product:declarations.filter(d=>d.product).map(d=>[d.id,d.product!]),
  attribute_indirect_for:k.attributeLimits.map(a=>[a.attribute,a.outcome])};
 const me=evaluate(ev,onlyFor(ev,F),{record:'the declarations and the teaching'});
 const results=me.all('evidence_force').map(f=>({value:String(f.args[0]),outcome:String(f.args[1]),force:String(f.args[2]),measurement:String(f.args[3]),derivation:me.why(f)}));
 const byOutcome:Record<string,string[]>={};for(const r of results)(byOutcome[r.outcome]??=[]).push(r.force);
 return {rules:`${R.version}:${R.digest.slice(0,12)}`,results,byOutcome};
}

/** How a condition's descriptions in two records relate. Same: equal after case and spacing, or equal axis values.
 * Documented different: both name quantities of one kind with no value in common, or different named values of one
 * axis. Otherwise the relation is unknown (different wording is not shown to be a different condition). */
function describeCondition(qk:QuantityKnowledge,c:ConditionConcept,v:ObservedValue&{quantity:TypedQuantity}):string|null{
 if(v.states?.[c.id]!=null)return v.states[c.id];
 if(!c.axes.length)return null;const vals=c.axes.map(a=>v.quantity.conditions.find(x=>x.axis===a)?.value??null);
 return vals.every(x=>x!=null)?vals.join(' ; '):null;
}
const normDesc=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}%.]+/gu,' ').replace(/\s+/g,' ').trim();
function conditionRelation(qk:QuantityKnowledge,a:string,b:string,enumerated:readonly string[]=[]):{same:boolean;distinct:string|null}{
 if(normDesc(a)===normDesc(b))return {same:true,distinct:null};
 // S82: the teaching enumerates distinct states of the condition; two records naming different members of it differ
 const named=(x:string)=>enumerated.filter(e=>namedPhrases(x,[e]).size);const ea=named(a),eb=named(b);
 if(ea.length&&eb.length&&!ea.some(e=>eb.includes(e)))return {same:false,distinct:`different enumerated states (${ea.join('/')} vs ${eb.join('/')})`};
 const q=(s:string)=>{const m=new Map<string,Set<string>>();for(const f of findQuantities(qk,s)){if(f.value==null||f.unit.level)continue;const si=f.value*f.unit.factor+f.unit.offset;
  for(const kd of f.unit.kinds)(m.get(kd)??m.set(kd,new Set()).get(kd)!).add(si.toPrecision(6));}return m;};
 const qa=q(a),qb=q(b);
 for(const [kd,va] of qa){const vb=qb.get(kd);if(vb&&![...va].some(x=>vb.has(x)))return {same:false,distinct:`different ${kd.replace(/_/g,' ')} (${[...va].join('/')} vs ${[...vb].join('/')}, SI)`};}
 // a value's canonical name counts as one of its terms ("top" for top speed, turbo...)
 const termsOf=(v:string,ts:readonly string[])=>[v.replace(/_/g,' '),...ts];
 for(const ax of qk.axes.values())for(const [val,terms] of Object.entries(ax.values??{})){const ia=namedPhrases(a,termsOf(val,terms)).size>0,ib=namedPhrases(b,termsOf(val,terms)).size>0;
  if(ia!==ib){const other=Object.entries(ax.values??{}).some(([v2,t2])=>v2!==val&&namedPhrases(ia?b:a,termsOf(v2,t2)).size>0);if(other)return {same:false,distinct:`different ${ax.id.replace(/_/g,' ')} values`};}}
 return {same:false,distinct:null};
}
export interface ComparisonUnderKnowledge {verdict:'comparable'|'not_comparable'|'unestablished';reason:string;reasons:string[];
 /** S82: a comparable verdict's scope (the quantity knowledge may limit it to one presented test); null otherwise. */
 scope:'general'|'within_one_presented_test'|null;
 /** every non-identity condition the teaching requires for the measurement, and its state across the two records */
 conditions:{condition:string;state:string;detail:string|null}[];
 qk:ComparisonResult;rules:string;knowledge:CategoryKnowledge['basis'];derivation:string[]}
/** Whether two products' results of one taught measurement compare: the quantity-knowledge verdict first, then every
 * non-identity condition the teaching requires (program `comparable` of LINK_RULES_FILE). With no teaching for the
 * measurement, the verdict is the quantity knowledge's. */
export function compareUnderKnowledge(qk:QuantityKnowledge,k:CategoryKnowledge,measurement:string,
 a:ObservedValue&{quantity:TypedQuantity},b:ObservedValue&{quantity:TypedQuantity},opts:{rules?:RuleSet}={}):ComparisonUnderKnowledge{
 const R=loadLinkRules(opts.rules);const prog=R.rules.get('comparable');if(!prog)throw Error('knowledge_link_rules_missing_program: comparable');
 const qa=withAxes(a.quantity,a.axes),qb=withAxes(b.quantity,b.axes);
 const qr=compareQuantities(qk,qa,qb);
 const m=k.view.measurements.find(x=>x.concept.id===measurement);const conds=(m?.conditions??[]).map(c=>conditionConcept(qk,c));
 const F:Record<string,(string|number)[][]>={value:[['a'],['b']],value_condition:[],value_states:[],pair_measurement:[[measurement]],requires_cond:[],identity_cond:[],cond_axis:[],
  qk_verdict:[[qr.verdict,(qr.reasons[0]??'').replace(/\s+/g,'_')]],cond_same:[],cond_distinct:[]};
 for(const [id,q,v] of [['a',qa,a],['b',qb,b]] as const){for(const c of q.conditions)F.value_condition.push([id,c.axis,c.value]);for(const [c,w] of Object.entries(v.states??{}))F.value_states.push([id,c,w]);}
 const detail:Record<string,string|null>={};
 for(const c of conds){F.requires_cond.push([measurement,c.id]);if(c.identity)F.identity_cond.push([c.id]);for(const x of c.axes)F.cond_axis.push([c.id,x]);
  const da=describeCondition(qk,c,{...a,quantity:qa}),db=describeCondition(qk,c,{...b,quantity:qb});
  if(da!=null&&db!=null){const rel=conditionRelation(qk,da,db,c.enumerated);if(rel.same)F.cond_same.push([c.id]);if(rel.distinct){F.cond_distinct.push([c.id,rel.distinct.replace(/\s+/g,'_')]);detail[c.id]=rel.distinct;}}}
 const model=evaluate(prog,onlyFor(prog,F),{record:`the records of the pair a (${a.product??'?'}) and b (${b.product??'?'})`});
 const v=model.all('kverdict');if(!v.length)throw Error('comparable rules reached no verdict');
 const x=String(v[0].args[0]);const verdict=x==='comparable'||x==='comparable_within_source'?'comparable':x==='not_comparable'?'not_comparable':'unestablished';
 const scope:ComparisonUnderKnowledge['scope']=x==='comparable_within_source'?'within_one_presented_test':x==='comparable'?'general':null;
 const conditions=model.all('kcond').map(f=>({condition:String(f.args[0]),state:String(f.args[1]),detail:detail[String(f.args[0])]??null})).sort((p,q)=>p.condition.localeCompare(q.condition));
 return {verdict,scope,reason:String(v[0].args[1]),reasons:v.map(f=>String(f.args[1])),conditions,qk:qr,rules:`${R.version}:${R.digest.slice(0,12)}`,knowledge:k.basis,derivation:v.flatMap(f=>model.why(f))};
}
/** The taught measurement a typed value is a result of, under the whole teaching (link program of v7: type, fixed
 * conditions, and the required conditions the record states). 'ambiguous' and 'none' are answers, not failures. */
export function linkUnderKnowledge(qk:QuantityKnowledge,k:CategoryKnowledge,v:ObservedValue&{quantity:TypedQuantity}):{link:string;status:LinkStatus;derivation:string[]}{
 const r=linkValues(qk,k.view,[asLinkValue(v)!],{descriptors:k.descriptors}).results[0];
 const link=r.status==='ambiguous'?'ambiguous':['no_taught_measurement','not_linked','member_only'].includes(r.status)?'none':r.measurements.length===1?r.measurements[0]:'ambiguous';
 return {link,status:r.status,derivation:r.derivation};
}

// =====================================================================================================================
// S82 (owner review of S81): the minimal links the architecture check called for. Both are shadow only.
// D27: the operational test-lead reader (Phase225/265) records conditions as its own codes, which the reasoning could not
// consult. They are declared, as data, as values of quantity-knowledge condition axes (reader-conditions.v1.json),
// added as a reversible overlay the way acquired axes are (knowledge_translation.withAcquiredAxes); the default pack
// and every other reader are unchanged. What a recorded code then concludes comes from the teaching (which measurement
// fixes the load, which condition names the compartments), not from the code table.
export const READER_CONDITIONS_FILE='reader-conditions.v1.json';
export interface ReaderConditions {schema:string;version:string;statement:string;source:{id:string;title:string;url:string|null;use:string;licence:string};
 axes:{id:string;values:Record<string,string[]>;cues?:string[];labelled?:boolean}[];codes:Record<string,{axis:string;value:string}>;unmapped:Record<string,string>}
let rcDefault:ReaderConditions|null=null;
export function readerConditions():ReaderConditions{
 return rcDefault??=JSON.parse(readFileSync(new URL('../../resources/quantity-knowledge/'+READER_CONDITIONS_FILE,import.meta.url),'utf8')) as ReaderConditions;}
const rcOverlay=new WeakMap<QuantityKnowledge,QuantityKnowledge>();
/** The quantity knowledge with the reader-condition axes added (axes the pack already has are not replaced). */
export function withReaderConditions(qk:QuantityKnowledge,rc:ReaderConditions=readerConditions()):QuantityKnowledge{
 const hit=rc===rcDefault?rcOverlay.get(qk):undefined;if(hit)return hit;
 const pack=JSON.parse(JSON.stringify(qk.pack));pack.version=pack.version+'+'+rc.version;
 if(!pack.sources.some((s:{id:string})=>s.id===rc.source.id))pack.sources.push(rc.source);
 for(const a of rc.axes)if(!pack.conditionAxes.some((x:{id:string})=>x.id===a.id))pack.conditionAxes.push({...a,source:rc.source.id});
 const out=loadQuantityKnowledge(pack,null);if(rc===rcDefault)rcOverlay.set(qk,out);return out;
}
/** The typed conditions a set of reader codes records; codes the file does not map are returned as unmapped. */
export function readerConditionAxes(codes:readonly string[],rc:ReaderConditions=readerConditions()):{axes:[string,string][];unmapped:string[]}{
 const axes:[string,string][]=[];const unmapped:string[]=[];
 for(const c of codes){const m=rc.codes[c];if(m){if(!axes.some(([a,v])=>a===m.axis&&v===m.value))axes.push([m.axis,m.value]);}else unmapped.push(c);}
 return {axes,unmapped};
}

// D28: the conditions a catalog dimension meets, derived from the records of its tests (ra.2 trusts the list a catalog
// declares). S83 (owner review of S82): validity is rebuilt PER OBSERVATION first (each required condition verified by
// its own record, with where the record states it, and the method it was obtained with), then the usable observations
// are grouped by what the comparable program says about each pair (documented differences are recorded as
// incompatibilities). Two answers are kept apart: what the dimension as compiled meets (every observation verifies the
// condition, no documented difference), and what the largest comparable group of complete observations of two or more
// products would meet if the others were set aside (incomplete observations never discard complete ones).
// A declared condition the records do not show is reported, never accepted. Shadow: no ranking reads it.
export interface ObservationValidity {test:string;method:string|null;
 conditions:{condition:string;state:'verified'|'not_verifiable';from:string|null}[];
 /** every condition the teaching requires for the measurement is verified by this observation's own record */
 usable:boolean}
export interface DerivedConditionsMet {measurement:string;required:string[];observations:ObservationValidity[];
 /** usable observations in groups whose members compare with each other (largest first) */
 groups:string[][];
 /** documented differences between usable observations (not comparable as reported) */
 incompatible:{a:string;b:string;conditions:string[]}[];
 /** the dimension AS COMPILED (all its observations): conditions every observation verifies and no documented
  * difference contradicts. What a catalog of these tests meets. */
 derived:string[];
 /** S83 (owner: incomplete tests must not discard complete ones): the largest group of complete observations of two or
  * more distinct products that compare (a condition of a comparison is never shown by one product's test alone), the
  * conditions it verifies, and the observations it sets aside. What a catalog restricted to them would meet; null when
  * no such group exists. */
 subset:{covered:string[];setAside:string[];derived:string[]}|null;
 declared:string[]|null;
 /** declared but not derived */
 unsupported:string[];
 /** derived but not declared */
 notDeclared:string[];rules:string;rankingInput:false}
export function conditionsMetFromRecords(qk:QuantityKnowledge,k:CategoryKnowledge,measurement:string,tests:readonly ObservedValue[],declared?:readonly string[]|null):DerivedConditionsMet{
 const m=k.view.measurements.find(x=>x.concept.id===measurement);const required=(m?.conditions??[]).map(c=>c.id).sort();
 const ev=evidenceUnderKnowledge(qk,k,tests.map(t=>({...t,measurement})));
 const concepts=new Map((m?.conditions??[]).map(c=>[c.id,conditionConcept(qk,c)]));
 const fromOf=(t:ObservedValue,c:string)=>{if(t.states?.[c]!=null)return 'stated in the record';const cc=concepts.get(c);if(!cc)return null;
  const q=t.quantity?withAxes(t.quantity,t.axes):null;const fs=cc.axes.map(a=>q?.conditions.find(x=>x.axis===a)?.from??(t.axes?.some(([x])=>x===a)?'record axis':null));
  return fs.every(Boolean)?[...new Set(fs)].join(', '):null;};
 const observations:ObservationValidity[]=tests.map(t=>{const ns=new Set(ev.conditionsNotShown.filter(c=>c.value===t.id&&c.measurement===measurement).map(c=>c.condition));
  const conditions=required.map(c=>ns.has(c)?{condition:c,state:'not_verifiable' as const,from:null}:{condition:c,state:'verified' as const,from:fromOf(t,c)});
  const q=t.quantity;const method=q?.protocol??q?.conditions.find(x=>x.axis==='method')?.value??null;
  return {test:t.id,method,conditions,usable:!!m&&conditions.every(x=>x.state==='verified')};});
 const usable=tests.filter(t=>observations.find(o=>o.test===t.id)!.usable);
 const groups:ObservedValue[][]=[];const incompatible:DerivedConditionsMet['incompatible']=[];
 for(const t of usable){let placed=false;
  for(const g of groups){const a=g[0];if(!a.quantity||!t.quantity){continue;}
   const r=compareUnderKnowledge(qk,k,measurement,a as ObservedValue&{quantity:TypedQuantity},t as ObservedValue&{quantity:TypedQuantity});
   if(r.verdict==='comparable'){g.push(t);placed=true;break;}
   if(r.verdict==='not_comparable')incompatible.push({a:a.id,b:t.id,conditions:r.conditions.filter(c=>c.state==='differs').map(c=>c.condition)});}
  if(!placed)groups.push([t]);}
 groups.sort((x,y)=>y.length-x.length||x[0].id.localeCompare(y[0].id));
 // S83 battery regression (S2-K-af-1, S2-K-ap-1): one product's complete test cannot show a condition of comparing it.
 const basis=groups.find(g=>new Set(g.map(t=>t.product??t.id)).size>=2)??null;
 const verifiedBy=(ids:readonly string[],c:string)=>ids.length>0&&ids.every(id=>observations.find(o=>o.test===id)!.conditions.find(x=>x.condition===c)!.state==='verified');
 const differs=new Set(incompatible.flatMap(x=>x.conditions));
 const derived=required.filter(c=>!differs.has(c)&&verifiedBy(tests.map(t=>t.id),c));
 const covered=basis?basis.map(t=>t.id):[];
 const subset=basis?{covered,setAside:tests.map(t=>t.id).filter(x=>!covered.includes(x)),derived:required.filter(c=>verifiedBy(covered,c))}:null;
 const dec=declared?[...new Set(declared)].sort():null;
 return {measurement,required,observations,groups:groups.map(g=>g.map(t=>t.id)),incompatible,derived,subset,declared:dec,
  unsupported:(dec??[]).filter(c=>!derived.includes(c)),notDeclared:dec?derived.filter(c=>!dec.includes(c)):[],rules:ev.rules,rankingInput:false};
}
/** D28 on the operational records: the store's test measurements (test_measurements265) behind a catalog dimension, read
 * with their reader codes (reader-conditions overlay): codes of the value's own sentence are 'conditions', codes of the
 * document's protocol are 'context' (applicable to the value only as the reader scoped them). */
export function conditionsMetFromStoreRecords(store:KnowledgeStore246,category:string,measurement:string,measurementIds:readonly string[],declared?:readonly string[]|null,opts:{qk?:QuantityKnowledge}={}):DerivedConditionsMet{
 const qk=withReaderConditions(opts.qk??defaultQk());const k=categoryKnowledge(store,category,{qk});
 const want=new Set(measurementIds);const rows=store.testMeasurements265().filter(r=>want.has(r.measurementId));
 const tests:ObservedValue[]=rows.map(r=>{
  const own=readerConditionAxes(r.conditionCodes??[]).axes,doc=readerConditionAxes(r.protocolCodes??[]).axes.filter(([a])=>!own.some(([x])=>x===a));
  // S86: the shared typing of stored observations (was an ad hoc "kwh" -> "kWh" re-parse here)
  const q=typeStoredQuantity(qk,{value:r.value,unit:r.unit,dimension:r.dimension});
  const quantity=q?{...q,conditions:[...q.conditions,...own.map(([axis,value])=>({axis,value,raw:value,from:'conditions' as const})),...doc.map(([axis,value])=>({axis,value,raw:value,from:'context' as const}))]}:null;
  return {id:r.measurementId,product:r.productId,quantity,measurement,source:r.source?.url??null};});
 return conditionsMetFromRecords(qk,k,measurement,tests,declared);
}
