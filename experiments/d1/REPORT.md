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

## 4. Outcome

**The first point of loss is often not the reader.** With correct units written by hand, so that the reader is
bypassed:
- representation keeps content, conditions, polarity, attitude, statement status, bearer and cited sources (K1–K3,
  K5, K6, K9, K12, K14, K15);
- **the rules, recognition and the evidence requirement then produce unjustified conclusions in six constructed
  cases** (SD1–SD4, SD9; SD3 also through recognition);
- **two more losses are by design:** prohibitions draw no inference, and property tables are not acquired.

**The reader adds its own losses** (SD8, and the reader limits of §6). Its condition format defeats the rules'
condition model. The rules then answer as if no condition existed.

**Run.** `audit.py` ran once on the 16 constructed cases. A second run, with the recognition cache cleared for
every build because of SD9, gave identical answers. The probes listed in §5 were added post hoc, on the same cases,
and are labelled as such. The authentic cases used the frozen A1 export and one dehumidifier universe.

## 5. Structural defects demonstrated (reproduced by `test_findings.py`)

| # | Stage | Defect (with correct knowledge unless stated) | Case | Effect |
|---|---|---|---|---|
| **SD1** | S6 | `conditions_fit` returns the unstated conditions as caveats, but `influence`, `holds` and `value` drop them | K13 | A claim true only "when the soil is saturated" is answered without that condition: an over-generalisation |
| **SD2** | S6 | `influence` ignores a contrary source when an affirming edge exists; `holds` reports the conflict | K16 | "increases", although another source denies it |
| **SD3** | S5 | `recognition.designate` returns every concept with the term, across holders. The rules treat the set as one subject | K11 | "yes" for a definition true of only one sense. The same mechanism would merge two products with one name |
| **SD4** | S1→S6 | A result the document reports from a cited source gets the class "measured by the publisher". `satisfies_evidence` then meets an independent-measurement requirement, although `cited_sources_examined` is false and is never consulted | K7 | **Fidelity is promoted to verification.** The document's report counts as independent test evidence |
| **SD8** | S3→S6 (interface) | The reader writes a condition as `{concept: clause text, value: marker}` ("soil is saturated", "when"). The rules expect `{concept, value}` ("soil", "saturated"). A value claim loses its condition entirely | K1, K2; Speakers 549 | **Every condition the reader produces is invisible to the rules.** Dry soil gets "increases"; 2 atm gets 100 °C. Present since A-1 |
| **SD9** | S5 | The recognition index cache is keyed by `(id(store), store.seq)`. A new universe can take a freed universe's id and read its index (found post hoc, 2 of 6 trials) | probe | One universe recognises another universe's concepts. It affects any process that builds several universes. T-1's runs built one per process and are not affected; D-1's answers were re-run with the cache cleared, and were unchanged |

**By design, not misbehaviour** (system limits with structural consequences):

| # | Stage | Limit | Case | Effect |
|---|---|---|---|---|
| **SD5** | S6 | `reported` licenses answers, and answers carry no evidence class | K8 | A manufacturer's declared value is returned as the value |
| **SD6** | S6 | The controlled forms `other: prohibits` and `other: permits` carry no inference (MS1 has no deontic semantics) | K4 | "Is X recommended?" is answered "undetermined", not "no" |
| **SD7** | S4 | The teaching route reads only definition and method tables. Property and value tables are dropped with no trace | K10 | Tabular knowledge is lost. O-2 and T-1 scored prose only, so this loss was never measured |
| — | S4/S6 | Time is not modelled: no "from date" applicability | Speakers 549 | A future obligation reads as a present one |

## 6. Reader limits (S3), confirmed on authentic cases

**What W3 fixed.** The earlier critical errors on Speakers lines 276, 506 and 541 (prohibitions, fronted conditions,
"but") no longer occur.

**What remains:**

| Limit | Authentic | Constructed |
|---|---|---|
| A source type is not recognised (a standard, guidance, or "<publisher> explicitly says") | Speakers 135, 541; Q30 | — |
| A value, bound or comparative is merged into a concept | Q37 | K2 (duplicate `has_property`) |
| Coordinated predicates are merged into the subject | Speakers 541 | — |
| A temporal condition ("from …") is lost | Speakers 549 | — |
| Negation scope over a modal adverb ("not automatically") | Speakers 549 | — |
| Attitude words are kept in the subject ("we hypothesise that biochar") | — | K14 |
| A reporter is lost in a value claim | — | K8 |
| The action's form differs between the norm and the question (imperative against gerund); a prepositional phrase is split from the action | — | K4, K5 |
| The citation block gives paragraph-level context only, so it cannot say which source supports which claim | Speakers 135 | — |

## 7. Evaluation limits that prevent conclusions

| # | Limit |
|---|---|
| EL1 | The mechanical scorer is not valid (proxy 0.72). Reference text is hashed (`PROTOCOL.md` §4) |
| EL2 | The question format can name a qualified quantity or a compound as one term (forms "<quantity> below <bound>", "<statistic> for <outcome>"). Even a correct universe holds no such concept. Part of A-1's oracle loss (6 of 45) is the format, not reasoning |
| EL3 | O-2 and T-1 scored prose only. The tabular losses (SD7) are invisible to every result so far |
| EL4 | Every measure is fidelity to the document. None measures verification. SD4 shows the system itself does not keep the two apart |
| EL5 | Rule outputs were never checked against correct knowledge before D-1. The T-1 reasoning gate (§9.2) mixes reader errors with SD1–SD3 |

## 8. What to fix before continuing T-1, and the owner's decisions

**To fix first, each a separate authorised change with tests** (none was corrected here):

| # | Fix | Why first |
|---|---|---|
| 1 | **SD8: one condition contract** between the reader and the representation (concept, value), with the clause kept as provenance | Without it, every condition W3 reads is unusable, and every condition-dependent answer is unjustified |
| 2 | **SD9: the recognition cache** keyed by the store itself, not by `id()` | It can silently corrupt any multi-universe comparison: arms, ablations, the judges' material |
| 3 | **SD1 and SD2: rules that surface caveats and conflicts** in `influence`, `holds` and `value` | The reasoning check of T-1 currently rewards over-generalisation |
| 4 | **SD3: an indeterminate reference** answered under each reading (S0 3.6), never as a union | Needed before product names enter the universe (`CLAUDE.md`: never merge on similar names) |
| 5 | **EL2: a question-format rule.** Terms name concepts; qualifiers go to conditions | Needed before Q2 is written for the sealed stage |

**Architectural decisions for the owner:**
1. **Evidence (SD4).** May a result *reported* from a cited, unexamined source ever meet an independent-evidence
   requirement? **Recommended: no.**
   - Keep "the document reports S's measurement" as its own class.
   - It meets the requirement only after S is examined.
2. **Licensing and standing (SD5).** Should `reported` third-party claims, a manufacturer's above all, license
   answers? If they do, should every answer carry its evidence class?
3. **Deontic semantics (SD6).** Give MS1 inference for obligation, recommendation, prohibition and permission, or
   keep them as stored labels.
4. **Tables in teaching documents (SD7)** and **time (549).** Should property tables and dated applicability enter
   the universe? If so, the next evaluation must score them.

**Not covered by this audit.** Explanation, qualification and context links between claims. Reliability rates: the
cases locate mechanisms; they do not estimate frequencies.

## 9. Cost

- **Agents:** 0.
- **Compute:**
  - one assimilation of the dehumidifier universe (about 70 s);
  - two runs over 16 small constructed cases, a few seconds each;
  - the probes.
- **Data:** no new material. The spent Speakers export of T-1 and the private references were read; only labels are
  published.
- **Claude session:** this session's context reached about 0.74 million tokens, cumulative over T-1 and D-1.

Stopped at the end of the audit. The three agents and the Soundbars test remain suspended.
