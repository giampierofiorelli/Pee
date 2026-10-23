/**
 * Phase 99 — research-only bridge between independently reviewed original-test
 * qualitative observations (Phase 96) and separately elicited user-value
 * tradeoffs (Phase 98). No publisher stars, model-generated sentiment scores,
 * automatic reviewer approval, retail inputs, or publication permission.
 *
 * Design provenance: UK Analysis Function (2024) MCDA guidance on performance
 * scales and swing weighting; Bana e Costa et al. MACBETH (2011) on elicited
 * qualitative preferences; ISPOR MCDA good practices (2016) on validation;
 * Kadziński et al. (2013) on robust/possible preference distinction.
 * This implementation is NOT MACBETH or full Robust Ordinal Regression.
 */
import {
  assessQualitativeNeeds,
  type QuarantinedQualitativeFinding,
  type ReviewEvidenceApproval,
  type QualitativeNeed,
} from './phase96_qualitative_review_evidence.js';
import {
  evaluateCompensatoryTradeoffs,
  type ReviewedPreferenceModel,
  type IndependentPerformanceAssessment,
  type HardRequirement,
  type TradeoffResearchResult,
} from './phase98_tradeoff_value_model.js';

const validId=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_]{1,100}$/.test(s);
const receipt=(s:unknown):s is string=>typeof s==='string'&&s.trim().length>=12&&s.length<=500;
const validDate=(s:unknown):s is string=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const unique=<T>(x:readonly T[]):T[]=>[...new Set(x)];
const snap=(n:number)=>Math.round(n*100000)/100000;

export interface Phase99QualitativeBundle {
  variantId:string;
  needs:readonly QualitativeNeed[];
  findings:readonly QuarantinedQualitativeFinding[];
  approvals:readonly ReviewEvidenceApproval[];
}
/** A DISTINCT assessor documents how source evidence maps to a reviewed level.
 * These receipts are attestations, not cryptographically authenticated users. */
export interface Phase99PerformanceMapping {
  variantId:string;
  criterionId:string;
  levelId:string;
  plausibleLevelIds?:readonly [string,string];
  supportingFindingIds:readonly string[];
  performanceAssessorId:string;
  performanceReviewReference:string;
  performanceReviewDate:string;
  reconciliation:'consistent_evidence'|'contradictions_adjudicated';
  /** Requires a concrete explanation for mixed or opposing original tests. */
  reconciliationRationale?:string;
  originalTestLineageReviewed:true;
  independentlyReviewedContext:true;
}
export interface Phase99CriterionDifference {
  criterionId:string;
  firstVariantBounds:[number,number];
  secondVariantBounds:[number,number];
  /** Signed first-minus-second contribution to the comparative value. */
  firstMinusSecondBounds:[number,number];
  interpretation:'first_advantage'|'second_advantage'|'overlap_or_unknown';
  firstEvidence:{findingIds:string[];originalTestIds:string[];sourceUrls:string[]};
  secondEvidence:{findingIds:string[];originalTestIds:string[];sourceUrls:string[]};
}
export interface Phase99BridgeResult {
  purpose:'phase99_original_qualitative_to_personal_value_research_only';
  publicationReady:false;
  rankingEligible:false;
  /** Null when unreconciled findings or sensitivity make a winner unsupported. */
  conditionalOrder:string[]|null;
  comparisonAssessment:'conditional_under_one_elicited_profile'|'robust_across_reviewed_scenarios'|'scenario_sensitive'|'missing_or_unadjudicated_evidence'|'not_comparable';
  primary:TradeoffResearchResult;
  criterionDifferences:Phase99CriterionDifference[];
  qualitativeTrace:{variantId:string;criterionId:string;findingIds:string[];originalTestIds:string[];sourceUrls:string[];propositions:string[]}[];
  pendingEvidence:{variantId:string;criterionId:string;findingIds:string[];reason:string}[];
  scenarioResults:{profileReference:string;rankStatus:TradeoffResearchResult['rankStatus'];conditionalOrder:string[]|null}[];
  limitations:readonly string[];
}

export function compareReviewedQualitativeEvidence(input:{
  preferenceModel:ReviewedPreferenceModel;
  variantIds:readonly [string,string];
  qualitativeBundles:readonly Phase99QualitativeBundle[];
  performanceMappings:readonly Phase99PerformanceMapping[];
  independentLabPerformance?:readonly IndependentPerformanceAssessment[];
  hardRequirements?:readonly HardRequirement[];
  /** Separately elicited sensitivity scenarios, NOT sampled weight perturbations. */
  sensitivityPreferenceModels?:readonly ReviewedPreferenceModel[];
}):Phase99BridgeResult{
  const {preferenceModel,variantIds:vs,qualitativeBundles:bundles,performanceMappings:mappings}=input;
  if(!Array.isArray(vs)||vs.length!==2||!vs.every(validId)||vs[0]===vs[1]||
    !Array.isArray(bundles)||bundles.length!==2||new Set(bundles.map(x=>x?.variantId)).size!==2||
    !bundles.every(b=>vs.includes(b.variantId))||
    !Array.isArray(mappings)||mappings.length>120||
    !Array.isArray(input.independentLabPerformance??[])||!Array.isArray(input.hardRequirements??[])||
    !Array.isArray(input.sensitivityPreferenceModels??[])||(input.sensitivityPreferenceModels?.length??0)>12)
    throw Error('invalid_phase99_input');
  const criteria=preferenceModel?.criteria;
  if(!Array.isArray(criteria))throw Error('invalid_preference_criteria');
  const knownCriteria=new Set(criteria.map(c=>c.criterionId));
  const allFindings=new Map<string,{finding:QuarantinedQualitativeFinding;approval:ReviewEvidenceApproval|null}>();
  const pendingEvidence:Phase99BridgeResult['pendingEvidence']=[];
  for(const bundle of bundles){
    if(!Array.isArray(bundle.findings)||!Array.isArray(bundle.approvals)||!Array.isArray(bundle.needs)||
      bundle.needs.length!==criteria.length||
      new Set(bundle.needs.map((x:QualitativeNeed)=>x.criterionId)).size!==criteria.length||
      bundle.needs.some((n:QualitativeNeed)=>!knownCriteria.has(n.criterionId)))throw Error('unmapped_user_context');
    // Invoke Phase 96's original structural, source, approval and context checks.
    assessQualitativeNeeds({needs:bundle.needs,observations:bundle.findings,approvals:bundle.approvals});
    const approvals=new Map<string,ReviewEvidenceApproval>(bundle.approvals.map((a:ReviewEvidenceApproval)=>[a.findingId,a]));
    for(const finding of bundle.findings){
      if(finding.exactVariantId!==bundle.variantId||!knownCriteria.has(finding.criterionId)||
        allFindings.has(finding.findingId))throw Error('incorrect_variant_or_duplicate_finding');
      allFindings.set(finding.findingId,{finding,approval:approvals.get(finding.findingId)??null});
    }
  }
  const selected=new Set<string>();
  const usedOriginalPassages=new Map<string,string>();
  const perCriterion=new Set<string>();
  const performance:IndependentPerformanceAssessment[]=[...(input.independentLabPerformance??[])];
  const trace:Phase99BridgeResult['qualitativeTrace']=[];
  for(const mapping of mappings){
    const key=mapping.variantId+':'+mapping.criterionId;
    if(!vs.includes(mapping.variantId)||!knownCriteria.has(mapping.criterionId)||perCriterion.has(key)||
      !validId(mapping.performanceAssessorId)||!receipt(mapping.performanceReviewReference)||
      !validDate(mapping.performanceReviewDate)||!mapping.originalTestLineageReviewed||
      !mapping.independentlyReviewedContext||!['consistent_evidence','contradictions_adjudicated'].includes(mapping.reconciliation)||
      !Array.isArray(mapping.supportingFindingIds)||mapping.supportingFindingIds.length===0||
      mapping.supportingFindingIds.length>40||
      new Set(mapping.supportingFindingIds).size!==mapping.supportingFindingIds.length)
      throw Error('invalid_or_duplicate_performance_adjudication');
    perCriterion.add(key);
    const bundle=bundles.find(b=>b.variantId===mapping.variantId)!;
    const need=bundle.needs.find((n:QualitativeNeed)=>n.criterionId===mapping.criterionId)!;
    const selectedFindings:QuarantinedQualitativeFinding[]=[];
    const implications=new Set<string>();
    for(const findingId of mapping.supportingFindingIds){
      const entry=allFindings.get(findingId);
      if(!entry||selected.has(findingId)||entry.finding.exactVariantId!==mapping.variantId||
        entry.finding.criterionId!==mapping.criterionId)throw Error('unattributed_or_reused_original_finding');
      const {finding:f,approval:a}=entry;
      if(!a||a.validatedSourceSha256!==f.sourceSha256||a.semanticFaithfulness!=='confirmed'||
        a.methodAssessment!=='documented'||a.adequacyAssessment!=='documented'||
        a.criterionImplication==='undetermined'||!f.methodologyReference||
        a.reviewerId===mapping.performanceAssessorId||
        Date.parse(a.reviewedAt)>=Date.parse(mapping.performanceReviewDate)||
        !Object.entries(f.context).every(([k,v])=>need.context[k]===v))
        throw Error('unapproved_or_context_mismatched_qualitative_claim');
      const passageKey=f.originalTestId+':'+f.sourceSpanSha256;
      if(usedOriginalPassages.has(passageKey)&&usedOriginalPassages.get(passageKey)!==mapping.criterionId)
        throw Error('same_original_passage_counted_as_multiple_criteria');
      usedOriginalPassages.set(passageKey,mapping.criterionId);
      selected.add(findingId);selectedFindings.push(f);implications.add(a.criterionImplication);
    }
    const disagreement=implications.has('supports')&&implications.has('concerns');
    if(disagreement&&mapping.reconciliation!=='contradictions_adjudicated')
      throw Error('unreconciled_opposing_findings');
    if(mapping.reconciliation==='contradictions_adjudicated'&&
      (!receipt(mapping.reconciliationRationale)||selectedFindings.length<2))
      throw Error('missing_conflict_reconciliation');
    if(mapping.reconciliation==='consistent_evidence'&&mapping.reconciliationRationale)
      throw Error('unnecessary_reconciliation_rationale');
    const originalTestIds=unique(selectedFindings.map(f=>f.originalTestId));
    const sourceUrls=unique(selectedFindings.map(f=>f.sourceUrl));
    const first=selectedFindings[0];
    performance.push({variantId:mapping.variantId,criterionId:mapping.criterionId,
      levelId:mapping.levelId,plausibleLevelIds:mapping.plausibleLevelIds,
      evidenceOrigin:'original_professional_qualitative_test',originalTestId:first.originalTestId,
      sourceUrl:first.sourceUrl,performanceAdjudicationReference:mapping.performanceReviewReference,
      exactModelConfirmed:true,contextConfirmed:true,methodReviewed:true});
    trace.push({variantId:mapping.variantId,criterionId:mapping.criterionId,
      findingIds:selectedFindings.map(f=>f.findingId),originalTestIds,sourceUrls,
      propositions:selectedFindings.map(f=>f.proposition)});
  }
  // Other findings must be shown as unresolved rather than silently discarded.
  // This includes unapproved contradictions that could reverse a provisional rank.
  for(const bundle of bundles){
    for(const c of criteria){
      const unmatched=bundle.findings.filter((f:QuarantinedQualitativeFinding)=>f.criterionId===c.criterionId&&
        Object.entries(f.context).every(([k,v])=>bundle.needs.find((n:QualitativeNeed)=>n.criterionId===c.criterionId)!.context[k]===v)&&
        !selected.has(f.findingId));
      if(unmatched.length)pendingEvidence.push({variantId:bundle.variantId,criterionId:c.criterionId,
        findingIds:unmatched.map((f:QuarantinedQualitativeFinding)=>f.findingId),reason:'A context-relevant original claim is not included in the independently adjudicated criterion performance.'});
    }
  }
  const hardRequirements=input.hardRequirements??[];
  // A hard pass/fail must be supported by a matching independently reviewed
  // performance record, not only by a free-form documentary veto statement.
  for(const h of hardRequirements){
    for(const a of h.variantAssessments){
      if(a.result==='unresolved')continue;
      if(!performance.some(p=>p.variantId===a.variantId&&p.criterionId===h.criterionId&&
        p.originalTestId===a.originalTestId&&p.sourceUrl===a.sourceUrl))
        throw Error('unlinked_hard_evidence_not_acceptable');
    }
  }
  const models=[preferenceModel,...(input.sensitivityPreferenceModels??[])];
  const baseCriteria=JSON.stringify(preferenceModel.criteria.map(c=>[c.criterionId,c.levels]));
  for(const model of models.slice(1)){
    if(JSON.stringify(model.criteria.map(c=>[c.criterionId,c.levels]))!==baseCriteria||
      model.profileReference===preferenceModel.profileReference)
      throw Error('noncomparable_or_reused_preference_scenario');
  }
  const results=models.map(model=>evaluateCompensatoryTradeoffs({
    preferenceModel:model,variantIds:vs,performance,hardRequirements}));
  const primary=results[0];
  const comparisonReady=!pendingEvidence.length;
  const allSame=results.every(r=>r.conditionalOrder&&
    JSON.stringify(r.conditionalOrder)===JSON.stringify(primary.conditionalOrder));
  const conditionalOrder=comparisonReady&&allSame?primary.conditionalOrder:null;
  const comparisonAssessment:Phase99BridgeResult['comparisonAssessment']=
    !comparisonReady?'missing_or_unadjudicated_evidence':
    !results.every(r=>r.variants.every(v=>v.eligibility==='tradeoff_eligible'))?'not_comparable':
    !allSame?'scenario_sensitive':models.length===1?'conditional_under_one_elicited_profile':'robust_across_reviewed_scenarios';
  const [first,second]=primary.variants;
  const criterionDifferences=criteria.map((c,i):Phase99CriterionDifference=>{
    const x=first.contributions[i].weightedValueBounds;
    const y=second.contributions[i].weightedValueBounds;
    const diff:[number,number]=[snap(x[0]-y[1]),snap(x[1]-y[0])];
    const tf=trace.find(t=>t.variantId===first.variantId&&t.criterionId===c.criterionId);
    const ts=trace.find(t=>t.variantId===second.variantId&&t.criterionId===c.criterionId);
    const evidence=(t:typeof tf)=>({findingIds:t?.findingIds??[],originalTestIds:t?.originalTestIds??[],sourceUrls:t?.sourceUrls??[]});
    return {criterionId:c.criterionId,firstVariantBounds:x,secondVariantBounds:y,
      firstMinusSecondBounds:diff,
      interpretation:diff[0]>0?'first_advantage':diff[1]<0?'second_advantage':'overlap_or_unknown',
      firstEvidence:evidence(tf),secondEvidence:evidence(ts)};
  });
  return {purpose:'phase99_original_qualitative_to_personal_value_research_only',
    publicationReady:false,rankingEligible:false,conditionalOrder,comparisonAssessment,
    primary,criterionDifferences,qualitativeTrace:trace,pendingEvidence,
    scenarioResults:results.map((r,i)=>({profileReference:models[i].profileReference,
      rankStatus:r.rankStatus,conditionalOrder:r.conditionalOrder})),
    limitations:[
      'A performance assessor maps approved original observations to an already elicited criterion value scale; the algorithm does not estimate cardinal values from sentiment.',
      'Original test IDs and source URLs are de-duplicated within a criterion; additional publication instances do not increase swing weight.',
      'Sensitivity checks enumerate only explicitly provided reviewed scenarios, not all mathematically possible compatible value functions (NOT full Robust Ordinal Regression).',
      'Reviewer names, user preference receipts and conflict resolution are documentary assertions, not proof of authenticated approval or empirical calibration.',
      'Pending source evidence blocks a robust conditional winner; absent evidence yields broad value bounds, not a zero score.',
      'Unproven preferential independence and interacting criteria can invalidate additive aggregation; public ranking remains unchanged.'
    ]};
}
