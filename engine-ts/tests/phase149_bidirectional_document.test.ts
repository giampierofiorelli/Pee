import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readBidirectionalDocument149} from '../src/phase149_bidirectional_discourse_candidates.js';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function make(text:string, aliases:string[]=[]){return {document:{text,sha256:hash(text),source:{id:'phase149',originalDocumentId:'phase149',url:'https://example.org/author',title:'Developer example',role:'original_product_test' as const}},
 ...(aliases.length?{pageIdentity:{reviewedProductId:'unverified',reviewedVariantId:'unverified',reviewedAliases:aliases}}:{})};}
function run(text:string,aliases:string[]=[],max?:number){return readBidirectionalDocument149(make(text,aliases),max);}
function checked(text:string,aliases:string[]=[]){const g=run(text,aliases);
 for(const p of g.proposals){assert.equal(text.slice(p.mention.start,p.mention.end),p.mention.literal);
  assert.equal(p.mention.sha256,hash(p.mention.literal));assert.equal(p.sourceEvidenceSha256,p.mention.sha256);
  assert.equal(p.identityAuthenticated,false);assert.equal(p.canonicalWriteAuthorized,false);assert.equal(p.rankingAuthorized,false);
  assert.equal(p.entailmentVerified,false);assert.equal(p.sourceAuthenticated,false);
  for(const id of p.candidateAnchorIds)assert.ok(g.baseline148.anchors.some(a=>a.id===id));}
 assert.equal(g.sourceAuthenticated,false);assert.equal(g.canonicalWriteAuthorized,false);assert.equal(g.rankingAuthorized,false);
 return g;}

test('description before explicit later model proposes unverified forward candidate',()=>{
 const g=checked('This player sounded balanced. TEAC VRDS-701 includes a DAC.');
 assert.equal(g.proposals[0].status,'forward_candidate_unverified');assert.equal(g.proposals[0].direction,'forward_same_paragraph');
 assert.equal(g.proposals[0].candidateAnchorIds.length,1);
 assert.equal(g.baseline148.references[0].decision,'unresolved_no_antecedent');
});
test('description and model in same sentence still candidate, not authenticated',()=>{
 const g=checked('This player, the TEAC VRDS-701, uses a DAC.');
 assert.equal(g.proposals[0].status,'forward_candidate_unverified');
});
test('raw it is never resolved by looking ahead',()=>{
 const g=checked('It sounded balanced. TEAC VRDS-701 includes a DAC.');
 assert.equal(g.proposals[0].status,'unresolved_no_safe_candidate');
});
test('multiple forward products block',()=>{
 const g=checked('This player performed well. TEAC VRDS-701 and Marantz CD6007 were compared.');
 assert.equal(g.proposals[0].status,'blocked_competing_candidates');
});
test('forward different versions of same model explicitly block merging',()=>{
 const g=checked('This model was compared. Aster X100 and Aster X100 Pro were tested.', ['Aster X100','Aster X100 Pro']);
 assert.equal(g.proposals[0].status,'blocked_variant_collision');
 assert.ok(g.variantWarnings.length>=1);
});
test('no forward matching beyond a paragraph',()=>{
 const g=checked('This player sounded balanced.\n\nTEAC VRDS-701 uses a DAC.');
 assert.equal(g.proposals[0].status,'unresolved_no_safe_candidate');
});
test('forward candidate blocked by intervening component',()=>{
 const g=checked('This model sounded good. The filter was replaced before Aster X100 was tested.');
 assert.equal(g.proposals[0].status,'blocked_nonproduct_competitor');
});
test('generic description across paragraph has candidate with no verified attachment',()=>{
 const g=checked('Aster X100 recorded 165°C.\n\nThis model stayed warm.');
 assert.equal(g.proposals[0].status,'cross_paragraph_candidate_unverified');
 assert.equal(g.proposals[0].candidateAnchorIds.length,1);
});
test('cross paragraph raw it remains blocked at baseline',()=>{
 const g=checked('Aster X100 recorded 165°C.\n\nIt stayed warm.');
 assert.equal(g.proposals[0].status,'prior_blocked');
});
test('cross paragraph must have exactly one named surface',()=>{
 const g=checked('Aster X100 and Birch B200 competed.\n\nThis model stayed warm.');
 assert.equal(g.proposals[0].status,'blocked_competing_candidates');
});
test('cross paragraph different variants remain distinct',()=>{
 const g=checked('Aster X100 and Aster X100 Pro ran the test.\n\nThis model stayed warm.', ['Aster X100','Aster X100 Pro']);
 assert.equal(g.proposals[0].status,'blocked_variant_collision');
});
test('cross paragraph claim cannot become reviewer measure',()=>{
 const g=checked('Aster X100 advertises 60 hours.\n\nThis model measured 54 hours.');
 assert.equal(g.proposals[0].status,'blocked_reporting_transition');
});
test('cross paragraph cannot transfer HDR conditions into SDR',()=>{
 const g=checked('Orion V500 reached 950 nits in HDR mode.\n\nThis model reached 400 nits in SDR mode.');
 assert.equal(g.proposals[0].status,'blocked_mode_transition');
});
test('cross paragraph component competes with named product',()=>{
 const g=checked('Aster X100 was tested. The battery was replaced.\n\nThis model stayed warm.');
 assert.equal(g.proposals[0].status,'blocked_nonproduct_competitor');
});
test('farther than adjacent paragraph does not bridge',()=>{
 const g=checked('Aster X100 was tested.\n\nOther experimental details followed.\n\nThis model stayed warm.');
 assert.equal(g.proposals[0].status,'unresolved_no_safe_candidate');
});
test('previous explicit product remains unverified, regression phase148',()=>{
 const g=checked('Aster X100 reached 150°C. This model reached 140°C.');
 assert.equal(g.proposals[0].status,'prior_candidate_unverified');
 assert.equal(g.proposals[0].baselineDecision,'possible_unique_antecedent_unverified');
});
test('existing blocks from phase148 are not silently overridden',()=>{
 const g=checked('Aster X100 has a heated dock. It reached 165°C.');
 assert.equal(g.proposals[0].status,'prior_blocked');
 assert.equal(g.proposals[0].baselineDecision,'blocked_competing_nonproduct_referent');
});
test('the model previously unsupported is recognized, still only candidate',()=>{
 const g=checked('Aster X100 reached 200°C. The model cooled quickly.');
 assert.equal(g.proposals[0].status,'prior_candidate_unverified');
});
test('same exact named model twice forms surface cluster, not same verified device',()=>{
 const g=checked('Aster X100 was tested. Aster X100 was evaluated.');
 const c=g.surfaceClusters.find(x=>x.nameKey==='aster x100');
 assert.ok(c);assert.equal(c.anchorIds.length,2);assert.equal(c.samePhysicalProductVerified,false);
});
test('variant warning requires shared numeric model stem',()=>{
 const g=checked('Aster X100 and Birch Y100 Pro were tested.');
 assert.equal(g.variantWarnings.length,0);
});
test('text integrity hash mismatch is rejected',()=>{
 const x=make('Aster X100 reached 150°C.');x.document.sha256='f'.repeat(64);
 assert.throws(()=>readBidirectionalDocument149(x));
});
test('invalid budget is rejected',()=>{
 for(const v of [0,-1,1.25,401])assert.throws(()=>readBidirectionalDocument149(make('It works.'),v));
 for(const v of [0,4,1.25])assert.throws(()=>readBidirectionalDocument149(make('It works.'),100,v));
});
test('truncation is visible and never interpreted as missing facts',()=>{
 const g=readBidirectionalDocument149(make('It works. It lasts. It warms.'),1);
 assert.equal(g.proposals.length,1);assert.equal(g.coverageTruncated,true);
 assert.ok(g.truncationReasons.includes('reference_proposal_budget_exceeded'));
 assert.equal(g.noCandidateMeaning,'not_extracted_is_not_evidence_of_absence');
});
test('empty text rejected by old validation gate',()=>assert.throws(()=>run('')));
test('no proven identity, entailment or accuracy even when forward appears unique',()=>{
 const g=checked('This oven warmed quickly. Aster X100 reached 200°C.');
 assert.equal(g.proposals[0].identityAuthenticated,false);
 assert.equal(g.independentGoldAnnotations,0);assert.equal(g.accuracy,null);
});
test('a named comparison target ahead is never assumed to be this TV',()=>{
 const g=checked('This TV features a similar backlight system to the Sony BRAVIA 9 II.', ['Sony BRAVIA 9 II']);
 assert.equal(g.proposals[0]?.status,'blocked_comparison_target');
});
test('unlike comparison blocks forward assignment',()=>{
 const g=checked('This player, unlike TEAC VRDS-701, lacks a balanced output.');
 assert.equal(g.proposals[0]?.status,'blocked_comparison_target');
});
