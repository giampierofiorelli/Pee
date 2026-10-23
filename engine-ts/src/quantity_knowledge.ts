/**
 * Typed quantity knowledge (GK, 2026-10-18): one data pack and one interface through which every PEE stage reads
 * quantities. The knowledge is data (resources/quantity-knowledge/*.json), not code: a new unit, quantity kind, metric or
 * condition axis is added by editing the pack, and every consumer sees it.
 *
 * What it represents:
 *  - quantity kinds: what is measured, with an SI dimension vector; kinds that share a dimension (power and energy per
 *    year; luminance and illuminance; frequency and rotational speed) are told apart by unit hints, unit form and words;
 *  - units: atoms with dimension, factor and offset, composed by a small grammar (m³/h, kWh/100 cycles, sq ft); level
 *    units (dB, dBA, dB(A) re 1 pW) carry frequency weighting and reference, never a conversion factor;
 *  - metrics: quantities defined by a method (CADR under AHAM AC-1) or by a convention (EU label noise), each with the
 *    condition axes that make two results comparable and the quantities it is NOT equivalent to;
 *  - condition axes: measurement distance, challenge pollutant, fan setting, programme, air changes per hour.
 *
 * What it never is: product evidence, a permission, or a ranking. Every result says what was established, from which
 * words or unit, and what stays unresolved. The pack's digest is part of any reading identity that uses it.
 */
import {negationAt,scopeVocabulary} from './language_scope.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileRuleSet,evaluate,explain,type RuleSet,type CompiledProgram,type Model,type Fact} from './knowledge_rules.js';

export const QUANTITY_KNOWLEDGE_SCHEMA='pee.quantity-knowledge.v1';
type Dim=Partial<Record<string,number>>;
interface SourceRef {id:string;title:string;url:string|null;use:string;licence:string}
export interface KindDef {id:string;dim:Dim;level?:boolean;unitOnly?:boolean;affine?:boolean;determinedBy?:string;form?:{requiresClass?:string;excludesClass?:string};
 terms:string[];plain?:string;expressions?:string[];
 /** WD (qk.2.3): a narrower kind of the same dimension that words refine to (relative humidity is a ratio): the unit
  * establishes the general kind; the narrower one needs its own words. */
 specialises?:string;discriminators?:string[];requires?:string[];comparatives?:{max?:string[];min?:string[]};reference?:string|null;note?:string;qudt?:string;source:string}
export interface AxisDef {id:string;valueKind?:string;
 /** WD (qk.2.3): a composite condition read from several quantities together (inlet air state = temperature and relative humidity). */
 valueKinds?:string[];
 /** WD (qk.2.3): an operating condition a judgement can be made under (a speed, a programme, a floor). */
 operatingCondition?:boolean;
 /** R3: a condition read from the value's own labels and conditions, like an operating condition, though it is not one
  * (an axis PEE acquired from a teaching document, such as a filter state). No default-pack axis sets it. */
 labelled?:boolean;cues?:string[];values?:Record<string,string[]>;freeText?:string[];source:string}
export interface MetricDef {id:string;label:string;kind:string;terms:string[];
 /** WD (qk.2.3): the basis the metric is conventionally reported per (a dehumidifier capacity per day), when a value prints none. */
 conventionalBasis?:{per:string;source:string;note?:string};unitless?:boolean;definedBy?:{method:string;source:string}[];requires:string[];notEquivalentTo?:string[];derivedFrom?:string[];note?:string;source:string}
export interface AtomDef {id:string;forms:string[];dim:Dim;factor:number;offset?:number;kindHint?:string;class?:string;conventional?:boolean;standalone?:boolean;cs?:boolean;denominatorOnly?:boolean;note?:string;source:string}
export interface LevelUnitDef {id:string;forms:string[];weighting:string;reference:string|null;kinds:string[];source:string}
/** A test method or rating scheme: what it measures and the conditions it fixes (v2). */
export interface MethodDef {id:string;label:string;terms:string[];measures:string[];fixedConditions:Record<string,string>;supersededBy?:string;note?:string;source:string}
/** A physical or definitional relation between quantities, evaluable in the stated units (v2). */
export interface RelationInput {name:string;metric?:string;kind?:string;axis?:string;unit:string;assumption?:boolean;default?:number;note?:string;
 /** among several candidate values, the one with these conditions (AHAM sizes rooms by the smoke CADR) */
 prefer?:Record<string,string>}
export interface RelationDef {id:string;
 /** What kind of truth the relation is: a definition, an idealised physical law, or a sizing convention (assumptions, not a measurement). */
 nature:'definition'|'physical_law_idealised'|'sizing_convention';caveat:string;statement:string;output:{metric?:string;kind?:string;unit:string};inputs:RelationInput[];expression:string;tolerance:number;use?:string[];source:string}
/** An ordinal class scale (energy classes, filter classes), ordered best first (v2). */
export interface ScaleDef {id:string;label:string;values:string[];best:string;terms:string[];distinctive?:string[];regimes?:{productGroups:string[];from?:string;until?:string}[];notComparableWith?:string[];thresholds?:Record<string,string>;metric?:string;source:string}
/** KN K9: words that justify a kind, the type of justification, and (for statements a document makes once: its test
 * protocol, the scheme it declares under) the evidence classes of the values such a statement covers. */
export type KindJustification='unit'|'explicit'|'standard'|'documented_method'|'contextual'|'insufficient';
export interface KindEvidenceDef {kind:string;justification:'explicit'|'standard'|'documented_method'|'contextual';terms:string[];covers?:string[];note?:string;source:string}
export interface QuantityPack {schema:string;version:string;statement:string;dimensionBasis:string[];sources:SourceRef[];kinds:KindDef[];conditionAxes:AxisDef[];
 metrics:MetricDef[];units:AtomDef[];levelUnits:LevelUnitDef[];methods?:MethodDef[];relations?:RelationDef[];scales?:ScaleDef[];kindEvidence?:KindEvidenceDef[];aspects?:AspectDef[];phenomena?:PhenomenonDef[];facets?:FacetDef[];useContexts?:{id:string;terms:string[]}[];
 language:{en:{min:string[];minAfter:string[];max:string[];maxAfter:string[];perWords:string[];exponentWords:Record<string,number>;increaseComparatives:string[];decreaseComparatives:string[];
  labelUnitPrepositions?:string[];basisWords?:Record<string,string>;axisLetters?:string[];
  /** S103: property words that may stand between a quantity and its bound word ("40 cm wide or less") */ boundPropertyWords?:string[];
  /** R3-P: clause boundaries, negation scope, polarity and contrast (read by src/language_scope.ts) */
  scope?:{negators:string[];notNegating:string[];requirementWords:string[];contrastMarkers:string[];indifferencePredicates:string[];scopeEnders:string[];adjunctPrepositions?:string[];adjunctNote?:string;maxScopeWords:number};
  evaluation?:{positive:string[];negative:string[];negators:string[];hedges:string[];reportedBy:string[]};
  qualitative?:{observationVerbs:string[];testCues:string[];experienceCues:string[];inferenceCues:string[];claimCues:string[];causeMarkers:string[];comparativeCues:string[];testMaterials:string[];environmentCues:string[]}}}}
/** QE (qk.2.3): an observable descriptor (a whine, residue left, uneven browning), on an aspect and a facet. */
export interface PhenomenonDef {id:string;terms:string[];facet:string;polarity?:'positive'|'negative';aspect?:string;source:string}
/** QE: a property of observations that recurs across categories, with the words a buyer uses for it; a hypothesis. */
export interface FacetDef {id:string;needTerms:string[];statement:string;status:string;source:string}
/** WD (qk.2.3): an aspect of a product a reviewer judges (noise, vibration, pickup): PEE's reading vocabulary, never a
 * product fact. Optional polar terms carry a judgement by themselves ("noisy"); `kinds` links the aspect to the quantities
 * that measure it. */
export interface AspectDef {id:string;terms:string[];positive?:string[];negative?:string[];kinds?:string[];source:string}

export interface QuantityKnowledge {pack:QuantityPack;digest:string;identity:string;
 /** KR: compiled declarative rules (programs `kind` and `compare`) and their version. */
 rules:Map<string,CompiledProgram>;ruleSetVersion:string;kinds:Map<string,KindDef>;metrics:Map<string,MetricDef>;axes:Map<string,AxisDef>;methods:Map<string,MethodDef>;
 atomForms:{form:string;atom:AtomDef;lower:string}[];levelForms:{form:string;unit:LevelUnitDef;lower:string}[]}

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
export const normText=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[‐-―]/g,'-').replace(/\s+/g,' ').trim();
const esc=(w:string)=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/** Audit S77 (A1-12): a hyphen and a space are the same separator in a phrase ("sound-power level", "hard-floor"). */
const phrasePat=(p:string)=>esc(p).replace(/[ -]+/g,'[\\s-]+');
const phraseRe=new Map<string,RegExp>();
/** Whole-phrase match on normalised text (no partial words: "pm1" does not match "pm10"). */
export function hasPhrase(text:string,phrase:string):boolean{const p=normText(phrase);let re=phraseRe.get(p);
 if(!re){re=new RegExp('(?<![\\p{L}\\p{N}])'+phrasePat(p)+'(?![\\p{L}\\p{N}])','u');phraseRe.set(p,re);}return re.test(normText(text));}

/** Which of several phrases a text names, longest first: a phrase inside a longer matched phrase does not count
 * ("pressure" inside "sound pressure"). Returns the matched phrases. */
export function namedPhrases(text:string,phrases:readonly string[]):Set<string>{
 let t=' '+normText(text)+' ';const out=new Set<string>();
 for(const p of [...new Set(phrases.map(normText))].sort((a,b)=>b.length-a.length)){const re=new RegExp('(?<![\\p{L}\\p{N}])'+phrasePat(p)+'(?![\\p{L}\\p{N}])','gu');
  if(re.test(t)){out.add(p);t=t.replace(re,m=>' '.repeat(m.length));}}
 return out;
}
/** The default pack. v1 stays loadable (pass its JSON) to reproduce readings identified by qk.1. */
/** qk.2.4 (audit S77): generic words no longer settle a specific metric. qk.2.3 kept in v2 for reproduction.
 * qk.2.5 (S103): the bound words of the retired Phase253 local reader ("min", "max", "or bigger", "or smaller", "or under",
 * a property word before an after-bound) are pack data; the one bound reader serves requests and documents. */
import {DEFAULT_QUANTITY_PACK} from './quantity_pack_file.js';
/** A6 (first increment, 2026-10-21): the constant lives in quantity_pack_file.ts so that language_scope can read the
 * default pack's scope words without importing this module (R3-P import cycle removed); re-exported unchanged. */
export {DEFAULT_QUANTITY_PACK};
/** Load and validate a pack (default: the committed v2 pack). Fails closed on any inconsistency. */
/** The default declarative rules (KR): scope, kind, justification and comparability decisions. */
/** kr.4 (S82): two differently named conditions with no documented relation are unestablished, not not_comparable; kr.3 (R1, 2026-10-18): a difference of conditions only when documented or definitional; rules.v2/v3 kept for reproduction. */
export const DEFAULT_KNOWLEDGE_RULES='rules.v4.json';
export function loadQuantityKnowledge(pack?:unknown,rules?:unknown):QuantityKnowledge{
 const raw=pack??JSON.parse(readFileSync(new URL('../../resources/quantity-knowledge/'+DEFAULT_QUANTITY_PACK,import.meta.url),'utf8'));
 const ruleSet=(rules??JSON.parse(readFileSync(new URL('../../resources/quantity-knowledge/'+DEFAULT_KNOWLEDGE_RULES,import.meta.url),'utf8'))) as RuleSet;
 let programs:Map<string,CompiledProgram>;try{programs=compileRuleSet(ruleSet);}catch(e){throw Error('quantity_knowledge_invalid: rules: '+(e as Error).message);}
 for(const id of ['kind','compare','scope'])if(!programs.has(id))throw Error('quantity_knowledge_invalid: rules: program '+id+' missing');
 const p=raw as QuantityPack;const fail=(m:string):never=>{throw Error('quantity_knowledge_invalid: '+m);};
 if(!p||p.schema!==QUANTITY_KNOWLEDGE_SCHEMA)fail('schema');
 const src=new Set(p.sources.map(s=>s.id));const basis=new Set(p.dimensionBasis);
 const uniq=(xs:{id:string}[],what:string)=>{const s=new Set<string>();for(const x of xs){if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(x.id))fail(`${what} id ${x.id}`);if(s.has(x.id))fail(`duplicate ${what} ${x.id}`);s.add(x.id);}return s;};
 const kinds=uniq(p.kinds,'kind');const axes=uniq(p.conditionAxes,'axis');uniq(p.metrics,'metric');uniq([...p.units,...p.levelUnits],'unit');
 const dimOk=(d:Dim)=>Object.entries(d).every(([k,v])=>basis.has(k)&&Number.isInteger(v));
 for(const k of p.kinds){if(!src.has(k.source))fail('source of kind '+k.id);if(!dimOk(k.dim))fail('dim of kind '+k.id);for(const a of k.requires??[])if(!axes.has(a))fail(`axis ${a} of kind ${k.id}`);}
 for(const m of p.metrics){if(!kinds.has(m.kind))fail('kind of metric '+m.id);if(!src.has(m.source))fail('source of metric '+m.id);for(const a of m.requires)if(!axes.has(a))fail(`axis ${a} of metric ${m.id}`);
  for(const n of [...(m.notEquivalentTo??[]),...(m.derivedFrom??[])])if(!p.metrics.some(x=>x.id===n))fail(`metric ${n} of ${m.id}`);for(const d of m.definedBy??[])if(!src.has(d.source))fail('source of method in '+m.id);}
 for(const a of p.conditionAxes){if(!src.has(a.source))fail('source of axis '+a.id);if(a.valueKind&&!kinds.has(a.valueKind))fail('value kind of axis '+a.id);for(const k of a.valueKinds??[])if(!kinds.has(k))fail('value kinds of axis '+a.id);}
 for(const k of p.kinds)if(k.specialises&&(!kinds.has(k.specialises)||!sameDim(k.dim as Record<string,number>,p.kinds.find(x=>x.id===k.specialises)!.dim)))fail('specialisation of kind '+k.id);
 uniq(p.aspects??[],'aspect');uniq(p.phenomena??[],'phenomenon');uniq(p.facets??[],'facet');
 for(const ph of p.phenomena??[]){if(ph.aspect&&!(p.aspects??[]).some(a=>a.id===ph.aspect))fail('aspect of phenomenon '+ph.id);if(!(p.facets??[]).some(f=>f.id===ph.facet)&&p.facets)if(!['surface_texture','surface_colour','internal_state','temporal_artefact','mechanical_disturbance','spatial_uniformity','consistency_across_runs','tonal_character','transient_event','residue','failure_event'].includes(ph.facet))fail('facet of phenomenon '+ph.id);}for(const a of p.aspects??[]){if(!src.has(a.source)||(!a.terms.length&&a.id!=='other'))fail('aspect '+a.id);for(const k of a.kinds??[])if(!kinds.has(k))fail(`kind ${k} of aspect ${a.id}`);}
 for(const u of p.units){if(!src.has(u.source))fail('source of unit '+u.id);if(!dimOk(u.dim)||!(u.factor>0))fail('unit '+u.id);if(u.kindHint&&!kinds.has(u.kindHint))fail('kind hint of '+u.id);}
 for(const u of p.levelUnits){if(!src.has(u.source))fail('source of unit '+u.id);for(const k of u.kinds)if(!kinds.has(k)||!p.kinds.find(x=>x.id===k)!.level)fail(`level kind ${k} of ${u.id}`);}
 // A surface form names one unit only (case-sensitive forms are distinct from their case-folded spellings).
 const seen=new Map<string,string>();
 for(const u of [...p.units,...p.levelUnits]){for(const f of u.forms){const key=(u as AtomDef).cs?'cs:'+f:'ci:'+f.toLowerCase();const prev=seen.get(key);if(prev&&prev!==u.id)fail(`form "${f}" of ${u.id} and ${prev}`);seen.set(key,u.id);}}
 // v2 sections: methods, relations, scales
 const metricIds=new Set(p.metrics.map(m=>m.id));
 uniq(p.methods??[],'method');uniq(p.relations??[],'relation');uniq(p.scales??[],'scale');
 for(const m of p.methods??[]){if(!src.has(m.source))fail('source of method '+m.id);for(const x of m.measures)if(!metricIds.has(x))fail(`metric ${x} of method ${m.id}`);
  for(const a of Object.keys(m.fixedConditions))if(!axes.has(a))fail(`axis ${a} of method ${m.id}`);if(m.supersededBy&&!(p.methods??[]).some(x=>x.id===m.supersededBy))fail('superseding method of '+m.id);}
 for(const r of p.relations??[]){if(!src.has(r.source))fail('source of relation '+r.id);if(!['definition','physical_law_idealised','sizing_convention'].includes(r.nature)||!r.caveat)fail('nature and caveat of relation '+r.id);if(r.output.metric&&!metricIds.has(r.output.metric))fail('output of '+r.id);if(r.output.kind&&!kinds.has(r.output.kind))fail('output kind of '+r.id);
  for(const i of r.inputs){if(i.metric&&!metricIds.has(i.metric))fail(`input ${i.name} of ${r.id}`);if(i.kind&&!kinds.has(i.kind))fail(`input kind ${i.name} of ${r.id}`);if(i.axis&&!axes.has(i.axis))fail(`input axis ${i.name} of ${r.id}`);
   if(i.assumption&&typeof i.default!=='number')fail(`assumption ${i.name} of ${r.id} needs a default`);}
  try{compileExpression(r.expression,r.inputs.map(i=>i.name));}catch(e){fail(`expression of ${r.id}: ${(e as Error).message}`);}}
 for(const e of p.kindEvidence??[]){if(!kinds.has(e.kind))fail('kind of evidence '+e.kind);if(!src.has(e.source))fail('source of kind evidence '+e.kind);
  if(!['explicit','standard','documented_method','contextual'].includes(e.justification)||!e.terms.length)fail('kind evidence of '+e.kind);
  if((e.justification==='documented_method'||e.justification==='standard')&&!e.covers?.length)fail(`a document-wide ${e.justification} for ${e.kind} must say which values it covers`);}
 for(const sc of p.scales??[]){if(!src.has(sc.source))fail('source of scale '+sc.id);if(!sc.values.includes(sc.best))fail('best of '+sc.id);if(sc.metric&&!metricIds.has(sc.metric))fail('metric of scale '+sc.id);
  for(const n of sc.notComparableWith??[])if(!(p.scales??[]).some(x=>x.id===n))fail(`scale ${n} of ${sc.id}`);}
 const digest=sha(JSON.stringify(p)+'\n'+JSON.stringify(ruleSet));
 const atomForms=p.units.flatMap(atom=>atom.forms.map(form=>({form,atom,lower:form.toLowerCase()}))).sort((a,b)=>b.form.length-a.form.length);
 const levelForms=p.levelUnits.flatMap(unit=>unit.forms.map(form=>({form,unit,lower:form.toLowerCase()}))).sort((a,b)=>b.form.length-a.form.length);
 return {pack:p,digest,rules:programs,ruleSetVersion:ruleSet.version,identity:`${p.version}+${ruleSet.version}:${digest.slice(0,16)}`,kinds:new Map(p.kinds.map(k=>[k.id,k])),metrics:new Map(p.metrics.map(m=>[m.id,m])),
  axes:new Map(p.conditionAxes.map(a=>[a.id,a])),methods:new Map((p.methods??[]).map(m=>[m.id,m])),atomForms,levelForms};
}

// ---------------------------------------------------------------------------------------------------------------------
// Units: parse a unit expression into dimension, factor and properties.
export interface ParsedUnit {surface:string;expression:string;level:null|{unit:string;weighting:string;reference:string|null;kinds:string[]};
 dim:Record<string,number>;factor:number;offset:number;atoms:{id:string;exp:number}[];classes:string[];conventional:boolean;kindHint:string|null;
 /** Quantity kinds this unit can express (one: established by the unit; several: words must decide). */
 kinds:string[]}
const isLetter=(c:string|undefined)=>!!c&&/\p{L}/u.test(c);
function atomAt(qk:QuantityKnowledge,s:string,i:number):{atom:AtomDef;form:string;len:number}|null{
 const low=s.toLowerCase();
 for(const f of qk.atomForms){const L=f.form.length;const ok=f.atom.cs?s.startsWith(f.form,i):low.startsWith(f.lower,i);if(!ok)continue;
  // A unit spelled with letters must end at a word boundary ("min" is not the start of "minimum"); exponent digits may follow.
  if(isLetter(f.form.at(-1))&&isLetter(s[i+L]))continue;
  if(isLetter(f.form[0])&&isLetter(s[i-1]))continue;
  return {atom:f.atom,form:f.form,len:L};}
 return null;
}
const sameDim=(a:Record<string,number>,b:Dim)=>{const ks=new Set([...Object.keys(a),...Object.keys(b)]);for(const k of ks)if((a[k]??0)!==(b[k]??0))return false;return true;};
function kindsFor(qk:QuantityKnowledge,dim:Record<string,number>,classes:string[],hint:string|null,expression:string):string[]{
 // a unit-only kind (frequency, luminance) is expressed only by its own units: a hint on the unit or a listed expression
 const out=qk.pack.kinds.filter(k=>!k.level&&sameDim(dim,k.dim)&&(!k.form?.requiresClass||classes.includes(k.form.requiresClass))&&(!k.form?.excludesClass||!classes.includes(k.form.excludesClass))&&(!k.unitOnly||k.id===hint||(k.expressions??[]).includes(expression))).map(k=>k.id);
 return hint&&out.includes(hint)?[hint]:out;
}
/** Parse one unit expression ("m³/h", "cu ft/min", "sq. ft.", "kWh/100 cycles", "dB(A) re 1 pW"). Null: not a unit the pack knows. */
export function parseUnit(qk:QuantityKnowledge,surface:string):ParsedUnit|null{
 const s0=surface.replace(/\s+/g,' ').trim();if(!s0||s0.length>48)return null;
 const lv=qk.levelForms.find(f=>f.lower===s0.toLowerCase());
 if(lv)return {surface:s0,expression:lv.unit.id,level:{unit:lv.unit.id,weighting:lv.unit.weighting,reference:lv.unit.reference,kinds:[...lv.unit.kinds]},dim:{},factor:1,offset:0,atoms:[],classes:[],conventional:false,kindHint:null,kinds:[...lv.unit.kinds]};
 const lang=qk.pack.language.en;const s=s0;let i=0;let denom=false;const terms:{atom:AtomDef;exp:number;den:boolean}[]=[];let multiplier=1;
 const skip=()=>{while(s[i]===' ')i++;};
 while(i<s.length){skip();
  if(denom){const m=/^(\d+)\s/.exec(s.slice(i));if(m&&terms.length&&terms.at(-1)!.den===false){multiplier*=Number(m[1]);i+=m[0].length;}}
  let a=atomAt(qk,s,i);let pre=1;
  if(!a){const w=Object.keys(lang.exponentWords).sort((x,y)=>y.length-x.length).find(w=>s.slice(i,i+w.length+1).toLowerCase()===w+' ');
   if(w){pre=lang.exponentWords[w];i+=w.length+1;a=atomAt(qk,s,i);}}
  if(!a)return null;i+=a.len;
  let exp=pre;const e=/^(?:\^?([23])(?!\d)|([²³]))/.exec(s.slice(i));if(e){exp=e[1]?Number(e[1]):e[2]==='²'?2:3;i+=e[0].length;}
  if(a.atom.denominatorOnly&&!denom)return null;
  terms.push({atom:a.atom,exp,den:denom});skip();if(i>=s.length)break;
  if(s[i]==='/'){if(denom)return null;denom=true;i++;continue;}
  const per=lang.perWords.find(w=>s.slice(i,i+w.length+1).toLowerCase()===w+' ');if(per){if(denom)return null;denom=true;i+=per.length+1;continue;}
  if(s[i]==='·'||s[i]==='*'){i++;continue;}
  return null;}
 if(!terms.length)return null;
 const dim:Record<string,number>={};let factor=1/multiplier;
 for(const t of terms){const sign=t.den?-1:1;for(const [k,v] of Object.entries(t.atom.dim))dim[k]=(dim[k]??0)+sign*t.exp*(v??0);factor*=Math.pow(t.atom.factor,sign*t.exp);}
 for(const k of Object.keys(dim))if(dim[k]===0)delete dim[k];
 // A ratio of like units ("inches / cm", "pounds / kg") is not a unit: in a label it lists alternatives. It is read only
 // when the knowledge names the expression (none does today).
 const firstDen0=terms.findIndex(t=>t.den);
 if(firstDen0>0&&!Object.keys(dim).length&&terms.every(t=>Object.keys(t.atom.dim).length>0))return null;
 // An offset scale (°C, °F) is affine only alone; in a compound (°C/min) it is a difference and the offset does not apply.
 const offset=terms.length===1&&terms[0].exp===1&&!terms[0].den?terms[0].atom.offset??0:0;
 const classes=[...new Set(terms.filter(t=>t.den).map(t=>t.atom.class).filter((c):c is string=>!!c))];
 const hint=terms.length===1&&terms[0].exp===1?terms[0].atom.kindHint??null:null;
 const firstDen=terms.findIndex(t=>t.den);
 const expression=terms.map((t,k)=>(t.den?'/':(k>0?'·':''))+(k===firstDen&&multiplier!==1?multiplier+' ':'')+t.atom.id+(t.exp!==1?'^'+t.exp:'')).join('');
 return {surface:s0,expression,level:null,dim,factor,offset,atoms:terms.map(t=>({id:t.atom.id,exp:t.den?-t.exp:t.exp})),classes,
  conventional:terms.some(t=>t.atom.conventional),kindHint:hint,kinds:kindsFor(qk,dim,classes,hint,expression)};
}

// ---------------------------------------------------------------------------------------------------------------------
// Scanning text for quantities.
export interface FoundQuantity {start:number;end:number;surface:string;value:number|null;low?:number;high?:number;unit:ParsedUnit;unitSurface:string;
 /** v2: the axis letter of a dimension list item (W, H, D, L) */
 axis?:string|null}
// WD (tuned on the KV pages, 2026-10-18): a comma followed by one or two digits is a decimal comma ("81,5 cm" is 81.5 cm,
// never 5 cm); a comma followed by three digits groups thousands ("1,600W").
const NUM_RE=/(?<![\p{L}\p{N}.,])[-−]?(?:\d{1,3}(?:,\d{3})+(?![\d])|\d+,\d{1,2}(?![\d,])|\d+)(?:\.\d+)?/gu;
const toNum=(s:string)=>Number((/^[-−]?\d+,\d{1,2}$/.test(s)?s.replace(',','.'):s.replace(/,/g,'')).replace('−','-'));
/** Every number in the text followed by a unit the pack knows (longest unit first). Ranges "40.2 – 66.5 dBA" are one quantity. */
export function findQuantities(qk:QuantityKnowledge,text:string):FoundQuantity[]{
 const out:FoundQuantity[]=[];let lastEnd=-1;
 // Dimension lists "19.87D x 27.16W x 12.38H inches", "47 x 31.6 x 38.4cm": every number takes the final unit, and an axis
 // letter (language.axisLetters) names its axis; the letters are never units here.
 const axes=(qk.pack.language.en.axisLetters??[]).map(esc).join('');
 if(axes){const N='(?:\\d+(?:\\.\\d+)?)';const item=`${N}\\s?[${axes}]?`;
  const re=new RegExp(`(?<![\\p{L}\\p{N}.])(${item}(?:\\s?[x×*]\\s?${item}){1,3})\\s?([\\p{L}"'][^\\s,;()]*(?:\\s[a-z]+)?)`,'gu');
  const lists:{start:number;end:number;items:FoundQuantity[]}[]=[];
  for(const m of text.matchAll(re)){let unitSurf=m[2];let u=parseUnit(qk,unitSurf);if(!u){unitSurf=m[2].split(/\s/)[0];u=parseUnit(qk,unitSurf)??(unitSurf.endsWith('.')?parseUnit(qk,unitSurf.slice(0,-1)):null);}
   if(!u||!u.kinds.includes('length'))continue;const items:FoundQuantity[]=[];
   for(const it of m[1].matchAll(new RegExp(`(${N})\\s?([${axes}])?`,'gu'))){const st=m.index!+it.index!;
    items.push({start:st,end:st+it[0].length,surface:it[0].trim(),value:Number(it[1]),unit:u,unitSurface:unitSurf,axis:it[2]??null});}
   lists.push({start:m.index!,end:m.index!+m[1].length+m[0].slice(m[1].length).indexOf(unitSurf)+unitSurf.length,items});}
  if(lists.length){const rest=findQuantitiesPlain(qk,text).filter(f=>!lists.some(l=>f.start<l.end&&f.end>l.start));return [...lists.flatMap(l=>l.items),...rest].sort((a,b)=>a.start-b.start);}}
 return findQuantitiesPlain(qk,text);
}
/** S85 (intervention A): a reporting basis written after the quantity ("12 litres a day", "0.5 kWh daily") is part of its
 * unit. The words are the pack's own basisWords (until now read only in labels); the composed unit must parse and have a
 * kind, otherwise the quantity is left as it was. A unit that already has a denominator is never given a second one. */
function withBasis(qk:QuantityKnowledge,text:string,f:FoundQuantity):FoundQuantity{
 if(f.unit.atoms.some(a=>a.exp<0))return f;
 const words=Object.entries(qk.pack.language.en.basisWords??{}).sort((a,b)=>b[0].length-a[0].length);
 const after=text.slice(f.end);
 for(const [w,per] of words){const m=new RegExp('^\\s+'+esc(w)+'(?![\\p{L}\\p{N}])','iu').exec(after);if(!m)continue;
  const atom=BASIS_ATOM[per];if(!atom)return f;const u=parseUnit(qk,f.unitSurface+'/'+atom);if(!u||!u.kinds.length)return f;
  const end=f.end+m[0].length;return {...f,end,surface:text.slice(f.start,end),unit:{...u,surface:text.slice(f.start+f.surface.length-f.unitSurface.length,end).trim()},unitSurface:text.slice(f.start+f.surface.length-f.unitSurface.length,end).trim()};}
 return f;
}
function findQuantitiesPlain(qk:QuantityKnowledge,text:string):FoundQuantity[]{
 const out:FoundQuantity[]=[];let lastEnd=-1;
 for(const m of text.matchAll(NUM_RE)){const s=m.index!;if(s<lastEnd)continue;const j=s+m[0].length;let low:number|undefined,high:number|undefined;
  // S100 (rule audit F1): a compound time "29:30 mins", "1:20 h", "1:05:30 hours" is ONE duration; a number right after
  // "digit:" is part of one and never a quantity of its own; a bare "29:30" (a clock time?) is not read
  if(/\d:$/.test(text.slice(Math.max(0,s-2),s)))continue;
  const tm=/^(\d{1,3}):([0-5]\d)(?::([0-5]\d))?\s?([A-Za-z.]+)/.exec(text.slice(s));
  if(tm){const unitSurf=tm[4].replace(/\.$/,'');const u=parseUnit(qk,unitSurf);
   if(u&&u.kinds.includes('duration')){const a=+tm[1],b=+tm[2],c=tm[3]!==undefined?+tm[3]:null;const hours=/^h/i.test(unitSurf),secs=/^s/i.test(unitSurf);
    const value=secs?null:hours?a+b/60+(c??0)/3600:c===null?a+b/60:a*60+b+c/60;
    if(value!==null){const end=s+tm[1].length+1+tm[2].length+(tm[3]!==undefined?3:0)+tm[0].slice(tm[1].length+1+tm[2].length+(tm[3]!==undefined?3:0)).indexOf(tm[4])+tm[4].replace(/\.$/,'').length;
     out.push({start:s,end,surface:text.slice(s,end),value:Math.round(value*10000)/10000,unit:u,unitSurface:unitSurf});lastEnd=end;continue;}}
   continue;}
  // S85: "between 3 and 5 litres" is a range like "3-5 litres" (only after "between": a bare "and" joins two quantities)
  const between=/\bbetween\s+$/i.test(text.slice(Math.max(0,s-12),s));
  const rg=(between?/^\s?(?:-|–|—|to|and)\s?([-−]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/:/^\s?(?:-|–|—|to)\s?([-−]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/).exec(text.slice(j));
  let rangeEnd=j;if(rg){low=toNum(m[0]);high=toNum(rg[1]);rangeEnd=j+rg[0].length;}
  // a unit spelled in letters may follow a hyphen ("a 2-inch hair", "a 30-minute run"); a hyphen before a digit is a range
  const tryAt=(k:number)=>{const after=text.slice(k);const lead=/^(?:\s|-(?=\p{L}{2}))?/u.exec(after)![0].length;const win=after.slice(lead,lead+48);
   // candidate ends: every boundary in the window, longest first
   // S86b (capability audit: "5 litres+" was read by the pre-S85 request reader, lost in S85): a '+' after the unit ends it
   const ends=[...new Set([...win.matchAll(/(?=[\s,;:)\]|+])/g)].map(x=>x.index!).concat([win.length]))].filter(e=>e>0).sort((a,b)=>b-a);
   for(const e of ends){let cand=win.slice(0,e);let pu=parseUnit(qk,cand);if(!pu&&cand.endsWith('.')){cand=cand.slice(0,-1);pu=parseUnit(qk,cand);}if(!pu)continue;
    const next=win.slice(cand.length);
    // short symbols that are also English words ("in", "h", "g") need punctuation or the end after them, not another word
    const single=pu.atoms.length===1&&!pu.level?qk.pack.units.find(u=>u.id===pu!.atoms[0].id):null;
    // (S85: a symbol with no letter, the inch mark in '10" steamer', is never an English word, so it may be followed by one)
    if(single&&single.standalone===false&&cand.length<=2&&/\p{L}/u.test(cand)&&/^\s+\p{L}/u.test(next))continue;
    // "14.6 W x 9 H": a capital axis letter between numbers joined by x/× is a dimension axis, not a unit
    if(single&&cand.length===1&&(qk.pack.language.en.axisLetters??[]).includes(cand)&&(/^\s*[x×*]\s*\d/i.test(next)||/[x×*]\s*$/i.test(text.slice(Math.max(0,s-4),s))))continue;
    if(/^\p{L}/u.test(next))continue;
    return {unit:pu,start:k+lead,len:cand.length};}
   return null;};
  const r=rg?tryAt(rangeEnd):null;
  if(rg&&r){const f=withBasis(qk,text,{start:s,end:r.start+r.len,surface:text.slice(s,r.start+r.len),value:null,low,high,unit:r.unit,unitSurface:text.slice(r.start,r.start+r.len)});out.push(f);lastEnd=f.end;continue;}
  const u=tryAt(j);if(!u)continue;
  // S86b (capability audit: lost in S85): "between 3 litres and 5 litres", the unit written after both numbers, is one range
  if(between){const after=text.slice(u.start+u.len);const r2=/^\s?(?:-|–|—|to|and)\s?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/.exec(after);
   if(r2){const k=u.start+u.len+r2[0].length;const u2=tryAt(k);
    if(u2&&u2.start-k<=1&&text.slice(u2.start,u2.start+u2.len).toLowerCase()===text.slice(u.start,u.start+u.len).toLowerCase()){
     const f=withBasis(qk,text,{start:s,end:u2.start+u2.len,surface:text.slice(s,u2.start+u2.len),value:null,low:toNum(m[0]),high:toNum(r2[1]),unit:u2.unit,unitSurface:text.slice(u2.start,u2.start+u2.len)});
     out.push(f);lastEnd=f.end;continue;}}}
  const f=withBasis(qk,text,{start:s,end:u.start+u.len,surface:text.slice(s,u.start+u.len),value:toNum(m[0]),unit:u.unit,unitSurface:text.slice(u.start,u.start+u.len)});out.push(f);lastEnd=f.end;}
 return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Typing a quantity in its context.
export interface QuantityContext {labels?:readonly string[];conditions?:readonly string[];context?:readonly string[];
 /** KR: the document's text blocks that may state how values were obtained (each with a reference), the order of
  * blocks within sections, the product names the document's tables use, and which blocks are notes of the value's table. */
 document?:DocumentStatements;tableNotes?:readonly string[];
 /** The product the value is attributed to. */
 product?:string|null;
 /** KR scope: the context that frames every value of the table (caption, heading). When given, only it and the value's
  * own labels decide the kind locally; nearby paragraphs are document statements, applied through the scope rules. */
 frame?:readonly string[];
 /** KR2: the texts near the table offered as context, each with a reference and its place. When given, the scope rules
  * (program `scope`) decide which apply to this value; they replace `context` and `frame`. */
 contextStatements?:readonly {ref:string;text:string;place:'frame'|'nearby'}[];
 /** The value's evidence class: says which document-wide statements cover it (a reviewer's instrument covers its readings, not a maker's spec). */
 evidenceClass?:string;
 /** Identity of the source document. */
 source?:string;
 /** KN K10: the test the publisher presents the value under (source, table and every non-product label). Only values of
  * one presented test share the conditions the source leaves unstated; a common source or protocol does not. */
 cohort?:string}
export interface DocumentStatements {blocks:readonly {ref:string;text:string}[];next:readonly (readonly [string,string])[];products:readonly string[]}
export interface TypedCondition {axis:string;value:string;raw:string;from:'labels'|'conditions'|'context'|'method'|'record';
 /** WD P1: for a condition read from the value's record (another value of the same table row or sentence), that value's surface. */
 by?:string}
export interface TypedQuantity {surface:string;value:number|null;low?:number;high?:number;unit:ParsedUnit;
 si:{value:number|null;low?:number;high?:number}|null;
 kind:{id:string|null;candidates:string[];basis:string[];
  /** KN K9: how the kind is justified, where, by which words. */
  justification:{type:KindJustification;from:'unit'|'labels'|'context'|'protocol'|null;evidence:string[];ref:string|null;
   /** KR: the rules the conclusion rests on, and the readable derivation. */
   rules:string[];derivation:string[]}};metric:{id:string|null;candidates:string[];basis:string[]};
 weighting:string|null;reference:string|null;conditions:TypedCondition[];missingConditions:string[];unresolved:string[];knowledge:string;
 /** The source document and the protocol statement that covers the value, when known. */
 source:string|null;protocol:string|null;cohort:string|null;
 /** The product the value is attributed to, when the reader established it. */
 product:string|null;
 /** KR2: which nearby texts were read for this value and which were excluded by the scope rules, with the derivation. */
 contextScope:{applied:string[];excluded:string[];derivation:string[]}|null}
const toSi=(u:ParsedUnit,v:number|null|undefined)=>v==null?null:u.level?v:v*u.factor+u.offset;
function distanceIn(qk:QuantityKnowledge,texts:readonly string[]):boolean{const ax=qk.axes.get('measurement_distance');if(!ax)return false;
 return texts.some(t=>findQuantities(qk,t).some(f=>f.unit.kinds.includes('length')&&(ax.cues??[]).some(c=>hasPhrase(t.slice(Math.max(0,f.start-24),f.end+12),c))));}
/** KR: per-document facts, computed once per document object: which blocks carry typed kind evidence, name a measurand
 * or a product, and the block order. */
const docFactCache=new WeakMap<DocumentStatements,{evidence:string[][];measurand:string[][];products:string[][];next:string[][];texts:Map<string,string>}>();
function documentFacts(qk:QuantityKnowledge,d:DocumentStatements){
 const c=docFactCache.get(d);if(c)return c;
 const evidence:string[][]=[],measurand:string[][]=[],products:string[][]=[];
 for(const b of d.blocks){for(const e of qk.pack.kindEvidence??[])for(const t of e.terms)if(hasPhrase(b.text,t))evidence.push([b.ref,e.kind,e.justification,t]);
  for(const k of qk.pack.kinds)if((k.terms??[]).some(t=>hasPhrase(b.text,t)))measurand.push([b.ref,k.id]);
  for(const p of d.products)if(p&&hasPhrase(b.text,p))products.push([b.ref,p]);}
 const out={evidence,measurand,products,next:d.next.map(x=>[x[0],x[1]]),texts:new Map(d.blocks.map(b=>[b.ref,b.text]))};docFactCache.set(d,out);return out;
}
const foundCache=new WeakMap<QuantityKnowledge,Map<string,FoundQuantity[]>>();
const foundIn=(qk:QuantityKnowledge,text:string)=>{let m=foundCache.get(qk);if(!m){m=new Map();foundCache.set(qk,m);}let f=m.get(text);if(!f){f=findQuantities(qk,text);m.set(text,f);}return f;};
/** Facts for program `kind`, and its conclusions: a kind settled by the document, a document conflict, and the
 * strongest justification with the rules and derivation behind it. */
function kindRules(qk:QuantityKnowledge,q:{surface?:string;value:number|null;low?:number;high?:number;unit:ParsedUnit},ctx:QuantityContext,
 v:{candidates:readonly string[];metricNamed:{kind:string;from:string;metric:string}|null;refKind:string|null;own:readonly string[];context:readonly string[]}){
 const o='o';const F:Record<string,(string|number)[][]>={value:[[o]],candidate_kind:v.candidates.map(k=>[o,k])};
 if(v.candidates.length===1)F.local_kind=[[o,v.candidates[0]]];
 if(q.unit.kinds.length===1)F.unit_only_kind=[[o,q.unit.kinds[0]]];
 if(v.refKind)F.unit_reference_kind=[[o,v.refKind]];
 if(v.metricNamed)F.metric_named=[[o,v.metricNamed.kind,v.metricNamed.from,v.metricNamed.metric]];
 F.local_evidence=[];for(const e of qk.pack.kindEvidence??[]){if(!v.candidates.includes(e.kind))continue;
  for(const [texts,from] of [[v.own,'labels'],[v.context,'context']] as const)for(const t of e.terms)if(texts.some(x=>hasPhrase(x,t)))F.local_evidence.push([o,e.kind,e.justification,from,t]);}
 if(ctx.evidenceClass)F.evidence_class=[[o,ctx.evidenceClass]];
 if(ctx.product)F.value_product=[[o,ctx.product]];
 F.covers_class=(qk.pack.kindEvidence??[]).flatMap(e=>(e.covers??[]).map(c=>[e.kind,e.justification,c]));
 if(ctx.document){const d=documentFacts(qk,ctx.document);F.block_evidence=d.evidence;F.block_measurand=d.measurand;F.block_names_product=d.products;F.next_block=d.next;
  const nums=[q.value,q.low,q.high].filter((x):x is number=>typeof x==='number');
  F.block_restates=[...d.texts].filter(([,t])=>foundIn(qk,t).some(f=>!!f.unit.level===!!q.unit.level&&nums.some(n=>n===f.value||n===f.low||n===f.high))).map(([ref])=>[ref,o]);
  F.block_in_table=(ctx.tableNotes??[]).map(ref=>[ref,o]);}
 const m=evaluate(qk.rules.get('kind')!,F,{record:`the record of value "${q.surface??''}"${ctx.cohort?` (${ctx.cohort})`:ctx.source?` (${ctx.source})`:''}`});
 const byDoc=m.match('kind_by_document',[o,null]);
 const conflict=v.candidates.length>1&&m.has('document_conflict',[o])?[...new Set([...m.match('supported',[o,null]),...m.match('names_kind_elsewhere',[o,null])].map(f=>f.args[1]))]:null;
 const best=m.match('best_justification',[o,null,null,null]);
 let justification:TypedQuantity['kind']['justification'];
 if(!best.length)justification={type:'insufficient',from:null,evidence:[],ref:null,rules:m.match('kind_unjustified',[o]).flatMap(f=>m.rulesOf(f)),derivation:m.match('kind_unjustified',[o]).flatMap(f=>m.why(f))};
 else{const t=best[0].args[1] as KindJustification,from=best[0].args[2] as TypedQuantity['kind']['justification']['from'];const xs=[...new Set(best.map(f=>f.args[3]))];
  let evidence=xs,ref:string|null=null;
  if(from==='protocol'){const kinds=m.match('kind_of',[o,null]).map(f=>f.args[1]);
   evidence=[...new Set(xs.flatMap(sx=>kinds.flatMap(k=>m.match('statement_says',[sx,k,t,null]).map(f=>f.args[3]))))];
   ref=xs.map(sx=>sx+(m.has('statement_restates',[sx,o])?' (restates the value)':'')).join(',');}
  else if(from==='unit')evidence=[q.unit.surface];
  justification={type:t,from,evidence,ref,rules:[...new Set(best.flatMap(f=>m.rulesOf(f)))],derivation:best.flatMap(f=>m.why(f))};}
 return {byDocument:byDoc.length===1?byDoc[0].args[1]:null,conflict,justification};
}
/** KR2: which context texts apply to a value (program `scope`): the frame always; a nearby paragraph unless it names
 * products and not this value's. Text reading (which products a paragraph names) stays here; the decision is the rules'. */
function contextScope(qk:QuantityKnowledge,ctx:QuantityContext){
 const st=ctx.contextStatements!;const products=ctx.document?.products??[];
 const F:Record<string,(string|number)[][]>={value:[['o']],context_statement:st.map(x=>[x.ref,x.place]),
  block_names_product:st.flatMap(x=>products.filter(p=>p&&hasPhrase(x.text,p)).map(p=>[x.ref,p]))};
 if(ctx.product)F.value_product=[['o',ctx.product]];
 const m=evaluate(qk.rules.get('scope')!,F,{record:`the context of a value of ${ctx.cohort??ctx.source??'a table'}`});
 const ok=new Set(m.match('context_applies',[null,'o']).map(f=>f.args[0]));
 const applied=st.filter(x=>ok.has(x.ref));const excluded=st.filter(x=>!ok.has(x.ref)).map(x=>x.ref);
 return {texts:applied.map(x=>x.text),frame:applied.filter(x=>x.place==='frame').map(x=>x.text),applied:applied.map(x=>x.ref),excluded,
  derivation:[...m.match('context_other_product',[null,'o']).flatMap(f=>m.why(f))]};
}
/** Type one quantity: its kind (from the unit, then from discriminating words), the metric its labels name, the
 * conditions the knowledge requires and which of them the context states. Nothing is guessed: ambiguity stays explicit. */
export function typeQuantity(qk:QuantityKnowledge,q:{surface:string;value:number|null;low?:number;high?:number;unit:ParsedUnit},ctx:QuantityContext={}):TypedQuantity{
 const scope=ctx.contextStatements?contextScope(qk,ctx):null;
 if(scope)ctx={...ctx,context:scope.texts,frame:scope.frame};
 const labels=[...(ctx.labels??[])],conds=[...(ctx.conditions??[])],context=[...(ctx.context??[])];
 const own=[...labels,...conds];const all=[...own,...context];
 // words that decide the kind locally: the value's own labels and the table's frame (all the context without a frame)
 const kindCtx=ctx.frame?[...ctx.frame]:context;const kindAll=[...own,...kindCtx];
 const hit=(texts:readonly string[],terms:readonly string[]=[])=>terms.filter(t=>texts.some(x=>hasPhrase(x,t)));
 const unresolved:string[]=[];const kindBasis:string[]=[];
 let candidates=[...q.unit.kinds];
 if(candidates.length===1)kindBasis.push(`unit ${q.unit.surface}`);
 // metrics named by the value's own labels (or by its context when the labels name none)
 const metricHits=(texts:readonly string[])=>qk.pack.metrics.map(m=>({m,t:hit(texts,m.terms)})).filter(x=>x.t.length);
 let mh=metricHits(own);let mFrom='labels';if(!mh.length){mh=metricHits(context);mFrom='context';}
 const compatible=mh.filter(x=>candidates.includes(x.m.kind));
 const incompatible=mh.filter(x=>!candidates.includes(x.m.kind));
 if(incompatible.length&&!compatible.length&&mFrom==='labels')unresolved.push(`metric: the labels name ${incompatible.map(x=>x.m.id).join(', ')} but the unit ${q.unit.surface} cannot express it`);
 // A metric named in a label settles the kind ("energy label" -> sound power level).
 const metricKinds=[...new Set(compatible.map(x=>x.m.kind))];
 let metricNamed:{kind:string;from:string;metric:string}|null=null;
 if(candidates.length>1&&metricKinds.length===1){const mid=compatible.find(x=>x.m.kind===metricKinds[0])!.m.id;candidates=metricKinds;metricNamed={kind:metricKinds[0],from:mFrom,metric:mid};kindBasis.push(`${mFrom} name ${mid}`);}
 let refKind:string|null=null;
 if(q.unit.level&&q.unit.level.reference){const ref=qk.pack.kinds.find(k=>k.reference===q.unit.level!.reference);if(ref&&candidates.includes(ref.id)){candidates=[ref.id];refKind=ref.id;kindBasis.push(`unit reference ${q.unit.level.reference}`);}}
 if(candidates.length>1){
  // words that name a kind family first ("noise" excludes signal-to-noise), then discriminators ("sound power", "3 ft away")
  const termHit=candidates.filter(k=>{const d=qk.kinds.get(k)!;return hit(kindAll,[...d.terms,...(d.comparatives?.max??[]),...(d.comparatives?.min??[])]).length;});if(termHit.length&&termHit.length<candidates.length)candidates=termHit;
  const disc=candidates.map(k=>({k,t:[...hit(kindAll,qk.kinds.get(k)!.discriminators??[]),...((qk.kinds.get(k)!.requires??[]).includes('measurement_distance')&&distanceIn(qk,kindAll)?['a stated measurement distance']:[])]})).filter(x=>x.t.length);
  if(disc.length===1){candidates=[disc[0].k];kindBasis.push(`discriminating words: ${disc[0].t.join(', ')}`);}
  else if(disc.length>1)unresolved.push(`kind: evidence for several kinds (${disc.map(d=>d.k+': '+d.t.join(', ')).join('; ')})`);
 }
 // KR: the document's statements, their scope and the kind's justification are decided by the declarative rules
 // (program `kind` of the rules file). The code above only reads the value's own unit and words; the code here only
 // states facts and reads conclusions back.
 const R=kindRules(qk,q,ctx,{candidates,metricNamed,refKind,own,context:kindCtx});
 if(R.byDocument){candidates=[R.byDocument];kindBasis.push(`the document's ${R.justification.type==='standard'?'declared scheme':'test protocol'} (${R.justification.ref}): ${R.justification.evidence.join(', ')}`);
  for(let i=unresolved.length-1;i>=0;i--)if(unresolved[i].startsWith('kind:'))unresolved.splice(i,1);}
 else if(R.conflict)unresolved.push(`kind: the document's statements support several kinds (${R.conflict.join(', ')})`);
 let kind=candidates.length===1?candidates[0]:null;
 // WD: a narrower kind of the same dimension when the value's own words name it ("60 % humidity" is relative humidity)
 let refined:{id:string;terms:string[]}|null=null;
 if(kind){const spec=qk.pack.kinds.filter(k=>k.specialises===kind).map(k=>({id:k.id,terms:hit(own,k.terms)})).filter(x=>x.terms.length);
  if(spec.length===1){refined=spec[0];kindBasis.push(`labels name the narrower kind ${refined.id}: ${refined.terms.join(', ')}`);kind=refined.id;}
  else if(q.unit.kindHint&&qk.kinds.get(q.unit.kindHint)?.specialises===kind){kind=q.unit.kindHint;refined={id:kind,terms:[q.unit.surface]};}}
 const justification0=kind?{...R.justification,evidence:R.justification.from==='context'&&R.justification.evidence[0]==='discriminators'?[...kindBasis]:R.justification.evidence}:R.justification;
 const justification=refined?{...justification0,type:'explicit' as const,from:(refined.terms[0]===q.unit.surface?'unit':'labels') as 'unit'|'labels',evidence:refined.terms}:justification0;
 const protoRef=justification.from==='protocol'?justification.ref:null;
 if(!kind)unresolved.push(candidates.length?`kind: ${q.unit.surface} can express ${candidates.join(' or ')}; nothing here says which`:`kind: no known quantity is expressed in ${q.unit.surface}`);
 let metricCands=[...new Set(compatible.filter(x=>!kind||x.m.kind===kind).map(x=>x.m.id))];
 // the most specific name wins when one metric's matched words contain another's ("max room size" over "room size")
 if(metricCands.length>1){const best=Math.max(...metricCands.map(id=>Math.max(...compatible.find(x=>x.m.id===id)!.t.map(t=>t.length))));
  const longest=metricCands.filter(id=>Math.max(...compatible.find(x=>x.m.id===id)!.t.map(t=>t.length))===best);if(longest.length===1)metricCands=longest;}
 const metricId=metricCands.length===1?metricCands[0]:null;
 if(metricCands.length>1)unresolved.push(`metric: the words name ${metricCands.join(' and ')}`);
 const metricBasis=metricId?[`${mFrom}: ${compatible.find(x=>x.m.id===metricId)!.t.join(', ')}`]:[];
 // conditions the knowledge requires for comparability, and which of them are stated
 const required=[...new Set([...(kind?qk.kinds.get(kind)!.requires??[]:[]),...(metricId?qk.metrics.get(metricId)!.requires:[])])];
 const conditions:TypedCondition[]=[];
 const scan=(axis:AxisDef,texts:readonly string[],from:TypedCondition['from'])=>{
  for(const t of texts){
   if(axis.values)for(const [v,ws] of Object.entries(axis.values))for(const w of ws)if(hasPhrase(t,w)&&!conditions.some(c=>c.axis===axis.id&&c.value===v))conditions.push({axis:axis.id,value:v,raw:w,from});
   if(axis.valueKind||axis.valueKinds){const vks=axis.valueKinds??[axis.valueKind!];const parts=new Map<string,string>();
    for(const f of findQuantities(qk,t)){const vk=vks.find(k=>quantityIsOfKind(qk,f,k,t));if(!vk||parts.has(vk))continue;
     if(axis.cues&&!axis.cues.some(c=>hasPhrase(t.slice(Math.max(0,f.start-24),f.end+12),c))&&!qk.kinds.get(vk)?.specialises)continue;parts.set(vk,f.surface);}
    if(parts.size&&!conditions.some(c=>c.axis===axis.id)){const raw=vks.filter(k=>parts.has(k)).map(k=>parts.get(k)!).join('; ');conditions.push({axis:axis.id,value:normText(raw),raw,from});}}
   if(axis.freeText&&!conditions.some(c=>c.axis===axis.id)){const m=new RegExp('(?:'+axis.freeText.map(w=>esc(w)).join('|')+')[\\s\\w.-]{0,14}','i').exec(t);
    if(m&&(axis.freeText.some(w=>/-$/.test(w)&&m[0].toLowerCase().startsWith(w))||/\d|\b(?:low|high|max|min|top|quiet|eco|turbo|auto|night)\b/i.test(m[0])))conditions.push({axis:axis.id,value:normText(m[0]),raw:m[0].trim(),from});}}};
 // Settings and challenges (value axes) are read from the value's own labels and conditions only: a paragraph near a table
 // ("in sleep mode") does not say which setting each cell was measured at. A measured quantity axis (the distance of a
 // sound level, air changes per hour) may come from the context, where test methods state it; the source is recorded.
 for(const a of required){const axis=qk.axes.get(a)!;scan(axis,labels,'labels');scan(axis,conds,'conditions');if(axis.valueKind&&!conditions.some(c=>c.axis===a))scan(axis,context,'context');}
 // WD (tuned on the KV pages): an operating condition the value's own words state (a floor, a speed, a programme) is part
 // of its record whether or not the knowledge requires it for the metric: a carpet pickup and a hard-floor pickup are two tests.
 for(const axis of qk.pack.conditionAxes)if((axis.operatingCondition||axis.labelled)&&!required.includes(axis.id)){scan(axis,labels,'labels');scan(axis,conds,'conditions');}
 // The method a value was produced under, and the conditions that method fixes (v2): named in the labels or the context.
 const methods=(qk.pack.methods??[]).filter(m=>(metricId?m.measures.includes(metricId):m.measures.some(x=>kind&&qk.metrics.get(x)!.kind===kind))&&hit(all,m.terms).length);
 if(methods.length===1&&!conditions.some(c=>c.axis==='method')){const m=methods[0];conditions.push({axis:'method',value:m.id,raw:hit(all,m.terms)[0],from:labels.some(l=>m.terms.some(t=>hasPhrase(l,t)))?'labels':'context'});
  for(const [ax,v] of Object.entries(m.fixedConditions))if(!conditions.some(c=>c.axis===ax))conditions.push({axis:ax,value:normText(v),raw:v,from:'method'});}
 else if(methods.length>1){
  // several schemes named (an "energy label" of two product groups): their shared fixed conditions still hold
  const fixed=methods.map(m=>JSON.stringify(m.fixedConditions));
  if(new Set(fixed).size===1)for(const [ax,v] of Object.entries(methods[0].fixedConditions)){if(!conditions.some(c=>c.axis===ax))conditions.push({axis:ax,value:normText(v),raw:v,from:'method'});}
  unresolved.push(`method: the words name ${methods.map(m=>m.id).join(' and ')}`);}
 const missing=required.filter(a=>!conditions.some(c=>c.axis===a));
 return {surface:q.surface,value:q.value,...(q.low!==undefined?{low:q.low,high:q.high}:{}),unit:q.unit,
  si:q.unit.level?{value:q.value,...(q.low!==undefined?{low:q.low,high:q.high}:{})}:{value:toSi(q.unit,q.value),...(q.low!==undefined?{low:toSi(q.unit,q.low)!,high:toSi(q.unit,q.high)!}:{})},
  kind:{id:kind,candidates,basis:kindBasis,justification},metric:{id:metricId,candidates:metricCands,basis:metricBasis},
  weighting:q.unit.level?.weighting??null,reference:q.unit.level?.reference??(kind?qk.kinds.get(kind)!.reference??null:null),
  conditions,missingConditions:missing,unresolved,knowledge:qk.identity,source:ctx.source??null,protocol:protoRef,cohort:ctx.cohort??null,product:ctx.product??null,contextScope:scope?{applied:scope.applied,excluded:scope.excluded,derivation:scope.derivation}:null};
}

/** WD P1: one value of a record (a table row with a record axis, a sentence, a key-value pair). `point`: a single value
 * (not a range or a bound). */
export interface RecordValue {id:string;record:string;quantity:TypedQuantity;point:boolean}
export interface RecordRoles {role:Map<string,'condition'|'result'>;quantities:Map<string,TypedQuantity>;derivation:Map<string,string[]>}
/** WD P1 (program `record`): which values of one record are conditions of its other values, decided by the rules from
 * the knowledge (the axes a co-recorded metric requires and the kinds those axes take). Conditions a value's own labels
 * state are kept; the record adds only axes the value does not state itself. Without program `record` (rules kr.1), no
 * value changes. */
export function applyRecordRoles(qk:QuantityKnowledge,values:readonly RecordValue[]):RecordRoles{
 const out:RecordRoles={role:new Map(),quantities:new Map(values.map(v=>[v.id,v.quantity])),derivation:new Map()};
 const prog=qk.rules.get('record');if(!prog||values.length<2)return out;
 const F:Record<string,string[][]>={rec_value:[],rec_kind:[],rec_metric:[],rec_point:[],metric_requires:[],axis_value_kind:[]};
 for(const v of values){F.rec_value.push([v.id,v.record]);if(v.quantity.kind.id)F.rec_kind.push([v.id,v.quantity.kind.id]);if(v.quantity.metric.id)F.rec_metric.push([v.id,v.quantity.metric.id]);if(v.point)F.rec_point.push([v.id]);}
 const metrics=new Set(values.map(v=>v.quantity.metric.id).filter((x):x is string=>!!x));
 for(const m of metrics)for(const a of qk.metrics.get(m)!.requires)F.metric_requires.push([m,a]);
 for(const a of qk.pack.conditionAxes)for(const k of a.valueKinds??(a.valueKind?[a.valueKind]:[]))F.axis_value_kind.push([a.id,k]);
 const m=evaluate(prog,F,{record:`record ${values[0].record}`});
 for(const f of m.all('rec_is_condition'))out.role.set(f.args[0],'condition');
 const byW=new Map<string,Map<string,string[]>>();
 for(const f of m.all('rec_condition')){const [w,a,v]=f.args;out.role.set(w,'result');const g=byW.get(w)??new Map<string,string[]>();g.set(a,[...(g.get(a)??[]),v]);byW.set(w,g);
  out.derivation.set(w,[...(out.derivation.get(w)??[]),...m.why(f)]);}
 const surf=new Map(values.map(v=>[v.id,v.quantity]));
 for(const [w,axes] of byW){const q=out.quantities.get(w)!;const conds=[...q.conditions];
  for(const [a,vs] of axes){if(conds.some(c=>c.axis===a&&c.from!=='context'))continue;const axis=qk.axes.get(a)!;const order=axis.valueKinds??[axis.valueKind??''];
   const sorted=[...new Set(vs)].sort((x,y)=>order.indexOf(surf.get(x)!.kind.id??'')-order.indexOf(surf.get(y)!.kind.id??''));
   const raw=sorted.map(x=>surf.get(x)!.surface).join('; ');for(let i=conds.length-1;i>=0;i--)if(conds[i].axis===a)conds.splice(i,1);
   conds.push({axis:a,value:normText(raw),raw,from:'record',by:sorted.join(', ')});}
  out.quantities.set(w,{...q,conditions:conds,missingConditions:q.missingConditions.filter(a=>!conds.some(c=>c.axis===a))});}
 return out;
}
/** WD: a found quantity is of kind K when its unit expresses K, or K is a narrower kind of one its unit expresses and K's
 * words follow or precede the number closely ("60 % RH", "humidity of 60 %"). */
export function quantityIsOfKind(qk:QuantityKnowledge,f:FoundQuantity,k:string,text:string):boolean{
 if(f.unit.kinds.includes(k))return true;const d=qk.kinds.get(k);if(!d?.specialises||!f.unit.kinds.includes(d.specialises))return false;
 const near=text.slice(Math.max(0,f.start-28),Math.min(text.length,f.end+20));return d.terms.some(tm=>hasPhrase(near,tm));
}
// ---------------------------------------------------------------------------------------------------------------------
// Same quantity printed twice ("147 CFM (250 m³/h)") and comparability of two quantities.
const decimals=(n:number)=>{const s=String(n);const i=s.indexOf('.');return i<0?0:s.length-i-1;};
/** Two printed values express the same quantity when they share a dimension and agree within their printed precision. */
export function sameQuantity(a:TypedQuantity,b:TypedQuantity):{same:boolean;reason:string}{
 if(a.unit.level||b.unit.level)return {same:false,reason:'levels are not converted'};
 if(!sameDim(a.unit.dim,b.unit.dim))return {same:false,reason:'different dimensions'};
 if(a.si?.value==null||b.si?.value==null||a.value==null||b.value==null)return {same:false,reason:'a range or a missing value'};
 if(a.unit.conventional||b.unit.conventional)return {same:a.unit.expression===b.unit.expression&&a.value===b.value,reason:'a conventional reporting basis is compared only as printed'};
 const tol=0.5*Math.pow(10,-decimals(a.value))*a.unit.factor+0.5*Math.pow(10,-decimals(b.value))*b.unit.factor;
 const d=Math.abs(a.si.value-b.si.value);
 return d<=tol*1.0001?{same:true,reason:`agree within printed precision (difference ${d.toPrecision(3)}, tolerance ${tol.toPrecision(3)} in SI units)`}:{same:false,reason:`differ by ${d.toPrecision(3)} beyond printed precision ${tol.toPrecision(3)} (SI units)`};
}
export type Comparability='comparable'|'comparable_within_source'|'comparable_conditions_unestablished'|'not_comparable'|'undetermined';
export interface ComparisonResult {verdict:Comparability;reasons:string[];a:number|null;b:number|null;unit:string|null}
/** Whether two quantities can be compared, and on which common scale. The reasons come from the knowledge, not from
 * category rules: a different kind or metric, an unestablished weighting, a conventional basis, a condition. */
export function compareQuantities(qk:QuantityKnowledge,a:TypedQuantity,b:TypedQuantity):ComparisonResult&{rules:string[];derivation:string[]}{
 // KR: the decision is program `compare` of the rules file; the code states each value's facts and reads the verdict.
 const F:Record<string,(string|number)[][]>={value:[['a'],['b']],metric_label:[],candidate_kind:[],kind_of:[],metric_of:[],not_equivalent:[],level_value:[],weighting:[],conventional_basis:[],unit_expression:[],required_condition:[],stated_condition:[],presented_test:[],value_product:[],kind_unjustified:[]};
 for(const [v,q] of [['a',a],['b',b]] as const){
  for(const k of q.kind.id?[q.kind.id]:q.kind.candidates)F.candidate_kind.push([v,k]);if(q.kind.id)F.kind_of.push([v,q.kind.id]);
  if(q.metric.id){F.metric_of.push([v,q.metric.id]);F.metric_label.push([q.metric.id,qk.metrics.get(q.metric.id)!.label]);for(const n of qk.metrics.get(q.metric.id)!.notEquivalentTo??[])F.not_equivalent.push([q.metric.id,n],[n,q.metric.id]);}
  if(q.unit.level){F.level_value.push([v]);if(q.weighting)F.weighting.push([v,q.weighting]);}
  if(q.unit.conventional)F.conventional_basis.push([v]);F.unit_expression.push([v,q.unit.expression]);
  for(const x of q.missingConditions)F.required_condition.push([v,x]);for(const c of q.conditions){F.stated_condition.push([v,c.axis,c.value]);
   // kr.3: what makes two condition values documented-different: ranks of one ordinal series, numbers in one unit
   const ax=qk.pack.conditionAxes.find(x=>x.id===c.axis);if(ax?.operatingCondition)(F.operating_axis??=[]).push([c.axis]);
   if((ax?.values&&Object.prototype.hasOwnProperty.call(ax.values,c.value))||(c.axis==='method'&&(qk.pack.methods??[]).some(m=>m.id===c.value)))(F.named_value??=[]).push([c.axis,c.value]);
   const rk=/^(?:fan\s+)?(speed|level|setting|power level)\s*(\d{1,2})\b/i.exec(c.value);if(rk)(F.condition_rank??=[]).push([v,c.axis,rk[1].toLowerCase(),Number(rk[2])]);
   const nu=/^(-?\d+(?:\.\d+)?)\s*(°c|°f|%|%rh|hz|w|v|m|cm|ft|in)\b/i.exec(c.value);if(nu)(F.condition_number??=[]).push([v,c.axis,Number(nu[1]),nu[2].toLowerCase()]);}
  if(q.cohort)F.presented_test.push([v,q.cohort]);if(q.product)F.value_product.push([v,q.product]);if(q.kind.justification.type==='insufficient')F.kind_unjustified.push([v]);}
 // facts a rule set does not declare are left out, so that an earlier rules file (kr.2) still reproduces
 const prog=qk.rules.get('compare')!;for(const k of Object.keys(F))if(!prog.vocab.has(k))delete F[k];
 const m=evaluate(prog,F,{record:`the record of the pair a="${a.surface}", b="${b.surface}"`});
 const verdicts=m.all('verdict');if(!verdicts.length)throw Error('compare rules reached no verdict');
 const verdict=verdicts[0].args[0] as Comparability;
 // the findings behind the verdict: every finding at the deciding stage, explained by its rule's template
 const stage=m.all('finding').filter(f=>verdicts.some(v=>v.args[1]===f.args[2])).map(f=>f.args[0])[0];
 const findings=m.all('finding').filter(f=>f.args[0]===stage);
 const reasons=[...new Set(findings.map(f=>explain(m,f).replace(/_/g,' ')))];
 const keeps=verdict==='comparable'||verdict==='comparable_within_source'||verdict==='comparable_conditions_unestablished';
 return {verdict,reasons,a:keeps?a.si?.value??null:null,b:keeps?b.si?.value??null:null,unit:keeps?(a.unit.level?a.unit.expression:'SI'):null,
  rules:[...new Set(verdicts.flatMap(v=>m.rulesOf(v)))],derivation:verdicts.flatMap(v=>m.why(v))};
}

// ---------------------------------------------------------------------------------------------------------------------
// Quantitative requirements in an ordinary-English request.
export interface QuantityRequirement {span:string;start:number;end:number;bound:'min'|'max'|null;boundCue:string|null;quantity:TypedQuantity;
 /** typed: kind and bound known; kind_ambiguous: the unit can express several quantities; no_bound: a quantity without a limit */
 status:'typed'|'kind_ambiguous'|'no_bound';question:string|null}
/** The bound a quantity's own words put on it ("at least 30 cm", "under 45 dB", "no wider than 60 cm", "40 dB or less"):
 * 'min', 'max' or null, with the cue. Generic English bound words and the kinds' comparatives are data in the pack. Shared
 * by request requirements and (S99) document statements, where a bounded value is a limit, never a point result. */
export interface BoundNegation {negator:string;kind:'proposition'|'requirement';/** offset of the negator in the text */start:number}
export function quantityBound(qk:QuantityKnowledge,text:string,start:number,end:number,kindIds:readonly string[]):{bound:'min'|'max'|null;cue:string|null;before:string;after:string;
 /** R3-P: the negator that governs the bound word, if any; the returned bound is then the negated one ("nothing over 6 L":
  * max; "I don't need more than 6 L": max, and the negation is a requirement negation the reader must not apply as hard) */
 negation:BoundNegation|null}{
 const lang=qk.pack.language.en;
 // S103 (D31/F12, one bound reader): the dot of "min.", "max.", "approx." or "ca." is not a sentence break (fix carried over from
 // the retired Phase253 local reader, S86b)
 let cs=0;for(const b of text.slice(0,start).matchAll(/(?<!\b(?:[Mm]in|[Mm]ax|[Aa]pprox|[Cc]a))[.;!?\n](?=\s|$)/g))cs=b.index!+1;
 const before=text.slice(Math.max(cs,start-70),start);const after=text.slice(end,end+40).split(/(?<!\b(?:[Mm]in|[Mm]ax|[Aa]pprox|[Cc]a))[.;!?\n](?=\s|$)|,/)[0];
 const lb=normText(before),la=normText(after);
 const ends=(ph:string)=>new RegExp('(?:^|[^\\p{L}])'+esc(normText(ph))+'\\s*$','u').test(lb);
 // S103: the bound may follow the property word ("45 cm wide or less", "30 hours long minimum"): words listed in the pack
 const pw=(lang.boundPropertyWords??[]).map(w=>esc(normText(w))).join('|');const prop=pw?`(?:(?:${pw})\\s+)?`:'';
 const starts=(ph:string)=>ph==='+'?/^\s*\+/.test(after):new RegExp('^\\s*'+prop+esc(normText(ph))+'(?![\\p{L}])','u').test(la);
 const kinds=kindIds.map(k=>qk.kinds.get(k)).filter((k):k is NonNullable<typeof k>=>!!k);
 let bound:'min'|'max'|null=null,cue:string|null=null;
 for(const k of kinds)for(const [b,ws] of Object.entries(k.comparatives??{}))for(const w of ws as string[])if(!bound&&ends(w)){bound=b as 'min'|'max';cue=w;}
 // "wider than 30 cm" is a minimum; the word lists are English data in the pack. R3-P: "no wider than 30 cm" is no longer a
 // special case here: the shared negation scope (src/language_scope.ts) negates the comparative like any other bound word
 const cmp=/(?:^|[^\p{L}])((\p{L}+) than)\s*$/u.exec(lb);
 if(!bound&&cmp){const w=cmp[2];const inc=lang.increaseComparatives.includes(w),dec=lang.decreaseComparatives.includes(w);
  if(inc||dec){bound=inc?'min':'max';cue=cmp[1];}}
 for(const w of [...lang.min,...lang.max].sort((a,b)=>b.length-a.length))if(!bound&&ends(w)){bound=lang.min.includes(w)?'min':'max';cue=w;}
 let negation:BoundNegation|null=null;
 // R3-P: a bound word before the quantity may be governed by a negator ("nothing over 6 L", "never above 30 dB"); the shared
 // scope decides, on the original text, at the bound word's own position
 if(bound&&cue){const ci=before.toLowerCase().replace(/[’‘]/g,"'").lastIndexOf(cue.toLowerCase());
  // a pack without its own scope vocabulary (an older or test pack) reads English with the default pack's
  if(ci>=0){const n=negationAt(text,start-before.length+ci,lang.scope??scopeVocabulary());if(n){negation={negator:n.negator,kind:n.kind,start:n.start};bound=bound==='min'?'max':'min';}}}
 for(const w of [...lang.minAfter,...lang.maxAfter])if(!bound&&starts(w)){bound=lang.minAfter.includes(w)?'min':'max';cue=w;}
 return {bound,cue,before,after,negation};
}
/** Every quantity a request states with a known unit, its bound and what it is a requirement on. Generic English bound
 * words and the kinds' comparatives come from the pack; the property is the metric or kind the words name. */
export function readQuantityRequirements(qk:QuantityKnowledge,text:string):QuantityRequirement[]{
 const out:QuantityRequirement[]=[];
 for(const f of findQuantities(qk,text)){
  const {bound,cue,before,after,negation}=quantityBound(qk,text,f.start,f.end,f.unit.kinds);
  // the requirement's own words: the clause before the quantity (back to a comma or "and") and the words right after it
  const own=before.split(/,|\band\b|\bwith\b|\bthat\b/).at(-1)??before;
  const q=typeQuantity(qk,{surface:f.surface,value:f.value,low:f.low,high:f.high,unit:f.unit},{labels:[own,after]});
  const status=!bound&&f.low===undefined?'no_bound':q.kind.id?'typed':'kind_ambiguous';
  let question:string|null=null;
  if(status==='kind_ambiguous'&&q.kind.candidates.length>1){const ds=q.kind.candidates.map(k=>qk.kinds.get(k)!);
   question=`Does "${f.surface}" mean ${ds.map(k=>k.plain??k.id.replace(/_/g,' ')).join(', or ')}? They are different quantities and are not compared with each other.`;}
  const ci=cue?before.toLowerCase().lastIndexOf(cue.toLowerCase()):-1;
  // R3-P: a negated bound keeps its negator in the span ("no more than 1.5 sones")
  const start0=ci>=0?f.start-(before.length-ci):f.start;const start=negation&&negation.start<start0?negation.start:start0;
  out.push({span:text.slice(start,f.end).trim(),start,end:f.end,bound,boundCue:cue,quantity:q,status,question});}
 return out;
}

/** What would answer a typed quantity: the metric (or kind) to look for, the methods that define it, the conditions that
 * make two results comparable, and what the knowledge says is NOT evidence of it. Derived from the knowledge only. */
export function evidenceNeed(qk:QuantityKnowledge,q:TypedQuantity):{target:string;methods:string[];conditions:string[];notEvidence:string[];note:string|null}{
 const m=q.metric.id?qk.metrics.get(q.metric.id)!:null;const k=q.kind.id?qk.kinds.get(q.kind.id)!:null;
 const conditions=[...new Set([...(k?.requires??[]),...(m?.requires??[])])].map(a=>a.replace(/_/g,' '));
 // v2: the methods section names the schemes that measure the metric and the conditions each fixes
 const viaMethods=m?(qk.pack.methods??[]).filter(x=>x.measures.includes(m.id)&&!x.supersededBy).map(x=>x.label+(Object.keys(x.fixedConditions).length?` (${Object.entries(x.fixedConditions).map(([a,v])=>a.replace(/_/g,' ')+': '+v).join('; ')})`:'')):[];
 return {target:m?m.label:k?k.id.replace(/_/g,' '):q.kind.candidates.map(c=>c.replace(/_/g,' ')).join(' or '),methods:[...new Set([...(m?.definedBy??[]).map(d=>d.method),...viaMethods])],
  conditions,notEvidence:(m?.notEquivalentTo??[]).map(id=>qk.metrics.get(id)!.label),note:m?.note??k?.note??null};
}

// ---------------------------------------------------------------------------------------------------------------------
// v2: reading labels — the unit a label states ("Noise level in decibels", "Weight (kg)"), the reporting basis it states
// ("Daily extraction"), numbers whose metric is dimensionless ("Delta-E 1.2").
/** The single unit a label states: bracketed ("(m³/h)", "(10%, in nits)") or after "in" ("Electricity consumption in
 * watts"). Several different units (alternatives "pounds / kg") or none: null. */
export function unitStatedInLabel(qk:QuantityKnowledge,label:string):{unit:ParsedUnit;surface:string}|null{
 const found=new Map<string,{unit:ParsedUnit;surface:string}>();
 for(const m of label.matchAll(/[([]\s*([^()[\]]{1,28}?)\s*[)\]]/g))for(const part of m[1].split(/[,;]/)){const inner=part.trim().replace(/^in\s+/i,'');const u=inner?parseUnit(qk,inner):null;if(u)found.set(u.expression,{unit:u,surface:inner});}
 for(const prep of qk.pack.language.en.labelUnitPrepositions??[]){const re=new RegExp('(?:^|[^\\p{L}])'+esc(prep)+'\\s+([^,;()\\[\\]]{1,40})','iu');const m=re.exec(label);if(!m)continue;
  const words=m[1].trim().split(/\s+/);for(let n=Math.min(4,words.length);n>=1;n--){const cand=words.slice(0,n).join(' ').replace(/[.:]$/,'');const u=parseUnit(qk,cand);if(u){found.set(u.expression,{unit:u,surface:cand});break;}}}
 return found.size===1?[...found.values()][0]:null;
}
const BASIS_ATOM:Record<string,string>={day:'day',year:'year',month:'month',h:'h',cycle:'cycle'};
/** A unit made periodic by its label ("Daily extraction rate" + "20 L" = 20 L/day). Only quantities that accumulate
 * (volume, energy, mass) take a basis, and never twice. */
export function withLabelBasis(qk:QuantityKnowledge,unit:ParsedUnit,labels:readonly string[]):{unit:ParsedUnit;basis:string}|null{
 if(unit.level||unit.atoms.some(a=>a.exp<0)||!unit.kinds.some(k=>['volume','energy','mass'].includes(k)))return null;
 const words=qk.pack.language.en.basisWords??{};
 const named=namedPhrases(labels.join(' | '),Object.keys(words));if(named.size!==1)return null;const w=[...named][0];
 const atom=BASIS_ATOM[words[Object.keys(words).find(k=>normText(k)===w)!]];if(!atom)return null;
 const u=parseUnit(qk,unit.surface+'/'+atom);return u?{unit:{...u,surface:unit.surface},basis:w}:null;
}
/** WD: a label that names a metric reported per a conventional basis ("Extraction rate" -> per day) gives a unit that
 * prints none the metric's basis: "20L" under "Extraction rate" is 20 L/day by the metric's stated convention. */
export function withConventionalBasis(qk:QuantityKnowledge,unit:ParsedUnit,labels:readonly string[]):{unit:ParsedUnit;basis:string;metric:string}|null{
 if(unit.level||unit.atoms.some(a=>a.exp<0))return null;
 for(const m of qk.pack.metrics){if(!m.conventionalBasis||!labels.some(l=>m.terms.some(t=>hasPhrase(l,t))))continue;if(unit.kinds.includes(m.kind))return null;
  const atom=BASIS_ATOM[m.conventionalBasis.per];if(!atom)continue;const u=parseUnit(qk,unit.surface+'/'+atom);if(u&&u.kinds.includes(m.kind))return {unit:{...u,surface:unit.surface},basis:`${m.id} is reported per ${m.conventionalBasis.per} (${m.conventionalBasis.source})`,metric:m.id};}
 return null;}
/** A number without a unit whose label names a dimensionless metric (ΔE): typed with that metric's kind. */
export function typeLabelledNumber(qk:QuantityKnowledge,q:{surface:string;value:number|null;low?:number;high?:number},ctx:QuantityContext={}):TypedQuantity|null{
 const labels=[...(ctx.labels??[])];const ms=qk.pack.metrics.filter(m=>m.unitless&&m.terms.some(t=>labels.some(l=>hasPhrase(l,t))));if(ms.length!==1)return null;
 const m=ms[0];const unit:ParsedUnit={surface:'',expression:'1',level:null,dim:{},factor:1,offset:0,atoms:[],classes:[],conventional:false,kindHint:m.kind,kinds:[m.kind]};
 return typeQuantity(qk,{...q,unit},ctx);
}

// ---------------------------------------------------------------------------------------------------------------------
// v2: ordinal class scales.
export interface TypedClass {surface:string;value:string;scale:string|null;candidates:string[];basis:string[];metric:string|null;rank:number|null;knowledge:string}
/** Type a class value ("A+++", "H13", "B") against the scales the knowledge holds. A value only one scale has settles it;
 * otherwise a product group and date inside one regime do; otherwise the scale stays ambiguous. */
export function typeClass(qk:QuantityKnowledge,surface:string,ctx:{labels?:readonly string[];productGroup?:string;date?:string}={}):TypedClass|null{
 const v=surface.trim().toUpperCase().replace(/\s+/g,'').replace(/^CLASS/,'');const labels=[...(ctx.labels??[])];
 const named=(sc:ScaleDef)=>sc.terms.some(t=>labels.some(l=>hasPhrase(l,t)));
 let cands=(qk.pack.scales??[]).filter(sc=>sc.values.includes(v)&&(named(sc)||(sc.distinctive??[]).includes(v)));if(!cands.length)return null;const basis:string[]=[];
 const distinct=cands.filter(sc=>(sc.distinctive??[]).includes(v));if(distinct.length===1&&cands.length>1){cands=distinct;basis.push(`${v} exists only on ${distinct[0].id}`);}
 if(cands.length>1&&ctx.productGroup){const inRegime=cands.filter(sc=>(sc.regimes??[]).some(r=>r.productGroups.includes(ctx.productGroup!)&&(!ctx.date||((!r.from||ctx.date>=r.from)&&(!r.until||ctx.date<=r.until)))));
  if(inRegime.length===1&&ctx.date){cands=inRegime;basis.push(`${ctx.productGroup} on ${ctx.date}`);}}
 const scale=cands.length===1?cands[0]:null;if(scale&&!basis.length)basis.push(named(scale)?'labels name the scale':'value');
 return {surface,value:v,scale:scale?.id??null,candidates:cands.map(c=>c.id),basis,metric:scale?.metric??null,rank:scale?scale.values.indexOf(v):null,knowledge:qk.identity};
}
/** Classes compare only on the same scale (an old A+++ is not better or worse than a rescaled B: different scales). */
export function compareClasses(qk:QuantityKnowledge,a:TypedClass,b:TypedClass):{verdict:Comparability;reasons:string[];order:-1|0|1|null}{
 if(!a.scale||!b.scale){const shared=a.candidates.filter(c=>b.candidates.includes(c));return {verdict:shared.length?'undetermined':'not_comparable',reasons:[shared.length?'the class scale is not established':'no common scale'],order:null};}
 if(a.scale!==b.scale)return {verdict:'not_comparable',reasons:[`different scales: ${a.scale} vs ${b.scale}`],order:null};
 return {verdict:'comparable',reasons:['same scale'],order:a.rank===b.rank?0:(a.rank!<b.rank!?-1:1)};
}

// ---------------------------------------------------------------------------------------------------------------------
// v2: relations. A tiny arithmetic language (numbers, names, + - * / ^, parentheses, log10, ln); evaluated in the units
// each relation states.
type Expr=(env:Record<string,number>)=>number;
export function compileExpression(src:string,names:readonly string[]):Expr{
 const toks=src.match(/\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_]*|[-+*/^()]/g)??[];if(toks.join('')!==src.replace(/\s+/g,''))throw Error('unexpected character');let i=0;
 const peek=()=>toks[i],eat=(t?:string)=>{const x=toks[i++];if(t&&x!==t)throw Error('expected '+t);if(x===undefined)throw Error('unexpected end');return x;};
 const prim=():Expr=>{const t=eat();if(t==='('){const e=add();eat(')');return e;}if(t==='-'){const e=prim();return env=>-e(env);}
  if(/^\d/.test(t)){const v=Number(t);return ()=>v;}
  if(t==='log10'||t==='ln'){eat('(');const e=add();eat(')');return t==='log10'?env=>Math.log10(e(env)):env=>Math.log(e(env));}
  if(!names.includes(t))throw Error('unknown name '+t);return env=>env[t];};
 const pow=():Expr=>{const b=prim();if(peek()==='^'){eat();const e=pow();return env=>Math.pow(b(env),e(env));}return b;};
 const mul=():Expr=>{let l=pow();while(peek()==='*'||peek()==='/'){const op=eat(),r=pow(),L=l;l=op==='*'?env=>L(env)*r(env):env=>L(env)/r(env);}return l;};
 const add=():Expr=>{let l=mul();while(peek()==='+'||peek()==='-'){const op=eat(),r=mul(),L=l;l=op==='+'?env=>L(env)+r(env):env=>L(env)-r(env);}return l;};
 const e=add();if(i!==toks.length)throw Error('trailing tokens');return e;
}
export interface RelationCheck {relation:string;output:string;observed:number;expected:number;unit:string;consistent:boolean;inputs:Record<string,{value:number;from:string}>;implied?:{name:string;value:number;unit:string;default:number};statement:string;nature:RelationDef['nature'];caveat:string}
const inUnit=(qk:QuantityKnowledge,q:TypedQuantity,unit:string)=>{const u=parseUnit(qk,unit);if(!u||q.si?.value==null||q.unit.level)return null;return (q.si.value-u.offset)/u.factor;};
/** Check every relation whose output and inputs a set of typed values (one product) provides: the expected output, whether
 * the printed one agrees within the relation's tolerance and, when it does not and one assumption was used, the value of
 * that assumption the page implies ("the room size assumes a 10 ft ceiling"). */
export function relationChecks(qk:QuantityKnowledge,values:readonly TypedQuantity[]):RelationCheck[]{
 const out:RelationCheck[]=[];
 for(const r of qk.pack.relations??[]){if(r.use&&!r.use.includes('consistency'))continue;
  const outs=values.filter(v=>(r.output.metric?v.metric.id===r.output.metric:v.kind.id===r.output.kind)&&v.value!==null);
  for(const o of outs){const observed=inUnit(qk,o,r.output.unit);if(observed===null)continue;
   const env:Record<string,number>={};const from:RelationCheck['inputs']={};let ok=true;let assumption:RelationInput|null=null;
   for(const inp of r.inputs){
    if(inp.metric||inp.kind){
     let cands=values.filter(v=>v!==o&&(inp.metric?v.metric.id===inp.metric:v.kind.id===inp.kind)&&v.value!==null&&!v.conditions.some(c=>o.conditions.some(d=>d.axis===c.axis&&d.value!==c.value)));
     if(cands.length>1&&inp.prefer){const pref=cands.filter(v=>Object.entries(inp.prefer!).every(([ax,val])=>v.conditions.some(c=>c.axis===ax&&c.value===val)));if(pref.length)cands=pref;}
     // several candidate values with nothing that pairs one of them with the output: no check (never guess a pairing)
     if(new Set(cands.map(v=>v.si?.value)).size>1){ok=false;break;}
     const cand=cands[0];const x=cand?inUnit(qk,cand,inp.unit):null;if(x===null){ok=false;break;}env[inp.name]=x;from[inp.name]={value:x,from:cand!.surface};}
    else if(inp.axis){const c=o.conditions.find(c=>c.axis===inp.axis);const f=c?findQuantities(qk,c.raw)[0]:null;const x=f?inUnit(qk,typeQuantity(qk,f),inp.unit):null;if(x===null){ok=false;break;}env[inp.name]=x;from[inp.name]={value:x,from:'condition '+c!.raw};}
    else if(inp.assumption){env[inp.name]=inp.default!;from[inp.name]={value:inp.default!,from:'assumption'};assumption=inp;}}
   if(!ok)continue;const f=compileExpression(r.expression,r.inputs.map(i=>i.name));const expected=f(env);
   const consistent=Math.abs(expected-observed)<=r.tolerance*Math.abs(observed);
   const rc:RelationCheck={relation:r.id,output:o.surface,observed,expected,unit:r.output.unit,consistent,inputs:from,statement:r.statement,nature:r.nature,caveat:r.caveat};
   if(!consistent&&assumption){let lo=assumption.default!/20,hi=assumption.default!*20;const g=(x:number)=>f({...env,[assumption!.name]:x})-observed;
    if(g(lo)*g(hi)<0){for(let k=0;k<80;k++){const mid=(lo+hi)/2;if(g(lo)*g(mid)<=0)hi=mid;else lo=mid;}rc.implied={name:assumption.name,value:Math.round((lo+hi)/2*100)/100,unit:assumption.unit,default:assumption.default!};}}
   out.push(rc);}}
 return out;
}

/** v2: class requirements in a request ("energy class A", "A+++ rated", "at least class B"). The scale is resolved for the
 * product group at the request date; a class of a scale no longer in use is reported as such, never mapped to another. */
export interface ClassRequirement {span:string;value:string;bound:'min'|'exact';scale:string|null;candidates:string[];note:string|null}
export function readClassRequirements(qk:QuantityKnowledge,text:string,ctx:{productGroup?:string;date?:string}={}):ClassRequirement[]{
 const out:ClassRequirement[]=[];const scales=qk.pack.scales??[];if(!scales.length)return out;
 const terms=[...new Set(scales.flatMap(s=>s.terms))].sort((a,b)=>b.length-a.length).map(esc).join('|');
 const re=new RegExp(`(?:(at least|or better|minimum)\\s+)?(?:(?:${terms})\\s*(?:of\\s+|class\\s+|rating\\s+|:\\s*)?([A-G](?:\\+{1,3})?|[EHU]1[0-7])(?![\\p{L}\\p{N}+])|([A-G]\\+{1,3})(?=\\s*(?:rated|rating|energy|class))|(?<![\\p{L}])([EHU]1[0-7])(?![\\p{L}\\p{N}]))(\\s+or\\s+(?:better|above|higher))?`,'giu');
 for(const m of text.matchAll(re)){const v=(m[2]??m[3]??m[4]).toUpperCase();const t=typeClass(qk,v,{labels:[m[0]],...ctx});if(!t)continue;
  const sc=t.scale?scales.find(x=>x.id===t.scale)!:null;let note:string|null=null;
  if(sc&&ctx.productGroup&&ctx.date){const reg=(sc.regimes??[]).find(r=>r.productGroups.includes(ctx.productGroup!));if(reg?.until&&ctx.date>reg.until)note=`${sc.label} is no longer used for ${ctx.productGroup.replace(/_/g,' ')} (until ${reg.until}); a class on it does not translate to the current scale`;}
  out.push({span:m[0].trim(),value:v,bound:m[1]||m[5]?'min':'exact',scale:t.scale,candidates:t.candidates,note});}
 return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// S86 (owner: one scientific representation for the quantities PEE reads in requests AND in pages). The typing of one
// observed value as an extraction reader reports it: value, unit surface, and the labels that are the value's own (a
// table header, the measurand term of its clause). The unit is kept as the knowledge's canonical expression, so what the
// printed unit says (A-weighting, a time denominator, m³/h vs CFM) survives storage; the kind and metric are what the
// unit and labels establish, never what the surrounding page makes plausible. Not typed: an explicit status and reason.
export interface ObservedQuantity {unit:string;kinds:string[];kind:string|null;metric:string|null;weighting:string|null;per:string|null;
 status:'typed'|'kind_ambiguous'|'unit_not_recognised';reason:string|null}
export function typeObservedValue(qk:QuantityKnowledge,v:{value:number|null;unit:string;labels?:readonly string[]}):ObservedQuantity{
 const surface=String(v.unit??'').trim();const p=surface?parseUnit(qk,surface):null;
 if(!p)return {unit:surface,kinds:[],kind:null,metric:null,weighting:null,per:null,status:'unit_not_recognised',reason:`"${surface}" is not a unit the quantity knowledge reads`};
 const labels=(v.labels??[]).filter((x):x is string=>typeof x==='string'&&x.trim().length>0);
 const q=typeQuantity(qk,{surface:`${v.value??''} ${surface}`.trim(),value:v.value,unit:p},{labels});
 const den=p.atoms.find(a=>a.exp<0)?.id??null;
 const kind=q.kind.id;const metric=q.metric.id;
 // the stored key must read back as the same unit: the canonical expression when it does, the printed form otherwise ("%")
 const back=parseUnit(qk,p.expression);const key=back&&back.expression===p.expression?p.expression:surface;
 return {unit:key,kinds:[...p.kinds],kind,metric,weighting:p.level?.weighting??null,per:den,status:kind?'typed':'kind_ambiguous',
  reason:kind?null:`the unit allows ${q.kind.candidates.map(k=>k.replace(/_/g,' ')).join(' or ')} and the value's own labels do not decide`};
}
/** S86: two unit keys denote the same unit (stored keys from earlier readers, "kwh", and canonical ones, "kWh", compare). */
export function sameUnit(qk:QuantityKnowledge,a:string,b:string):boolean{
 if(a===b)return true;const x=parseUnit(qk,a),y=parseUnit(qk,b);return !!x&&!!y&&x.expression===y.expression;
}
/** S86: the full typed quantity of a STORED observation (value, unit key, and the measurand its reader recorded, when that is
 * a metric id). The one place a consumer of stored rows types them (was re-parsed ad hoc by each consumer). */
export function typeStoredQuantity(qk:QuantityKnowledge,r:{value:number|null;unit:string;dimension?:string|null},
 /** S87a (optional): the words a reading attached to the value (its clause or row label); the store keeps none */
 labels:readonly string[]=[]):TypedQuantity|null{
 const p=parseUnit(qk,String(r.unit??'').trim());if(!p)return null;
 const m=r.dimension?qk.metrics.get(r.dimension):undefined;
 return typeQuantity(qk,{surface:`${r.value??''} ${r.unit}`.trim(),value:r.value,unit:p},{labels:[...(m?[(m.terms??[])[0]??m.label]:[]),...labels.filter(Boolean)]});
}
