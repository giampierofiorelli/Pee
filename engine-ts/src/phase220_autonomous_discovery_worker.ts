/** Phase220 operational vertical slice, not a public recommendation service.
 * Runs an English request through a configurable intent vocabulary and the
 * EXISTING phase82 scheduler + phase75 lawful sitemap reader.
 * No commercial search APIs, model weights, browser or new crawler.
 * A source registry represents independently reviewed OPERATOR decisions;
 * user input, website claims and mere JSON fields cannot grant access.
 * Discovered URLs are unverified leads, never product identities or scores.
 */
import {createHash} from 'node:crypto';
import {proposeWebIntake177} from './phase177_web_intake.js';
import {planMarketWatch,nextMarketWatch,type WatchSource} from './phase82_market_watch.js';
import {discoverFromApprovedSitemap,approvedMetadataDiscovery75,safeMetadataUrl75} from './phase75_source_discovery.js';
import {discoverFromApprovedFeed221} from './phase221_authorized_feed_discovery.js';
import {publicMetadataDiscoveryGate223} from './phase223_public_metadata_access.js';
import {restrictedHttpsTransport,type SourceTransport} from './approved_web_reader.js';
import type {WebSourcePolicy} from './web_evidence_acquisition.js';

const sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const boundedId=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_]{1,90}$/.test(s);
const clean=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'')
 .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const has=(text:string,phrase:string)=>(' '+text+' ').includes(' '+clean(phrase)+' ');
export interface Vocabulary220 {
 categoryId:string;displayName:string;aliases:readonly string[];
 /** Configurable category needs: user can correct/confirm each hypothesis. */
 essentialSlots:readonly {id:string;question:string;values:readonly {id:string;aliases:readonly string[]}[];
  ambiguousTerms?:readonly string[]}[];
}
export interface Source220 {
 watch:WatchSource;
 /** Path restrictions are source-specific, never inferred as permissions. */
 sitemapPath:string;pathPrefix:string;
 /** Feed path for rss/atom mechanisms. Kept separate for backward compatibility. */
 feedPath?:string;
 /** Explicit bounded public-metadata mode. This does not assert a reuse licence.
  * The Phase82 enabled flag still applies, and any known prohibition blocks. */
 discoveryAccess?:'legacy_reviewed'|'public_metadata';
}
export interface Registry220 {
 schema:'pee220.registry.1';vocabulary:readonly Vocabulary220[];
 sources:readonly Source220[];policies:readonly WebSourcePolicy[];
 /** This is NOT proof of a legal licence. Such proof must be reviewed independently. */
}
export interface Observation220 {
 categoryId:string;sourceId:string;checkedAt:string;status:'candidate_urls_found'|'nothing_relevant'|'blocked';
 urls:readonly string[];sitemapSha256:string|null;feedSha256?:string|null;byteExact:boolean;
 /** URLs and digest only, not article/feed text. */
 mechanism?:WatchSource['mechanism'];discoveryPath?:string;
}
export interface Checkpoint220 {
 schema:'pee220.checkpoint.1';observations:readonly Observation220[];
 watchSources:readonly WatchSource[];
 evidenceReceipts:readonly never[];rankingAuthorized:false;
}
export function emptyCheckpoint220():Checkpoint220 {
 return {schema:'pee220.checkpoint.1',observations:[],watchSources:[],evidenceReceipts:[],rankingAuthorized:false};
}
export interface Intent220 {
 status:'needs_category'|'needs_clarification'|'bounded_category_hypothesis';
 categoryId:string|null;slotValues:Readonly<Record<string,string>>;
 clarification:string|null;key:string|null;confirmedByUser:false;
}
export function interpretForDiscovery220(question:string,vocabulary:readonly Vocabulary220[]):Intent220 {
 if(typeof question!=='string'||question.length>2000||question.trim().length<5||
  !Array.isArray(vocabulary)||vocabulary.length>100)throw Error('phase220_invalid_question');
 const q=clean(question);
 const categories=vocabulary.filter(c=>c.aliases.some((a:string)=>has(q,a)));
 const missing={status:'needs_category' as const,categoryId:null,slotValues:{},
  clarification:'What type of product are you looking for?',key:null,confirmedByUser:false as const};
 if(categories.length!==1)return categories.length>1?{...missing,
  clarification:'Which product category is your request about?'}:missing;
 const category=categories[0];const values:Record<string,string>={};
 for(const slot of category.essentialSlots){
  const matches=slot.values.filter((v:{id:string;aliases:readonly string[]})=>v.aliases.some((a:string)=>has(q,a)));
  const ambiguous=(slot.ambiguousTerms??[]).some((term:string)=>has(q,term));
  if(matches.length!==1||ambiguous&&matches.length===0) {
   return {status:'needs_clarification',categoryId:category.categoryId,slotValues:values,
    clarification:slot.question,key:null,confirmedByUser:false};
  }
  values[slot.id]=matches[0].id;
 }
 const key=sha(JSON.stringify([category.categoryId,Object.entries(values).sort(([a],[b])=>a.localeCompare(b))]));
 return {status:'bounded_category_hypothesis',categoryId:category.categoryId,slotValues:values,
  clarification:null,key,confirmedByUser:false};
}
function validateRegistry(input:Registry220):void {
 if(input?.schema!=='pee220.registry.1'||!Array.isArray(input.vocabulary)||
  !Array.isArray(input.sources)||!Array.isArray(input.policies)||
  input.vocabulary.length>100||input.sources.length>500||input.policies.length>500||
  new Set(input.vocabulary.map(x=>x.categoryId)).size!==input.vocabulary.length||
  new Set(input.sources.map(x=>x.watch.id)).size!==input.sources.length)throw Error('phase220_invalid_registry');
 for(const c of input.vocabulary){
  if(!boundedId(c.categoryId)||!c.displayName||c.displayName.length>100||
   !Array.isArray(c.aliases)||!c.aliases.length||c.aliases.length>40||
   c.aliases.some((a:string)=>typeof a!=='string'||clean(a).length<3||clean(a).length>90)||
   !Array.isArray(c.essentialSlots)||c.essentialSlots.length>20)throw Error('phase220_bad_vocabulary');
  for(const s of c.essentialSlots){
   if(!boundedId(s.id)||!s.question||s.question.length>250||
    !Array.isArray(s.values)||s.values.length>30||
    new Set(s.values.map((x:{id:string})=>x.id)).size!==s.values.length||
    s.values.some((v:{id:string;aliases:readonly string[]})=>!boundedId(v.id)||!v.aliases?.length||v.aliases.length>25||
     v.aliases.some((a:string)=>typeof a!=='string'||clean(a).length<2)))throw Error('phase220_bad_slot');
  }
 }
 for(const s of input.sources){
  if(s.discoveryAccess!==undefined&&!['legacy_reviewed','public_metadata'].includes(s.discoveryAccess)||
   !boundedId(s.watch.id.replaceAll('-','_'))||
   !input.vocabulary.some(v=>v.categoryId===s.watch.categoryId)||
   !/^\/[a-zA-Z0-9._~/-]{0,180}$/.test(s.sitemapPath)||
   !/^\/[a-zA-Z0-9._~/-]{0,180}$/.test(s.pathPrefix)||
   (['rss','atom'].includes(s.watch.mechanism)&&!s.feedPath)||
   (s.feedPath!==undefined&&!/^\/[a-zA-Z0-9._~/-]{0,180}$/.test(s.feedPath)))throw Error('phase220_bad_source');
 }
}
export interface Run220 {
 schema:'pee220.run.1';mode:'live'|'synthetic_fixture';
 requestSha256:string;intent:Intent220;localIntake:{suggestionCount:number;unresolvedIssues:number};
 decision:'clarification_needed'|'awaiting_authorized_sources'|'candidate_discovery_attempted'|
  'cached_candidates_pending_identity_and_evidence'|'nothing_discovered';
 /** Actual URLs passed to network transport, not unsent search-keyword proposals. */
 networkRequests:readonly string[];plannedSourceIds:readonly string[];
 sourceOutcomes:readonly {sourceId:string;status:Observation220['status'];urlCount:number;
  sitemapSha256:string|null;feedSha256?:string|null;byteExact:boolean;reasonCodes:readonly string[]}[];
 candidates:readonly {sourceId:string;url:string;verification:'unverified_url_only'}[];
 limitations:readonly string[];rankingAuthorized:false;independentEvidenceVerified:false;
 checkpoint:Checkpoint220;
}
/** No production transport injection. Fixture transport can ONLY be used in clearly
 * labelled synthetic mode. A CLI may never accept an arbitrary transport module. */
export async function runAutonomousDiscovery220(args:{question:string;asOf:string;
 registry:Registry220;checkpoint?:Checkpoint220;maxChecks?:number;maxCandidatesPerSource?:number;
 mode?:'live'|'synthetic_fixture';fixtureTransport?:SourceTransport;}):Promise<Run220>{
 validateRegistry(args.registry);
 if(!Number.isFinite(Date.parse(args.asOf))||!/^\d{4}-\d{2}-\d{2}T/.test(args.asOf))throw Error('phase220_bad_clock');
 const mode=args.mode??'live';
 if((args.fixtureTransport&&mode!=='synthetic_fixture')||(mode==='synthetic_fixture'&&!args.fixtureTransport))
  throw Error('phase220_test_transport_boundary');
 const maximum=args.maxChecks??3,perSource=args.maxCandidatesPerSource??20;
 if(!Number.isInteger(maximum)||maximum<1||maximum>10||
  !Number.isInteger(perSource)||perSource<1||perSource>100)throw Error('phase220_invalid_budget');
 const old=args.checkpoint??emptyCheckpoint220();
 if(old.schema!=='pee220.checkpoint.1'||old.rankingAuthorized!==false||
  old.evidenceReceipts.length!==0||old.observations.length>10000||old.watchSources.length>500)
  throw Error('phase220_bad_checkpoint');
 const intent=interpretForDiscovery220(args.question,args.registry.vocabulary);
 const intake=proposeWebIntake177(args.question);
 // Stored checkpoint state is untrusted: take *only* scheduling state from it,
 // never host/category, mechanism, tier or permission from an earlier run.
 const watches=args.registry.sources.map(s=>{
  const prev=old.watchSources.find(w=>w.id===s.watch.id);
  return prev&&prev.host===s.watch.host&&prev.categoryId===s.watch.categoryId&&
   prev.mechanism===s.watch.mechanism?{
   ...s.watch,nextCheckAt:prev.nextCheckAt,lastCheckAt:prev.lastCheckAt,
   quietChecks:prev.quietChecks,errors:prev.errors}:s.watch;
 });
 const networkRequests:string[]=[],outcomes:Run220['sourceOutcomes'][number][]=[],
  selectedIds:string[]=[],candidates:Run220['candidates'][number][]=[];
 const notes:string[]=['Discovery URLs do not establish product existence, exact variant, test originality or performance.',
  'Phase193 screening/Phases196-219 evidence admission and independent ranking remain separate gates.'];
 let updated=watches;
 let decision:Run220['decision']='clarification_needed';
 if(intent.status==='bounded_category_hypothesis'){
  const sources=args.registry.sources.filter(s=>s.watch.categoryId===intent.categoryId);
  const matching=(o:Observation220,s:Source220)=>o.sourceId===s.watch.id&&
   o.categoryId===s.watch.categoryId&&o.mechanism===s.watch.mechanism&&
   o.discoveryPath===(s.watch.mechanism==='sitemap_delta'?s.sitemapPath:s.feedPath);
  const latest=[...old.observations].reverse().filter(x=>x.categoryId===intent.categoryId);
  // A recent previously attempted discovery can avoid redundant recrawling.
  // This does not mean evidentiary sufficiency, or validate the old robots/rights.
  const pending=sources.filter(s=>{
   const previous=latest.find(o=>matching(o,s));
   if(!previous)return true;
   // Respect Phase82 backoff/cadence for success AND errors; no forced daily crawling.
   const state=updated.find(w=>w.id===s.watch.id);
   return !!state&&Date.parse(state.nextCheckAt)<=Date.parse(args.asOf);
  });
  const due=updated.filter(w=>pending.some(s=>s.watch.id===w.id)).map(w=>({
   ...w,nextCheckAt:args.asOf}));
  const watchPlan=planMarketWatch({asOf:args.asOf,maxChecks:maximum,
   maxChecksPerHost:2,sources:due.filter(w=>w.categoryId===intent.categoryId)});
  selectedIds.push(...watchPlan.selectedSourceIds);
  if(sources.length===0)notes.push('No operator-registered sources for this category. No general web index is connected.');
  if(watchPlan.blockedSourceIds.length)notes.push('Source watch metadata permission is not cleared.');
  // Words that steer which in-scope URLs are read first: category names plus recognised need values.
  const category=args.registry.vocabulary.find(v=>v.categoryId===intent.categoryId)!;
  const relevanceTerms=[category.displayName,...category.aliases,...category.essentialSlots.flatMap(slot=>
   slot.values.filter(v=>intent.slotValues[slot.id]===v.id).flatMap(v=>v.aliases))];
  for(const sourceId of selectedIds){
   const s=sources.find(s=>s.watch.id===sourceId)!;
   const policy=args.registry.policies.find(p=>p.sourceId===sourceId&&p.host===s.watch.host);
   const previous=latest.find(o=>matching(o,s));
   const transportFailures:string[]=[];
   let receipt:{hash:string|null;byteExact:boolean}={hash:null,byteExact:false};
   const transport:SourceTransport={get:async(url,agent,cap)=>{
    networkRequests.push(url);
    let result;
    try{result=await (args.fixtureTransport??restrictedHttpsTransport).get(url,agent,cap);}
    catch(e){
     const code=typeof e==='object'&&e!==null&&'code' in e&&typeof e.code==='string'?e.code:'unknown';
     transportFailures.push('transport_failure_'+(/^[A-Z0-9_]{2,32}$/.test(code)?code.toLowerCase():'unknown'));
     throw e;
    }
    if((url===`https://${s.watch.host}${s.sitemapPath}`&&s.watch.mechanism==='sitemap_delta'||
      url===`https://${s.watch.host}${s.feedPath}`&&['rss','atom'].includes(s.watch.mechanism))&&
      result.rawBytes&&Buffer.from(result.body,'utf8').equals(Buffer.from(result.rawBytes))){
     receipt={hash:sha(result.rawBytes),byteExact:true};
    }
    return result;
   }};
   // source identity/rights are independently supplied by reviewed registry.
   // Deliberately no auto-generation of permission objects from available URLs.
   const response=policy&&s.watch.mechanism==='sitemap_delta'?await discoverFromApprovedSitemap({policy,asOf:args.asOf,
    sitemapPath:s.sitemapPath,requirePathPrefix:s.pathPrefix,
    maxCandidates:perSource,transport,accessMode:s.discoveryAccess,relevanceTerms}):null;
   const feedResponse=policy&&(s.watch.mechanism==='rss'||s.watch.mechanism==='atom')&&s.feedPath?
    await discoverFromApprovedFeed221({policy,asOf:args.asOf,
     feedKind:s.watch.mechanism,feedPath:s.feedPath,requirePathPrefix:s.pathPrefix,
     maxCandidates:perSource,transport,accessMode:s.discoveryAccess,relevanceTerms}):null;
   const status=response?.status??feedResponse?.status??'blocked';
   const urls=response?.urls.map(u=>u.url)??feedResponse?.urls??[];
   const oldHash=s.watch.mechanism==='sitemap_delta'?previous?.sitemapSha256:previous?.feedSha256;
   const changed=receipt.hash!==null&&oldHash!==null&&receipt.hash!==oldHash;
   const watchResult=status==='blocked'?'error':changed||urls.some(u=>!previous?.urls.includes(u))?'changed':'unchanged';
   updated=updated.map(w=>w.id!==sourceId?w:nextMarketWatch({source:w,
    checkedAt:args.asOf,outcome:watchResult}));
   const observation:Observation220={categoryId:intent.categoryId!,sourceId,checkedAt:args.asOf,
    status,urls,sitemapSha256:s.watch.mechanism==='sitemap_delta'?receipt.hash:null,
    ...(s.watch.mechanism==='rss'||s.watch.mechanism==='atom'?{feedSha256:receipt.hash}:{}),
    byteExact:receipt.byteExact,mechanism:s.watch.mechanism,
    discoveryPath:s.watch.mechanism==='sitemap_delta'?s.sitemapPath:s.feedPath};
   outcomes.push({sourceId,status,urlCount:urls.length,
    sitemapSha256:s.watch.mechanism==='sitemap_delta'?receipt.hash:null,
    ...(s.watch.mechanism==='rss'||s.watch.mechanism==='atom'?{feedSha256:receipt.hash}:{}),
    byteExact:receipt.byteExact,reasonCodes:[...(response?.reasons??feedResponse?.reasons??[!['sitemap_delta','rss','atom'].includes(s.watch.mechanism)?'mechanism_worker_unavailable':'missing_operator_source_policy']),...transportFailures]});
   for(const url of urls)candidates.push({sourceId,url,verification:'unverified_url_only'});
   latest.unshift(observation);
  }
  // Reuse earlier URL leads without silently assuming unchanged page/content/permissions.
  for(const o of old.observations.filter(o=>o.categoryId===intent.categoryId)){
   if(Date.parse(args.asOf)-Date.parse(o.checkedAt)>24*3600000||o.status==='blocked')continue;
   const source=sources.find(s=>s.watch.id===o.sourceId);
   const permission=args.registry.policies.find(p=>p.sourceId===o.sourceId&&p.host===source?.watch.host);
   if(!source||!matching(o,source)||!source.watch.rightsClearedForMetadata||
    !(source.discoveryAccess==='public_metadata'?publicMetadataDiscoveryGate223(permission,args.asOf):
      approvedMetadataDiscovery75(permission,args.asOf)))continue;
   if(selectedIds.includes(o.sourceId))continue;
   // Local checkpoint is not cryptographically authenticated; never accept
   // injected cross-host, off-scope or non-HTTPS cached discovery URLs.
   for(const url of o.urls){
    let safe=false;
    try{const parsed=new URL(url);safe=safeMetadataUrl75(url,source.watch.host)&&
     parsed.pathname.startsWith(source.pathPrefix);}
    catch{};
    if(safe)candidates.push({sourceId:o.sourceId,url,verification:'unverified_url_only'});
   }
  }
  decision=selectedIds.length?'candidate_discovery_attempted':
   candidates.length?'cached_candidates_pending_identity_and_evidence':
   sources.length?'nothing_discovered':'awaiting_authorized_sources';
 }else notes.push(intent.clarification??'Further user context is required.');
 const unique=new Map(candidates.map(c=>[c.sourceId+'|'+c.url,c]));
 const observations=[...old.observations,...outcomes.map(o=>{
  const recent=[...old.observations].reverse().find(x=>x.sourceId===o.sourceId);
  const observed=selectedIds.includes(o.sourceId)?{
   categoryId:intent.categoryId!,sourceId:o.sourceId,checkedAt:args.asOf,status:o.status,
   urls:[...unique.values()].filter(c=>c.sourceId===o.sourceId).map(c=>c.url),
   sitemapSha256:o.sitemapSha256,feedSha256:o.feedSha256,byteExact:o.byteExact,
   mechanism:args.registry.sources.find(s=>s.watch.id===o.sourceId)?.watch.mechanism,
   discoveryPath:(()=>{const s=args.registry.sources.find(s=>s.watch.id===o.sourceId);
    return s?.watch.mechanism==='sitemap_delta'?s.sitemapPath:s?.feedPath;})()}:recent;
  return observed!;
 })].slice(-10000);
 const checkpoint:Checkpoint220={schema:'pee220.checkpoint.1',observations,
  watchSources:updated,evidenceReceipts:[],rankingAuthorized:false};
 return {schema:'pee220.run.1',mode,requestSha256:sha(args.question),intent,
  localIntake:{suggestionCount:intake.suggestions.length,unresolvedIssues:intake.unresolvedIssues.length},
  decision,networkRequests,plannedSourceIds:selectedIds,
  sourceOutcomes:outcomes,
  // Deterministic discovery order (request-term priority, then publisher order) is kept, so the
  // page observer reads the most request-related leads first instead of alphabetical ones.
  candidates:[...unique.values()],
  limitations:notes,rankingAuthorized:false,independentEvidenceVerified:false,checkpoint};
}
