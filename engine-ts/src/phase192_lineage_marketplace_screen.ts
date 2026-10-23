/** Phase192: provenance lineage, derivative-document discovery and commercial-list screening.
 * Research-only overlay. Reuses Phase189 exact-product records and Phase191 claim origin
 * validation. Similarity and stars are discovery signals, not original tests or fraud proofs.
 * Methods: Cochrane Handbook Ch4/5, W3C PROV-O, FTC Endorsement Guides,
 * Google Search Central review guidance, Broder (1997) resemblance.
 */
import {createHash} from 'node:crypto';
import {validateDossier189, type ResearchDossier189, type SourceRecord189}
 from './phase189_source_pilot_reasoning.js';
import {inspectSparseEvidence191, type SourceContext191,type RecordOrigin191,
 type FieldRequest191,type EvidenceLandscape191} from './phase191_sparse_source_integrity.js';

export type SelectionBasis192='original_criterion_tests'|'marketplace_stars_only'|
 'product_specifications_only'|'mixed_disclosed_method'|'method_not_disclosed';
export type PageType192='single_product_review'|'ranked_buying_list'|'manufacturer_page'|
 'retailer_page'|'registry'|'report'|'other';
export type StudyLink192='direct_test_claim'|'quoted_or_republished_result'|'unresolved';
export type LineageStrength192='source_and_method_traced'|'research_hypothesis'|'unresolved';
export interface DocumentContext192 {
 sourceId:string;productVariantIds:readonly string[];pageType:PageType192;
 selectionBasis:SelectionBasis192;/** Extract only authorized analysis notes, not copyrighted page copies. */
 analysisText:string; examined:boolean;firstPublished:string|null;
 canonicalHint:string|null; citesSourceIds:readonly string[];
 notes:string;
}
/** A declared test event is NOT an authenticated independently conducted experiment.
 * originSourceId is the purported reporting source, not necessarily earliest URL. */
export interface ClaimLineage192 {
 recordId:string;producerId:string|null;testEventId:string|null;
 originSourceId:string|null;relationship:StudyLink192;strength:LineageStrength192;
 locator:string;
}
export interface DocumentEdge192 {
 sourceA:string;sourceB:string;
 reason:'same_url'|'exact_normalized_text'|'near_duplicate_text'|'explicit_citation';
 evidence:'confirmed_document_match'|'candidate_needs_review';
 resemblance:number|null;
}
export interface Root192 {eventKey:string;producerId:string;testEventId:string;
 originalSourceId:string|null;relatedRecordIds:readonly string[];
 assertion:'reported_origination_not_independently_authenticated';}
export interface CoverageRow192 {category:string;variantId:string;field:string;
 discoveredDocuments:number;examinedDocuments:number;fieldRelevantDocuments:number;uniqueUrls:number;
 marketplaceStarsOnlyLists:number;commercialDocuments:number;
 claimedOriginalEventGroups:number;independentExperimentsVerified:null;
 derivativeOrQuotedRecordCount:number;unresolvedOriginRecords:number;
 evidenceState:string;visibility:string;importantUnknowns:readonly string[];
}
export interface LineageReport192 {phase:192;schema:'192.1';state:'research_only';
 market:string;documentsDiscovered:number;documentsExamined:number;
 documentLinks:readonly DocumentEdge192[];
 tracedEventGroups:readonly Root192[];
 potentialCopiedMeasurements:readonly {recordIds:readonly string[];reason:string}[];
 coverage:readonly CoverageRow192[];
 sourceUse:readonly {sourceId:string;scope:'discovery_only'|'provisional_specification_only'|
  'original_evidence_candidate'|'contextual_research_only';reason:string}[];
 reviewNeeded:readonly string[];
 baseline191:EvidenceLandscape191;
 publicRankingAllowed:false;automaticFraudAllegations:false;
 countIsNotScientificConfidence:true;canonicalOrEarliestDoesNotProveOriginality:true;
}
const id=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_.:-]{0,100}$/.test(s);
const note=(s:unknown)=>typeof s==='string'&&s.length>=12&&s.length<=800&&s.trim()===s;
const unique=(x:readonly string[])=>new Set(x).size===x.length;
const uniqueSorted=(x:readonly string[])=>[...new Set(x)].sort();
const dTypes:PageType192[]=['single_product_review','ranked_buying_list','manufacturer_page',
 'retailer_page','registry','report','other'];
const selection:SelectionBasis192[]=['original_criterion_tests','marketplace_stars_only',
 'product_specifications_only','mixed_disclosed_method','method_not_disclosed'];
const relations:StudyLink192[]=['direct_test_claim','quoted_or_republished_result','unresolved'];
const strengths:LineageStrength192[]=['source_and_method_traced','research_hypothesis','unresolved'];
const isoDate=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&
 !Number.isNaN(Date.parse(s));
const https=(s:unknown)=>typeof s==='string'&&/^https:\/\/[^/\s?#]+\//.test(s)&&s.length<2048;
const tokens=(s:string)=>s.toLowerCase().normalize('NFKC').replace(/[\p{P}\p{S}]+/gu,' ')
 .split(/\s+/).filter(Boolean);
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
function shingles(xs:readonly string[],k=5):Set<string>{const out=new Set<string>();
 for(let i=0;i+k<=xs.length;i++)out.add(xs.slice(i,i+k).join(' '));return out;}
export function resemblance192(a:string,b:string):number{
 const at=tokens(a),bt=tokens(b);if(at.length<25||bt.length<25)return 0;
 const x=shingles(at),y=shingles(bt);let n=0;for(const p of x)if(y.has(p))n++;
 return n/(x.size+y.size-n);
}
/** Remove only known tracking params for detection; never infer ownership from a canonical URL. */
export function normalizeDiscoveryUrl192(s:string):string{
 if(!https(s))throw Error('bad192_url');const u=new URL(s);
 u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(?:tag|ref|ascsubtag|affid|affiliate|fbclid|gclid)$/i.test(k))u.searchParams.delete(k);
 u.searchParams.sort();return u.toString();
}
function validate192(d:ResearchDossier189,docs:readonly DocumentContext192[],lines:readonly ClaimLineage192[]):void{
 validateDossier189(d);
 const pages=new Map(d.sourcePages.map(p=>[p.id,p]));
 if(!Array.isArray(docs)||docs.length!==pages.size||docs.length>80||
  !unique(docs.map(x=>x?.sourceId)))throw Error('invalid192_documents');
 for(const x of docs){
  if(!pages.has(x?.sourceId)||!dTypes.includes(x.pageType)||!selection.includes(x.selectionBasis)||
   !Array.isArray(x.productVariantIds)||x.productVariantIds.length>100||
   !x.productVariantIds.every(id)||!unique(x.productVariantIds)||
   typeof x.analysisText!=='string'||x.analysisText.length>2400||
   typeof x.examined!=='boolean'||(x.firstPublished!==null&&!isoDate(x.firstPublished))||
   (x.canonicalHint!==null&&!https(x.canonicalHint))||
   !Array.isArray(x.citesSourceIds)||!unique(x.citesSourceIds)||
   x.citesSourceIds.some((v:string)=>!id(v)||v===x.sourceId||!pages.has(v))||!note(x.notes))throw Error('invalid192_document');
 }
 for(const record of d.records){
  const x=docs.find(d=>d.sourceId===record.sourceId);
  if(!x?.productVariantIds.includes(record.variantId))throw Error('invalid192_variant_document_mapping');
 }
 const records=new Map(d.records.map(x=>[x.id,x]));
 if(!Array.isArray(lines)||lines.length!==records.size||lines.length>500||
  !unique(lines.map(x=>x?.recordId)))throw Error('invalid192_lineages');
 for(const x of lines){const r=records.get(x?.recordId);
  if(!r||!relations.includes(x.relationship)||!strengths.includes(x.strength)||!note(x.locator)||
    (x.producerId!==null&&!id(x.producerId))||
    (x.testEventId!==null&&!id(x.testEventId))||
    (x.originSourceId!==null&&!pages.has(x.originSourceId))||
    (x.relationship==='direct_test_claim'&&x.originSourceId!==r.sourceId)||
    (x.strength==='source_and_method_traced'&&(!x.producerId||!x.testEventId||!x.originSourceId||x.relationship==='unresolved'))||
    (x.relationship==='unresolved'&&x.strength==='source_and_method_traced')||
    (x.relationship==='quoted_or_republished_result'&&(!x.originSourceId||x.originSourceId===r.sourceId)))
    throw Error('invalid192_lineage');
 }
}
function sameClaim(a:SourceRecord189,b:SourceRecord189):boolean{
 return a.category===b.category&&a.variantId===b.variantId&&a.field===b.field&&
 a.protocol===b.protocol&&a.condition===b.condition&&a.unit===b.unit&&a.value===b.value&&
 a.value!==undefined;
}
/** This classifies use of the SOURCE AS EVIDENCE, not truth of every statement or value of the product. */
function sourceUse192(x:DocumentContext192,ctx:SourceContext191):{scope:LineageReport192['sourceUse'][number]['scope'];reason:string}{
 if(x.selectionBasis==='marketplace_stars_only')return {scope:'discovery_only',
  reason:'Marketplace star averages and sales-oriented top lists are not independent comparative performance tests.'};
 if(x.selectionBasis==='product_specifications_only'||ctx.relationship==='manufacturer_owned'||
  ctx.relationship==='retailer_owned')return {scope:'provisional_specification_only',
  reason:'Retain attributed specifications for potential suitability; no original independent performance result.'};
 if(x.selectionBasis==='original_criterion_tests'&&
  ctx.method==='original_measurement_protocol_described'&&
  ctx.money!=='sponsored'&&ctx.relationship==='independent_editorial')return {
   scope:'original_evidence_candidate',reason:'Reported original method: requires external source and claim review before admission.'};
 return {scope:'contextual_research_only',reason:'Experience, mixed evidence or undisclosed methodology requires claim-level review; not a ranking vote.'};
}
export function analyzeSourceLineage192(args:{dossier:ResearchDossier189;
 contexts:readonly SourceContext191[];origins:readonly RecordOrigin191[];
 requests:readonly FieldRequest191[];documents:readonly DocumentContext192[];
 lineage:readonly ClaimLineage192[]}):LineageReport192{
 const {dossier:d,documents:docs,lineage,contexts,origins,requests}=args;
 const baseline191=inspectSparseEvidence191({dossier:d,contexts,origins,requests});
 validate192(d,docs,lineage);
 const dc=new Map(docs.map(x=>[x.sourceId,x]));
 const srcCtx=new Map(contexts.map(x=>[x.sourceId,x]));
 const page=new Map(d.sourcePages.map(x=>[x.id,x]));
 const lineageById=new Map(lineage.map(x=>[x.recordId,x]));
 const edges:DocumentEdge192[]=[];
 const ordered=[...docs].sort((a,b)=>a.sourceId.localeCompare(b.sourceId));
 for(let i=0;i<ordered.length;i++)for(let j=i+1;j<ordered.length;j++){
  const a=ordered[i],b=ordered[j];const ua=normalizeDiscoveryUrl192(page.get(a.sourceId)!.url),
   ub=normalizeDiscoveryUrl192(page.get(b.sourceId)!.url);
  const ta=tokens(a.analysisText),tb=tokens(b.analysisText);
  const eq=ta.length>=25&&tb.length>=25&&sha(ta.join(' '))===sha(tb.join(' '));
  const similar=eq?1:resemblance192(a.analysisText,b.analysisText);
  if(ua===ub)edges.push({sourceA:a.sourceId,sourceB:b.sourceId,reason:'same_url',evidence:'confirmed_document_match',resemblance:null});
  else if(eq)edges.push({sourceA:a.sourceId,sourceB:b.sourceId,reason:'exact_normalized_text',
   evidence:'confirmed_document_match',resemblance:1});
  else if(similar>=0.72)edges.push({sourceA:a.sourceId,sourceB:b.sourceId,reason:'near_duplicate_text',
   evidence:'candidate_needs_review',resemblance:Number(similar.toFixed(4))});
  if(a.citesSourceIds.includes(b.sourceId)||b.citesSourceIds.includes(a.sourceId))
    edges.push({sourceA:a.sourceId,sourceB:b.sourceId,reason:'explicit_citation',
     evidence:'candidate_needs_review',resemblance:null});
 }
 const roots=new Map<string,{producerId:string;testEventId:string;originSourceId:string|null;recordIds:string[]}>();
 const claimOrigins=new Map(origins.map(x=>[x.recordId,x]));
 // A name for a test event does not establish one: the Phase191 per-claim origin,
 // method and source context must agree before it is even a *reported* root.
 const reportedOriginal=(r:SourceRecord189)=>{
  const o=claimOrigins.get(r.id)!,c=srcCtx.get(r.sourceId)!,doc=dc.get(r.sourceId)!;
  return r.kind==='instrument_measurement'&&!r.derivedFrom?.length&&
   ['publisher_performed_original_test','outside_lab_original_test'].includes(o.origin)&&
   o.methodTrace==='manually_traced_to_original_method'&&
   ((c.relationship==='independent_editorial'&&c.method==='original_measurement_protocol_described')||
    (c.relationship==='official_registry'&&c.method==='certificate_scope_documented'))&&
   c.money!=='sponsored'&&doc.selectionBasis==='original_criterion_tests';
 };
 for(const r of d.records){const l=lineageById.get(r.id)!;
  if(l.strength!=='source_and_method_traced'||l.relationship!=='direct_test_claim'||!reportedOriginal(r))continue;
  const key=l.producerId+':'+l.testEventId;
  let group=roots.get(key);
  if(!group){group={producerId:l.producerId!,testEventId:l.testEventId!,originSourceId:l.originSourceId,recordIds:[]};roots.set(key,group);}
  else if(group.originSourceId!==l.originSourceId)throw Error('conflicting192_origin_source');
  group.recordIds.push(r.id);
 }
 // Add derived/requoted reports to an already eligible originating event; don't
 // create a new event because a copied outlet declares a lab identifier.
 for(const r of d.records){const l=lineageById.get(r.id)!;
  if(l.relationship!=='quoted_or_republished_result'||l.strength!=='source_and_method_traced')continue;
  const key=l.producerId+':'+l.testEventId,root=roots.get(key);
  if(root&&root.originSourceId===l.originSourceId)root.recordIds.push(r.id);
 }
 // Similar reported measurements without a verified shared event only trigger review.
 const candidateCopied:LineageReport192['potentialCopiedMeasurements'][number][]=[];
 const seenPairs=new Set<string>();
 for(let i=0;i<d.records.length;i++)for(let j=i+1;j<d.records.length;j++){
  const a=d.records[i],b=d.records[j],la=lineageById.get(a.id)!,lb=lineageById.get(b.id)!;
  if(a.sourceId===b.sourceId||!sameClaim(a,b))continue;
  const sameEvent=la.producerId&&la.testEventId&&la.producerId===lb.producerId&&la.testEventId===lb.testEventId;
  if(sameEvent)continue;
  const pair=[a.id,b.id].sort().join(':');if(!seenPairs.has(pair)){
   seenPairs.add(pair);candidateCopied.push({recordIds:[a.id,b.id].sort(),
    reason:'Identical product, field, value, unit, method and conditions from different outlets. This is a COPY CANDIDATE, never proof of copied measurement or fraud.'});
  }
 }
 const use=ordered.map(x=>({sourceId:x.sourceId,...sourceUse192(x,srcCtx.get(x.sourceId)!)}));
 const coverage:CoverageRow192[]=baseline191.findings.map(f=>{
  const applicableDocs=ordered.filter(x=>x.productVariantIds.includes(f.variantId));
  const records=d.records.filter(r=>r.category===f.category&&r.variantId===f.variantId&&r.field===f.field);
  const fieldLines=records.map(r=>lineageById.get(r.id)!);
  const knownRecords=new Set(records.map(x=>x.id));
  const events=uniqueSorted([...roots].filter(([,group])=>group.recordIds.some(x=>knownRecords.has(x))).map(([key])=>key));
  return {category:f.category,variantId:f.variantId,field:f.field,
   discoveredDocuments:applicableDocs.length,examinedDocuments:applicableDocs.filter(x=>x.examined).length,
   fieldRelevantDocuments:new Set(records.map(r=>r.sourceId)).size,
   uniqueUrls:new Set(applicableDocs.map(x=>normalizeDiscoveryUrl192(page.get(x.sourceId)!.url))).size,
   marketplaceStarsOnlyLists:applicableDocs.filter(x=>x.selectionBasis==='marketplace_stars_only').length,
   commercialDocuments:applicableDocs.filter(x=>{
    const y=srcCtx.get(x.sourceId)!;return ['sponsored','affiliate_disclosed','advertising_disclosed'].includes(y.money)||
      ['manufacturer_owned','retailer_owned'].includes(y.relationship);}).length,
   claimedOriginalEventGroups:events.length,independentExperimentsVerified:null,
   derivativeOrQuotedRecordCount:fieldLines.filter(l=>l.relationship==='quoted_or_republished_result').length,
   unresolvedOriginRecords:fieldLines.filter(l=>l.strength==='unresolved').length,
   evidenceState:f.knowledgeState,visibility:f.visibility,importantUnknowns:f.researchActions};
 });
 const reviewNeeded=[...candidateCopied.map(x=>'Check possible shared measurement: '+x.recordIds.join(', ')),
 ...edges.filter(x=>x.evidence==='candidate_needs_review').map(x=>`Review ${x.reason}: ${x.sourceA} <> ${x.sourceB}`),
 ...use.filter(x=>x.scope==='discovery_only').map(x=>`Exclude ${x.sourceId} marketplace-only ranking from performance evidence; retain discovered models.`),
 ...coverage.filter(x=>x.unresolvedOriginRecords>0).map(x=>`Trace ${x.variantId}/${x.field} to source experiment.`)];
 return {phase:192,schema:'192.1',state:'research_only',market:d.market,documentsDiscovered:docs.length,
  documentsExamined:docs.filter(x=>x.examined).length,
  documentLinks:edges.sort((a,b)=>a.sourceA.localeCompare(b.sourceA)||a.sourceB.localeCompare(b.sourceB)||a.reason.localeCompare(b.reason)),
  tracedEventGroups:[...roots].sort(([a],[b])=>a.localeCompare(b)).map(([eventKey,v])=>({eventKey,
   producerId:v.producerId,testEventId:v.testEventId,originalSourceId:v.originSourceId,
   relatedRecordIds:v.recordIds.sort(),assertion:'reported_origination_not_independently_authenticated'})),
  potentialCopiedMeasurements:candidateCopied.sort((a,b)=>a.recordIds[0].localeCompare(b.recordIds[0])),
  coverage:coverage.sort((a,b)=>a.category.localeCompare(b.category)||a.variantId.localeCompare(b.variantId)||a.field.localeCompare(b.field)),
  sourceUse:use,reviewNeeded:uniqueSorted(reviewNeeded),baseline191,
  publicRankingAllowed:false,automaticFraudAllegations:false,countIsNotScientificConfidence:true,
  canonicalOrEarliestDoesNotProveOriginality:true};
}
