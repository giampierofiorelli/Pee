/** Phase245: generic, brand-independent product specification extraction from transient HTML.
 *
 * Sources of label/value declarations, in order of authority for structure:
 *  1. schema.org JSON-LD and microdata (Product, ProductGroup + variants, PropertyValue,
 *     QuantitativeValue, Offer) - author-declared structure, still unverified content.
 *  2. Semantic HTML: definition lists, key/value and comparison tables (via the Phase245 table grid).
 *  3. Repeated label/value structures built from generic elements (div/span/li...), detected from
 *     sibling-shape repetition, never from site-specific class names or selectors.
 *
 * Ownership: facts are attributed to the page's main product only when they come from main content
 * (not navigation, listings of other items, related/recommended products, ads, reviews, finance or
 * pagination widgets) and the page declares exactly one main product. Comparison widgets are handled by
 * structure: their tables name each product in header/key cells. Table facts are attributed to the product named by the
 * table's own header/key cells. Anything ambiguous is returned in `ambiguous` with reasons, never
 * promoted. All output is an unverified source declaration: rankingAuthorized=false, no page text kept.
 */
import {createHash} from 'node:crypto';
import {type Node245,parseHtml245,walk245,textOf245,elementChildren245,locator245,clean245,isDecorative245,decodeEntities245} from './phase245_html_dom.js';
import {buildTableGrid245,interpretTableGrid245} from './phase245_table_grid.js';
import {normalizeValue245,promotable245,canonicalUnit245,type Value245} from './phase245_value_normalizer.js';
import type {Fact241} from './phase241_unified_product_facts.js';
import {PAGE_MAX_BYTES} from './approved_web_reader.js';

export type Method245='line_label_value'|'json_ld'|'microdata'|'definition_list'|'table_key_value'|'table_products_in_columns'|
 'table_products_in_rows'|'repeated_label_value'|'list_item_label_value'|'page_meta';
export interface Fact245 {
 property:string;propertyKey:string;
 /** Normalized value; the authored text is kept (bounded) in rawValue. */
 value:Value245;rawValue:string;
 /** 'main' = the page's declared main product; 'named' = a product named by a table header/key. */
 product:{ref:'main'|'named'|'unknown';name:string|null};
 variant:string|null;
 /** Nearest section heading (e.g. "Package details"); scopes the declaration, not proof of meaning. */
 section:string|null;component:'packaging'|null;
 method:Method245;locator:string;
 /** Non-blocking notes on promoted facts; blocking reasons on ambiguous ones. */
 flags:string[];
 status:'unverified_source_declaration';producer:'unknown';
 scientificTestEvidence:false;rankingAuthorized:false;
}
export interface SpecExtraction245 {
 schema:'pee245.spec-extraction.v1';sourceUrl:string;documentSha256:string;
 mainProduct:{name:string|null;source:'json_ld'|'microdata'|'h1'|'og_title'|null;identifiers:Record<string,string>;
  declaredProductCount:number;ambiguous:boolean;
  /** Page-type cues (not facts): og:type and the number of purchase controls (one or two on a product page,
   * many on a listing). Used by consumers to decide whether a title-only page denotes one product. */
  pageSignals?:{ogType:string|null;purchaseControls:number}};
 variants:{name:string;sku:string|null;properties:Record<string,string>}[];
 facts:Fact245[];ambiguous:Fact245[];
 abstentions:Record<string,number>;
 stats:{nodes:number;tables:number;excludedRegions:number;truncated:boolean;milliseconds:number};
 rawSourceStored:false;rankingAuthorized:false;identityVerified:false;
}
const key245=(s:string)=>clean245(s).toLowerCase().replace(/[:：]\s*$/,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
/** Product identity key: case/space-insensitive but symbol-preserving ("500" != "500+", "1" != "1+"). */
const productKey=(s:string)=>clean245(s).toLowerCase().replace(/\s+/g,' ').trim();
const cleanLabel=(s:string)=>clean245(s).replace(/\s*[:：]\s*$/,'').trim();

// ---------- regions: main content vs boilerplate, listings, related products, ads, reviews ----------
// <dialog>/role=dialog are not excluded by themselves: product pages put full specification lists in
// drawers and dialogs. Cookie, newsletter, cart and similar dialogs are caught by their class words.
const BOILER_TAGS=new Set(['nav','header','footer','aside','template','noscript','button','select','option','svg','form']);
const BOILER_ROLES=new Set(['navigation','banner','contentinfo','complementary','search','alertdialog','menu','menubar','tablist','toolbar']);
/** Generic words used by authors to label non-main content. Matched as whole class/id tokens. */
const BOILER_TOKENS=new Set(['related','recommend','recommended','recommendation','recommendations','similar','upsell','upsells',
 'crosssell','crosssells','recently','recentlyviewed','alsobought','alsoviewed','youmayalsolike','breadcrumb','breadcrumbs','menu',
 'megamenu','navbar','navigation','nav','footer','cookie','cookies','consent','newsletter','subscribe','signup','advert','advertisement',
 'ad','ads','adslot','sponsored','sponsor','promo','promotion','promotions','social','share','sharing','reviews','ratings','testimonial',
 'testimonials','comments','comment','navbox','sidebar','minicart','cart','basket','wishlist','modal','popup','toast','skip','banner',
 'pagination','pager','paging','pages','filter','filters','facets','sort','sorting','toolbar','swatch','swatches',
 'popover','tooltip','finance','financing','credit','instalment','instalments','installment','installments']);
const COMPARE_TOKENS=new Set(['compare','comparison','comparisons']);
const DRAWER_TOKENS=new Set(['modal','popup','popover','drawer','sheet']);
const SPEC_TOKENS=/^(?:spec|specs|specification|specifications|techspecs|technical|characteristics|productspecs)$/;
const specDrawer=(n:Node245):boolean=>{let found=false;for(const d of walk245(n)){if(d.kind!=='element')continue;
 if([...tokensOf(d)].some(t=>SPEC_TOKENS.test(t))&&[...walk245(d)].some(x=>x.tag==='dl'||x.tag==='table'||x.tag==='ul')){found=true;break;}}return found;};
/** S80: taxonomy class names ("category-reviews", "tag-air-purifiers", "brands-samsung", "product_type-dishwashers",
 * written by blog engines on the post element) say what the content is ABOUT, not that a region is boilerplate. In the
 * S80 first run "category-reviews" on a review site's <article> excluded the whole review, test-data table included. */
const TAXONOMY_CLASS=/^(?:category|cat|tag|tags|topic|topics|type|status|format|post|brands?|product[_-]?type|post[_-]?cat|section|channel)[_-]/i;
/** S80: state and modifier classes ("has-share-float", "with-sidebar", "no-ads"; not "is-", which themes also use for roles such as "is-related-product") describe a property of
 * the element, not its role: "has-share-float" on the review's content wrapper excluded the content. */
const MODIFIER_CLASS=/^(?:has|with|without|no|show|hide|enable|enabled|disable|disabled|supports?)[_-]/i;
const tokensOf=(n:Node245)=>{
 const cls=String(n.attrs.class??'').split(/\s+/).filter(c=>c&&!TAXONOMY_CLASS.test(c)&&!MODIFIER_CLASS.test(c)).join(' ');
 const raw=`${cls} ${n.attrs.id??''} ${n.attrs['data-testid']??''} ${n.attrs['aria-label']??''}`;
 const out=new Set<string>();
 for(const w of raw.split(/[\s_\-:./]+|(?<=[a-z])(?=[A-Z])/)){const t=w.toLowerCase().replace(/\d+/g,'');if(t)out.add(t);}
 // Joined forms ("also-bought", "recently_viewed") are matched too.
 for(const w of raw.split(/\s+/)){out.add(w.toLowerCase().replace(/[^a-z]/g,''));}
 return out;
};
type Region='main'|'excluded'|'comparison';
export function classifyRegions245(root:Node245){
 const region=new Map<Node245,{kind:Region;reason:string|null}>();
 let main=[...walk245(root)].find(n=>n.kind==='element'&&(n.tag==='main'||n.attrs.role==='main'))??null;
 // A <main> holding almost none of the page text (e.g. only a search widget) does not delimit content.
 const body=[...walk245(root)].find(n=>n.tag==='body');
 if(main&&body){const m=textOf245(main).length,b=textOf245(body).length;if(m<1500&&m<b*0.2)main=null;}
 const containsH1=new Set<Node245>();
 for(const n of walk245(root))if(n.tag==='h1'){let x=n.parent;while(x){containsH1.add(x);x=x.parent;}}
 let excludedCount=0;
 const visit=(n:Node245,inherited:{kind:Region;reason:string|null},insideMain:boolean,insideArticle=false)=>{
  if(n.kind!=='element')return;
  let here=inherited;
  if(n===main)insideMain=true;
  if(n.tag==='article')insideArticle=true;
  if(here.kind!=='excluded'){
   const toks=tokensOf(n);
   let reason:string|null=null;
   // Class/id words never exclude the document, <main>, or any element that contains <main> or the
   // page title: frameworks put feature flags such as "...-main-menu-disabled" on <html>/<body>.
   const container=n.tag==='html'||n.tag==='body'||n===main||(main?containsNode(n,main):false)||containsH1.has(n);
   // <header>/<footer>/<form> inside main content or an article belong to that content.
   if(BOILER_TAGS.has(n.tag)&&!(['form','header','footer'].includes(n.tag)&&(insideMain||insideArticle)))reason='boilerplate_tag:'+n.tag;
   // A tab-list role on a wrapper that holds the tab panels themselves (seen on CMS product templates) does not
   // make the panels boilerplate: only the tab buttons are navigation.
   else if(n.attrs.role&&BOILER_ROLES.has(n.attrs.role)&&!(n.attrs.role==='tablist'&&[...walk245(n)].some(d=>d!==n&&d.attrs?.role==='tabpanel')))reason='boilerplate_role:'+n.attrs.role;
   else if(!container){for(const t of toks)if(BOILER_TOKENS.has(t)){
    // A drawer or modal that holds the product's specification sheet ("sheet-modal" > "specifications") is
    // product content; cookie, newsletter or cart modals carry no specification wording.
    if(DRAWER_TOKENS.has(t)&&specDrawer(n))continue;
    reason='non_main_marker:'+t;break;}}
   if(!reason&&n.attrs.itemscope!==undefined&&n.attrs.itemprop&&/^(?:isRelatedTo|isSimilarTo|isAccessoryOrSparePartFor|itemListElement)$/i.test(n.attrs.itemprop))
    reason='related_product_microdata';
   if(!reason&&!container&&isItemListing(n))reason='item_listing';
   if(reason){here={kind:'excluded',reason};excludedCount++;}
   else if([...toks].some(t=>COMPARE_TOKENS.has(t)))here={kind:'comparison',reason:'comparison_marker'};
  }
  // Outside <main> (when the page has one) nothing is main content.
  const effective=main&&!insideMain&&here.kind!=='excluded'?{kind:'excluded' as Region,reason:'outside_main'}:here;
  region.set(n,effective);
  for(const c of n.children)visit(c,here,insideMain,insideArticle);
 };
 visit(root,{kind:'main',reason:null},false);
 return {region,excludedCount};
}
const containsNode=(a:Node245,b:Node245)=>{let x:Node245|null=b;while(x){if(x===a)return true;x=x.parent;}return false;};
/** Repeated item cards (>=3 siblings of one shape, each with its own link and image) are listings of
 * other products: search results, carousels, "you may also like" grids. */
function isItemListing(n:Node245):boolean{
 const kids=elementChildren245(n);if(kids.length<3)return false;
 const sig=(x:Node245)=>x.tag+'|'+[...tokensOf(x)].filter(t=>t.length>2).sort().slice(0,3).join(',');
 const counts=new Map<string,number>();for(const k of kids)counts.set(sig(k),(counts.get(sig(k))??0)+1);
 const [best,count]=[...counts].sort((a,b)=>b[1]-a[1])[0];
 if(count<3)return false;
 let cards=0,cardText=0;
 for(const k of kids){if(sig(k)!==best)continue;let link=false,img=false;
  for(const d of walk245(k)){if(d.tag==='a'&&d.attrs.href)link=true;if(d.tag==='img'||d.tag==='picture')img=true;}
  // A card is small: whole page sections of a grid layout (each with some link and image) are not product cards.
  // Specification structures (a table, a definition list, a list of five or more items) belong to product content, not to a teaser card.
  const specs=[...walk245(k)].some(d=>d.tag==='table'||d.tag==='dl'||(d.tag==='ul'&&elementChildren245(d).filter(c=>c.tag==='li').length>=5));
  if(link&&img&&!specs&&textOf245(k).length<=1200){cards++;cardText+=textOf245(k).length;}}
 // ...and a listing consists mostly of cards: a page grid with a few teaser tiles beside the product section is not one.
 return cards>=3&&cardText>=textOf245(n).length*0.6;
}

// ---------- section context ----------
const HEADING=/^h[1-6]$/;
function headingText(n:Node245):string|null{
 if(n.kind!=='element')return null;
 if(HEADING.test(n.tag)||n.attrs.role==='heading'||n.tag==='caption'||n.tag==='legend'||n.tag==='summary'){const t=textOf245(n);return t&&t.length<=80?t:null;}
 // A wrapper whose only text is one heading (accordion headers, card titles).
 const kids=elementChildren245(n);
 if(kids.length===1&&!n.children.some(c=>c.kind==='text'&&c.text.trim()))return headingText(kids[0]);
 return null;
}
function sectionOf(n:Node245,byId:Map<string,Node245>,stopAt:Node245|null):string|null{
 let x:Node245|null=n;
 for(let depth=0;x&&x.parent&&depth<12;depth++,x=x.parent){
  if(x===stopAt)break;
  const lab=x.attrs['aria-labelledby'];
  if(lab){const t=lab.split(/\s+/).map(id=>byId.get(id)).filter(Boolean).map(e=>textOf245(e!)).join(' ').trim();if(t&&t.length<=80)return t;}
  const sibs=x.parent.children;const i=sibs.indexOf(x);
  for(let k=i-1;k>=0&&k>=i-4;k--){const h=headingText(sibs[k]);if(h)return h;}
 }
 return null;
}
const PACKAGING=/\b(?:package|packaging|packed|box|carton|shipping|parcel)\b/i;

// ---------- schema.org JSON-LD ----------
type Obj=Record<string,unknown>;
const isObj=(v:unknown):v is Obj=>!!v&&typeof v==='object'&&!Array.isArray(v);
const types=(v:unknown)=>(Array.isArray(v)?v:[v]).filter(x=>typeof x==='string').map(x=>(x as string).replace(/^.*[/#]/,''));
const str=(v:unknown,max=200):string|null=>typeof v==='string'&&v.trim()&&v.length<=max?clean245(v):typeof v==='number'?String(v):null;
const brandName=(v:unknown)=>isObj(v)?str(v.name):str(v);
const asList=(v:unknown)=>(Array.isArray(v)?v:v===undefined||v===null?[]:[v]);
interface Raw245 {label:string;valueText:string;method:Method245;locator:string;productRef:'main'|'named'|'unknown';
 productName:string|null;variant:string|null;section:string|null;region:Region;ambiguity:string[];preValue?:Value245;}
function topLevelProducts(objs:Obj[]):Obj[]{
 const out:Obj[]=[];
 const visit=(v:unknown,depth:number)=>{
  if(depth>6)return;
  if(Array.isArray(v)){for(const x of v.slice(0,50))visit(x,depth+1);return;}
  if(!isObj(v))return;
  const t=types(v['@type']);
  if(t.includes('Product')||t.includes('ProductGroup')||t.includes('ProductModel')||t.includes('IndividualProduct')){out.push(v);return;}
  if(t.includes('ItemList')||t.includes('OfferCatalog'))return;
  for(const k of ['@graph','mainEntity','mainEntityOfPage','itemReviewed'])if(v[k]!==undefined)visit(v[k],depth+1);
 };
 for(const o of objs)visit(o,0);
 return out;
}
function quantitative(v:unknown):string|null{
 if(!isObj(v))return str(v);
 const val=v.value??v.minValue;const unit=str(v.unitText,20)??str(v.unitCode,10);
 if(v.minValue!==undefined&&v.maxValue!==undefined)return `${v.minValue}–${v.maxValue} ${unit??''}`.trim();
 return val!==undefined&&val!==null?`${val}${unit?' '+unitCodeText(unit):''}`:null;
}
/** UN/CEFACT common codes used by schema.org unitCode for frequent physical units. */
const UNECE:Record<string,string>={MMT:'mm',CMT:'cm',MTR:'m',INH:'in',FOT:'ft',GRM:'g',KGM:'kg',LBR:'lb',ONZ:'oz',MLT:'ml',
 LTR:'l',WTT:'W',KWT:'kW',VLT:'V',AMP:'A',HTZ:'Hz',CEL:'°C',FAH:'°F',P1:'%',WHR:'Wh',KWH:'kWh',SEC:'s',MIN:'min',HUR:'h'};
const unitCodeText=(u:string)=>UNECE[u.toUpperCase()]??u;
function productPropertiesFromSchema(p:Obj,emit:(label:string,value:string,loc:string)=>void,locBase:string){
 const props=[...asList(p.additionalProperty),...asList(p.specification)];
 props.slice(0,80).forEach((pv,i)=>{
  if(!isObj(pv))return;const name=str(pv.name,100)??str(pv.propertyID,100);
  const v=quantitative(pv);if(name&&v)emit(name,v,`${locBase}:additionalProperty:${i}`);
 });
 for(const k of ['weight','height','width','depth','color','material','size','pattern','model','mpn','gtin','gtin8','gtin12','gtin13','gtin14','sku']){
  const v=p[k];if(v===undefined)continue;const t=quantitative(v);if(t)emit(k,t,`${locBase}:${k}`);
 }
}
function offerPrice(p:Obj):string|null{
 const offers=[...asList(p.offers),...asList(p.hasVariant).flatMap(v=>isObj(v)?asList(v.offers):[])].filter(isObj).slice(0,200);
 const prices:{n:number;c:string}[]=[];
 for(const o of offers){
  const cands=isObj(o)&&(o['@type']==='AggregateOffer')?[o.lowPrice,o.highPrice]:[o.price];
  for(const c of cands){const n=typeof c==='number'?c:typeof c==='string'&&/^\d+(?:\.\d+)?$/.test(c)?Number(c):NaN;
   const cur=str(o.priceCurrency,3);if(Number.isFinite(n)&&cur)prices.push({n,c:cur.toUpperCase()});}
 }
 if(!prices.length||prices.some(p=>p.c!==prices[0].c))return null;
 const min=Math.min(...prices.map(p=>p.n)),max=Math.max(...prices.map(p=>p.n));
 return min===max?`${prices[0].c} ${min}`:`${prices[0].c} ${min}–${max}`;
}

// ---------- page entity resolution ----------
/** Strong identifiers that denote one product entity when two structured-data nodes share them. */
const ID_KEYS=['sku','mpn','gtin','gtin8','gtin12','gtin13','gtin14','productID','@id'];
const urlKey=(u:unknown,base:string):string|null=>{
 if(typeof u!=='string'||!u.trim())return null;
 try{const x=new URL(u.trim(),base);return (x.host.toLowerCase()+x.pathname.replace(/\/+$/,'')).toLowerCase();}catch{return null;}
};
/** Groups JSON-LD Product nodes that describe the same entity: shared strong identifier, same resolved
 * URL (query and fragment ignored), or the same exact name. Similar names alone never join nodes. */
function clusterEntities(nodes:Obj[],base:string):Obj[][]{
 const parent=nodes.map((_,i)=>i);const find=(i:number):number=>parent[i]===i?i:(parent[i]=find(parent[i]));
 const keysOf=(o:Obj)=>{const k:string[]=[];
  for(const id of ID_KEYS){const v=str(o[id],120);if(v&&v.length>=3)k.push((id==='@id'?'url:'+(urlKey(v,base)??v):'id:'+v.toLowerCase()));}
  const u=urlKey(o.url,base);if(u)k.push('url:'+u);
  for(const off of asList(o.offers).filter(isObj)){const ou=urlKey(off.url,base);if(ou)k.push('url:'+ou);const os=str(off.sku,120);if(os&&os.length>=3)k.push('id:'+os.toLowerCase());}
  const n=str(o.name);if(n)k.push('name:'+productKey(n));
  return k;};
 const seen=new Map<string,number>();
 nodes.forEach((o,i)=>{for(const k of keysOf(o)){const j=seen.get(k);if(j===undefined)seen.set(k,i);else parent[find(i)]=find(j);}});
 const groups=new Map<number,Obj[]>();nodes.forEach((o,i)=>{const r=find(i);groups.set(r,[...(groups.get(r)??[]),o]);});
 return [...groups.values()];
}

// ---------- microdata ----------
function microdataProducts(root:Node245,region:Map<Node245,{kind:Region}>):{node:Node245;name:string|null;props:{name:string;value:string;node:Node245}[];offerPrice:string|null}[]{
 const out:ReturnType<typeof microdataProducts>=[];
 for(const n of walk245(root)){
  if(n.kind!=='element'||n.attrs.itemscope===undefined||!/schema\.org\/(?:Product|ProductModel|IndividualProduct|ProductGroup)\b/i.test(n.attrs.itemtype??''))continue;
  if(n.attrs.itemprop||region.get(n)?.kind==='excluded')continue; // nested/related products are not the main item
  const props:{name:string;value:string;node:Node245}[]=[];let name:string|null=null;let price:string|null=null,currency:string|null=null;
  const scan=(x:Node245,owner:Node245)=>{
   for(const c of elementChildren245(x)){
    const ip=c.attrs.itemprop;const scoped=c.attrs.itemscope!==undefined;
    const val=()=>c.attrs.content??c.attrs.value??(c.tag==='meta'?'':textOf245(c));
    if(ip==='name'&&owner===n)name=val();
    else if(ip==='price'&&!price)price=c.attrs.content??textOf245(c);
    else if(ip==='priceCurrency'&&!currency)currency=c.attrs.content??textOf245(c);
    else if(ip==='additionalProperty'&&scoped){
     let pn='',pv='',pu='';
     for(const d of walk245(c)){if(d===c)continue;const k=d.attrs.itemprop;const v=d.attrs.content??d.attrs.value??textOf245(d);
      if(k==='name'&&!pn)pn=v;else if(k==='value'&&!pv)pv=v;else if((k==='unitText'||k==='unitCode')&&!pu)pu=unitCodeText(v);}
     if(pn&&pv)props.push({name:pn,value:pu?`${pv} ${pu}`:pv,node:c});continue;
    }
    else if(ip&&/^(?:weight|height|width|depth)$/.test(ip)&&scoped){
     let v='',u='';for(const d of walk245(c)){const k=d.attrs.itemprop;const t=d.attrs.content??textOf245(d);if(k==='value'&&!v)v=t;if((k==='unitText'||k==='unitCode')&&!u)u=unitCodeText(t);}
     if(v)props.push({name:ip,value:u?`${v} ${u}`:v,node:c});continue;
    }
    else if(ip&&/^(?:sku|mpn|gtin\d*|model|color|material)$/.test(ip))props.push({name:ip,value:val(),node:c});
    if(scoped&&c!==n&&ip!=='offers')continue; // do not descend into other items (brand, reviews, related)
    scan(c,owner);
   }
  };
  scan(n,n);
  out.push({node:n,name,props,offerPrice:price&&currency?`${currency} ${price}`:null});
 }
 return out;
}

// ---------- repeated label/value structures ----------
function contentItems(x:Node245):Node245[]{
 return x.children.filter(c=>c.kind==='text'?!!c.text.trim():!isDecorative245(c)&&!['script','style','svg','img','picture','template','noscript','button'].includes(c.tag)&&!!textOf245(c));
}
/** A (label, value) reading of one repeated item, descending through single-child wrappers. */
function pairOf(x:Node245):{label:string;value:string;labelNode:Node245;valueNode:Node245}|null{
 let cur=x;
 for(let d=0;d<4;d++){
  const items=contentItems(cur);
  if(items.length===1&&items[0].kind==='element'){cur=items[0];continue;}
  if(items.length===2){
   const [a,b]=items;const ta=a.kind==='text'?clean245(a.text):textOf245(a),tb=b.kind==='text'?clean245(b.text):textOf245(b);
   // A label carries no value markup; links/controls as labels are navigation, not specifications.
   if(a.kind==='element'&&(a.tag==='a'||walk245Has(a,'a')))return null;
   // An emphasised lead phrase followed by running text ("<b>5 x NeoPixels</b> for badge dazzle") is a
   // feature bullet: an inline label must be explicitly closed with ":" to count as a label.
   if(b.kind==='text'&&INLINE.has(a.tag)&&!/[:：]\s*$/.test(ta))return null;
   return {label:ta,value:tb,labelNode:a,valueNode:b};
  }
  // "<b>Total Depth:</b> <b>64 cm</b> (Important for under-desk placement.)": a closing bracketed note after the
  // value belongs to it as a qualifier; it does not make the item a sentence.
  if(items.length===3&&items[2].kind==='text'&&/^\s*\([^()]{2,60}\)\s*$/.test(items[2].text)&&items[0].kind==='element'&&!(items[0].tag==='a'||walk245Has(items[0],'a'))){
   const ta=textOf245(items[0]),tb=items[1].kind==='text'?clean245(items[1].text):textOf245(items[1]);
   if(/[:：]\s*$/.test(ta))return {label:ta,value:`${tb} ${clean245(items[2].text)}`,labelNode:items[0],valueNode:items[1]};
  }
  if(items.length===1&&items[0].kind==='text'){
   const t=clean245(items[0].text);const m=/^([^:：]{1,60})[:：]\s*(.{1,160})$/.exec(t);
   if(m)return {label:m[1],value:m[2],labelNode:items[0],valueNode:items[0]};
  }
  return null;
 }
 return null;
}
const containsUsed=(n:Node245,used:Set<Node245>)=>{for(const d of walk245(n))if(used.has(d))return true;return false;};
const insideLink=(n:Node245)=>{let x:Node245|null=n;while(x){if(x.tag==='a'&&x.attrs.href!==undefined)return true;x=x.parent;}return false;};
const POINTER=/\b(?:this model|this item|this product|current model|current product|you are here)\b/i;
/** Rows that describe the offer, shop or page rather than the product. */
const ACTION_VALUE=/^(?:download|downloads|view|click here|more info|learn more|see more|read more|details|pdf|open)$/i;
const CONTACT_LABEL=/^(?:web|website|www|telephone|tel|phone|e-?mail|fax|address|contact)$/i;
const CONTACT_VALUE=/^(?:[\w.+-]+@[\w-]+\.[\w.]+|(?:https?:\/\/|www\.)\S+)$/i;
const LOGISTICS_LABEL=/\b(?:delivery|dispatch|pcs|in stock|stock level)\b/i;
const AVAILABILITY_VALUE=/^(?:estimated delivery\b.*|in stock|out of stock|available to order|not available|sold out|pre-?order|available|unavailable|low stock|only \d+ left)$/i;
const SIZE_TOKEN=/^(?:x{0,3}[sml]|x{1,3}l|\d+(?:\.\d+)?|one size|os|sm|md|lg)$/i;
const MEASURABLE=new Set(['quantity','dimensions','range','price','options']);
const INLINE=new Set(['b','strong','em','i','span','a','u','mark','small','label']);
/** Labels under which a price can be a property of the page's product. A price under any other label
 * ("Home Brewing Guide £2.95") names another item: a product card, upsell or bundle line. */
const PRICE_LABEL=/\b(?:price|prices|cost|rrp|msrp|mrp|was|now|from|sale|offer|list|retail|you pay|total|each|per)\b/i;
/** Section words that mark a block of declared product attributes. */
const SPEC_CONTEXT=/\b(?:spec|specs|specification|specifications|technical|tech|details|dimensions|characteristics|information|key facts|at a glance|product info|in the box|what'?s in the box)\b/i;
/** "Boiler capacity 250 cc": an attribute phrase followed by one measurable value, without a colon. */
const UNMARKED_LINE=/^(\p{L}[\p{L}\s'()/-]{1,40}?)\s+((?:[Aa]pprox\.?\s*|[Mm]ax\.?\s*)?\d[\d.,]*(?:\s*[-–]\s*\d[\d.,]*)?\s*[\p{L}°%"″/Ω]{0,10}(?:\s*\(\s*\d[\d.,]*\s*[\p{L}°%"″]{1,6}\s*\))?)$/u;
const INLINE_ATTR=/^(\p{L}[\p{L}\s'()/-]{2,40}?)\s+(\d[\d.,]*\s*[\p{L}°%"″]{0,6}\.?)$/u;
const BLOCK_TAGS=new Set(['div','p','ul','ol','li','table','section','article','dl','h1','h2','h3','h4','h5','h6']);
const walk245Has=(n:Node245,tag:string)=>{for(const d of walk245(n))if(d!==n&&d.tag===tag)return true;return false;};
/** A value that is entirely a link (download, document, other page) references content elsewhere. */
const linkOnlyValue=(v:Node245)=>{
 if(v.kind!=='element')return false;const total=textOf245(v).length;if(!total)return false;
 let linked=0;for(const d of walk245(v))if(d.tag==='a'&&d.attrs.href!==undefined)linked+=textOf245(d).length;
 return linked>=total*0.9;
};
const labelLike=(t:string)=>{const s=t.replace(/[:：]\s*$/,'').trim();
 // A bracketed unit/axis note ("Unit Size (W x H x D in mm)") is part of the label but not of its wording.
 const words=s.replace(/\([^()]{1,30}\)|\[[^\[\]]{1,20}\]/g,' ').trim().split(/\s+/).length;
 return s.length>=2&&s.length<=60&&words<=8&&/\p{L}/u.test(s)&&!/[.!?]$/.test(s)&&!/^\d[\d\s.,]*$/.test(s);};
/** Repetition is judged on structure (tag + child tag sequence, two levels), not on class names, so
 * per-item modifier classes ("section-chip", "section-control") do not hide a repeated pattern. */
const shape=(x:Node245)=>x.tag+'('+elementChildren245(x).filter(c=>!isDecorative245(c)).slice(0,6)
 .map(c=>c.tag+'('+elementChildren245(c).slice(0,4).map(g=>g.tag).join(',')+')').join(',')+')';

/** Identifies the extraction rules; stored with every derived declaration so a rule change can be traced
 * and re-derived per source revision. Bump on any behavioural change. */
// spec-extractor-8 (S80): column headers that are settings of one product or sentence-case property labels never name products;
// taxonomy and modifier class names (category-reviews, has-share-float) are not region roles.
export const SPEC_EXTRACTOR_VERSION='spec-extractor-8';
export function extractSpecifications245(html:string,sourceUrl:string):SpecExtraction245{
 const started=performance.now();
 if(typeof html!=='string'||html.length>PAGE_MAX_BYTES)throw Error('245_html_size');
 const documentSha256=createHash('sha256').update(html).digest('hex');
 const {root,nodeCount,truncated}=parseHtml245(html);
 const {region,excludedCount}=classifyRegions245(root);
 const all=[...walk245(root)];
 const byId=new Map<string,Node245>();for(const n of all)if(n.kind==='element'&&n.attrs.id)byId.set(n.attrs.id,n);
 const abst:Record<string,number>={};const abstain=(r:string)=>{abst[r]=(abst[r]??0)+1;};
 const raws:Raw245[]=[];
 const used=new Set<Node245>();
 const regionOf=(n:Node245)=>region.get(n)?.kind??'main';

 // ---- main product identity
 const jsonObjs:Obj[]=[];
 for(const n of all)if(n.tag==='script'&&/application\/ld\+json/i.test(n.attrs.type??'')&&n.text.length<=400_000){
  try{jsonObjs.push(...asList(JSON.parse(n.text)).filter(isObj));}catch{abstain('json_ld_unparseable');}
 }
 const ldProducts=topLevelProducts(jsonObjs);
 // The page's own URL (canonical, then og:url, then the fetched URL) anchors which declared entity is the page's subject.
 const canonical=all.find(n=>n.tag==='link'&&/(?:^|\s)canonical(?:\s|$)/i.test(n.attrs.rel??''))?.attrs.href??
  all.find(n=>n.tag==='meta'&&n.attrs.property==='og:url')?.attrs.content??null;
 const base=/^https?:/.test(sourceUrl)?sourceUrl:'https://page.invalid/';
 const pageKey=urlKey(canonical??sourceUrl,base);
 const clusters=clusterEntities(ldProducts,base);
 const micro=microdataProducts(root,region);
 const microNames=[...new Set(micro.map(m=>m.name).filter(Boolean) as string[])];
 // A page heading such as "All Specifications" titles a tab, not the product.
 const GENERIC_HEADING=/^(?:(?:all|full|technical|tech|product|detailed)\s+)?(?:spec(?:ification)?s?|specifications? & features|overview|details|features|product (?:details|information)|tech specs)$/i;
 // The same heading rendered twice (desktop and mobile copies) is one heading, not two products.
 const h1s=[...new Map(all.filter(n=>n.tag==='h1'&&regionOf(n)!=='excluded').map(n=>textOf245(n)).filter(t=>t&&!GENERIC_HEADING.test(t.trim())).map(t=>[productKey(t),t])).values()];
 const og=all.find(n=>n.tag==='meta'&&n.attrs.property==='og:title')?.attrs.content??null;
 const h1Keys=new Set(h1s.map(productKey));
 const clusterUrls=(c:Obj[])=>new Set(c.flatMap(o=>[urlKey(o.url,base),urlKey(o['@id'],base),...asList(o.offers).filter(isObj).map(f=>urlKey(f.url,base))]).filter(Boolean) as string[]);
 const clusterNames=(c:Obj[])=>[...new Set(c.map(o=>{const n=str(o.name);return n?clean245(decodeEntities245(n)):null;}).filter(Boolean) as string[])];
 // Several entities: the one bound to the page URL, else the one whose name is the page heading, is the subject.
 let mainCluster:Obj[]|null=clusters.length===1?clusters[0]:null;
 let mainBasis:string|null=clusters.length===1?'single_entity':null;
 if(clusters.length>1){
  const byUrl=pageKey?clusters.filter(c=>clusterUrls(c).has(pageKey)):[];
  const byH1=clusters.filter(c=>clusterNames(c).some(n=>h1Keys.has(productKey(n))));
  if(byUrl.length===1){mainCluster=byUrl[0];mainBasis='page_url';}
  else if(byH1.length===1){mainCluster=byH1[0];mainBasis='page_heading';}
 }
 if(clusters.length>1)abstain(mainCluster?'json_ld_other_entities_not_main':'json_ld_multiple_products');
 // Within the subject entity, the name matching the page heading wins; otherwise the shortest declared name.
 const ldNames=mainCluster?clusterNames(mainCluster):[];
 const mainLdName=ldNames.find(n=>h1Keys.has(productKey(n)))??[...ldNames].sort((a,b)=>a.length-b.length||a.localeCompare(b))[0]??null;
 let mainName:string|null=null,mainSource:SpecExtraction245['mainProduct']['source']=null;
 const otherEntityNames=new Set(clusters.filter(c=>c!==mainCluster).flatMap(clusterNames).map(productKey));
 const declared=new Set([...clusters.map(c=>clusterNames(c)[0]??'entity').map(productKey),...microNames.map(productKey).filter(k=>!ldNames.some(n=>productKey(n)===k))]);
 if(mainLdName){mainName=mainLdName;mainSource='json_ld';}
 else if(!clusters.length&&microNames.length===1){mainName=microNames[0];mainSource='microdata';}
 else if(!clusters.length&&!microNames.length&&h1s.length===1){mainName=h1s[0];mainSource='h1';}
 else if(!clusters.length&&!microNames.length&&!h1s.length&&og){mainName=clean245(og);mainSource='og_title';}
 // Microdata naming another product than the resolved subject does not make the page ambiguous by itself.
 const microOther=microNames.filter(n=>!mainName||productKey(n)!==productKey(mainName));
 const mainAmbiguous=(clusters.length>1&&!mainCluster)||(!clusters.length&&microNames.length>1)||(!clusters.length&&!microNames.length&&h1s.length>1)||
  (!!mainCluster&&microOther.length>0&&!microOther.every(n=>otherEntityNames.has(productKey(n))));
 const identifiers:Record<string,string>={};
 if(mainCluster){for(const o of mainCluster){for(const k of ['sku','mpn','gtin','gtin8','gtin12','gtin13','gtin14','productGroupID','model']){const v=str(o[k],80);if(v)identifiers[k]??=v;}
  const b=brandName(o.brand);if(b)identifiers.brand??=b;}}
 const mainRef=():{productRef:'main'|'unknown';productName:string|null;amb:string[]}=>mainAmbiguous?
  {productRef:'unknown',productName:null,amb:['main_product_ambiguous']}:mainName?{productRef:'main',productName:mainName,amb:[]}:
  {productRef:'unknown',productName:null,amb:['main_product_unnamed']};

 // ---- variants (ProductGroup)
 const variants:SpecExtraction245['variants']=[];
 const group=mainCluster?.find(o=>types(o['@type']).includes('ProductGroup'))??null;
 if(group){
  const varies=asList(group.variesBy).map(v=>String(v).replace(/^.*[/#]/,'')).slice(0,6);
  for(const v of asList(group.hasVariant).filter(isObj).slice(0,60)){
   const props:Record<string,string>={};for(const k of varies){const t=quantitative(v[k]);if(t)props[k]=t;}
   variants.push({name:str(v.name)??'',sku:str(v.sku,80),properties:props});
  }
 }
 const multiVariant=variants.length>1||all.some(n=>n.tag==='select'&&regionOf(n)!=='excluded'&&/(?:size|colou?r|variant|capacity|option)/i.test(`${n.attrs.name??''} ${n.attrs.id??''} ${n.attrs['aria-label']??''}`));

 // ---- 1. JSON-LD
 if(mainCluster&&!mainAmbiguous){
  // Every node of the subject entity contributes; equal values merge and different values become conflicts.
  mainCluster.forEach((node,ni)=>productPropertiesFromSchema(node,(label,value,loc)=>{
   if(/^(?:sku|mpn|gtin\d*|model)$/.test(label))return; // identifiers, reported in mainProduct
   raws.push({label,valueText:value,method:'json_ld',locator:'jsonld:'+(ni?`n${ni}:`:'')+loc,productRef:'main',productName:mainName,variant:null,
    section:'structured data',region:'main',ambiguity:[]});
  },'product'));
  const price=offerPrice({offers:mainCluster.flatMap(o=>asList(o.offers)),hasVariant:mainCluster.flatMap(o=>asList(o.hasVariant))});
  if(price)raws.push({label:'Price',valueText:price.replace(/^([A-Z]{3}) (.*)$/,'$2 $1'),method:'json_ld',locator:'jsonld:offers',
   productRef:'main',productName:mainName,variant:null,section:'structured data',region:'main',ambiguity:[],
   preValue:(()=>{const m=/^([A-Z]{3}) ([\d.]+)(?:–([\d.]+))?$/.exec(price)!;return m[3]?{kind:'price',amount:+m[2],maxAmount:+m[3],currency:m[1]}:{kind:'price',amount:+m[2],currency:m[1]};})()});
  // Variant-specific declarations: each variant's own additionalProperty values.
  mainCluster.flatMap(o=>asList(o.hasVariant)).filter(isObj).slice(0,60).forEach((v,vi)=>{
   const vname=str(v.name)??str(v.sku,80)??`variant ${vi+1}`;
   productPropertiesFromSchema(v,(label,value,loc)=>{
    if(/^(?:sku|mpn|gtin\d*|model)$/.test(label))return;
    raws.push({label,valueText:value,method:'json_ld',locator:`jsonld:variant:${vi}:${loc}`,productRef:'main',productName:mainName,
     variant:vname,section:'structured data',region:'main',ambiguity:[]});
   },'variant');
  });
 }

 // ---- 2. microdata
 for(const m of micro){
  const own=m.name&&mainName&&productKey(m.name)===productKey(mainName)?{productRef:'main' as const,productName:mainName,amb:[]}:
   m.name?{productRef:'named' as const,productName:m.name,amb:[]}:mainRef();
  for(const p of m.props){if(/^(?:sku|mpn|gtin\d*|model)$/.test(p.name)){if(own.productRef==='main')identifiers[p.name]??=p.value;continue;}
   used.add(p.node);
   raws.push({label:p.name,valueText:p.value,method:'microdata',locator:locator245(p.node),productRef:own.productRef,
    productName:own.productName,variant:null,section:sectionOf(p.node,byId,null),region:regionOf(p.node),ambiguity:[...own.amb]});}
  if(m.offerPrice&&own.productRef==='main'&&!raws.some(r=>r.method==='json_ld'&&r.label==='Price'))
   raws.push({label:'Price',valueText:m.offerPrice.replace(/^(\S+) (.*)$/,'$2 $1'),method:'microdata',locator:locator245(m.node)+':offers',
    productRef:'main',productName:mainName,variant:null,section:null,region:'main',ambiguity:[]});
 }

 // ---- 2b. Open Graph product price meta ("product:price:amount" + currency): a declared offer price of the page
 // product, read only when structured data gave none and the page product is resolved.
 if(mainName&&!mainAmbiguous&&!raws.some(r=>r.label==='Price'&&(r.method==='json_ld'||r.method==='microdata'))){
  const meta=(p:string)=>all.find(n=>n.tag==='meta'&&(n.attrs.property===p||n.attrs.name===p))?.attrs.content?.trim()??null;
  const amount=meta('product:price:amount')??meta('og:price:amount');const cur=(meta('product:price:currency')??meta('og:price:currency'))?.toUpperCase()??null;
  if(amount&&cur&&/^[A-Z]{3}$/.test(cur)&&/^\d+(?:\.\d{1,2})?$/.test(amount))
   raws.push({label:'Price',valueText:`${amount} ${cur}`,method:'page_meta',locator:'meta:product:price',productRef:'main',productName:mainName,
    variant:null,section:'page metadata',region:'main',ambiguity:[],preValue:{kind:'price',amount:+amount,currency:cur}});
 }

 // ---- 3. tables (grid)
 let tableCount=0;
 for(const t of all){
  if(t.tag!=='table')continue;tableCount++;
  if(regionOf(t)==='excluded'){abstain('table_in_non_main_region');continue;}
  if(t.attrs.role==='presentation'||t.attrs.role==='none'){abstain('layout_table');continue;}
  const g=buildTableGrid245(t);if(!g){abstain('table_grid_failed');continue;}
  // A one-row, two-cell table is a single key/value declaration (sites often render each attribute as its own
  // table under a group heading). Accepted only when the first cell reads as a label and the value is not a link.
  if(g.rows===1&&g.cols===2&&g.cells.length===2){
   const [a,b]=g.cells;
   if(labelLike(a.text)&&b.text&&!linkOnlyValue(b.node)&&!walk245Has(a.node,'img')){
    used.add(a.node);used.add(b.node);const ref=mainRef();
    raws.push({label:a.text,valueText:b.text,method:'table_key_value',locator:`${g.locator}@r0c1`,productRef:ref.productRef,productName:ref.productName,
     variant:null,section:g.caption??sectionOf(t,byId,null),region:regionOf(t),ambiguity:[...ref.amb]});
    continue;
   }
  }
  const it=interpretTableGrid245(g);
  if(it.mode==='unsupported'){abstain('table_'+(it.reasons[0]??'unsupported'));continue;}
  const sec=g.caption??sectionOf(t,byId,null);
  for(const r of it.readings){
   const cellNode=g.cells.find(c=>c.row===r.row&&c.col===r.col)?.node;if(cellNode)used.add(cellNode);
   const label=r.propertyPath.length?r.propertyPath[r.propertyPath.length-1]:'';
   const section=r.propertyPath.length>1?r.propertyPath.slice(0,-1).join(' › '):sec;
   let ref:{productRef:'main'|'named'|'unknown';productName:string|null;amb:string[]};
   if(it.mode==='key_value')ref=mainRef();
   else if(r.product&&mainName&&productKey(r.product)===productKey(mainName))ref={productRef:'main',productName:mainName,amb:[]};
   else if(r.product&&POINTER.test(r.product)){
    // "KB904L This model": the page itself points at its own product. Accepted as the main product only when
    // the remaining model code is a token of the page's product name; otherwise the column has no usable key.
    const rest=clean245(r.product.replace(POINTER,' '));
    const codes=rest.split(/\s+/).filter(t=>/\d/.test(t)&&/[a-z]/i.test(t)&&t.length>=3);
    const mainTokens=new Set((mainName??'').toLowerCase().split(/[^\p{L}\p{N}-]+/u));
    ref=!mainAmbiguous&&mainName&&codes.length&&codes.every(t=>mainTokens.has(t.toLowerCase()))?{productRef:'main',productName:mainName,amb:[]}:
     {productRef:'unknown',productName:null,amb:['pointer_header_not_resolved']};
   }
   else ref={productRef:r.product?'named':'unknown',productName:r.product,amb:[]};
   const method:Method245=it.mode==='key_value'?'table_key_value':it.mode==='products_in_columns'?'table_products_in_columns':'table_products_in_rows';
   raws.push({label,valueText:r.valueText,method,locator:`${g.locator}@r${r.row}c${r.col}${r.rowspan>1||r.colspan>1?`+${r.rowspan}x${r.colspan}`:''}`,
    productRef:ref.productRef,productName:ref.productName,variant:r.variant,section,region:regionOf(t),
    ambiguity:[...ref.amb,...r.ambiguity]});
   if(r.sharedAcross>1)raws[raws.length-1].ambiguity.push('shared_cell:'+r.sharedAcross);
  }
 }

 // ---- 4. definition lists
 for(const dl of all){
  if(dl.tag!=='dl')continue;
  if(regionOf(dl)==='excluded'){abstain('dl_in_non_main_region');continue;}
  const items:Node245[]=[];
  const wrappers=elementChildren245(dl).filter(c=>c.tag==='div');
  // One term and one description per wrapper: document order says which is the label, even where a
  // site swaps dt and dd (label in <dd>, value in <dt>).
  const pairWrapped=wrappers.length>=2&&wrappers.every(w=>{const k=elementChildren245(w).filter(x=>x.tag==='dt'||x.tag==='dd');
   return k.length===2&&new Set(k.map(x=>x.tag)).size===2;});
  if(pairWrapped){
   for(const w of wrappers){const [a,b]=elementChildren245(w).filter(x=>x.tag==='dt'||x.tag==='dd');
    used.add(a);used.add(b);const ref=mainRef();
    raws.push({label:textOf245(a),valueText:textOf245(b),method:'definition_list',locator:locator245(a),productRef:ref.productRef,
     productName:ref.productName,variant:null,section:sectionOf(dl,byId,null),region:regionOf(dl),
     ambiguity:[...ref.amb,...(a.tag==='dd'?['dt_dd_order_swapped_by_source']:[])]});}
   continue;
  }
  for(const c of elementChildren245(dl)){if(c.tag==='dt'||c.tag==='dd')items.push(c);else if(c.tag==='div')items.push(...elementChildren245(c).filter(x=>x.tag==='dt'||x.tag==='dd'));}
  for(let i=0;i<items.length;i++){
   if(items[i].tag!=='dt')continue;
   const dds:Node245[]=[];for(let j=i+1;j<items.length&&items[j].tag==='dd';j++)dds.push(items[j]);
   if(!dds.length)continue;
   const label=textOf245(items[i]);
   used.add(items[i]);dds.forEach(d=>used.add(d));
   const ref=mainRef();
   raws.push({label,valueText:dds.map(d=>textOf245(d)).join(' / '),method:'definition_list',locator:locator245(items[i]),
    productRef:ref.productRef,productName:ref.productName,variant:null,section:sectionOf(dl,byId,null),region:regionOf(dl),
    ambiguity:[...ref.amb,...(dds.length>1?['multiple_values_for_one_label']:[])]});
  }
 }

 // ---- 5. repeated generic label/value structures
 // Deepest containers first, so an outer "heading + whole block" wrapper never re-reads inner pairs.
 for(const p of [...all].reverse()){
  if(p.kind!=='element'||['table','thead','tbody','tfoot','tr','dl','select','script','style','head','svg'].includes(p.tag))continue;
  const kids=elementChildren245(p).filter(k=>!isDecorative245(k));
  // Label/value shapes inside a link are navigation cards (guides, documents, other products).
  if(insideLink(p)){continue;}
  if(kids.length<2)continue;
  if(regionOf(p)==='excluded')continue;
  if(kids.some(k=>used.has(k)))continue;
  // (a) one wrapper per pair: siblings of one shape, each reading as (label, value).
  const shapes=new Map<string,Node245[]>();for(const k of kids){const s=shape(k);shapes.set(s,[...(shapes.get(s)??[]),k]);}
  let emitted=false;
  for(const [,group] of shapes){
   if(group.length<2||group.length<kids.length*0.6)continue;
   const pairs=group.map(pairOf);
   const good=pairs.filter(x=>x&&labelLike(x.label)&&x.value&&!used.has(x.labelNode)&&!linkOnlyValue(x.valueNode)&&
    !containsUsed(x.valueNode,used)&&!insideLink(x.labelNode)&&!insideLink(x.valueNode));
   const ref=mainRef();
   // The same label in every repeated item is a template widget (tabs of a guide, cards), not a spec list.
   if(good.length>=2&&new Set(good.map(x=>key245(x!.label))).size<good.length*0.6){abstain('repeated_identical_labels_widget');emitted=true;break;}
   if(good.length<2||good.length<group.length*0.6){
    // Mixed lists (prose bullets with a few "Label: value" items): only explicitly ":"-marked items
    // whose value is measurable are read.
    for(const x of good){
     if(!(x!.labelNode===x!.valueNode||/[:：]\s*$/.test(x!.label)))continue;
     if(!MEASURABLE.has(normalizeValue245(x!.value,x!.label).kind))continue;
     used.add(x!.labelNode);used.add(x!.valueNode);
     raws.push({label:x!.label,valueText:x!.value,method:'list_item_label_value',locator:locator245(x!.labelNode.kind==='text'?x!.labelNode.parent!:x!.labelNode),
      productRef:ref.productRef,productName:ref.productName,variant:null,section:sectionOf(p,byId,null),region:regionOf(p),ambiguity:[...ref.amb]});
    }
    continue;
   }
   // Title + paragraph cards are not specifications: prose values are dropped item by item.
   // A group of short text values with no measurable value and no specification context is a set of
   // feature/marketing cards ("Voted Europe's best: ..."), not attributes: held back, not promoted.
   // Context is read from this block and the two enclosing blocks: specification pages split one sheet
   // into sub-groups ("Connectivity", "Overview") under a shared heading or container.
   const ctx=[p,p.parent,p.parent?.parent].filter(Boolean).map(a=>sectionOf(a!,byId,null)??'').join(' | ');
   const ATTRIBUTE_KINDS=new Set([...MEASURABLE,'number','boolean']);
   const groupMeasurable=good.some(x=>ATTRIBUTE_KINDS.has(normalizeValue245(x!.value,x!.label).kind)||
    (x!.valueNode.kind==='element'&&[...walk245(x!.valueNode)].some(d=>d.tag==='li'&&INLINE_ATTR.test(textOf245(d)))));
   const textOnlyNoContext=!groupMeasurable&&!SPEC_CONTEXT.test(ctx)&&![...tokensOf(p)].some(t=>SPEC_CONTEXT.test(t));
   let prose=0;
   for(const x of good){
    if(normalizeValue245(x!.value,x!.label).kind==='prose'){prose++;continue;}
    used.add(x!.labelNode);used.add(x!.valueNode);
    // One label over a list of several items is several values, not one -- unless every item is itself an
    // attribute with one measurable value ("Boiler capacity 250 cc"), which is read item by item.
    const lis=x!.valueNode.kind==='element'?[...walk245(x!.valueNode)].filter(d=>d.tag==='li'):[];
    const listItems=lis.length;
    if(listItems>=2){
     const split=lis.map(li=>INLINE_ATTR.exec(textOf245(li))).map((m,i)=>m&&MEASURABLE.has(normalizeValue245(m[2],m[1]).kind)?{label:m[1],value:m[2],node:lis[i]}:null);
     if(split.every(Boolean)){
      for(const it of split)raws.push({label:it!.label,valueText:it!.value,method:'repeated_label_value',locator:locator245(it!.node),
       productRef:ref.productRef,productName:ref.productName,variant:null,section:x!.label,region:regionOf(p),ambiguity:[...ref.amb]});
      continue;
     }
    }
    raws.push({label:x!.label,valueText:x!.value,method:'repeated_label_value',locator:locator245(x!.labelNode.kind==='text'?x!.labelNode.parent!:x!.labelNode),
     productRef:ref.productRef,productName:ref.productName,variant:null,section:sectionOf(p,byId,null),region:regionOf(p),
     ambiguity:[...ref.amb,...(listItems>=2?['multiple_values_for_one_label']:[]),
      ...(textOnlyNoContext&&normalizeValue245(x!.value,x!.label).kind==='text'?['text_group_without_spec_context']:[])]});
   }
   if(prose)abstain('title_and_prose_items_not_specifications');
   emitted=true;break;
  }
  if(emitted)continue;
  // (b) alternating label/value siblings without a pair wrapper: A B A B ... (two shapes, even count).
  if(kids.length>=4&&kids.length%2===0&&kids.length<=120){
   // Alternation is judged on the exact tag + class string: label and value elements differ only there.
   const exact=(k:Node245)=>k.tag+'|'+(k.attrs.class??'').trim();
   const sa=exact(kids[0]),sb=exact(kids[1]);
   if(sa!==sb&&kids.every((k,i)=>exact(k)===(i%2?sb:sa))){
    const pairs=[];for(let i=0;i<kids.length;i+=2)pairs.push({label:textOf245(kids[i]),value:textOf245(kids[i+1]),labelNode:kids[i],valueNode:kids[i+1]});
    if(pairs.every(x=>labelLike(x.label)&&x.value)){
     const ref=mainRef();
     for(const x of pairs){used.add(x.labelNode);used.add(x.valueNode);
      raws.push({label:x.label,valueText:x.value,method:'repeated_label_value',locator:locator245(x.labelNode),productRef:ref.productRef,
       productName:ref.productName,variant:null,section:sectionOf(p,byId,null),region:regionOf(p),ambiguity:[...ref.amb]});}
    }
   }
  }
 }

 // ---- 5b. reusable components: one pair per container, the same component shape repeated across the page
 {
  const sig=(w:Node245,x:{labelNode:Node245;valueNode:Node245})=>[w.tag,w.attrs.class??'',x.labelNode.kind==='element'?x.labelNode.tag+'.'+(x.labelNode.attrs.class??''):'#text',
   x.valueNode.kind==='element'?x.valueNode.tag+'.'+(x.valueNode.attrs.class??''):'#text'].join('|');
  const bySig=new Map<string,{w:Node245;x:NonNullable<ReturnType<typeof pairOf>>}[]>();
  for(const w of all){
   if(w.kind!=='element'||used.has(w)||regionOf(w)==='excluded'||insideLink(w)||!w.attrs.class)continue;
   const kids=elementChildren245(w);if(kids.length!==2||kids.some(k=>used.has(k)))continue;
   const x=pairOf(w);if(!x||x.labelNode.kind!=='element'||x.valueNode.kind!=='element'||!labelLike(x.label)||!x.value)continue;
   if(!(x.labelNode.attrs.class&&x.valueNode.attrs.class&&x.labelNode.attrs.class!==x.valueNode.attrs.class))continue;
   const k=sig(w,x);bySig.set(k,[...(bySig.get(k)??[]),{w,x}]);
  }
  for(const [,inst] of bySig){
   if(inst.length<3)continue;
   // A component repeating the same label is a template widget (e.g. a guide's "Your selection"),
   // whereas specification components carry mostly distinct labels.
   if(new Set(inst.map(i=>key245(i.x.label))).size<inst.length*0.6)continue;
   const ref=mainRef();
   for(const {w,x} of inst){
    if(used.has(x.labelNode)||containsUsed(x.valueNode,used)||linkOnlyValue(x.valueNode))continue;
    if(normalizeValue245(x.value,x.label).kind==='prose')continue;
    used.add(x.labelNode);used.add(x.valueNode);used.add(w);
    raws.push({label:x.label,valueText:x.value,method:'repeated_label_value',locator:locator245(x.labelNode),productRef:ref.productRef,
     productName:ref.productName,variant:null,section:sectionOf(w,byId,null),region:regionOf(w),ambiguity:[...ref.amb]});
   }
  }
 }

 // ---- 5c. "Label: value" lines separated by <br> inside one block (rich-text editors, cells with several lines)
 for(const el of all){
  if(el.kind!=='element'||regionOf(el)==='excluded'||insideLink(el)||used.has(el))continue;
  if(!el.children.some(c=>c.tag==='br'))continue;
  const lines:{text:string;nodes:Node245[]}[]=[{text:'',nodes:[]}];
  for(const c of el.children){
   if(c.tag==='br'){lines.push({text:'',nodes:[]});continue;}
   if(c.kind==='element'&&BLOCK_TAGS.has(c.tag)){lines.length=0;break;} // nested blocks: not a line-structured block
   const t=c.kind==='text'?c.text:textOf245(c);lines[lines.length-1].text+=(t??'')+' ';lines[lines.length-1].nodes.push(c);
  }
  const marked=lines.map(l=>{const t=clean245(l.text).replace(/^[•·▪◦*–—-]\s*/,'');
   const m=/^([^:：]{1,60})[:：]\s*(.{1,160})$/.exec(t);return m&&labelLike(m[1])?{label:m[1],value:m[2],nodes:l.nodes}:null;});
  // Lines without a ":" ("Height 8.1 cm", "Impedance 32 ohms") are read only when the value is measurable and the
  // block has at least two such lines: one word-then-number line can be prose, a run of them is a spec list.
  const unmarked=lines.map((l,i)=>{if(marked[i])return null;const t=clean245(l.text).replace(/^[•·▪◦*–—-]\s*/,'');
   const m=UNMARKED_LINE.exec(t);return m&&labelLike(m[1])&&MEASURABLE.has(normalizeValue245(m[2],m[1]).kind)?{label:m[1].trim(),value:m[2].trim(),nodes:l.nodes}:null;});
  const pairs=[...marked.filter(Boolean),...(unmarked.filter(Boolean).length>=2?unmarked.filter(Boolean):[])];
  const kinds=pairs.map(x=>normalizeValue245(x!.value,x!.label).kind);
  if(!(pairs.length>=2||(pairs.length===1&&MEASURABLE.has(kinds[0]))))continue;
  const ref=mainRef();const sec=sectionOf(el,byId,null);
  pairs.forEach((x,i)=>{
   if(pairs.length===1&&!MEASURABLE.has(kinds[i]))return;
   raws.push({label:x!.label,valueText:x!.value,method:'line_label_value',locator:locator245(el)+`:line${i}`,productRef:ref.productRef,
    productName:ref.productName,variant:null,section:sec,region:regionOf(el),ambiguity:[...ref.amb]});
  });
  used.add(el);
 }

 // ---- 5d. "<strong>Label</strong>: value" runs inside one block (rich text with the line breaks nested in spans):
 // each emphasised label is followed by a sibling whose text starts with ":". Two or more such pairs make a list.
 for(const el of all){
  if(el.kind!=='element'||!['p','div','td','li'].includes(el.tag)||regionOf(el)==='excluded'||insideLink(el)||used.has(el))continue;
  const kids=el.children.filter(c=>c.kind==='element'||!!c.text.trim());
  const pairs:{label:string;value:string;node:Node245}[]=[];
  for(let i=0;i<kids.length-1;i++){
   const k=kids[i];if(k.kind!=='element'||!['strong','b'].includes(k.tag)||walk245Has(k,'a'))continue;
   const next=kids[i+1];const vt=(next.kind==='text'?next.text:textOf245(next)).replace(/\s+/g,' ').trim();
   const m=/^[:：]\s*(.{1,160})$/.exec(vt);const label=textOf245(k).trim();
   if(m&&labelLike(label)&&!/[:：]\s*$/.test(label))pairs.push({label,value:m[1].trim(),node:k});
  }
  const kept=pairs.filter(x=>normalizeValue245(x.value,x.label).kind!=='prose');
  if(kept.length<2)continue;
  const ref=mainRef();const sec=sectionOf(el,byId,null);
  for(const x of kept)raws.push({label:x.label,valueText:x.value,method:'line_label_value',locator:locator245(x.node),productRef:ref.productRef,
   productName:ref.productName,variant:null,section:sec,region:regionOf(el),ambiguity:[...ref.amb]});
  used.add(el);
 }

 // ---- 6. single "Label: value" list items among prose bullets, accepted only for measurable values
 for(const li of all){
  if(li.tag!=='li'||used.has(li)||regionOf(li)==='excluded'||insideLink(li))continue;
  const pr=pairOf(li);if(!pr||!labelLike(pr.label)||used.has(pr.labelNode)||containsUsed(pr.valueNode,used))continue;
  if(!/[:：]\s*$/.test(pr.label)&&pr.labelNode!==pr.valueNode)continue; // label must be explicitly marked with ":"
  const v=normalizeValue245(pr.value,pr.label);if(!MEASURABLE.has(v.kind))continue;
  used.add(li);const ref=mainRef();
  raws.push({label:pr.label,valueText:pr.value,method:'list_item_label_value',locator:locator245(li),productRef:ref.productRef,
   productName:ref.productName,variant:null,section:sectionOf(li,byId,null),region:regionOf(li),ambiguity:[...ref.amb]});
 }

 // A listing whose own visible content says the product is discontinued: a declared price is not current.
 // Only visible text of main-content regions counts: a script string or a related product's "Availability:
 // Discontinued" says nothing about this listing.
 const mainText=all.filter(n=>n.kind==='text'&&n.parent&&!['script','style','template','noscript'].includes(n.parent.tag)&&regionOf(n.parent)==='main')
  .map(n=>n.text).join(' ').replace(/\s+/g,' ').slice(0,4000);
 const listingDiscontinued=/\bdiscontinued\b|\bno longer (?:available|sold|stocked|manufactured)\b/i.test(mainText);
 // ---- normalize, attribute, detect conflicts
 const facts:Fact245[]=[];const ambiguous:Fact245[]=[];
 const candidates:Fact245[]=[];
 for(const r of raws){
  const label=cleanLabel(r.label);const pk=key245(label);
  if(!pk||pk.length>60){abstain('label_missing_or_too_long');continue;}
  // A value repeating its own label is a duplicated heading (e.g. visible + screen-reader copy).
  if(key245(r.valueText)===pk){abstain('value_repeats_label');continue;}
  // "Live Translation" -> "Live Translation for communicating across languages": a description that
  // restates its heading, not a value for it.
  if(pk.length>=4&&key245(r.valueText).startsWith(pk+' ')&&r.method!=='json_ld'&&r.method!=='microdata'){abstain('value_restates_label');continue;}
  const value=r.preValue??normalizeValue245(r.valueText,label);
  if(value.kind==='empty'){abstain('empty_value');continue;}
  if(value.kind==='price'&&value.amount===0){abstain('zero_price_placeholder');continue;}
  if(r.method!=='json_ld'&&r.method!=='microdata'&&r.method!=='page_meta'){
   const v=clean245(r.valueText);
   // "7" -> "8.5": a size-conversion row, not a property of the product.
   if(/^[\d.,/+½\s-]+$/.test(label)){abstain('numeric_label_not_property');continue;}
   if(ACTION_VALUE.test(v)){abstain('action_text_not_value');continue;}
   if(CONTACT_LABEL.test(label)||CONTACT_VALUE.test(v)){abstain('contact_details_not_property');continue;}
   if(LOGISTICS_LABEL.test(label)||(AVAILABILITY_VALUE.test(v)&&SIZE_TOKEN.test(label))){abstain('offer_logistics_not_property');continue;}
  }
  if(value.kind==='prose'){abstain('prose_value_not_kept');continue;}
  if(value.kind==='price'&&r.method!=='json_ld'&&r.method!=='microdata'&&r.method!=='page_meta'&&!PRICE_LABEL.test(label)){abstain('price_labelled_by_other_item');continue;}
  const flags=[...r.ambiguity];
  if(!promotable245(value))flags.push('value_'+value.kind);
  if(value.kind==='price'&&listingDiscontinued)flags.push('listing_states_discontinued');
  if(r.productRef==='main'&&multiVariant&&!r.variant&&r.method!=='json_ld')flags.push('variant_scope_unverified');
  if(r.region==='comparison')flags.push('in_comparison_marked_region');
  // A section equal to the property or to the product title adds nothing.
  const section=r.section&&key245(r.section)!==pk&&!(mainName&&productKey(r.section)===productKey(mainName))?r.section:null;
  candidates.push({property:label,propertyKey:pk,value,rawValue:value.kind==='per_variant'||value.kind==='compound'?r.valueText.slice(0,120):r.valueText.slice(0,120),
   product:{ref:r.productRef,name:r.productName},variant:r.variant,section,component:section&&PACKAGING.test(section)?'packaging':null,
   method:r.method,locator:r.locator,flags,status:'unverified_source_declaration',producer:'unknown',scientificTestEvidence:false,rankingAuthorized:false});
 }
 // A group heading cell read together with its first row ("Software" = "Eye-CareU Yes" next to
 // "Eye-CareU" = "Yes") duplicates that row under a wrong label: dropped.
 {const joined=new Set(candidates.map(c=>JSON.stringify([c.product.ref,c.product.name,key245(c.property+' '+c.rawValue)])));
  for(let i=candidates.length-1;i>=0;i--){const c=candidates[i];
   if(c.value.kind==='text'&&joined.has(JSON.stringify([c.product.ref,c.product.name,key245(c.rawValue)]))){candidates.splice(i,1);abstain('group_heading_joined_with_row');}}}
 // Blocking reasons: everything else is a non-blocking note.
 const BLOCKING=/^(?:main_product_ambiguous|structured_data_disagrees_with_visible|text_group_without_spec_context|listing_states_discontinued|main_product_unnamed|comparison_region_without_product_key|missing_property_label|missing_product_header|missing_product_key|value_spans_multiple_properties|value_cell_is_header|multiple_values_for_one_label|value_per_variant|value_compound|conflicting_values)$/;
 const valueKey=(v:Value245)=>JSON.stringify(v);
 const groups=new Map<string,Fact245[]>();
 for(const c of candidates){const k=JSON.stringify([c.product.ref,c.product.name&&productKey(c.product.name),c.variant&&productKey(c.variant),c.section&&key245(c.section),c.propertyKey]);
  groups.set(k,[...(groups.get(k)??[]),c]);}
 // Structured data that disagrees with a visible declaration of the same property (unit suffixes such as
 // "Weight (kg)" ignored) is held back and noted; the visible declaration stays, flagged with the disagreement.
 const baseKey=(k:string)=>k.replace(/\s+(?:kg|g|mm|cm|m|l|ml|w|kw|v|hz|in|lb|oz|min|s|h)$/,'');
 const visibleByBase=new Map<string,Fact245[]>();
 for(const c of candidates)if(c.method!=='json_ld'&&c.method!=='microdata'&&c.product.ref==='main')
  visibleByBase.set(baseKey(c.propertyKey),[...(visibleByBase.get(baseKey(c.propertyKey))??[]),c]);
 const comparable=(a:Value245,b:Value245)=>a.kind==='quantity'&&b.kind==='quantity'?canonicalUnit245(a.unit)===canonicalUnit245(b.unit)&&Math.abs(a.number-b.number)<=1e-6*Math.max(1,Math.abs(b.number)):valueKey(a)===valueKey(b);
 for(const c of candidates){
  if(c.method!=='json_ld'||c.product.ref!=='main'||c.variant)continue;
  const vis=visibleByBase.get(baseKey(c.propertyKey));
  if(vis&&vis.some(v=>v.value.kind===c.value.kind)&&!vis.some(v=>comparable(v.value,c.value))){
   c.flags.push('structured_data_disagrees_with_visible');for(const v of vis)v.flags.push('structured_data_declares_other_value');}
 }
 for(const [,g] of groups){
  const distinct=new Set(g.map(x=>valueKey(x.value)));
  if(distinct.size>1){for(const x of g){x.flags.push('conflicting_values');ambiguous.push(x);}continue;}
  // Same value declared several times (e.g. JSON-LD and a table): keep one, note the others.
  const keep={...g[0],flags:[...new Set(g.flatMap(x=>x.flags))]};
  if(g.length>1)keep.flags.push(`also_declared_at:${g.slice(1).map(x=>x.locator).join('|').slice(0,200)}`);
  (keep.flags.some(f=>BLOCKING.test(f))||keep.product.ref==='unknown'?ambiguous:facts).push(keep);
 }
 const sortF=(a:Fact245,b:Fact245)=>a.locator.localeCompare(b.locator)||a.propertyKey.localeCompare(b.propertyKey)||String(a.product.name).localeCompare(String(b.product.name));
 facts.sort(sortF);ambiguous.sort(sortF);
 return {schema:'pee245.spec-extraction.v1',sourceUrl,documentSha256,
  mainProduct:{name:mainName,source:mainSource,identifiers,declaredProductCount:declared.size,ambiguous:mainAmbiguous,
   pageSignals:{ogType:all.find(n=>n.tag==='meta'&&n.attrs.property==='og:type')?.attrs.content?.toLowerCase().slice(0,40)??null,
    purchaseControls:all.filter(n=>(n.tag==='button'||n.tag==='a'||(n.tag==='input'&&/^(?:submit|button)$/i.test(n.attrs.type??'')))&&
     /^\s*(?:add to (?:cart|basket|bag|trolley)|buy (?:it )?now)\s*$/i.test(n.tag==='input'?(n.attrs.value??''):textOf245(n))).length}},
  variants,facts:facts.slice(0,1500),ambiguous:ambiguous.slice(0,1500),abstentions:abst,
  stats:{nodes:nodeCount,tables:tableCount,excludedRegions:excludedCount,truncated,milliseconds:Math.round(performance.now()-started)},
  rawSourceStored:false,rankingAuthorized:false,identityVerified:false};
}

/** Map promoted Phase245 facts onto the Phase241 contract for existing consumers. */
export function toFacts241(x:SpecExtraction245,sourceId:string):Fact241[]{
 return x.facts.map(f=>{
  const v=f.value;
  const value:Fact241['value']=v.kind==='quantity'?{type:'scalar',number:v.number,unit:v.unit}:
   v.kind==='range'?{type:'range',min:v.min,max:v.max,unit:v.unit}:
   v.kind==='price'?(v.maxAmount!==undefined?{type:'range',min:v.amount,max:v.maxAmount,unit:v.currency.toLowerCase()}:{type:'scalar',number:v.amount,unit:v.currency.toLowerCase()}):
   v.kind==='number'?{type:'scalar',number:v.number,unit:''}:{type:'text',value:f.rawValue};
  return {property:f.property,propertyKey:f.propertyKey,value,role:'unresolved' as const,
   context:{component:f.component,condition:null,variant:f.variant??(f.product.ref==='named'?f.product.name:null),market:null,rowHeading:f.section},
   provenance:{format:'html' as const,sourceId,documentSha256:x.documentSha256,locator:f.locator,producer:'independent_unknown' as const,method:'phase245_'+f.method},
   status:'unverified_source_declaration' as const,identity:f.product.name?'document_declared_unverified' as const:'unresolved' as const,
   scientificTestEvidence:false as const,rankingAuthorized:false as const};
 });
}
