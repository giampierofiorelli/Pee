import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedIntent114,hygieneKnowledgeAudit114,type Product114,type Fact114} from '../src/phase114_hygiene_capability_audit.js';
const fact=(kind:Fact114['kind'],origin:Fact114['origin']='independent_observation'):Fact114=>({kind,origin,sourceUrl:'https://www.rtings.com/robot-vacuum/reviews/eufy/omni-s2',originalTestId:'s2_review_original',context:'hard_floor'});
const a:Product114={id:'eufy_omni_s2',name:'eufy Omni S2',facts:[fact('wet_mopping_floor'),fact('manufacturer_floor_germ_claim','manufacturer_declaration'),fact('dock_hot_mop_wash'),fact('independent_stain_removal')]};
const b:Product114={id:'dreame_aqua10',name:'Dreame Aqua10 Ultra Roller',facts:[fact('wet_mopping_floor'),fact('continuous_clean_roller_rinse'),fact('independent_hard_floor_pickup')]};
const q='Trovami tutti i migliori robot che igienizzano il pavimento';
test('overall quality WITH hygiene, not hygiene as sole optimization goal',()=>{
 const i=boundedIntent114(q)!;assert.equal(i.objective,'best_overall_with_capability');assert.deepEqual(i.hardRequirements,[]);
});
test('different actual objective maximizing hygiene is not conflated',()=>{
 assert.equal(boundedIntent114('Trovami i robot che igienizzano di più il pavimento')?.objective,'maximize_floor_hygiene');
});
test('paraphrase preserves primary objective in bounded grammar',()=>{
 assert.equal(boundedIntent114('Quali sono i migliori robot che igienizzano i pavimenti')?.objective,'best_overall_with_capability');
});
test('hygiene meaning is unresolved without microbial target',()=>{
 assert.equal(boundedIntent114(q)?.scope,'ambiguous_cleaning_vs_microbes');
 assert.equal(boundedIntent114('Trovami migliori robot che disinfettano il pavimento')?.scope,'microbial_floor_effect');
});
test('manufacturer claim not mistaken for independently validated germ reduction',()=>{
 const x=hygieneKnowledgeAudit114(q,[a,b],'snapshot_20261011');
 assert.equal(x.rows.find(r=>r.id===a.id)?.floorMicrobeEvidence,'manufacturer_declared_only');
 assert.equal(x.rows.find(r=>r.id===b.id)?.floorMicrobeEvidence,'not_found_in_examined_sources');
 assert.ok(x.verificationGaps.includes('no_floor_microbiological_qualification_in_checked_evidence'));
});
test('independent mop washing or pad rinsing not presented as floor disinfection',()=>{
 const x=hygieneKnowledgeAudit114(q,[a,b],'snapshot_20261011');
 assert.equal(x.floorDisinfectionCannotBeInferredFromDockWash,true);
 assert.equal(x.manufacturerClaimCannotBeTreatedAsLabTest,true);
});
test('ranking must abstain without validated MCDA and assay',()=>{
 const x=hygieneKnowledgeAudit114(q,[a,b],'snapshot_20261011');
 assert.equal(x.overallRanking,null);assert.equal(x.secondaryHygieneRanking,null);assert.equal(x.publicationReady,false);
});
test('candidate order cannot change knowledge audit',()=>{
 assert.deepEqual(hygieneKnowledgeAudit114(q,[a,b],'snapshot_20261011').rows,
  hygieneKnowledgeAudit114(q,[b,a],'snapshot_20261011').rows);
});
test('two different requests never mutate the product evidence inputs',()=>{
 const before=JSON.stringify([a,b]);
 hygieneKnowledgeAudit114(q,[a,b],'snapshot_20261011');
 hygieneKnowledgeAudit114('Trovami i robot che igienizzano di più il pavimento',[a,b],'snapshot_20261011');
 assert.equal(before,JSON.stringify([a,b]));
});
test('strict floor microbial claim needs actual microbe-targeted original assay',()=>{
 assert.throws(()=>hygieneKnowledgeAudit114(q,[{...b,facts:[fact('independent_floor_microbe_test')]}],'snapshot_20261011'),/floor_microbiology_unverified/);
});
test('verified bacteria floor assay is not a verified virus floor assay',()=>{
 const bacteria:Fact114={...fact('independent_floor_microbe_test'),targetOrganism:'bacteria',assayMethod:'actual_validated_floor_assay'};
 const x=hygieneKnowledgeAudit114(q,[{...b,facts:[...b.facts,bacteria]}],'snapshot_20261011');
 assert.equal(x.rows[0].floorMicrobeEvidence,'independently_tested_for_specific_target_only');
 assert.deepEqual(x.rows[0].independentlyTestedTargets,['bacteria']);
 const viral=hygieneKnowledgeAudit114('Trovami i migliori robot che disinfettano il pavimento contro i virus',[{...b,facts:[...b.facts,bacteria]}],'snapshot_20261011');
 assert.ok(viral.verificationGaps.includes('no_independent_floor_assay_for_requested_viruses'));
 assert.equal(x.overallRanking,null);
});
test('cannot recast promotional observation as independent',()=>{
 assert.throws(()=>hygieneKnowledgeAudit114(q,[{...a,facts:[fact('manufacturer_floor_germ_claim')]}],'snapshot_20261011'),/marketing_promoted/);
});
test('cannot include duplicate exact variant',()=>{
 assert.throws(()=>hygieneKnowledgeAudit114(q,[a,a],'snapshot_20261011'),/duplicate/);
});
test('does not infer non-tested product as failing mandatory feature',()=>{
 assert.equal(hygieneKnowledgeAudit114(q,[a,b],'snapshot_20261011').noProductExcludedBecauseOfMissingTests,true);
});
