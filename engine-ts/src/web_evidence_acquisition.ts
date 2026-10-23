/**
 * Phase 68 — rights-aware, incremental web evidence research planner.
 * RESEARCH ONLY. Discovery/browser/AI tools are injected by the caller; this
 * module makes NO network requests and confers NO legal permission.
 * Never import from the launch entrypoint. Never rank on this output.
 */
import {createHash} from 'node:crypto';
import {isIP} from 'node:net';

export type WebEvidenceOperation =
  'metadata_discovery' | 'page_retrieval' | 'local_analysis' |
  'remote_ai_transfer' | 'fact_storage' | 'excerpt_storage' |
  'public_citation' | 'derived_publication';
export type WebEvidenceBasis = 'written_permission' | 'verified_open_licence' |
  'reviewed_statutory_exception' | 'unknown' | 'refused';
export interface WebSourcePolicy {
  sourceId:string;
  /** Only the exact HTTPS host is allowed; no wildcard or inherited subdomain permission. */
  host:string;
  basis:WebEvidenceBasis;
  rightsDocumentId:string|null;
  rightsDocumentUrl:string|null;
  reviewedBy:string|null;
  reviewedAt:string|null;
  validUntil:string|null;
  permittedOperations:readonly WebEvidenceOperation[];
  /** Technical crawling constraints: not a grant of copyright permission. */
  robots:'allowed'|'disallowed'|'unknown';
  robotsCheckedAt:string|null;
  websiteTerms:'reviewed_permitted'|'reviewed_prohibited'|'unknown';
  termsCheckedAt:string|null;
  /** Separately attested; not verifiable merely from these fields. */
  commercialUseReviewed:boolean;
}
export type PublicationKind='original_professional_test'|'original_lab_data'|
  'original_editorial_assessment'|'syndicated_report'|'manufacturer_technical_document';
export interface WebCandidate {
  id:string;
  sourceId:string;
  url:string;
  exactVariantId:string;
  /** Null means original-test identity still requires investigation. */
  originalTestId:string|null;
  /** Editor-attested original-test identity. Merely supplying this string does not authenticate the attestation. */
  lineageAttestationReference:string|null;
  kind:PublicationKind;
  publishedAt:string|null;
  updatedAt:string|null;
  /** Claimed from discovery, NOT verified from source content. */
  metadataOrigin:'publisher_feed'|'search_result'|'human_supplied';
}
export interface KnownWebEvidence {
  canonicalUrl:string;
  exactVariantId:string;
  originalTestId:string|null;
  lastMetadataCheckedAt:string;
  lastPageCheckedAt:string|null;
  lastObservedUpdatedAt:string|null;
  fingerprintSha256:string|null;
  /** Quarantined records are never reused as approved research conclusions. */
  reviewStatus:'quarantined_unreviewed'|'approved_for_internal_reuse';
}
export interface EvidenceResearchRequest {
  exactVariantId:string;
  userQuestion:string;
  asOf:string;
  /** Policy decision set by editorial team; no automatic freshness guarantee. */
  maxDaysSinceCheck:number;
  /** Limited to original professional/lab evidence + technical declarations. */
  candidates:readonly WebCandidate[];
  existing:readonly KnownWebEvidence[];
  policies:readonly WebSourcePolicy[];
}
export type QueueAction='retrieve_for_research'|'metadata_only'|'reuse_existing'|
  'skip_duplicate_report'|'reject_mismatch'|'reject_source';
export interface EvidenceQueueItem {
  candidateId:string;
  canonicalUrl:string|null;
  originalTestId:string|null;
  action:QueueAction;
  reasons:string[];
  /** Exactly what is authorized and scheduled; never imply rights from a URL or robots.txt. */
  plannedOperations:WebEvidenceOperation[];
  lastCheckedAt:string|null;
}
export interface EvidenceAcquisitionPlan {
  purpose:'web_evidence_research_only';
  approvalBySoftware:false;
  rankingEligible:false;
  publicationReady:false;
  asOf:string;
  exactVariantId:string;
  items:EvidenceQueueItem[];
  warnings:string[];
}

const ALL:readonly WebEvidenceOperation[]=[
 'metadata_discovery','page_retrieval','local_analysis','remote_ai_transfer',
 'fact_storage','excerpt_storage','public_citation','derived_publication'];
const blockedWords=/(?:amazon|affiliate|retailer|merchant|commission|sponsor|price|deal)/i;
const validId=(v:unknown):v is string=>typeof v==='string'&&v.length<=140&&/^[a-z][a-z0-9_]*$/.test(v)&&!blockedWords.test(v);
const parseTime=(v:unknown):number=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v) ? Date.parse(v) : NaN;
const validTime=(v:unknown)=>Number.isFinite(parseTime(v));
const shaOk=(v:unknown)=>v===null||(typeof v==='string'&&/^[0-9a-f]{64}$/.test(v));
const canonicalUrl=(raw:string):string|null=>{
 try {
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||
    !/^[a-z0-9.-]+$/.test(u.hostname)||isIP(u.hostname)!==0||
    !u.hostname.includes('.')||u.hostname.endsWith('.')||
    /(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(u.hostname)||
    /(?:^|\.)(?:amazon|amzn)\./i.test(u.hostname))return null;
  u.hash='';
  for(const key of [...u.searchParams.keys()])if(/^(?:utm_.+|gclid|fbclid|mc_cid|mc_eid)$/i.test(key))u.searchParams.delete(key);
  u.searchParams.sort();
  return u.toString();
 } catch {return null;}
};
const days=(n:number)=>n*86400000;
const recently=(v:string|null,asOf:number,ageDays:number)=>v!==null&&validTime(v)&&parseTime(v)<=asOf&&asOf-parseTime(v)<=days(ageDays);
const isFuture=(v:string|null,asOf:number)=>v!==null&&validTime(v)&&parseTime(v)>asOf;
const provenanceProblem=(candidate:WebCandidate,asOf:number)=>{
 if(!validId(candidate.id)||!validId(candidate.sourceId)||!validId(candidate.exactVariantId)||
   (candidate.originalTestId!==null&&!validId(candidate.originalTestId))||
   (candidate.lineageAttestationReference!==null&&(typeof candidate.lineageAttestationReference!=='string'||candidate.lineageAttestationReference.length>400||candidate.lineageAttestationReference.trim().length<8))||
   !['original_professional_test','original_lab_data','original_editorial_assessment','syndicated_report','manufacturer_technical_document'].includes(candidate.kind)||
   !['publisher_feed','search_result','human_supplied'].includes(candidate.metadataOrigin)||
   [candidate.publishedAt,candidate.updatedAt].some(x=>x!==null&&(!validTime(x)||isFuture(x,asOf))))return true;
 return false;
};
function rightsFor(p:WebSourcePolicy|undefined,url:string,now:number):{allowed:boolean;reasons:string[]} {
 const issues:string[]=[];
 if(!p)return {allowed:false,reasons:['no_source_policy']};
 if(!validId(p.sourceId)||!url||p.host!==new URL(url).hostname||!canonicalUrl(`https://${p.host}/`))issues.push('source_host_or_identity_mismatch');
 if(!['written_permission','verified_open_licence','reviewed_statutory_exception'].includes(p.basis)||
   !p.commercialUseReviewed)issues.push('rights_basis_not_cleared_for_commercial_use');
 if(!p.rightsDocumentId?.trim()||!p.rightsDocumentUrl||!canonicalUrl(p.rightsDocumentUrl)||
    !p.reviewedBy?.trim()||!validTime(p.reviewedAt)||!validTime(p.validUntil)||
    parseTime(p.reviewedAt)>now||parseTime(p.validUntil)<now)issues.push('missing_or_expired_rights_review');
 if(!Array.isArray(p.permittedOperations)||p.permittedOperations.some(o=>!ALL.includes(o))||
    new Set(p.permittedOperations).size!==p.permittedOperations.length)issues.push('invalid_operation_registry');
 if(p.robots==='disallowed')issues.push('robots_disallow');
 else if(p.robots!=='allowed'||!recently(p.robotsCheckedAt,now,1))issues.push('robots_unverified_or_stale');
 if(p.websiteTerms==='reviewed_prohibited')issues.push('terms_prohibit');
 else if(p.websiteTerms!=='reviewed_permitted'||!recently(p.termsCheckedAt,now,30))issues.push('terms_unverified_or_stale');
 return {allowed:issues.length===0,reasons:issues};
}
const researchOperations:WebEvidenceOperation[]=['page_retrieval','local_analysis'];
/** Only plans work; caller must independently recheck permissions & robots before IO. */
export function planWebEvidenceAcquisition(input:EvidenceResearchRequest):EvidenceAcquisitionPlan {
 if(!validId(input.exactVariantId)||!validTime(input.asOf)||!input.userQuestion?.trim()||input.userQuestion.length>1000||
   blockedWords.test(input.userQuestion)||!Number.isInteger(input.maxDaysSinceCheck)||
   input.maxDaysSinceCheck<1||input.maxDaysSinceCheck>365||
   input.candidates.length>200||input.existing.length>10000||input.policies.length>1000)throw Error('Invalid or unbounded research request');
 const now=parseTime(input.asOf);
 const seenCandidateIds=new Set<string>(),seenOriginal=new Set<string>();
 const policyCounts=new Map<string,number>();
 for(const p of input.policies)policyCounts.set(p.sourceId,(policyCounts.get(p.sourceId)||0)+1);
 const existingMap=new Map(input.existing.map(x=>[canonicalUrl(x.canonicalUrl)||'',x]));
 const existingCounts=new Map<string,number>();
 for(const e of input.existing){const k=canonicalUrl(e.canonicalUrl)||'';existingCounts.set(k,(existingCounts.get(k)||0)+1);}
 const warnings:string[]=[];
 const items=input.candidates.map(c=>{
  const u=canonicalUrl(c.url);
  const v:EvidenceQueueItem={candidateId:c.id,canonicalUrl:u,originalTestId:c.originalTestId,
    action:'reject_source',reasons:[],plannedOperations:[],lastCheckedAt:null};
  if(provenanceProblem(c,now)||seenCandidateIds.has(c.id)||!u){v.reasons=['invalid_or_duplicate_candidate'];return v;}
  seenCandidateIds.add(c.id);
  if(c.exactVariantId!==input.exactVariantId){v.action='reject_mismatch';v.reasons=['exact_variant_mismatch'];return v;}
  if(c.kind==='syndicated_report'){
   v.action='skip_duplicate_report';v.reasons=['secondary_report_not_independent_original_test'];return v;
  }
  const dedupKey=c.originalTestId&&c.lineageAttestationReference ? `${c.originalTestId}|${c.lineageAttestationReference}` : null;
  if(dedupKey && seenOriginal.has(dedupKey)){
   v.action='skip_duplicate_report';v.reasons=['original_test_already_in_queue'];return v;
  }
  const p=input.policies.find(x=>x.sourceId===c.sourceId);
  if(policyCounts.get(c.sourceId)!==1){v.action='metadata_only';v.reasons=['missing_or_ambiguous_source_policy'];return v;}
  const r=rightsFor(p,u,now);
  if(!r.allowed){v.action='metadata_only';v.reasons=r.reasons;return v;}
  if(!p!.permittedOperations.includes('metadata_discovery')){
    v.action='metadata_only';v.reasons=['metadata_discovery_not_authorized'];return v;
  }
  const known=existingMap.get(u);
  if((existingCounts.get(u)||0)>1){v.action='metadata_only';v.reasons=['duplicate_stored_url_records'];return v;}
  if(known){
   if(known.exactVariantId!==c.exactVariantId||known.originalTestId!==c.originalTestId||
     !validTime(known.lastMetadataCheckedAt)||
     (known.lastPageCheckedAt!==null&&!validTime(known.lastPageCheckedAt))||
     !shaOk(known.fingerprintSha256)||
     !['quarantined_unreviewed','approved_for_internal_reuse'].includes(known.reviewStatus)){
     v.action='metadata_only';v.reasons=['existing_record_identity_or_integrity_conflict'];return v;
   }
   v.lastCheckedAt=known.lastPageCheckedAt;
   if(known.reviewStatus!=='approved_for_internal_reuse'){
     v.action='metadata_only';v.reasons=['existing_record_requires_human_review'];return v;
   }
   const updated=c.updatedAt??c.publishedAt;
   const updateKnown=updated!==null&&(!known.lastObservedUpdatedAt||!validTime(known.lastObservedUpdatedAt)||parseTime(updated)>parseTime(known.lastObservedUpdatedAt));
   if(!updateKnown&&recently(known.lastPageCheckedAt,now,input.maxDaysSinceCheck)){
    v.action='reuse_existing';v.reasons=['unchanged_metadata_and_recent_content_check'];
    if(dedupKey)seenOriginal.add(dedupKey);return v;
   }
  }
  if(researchOperations.some(op=>!p!.permittedOperations.includes(op))){
   v.action='metadata_only';v.reasons=['full_retrieval_or_local_analysis_not_authorized'];return v;
  }
  v.action='retrieve_for_research';v.plannedOperations=[...researchOperations];
  if(dedupKey)seenOriginal.add(dedupKey);
  v.reasons=[known?'new_revision_or_refresh_due':'first_research_retrieval'];
  return v;
 });
 if(items.some(i=>i.action==='retrieve_for_research'))warnings.push('Permissions, anti-bot rules, redirects, remote-model routing and source authenticity require fresh checks at execution.');
 warnings.push('Automated browsing plans are not legal clearance; no review content, measured facts, rankings or conclusions are stored here.');
 return {purpose:'web_evidence_research_only',approvalBySoftware:false,rankingEligible:false,
   publicationReady:false,asOf:input.asOf,exactVariantId:input.exactVariantId,items,warnings};
}

export interface EvidenceProcessingResult {
 status:'quarantined_human_method_and_rights_review'|'blocked';
 sourceUrl:string;
 contentSha256:string|null;
 observationDigests:{criterionId:string;valueTextSha256:string;anchorSha256:string}[];
 originalTestId:string|null;
 exactVariantId:string;
 citations:string[];
 reasons:string[];
 rankingEligible:false;
 publicationReady:false;
}
/**
 * Verified content is transient in memory; neither page text nor quotes are returned.
 * Only candidate hashes survive. It still requires later human/source review and cannot rank.
 */
export function quarantineRetrievedEvidence(input:{
 plan:EvidenceAcquisitionPlan;
 queueItem:EvidenceQueueItem;
 candidate:WebCandidate;
 policy:WebSourcePolicy;
 retrieved:{finalUrl:string;body:string;httpStatus:number;contentType:string};
 claims:readonly {criterionId:string;valueText:string;anchorText:string}[];
}):EvidenceProcessingResult {
 const {plan,queueItem,candidate,policy,retrieved,claims}=input;
 const out:EvidenceProcessingResult={status:'blocked',sourceUrl:candidate.url,contentSha256:null,
   observationDigests:[],originalTestId:candidate.originalTestId,exactVariantId:candidate.exactVariantId,
   citations:[],reasons:[],rankingEligible:false,publicationReady:false};
 const source=canonicalUrl(candidate.url);
 if(!source||queueItem.action!=='retrieve_for_research'||queueItem.canonicalUrl!==source||
    queueItem.candidateId!==candidate.id||plan.exactVariantId!==candidate.exactVariantId||
    policy.sourceId!==candidate.sourceId||
    !rightsFor(policy,source,parseTime(plan.asOf)).allowed||
    researchOperations.some(op=>!policy.permittedOperations.includes(op))){out.reasons.push('plan_or_policy_mismatch');return out;}
 if(canonicalUrl(retrieved.finalUrl)!==source||retrieved.httpStatus!==200||
    !/^text\/(?:html|plain)(?:;|$)/i.test(retrieved.contentType)||
    typeof retrieved.body!=='string'||retrieved.body.length<10||retrieved.body.length>1_000_000){
    out.reasons.push('response_url_status_type_or_size_not_allowed');return out;
 }
 if(!policy.permittedOperations.includes('fact_storage')||!policy.permittedOperations.includes('public_citation')){
   out.reasons.push('fact_digest_storage_or_citation_not_authorized');return out;
 }
 if(claims.length>50){out.reasons.push('unbounded_candidate_claims');return out;}
 for(const claim of claims){
  if(!validId(claim.criterionId)||typeof claim.valueText!=='string'||claim.valueText.length<1||claim.valueText.length>500||
     (claim.valueText.length<3&&!/^-?\d+(?:\.\d+)?$/.test(claim.valueText))||
     typeof claim.anchorText!=='string'||claim.anchorText.length<10||claim.anchorText.length>300||
     !retrieved.body.includes(claim.anchorText)||
     (claim.valueText.length<3&&!new RegExp('(?:^|[^0-9.])'+claim.valueText.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:$|[^0-9.])').test(claim.anchorText))){
    out.reasons.push('claim_not_syntactically_anchored');return out;
  }
 }
 const digest=(t:string)=>createHash('sha256').update(t).digest('hex');
 out.contentSha256=digest(retrieved.body);
 out.observationDigests=claims.map(c=>({criterionId:c.criterionId,valueTextSha256:digest(c.valueText),anchorSha256:digest(c.anchorText)}));
 out.citations=[source];out.status='quarantined_human_method_and_rights_review';
 out.reasons=['hashes_only','anchor_match_is_not_truth_or_method_validation',
   'source_independence_variant_rights_and_claims_require_human_verification'];
 return out;
}
