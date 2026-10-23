/** Step 1D-A2 — transient semantic-document contract (HTML-first reading). Nothing here is persisted or published.
 *
 * It reads ONE page with the EXISTING Phase245 infrastructure (parseHtml245 DOM, classifyRegions245 regions,
 * buildTableGrid245 / interpretTableGrid245 tables) and states what the markup itself shows, before any measurement is
 * interpreted: metadata and structured-data identities, the page type, the principal product when the structure supports
 * one, each reader block's DOM region, heading hierarchy, section role, links and emphasis, and each table cell's position
 * and labels. Blocks are the SAME list the readers already use (textBlocks225, maxBlocks 1500, th dropped), aligned to DOM
 * nodes by their text, so every consumer keeps its block indices.
 *
 * Structure is evidence about document organisation, never that a value is true or a result independent:
 *  - a headline, og:title or <title> is a name candidate, not a product;
 *  - an ItemList never makes its first entry the main product; a Review's itemReviewed is its subject, not the page's
 *    when the page lists several products;
 *  - metadata that contradicts the visible h1 is recorded as a conflict, never resolved by choosing one;
 *  - a link or bold text is a structural cue (an identity or discovery lead), not proof;
 *  - a table cell's product comes from its own row or column header only; a comparison table is never given to the page
 *    product, and a unit is taken from the cell or its own header, never inferred.
 * `structuredTableLeads1D2` reads measurement cells with the same plan gates as the Phase272 guided reader; it is called
 * only when a caller passes both a plan and this contract (evaluation or shadow), so the default path is unchanged. */
import {createHash} from 'node:crypto';
import {parseHtml245,walk245,textOf245,decodeEntities245,locator245,type Node245} from './phase245_html_dom.js';
import {buildTableGrid245,interpretTableGrid245,type TableGrid245} from './phase245_table_grid.js';
import {tableAcquisitionStatus1F,type TableStatus1F} from './table_acquisition1f.js';
import {classifyRegions245} from './phase245_spec_extraction.js';
import {textBlocks225,type TestCandidate225} from './phase225_transient_test_probe.js';
import {DECLARED_BODY272,unitAlternation272,canonicalUnit272,dimensionOfUnit272,DIMENSION_WORDS272,DECLARATION_CUE272,TEST_CONTEXT272,rangeOrBound272,
 planWords272,type ExtractionPlan272} from './phase272_extraction_plan.js';

export type PageType1D2='single_product_review'|'product_detail'|'comparison'|'roundup'|'methodology'|'other';
export type NameSource1D2='json_ld_product'|'json_ld_item_reviewed'|'json_ld_item_list'|'microdata_product'|'og_title'|'title'|'h1'|'table_product_header'|'linked_name';
export interface StructuredName1D2 {name:string;source:NameSource1D2;blockIndex:number|null;href?:string|null}
export interface BlockInfo1D2 {tag:string;aligned:boolean;
 /** Phase245 region of the block's DOM node; `hardExcluded` only for boilerplate tags/roles, related-product microdata and
  * item listings (class-word markers such as "reviews" are reported but do not exclude: they mark whole review articles). */
 region:'main'|'comparison'|'excluded'|'unknown';regionReason:string|null;hardExcluded:boolean;
 /** Reader-block indices of the enclosing headings, outermost first (DOM order and heading level). */
 headingPath:number[];sectionRole:'methodology'|'test_results'|'specifications'|null;
 links:{text:string;href:string}[];emphasis:string[];inFigure:boolean;cell:{table:number;row:number;col:number}|null}
export interface TableCell1D2 {blockIndex:number|null;row:number;col:number;text:string;header:boolean;rowLabels:string[];colLabels:string[]}
export interface Table1D2 {index:number;phase245Mode:string;rows:number;cols:number;headerRows:number;caption:string|null;
 heading:string|null;headingBlock:number|null;hardExcluded:boolean;regionReason:string|null;
 /** From the table's own heading, caption and header row: test results, a specification sheet, or unknown. */
 context:'test'|'specification'|'unknown';headerTexts:string[];firstColumn:string[];cells:TableCell1D2[];
 /** Acquisition completeness of this table (src/table_acquisition1f.ts): 'complete' only when every source cell is represented. */
 acquisition?:TableStatus1F}
export interface DocumentSemantics1D2 {schema:'pee.document-semantics.v1d2';sourceUrl:string;
 metadata:{title:string|null;ogTitle:string|null;ogType:string|null;ogUrl:string|null;canonical:string|null;h1:string[];jsonLdTypes:string[];itemListEntries:number};
 names:StructuredName1D2[];pageType:{kind:PageType1D2;signals:string[]};
 principal:{name:string|null;source:NameSource1D2|null;conflicts:string[]};
 blocks:BlockInfo1D2[];tables:Table1D2[];figures:number;alignment:{blocks:number;aligned:number};
 /** Every DOM table this contract does not read, with the reason and its acquisition status (never omitted silently). */
 tablesNotRead?:{locator:string;reason:'nested'|'no_grid'|'table_limit_40';acquisition:TableStatus1F}[];
 stats:{nodes:number;truncated:boolean;milliseconds:number}}

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const BLOCK=new Set(['p','li','td','th','h1','h2','h3','h4','h5','h6']);
const key=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
const HARD=/^(?:boilerplate_tag|boilerplate_role|related_product_microdata|item_listing)/;
const METHOD_HEAD=/\b(?:how (?:we|i) (?:test(?:ed)?|review(?:ed)?|rate)|methodology|testing (?:process|methods?)|our test(?:ing)? (?:process|method)|how we picked)\b/i;
const RESULT_HEAD=/\b(?:test (?:data|results?)|lab results|benchmarks?|measurements|(?:our|in) (?:testing|tests?))\b/i;
const SPEC_HEAD=/\b(?:full specs|specifications?|specs|tech(?:nical)? specs|key features)\b/i;
const TABLE_TEST=/\b(?:test (?:data|results?|room)|lab results|our tests?|in our testing|(?:we|i) (?:tested|measured|recorded|timed)|measured)\b/i;
const ROUNDUP_HEAD=/\b(?:best|top \d+|\d+ best|our (?:top )?picks|buying guide)\b/i;
const COMPARE_HEAD=/\b(?:vs\.?|versus|side[- ]by[- ]side|compared|head[- ]to[- ]head)\b/i;
const REVIEW_HEAD=/\breview\b/i;

/** JSON-LD objects (with @graph, mainEntity, itemReviewed, ItemList entries), bounded. */
function jsonLd(root:Node245):{types:string[];products:{name:string;source:NameSource1D2}[];listEntries:number}{
 const types=new Set<string>();const products:{name:string;source:NameSource1D2}[]=[];let listEntries=0;let budget=400;
 const typeOf=(o:any)=>([] as string[]).concat(o?.['@type']??[]).map(String);
 const nameOf=(o:any)=>typeof o?.name==='string'?o.name.trim().slice(0,160):null;
 const visit=(o:any,role:'top'|'reviewed'|'list',depth:number)=>{
  if(!o||typeof o!=='object'||depth>6||--budget<0)return;if(Array.isArray(o)){for(const x of o.slice(0,60))visit(x,role,depth+1);return;}
  const t=typeOf(o);t.forEach(x=>types.add(x));
  const isProduct=t.some(x=>/^(?:Product|ProductGroup|ProductModel|IndividualProduct)$/.test(x));
  // A Product carrying its own Review is the reviewed item; an ItemList counts only its Product entries (pros/cons
  // lists and breadcrumbs are ItemLists too).
  if(isProduct&&nameOf(o))products.push({name:nameOf(o)!,source:role==='reviewed'||o.review?'json_ld_item_reviewed':role==='list'?'json_ld_item_list':'json_ld_product'});
  if(role==='list'&&isProduct)listEntries++;
  if(t.includes('ItemList')){const els=([] as any[]).concat(o.itemListElement??[]);
   for(const e of els.slice(0,60)){const item=e?.item??e;if(item&&typeof item==='object')visit(item,'list',depth+1);}}
  if(o['@graph'])visit(o['@graph'],role,depth+1);
  if(o.itemReviewed)visit(o.itemReviewed,'reviewed',depth+1);
  if(o.mainEntity)visit(o.mainEntity,role,depth+1);
  if(o.review&&isProduct)visit(o.review,role,depth+1);
 };
 for(const n of walk245(root))if(n.tag==='script'&&/ld\+json/i.test(n.attrs.type??'')&&n.text.length<=400_000){try{visit(JSON.parse(n.text),'top',0);}catch{/* invalid JSON-LD is ignored */}}
 return {types:[...types].sort(),products,listEntries};
}

export function readDocumentSemantics1D2(html:string,sourceUrl:string):DocumentSemantics1D2{
 const t0=Date.now();const {root,nodeCount,truncated}=parseHtml245(html);const regions=classifyRegions245(root).region;
 const meta=(p:string)=>{for(const n of walk245(root))if(n.tag==='meta'&&((n.attrs.property??n.attrs.name??'').toLowerCase()===p))return (n.attrs.content??'').trim()||null;return null;};
 const titleNode=[...walk245(root)].find(n=>n.tag==='title');
 const canonical=[...walk245(root)].find(n=>n.tag==='link'&&/\bcanonical\b/i.test(n.attrs.rel??''))?.attrs.href??null;
 const ld=jsonLd(root);
 // DOM blocks: every p/li/td/th/h1-h6 element in document order. The reader's regex takes the first such element up to the
 // first closing tag of the same name, so a nested list item yields a truncated outer block (aligned by text prefix) and
 // its inner items as separate blocks; entities the regex does not decode are decoded before comparing.
 const dom:Node245[]=[];for(const n of walk245(root))if(n.kind==='element'&&BLOCK.has(n.tag))dom.push(n);
 const deep=textBlocks225(html,{maxBlocks:1500}).blocks;
 const domText=dom.map(n=>key(textOf245(n)));const nodeOf:(Node245|null)[]=[];let ptr=0;
 for(const b of deep){const k=key(decodeEntities245(b));let hit=-1;
  if(k)for(let j=ptr;j<Math.min(dom.length,ptr+400);j++){if(dom[j].tag!=='th'&&(domText[j]===k||(k.length>=12&&domText[j].startsWith(k)))){hit=j;break;}}
  if(hit>=0){nodeOf.push(dom[hit]);ptr=hit+1;}else nodeOf.push(null);}
 const blockOf=new Map<Node245,number>();nodeOf.forEach((n,i)=>{if(n)blockOf.set(n,i);});
 // Heading hierarchy in DOM order over the aligned blocks.
 const level=(n:Node245|null)=>n?Number(/^h([1-6])$/.exec(n.tag)?.[1]??0):0;
 const stack:{lv:number;bi:number}[]=[];const headingPath:number[][]=[];
 for(let i=0;i<deep.length;i++){const lv=level(nodeOf[i]);if(lv){while(stack.length&&stack[stack.length-1].lv>=lv)stack.pop();headingPath.push(stack.map(s=>s.bi));stack.push({lv,bi:i});}
  else headingPath.push(stack.map(s=>s.bi));}
 const role=(i:number):BlockInfo1D2['sectionRole']=>{const p=headingPath[i];for(let k=p.length-1;k>=0;k--){const h=deep[p[k]];
  if(METHOD_HEAD.test(h))return 'methodology';if(SPEC_HEAD.test(h))return 'specifications';if(RESULT_HEAD.test(h))return 'test_results';}return null;};
 const regionOf=(n:Node245|null)=>{if(!n)return {region:'unknown' as const,reason:null,hard:false};const r=regions.get(n);
  return {region:(r?.kind??'unknown') as BlockInfo1D2['region'],reason:r?.reason??null,hard:r?.kind==='excluded'&&HARD.test(r.reason??'')};};
 const abs=(h:string)=>{try{const u=new URL(h,sourceUrl);return /^https?:$/.test(u.protocol)?u.href.split('#')[0]:null;}catch{return null;}};
 const blocks:BlockInfo1D2[]=deep.map((_,i)=>{const n=nodeOf[i];const r=regionOf(n);const links:{text:string;href:string}[]=[];const emphasis:string[]=[];let inFigure=false;
  if(n){for(const d of walk245(n)){if(d.tag==='a'&&links.length<10){const h=abs(d.attrs.href??'');const tx=textOf245(d);if(h&&tx&&tx.length<=120)links.push({text:tx,href:h});}
    if((d.tag==='strong'||d.tag==='b')&&emphasis.length<5){const tx=textOf245(d);if(tx&&tx.length<=80)emphasis.push(tx);}}
   let a=n.parent;while(a){if(a.tag==='figure'){inFigure=true;break;}a=a.parent;}}
  return {tag:n?.tag??'unknown',aligned:!!n,region:r.region,regionReason:r.reason,hardExcluded:r.hard,headingPath:headingPath[i],sectionRole:role(i),links,emphasis,inFigure,cell:null};});
 // Tables: the Phase245 grid of every non-nested table, with each cell's reader block and its own header labels.
 const tables:Table1D2[]=[];const tablesNotRead:NonNullable<DocumentSemantics1D2['tablesNotRead']>=[];let lastHeading:Node245|null=null;let lastPara:Node245|null=null;let figures=0;
 for(const n of walk245(root)){if(n.kind!=='element')continue;if(level(n)){lastHeading=n;lastPara=null;}if(n.tag==='p')lastPara=n;if(n.tag==='figure')figures++;
  if(n.tag!=='table')continue;{let a=n.parent,nested=false;while(a){if(a.tag==='table'){nested=true;break;}a=a.parent;}
   if(nested){tablesNotRead.push({locator:locator245(n),reason:'nested',acquisition:tableAcquisitionStatus1F(n,buildTableGrid245(n),{truncated})});continue;}}
  const g:TableGrid245|null=buildTableGrid245(n);
  if(!g||tables.length>=40){tablesNotRead.push({locator:locator245(n),reason:g?'table_limit_40':'no_grid',acquisition:tableAcquisitionStatus1F(n,g,{truncated})});continue;}
  const it=interpretTableGrid245(g);
  const cellAt=(r:number,c:number)=>{const id=g.slot[r]?.[c]??-1;return id>=0?g.cells[id]:null;};
  let hr=0;while(hr<g.rows&&(g.theadRows.has(hr)||g.slot[hr].every(id=>id<0||(g.cells[id].header&&g.cells[id].scope!=='row'))))hr++;
  if(hr===0&&(it.mode==='products_in_columns'||it.mode==='products_in_rows'||it.reasons.includes('implicit_header_row')))hr=1;
  if(hr>=g.rows)hr=Math.min(1,g.rows-1);
  const headerTexts=[...Array(g.cols).keys()].map(c=>hr?cellAt(hr-1,c)?.text??'':'');
  const firstColumn=[...Array(g.rows).keys()].filter(r=>r>=hr).map(r=>cellAt(r,0)?.text??'');
  const r=regionOf(n);const heading=lastHeading?textOf245(lastHeading).slice(0,200):null;
  // As Phase226 requires, first-person method prose directly before the table (after its heading) also states a test context.
  const lead=lastPara?textOf245(lastPara).slice(-600):'';
  const ctxText=[heading??'',g.caption??'',...headerTexts,/\b(?:we|i)\b/i.test(lead)?lead:''].join(' | ');
  const context:Table1D2['context']=TABLE_TEST.test(ctxText)||TEST_CONTEXT272.test(ctxText)?'test':SPEC_HEAD.test(ctxText)?'specification':'unknown';
  const index=tables.length;const cells:TableCell1D2[]=[];
  for(const c of g.cells){if(c.row<0)continue;const bi=blockOf.get(c.node)??null;
   const colLabels=[...Array(hr).keys()].map(rr=>cellAt(rr,c.col)).filter(x=>x&&x!==c).map(x=>x!.text).filter((x,k,a)=>x&&a.indexOf(x)===k);
   const rowLabels=c.col>0?[...Array(c.col).keys()].map(cc=>cellAt(c.row,cc)).filter(x=>x&&x!==c&&(x.header||x.col===0)).map(x=>x!.text).filter((x,k,a)=>x&&a.indexOf(x)===k):[];
   cells.push({blockIndex:bi,row:c.row,col:c.col,text:c.text,header:c.header||c.row<hr,rowLabels,colLabels});
   if(bi!==null)blocks[bi].cell={table:index,row:c.row,col:c.col};}
  tables.push({index,phase245Mode:it.mode,rows:g.rows,cols:g.cols,headerRows:hr,caption:g.caption,heading,headingBlock:lastHeading?blockOf.get(lastHeading)??null:null,
   hardExcluded:r.hard,regionReason:r.reason,context,headerTexts,firstColumn,cells,acquisition:tableAcquisitionStatus1F(n,g,{truncated})});}
 // Names the structure states, with their provenance; none is an identity decision.
 const h1=dom.filter(n=>n.tag==='h1').map(n=>textOf245(n)).filter(Boolean);
 // A structured "name" that is a headline sentence (publishers put review titles there) is not a product name; a trailing
 // "Review" word is removed and the removal recorded. Neither is filled from anywhere else.
 const conflicts:string[]=[];
 const HEADLINE=/\b(?:I|we|you|my|our|is|are|was|were|wouldn['’]t|isn['’]t|can['’]t|tested|here['’]s|should|best)\b|[?!]/i;
 for(const p of ld.products){if(/\s+review$/i.test(p.name)){p.name=p.name.replace(/\s+review$/i,'');conflicts.push('structured_name_review_suffix_removed');}
  if(HEADLINE.test(p.name)||p.name.split(/\s+/).length>9){(p as {headline?:boolean}).headline=true;conflicts.push('structured_name_is_headline');}}
 ld.products=ld.products.filter(p=>!(p as {headline?:boolean}).headline);
 const names:StructuredName1D2[]=[...ld.products.map(p=>({name:p.name,source:p.source,blockIndex:null}))];
 const ogTitle=meta('og:title'),ogType=meta('og:type');
 // Page type from structure: several independent signals, each recorded.
 const signals:string[]=[];const h=h1[0]??ogTitle??'';
 const reviewed=ld.products.filter(p=>p.source==='json_ld_item_reviewed');
 if(reviewed.length)signals.push('json_ld_review_item_reviewed:'+reviewed.length);
 if(ld.listEntries>=3)signals.push('json_ld_item_list_products:'+ld.listEntries);
 if(ld.types.includes('Product')&&!reviewed.length)signals.push('json_ld_top_level_product');
 if(ogType)signals.push('og_type:'+ogType.toLowerCase());
 if(ROUNDUP_HEAD.test(h))signals.push('headline_roundup_wording');
 if(COMPARE_HEAD.test(h))signals.push('headline_comparison_wording');
 if(REVIEW_HEAD.test(h))signals.push('headline_review_wording');
 if(METHOD_HEAD.test(h))signals.push('headline_methodology_wording');
 const productTables=tables.filter(t=>t.phase245Mode==='products_in_columns'||t.phase245Mode==='products_in_rows').length;
 if(productTables)signals.push('multi_product_tables:'+productTables);
 const kind:PageType1D2=signals.includes('headline_methodology_wording')?'methodology'
  :signals.some(s=>s.startsWith('json_ld_item_list'))||signals.includes('headline_roundup_wording')?'roundup'
  :signals.includes('headline_comparison_wording')?'comparison'
  :reviewed.length===1||(signals.includes('headline_review_wording')&&!reviewed.length)?'single_product_review'
  :signals.includes('json_ld_top_level_product')&&ogType?.toLowerCase()==='product'?'product_detail':'other';
 // Principal product: only for a single-product page, from structured identity first; contradictions are recorded.
 let principal:{name:string|null;source:NameSource1D2|null}={name:null,source:null};
 if(kind==='single_product_review'||kind==='product_detail'){
  const distinct=[...new Map([...reviewed,...ld.products.filter(p=>p.source==='json_ld_product')].map(p=>[key(p.name),p])).values()];
  if(distinct.length===1)principal={name:distinct[0].name,source:distinct[0].source};
  else if(distinct.length>1)conflicts.push('several_structured_products:'+distinct.length);
  if(principal.name&&h&&!key(h).includes(key(principal.name)))conflicts.push('structured_name_not_in_headline');}
 else if(reviewed.length===1)conflicts.push('review_item_on_'+kind+'_page');
 // Product names in table headers (rows or columns of a table), with their reader block when aligned.
 // A header group (the header row, or the first column) names products only when at least two of its cells are name-shaped:
 // 2-6 tokens, each capitalised or carrying a digit, and some lower-case or digit beyond capitals ("Levoit Vital 200S", "LG B6";
 // not "Fan speed 1", "AIR PURIFIER", "Manufacturer").
 const nameShaped=(s:string)=>{const tk=s.trim().split(/\s+/);return tk.length>=2&&tk.length<=6&&s.length<=60&&tk.every(x=>/^[A-Z0-9][\w+&.'’/-]*$/.test(x))&&tk.some(x=>/[a-z]|\d/.test(x.slice(1))||/\d/.test(x));};
 for(const t of tables){if(t.hardExcluded||t.context==='specification')continue;
  // The first column of a key/value table holds property labels, unless the table has a header row whose value-column
  // header is itself a property label ("Model | Brightness (nits)"): then the rows are the products.
  const rowsAreItems=t.phase245Mode!=='key_value'||(t.headerRows>0&&!!t.headerTexts[1]&&!nameShaped(t.headerTexts[1]));
  const groups=[t.cells.filter(c=>c.header&&c.col>0&&c.row===t.headerRows-1),rowsAreItems?t.cells.filter(c=>c.col===0&&c.row>=t.headerRows):[]];
  for(const g of groups){const ok=g.filter(c=>nameShaped(c.text));const filled=g.filter(c=>c.text.trim()).length;if(ok.length>=2&&ok.length>=0.6*filled)for(const c of ok)names.push({name:c.text.trim(),source:'table_product_header',blockIndex:c.blockIndex});}}
 for(const [i,b] of blocks.entries())for(const l of b.links){const tx=l.text.replace(/\s+reviews?$/i,'');if(/[A-Z]/.test(tx[0]??'')&&/\d/.test(tx)&&tx.split(/\s+/).length<=6)names.push({name:tx,source:'linked_name',blockIndex:i,href:l.href});}
 return {schema:'pee.document-semantics.v1d2',sourceUrl,
  metadata:{title:titleNode?titleNode.text.trim()||null:null,ogTitle,ogType,ogUrl:meta('og:url'),canonical,h1,jsonLdTypes:ld.types,itemListEntries:ld.listEntries},
  names,pageType:{kind,signals},principal:{...principal,conflicts},blocks,tables,tablesNotRead,figures,
  alignment:{blocks:deep.length,aligned:nodeOf.filter(Boolean).length},stats:{nodes:nodeCount,truncated,milliseconds:Date.now()-t0}};
}

/** The product of a table cell from its own row or column header, given a judge of product names (the document's own
 * identity inventory in evaluation). Key/value tables whose value column is headed by one product report that product.
 * Anything else is not assigned here (the section or page rules decide downstream). */
export function cellProducts1D2(sem:DocumentSemantics1D2,isProduct:(name:string)=>string|null):Map<number,{product:string|null;basis:string}>{
 const out=new Map<number,{product:string|null;basis:string}>();
 for(const t of sem.tables){if(t.hardExcluded)continue;
  const hp=t.headerRows?t.headerTexts.map((h,c)=>c>0?isProduct(h):null):t.headerTexts.map(()=>null);const cp=new Map<number,string|null>();
  for(const c of t.cells)if(c.col===0&&c.row>=t.headerRows)cp.set(c.row,isProduct(c.text));
  const nh=hp.filter(Boolean).length,nc=[...cp.values()].filter(Boolean).length;
  const columns=nh>=2&&nh>nc,rows=nc>=2&&nc>nh,kv=t.cols===2&&nh===1&&nc===0;
  if(!columns&&!rows&&!kv)continue;
  for(const c of t.cells){if(c.header||c.col===0||c.blockIndex===null)continue;
   const p=columns||kv?hp[c.col]??null:cp.get(c.row)??null;
   out.set(c.blockIndex,{product:p,basis:columns?'column_header':rows?'row_header':'value_column_header'});}}
 return out;
}

const PRICE=/[$£€¥]\s?\d|\d\s?(?:usd|gbp|eur)\b/i;
const DECLARED_BODY=DECLARED_BODY272; // S86c: one definition, shared with the prose reader
/** The table reader's own patterns, exported unchanged for the table decision ledger (src/table_ledger1e.ts), which must
 * apply exactly the same gates. */
export const TABLE_GATES1D2={TABLE_TEST,SPEC_HEAD,PRICE,DECLARED_BODY} as const;
/** Measurement cells of test tables, read with the Phase272 plan gates (unit in the plan; a taught term of the unit's
 * dimension, or a generic dimension word, in the cell's own labels; no declaration cue; not a range or bound; not a price).
 * Several values in one cell are read separately with their local label ("3.6 V: 36.1 dB 4.2 V: 36.9 dB"). A bare number
 * takes a unit only from its own row or column labels when they name exactly one unit. Specification tables and
 * hard-excluded regions are not read; a table of unknown context is read only for rows whose label is itself a test cue. */
export function structuredTableLeads1D2(sem:DocumentSemantics1D2,plan:ExtractionPlan272,opts:{sourceUrl:string;documentSha256?:string|null;
 blocks:readonly string[];documentReportsTesting:boolean;subjectOf?:(blockIndex:number)=>{name:string;model:string|null;sku:null}|null}):TestCandidate225[]{
 if(!opts.documentReportsTesting)return [];
 const out:TestCandidate225[]=[];const unitRe=new RegExp('(?<![\\d.,])(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,3})?|\\d{1,7}(?:\\.\\d{1,3})?)\\s*('+unitAlternation272(plan.units)+')(?![a-z0-9])','gi');
 const labelUnit=new RegExp('(?:^|[\\s(,])(?:in\\s+)?('+unitAlternation272(plan.units)+')(?=[\\s),.]|$)','gi');
 const taughtFor=(dim:string)=>new Set(plan.measurements.filter(m=>m.dimensions.includes(dim)).flatMap(m=>m.terms));
 for(const t of sem.tables){if(t.hardExcluded||t.context==='specification')continue;
  for(const c of t.cells){if(c.header||c.blockIndex===null||(c.col===0&&t.cols>1))continue;const line=opts.blocks[c.blockIndex]??'';if(!line||line.length>900)continue;
   const labels=[...c.colLabels,...c.rowLabels].join(' | ');
   if(t.context!=='test'&&!(TABLE_TEST.test(labels)||TEST_CONTEXT272.test(labels)))continue;
   // A label naming a certification or standards body ("AHAM CADR") reports a declared rating, not the tester's result.
   if(DECLARATION_CUE272.test(labels)||DECLARED_BODY.test(labels)||PRICE.test(line))continue;
   const found:{value:number;unit:string;at:number;len:number;local:string}[]=[];let prev=0;
   for(const m of line.matchAll(unitRe)){const unit=canonicalUnit272(m[2]);if(!unit)continue;found.push({value:Number(m[1].replace(/,/g,'')),unit,at:m.index!,len:m[0].length,local:line.slice(prev,m.index!)});prev=m.index!+m[0].length;}
   if(!found.length){const bare=/^\s*(\d{1,7}(?:\.\d{1,3})?)\s*$/.exec(line);
    if(bare){const units=[...new Set([...labels.matchAll(labelUnit)].map(m=>canonicalUnit272(m[1])).filter((u):u is string=>!!u))];
     if(units.length===1)found.push({value:Number(bare[1]),unit:units[0],at:line.indexOf(bare[1]),len:bare[1].length,local:''});}}
   for(const f of found){if(!plan.units.includes(f.unit))continue;const dim=dimensionOfUnit272(f.unit)!;
    const ctx=planWords272(labels+' '+f.local);const taught=taughtFor(dim);
    if(!(ctx.some(w=>taught.has(w))||ctx.some(w=>(DIMENSION_WORDS272[dim]??[]).includes(w))))continue;
    if(rangeOrBound272(line,f.at,f.at+f.len)||!Number.isFinite(f.value)||f.value<0)continue;
    const blockHash=sha(line);const subj=opts.subjectOf?.(c.blockIndex)??null;
    const id=sha(JSON.stringify([opts.sourceUrl,blockHash,f.at,f.value,f.unit,'table1d2']));if(out.some(o=>o.id===id))continue;
    out.push({id,sourceUrl:opts.sourceUrl,documentSha256:opts.documentSha256??null,blockSha256:blockHash,blockIndex:c.blockIndex,valueOffset:f.at,value:f.value,unit:f.unit,
     instrument:null,condition:null,methodCue:'structured_table_measurement_term',conditionCodes:[],setpointC:null,documentProtocolCodes:[],
     subject:subj,subjectAssignment:subj?'table_row_declared_model_unverified':'not_identified',classification:'publisher_reported_measurement_lead_only',
     methodReviewed:false,originalWorkReviewed:false,reviewerIndependent:false,exactVariantVerified:false,market:'unknown',scientificEvidenceAdmitted:false,rankingAuthorized:false});}
   if(out.length>=200)return out;}}
 return out;
}
