/** S88: declarative property definitions as knowledge data (resources/property-definitions/).
 * A definition is shared across categories (I-ADOPT property + object + constraints; VIM measurand vs influence quantity;
 * LOINC basis as identity). A category profile only lists the properties that apply and overrides condition relevance.
 * Quantity kinds, metrics and condition axes are references into the quantity-knowledge pack; the loader fails closed when
 * a reference does not resolve. Nothing here is category-specific code. */
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import type {QuantityKnowledge} from './quantity_knowledge.js';

export const PROPERTY_DEFINITIONS_SCHEMA='pee.property-definitions.v1';
export const DEFAULT_PROPERTY_DEFINITIONS='property-definitions.v1.json';
export const LIFECYCLE=['candidate','supported','verified','decision_usable'] as const;
export type Lifecycle=typeof LIFECYCLE[number];
export const RELEVANCE=['defining','influencing','irrelevant'] as const;
export type Relevance=typeof RELEVANCE[number];
/** The structural condition classes of the S87b observation model (shared vocabulary). */
export const STRUCTURES=['quantity','instrument','operating_setting','method_or_protocol','procedure_state','comparison_or_basis','sample_or_challenge'] as const;
export const BASES=['per_run','per_period','per_hour','per_unit','unknown'] as const;
export type Basis=typeof BASES[number];

export interface DefinitionSource {id:string;kind:string;title:string}
export interface ConditionDimension {id:string;qkAxis?:string;structure:typeof STRUCTURES[number];label:string;values:Record<string,string[]>;cues:string[];valueKinds?:string[];nonQkUnit?:'currency_per_energy';state:Lifecycle;sources:string[]}
export interface PropertyDefinition {id:string;label:string;form:'quantity'|'categorical'|'judgement';
 quantity?:{kinds:string[];metric?:string;relatedMetrics?:string[];nonQkUnits?:string[];countNouns?:string[]};
 judgement?:{aspect:string[];higherIsBetter:boolean};
 object:string;objectNouns?:string[];plausibleSi?:[number,number];basis:{default:Basis;when:string;rule:string}|null;surface:[string,Lifecycle][];conditions:([string,Relevance]|[string,Relevance,{onlyForBasis:Basis}])[];
 outcomes?:string[];state:Lifecycle;sources:string[]}
export interface CategoryProfile {category:string;properties:string[];relevance:Record<string,Record<string,Relevance>>;state:Lifecycle;sources:string[]}
export interface BasisCues {note:string;per_run:string[];per_period:string[];per_hour:string[];per_unit:string[];runNamed:string[];state:Lifecycle;sources:string[]}
export interface NonQkUnitForms {note:string;currency:string[];currency_per_energy:string[];state:Lifecycle;sources:string[]}
export interface DefinitionPack {schema:string;version:string;statement:string;sources:DefinitionSource[];basisCues:BasisCues;nonQkUnitForms:NonQkUnitForms;evidenceCues?:{note:string;declaration:string[];measurement?:string[];state:Lifecycle;sources:string[]};
 /** S99: cues of a value's clause that make the statement a norm (a value a standard or guideline sets) or a target, never the product's result */
 statementRoles?:{note:string;norm:string[];target:string[];notNormAfter?:string[];threshold?:string[];referenceNouns?:{norm:string[];threshold:string[]};state:Lifecycle;sources:string[]};documentSections?:{note:string;specification:string[];test:string[];comparison:string[];state:Lifecycle;sources:string[]};knownObjects?:{note:string;objects:{id:string;nouns:string[];sources:string[];metrics?:string[]}[];state:Lifecycle;sources:string[]};conditionDimensions:ConditionDimension[];properties:PropertyDefinition[];profiles:CategoryProfile[]}
export interface PropertyDefinitions {pack:DefinitionPack;digest:string;identity:string;
 properties:Map<string,PropertyDefinition>;dimensions:Map<string,ConditionDimension>;profiles:Map<string,CategoryProfile>;
 /** QK kind -> properties whose quantity admits it */ byKind:Map<string,string[]>}

/** Load and validate a definition pack against the quantity-knowledge pack. Fails closed on any unresolved reference. */
export function loadPropertyDefinitions(qk:QuantityKnowledge,pack?:unknown):PropertyDefinitions{
 const raw=pack??JSON.parse(readFileSync(new URL('../../resources/property-definitions/'+DEFAULT_PROPERTY_DEFINITIONS,import.meta.url),'utf8'));
 const p=raw as DefinitionPack;const fail=(m:string):never=>{throw Error('property_definitions_invalid: '+m);};
 if(!p||p.schema!==PROPERTY_DEFINITIONS_SCHEMA)fail('schema');if(!p.version)fail('version');
 const src=new Set<string>();for(const s of p.sources){if(src.has(s.id))fail('duplicate source '+s.id);src.add(s.id);}
 const ids=(xs:{id:string}[],what:string)=>{const s=new Set<string>();for(const x of xs){if(!/^[a-z][a-z0-9_]*$/.test(x.id))fail(`${what} id ${x.id}`);if(s.has(x.id))fail(`duplicate ${what} ${x.id}`);s.add(x.id);}return s;};
 const life=(x:{state:string;sources:string[]},what:string)=>{if(!(LIFECYCLE as readonly string[]).includes(x.state))fail('state of '+what);if(!x.sources?.length)fail('sources of '+what);for(const s of x.sources)if(!src.has(s))fail(`source ${s} of ${what}`);};
 life(p.basisCues??{state:'',sources:[]},'basis cues');for(const b of ['per_run','per_period','per_hour','per_unit','runNamed'] as const)if(!p.basisCues[b]?.length)fail('basis cues '+b);
 life(p.nonQkUnitForms??{state:'',sources:[]},'non-QK unit forms');if(!p.nonQkUnitForms.currency.length||!p.nonQkUnitForms.currency_per_energy.length)fail('non-QK unit forms');
 const dims=ids(p.conditionDimensions,'dimension');
 for(const d of p.conditionDimensions){life(d,'dimension '+d.id);if(d.qkAxis&&!qk.axes.has(d.qkAxis))fail(`axis ${d.qkAxis} of dimension ${d.id}`);
  if(!(STRUCTURES as readonly string[]).includes(d.structure))fail('structure of dimension '+d.id);for(const k of d.valueKinds??[])if(!qk.kinds.has(k))fail(`value kind ${k} of dimension ${d.id}`);
  if(d.structure==='quantity'&&!d.valueKinds?.length&&!d.qkAxis&&d.nonQkUnit!=='currency_per_energy')fail('a quantity dimension needs a value kind: '+d.id);
  for(const [v,phr] of Object.entries(d.values))if(!phr.length||phr.some(x=>!x.trim()))fail(`value ${v} of dimension ${d.id}`);}
 ids(p.properties,'property');
 for(const x of p.properties){const w='property '+x.id;life(x,w);
  if(x.form==='quantity'){const q=x.quantity;if(!q)fail('quantity of '+w);
   for(const k of q!.kinds)if(!qk.kinds.has(k))fail(`kind ${k} of ${w}`);if(q!.metric&&!qk.metrics.has(q!.metric))fail(`metric ${q!.metric} of ${w}`);for(const m of q!.relatedMetrics??[])if(!qk.metrics.has(m))fail(`related metric ${m} of ${w}`);
   if(!q!.kinds.length&&!q!.nonQkUnits?.length)fail('a quantity property needs a kind or a declared non-QK unit class: '+x.id);
   for(const u of q!.nonQkUnits??[])if(u!=='currency')fail(`unit class ${u} of ${w}`);}
  else if(x.form==='judgement'){if(!x.judgement?.aspect.length||typeof x.judgement.higherIsBetter!=='boolean')fail('judgement of '+w);}
  else if(x.form!=='categorical')fail('form of '+w);
  if(x.basis&&(!(BASES as readonly string[]).includes(x.basis.default)||!x.basis.rule))fail('basis of '+w);
  if(!x.surface.length)fail('surface of '+w);for(const [t,s] of x.surface)if(!t.trim()||!(LIFECYCLE as readonly string[]).includes(s))fail(`surface ${t} of ${w}`);
  const seen=new Set<string>();for(const [d,r,q] of x.conditions){if(q&&!(BASES as readonly string[]).includes(q.onlyForBasis))fail(`basis qualifier of ${d} in ${w}`);if(!dims.has(d))fail(`dimension ${d} of ${w}`);if(seen.has(d))fail(`duplicate dimension ${d} of ${w}`);seen.add(d);if(!(RELEVANCE as readonly string[]).includes(r))fail(`relevance of ${d} in ${w}`);}}
 for(const x of p.properties)if(x.plausibleSi&&!(x.plausibleSi.length===2&&x.plausibleSi[0]<x.plausibleSi[1]))fail('plausible range of property '+x.id);
 if(p.evidenceCues){life(p.evidenceCues,'evidence cues');if(!p.evidenceCues.declaration.length)fail('evidence cues');}
 if(p.statementRoles){life(p.statementRoles,'statement roles');if(!p.statementRoles.norm.length||!p.statementRoles.target.length)fail('statement roles');for(const s0 of p.statementRoles.sources)if(!src.has(s0))fail(`source ${s0} of statement roles`);}
 if(p.documentSections){life(p.documentSections,'document sections');for(const k of ['specification','test','comparison'] as const)if(!p.documentSections[k]?.length)fail('document sections '+k);}
 if(p.knownObjects){life(p.knownObjects,'known objects');for(const o of p.knownObjects.objects){if(!o.nouns.length)fail('known object '+o.id);for(const m of o.metrics??[])if(!qk.metrics.has(m))fail(`metric ${m} of known object ${o.id}`);for(const s0 of o.sources)if(!src.has(s0))fail(`source ${s0} of known object ${o.id}`);}}
 const props=new Map(p.properties.map(x=>[x.id,x]));const cats=new Set<string>();
 for(const c of p.profiles){const w='profile '+c.category;if(cats.has(c.category))fail('duplicate '+w);cats.add(c.category);life(c,w);
  for(const id of c.properties)if(!props.has(id))fail(`property ${id} of ${w}`);
  for(const [id,o] of Object.entries(c.relevance??{})){if(!c.properties.includes(id))fail(`override of ${id} outside ${w}`);
   for(const [d,r] of Object.entries(o)){if(!dims.has(d))fail(`dimension ${d} in ${w}`);if(!(RELEVANCE as readonly string[]).includes(r))fail(`relevance ${r} in ${w}`);}}}
 const byKind=new Map<string,string[]>();for(const x of p.properties)for(const k of x.quantity?.kinds??[])byKind.set(k,[...(byKind.get(k)??[]),x.id]);
 const digest=createHash('sha256').update(JSON.stringify(p)).digest('hex');
 return {pack:p,digest,identity:`${p.version}:${digest.slice(0,16)}`,properties:props,dimensions:new Map(p.conditionDimensions.map(d=>[d.id,d])),
  profiles:new Map(p.profiles.map(c=>[c.category,c])),byKind};
}

/** Relevance of a condition dimension for a property, with a category profile's override when one exists; a condition qualified
 * by a basis defines only for that basis. */
export function relevanceOf(defs:PropertyDefinitions,property:string,dimension:string,category?:string|null,basis?:string|null):Relevance{
 const o=category?defs.profiles.get(category)?.relevance?.[property]?.[dimension]:undefined;if(o)return o;
 const c=defs.properties.get(property)?.conditions.find(([d])=>d===dimension);if(!c)return 'irrelevant';
 // a basis-qualified condition defines the measurand only for that basis; with the basis unknown it stays influencing
 if(c[2])return basis===c[2].onlyForBasis?c[1]:'influencing';
 return c[1];
}
/** The properties that may apply: a profile's list for a known category, every shared definition otherwise. */
export function applicableProperties(defs:PropertyDefinitions,category?:string|null):PropertyDefinition[]{
 const prof=category?defs.profiles.get(category):undefined;
 return prof?prof.properties.map(id=>defs.properties.get(id)!):[...defs.properties.values()];
}
