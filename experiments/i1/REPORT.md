# I-1 — Table statements become MS1 knowledge and are decided by MS1 rules

| | |
|---|---|
| **Authorised by** | owner, 2026-10-23 (section 0) |
| **Branch** | `claude/i1-table-knowledge`, from the V1 tip `3d339be`. X1, X2, V1 and Crawler unchanged |
| **Status** | Sections 0–3 are written **before any I-1 code** and committed. Results are added below them; nothing above is rewritten |
| **Independence** | Claude's work. **Not independent validation** |

## 0. Owner authorisation (verbatim)

> Autorizzo I-1 nel repository Pee, su un ramo separato, con accesso a Crawler esclusivamente in lettura. Nessun
> allegato aggiuntivo.
>
> L'obiettivo è realizzare finalmente l'integrazione effettiva fra struttura documentale, universo semantico S0/MS1 e
> regole di inferenza.
>
> Parti da un percorso verticale completo su tabelle autentiche: documento → struttura fedele → interpretazioni
> scientifiche attribuite → concetti e relazioni nell'universo → inferenza MS1 → conoscenza giustificata e
> riutilizzabile.
>
> Le regole decisionali devono utilizzare gli elementi dell'universo, non dizionari paralleli o confronti di stringhe.
> L'acquisizione può proporre interpretazioni, ma non emettere verdetti scientifici autonomi.
>
> Riutilizza i lettori strutturali di Crawler senza riscriverli e senza trasferirne automaticamente le
> interpretazioni. Evita nuove rappresentazioni semantiche parallele, duplicazioni della metrologia e modifiche a S0.
>
> Comincia con il minimo percorso eseguibile, verifica le dipendenze reali e amplia soltanto dopo il primo risultato.
> Correggi la discrepanza dei denominatori nella valutazione V1. Mantieni le verifiche su materiale già usato come
> regressioni e prepara una validazione distinta su materiale nuovo, sigillato e autorizzato.
>
> Per le 23 affermazioni non conservate, verifica separatamente identità, motivi di esclusione e diritti. Non aggirare
> le politiche di Crawler e non conservare informazioni non autorizzate.
>
> Preserva X1, X2, V1 e Crawler. Non avviare MS2, migrazioni o altri filoni. Registra successi, fallimenti e
> limitazioni, con condizioni di arresto misurabili. Concludi con un unico rapporto e fermati.

## 1. Correction of the V1 denominator

V1's criterion I1-c said "of the 61 V1 statements a structural reader finds". That number was the **raw** count from
Crawler's table reader, before the 5 false value matches were removed.

The correct counts, from the same V1 data:

| Count | Statements |
|---|---|
| Extracted by at least one Crawler reader, after removing the 5 false matches (the sum of V1's L2, L3, L5 and "reached" rows) | **67** (72 raw) |
| Located in a table by the annotators (V1 statement locators) | **61** |

I-1 is limited to tables, so its representation criterion (I1-c below) uses the **61 statements located in a table**.
The equality with the old number is a coincidence of two different definitions; the old figure is withdrawn. The V1
report is not rewritten: this section is the correction.

## 2. Design (fixed before code)

**Principle.** The two halves have separate jobs:
- **Acquisition** reads structure and proposes items: records, attributions, candidate contents, methods, ambiguities.
  It never writes a verdict.
- **Rules** answer questions by querying universe items. They never compare words.

**Path:**

| Step | What happens | Owner |
|---|---|---|
| 1. Structure | Crawler `7d091ef`, compiled outside its tree, runs **only its structural readers** offline: table acquisition (1F: grid, cells, spans, header cells) and the document model (heading tree, section paths, structured names). Crawler's role assignments, evidence classes, conditions and method-block labels are **not exported** | Crawler, read-only |
| 2. Records | Each value cell becomes a `record` holding its text, row and column header paths, caption, section path and locator. It is attributed to the publisher | acquisition |
| 3. Attribution | An attribution content: "source S reports the content of record R" | acquisition |
| 4. Candidate contents | MS1 `quantity` contents. Each header segment is placed in **one** slot (bearer, kind, condition or value) by querying universe items: quantity kinds and condition concepts with their anchors, metrology units, the page's structured names. Unplaced segments make the content `incomplete`, never qualifier words. Ambiguous readings become alternative contents under one `ambiguity` item | acquisition |
| 5. Methods | A section whose heading matches a method concept's anchors gives a `method` item. It becomes a ground of the contents in that section | acquisition |
| 6. Questions | A requirement becomes a `class_definition` (kind, operator, bound, unit, the extent end when asked) plus the inquiry's conditions. A comparison becomes a comparison question | request understanding (proposes) |
| 7. Inference | `rules.classify`, a new general `rules.compare` and `model.run` (s1core) decide, through the MS1 contract, with inference records and standings | MS1 rules and model services |
| 8. Reuse | Proposals stay in the store and serve as premises of later inquiries | MS1 contract |

**Additions to MS1:** knowledge and registry, no S0 change.
1. **One metrology.** s1core's unit table moves from code to a data file that every service reads. Its existing units
   and values are unchanged. It adds electric current and data as base dimensions, plus level scales with references.
2. **Universe knowledge.** General quantity kinds and condition concepts, as store items with lexical anchors.
3. **Registry.** New kinds `method` and `ambiguity`, registered as recorded events. New content forms `attribution`
   and `comparison`.
4. **Rules.** Contents may have open bounds; `incomplete` contents are never applicable; a class definition may name
   the extent end; alternatives must agree; `compare`.

**Out of scope:**
- prose;
- pages rendered by script;
- MS2 (recognition service, identity relations, frames);
- migrations;
- recovering Crawler's non-retained statements (section 3.4 is a diagnosis only).

## 3. Criteria (fixed before code)

### 3.1 First result: one vertical path

One authentic table page, spent in V1: the HouseFresh review. It has:
- settings in rows and in columns;
- a distance in a row label;
- products in rows, with the setting in parentheses;
- "at top speed" in a column header;
- values with labels inside one cell;
- test sections.

The path passes when all of the following hold:
- its contents carry bearer, kind, value, unit and conditions as slots;
- method and provenance are linked;
- **three different MS1 services answer three different problems from the same acquired contents**, each with
  grounds reaching the records:
  - a limit check (`classify`);
  - a comparison between two products under the same condition (`compare`);
  - a derived quantity (`model.run`) whose proposal is then a premise of a second classification.

Only then is the path extended to the other V1 table pages.

### 3.2 Success criteria (all required)

| Id | Criterion | Measure |
|---|---|---|
| **I1-a Integration** | Every verdict, comparison and derived value in every run is proposed by an MS1 rule or model service, with an inference record whose premises reach `record` items. Acquisition writes no `classification`, `comparison` or evaluative content, never imports or calls the rule or model services, and its code names no domain | store audit on every run; static tests |
| **I1-b Reuse** | The same acquired contents answer at least three kinds of question without question-specific code. At least 3 proposals of one inquiry are premises of another | vertical path and spent cases |
| **I1-c Representation** | Of the 61 V1 statements located in a table, ≥ 80% have bearer, kind, value, unit and their table-stated conditions as structured slots (V1: conditions 2 of 80). No condition survives as a word. A statement whose structure cannot be placed is `incomplete`, never misassigned | hand-checked against the V1 annotations (development) |
| **I1-d Safety** | 0 unjustified conclusions on the spent material re-asked through the new path: the X2 sealed questions whose products' tables are acquired, and the V1 vertical-path cases. The thousands-separator case ends reading-dependent, not concluded | regression, not held-out |

### 3.3 Stop criteria (any one stops I-1; the cause is reported)

1. Acquisition or rules need domain or category vocabulary in code (static test).
2. Condition matching cannot be done by concept identity without a string-matching layer in the rules.
3. More than the additions of section 2, any change to an S0 thesis, definition or criterion, or a change that breaks
   an MS1, s1core, X1 or X2 test is needed.
4. The vertical path (3.1) does not pass after three reformulations.
5. I1-c stays below 60% after three reformulations.
6. Any unjustified conclusion on regression: work stops before anything is added.

### 3.4 Separate checks

- **The 23 statements V1 found extracted but not retained.** For each one: the product identity Crawler resolved,
  the exclusion reason Crawler recorded (class policy, value kind, owner) and the rights class. This is read on a copy
  of the X2 store. Nothing is recovered or stored.
- **New sealed validation.** A protocol for new, authorised material is prepared here. Collecting that material needs
  a new owner authorisation of sources and access. None of the remaining retained pages is unspent, so no such check
  is run in I-1.

---

*Everything below was written after the runs. Sections 0–3 are unchanged.*

## 4. Outcome

**I-1 stops on stop criterion 5.** The integration works end to end, and it is safe on the spent material:
- the vertical path passes;
- every conclusion is proposed by an MS1 rule or model service from universe items;
- regression gives 0 unjustified conclusions.

But acquisition does not represent enough of the table statements. After three reformulations I1-c is **5 of 61
(8%)**, below the 60% floor. Per the owner's instruction ("amplia soltanto dopo il primo risultato") and section 3.3,
nothing is widened beyond that.

| Criterion | Result |
|---|---|
| Vertical path (3.1) | **pass** (first attempt) |
| I1-a Integration | **pass**: store audit on the vertical run and on the regression run; static tests |
| I1-b Reuse | **partly met**: one acquired content is a premise of three kinds of answer; the "3 proposals of one inquiry reused by another" clause is not met (section 5.2) |
| I1-c Representation | **fail**: 5 of 61 complete and correct (stop criterion 5) |
| I1-d Safety | **pass on what could be asked**: 0 unjustified conclusions in 100 spent X2 questions and the 6 vertical cases. The thousands-separator case could not be asked on authentic material (identity); it is covered only by a T1 test |

## 5. Results

All runs are development or regression on spent material. None is held-out.

### 5.1 Vertical path (HouseFresh review, page A-hf2)

Crawler `7d091ef`'s structural readers produce the structure (10 tables, 226 cells). Acquisition makes:
- 93 records, each with an attribution;
- 93 candidate contents, of which 42 are complete;
- 1 method item (the test section), which is a ground of the contents in that section.

Six questions are written as items and answered through `contract.inquire`:

| Question | Service | Answer | Standing | Records reached |
|---|---|---|---|---|
| SA600 sound level at speed 4, measured at the stated distance, against a bound | rules (classify) | applies | derived from attributed, unverified sources | 3 |
| SA600 vs Winix 5500-2 sound level at top speed | rules (compare) | less | same | 2 |
| SA600 energy at speed 4 over a stated 24 h, against a bound | model, then rules | applies (derived energy) | conditional on assumptions | 2 |
| Winix power at top speed, against a bound | rules (classify) | applies | derived from attributed, unverified sources | 1 |
| Winix vs AirFanta 3Pro power at top speed | rules (compare) | greater | same | 2 |
| Winix energy at top speed over a stated 8 h, against a bound | model, then rules | applies (derived energy) | conditional on assumptions | 1 |

Notes:
- The buyer's bound has basis "stated requirement". It is never a ground (plan I5): the energy answers stand
  "conditional on assumptions" because of the stated duration, not because of the bound.
- The SA600 sound level at speed 4 is stated in three tables of the page. All three are premises of the limit check.

### 5.2 Reuse (I1-b)

The acquired content "Winix 5500-2 power at top speed" is a premise of three answers of three kinds:
- a limit check;
- a comparison;
- a derived energy fed into a limit check.

No question-specific code is involved. The other clause (3 proposals of one inquiry are premises of another) is not
met. MS1 situates each proposal in its inquiry, so proposals are not reused across inquiries. Inside one inquiry, the
model's proposal is a premise of the classification. Reuse across inquiries happens through acquired contents, which
are unsituated.

### 5.3 Representation (I1-c), the three reformulations

Each run is hand-checked against the V1 annotations. "Complete" means bearer, kind, value, unit and the table-stated
conditions are all slots.

| Run | Complete | of which correct | Incomplete | Not acquired | Changes (all structural; no vocabulary) |
|---|---|---|---|---|---|
| Before reformulation | not recorded | — | — | — | Found two critical misassignments: an article title used as the subject; a "Spec" column header used as a bearer |
| R1 | not recorded | — | — | — | Subject precedence (structured product data, then title segment). A name-shaped header becomes the bearer when the other axis names a quantity kind; names on both axes leave the bearer undecided |
| R2 | 2 | 2 | 38 | 21 | A title segment is the subject only if a table header names it. A name needs two words or letters mixed with digits. Per-number units in ranges. A value line must start with its value or follow "Label:" |
| R3 | 6 | 5 | 32 | 23 | Header rows from the source's header flags. A value with a unit inside a header (a variant such as "500GB") is never absorbed. A header taken as a name is wholly a name. In text written in capitals, two-letter unit symbols are read only when unambiguous. Names get an identity key without plural stemming, keeping "+" |

Counts were recorded from R2 on. R3 = **5 of 61 correct = 8%** (< 60%): stop criterion 5.

The one wrong complete content in R3 is a frequency-response range. It is read as one frequency lying in that
interval. It is the span of a response, so its kind is wrong. Fixing it needs knowledge of response ranges, which
the stop rule leaves out.

Causes of the 32 incomplete statements:
- **header words with no universe concept:** particle type ("PM1", "smoke", "dust"), test standard ("AHAM"), workload
  ("idle", "gaming"), product parts ("robot", "station"), measuring scene;
- **no subject:** per-product tables whose product is named only in a heading;
- **row names to the right of a value cell:** a ranked comparison table;
- **an unrecognised quantity word** ("Sound", "contrast").

The 23 not acquired are values in prose-like cells, values without units, and cells with several values.

### 5.4 Every complete content on the nine pages (safety census)

To check safety rather than only coverage, every complete content acquired from the nine V1 table pages was checked by
hand: **59 complete** of 1,666 contents. Of these:
- **57 are correct** (bearer, kind, value, unit, conditions);
- **2 have the wrong kind** (the frequency-response ranges above).

The census found three critical errors after R3. They were corrected by restrict-only changes, which can remove
completions but never add one:

| Error found | Correction |
|---|---|
| A ranked comparison of 7 laptops: every row was assigned to the page's subject (the row name sits right of a rank cell) | A table that names things other than the subject gives no default bearer |
| A frequency range whose second number carries an unread unit word ("KHz") read with the first number's unit, giving bounds out of order | A number followed by an unread unit word makes the group's unit unknown; a range with bounds out of order is incomplete |
| A "500GB" variant column read as a value cell, so its column lost its header | When the source flags header cells, a fully flagged leading row is a header row even if it holds a value; such a header is not a name |

Two more identity faults found in the R3 hand check are fixed in R3 itself:
- "DW2450WS" stemmed to "DW2450W";
- "Mod+" read as "Mod".

A mass written with a one-letter symbol in capitals ("G") is no longer read as grams. A one-letter symbol in capitals
stays unread, so the content is incomplete.

### 5.5 Safety regression on the spent X2 sealed set (I1-d)

`regress_x2.py` acquires the 31 pages that ground the X2 questions' products: 1,537 records and 1,549 contents. It
writes the 100 sealed questions as items. The property and the condition are translated **by hand**, and the product
is matched only by exact identity key. Then it asks the rules.

| Outcome | Questions |
|---|---|
| Correct decision | 2 |
| **Unjustified decision** | **0** |
| Correct abstention (the reference does not conclude either) | 35 |
| Lost decision: undetermined | 13 |
| Lost decision: not askable | 50 |

Of the 50 not askable:
- 32 have no exact identity match (record names such as "5510" or "Mova S70 Roller" are not acquired entity names);
- 22 have a condition the universe cannot express (idle, gaming, load, test procedure);
- 21 have a property with no quantity kind (price, scores, filter life).

Several questions have more than one cause.

Comparison on the 79 limit questions, X2 figures from `experiments/x2/REPORT.md`:

| Path | Justified | Unjustified |
|---|---|---|
| Crawler alone (X2 arm A) | 7 | 0 |
| X2 B2S, reading Crawler's records | 13 | 1 |
| I-1, reading structure | 2 | 0 |

X2's one unjustified conclusion is the thousands-separator case rc-L12 (a dot used as a thousands separator). I-1 cannot ask it, because the
product is not identified, so the safety of that case is shown only by the T1 test: such a number gives two alternative
contents, and a bound between the readings gives "undetermined, depends on the reading". The regression store's audit
passes.

### 5.6 Integration audit (I1-a)

- **Store audit** (`run_i1.audit`) on the vertical and regression runs: every classification, comparison and
  inquiry-situated quantity is proposed by the rules or model service, and its grounds reach record items.
  Acquisition proposed no item outside its forms.
- **Static tests:**
  - acquisition imports no rule or model service;
  - the I-1 rule functions contain no domain words;
  - acquisition holds no word list (every word comes from universe items: quantity kinds, condition concepts, the
    `L:en` language item, metrology surfaces).
- The universe additions are data: `general.json`, `language.json`, `metrology.json`. s1core's 30 earlier units are
  unchanged (one metrology).

## 6. The 23 statements extracted but not retained (separate check)

This was read on a copy of the X2 store snapshot opened read-only, with Crawler's retention code at `7d091ef` read
but not run. **Nothing was recovered or stored.**

| Reason (Crawler's own gates) | Statements | Kind |
|---|---|---|
| Class policy `pee249-factual-observations-v1`: the per-host product cap for independent tests (25) was reached. The Notebookcheck revision kept metadata only (539 seen, 0 retained); Crawler's next action is `per_source_rights_review_to_exceed_cap` | 9 | rights |
| Class rule for independent tests: only measurement value kinds are retained; Phase245 typed these values as `text` or `options` | 9 | rights policy, plus extraction typing |
| No Phase245 fact carries the exact value; V1's match was not on the exact value | 5 | not verified |

Identity, per statement:
- In 7 cases, Phase245's fact belongs to another referent than the statement's subject. Examples: a transposed
  specification table read with "Random Write" and "Security" as products; a station tank owned by another referent.
- In 9 cases it is the same referent.
- In 7 cases no fact was located.

So these values would have been **misattributed** even if retained.

Among the 9 filtered by value kind:
- some are not measurements: price difference, interface, security support, warranty wording;
- some are measurements mistyped as text: dimensions, luminance.

Recovering any of them needs either an owner rights decision (the cap) or a change in Crawler's typing. Neither is in
I-1's scope.

## 7. Protocol for a separate validation on new material (prepared, not run)

No unspent retained page remains, so a validation needs new material and a new owner authorisation. Proposed:

1. **Authorisation first.** The owner names the hosts, the number of requests and the period. Robots rules,
   403/429, Content-Signal, TDM and `noai` are honoured; no refusal is bypassed. Pages are kept privately. Only
   hashes and counts are published.
2. **Selection.** About 12 pages with tables from at least 4 publishers never used in V1, X1, X2 or I-1. At least one
   category is not in the nine I-1 pages. Pages are chosen before any run, by a written rule (has a spec or measurement
   table), not by inspection of acquisition output.
3. **Sealed reference.** Two blind annotators (Claude agents, which are not independent) mark each table statement:
   bearer, kind, value, unit, conditions. The merged reference is adjudicated, and its hash is published before any
   run. Questions (limits and comparisons) are written from the reference by a third agent, with expected verdicts.
4. **Frozen build.** The I-1 build is frozen by commit hash before the reference is opened.
5. **Measures.**
   - complete-and-correct, incomplete and wrong, per statement;
   - unjustified conclusions, justified conclusions and abstentions, per question.
6. **Pass and stop.**
   - Safety: 0 unjustified conclusions and 0 wrong complete contents used by a conclusion.
   - Representation: at least the development figure.
   - Any unjustified conclusion stops the line.
7. The first run is published unchanged. Any later run is labelled tuned.

## 8. Limitations

- **Coverage is low.** The integration is demonstrated, but on few statements. Most table statements stay incomplete
  because the universe lacks concepts for test conditions (particle type, workload, standard), product parts and
  scenes.
- **Identity is exact-key only.** Entities are the page's own names. The same exact name in two documents is one
  entity. Variants, families ("G7000 series") and generic referents ("Bosch Benchmark") are not resolved; this needs
  MS2, which is not authorised.
- **Questions are translated by hand** in the regression harness (property → kind, condition → concept). Request
  understanding was not part of I-1.
- **Ranges are read as intervals.** That is sound for limit verdicts when the range bounds the quantity's values. It
  is wrong for spans of a response (section 5.3).
- **All material is spent.** Every figure is development or regression. Agreement between Claude agents is not
  independent validation.
- **Prose and script-rendered pages** are out of scope. Four of the 31 regression pages have no table.

## 9. Preservation and tests

- **Crawler:** HEAD `7d091ef`, clean tree; only its compiled structural readers were run, outside its tree.
- **Pee:** `experiments/x1`, `experiments/x2`, `reviews/` (V1) and `spec/` (S0) are identical to `3d339be`.
- **Suites:**

  | Suite | Tests | Result |
  |---|---|---|
  | s1core | 47 | pass |
  | universe | 42 (MS1 17, I-1 25) | pass |
  | X1 | 18 | pass, 1 skipped |
  | X2 | 25 | pass, 1 skipped |

  The skipped test is the snapshot fidelity test, which runs only with a snapshot copy.
- **Private material** (values, run outputs) is in `pee-knowledge` `private-eval/pee-i1/`, with page text replaced
  by hashes.

## 10. Minimal next increment (proposal; needs an owner decision)

The vertical path shows that the architecture holds. The binding obstacle is what the universe can express, not the
rules. The smallest next step would be:

1. **Condition concepts as universe items:** test material, workload state, test standard, part of. They would be
   used by acquisition and rules alike, measured on the same 61 statements and on the X2 regression, with the same
   stop rules.
2. **Row names anywhere in a row.**

Then the validation of section 7 on new authorised material.

Identity beyond exact keys (variants, families) belongs to MS2 and needs its own authorisation.
