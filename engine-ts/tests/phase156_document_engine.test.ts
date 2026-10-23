import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {analyzeEnglishReview156} from '../src/phase156_review_document_engine.js';
import type {ReaderInput139} from '../src/phase139_unmarked_english_candidate_reader.js';
const doc=(text:string,title='Bosch 800 Series B36CT80SNS Review'):ReaderInput139=>({document:{text,
 sha256:createHash('sha256').update(text).digest('hex'),source:{id:'unit-156',originalDocumentId:'unit-156',
 url:'https://example.org/reviews/bosch',title,role:'original_product_test'}}});
const sample=`Bosch 800 Series B36CT80SNS is the reviewed refrigerator. It is compared with Maytag MRT311FFFE.\n\n${
 'The tested refrigerator stores food in both cabinets. '.repeat(50)}\n\nWe did not test Frigidaire FRSS2623AS, but Bosch 800 Series B36CT80SNS was tested.\n\nProduce Moisture Retention\n81.0%\n`;
test('integration spans >one word window with absolute offsets',()=>{
 const r=analyzeEnglishReview156(doc(sample),{windowWords:85,overlapWords:20});
 assert.ok(r.windowCount>2);
 assert.ok(r.mentions.some(m=>m.surface==='Bosch 800 Series B36CT80SNS'&&m.role==='reviewed_surface'));
 for(const m of r.mentions){assert.equal(sample.slice(m.span.start,m.span.end),m.surface);
  assert.equal(createHash('sha256').update(m.surface).digest('hex'),m.span.sha256);}
 assert.equal(r.documentGraph.identityVerified,false);
});
test('context graph still respects contrast across several windows',()=>{
 const r=analyzeEnglishReview156(doc(sample),{windowWords:85,overlapWords:20});
 const missing=r.mentions.find(m=>m.surface==='Frigidaire FRSS2623AS');
 assert.ok(missing);assert.ok(missing.contextCategories.includes('TEST_NOT_PERFORMED'));
 const reviewed=r.mentions.find(m=>m.surface==='Bosch 800 Series B36CT80SNS'&&m.span.start>900);
 assert.ok(reviewed);assert.ok(!reviewed.contextCategories.includes('TEST_NOT_PERFORMED'));
});
test('all four upstream-derived layers coordinate without database/ranking authorisation',()=>{
 const r=analyzeEnglishReview156(doc(sample),{windowWords:85,overlapWords:20});
 assert.equal(r.voteDiagnostics.unverifiedVotes,true);
 assert.ok(r.documentGraph.vertices.length>0);
 assert.equal(r.modelInferencePerformed,false);
 assert.equal(r.canonicalWriteAuthorized,false);assert.equal(r.rankingAuthorized,false);
 assert.equal(r.sourceAuthenticated,false);assert.equal(r.independentlyAnnotated,false);
 assert.ok(r.mentions.every(m=>m.identityVerified===false&&!m.rankingAuthorized));
});
test('no hallucinated reviewed model from title when absent in source',()=>{
 const r=analyzeEnglishReview156(doc('The appliance cools food.'));
 assert.equal(r.mentions.some(m=>m.role==='reviewed_surface'),false);
 assert.ok(r.unresolved.includes('reviewed_model_not_observed_in_body'));
});
test('full input digest protected; deterministic replays',()=>{
 const d=doc(sample),a=analyzeEnglishReview156(d,{windowWords:85,overlapWords:20});
 assert.deepEqual(a,analyzeEnglishReview156(d,{windowWords:85,overlapWords:20}));
 d.document.sha256='1'.repeat(64);assert.throws(()=>analyzeEnglishReview156(d),/invalid_source_digest_156/);
});
test('non-fridge product is supported and comparisons stay hypotheses',()=>{
 const text='Cosori Dual Blaze Twinfry Compact is the tested air fryer. Unlike Ninja Foodi Max, this Cosori cooks in one basket.';
 const r=analyzeEnglishReview156(doc(text,'Cosori Dual Blaze Twinfry Compact air fryer review'));
 assert.ok(r.mentions.some(m=>m.surface.includes('Cosori')));
 assert.equal(r.documentGraph.identityVerified,false);
});
test('product title correspondence accepts long all-word commercial models',()=>{
 const t='Cosori Dual Blaze Twinfry Compact is the reviewer-tested air fryer. Cosori Dual Blaze Twinfry Compact cooks fries.';
 const r=analyzeEnglishReview156(doc(t,'Cosori Dual Blaze Twinfry Compact review'));
 assert.equal(r.mentions.filter(m=>m.role==='reviewed_surface').length,2);
 assert.equal(r.mentions.filter(m=>m.role==='reviewed_surface').every(m=>m.identityVerified===false),true);
});
test('brand with apostrophe/case differences remains title-correspondence only',()=>{
 const t="De'Longhi Dedica Duo works. De’Longhi Dedica Duo has a predecessor, De'Longhi Dedica Style.";
 const r=analyzeEnglishReview156(doc(t,"De'Longhi Dedica Duo Review"));
 assert.ok(r.mentions.some(m=>m.surface==="De'Longhi Dedica Duo"&&m.role==='reviewed_surface'));
 assert.ok(r.mentions.some(m=>m.surface==='De’Longhi Dedica Duo'&&m.role==='reviewed_surface'));
 assert.ok(!r.mentions.some(m=>m.surface==="De'Longhi Dedica Style"&&m.role==='reviewed_surface'));
});
