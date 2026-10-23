import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {emptyLedger193,recordScreening193,lookupScreening193,validateLedger193,
 loadLedger193,saveLedger193,screenBatch193,draftFromLineage192,
 type SourceRevision193,type ScreeningDecision193} from '../src/phase193_screening_memory.js';
import type {LineageReport192} from '../src/phase192_lineage_marketplace_screen.js';
const digest=(x:string)=>createHash('sha256').update(x).digest('hex');
const source=(over:Partial<SourceRevision193>={}):SourceRevision193=>({
 sourceId:'affiliate_roundup',url:'https://buyer.example/top-vacuums/?utm_source=search',
 contentHash:digest('original document bytes 1'),contentBasis:'publisher_bytes',
 policyVersion:'marketplace-screen-v1',market:'uk',category:'vacuum',variantId:'rare_vacuum',
 field:'cleaning_performance',observedAt:'2026-10-01T10:00:00Z',
 classificationRevision:'reviewed-claim-origin-v1',...over});
const decision=(over:Partial<ScreeningDecision193>={}):ScreeningDecision193=>({
 source:source(),scope:'document',action:'discovery_only',reason:'marketplace_stars_without_original_test',
 reviewerId:'reviewer_x',reviewTicket:'PEE-REVIEW-193-001',reviewedAt:'2026-10-01T11:00:00Z',
 reviewBasis:'human_source_screen',
 evidenceNote:'The list uses marketplace stars without a traceable original controlled product test.',
 originalTestEventId:null,retainedCandidateVariantIds:['rare_vacuum'],...over});
const signed=(d=decision())=>recordScreening193(emptyLedger193(),d);
const lookup=(d=decision(),x=source())=>lookupScreening193(signed(d),x);
const clone=<T>(x:T)=>structuredClone(x);

test('blank research ledger is explicit and does not authorize public rankings',()=>{
 const l=emptyLedger193();validateLedger193(l);assert.equal(l.rankingAuthorized,false);
 assert.equal(l.tamperEvidentNotAuthenticated,true);assert.equal(l.events.length,0);
});
test('new article has to be screened',()=>assert.equal(lookupScreening193(emptyLedger193(),source()).verdict,'screen_required_new_document'));
test('unchanged publisher source and reviewed screen reusable without recalculation',()=>{
 const x=lookup();assert.equal(x.verdict,'reuse_screening_decision');assert.equal(x.fullDocumentRescreenSkipped,true);
 assert.equal(x.mayUseAsIndependentTest,false);assert.equal(x.candidatePreserved,true);
 assert.equal(x.reused?.action,'discovery_only');
});
test('same URL with changed bytes needs re-review, even if commercial conclusion unchanged',()=>{
 assert.equal(lookup(decision(),source({contentHash:digest('new revision')})).verdict,'screen_required_content_revision');
});
test('different hash encoding basis cannot reuse',()=>assert.equal(lookup(decision(),source({contentBasis:'analyst_annotation'})).verdict,'screen_required_content_revision'));
test('new policy version forces screening',()=>assert.equal(lookup(decision(),source({policyVersion:'v2'})).verdict,'screen_required_policy_revision'));
test('different source lineage review forces screening',()=>assert.equal(lookup(decision(),source({classificationRevision:'source-got-original-test'})).verdict,'screen_required_context_revision'));
test('market changes cannot reuse a global stars-only decision',()=>assert.equal(lookup(decision(),source({market:'us'})).verdict,'screen_required_scope_revision'));
test('an annotation trial cannot authorize skipping document review',()=>{
 const d=decision({reviewBasis:'annotated_research_trial'});
 assert.equal(lookup(d).verdict,'screen_required_unverified_revision');
});
test('even human-reviewed analyst notes do not prove publisher page bytes unchanged',()=>{
 const s=source({contentBasis:'analyst_annotation'});
 const d=decision({source:s});assert.equal(lookupScreening193(signed(d),s).verdict,'screen_required_unverified_revision');
});
test('rights-appropriate excerpt hash not misrepresented as full-document hash',()=>{
 const s=source({contentBasis:'rights_appropriate_extract'});
 assert.equal(lookupScreening193(signed(decision({source:s})),s).fullDocumentRescreenSkipped,false);
});
test('tracking parameter changes are URL identity hints; no new screen for same hash',()=>{
 assert.equal(lookup(decision(),source({url:'https://buyer.example/top-vacuums/?gclid=abc&tag=partner'})).verdict,'reuse_screening_decision');
});
test('material URL query parameter retains distinct document identity',()=>{
 assert.equal(lookup(decision(),source({url:'https://buyer.example/top-vacuums/?variant=2'})).verdict,'screen_required_new_document');
});
test('same content on another domain not assumed same experiment or document',()=>{
 assert.equal(lookup(decision(),source({url:'https://copy.example/top-vacuums/'})).verdict,'screen_required_new_document');
});
test('other page on same affiliate domain is not blacklisted',()=>{
 assert.equal(lookup(decision(),source({url:'https://buyer.example/real-original-lab-test/'})).verdict,'screen_required_new_document');
});
test('a product discovered only on a marketing list is still retained',()=>{
 const r=screenBatch193(signed(),[source({variantId:'rare_other'})]);
 assert.deepEqual(r.productCandidatesRetained,['rare_other','rare_vacuum']);
 assert.equal(r.excludedFromOriginalPerformanceEvidence,1);assert.equal(r.rankingAuthorized,false);
});
test('two identical URLs with independent repeated requests are rejected from a batch',()=>{
 assert.throws(()=>screenBatch193(signed(),[source(),source({sourceId:'another'})]),/invalid193_batch/);
});
test('duplicate source from a different product continues to be retained even with reuse',()=>{
 const r=screenBatch193(signed(),[source({variantId:'unknown_vacuum'})]);
 assert.equal(r.needScreening,0);assert.equal(r.reused,1);
});
test('coverage metrics count newly found, screened and skipped separately',()=>{
 const r=screenBatch193(signed(),[source(),source({url:'https://different.example/new/',sourceId:'other'})]);
 assert.equal(r.discovered,2);assert.equal(r.reused,1);assert.equal(r.needScreening,1);
});
test('original professional test remains a review candidate, never publicly approved by this module',()=>{
 const d=decision({scope:'field',action:'original_evidence_candidate',
  reason:'reported_original_method_pending_independent_review',originalTestEventId:'lab.test.77'});
 const r=lookupScreening193(signed(d),source());
 assert.equal(r.reused?.action,'original_evidence_candidate');assert.equal(r.mayUseAsIndependentTest,false);
});
test('field-screened product cannot be reused for another exact variant',()=>{
 const d=decision({scope:'field',action:'contextual_research_only',reason:'mixed_or_untraced_method'});
 assert.equal(lookupScreening193(signed(d),source({variantId:'another_vacuum'})).verdict,'screen_required_new_document');
});
test('field-screened product cannot be reused for another criterion',()=>{
 const d=decision({scope:'field',action:'contextual_research_only',reason:'mixed_or_untraced_method'});
 assert.equal(lookupScreening193(signed(d),source({field:'operating_noise'})).verdict,'screen_required_new_document');
});
test('field-screened product cannot be reused across product categories',()=>{
 const d=decision({scope:'field',action:'contextual_research_only',reason:'mixed_or_untraced_method'});
 assert.equal(lookupScreening193(signed(d),source({category:'air_purifier'})).verdict,'screen_required_new_document');
});
test('unknown method remains contextual and does not become technical performance',()=>{
 const d=decision({scope:'field',action:'contextual_research_only',reason:'mixed_or_untraced_method'});
 assert.equal(lookupScreening193(signed(d),source()).mayUseAsIndependentTest,false);
});
test('manufacturer specifications remain provisional, without false negative penalty',()=>{
 const d=decision({scope:'field',action:'provisional_specification_only',reason:'manufacturer_or_retailer_spec_only'});
 assert.equal(lookupScreening193(signed(d),source()).reused?.action,'provisional_specification_only');
});
test('reported derivative without independent measurement is not a new test',()=>{
 const d=decision({scope:'field',action:'contextual_research_only',reason:'derived_report_without_new_independent_test'});
 assert.equal(lookupScreening193(signed(d),source()).mayUseAsIndependentTest,false);
});
test('one original result and many recycled stories remain one review event',()=>{
 const doc=decision({scope:'field',action:'original_evidence_candidate',
  reason:'reported_original_method_pending_independent_review',originalTestEventId:'test77'});
 const l=signed(doc);
 const pages=[source(),...Array.from({length:8},(_,i)=>source({sourceId:'copy'+i,url:`https://copy${i}.example/page/`}))];
 assert.equal(screenBatch193(l,pages).reused,1);
});
test('append new revision: history preserved, only latest decision reused',()=>{
 const previous=signed(),d=decision({source:source({contentHash:digest('revision2')}),
  reviewTicket:'PEE-REVIEW-193-002',reviewedAt:'2026-10-02T11:00:00Z',
  evidenceNote:'Updated publisher page was rescreened and the original test remains absent.'});
 const l=recordScreening193(previous,d);
 assert.equal(l.events.length,2);assert.equal(l.events[1].supersedesSeq,1);
 assert.equal(lookupScreening193(l,source({contentHash:digest('revision2')})).verdict,'reuse_screening_decision');
 assert.equal(lookupScreening193(l,source()).verdict,'screen_required_content_revision');
});
test('reinstated original method on same page supersedes marketplace exclusion',()=>{
 const l=recordScreening193(signed(),decision({source:source({contentHash:digest('original test added'),
 classificationRevision:'method-reviewed-2'}),scope:'field',
 action:'original_evidence_candidate',reason:'reported_original_method_pending_independent_review',
 originalTestEventId:'new_verified_group',reviewTicket:'PEE-REVIEW-193-002',
 reviewedAt:'2026-10-02T11:00:00Z',evidenceNote:'The publisher page now contains an individually reported original test method.'}));
 // The older global stars-only screen must NOT shadow a newer field review.
 const got=lookupScreening193(l,source({contentHash:digest('original test added'),
  classificationRevision:'method-reviewed-2'}));
 assert.equal(got.verdict,'reuse_screening_decision');assert.equal(got.reused?.action,'original_evidence_candidate');
});
test('a new policy review supersedes earlier review, without deleting audit history',()=>{
 const next=decision({source:source({policyVersion:'policy-v2'}),reviewedAt:'2026-10-02T11:00:00Z',
 reviewTicket:'PEE-REVIEW-193-002'});
 const l=recordScreening193(signed(),next);
 assert.equal(lookupScreening193(l,source({policyVersion:'policy-v2'})).verdict,'reuse_screening_decision');
 assert.equal(l.events.length,2);
});
test('invalid event history is detected',()=>{
 const l=clone(signed());(l.events[0] as any).decision.reason='manufacturer_or_retailer_spec_only';
 assert.throws(()=>validateLedger193(l));
});
test('truncated chain or seq rewrite is detected',()=>{
 const l=clone(signed());(l.events[0] as any).seq=10;
 assert.throws(()=>validateLedger193(l));
});
test('a forged hash without a proper chain is rejected',()=>{
 const l=clone(signed());(l.events[0] as any).eventHash=digest('fake');
 assert.throws(()=>validateLedger193(l));
});
test('invalid policy string rejected',()=>{
 assert.throws(()=>recordScreening193(emptyLedger193(),decision({source:source({policyVersion:''})})),/invalid193_source/);
});
test('bad URL rejected',()=>{
 assert.throws(()=>lookupScreening193(emptyLedger193(),source({url:'javascript:alert(1)'})));
});
test('empty or fake reviewer ticket fails closed',()=>{
 assert.throws(()=>recordScreening193(emptyLedger193(),decision({reviewTicket:'x'})),/invalid193_decision/);
});
test('invalid original evidence event metadata rejected',()=>{
 assert.throws(()=>recordScreening193(emptyLedger193(),decision({scope:'field',action:'original_evidence_candidate',reason:'reported_original_method_pending_independent_review'})),/invalid193_original_candidate/);
});
test('incompatible star-only reason and field scope rejected',()=>{
 assert.throws(()=>recordScreening193(emptyLedger193(),decision({scope:'field'})),/invalid193_marketplace_scope/);
});
test('human review cannot predate source observation',()=>{
 assert.throws(()=>recordScreening193(emptyLedger193(),decision({reviewedAt:'2025-01-01T00:00:00Z'})));
});
test('older approval cannot replace newer decision',()=>{
 const l=signed(decision({reviewedAt:'2026-10-05T00:00:00Z'}));
 assert.throws(()=>recordScreening193(l,decision({reviewedAt:'2026-10-04T00:00:00Z'})),/invalid193_order/);
});
test('source cannot invent arbitrary new product candidates outside known IDs',()=>{
 assert.throws(()=>recordScreening193(emptyLedger193(),decision({retainedCandidateVariantIds:['bad id with spaces']})));
});
test('persist/reload from disk without npm dependencies, ensure audit chain survives',()=>{
 const dir=mkdtempSync(join(tmpdir(),'pee193-'));
 try{const file=join(dir,'ledger.json');const l=signed();saveLedger193(file,l);
  const loaded=loadLedger193(file);assert.deepEqual(loaded,l);assert.equal(lookupScreening193(loaded,source()).verdict,'reuse_screening_decision');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('corrupted persisted JSON is rejected, not trusted as a valid exclusion',()=>{
 const dir=mkdtempSync(join(tmpdir(),'pee193-'));
 try{const file=join(dir,'ledger.json');saveLedger193(file,signed());
  const old=readFileSync(file,'utf8');writeFileSync(file,old.replace('marketplace_stars_without_original_test','unapproved_exclusion_reason'));
  assert.throws(()=>loadLedger193(file));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('restricted file suffix rejected',()=>{
 assert.throws(()=>saveLedger193('/tmp/decision.txt',emptyLedger193()),/invalid193_path/);
});
test('a deleted entry cannot be silently reattached',()=>{
 const l=recordScreening193(signed(),decision({reviewTicket:'PEE-REVIEW-193-002',reviewedAt:'2026-10-02T11:00:00Z'}));
 const altered=clone(l);(altered.events as any).splice(0,1);assert.throws(()=>validateLedger193(altered));
});
test('phase192 adapter retains its discovery-only rationale and candidates',()=>{
 const report={phase:192,sourceUse:[{sourceId:'affiliate_roundup',scope:'discovery_only',reason:'Only stars'}],
 publicRankingAllowed:false} as unknown as LineageReport192;
 const s=source(),d=draftFromLineage192({report,sourceId:s.sourceId,source:s,
 reviewerId:'analyst1',reviewTicket:'PEE-TICKET-00001',reviewedAt:'2026-10-01T11:00:00Z',
 reviewBasis:'annotated_research_trial',note:'Unverified pilot screen based entirely on marketplace stars.',
 candidateIds:['rare_vacuum']});
 assert.equal(d.action,'discovery_only');assert.equal(d.reviewBasis,'annotated_research_trial');
 assert.equal(lookupScreening193(signed(d),s).verdict,'screen_required_unverified_revision');
});
test('phase192 adapter will not invent source entry absent from source registry',()=>{
 const report={phase:192,sourceUse:[],publicRankingAllowed:false} as unknown as LineageReport192;
 assert.throws(()=>draftFromLineage192({report,sourceId:'missing',source:source(),reviewerId:'analyst1',
  reviewTicket:'PEE-TICKET-00001',reviewedAt:'2026-10-01T11:00:00Z',reviewBasis:'annotated_research_trial',
  note:'No matching source review entry available.',candidateIds:[]}));
});
test('no site-wide blacklist: five original reviewer candidates on same domain are separate',()=>{
 const first=decision();const ledger=signed(first);
 const candidates=Array.from({length:5},(_,i)=>source({sourceId:'newtest'+i,url:`https://buyer.example/original-test-${i}/`}));
 assert.equal(screenBatch193(ledger,candidates).needScreening,5);
});
test('repeated searches after a reviewed exclusion do not increase screening work',()=>{
 const l=signed();for(let i=0;i<30;i++){
  const r=screenBatch193(l,[source()]);assert.equal(r.reused,1);assert.equal(r.needScreening,0);
 }
 assert.equal(l.events.length,1);
});
