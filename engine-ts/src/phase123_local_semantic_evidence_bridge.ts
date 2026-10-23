/**
 * Phase123 exploratory bridge: learned/unknown-goal research plan -> locally
 * available rights-reviewed candidate passages, via Phase122 native BM25.
 * A lexical hit never establishes a goal, a measurement, or a model identity.
 * No network/search provider/LLM required. This is NOT web discovery.
 */
import {type ResearchPlan123} from './phase123_native_learned_intent.js';
import {searchInternalPassages122,type IndexedPassage122} from './phase122_native_local_retrieval.js';
import {type ResearchPlan122} from './phase122_native_question_to_research.js';
export interface SemanticHits123 {
 phase:123;purpose:'candidate_passages_for_unresolved_question';
 queryStatus:ResearchPlan123['next'];attemptedQueries:number;
 hits:readonly {passageId:string;sourceUrl:string;sourceIdentity:string;lexicalScore:number}[];
 countOfRightsAssertedPassages:number;
 interpretiveGroundingConfirmed:false;sourceIdentityVerified:false;
 productMeasurementsVerified:false;sourceRightsAuthenticated:false;
 publicRankingAuthorized:false;externalSearchExecuted:false;
 next:'acquire_new_sources'|'independent_semantic_review'|'request_clarification';
}
export function searchLocalGoalCandidates123(plan:ResearchPlan123,
  passages:readonly IndexedPassage122[],topK=5):SemanticHits123{
  if(plan?.phase!==123) {
    throw Error('invalid_phase123_plan');
  }
  if(!Array.isArray(plan.researchQueries)||plan.researchQueries.length>40||
    plan.researchQueries.some(x=>typeof x!=='string'||x.length>4000)||
    plan.publicRankingAuthorized!==false||plan.searchExecuted!==false||
    plan.evidenceVerified!==false)throw Error('invalid_unverified_plan');
  if(!['continue_research','investigate_unknown_goal'].includes(plan.next)){
    return {phase:123,purpose:'candidate_passages_for_unresolved_question',
      queryStatus:plan.next,attemptedQueries:0,hits:[],countOfRightsAssertedPassages:0,
      interpretiveGroundingConfirmed:false,sourceIdentityVerified:false,
      productMeasurementsVerified:false,sourceRightsAuthenticated:false,
      publicRankingAuthorized:false,externalSearchExecuted:false,next:'request_clarification'};
  }
  // Reuse bounded local retrieval. A synthetic Phase122 plan is only a carrier
  // for the raw exploratory query and does not authorize semantic interpretation.
  const proxy:ResearchPlan122={purpose:'phase122_native_question_to_research_proposal',
    questionSha256:plan.sourceTextSha256,intent:{category:'floor_cleaning_robot',
      objective:null,scope:'undecided',mode:'general',queryState:'needs_semantic_review',
      contextUsed:false,protectedNegation:false,evidenceSignals:[],confirmedByUser:false},
    requirements:[],unknowns:[],steps:[{action:'discover_candidates',metric:'product_discovery',
      sourcePriority:'independent_test',rationale:'Find documents that may clarify the unverified meaning',
      queries:plan.researchQueries}],next:'semantic_review',publicRankingAuthorized:false,
    searchExecuted:false,marketExhaustionProven:false,limitations:['synthetic retrieval adapter only']};
  const r=searchInternalPassages122(proxy,passages,topK);
  const hits=r.results[0]?.hits??[];
  return {phase:123,purpose:'candidate_passages_for_unresolved_question',
    queryStatus:plan.next,attemptedQueries:r.queriesAttempted,
    hits,countOfRightsAssertedPassages:r.corpusPassages,
    interpretiveGroundingConfirmed:false,sourceIdentityVerified:false,
    productMeasurementsVerified:false,sourceRightsAuthenticated:false,
    publicRankingAuthorized:false,externalSearchExecuted:false,
    next:hits.length?'independent_semantic_review':'acquire_new_sources'};
}
