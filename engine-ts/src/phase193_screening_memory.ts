/** Phase193: durable, reviewable screening-decision memory on top of Phase192.
 * An exclusion is scoped to a document revision and policy, NEVER to a domain,
 * product, publisher, or future document. This is screening reuse, not proof.
 * PRISMA 2020 items 16a/16b, Cochrane MECIR C41/C42, W3C PROV-O inspire
 * its provenance/revision semantics; their use is NOT an endorsement of PEE.
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,renameSync,mkdirSync,openSync,closeSync,fsyncSync,unlinkSync} from 'node:fs';
import {dirname} from 'node:path';
import {normalizeDiscoveryUrl192,type LineageReport192} from './phase192_lineage_marketplace_screen.js';

export type Scope193='document'|'field';
export type ReuseAction193='discovery_only'|'provisional_specification_only'|'contextual_research_only'|'original_evidence_candidate';
export type Reason193='marketplace_stars_without_original_test'|'manufacturer_or_retailer_spec_only'|
 'mixed_or_untraced_method'|'reported_original_method_pending_independent_review'|
 'derived_report_without_new_independent_test'|'out_of_scope_for_field';
export type ContentBasis193='publisher_bytes'|'rights_appropriate_extract'|'analyst_annotation';
export type ReviewBasis193='human_source_screen'|'annotated_research_trial';
export interface SourceRevision193{
 sourceId:string; url:string; contentHash:string; contentBasis:ContentBasis193;
 policyVersion:string; market:string; category:string; variantId:string; field:string|null;
 observedAt:string; /** Source's method/ownership annotation revision; not a credibility score. */
 classificationRevision:string; /** Only publisher bytes may claim a full-document fingerprint. */
}
export interface ScreeningDecision193{
 source:SourceRevision193;
 scope:Scope193;action:ReuseAction193;reason:Reason193;
 /** Review is attributable, but reviewer metadata is NOT a digital signature or independent authentication. */
 reviewerId:string;reviewTicket:string;reviewedAt:string;reviewBasis:ReviewBasis193;
 evidenceNote:string;originalTestEventId:string|null;
 /** For discovery-only, candidate products must remain discoverable. */
 retainedCandidateVariantIds:readonly string[];
}
export interface DecisionEvent193{seq:number;supersedesSeq:number|null;decision:ScreeningDecision193;
 previousHash:string;eventHash:string;}
export interface ScreeningLedger193 {schema:'193.1';state:'research_only';events:readonly DecisionEvent193[];
 rankingAuthorized:false;tamperEvidentNotAuthenticated:true;}
export type ReuseVerdict193='reuse_screening_decision'|'screen_required_new_document'|
 'screen_required_content_revision'|'screen_required_policy_revision'|
 'screen_required_context_revision'|'screen_required_scope_revision'|
 'screen_required_unverified_revision';
export interface ScreeningLookup193{
 verdict:ReuseVerdict193;reused:ScreeningDecision193|null;reason:string;
 /** Only prevents re-running source screening, not discovery or testing each new claim. */
 fullDocumentRescreenSkipped:boolean;mayUseAsIndependentTest:false;
 candidatePreserved:true;}
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const hex=(x:string)=>/^[0-9a-f]{64}$/.test(x);
const id=(x:unknown)=>typeof x==='string'&&/^[a-zA-Z0-9_.:-]{1,140}$/.test(x);
const when=(x:unknown)=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(x)&&
 !Number.isNaN(Date.parse(x));
const nonBlank=(x:unknown,min=1,max=1000)=>typeof x==='string'&&x.length>=min&&x.length<=max&&x.trim()===x;
const actions:ReuseAction193[]=['discovery_only','provisional_specification_only','contextual_research_only','original_evidence_candidate'];
const reasons:Reason193[]=['marketplace_stars_without_original_test','manufacturer_or_retailer_spec_only',
 'mixed_or_untraced_method','reported_original_method_pending_independent_review',
 'derived_report_without_new_independent_test','out_of_scope_for_field'];
const isoOrder=(a:string,b:string)=>Date.parse(a)>=Date.parse(b);
const unique=(xs:readonly string[])=>xs.length===new Set(xs).size;
function sourceKey(x:SourceRevision193){return normalizeDiscoveryUrl192(x.url);}
function fieldKey(x:SourceRevision193,scope:Scope193){return scope==='document'?'document':
 ['field',x.market,x.category,x.variantId,x.field].join('|');}
function validateSource(x:SourceRevision193):void{
 if(!x||!id(x.sourceId)||!hex(x.contentHash)||
 !['publisher_bytes','rights_appropriate_extract','analyst_annotation'].includes(x.contentBasis)||
 !nonBlank(x.policyVersion,1,100)||!nonBlank(x.classificationRevision,1,120)||
 !id(x.market)||!id(x.category)||!id(x.variantId)||
 (x.field!==null&&!id(x.field))||!when(x.observedAt))throw Error('invalid193_source');
 sourceKey(x);
}
function validateDecision(d:ScreeningDecision193):void{
 validateSource(d?.source);
 if(!['document','field'].includes(d.scope)||
 (d.scope==='field'&&d.source.field===null)||
 !actions.includes(d.action)||!reasons.includes(d.reason)||
 !id(d.reviewerId)||!nonBlank(d.reviewTicket,6,180)||!when(d.reviewedAt)||
 !isoOrder(d.reviewedAt,d.source.observedAt)||
 !['human_source_screen','annotated_research_trial'].includes(d.reviewBasis)||
 !nonBlank(d.evidenceNote,15,1200)||
 (d.originalTestEventId!==null&&!id(d.originalTestEventId))||
 !Array.isArray(d.retainedCandidateVariantIds)||d.retainedCandidateVariantIds.length>100||
 !unique(d.retainedCandidateVariantIds)||!d.retainedCandidateVariantIds.every(id))throw Error('invalid193_decision');
 if(d.reason==='marketplace_stars_without_original_test'&&
  (d.action!=='discovery_only'||d.scope!=='document'))throw Error('invalid193_marketplace_scope');
 if(d.action==='discovery_only'&&d.reason!=='marketplace_stars_without_original_test')throw Error('invalid193_discovery_claim');
 if(d.action==='original_evidence_candidate'&&
  (d.reason!=='reported_original_method_pending_independent_review'||!d.originalTestEventId))
  throw Error('invalid193_original_candidate');
 if(d.action!=='original_evidence_candidate'&&d.originalTestEventId!==null)
  throw Error('invalid193_original_event');
 if(d.reason==='manufacturer_or_retailer_spec_only'&&d.action!=='provisional_specification_only')
  throw Error('invalid193_specs');
 if(d.reason==='derived_report_without_new_independent_test'&&d.action!=='contextual_research_only')
  throw Error('invalid193_derived');
 if(d.reason==='out_of_scope_for_field'&&d.scope!=='field')throw Error('invalid193_out_of_scope');
 if(d.reason==='mixed_or_untraced_method'&&d.action!=='contextual_research_only')
  throw Error('invalid193_mixed');
}
const genesis=hash('PEE phase193 screening ledger genesis');
const digest=(e:Omit<DecisionEvent193,'eventHash'>)=>hash(JSON.stringify(e));
export function emptyLedger193():ScreeningLedger193{return {schema:'193.1',state:'research_only',events:[],
 rankingAuthorized:false,tamperEvidentNotAuthenticated:true};}
/** Verify all hash links and the immutable decision chain; no external signer verification. */
export function validateLedger193(ledger:ScreeningLedger193):void{
 if(!ledger||ledger.schema!=='193.1'||ledger.state!=='research_only'||
 ledger.rankingAuthorized!==false||ledger.tamperEvidentNotAuthenticated!==true||
 !Array.isArray(ledger.events)||ledger.events.length>50000)throw Error('invalid193_ledger');
 let prev=genesis;
 const lastByKey=new Map<string,number>();
 for(let i=0;i<ledger.events.length;i++){
  const e=ledger.events[i];
  validateDecision(e?.decision);
  const key=sourceKey(e.decision.source)+'|'+fieldKey(e.decision.source,e.decision.scope);
  const prior=lastByKey.get(key)??null;
  if(e.seq!==i+1||e.supersedesSeq!==prior||e.previousHash!==prev||
   !hex(e.eventHash)||digest({seq:e.seq,supersedesSeq:e.supersedesSeq,
     decision:e.decision,previousHash:e.previousHash})!==e.eventHash)throw Error('invalid193_chain');
  if(prior!==null){const old=ledger.events[prior-1].decision;
   if(!isoOrder(e.decision.reviewedAt,old.reviewedAt))throw Error('invalid193_order');
  }
  lastByKey.set(key,e.seq);prev=e.eventHash;
 }
}
export function recordScreening193(ledger:ScreeningLedger193,decision:ScreeningDecision193):ScreeningLedger193{
 validateLedger193(ledger);validateDecision(decision);
 const key=sourceKey(decision.source)+'|'+fieldKey(decision.source,decision.scope);
 const old=[...ledger.events].reverse().find(e=>sourceKey(e.decision.source)+'|'+
 fieldKey(e.decision.source,e.decision.scope)===key);
 if(old&&!isoOrder(decision.reviewedAt,old.decision.reviewedAt))throw Error('invalid193_order');
 const core={seq:ledger.events.length+1,supersedesSeq:old?.seq??null,decision:structuredClone(decision),
 previousHash:ledger.events.at(-1)?.eventHash??genesis};
 const next={...ledger,events:[...ledger.events,{...core,eventHash:digest(core)}]};
 validateLedger193(next);return next;
}
/** Same URL and exact revision + policy/classification/scope allow skip. No unsafe
 * reuse across variants, fields, markets or a later publisher content update.
 * Document-level marketplace exclusion is intentionally independent of field scope. */
export function lookupScreening193(ledger:ScreeningLedger193,source:SourceRevision193,
 scope:Scope193='field'):ScreeningLookup193{
 validateLedger193(ledger);validateSource(source);
 const url=sourceKey(source);
 const matches=[...ledger.events].reverse().filter(e=>sourceKey(e.decision.source)===url);
 // Choose newest *applicable* decision; a newly observed original test must
 // supersede an older whole-document discovery-only screen.
 const found=matches.find(e=>(e.decision.scope==='document'&&e.decision.action==='discovery_only')||
  fieldKey(e.decision.source,e.decision.scope)===fieldKey(source,scope));
 const base={reused:null,fullDocumentRescreenSkipped:false,mayUseAsIndependentTest:false,
 candidatePreserved:true} as const;
 if(!found)return {verdict:'screen_required_new_document',reason:'No previously screened matching document or scope.',...base};
 const d=found.decision,p=d.source;
 // Site-wide screen is only appropriate for an unchanged stars-only report;
 // a new classification or actual page content mandates a fresh assessment.
 const mismatch=(verdict:ReuseVerdict193,reason:string):ScreeningLookup193=>({verdict,reason,...base});
 if(source.contentHash!==p.contentHash||source.contentBasis!==p.contentBasis)
  return mismatch('screen_required_content_revision','Document content or evidence-fingerprint basis changed.');
 if(source.policyVersion!==p.policyVersion)
  return mismatch('screen_required_policy_revision','Screening/evidence policy changed.');
 if(source.classificationRevision!==p.classificationRevision)
  return mismatch('screen_required_context_revision','Source method, commercial basis or lineage classification changed.');
 if(found.decision.scope==='document'&&source.market!==p.market)
  return mismatch('screen_required_scope_revision','A market-specific source screen cannot be used for another market.');
 if(found.decision.scope!=='document'&&
  fieldKey(source,scope)!==fieldKey(p,found.decision.scope))
  return mismatch('screen_required_scope_revision','Market/product/criterion differs from the reviewed decision.');
 if(found.decision.reviewBasis!=='human_source_screen'||source.contentBasis!=='publisher_bytes')
  return mismatch('screen_required_unverified_revision','Only an explicitly reviewed decision tied to matching original publisher bytes may skip full-document re-screening.');
 return {verdict:'reuse_screening_decision',reused:structuredClone(d),reason:'Same source content, policy, context and allowable scope; prior human screen reused.',
 fullDocumentRescreenSkipped:true,mayUseAsIndependentTest:false,candidatePreserved:true};
}
/** Pilot adapter from the Phase192 report. A reported original method remains
 * review candidate, not a test admitted to the public ranking. */
export function draftFromLineage192(args:{report:LineageReport192;sourceId:string;source:SourceRevision193;
 reviewerId:string;reviewTicket:string;reviewedAt:string;reviewBasis:ReviewBasis193;
 note:string;originalTestEventId?:string|null;candidateIds:readonly string[]}):ScreeningDecision193{
 const entry=args.report.sourceUse.find(x=>x.sourceId===args.sourceId);
 if(!entry||args.source.sourceId!==args.sourceId||args.report.publicRankingAllowed!==false)
  throw Error('invalid193_phase192_binding');
 const reason:Reason193=entry.scope==='discovery_only'?'marketplace_stars_without_original_test':
 entry.scope==='provisional_specification_only'?'manufacturer_or_retailer_spec_only':
 entry.scope==='original_evidence_candidate'?'reported_original_method_pending_independent_review':
 'mixed_or_untraced_method';
 const result:ScreeningDecision193={source:args.source,
 scope:entry.scope==='discovery_only'?'document':'field',action:entry.scope,reason,
 reviewerId:args.reviewerId,reviewTicket:args.reviewTicket,reviewedAt:args.reviewedAt,
 reviewBasis:args.reviewBasis,evidenceNote:args.note,
 originalTestEventId:entry.scope==='original_evidence_candidate'?(args.originalTestEventId??null):null,
 retainedCandidateVariantIds:[...args.candidateIds]};
 validateDecision(result);return result;
}
export interface ScreeningBatch193 {discovered:number;reused:number;needScreening:number;
 excludedFromOriginalPerformanceEvidence:number;productCandidatesRetained:readonly string[];
 rows:readonly {sourceId:string;verdict:ReuseVerdict193;reusedAction:ReuseAction193|null}[];
 rankingAuthorized:false;}
export function screenBatch193(ledger:ScreeningLedger193,sources:readonly SourceRevision193[]):ScreeningBatch193{
 validateLedger193(ledger);
 if(sources.length>2000||new Set(sources.map(x=>sourceKey(x)+'|'+x.variantId+'|'+x.field)).size!==sources.length)
  throw Error('invalid193_batch');
 const rows=sources.map(s=>{const x=lookupScreening193(ledger,s);
  return {sourceId:s.sourceId,verdict:x.verdict,reusedAction:x.reused?.action??null};});
 const used=rows.filter(x=>x.verdict==='reuse_screening_decision');
 const retained=new Set(sources.map(x=>x.variantId));
 for(const s of sources){const d=lookupScreening193(ledger,s).reused;
  for(const id of d?.retainedCandidateVariantIds??[])retained.add(id);}
 return {discovered:sources.length,reused:used.length,needScreening:sources.length-used.length,
 excludedFromOriginalPerformanceEvidence:used.filter(x=>x.reusedAction==='discovery_only').length,
 productCandidatesRetained:[...retained].sort(),rows,rankingAuthorized:false};
}
/** Atomic replacement of complete immutable log snapshot for a SINGLE WRITER only.
 * Does not solve distributed concurrency, malicious filesystem edits or authentication. */
export function saveLedger193(path:string,ledger:ScreeningLedger193):void{
 validateLedger193(ledger);if(!path.endsWith('.json'))throw Error('invalid193_path');
 mkdirSync(dirname(path),{recursive:true});
 const temp=path+'.phase193.tmp';let fd:number|undefined;
 try {fd=openSync(temp,'wx',0o600);writeFileSync(fd,JSON.stringify(ledger,null,2)+'\n','utf8');fsyncSync(fd);closeSync(fd);fd=undefined;
  renameSync(temp,path);
  try{const dir=openSync(dirname(path),'r');try{fsyncSync(dir);}finally{closeSync(dir);}}catch{/* platform limitation */}
 }catch(err){if(fd!==undefined)closeSync(fd);try{unlinkSync(temp);}catch{/* already moved or not made */}throw err;}
}
export function loadLedger193(path:string):ScreeningLedger193{
 const text=readFileSync(path,'utf8');if(text.length>10000000)throw Error('invalid193_size');
 const parsed=JSON.parse(text) as ScreeningLedger193;validateLedger193(parsed);return parsed;
}
