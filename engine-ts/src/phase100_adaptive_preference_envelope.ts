/**
 * Phase 100: bounded, exact polytope sensitivity over swing weights compatible
 * with declared ordinal comparisons, using ONLY independently reviewed,
 * criterion-level Phase99 value bounds. No model calls, sentiment scores,
 * assumed uniform user priors, retailer data or public-ranking permission.
 *
 * UK Government Analysis Function MCDA (2024); Greco/Mousseau/Słowiński
 * UTA-GMS (2008); active preference elicitation/minimax-regret literature.
 * This is a restricted linear swing-weight envelope, NOT full UTA-GMS,
 * MACBETH, conjoint estimation or statistically calibrated preferences.
 */
import type {Phase99BridgeResult} from './phase99_qualitative_tradeoff_bridge.js';
import type {ReviewedPreferenceModel,TradeoffResearchResult} from './phase98_tradeoff_value_model.js';

const EPS=1e-7, VALUE_TOLERANCE=0.001;
const goodId=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_]{1,100}$/.test(s);
const ref=(s:unknown):s is string=>typeof s==='string'&&s.trim().length>=12&&s.length<=500;
const round=(x:number)=>Math.round(x*1e5)/1e5;
export type SwingPreference='more_important'|'equally_important';
export interface OrdinalSwingJudgement {
  firstCriterionId:string;
  secondCriterionId:string;
  /** Compare improvements over criterion-specific *reviewed full swings*. */
  preference:SwingPreference;
  userConfirmed:true;
  answerReference:string;
}
export interface AdaptivePreferenceQuestion {
  firstCriterionId:string;
  secondCriterionId:string;
  prompt:string;
  responses:['first_more_important','second_more_important','equally_important'];
  /** Computed bounds, never a probability/expected information gain. */
  conditionalFirstMore:[number,number];
  conditionalSecondMore:[number,number];
}
export interface AdaptivePreferenceResult {
  purpose:'phase100_bounded_adaptive_preference_research_only';
  publicationReady:false;
  rankingEligible:false;
  status:'necessary_first'|'necessary_second'|'underdetermined'|'need_more_evidence'|'hard_requirement_unresolved_or_failed';
  /** Bounds on U(first) - U(second) over admissible weights and source uncertainty. */
  differenceBounds:[number,number]|null;
  admissibleWeightBounds:{criterionId:string;minimum:number;maximum:number}[];
  compatiblePolytopeVertices:number;
  question:AdaptivePreferenceQuestion|null;
  sourceVariantIds:[string,string];
  missingOrPendingEvidence:string[];
  limitations:string[];
}
type Constraint={coeff:number[];min:number};
type Range=[number,number];
const dot=(a:readonly number[],b:readonly number[])=>a.reduce((s,x,i)=>s+x*b[i],0);
function solve(a:number[][],b:number[]):number[]|null{
  const n=a.length,work=a.map((row,i)=>[...row,b[i]]);
  for(let k=0;k<n;k++){
    let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(work[i][k])>Math.abs(work[pivot][k]))pivot=i;
    if(Math.abs(work[pivot][k])<1e-10)return null;
    [work[k],work[pivot]]=[work[pivot],work[k]];
    const div=work[k][k];for(let j=k;j<=n;j++)work[k][j]/=div;
    for(let i=0;i<n;i++)if(i!==k){const m=work[i][k];for(let j=k;j<=n;j++)work[i][j]-=m*work[k][j];}
  }
  return work.map(r=>r[n]);
}
function enumerateVertices(n:number,cs:readonly Constraint[]):number[][]{
  // The bounded simplex makes all extrema occur at vertices. Each vertex
  // intersects the normalization plane with n-1 active inequalities.
  const all:Constraint[]=[...Array.from({length:n},(_,i)=>({coeff:Array.from({length:n},(_,j)=>i===j?1:0),min:0})),...cs];
  const vertices=new Map<string,number[]>(),chosen:number[]=[];
  const evaluate=()=>{
    const a=[Array(n).fill(1),...chosen.map(i=>all[i].coeff)];
    const b=[1,...chosen.map(i=>all[i].min)];
    const w=solve(a,b);if(!w||w.some(x=>x< -EPS||x>1+EPS)||
      all.some(c=>dot(c.coeff,w)<c.min-EPS))return;
    const fixed=w.map(x=>Math.abs(x)<EPS?0:x);
    vertices.set(fixed.map(x=>x.toFixed(8)).join(':'),fixed);
  };
  const rec=(start:number)=>{
    if(chosen.length===n-1){evaluate();return;}
    for(let i=start;i<=all.length-(n-1-chosen.length);i++){
      chosen.push(i);rec(i+1);chosen.pop();
    }
  };rec(0);
  return [...vertices.values()];
}
function withJudgments(criteria:string[],judgements:readonly OrdinalSwingJudgement[]):Constraint[]{
  const cs:Constraint[]=[];
  const used=new Map<string,string>();
  for(const j of judgements){
    const a=criteria.indexOf(j?.firstCriterionId),b=criteria.indexOf(j?.secondCriterionId);
    if(a<0||b<0||a===b||!['more_important','equally_important'].includes(j.preference)||
      j.userConfirmed!==true||!ref(j.answerReference))throw Error('invalid_or_unconfirmed_swing_judgement');
    const key=[criteria[a],criteria[b]].sort().join(':');
    if(used.has(key))throw Error('duplicate_swing_question_requires_explicit_reconciliation');
    used.set(key,j.preference);
    const row=criteria.map((_,i)=>i===a?1:i===b?-1:0);
    cs.push({coeff:row,min:0});
    if(j.preference==='equally_important')cs.push({coeff:row.map(x=>-x),min:0});
  }
  return cs;
}
function validStrictAnswers(vertices:readonly number[][],criteria:string[],judgements:readonly OrdinalSwingJudgement[]):boolean{
  // Strict ordinal preference is w_a>w_b, with NO fabricated numeric gap.
  // A common feasible strict point exists iff each strict inequality is
  // positive at some vertex: averaging those witnesses preserves the other
  // weak inequalities and makes every requested strict difference positive.
  return judgements.every(j=>j.preference!=='more_important'||
    vertices.some(w=>w[criteria.indexOf(j.firstCriterionId)]-w[criteria.indexOf(j.secondCriterionId)]>EPS));
}
function diffRange(vertices:readonly number[][],first:readonly Range[],second:readonly Range[]):Range{
  let low=Infinity,high=-Infinity;
  for(const w of vertices){
    let l=0,h=0;for(let i=0;i<w.length;i++){
      l+=w[i]*(first[i][0]-second[i][1]);
      h+=w[i]*(first[i][1]-second[i][0]);
    }
    low=Math.min(low,l);high=Math.max(high,h);
  }
  return [low,high];
}
function cleanBounds(xs:readonly number[]):Range{
  if(xs.length!==2||!xs.every(x=>typeof x==='number'&&Number.isFinite(x))||xs[0]<-EPS||xs[1]>100+EPS||xs[0]>xs[1]+EPS)
    throw Error('invalid_phase99_value_bounds');
  return [Math.max(0,xs[0]),Math.min(100,xs[1])];
}
export function assessAdaptiveSwingPreferences(input:{
  phase99:Phase99BridgeResult;
  /** Existing reviewed Phase99 scales. Its weights are used solely to undo
   * Phase99's pre-multiplication, NOT imposed as the user's only plausible weights. */
  reviewedScaleCarrier:ReviewedPreferenceModel;
  ordinalJudgements:readonly OrdinalSwingJudgement[];
  /** Explicit choice to explore alternatives to the already confirmed Phase99
   * point weights; not an implicit revocation of those values. */
  preferenceExplorationConfirmed:true;
  preferenceExplorationReference:string;
  /** If false, provide no prompt and return interval only. */
  suggestQuestion?:boolean;
}):AdaptivePreferenceResult{
  const r=input.phase99,p=input.reviewedScaleCarrier;
  if(r?.purpose!=='phase99_original_qualitative_to_personal_value_research_only'||
    r.publicationReady!==false||r.rankingEligible!==false||
    !Array.isArray(r.criterionDifferences)||!Array.isArray(r.primary?.variants)||r.primary.variants.length!==2||
    !p||!Array.isArray(p.criteria)||p.criteria.length<2||p.criteria.length>5||
    !p.userPreferencesConfirmed||!p.independentlyReviewedAdditiveAssumptions||!ref(p.additiveReviewReference)||
    !Array.isArray(input.ordinalJudgements)||input.ordinalJudgements.length>14||
    input.preferenceExplorationConfirmed!==true||!ref(input.preferenceExplorationReference))
    throw Error('invalid_phase99_research_handoff');
  const criteria=p.criteria.map(c=>c.criterionId);
  if(new Set(criteria).size!==criteria.length||criteria.some(c=>!goodId(c))||
    p.criteria.some(c=>!(c.swingWeight>0&&c.swingWeight<=1)||!Number.isFinite(c.swingWeight)||
      !ref(c.valueScaleElicitationReceipt)||!ref(c.weightElicitationReceipt)||
      !Array.isArray(c.levels)||c.levels.length<2||c.levels[0].value!==0||
      c.levels[c.levels.length-1].value!==100)||
    Math.abs(p.criteria.reduce((s,c)=>s+c.swingWeight,0)-1)>1e-6||
    r.criterionDifferences.length!==criteria.length||
    r.criterionDifferences.some((d,i)=>d.criterionId!==criteria[i])||
    r.primary.variants.some(v=>!goodId(v.variantId)||v.contributions.length!==criteria.length||
      v.contributions.some((c,i)=>c.criterionId!==criteria[i]))||
    r.criterionDifferences.some((d,i)=>
      d.firstVariantBounds.some((x,j)=>Math.abs(x-r.primary.variants[0].contributions[i].weightedValueBounds[j])>1e-6)||
      d.secondVariantBounds.some((x,j)=>Math.abs(x-r.primary.variants[1].contributions[i].weightedValueBounds[j])>1e-6))||
    r.primary.variants[0].variantId===r.primary.variants[1].variantId)
    throw Error('unverified_or_nonmatching_scales');
  const variants=r.primary.variants;
  const missing:string[]=[];
  for(const v of variants){
    for(const c of v.missingCriteria)missing.push(v.variantId+':'+c);
  }
  for(const e of r.pendingEvidence)missing.push(e.variantId+':'+e.criterionId+':unadjudicated');
  const sourceVariantIds:[string,string]=[variants[0].variantId,variants[1].variantId];
  const base={purpose:'phase100_bounded_adaptive_preference_research_only' as const,
    publicationReady:false as const,rankingEligible:false as const,sourceVariantIds,
    limitations:[
      'Research output only: no published ranking or reviewer/authentication claim.',
      'Bounds apply only to reviewed Phase99 criterion scales, two variants, five or fewer criteria and additive independent swings.',
      'All non-negative normalized weights compatible with supplied ordinal comparisons are included; this is a restricted exact LP polytope, not full UTA-GMS or MACBETH.',
      'Performance uncertainty bounds are worst-case rectangular ranges, not sampling-based probabilities or statistical confidence intervals.',
      'Pairwise question selection uses a deterministic branch-interval tightening heuristic, not validated optimal information gain or a measured user-burden model.',
      'Raw qualitative review sentiment is never converted into a score; Phase99 independent assessment and full audit chain remain required.'
    ]};
  if(variants.some(v=>v.eligibility!=='tradeoff_eligible'))return {...base,status:'hard_requirement_unresolved_or_failed',differenceBounds:null,
    admissibleWeightBounds:[],compatiblePolytopeVertices:0,question:null,missingOrPendingEvidence:missing};
  if(missing.length)return {...base,status:'need_more_evidence',differenceBounds:null,
    admissibleWeightBounds:[],compatiblePolytopeVertices:0,question:null,missingOrPendingEvidence:missing};
  const xs:Range[]=[],ys:Range[]=[];
  for(let i=0;i<p.criteria.length;i++){
    const d=r.criterionDifferences[i],w=p.criteria[i].swingWeight;
    const left=cleanBounds([d.firstVariantBounds[0]/w,d.firstVariantBounds[1]/w]);
    const right=cleanBounds([d.secondVariantBounds[0]/w,d.secondVariantBounds[1]/w]);
    // Outward padding covers Phase98's five-decimal rounding of weighted scores.
    xs.push([Math.max(0,left[0]-VALUE_TOLERANCE),Math.min(100,left[1]+VALUE_TOLERANCE)]);
    ys.push([Math.max(0,right[0]-VALUE_TOLERANCE),Math.min(100,right[1]+VALUE_TOLERANCE)]);
  }
  const cs=withJudgments(criteria,input.ordinalJudgements);
  const vertices=enumerateVertices(criteria.length,cs);
  if(!vertices.length||!validStrictAnswers(vertices,criteria,input.ordinalJudgements))
    throw Error('inconsistent_confirmed_preference_judgements');
  const diff=diffRange(vertices,xs,ys);
  const status=diff[0]>VALUE_TOLERANCE?'necessary_first':diff[1]<-VALUE_TOLERANCE?'necessary_second':'underdetermined';
  const bounds=criteria.map((criterionId,i)=>({criterionId,
    minimum:round(Math.min(...vertices.map(v=>v[i]))),maximum:round(Math.max(...vertices.map(v=>v[i])))}));
  let question:AdaptivePreferenceQuestion|null=null;
  if(status==='underdetermined'&&input.suggestQuestion!==false){
    let best=-Infinity;
    const existing=new Set(input.ordinalJudgements.map(j=>[j.firstCriterionId,j.secondCriterionId].sort().join(':')));
    const originalWidth=diff[1]-diff[0];
    for(let a=0;a<criteria.length;a++)for(let b=a+1;b<criteria.length;b++){
      if(existing.has([criteria[a],criteria[b]].sort().join(':')))continue;
      const ab=criteria.map((_,i)=>i===a?1:i===b?-1:0);
      const va=enumerateVertices(criteria.length,[...cs,{coeff:ab,min:0}]);
      const vb=enumerateVertices(criteria.length,[...cs,{coeff:ab.map(x=>-x),min:0}]);
      if(!va.some(w=>w[a]-w[b]>EPS)||!vb.some(w=>w[b]-w[a]>EPS))continue;
      const da=diffRange(va,xs,ys),db=diffRange(vb,xs,ys);
      // Sum of the two conditional interval reductions is a deterministic
      // decision-focused heuristic, NOT an expected gain or a probability.
      const improvement=2*originalWidth-((da[1]-da[0])+(db[1]-db[0]));
      const tieBreak=(Math.abs(xs[a][0]-ys[a][1])+Math.abs(xs[b][0]-ys[b][1]));
      const score=improvement+tieBreak*1e-10;
      if(improvement<=VALUE_TOLERANCE||score<=best)continue;
      best=score;
      const ca=p.criteria[a],cb=p.criteria[b];
      question={firstCriterionId:criteria[a],secondCriterionId:criteria[b],
        prompt:`Which complete improvement matters more to you: ${criteria[a]} from "${ca.levels[0].description}" to "${ca.levels[ca.levels.length-1].description}", or ${criteria[b]} from "${cb.levels[0].description}" to "${cb.levels[cb.levels.length-1].description}"? You can also say they matter equally.`,
        responses:['first_more_important','second_more_important','equally_important'],
        conditionalFirstMore:[round(da[0]),round(da[1])],
        conditionalSecondMore:[round(db[0]),round(db[1])]};
    }
  }
  return {...base,status,differenceBounds:[round(diff[0]),round(diff[1])],
    admissibleWeightBounds:bounds,compatiblePolytopeVertices:vertices.length,
    question,missingOrPendingEvidence:missing};
}

/** Phase107 alternative handoff: reviewed, stored Phase101 calibration -> Phase98
 * criterion values -> Phase100's EXACT restricted swing-weight polytope. This
 * deliberately does not pretend the input passed through Phase99 raw findings.
 * Never an LLM score, statistical CI or a consumer-ready winner.
 */
export function assessAdaptiveFromStoredReviewedValues(input:{
  tradeoffs:TradeoffResearchResult;
  reviewedPreferenceModel:ReviewedPreferenceModel;
  ordinalJudgements:readonly OrdinalSwingJudgement[];
  preferenceExplorationConfirmed:true;
  preferenceExplorationReference:string;
}):AdaptivePreferenceResult {
  const {tradeoffs:t,reviewedPreferenceModel:p,ordinalJudgements:judgements}=input;
  if(t?.purpose!=='phase98_compensatory_criterion_value_model_research_only'||
    t.publicationReady!==false||t.rankingEligible!==false||
    !Array.isArray(t.variants)||t.variants.length!==2||
    !p||!p.userPreferencesConfirmed||!p.independentlyReviewedAdditiveAssumptions||
    !ref(p.profileReference)||!ref(p.additiveReviewReference)||
    !Array.isArray(p.criteria)||p.criteria.length<2||p.criteria.length>5||
    !Array.isArray(judgements)||judgements.length>14||
    input.preferenceExplorationConfirmed!==true||!ref(input.preferenceExplorationReference))
    throw Error('invalid_reviewed_memory_preference_handoff');
  const criteria=p.criteria.map(x=>x.criterionId);
  if(new Set(criteria).size!==criteria.length||criteria.some(c=>!goodId(c))||
    p.criteria.some(c=>!Number.isFinite(c.swingWeight)||c.swingWeight<=0||c.swingWeight>1||
      !ref(c.valueScaleElicitationReceipt)||!ref(c.weightElicitationReceipt)||
      !Array.isArray(c.levels)||c.levels.length<2||c.levels[0].value!==0||
      c.levels[c.levels.length-1].value!==100)||
    Math.abs(p.criteria.reduce((s,c)=>s+c.swingWeight,0)-1)>1e-6||
    t.variants[0].variantId===t.variants[1].variantId||
    t.variants.some(v=>v.contributions.length!==criteria.length||
      v.contributions.some((c,i)=>c.criterionId!==criteria[i])))
    throw Error('inconsistent_reviewed_memory_tradeoff_scales');
  const sourceVariantIds:[string,string]=[t.variants[0].variantId,t.variants[1].variantId];
  const base={purpose:'phase100_bounded_adaptive_preference_research_only' as const,
    sourceVariantIds,publicationReady:false as const,rankingEligible:false as const,
    question:null,limitations:[
      'Source-free handoff from Phase101 approved level mappings through Phase98, not a Phase99 raw-text replay.',
      'Exact restricted convex polytope for at most 5 criteria; not full UTA-GMS or empirical preference calibration.',
      'Plausible performance intervals are logical worst cases, not statistical uncertainty distributions.',
      'Unknown criterion evidence cannot be silently treated as poor performance.',
      'No public ranking, reviewer authentication proof, or empirical real-consumer validation.'
    ]};
  const missing=t.variants.flatMap(v=>v.missingCriteria.map(c=>v.variantId+':'+c));
  if(t.variants.some(v=>v.eligibility!=='tradeoff_eligible'))return {...base,
    status:'hard_requirement_unresolved_or_failed' as const,differenceBounds:null,
    admissibleWeightBounds:[],compatiblePolytopeVertices:0,missingOrPendingEvidence:missing};
  if(missing.length)return {...base,status:'need_more_evidence' as const,differenceBounds:null,
    admissibleWeightBounds:[],compatiblePolytopeVertices:0,missingOrPendingEvidence:missing};
  const xs:Range[]=[],ys:Range[]=[];
  for(let i=0;i<criteria.length;i++){
    const w=p.criteria[i].swingWeight;
    const c1=t.variants[0].contributions[i].weightedValueBounds;
    const c2=t.variants[1].contributions[i].weightedValueBounds;
    // Outward allowance for Phase98's five-decimal score rounding.
    const epsilon=0.000011/w;
    xs.push(cleanBounds([Math.max(0,c1[0]/w-epsilon),Math.min(100,c1[1]/w+epsilon)]));
    ys.push(cleanBounds([Math.max(0,c2[0]/w-epsilon),Math.min(100,c2[1]/w+epsilon)]));
  }
  const cs=withJudgments(criteria,judgements),vertices=enumerateVertices(criteria.length,cs);
  if(!vertices.length||!validStrictAnswers(vertices,criteria,judgements))
    throw Error('inconsistent_confirmed_preference_judgements');
  const d=diffRange(vertices,xs,ys);
  const status=d[0]>VALUE_TOLERANCE?'necessary_first':
    d[1]<-VALUE_TOLERANCE?'necessary_second':'underdetermined';
  let question:AdaptivePreferenceQuestion|null=null;
  if(status==='underdetermined'){
    let best=-Infinity;
    const used=new Set(judgements.map(j=>[j.firstCriterionId,j.secondCriterionId].sort().join(':')));
    const width=d[1]-d[0];
    for(let a=0;a<criteria.length;a++)for(let b=a+1;b<criteria.length;b++){
      if(used.has([criteria[a],criteria[b]].sort().join(':')))continue;
      const ab=criteria.map((_,i)=>i===a?1:i===b?-1:0);
      const av=enumerateVertices(criteria.length,[...cs,{coeff:ab,min:0}]);
      const bv=enumerateVertices(criteria.length,[...cs,{coeff:ab.map(x=>-x),min:0}]);
      if(!av.some(w=>w[a]-w[b]>EPS)||!bv.some(w=>w[b]-w[a]>EPS))continue;
      const da=diffRange(av,xs,ys),db=diffRange(bv,xs,ys);
      const improvement=2*width-((da[1]-da[0])+(db[1]-db[0]));
      if(improvement<=VALUE_TOLERANCE||improvement<=best)continue;
      best=improvement;
      const ca=p.criteria[a],cb=p.criteria[b];
      question={firstCriterionId:criteria[a],secondCriterionId:criteria[b],
        prompt:`Which complete improvement matters more: ${criteria[a]} from "${ca.levels[0].description}" to "${ca.levels[ca.levels.length-1].description}", or ${criteria[b]} from "${cb.levels[0].description}" to "${cb.levels[cb.levels.length-1].description}"?`,
        responses:['first_more_important','second_more_important','equally_important'],
        conditionalFirstMore:[round(da[0]),round(da[1])],
        conditionalSecondMore:[round(db[0]),round(db[1])]};
    }
  }
  return {...base,status,question,differenceBounds:[round(d[0]),round(d[1])],
    compatiblePolytopeVertices:vertices.length,missingOrPendingEvidence:[],
    admissibleWeightBounds:criteria.map((criterionId,i)=>({criterionId,
      minimum:round(Math.min(...vertices.map(v=>v[i]))),
      maximum:round(Math.max(...vertices.map(v=>v[i])))}))};
}
