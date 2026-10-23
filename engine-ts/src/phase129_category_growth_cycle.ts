/** Phase129 — bounded source-backed category discovery -> evidence quarantine ->
 * independent review -> Phase128 category memory -> query interpretation.
 * No third-party LLM, autonomous browsing permission, claims of source truth, or
 * ranking authority. A local extractor may propose candidate concepts only.
 */
import {createHash} from 'node:crypto';
import {executeCategoryResearchCycle,type LocalCapabilityWorker,type ResearchCycleResult}
 from './category_research_execution.js';
import {planCategoryCapabilities,type CategoryIdentity,type CapabilityCompletionReceipt}
 from './category_cognitive_mesh.js';
import {validateBrain128,quarantineDiscovery128,promoteDiscovery128,
 compileCategoryKnowledge128,interpretFromBrain128,
 type SourceRef128,type CategoryBrain128,type Discovery128,type QuarantinedDiscovery128,
 type Review128,type Concept128}
 from './phase128_category_cognition_dialogue_bridge.js';
import type {DialogueState125} from './phase125_compositional_dialogue_frame.js';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const id=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_]{0,79}$/.test(s);
const stamp=(s:unknown):s is string=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s));
const sort=(a:readonly string[])=>[...new Set(a)].sort();

export interface ObservedDocument129 {
 source:SourceRef128;
 /** Raw original source accessible only during the immediate local extraction call. */
 text:string; contentSha256:string; observedAt:string;
 permission:{fetchAllowed:boolean;factExtractionAllowed:boolean;publicCitationAllowed:boolean};
 /** Attestations must be checked by the caller; flags are not legal authorization. */
}
export interface ConceptSuggestion129 {
 concept:Omit<Concept128,'state'|'review'>;
 sourceId:string;originalDocumentId:string;
 /** Precise source span, rather than a claim justified by the source's topic. */
 start:number;end:number;literal:string;
}
export interface LocalCategoryExtractor129 {
 execution:'local_only';
 propose(document:Readonly<{source:SourceRef128;text:string}>):Promise<readonly ConceptSuggestion129[]>;
}
export interface StagedClaim129 {
 discovery:QuarantinedDiscovery128;
 sourceId:string;originalDocumentId:string;
 sourceContentSha256:string;spanSha256:string;
 /** No full source text or quotation is persisted in this object. */
 start:number;end:number;
}
export interface GrowthBatch129 {
 state:'quarantined_not_canonical';categoryId:string;baseOntologySnapshot:string;
 /** Sources are registered only in an EPHEMERAL brain during staging. */
 pendingSources:SourceRef128[];claims:StagedClaim129[];
 rejected:{sourceId:string;reason:string}[];
 batchId:string;sourceBodiesRetained:false;reviewNeeded:true;
 rankingAuthorized:false;
}
function validateSource129(s:SourceRef128):void{
 if(!s||!id(s.id)||!id(s.originalDocumentId)||typeof s.title!=='string'||!s.title.trim()||
  !/^https:\/\/[a-z0-9]/i.test(s.url)||!['original_expert_method','original_product_test','manufacturer_specification','user_problem_report'].includes(s.role))
  throw Error('invalid_source_metadata');
}
function ephemeralBrain129(brain:CategoryBrain128,batchSources:readonly SourceRef128[]):CategoryBrain128{
 const previous=new Map(brain.sources.map(s=>[s.id,s]));
 for(const source of batchSources){
  const old=previous.get(source.id);
  if(old&&JSON.stringify(old)!==JSON.stringify(source))throw Error('source_identity_collision');
  previous.set(source.id,source);
 }
 const result={...brain,sources:[...previous.values()].sort((a,b)=>a.id.localeCompare(b.id))};
 validateBrain128(result);
 return result;
}
function payload129(batch:Omit<GrowthBatch129,'batchId'>){
 return {categoryId:batch.categoryId,baseOntologySnapshot:batch.baseOntologySnapshot,
  pendingSources:batch.pendingSources,claims:batch.claims,rejected:batch.rejected};
}
/** Explicitly executes existing Phase74 local research workers, respecting Phase73
 * dependency gates. A new category is never automatically created as canonical. */
export async function investigateCategory129(args:{
 label:string;catalog:readonly CategoryIdentity[];asOf:string;
 workers:readonly LocalCapabilityWorker[];receipts?:readonly CapabilityCompletionReceipt[];
 maxTasks?:number;
}):Promise<{research:ResearchCycleResult;phase:129;canonicalChanges:0;needsReview:true;rankingAuthorized:false}>{
 const research=await executeCategoryResearchCycle({label:args.label,catalog:args.catalog,
  asOf:args.asOf,workers:args.workers,completionReceipts:args.receipts,maxTasks:args.maxTasks??3});
 return {phase:129,research,canonicalChanges:0,needsReview:true,rankingAuthorized:false};
}
/** Category-specific suggestions are supplied by a *local* model/algorithm. The
 * controller verifies exact source spans and records candidate definitions; it
 * does NOT infer that a source is true or that a concept is beneficial. */
export async function stageCategoryObservations129(args:{brain:CategoryBrain128;
 documents:readonly ObservedDocument129[];extractor:LocalCategoryExtractor129;
 asOf:string;maxDocuments?:number;maxClaims?:number}):Promise<GrowthBatch129>{
 validateBrain128(args.brain);
 if(args.extractor?.execution!=='local_only'||!stamp(args.asOf)||
  !Array.isArray(args.documents)||args.documents.length>(args.maxDocuments??8)||
  !Number.isInteger(args.maxDocuments??8)||(args.maxDocuments??8)<1||
  !Number.isInteger(args.maxClaims??40)||(args.maxClaims??40)<1||(args.maxClaims??40)>200)
  throw Error('invalid_local_research_bounds');
 const oldSnapshot=compileCategoryKnowledge128(args.brain).ontologySnapshot;
 const sources:SourceRef128[]=[];const claims:StagedClaim129[]=[];
 const rejected:GrowthBatch129['rejected']=[];const seenSources=new Set<string>();
 const seenConcepts=new Set(args.brain.concepts.map(c=>c.id));
 const aliases=new Set(args.brain.concepts.filter(c=>c.state==='reviewed_definition')
  .flatMap(c=>c.aliases.map(a=>`${c.kind}:${a.toLowerCase()}`)));
 for(const d of args.documents){
  const sid=d?.source?.id??'unknown';
  if(!d||!d.source||!stamp(d.observedAt)||Date.parse(d.observedAt)>Date.parse(args.asOf)||
   !d.permission?.fetchAllowed||!d.permission?.factExtractionAllowed||!d.permission?.publicCitationAllowed||
   typeof d.text!=='string'||d.text.length>500000||!d.text.length||
   digest(d.text)!==d.contentSha256||seenSources.has(sid)){
   rejected.push({sourceId:sid,reason:'source_not_authorized_or_digest_mismatch'});continue;
  }
  try{validateSource129(d.source);}catch{rejected.push({sourceId:sid,reason:'invalid_source'});continue;}
  seenSources.add(sid);
  // Avoid any replacement of a previously named source or original document.
  if(args.brain.sources.some(s=>s.id===sid&&JSON.stringify(s)!==JSON.stringify(d.source))||
   sources.some(s=>s.originalDocumentId===d.source.originalDocumentId&&s.id!==sid)||
   args.brain.sources.some(s=>s.originalDocumentId===d.source.originalDocumentId&&s.id!==sid)){
   rejected.push({sourceId:sid,reason:'source_identity_collision'});continue;
  }
  const scope=[...sources,d.source];
  let suggestions:readonly ConceptSuggestion129[];
  try{suggestions=await args.extractor.propose({source:d.source,text:d.text});}
  catch{rejected.push({sourceId:sid,reason:'local_extractor_failed'});continue;}
  if(!Array.isArray(suggestions)||suggestions.length>20){
   rejected.push({sourceId:sid,reason:'unbounded_extractor_output'});continue;
  }
  sources.push(d.source);
  for(const c of suggestions){
   if(claims.length>=(args.maxClaims??40)){
    rejected.push({sourceId:sid,reason:'claim_budget_exhausted'});break;
   }
   if(!c||c.sourceId!==sid||c.originalDocumentId!==d.source.originalDocumentId||
    !Number.isSafeInteger(c.start)||!Number.isSafeInteger(c.end)||c.start<0||
    c.end<=c.start||c.end>d.text.length||c.end-c.start>1200||
    d.text.slice(c.start,c.end)!==c.literal||!c.literal.trim()||
    seenConcepts.has(c.concept?.id)||c.concept?.aliases?.some((a:string)=>aliases.has(`${c.concept.kind}:${a.toLowerCase()}`))){
    rejected.push({sourceId:sid,reason:'unanchored_or_duplicate_claim'});continue;
   }
   // Reuse Phase128 semantic/schema guards before considering any review.
   try{
    const scratch=ephemeralBrain129(args.brain,scope);
    const discovery:Discovery128={categoryId:args.brain.categoryId,concept:c.concept,
     suggestedSourceRefIds:[sid],observedDocumentIds:[d.source.originalDocumentId]};
    const staged=quarantineDiscovery128(scratch,discovery);
    // Exact span is an additional gate; source title alone can never justify it.
    claims.push({discovery:staged,sourceId:sid,
     originalDocumentId:d.source.originalDocumentId,
     sourceContentSha256:d.contentSha256,spanSha256:digest(c.literal),start:c.start,end:c.end});
    seenConcepts.add(c.concept.id);
    for(const alias of c.concept.aliases)aliases.add(`${c.concept.kind}:${alias.toLowerCase()}`);
   }catch{rejected.push({sourceId:sid,reason:'invalid_category_concept'});}
  }
 }
 const pendingSources=sources.sort((a,b)=>a.id.localeCompare(b.id));
 claims.sort((a,b)=>a.discovery.discoveryId.localeCompare(b.discovery.discoveryId));
 const rest={state:'quarantined_not_canonical' as const,categoryId:args.brain.categoryId,
  baseOntologySnapshot:oldSnapshot,pendingSources,claims,rejected,
  sourceBodiesRetained:false as const,reviewNeeded:true as const,rankingAuthorized:false as const};
 return {...rest,batchId:digest(JSON.stringify(payload129(rest)))};
}
export interface TrustedReview129 {
 /** Only the trusted application supplies this verifier, never the extractor. */
 verify(receipt:Review128,claim:StagedClaim129):boolean;
}
/** Replays the exact quarantine record against the pinned original category.
 * The resulting brain is a proposed transactional write; the caller's trusted
 * database must commit it atomically and invalidate dependent materializations. */
export function approveGrowth129(args:{brain:CategoryBrain128;batch:GrowthBatch129;
 approvals:readonly {discoveryId:string;receipt:Review128}[];authority:TrustedReview129}):{
 brain:CategoryBrain128;oldSnapshot:string;newSnapshot:string;
 invalidationRequired:boolean;approvedCount:number;rejectedCount:number;
 rankingAuthorized:false;transactionCommitted:false;
}{
 validateBrain128(args.brain);
 const b=args.batch;
 if(b?.state!=='quarantined_not_canonical'||b.categoryId!==args.brain.categoryId||
  b.baseOntologySnapshot!==compileCategoryKnowledge128(args.brain).ontologySnapshot||
  b.batchId!==digest(JSON.stringify(payload129(b)))||
  !Array.isArray(args.approvals)||args.approvals.length>b.claims.length||
  !args.authority||typeof args.authority.verify!=='function')throw Error('stale_or_tampered_growth_batch');
 const selections=new Map<string,Review128>();
 for(const a of args.approvals){
  if(selections.has(a.discoveryId)||!b.claims.some(c=>c.discovery.discoveryId===a.discoveryId))
   throw Error('invalid_review_selection');
  selections.set(a.discoveryId,a.receipt);
 }
 let next=ephemeralBrain129(args.brain,b.pendingSources);
 let count=0;
 for(const c of b.claims){
  const receipt=selections.get(c.discovery.discoveryId);if(!receipt)continue;
  if(!args.authority.verify(receipt,c))throw Error('review_authentication_failed');
  const updated=promoteDiscovery128(next,c.discovery,receipt);
  next=updated.brain;count++;
 }
 // Sources and schema are not changed when nothing was approved.
 if(count===0)next=args.brain;
 const current=compileCategoryKnowledge128(next).ontologySnapshot;
 return {brain:next,oldSnapshot:b.baseOntologySnapshot,newSnapshot:current,
  invalidationRequired:count>0&&current!==b.baseOntologySnapshot,
  approvedCount:count,rejectedCount:b.rejected.length,
  rankingAuthorized:false,transactionCommitted:false};
}
const normalize129=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
/** The Phase125 task/context schema is augmented with a read-only vocabulary
 * observation for reviewed *other* concepts (e.g. metrics). This does not make
 * a new quality metric an assumed user preference or a measured product fact. */
export function interpretAfterGrowth129(brain:CategoryBrain128,question:string,state:DialogueState125={}){
 const res=interpretFromBrain128(brain,question,state);
 const surface=' '+normalize129(question)+' ';
 const references=brain.concepts.filter(c=>c.state==='reviewed_definition')
  .filter(c=>c.aliases.some(a=>(' '+surface).includes(' '+normalize129(a)+' ')))
  .map(c=>({conceptId:c.id,kind:c.kind,evidenceKeys:sort(c.evidenceKeys)}))
  .sort((a,b)=>a.conceptId.localeCompare(b.conceptId));
 return {phase:129,categorySnapshot:res.categorySnapshot,
  frame:res.frame,reviewedConceptMentions:references,
  researchEvidenceKeys:sort([...res.frame.evidenceObligations,...references.flatMap(r=>r.evidenceKeys)]),
  requiredEvidence:res.researchNeeds,rankingAuthorized:false as const};
}
/** Small category-agnostic, auditable pattern observer. Recognizes ONLY explicit
 * names of potential measurement constructs, e.g. "Clean Air Delivery Rate (CADR)".
 * This is not semantic reading: it cannot infer product performance, test
 * validity, measurement direction or whether a metric is actually important.
 */
export function nativeMeasurementNameObserver129():LocalCategoryExtractor129{
 return {execution:'local_only',async propose(document){
  const out:ConceptSuggestion129[]=[];
  const re=/\b([A-Za-z][A-Za-z-]*(?:\s+[A-Za-z][A-Za-z-]*){1,5})\s*\(([A-Z][A-Z0-9-]{1,9})\)/g;
  const metric=/\b(?:rate|rating|score|index|efficiency|reduction|capacity|measurement)\b/i;
  for(const match of document.text.matchAll(re)){
   const abbr=match[2];
   const prefix=match[1];
   const words=prefix.split(/\s+/);
   while(words.length>2&&/^(?:to|the|their|a|an|its|of|for|by|with|as|called|according)$/i.test(words[0]))words.shift();
   const name=words.join(' ');
   if(!metric.test(name))continue;
   const rawId=name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,70);
   if(!id(rawId)||out.some(c=>c.concept.id===rawId))continue;
   const relative=match[0].indexOf(name);
   if(relative<0)continue;
   const start=match.index!+relative,end=match.index!+match[0].length;
   out.push({sourceId:document.source.id,originalDocumentId:document.source.originalDocumentId,
    start,end,literal:document.text.slice(start,end),
    concept:{id:rawId,kind:'outcome',label:name,
     aliases:[name,abbr],evidenceKeys:[rawId]}});
   if(out.length>=10)break;
  }
  return out;
 }};
}
/** Cold-start activation after ALL existing Phase73 research steps have been
 * independently completed. A trusted caller must authenticate every receipt.
 * Creates only a category identity/empty memory. It does not invent criteria. */
export function bootstrapReviewedCategory129(args:{
 label:string;catalog:readonly CategoryIdentity[];asOf:string;
 receipts:readonly CapabilityCompletionReceipt[];
 authenticate:(receipt:CapabilityCompletionReceipt)=>boolean;
}):{identity:CategoryIdentity;brain:CategoryBrain128;
 researchComplete:boolean;rankingAuthorized:false;transactionCommitted:false}{
 if(!args.authenticate||typeof args.authenticate!=='function'||
  !Array.isArray(args.receipts)||args.receipts.length===0)throw Error('missing_trusted_category_review');
 const route=planCategoryCapabilities({label:args.label,catalog:args.catalog,
  asOf:args.asOf,completionReceipts:args.receipts});
 if(route.route.status!=='unknown'||route.tasks.length!==0||
  !args.receipts.every(args.authenticate))throw Error('category_research_or_authentication_incomplete');
 const categoryId=route.route.provisionalId.replace(/^provisional_/,'');
 const identity:CategoryIdentity={categoryId,label:args.label,aliases:[],status:'reviewed',registryVersion:1};
 const brain:CategoryBrain128={categoryId,schemaVersion:1,
  aliases:[args.label],sources:[],concepts:[],quality:[],distinctions:[]};
 validateBrain128(brain);
 return {identity,brain,researchComplete:true,rankingAuthorized:false,transactionCommitted:false};
}
