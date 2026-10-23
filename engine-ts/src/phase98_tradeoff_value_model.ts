/**
 * Phase 98 — research-only compensatory preference model with explicit hard vetoes.
 *
 * No reviewer-star averaging, source-dependent quality weights, retail price or
 * automatic conversion of qualitative sentiment to numbers. The criterion value
 * functions and swing weights are separately elicited, reviewed *inputs*.
 * An ordinal label is not treated as cardinal unless independently calibrated.
 * Provenance: UK Government Analysis Function (2024) MCDA guide and HM Treasury
 * Green Book (2026); MACBETH (Bana e Costa & Vansnick, 1994); robust ordinal
 * regression (Greco, Mousseau & Slowinski, 2008) for future preference learning.
 * The additive assumption is not empirically validated for consumer products.
 */

export interface ReviewedValueLevel {
  id:string;
  /** Strength-of-preference on a locally anchored criterion scale, 0..100. */
  value:number;
  description:string;
}
export interface ReviewedCriterionValueModel {
  criterionId:string;
  /** Swing-weight: importance of change from worst to best, not a weight on the word 'comfort'. */
  swingWeight:number;
  levels:readonly ReviewedValueLevel[];
  weightElicitationReceipt:string;
  valueScaleElicitationReceipt:string;
}
export interface ReviewedPreferenceModel {
  profileReference:string;
  userPreferencesConfirmed:true;
  /** Must be established by a real assessor/process; this module verifies format, not identity. */
  independentlyReviewedAdditiveAssumptions:true;
  additiveReviewReference:string;
  criteria:readonly ReviewedCriterionValueModel[];
}
export interface IndependentPerformanceAssessment {
  variantId:string;
  criterionId:string;
  /** Assigned to a reviewed value level using independent, original test evidence. */
  levelId:string;
  /** Optional plausible bounds within the same elicited criterion scale. */
  plausibleLevelIds?:readonly [string,string];
  evidenceOrigin:'original_professional_qualitative_test'|'original_independent_lab_measurement';
  originalTestId:string;
  sourceUrl:string;
  /** A reviewed mapping from observation -> the criterion's performance level. */
  performanceAdjudicationReference:string;
  exactModelConfirmed:true;
  contextConfirmed:true;
  methodReviewed:true;
}
export interface HardRequirement {
  criterionId:string;
  /** Explicitly confirmed nonnegotiable by THIS user; other important needs are soft. */
  confirmedHardRequirementReference:string;
  variantAssessments:readonly {
    variantId:string;
    result:'demonstrated_pass'|'demonstrated_failure'|'unresolved';
    sourceUrl?:string;
    originalTestId?:string;
    methodReviewed?:true;
  }[];
}
export interface CandidateBreakdown {
  variantId:string;
  eligibility:'provisionally_excluded'|'hold_for_hard_requirement'|'tradeoff_eligible';
  /** Bounds are POSSIBLE value-model outputs, not probability intervals. */
  totalValueBounds:[number,number]|null;
  exactTotalValue:number|null;
  contributions:{criterionId:string;weightedValueBounds:[number,number];
    testedLevelId:string|null;originalTestIds:string[];sourceUrls:string[];note:string}[];
  missingCriteria:string[];
  vetoReasons:string[];
  holdReasons:string[];
}
export interface TradeoffResearchResult {
  purpose:'phase98_compensatory_criterion_value_model_research_only';
  publicationReady:false;
  rankingEligible:false;
  /** This is a conditional illustrative ranking, NOT a publishable product winner. */
  conditionalOrder:string[]|null;
  rankStatus:'robust_within_elicited_value_model'|'unresolved_tradeoff'|'no_eligible_pair';
  variants:[CandidateBreakdown,CandidateBreakdown];
  limitations:readonly string[];
}
const id=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_]{1,90}$/.test(s);
const ref=(s:unknown):s is string=>typeof s==='string'&&s.trim().length>=12&&s.length<=500;
const safeUrl=(s:unknown):s is string=>typeof s==='string'&&/^https:\/\/[^\s/?#]+\/[^\s]*$/.test(s)&&s.length<=1200;
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
const rounded=(n:number)=>Math.round(n*100000)/100000;

/** Phase 97's 'essential' is deliberately NOT silently treated as an absolute veto. */
export function evaluateCompensatoryTradeoffs(input:{
  preferenceModel:ReviewedPreferenceModel;
  variantIds:readonly [string,string];
  performance:readonly IndependentPerformanceAssessment[];
  hardRequirements:readonly HardRequirement[];
}):TradeoffResearchResult{
  const {preferenceModel:p,variantIds:vs,performance,hardRequirements:hard}=input;
  if(!p||!ref(p.profileReference)||p.userPreferencesConfirmed!==true||
    p.independentlyReviewedAdditiveAssumptions!==true||!ref(p.additiveReviewReference)||
    !Array.isArray(p.criteria)||p.criteria.length<2||p.criteria.length>30||
    !Array.isArray(vs)||vs.length!==2||!vs.every(id)||vs[0]===vs[1]||
    !Array.isArray(performance)||performance.length>400||!Array.isArray(hard)||hard.length>30)
    throw Error('invalid_research_preference_model');
  const criterionById=new Map<string,ReviewedCriterionValueModel>();
  let weightTotal=0;
  for(const c of p.criteria){
    if(!id(c?.criterionId)||criterionById.has(c.criterionId)||
      !finite(c.swingWeight)||c.swingWeight<0||c.swingWeight>1||
      !ref(c.weightElicitationReceipt)||!ref(c.valueScaleElicitationReceipt)||
      !Array.isArray(c.levels)||c.levels.length<2||c.levels.length>30)
      throw Error('invalid_or_unelicited_criterion');
    const levelIds=new Set<string>();let prev=-1;
    for(const l of c.levels){
      if(!id(l?.id)||levelIds.has(l.id)||!finite(l.value)||l.value<0||l.value>100||
        l.value<=prev||!ref(l.description))throw Error('noncardinal_or_unreviewed_value_scale');
      prev=l.value;levelIds.add(l.id);
    }
    if(c.levels[0].value!==0||c.levels[c.levels.length-1].value!==100)
      throw Error('unanchored_criterion_scale');
    criterionById.set(c.criterionId,c);weightTotal+=c.swingWeight;
  }
  if(Math.abs(weightTotal-1)>0.000001)throw Error('swing_weights_not_normalized');
  const performanceMap=new Map<string,IndependentPerformanceAssessment>();
  for(const a of performance){
    if(!a||!vs.includes(a.variantId)||!criterionById.has(a.criterionId)||
      !['original_professional_qualitative_test','original_independent_lab_measurement'].includes(a.evidenceOrigin)||
      !id(a.originalTestId)||!safeUrl(a.sourceUrl)||!ref(a.performanceAdjudicationReference)||
      a.exactModelConfirmed!==true||a.contextConfirmed!==true||a.methodReviewed!==true)
      throw Error('unverified_or_misassigned_performance');
    const c=criterionById.get(a.criterionId)!;
    const names=c.levels.map(l=>l.id),n=names.indexOf(a.levelId);
    if(n<0)throw Error('unknown_performance_level');
    if(a.plausibleLevelIds){
      if(!Array.isArray(a.plausibleLevelIds)||a.plausibleLevelIds.length!==2||
        names.indexOf(a.plausibleLevelIds[0])<0||names.indexOf(a.plausibleLevelIds[1])<0||
        names.indexOf(a.plausibleLevelIds[0])>n||names.indexOf(a.plausibleLevelIds[1])<n)
        throw Error('inconsistent_performance_uncertainty');
    }
    const key=a.variantId+':'+a.criterionId;
    if(performanceMap.has(key))throw Error('competing_source_assessments_must_be_reconciled_upstream');
    performanceMap.set(key,a);
  }
  const hardById=new Map<string,HardRequirement>();
  for(const h of hard){
    if(!id(h?.criterionId)||!criterionById.has(h.criterionId)||hardById.has(h.criterionId)||
      !ref(h.confirmedHardRequirementReference)||!Array.isArray(h.variantAssessments)||
      h.variantAssessments.length!==2||new Set(h.variantAssessments.map((x:HardRequirement['variantAssessments'][number])=>x.variantId)).size!==2||
      h.variantAssessments.some((a:HardRequirement['variantAssessments'][number])=>!vs.includes(a.variantId)||
        !['demonstrated_pass','demonstrated_failure','unresolved'].includes(a.result)||
        (a.result!=='unresolved'&&(!safeUrl(a.sourceUrl)||!id(a.originalTestId)||a.methodReviewed!==true))))
      throw Error('unverified_hard_requirement');
    hardById.set(h.criterionId,h);
  }
  const variants=vs.map((variantId):CandidateBreakdown=>{
    const vetoReasons:string[]=[],holdReasons:string[]=[];
    for(const h of hardById.values()){
      const a=h.variantAssessments.find(x=>x.variantId===variantId)!;
      if(a.result==='demonstrated_failure')vetoReasons.push(h.criterionId+': independent evidence indicates failure of explicitly confirmed hard requirement');
      else if(a.result==='unresolved')holdReasons.push(h.criterionId+': hard requirement unresolved (not evidence of failure)');
    }
    const eligibility=vetoReasons.length?'provisionally_excluded':holdReasons.length?'hold_for_hard_requirement':'tradeoff_eligible';
    const contributions:CandidateBreakdown['contributions']=[],missingCriteria:string[]=[];
    let lo=0,hi=0;
    for(const c of p.criteria){
      const a=performanceMap.get(variantId+':'+c.criterionId);
      if(!a){
        missingCriteria.push(c.criterionId);
        contributions.push({criterionId:c.criterionId,weightedValueBounds:[0,rounded(100*c.swingWeight)],
          testedLevelId:null,originalTestIds:[],sourceUrls:[],note:'No reviewed evidence. Unknown spans the whole reviewed scale, not zero.'});
        hi+=100*c.swingWeight;
      }else{
        const level=(id:string)=>c.levels.find(x=>x.id===id)!.value;
        const low=a.plausibleLevelIds?level(a.plausibleLevelIds[0]):level(a.levelId);
        const high=a.plausibleLevelIds?level(a.plausibleLevelIds[1]):level(a.levelId);
        const [vlow,vhigh]=[low*c.swingWeight,high*c.swingWeight];
        lo+=vlow;hi+=vhigh;
        contributions.push({criterionId:c.criterionId,weightedValueBounds:[rounded(vlow),rounded(vhigh)],
          testedLevelId:a.levelId,originalTestIds:[a.originalTestId],sourceUrls:[a.sourceUrl],
          note:'Reviewed original-test observation mapped to a separately elicited criterion value scale.'});
      }
    }
    return {variantId,eligibility,totalValueBounds:eligibility==='tradeoff_eligible'?[rounded(lo),rounded(hi)]:null,
      exactTotalValue:eligibility==='tradeoff_eligible'&&missingCriteria.length===0&&Math.abs(hi-lo)<0.000001?rounded(lo):null,
      contributions,missingCriteria,vetoReasons,holdReasons};
  }) as [CandidateBreakdown,CandidateBreakdown];
  let conditionalOrder:string[]|null=null,rankStatus:TradeoffResearchResult['rankStatus']='no_eligible_pair';
  if(variants.every(v=>v.eligibility==='tradeoff_eligible')){
    const [a,b]=variants;
    const [aMin,aMax]=a.totalValueBounds!,[bMin,bMax]=b.totalValueBounds!;
    if(aMin>bMax+0.000001)conditionalOrder=[a.variantId,b.variantId];
    else if(bMin>aMax+0.000001)conditionalOrder=[b.variantId,a.variantId];
    rankStatus=conditionalOrder?'robust_within_elicited_value_model':'unresolved_tradeoff';
  }
  return {purpose:'phase98_compensatory_criterion_value_model_research_only',publicationReady:false,rankingEligible:false,
    conditionalOrder,rankStatus,variants,limitations:[
    'Numerical values and swing weights must be independently elicited; none are generated from review sentiment.',
    'No demonstrated calibration on real consumer preferences, no signed reviewer identity or production scoring permission.',
    'Value bounds are logical intervals on an elicited scale, never probabilities or confidence intervals.',
    'Correlated criteria, conflicting original tests and duplicate evidence must be resolved before input.',
    'Manufacturer specifications, retail prices, availability, star ratings and affiliate signals do not enter this model.',
    'Phase97 essential flags must not become vetoes unless a distinct explicit hard requirement is confirmed.'
  ]};
}
