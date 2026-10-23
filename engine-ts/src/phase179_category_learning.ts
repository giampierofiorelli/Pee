/** Phase179 — evidence-bounded, English-first autonomous CATEGORY RESEARCH COORDINATION.
 * This is a reusable orchestration and knowledge-staging layer over Phases 73–74,
 * 128–129, 172–174 and 169–171, not an independently validated science reader.
 * Source discovery/transport must be supplied through existing trusted ports.
 * No candidate is published as proven causality, eligibility, veto or ranking.
 */
import {createHash} from 'node:crypto';
import {planCategoryCapabilities, type CategoryIdentity} from './category_cognitive_mesh.js';
import {investigateCategory129,stageCategoryObservations129,
 type ObservedDocument129,type LocalCategoryExtractor129,type GrowthBatch129}
 from './phase129_category_growth_cycle.js';
import type {LocalCapabilityWorker,ResearchCycleResult} from './category_research_execution.js';
import type {CategoryBrain128} from './phase128_category_cognition_dialogue_bridge.js';

const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const id=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_]{0,79}$/.test(s);
const sha=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const uniq=(a:readonly string[])=>[...new Set(a)].sort();
const stamp=(v:string)=>Number.isFinite(Date.parse(v))&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v);
export type StudyStream179='user_outcomes'|'equipment_families'|'technical_mechanisms'|
 'observable_performance'|'original_test_methods'|'critical_feasibility'|'contradictions_and_limits'|
 'product_variant_observations'|'independent_user_validation';
export const STREAMS179:readonly StudyStream179[]=[
 'user_outcomes','equipment_families','technical_mechanisms','observable_performance',
 'original_test_methods','critical_feasibility','contradictions_and_limits',
 'product_variant_observations','independent_user_validation'];
export interface StudyTask179{
 stream:StudyStream179;question:string;sourceRoles:readonly string[];
 status:'research_required';authorization:'none';
}
const QUESTIONS:Record<StudyStream179,{question:string;sourceRoles:readonly string[]}>= {
 user_outcomes:{question:'What are authentic English-language goals and problems, including exceptions and non-shopping tasks?',sourceRoles:['user_problem_report']},
 equipment_families:{question:'Which solution technologies can or cannot produce the requested result, under what conditions?',sourceRoles:['original_expert_method','manufacturer_specification']},
 technical_mechanisms:{question:'What physical or functional mechanism connects each need to the outcome, and what can falsify it?',sourceRoles:['original_expert_method','original_product_test']},
 observable_performance:{question:'What quantities or task observations measure success, with units and scope?',sourceRoles:['original_expert_method','original_product_test']},
 original_test_methods:{question:'Which original professional protocols define samples, test conditions and comparable versions?',sourceRoles:['original_expert_method']},
 critical_feasibility:{question:'Which installation, safety and compatibility conditions can make a solution impossible?',sourceRoles:['manufacturer_specification','original_expert_method']},
 contradictions_and_limits:{question:'Where do professional methods, mechanisms or results disagree or lack coverage?',sourceRoles:['original_expert_method','original_product_test']},
 product_variant_observations:{question:'Which exact-model measurements are available with their original variant and protocol?',sourceRoles:['original_product_test','manufacturer_specification']},
 independent_user_validation:{question:'Does the mapping improve critical-need recall and avoid false vetoes on source-disjoint English requests?',sourceRoles:['user_problem_report']}
};
export interface CategoryPlan179{
 phase:179;schemaVersion:'179.1';categoryLabel:string;categoryId:string;
 originalRoute:'known'|'unknown'|'ambiguous'|'needs_clarification';categoryActivation:'existing_reviewed'|'requires_phase129_research'|'clarification_required';
 capabilityTasks:readonly {id:string;capability:string;status:string}[];
 tasks:readonly StudyTask179[];knowledgeVersion:'research_only';
 automaticSourceAccessGuaranteed:false;scientificValidationComplete:false;
 rankingAuthorized:false;hardExclusionsAuthorized:false;
}
export function planCategoryLearning179(args:{label:string;catalog:readonly CategoryIdentity[];asOf:string}):CategoryPlan179{
 if(typeof args.label!=='string'||args.label.length<3||args.label.length>100||
  !/^[a-zA-Z][a-zA-Z0-9 \-\/]*$/.test(args.label)||!stamp(args.asOf)||!Array.isArray(args.catalog))
   throw Error('phase179_invalid_category_input');
 const plan=planCategoryCapabilities(args);
 const categoryId=plan.route.status==='known'?plan.route.identity.categoryId:
  plan.route.status==='unknown'?plan.route.provisionalId:'unresolved';
 return {phase:179,schemaVersion:'179.1',categoryLabel:args.label,categoryId,
  originalRoute:plan.route.status,categoryActivation:plan.route.status==='known'?'existing_reviewed':
   plan.route.status==='unknown'?'requires_phase129_research':'clarification_required',
  capabilityTasks:plan.tasks.map(t=>({id:t.id,capability:t.capability,status:t.status})),
  tasks:STREAMS179.map(stream=>({stream,question:QUESTIONS[stream].question,sourceRoles:[...QUESTIONS[stream].sourceRoles],status:'research_required',authorization:'none'})),
  knowledgeVersion:'research_only',automaticSourceAccessGuaranteed:false,
  scientificValidationComplete:false,rankingAuthorized:false,hardExclusionsAuthorized:false};
}
/** Executes existing local Phase74 workers. A search task with no configured worker
 * remains missing; claiming a plan is NOT claiming autonomous internet access. */
export async function runCategoryInvestigation179(args:{label:string;catalog:readonly CategoryIdentity[];
 asOf:string;workers:readonly LocalCapabilityWorker[];maxTasks?:number}):Promise<{
 plan:CategoryPlan179;execution:ResearchCycleResult;candidateOnly:true;
 canonicalKnowledgeChanged:false;rankingAuthorized:false}>{
 const plan=planCategoryLearning179(args);
 const r=await investigateCategory129(args);
 return {plan,execution:r.research,candidateOnly:true,canonicalKnowledgeChanged:false,rankingAuthorized:false};
}

export interface NeedEdgeSuggestion179{
 categoryId:string;sourceId:string;originalDocumentId:string;
 start:number;end:number;literal:string;
 goalId:string;outcomeId:string;mechanismId:string;observableId:string;
 methodId:string|null;
 /** Declaring an edge is an unverified reader hypothesis, even on a real source. */
 relationType:'suggested_need_to_test_path';
 statedLimits:readonly string[];
}
export interface NeedEdge179{
 edgeId:string;identityHash:string;categoryId:string;
 goalId:string;outcomeId:string;mechanismId:string;observableId:string;methodId:string|null;
 sourceId:string;originalDocumentId:string;documentHash:string;
 anchor:{start:number;end:number;spanSha256:string};statedLimits:readonly string[];
 state:'quarantined_requires_expert_review';sourceTrust:'caller_asserted_not_authenticated';
 causalLinkEstablished:false;methodComparable:false;productMeasurementEstablished:false;
 exclusionAuthorized:false;rankingAuthorized:false;
}
export interface LearningBatch179{
 phase:179;schemaVersion:'179.1';categoryId:string;batchId:string;
 originalDocumentCount:number;candidateEdges:readonly NeedEdge179[];
 rejected:readonly {sourceId:string;reason:string}[];
 reviewQueue:readonly {edgeId:string;question:string}[];
 canonicalGraphUnchanged:true;knowledgeClaimsUnverified:true;
 productRankingsAuthorized:false;hardExclusionsAuthorized:false;
}
const key=(x:NeedEdgeSuggestion179)=>JSON.stringify([x.categoryId,x.goalId,x.outcomeId,x.mechanismId,x.observableId,x.methodId]);
/** Exact-source-span attachment, NOT a semantic entailment check.
 * Caller permissions are not authentication; review cannot be self-issued. */
export function stageNeedEvidence179(args:{categoryId:string;documents:readonly ObservedDocument129[];
 proposals:readonly NeedEdgeSuggestion179[];asOf:string;maxDocuments?:number;maxProposals?:number}):LearningBatch179{
 const maxDocs=args.maxDocuments??12,maxProposals=args.maxProposals??100;
 if(!id(args.categoryId)||!stamp(args.asOf)||!Array.isArray(args.documents)||
  !Array.isArray(args.proposals)||!Number.isSafeInteger(maxDocs)||maxDocs<1||maxDocs>30||
  !Number.isSafeInteger(maxProposals)||maxProposals<1||maxProposals>200||
  args.documents.length>maxDocs||args.proposals.length>maxProposals)
  throw Error('phase179_unbounded_research_input');
 const docs=new Map<string,ObservedDocument129>();
 const rejected:LearningBatch179['rejected'][number][]=[];
 const duplicateIds=new Set<string>();
 for(const d of args.documents){
  const sourceId=d?.source?.id??'unknown';
  const valid=d&&id(sourceId)&&id(d.source.originalDocumentId)&&
   typeof d.source.title==='string'&&d.source.title.trim().length>0&&
   ['original_expert_method','original_product_test','manufacturer_specification','user_problem_report'].includes(d.source.role)&&
   typeof d.source.url==='string'&&/^https:\/\/[a-z\d.-]+(?:[/?#]|$)/i.test(d.source.url)&&
   stamp(d.observedAt)&&Date.parse(d.observedAt)<=Date.parse(args.asOf)&&
   typeof d.text==='string'&&d.text.length>0&&d.text.length<=500000&&
   sha(d.contentSha256)&&hash(d.text)===d.contentSha256&&
   d.permission?.fetchAllowed===true&&d.permission?.factExtractionAllowed===true&&
   d.permission?.publicCitationAllowed===true;
  if(!valid||duplicateIds.has(sourceId)){
   rejected.push({sourceId,reason:'invalid_or_duplicate_document_identity_permission_or_digest'});continue;
  }
  duplicateIds.add(sourceId);docs.set(sourceId,d);
 }
 const seen=new Set<string>(),candidates:NeedEdge179[]=[];
 for(const p of args.proposals){
  const sid=p?.sourceId??'unknown';const d=docs.get(sid);
  if(!d||p.categoryId!==args.categoryId||p.originalDocumentId!==d.source.originalDocumentId||
   p.relationType!=='suggested_need_to_test_path'||
   ![p.goalId,p.outcomeId,p.mechanismId,p.observableId].every(id)||
   (p.methodId!==null&&!id(p.methodId))||
   !Number.isSafeInteger(p.start)||!Number.isSafeInteger(p.end)||p.start<0||
   p.end<=p.start||p.end>d.text.length||p.end-p.start>1200||
   d.text.slice(p.start,p.end)!==p.literal||!p.literal.trim()||
   !Array.isArray(p.statedLimits)||p.statedLimits.length>12||
   p.statedLimits.some((x:string)=>typeof x!=='string'||x.length>300)){
   rejected.push({sourceId:sid,reason:'unanchored_or_ill_typed_need_edge'});continue;
  }
  const identityHash=hash(key(p));
  const edgeId=hash(JSON.stringify([identityHash,sid,d.source.originalDocumentId,d.contentSha256,p.start,p.end]));
  if(seen.has(edgeId)){rejected.push({sourceId:sid,reason:'duplicate_candidate_edge'});continue;}
  seen.add(edgeId);
  candidates.push({edgeId,identityHash,categoryId:p.categoryId,goalId:p.goalId,outcomeId:p.outcomeId,
   mechanismId:p.mechanismId,observableId:p.observableId,methodId:p.methodId,
   sourceId:sid,originalDocumentId:d.source.originalDocumentId,documentHash:d.contentSha256,
   anchor:{start:p.start,end:p.end,spanSha256:hash(p.literal)},statedLimits:uniq(p.statedLimits),
   state:'quarantined_requires_expert_review',sourceTrust:'caller_asserted_not_authenticated',
   causalLinkEstablished:false,methodComparable:false,productMeasurementEstablished:false,
   exclusionAuthorized:false,rankingAuthorized:false});
 }
 candidates.sort((a,b)=>a.edgeId.localeCompare(b.edgeId));
 rejected.sort((a,b)=>a.sourceId.localeCompare(b.sourceId)||a.reason.localeCompare(b.reason));
 const batchIdentity={categoryId:args.categoryId,documentHashes:[...docs.values()].map(d=>[d.source.id,d.contentSha256]).sort(),
  candidateEdges:candidates,rejected};
 return {phase:179,schemaVersion:'179.1',categoryId:args.categoryId,
  batchId:hash(JSON.stringify(batchIdentity)),originalDocumentCount:docs.size,
  candidateEdges:candidates,rejected,
  reviewQueue:candidates.map(e=>({edgeId:e.edgeId,question:`Review causal scope, protocol and alternatives for ${e.goalId} -> ${e.observableId} (${e.originalDocumentId}); verify source independently.`})),
  canonicalGraphUnchanged:true,knowledgeClaimsUnverified:true,
  productRankingsAuthorized:false,hardExclusionsAuthorized:false};
}
/** Same semantic relation from distinct documents is a lead for adjudication,
 * not a vote that proves truth. Conflicting metrics or scopes stay separate. */
export function summarizeResearchGaps179(batch:LearningBatch179):{
 categoryId:string;relationCandidates:number;documentSources:number;
 crossDocumentCandidates:readonly {identityHash:string;documentCount:number;reviewStatus:'independent_review_needed'}[];
 missingMethodCandidates:readonly string[];nextActions:readonly string[];
 proofOfCausality:false;automaticPromotion:false;rankingsAuthorized:false}{
 if(batch?.phase!==179||batch.productRankingsAuthorized!==false||batch.hardExclusionsAuthorized!==false||
 !Array.isArray(batch.candidateEdges)||!sha(batch.batchId))throw Error('phase179_untrusted_research_batch');
 const groups=new Map<string,Set<string>>();
 for(const e of batch.candidateEdges){if(e.state!=='quarantined_requires_expert_review'||
  e.rankingAuthorized!==false||e.exclusionAuthorized!==false||!sha(e.edgeId))throw Error('phase179_unsafe_candidate');
  if(!groups.has(e.identityHash))groups.set(e.identityHash,new Set());groups.get(e.identityHash)!.add(e.originalDocumentId);
 }
 const crossDocumentCandidates=[...groups.entries()].filter(([,v])=>v.size>1)
  .map(([identityHash,v])=>({identityHash,documentCount:v.size,reviewStatus:'independent_review_needed' as const}))
  .sort((a,b)=>a.identityHash.localeCompare(b.identityHash));
 const missingMethodCandidates=uniq(batch.candidateEdges.filter(e=>e.methodId===null).map(e=>e.edgeId));
 const nextActions=uniq([
  ...(batch.candidateEdges.length?['authenticate_original_documents','independent_domain_edge_review','test_protocol_units_conditions_and_variants']:['collect_permitted_original_category_sources']),
  ...(missingMethodCandidates.length?['find_original_comparable_test_methods']:[]),
  'build_source_disjoint_english_need_validation_set','evaluate_false_hard_constraints_and_abstention']);
 return {categoryId:batch.categoryId,relationCandidates:batch.candidateEdges.length,
  documentSources:batch.originalDocumentCount,crossDocumentCandidates,missingMethodCandidates,nextActions,
  proofOfCausality:false,automaticPromotion:false,rankingsAuthorized:false};
}
/** Delegate category concept staging to the tested Phase129 engine; do not fork
 * an incompatible category ontology or bypass its review process. */
export async function stageExistingCategoryConcepts179(args:{brain:CategoryBrain128;
 documents:readonly ObservedDocument129[];extractor:LocalCategoryExtractor129;asOf:string}):Promise<GrowthBatch129>{
 return stageCategoryObservations129(args);
}

/** Durable JSON-serializable research ledger, separate from the reviewed
 * Phase128 category brain. Persisting it does NOT approve its assertions.
 * Hashes detect accidental mutation, not an attacker able to rewrite the ledger. */
export interface ResearchLedger179{
 phase:179;schemaVersion:'179.1';categoryId:string;revision:number;
 history:readonly {revision:number;batchId:string;edgeIds:readonly string[];previousSnapshotHash:string}[];
 snapshotHash:string;status:'unverified_research_only';
 canonicalKnowledgePublished:false;rankingsAuthorized:false;
}
function ledgerFingerprint179(categoryId:string,revision:number,history:ResearchLedger179['history']):string{
 return hash(JSON.stringify({schema:'179.1',categoryId,revision,history}));
}
export function openResearchLedger179(categoryId:string):ResearchLedger179{
 if(!id(categoryId))throw Error('phase179_invalid_ledger_category');
 return {phase:179,schemaVersion:'179.1',categoryId,revision:0,history:[],
  snapshotHash:ledgerFingerprint179(categoryId,0,[]),status:'unverified_research_only',
  canonicalKnowledgePublished:false,rankingsAuthorized:false};
}
export function appendResearchBatch179(args:{ledger:ResearchLedger179;batch:LearningBatch179;
 expectedRevision:number;expectedSnapshotHash:string}):ResearchLedger179{
 const {ledger,batch}=args;
 if(!ledger||ledger.phase!==179||ledger.schemaVersion!=='179.1'||!id(ledger.categoryId)||
  !Number.isSafeInteger(ledger.revision)||ledger.revision<0||!Array.isArray(ledger.history)||
  ledger.history.length!==ledger.revision||ledger.revision>10000||
  ledger.status!=='unverified_research_only'||ledger.canonicalKnowledgePublished!==false||
  ledger.rankingsAuthorized!==false||
  ledger.snapshotHash!==ledgerFingerprint179(ledger.categoryId,ledger.revision,ledger.history)||
  ledger.history.some((h,i)=>!h||h.revision!==i+1||!sha(h.batchId)||
   !Array.isArray(h.edgeIds)||h.edgeIds.some((e:string)=>!sha(e))||!sha(h.previousSnapshotHash)||
   (i===0?h.previousSnapshotHash!==ledgerFingerprint179(ledger.categoryId,0,[]):
    h.previousSnapshotHash!==ledgerFingerprint179(ledger.categoryId,i,ledger.history.slice(0,i)))))
  throw Error('phase179_corrupt_or_untrusted_ledger');
 if(args.expectedRevision!==ledger.revision||args.expectedSnapshotHash!==ledger.snapshotHash)
  throw Error('phase179_stale_research_ledger');
 if(batch?.phase!==179||batch.schemaVersion!=='179.1'||batch.categoryId!==ledger.categoryId||
  batch.productRankingsAuthorized!==false||batch.hardExclusionsAuthorized!==false||
  batch.canonicalGraphUnchanged!==true||!sha(batch.batchId)||
  !Array.isArray(batch.candidateEdges)||batch.candidateEdges.some(e=>e.rankingAuthorized!==false||
   e.exclusionAuthorized!==false||e.state!=='quarantined_requires_expert_review'||!sha(e.edgeId)))
  throw Error('phase179_untrusted_research_batch');
 if(ledger.history.some(h=>h.batchId===batch.batchId))return {...ledger,history:ledger.history.map(h=>({...h,edgeIds:[...h.edgeIds]}))};
 if(ledger.revision>=10000)throw Error('phase179_research_ledger_full');
 const history=[...ledger.history.map(h=>({...h,edgeIds:[...h.edgeIds]})),
  {revision:ledger.revision+1,batchId:batch.batchId,
   edgeIds:uniq(batch.candidateEdges.map(x=>x.edgeId)),previousSnapshotHash:ledger.snapshotHash}];
 return {...ledger,revision:ledger.revision+1,history,
  snapshotHash:ledgerFingerprint179(ledger.categoryId,ledger.revision+1,history)};
}
