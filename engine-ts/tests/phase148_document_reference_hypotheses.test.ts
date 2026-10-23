import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readDocumentReferences148} from '../src/phase148_document_reference_hypotheses.js';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function make(text:string,aliases:string[]=[]){return {document:{text,sha256:hash(text),source:{id:'phase148',originalDocumentId:'phase148',url:'https://example.org/independent',title:'Developer fixture',role:'original_product_test' as const}},
 ...(aliases.length?{pageIdentity:{reviewedProductId:'unverified',reviewedVariantId:'unverified',reviewedAliases:aliases}}:{})};}
const run=(text:string,aliases:string[]=[],max?:number)=>readDocumentReferences148(make(text,aliases),max);
function assertOffsets(text:string){const x=run(text);for(const u of x.sentences)assert.equal(hash(u.span.literal),u.span.sha256);
 for(const a of x.anchors)assert.equal(text.slice(a.span.start,a.span.end),a.span.literal);
 for(const r of x.references){assert.equal(text.slice(r.mention.start,r.mention.end),r.mention.literal);
 assert.equal(hash(r.mention.literal),r.mention.sha256);
 assert.equal(r.identityAuthenticated,false);assert.equal(r.canonicalWriteAuthorized,false);assert.equal(r.rankingAuthorized,false);
 assert.equal(r.measurementComparable,false);}
 return x;}
test('unique model-shaped surface is candidate and not verified identity',()=>{
 const x=assertOffsets('Aster X100 reached 180°C. It reached 165°C.');
 assert.equal(x.anchors.length,1);assert.equal(x.references[0]?.decision,'possible_unique_antecedent_unverified');
 assert.equal(x.references[0].candidateAnchorIds.length,1);assert.equal(x.references[0].identityAuthenticated,false);
});
test('multiple named models block pronoun attribution',()=>{
 const x=assertOffsets('Aster X100 competed with Birch B200. It reached 165°C.');
 assert.equal(x.references[0]?.decision,'blocked_competing_antecedents');
 assert.equal(x.references[0].candidateAnchorIds.length,2);
});
test('changed paragraphs keep candidate but block attachment',()=>{
 const x=assertOffsets('Aster X100 reached 180°C.\n\nIt reached 165°C.');
 assert.equal(x.references[0]?.decision,'blocked_paragraph_boundary');
 assert.equal(x.references[0].candidateAnchorIds.length,1);
});
test('missing model anchor abstains',()=>assert.equal(assertOffsets('It reached 165°C.').references[0]?.decision,'unresolved_no_antecedent'));
test('only previous explicit name from three sentences ago is outside two sentence default window',()=>{
 const x=run('Aster X100 ran a test. The readings were logged. The results were compared. It reached 165°C.');
 assert.equal(x.references[0]?.decision,'unresolved_no_antecedent');
});
test('caller alias assists proposal without authenticating product identity',()=>{
 const x=readDocumentReferences148(make('Alpha Speaker reached 84 dBA. This model was quiet.', ['Alpha Speaker']));
 assert.equal(x.anchors[0].basis,'caller_asserted_page_alias');
 assert.equal(x.references[0].decision,'possible_unique_antecedent_unverified');
 assert.equal(x.references[0].identityAuthenticated,false);
});
test('component can compete with product for it',()=>{
 const x=assertOffsets('Aster X100 has a heated dock. It measured 165°C.');
 assert.equal(x.references[0]?.decision,'blocked_competing_nonproduct_referent');
});
test('named cycle in intermediary sentence blocks automatic pronoun resolution',()=>{
 const x=assertOffsets('Aster X100 passed our tests. The Eco cycle was lengthy. It used 700 W.');
 assert.equal(x.references[0]?.decision,'blocked_competing_nonproduct_referent');
});
test('switching reporting channels blocks evidence transfer',()=>{
 const x=assertOffsets('Aster X100 advertises 60 hours. It measured 54 hours.');
 assert.equal(x.references[0]?.decision,'blocked_reporting_change');
});
test('mode changes block transfer even with a unique subject',()=>{
 const x=assertOffsets('Aster X100 measured 950 nits in HDR mode. It measured 400 nits in SDR mode.');
 assert.equal(x.references[0]?.decision,'blocked_context_change');
});
test('negative sentence blocks polarity continuity',()=>{
 const x=assertOffsets('Aster X100 measured 180°C. It did not reach 165°C.');
 assert.equal(x.references[0]?.decision,'blocked_polarity_change');
});
test('source text hash tampering fails before graph construction',()=>{
 const x=make('Aster X100 reached 165°C.');x.document.sha256='0'.repeat(64);
 assert.throws(()=>readDocumentReferences148(x));
});
test('duplicate explicit name does not invent independently verified relationship',()=>{
 const x=assertOffsets('Aster X100 recorded 180°C. Aster X100 recorded 165°C.');
 assert.ok(x.anchors.length>=2);assert.equal(x.references.length,0);
});
test('mixed categories do not require bespoke lexicons',()=>{
 const x=assertOffsets('Orion V500 reached 900 nits. It remained bright.');
 assert.equal(x.references[0].decision,'possible_unique_antecedent_unverified');
});
test('pure number and measurement do not create product antecedent',()=>{
 const x=assertOffsets('The 2% window produced 900 nits. It dropped to 400 nits.');
 assert.equal(x.references[0]?.decision,'unresolved_no_antecedent');
});
test('max references truncation reported explicitly',()=>{
 const x=readDocumentReferences148(make('It fell. It rose. It improved.'),1);
 assert.equal(x.references.length,1);assert.equal(x.coverageTruncated,true);
 assert.ok(x.truncationReasons.includes('document_reference_budget_exceeded'));
});
test('reference budget and context window reject unsupported values',()=>{
 for(const v of [0,-1,1.5,301])assert.throws(()=>readDocumentReferences148(make('It reached 20°C.'),v));
 for(const v of [0,-1,1.5,5])assert.throws(()=>readDocumentReferences148(make('It reached 20°C.'),10,v));
});
test('source document unchanged, no ranking or canonical writes',()=>{
 const x=assertOffsets('Aster X100 achieved 180°C. It reached 165°C.');
 assert.equal(x.sourceAuthenticated,false);assert.equal(x.rankingAuthorized,false);
 assert.equal(x.canonicalWriteAuthorized,false);assert.equal(x.accuracy,null);assert.equal(x.independentGoldAnnotations,0);
});
test('punctuation and decimal quantities preserve sentence context',()=>{
 const x=assertOffsets('Orion V500 achieved 1.5 hours. It used 300 W.');
 assert.equal(x.sentences.length,2);
 assert.equal(x.references[0]?.decision,'possible_unique_antecedent_unverified');
});
test('a longer paragraph still cannot turn unverified inference into fact',()=>{
 const x=assertOffsets('Orion V500 reached 150°C. This device reached 140°C.');
 assert.equal(x.references[0]?.decision,'possible_unique_antecedent_unverified');
 assert.equal(x.references[0]?.entailmentVerified,false);
});
test('an unrelated second model in intervening sentence blocks',()=>{
 const x=assertOffsets('Aster X100 measured 180°C. Birch B200 uses 300 W. It measured 165°C.');
 assert.equal(x.references[0]?.decision,'blocked_competing_antecedents');
});
test('empty text is rejected by previous source gate',()=>assert.throws(()=>run('')));
test('a paragraph break without punctuation is still recognized',()=>{
 const x=assertOffsets('Aster X100 reached 180°C\n\nIt reached 165°C.');
 assert.equal(x.sentences.length,2);assert.equal(x.references[0]?.decision,'blocked_paragraph_boundary');
});
test('no observations does not mean a product lacks the feature',()=>{
 const x=run('This reviewer says the device is pleasant.');
 assert.equal(x.noCandidateMeaning,'not_extracted_is_not_evidence_of_absence');
});
