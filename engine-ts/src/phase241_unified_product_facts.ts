/** Phase241 — source-independent, conservative product knowledge staging layer.
 * It joins existing PDF/DOCX structured claim leads and structurally explicit HTML
 * property rows in a single contract. It does NOT turn text into verified facts,
 * identify pictured icons, or authorise ranking. No publisher document body stored.
 * Architectural reference: DoclingDocument and schema.org PropertyValue.
 */
import {createHash} from 'node:crypto';
import {PAGE_MAX_BYTES} from './approved_web_reader.js';
import type {ParsedDocument228,DocClaim228} from './phase228_document_observer.js';

export type SourceFormat241='pdf'|'docx'|'html';
export type FactRole241='product_specification'|'operation'|'installation'|'safety'|'component'|'availability'|'unresolved';
export type Value241={type:'scalar';number:number;unit:string}|{type:'range';min:number;max:number;unit:string}|{type:'text';value:string};
export interface Fact241 {
  property:string;propertyKey:string;value:Value241;role:FactRole241;
  context:{component:string|null;condition:string|null;variant:string|null;market:string|null;rowHeading:string|null};
  provenance:{format:SourceFormat241;sourceId:string;documentSha256:string|null;locator:string;producer:'manufacturer'|'independent_unknown';method:string};
  status:'unverified_source_declaration';identity:'unresolved'|'document_declared_unverified';
  scientificTestEvidence:false;rankingAuthorized:false;
}
export interface EvidenceIR241 {schema:'pee241.unified-facts.v1';format:SourceFormat241;facts:Fact241[];
  unresolvedCount:number;rawSourceStored:false;rankingAuthorized:false;identityVerified:false;}
const clean=(s:string)=>s.normalize('NFKC').replace(/\s+/g,' ').trim();
const key=(s:string)=>clean(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const digest=(x:string)=>createHash('sha256').update(x).digest('hex');
function valueFromClaim(c:DocClaim228):Value241|null {
 if(c.range){if(!Number.isFinite(c.range.lower)||!Number.isFinite(c.range.upper)||c.range.upper<c.range.lower)return null;
  return {type:'range',min:c.range.lower,max:c.range.upper,unit:c.range.unit};}
 if(c.value!==null){if(!Number.isFinite(c.value))return null;return {type:'scalar',number:c.value,unit:c.unit};}
 // Symbolic optionality is an authored availability declaration, never a numeric value.
 if(c.availabilityKind&&c.optionStatus)return {type:'text',value:c.optionStatus};
 return null;
}
/** Classify an existing typed manufacturer's declaration using its explicit source type.
 * Unknown tuple semantics are kept unresolved rather than guessing from numbers.
 */
function claimRole(c:DocClaim228):FactRole241 {
 if(c.availabilityKind)return 'availability';
 if(c.cookingGuideSetting||c.programSetting||c.programTableSetting||c.manualControlSetting)return 'operation';
 if(c.configurationDependency)return 'component';
 if(c.scopeComponent||c.componentModel)return 'component';
 // A numeric claim is not automatically an appliance specification: it may be an
 // installation clearance, accessory dimension, maintenance duration or warning.
 return 'unresolved';
}
export function documentClaimsToIR241(document:ParsedDocument228,sourceId:string):EvidenceIR241 {
 if(document.schema!=='pee228.document-claims.v1'||document.rankingAuthorized!==false||document.rawTextStored!==false||
   document.rawDocumentStored!==false||!['pdf','docx'].includes(document.format)||!sourceId.trim())throw Error('241_untrusted_document');
 const facts:Fact241[]=[];
 for(const c of document.claims){
  if(c.rankingAuthorized!==false||c.testedPerformance!==false||c.exactVariantVerified!==false||
    c.sourceRole!=='publisher_document_claim_unverified')throw Error('241_untrusted_document_claim');
  const value=valueFromClaim(c);if(!value||!key(c.label))continue;
  const at=c.locator;
  const locator=at.box?`page:${at.page??'?'}:box:${at.box.join(',')}`:
     at.page?`page:${at.page}:line:${at.line??'?'}`:
     at.table?`table:${at.table}:row:${at.row??'?'}`:`paragraph:${at.paragraph??'?'}`;
  facts.push({property:clean(c.label),propertyKey:key(c.label),value,role:claimRole(c),
   context:{component:c.scopeComponent??c.componentModel??null,condition:c.condition??null,
      variant:c.variantModel??c.catalogModel??null,market:null,rowHeading:null},
   provenance:{format:document.format,sourceId,documentSha256:document.documentSha256,
      locator,producer:'manufacturer',method:c.extractionMethod??'existing_document_reader'},
   status:'unverified_source_declaration',identity:c.model?'document_declared_unverified':'unresolved',
   scientificTestEvidence:false,rankingAuthorized:false});
 }
 return {schema:'pee241.unified-facts.v1',format:document.format,facts,unresolvedCount:(document.visualTableSlots?.length??0)+
   document.claims.length-facts.length,rawSourceStored:false,rankingAuthorized:false,identityVerified:false};
}

/** Structured HTML value rows are only accepted where the author establishes an
 * unambiguous label/value association. Ambiguous multi-column/gridded tables
 * intentionally require a real DOM/table-grid parser, not a regex guess.
 */
export interface HtmlRecord241 {label:string;valueText:string;locator:string;kind:'dl'|'row-header';}
const noTags=(s:string)=>clean(s.replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|#160);/gi,' ')
 .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"'));
const unsafeCell=(x:string)=>/\b(?:rowspan|colspan|headers)\s*=|<\s*(?:table|script|img|svg)\b/i.test(x);
/** Same bound as the Phase222 page reader; typical review and retail pages exceed 200KB. */
export const HTML_MAX_241=PAGE_MAX_BYTES;
export function explicitHtmlRecords241(html:string):HtmlRecord241[] {
 if(typeof html!=='string'||html.length>HTML_MAX_241)throw Error('241_html_size');
 const out:HtmlRecord241[]=[];let ordinal=0;
 const bare=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'');
 for(const dl of bare.matchAll(/<dl\b[^>]*>([\s\S]*?)<\/dl\s*>/gi)){
  const body=dl[1];const matches=[...body.matchAll(/<(dt|dd)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi)];
  for(let i=0;i+1<matches.length;i+=2){if(matches[i][1].toLowerCase()!=='dt'||matches[i+1][1].toLowerCase()!=='dd')continue;
   if(unsafeCell(matches[i][2])||unsafeCell(matches[i+1][2]))continue;
   const label=noTags(matches[i][3]),valueText=noTags(matches[i+1][3]);
   if(label&&valueText)out.push({label,valueText,locator:`dl:${++ordinal}`,kind:'dl'});
  }
 }
 for(const table of bare.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table\s*>/gi)){
  if(/\b(?:rowspan|colspan)\s*=/.test(table[1]))continue;
  for(const tr of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)){
   const cells=[...tr[1].matchAll(/<(th|td)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi)];
   if(cells.length!==2||cells[0][1].toLowerCase()!=='th'||cells[1][1].toLowerCase()!=='td')continue;
   if(unsafeCell(cells[0][2])||unsafeCell(cells[1][2]))continue;
   // An explicit column header in the first cell is not a label for the right cell.
   const scope=/\bscope\s*=\s*["']?([a-z]+)/i.exec(cells[0][2])?.[1];
   if(scope&&scope.toLowerCase()!=='row')continue;
   const label=noTags(cells[0][3]),valueText=noTags(cells[1][3]);
   if(label&&valueText)out.push({label,valueText,locator:`table:row:${++ordinal}`,kind:'row-header'});
  }
 }
 return out.slice(0,90);
}
const quantity=/^(-?[0-9]{1,8}(?:[.,][0-9]{1,4})?)\s*(?:([–-]|to)\s*(-?[0-9]{1,8}(?:[.,][0-9]{1,4})?)\s*)?([\p{L}°%/µ²³]+(?:\s*\/\s*[\p{L}]+)?)$/iu;
function htmlQuantifiedValue(s:string):Value241|null {
 if(s.length>100)return null;
 const m=quantity.exec(s);if(!m)return null;
 const min=Number(m[1].replace(',','.')),max=m[3]?Number(m[3].replace(',','.')):null;
 if(!Number.isFinite(min)||Math.abs(min)>1e7||max!==null&&(!Number.isFinite(max)||Math.abs(max)>1e7||max<=min))return null;
 const unit=clean(m[4]).toLowerCase();
 return max!==null?{type:'range',min,max,unit}:{type:'scalar',number:min,unit};
}
/** Explicit schema.org Product PropertyValue and quantitative metadata from HTML.
 * This is a source-authored claim, not a verified claim. Reject mixed-product JSON-LD
 * documents until product identity can be associated without guessing.
 */
function jsonLdPropertyFacts241(html:string,sourceId:string):Fact241[] {
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
  .filter(m=>/\btype\s*=\s*["']application\/ld\+json["']/i.test(m[1]));
 const facts:Fact241[]=[];let index=0;
 const allProducts:Record<string,unknown>[]=[];
 for(const script of scripts.slice(0,12)){
  if(script[2].length>60_000)continue;
  let raw:unknown;try{raw=JSON.parse(script[2]);}catch{continue;}
  const objects:unknown[]=[];const collect=(node:unknown):void=>{
   if(Array.isArray(node)){for(const n of node.slice(0,30))collect(n);return;}
   if(!node||typeof node!=='object')return;
   const v=node as Record<string,unknown>;
   if(Array.isArray(v['@graph'])){collect(v['@graph']);return;}
   objects.push(v);
  };
  collect(raw);
  const products=objects.filter(x=>{
   const t=(x as Record<string,unknown>)['@type'];
   return (Array.isArray(t)?t:[t]).some(y=>typeof y==='string'&&/(?:^|[/#])Product(?:Group)?$/.test(y));
  }) as Record<string,unknown>[];
  allProducts.push(...products);
 }
 // A page with several Product nodes has no verified variant-to-property link.
 if(allProducts.length!==1)return [];
 const prod=allProducts[0];
 // Declared offer price: one value, or the min-max range across a ProductGroup's variants.
 {
  const offerList=(x:unknown)=>(Array.isArray(x)?x:x?[x]:[]).filter(o=>o&&typeof o==='object') as Record<string,unknown>[];
  const variants=(Array.isArray(prod.hasVariant)?prod.hasVariant:[]).slice(0,60).filter(v=>v&&typeof v==='object') as Record<string,unknown>[];
  const offers=[...offerList(prod.offers),...variants.flatMap(v=>offerList(v.offers))].slice(0,120);
  const prices=offers.flatMap(o=>{
   const n=typeof o.price==='number'?o.price:typeof o.price==='string'&&/^\d{1,7}(?:\.\d{1,2})?$/.test(o.price)?Number(o.price):NaN;
   const cur=typeof o.priceCurrency==='string'&&/^[A-Z]{3}$/.test(o.priceCurrency)?o.priceCurrency.toLowerCase():null;
   return Number.isFinite(n)&&n>=0&&n<=1e7&&cur?[{n,cur}]:[];});
  if(prices.length&&prices.every(p=>p.cur===prices[0].cur)){
   const min=Math.min(...prices.map(p=>p.n)),max=Math.max(...prices.map(p=>p.n));
   facts.push({property:'Price',propertyKey:'price',
    value:min===max?{type:'scalar',number:min,unit:prices[0].cur}:{type:'range',min,max,unit:prices[0].cur},role:'unresolved',
    context:{component:null,condition:null,variant:null,market:null,rowHeading:null},
    provenance:{format:'html',sourceId,documentSha256:digest(html),locator:'jsonld:offers',
     producer:'independent_unknown',method:'schema_org_offer_price'},
    status:'unverified_source_declaration',identity:'unresolved',scientificTestEvidence:false,rankingAuthorized:false});
  }
 }
 {
  const props=[prod.specification,prod.additionalProperty].flatMap(v=>Array.isArray(v)?v:v?[v]:[]);
  for(const obj of props.slice(0,60)){
   if(!obj||typeof obj!=='object'||Array.isArray(obj))continue;
   const item=obj as Record<string,unknown>;
   const label=typeof item.name==='string'?clean(item.name):'';
   const unit=typeof item.unitText==='string'?clean(item.unitText).toLowerCase():'';
   if(!label||label.length>100||!key(label))continue;
   let value:Value241|null=null;
   if(typeof item.value==='number'&&Number.isFinite(item.value)&&Math.abs(item.value)<=1e7&&unit){
    value={type:'scalar',number:item.value,unit};
   }else if(typeof item.value==='string'){
    value=htmlQuantifiedValue(unit&&/^-?\d+(?:[.,]\d+)?$/.test(item.value)?item.value+' '+unit:item.value);
   }else if(typeof item.minValue==='number'&&typeof item.maxValue==='number'&&unit&&
    Number.isFinite(item.minValue)&&Number.isFinite(item.maxValue)&&Math.abs(item.minValue)<=1e7&&Math.abs(item.maxValue)<=1e7&&item.maxValue>item.minValue){
    value={type:'range',min:item.minValue,max:item.maxValue,unit};
   }
   if(!value)continue;
   facts.push({property:label,propertyKey:key(label),value,role:'unresolved',
    context:{component:null,condition:null,variant:null,market:null,rowHeading:null},
    provenance:{format:'html',sourceId,documentSha256:digest(html),locator:`jsonld:property:${++index}`,
     producer:'manufacturer',method:'schema_org_product_property_value'},
    status:'unverified_source_declaration',identity:'unresolved',scientificTestEvidence:false,rankingAuthorized:false});
  }
 }
 return facts;
}
/** First text fragment of a cell: a product name before any trailing link such as "Read review". */
const firstFragment=(cell:string)=>cell.split(/<[^>]*>/).map(x=>noTags(x)).find(Boolean)??'';
/** Two common catalogue forms the generic quantity parser cannot read: a currency-prefixed price
 * ("$180", "€ 1.299,00" is left as text when ambiguous) and imperial compound weights ("2 lb. 12 oz."). */
function matrixQuantity(v:string):Value241|null{
 const price=/^([$€£])\s?([0-9]{1,6}(?:\.[0-9]{2})?)$/.exec(v.replace(/,(?=[0-9]{3}\b)/g,''));
 if(price)return {type:'scalar',number:Number(price[2]),unit:({'$':'usd','€':'eur','£':'gbp'} as Record<string,string>)[price[1]]};
 const w=/^(?:([0-9]{1,3}(?:\.[0-9]+)?)\s*lbs?\.?)?\s*(?:([0-9]{1,3}(?:\.[0-9]+)?)\s*oz\.?)?$/i.exec(v);
 if(w&&(w[1]||w[2])){const grams=(Number(w[1]??0)*16+Number(w[2]??0))*28.349523125;
  return {type:'scalar',number:Math.round(grams),unit:'g'};}
 return null;
}
/** Short declared value only: sentence-like editorial text (opinions, quotes) is never kept. */
const shortDeclaredText=(v:string)=>v.length<=40&&v.split(' ').length<=6&&!/[.!?]$/.test(v)&&/\S/.test(v);
/** Product comparison matrices: one product per column, one property per row, e.g.
 *     |            | Model A | Model B |
 *     | Weight:    | 1.2 kg  | 1.4 kg  |
 * Accepted only in a strict shape (empty top-left header cell, >=2 product columns, every row
 * the same width, no row/col spans). The column heading is a publisher-declared, UNVERIFIED
 * product identity; the producer of the values is unknown (may be a reviewer, may be copied
 * from a manufacturer). Opinion rows are dropped by shortDeclaredText. */
export function comparisonMatrixFacts241(html:string,sourceId:string):Fact241[]{
 if(typeof html!=='string'||html.length>HTML_MAX_241)throw Error('241_html_size');
 const bare=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'');
 const facts:Fact241[]=[];let tableNo=0;
 for(const table of bare.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table\s*>/gi)){
  tableNo++;
  if(/\b(?:rowspan|colspan)\s*=/.test(table[1])||/<table\b/i.test(table[1]))continue;
  const rows=[...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)]
   .map(tr=>[...tr[1].matchAll(/<(th|td)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi)].map(c=>c[3]));
  if(rows.length<3||rows.length>60)continue;
  const width=rows[0].length;
  if(width<3||width>12||rows.some(r=>r.length!==width))continue;
  const corner=noTags(rows[0][0]);
  const cellValue=(text:string)=>matrixQuantity(text)??htmlQuantifiedValue(text)??(shortDeclaredText(text)?{type:'text' as const,value:text}:null);
  const push=(product:string,label:string,text:string,r:number,c:number,keyHeading:string|null)=>{
   const value=cellValue(text);if(!value)return;
   facts.push({property:label,propertyKey:key(label),value,role:'unresolved',
    context:{component:null,condition:null,variant:product,market:null,rowHeading:keyHeading??label},
    provenance:{format:'html',sourceId,documentSha256:digest(html),locator:`table:${tableNo}:row:${r}:col:${c}`,
     producer:'independent_unknown',method:keyHeading?'html_comparison_matrix_rows':'html_comparison_matrix'},
    status:'unverified_source_declaration',identity:'document_declared_unverified',
    scientificTestEvidence:false,rankingAuthorized:false});
  };
  if(corner===''){
   // Products are columns, properties are rows.
   const products=rows[0].slice(1).map(firstFragment);
   if(products.some(p=>!p||p.length>80)||new Set(products.map(key)).size!==products.length)continue;
   for(let r=1;r<rows.length;r++){
    const label=noTags(rows[r][0]).replace(/\s*:$/,'');
    if(!label||label.length>60||!key(label))continue;
    for(let c=1;c<width;c++)push(products[c-1],label,noTags(rows[r][c]),r,c,null);
   }
  }else{
   // Products are rows under a short key heading ("Model", "Shoe"), properties are columns.
   // Only accepted when at least a third of the property columns carry quantities, so text tables are skipped.
   const labels=rows[0].slice(1).map(x=>noTags(x).replace(/\s*:$/,''));
   const products=rows.slice(1).map(r=>firstFragment(r[0]));
   if(corner.length>20||labels.some(l=>!l||l.length>60||!key(l))||
    products.some(p=>!p||p.length>80)||new Set(products.map(key)).size!==products.length)continue;
   const quantitative=labels.filter((_,i)=>rows.slice(1).some(r=>{const t=noTags(r[i+1]);
    return !!(matrixQuantity(t)??htmlQuantifiedValue(t));})).length;
   if(quantitative===0||quantitative*3<labels.length)continue;
   for(let r=1;r<rows.length;r++)for(let c=1;c<width;c++)push(products[r-1],labels[c-1],noTags(rows[r][c]),r,c,corner);
  }
  if(facts.length>=200)return facts.slice(0,200);
 }
 return facts;
}
export function htmlToIR241(html:string,sourceId:string):EvidenceIR241 {
 if(!sourceId.trim())throw Error('241_invalid_source');
 const records=explicitHtmlRecords241(html);const facts:Fact241[]=jsonLdPropertyFacts241(html,sourceId);
 for(const r of records){const value=htmlQuantifiedValue(r.valueText);if(!value||!key(r.label))continue;
  facts.push({property:clean(r.label),propertyKey:key(r.label),value,role:'unresolved',
   context:{component:null,condition:null,variant:null,market:null,rowHeading:r.label},
   provenance:{format:'html',sourceId,documentSha256:digest(html),locator:r.locator,producer:'manufacturer',method:'explicit_html_label_value'},
   status:'unverified_source_declaration',identity:'unresolved',scientificTestEvidence:false,rankingAuthorized:false});
 }
 const tabular=facts.length;
 facts.push(...comparisonMatrixFacts241(html,sourceId));
 return {schema:'pee241.unified-facts.v1',format:'html',facts,unresolvedCount:records.length-tabular,
  rawSourceStored:false,rankingAuthorized:false,identityVerified:false};
}

/** Controlled product reconciliation is a separate step: arbitrary source text
 * cannot self-certify a SKU, category, market or brand. A trusted upstream
 * resolver must provide these values; proposals never certify attributes.
 */
export interface ResolvedObservation241 {fact:Fact241;productId:string;categoryId:string;brandId:string;
  identityResolution:'externally_verified';contextResolution:'reviewed_product_property';}
export interface CategoryPropertyProposal241 {propertyKey:string;unit:string;productCount:number;brandCount:number;
  sources:number;categoryId:string;status:'candidate_category_attribute_requires_review';rankingAuthorized:false;}
export function proposeCategoryAttributes241(rows:readonly ResolvedObservation241[],minProducts=2):CategoryPropertyProposal241[] {
 if(!Number.isInteger(minProducts)||minProducts<2)throw Error('241_invalid_support');
 const groups=new Map<string,{categoryId:string;propertyKey:string;unit:string;products:Set<string>;brands:Set<string>;sources:Set<string>}>();
 for(const r of rows){const f=r.fact;
  if(!r.productId||!r.categoryId||!r.brandId||r.identityResolution!=='externally_verified'||
    r.contextResolution!=='reviewed_product_property'||f.rankingAuthorized!==false||
    f.scientificTestEvidence!==false||f.role!=='product_specification'||f.value.type==='text'||
    f.context.condition||f.context.component||f.context.variant||!f.propertyKey)continue;
  const unit=f.value.unit.toLowerCase();const id=JSON.stringify([r.categoryId,f.propertyKey,unit]);
  let g=groups.get(id);if(!g){g={categoryId:r.categoryId,propertyKey:f.propertyKey,unit,
   products:new Set(),brands:new Set(),sources:new Set()};groups.set(id,g);}
  g.products.add(r.productId);g.brands.add(r.brandId);g.sources.add(f.provenance.documentSha256??f.provenance.sourceId);
 }
 return [...groups.values()].filter(g=>g.products.size>=minProducts&&g.sources.size>=2)
  .map(g=>({propertyKey:g.propertyKey,unit:g.unit,productCount:g.products.size,brandCount:g.brands.size,
   sources:g.sources.size,categoryId:g.categoryId,status:'candidate_category_attribute_requires_review' as const,rankingAuthorized:false as const}))
  .sort((a,b)=>a.categoryId.localeCompare(b.categoryId)||a.propertyKey.localeCompare(b.propertyKey)||a.unit.localeCompare(b.unit));
}

/** External semantic review of a source-bound fact. This attests only its role
 * within the source. It does not validate its numerical truth, SKU or ranking.
 */
export function reviewedSourceRole241(fact:Fact241,role:FactRole241):Fact241 {
 if(!['product_specification','operation','installation','safety','component','availability','unresolved'].includes(role)||
    fact.rankingAuthorized!==false||fact.scientificTestEvidence!==false)throw Error('241_invalid_role_review');
 return {...fact,role,scientificTestEvidence:false,rankingAuthorized:false};
}
