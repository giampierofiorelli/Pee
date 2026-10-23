import test from 'node:test';
import assert from 'node:assert/strict';
import {planMarketWatch,nextMarketWatch,triageMarketSignals,type WatchSource,type MarketSignal} from '../src/phase82_market_watch.js';
const now='2026-10-10T18:00:00Z';
const base:WatchSource={id:'maker',categoryId:'headphones',host:'example.org',channel:'manufacturer_newsroom',
 mechanism:'rss',tier:'core',rightsClearedForMetadata:true,nextCheckAt:'2026-10-09T00:00:00Z',
 lastCheckAt:null,quietChecks:0,errors:0};
const signal:MarketSignal={sourceId:'s1',originalWorkId:'press-1',publisherId:'maker',productId:'headphone-45',categoryId:'headphones',
 kind:'manufacturer_announcement',lawfulMetadata:true,publisherIdentityVerified:true,productIdentityConfirmed:true,publishedAt:now};
const triage=(signals:MarketSignal[],products:{productId:string;categoryId:string;known:boolean;permanentlyDiscontinued:boolean}[]=[])=>
 triageMarketSignals({signals,knownProducts:products,knownCategoryIds:['headphones']});
test('source rights control: no monitoring call scheduled without reviewed metadata rights',()=>{
 const r=planMarketWatch({asOf:now,maxChecks:3,maxChecksPerHost:1,sources:[base,{...base,id:'blocked',host:'example.net',rightsClearedForMetadata:false}]});
 assert.deepEqual(r.selectedSourceIds,['maker']);assert.deepEqual(r.blockedSourceIds,['blocked']);assert.equal(r.actualNetworkRequests,0);
});
test('due dates and host budgets restrict requests',()=>{
 const r=planMarketWatch({asOf:now,maxChecks:2,maxChecksPerHost:1,sources:[base,
  {...base,id:'samehost',tier:'secondary'},
  {...base,id:'future',host:'future.org',nextCheckAt:'2026-11-01T00:00:00Z'},
  {...base,id:'review',host:'reviews.org',channel:'professional_test_feed'}]});
 assert.deepEqual(r.selectedSourceIds,['review','maker']);assert(r.deferredDueSourceIds.includes('samehost'));
});
test('exploration reserve prevents established brands from monopolising discovery',()=>{
 const sources:WatchSource[]=[...Array.from({length:6},(_,i)=>({...base,id:'brand'+i,host:'brand'+i+'.org'})),
 {...base,id:'small-brand',host:'small.org',channel:'specialist_community',tier:'exploration'}];
 const r=planMarketWatch({asOf:now,maxChecks:5,maxChecksPerHost:1,sources});
 assert.equal(r.selectedSourceIds.length,5);assert(r.selectedSourceIds.includes('small-brand'));
});
test('quiet feed gets longer intervals and a new item resets them',()=>{
 const quiet=nextMarketWatch({source:base,checkedAt:now,outcome:'unchanged',etag:'"abc"'});
 assert.equal(quiet.quietChecks,1);assert.equal(quiet.etag,'"abc"');
 const changed=nextMarketWatch({source:quiet,checkedAt:'2026-10-13T18:00:00Z',outcome:'changed'});
 assert.equal(changed.quietChecks,0);assert.equal(changed.nextCheckAt,'2026-10-14T18:00:00.000Z');
});
test('rate limits slow polling instead of retrying aggressively',()=>{
 const r=nextMarketWatch({source:base,checkedAt:now,outcome:'rate_limited'});
 assert(Date.parse(r.nextCheckAt)-Date.parse(now)>=72*3600000);
});
test('metadata-only run never claims it read product pages',()=>{
 const p=planMarketWatch({asOf:now,maxChecks:1,maxChecksPerHost:1,sources:[base]});assert.equal(p.actualNetworkRequests,0);
});
test('manufacturer press announcement means specs intake, not ranking',()=>{
 const p=triage([signal]).candidates[0];
 assert.equal(p.action,'collect_official_specs');assert.equal(p.rankingAuthorized,false);assert.equal(p.manufacturingRetirementAuthorized,false);
});
test('independent test triggers appraisal, not a recommendation',()=>{
 const p=triage([signal,{...signal,sourceId:'s2',originalWorkId:'test-1',kind:'independent_original_test',publisherId:'lab'}]).candidates[0];
 assert.equal(p.action,'review_independent_evidence');assert.equal(p.rankingAuthorized,false);
});
test('reprints of a press release do not multiply independent original works',()=>{
 const r=triage([signal,{...signal,sourceId:'s2',publisherId:'republisher'},{...signal,sourceId:'s3',publisherId:'another'}]);
 assert.equal(r.candidates[0].distinctOriginalWorks,1);assert.equal(r.deduplicatedReprints,2);
});
test('community mention creates discovery stub and no verified performance',()=>{
 const r=triage([{...signal,kind:'community_tip',publisherId:'community'}]);
 assert.equal(r.candidates[0].action,'retain_discovery_stub');assert.equal(r.candidates[0].priority,'exploratory');
});
test('unconfirmed model identity goes for identity verification first',()=>{
 const r=triage([{...signal,productIdentityConfirmed:false}]);assert.equal(r.candidates[0].action,'verify_identity');
});
test('unauthorized or unauthenticated signal is rejected',()=>{
 const r=triage([{...signal,lawfulMetadata:false},{...signal,sourceId:'s2',publisherIdentityVerified:false}]);
 assert.equal(r.candidates.length,0);assert.equal(r.rejectedSignalCount,2);
});
test('retirement signal requires verified separate lifecycle process',()=>{
 const r=triage([{...signal,kind:'manufacturer_discontinuation_notice'}]).candidates[0];
 assert.equal(r.action,'verify_official_discontinuation');assert.equal(r.manufacturingRetirementAuthorized,false);
});
test('discontinued models cannot reenter even if new sources appear',()=>{
 const r=triage([{...signal,kind:'independent_original_test'}],
 [{productId:signal.productId,categoryId:'headphones',known:true,permanentlyDiscontinued:true}]).candidates[0];
 assert.equal(r.action,'already_archived');assert.equal(r.priority,'none');
});
test('unknown category starts category research instead of false classification',()=>{
 const r=triage([{...signal,categoryId:'mattress-cleaners'}]).candidates[0];
 assert.equal(r.missingCategoryResearch,true);
});
test('CRLF in HTTP validators is rejected',()=>{
 assert.throws(()=>nextMarketWatch({source:base,checkedAt:now,outcome:'changed',etag:'ok\r\nInjected:yes'}));
});
test('invalid rate budgets are rejected',()=>assert.throws(()=>planMarketWatch({asOf:now,maxChecks:999999,maxChecksPerHost:1,sources:[base]})));
