import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {readCrossCategoryObservations144,type ObservationGraph144} from '../src/phase144_cross_category_observation_graph.js';
import type {ReaderInput139} from '../src/phase139_unmarked_english_candidate_reader.js';
const sha=(t:string)=>createHash('sha256').update(t).digest('hex');
const raw=JSON.parse(readFileSync('research/phase143_cross_category_sources.json','utf8')) as {
 items:{id:string;url:string;text:string;reviewedProductId:string;reviewedVariantId:string;aliases:string[]}[]};
const input=(t:string,aliases=['Aster X2']):ReaderInput139=>({document:{text:t,sha256:sha(t),
 source:{id:'s144',originalDocumentId:'d144',url:'https://reviews.example/aster-x2',
 title:'Constructed linguistic test, not professional evidence',role:'original_product_test'}},
 pageIdentity:{reviewedProductId:'aster_x2',reviewedVariantId:'x2',reviewedAliases:aliases}});
const run=(t:string,aliases=['Aster X2'])=>readCrossCategoryObservations144(input(t,aliases));
const original=(i:number)=>{const x=raw.items[i];const req=input(x.text,x.aliases);
 req.document.source.id=x.id;req.document.source.originalDocumentId='doc_'+x.id;
 req.document.source.url=x.url;req.pageIdentity={reviewedProductId:x.reviewedProductId,
 reviewedVariantId:x.reviewedVariantId,reviewedAliases:x.aliases};return readCrossCategoryObservations144(req);};
function receipts(t:string,r:ObservationGraph144){for(const o of r.observations){
 for(const s of [o.evidence,o.quantity,o.modeOrSetting,o.condition,o.sourceSubject,o.outcomeEndpoint]){
  if(!s)continue;
  assert.equal(t.slice(s.start,s.end),s.literal);assert.equal(sha(s.literal),s.sha256);
 }
 assert.equal(o.canonicalWriteAuthorized,false);assert.equal(o.rankingAuthorized,false);
 assert.equal(o.measuredProductAuthenticated,false);assert.equal(o.sourceAuthenticated,false);
}}
test('six previously exposed professional excerpts yield 12 typed quantity candidates (not facts)',()=>{
 const all=raw.items.map((x,i)=>original(i));
 assert.deepEqual(all.map(r=>r.observations.length),[1,2,3,2,2,2]);
 assert.equal(all.reduce((n,r)=>n+r.observations.length,0),12);
 for(let i=0;i<all.length;i++)receipts(raw.items[i].text,all[i]);
});
test('washed laundry cycle is not treated as product identity',()=>{
 const r=original(1);assert.equal(r.observations[0].modeOrSetting?.literal,'Heavy Duty cycle');
 assert.equal(r.observations[0].sourceSubject,null);
 assert.equal(r.observations[0].quantity.literal,'79.8%');
 assert.equal(r.observations[0].outcomeEndpoint?.literal,'of stains');
 assert.equal(r.observations[0].status,'subject_unresolved');
});
test('next sentence cannot automatically inherit previous cycle endpoint',()=>{
 const r=original(1);assert.equal(r.observations[1].modeOrSetting?.literal,'Normal cycle');
 assert.equal(r.observations[1].status,'endpoint_unresolved');
 assert.equal(r.observations[1].outcomeEndpoint,null);
});
test('ordered respectively measurements preserve modes separately and not as product identities',()=>{
 const r=original(2);assert.deepEqual(r.observations.map(o=>o.modeOrSetting?.literal),['Auto','Normal','Speed 60']);
 assert.ok(r.observations.every(o=>o.assignment==='ordinal_respectively'&&o.status==='endpoint_unresolved'));
});
test('respectively mismatch cannot fabricate alignment',()=>{
 const r=run('The Auto, Normal, and Speed modes scored 90% and 78%, respectively.');
 assert.ok(r.observations.every(o=>o.assignment!=='ordinal_respectively'));
});
test('observed air purifier noise is not assigned to older comparator',()=>{
 const r=original(3);assert.equal(r.observations[0].condition?.literal,'at Turbo speed');
 assert.equal(r.observations[1].status,'comparator_unresolved');
 assert.equal(r.observations[1].condition,null);assert.equal(r.observations[1].reporting,'unknown');
});
test('manufacturer battery runtime not equal to measured runtime',()=>{
 const r=original(4);assert.equal(r.observations[0].status,'claim_only');
 assert.equal(r.observations[0].reporting,'manufacturer_claim');
 assert.equal(r.observations[0].quantity.value,60);
 assert.equal(r.observations[1].reporting,'test_or_reviewer_report');
 assert.equal(r.observations[1].quantity.unit,'hours_and_minutes');
 assert.equal(r.observations[1].quantity.value,54+43/60);
 assert.equal(r.observations[1].sourceSubject,null);
 assert.equal(r.observations[1].status,'subject_unresolved');
});
test('screen brightness inside test is not a battery runtime result',()=>{
 const r=original(5);assert.equal(r.observations[0].quantity.literal,'150 cd/m²');
 assert.equal(r.observations[0].status,'setting_not_outcome');
 assert.equal(r.observations[1].quantity.literal,'24 hours');
 assert.equal(r.observations[1].quantity.qualifier,'lower_bound');
 assert.equal(r.observations[1].condition?.literal,'in our Wi-Fi test');
 assert.equal(r.observations[1].status,'candidate_quarantined');
});
test('cost per unnamed cycle retains its uncertainty',()=>{
 const r=original(0);assert.equal(r.observations[0].quantity.role,'operating_cost');
 assert.equal(r.observations[0].quantity.literal,'44p');
 assert.equal(r.observations[0].condition?.literal,'this cycle');
 assert.equal(r.observations[0].status,'subject_unresolved');
});
test('units do not prove a device has a feature',()=>{
 const r=run('The appliance reported 99.2%.');assert.equal(r.observations[0].status,'endpoint_unresolved');
 assert.equal(r.canonicalWriteAuthorized,false);
});
test('page title alias cannot authenticate unnamed product',()=>{
 const r=run('The device achieved 52.9 dBA at Turbo speed.');
 assert.equal(r.observations[0].subjectIdentity,'page_hint_unverified');
 assert.equal(r.observations[0].measuredProductAuthenticated,false);
});
test('manufacturer claim and test result in one sentence remain separate',()=>{
 const r=run('The brand claims 36 hours of playback, but we measured 29 hours.');
 assert.equal(r.observations.length,2);
 assert.deepEqual(r.observations.map(o=>o.reporting),['manufacturer_claim','test_or_reviewer_report']);
});
test('a new product domain is not silently substituted for washer-specific rules',()=>{
 const r=run('The Aster X2 recorded 42 dBA at Quiet speed.');
 assert.equal(r.observations[0].quantity.role,'acoustic_level');
 assert.equal(r.observations[0].condition?.literal,'at Quiet speed');
});
test('a measured TV luminance under HDR mode is not a screen-brightness test parameter',()=>{
 const r=run('The Aster X2 reached 412 cd/m² in HDR mode.');
 assert.equal(r.observations[0].quantity.role,'screen_luminance');
 assert.notEqual(r.observations[0].status,'setting_not_outcome');
});
test('an unexplained luminance figure cannot establish product brightness',()=>{
 const r=run('The Aster X2: 412 cd/m².');
 assert.equal(r.observations[0].status,'endpoint_unresolved');
});
test('lower bound and approximate values stay qualified',()=>{
 const a=run('The Aster X2 lasted more than 24 hours.');
 assert.equal(a.observations[0].quantity.qualifier,'lower_bound');
 const b=run('The Aster X2 lasted about 20 hours.');
 assert.equal(b.observations[0].quantity.qualifier,'about');
});
test('multiple unrelated measurements are kept separate',()=>{
 const r=run('The Aster X2 hit 42 dBA and lasted 24 hours.');
 assert.deepEqual(r.observations.map(o=>o.quantity.role),['acoustic_level','duration']);
});
test('unmarked no-quantity document is not evidence that a feature is absent',()=>{
 const r=run('The Aster X2 is quiet.');assert.equal(r.observations.length,0);
 assert.equal(r.noCandidateMeaning,'nothing_extracted_not_absence_of_feature');
});
test('source content hash must match before extraction',()=>{
 const a=input('The Aster X2 lasted 20 hours.');a.document.sha256='0'.repeat(64);
 assert.throws(()=>readCrossCategoryObservations144(a),/invalid_document_or_bounds_139/);
});
test('source URL required by upstream provenance gate',()=>{
 const a=input('The Aster X2 lasted 20 hours.');a.document.source.url='http://bad.local';
 assert.throws(()=>readCrossCategoryObservations144(a));
});
test('bounds cause explicit incomplete-coverage status, not silent truncation',()=>{
 const r=readCrossCategoryObservations144(input('The Aster X2 lasted 20 hours and hit 42 dBA.'),1);
 assert.equal(r.observations.length,1);assert.equal(r.coverageTruncated,true);
 assert.ok(r.truncationReasons.includes('observation_limit'));
});
test('invalid budget is rejected',()=>{
 for(const n of [0,-1,1.5,301])assert.throws(()=>readCrossCategoryObservations144(input('The Aster X2 lasted 20 hours.'),n));
});
test('duplicate page aliases and permutation cannot change measurements',()=>{
 const t='The Aster X2 lasted 20 hours.';
 const a=run(t,['Aster X2','Other Q5']).observations.map(x=>[x.quantity,x.status]);
 const b=run(t,['Other Q5','Aster X2']).observations.map(x=>[x.quantity,x.status]);
 assert.deepEqual(a,b);
});
test('does not mistake 60 in a model name for a 60-hour battery observation',()=>{
 const r=run('The Speed 60 cycle removed 85% of stains.');
 assert.deepEqual(r.observations.map(x=>x.quantity.literal),['85%']);
});
test('decimal point stays inside original sentence',()=>{
 const r=run('The Aster X2 measured 51.2 dBA after 2.5 hours.');
 assert.equal(r.observations.length,2);assert.equal(r.observations[0].sentenceId,r.observations[1].sentenceId);
});
test('page identity and unknown cross-category references never promote ranking',()=>{
 const r=original(0);assert.equal(r.canonicalWriteAuthorized,false);assert.equal(r.rankingAuthorized,false);
 assert.equal(r.independentGoldAnnotations,0);assert.equal(r.accuracy,null);
 assert.ok(r.observations.every(o=>o.scientificReviewRequired));
});
