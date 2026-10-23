/**
 * S100 (owner review of S99, 2026-10-20, verbatim in .claude/skills/pee-guided-learning/references/
 * owner-review-s99-rule-governance-2026-10-20.md): the ONE place where the statement role, the nature and the provenance of
 * an observation are decided. "Gli estrattori devono fornire gli elementi di prova. Un meccanismo condiviso deve
 * interpretarli."
 *
 * Extractors and readers supply EVIDENCE: typed cues, each read at a declared scope (the value's own noun phrase, a table
 * cell, the value's clause, the cell's row or column labels, its record row, the sentence, the table's caption or heading,
 * a linked statement or section heading, the document, the source). The rules of
 * resources/scientific-reading/observation-semantics.v1.json turn cues into claims, and knowledge_rules.decide applies the
 * one precedence policy (constraint > explicit > inherited; narrowest scope; equal-level disagreement abstains and is
 * reported; a default is only a presumption). Which extractor found the value is a presumption, never a decision: a
 * Phase245 row and a Phase265 lead are read with the same cues as prose.
 *
 * Every cue kind is produced by one registered reader below (CUE_READERS); the fitness tests check that the rules use only
 * declared cues and that every reader's cues are covered by rules.
 */
import {maskNegated} from './language_scope.js';
import {readFileSync} from 'node:fs';
import {compileRuleSet,evaluate,decide,claimRules,type RuleSet,type CompiledProgram,type Decision,type ClaimRule} from './knowledge_rules.js';
import {observationRole86c} from './phase225_transient_test_probe.js';
import {DECLARATION_CUE272,DECLARED_BODY272,TEST_CONTEXT272} from './phase272_extraction_plan.js';
import {situationTypeOf} from './definition_interpreter.js';
import {isCalculationText1G} from './table_interpreter1g.js';
import {quantityBound,parseUnit,type QuantityKnowledge} from './quantity_knowledge.js';
import type {PropertyDefinitions} from './property_definitions.js';

export const OBSERVATION_SEMANTICS_FILE='observation-semantics.v1.json';
export interface Cue {kind:string;scope:string;why:string}
export type SemanticRole='result'|'specification'|'threshold'|'norm'|'target'|'condition';
export interface ObservationSemantics {role:SemanticRole|'unresolved';nature:'measured'|'declared'|'calculated'|'condition'|'unresolved';
 provenance:'publisher'|'manufacturer'|'third_party'|'unresolved';
 /** per field: the deciding tier and scope and rules, or the conflict, or the presumption only */
 decisions:{field:string;value:string|null;tier:string|null;scope:string|null;by:string[];conflict:string[]|null;presumption:string|null}[];
 cues:Cue[];version:string}

let cached:{program:CompiledProgram;version:string;kinds:string[]}|null=null;
export function observationSemanticsRules(rs?:RuleSet&{cueKinds?:string[]}):{program:CompiledProgram;version:string;kinds:string[]}{
 if(!rs&&cached)return cached;
 const raw=rs??JSON.parse(readFileSync(new URL('../../resources/scientific-reading/'+OBSERVATION_SEMANTICS_FILE,import.meta.url),'utf8')) as RuleSet&{cueKinds?:string[]};
 const program=compileRuleSet(raw).get('observation_semantics');if(!program)throw Error('observation_semantics: program missing');
 const out={program,version:raw.version,kinds:raw.cueKinds??[]};if(!rs)cached=out;return out;
}
export function observationClaimRules():ClaimRule[]{return claimRules(observationSemanticsRules().program);}

/** Decide role, nature and provenance from the cues of one observation. */
export function decideSemantics(cues:readonly Cue[]):ObservationSemantics{
 const {program,version,kinds}=observationSemanticsRules();
 const known=new Set(kinds);for(const c of cues)if(!known.has(c.kind))throw Error('observation_semantics: undeclared cue kind '+c.kind);
 const m=evaluate(program,{cue:cues.map(c=>['o',c.kind,c.scope])});const ds:Decision[]=decide(m);
 const get=(f:string)=>ds.find(d=>d.field===f)?.value??null;
 return {role:(get('role')??'unresolved') as ObservationSemantics['role'],nature:(get('nature')??'unresolved') as ObservationSemantics['nature'],
  provenance:(get('provenance')??'unresolved') as ObservationSemantics['provenance'],
  decisions:ds.map(d=>({field:d.field,value:d.value,tier:d.tier,scope:d.scope,by:d.by,conflict:d.conflict?d.conflict.values:null,presumption:d.presumption})),
  cues:[...cues],version};
}

// ---------------------------------------------------------------------------------------------------------------------
// Cue readers. Each reads one kind of evidence at one scope; none decides.
const esc=(x:string)=>x.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const hasWord=(text:string,cue:string)=>new RegExp('(?:^|[^\\p{L}\\p{N}])'+esc(cue)+'(?![\\p{L}\\p{N}])','u').test(text.toLowerCase());
/** The value's own clause in its sentence (clause breaks: punctuation, sentence ends and contrastive conjunctions). */
export function clauseOf(sent:string,start:number,end:number):{text:string;head:string;tail:string}{
 // a value inside a parenthetical that restates or qualifies the phrase before it ("a 5,000mAh battery (72Wh)", "(around
 // 45 x 44 cm, ~10kg)") belongs to the enclosing clause; a parenthetical with its own statement ("(we measured 32 min)") is
 // its own clause
 const before=sent.slice(0,start);const open=before.lastIndexOf('(');
 if(open>=0&&before.indexOf(')',open)<0){const inner=before.slice(open+1);
  if(!/\b(?:we|i|our|my|measured|tested|recorded|got|claimed|claims|rated|says|states)\b/i.test(inner)){
   const outer=clauseOf(sent,open,open);const close=sent.indexOf(')',end);const tail=close<0?sent.slice(end):sent.slice(end,close);
   return {text:outer.head+'('+inner+sent.slice(start,end)+tail+')',head:outer.head+'('+inner,tail};}}
 // S102: a clause that ends with a colon introduces what follows ("when measuring its noise level (from 1 m): around 60 dB",
 // "Noise: measured 41 dB"), so it stays in the value's clause; a colon still ends the clause after the value
 // and a closed parenthetical before the value is an aside within the clause, not a boundary
 const head=sent.slice(0,start).replace(/\([^()]*\)/g,' ').split(/[;()–—]|[.!?](?:\s|$)|,\s|\b(?:but|while|whereas|although)\b/i).at(-1)??'';
 const tail=sent.slice(end).split(/[;:()–—]|[.!?](?:\s|$)|,\s|\b(?:but|while|whereas|although|which)\b/i)[0]??'';
 return {text:head+sent.slice(start,end)+tail,head,tail};
}
const sentenceOf=(text:string,start:number,end:number)=>{const s=Math.max(0,text.slice(0,start).search(/[^.!?]*$/));let e=text.slice(end).search(/[.!?](?:\s|$)/);e=e<0?text.length:end+e+1;return {text:text.slice(s,e),start:start-s,end:end-s};};

/** The registry of cue readers: which cue kinds each emits (checked by tests/s100_rule_governance.test.ts). */
export const CUE_READERS:{reader:string;kinds:string[];scope:string[];statement:string}[]=[
 {reader:'valueReferenceCues',kinds:['value_norm_reference','value_threshold_reference'],scope:['value'],statement:'the value modifies a reference noun (pd statementRoles.referenceNouns)'},
 {reader:'clauseCues',kinds:['measuring_verb','first_person_test','observation_verb','attributive','declaration_verb','maker_claim','certified','condition_setting',
  'calculation_output','target_cue','norm_cue','generic_threshold','own_property_stated'],scope:['clause','value'],statement:'cues of the value\'s own clause (S86c, S91, S92, S93 readers and pd statementRoles)'},
 {reader:'sentenceCues',kinds:['sentence_test_context','sentence_declaration'],scope:['sentence'],statement:'test or declaration statements in the value\'s sentence outside its clause'},
 {reader:'tableCellCues',kinds:['cell_test_term','cell_declaration_term','cell_cert_term','cell_estimate_term','header_test_term','header_declaration_term','header_cert_term','header_estimate_term',
  'table_test_term','table_declaration_term','table_cert_term','table_estimate_term','section_test_term','section_declaration_term','section_cert_term','section_estimate_term'],scope:['cell','header','table','section'],
  statement:'the 1G evidence ladder of the value\'s table cell (cell, labels, caption or heading, the statement introducing the table, linked statements)'},
 {reader:'headerProvenanceCues',kinds:['header_test_term','header_declaration_term'],scope:['header'],statement:'a column header that states who produced the values ("Claimed", "Measured")'},
 {reader:'sectionHeadingCues',kinds:['section_test_term','section_declaration_term'],scope:['section'],statement:'the role a section heading announces (pd documentSections)'},
 {reader:'calculationEvidenceCues',kinds:['calculation_output'],scope:['clause'],statement:'S93 reads the value as a calculation output, and the clause states a calculation operator (not a word that names the property)'},
 {reader:'recordCues',kinds:['record_condition'],scope:['row'],statement:'the quantity knowledge\'s record rule makes the value a condition of another value of its record'},
 {reader:'leadMethodCues',kinds:['first_person_test','section_test_term','header_test_term','document_test_protocol','table_test_term'],scope:['clause','section','header','document','table'],statement:'the method cue that admitted a Phase265 lead, at the scope it was read'},
 {reader:'documentCues',kinds:['source_maker','page_tests_default','extractor_specification_row','extractor_test_lead'],scope:['source','document','value'],statement:'the source type, the page-level test default and the extractor presumptions (defaults never decide)'},
];

/** The value modifies a reference noun ("the 44 dB standard", "a limit of 70 dB", "the 80-decibel mark"). */
export function valueReferenceCues(defs:PropertyDefinitions,sent:string,start:number,end:number):Cue[]{
 const ref=defs.pack.statementRoles?.referenceNouns;if(!ref)return [];
 const after=sent.slice(end,end+40).toLowerCase(),before=sent.slice(Math.max(0,start-40),start).toLowerCase();
 for(const [kind,list] of [['value_norm_reference',ref.norm],['value_threshold_reference',ref.threshold]] as const)for(const n of list){
  // "<value> <noun>" ("the 44 dB standard", "the 80-decibel mark"), "the <value> that is <noun>", "a <noun> of <value>"
  if(new RegExp('^(?:[-\\s]*[a-z]+)?\\s*'+esc(n)+'\\b').test(after)&&/\b(?:the|a|an)\s*$/.test(before))return [{kind,scope:'value',why:'value modifies "'+n+'"'}];
  if(new RegExp('^\\s*(?:that|which)\\s+(?:is|are)\\s+(?:the\\s+)?'+esc(n)+'\\b').test(after))return [{kind,scope:'value',why:'value is the "'+n+'"'}];
  if(new RegExp('\\b(?:a|the)\\s+'+esc(n)+'\\s+of\\s*$').test(before))return [{kind,scope:'value',why:'"'+n+' of" value'}];}
 return [];
}
/** R3-P: the sentence with every test, declaration and certification cue that a negator governs blanked out (same length). */
function unnegatedCues(defs:PropertyDefinitions|null,sent:string):string{
 const words=(ws:readonly string[]|undefined)=>ws?.length?[new RegExp('(?:^|[^\\p{L}\\p{N}])(?:'+ws.map(esc).join('|')+')(?![\\p{L}\\p{N}])','iu')]:[];
 return maskNegated(sent,[DECLARATION_CUE272,DECLARED_BODY272,...words(defs?.pack.evidenceCues?.declaration)],undefined,[TEST_CONTEXT272,...words(defs?.pack.evidenceCues?.measurement)]).text;
}
/** Cues of the value's own clause. `dim`: the unit's dimension (S86c conditions depend on it). */
export function clauseCues(qk:QuantityKnowledge,defs:PropertyDefinitions,text:string,start:number,end:number,unit:string,o:{dim:string;propertyStated:boolean}):Cue[]{
 // R3-P: cues a negator governs are not cues ("our measurements, not the manufacturer's figures": no maker claim); the shared
 // scope (src/language_scope.ts) blanks them out, keeping offsets. A denied claim is never read as a measurement either:
 // only positive measurement cues count.
 const s=sentenceOf(text,start,end);const sent=unnegatedCues(defs,s.text);const cl=clauseOf(sent,s.start,s.end);const clause=cl.text;const out:Cue[]=[];
 const push=(kind:string,why:string,scope='clause')=>{if(!out.some(c=>c.kind===kind&&c.scope===scope))out.push({kind,scope,why});};
 if(o.propertyStated)push('own_property_stated','the definitions state the value\'s own property in its words','value');
 const r=observationRole86c(sent,s.start,s.end,o.dim);
 if(r.reason==='certification_body_in_clause')push('certified',r.reason);
 else if(r.reason==='declaration_cue_in_clause')push('maker_claim',r.reason);
 else if(r.role==='programme_preset'||r.role==='test_condition')push('condition_setting',r.reason);
 else if(r.role==='derived')push('calculation_output',r.reason);
 else if(r.reason==='measuring_verb')push('measuring_verb',r.reason);
 if(DECLARED_BODY272.test(clause))push('certified','certification body in the clause');
 if(DECLARATION_CUE272.test(clause))push('maker_claim','declaration cue in the clause');
 if(TEST_CONTEXT272.test(clause))push('first_person_test','test statement in the clause');
 if(isCalculationText1G(clause))push('calculation_output','calculation or estimate statement in the clause');
 const meas=(defs.pack.evidenceCues?.measurement??[]).find(c=>hasWord(clause,c));if(meas)push('observation_verb','observation verb "'+meas+'"');
 // a declaration verb counts only when it governs the value: in the clause head, before the value
 const decl=(defs.pack.evidenceCues?.declaration??[]).find(c=>hasWord(cl.head,c));if(decl)push('declaration_verb','declaration verb "'+decl+'" before the value');
 const st=situationTypeOf(sent,s.start,s.end);if(st==='attributive')push('attributive','the value modifies a noun as an attribute');
 const sr=defs.pack.statementRoles;
 if(sr){const notAfter=new Set(sr.notNormAfter??[]);
  // a norm noun as the head of its phrase: not followed by a mode, setting or level word, nor by a number (an adjective use)
  const normHit=sr.norm.find(c=>{for(const m of clause.toLowerCase().matchAll(new RegExp('(?:^|[^\\p{L}\\p{N}])'+esc(c)+'(?![\\p{L}\\p{N}])\\s*([\\p{L}\\p{N}]+)?','gu'))){const nx=m[1];if(!nx||(!notAfter.has(nx)&&!/^\d/.test(nx)))return true;}return false;});
  if(normHit)push('norm_cue','norm "'+normHit+'"');
  const tgt=sr.target.find(c=>hasWord(clause,c));if(tgt)push('target_cue','target "'+tgt+'"');
  const u=unit?parseUnit(qk,unit.trim()):null;const b=u?quantityBound(qk,sent,s.start,s.end,u.kinds):{bound:null};
  const gen=(sr.threshold??[]).find(c=>hasWord(clause,c));if(b.bound&&gen)push('generic_threshold','bound in a generic or sufficiency claim "'+gen+'"');}
 for(const c of valueReferenceCues(defs,sent,s.start,s.end))push(c.kind,c.why,'value');
 return out;
}
/** Test or declaration statements in the value's sentence but outside its clause (context, not evidence about it). */
export function sentenceCues(text:string,start:number,end:number):Cue[]{
 const s0=sentenceOf(text,start,end);const s={...s0,text:unnegatedCues(null,s0.text)};const cl=clauseOf(s.text,s.start,s.end);const rest=s.text.replace(cl.text,' ');const out:Cue[]=[];
 if(TEST_CONTEXT272.test(rest)&&!TEST_CONTEXT272.test(cl.text))out.push({kind:'sentence_test_context',scope:'sentence',why:'test statement elsewhere in the sentence'});
 if(DECLARATION_CUE272.test(rest)&&!DECLARATION_CUE272.test(cl.text))out.push({kind:'sentence_declaration',scope:'sentence',why:'declaration elsewhere in the sentence'});
 return out;
}
/** The 1G evidence of a table cell (class and level), as cues at the scope of its level. */
export function tableCellCues(evidence:{class:string;level:string|null;support:string[]}|null):Cue[]{
 if(!evidence||!evidence.level)return [];
 const scope=evidence.level==='cell'?'cell':evidence.level==='labels'?'header':evidence.level==='table_heading_caption'||evidence.level==='table_context'?'table':evidence.level.startsWith('linked_')?'section':null;
 if(!scope)return [];
 const term:Record<string,string>={publisher_measured:'test_term',manufacturer_declared:'declaration_term',nominal_certified:'cert_term',derived_or_estimated:'estimate_term'};
 if(evidence.class==='disputed'){const out:Cue[]=[];for(const s of evidence.support){const k=/test or measurement/.test(s)?'test_term':/certification/.test(s)?'cert_term':/declaration|specification/.test(s)?'declaration_term':/estimate|calculation/.test(s)?'estimate_term':null;
  if(k&&!out.some(c=>c.kind===scope+'_'+k))out.push({kind:scope+'_'+k,scope,why:'1G '+evidence.level+': '+s});}return out;}
 const k=term[evidence.class];return k?[{kind:scope+'_'+k,scope,why:'1G '+evidence.level+': '+(evidence.support[0]??evidence.class)}]:[];
}
/** Words that, as a table header, state who produced a column's values ("Claimed", "Measured"): evidence, not a product. */
export const PROVENANCE_HEADER=/^(?:(?:manufacturer(?:'s)?|maker(?:'s)?|official|brand)\s+)?(?:claimed|claim|rated|rating|advertised|listed|spec(?:ification)?s?|stated|quoted|declared)$|^(?:our\s+|lab\s+|tested\s+)?(?:measured|measurement|tested|test|result|results|reading|readings|actual|observed)$/i;
export function headerProvenanceCues(header:string):Cue[]{
 const h=header.trim();if(!PROVENANCE_HEADER.test(h))return [];
 const declared=/claim|rated|rating|advertis|listed|spec|stated|quoted|declared|official|manufacturer|maker|brand/i.test(h);
 return [{kind:declared?'header_declaration_term':'header_test_term',scope:'header',why:'column header "'+h+'" states who produced the values'}];
}
/** The role a section heading announces (definitions documentSections), innermost heading first. */
export function sectionHeadingCues(defs:PropertyDefinitions,headings:readonly string[]):Cue[]{
 const sc=defs.pack.documentSections;if(!sc)return [];
 for(const h of [...headings].reverse()){const t=h.toLowerCase();
  const spec=sc.specification.some(c=>hasWord(t,c)),test=sc.test.some(c=>hasWord(t,c));
  if(spec&&test)return [{kind:'section_declaration_term',scope:'section',why:'heading "'+h+'"'},{kind:'section_test_term',scope:'section',why:'heading "'+h+'"'}];
  if(spec)return [{kind:'section_declaration_term',scope:'section',why:'heading "'+h+'"'}];
  if(test)return [{kind:'section_test_term',scope:'section',why:'heading "'+h+'"'}];}
 return [];
}
/** S93's calculation reading of a value, as evidence only when the text states a calculation: a statistic over values
 * (average, mean, median), a governing calculation verb, a table derivation or a comparative percentage. A qualifier that
 * names the property ("maximum power", "total power output", "lowest setting") is not an operation. */
const CALC_OPERATOR=/\b(?:average|averaged|mean|median|on average|in total|altogether|estimated|calculated|projected|works out|comes to|equates to|which means|results? in|adds up to)\b/i;
export function calculationEvidenceCues(evidence:{nature:string;reason:string}|null|undefined,before:string):Cue[]{
 if(evidence?.nature!=='calculated')return [];
 const structural=/^calculation_output:(?:table_derivation|comparative):/.test(evidence.reason);
 if(!structural&&!CALC_OPERATOR.test(before.slice(-60)))return [];
 return [{kind:'calculation_output',scope:'clause',why:'S93 calculation output ('+evidence.reason+')'+(structural?'':' with a calculation operator')}];
}
export function recordCues(recordRole:string|null):Cue[]{return recordRole==='condition'?[{kind:'record_condition',scope:'row',why:'quantity-knowledge record rule'}]:[];}
/** The method cue that admitted a Phase265 lead, at the scope where it was read. */
export function leadMethodCues(methodCue:string):Cue[]{
 const m:Record<string,[string,string]>={first_person_test_statement:['first_person_test','clause'],test_section_with_method_cue:['section_test_term','section'],
  bounded_table_result_with_local_method:['header_test_term','header'],energy_result_with_document_protocol:['document_test_protocol','document'],
  plan_guided_measurement_term:['document_test_protocol','document'],structured_table_measurement_term:['table_test_term','table']};
 const x=m[methodCue];return x?[{kind:x[0],scope:x[1],why:'Phase265 method cue '+methodCue}]:[];
}
export function documentCues(o:{sourceType:string|null;pageTestsDefault?:boolean;extractor?:'phase245'|'phase265'|null}):Cue[]{
 const out:Cue[]=[];
 if(o.sourceType==='manufacturer'||o.sourceType==='retailer')out.push({kind:'source_maker',scope:'source',why:'source type '+o.sourceType});
 if(o.pageTestsDefault)out.push({kind:'page_tests_default',scope:'document',why:'the page reports tests (presumption)'});
 if(o.extractor==='phase245')out.push({kind:'extractor_specification_row',scope:'value',why:'found by Phase245 (presumption)'});
 if(o.extractor==='phase265')out.push({kind:'extractor_test_lead',scope:'value',why:'screened by Phase265 (presumption)'});
 return out;
}
