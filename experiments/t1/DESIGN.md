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

## 8. Revision 1 (2026-10-23): staged order, evidence in four dimensions, metrics that cannot reward over-abstention

**Basis.** The owner relayed ChatGPT's review and asked for stages with go/no-go points, to save credits. Claude
agrees with every point. This section supersedes §4.1 on the evidence rule, §4.3–4.4 on the metrics, and §6 on the
order of decisions.

### 8.1 Stages and gates

| Stage | Work | Agents | Proceed only if |
|---|---|---|---|
| **0. Diagnosis** | W1 on spent material | 0 | Judged on several criteria, not one threshold (revision 2, 8.4). The causes are weighed by share, by **severity** (negation, condition, attribution, promotion), by **impact on reasoning**, and by whether a general principle can fix them. A small class that holds most negation errors counts. The outcome is a reasoned recommendation: proceed, change approach, or stop |
| **1. Rules** | The evidence rule (8.2) in the annotation guide; W2, the unstable relation pairs | 0 | The owner approves; ChatGPT may review |
| **2. Development** | W3–W5, measured **mechanically** on spent material, as in C-1 F′ | 0 | **All** of these, on development: the right-element share (8.3) **increases**; critical errors, negation errors above all, do not increase; complete faithful coverage does not decrease; the uninterpreted share is reported; justified answers on development questions do not decrease. Exact relation accuracy (+0.10) is an **indicator**, never sufficient alone. A failure is documented, and no further attempt is made to get around the rule |
| **3. Sealed test** | R2 and Q2 on Soundbars, then the frozen arms and blind judging | about 13 | — (this is the result) |

**When R2 is sealed: an open decision for the owner.** The O-2 rule was to seal the reference before any code change.
To avoid spending 7 annotation agents before stage 2 shows promise, Claude proposes a compromise:
- **Before stage 2:** the exposure census and the hash split of the Soundbars sections are fixed. No agent is used,
  and nobody reads the text.
- **Only if stage 2 passes:** annotation and sealing, **before** the frozen reader ever runs on that material.
- **What it costs.** No one develops while seeing that material. It still departs from the O-2 rule, and needs the
  owner's explicit choice.

### 8.2 Evidence: four dimensions, never one field

This replaces the single `evidence_kind` choice of §4.1 for R2 and for scoring. It is the owner-relayed review's rule,
made operational. It is a change to the annotation guide, not to the 27 relations or to S0. S0 already separates a
content from its attribution, holder and standing (D10, D14, 5.8–5.9).

| Dimension | Values | Question it answers |
|---|---|---|
| **Nature of the evidence** | `measurement`, `experiment` (controlled comparison), `professional_observation`, `analysis` (calculation, model, review of sources), `standard_text`, `declaration` (a party's statement about its own product), `none_stated` | What kind of support does the passage give? |
| **Provenance and independence** | **Who produced it.** The source identifier, or `author`. **Independence:** `independent` (stated or verifiable), `interested` (manufacturer, seller or sponsor), `partial` (independent party with a stated tie), `unknown` | Who stands behind the evidence, and with what interest? |
| **Status of the statement** | `observed_result`, `general_claim` (the author's synthesis), `hypothesis`, `illustrative_example` (a constructed or hypothetical case), `recommendation`, `requirement`, `open_question` | What kind of claim is this? |
| **Extraction fidelity** | scored, never annotated: whether Pee's item states what the source states | Did Pee read it right? |

**Rules:**
- **Unknown is unknown.** Independence that is not stated is `unknown`, never assumed.
- **Fidelity is separate from probative value.** A correctly extracted claim is not thereby true. Fidelity is scored
  on its own, and the probative value never raises a claim's standing.
- **Two kinds of manufacturer evidence** (revision 2). A party's documented measurement, with method, conditions and
  value, is `measurement` with independence `interested`. A party's plain commercial statement is `declaration` with
  independence `interested`.
  - Neither is independent. Neither is ever an independent test or ranking (`CLAUDE.md`, Evidence), and neither is
    given scientific validity that has not been shown.
  - Their probative content still differs, and the distinction is kept.
  - Measurement words in a statement without a documented method do not make it a measurement.
- **Hypothetical cases stay hypothetical.** A constructed teaching case is `illustrative_example`, never
  `observed_result`.

### 8.3 Metrics: reward reading, not abstaining

This replaces the faithful coverage of §4.3, which counted only the elements an arm chose to read. It could have
favoured an arm that marks almost everything uncertain. Per reference proposition and per element:

| Measure | Definition | Rewards |
|---|---|---|
| **Complete faithful coverage** | reference propositions whose **every** element is present and right ÷ reference propositions | full reading |
| **Right-element share** | right elements ÷ **all** reference elements, so abstention earns nothing | reading more, correctly |
| **Retained by selective abstention** | propositions kept with at least the measure, unit and bearer right, while another element is `uncertain` ÷ reference propositions | principle 3 doing its job |
| **Uninterpreted share** | reference elements that are `uncertain` or `not read` ÷ all reference elements | reported, so that abstention is visible |
| **Wrong rate** | wrong ÷ elements read | reading carefully |
| **Critical errors** | O-2 types 1–6 | — |

**Improvement shown** (replaces §4.4) only if A1, against A0, meets all of these:
- **Critical errors.** Types 1, 3, 4 and 5 are not higher, and the total is lower.
- **Wrong rate.** It is at least 25 % lower, relative.
- **Right-element share.** It is **higher**. This guards against over-abstention: an arm that abstains more cannot
  pass by making fewer errors alone.
- **Complete faithful coverage.** It is not lower.
- **Reasoning.** On Q2, more correct answers and no more unjustified ones.
- **Abstention.** The uninterpreted share is reported beside every comparison.


## 8.4 Revision 2 (2026-10-23): the owner's decisions after ChatGPT's review

**The owner's decision, in the owner's words:**

> Approvo entrambe le decisioni: accettiamo il sigillo differito per risparmiare agenti e autorizziamo la sola
> diagnosi iniziale, preferibilmente in una nuova sessione Claude Code collegata a Pee.

**1. Deferred seal, accepted.** The O-2 rule is departed from knowingly, and on the owner's record.
- **Frozen before any development (stage 2).** All of these are fixed and committed:
  - the Soundbars package and file;
  - the exposure census;
  - the **selection method** and the hash split of the sections;
  - the inclusion criteria;
  - the annotation guide with the evidence rule (8.2);
  - the definitions of the 27 relations, after the owner's W2 decisions;
  - the question protocol (A-1's format with the T-1 additions);
  - the metrics (8.3);
  - the gates and stop rules (8.1).

  **The reader never accesses the Soundbars text.**
- **After both readers (A0, A1) are frozen.** Agents blind to the development results produce R2 and Q2. They are
  sealed, the arms are evaluated, and no further correction is made beyond the one change cycle.
- **The protocol is never adapted to results.**

**2. Stage gates corrected.**
- Stage 0 is judged on share, severity, impact on reasoning and generalisability.
- Stage 2 requires the right-element share to **increase**, together with the other controls (8.1).

**3. Evidence corrected.** A party's documented measurement is distinguished from a plain commercial statement. Both
stay non-independent (8.2).

**4. Authorised now: stage 0 (Diagnosis) only.**
- **Not used:** agents and the Soundbars content.
- **Unchanged:** S0.
- **Where:** preferably in a new Claude Code session attached to Pee alone.

## 9. Stage 0 result (2026-10-23)

Done, in `W1-DIAGNOSIS.md` (codes and counts in `w1-diagnosis.json`). No agents, no Soundbars content, no code or S0
change. Stopped at the stage-0 decision.
- **Recommendation:** proceed, narrowed. W3 only on the closed-class causes (negation, deontic force, proposal scope,
  citation block, segmentation, a part-of-speech guard, conditional clauses). The other causes go to W4.
- **Found for stage 1:**
  - two scoring blind spots: `requires` held as `recommends` is graded right, and attribution recall on cited claims
    is 0;
  - two W2 additions: the default force of a bare imperative, and list-frame predicates.
- **Not authorised:** stage 1. It waits for the owner's decision.

## 10. Stage 1 (Rules), 2026-10-23

**The owner's decision:** option A, proceed narrowed. Only stage 1 is authorised. W3–W5 and the sealed test are not.

**Delivered** (documents only; no code, no agents, no S0 change):
- `annotation-guide.md`: amendments to the A-1 guide:
  - the approved evidence rule in four dimensions;
  - citation separated from attribution;
  - deontic force and bearer;
  - `unclear` elements.
- `W2-RELATIONS.md`: the unstable pairs plus prohibition, the force of a bare imperative, and lists governed by a
  heading. These are recommendations only.
- `PROTOCOL.md`: the corrected scoring, and the comparison of A0 and A1 under the same conventions. It also fixes:
  - the label mapping for spent references;
  - what the hashed references allow to be measured;
  - the narrowed W3 scope;
  - the freeze list before stage 2.

**Found while preparing it.** Only 216 of the 507 spent reference propositions, and only 36 of 143 norms, keep their
subject and object readable. Mechanical scoring alone therefore measures the norm corrections poorly (`PROTOCOL.md`
§4, §8).

**Waiting for the owner:**
- the W2 decisions;
- the judging mode of stage 2;
- the new critical type 7.

Stage 2 is not authorised.

## 11. Stage 1 closed (2026-10-23): the owner's decisions applied

- **W2 D1–D7 approved**, with precisions:
  - D6: a step is obligatory only when the procedure prescribes it as necessary;
  - D7: `exceeds` only with a stated dimension and direction.

  They are applied in `annotation-guide.md` and recorded in `W2-RELATIONS.md`.
- **Critical errors.** Type 7 is approved, including the procedural-to-product bearer error. Type 3 is widened to a
  real promotion of a hypothetical case. No double counting.
- **Stage-2 evaluation:** option B, conditional. First a mechanical check; then at most three agents, only if it
  passes (`PROTOCOL.md` §4.1).
- **The deferred seal is not yet complete** (`PROTOCOL.md` §7.1). A freeze step comes before any W3 code.

Stopped at the stage-2 authorisation point.

## 12. Freeze step (2026-10-23)

**Authorised by the owner:** the freeze only. No W3–W5, no agents, no Soundbars semantics. A-1's spent dehumidifier
questions are used for the stage-2 reasoning check.

**Done** (`PROTOCOL.md` §4, §7.1, §9; hashes in `freeze-1.json`):
- **The Soundbars document is identified and the R2 selection fixed.** `freeze.py`, in an isolated process, reuses
  O-2's rules and reproduces O-2's split exactly. R2 has 31 sections (235 prose lines); a reserve of 53 lines is left
  untouched.
- **The exposure census is clean.**
- **Inclusion criteria, both question protocols and the stop conditions are frozen.**
- **The scorer is written** (`score.py`, no inherited grades).
- **The A-1 question harness reproduces A-1's answers on 59 of 59.**

**Blocker.** The scorer's proxy check fails: 0.72 against 0.85 on the adjudicated sealed judgement. A0's items match
only 7 of the 36 readable norms. The mechanical pre-filter of option B can therefore only be inconclusive. Changing
its role needs the owner's decision (`PROTOCOL.md` §10).

Development is not authorised.

## 13. Stage 2 (W3–W5, narrowed) and its final check (2026-10-23)

- **A1 was frozen at `c85b4bf`** (`freeze-3.json`) before any Speakers score was produced.
- **The final check without agents** (`STAGE2.md`):
  - no mechanical critical type increased;
  - the reasoning gate passed (correct answers 5 → 7, unjustified 1 → 1).
- **Two matched-label wrong counts rose by one on development.** Both were inspected after the outcome was fixed and
  read as convention or reading differences.
- **The frozen §11.3 stops at any such increase,** so the three agents were not used.
- **The owner decides** whether to authorise them (`STAGE2.md` §2).

Stopped before stage 3.
