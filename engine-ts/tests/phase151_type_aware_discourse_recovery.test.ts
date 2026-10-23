import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {recoverTypedDocumentReferences151} from '../src/phase151_type_aware_discourse_recovery.js';
import {readBidirectionalDocument149} from '../src/phase149_bidirectional_discourse_candidates.js';
import type {ReaderInput139} from '../src/phase139_unmarked_english_candidate_reader.js';
const sha=(v:string)=>createHash('sha256').update(v).digest('hex');
function input(t:string, aliases:string[]=[]):ReaderInput139{
 return {document:{text:t,sha256:sha(t),source:{id:'p151',originalDocumentId:'p151',url:'https://example.org/original-source',title:'Constructed example',role:'original_product_test'}},
 ...(aliases.length?{pageIdentity:{reviewedProductId:'caller_unverified',reviewedVariantId:'caller_unverified',reviewedAliases:aliases}}:{})};
}
const read=(t:string,aliases:string[]=[])=>recoverTypedDocumentReferences151(input(t,aliases));
const target=(t:string, literal:string,aliases:string[]=[])=>{
 const g=read(t,aliases),r=g.proposals.find(x=>x.mention.literal===literal);
 assert.ok(r,`expected ${literal}`);
 assert.equal(t.slice(r.mention.start,r.mention.end),r.mention.literal);
 assert.equal(r.mention.sha256,sha(r.mention.literal));
 assert.equal(r.identityAuthenticated,false);assert.equal(r.entailmentVerified,false);
 assert.equal(r.experimentalContextTransferAuthorized,false);
 assert.equal(r.canonicalWriteAuthorized,false);assert.equal(r.rankingAuthorized,false);
 return {g,r};
};
const candidateNames=(g:ReturnType<typeof read>,ids:string[])=>ids.map(id=>g.baseline149.baseline148.anchors.find(x=>x.id===id)?.span.literal);
test('recovers explicit model reference across paragraph despite an intervening programme',()=>{
 const t='Aster X100 used the cotton cycle. The detergent drawer was checked. The filter was cleaned.\n\nThis model then ran a synthetic cycle.';
 const {g,r}=target(t,'This model');assert.equal(r.decision,'typed_cross_paragraph_candidate_unverified');
 assert.deepEqual(candidateNames(g,r.candidateAnchorIds),['Aster X100']);
});
test('recovers player forward through several sentences, without equating disc transport',()=>{
 const t='This player sounded balanced. The reviewer used the same amplifier. The disc transport was checked separately. TEAC VRDS-701 includes a DAC.';
 const {g,r}=target(t,'This player');assert.equal(r.decision,'typed_forward_candidate_unverified');
 assert.deepEqual(candidateNames(g,r.candidateAnchorIds),['TEAC VRDS-701']);
});
test('recovers textual coffee-product reference but segregates manufacturer channel',()=>{
 const t='Lumen C30 advertises a fast brewing time. The manufacturer describes its milk tank.\n\nThis model measured a longer extraction time in the review.';
 const {r}=target(t,'This model');assert.equal(r.decision,'typed_cross_paragraph_candidate_unverified');
 assert.equal(r.evidenceChannelSeparated,true);assert.equal(r.experimentalContextTransferAuthorized,false);
});
test('retains abstention when two products compete',()=>{
 const {r}=target('Orion V500 and Birch B200 were tested.\n\nThis TV looked brighter.', 'This TV');
 assert.equal(r.decision,'abstain_multiple_named_products');
});
test('retains variant ambiguity',()=>{
 const {r}=target('Aster X100 and Aster X100 Pro were compared.\n\nThis model was warmer.','This model',['Aster X100','Aster X100 Pro']);
 assert.equal(r.decision,'abstain_variant_collision');
});
test('bare it remains unresolved when components might be referents',()=>{
 const {r}=target('Lumen S100 has a woofer and a crossover.\n\nIt sounded harsh.','It');
 assert.equal(r.decision,'abstain_only_pronoun');
});
test('basket and sensor do not permit pronoun attribution',()=>{
 const {r}=target('Raven A120 has a basket with a sensor.\n\nIt ran hotter than expected.','It');
 assert.equal(r.decision,'abstain_only_pronoun');
});
test('comparison target after this TV is not assumed to be the described TV',()=>{
 const {r}=target('This TV looks similar to Sony BRAVIA 9 II.','This TV');
 assert.equal(r.decision,'abstain_explicit_comparison');
});
test('comparison target after this player is blocked',()=>{
 const {r}=target('This player is different from TEAC VRDS-701.','This player');
 assert.equal(r.decision,'abstain_explicit_comparison');
});
test('other player contrast between mention and named anchor blocks',()=>{
 const {r}=target('This player was tested. Another player was also tested. TEAC VRDS-701 measured quieter.','This player');
 assert.equal(r.decision,'abstain_explicit_comparison');
});
test('forward mention cannot blindly ignore prior named product',()=>{
 const {r}=target('Aster X100 was examined. This player sounded different. TEAC VRDS-701 was tested.','This player');
 assert.ok(!r.decision.includes('candidate_unverified'));
});
test('future competing names block a sole-target assumption',()=>{
 const {r}=target('This player was used. TEAC VRDS-701 sounded fine. Birch B200 was louder.','This player');
 assert.equal(r.decision,'abstain_multiple_named_products');
});
test('the same named model written twice is textual, not verified physical identity',()=>{
 const {r,g}=target('This player was evaluated. TEAC VRDS-701 has a DAC. TEAC VRDS-701 has balanced outputs.','This player');
 assert.equal(r.decision,'retained_phase149');
 assert.equal(r.candidateAnchorIds.length,1);assert.equal(g.baseline149.sourceAuthenticated,false);
});
test('forward search never crosses into later paragraph',()=>{
 const {r}=target('This player was examined. No model name was given.\n\nTEAC VRDS-701 was tested.','This player');
 assert.equal(r.decision,'abstain_missing_named_product');
});
test('forward search respects distance budget and does not silently attach',()=>{
 const t='This player was examined. The amplifier was unchanged. The speakers were unchanged. The disc was inspected. TEAC VRDS-701 sounded fine.';
 const r=recoverTypedDocumentReferences151(input(t),200,2).proposals.find(p=>p.mention.literal==='This player');
 assert.equal(r?.decision,'abstain_context_too_distant');
});
test('pronoun is not upgraded even with one nearby model',()=>{
 const {r}=target('Aster X100 reached 180°C. The filter was changed. It reached 165°C.','It');
 assert.equal(r.decision,'abstain_only_pronoun');
});
test('recognition is independent of repeated execution',()=>{
 const i=input('Aster X100 was tested.\n\nThis model was quiet.');
 assert.deepEqual(recoverTypedDocumentReferences151(i),recoverTypedDocumentReferences151(i));
});
test('all outputs preserve source hash and source references',()=>{
 const t='Aster X100 was tested.\n\nThis model was quiet.';
 const g=read(t);assert.equal(g.documentSha256,sha(t));
 assert.equal(g.sourceId,'p151');assert.equal(g.originalDocumentId,'p151');
 assert.equal(g.noCandidateMeaning,'no_safe_textual_link_does_not_mean_absence_of_product_evidence');
});
test('reject forged source digest',()=>{
 const i=input('Aster X100 was tested.');i.document.sha256='0'.repeat(64);
 assert.throws(()=>recoverTypedDocumentReferences151(i));
});
test('reject invalid candidate budgets',()=>{
 const i=input('Aster X100 was tested.');
 assert.throws(()=>recoverTypedDocumentReferences151(i,0));
 assert.throws(()=>recoverTypedDocumentReferences151(i,200,9));
 assert.throws(()=>recoverTypedDocumentReferences151(i,200,5,0));
});
test('source original phase149 graph is not mutated by recovery',()=>{
 const i=input('Aster X100 was tested.\n\nThis model was quiet.');
 const before=readBidirectionalDocument149(i);const output=recoverTypedDocumentReferences151(i);
 assert.deepEqual(output.baseline149,before);assert.deepEqual(readBidirectionalDocument149(i),before);
});
test('out-of-domain generic mention still needs a named source',()=>{
 const {r}=target('This oven was hot. No model was named.','This oven');
 assert.equal(r.decision,'abstain_missing_named_product');
});
test('unsupported bare demonstrative does not become product identity',()=>{
 const {g}=target('Aster X100 was tested. It was loud.','It');
 assert.equal(g.proposals.find(x=>x.mention.literal==='It')?.decision,'retained_phase149');
 assert.equal(g.proposals.find(x=>x.mention.literal==='It')?.identityAuthenticated,false);
});

test('unindexed spaced model code blocks unsafe forward link',()=>{
 const {r}=target('This player was used. TEAC VRDS-701 sounded fine. Marantz CD 70 was louder.','This player');
 assert.equal(r.decision,'abstain_multiple_named_products');
 assert.ok(r.reasons.includes('unindexed_model_code_might_be_second_product'));
});
