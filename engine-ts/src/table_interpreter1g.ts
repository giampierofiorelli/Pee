/** Experimental GLOBAL table interpreter (1G; evaluation and shadow use only; nothing persists, nothing ranks).
 *
 * Input: the faithful neutral acquisition of every table (src/table_acquisition1f.ts) and the structure of the whole
 * transient HTML document. It never consumes the conclusions of the older readers (Phase245 interpretation, Phase272
 * plans' gates, document_semantics table contexts, the 1E ledger or its lessons). It interprets the WHOLE table before it
 * reconstructs any observation:
 *  1. document model: heading hierarchy and sections, blocks, entities named by structured metadata (JSON-LD, microdata,
 *     title, headings, links), first-person method statements and declaration statements with the dimensions they name;
 *  2. collective cell typing (after Sato: a line is typed from all its cells, not cell by cell): quantities with units and
 *     dimensions from a generic physical lexicon, currencies, ratings, ranges, dashes, booleans, entity-, setting- and
 *     property-shaped labels; unknown units are kept as unknown, never dropped;
 *  3. a bounded set of whole-table hypotheses: header rows (0-2) and columns (0-2) and a role for every header level
 *     (product, property, condition, record), plus "layout, not data" (after TUTA, header levels are hierarchical
 *     coordinate paths);
 *  4. joint evaluation (after Limaye et al.'s joint model and TableMiner+'s use of context): every hypothesis is checked
 *     against explicit constraints and against named, source-grounded signals from the header markup, label types, the
 *     consistency of the body under the hypothesis (a line typed "property" must hold one dimension, and that dimension
 *     must agree with its label), header/body contrast (WDC features) and document context. A hypothesis's support is the
 *     number of signals for it minus the number against it: a count of named evidence items, NOT a probability. Weak
 *     signals (monotone trends across settings) only break ties;
 *  5. document-level iteration (TableMiner+ "update"): product names established by a confidently interpreted table become
 *     document entities for the other tables of the page; tables are re-evaluated until nothing changes (at most 3 passes);
 *  6. observation reconstruction only from the selected interpretation; a field is filled only when every top-tied
 *     hypothesis agrees on it, otherwise it stays unresolved with the alternatives;
 *  7. evidence classification by the most specific level that has evidence (value, cell, labels, table heading/caption,
 *     linked method or declaration statements in structural scope with a compatible quantity, page method sections);
 *     conflicting evidence at that level gives "disputed". Structure is never taken as proof of scientific validity.
 * Limits (explicit): tables with 2-30 rows and 2-12 columns whose acquisition is complete; others are listed with a reason. */
import {maskNegated} from './language_scope.js';
import {createHash} from 'node:crypto';
import {acquireTables1F,decodeHtml5Text1F,type TableAcquisition1F,type SourceCell1F} from './table_acquisition1f.js';
import {parseHtml245,walk245,locator245,type Node245} from './phase245_html_dom.js';
import {UNIT_LEXICON272,DIMENSION_WORDS272,TEST_CONTEXT272,DECLARATION_CUE272} from './phase272_extraction_plan.js';
import {activeInterpreterLessons1G,interpreterLessonsDigest1G,ALL_INTERPRETER_LESSONS1G,type InterpreterLessonId1G} from './table_interpreter1g_lessons.js';
type Lessons=ReadonlySet<InterpreterLessonId1G>;const ALL:Lessons=new Set(ALL_INTERPRETER_LESSONS1G);

export const INTERPRETER1G_VERSION='pee.table-interpreter.v1g.1';
/** v1g.2 = v1g.1 reading the rendered cell text of acquisition v1f.2 (line breaks of <br> and blocks kept as line
 * breaks), selected with {text:'rendered'}. Nothing else differs; v1g.1 stays the default and is reproducible. */
export const INTERPRETER1G_RENDERED_VERSION='pee.table-interpreter.v1g.2';
export type TextModel1G='decoded'|'rendered';
/** The table as v1g.2 reads it: every cell and caption text is its rendered text (whitespace collapsed within lines). */
export function renderedView1G(t:TableAcquisition1F):TableAcquisition1F{
 const r=(c:{normalisedText:string;renderedText?:string})=>c.renderedText===undefined?c.normalisedText:c.renderedText.split('\n').map(l=>l.replace(/[\t\f\r ]+/g,' ').trim()).filter(Boolean).join('\n');
 return {...t,cells:t.cells.map(c=>({...c,normalisedText:r(c)})),caption:t.caption?{...t.caption,normalisedText:r(t.caption)}:null};
}
export const LIMITS1G={minRows:2,maxRows:30,minCols:2,maxCols:12,maxHeaderRows:2,maxHeaderCols:2,maxPasses:3} as const;

// ---------------------------------------------------------------------------------------------------------------------
// Lexicon: generic physics and everyday English (no category, publisher or product terms).
const EXTRA_UNITS:{unit:string;dimension:string;re:string}[]=[
 {unit:'m2',dimension:'area',re:'m(?:2|²)|sq\\.? ?m|square met(?:er|re)s?'},{unit:'sq ft',dimension:'area',re:'sq\\.? ?ft\\.?|square f(?:ee|oo)t|ft²|ft2'},
 {unit:'mm',dimension:'length',re:'mm'},{unit:'cm',dimension:'length',re:'cm'},{unit:'in',dimension:'length',re:'inch(?:es)?|in\\.?|"'},
 {unit:'lb',dimension:'mass',re:'lbs?|pounds?'},{unit:'oz',dimension:'mass',re:'oz'},{unit:'rpm',dimension:'rotation',re:'rpm'},
 {unit:'°f',dimension:'temperature',re:'°\\s?f'},{unit:'kw',dimension:'power',re:'kw'},{unit:'v',dimension:'voltage',re:'v|volts?'},
 {unit:'mah',dimension:'charge',re:'mah'},{unit:'p',dimension:'currency',re:'p|pence'},
];
const LEX=[...UNIT_LEXICON272,...EXTRA_UNITS];
const UNIT_RE=LEX.map(u=>u.re).sort((a,b)=>b.length-a.length).join('|');
const unitOf=(printed:string)=>{const p=printed.toLowerCase().trim();for(const u of LEX)if(new RegExp('^(?:'+u.re+')$','i').test(p))return u;return null;};
const DIM_WORDS:Record<string,readonly string[]>={...DIMENSION_WORDS272,area:['area','room','sq'],length:['length','width','height','depth','dimensions','distance'],
 currency:['price','cost','costs','rrp','msrp'],mass:[...DIMENSION_WORDS272.mass,'weighs'],rotation:['rpm','spin'],voltage:['voltage'],charge:['battery']};
export const SETTING1G=/\b(?:low|med(?:ium)?|high|max(?:imum)?|min(?:imum)?|turbo|boost|sleep|night|eco|auto(?:matic)?|standby|quiet|silent|normal|whisper)\b|\b(?:speed|fan(?: speed)?|level|setting|power level|stage)\s*[0-9ivx]+\b|^\s*[0-9]+\s*$/i;
const SETTING=SETTING1G;
const PROPERTY_WORDS=/\b(?:weight|dimensions?|size|capacity|power|noise|volume|price|warranty|colou?rs?|filters?|type|features?|modes?|speeds?|rating|score|energy|consumption|airflow|coverage|brightness|resolution|ports?|connectivity|battery|runtime|time|temperature|material|model|brand|programmes?|settings?|cost|efficiency|accuracy|lag|refresh|hdr|sdr|range|controls?|display|app|sensor|timer|cadr|area|room)\b/i;
/** Words that head a quantity name; a label holding one is a property even when it also names a setting ("Energy consumption eco"). */
const PROPERTY_HEAD=/\b(?:weight|dimensions?|size|capacity|power|noise|volume|price|warranty|energy|consumption|airflow|brightness|resolution|battery|runtime|time|temperature|cost|efficiency|lag|latency|cadr|area|water|sound|extraction|rate|usage|draw)\b/i;
const PLACEHOLDER=/^(?:header cell|row|column|cell)\b[\w\s-]*\d+\s*$/i;
const SPEC_CUE=/\b(?:spec(?:ification)?s?|tech(?:nical)? specs?|key (?:specs|features)|at a glance|product details)\b/i;
const CERT_CUE=/\b(?:AHAM|ENERGY STAR|certif\w*|verified by)\b/;
const TEST_CUE=/\b(?:test(?:ed|s|ing)? (?:results?|data|figures)|(?:our|lab) data|our (?:results|measurements|tests?|testing)|measured|tested|lab(?:oratory)? (?:results|tests?)|benchmarks?|we (?:found|recorded|measured|tested|timed|ran))\b/i;
const EXPLICIT_ESTIMATE=/\b(?:estimat\w*|calculat\w*|approx\w*|projected)\b/i;
const RECURRENCE=/\b(?:per (?:year|month|annum|day|hour|use|cycle|kwh)|annual(?:ly)?|running costs?|operating costs?|a year|a month)\b|\/\s*(?:month|year|mo|yr|day|hr|kwh)\b|\bcost per\b/i;
const ESTIMATE_CUE=new RegExp(EXPLICIT_ESTIMATE.source+'|'+RECURRENCE.source,'i');
const COST_WORD=/\bcosts?\b/i;
const RATING_CUE=/\b(?:score|rating|out of|stars?)\b|\/\s*(?:5|10|100)\b/i;
const PRICE_CUE=/\b(?:price|rrp|msrp)\b/i;
const IDENT_CUE=/\b(?:model(?: number| no\.?)?|sku|ean|upc|gtin|part number)\b/i;
const METHOD_HEAD=/\b(?:how we test|methodology|our (?:testing|tests?|process)|testing process|how we (?:measured|review)|test(?:ing)? method|research explained)\b/i;

const norm=(s:string)=>s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const sha=(s:string)=>createHash('sha256').update(s).digest('hex').slice(0,16);
const esc=(w:string)=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function dimensionsIn1G(text:string):string[]{const t=' '+text.toLowerCase()+' ';const out=new Set<string>();
 for(const [d,ws] of Object.entries(DIM_WORDS))for(const w of ws)if(new RegExp('(?:^|[^a-z0-9])'+esc(w)+'(?:$|[^a-z0-9])').test(t))out.add(d);
 for(const m of text.matchAll(new RegExp('\\d\\s?('+UNIT_RE+')(?![a-z])','gi'))){const u=unitOf(m[1]);if(u)out.add(u.dimension);}
 return [...out];}

// ---------------------------------------------------------------------------------------------------------------------
// Cell content: elements (values) and label features
export type ElementKind1G='quantity'|'number'|'currency'|'rating'|'range'|'bound'|'boolean'|'text'|'identifier';
export interface Element1G {kind:ElementKind1G;surface:string;start:number;value:number|null;low?:number;high?:number;unit:string|null;dimension:string|null;inCellLabel:string|null}
const NUM='[-−]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
const toNum=(s:string)=>Number(s.replace(/,/g,'').replace('−','-'));
const isDash=(t:string)=>/^\s*(?:-|–|—|n\/?a|tbc|tba|\?|none)\s*$/i.test(t);
/** The values a cell holds, each with its printed surface, position, unit and the in-cell label before it ("Dust: 134 CFM"). */
export function cellElements1G(text:string):Element1G[]{
 const t=text;const out:Element1G[]=[];const used:[number,number][]=[];const free=(a:number,b:number)=>!used.some(([x,y])=>a<y&&b>x);
 const push=(e:Element1G,end:number)=>{out.push(e);used.push([e.start,end]);};
 const labelBefore=(i:number)=>{const seg=t.slice(0,i);const m=/([A-Za-z][A-Za-z0-9 .()&/-]{0,40}?):\s*$/.exec(seg);if(!m)return null;const l=m[1].replace(/^.*?\b(?:CFM|cfm|dB|dBA|W|kWh|%|mins?)\s+/,'').trim();return l||null;};
 for(const m of t.matchAll(new RegExp(`(${NUM})\\s*(?:\\/|out of)\\s*(5|10|100)\\b`,'gi'))){const s=m.index!,e=s+m[0].length;if(free(s,e))push({kind:'rating',surface:m[0],start:s,value:toNum(m[1]),unit:'/'+m[2],dimension:'rating',inCellLabel:labelBefore(s)},e);}
 for(const m of t.matchAll(new RegExp(`([£$€])\\s?(${NUM})|(${NUM})\\s?(€|eur|usd|gbp)\\b`,'gi'))){const s=m.index!,e=s+m[0].length;if(!free(s,e))continue;
  push({kind:'currency',surface:m[0],start:s,value:toNum(m[2]??m[3]),unit:(m[1]??m[4]).toLowerCase(),dimension:'currency',inCellLabel:labelBefore(s)},e);}
 for(const m of t.matchAll(/(\d+)\s*(?:h|hrs?|hours?)\s*(\d+)\s*(?:m|mins?|minutes?)\b/gi)){const s=m.index!,e=s+m[0].length;if(!free(s,e))continue;
  push({kind:'quantity',surface:m[0],start:s,value:+m[1]*60+ +m[2],unit:'minutes',dimension:'duration',inCellLabel:labelBefore(s)},e);}
 for(const m of t.matchAll(new RegExp(`(${NUM})\\s?(?:${UNIT_RE})?\\s*(?:-|–|—|to)\\s*(${NUM})\\s?(${UNIT_RE})?(?![A-Za-z])`,'gi'))){const s=m.index!,e=s+m[0].length;if(!free(s,e))continue;
  if(/[A-Za-z0-9]/.test(t.slice(Math.max(0,s-1),s)))continue;const u=m[3]?unitOf(m[3]):null;
  push({kind:'range',surface:m[0],start:s,value:null,low:toNum(m[1]),high:toNum(m[2]),unit:u?.unit??null,dimension:u?.dimension??null,inCellLabel:labelBefore(s)},e);}
 for(const m of t.matchAll(new RegExp(`(up to|under|over|less than|more than|at least|<|>|≤|≥|~)?\\s*(${NUM})(?:\\s?(${UNIT_RE}))?(?![A-Za-z0-9])`,'gi'))){
  const numStart=m.index!+m[0].indexOf(m[2]);const s=m[1]?m.index!+m[0].indexOf(m[1]):numStart,e=m.index!+m[0].length;if(!free(s,e))continue;
  const prev=t.slice(Math.max(0,numStart-1),numStart);if(/[A-Za-z0-9.]/.test(prev)||/^-[A-Za-z]/.test(t.slice(e,e+2)))continue;// part of an identifier
  const u=m[3]?unitOf(m[3]):null;
  push({kind:m[1]?'bound':u?'quantity':'number',surface:t.slice(s,e).trim(),start:s,value:toNum(m[2]),unit:u?.unit??null,dimension:u?.dimension??null,inCellLabel:labelBefore(s)},e);}
 for(const m of t.matchAll(/\b(?=[A-Z0-9-]*\d)(?=[A-Z0-9-]*[A-Z])[A-Z0-9][A-Z0-9-]{2,}\b/g)){const s=m.index!,e=s+m[0].length;if(free(s,e)&&!unitOf(m[0]))push({kind:'identifier',surface:m[0],start:s,value:null,unit:null,dimension:null,inCellLabel:labelBefore(s)},e);}
 if(!out.length){const b=/^\s*(?:yes|no|✓|✔|✗|✘|x|true|false|included|not included)\s*$/i.exec(t);
  if(b)out.push({kind:'boolean',surface:t.trim(),start:0,value:null,unit:null,dimension:null,inCellLabel:null});
  else if(t.trim()&&!isDash(t))out.push({kind:'text',surface:t.trim(),start:0,value:null,unit:null,dimension:null,inCellLabel:null});}
 return out.sort((a,b)=>a.start-b.start);
}
/** A parenthesised qualifier states a condition when it holds a number or names a setting, mode, programme or window. */
const CONDITION_QUALIFIER=/\d|\b(?:mode|programme|program|cycle|window|setting|speed|level|eco|standard|quick|intensive|turbo|sleep|low|medium|high)\b/i;
const UNIT_LIST=/^[\sA-Za-z°³²%$£€+/x×.-]*$/;
const modelCodeIn=(s:string)=>/\b(?=[A-Za-z-]*\d)(?=[A-Za-z0-9-]*[A-Za-z])[A-Za-z0-9][A-Za-z0-9-]{1,}\b/.test(s);
export interface LabelFeatures1G {text:string;name:string;unit:{unit:string;dimension:string}|null;qualifiers:string[];labelConditions:string[];empty:boolean;
 entity:boolean;modelCode:boolean;docEntity:string|null;setting:boolean;property:boolean;dimensions:string[];quantityLike:boolean;longText:boolean}
/** What a cell would contribute as a label: its name, unit and qualifiers in parentheses, and its shape (entity, setting, property). */
/** Conditions a property label states beside its quantity: embedded quantities ("5%", "@200°C", "1hr") and the words left
 * when the quantity words are removed ("Energy consumption standard clean" -> "standard clean"). */
function labelConditions(name:string,dims:string[]):string[]{if(!dims.length)return [];
 const out:string[]=[];for(const m of name.matchAll(new RegExp(`@?\\s*${NUM}\\s?(?:${UNIT_RE}|%)`,'gi')))out.push(m[0].replace(/^@\s*/,'').trim());
 return out;}
export function labelFeatures1G(text:string,docNames:readonly string[],headingNames:readonly string[]=[],L:Lessons=ALL):LabelFeatures1G{
 const raw=text.replace(/\s+/g,' ').trim();const placeholder=PLACEHOLDER.test(raw);
 const parens=[...raw.matchAll(/\(([^()]{1,40})\)/g)].map(m=>m[1].trim());let unit:LabelFeatures1G['unit']=null;const qualifiers:string[]=[];
 for(const p of parens){for(const part of p.split(/,\s*|;\s*/)){const u=/^[£$€]$/.test(part.trim())?{unit:part.trim(),dimension:'currency'}:unitOf(part.replace(/^in\s+/i,''));if(u&&!unit)unit={unit:u.unit,dimension:u.dimension};else if(part&&(!L.has('GL6_label_conditions')||CONDITION_QUALIFIER.test(part)&&!UNIT_LIST.test(part)))qualifiers.push(part);}}
 const trailing=/,\s*(?:in\s+)?([A-Za-z°³²/%]{1,6})\s*$/.exec(raw);if(!unit&&trailing){const u=unitOf(trailing[1]);if(u)unit={unit:u.unit,dimension:u.dimension};}
 const name0=raw.replace(/\([^()]*\)/g,' ').replace(/:\s*$/,'').replace(/\s+/g,' ').trim();
 const name=L.has('GL3_structured_entity_grounding')&&name0.split(' ').length>=3?name0.replace(/\s+(?:review|reviews|full specs|specs|specifications|test results|test data)$/i,''):name0;
 const modelCode=/\b(?=[A-Za-z-]*\d)(?=[A-Za-z0-9-]*[A-Za-z])[A-Za-z0-9][A-Za-z0-9-]{1,}\b/.test(name)&&!new RegExp('^'+NUM+'\\s?(?:'+UNIT_RE+')?$','i').test(name)&&!/^\d+(?:st|nd|rd|th)$/i.test(name);
 const n=norm(name);const multi=n.split(' ').length>=2;
 const docEntity=!L.has('GL3_structured_entity_grounding')?(n.length>=3?[...docNames,...headingNames].find(d=>{const dn=norm(d);return dn.length>=3&&(dn===n||(dn.includes(n)&&multi)||(n.includes(dn)&&dn.split(' ').length>=2));})??null:null)
  :n.length>=3&&(multi||modelCodeIn(name))?docNames.find(d=>{const dn=norm(d);return dn.length>=3&&(dn===n||modelCodeIn(name)&&((dn.includes(n)&&multi)||(n.includes(dn)&&dn.split(' ').length>=2&&modelCodeIn(d))));})
  ??(modelCodeIn(name)?headingNames.find(d=>norm(d)===n||norm(d).includes(n)&&multi)??null:null)??null:null;
 const words=name.split(/\s+/).filter(Boolean).length;const setting=!placeholder&&SETTING.test(name)&&words<=4&&!(L.has('GL8_property_head_precedence')&&PROPERTY_HEAD.test(name));
 const dimensions=setting?[]:dimensionsIn1G(name);const propertyShaped=PROPERTY_WORDS.test(name)||!!unit||/:\s*$/.test(raw)||dimensions.length>0;
 const quantityLike=new RegExp(`^\\s*(?:[£$€]\\s?)?${NUM}\\s?(?:${UNIT_RE})?\\s*$`,'i').test(name);
 const docOrCode=modelCode||!!docEntity;
 const property=!placeholder&&!(L.has('GL1_values_are_not_labels')&&quantityLike)&&!setting&&propertyShaped&&!(L.has('GL8_property_head_precedence')&&docOrCode&&!PROPERTY_HEAD.test(name.replace(/\b[A-Za-z0-9-]*\d[A-Za-z0-9-]*\b/g,'')))&&!(modelCode&&!PROPERTY_WORDS.test(name.replace(/\b[A-Za-z0-9-]*\d[A-Za-z0-9-]*\b/g,'')));
 const prose=L.has('GL9_prose_labels_state_no_conditions')&&raw.split(/\s+/).length>12;
 return {text:raw,name,unit,qualifiers:prose?[]:qualifiers,labelConditions:L.has('GL6_label_conditions')&&!prose?labelConditions(name,dimensions):[],empty:!name||placeholder||isDash(name),entity:!placeholder&&!setting&&!quantityLike&&(modelCode||!!docEntity)&&words<=10,modelCode,docEntity,setting,property,dimensions,quantityLike,longText:words>12};
}

// ---------------------------------------------------------------------------------------------------------------------
// Document model (the whole transient document, document order)
export interface Block1G {index:number;tag:string;locator:string;text:string;sectionPath:number[];kind:'method'|'declaration'|'estimate'|'other';dimensions:string[];tableIndex:number|null}
export interface Heading1G {index:number;level:number;text:string;locator:string;isMethodHeading:boolean}
export interface DocumentModel1G {headings:Heading1G[];blocks:Block1G[];names:{text:string;source:string;locator:string}[];principal:string|null;tableBlock:Map<number,number>}
const RAW=new Set(['script','style','textarea','title','noscript','template','xmp','iframe','noembed','noframes']);
const INLINE=new Set(['span','a','b','strong','em','i','sup','sub','small','abbr','code','mark','u','s','q','cite','time','data','label']);
function textOf(n:Node245):string{let s='';const w=(x:Node245)=>{if(x.kind==='text'){s+=decodeHtml5Text1F(x.rawText??x.text);return;}if(RAW.has(x.tag))return;
 const block=!INLINE.has(x.tag);if(block)s+=' ';for(const c of x.children)w(c);if(block)s+=' ';};w(n);return s.replace(/[\t\n\f\r ]+/g,' ').trim();}
const BLOCK_TAGS=new Set(['p','li','dt','dd','blockquote','figcaption','pre','summary']);
// audit S77 (A1-1): a recurrence ("per day", "per cycle") makes an estimate only for a cost; for litres or kWh it is
// the reporting basis of a measured or declared value
const COST_CONTEXT=/\b(?:costs?|price|bill|spend|tariff|pence|cents?)\b|[£$€]/i;
// R3-P: a test or declaration cue that a negator governs ("not what manufacturers claim", "we did not test") is not a cue
// (shared scope, src/language_scope.ts); the block is classified on the text with the negated cues blanked out
const unnegated1G=(t:string)=>maskNegated(t,[DECLARATION_CUE272],undefined,[TEST_CONTEXT272,TEST_CUE]).text;
const blockKind=(t0:string):Block1G['kind']=>{const t=unnegated1G(t0);return blockKindRaw(t);};
const blockKindRaw=(t:string):Block1G['kind']=>(EXPLICIT_ESTIMATE.test(t)||(RECURRENCE.test(t)&&COST_CONTEXT.test(t)))&&/\b(?:we|i|our)\b/i.test(t)?'estimate':TEST_CONTEXT272.test(t)||(/\b(?:we|i)\b/i.test(t)&&TEST_CUE.test(t))?'method':DECLARATION_CUE272.test(t)?'declaration':'other';
/** WD: the 1G block classification (method, declaration, estimate, other), shared with the whole-document reader. */
export const blockKind1G=(t:string):Block1G['kind']=>blockKind(t);
export const isMethodHeading1G=(t:string)=>METHOD_HEAD.test(t);
export function documentModel1G(html:string):DocumentModel1G{
 const {root}=parseHtml245(html,{keepSource:true});const headings:Heading1G[]=[];const blocks:Block1G[]=[];const names:DocumentModel1G['names']=[];
 const tableBlock=new Map<number,number>();let tableIdx=0;let stack:number[]=[];
 const inside=(n:Node245,pred:(a:Node245)=>boolean)=>{for(let a=n.parent;a;a=a.parent)if(pred(a))return true;return false;};
 const taken=new Set<Node245>();
 for(const n of walk245(root)){if(n.kind!=='element')continue;
  if(n.tag==='script'&&/ld\+json/i.test(n.attrs.type??'')){collectLd(n.text,names,locator245(n));continue;}
  if(RAW.has(n.tag)||inside(n,a=>RAW.has(a.tag)))continue;
  if(n.tag==='table'){const ti=tableIdx++;const outer=inside(n,a=>a.tag==='table');
   const bi=blocks.length;blocks.push({index:bi,tag:'table',locator:locator245(n),text:'',sectionPath:[...stack],kind:'other',dimensions:[],tableIndex:ti});tableBlock.set(ti,bi);void outer;continue;}
  const h=/^h([1-6])$/.exec(n.tag);
  if(h){const L=+h[1];const t=textOf(n);const idx=headings.length;headings.push({index:idx,level:L,text:t,locator:locator245(n),isMethodHeading:METHOD_HEAD.test(t)});
   stack=stack.filter(i=>headings[i].level<L);stack.push(idx);if(t)names.push({text:t,source:'heading',locator:locator245(n)});continue;}
  if(n.tag==='a'&&n.attrs.href&&!inside(n,a=>a.tag==='table')){const t=textOf(n);if(t&&t.split(' ').length<=8)names.push({text:t,source:'link',locator:locator245(n)});}
  if(n.attrs.itemprop==='name'){const t=textOf(n);if(t)names.push({text:t,source:'microdata',locator:locator245(n)});}
  if(BLOCK_TAGS.has(n.tag)&&!inside(n,a=>a.tag==='table'||taken.has(a)||/^h[1-6]$/.test(a.tag))){const t=textOf(n);if(!t)continue;taken.add(n);
   blocks.push({index:blocks.length,tag:n.tag,locator:locator245(n),text:t,sectionPath:[...stack],kind:blockKind(t),dimensions:dimensionsIn1G(t),tableIndex:null});}}
 const title=[...walk245(root)].find(n=>n.tag==='title');if(title)names.push({text:decodeHtml5Text1F(title.text).trim(),source:'title',locator:'title'});
 const og=[...walk245(root)].find(n=>n.tag==='meta'&&(n.attrs.property==='og:title'||n.attrs.name==='og:title'));if(og?.attrs.content)names.push({text:og.attrs.content,source:'title',locator:'meta[og:title]'});
 // the subject a page title or h1 names: its first segment before a site separator, without an editorial suffix
 for(const t of names.filter(n=>n.source==='title'||n.source==='heading'&&headings.find(h=>h.locator===n.locator)?.level===1).map(n=>n.text)){
  const seg=t.split(/\s[|–—-]\s|:\s/)[0].replace(/\s+(?:review|reviews|full review|hands-on|tested|specs|specifications)$/i,'').trim();
  if(seg&&seg!==t&&seg.split(' ').length>=2)names.push({text:seg,source:'title_segment',locator:'title'});}
 const prods=[...new Set(names.filter(n=>n.source==='json-ld-product').map(n=>n.text))];
 return {headings,blocks,names,principal:prods.length===1?prods[0]:null,tableBlock};
}
/** GL10: a structured name is a subject only when it is name-shaped; editorial suffixes are removed. */
export function nameShapedPrincipal1G(p:string|null):string|null{if(!p)return null;const t=p.replace(/\s+(?:review|reviews|full review)$/i,'').trim();
 return t.split(/\s+/).length<=10&&!/[.!?;]\s|[.!?]$|…/.test(t)?t:null;
}
function collectLd(raw:string,out:DocumentModel1G['names'],loc:string){let j:unknown;try{j=JSON.parse(raw);}catch{return;}
 const visit=(o:unknown)=>{if(Array.isArray(o)){o.forEach(visit);return;}if(!o||typeof o!=='object')return;const r=o as Record<string,unknown>;
  const ty=([] as unknown[]).concat(r['@type']??[]).map(String);
  if(ty.some(t=>/^(?:Product|ProductModel|IndividualProduct)$/.test(t))&&typeof r.name==='string')out.push({text:r.name,source:'json-ld-product',locator:loc});
  if(ty.includes('Review')&&r.itemReviewed&&typeof (r.itemReviewed as Record<string,unknown>).name==='string')out.push({text:String((r.itemReviewed as Record<string,unknown>).name),source:'json-ld-product',locator:loc});
  if(ty.includes('ListItem')&&typeof r.name==='string')out.push({text:r.name,source:'json-ld-list',locator:loc});
  for(const v of Object.values(r))if(v&&typeof v==='object')visit(v);};visit(j);}

// ---------------------------------------------------------------------------------------------------------------------
// Hypotheses and joint evaluation
export type AxisRole1G='product'|'property'|'condition'|'record';
export interface Hypothesis1G {id:string;headerRows:number;headerCols:number;colLevels:AxisRole1G[];rowLevels:AxisRole1G[];layout:boolean;subject:'axis'|'document'|'none'}
export interface Evidence1G {signal:string;polarity:1|-1;weak?:boolean;axis?:'row'|'col'|'table';detail:string}
export interface ScoredHypothesis1G {hypothesis:Hypothesis1G;support:number;weak:number;violations:string[];evidence:Evidence1G[]}
export interface ContextLink1G {block:number;locator:string;tag:string;kind:Block1G['kind'];scope:'same_section'|'ancestor_section'|'method_section';sharedDimensions:string[];mentionsTableEntity:boolean;applies:boolean;reason:string}
const ROLES:AxisRole1G[]=['product','property','condition','record'];
const combos=(n:number):AxisRole1G[][]=>n===0?[[]]:combos(n-1).flatMap(c=>ROLES.map(r=>[...c,r]));
interface Names1G {structured:string[];headings:string[]}
interface Ctx {t:TableAcquisition1F;grid:(SourceCell1F|null)[][];R:number;C:number;feat:Map<number,LabelFeatures1G>;els:Map<number,Element1G[]>;nameValue:Map<number,boolean>;doc:DocumentModel1G;context:ContextLink1G[];L:Lessons}
const cellAt=(x:Ctx,r:number,c:number)=>x.grid[r]?.[c]??null;
const uniqCells=(cs:(SourceCell1F|null)[])=>cs.filter((c,i,a)=>c&&a.indexOf(c)===i) as SourceCell1F[];
const VALUE_KINDS=new Set<ElementKind1G>(['quantity','number','currency','rating','range','bound']);
const isQuantCell=(x:Ctx,c:SourceCell1F)=>(x.els.get(c.id)??[]).some(e=>VALUE_KINDS.has(e.kind));
/** As a label, a cell holds a value only when its name (outside parenthesised qualifiers) does. */
const nameHoldsValue=(x:Ctx,c:SourceCell1F)=>x.nameValue.get(c.id)===true;
const modalDim=(x:Ctx,c:SourceCell1F)=>(x.els.get(c.id)??[]).map(e=>e.dimension).find(Boolean)??null;
const homogeneity=(dims:(string|null)[])=>{const d=dims.filter(Boolean) as string[];if(d.length<2)return null;const m=new Map<string,number>();for(const k of d)m.set(k,(m.get(k)??0)+1);return Math.max(...m.values())/d.length;};

function compatible(x:Ctx,role:AxisRole1G,f:LabelFeatures1G):'yes'|'no'|'neutral'{
 if(f.empty)return 'neutral';const g1=x.L.has('GL1_values_are_not_labels');
 if(g1&&f.quantityLike)return role==='condition'?'neutral':'no';
 if(role==='product')return f.entity?'yes':f.setting||(f.property&&!f.docEntity)?'no':'neutral';
 if(role==='property')return f.entity&&!f.property?'no':f.property?'yes':f.setting?'no':'neutral';
 if(role==='condition')return f.setting||(!g1&&f.quantityLike)?'yes':f.entity||f.property?'no':'neutral';// a bare quantity is a value unless the markup makes it a label
 return f.entity||f.setting||f.property?'no':'yes';// record: plain row items (dishes, appliance types, methods)
}
function scoreHypothesis(x:Ctx,h:Hypothesis1G):ScoredHypothesis1G{
 const ev:Evidence1G[]=[];const viol:string[]=[];const {R,C}=x;const hr=h.headerRows,hc=h.headerCols;
 const add=(signal:string,p:1|-1,axis:Evidence1G['axis'],detail:string,weak=false)=>ev.push({signal,polarity:p,axis,detail,...(weak?{weak}:{})});
 const done=()=>({hypothesis:h,support:ev.reduce((a,e)=>a+(e.weak?0:e.polarity),0),weak:ev.filter(e=>e.weak).reduce((a,e)=>a+e.polarity,0),violations:viol,evidence:ev});
 const anyValues=x.t.cells.some(c=>isQuantCell(x,c));
 if(h.layout){
  const longOrLinks=x.t.cells.filter(c=>c.links.length||c.normalisedText.split(/\s+/).length>12).length;
  if(longOrLinks>=x.t.cells.length*0.5)add('layout_content',1,'table',`${longOrLinks} of ${x.t.cells.length} cells are links or long text`);
  if(!anyValues)add('no_values',1,'table','no cell holds a number');else add('values_present',-1,'table','cells hold numbers');
  return done();}
 const body=uniqCells([...Array(Math.max(0,R-hr)).keys()].flatMap(i=>[...Array(Math.max(0,C-hc)).keys()].map(j=>cellAt(x,hr+i,hc+j)))).filter(k=>k.gridRow!>=hr&&k.gridCol!>=hc);
 if(!body.length)viol.push('no_body_cells');
 const bodyQuant=body.filter(c=>isQuantCell(x,c));
 const colLabels=(lvl:number)=>uniqCells([...Array(C-hc).keys()].map(i=>cellAt(x,lvl,hc+i)));
 const rowLabels=(lvl:number)=>uniqCells([...Array(R-hr).keys()].map(i=>cellAt(x,hr+i,lvl)));
 const levelCheck=(axis:'row'|'col',roles:AxisRole1G[],labelsOf:(l:number)=>SourceCell1F[])=>roles.forEach((role,l)=>{
  const ls=labelsOf(l).filter(c=>!x.feat.get(c.id)!.empty);if(!ls.length){viol.push(`${axis}_level_${l}_no_labels`);return;}
  const valueLabels=ls.filter(c=>(x.L.has('GL1_values_are_not_labels')?nameHoldsValue(x,c):isQuantCell(x,c)&&!x.feat.get(c.id)!.quantityLike)&&!x.feat.get(c.id)!.property&&!x.feat.get(c.id)!.entity&&!x.feat.get(c.id)!.setting);
  if(valueLabels.length>=0.5*ls.length)add('label_level_holds_values',-1,axis,`${axis} level ${l}: ${valueLabels.length}/${ls.length} labels are values`);
  const comp=ls.map(c=>compatible(x,role,x.feat.get(c.id)!));const yes=comp.filter(v=>v==='yes').length,no=comp.filter(v=>v==='no').length;
  if(yes>=Math.max(1,0.6*ls.length))add('label_types_agree',1,axis,`${axis} level ${l} as ${role}: ${yes}/${ls.length} labels fit`);
  else if(no>=0.5*ls.length)add('label_types_disagree',-1,axis,`${axis} level ${l} as ${role}: ${no}/${ls.length} labels contradict`);
  if(role==='product'){const grounded=ls.filter(c=>x.feat.get(c.id)!.docEntity).length;if(grounded>=Math.min(2,ls.length))add('labels_named_in_document',1,axis,`${grounded} product labels are named elsewhere in the document`);
   const names=ls.map(c=>norm(x.feat.get(c.id)!.name));if(new Set(names).size<names.length)add('duplicate_entities',-1,axis,'the same product label repeats on one axis');}
  if(role==='condition'&&ls.length<2)add('single_condition',-1,axis,'a condition axis with one label');});
 levelCheck('col',h.colLevels,colLabels);levelCheck('row',h.rowLevels,rowLabels);
 const markedRowAll=(r:number)=>{const cs=uniqCells([...Array(C).keys()].map(c=>cellAt(x,r,c)));return cs.length>0&&cs.every(c=>c.header||c.section==='thead');};
 const markedColAll=(c:number)=>{const cs=uniqCells([...Array(R).keys()].map(r=>cellAt(x,r,c)));return cs.length>0&&cs.every(k=>k.header||k.scope==='row');};
 const fits=(ls:SourceCell1F[],role:AxisRole1G)=>{const ne=ls.filter(c=>!x.feat.get(c.id)!.empty);return (role==='product'||role==='condition')&&ne.length>=2&&ne.filter(c=>compatible(x,role,x.feat.get(c.id)!)==='yes').length>=0.6*ne.length&&!ne.some(c=>x.feat.get(c.id)!.quantityLike);};
 for(let l=1;l<hr;l++)if(x.L.has('GL2_hierarchy_needs_evidence')&&!markedRowAll(l)&&!colLabels(l-1).some(k=>(k.colspan??1)>1)&&!fits(colLabels(l),h.colLevels[l]))viol.push(`unjustified_header_row_${l}`);
 for(let l=1;l<hc;l++)if(x.L.has('GL2_hierarchy_needs_evidence')&&!markedColAll(l)&&!rowLabels(l-1).some(k=>(k.rowspan??1)>1)&&!fits(rowLabels(l),h.rowLevels[l]))viol.push(`unjustified_header_column_${l}`);
 const allRoles=[...h.colLevels,...h.rowLevels];
 if(allRoles.filter(r=>r==='product').length>1)viol.push('two_product_levels');
 if(allRoles.filter(r=>r==='property').length>1)viol.push('two_property_levels');
 // explicit HTML header structure
 const markedRow=(r:number)=>{const cs=uniqCells([...Array(C).keys()].map(c=>cellAt(x,r,c)));return cs.length>0&&cs.every(c=>c.header||c.section==='thead');};
 const markedCol=(c:number)=>{const cs=uniqCells([...Array(Math.max(0,R-hr)).keys()].map(i=>cellAt(x,hr+i,c)));return cs.length>0&&cs.every(k=>k.header||k.scope==='row');};
 const thCount=x.t.cells.filter(c=>c.header||c.section==='thead').length;
 if(thCount){
  if(hr>0&&[...Array(hr).keys()].every(markedRow))add('markup_header',1,'col','header rows are marked th/thead');
  if(hc>0&&[...Array(hc).keys()].every(markedCol))add('markup_header',1,'row','header columns are marked th');
  if(hr<R&&markedRow(hr)&&!markedCol(0))add('markup_header_ignored',-1,'col','the first body row is marked as header');
  if(hc<C&&hr<R&&markedCol(hc)&&!markedRow(hr))add('markup_header_ignored',-1,'row','the first body column is marked as header');}
 // header/body contrast (WDC-style)
 const hdrCells=uniqCells([...[...Array(hr).keys()].flatMap(r=>[...Array(C).keys()].map(c=>cellAt(x,r,c))),...[...Array(R).keys()].flatMap(r=>[...Array(hc).keys()].map(c=>cellAt(x,r,c)))]);
 const valueLike=(c:SourceCell1F)=>{const f=x.feat.get(c.id)!;return (x.L.has('GL1_values_are_not_labels')?nameHoldsValue(x,c):isQuantCell(x,c)&&!f.quantityLike)&&!f.setting&&!f.property&&!f.entity;};
 if(hdrCells.length&&body.length){const hq=hdrCells.filter(valueLike).length/hdrCells.length,bq=bodyQuant.length/body.length;
  if(anyValues&&bq-hq>=0.3)add('header_body_contrast',1,'table',`body ${Math.round(bq*100)}% values vs headers ${Math.round(hq*100)}%`);
  else if(hq>0.5)add('headers_look_like_body',-1,'table','most header cells hold values');}
 // body consistency under the roles (joint: a line's type must agree with its cells and with its label)
 const propAxis=h.colLevels.includes('property')?'col':h.rowLevels.includes('property')?'row':null;
 if(propAxis){const nLines=propAxis==='col'?C-hc:R-hr;const lvl=(propAxis==='col'?h.colLevels:h.rowLevels).indexOf('property');
  const hom:number[]=[];let agree=0,disagree=0;
  for(let k=0;k<nLines;k++){const cs=uniqCells(propAxis==='col'?[...Array(R-hr).keys()].map(j=>cellAt(x,hr+j,hc+k)):[...Array(C-hc).keys()].map(i=>cellAt(x,hr+k,hc+i)));
   const v=homogeneity(cs.map(c=>modalDim(x,c)));if(v!==null)hom.push(v);
   const lab=propAxis==='col'?cellAt(x,lvl,hc+k):cellAt(x,hr+k,lvl);const f=lab?x.feat.get(lab.id)!:null;const ld=f?[...f.dimensions,...(f.unit?[f.unit.dimension]:[])]:[];
   const cd=cs.map(c=>modalDim(x,c)).filter(Boolean) as string[];
   if(ld.length&&cd.length){if(cd.filter(d=>ld.includes(d)).length>=0.5*cd.length)agree++;else disagree++;}}
  if(hom.length){const m=hom.reduce((a,b)=>a+b,0)/hom.length;if(m>=0.8)add('property_lines_homogeneous',1,propAxis,`property lines hold one dimension (mean ${m.toFixed(2)} over ${hom.length} lines)`);
   else if(m<0.5)add('property_lines_mixed',-1,propAxis,`property lines mix dimensions (mean ${m.toFixed(2)})`);}
  if(agree>disagree)add('labels_match_contents',1,propAxis,`${agree} property labels name the dimension of their cells, ${disagree} do not`);
  else if(disagree>agree)add('labels_contradict_contents',-1,propAxis,`${disagree} property labels name another dimension than their cells`);
 }else if(bodyQuant.length){// only units printed in the cells count as body evidence (a label's unit would confirm the hypothesis by itself)
  const v=homogeneity(bodyQuant.map(c=>modalDim(x,c)));
  if(v!==null&&v>=0.8){add('body_one_quantity',1,'table','all values share one dimension (a quantity fixed for the table)');
   const src=quantitySource(x,h);if(src)add('quantity_named',1,'table',`the quantity is named by ${src}`);else add('quantity_unnamed',-1,'table','no label, caption or heading names the quantity');}
  else if(v!==null)add('mixed_quantities_without_property_axis',-1,'table','values of several dimensions but no property axis');}
 if(h.subject==='document'){if(x.doc.principal)add('document_subject',1,'table','the document names one product in structured data');else add('no_document_subject',-1,'table','no single structured product name for a table without a product axis');}
 // weak corroboration only: monotone values along a condition axis
 const condAxis=h.colLevels.includes('condition')?'col':h.rowLevels.includes('condition')?'row':null;
 if(condAxis){let mono=0,lines=0;const n=condAxis==='col'?R-hr:C-hc;
  for(let i=0;i<n;i++){const vals=uniqCells(condAxis==='col'?[...Array(C-hc).keys()].map(j=>cellAt(x,hr+i,hc+j)):[...Array(R-hr).keys()].map(j=>cellAt(x,hr+j,hc+i)))
    .map(c=>(x.els.get(c.id)??[]).find(e=>e.value!==null)?.value??null).filter((v):v is number=>v!==null);
   if(vals.length>=3){lines++;if(vals.every((v,k)=>k===0||v>=vals[k-1])||vals.every((v,k)=>k===0||v<=vals[k-1]))mono++;}}
  if(lines&&mono===lines)add('monotone_along_conditions',1,condAxis,`${mono} lines change monotonically along the condition axis (weak)`,true);}
 return done();
}
function quantitySource(x:Ctx,h:Hypothesis1G):string|null{
 const labels=x.t.cells.filter(c=>c.gridRow!==null&&(c.gridRow<h.headerRows||c.gridCol!<h.headerCols));
 if(labels.some(c=>x.feat.get(c.id)!.unit||x.feat.get(c.id)!.dimensions.length))return 'a header label';
 if(x.t.caption&&dimensionsIn1G(x.t.caption.normalisedText).length)return 'the caption';
 const hp=x.t.context.headingPath;if(hp.length&&dimensionsIn1G(hp[hp.length-1].decodedText).length)return 'the section heading';
 return null;
}
function hypotheses(x:Ctx):Hypothesis1G[]{
 const out:Hypothesis1G[]=[{id:'layout',headerRows:0,headerCols:0,colLevels:[],rowLevels:[],layout:true,subject:'none'}];
 for(let hr=0;hr<=Math.min(LIMITS1G.maxHeaderRows,x.R-1);hr++)for(let hc=0;hc<=Math.min(LIMITS1G.maxHeaderCols,x.C-1);hc++)
  for(const cl of combos(hr))for(const rl of combos(hc)){const roles=[...cl,...rl];if(!roles.length)continue;
   const subject:Hypothesis1G['subject']=roles.includes('product')?'axis':roles.some(r=>r==='property'||r==='condition')?'document':'none';
   out.push({id:`h${hr}c${hc}:${cl.join('+')||'-'}|${rl.join('+')||'-'}`,headerRows:hr,headerCols:hc,colLevels:cl,rowLevels:rl,layout:false,subject});}
 return out;
}
/** Ordering: no constraint violation first, then support, then weak corroboration, then fewer header levels (parsimony). */
const cmp=(a:ScoredHypothesis1G,b:ScoredHypothesis1G)=>((b.violations.length===0?1:0)-(a.violations.length===0?1:0))||b.support-a.support||b.weak-a.weak||
 (a.hypothesis.headerRows+a.hypothesis.headerCols)-(b.hypothesis.headerRows+b.hypothesis.headerCols);
const roleKey=(h:Hypothesis1G)=>h.layout?'layout':`${h.headerRows}/${h.headerCols}/${h.colLevels.join('+')}/${h.rowLevels.join('+')}`;

// ---------------------------------------------------------------------------------------------------------------------
// Context links: which document statements plausibly describe this table
function contextLinks(x:Ctx,tableDims:string[],entityNames:string[]):ContextLink1G[]{
 const bi=x.doc.tableBlock.get(x.t.index);if(bi===undefined)return [];const own=x.doc.blocks[bi].sectionPath;const leaf=own[own.length-1];
 const out:ContextLink1G[]=[];
 for(const b of x.doc.blocks){if(b.tableIndex!==null||b.kind==='other')continue;const bl=b.sectionPath[b.sectionPath.length-1];
  const same=leaf!==undefined&&bl===leaf||leaf===undefined&&bl===undefined;const ancestor=!same&&bl!==undefined&&own.includes(bl);
  const methodSection=b.sectionPath.some(i=>x.doc.headings[i]?.isMethodHeading);
  const scope:ContextLink1G['scope']|null=same?'same_section':ancestor?'ancestor_section':methodSection?'method_section':null;if(!scope)continue;
  const shared=b.dimensions.filter(d=>tableDims.includes(d));const ents=entityNames.some(n=>n.length>=4&&norm(b.text).includes(norm(n)));
  const applies=shared.length>0&&(same||ents||!x.L.has('GL4_scoped_method_statements')&&methodSection);
  out.push({block:b.index,locator:b.locator,tag:b.tag,kind:b.kind,scope,sharedDimensions:shared,mentionsTableEntity:ents,applies,
   reason:applies?`${b.kind} statement in the ${scope.replace(/_/g,' ')} naming ${shared.join(', ')}`:shared.length?`${scope.replace(/_/g,' ')}: no structural link to this table`:'names no quantity of this table'});}
 return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Observations
export type EvidenceClass1G='publisher_measured'|'manufacturer_declared'|'nominal_certified'|'derived_or_estimated'|'price'|'rating_score'|'setting'|'identifier'|'categorical'|'disputed'|'unknown';
export interface Observation1G {id:string;table:number;cell:number;element:number;sourceCells:number[];surface:string;
 kind:ElementKind1G;value:number|null;low?:number;high?:number;text:string|null;unit:string|null;unitSource:'cell'|'column_header'|'row_header'|'caption'|null;dimension:string|null;
 product:string|null;productSource:'column_header'|'row_header'|'document'|'identity_properties'|null;records:string[];conditionSources:{text:string;source:string}[];property:string[];conditions:string[];
 evidence:{class:EvidenceClass1G;level:string|null;support:string[];contradictions:string[]};methodLinks:number[];unresolved:string[]}
export interface TableInterpretation1G {table:number;locator:string;status:'interpreted'|'ambiguous'|'layout'|'not_interpreted';reason?:string;
 /** Axes without labels that the interpretation still gives a meaning: one quantity fixed for the body, or records identified by key properties. */
 implicitAxes?:{row?:'measure'|'product';col?:'measure'|'product'};
 selected:ScoredHypothesis1G|null;alternatives:ScoredHypothesis1G[];tied:string[];context:ContextLink1G[];observations:Observation1G[];missing:{cell:number;meaning:'unknown'}[];digest:string}
export interface DocumentInterpretation1G {schema:'pee.table-interpretation.v1g';version:string;lessons:InterpreterLessonId1G[];readingIdentity:string;limits:typeof LIMITS1G;passes:number;tables:TableInterpretation1G[];documentEntitiesLearned:string[]}

function build(t:TableAcquisition1F,doc:DocumentModel1G,names:Names1G,L:Lessons):Ctx{
 const R=t.counts.rows,C=t.counts.cols;const placed=t.cells.filter(c=>c.gridRow!==null);// Phase245 grid ids follow source order of placed cells
 const grid:(SourceCell1F|null)[][]=[...Array(R)].map((_,r)=>[...Array(C)].map((__,c)=>{const id=t.slot?.[r]?.[c]??-1;return id>=0?placed[id]??null:null;}));
 const feat=new Map<number,LabelFeatures1G>(),els=new Map<number,Element1G[]>();
 const nameValue=new Map<number,boolean>();
 for(const c of t.cells){const f=labelFeatures1G(c.normalisedText,names.structured,names.headings,L);feat.set(c.id,f);els.set(c.id,cellElements1G(c.normalisedText));nameValue.set(c.id,cellElements1G(f.name).some(e=>VALUE_KINDS.has(e.kind)));}
 return {t,grid,R,C,feat,els,nameValue,doc,context:[],L};
}
function interpretOne(t:TableAcquisition1F,doc:DocumentModel1G,names:Names1G,L:Lessons):TableInterpretation1G{
 const base={table:t.index,locator:t.locator,selected:null,alternatives:[],tied:[],context:[],observations:[],missing:[],digest:''};
 const R=t.counts.rows,C=t.counts.cols;
 if(t.status!=='complete')return {...base,status:'not_interpreted',reason:'acquisition '+t.status+': '+t.reasons.map(r=>r.code).join(',')};
 if(R<LIMITS1G.minRows||R>LIMITS1G.maxRows||C<LIMITS1G.minCols||C>LIMITS1G.maxCols)return {...base,status:'not_interpreted',reason:`outside the first-implementation limits (${R}x${C})`};
 const x=build(t,doc,names,L);
 const scored=hypotheses(x).map(h=>scoreHypothesis(x,h)).sort(cmp);
 const best=scored[0];const equal=(s:ScoredHypothesis1G)=>s.violations.length===best.violations.length&&s.support===best.support&&s.weak===best.weak;
 const tied=scored.filter(s=>s!==best&&equal(s)&&roleKey(s.hypothesis)!==roleKey(best.hypothesis)&&
  (s.hypothesis.headerRows+s.hypothesis.headerCols)===(best.hypothesis.headerRows+best.hypothesis.headerCols));
 const alternatives=scored.filter(s=>s!==best).slice(0,5);
 if(best.hypothesis.layout)return {...base,status:'layout',reason:'the layout hypothesis is best supported',selected:best,alternatives,digest:sha('layout')};
 if(best.violations.length||best.support<=0)return {...base,status:'ambiguous',reason:'no data hypothesis has positive support without violations',selected:best,alternatives,digest:sha('none')};
 const tableDims=[...new Set(t.cells.flatMap(c=>[...(x.els.get(c.id)??[]).map(e=>e.dimension),...x.feat.get(c.id)!.dimensions,x.feat.get(c.id)!.unit?.dimension].filter(Boolean) as string[]))];// labels' units count ("Product (dBA)")
 x.context=contextLinks(x,tableDims,t.cells.filter(c=>x.feat.get(c.id)!.entity).map(c=>x.feat.get(c.id)!.name));
 const sets=[best,...tied].map(s=>observations(x,s.hypothesis));
 const merged=sets[0].map(o=>{const others=sets.slice(1).map(set=>set.find(p=>p.id===o.id));const un=[...o.unresolved];const out={...o};
  if(others.some(p=>!p||p.product!==o.product)){un.push('product: competing interpretations disagree');out.product=null;out.productSource=null;}
  if(others.some(p=>!p||p.conditions.join('|')!==o.conditions.join('|'))){un.push('conditions: competing interpretations disagree');out.conditions=[];}
  if(others.some(p=>!p||p.property.join('|')!==o.property.join('|'))){un.push('property: competing interpretations disagree');out.property=[];}
  if(others.some(p=>!p||p.evidence.class!==o.evidence.class)){un.push('evidence class: competing interpretations disagree');out.evidence={...o.evidence,class:'unknown'};}
  return {...out,unresolved:un};});
 const missing=t.cells.filter(c=>c.gridRow!==null&&c.gridRow>=best.hypothesis.headerRows&&c.gridCol!>=best.hypothesis.headerCols&&(isDash(c.normalisedText)||!c.normalisedText)).map(c=>({cell:c.id,meaning:'unknown' as const}));
 const implicit:NonNullable<TableInterpretation1G['implicitAxes']>={};const hb=best.hypothesis;
 if(best.evidence.some(e=>e.signal==='body_one_quantity')){if(!hb.colLevels.length)implicit.col='measure';else if(!hb.rowLevels.length)implicit.row='measure';}
 if(merged.some(o=>o.productSource==='identity_properties')){if(!hb.colLevels.length)implicit.col='product';else if(!hb.rowLevels.length)implicit.row='product';}
 return {...base,implicitAxes:implicit,status:tied.length?'ambiguous':'interpreted',...(tied.length?{reason:'equally supported interpretations; fields they disagree on are unresolved'}:{}),selected:best,alternatives,tied:tied.map(s=>s.hypothesis.id),
  context:x.context,observations:merged,missing,digest:sha(JSON.stringify([roleKey(best.hypothesis),merged.map(o=>[o.id,o.product,o.property,o.conditions,o.evidence.class])]))};
}
const BRAND_LABEL=/^(?:brand|manufacturer|make)$/i,MODEL_LABEL=/^(?:model(?: name| number| no\.?)?|product name|name)$/i;
/** Identity from key attributes: when one axis holds properties and the other has no product labels, a line's brand and model
 * properties compose the product it describes ("Winix" + "A231"). Only exact cell texts are used; nothing is completed. */
function identityLines(x:Ctx,h:Hypothesis1G):{identity:Map<string,string>;lineKey:(c:SourceCell1F)=>string}{
 const identity=new Map<string,string>();const propAxis=h.rowLevels.includes('property')?'row':h.colLevels.includes('property')?'col':null;
 const lineKey=(c:SourceCell1F)=>propAxis==='row'?`c${c.gridCol}`:`r${c.gridRow}`;
 if(!x.L.has('GL7_identity_from_key_properties')||!propAxis||[...h.colLevels,...h.rowLevels].includes('product'))return {identity,lineKey};
 const lvl=(propAxis==='row'?h.rowLevels:h.colLevels).indexOf('property');const {R,C}=x;const hr=h.headerRows,hc=h.headerCols;
 const lines=propAxis==='row'?[...Array(R-hr).keys()].map(j=>hr+j):[...Array(C-hc).keys()].map(i=>hc+i);
 const lab=(i:number)=>{const k=propAxis==='row'?cellAt(x,i,lvl):cellAt(x,lvl,i);return k?x.feat.get(k.id)!.name:'';};
 const brand=lines.find(i=>BRAND_LABEL.test(lab(i))),model=lines.find(i=>MODEL_LABEL.test(lab(i)));if(model===undefined)return {identity,lineKey};
 const across=propAxis==='row'?[...Array(C-hc).keys()].map(i=>hc+i):[...Array(R-hr).keys()].map(j=>hr+j);
 for(const a of across){const v=(line:number)=>{const k=propAxis==='row'?cellAt(x,line,a):cellAt(x,a,line);return k?k.normalisedText.trim():'';};
  const m=v(model),b=brand!==undefined?v(brand):'';if(!m||isDash(m))continue;
  identity.set(propAxis==='row'?`c${a}`:`r${a}`,b&&!norm(m).startsWith(norm(b))?`${b} ${m}`:m);}
 return {identity,lineKey};
}
/** Sibling property labels that share the same quantity words ("Energy consumption standard clean", "Energy consumption eco
 * clean") differ by their condition: the words not common to the group are that label's condition. */
function siblingConditions(x:Ctx,h:Hypothesis1G):Map<number,string>{
 const out=new Map<number,string>();if(!x.L.has('GL6_label_conditions'))return out;const axis=h.colLevels.includes('property')?'col':h.rowLevels.includes('property')?'row':null;if(!axis)return out;
 const lvl=(axis==='col'?h.colLevels:h.rowLevels).indexOf('property');const {R,C}=x;
 const labels=uniqCells(axis==='col'?[...Array(C-h.headerCols).keys()].map(i=>cellAt(x,lvl,h.headerCols+i)):[...Array(R-h.headerRows).keys()].map(j=>cellAt(x,h.headerRows+j,lvl))).filter(k=>!x.feat.get(k.id)!.empty);
 const toks=(k:SourceCell1F)=>x.feat.get(k.id)!.name.replace(new RegExp(`${NUM}\\s?(?:${UNIT_RE}|%)?`,'gi'),' ').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>1);
 const head=(k:SourceCell1F)=>{const f=x.feat.get(k.id)!;return [...f.dimensions].sort().join('+')+'|'+(f.unit?.dimension??'');};
 const groups=new Map<string,SourceCell1F[]>();for(const k of labels){const hd=head(k);if(hd==='|')continue;(groups.get(hd)??groups.set(hd,[]).get(hd)!).push(k);}
 for(const g of groups.values()){if(g.length<2)continue;const ts=g.map(toks);const common=ts[0].filter(w=>ts.every(t=>t.includes(w)));if(!common.length)continue;
  g.forEach((k,i)=>{const rest=ts[i].filter(w=>!common.includes(w));if(rest.length&&rest.length<=4)out.set(k.id,rest.join(' '));});}
 return out;}
function observations(x:Ctx,h:Hypothesis1G):Observation1G[]{
 const out:Observation1G[]=[];const hr=h.headerRows,hc=h.headerCols;const {identity,lineKey}=identityLines(x,h);const sib=siblingConditions(x,h);
 for(const cell of x.t.cells){if(cell.gridRow===null||cell.gridCol===null)continue;const r=cell.gridRow,c=cell.gridCol;if(r<hr||c<hc)continue;
  const els=x.els.get(cell.id)??[];if(!els.length)continue;
  // header paths (hierarchical coordinates): every level's labels over the cell's span
  const colPath=h.colLevels.map((role,l)=>({role,axis:'col' as const,cells:uniqCells([...Array(cell.colspan??1).keys()].map(k=>cellAt(x,l,c+k))).filter(k=>!x.feat.get(k.id)!.empty)}));
  const rowPath=h.rowLevels.map((role,l)=>({role,axis:'row' as const,cells:uniqCells([...Array(cell.rowspan??1).keys()].map(k=>cellAt(x,r+k,l))).filter(k=>!x.feat.get(k.id)!.empty)}));
  const all=[...colPath,...rowPath];const of=(role:AxisRole1G)=>all.filter(p=>p.role===role);
  const prod=of('product').flatMap(p=>p.cells.map(k=>({k,axis:p.axis})));const propLabels=of('property').flatMap(p=>p.cells);
  const condLabels=of('condition').flatMap(p=>p.cells);const recLabels=of('record').flatMap(p=>p.cells);
  let product:string|null=null,productSource:Observation1G['productSource']=null;const unresolvedCell:string[]=[];
  if(prod.length===1){product=x.feat.get(prod[0].k.id)!.name;productSource=prod[0].axis==='col'?'column_header':'row_header';}
  else if(prod.length>1)unresolvedCell.push('product: the cell spans several product labels');
  else if(identity.has(lineKey(cell))){product=identity.get(lineKey(cell))!;productSource='identity_properties';}
  else if(h.subject==='document'&&x.doc.principal){product=x.doc.principal;productSource='document';}
  else unresolvedCell.push('product: not established by the table or the document');
  const labelUnit=[...propLabels,...condLabels,...prod.map(p=>p.k)].map(k=>({k,u:x.feat.get(k.id)!.unit})).find(v=>v.u);
  const sources=[cell.id,...new Set([...prod.map(p=>p.k.id),...propLabels.map(k=>k.id),...condLabels.map(k=>k.id)])];
  els.forEach((e,i)=>{const unresolved=[...unresolvedCell];
   let unit=e.unit,unitSource:Observation1G['unitSource']=e.unit?'cell':null,dimension=e.dimension;
   if(!unit&&(e.kind==='number'||e.kind==='range'||e.kind==='bound')&&labelUnit?.u){unit=labelUnit.u.unit;dimension=labelUnit.u.dimension;unitSource=colPath.some(p=>p.cells.includes(labelUnit.k))?'column_header':'row_header';}
   if(!unit&&e.kind==='number'&&x.t.caption){const m=new RegExp('\\((?:in\\s+)?('+UNIT_RE+')\\)','i').exec(x.t.caption.normalisedText);const u=m?unitOf(m[1]):null;if(u){unit=u.unit;dimension=u.dimension;unitSource='caption';}}
   if(e.kind==='number'&&!unit)unresolved.push('unit: none printed in the cell, its labels or the caption');
   const property=[...propLabels.map(k=>x.feat.get(k.id)!.name),...(e.inCellLabel?[e.inCellLabel]:[])];
   if(!property.length&&!dimension&&VALUE_KINDS.has(e.kind))unresolved.push('property: no label names it');
   const conditions=[...condLabels.map(k=>x.feat.get(k.id)!.name),...propLabels.flatMap(k=>[...x.feat.get(k.id)!.labelConditions,...(sib.has(k.id)?[sib.get(k.id)!]:[])]),...[...propLabels,...condLabels,...(x.L.has('GL6_label_conditions')?recLabels:[]),...prod.map(p=>p.k)].flatMap(k=>x.feat.get(k.id)!.qualifiers)].filter((s,j,a)=>s&&a.indexOf(s)===j);
   const cl=classify(x,cell,e,[...propLabels,...condLabels,...prod.map(p=>p.k)],dimension);
   const ctxDims=[...new Set([dimension,...propLabels.flatMap(k=>x.feat.get(k.id)!.dimensions)].filter(Boolean) as string[])];
   const cc=VALUE_KINDS.has(e.kind)?contextConditions(x,product?[product]:[],ctxDims):[];for(const c of cc)if(!conditions.some(k=>norm(k)===norm(c.text)))conditions.push(c.text);
   const conditionSources=cc.map(c=>({text:c.text,source:c.source}));
   out.push({id:`${x.t.index}:${cell.id}:${i}`,table:x.t.index,cell:cell.id,element:i,sourceCells:sources,surface:e.surface,kind:e.kind,value:e.value,...(e.low!==undefined?{low:e.low,high:e.high}:{}),
    text:e.kind==='text'||e.kind==='boolean'?e.surface:null,unit,unitSource,dimension,product,productSource,records:recLabels.map(k=>x.feat.get(k.id)!.name),conditionSources,property,conditions,evidence:cl.evidence,methodLinks:cl.links,unresolved});});}
 return out;
}
// Context conditions (document structure, not a prose reader): explicit test parameters in method statements linked to the table.
const PARAMETERS:RegExp[]=[/(?:[£$€]\s?\d+(?:\.\d+)?|\d+(?:\.\d+)?\s?p)\s?(?:per|\/)\s?kwh/gi,/\b\d+\s?(?:hours?|hrs?|h)\s(?:a|per)\s(?:day|week)\b|\b24\/7\b/gi,
 /\bat (?:a distance of )?\d+(?:\.\d+)?\s?(?:m|cm|ft|feet|metres?|meters?)\b/gi,/\bat \d+\s?°\s?[cf]\b/gi,/\b\d[\d,]*\s?(?:cu\.? ?ft|cubic feet|sq\.? ?ft|square feet|m²|m2|m³|m3)\s(?:test )?room\b/gi,/\b(?:[A-Z][a-z]+ ){1,2}[Mm]ode\b/g];
/** S93: the parameters a statement states (an electricity tariff, hours of use, a distance, a temperature, a room size, a
 * mode), with the 1G patterns; used to keep a calculation's assumptions identifiable. */
export function statedParameters1G(text:string):{kind:'tariff'|'usage'|'distance'|'temperature'|'room'|'mode';text:string}[]{
 const kinds=['tariff','usage','distance','temperature','room','mode'] as const;const out:{kind:typeof kinds[number];text:string}[]=[];
 PARAMETERS.forEach((re,i)=>{for(const m of text.matchAll(new RegExp(re.source,re.flags)))out.push({kind:kinds[i],text:m[0].trim()});});return out;}
/** S93: a statement that announces a calculation or estimate (1G cue), and a cost or recurrence context. */
export const isCalculationText1G=(t:string)=>EXPLICIT_ESTIMATE.test(t)||RECURRENCE.test(t)&&COST_CONTEXT.test(t);
function contextConditions(x:Ctx,productNames:string[],dims:string[]):{text:string;source:string}[]{
 const out:{text:string;source:string}[]=[];void productNames;
 for(const l of x.context.filter(l=>l.applies&&l.sharedDimensions.some(d=>dims.includes(d)))){const t=x.doc.blocks[l.block].text;
  for(const re of PARAMETERS)for(const m of t.matchAll(re))out.push({text:m[0].trim(),source:'linked_statement '+l.locator});}
 return out.filter((c,i,a)=>a.findIndex(d=>norm(d.text)===norm(c.text))===i);}
function classify(x:Ctx,cell:SourceCell1F,e:Element1G,labels:SourceCell1F[],dimension:string|null):{evidence:Observation1G['evidence'];links:number[]}{
 const labelText=labels.map(k=>k.normalisedText).join(' | ');const cellText=cell.normalisedText;const only=(c:EvidenceClass1G,level:string,why:string)=>({evidence:{class:c,level,support:[why],contradictions:[]},links:[]});
 // the value's own nature first
 if(e.kind==='identifier'||(IDENT_CUE.test(labelText)&&!VALUE_KINDS.has(e.kind)))return only('identifier','value','the value is an identifier');
 if(e.kind==='rating'||(RATING_CUE.test(labelText)&&e.kind==='number'&&!e.unit))return only('rating_score','value','the value is a score');
 if(e.kind==='currency'&&!x.L.has('GL5_recurrence_qualifies_costs'))return ESTIMATE_CUE.test(labelText+' '+cellText)?only('derived_or_estimated','value','an estimated or recurring cost'):only('price','value','a price');
 if(e.kind==='currency'){const lt=labelText+' '+cellText+' '+(e.inCellLabel??'');
  if(PRICE_CUE.test(lt)&&!RECURRENCE.test(lt)&&!EXPLICIT_ESTIMATE.test(lt))return only('price','value','a price (labelled price)');
  if(ESTIMATE_CUE.test(lt)||COST_WORD.test(lt))return only('derived_or_estimated','value','a cost of use (recurring, estimated or calculated), not a price');
  return only('price','value','a currency amount without a cost-of-use label');}
 if(e.kind==='text'||e.kind==='boolean')return only('categorical','value','a categorical value');
 const levels:{level:string;text:string}[]=[{level:'cell',text:cellText},{level:'labels',text:labelText},
  {level:'table_heading_caption',text:[x.t.caption?.normalisedText??'',x.t.context.headingPath.at(-1)?.decodedText??''].join(' | ')},
  // S102 (owner review of S100: "the statement that introduces a table should contribute to the interpretation of its rows"):
  // the text that introduces the table (the two blocks just before it in its section) is read with the same cues as a
  // caption, one level below it; it is evidence about the table whatever dimensions it names (GL4 applies to other links)
  {level:'table_context',text:x.t.context.before.slice(-2).map(b=>b.decodedText).join(' | ')}];
 for(const L0 of levels){const L={level:L0.level,text:maskNegated(L0.text,[DECLARATION_CUE272,SPEC_CUE,CERT_CUE],undefined,[TEST_CUE,TEST_CONTEXT272]).text};// R3-P: negated cues are not cues
  const m=TEST_CUE.test(L.text)||TEST_CONTEXT272.test(L.text),d=DECLARATION_CUE272.test(L.text)||SPEC_CUE.test(L.text),c=CERT_CUE.test(L.text),s=(x.L.has('GL5_recurrence_qualifies_costs')?EXPLICIT_ESTIMATE:ESTIMATE_CUE).test(L.text);// recurrence (per month, /day) qualifies costs only, handled with the value
  const found:[EvidenceClass1G,string][]=[];if(c)found.push(['nominal_certified','certification term']);if(d&&!c)found.push(['manufacturer_declared','declaration or specification term']);
  if(s)found.push(['derived_or_estimated','estimate or calculation term']);if(m)found.push(['publisher_measured','test or measurement term']);
  // S102: an introduction that names more than one kind of evidence is not decisive at its level: the linked statements
  // (each read with the dimensions it names) decide
  if(L.level==='table_context'&&found.length>1)continue;
  const where=L.level.replace(/_/g,' ');
  if(found.length===1)return only(found[0][0],L.level,`${found[0][1]} in the ${where}`);
  if(found.length>1){const cls=found.map(f=>f[0]);const est=cls.length===2&&cls.includes('derived_or_estimated')&&cls.includes('publisher_measured');
   return {evidence:{class:est?'derived_or_estimated':'disputed',level:L.level,support:found.map(f=>`${f[1]} in the ${where}`),contradictions:est?[]:['conflicting evidence at the same level']},links:[]};}}
 const dims=[...new Set([dimension,...labels.flatMap(k=>[...x.feat.get(k.id)!.dimensions,x.feat.get(k.id)!.unit?.dimension])].filter(Boolean) as string[])];
 const linked=x.context.filter(l=>l.applies&&l.sharedDimensions.some(d=>dims.includes(d)));
 for(const scope of ['same_section','ancestor_section','method_section'] as const){const ls=linked.filter(l=>l.scope===scope);if(!ls.length)continue;
  const kinds=new Set(ls.map(l=>l.kind));const mixed=kinds.size>1&&!(kinds.size===2&&kinds.has('estimate')&&kinds.has('method'));
  // GL11: an input of a calculation that a method statement names keeps the method's provenance
  const input=x.L.has('GL11_calculation_inputs_keep_method')&&!mixed&&kinds.has('estimate')&&kinds.has('method')&&ls.some(l=>l.kind==='method'&&l.sharedDimensions.some(d=>dims.includes(d)));
  const cls:EvidenceClass1G=mixed?'disputed':input?'publisher_measured':kinds.has('estimate')?'derived_or_estimated':kinds.has('method')?'publisher_measured':'manufacturer_declared';
  return {evidence:{class:cls,level:'linked_'+scope,support:ls.map(l=>`${l.kind} statement (${l.locator}) naming ${l.sharedDimensions.join(', ')}`),contradictions:mixed?['statements of different kinds in the same scope']:[]},links:ls.map(l=>l.block)};}
 return {evidence:{class:'unknown',level:null,support:[],contradictions:[]},links:[]};
}

/** GL12: nearest-instance inheritance between twin tables (same quantity signature, same parent section). A table with no
 * applicable statement link takes, for its unknown values, the linked class of its twin; the level names the inheritance. */
function inheritParallelLinks(result:TableInterpretation1G[],doc:DocumentModel1G){
 const numeric=(o:Observation1G)=>['quantity','range','bound','number'].includes(o.kind)&&!!o.dimension;
 const sig=(t:TableInterpretation1G)=>[...new Set(t.observations.filter(numeric).map(o=>o.property.join('/')+'@'+o.dimension))].sort().join('|');
 const parent=(t:TableInterpretation1G)=>{const bi=doc.tableBlock.get(t.table);return bi===undefined?null:doc.blocks[bi].sectionPath.slice(0,-1).join('/');};
 for(const t of result){if(t.context.some(l=>l.applies))continue;const s=sig(t);if(!s)continue;
  const twin=result.find(u=>u!==t&&u.context.some(l=>l.applies)&&sig(u)===s&&parent(u)===parent(t)&&Math.abs(u.table-t.table)<=2);if(!twin)continue;
  // S102: the twin's evidence may come from its introducing statement (table_context) as well as from a linked statement
  const linked=twin.observations.filter(o=>numeric(o)&&(o.evidence.level?.startsWith('linked_')||o.evidence.level==='table_context'));if(!linked.length)continue;
  const classes=new Set(linked.map(o=>o.evidence.class));if(classes.size!==1)continue;const cls=[...classes][0];
  // S93: the inherited value keeps the twin's originating statements, so its provenance stays verifiable
  const links=[...new Set(linked.flatMap(o=>o.methodLinks))];
  for(const o of t.observations)if(numeric(o)&&o.evidence.class==='unknown'){o.evidence={class:cls,level:'linked_parallel_table',support:[`twin table ${twin.table} (same quantity signature, same parent section) is ${cls} by a linked statement`],contradictions:[]};o.methodLinks=links;}}
}
/** Interpret every table of a document. Tables outside the limits or not completely acquired are listed, never dropped. */
export function interpretDocumentTables1G(html:string,opts:{lessons?:readonly InterpreterLessonId1G[];text?:TextModel1G}={}):DocumentInterpretation1G{
 const lessons=[...(opts.lessons??activeInterpreterLessons1G())].sort();const L:Lessons=new Set(lessons);
 const rendered=opts.text==='rendered';const version=rendered?INTERPRETER1G_RENDERED_VERSION:INTERPRETER1G_VERSION;
 const acq0=acquireTables1F(html,rendered?{rendered:true}:{});const acq=rendered?{...acq0,tables:acq0.tables.map(renderedView1G)}:acq0;const doc=documentModel1G(html);if(L.has('GL10_structured_names_are_name_shaped'))doc.principal=nameShapedPrincipal1G(doc.principal);
 const pick=(f:(s:string)=>boolean)=>[...new Set(doc.names.filter(n=>f(n.source)).map(n=>n.text).filter(t=>t&&t.length<=120))];
 const baseNames=pick(s=>s!=='heading'&&(L.has('GL3_structured_entity_grounding')||s!=='title_segment')),headings=pick(s=>s==='heading');
 let learned:string[]=[];let result:TableInterpretation1G[]=[];let passes=0;
 while(passes<LIMITS1G.maxPasses){passes++;const names=[...new Set([...baseNames,...learned])];
  result=acq.tables.map(t=>interpretOne(t,doc,{structured:names,headings},L));
  // document-level update: product labels of confidently interpreted tables become document entities for the others
  const next=new Set(learned);
  for(const r of result){if(r.status!=='interpreted'||!r.selected)continue;const runner=r.alternatives.find(a=>!a.hypothesis.layout&&roleKey(a.hypothesis)!==roleKey(r.selected!.hypothesis));
   if(runner&&r.selected.support-runner.support<2)continue;for(const o of r.observations)if(o.product&&o.productSource!=='document')next.add(o.product);}
  if([...next].every(n=>learned.includes(n)))break;learned=[...next];}
 if(L.has('GL12_parallel_tables_inherit_links'))inheritParallelLinks(result,doc);
 return {schema:'pee.table-interpretation.v1g',version,lessons,readingIdentity:version+'+lessons:'+interpreterLessonsDigest1G(lessons),limits:LIMITS1G,passes,tables:result,documentEntitiesLearned:learned};
}

// ---------------------------------------------------------------------------------------------------------------------
// S94 Stage 1 (owner review of S93): table relations. Whole-table inference in the spirit of Limaye et al. 2010 and
// TableMiner+ (Zhang 2017): one hypothesis must explain every row of a column, not one cell at a time; and cell
// dependencies as in TUTA (Wang et al. 2021): a derived cell is a function of other cells. Three relations, all read from
// the grid and verified by arithmetic or by closed-class statistics words, never by domain vocabulary:
//  - relative difference: a percentage column whose every row satisfies p = f(v, v0) for ONE reference value v0 (the
//    printed precision of p and v bounds the residual); the inputs are the row's own value and the reference row;
//  - statistic over a set: a row whose label is a statistic (average, median, minimum, n=...) holds calculated values;
//  - row subject: the product a row is about (the reviewed product, another product, a set), from its label.
export type TableDerivationKind1G='relative_difference'|'ratio_to_reference'|'statistic_over_set';
export type RowSubject1G='reviewed_product'|'other_product'|'set'|'unclear';
export interface CellDerivation1G {table:number;cell:number;cellText:string;surface:string;value:number;kind:TableDerivationKind1G;formula:string|null;
 inputs:{cell:number;text:string;role:'own_value'|'reference_value'|'set'}[];reference:{cell:number;text:string;value:number;label:string}|null;residual:number|null;
 row:{label:string;subject:RowSubject1G};context:{block:number;text:string}|null;
 /** the method statements of the table (collective method link): a method statement of its own or an ancestor section that
  * names one of its quantities, else the document-wide method statements (a method statement naming no quantity) */
 methods:{block:number;scope:'section'|'document'}[]}
/** S94: a base value of a verified comparison table (collective typing): a result of the same procedure as its column */
export interface TableMember1G {table:number;cell:number;cellText:string;value:number;row:{label:string;subject:RowSubject1G};methods:CellDerivation1G['methods']}
export interface TableRelations1G {schema:'pee.table-relations.v1';members:TableMember1G[];tables:{table:number;pairs:number;fit:{formula:string;references:number[];support:number;groups:number}|null;referenceRows:string[]}[];
 derivations:CellDerivation1G[];rows:{table:number;cell:number;label:string;subject:RowSubject1G;text:string}[]}
const STAT_ROW=/^\s*(?:average|mean|median|minimum|maximum|min|max|range|total|overall average)\b|\(\s*[^)]*\bn\s*=\s*\d+/i;
const FORMULAS:{id:string;kind:TableDerivationKind1G;v0:(v:number,p:number)=>number|null;p:(v:number,v0:number)=>number}[]=[
 {id:'p=100*(v-v0)/v0',kind:'relative_difference',v0:(v,p)=>p>-100?v/(1+p/100):null,p:(v,v0)=>100*(v-v0)/v0},
 {id:'p=100*(v0-v)/v0',kind:'relative_difference',v0:(v,p)=>p<100?v/(1-p/100):null,p:(v,v0)=>100*(v0-v)/v0},
 {id:'p=100*(v0-v)/v',kind:'relative_difference',v0:(v,p)=>v*(1+p/100),p:(v,v0)=>100*(v0-v)/v},
 {id:'p=100*(v-v0)/v',kind:'relative_difference',v0:(v,p)=>p<100?v*(1-p/100):null,p:(v,v0)=>100*(v-v0)/v},
 {id:'p=100*v/v0',kind:'ratio_to_reference',v0:(v,p)=>p>0?100*v/p:null,p:(v,v0)=>100*v/v0}];
const decimals=(s:string)=>{const m=/\d+(?:[.,](\d+))?/.exec(s);return m?.[1]?.length??0;};
/** The product a row label names, against the document's principal product (or its title): every name token of the
 * principal in the label means the reviewed product; a statistic label means a set; another capitalised name, another
 * product. */
export function rowSubject1G(label:string,principal:string|null):RowSubject1G{
 if(STAT_ROW.test(label))return 'set';const toks=(s:string)=>norm(s).split(' ').filter(w=>w.length>=2);const lt=toks(label);
 const pn=principal?toks(principal.replace(/\s+(?:review|reviews|tested|test)\b.*$/i,'')).filter(w=>!/^(?:the|and|with|for|laptop|notebook)$/.test(w)):[];
 if(pn.length>=2&&pn.every(w=>lt.some(x=>x===w||w.length>=3&&x.startsWith(w))))return 'reviewed_product';
 if(/\b[A-Z][\p{L}\d-]+(?:\s+[A-Z\d][\p{L}\d-]*)+/u.test(label))return 'other_product';return 'unclear';}
export function tableRelations1G(html:string,opts:{principal?:string|null}={}):TableRelations1G{
 const acq0=acquireTables1F(html,{rendered:true});const acq={...acq0,tables:acq0.tables.map(renderedView1G)};
 const tx=(c:SourceCell1F)=>c.normalisedText.replace(/\s+/g,' ').trim();const doc=documentModel1G(html);const principal=opts.principal??nameShapedPrincipal1G(doc.principal);
 const out:TableRelations1G={schema:'pee.table-relations.v1',tables:[],derivations:[],rows:[],members:[]};
 const docMethods=doc.blocks.filter(b=>b.kind==='method'&&b.tableIndex===null&&!b.dimensions.length).map(b=>({block:b.index,scope:'document' as const}));
 for(const t of acq.tables){const cells=t.cells.filter(c=>!c.droppedBy&&c.gridRow!==null&&!c.nestedTables.length);
  const byRow=new Map<number,SourceCell1F[]>();for(const c of cells)byRow.set(c.gridRow!,[...(byRow.get(c.gridRow!)??[]),c]);
  // the table's context statement: the nearest preceding prose block of its section (Limaye/TableMiner+ table context)
  const tb=doc.tableBlock.get(t.index);let context:CellDerivation1G['context']=null;
  if(tb!==undefined){const sec=doc.blocks[tb].sectionPath.join('/');for(let i=tb-1;i>=0;i--){const b=doc.blocks[i];if(b.sectionPath.join('/')!==sec)break;if(b.tableIndex===null&&b.text.length>=40){context={block:i,text:b.text};break;}}}
  const tableRows:TableRelations1G['rows']=[];
  const tdims=[...new Set(cells.flatMap(c=>[...dimensionsIn1G(tx(c)),...cellElements1G(tx(c)).map(e=>e.dimension).filter((d):d is string=>!!d)]))];
  let methods:CellDerivation1G['methods']=docMethods;
  if(tb!==undefined){const own=doc.blocks[tb].sectionPath;const sec=doc.blocks.filter(b=>b.kind==='method'&&b.tableIndex===null&&b.dimensions.some(d=>tdims.includes(d))&&b.sectionPath.length&&own.join('/').startsWith(b.sectionPath.join('/')))
    .sort((a,b)=>b.sectionPath.length-a.sectionPath.length||Math.abs(a.index-tb)-Math.abs(b.index-tb));if(sec.length)methods=[{block:sec[0].index,scope:'section'}];}
  type Pair={row:number;seg:number;label:string;name:string;base:{cell:SourceCell1F;e:Element1G};pct:{cell:SourceCell1F;e:Element1G}};const pairs:Pair[]=[];
  // rows with a single cell head a row group (TUTA's header tree): each group may compare against its own reference
  const valueRows:{row:number;seg:number;rc:SourceCell1F[];name:string}[]=[];let seg=0;
  for(const [row,rc0] of [...byRow.entries()].sort((a,b)=>a[0]-b[0])){const rc=[...rc0].sort((a,b)=>(a.gridCol??0)-(b.gridCol??0));if(rc.length<2){seg++;continue;}
   const label=tx(rc[0]);const name=rc[0].normalisedText.split('\n')[0].trim();if(!label||cellElements1G(label).length&&!/[A-Za-z]{3}/.test(label))continue;const subject=rowSubject1G(name,principal);
   valueRows.push({row,seg,rc,name});
   for(const c of rc.slice(1)){const text=tx(c);if(text)tableRows.push({table:t.index,cell:c.id,label,subject,text});}
   let prev:{cell:SourceCell1F;e:Element1G}|null=null;
   for(const c of rc.slice(1)){const els=cellElements1G(tx(c));
    for(const e of els){if(e.value===null)continue;const isPct=e.unit==='%';
     if(isPct&&prev)pairs.push({row,seg,label,name,base:prev,pct:{cell:c,e}});
     if(!isPct&&(e.kind==='number'||e.kind==='quantity')&&!(prev&&prev.cell===c))prev={cell:c,e};
     if(STAT_ROW.test(label)&&!isPct&&(e.kind==='number'||e.kind==='quantity')&&prev?.e===e)
      out.derivations.push({table:t.index,cell:c.id,cellText:tx(c),surface:e.surface,value:e.value,kind:'statistic_over_set',formula:null,inputs:[{cell:rc[0].id,text:label,role:'set'}],reference:null,residual:null,row:{label,subject:'set'},context,methods});}}}
  // collective fit: ONE formula for the whole table and, in each row group, ONE reference value v0 that every row's
  // printed precision admits (interval stabbing). A group is explained when 3 rows agree, or 2 rows and a reference row
  // (a row of the group whose own value is v0 and that prints no difference)
  const baseOf=(rc:SourceCell1F[])=>{for(const c of rc.slice(1)){const e=cellElements1G(tx(c)).find(e=>e.value!==null&&e.unit!=='%'&&(e.kind==='number'||e.kind==='quantity'));if(e)return {cell:c,e};}return null;};
  const interval=(f:typeof FORMULAS[number],p:Pair)=>{const v=p.base.e.value!,pv=p.pct.e.value!;const hp=0.5*10**-decimals(p.pct.e.surface),hv=0.5*10**-decimals(p.base.e.surface);
   const xs=[f.v0(v-hv,pv-hp),f.v0(v+hv,pv-hp),f.v0(v-hv,pv+hp),f.v0(v+hv,pv+hp)].filter((x):x is number=>x!==null&&isFinite(x)&&x>0);return xs.length===4?{lo:Math.min(...xs)*0.999,hi:Math.max(...xs)*1.001}:null;};
  type SegFit={seg:number;v0:number;ok:Pair[];ref:{cell:SourceCell1F;e:Element1G;label:string}|null};
  const fitSeg=(f:typeof FORMULAS[number],sg:number):SegFit|null=>{const all=pairs.filter(p=>p.seg===sg);const live=all.filter(p=>p.pct.e.value!==0);if(live.length<2)return null;
   const iv=live.map(p=>({p,i:interval(f,p)})).filter((x):x is {p:Pair;i:{lo:number;hi:number}}=>!!x.i);let top:{x:number;n:number}|null=null;
   for(const x of iv.flatMap(b=>[b.i.lo,b.i.hi])){const n=iv.filter(b=>b.i.lo<=x&&x<=b.i.hi).length;if(!top||n>top.n)top={x,n};}
   if(!top||top.n<0.6*live.length)return null;
   // the reference value is the centre of the intersection of the agreeing rows' intervals
   const agree=iv.filter(b=>b.i.lo<=top!.x&&top!.x<=b.i.hi);const lo=Math.max(...agree.map(b=>b.i.lo)),hi=Math.min(...agree.map(b=>b.i.hi));const v0=(lo+hi)/2;
   const nearV0=(e:Element1G)=>{const h=0.5*10**-decimals(e.surface);return e.value!+h>=lo&&e.value!-h<=hi;};
   const ok=all.filter(p=>{const i=interval(f,p);return !!i&&i.lo<=v0&&v0<=i.hi;});
   const rr=valueRows.filter(r=>r.seg===sg&&!pairs.some(p=>p.row===r.row&&p.pct.e.value!==0)).map(r=>({r,b:baseOf(r.rc)})).find(x=>x.b&&nearV0(x.b.e));
   const ref=rr?{cell:rr.b!.cell,e:rr.b!.e,label:rr.r.name}:null;const nLive=ok.filter(p=>p.pct.e.value!==0).length;
   return nLive>=3||nLive>=2&&ref?{seg:sg,v0,ok,ref}:null;};
  const segs=[...new Set(pairs.map(p=>p.seg))];let fit:TableRelations1G['tables'][number]['fit']=null;
  let bestF:typeof FORMULAS[number]|null=null,bestFits:SegFit[]=[],bestScore=0,second=0;
  for(const f of FORMULAS){const fs=segs.map(sg=>fitSeg(f,sg)).filter((x):x is SegFit=>!!x);const score=fs.reduce((n,x)=>n+x.ok.length,0);
   if(score>bestScore){second=bestScore;bestScore=score;bestF=f;bestFits=fs;}else second=Math.max(second,score);}
  if(bestF&&bestScore>second){const F=bestF;
   fit={formula:F.id,references:bestFits.map(x=>+x.v0.toPrecision(6)),support:bestScore,groups:bestFits.length};
   out.tables.push({table:t.index,pairs:pairs.length,fit,referenceRows:[...new Set(bestFits.filter(x=>x.ref).map(x=>x.ref!.label))]});
   for(const sf of bestFits){const reference=sf.ref?{cell:sf.ref.cell.id,text:tx(sf.ref.cell),value:sf.ref.e.value!,label:sf.ref.label}:null;
    for(const p of sf.ok){const v=p.base.e.value!;
     out.derivations.push({table:t.index,cell:p.pct.cell.id,cellText:tx(p.pct.cell),surface:p.pct.e.surface,value:p.pct.e.value!,kind:F.kind,formula:F.id,
      inputs:[{cell:p.base.cell.id,text:tx(p.base.cell),role:'own_value'},...(reference?[{cell:reference.cell,text:reference.text,role:'reference_value' as const}]:[])],
      reference,residual:+Math.abs(F.p(v,sf.v0)-p.pct.e.value!).toFixed(3),row:{label:p.label,subject:rowSubject1G(p.name,principal)},context,methods});
     if(!STAT_ROW.test(p.label))out.members.push({table:t.index,cell:p.base.cell.id,cellText:tx(p.base.cell),value:v,row:{label:p.label,subject:rowSubject1G(p.name,principal)},methods});}
    if(sf.ref)out.members.push({table:t.index,cell:sf.ref.cell.id,cellText:tx(sf.ref.cell),value:sf.ref.e.value!,row:{label:sf.ref.label,subject:rowSubject1G(sf.ref.label,principal)},methods});}}
  else if(pairs.length)out.tables.push({table:t.index,pairs:pairs.length,fit:null,referenceRows:[]});
  // the row axis names products only when the table itself shows it (Limaye/Sato: a column is typed by all its cells):
  // a row names the reviewed product, or one relation ties the rows. Otherwise a header cell that names the reviewed
  // product makes its column about that product. Otherwise no subject is decided.
  const productRows=tableRows.some(r=>r.subject==='reviewed_product')||!!fit;
  if(productRows)out.rows.push(...tableRows);
  else{const top=Math.min(...cells.map(c=>c.gridRow!));const heads=cells.filter(c=>c.gridRow===top&&rowSubject1G(c.normalisedText.split('\n')[0].replace(/\([^)]*\)/g,''),principal)==='reviewed_product');
   for(const h of heads)for(const c of cells)if(c.gridCol===h.gridCol&&c.gridRow!==top){const text=tx(c);if(text)out.rows.push({table:t.index,cell:c.id,label:tx(h),subject:'reviewed_product',text});}}
  if(!productRows)for(const d of out.derivations)if(d.table===t.index&&d.row.subject!=='set')d.row.subject='unclear';}
 return out;
}
