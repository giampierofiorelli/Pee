import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSpans156,wordWindows156} from '../src/phase156_gliner_portable.js';
import {buildDocumentGraph156} from '../src/phase156_deepke_document_graph.js';
const s=(start:number,end:number,score:number)=>({start,end,score});
test('GLiNER2 weighted interval resolves globally rather than by greedy top score',()=>{
 const out=resolveSpans156([s(0,10,9),s(0,5,5),s(5,10,5)]);
 assert.deepEqual(out.map(x=>[x.start,x.end]),[[0,5],[5,10]]);
});
test('GLiNER2 overlap policies preserve nested and reject crossings',()=>{
 const v=[s(0,10,3),s(2,4,2),s(4,11,1)];
 assert.equal(resolveSpans156(v,'allow').length,3);
 assert.deepEqual(resolveSpans156(v,'nested').map(x=>x.start),[0,2]);
 assert.deepEqual(resolveSpans156(v,'longest').map(x=>x.start),[0,4]);
});
test('GLiNER2 exact boundaries collapse duplicates deterministically',()=>{
 assert.deepEqual(resolveSpans156([s(0,3,1),s(0,3,5),s(3,5,1)]).map(x=>x.score),[5,1]);
 assert.deepEqual(resolveSpans156([s(0,3,-1)]),[]);
});
test('GLiNER2 word windows remap every token to unchanged original offsets',()=>{
 const text='  one\n two  three\n four FIVE six seven eight  ';
 const chunks=wordWindows156(text,4,2);
 assert.deepEqual(chunks.map(x=>[x.startWord,x.endWord]),[[0,4],[2,6],[4,8]]);
 for(const w of chunks)assert.equal(text.slice(w.startChar,w.endChar),w.text);
 assert.equal(wordWindows156('   ').length,1);
});
test('GLiNER2 rejects invalid windows and invalid spans instead of silent truncation',()=>{
 assert.throws(()=>wordWindows156('test',4,4),/invalid_word_windows/);
 assert.throws(()=>resolveSpans156([s(5,3,2)]),/invalid_weighted_span/);
});
test('DeepKE vertices group identical written surfaces but never establish identity',()=>{
 const text='Bosch B36CT80SNS compares with Maytag MRT311FFFE. Bosch B36CT80SNS was tested.';
 const a=text.indexOf('Bosch'),b=text.lastIndexOf('Bosch'),c=text.indexOf('Maytag');
 const mentions=[{id:'a',start:a,end:a+'Bosch B36CT80SNS'.length,surface:'Bosch B36CT80SNS',role:'reviewed_surface',contextCategories:[]},
  {id:'b',start:b,end:b+'Bosch B36CT80SNS'.length,surface:'Bosch B36CT80SNS',role:'reviewed_surface',contextCategories:[]},
  {id:'c',start:c,end:c+'Maytag MRT311FFFE'.length,surface:'Maytag MRT311FFFE',role:'comparison_surface',contextCategories:[]}];
 const graph=buildDocumentGraph156(text,mentions,[{headMentionId:'a',tailMentionId:'c',type:'comparison',evidenceStart:0,evidenceEnd:49}]);
 assert.equal(graph.vertices.length,2);assert.equal(graph.edges.length,1);
 assert.deepEqual(graph.vertices.find(x=>x.writtenSurface==='Bosch B36CT80SNS')?.sentenceIds,[0,1]);
 assert.equal(graph.edges[0].proposedOnly,true);assert.equal(graph.identityVerified,false);
});
test('DeepKE refuses invalid offsets and silently neither invents endpoints nor triples',()=>{
 assert.throws(()=>buildDocumentGraph156('Test',[{id:'x',start:1,end:4,surface:'xyz',role:'r',contextCategories:[]}],[]),/invalid_document_mention/);
 const graph=buildDocumentGraph156('AB',[],[{headMentionId:'missing',tailMentionId:'missing',type:'similarity',evidenceStart:0,evidenceEnd:2}]);
 assert.equal(graph.unresolvedRelationCount,1);assert.equal(graph.edges.length,0);
});
