/**
 * Whole-document evidence reader (WD, 2026-10-18).
 *
 * Owner brief (2026-10-18): quantitative and qualitative evidence, wherever it sits on a page, uses the same scientific
 * knowledge and the same attribution and reasoning rules. Before this reader, the knowledge layer read HTML tables only;
 * on the 69 development pages about 68% of the quantities sat in paragraphs, lists, cards and other text.
 *
 * The reader segments, locates and states facts; interpretation stays in the shared knowledge and rules.
 * - Tables: the 1G interpreter with the quantity knowledge, unchanged.
 * - Everything else becomes segments: key-value pairs (dl, two-part div grids, "Label: value" lines), sentences of
 *   paragraphs, list items, captions and leaf text, and embedded data (JSON-LD, Next.js data and flight payloads,
 *   application/json).
 * - Every segment carries its locator, section headings, region (page subject or boilerplate) and the products it names.
 * - Each quantity is typed by `typeQuantity`, with the same document statements and scope rules as table values (KR,
 *   KR2). Its record (a sentence, a pair) goes through program `record` (P1).
 *
 * Principles applied (candidates, tested on the development pages):
 * - **R-1: a filter is about a conclusion, not about the text.** Boilerplate is read and marked, never dropped; a marked
 *   segment gets no product and no evidence class.
 * - **P3: a number inside a product or model name is part of an identifier**, never a measurement.
 * - **Attribution is a candidate, never a merge.** A value belongs to the nearest product named in its own sentence,
 *   else to the product of its section heading, else to the page subject; the basis is recorded. Names match exactly
 *   (or without the brand when that is unique on the page).
 * - **Qualitative statements** are codes: aspect, polarity, conditions, product, basis, author. No text is kept.
 *
 * Shadow and evaluation only: nothing here reaches the store, advice or ranking. Callers: scripts/wd-score.mjs (arm C)
 * and tests/document_evidence.test.ts.
 */
import {createHash} from 'node:crypto';
import {parseHtml245,walk245,locator245,decodeEntities245,type Node245} from './phase245_html_dom.js';
import {documentModel1G,interpretDocumentTables1G,blockKind1G,isMethodHeading1G,nameShapedPrincipal1G} from './table_interpreter1g.js';
import {interpretWithKnowledge1G,documentStatements1G,type KnowledgeInterpretation1G} from './table_interpreter1g_knowledge.js';
import {findQuantities,typeQuantity,applyRecordRoles,withLabelBasis,withConventionalBasis,unitStatedInLabel,parseUnit,hasPhrase,normText,type QuantityKnowledge,type TypedQuantity,type FoundQuantity,type RecordValue} from './quantity_knowledge.js';
import {TEST_CONTEXT272,DECLARATION_CUE272} from './phase272_extraction_plan.js';

export const DOCUMENT_EVIDENCE_VERSION='wd.1';
export type SegmentRole='pair'|'sentence'|'embedded_pair'|'embedded_sentence';
export type SegmentLocation='paragraph'|'list'|'definition_list'|'card'|'caption'|'heading'|'other_text'|'embedded';
export interface Segment {id:string;role:SegmentRole;location:SegmentLocation;tag:string;locator:string;
 /** for embedded data: the source (json-ld, next-data, next-flight, application/json) and the JSON path */
 embedded?:{source:string;path:string};
 label:string|null;text:string;headings:string[];
 /** S100: the level of each heading (1 = the page title) */
 headingLevels?:number[];region:'subject'|'boilerplate';products:{name:string;start:number;end:number}[];
 /** an embedded text that repeats visible text */
 duplicateOf:string|null}
export interface SegmentQuantity {id:string;segment:string;record:string;start:number;end:number;surface:string;quantity:TypedQuantity|null;
 /** P3: the number is part of a product or model name */
 identifierPart:boolean;product:string|null;productBasis:'sentence'|'section'|'pair_section'|'page'|'embedded_item'|'none';
 evidenceClass:string;recordRole:'condition'|'result'|null}
export interface QualitativeObservation {id:string;segment:string;aspect:string;polarity:'positive'|'negative'|'mixed';strength:'explicit'|'hedged';
 conditions:{axis:string;value:string}[];product:string|null;productBasis:SegmentQuantity['productBasis'];
 basis:'tested_experience'|'opinion_without_test'|'reported_by_others'|'manufacturer_claim';author:string|null;
 /** never a ranking input: a judgement recorded with who made it and under which conditions */
 rankingInput:false}
export interface DocumentEvidence {schema:'pee.document-evidence.v1';version:string;readingIdentity:string;knowledge:string;
 tables:KnowledgeInterpretation1G;segments:Segment[];quantities:SegmentQuantity[];qualitative:QualitativeObservation[];
 products:{name:string;source:string}[];pageSubject:string|null;author:string|null;
 /** QE: structured qualitative evidence (one item per statement and property) */
 qualitativeEvidence:QualitativeEvidence[];
 funnel:Record<string,number>}
/** QE (2026-10-18): a structured qualitative statement of a page. It separates what was perceived (a phenomenon) from what
 * was judged, the kind of evidence (a test observation, use experience, opinion, a report of others, a maker's claim, an
 * inference), the conditions by kind, the use situation a judgement depends on, a stated cause and whether the page
 * supports it, a comparison, and the measurement on the same property. Provenance follows W3C PROV-O: the statement is an
 * entity of a document, generated by an activity (a named test, when the page names one), attributed to an agent (the
 * author). Codes and ids only: no page text is kept. Never a ranking input. */
export interface QualitativeEvidence {id:string;segment:string;sentence:{start:number;end:number};
 property:{aspect:string;phenomenon:string|null;facet:string|null;
  /** every facet the statement's phenomena show ("browned unevenly": surface colour and spatial uniformity) */
  facets:string[];kinds:string[]};
 statementType:'observation'|'judgement'|'observation_and_judgement';
 evidenceType:'observed_in_test'|'experience_in_use'|'opinion'|'reported_by_others'|'manufacturer_claim'|'inference';
 polarity:'positive'|'negative'|'mixed'|'neutral';hedged:boolean;
 conditions:{kind:'setting'|'test_material'|'test_procedure'|'environment';value:string}[];
 useContext:string|null;cause:{status:'documented'|'supposed'}|null;comparison:{other:string|null;better:'this'|'other'|null}|null;
 relatedMeasurement:{quantity:string;surface:string;relation:'same_property_same_statement'|'same_property_next_statement'}|null;
 product:string|null;productBasis:SegmentQuantity['productBasis'];
 provenance:{source:string;section:string|null;author:string|null;activity:string|null};rankingInput:false}

const RAW=new Set(['script','style','textarea','title','noscript','template','xmp','iframe','noembed','noframes','svg']);
const INLINE=new Set(['span','a','b','strong','em','i','sup','sub','small','abbr','code','mark','u','s','q','cite','time','data','label','font','bdi','bdo','wbr','img','picture','source']);
const BOILER_TAG=new Set(['nav','footer','aside','form','button','select','option','dialog']);
const BOILER_ROLE=/^(?:navigation|banner|contentinfo|search|menu|menubar|dialog|alertdialog|toolbar)$/;
const BOILER_TOKEN=/(?:^|[\s_-])(?:nav|navbar|navigation|menu|footer|breadcrumbs?|cookies?|consent|newsletter|subscribe|signup|sign-up|login|share|sharing|social|related|recommended|promo|advert|ads?|banner|modal|popup|cart|basket|comments?|sidebar|trending|popular|more-stories)(?:$|[\s_-])/i;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const words=(s:string)=>s.trim().split(/\s+/).filter(Boolean);
const labelLike=(s:string)=>{const t=s.trim().replace(/:$/,'');return t.length>=2&&t.length<=60&&words(t).length<=8&&/\p{L}/u.test(t)&&!/[.!?]$/.test(t)&&!/^\d[\d.,\s]*$/.test(t);};
const BOUND=/\b(?:up to|from|down to|as low as|as much as|at least|at most|minimum|maximum|max\.?|min\.?|under|over|less than|more than|below|above|beyond|nearly|almost|around|about|approximately|approx\.?|roughly|~)\s*$/i;

/** A product name in a heading: an ordinal and a tagline are removed ("3. Dreame X50 Ultra – best for pets"); the rest
 * must be name-shaped and carry a model token (a token with a digit, or a name the page's structured data gives). */
/** A name without an editorial suffix ("X review: faster cooking" -> "X"). */
export function cleanName(t:string):string{return t.split(/\s+[–—|]\s+|:\s+/)[0].replace(/\s+(?:review|reviews|full review|hands-on|tested|specs|specifications)$/i,'').trim();}
export function headingProduct(text:string,known:readonly string[]=[]):string|null{
 let t=text.replace(/^\s*(?:#?\d{1,2}[.):]?|\(\d{1,2}\))\s+/,'').trim();
 t=t.split(/\s+[–—|]\s+|\s+-\s+|:\s+/)[0].replace(/\s+(?:review|reviews|full review|hands-on|tested|specs|specifications)$/i,'').trim();
 const n=nameShapedPrincipal1G(t);if(!n)return null;const tk=words(n);if(tk.length<2||tk.length>8)return null;
 if(known.some(k=>normText(k)===normText(n)))return n;
 if(/^(?:the|our|best|how|why|what|which|is|are|should|top|a|an|verdict|price|design|performance|features?|setup|battery|cleaning|navigation|noise|specs?|alternatives?|competitors?)\b/i.test(n))return null;
 return tk.some(x=>/\d/.test(x)&&/[A-Za-z]/.test(x)||/^\d{2,}[A-Za-z]*$/.test(x))&&/^[A-Z]/.test(tk[0])?n:null;
}

function inside(n:Node245,pred:(a:Node245)=>boolean){for(let a=n.parent;a;a=a.parent)if(pred(a))return true;return false;}
/** Text length of every element (one post-order pass). */
function textLengths(root:Node245):Map<Node245,number>{const m=new Map<Node245,number>();
 const w=(x:Node245):number=>{if(x.kind==='text')return x.text.trim().length;if(RAW.has(x.tag))return 0;let n=0;for(const c of x.children)n+=w(c);m.set(x,n);return n;};w(root);return m;}
/** Boilerplate is peripheral: a region marked by its tag or role, or by a class/id token on an element that holds a small
 * share of the page's text (a wrapper class such as "has-sidebar" on the body does not make the page boilerplate). */
function regionOf(n:Node245,len:Map<Node245,number>,total:number):'subject'|'boilerplate'{
 for(let a:Node245|null=n;a;a=a.parent){if(a.kind!=='element')continue;const small=(len.get(a)??0)<0.25*total;
  const half=(len.get(a)??0)<0.5*total;if(BOILER_TAG.has(a.tag)&&half)return 'boilerplate';if(a.tag==='header'&&half&&!inside(a,x=>x.tag==='article'||x.tag==='main'))return 'boilerplate';
  if(BOILER_ROLE.test(a.attrs.role??'')&&small)return 'boilerplate';const tok=`${a.attrs.class??''} ${a.attrs.id??''}`;if(small&&tok.trim()&&BOILER_TOKEN.test(tok))return 'boilerplate';}
 return 'subject';}
/** The inline text of a block element, without crossing block children; <br> separates lines. */
function inlineText(n:Node245):string{let s='';
 const w=(x:Node245,top:boolean)=>{if(x.kind==='text'){s+=decodeEntities245(x.text);return;}if(RAW.has(x.tag))return;if(x.tag==='br'){s+='\n';return;}
  if(!top&&!INLINE.has(x.tag)){s+='\n';return;}for(const c of x.children)w(c,false);};
 w(n,true);return s.split('\n').map(l=>l.replace(/[\t\f\r ]+/g,' ').trim()).filter(Boolean).join('\n');}
const fullText=(n:Node245):string=>{let s='';const w=(x:Node245)=>{if(x.kind==='text'){s+=decodeEntities245(x.text);return;}if(RAW.has(x.tag))return;if(!INLINE.has(x.tag))s+=' ';x.children.forEach(w);if(!INLINE.has(x.tag))s+=' ';};w(n);return s.replace(/\s+/g,' ').trim();};
/** Sentences of a text: split after . ! ? followed by a space and a capital or a digit, not after common abbreviations. */
export function sentences(text:string):{start:number;text:string}[]{const out:{start:number;text:string}[]=[];let i=0;
 const re=/[.!?]+["')\]]?\s+(?=[A-Z0-9£$€"'(])/g;let m;
 while((m=re.exec(text))){const before=text.slice(Math.max(0,m.index-6),m.index+1);if(/\b(?:e\.g|i\.e|vs|approx|incl|no|Dr|Mr|Ms|Mrs|St|etc)\.$/i.test(before))continue;
  const end=m.index+m[0].length;const s=text.slice(i,end).trim();if(s)out.push({start:i,text:s});i=end;}
 const s=text.slice(i).trim();if(s)out.push({start:i+(text.slice(i).length-text.slice(i).trimStart().length),text:s});return out;}
const locationOf=(tag:string,n:Node245):SegmentLocation=>tag==='p'||tag==='blockquote'?'paragraph':tag==='li'?'list':tag==='dt'||tag==='dd'?'definition_list':tag==='figcaption'||tag==='caption'?'caption':/^h[1-6]$/.test(tag)?'heading':inside(n,a=>a.tag==='li'||a.tag==='ul'||a.tag==='ol')?'list':'other_text';

interface Inventory {names:{name:string;source:string}[];re:{name:string;full:string;re:RegExp}[]}
function inventory(structured:readonly {name:string;source:string}[]):Inventory{
 const names=[...new Map(structured.filter(n=>n.name.trim()).map(n=>[normText(n.name),n])).values()];
 // short forms: the name without its first word (brand), when that is still a model name and unique among the names
 const short=new Map<string,string[]>();for(const n of names){const tk=words(n.name);if(tk.length>=3||tk.length===2&&/\d/.test(tk[1])){const s=tk.slice(1).join(' ');short.set(normText(s),[...(short.get(normText(s))??[]),n.name]);}}
 const esc=(w:string)=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const mk=(s:string)=>new RegExp('(?<![\\p{L}\\p{N}])'+esc(s).replace(/\s+/g,'\\s+')+'(?![\\p{L}\\p{N}])','giu');
 // the core of a name: its brand and model tokens, up to and including the first token with a digit, else its first
 // three tokens ("Meaco DD8L Pro Desiccant dehumidifier" -> "Meaco DD8L"; "MeacoDry Arete Two Dehumidifier / Air
 // Purifier" -> "MeacoDry Arete Two"); used only when no other name has the same core
 const coreOf=(n:string)=>{const tk=words(n.replace(/[\/&|,(].*$/,''));const d=tk.findIndex(x=>/\d/.test(x));const c=d>=1?tk.slice(0,d+1):tk.slice(0,3);return c.length>=2&&c.length<tk.length?c.join(' '):null;};
 const cores=new Map<string,string[]>();for(const n of names){const c=coreOf(n.name);if(c)cores.set(normText(c),[...(cores.get(normText(c))??[]),n.name]);}
 const coreRe=[...cores].filter(([c,fs])=>fs.length===1&&!names.some(n=>normText(n.name)===c)).map(([,fs])=>({name:fs[0],full:coreOf(fs[0])!,re:mk(coreOf(fs[0])!)}));
 // audit S78: the model code alone ("the QN80H registered", "the B5's 668 nits"), a token with letters and digits that is
 // unique among the names; matched case-sensitively, never a size, resolution or year ("65-inch", "4K", "2025")
 const codeOf=(n:string)=>words(n.replace(/[\/&|,(].*$/,'')).filter(t=>/[A-Za-z]/.test(t)&&/\d/.test(t)&&t.length>=2&&!/^\d+(?:-?(?:inch|in|cm|mm|l|kg|w|hz|k|p|gb|tb|mp|bar)|"|”)$/i.test(t)&&!/^[48]K$/i.test(t)&&!/^\d+(?:st|nd|rd|th)$/i.test(t));
 const codes=new Map<string,string[]>();for(const n of names)for(const c of new Set(codeOf(n.name)))codes.set(c,[...(codes.get(c)??[]),n.name]);
 const mkCase=(s:string)=>new RegExp('(?<![\\p{L}\\p{N}])'+esc(s)+'(?![\\p{L}\\p{N}])','gu');
 const codeRe=[...codes].filter(([c,fs])=>new Set(fs).size===1&&!names.some(n=>normText(n.name)===normText(c))).map(([c,fs])=>({name:fs[0],full:c,re:mkCase(c)}));
 const re=[...names.map(n=>({name:n.name,full:n.name,re:mk(n.name)})),...coreRe,...codeRe,
  ...[...short].filter(([s,fs])=>fs.length===1&&!names.some(n=>normText(n.name)===s)&&(/\d/.test(s)||/\s/.test(s))).map(([,fs])=>{const tk=words(fs[0]);return {name:fs[0],full:tk.slice(1).join(' '),re:mk(tk.slice(1).join(' '))};})]
  .sort((a,b)=>b.full.length-a.full.length);
 return {names,re};}
/** FC: the known products a text names (exact names, as the reader matches them), for readers built on a reading. */
const invCache=new WeakMap<readonly {name:string;source:string}[],Inventory>();
export function productMentions(products:readonly {name:string;source:string}[],text:string):Segment['products']{let inv=invCache.get(products);if(!inv){inv=inventory(products);invCache.set(products,inv);}return mentions(inv,text);}
function mentions(inv:Inventory,text:string):Segment['products']{const out:Segment['products']=[];
 for(const r of inv.re){r.re.lastIndex=0;let m;while((m=r.re.exec(text))){const s=m.index,e=s+m[0].length;if(!out.some(o=>s<o.end&&e>o.start))out.push({name:r.name,start:s,end:e});}}
 return out.sort((a,b)=>a.start-b.start);}

interface Embedded {source:string;path:string;label:string|null;text:string;item:string|null}
/** Embedded data: JSON-LD, __NEXT_DATA__, Next.js flight data and application/json, as pairs and texts. */
function embeddedSegments(root:Node245):Embedded[]{
 const out:Embedded[]=[];
 const LABEL=['name','label','title','key','attribute','attributeName','displayName','propertyName','featureName'];const VALUE=['value','values','displayValue','formattedValue','valueText','featureValue'];
 const UNIT=['unitText','unit','unitOfMeasure','uom','unitCode'];const TEXT=['reviewBody','articleBody','description'];
 const prim=(v:unknown)=>typeof v==='string'||typeof v==='number';
 const visit=(o:unknown,path:string,src:string,item:string|null,depth:number)=>{if(depth>40||o===null||o===undefined)return;
  if(Array.isArray(o)){o.slice(0,400).forEach((x,i)=>visit(x,path+'['+i+']',src,item,depth+1));return;}if(typeof o!=='object')return;const r=o as Record<string,unknown>;
  const types=([] as unknown[]).concat(r['@type']??[]).map(String);const isItem=types.some(t=>/^(?:Product|ProductModel|IndividualProduct|ProductGroup)$/.test(t))&&typeof r.name==='string';
  const it=isItem?String(r.name):item;
  const lk=LABEL.find(k=>typeof r[k]==='string'&&labelLike(String(r[k])));const vk=VALUE.find(k=>prim(r[k])||Array.isArray(r[k])&&(r[k] as unknown[]).length>0&&(r[k] as unknown[]).every(prim));
  if(lk&&vk&&!isItem){const uk=UNIT.find(k=>typeof r[k]==='string');const v=Array.isArray(r[vk])?(r[vk] as unknown[]).join(', '):String(r[vk]);
   out.push({source:src,path:path?path+'.'+vk:vk,label:String(r[lk]),text:(v+(uk?' '+String(r[uk]):'')).trim(),item:it});}
  for(const [k,v] of Object.entries(r)){const p=path?path+'.'+k:k;
   if(typeof v==='string'&&TEXT.includes(k)&&v.length>=40)out.push({source:src,path:p,label:null,text:v.replace(/\s+/g,' ').trim(),item:it});
   // a quantitative value of a structured item: {"weight":{"value":3.2,"unitText":"kg"}}
   else if(v&&typeof v==='object'&&!Array.isArray(v)&&prim((v as Record<string,unknown>).value)&&UNIT.some(u=>typeof (v as Record<string,unknown>)[u]==='string')&&!LABEL.some(l=>typeof (v as Record<string,unknown>)[l]==='string'))
    out.push({source:src,path:p+'.value',label:k,text:`${(v as Record<string,unknown>).value} ${UNIT.map(u=>(v as Record<string,unknown>)[u]).find(x=>typeof x==='string')}`,item:it});
   else if(v&&typeof v==='object')visit(v,p,src,it,depth+1);}};
 const tryJson=(s:string):unknown=>{try{return JSON.parse(s);}catch{return undefined;}};
 for(const n of walk245(root)){if(n.tag!=='script')continue;const body=(n.text||'')+n.children.map(c=>c.rawText??c.text??'').join('');const type=(n.attrs.type??'').toLowerCase();
  if(type==='application/ld+json'){const j=tryJson(body.trim());if(j!==undefined)visit(j,'','json-ld',null,0);}
  else if(n.attrs.id==='__NEXT_DATA__'||type==='application/json'){const j=tryJson(body.trim());if(j!==undefined)visit(j,'',n.attrs.id||'application/json',null,0);}
  else if(/self\.__next_f\.push/.test(body)){let flight='';for(const m of body.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)){const s=tryJson(m[1]);if(typeof s==='string')flight+=s;}
   for(const line of flight.split('\n')){const i=line.indexOf(':');if(i<0)continue;const j=tryJson(line.slice(i+1));if(j!==undefined)visit(j,'flight '+line.slice(0,i),'next-flight',null,0);}}}
 return out;}

/** Read the whole document. `sourceType` is the publisher's known type (manufacturer, retailer, independent_review),
 * context only: it decides the evidence class of a value nothing else classifies. */
export function readDocumentEvidence(html:string,qk:QuantityKnowledge,opts:{sourceType?:string|null}={}):DocumentEvidence{
 const base=interpretDocumentTables1G(html,{text:'rendered'});const tables=interpretWithKnowledge1G(html,qk,{base});
 const doc=documentModel1G(html);const {root}=parseHtml245(html,{keepSource:true});
 const tableProducts=[...new Set(tables.tables.flatMap(t=>t.observations.map(o=>o.product)).filter((x):x is string=>!!x))];
 // names from structured data, cleaned of an editorial suffix; list items and microdata names count only when product-shaped
 // (a breadcrumb "Home & Garden" or "Air Fryers" is not a product)
 // audit S79: a structured "name" that is a sentence ("The IQAir Atem X wouldn't look out of place in the MoMA, but…")
 // names its product in its leading capitalised run; the sentence itself is never a product name
 const nameOf=(t:string)=>{const c=cleanName(t);if(nameShapedPrincipal1G(c)||words(c).length<=10&&!/[,…]|\b(?:is|are|was|were|wouldn't|isn't|has|have)\b/.test(c))return c;
  const m=/^(?:The\s+|This\s+)?([A-Z][\p{L}\d+-]*(?:\s+(?:[A-Z0-9][\p{L}\d+-]*)){1,5})\b/u.exec(c);return m?m[1]:'';};
 const structured=doc.names.filter(n=>n.source==='json-ld-product'||n.source==='json-ld-list'||n.source==='microdata').map(n=>({name:n.source==='json-ld-product'?nameOf(n.text):cleanName(n.text),source:n.source}))
  .filter(n=>n.name&&(n.source==='json-ld-product'?words(n.name).length<=10:!!headingProduct(n.name)));
 const known=[...structured.map(n=>n.name),...tableProducts];
 const fromHeadings=doc.headings.map(h=>headingProduct(h.text,known)).filter((x):x is string=>!!x).map(name=>({name,source:'heading'}));
 // audit S78: products the prose names but no structured name lists ("Samsung QN80H", "Hisense UR8"): a capitalised brand
 // word and a model code (letters and digits, not a size or resolution), kept when the code recurs on the page outside
 // navigation, header, footer and asides; never on a manufacturer or retailer page (its own catalogue names suffice)
 const fromProse=opts.sourceType==='manufacturer'||opts.sourceType==='retailer'?[]:proseProducts(root,[...known,...fromHeadings.map(x=>x.name)]).map(name=>({name,source:'prose'}));
 const inv=inventory([...structured,...tableProducts.map(name=>({name,source:'table'})),...fromHeadings,...fromProse]);
 const titleSeg=doc.names.find(n=>n.source==='title_segment')?.text??null;
 const h1=doc.headings.find(h=>h.level===1);
 const pageSubject=(doc.principal?nameOf(doc.principal)||null:null)??(h1?headingProduct(h1.text,known):null)??(titleSeg?headingProduct(titleSeg,known):null);
 const {document,source}=documentStatements1G(html,qk,base,'rendered',inv.names.map(n=>n.name));
 const author=authorOf(root);const len=textLengths(root);const total=Math.max(1,len.get([...walk245(root)].find(x=>x.tag==='body')??root)??1);
 // ---- visible segments, in document order, with their section headings
 const segs:Segment[]=[];let stack:{level:number;text:string}[]=[];const consumed=new Set<Node245>();let k=0;
 const push=(s:Omit<Segment,'id'|'products'|'duplicateOf'>)=>{const id='s'+(k++);segs.push({...s,headingLevels:s.headings.length?stack.map(x=>x.level):[],id,products:s.region==='boilerplate'?[]:mentions(inv,s.text),duplicateOf:null});};
 for(const n of walk245(root)){if(n.kind!=='element'||RAW.has(n.tag)||n.tag==='table'||inside(n,a=>RAW.has(a.tag)||a.tag==='table'))continue;
  const h=/^h([1-6])$/.exec(n.tag);if(h){const L=+h[1];stack=stack.filter(x=>x.level<L);stack.push({level:L,text:fullText(n)});continue;}
  if(INLINE.has(n.tag)||consumed.has(n)||inside(n,a=>/^h[1-6]$/.test(a.tag)))continue;
  const headings=stack.map(x=>x.text);const region=regionOf(n,len,total);const loc=locator245(n);
  if(n.tag==='dt'){const t=fullText(n);const sib=n.parent?n.parent.children.slice(n.parent.children.indexOf(n)+1).find(c=>c.kind==='element'):undefined;
   if(sib&&sib.tag==='dd'&&labelLike(t)){for(const x of walk245(sib))consumed.add(x);push({role:'pair',location:'definition_list',tag:'dl',locator:loc,label:t.replace(/:$/,''),text:fullText(sib),headings,region});continue;}}
  // a two-part grid row: <div><div>Noise</div><div>42 dB</div></div>
  const kids=n.children.filter(c=>c.kind==='element'&&!RAW.has(c.tag));
  if(kids.length===2&&!n.children.some(c=>c.kind==='text'&&c.text.trim())&&!kids.some(c=>[...walk245(c)].some(x=>x!==c&&x.kind==='element'&&!INLINE.has(x.tag)))){
   const [a,b]=kids.map(fullText);
   if(!kids.some(c=>/^(?:h[1-6]|p|ul|ol|li|blockquote|figure|table)$/.test(c.tag))&&labelLike(a)&&b&&b.length<=80&&words(b).length<=12&&!/[.!?]$/.test(b)&&/\d/.test(b)){for(const c of kids)for(const x of walk245(c))consumed.add(x);
    push({role:'pair',location:'card',tag:n.tag,locator:loc,label:a.replace(/:$/,''),text:b,headings,region});continue;}}
  const text=inlineText(n);if(!text)continue;
  const location=locationOf(n.tag,n);
  for(const line of text.split('\n')){const m=/^([^:]{2,60}):\s+(.{1,160})$/.exec(line);
   if(m&&labelLike(m[1])&&!/[.!?]\s/.test(m[2])){push({role:'pair',location:location==='paragraph'||location==='other_text'?'card':location,tag:n.tag,locator:loc,label:m[1].trim(),text:m[2].trim(),headings,region});continue;}
   push({role:'sentence',location,tag:n.tag,locator:loc,label:null,text:line,headings,region});}}
 // ---- embedded segments; an embedded text that repeats visible text is marked, not read twice
 const visible=new Map<string,string>();for(const s of segs)for(const x of sentences(s.text))visible.set(normText(x.text),s.id);
 for(const e of embeddedSegments(root)){const role:SegmentRole=e.label!==null?'embedded_pair':'embedded_sentence';const id='s'+(k++);
  let dup:string|null=null;if(role==='embedded_sentence'){const ss=sentences(e.text);const hits=ss.filter(x=>visible.has(normText(x.text)));if(ss.length&&hits.length>=0.8*ss.length)dup=visible.get(normText(hits[0].text))!;}
  segs.push({id,role,location:'embedded',tag:'script',locator:e.source+':'+e.path,embedded:{source:e.source,path:e.path},label:e.label,text:e.text,headings:[],region:'subject',
   products:e.item?[{name:e.item,start:-1,end:-1}]:mentions(inv,e.text),duplicateOf:dup});}
 // ---- quantities: typed with the shared knowledge, attributed, then read per record (P1)
 const quantities:SegmentQuantity[]=[];const records=new Map<string,RecordValue[]>();let qi=0;
 const pageTests=opts.sourceType!=='manufacturer'&&opts.sourceType!=='retailer'&&segs.some(s=>s.region==='subject'&&(s.headings.some(h=>isMethodHeading1G(h))||blockKind1G(s.text)==='method'));
 const sectionProduct=(hs:readonly string[])=>{for(let i=hs.length-1;i>=0;i--){const m=new Set(mentions(inv,hs[i]).map(x=>x.name));if(m.size===1)return [...m][0];if(m.size>1)return null;}return null;};
 for(const s of segs){if(s.duplicateOf)continue;
  const units=s.role==='sentence'||s.role==='embedded_sentence'?sentences(s.text):[{start:0,text:s.text}];
  units.forEach((u,ui)=>{const found=findQuantities(qk,u.text);if(!found.length&&s.label!==null)found.push(...labelledValue(qk,s.label,u.text));if(!found.length)return;const record=`${s.id}#${ui}`;
   const own=s.role==='pair'||s.role==='embedded_pair'||s.products.some(p=>p.start<0)?s.products.filter(p=>p.start<0):s.products.filter(p=>p.start>=u.start&&p.end<=u.start+u.text.length).map(p=>({...p,start:p.start-u.start,end:p.end-u.start}));
   const inPairLabel=s.label?mentions(inv,s.label):[];
   // names of other products: a capitalised name with a model code that is not one of the page's products ("Salter EK5876")
   const foreign=s.role==='sentence'?foreignNames(u.text,own):[];
   found.forEach((f0,fi)=>{let f=f0;const id=`q${qi++}`;
    const ident=own.some(p=>p.start>=0&&f.start<p.end&&f.end>p.start)||identifierToken(u.text,f);
    // attribution: the nearest product named before the value in its sentence, else after it, else the section, else the page
    let product:string|null=null;let basis:SegmentQuantity['productBasis']='none';
    if(s.region==='subject'){const before=own.filter(p=>p.start>=0&&p.end<=f.start);const after=own.filter(p=>p.start>=f.end);
     if(own.length&&own[0].start<0){product=own[0].name;basis='embedded_item';}
     else if(inPairLabel.length===1){product=inPairLabel[0].name;basis='sentence';}
     else if(foreign.some(x=>x.start>=f.end&&x.start-f.end<=3||f.start>=x.start&&f.end<=x.end+12)){product=null;basis='none';}
     // "the 9 litres per day of the Brandx QX9": a product introduced by of/for/from/by right after the value owns it
     else if(ofName(u.text,f,own,foreign)!==undefined){const o=ofName(u.text,f,own,foreign)!;product=o;basis=o?'sentence':'none';}
     else if(before.length||foreign.some(x=>x.end<=f.start)){const lastK=before.length?before[before.length-1].end:-1,lastF=Math.max(-1,...foreign.filter(x=>x.end<=f.start).map(x=>x.end));
      if(lastF>lastK){product=null;basis='none';}else{product=before[before.length-1].name;basis='sentence';}}
     // audit S78: a sentence that opens by referring to the reviewed product ("This Xiaomi air purifier is faster (21
     // minutes) than the Dyson BP06 (30 minutes)", "It hit 777 nits ... to the B5's 668 nits") gives its first values to
     // that product, not to a product named after them
     else if(pageSubject&&ANAPHOR_OPEN.test(u.text)&&!own.some(p=>p.start>=0&&p.end<=f.start)){product=pageSubject;basis='page';}
     else if(after.length&&new Set(after.map(p=>p.name)).size===1){product=after[0].name;basis='sentence';}
     else{const sp=sectionProduct(s.headings);if(sp){product=sp;basis=s.role==='pair'?'pair_section':'section';}else if(pageSubject){product=pageSubject;basis='page';}}}
    // audit S77 (A1-2): the value's own clause decides first ("the maker claims 12 L/day, but in our tests it extracted 9");
    // the sentence and its headings decide only when the clause has no cue of its own
    const ownRole=(()=>{if(s.region==='boilerplate')return null;const w=windows(u.text,found,fi);const t=w.left+' '+w.right;
     if(DECLARATION_CUE272.test(t)&&!TEST_CONTEXT272.test(t))return 'manufacturer_declared';
     if(TEST_CONTEXT272.test(t)&&!DECLARATION_CUE272.test(t))return 'publisher_measured';return null;})();
    const evidenceClass0=s.region==="boilerplate"?"unknown":ownRole??classOf(s,u.text,opts.sourceType??null);
    // audit S77 (A1-16): a review page that declares its own test (method heading or method block) covers its narrative
    // sentences without a declaration cue, as documentTests covers its qualitative judgements; measured on the sealed role
    // reference: 78 missed measurements recovered, 19 values asserted where the local text alone cannot tell, 0 wrong
    const evidenceClass=evidenceClass0==='unknown'&&pageTests&&s.region==='subject'&&s.role==='sentence'&&!DECLARATION_CUE272.test(u.text)?'publisher_measured':evidenceClass0;
    let quantity:TypedQuantity|null=null;
    if(!ident){const {left,right}=windows(u.text,found,fi);
     const labels=s.label!==null?[s.label]:[left,right].filter(x=>x.trim());
     // a reporting basis right after the number ("12 litres of moisture a day") makes a per-day quantity, as a label does in a table
     const based=(s.label!==null?withLabelBasis(qk,f.unit,[s.label]):withLabelBasis(qk,f.unit,[right.slice(0,40)]))??withConventionalBasis(qk,f.unit,s.label!==null?[s.label]:[left]);if(based)f={...f,unit:based.unit};
     const frame=s.headings.slice(-2).map((t,i)=>({ref:`heading ${i}`,text:t,place:'frame' as const}));
     quantity=typeQuantity(qk,{surface:f.surface,value:f.value,low:f.low,high:f.high,unit:f.unit},{labels,contextStatements:frame,document,product,evidenceClass,source,cohort:`${source}#record ${record}`});
     const prevF=found[fi-1],nextF=found[fi+1];
     const rangeEnd=!!prevF&&/^\s*(?:to|and|-|–)\s*$/i.test(u.text.slice(prevF.end,f.start))&&/\b(?:from|between)\s*$/i.test(u.text.slice(Math.max(0,prevF.start-12),prevF.start));
     const rangeStart=!!nextF&&/^\s*(?:to|and|-|–)\s*$/i.test(u.text.slice(f.end,nextF.start))&&/\b(?:from|between)\s*$/i.test(u.text.slice(Math.max(0,f.start-12),f.start));
     const point=f.low===undefined&&!rangeEnd&&!rangeStart&&!BOUND.test(u.text.slice(Math.max(0,f.start-16),f.start));
     // the named test a value comes from ("in our hair-wrap test") identifies its record: two values of one product from two
     // tests are two tests (the owner's test-identity principle; P2 follows from it)
     const tn=/\b(?:our|the|in|during|a)\s+((?:[\p{L}-]+\s+){0,3}?(?:test|tests|testing|benchmark|trial))\b/iu.exec(s.label!==null?s.label+' '+s.headings.slice(-1).join(' '):labels.join(' ')+' '+s.headings.slice(-1).join(' '));
     if(tn&&!quantity.conditions.some(c=>c.axis==='method'))quantity={...quantity,conditions:[...quantity.conditions,{axis:'method',value:normText(tn[1]),raw:tn[1],from:'labels'}]};
     records.set(record,[...(records.get(record)??[]),{id,record,quantity,point}]);}
    quantities.push({id,segment:s.id,record,start:u.start+f.start,end:u.start+f.end,surface:f.surface,quantity,identifierPart:ident,product,productBasis:basis,evidenceClass,recordRole:null});});});}
 const byId=new Map(quantities.map(q=>[q.id,q]));
 for(const vs of records.values()){const rr=applyRecordRoles(qk,vs);for(const v of vs){const q=byId.get(v.id)!;q.quantity=rr.quantities.get(v.id)??q.quantity;q.recordRole=rr.role.get(v.id)??null;}}
 // ---- qualitative observations
 const qualitative=readQualitative(qk,segs,inv,pageSubject,sectionProduct,author,opts.sourceType??null);
 const qualitativeEvidence=readQualitativeEvidence(qk,segs,quantities,inv,pageSubject,sectionProduct,author,opts.sourceType??null,source);
 const funnel:Record<string,number>={};const inc=(x:string,n=1)=>funnel[x]=(funnel[x]??0)+n;
 for(const t of tables.tables)for(const o of t.observations)if(['quantity','range','bound','number'].includes(o.kind)){inc('table_values');if(o.quantity)inc('table_typed');}
 const segById=new Map(segs.map(s=>[s.id,s]));
 for(const q of quantities){const s=segById.get(q.segment)!;inc('segment_quantities');inc('at_'+s.location);if(q.identifierPart){inc('identifier_parts');continue;}
  if(q.quantity?.kind.id)inc('kind_established');else inc('kind_open');if(q.quantity?.metric.id)inc('metric_named');inc('product_'+(q.product?q.productBasis:'none'));
  if(q.quantity?.conditions.length)inc('with_conditions');if(q.recordRole==='condition')inc('record_condition_values');if(s.region==='boilerplate')inc('in_boilerplate');}
 inc('qualitative_evidence',qualitativeEvidence.length);inc('segments',segs.length);inc('embedded_duplicates',segs.filter(s=>s.duplicateOf).length);inc('qualitative',qualitative.length);
 return {schema:'pee.document-evidence.v1',version:DOCUMENT_EVIDENCE_VERSION,readingIdentity:`${DOCUMENT_EVIDENCE_VERSION}+${tables.readingIdentity}`,knowledge:qk.identity,
  tables,segments:segs,quantities,qualitative,qualitativeEvidence,products:inv.names,pageSubject:pageSubject||null,author,funnel};
}

/** The words that belong to a value in a sentence. The text between two values is split at the first clause boundary
 * (a comma, "and", "with", "while"...): the part before it qualifies the earlier value, the rest the later one ("a 2.2 litre
 * water tank, with the ability to extract 12 litres a day"). Coordinated values ("from 61% to 47%", "40/47/50 dB") share
 * the words of the first. */
const BOUNDARY=/[,;:()]|\s(?:and|with|while|but|plus|whereas|which|that|compared|versus|vs\.?)\s/i;
const CONNECTIVE=/^\s*(?:to|and|or|-|–|\/|,)\s*$/i;
export function windows(text:string,found:readonly FoundQuantity[],i:number):{left:string;right:string}{
 const split=(gap:string)=>{const m=BOUNDARY.exec(gap);return m?{after:gap.slice(0,m.index),before:gap.slice(m.index)}:{after:gap,before:gap};};
 let j=i;while(j>0&&CONNECTIVE.test(text.slice(found[j-1].end,found[j].start)))j--;
 const f=found[j],prev=found[j-1];const left=prev?split(text.slice(prev.end,f.start)).before:text.slice(0,f.start);
 let k=i;while(k+1<found.length&&CONNECTIVE.test(text.slice(found[k].end,found[k+1].start)))k++;
 const g=found[k],next=found[k+1];const right=next?split(text.slice(g.end,next.start)).after:text.slice(g.end);
 return {left:left.slice(-80),right:right.slice(0,80)};}
/** A key-value pair whose value is a bare number (or an h:mm time) and whose label states the unit ("Energy consumption in
 * kWh per 100 cycles": 85; "Duration of programme": 3:15) is one quantity, as a column header's unit is in a table. */
function labelledValue(qk:QuantityKnowledge,label:string,value:string):FoundQuantity[]{const v=value.trim();
 const hm=/^(\d{1,2}):([0-5]\d)(?:\s*h)?$/i.exec(v);
 if(hm&&/\b(?:duration|time|runtime|run time|programme|program|cycle)\b/i.test(label)){const u=parseUnit(qk,'h');if(u)return [{start:0,end:v.length,surface:v,value:+hm[1]+ +hm[2]/60,unit:u,unitSurface:'h'}];}
 const m=/^[-−]?\d+(?:[.,]\d+)?$/.exec(v);if(!m)return [];const lu=unitStatedInLabel(qk,label);if(!lu)return [];
 return [{start:0,end:v.length,surface:v,value:Number(v.replace(',','.')),unit:lu.unit,unitSurface:lu.surface}];}
/** The product a value is "of": a known (name) or unknown (null) product named after "of", "for", "from" or "by" within
 * a few words after the value, before any other value. */
function ofName(text:string,f:FoundQuantity,known:readonly {name:string;start:number;end:number}[],foreign:readonly {start:number;end:number}[]):string|null|undefined{
 const after=text.slice(f.end,f.end+40);const m=/^[^,;.\d]{0,24}?\b(?:of|for|from|by|on)\s+(?:the\s+|its\s+)?/i.exec(after);if(!m)return undefined;const at=f.end+m[0].length;
 const k=known.find(x=>x.start===at);if(k)return k.name;if(foreign.some(x=>x.start===at))return null;return undefined;}
/** Capitalised names with a model code (letters and digits: EK5876, AF180UK, X50) not covered by a known mention. */
/** audit S78: brand + model-code names in the body text (see readDocumentEvidence). A name is kept only if its code
 * occurs at least twice in the body and no known name already contains that code. */
const ANAPHOR_OPEN=/^\s*(?:This|Our|It|Its)\b/u;
function proseProducts(root:Node245,known:readonly string[]):string[]{
 const skip=new Set(['nav','header','footer','aside','form','button','select','script','style','noscript']);let body='';
 const w=(n:Node245)=>{if(n.kind==='text'){body+=decodeEntities245(n.text);return;}if(skip.has(n.tag)||RAW.has(n.tag))return;if(!INLINE.has(n.tag))body+=' \n ';n.children.forEach(w);if(!INLINE.has(n.tag))body+=' \n ';};w(root);
 const isCode=(t:string)=>/[A-Za-z]/.test(t)&&/\d/.test(t)&&t.length>=2&&!/^\d+(?:\.\d+)?(?:-?(?:inch|in|cm|mm|l|kg|w|kw|hz|k|p|gb|tb|mp|bar|db|nits?|mins?|h))?$/i.test(t)&&!/^[48]K$/i.test(t)&&!/^\d+(?:st|nd|rd|th)$/i.test(t);
 const NOT_BRAND=/^(?:The|This|That|These|Those|In|On|At|Our|My|We|I|It|Its|A|An|And|But|Or|For|With|From|By|To|Of|As|If|When|While|Both|Each|All|Best|Top|Model|Version|Mode|Step|Table|Figure|Section|Part|Page|Level|Grade|Class|Type|Size|Top|Price|Under|Over|About|Fig|No)$/;
 const re=/(?<![\p{L}\p{N}])([A-Z][\p{L}&+-]{1,20})[ \t]+([A-Za-z0-9][\p{L}\p{N}+-]{1,15})(?:[ \t]+([A-Z0-9][\p{L}\p{N}+-]{0,15}))?/gu;
 const found=new Map<string,string>();let m;
 while((m=re.exec(body))){const [,b,c,x]=m;if(NOT_BRAND.test(b)||!isCode(c))continue;
  const name=x&&/[A-Z]{2,}|\d/.test(x)&&x.length<=6&&!/^(?:HDR|SDR|TV|OLED|LED|LCD|RGB|UK|US|EU)$/.test(x)?`${b} ${c} ${x}`:`${b} ${c}`;
  if(!found.has(c))found.set(c,name);}
 const out:string[]=[];
 for(const [code,name] of found){const n=(body.match(new RegExp('(?<![\\p{L}\\p{N}])'+code.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}\\p{N}])','gu'))??[]).length;
  if(n<2||known.some(k=>k.includes(code)))continue;out.push(name);}
 return out;}
export function foreignNames(text:string,known:readonly {start:number;end:number}[]):{start:number;end:number}[]{const out:{start:number;end:number}[]=[];
 const re=/(?<![\p{L}\p{N}])[A-Z][\p{L}’'&+-]*(?:\s+(?:[A-Z0-9][\p{L}\p{N}.+-]*))*/gu;let m;
 while((m=re.exec(text))){const tk=m[0].split(/\s+/);if(tk.length<2||!tk.some(x=>/[A-Za-z]/.test(x)&&/\d/.test(x)&&!/^\d+(?:\.\d+)?[a-zA-Z]{1,3}$/.test(x)))continue;
  const s=m.index,e=s+m[0].length;if(known.some(k=>k.start>=0&&s<k.end&&e>k.start))continue;out.push({start:s,end:e});}
 return out;}
/** P3 beyond known names: a quantity-shaped token glued inside a capitalised name ("Arete One 20L Dehumidifier",
 * "Meaco 12L"): a number+unit with no space, preceded by a capitalised word and not by a measurement word. */
function identifierToken(text:string,f:FoundQuantity):boolean{
 if(/\s/.test(f.surface)||f.low!==undefined||!/^\d+(?:\.\d+)?[A-Za-z]+$/.test(f.surface))return false;
 const before=text.slice(Math.max(0,f.start-30),f.start);const after=text.slice(f.end,f.end+20);
 return /(?:^|\s)[A-Z][\p{L}\d-]*\s$/u.test(before)&&!/\b(?:of|is|at|to|holds?|weighs?|with|and|by|about|around|just|only|than|from|up|a|the|its)\s+$/i.test(before)&&/^\s+[A-Z][\p{L}]|^\s*$|^\s*[,.;:)–—|(]|^\s+(?:and|or|is|was|has|offers?)\b/u.test(after);}
function classOf(s:Segment,text:string,sourceType:string|null):string{
 const k=blockKind1G(text);if(k==='method'||/\b(?:in|during) (?:my|our) (?:tests?|testing)\b|\b(?:I|we) (?:tested|measured|timed|recorded|weighed|metered)\b/i.test(text))return 'publisher_measured';if(k==='estimate')return 'derived_or_estimated';
 if(s.headings.some(h=>isMethodHeading1G(h))&&s.role==='sentence'&&/\b(?:we|i|our)\b/i.test(text))return 'publisher_measured';
 if(k==='declaration'||s.headings.some(h=>/\bspec(?:ification)?s?\b/i.test(h)))return 'manufacturer_declared';
 if(sourceType==='manufacturer'||sourceType==='retailer')return 'manufacturer_declared';
 return 'unknown';}
function authorOf(root:Node245):string|null{
 for(const n of walk245(root)){if(n.tag==='script'&&/ld\+json/i.test(n.attrs.type??'')){try{const j=JSON.parse((n.text||'')+n.children.map(c=>c.rawText??c.text??'').join(''));
   const find=(o:unknown):string|null=>{if(Array.isArray(o)){for(const x of o){const r=find(x);if(r)return r;}return null;}if(!o||typeof o!=='object')return null;const r=o as Record<string,unknown>;
    const a=r.author;if(a){const x=([] as unknown[]).concat(a)[0];if(typeof x==='string')return x;if(x&&typeof x==='object'&&typeof (x as Record<string,unknown>).name==='string')return String((x as Record<string,unknown>).name);}
    for(const v of Object.values(r)){const f=find(v);if(f)return f;}return null;};const f=find(j);if(f)return f;}catch{/* not JSON */}}}
 for(const n of walk245(root))if(n.tag==='meta'&&n.attrs.name==='author'&&n.attrs.content)return n.attrs.content;
 for(const n of walk245(root))if(n.kind==='element'&&n.attrs.rel==='author'){const t=fullText(n);if(t&&words(t).length<=5)return t;}
 return null;}

function readQualitative(qk:QuantityKnowledge,segs:readonly Segment[],inv:Inventory,pageSubject:string|null,sectionProduct:(h:readonly string[])=>string|null,author:string|null,sourceType:string|null):QualitativeObservation[]{
 const ev=qk.pack.language.en.evaluation;const aspects=qk.pack.aspects??[];if(!ev||!aspects.length)return [];const out:QualitativeObservation[]=[];let n=0;
 // WD (tuned on the KV pages): a review whose own words say it tested the products (a method heading, a first-person test
 // statement) covers its judgements, as a test protocol covers its values (rules C1-C5); a sentence that reports others or
 // a maker's page keeps its own basis
 const documentTests=sourceType!=='manufacturer'&&sourceType!=='retailer'&&segs.some(s=>s.region==='subject'&&(s.headings.some(h=>isMethodHeading1G(h))||blockKind1G(s.text)==='method'));
 const valueAxes=qk.pack.conditionAxes.filter(a=>a.operatingCondition&&a.values&&Object.keys(a.values).length);
 for(const s of segs){if(s.region==='boilerplate'||s.duplicateOf||s.role==='pair'||s.role==='embedded_pair')continue;
  for(const u of sentences(s.text)){const t=u.text;if(t.length<20||t.length>600)continue;
   const toks=normText(t).split(/[^\p{L}\p{N}'’-]+/u).filter(Boolean);
   const negated=(w:string)=>{const i=toks.indexOf(normText(w).split(' ')[0]);return i>=0&&toks.slice(Math.max(0,i-3),i).some(x=>ev.negators.includes(x));};
   const count=(list:readonly string[],neg:boolean)=>list.filter(w=>hasPhrase(t,w)&&negated(w)===neg).length;
   const found=aspects.filter(a=>a.terms.some(w=>hasPhrase(t,w)));if(!found.length)continue;
   for(const a of found){const P=[...ev.positive,...(a.positive??[])],N=[...ev.negative,...(a.negative??[])];
    const pos=count(P,false)+count(N,true),neg=count(N,false)+count(P,true);if(!pos&&!neg)continue;
    const polarity=pos&&neg?'mixed':pos?'positive':'negative';
    const own=[...new Set(mentions(inv,t).map(x=>x.name))];const sp=sectionProduct(s.headings);
    const product=own.length===1?own[0]:own.length>1?null:sp??pageSubject;
    const productBasis:SegmentQuantity['productBasis']=own.length===1?'sentence':own.length>1?'none':sp?'section':pageSubject?'page':'none';
    // a judgement about no identifiable product is not product evidence
    if(!product)continue;
    const conditions:{axis:string;value:string}[]=[];for(const ax of valueAxes)for(const [v,ws] of Object.entries(ax.values!))if(ws.some(w=>hasPhrase(t,w))&&!conditions.some(c=>c.axis===ax.id))conditions.push({axis:ax.id,value:v});
    const basis=ev.reportedBy.some(w=>hasPhrase(t,w))?'reported_by_others':sourceType==='manufacturer'?'manufacturer_claim':blockKind1G(t)==='method'||/\b(?:i|we|our (?:reviewers?|testers?|team|expert))\b.{0,40}\b(?:tested|found|noticed|measured|ran|tried|used|saw|heard|impressed|liked|disliked)\b/i.test(t)||s.headings.some(h=>isMethodHeading1G(h))||documentTests?'tested_experience':'opinion_without_test';
    out.push({id:'o'+(n++),segment:s.id,aspect:a.id,polarity,strength:ev.hedges.some(w=>hasPhrase(t,w))?'hedged':'explicit',conditions,product,productBasis,basis,
     author:basis==='tested_experience'||basis==='opinion_without_test'?author:null,rankingInput:false});}}}
 return out;}


/** QE: the structured qualitative reader (see QualitativeEvidence). */
function readQualitativeEvidence(qk:QuantityKnowledge,segs:readonly Segment[],quantities:readonly SegmentQuantity[],inv:Inventory,pageSubject:string|null,
 sectionProduct:(h:readonly string[])=>string|null,author:string|null,sourceType:string|null,source:string):QualitativeEvidence[]{
 const ev=qk.pack.language.en.evaluation,ql=qk.pack.language.en.qualitative;const aspects=qk.pack.aspects??[];if(!ev||!ql||!aspects.length)return [];
 const phenomena=qk.pack.phenomena??[];const contexts=qk.pack.useContexts??[];const setAxes=qk.pack.conditionAxes.filter(a=>a.operatingCondition&&a.values);
 const any=(t:string,ws:readonly string[])=>ws.some(w=>hasPhrase(t,w));
 const documentTests=sourceType!=='manufacturer'&&sourceType!=='retailer'&&segs.some(s=>s.region==='subject'&&(s.headings.some(h=>isMethodHeading1G(h))||blockKind1G(s.text)==='method'));
 const bySeg=new Map<string,SegmentQuantity[]>();for(const q of quantities)bySeg.set(q.segment,[...(bySeg.get(q.segment)??[]),q]);
 const out:QualitativeEvidence[]=[];let n=0;
 for(const s of segs){if(s.region==='boilerplate'||s.duplicateOf||s.role==='embedded_pair')continue;
  const full=s.label?s.label+': '+s.text:s.text;const sents=s.role==='pair'?[{start:0,text:s.text}]:sentences(s.text);
  sents.forEach((u,ui)=>{const t0=s.label&&s.role==='pair'?full:u.text;if(t0.length<12||t0.length>700)return;
   // product and model names are masked before reading: "Twinfry Compact" says nothing about size
   const nm=mentions(inv,t0);let t=t0;for(const x of nm)t=t.slice(0,x.start)+' '.repeat(x.end-x.start)+t.slice(x.end);
   const toks=normText(t).split(/[^\p{L}\p{N}'’-]+/u).filter(Boolean);
   const negated=(w:string)=>{const i=toks.indexOf(normText(w).split(' ')[0]);return i>=0&&toks.slice(Math.max(0,i-3),i).some(x=>ev.negators.includes(x));};
   const count=(list:readonly string[],neg:boolean)=>list.filter(w=>hasPhrase(t,w)&&negated(w)===neg).length;
   const phs=phenomena.filter(ph=>any(t,ph.terms));
   const found=new Map<string,{phenomenon:string|null;facet:string|null}>();
   const asp=aspects.filter(a=>any(t,a.terms));
   // a phenomenon with no aspect of its own (residue, unevenness) qualifies the sentence's aspect only when there is one
   for(const a of asp){const ph=phs.find(x=>x.aspect===a.id)??(asp.length===1?phs.find(x=>!x.aspect):undefined)??null;found.set(a.id,{phenomenon:ph?.id??null,facet:ph?.facet??null});}
   for(const ph of phs)if(ph.aspect&&!found.has(ph.aspect))found.set(ph.aspect,{phenomenon:ph.id,facet:ph.facet});
   // an observed phenomenon whose property the sentence does not name is kept, on the property 'other', with its facet
   if(!found.size){const ph=phs.find(x=>!x.aspect);if(ph)found.set('other',{phenomenon:ph.id,facet:ph.facet});}
   if(!found.size)return;
   const observed=phs.length>0||any(t,ql.observationVerbs);
   const hedged=any(t,ev.hedges);const reported=any(t,ev.reportedBy);const claim=any(t,ql.claimCues)||sourceType==='manufacturer';
   const inTest=any(t,ql.testCues)||s.headings.some(h=>isMethodHeading1G(h))||blockKind1G(t)==='method'||/\b(?:i|we)\b.{0,30}\b(?:tested|cooked|ran|measured|timed|tried)\b/i.test(t);
   const experience=any(t,ql.experienceCues);const inference=any(t,ql.inferenceCues);
   const sentQ=(bySeg.get(s.id)??[]).filter(q=>s.role==='pair'||q.start>=u.start&&q.end<=u.start+u.text.length);
   const nextU=sents[ui+1];const nextQ=nextU?(bySeg.get(s.id)??[]).filter(q=>q.start>=nextU.start&&q.end<=nextU.start+nextU.text.length):[];
   const own=[...new Set(nm.map(x=>x.name))];const sp=sectionProduct(s.headings);
   const product=s.products.some(p=>p.start<0)?s.products[0].name:own.length===1?own[0]:own.length>1?own[0]:sp??pageSubject;
   const productBasis:SegmentQuantity['productBasis']=own.length?'sentence':sp?'section':pageSubject?'page':'none';
   if(!product)return;
   const conditions:QualitativeEvidence['conditions']=[];
   for(const ax of setAxes)for(const [v,ws] of Object.entries(ax.values!))if(any(t,ws)&&!conditions.some(c=>c.value===v))conditions.push({kind:ax.id==='floor_type'?'test_material':'setting',value:v});
   if(!conditions.some(c=>c.kind==='setting')){const m=/\b(?:on|at|in|using)\s+(?:the\s+)?((?:[\p{L}-]+\s){0,2}(?:mode|setting|programme|program|speed|function|preset))\b/iu.exec(t);if(m)conditions.push({kind:'setting',value:normText(m[1])});}
   for(const w of ql.testMaterials)if(hasPhrase(t,w)&&!conditions.some(c=>c.value===w))conditions.push({kind:'test_material',value:w});
   const tn=/\b(?:our|the|in|during|a)\s+((?:[\p{L}-]+\s+){0,3}?(?:test|tests|testing|benchmark|trial))\b/iu.exec(t);if(tn)conditions.push({kind:'test_procedure',value:normText(tn[1])});
   for(const w of ql.environmentCues)if(hasPhrase(t,w))conditions.push({kind:'environment',value:w});
   const useContext=contexts.find(c=>any(t,c.terms))?.id??null;
   const cause=any(t,ql.causeMarkers)?{status:(hedged?'supposed':sentQ.length||inTest?'documented':'supposed') as 'documented'|'supposed'}:null;
   let comparison:QualitativeEvidence['comparison']=null;
   const cm=new RegExp('\\b(?:'+ql.comparativeCues.map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')\\b','i').exec(t);
   if(cm){const after=t.slice(cm.index+cm[0].length);const mm=mentions(inv,after)[0]??null;const fn=/^\s+(?:the\s+|its\s+)?([A-Z][\p{L}\d-]*(?:\s+[A-Z0-9][\p{L}\d-]*){0,4})/u.exec(after);
    const other=mm?.name??fn?.[1]??null;const comp=/\b(?:better|quieter|faster|crispier|more even|cheaper|brighter|easier|superior|outperform\w*|beats?)\b/i.test(t)?'this':/\b(?:worse|louder|noisier|slower|less even|harder|inferior|lags?|behind)\b/i.test(t)?'other':null;
    if(other||comp)comparison={other,better:comp};}
   for(const [aid,ph] of found){const a=aspects.find(x=>x.id===aid)!;
    const P=[...ev.positive,...(a.positive??[])],N=[...ev.negative,...(a.negative??[])];
    let pos=count(P,false)+count(N,true),neg=count(N,false)+count(P,true);
    const pd=phenomena.find(x=>x.id===ph.phenomenon);if(pd?.polarity==='positive')pos++;if(pd?.polarity==='negative')neg++;
    // words that name a phenomenon ("whine") describe what was perceived; only evaluative words make a judgement
    const phTerms=new Set(phs.flatMap(x=>x.terms.map(normText)));const evalWords=[...P,...N].filter(w=>!phTerms.has(normText(w)));
    const judged=count(evalWords,false)+count(evalWords,true)>0;
    if(!observed&&!judged)continue;
    const statementType=observed&&judged?'observation_and_judgement':observed?'observation':'judgement';
    // QE tuned (first run, 2026-10-18): a document's testing covers what its tests made observable, not every opinion it
    // states (46 opinions and 25 use experiences were read as test observations on the 8 reference pages). The WD rule,
    // tuned on one publisher whose every sentence reports a test, overreached; a pure judgement stays an opinion unless
    // the sentence itself refers to the test.
    const evidenceType:QualitativeEvidence['evidenceType']=reported?'reported_by_others':claim?'manufacturer_claim':inference&&!observed?'inference':inTest||(documentTests&&observed&&!experience)?'observed_in_test':experience?'experience_in_use':'opinion';
    // a number on the same property: its kind measures the property, or every kind it can still be does ("62 dBA": pressure or power, both noise)
    const kinds=a.kinds??[];const onProp=(q:SegmentQuantity)=>!!q.quantity&&(q.quantity.kind.id?kinds.includes(q.quantity.kind.id):q.quantity.kind.candidates.length>0&&q.quantity.kind.candidates.every(k=>kinds.includes(k)));
    const rq=sentQ.find(onProp)??null;const rn=rq?null:nextQ.find(onProp)??null;
    out.push({id:'e'+(n++),segment:s.id,sentence:{start:u.start,end:u.start+u.text.length},property:{aspect:aid,phenomenon:ph.phenomenon,facet:ph.facet,facets:[...new Set([...(ph.facet?[ph.facet]:[]),...phs.filter(x=>!x.aspect||x.aspect===aid).map(x=>x.facet)])],kinds},statementType,evidenceType,
     polarity:pos&&neg?'mixed':pos?'positive':neg?'negative':'neutral',hedged,conditions,useContext,cause,comparison,
     relatedMeasurement:rq?{quantity:rq.id,surface:rq.surface,relation:'same_property_same_statement'}:rn?{quantity:rn.id,surface:rn.surface,relation:'same_property_next_statement'}:null,
     product,productBasis,provenance:{source,section:s.headings.at(-1)??null,author:evidenceType==='reported_by_others'||evidenceType==='manufacturer_claim'?null:author,activity:tn?normText(tn[1]):null},rankingInput:false});}});}
 return out;}

/** Value-free digest of a reading (for public outputs). */
export function documentEvidenceDigest(r:DocumentEvidence):string{return sha(JSON.stringify(r.quantities.map(q=>[q.segment,q.surface,q.quantity?.kind.id??null,q.product])));}
