/** Phase174: falsifiable, bounded transfer probe on NEW product families.
 * User words are observations about intent, NEVER independently verified
 * engineering or product evidence. No scoring/veto/ranking promotion exists.
 * English only. Deliberately explicit abstention for out-of-grammar language.
 */
import {createHash} from 'node:crypto';
import {researchTaskScope173, type GoalTaskScope173} from './phase173_goal_scope_adapter.js';

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const norm=(s:string)=>s.toLowerCase().replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();
const unique=<T>(v:readonly T[])=>[...new Set(v)];
export type TransferCategory174='electric_kettle'|'drinking_water_filter'|'pasta_maker';
export type TransferTask174='product_selection'|'solution_comparison'|'use_or_troubleshoot'|'unresolved';
export type TransferPolarity174='wanted'|'rejected'|'ambiguous';
export type MethodKind174='independent_professional_comparative_method'|'certification_scope'|'manufacturer_function_documentation';
export interface TransferFacet174{
 id:string; goal:string; family:TransferCategory174; kind:'outcome'|'constraint'|'family_capability';
 polarity:TransferPolarity174; observedSpan:string;start:number;end:number;
 candidateObservables:readonly string[];possibleMechanisms:readonly string[];
 userAssertionOnly:true;domainReviewNeeded:true;verifiedProductCapability:false;
 hardExclusionAuthorized:false;rankingWeightAuthorized:false;
}
export interface TransferMethod174{
 id:string;family:TransferCategory174;kind:MethodKind174;sourceUrl:string;
 dimensions:readonly string[];scopeWarning:string;versionStatus:'source_page_reviewed_no_fixed_protocol_version';
}
export interface TransferProbe174{
 phase:174;schemaVersion:'174.1';requestSha256:string;originalQuestion:string;
 inherited173:GoalTaskScope173;
 ownedEquipmentEvidence174:readonly {family:TransferCategory174;span:string;start:number;end:number}[];
 target:TransferCategory174|null;targetBasis:'explicit_target'|'usage_clue_only'|'unresolved';targetEvidence:readonly {family:TransferCategory174;span:string;start:number;end:number}[];
 task:TransferTask174;facets:readonly TransferFacet174[];
 /** Canonical fingerprints here are ONLY for recognized bounded facets, not proof of full semantic equivalence. */
 recognizedFacetFingerprint:string;unresolvedIssues:readonly string[];clarification:string|null;
 methodPointers:readonly {facetId:string;observable:string;methods:readonly TransferMethod174[];
  methodStatus:'published_scope_to_review'|'method_missing';technicalValidation:false}[];
 firstLayer:readonly string[];
 languageUnderstandingValidated:false;realProductEvidenceAvailable:false;rankingAuthorized:false;exclusionsAuthorized:false;
}
interface Rule174 {id:string;family:TransferCategory174;kind:TransferFacet174['kind'];goal:string;cue:RegExp;
 dimensions:readonly string[];mechanisms:readonly string[];}
const RULES:readonly Rule174[]=[
 {id:'kettle_small_fill',family:'electric_kettle',kind:'outcome',goal:'heat only a small intended amount of water',cue:/\b(?:one cup|single cup|just a cup|small amounts? of water|minimum fill|min(?:imum)? water level)\b/gi,dimensions:['minimum_fill_volume','overboil_duration'],mechanisms:['minimum_operating_level_and_automatic_shutoff']},
 {id:'kettle_precision_pour',family:'electric_kettle',kind:'outcome',goal:'control pouring for the intended drink',cue:/\b(?:pour[ -]?over|gooseneck|slow controlled pour|pour precisely|precise pouring)\b/gi,dimensions:['controlled_pour_flow','spout_precision'],mechanisms:['spout_shape_and_flow_geometry']},
 {id:'kettle_fast_pour',family:'electric_kettle',kind:'outcome',goal:'pour a useful volume without excessive restriction',cue:/\b(?:pour (?:quickly|fast)|fast pouring|fill(?:ing)? (?:a )?(?:pot|saucepan)|flow (?:too )?slow|good water flow)\b/gi,dimensions:['pouring_flow_rate','handling_and_spillage'],mechanisms:['spout_flow_geometry']},
 {id:'kettle_temperature',family:'electric_kettle',kind:'outcome',goal:'heat water to specified temperatures rather than only boil',cue:/\b(?:temperature control|variable temperature|temperature settings?|set(?:table)? temperature|exact temperature|(?:80|85|90|95)\s?°?c)\b/gi,dimensions:['water_temperature_accuracy','temperature_setting_range'],mechanisms:['temperature_sensor_and_control']},
 {id:'kettle_lifting',family:'electric_kettle',kind:'outcome',goal:'manage the kettle with stated lifting or pouring difficulty',cue:/\b(?:struggle to lift|hard (?:for me )?to (?:lift|pour)|difficulty (?:lifting|pouring)|one[ -]?handed pouring)\b/gi,dimensions:['filled_handling_effort','pouring_ergonomics'],mechanisms:['filled_mass_handle_geometry_and_balance']},
 {id:'kettle_wetted_material',family:'electric_kettle',kind:'constraint',goal:'meet the explicitly stated water-contact material restriction',cue:/\b(?:no plastic (?:parts? )?(?:touching|in contact with) (?:the )?water|without plastic (?:touching|in contact with) (?:the )?water|plastic[ -]?free water path)\b/gi,dimensions:['wetted_parts_materials_by_variant'],mechanisms:['wetted_component_material_and_contact_path']},
 {id:'kettle_double_wall',family:'electric_kettle',kind:'outcome',goal:'investigate the stated double-wall design requirement',cue:/\b(?:double[ -]?wall(?:ed|s)?|insulated walls?)\b/gi,dimensions:['wall_construction','external_surface_temperature_under_test'],mechanisms:['thermal_insulation_and_external_heat_transfer']},
 {id:'kettle_limescale',family:'electric_kettle',kind:'outcome',goal:'handle visible scale deposits during kettle use',cue:/\b(?:limescale|chalky build[ -]?up|scale flakes)\b/gi,dimensions:['scale_filter_cleaning','descaling_access'],mechanisms:['water_mineral_deposition_and_maintenance']},
 {id:'water_chlorine_taste',family:'drinking_water_filter',kind:'outcome',goal:'address taste or odor associated with chlorine',cue:/\b(?:chlorine taste|chlorine smell|tastes? (?:of|like) chlorine|chlorinated taste)\b/gi,dimensions:['specific_chlorine_reduction_claim','filter_service_life'],mechanisms:['contaminant_specific_treatment_mechanism']},
 {id:'water_pfas',family:'drinking_water_filter',kind:'outcome',goal:'investigate reduction of explicitly named PFAS substances',cue:/\b(?:pfas|pfoa|pfos|forever chemicals?)\b/gi,dimensions:['certified_named_pfas_reduction_claim','feed_water_and_service_conditions'],mechanisms:['contaminant_specific_treatment_mechanism']},
 {id:'water_lead',family:'drinking_water_filter',kind:'outcome',goal:'investigate reduction of lead in drinking water',cue:/\b(?:lead (?:in (?:my|our|the) (?:water|pipes)|reduction|contamination)|remove lead|heavy metals?)\b/gi,dimensions:['certified_specific_contaminant_reduction_claim','feed_water_and_service_conditions'],mechanisms:['contaminant_specific_treatment_mechanism']},
 {id:'water_hardness',family:'drinking_water_filter',kind:'outcome',goal:'address stated water hardness or mineral scale',cue:/\b(?:hard water|hardness|mineral scale|calcium build[ -]?up)\b/gi,dimensions:['hardness_change_under_test','treatment_process_suitability'],mechanisms:['dissolved_mineral_treatment_vs_scale_management']},
 {id:'water_general_taste',family:'drinking_water_filter',kind:'outcome',goal:'improve water taste without assuming a particular contaminant',cue:/\b(?:improve (?:the )?taste|better taste|bad taste|tastes? bad)\b/gi,dimensions:['taste_odor_problem_identification','claim_specific_performance'],mechanisms:['taste_cause_and_treatment_selection']},
 {id:'water_no_plumbing',family:'drinking_water_filter',kind:'constraint',goal:'avoid making modifications to existing plumbing',cue:/\b(?:no (?:plumbing|drilling|drill holes?|pipe changes?)|cannot (?:drill|alter (?:the )?plumbing)|can't (?:drill|alter (?:the )?plumbing)|without (?:drilling|changing (?:the )?pipes?|plumbing)|renter[ -]?friendly|rental[ -]?friendly)\b/gi,dimensions:['installation_modification_requirements','leak_containment_and_space'],mechanisms:['installation_connections_and_operational_layout']},
 {id:'water_no_faucet',family:'drinking_water_filter',kind:'constraint',goal:'avoid installation requiring a new faucet',cue:/\b(?:no (?:extra|separate|new) (?:tap|faucet)|can't (?:install|add) (?:a )?(?:separate|new) (?:tap|faucet)|cannot (?:install|add) (?:a )?(?:separate|new) (?:tap|faucet))\b/gi,dimensions:['faucet_installation_requirement'],mechanisms:['installation_connections_and_operational_layout']},
 {id:'water_replacement_cost',family:'drinking_water_filter',kind:'outcome',goal:'avoid excessive long-term consumable costs',cue:/\b(?:(?:affordable )?replacement filters?(?: (?:costs?|price|availability))?|cartridge (?:costs?|price)|filter life|ongoing cost|running costs?)\b/gi,dimensions:['certified_capacity_and_replacement_interval','consumable_cost'],mechanisms:['replacement_cycle_and_consumable_supply']},
 {id:'pasta_sheets',family:'pasta_maker',kind:'family_capability',goal:'produce continuous pasta sheets for the requested dishes',cue:/\b(?:lasagn[ae]|ravioli|pasta sheets?|sheet pasta|roll(?:ing)? (?:out )?dough|tagliatelle|fettuccine)\b/gi,dimensions:['sheet_rolling_capability','sheet_thickness_adjustment','compatible_cutters'],mechanisms:['dough_sheeter_and_roller_geometry']},
 {id:'pasta_extruded_shapes',family:'pasta_maker',kind:'family_capability',goal:'make the stated extruded pasta shapes',cue:/\b(?:rigatoni|penne|bucatini|macaroni|extrud(?:e|er|ing|ed)|shaping dies?|bronze dies?)\b/gi,dimensions:['shape_die_compatibility','dough_hydration_workflow','extrusion_cleaning'],mechanisms:['extrusion_pressure_and_die_geometry']},
 {id:'pasta_auto_mix',family:'pasta_maker',kind:'outcome',goal:'reduce manual dough mixing and kneading work',cue:/\b(?:mix(?:es|ing)? (?:the )?dough (?:for me|automatically)|no (?:hand )?kneading|without kneading|mix and extrude|automatic knead(?:ing)?|does all the mixing)\b/gi,dimensions:['mixing_and_kneading_workflow','operator_interventions'],mechanisms:['integrated_dough_mixing_drive']},
 {id:'pasta_cleanup',family:'pasta_maker',kind:'outcome',goal:'reduce the cleaning burden after making pasta',cue:/\b(?:easy to clean|easier to clean|cleaning (?:is|takes) (?:too )?long|dough (?:gets )?stuck|stuck in (?:the )?(?:rollers?|dies?)|cleanup)\b/gi,dimensions:['post_use_cleaning_steps','component_access_for_cleaning'],mechanisms:['removable_parts_and_dough_contact_geometry']},
];
/** Reusable goal facets: one schema, independent of appliance vocabulary.
 * They are hypotheses with deliberately missing independent reliability data.
 */
const GLOBAL:readonly Omit<Rule174,'family'>[]=[
 {id:'transfer_reliability',kind:'outcome',goal:'keep the equipment working reliably over time',
  cue:/\b(?:long[ -]?lasting|last (?:a long time|for years)|durab(?:le|ility)|keep breaking|broke (?:again|too soon)|reliab(?:le|ility))\b/gi,
  dimensions:['field_failure_rate_by_cohort','repair_and_parts_support'],
  mechanisms:['component_failure_modes_and_service_network']},
 {id:'transfer_space',kind:'constraint',goal:'fit equipment within an explicitly restricted installation footprint',
  cue:/\b(?:limited counter space|little counter space|no counter space|tiny countertop|fits? (?:in|under) (?:my|the) (?:small )?(?:cabinet|cupboard)|tight installation space)\b/gi,
  dimensions:['installed_footprint_and_clearances'],mechanisms:['equipment_dimensions_in_operating_configuration']},
];
const METHODS:readonly TransferMethod174[]=[
 {id:'which_kettle_2025',family:'electric_kettle',kind:'independent_professional_comparative_method',sourceUrl:'https://www.which.co.uk/reviews/kettles/article/how-we-test-kettles-aYVyI4A7WEY6',dimensions:['minimum_fill_volume','overboil_duration','filled_handling_effort','pouring_ergonomics','scale_filter_cleaning','descaling_access'],scopeWarning:'Published comparative testing procedure, not a verified result for any particular kettle; version/test conditions must be checked.',versionStatus:'source_page_reviewed_no_fixed_protocol_version'},
 {id:'nsf_42_53_401',family:'drinking_water_filter',kind:'certification_scope',sourceUrl:'https://www.nsf.org/knowledge-library/nsf-ansi-42-53-and-401-filtration-systems-standards',dimensions:['specific_chlorine_reduction_claim','certified_specific_contaminant_reduction_claim'],scopeWarning:'Certification under a numbered standard does not establish every contaminant claim; confirm exact certified model and individual reduction claim.',versionStatus:'source_page_reviewed_no_fixed_protocol_version'},
 {id:'nsf_pfas',family:'drinking_water_filter',kind:'certification_scope',sourceUrl:'https://www.nsf.org/consumer-resources/articles/pfas-drinking-water',dimensions:['certified_named_pfas_reduction_claim','feed_water_and_service_conditions'],scopeWarning:'PFAS reduction is claim- and standard-specific; do not generalize to all PFAS or all filter products.',versionStatus:'source_page_reviewed_no_fixed_protocol_version'},
 {id:'marcato_pasta_manuals',family:'pasta_maker',kind:'manufacturer_function_documentation',sourceUrl:'https://helpcenter.marcato.it/hc/en-150/articles/30193632756241-Manuals',dimensions:['sheet_rolling_capability','sheet_thickness_adjustment','compatible_cutters'],scopeWarning:'Manufacturer instructions document intended functions for specified machine/attachments, not independent performance or comparable dimensions for every variant.',versionStatus:'source_page_reviewed_no_fixed_protocol_version'},
 {id:'philips_pasta_support',family:'pasta_maker',kind:'manufacturer_function_documentation',sourceUrl:'https://www.usa.philips.com/c-p/HR2660_03/7000-series-pasta-maker/support',dimensions:['shape_die_compatibility','dough_hydration_workflow','extrusion_cleaning','post_use_cleaning_steps'],scopeWarning:'Specific Philips support manuals illustrate engineering families only; never transfer capability or quality to other variants.',versionStatus:'source_page_reviewed_no_fixed_protocol_version'},
];
const CATEGORIES:readonly {family:TransferCategory174;cue:RegExp}[]=[
 {family:'electric_kettle',cue:/\b(?:electric kettle|kettle|water boiler)\b/gi},
 {family:'drinking_water_filter',cue:/\b(?:water filt(?:er|ration)|drinking water filt(?:er|ration)|filtered water|filtration (?:system|setup)|filter(?:ing)? (?:my|our|the) (?:tap|drinking) water|filter pitcher|filter jug|pitcher filter|under[ -]?sink (?:filter|ro)|countertop ro|reverse osmosis (?:filter|system))\b/gi},
 {family:'pasta_maker',cue:/\b(?:pasta (?:machine|maker|roller|extruder|press)|pasta[ -]?making machine|pasta sheeter|pasta rolling machine)\b/gi},
];
function polarityInClause(raw:string,start:number):TransferPolarity174 {
 const before=norm(raw.slice(Math.max(0,start-90),start));
 const segment=before.split(/[.!?;,]|\b(?:but|however|instead|whereas|although)\b/).at(-1)?.trim()??'';
 // Restrict suppression to an explicit negation directly governing the cue.
 if(/\b(?:not|never|don't|do not|doesn't|does not)\s+(?:remove|reduce|treat|filter(?: out)?|eliminate)\s*(?:(?:the|any|a|an)\s*)?$/.test(segment)||
    /\b(?:don't|do not|doesn't|does not|not) (?:need|want|care (?:about|for)|require|prioriti[sz]e)\s*(?:(?:a|an|the|any|for|to)\s*){0,3}$/.test(segment)||
    /\b(?:no need for|not interested in|not bothered about|without needing)\s*(?:(?:a|an|the|any)\s*)?$/.test(segment))return 'rejected';
 if(/\b(?:not sure (?:if|whether)|wonder(?:ing)? (?:if|whether))\s*$/.test(segment))return 'ambiguous';
 return 'wanted';
}
/** Bounded mention-role analysis: an item the customer says they already have
 * is not necessarily a purchase target. Requires a near-local grammatical cue.
 * Ambiguous coordination is deliberately unresolved. */
function localClause174(raw:string,start:number):string {
 return norm(raw.slice(Math.max(0,start-115),start))
  .split(/[.!?;,]|\b(?:but|however|instead|whereas|while)\b/).at(-1)?.trim()??'';
}
function ownedMention174(raw:string,start:number):boolean{
 const before=localClause174(raw,start);
 return /\b(?:i|we)\s+(?:(?:already|currently|just)\s+)?(?:have|own|got|bought|purchased|ordered)(?:\s+(?:an?|the|my|our|old|existing|current|broken|electric|drinking)){0,6}$/.test(before)||
  /\b(?:my|our)(?:\s+(?:old|existing|current|broken))?$/.test(before);
}
function requestedMention174(raw:string,start:number):boolean{
 const before=localClause174(raw,start)
   .split(/\b(?:and|but)\b/).at(-1)?.trim()??'';
 return /\b(?:need|want|buy|purchase|replace|recommend|choose|find|considering|prefer|which|looking for|shopping for|searching for|seeking|should i get)(?:\s+(?:an?|the|new|better|durable|reliable|electric|drinking|under[ -]?sink|small|large|good)){0,7}$/.test(before);
}
function task174(raw:string):TransferTask174{
 const x=norm(raw);
 if(/\b(?:ro|reverse osmosis)\b[^.!?]{0,85}\b(?:versus|vs\.?|or (?:other|another)|alternatives?|other treatments?)\b|\b(?:alternatives?|other treatments?)\b[^.!?]{0,85}\b(?:ro|reverse osmosis)\b/.test(x))return 'solution_comparison';
 if(/\b(?:or (?:buy|repair|replace)|repair (?:or|vs\.?|versus) replace|(?:filter|kettle|pasta (?:maker|machine)) (?:vs\.?|versus|or) (?:filter|kettle|pasta (?:maker|machine)))\b/.test(x))return 'solution_comparison';
 if(/\b(?:what should i change|what am i doing wrong|dough gets stuck|pasta (?:is|comes out) (?:dense|gummy))\b/.test(x)&&/\b(?:pasta|dough|kettle|filter)\b/.test(x))return 'use_or_troubleshoot';
 if(/\b(?:how (?:do|can|should) (?:i|we)|how to|why (?:does|is)|my (?:kettle|filter|pasta (?:maker|machine)) (?:is|won't|doesn't))\b/.test(x)&&!/(?:\bwhich\b|\brecommend\b|\bbuy\b|\blooking for\b)/.test(x))return 'use_or_troubleshoot';
 if(/\b(?:need|want|looking for|buy|recommend|which|shopping for|suggest|choose|best|replacement|find me|should i get|i'm after)\b/.test(x))return 'product_selection';
 return 'unresolved';
}
function check(raw:string,base?:GoalTaskScope173):GoalTaskScope173{
 const fresh=researchTaskScope173({question:raw,language:'en'});
 if(base&&JSON.stringify(base)!==JSON.stringify(fresh))throw Error('phase174_inherited_scope_untrusted');
 return fresh;
}
export function researchCategoryTransfer174(input:{question:string;language:'en';phase173?:GoalTaskScope173}):TransferProbe174 {
 if(input.language!=='en'||typeof input.question!=='string'||input.question.trim().length<3||input.question.length>4000)throw Error('phase174_invalid_input');
 const raw=input.question;
 const inherited173=check(raw,input.phase173);
 const observed=CATEGORIES.flatMap(c=>[...raw.matchAll(c.cue)].map(m=>({family:c.family,span:m[0],start:m.index,end:m.index+m[0].length})))
  .sort((a,b)=>a.start-b.start||a.family.localeCompare(b.family));
 const families=unique(observed.map(x=>x.family));
 const ownedEquipmentEvidence174=observed.filter(x=>ownedMention174(raw,x.start));
 const requestedFamilies=unique(observed.filter(x=>requestedMention174(raw,x.start)).map(x=>x.family));
 const unresolvedMentionFamilies=families.filter(f=>f!==requestedFamilies[0]&&
  !ownedEquipmentEvidence174.some(x=>x.family===f));
 const resolvedMultiFamily=families.length>1&&requestedFamilies.length===1&&
  unresolvedMentionFamilies.length===0?requestedFamilies[0]:null;
 // Extremely restricted goal-first hypotheses: a specific physical outcome may
 // suggest a family to investigate. These are NOT claims a product is required.
 const goalClues:readonly {family:TransferCategory174;cue:RegExp}[]=[
  {family:'drinking_water_filter',cue:/\b(?:remove|reduce|get rid of|treat)\s+(?:the\s+)?(?:pfas|pfoa|pfos|lead|chlorine)\s+(?:from|in)\s+(?:my\s+|our\s+|the\s+)?(?:tap\s+|drinking\s+)?water\b/i},
  {family:'pasta_maker',cue:/\b(?:make|produce)\s+(?:fresh\s+)?(?:penne|rigatoni|bucatini|ravioli|tagliatelle|fresh pasta)\s+(?:at home|myself|without kneading)\b/i},
  {family:'electric_kettle',cue:/\b(?:heat|boil)\s+(?:just\s+)?(?:one|a single)\s+cup\s+of\s+water\b/i},
 ];
 const clues=families.length===0?goalClues.filter(c=>c.cue.test(raw)):[];
 const target:TransferCategory174|null=families.length===1?families[0]:
  resolvedMultiFamily??(families.length===0&&clues.length===1?clues[0].family:null);
 const targetBasis:TransferProbe174['targetBasis']=families.length===1||resolvedMultiFamily!==null?'explicit_target':
  clues.length===1&&families.length===0?'usage_clue_only':'unresolved';
 const task=task174(raw);
 const facets:TransferFacet174[]=[];
 if(target){
  for(const r of [...RULES.filter(x=>x.family===target),...GLOBAL.map(x=>({...x,family:target}))]){
   const matches=[...raw.matchAll(r.cue)];
   for(const m of matches){
    // Bounded cue-level rejection: 'no plumbing' is itself a prohibition, not a negated need.
    const polarity=r.kind==='constraint'?'wanted':polarityInClause(raw,m.index);
    facets.push({id:r.id,goal:r.goal,family:r.family,kind:r.kind,polarity,
     observedSpan:m[0],start:m.index,end:m.index+m[0].length,
     candidateObservables:[...r.dimensions],possibleMechanisms:[...r.mechanisms],
     userAssertionOnly:true,domainReviewNeeded:true,verifiedProductCapability:false,
     hardExclusionAuthorized:false,rankingWeightAuthorized:false});
   }
  }
 }
 facets.sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
 // Multiple mentions of a single need are one decision dimension, not extra weight.
 const seen=new Set<string>();
 const singleFacets=facets.filter(f=>{const k=f.id+':'+f.polarity;if(seen.has(k))return false;seen.add(k);return true;});
 const semanticSummary=unique(singleFacets.map(f=>`${f.id}:${f.polarity}`)).sort();
 const issues:string[]=[];
 if(!target)issues.push(families.length>1?'multiple_product_families_requires_scope_resolution':'novel_category_not_explicitly_recognized');
 if(ownedEquipmentEvidence174.length)issues.push('owned_equipment_is_not_automatically_a_purchase_target');
 if(targetBasis==='usage_clue_only')issues.push('goal_only_category_requires_confirmation');
 if(target&&inherited173.target!=='unknown'&&String(inherited173.target)!==target)issues.push('existing_scope_conflicts_with_novel_family');
 if(target&&!singleFacets.length)issues.push('no_supported_usage_goal_detected');
 if(target&&singleFacets.some(f=>f.polarity==='ambiguous'))issues.push('ambiguous_requirement_polarity');
 if(task==='use_or_troubleshoot')issues.push('not_a_product_selection_request');
 if(task==='unresolved')issues.push('purchase_or_research_task_unresolved');
 if(target==='drinking_water_filter'&&!singleFacets.some(f=>f.polarity==='wanted'&&['water_pfas','water_lead','water_chlorine_taste','water_hardness','water_general_taste'].includes(f.id)))issues.push('water_quality_objective_or_contaminant_unknown');
 if(target==='drinking_water_filter'&&singleFacets.some(f=>f.id==='water_general_taste'&&f.polarity==='wanted')&&!singleFacets.some(f=>f.polarity==='wanted'&&['water_pfas','water_lead','water_chlorine_taste'].includes(f.id)))issues.push('water_taste_cause_unknown');
 if(target==='drinking_water_filter'&&singleFacets.some(f=>f.id==='water_hardness'&&f.polarity==='wanted'))issues.push('hardness_is_not_equivalent_to_health_contaminant_reduction');
 if(target==='pasta_maker'&&singleFacets.some(f=>f.id==='pasta_sheets'&&f.polarity==='wanted')&&singleFacets.some(f=>f.id==='pasta_extruded_shapes'&&f.polarity==='wanted'))issues.push('multi_process_pasta_family_requires_mechanism_comparison');
 if(task==='solution_comparison')issues.push('compare_solution_families_before_models');
 const methodPointers=singleFacets.filter(f=>f.polarity==='wanted').flatMap(f=>f.candidateObservables.map(observable=>{
  const methods=METHODS.filter(m=>m.family===f.family&&m.dimensions.includes(observable));
  return {facetId:f.id,observable,methods,methodStatus:methods.length?'published_scope_to_review' as const:'method_missing' as const,technicalValidation:false as const};
 }));
 const clarification=target==='drinking_water_filter'&&issues.includes('water_quality_objective_or_contaminant_unknown')?
  'What problem are you trying to solve with the water: taste, limescale, or a contaminant identified in a water report?':
  issues.includes('water_taste_cause_unknown')?'What is wrong with the taste or smell of the water?':
  targetBasis==='usage_clue_only'?'Are you looking for equipment to achieve this, or advice on another approach?':
  !target?'Which type of product or result are you considering?':
  task==='unresolved'?'Are you choosing a product or trying to use one you already have?':null;
 const firstLayer:string[]=[];
 if(singleFacets.some(f=>f.id==='water_pfas'&&f.polarity==='wanted'))firstLayer.push('Boiling water does not remove PFAS; verify a specific certified PFAS reduction claim for the exact filter model.');
 if(singleFacets.some(f=>f.id==='water_lead'&&f.polarity==='wanted'))firstLayer.push('Check an exact-model certification for a lead reduction claim; a generic filter or certification logo is insufficient.');
 if(singleFacets.some(f=>f.id==='water_no_faucet'&&f.polarity==='wanted'))firstLayer.push('Do not suggest any system requiring a separate faucet before verifying the exact installation design.');
 if(singleFacets.some(f=>f.id==='kettle_wetted_material'&&f.polarity==='wanted'))firstLayer.push('Verify every water-contact part for the exact kettle variant; a metal exterior does not prove a plastic-free water path.');
 if(singleFacets.some(f=>f.id==='transfer_space'&&f.polarity==='wanted'))firstLayer.push('Check exact installed dimensions and required operating clearance before treating any model as suitable.');
 if(singleFacets.some(f=>f.id==='kettle_limescale'&&f.polarity==='wanted'))firstLayer.push('A kettle limescale mesh can catch flakes, but it does not remove dissolved hardness minerals; check the cause and cleaning requirements.');
 if(singleFacets.some(f=>f.id==='water_hardness'&&f.polarity==='wanted'))firstLayer.push('Hard-water scale and health-related contaminant removal are distinct objectives; do not assume an ordinary taste filter softens water.');
 if(singleFacets.some(f=>f.id==='water_no_plumbing'&&f.polarity==='wanted'))firstLayer.push('Your restriction on permanent plumbing changes must be checked against the exact installation instructions.');
 if(singleFacets.some(f=>f.id==='pasta_extruded_shapes'&&f.polarity==='wanted'))firstLayer.push('A roller does not automatically make extruded shapes; the exact machine and compatible dies matter.');
 if(singleFacets.some(f=>f.id==='kettle_precision_pour'&&f.polarity==='wanted')&&singleFacets.some(f=>f.id==='kettle_fast_pour'&&f.polarity==='wanted'))firstLayer.push('Precise slow pouring and rapid high-volume pouring may conflict; compare actual flow performance.');
 return {phase:174,schemaVersion:'174.1',requestSha256:sha(raw),originalQuestion:raw,
  inherited173,ownedEquipmentEvidence174,target,targetBasis,targetEvidence:observed,task,facets:singleFacets,
  recognizedFacetFingerprint:sha(JSON.stringify({schema:'174.1',target,task,recognized:semanticSummary})),
  unresolvedIssues:unique(issues).sort(),clarification,methodPointers,firstLayer,
  languageUnderstandingValidated:false,realProductEvidenceAvailable:false,rankingAuthorized:false,exclusionsAuthorized:false};
}
export function listTransferMethodReferences174():readonly TransferMethod174[]{return METHODS.map(m=>({...m,dimensions:[...m.dimensions]}));}
