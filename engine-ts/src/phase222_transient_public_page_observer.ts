/** Phase222: inspect public page leads without asserting a republication licence.
 * Reads only HTTPS pages that the existing discovery worker produced, honours
 * robots and explicit restrictions, observes schema.org identity metadata in
 * process memory and returns only bounded derived metadata + provenance.
 * No article text, snippet, quotation or page HTML is stored or returned.
 * This does NOT confer permission for commercial bulk text/data mining.
 */
import {createHash} from 'node:crypto';
import {RESEARCH_AGENT,restrictedHttpsTransport,robotsDecision,type SourceTransport,PAGE_MAX_BYTES} from './approved_web_reader.js';
import {safeMetadataUrl75} from './phase75_source_discovery.js';
import {extractTransientClaims224,type TransientClaims224} from './phase224_transient_structured_claims.js';
import {probeTransientTestContent225,type TestProbe225} from './phase225_transient_test_probe.js';
import {htmlToIR241,type Value241} from './phase241_unified_product_facts.js';
import {extractSpecifications245,type Fact245,type SpecExtraction245} from './phase245_spec_extraction.js';
import type {Run220,Registry220} from './phase220_autonomous_discovery_worker.js';

export type Restriction222='not_reviewed'|'no_known_restriction'|'explicitly_prohibited'|'login_required';
export interface PageReceipt222 {
 sourceId:string;url:string;observedAt:string;
 status:'metadata_observed'|'no_structured_identity'|'blocked';
 reasonCodes:string[];
 responseSha256:string|null;byteExact:boolean;
 /** These are unverified publisher declarations, not verified product facts. */
 declaredTypes:readonly string[];
 productLeads:readonly {name:string;brand:string|null;model:string|null;sku:string|null}[];
 publicationLeads:readonly {kind:string;datePublished:string|null;dateModified:string|null}[];
 /** Unverified structured attributes, extracted during the same transient page read. */
 structuredDeclarations224:TransientClaims224;
 /** Phase225 research-only transient test and methodology candidates. */
 transientTestProbe225:TestProbe225;
 /** Phase241 property/value declarations (spec rows, schema.org PropertyValue, comparison matrices).
  * Short derived values with locators only; product names are publisher-declared and unverified. */
 productFacts241:{factCount:number;facts:readonly {product:string|null;property:string;value:Value241;
  method:string;locator:string}[]};
 /** Phase245 generic specification extraction: promoted facts (product/variant/section attributed) and
  * the count of declarations held back as ambiguous, with abstention reasons. Unverified declarations. */
 specifications245:{mainProduct:SpecExtraction245['mainProduct']|null;factCount:number;ambiguousCount:number;
  facts:readonly Pick<Fact245,'product'|'variant'|'section'|'component'|'property'|'value'|'rawValue'|'method'|'locator'|'flags'>[];
  abstentions:Readonly<Record<string,number>>};
 identityNextAction:'verify_exact_variant'|'inspect_original_publication'|'find_other_source'|'blocked';
 scientificEvidenceAdmitted:false;rankingAuthorized:false;
 noArticleTextStored:true;
}
export interface Observation222 {
 schema:'pee222.page-observation.v1';mode:'live'|'synthetic_fixture';
 requestSha256:string;sourceDiscoveryRun:'pee220.run.1';
 networkRequests:readonly string[];receipts:readonly PageReceipt222[];
 blockedCount:number;identityLeadCount:number;
 /** No publisher text, article excerpts, or full HTML retained in this value. */
 noSourceBodiesStored:true;rankingAuthorized:false;independentEvidenceVerified:false;
 limits:readonly string[];
}
const sha=(x:Uint8Array)=>createHash('sha256').update(x).digest('hex');
const normal=(v:unknown,max:number):string|null=>{
 if(typeof v!=='string')return null;
 const s=v.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
 return s&&s.length<=max&&!/[<>]/.test(s)?s:null;
};
const typeName=(v:unknown):string[]=>{
 const items=Array.isArray(v)?v:[v];return items.filter((x):x is string=>typeof x==='string')
  .map(x=>x.split(/[/#]/).pop()??'').filter(x=>/^[A-Za-z]{3,36}$/.test(x)).slice(0,8);
};
const smallString=(x:unknown,max=140):string|null=>normal(x,max);
function brandName(x:unknown):string|null{
 if(typeof x==='string')return smallString(x);
 if(x&&typeof x==='object'&&!Array.isArray(x))return smallString((x as Record<string,unknown>).name);
 return null;
}
/** Accept only schema.org-shaped JSON-LD metadata; no HTML-to-claims inference. */
export function extractDeclaredPageIdentity222(body:string):Pick<PageReceipt222,'declaredTypes'|'productLeads'|'publicationLeads'> {
 const result:{declaredTypes:string[];productLeads:PageReceipt222['productLeads'][number][];
  publicationLeads:PageReceipt222['publicationLeads'][number][]}={declaredTypes:[],productLeads:[],publicationLeads:[]};
 if(body.length>PAGE_MAX_BYTES||!/<html\b/i.test(body))return result;
 // Bound the JSON-LD blocks, not all scripts: retail pages often carry dozens of scripts before metadata.
 const texts=[...body.matchAll(/<script\b([^>]{0,700})>([\s\S]*?)<\/script\s*>/gi)]
  .filter(m=>/\btype\s*=\s*(["'])application\/ld\+json\1/i.test(m[1])).slice(0,35);
 let visited=0;
 const read=(v:unknown,depth:number):void=>{
  if(++visited>100||depth>6||!v||typeof v!=='object')return;
  if(Array.isArray(v)){for(const item of v.slice(0,20))read(item,depth+1);return;}
  const o=v as Record<string,unknown>;
  const names=typeName(o['@type']);
  for(const type of names)if(!result.declaredTypes.includes(type))result.declaredTypes.push(type);
  // A ProductGroup is one product with size/colour variants (common on retail pages); it is read as
  // a single lead, and its hasVariant entries are not expanded into one lead per size.
  if(names.includes('Product')||names.includes('ProductModel')||names.includes('ProductGroup')){
   const name=smallString(o.name,180);
   if(name&&result.productLeads.length<8)result.productLeads.push({name,brand:brandName(o.brand),
    model:smallString(o.model),sku:smallString(o.sku)??smallString(o.productGroupID)});
  }
  const publicationType=names.find(n=>['Article','NewsArticle','Review','TechArticle','BlogPosting','Report'].includes(n));
  if(publicationType&&result.publicationLeads.length<8){
   const date=(x:unknown):string|null=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}.*)?$/.test(x)&&
    Number.isFinite(Date.parse(x))?x.slice(0,32):null;
   result.publicationLeads.push({kind:publicationType,datePublished:date(o.datePublished),dateModified:date(o.dateModified)});
  }
  // Only schema.org graph nesting. Don't recursively traverse arbitrary HTML data.
  if(o['@graph'])read(o['@graph'],depth+1);
  if(o.mainEntity)read(o.mainEntity,depth+1);
  if(o.itemReviewed)read(o.itemReviewed,depth+1);
 };
 for(const [,attrs,raw] of texts){
  if(!/\btype\s*=\s*(["'])application\/ld\+json\1/i.test(attrs)||raw.length>150_000)continue;
  try{read(JSON.parse(raw),0);}catch{ /* malformed publisher metadata is not evidence */ }
 }
 result.declaredTypes.sort();
 result.productLeads.sort((a,b)=>a.name.localeCompare(b.name)||String(a.model).localeCompare(String(b.model)));
 result.publicationLeads.sort((a,b)=>a.kind.localeCompare(b.kind));
 return result;
}
const restrictions=new Set<Restriction222>(['not_reviewed','no_known_restriction','explicitly_prohibited','login_required']);
/** Restricted source policy blocks only *known* prohibitions. Unknown terms are
 * reported as uncertainty, not fictional explicit permission. A commercially
 * deployed TDM system still requires its own jurisdiction/operation review. */
export async function observeDiscoveredPages222(input:{
 run:Run220;registry:Registry220;observedAt:string;
 maxPages?:number;maxPagesPerHost?:number;
 sourceRestrictions?:Readonly<Record<string,Restriction222>>;
 mode?:'live'|'synthetic_fixture';fixtureTransport?:SourceTransport;
}):Promise<Observation222>{
 const mode=input.mode??'live';
 if((mode==='synthetic_fixture'&&!input.fixtureTransport)||(mode==='live'&&input.fixtureTransport))throw Error('phase222_test_transport_boundary');
 if(input.run.schema!=='pee220.run.1'||input.run.rankingAuthorized!==false||
  input.run.independentEvidenceVerified!==false||input.registry.schema!=='pee220.registry.1'||
  !Number.isFinite(Date.parse(input.observedAt)))throw Error('phase222_bad_upstream');
 const maximum=input.maxPages??6,perHost=input.maxPagesPerHost??2;
 if(!Number.isInteger(maximum)||maximum<1||maximum>20||
  !Number.isInteger(perHost)||perHost<1||perHost>5||input.run.candidates.length>500)
  throw Error('phase222_budget_invalid');
 const checks=input.sourceRestrictions??{};
 if(Object.entries(checks).some(([k,v])=>!input.registry.sources.some(s=>s.watch.id===k)||!restrictions.has(v)))throw Error('phase222_bad_restrictions');
 const net:string[]=[],receipts:PageReceipt222[]=[],perHostCount=new Map<string,number>();
 const transport=input.fixtureTransport??restrictedHttpsTransport;
 const seen=new Set<string>();
 for(const lead of input.run.candidates){
  if(receipts.length>=maximum)break;
  const source=input.registry.sources.find(s=>s.watch.id===lead.sourceId);
  let url:URL|null=null;
  try{url=new URL(lead.url);}catch{}
  if(!source||!url||lead.verification!=='unverified_url_only'||
    !safeMetadataUrl75(lead.url,source.watch.host)||!url.pathname.startsWith(source.pathPrefix))continue;
  if(seen.has(url.href))continue;
  seen.add(url.href);
  const used=perHostCount.get(url.hostname)??0;
  if(used>=perHost)continue;
  perHostCount.set(url.hostname,used+1);
  const restriction=checks[source.watch.id]??'not_reviewed';
  const entry:PageReceipt222={sourceId:lead.sourceId,url:url.href,observedAt:input.observedAt,
   status:'blocked',reasonCodes:[],responseSha256:null,byteExact:false,declaredTypes:[],
   productLeads:[],publicationLeads:[],
   structuredDeclarations224:extractTransientClaims224('',url.href),
   transientTestProbe225:probeTransientTestContent225('',url.href),productFacts241:{factCount:0,facts:[]},
   specifications245:{mainProduct:null,factCount:0,ambiguousCount:0,facts:[],abstentions:{}},
   identityNextAction:'blocked',
   scientificEvidenceAdmitted:false,rankingAuthorized:false,noArticleTextStored:true};
  receipts.push(entry);
  // Existing registry prohibitions take precedence over optional caller hints.
  // A caller cannot relabel a previously disallowed site as unrestricted.
  const declaredPolicies=input.registry.policies.filter(p=>p.host===source.watch.host);
  if(declaredPolicies.some(p=>p.basis==='refused'||p.websiteTerms==='reviewed_prohibited'||p.robots==='disallowed')){
   entry.reasonCodes.push('registry_explicit_host_prohibition');continue;
  }
  if(restriction==='explicitly_prohibited'||restriction==='login_required'){
   entry.reasonCodes.push(restriction);continue;
  }
  if(restriction==='not_reviewed')entry.reasonCodes.push('terms_not_reviewed_no_licence_claim');
  const robotsUrl=`https://${url.hostname}/robots.txt`;
  let allowed=false;
  try{
   net.push(robotsUrl);
   const robots=await transport.get(robotsUrl,RESEARCH_AGENT,512000);
   if(robots.finalUrl!==robotsUrl){entry.reasonCodes.push('robots_redirect_unhandled');continue;}
   if(robots.status===404||robots.status===410){allowed=true;entry.reasonCodes.push('robots_absent_4xx_rfc9309');}
   else if(robots.status===200&&/^text\/plain(?:\s*;|\s*$)/i.test(robots.contentType)){
    const decision=robotsDecision(robots.body,url.pathname+url.search);
    if(decision!=='allow'){entry.reasonCodes.push(decision==='deny'?'robots_denied':'robots_ambiguous');continue;}
    allowed=true;
   }else{entry.reasonCodes.push('robots_unavailable_or_unverified');continue;}
  }catch{entry.reasonCodes.push('robots_network_failure');continue;}
  if(!allowed)continue;
  try{
   net.push(url.href);
   const page=await transport.get(url.href,RESEARCH_AGENT,PAGE_MAX_BYTES);
   if(page.status!==200||page.finalUrl!==url.href||!/^text\/html(?:\s*;|\s*$)/i.test(page.contentType)){
    entry.reasonCodes.push('page_status_url_or_type_rejected');continue;
   }
   if(page.body.length>PAGE_MAX_BYTES){entry.reasonCodes.push('page_body_oversize');continue;}
   // Local transient parse. Neither page.body nor page.rawBytes enters a receipt.
   const declared=extractDeclaredPageIdentity222(page.body);
   entry.declaredTypes=declared.declaredTypes;
   entry.productLeads=declared.productLeads;
   entry.publicationLeads=declared.publicationLeads;
   entry.structuredDeclarations224=extractTransientClaims224(page.body,url.href);
   const exact=page.rawBytes&&Buffer.from(page.body,'utf8').equals(Buffer.from(page.rawBytes));
   entry.byteExact=!!exact;
   entry.responseSha256=exact?sha(page.rawBytes!):null;
   entry.transientTestProbe225=probeTransientTestContent225(page.body,url.href,{
    documentSha256:entry.responseSha256,productLeads:declared.productLeads});
   try{
    const facts=htmlToIR241(page.body,lead.sourceId).facts;
    // Page-level metadata facts (JSON-LD) belong to the page's single declared product, if exactly one.
    const pageProduct=declared.productLeads.length===1?declared.productLeads[0].name:null;
    entry.productFacts241={factCount:facts.length,facts:facts.slice(0,120).map(f=>({
     product:f.context.variant??(f.provenance.locator.startsWith('jsonld:')?pageProduct:null),
     property:f.property,value:f.value,method:f.provenance.method,locator:f.provenance.locator}))};
   }catch{entry.reasonCodes.push('product_facts_241_skipped');}
   try{
    const spec=extractSpecifications245(page.body,url.href);
    entry.specifications245={mainProduct:spec.mainProduct,factCount:spec.facts.length,ambiguousCount:spec.ambiguous.length,
     facts:spec.facts.slice(0,150).map(f=>({product:f.product,variant:f.variant,section:f.section,component:f.component,
      property:f.property,value:f.value,rawValue:f.rawValue,method:f.method,locator:f.locator.slice(-160),flags:f.flags})),
     abstentions:spec.abstentions};
   }catch{entry.reasonCodes.push('specifications_245_skipped');}
   const factProducts=entry.productFacts241.facts.some(f=>f.product!==null)||entry.specifications245.facts.some(f=>f.product.ref!=='unknown');
   const populated=declared.productLeads.length>0||declared.publicationLeads.length>0||entry.productFacts241.factCount>0||
    entry.specifications245.factCount>0;
   entry.status=populated?'metadata_observed':'no_structured_identity';
   entry.identityNextAction=declared.productLeads.length||factProducts?'verify_exact_variant':
    declared.publicationLeads.length?'inspect_original_publication':'find_other_source';
   entry.reasonCodes.push(populated?'publisher_metadata_unverified':'no_supported_structured_metadata');
  }catch{entry.reasonCodes.push('page_network_or_parse_failed');}
 }
 return {schema:'pee222.page-observation.v1',mode,requestSha256:input.run.requestSha256,
  sourceDiscoveryRun:'pee220.run.1',networkRequests:net,receipts,
  blockedCount:receipts.filter(x=>x.status==='blocked').length,
  identityLeadCount:receipts.reduce((n,x)=>n+x.productLeads.length+x.publicationLeads.length,0),
  noSourceBodiesStored:true,rankingAuthorized:false,independentEvidenceVerified:false,
  limits:['Publisher-declared JSON-LD is an identity hypothesis, not verified product existence, editorial independence or test results.',
   'HTTPS and robots access is not an all-purpose copyright or commercial text/data-mining licence.',
   'Page HTML is processed in volatile memory and omitted from outputs; no page body or article excerpts are persisted.',
   'Phase224 JSON-LD attributes are unverified publisher claims; they do not prove exact variant, market, independent measurement or suitability.',
   'Phase225 detects only first-person publisher measurement leads; original tests, protocols, reviewers and exact variants remain unauthenticated.',
   'Phase241 product facts are unverified source declarations; comparison-matrix column names are not verified product identities.',
   'Phase245 specifications are unverified source declarations attributed by page structure; table product names and variants are publisher text, not verified identities.',
   'No network search index, live site acquisition, scientific evidence admission or ranking is demonstrated by fixture tests.']};
}
