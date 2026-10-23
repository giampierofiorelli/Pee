/** Phase225: bounded, research-only ORIGINAL-TEST lead extraction from already
 * retrieved HTML. No second network request; no article body, sentence or quote
 * is persisted. Source claims, even first-person methodology, are NOT an
 * authenticated independent test. English-first. */
import {PAGE_MAX_BYTES} from './approved_web_reader.js';
import {createHash} from 'node:crypto';
import {analyzeEnglishReview155} from './phase155_review_orchestrator.js';
import {safeMetadataUrl75} from './phase75_source_discovery.js';
import {probeTransientTestTables226} from './phase226_transient_test_tables.js';
import {DECLARED_BODY272,unitAlternation272,canonicalUnit272,dimensionOfUnit272,DIMENSION_WORDS272,DECLARATION_CUE272,TEST_CONTEXT272,rangeOrBound272,
 planWords272,EXPLORATORY_UNITS272,conditionTerms272,stem272,type ExtractionPlan272} from './phase272_extraction_plan.js';
const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
const safeText=(s:string,n:number)=>s.length>0&&s.length<=n&&!/[<>\x00-\x1f]/.test(s);
// Phase268: "200&deg;C" decoded to "200 C" and lost every temperature; the common typographic entities are read.
const decode=(s:string)=>s.replace(/&#(x[0-9a-f]+|\d+);|&(amp|lt|gt|quot|apos|nbsp|deg|ordm|rsquo|lsquo|rdquo|ldquo|ndash|mdash|pound|euro|frac12|times);/gi,(_a,num:string|undefined,named:string|undefined)=>{
 const known:{[key:string]:string}={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',deg:'°',ordm:'°',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',
  ndash:'–',mdash:'—',pound:'£',euro:'€',frac12:'½',times:'×'};
 if(named)return known[named.toLowerCase()]??' ';
 const value=num!.toLowerCase().startsWith('x')?parseInt(num!.slice(1),16):parseInt(num!,10);
 return value>31&&value<=0x10ffff?String.fromCodePoint(value):' ';
});
// Phase268: the masculine ordinal (º) is a common typing of the degree sign ("200ºC").
const fragment=(v:string)=>decode(v.replace(/<[^>]{0,1800}>/g,' ').replace(/\s+/g,' ').trim()).replace(/º/g,'°');
const urlOk=(v:string)=>{try{const u=new URL(v);return safeMetadataUrl75(v,u.hostname);}catch{return false;}};
// Phase265: the unit ends at a non-alphanumeric character, not at a word boundary: "80 %" followed by a space has no
// word boundary after '%' and was never matched.
// S86: "52 dB(A)" keeps its A-weighting (was read as "52 dB").
// Phase268: a number never starts inside another number ("2,000W" was read as 0 W); thousands separators are read.
const candidateNumeric=/(?<![\d.,])(\d{1,3}(?:,\d{3})+(?:\.\d{1,3})?|\d{1,7}(?:\.\d{1,3})?)\s*(mm|cm|kg|g|litres?|liters?|l|db(?:\(a\)|a)?|%|minutes?|hours?|seconds?|ms|watts?|w|kwh|mah|°c)(?![a-z0-9])/gi;
/** S86: exported so the comparative reader (Phase270) applies the same screens to its sentences. */
export const NEGATED_METHOD225=/\b(?:did not test|was not tested|have not tested|not measured|no measurements|not yet tested|planned to test|we will test|didn't test)\b/i;
export const SECONDARY_SOURCE225=/\b(?:manufacturer (?:claims|states|reports|says)|advertised|marketing (?:material|claims)|press release|according to the manufacturer|specification sheet|quoted by|other reviewers measured|competitor|rather than the tested)\b/i;
const negated=NEGATED_METHOD225,secondary=SECONDARY_SOURCE225;
/** S86 (owner: a test publisher's page also quotes specifications). Does this clause present its value as a declaration?
 * The shared DECLARATION_CUE272 must occur, and nothing after its last occurrence may be the tester reporting a result
 * ("the claimed 52 dB" is declared; "claimed 52 dB, but we measured 58 dB" leaves 58 dB to the tester). */
export function declaredInClause225(clause:string):boolean{
 let last=-1;for(const m of clause.matchAll(new RegExp(DECLARATION_CUE272.source,'gi')))last=m.index!+m[0].length;
 if(last<0)return false;const rest=clause.slice(last);
 return !/\b(?:we|I)\s+(?:measured|recorded|timed|found|got|saw|clocked|metered|logged|weighed|tested|cooked|used)\b|\b(?:our|my)\s+(?:test|tests|measurements?|readings?|meter|lab)\b/i.test(rest);
}
// Phase268: single named testers write in the first person singular ("I measured", "in my tests", "in tests").
const claimedMethod=/\b(?:(?:we|I) (?:tested|measured|recorded|timed|weighed)|(?:our|my) (?:[a-z]+ ){0,2}(?:test|tests|measurements|testing)|in tests\b|during (?:our )?testing|in (?:our|the) (?:lab|test)|test (?:method|protocol|procedure|results)|measured (?:using|with)|was (?:tested|measured) (?:with|using))\b/i;
const numericReported=/\b(?:(?:we|I) (?:measured|recorded|timed|weighed|found)|(?:our|my) (?:test|tests|measurements) (?:recorded|showed|found|gave|yielded)|during (?:our )?testing|in (?:(?:our|the|my) (?:[a-z]+ ){0,2})?tests?)\b/i;
const instrumentRe=/\b(?:using|with) (?:a|an|the|our)\s+((?:(?:calibrated|digital|handheld|laboratory|electronic|precision|sound|laser)\s+){0,3}(?:scale|meter|gauge|sensor|thermometer|timer|stopwatch|caliper|rig))\b/i;
const conditionRe=/\b(?:at|under)\s+(\d{1,5}(?:\.\d{1,2})?\s*(?:°c|%|kg|g|mm|cm|hours?|minutes?|w))\b/i;
const headingCue=/\b(?:test(?:ing)? (?:method|procedure|results|protocol)|methodology|how (?:we|I) tested|our tests|lab results)\b/i;
/** Phase268: a document-level first-person ENERGY protocol (who measures, with what, how). A kWh result sentence elsewhere
 * in the same document ("one hour's usage at 200°C consumed N kWh") is linked to it only when it states a result verb. */
const energyProtocol=/\b(?:I|we)\b[^.]{0,120}\b(?:power|energy|plug-in)\s+(?:meter|monitor)\b/i;
const energyResult=/\b(?:consumed|used|drew|showed a consumption)\b/i;
/** PEE-authored condition codes (never source text): what a result was measured under. */
export type ConditionCode225='setpoint_c'|'duration_1h'|'load_empty'|'from_cold'|'all_compartments'|'single_compartment'|'includes_preheat'|'power_meter'|
 'conditions_from_block';
const ALL_C=/\bboth (?:drawers|baskets|pans|zones|compartments)\b/i,ONE_C=/\b(?:a single (?:basket|drawer|pan|zone)|single (?:basket|drawer|pan|zone)|(?:the |one )(?:small|smaller|larger|large) (?:pan|basket|drawer)|one (?:basket|drawer|zone))\b/i;
const HOUR=/\b(?:one|1|an|a full|full) hour(?:'s|’s)?\b|\bfor (?:an|one|1) hour\b/i;
/** S83 (owner review of S82: fix Phase225 negation before its codes gain evidential weight). A condition word counts only
 * where it states the condition: not as a verb ("empty the basket", "emptying") and not negated ("not empty", "no
 * preheat needed", "without preheating", "skip the preheat"). Probe v3; v2 read every occurrence. */
const NEGATED_BEFORE=/\b(?:no|not|never|without|skip|skips|skipped|skipping|isn't|wasn't|aren't|weren't|doesn't|don't|didn't|no need to|needn't|no longer)\s+(?:\w+\s+){0,2}$/i;
const stated=(text:string,re:RegExp,verbAfter?:RegExp)=>{for(const m of text.matchAll(re)){const before=text.slice(Math.max(0,m.index!-40),m.index!);
 const after=text.slice(m.index!+m[0].length,m.index!+m[0].length+12);if(NEGATED_BEFORE.test(before))continue;if(verbAfter&&verbAfter.test(after))continue;return true;}return false;};
function codesOf(text:string,segment:string):{codes:ConditionCode225[];setpointC:number|null}{
 const c=new Set<ConditionCode225>();const sp=/\bat (\d{2,3})\s*°c\b/i.exec(text);
 if(sp)c.add('setpoint_c');if(HOUR.test(text))c.add('duration_1h');if(stated(text,/\bempty\b/gi,/^\s+(?:the|your|its|it|out|them|any)\b/i))c.add('load_empty');
 if(/\bfrom cold\b/i.test(text))c.add('from_cold');if(stated(text,/\bpreheat\w*/gi))c.add('includes_preheat');
 if(/\b(?:power|energy|plug-in)\s+(?:meter|monitor)\b/i.test(text))c.add('power_meter');
 const segAll=ALL_C.test(segment),segOne=ONE_C.test(segment);
 if(segAll!==segOne){c.add(segAll?'all_compartments':'single_compartment');}
 return {codes:[...c].sort(),setpointC:sp?Number(sp[1]):null};
}
/** The clause of a sentence that belongs to one value when the sentence reports several ("A with both baskets and B
 * with a single basket"): from the delimiter after the previous value's clause to the delimiter after this value. */
function segmentFor(sentence:string,at:number,all:readonly number[]):string{
 const prev=all.filter(x=>x<at).pop();const next=all.find(x=>x>at);
 if(prev===undefined&&next===undefined)return sentence;
 const delim=/,\s| and /g;const after=(from:number)=>{delim.lastIndex=from;const m=delim.exec(sentence);return m?m.index:sentence.length;};
 const start=prev===undefined?0:Math.min(after(prev),at);const end=after(at);
 return sentence.slice(start,Math.max(end,at+1));
}
/** The bounded semantic text blocks (paragraphs, list items, cells, headings) the probe reads; shared with the Phase269
 * qualitative-observation pilot so both read exactly the same text. Transient: nothing here is retained. */
export function textBlocks225(html:string,opts:{splitLineBreaks?:boolean;withTags?:boolean;maxBlocks?:number}={}):{blocks:string[];truncated:boolean;tags?:string[]}{
 const stripped=html.replace(/<!--([\s\S]*?)-->/g,'').replace(/<(script|style|svg|template|noscript|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 const raw=[...stripped.matchAll(/<(p|li|td|th|h[1-6])\b[^>]{0,1200}>([\s\S]{0,4000}?)<\/\1\s*>/gi)].filter(m=>opts.splitLineBreaks||opts.withTags||m[1].toLowerCase()!=='th');
 // Phase270 (opt-in): lines separated by <br> inside one paragraph ("Oven – 36min, 31 cents<br>Air fryer – …") are
 // separate blocks; the tag of each block is reported so a reader can use headings as context.
 const cap=opts.maxBlocks??380;
 const parts=raw.slice(0,cap).flatMap(m=>(opts.splitLineBreaks?m[2].split(/<br\s*\/?>/i):[m[2]]).map(x=>({t:m[1].toLowerCase(),x:fragment(x)}))).filter(b=>b.x.length>0&&b.x.length<=1400);
 return {blocks:parts.map(b=>b.x),truncated:raw.length>cap,...(opts.withTags||opts.splitLineBreaks?{tags:parts.map(b=>b.t)}:{})};
}
export interface TestCandidate225 {
 /** Phase268: PEE-authored codes for the stated conditions of this value, the setpoint in °C, and the document's own
  * first-person protocol codes (when the document states one). Codes only; no text. */
 conditionCodes?:readonly ConditionCode225[];setpointC?:number|null;documentProtocolCodes?:readonly ConditionCode225[];
 /** Phase272 (plan only): taught condition ids whose distinctive terms the value's own sentence uses. A CUE that the condition
  * is stated, never proof that it is met; not retained by the store. */
 planConditionIds272?:readonly string[];
 id:string;sourceUrl:string;documentSha256:string|null;
 /** Hash of the small source block, not a stored quote or article excerpt. */
 blockSha256:string;blockIndex:number;valueOffset:number;
 value:number;unit:string;instrument:string|null;condition:string|null;
 /** Table-header interpretation only; not an independently verified measurand. */
 /** S86: a quantity-knowledge metric or kind id the publisher's header establishes, or a coarse heading word (pre-S86
  * readers: 'noise', 'airflow' …), or 'other' */
 publisherDeclaredDimension?:string;
 publisherDeclaredTargetScope?:'compartment_unspecified'|'whole_product_unspecified';
 methodCue:'first_person_test_statement'|'test_section_with_method_cue'|'bounded_table_result_with_local_method'|'energy_result_with_document_protocol'|
  /** Phase272: accepted because the category's extraction plan names this unit's dimension and a taught term in the value's
   * own sentence (or its table label), in a document that reports first-hand testing. A plan is a reading prior, not evidence. */
  'plan_guided_measurement_term'|
  /** Step 1D-A2 (plan + document semantics only): a test-table cell read through the Phase245 grid, its unit and taught
   * term taken from the cell and its own row/column labels (src/document_semantics.ts). Not produced by default. */
  'structured_table_measurement_term';
 subject:{name:string;model:string|null;sku:string|null}|null;
 subjectAssignment:'page_context_unverified'|'multiple_models_unresolved'|'not_identified'|'table_row_declared_model_unverified'|
  /** Phase272 (plan only): the value's own clause names one of the document's products. */
  'clause_named_model_unverified';
 classification:'publisher_reported_measurement_lead_only';
 methodReviewed:false;originalWorkReviewed:false;reviewerIndependent:false;
 exactVariantVerified:false;market:'unknown';scientificEvidenceAdmitted:false;rankingAuthorized:false;
 }
export interface TestProbe225 {
 schema:'pee225.transient-test-probe.v1';sourceUrl:string;
 candidates:readonly TestCandidate225[];
 methodBlocks:number;instrumentBlocks:number;existingPhase155MeasurementLeads:number;
 tableResults226:number;ambiguousTablesSkipped226:number;
 blockingReasons:readonly string[];truncated:boolean;
 sourceBodyRetained:false;sourcePassagesRetained:false;
 independenceAuthenticated:false;protocolAuthenticated:false;rankingAuthorized:false;
 /** Phase272: digest of the extraction plan supplied before reading (absent: no plan). */
 planDigest272?:string;
 /** Phase272 exploratory pass: numbers with a generic unit and a generic reporting cue that no accepted candidate covers.
  * RESEARCH LEADS ONLY: never candidates, never stored as measurements, never ranking input. */
 /** S86 (owner: a test publisher's page also quotes specifications): values of a test sentence whose own clause states a
  * declaration ("its claimed 52 dB", "rated at 1,700W") are not test leads; counted here, never stored as measured. */
 declaredValuesSkipped86?:number;
 /** S86c (plan + precision86c only): numeric observations the guided reader read but did not offer as results, each with
  * its evidential role in its own clause (no text). Not persisted; counted for evaluation and future intake. */
 classifiedObservations86c?:{value:number;unit:string;blockIndex:number;valueOffset:number;role:ObservationRole86c;reason:string}[];
 /** S86c: further readings of a result already offered (same subject, value, unit and conditions): one result, not several. */
 repeatedReadings86c?:number;
 exploratoryLeads272?:readonly {value:number;unit:string;blockIndex:number;blockSha256:string;subject:{name:string;model:string|null;sku:string|null}|null;status:'exploratory_research_lead'}[];
 }
/** Phase272: a product the document names (brand + model code from its headline or headings); per-value attribution only. */
export interface ProductMention272 {name:string;model:string}
const HYPOTHETICAL272=/\b(?:would|if you|could|might|per year|a year|annual(?:ly)?|each year|over (?:a|the) year)\b/i;
const REPORT_CUE272=/\b(?:measured|recorded|reached|peaked|clocked|took|needed|registered|used|consumed|pulls?|draws?|generates?|hit|ran at|came in at|our tests?|(?:we|i) found)\b/i;
/** S86c: the evidential role of ONE numeric observation, read in its own clause (never from the publisher's identity).
 * Order: a certification body or a declaration cue in the clause; a programme preset; an approximation or a generic
 * statement (no exact result of this test); a derivation; a controlled condition (a temperature without a measuring verb; a
 * duration, load or size introduced by a setting verb or preposition nearer than any measuring verb); otherwise a measured
 * result. A label before a colon belongs to its value; a clause opened by "and" continues the previous one. */
export type ObservationRole86c='measured_result'|'test_condition'|'programme_preset'|'declared_spec'|'certified_or_quoted'|'derived'|'unresolved';
export interface Precision86c {role?:boolean;subject?:boolean;repeats?:boolean;boundary?:boolean;structure?:boolean}
const CLAUSE_BREAK86c=/[,;()\[\]–—]|\b(?:but|while|whereas|than|versus|vs\.?)\b|(?<=[.!?])\s+/i;
const RESULT_VERB86c=/\b(?:measured|recorded|reached|peaked|clocked|took|taking|takes|needed|needing|required|lasted|registered|used|uses|consumed|consumes|pulls?|pulled|draws?|drew|generat(?:es|ed|ing)|hit|hits|hitting|ran at|came in at|cleared|clears|cleaned|cleans|removed|finished|achieved|read|reads|showed|gave|managed|logged|scored)\b/gi;
const PRESET86c=/\b(?:default(?:s|ed)?|pre-?set|presets?|programmed|recommended|suggested|automatically)\b/i;
const SETTING86c=/\b(?:set|sets|setting|bumped|reduced|increased|lowered|raised|adjusted|changed|opted for|selected|chose|chosen|turned|preheat(?:ed|ing)?|cook(?:ed|ing)?|bak(?:e|ed|ing)|roast(?:ed|ing)?|fr(?:y|ied|ying)|loaded|placed|put|time of|temperature of|duration of)\b/gi;
const CONDITION_PREP86c=/\b(?:at|to|for|on|with|of|from|over|under)\s+(?:(?:the|its|a|an|just|only)\s+)?(?:(?:maximum|max|minimum|min|highest|lowest|top|full|usual)\s+)?$/i;
const DERIVED86c=/\b(?:which means|works out|equivalent to|equates to|calculated|we estimate|estimated?|based on|translates to|room size|good for rooms|suitable for rooms|per year|a year|annual(?:ly)?)\b/i;
const APPROX86c=/\b(?:around|about|approximately|approx\.?|roughly|nearly|almost|near|just over|just under|some|up to)\s*$/i;
const GENERIC86c=/\b(?:usually|typically|normally|generally|tends? to|on average)\b/i;
const CONDITION_KINDS86c=new Set(['duration','mass','volume','length']);
const lastAt=(re:RegExp,s:string)=>{let k=-1;for(const m of s.matchAll(re))k=m.index!;return k;};
export function observationRole86c(sent:string,start:number,end:number,dim:string):{role:ObservationRole86c;reason:string}{
 const head=sent.slice(0,start);const parts=head.split(CLAUSE_BREAK86c);let clauseHead=parts.at(-1)??head;
 if(/^\s*(?:and|or|then)\b/i.test(clauseHead)&&parts.length>1)clauseHead=parts.at(-2)+', '+clauseHead;
 const clauseTail=sent.slice(end).split(CLAUSE_BREAK86c)[0]??'';const clause=clauseHead+sent.slice(start,end)+clauseTail;
 if(DECLARED_BODY272.test(clause))return {role:'certified_or_quoted',reason:'certification_body_in_clause'};
 if(declaredInClause225(clauseHead)||/\b(?:lab-reported|reported CADR|on paper|stated|spec(?:ification)?s?)\b/i.test(clause))return {role:'declared_spec',reason:'declaration_cue_in_clause'};
 if(PRESET86c.test(clauseHead))return {role:'programme_preset',reason:'preset_cue_before_value'};
 if(APPROX86c.test(head.slice(-22)))return {role:'unresolved',reason:'approximate_value'};
 if(GENERIC86c.test(clause))return {role:'unresolved',reason:'generic_statement'};
 // the verb nearest the value governs it: "I used this to cook a 1.5kg chicken" is a load, "it used 0.5 kWh" a result
 const verbAt=lastAt(RESULT_VERB86c,clauseHead),settingAt=lastAt(SETTING86c,clauseHead);const measuringVerb=verbAt>=0&&verbAt>settingAt;
 if(DERIVED86c.test(clause)||(/^\s*(?:based on|from (?:its|the|this))\b/i.test(head)&&!measuringVerb))return {role:'derived',reason:'derivation_cue_in_clause'};
 // a temperature in an appliance test is the controlled variable unless a measuring verb governs it ("it reached 210°C")
 if(dim==='temperature'&&!measuringVerb)return {role:'test_condition',reason:'temperature_without_measuring_verb'};
 if(CONDITION_KINDS86c.has(dim)&&!measuringVerb&&(CONDITION_PREP86c.test(clauseHead)||settingAt>=0))return {role:'test_condition',reason:'setting_or_condition_cue'};
 return {role:'measured_result',reason:measuringVerb?'measuring_verb':'no_other_role'};
}
/** S86c: does the value belong to a product other than the page's? The name NEAREST before the value in its clause (or
 * owning a parenthesis the value sits in, or a row label), or "achieved by" someone after it: a model-like token (letters
 * and digits, or a capitalised name followed by a number) or two capitalised words that are not the page product's words.
 * In prose a single capitalised name ("the Mila") counts too (a row label starts with a capital, so
 * there it takes two words or a model-like token): withholding errs towards an unresolved result, never a wrong one. Used only to WITHHOLD the page product (never to establish an identity: no similarity matching). */
const GENERIC_CAPS86c=/^(?:I|We|Our|My|The|A|An|It|Its|This|That|These|Those|At|In|On|For|With|And|But|Speeds?|Standby|Mode|Level|Setting|Fan|Eco|Auto|Express|Quick|Turbo|Sleep|Night|Max|Min|Top|Sub|Test|Data|PM\d*(?:\.\d)?|CADR|AHAM|dBA?|Wh?|kWh|UK|US|EU|HEPA|H1[0-4]|SPEED|TIME|NOISE|POWER)$/;
export function otherProductInClause86c(sent:string,start:number,end:number,pageSubject:string|null,opts:{wholeLabel?:boolean}={}):boolean{
 let head=sent.slice(0,start);const tail=sent.slice(end);
 const paren=/\(\s*$/.test(head);if(paren)head=head.replace(/\(\s*$/,'');
 const clauseHead=opts.wholeLabel?head:head.split(CLAUSE_BREAK86c).at(-1)??head;
 if(/^\s*(?:\S+\s+){0,3}(?:achieved|managed|recorded|posted|set|taken|needed|required) by\b/i.test(tail))return true;
 // another version of the product is another variant ("The SA600 v1 offered ...", "the previous model"): never the page's
 if(/\b(?:v\d+(?:\.\d+)?|version \d|first version|previous (?:model|version|generation)|older (?:model|version)|predecessor|last year's model|original model)\b/i.test(clauseHead))return true;
 const own=new Set((pageSubject??'').toLowerCase().split(/[\s()\/,-]+/).filter(Boolean));
 const spans=[...clauseHead.replace(/^\s*\S+/,m=>opts.wholeLabel?m:m.toLowerCase()).matchAll(/\b([A-Z][A-Za-z0-9+]*(?:[\s-]+[A-Z0-9][A-Za-z0-9+]*)*)/g)]
  // a capital glued to a number or degree sign is a unit ("200°C", "5L"), not a name
  .filter(m=>!/[\d°\/]$/.test(clauseHead.slice(0,m.index!)))
  .map(m=>m[1].split(/[\s-]+/).filter(t=>!GENERIC_CAPS86c.test(t)&&/[A-Za-z]/.test(t))).filter(t=>t.length&&(t.length>1||t[0]!.length>=3));
 const nearest=spans.at(-1);if(!nearest)return false;
 const foreign=nearest.filter(t=>!own.has(t.toLowerCase()));if(!foreign.length)return false;
 return foreign.some(t=>/\d/.test(t)&&/[A-Za-z]/.test(t))||/[A-Za-z]\s+\d{2,}/.test(nearest.join(' '))||nearest.length>=(opts.wholeLabel?2:1);
}
/** S86c: a block that is only a value (a table cell or a label-value box entry), and the table/heading context of a block. */
export const bareValue86c=(b:string)=>b.length<=60&&(b.replace(/\d[\d.,]*\s*[^\s\d]*/g,' ').match(/[A-Za-z]{3,}/g)?.length??0)<2;
const TEST_SECTION86c=/\b(?:test(?:s|ed|ing)?|results?|measured|measurements?|performance)\b/i;
const SPEC_SECTION86c=/\bspec(?:ification)?s?\b/i;
export function probeTransientTestContent225(html:string,sourceUrl:string,opts:{
  documentSha256?:string|null;
  productLeads?:readonly {name:string;model:string|null;sku:string|null}[];
  /** Phase272: the category's extraction plan, supplied BEFORE reading (guided candidates); absent: the Phase268 reader. */
  plan?:ExtractionPlan272;
  /** Phase272: also run the generic exploratory pass (research leads for what no rule anticipated). */
  exploratory?:boolean;
  /** Phase272 (plan only): products the document names; a value whose own clause names one is attributed to it. */
  mentions?:readonly ProductMention272[];
  /** S86c (with a plan only; shadow, evaluation): per-observation precision controls of the guided reader. Every control is on
   * unless set to false (ablation): role (the value's role in its own clause), subject (a clause naming another product never
   * gives the page product), repeats (one result read several times is offered once), boundary (a number glued to letters,
   * a model code "B0G" or "PM2.5", is not a quantity). */
  precision86c?:Precision86c;
}={}):TestProbe225 {
 const empty=():TestProbe225=>({schema:'pee225.transient-test-probe.v1',sourceUrl,candidates:[],
  methodBlocks:0,instrumentBlocks:0,existingPhase155MeasurementLeads:0,
  tableResults226:0,ambiguousTablesSkipped226:0,
  blockingReasons:['no_authenticated_original_professional_test'],truncated:false,
  sourceBodyRetained:false,sourcePassagesRetained:false,independenceAuthenticated:false,
  protocolAuthenticated:false,rankingAuthorized:false});
 const out=empty();
 if(!urlOk(sourceUrl)||typeof html!=='string'||html.length>PAGE_MAX_BYTES||!/<html\b/i.test(html)||
   (opts.documentSha256!==undefined&&opts.documentSha256!==null&&!/^[a-f0-9]{64}$/.test(opts.documentSha256)))return out;
 // Intentionally restrict to semantic paragraphs/list cells and headings.
 // This is NOT a general HTML or JavaScript renderer.
 const tb=textBlocks225(html);const all=tb.blocks;out.truncated=tb.truncated;
 const leads=opts.productLeads??[];
 const distinct=[...new Map(leads.filter(p=>safeText(p.name,180)).map(p=>[JSON.stringify([p.name,p.model,p.sku]),p])).values()];
 const subject=distinct.length===1?{name:distinct[0].name,model:distinct[0].model,sku:distinct[0].sku}:null;
 const scope:TestCandidate225['subjectAssignment']=distinct.length>1?'multiple_models_unresolved':subject?'page_context_unverified':'not_identified';
 let previousHeading='';let methodBlocks=0,instrumentBlocks=0;
 const protocolBlock=all.find(l=>l.length<=900&&energyProtocol.test(l)&&!negated.test(l));
 const protocolCodes:ConditionCode225[]|null=protocolBlock?codesOf(protocolBlock,protocolBlock).codes.filter(c=>c!=='all_compartments'&&c!=='single_compartment'):null;
 // "If the air fryer has two drawers, I will run both": the protocol runs every compartment.
 if(protocolCodes&&protocolBlock&&/\b(?:run|running) both\b/i.test(protocolBlock))protocolCodes.push('all_compartments');
 const records:TestCandidate225[]=[];const seen=new Set<string>();
 // Phase272: the plan widens the units read and admits a value whose sentence uses a taught term of that unit's dimension.
 const plan=opts.plan;
 // Both Phase272 passes read past the first 380 blocks (navigation-heavy pages put results after block 1000); the first 380
 // blocks are the same list, so block indices stay comparable with the Phase268 reader's.
 const deep=plan||opts.exploratory?textBlocks225(html,{maxBlocks:1500}).blocks:all;
 const docTest=!!plan&&deep.some(b=>TEST_CONTEXT272.test(b)||claimedMethod.test(b));
 // S86c: precision controls (plan only; each on unless set to false)
 const p86=plan&&opts.precision86c?{role:opts.precision86c.role!==false,subject:opts.precision86c.subject!==false,repeats:opts.precision86c.repeats!==false,boundary:opts.precision86c.boundary!==false,structure:opts.precision86c.structure!==false}:null;
 // S86c structure: a bare value (a cell, a label-value box entry) is read with its row label (a th cell the block list leaves
 // out, or the nearest label block) and its section heading
 const tagged86=p86?.structure?textBlocks225(html,{maxBlocks:1500,withTags:true}):null;const map86:number[]=[];
 if(tagged86){let d=0;tagged86.tags!.forEach((t,k)=>{if(t!=='th')map86[d++]=k;});}
 const heading86=(i:number)=>{const k=map86[i];if(k===undefined)return '';for(let j=k;j>=0;j--)if(/^h[1-6]$/.test(tagged86!.tags![j]!))return tagged86!.blocks[j]!;return '';};
 const label86=(i:number)=>{const k=map86[i];if(k===undefined)return '';for(let j=k-1;j>=Math.max(0,k-5);j--){const x=tagged86!.blocks[j]!;if(tagged86!.tags![j]==='th'||(!bareValue86c(x)&&/[A-Za-z]/.test(x)))return x;}return '';};
 const planRe=plan?new RegExp((p86?.boundary?'(?<![A-Za-z\\d.,])':'(?<![\\d.,])')+'(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,3})?|\\d{1,7}(?:\\.\\d{1,3})?)\\s*('+unitAlternation272(plan.units)+')(?![a-z0-9])','gi'):null;
 const planTaught=(dim:string)=>new Set(plan?.measurements.filter(m=>m.dimensions.includes(dim)).flatMap(m=>m.terms)??[]);
 // S86c (subject control): a generic measurement token ("PM1" from a "TIME TO REACH PM1 ZERO" header) is not a model code
 const clauseSubject=(sent:string,at:number)=>{const ms=(p86?.subject?(opts.mentions??[]).filter(m=>!GENERIC_CAPS86c.test(m.model)):opts.mentions)??[];if(ms.length<2)return null;let best:{m:ProductMention272;i:number}|null=null;
  for(const m of ms){const re=new RegExp('\\b'+m.model.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','g');for(const x of sent.slice(0,at).matchAll(re))if(!best||x.index!>best.i)best={m,i:x.index!};}
  return best?{name:best.m.name,model:best.m.model,sku:null}:null;};
 const guided=(line:string,i:number,prevLabel:string)=>{
  if(!planRe||!docTest||negated.test(line)||secondary.test(line))return;
  const sentences=line.split(/(?<=[.!?])\s+(?=[A-Z£])/);let off=0;
  for(const sent of sentences){const base=off;off+=sent.length+1;
   for(const m of sent.matchAll(planRe)){
    const unit=canonicalUnit272(m[2]);if(!unit||!plan!.units.includes(unit))continue;const dim=dimensionOfUnit272(unit)!;
    // The value's own sentence (or its table label) must use a taught term of this dimension, or a generic dimension word with
    // a reporting verb; a hypothetical projection, a threshold, a duration of a condition or a declaration is not a result.
    const bare=!!tagged86&&bareValue86c(line);const label=bare?label86(i)||prevLabel:prevLabel;const section=bare?heading86(i):'';
    const ctx=planWords272(sent+' '+label);const taught=planTaught(dim);
    const taughtOk=ctx.some(w=>taught.has(w))||(ctx.some(w=>(DIMENSION_WORDS272[dim]??[]).includes(w))&&REPORT_CUE272.test(sent));
    const classify=(role:ObservationRole86c,reason:string)=>{const v=Number(m[1].replace(/,/g,''));if(Number.isFinite(v))(out.classifiedObservations86c??=[]).push({value:v,unit,blockIndex:i,valueOffset:base+m.index!,role,reason});};
    if(bare){
     // S86c: a bare value in a specifications section is a declaration; outside a test section or test label it is not a
     // result of this test; inside one, the section establishes the test and the taught term is not required
     if(!taughtOk&&!TEST_SECTION86c.test(section+' '+label))continue;
     if(SPEC_SECTION86c.test(section)||SPEC_SECTION86c.test(label)){classify('declared_spec','specification_section');continue;}
     if(!(TEST_SECTION86c.test(section)||TEST_SECTION86c.test(label)||TEST_CONTEXT272.test(label))){classify('unresolved','bare_value_without_test_context');continue;}
    }else if(!taughtOk)continue;
    // S86c: the value's role in its own clause (a bare value: with its label) decides whether it can be a result; other roles
    // are kept as classified observations (no text), never offered as test results
    if(p86?.role){const lead=bare&&label?label+': ':'';const r=observationRole86c(lead+sent,lead.length+m.index!,lead.length+m.index!+m[0].length,dim);
     if(r.role!=='measured_result'){classify(r.role,r.reason);continue;}}
    if(DECLARATION_CUE272.test(sent)||rangeOrBound272(sent,m.index!,m.index!+m[0].length))continue;
    if(HYPOTHETICAL272.test(sent)||/^[\s-]*(?:limit|threshold|cap|target|mark)\b/i.test(sent.slice(m.index!+m[0].length).replace(/^-?\w*\s/,' '))&&/\b(?:below|above|under|our|the)\s*$/i.test(sent.slice(0,m.index!)))continue;
    if(dim==='duration'&&/\b(?:for|after|left|over|every|each|within)\s*$/i.test(sent.slice(Math.max(0,m.index!-10),m.index!)))continue;
    const planConds=plan!.measurements.filter(x=>x.dimensions.includes(dim)).flatMap(x=>x.conditions).filter(c=>c.terms.some(t=>ctx.includes(t))).map(c=>c.id);
    const value=Number(m[1].replace(/,/g,''));if(!Number.isFinite(value)||value<0||value>1e7)continue;
    if(/^(?:g|kg)$/.test(unit)&&/^\s*of\b/i.test(sent.slice(m.index!+m[0].length)))continue;
    let named=clauseSubject(sent,m.index!);
    // S86c (subject control): a mention whose words are all words of the page product's name ("Airmega 300" on the "Coway
    // Airmega 300" page) is the page product (exact token containment, never similarity)
    if(p86?.subject&&named&&subject){const own=new Set(subject.name.toLowerCase().split(/[\s()\/,-]+/));if(named.name.toLowerCase().split(/[\s()\/,-]+/).every(t=>own.has(t)))named=null;}
    // S86c: a clause naming another product never gives the page product (the value stays unresolved, never discarded)
    const withheld=!!p86?.subject&&!named&&(bare&&label?otherProductInClause86c(label,label.length,label.length,subject?.name??null,{wholeLabel:true})
     :otherProductInClause86c(sent,m.index!,m.index!+m[0].length,subject?.name??null));
    const subj=withheld?null:named??subject;const blockHash=sha(line);
    const id=sha(JSON.stringify([sourceUrl,blockHash,base+m.index!,value,unit,subj]));
    if(seen.has(id)||records.some(r=>r.blockIndex===i&&r.value===value&&canonicalUnit272(r.unit)===unit))continue;seen.add(id);
    // S86c (repeats control): a further reading of a result already offered (same subject, value, unit) is counted, not
    // offered again, so the bounded record list holds distinct results (it was filled by repeats on long pages)
    if(p86?.repeats&&records.some(r=>(r.subject?.name??'unresolved@'+r.blockIndex)===(subj?.name??'unresolved@'+i)&&r.value===value&&(canonicalUnit272(r.unit)??r.unit)===unit)){out.repeatedReadings86c=(out.repeatedReadings86c??0)+1;continue;}
    const cc=codesOf(sent,sent);
    records.push({id,sourceUrl,documentSha256:opts.documentSha256??null,blockSha256:blockHash,blockIndex:i,valueOffset:base+m.index!,value,unit,
     ...(planConds.length?{planConditionIds272:[...new Set(planConds)].sort()}:{}),
     instrument:instrumentRe.exec(sent)?.[1]?.toLowerCase()??null,condition:conditionRe.exec(sent)?.[1]?.toLowerCase()??null,methodCue:'plan_guided_measurement_term',
     conditionCodes:cc.codes,setpointC:cc.setpointC,documentProtocolCodes:[],subject:subj,
     subjectAssignment:withheld?'multiple_models_unresolved':subj&&subj!==subject?'clause_named_model_unverified':scope,classification:'publisher_reported_measurement_lead_only',
     methodReviewed:false,originalWorkReviewed:false,reviewerIndependent:false,exactVariantVerified:false,market:'unknown',scientificEvidenceAdmitted:false,rankingAuthorized:false});
   }}
 };
 for(let i=0;i<all.length;i++){
  const line=all[i];if(line.length>900)continue;
  if(headingCue.test(line)&&line.length<90)previousHeading=line;
  if(negated.test(line)||secondary.test(line))continue;
  const method=claimedMethod.test(line);if(method)methodBlocks++;
  const instrument=instrumentRe.exec(line)?.[1]?.toLowerCase()??null;
  if(instrument)instrumentBlocks++;
  const explicitNumeric=numericReported.test(line);
  // A heading alone or a measurement figure without first-person method evidence
  // cannot be promoted into an original test lead. Phase268: a kWh result sentence is linked to the document's own
  // first-person energy protocol, and then only its kWh values are leads.
  const protocolLinked=!(method&&explicitNumeric)&&!!protocolCodes&&energyResult.test(line)&&/\d\s*kwh\b/i.test(line);
  if(!(method&&explicitNumeric)&&!protocolLinked)continue;
  const condition=conditionRe.exec(line)?.[1]?.toLowerCase()??null;
  const blockHash=sha(line);let count=0;
  const sentences=line.split(/(?<=[.!?])\s+(?=[A-Z£])/);
  for(const m of line.matchAll(candidateNumeric)){
   if(++count>8){out.truncated=true;break;}
   if(protocolLinked&&m[2].toLowerCase()!=='kwh')continue;
   const value=Number(m[1].replace(/,/g,''));if(!Number.isFinite(value)||value<0||value>1e7)continue;
   // Phase268: a rated power introducing the sentence ("At 2,000W, ...", "offers up to 2,000W of power") is a declaration.
   if(/^(?:w|watts?)$/i.test(m[2])&&(/\b(?:at|up to|of|rated)\s*$/i.test(line.slice(Math.max(0,m.index!-12),m.index!))||/^\s*of power\b/i.test(line.slice(m.index!+m[0].length))))continue;
   // Phase268 (after the held-out run): a quantity "of <food>" ("500g of raw potato") is the test load, not a result.
   if(/^(?:g|kg)$/i.test(m[2])&&/^\s*of\b/i.test(line.slice(m.index!+m[0].length)))continue;
   // Ambient temperatures explicitly introduced as test conditions are not outcome measures.
   if(m[2].toLowerCase()==='°c'&&/\b(?:at|under)\s*$/i.test(line.slice(Math.max(0,m.index!-12),m.index!)))continue;
   const unit=m[2].toLowerCase();
   // S86: the value's own clause (back to a comma, semicolon, dash or "but/while/whereas/than" in its sentence) states a
   // declaration (the shared DECLARATION_CUE272 of the guided reader): a quoted specification, not this publisher's result.
   {const head=line.slice(Math.max(0,m.index!-120),m.index!);const clause=head.split(/[,;:()–—]|\b(?:but|while|whereas|than|versus|vs\.?)\b|(?<=[.!?])\s+/i).at(-1)??head;
    if(declaredInClause225(clause)){out.declaredValuesSkipped86=(out.declaredValuesSkipped86??0)+1;continue;}}
   // Codes come from the value's own sentence; the compartment from its own clause when the sentence has several values.
   let off=0;const sent=sentences.find(x=>{const hit=m.index!>=off&&m.index!<off+x.length+1;if(!hit)off+=x.length+1;return hit;})??line;
   // Clauses are split between values of the same unit only (a setpoint or a rated power is not a second result).
   const local=[...sent.matchAll(candidateNumeric)].filter(x=>x[2].toLowerCase()===m[2].toLowerCase()).map(x=>x.index!);const at=m.index!-off;
   // Phase268: in a block of several sentences, only a sentence that itself reports the test (or, linked to the document
   // protocol, a kWh result) yields leads; comparisons with other products in neighbouring sentences do not.
   if(sentences.length>1&&!((claimedMethod.test(sent)&&numericReported.test(sent))||(numericReported.test(sent)&&method)||
     (energyResult.test(sent)&&/\d\s*kwh\b/i.test(sent)&&(protocolLinked||method))))continue;
   const cc=codesOf(sent,segmentFor(sent,at,local));
   // Setpoint and duration not stated in the sentence may be stated by the rest of the same block; the code says so.
   if(sentences.length>1&&(!cc.codes.includes('setpoint_c')||!cc.codes.includes('duration_1h'))){const b=codesOf(line,'');let used=false;
    if(!cc.codes.includes('setpoint_c')&&b.setpointC!==null){cc.codes.push('setpoint_c');cc.setpointC=b.setpointC;used=true;}
    if(!cc.codes.includes('duration_1h')&&b.codes.includes('duration_1h')){cc.codes.push('duration_1h');used=true;}
    if(used)cc.codes.push('conditions_from_block');cc.codes.sort();}
   const id=sha(JSON.stringify([sourceUrl,blockHash,m.index,value,unit,subject]));
   if(seen.has(id))continue;seen.add(id);
   records.push({id,sourceUrl,documentSha256:opts.documentSha256??null,blockSha256:blockHash,blockIndex:i,
    valueOffset:m.index??0,value,unit,instrument,condition,
    methodCue:protocolLinked?'energy_result_with_document_protocol':headingCue.test(previousHeading)?'test_section_with_method_cue':'first_person_test_statement',
    conditionCodes:cc.codes,setpointC:cc.setpointC,documentProtocolCodes:protocolCodes?[...new Set(protocolCodes)].sort():[],
    subject,subjectAssignment:scope,classification:'publisher_reported_measurement_lead_only',
    methodReviewed:false,originalWorkReviewed:false,reviewerIndependent:false,
    exactVariantVerified:false,market:'unknown',scientificEvidenceAdmitted:false,rankingAuthorized:false});
   if(records.length>=20){out.truncated=true;break;}
  }
  if(records.length>=20)break;
 }
 // Phase272: guided pass over the same bounded blocks (the plan widens units and admits taught-term sentences; table cells
 // are read with the block before them as their label).
 if(plan)for(let i=0;i<deep.length&&records.length<40;i++){if(deep[i].length<=900)guided(deep[i],i,i>0&&deep[i-1].length<120?deep[i-1]:'');}
 // Phase272 (plan only): a value printed directly before a taught condition term ("10% window") is a condition parameter,
 // not a result; the plan removes such candidates whichever reader proposed them.
 if(plan){const ct=conditionTerms272(plan);for(let k=records.length-1;k>=0;k--){const r=records[k];const line=deep[r.blockIndex]??'';
  const rest=line.slice(r.valueOffset).replace(/^[\d.,]+\s*\S*?(?=\s|$)/,'').trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g,'')??'';
  if(rest&&ct.has(stem272(rest)))records.splice(k,1);}}
 // S86c: in controlled mode the records of the legacy prose and table passes go through the same role and subject checks as
 // the guided ones (one mechanism for every reading); only restrictive (a record is set aside or unresolved, never widened)
 if(p86){for(let k=records.length-1;k>=0;k--){const r=records[k];if(r.methodCue==='plan_guided_measurement_term')continue;const line=deep[r.blockIndex]??'';
  let off=0;let sent=line;for(const x of line.split(/(?<=[.!?])\s+(?=[A-Z£])/)){if(r.valueOffset>=off&&r.valueOffset<off+x.length+1){sent=x;break;}off+=x.length+1;}
  const at=r.valueOffset-(sent===line?0:off);const end=at+String(r.value).length;const u=canonicalUnit272(r.unit);const dim=u?dimensionOfUnit272(u)??'':'';
  if(p86.role){const ro=observationRole86c(sent,at,end,dim);if(ro.role!=='measured_result'){(out.classifiedObservations86c??=[]).push({value:r.value,unit:r.unit,blockIndex:r.blockIndex,valueOffset:r.valueOffset,role:ro.role,reason:ro.reason});records.splice(k,1);continue;}}
  if(p86.subject&&r.subject&&subject&&r.subject.name===subject.name&&otherProductInClause86c(sent,at,end,subject.name))records[k]={...r,subject:null,subjectAssignment:'multiple_models_unresolved'};}}
 // S86c: a value printed inside the page product's own name ("Vortex Compact 5L") is part of the name (a declaration), and
 // one result read several times (summary, body, table: same subject, value, unit and conditions) is offered once.
 if(p86?.role&&subject){const name=subject.name.toLowerCase();for(let k=records.length-1;k>=0;k--){const r=records[k];const line=(deep[r.blockIndex]??'').toLowerCase();
  for(let at=line.indexOf(name);at>=0;at=line.indexOf(name,at+1))if(r.valueOffset>=at&&r.valueOffset<at+name.length){
   (out.classifiedObservations86c??=[]).push({value:r.value,unit:r.unit,blockIndex:r.blockIndex,valueOffset:r.valueOffset,role:'declared_spec',reason:'value_in_product_name'});records.splice(k,1);break;}}}
 if(p86?.repeats){const seenResult=new Set<string>();let rep86=0;
  for(let k=0;k<records.length;k++){const r=records[k];const key=JSON.stringify([r.subject?.name??'unresolved@'+r.blockIndex,r.value,canonicalUnit272(r.unit)??r.unit.toLowerCase(),[...(r.conditionCodes??[])].sort()]);
   if(seenResult.has(key)){records.splice(k--,1);rep86++;}else seenResult.add(key);}
  if(rep86)out.repeatedReadings86c=(out.repeatedReadings86c??0)+rep86;}
 // Phase272 exploratory pass: any generic unit with a generic reporting cue, not covered by an accepted candidate.
 const exploratory:NonNullable<TestProbe225['exploratoryLeads272']>[number][]=[];
 if(opts.exploratory){const exRe=new RegExp('(?<![\\d.,])(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,3})?|\\d{1,7}(?:\\.\\d{1,3})?)\\s*('+unitAlternation272(EXPLORATORY_UNITS272)+')(?![a-z0-9])','gi');
  const anyTest=deep.some(b=>TEST_CONTEXT272.test(b)||claimedMethod.test(b));
  for(let i=0;i<deep.length&&exploratory.length<40;i++){const line=deep[i];if(line.length>900||negated.test(line)||secondary.test(line))continue;
   for(const sent of line.split(/(?<=[.!?])\s+(?=[A-Z£])/)){if(!anyTest||!(REPORT_CUE272.test(sent)||(line.length<120&&/\d/.test(line)))||DECLARATION_CUE272.test(sent))continue;
    for(const m of sent.matchAll(exRe)){const unit=canonicalUnit272(m[2]);if(!unit||rangeOrBound272(sent,m.index!,m.index!+m[0].length))continue;
     const value=Number(m[1].replace(/,/g,''));if(!Number.isFinite(value))continue;
     if(records.some(r=>r.blockIndex===i&&r.value===value&&(canonicalUnit272(r.unit)??r.unit)===unit)||exploratory.some(e=>e.blockIndex===i&&e.value===value&&e.unit===unit))continue;
     exploratory.push({value,unit,blockIndex:i,blockSha256:sha(line),subject:(plan?clauseSubject(sent,m.index!):null)??subject,status:'exploratory_research_lead'});}}}}
 // Reuse the established Phase155 English reader as a *separate diagnostic*.
 // Its domain-specific inventory is incomplete and must never be promoted.
 let oldCount=0;
 const limited=all.join('\n\n').slice(0,14000);
 if(limited.trim()){
  try{
   const analyzed=analyzeEnglishReview155({document:{text:limited,sha256:sha(limited),
    source:{id:'phase225_probe',originalDocumentId:'phase225_transient',url:sourceUrl,
     title:subject?.name??'Unverified product review',role:'original_product_test'}}});
   oldCount=analyzed.measurements.length;
  }catch{/* diagnostic failure cannot manufacture findings or block source acquisition */}
 }
 const table=probeTransientTestTables226(html,sourceUrl,opts);
 for(const c of table.candidates){if(records.length>=20){out.truncated=true;break;}
  if(!seen.has(c.id)){seen.add(c.id);records.push(c);}}
 out.truncated ||= table.truncated;
 const reasons=['no_authenticated_original_professional_test','method_and_test_origin_need_review',
  'product_variant_market_and_protocol_not_verified'];
 if(!records.length)reasons.push('no_conservative_explicit_test_measurement_candidates');
 if(scope!=='page_context_unverified')reasons.push('test_subject_ambiguous_or_missing');
 if(out.truncated)reasons.push('bounded_test_content_coverage_incomplete');
 return {...out,candidates:records.sort((a,b)=>a.id.localeCompare(b.id)),methodBlocks,instrumentBlocks,
  ...(plan?{planDigest272:plan.compiledFrom.digest}:{}),...(opts.exploratory?{exploratoryLeads272:exploratory}:{}),
  existingPhase155MeasurementLeads:oldCount,tableResults226:table.candidates.length,
  ambiguousTablesSkipped226:table.skippedAmbiguousTables,blockingReasons:reasons};
}
