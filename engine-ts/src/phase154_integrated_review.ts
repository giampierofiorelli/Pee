/** Phase 154: first executable multi-capability reuse of user-provided OSS.
 * Earlier phases' reference/identity assertions are preserved without upgrades.
 * This is an explicit document-intake entrypoint, not launch ranking integration.
 */
import {discoverEntityInventory153,type Inventory153} from './phase153_entity_inventory.js';
import type {ReaderInput139} from './phase139_unmarked_english_candidate_reader.js';
import {buildContextGraph154,PRODUCT_REVIEW_CONTEXT_RULES154,type ContextGraph154,type ContextRule154} from './phase154_context_graph.js';
import {analyzeLabelMatrix154,type LFAnalysis154} from './phase154_label_diagnostics.js';

export interface IntegratedReview154 {phase:154;inventory:Inventory153;context:ContextGraph154;
 signalDiagnostics:LFAnalysis154;labelFunctionNames:string[];labelMatrix:number[][];
 mentions:{mentionId:string;literal:string;contextualTargetLiteral:string;contextualTargetSpan:{start:number;end:number};
    boundaryAdjusted:boolean;contextCategories:string[];
   evidenceSignals:string[];identityVerified:false;requiresScientificReview:true;}[];
 truncated:boolean;reasons:string[];sourceAuthenticated:false;
 independentGoldAnnotations:0;precision:null;recall:null;
 canonicalWriteAuthorized:false;rankingAuthorized:false;}
/** Bounded evidence-safe product review intake that assembles existing Phase153
 * extraction with ported medSpaCy context-graph and Snorkel LF analysis. */
export function analyzeEnglishProductDocument154(input:ReaderInput139,extraRules:readonly ContextRule154[]=[]):IntegratedReview154{
 const inventory=discoverEntityInventory153(input);
 const names=['baseline152','page_title_correspondence','caller_alias','open_class_name','local_product_context','repeated_surface','typed_surface_kind'];
 const matrix=inventory.mentions.map(m=>[
  m.recognizedByBaseline?1:-1,
  m.signals.includes('page_title_correspondence')?1:-1,
  m.signals.includes('caller_alias')?1:-1,
  m.signals.includes('open_class_name')?1:-1,
  m.signals.includes('local_product_context')?1:-1,
  m.signals.includes('repeated_surface')?1:-1,
  m.kind==='possible_component_or_setting'?0:m.kind==='unresolved_shorthand'?2:-1
 ]);
 const signalDiagnostics=analyzeLabelMatrix154(matrix,names);
 // A context trigger embedded at the beginning of a Phase153 candidate is
 // not itself part of the product name. Derive a *separate* contextual span
 // using declared rules, preserving the original Phase153 hypothesis intact.
 const rules=[...PRODUCT_REVIEW_CONTEXT_RULES154,...extraRules];
 const contextualTargets=inventory.mentions.map(m=>{
  let start=m.span.start;
  for(const rule of rules){
   if(rule.direction!=='FORWARD'||!['EXCLUDED_FROM_TEST','COMPARISON_TARGET','UNCERTAIN_REFERENCE'].includes(rule.category))continue;
   const beginning=input.document.text.slice(start,m.span.end),a=rule.literal;
   if(beginning.toLowerCase().startsWith(a.toLowerCase()+' ')){
    const remainder=beginning.slice(a.length).trimStart();
    if(/^\p{Lu}/u.test(remainder)&&remainder.split(/\s+/).length>=2){
     start=m.span.end-remainder.length;break;
    }
   }
  }
  return {id:m.id,start,end:m.span.end,type:m.kind};
 });
 const context=buildContextGraph154(input.document.text,contextualTargets,rules);
 const mentions=inventory.mentions.map(m=>{const target=contextualTargets.find(t=>t.id===m.id)!;return ({mentionId:m.id,literal:m.span.literal,
  contextualTargetLiteral:input.document.text.slice(target.start,target.end),
  contextualTargetSpan:{start:target.start,end:target.end},boundaryAdjusted:target.start!==m.span.start,
  contextCategories:[...new Set(context.edges.filter(e=>e.targetId===m.id).map(e=>e.category))].sort(),
  evidenceSignals:[...m.signals],identityVerified:false as const,requiresScientificReview:true as const});});
 return {phase:154,inventory,context,signalDiagnostics,labelFunctionNames:names,labelMatrix:matrix,mentions,
  truncated:inventory.truncated||context.truncated,reasons:[...inventory.truncationReasons,...context.reasons],
  sourceAuthenticated:false,independentGoldAnnotations:0,precision:null,recall:null,
  canonicalWriteAuthorized:false,rankingAuthorized:false};
}
