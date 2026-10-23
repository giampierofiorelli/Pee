/** Phase116: function-behavior-outcome category models.
 * Expert sourced inspiration: NIST Core Product Model / functional basis, ISO 9241-11,
 * IEC 60812. Research-only companion: NO inferred performance, numeric bonus,
 * microbial claim, user-query-dependent canonical fact, or public ranking.
 */
import {createHash} from 'node:crypto';
import type {HygieneProduct115, HygieneEvidence115} from './phase115_hygiene_process_reasoning.js';

export type Stage116='before'|'during'|'after'|'cross_cycle';
export type Cadence116='continuous'|'periodic'|'end_of_run'|'on_demand'|'unspecified';
export type Basis116='manufacturer_declared'|'independent_observed'|'independent_measured';
export type Finding116='present'|'absent';
export type LinkKind116='enables'|'may_support'|'measured_by'|'may_risk';
export type State116='independently_observed'|'manufacturer_only'|'contradicted'|'conflicting'|'context_dependent'|'unknown';
export type Endpoint116='soil_removal'|'cross_transfer'|'microbial_reduction'|'acoustic_noise'|'comfort'|'task_success'|'surface_damage'|'energy_use'|'unspecified';
export interface Function116 {id:string; description:string; kind:'primary_goal'|'secondary_goal'|'risk_control';}
export interface Mechanism116 {id:string;description:string;stage:Stage116;cadence:Cadence116;target:string;}
export interface Link116 {from:string;to:string;kind:LinkKind116; qualification:string;}
export interface EndpointDef116 {id:string;target:string;endpoint:Endpoint116; methodScope:string;}
export interface CategoryModel116 {categoryId:string;modelVersion:string;functions:readonly Function116[];mechanisms:readonly Mechanism116[];endpoints:readonly EndpointDef116[];links:readonly Link116[]; failureModes:readonly {id:string;affects:string;description:string}[];sourceUrls:readonly string[];}
export interface Activation116 {trigger:'elapsed_time'|'covered_area'|'soil_sensor'|'manual'|'after_run'|'always_during_operation';intervalMinutes?:number;intervalSquareMeters?:number;note?:string;}
export interface Observed116 {
  nodeId:string; finding:Finding116; basis:Basis116; sourceUrl:string; originalTestId:string;
  condition:string; productVariant:string; target:string;
  /** Measured outcome is not optional for an independent measured endpoint. */
  value?:number;unit?:string;testProtocol?:string;
  /** A manufacturer feature is not inferred to be active in every configuration. */
  mode?:string; firmware?:string; activation?:Activation116; analyte?:string;
}
export interface Product116 {variant:string;observations:readonly Observed116[];}
export type NodeAnalysis116={nodeId:string;status:State116;independentOriginalTests:string[];manufacturerOriginalSources:string[];conditions:string[];measurements:{value:number;unit:string;protocol:string;originalTestId:string;condition:string;analyte?:string}[]; activations:{originalTestId:string;basis:Basis116;condition:string;activation:Activation116}[]; byContext:{context:string;presentTests:string[];absentTests:string[]}[]};
const keyRegex=/^[a-z][a-z0-9_:-]{1,99}$/;
function checkString(s:string){if(!s||s.length>1000)throw Error('invalid_text');}
function canonical(s:unknown):string { return JSON.stringify(s); }
export function validateModel116(model:CategoryModel116):void{
 if(!keyRegex.test(model.categoryId)||!keyRegex.test(model.modelVersion))throw Error('invalid_category_or_version');
 if(model.functions.length===0||model.endpoints.length===0)throw Error('no_goals_or_endpoints');
 const ids=new Set<string>();
 for(const n of [...model.functions,...model.mechanisms,...model.endpoints]){
   if(!keyRegex.test(n.id)||ids.has(n.id))throw Error('invalid_or_duplicate_node'); ids.add(n.id);
   checkString('description' in n ? n.description : n.target);
 }
 for(const l of model.links){if(!ids.has(l.from)||!ids.has(l.to)||!l.qualification)throw Error('invalid_link');}
 for(const f of model.failureModes){if(!keyRegex.test(f.id)||!ids.has(f.affects)||!f.description)throw Error('invalid_failure_mode');}
 for(const m of model.mechanisms){if(!['before','during','after','cross_cycle'].includes(m.stage)||!['continuous','periodic','end_of_run','on_demand','unspecified'].includes(m.cadence)||!m.target)throw Error('invalid_process');}
 for(const e of model.endpoints){if(!e.target||!e.methodScope)throw Error('invalid_endpoint');}
 if(model.sourceUrls.some(url=>!/^https:\/\/[^\s]+$/.test(url)))throw Error('invalid_source');
}
/** Template quality is a separate, source-independent review decision.
 * A category whose important goals lack measured endpoints must not be called complete.
 */
export function auditCategoryTemplate116(model:CategoryModel116){
 validateModel116(model);
 const endpoints=new Set(model.endpoints.map(x=>x.id));
 const mapped=model.links.filter(l=>l.kind==='measured_by'&&endpoints.has(l.from)).map(l=>l.to);
 const uncoveredGoals=model.functions.filter(f=>!mapped.includes(f.id)).map(f=>f.id).sort();
 return {categoryId:model.categoryId,modelVersion:model.modelVersion,goals:model.functions.length,
   measuredEndpointDefinitions:model.endpoints.length,uncoveredGoals,readyForExhaustiveCategoryClaim:uncoveredGoals.length===0&&false,
   note:'A linked endpoint definition is not proof of method coverage or measured evidence; template review and empirical audit are always required.'};
}
export function evaluateCategory116(model:CategoryModel116,products:readonly Product116[],snapshotId:string){
 validateModel116(model);
 if(!keyRegex.test(snapshotId))throw Error('invalid_snapshot');
 const nodeTypes=new Map<string,'mechanism'|'endpoint'>([...model.mechanisms.map(n=>[n.id,'mechanism'] as const),...model.endpoints.map(n=>[n.id,'endpoint'] as const)]);
 const endpointMap=new Map(model.endpoints.map(e=>[e.id,e]));
 const seenVariants=new Set<string>();
 const evaluated=products.map(p=>{
  if(!p.variant||seenVariants.has(p.variant))throw Error('duplicate_variant');seenVariants.add(p.variant);
  const unique=new Map<string,Observed116>();
  for(const o of p.observations){
   if(!nodeTypes.has(o.nodeId)||o.productVariant!==p.variant||o.target!== (endpointMap.get(o.nodeId)?.target??model.mechanisms.find(x=>x.id===o.nodeId)?.target))throw Error('wrong_node_variant_or_target');
   if(!['manufacturer_declared','independent_observed','independent_measured'].includes(o.basis)||!['present','absent'].includes(o.finding)||!o.originalTestId||!/^https:\/\/[^\s]+$/.test(o.sourceUrl)||!o.condition)throw Error('invalid_observation');
   if(o.activation){
    const a=o.activation;
    if(!nodeTypes.has(o.nodeId)||nodeTypes.get(o.nodeId)!=='mechanism'||(a.intervalMinutes!==undefined&&(!Number.isFinite(a.intervalMinutes)||a.intervalMinutes<=0||a.trigger!=='elapsed_time'))||(a.intervalSquareMeters!==undefined&&(!Number.isFinite(a.intervalSquareMeters)||a.intervalSquareMeters<=0||a.trigger!=='covered_area')))throw Error('invalid_activation');
   }
   if(o.basis==='independent_measured'){
    if(nodeTypes.get(o.nodeId)!=='endpoint'||o.finding!=='present'||!Number.isFinite(o.value)||!o.unit||!o.testProtocol)throw Error('measurement_not_supported');
    if(endpointMap.get(o.nodeId)?.endpoint==='microbial_reduction'&&!o.analyte)throw Error('target_organism_unspecified');
   }else if(o.value!==undefined||o.unit!==undefined||o.testProtocol!==undefined)throw Error('numeric_measurement_without_test');
   const k=[o.nodeId,o.originalTestId,o.finding,o.condition].join('|');
   const existing=unique.get(k);
   if(existing && canonical({...existing,sourceUrl:''})!==canonical({...o,sourceUrl:''}))throw Error('same_test_conflicting_metadata');
   if(!existing||o.sourceUrl.localeCompare(existing.sourceUrl)<0)unique.set(k,o);
  }
  const facts=[...unique.values()];
  const nodeStates:NodeAnalysis116[]=[...nodeTypes].sort(([a],[b])=>a.localeCompare(b)).map(([nodeId])=>{
   const items=facts.filter(x=>x.nodeId===nodeId);
   const independent=items.filter(x=>x.basis!=='manufacturer_declared');
   const yes=independent.some(x=>x.finding==='present'),no=independent.some(x=>x.finding==='absent');
   const contexts=[...new Set(independent.map(x=>[x.condition,x.mode??'',x.firmware??''].join(' / ')))].sort();
   const byContext=contexts.map(ctx=>{const a=independent.filter(x=>[x.condition,x.mode??'',x.firmware??''].join(' / ')===ctx);return {context:ctx,presentTests:[...new Set(a.filter(x=>x.finding==='present').map(x=>x.originalTestId))].sort(),absentTests:[...new Set(a.filter(x=>x.finding==='absent').map(x=>x.originalTestId))].sort()};});
   const directConflict=byContext.some(x=>x.presentTests.length&&x.absentTests.length);
   const status:State116=yes&&no?(directConflict?'conflicting':'context_dependent'):yes?'independently_observed':no?'contradicted':items.some(x=>x.finding==='present')?'manufacturer_only':'unknown';
   return {nodeId,status,independentOriginalTests:[...new Set(independent.map(x=>x.originalTestId))].sort(),manufacturerOriginalSources:[...new Set(items.filter(x=>x.basis==='manufacturer_declared').map(x=>x.originalTestId))].sort(),conditions:[...new Set(items.map(x=>x.condition))].sort(),byContext,activations:items.filter(x=>x.activation).map(x=>({originalTestId:x.originalTestId,basis:x.basis,condition:x.condition,activation:x.activation!})).sort((a,b)=>a.originalTestId.localeCompare(b.originalTestId)),measurements:independent.filter(x=>x.basis==='independent_measured'&&x.finding==='present').map(x=>({value:x.value!,unit:x.unit!,protocol:x.testProtocol!,originalTestId:x.originalTestId,condition:x.condition,...(x.analyte?{analyte:x.analyte}:{})})).sort((a,b)=>a.originalTestId.localeCompare(b.originalTestId))};
  });
  const byId=new Map(nodeStates.map(s=>[s.nodeId,s]));
  // Relations are hypotheses unless directly measured at their TARGET endpoint.
  const processLinks=model.links.filter(l=>['enables','may_support','may_risk'].includes(l.kind)&&byId.get(l.from)?.status==='independently_observed')
   .map(l=>({from:l.from,to:l.to,relation:l.kind,qualification:l.qualification,epistemicStatus:'mechanism_hypothesis_not_measured_outcome' as const}));
  // A manufacturer's mechanism may be described, not used as independent performance evidence.
  const declared=model.mechanisms.filter(m=>byId.get(m.id)?.status==='manufacturer_only').map(m=>m.id);
  const observed=model.mechanisms.filter(m=>byId.get(m.id)?.status==='independently_observed').map(m=>({id:m.id,stage:m.stage,cadence:m.cadence,target:m.target,proof:byId.get(m.id)!.independentOriginalTests,activations:byId.get(m.id)!.activations}));
  const measured=model.endpoints.filter(e=>byId.get(e.id)?.measurements.length).map(e=>({endpoint:e.id,target:e.target,methodScope:e.methodScope,measurements:byId.get(e.id)!.measurements}));
  const missing=model.endpoints.filter(e=>!byId.get(e.id)?.measurements.length).map(e=>e.id);
  return {variant:p.variant,nodeStates,observedMechanisms:observed,manufacturerOnlyMechanisms:declared,mechanisticHypotheses:processLinks,measuredOutcomes:measured,unmeasuredEndpoints:missing,
    unknownIsNotFailure:true,featureCountIsNotQualityScore:true,rankingEligible:false};
 }).sort((a,b)=>a.variant.localeCompare(b.variant));
 const digest=createHash('sha256').update(JSON.stringify({model,products:evaluated,snapshotId})).digest('hex');
 return {phase:116,categoryId:model.categoryId,modelVersion:model.modelVersion,snapshotId,modelDigest:digest,products:evaluated,rankedProducts:null,publishReady:false,
  categoryModelIsHypothesisUntilReviewed:true,categoryModelsAreQueryNeutral:true,scientificLinksAreNotProductTestClaims:true};
}

/** Demonstration category models; no claim of exhaustive category coverage. */
export const ROBOT_FLOOR_MODEL116:CategoryModel116={
 categoryId:'robot_floor_cleaners',modelVersion:'v116_pilot1',
 functions:[{id:'goal_clean_floor',description:'Remove soil and marks from the floor',kind:'primary_goal'},
 {id:'goal_limit_transfer',description:'Limit moving soil to previously cleaned zones',kind:'secondary_goal'},
 {id:'goal_maintain',description:'Maintain process across an entire run',kind:'secondary_goal'},
 {id:'goal_microbial',description:'Demonstrate target-specific microbial outcome when required',kind:'secondary_goal'}],
 mechanisms:[
 {id:'mop_dock_periodic',description:'Interrupt task to wash pad at dock; return to continue',stage:'during',cadence:'periodic',target:'pad'},
 {id:'mop_roller_continuous',description:'Rinse roller while moving across floor',stage:'during',cadence:'continuous',target:'pad'},
 {id:'water_dirty_onboard',description:'Capture extracted soiled water on board',stage:'during',cadence:'continuous',target:'dirty_water'},
 {id:'mop_dock_after',description:'Wash pad at dock after cleaning',stage:'after',cadence:'end_of_run',target:'pad'},
 {id:'mop_dock_before',description:'Wash pad before start of next run',stage:'before',cadence:'on_demand',target:'pad'}],
 endpoints:[
 {id:'result_stains',target:'floor',endpoint:'soil_removal',methodScope:'Independent floor stain test with matched protocol'},
 {id:'result_transfer',target:'floor',endpoint:'cross_transfer',methodScope:'Independent measured soil redistribution test'},
 {id:'result_microbe_floor',target:'floor',endpoint:'microbial_reduction',methodScope:'Independent target-organism floor microbiology assay'}],
 links:[
 {from:'mop_roller_continuous',to:'goal_limit_transfer',kind:'may_support',qualification:'Continuous rinsing may limit soil carryover but is not proof of a clean floor or biological efficacy'},
 {from:'mop_dock_periodic',to:'goal_limit_transfer',kind:'may_support',qualification:'Periodic dock washing can refresh pads, with consequences dependent on interval/conditions'},
 {from:'water_dirty_onboard',to:'goal_limit_transfer',kind:'may_support',qualification:'Separation may help; requires confirmation that transfer is controlled'},
 {from:'mop_dock_after',to:'goal_maintain',kind:'may_support',qualification:'Supports next use, not proof of this run floor hygiene'},
 {from:'result_stains',to:'goal_clean_floor',kind:'measured_by',qualification:'Only stain outcomes within measured conditions'},
 {from:'result_transfer',to:'goal_limit_transfer',kind:'measured_by',qualification:'Measured transfer only'},
 {from:'result_microbe_floor',to:'goal_microbial',kind:'measured_by',qualification:'Target-specific assay, no universal germ-kill inference'}],
 failureModes:[{id:'soil_redeposition',affects:'goal_limit_transfer',description:'Contaminants redistributed onto clean areas'},
 {id:'stain_residual',affects:'goal_clean_floor',description:'Incomplete stain removal under test conditions'},
 {id:'dirty_reservoir',affects:'goal_maintain',description:'Poor tank hygiene or maintenance burden'}],
 sourceUrls:['https://www.nist.gov/publications/core-product-model-representing-design-information','https://www.rtings.com/robot-vacuum/reviews/dreame/aqua10-ultra-roller']
};
export const DISHWASHER_MODEL116:CategoryModel116={
 categoryId:'dishwashers',modelVersion:'v116_pilot1',
 functions:[{id:'goal_clean',description:'Remove food residue from dishes',kind:'primary_goal'},
 {id:'goal_dry',description:'Deliver dry dishes',kind:'secondary_goal'},
 {id:'goal_hygiene',description:'Achieve the specific microbiological reduction if explicitly required',kind:'secondary_goal'}],
 mechanisms:[{id:'hot_rinse',description:'Program uses high-temperature rinse',stage:'during',cadence:'periodic',target:'dishes'}],
 endpoints:[{id:'clean_test',target:'dishes',endpoint:'soil_removal',methodScope:'Comparable dishwashing cleaning test'},
 {id:'bacteria_assay',target:'dishes',endpoint:'microbial_reduction',methodScope:'Relevant original measured microbiological assay'}],
 links:[{from:'clean_test',to:'goal_clean',kind:'measured_by',qualification:'Cleaning observation with matching test'},
 {from:'bacteria_assay',to:'goal_hygiene',kind:'measured_by',qualification:'Tested organism and conditions only'},
 {from:'hot_rinse',to:'goal_hygiene',kind:'may_support',qualification:'Temperature alone does not establish bacteria or virus efficacy'}],
 failureModes:[{id:'unclean_dishes',affects:'goal_clean',description:'Residue persists after the cycle'}],sourceUrls:['https://www.nist.gov/publications/core-product-model-representing-design-information']
};
export const HEADPHONES_MODEL116:CategoryModel116={
 categoryId:'headphones',modelVersion:'v116_pilot1',
 functions:[{id:'goal_audio',description:'Reproduce sound for user tasks',kind:'primary_goal'},
 {id:'goal_isolate',description:'Reduce distracting external noise',kind:'secondary_goal'},
 {id:'goal_wear',description:'Sustain comfortable use for intended duration',kind:'secondary_goal'}],
 mechanisms:[{id:'anc_signal',description:'Active noise cancellation signal processing',stage:'during',cadence:'continuous',target:'ear'}],
 endpoints:[{id:'anc_test',target:'ear',endpoint:'acoustic_noise',methodScope:'Independent attenuation test under specified protocol'},
 {id:'comfort_test',target:'user',endpoint:'comfort',methodScope:'Independent long-duration wearer evaluation with fit context'}],
 links:[{from:'anc_test',to:'goal_isolate',kind:'measured_by',qualification:'Matched noise attenuation measurement'},
 {from:'comfort_test',to:'goal_wear',kind:'measured_by',qualification:'Fit and wearer context required'},
 {from:'anc_signal',to:'goal_isolate',kind:'may_support',qualification:'Feature alone is not a measured attenuation outcome'}],
 failureModes:[{id:'wearer_fatigue',affects:'goal_wear',description:'Discomfort during intended wearing time'}],
 sourceUrls:['https://www.iso.org/standard/63500.html']
};
/** Lossless translation of explicit, independent Phase115 mechanism observations to
 * this broader category structure. Unmapped facts are returned, never discarded.
 * This adapter does not claim that 'during_cycle_pad_rinsing' implies continuous
 * operation: if cadence cannot be identified, it remains unresolved. */
export function adaptHygiene115ToCategory116(items:readonly HygieneProduct115[]):{products:Product116[];unresolved:{variant:string;step:string;reason:string}[]} {
 const unresolved:{variant:string;step:string;reason:string}[]=[];
 const mapping:Partial<Record<HygieneEvidence115['step'],{nodeId:string;target:string}>>={
   post_cycle_pad_washing:{nodeId:'mop_dock_after',target:'pad'},
   pre_cycle_pad_washing:{nodeId:'mop_dock_before',target:'pad'},
   onboard_dirty_water_capture:{nodeId:'water_dirty_onboard',target:'dirty_water'},
 };
 const products=items.map(p=>({variant:p.id,observations:p.evidence.flatMap(o=>{
   const linked=mapping[o.step];
   if(!linked){unresolved.push({variant:p.id,step:o.step,reason:o.step==='during_cycle_pad_rinsing'?'cadence_not_identified_as_continuous_or_periodic':'no_safe_generic_category_mapping'});return [];}
   return [{nodeId:linked.nodeId,finding:o.finding,basis:o.origin==='manufacturer_declaration'?'manufacturer_declared' as const:'independent_observed' as const,sourceUrl:o.sourceUrl,originalTestId:o.originalTestId,
     condition:o.context,productVariant:p.id,target:linked.target}];
 })}));
 return {products,unresolved:unresolved.sort((a,b)=>a.variant.localeCompare(b.variant)||a.step.localeCompare(b.step))};
}
