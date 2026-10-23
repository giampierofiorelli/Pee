/** S88: one interpreter driven by declarative property definitions (src/property_definitions.ts).
 * The same definition is consumed for:
 *  - attribution: which defined property a value reports (unit kind from the quantity-knowledge pack, then the definition's
 *    surface terms in the value's own labels before its context);
 *  - interpretation: which condition dimensions the observation states (definition values, then cues, then typed
 *    quantities of the dimension's kind), each with the relevance the definition gives it; the basis (stated by words or
 *    unit, or the definition's default as an inferred slot only when a run is named);
 *  - evaluation: Q1 comparability from the dimensions the definition says DEFINE the measurand;
 *  - reading: a plan measurement list compiled from the definitions (see definitionPlanMeasurements).
 * No category-specific branch: a category only selects a profile from the data. Shadow: no operational caller. */
import {hasPhrase,normText,parseUnit,typeQuantity,findQuantities,type QuantityKnowledge} from './quantity_knowledge.js';
import {applicableProperties,relevanceOf,type Basis,type ConditionDimension,type PropertyDefinition,type PropertyDefinitions,type Relevance} from './property_definitions.js';
import {UNIT_LEXICON272,TEST_CONTEXT272,type PlanMeasurement272} from './phase272_extraction_plan.js';
import {classifyCondition87} from './observation_model.js';
import {observationRole86c,otherProductInClause86c,type ObservationRole86c} from './phase225_transient_test_probe.js';
import type {DocumentSemantics1D2} from './document_semantics.js';
import {blockKind1G,dimensionsIn1G,cellElements1G,statedParameters1G,isCalculationText1G,type DocumentModel1G,type Observation1G,type TableRelations1G,type CellDerivation1G,type RowSubject1G,type TableMember1G} from './table_interpreter1g.js';
import {sentences} from './document_evidence.js';

export const DEFINITION_INTERPRETER_VERSION='pee88.definition-interpreter.v1';
export type SlotState='stated'|'inferred'|'ambiguous'|'unknown';
export interface PropertySlot {value:string|null;state:SlotState;evidence:string[];rule:string|null;alternatives:string[];kind:string|null}
export interface DimensionReading {dimension:string|null;structure:string;value:string|null;state:'stated'|'unknown';relevance:Relevance|null;evidence:string|null;from:'label'|'context'|'condition'|null;
 /** S88 it1: a relation over the condition (comparison, procedure state, identity) from the S87b structural principles. */
 relational?:boolean}
export interface BasisSlot {value:Basis|'none'|null;state:SlotState;evidence:string|null;rule:string|null}
export interface DefinitionInterpretation {version:string;definitions:string;category:string|null;property:PropertySlot;
 conditions:DimensionReading[];
 /** Defining dimensions of the attributed property the observation does not state (limits comparability, never identity). */
 missingDefining:string[];
 /** Condition texts no dimension types (kept, never dropped). */
 untyped:string[];basis:BasisSlot;object:{value:string|null;state:SlotState;rule:string|null};
 /** S89: evidential role and subject from document structure (S86c), kept apart from the property (never merged). */
 role:{value:ObservationRole86c|null;reason:string|null};subject:'page_product'|'other_product'|'unresolved';
 /** S93: provenance and nature of the result, with the originating statements (roleModel 'links' and provenance: true) */
 evidence?:EvidenceReading}
export interface ObservationInput {value:number|null;unit:string;label?:string|null;context?:string|null;conditions?:readonly string[];category?:string|null;
 /** S89: offset of the value in the label; when given, a label term supports the value only if no other number lies between them. */
 valueAt?:number|null;
 /** S94: the reader block the value sits in (a table cell's text), to find its table row */
 block?:string|null;
 /** S89: the printed value (to locate its end) and the page's product name (to tell another product's value). */
 surface?:string|null;pageSubject?:string|null;
 /** S93: the document frame of the value (page title and section headings), where the object of interest may be named */
 frame?:string|null;
 /** S90: what the document's structure says about the value (Step 1D-A2 semantics, reused): its structural label (table
  * headers, the label of a "label: value" line), its container and the role its section or table announces. */
 structure?:StructuralContext|null}
export interface StructuralContext {container:'table_cell'|'label_value'|'prose';label:string|null;section:string|null;
 sectionRole:'specification'|'test'|'comparison'|null;tableContext:'test'|'specification'|'unknown'|null;
 /** S91: the value sits under a methodology heading (Step 1D-A2), and the page type the document announces. */
 methodSection?:boolean;pageType?:string|null;
 /** S91: the document reports its own testing somewhere (first-person test context in any block). */
 documentTests?:boolean;
 /** S92: links from the value to the document statements that say where it comes from (document-level relations). */
 links?:EvidenceLink[];
 /** S93: the reader line of the heading that announces the section's role (a structural decision points to it) */
 sectionHeadingLine?:number|null}

/** S92 (owner review of S91): a link from a value to a statement of its document that establishes where the value comes
 * from: the publisher's method or test, a declaration, or a calculation. Evidence selection follows EIDER / SciREX / DocRED
 * (S87c C §6.2): co-occurrence in neighbouring sentences, a bridge through the quantity the statement names (same,
 * ancestor or methodology section), and the 1G table links (method statements linked to a table, twin tables). Statements
 * are typed by the 1G document model (blockKind1G); the quantity a statement names by dimensionsIn1G. `rank` is the
 * distance (smaller is nearer); `pointer` locates the statement. */
export interface EvidenceLink {role:'measured'|'declared'|'derived';relation:'co_occurrence'|'bridge'|'table_link'|'table_structure'|'parallel_table'|'table_derivation'|'table_member';
 scope:'neighbour_sentence'|'same_section'|'ancestor_section'|'method_section'|'table';rank:number;pointer:string;
 /** S93 (owner review of S92 §1): the originating statement(s) of the link, verifiable on the page: the 1G document block
  * (and sentence) that states the method, the declaration or the calculation; for a table value, the statements 1G linked
  * to its cell, not the cell. Empty for a link that rests on the table's own structure (headings, labels). */
 statements?:{locator:string;block:number;sentence:number|null;line?:number|null;text?:string}[]}
/** The page-level readings a value's links are selected from: the 1G document model and, for table cells, the 1G table
 * observations (with GL11/GL12 when the caller asks for them). */
export interface DocumentRelations {model:DocumentModel1G;tableObservations?:readonly Observation1G[];
 /** S94 Stage 1: whole-table relations (relative differences verified by arithmetic, statistic rows, row subjects) */
 tableRelations?:TableRelations1G}
const cellKey=(s:string)=>s.replace(/\s+/g,' ').trim().toLowerCase();
/** S94: the table derivation of a value printed in a reader block: the same value, in a cell whose text is the block text
 * (or contains it). Null when no table relation explains the value. */
export function tableDerivationOf(rel:DocumentRelations|null|undefined,blockText:string,value:number|null):CellDerivation1G|null{
 if(!rel?.tableRelations||value===null)return null;const b=cellKey(blockText);if(!b)return null;
 return rel.tableRelations.derivations.find(d=>d.value===value&&(cellKey(d.cellText)===b||b.length>=6&&cellKey(d.cellText).includes(b)))??null;}
/** S94: the comparison-table member a value is (collective typing), when a member cell's text is the block text. */
export function tableMemberOf(rel:DocumentRelations|null|undefined,blockText:string,value:number|null):TableMember1G|null{
 if(!rel?.tableRelations||value===null)return null;const b=cellKey(blockText);if(!b)return null;
 return rel.tableRelations.members.find(d=>d.value===value&&(cellKey(d.cellText)===b||b.length>=6&&cellKey(d.cellText).includes(b)))??null;}
/** S94: the subject of the table row a value sits in (reviewed product, another product, a set), when a row cell's text is
 * the block text. */
export function rowSubjectOf(rel:DocumentRelations|null|undefined,blockText:string):{subject:RowSubject1G;label:string}|null{
 if(!rel?.tableRelations)return null;const b=cellKey(blockText);if(!b)return null;const r=rel.tableRelations.rows.find(x=>cellKey(x.text)===b);return r?{subject:r.subject,label:r.label}:null;}
const KIND_ROLE={method:'measured',declaration:'declared',estimate:'derived'} as const;
const RANK={tableDerivation:0.5,tableMember:1.5,neighbour1:2,neighbour2:2.5,tableStructure:1,tableLinkSame:2.5,tableLinkAncestor:3,parallel:3,sameSection:3,ancestorSection:4,tableLinkMethod:5,methodSection:5};
/** S92: select the evidence links of one value. `container` is the value's 1D-A2 container: table observations are
 * consulted only for a table cell, sentences and sections only for text. */
export function evidenceLinksOf(rel:DocumentRelations,blockText:string,valueStart:number,surface:string,value:number|null,container:StructuralContext['container'],use:{tables?:boolean;prose?:boolean;
 /** S93: 'argument' chooses, among the candidate statements of a scope, the one that shares most with the value (quantity,
  * product, instrument, then proximity: EIDER/SciREX evidence selection); S92 took the first in document order */
 selection?:'first'|'argument';subject?:string|null;instrumentTerms?:readonly string[]}={tables:true,prose:true}):EvidenceLink[]{
 const out:EvidenceLink[]=[];const nm=(x:string)=>x.replace(/\s+/g,' ').trim().toLowerCase();
 const dims=[...new Set([...dimensionsIn1G(surface),...cellElements1G(surface).map(e=>e.dimension).filter((d):d is string=>!!d)])];
 // S94: a cell that a whole-table relation derives from other cells: the inputs (cells) and the table's context statement
 // are the originating statements; arithmetic verification makes it the nearest evidence
 const dv=use.tables===false?null:tableDerivationOf(rel,blockText,value);
 if(dv)out.push({role:'derived',relation:'table_derivation',scope:'table',rank:RANK.tableDerivation,pointer:`table ${dv.table} cell ${dv.cell} (${dv.kind}${dv.formula?' '+dv.formula:''})`,
  statements:[...dv.inputs.map(i=>({locator:`table ${dv.table} cell ${i.cell}`,block:-2,sentence:null,text:i.text})),...dv.methods.map(m=>({locator:rel.model.blocks[m.block]?.locator??'',block:m.block,sentence:null}))]});
 // S94 collective typing: a base value of a verified comparison table is a result of its column's procedure, linked to the
 // table's method statements (none: no link)
 const mb=use.tables===false||dv?null:tableMemberOf(rel,blockText,value);
 if(mb&&mb.methods.length)out.push({role:'measured',relation:'table_member',scope:'table',rank:RANK.tableMember,pointer:`table ${mb.table} cell ${mb.cell} (comparison table member)`,
  statements:mb.methods.map(m=>({locator:rel.model.blocks[m.block]?.locator??'',block:m.block,sentence:null}))});
 if(container==='table_cell'){if(!use.tables)return out;
  const cand=(rel.tableObservations??[]).filter(o=>o.value===value&&blockText.includes(o.surface.trim().slice(0,6)));
  for(const o of cand){const c=o.evidence.class,l=o.evidence.level??'';const role=c==='publisher_measured'?'measured':c==='manufacturer_declared'||c==='nominal_certified'?'declared':c==='derived_or_estimated'?'derived':null;if(!role)continue;
   const [relation,scope,rank]:[EvidenceLink['relation'],EvidenceLink['scope'],number]=l==='linked_same_section'?['table_link','same_section',RANK.tableLinkSame]:l==='linked_ancestor_section'?['table_link','ancestor_section',RANK.tableLinkAncestor]:
    l==='linked_method_section'?['table_link','method_section',RANK.tableLinkMethod]:l==='linked_parallel_table'?['parallel_table','table',RANK.parallel]:['table_structure','table',RANK.tableStructure];
   const tb=rel.model.tableBlock.get(o.table)??0;const st=use.selection==='argument'?bestStatements(rel,o.methodLinks,dims,tb,use):o.methodLinks;
   if(use.selection==='argument'&&!st.length)corefLinks(rel,surface,tb,null).forEach(l=>out.push(l));
   out.push({role,relation,scope,rank,pointer:`table ${o.table} cell ${o.cell} (${l})`,statements:st.map(bi=>({locator:rel.model.blocks[bi]?.locator??'',block:bi,sentence:null}))});}
  return out;}
 if(!use.prose)return out;
 const lo=Math.max(0,valueStart-30),snip=nm(blockText.slice(lo,valueStart+surface.length+15)),core=nm(blockText.slice(Math.max(0,valueStart-10),valueStart+surface.length+5));
 const b=rel.model.blocks.find(x=>x.text&&nm(x.text).includes(snip))??rel.model.blocks.find(x=>x.text&&nm(x.text).includes(core));if(!b)return out;
 const at=Math.max(0,nm(b.text).indexOf(nm(blockText.slice(lo,valueStart)))+ (valueStart-lo));
 const ss=sentences(b.text);let si=ss.findIndex((x,i)=>at>=x.start&&(i===ss.length-1||at<ss[i+1].start));if(si<0)si=0;
 // co-occurrence: a typed statement in a neighbouring sentence; beyond the next sentence it must name the value's quantity
 for(let j=Math.max(0,si-2);j<=Math.min(ss.length-1,si+2);j++){if(j===si)continue;const k=blockKind1G(ss[j].text);if(k==='other')continue;const d=Math.abs(j-si);
  if(d===2&&!dimensionsIn1G(ss[j].text).some(x=>dims.includes(x)))continue;
  out.push({role:KIND_ROLE[k],relation:'co_occurrence',scope:'neighbour_sentence',rank:d===1?RANK.neighbour1:RANK.neighbour2,pointer:`${b.locator} sentence ${j}`,statements:[{locator:b.locator,block:b.index,sentence:j}]});}
 // S93 coreference (EIDER's second rule): the same value stated elsewhere in the document, in a typed statement that says
 // who stated or obtained it ("Eufy quotes 251 minutes"); the nearest such mention links
 if(use.selection==='argument')corefLinks(rel,surface,b.index,b).forEach(l=>out.push(l));
 // bridge: a typed statement elsewhere that names the value's quantity, by section scope (nearest of each scope)
 if(dims.length){const own=b.sectionPath.join('/');const seen=new Set<string>();
  const cands:{c:typeof b;scope:EvidenceLink['scope']}[]=[];
  for(const c of rel.model.blocks){if(c===b||!c.text||c.kind==='other'||!c.dimensions.some(x=>dims.includes(x)))continue;const cp=c.sectionPath.join('/');
   const scope:EvidenceLink['scope']|null=cp===own?'same_section':cp&&own.startsWith(cp+'/')||!cp&&own?'ancestor_section':c.sectionPath.some(i=>rel.model.headings[i]?.isMethodHeading)?'method_section':null;
   if(scope)cands.push({c,scope});}
  for(const scope of ['same_section','ancestor_section','method_section'] as const)for(const kind of ['method','declaration','estimate'] as const){
   const group=cands.filter(x=>x.scope===scope&&x.c.kind===kind);if(!group.length||seen.has(scope+kind))continue;seen.add(scope+kind);
   const pick=use.selection==='argument'?rel.model.blocks[bestStatements(rel,group.map(x=>x.c.index),dims,b.index,use)[0]]:group[0].c;
   out.push({role:KIND_ROLE[kind],relation:'bridge',scope,rank:scope==='same_section'?RANK.sameSection:scope==='ancestor_section'?RANK.ancestorSection:RANK.methodSection,pointer:pick.locator,statements:[{locator:pick.locator,block:pick.index,sentence:null}]});}}
 return out;
}
/** S93: coreference of a value: other text blocks that print the same value (digits and unit letters), in a sentence typed
 * method, declaration or calculation; the nearest by document position, one per kind. */
function corefLinks(rel:DocumentRelations,surface:string,at:number,own:{index:number}|null):EvidenceLink[]{
 const key=surface.toLowerCase().replace(/[\s,]/g,'');const num=/\d[\d.]*/.exec(key)?.[0];if(!num||key.length<3||!/[a-z%]/.test(key))return [];
 const found:{bi:number;j:number;kind:'method'|'declaration'|'estimate';d:number}[]=[];
 for(const c of rel.model.blocks){if(!c.text||(own&&c.index===own.index))continue;const flat=c.text.toLowerCase().replace(/[\s,]/g,'');if(!flat.includes(key))continue;
  sentences(c.text).forEach((sn,j)=>{if(!sn.text.toLowerCase().replace(/[\s,]/g,'').includes(key))return;const k=blockKind1G(sn.text);if(k!=='other')found.push({bi:c.index,j,kind:k,d:Math.abs(c.index-at)});});}
 const out:EvidenceLink[]=[];for(const kind of ['method','declaration','estimate'] as const){const f=found.filter(x=>x.kind===kind).sort((a,b)=>a.d-b.d)[0];if(!f)continue;
  out.push({role:KIND_ROLE[kind],relation:'co_occurrence',scope:'neighbour_sentence',rank:RANK.neighbour2,pointer:`${rel.model.blocks[f.bi].locator} sentence ${f.j} (coreference)`,statements:[{locator:rel.model.blocks[f.bi].locator,block:f.bi,sentence:f.j}]});}
 return out;}
/** S93: argument-based choice among candidate statements (EIDER: evidence first; SciREX: n-ary arguments across sections):
 * a statement scores by the value's quantities it names, the page subject it names, an instrument it names, then by
 * proximity to the value's block. Returns the best block (ties all kept, in document order). */
function bestStatements(rel:DocumentRelations,blocks:readonly number[],dims:readonly string[],at:number,use:{subject?:string|null;instrumentTerms?:readonly string[]}):number[]{
 if(blocks.length<=1)return [...blocks];
 const subj=(use.subject??'').toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>=4);
 const score=(bi:number)=>{const c=rel.model.blocks[bi];if(!c)return -1e9;const t=c.text.toLowerCase();
  return 2*c.dimensions.filter(d=>dims.includes(d)).length+(subj.some(w=>t.includes(w))?1:0)+((use.instrumentTerms??[]).some(w=>hasPhrase(normText(t),w))?1:0)-Math.abs(bi-at)/50;};
 const sc=blocks.map(bi=>({bi,s:score(bi)}));const best=Math.max(...sc.map(x=>x.s));return sc.filter(x=>x.s===best).map(x=>x.bi);
}
/** S93 (owner review of S92 §2): provenance (who produced the value) and nature (what kind of result it is) are separate.
 * A calculation keeps its provenance and never becomes a measurement; its assumptions (tariff, hours of use) stay
 * identifiable. The nature is calculated when the value is the output of a calculation: a cost or a per-period quantity
 * in a calculation context (a calculation cue in its sentence, or a linked calculation statement), or a value an
 * estimate or calculation word governs directly ("an estimated 30 kWh"). Inputs of a calculation keep their own nature. */
export interface EvidenceReading {provenance:'publisher'|'manufacturer'|'third_party'|'unresolved';nature:'measured'|'calculated'|'declared'|'condition'|'unresolved';
 statements:{locator:string;block:number;sentence:number|null;relation:string;line?:number|null}[];
 calculation:{assumptions:{kind:string;text:string;from:'sentence'|'linked_statement'|'table'}[];inputsFromPublisher:boolean;
  /** S94: the cells a table relation computed the value from, and how */
  derivation?:{kind:string;formula:string|null;inputs:{text:string;role:string}[];residual:number|null}}|null;reason:string;
 /** S94: the product the value is about, when its table row names it */
 subject?:{value:RowSubject1G;label:string}|null}
const GOVERNED_CALC=/\b(?:estimated|calculated|projected|works out (?:at|to)|comes to|equates to|which means|results? in)\s+(?:an?\s+|about\s+|around\s+|roughly\s+|just\s+(?:over|under)\s+)?$/i;
const AGGREGATE_BEFORE=/\b(?:average|mean|median|typical|most common|minimum|maximum|lowest|highest|least|most|range(?: of)?|total|overall|sum|aggregate)\b[^.!?:;]{0,40}:?\s*$/i;
const FREQUENCY=/\b(?:every|each|once a|twice a|\d+\s*(?:times|x)\s*(?:a|per))\s+(?:day|week|month|year)\b|\b(?:daily|weekly)\b/gi;
/** S94 (arm T1c): a percentage in a comparative construction states a relative difference between two values */
const COMPARATIVE_AFTER=/^\s*(?:higher|lower|more|less|faster|slower|better|worse|greater|smaller|larger|bigger|longer|shorter|louder|quieter|brighter|darker|cheaper|dearer)\s+than\b|^\s*(?:above|below|over|under)\s+(?:the\s+)?(?:average|median|mean)\b|^\s*(?:away from|relative to|compared (?:to|with)|delta|difference)\b/i;
const COMPARATIVE_BEFORE=/\b(?:delta|difference) (?:of|was|is)\s*$/i;
const PER_PERIOD_AFTER=/^\s*(?:\/\s*|per\s+|a\s+|an\s+|each\s+)(?:year|yr|month|mo|week|day|annum)\b|^\s*(?:annually|yearly|monthly)\b/i;
export function provenanceAndNature(role:{value:ObservationRole86c|null;reason:string|null},o:{unit:string;label:string;valueAt:number;surface:string},links:readonly EvidenceLink[],rel:DocumentRelations|null,opts:{currency:boolean;periodUnit:boolean;headingLine?:number|null;qk?:QuantityKnowledge;comparatives?:boolean}):EvidenceReading{
 // sentence boundaries ignore decimal points ("PM2.5", "104.8"): a stop followed by space and a capital or digit, or the end
 const end=o.valueAt+o.surface.length;const head0=o.label.slice(0,o.valueAt);let sentStart=0;for(const m of head0.matchAll(/[.!?]["')\]]?\s+(?=[A-Z0-9"'(£$€])/g))sentStart=m.index!+m[0].length;
 const tailEnd=o.label.slice(end).search(/[.!?]["')\]]?(?:\s+(?=[A-Z0-9"'(£$€])|\s*$)/);const sentence=o.label.slice(sentStart,end)+(tailEnd>=0?o.label.slice(end,end+tailEnd):o.label.slice(end));
 const before=o.label.slice(Math.max(0,o.valueAt-40),o.valueAt),after=o.label.slice(end,end+20);
 const perPeriod=opts.periodUnit||PER_PERIOD_AFTER.test(after);const calcLinks=links.filter(l=>l.role==='derived');
 // S93 it1: a statistic over a set (closed class of statistical operators) and a ratio derived from two values of one
 // quantity in the same sentence ("from 104.8 to 8.3 µg/m³, a 92% improvement") are calculations too
 const aggregate=AGGREGATE_BEFORE.test(before);
 const derivedRatio=!!opts.qk&&/%|percent/i.test(o.surface+' '+o.unit)&&(()=>{const prior=findQuantities(opts.qk!,o.label.slice(sentStart,o.valueAt)).filter(q=>(q.value!==null||q.low!==undefined)&&!/%|percent/i.test(q.surface));
  const kinds=prior.flatMap(q=>q.low!==undefined&&q.high!==undefined?[...q.unit.kinds,...q.unit.kinds]:q.unit.kinds);return kinds.some(k=>kinds.filter(x=>x===k).length>=2);})();
 const tableDerived=links.find(l=>l.relation==="table_derivation")??null;
 const comparative=!!opts.comparatives&&/%|percent/i.test(o.surface+' '+o.unit)&&(COMPARATIVE_AFTER.test(after)||COMPARATIVE_BEFORE.test(before));
 const output=!!tableDerived||comparative||GOVERNED_CALC.test(before)||aggregate||derivedRatio||(opts.currency||perPeriod)&&(isCalculationText1G(sentence)||calcLinks.length>0);
 const top=links.length?Math.min(...links.map(l=>l.rank)):Infinity;
 const localDecision=/^nearest:/.test(role.reason??'')?!(role.reason??'').replace(/^nearest:/,'').split('+').some(p=>/^(?:co_occurrence|bridge|table_link|table_structure|parallel_table|table_derivation|table_member):/.test(p)):/^evidence:/.test(role.reason??'');
 const structural=/(?:specification_|test_table|test_section|label_value_outside)/.test(role.reason??'')&&opts.headingLine!=null;
 const linked=links.filter(l=>l.rank===top).flatMap(l=>(l.statements??[]).map(s=>({...s,relation:l.relation})));
 // a decision resting on the table's own structure (heading, caption, labels) points to the line that announces it
 const tableStructural=!localDecision&&!linked.length&&links.some(l=>l.rank===top&&l.relation==='table_structure')&&opts.headingLine!=null;
 const statements=(structural&&localDecision)||tableStructural?[{locator:'section_heading',block:-1,sentence:null,relation:'structure',line:opts.headingLine}]:
  localDecision?[{locator:'own_sentence',block:-1,sentence:null,relation:'local'}]:linked;
 const publisherInputs=links.some(l=>l.role==='measured')||/\b(?:we|our|i|my)\b/i.test(sentence);
 const freq=(t:string)=>[...t.matchAll(new RegExp(FREQUENCY.source,'gi'))].map(m=>({kind:'frequency',text:m[0].trim()}));
 const assumptions=[...statedParameters1G(sentence).map(p=>({...p,from:'sentence' as const})),...freq(sentence).map(p=>({...p,from:'sentence' as const})),
  ...(rel?calcLinks.flatMap(l=>(l.statements??[]).flatMap(s=>statedParameters1G(rel.model.blocks[s.block]?.text??'').map(p=>({...p,from:'linked_statement' as const})))):[])]
  .filter(p=>p.kind==='tariff'||p.kind==='usage'||p.kind==='frequency').filter((p,i,a)=>a.findIndex(q=>q.text===p.text)===i);
 const r=role.value;const why=role.reason??'';
 if(r==='certified_or_quoted')return {provenance:'third_party',nature:'declared',statements,calculation:null,reason:why};
 if(r==='test_condition'||r==='programme_preset')return {provenance:'publisher',nature:'condition',statements,calculation:null,reason:why};
 if(output){const prov=r==='declared_spec'?'manufacturer':publisherInputs||r==='measured_result'||tableDerived?'publisher':'unresolved';
  // S94: a table derivation names its input cells; they are the calculation's inputs (and its stated assumptions)
  const tIn=(tableDerived?.statements??[]).filter(s=>s.block===-2&&s.text).map(s=>({kind:'input',text:s.text!,from:'table' as const}));
  return {provenance:prov,nature:'calculated',statements,calculation:{assumptions:[...assumptions,...tIn],inputsFromPublisher:publisherInputs||!!tableDerived,
   ...(tableDerived?{derivation:{kind:/\(([a-z_]+)/.exec(tableDerived.pointer)?.[1]??'table',formula:/\((?:[a-z_]+) (.+)\)$/.exec(tableDerived.pointer)?.[1]??null,inputs:tIn.map(i=>({text:i.text,role:'input'})),residual:null}}:{})},
   reason:'calculation_output:'+(tableDerived?'table_derivation:':comparative?'comparative:':'')+why};}
 if(r==='declared_spec')return {provenance:'manufacturer',nature:'declared',statements,calculation:null,reason:why};
 // a value decided only by calculation statements, and not their output, is not thereby a measurement
 const onlyCalc=/^nearest:/.test(why)&&why.replace(/^nearest:/,'').split('+').every(p=>p.endsWith(':derived'));
 if(r==='measured_result'&&onlyCalc)return {provenance:'publisher',nature:'unresolved',statements,calculation:null,reason:'calculation_context_not_output:'+why};
 if(r==='measured_result')return {provenance:'publisher',nature:'measured',statements,calculation:null,reason:why};
 return {provenance:'unresolved',nature:'unresolved',statements,calculation:null,reason:why};
}
/** S92 it1: the situation type of the value's clause (Friedrich et al. 2016, situation entity types), from grammar only:
 * an attributive measure phrase ("a 3L dust bag": the value modifies a noun) states a stable attribute of an object; an
 * episodic predicate (a finite past-tense verb, not passive, not under an auxiliary or a determiner: "it lasted 13
 * minutes") reports an event. English closed-class words only; no domain vocabulary. */
const AUX=/^(?:is|are|was|were|be|been|being|am|has|have|had|having|will|would|can|could|may|might|must|shall|should|do|does|did|get|gets)$/i;
const DET=/^(?:a|an|the|its|their|this|that|these|those|his|her|our|your|my|each|every|any|some|no)$/i;
const IRREGULAR_PAST=new Set(['took','ran','got','made','kept','went','did','came','left','held','found','felt','saw','heard','sat','stood','fell','rose','drew','gave','brought','caught','wrote','spent','sent','built','lost','won','grew','threw','drove','rode','slept','swept','spun','sank','shrank','stuck','struck','sold','told','paid','led','fed','fought','bought','thought','began','became','showed']);
const NOT_EVENT=new Set(['rated','claimed','advertised','listed','stated','quoted','equipped','designed','intended','priced','based','named','called','featured','included','supplied','powered','sized','shaped','related','dedicated','integrated','detailed','limited','attached','built-in']);
export function situationTypeOf(sentence:string,start:number,end:number):'attributive'|'episodic'|null{
 const after=sentence.slice(end);const before=sentence.slice(0,start);
 // the value modifies the next word: a noun phrase head follows directly (not a verb, preposition, conjunction or punctuation)
 const next=/^[\s-]*([A-Za-z][A-Za-z-]*)/.exec(after)?.[1]?.toLowerCase()??'';
 const FUNC=/^(?:of|in|on|at|for|to|from|by|with|and|or|but|than|per|vs|versus|which|that|when|while|before|after|is|are|was|were|it|its|as|so|into|over|under|between|across|during|while|without|on|off|up|down|each|a|the|more|less|this|those|these)$/;
 if(next&&!FUNC.test(next)&&!/(?:ed|ing|ly)$/.test(next)&&/^\s*(?:[-\s]?[A-Za-z])/.test(after)){const prev3=(before.toLowerCase().match(/[a-z(][a-z'-]*/g)??[]).slice(-3);
  if(prev3.some(w=>DET.test(w)||w==='with'||w==='('||w==='of')&&!prev3.some(w=>/ed$/.test(w)&&!NOT_EVENT.has(w)))return 'attributive';}
 // an episodic predicate in the value's clause
 const clause=(before.split(/[;:()]|,\s(?:but|while|whereas|and)\s|\b(?:but|while|whereas)\b/i).at(-1)??'')+' '+(after.split(/[;:()]|,\s|\b(?:but|while|whereas|which)\b/i)[0]??'');
 const toks=clause.toLowerCase().match(/[a-z][a-z'-]*/g)??[];
 for(let i=0;i<toks.length;i++){const w=toks[i],prev=toks[i-1]??'';
  const past=IRREGULAR_PAST.has(w)||(/^[a-z]{3,}ed$/.test(w)&&!NOT_EVENT.has(w));if(!past)continue;
  if(AUX.test(prev)||DET.test(prev))continue;return 'episodic';}
 return null;
}
/** S92: the role from the nearest evidence: the value's own clause and sentence (S91 positive evidence) and its document
 * links. A calculation from the publisher's own data keeps the publisher's provenance (measured, reason 'derived'). Opposite
 * roles at the same distance abstain; no evidence abstains. */
const LOCALITY_RANK:Record<number,number>={3:0,2:1,1:4};
export function roleFromLinks(ev:RoleEvidence,links:readonly EvidenceLink[]):{value:ObservationRole86c|null;reason:string|null}{
 if(ev.quoted)return {value:'certified_or_quoted',reason:'quoted'};
 if(ev.condition)return {value:'test_condition',reason:'condition'};
 const c=[...ev.measured.map(e=>({role:'measured',rank:LOCALITY_RANK[locality(e)],why:e})),...ev.declared.map(e=>({role:'declared',rank:LOCALITY_RANK[locality(e)],why:e})),
  ...links.map(l=>({role:l.role==='derived'?'measured':l.role,rank:l.rank,why:`${l.relation}:${l.scope}:${l.role}`}))];
 if(!c.length)return {value:'unresolved',reason:'no_positive_evidence'};
 const best=Math.min(...c.map(x=>x.rank));const top=c.filter(x=>x.rank===best);const roles=new Set(top.map(x=>x.role));
 if(roles.size>1)return {value:'unresolved',reason:'conflicting_evidence_at_rank_'+best+':'+top.map(x=>x.why).join('+')};
 return {value:[...roles][0]==='measured'?'measured_result':'declared_spec',reason:'nearest:'+top.map(x=>x.why).join('+')};
}

/** S90: the structural context of a value in reader block `bi` (textBlocks225 order, as Step 1D-A2 aligns it). The section
 * role comes from the heading path, innermost first, matched against the definitions' document-section cues (data). */
export function structuralContextOf(defs:PropertyDefinitions,sem:DocumentSemantics1D2,blockTexts:readonly string[],bi:number,valueStart:number):StructuralContext{
 const b=sem.blocks[bi];const cues=defs.pack.documentSections;
 const headings=(b?.headingPath??[]).map(i=>blockTexts[i]??'').filter(Boolean);
 let sectionRole:StructuralContext['sectionRole']=null;let section:string|null=headings.at(-1)??null;let headLine:number|null=null;
 const hp=(b?.headingPath??[]).filter(i=>blockTexts[i]);
 if(cues)for(const i of [...hp].reverse()){const h=blockTexts[i];const t=norm(h);
  if(cues.specification.some(c=>has(t,c))){sectionRole='specification';section=h;headLine=i;break;}
  if(cues.comparison.some(c=>has(t,c))){sectionRole='comparison';section=h;headLine=i;break;}
  if(cues.test.some(c=>has(t,c))){sectionRole='test';section=h;headLine=i;break;}}
 if(b?.cell){const t=sem.tables.find(x=>x.index===b.cell!.table);const cell=t?.cells.find(c=>c.blockIndex===bi);
  const label=[...(cell?.rowLabels??[]),...(cell?.colLabels??[])].filter(x=>x&&x.length<=80).join(' | ')||null;
  return {container:'table_cell',label,section,sectionRole,tableContext:t?.context??'unknown',sectionHeadingLine:headLine??(t?.headingBlock??null)};}
 const text=blockTexts[bi]??'';const lv=/^\s*([A-Za-z][^:\n]{1,48}):\s*/.exec(text);
 if(lv&&valueStart>=lv[0].length-1&&valueStart<=lv[0].length+40)return {container:'label_value',label:lv[1].trim(),section,sectionRole,tableContext:null,sectionHeadingLine:headLine};
 return {container:'prose',label:null,section,sectionRole,tableContext:null,sectionHeadingLine:headLine};
}
/** S91: the documentary context of a value — structural label, container, section and its role, table context, methodology
 * section, page type — one object carried to the definitions (owner review of S90). */
export function documentContextOf(defs:PropertyDefinitions,sem:DocumentSemantics1D2,blockTexts:readonly string[],bi:number,valueStart:number,
 relations?:{rel:DocumentRelations;surface:string;value:number|null;use?:{tables?:boolean;prose?:boolean}}):StructuralContext{
 const base=structuralContextOf(defs,sem,blockTexts,bi,valueStart);const b=sem.blocks[bi];
 const ctx:StructuralContext={...base,methodSection:b?.sectionRole==='methodology'||(b?.sectionRole==='test_results'&&base.sectionRole===null)?true:false,pageType:sem.pageType?.kind??null,
  documentTests:blockTexts.some(t=>TEST_CONTEXT272.test(t))};
 // S92: document-level relations of the value, when the caller supplies the page-level readings
 if(relations)ctx.links=evidenceLinksOf(relations.rel,blockTexts[bi]??'',valueStart,relations.surface,relations.value,base.container,relations.use);
 return ctx;
}
/** S91: who states a value, from cues in its own clause: the manufacturer (declared), the publisher's own testing (first-person
 * test context or a measuring verb), or nobody identifiable. Positive evidence only; no default. */
export interface RoleEvidence {measured:string[];declared:string[];quoted:boolean;condition:boolean}
export function roleEvidence(structure:StructuralContext|null|undefined,sentence:{role:ObservationRole86c;reason:string}|null,clause:string,sentenceText:string,declarationCues:readonly string[],k:{measurementCues?:readonly string[];instrument?:ConditionDimension|null;setting?:ConditionDimension|null;procedure?:readonly ConditionDimension[]}={}):RoleEvidence{
 const ev:RoleEvidence={measured:[],declared:[],quoted:sentence?.role==='certified_or_quoted',condition:sentence?.role==='test_condition'||sentence?.role==='programme_preset'};
 const firstPerson=/\b(?:i|we|my|our|us)\b/i;
 if(sentence?.role==='measured_result'&&sentence.reason==='measuring_verb')ev.measured.push('measuring_verb');
 if(TEST_CONTEXT272.test(clause))ev.measured.push('test_context_in_clause');else if(TEST_CONTEXT272.test(sentenceText))ev.measured.push('test_context_in_sentence');
 if(structure?.tableContext==='test')ev.measured.push('test_table');
 if((structure?.sectionRole==='test'||structure?.methodSection)&&firstPerson.test(sentenceText))ev.measured.push('test_section_first_person');
 const st=norm(sentenceText),cl=norm(clause);
 // an instrument of the definitions' instrument dimension named in the value's sentence
 if(k.instrument&&(Object.values(k.instrument.values).flat().some(v=>has(st,v))||k.instrument.cues.some(c=>has(st,c))))ev.measured.push('instrument_in_sentence');
 // a verb reporting what the product did in use, in the value's clause
 const ov=(k.measurementCues??[]).find(c=>has(cl,c));if(ov)ev.measured.push('observation_verb:'+ov);
 // a document that reports its own testing, and a value stated under a specific operating setting
 if(structure?.documentTests&&k.setting&&Object.values(k.setting.values).flat().some(v=>has(cl,v)))ev.measured.push('tested_document_setting');
 // in a test section, a condition of a measurement procedure (tolerance, distance) stated in the clause
 if((structure?.sectionRole==='test'||structure?.methodSection)&&(k.procedure??[]).some(dm=>Object.values(dm.values).flat().some(v=>has(cl,v))))ev.measured.push('test_section_procedure_condition');
 if(sentence?.role==='declared_spec')ev.declared.push('declaration_cue:'+sentence.reason);
 if(structure&&structure.container!=='prose'&&(structure.tableContext==='specification'||structure.sectionRole==='specification'))ev.declared.push('specification_'+structure.container);
 if(structure?.container==='label_value'&&structure.sectionRole!=='test'&&!structure.methodSection)ev.declared.push('label_value_outside_tests');
 const decl=declarationCues.find(c=>has(norm(clause),c));if(decl&&!ev.measured.includes('measuring_verb'))ev.declared.push('clause:'+decl);
 return ev;
}
/** S91: the role from positive evidence. Quoted and test conditions keep the sentence's reading; otherwise the class with
 * evidence wins, a measuring verb or first-person test context outweighing a generic capability cue; without evidence the
 * role stays unresolved (an abstention, never "measured by default"). */
/** Locality of each kind of evidence: the clause (3) outranks the sentence or the structure around the value (2), which
 * outranks the section or the document (1). */
const LOCALITY:Record<string,number>={situation_episodic:2,situation_attributive:2,measuring_verb:3,observation_verb:3,test_context_in_clause:3,instrument_in_sentence:2,test_context_in_sentence:2,test_table:2,
 test_section_first_person:1,tested_document_setting:1,test_section_procedure_condition:1,declaration_cue:3,clause:3,specification_table_cell:2,specification_label_value:2,label_value_outside_tests:1};
const locality=(e:string)=>LOCALITY[e.split(':')[0]]??1;
export function roleFromEvidence(ev:RoleEvidence):{value:ObservationRole86c|null;reason:string|null}{
 if(ev.quoted)return {value:'certified_or_quoted',reason:'quoted'};
 if(ev.condition)return {value:'test_condition',reason:'condition'};
 const m=Math.max(0,...ev.measured.map(locality)),d=Math.max(0,...ev.declared.map(locality));
 if(m>d)return {value:'measured_result',reason:'evidence:'+ev.measured.join('+')+(d?' over '+ev.declared.join('+'):'')};
 if(d>m)return {value:'declared_spec',reason:'evidence:'+ev.declared.join('+')+(m?' over '+ev.measured.join('+'):'')};
 return {value:'unresolved',reason:m?'conflicting_evidence_same_locality':'no_positive_evidence'};
}
/** S90: the evidence role inherited from structure first, then the sentence (S86c). Kept for reproduction of S90 runs. */
export function roleFrom(structure:StructuralContext|null|undefined,sentence:{role:ObservationRole86c;reason:string}|null,clause?:{text:string;declarationCues:readonly string[]}):{value:ObservationRole86c|null;reason:string|null}{
 const st=structure;const sr=sentence;
 // a clause that attributes a capability to the product without a measuring verb declares it
 const declClause=!!clause&&sr?.role==='measured_result'&&sr.reason==='no_other_role'&&clause.declarationCues.some(c=>has(norm(clause.text),c));
 if(st){
  const declared=st.tableContext==='specification'||st.sectionRole==='specification';
  const tested=st.tableContext==='test'||st.sectionRole==='test';
  if(st.container!=='prose'){
   if(sr&&(sr.role==='certified_or_quoted'||sr.role==='test_condition'))return {value:sr.role,reason:'sentence:'+sr.reason};
   if(declared&&!tested)return {value:'declared_spec',reason:'structure:specification_'+st.container};
   if(tested)return {value:'measured_result',reason:'structure:test_'+st.container};
   if(st.container==='label_value')return {value:'declared_spec',reason:'structure:label_value_outside_tests'};}
  if(sr&&sr.role==='measured_result'&&sr.reason==='no_other_role'&&declared)return {value:'declared_spec',reason:'structure:specification_section'};
  if(sr&&sr.role==='unresolved'&&sr.reason==='approximate_value'&&tested)return {value:'measured_result',reason:'structure:approximate_in_test_section'};}
 if(declClause&&st?.sectionRole!=='test')return {value:'declared_spec',reason:'clause:declaration_cue'};
 if(declClause&&!st)return {value:'declared_spec',reason:'clause:declaration_cue'};
 return sr?{value:sr.role,reason:sr.reason}:{value:null,reason:null};
}

const norm=(s:string|null|undefined)=>normText(String(s??'').replace(/_/g,' '));
const has=(text:string,phrase:string)=>!!text&&hasPhrase(text,phrase);
const PERIOD_RE=/^(.+?)\s*(?:\/|\bper\b|\ba\b)\s*(?:yr|year|annum|month|mo|week|wk|day)$/;
const unitClass=(defs:PropertyDefinitions,unit:string):'currency'|'currency_per_energy'|null=>{const u=norm(unit);if(!u)return null;
 if(defs.pack.nonQkUnitForms.currency_per_energy.some(f=>u===f||u.endsWith(f)))return 'currency_per_energy';
 const head=PERIOD_RE.exec(u)?.[1]??u;
 if(defs.pack.nonQkUnitForms.currency.some(f=>head===f))return 'currency';return null;};
/** A currency unit carrying a period ("GBP/yr") states a per_period basis. */
const unitPeriod=(unit:string)=>PERIOD_RE.test(norm(unit));

/** Quantity kinds the value's unit admits, narrowed by the pack's own typing of its labels (reuse of quantity knowledge). */
export function kindsOf(qk:QuantityKnowledge,o:{value:number|null;unit:string;label?:string|null;context?:string|null}):{kind:string|null;candidates:string[]}{
 const p=parseUnit(qk,String(o.unit??'').trim());if(!p)return {kind:null,candidates:[]};
 const tq=typeQuantity(qk,{surface:`${o.value??''} ${o.unit}`.trim(),value:o.value,unit:p},{labels:o.label?[o.label]:[],context:o.context?[o.context]:[]});
 return {kind:tq.kind.id,candidates:tq.kind.id?[tq.kind.id]:[...tq.kind.candidates]};
}

/** S89: the label as the value's own words: when the value's offset is known, keep only the span between the numbers that
 * neighbour it (a term attaches to the nearest number, DocRED/SciREX-style local association). */
export function ownWords(label:string,valueAt:number|null|undefined,qk?:QuantityKnowledge):string{
 if(valueAt==null||valueAt<0||valueAt>label.length)return label;
 // neighbours are other QUANTITIES (a number with a unit the pack knows), not any digit ("4K" is a word)
 const found=qk?findQuantities(qk,label):null;
 const all=found?found.map(q=>[q.start,q.end,q.unit.kinds] as const):[...label.matchAll(/\d+(?:[.,]\d+)?/g)].map(m=>[m.index!,m.index!+m[0].length,[] as string[]] as const);
 const self0=all.find(([a,b])=>a<=valueAt&&valueAt<b)??all.find(([a])=>a>=valueAt);
 if(!self0)return label;
 // S100 (rule audit, S89 rule too strict): a term belongs to the nearest value OF ITS KIND; a quantity of another kind between
 // them ("took the room from 500 µg/m³ to 5 µg/m³ in 27 minutes") does not take the term away
 const kinds=new Set(self0[2]);const nums=all.filter(n=>n===self0||!kinds.size||!n[2].length||n[2].some(k=>kinds.has(k))).map(n=>[n[0],n[1]] as const);
 const self=[self0[0],self0[1]] as const;
 const before=nums.filter(([,b])=>b<=self[0]).at(-1),after=nums.find(([a])=>a>=self[1]);
 // words between two quantities: a value owns the words after it up to the first clause break, and the words before it back
 // to the last clause break; without a break the gap is split at its midpoint
 const BREAK=/[,;:()\[\]–—]|\b(?:and|but|while|whereas|with|than|versus|vs|had|has|was|were|is|are|which|compared)\b/gi;
 const cutIn=(a:number,b:number,last:boolean)=>{const seg=label.slice(a,b);const ms=[...seg.matchAll(BREAK)];if(!ms.length)return Math.round((a+b)/2);
  const m=last?ms.at(-1)!:ms[0]!;return a+m.index!+(last?m[0].length:0);};
 const from=before?cutIn(before[1],self[0],true):0,to=after?cutIn(self[1],after[0],false):label.length;
 return label.slice(from,to);
}
function termScore(d:PropertyDefinition,qk:QuantityKnowledge,label:string,context:string,inProfile=false,sentence:string|null=null):{score:number;evidence:string[]}{
 const terms:[string,number][]=d.surface.map(([t,s])=>[t,s==='candidate'?0.5:1]);
 if(d.quantity?.metric)for(const t of qk.metrics.get(d.quantity.metric)?.terms??[])terms.push([t,1]);
 for(const n of d.quantity?.countNouns??[])terms.push([n,1]);
 let score=0;const ev:string[]=[];
 // fix1: a candidate (generic) term supports the property only together with a noun naming its object of interest
 const objectNamed=!d.objectNouns?.length||d.objectNouns.some(n=>has(label,n)||has(context,n));
 // outside a profile that lists the property, the object must be named for any term (the category does not supply it)
 // S98 (with sentence object evidence): a stated object disambiguates and excludes; it does not oblige the page to name it
 // when a definite term of the property (weight 1: its own or its QK metric's term) is used. Generic candidate terms still
 // need the object (fix1, below)
 if(!objectNamed&&!inProfile&&sentence===null)return {score:0,evidence:[]};
 const ownObject=!!d.objectNouns?.length&&d.objectNouns.some(n=>has(label,n)||(sentence!==null&&has(sentence,n)));
 // S89: support from the wider context alone needs the property's object in the value's own words
 for(const [t,w] of terms){if(w<1&&!objectNamed)continue;if(has(label,t)){score+=2*w;ev.push('label:'+t);}else if(has(context,t)&&(ownObject||!d.objectNouns?.length&&!inProfile)){score+=w;ev.push('context:'+t);}}
 return {score,evidence:ev};
}

/** Attribution: the defined property a value reports. A unit kind alone only nominates candidates; a surface term of the
 * definition in the value's own label or context must support the choice. Equal support for two properties chooses neither. */
/** opts.profileLicense (S89: default false; true only reproduces the refuted S88 dev rule): a profile listing one property for the unit kind attributes
 * without a term. E4 showed it is valid only for values already known to be results (it attributed every length on a robot page). */
export function attributeProperty(defs:PropertyDefinitions,qk:QuantityKnowledge,o:ObservationInput,opts:{profileLicense?:boolean;
 /** S93 (owner review of S92: "autonomia con una carica" vs "durata di un'attività"): a property is its quantity AND its
  * object of interest (I-ADOPT). When the term chosen belongs to a property whose object the definitions leave generic,
  * and the value's sentence or its document frame names the object of another property of the same kind, the object
  * decides. No vocabulary is added: only the definitions' objects. */
 objectResolution?:boolean;
 /** S96 it1: the value's own words name one of the definition's own surface terms ("a 240Hz refresh rate"): the object
  * named in the sentence is then this concept's, not another concept's (the known-object block guards definitions the
  * value does not name). Off by default. */
 ownTermObject?:boolean;
 /** S97 C3 (counterfactual, shadow): a definition whose stated object nouns the value's sentence names owns that object
  * (the known-object block does not reject it), and when no term decides, the single admissible definition of the unit's
  * kind whose object the sentence names is inferred (rule object_licence). Off by default. */
 objectLicence?:boolean;
 /** S98 (owner decision: fix the S89 object conflicts at their cause): a definition that STATES its object nouns may take
  * them from the value's sentence, not only from its own words, both against the known-object block and for the support of
  * its terms (termScore). Definitions without stated objects are unchanged; an unstated object is never inferred. */
 objectInSentence?:boolean}={}):PropertySlot{
 const sl=o.structure?.label?norm(o.structure.label)+' | ':'';const fullLabel=sl+norm(o.label);const label=sl+norm(ownWords(String(o.label??''),o.valueAt,qk)),context=norm(o.context);const cls=unitClass(defs,o.unit);const kk=cls?{kind:null,candidates:[]}:kindsOf(qk,o);
 const pool=applicableProperties(defs,o.category);
 const unitNoun=norm(o.unit);
 const byUnit=pool.filter(d=>d.form==='quantity'&&(cls?d.quantity!.nonQkUnits?.includes(cls):(kk.candidates.some(k=>d.quantity!.kinds.includes(k))||(d.quantity!.countNouns??[]).some(n=>unitNoun===n))));
 const kind=kk.kind??(kk.candidates.length===1?kk.candidates[0]:null);
 if(!byUnit.length)return {value:null,state:'unknown',evidence:[],rule:kk.candidates.length||cls?'no_definition_admits_unit_kind':'unit_not_typed',alternatives:[],kind};
 const prof=o.category?defs.profiles.get(o.category):undefined;
 // S89: the value's own words name an object of another concept (and none of this property's object nouns): not this property
 // the value's own sentence (not the whole window) decides whether it names another concept's object
 const raw=String(o.label??'');const at=o.valueAt??-1;
 const sentence=at>=0?norm(raw.slice(Math.max(0,raw.slice(0,at).search(/[^.!?]*$/)),at+(raw.slice(at).search(/[.!?](\s|$)/)+1||raw.length-at))):fullLabel;
 // S100 (rule audit: the veto read the whole sentence while its exemption read only the value's words): another concept's
 // object vetoes a property only when it is named in the value's own CLAUSE ("in off mode it draws 0.5 W" names no object of
 // the power value; "the remote's 1.5 m cable" does)
 const clause=(()=>{if(at<0)return fullLabel;const ss=Math.max(0,raw.slice(0,at).search(/[^.!?]*$/));const sent=raw.slice(ss);const p=at-ss;
  const head=sent.slice(0,p).split(/[;:()–—]|,\s|\b(?:but|while|whereas|although)\b/i).at(-1)??'';const tail=sent.slice(p).split(/[;:()–—]|[.!?](?:\s|$)|,\s|\b(?:but|while|whereas|although|which)\b/i)[0]??'';
  return norm(head+tail);})();
 const otherObjects=(defs.pack.knownObjects?.objects??[]).filter(k=>k.nouns.some(n=>has(clause,n))).map(k=>k.id);
 const qkCompetitors=[...qk.metrics.values()].filter(m=>kk.candidates.includes(m.kind)&&m.terms.some(t=>has(label,t)));
 const subsumes=(d:PropertyDefinition,m:string)=>d.quantity?.metric===m||(d.quantity?.relatedMetrics??[]).includes(m);
 const si=(()=>{const p=parseUnit(qk,String(o.unit??'').trim());return p&&o.value!==null?o.value*p.factor+(p.offset??0):null;})();
 const admissible=(d:PropertyDefinition)=>{
  if(d.plausibleSi&&si!==null&&(si<d.plausibleSi[0]||si>d.plausibleSi[1]))return false;
  const ownObject=(d.objectNouns??[]).some(n=>has(label,n))||(opts.ownTermObject===true&&d.surface.some(([t])=>has(label,norm(t))))||(opts.objectLicence===true&&(d.objectNouns??[]).some(n=>has(sentence,n)));
  // S98: sentence-level object evidence lifts only the known-object block; overriding a competing metric that the value's
  // own words name still needs the object in those own words
  const ownObjectInSentence=ownObject||(opts.objectInSentence===true&&(d.objectNouns??[]).some(n=>has(sentence,n)));
  if(otherObjects.length&&!ownObjectInSentence)return false;
  if(qkCompetitors.some(m=>!subsumes(d,m.id))&&!qkCompetitors.some(m=>subsumes(d,m.id))&&!ownObject)return false;
  return true;};
 // S90: a value that bounds the range of a DIFFERENT quantity just before it ("+8 dB from 200 Hz to 10 kHz") is that
 // quantity's band (its condition), not a result of its own
 if(at>0){const before=raw.slice(Math.max(0,at-60),at);const m=/(?:from|between|over)\s+(?:[\d.,]+\s*[^\s\d]+\s+(?:to|and|–|-)\s+)?$/i.exec(before);
  if(m){const prev=findQuantities(qk,before.slice(0,m.index)).at(-1);if(prev&&!prev.unit.kinds.some(k=>kk.candidates.includes(k)))
   return {value:null,state:'unknown',evidence:[],rule:'band_of_another_measurement',alternatives:byUnit.map(d=>d.id),kind};}}
 const rejected=byUnit.filter(d=>!admissible(d)).map(d=>d.id);
 const scored=byUnit.filter(admissible).map(d=>({d,...termScore(d,qk,label,context,!!prof?.properties.includes(d.id),opts.objectInSentence===true?sentence:null)})).sort((a,b)=>b.score-a.score||a.d.id.localeCompare(b.d.id));
 if(!scored.length)return {value:null,state:'unknown',evidence:[],rule:'value_names_another_concept_or_outside_plausible_range',alternatives:rejected,kind};
 const top=scored[0];
 if(top.score<=0){
  // the category profile licenses a unit-kind attribution when it lists exactly one property admitting the unit
  if(opts.objectLicence===true){const own=byUnit.filter(admissible).filter(d=>(d.objectNouns??[]).some(n=>has(sentence,n)));
   if(own.length===1)return {value:own[0].id,state:'inferred',evidence:['object:'+(own[0].objectNouns??[]).find(n=>has(sentence,n))],rule:'object_licence',alternatives:byUnit.filter(d=>d!==own[0]).map(d=>d.id),kind};}
  if(opts.profileLicense===true&&byUnit.length===1&&o.category&&defs.profiles.get(o.category)?.properties.includes(byUnit[0].id))
   return {value:byUnit[0].id,state:'inferred',evidence:['profile:'+o.category],rule:'profile_single_property_for_unit_kind',alternatives:[],kind};
  return {value:null,state:'unknown',evidence:[],rule:'unit_kind_without_supporting_term',alternatives:byUnit.map(d=>d.id),kind};}
 const tied=scored.filter(s=>s.score===top.score);
 // S93: lexical specificity: when one candidate's matched term contains every other candidate's matched term ("charging
 // time" over "time"), the more specific (narrower) term decides
 if(tied.length>1){const terms=(t:typeof tied[number])=>t.evidence.filter(e=>e.startsWith('label:')).map(e=>e.slice(6));
  const spec=tied.filter(t=>tied.every(u=>u===t||terms(u).every(x=>terms(t).some(y=>y!==x&&has(y,x)))));
  if(spec.length===1)return {value:spec[0].d.id,state:'stated',evidence:[...spec[0].evidence,'narrower_term'],rule:'most_specific_term',alternatives:tied.filter(t=>t!==spec[0]).map(t=>t.d.id),kind};
  return {value:null,state:'ambiguous',evidence:tied.flatMap(t=>t.evidence),rule:'equal_support',alternatives:tied.map(t=>t.d.id),kind};}
 if(opts.objectResolution){const frame=norm(o.frame);const objEv=(d:PropertyDefinition)=>(d.objectNouns??[]).some(n=>has(sentence,n))?2:(d.objectNouns??[]).some(n=>has(frame,n))?1:0;
  if(!(top.d.objectNouns??[]).length&&objEv(top.d)===0){const sameKind=byUnit.filter(admissible).filter(d=>d!==top.d&&d.quantity?.kinds.some(k=>top.d.quantity?.kinds.includes(k))&&objEv(d)>0).sort((a,b)=>objEv(b)-objEv(a));
   if(sameKind.length&&(sameKind.length===1||objEv(sameKind[0])>objEv(sameKind[1]))){const p=sameKind[0];const noun=(p.objectNouns??[]).find(n=>has(sentence,n)||has(frame,n));
    return {value:p.id,state:'inferred',evidence:[...top.evidence,'object:'+noun+(objEv(p)===2?'@sentence':'@frame')],rule:'object_of_the_value',alternatives:[top.d.id],kind};}}}
 return {value:top.d.id,state:top.evidence.some(e=>e.startsWith('label:'))?'stated':'inferred',evidence:top.evidence,rule:top.evidence.some(e=>e.startsWith('label:'))?null:'term_in_context_only',alternatives:scored.slice(1).filter(s=>s.score>0).map(s=>s.d.id),kind};
}

/** Type one condition text to a dimension: a value phrase first, then a dimension cue, then a quantity of the dimension's kind.
 * Dimensions relevant to the property are tried first; any shared dimension may type it. */
export function typeCondition(defs:PropertyDefinitions,qk:QuantityKnowledge,text:string,property?:string|null,category?:string|null):{dimension:ConditionDimension;value:string|null;via:'value'|'cue'|'quantity'}|null{
 const t=norm(text);if(!t)return null;
 const dims=[...defs.dimensions.values()];
 // fix1: the head noun decides the dimension ("standard test load" is a load, whatever value word precedes it)
 const head=t.replace(/[^a-z ]/g,' ').trim().split(/\s+/).at(-1)??'';
 const headDim=head.length>2?dims.find(d=>d.cues.some(c=>c===head||c.split(' ').at(-1)===head)):undefined;
 if(headDim){const v=Object.entries(headDim.values).find(([,ph])=>ph.some(p=>has(t,p)));return {dimension:headDim,value:v?.[0]??null,via:v?'value':'cue'};}
 const rel=(d:ConditionDimension)=>property?relevanceOf(defs,property,d.id,category):'irrelevant';
 const order=(d:ConditionDimension)=>({defining:0,influencing:1,irrelevant:2}[rel(d)]);
 const ranked=[...dims].sort((a,b)=>order(a)-order(b));
 for(const d of ranked)for(const [v,ph] of Object.entries(d.values))if(ph.some(p=>has(t,p)))return {dimension:d,value:v,via:'value'};
 const qs=findQuantities(qk,t);
 for(const d of ranked){const kinds=d.valueKinds??(d.qkAxis?[qk.axes.get(d.qkAxis)?.valueKind].filter((x):x is string=>!!x):[]);
  if(kinds.length&&qs.some(q=>q.unit.kinds.some(k=>kinds.includes(k)))&&(d.cues.some(c=>has(t,c))||qs.length===1&&t.replace(/[\d.,\s]+/g,'').length<=12))return {dimension:d,value:qs[0].surface,via:'quantity'};}
 for(const d of ranked)if(d.cues.some(c=>has(t,c)))return {dimension:d,value:null,via:'cue'};
 return null;
}

const RELATIONAL=new Set(['comparison_or_basis','procedure_state','identity']);
/** S88 it1: layered condition typing. Structure comes from the category-free S87b principles (relation before object: a
 * comparison, a procedure state or an identity statement is a relation, whatever setting it mentions); the dimension, its
 * value and relevance come from the definitions. Either layer may type a condition the other cannot. */
export function classifyConditionWithDefinitions(defs:PropertyDefinitions,qk:QuantityKnowledge,text:string,measuredKind:string|null,property?:string|null,category?:string|null):
 {structure:string|null;dimension:ConditionDimension|null;value:string|null;relational:boolean;via:string|null;kind?:string|null}{
 const s=classifyCondition87(qk,String(text).replace(/_/g,' '),measuredKind);const d=typeCondition(defs,qk,text,property,category);
 const cls=s.class==='unclassified'?null:s.class;
 if(cls&&RELATIONAL.has(cls))return {structure:cls,dimension:d?.dimension??null,value:d?.via==='value'?d.value:null,relational:true,via:'structure'};
 if(cls)return {structure:cls==='quantity'?'quantity':cls,dimension:d?.dimension??null,value:d?.value??null,relational:false,via:d?'both':'structure',kind:s.kind};
 return {structure:d?.dimension.structure??null,dimension:d?.dimension??null,value:d?.value??null,relational:false,via:d?'definitions':null};
}

/** The basis slot: stated by words or by the unit's kind; otherwise the definition's default as an inferred slot, only when a
 * run, programme or task is named; otherwise unknown. Intensive properties (no basis in the definition) have none. */
export function basisOf(defs:PropertyDefinitions,d:PropertyDefinition|null,kind:string|null,label:string,context:string,namedRun:boolean):BasisSlot{
 const c=defs.pack.basisCues;const text=label+' | '+context;
 for(const b of ['per_run','per_period','per_hour','per_unit'] as const){const w=c[b].find(x=>has(text,x));if(w)return {value:b,state:'stated',evidence:w,rule:null};}
 // 'per' + up to two words + a run noun ("per completed task") states the run as the basis
 const perRun=new RegExp('\\bper (?:\\w+ ){0,2}(?:'+c.runNamed.map(w=>w.replace(/[^a-z ]/g,'')).join('|')+')s?\\b').exec(text);
 if(perRun)return {value:'per_run',state:'stated',evidence:perRun[0],rule:null};
 if(kind==='energy_per_event'||kind==='volume_per_event')return {value:'per_run',state:'stated',evidence:'unit:'+kind,rule:null};
 if(kind?.startsWith('periodic_'))return {value:'per_period',state:'stated',evidence:'unit:'+kind,rule:null};
 if(!d)return {value:null,state:'unknown',evidence:null,rule:null};
 if(!d.basis)return {value:'none',state:'inferred',evidence:null,rule:'definition_is_intensive'};
 if(d.basis.default==='per_run'&&(namedRun||d.basis.when==='always'))return {value:'per_run',state:'inferred',evidence:null,rule:d.basis.rule};
 return {value:null,state:'unknown',evidence:null,rule:'basis_not_stated_and_no_run_named'};
}

/** Interpret one observation with the definitions: attribution, conditions with relevance, missing defining dimensions, basis. */
export function interpretWithDefinitions(defs:PropertyDefinitions,qk:QuantityKnowledge,o:ObservationInput,opts:{profileLicense?:boolean;roleModel?:'s90'|'evidence'|'links';
 /** S92 it1: add the grammatical situation type of the value's clause as sentence-level evidence */
 situation?:boolean;
 /** S93: report provenance and nature separately (needs roleModel 'links'); `relations` gives the page model for assumptions */
 provenance?:boolean;relations?:DocumentRelations|null;
 /** S94 (arm T1c): comparative constructions state relative differences */ comparatives?:boolean;
 /** S93: the object of the value decides between same-kind properties (see attributeProperty) */
 objectResolution?:boolean}={}):DefinitionInterpretation{
 const category=o.category??null;const label=norm(o.label),context=norm(o.context);
 const property=attributeProperty(defs,qk,o,opts);const d=property.value?defs.properties.get(property.value)!:null;
 const readings:DimensionReading[]=[];const untyped:string[]=[];
 for(const c of o.conditions??[]){const r=classifyConditionWithDefinitions(defs,qk,c,property.kind,d?.id,category);
  if(!r.structure){untyped.push(norm(c));continue;}
  readings.push({dimension:r.dimension?.id??null,structure:r.structure,value:r.value,state:'stated',relevance:d&&r.dimension&&!r.relational?relevanceOf(defs,d.id,r.dimension.id,category):null,evidence:norm(c),from:'condition',relational:r.relational});}
 // dimensions of the property stated in the value's own label or context (value phrases only: a cue alone states no value)
 if(d)for(const [dimId] of d.conditions){if(readings.some(r=>r.dimension===dimId))continue;const dim=defs.dimensions.get(dimId)!;
  for(const [src,text] of [['label',label],['context',context]] as const){const hit=Object.entries(dim.values).find(([,ph])=>ph.some(p=>has(text,p)));
   if(hit){readings.push({dimension:dimId,structure:dim.structure,value:hit[0],state:'stated',relevance:relevanceOf(defs,d.id,dimId,category),evidence:hit[1].find(p=>has(text,p))!,from:src});break;}}}
 const runWords=defs.pack.basisCues.runNamed;
 const namedRun=readings.some(r=>!!r.dimension&&['programme','soil_or_task','load','end_point'].includes(r.dimension)&&r.value!==null)||runWords.some(w=>has(label,w)||has(context,w))||(o.conditions??[]).some(c=>runWords.some(w=>has(norm(c),w)));
 const basis0=basisOf(defs,d,property.kind,label,context,namedRun);
 const basis:BasisSlot=basis0.state!=='stated'&&unitPeriod(o.unit)?{value:'per_period',state:'stated',evidence:'unit:'+o.unit,rule:null}:basis0;
 if(d)for(const r of readings)if(r.dimension&&!r.relational)r.relevance=relevanceOf(defs,d.id,r.dimension,category,basis.value);
 const missingDefining=d?d.conditions.map(([x])=>x).filter(x=>relevanceOf(defs,d.id,x,category,basis.value)==='defining'&&!readings.some(r=>r.dimension===x&&r.value!==null&&!r.relational)):[];
 let role:{value:ObservationRole86c|null;reason:string|null}={value:null,reason:null};let subject:'page_product'|'other_product'|'unresolved'='unresolved';
 if(o.valueAt!=null&&o.label){const end=o.valueAt+String(o.surface??o.value??'').length;const r=observationRole86c(o.label,o.valueAt,end,property.kind??'');const head=o.label.slice(0,o.valueAt).split(/[.!?;]\s/).at(-1)??'';
  if(opts.roleModel==='s90')role=roleFrom(o.structure,r,{text:head,declarationCues:defs.pack.evidenceCues?.declaration??[]});
  else{const tail=o.label.slice(end).split(/[.!?;]\s/)[0]??'';const clauseHead=head.split(/[,;()–—]|\b(?:but|while|whereas|than)\b/i).at(-1)??head;
   const clause=clauseHead+o.label.slice(o.valueAt,end)+(tail.split(/[,;()–—]|\b(?:but|while|whereas|than)\b/i)[0]??'');
   const ev=roleEvidence(o.structure,r,clause,head+o.label.slice(o.valueAt,end)+tail,defs.pack.evidenceCues?.declaration??[],
    {measurementCues:defs.pack.evidenceCues?.measurement??[],instrument:defs.dimensions.get('instrument')??null,setting:defs.dimensions.get('operating_setting')??null,
     procedure:['response_tolerance','measurement_distance','acoustic_quantity'].map(x=>defs.dimensions.get(x)).filter((x):x is ConditionDimension=>!!x)});
   if(opts.roleModel==='links'&&opts.situation){const sentStart=o.label.slice(0,o.valueAt).search(/[^.!?]*$/);const sent=o.label.slice(sentStart);const stp=situationTypeOf(sent.split(/[.!?]\s/).slice(0,1).join('')||sent,o.valueAt-sentStart,end-sentStart);
    if(stp==='episodic')ev.measured.push('situation_episodic');if(stp==='attributive')ev.declared.push('situation_attributive');}
   role=opts.roleModel==='links'?roleFromLinks(ev,o.structure?.links??[]):roleFromEvidence(ev);}
  subject=otherProductInClause86c(o.label,o.valueAt,end,o.pageSubject??null)?'other_product':o.pageSubject?'page_product':'unresolved';}
 let evidence:EvidenceReading|undefined;
 if(opts.provenance&&opts.roleModel==='links'&&o.valueAt!=null&&o.label)evidence=provenanceAndNature(role,{unit:o.unit,label:o.label,valueAt:o.valueAt,surface:String(o.surface??o.value??'')},o.structure?.links??[],opts.relations??null,
  {currency:unitClass(defs,o.unit)!==null,periodUnit:unitPeriod(o.unit)||basis.value==='per_period',headingLine:o.structure?.sectionHeadingLine??null,qk,comparatives:opts.comparatives});
 if(evidence&&opts.relations?.tableRelations){const rs=rowSubjectOf(opts.relations,o.block??o.label??"");evidence.subject=rs?{value:rs.subject,label:rs.label}:null;}
 return {version:DEFINITION_INTERPRETER_VERSION,definitions:defs.identity,category,property,conditions:readings,missingDefining,untyped,basis,role,subject,evidence,
  object:d?{value:d.object,state:'inferred',rule:'definition_object_of_interest'}:{value:null,state:'unknown',rule:null}};
}

export type Q1Verdict='comparable'|'comparable_within_source'|'conditions_unestablished'|'not_comparable'|'different_property'|'undetermined';
/** Q1 (protocol comparability) of two interpreted observations, from the dimensions the definition says DEFINE the
 * measurand. A differing influencing dimension is a caveat, never a refusal. Values of one source under one protocol
 * compare within that source even when it leaves defining conditions unstated. */
export function compareByDefinition(defs:PropertyDefinitions,a:DefinitionInterpretation,b:DefinitionInterpretation,opts:{sameSourceProtocol?:boolean}={}):{verdict:Q1Verdict;reasons:string[];caveats:string[]}{
 if(!a.property.value||!b.property.value)return {verdict:'undetermined',reasons:['property_not_attributed'],caveats:[]};
 if(a.property.value!==b.property.value)return {verdict:'different_property',reasons:[a.property.value+'≠'+b.property.value],caveats:[]};
 const p=a.property.value;const cat=a.category??b.category;const basis=a.basis.value??b.basis.value;const reasons:string[]=[];const caveats:string[]=[];let unknown=false;
 if(a.basis.value&&b.basis.value&&a.basis.value!==b.basis.value)return {verdict:'not_comparable',reasons:['basis '+a.basis.value+'≠'+b.basis.value],caveats};
 for(const [dim] of defs.properties.get(p)!.conditions){const r=relevanceOf(defs,p,dim,cat,basis);if(r==='irrelevant')continue;
  const val=(x:DefinitionInterpretation)=>x.conditions.find(c=>c.dimension===dim&&!c.relational)?.value??null;const va=val(a),vb=val(b);
  if(va!==null&&vb!==null&&normText(va)!==normText(vb)){if(r==='defining')return {verdict:'not_comparable',reasons:[`${dim}: ${va}≠${vb}`],caveats};caveats.push(`${dim} differs (influencing)`);continue;}
  if(r==='defining'&&(va===null||vb===null)){unknown=true;reasons.push(dim+' not stated');}}
 if(!unknown)return {verdict:'comparable',reasons:[],caveats};
 return opts.sameSourceProtocol?{verdict:'comparable_within_source',reasons,caveats}:{verdict:'conditions_unestablished',reasons,caveats};
}

/** Reading: plan measurements compiled from the definitions (terms from surfaces, units from the pack's kinds, conditions from
 * relevant dimensions). Outcomes come from the definition or are inherited from the taught measurements it decomposes. */
export function definitionPlanMeasurements(defs:PropertyDefinitions,qk:QuantityKnowledge,category:string|null,taughtOutcomes:ReadonlyMap<string,readonly string[]>=new Map()):PlanMeasurement272[]{
 const out:PlanMeasurement272[]=[];
 for(const d of applicableProperties(defs,category)){if(d.form!=='quantity')continue;
  const units=UNIT_LEXICON272.filter(u=>{const p=parseUnit(qk,u.unit==='°c'?'°C':u.unit);return !!p&&p.kinds.some(k=>d.quantity!.kinds.includes(k));});
  const conds=d.conditions.filter(([x])=>relevanceOf(defs,d.id,x,category)!=='irrelevant').map(([x])=>{const dim=defs.dimensions.get(x)!;
   return {id:x,terms:[...new Set([...dim.cues,...Object.values(dim.values).flat()].map(w=>normText(w)))].slice(0,16)};});
  out.push({id:d.id,outcomes:[...new Set([...(d.outcomes??[]),...(taughtOutcomes.get(d.id)??[])])].sort(),proxyFor:[],dimensions:[...new Set(units.map(u=>u.dimension))],
   units:units.map(u=>u.unit),terms:[...new Set(d.surface.map(([t])=>normText(t)))],conditions:conds});}
 return out.sort((a,b)=>a.id.localeCompare(b.id));
}
