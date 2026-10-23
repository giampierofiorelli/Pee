/** Phase 82 — source-level discovery scheduling and product launch signal triage.
 * SAFETY: accepts ONLY upstream-cleared metadata, never authorizes crawling,
 * copyright reuse, product scores, production lifecycle transitions or rankings.
 * RSS/Atom/sitemaps can *suggest* changes; they do not constitute consent.
 */
export type WatchChannel =
 'manufacturer_newsroom'|'manufacturer_product_index'|'specialist_editorial'|
 'professional_test_feed'|'industry_event'|'specialist_community'|'retailer_new_models';
export type WatchMechanism = 'rss'|'atom'|'sitemap_delta'|'websub'|'approved_index_delta';
export type WatchTier = 'core'|'secondary'|'exploration';
export interface WatchSource {
 id:string;categoryId:string;host:string;
 channel:WatchChannel;mechanism:WatchMechanism;tier:WatchTier;
 rightsClearedForMetadata:boolean;
 nextCheckAt:string;lastCheckAt:string|null;
 quietChecks:number;errors:number;
 etag?:string;lastModified?:string;
}
export interface MarketWatchPlan {
 selectedSourceIds:readonly string[];
 blockedSourceIds:readonly string[];
 deferredDueSourceIds:readonly string[];
 budgetUsed:number;
 /** Source access is performed by a separate rights-checked reader. */
 actualNetworkRequests:0;
}
const id=(s:unknown):s is string=>typeof s==='string'&&/^[a-z0-9][a-z0-9_.:-]{0,127}$/.test(s);
const date=(s:unknown):s is string=>typeof s==='string'&&Number.isFinite(Date.parse(s));
function verifyWatch(w:WatchSource) {
 if(!w||!id(w.id)||!id(w.categoryId)||typeof w.host!=='string'||
 !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(w.host)||w.host.length>240||
 !['manufacturer_newsroom','manufacturer_product_index','specialist_editorial','professional_test_feed',
    'industry_event','specialist_community','retailer_new_models'].includes(w.channel)||
 !['rss','atom','sitemap_delta','websub','approved_index_delta'].includes(w.mechanism)||
 !['core','secondary','exploration'].includes(w.tier)||
 typeof w.rightsClearedForMetadata!=='boolean'||!date(w.nextCheckAt)||
 (w.lastCheckAt!==null&&!date(w.lastCheckAt))||!Number.isInteger(w.quietChecks)||w.quietChecks<0||w.quietChecks>100000||
 !Number.isInteger(w.errors)||w.errors<0||w.errors>100000||
 (w.etag!==undefined&&(typeof w.etag!=='string'||w.etag.length>200||/[\r\n]/.test(w.etag)))||
 (w.lastModified!==undefined&&(typeof w.lastModified!=='string'||w.lastModified.length>120||/[\r\n]/.test(w.lastModified))))
  throw Error('Invalid watch source');
}
export function planMarketWatch(input:{asOf:string;maxChecks:number;maxChecksPerHost:number;sources:readonly WatchSource[]}):MarketWatchPlan{
 if(!input||!date(input.asOf)||!Number.isInteger(input.maxChecks)||input.maxChecks<0||input.maxChecks>300||
 !Number.isInteger(input.maxChecksPerHost)||input.maxChecksPerHost<1||input.maxChecksPerHost>20||
 !Array.isArray(input.sources)||input.sources.length>10000||new Set(input.sources.map(s=>s.id)).size!==input.sources.length)
 throw Error('Invalid watch planning request');
 input.sources.forEach(verifyWatch);
 const blocked=input.sources.filter(s=>!s.rightsClearedForMetadata).map(s=>s.id);
 const due:WatchSource[]=[...input.sources].filter(s=>s.rightsClearedForMetadata&&Date.parse(s.nextCheckAt)<=Date.parse(input.asOf));
 const tier:Record<WatchTier,number>={core:3,secondary:2,exploration:1};
 const channel:Record<WatchChannel,number>={professional_test_feed:7,manufacturer_newsroom:6,manufacturer_product_index:5,
 specialist_editorial:4,industry_event:3,specialist_community:2,retailer_new_models:1};
 // Failures and quiet sources retain coverage, but become cheaper to postpone.
 due.sort((a:WatchSource,b:WatchSource)=>tier[b.tier]-tier[a.tier]||channel[b.channel]-channel[a.channel]||
 a.errors-b.errors||a.quietChecks-b.quietChecks||a.id.localeCompare(b.id));
 const selected:WatchSource[]=[];const byHost=new Map<string,number>();
 const take=(s:WatchSource)=>{
  if(selected.length>=input.maxChecks||(byHost.get(s.host)??0)>=input.maxChecksPerHost)return false;
  selected.push(s);byHost.set(s.host,(byHost.get(s.host)??0)+1);return true;
 };
 // Reserve a *small* discovery slot if due exploration coverage exists and the budget permits.
 // Prevents an entrenched brand watchlist from making smaller manufacturers invisible.
 if(input.maxChecks>=5){
  const exploration=due.find(s=>s.tier==='exploration');
  if(exploration)take(exploration);
 }
 for(const s of due)if(!selected.includes(s))take(s);
 const selectedIds=new Set(selected.map(s=>s.id));
 return {selectedSourceIds:selected.map(s=>s.id),blockedSourceIds:blocked,
  deferredDueSourceIds:due.filter(s=>!selectedIds.has(s.id)).map(s=>s.id),
  budgetUsed:selected.length,actualNetworkRequests:0};
}
/** Source cadence is CONFIGURATION/HEURISTIC, not measured or guaranteed detection latency.
 * 304/unchanged does not mean a product doesn't exist. Never chase failed hosts faster.
 */
export function nextMarketWatch(input:{source:WatchSource;checkedAt:string;outcome:'changed'|'unchanged'|'error'|'rate_limited';
 etag?:string;lastModified?:string}):WatchSource {
 const {source,checkedAt,outcome}=input;verifyWatch(source);
 if(!date(checkedAt)||!['changed','unchanged','error','rate_limited'].includes(outcome)||
 (source.lastCheckAt!==null&&Date.parse(checkedAt)<Date.parse(source.lastCheckAt))||
 (input.etag!==undefined&&(input.etag.length>200||/[\r\n]/.test(input.etag)))||
 (input.lastModified!==undefined&&(input.lastModified.length>120||/[\r\n]/.test(input.lastModified))))
 throw Error('Invalid watch outcome');
 const quiet=outcome==='changed'?0:outcome==='unchanged'?Math.min(100000,source.quietChecks+1):source.quietChecks;
 const errors=outcome==='error'||outcome==='rate_limited'?Math.min(100000,source.errors+1):0;
 const startingHours=source.tier==='core'?24:source.tier==='secondary'?72:168;
 const normalHours=outcome==='changed'?startingHours:startingHours*Math.min(8,2**Math.min(3,quiet));
 const intervalHours=outcome==='rate_limited'?Math.max(72,Math.min(720,24*2**Math.min(5,errors))):
 outcome==='error'?Math.max(24,Math.min(720,24*2**Math.min(5,errors))):Math.min(720,normalHours);
 return {...source,lastCheckAt:checkedAt,quietChecks:quiet,errors,
  nextCheckAt:new Date(Date.parse(checkedAt)+intervalHours*3600000).toISOString(),
  ...(input.etag!==undefined?{etag:input.etag}:{}),
  ...(input.lastModified!==undefined?{lastModified:input.lastModified}:{})};
}
export type MarketSignalKind =
 'manufacturer_announcement'|'manufacturer_catalog_addition'|'independent_professional_review'|
 'independent_original_test'|'industry_event_mention'|'community_tip'|'retailer_model_listing'|
 'manufacturer_discontinuation_notice';
export interface MarketSignal {
 sourceId:string;originalWorkId:string;publisherId:string;productId:string;categoryId:string;
 kind:MarketSignalKind;
 /** All signals are pre-qualified for discovery metadata only. */
 lawfulMetadata:boolean;publisherIdentityVerified:boolean;productIdentityConfirmed:boolean;
 publishedAt:string;
}
export interface KnownProductState {
 productId:string;categoryId:string;known:boolean;permanentlyDiscontinued:boolean;
}
export interface MarketSignalTriage {
 candidates:readonly {productId:string;categoryId:string;
 action:'verify_identity'|'verify_official_discontinuation'|'collect_official_specs'|
  'review_independent_evidence'|'retain_discovery_stub'|'already_archived';
  priority:'high'|'standard'|'exploratory'|'none';
  sources:number;distinctOriginalWorks:number;
  candidateNotRecommendation:true; rankingAuthorized:false; manufacturingRetirementAuthorized:false;
  missingCategoryResearch:boolean;}[];
 rejectedSignalCount:number;
 deduplicatedReprints:number;
}
export function triageMarketSignals(input:{signals:readonly MarketSignal[];knownProducts:readonly KnownProductState[];
 knownCategoryIds:readonly string[]}):MarketSignalTriage{
 if(!input||!Array.isArray(input.signals)||input.signals.length>5000||!Array.isArray(input.knownProducts)||
 input.knownProducts.length>5000||!Array.isArray(input.knownCategoryIds)||input.knownCategoryIds.length>1000||
 !input.knownCategoryIds.every(id)||new Set(input.knownCategoryIds).size!==input.knownCategoryIds.length||
 input.knownProducts.some(x=>!x||!id(x.productId)||!id(x.categoryId)||
 typeof x.known!=='boolean'||typeof x.permanentlyDiscontinued!=='boolean')||
 new Set(input.knownProducts.map(x=>x.productId)).size!==input.knownProducts.length)
 throw Error('Invalid signals');
 const validKinds=['manufacturer_announcement','manufacturer_catalog_addition','independent_professional_review',
  'independent_original_test','industry_event_mention','community_tip','retailer_model_listing','manufacturer_discontinuation_notice'];
 for(const s of input.signals)if(!s||![s.sourceId,s.originalWorkId,s.publisherId,s.productId,s.categoryId].every(id)||
  !validKinds.includes(s.kind)||!date(s.publishedAt)||typeof s.lawfulMetadata!=='boolean'||
  typeof s.publisherIdentityVerified!=='boolean'||typeof s.productIdentityConfirmed!=='boolean')throw Error('Invalid signal');
 const trusted=input.signals.filter(s=>s.lawfulMetadata&&s.publisherIdentityVerified);
 const groups=new Map<string,MarketSignal[]>();
 for(const s of trusted){const key=`${s.productId}/${s.categoryId}`;groups.set(key,[...(groups.get(key)??[]),s]);}
 const known=new Map(input.knownProducts.map(p=>[p.productId,p]));
 const candidates:MarketSignalTriage['candidates'][number][]=[];
 let reprints=0;
 for(const [,g] of groups){
  // A press release republished by ten outlets remains ONE original announcement.
  const originals=new Map<string,MarketSignal>();
  for(const s of g){
   const key=`${s.originalWorkId}/${s.kind}`;
   if(originals.has(key)){reprints++;continue;}
   originals.set(key,s);
  }
  const distinct=[...originals.values()];const x=g[0];const state=known.get(x.productId);
  const has=(...types:MarketSignalKind[])=>distinct.some(s=>types.includes(s.kind));
  const verifiedIdentity=distinct.some(s=>s.productIdentityConfirmed);
  let action:MarketSignalTriage['candidates'][number]['action'];
  let priority:MarketSignalTriage['candidates'][number]['priority']='exploratory';
  if(state?.permanentlyDiscontinued){action='already_archived';priority='none';}
  else if(has('manufacturer_discontinuation_notice')){
   // A news signal, even first-party, only triggers a separate authenticated notice check.
   action='verify_official_discontinuation';priority='high';
  }else if(!verifiedIdentity){action='verify_identity';priority='standard';}
  else if(has('independent_professional_review','independent_original_test')){
   action='review_independent_evidence';priority='high';
  }else if(has('manufacturer_announcement','manufacturer_catalog_addition')){
   action='collect_official_specs';priority='standard';
  }else{action='retain_discovery_stub';priority='exploratory';}
  candidates.push({productId:x.productId,categoryId:x.categoryId,action,priority,
    sources:new Set(g.map(s=>s.sourceId)).size,distinctOriginalWorks:distinct.length,
    candidateNotRecommendation:true,rankingAuthorized:false,manufacturingRetirementAuthorized:false,
    missingCategoryResearch:!input.knownCategoryIds.includes(x.categoryId)});
 }
 const order={high:3,standard:2,exploratory:1,none:0};
 candidates.sort((a,b)=>order[b.priority]-order[a.priority]||a.productId.localeCompare(b.productId));
 return {candidates,rejectedSignalCount:input.signals.length-trusted.length,deduplicatedReprints:reprints};
}
