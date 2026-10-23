/**
 * Phase 122 — in-house query-to-evidence-gap research planner.
 *
 * No LLM, commercial API, external search engine or ranking authority.
 * Limited deterministic interpreter, NOT general natural-language understanding.
 * Source discovery, evidence extraction, expert calibration and full QA are NOT
 * implemented by this module: research actions are plans, not completed facts.
 *
 * A proposal derived from language is never a verified user requirement, and a
 * search plan is never proof a product exists or evidence was acquired.
 */
import {createHash} from 'node:crypto';

export type Objective122='best_performance'|'best_value'|'least_human_work';
export type Scope122='vacuum'|'mop'|'both'|'undecided';
export type QueryState122='bounded_proposal'|'needs_context'|'needs_semantic_review';
export type Metric122='product_discovery'|'product_identity'|'expert_quality_floor'|
 'cleaning_outcome'|'unattended_completion'|'rescue_interventions'|
 'routine_human_minutes'|'unplanned_human_minutes'|'test_comparability'|
 'market_price'|'cost_of_ownership';
export type Action122='discover_candidates'|'discover_expert_protocol'|'acquire_independent_review'|
 'verify_product_source_identity'|'extract_original_measurements'|'check_method_comparability'|
 'collect_price'|'collect_lifecycle_cost'|'request_scope_review';
export interface Intent122 {
 category:'floor_cleaning_robot'|'unknown';
 objective:Objective122|null; scope:Scope122;
 mode:'general'|'personal';
 queryState:QueryState122;
 contextUsed:boolean;
 protectedNegation:boolean;
 evidenceSignals:readonly string[];
 /** a lexical match is a provisional hypothesis, not a verified semantic label. */
 confirmedByUser:false;
}
export interface Context122 {
 /** Only explicit, already established context; not a user profile guess. */
 verifiedCategory?:'floor_cleaning_robot';
}
/** Knowledge-obligation registry; checked independently of the phrasing. */
export interface Requirement122 {metric:Metric122;reason:string;sourcePriority:'independent_test'|'expert_method'|'market';}
export interface Coverage122 {
 candidateCount:number;
 /** Only source-verified receipt IDs are accepted by the caller; this module
  * cannot authenticate those receipts, so evidence never authorizes publication. */
 verifiedMetricKeys:readonly Metric122[];
 hasIndependentlyReviewedQualityPolicy:boolean;
 protocolComparable:boolean;
 /** Individual measured products and provenance are NOT inferred from these bits. */
}
export interface ResearchStep122 {action:Action122;metric:Metric122;
 rationale:string;queries:readonly string[];sourcePriority:'independent_test'|'expert_method'|'market';}
export interface ResearchPlan122 {
 purpose:'phase122_native_question_to_research_proposal';
 questionSha256:string;intent:Intent122;unknowns:readonly Metric122[];
 requirements:readonly Requirement122[];steps:readonly ResearchStep122[];
 next:'request_context'|'semantic_review'|'continue_research'|'review_evidence_receipts';
 publicRankingAuthorized:false; searchExecuted:false; marketExhaustionProven:false;
 limitations:readonly string[];
}

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const normalize=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[’']/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const has=(s:string,phrases:readonly string[])=>phrases.some(p=>
  (' '+s+' ').includes(' '+normalize(p)+' '));
const containsAny=(s:string,arr:readonly string[])=>has(s,arr);

// Curated language observations; external proposals may be added through a
// future formally reviewed ontology, without mutating evidence or rankings.
const domainTerms=['robot aspirapolvere','robot lavapavimenti','robot per pavimenti',
 'robot vacuum','robot floor cleaner','robot vacuum cleaner','robot mop',
 'aspirapolvere robot','robot che aspira','robot che lava'];
const neutralRobot=['robot','robotici','robotico','robotica','robots'];
const autonomy=['meno interventi umani','meno intervento umano','minor intervento umano',
 'minori interventi','minimo intervento umano','meno manutenzione',
 'richiedono meno interventi','richiede meno interventi',
 'richiedono meno assistenza','richiede meno assistenza',
 'richiede meno manutenzione','senza interventi','senza supervisione',
 'piu autonomi','piu autonomo','maggiore autonomia',
 'molto autonomi','robot autonomi','piu indipendenti','piu autonomia',
 'per autonomia','autonomia elevata','minimum human input','less hands on',
 'least human intervention','fewest interventions','least maintenance',
 'most autonomous','hands free','handsfree','less human work',
 'less maintenance','no manual intervention','needs less human help',
 'senza dover intervenire','non devo intervenire','non debba intervenire'];
const value=['qualita prezzo','rapporto qualita prezzo','migliore per il prezzo',
 'best value for money','best value','value for money','most cost effective',
 'qualita al prezzo','convenienza economica'];
const performance=['miglior robot','migliore robot','robot migliore','robot migliori',
 'migliori robot','best robot','best vacuum','best cleaner',
 'che pulisce meglio','miglior pulizia'];
const mop=['robot che lava','lavapavimenti','lavaggio pavimenti','lavare pavimenti','lava il pavimento',
 'mopping','mop only','robot mop','solo lavaggio','only mopping'];
const vacuum=['robot che aspira','aspirapolvere','aspirazione','aspirare','vacuum','vacuuming',
 'solo aspirazione','only vacuuming'];
const both=['aspira e lava','aspirazione e lavaggio','aspirare e lavare',
 'aspira lava','vacuum and mop','both vacuum and mop','entrambe le funzioni'];
const personal=['mia casa','mio appartamento','in casa mia','ho moquette',
 'con tappeti','con animali','con gatti','con cani','in my house',
 'my home','with carpets','pet hair','per me','per la mia casa'];
const riskyNegation=['non voglio','escludi','non deve','without vacuum','senza aspirazione',
 'without mop','senza lavaggio','no washing','non mi interessa','not interested in',
 'evitare','exclude','ne voglio uno che non'];
function validCoverage(c:Coverage122):void{
  if(!c||!Number.isSafeInteger(c.candidateCount)||c.candidateCount<0||
    !Array.isArray(c.verifiedMetricKeys)||c.verifiedMetricKeys.length>30||
    new Set(c.verifiedMetricKeys).size!==c.verifiedMetricKeys.length||
    c.verifiedMetricKeys.some(x=>!allMetrics.includes(x))||
    typeof c.hasIndependentlyReviewedQualityPolicy!=='boolean'||
    typeof c.protocolComparable!=='boolean')throw Error('invalid_coverage');
}
const allMetrics:readonly Metric122[]=['product_discovery','product_identity','expert_quality_floor',
  'cleaning_outcome','unattended_completion','rescue_interventions',
  'routine_human_minutes','unplanned_human_minutes','test_comparability',
  'market_price','cost_of_ownership'];

/** Native, limited deterministic reading. A general 'robot' needs established
 * context; the software must not silently assume the product category. */
export function interpretQuestion122(question:string,context:Context122={}):Intent122{
  if(typeof question!=='string'||question.length<5||question.length>4000)throw Error('invalid_question');
  const t=normalize(question);
  const explicitDomain=has(t,domainTerms);
  const robot=has(t,neutralRobot);
  const contextUsed=!explicitDomain&&robot&&context.verifiedCategory==='floor_cleaning_robot';
  const domain=explicitDomain||contextUsed?'floor_cleaning_robot':'unknown';
  const objectives:Objective122[]=[];
  if(has(t,autonomy))objectives.push('least_human_work');
  if(has(t,value))objectives.push('best_value');
  // In 'miglior robot qualità-prezzo', 'miglior robot' modifies the value goal.
  if(has(t,performance)&&!has(t,value)&&!has(t,autonomy))objectives.push('best_performance');
  const scope:Scope122=containsAny(t,both)?'both':
    containsAny(t,mop)&&containsAny(t,vacuum)?'undecided':
    containsAny(t,mop)?'mop':containsAny(t,vacuum)?'vacuum':'undecided';
  // An enumerated pair of explicit requests is not a single value-only request.
  // Do not collapse '1) migliore 2) qualità-prezzo' into one lens.
  const enumeratedDual=/\b1\b[\s\S]*\b2\b/u.test(t)&&has(t,value)&&has(t,performance);
  const conflicting=objectives.length>1||enumeratedDual;
  const negation=has(t,riskyNegation);
  const unknown=domain==='unknown';
  const queryState:QueryState122=unknown?'needs_context':
    (conflicting||negation||objectives.length===0)?'needs_semantic_review':'bounded_proposal';
  return {category:domain,objective:!conflicting&&objectives.length===1?objectives[0]:null,
    scope,mode:containsAny(t,personal)?'personal':'general',
    queryState,contextUsed,protectedNegation:negation,
    evidenceSignals:[...new Set([
      ...(explicitDomain?['explicit_domain']:[]),...(contextUsed?['verified_conversation_context']:[]),
      ...objectives.map(x=>'objective:'+x),...(scope==='undecided'?[]:['scope:'+scope]),
      ...(negation?['negation_requires_scope_review']:[]),
      ...(conflicting?['multiple_objectives_need_resolution']:[])
    ])].sort(),confirmedByUser:false};
}

/** Missing measurements are research obligations, not product failures. */
export function researchObligations122(intent:Intent122):Requirement122[]{
  if(intent.queryState!=='bounded_proposal'||!intent.objective)return [];
  const common:Requirement122[]=[
    {metric:'product_discovery',reason:'Find relevant competitors beyond the known catalog',sourcePriority:'independent_test'},
    {metric:'product_identity',reason:'Verify exact model and SKU before attributing a test',sourcePriority:'independent_test'},
    {metric:'expert_quality_floor',reason:'Establish acceptable task outcome under independently reviewed criteria',sourcePriority:'expert_method'},
    {metric:'cleaning_outcome',reason:'Require observed cleaning effectiveness, not an automation feature list',sourcePriority:'independent_test'}
  ];
  if(intent.objective==='least_human_work')return [...common,
    {metric:'unattended_completion',reason:'Measure completed scheduled tasks without assistance',sourcePriority:'independent_test'},
    {metric:'rescue_interventions',reason:'Measure human rescue on comparable tasks',sourcePriority:'independent_test'},
    {metric:'routine_human_minutes',reason:'Measure recurring routine care by a human',sourcePriority:'independent_test'},
    {metric:'unplanned_human_minutes',reason:'Measure unexpected human work independently of routine care',sourcePriority:'independent_test'},
    {metric:'test_comparability',reason:'Check test duration, workload, floors, modes and protocol version',sourcePriority:'expert_method'}];
  if(intent.objective==='best_value')return [...common,
    {metric:'test_comparability',reason:'Compare the same relevant performance dimensions under like tests',sourcePriority:'expert_method'},
    {metric:'market_price',reason:'Find market-local observed price for a purchasable model',sourcePriority:'market'},
    {metric:'cost_of_ownership',reason:'Record lifecycle costs only if independently grounded',sourcePriority:'market'}];
  return [...common,{metric:'test_comparability',reason:'Compare results only in compatible experimental conditions',sourcePriority:'expert_method'}];
}

const actionForMetric:Readonly<Record<Metric122,Action122>>={
 product_discovery:'discover_candidates', product_identity:'verify_product_source_identity',
 expert_quality_floor:'discover_expert_protocol',cleaning_outcome:'extract_original_measurements',
 unattended_completion:'extract_original_measurements',rescue_interventions:'extract_original_measurements',
 routine_human_minutes:'extract_original_measurements',unplanned_human_minutes:'extract_original_measurements',
 test_comparability:'check_method_comparability',market_price:'collect_price',
 cost_of_ownership:'collect_lifecycle_cost'
};
const phrasesFor=(m:Metric122):string[]=>({
 product_discovery:['robot vacuum independent professional tests models','robot aspirapolvere lavapavimenti recensioni comparative indipendenti'],
 product_identity:['model SKU firmware robot cleaner independent test','robot vacuum official model variant review identification'],
 expert_quality_floor:['robot vacuum cleaning outcome testing methodology','robot mopping stain removal independent test method'],
 cleaning_outcome:['robot vacuum floor debris removal measured independent test','robot mop stain removal original measurements'],
 unattended_completion:['robot vacuum unattended completion rate independent test'],
 rescue_interventions:['robot vacuum intervention rate obstacle avoidance independent test'],
 routine_human_minutes:['robot vacuum measured routine maintenance time extended test'],
 unplanned_human_minutes:['robot vacuum manual rescue unplanned maintenance observations'],
 test_comparability:['robot vacuum test protocol firmware conditions methodology revisions'],
 market_price:['robot vacuum current market price exact SKU'],
 cost_of_ownership:['robot vacuum bags detergent brushes replacement annual cost']
})[m];

export function planQuestionResearch122(question:string,coverage:Coverage122,
 context:Context122={}):ResearchPlan122{
  validCoverage(coverage);
  const intent=interpretQuestion122(question,context);
  const requirements=researchObligations122(intent);
  const known=new Set(coverage.verifiedMetricKeys);
  // A positive coverage bit is only a caller-reported state; no self-certified facts.
  const unknowns=requirements.filter(r=>
    !known.has(r.metric)||
    (r.metric==='product_discovery'&&coverage.candidateCount===0)||
    (r.metric==='expert_quality_floor'&&!coverage.hasIndependentlyReviewedQualityPolicy)||
    (r.metric==='test_comparability'&&!coverage.protocolComparable));
  const steps:ResearchStep122[]=unknowns.map(r=>({
    action:actionForMetric[r.metric],metric:r.metric,rationale:r.reason,
    queries:phrasesFor(r.metric),sourcePriority:r.sourcePriority
  }));
  const next:ResearchPlan122['next']=intent.queryState==='needs_context'?'request_context':
    intent.queryState==='needs_semantic_review'?'semantic_review':
    steps.length?'continue_research':'review_evidence_receipts';
  return {purpose:'phase122_native_question_to_research_proposal',
    questionSha256:sha(question),intent,
    unknowns:unknowns.map(x=>x.metric),requirements,steps,next,
    publicRankingAuthorized:false,searchExecuted:false,marketExhaustionProven:false,
    limitations:[
      'Rule-based multilingual phrase coverage is deliberately narrow and not validated on open-world prompts.',
      'Semantic interpretation is a proposal: expert validation or independent scope adjudication remains necessary.',
      'Research actions are plans, not web calls or successful extraction.',
      'Caller-supplied coverage bits are not authenticated source receipts.',
      'No product ranking, completeness or household autonomy rate can be inferred from this plan.'
    ]};
}
