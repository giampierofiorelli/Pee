/**
 * Phase 123: small, entirely in-house supervised intent proposal using sparse
 * subword/word TF-IDF, nearest-neighbour and class centroid similarities.
 * Not a language model, proof of understanding, or authorization to rank.
 * The training corpus is developer-constructed, not independently annotated.
 * Safety guards cover negation and explicit multi-goal constructions.
 */
import {createHash} from 'node:crypto';
import {type Context122,type Intent122,type Coverage122,
  researchObligations122,interpretQuestion122} from './phase122_native_question_to_research.js';

export type Label123='autonomy'|'performance'|'value'|'capability'|'other';
export interface LabeledQuestion123 {id:string;text:string;label:Label123;provenance:string;}
export interface Prediction123 {status:'proposed'|'abstain'|'needs_context'|'needs_constraint_review';
  label:Label123|null; rawLabel:Label123; reason:string; bestSimilarity:number; separation:number;
  /** Numeric diagnostics are cosine similarity, NOT calibrated probabilities. */
  supportId:string|null; modelHash:string; establishedContext:boolean;
  publicationAuthorized:false; }
interface Sparse123 extends Map<string,number>{}
interface Entry123{sample:LabeledQuestion123;vector:Sparse123}
export interface NativeModel123 {readonly hash:string;readonly entries:readonly Entry123[];
  readonly centroids:ReadonlyMap<Label123,Sparse123>;readonly idf:ReadonlyMap<string,number>;
  readonly acceptedSimilarity:number;readonly acceptedMargin:number;
  validation:{calibrationCount:number;selectedOnConstructedData:true;calibrationIncorrectAccepted:number;
    calibrationCorrectAccepted:number;calibrationAbstentions:number};}
export const knownLabels123:readonly Label123[]=['autonomy','performance','value','capability','other'];
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
function norm(s:string){return s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[’']/g," ").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function grams(text:string):Sparse123{
  const t=norm(text);const tokens=t.split(' ').filter(Boolean);
  const f:Sparse123=new Map();
  function add(k:string,v:number){f.set(k,(f.get(k)||0)+v);}
  for(const token of tokens){if(token.length>1)add('w:'+token,2);}
  for(let i=0;i<tokens.length-1;i++)add('b:'+tokens[i]+'_'+tokens[i+1],1.6);
  // Subword n-grams generalize modestly to inflections and unfamiliar spellings.
  for(const token of tokens){const word='^'+token+'$';
    for(const n of [3,4,5])for(let i=0;i+n<=word.length;i++)add('c:'+word.slice(i,i+n),0.45);
  }
  return f;
}
function normalizedWeighted(raw:Sparse123,idf:ReadonlyMap<string,number>):Sparse123{
  const out:Sparse123=new Map();let len=0;
  for(const [k,tf] of raw){const a=(1+Math.log(tf))* (idf.get(k)||0);
    if(a){out.set(k,a);len+=a*a;}}
  if(len){const inv=1/Math.sqrt(len);for(const [k,v] of out)out.set(k,v*inv);}
  return out;
}
function dot(a:Sparse123,b:Sparse123):number{let d=0;
  const [short,long]=a.size<b.size?[a,b]:[b,a];
  for(const [k,v] of short)d+=v*(long.get(k)||0);return d;}
function cosineNormalized(v:Sparse123):Sparse123 {let mag=0;for(const x of v.values())mag+=x*x;
  const m=Math.sqrt(mag);if(m)for(const [k,x] of v)v.set(k,x/m);return v;}
function validate(s:LabeledQuestion123[]){if(s.length<40||s.length>20000)throw Error('bad_training_size');
  const ids=new Set<string>(),texts=new Set<string>(),counts=new Map<Label123,number>();
  for(const x of s){if(!x||!x.id||!x.text||x.text.length>1000||
    !knownLabels123.includes(x.label)||!x.provenance||ids.has(x.id)||texts.has(norm(x.text)))
    throw Error('invalid_training_sample_or_duplicate');
    ids.add(x.id);texts.add(norm(x.text));counts.set(x.label,(counts.get(x.label)||0)+1);
  }
  if(knownLabels123.some(l=>(counts.get(l)||0)<5))throw Error('insufficient_per_class');
}
function fit123(samples:LabeledQuestion123[],minSim:number,margin:number):NativeModel123{
  const df=new Map<string,number>();const raw=samples.map(x=>grams(x.text));
  for(const m of raw)for(const k of m.keys())df.set(k,(df.get(k)||0)+1);
  const idf=new Map([...df].map(([k,count])=>[k,Math.log(1+(samples.length-count+0.5)/(count+0.5))]));
  const entries=samples.map((sample,i)=>({sample,vector:normalizedWeighted(raw[i],idf)}));
  const centroids=new Map<Label123,Sparse123>();
  for(const label of knownLabels123){const v:Sparse123=new Map();let count=0;
    for(const e of entries)if(e.sample.label===label){count++;
      for(const [k,x] of e.vector)v.set(k,(v.get(k)||0)+x);
    }
    if(count)for(const [k,x] of v)v.set(k,x/count);
    centroids.set(label,cosineNormalized(v));
  }
  return {hash:sha(JSON.stringify(samples.map(x=>[x.id,x.text,x.label]))),entries,centroids,idf,
    acceptedSimilarity:minSim,acceptedMargin:margin,
    validation:{calibrationCount:0,selectedOnConstructedData:true,
      calibrationIncorrectAccepted:0,calibrationCorrectAccepted:0,calibrationAbstentions:0}};
}
function rawScores(model:NativeModel123,text:string){
  const v=normalizedWeighted(grams(text),model.idf);
  const scores=knownLabels123.map(label=>{
    let maxNN=0;let supportId:string|null=null;
    for(const e of model.entries)if(e.sample.label===label){
      const x=dot(v,e.vector);if(x>maxNN){maxNN=x;supportId=e.sample.id;}}
    const centroid=dot(v,model.centroids.get(label)!);
    return {label,score:.68*maxNN+.32*centroid,supportId};
  }).sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label));
  return {best:scores[0],margin:scores[0].score-scores[1].score};
}
/** A deterministic, internal calibration split is constructed by caller.
 * Do not call resulting thresholds statistical confidence or external accuracy. */
export function trainNativeModel123(training:LabeledQuestion123[],calibration:LabeledQuestion123[]):NativeModel123{
  validate(training);
  if(!Array.isArray(calibration)||calibration.length<10||
    calibration.some(x=>!knownLabels123.includes(x.label)||training.some(t=>norm(t.text)===norm(x.text))))
    throw Error('invalid_calibration_split');
  // Small grid calibrated for minimal wrong *accepted* labels on constructed data,
  // with abstentions explicitly preferred to unjustified guesses.
  const base=fit123(training,0,0);
  let winner:{sim:number;margin:number;correct:number;wrong:number;abstain:number}|undefined;
  for(const sim of [.16,.20,.24,.28,.32,.36,.40,.44])for(const margin of [.025,.05,.075,.10,.14,.18]){
    let correct=0,wrong=0,abstain=0;
    for(const c of calibration){const s=rawScores(base,c.text);
      const accepted=!guard(c.text)&&s.best.score>=sim&&s.margin>=margin&&s.best.label!=='other';
      if(!accepted){abstain++;continue;}
      if(s.best.label===c.label)correct++;else wrong++;
    }
    const candidate={sim,margin,correct,wrong,abstain};
    // Internal cost-sensitive selection: penalize false accepted labels twice as
    // heavily as a correct acceptance. Do NOT optimize on the later challenge.
    const utility=(c:typeof candidate)=>2*c.correct-4*c.wrong;
    if(!winner||utility(candidate)>utility(winner)||
      (utility(candidate)===utility(winner)&&candidate.wrong<winner.wrong)||
      (utility(candidate)===utility(winner)&&candidate.wrong===winner.wrong&&
        candidate.correct>winner.correct)||
      (utility(candidate)===utility(winner)&&candidate.wrong===winner.wrong&&
        candidate.correct===winner.correct&&candidate.sim>winner.sim))winner=candidate;
  }
  if(!winner)throw Error('calibration_failed');
  const model=fit123(training,winner.sim,winner.margin);
  model.validation={calibrationCount:calibration.length,selectedOnConstructedData:true,
    calibrationIncorrectAccepted:winner.wrong,calibrationCorrectAccepted:winner.correct,
    calibrationAbstentions:winner.abstain};
  return model;
}
function guard(text:string):'negation'|'multiple_objectives'|null{
  const t=norm(text);
  // A trained classifier on short samples does NOT reliably determine negation scope.
  // Conservative constraint review is mandatory, even if classifier is certain.
  if(/\b(non|senza|escludi|evita|mai|not|no|without|exclude|never|dont|don t)\b/.test(t))
    return 'negation';
  if(/\b(1|uno)\b.+\b(2|due)\b/.test(t)||
    /\b(sia\b.+\bsia|migliori\b.+\bconvenienti|best\b.+\band\b.+\bvalue)\b/.test(t))
    return 'multiple_objectives';
  return null;
}
export function proposeNativeIntent123(model:NativeModel123,question:string,
  context:Context122={}):Prediction123{
  if(typeof question!=='string'||question.length<5||question.length>4000)throw Error('invalid_question');
  // A session-verified category may ground an elliptical follow-up even when
  // the current sentence does not contain 'robot'. Explicit competing domains
  // in the known pilot taxonomy override that context (bounded safeguard only).
  const otherKnownCategory=/\b(dishwasher|lavastoviglie|headphones|cuffie)\b/.test(norm(question));
  const establishedContext=!otherKnownCategory&&(
    context.verifiedCategory==='floor_cleaning_robot'||
    interpretQuestion122(question,{}).category==='floor_cleaning_robot');
  const protection=guard(question);
  const scores=rawScores(model,question);
  const result=(status:Prediction123['status'],label:Label123|null,reason:string):Prediction123=>({
    status,label,rawLabel:scores.best.label,reason,bestSimilarity:Number(scores.best.score.toFixed(6)),
    separation:Number(scores.margin.toFixed(6)),supportId:scores.best.supportId,
    modelHash:model.hash,establishedContext,publicationAuthorized:false
  });
  if(protection)return result('needs_constraint_review',null,protection);
  if(!establishedContext)return result('needs_context',null,'no_explicit_or_verified_floor_robot_context');
  if(scores.best.label==='other')return result('abstain',null,'out_of_domain_or_no_purchase_goal');
  if(scores.best.score<model.acceptedSimilarity||scores.margin<model.acceptedMargin)
    return result('abstain',null,'insufficient_similarity_or_margin');
  return result('proposed',scores.best.label,'unverified_learned_semantic_proposal');
}
export interface ResearchPlan123 {phase:123;sourceTextSha256:string;
  proposal:Prediction123; objective:Intent122['objective']|null;
  legacyBoundedCandidate:Intent122['objective']|null;parserDisagreement:boolean;
  unmet:readonly string[];researchQueries:readonly string[];
  next:'request_context'|'review_constraints'|'semantic_review'|'investigate_unknown_goal'|'continue_research';
  publicRankingAuthorized:false;searchExecuted:false;evidenceVerified:false;
  limitations:readonly string[];}
/** The planner does not reinterpret a capability as an established scientific endpoint.
 * It produces exploratory queries for independent validation, not a comparison. */
export function planNativeResearch123(model:NativeModel123,question:string,
  coverage:Coverage122,context:Context122={}):ResearchPlan123{
  if(!coverage||!Number.isSafeInteger(coverage.candidateCount)||coverage.candidateCount<0||
    !Array.isArray(coverage.verifiedMetricKeys))throw Error('bad_coverage');
  const proposal=proposeNativeIntent123(model,question,context);
  const objective:Intent122['objective']|null=proposal.label==='autonomy'?'least_human_work':
    proposal.label==='value'?'best_value':proposal.label==='performance'?'best_performance':null;
  const legacy=interpretQuestion122(question,context);
  const legacyBoundedCandidate=legacy.queryState==='bounded_proposal'?legacy.objective:null;
  const parserDisagreement=proposal.status==='proposed'&&!!legacyBoundedCandidate&&
    !!objective&&legacyBoundedCandidate!==objective;
  const intent:Intent122={category:'floor_cleaning_robot',objective,
    scope:'undecided',mode:'general',queryState:'bounded_proposal',contextUsed:true,
    protectedNegation:false,evidenceSignals:['learned_unconfirmed_proposal'],confirmedByUser:false};
  const obligations=proposal.status==='proposed'&&objective?researchObligations122(intent):[];
  const unmet=obligations.filter(x=>!coverage.verifiedMetricKeys.includes(x.metric)||
    (x.metric==='expert_quality_floor'&&!coverage.hasIndependentlyReviewedQualityPolicy)||
    (x.metric==='test_comparability'&&!coverage.protocolComparable))
    .map(x=>x.metric);
  const next=parserDisagreement?'semantic_review':
    proposal.status==='needs_context'?'request_context':
    proposal.status==='needs_constraint_review'?'review_constraints':
    proposal.status==='abstain'&&proposal.rawLabel!=='other'?'investigate_unknown_goal':
    proposal.status!=='proposed'?'semantic_review':'continue_research';
  // Language remains a *search hint*, never trusted as an extracted capability.
  const researchQueries=next==='investigate_unknown_goal'?[question,
      'independent floor cleaning robot test methodology and capability glossary']:
    next!=='continue_research'?[]:
    proposal.label==='capability'?[question]:
    [question,...unmet.map(x=>'robot floor cleaner independent test '+x.replace(/_/g,' '))];
  return {phase:123,sourceTextSha256:sha(question),proposal,objective,
    legacyBoundedCandidate,parserDisagreement,
    unmet:parserDisagreement?['adjudicate_conflicting_parser_hypotheses']:
      next==='investigate_unknown_goal'?[
      'independent_semantic_goal_research','category_goal_relevance','source_grounded_capability_definition']:
      proposal.label==='capability'&&next==='continue_research'?
      ['identify_requested_capability','source_grounded_goal_definition','product_discovery',
        'product_identity','independent_capability_verification','commercial_availability']:
      unmet,researchQueries,next,publicRankingAuthorized:false,
    searchExecuted:false,evidenceVerified:false,
    limitations:['All intent labels are unverified proposals from a small author-constructed corpus.',
      'Unknown-goal exploratory queries are plans only; an unrecognized concept is never certified by a lexical match.',
      'No category-general NLP, novel capability extraction, real web discovery or ranking is demonstrated.',
      'No source passage is validated and no product/source identity is verified by this module.']};
}
