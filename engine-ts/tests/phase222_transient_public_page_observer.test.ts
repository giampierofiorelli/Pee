import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractDeclaredPageIdentity222,observeDiscoveredPages222,type Observation222} from '../src/phase222_transient_public_page_observer.js';
import {runAutonomousDiscovery220,type Registry220,type Run220} from '../src/phase220_autonomous_discovery_worker.js';
import type {SourceTransport} from '../src/approved_web_reader.js';
import type {WebSourcePolicy} from '../src/web_evidence_acquisition.js';

const asOf='2026-10-13T18:00:00.000Z',host='fictional-specialists.co.uk',sourceId='test_editorial';
const base:Registry220=JSON.parse(readFileSync('docs/phase220/phase220-category-vocabulary.json','utf8'));
const rights:WebSourcePolicy={sourceId,host,basis:'written_permission',rightsDocumentId:'FICTION_ONLY',
 rightsDocumentUrl:`https://${host}/legal`,reviewedBy:'FICTIONAL_REVIEWER',reviewedAt:asOf,
 validUntil:'2027-10-13T18:00:00.000Z',permittedOperations:['metadata_discovery'],robots:'allowed',
 robotsCheckedAt:asOf,websiteTerms:'reviewed_permitted',termsCheckedAt:asOf,commercialUseReviewed:true};
const registry:Registry220={...base,sources:[{watch:{id:sourceId,categoryId:'football_footwear',
 host,channel:'specialist_editorial',mechanism:'rss',tier:'core',rightsClearedForMetadata:true,
 nextCheckAt:asOf,lastCheckAt:null,quietChecks:0,errors:0},
 sitemapPath:'/sitemap.xml',feedPath:'/feed.xml',pathPrefix:'/reviews/'}],policies:[rights]};
const productUrl=`https://${host}/reviews/boots-ag`,articleUrl=`https://${host}/reviews/test-of-boots`;
const feed=`<?xml version="1.0"?><rss><channel><item><link>${productUrl}</link></item>
<item><link>${articleUrl}</link></item></channel></rss>`;
const productPage=`<!doctype html><html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product", "name":"Boot A AG",
 "brand":{"@type":"Brand","name":"Fictional Boot Company"},"model":"AG-100","sku":"AG100"}</script>
</head><body>SECRET_UNLICENSED_FULL_ARTICLE_DO_NOT_STORE</body></html>`;
const articlePage=`<html><head><script type='application/ld+json'>
{"@context":"https://schema.org","@type":"Review","datePublished":"2026-10-01"}
</script></head><body>SECRET_FULL_REVIEW_BODY_DO_NOT_STORE</body></html>`;
function fixture(config:{robots?:string;robotsStatus?:number;pageStatus?:number;pageMime?:string;wrongFinal?:boolean;missingRawBytes?:boolean;}={}):SourceTransport{
 return {async get(url){
  const robot=url.endsWith('/robots.txt');const xml=url.endsWith('/feed.xml');
  const body=robot?(config.robots??'User-agent: *\nAllow: /\n'):xml?feed:url===productUrl?productPage:articlePage;
  return {status:robot?(config.robotsStatus??200):xml?200:(config.pageStatus??200),
   finalUrl:config.wrongFinal&&!robot&&!xml?`${url}?redirect=1`:url,
   body,rawBytes:config.missingRawBytes?undefined:Buffer.from(body),
   contentType:robot?'text/plain':xml?'application/xml':(config.pageMime??'text/html')};
 }};
}
async function discovered():Promise<Run220>{
 return runAutonomousDiscovery220({question:'I need football boots for AG pitches',registry,asOf,
  mode:'synthetic_fixture',fixtureTransport:fixture()});
}
const observe=async(config:Parameters<typeof fixture>[0]={},other:Partial<Parameters<typeof observeDiscoveredPages222>[0]>={})=>
 observeDiscoveredPages222({run:await discovered(),registry,observedAt:asOf,
  mode:'synthetic_fixture',fixtureTransport:fixture(config),...other});

test('Normal English need -> Phase221 discovery -> Phase222 transient public page metadata, no article copy or ranking',async()=>{
 const x=await observe();assert.equal(x.receipts.length,2);
 assert.equal(x.identityLeadCount,2);assert.equal(x.noSourceBodiesStored,true);
 assert.equal(x.rankingAuthorized,false);assert.equal(x.independentEvidenceVerified,false);
 assert.deepEqual(x.receipts[0].productLeads,[{name:'Boot A AG',brand:'Fictional Boot Company',model:'AG-100',sku:'AG100'}]);
 assert.equal(x.receipts[0].identityNextAction,'verify_exact_variant');
 assert.equal(x.receipts[1].publicationLeads[0].kind,'Review');
 assert.equal(x.receipts[1].identityNextAction,'inspect_original_publication');
 assert.equal(x.receipts[0].byteExact,true);assert.equal(x.receipts[0].responseSha256?.length,64);
 const serialized=JSON.stringify(x);assert.equal(serialized.includes('SECRET_'),false);
 assert.equal(serialized.includes('<html'),false);assert.equal(serialized.includes('SECRET_FULL_REVIEW_BODY'),false);
 assert.equal(x.networkRequests.length,4);
});
test('No per-website individual permission is required for transient public reading, but uncertainty is recorded',async()=>{
 const x=await observe();assert.ok(x.receipts.every(r=>r.reasonCodes.includes('terms_not_reviewed_no_licence_claim')));
 assert.equal(x.receipts.filter(r=>r.status==='metadata_observed').length,2);
});
test('Explicit terms prohibition or login requirement blocks before network I/O',async()=>{
 for(const restriction of ['explicitly_prohibited','login_required'] as const){
  const x=await observe({}, {sourceRestrictions:{[sourceId]:restriction}});
  assert.equal(x.networkRequests.length,0);assert.equal(x.blockedCount,2);
  assert.equal(x.receipts[0].reasonCodes[0],restriction);
 }
});
test('Existing registry terms or robots prohibition cannot be overridden by an optimistic source flag',async()=>{
 const run=await discovered();
 for(const edit of [{websiteTerms:'reviewed_prohibited' as const},{robots:'disallowed' as const}]){
  const blocked={...registry,policies:[{...rights,...edit}]};
  const x=await observeDiscoveredPages222({run,registry:blocked,observedAt:asOf,
   sourceRestrictions:{[sourceId]:'no_known_restriction'},mode:'synthetic_fixture',fixtureTransport:fixture()});
  assert.equal(x.networkRequests.length,0);assert.equal(x.identityLeadCount,0);
 }
});
test('Robots.txt disallow blocks page GET, including feed URL lead',async()=>{
 const x=await observe({robots:'User-agent: *\nDisallow: /reviews/\n'});
 assert.equal(x.blockedCount,2);assert.equal(x.networkRequests.length,2);
 assert.ok(x.receipts.every(r=>r.reasonCodes.includes('robots_denied')));
});
test('Robots 404/410 permits public crawl under RFC 9309; 5xx and network ambiguity do not',async()=>{
 for(const status of [404,410]){
  const x=await observe({robotsStatus:status});assert.equal(x.identityLeadCount,2);
  assert.ok(x.receipts[0].reasonCodes.includes('robots_absent_4xx_rfc9309'));
 }
 for(const status of [500,403]){
  const x=await observe({robotsStatus:status});assert.equal(x.identityLeadCount,0);
  assert.equal(x.networkRequests.length,2);
 }
});
test('Bad content type, HTTP status or nonidentical final URL block page metadata',async()=>{
 for(const param of [{pageStatus:404},{pageMime:'application/pdf'},{wrongFinal:true}]){
  const x=await observe(param);assert.equal(x.identityLeadCount,0);
  assert.ok(x.receipts.every(r=>r.reasonCodes.includes('page_status_url_or_type_rejected')));
 }
});
test('A byte hash is only certified for the exact bytes actually supplied',async()=>{
 const x=await observe({missingRawBytes:true});assert.equal(x.identityLeadCount,2);
 assert.ok(x.receipts.every(r=>r.responseSha256===null&&r.byteExact===false));
});
test('Malformed or missing JSON-LD never becomes a product identity',()=>{
 for(const html of ['<html><body>Boot A has a manufacturer and AG plate</body></html>',
  '<html><script type="application/ld+json">{bad JSON}</script></html>',
  '<html><script type="application/ld+json">{"@type":"Product","name":"<script>"}</script></html>']){
  const x=extractDeclaredPageIdentity222(html);assert.equal(x.productLeads.length,0);
 }
});
test('JSON-LD @graph and reviewed item can be seen as declaration only',()=>{
 const html='<html><script type="application/ld+json">'+JSON.stringify({'@graph':[
  {'@type':'Review',itemReviewed:{'@type':'Product',name:'Synthetic Recycling Bin',model:'RB-2'}}]})+'</script></html>';
 const x=extractDeclaredPageIdentity222(html);assert.equal(x.productLeads[0].model,'RB-2');
 assert.equal(x.publicationLeads[0].kind,'Review');
});
test('Strict fixture/live transport boundary and budgets',async()=>{
 const run=await discovered();
 await assert.rejects(()=>observeDiscoveredPages222({run,registry,observedAt:asOf,
  mode:'live',fixtureTransport:fixture()}),/phase222_test_transport_boundary/);
 await assert.rejects(()=>observeDiscoveredPages222({run,registry,observedAt:asOf,
  mode:'synthetic_fixture',fixtureTransport:fixture(),maxPages:21}),/phase222_budget_invalid/);
 const x=await observe({}, {maxPages:1});assert.equal(x.receipts.length,1);
});
test('Different category query cannot inherit football page candidates',async()=>{
 const run=await runAutonomousDiscovery220({question:'I need a recycling bin for paper and plastic',
  registry,asOf,mode:'synthetic_fixture',fixtureTransport:fixture()});
 const x=await observeDiscoveredPages222({run,registry,observedAt:asOf,
  mode:'synthetic_fixture',fixtureTransport:fixture()});
 assert.equal(x.networkRequests.length,0);assert.equal(x.receipts.length,0);
});
test('Recycling-bin generalisation: publisher product metadata never becomes verified compartment capacity',async()=>{
 const binsHtml='<html><script type="application/ld+json">'+JSON.stringify({
  '@type':'Product',name:'Fictional Sorter 60L',brand:'Example Homeware',model:'SORT-60',
  description:'Two compartments: maker advertises 60 litres total capacity'})+'</script></html>';
 const binHost='fictional-bins.co.uk';
 const binsUrl=`https://${binHost}/products/sorter-60`;
 const binRegistry:Registry220={...base,sources:[],policies:[]};
 const binRun=await runAutonomousDiscovery220({question:'I need a recycling bin for paper and plastic',
  registry:binRegistry,asOf,mode:'synthetic_fixture',fixtureTransport:fixture()});
 const sourced={...binRegistry,sources:[{watch:{...registry.sources[0].watch,
  id:'test_bins',categoryId:'recycling_bins',host:binHost},
  sitemapPath:'/sitemap.xml',feedPath:'/feed.xml',pathPrefix:'/products/'}]};
 const candidateRun={...binRun,candidates:[{sourceId:'test_bins',url:binsUrl,
  verification:'unverified_url_only' as const}]};
 const x=await observeDiscoveredPages222({run:candidateRun,registry:sourced,observedAt:asOf,
  mode:'synthetic_fixture',fixtureTransport:{async get(url){const robots=url.endsWith('/robots.txt');
   const body=robots?'User-agent: *\nAllow: /\n':binsHtml;
   return {status:200,finalUrl:url,contentType:robots?'text/plain':'text/html',body,
    rawBytes:Buffer.from(body)};}}});
 assert.equal(x.identityLeadCount,1);
 assert.equal(x.receipts[0].productLeads[0].model,'SORT-60');
 assert.equal('capacity' in x.receipts[0].productLeads[0],false);
 assert.equal(x.rankingAuthorized,false);
 assert.equal(JSON.stringify(x).includes('Two compartments'),false);
});
test('URL scope mismatch or malicious checkpoint-derived leads cannot force an HTTP request',async()=>{
 const run=await discovered();const forged={...run,candidates:[
  {sourceId,verification:'unverified_url_only' as const,url:'https://127.0.0.1/private'},
  {sourceId,verification:'unverified_url_only' as const,url:`https://${host}/admin/secret`},
  ...run.candidates]};
 const x=await observeDiscoveredPages222({run:forged,registry,observedAt:asOf,
  mode:'synthetic_fixture',fixtureTransport:fixture()});
 assert.equal(x.identityLeadCount,2);assert.ok(x.networkRequests.every(u=>u.startsWith(`https://${host}/`)));
});
test('Paraphrases with same canonical category and use constraints yield identical metadata observations',async()=>{
 const a=await discovered();const b=await runAutonomousDiscovery220({question:'Which soccer cleats work for AG pitches?',
  registry,asOf,mode:'synthetic_fixture',fixtureTransport:fixture()});
 const left=await observeDiscoveredPages222({run:a,registry,observedAt:asOf,
  mode:'synthetic_fixture',fixtureTransport:fixture()});
 const right=await observeDiscoveredPages222({run:b,registry,observedAt:asOf,
  mode:'synthetic_fixture',fixtureTransport:fixture()});
 assert.deepEqual(left.receipts,right.receipts);
});
