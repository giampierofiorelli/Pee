/** Phase147 — local clause-scoped attribution of measurements and conservative
 * cross-statement candidates. All links are textual hypotheses, not facts.
 * No pretrained parser, network, product-specific category rules, or authority.
 */
import {createHash} from 'node:crypto';
import {readCompoundConditions146, type CompositeContextGraph146} from './phase146_compound_conditions.js';
import type {ReaderInput139} from './phase139_unmarked_english_candidate_reader.js';
import type {EvidenceSpan144} from './phase144_cross_category_observation_graph.js';
import type {NumericCandidate145} from './phase145_unit_context_bridge.js';

const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const ev=(t:string,start:number,end:number):EvidenceSpan144=>{
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end>t.length||start>=end)throw Error('invalid_147_span');
 return {start,end,literal:t.slice(start,end),sha256:hash(t.slice(start,end))};
};
const cap=()=>({sourceAuthenticated:false as const,productIdentityProven:false as const,
 independentReviewRequired:true as const,canonicalWriteAuthorized:false as const,rankingAuthorized:false as const});
export type Attribution147='manufacturer_claim_surface'|'test_report_surface'|'setting_surface'|'ambiguous_reporting'|'undetermined';
export type Context147='one_explicit_mode'|'ambiguous_modes'|'not_stated';
export interface ClaimAttachment147 {
 id:string;measurement145Id:string;quantity:EvidenceSpan144;clause:EvidenceSpan144;
 numericRange:EvidenceSpan144|null;protocolCues:EvidenceSpan144[];protocolVerified:false;
 attribution:Attribution147;condition:EvidenceSpan144|null;conditionType:Context147;
 surfaceMode:string|null;subject:EvidenceSpan144|null;subjectStatus:'explicit_subject_surface_only'|'unresolved';
 polarity:'explicit_negative_surface'|'undetermined';
 status:'quarantined_local_hypothesis'|'abstain_ambiguous';reasons:string[];
 sourceAuthenticated:false;productIdentityProven:false;independentReviewRequired:true;
 canonicalWriteAuthorized:false;rankingAuthorized:false;
}
export interface CandidateContinuity147 {
 fromId:string;toId:string;status:'same_surface_compatible_candidate'|'blocked_context_change'|
 'blocked_reporting_change'|'blocked_polarity'|'insufficient_condition';
 reasons:string[];samePhysicalProductProven:false;measurementComparable:false;
 canonicalWriteAuthorized:false;rankingAuthorized:false;
}
export interface ClaimAttachmentGraph147 {
 phase:147;sourceId:string;originalDocumentId:string;documentSha256:string;
 baseline146:CompositeContextGraph146;attachments:ClaimAttachment147[];
 continuity:CandidateContinuity147[];coverageTruncated:boolean;truncationReasons:string[];
 independentGoldAnnotations:0;accuracy:null;sourceAuthenticated:false;
 canonicalWriteAuthorized:false;rankingAuthorized:false;
}
/** Explicit discourse boundaries: no implicit transfer across contrastive clauses.
 * This is intentionally not a general dependency or clause parser. */
function clauseFor(text:string,m:NumericCandidate145):EvidenceSpan144 {
 const a=m.sentenceEvidence.start,b=m.sentenceEvidence.end;
 const local=text.slice(a,b);
 const cuts=[0,local.length];
 for(const x of local.matchAll(/;|\b(?:but|whereas|however|although|yet)\b/gi)){
  cuts.push(x.index!,x.index!+x[0].length);
 }
 cuts.sort((x,y)=>x-y);
 const relative=m.quantity.start-a;
 let left=0,right=local.length;
 for(const c of cuts){if(c<=relative)left=Math.max(left,c);if(c>relative){right=c;break;}}
 while(left<right&&/\s|[,;:]/.test(text[a+left]))left++;
 while(right>left&&/\s|[,;:]/.test(text[a+right-1]))right--;
 return ev(text,a+left,a+right);
}
const reportClaim=/\b(?:manufacturer|maker|advertis(?:es|ed|ing)|claims?|promises?|quoted|rated|on\s+the\s+(?:box|packaging)|specification\s+sheet)\b/i;
const reportTest=/\b(?:reviewer|we\s+(?:measured|recorded|observed|found|got|saw)|measured|recorded|observed|tested|our\s+(?:test|measurements?))\b/i;
const setting=/\b(?:set\s+to|configured\s+to|setting\s+of|target(?:ed)?\s+at|preset\s+to|dial(?:led|ed)?\s+to)\b/i;
const negation=/\b(?:no|never|cannot|can't|doesn't|didn't|isn't|wasn't|not)\b/i;
function attribution(clause:string):Attribution147{
 const claim=reportClaim.test(clause),test=reportTest.test(clause),set=setting.test(clause);
 if((claim&&test)||(set&&(claim||test)))return 'ambiguous_reporting';
 if(claim)return 'manufacturer_claim_surface';
 if(set)return 'setting_surface';
 if(test)return 'test_report_surface';
 return 'undetermined';
}
function context(t:string,c:EvidenceSpan144):{condition:EvidenceSpan144|null;type:Context147;mode:string|null}{
 const clause=c.literal;
 const options=[...clause.matchAll(/\b(?:HDR|SDR)\b|\b(?:in|at|under|during|with|on)\s+(?:the\s+)?(?:[A-Za-z0-9-]+\s+){0,3}(?:cycle|programme|program|mode|setting|speed|test)\b/gi)];
 const norm=(s:string)=>s.toLowerCase().replace(/\s+/g,' ').trim();
 const unique=[...new Set(options.map(x=>norm(x[0])))];
 if(!unique.length)return {condition:null,type:'not_stated',mode:null};
 if(unique.length>1)return {condition:null,type:'ambiguous_modes',mode:null};
 const m=options[0];return {condition:ev(t,c.start+m.index!,c.start+m.index!+m[0].length),type:'one_explicit_mode',mode:unique[0]};
}
const explicitClauseSubject=(t:string,c:EvidenceSpan144):EvidenceSpan144|null=>{
 const m=/^([A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z][A-Za-z0-9-]*){1,5}?)\s+(?:did\s+not\s+)?(?:measured?|advertis(?:es|ed)|reached|recorded|observed|claims?|was\s+set\s+to)\b/i.exec(c.literal);
 if(!m||/\b(?:cycle|mode|setting|programme|program|speed|test)\s*$/i.test(m[1])||/\b(?:other|another|previous|older|different)\b/i.test(m[1]))return null;
 return ev(t,c.start,c.start+m[1].length);
};
const normaliseSubject=(v:string)=>v.toLowerCase().replace(/^the\s+/,'').replace(/\s+/g,' ').trim();
function rangeSurface(text:string,m:NumericCandidate145,c:EvidenceSpan144):EvidenceSpan144|null{
 // A range with only the upper endpoint parsed must never become an exact
 // isolated observation. The lower endpoint is retained as original text.
 const prefix=text.slice(c.start,m.quantity.start);
 const lower=/(?<![A-Za-z0-9])\d{1,5}(?:[,.]\d+)?\s*(?:-|–|to)\s*$/i.exec(prefix);
 return lower?ev(text,c.start+lower.index!,m.quantity.end):null;
}
function protocolCues(text:string,c:EvidenceSpan144):EvidenceSpan144[]{
 return [...c.literal.matchAll(/\b(?:2|10|25|50|100)\s*%\s*(?:white\s+)?(?:test\s+)?window\b|\btest\s+bench\s+\d+(?:\.\d+)?\b/gi)]
  .map(m=>ev(text,c.start+m.index!,c.start+m.index!+m[0].length));
}
function attach(text:string,m:NumericCandidate145):ClaimAttachment147{
 const c=clauseFor(text,m),ctx=context(text,c),attr=attribution(c.literal),range=rangeSurface(text,m,c);
 // The upstream subject is used only when its entire span belongs to this clause.
 const subject=m.subjectSurface&&m.subjectSurface.start>=c.start&&m.subjectSurface.end<=c.end?m.subjectSurface:explicitClauseSubject(text,c);
 const negative=negation.test(c.literal.replace(/\bnot\s+only\b/gi,''));
 const reasons=[...(subject?['literal_subject_not_entity_authentication']:['subject_reference_unresolved']),
  ...(ctx.type==='not_stated'?['condition_not_specified']:ctx.type==='ambiguous_modes'?['multiple_conditions_same_clause']:[]),
  ...(attr==='ambiguous_reporting'?['reporting_attribution_conflict']:[]),
  ...(negative?['negative_context_requires_relation_scope_check']:[]),
  ...(range?['numeric_range_not_single_measured_value']:[])];
 return {id:`a147_${m.id}`,measurement145Id:m.id,quantity:m.quantity,clause:c,
  numericRange:range,protocolCues:protocolCues(text,c),protocolVerified:false,attribution:attr,
  condition:ctx.condition,conditionType:ctx.type,surfaceMode:ctx.mode,subject,
  subjectStatus:subject?'explicit_subject_surface_only':'unresolved',
  polarity:negative?'explicit_negative_surface':'undetermined',
  status:(range||ctx.type==='ambiguous_modes'||attr==='ambiguous_reporting')?'abstain_ambiguous':'quarantined_local_hypothesis',
  reasons,...cap()};
}
function continuity(a:ClaimAttachment147,b:ClaimAttachment147,base:CompositeContextGraph146):CandidateContinuity147|null{
 const source=base.baseline145.measurements;
 const first=source.find(x=>x.id===a.measurement145Id)!,second=source.find(x=>x.id===b.measurement145Id)!;
 if(first.sentenceId+1!==second.sentenceId||first.dimension!==second.dimension||
  !a.subject||!b.subject||normaliseSubject(a.subject.literal)!==normaliseSubject(b.subject.literal)||
  normaliseSubject(a.subject.literal).length<6)return null;
 const outcome:(CandidateContinuity147['status']) =
  a.polarity!==b.polarity?'blocked_polarity':
  a.attribution!==b.attribution?'blocked_reporting_change':
  a.conditionType==='ambiguous_modes'||b.conditionType==='ambiguous_modes'||
  (a.surfaceMode!==null&&b.surfaceMode!==null&&a.surfaceMode!==b.surfaceMode)?'blocked_context_change':
  a.surfaceMode===null||b.surfaceMode===null?'insufficient_condition':'same_surface_compatible_candidate';
 return {fromId:a.id,toId:b.id,status:outcome,reasons:[
  outcome==='same_surface_compatible_candidate'?'same_literal_subject_and_condition_not_physical_identity':outcome],
  samePhysicalProductProven:false,measurementComparable:false,canonicalWriteAuthorized:false,rankingAuthorized:false};
}
export function readLocalClaimAttachment147(input:ReaderInput139,maxAttachments=120):ClaimAttachmentGraph147{
 if(!Number.isSafeInteger(maxAttachments)||maxAttachments<1||maxAttachments>250)throw Error('invalid_phase147_budget');
 const baseline=readCompoundConditions146(input); // validates source document and all previous controls
 const source=baseline.baseline145.measurements;
 const truncated=source.length>maxAttachments;
 const attachments=source.slice(0,maxAttachments).map(m=>attach(input.document.text,m));
 const links:CandidateContinuity147[]=[];
 for(let i=0;i<attachments.length;i++)for(let j=i+1;j<Math.min(i+4,attachments.length);j++){
  const l=continuity(attachments[i],attachments[j],baseline);if(l)links.push(l);
 }
 return {phase:147,sourceId:baseline.sourceId,originalDocumentId:baseline.originalDocumentId,
  documentSha256:baseline.documentSha256,baseline146:baseline,attachments,continuity:links,
  coverageTruncated:baseline.coverageTruncated||truncated,
  truncationReasons:[...baseline.truncationReasons,...(truncated?['claim_attachment_limit']:[])],
  independentGoldAnnotations:0,accuracy:null,sourceAuthenticated:false,
  canonicalWriteAuthorized:false,rankingAuthorized:false};
}
