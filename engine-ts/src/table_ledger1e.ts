/** Table understanding, Stage B — the transient cell and element decision ledger (evaluation and shadow only).
 *
 * It accounts for EVERY source cell of every table the Step 1D-A2 semantic-document contract reads, splits each cell into
 * elements (numbers with their unit or currency, dashes, empty cells, "n/a" text, text labels), and evaluates for each
 * element ALL the gates of the frozen table reader `structuredTableLeads1D2` independently, recording every blocking
 * decision with its stage and rule, not only the first one. It never changes what the reader produces: the elements it
 * marks `table_lead` are, by construction and by test (tests/table_ledger1e.test.ts and `tables-1e-audit.mjs`), exactly
 * the reader's leads in the same order. Evidence that exists but is not used (a method statement elsewhere in the table's
 * section, a dimension word in the table heading, a unit in a header, labels that are operating settings) is recorded
 * separately as `notes`: observations, never decisions.
 * Nothing here is persisted; `publicLedger1E` keeps only counts, rule codes and coordinates. */
import {createHash} from 'node:crypto';
import {parseHtml245,walk245,type Node245} from './phase245_html_dom.js';
import {buildTableGrid245} from './phase245_table_grid.js';
import {TABLE_GATES1D2,type DocumentSemantics1D2,type Table1D2,type TableCell1D2} from './document_semantics.js';
import {unitAlternation272,canonicalUnit272,dimensionOfUnit272,DIMENSION_WORDS272,DECLARATION_CUE272,TEST_CONTEXT272,rangeOrBound272,
 planWords272,type ExtractionPlan272} from './phase272_extraction_plan.js';

export const TABLE_LEDGER1E_VERSION='pee.table-ledger.v1e.1';
export type Stage1E='acquisition'|'structure'|'context'|'evidence'|'element'|'output';
const STAGES:Stage1E[]=['acquisition','structure','context','evidence','element','output'];
/** Rule codes (machine-readable). The R* codes are the frozen reader's own gates. */
export const RULES1E={
 P0_no_plan:'no category plan: the plan-guided table reader does not run',
 R01_document_reports_no_testing:'no reader block of the page states testing (documentReportsTesting false)',
 R02_table_hard_excluded:'the table sits in a hard-excluded region',
 R03_table_context_specification:'the table context is a specification sheet',
 R04_header_cell:'the cell is a header (label, not a value)',
 R05_no_reader_block:'the cell has no aligned reader block',
 R06_first_column_label:'first-column cell of a multi-column table (treated as a label)',
 R07_line_empty_or_too_long:'the cell block is empty or longer than 900 characters',
 R08_unknown_context_no_test_label:'unknown table context and the cell labels state no test cue',
 R09_declaration_cue_in_labels:'a declaration cue in the cell labels',
 R10_declared_body_in_labels:'a certification or standards body in the cell labels',
 R11_price_in_cell:'a price or currency anywhere in the cell (the whole cell is skipped)',
 R12_no_plan_unit:'no unit of the plan in the cell, and no single plan unit in its labels for a bare number',
 R13_unit_not_in_plan:'the unit is not one of the plan units',
 R14_no_dimension_term:'no taught term or dimension word of the unit dimension in the cell labels or local text',
 R15_range_or_bound:'the value is part of a range or a bound, or is invalid',
 R16_duplicate:'the same element was already emitted',
 R17_output_cap:'the reader stops after 200 leads',
} as const;
export type Rule1E=keyof typeof RULES1E;
export const STAGE_OF1E:Record<Rule1E,Stage1E>={P0_no_plan:'acquisition',R01_document_reports_no_testing:'context',R02_table_hard_excluded:'structure',R03_table_context_specification:'context',
 R04_header_cell:'structure',R05_no_reader_block:'acquisition',R06_first_column_label:'structure',R07_line_empty_or_too_long:'acquisition',R08_unknown_context_no_test_label:'context',
 R09_declaration_cue_in_labels:'evidence',R10_declared_body_in_labels:'evidence',R11_price_in_cell:'evidence',R12_no_plan_unit:'element',R13_unit_not_in_plan:'element',
 R14_no_dimension_term:'element',R15_range_or_bound:'element',R16_duplicate:'output',R17_output_cap:'output'};
export interface Blocker1E {rule:Rule1E;stage:Stage1E}
export type ElementKind1E='number_with_unit'|'bare_number'|'currency'|'dash'|'empty'|'not_applicable_text'|'text';
export type ElementState1E='table_lead'|'rejected'|'header_label'|'label_text'|'dash_unexplained'|'empty'|'not_applicable_text';
export interface Element1E {index:number;kind:ElementKind1E;start:number;end:number;value:number|null;unitSurface:string|null;unit:string|null;
 state:ElementState1E;blockers:Blocker1E[];earliestStage:Stage1E|null;leadId:string|null;
 /** Stage D lessons that changed this element's outcome (empty without lessons). */
 lessonsApplied:TableLessonId1E[];
 /** Private (source text); dropped by publicLedger1E. */
 surface:string}
export interface CellLedger1E {table:number;sourceRow:number|null;sourceCell:number|null;row:number;col:number;rowspan:number;colspan:number;
 th:boolean;header:boolean;blockIndex:number|null;elements:Element1E[];
 /** Private. */
 text:string;rowLabels:string[];colLabels:string[]}
export interface TableNotes1E {
 /** Method statements (first-person measuring or testing prose) in the table's own section before the table, with their
  * distance in reader blocks; the frozen reader looks only at the last paragraph and only if it contains "we" or "I". */
 sectionMethodStatements:{blockIndex:number;distance:number;dimensions:string[]}[];
 /** Dimension words in the table heading or caption (the frozen reader looks only at the cell's own labels). */
 headingDimensions:string[];
 /** Units written inside header cells ("Winix A231 (dBA)", "(W + $/month)"). */
 headerUnits:{row:number;col:number;units:string[]}[];
 /** Operating-setting labels (speed, mode, level, sleep, turbo...) in the first column and in the header row. */
 settingLabels:{firstColumn:number;firstColumnOf:number;headerRow:number;headerRowOf:number};
 /** Cells with more than one value or currency element, and cells mixing a value and a currency. */
 compoundCells:number;mixedValueCurrencyCells:number;}
export interface TableLedger1E {table:number;phase245Mode:string;context:Table1D2['context'];hardExcluded:boolean;rows:number;cols:number;headerRows:number;
 contextEvidence:{heading:string|null;caption:boolean};cells:CellLedger1E[];notes:TableNotes1E}
export interface DocumentLedger1E {schema:'pee.table-ledger.v1e';version:string;sourceUrl:string;plan:boolean;documentReportsTesting:boolean;
 tables:TableLedger1E[];leads:{id:string;blockIndex:number;valueOffset:number;value:number;unit:string;table:number;row:number;col:number;element:number;
  condition?:string|null;lessons?:TableLessonId1E[]}[]}

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const NUM=/(?<![\d.,])([$£€¥])?\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*([a-zA-Zµ°%³²][a-zA-Z0-9µ°%³²/]*)?/g;
const DASH=/^\s*[-–—]+\s*$/;const NA=/^\s*(?:n\/?a|not applicable|none|not available|not tested)\s*$/i;
export const SETTING_LABEL1E=/^\s*(?:sleep|auto|eco|turbo|boost|standby|quiet|night|silent|low|medium|med|high|max(?:imum)?|min(?:imum)?|fan\s*speed|speed\s*\d+|level\s*\d+|setting\s*\d+|mode\s*\d*|power\s*\d+|stage\s*\d+|p\d)\b/i;
const CURRENCY_UNIT=/^(?:usd|gbp|eur|p|pence|cents?)$/i;
type Src={row:number;cell:number;rowspan:number;colspan:number;th:boolean};

/** Source coordinates of every grid cell (row index among the table's own rows, cell index within the row), its span and
 * tag, aligned with the semantic contract's tables (same skips: nested tables, no grid, more than 40 tables). */
function sourceCoordinates(html:string):Map<number,Src[]>{
 const out=new Map<number,Src[]>();const {root}=parseHtml245(html);let index=0;
 for(const n of walk245(root)){if(n.kind!=='element'||n.tag!=='table')continue;let a=n.parent,nested=false;while(a){if(a.tag==='table'){nested=true;break;}a=a.parent;}if(nested)continue;
  const g=buildTableGrid245(n);if(!g||index>=40)continue;const m=new Map<Node245,{row:number;cell:number}>();
  const trs:Node245[]=[];const visit=(x:Node245)=>{for(const c of x.children){if(c.kind!=='element'||c.tag==='table')continue;if(c.tag==='tr')trs.push(c);else visit(c);}};visit(n);
  trs.forEach((tr,r)=>tr.children.filter(c=>c.kind==='element'&&(c.tag==='td'||c.tag==='th')).forEach((c,k)=>m.set(c,{row:r,cell:k})));
  out.set(index,g.cells.map(c=>({...(m.get(c.node)??{row:-1,cell:-1}),rowspan:c.rowspan,colspan:c.colspan,th:c.header})));index++;}
 return out;
}
function tokens(line:string):{start:number;end:number;value:number;currency:boolean;unitSurface:string|null}[]{
 const out=[];for(const m of line.matchAll(NUM)){const unit=m[3]??null;const cur=!!m[1]||(!!unit&&CURRENCY_UNIT.test(unit));
  const numStart=m.index!+m[0].indexOf(m[2]);out.push({start:numStart,end:m.index!+m[0].length,value:Number(m[2].replace(/,/g,'')),currency:cur,unitSurface:unit});}
 return out;
}
const dims=(text:string)=>{const w=planWords272(text);return Object.entries(DIMENSION_WORDS272).filter(([,ws])=>ws.some(x=>w.includes(x))).map(([d])=>d);};
/** Units named inside a header cell's parentheses ("(dBA)", "(W + $/month)"): parts that are known units or currency. */
export function headerUnits1E(text:string):string[]{
 return [...text.matchAll(/\(([^)]{1,24})\)/g)].flatMap(m=>m[1].split(/\s*(?:\+|,|&|\band\b)\s*/i)).map(s=>s.trim()).filter(Boolean)
  .filter(p=>!!canonicalUnit272(p.toLowerCase())||/^[$£€]/.test(p));
}

/** Stage D table lessons (src/table_lessons1e.ts holds their versioned records and states). Each one only waives or completes a
 * frozen-reader decision for a precisely stated situation, and the element records which lesson did it. */
export type TableLessonId1E='TL1_section_method_scope'|'TL2_header_units'|'TL3_dimension_from_table_context'|'TL4_compound_cell_elements'|'TL5_setting_axis_conditions'
 |'TL6_cell_identity'|'TL7_table_cells_owned_by_table'|'TL8_placeholder_corner_orientation';
/** Specification signals that keep a table out of test reading whatever the section says (TL1 counterexample). */
const SPEC_ROW=/^\s*(?:manufacturer|brand|model(?: number)?|dimensions?|size|weight|warranty|filter(?: type| life)?|colou?r|features?|voltage|rated|certifications?|price|list price|clean air delivery rate|cadr|recommended room)\b/i;
export interface TableLessonContext1E {link:{blockIndex:number;distance:number;dimensions:string[]}|null;contextDims:string[];specSignal:string[];
 colUnits:Map<number,string[]>;rowUnits:Map<number,string[]>;settingAxis:'rows'|'cols'|null}
/** What the table's surroundings establish, for the lessons (pure; observations only). */
export function tableLessonContext1E(t:Table1D2,sem:DocumentSemantics1D2,blocks:readonly string[]):TableLessonContext1E{
 const {TABLE_TEST,SPEC_HEAD,DECLARED_BODY}=TABLE_GATES1D2;
 const firstBlock=Math.min(...t.cells.map(c=>c.blockIndex??Infinity));const methods:{blockIndex:number;distance:number;dimensions:string[]}[]=[];
 if(Number.isFinite(firstBlock)){const path=sem.blocks[firstBlock]?.headingPath??[];const head=path[path.length-1]??-1;
  for(let b=Math.max(0,head+1);b<firstBlock;b++){const s=blocks[b]??'';if(sem.blocks[b]?.cell||(sem.blocks[b]?.headingPath??[]).join()!==path.join())continue;
   if(/\b(?:we|i)\b/i.test(s)&&(TEST_CONTEXT272.test(s)||TABLE_TEST.test(s)))methods.push({blockIndex:b,distance:firstBlock-b,dimensions:dims(s)});}}
 const colUnits=new Map<number,string[]>(),rowUnits=new Map<number,string[]>();
 for(const c of t.cells){const u=headerUnits1E(c.text);if(!u.length)continue;if(c.header&&c.col>0)colUnits.set(c.col,u);else if(c.col===0&&c.row>=t.headerRows)rowUnits.set(c.row,u);}
 // Dimensions the table's own numbers carry: units in its cells and in its header units.
 const tableDims=new Set<string>();for(const c of t.cells){for(const k of tokens(c.text)){const u=k.unitSurface?canonicalUnit272(k.unitSurface.toLowerCase()):null;const d=u?dimensionOfUnit272(u):null;if(d)tableDims.add(d);}}
 for(const us of [...colUnits.values(),...rowUnits.values()])for(const u of us){const cu=canonicalUnit272(u.toLowerCase());const d=cu?dimensionOfUnit272(cu):null;if(d)tableDims.add(d);}
 const fc=t.cells.filter(c=>c.col===0&&c.row>=t.headerRows&&c.text.trim());const hr=t.cells.filter(c=>c.header&&c.col>0&&c.text.trim());
 const specSignal=[...(SPEC_HEAD.test([t.heading??'',t.caption??''].join(' '))?['specification_heading']:[]),...(fc.filter(c=>SPEC_ROW.test(c.text)).length>=2?['specification_row_labels']:[]),
  ...(t.cells.some(c=>c.header&&(DECLARATION_CUE272.test(c.text)||DECLARED_BODY.test(c.text)))?['declaration_in_headers']:[])];
 // TL1: the nearest first-person measuring statement of the same section whose dimensions are the table's own.
 const linked=[...methods].sort((a,b)=>a.distance-b.distance).find(m=>m.dimensions.some(d=>tableDims.has(d)))??null;
 const headingDims=dims([t.heading??'',t.caption??''].join(' '));
 const share=(xs:TableCell1D2[])=>xs.length>=2&&xs.filter(c=>SETTING_LABEL1E.test(c.text)).length>=0.6*xs.length;
 return {link:specSignal.length?null:linked,contextDims:[...new Set([...headingDims,...(linked&&!specSignal.length?linked.dimensions:[])])].filter(d=>tableDims.has(d)),specSignal,
  colUnits,rowUnits,settingAxis:share(fc)?'rows':share(hr)?'cols':null};
}

/** The ledger of one document. `plan` may be null (no category plan: nothing is read, everything is accounted). Without
 * `lessons` its accepted elements are exactly the frozen reader's leads; with lessons (shadow reading) they are the
 * lesson-enabled reading, and every element records the lessons that changed its outcome. */
export function tableLedger1E(sem:DocumentSemantics1D2,plan:ExtractionPlan272|null,opts:{sourceUrl:string;documentSha256?:string|null;
 blocks:readonly string[];documentReportsTesting:boolean;html?:string;lessons?:readonly TableLessonId1E[]}):DocumentLedger1E{
 const {TABLE_TEST,PRICE,DECLARED_BODY}=TABLE_GATES1D2;const coords=opts.html?sourceCoordinates(opts.html):new Map<number,Src[]>();
 const on=(id:TableLessonId1E)=>!!opts.lessons?.includes(id);
 const unitRe=plan?new RegExp('(?<![\\d.,])(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,3})?|\\d{1,7}(?:\\.\\d{1,3})?)\\s*('+unitAlternation272(plan.units)+')(?![a-z0-9])','gi'):null;
 const labelUnit=plan?new RegExp('(?:^|[\\s(,])(?:in\\s+)?('+unitAlternation272(plan.units)+')(?=[\\s),.]|$)','gi'):null;
 const taughtFor=(dim:string)=>new Set(plan?plan.measurements.filter(m=>m.dimensions.includes(dim)).flatMap(m=>m.terms):[]);
 const B=(rs:Rule1E[]):Blocker1E[]=>rs.map(rule=>({rule,stage:STAGE_OF1E[rule]}));
 const tablesOut:TableLedger1E[]=[];const leads:DocumentLedger1E['leads']=[];const seen=new Set<string>();let capped=false;
 for(const t of sem.tables){const src=coords.get(t.index)??[];const tableSkipped=t.hardExcluded||t.context==='specification';
  const lx=opts.lessons?.length?tableLessonContext1E(t,sem,opts.blocks):null;
  const cellsOut:CellLedger1E[]=[];
  t.cells.forEach((c:TableCell1D2,ci:number)=>{
   const line=c.blockIndex!==null?opts.blocks[c.blockIndex]??'':'';const text=c.blockIndex!==null?line:c.text;
   const labels=[...c.colLabels,...c.rowLabels].join(' | ');const cellLessons:TableLessonId1E[]=[];
   // Cell-level gates of the frozen reader, each evaluated on its own.
   const cellB:Rule1E[]=[];
   if(!plan)cellB.push('P0_no_plan');
   if(!opts.documentReportsTesting)cellB.push('R01_document_reports_no_testing');
   if(t.hardExcluded)cellB.push('R02_table_hard_excluded');
   if(t.context==='specification')cellB.push('R03_table_context_specification');
   const isHeader=c.header;const firstCol=c.col===0&&t.cols>1;
   if(isHeader)cellB.push('R04_header_cell');
   if(c.blockIndex===null)cellB.push('R05_no_reader_block');
   if(firstCol)cellB.push('R06_first_column_label');
   if(c.blockIndex!==null&&(!line||line.length>900))cellB.push('R07_line_empty_or_too_long');
   if(t.context!=='test'&&!(TABLE_TEST.test(labels)||TEST_CONTEXT272.test(labels))){
    // TL1: a first-person measuring statement of the same section, about the table's own dimensions, gives it test context
    // (never for a table that carries a specification signal).
    if(on('TL1_section_method_scope')&&t.context==='unknown'&&lx?.link)cellLessons.push('TL1_section_method_scope');else cellB.push('R08_unknown_context_no_test_label');}
   if(DECLARATION_CUE272.test(labels))cellB.push('R09_declaration_cue_in_labels');
   if(DECLARED_BODY.test(labels))cellB.push('R10_declared_body_in_labels');
   // TL4: a price in a cell that also holds a non-currency quantity rejects the currency element only, not the whole cell.
   let priceOnCurrencyOnly=false;
   if(PRICE.test(text)){if(on('TL4_compound_cell_elements')&&tokens(text).some(k=>!k.currency&&k.unitSurface)){priceOnCurrencyOnly=true;cellLessons.push('TL4_compound_cell_elements');}
    else cellB.push('R11_price_in_cell');}
   // The reader's own unit reading of the block line (unchanged), used to give each element its unit.
   const found:{value:number;unit:string;at:number;len:number;local:string}[]=[];
   if(unitRe&&line){let prev=0;for(const m of line.matchAll(unitRe)){const unit=canonicalUnit272(m[2]);if(!unit)continue;found.push({value:Number(m[1].replace(/,/g,'')),unit,at:m.index!,len:m[0].length,local:line.slice(prev,m.index!)});prev=m.index!+m[0].length;}
    if(!found.length&&labelUnit){const bare=/^\s*(\d{1,7}(?:\.\d{1,3})?)\s*$/.exec(line);
     if(bare){const units=[...new Set([...labels.matchAll(labelUnit)].map(m=>canonicalUnit272(m[1])).filter((u):u is string=>!!u))];
      if(units.length===1)found.push({value:Number(bare[1]),unit:units[0],at:line.indexOf(bare[1]),len:bare[1].length,local:''});}}}
   const els:Element1E[]=[];const fOf=new Map<number,typeof found[number]>();
   const mk=(e:Omit<Element1E,'index'|'earliestStage'|'leadId'|'lessonsApplied'>&{lessonsApplied?:TableLessonId1E[]},f?:typeof found[number])=>{
    const st=e.blockers.length?Math.min(...e.blockers.map(b=>STAGES.indexOf(b.stage))):-1;const i=els.length;
    els.push({...e,lessonsApplied:e.lessonsApplied??[],index:i,earliestStage:st>=0?STAGES[st]:null,leadId:null});if(f)fOf.set(i,f);};
   if(!text.trim())mk({kind:'empty',start:0,end:0,value:null,unitSurface:null,unit:null,state:'empty',blockers:[],surface:''});
   else if(DASH.test(text))mk({kind:'dash',start:0,end:text.length,value:null,unitSurface:null,unit:null,state:'dash_unexplained',blockers:[],surface:text.trim()});
   else if(NA.test(text))mk({kind:'not_applicable_text',start:0,end:text.length,value:null,unitSurface:null,unit:null,state:'not_applicable_text',blockers:[],surface:text.trim()});
   else{const tk=tokens(text);const used=new Set<number>();
    if(!tk.length)mk({kind:'text',start:0,end:text.length,value:null,unitSurface:null,unit:null,state:isHeader||firstCol?'header_label':'label_text',blockers:[],surface:text.slice(0,200)});
    for(const k of tk){const fi=found.findIndex((f,i)=>!used.has(i)&&f.at===k.start);let f=fi>=0?found[fi]:undefined;if(fi>=0)used.add(fi);
     const rules=[...cellB];const elLessons:TableLessonId1E[]=[...cellLessons];
     // TL2: a bare number (also with a thousands separator, or one of several numbers in the cell) takes the single plan unit
     // its own row or column labels name ("Winix A231 (dBA)", "HDR Brightness (10%, in nits)") - the frozen bare-number rule,
     // generalised beyond one bare number per cell.
     if(!f&&!k.currency&&!k.unitSurface&&on('TL2_header_units')&&plan&&labelUnit&&line&&!isHeader&&!firstCol){
      const us=[...new Set([...labels.matchAll(labelUnit)].map(m=>canonicalUnit272(m[1])).filter((u):u is string=>!!u&&plan.units.includes(u)))];
      if(us.length===1){f={value:k.value,unit:us[0],at:k.start,len:k.end-k.start,local:''};elLessons.push('TL2_header_units');}}
     if(!f&&!k.currency)rules.push('R12_no_plan_unit');
     if(k.currency&&priceOnCurrencyOnly)rules.push('R11_price_in_cell');
     if(f&&plan&&!plan.units.includes(f.unit))rules.push('R13_unit_not_in_plan');
     if(f&&plan){const dim=dimensionOfUnit272(f.unit);const ctx=planWords272(labels+' '+f.local);const taught=dim?taughtFor(dim):new Set<string>();
      if(!dim||!(ctx.some(w=>taught.has(w))||ctx.some(w=>(DIMENSION_WORDS272[dim]??[]).includes(w)))){
       // TL3: the dimension named by the table heading or caption, or by the linked method statement, counts.
       if(on('TL3_dimension_from_table_context')&&dim&&lx?.contextDims.includes(dim))elLessons.push('TL3_dimension_from_table_context');else rules.push('R14_no_dimension_term');}
      if(rangeOrBound272(line,f.at,f.at+f.len)||!Number.isFinite(f.value)||f.value<0)rules.push('R15_range_or_bound');}
     const kind:ElementKind1E=k.currency?'currency':f||k.unitSurface?'number_with_unit':'bare_number';
     mk({kind,start:k.start,end:k.end,value:k.value,unitSurface:k.unitSurface,unit:f?.unit??null,state:(isHeader||firstCol)&&!f?'header_label':'rejected',blockers:B(rules),surface:text.slice(k.start,k.end),
      lessonsApplied:rules.length?[]:elLessons},f);}
    // A unit reading of the reader that no element token starts at (not expected): kept, so nothing is lost.
    found.forEach((f,i)=>{if(!used.has(i))mk({kind:'number_with_unit',start:f.at,end:f.at+f.len,value:f.value,unitSurface:f.unit,unit:f.unit,state:'rejected',blockers:B([...cellB]),surface:line.slice(f.at,f.at+f.len)},f);});}
   // Emission exactly as the frozen reader: table order, cell order, unit-reading order, duplicate ids skipped, stop after 200.
   if(!tableSkipped&&!cellB.length&&!capped){
    const pos=(f:typeof found[number],i:number)=>{const k=found.indexOf(f);return k>=0?k:1e6+i;};
    const order=[...fOf.keys()].sort((a,b)=>pos(fOf.get(a)!,a)-pos(fOf.get(b)!,b));
    // TL5: labels of an operating-setting axis are the value's condition (never its product).
    const condition=on('TL5_setting_axis_conditions')&&lx?.settingAxis?((lx.settingAxis==='rows'?c.rowLabels[0]:c.colLabels[0])??null):null;
    for(const i of order){const e=els[i],f=fOf.get(i)!;if(e.blockers.length)continue;
     // TL6: a table value is identified by its cell position too, so equal texts in two cells stay two observations.
     const id=sha(JSON.stringify([opts.sourceUrl,sha(line),f.at,f.value,f.unit,'table1d2',...(on('TL6_cell_identity')?[t.index,c.row,c.col]:[])]));
     if(seen.has(id)){e.blockers.push({rule:'R16_duplicate',stage:'output'});e.earliestStage='output';e.lessonsApplied=[];continue;}
     if(on('TL6_cell_identity')&&seen.has(sha(JSON.stringify([opts.sourceUrl,sha(line),f.at,f.value,f.unit,'table1d2']))))e.lessonsApplied=[...e.lessonsApplied,'TL6_cell_identity'];
     seen.add(sha(JSON.stringify([opts.sourceUrl,sha(line),f.at,f.value,f.unit,'table1d2'])));
     if(condition)e.lessonsApplied=[...e.lessonsApplied,'TL5_setting_axis_conditions'];
     seen.add(id);e.state='table_lead';e.leadId=id;leads.push({id,blockIndex:c.blockIndex!,valueOffset:f.at,value:f.value,unit:f.unit,table:t.index,row:c.row,col:c.col,element:i,
      ...(opts.lessons?.length?{condition:condition?condition.trim().toLowerCase().slice(0,80):null,lessons:e.lessonsApplied}:{})});}
    if(leads.length>=200)capped=true;}
   else if(capped&&!tableSkipped&&!cellB.length)for(const [i] of fOf){const e=els[i];if(!e.blockers.length){e.blockers.push({rule:'R17_output_cap',stage:'output'});e.earliestStage='output';}}
   const sc=src[ci];
   cellsOut.push({table:t.index,sourceRow:sc&&sc.row>=0?sc.row:null,sourceCell:sc&&sc.cell>=0?sc.cell:null,row:c.row,col:c.col,rowspan:sc?.rowspan??1,colspan:sc?.colspan??1,th:sc?.th??false,
    header:c.header,blockIndex:c.blockIndex,elements:els,text:text.slice(0,300),rowLabels:c.rowLabels,colLabels:c.colLabels});});
  // Notes: evidence present in the document that the frozen reader does not use (observations only).
  const firstBlock=Math.min(...t.cells.map(c=>c.blockIndex??Infinity));
  const sectionMethods:TableNotes1E['sectionMethodStatements']=[];
  if(Number.isFinite(firstBlock)){const path=sem.blocks[firstBlock]?.headingPath??[];const head=path[path.length-1]??-1;
   for(let b=Math.max(0,head+1);b<firstBlock;b++){const s=opts.blocks[b]??'';if(sem.blocks[b]?.cell)continue;
    if((sem.blocks[b]?.headingPath??[]).join()!==path.join())continue;
    if(TEST_CONTEXT272.test(s)||TABLE_TEST.test(s))sectionMethods.push({blockIndex:b,distance:firstBlock-b,dimensions:dims(s)});}}
  const headerUnits=t.cells.filter(c=>c.header).map(c=>({row:c.row,col:c.col,units:headerUnits1E(c.text)})).filter(x=>x.units.length);
  const fc=t.cells.filter(c=>c.col===0&&c.row>=t.headerRows&&c.text.trim());const hr=t.cells.filter(c=>c.header&&c.col>0&&c.text.trim());
  const values=(c:CellLedger1E)=>c.elements.filter(e=>e.kind==='number_with_unit'||e.kind==='bare_number').length;
  const cur=(c:CellLedger1E)=>c.elements.filter(e=>e.kind==='currency').length;
  tablesOut.push({table:t.index,phase245Mode:t.phase245Mode,context:t.context,hardExcluded:t.hardExcluded,rows:t.rows,cols:t.cols,headerRows:t.headerRows,
   contextEvidence:{heading:t.heading,caption:!!t.caption},cells:cellsOut,
   notes:{sectionMethodStatements:sectionMethods,headingDimensions:dims([t.heading??'',t.caption??''].join(' ')),headerUnits,
    settingLabels:{firstColumn:fc.filter(c=>SETTING_LABEL1E.test(c.text)).length,firstColumnOf:fc.length,headerRow:hr.filter(c=>SETTING_LABEL1E.test(c.text)).length,headerRowOf:hr.length},
    compoundCells:cellsOut.filter(c=>!c.header&&values(c)+cur(c)>1).length,mixedValueCurrencyCells:cellsOut.filter(c=>!c.header&&values(c)&&cur(c)).length}});}
 return {schema:'pee.table-ledger.v1e',version:TABLE_LEDGER1E_VERSION,sourceUrl:opts.sourceUrl,plan:!!plan,documentReportsTesting:opts.documentReportsTesting,tables:tablesOut,leads};
}

const count=(xs:string[])=>xs.reduce((o,k)=>(o[k]=(o[k]??0)+1,o),{} as Record<string,number>);
/** Value-free form: coordinates, kinds, states, rule codes and counts; no text, value, label or unit surface. */
export function publicLedger1E(l:DocumentLedger1E){
 return {version:l.version,plan:l.plan,documentReportsTesting:l.documentReportsTesting,leads:l.leads.length,
  tables:l.tables.map(t=>({table:t.table,mode:t.phase245Mode,context:t.context,rows:t.rows,cols:t.cols,headerRows:t.headerRows,cells:t.cells.length,
   elements:count(t.cells.flatMap(c=>c.elements.map(e=>e.kind))),states:count(t.cells.flatMap(c=>c.elements.map(e=>e.state))),
   blockers:count(t.cells.flatMap(c=>c.elements.flatMap(e=>e.blockers.map(b=>b.rule)))),
   earliest:count(t.cells.flatMap(c=>c.elements.filter(e=>e.state==='rejected').map(e=>e.earliestStage??'none'))),
   notes:{sectionMethodStatements:t.notes.sectionMethodStatements.map(s=>({distance:s.distance,dimensions:s.dimensions})),headingDimensions:t.notes.headingDimensions,
    headerUnitCells:t.notes.headerUnits.length,settingLabels:t.notes.settingLabels,compoundCells:t.notes.compoundCells,mixedValueCurrencyCells:t.notes.mixedValueCurrencyCells}}))};
}
/** Aggregate of many document ledgers (counts only). Value elements = numbers with or without unit (currency apart). */
export function summariseLedgers1E(ls:readonly DocumentLedger1E[]){
 const tables=ls.flatMap(l=>l.tables);const cells=tables.flatMap(t=>t.cells);const els=cells.flatMap(c=>c.elements);
 const valueEls=els.filter(e=>e.kind==='number_with_unit'||e.kind==='bare_number');const rejected=valueEls.filter(e=>e.state==='rejected');
 return {documents:ls.length,tables:tables.length,cells:cells.length,headerCells:cells.filter(c=>c.header).length,elements:els.length,elementKinds:count(els.map(e=>e.kind)),states:count(els.map(e=>e.state)),
  valueElements:valueEls.length,valueElementsOutsideLabels:valueEls.filter(e=>e.state!=='header_label').length,tableLeads:els.filter(e=>e.state==='table_lead').length,
  rejectedValueElements:rejected.length,blockersOnRejected:count(rejected.flatMap(e=>e.blockers.map(b=>b.rule))),earliestStageOfRejected:count(rejected.map(e=>e.earliestStage??'none')),
  rejectedWithSeveralBlockers:rejected.filter(e=>e.blockers.length>1).length,soleBlocker:count(rejected.filter(e=>e.blockers.length===1).map(e=>e.blockers[0].rule)),
  valueCellsWithoutBlock:cells.filter(c=>!c.header&&c.blockIndex===null&&c.elements.some(e=>e.kind==='number_with_unit'||e.kind==='bare_number')).length,
  tablesUnknownContextWithSectionMethod:tables.filter(t=>t.context==='unknown'&&t.notes.sectionMethodStatements.length).length,
  tablesWithHeaderUnits:tables.filter(t=>t.notes.headerUnits.length).length,
  tablesWithSettingFirstColumn:tables.filter(t=>t.notes.settingLabels.firstColumnOf>0&&t.notes.settingLabels.firstColumn>=t.notes.settingLabels.firstColumnOf*0.6).length,
  compoundCells:tables.reduce((a,t)=>a+t.notes.compoundCells,0),mixedValueCurrencyCells:tables.reduce((a,t)=>a+t.notes.mixedValueCurrencyCells,0)};
}

/** The lesson-enabled ledger's accepted elements as table leads of the same shape as `structuredTableLeads1D2` (shadow
 * reading only): methodCue 'structured_table_measurement_term' (not admitted by the persistence screen), no subject (the
 * attribution step decides it), and the TL5 condition when one applies. */
export function ledgerTableLeads1E(l:DocumentLedger1E,opts:{sourceUrl:string;documentSha256?:string|null;blocks:readonly string[]}):import('./phase225_transient_test_probe.js').TestCandidate225[]{
 return l.leads.map(x=>({id:x.id,sourceUrl:opts.sourceUrl,documentSha256:opts.documentSha256??null,blockSha256:sha(opts.blocks[x.blockIndex]??''),blockIndex:x.blockIndex,valueOffset:x.valueOffset,
  value:x.value,unit:x.unit,instrument:null,condition:x.condition??null,methodCue:'structured_table_measurement_term' as const,conditionCodes:[],setpointC:null,documentProtocolCodes:[],
  subject:null,subjectAssignment:'not_identified' as const,classification:'publisher_reported_measurement_lead_only' as const,methodReviewed:false,originalWorkReviewed:false,
  reviewerIndependent:false,exactVariantVerified:false,market:'unknown' as const,scientificEvidenceAdmitted:false,rankingAuthorized:false}));
}

/** Lesson-aware product of a table cell (shadow reading; the frozen `cellProducts1D2` is unchanged). Same rule as the frozen
 * one (a product only from the cell's own column or row header, judged by the document's identity inventory), with:
 * TL2 a header's trailing unit in parentheses is not part of the product name ("Winix A231 (dBA)" names "Winix A231");
 * TL5 an operating-setting label is never a product. */
export function cellProducts1E(sem:DocumentSemantics1D2,isProduct:(name:string)=>string|null,lessons:readonly TableLessonId1E[]):Map<number,{product:string|null;basis:string}>{
 const strip=(s:string)=>lessons.includes('TL2_header_units')&&headerUnits1E(s).length?s.replace(/\s*\([^)]*\)\s*$/,'').trim():s;
 const judge=(s:string)=>lessons.includes('TL5_setting_axis_conditions')&&SETTING_LABEL1E.test(s)?null:isProduct(strip(s));
 const out=new Map<number,{product:string|null;basis:string}>();
 for(const t of sem.tables){if(t.hardExcluded)continue;
  const hp=t.headerRows?t.headerTexts.map((h,c)=>c>0?judge(h):null):t.headerTexts.map(()=>null);const cp=new Map<number,string|null>();
  for(const c of t.cells)if(c.col===0&&c.row>=t.headerRows)cp.set(c.row,judge(c.text));
  const nh=hp.filter(Boolean).length,nc=[...cp.values()].filter(Boolean).length;
  const columns=nh>=2&&nh>nc,rows=nc>=2&&nc>nh,kv=t.cols===2&&nh===1&&nc===0;
  if(!columns&&!rows&&!kv)continue;
  for(const c of t.cells){if(c.header||c.col===0||c.blockIndex===null)continue;
   const p=columns||kv?hp[c.col]??null:cp.get(c.row)??null;
   out.set(c.blockIndex,{product:p,basis:columns?'column_header':rows?'row_header':'value_column_header'});}}
 return out;
}

/** TL7 (v3): the table's own evidence that a cell holds a declaration, or null. Used to withdraw prose-reader leads read from
 * table-cell blocks: a specification table, or a certification body or declaration cue in the cell's labels (without a test
 * cue). Cells without such evidence keep the prose reader's lead. v2 also treated a rating NAME (CADR, energy rating) as a
 * declaration; rejected, because publishers report their own measured or estimated CADR under the same label. */
export function cellDeclarationEvidence1E(sem:DocumentSemantics1D2,blockIndex:number):string|null{
 const ref=sem.blocks[blockIndex]?.cell;if(!ref)return null;const t=sem.tables[ref.table];if(!t)return null;
 const c=t.cells.find(x=>x.blockIndex===blockIndex);if(!c)return null;const labels=[...c.colLabels,...c.rowLabels].join(' | ');
 const {TABLE_TEST,DECLARED_BODY}=TABLE_GATES1D2;const test=TABLE_TEST.test(labels)||TEST_CONTEXT272.test(labels);
 if(t.context==='specification')return 'specification_table';
 if(DECLARED_BODY.test(labels))return 'certification_body_in_labels';
 if(DECLARATION_CUE272.test(labels)&&!test)return 'declaration_cue_in_labels';
 return null;
}
