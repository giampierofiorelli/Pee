import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planWebEvidenceAcquisition,type WebCandidate,type WebSourcePolicy} from '../src/web_evidence_acquisition.js';
import {readApprovedSource,robotsDecision,publicIPv4,type SourceTransport} from '../src/approved_web_reader.js';
const now='2026-10-10T19:00:00Z';
const candidate:WebCandidate={id:'source_one',sourceId:'lab',url:'https://measurements.example.org/dataset/test',
 exactVariantId:'headphone_variant_1',originalTestId:'original_test_one',lineageAttestationReference:'review_attestation_a',
 kind:'original_lab_data',publishedAt:null,updatedAt:null,metadataOrigin:'human_supplied'};
const policy:WebSourcePolicy={sourceId:'lab',host:'measurements.example.org',basis:'verified_open_licence',
 rightsDocumentId:'cc_by_evidence_one',rightsDocumentUrl:'https://creativecommons.org/licenses/by/4.0/',
 reviewedBy:'operator',reviewedAt:'2026-10-10T18:00:00Z',validUntil:'2026-11-10T18:00:00Z',
 permittedOperations:['metadata_discovery','page_retrieval','local_analysis','fact_storage','public_citation'],
 robots:'allowed',robotsCheckedAt:'2026-10-10T18:30:00Z',websiteTerms:'reviewed_permitted',
 termsCheckedAt:'2026-10-10T18:30:00Z',commercialUseReviewed:true};
const makePlan=(p=policy)=>planWebEvidenceAcquisition({exactVariantId:candidate.exactVariantId,
 userQuestion:'independent lab testing',asOf:now,maxDaysSinceCheck:7,candidates:[candidate],existing:[],policies:[p]});
const okTransport=(robotsText='User-agent: *\nAllow: /\n'):SourceTransport=>({
 async get(url){
  if(url.endsWith('/robots.txt'))return {status:200,finalUrl:url,contentType:'text/plain',body:robotsText};
  return {status:200,finalUrl:url,contentType:'text/plain',body:'Independently tested device measurements in controlled setting.'};
 }});
test('robots matching: disallow, specific agent, longest-prefix allow, unknown',()=>{
 assert.equal(robotsDecision('User-agent: *\nDisallow: /private','/private/one'),'deny');
 assert.equal(robotsDecision('User-agent: *\nDisallow: /private\nAllow: /private/public','/private/public/one'),'allow');
 assert.equal(robotsDecision('User-agent: *\nDisallow: /\nUser-agent: ProductEvidenceResearchBot\nAllow: /data','/data/ok'),'allow');
 assert.equal(robotsDecision('User-agent: ProductEvidenceResearchBot\nDisallow: /','/data'),'deny');
 assert.equal(robotsDecision('User-agent: OtherAgent\nAllow: /','/data'),'unknown');
});
test('unknown, reserved and private IPs do not pass outbound network filter',()=>{
 for(const ip of ['127.0.0.1','10.0.0.5','169.254.169.254','172.17.0.2','192.168.1.1',
  '100.64.1.1','198.18.0.1','203.0.113.10','255.255.255.255','8.8.8.999'])assert.equal(publicIPv4(ip),false,ip);
 assert.equal(publicIPv4('8.8.8.8'),true);
});
test('licence, robots and terms checked prior to page retrieval; no body returned',async()=>{
 const plan=makePlan();const calls:string[]=[];const underlying=okTransport();
 const transport:SourceTransport={async get(url,agent,limit){calls.push(url);return underlying.get(url,agent,limit);}};
 const result=await readApprovedSource({plan,queueItem:plan.items[0],candidate,policy,checkedAt:now,transport});
 assert.equal(result.status,'quarantined');assert.equal(calls.length,2);
 assert.ok(calls[0].endsWith('/robots.txt'));
 assert.equal(JSON.stringify(result).includes('Independently tested device'),false);
 if(result.status==='quarantined')assert.equal(result.evidence.rankingEligible,false);
});
test('robots disallow stops page IO even with rights',async()=>{
 let visits=0;
 const transport:SourceTransport={async get(url,agent,limit){visits++;return okTransport('User-agent: *\nDisallow: /dataset').get(url,agent,limit);}};
 const plan=makePlan();const result=await readApprovedSource({plan,queueItem:plan.items[0],candidate,policy,checkedAt:now,transport});
 assert.equal(result.status,'blocked');assert.equal(visits,1);
});
test('open licence without approved website terms cannot execute any IO',async()=>{
 const denied={...policy,websiteTerms:'unknown' as const};const plan=makePlan(denied);
 let calls=0;const transport:SourceTransport={async get(){calls++;throw Error('should never execute');}};
 const result=await readApprovedSource({plan,queueItem:plan.items[0],candidate,policy:denied,checkedAt:now,transport});
 assert.equal(result.status,'blocked');assert.equal(calls,0);
});
test('redirected or invalid robots response cannot be accepted',async()=>{
 const plan=makePlan();const transport:SourceTransport={async get(url,agent,limit){
  if(url.endsWith('robots.txt'))return {status:302,finalUrl:'https://other.example.org/robots.txt',contentType:'text/plain',body:''};
  throw Error('must not reach article');
 }};
 const result=await readApprovedSource({plan,queueItem:plan.items[0],candidate,policy,checkedAt:now,transport});
 assert.equal(result.status,'blocked');
});
test('rights expiration and stale policy reject previously scheduled plan',async()=>{
 const plan=makePlan();let calls=0;
 const transport:SourceTransport={async get(){calls++;throw Error('do not call');}};
 const result=await readApprovedSource({plan,queueItem:plan.items[0],candidate,policy,checkedAt:'2026-10-15T19:00:00Z',transport});
 assert.equal(result.status,'blocked');assert.equal(calls,0);
});
