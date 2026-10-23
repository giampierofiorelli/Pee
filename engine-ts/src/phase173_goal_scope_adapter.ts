/** Phase173: a bounded English task/scope adapter over the real Phase172 output.
 * Protects purchase-vs-use, owned-vs-requested equipment and emerging needs.
 * Nothing here authenticates user meaning, scientific causes or a product's fit.
 * It must NEVER authorize vetoes or rank changes.
 */
import {createHash} from 'node:crypto';
import {researchUserGoal172,type GoalResearch172,type Category172} from './phase172_goal_suitability_guide.js';
import type {RequestOutput164} from './phase164_user_request_journey.js';

const digest=(x:string)=>createHash('sha256').update(x).digest('hex');
const norm=(x:string)=>x.toLowerCase().replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();
const distinct=(a:readonly string[])=>[...new Set(a)].sort();
export type Task173='product_selection'|'solution_comparison'|'use_or_troubleshoot'|'unresolved';
export type Target173='air_fryer'|'coffee_machine'|'coffee_grinder'|'coffee_setup'|'vacuum_cleaner'|'washing_machine'|'refrigerator'|'unknown';
export type LinkStatus173='candidate_requires_specialist_review';
export interface NeedHypothesis173{
 id:string;goal:string;category:Category172;dimensionIds:readonly string[];
 mechanismHypotheses:readonly string[];possibleFailureModes:readonly string[];
 inputSpan:string;inputStart:number;inputEnd:number;
 status:LinkStatus173;productMeasurementVerified:false;canDisqualifyProduct:false;
 origin:'inherited_phase172_candidate'|'phase173_usage_expansion';
}
export interface GoalTaskScope173{
 phase:173;inputSha256:string;task:Task173;target:Target173;targetBasis:'explicit_target'|'phase172_category_hypothesis'|'unknown';
 /** Distinguish already-owned equipment from the object being sought. */
 ownedEquipment:readonly Target173[];ownedEquipmentEvidence:readonly {family:Target173;span:string;start:number;end:number}[];
 /** Full inherited 172 data, preserving context & safety flags, not modified in place. */
 inherited:GoalResearch172;
 needs:readonly NeedHypothesis173[];
 unresolvedIssues:readonly string[];
 shouldStartProductRanking:false;clarification: string|null;
 sourcePolicy:'user_words_are_need_evidence_not_technical_or_product_evidence';
 rankingAuthorized:false;exclusionsAuthorized:false;productEvidenceVerified:false;
}
interface Usage173{
 id:string;category:Exclude<Category172,'unknown'>;re:RegExp;goal:string;
 dimensions:readonly string[];mechanisms:readonly string[];failures:readonly string[];
}
/** Specific use patterns from Phase172 disclosed development challenges, NOT held-out performance evidence. */
const USAGE:readonly Usage173[]=[
 {id:'vacuum_allergen_containment',category:'vacuum_cleaner',re:/\b(?:allergies|allergy|asthma|dust mites|allergens?)\b/i,
  goal:'reduce relevant allergen exposure during cleaning',dimensions:['particle_retention','exhaust_leakage','emptying_exposure'],
  mechanisms:['filtration_sealing_and_disposal_path'],failures:['nominal_filter_label_does_not_establish_whole_machine_retention']},
 {id:'vacuum_lift_handling',category:'vacuum_cleaner',re:/\b(?:can't lift|cannot lift|unable to lift|difficulty (?:lifting|carrying)|hard for me to (?:carry|lift)|stairs are hard (?:for me|with my disability))\b/i,
  goal:'clean without handling demands that exceed the stated handling limits',dimensions:['carried_weight','handling_effort','safe_stair_use'],
  mechanisms:['equipment_mass_and_handling_geometry'],failures:['machine_cannot_be_handled_safely']},
 {id:'vacuum_pets',category:'vacuum_cleaner',re:/\b(?:have|got|with|for)\s+(?:(?:\d+|two|three|four|five|six|seven|eight|many|several)\s+)?(?:cats?|dogs?)\b/i,
  goal:'remove relevant debris from household surfaces',dimensions:['pet_hair_pickup_by_surface','hair_tangle_maintenance','filtration','access_under_furniture'],
  mechanisms:['surface_and_debris_specific_pickup'],failures:['generic_suction_used_as_pickup_proxy']},
 {id:'vacuum_pets',category:'vacuum_cleaner',re:/\b(?:my|our)\s+(?:cats?|dogs?|pets)\b/i,
  goal:'remove relevant debris from household surfaces',dimensions:['pet_hair_pickup_by_surface','hair_tangle_maintenance','filtration','access_under_furniture'],
  mechanisms:['surface_and_debris_specific_pickup'],failures:['generic_suction_used_as_pickup_proxy']},
 {id:'airfryer_reheat',category:'air_fryer',re:/\b(?:reheat(?:ing)?|heat(?:ing)? up|warm(?:ing)? up)\b/i,
  goal:'reheat prepared food acceptably',dimensions:['reheating_food_quality','reheat_time_and_energy','container_compatibility'],
  mechanisms:['heat_transfer_to_prepared_food','food_geometry_and_moisture'],failures:['reheating_method_unsuitable_for_food_or_container']},
 {id:'airfryer_low_prep',category:'air_fryer',re:/\b(?:little|minimal|very little|almost no|without much|low)\s+(?:food\s+)?prep(?:aration)?\b|\b(?:easy to prepare|no preparation needed)\b/i,
  goal:'prepare food with few required user steps',dimensions:['required_preparation_steps','task_accessibility','handling_and_cleaning'],
  mechanisms:['workflow_complexity_and_accessibility'],failures:['required_steps_exceed_user_capability']},
 {id:'vacuum_mixed_floor',category:'vacuum_cleaner',re:/\b(?:hard floors?|wood(?:en)? floors?|tiles?|laminate)\b[^.!?]{0,120}\b(?:carpets?|carpeted|rugs?)\b|\b(?:carpets?|carpeted|rugs?)\b[^.!?]{0,120}\b(?:hard floors?|wood(?:en)? floors?|tiles?|laminate)\b/i,
  goal:'clean both hard and soft floor surfaces',dimensions:['hard_floor_debris_pickup','carpet_debris_pickup','surface_change_workflow'],
  mechanisms:['floor_dependent_pickup_and_head_geometry'],failures:['good_performance_on_one_floor_not_transferable_to_other']},
 {id:'vacuum_battery_duration',category:'vacuum_cleaner',re:/\b(?:battery|charge|runtime|run.?time)\b[^.!?]{0,80}\b(?:run(?:ning)? out|last|long enough|cover|whole|entire|minutes|hours)\b|\b(?:run(?:ning)? out|long enough)\b[^.!?]{0,80}\b(?:battery|charge|runtime)\b/i,
  goal:'complete intended cleaning without an unwanted recharge',dimensions:['usable_runtime_under_test_load','area_and_task_completion','recharge_downtime'],
  mechanisms:['power_mode_and_load_dependent_runtime'],failures:['advertised_runtime_not_representative_of_use']},
 {id:'washer_top_lid',category:'washing_machine',re:/\b(?:top[ -]?load(?:ing|er)?|top opening|lid)\b[^.!?]{0,140}\b(?:lid|open|cabinet|cupboard|clearance|above|overhead)\b/i,
  goal:'open and load the washer beneath overhead obstructions',dimensions:['lid_open_height','overhead_clearance','loading_access'],
  mechanisms:['opening_envelope_of_exact_variant'],failures:['lid_cannot_open_to_usable_angle']},
];
function ownedMentions173(raw:string):GoalTaskScope173['ownedEquipmentEvidence']{
 const t=norm(raw);
 const out:{family:Target173;span:string;start:number;end:number}[]=[];
 const names:readonly [Target173,RegExp][]=[
  ['air_fryer',/\b(?:an?\s+)?air[ -]?fryer\b/g],
  ['coffee_machine',/\b(?:an?\s+)?(?:espresso machine|coffee machine|coffee maker)\b/g],
  ['coffee_grinder',/\b(?:an?\s+)?(?:coffee grinder|grinder)\b/g],
  ['vacuum_cleaner',/\b(?:an?\s+)?(?:vacuum cleaner|vacuum|hoover)\b/g],
  ['washing_machine',/\b(?:an?\s+)?(?:washing machine|washer)\b/g],
  ['refrigerator',/\b(?:an?\s+)?(?:fridge|refrigerator)\b/g],
 ];
 // Only anchored expressions. Merely mentioning 'espresso machine' is not ownership.
 for(const [family,re] of names)for(const m of t.matchAll(re)){
  const preceding=t.slice(Math.max(0,m.index-65),m.index);
  const clause=preceding.split(/[.!?;,]|\b(?:but|however|instead)\b/).at(-1)!;
  if(/\b(?:and|but|need|want|looking)\b/.test(clause))continue;
  if(!/\b(?:i|we)\s+(?:already\s+)?(?:have|own|bought|purchased|ordered|got)\s+(?:[a-z][a-z-]*\s+){0,6}$|\b(?:my|our)\s+(?:existing|current|old)\s*$/.test(clause))continue;
  out.push({family,span:raw.slice(m.index,m.index+m[0].length),start:m.index,end:m.index+m[0].length});
 }
 return out.sort((a,b)=>a.start-b.start||a.family.localeCompare(b.family));
}
function task173(raw:string):Task173{
 const t=norm(raw);
 if(/\breplace\b[^.!?]{0,100}\bbattery\b[^.!?]{0,100}\b(?:or|versus|vs\.?|instead of)\b[^.!?]{0,80}\b(?:buy|get|new|replace)\b/.test(t))return 'solution_comparison';
 if(/\b(?:would|could|should)\s+(?:an?\s+)?(?:air[ -]?fryer|coffee machine|vacuum|fridge|washer)\b[^?!.]{0,125}\b(?:help|better|instead|worth|than|work|replace)\b|\b(?:air[ -]?fryer|vacuum|washer)\s+(?:or|vs\.?|versus|instead of)\b/.test(t))return 'solution_comparison';
 if(/\b(?:how (?:do|can|should) (?:i|we)|how to|why (?:does|is)|my\s+(?:air[ -]?fryer|vacuum|fridge|washer)\s+(?:is|doesn't|won't))\b/.test(t)&&
  !/\b(?:which|recommend|should i buy|looking to buy|need to buy)\b/.test(t))return 'use_or_troubleshoot';
 if(/\b(?:which|what (?:is|are) the best|recommend|looking for|shopping for|buy|purchase|need|want|get me|any suggestions|replacement|should i choose)\b/.test(t))return 'product_selection';
 return 'unresolved';
}
function explicitTarget173(raw:string):Target173|null{
 const t=norm(raw);
 // Explicit two-device shopping request is NOT the same as an accessory-only search.
 const coffee=/(?:espresso|coffee)\s+(?:machine|maker|setup)/;
 if(coffee.test(t)&&/\bgrinder\b/.test(t)&&
    /\b(?:want|need|choose|recommend|looking for|buy|shopping for|setup|together|combo|both)\b/.test(t)&&
    !/\b(?:already|currently)\s+(?:own|have|ordered|bought|got)\b[^.!?;]{0,85}(?:espresso|coffee)\s+(?:machine|maker)/.test(t)&&
    !/\bmy\s+(?:existing|current)\s+(?:espresso|coffee)\s+(?:machine|maker)/.test(t)&&
    !/\b(?:i|we)\s+(?:just\s+)?(?:ordered|purchased|bought|have|own)\s+(?:an?\s+)?(?:espresso|coffee)\s+(?:machine|maker)/.test(t))return 'coffee_setup';
 // Priority to selected accessory, even when its parent product is already owned.
 if(/\b(?:which|what|recommend|need|want|looking for|buy|choose|find|shopping for|best|suggest)\b[^.!?]{0,95}\b(?:coffee\s+)?grinder\b/.test(t))return 'coffee_grinder';
 return null;
}
function notApplicable(raw:string,ruleId:string):boolean{
 const n=norm(raw);
 // Narrow explicit denials; don't treat 'not too noisy' or 'no time' as global negation.
 if(ruleId==='vacuum_mixed_floor')return /\b(?:no|without)\s+(?:any\s+)?(?:carpets?|rugs?|hard floors?)\b/.test(n);
 if(ruleId==='vacuum_battery_duration')return /\b(?:battery|runtime|charge)\s+(?:isn't|is not|doesn't|does not)\s+(?:a\s+)?(?:concern|problem|priority|important)\b/.test(n);
 if(ruleId==='airfryer_reheat')return /\b(?:don't|do not|never)\s+(?:want|need|plan)\s+to\s+reheat\b/.test(n);
 if(ruleId==='airfryer_low_prep')return /\b(?:don't|do not)\s+(?:need|want)\s+(?:little|low|minimal)\s+prep\b/.test(n);
 return false;
}
export function researchTaskScope173(input:{question:string;language:'en';request?:RequestOutput164|null;plan172?:GoalResearch172}):GoalTaskScope173{
 if(typeof input?.question!=='string'||input.question.trim().length<3||input.question.length>4000||input.language!=='en')throw Error('phase173_bounded_english_only');
 const hash=digest(input.question);
 const recomputed=researchUserGoal172({question:input.question,language:'en',request:input.request});
 const inherited=input.plan172??recomputed;
 if(input.plan172&&JSON.stringify(input.plan172)!==JSON.stringify(recomputed))throw Error('phase173_inherited_plan_tampered');
 if(inherited.phase!==172||inherited.requestSha256!==hash||inherited.candidateKnowledgeOnly!==true||
  inherited.rankingAuthorized!==false||inherited.productExclusionsAuthorized!==false||inherited.independentEvidenceVerified!==false||
  inherited.publicationAuthorized!==false)throw Error('phase173_untrusted_phase172_plan');
 const owned=ownedMentions173(input.question);
 const explicit=explicitTarget173(input.question);
 const target:Target173=explicit??inherited.category;
 const scope=task173(input.question);
 const needs:NeedHypothesis173[]=[];
 if(!explicit){
  for(const c of inherited.candidates){
   needs.push({id:c.id,goal:c.goal,category:c.category,dimensionIds:c.decisionDimensions,
    mechanismHypotheses:c.mechanismHypotheses,possibleFailureModes:c.potentialFailureModes,
    inputSpan:c.observedUsageSpan,inputStart:c.start,inputEnd:c.end,status:'candidate_requires_specialist_review',
    origin:'inherited_phase172_candidate',productMeasurementVerified:false,canDisqualifyProduct:false});
  }
  for(const r of USAGE){
   if(r.category!==inherited.category||needs.some(n=>n.id===r.id))continue;
   const m=new RegExp(r.re.source,'i').exec(input.question);
   if(!m||notApplicable(input.question,r.id))continue;
   needs.push({id:r.id,goal:r.goal,category:r.category,dimensionIds:r.dimensions,
    mechanismHypotheses:r.mechanisms,possibleFailureModes:r.failures,
    inputSpan:m[0],inputStart:m.index,inputEnd:m.index+m[0].length,
    status:'candidate_requires_specialist_review',origin:'phase173_usage_expansion',
    productMeasurementVerified:false,canDisqualifyProduct:false});
  }
 }
 const issues:string[]=[];
 if(explicit==='coffee_grinder')issues.push('coffee_grinder_outside_phase172_five_category_goal_catalogue');
 if(explicit==='coffee_setup')issues.push('multi_equipment_coffee_system_requires_joint_scope_and_budget');
 if(scope==='use_or_troubleshoot')issues.push('request_is_not_established_product_selection');
 if(scope==='solution_comparison')issues.push('compare_equipment_approaches_before_product_ranking');
 if(scope==='unresolved')issues.push('purchase_intention_not_resolved');
 if(!needs.length)issues.push('no_supported_goal_link_identified');
 if(owned.length)issues.push('owned_equipment_not_automatically_a_purchase_target');
 const clarification=explicit==='coffee_grinder'||explicit==='coffee_setup'?null:scope==='unresolved'&&target!=='unknown'?
  'Are you choosing a product, or trying to use equipment you already have?':inherited.questions[0]?.text??null;
 return {phase:173,inputSha256:hash,task:scope,target,
  targetBasis:explicit?'explicit_target':inherited.category==='unknown'?'unknown':'phase172_category_hypothesis',
  ownedEquipment:distinct(owned.map(x=>x.family)) as Target173[],ownedEquipmentEvidence:owned,
  inherited,needs:needs.sort((a,b)=>a.id.localeCompare(b.id)),unresolvedIssues:distinct(issues),
  shouldStartProductRanking:false,clarification,
  sourcePolicy:'user_words_are_need_evidence_not_technical_or_product_evidence',
  rankingAuthorized:false,exclusionsAuthorized:false,productEvidenceVerified:false};
}
