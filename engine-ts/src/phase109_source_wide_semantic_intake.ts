/**
 * Phase 109 — source-wide, request-neutral review coverage and semantic atom ledger.
 *
 * No article body, quotation, embeddings, user preferences or request IDs are
 * persisted. The caller's authorized, separately vetted document parser and
 * extraction system supply an inventory of addressable source segments and
 * candidate coded observations. The ledger is a coverage/adjudication gate,
 * NOT a claim that an AI has found every meaningful fact in an arbitrary page.
 *
 * One original test may have multiple reports; testId is for original evidence
 * lineage, reportId+source revision for audit coverage. New aspects can be
 * discovered without knowing a criterion at ingestion, then mapped later.
 * Unmapped atoms never become ranked product facts by default.
 */
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';

const id=(x:unknown):x is string=>typeof x==='string'&&/^[a-z][a-z0-9_]{0,94}$/.test(x);
const sha=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const ref=(x:unknown):x is string=>typeof x==='string'&&x.trim().length>=12&&x.length<=600;
const url=(x:unknown):x is string=>typeof x==='string'&&/^https:\/\/[^\s/@?#]+(?:\/[^\s]*)?$/.test(x)&&x.length<1500;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const exact=(v:object,keys:string[])=>Object.keys(v).sort().join('|')===keys.sort().join('|');
const atomFields=['atomId','segmentId','variantId','relatedVariantIds','conceptId','criterionId',
  'kind','polarity','assertionCode','evidenceMode','conditionCodes','reviewReference','isProvisional',
  'epistemicStatus'];
const domainFields=['reportId','originalTestId','sourceUrl','sourceRevisionSha256','categoryId',
  'inventoryReviewReference','inventoryReviewerId','segments'];
const kinds=['observation','measurement','comparison','limitation','benefit','risk','usability',
  'durability','method','context','compatibility','maintenance','interaction','uncertainty',
  'temporal','other'] as const;
const polarities=['favorable','unfavorable','mixed','neutral','not_applicable'] as const;
const modes=['direct_test','expert_judgement','manufacturer_attribution','inference','unverified'] as const;
const surfaces=['paragraph','table','figure','caption','footnote','methodology','interactive',
  'structured_data','video','other'] as const;
const statuses=['extracted','no_product_observation','blocked'] as const;

export interface SourceSegment109 {
  segmentId:string;locator:string;spanSha256:string;
  surface:typeof surfaces[number];
  /** The manifest must include non-textual content, which may be blocked. */
  accessible:boolean;
}
/** Build a declared full-source inventory from approved parser output, in memory.
 * A text block is hashed immediately and is NOT included in the return value.
 * This function cannot establish that the upstream parser found every block;
 * external rendered-page audit and independent claim recall remain necessary.
 */
export function makeEphemeralInventory109(input:{
  reportId:string;originalTestId:string;sourceUrl:string;categoryId:string;
  inventoryReviewerId:string;inventoryReviewReference:string;
  blocks:{segmentId:string;locator:string;surface:typeof surfaces[number];
    accessible:boolean;content?:string;}[];
}):WholeReviewManifest109{
  if(!input||!Array.isArray(input.blocks)||!input.blocks.length||input.blocks.length>10000)
    throw Error('missing_source_blocks');
  const segments:SourceSegment109[]=input.blocks.map(block=>{
    if(!block||!exact(block,['segmentId','locator','surface','accessible',
      ...(block.content!==undefined?['content']:[])])||
      (block.accessible&&(!block.content||block.content.length>200000))||
      (!block.accessible&&block.content!==undefined))throw Error('invalid_ephemeral_source_block');
    return {segmentId:block.segmentId,locator:block.locator,surface:block.surface,
      accessible:block.accessible,spanSha256:hash(block.accessible?block.content:'unavailable:'+block.locator)};
  });
  const sourceRevisionSha256=hash(segments.map(s=>[s.segmentId,s.locator,s.spanSha256,s.accessible]));
  return {reportId:input.reportId,originalTestId:input.originalTestId,sourceUrl:input.sourceUrl,
    sourceRevisionSha256,categoryId:input.categoryId,
    inventoryReviewerId:input.inventoryReviewerId,
    inventoryReviewReference:input.inventoryReviewReference,segments};
}
export interface WholeReviewManifest109 {
  reportId:string;originalTestId:string;sourceUrl:string;sourceRevisionSha256:string;
  categoryId:string;inventoryReviewReference:string;inventoryReviewerId:string;
  /** Source-wide inventory — its real completeness must be independently audited. */
  segments:SourceSegment109[];
}
export interface SemanticAtom109 {
  atomId:string;segmentId:string;variantId:string;relatedVariantIds:string[];
  /** Unknown aspects are preserved with criterionId=null; never silently dropped. */
  conceptId:string;criterionId:string|null;
  kind:typeof kinds[number];polarity:typeof polarities[number];
  /** Stable normalized vocabulary key, never the source sentence or quotation. */
  assertionCode:string;
  evidenceMode:typeof modes[number];conditionCodes:string[];
  /** Explicitly distinguish absence of evidence from a documented negative. */
  epistemicStatus:'observed'|'attributed'|'hedged'|'not_assessed';
  /** Optional typed payloads, never prose or model-generated synthetic numbers. */
  quantity?:{value:number;unitCode:string;protocolId:string;uncertainty?:number};
  relation?:{direction:'better'|'worse'|'equivalent'|'different';targetVariantId:string;
    basis:'same_original_test'|'reviewed_external_bridge';bridgeReference?:string};
  reviewReference:string;
  /** Until an independent review approves it, an atom cannot be promoted. */
  isProvisional:boolean;
}
export interface SegmentAudit109 {
  segmentId:string;status:typeof statuses[number];
  atomIds:string[];
  /** Required even when segment is deemed irrelevant. */
  reviewReference:string;
  noObservationReason?:'navigation'|'advertisement'|'publisher_metadata'|'no_product_claim';
}
export interface Mapping109 {conceptId:string;criterionId:string;reviewerId:string;
  scope:'whole_category';methodologyReference:string;approvalReference:string;}
export interface CoverageReport109 {
  reportId:string;declaredSegments:number;reviewedSegments:number;atoms:number;
  provisionalAtoms:number;unmappedAtoms:number;blockedSegments:string[];
  unreviewedSegments:string[];unreconciledSegments:string[];unmappedConcepts:string[];
  canSeal:boolean;sealed:boolean;
  /** This cannot certify that a source parser found every sentence or figure. */
  completenessClaim:'declared_inventory_only_not_document_recall';
}
export class SourceWideSemanticMemory109 {
  private db:DatabaseSync;
  constructor(path=':memory:'){
    this.db=new DatabaseSync(path);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
      CREATE TABLE IF NOT EXISTS source_reports (
        report_id TEXT PRIMARY KEY, payload TEXT NOT NULL, digest TEXT NOT NULL,
        sealed_reference TEXT);
      CREATE TABLE IF NOT EXISTS source_segments (
        report_id TEXT NOT NULL,segment_id TEXT NOT NULL,payload TEXT NOT NULL,
        PRIMARY KEY(report_id,segment_id),
        FOREIGN KEY(report_id) REFERENCES source_reports(report_id));
      CREATE TABLE IF NOT EXISTS semantic_atoms (
        report_id TEXT NOT NULL,atom_id TEXT NOT NULL,segment_id TEXT NOT NULL,
        payload TEXT NOT NULL,PRIMARY KEY(report_id,atom_id),
        FOREIGN KEY(report_id,segment_id) REFERENCES source_segments(report_id,segment_id));
      CREATE TABLE IF NOT EXISTS segment_audits (
        report_id TEXT NOT NULL,segment_id TEXT NOT NULL,payload TEXT NOT NULL,
        PRIMARY KEY(report_id,segment_id),
        FOREIGN KEY(report_id,segment_id) REFERENCES source_segments(report_id,segment_id));
      CREATE TABLE IF NOT EXISTS concept_maps (
        category_id TEXT NOT NULL,concept_id TEXT NOT NULL,payload TEXT NOT NULL,
        PRIMARY KEY(category_id,concept_id));`);
  }
  close(){this.db.close();}
  private record(reportId:string){
    const r=this.db.prepare('SELECT payload,digest,sealed_reference FROM source_reports WHERE report_id=?')
      .get(reportId) as {payload:string;digest:string;sealed_reference:string|null}|undefined;
    if(!r)throw Error('unknown_source_report');return r;
  }
  register(m:WholeReviewManifest109){
    if(!m||!exact(m,domainFields)||![m.reportId,m.originalTestId,m.categoryId,m.inventoryReviewerId].every(id)||
      !url(m.sourceUrl)||!sha(m.sourceRevisionSha256)||!ref(m.inventoryReviewReference)||
      !Array.isArray(m.segments)||m.segments.length===0||m.segments.length>10000)throw Error('invalid_source_inventory');
    const seen=new Set<string>();
    for(const s of m.segments){
      if(!s||!exact(s,['segmentId','locator','spanSha256','surface','accessible'])||
        !id(s.segmentId)||typeof s.locator!=='string'||s.locator.length<2||s.locator.length>300||
        !sha(s.spanSha256)||!surfaces.includes(s.surface)||typeof s.accessible!=='boolean'||seen.has(s.segmentId))
        throw Error('invalid_or_duplicate_source_segment');
      seen.add(s.segmentId);
    }
    const existing=this.db.prepare('SELECT digest FROM source_reports WHERE report_id=?').get(m.reportId) as {digest:string}|undefined;
    const digest=hash(m);
    if(existing){if(existing.digest!==digest)throw Error('report_revision_requires_new_inventory');return;}
    this.db.exec('BEGIN IMMEDIATE');
    try{
      this.db.prepare('INSERT INTO source_reports(report_id,payload,digest) VALUES (?,?,?)').run(m.reportId,JSON.stringify(m),digest);
      const add=this.db.prepare('INSERT INTO source_segments(report_id,segment_id,payload) VALUES (?,?,?)');
      for(const s of m.segments)add.run(m.reportId,s.segmentId,JSON.stringify(s));
      this.db.exec('COMMIT');
    }catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  addAtom(reportId:string,a:SemanticAtom109){
    const report=this.record(reportId);
    if(report.sealed_reference)throw Error('sealed_report_is_immutable');
    if(!a||!exact(a,[...atomFields,...(a.quantity!==undefined?['quantity']:[]),
      ...(a.relation!==undefined?['relation']:[])])||![a.atomId,a.segmentId,a.variantId,a.conceptId,a.assertionCode].every(id)||
      (a.criterionId!==null&&!id(a.criterionId))||!Array.isArray(a.relatedVariantIds)||
      a.relatedVariantIds.some(v=>!id(v)||v===a.variantId)||new Set(a.relatedVariantIds).size!==a.relatedVariantIds.length||
      !kinds.includes(a.kind)||!polarities.includes(a.polarity)||!modes.includes(a.evidenceMode)||
      !['observed','attributed','hedged','not_assessed'].includes(a.epistemicStatus)||
      (a.epistemicStatus==='not_assessed'&&a.polarity!=='not_applicable')||
      (a.kind==='measurement')!==(a.quantity!==undefined)||
      (a.kind==='comparison')!==(a.relation!==undefined)||
      (a.quantity!==undefined&&(
        !exact(a.quantity,['value','unitCode','protocolId',
          ...(a.quantity.uncertainty!==undefined?['uncertainty']:[])])||
        typeof a.quantity.value!=='number'||!Number.isFinite(a.quantity.value)||
        !id(a.quantity.unitCode)||!id(a.quantity.protocolId)||
        (a.quantity.uncertainty!==undefined&&(!Number.isFinite(a.quantity.uncertainty)||a.quantity.uncertainty<0))))||
      (a.relation!==undefined&&(!exact(a.relation,['direction','targetVariantId','basis',
          ...(a.relation.bridgeReference!==undefined?['bridgeReference']:[])])||
        !['better','worse','equivalent','different'].includes(a.relation.direction)||
        !id(a.relation.targetVariantId)||!a.relatedVariantIds.includes(a.relation.targetVariantId)||
        !['same_original_test','reviewed_external_bridge'].includes(a.relation.basis)||
        (a.relation.basis==='reviewed_external_bridge'&&!ref(a.relation.bridgeReference))||
        (a.relation.basis==='same_original_test'&&a.relation.bridgeReference!==undefined)))||
      !Array.isArray(a.conditionCodes)||a.conditionCodes.some(x=>!id(x))||
      new Set(a.conditionCodes).size!==a.conditionCodes.length||!ref(a.reviewReference)||
      typeof a.isProvisional!=='boolean')throw Error('invalid_or_query_influenced_semantic_atom');
    const seg=this.db.prepare('SELECT payload FROM source_segments WHERE report_id=? AND segment_id=?')
      .get(reportId,a.segmentId) as {payload:string}|undefined;
    if(!seg||!JSON.parse(seg.payload).accessible)throw Error('unavailable_or_unknown_source_segment');
    const old=this.db.prepare('SELECT payload FROM semantic_atoms WHERE report_id=? AND atom_id=?').get(reportId,a.atomId) as {payload:string}|undefined;
    if(old){if(hash(JSON.parse(old.payload))!==hash(a))throw Error('immutable_atom_requires_new_revision');return;}
    this.db.prepare('INSERT INTO semantic_atoms(report_id,atom_id,segment_id,payload) VALUES (?,?,?,?)')
      .run(reportId,a.atomId,a.segmentId,JSON.stringify(a));
  }
  auditSegment(reportId:string,a:SegmentAudit109){
    const report=this.record(reportId);if(report.sealed_reference)throw Error('sealed_report_is_immutable');
    const segment=this.db.prepare('SELECT payload FROM source_segments WHERE report_id=? AND segment_id=?')
      .get(reportId,a?.segmentId) as {payload:string}|undefined;
    if(!segment||!a||typeof a!=='object'||
      !exact(a,['segmentId','status','atomIds','reviewReference',...(a.noObservationReason!==undefined?['noObservationReason']:[])])||
      !statuses.includes(a.status)||!ref(a.reviewReference)||!Array.isArray(a.atomIds)||
      a.atomIds.some(x=>!id(x))||new Set(a.atomIds).size!==a.atomIds.length)throw Error('invalid_segment_audit');
    if(a.status==='extracted'){
      if(a.atomIds.length===0||a.noObservationReason!==undefined||!JSON.parse(segment.payload).accessible)
        throw Error('extracted_segment_must_have_reviewed_atoms');
      const existing=(this.db.prepare('SELECT atom_id,payload FROM semantic_atoms WHERE report_id=? AND segment_id=?')
        .all(reportId,a.segmentId) as {atom_id:string;payload:string}[]);
      // All recorded observations on this segment must be reviewed, no cherry-picking.
      if(existing.length!==a.atomIds.length||existing.some(x=>!a.atomIds.includes(x.atom_id)||JSON.parse(x.payload).isProvisional))
        throw Error('segment_has_unreviewed_or_omitted_atoms');
    }else if(a.status==='no_product_observation'){
      if(a.atomIds.length||!a.noObservationReason||!JSON.parse(segment.payload).accessible||
        this.db.prepare('SELECT 1 FROM semantic_atoms WHERE report_id=? AND segment_id=?').get(reportId,a.segmentId))
        throw Error('unfounded_empty_segment');
    }else if(a.atomIds.length||a.noObservationReason!==undefined)throw Error('blocked_segment_cannot_claim_evidence');
    const old=this.db.prepare('SELECT payload FROM segment_audits WHERE report_id=? AND segment_id=?')
      .get(reportId,a.segmentId) as {payload:string}|undefined;
    if(old){if(hash(JSON.parse(old.payload))!==hash(a))throw Error('audit_revision_requires_new_version');return;}
    this.db.prepare('INSERT INTO segment_audits(report_id,segment_id,payload) VALUES (?,?,?)')
      .run(reportId,a.segmentId,JSON.stringify(a));
  }
  adoptMapping(categoryId:string,m:Mapping109){
    if(!id(categoryId)||!m||!exact(m,['conceptId','criterionId','reviewerId','scope','methodologyReference','approvalReference'])||
      ![m.conceptId,m.criterionId,m.reviewerId].every(id)||m.scope!=='whole_category'||
      !ref(m.methodologyReference)||!ref(m.approvalReference))throw Error('invalid_independent_category_mapping');
    const old=this.db.prepare('SELECT payload FROM concept_maps WHERE category_id=? AND concept_id=?')
      .get(categoryId,m.conceptId) as {payload:string}|undefined;
    if(old){if(hash(JSON.parse(old.payload))!==hash(m))throw Error('mapping_requalification_required');return;}
    this.db.prepare('INSERT INTO concept_maps(category_id,concept_id,payload) VALUES (?,?,?)')
      .run(categoryId,m.conceptId,JSON.stringify(m));
  }
  effectiveCriterion(reportId:string,atomId:string):string|null{
    const report=this.record(reportId),r=JSON.parse(report.payload) as WholeReviewManifest109;
    const row=this.db.prepare('SELECT payload FROM semantic_atoms WHERE report_id=? AND atom_id=?')
      .get(reportId,atomId) as {payload:string}|undefined;
    if(!row)throw Error('unknown_atom');
    const a=JSON.parse(row.payload) as SemanticAtom109;
    const map=this.db.prepare('SELECT payload FROM concept_maps WHERE category_id=? AND concept_id=?')
      .get(r.categoryId,a.conceptId) as {payload:string}|undefined;
    // Mapping a provisional/open-world aspect never overwrites the source atom.
    if(a.criterionId!==null)return a.criterionId;
    return map?(JSON.parse(map.payload) as Mapping109).criterionId:null;
  }
  coverage(reportId:string):CoverageReport109{
    const report=this.record(reportId),m=JSON.parse(report.payload) as WholeReviewManifest109;
    const audits=new Map((this.db.prepare('SELECT segment_id,payload FROM segment_audits WHERE report_id=?')
      .all(reportId) as {segment_id:string;payload:string}[]).map(x=>[x.segment_id,JSON.parse(x.payload) as SegmentAudit109]));
    const atoms=(this.db.prepare('SELECT payload FROM semantic_atoms WHERE report_id=?')
      .all(reportId) as {payload:string}[]).map(x=>JSON.parse(x.payload) as SemanticAtom109);
    const blocked=m.segments.filter(s=>!s.accessible||audits.get(s.segmentId)?.status==='blocked').map(s=>s.segmentId);
    const unreviewed=m.segments.filter(s=>!audits.has(s.segmentId)).map(s=>s.segmentId);
    const unreconciled=m.segments.filter(s=>{
      const a=audits.get(s.segmentId);
      if(!a)return false;
      const segmentAtoms=atoms.filter(x=>x.segmentId===s.segmentId);
      if(a.status==='extracted')return segmentAtoms.length!==a.atomIds.length||
        segmentAtoms.some(x=>!a.atomIds.includes(x.atomId));
      return segmentAtoms.length!==0;
    }).map(s=>s.segmentId);
    const unmapped=atoms.filter(a=>this.effectiveCriterion(reportId,a.atomId)===null);
    const provisional=atoms.filter(a=>a.isProvisional);
    return {reportId,declaredSegments:m.segments.length,reviewedSegments:audits.size,
      atoms:atoms.length,provisionalAtoms:provisional.length,unmappedAtoms:unmapped.length,
      blockedSegments:blocked,unreviewedSegments:unreviewed,unreconciledSegments:unreconciled,
      unmappedConcepts:[...new Set(unmapped.map(a=>a.conceptId))].sort(),
      canSeal:blocked.length===0&&unreviewed.length===0&&unreconciled.length===0&&provisional.length===0,
      sealed:report.sealed_reference!==null,
      completenessClaim:'declared_inventory_only_not_document_recall'};
  }
  seal(reportId:string,reference:string){
    const report=this.record(reportId),status=this.coverage(reportId);
    if(!ref(reference)||!status.canSeal)throw Error('incomplete_source_wide_extraction');
    if(report.sealed_reference){if(report.sealed_reference!==reference)throw Error('sealed_report_is_immutable');return;}
    this.db.prepare('UPDATE source_reports SET sealed_reference=? WHERE report_id=?').run(reference,reportId);
  }
  /** A later user query only reads this memory. Never reinterprets the article. */
  atomsForVariant(reportId:string,variantId:string):SemanticAtom109[]{
    if(!id(variantId))throw Error('invalid_variant');
    this.record(reportId);
    return (this.db.prepare('SELECT payload FROM semantic_atoms WHERE report_id=? ORDER BY atom_id')
      .all(reportId) as {payload:string}[]).map(x=>JSON.parse(x.payload) as SemanticAtom109)
      .filter(a=>a.variantId===variantId||a.relatedVariantIds.includes(variantId));
  }
  allAtoms(reportId:string):SemanticAtom109[]{
    this.record(reportId);return (this.db.prepare('SELECT payload FROM semantic_atoms WHERE report_id=? ORDER BY atom_id')
      .all(reportId) as {payload:string}[]).map(x=>JSON.parse(x.payload) as SemanticAtom109);
  }
  /** Structural bridge for review: no user intent, no publication or automatic Phase101 write. */
  canonicalAdmissionCheck(reportId:string,atomId:string,criterionId:string,variantId:string):{
    reportId:string;atomId:string;criterionId:string;variantId:string;reportOriginalTestId:string;
    sourceRevisionSha256:string;segmentSha256:string;segmentLocator:string;
    approvedForDownstreamReview:true;
  }{
    const r=this.record(reportId),c=this.coverage(reportId),m=JSON.parse(r.payload) as WholeReviewManifest109;
    if(!c.sealed||!c.canSeal)throw Error('source_not_fully_reconciled');
    const a=this.allAtoms(reportId).find(x=>x.atomId===atomId);
    if(!a||a.isProvisional||a.evidenceMode==='unverified'||a.evidenceMode==='inference'||
      a.epistemicStatus==='not_assessed'||
      !id(criterionId)||criterionId!==this.effectiveCriterion(reportId,atomId)||
      (a.variantId!==variantId&&!a.relatedVariantIds.includes(variantId)))throw Error('atom_not_independently_promotable');
    const segment=m.segments.find(s=>s.segmentId===a.segmentId)!;
    return {reportId,atomId,criterionId,variantId,reportOriginalTestId:m.originalTestId,
      sourceRevisionSha256:m.sourceRevisionSha256,segmentSha256:segment.spanSha256,
      segmentLocator:segment.locator,approvedForDownstreamReview:true};
  }
}
