import {test} from 'node:test';
import assert from 'node:assert/strict';
import {researchCategoryTransfer174,listTransferMethodReferences174} from '../src/phase174_category_transfer_probe.js';
import {researchTaskScope173} from '../src/phase173_goal_scope_adapter.js';
const probe=(q:string)=>researchCategoryTransfer174({question:q,language:'en'});
const wanted=(q:string)=>probe(q).facets.filter(f=>f.polarity==='wanted').map(x=>x.id);
const rejected=(q:string)=>probe(q).facets.filter(f=>f.polarity==='rejected').map(x=>x.id);
const at=(q:string,id:string)=>probe(q).facets.find(f=>f.id===id);

test('Phase173 inherited object is genuine and not silently rewritten',()=>{
 const q='I want an electric kettle with temperature control';const x=probe(q);
 assert.equal(x.inherited173.phase,173);assert.equal(x.inherited173.rankingAuthorized,false);
 assert.equal(x.inherited173.target,'unknown');assert.equal(x.target,'electric_kettle');
 const previous=researchTaskScope173({question:q,language:'en'});
 assert.equal(researchCategoryTransfer174({question:q,language:'en',phase173:previous}).requestSha256,x.requestSha256);
});
test('a forged or cross-request Phase173 scope is rejected',()=>{
 const p=researchTaskScope173({question:'I need a kettle',language:'en'});
 assert.throws(()=>researchCategoryTransfer174({question:'I want a kettle',language:'en',phase173:p}),/phase174_inherited_scope_untrusted/);
 assert.throws(()=>researchCategoryTransfer174({question:'I need a kettle',language:'en',phase173:{...p,rankingAuthorized:true} as never}),/phase174_inherited_scope_untrusted/);
});
test('canonical fingerprints are stable only for identical identified features',()=>{
 const a=probe('Need a kettle with temperature control for a single cup');
 const b=probe('I want an electric kettle for one cup and variable temperature');
 assert.equal(a.recognizedFacetFingerprint,b.recognizedFacetFingerprint);
 assert.notEqual(a.requestSha256,b.requestSha256);
 assert.notEqual(a.recognizedFacetFingerprint,probe('Need a kettle with temperature control').recognizedFacetFingerprint);
});
test('no ranks, vetoes, verified methods or invented product observations',()=>{
 for(const q of ['Need a kettle for one cup','Water filter for PFAS and lead','Pasta maker for rigatoni']){
  const x=probe(q);assert.equal(x.rankingAuthorized,false);assert.equal(x.exclusionsAuthorized,false);
  assert.equal(x.realProductEvidenceAvailable,false);assert.equal(x.languageUnderstandingValidated,false);
  assert.ok(x.facets.every(f=>f.domainReviewNeeded&&!f.verifiedProductCapability&&!f.hardExclusionAuthorized&&!f.rankingWeightAuthorized));
  assert.ok(x.methodPointers.every(m=>m.technicalValidation===false));
 }
});
test('unknown category does not acquire facets by unrelated terms',()=>{
 const x=probe('I need an oven for lasagne.');assert.equal(x.target,null);assert.equal(x.facets.length,0);
 assert.equal(x.rankingAuthorized,false);
});
test('ambiguous cross-category request abstains instead of guessing target',()=>{
 const x=probe('I want an electric kettle and a drinking water filter');
 assert.equal(x.target,null);assert.equal(x.facets.length,0);
 assert.ok(x.unresolvedIssues.includes('multiple_product_families_requires_scope_resolution'));
});
test('existing coffee grinder remains Phase173 territory',()=>{
 const x=probe('I ordered an espresso machine. Which grinder should I buy?');
 assert.equal(x.target,null);
 // Phase174 corrected an inherited false system-target interpretation.
 assert.equal(x.inherited173.target,'coffee_grinder');
});
test('a use question is not converted into purchase advice',()=>{
 const x=probe('How do I clean my pasta maker?');assert.equal(x.task,'use_or_troubleshoot');
 assert.ok(x.unresolvedIssues.includes('not_a_product_selection_request'));
});
test('a category alone triggers an appropriate abstention not a fictional goal',()=>{
 const x=probe('I need an electric kettle');assert.deepEqual(x.facets,[]);
 assert.ok(x.unresolvedIssues.includes('no_supported_usage_goal_detected'));
});
test('span anchoring survives uppercase and punctuation',()=>{
 const q='Could you recommend an electric kettle? I NEED a SINGLE CUP.';const f=at(q,'kettle_small_fill');
 assert.ok(f);assert.equal(q.slice(f.start,f.end),f.observedSpan);
});
test('unsupported other language is rejected by the interface',()=>{
 assert.throws(()=>researchCategoryTransfer174({question:'Mi serve un bollitore',language:'it' as 'en'}),/phase174_invalid_input/);
});

const accepted:[string,string,string][]=[
 ['electric_kettle','I need a kettle for just a cup','kettle_small_fill'],
 ['electric_kettle','Looking for an electric kettle that can boil one cup','kettle_small_fill'],
 ['electric_kettle','Need a kettle with variable temperature','kettle_temperature'],
 ['electric_kettle','Recommend a gooseneck kettle for pour-over coffee','kettle_precision_pour'],
 ['electric_kettle','I want a kettle that can pour quickly into a pot','kettle_fast_pour'],
 ['electric_kettle','Which kettle is easier? I struggle to lift it','kettle_lifting'],
 ['electric_kettle','Looking for a kettle with limescale problems in mind','kettle_limescale'],
 ['drinking_water_filter','I want a water filter because my tap has a chlorine taste','water_chlorine_taste'],
 ['drinking_water_filter','Need a drinking water filter that reduces PFAS','water_pfas'],
 ['drinking_water_filter','I want a water filter to remove lead','water_lead'],
 ['drinking_water_filter','I want a water filter for very hard water','water_hardness'],
 ['drinking_water_filter','I want a renter-friendly water filter','water_no_plumbing'],
 ['drinking_water_filter','Need an under-sink water filter, no separate faucet','water_no_faucet'],
 ['drinking_water_filter','I need a water filter and care about replacement filter cost','water_replacement_cost'],
 ['pasta_maker','Need a pasta machine for lasagne and ravioli','pasta_sheets'],
 ['pasta_maker','I want a pasta maker for rigatoni','pasta_extruded_shapes'],
 ['pasta_maker','Looking for a pasta maker that mixes the dough for me','pasta_auto_mix'],
 ['pasta_maker','I want a pasta maker that is easy to clean','pasta_cleanup'],
];
for(const [family,q,facet] of accepted)test(`bounded transfer: ${facet}: ${q}`,()=>{
 const x=probe(q);assert.equal(x.target,family);assert.ok(x.facets.some(f=>f.id===facet&&f.polarity==='wanted'));
});
test('explicit refusal of variable temperature is not interpreted as desired accuracy',()=>{
 assert.ok(rejected("I don't need variable temperature, I want an electric kettle for a single cup").includes('kettle_temperature'));
 assert.ok(wanted("I don't need variable temperature, I want an electric kettle for a single cup").includes('kettle_small_fill'));
});
test('no drilling is a positive restriction and not a rejection of the restriction',()=>{
 assert.ok(wanted('I want a water filter with no drilling, I am renting').includes('water_no_plumbing'));
});
test('lead and PFAS remain distinct claim targets',()=>{
 const x=probe('I need a water filter for PFAS and to remove lead from my drinking water');
 assert.ok(x.facets.some(f=>f.id==='water_pfas'));
 assert.ok(x.facets.some(f=>f.id==='water_lead'));
 assert.ok(x.methodPointers.some(p=>p.methods.some(m=>m.id==='nsf_pfas')));
 assert.ok(x.methodPointers.some(p=>p.methods.some(m=>m.id==='nsf_42_53_401')));
});
test('PFAS warning stays visible without pretending filter is certified',()=>{
 const x=probe('Need a water filter for PFAS');
 assert.match(x.firstLayer.join(' '),/Boiling water does not remove PFAS/);
 assert.ok(x.facets.every(f=>f.verifiedProductCapability===false));
});
test('hardness and contaminant reduction are not interchangeable',()=>{
 const x=probe('I need a water filter for hard water');
 assert.ok(x.unresolvedIssues.includes('hardness_is_not_equivalent_to_health_contaminant_reduction'));
 assert.ok(x.methodPointers.some(p=>p.observable==='hardness_change_under_test'&&p.methodStatus==='method_missing'));
});
test('no specific water quality concern requires a useful question',()=>{
 const x=probe('Looking for a drinking water filter for my kitchen');
 assert.ok(x.unresolvedIssues.includes('water_quality_objective_or_contaminant_unknown'));
 assert.match(x.clarification??'',/taste, limescale/);
});
test('pasta roller and extrusion are separate process hypotheses',()=>{
 const x=probe('I want a pasta maker for ravioli and penne');
 assert.ok(x.unresolvedIssues.includes('multi_process_pasta_family_requires_mechanism_comparison'));
 assert.ok(x.firstLayer.some(s=>s.includes('roller does not automatically')));
});
test('cleaning and automatic kneading do not imply a verified motorized machine',()=>{
 const x=probe('I want a pasta maker that does all the mixing and is easy to clean');
 assert.ok(x.facets.some(f=>f.id==='pasta_auto_mix'));
 assert.ok(x.facets.some(f=>f.id==='pasta_cleanup'));
 assert.equal(x.realProductEvidenceAvailable,false);
});
test('opposing pour priorities trigger a visible trade-off warning',()=>{
 const x=probe('Need a kettle with gooseneck precise pouring but good water flow for filling a pot');
 assert.ok(x.facets.some(f=>f.id==='kettle_precision_pour'));
 assert.ok(x.facets.some(f=>f.id==='kettle_fast_pour'));
 assert.ok(x.firstLayer.some(s=>s.includes('may conflict')));
});
test('declined accuracy request does not become an accepted need',()=>{
 const x=probe("Don't want exact temperature, need a kettle for one cup");
 assert.ok(rejected("Don't want exact temperature, need a kettle for one cup").includes('kettle_temperature'));
 assert.ok(x.facets.every(f=>f.rankingWeightAuthorized===false));
});
test('documented methods have distinct credibility scopes and cannot authorize ranking',()=>{
 const refs=listTransferMethodReferences174();assert.equal(refs.length,5);
 assert.ok(refs.some(r=>r.kind==='certification_scope'));
 assert.ok(refs.some(r=>r.kind==='manufacturer_function_documentation'));
 assert.ok(refs.some(r=>r.kind==='independent_professional_comparative_method'));
 assert.ok(refs.every(r=>r.sourceUrl.startsWith('https://')&&r.scopeWarning.length>50));
});
test('developer challenge source paraphrase: kettle durable vs fast pouring',()=>{
 const x=probe('I want a kettle with temperature control but also good water flow for other things than tea');
 assert.ok(x.facets.some(f=>f.id==='kettle_temperature'));
 assert.ok(x.facets.some(f=>f.id==='kettle_fast_pour'));
});
test('developer challenge source paraphrase: rental water PFAS heavy metals',()=>{
 const x=probe('Need a water filter for a rental, cannot drill, concerned about PFAS and heavy metals');
 assert.ok(x.facets.some(f=>f.id==='water_no_plumbing'));
 assert.ok(x.facets.some(f=>f.id==='water_pfas'));
 assert.ok(x.facets.some(f=>f.id==='water_lead'));
});
test('developer challenge source paraphrase: roller already owned, extruder requested is not equal',()=>{
 const x=probe('I have a pasta roller and want a pasta extruder for bucatini');
 assert.equal(x.target,'pasta_maker');assert.ok(x.facets.some(f=>f.id==='pasta_extruded_shapes'));
 assert.equal(x.rankingAuthorized,false);
});

for(const [q,category] of [
 ['I need to remove PFAS from my tap water','drinking_water_filter'],
 ['I want to make rigatoni at home','pasta_maker'],
 ['I need to heat one cup of water','electric_kettle'],
] as const)test(`goal-only candidate stays provisional: ${q}`,()=>{
 const x=probe(q);assert.equal(x.target,category);assert.equal(x.targetBasis,'usage_clue_only');
 assert.ok(x.unresolvedIssues.includes('goal_only_category_requires_confirmation'));
 assert.equal(x.rankingAuthorized,false);assert.match(x.clarification??'',/equipment/);
});
test('generic goal never creates a compulsory shopping category',()=>{
 const x=probe('I want delicious hot drinks');assert.equal(x.target,null);
 assert.equal(x.targetBasis,'unresolved');assert.equal(x.facets.length,0);
});

for(const category of ['electric kettle','water filter','pasta maker']){
 test(`generic reliability facet transfers to ${category} without product proof`,()=>{
  const x=probe(`Need a long-lasting ${category}`);
  assert.ok(x.facets.some(f=>f.id==='transfer_reliability'));
  assert.ok(x.methodPointers.some(p=>p.observable==='field_failure_rate_by_cohort'&&p.methodStatus==='method_missing'));
 });
 test(`generic footprint facet transfers to ${category} without model fit proof`,()=>{
  const x=probe(`Looking for a ${category} for a tiny countertop`);
  assert.ok(x.facets.some(f=>f.id==='transfer_space'));
  assert.equal(x.exclusionsAuthorized,false);
 });
}

test('wetted plastic restriction and double walls stay separately proposed',()=>{
 const x=probe('I want a kettle with no plastic parts touching the water and double walls');
 assert.ok(x.facets.some(f=>f.id==='kettle_wetted_material'));
 assert.ok(x.facets.some(f=>f.id==='kettle_double_wall'));
 assert.ok(x.methodPointers.some(p=>p.observable==='wetted_parts_materials_by_variant'&&p.methodStatus==='method_missing'));
});
test('generic better water taste never invents a chlorine exposure',()=>{
 const x=probe('Looking for a water filter to improve the taste of my drinking water');
 assert.ok(x.facets.some(f=>f.id==='water_general_taste'));
 assert.ok(!x.facets.some(f=>f.id==='water_chlorine_taste'));
 assert.ok(x.unresolvedIssues.includes('water_taste_cause_unknown'));
});
test('two mentions of a constraint do not double-count it',()=>{
 const x=probe('Need a renter-friendly water filter, with no drilling');
 assert.equal(x.facets.filter(f=>f.id==='water_no_plumbing').length,1);
});
test('water treatment system choice is not silently reduced to one technology',()=>{
 const x=probe('I need a water filter; RO versus other treatments?');
 assert.equal(x.task,'solution_comparison');
 assert.ok(x.unresolvedIssues.includes('water_quality_objective_or_contaminant_unknown'));
});
test('pasta machine symptom recognition flags troubleshooting not buying',()=>{
 const x=probe('My automatic pasta maker gives dense penne, what should I change?');
 assert.equal(x.task,'use_or_troubleshoot');assert.equal(x.rankingAuthorized,false);
});

test('consequential explicit material and installed-space limits appear in first layer',()=>{
 const x=probe('Need an electric kettle with no plastic parts touching the water and limited counter space');
 assert.ok(x.firstLayer.some(t=>t.includes('water-contact part')));
 assert.ok(x.firstLayer.some(t=>t.includes('operating clearance')));
});
test('lead and faucet constraints stay visible ahead of optional source detail',()=>{
 const x=probe('Need a water filter to remove lead. No separate faucet');
 assert.ok(x.firstLayer.some(t=>t.includes('lead reduction claim')));
 assert.ok(x.firstLayer.some(t=>t.includes('separate faucet')));
});

test('rejected health-contaminant goal cannot be presented as a demand',()=>{
 const x=probe("I don't want PFAS reduction; I need a water filter for better taste");
 assert.ok(x.facets.some(f=>f.id==='water_pfas'&&f.polarity==='rejected'));
 assert.ok(x.unresolvedIssues.includes('water_taste_cause_unknown'));
 assert.ok(!x.firstLayer.some(t=>t.includes('Boiling water does not remove PFAS')));
});
test('rejected extruded shape does not create a multi-process purchase requirement',()=>{
 const x=probe("I don't want rigatoni. Need a pasta maker for ravioli");
 assert.ok(!x.unresolvedIssues.includes('multi_process_pasta_family_requires_mechanism_comparison'));
});

test('owned kettle and explicitly requested water filter resolve to distinct roles',()=>{
 const x=probe('I already own a kettle but need a water filter for PFAS');
 assert.equal(x.target,'drinking_water_filter');
 assert.deepEqual(x.ownedEquipmentEvidence174.map(m=>m.family),['electric_kettle']);
 assert.ok(x.facets.some(f=>f.id==='water_pfas'&&f.polarity==='wanted'));
 assert.ok(!x.facets.some(f=>f.family==='electric_kettle'));
 assert.equal(x.rankingAuthorized,false);
});
test('owned water filter and wanted single-cup kettle resolve to target kettle',()=>{
 const x=probe('I have a water filter but need a kettle that heats just one cup');
 assert.equal(x.target,'electric_kettle');
 assert.deepEqual(x.ownedEquipmentEvidence174.map(m=>m.family),['drinking_water_filter']);
 assert.ok(x.facets.some(f=>f.id==='kettle_small_fill'));
});
test('two requested equipment families do not collapse into one target',()=>{
 const x=probe('I need a kettle and a water filter for my kitchen');
 assert.equal(x.target,null);assert.equal(x.facets.length,0);
 assert.ok(x.unresolvedIssues.includes('multiple_product_families_requires_scope_resolution'));
});
test('mentioning multiple owned devices without a new target remains unresolved',()=>{
 const x=probe('I have a water filter and a kettle. Which should I replace?');
 assert.equal(x.target,null);assert.equal(x.rankingAuthorized,false);
});
test('taste request is an objective, not evidence that chlorine is present',()=>{
 const x=probe('I want a water filter for better taste');
 assert.ok(x.facets.some(f=>f.id==='water_general_taste'));
 assert.ok(!x.unresolvedIssues.includes('water_quality_objective_or_contaminant_unknown'));
 assert.ok(x.unresolvedIssues.includes('water_taste_cause_unknown'));
 assert.match(x.clarification??'',/taste or smell/);
});
test('declared chlorine taste has an identified candidate cause, still unverified',()=>{
 const x=probe('I want a water filter because it tastes like chlorine');
 assert.ok(x.facets.some(f=>f.id==='water_chlorine_taste'));
 assert.equal(x.realProductEvidenceAvailable,false);
});
test('scale flakes in a kettle do not silently imply filter softening',()=>{
 const x=probe('I need a kettle because my old one gets limescale flakes');
 assert.ok(x.facets.some(f=>f.id==='kettle_limescale'));
 assert.ok(x.firstLayer.some(t=>t.includes('does not remove dissolved hardness minerals')));
});
test('recognized canonical fingerprint ignores wording order for the same recognized goals',()=>{
 const a=probe('Need a kettle with variable temperature and for just one cup');
 const b=probe('I want an electric kettle for one cup with temperature control');
 assert.equal(a.recognizedFacetFingerprint,b.recognizedFacetFingerprint);
 assert.notEqual(a.requestSha256,b.requestSha256);
});

test('negative verb governs a contaminant name rather than becoming a demand',()=>{
 const x=probe('I want a water filter to improve taste, not remove PFAS');
 assert.ok(x.facets.some(f=>f.id==='water_pfas'&&f.polarity==='rejected'));
 assert.ok(x.firstLayer.every(t=>!t.includes('Boiling water does not remove PFAS')));
});
