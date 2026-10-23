import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runAutonomousDiscovery220,interpretForDiscovery220,emptyCheckpoint220,type Registry220} from '../src/phase220_autonomous_discovery_worker.js';
import type {SourceTransport} from '../src/approved_web_reader.js';
const base=JSON.parse(readFileSync('docs/phase220/phase220-category-vocabulary.json','utf8')) as Registry220;
const asOf='2026-10-13T17:00:00.000Z';
const host='brand-fixture.co.uk';
const policy={sourceId:'fixture_newsroom',host,basis:'written_permission' as const,
 rightsDocumentId:'synthetic_permission_record',rightsDocumentUrl:`https://${host}/rights`,
 reviewedBy:'synthetic_test_reviewer',reviewedAt:'2026-10-12T12:00:00.000Z',validUntil:'2027-10-13T12:00:00.000Z',
 permittedOperations:['metadata_discovery' as const],robots:'allowed' as const,
 robotsCheckedAt:asOf,websiteTerms:'reviewed_permitted' as const,termsCheckedAt:asOf,commercialUseReviewed:true};
const watch={id:'fixture_newsroom',categoryId:'football_footwear',host,
 channel:'manufacturer_newsroom' as const,mechanism:'sitemap_delta' as const,tier:'core' as const,
 rightsClearedForMetadata:true,nextCheckAt:'2026-10-13T17:00:00.000Z',lastCheckAt:null,
 quietChecks:0,errors:0};
const registry:Registry220={...base,sources:[{watch,sitemapPath:'/sitemap.xml',pathPrefix:'/products/'}],policies:[policy]};
const response=(url:string):any=>url.endsWith('/robots.txt')?
 {status:200,finalUrl:url,contentType:'text/plain',body:'User-agent: *\nAllow: /\n',rawBytes:Buffer.from('User-agent: *\nAllow: /\n')}:
 {status:200,finalUrl:url,contentType:'application/xml',
  body:`<?xml version="1.0"?><urlset><url><loc>https://${host}/products/boots-z</loc></url><url><loc>https://${host}/other/out-of-scope</loc></url></urlset>`,
  rawBytes:Buffer.from(`<?xml version="1.0"?><urlset><url><loc>https://${host}/products/boots-z</loc></url><url><loc>https://${host}/other/out-of-scope</loc></url></urlset>`)};
const fixtureTransport:SourceTransport={async get(url){return response(url);}};
test('synthetic English paraphrases normalize to identical bounded intent',()=>{
 const a=interpretForDiscovery220('I need football boots for AG pitches',base.vocabulary);
 const b=interpretForDiscovery220('Which soccer cleats work for AG pitches?',base.vocabulary);
 assert.equal(a.status,'bounded_category_hypothesis');assert.equal(a.key,b.key);
 const c=interpretForDiscovery220('A recycling bin for paper and plastic',base.vocabulary);
 const d=interpretForDiscovery220('Need waste sorting bins for plastic and paper',base.vocabulary);
 assert.equal(c.key,d.key);assert.notEqual(c.key,a.key);
});
test('missing essential or unclear surface requests one clarification, no web access',async()=>{
 const a=await runAutonomousDiscovery220({question:'I need football boots for artificial grass',registry,asOf,mode:'synthetic_fixture',fixtureTransport});
 assert.equal(a.intent.status,'needs_clarification');assert.equal(a.networkRequests.length,0);
 const b=await runAutonomousDiscovery220({question:'Help me choose recycling bins',registry,asOf,mode:'synthetic_fixture',fixtureTransport});
 assert.equal(b.decision,'clarification_needed');assert.equal(b.networkRequests.length,0);
});
test('synthetic transport executes Phase82 -> Phase75 sitemap -> provenance URL receipts; no ranking',async()=>{
 const x=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',registry,asOf,
  mode:'synthetic_fixture',fixtureTransport,checkpoint:emptyCheckpoint220()});
 assert.equal(x.networkRequests.length,2);
 assert.deepEqual(x.networkRequests,[`https://${host}/robots.txt`,`https://${host}/sitemap.xml`]);
 assert.equal(x.candidates.length,1);assert.equal(x.candidates[0].verification,'unverified_url_only');
 assert.equal(x.sourceOutcomes[0].byteExact,true);
 assert.match(x.sourceOutcomes[0].sitemapSha256!,/^[a-f0-9]{64}$/);
 assert.equal(x.independentEvidenceVerified,false);assert.equal(x.rankingAuthorized,false);
 assert.equal(x.checkpoint.observations.length,1);
});
test('same recent successful snapshot is reused without extra requests or pretending facts exist',async()=>{
 const x=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',registry,asOf,
  mode:'synthetic_fixture',fixtureTransport});
 const y=await runAutonomousDiscovery220({question:'Which soccer cleats work for AG pitches?',registry,
  asOf:'2026-10-13T18:00:00.000Z',checkpoint:x.checkpoint,mode:'synthetic_fixture',fixtureTransport});
 assert.equal(y.networkRequests.length,0);assert.equal(y.candidates.length,1);
 assert.equal(y.decision,'cached_candidates_pending_identity_and_evidence');
});
test('rights not cleared means no I/O, even with due watch metadata',async()=>{
 const blocked={...registry,policies:[]};
 const x=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',registry:blocked,asOf,
  mode:'synthetic_fixture',fixtureTransport});
 assert.equal(x.networkRequests.length,0);
 assert.equal(x.sourceOutcomes[0].status,'blocked');
 assert.equal(x.candidates.length,0);
});
test('simulated rights are not usable to inject a fixture transport into live mode',async()=>{
 await assert.rejects(runAutonomousDiscovery220({question:'I need football boots for AG pitches',registry,
  asOf,mode:'live',fixtureTransport}),/test_transport_boundary/);
});
test('recycling bins go through same configurable engine without matching an unrelated source',async()=>{
 const x=await runAutonomousDiscovery220({question:'I need a recycling bin for paper and plastic',registry,asOf,
  mode:'synthetic_fixture',fixtureTransport});
 assert.equal(x.intent.categoryId,'recycling_bins');assert.equal(x.networkRequests.length,0);
 assert.equal(x.decision,'awaiting_authorized_sources');
});
test('disabled authorization invalidates reuse of cached URL leads',async()=>{
 const x=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',registry,asOf,
  mode:'synthetic_fixture',fixtureTransport});
 const y=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',
  registry:{...registry,policies:[],sources:[{...registry.sources[0],watch:{...watch,rightsClearedForMetadata:false}}]},
  asOf:'2026-10-13T18:00:00.000Z',checkpoint:x.checkpoint,mode:'synthetic_fixture',fixtureTransport});
 assert.equal(y.candidates.length,0);assert.equal(y.networkRequests.length,0);
});
test('failed permission does not trigger repeated immediate attempts while Phase82 backoff applies',async()=>{
 const blocked={...registry,policies:[]};
 const a=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',registry:blocked,asOf,
  mode:'synthetic_fixture',fixtureTransport});
 const b=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',registry:blocked,
  asOf:'2026-10-13T17:30:00.000Z',checkpoint:a.checkpoint,mode:'synthetic_fixture',fixtureTransport});
 assert.equal(b.networkRequests.length,0);assert.equal(b.plannedSourceIds.length,0);
});
test('unimplemented watch mechanism remains explicitly blocked, never disguised as sitemap',async()=>{
 const r:Registry220={...registry,sources:[{...registry.sources[0],watch:{...watch,mechanism:'websub'}}]};
 const x=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',registry:r,
  asOf,mode:'synthetic_fixture',fixtureTransport});
 assert.equal(x.sourceOutcomes[0].status,'blocked');
 assert.deepEqual(x.sourceOutcomes[0].reasonCodes,['mechanism_worker_unavailable']);
 assert.equal(x.networkRequests.length,0);
});
test('tampered cached URL cannot inject cross-host candidate',async()=>{
 const checkpoint=emptyCheckpoint220();
 const fake={...checkpoint,observations:[{categoryId:'football_footwear',sourceId:'fixture_newsroom',checkedAt:asOf,
  status:'candidate_urls_found' as const,urls:['https://attack-fixture.co.uk/fake-model'],sitemapSha256:null,byteExact:false,mechanism:'sitemap_delta' as const,discoveryPath:'/sitemap.xml'}]};
 const x=await runAutonomousDiscovery220({question:'I need football boots for AG pitches',registry,
  asOf:'2026-10-13T18:00:00.000Z',checkpoint:fake,mode:'synthetic_fixture',fixtureTransport});
 assert.ok(!x.candidates.some(c=>c.url.includes('attack-fixture.co.uk')));
});
