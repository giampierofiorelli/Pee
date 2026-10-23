/** Phase 74 — bounded capability execution for both category cold starts and
 * previously reviewed category maintenance. All outputs remain research-only.
 * Work being executed is DISTINCT from receiving an authenticated approval.
 */
import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
import {planCategoryCapabilities,createCategoryInvestigationDossier,
 type CognitiveTask,type CategoryIdentity,type Capability,type CapabilityCompletionReceipt,
 type InitialCategoryQuestion,type CategoryInvestigationDossier,type CategoryTaskPlan}
 from './category_cognitive_mesh.js';
import {acquireColdStartCategoryEvidence,type ColdStartSource,
 type ColdStartAcquisitionResult} from './category_cold_start_intake.js';
import type {LocalSemanticAdapter} from './phase72_semantic_intake.js';
import type {SourceTransport} from './approved_web_reader.js';
import type {KnownWebEvidence} from './web_evidence_acquisition.js';
const sha=(v:string)=>createHash('sha256').update(v).digest('hex');
const validId=(s:unknown)=>typeof s==='string'&&/^[a-z][a-z0-9_]{0,119}$/.test(s);
const validSha=(s:unknown)=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
const stamp=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&
 /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v);
function safeUrl(v:unknown):boolean{
 try{if(typeof v!=='string'||v.length>1500)return false;
  const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&isIP(u.hostname)===0&&
   (!u.port||u.port==='443')&&u.hostname.includes('.')&&
   !/(?:^|\.)(?:localhost|internal|test|invalid|example)$/.test(u.hostname);
 }catch{return false;}
}
export interface TaskSourceReference {
  referenceId:string;sourceId:string;url:string;
  /** Digest of an independently discovered primary-source document; not verified truth. */
  contentSha256:string;observedAt:string;
}
export interface LocalResearchWorkProduct {
  outcome:'research_material_collected'|'no_sufficient_material';
  sourceReferences:readonly TaskSourceReference[];
  questions:readonly InitialCategoryQuestion[];
  /** Machine-readable controlled reason, NOT article text. */
  reasonCode:string;
}
export interface LocalCapabilityWorker {
  execution:'local_only';
  capability:Capability;
  /** Untrusted findings. Tool implementations must not send source bytes to
   * a remote provider, log them, or archive them without separate authorization. */
  run(task:Readonly<CognitiveTask>,asOf:string):Promise<LocalResearchWorkProduct>;
}
export interface ExecutedCapability {
  taskId:string;capability:Capability;
  status:'executed_pending_independent_review'|'no_verified_references'|
   'missing_local_worker'|'worker_rejected'|'waiting_for_independent_review';
  referenceIds:string[];workProductSha256:string|null;questionCount:number;
  independentReviewNeeded:true;
}
export interface ResearchCycleResult {
  purpose:'category_research_executed_not_verified';
  plan:CategoryTaskPlan;
  outcomes:ExecutedCapability[];
  researchDossier:CategoryInvestigationDossier|null;
  actualWorkExecuted:boolean;
  completionReceiptsIssued:0;
  noArticleTextRetained:true;
  publicationReady:false;rankingEligible:false;
}
function sanitizeWorkProduct(p:LocalResearchWorkProduct,task:CognitiveTask,asOf:string):{
 references:TaskSourceReference[];questions:InitialCategoryQuestion[];outcome:LocalResearchWorkProduct['outcome'];reasonCode:string;
}{
 if(!p||!['research_material_collected','no_sufficient_material'].includes(p.outcome)||
   !validId(p.reasonCode)||!Array.isArray(p.sourceReferences)||p.sourceReferences.length>20||
   !Array.isArray(p.questions)||p.questions.length>25||
   p.questions.length>0&&p.outcome!=='research_material_collected')throw Error('Invalid research work product');
 const seen=new Set<string>();
 const references:TaskSourceReference[]=[];
 for(const r of p.sourceReferences){
   if(!r||!validId(r.referenceId)||seen.has(r.referenceId)||!validId(r.sourceId)||
     !safeUrl(r.url)||!validSha(r.contentSha256)||!stamp(r.observedAt)||
     Date.parse(r.observedAt)>Date.parse(asOf))throw Error('Untrusted source reference');
   seen.add(r.referenceId);
   references.push({referenceId:r.referenceId,sourceId:r.sourceId,url:r.url,
    contentSha256:r.contentSha256,observedAt:r.observedAt});
 }
 if(p.outcome==='research_material_collected'&&references.length===0)
  throw Error('Source-free work cannot be marked collected');
 if(p.questions.some(q=>!seen.has(q.reasonReferenceId)))
  throw Error('Unreferenced research question');
 // Create the dossier through the Phase 73 controlled validator below. Only
 // whitelisted fields are returned; any extra tool-returned body is discarded.
 return {references,questions:[...p.questions],outcome:p.outcome,reasonCode:p.reasonCode};
}
export async function executeCategoryResearchCycle(input:{
 label:string;catalog:readonly CategoryIdentity[];asOf:string;
 completionReceipts?:readonly CapabilityCompletionReceipt[];
 workers:readonly LocalCapabilityWorker[];
 /** Previously submitted tasks awaiting independent review. Only suppresses duplicate work. */
 pendingTaskIds?:readonly string[];
 /** Optional research priority selection, never a bypass of dependency gates. */
 onlyTaskIds?:readonly string[];
 maxTasks?:number;
}):Promise<ResearchCycleResult>{
 const max=input.maxTasks??3;
 if(!stamp(input.asOf)||!Number.isInteger(max)||max<0||max>10||
  !Array.isArray(input.workers)||input.workers.length>20||
  (input.pendingTaskIds??[]).length>200||
  (input.onlyTaskIds??[]).length>20||
  (input.onlyTaskIds??[]).some(taskId=>!validId(taskId))||
  new Set(input.onlyTaskIds??[]).size!==(input.onlyTaskIds??[]).length||
  (input.pendingTaskIds??[]).some(taskId=>!validId(taskId))||
  new Set(input.pendingTaskIds??[]).size!==(input.pendingTaskIds??[]).length)throw Error('Invalid execution budget');
 const plan=planCategoryCapabilities({label:input.label,catalog:input.catalog,
  asOf:input.asOf,completionReceipts:input.completionReceipts});
 const only=input.onlyTaskIds?new Set(input.onlyTaskIds):null;
 const ready=plan.tasks.filter(t=>t.status==='ready_for_research'&&(!only||only.has(t.id))).slice(0,max);
 const outcomes:ExecutedCapability[]=[];
 const questions:InitialCategoryQuestion[]=[];
 for(const task of ready){
   const w=input.workers.filter(x=>x.capability===task.capability&&x.execution==='local_only');
   const record:ExecutedCapability={taskId:task.id,capability:task.capability,
    status:'missing_local_worker',referenceIds:[],workProductSha256:null,
    questionCount:0,independentReviewNeeded:true};
   outcomes.push(record);
   if(input.pendingTaskIds?.includes(task.id)){record.status='waiting_for_independent_review';continue;}
   if(w.length!==1)continue;
   try{
    const result=sanitizeWorkProduct(await w[0].run({...task,dependsOn:[...task.dependsOn]},input.asOf),task,input.asOf);
    record.status=result.outcome==='research_material_collected'?'executed_pending_independent_review':'no_verified_references';
    record.referenceIds=result.references.map(r=>r.referenceId).sort();
    record.workProductSha256=sha(JSON.stringify([task.id,result.references,result.questions,result.reasonCode]));
    record.questionCount=result.questions.length;
    questions.push(...result.questions);
   }catch{record.status='worker_rejected';}
 }
 let researchDossier:CategoryInvestigationDossier|null=null;
 const route=plan.route;
 if(route.status==='unknown'&&questions.length){
  // A malformed question is a failed worker, not a reason to promote a schema.
  try{researchDossier=createCategoryInvestigationDossier({categoryId:route.provisionalId,questions});}
  catch{researchDossier=null;for(const record of outcomes)if(record.questionCount>0){
   record.status='worker_rejected';record.questionCount=0;record.workProductSha256=null;record.referenceIds=[];}}
 }
 return {purpose:'category_research_executed_not_verified',plan,outcomes,researchDossier,
  actualWorkExecuted:outcomes.some(r=>r.status==='executed_pending_independent_review'||r.status==='no_verified_references'),
  completionReceiptsIssued:0,noArticleTextRetained:true,publicationReady:false,rankingEligible:false};
}

/** The permission to reach a cold-start SOURCE is narrower than completing
 * arbitrary research tasks. Upstream methodological and rights stages must
 * already have independent receipts; the coordinator cannot mint them. */
export async function executeColdStartEvidenceStage(input:{
 label:string;catalog:readonly CategoryIdentity[];asOf:string;
 completionReceipts:readonly CapabilityCompletionReceipt[];
 sources:readonly ColdStartSource[];adapter:LocalSemanticAdapter;
 transport?:SourceTransport;existing?:readonly KnownWebEvidence[];
}):Promise<{status:'blocked_by_research_dependencies'|'evidence_quarantined';
 evidence:ColdStartAcquisitionResult|null;unmetDependencies:string[];
 publicationReady:false;rankingEligible:false}>{
 const plan=planCategoryCapabilities({label:input.label,catalog:input.catalog,
  asOf:input.asOf,completionReceipts:input.completionReceipts});
 const task=plan.tasks.find(t=>t.capability==='source_acquisition');
 if(plan.route.status!=='unknown'||task?.status!=='ready_for_research'){
  return {status:'blocked_by_research_dependencies',evidence:null,
   unmetDependencies:plan.tasks.filter(t=>t.capability==='source_acquisition'||
      t.status==='awaiting_dependencies').map(t=>t.capability),publicationReady:false,rankingEligible:false};
 }
 const evidence=await acquireColdStartCategoryEvidence({categoryId:plan.route.provisionalId,
  asOf:input.asOf,sources:input.sources,adapter:input.adapter,
  transport:input.transport,existing:input.existing});
 return {status:'evidence_quarantined',evidence,unmetDependencies:[],
  publicationReady:false,rankingEligible:false};
}
