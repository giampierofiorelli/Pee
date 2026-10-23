import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {discoverFromApprovedFeed221} from '../src/phase221_authorized_feed_discovery.js';
import {runAutonomousDiscovery220,type Registry220} from '../src/phase220_autonomous_discovery_worker.js';
import type {SourceTransport} from '../src/approved_web_reader.js';
import type {WebSourcePolicy} from '../src/web_evidence_acquisition.js';
const host='synthetic-editorial.co.uk',asOf='2026-10-13T17:00:00.000Z';
const policy:WebSourcePolicy={sourceId:'fixture_editorial',host,basis:'written_permission',
 rightsDocumentId:'SYNTHETIC_RIGHTS_ONLY',rightsDocumentUrl:`https://${host}/permissions`,
 reviewedBy:'SYNTHETIC_PERSON',reviewedAt:asOf,validUntil:'2027-10-13T17:00:00Z',
 permittedOperations:['metadata_discovery'],robots:'allowed',robotsCheckedAt:asOf,
 websiteTerms:'reviewed_permitted',termsCheckedAt:asOf,commercialUseReviewed:true};
const rss=`<?xml version="1.0"?><rss version="2.0"><channel>
 <item><title>A (test claims not validated)</title><link>https://${host}/reviews/boots-alpha</link></item>
 <item><link>https://${host}/reviews/boots-alpha</link></item>
 <item><link>https://outside-example.org/reviews/boots-beta</link></item>
 <item><link>http://${host}/reviews/not-https</link></item>
 <item><link>https://${host}/news/not-matching-path</link></item>
 <item><link>https://${host}/reviews/beta?x=1&amp;y=2</link></item>
 </channel></rss>`;
const atom=`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>Test story</title><link rel="self" href="https://${host}/feed/id1"/>
<link href="https://${host}/reviews/atom-entry" rel="alternate" /></entry>
<entry><link href="https://${host}/reviews/atom-entry"/></entry>
</feed>`;
const response=(xml:string,overrideRobots='User-agent: *\nAllow: /\n',wrongType=false):SourceTransport=>({async get(url){
 const isRobots=url.endsWith('/robots.txt');const body=isRobots?overrideRobots:xml;
 return {status:200,finalUrl:url,contentType:isRobots?'text/plain':wrongType?'text/html':'application/xml',
  body,rawBytes:Buffer.from(body)};
}});
const base:Registry220=JSON.parse(readFileSync('docs/phase220/phase220-category-vocabulary.json','utf8'));
const registry=(kind:'rss'|'atom',path:string):Registry220=>({...base,
 sources:[{watch:{id:'fixture_editorial',categoryId:'football_footwear',host,
  channel:'specialist_editorial',mechanism:kind,tier:'core',rightsClearedForMetadata:true,
  nextCheckAt:asOf,lastCheckAt:null,quietChecks:0,errors:0},
  sitemapPath:'/sitemap.xml',feedPath:path,pathPrefix:'/reviews/'}],policies:[policy]});
const feed=(kind:'rss'|'atom',path:string,transport:SourceTransport)=>discoverFromApprovedFeed221({
 policy,asOf,feedKind:kind,feedPath:path,requirePathPrefix:'/reviews/',maxCandidates:20,transport});
test('RSS: Phase69-style transport and Phase75 rights/robots gate, dedup and exact host, no ranking',async()=>{
 const x=await feed('rss','/rss.xml',response(rss));
 assert.equal(x.status,'candidate_urls_found');assert.equal(x.webCalls,2);
 assert.deepEqual(x.urls,[`https://${host}/reviews/boots-alpha`,`https://${host}/reviews/beta?x=1&y=2`]);
 assert.equal(x.noArticleTextRetained,true);assert.equal(x.rankingAuthorized,false);
});
test('Atom: selects alternate link, deduplicates and discards self-feed link',async()=>{
 const x=await feed('atom','/atom.xml',response(atom));
 assert.deepEqual(x.urls,[`https://${host}/reviews/atom-entry`]);
});
test('Denied rights means strictly zero HTTP requests',async()=>{
 let calls=0;const x=await discoverFromApprovedFeed221({policy:{...policy,permittedOperations:[]},
 asOf,feedKind:'rss',feedPath:'/rss.xml',requirePathPrefix:'/reviews/',maxCandidates:5,
 transport:{async get(){calls++;throw Error('network must not occur');}}});
 assert.equal(x.status,'blocked');assert.equal(x.webCalls,0);assert.equal(calls,0);
});
test('robots disallow feed means no feed GET; robots disallow an article filters it',async()=>{
 const requests:string[]=[];const delegate=response(rss,'User-agent: *\nDisallow: /rss.xml\n');
 const denied=await feed('rss','/rss.xml',{async get(url,a,b){requests.push(url);return delegate.get(url,a,b);}});
 assert.equal(denied.status,'blocked');assert.equal(requests.length,1);
 const x=await feed('rss','/rss.xml',response(rss,'User-agent: *\nDisallow: /reviews/beta\nAllow: /\n'));
 assert.deepEqual(x.urls,[`https://${host}/reviews/boots-alpha`]);
});
test('Parser fail-closed on DTD, wrong document, HTML MIME, and unbounded entries',async()=>{
 for(const text of ['<!DOCTYPE rss [<!ENTITY xx "bad">]>'+rss,'<html><item><link>https://a.co</link></item></html>',
  '<rss><channel>'+Array.from({length:1001},()=>`<item><link>https://${host}/reviews/f</link></item>`).join('')+'</channel></rss>']){
  const x=await feed('rss','/rss.xml',response(text));assert.equal(x.status,'blocked');assert.equal(x.urls.length,0);
 }
 assert.equal((await feed('rss','/rss.xml',response(rss,undefined,true))).status,'blocked');
});
test('No leap from URL to verified product; correct digest and cached second call',async()=>{
 const transport=response(rss);const options={question:'I need football boots for AG pitches',registry:registry('rss','/rss.xml'),
  asOf,mode:'synthetic_fixture' as const,fixtureTransport:transport};
 const x=await runAutonomousDiscovery220(options);
 assert.deepEqual(x.networkRequests,[`https://${host}/robots.txt`,`https://${host}/rss.xml`]);
 assert.equal(x.candidates.length,2);assert.equal(x.independentEvidenceVerified,false);assert.equal(x.rankingAuthorized,false);
 assert.equal(x.sourceOutcomes[0].feedSha256,createHash('sha256').update(rss).digest('hex'));
 assert.equal(x.sourceOutcomes[0].sitemapSha256,null);
 const y=await runAutonomousDiscovery220({...options,question:'Which soccer cleats work for AG pitches?',
 asOf:'2026-10-13T18:00:00.000Z',checkpoint:x.checkpoint});
 assert.equal(y.networkRequests.length,0);assert.equal(y.candidates.length,2);
 assert.equal(y.decision,'cached_candidates_pending_identity_and_evidence');
});
test('Both new source types flow through same worker, cannot affect unrelated category',async()=>{
 const x=await runAutonomousDiscovery220({question:'I need a recycling bin for paper and plastic',
  registry:registry('atom','/atom.xml'),asOf,mode:'synthetic_fixture',fixtureTransport:response(atom)});
 assert.equal(x.networkRequests.length,0);assert.equal(x.candidates.length,0);
 const y=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',
  registry:registry('atom','/atom.xml'),asOf,mode:'synthetic_fixture',fixtureTransport:response(atom)});
 assert.equal(y.candidates.length,1);assert.equal(y.sourceOutcomes[0].status,'candidate_urls_found');
});
test('False raw-byte custody is never certified exact',async()=>{
 const tr:SourceTransport={async get(url,a,b){const x=await response(rss).get(url,a,b);return {...x,rawBytes:Buffer.from('not the returned body')};}};
 const x=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',
 registry:registry('rss','/rss.xml'),asOf,mode:'synthetic_fixture',fixtureTransport:tr});
 assert.equal(x.sourceOutcomes[0].byteExact,false);assert.equal(x.sourceOutcomes[0].feedSha256,null);
});
test('Untrusted checkpoint cannot restore revoked watch permissions',async()=>{
 const reg=registry('rss','/rss.xml');
 const first=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',
  registry:reg,asOf,mode:'synthetic_fixture',fixtureTransport:response(rss)});
 const disabled={...reg,sources:reg.sources.map(s=>({...s,watch:{...s.watch,rightsClearedForMetadata:false}}))};
 const second=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',
  registry:disabled,asOf:'2026-10-13T18:00:00.000Z',mode:'synthetic_fixture',
  fixtureTransport:response(rss),checkpoint:first.checkpoint});
 assert.equal(second.networkRequests.length,0);assert.equal(second.candidates.length,0);
});
test('Changing an approved feed path does not reuse old-path URL candidates',async()=>{
 const first=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',
  registry:registry('rss','/rss.xml'),asOf,mode:'synthetic_fixture',fixtureTransport:response(rss)});
 const changed=registry('rss','/new-rss.xml');
 // Simulate new feed not responding: new source cannot inherit old URL leads
 const tr:SourceTransport={async get(url,a,b){if(url.endsWith('/new-rss.xml'))throw Error('offline');return response(rss).get(url,a,b);}};
 const second=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',
  registry:changed,asOf:'2026-10-13T18:00:00.000Z',mode:'synthetic_fixture',
  fixtureTransport:tr,checkpoint:first.checkpoint});
 assert.equal(second.candidates.length,0);
 assert.ok(second.networkRequests.some(x=>x.endsWith('/new-rss.xml')));
});
test('Existing Phase82 cadence respected; no forced extra fetch after 25 hours',async()=>{
 const first=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',
  registry:registry('rss','/rss.xml'),asOf,mode:'synthetic_fixture',fixtureTransport:response(rss)});
 // On an unchanged feed the next scheduled check is at least 48 hours (core tier)
 const second=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',
  registry:registry('rss','/rss.xml'),asOf:'2026-10-14T18:00:00.000Z',mode:'synthetic_fixture',
  fixtureTransport:response(rss),checkpoint:first.checkpoint});
 assert.equal(second.networkRequests.length,0);
 assert.equal(second.candidates.length,0); // expired 24h URL cache != evidence stop
});
