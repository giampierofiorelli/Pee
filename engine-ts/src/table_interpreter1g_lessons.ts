/** Versioned lessons of the experimental global table interpreter (src/table_interpreter1g.ts; shadow use only).
 *
 * Each lesson is a general mechanism found by a demonstrable failed decision of the interpreter on the development sample
 * (evaluation/tables-1e/sample.json; development iterations eval-dev-it1..it10 in evaluation/tables-1g/), stated as a rule
 * with applicability and counterexamples, tested, and switchable so that its effect is measured by ablation. Lessons never
 * name publishers, templates or products. The active set's digest is part of every interpretation's version identity, so a
 * change of lessons changes the reading version (as for the Step 3 reading identity). `active` lessons run by default;
 * `provisional` ones only on request. Nothing here persists or ranks. */
import {createHash} from 'node:crypto';

export type InterpreterLessonId1G='GL1_values_are_not_labels'|'GL2_hierarchy_needs_evidence'|'GL3_structured_entity_grounding'|'GL4_scoped_method_statements'|
 'GL5_recurrence_qualifies_costs'|'GL6_label_conditions'|'GL7_identity_from_key_properties'|'GL8_property_head_precedence'|
 'GL9_prose_labels_state_no_conditions'|'GL10_structured_names_are_name_shaped'|'GL11_calculation_inputs_keep_method'|'GL12_parallel_tables_inherit_links';
export interface InterpreterLesson1G {id:InterpreterLessonId1G;version:number;state:'active'|'provisional'|'rejected';
 rule:string;applicability:string[];counterexamples:string[];failedDecision:string;provenance:string[];tests:string[];evidence:string}

export const INTERPRETER_LESSONS1G:readonly InterpreterLesson1G[]=[
 {id:'GL1_values_are_not_labels',version:1,state:'active',
  rule:'a header level whose label names (outside parenthesised qualifiers) are values is not a label level, and a bare quantity is never a product, property or record label; a quantity is a condition label only when the markup makes it a header',
  applicability:['any header-level hypothesis'],counterexamples:['setting labels with a number ("Speed 1")','labels whose numbers are qualifiers ("Oven (1hr @200°C)")','th-marked numeric condition headers'],
  failedDecision:'hypothesis selection: value columns ("53 mins", "57.7 dBA") and a first data row ("Sleep mode | 11.6 watts") were taken as header levels',
  provenance:['eval-dev-it1 (S01, S03, S09, S10, S11, S13, S14, S15, S17)'],tests:['tests/table_interpreter1g.test.ts'],evidence:'ablation (fully correct elements lost without it): dev 0, check 0; dev conditions 42 vs 35 without it. Its structural effect is largely covered by GL2 on these tables (redundant here); kept active because it reproduces no error and guards value levels'},
 {id:'GL2_hierarchy_needs_evidence',version:1,state:'active',
  rule:'a second header row or column is accepted only with evidence of hierarchy: header markup on that level, a spanning label in the level above or to the left, or labels that are products or settings and hold no values',
  applicability:['hypotheses with two header rows or columns'],counterexamples:['a thead with two rows','a colspan group header over sub-headers','an award row above a product row'],
  failedDecision:'hypothesis selection: the first body row or column became an extra header level',provenance:['eval-dev-it1 (S07, S13, S17)','eval-dev-it3 (S03, S17: record levels must not justify themselves)'],tests:['tests/table_interpreter1g.test.ts'],evidence:'ablation: dev -2 fully correct (product correct 245 vs 230), check -11 fully correct. Confirmed on the blind check set'},
 {id:'GL3_structured_entity_grounding',version:1,state:'active',
  rule:'a label is grounded as a document entity only by exact equality with a structured name (JSON-LD, microdata, link text, title or the subject segment of a title or h1), or by containment when it carries a model code; one-word labels are never grounded; editorial suffixes ("Review", "Specs") are not part of a name',
  applicability:['product-axis evidence and entity typing'],counterexamples:['section headings that equal a rating criterion ("Design")','generic appliance phrases inside a heading ("air fryer")'],
  failedDecision:'label typing: rating criteria and generic appliance names were taken as products; "<Product> Review" headers were not recognised as the reviewed product',provenance:['eval-dev-it2 (S04, S06, S07, S01)'],tests:['tests/table_interpreter1g.test.ts'],evidence:'ablation: dev -10 fully correct, +20 wrong products and +2 false measurements without it; check -3, +11 wrong products, +2 false measurements. Confirmed on the check set'},
 {id:'GL4_scoped_method_statements',version:1,state:'active',
  rule:'a method or declaration statement outside the table\'s own section supports an evidence class only when it names an entity of the table as well as one of its quantities; a statement in the same section needs only a shared quantity',
  applicability:['evidence classification from linked statements'],counterexamples:['a page-level "how we test" section that names the quantity but not the products of a specification table'],
  failedDecision:'evidence classification: declared specification values were classed as publisher measurements from a page-level method section',provenance:['eval-dev-it1 (S17: 22 false measurements; S01)'],tests:['tests/table_interpreter1g.test.ts'],evidence:'ablation: without it dev +24 false measurements, check +2. Confirmed on the check set (the guard prevents, it does not add values)'},
 {id:'GL5_recurrence_qualifies_costs',version:1,state:'active',
  rule:'recurrence terms ("per month", "/day", "annual") make a currency amount a derived cost of use and say nothing about other quantities; a currency amount labelled "cost" (not "price") is a cost of use; only explicit estimate or calculation terms make non-currency values derived',
  applicability:['evidence classification at value, label and heading level'],counterexamples:['"Price" rows','rates that are physical quantities ("L/day" extraction, "W + $/month" power)'],
  failedDecision:'evidence classification: running costs were prices; power and extraction rates became estimates because of "/month" or "/day"',provenance:['eval-dev-it1 (S02, S11, S15)','eval-dev-it4 (S15, S17)'],tests:['tests/table_interpreter1g.test.ts'],evidence:'ablation: dev evidence kinds correct 149 vs 144 without it; check 0. Development evidence only (not contradicted on the check set)'},
 {id:'GL6_label_conditions',version:1,state:'active',
  rule:'conditions stated inside labels are kept: embedded quantities of a property label ("Peak brightness 5%"), the varying part of sibling property labels that share the same quantity words ("Energy consumption standard clean" / "... eco clean"), and parenthesised qualifiers that hold a number or name a setting, mode, programme or window; unit lists and evaluative notes are not conditions',
  applicability:['observation reconstruction'],counterexamples:['"(inches / cm)"','"(lower is better)"','a single property label without siblings'],
  failedDecision:'observation reconstruction: conditions written in labels were lost; per-label word residues added noise (emoji, editorial words)',provenance:['eval-dev-it4..it9 (S02, S05, S06, S13, S15)'],tests:['tests/table_interpreter1g.test.ts'],evidence:'ablation: dev -10/+4 fully correct (conditions 42 vs 30); check -8. Confirmed on the check set; precision remains low (unmatched conditions on 13 dev and 28 check elements)'},
 {id:'GL7_identity_from_key_properties',version:1,state:'active',
  rule:'when one axis holds properties and the other has no product labels, a line\'s brand/manufacturer and model properties compose the product it describes, from exact cell texts only',
  applicability:['property tables whose product header is missing or an image'],counterexamples:['a model property without values','a table with product labels (they win)'],
  failedDecision:'attribution: a two-product specification table with image headers had no product',provenance:['eval-dev-it1 (S16)'],tests:['tests/table_interpreter1g.test.ts'],evidence:'ablation: dev -30 fully correct, check -58 fully correct and +16 wrong products without it. The largest effect; confirmed on the check set'},
 {id:'GL8_property_head_precedence',version:1,state:'active',
  rule:'a label holding a quantity head word ("consumption", "power", "noise", "time") is a property even when it names a setting ("Energy consumption eco clean"); a product name is not a property because of an incidental dimension word ("Levoit Core")',
  applicability:['label typing'],counterexamples:['"Fan speed 1" (a setting)','"Sleep mode"'],
  failedDecision:'label typing: property labels with a setting word lost their quantity, breaking sibling conditions',provenance:['eval-dev-it7 (S05, S11)'],tests:['tests/table_interpreter1g.test.ts'],evidence:'ablation: dev -4 fully correct without it; check 0. Development evidence only'},
 {id:'GL9_prose_labels_state_no_conditions',version:1,state:'provisional',
  rule:'a label cell that is prose (more than 12 words, e.g. a score summary or an explanation) contributes no conditions; its numbers are statements about other things',
  applicability:['observation reconstruction'],counterexamples:['a long but structured qualifier list in parentheses'],
  failedDecision:'observation reconstruction: explanatory label cells added counts and other values as conditions ("102 products")',provenance:['eval-check-firstrun (C07, C08): found AFTER the check run, so the check set cannot validate it'],tests:['tests/table_interpreter1g.test.ts'],evidence:'post hoc: unmatched conditions dev 13 -> 5 but correct conditions 42 -> 38; check 28 -> 4 (the check set suggested it, so it does not validate it). Provisional, not active'},
 {id:'GL10_structured_names_are_name_shaped',version:1,state:'provisional',
  rule:'a structured product name (JSON-LD, microdata) is used as the document subject only when it is name-shaped: at most 10 words, no sentence punctuation; editorial suffixes are removed',
  applicability:['single-subject tables'],counterexamples:['a long product name with a model code and variant (still at most 10 words)'],
  failedDecision:'attribution: a sentence in structured data, and a name with "Review", became the product',provenance:['eval-check-firstrun (C04, C09): found AFTER the check run, so the check set cannot validate it'],tests:['tests/table_interpreter1g.test.ts'],evidence:'post hoc: check wrong products 6 -> 3, dev unchanged (the check set suggested it). Provisional, not active'},
 {id:'GL11_calculation_inputs_keep_method',version:1,state:'provisional',
  rule:'when a method statement and a calculation (estimate) statement are both linked to a table in the same scope, a value whose quantity the method statement names is an input the publisher measured; only a cost of use or a value the calculation statement alone names is derived',
  applicability:['evidence classification from linked statements in one scope'],counterexamples:['a projected yearly energy figure that only the calculation statement names','currency amounts (handled at value level)'],
  failedDecision:'evidence classification: measured power draw beside a running-cost estimate became derived_or_estimated (S92 diagnosis, spent S91 pages)',provenance:['S92 diagnosis on spent S89-S91 pages (evaluation/s92/diagnosis-1g-vs-reference.json)'],tests:['tests/s92_document_relations.test.ts'],evidence:'S92 development (spent); provisional, run only on request'},
 {id:'GL12_parallel_tables_inherit_links',version:1,state:'provisional',
  rule:'a table without any applicable statement link inherits the linked evidence class of a twin table: same quantity signature (properties and dimensions of its values) under the same parent section; nearest-instance inheritance (S87c C §6.2)',
  applicability:['tables of repeated test runs or sibling result sections'],counterexamples:['a specification table that repeats the quantities of a results table (different heading role: its own declaration cue wins at heading level first)'],
  failedDecision:'evidence classification: the second of two identical particle-test tables in sibling sections had no evidence class (S92 diagnosis, spent S91 pages)',provenance:['S92 diagnosis on spent S89-S91 pages'],tests:['tests/s92_document_relations.test.ts'],evidence:'S92 development (spent); provisional, run only on request'},
];
export const ALL_INTERPRETER_LESSONS1G:InterpreterLessonId1G[]=INTERPRETER_LESSONS1G.map(l=>l.id);
export function activeInterpreterLessons1G(states:readonly InterpreterLesson1G['state'][]=['active']):InterpreterLessonId1G[]{
 return INTERPRETER_LESSONS1G.filter(l=>states.includes(l.state)).map(l=>l.id);}
/** Digest of a lesson set (ids and versions), part of the interpretation's version identity. */
export function interpreterLessonsDigest1G(ids:readonly InterpreterLessonId1G[]):string{
 const rows=[...new Set(ids)].sort().map(id=>{const l=INTERPRETER_LESSONS1G.find(x=>x.id===id);if(!l)throw Error('unknown interpreter lesson '+id);return [l.id,l.version];});
 return createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0,16);}
