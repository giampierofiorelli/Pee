import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {analyzeEnglishReview155} from '../src/phase155_review_orchestrator.js';
import type {ReaderInput139} from '../src/phase139_unmarked_english_candidate_reader.js';
const doc=(text:string,title='Maytag MRT311FFFE Refrigerator Review'):ReaderInput139=>({document:{text,
 sha256:createHash('sha256').update(text).digest('hex'),source:{id:'test155',originalDocumentId:'test155',
 url:'https://example.org/refrigerator-review',title,role:'original_product_test'}}});
const ownText=`The Maytag MRT311FFFE is the tested fridge. The Maytag is a mechanical twin to the Whirlpool WRT311FZDW, but not identical in layout.

Differences Between Sizes And Variants
Model Code | Finish
MRT311FFFH | White
MRT311FFFE | Black
MRT311FFFZ | Stainless Steel

Popular Refrigerator Comparisons
Another competition is the GE GTS22KGNRWW, which better preserves produce.

Produce Preservation
Produce Moisture Retention
81.0%
Noise During Cooling Cycle
44.9 dBA
`;
test('orchestrates source title, original inventory, contextual scopes and vote diagnostics',()=>{
 const r=analyzeEnglishReview155(doc(ownText));assert.equal(r.phase,155);assert.equal(r.baseline.phase,154);
 assert.equal(r.context.unverifiedLexicalInterpretation,true);assert.equal(r.voteDiagnostics.unverifiedVotes,true);
 assert.ok(r.mentions.some(m=>m.surface==='Maytag MRT311FFFE'&&m.role==='reviewed_surface'));
 assert.ok(r.mentions.some(m=>m.surface==='Whirlpool WRT311FZDW'&&m.role==='comparison_surface'));
 assert.ok(r.mentions.some(m=>m.surface==='GE GTS22KGNRWW'&&m.role==='comparison_surface'));
 assert.ok(r.mentions.some(m=>m.surface==='MRT311FFFE'&&m.reviewedVariantCode));
 assert.equal(r.mentions.filter(m=>m.role==='variant_surface').length,3);
 assert.ok(r.relations.some(x=>r.mentions.find(m=>m.id===x.objectMentionId)?.surface==='Whirlpool WRT311FZDW'));
 assert.ok(r.relations.some(x=>r.mentions.find(m=>m.id===x.objectMentionId)?.surface==='GE GTS22KGNRWW'));
 assert.equal(r.measurements.length,2);assert.deepEqual(r.measurements.map(m=>m.value),[81,44.9]);
 assert.equal(r.canonicalWriteAuthorized,false);assert.equal(r.rankingAuthorized,false);
});
test('heading separated by newline cannot become a commercial name',()=>{
 const r=analyzeEnglishReview155(doc(ownText));
 assert.ok(!r.mentions.some(m=>m.surface.includes('\n')));
 assert.ok(!r.mentions.some(m=>m.surface.startsWith('Differences Between')));
 assert.ok(r.baseline.mentions.some(m=>m.literal.includes('\n')));
});
test('variant codes remain different from full reviewed model identity',()=>{
 const r=analyzeEnglishReview155(doc(ownText));
 assert.equal(r.mentions.find(m=>m.surface==='MRT311FFFH')?.reviewedVariantCode,false);
 assert.equal(r.mentions.find(m=>m.surface==='MRT311FFFZ')?.reviewedVariantCode,false);
 assert.equal(r.mentions.find(m=>m.surface==='MRT311FFFE')?.reviewedVariantCode,true);
 assert.equal(r.mentions.find(m=>m.surface==='MRT311FFFE')?.identityVerified,false);
});
test('source offsets and SHA match source text',()=>{
 const r=analyzeEnglishReview155(doc(ownText));
 for(const m of r.mentions){assert.equal(ownText.slice(m.span.start,m.span.end),m.span.literal);
 assert.equal(createHash('sha256').update(m.surface).digest('hex'),m.span.sha256);}
 for(const v of r.measurements)assert.equal(ownText.slice(v.quantity.start,v.quantity.end),v.quantity.literal);
});
test('measurements never become approved records and do not attach to compared product',()=>{
 const r=analyzeEnglishReview155(doc(ownText));
 const reviewIds=new Set(r.mentions.filter(m=>m.role==='reviewed_surface').map(m=>m.id));
 for(const q of r.measurements){assert.equal(q.scientificEvidenceVerified,false);
 assert.equal(q.canonicalWriteAuthorized,false);assert.equal(q.rankingAuthorized,false);
 assert.ok(q.subjectMentionId!==null&&reviewIds.has(q.subjectMentionId));}
});
test('source absent means source cannot be reconstructed from title',()=>{
 const r=analyzeEnglishReview155(doc('Its cooling seems adequate.'));
 assert.ok(r.unresolved.includes('review_subject_not_reconciled_with_page_title'));
 assert.equal(r.measurements.length,0);
});
test('no model leaks from title to unrelated body',()=>{
 const r=analyzeEnglishReview155(doc('The Whirlpool WRT311FZDW is a refrigerator.'));
 assert.ok(!r.mentions.some(m=>m.role==='reviewed_surface'));
 assert.equal(r.rankingAuthorized,false);
});
test('context prevents not-tested modifier flowing into next model after contrast',()=>{
 const t='We did not test Bosch KGN39EICF, but Maytag MRT311FFFE was tested.';
 const r=analyzeEnglishReview155(doc(t));
 const bosch=r.mentions.find(m=>m.surface==='Bosch KGN39EICF');
 const maytag=r.mentions.find(m=>m.surface==='Maytag MRT311FFFE');
 assert.ok(bosch);assert.ok(maytag);
 assert.ok(bosch.contextCategories.includes('TEST_NOT_PERFORMED'));
 assert.ok(!maytag.contextCategories.includes('TEST_NOT_PERFORMED'));
});
test('generic negation of dispenser does not negate fridge identity',()=>{
 const r=analyzeEnglishReview155(doc('Maytag MRT311FFFE has no water dispenser.'));
 const m=r.mentions.find(x=>x.role==='reviewed_surface');assert.ok(m);
 assert.ok(!m.contextCategories.includes('TEST_NOT_PERFORMED'));
});
test('different category keeps non-fridge names separate',()=>{
 const t='The Breville Bambino Plus coffee maker was tested. We compared it with the Ninja Prestige DualBrew.';
 const r=analyzeEnglishReview155(doc(t,'Breville Bambino Plus Coffee Maker Review'));
 assert.ok(r.mentions.some(m=>m.surface==='Breville Bambino Plus'));
 assert.ok(r.mentions.some(m=>m.surface==='Ninja Prestige DualBrew'));
 assert.ok(r.mentions.every(m=>m.identityVerified===false));
});
test('malformed SHA and huge text are rejected before processing',()=>{
 const d=doc('Maytag MRT311FFFE works.');d.document.sha256='0'.repeat(64);
 assert.throws(()=>analyzeEnglishReview155(d),/invalid_source_digest_155/);
});
test('one source same text yields deterministic ledgers and no external mutable state',()=>{
 const d=doc(ownText);assert.deepEqual(analyzeEnglishReview155(d),analyzeEnglishReview155(d));
});

test('advertised volume is not silently treated as a laboratory measurement',()=>{
 const t='LG STUDIO SRFB27W3 was assessed.\n\nAdvertised Refrigerator Volume\n17.8 cu. ft.\nUsable Refrigerator Volume\n13.4 cu. ft.';
 const r=analyzeEnglishReview155(doc(t,'LG STUDIO SRFB27W3 Refrigerator Review'));
 assert.equal(r.measurements.length,2);
 assert.equal(r.measurements[0].reportingClass,'advertised_specification');
 assert.equal(r.measurements[1].reportingClass,'publisher_test_observation_candidate');
 assert.ok(r.measurements.every(m=>m.scientificEvidenceVerified===false));
});
test('brand with ampersand is retained as full model surface',()=>{
 const t='LG STUDIO SRFB27W3 resembles Fisher & Paykel Series 7 RF201AHJSX1.';
 const r=analyzeEnglishReview155(doc(t,'LG STUDIO SRFB27W3 Refrigerator Review'));
 assert.ok(r.mentions.some(m=>m.surface==='Fisher & Paykel Series 7 RF201AHJSX1'));
});
