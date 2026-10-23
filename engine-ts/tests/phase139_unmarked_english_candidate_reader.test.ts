import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readUnmarkedEnglish139,type ReaderInput139} from '../src/phase139_unmarked_english_candidate_reader.js';
const sha=(t:string)=>createHash('sha256').update(t).digest('hex');
const request=(text:string,aliases=['Aster X2']):ReaderInput139=>({document:{
 text,sha256:sha(text),source:{id:'s139',originalDocumentId:'original139',url:'https://reviews.example/aster-x2',title:'Test document',role:'original_product_test'}},
 pageIdentity:{reviewedProductId:'aster_family',reviewedVariantId:'aster_x2',reviewedAliases:aliases}});
const run=(text:string,aliases=['Aster X2'])=>readUnmarkedEnglish139(request(text,aliases));
const pair=(text:string,aliases=['Aster X2'])=>run(text,aliases).pairs[0];
const excerpt=(t:string,d:ReturnType<typeof run>)=>{for(const m of d.mentions)assert.equal(t.slice(m.span.start,m.span.end),m.literal);
 for(const p of d.pairs){assert.ok(t.slice(p.evidenceSpan.start,p.evidenceSpan.end).includes(t.slice(p.subjectSpan.start,p.subjectSpan.end)));
  if(p.objectSpan)assert.ok(t.slice(p.evidenceSpan.start,p.evidenceSpan.end).includes(t.slice(p.objectSpan.start,p.objectSpan.end)));}};
test('discovers subject and performance target without input spans or relation labels',()=>{
 const t='The Aster X2 delivers outstanding debris pick-up performance on hard floors.';const d=run(t);
 assert.equal(d.pairs.length,1);assert.equal(d.pairs[0].status,'candidate_quarantined');
 assert.equal(d.pairs[0].candidateLabel,'untyped_extraction_hypothesis');
 assert.equal(t.slice(d.pairs[0].objectSpan!.start,d.pairs[0].objectSpan!.end),'debris pick-up performance');
 assert.equal(d.mentions.find(m=>m.literal==='Aster X2')?.identityClaim,'page_alias_asserted_not_authenticated');
 excerpt(t,d);
});
test('detects multi-token product without reviewed page hint as unverified name',()=>{
 const x=request('The Roborock Qrevo Curv handles carpet cleaning well.');delete x.pageIdentity;
 const d=readUnmarkedEnglish139(x);
 assert.ok(d.mentions.some(m=>m.literal==='Roborock Qrevo Curv'&&m.identityClaim==='unverified_product_name'));
 assert.equal(d.pairs[0].status,'candidate_quarantined');
 assert.ok(!d.mentions.some(m=>m.productId));
});
test('detects model with digit and a qualitatively reported capability',()=>{
 const t='The P10 Pro Ultra handles everyday carpet cleaning well.';const d=run(t,['P10 Pro Ultra']);
 assert.equal(d.pairs[0].status,'candidate_quarantined');assert.equal(d.pairs[0].pattern,'performance_description');
 assert.equal(t.slice(d.pairs[0].objectSpan!.start,d.pairs[0].objectSpan!.end),'carpet cleaning');
});
test('detects a numeric value but does not interpret an unspecified endpoint',()=>{
 const d=run('The Aster X2 collected 94%.');assert.equal(d.pairs[0].status,'missing_measurement_endpoint');
 assert.ok(d.mentions.some(m=>m.literal==='94%'&&m.type==='numeric_value'));
});
test('same source with explicit endpoint can propose numerical claim but cannot validate protocol',()=>{
 const d=run('The Aster X2 collected 94% of the debris.');
 assert.equal(d.pairs[0].status,'candidate_quarantined');assert.equal(d.anyClaimsScientificallyValidated,false);
});
test('different PE vs FE variant cannot inherit page identity',()=>{
 const d=run('The closely related L60 Ultra FE collected 80% in the same test.',['L60 Ultra PE']);
 const m=d.mentions.find(x=>x.literal==='L60 Ultra FE');
 assert.equal(m?.identityClaim,'different_or_unverified_variant');assert.equal(m?.productId,undefined);
 assert.equal(d.pairs[0].status,'variant_not_reviewed');
});
test('does not mistake a prefix alias for the reviewed variant',()=>{
 const d=run('The Aster X20 collected 80%.');
 assert.ok(!d.mentions.some(m=>m.identityClaim==='page_alias_asserted_not_authenticated'));
});
test('finds English possessive as an unresolved reference and feature phrase separately',()=>{
 const t="its obstacle avoidance system also doesn't consistently recognize hazards like power cords";
 const d=run(t);assert.equal(d.pairs[0].status,'unresolved_reference');
 assert.ok(d.mentions.some(m=>m.literal==='its'&&m.type==='anaphor'));
 assert.ok(d.mentions.some(m=>m.literal==='obstacle avoidance system'&&m.type==='feature_phrase'));
 excerpt(t,d);
});
test('an isolated pronoun never borrows page identity',()=>{
 const d=run('It removes fine dust.');assert.equal(d.pairs[0].status,'unresolved_reference');
 assert.equal(d.mentions.find(m=>m.literal==='It')?.productId,undefined);
});
test('pronoun in a following sentence is still unresolved pending coreference',()=>{
 const d=run('The Aster X2 has a brush. It removes soil.');
 assert.equal(d.pairs.length,2);assert.equal(d.pairs[1].status,'unresolved_reference');
});
test('direct negation becomes negative statement only, not positive evidence',()=>{
 assert.equal(pair('The Aster X2 does not remove fine dust.').status,'negative_statement_quarantined');
 assert.equal(pair("The Aster X2 doesn't remove fine dust.").status,'negative_statement_quarantined');
});
test('lack of evidence is not inferred ineffectiveness',()=>{
 const d=run('No evidence establishes that the Aster X2 removes fine dust.');
 assert.equal(d.pairs[0].status,'lack_of_evidence');
});
test('uncertainty and hypotheticals trigger abstention',()=>{
 assert.equal(pair('The Aster X2 may remove fine dust.').status,'uncertain_statement');
 assert.equal(pair('If maintained, the Aster X2 removes fine dust.').status,'uncertain_statement');
});
test('manufacturer attributions cannot masquerade as independent tests',()=>{
 const d=run('The manufacturer claims that the Aster X2 removes fine dust.');
 assert.equal(d.pairs[0].status,'source_attributed_claim');
});
test('multiple products before same predicate cannot select a winner',()=>{
 const d=run('The Aster X2 and B4 Pro remove dust.', ['Aster X2']);
 assert.equal(d.pairs[0].status,'ambiguous_product_subject');
});
test('feature mentioned by predicate is a candidate, not product proof',()=>{
 const t='The Aster X2 has a heated dock.';const d=run(t);
 assert.equal(d.pairs[0].pattern,'feature_description');
 assert.ok(d.mentions.some(m=>m.literal==='heated dock'&&m.type==='feature_phrase'));
 assert.equal(d.pairs[0].canonicalWriteAuthorized,false);
});
test('no predicate is not evidence of feature absence',()=>{
 const d=run('The Aster X2 is reviewed today.');assert.equal(d.pairs.length,0);
});
test('no product is a zero-candidate outcome, not an assertion of absence',()=>{
 const d=run('The suction was unusually strong during the test.');assert.equal(d.pairs.length,0);
});
test('unresolved adverb alone does not become measured target',()=>{
 const d=run('The Aster X2 responded appropriately.');
 assert.equal(d.pairs[0].status,'unresolved_target');
 assert.equal(d.pairs[0].objectSpan,null);
});
test('input order is not data-dependent; repeated run deterministic',()=>{
 const r=request('The Aster X2 removes dust. The Aster X2 collects 94%.');
 assert.deepEqual(readUnmarkedEnglish139(r),readUnmarkedEnglish139(r));
});
test('bounded mentions and candidates produce capped output rather than runaway',()=>{
 const r=request(Array.from({length:30},()=> 'The Aster X2 removes dust.').join(' '));
 const d=readUnmarkedEnglish139({...r,maxPairs:3,maxMentions:9});
 assert.equal(d.pairs.length,3);assert.ok(d.mentions.length<=9);
 assert.equal(d.coverageTruncated,true);assert.ok(d.truncationReasons.includes('mention_limit'));
 assert.ok(d.truncationReasons.includes('pair_limit'));
});
test('tampered source text without updated checksum is rejected',()=>{
 const r=request('The Aster X2 removes dust.');r.document.text+=' modified';
 assert.throws(()=>readUnmarkedEnglish139(r),/invalid_document_or_bounds_139/);
});
test('source identity and URL are mandatory',()=>{
 const r=request('The Aster X2 removes dust.');r.document.source.url='http://example.net/no';
 assert.throws(()=>readUnmarkedEnglish139(r),/invalid_document_or_bounds_139/);
});
test('identity metadata is caller-asserted and never enables ranking',()=>{
 const d=run('The Aster X2 removes dust.');
 assert.equal(d.rankingAuthorized,false);assert.equal(d.canonicalWriteAuthorized,false);
 assert.equal(d.sourceAuthenticityVerified,false);assert.equal(d.independentAnnotations,0);
});
test('invalid page hint cannot invent products',()=>{
 const r=request('The Aster X2 removes dust.');r.pageIdentity!.reviewedAliases=[''];
 assert.throws(()=>readUnmarkedEnglish139(r),/invalid_reviewed_page_hint_139/);
});
test('offsets after emoji are preserved as UTF16 source offsets',()=>{
 const t='🔬 The Aster X2 removes dust.';const d=run(t);
 excerpt(t,d);assert.equal(d.mentions.find(m=>m.literal==='Aster X2')?.span.start,t.indexOf('Aster X2'));
});
test('long text and runaway options are explicitly rejected',()=>{
 const r=request('The Aster X2 removes dust.');r.document.text='a'.repeat(250001);r.document.sha256=sha(r.document.text);
 assert.throws(()=>readUnmarkedEnglish139(r),/invalid_document_or_bounds_139/);
 assert.throws(()=>readUnmarkedEnglish139({...request('The Aster X2 removes dust.'),maxPairs:100}),/invalid_document_or_bounds_139/);
});

test('unbounded case reports full scan, not inferred completeness about the world',()=>{
 const d=run('The Aster X2 removes dust.');
 assert.equal(d.coverageTruncated,false);assert.deepEqual(d.truncationReasons,[]);
});
test('cap of one relation distinguishes incomplete scan from no candidates',()=>{
 const r=request('The Aster X2 removes dust. The Aster X2 collects hair.');
 const d=readUnmarkedEnglish139({...r,maxPairs:1});
 assert.equal(d.pairs.length,1);assert.equal(d.coverageTruncated,true);
 assert.deepEqual(d.truncationReasons,['pair_limit']);
});
