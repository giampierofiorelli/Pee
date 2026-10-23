/** Phase223: optional, replaceable HTTPS JSON search discovery.
 * The index is an operator-configured SearXNG instance. Its results are leads,
 * never independent evidence, source permissions, endorsements or rankings.
 * No snippets, titles, page bodies or search-response JSON are persisted.
 * The live transport is always the Phase69 pinned-DNS SSRF-resistant reader.
 */
import {createHash} from 'node:crypto';
import {RESEARCH_AGENT,restrictedHttpsTransport,type SourceTransport} from './approved_web_reader.js';
import {publicRobotsDecision223} from './phase223_public_metadata_access.js';
import {safeMetadataUrl75} from './phase75_source_discovery.js';
import {interpretForDiscovery220,type Registry220} from './phase220_autonomous_discovery_worker.js';
import {observeDiscoveredPages222,type Observation222} from './phase222_transient_public_page_observer.js';
import type {Run220,Registry220 as Registry} from './phase220_autonomous_discovery_worker.js';
const sha=(s:string|Uint8Array)=>createHash('sha256').update(s).digest('hex');
const safeHost=(url:string)=>{try{const u=new URL(url);return safeMetadataUrl75(url,u.hostname);}catch{return false;}};
export interface SearchConfig223 {schema:'pee223.search-config.1';provider:'searxng';
 /** Public HTTPS endpoint only. Local/private hosts need a dedicated separate IPC transport. */
 endpoint:string;enabled:boolean;maxQueries:number;maxResults:number;
 /** An operator has checked their right to use THIS search service/API;
  * not a licence to copy every page returned by it. */
 serviceAccessReviewed:boolean;
 /** Phase262: search-result language filter sent to the provider ("en" when absent, as before; "all" for none).
  * It filters what the provider returns; it says nothing about PEE's ability to understand those documents. */
 language?:string;
}
/** Phase262: a bounded, already-planned query set (from planSearchQueries223 or a typed research-job planner). */
export interface PlannedSearch223 {key:string|null;status:string;queries:string[]}
export interface SearchRun223 {schema:'pee223.search.v1';mode:'live'|'synthetic_fixture';
 intentKey:string|null;intentStatus:string;queries:readonly string[];
 networkRequests:readonly string[];candidates:readonly {url:string;sourceId:string;verification:'unverified_url_only';/** Phase262: index of the first query that returned it. */queryIndex?:number}[];
 responseDigests:readonly string[];reasonCodes:readonly string[];
 noSnippetsOrPageBodiesStored:true;rankingAuthorized:false;independentEvidenceVerified:false;
}
const norm=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const isEndpoint=(s:string)=>{try{const u=new URL(s);return safeHost(s)&&u.pathname==='/search'&&!u.search&&!u.hash;}catch{return false;}};
export function planSearchQueries223(question:string,registry:Registry220):{key:string|null;status:string;queries:string[]}{
 const intent=interpretForDiscovery220(question,registry.vocabulary);
 if(intent.status!=='bounded_category_hypothesis')return {key:null,status:intent.status,queries:[]};
 const c=registry.vocabulary.find(v=>v.categoryId===intent.categoryId)!;
 const parts=Object.entries(intent.slotValues).sort(([a],[b])=>a.localeCompare(b)).map(([slot,id])=>{
  const s=c.essentialSlots.find(s=>s.id===slot);const v=s?.values.find(v=>v.id===id);
  // Use the configured canonical category vocabulary, not raw user phrasing.
  return v?.aliases[0]??id.replace(/_/g,' ');
 });
 const base=norm([c.displayName,...parts].join(' ')).slice(0,140);
 return {key:intent.key,status:intent.status,queries:[base+' independent product review tests',base+' manufacturer model specifications']};
}
export async function searchCandidateUrls223(input:{question:string;registry:Registry220;config:SearchConfig223;
 mode?:'live'|'synthetic_fixture';fixtureTransport?:SourceTransport;}):Promise<SearchRun223>{
 checkSearchInput223(input);
 return searchWithPlan223({plan:planSearchQueries223(input.question,input.registry),config:input.config,mode:input.mode,fixtureTransport:input.fixtureTransport});
}
function checkSearchInput223(input:{config:SearchConfig223;mode?:'live'|'synthetic_fixture';fixtureTransport?:SourceTransport}):void{
 const mode=input.mode??'live';
 if((mode==='live'&&input.fixtureTransport)||(mode==='synthetic_fixture'&&!input.fixtureTransport))throw Error('phase223_transport_boundary');
 const cfg=input.config;
 if(cfg?.schema!=='pee223.search-config.1'||cfg.provider!=='searxng'||!isEndpoint(cfg.endpoint)||
  !Number.isInteger(cfg.maxQueries)||cfg.maxQueries<1||cfg.maxQueries>3||
  !Number.isInteger(cfg.maxResults)||cfg.maxResults<1||cfg.maxResults>30||
  typeof cfg.enabled!=='boolean'||typeof cfg.serviceAccessReviewed!=='boolean'||
  (cfg.language!==undefined&&(typeof cfg.language!=='string'||!/^(?:all|[a-z]{2,3}(?:-[A-Z]{2})?)$/.test(cfg.language))))throw Error('phase223_bad_search_config');
}
/** Phase262: the same bounded search, robots check, JSON parsing and URL safety as searchCandidateUrls223, for a
 * query set planned elsewhere (e.g. from a typed research job). Each lead records the first query that returned it. */
export async function searchWithPlan223(input:{plan:PlannedSearch223;config:SearchConfig223;
 mode?:'live'|'synthetic_fixture';fixtureTransport?:SourceTransport;}):Promise<SearchRun223>{
 checkSearchInput223(input);
 const mode=input.mode??'live';const cfg=input.config;const plan=input.plan;
 if(!plan||!Array.isArray(plan.queries)||plan.queries.length>3||plan.queries.some(q=>typeof q!=='string'||norm(q)!==q||!q||q.length>200)||
  (plan.key!==null&&typeof plan.key!=='string')||typeof plan.status!=='string')throw Error('phase223_bad_search_plan');
 const net:string[]=[],reasons:string[]=[],digests:string[]=[],leads:SearchRun223['candidates'][number][]=[];
 const output=(queries:string[]):SearchRun223=>({schema:'pee223.search.v1',mode,intentKey:plan.key,
  intentStatus:plan.status,queries,networkRequests:net,candidates:leads,
  responseDigests:digests,reasonCodes:reasons,noSnippetsOrPageBodiesStored:true,
  rankingAuthorized:false,independentEvidenceVerified:false});
 if(!cfg.enabled){reasons.push('search_provider_disabled');return output([]);}
 if(!cfg.serviceAccessReviewed){reasons.push('search_service_access_not_reviewed');return output([]);}
 if(plan.queries.length===0){reasons.push('clarification_required');return output([]);}
 const transport=input.fixtureTransport??restrictedHttpsTransport;
 const endpoint=new URL(cfg.endpoint),queries=plan.queries.slice(0,cfg.maxQueries);
 let robotsAllowed=false;
 try{
  const url=endpoint.origin+'/robots.txt';net.push(url);
  const res=await transport.get(url,RESEARCH_AGENT,512000);
  if(res.finalUrl!==url){reasons.push('search_robots_redirect');return output(queries);}
  robotsAllowed=publicRobotsDecision223(res,endpoint.toString())==='allow';
  if(!robotsAllowed){reasons.push('search_robots_not_permitted_or_unavailable');return output(queries);}
 }catch{reasons.push('search_robots_network_error');return output(queries);}
 const seen=new Set<string>();
 for(const query of queries){
  const u=new URL(endpoint);u.searchParams.set('q',query);u.searchParams.set('format','json');
  u.searchParams.set('language',cfg.language??'en');const url=u.toString();
  if(url.length>800){reasons.push('search_query_too_long');continue;}
  try{
   net.push(url);const res=await transport.get(url,RESEARCH_AGENT,800000);
   if(res.finalUrl!==url||res.status!==200||!/^application\/json(?:\s*;|\s*$)/i.test(res.contentType)){
    reasons.push(res.status===403?'search_json_not_enabled_or_forbidden':'search_response_invalid');continue;
   }
   const data:unknown=JSON.parse(res.body);
   if(!data||typeof data!=='object'||!('results' in data)||
    !Array.isArray((data as {results:unknown}).results))throw Error('bad_results');
   // JSON must fit transport cap; reject excessively large result arrays instead of slicing silently.
   const entries=(data as {results:unknown[]}).results;
   if(entries.length>300)throw Error('unbounded_results');
   if(res.rawBytes&&Buffer.from(res.body,'utf8').equals(Buffer.from(res.rawBytes)))digests.push(sha(res.rawBytes));
   for(const item of entries){
    if(!item||typeof item!=='object'||typeof (item as {url?:unknown}).url!=='string')continue;
    const raw=(item as {url:string}).url;
    if(!safeHost(raw))continue;
    const parsed=new URL(raw);parsed.hash='';
    for(const key of [...parsed.searchParams.keys()])if(/^(?:utm_.+|gclid|fbclid|mc_cid|mc_eid)$/i.test(key))parsed.searchParams.delete(key);
    parsed.searchParams.sort();const normalized=parsed.toString();
    if(seen.has(normalized))continue;
    seen.add(normalized);
    leads.push({url:normalized,sourceId:'search_'+sha(parsed.hostname).slice(0,16),verification:'unverified_url_only',queryIndex:queries.indexOf(query)});
    if(leads.length>=cfg.maxResults)break;
   }
  }catch{reasons.push('search_transport_or_json_error');}
  if(leads.length>=cfg.maxResults)break;
 }
 leads.sort((a,b)=>a.url.localeCompare(b.url));
 if(!leads.length)reasons.push('search_returned_no_usable_candidates');
 return output(queries);
}
/** Bridge search leads into the existing Phase222 page observer, with one
 * synthetic registry entry per returned host. This does not assert rights.
 * Fixture transport is only possible through explicitly synthetic calls. */
export async function inspectSearchLeads223(input:{search:SearchRun223;registry:Registry220;
 observedAt:string;maxPages?:number;mode?:'live'|'synthetic_fixture';fixtureTransport?:SourceTransport;
 sourceRestrictions?:Readonly<Record<string,'not_reviewed'|'no_known_restriction'|'explicitly_prohibited'|'login_required'>>;
}):Promise<Observation222>{
 const mode=input.mode??'live';if(mode!==input.search.mode)throw Error('phase223_mode_mismatch');
 const hosts=new Map<string,string>();
 for(const lead of input.search.candidates){const host=new URL(lead.url).hostname;
  if(!safeMetadataUrl75(lead.url,host)||lead.sourceId!=='search_'+sha(host).slice(0,16))throw Error('phase223_bad_lead');
  hosts.set(lead.sourceId,host);
 }
 const fakeSources=[...hosts].map(([id,host])=>({watch:{id,host,categoryId:'search_leads',
  channel:'specialist_editorial' as const,mechanism:'approved_index_delta' as const,tier:'exploration' as const,
  rightsClearedForMetadata:false,nextCheckAt:input.observedAt,lastCheckAt:null,quietChecks:0,errors:0},
  sitemapPath:'/sitemap.xml',pathPrefix:'/'}));
 const joined:Registry={...input.registry,sources:[...input.registry.sources,...fakeSources]};
 const run:Run220={schema:'pee220.run.1',mode,requestSha256:sha(input.search.intentKey??''),
  intent:{status:'needs_category',categoryId:null,slotValues:{},clarification:null,key:null,confirmedByUser:false},
  localIntake:{suggestionCount:0,unresolvedIssues:0},decision:'candidate_discovery_attempted',
  plannedSourceIds:[],sourceOutcomes:[],networkRequests:input.search.networkRequests,
  candidates:input.search.candidates,limitations:[],rankingAuthorized:false,independentEvidenceVerified:false,
  checkpoint:{schema:'pee220.checkpoint.1',observations:[],watchSources:[],evidenceReceipts:[],rankingAuthorized:false}};
 return observeDiscoveredPages222({run,registry:joined,observedAt:input.observedAt,maxPages:input.maxPages??6,
  mode,fixtureTransport:input.fixtureTransport,sourceRestrictions:input.sourceRestrictions});
}
