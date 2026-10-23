# O-2 — Crawler's prose reader connected to S0: three readings compared on scientific fidelity

| | |
|---|---|
| **Authorised by** | Owner, 2026-10-23 (section 0) |
| **Step served** | `ORGANISATION.md` §4, step 3 (connect to the universe), measured before any admission (step 4) |
| **Branch** | `claude/pee-operational` |
| **Unchanged** | Crawler; S0; `engine-ts/` (imported code, O-1); the A-1 reader |
| **Status** | Sections 0–3 were committed **before the reference was sealed and before any O-2 code**. Results are added below them, and nothing above is rewritten |
| **Independence** | Claude's work, with Claude agents as annotators, judges and adjudicators. **Not independent validation** |

## 0. Owner authorisation (verbatim)

The owner's message:

> Prossimo passo consigliato: collegare un primo lettore originale all'universo S0, senza importare nuove capacità né
> scrivere automaticamente conoscenza permanente.
> Misuriamo se questa integrazione migliora davvero l'interpretazione rispetto ad A-1, soprattutto su prosa,
> attribuzione e condizioni.
> Non darei ancora priorità allo strumento di archivio. Prima dimostriamo che sappiamo tradurre correttamente ciò che
> leggiamo.

The owner's answers to Claude's three questions:

> **Material:** Scegli «09 Speakers». È il materiale meno esposto tra quelli proposti, secondo la ricognizione di
> Claude. Due condizioni: Sigillare le proposizioni di riferimento prima di sviluppare o modificare l'adattatore.
> Confrontare Crawler e A-1 sulla fedeltà scientifica, non soltanto sul numero di informazioni estratte. Attenzione: in
> alto leggo ancora «Crawler · Default». Prima di autorizzare O-2, verifica che Claude stia effettivamente lavorando in
> Pee, ramo claude/pee-operational, senza eseguire gli hook di Crawler.
>
> **Arms:** Scegli «Anche il combinato». Confrontiamo tre percorsi: A-1: interprete del nuovo Pee. Crawler: interprete
> originale collegato a S0. Ibrido: le migliori capacità dei due sistemi integrate. Il terzo è fondamentale: vogliamo
> dimostrare che il merging produce un miglioramento reale. Condizione: stessa documentazione, stessi criteri,
> combinazione definita prima del test e nessun nuovo motore semantico parallelo
>
> **Go-ahead:** Scegli «Sì, procedi». I criteri sono corretti: confronto dei tre percorsi, riferimento sigillato prima
> del codice, primo risultato invariato e massimo un ciclo di correzione. Una condizione: la metrica decisiva deve
> essere la fedeltà scientifica delle proposizioni, soprattutto attribuzioni, negazioni, condizioni e statuto
> epistemico. Non basta estrarre più informazioni.

**Environment check requested by the owner (done 2026-10-23, before this report).**
- **Where the work happens.** All work is in Pee, on branch `claude/pee-operational`.
- **Why the header reads "Crawler".** The session lists three attached repositories, Crawler first. That order is
  where the label comes from.
- **Crawler's hooks have not run in this session.**
  - Its `SessionStart`, `Stop` and `SessionEnd` hooks are declared in `Crawler/.claude/settings.json` through
    `$CLAUDE_PROJECT_DIR`.
  - The session's project directory is `/home/user`, which has no `.claude/` directory.
  - No knowledge store was restored (`~/.local/share/product-evidence-engine` does not exist).
  - `pee-knowledge` has no commit from a hook since the session started; its only commit since then is O-0's
    `f63dc05`.
- **Crawler is unchanged** at `7d091ef`, with a clean work tree.

## 1. Material verification (done before any annotation)

### 1.1 The document

- **Package.** `PEE-CATEGORY-RESEARCH-09-SPEAKERS-COMPLETE-v1.0.0.zip` in `pee-knowledge/research-packages/`, SHA-256
  `2f3c9336…1642`. It is read only, through a working copy outside every Git work tree.
- **The document read.** Every arm reads `COMPLETE-RESEARCH-COMPENDIUM.md`: 1,060 lines, 129,462 bytes.
  - The other eight Markdown files are contained in it. Their 8-word shingle overlap with it is 0.92–1.00, computed
    by hashing, with no text read. Reading them as well would only duplicate it.
  - Lines 745–1060 are the source register, identified by shingle overlap 1.00 with `SOURCE-REGISTER.md`. All arms
    read it, so that citations resolve, but it is not scored. In A-1, register lines produced spurious items.

### 1.2 Exposure census

- **Pee.**
  - No Pee experiment has read this package. No file under `experiments/` names it.
  - Before this census, the Pee reader had never been run on it.
- **Crawler's translator** (`knowledge_translation.ts`).
  - Its development documents were the dehumidifier, coffee and air-fryer packages.
  - The televisions and household dishwashers packages were held out, then used for tuning.
  - Crawler's G1b inventory excludes the speakers package by name ("untaught packages 05, 08, 09").
  - D1 re-translated only the documents already in the store; speakers is untaught and has none.
- **Other exposure, all of it tables.**
  - Crawler's N1 used **table rows** of this package as held-out material (H2), and `knowledge_translation.ts` was
    changed afterwards (`1550cb5`, `0308731`). The tables are therefore spent for Crawler's table reading.
  - The Phase272 Stage-A inventory paraphrased the package for Crawler's teaching. This is Claude exposure, not
    reader tuning.
- **Consequence.** Only **prose** is scored. Table lines are read by every arm but excluded from the reference and
  from scoring.
- **Claude's exposure in this step.**
  - Before sealing, Claude saw only counts per section (lines, prose lines, table lines, heading count, shingle
    overlap). No heading text and no prose was printed.
  - The annotators and adjudicator are separate agents. Claude does not read the sealed passages or the reference
    before the first run.

### 1.3 Splits (fixed by a hash, not by choice)

- **Candidate sections.** Every top-level section (`#` or `##`) of lines 1–744 with at least one prose line: 48
  sections.
- **Assignment.** A section goes to **development** when
  `int(sha256("o2-speakers-compendium-section-<first line>"), 16) mod 5` is 0 or 1. Otherwise it is **sealed**.

| Split | Sections | Prose lines | Line ranges |
|---|---|---|---|
| Development | 17 | 84 | 1–8, 15–27, 47–63, 86–117, 179–184, 205–208, 244–253, 287–292, 307–503, 521–538 (3 sections), 557–574, 583–592 (2), 628–631, 700–721 |
| Sealed | 31 | 113 | 9–14, 28–33, 35–46, 64–85, 118–178 (4 sections), 185–204 (2), 209–243 (2), 254–286 (2), 293–306, 504–518 (3), 539–556 (3), 575–580, 593–627 (4), 632–635, 661–699 (2), 722–744 (2) |

- **Size.** The sealed set is smaller than A-1's (113 prose lines against 212). Section 7 reports this as a limit.

### 1.4 Retention

- **Working copies.** Copies of the document live in a scratch directory outside Git and are removed at the end; the
  original zip is hashed before and after.
- **Sealed material.** It stays in a private directory outside Git: passages with line numbers, the reference,
  judgements and per-item rows.
- **Public repository.** It holds only:
  - hashes (`seals.json`);
  - counts;
  - this report;
  - the code.
- **`pee-knowledge/private-eval/pee-o2/`.** It receives copies of the private material, with document text and every
  string of 6 or more words, or over 60 characters, replaced by SHA-256, as in A-1.
- **Nothing is admitted.** No universe snapshot is written and no knowledge is admitted. The three universes exist
  only in memory, for the run.

## 2. Design (fixed before code)

### 2.1 One representation, three readers

The owner's condition was "no new parallel semantic engine". All three arms therefore end in the **same** S0/MS1
representation:

1. `markdown.read` (A-1 code) parses the working copy.
2. `knowledge_acquisition.read_units` reads the non-proposition units: the reference register (cited identifiers),
   labels, kinds and formulas. This is identical in every arm.
3. The **arm** supplies the proposition units, in the schema of `experiments/a1/annotation-guide.md`.
4. `knowledge_acquisition.represent` turns the units into universe items, as in A-1.
5. The export renders the items through `experiments/a1/fidelity.render`. It reads universe items, never text.

The arms differ **only in step 3**:

| Arm | Proposition units come from |
|---|---|
| **A** (A-1) | `propositions.read_propositions`, A-1 freeze 2 (`5554346`), unchanged |
| **T** (Crawler) | `knowledge_translation.translateDocument` of Crawler `7d091ef`, run unchanged from `engine-ts/` through a Node bridge, then mapped to units by the adapter (§2.2) |
| **H** (hybrid) | A's units, with selected elements taken from aligned T statements, plus unaligned T statements if the rule admits them. The procedure is in §2.3 and fixed now; its choices are made on development only and frozen before the sealed run |

### 2.2 The adapter (T statement → unit)

The adapter is a mapping, not a reader. It never reads the document text again, except to turn a block's first line
into a line range.

| Translator field | Unit field |
|---|---|
| `type` `increases` / `decreases` | `relation` the same; `content_kind` `causal` |
| `type` `depends_on` | `depends_on`; `dependence` |
| `type` `requires` | `requires`; `norm` |
| `type` `is_not` | `is_a`, `polarity` negated; `classification` |
| `type` `not_sufficient` | `establishes`, `polarity` negated (the A-1 form of `does_not_establish`); `method` |
| `type` `measured_by` | subject and object swapped, `measures`; `method` |
| `type` `composed_of` | one `part_of` unit per part (the part is the subject); `classification` |
| `type` `definition` | `defined_as`; `definition` |
| `type` `not_comparable` | `differs_from`, with the note "not comparable"; `comparison` |
| `type` `limitation` | `other: limitation`; `scope` |
| `type` `method_step` | `other: method step`; `method` |
| `type` `quantitative_finding` | `has_value`, object text kept; `quantitative`. The value is not re-parsed |
| `polarity` positive / negative | `affirmed` / `negated` |
| `hedge` `can`, `could`, `may`, `might` / `tends to` / other | `modality` `possible` / `typical` / `possible` |
| `subject.axes`, `object.axes` | `conditions` `[{concept: axis, value}]` |
| `status` (the document's own markers, never upgraded) | the attitude and evidence table below |
| `refs` | `attributed_to` (cited identifiers) |
| `provenance.line`, `quote` | the record: locator `lines a-b` (the block's lines) and the quote, as in A-1 |
| `selfCheck` not empty | the statement is **not** mapped. It is counted as refused, as Crawler does |

| Translator `status` | `document_attitude` | `evidence_kind` |
|---|---|---|
| `proposed_method` | `proposed` | `proposal` |
| `hypothesis` | `hypothesised` | `hypothesis` |
| `general_principle` | `asserted` | `synthesis` |
| `source_observation` | `reported` | `none_stated` (never `original_measurement`: the marker alone does not show a measurement) |
| `expert_judgement` | `asserted` | `expert_judgement` |
| `normative_rule` and other normative markers | `asserted` | `standard_or_regulation` |
| several markers | the most cautious attitude wins, in the order `hypothesised`, `proposed`, `reported`, `asserted` | taken from the same marker |
| none | `asserted` | `synthesis` (the package author's voice, as in A-1) |

The adapter has **no category words**. A test extends the MS1 and F-1 vocabulary tests to it.

### 2.3 The hybrid (procedure fixed now; its choices are made on development)

- **Alignment.** A T statement is aligned to an A unit when two things hold:
  - their line ranges overlap;
  - the Jaccard overlap of the content words of subject and object is at least 0.34, the A-1 proxy threshold.

  Each A unit takes at most its best T statement.
- **Element groups.** Six groups:
  1. structure (subject, relation, object or value);
  2. polarity;
  3. modality;
  4. conditions;
  5. attitude and evidence kind;
  6. attribution.
- **Choice per group.** For each group, H takes the value from the source, A or T, that has the higher element
  accuracy on the development reference: right ÷ (right + wrong) on aligned pairs, judged by a development judge. On a
  tie, or below 10 aligned judged pairs, H keeps A.
  - A choice of T applies only where T holds the element.
  - A missing T element never deletes an A element.
- **Unaligned statements.**
  - Unaligned A units are always kept.
  - Unaligned T statements are added only if, on development, their faithful precision is at least A's faithful
    precision.
- **Freeze.** The six choices and the inclusion decision are written to `hybrid-choices.json` and committed with the
  freeze, before the sealed material is opened.
- **No new reader.** H adds no reading rule of its own. It only chooses, element by element, between two existing
  readers.

### 2.4 Alternatives considered

- **Re-implement Crawler's cues in Python.** Rejected: it is the preventive rewrite that `ORGANISATION.md` excludes.
- **Merge by voting at the proposition level** (keep whichever whole proposition looks better). Rejected: it cannot
  combine A's segmentation with T's status and attribution reading, which is the combination the owner asked to
  test.
- **Let T replace A wherever aligned.** Rejected: it fixes the result before any measurement. The per-group choice
  lets development decide, and it can keep A everywhere.

## 3. Evaluation and criteria (fixed before the reference is sealed and before code)

### 3.1 Sealed material (Claude agents, before any O-2 code)

- **Reference R.**
  - Two agents annotate the sealed sections blind, with `experiments/a1/annotation-guide.md` unchanged. Each agent
    sees only the guide and the passages with their line numbers. Table lines are marked "not scored".
  - A third agent adjudicates.
  - The hashes of the passages, both annotations and R are committed in `seals.json` before any O-2 code.
- **Development reference D.**
  - One agent annotates the development sections with the same guide.
  - A development judge grades A and T on D for the hybrid choices.
  - D is spent by design.

### 3.2 Measures (sealed run; judges blind to the arm)

- **Rendering.** Each arm's propositions from the sealed prose lines are rendered from universe items.
- **Judging.**
  - Each arm is judged by two judge agents with `experiments/a1/judge-guide.md`, the passage range generalised.
  - The arms are shown under random labels, and no judge is told which reader produced a list.
  - A third agent adjudicates disagreements and every critical error only one judge listed.
- **Grades.**
  - Per produced item: faithful, unfaithful or spurious, with element grades.
  - Per reference proposition: complete, partial or missed.
- **Critical errors.** Six types, as in A-1:
  1. polarity flipped;
  2. direction inverted;
  3. a proposal, hypothesis or question promoted;
  4. a synthesis, guidance or judgement promoted to an original measurement;
  5. a false attribution;
  6. merged concepts.

### 3.3 Decisive metric: scientific fidelity (owner condition)

| Id | Measure | Role |
|---|---|---|
| **F1** | Critical errors, per type; above all types 1, 3, 4, 5 (negation, epistemic promotion, attribution) | decisive |
| **F2** | Precision: faithful ÷ produced | decisive |
| **F3** | Faithful coverage: reference propositions matched by at least one **faithful** item ÷ reference propositions | decisive |
| **F4** | Key-element accuracy on matched items, separately for **attribution**, **polarity**, **conditions** and **attitude with evidence kind**: right ÷ (right + wrong); the missing share is reported beside it | decisive |
| F5 | Recall: (complete + partial) ÷ reference; complete share | reported only: more extraction is not success |
| F6 | Items produced; T statements refused by the self-check; unaligned T statements added | reported only |

### 3.4 Criteria

**C1. Connection works.**
- T's statements become universe items through `represent` with no S0 change.
- Every mapped statement is accounted for: represented, abstained with a reason, or refused by the self-check.

**C2. Comparison with A-1.**
- For T against A, and for H against A, report F1–F4 and their differences.
- "Better than A-1" means all of these:
  - F1 type-1, 3, 4 and 5 errors ≤ A's, and total critical errors < A's;
  - F2 > A's;
  - F3 > A's;
  - no F4 element below A's.

**C3. The merge produces a real improvement.** This is the owner's central question. It is shown only if, for each
X in {A, T}, all of these hold:
- F1 total critical errors of H ≤ X's, and none of types 1, 3, 4 and 5 above X's;
- F2 of H ≥ X's;
- F3 of H > X's;
- F4 of H ≥ X's on each of the four key elements.

A paired comparison on reference propositions supports F3: an exact sign test, H against X, over the propositions
where exactly one of the two has faithful coverage. It is reported with its p-value.

**C4. Nothing durable.**
- No universe snapshot is written.
- Working copies are removed, and their removal is checked.
- The original's hash is unchanged.
- No public file holds document text.

**C5. Regressions.** No regressions in:
- the universe, s1core, X1 and X2 suites;
- the A-1 reader on its own (A is unchanged code);
- the `engine-ts` checks of O-1 (E1, E2, E4).

**C6. No category vocabulary in the adapter or the hybrid.** Checked by the extended vocabulary test.

### 3.5 Stop rules (any one stops the phase; the cause is reported)

- **O1.** A needed distinction requires an S0 change: stop and present the decision to the owner.
- **O2.** The adapter would need category words or a category branch.
- **O3.** After the sealed first run, **at most one** change cycle, with a new freeze.
  - The change may touch the adapter or the hybrid rule, never `engine-ts/` or the A-1 reader.
  - Its results are labelled "after change" and are spent.
  - The first run stays committed unchanged.
- **O4.** A critical error is reported as a defect, never as a success, whichever arm makes it.
- **O5.** A working copy cannot be removed, or the original's hash changes: stop and report.

## 4. Outcome

**The merge did not produce an improvement.** On the sealed passage, and measured on scientific fidelity:
- A-1 (A) is the best of the three readings.
- Crawler's reader connected to S0 (T) is the weakest.
- The hybrid (H) is worse than A on every decisive measure.

C3 is not shown. C2 fails for both T and H. The connection itself works (C1), nothing durable was written (C4), and
nothing regressed (C5, C6). This is the first sealed run on freeze 1, unchanged. The one permitted change cycle (O3)
was **not** used, because the owner asked for the final report before any decision.

| | Criterion | Result | Met |
|---|---|---|---|
| C1 | T's statements become universe items with no S0 change; every statement accounted for | 670 statements → 674 units: 607 represented, 67 abstained (no subject), 0 refused by the self-check | yes |
| C2 | T better than A-1 | No: F1 6 vs 15, but F2 0.14 vs 0.35 and F3 0.04 vs 0.30 | no |
| C2 | H better than A-1 | No: F1 23 vs 15, F2 0.23 vs 0.35, F3 0.19 vs 0.30, polarity 0.93 vs 0.98 | no |
| C3 | The merge improves on both A and T | Better than T, worse than A on F1, F2, F3 and polarity | **no** |
| C4 | Nothing durable; copies removed; original unchanged; no text public | No snapshot; working copies and passages removed; zip hash unchanged (`2f3c9336…`) | yes |
| C5 | No regressions | universe, s1core, X1, X2, O-2 tests and the engine-ts provenance check (E1, E2) all pass | yes |
| C6 | No category vocabulary in the adapter or the hybrid | test passes | yes |

## 4.1 Additions made before the sealed run, at the owner's request

After the reference was sealed, the owner raised three concerns: the weak agreement between annotators (22 of 250
propositions identical in every field), the loss of Markdown citations in Crawler, and the gap between "represented"
and "understood". Two measures were added in response, both **before** any sealed output was produced or opened.

**1. Field-level agreement of the two annotators** (226 propositions both annotated; labels only, no text read):

| Field | Agreement |
|---|---|
| Attitude | 1.00 |
| Polarity | 0.95 |
| Conditions (count) | 0.94 |
| Attribution | 0.90 |
| Modality | 0.88 |
| Content kind | 0.82 |
| Evidence kind | **0.54** |

- **The 22-of-250 figure.** It counted propositions identical in every field, wording of subject and object included.
- **The weak field is evidence kind.** 97 of its 103 disagreements are the same convention: an author's own claim
  read as `synthesis` by one annotator and as `none_stated` by the other.

**2. A second, independent arbitration of the 103 evidence-kind disagreements.**
- The second adjudicator did not see the first one's choices, and wrote an explicit rule before deciding any case.
- It agreed with the first adjudicator on 67 cases. The remaining 36 (15% of the 238 scientific propositions) are
  **contested**.
- In scoring, both labels count for those 36, and evidence-kind accuracy is also reported without them. Sealed in
  `seals.json` (`f9c05d7`).

**3. Adjudication conventions** (`adjudication-conventions.md`, `7fe05c5`).
- **Why.** The six judges disagreed on four conventions: evidence kind, generic "limitation" items, attribution and
  modality.
- **When fixed.** After the judgements and **before the arm labels were revealed**.
- **How applied.** The three adjudicators applied them to every disputed grade.

## 5. Results (sealed passage: 238 scientific reference propositions)

### 5.1 Decisive measures

| | A (A-1) | T (Crawler) | H (hybrid) |
|---|---|---|---|
| Items produced | 280 | 92 | 286 |
| Faithful / unfaithful / spurious | 98 / 165 / 17 | 13 / 73 / 6 | 66 / 201 / 19 |
| **F2 precision** | **0.350** | 0.141 | 0.231 |
| **F3 faithful coverage** | **0.298** (71) | 0.038 (9) | 0.189 (45) |
| **F1 critical errors** | 15 | **6** | 23 |
| of which type 1 (negation) | 8 | 0 | 14 |
| type 2 (direction) | 3 | 4 | 5 |
| type 3 (promotion), type 4 (measurement) | 0, 0 | 0, 0 | 0, 0 |
| type 5 (attribution) | 1 | 0 | 1 |
| type 6 (merge) | 3 | 2 | 3 |
| F5 recall (not decisive) | 0.765 | 0.319 | 0.794 |

**F3 sign tests.** These count the reference propositions faithfully covered by exactly one of the two arms:

| Comparison | Only the first | Only the second | p |
|---|---|---|---|
| H against A | 2 (H) | 28 (A) | ≈ 1e-6 |
| H against T | 37 (H) | 1 (T) | < 1e-6 |
| T against A | 2 (T) | 64 (A) | < 1e-6 |

### 5.2 Key elements (F4): right ÷ (right + wrong); missing shown separately

| Element | A | T | H |
|---|---|---|---|
| Attribution | 0.985 (130 missing of 263) | 1.000 (51 missing of 86) | 0.993 (128 missing of 267) |
| Polarity | **0.977** | 1.000 (25 missing: "limitation" items) | 0.933 |
| Conditions | 0.977 | 0.988 | 0.992 |
| Attitude | 0.894 | 0.826 | 0.891 |
| Evidence kind | 0.734 | 0.506 | 0.749 |
| Evidence kind, uncontested only | 0.727 | 0.526 | 0.730 |

- **Attribution.** When an attribution is present it is almost always right in every arm. About half of the cited
  sources are **missing** in every arm. T also loses all of them on this document: its reader drops the brackets of
  Markdown-link citations (`[R05](url)`), section 6.
- **Polarity.** T's polarity looks perfect because the 25 cases it gets wrong are held as a generic "limitation"
  relation, graded "missing" by convention 2. In H, the polarity taken from T on aligned items brought 14 negation
  errors, against A's 8.
- **Attitude.** No arm promoted a proposal, hypothesis or question (type 3: 0), and none held a synthesis as an
  original measurement (type 4: 0).

### 5.3 Why the hybrid failed (post-hoc diagnosis; no change made)

**1. The development evidence did not transfer.**

| Precision | Development | Sealed |
|---|---|---|
| A | 0.38 | 0.35 |
| T | 0.56 | 0.14 |

The choices of H were made on development (section 2.3). On development, T's unaligned statements had precision 0.66,
higher than A's, so the rule admitted them, and T's structure, polarity, modality and conditions won the per-group
comparison. On the sealed passage, T's precision fell to 0.14 while A's stayed stable.

Measured differences between the two measurements:
- **Judges.** Development was graded by a single judge per arm, without the adjudication conventions. The sealed
  passage used two judges and an adjudicator per arm, under the conventions.
- **Evidence kind.** The strict convention costs T most.

A choice rule decided by one unadjudicated judge on 84 prose lines was too weak a basis for the merge.

**2. Admitting unaligned T statements diluted precision.** H holds most of A's faithful items, but adds T's mostly
unfaithful ones.

**3. Taking polarity from T on aligned items added negation errors.** H has 14 type-1 errors against A's 8.

## 6. Findings about Crawler's reader on this document

- **Citations lost.** `knowledge_translation`'s text cleaning (`clean`) turns `[R05](https://…)` into `R05`, so its
  reference pattern `[R##]` never matches. On this document 0 of 670 statements carry a source. This is a reader
  defect, not an adapter defect, and `engine-ts/` was not changed.
- **Negation in "limitation".** Its `limitation` statements carry a restriction, such as "is not always", without a
  negative polarity. Mapped as specified (§2.2), they are read as affirmed claims with a generic relation.
- **Low coverage of prose.** 444 of 1,110 clauses are unrecognised. On the sealed prose lines, T has 92 items
  against A's 280.
- **"Represented" is not "understood".** 607 of 674 units were represented in the universe. On the sealed lines, only
  13 of T's 92 items were faithful.

## 7. Limits

1. **Not independent.** Every annotator, judge and adjudicator is a Claude agent. Agreement between them is not
   independent validation.
2. **Sample size.** The sample is small: 113 prose lines and 238 propositions, against 212 lines in A-1.
3. **Evidence kind.** It remains uncertain in the reference (36 contested propositions). The guide's distinction
   between `synthesis` and `none_stated` is ambiguous, and needs an owner rule before the next sealed set.
4. **Judge agreement.** It is low on full item grades: 267, 151 and 66 items disputed in H, A and T. The adjudicators
   also read convention 4 (modality) differently: narrowly for T's list, broadly for A's. This may move F2 by a few
   points, but not the order of the arms.
5. **Hybrid choices.** They were made on a single, unadjudicated development judgement, the main cause of H's failure
   (section 5.3).
6. **Spent material.** The sealed passage is now spent and cannot serve as held-out material again.

## 8. What would be needed next (not authorised; for the owner's decision)

1. **No merge of the readers as specified.** On this evidence, A-1's reader should stay the main prose reader. Crawler's
   translator adds no faithful knowledge that A lacks: only 2 reference propositions are covered by T and not by A.
2. **The one permitted change cycle, if the owner wants it.** It would be a narrower hybrid that keeps A whole and
   takes from T only what T reads that A does not. It would be labelled "after change", and is spent by
   construction.
3. **A larger lesson for every future comparison.** Development choices must be made with the same judging protocol
   as the sealed test: two judges plus an adjudicator, under the conventions.
4. **What deserves attention instead.** These are A's own losses, not the merge:
   - the missing attributions (about half);
   - the evidence-kind rule;
   - the negation errors (type 1: 8).
5. **Crawler's citation defect.** It would be fixed only by changing imported code, a separate step that needs owner
   authorisation (`ORGANISATION.md` §4, step 5).

## 9. Private material

| Location | Content |
|---|---|
| Session scratch (outside Git, removed at session end) | annotations, references, judgements, adjudications, per-item scores, label key |
| `pee-knowledge/private-eval/pee-o2/` | copies of the same, with strings of 6 or more words or over 60 characters replaced by SHA-256; `MANIFEST.json` holds the original and copy hashes; no passages, no document text |
| `results-counts.json`, `seals.json`, `freeze-1.json`, `hybrid-choices.json` (this directory) | public counts, hashes and the frozen choices |

## 10. Recommendations received after the report (2026-10-23, verbatim; not an owner authorisation)

> Il risultato è deludente, ma chiarisce finalmente una questione importante: il merging dei lettori, così com’è stato
> realizzato, non funziona.
>
> La mia decisione sarebbe:
>
> * Non utilizzare il ciclo di correzione O-2. Il risultato è sufficientemente chiaro.
> * Mantenere A-1 come lettore provvisorio della prosa, non come soluzione definitiva: il 35% di precisione è ancora
>   insufficiente.
> * Conservare tutte le capacità importate da Crawler. Questo esperimento non dimostra che siano peggiori nella lettura
>   di tabelle, specifiche o pagine Web.
> * Cambiare approccio alla comprensione linguistica. Prima di aggiungere altre regole, valutare un interprete più
>   capace, eventualmente neurale e locale, collegato a S0.
>
> Il dato più preoccupante non è che l’ibrido abbia fallito: è che anche il migliore dei tre lettori produce ancora 15
> errori critici.
>
> Conclusione: non abbandonerei né Pee né Crawler. Ma sospenderei l’attuale strategia di combinazione delle regole
> linguistiche. Il prossimo investimento dovrebbe riguardare la qualità dell’interpretazione scientifica, non un’altra
> fusione meccanica dei risultati.
>
> E nessuna acquisizione permanente finché la fedeltà non sarà sufficientemente affidabile.

**Correction (2026-10-23).** On first recording, Claude called this text an owner decision. The owner pointed out
that it holds recommendations, not an explicit authorisation (`ORGANISATION.md` §7.3).
- **O-2's state.** The first sealed run is done, and the change cycle has not been run.

**Measured fact added for the next decision** (post hoc, sealed material already spent): A-1's precision is 0.35, and
0.44 if evidence-kind errors are ignored. The element most often wrong in its unfaithful items is the **relation**
(96 items). Next come evidence kind (70), subject (37), object or value (32) and attitude (28). The main loss is the
interpretation of what a sentence asserts, not a labelling convention.
