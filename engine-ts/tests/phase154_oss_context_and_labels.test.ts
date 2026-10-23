import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {analyzeLabelMatrix154} from '../src/phase154_label_diagnostics.js';
import {buildContextGraph154,type ContextRule154} from '../src/phase154_context_graph.js';
import {analyzeEnglishProductDocument154} from '../src/phase154_integrated_review.js';
import type {ReaderInput139} from '../src/phase139_unmarked_english_candidate_reader.js';
const doc=(text:string,title='Sample review'):ReaderInput139=>({document:{text,sha256:createHash('sha256').update(text).digest('hex'),source:{id:'p154',originalDocumentId:'p154',url:'https://example.org/p154',title,role:'original_product_test'}}});
const span=(text:string,literal:string,id=literal)=>({id,start:text.indexOf(literal),end:text.indexOf(literal)+literal.length,type:'possible_product'});
// These expected numbers come from the Snorkel upstream test/labeling/test_analysis.py
const L=[[-1,-1,0,-1,-1,0],[-1,-1,-1,2,-1,-1],[2,-1,-1,-1,-1,0],[1,-1,2,-1,0,0],[-1,-1,-1,-1,-1,-1],[1,-1,0,2,1,0]];
test('Snorkel upstream LFAnalysis fixture: coverage, overlap, conflict, polarities and per-LF statistics',()=>{
 const a=analyzeLabelMatrix154(L);assert.equal(a.labelCoverage,5/6);assert.equal(a.labelOverlap,4/6);assert.equal(a.labelConflict,3/6);
 assert.deepEqual(a.byFunction.map(x=>x.polarity),[[1,2],[],[0,2],[2],[0,1],[0]]);
 assert.deepEqual(a.byFunction.map(x=>x.coverage),[3/6,0,3/6,2/6,2/6,4/6]);
 assert.deepEqual(a.byFunction.map(x=>x.overlap),[3/6,0,3/6,1/6,2/6,4/6]);
 assert.deepEqual(a.byFunction.map(x=>x.conflict),[3/6,0,2/6,1/6,2/6,3/6]);
 assert.deepEqual(a.byFunction.map(x=>x.normalizedConflict),[1,0,2/3,1,1,3/4]);
});
test('Snorkel fixture: genuine supplied gold yields empirical per-LF accuracy; no gold null',()=>{
 const a=analyzeLabelMatrix154(L,undefined,[0,1,2,0,1,2]);
 assert.deepEqual(a.byFunction.map(x=>x.empiricalAccuracy),[1/3,0,1/3,1/2,1/2,2/4]);
 assert.equal(analyzeLabelMatrix154(L).byFunction[0].empiricalAccuracy,null);
});
test('empty rows, all-abstain, invalid input',()=>{
 assert.equal(analyzeLabelMatrix154([]).labelCoverage,0);
 assert.equal(analyzeLabelMatrix154([[-1,-1],[-1,-1]]).labelConflict,0);
 assert.throws(()=>analyzeLabelMatrix154([[1],[0,1]]),/invalid_label_matrix/);
 assert.throws(()=>analyzeLabelMatrix154([[1]],['a'],[1,2]),/invalid_gold_labels/);
});
test('medSpaCy-like ConText scope: terminator stops an untested target from crossing contrast',()=>{
 const text='We did not test Breville Bambino but we tested Ninja Prestige DualBrew.';
 const targets=[span(text,'Breville Bambino','breville'),span(text,'Ninja Prestige DualBrew','ninja')];
 const rules:ContextRule154[]=[{literal:'did not test',category:'UNTESTED',direction:'FORWARD'},
 {literal:'but',category:'CONTRAST',direction:'TERMINATE'}];
 const g=buildContextGraph154(text,targets,rules);
 assert.deepEqual(g.edges.map(e=>e.targetId),['breville']);assert.equal(g.edges[0].category,'UNTESTED');
 assert.equal(g.edges[0].trigger.literal,'did not test');
});
test('direction BACKWARD and bidirectional windows (medSpaCy semantics)',()=>{
 const text='Breville Bambino was excluded. Ninja Prestige DualBrew still appears.';
 const rules:ContextRule154[]=[{literal:'was excluded',category:'EXCLUDED',direction:'BACKWARD',maxScopeTokens:4}];
 const g=buildContextGraph154(text,[span(text,'Breville Bambino','b'),span(text,'Ninja Prestige DualBrew','n')],rules);
 assert.deepEqual(g.edges.map(e=>e.targetId),['b']);
 const text2='Breville Bambino maybe Ninja Prestige DualBrew.';
 const b=buildContextGraph154(text2,[span(text2,'Breville Bambino','b'),span(text2,'Ninja Prestige DualBrew','n')],
 [{literal:'maybe',category:'UNCERTAIN',direction:'BIDIRECTIONAL',maxScopeTokens:5}]);
 assert.deepEqual(b.edges.map(e=>e.targetId),['b','n']);
});
test('PSEUDO suppresses overlapping modifiers and longer trigger wins',()=>{
 const text='No lack of Breville Bambino is reported.';
 const rules:ContextRule154[]=[{literal:'lack of',category:'LACK',direction:'FORWARD'},
 {literal:'No lack of',category:'PSEUDO',direction:'PSEUDO'}];
 const result=buildContextGraph154(text,[span(text,'Breville Bambino')],rules);
 assert.equal(result.edges.length,0);
 assert.equal(result.modifiers.length,0);
});
test('context rule supports allow/exclude target types, maxTargets and maxScopeTokens',()=>{
 const text='Possibly Breville Bambino and Ninja Prestige DualBrew are similar.';
 const rules:ContextRule154[]=[{literal:'Possibly',category:'UNCERTAIN',direction:'FORWARD',maxTargets:1,
 allowedTypes:['possible_product']}];
 const t=[span(text,'Breville Bambino','b'),span(text,'Ninja Prestige DualBrew','n')];
 assert.deepEqual(buildContextGraph154(text,t,rules).edges.map(e=>e.targetId),['b']);
 assert.equal(buildContextGraph154(text,t,[{...rules[0],allowedTypes:['setting']}]).edges.length,0);
 assert.equal(buildContextGraph154(text,t,[{...rules[0],maxScopeTokens:1}]).edges.length,0);
});
test('context match budget is bounded and flags incomplete evidence',()=>{
 const g=buildContextGraph154('perhaps perhaps perhaps',[],[{literal:'perhaps',category:'UNCERTAIN',direction:'FORWARD'}],2);
 assert.equal(g.truncated,true);assert.ok(g.reasons.includes('context_match_budget_exceeded'));
});
test('integrated Phase154 entrypoint actually invokes all three engines without authorizing identity or ranking',()=>{
 const text='We did not test Breville Bambino but we tested Ninja Prestige DualBrew.';
 const r=analyzeEnglishProductDocument154(doc(text,'Breville Bambino review and Ninja Prestige DualBrew review'));
 assert.equal(r.phase,154);assert.equal(r.inventory.phase,153);assert.equal(r.signalDiagnostics.functions,7);
 const breville=r.mentions.find(x=>x.literal==='Breville Bambino');
 assert.ok(breville);assert.ok(breville.contextCategories.includes('TEST_NOT_PERFORMED'));
 const ninja=r.mentions.find(x=>x.literal==='Ninja Prestige DualBrew');
 assert.ok(ninja);assert.equal(ninja.contextCategories.includes('TEST_NOT_PERFORMED'),false);
 assert.equal(r.rankingAuthorized,false);assert.equal(r.canonicalWriteAuthorized,false);
 assert.equal(r.precision,null);assert.equal(r.recall,null);
 assert.equal(r.context.edges.length>0,true);
});
test('original UTF16 substring offsets are maintained with non-ASCII text',()=>{
 const text='☕ We did not test Breville Bambino but tested Ninja Prestige DualBrew.';
 const t=span(text,'Breville Bambino','b');
 const r=buildContextGraph154(text,[t],[{literal:'did not test',category:'UNTESTED',direction:'FORWARD'},
 {literal:'but',category:'CONTRAST',direction:'TERMINATE'}]);
 assert.equal(text.slice(r.edges[0].trigger.start,r.edges[0].trigger.end),'did not test');
});

test('review-derived excluded product is not confused with the following product',()=>{
 const text='Excluding Kenwood MultiPro Compact, the Philips Airfryer Dual Basket is considered.';
 const r=analyzeEnglishProductDocument154(doc(text));
 const kenwood=r.mentions.find(m=>m.contextualTargetLiteral==='Kenwood MultiPro Compact');
 const philips=r.mentions.find(m=>m.literal==='Philips Airfryer Dual Basket');
 assert.ok(kenwood);assert.equal(kenwood.boundaryAdjusted,true);
 assert.ok(kenwood.contextCategories.includes('EXCLUDED_FROM_TEST'));
 assert.ok(philips);assert.equal(philips.contextCategories.includes('EXCLUDED_FROM_TEST'),false);
 assert.equal(r.inventory.mentions.some(m=>m.span.literal.startsWith('Excluding Kenwood')),true);
});
test('past-tense NOT TESTED rule scopes backward to reviewed product, not next sentence',()=>{
 const text='The Sage Barista Touch was not tested. Breville Bambino Plus was evaluated.';
 const r=analyzeEnglishProductDocument154(doc(text));
 const sage=r.mentions.find(m=>m.literal==='Sage Barista Touch');
 const breville=r.mentions.find(m=>m.literal==='Breville Bambino Plus');
 assert.ok(sage);assert.ok(sage.contextCategories.includes('TEST_NOT_PERFORMED'));
 assert.ok(breville);assert.ok(!breville.contextCategories.includes('TEST_NOT_PERFORMED'));
});
