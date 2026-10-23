/** Phase 75: API-free, source-scoped discovery of candidate URLs from sitemap XML.
 * Discovery != right to retrieve, parse, mine, cite or store page facts.
 * Only source policies explicitly cleared for metadata discovery are accepted.
 */
import {isIP} from 'node:net';
import {RESEARCH_AGENT,robotsDecision,restrictedHttpsTransport,type SourceTransport} from './approved_web_reader.js';
import type {WebSourcePolicy} from './web_evidence_acquisition.js';
import {publicMetadataDiscoveryGate223,publicRobotsDecision223} from './phase223_public_metadata_access.js';
export interface DiscoveredMetadataUrl {
 url:string;sourceId:string;discoveryChannel:'authorized_sitemap';
 verification:'candidate_only_unverified';automaticPageAcquisition:false;
 originalTestIdentityKnown:false;rankingEligible:false;
}
export interface DiscoveryResult {
 status:'candidate_urls_found'|'blocked'|'nothing_relevant';
 urls:DiscoveredMetadataUrl[];reasons:string[];webCalls:number;
 noArticleTextRetained:true;publicationReady:false;
}
const validDate=(v:string|null)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
function isSafeUrl(s:string,hostname:string|null){
 try{const u=new URL(s);return u.protocol==='https:'&&(hostname===null||u.hostname===hostname)&&isIP(u.hostname)===0&&
 u.hostname.includes('.')&&!/(?:^|\.)(?:localhost|internal|local|invalid|example)$/.test(u.hostname)&&
 !u.username&&!u.password&&(!u.port||u.port==='443')&&u.hash===''&&
 !/%2f|%5c|%2e|%00/i.test(u.pathname)&&u.toString().length<1500;}
 catch{return false;}
}
/** Shared Phase75 permission predicate for source-scoped METADATA discovery.
 * Registry records are operator attestation claims, not proof of permission by themselves. */
export function approvedMetadataDiscovery75(p:WebSourcePolicy|undefined,asOf:string):boolean {
 if(!p||!Number.isFinite(Date.parse(asOf))||
  !/^[a-z0-9.-]+$/.test(p.host)||!p.host.includes('.')||
!Array.isArray(p.permittedOperations)||!p.permittedOperations.includes('metadata_discovery')||
  !['written_permission','verified_open_licence','reviewed_statutory_exception'].includes(p.basis)||
  !p.commercialUseReviewed||p.websiteTerms!=='reviewed_permitted'||p.robots!=='allowed'||
  !p.rightsDocumentId||!p.reviewedBy||!p.rightsDocumentUrl||
  !isSafeUrl(p.rightsDocumentUrl,null)||!validDate(p.validUntil)||Date.parse(p.validUntil!)<Date.parse(asOf)||
  !validDate(p.reviewedAt)||Date.parse(p.reviewedAt!)>Date.parse(asOf)||
  !validDate(p.robotsCheckedAt)||Date.parse(p.robotsCheckedAt!)>Date.parse(asOf)||
  Date.parse(asOf)-Date.parse(p.robotsCheckedAt!)>86400000||
  !validDate(p.termsCheckedAt)||Date.parse(p.termsCheckedAt!)>Date.parse(asOf)||
  Date.parse(asOf)-Date.parse(p.termsCheckedAt!)>30*86400000 )return false;
 return true;
}
/** Exact-host conservative discovery URL checks; no wildcard third-party links. */
export function safeMetadataUrl75(url:string,host:string):boolean{return isSafeUrl(url,host);}

const stem75=(w:string)=>w.length>3&&w.endsWith('s')&&!w.endsWith('ss')?w.slice(0,-1):w;
const tokens75=(text:string)=>new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>=3).map(stem75));
/** Visit-order prioritization only: URLs whose path shares more words with the request/category
 * terms come first; among equals, deeper (more specific, e.g. item rather than listing) paths come
 * first, then publisher order. This is NOT relevance proof or a product ranking. */
export function orderByRequestTerms75(urls:readonly string[],terms:readonly string[]|undefined):string[]{
 const wanted=tokens75((terms??[]).join(' '));
 if(!wanted.size)return [...urls];
 return urls.map((url,i)=>{let path='';try{path=decodeURIComponent(new URL(url).pathname);}catch{}
   const have=tokens75(path);
   return {url,i,score:[...wanted].filter(w=>have.has(w)).length,depth:path.split('/').filter(Boolean).length};})
  .sort((a,b)=>b.score-a.score||b.depth-a.depth||a.i-b.i).map(x=>x.url);
}
/** sitemaps.org protocol limits: 50,000 URLs and 50MB per file; the byte cap keeps a stricter 10MB. */
export const SITEMAP_MAX_BYTES75=10_000_000;
const SITEMAP_MAX_LOCS=50_000,SITEMAP_INDEX_MAX_CHILDREN=5;
/** Deliberately a conservative sitemap URL extractor, not a general XML parser.
 * Only the protocol's own <loc> elements (same namespace prefix as the root element) are read:
 * extension elements such as <image:loc> or <video:loc> describe media, not pages. */
function parseSitemap(xml:string):{kind:'urlset'|'sitemapindex';locs:string[]}{
 if(xml.length>SITEMAP_MAX_BYTES75||/<!DOCTYPE|<!ENTITY|<script/i.test(xml))throw Error('Unsafe sitemap syntax');
 const root=/<(?:([a-z][\w-]*):)?(urlset|sitemapindex)[\s>]/i.exec(xml);
 if(!root)throw Error('Not a sitemap');
 const prefix=root[1]?root[1]+':':'';
 const esc=prefix.replace(/[.*+?^${}()|[\]\\-]/g,'\\$&');
 const urls:string[]=[];
 for(const m of xml.matchAll(new RegExp(`<${esc}loc\\s*>([^<]{1,1500})</${esc}loc\\s*>`,'gi'))){
  const raw=m[1].trim().replace(/&amp;/g,'&');
  if(/&(?!amp;)[a-z#]/i.test(m[1])||raw.includes('\\')||raw.includes('%00'))continue;
  urls.push(raw);
  if(urls.length>SITEMAP_MAX_LOCS)throw Error('Unbounded sitemap');
 }
 return {kind:root[2].toLowerCase() as 'urlset'|'sitemapindex',locs:urls};
}
export async function discoverFromApprovedSitemap(input:{policy:WebSourcePolicy;asOf:string;
 sitemapPath?:string;maxCandidates?:number;transport?:SourceTransport;requirePathPrefix?:string;
 accessMode?:'legacy_reviewed'|'public_metadata';
 /** Optional request/category words used only to choose which in-scope URLs to keep first. */
 relevanceTerms?:readonly string[];}):Promise<DiscoveryResult>{
 const result:DiscoveryResult={status:'blocked',urls:[],reasons:[],webCalls:0,noArticleTextRetained:true,publicationReady:false};
 const p=input.policy;const max=input.maxCandidates??40;
 if(!Number.isInteger(max)||max<1||max>100||
  !(input.accessMode==='public_metadata'?publicMetadataDiscoveryGate223(p,input.asOf):approvedMetadataDiscovery75(p,input.asOf))){
   result.reasons=['metadata_discovery_rights_not_cleared'];return result;
  }
 const path=input.sitemapPath??'/sitemap.xml',prefix=input.requirePathPrefix??'/';
 if(!/^\/[a-zA-Z0-9._~/-]{0,180}$/.test(path)||!/^\/[a-zA-Z0-9._~/-]{0,180}$/.test(prefix)){
  result.reasons=['unsafe_sitemap_scope'];return result;
 }
 const transport=input.transport??restrictedHttpsTransport;
 try{
  result.webCalls++;
  const robots=await transport.get(`https://${p.host}/robots.txt`,RESEARCH_AGENT,512000);
  if(input.accessMode==='public_metadata'?
    publicRobotsDecision223(robots,`https://${p.host}${path}`)!=='allow':
    robots.status!==200||robots.finalUrl!==`https://${p.host}/robots.txt`||
    !/^text\/plain(?:\s*;|\s*$)/i.test(robots.contentType)||
    robotsDecision(robots.body,path)!=='allow')throw Error('robots_sitemap_not_allowed');
  const robotsAllow=(u:URL)=>(input.accessMode==='public_metadata'?publicRobotsDecision223(robots,u.toString()):
   robotsDecision(robots.body,u.pathname+u.search))==='allow';
  const fetchSitemap=async(url:string)=>{
   result.webCalls++;
   const sm=await transport.get(url,RESEARCH_AGENT,SITEMAP_MAX_BYTES75);
   if(sm.status!==200||sm.finalUrl!==url||
     !/(?:application|text)\/(?:xml|x-xml|plain)(?:\s*;|\s*$)/i.test(sm.contentType))
     throw Error('sitemap_response_rejected');
   return parseSitemap(sm.body);
  };
  // Sitemaps whose URL mentions the scope's path words are read first; order is otherwise kept.
  const words=prefix.split(/[^a-z0-9]+/i).filter(w=>w.length>=2).map(w=>w.toLowerCase());
  const byScope=(urls:readonly string[])=>urls.filter(u=>isSafeUrl(u,p.host)&&robotsAllow(new URL(u)))
   .map((u,i)=>({u,i,score:words.filter(w=>u.toLowerCase().includes(w)).length}))
   .sort((a,b)=>b.score-a.score||a.i-b.i).map(x=>x.u);
  let top:ReturnType<typeof parseSitemap>;
  try{top=await fetchSitemap(`https://${p.host}${path}`);}
  catch(e){
   // The configured path is missing: fall back to sitemaps the host itself declares in robots.txt
   // (RFC 9309 "Sitemap:" lines), same host only, at most three attempts.
   const declared=byScope([...robots.body.matchAll(/^\s*sitemap\s*:\s*(\S+)\s*$/gim)].map(m=>m[1])).slice(0,3);
   let found:ReturnType<typeof parseSitemap>|null=null;
   for(const url of declared){try{found=await fetchSitemap(url);break;}catch{}}
   if(!found)throw e;
   top=found;result.reasons.push('sitemap_from_robots_declaration');
  }
  let pageLocs=top.kind==='urlset'?top.locs:[];
  if(top.kind==='sitemapindex'){
   // One level of a sitemap index, same host only, robots-checked, bounded number of children.
   const children=byScope(top.locs).slice(0,SITEMAP_INDEX_MAX_CHILDREN);
   pageLocs=[];
   for(const child of children){
    try{const c=await fetchSitemap(child);if(c.kind==='urlset')pageLocs.push(...c.locs);}
    catch{result.reasons.push('sitemap_child_rejected');}
   }
  }
  const seen=new Set<string>();
  for(const url of orderByRequestTerms75(pageLocs,input.relevanceTerms)){
   if(!isSafeUrl(url,p.host))continue;
   const u=new URL(url);
   if(!u.pathname.startsWith(prefix)||!robotsAllow(u))continue;
   if(seen.has(u.toString()))continue;
   seen.add(u.toString());
   result.urls.push({url:u.toString(),sourceId:p.sourceId,discoveryChannel:'authorized_sitemap',
     verification:'candidate_only_unverified',automaticPageAcquisition:false,
     originalTestIdentityKnown:false,rankingEligible:false});
   if(result.urls.length>=max)break;
  }
  result.status=result.urls.length?'candidate_urls_found':'nothing_relevant';
  return result;
 }catch{
  result.urls=[];result.reasons=['sitemap_access_or_parser_failed'];return result;
 }
}
