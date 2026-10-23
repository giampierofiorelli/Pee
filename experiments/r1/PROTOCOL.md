# R-1 — First operational recovery of Crawler's capabilities: tables and quantitative extraction

| | |
|---|---|
| **Authorised by** | Owner, 2026-10-23 ("Primo recupero operativo delle capacità originali di Crawler") |
| **Scope** | Table structure (1F), table interpretation and quantitative extraction (1G, 1G + quantity knowledge), then controlled representation in S0/MS1 |
| **Unchanged** | S0; Crawler; `engine-ts/` imported files; T-1 freezes; historical results |
| **Status** | This protocol is committed **before any R-1 code**. Results go in `REPORT.md` |
| **Independence** | Claude's work on spent material, with a Claude-written reference. **Not independent validation** |

## 1. Capabilities and modules (skill §0, steps 1–3)

| Capability | `engine-ts` module (unchanged) | Entry point used | Used operationally before R-1 |
|---|---|---|---|
| Table grid: cells, header flags, spans, links, heading context | `src/table_acquisition1f.ts` (with `phase245_html_dom`, `phase245_table_grid`) | `acquireTables1F(html, {rendered: true})` | no (experiment adapters I-1, I-2 only) |
| Document model: headings, blocks, section paths, method blocks | `src/table_interpreter1g.ts` | `documentModel1G(html)` | no |
| Whole-table interpretation: axis roles (product, property, condition, record), value elements in cells (quantity, range, bound, number, rating), units from cell or header, conditions, context links | `src/table_interpreter1g.ts`, `table_interpreter1g_lessons.ts` | `interpretDocumentTables1G(html, {text: "rendered"})` | no |
| Quantity typing with Crawler's quantity knowledge | `src/table_interpreter1g_knowledge.ts`, `quantity_knowledge.ts`, `resources/quantity-knowledge/` | `interpretWithKnowledge1G(html, qk, {text: "rendered"})` | no |

`phase245_spec_extraction` (flat label–value facts) is not an arm: V1 §3.5 found it the flattest output.

**What was demonstrated before** (register `preservation/crawler-capabilities.json`):
- the copy is equivalent to Crawler on Crawler's own fixtures (E6);
- on 11 spent pages (V1), 1F gave "reliable structure", and 10 of 108 statements were reached only by 1G;
- no Pee measurement of 1G's correctness exists;
- Pee's own Markdown table reader (D-2) acquired 5 of 513 rows as single values.

These figures come from different evaluations and are not compared.

## 2. Material

- **Authentic, spent.** The 42 Markdown tables (34 distinct) of the three owner documents that A-1 and D-2 already
  read:
  - AP: air purifiers, v1.2;
  - DH: dehumidifiers, original;
  - THREE-DH: dehumidifiers, consolidated.

  They are private, read from `pee-knowledge`, and never published.
- **Split, fixed now by a mechanical rule.** The 30 distinct tables with at least one numeric cell are ordered by the
  SHA-256 of `"R-1 split " + sha256(cell texts)`:
  - **development:** the first 6 (AP 1, 2, 10, 13; DH 9; THREE-DH 12; 53 numeric cells);
  - **sealed:** the next 10 (AP 0, 3, 4, 6, 11, 16; DH 7, 8; THREE-DH 2, 8; 129 numeric cells);
  - the remaining 14 are not used.
- **HTML.**
  - No authentic spent HTML page is available in this session. The pages of V1, I-1 and I-2 live in
    `$PEE_PRIVATE_EVAL_DIR`, which is unset, and `pee-knowledge` keeps no page bytes.
  - **So the HTML arm on authentic pages is not run.** This is a limit of R-1, stated now.
  - Crawler's constructed fixtures (`FIXTURES1F`) are used only as a mechanics check of the bridge (tier T1), and are
    never scored.
- No Soundbars content, no new source, no agent, no model.

## 3. The Markdown → HTML adapter, and its preservation check (P0)

1F and 1G read HTML. A Pee-authored converter renders a Markdown document as HTML:
- headings, paragraphs and list items;
- pipe tables, with `<thead>`/`<th>` for the header row and `<td>` otherwise;
- links, emphasis and code spans.

It is written independently of `markdown.py`, so that the two parses check each other.

**P0, fixed now.** All of the following must hold on all 42 tables of the three documents, or R-1 stops:
1. Every table 1F acquires has the same number of rows and columns as `markdown.py`'s table.
2. Header flags agree cell by cell.
3. Cell text agrees cell by cell after whitespace normalisation and removal of emphasis and code markup.
4. Links in cells agree: the same URLs.
5. The heading path of each table agrees with `markdown.py`'s.
6. 1F reports each table `complete`.

Any disagreement is reported cell by cell. It is never assumed equivalent.

## 4. Reference (sealed before any arm runs on the sealed tables)

Claude reads the 10 sealed tables. For **every quantitative statement in a cell** (a number, range or bound with its
unit or scale, prose cells included), it writes:
- `table`, `row`, `col`;
- `surface` (the value as printed), `numbers`, and `unit` (as printed; null if none);
- `property`: what quantity it is, with acceptable alternative wordings as sets of content words;
- `entity`: what it is stated of (the row or column entity), with alternatives, or null when the table states it
  generally;
- `conditions`: each condition the value depends on (stated in the cell, the header or the caption), each with
  alternatives, and whether it is **essential** (the value is wrong without it);
- `nature`: measured, declared, threshold or requirement, guideline, typical or illustrative, or derived;
- `notes`.

Non-quantitative cells are not annotated.

- The reference file is private (`pee-knowledge/private-eval/pee-r1/`). Its SHA-256 is committed here before the
  sealed run.
- It is Claude's annotation, written by the same model that builds the arms. It is a reference for this comparison,
  not independent truth.

## 5. Arms (same inputs: the sealed tables, read in their whole documents)

| Arm | Path |
|---|---|
| **O** (Crawler) | The adapter, then `interpretWithKnowledge1G` (which runs 1F and 1G). Each observation is mapped one to one into a `has_value` unit: value, unit, property words, the product as an entity condition, and its conditions. Nothing is added or corrected. Evidence classes are kept as reported metadata, never as evidence |
| **N** (Pee now) | `propositions.read_propositions` at `f6032cc`: the D-2 table reader plus the sentence reader of prose cells, restricted to the sealed tables' cells |
| **S** (selective) | Fixed in principle now; parameters chosen on the 6 development tables only, then frozen (§7). Structure comes from 1F. Value elements, units and axis roles come from 1G where they pass Pee's checks: the unit is known to Pee's metrology or stated in the cell; the dimension is coherent; a role tie or an `ambiguous` table is not used. Pee's reading of prose cells is kept. Crawler's evidence classes are never adopted. S0/MS1 represents the result |

Every arm's units are represented with `knowledge_acquisition.represent` in a fresh universe with the general base.

## 6. Metrics (each reported separately; counts with denominators)

**Matching.** An output matches a reference item when it comes from the same cell and states the same number(s).

| # | Measure |
|---|---|
| M1 | **Structure** (P0, all 42 tables): rows, columns, headers, merged cells, sections, links |
| M2 | Per reference item: **found** (matched); **unit** right; **property** right; **entity** right; each **condition** right; **essential conditions** all present |
| M3 | **Fully correct**: found, with unit, property, entity and essential conditions right |
| M4 | **Losses**: reference items not found. **Abstentions**: a cell read and declared not assimilated |
| M5 | **Errors.** Spurious outputs: sealed-cell outputs that match no item. **Critical errors**: a wrong number or range end; a wrong unit or dimension; a value given to the wrong entity; an essential condition dropped while the value is kept; a declaration or threshold presented as a measurement |
| M6 | **Attribution and provenance**: every output keeps its cell locator; no evidence class is promoted |
| M7 | **After integration**: for each reference item, a `value` question is asked of each arm's universe through A-1's harness (the property, with the entity and essential conditions as conditions). Outcome: correct, wrong, uninformed (a term names nothing), or abstained |

**Deciding correctness.** Property, entity and conditions are decided mechanically: correct when every content word of
one acceptable alternative appears in the arm's corresponding field.
- "Structured" counts the dedicated field only.
- "Preserved" counts any field of the output.

A hand audit of disagreements is reported afterwards, as post hoc.

**Number of values extracted, representation in the universe and correct understanding are reported apart, and never
summed into one score.**

## 7. Development, freeze, sealed run

1. Build the bridge and the adapter. Run P0 on all 42 tables. If P0 fails: stop.
2. Write the reference and commit its hash.
3. Choose S's parameters on the 6 development tables only, with at most three reformulations. Freeze S by a commit
   (code hash) before the sealed run.
4. Make one sealed run of O, N and S. Commit the first-run results unchanged.

## 8. Decision rule (fixed now) and stop conditions

**S enters the operational path** (the assimilation route reads tables through the recovered capability) **only if
all of the following hold on the sealed tables:**
- D1. P0 passes.
- D2. S's critical errors ≤ N's, and ≤ O's.
- D3. S's fully correct items (M3) > N's.
- D4. No item that N gets fully correct is lost or wrong in S.
- D5. On M7, S's correct answers ≥ N's, and S's wrong answers ≤ N's.

If any fails, the integration stops, the result is reported, and nothing enters the operational path.

**Stop conditions.** Any one of these stops R-1 at that point:
- the adapter fails P0;
- a needed change touches S0, Crawler, an imported `engine-ts` file or a T-1 freeze;
- a needed rule is category vocabulary, or a rule that only excludes a test case;
- S shows a critical error of a type that neither N nor O makes.

**Regressions.** After any change to the operational path: every suite, D-2's final check, and one run of A-1's QS
(implications only).

**Preservation.** Any change to a gated path carries `preservation/records/r1.json`, and `preservation/check.py` must
pass.

**Cost limit.**
- One development cycle, one sealed run and one QS run.
- No other area of the register (prose, entities, context, qualitative, observations, methods) is started.
