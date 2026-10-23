/**
 * S96 (owner instruction 2026-10-20, verbatim in .claude/skills/pee-guided-learning/references/
 * owner-instruction-s96-entity-representation-2026-10-20.md): a typed scientific entity layer.
 *
 * What it does: reads the definition tables of the owner's teaching packages (the explicit, owner-authored scientific
 * knowledge that S95 lacked) into typed entity records of different classes (a measurable property, a feature or component,
 * a method, an instrument, a term), with class-specific attributes, explicit statuses (stated / typed / unknown) and
 * provenance (file, line). I-ADOPT (property, object of interest, constraints), SOSA/SSN (procedure, observed property),
 * PROV-O (where each attribute comes from). An attribute that a row does not state stays unknown: the object of interest
 * is never inferred from a name.
 *
 * How it is reused: property records whose quantity kind the quantity knowledge types become CANDIDATE property
 * definitions in the existing definition pack (one representation, no parallel store), so every existing reader
 * (attribution, interpretation, comparison) can use them. Candidates never carry decision authority.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {normText,hasPhrase,parseUnit,findQuantities,loadQuantityKnowledge,type QuantityKnowledge} from './quantity_knowledge.js';
import {parseTeachingDocument,typeSpan} from './knowledge_translation.js';
import {loadPropertyDefinitions,type DefinitionPack,type PropertyDefinitions} from './property_definitions.js';

/** property: a measurable quantity (kind typed); attribute: a stated attribute whose quantity no two cells corroborate
 * (perceptual qualities, assessments, specifications: the row alone does not say which); feature: a function or component;
 * method and instrument: how a result is obtained. A feature is never a performance quality. */
export type EntityClass='property'|'attribute'|'feature'|'method'|'instrument';
export interface Attr<T> {value:T|null;status:'stated'|'typed'|'unknown'}
export interface EntityRecord {id:string;class:EntityClass;name:string;terms:string[];
 definition:Attr<string>;
 /** for a property: quantity kinds, metrics and units typed by the quantity knowledge from the row's own cells */
 quantity:{kinds:string[];metrics:string[];units:string[];status:'typed'|'ambiguous'|'unknown'};
 /** I-ADOPT object of interest: stated only when the row names it in a dedicated column; never inferred */
 object:Attr<string>;
 /** conditions and reporting requirements the row states; `axis` when the quantity knowledge types the term */
 conditions:{term:string;axis:string|null}[];
 method:Attr<string>;
 /** what the row says this entity does NOT establish or must not be confused with (owner "traps") */
 notEstablished:{text:string;kinds:string[];metrics:string[]}[];
 provenance:{source:string;line:number;header:string};
 /** teaching_candidate: read from an owner teaching table, unreviewed; qk_metric: an explicit metric of the quantity knowledge */
 state:'teaching_candidate'|'qk_metric';
 /** stated relations to other entities (I-ADOPT / QK): never inferred from shared words or units */
 relations:{type:'not_equivalent_to'|'derived_from'|'defined_by';target:string}[];
 /** the existing property definition the record's name already denotes (reuse, no duplicate) */
 existingProperty:string|null}
export interface AcquisitionCues {version:string;functionWords?:string[];subjectHeaders:Record<'property'|'feature'|'method'|'instrument',string[]>;roleHeaders:Record<'definition'|'unitsAndConditions'|'method'|'notEstablished',string[]>}
let cached:AcquisitionCues|null=null;
export function loadAcquisitionCues():AcquisitionCues{return cached??=JSON.parse(readFileSync(new URL('../../resources/scientific-entities/entity-acquisition.v1.json',import.meta.url),'utf8'));}
const headerHas=(h:string,words:readonly string[])=>{const t=normText(h);return words.some(w=>hasPhrase(t,normText(w)));};
const slug=(s:string)=>normText(s).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,40)||'x';
/** The names a row's subject cell gives: the phrase itself, parenthetical aliases, and slash alternatives on a shared head
 * ("HDR white/luminance" -> "hdr white", "hdr luminance"). */
export function subjectTerms(subject:string):string[]{
 const out=new Set<string>();const base=subject.replace(/\([^)]*\)/g,' ').replace(/\s+/g,' ').trim();
 // a parenthesis with a comma is an argument list ("C(T,RH,mode)"), not an alias
 for(const m of subject.matchAll(/\(([^)]{2,40})\)/g))if(!/[\d,]/.test(m[1]))out.add(normText(m[1]));
 // comma-separated alternatives ("PM2.5, PM10") are separate names
 for(const alt of base.split(/\s*,\s*/)){const sl=/^(.*?)([A-Za-z][\w-]*)\/([A-Za-z][\w-]*)(.*)$/.exec(alt);
  if(sl&&!/\s\/|\/\s/.test(alt)){const pre=sl[1],post=sl[4];out.add(normText(`${pre}${sl[2]}${post}`));out.add(normText(`${pre}${sl[3]}${post}`));}else out.add(normText(alt));}
 // a name needs a word of at least three letters
 return [...out].filter(t=>t.length>=3&&t.split(' ').length<=6&&/[a-z]{3}/.test(t));}
export function acquireEntities(qk:QuantityKnowledge,docs:readonly {source:string;md:string}[],existing?:PropertyDefinitions):EntityRecord[]{
 const C=loadAcquisitionCues();const out:EntityRecord[]=[];
 for(const d of docs){const blocks=parseTeachingDocument(d.md);
  for(const b of blocks){if(b.kind!=='table_row'||!b.cells||b.cells.length<2)continue;
   const sh=b.cells[0].header;const cls0=(['instrument','method','feature','property'] as const).find(k=>headerHas(sh,C.subjectHeaders[k]));if(!cls0)continue;
   const subject=b.cells[0].text;if(!subject||subject.length>90)continue;
   const cell=(role:keyof AcquisitionCues['roleHeaders'])=>b.cells!.slice(1).filter(c=>headerHas(c.header,C.roleHeaders[role])&&!(role!=='notEstablished'&&headerHas(c.header,C.roleHeaders.notEstablished))).map(c=>c.text).filter(Boolean);
   const defs=cell('definition'),units=cell('unitsAndConditions'),meth=cell('method'),nots=cell('notEstablished');
   // quantity typing from the subject and the unit/state cells (explicit), then from the definition
   // the property's unit: the first item of the unit/state column ("cd/m² (nit), APL, window %": cd/m²); words of the other
   // items are conditions and never type the property (S96 it0: "instrument noise floor" typed black output as sound)
   const firstItem=(units[0]??'').split(/[,;]/)[0].replace(/\([^)]*\)/g,' ').trim();
   const unitKinds=[...new Set([firstItem,...firstItem.split(/\s+/)].flatMap(x=>parseUnit(qk,x)?.kinds??[]))];
   const tSubject=typeSpan(qk,subject);
   const tExplicit={metrics:tSubject.metrics,units:[...typeSpan(qk,firstItem).units,...tSubject.units]};const tDef=typeSpan(qk,defs.join(' . '));
   // the kind comes from the subject and the unit/state cells (explicit); from the definition only when it types exactly one
   // kind. Several kinds stay ambiguous: the row is kept, but it does not become a definition.
   // S96 it1 (corroboration): a kind is admitted only when two independent cells of the row agree on it: the unit/state
   // column with the subject or the definition, or the subject with the definition. One cell alone (a unit list of an
   // evaluation dimension, a word of a definition) leaves the quantity ambiguous or unknown, never invented.
   const defKinds=[...new Set(tDef.kinds)],subjKinds=[...new Set(tSubject.kinds)];
   const agree=(a:string[],b:string[])=>a.filter(k=>b.includes(k));
   const kinds=[...new Set([...agree(unitKinds,[...subjKinds,...defKinds]),...agree(subjKinds,defKinds)])];
   const metrics=[...new Set([...tExplicit.metrics,...tDef.metrics])],unitsT=[...new Set(tExplicit.units)];
   const anyKinds=new Set([...unitKinds,...subjKinds,...defKinds]);
   const ambiguous=kinds.length>2||(kinds.length===0&&anyKinds.size>0);const typed=kinds.length>0&&kinds.length<=2;
   // a subject that is itself a unit expression names no property: its terms are not surface terms
   const ts=typeSpan(qk,subject);const unitSubject=ts.units.length>0&&ts.untyped.filter(w=>w.length>2).length<=1;
   const cls:EntityClass=cls0==='property'?(typed?'property':'attribute'):cls0;
   const conditions=units.flatMap(u=>u.split(/[,;]| and /)).map(x=>x.trim()).filter(x=>x&&!typeSpan(qk,x).units.length).map(x=>{const t=typeSpan(qk,x);return {term:normText(x),axis:t.axes[0]?.axis??null};}).filter(x=>x.term.length>=2);
   const terms=unitSubject?[]:subjectTerms(subject);
   const existingProperty=existing?[...existing.properties.values()].find(p=>p.surface.some(([s])=>terms.includes(normText(s))))?.id??null:null;
   out.push({id:`ent_${cls}_${slug(subject)}_${createHash('sha256').update(d.source+':'+b.line).digest('hex').slice(0,6)}`,class:cls,name:subject,terms,
    definition:defs.length?{value:defs.join(' | '),status:'stated'}:{value:null,status:'unknown'},
    quantity:{kinds:typed?kinds:[],metrics,units:unitsT,status:typed?'typed':ambiguous?'ambiguous':'unknown'},
    object:{value:null,status:'unknown'},conditions,method:meth.length?{value:meth.join(' | '),status:'stated'}:{value:null,status:'unknown'},
    notEstablished:nots.map(t=>{const s=typeSpan(qk,t);return {text:t,kinds:s.kinds,metrics:s.metrics};}),
    provenance:{source:d.source,line:b.line,header:b.cells.map(c=>c.header).join(' | ')},state:'teaching_candidate',relations:[],existingProperty});}}
 return out;}
/** The explicit metrics of the quantity knowledge as typed property entities: their kind, terms, required conditions,
 * non-equivalences, defining methods and source are all stated in the quantity knowledge. A metric that an existing
 * definition already names (metric or related metric) is that property (reuse, no duplicate). */
export function metricEntities(qk:QuantityKnowledge,existing?:PropertyDefinitions):EntityRecord[]{
 return [...qk.metrics.values()].map(m=>{const prop=existing?[...existing.properties.values()].find(p=>p.quantity?.metric===m.id||(p.quantity?.relatedMetrics??[]).includes(m.id))?.id??null:null;
  // S98: the object of interest is stated when a known object of the definitions names this metric (pd.6), else unknown
  const owner=existing?.pack.knownObjects?.objects.find(k=>(k.metrics??[]).includes(m.id))?.id??null;
  return {id:'ent_qk_'+m.id,class:'property' as const,name:m.label,terms:m.terms.map(normText),definition:m.note?{value:m.note,status:'stated' as const}:{value:null,status:'unknown' as const},
   quantity:{kinds:[m.kind],metrics:[m.id],units:[],status:'typed' as const},object:owner?{value:owner,status:'stated' as const}:{value:null,status:'unknown' as const},
   conditions:m.requires.map(a=>({term:a,axis:qk.axes.has(a)?a:null})),
   method:m.definedBy?.length?{value:m.definedBy.map(x=>x.method).join(' | '),status:'stated' as const}:{value:null,status:'unknown' as const},notEstablished:[],
   provenance:{source:'quantity_knowledge:'+m.source,line:0,header:'metric'},state:'qk_metric' as const,
   relations:[...(m.notEquivalentTo??[]).map(t=>({type:'not_equivalent_to' as const,target:t})),...(m.derivedFrom??[]).map(t=>({type:'derived_from' as const,target:t})),...(m.definedBy??[]).map(x=>({type:'defined_by' as const,target:x.method}))],
   existingProperty:prop};});}
export interface OverlayOptions {/** typed rows of the teaching tables */rows?:boolean;/** explicit QK metrics without a definition */metrics?:boolean;
 /** S97 C1 (counterfactual, shadow): carry the conditions a record requires (QK `requires`, typed row conditions) into the
  * candidate as defining dimensions; a QK axis no definition dimension names gets a derived dimension (a view of the axis) */
 transferConditions?:boolean;
 /** S97 C3 (counterfactual, shadow): a STATED owner relation from a known object (pd knownObjects id) to QK metrics; the
  * metric-backed candidates receive that object's nouns as their object of interest. The statement itself is knowledge to be
  * reviewed: S97 measures what it would change */
 objectOwners?:Readonly<Record<string,readonly string[]>>;
 /** S98 (gated, off): pass the object of interest a record STATES (pd.6 known-object metrics) into the candidate */
 statedObjects?:boolean;
 /** when given, only these entity ids become candidates (E2: validated by earlier documents) */only?:ReadonlySet<string>;sourceId?:string}
/** Typed property entities that no existing definition covers become CANDIDATE property definitions in the existing pack: one
 * representation, read by the existing attribution and interpretation. A metric-backed candidate names its metric, so the
 * reader's competing-metric rule applies to it. The object of interest stays unstated; nothing is promoted. */
export function withAcquiredDefinitions(qk:QuantityKnowledge,pack:DefinitionPack,entities:readonly EntityRecord[],opts:OverlayOptions|string={}):{defs:PropertyDefinitions;added:string[];reused:string[];byEntity:Map<string,string>}{
 const o:OverlayOptions=typeof opts==='string'?{sourceId:opts,rows:true,metrics:true}:{rows:true,metrics:true,...opts};const sourceId=o.sourceId??'s96_teaching';
 const p=JSON.parse(JSON.stringify(pack)) as DefinitionPack;const added:string[]=[],reused:string[]=[];const byEntity=new Map<string,string>();
 if(!p.sources.some(s=>s.id===sourceId))p.sources.push({id:sourceId,kind:'teaching',title:'S96: typed entities of the teaching tables and the quantity knowledge (candidate, unreviewed)'});
 const existingTerms=new Set(p.properties.flatMap(x=>x.surface.map(([t])=>normText(t))));
 for(const e of entities){if(e.class!=='property')continue;if(e.existingProperty){reused.push(e.id);byEntity.set(e.id,e.existingProperty);continue;}
  const isMetric=e.state==='qk_metric';if(isMetric?!o.metrics:!o.rows)continue;if(o.only&&!o.only.has(e.id))continue;
  if(e.quantity.status!=='typed')continue;const terms=e.terms.filter(t=>!existingTerms.has(t)&&/[a-z]{3}/.test(t)&&!/^[a-z]{1,3}$/.test(t));if(!terms.length)continue;
  const id=isMetric?'qkm_'+e.quantity.metrics[0]:'acq_'+slug(e.name)+'_'+e.id.slice(-6);if(p.properties.some(x=>x.id===id))continue;
  const metric=isMetric?e.quantity.metrics[0]:undefined;const related=isMetric?[]:e.quantity.metrics.filter(m=>qk.metrics.has(m));
  const conds:[string,'defining'][]=[];
  if(o.transferConditions)for(const ax of [...new Set(e.conditions.map(c=>c.axis).filter((a):a is string=>!!a&&qk.axes.has(a)))]){
   let dim=p.conditionDimensions.find(d=>d.qkAxis===ax);
   if(!dim){const a=qk.axes.get(ax)! as unknown as {id:string;values?:Record<string,string[]>;cues?:string[];freeText?:string[];valueKind?:string;operatingCondition?:boolean};
    dim={id:'qkaxis_'+ax,qkAxis:ax,structure:a.operatingCondition?'operating_setting':'comparison_or_basis',label:ax.replace(/_/g,' '),values:a.values??{},cues:[...(a.cues??[]),...(a.freeText??[])],
     ...(a.valueKind&&qk.kinds.has(a.valueKind)?{valueKinds:[a.valueKind]}:{}),state:'candidate',sources:[sourceId]};p.conditionDimensions.push(dim);}
   if(!conds.some(c=>c[0]===dim!.id))conds.push([dim.id,'defining']);}
  // S98: a stated object reaches the candidate only with statedObjects (gated: the S89 attribution rules use object nouns in
  // four places with different strengths; stating objects without a single object-evidence model loses correct readings)
  const owner=(o.statedObjects===true&&e.object.status==='stated'?e.object.value:null)??(metric?Object.entries(o.objectOwners??{}).find(([,ms])=>ms.includes(metric))?.[0]:undefined);
  const nouns=owner?(p.knownObjects?.objects.find(k=>k.id===owner)?.nouns??[]):[];
  p.properties.push({id,label:e.name,form:'quantity',quantity:{kinds:e.quantity.kinds,...(metric?{metric}:{}),...(related.length?{relatedMetrics:related}:{})},object:owner??'unstated',...(nouns.length?{objectNouns:[...nouns]}:{}),basis:null,
   surface:terms.map(t=>[t,'candidate']),conditions:conds,state:'candidate',sources:[sourceId]});
  for(const t of terms)existingTerms.add(t);added.push(id);byEntity.set(e.id,id);}
 p.version=pack.version+'+acquired:'+added.length;
 return {defs:loadPropertyDefinitions(qk,p),added,reused,byEntity};}
/** A name with at least one word of four or more letters in lower or capitalised case (not a symbol or an acronym). */
export const isWordName=(name:string)=>name.replace(/\([^)]*\)/g,' ').split(/[^\p{L}\p{N}-]+/u).some(w=>/^[A-Z]?[a-z]{3,}(?:-[a-z]+)*$/.test(w));
const onlyFunctionWords=(t:string)=>{const fw=new Set(loadAcquisitionCues().functionWords??[]);return t.split(/\s+/).every(w=>fw.has(w)||w.length<3);};
/** Attribute entities with a stated definition become CANDIDATE aspects of the quantity knowledge, read by the existing
 * qualitative reader (it needs an evaluative word in the same sentence). Only names not already an aspect term. */
export function withAcquiredAspects(qk:QuantityKnowledge,entities:readonly EntityRecord[],opts:{only?:ReadonlySet<string>;sourceId?:string}={}):{qk:QuantityKnowledge;added:string[]}{
 const sourceId=opts.sourceId??'s96_teaching';const pack=JSON.parse(JSON.stringify(qk.pack));const added:string[]=[];
 if(!pack.sources.some((s:{id:string})=>s.id===sourceId))pack.sources.push({id:sourceId,title:'S96: attribute rows of the owner teaching tables (candidate, unreviewed)',use:'candidate qualitative aspects',licence:'owner teaching; terms only'});
 const known=new Set<string>((pack.aspects??[]).flatMap((a:{terms:string[]})=>a.terms.map(normText)));
 for(const e of entities){if(e.class!=='attribute'||e.definition.status!=='stated')continue;if(opts.only&&!opts.only.has(e.id))continue;
  // S96 it2: an aspect is named by words, not by a symbol (TDB, IEF, mAh, CADRsmoke) or by function words ("each")
  if(!isWordName(e.name))continue;
  const terms=e.terms.filter(t=>!known.has(t)&&/[a-z]{3}/.test(t)&&!onlyFunctionWords(t));if(!terms.length)continue;const id='acq_'+slug(e.name)+'_'+e.id.slice(-6);
  if((pack.aspects??[]).some((a:{id:string})=>a.id===id))continue;(pack.aspects??=[]).push({id,terms,source:sourceId});for(const t of terms)known.add(t);added.push(id);}
 pack.version=qk.pack.version+'+aspects:'+added.length;
 return {qk:loadQuantityKnowledge(pack),added};}
/** Document validation (E2): a candidate is supported by a document when, in one of its text blocks, a quantity whose unit
 * the quantity knowledge types to the candidate's kind is preceded (within its own clause, 80 characters) by one of the
 * candidate's terms. Returns the supporting document ids per entity. Different documents from the entity's own source only. */
export function documentSupport(qk:QuantityKnowledge,entities:readonly EntityRecord[],docs:readonly {id:string;blocks:readonly string[]}[]):Map<string,string[]>{
 const out=new Map<string,string[]>();const cands=entities.filter(e=>e.class==='property'&&e.quantity.status==='typed'&&e.terms.length);
 for(const d of docs)for(const b of d.blocks){const qs=findQuantities(qk,b);if(!qs.length)continue;
  for(const q of qs){const kinds=new Set(q.unit?.kinds??[]);if(!kinds.size)continue;const before=normText(b.slice(Math.max(0,q.start-80),q.start).split(/[.;!?]\s/).at(-1)??'');
   for(const e of cands)if(e.quantity.kinds.some(k=>kinds.has(k))&&e.terms.some(t=>hasPhrase(before,t))){const l=out.get(e.id)??[];if(!l.includes(d.id))l.push(d.id);out.set(e.id,l);}}}
 return out;}
/** Census of the typed layer: per class, how many records state or type each attribute (unknown stays unknown). */
export function entityCensus(entities:readonly EntityRecord[]){const by:Record<string,Record<string,number>>={};
 for(const e of entities){const c=by[e.class+(e.state==='qk_metric'?':qk_metric':'')]??={records:0,definitionStated:0,quantityTyped:0,objectStated:0,withConditions:0,conditionsTypedToAxis:0,methodStated:0,withNotEstablished:0,reusesExistingProperty:0};
  c.records++;if(e.definition.status==='stated')c.definitionStated++;if(e.quantity.status==='typed')c.quantityTyped++;if(e.object.status==='stated')c.objectStated++;
  if(e.conditions.length)c.withConditions++;if(e.conditions.some(x=>x.axis))c.conditionsTypedToAxis++;if(e.method.status==='stated')c.methodStated++;if(e.notEstablished.length)c.withNotEstablished++;if(e.existingProperty)c.reusesExistingProperty++;}
 return by;}
