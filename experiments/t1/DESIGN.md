# T-1 — Design: translate the owner's documents sentence by sentence into the universe, then reason from it

| | |
|---|---|
| **Status** | **Design only.** Nothing is run. Each stage needs the owner's go-ahead. The owner may have it reviewed by ChatGPT |
| **Basis** | The owner's messages of 2026-10-23 (section 0) |
| **Branch** | `claude/pee-operational` |
| **Unchanged** | S0, the 27 relations of the annotation guide, `engine-ts/`, Crawler |

## 0. The owner's direction (verbatim)

> Perché invece che prendere il materiale da dal web, non usi i documenti che noi avevamo caricato e vedere se se si
> riesce a tradurre quello che c'è dentro quei documenti senza fare nessun riassunto, tradurre frase per frase dentro il
> nostro universo semantico e poi sei in grado di comprendere e fare i ragionamenti.
>
> Non modificare le 27 relazioni soltanto per aumentare l'accordo. Prima bisogna verificare se alcune distinzioni
> rappresentano differenze scientifiche reali. Per esempio, raccomanda e richiede possono avere conseguenze molto
> diverse nella consulenza sui prodotti. Se una caratteristica è obbligatoria, PEE deve distinguerla da una semplice
> preferenza.
>
> Aggiungerei un principio: l'astensione deve essere selettiva. Se PEE comprende correttamente una misura, la sua unità
> e il prodotto a cui si riferisce, ma non riesce a classificare una relazione secondaria, non deve necessariamente
> scartare tutta l'affermazione.

The owner then answered "Sì" to the proposal of this design.

**Note.** The material was never taken from the web.
- A-1 used the owner's dehumidifier document.
- O-2 and C-1 used the owner's package 09 Speakers.
- T-1 uses the owner's package 08 Soundbars.

All of them are documents the owner uploaded to `pee-knowledge`.

## 1. The goal and what is known

**The goal.** An owner document is translated **sentence by sentence**, with no summary, into universe items. Pee then
answers questions **from the universe alone**, without the document.

**Both halves fail today:**

| Half | Measured |
|---|---|
| **Translation** (O-2, speakers prose, 238 reference propositions) | A-1's precision is 0.35 (0.44 without evidence-kind errors), faithful coverage 0.30, 15 critical errors. 96 relation errors, about 60 of them fallbacks to `other` |
| **Reasoning** (A-1, 45 determinate questions) | Even with the **correct** translation given (the oracle), 6 of 45 are correct. The main cause is that question terms are not recognised as the concepts already held (A-1 REPORT §7.2). From its own translation, Pee answered 5 correctly, and 1 answer was unjustified |
| **Cheaper alternatives** (C-1) | A general small model on CPU, and classifiers trained on 507 annotations, did not beat A-1's rules |
| **Reference reliability** (C-1 §18) | Cohen's κ 0.76 on relations, but uneven: `requires` 0.85, `recommends` 0.74, `is_a` 0.38, `applies_to` 0.38, `indicates` 0.00 |

**So T-1 works on two things:**
- the **existing reader**, guided by its measured errors, not by training;
- the **recognition of concepts** that reasoning depends on.

## 2. Principles fixed before any work

1. **No summary.** Every scientific statement of a sentence is translated, marked unresolved with its reason, or
   counted as missed. A sentence is never replaced by a gist.
2. **The 27 relations are kept.** A distinction is changed only if it proves not to be a real scientific or advisory
   difference (W2), and only by the owner's decision. `requires` and `recommends` stay distinct: an obligatory feature
   and a preference lead to different advice.
3. **Selective abstention, element by element.** Each element of a proposition has a state:
   - `read`: understood, with its grounds;
   - `uncertain`: candidates given, none chosen;
   - `not read`.

   The elements are subject, relation, object or value, unit, bearer (the product or system), polarity, modality,
   conditions, attitude, evidence kind and attribution.
   - **An uncertain relation does not discard the proposition.** Its relation becomes an S0 placeholder (§6, M6),
     linked to its candidates as *indeterminate*. A measure, its unit and its bearer, if read, are kept.
   - **A missing context** is recorded as `unspecified` (S0 §4, rule T7).
   - **Never guessed.** An uncertain element is never filled with a default.
   - **Inference.** Any conclusion that depends on an `uncertain` element is marked as dependent on it (S0 §3,
     indeterminate cases).
   - **Expected cost.** No S0 change is expected. If one turns out to be needed, the work stops and the decision goes
     to the owner.
4. **General principles, not word lists.** Every correction is stated over types and constructions. It is tested
   against counterexamples, as `pee-scientific-learning` §3.2–3.4 requires.
5. **Nothing is admitted.** Universes exist in memory, or as evaluation copies. Permanent acquisition is postponed
   (owner, C-1).

## 3. Work packages

### W1 — Error analysis of A-1 (spent material; Claude; no agents)

- **What is classified.** Every unfaithful or missed item of A-1 in the O-2 sealed run and in development, by
  **cause**:
  - the construction: norm or prohibition, classification, comparison, value with unit and bearer, method scope,
    scope of a negation, condition, coordination or list, anaphora, attribution;
  - the failing element.
- **Output.** A table of counts with the share of errors per cause. Only causes that cover at least 10 % of the
  errors are addressed in W3.

### W2 — Review of unstable distinctions (owner decision; ChatGPT may review)

- **Pairs.** `indicates` against `is_a`; `applies_to` against `establishes`; `equals` against `other`; and, as a
  check, `requires` against `recommends`.
- **Content, for each pair:**
  - a definition;
  - two scientific examples from **different domains** (not speakers);
  - what changes in product advice if the two are confused;
  - Claude's recommendation: keep, sharpen the definition, or merge.
- **Effect.** The owner decides. Until then, the annotation guide is unchanged.

### W3 — Reader corrections (development on spent material only)

- **Scope.** One correction per error cause retained in W1, stated as a principle over constructions. At most three
  reformulations per cause; then the rule is frozen as it is.
- **Precision first.** Where the construction is not recognised, the relation becomes `uncertain`, never `other` by
  default.

### W4 — Selective abstention (principle 3)

- **Representation.** Element states and relation placeholders in the representation step (`knowledge_acquisition`).
- **Rendering.** Elements are rendered with their states, so that judges see what is uncertain.

### W5 — Concept recognition for reasoning

- **The cause.** It is A-1's measured limit: question terms are not linked to the concepts already held.
- **The fix.** Linking by the universe's own designations and anchors, with any candidate that is not identical kept
  as *indeterminate*, never merged. This follows the identity discipline: never merge on similar names.
- **How it is isolated.** It is measured with the **oracle** arm, separately from translation.

## 4. Evaluation

### 4.1 Material (sealed before any T-1 code)

- **Text.** The **prose** of package **08 Soundbars**.
- **Exposure census.** It is made first by hashing and shingle overlap, without reading, as in O-2 §1.2. Its tables
  were used by Crawler N1, so only prose is scored. If the prose proves exposed, stop and report.
- **Split.** Fixed by a hash, as in O-2 §1.3.
- **Reference R2.**
  - Two blind annotators, an adjudicator, and an independent second arbitration of the key fields: relation,
    polarity, attitude, evidence kind and attribution.
  - The annotation guide gains the element states: an annotator may also mark an element of the passage as
    unclear.
  - **The evidence-kind rule is the owner's decision** (C-1 §7, revision 1). Annotation waits for it.
- **Question set Q2.**
  - In A-1's format (`experiments/a1/question-format.md`): an author agent, a blind answerer from the passage, and
    adjudication.
  - At least 40 % determinate answers.
  - Items where a careless reader would promote a proposal, a preference into an obligation, or a synthesis into a
    measurement.
  - Sealed before code.

### 4.2 Arms

| Arm | What it is |
|---|---|
| **A0** | A-1, frozen (baseline) |
| **A1** | A-1 + W3 + W4 + W5, frozen after development |
| **ORACLE** | R2 represented through the same step. It gives the reasoning ceiling, which separates reasoning errors from translation errors |

### 4.3 Measures

**Translation, element by element.** Judges match items and grade the semantic elements: subject, relation, object or
value, unit, bearer and conditions. The labelled elements are compared mechanically. Measured per element:

| Measure | Definition |
|---|---|
| **wrong rate** | wrong ÷ (read and graded) |
| **abstention rate** | uncertain ÷ all |
| **faithful coverage** | reference propositions whose read elements are all right ÷ reference propositions |
| **critical errors** | the O-2 types 1–6 |

**Reasoning** (on Q2, in a fresh process with no document; A-1's independence harness). Outcomes per question type:
- correct;
- **unjustified** (critical);
- lost;
- justified abstention;
- uninformed abstention.

### 4.4 Criteria

**Improvement shown** only if A1, against A0, meets all of these:
- critical errors of types 1, 3, 4 and 5 are not higher, and the total is lower;
- the mean wrong rate over the key elements (relation, polarity, conditions, attitude, evidence kind, attribution) is
  at least **25 % lower**, relative;
- faithful coverage is not lower;
- on Q2, more correct answers, and **no more unjustified ones**.

**ORACLE.** It is reported without a threshold. If ORACLE itself is far below the number of determinate questions,
reasoning (W5) is the limit, whatever the translation.

### 4.5 Judging protocol (the O-2 lessons)

- **Conventions.** Fixed before any judging.
- **Arms.** Blind, under random labels.
- **Labelled fields.** Compared mechanically.
- **Adjudication.** One adjudicator per list.
- **First run.** Committed unchanged, with at most one change cycle.

## 5. Cost

| Stage | Agents | Compute |
|---|---|---|
| W1, W3, W4, W5 (development) | 0 (Claude's own work on spent material) | minutes |
| W2 | 0 (the owner decides; ChatGPT may review) | — |
| Sealed R2 | 4 (2 annotators, 1 adjudicator, 1 second arbitration) | — |
| Q2 | 3 (author, answerer, adjudicator) | — |
| Judging A0 and A1 | 6 (2 judges and 1 adjudicator per arm) | — |
| **Total** | **about 13** | negligible; no paid service, no neural model |

## 6. Decisions needed before execution

1. The go-ahead for W1–W5 (development only, spent material, no agents).
2. The evidence-kind rule, before R2 is annotated.
3. The W2 decisions on the unstable relation pairs, after W2 is written.
4. The go-ahead for the sealed stage (about 13 agents).

## 7. Open, and not solved by T-1

- **Not independent.** Claude agents annotate and judge, so this is not independent validation.
- **Not a verdict on all readers.** A rule-based reader, even improved, may stay far from the reliability needed for
  admission. T-1 measures by how much, and whether reasoning or translation is the larger limit.
- **Parked, not rejected.** The neural route (Phi-4-mini quality on 50 sentences) is not dropped.
