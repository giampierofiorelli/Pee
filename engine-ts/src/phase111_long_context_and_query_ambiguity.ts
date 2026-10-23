/**
 * Phase 111 — LONG CONTEXT / AMBIGUITY GUARDS (experimental; not validated NLP).
 * Source understanding is ALWAYS independent of consumer query. No source prose
 * or query history is written to Phase109 canonical memory by this module.
 * Splitting a long source is NOT semantic comprehension: cross-window scope,
 * negation, conditions, attribution and coreference need separate adjudication.
 */
import {createHash} from 'node:crypto';
import {extractReview110, type Model110, type SourceInput110, type ExtractionPacket110} from './phase110_local_semantic_extractor.js';
import {makeEphemeralInventory109} from './phase109_source_wide_semantic_intake.js';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const ident=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_]{0,90}$/.test(s);
export interface SourceWindow111 {windowId:string;parentId:string;start:number;end:number;
  sourceSha256:string;windowSha256:string;neighborBefore:string|null;neighborAfter:string|null;}
export interface WindowPlan111 {windowedInput:SourceInput110;windows:SourceWindow111[];
  crossWindowReviewRequired:string[]; coverage:'all_accessible_utf16_units_inventoried_not_semantic_recall';}
function safeEnd(text:string,start:number,desired:number,minimum:number){
  let end=Math.min(text.length,desired);
  if(end<text.length && end>start && /[\uD800-\uDBFF]/.test(text[end-1])&&
    /[\uDC00-\uDFFF]/.test(text[end]))end--;
  if(end<text.length&&end-start>minimum){
    const breakAt=Math.max(text.lastIndexOf('\n',end-1),text.lastIndexOf('. ',end-2),text.lastIndexOf(' ',end-1));
    if(breakAt>start+minimum && breakAt>=end-500)end=breakAt+1;
  }
  if(end<=start)throw Error('invalid_split_boundary');
  return end;
}
/** Creates ephemeral overlapping windows, not a summary. Never silently truncates. */
export function planLongSource111(input:SourceInput110,options?:{windowUnits?:number;overlapUnits?:number}):WindowPlan111{
  const max=options?.windowUnits??6000,overlap=options?.overlapUnits??600;
  if(!Number.isInteger(max)||!Number.isInteger(overlap)||max<1200||max>13000||
    overlap<150||overlap>=max/2)throw Error('invalid_window_policy');
  if(!input||!Array.isArray(input.blocks)||!input.blocks.length||!Array.isArray(input.variants)||
    !ident(input.reportId)||Object.keys(input).sort().join('|')!==
    ['reportId','originalTestId','sourceUrl','categoryId','inventoryReviewerId',
      'inventoryReviewReference','variants','blocks'].sort().join('|')||
    !input.variants.every(ident))throw Error('invalid_source');
  const blocks:SourceInput110['blocks']=[],windows:SourceWindow111[]=[],multi:string[]=[];
  const seen=new Set<string>();
  for(const block of input.blocks){
    if(!ident(block.segmentId)||seen.has(block.segmentId))throw Error('invalid_segment_identity');
    seen.add(block.segmentId);
    const blockKeys=['segmentId','locator','surface','accessible','representation',
      ...(block.content!==undefined?['content']:[])];
    if(Object.keys(block).sort().join('|')!==blockKeys.sort().join('|')||
      typeof block.locator!=='string'||block.locator.length<2||block.locator.length>280||
      !['paragraph','table','figure','caption','footnote','methodology','interactive',
        'structured_data','video','other'].includes(block.surface)||
      !['complete','partial','unavailable'].includes(block.representation)||
      typeof block.accessible!=='boolean'||
      (block.accessible&&(typeof block.content!=='string'||!block.content.length||block.content.length>20000000))||
      (!block.accessible&&block.content!==undefined)||
      (block.representation==='unavailable'&&block.accessible))throw Error('invalid_source_block');
    if(!block.accessible||block.representation!=='complete'||!block.content){
      blocks.push({...block});continue;
    }
    const content=block.content, spans:{start:number;end:number;id:string}[]=[];
    let start=0,i=0;
    while(start<content.length){
      if(i>=5000)throw Error('document_exceeds_safety_budget');
      const end=safeEnd(content,start,start+max,Math.floor(max*.55));
      const id=`${block.segmentId}_w${String(i+1).padStart(4,'0')}`;
      if(id.length>94||!ident(id))throw Error('window_id_overflow');
      const slice=content.slice(start,end);
      blocks.push({...block,segmentId:id,locator:(block.locator+'@'+start+':'+end).slice(0,290),content:slice});
      spans.push({start,end,id});
      if(end===content.length)break;
      let next=Math.max(0,end-overlap);
      // Keep UTF-16 surrogate pairs together at the beginning of a window.
      if(next>0 && /[\uDC00-\uDFFF]/.test(content[next])&&/[\uD800-\uDBFF]/.test(content[next-1]))next--;
      if(next<=start)throw Error('split_without_progress');
      start=next;i++;
    }
    if(spans.length>1)multi.push(block.segmentId);
    for(const [j,span] of spans.entries())windows.push({
      windowId:span.id,parentId:block.segmentId,start:span.start,end:span.end,
      sourceSha256:digest(content),windowSha256:digest(content.slice(span.start,span.end)),
      neighborBefore:spans[j-1]?.id??null,neighborAfter:spans[j+1]?.id??null
    });
    if(spans[0]?.start!==0||spans.at(-1)?.end!==content.length||
      spans.some((s,j)=>j>0&&s.start>spans[j-1].end))throw Error('coverage_gap');
  }
  if(blocks.length>10000||!ident(input.reportId+'_windowed'))throw Error('too_many_windows_or_invalid_revision');
  // Same original test/source, fresh inventory revision. Does not expose discovery query.
  return {windowedInput:{...input,reportId:input.reportId+'_windowed',blocks},windows,
    crossWindowReviewRequired:multi,coverage:'all_accessible_utf16_units_inventoried_not_semantic_recall'};
}


/** An executable continuation of Phase110, with explicit overlap reconciliation.
 * No packet from this method is automatically approved or committed to Phase109.
 * All claims within overlapping windows may represent ONE original observation.
 */
export async function extractLongReview111(input:SourceInput110,model:Model110,
  options?:{windowUnits?:number;overlapUnits?:number}){
  const plan=planLongSource111(input,options);
  const packet=await extractReview110(plan.windowedInput,model);
  const parentByWindow=new Map(plan.windows.map(w=>[w.windowId,w]));
  const candidates=packet.proposed.map(c=>{
    const parent=parentByWindow.get(c.atom.segmentId);
    if(!parent)throw Error('claim_outside_partition');
    return {atomId:c.atom.atomId,parentId:parent.parentId,
      originalStart:parent.start+c.proof.start,originalEnd:parent.start+c.proof.end,
      assertionCode:c.atom.assertionCode,variantId:c.atom.variantId};
  });
  const groups=new Map<string,string[]>();
  for(const c of candidates){
    const key=[c.parentId,c.originalStart,c.originalEnd,c.assertionCode,c.variantId].join('|');
    groups.set(key,[...groups.get(key)??[],c.atomId]);
  }
  const duplicateGroups=[...groups.values()].filter(v=>v.length>1);
  return {plan,packet,candidates,duplicateGroups,
    status:'needs_independent_cross_window_adjudication' as const,
    // A two-pass model output, even with full UTF16 coverage, does not prove
    // recall/faithfulness; duplicated overlapping mentions are not extra votes.
    coverage:'window_inventory_not_semantic_completeness' as const};
}

export type ScopeKind111='coreference'|'negation_scope'|'condition_scope'|'hedge_scope'|
 'attribution_scope'|'protocol_scope'|'variant_scope'|'comparison_target'|'revision_or_correction';
export interface ScopeProposal111 {atomId:string;contextSegmentId:string;
  contextStart:number;contextEnd:number;kind:ScopeKind111;
  /** Link is a proposed dependency, not a verified entailment. */
  relationship:'limits'|'qualifies'|'potentially_contradicts'|'resolves_reference';}
export interface ScopeAudit111 {sourceRevisionSha256:string;findings:{atomId:string;contextSegmentId:string;
  kind:ScopeKind111;relationship:ScopeProposal111['relationship'];spanSha256:string}[];
  problems:string[];remainingReview:string[];
  status:'needs_independent_document_level_adjudication';
  guarantee:'literal_span_only_not_scope_resolution_or_entailment';}
/** Validate cross-segment candidate scope proposals against ephemeral source. No prose survives. */
export function auditContext111(packet:ExtractionPacket110,input:SourceInput110,links:ScopeProposal111[]):ScopeAudit111{
  const problems:string[]=[],findings:ScopeAudit111['findings']=[],review=new Set<string>();
  const atomIds=new Set(packet.proposed.map(c=>c.atom.atomId));
  const segs=new Map(input.blocks.map(b=>[b.segmentId,b]));
  const origIds=new Set(packet.manifest.segments.map(s=>s.segmentId));
  if(packet.manifest.reportId!==input.reportId||input.blocks.length!==origIds.size||
    input.blocks.some(b=>!origIds.has(b.segmentId)))throw Error('different_review_inventory');
  const recomputed=makeEphemeralInventory109({...input,blocks:input.blocks.map(
    ({representation:_temp, ...block})=>block)});
  if(recomputed.sourceRevisionSha256!==packet.manifest.sourceRevisionSha256)
    throw Error('stale_document_revision');
  for(const c of packet.proposed)review.add(c.atom.atomId);
  for(const [i,l] of links.entries()){
    const b=segs.get(l.contextSegmentId);
    if(!atomIds.has(l.atomId)||!b||!b.accessible||b.representation!=='complete'||
      !b.content||!Number.isSafeInteger(l.contextStart)||!Number.isSafeInteger(l.contextEnd)||
      l.contextStart<0||l.contextEnd> b.content.length||l.contextEnd-l.contextStart<3||
      !['coreference','negation_scope','condition_scope','hedge_scope','attribution_scope',
      'protocol_scope','variant_scope','comparison_target','revision_or_correction'].includes(l.kind)||
      !['limits','qualifies','potentially_contradicts','resolves_reference'].includes(l.relationship)){
      problems.push('unanchored_or_invalid_scope_proposal:'+i);continue;
    }
    findings.push({atomId:l.atomId,contextSegmentId:l.contextSegmentId,kind:l.kind,
      relationship:l.relationship,spanSha256:digest(b.content.slice(l.contextStart,l.contextEnd))});
  }
  return {sourceRevisionSha256:packet.manifest.sourceRevisionSha256,findings,
    problems,remainingReview:[...review].sort(),
    status:'needs_independent_document_level_adjudication',
    guarantee:'literal_span_only_not_scope_resolution_or_entailment'};
}

/** User-query interpretations are READ-ONLY projections: never persisted as source facts. */
export interface Reading111 {readingId:string;interpretationCode:string;
  topVariantId:string|null;eligibleVariantIds:string[];
  /** Reasons correspond to interpretation of the query, not product facts. */
  absoluteConstraints:string[];relativePreferences:string[];
  evidenceGaps:string[];}
export interface Ambiguity111 {issueCode:string;kind:'scope'|'meaning'|'threshold'|'anaphora'|
  'negation'|'variant'|'units'|'capability'|'other';question:string;
  /** A single consequential question, not a whole form. */
  options:string[];}
export interface RequestInterpretations111 {requestId:string;
  inspection:'alternative_meanings_checked'|'not_yet_checked';readings:Reading111[];
  issues:Ambiguity111[];}
export interface RequestGate111 {action:'proceed'|'clarify'|'analyze_alternatives'|'gather_evidence';
  chosenReadingId:string|null;question:string|null;options:string[];
  reason:string; distinctPossibleWinners:string[];
  caution:'rankings_are_private_projections_not_product_facts';}
const unique=(xs:string[])=>new Set(xs).size===xs.length;
/** Ask only when ambiguity is material to eligibility/winner/meaning of an absolute constraint.
 * Candidate readings and rankings must be generated independently; this does not
 * itself understand arbitrary natural language, and cannot validate candidate semantics.
 */
export function gateRequest111(x:RequestInterpretations111):RequestGate111{
  if(!x||!ident(x.requestId)||!Array.isArray(x.readings)||!Array.isArray(x.issues)||
    x.readings.length>32||x.issues.length>32)throw Error('invalid_request_interpretations');
  for(const r of x.readings){
    if(!ident(r.readingId)||!ident(r.interpretationCode)||
      !Array.isArray(r.eligibleVariantIds)||!r.eligibleVariantIds.every(ident)||
      !unique(r.eligibleVariantIds)||
      !(r.topVariantId===null||(ident(r.topVariantId)&&r.eligibleVariantIds.includes(r.topVariantId)))||
      !Array.isArray(r.absoluteConstraints)||!r.absoluteConstraints.every(ident)||
      !Array.isArray(r.relativePreferences)||!r.relativePreferences.every(ident)||
      !Array.isArray(r.evidenceGaps)||!r.evidenceGaps.every(ident))throw Error('invalid_interpretation');
  }
  if(!unique(x.readings.map(r=>r.readingId)))throw Error('duplicate_interpretation');
  for(const issue of x.issues)if(!ident(issue.issueCode)||
    !['scope','meaning','threshold','anaphora','negation','variant','units','capability','other'].includes(issue.kind)||
    typeof issue.question!=='string'||issue.question.length<10||issue.question.length>240||
    !Array.isArray(issue.options)||issue.options.length<2||issue.options.length>5||
    issue.options.some(z=>typeof z!=='string'||z.length<1||z.length>120))throw Error('invalid_clarification_issue');
  const winners=[...new Set(x.readings.map(r=>r.topVariantId??'unknown'))];
  const output=(action:RequestGate111['action'],reason:string,issue?:Ambiguity111):RequestGate111=>({
    action,chosenReadingId:action==='proceed'?x.readings[0]?.readingId??null:null,
    question:issue?.question??null,options:issue?.options??[],reason,
    distinctPossibleWinners:winners,
    caution:'rankings_are_private_projections_not_product_facts'});
  if(x.inspection!=='alternative_meanings_checked'||!x.readings.length)return output('analyze_alternatives','interpretation_coverage_not_established');
  // Need no false constraints: capability/threshold differences are material even if current winner is the same.
  const first=x.readings[0];
  const different=x.readings.some(r=>r.topVariantId!==first.topVariantId||
    [...r.eligibleVariantIds].sort().join('|')!==[...first.eligibleVariantIds].sort().join('|')||
    [...r.absoluteConstraints].sort().join('|')!==[...first.absoluteConstraints].sort().join('|'));
  if(different){
    const issue=x.issues[0];
    if(!issue)return output('analyze_alternatives','material_difference_without_clarification_prompt');
    return output('clarify','material_ambiguity_changes_ranking_or_eligibility',issue);
  }
  if(x.readings.some(r=>r.topVariantId===null||r.evidenceGaps.length))
    return output('gather_evidence','evidence_missing_not_a_user_preference');
  return output('proceed','consistent_winner_and_eligibility_in_examined_readings');
}
