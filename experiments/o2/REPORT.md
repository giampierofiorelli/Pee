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
