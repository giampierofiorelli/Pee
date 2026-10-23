/** Phase 115 – evidence-grounded hygiene process reasoning.
 * Distinguishes a mechanistic contribution to ordinary wet cleaning from any
 * independently demonstrated microbiological outcome on the FLOOR.
 * Source and product memories stay user-neutral; outputs are context projections.
 * A mechanistic link is a QUALIFIED INFERENCE, not an equipment assay or a score.
 * No public recommendation or uncalibrated numerical ranking is produced.
 */
import {createHash} from 'node:crypto';
import {boundedIntent114,type Product114,type Fact114} from './phase114_hygiene_capability_audit.js';

export type Step115 =
  'wet_floor_wiping'|'measured_floor_soil_removal'|'observed_stain_removal'|
  'pre_cycle_pad_washing'|'during_cycle_pad_rinsing'|'onboard_dirty_water_capture'|
  'post_cycle_pad_washing'|'pad_drying'|'dock_heated_pad_washing'|
  'heated_water_on_floor'|'measured_dock_water_temperature'|
  'observed_soil_smearing'|'observed_pet_waste_smearing'|'expert_warns_pet_waste_transfer'|
  'microbial_assay_pad'|'microbial_assay_floor';
export type Scope115 = 'floor'|'pad'|'dock'|'onboard_water';
export type Origin115='independent_product_test'|'manufacturer_declaration';
export type Finding115='present'|'absent';
export interface HygieneEvidence115 {
  step:Step115;
  target:Scope115;
  finding:Finding115;
  origin:Origin115;
  sourceUrl:string;
  originalTestId:string;
  method:string;
  context:string;
  /** Exact product variant is specified by the containing product. */
  protocolVersion?:string;
  organism?:'bacteria'|'viruses';
  measuredLog10Reduction?:number;
  /** Temperature has units and location; must not become an assay. */
  measuredTemperatureC?:number;
}
export interface HygieneProduct115 {id:string;name:string;evidence:readonly HygieneEvidence115[];}
export type MechanismStatus115='observed'|'contradicted'|'manufacturer_only'|
  'conflicting'|'not_in_examined_sources';
export type Claim115 = {
  id:string;
  description:string;
  evidence:string[];
  status:'observed_mechanism'|'qualified_mechanistic_inference'|'direct_measured_target_specific'|'risk_observed'|'risk_flagged_by_expert';
  scientificBridge?:string;
  neverMeans?:string;
};
export type UserMeaning115='routine_household_cleaning'|
  'tested_bacterial_sanitization'|'tested_viral_disinfection'|'unspecified_disinfection'|'unresolved_igienizzare';

const REQUIRED_STEP_TARGET:Record<Step115,Scope115>={
 wet_floor_wiping:'floor',measured_floor_soil_removal:'floor',observed_stain_removal:'floor',
 pre_cycle_pad_washing:'pad',during_cycle_pad_rinsing:'pad',onboard_dirty_water_capture:'onboard_water',
 post_cycle_pad_washing:'pad',pad_drying:'pad',dock_heated_pad_washing:'dock',
 heated_water_on_floor:'floor',measured_dock_water_temperature:'dock',
 observed_soil_smearing:'floor',observed_pet_waste_smearing:'floor',expert_warns_pet_waste_transfer:'floor',
 microbial_assay_pad:'pad',microbial_assay_floor:'floor'
};
export const SCIENTIFIC_BRIDGES115=Object.freeze({
 routine_cleaning:'https://www.cdc.gov/hygiene/cleaning-disinfecting/',
 mopping_removal:'https://pubmed.ncbi.nlm.nih.gov/17980233/',
 floor_rinsing:'https://www.cdc.gov/healthcare-associated-infections/hcp/cleaning-global/procedures.html',
 pad_reprocessing:'https://pubmed.ncbi.nlm.nih.gov/33892975/',
 spread_risk:'https://www.cdc.gov/infection-control/hcp/disinfection-sterilization/rational-approach.html',
 wipe_transfer:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7273320/',
 definitions:'https://www.epa.gov/coronavirus-and-disinfectants/whats-difference-between-products-disinfect-sanitize-and-clean'
});
function validated(e:HygieneEvidence115):void {
 if(!(e.step in REQUIRED_STEP_TARGET)||REQUIRED_STEP_TARGET[e.step]!==e.target)throw Error('wrong_mechanism_target');
 if(e.finding!=='present'&&e.finding!=='absent')throw Error('invalid_finding');
 if(e.origin!=='independent_product_test'&&e.origin!=='manufacturer_declaration')throw Error('unknown_origin');
 if(!/^https:\/\/[^\s]+/.test(e.sourceUrl)||!e.originalTestId||!e.method||!e.context)throw Error('missing_evidence_lineage');
 if(e.measuredTemperatureC!==undefined && (!Number.isFinite(e.measuredTemperatureC)||e.measuredTemperatureC<0||e.measuredTemperatureC>150||e.step!=='measured_dock_water_temperature'||e.origin!=='independent_product_test')) throw Error('temperature_not_measured_in_dock');
 const assay=e.step==='microbial_assay_floor'||e.step==='microbial_assay_pad';
 if(assay){
   if(e.finding==='present'&& (e.origin!=='independent_product_test'||!e.organism||e.measuredLog10Reduction===undefined||!Number.isFinite(e.measuredLog10Reduction)||e.measuredLog10Reduction<0))throw Error('unqualified_microbiology');
 } else if(e.organism!==undefined ||e.measuredLog10Reduction!==undefined) throw Error('microbiology_claim_wrong_scope');
}
function dedup(evidence:readonly HygieneEvidence115[]):HygieneEvidence115[]{
 const m=new Map<string,HygieneEvidence115>();
 for(const e of evidence){
  validated(e);
  // Multiple syndicated reports of the same original test are not independent votes.
  const key=[e.originalTestId,e.step,e.target,e.finding,e.organism??'',e.context].join('\u001f');
  const old=m.get(key);
  if(old&& JSON.stringify({...old,sourceUrl:''})!==JSON.stringify({...e,sourceUrl:''})){
    throw Error('conflicting_metadata_same_original_test');
  }
  if(!old || e.sourceUrl.localeCompare(old.sourceUrl)<0)m.set(key,e);
 }
 return [...m.values()].sort((a,b)=>a.originalTestId.localeCompare(b.originalTestId)||a.step.localeCompare(b.step)||a.finding.localeCompare(b.finding));
}
function status(e:HygieneEvidence115[],step:Step115):MechanismStatus115{
 const rows=e.filter(x=>x.step===step);
 const independent=rows.filter(x=>x.origin==='independent_product_test');
 if(independent.some(x=>x.finding==='present')&&independent.some(x=>x.finding==='absent'))return 'conflicting';
 if(independent.some(x=>x.finding==='present'))return 'observed';
 if(independent.some(x=>x.finding==='absent'))return 'contradicted';
 if(rows.some(x=>x.finding==='present'))return 'manufacturer_only';
 return 'not_in_examined_sources';
}
function meaning(query:string):UserMeaning115{
 const s=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/\b(?:virus|virali|viruses|virucida|antivirale)\b/.test(s))return 'tested_viral_disinfection';
 if(/\b(?:batter\w*|bacteria|antibatteric\w*)\b/.test(s))return 'tested_bacterial_sanitization';
 if(/\b(?:disinfett\w*|disinfect\w*)\b/.test(s))return 'unspecified_disinfection';
 if(/\b(?:igien\w*|saniti\w*)\b/.test(s))return 'unresolved_igienizzare';
 return 'routine_household_cleaning';
}
export function hygieneProcessAudit115(query:string,products:readonly HygieneProduct115[],revision:string){
 const intent=boundedIntent114(query);
 if(!intent)throw Error('unsupported_or_non_robot_floor_request');
 if(!/^[a-zA-Z0-9_-]{4,100}$/.test(revision))throw Error('invalid_revision');
 const ids=new Set<string>();
 const interpretedMeaning=meaning(query);
 const rows=products.map(p=>{
  if(!/^[a-zA-Z0-9_-]{3,100}$/.test(p.id)||!p.name||ids.has(p.id))throw Error('duplicate_or_invalid_variant');
  ids.add(p.id);
  const evidence=dedup(p.evidence);
  const states=Object.fromEntries((Object.keys(REQUIRED_STEP_TARGET) as Step115[]).map(k=>[k,status(evidence,k)])) as Record<Step115,MechanismStatus115>;
  const provenance=(...steps:Step115[])=>[...new Set(evidence.filter(e=>steps.includes(e.step)&&e.finding==='present'&&e.origin==='independent_product_test').map(e=>e.originalTestId))].sort();
  const claims:Claim115[]=[];
  function add(id:string,description:string,status:Claim115['status'],steps:Step115[],scientificBridge?:string,neverMeans?:string){
    const proof=provenance(...steps);
    if(!proof.length)return;
    claims.push({id,description,status,evidence:proof,...(scientificBridge?{scientificBridge}:{}),...(neverMeans?{neverMeans}:{})});
  }
  if(states.wet_floor_wiping==='observed'){
    add('ordinary_wet_floor_cleaning','Documented wet wiping can contribute to ordinary household floor cleaning, subject to actual cleaning performance.', 'qualified_mechanistic_inference',['wet_floor_wiping'],SCIENTIFIC_BRIDGES115.routine_cleaning,'certified_floor_sanitization_or_viral_disinfection');
  }
  if(states.measured_floor_soil_removal==='observed'||states.observed_stain_removal==='observed'){
    add('physical_soil_removal','Floor soil or stains were removed under the specified independent test conditions.', 'observed_mechanism',['measured_floor_soil_removal','observed_stain_removal'],SCIENTIFIC_BRIDGES115.mopping_removal,'quantified_microorganism_reduction');
  }
  if(states.pre_cycle_pad_washing==='observed') add('start_with_washed_pad','Washes pad prior to floor use; possible initial-soil reduction, not confirmed pad decontamination.', 'qualified_mechanistic_inference',['pre_cycle_pad_washing'],SCIENTIFIC_BRIDGES115.pad_reprocessing,'sterile_pad_or_disinfected_floor');
  if(states.during_cycle_pad_rinsing==='observed') add('reduce_soil_carryover_during_run','Pad rinsing occurs during cleaning and may reduce retained soil and cross-transfer risk.', 'qualified_mechanistic_inference',['during_cycle_pad_rinsing'],SCIENTIFIC_BRIDGES115.floor_rinsing,'measured_bacterial_reduction_on_floor');
  if(states.onboard_dirty_water_capture==='observed') add('isolate_soiled_water','Dirty water is captured separately rather than retained on the wiping surface.', 'qualified_mechanistic_inference',['onboard_dirty_water_capture'],SCIENTIFIC_BRIDGES115.floor_rinsing,'no_cross_contamination');
  if(states.post_cycle_pad_washing==='observed') add('post_run_pad_reprocessing','Pad is cleaned after the run, supporting maintenance and a subsequent cycle.', 'qualified_mechanistic_inference',['post_cycle_pad_washing'],SCIENTIFIC_BRIDGES115.pad_reprocessing,'floor_disinfection_during_current_run');
  if(states.pad_drying==='observed')add('post_run_pad_drying','Pad is dried after cleaning, potentially reducing problems associated with wet storage.', 'qualified_mechanistic_inference',['pad_drying'],SCIENTIFIC_BRIDGES115.spread_risk,'sterilization_of_pad');
  if(states.dock_heated_pad_washing==='observed'||states.measured_dock_water_temperature==='observed') add('heated_dock_cleaning','Heated water is used or measured at the dock for mop maintenance.', 'observed_mechanism',['dock_heated_pad_washing','measured_dock_water_temperature'],undefined,'floor_microbial_kill_or_pad_decontamination_without_assay');
  if(states.heated_water_on_floor==='observed')add('heated_water_during_mopping','Heated water is used on the floor during mopping.', 'observed_mechanism',['heated_water_on_floor'],undefined,'validated_thermal_disinfection');
  if(states.observed_soil_smearing==='observed')add('soil_smearing_risk','Test observed redistribution of visible soil.', 'risk_observed',['observed_soil_smearing'],SCIENTIFIC_BRIDGES115.wipe_transfer,'measured_microorganism_transfer');
  if(states.observed_pet_waste_smearing==='observed')add('pet_waste_spreading_observed','Independent tester observed pet waste being spread by the robot.', 'risk_observed',['observed_pet_waste_smearing'],undefined,'microbial_assay_of_floor');
  if(states.expert_warns_pet_waste_transfer==='observed')add('pet_waste_spreading_warning','Independent reviewer warns that missed pet waste could be dragged across floors; this is a risk assessment, not an observed spreading event.', 'risk_flagged_by_expert',['expert_warns_pet_waste_transfer'],undefined,'an_observed_pet_waste_smearing_event');
  const assayRecords=evidence.filter(e=>e.step==='microbial_assay_floor'&&e.finding==='present'&&e.origin==='independent_product_test');
  for(const group of ['bacteria','viruses'] as const){
    if(assayRecords.some(e=>e.organism===group)){
      const proof=[...new Set(assayRecords.filter(e=>e.organism===group).map(e=>e.originalTestId))].sort();
      claims.push({id:'floor_assay_'+group,description:'Independent floor microbiology assay exists for '+group+' under documented conditions; effect is target-specific.',status:'direct_measured_target_specific',evidence:proof,neverMeans:'broad_disinfection_certification'});
    }
  }
  const assayByTarget=Object.fromEntries((['bacteria','viruses'] as const).map(t=>[t,assayRecords.filter(x=>x.organism===t).map(x=>({originalTestId:x.originalTestId,measuredLog10Reduction:x.measuredLog10Reduction!,method:x.method,context:x.context})).sort((a,b)=>a.originalTestId.localeCompare(b.originalTestId))]));
  const capability=states.wet_floor_wiping==='observed'?'independent_wet_floor_cleaning_documented':states.wet_floor_wiping==='manufacturer_only'?'wet_floor_cleaning_manufacturer_only':'not_documented_in_checked_sources';
  return {id:p.id,name:p.name,capability,mechanismStates:states,claims:claims.sort((a,b)=>a.id.localeCompare(b.id)),assays:assayByTarget,
    evidenceCountDistinctOriginalTests:new Set(evidence.map(e=>e.originalTestId)).size,
    provenanceSources:[...new Set(evidence.map(e=>e.sourceUrl))].sort(),
    suitabilityMustNotUseClaimCountAsScore:true};
 }).sort((a,b)=>a.id.localeCompare(b.id));
 return {phase:115,revision,queryDigest:createHash('sha256').update(query).digest('hex'),intent,interpretedMeaning,
   primaryObjective:intent.objective,
   clarification:interpretedMeaning==='unresolved_igienizzare'? 'Does ordinary hygienic floor cleaning meet your need, or do you require independently demonstrated bacterial/viral reduction?':interpretedMeaning==='unspecified_disinfection'?'Which microorganisms and what level of disinfection must be independently demonstrated on the floor?':null,
   sciencePolicy:'Expert studies support mechanisms at a general level; they do NOT calibrate a specific robot or prove microbial efficacy.',
   products:rows,rankedProducts:null, floorDisinfectionRanking:null, publishReady:false,
   positiveProcessClaimsAreNotFloorMicrobiology:true,noAutomaticExclusionForMissingAssay:true,
   usesManufacturerClaimAsIndependentTest:false, arbitraryFeatureCountScore:false, canonicalKnowledgeChanged:false,llmCalls:0};
}

/** Strict backward-compatible adapter for Phase114's manually collected review facts.
 * Only observation KINDS with unambiguous operational meaning are mapped.
 * A generic stain-removal item lacks the result/direction and is NOT automatically
 * interpreted as good cleaning. A legacy assay without quantitative result is NOT
 * silently upgraded to measured microbiological effectiveness. An unmapped item
 * remains visible for future enrichment; source-wide interpretation is never lost.
 */
export function adaptPhase114Observations115(items:readonly Product114[]):{
 products:HygieneProduct115[];
 unresolved:{productId:string;kind:Fact114['kind'];originalTestId:string;reason:string}[]
}{
 const mapping:Partial<Record<Fact114['kind'],Step115>>={
  wet_mopping_floor:'wet_floor_wiping',dock_hot_mop_wash:'dock_heated_pad_washing',
  continuous_clean_roller_rinse:'during_cycle_pad_rinsing',
  independent_stain_spreading:'observed_soil_smearing'
 };
 const unresolved:{productId:string;kind:Fact114['kind'];originalTestId:string;reason:string}[]=[];
 const products=items.map(p=>({id:p.id,name:p.name,evidence:p.facts.flatMap(f=>{
   const step=mapping[f.kind];
   if(!step){unresolved.push({productId:p.id,kind:f.kind,originalTestId:f.originalTestId,reason:'legacy_fact_not_sufficient_for_precise_phase115_mapping'});return [];}
   const target=REQUIRED_STEP_TARGET[step];
   return [{step,target,finding:'present' as const,origin:f.origin==='independent_observation'?'independent_product_test' as const:'manufacturer_declaration' as const,
      sourceUrl:f.sourceUrl,originalTestId:f.originalTestId,method:'phase114_manually_structured_professional_observation',context:f.context}];
 })}));
 return {products,unresolved:unresolved.sort((a,b)=>a.productId.localeCompare(b.productId)||a.kind.localeCompare(b.kind))};
}
