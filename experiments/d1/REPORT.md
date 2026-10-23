# D-1 — Where scientific information is first lost or altered: a differential audit of the pipeline

| | |
|---|---|
| **Authorised by** | Owner, 2026-10-23 (after T-1 stage 2, `9b0a619`): a bounded diagnostic experiment, no agents |
| **Code audited** | Branch `claude/pee-operational` at `9b0a619`: the A1 reader (frozen `c85b4bf`), `markdown.py`, `knowledge_acquisition.py`, MS1 `rules.py`, `recognition.py`, A-1's question harness |
| **Unchanged** | S0, MS1, the reader, the production rules, every T-1 result and freeze. Nothing is corrected during the audit |
| **Status** | Sections 0–3 are committed **before any case is run**. Results are added below them |
| **Independence** | Claude's work. The constructed cases are diagnostic tests, not validation |

## 0. The owner's instruction (verbatim, abridged)

> Scoprire il primo punto della pipeline in cui un'informazione scientifica viene persa, alterata, interpretata senza
> il contesto necessario, rappresentata in modo incompleto o utilizzata per una conclusione ingiustificata. Non
> presumere che l'errore sia del lettore. […] l'esperimento può verificare la fedeltà alla fonte, non la verità
> scientifica della fonte senza controllo indipendente. Distingui esplicitamente queste due questioni.

## 1. Method

### 1.1 Six stages, each probed separately on the same case

| Stage | What is compared | How the stage is isolated |
|---|---|---|
| **S1 Input** | What the document states, against what is known to be verified | The expected support level is written per case. "The document reports X citing S" is **never** "X is verified": nothing in the pipeline examines S |
| **S2 Preparation** | `markdown.read` output: blocks, kinds, headings, list order, cited identifiers, code, tables | Inspected directly |
| **S3 Translation** | The reader's proposition units against the expected meaning | `propositions.read_propositions` on the prepared structure |
| **S4 Representation** | Universe items made from **correct units written by hand** (the annotation-guide schema), bypassing the reader | `knowledge_acquisition.represent`, then the items are read back |
| **S5 Recognition** | The same question asked with **concept ids**, then with the **exact term**, then with a justified alternative term | Rules called directly with ids; then through `recognition.designate` |
| **S6 Reasoning** | The rules' answer from correct knowledge, against the expected answer | `rules.holds`, `influence`, `value`, `conditions_fit`, `satisfies_evidence`, and the A-1 harness for status and evidence |

**First point of loss.** A case's first point of loss is the earliest stage whose output differs from the expectation.
- **S4–S6 run on hand-written correct units.** A defect found there is **not** the reader's.
- **A defect found only in S3** is the reader's.

### 1.2 Classification of each finding

- **Observed defect:** reproducible, with the input and output recorded.
- **System limit:** the design does not cover the case; no component misbehaves.
- **Inconclusive:** the case cannot separate the explanations.

**Fidelity is not truth.** Every finding is about fidelity to the source. Whether the source is true is outside the
audit: no source is examined independently.

### 1.3 Cases (fixed now, before any run)

**Constructed cases** (`cases.py`). They come from domains not used to design the reader: ecology, medicine,
chemistry, materials, epidemiology and geology. Each states its expected meaning, its support level and the expected
answer.

| # | Construction | Expected | Hypothesis tested |
|---|---|---|---|
| K1 | A claim under a condition ("heavy rainfall causes surface runoff when the soil is saturated") | The condition survives as a concept and a value; a query under a contrary condition is **not** answered positively | Condition format: the reader and the rules may use different shapes |
| K2 | A value under a condition ("water boils at 100 °C at 1 atm") | The value keeps its condition; a query at 2 atm gets no value | Conditions on values |
| K3 | A negated classification ("basalt is not a sedimentary rock") | `holds` answers **no** | Negation end to end |
| K4 | A prohibition ("do not pipette by mouth") | Represented as a prohibition. A question asking whether it is *recommended* or *required* is never answered yes | D5 end to end |
| K5 | An obligation against a recommendation (a filter required; food recommended) | `requires` and `recommends` stay distinct in answers | D4 end to end |
| K6 | A procedural step under a procedure heading | Not licensed as a fact; never a requirement on a product | D6 and the bearer |
| K7 | A result reported from a cited study ("a cohort study reported a 30 % reduction [S1]") | Fidelity: "the document reports". Support: **unverified**. An independent-measurement requirement must **not** be met by the document's report alone | Evidence promotion: reported versus verified |
| K8 | A manufacturer statement ("the manufacturer states a battery life of 20 hours") | A declaration. Never independent test evidence | Declaration against measurement |
| K9 | Context across paragraphs ("Titration establishes …" / next paragraph: "It requires a standardised base") | The second claim's subject is titration | Context at a block boundary |
| K10 | A table row (property, value, unit) | The value survives preparation and representation, and a value question can reach it | Two representations of quantities |
| K11 | One term with two senses in two documents of two holders ("resolution") | Two concepts. A question with the bare term must not merge them | Identity and recognition |
| K12 | An alternative designation ("rate of infiltration" for "infiltration rate"); a broader term ("infiltration") | The variant is recognised; the broader term is not | Recognition, separated from the rules |
| K13 | A claim with a condition, queried without any condition | The answer shows that it depends on an unstated condition, or abstains | Unstated conditions |
| K14 | A hypothesis ("we hypothesise that biochar increases infiltration") | Not licensed. Status is `hypothesised` | Epistemic status end to end |
| K15 | An illustrative case under "Worked examples" | Not licensed. Never an observed result | Illustrative cases |
| K16 | Two documents: one asserts an effect, the other denies it | `undetermined` because the claims conflict, with both grounds | Contradiction across sources |

**Authentic spent cases (at most 8).** All the material is already spent.
- **Speakers** (O-2 sealed): lines 135, 276, 506, 541 and 549.
- **Dehumidifiers** (A-1 sealed questions): Q30 (the unjustified answer in both arms), and one question lost as
  uninformed.

For each, the expected meaning comes from the private references. Only labels, line numbers and outcomes are
published, never text.

### 1.4 Criteria and stop rules

- **What a case reports.** Its first point of loss, its effect on retrieval or inference, and its class (§1.2).
- **D-stop 1.** A structural defect in S4 or S5 that makes a later stage meaningless for a case: the later stages of
  that case are not run, and the consequence is reported.
- **D-stop 2.** Nothing is corrected. A temporary harness may only observe.
- **D-stop 3.** No new document, no Soundbars content, no agents.
- **D-stop 4.** The universe is built **once per case set**. The authentic dehumidifier universe is built at most
  once.

## 2. Deliverables

- this report;
- `cases.py` (the constructed cases and their expectations);
- `audit.py` (the observation harness);
- `results.json` (labels and outcomes only).

## 3. What the audit cannot show

- **Not the truth of any source.** Fidelity only.
- **Not reliability rates.** The cases are few and constructed. They locate mechanisms; they do not estimate
  frequencies.
- **Not independent.** Claude chose the cases and wrote the expectations.
