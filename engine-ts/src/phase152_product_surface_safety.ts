/** Phase 152: category-neutral discovery of *possible* overlooked commercial model
 * surfaces in English review prose. The scanner is a conservative veto, not a
 * product catalogue, an entity recognizer of known accuracy, or a coreference
 * proof. A source span and its offset are retained for every diagnostic.
 * No new evidence fact, identity assertion, or ranking is authorized.
 */
import {createHash} from 'node:crypto';
import {recoverTypedDocumentReferences151, type DocumentRecovery151, type RecoveryDecision151} from './phase151_type_aware_discourse_recovery.js';
import type {ReaderInput139} from './phase139_unmarked_english_candidate_reader.js';
import type {EvidenceSpan144} from './phase144_cross_category_observation_graph.js';
const sha=(t:string)=>createHash('sha256').update(t).digest('hex');
const normalize=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const badFirst=new Set(['the','this','that','a','an','heavy','duty','eco','hdr','sdr','usb','pcm','air','roast','grill','bake','full','native','maximum','peak','sustained','tested','test','picture','auto']);
const badSecond=new Set(['hdr','sdr','usb','pcm','iso','db','hz','khz','mhz','wh','kwh','w','cm','mm','kg','mode','cycle','test','setting']);
// Require an initial plausible company/product name and a code or numbered series.
// This deliberately *cannot* find all products (notably all-word model names).
const codedName=/\b(?:[A-Z][a-z][a-z\d-]{2,}|[A-Z]{2,6})\s+(?:[A-Z]{1,8}\s+\d{1,5}(?:\s+[IVX]{1,4})?|[A-Z]{1,6}[-]?\d[A-Z\d-]{0,12}(?:\s+20\d\d)?|\d{3,5}\s+Series)\b/g;
const maxSurfaceCount=120;
export interface Surface152 {id:string;span:EvidenceSpan144;nameKey:string;
 type:'structured_name_candidate';basis:'orthographic_pattern_not_verified';
 recognizedByBaseline:boolean;commercialIdentityVerified:false;}
export type SafetyDecision152 = RecoveryDecision151 | 'abstain_overlooked_named_competitor' | 'abstain_surface_inventory_incomplete';
export interface SafeLink152 {id:string;mention:EvidenceSpan144;phase151Decision:RecoveryDecision151;
 decision:SafetyDecision152;candidateAnchorIds:string[];interferingSurfaceIds:string[];reasons:string[];
 identityVerified:false;sourceAuthenticityVerified:false;entailmentVerified:false;
 independentReviewRequired:true;canonicalWriteAuthorized:false;rankingAuthorized:false;}
export interface SurfaceSafetyReport152 {phase:152;sourceId:string;originalDocumentId:string;documentSha256:string;
 baseline151:DocumentRecovery151;possibleSurfaces:Surface152[];links:SafeLink152[];
 truncated:boolean;truncationReasons:string[];scannerBlindSpots:string[];
 sourceAuthenticated:false;independentGoldAnnotations:0;accuracy:null;
 canonicalWriteAuthorized:false;rankingAuthorized:false;}
const span=(t:string,start:number,end:number):EvidenceSpan144=>({start,end,literal:t.slice(start,end),sha256:sha(t.slice(start,end))});
function paragraph(text:string,pos:number){
 const before=text.slice(0,pos),m=[...before.matchAll(/\n\s*\n/g)].at(-1);const start=m?m.index!+m[0].length:0;
 const next=/\n\s*\n/.exec(text.slice(pos));return {start,end:next?pos+next.index:text.length};
}
/** All candidates are based on typography, not actual existence of an SKU. */
export function scanPossibleModelSurfaces152(text:string,baseline:DocumentRecovery151,maxSurfaces=120):{surfaces:Surface152[];truncated:boolean}{
 if(!Number.isInteger(maxSurfaces)||maxSurfaces<1||maxSurfaces>maxSurfaceCount)throw Error('invalid_surface_cap_152');
 if(sha(text)!==baseline.documentSha256)throw Error('document_digest_mismatch_152');
 const anchors=baseline.baseline149.baseline148.anchors;
 const out:Surface152[]=[];
 for(const m of text.matchAll(codedName)){
  const start=m.index!,end=start+m[0].length;
  const tokens=m[0].split(/\s+/),a=tokens[0].toLowerCase(),b=tokens[1].toLowerCase();
  if(badFirst.has(a)||badSecond.has(b)||/\b(?:\d+(?:\.\d+)?\s*(?:°[CF]|dBA?|Hz|kHz|MHz|W|Wh|L))\b/i.test(m[0]))continue;
  // Do not infer a product from a substring of a named alias: mark it as indexed.
  const covered=anchors.some(x=>(x.span.start<=start&&x.span.end>=end)||
   (x.span.start===start&&normalize(m[0]).startsWith(x.nameKey+' '))); // a date suffix is not an independently named competitor
  if(out.length>=maxSurfaces)return {surfaces:out,truncated:true};
  out.push({id:`s152_${start}_${end}`,span:span(text,start,end),nameKey:normalize(m[0]),
   type:'structured_name_candidate',basis:'orthographic_pattern_not_verified',recognizedByBaseline:covered,
   commercialIdentityVerified:false});
 }
 return {surfaces:out,truncated:false};
}
/** Safety-only overlay: no Phase151 candidate is ever upgraded, only retained or vetoed.
 * A new candidate surface must be adjacent to the mention, its proposed anchor,
 * or in the same local paragraph. This intentionally trades recall for safety.
 */
export function inspectReferenceSurfaceSafety152(input:ReaderInput139,maxSurfaces=120):SurfaceSafetyReport152{
 const baseline=recoverTypedDocumentReferences151(input);
 const text=input.document.text;
 const scan=scanPossibleModelSurfaces152(text,baseline,maxSurfaces);
 const anchors=baseline.baseline149.baseline148.anchors;
 const links:SafeLink152[]=baseline.proposals.map(p=>{
  const candidateAnchors=p.candidateAnchorIds.map(id=>anchors.find(a=>a.id===id)).filter((a):a is typeof anchors[number]=>!!a);
  const regions=[paragraph(text,p.mention.start),...candidateAnchors.map(a=>paragraph(text,a.span.start))];
  const nearby=scan.surfaces.filter(s=>regions.some(r=>s.span.start>=r.start&&s.span.end<=r.end));
  const extra=nearby.filter(s=>!s.recognizedByBaseline&&
   !candidateAnchors.some(a=>a.span.start<=s.span.start&&a.span.end>=s.span.end));
  const baselineLinks=p.decision.endsWith('candidate_unverified')||p.decision==='retained_phase149';
  const meaningful=extra.filter(s=>s.nameKey!==normalize(p.mention.literal));
  let decision:SafetyDecision152=p.decision;
  const reasons=[...p.reasons];
  if((scan.truncated||baseline.coverageTruncated)&&baselineLinks){decision='abstain_surface_inventory_incomplete';
   reasons.push(scan.truncated?'surface_scan_truncated':'upstream_reference_scan_truncated');}
  else if(baselineLinks&&meaningful.length){decision='abstain_overlooked_named_competitor';reasons.push('possible_unindexed_commercial_model_in_local_context');}
  return {id:'p152_'+p.mention.start+'_'+p.mention.end,mention:p.mention,
   phase151Decision:p.decision,decision,candidateAnchorIds:[...p.candidateAnchorIds],
   interferingSurfaceIds:decision==='abstain_overlooked_named_competitor'?meaningful.map(x=>x.id):[],
   reasons,identityVerified:false,sourceAuthenticityVerified:false,entailmentVerified:false,
   independentReviewRequired:true,canonicalWriteAuthorized:false,rankingAuthorized:false};
 });
 return {phase:152,sourceId:baseline.sourceId,originalDocumentId:baseline.originalDocumentId,
  documentSha256:baseline.documentSha256,baseline151:baseline,possibleSurfaces:scan.surfaces,links,
  truncated:scan.truncated||baseline.coverageTruncated,
  truncationReasons:[...(scan.truncated?['surface_budget_exceeded']:[]),...(baseline.coverageTruncated?['upstream_reference_budget_exceeded']:[])],
  scannerBlindSpots:['all_word_names_without_model_codes','non_latin_commercial_names','hyphenated_brand_lineup_variants','table_structures','long_distance_product_identity'],
  sourceAuthenticated:false,independentGoldAnnotations:0,accuracy:null,
  canonicalWriteAuthorized:false,rankingAuthorized:false};
}
