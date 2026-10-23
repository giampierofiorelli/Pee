import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {searchCandidateUrls223,inspectSearchLeads223,planSearchQueries223,type SearchConfig223} from '../src/phase223_search_discovery.js';
import {publicMetadataDiscoveryGate223,publicRobotsDecision223} from '../src/phase223_public_metadata_access.js';
import {discoverFromApprovedSitemap} from '../src/phase75_source_discovery.js';
import {runAutonomousDiscovery220,type Registry220} from '../src/phase220_autonomous_discovery_worker.js';
import type {WebSourcePolicy} from '../src/web_evidence_acquisition.js';
import type {SourceTransport} from '../src/approved_web_reader.js';
const registry:Registry220=JSON.parse(readFileSync('docs/phase220/phase220-category-vocabulary.json','utf8'));
const endpoint='https://synthetic-search.org/search';
const asOf='2026-10-13T19:00:00Z';
const config:SearchConfig223={schema:'pee223.search-config.1',provider:'searxng',endpoint,enabled:true,
 maxQueries:2,maxResults:10,serviceAccessReviewed:true};
const policy:WebSourcePolicy={sourceId:'test_feed',host:'synthetic-publisher.org',basis:'unknown',
 rightsDocumentId:null,rightsDocumentUrl:null,reviewedBy:null,reviewedAt:null,validUntil:null,
 permittedOperations:[],robots:'unknown',robotsCheckedAt:null,websiteTerms:'unknown',termsCheckedAt:null,
 commercialUseReviewed:false};
const searchResults={results:[
 {url:'https://synthetic-publisher.org/review/boots?a=1&utm_source=ads',title:'Synthetic product review',content:'Do not persist this excerpt'},
 {url:'https://synthetic-publisher.org/review/boots?a=1',title:'dup'},
 {url:'http://synthetic-publisher.org/unsecured',title:'insecure'},
 {url:'https://127.0.0.1/admin',title:'private'},
 {url:'https://synthetic-products.org/catalogue/rb-2',content:'Do not persist this review'},
 {url:'https://synthetic-publisher.org:444/other',content:'unsafe port'}]};
const html='<html><script type="application/ld+json">'+JSON.stringify({'@type':'Product',
 name:'Synthetic Test Boot',brand:'Synthetic Manufacturer',model:'AB-3',description:'Do not store the article body'})+'</script></html>';
const fixture=(robots='User-agent: *\nAllow: /\n',response=searchResults):SourceTransport=>({async get(url){
 if(url.endsWith('/robots.txt'))return {status:200,finalUrl:url,contentType:'text/plain',body:robots,rawBytes:Buffer.from(robots)};
 if(url.includes('/search?'))return {status:200,finalUrl:url,contentType:'application/json',body:JSON.stringify(response),rawBytes:Buffer.from(JSON.stringify(response))};
 return {status:200,finalUrl:url,contentType:'text/html',body:html,rawBytes:Buffer.from(html)};
}});
const run=(q='I need football boots for AG pitches',transport=fixture())=>searchCandidateUrls223({question:q,registry,config,
 mode:'synthetic_fixture',fixtureTransport:transport});
test('Canonical semantic slot query is stable for paraphrases',()=>{
 const a=planSearchQueries223('I need football boots for AG pitches',registry);
 const b=planSearchQueries223('Which soccer cleats work for AG pitches?',registry);
 assert.equal(a.key,b.key);assert.deepEqual(a.queries,b.queries);
});
test('Category without essential slot returns clarification and performs no HTTP',async()=>{
 let calls=0;const x=await run('I need football boots',{async get(){calls++;throw Error('called');}});
 assert.equal(x.intentStatus,'needs_clarification');assert.equal(calls,0);
});
test('Search JSON adapter returns deduplicated safe HTTPS URLs only, no snippets',async()=>{
 const x=await run();assert.equal(x.candidates.length,2);assert.equal(x.networkRequests.length,3);
 assert.equal(x.candidates[0].url.includes('utm_source'),false);
 assert.equal(x.independentEvidenceVerified,false);assert.equal(x.rankingAuthorized,false);
 const serialized=JSON.stringify(x);assert.ok(!serialized.includes('Do not persist'));
 assert.ok(!serialized.includes('Synthetic product review'));
 assert.ok(x.responseDigests.length>0);
});
test('Provider disabled, not reviewed, forbidden and invalid endpoint all fail without fake results',async()=>{
 let calls=0;const transport={async get(){calls++;throw Error('unexpected');}};
 for(const change of [{enabled:false},{serviceAccessReviewed:false}]){
  const x=await searchCandidateUrls223({question:'I need football boots for AG pitches',registry,
   config:{...config,...change},mode:'synthetic_fixture',fixtureTransport:transport});
  assert.equal(x.candidates.length,0);assert.equal(x.networkRequests.length,0);
 }assert.equal(calls,0);
 for(const bad of ['http://synthetic-search.org/search','https://127.0.0.1/search','https://synthetic-search.org:8080/search']){
  await assert.rejects(()=>searchCandidateUrls223({question:'I need football boots for AG pitches',registry,
   config:{...config,endpoint:bad},mode:'synthetic_fixture',fixtureTransport:fixture()}),/phase223_bad_search_config/);
 }
});
test('Search robots disallow means zero queries, and response 403 is not treated as valid JSON',async()=>{
 const denied=await run(undefined,fixture('User-agent: *\nDisallow: /search\n'));
 assert.equal(denied.networkRequests.length,1);assert.equal(denied.candidates.length,0);
 const tr:SourceTransport={async get(url){const x=await fixture().get(url,'agent',800000);
  return url.includes('/search?')?{...x,status:403}:x;}};
 const x=await run(undefined,tr);assert.equal(x.candidates.length,0);
 assert.ok(x.reasonCodes.includes('search_json_not_enabled_or_forbidden'));
});
test('Search fixture/live boundary forbids fixture injection to live',async()=>{
 await assert.rejects(()=>searchCandidateUrls223({question:'I need football boots for AG pitches',registry,
  config,mode:'live',fixtureTransport:fixture()}),/phase223_transport_boundary/);
});
test('Search response oversized, malformed or unsafe format yields no candidates',async()=>{
 for(const response of [{results:Array.from({length:301},(_,n)=>({url:`https://synthetic-product.org/${n}`}))},
  {results:'not an array'}]){
  const x=await run(undefined,fixture(undefined,response as typeof searchResults));
  assert.equal(x.candidates.length,0);
  assert.ok(x.reasonCodes.includes('search_transport_or_json_error'));
 }
});
test('Search leads to Phase222 page reader: transient product metadata, no article text',async()=>{
 const search=await run();const inspected=await inspectSearchLeads223({search,registry,observedAt:asOf,
  mode:'synthetic_fixture',fixtureTransport:fixture(),maxPages:2});
 assert.equal(inspected.receipts.length,2);
 assert.equal(inspected.identityLeadCount,2);
 assert.ok(inspected.receipts.every(r=>r.scientificEvidenceAdmitted===false));
 assert.ok(inspected.receipts.some(r=>r.productLeads[0]?.model==='AB-3'));
 assert.equal(JSON.stringify(inspected).includes('Do not store the article body'),false);
});
test('Search results for recycling bins retain canonical intent, no fake scores',async()=>{
 const x=await run('I need a recycling bin for paper and plastic');
 assert.equal(x.intentStatus,'bounded_category_hypothesis');
 assert.ok(x.queries[0].includes('recycling'));
 assert.equal(x.rankingAuthorized,false);
});
test('Public metadata registration requires no written licence but respects explicit prohibitions',()=>{
 assert.equal(publicMetadataDiscoveryGate223(policy,asOf),true);
 assert.equal(publicMetadataDiscoveryGate223({...policy,websiteTerms:'reviewed_prohibited'},asOf),false);
 assert.equal(publicMetadataDiscoveryGate223({...policy,basis:'refused'},asOf),false);
 assert.equal(publicMetadataDiscoveryGate223({...policy,robots:'disallowed'},asOf),false);
});
test('Public metadata mode can execute RSS discovery without fake rights attestation',async()=>{
 const reg:Registry220={...registry,sources:[{watch:{id:'test_feed',categoryId:'football_footwear',
  host:policy.host,mechanism:'rss',channel:'specialist_editorial',tier:'exploration',
  rightsClearedForMetadata:true,nextCheckAt:asOf,lastCheckAt:null,quietChecks:0,errors:0},
  discoveryAccess:'public_metadata',sitemapPath:'/sitemap.xml',feedPath:'/feed.xml',pathPrefix:'/articles/'}],policies:[policy]};
 const rss='<rss><channel><item><link>https://synthetic-publisher.org/articles/item1</link></item></channel></rss>';
 const tr:SourceTransport={async get(url){const robots=url.endsWith('/robots.txt');const body=robots?'User-agent: OtherBot\nDisallow: /':rss;
  return {status:200,finalUrl:url,contentType:robots?'text/plain':'application/xml',body,rawBytes:Buffer.from(body)};}};
 const x=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',registry:reg,
  asOf,mode:'synthetic_fixture',fixtureTransport:tr});
 assert.equal(x.candidates.length,1);assert.equal(x.networkRequests.length,2);
 const revoked={...reg,policies:[{...policy,websiteTerms:'reviewed_prohibited' as const}]};
 const y=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',registry:revoked,
  asOf,mode:'synthetic_fixture',fixtureTransport:tr,checkpoint:x.checkpoint});
 assert.equal(y.candidates.length,0);
});
test('Public robots mode: 404/410/no matching group allow, 403/5xx/matching disallow block',()=>{
 const url='https://synthetic-publisher.org/articles/boots';const r=(status:number,body:string)=>({status,
  finalUrl:'https://synthetic-publisher.org/robots.txt',contentType:'text/plain',body});
 assert.equal(publicRobotsDecision223(r(404,''),url),'allow');
 assert.equal(publicRobotsDecision223(r(410,''),url),'allow');
 assert.equal(publicRobotsDecision223(r(200,'User-agent: OtherBot\nDisallow: /'),url),'allow');
 assert.equal(publicRobotsDecision223(r(200,'User-agent: *\nDisallow: /'),url),'deny');
 assert.equal(publicRobotsDecision223(r(403,''),url),'unknown');
 assert.equal(publicRobotsDecision223(r(503,''),url),'unknown');
});

test('Public metadata sitemap permits 404 robots but forbids restricted paths and hosts',async()=>{
 const xml='<urlset><url><loc>https://synthetic-publisher.org/products/model-a</loc></url>'+
 '<url><loc>https://outside-publisher.org/products/model-b</loc></url></urlset>';
 const tr:SourceTransport={async get(url){if(url.endsWith('/robots.txt'))return {status:404,finalUrl:url,contentType:'text/plain',body:''};
  return {status:200,finalUrl:url,contentType:'text/xml',body:xml,rawBytes:Buffer.from(xml)};}};
 const x=await discoverFromApprovedSitemap({policy,asOf,accessMode:'public_metadata',
  sitemapPath:'/sitemap.xml',requirePathPrefix:'/products/',transport:tr});
 assert.equal(x.urls.length,1);assert.equal(x.urls[0].url,'https://synthetic-publisher.org/products/model-a');
 assert.equal(x.publicationReady,false);
});
test('A known host-wide prohibition is not bypassed by search source IDs',async()=>{
 const search=await run();const blockedRegistry={...registry,policies:[{...policy,
  websiteTerms:'reviewed_prohibited' as const}]};
 const result=await inspectSearchLeads223({search,registry:blockedRegistry,observedAt:asOf,
  mode:'synthetic_fixture',fixtureTransport:fixture()});
 const blocked=result.receipts.filter(r=>r.url.startsWith('https://synthetic-publisher.org/'));
 assert.equal(blocked.length,1);assert.equal(blocked[0].status,'blocked');
 assert.ok(blocked[0].reasonCodes.includes('registry_explicit_host_prohibition'));
});
