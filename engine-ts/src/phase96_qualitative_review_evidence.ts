/**
 * Phase 96 — qualitative original-test evidence, separate from star ratings and
 * numeric lab observations.  Research/quarantine only, not a public ranker.
 *
 * Expert-informed design: criterion-focused opinion extraction (ABSA),
 * context and methods (ISO 9241-11), and dimensions from qualitative evidence
 * synthesis (GRADE-CERQual). This is an ADAPTATION, not validated CERQual scoring.
 */
import {createHash} from 'node:crypto';
import {readApprovedSource,type SourceTransport,type TransientWebClaim} from './approved_web_reader.js';
import {planWebEvidenceAcquisition,type WebCandidate,type WebSourcePolicy} from './web_evidence_acquisition.js';

const hash=(s:string)=>createHash('sha256').update(s,'utf8').digest('hex');
const identifier=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_]{1,100}$/.test(s);
const forbidden=/(?:affiliate|retailer|price|advertisement|sponsorship|commission|merchant|star_rating)/i;
const values=['favourable','unfavourable','mixed','descriptive'] as const;
const bases=['hands_on_observation','test_interpretation','editorial_inference','reported_claim'] as const;
export type OpinionPolarity=typeof values[number];
export type OpinionBasis=typeof bases[number];
export type MethodDimension='documented'|'uncertain'|'concern';
export type QualitativeContext=Record<string,string>;
export interface ReviewedQualitativeFacet {
  categoryId:string;criterionId:string;reviewReference:string;reviewedBy:string;
  /** The category-specific meaning, not an LLM-discovered field. */
  interpretationGuide:string;
}
export interface CandidateQualitativeFinding {
  findingId:string;
  exactVariantId:string;
  criterionId:string;
  /** Source-supported, newly phrased proposition, not an article copy. */
  proposition:string;
  polarity:OpinionPolarity;
  basis:OpinionBasis;
  /** Named circumstances under which the observation was made. */
  context:QualitativeContext;
  /** Exact, transient source string; never saved in returned finding. */
  anchorText:string;
  /** The reviewer must identify test method if applicable. */
  methodologyReference:string|null;
  /** Extra uncertainty/exception detected by the proposer; no numerical weight. */
  qualification:string|null;
}
export interface QuarantinedQualitativeFinding {
  findingId:string;exactVariantId:string;criterionId:string;
  proposition:string;polarity:OpinionPolarity;
  basis:Exclude<OpinionBasis,'reported_claim'>;
  context:QualitativeContext;methodologyReference:string|null;
  qualification:string|null;
  originalTestId:string;sourceUrl:string;sourceSha256:string;
  sourceSpanSha256:string;sourceSpanBytes:number;
  /** Must be checked separately. Software cannot authenticate human review. */
  reviewStatus:'quarantined_for_semantic_method_and_rights_review';
  evidenceKind:'original_professional_qualitative_observation';
  quantifiedMeasurement:false;
  weight:null;numericScore:null;
}
export interface QualitativeIntake {
  purpose:'qualitative_professional_review_research_only';
  status:'blocked'|'quarantined';reasons:string[];
  observations:QuarantinedQualitativeFinding[];
  rawArticleStored:false;localModelCalls:number|null;
  rankingEligible:false;publicationReady:false;
}
const contextValid=(context:unknown):context is QualitativeContext=>!!context&&typeof context==='object'&&!Array.isArray(context)&&
 Object.keys(context).length>0&&Object.keys(context).length<=8&&Object.entries(context).every(([key,val])=>
 identifier(key)&&typeof val==='string'&&val.length>=1&&val.length<=100&&!forbidden.test(val));
const safeProposition=(text:unknown)=>typeof text==='string'&&text.length>=12&&text.length<=400&&
 !/[<>\x00-\x08]/.test(text)&&!forbidden.test(text);
function checkProposal(p:CandidateQualitativeFinding,model:string,facet:ReviewedQualitativeFacet,
 body:string,articleType:'single_product'|'comparison'):void{
 if(!p||!identifier(p.findingId)||p.criterionId!==facet.criterionId||p.exactVariantId!==model||
 !safeProposition(p.proposition)||!values.includes(p.polarity)||!bases.includes(p.basis)||
 p.basis==='reported_claim'||!contextValid(p.context)||
 typeof p.anchorText!=='string'||p.anchorText.length<18||p.anchorText.length>300||
 !body.includes(p.anchorText)||
 (articleType==='comparison'&&!p.anchorText.toLowerCase().includes(model.toLowerCase()))||
 !((p.methodologyReference===null)||(typeof p.methodologyReference==='string'&&
  p.methodologyReference.length>=6&&p.methodologyReference.length<=250))||
 (p.basis==='hands_on_observation'&&!p.methodologyReference)||
 (p.qualification!==null&&(typeof p.qualification!=='string'||p.qualification.length>250)))
  throw Error('ambiguous_unanchored_or_unreviewed_qualitative_proposal');
}
/**
 * The proposer must run locally, with separately authorized processing. It can
 * be a rule-based source adapter, a human annotator or a local language model.
 * It NEVER approves its own output. This function validates and quarantines it.
 */
export async function acquireProfessionalQualitativeEvidence(input:{
 candidate:WebCandidate;policy:WebSourcePolicy;asOf:string;exactModelName:string;
 articleType:'single_product'|'comparison';facet:ReviewedQualitativeFacet;
 proposeFromTransientHtml:(html:string)=>Promise<readonly CandidateQualitativeFinding[]>|readonly CandidateQualitativeFinding[];
 transport?:SourceTransport;
}):Promise<QualitativeIntake>{
 const result:QualitativeIntake={purpose:'qualitative_professional_review_research_only',
  status:'blocked',reasons:[],observations:[],rawArticleStored:false,localModelCalls:null,
  rankingEligible:false,publicationReady:false};
 const {candidate,policy,facet,asOf}=input;
 if(!candidate||!policy||!facet||!identifier(candidate.originalTestId)||
 !candidate.lineageAttestationReference||
 !['original_professional_test','original_editorial_assessment'].includes(candidate.kind)||
 !identifier(candidate.exactVariantId)||!identifier(facet.categoryId)||!identifier(facet.criterionId)||
 !identifier(facet.reviewedBy)||facet.reviewReference?.length<8||facet.interpretationGuide?.length<12||
 typeof input.exactModelName!=='string'||input.exactModelName.length<3||input.exactModelName.length>110||
 !['single_product','comparison'].includes(input.articleType)||
 typeof input.proposeFromTransientHtml!=='function'){
  result.reasons=['unreviewed_source_category_or_model'];return result;
 }
 const plan=planWebEvidenceAcquisition({exactVariantId:candidate.exactVariantId,
  userQuestion:'Acquire direct original professional test observations relevant to a defined product need',
  asOf,maxDaysSinceCheck:7,candidates:[candidate],existing:[],policies:[policy]});
 const item=plan.items[0];
 if(item?.action!=='retrieve_for_research'){
  result.reasons=item?.reasons??['source_not_authorized'];return result;
 }
 let transientProposed:QuarantinedQualitativeFinding[]=[];
 let parseFailure:string|null=null;
 const read=await readApprovedSource({plan,queueItem:item,candidate,policy,checkedAt:asOf,
  transport:input.transport,transientClaimExtractor:async html=>{
   try {
    if(Buffer.byteLength(html,'utf8')>750_000)throw Error('page_byte_limit');
    // Exact product identity must be visible; comparisons additionally require
    // model attribution in EACH individual claim's source passage.
    if(!html.toLowerCase().includes(input.exactModelName.toLowerCase()))throw Error('model_not_present');
    const proposals=await input.proposeFromTransientHtml(html);
    if(!Array.isArray(proposals)||proposals.length===0||proposals.length>30)throw Error('no_bounded_proposals');
    const ids=new Set<string>();const collected:QuarantinedQualitativeFinding[]=[];
    const claims:TransientWebClaim[]=[];
    for(const proposal of proposals){
     checkProposal(proposal,candidate.exactVariantId,facet,html,input.articleType);
     if(ids.has(proposal.findingId))throw Error('duplicate_claim');
     ids.add(proposal.findingId);
     collected.push({findingId:proposal.findingId,exactVariantId:proposal.exactVariantId,
      criterionId:proposal.criterionId,proposition:proposal.proposition,
      polarity:proposal.polarity,basis:proposal.basis as Exclude<OpinionBasis,'reported_claim'>,
      context:{...proposal.context},methodologyReference:proposal.methodologyReference,
      qualification:proposal.qualification,originalTestId:candidate.originalTestId!,
      sourceUrl:candidate.url,sourceSha256:'',sourceSpanSha256:hash(proposal.anchorText),
      sourceSpanBytes:Buffer.byteLength(proposal.anchorText,'utf8'),
      reviewStatus:'quarantined_for_semantic_method_and_rights_review',
      evidenceKind:'original_professional_qualitative_observation',quantifiedMeasurement:false,
      weight:null,numericScore:null});
     claims.push({criterionId:proposal.criterionId,valueText:proposal.anchorText,
      anchorText:proposal.anchorText});
    }
    transientProposed=collected;
    return claims;
   }catch(e){parseFailure=e instanceof Error?e.message:'invalid_claim';throw e;}
  }});
 if(read.status!=='quarantined'){
  result.reasons=[...read.reasons,...(parseFailure?[parseFailure]:[])];return result;
 }
 const sh=read.evidence.contentSha256;
 if(!sh){result.reasons=['source_digest_missing'];return result;}
 result.observations=transientProposed.map(x=>({...x,sourceSha256:sh}));
 result.status='quarantined';
 return result;
}

export interface ReviewEvidenceApproval {
  findingId:string;reviewerId:string;reviewReference:string;
  validatedSourceSha256:string;
  reviewedAt:string;semanticFaithfulness:'confirmed'|'uncertain'|'rejected';
  methodAssessment:MethodDimension;adequacyAssessment:MethodDimension;
  /** Human-reviewed implication for the exact controlled criterion; a descriptive
   *  observation may affect a decision without having a sentiment polarity. */
  criterionImplication:'supports'|'concerns'|'tradeoff'|'undetermined';
  /** This is a documentary assertion; real reviewer identity still requires authentication. */
}
export interface QualitativeNeed {
 criterionId:string;importance:'essential'|'important'|'optional';
 /** User's use context: partial/missing qualifiers must not imply a match. */
 context:QualitativeContext;
 /** Requirement explicitly supplied by user, not guessed from product category. */
 avoidAdverseFinding:boolean;
}
export type QualitativeNeedStatus='contextual_support'|'contextual_concern'|
 'potential_essential_constraint_conflict'|'contextual_tradeoff'|'conflicting_evidence'|
 'unresolved_methodology'|'not_applicable'|'no_evidence';
export interface QualitativeNeedAssessment {
 criterionId:string;status:QualitativeNeedStatus;supportingFindingIds:string[];
 contrastingFindingIds:string[];excludedFindingIds:string[];
 recommendationGuard:'hold_for_review'|'no_additional_hold';
 conclusion:string;numericScore:null;
}
/**
 * Source-level observations are NOT studies of qualitative research. These
 * dimensions are documentary decision safeguards, not a CERQual rating.
 * Never count syndicated sentences or source repetitions as multiple tests.
 */
export function assessQualitativeNeeds(input:{
 needs:readonly QualitativeNeed[];
 observations:readonly QuarantinedQualitativeFinding[];
 approvals:readonly ReviewEvidenceApproval[];
}):{purpose:'qualitative_contextual_research_only';assessments:QualitativeNeedAssessment[];
 rankingEligible:false;publicationReady:false;numericScore:null}{
 const {needs,observations,approvals}=input;
 if(!Array.isArray(needs)||!Array.isArray(observations)||!Array.isArray(approvals)||
 needs.length>100||observations.length>1000||approvals.length>1000)throw Error('invalid_qualitative_assessment_input');
 const indexed=new Map<string,ReviewEvidenceApproval>();
 for(const a of approvals){
  if(!a)throw Error('invalid_review_receipt');
  if(!identifier(a.findingId)||indexed.has(a.findingId)||!identifier(a.reviewerId)||
   typeof a.reviewReference!=='string'||a.reviewReference.length<8||
   !/^[a-f0-9]{64}$/.test(a.validatedSourceSha256)||
   !Number.isFinite(Date.parse(a.reviewedAt))||
   !['confirmed','uncertain','rejected'].includes(a.semanticFaithfulness)||
   !['documented','uncertain','concern'].includes(a.methodAssessment)||
   !['documented','uncertain','concern'].includes(a.adequacyAssessment)||
   !['supports','concerns','tradeoff','undetermined'].includes(a.criterionImplication))throw Error('invalid_or_repeated_review_receipt');
  indexed.set(a.findingId,a);
 }
 const foundIds=new Set<string>();
 for(const f of observations){
  if(!f||!identifier(f.findingId)||foundIds.has(f.findingId)||f.reviewStatus!==
  'quarantined_for_semantic_method_and_rights_review'||f.evidenceKind!==
  'original_professional_qualitative_observation'||!contextValid(f.context)||
  !identifier(f.originalTestId)||!/^https:\/\//.test(f.sourceUrl)||
  !/^[a-f0-9]{64}$/.test(f.sourceSha256)||
  !/^[a-f0-9]{64}$/.test(f.sourceSpanSha256)||
  !values.includes(f.polarity)||f.basis==='reported_claim'||
  !safeProposition(f.proposition)||f.numericScore!==null||f.weight!==null)throw Error('invalid_qualitative_finding');
  foundIds.add(f.findingId);
 }
 if(approvals.some(a=>!foundIds.has(a.findingId)))throw Error('orphaned_approval');
 const assessed=needs.map(need=>{
  if(!identifier(need?.criterionId)||!contextValid(need.context)||
   !['essential','important','optional'].includes(need.importance)||
   typeof need.avoidAdverseFinding!=='boolean')throw Error('invalid_user_need');
  const matched=observations.filter(f=>f.criterionId===need.criterionId&&
   Object.entries(f.context).every(([key,val])=>need.context[key]===val));
  const excluded=observations.filter(f=>f.criterionId===need.criterionId&&!matched.includes(f));
  const accepted=matched.filter(f=>{
   const a=indexed.get(f.findingId);
   return !!a&&a.validatedSourceSha256===f.sourceSha256&&
    a.semanticFaithfulness==='confirmed'&&a.methodAssessment==='documented'&&
    a.adequacyAssessment!=='concern';
  });
  const uniqueTests=new Set(accepted.map(f=>f.originalTestId));
  // Criterion implications are separately reviewed, not inferred from
  //  sentiment polarity; a descriptive constraint may be decision-critical.
  const favourable=accepted.filter(f=>indexed.get(f.findingId)?.criterionImplication==='supports');
  const adverse=accepted.filter(f=>indexed.get(f.findingId)?.criterionImplication==='concerns');
  const mixed=accepted.filter(f=>indexed.get(f.findingId)?.criterionImplication==='tradeoff');
  // A primary test can contain several passages; these do not vote multiple times.
  const opposingTests=new Set([...favourable,...adverse].map(f=>f.originalTestId));
  const disagree=favourable.length>0&&adverse.length>0&&(opposingTests.size>1||uniqueTests.size===1);
  let status:QualitativeNeedStatus='no_evidence';
  if(disagree)status='conflicting_evidence';
  else if(adverse.length&&need.importance==='essential'&&need.avoidAdverseFinding)status='potential_essential_constraint_conflict';
  else if(mixed.length||favourable.length&&adverse.length)status='contextual_tradeoff';
  else if(adverse.length)status='contextual_concern';
  else if(favourable.length)status='contextual_support';
  else if(matched.length)status='unresolved_methodology';
  else if(excluded.length)status='not_applicable';
  const hold=status==='potential_essential_constraint_conflict'||status==='conflicting_evidence';
  const statements:Record<QualitativeNeedStatus,string>={
   contextual_support:'A context-matched, reviewed professional observation offers qualitative support; it is not a numeric measurement or guarantee.',
   contextual_concern:'A context-matched original professional observation identifies a potential drawback.',
   potential_essential_constraint_conflict:'A directly relevant adverse finding may violate an explicit essential user constraint; hold recommendation for adjudication.',
   contextual_tradeoff:'Mixed or conditional original-test observations require an explained trade-off, not a synthetic numerical average.',
   conflicting_evidence:'Original findings differ for this context; assess methods, applicability and source lineage before deciding.',
   unresolved_methodology:'A relevant statement exists but independent semantic/method review is missing or inconclusive.',
   not_applicable:'Available qualitative observations refer to different or incompletely specified use conditions.',
   no_evidence:'No relevant qualitative observation is available; absence is not evidence of poor quality.'};
  return {criterionId:need.criterionId,status,supportingFindingIds:[...favourable,...mixed].map(f=>f.findingId),
   contrastingFindingIds:adverse.map(f=>f.findingId),excludedFindingIds:excluded.map(f=>f.findingId),
   recommendationGuard:hold?'hold_for_review' as const:'no_additional_hold' as const,
   conclusion:statements[status],numericScore:null};
 });
 return {purpose:'qualitative_contextual_research_only',assessments:assessed,
  rankingEligible:false,publicationReady:false,numericScore:null};
}
