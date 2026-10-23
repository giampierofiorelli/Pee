/** Table understanding, Stage D — versioned table lessons (evaluation and shadow reading only).
 *
 * A lesson is a general, testable statement about how a table's own structure and its document establish a reading, derived
 * from confirmed table failures (experience cases EX-T*, private; public index evaluation/experience/step1e-index.json) and
 * applied by the decision ledger (src/table_ledger1e.ts) before table interpretation. Lessons name evidence and counter-
 * examples, never publishers, templates or products. Only `promoted` lessons are applied by default; `provisional` and
 * `rejected` ones stay recorded with their reasons. The active set is part of the Step 3 reading identity
 * (`tableLessonsDigest1E`), so a lesson change changes the reading version. Nothing here reaches the store: lesson-enabled
 * table leads keep the methodCue the persistence screen does not admit. */
import {createHash} from 'node:crypto';
import type {TableLessonId1E} from './table_ledger1e.js';

export type LessonState1E='promoted'|'provisional'|'rejected';
export interface TableLesson1E {
 id:TableLessonId1E;version:number;state:LessonState1E;
 /** Where the lesson acts: the shadow table reader, or nowhere yet (a confirmed mechanism outside this assignment's scope). */
 appliedIn:'shadow_table_reader'|'not_applied';
 /** What the lesson changes in the frozen reading, stated as a rule. */
 rule:string;
 /** When it applies (all conditions). */
 applicability:string[];
 /** Situations where it must NOT apply; each one has a test. */
 counterexamples:string[];
 /** Experience cases and adjudications that support it; frozen-reader rules it relaxes or completes. */
 provenance:{cases:string[];adjudication:string;relaxes:string[]};
 /** Tests that check the desired and the undesired behaviour. */
 tests:string[];
 /** Development evidence and the reason for the state (filled from the measured evaluation). */
 evidence:string;
}

export const TABLE_LESSONS1E:readonly TableLesson1E[]=[
 {id:'TL1_section_method_scope',version:1,state:'provisional',appliedIn:'shadow_table_reader',
  rule:'a table of unknown context is read as publisher-reported test results when a first-person measuring or testing statement in the same section, before the table, names a dimension the table\'s own numbers carry',
  applicability:['table context unknown (neither test nor specification by its own heading, caption, headers or the paragraph before it)','statement in the same heading section, before the table, first person (we/I) with a test or measurement cue','statement dimension equals a dimension of a unit in the table cells or headers','no specification signal: no specification heading, fewer than two specification row labels, no declaration cue in headers'],
  counterexamples:['a specification table in the same section (specification heading or row labels)','a statement about another quantity (noise statement, power table)','a statement in another section','no measuring statement at all'],
  provenance:{cases:[],adjudication:'evaluation/tables-1e/adjudication-cmp1.json',relaxes:['R08_unknown_context_no_test_label']},
  tests:['tests/table_lessons1e.test.ts'],evidence:'development (spent pages, goldeval-dev4): ablation E-TL1 loses 3 correct values and adds 1 wrong; sample cmp4 S14/S15 read. Provisional: every gain is on ONE publisher (its provenance); no transfer shown. Not applied by default'},
 {id:'TL2_header_units',version:1,state:'promoted',appliedIn:'shadow_table_reader',
  rule:'a bare number in a value cell (also with a thousands separator, or one of several numbers in the cell) takes the single plan unit its own row or column labels name, e.g. "Product (dBA)" or "HDR Brightness (10%, in nits)": the frozen bare-number rule, generalised beyond one bare number per cell',
  applicability:['the number carries no unit and no currency in its cell','the cell\'s own row and column labels name exactly one unit of the plan'],
  counterexamples:['labels naming two plan units','a currency (never a measurement unit)','labels without a unit','a header or first-column label cell'],
  provenance:{cases:[],adjudication:'evaluation/tables-1e/adjudication-cmp1.json',relaxes:['R12_no_plan_unit']},
  tests:['tests/table_lessons1e.test.ts'],evidence:'development (spent pages, goldeval-dev4): ablation E-TL2 loses 22 correct values, 0 new wrong, on TWO publishers with different table structures (products in rows with a 10%-window brightness header; products in columns with a dBA header); sample cmp4 confirms. Promoted for the SHADOW reader only: provenance = gain publishers, so transfer to an unseen publisher is untested'},
 {id:'TL3_dimension_from_table_context',version:1,state:'provisional',appliedIn:'shadow_table_reader',
  rule:'the dimension word the frozen reader requires in a cell\'s own labels may come from the table heading or caption, or from the linked method statement, when it names the dimension of the value\'s unit',
  applicability:['the value has a plan unit','the table heading, caption or TL1-linked statement names that unit\'s dimension'],
  counterexamples:['a heading naming another dimension','a heading of another section'],
  provenance:{cases:[],adjudication:'evaluation/tables-1e/adjudication-cmp1.json',relaxes:['R14_no_dimension_term']},
  tests:['tests/table_lessons1e.test.ts'],evidence:'development (goldeval-dev4): ablation E-TL3 neutral (0/0); needed only in the sample (S14, one publisher). Provisional: no measured gain on gold'},
 {id:'TL4_compound_cell_elements',version:1,state:'provisional',appliedIn:'shadow_table_reader',
  rule:'a price or currency in a cell that also holds a non-currency quantity rejects only the currency element (a cost or price is never a measurement); the other elements are judged by the remaining gates',
  applicability:['the cell holds a currency element and at least one number with a non-currency unit'],
  counterexamples:['a cell holding only a price','a cost column'],
  provenance:{cases:[],adjudication:'evaluation/tables-1e/adjudication-cmp1.json',relaxes:['R11_price_in_cell']},
  tests:['tests/table_lessons1e.test.ts'],evidence:'development (goldeval-dev4): ablation E-TL4 neutral (0/0); fixture test only. Provisional: no measured gain on gold'},
 {id:'TL6_cell_identity',version:1,state:'promoted',appliedIn:'shadow_table_reader',
  rule:'a table value is identified by its table, row and column as well as by its text, so equal texts in two cells remain two observations',
  applicability:['two value cells of one page with the same text, value and unit (e.g. 48.2 dBA for two products)'],
  counterexamples:['the same cell met twice (it stays one observation)'],
  provenance:{cases:[],adjudication:'evaluation/tables-1e/adjudication-cmp1.json (F-T6)',relaxes:['R16_duplicate']},
  tests:['tests/table_lessons1e.test.ts'],evidence:'development (goldeval-dev4): ablation E-TL6 loses 2 correct values and adds 2 wrong ones (equal-text cells collapsed onto the wrong product); one of the two gains is on a publisher OUTSIDE its provenance. Promoted for the SHADOW reader only'},
 {id:'TL7_table_cells_owned_by_table',version:3,state:'provisional',appliedIn:'shadow_table_reader',
  rule:'a prose-reader lead read from a table cell is withdrawn when the table itself shows the cell to be a declaration: a specification table, or a certification body or declaration cue in the cell\'s labels without a test cue in the same labels (v3; v1 withdrew every table-cell prose lead, v2 also withdrew cells labelled with a rating name such as CADR: both rejected, see evidence)',
  applicability:['shadow reading with the semantic-document contract','the lead\'s reader block is a table cell','the table shows declaration evidence for that cell'],
  counterexamples:['a cell of a test-results card without declaration labels (its prose-reader lead stays)','a label stating a test ("Tested CADR", "our test")','a value in prose next to the table'],
  provenance:{cases:[],adjudication:'evaluation/tables-1e/adjudication-cmp1.json (F-T7)',relaxes:[]},
  tests:['tests/table_lessons1e.test.ts'],evidence:'v1 REJECTED (goldeval-dev1): dropping every table-cell prose lead lost 75 correct values (74 on one publisher whose cards are test results). v2 REJECTED (goldeval-dev3): the rating-name rule withdrew 12 correct CADR values the publisher measured or estimated in its own test room ("We estimate a PM1 CADR of ..."); a rating name is not a declaration. v3 (goldeval-dev4): neutral on gold (0/0); sample cmp4 removes the 2 false measurements of a specification table (S16) but not the 9 AHAM-sourced CADR values of S12, whose declaration evidence lies outside the table. Provisional'},
 {id:'TL8_placeholder_corner_orientation',version:1,state:'provisional',appliedIn:'not_applied',
  rule:'a corner cell holding placeholder text ("Header Cell - Column 0", "Row 0 - Cell 0") is empty for orientation: products named across the header row run in columns',
  applicability:['Phase245 orientation of the production specification path'],
  counterexamples:['a corner cell with a real label ("Model", "Size")'],
  provenance:{cases:[],adjudication:'evaluation/tables-1e/adjudication-cmp1.json (F-T8)',relaxes:[]},
  tests:[],evidence:'confirmed failure (S03, S13): Phase245 emits specification facts with the property label as product; none is in the live store. Not applied: it changes the production Phase245 path, outside this assignment; recorded for the Phase245 owner'},
 {id:'TL5_setting_axis_conditions',version:2,state:'promoted',appliedIn:'shadow_table_reader',
  rule:'when at least 60% (and two or more) of an axis\'s labels are operating settings (speed, mode, level, sleep, turbo, standby...), those labels are the condition of each value on that axis (v2: also of another reader\'s lead from the same cell) and are never products',
  applicability:['first column (rows) or header row (columns) of setting labels'],
  counterexamples:['product names containing a setting word ("Turbo X1")','a single setting label'],
  provenance:{cases:[],adjudication:'evaluation/tables-1e/adjudication-cmp1.json',relaxes:[]},
  tests:['tests/table_lessons1e.test.ts'],evidence:'development (spent): v1 attached conditions only to table-reader leads, but where the prose reader had read the cell first its lead (no condition) shadowed the table lead: 4 of 57 sampled reads needing a condition carried one (cmp4). v2 (cmp6): 12 of 57, 12 of 12 equal to the annotation, on two publishers with structurally different tables (key-value test card; setting-by-product matrix); on the Step 1C and Step 1D-B gold 8 values gain their condition, 8 of 8 agreeing, 0 disagreeing (conditions-dev6), and 0 value changes (ablation E-TL5). Dependency: on its own (promoted set, cmp7-promoted, conditions-dev7) it acts only on tables already in test context (4 of 53 sampled reads, 0 on gold); the 8 gold conditions and the S14 ones also need TL1 (provisional). Promoted for the SHADOW reader only (it never adds a value or a product); most conditions (headings, method prose, column groups) are still not carried (D17)'},
];

export function activeTableLessons1E(states:readonly LessonState1E[]=['promoted']):TableLessonId1E[]{
 return TABLE_LESSONS1E.filter(l=>states.includes(l.state)&&l.appliedIn==='shadow_table_reader').map(l=>l.id);}
/** Digest of an active lesson set (ids and versions), part of the reading identity. */
export function tableLessonsDigest1E(ids:readonly TableLessonId1E[]):string{
 const rows=[...new Set(ids)].sort().map(id=>{const l=TABLE_LESSONS1E.find(x=>x.id===id);if(!l)throw Error('unknown table lesson '+id);return [l.id,l.version];});
 return createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0,16);}
