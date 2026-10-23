/** Continuous-learning Step 1D-A — document-level product identity inventory (EVALUATION ONLY; no production path uses it).
 *
 * From ONE document's own text it builds: entity candidates (canonical name as the document establishes it, brand and
 * model only where the document shows them, evidence locations, unresolved fields), typed mentions (product, instrument,
 * standard, other, unknown), alias links with their reason and evidence, and a section scope per block from the
 * heading hierarchy. Methods (no catalog, no product dictionary, no external facts):
 *  - mention detection anchored on model-like tokens (a token with letters and digits, an internal capital, a trailing "+",
 *    or a number/roman numeral that ends a capitalised series name), extended to the capitalised span around it;
 *  - entity typing from the document context: an instrument noun after the span, a technical-standard acronym, a bare
 *    technical code (4K, 120Hz), product evidence (heading, table header, category noun after the span, or recurrence);
 *  - within-document linking: a shorter span links to the full span it is a word-suffix of (brand-dropped names, bare
 *    model codes, short series names), only when exactly one full candidate fits; a standalone brand links only when
 *    exactly one product entity carries it; different model tokens are never merged; anything else is ambiguous or NIL;
 *  - region: only the article (from its first h1), so site navigation is not read as content.
 * Observed surfaces and inferred canonical names are kept apart; every alias carries the location of its supporting full
 * mention. Pure: callers supply the reader's blocks and tags. */

export type EntityType1D='product'|'instrument'|'standard'|'other'|'unknown';
export type MentionState1D='explicit_identity'|'contextual_alias'|'ambiguous'|'unknown_product'|'not_product';
export type Region1D='title'|'heading'|'table_header'|'table_cell'|'list_item'|'prose';
export interface Location1D {blockIndex:number;offset:number;region:Region1D}
export interface Entity1D {id:string;canonical:string;brand:string|null;model:string;type:EntityType1D;
 /** Where the canonical (fullest) form is observed. */
 evidence:Location1D[];
 /** Fields the document does not establish (e.g. brand_not_stated); never filled from outside knowledge. */
 unresolved:string[];typeReason:string}
export interface Mention1D {surface:string;at:Location1D;entityId:string|null;state:MentionState1D;reason:string;candidates:string[];
 /** Location of the full mention that supports a contextual alias. */
 support:Location1D|null}
export interface Inventory1D {entities:Entity1D[];mentions:Mention1D[];articleStart:number;
 /** Section scope of a block from the heading hierarchy: the product of its section, or how many products compete. */
 section:(blockIndex:number)=>{entityId:string|null;competing:number}}

/** Words that never start a product name (function words and generic page vocabulary). */
const LEFT_STOP=new Set(['The','A','An','This','That','These','Those','Our','We','I','In','On','For','With','And','But','Or','Best','Overall','Staff','Top',
 'New','Review','Reviews','Tested','Why','How','What','Which','Is','It','Its','Vs','Versus','When','Where','If','As','At','By','To','Of','From','After',
 'Before','Both','Each','All','Most','More','Less','Than','Like','Unlike','Special','Other','Here','There','Pros','Cons','Verdict','Price','Design',
 'Performance','Test','Results','Mode','Standard','Filmmaker','Movie','Cinema','Game','Speed','Sleep','Auto','Turbo','Eco','Low','High','Medium',
 'Level','Setting','Step','Note','Update','Editor','Today','Yes','No','So','Also','However','Meanwhile','Running','Measuring',
 'Follow','Support','Join','Subscribe','Read','Share','Sign','Shop','Buy','See','Watch','Get','Visit','Contact']);
/** Short capitalised words that end a sentence fragment rather than a product name. */
const RIGHT_STOP=new Set(['The','And','But','Or','In','On','For','With','At','By','To','Of','Is','It','Its','Was','Has','Vs','Mode','Then','Also','When']);
const STANDARD_ACRONYM=/^(?:[EHU]1\d|HEPA|MERV|AHAM|ISO|IEC|EN|ANSI|CADR|PM\d|HDMI|USB|HDR\d*|DCI|Rec|IP\d*|DIN|BS|Wi-?Fi|Bluetooth|Dolby|DTS|ENERGY|UL|CE|VDE)$/i;
const TECH_CODE=/^(?:\d+[kK]|\d+(?:hz|p|fps|w|in|mm|cm|kg|db|dba|nits?|ms|cfm|kwh|l)|\d+x\d+)$/i;
const INSTRUMENT_NOUN=/^(?:tester|meter|colorimeter|spectrometer|spectrophotometer|spectroradiometer|probe|analy[sz]er|sensor|monitor|counter|logger|calibrator|thermometer|hygrometer|anemometer|wattmeter|generator)s?$/i;
const COMPARATIVE=/\b(?:vs\.?|versus|than|compared|against|matched|matches|like|unlike|beats?|outperforms?)\b/i;
const ROMAN=/^(?:II|III|IV|VI|VII|VIII)$/;
const UNIT_NEXT=/^(?:db|dba|nits?|cfm|w|watts?|kwh|ms|minutes?|mins?|hours?|hrs?|%|hz|mm|cm|m|kg|g|lbs?|inch(?:es)?|percent|l|litres?|liters?)$/i;
const esc=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const CAP=/^[A-Z][\w+&'’.\-/]*$/;
/** A model-like token: letters and digits ("B5", "200S", "3Pro", "A230/A231"), an internal capital ("AirFanta",
 * "BreatheSmart"), or a trailing "+" ("Mini+"). Pure numbers and technical codes are not model-like on their own. */
export function modelLike1D(t:string):boolean{
 if(TECH_CODE.test(t)||/^\d+(?:[.,]\d+)?$/.test(t)||!/^[A-Z0-9]/.test(t))return false;
 // Quantities and dimensions are not models: "12.6D", "7x", "65-inch", "240-year-old", "10km", "1960s".
 if(/^\d+[.,]\d/.test(t)||/^\d+x$/i.test(t)||/-[a-z]/.test(t)||/^\d+[a-z]{2,}$/.test(t))return false;
 return (/\d/.test(t)&&/[A-Za-z]/.test(t))||/^[A-Z][a-z]+[A-Z][A-Za-z]*$/.test(t)||/^[A-Z][\w-]*\+$/.test(t);
}
interface Span {tokens:string[];at:Location1D}
const regionOf=(tag:string):Region1D=>/^h[1-6]$/.test(tag)?'heading':tag==='th'?'table_header':tag==='td'?'table_cell':tag==='li'?'list_item':'prose';
/** Capitalised spans around model-like tokens (and series names ending in a number or roman numeral). */
function spans(text:string,blockIndex:number,region:Region1D,stopNouns:ReadonlySet<string>):Span[]{
 const toks=[...text.matchAll(/[A-Za-z0-9][\w+&'’.\-/]*/g)].map(m=>({t:m[0].replace(/[’'.,;:]+$/,'').replace(/['’]s$/,''),i:m.index!}));const out:Span[]=[];
 const gap=(a:{t:string;i:number},b:{t:string;i:number})=>text.slice(a.i+a.t.length,b.i);
 let lastE=-1;
 for(let k=0;k<toks.length;k++){
  const t=toks[k].t;
  const seriesNumber=(/^\d{1,4}$/.test(t)||ROMAN.test(t))&&k>0&&CAP.test(toks[k-1].t)&&!LEFT_STOP.has(toks[k-1].t)&&/^\s$/.test(gap(toks[k-1],toks[k]));
  if(!modelLike1D(t)&&!seriesNumber)continue;
  // Left: up to 3 capitalised tokens joined by single spaces, not function words.
  let s=k;while(s>0&&s-1>lastE&&k-s<4&&CAP.test(toks[s-1].t)&&!LEFT_STOP.has(toks[s-1].t)&&/^\s$/.test(gap(toks[s-1],toks[s])))s--;
  // Right: roman numerals, model-like tokens, short capitalised suffix words ("Max", "Pro", "Mini+"), or one number.
  let e=k;while(e+1<toks.length&&e-k<3&&/^\s$/.test(gap(toks[e],toks[e+1]))){const n=toks[e+1].t;
   const titleCase=(region==='heading'||region==='table_header')&&CAP.test(n)&&!RIGHT_STOP.has(n)&&!LEFT_STOP.has(n)&&!/^[A-Z]{2,}$/.test(n)&&!stopNouns.has(n.toLowerCase());
   if(ROMAN.test(n)||modelLike1D(n)||(/^[A-Z][a-z]{1,4}\+?$/.test(n)&&!RIGHT_STOP.has(n))||(/^\d{1,4}$/.test(n)&&e===k)||titleCase)e++;else break;}
  const tk=toks.slice(s,e+1).map(x=>x.t);if(tk.every(x=>/^\d+$/.test(x)))continue;
  // A span followed by a unit is a quantity ("Sub-45 dBA"), not a product.
  if(e+1<toks.length&&UNIT_NEXT.test(toks[e+1].t)&&/^\s?$/.test(gap(toks[e],toks[e+1]))){k=e;lastE=e;continue;}
  // Adjacent spans separated by one space are one name ("GoveeLife" + "Smart Air Purifier 2").
  const prev=out[out.length-1];const prevEnd=prev?prev.at.offset+prev.tokens.join(' ').length:-1;
  if(prev&&prev.at.blockIndex===blockIndex&&text.slice(prev.at.offset,prevEnd)===prev.tokens.join(' ')&&/^\s$/.test(text.slice(prevEnd,toks[s].i))){prev.tokens=[...prev.tokens,...tk];k=e;lastE=e;continue;}
  out.push({tokens:tk,at:{blockIndex,offset:toks[s].i,region}});k=e;lastE=e;}
 return out;
}
const lower=(a:string[])=>a.map(t=>t.toLowerCase());
const isSuffix=(short:string[],long:string[])=>short.length<long.length&&lower(short).every((t,i)=>t===lower(long)[long.length-short.length+i]);
const same=(a:string[],b:string[])=>a.length===b.length&&lower(a).every((t,i)=>t===lower(b)[i]);

export function buildInventory1D(input:{blocks:readonly string[];tags:readonly string[];title:string|null;categoryNouns:readonly string[];
 /** The page host (document metadata): the publisher's own name is not a product. */publisherHost?:string|null;
 /** Step 1D-A2 (optional): names the page STRUCTURE states (JSON-LD Product / reviewed item, table product headers), with
  * provenance, and reader blocks in boilerplate regions (navigation, footers, item listings) that are not read. A structured
  * name becomes a product form; its exact occurrences and its word-suffixes of two or more tokens (not made only of
  * category words) are mentions. Code-less names ("Ninja Crispi") are thus found only when the structure states them. */
 structured?:{names:readonly {name:string;source:string;blockIndex:number|null}[];excludedBlocks?:ReadonlySet<number>}}):Inventory1D{
 const publisher=(input.publisherHost??'').replace(/^www\./,'').split('.')[0].toLowerCase();
 const {blocks,tags}=input;const h1=tags.findIndex(t=>t==='h1');const start=h1>=0?h1:0;
 const nouns=input.categoryNouns.map(n=>n.toLowerCase());const stopNouns=new Set([...nouns.flatMap(n=>n.split(/\s+/)),'review','tested','test','vs']);
 const skip=input.structured?.excludedBlocks;
 const all:Span[]=[];for(let i=start;i<blocks.length;i++)if(!skip?.has(i))all.push(...spans(blocks[i],i,regionOf(tags[i]??'p'),stopNouns));
 // Step 1D-A2: structured names as forms, then their observed occurrences in the read blocks.
 const structuredSource=new Map<string,string>();
 for(const s of input.structured?.names??[]){const tk=s.name.replace(/\s*\(.*$/,'').replace(/[’']s\b/g,'').split(/\s+/).map(t=>t.replace(/[,;:]+$/,'')).filter(Boolean);
  if(tk.length<2||tk.length>8||!/^[A-Z0-9]/.test(tk[0])||tk.every(t=>stopNouns.has(t.toLowerCase())))continue;const k=lower(tk).join(' ');
  if(!structuredSource.has(k))structuredSource.set(k,s.source);
  if(s.source==='linked_name'){/* a link is a lead, not a location of product evidence: only its text occurrences count */}
  else if(s.blockIndex!==null&&s.blockIndex>=start&&!skip?.has(s.blockIndex)&&!all.some(sp=>sp.at.blockIndex===s.blockIndex&&same(sp.tokens,tk)))
   all.push({tokens:tk,at:{blockIndex:s.blockIndex,offset:Math.max(0,(blocks[s.blockIndex]??'').indexOf(tk[0])),region:'table_header'}});
  // A metadata name (JSON-LD) has no reader block: region 'title'. A header cell outside the reader blocks (th) keeps 'table_header'.
  else if(s.blockIndex===null&&!all.some(sp=>sp.at.blockIndex===-1&&same(sp.tokens,tk)))all.push({tokens:tk,at:{blockIndex:-1,offset:0,region:s.source==='table_product_header'?'table_header':'title'}});
  // Exact and word-suffix occurrences (two tokens or more, not only category words) in the read blocks.
  for(let n=tk.length;n>=(s.source==='linked_name'?tk.length:2);n--){const suf=tk.slice(tk.length-n);if(suf.every(t=>stopNouns.has(t.toLowerCase())||!/^[A-Z0-9]/.test(t)))continue;
   const re=new RegExp('(?<![\\w])'+suf.map(esc).join('\\s+')+'(?![\\w])','g');
   for(let i=start;i<blocks.length;i++){if(skip?.has(i))continue;for(const m of blocks[i].matchAll(re)){
    if(all.some(sp=>sp.at.blockIndex===i&&m.index!>=sp.at.offset-1&&m.index!<sp.at.offset+sp.tokens.join(' ').length))continue;
    all.push({tokens:m[0].split(/\s+/),at:{blockIndex:i,offset:m.index!,region:regionOf(tags[i]??'p')}});}}}}
 all.sort((a,b)=>a.at.blockIndex-b.at.blockIndex||a.at.offset-b.at.offset);
 const after=(sp:Span,n:number)=>{const b=blocks[sp.at.blockIndex]??'';return b.slice(sp.at.offset).split(/\s+/).slice(sp.tokens.length,sp.tokens.length+n).join(' ').toLowerCase().replace(/[^a-z\s-]/g,'');};
 // Full forms: observed forms that are not a word-suffix of a longer observed form.
 const forms:string[][]=[];for(const sp of all)if(!forms.some(f=>same(f,sp.tokens)))forms.push(sp.tokens);
 // A single word that is the first word of exactly one longer form ("AirFanta" for "AirFanta 3Pro") is not a full form.
 const firstOf=(f:string[])=>f.length===1?forms.filter(g=>g.length>1&&g[0].toLowerCase()===f[0].toLowerCase()):[];
 const full=forms.filter(f=>!forms.some(g=>isSuffix(f,g))&&firstOf(f).length!==1);
 const entities:Entity1D[]=[];const byForm=new Map<string,Entity1D>();const key=(f:string[])=>lower(f).join(' ');
 for(const f of full){const occ=all.filter(sp=>same(sp.tokens,f)||isSuffix(sp.tokens,f));const canon=occ.filter(sp=>same(sp.tokens,f));
  const first=f[0];const model=f.filter(modelLike1D).join(' ')||f[f.length-1];
  let type:EntityType1D='unknown';let reason='single mention without product evidence';
  if(publisher&&f.join('').toLowerCase()===publisher){type='other';reason='the publisher of the page (from its host)';}
  // A standard or grade opens the span ("HEPA H13", "AHAM PM2.5") or follows one adjective ("True HEPA H11"); a product name
  // that merely contains a standard term ("PuroAir HEPA 14 240") is not a standard.
  else if(STANDARD_ACRONYM.test(first.replace(/\+$/,''))||(f.length>1&&!modelLike1D(first)&&STANDARD_ACRONYM.test(f[1].replace(/\+$/,'')))||(f.length===1&&TECH_CODE.test(first))){type='standard';reason='technical standard or grade acronym';}
  else if(occ.some(sp=>after(sp,4).split(/\s+/).some(w=>INSTRUMENT_NOUN.test(w)))){type='instrument';reason='followed by a measuring-instrument noun';}
  else if(structuredSource.has(key(f))&&structuredSource.get(key(f))!=='linked_name'){type='product';reason='named by the page structure ('+structuredSource.get(key(f))+')';}
  else if(occ.some(sp=>sp.at.region==='heading'||sp.at.region==='table_header')&&(f.length>1||/\d/.test(first))){type='product';reason='named in a heading or table header';}
  else if(occ.some(sp=>nouns.some(n=>after(sp,4).includes(n)))){type='product';reason='followed by a category noun';}
  else if(occ.length>=2&&(f.length>1||/\d/.test(first))){type='product';reason='recurs in the document';}
  const brand=f.length>=2&&!/^\d/.test(first)?first:null;
  const e:Entity1D={id:'E'+(entities.length+1),canonical:f.join(' '),brand,model,type,evidence:canon.map(sp=>sp.at),unresolved:brand?[]:['brand_not_stated'],typeReason:reason};
  entities.push(e);byForm.set(key(f),e);}
 // A full form that is a word-prefix of another full form ("PureProtect Mini" / "PureProtect Mini 900 Series") may name a
 // family or a different variant: neither is merged; the less frequent of the two is ambiguous unless the shorter form is at
 // least three times as frequent (then the longer one is a descriptor-extended or variant mention and is the ambiguous one).
 // A full form observed only in the h1 whose model-like tokens equal those of a form used in the body ("AI B6" in a title,
 // "LG B6" in the text) is a descriptor-extended title form of the body form, not a separate product.
 // Step 1D-A2: a name seen only in page metadata (JSON-LD) is title-like and treated as an h1-only form (same model
 // tokens as exactly one body form). Table-header names are exact cell text and only take the descriptor rule below.
 const structuralOnly=(f:string[])=>structuredSource.has(key(f))&&all.filter(sp=>same(sp.tokens,f)).every(sp=>(sp.at.blockIndex===-1&&sp.at.region==='title')||tags[sp.at.blockIndex]==='h1');
 const h1Only=(f:string[])=>all.filter(sp=>same(sp.tokens,f)).every(sp=>tags[sp.at.blockIndex]==='h1')||structuralOnly(f);
 const modelSet=(f:string[])=>lower(f.filter(modelLike1D)).sort().join(' ');
 const titleVariant=new Map<string,string[]>();
 const isPrefix=(a:string[],b:string[])=>a.length<b.length&&lower(a).every((t,i)=>t===lower(b)[i]);
 for(const a of full)if(h1Only(a)&&modelSet(a)){const body=full.filter(b=>b!==a&&!h1Only(b)&&modelSet(b)===modelSet(a));if(body.length===1)titleVariant.set(key(a),body[0]);}
 // Descriptor words: only words of the category's own nouns in the registry ("Dishwasher", "OLED" from "oled tv"); never
 // numbers, sizes or edition words ("XL", "Series", "Pro", "Mini"), which may name a different product.
 const descriptor=(t:string)=>stopNouns.has(t.toLowerCase());
 // Step 1D-A2: a structured name that is exactly one document form plus trailing descriptor words without model tokens
 // ("Samsung S85F OLED", "... Dishwasher") is that form; a different or additional model token never qualifies.
 for(const a of full)if(!titleVariant.has(key(a))&&structuredSource.has(key(a))&&modelSet(a)){const body=full.filter(b=>b!==a&&isPrefix(b,a)&&modelSet(b)===modelSet(a)&&a.slice(b.length).every(descriptor));if(body.length===1)titleVariant.set(key(a),body[0]);}
 const count=(f:string[])=>all.filter(sp=>same(sp.tokens,f)||isSuffix(sp.tokens,f)).length;
 const prefixAmbiguous=new Map<string,string>();
 for(const a of full)for(const b of full)if(isPrefix(a,b)&&!(input.structured&&titleVariant.has(key(b))&&same(titleVariant.get(key(b))!,a))){const ca=count(a),cb=count(b);
  if(ca>=3*cb)prefixAmbiguous.set(key(b),'longer form of '+a.join(' ')+' (descriptor or variant not established)');
  else prefixAmbiguous.set(key(a),'word-prefix of '+b.join(' ')+' (family or variant not established)');}
 // Mentions: each observed span, linked to the unique full form it equals or is a word-suffix of.
 const mentions:Mention1D[]=[];
 for(const sp of all){const lead=firstOf(sp.tokens).filter(g=>full.some(f=>same(f,g)));
  const fits0=(lead.length===1?lead:full.filter(f=>same(sp.tokens,f)||isSuffix(sp.tokens,f))).map(f=>titleVariant.get(key(f))??f);
  const fits=[...new Map(fits0.map(f=>[key(f),byForm.get(key(f))!])).values()];const viaTitle=titleVariant.has(key(sp.tokens));const surface=sp.tokens.join(' ');
  if(fits.length!==1){mentions.push({surface,at:sp.at,entityId:null,state:'ambiguous',reason:fits.length?'word-suffix of several full names':'no full name',candidates:fits.map(e=>e.canonical),support:null});continue;}
  const e=fits[0];const exact=same(sp.tokens,e.canonical.split(' '));
  const pa=prefixAmbiguous.get(key(e.canonical.split(' ')));
  if(pa){mentions.push({surface,at:sp.at,entityId:null,state:'ambiguous',reason:pa,candidates:[e.canonical],support:null});continue;}
  const state:MentionState1D=e.type==='product'?(exact?'explicit_identity':'contextual_alias'):e.type==='unknown'?'unknown_product':'not_product';
  mentions.push({surface,at:sp.at,entityId:e.id,state,reason:viaTitle?'title form of the name used in the body (same model token)':exact?'full name':lead.length===1?'first word of exactly one product name in the document':'word-suffix of the full name observed elsewhere in the document',candidates:[e.canonical],
   support:exact?null:e.evidence[0]??null});}
 // Standalone brands: a brand word not followed by a model token, linked only when one product entity carries it.
 const brands=new Map<string,Entity1D[]>();for(const e of entities)if(e.brand&&e.type==='product')brands.set(e.brand,[...(brands.get(e.brand)??[]),e]);
 for(const [b,es] of brands)for(let i=start;i<blocks.length;i++)for(const m of blocks[i].matchAll(new RegExp('\\b'+esc(b)+'\\b(?!\\s+[A-Z0-9])','g'))){
  if(mentions.some(x=>x.at.blockIndex===i&&m.index!>=x.at.offset&&m.index!<x.at.offset+x.surface.length))continue;
  mentions.push({surface:b,at:{blockIndex:i,offset:m.index!,region:regionOf(tags[i]??'p')},entityId:es.length===1?es[0].id:null,state:es.length===1?'contextual_alias':'ambiguous',
   reason:es.length===1?'standalone brand carried by exactly one product in the document':'brand shared by several products',candidates:es.map(e=>e.canonical),support:es.length===1?es[0].evidence[0]??null:null});}
 const products=new Set(entities.filter(e=>e.type==='product').map(e=>e.id));
 const level=(t:string|undefined)=>Number(/^h([1-6])$/.exec(t??'')?.[1]??0);
 const section=(bi:number)=>{
  // Heading chain: the nearest preceding heading, then each preceding heading of a strictly higher level, up to h1.
  const chain:number[]=[];let lv=7;for(let i=bi-1;i>=start;i--){const l=level(tags[i]);if(l&&l<lv){chain.push(i);lv=l;if(l<=1)break;}}
  const named=chain.filter(i=>tags[i]!=='h1').map(i=>({ids:[...new Set(mentions.filter(m=>m.at.blockIndex===i&&m.entityId&&products.has(m.entityId)).map(m=>m.entityId!))],comparative:COMPARATIVE.test(blocks[i])}));
  const single=named.filter(n=>n.ids.length===1&&!n.comparative);const top=single[single.length-1];
  if(!top)return {entityId:null,competing:named.filter(n=>!n.comparative).reduce((a,n)=>a+n.ids.length,0)};
  // A deeper non-comparative heading naming another single product, or several products, competes with the section's product.
  return single.some(n=>n.ids[0]!==top.ids[0])||named.some(n=>!n.comparative&&n.ids.length>1)?{entityId:null,competing:2}:{entityId:top.ids[0],competing:0};};
 // Step 1D-A2 (structured input only): a title or structural form linked to a body form is that entity's alias, not a
 // separate entity (without structured input the Step 1D-A output is unchanged).
 const kept=input.structured?entities.filter(e=>!titleVariant.has(key(e.canonical.split(' ')))):entities;
 return {entities:kept,mentions,articleStart:start,section};
}
/** Surfaces for attribution: every observed form of each product entity, keyed by the entity and named by its canonical
 * form. Instruments, standards, unknown single mentions and ambiguous forms are left out. */
export function attributionMentions1D(inv:Inventory1D):{name:string;model:string;key:string}[]{
 const out:{name:string;model:string;key:string}[]=[];const seen=new Set<string>();
 for(const m of inv.mentions){if(!m.entityId||(m.state!=='explicit_identity'&&m.state!=='contextual_alias'))continue;const e=inv.entities.find(x=>x.id===m.entityId)!;
  const k=e.id+'|'+m.surface.toLowerCase();if(seen.has(k))continue;seen.add(k);out.push({name:e.canonical,model:m.surface,key:e.id});}
 return out.sort((a,b)=>b.model.length-a.model.length);
}
