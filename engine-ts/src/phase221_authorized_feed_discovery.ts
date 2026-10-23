/** Phase221: bounded RSS 2.0 / Atom 1.0 metadata discovery, using the existing
 * Phase69 transport, Phase75 rights checks and robots parser.
 * This is NOT a general XML reader; any unsupported format fails closed.
 * A discovered link is a source-host URL lead, not a product, independent test,
 * licensing grant, author identity, or a verified claim.
 */
import {RESEARCH_AGENT,robotsDecision,restrictedHttpsTransport,type SourceTransport} from './approved_web_reader.js';
import {approvedMetadataDiscovery75,safeMetadataUrl75,orderByRequestTerms75} from './phase75_source_discovery.js';
import type {WebSourcePolicy} from './web_evidence_acquisition.js';
import {publicMetadataDiscoveryGate223,publicRobotsDecision223} from './phase223_public_metadata_access.js';

export interface FeedDiscovery221 {
 status:'candidate_urls_found'|'nothing_relevant'|'blocked';
 urls:readonly string[];webCalls:number;reasons:readonly string[];
 feedKind:'rss'|'atom';noArticleTextRetained:true;rankingAuthorized:false;
}
const goodPath=(path:string)=>/^\/[a-zA-Z0-9._~/-]{0,180}$/.test(path);
const text=(s:string)=>s.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/,'$1').trim()
 .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'")
 .replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const safeDocument=(xml:string)=>xml.length<=800000&&
 !/<!DOCTYPE|<!ENTITY|<script|<\?xml-stylesheet|<\!\[CDATA\[[\s\S]{100000}/i.test(xml);
/** No recursive expansion, external entities, embedded HTML, remote resources or DOM execution. */
function extractFeedLinks(xml:string,kind:'rss'|'atom'):string[]{
 if(!safeDocument(xml))throw Error('unsafe_xml');
 if(kind==='rss'&&!/<rss(?:\s[^>]{0,200})?>/i.test(xml))throw Error('not_rss');
 if(kind==='atom'&&!/<(?:[a-z0-9_-]+:)?feed(?:\s[^>]{0,300})?>/i.test(xml))throw Error('not_atom');
 const block=kind==='rss'?/<item(?:\s[^>]{0,200})?>([\s\S]*?)<\/item\s*>/gi:
  /<(?:[a-z0-9_-]+:)?entry(?:\s[^>]{0,200})?>([\s\S]*?)<\/(?:[a-z0-9_-]+:)?entry\s*>/gi;
 const urls:string[]=[];let count=0;
 for(const m of xml.matchAll(block)){
  if(++count>1000)throw Error('unbounded_entries');
  const fragment=m[1];if(fragment.length>100000)throw Error('unbounded_entry');
  let link:string|undefined;
  if(kind==='rss'){
   const found=fragment.match(/<link\s*>([\s\S]{1,1800}?)<\/link\s*>/i);
   if(found)link=text(found[1]);
  }else{
   for(const found of fragment.matchAll(/<(?:[a-z0-9_-]+:)?link\b([^<>]{1,2000}?)\/?>/gi)){
    const attrs=found[1];const rel=attrs.match(/\brel\s*=\s*(["'])(.*?)\1/i)?.[2];
    const href=attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    if(href&&(!rel||rel==='alternate')){link=text(href);break;}
   }
  }
  if(link&&link.length<=1500)urls.push(link);
 }
 return urls;
}
export async function discoverFromApprovedFeed221(input:{policy:WebSourcePolicy;asOf:string;
 feedKind:'rss'|'atom';feedPath:string;requirePathPrefix:string;maxCandidates:number;
 transport?:SourceTransport;accessMode?:'legacy_reviewed'|'public_metadata';
 relevanceTerms?:readonly string[];}):Promise<FeedDiscovery221>{
 const r:FeedDiscovery221={status:'blocked',urls:[],webCalls:0,reasons:[],feedKind:input.feedKind,
  noArticleTextRetained:true,rankingAuthorized:false};
 const p=input.policy;
 if(!(input.accessMode==='public_metadata'?publicMetadataDiscoveryGate223(p,input.asOf):approvedMetadataDiscovery75(p,input.asOf)))return {...r,reasons:['metadata_discovery_rights_not_cleared']};
 if(!['rss','atom'].includes(input.feedKind)||!goodPath(input.feedPath)||
  !goodPath(input.requirePathPrefix)||!Number.isInteger(input.maxCandidates)||
  input.maxCandidates<1||input.maxCandidates>100)return {...r,reasons:['invalid_feed_scope']};
 const transport=input.transport??restrictedHttpsTransport;
 let calls=0;
 try{
  const robotsUrl=`https://${p.host}/robots.txt`;
  calls++;const robots=await transport.get(robotsUrl,RESEARCH_AGENT,512000);
  if(input.accessMode==='public_metadata'?
   publicRobotsDecision223(robots,`https://${p.host}${input.feedPath}`)!=='allow':
   robots.status!==200||robots.finalUrl!==robotsUrl||
   !/^text\/plain(?:\s*;|\s*$)/i.test(robots.contentType)||
   robotsDecision(robots.body,input.feedPath)!=='allow')throw Error('robots_denied_feed');
  const feedUrl=`https://${p.host}${input.feedPath}`;
  calls++;const feed=await transport.get(feedUrl,RESEARCH_AGENT,800000);
  if(feed.status!==200||feed.finalUrl!==feedUrl||
   !/^(?:application\/(?:rss\+xml|atom\+xml|xml)|text\/(?:xml|plain))(?:\s*;|\s*$)/i.test(feed.contentType))
   throw Error('invalid_feed_response');
  const links=extractFeedLinks(feed.body,input.feedKind);
  const urls:string[]=[];const seen=new Set<string>();
  for(const link of orderByRequestTerms75(links,input.relevanceTerms)){
   if(!safeMetadataUrl75(link,p.host))continue;
   const u=new URL(link);
   if(!u.pathname.startsWith(input.requirePathPrefix)||
    (input.accessMode==='public_metadata'?publicRobotsDecision223(robots,u.toString()):
     robotsDecision(robots.body,u.pathname+u.search))!=='allow')continue;
   if(seen.has(u.toString()))continue;
   seen.add(u.toString());urls.push(u.toString());
   if(urls.length>=input.maxCandidates)break;
  }
  return {...r,status:urls.length?'candidate_urls_found':'nothing_relevant',urls,webCalls:calls};
 }catch{
  return {...r,reasons:['feed_access_or_parser_failed'],webCalls:calls};
 }
}
