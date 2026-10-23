import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseDocumentBytes228,type DocClaim228} from '../src/phase228_document_observer.js';
import {buildDocumentDiscrepancies238} from '../src/phase238_document_discrepancy_graph.js';
const sha=(v:string)=>createHash('sha256').update(v).digest('hex');
const read=(p:string)=>parseDocumentBytes228(readFileSync(p),'pdf');
const H=sha('document238');
const create=(i:number,extra:Partial<DocClaim228>):DocClaim228=>({
 claimId:sha('claim'+i),label:'net weight',value:10,unit:'kg',model:null,
 modelAssignment:'unresolved',locator:{page:i,line:2},sourceRole:'publisher_document_claim_unverified',
 testedPerformance:false,methodReviewed:false,exactVariantVerified:false,rankingAuthorized:false,
 ...extra
});
const graph=(...claims:DocClaim228[])=>buildDocumentDiscrepancies238(H,claims);
test('238: programme prose vs table typed conflict covers bounds, not a guessed winner',async()=>{
 const a=(await read('evaluation/phase236/SYNTHETIC-program.pdf')).claims[0];
 const b=(await read('evaluation/phase237/SYNTHETIC-single-good.pdf')).claims[0];
 const adapted={...b,claimId:sha('newtable'),locator:{page:9,line:5},
  programTableSetting:{...b.programTableSetting!,program:'yogurt',foodType:null,
   defaultDurationMinutes:480,adjustableDurationMinutes:{lower:60,upper:720}}};
 const g=graph(a,adapted);
 assert.equal(g.edges.length,1);
 assert.equal(g.edges[0].kind,'programme_control_disagreement');
 assert.deepEqual(g.edges[0].conflictingFields,['adjustable_duration.lower']);
 assert.equal(g.authoritativeChoice,null);assert.equal(g.rankingAuthorized,false);
 assert.equal(g.edges[0].resolution,'unresolved_source_disagreement');
});
test('238: duplicate equal programme range does not produce a conflict',async()=>{
 const a=(await read('evaluation/phase236/SYNTHETIC-program.pdf')).claims[0];
 const b=(await read('evaluation/phase237/SYNTHETIC-single-good.pdf')).claims[0];
 const adapted={...b,claimId:sha('match'),locator:{page:10,line:6},
  programTableSetting:{...b.programTableSetting!,program:'yogurt',foodType:null,
   defaultDurationMinutes:480,adjustableDurationMinutes:{lower:360,upper:720}}};
 assert.equal(graph(a,adapted).edges.length,0);
});
test('238: food-specific programme defaults cannot conflict with a global duration',async()=>{
 const a=(await read('evaluation/phase236/SYNTHETIC-program.pdf')).claims[0];
 const b=(await read('evaluation/phase237/SYNTHETIC-multi-good.pdf')).claims[0];
 assert.equal(graph(a,{...b,programTableSetting:{...b.programTableSetting!,program:'yogurt'}}).edges.length,0);
});
test('238: same declared model/field unit conflicting scalar creates discrepancy',()=>{
 const x=create(1,{variantModel:'WD04',variantType:'document_declared_product_variant'});
 const y=create(2,{variantModel:'WD04',variantType:'document_declared_product_variant',value:12});
 const d=graph(x,y);assert.equal(d.edges.length,1);
 assert.equal(d.edges[0].kind,'exact_document_declared_model_scalar_disagreement');
 assert.deepEqual(d.edges[0].conflictingFields,['value']);
});
test('238: different product variants or catalogue columns must not conflict',()=>{
 const x=create(1,{variantModel:'WD04',variantType:'document_declared_product_variant'});
 const y=create(2,{variantModel:'WD05',variantType:'document_declared_product_variant',value:12});
 assert.equal(graph(x,y).edges.length,0);
});
test('238: no inferred product or component means no scalar comparison',()=>{
 assert.equal(graph(create(1,{}),create(2,{value:14})).edges.length,0);
});
test('238: different conditions and measurement denominators must not conflict',()=>{
 const x=create(1,{catalogModel:'PWM 507',catalogType:'document_declared_catalog_product',condition:'with filter'});
 const y=create(2,{catalogModel:'PWM 507',catalogType:'document_declared_catalog_product',condition:'without filter',value:12});
 assert.equal(graph(x,y).edges.length,0);
 const z=create(3,{catalogModel:'PWM 507',catalogType:'document_declared_catalog_product',condition:'with filter',measurementBasis:'per 100 operating cycles; wash cycle',value:14});
 assert.equal(graph(x,z).edges.length,0);
});
test('238: conditional component same trigger disagreement but distinct trigger states are not conflicts',()=>{
 const common={label:'milk tube length',unit:'cm',scopeComponent:'milk tube',
  configurationDependency:{triggerAccessory:'fridge',triggerState:'present' as const,requirement:'use_dimension_when_condition_met' as const},condition:'fridge present'};
 const a=create(1,{...common,value:50}),b=create(2,{...common,value:60});
 assert.equal(graph(a,b).edges[0].kind,'conditional_component_value_disagreement');
 const c=create(3,{...common,value:40,condition:'fridge absent',configurationDependency:{...common.configurationDependency,triggerState:'absent'}});
 assert.equal(graph(a,c).edges.length,0);
});
test('238: refuse contaminated independent/ranking or invalid source identities',()=>{
 assert.throws(()=>graph(create(1,{rankingAuthorized:true as false})),/phase238_invalid_discrepancy_inputs/);
 assert.throws(()=>buildDocumentDiscrepancies238('no',[]),/phase238_invalid_discrepancy_inputs/);
});
test('238: deterministic and preserves only hashes/locators no source bodies',()=>{
 const a=create(1,{variantModel:'WD04',variantType:'document_declared_product_variant'});
 const b=create(2,{variantModel:'WD04',variantType:'document_declared_product_variant',value:12});
 assert.deepEqual(graph(a,b),graph(a,b));
 assert.ok(!JSON.stringify(graph(a,b)).includes('sourceText'));
 assert.equal(graph(a,b).crossDocumentIdentityEstablished,false);
});
test('238: integrated Python to TS reads remains safe and discrepancy graph attached',async()=>{
 const d=await read('evaluation/phase237/SYNTHETIC-multi-good.pdf');
 assert.equal(d.discrepancies?.schema,'pee238.document-local-discrepancies.v1');
 assert.equal(d.discrepancies?.documentSha256,d.documentSha256);
 assert.equal(d.discrepancies?.rankingAuthorized,false);
 assert.equal(d.scientificEvidenceAdmitted,false);
});
