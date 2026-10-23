/** Phase172: bounded, English-first goal discovery and read-only choice guidance.
 * Curated usage rules are RESEARCH HYPOTHESES, not certified technical facts.
 * No item suitability/ranking/exclusion can be issued from this module.
 * It is deliberately upstream of existing Phase164/169/171 evidence gates.
 */
import {createHash} from 'node:crypto';
import type {RequestOutput164} from './phase164_user_request_journey.js';

const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const normalize=(s:string)=>s.toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
const bounded=(s:unknown)=>typeof s==='string'&&s.length>=3&&s.length<=4000&&s.trim().length>=3;
const unique=(s:readonly string[])=>[...new Set(s)].sort();
/** Conservative local stance, never a general negation parser. */
function locallyRejected172(text:string,start:number,end:number):boolean{
 const prior=text.slice(Math.max(0,start-110),start);
 const clause=prior.split(/[,;.!?]|\b(?:but|however|instead|whereas)\b/i).at(-1)!.toLowerCase().trim();
 const tail=text.slice(end,Math.min(text.length,end+52)).toLowerCase();
 // Scalar requirements like 'not too noisy' ask for *less* noise.
 if(/\b(?:not too|not very|not overly|not particularly)\s*$/.test(clause))return false;
 if(/^\s*(?:(?:is not|isn't)\s+(?:a\s+)?(?:concern|priority|problem|issue|important)|doesn't matter)\b/.test(tail))return true;
 return /\b(?:don't\s+(?:want|need|like|prefer|mind|care\s+about|have)|do\s+not\s+(?:want|need|like|prefer|mind|care\s+about|have)|doesn't\s+(?:need|want)|does\s+not\s+(?:need|want)|no\s+need\s+(?:to|for)|without|avoid|exclude|not\s+(?:interested\s+in|looking\s+for|a|an)|isn't\s+(?:a|an)|is\s+not\s+(?:a|an))\b(?:\s+[\w'-]+){0,7}\s*$/.test(clause);
}

export type Category172='air_fryer'|'coffee_machine'|'vacuum_cleaner'|'washing_machine'|'refrigerator'|'unknown';
export type KnowledgeLevel172='usage_hypothesis_requires_domain_review'|'question_from_published_research';
export interface OutcomeCandidate172 {
 id:string;category:Category172;goal:string;observedUsageSpan:string;
 start:number;end:number;decisionDimensions:readonly string[];
 /** A connection to investigate, never a verified cause or product measurement. */
 mechanismHypotheses:readonly string[];potentialFailureModes:readonly string[];
 knowledgeLevel:KnowledgeLevel172;literatureOrDiscoveryReference:string;
 confirmedByUser:false;engineeringVerified:false;
}
export interface HardConstraintCandidate172{
 id:string;category:Category172;statedSpan:string;decisionDimension:string;
 meaning:string;statedInCurrentText:true;authenticatedUserConfirmation:false;
 productCompatibilityVerified:false;exclusionAuthorized:false;
}
export interface ClarifyingQuestion172 {
 id:string;text:string;decisionImpact:'changes_solution_family'|'changes_feasibility'|'changes_scoring_context';
 rationale:string;answeredByUser:false;
}
export interface GoalResearch172 {
 phase:172;requestSha256:string;category:Category172;
 categoryBasis:'explicit_or_reviewed_journey'|'usage_clue_only'|'unresolved';
 candidates:readonly OutcomeCandidate172[];unresolvedDimensions:readonly string[];
 hardConstraintCandidates:readonly HardConstraintCandidate172[];
 possibleSolutionFamilies:readonly string[];solutionFamiliesVerified:false;
 questions:readonly ClarifyingQuestion172[];
 documentation:readonly string[];researchActions:readonly string[];
 candidateKnowledgeOnly:true;independentEvidenceVerified:false;
 productExclusionsAuthorized:false;rankingAuthorized:false;publicationAuthorized:false;
}
interface Rule {
 id:string;category:Exclude<Category172,'unknown'>;
 signal:RegExp;goal:string;dimensions:readonly string[];mechanisms:readonly string[];
 failures:readonly string[];reference:string;
}
const REFS={
 usage:'https://research.google/pubs/soliciting-user-preferences-in-conversational-recommender-systems-via-usage-related-questions/',
 knowledge:'https://pmc.ncbi.nlm.nih.gov/articles/PMC10925703/',
 measurement:'https://www.w3.org/TR/vocab-ssn/'
};
// Rules encode investigatory links, NOT proven engineering relationships.
const RULES:readonly Rule[]=[
 {id:'airfryer_batch',category:'air_fryer',signal:/\b(?:meal prep|batch cooking|cook (?:for )?(?:two|three|four|2|3|4) (?:meals|portions)|several meals|multiple portions)\b/i,
  goal:'prepare multiple portions in one cooking session',dimensions:['usable_cooking_area','load_uniformity','cycles_needed','cleaning_burden'],
  mechanisms:['loading_geometry','airflow_with_food_load'],failures:['nominal_volume_misrepresents_usable_area','requires_multiple_cycles'],reference:REFS.usage},
 {id:'airfryer_single',category:'air_fryer',signal:/\b(?:live alone|living alone|for one person|just myself|i am single|for a single person)\b/i,
  goal:'prepare food for one household member',dimensions:['portion_size_per_session','usable_cooking_area','cleaning_burden','storage_footprint'],
  mechanisms:['portion_and_batch_preparation_pattern'],failures:['small_household_wrongly_assumed_small_batch'],reference:REFS.usage},
 {id:'airfryer_crisp',category:'air_fryer',signal:/\b(?:crisp(?:y|ier)?|crunch(?:y|ier)?|french fries|chips)\b/i,
  goal:'achieve the desired surface texture for specific foods',dimensions:['food_specific_texture_result','uniformity','intervention_needed','batch_size'],
  mechanisms:['airflow_and_loading_dependence'],failures:['unrepresentative_food_test','crowded_basket'],reference:REFS.knowledge},
 {id:'coffee_easy',category:'coffee_machine',signal:/\b(?:beginner|new to coffee|easy to (?:use|clean)|low maintenance|no fuss|simple to (?:use|clean))\b/i,
  goal:'make preferred drinks with manageable effort',dimensions:['workflow_steps','cleaning_time','repeatability','milk_drink_needs'],
  mechanisms:['operator_workflow_and_maintenance'],failures:['required_maintenance_exceeds_tolerance'],reference:REFS.usage},
 {id:'coffee_taste',category:'coffee_machine',signal:/\b(?:cafe(?:-| )style|coffee shop|barista quality|good coffee|great coffee|better coffee|espresso at home)\b/i,
  goal:'prepare enjoyable coffee at home',dimensions:['drink_type','grinder_and_bean_role','repeatability','operating_skill','total_system_cost'],
  mechanisms:['brewing_method_and_grind_quality'],failures:['machine_only_choice_ignores_grinder_and_drink'],reference:REFS.knowledge},
 {id:'vacuum_pets',category:'vacuum_cleaner',signal:/\b(?:pet hair|dog hair|cat hair|dog fur|cat fur|pets and carpets|have (?:a )?(?:dog|cat)|two dogs|several cats)\b/i,
  goal:'remove relevant debris from household surfaces',dimensions:['pet_hair_pickup_by_surface','hair_tangle_maintenance','filtration','access_under_furniture'],
  mechanisms:['surface_and_debris_specific_pickup'],failures:['generic_suction_used_as_pickup_proxy'],reference:REFS.usage},
 {id:'vacuum_stairs',category:'vacuum_cleaner',signal:/\b(?:stairs|several floors|multiple floors|upstairs|carry it upstairs)\b/i,
  goal:'clean multiple levels without unmanageable handling',dimensions:['carried_weight','stair_cleaning_access','reach','handling_effort'],
  mechanisms:['transport_and_stair_cleaning_geometry'],failures:['cannot_transport_or_operate_safely'],reference:REFS.usage},
 {id:'washing_fit',category:'washing_machine',signal:/\b(?:tight space|small space|narrow (?:space|alcove)|door (?:won't|cannot|can't) open|behind a door|under (?:the )?counter)\b/i,
  goal:'install and use the machine in the available space',dimensions:['installed_depth','door_swing_clearance','service_clearance','loading_access'],
  mechanisms:['installation_and_operating_envelope'],failures:['physically_cannot_install_or_access'],reference:REFS.knowledge},
 {id:'refrigerator_space',category:'refrigerator',signal:/\b(?:studio apartment|small kitchen|tiny kitchen|narrow alcove|limited kitchen space)\b/i,
  goal:'fit the refrigerator into the available living space',dimensions:['installed_footprint','door_opening_clearance','usable_storage'],
  mechanisms:['installed_geometry_and_access'],failures:['physical_access_or_installation_mismatch'],reference:REFS.knowledge},
 {id:'refrigerator_quiet',category:'refrigerator',signal:/\b(?:quiet|noise|noisy|sleep next to)\b/i,
  goal:'minimize disruptive refrigerator noise in the use environment',dimensions:['measured_noise_protocol','noise_events_and_character','placement_context'],
  mechanisms:['compressor_cycling_and_acoustics'],failures:['headline_noise_metric_does_not_match_context'],reference:REFS.measurement}
];
const HARD_CUES:readonly {id:string;category:Exclude<Category172,'unknown'>;re:RegExp;dimension:string;meaning:string}[]=[
 {id:'vacuum_cordless_only',category:'vacuum_cleaner',re:/\b(?:must be|has to be|only|strictly|needs? to be|no alternative to)\s+(?:a\s+)?cordless\b|\b(?:no|never|without)\s+corded\s+(?:vacuum|cleaner|model)\b/i,
  dimension:'cordless_required',meaning:'A corded product may not satisfy the stated restriction; verify the exact variant and use conditions.'},
 {id:'coffee_espresso_only',category:'coffee_machine',re:/\b(?:only|specifically|must be|nothing but)\s+(?:an?\s+)?espresso\s+machine\b/i,
  dimension:'espresso_machine_family_required',meaning:'The named equipment family is a stated constraint, pending confirmation of the intended drinks.'}
];
const categoryPatterns:{category:Exclude<Category172,'unknown'>;match:RegExp}[]=[
 {category:'air_fryer',match:/\bair[ -]?fryer\b/i},
 {category:'coffee_machine',match:/\b(?:coffee machine|espresso machine|coffee maker|espresso at home|make (?:good|great|better) coffee at home|coffee shop (?:at|from) home)\b/i},
 {category:'vacuum_cleaner',match:/\b(?:vacuum|hoover)\b/i},
 {category:'washing_machine',match:/\b(?:washing machine|washer)\b/i},
 {category:'refrigerator',match:/\b(?:fridge|refrigerator)\b/i}
];
function positiveMatches172(text:string,pattern:RegExp):RegExpExecArray[]{
 const re=new RegExp(pattern.source,pattern.flags.replace(/g/g,'')+'g');
 return [...text.matchAll(re)].filter(m=>!locallyRejected172(text,m.index!,m.index!+m[0].length));
}
function positiveCategoryMatches172(text:string,pattern:RegExp):RegExpExecArray[]{
 const re=new RegExp(pattern.source,pattern.flags.replace(/g/g,'')+'g');
 return [...text.matchAll(re)].filter(m=>{
  const prior=text.slice(Math.max(0,m.index!-85),m.index!);
  const clause=prior.split(/[,;.!?]|\b(?:but|however|instead|whereas)\b/i).at(-1)!.toLowerCase().trim();
  return !/\b(?:don't\s+(?:want|need)|do\s+not\s+(?:want|need)|avoid|exclude|without|not\s+interested\s+in|no\s+need\s+for|not)\s+(?:(?:a|an|the)\s*)?$/.test(clause);
 });
}
function categoryFromQuestion(question:string,request?:RequestOutput164):{category:Category172;basis:GoalResearch172['categoryBasis']} {
 // Explicit current-turn choices override inherited context, never the reverse.
 const explicit=categoryPatterns.filter(p=>positiveCategoryMatches172(question,p.match).length>0);
 if(explicit.length===1)return {category:explicit[0].category,basis:'explicit_or_reviewed_journey'};
 if(explicit.length>1)return {category:'unknown',basis:'unresolved'};
 const byUsage=unique(RULES.filter(r=>positiveMatches172(question,r.signal).length>0).map(r=>r.category));
 if(request?.categoryId&&categoryPatterns.some(p=>p.category===request.categoryId))
  return {category:request.categoryId as Category172,basis:'explicit_or_reviewed_journey'};
 if(byUsage.length===1)return {category:byUsage[0] as Category172,basis:'usage_clue_only'};
 return {category:'unknown',basis:'unresolved'};
}
function questionFor(category:Category172,candidates:readonly OutcomeCandidate172[],text:string):ClarifyingQuestion172|null{
 const n=normalize(text);
 if(category==='air_fryer'&&candidates.some(c=>c.id==='airfryer_single')&&
  !candidates.some(c=>c.id==='airfryer_batch')&& !/\b(?:portion|batch|meal prep|several meals|one meal|one portion)\b/.test(n))
  return {id:'airfryer_batch_or_single',text:'Do you usually cook one portion at a time or prepare several meals together?',
   decisionImpact:'changes_scoring_context',rationale:'household_size_is_not_cooking_batch_size',answeredByUser:false};
 if(category==='coffee_machine'&&candidates.some(c=>c.id==='coffee_taste')&&
  !/\b(?:espresso|latte|cappuccino|filter|drip|milk|black coffee|pour.over)\b/.test(n))
  return {id:'coffee_drink_type',text:'Which drinks do you want to make most often?',decisionImpact:'changes_solution_family',
   rationale:'drink_type_can_change_the_appropriate_equipment',answeredByUser:false};
 if(category==='vacuum_cleaner'&&candidates.some(c=>c.id==='vacuum_pets')&&
  !/\b(?:hard floors?|tiles?|wood|carpets?|rugs?)\b/.test(n))
  return {id:'vacuum_surface',text:'Are you mainly cleaning carpets, hard floors, or both?',decisionImpact:'changes_scoring_context',
   rationale:'pickup_tests_depend_on_surface_and_debris',answeredByUser:false};
 if(category==='washing_machine'&&candidates.some(c=>c.id==='washing_fit')&&
  !/\b\d+(?:\.\d+)?\s*(?:cm|mm|inch|inches)\b/.test(n))
  return {id:'washer_installation_space',text:'What space is available, including room to open the door?',
   decisionImpact:'changes_feasibility',rationale:'installation_and_door_clearance_can_disqualify_models',answeredByUser:false};
 return null;
}
/** Candidate-only reasoning, bounded English rules. No user identity, product evidence, ranking, or causal proof. */
export function researchUserGoal172(input:{question:string;language:'en';request?:RequestOutput164|null}):GoalResearch172{
 if(!bounded(input?.question)||input.language!=='en')throw Error('phase172_requires_bounded_english_question');
 const question=input.question;
 const req=input.request??undefined;
 if(req&&(req.phase!==164||req.requestSha256!==hash(question)||req.rankingAuthorized!==false||
  req.session?.history.at(-1)?.questionSha256!==req.requestSha256||
  req.session?.activeCategoryId!==req.categoryId))throw Error('phase172_request_context_mismatch');
 const {category,basis}=categoryFromQuestion(question,req);
 const matches:OutcomeCandidate172[]=[];
 for(const r of RULES){
  if(r.category!==category)continue;
  const m=positiveMatches172(question,r.signal)[0];if(!m)continue;
  matches.push({id:r.id,category,goal:r.goal,observedUsageSpan:m[0],start:m.index,end:m.index+m[0].length,
   decisionDimensions:r.dimensions,mechanismHypotheses:r.mechanisms,potentialFailureModes:r.failures,
   knowledgeLevel:'usage_hypothesis_requires_domain_review',literatureOrDiscoveryReference:r.reference,
   confirmedByUser:false,engineeringVerified:false});
 }
 const hardConstraintCandidates:HardConstraintCandidate172[]=HARD_CUES.filter(c=>c.category===category)
  .flatMap(c=>positiveMatches172(question,c.re).slice(0,1).map(m=>({
   id:c.id,category,statedSpan:m[0],decisionDimension:c.dimension,meaning:c.meaning,
   statedInCurrentText:true as const,authenticatedUserConfirmation:false as const,
   productCompatibilityVerified:false as const,exclusionAuthorized:false as const
  })));
 const dimensions=unique([...matches.flatMap(c=>c.decisionDimensions),
  ...hardConstraintCandidates.map(c=>c.decisionDimension)]);
 const q=questionFor(category,matches,question);
 // Different equipment families are merely research alternatives, not recommendations.
 const alternatives=category==='coffee_machine'&&matches.some(m=>m.id==='coffee_taste')&&
  !/\b(?:only|must be|specifically (?:want|need)|nothing but)\s+(?:an? )?(?:espresso|coffee) machine\b/i.test(question)
  ?['espresso_machine','filter_brewer_plus_grinder','manual_brewer_plus_grinder']:
  category==='vacuum_cleaner'&&basis==='usage_clue_only'?['canister_vacuum','upright_vacuum','cordless_vacuum','robot_vacuum']:[];
 const tasks=matches.flatMap(m=>[
  `review_category_mechanisms:${m.category}:${m.id}`,
  ...m.decisionDimensions.map(d=>`locate_independent_test_protocol:${m.category}:${d}`),
  ...m.potentialFailureModes.map(f=>`investigate_decisive_mismatch:${m.category}:${f}`)
 ]);
 if(!matches.length)tasks.push('discover_real_world_goal_and_category_before_technical_inference');
 for(const c of hardConstraintCandidates)tasks.push(`check_stated_hard_constraint_against_exact_variant:${c.id}`);
 if(q)tasks.push(`resolve_decision_relevant_context:${q.id}`);
 return {phase:172,requestSha256:hash(question),category,categoryBasis:basis,
  candidates:matches.sort((a,b)=>a.id.localeCompare(b.id)),unresolvedDimensions:dimensions,
  hardConstraintCandidates:hardConstraintCandidates.sort((a,b)=>a.id.localeCompare(b.id)),
  possibleSolutionFamilies:alternatives,solutionFamiliesVerified:false,
  questions:q?[q]:[],documentation:[REFS.usage,REFS.knowledge,REFS.measurement],
  researchActions:unique(tasks),candidateKnowledgeOnly:true,independentEvidenceVerified:false,
  productExclusionsAuthorized:false,rankingAuthorized:false,publicationAuthorized:false};
}

export interface DecisionGuide172 {
 phase:172;requestSha256:string;mode:'goal_discovery'|'research_needed'|'unresolved_category';
 /** Short, non-persuasive English plain-language projection; cannot suggest a winning product. */
 brief:readonly string[];mustSeeNow:readonly string[];
 optionalDetails:readonly {heading:string;items:readonly string[]}[];
 nextQuestion:string|null;conditionalAlternativeFamilies:readonly string[];
 noVerifiedProductRecommendation:true;
}
/** Progressive disclosure is for detail, not hiding a consequential uncertainty. */
export function explainGoalResearch172(plan:GoalResearch172):DecisionGuide172{
 if(!plan||plan.phase!==172||!/^([0-9a-f]{64})$/.test(plan.requestSha256)||
  plan.rankingAuthorized!==false||plan.productExclusionsAuthorized!==false||
  plan.independentEvidenceVerified!==false||plan.publicationAuthorized!==false||
  plan.candidateKnowledgeOnly!==true)throw Error('phase172_untrusted_plan');
 const c=plan.candidates;
 const brief=c.length
  ?[`I would start by checking ${c[0].goal}.`,
    'That means checking how products perform in your situation, not just their advertised specifications.']
  :['I need to understand the job you want done before narrowing down a product.'];
 const failureNotes:Record<string,string>={
  physically_cannot_install_or_access:'A machine that cannot fit or open properly would not be usable; check installation and door clearance.',
  physical_access_or_installation_mismatch:'A refrigerator that cannot fit, open or be installed properly would not be usable; check the exact model clearances.',
  small_household_wrongly_assumed_small_batch:'Living alone does not mean you cook only one portion at a time.',
  requires_multiple_cycles:'A basket too small for your usual batch could mean extra cooking cycles.',
  required_maintenance_exceeds_tolerance:'A machine that is too difficult to maintain might not suit your routine.',
  generic_suction_used_as_pickup_proxy:'A suction figure alone cannot establish how well the vacuum removes your debris.',
  cannot_transport_or_operate_safely:'Carrying the vacuum between floors could be a decisive practical limitation.'
 };
 const consequential=unique(c.flatMap(x=>x.potentialFailureModes).filter(f=>!!failureNotes[f]));
 const mustSeeNow=[
  'I have not verified a product against independent tests yet.',
  ...consequential.map(f=>failureNotes[f]),
  ...plan.hardConstraintCandidates.map(x=>`You specified ${x.statedSpan}: ${x.meaning}`),
  ...(!consequential.length&&c.some(x=>x.potentialFailureModes.length)?
   ['Some conditions could make an otherwise strong product unsuitable; these still need checking.']:[])
 ];
 return {phase:172,requestSha256:plan.requestSha256,
  mode:plan.category==='unknown'?'unresolved_category':c.length?'research_needed':'goal_discovery',
  brief,mustSeeNow,optionalDetails:[
   {heading:'What I would check',items:unique(c.flatMap(x=>x.decisionDimensions)).map(x=>x.replace(/_/g,' '))},
   {heading:'Possible problems to rule out',items:unique(c.flatMap(x=>x.potentialFailureModes)).map(x=>x.replace(/_/g,' '))},
   {heading:'How I would verify it',items:plan.researchActions}
  ],nextQuestion:plan.questions[0]?.text??null,
  conditionalAlternativeFamilies:plan.possibleSolutionFamilies,noVerifiedProductRecommendation:true};
}

export interface ChangeGuide172 {
 phase:172;mode:'no_detected_change'|'context_changed_research_again'|'insufficient_verified_intent';
 brief:string;changedDecisionDimensions:readonly string[];details:readonly string[];
 rankingChanged:false;newWinnerClaimed:false;requiresNewEvidenceAssessment:true;
}
/** Compare RESEARCH CANDIDATES only. Never assert that a new ranking or winner follows. */
export function explainGoalChange172(before:GoalResearch172,after:GoalResearch172):ChangeGuide172{
 if(before?.phase!==172||after?.phase!==172||before.rankingAuthorized!==false||
  after.rankingAuthorized!==false||before.independentEvidenceVerified!==false||
  after.independentEvidenceVerified!==false||before.candidateKnowledgeOnly!==true||
  after.candidateKnowledgeOnly!==true)throw Error('phase172_untrusted_transition');
 const old=new Set(before.unresolvedDimensions), next=new Set(after.unresolvedDimensions);
 const changed=unique([...old].filter(s=>!next.has(s)).concat([...next].filter(s=>!old.has(s))));
 const categoryChanged=before.category!==after.category;
 const familyChanged=JSON.stringify(unique(before.possibleSolutionFamilies))!==
  JSON.stringify(unique(after.possibleSolutionFamilies));
 const hardChanged=JSON.stringify(unique(before.hardConstraintCandidates.map(x=>x.id)))!==
  JSON.stringify(unique(after.hardConstraintCandidates.map(x=>x.id)));
 const goalChanged=JSON.stringify(unique(before.candidates.map(x=>x.id)))!==
  JSON.stringify(unique(after.candidates.map(x=>x.id)));
 const mode=categoryChanged||changed.length||familyChanged||goalChanged||hardChanged?'context_changed_research_again':
  before.candidates.length&&after.candidates.length?'no_detected_change':'insufficient_verified_intent';
 const brief=mode==='context_changed_research_again'
  ?`Your updated use case may change what matters${changed.length?`: ${changed.slice(0,2).map(d=>d.replace(/_/g,' ')).join(' and ')}`:''}. I need to reassess the evidence before changing any recommendation.`
  :mode==='no_detected_change'
  ?'I have not found a material change in the research criteria. That does not prove the requests are semantically identical.'
  :'I cannot establish whether the change affects the choice without more context.';
 return {phase:172,mode,brief,changedDecisionDimensions:changed,
  details:[...(categoryChanged?[`category: ${before.category} → ${after.category}`]:[]),
   ...(familyChanged?['candidate solution-family set changed; confirm any explicit restrictions']:[]),
   ...(goalChanged?['candidate research goals changed; recheck context and priority']:[]),
   ...(hardChanged?['explicit non-compensable constraint candidate changed; verify feasibility before any ranking']:[]),
   ...changed.map(d=>`decision dimension changed: ${d}`)],
  rankingChanged:false,newWinnerClaimed:false,requiresNewEvidenceAssessment:true};
}
