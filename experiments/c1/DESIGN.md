# C-1 — Design: can a more capable local interpreter read scientific relations faithfully into S0?

| | |
|---|---|
| **Status** | **Design only.** Nothing is installed, downloaded or run. Execution needs an explicit owner authorisation (section 9) |
| **Basis** | The owner's message of 2026-10-23 (recommendations, `ORGANISATION.md` §7.3): design the next experiment, without running it |
| **Branch** | `claude/pee-operational` |
| **Unchanged** | S0, `engine-ts/`, the A-1 reader and the dependency rule of `CLAUDE.md` |

## 1. The question

O-2 showed that combining two rule-based readers does not improve fidelity. Even the best reader, A-1, is far from
reliable on the sealed speakers prose (238 propositions):

| Measure | A-1 |
|---|---|
| Precision | 0.35 (0.44 if evidence-kind errors are ignored) |
| Faithful coverage | 0.30 |
| Critical errors | 15: 8 negation, 3 direction, 1 attribution, 3 merges |

**C-1 asks:** does a more capable **local** interpreter, connected to S0 through the same representation path, read
the **relations** between concepts more faithfully than A-1, without more critical errors?

## 2. What the 96 relation errors are (O-2 sealed run, labels only; spent material)

| Reference relation ← A-1 relation | Items |
|---|---|
| another `other` verb ← `other` | 20 |
| `recommends` ← `other` | 11 |
| `requires` ← `other` | 10 |
| `is_a` ← `other` | 5 |
| `indicates` ← `other` | 4 |
| `recommends` ← `has_property` | 4 |
| other combinations (2 or fewer each) | 42 |

- **The dominant cause.** A-1 falls back to the generic `other (verb)` relation (79 of its 280 items), where the
  reference has a specific relation, or where the right relation needs the verb's meaning.
- **Norms.** Norms (`requires`, `recommends`) are 77 of the 238 reference propositions: the largest class, and the
  one A-1 reads worst.
- **Implication.** The interpreter must understand **what kind of claim** a sentence makes: a norm, a definition, a
  classification, a dependence, a method's scope. Recognising entities alone is not enough. GLiNER-style entity
  recognition does not address this, which is why section 3 does not rely on it alone.

## 3. Candidate interpreters (to verify; nothing installed)

All candidates must be:
- local and offline after a one-time download;
- CPU-only (this environment: 4 CPUs, 15 GB memory, no GPU);
- free, under a permissive licence (MIT, Apache-2.0 or BSD).

The facts below come from Claude's knowledge (to June 2026) and are **unverified**. Section 6, stage V checks each one
before anything is installed.

| Id | Candidate | Role | Why it may help with relations | Known risks |
|---|---|---|---|---|
| **L** | A small instruction model (3–4 B parameters, 4-bit GGUF) run by `llama.cpp` (MIT), with output constrained by a JSON grammar to the unit schema of `experiments/a1/annotation-guide.md`. Candidates with permissive licences: Phi-4-mini (MIT), SmolLM3-3B (Apache-2.0), Granite 3.x 2–8 B (Apache-2.0), OLMo 2 (Apache-2.0) | Reads each sentence, with its heading path, into proposition units | It can recognise the claim type and the relation from the verb's meaning, not from a list of cue words | Invents content; promotes attitude; slow on CPU; licence and size must be verified |
| **V** | An NLI cross-encoder (DeBERTa-v3 trained on MNLI, MIT) used as a **verifier**: each candidate proposition, rendered as a sentence, must be entailed by its source sentence | Filters L's or A-1's units: a unit that is not entailed is held back, with a reason, never repaired | It targets the critical errors (negation, direction) and invented content | In Crawler (S76), `deberta-v3-xsmall` did badly on a different task (concept identity: 4 of 14). The larger model and the entailment task must be checked on development |
| G | GLiNER2 / GLiNER2.5 (Apache-2.0, about 200 M parameters) | Entity spans and schema-based structured extraction | Cheap on CPU; good spans | Relation and claim-type reading is not established; **not an arm unless stage V shows it supports relation extraction** (the owner's remark: it may not be enough alone) |

**Considered and not proposed:**
- **Qwen.** It stays suspended. The re-examination is in section 4.
- **Models under custom licences** (Llama, Gemma): their terms need a separate owner decision.
- **REBEL and similar** (non-commercial licence).
- **A dependency parser plus extraction rules** (spaCy, Stanza). This is again a combination of linguistic rules,
  which the recommendation asks to suspend.
- **Remote or paid APIs.**
- **Claude's own reading.** It is not a Pee capability (`pee-scientific-learning` §2).

## 4. Re-examination of the Qwen suspension (Crawler S76 and S94; owner decision of 2026-10-20)

**What was tested.**
- Qwen2.5-1.5B-Instruct, local CPU, float32.
- The task was **concept identity**: is a phrase the same concept as a known one? It was not reading relations from
  sentences.

**Results.**
- 1 correct identity in 3 runs.
- Structured input did not help.
- On new data, related concepts were promoted to identity.
- No gain over the non-generative arms.

**Cost.** 2.8–3.7 s per pair, about 9.5 GB of memory and 22–29 minutes per run.

**The owner's words.** "Qwen ci sta costando molto senza dimostrare utilità". Language models in general were not
excluded.

**What this means for C-1.**
- **Lessons that carry over:**
  - a small model **promotes** related or uncertain content, which is why the verifier V and the epistemic checks
    exist;
  - float32 inference on CPU is costly, so C-1 uses 4-bit models and a timing probe before any run;
  - stop rules on cost.
- **What it does not show.** It says nothing about relation reading from sentences, which was never tested.
- **Recommendation.** Keep Qwen suspended, as asked, and test the permissive-licence candidates above first.
  Reconsider Qwen only if the owner decides so after C-1.

## 5. Arms and the shared path

Every arm uses the O-2 path unchanged: `markdown.read` → `read_units` → **arm units** → `represent` → export through
`fidelity.render`. There is **no persistence** and no admission.

| Arm | Units from |
|---|---|
| **A** | A-1 reader, frozen (baseline) |
| **L** | the local model (the best of the candidates that pass stage V, chosen on development) |
| **L+V** | L's units, filtered by the verifier |
| (**A+V**) | A-1's units filtered by the verifier. Optional: it shows whether verification alone removes A-1's critical errors |

At most **three** arms are judged (A, L and L+V), plus A+V only if the owner wants it (section 9).

## 6. Stages, each with a stop rule

| Stage | What | Spends | Stop rule |
|---|---|---|---|
| **V — verification** (no installation) | Check each candidate's licence, size, memory, CPU speed, dependencies, offline use and download source from primary sources | a few searches | A candidate is dropped if its licence is not permissive, it needs more than 12 GB of memory, or it cannot run offline |
| **P — probe** (after authorisation) | Install in an isolated virtual environment and cache **outside every repository**. Time 20 development sentences of the spent speakers material | local CPU only | A candidate is dropped above 30 s per sentence or 12 GB of memory |
| **D — development** | Prompt, grammar and verifier threshold fixed on spent material: the O-2 speakers references R (238) and D (269), judged with **the same protocol as the sealed test** (two judges, an adjudicator, the conventions). This is the O-2 lesson: choices made with one unadjudicated judge did not transfer | agents | at most three prompt or threshold revisions; then freeze |
| **S — sealed** | A new sealed reference annotated **before** any C-1 run (section 7), then the frozen arms run once, blind judging and scoring | agents | one first run, committed unchanged; at most one change cycle, labelled "after change" |

## 7. Material and reference

- **Proposed sealed material.** The **prose** of package **08 soundbars**. The same exposure census as O-2 (§1.2)
  would be made by hashing before use:
  - its tables were used by Crawler N1 (H2), so only prose would be scored;
  - its prose was never used by any reader;
  - a hash-based split fixes the sections.
- **Evidence kind needs an owner rule before annotation.** The O-2 reference disagreed on it at 0.54. The
  ambiguity is `synthesis` against `none_stated` for the author's own uncited claims, and it should be settled in
  the annotation guide. **Proposal:** the second O-2 arbitrator's rule. An author's own scientific claim is
  `synthesis`, with or without citation. `none_stated` is only for claims about the document itself and for
  procedural directives with no scientific support.
- **Annotation.** Two blind annotators, an adjudicator, and a second, independent arbitration of the four key
  fields: relation, polarity, attitude with evidence kind, and attribution.

## 8. Measures and criteria (to be fixed before any C-1 code)

**Judging, made cheaper and more consistent.** Judges only **match** items and grade the **semantic** elements:
subject, relation, object or value, and conditions. The labelled elements are compared **mechanically** with the
matched reference proposition: polarity, modality, attitude, evidence kind and attribution identifiers. This removes
the convention disputes that dominated O-2's adjudication (267 of 286 items disputed in one list).

| Id | Measure | Role |
|---|---|---|
| **C1-rel** | Relation accuracy on matched items: right ÷ (right + wrong) | **primary** |
| **C1-crit** | Critical errors by type; types 1, 3, 4, 5 above all | decisive |
| **C1-prec** | Precision: faithful ÷ produced | decisive |
| **C1-cov** | Faithful coverage | decisive |
| C1-keys | Attribution, polarity, conditions, attitude, evidence kind (mechanical) | reported |
| C1-cost | Wall time and memory per 100 sentences | reported |

**Improvement over A-1 shown** only if, for the best of L and L+V, all of these hold:
- **C1-rel** is higher than A's, by an exact sign test on matched propositions with p < 0.05;
- **C1-prec** is at least A's + 0.10;
- **C1-cov** is at least A's;
- **C1-crit** is no higher than A's in total and in each of types 1, 3, 4 and 5.

**Admission bar.** A separate bar, for any later **permanent** acquisition, is to be set by the owner. C-1 would only
report against it. Proposal: on a sealed set, precision ≥ 0.80 and zero critical errors of types 1, 3, 4 and 5. That
is A-1's original A1-a and A1-b thresholds.

## 9. The limited exception to the dependency rule

**What `CLAUDE.md` says.** It excludes neural models. C-1 would need a **temporary, scoped** exception, granted
explicitly by the owner.

**The proposed scope:**
- **Packages.** Model weights and Python packages live only in a virtual environment and cache under the session
  scratch directory, outside every repository.
- **Repository untouched.** Nothing is added to `engine-ts/package.json` or to any repository dependency list.
- **Versions.** Versions, weight hashes and licences are recorded.
- **Clean-up.** Everything is removed at the end of C-1.
- **The rule itself.** It stays unchanged.

**Owner decisions needed before execution:**
1. Authorise C-1's execution and this exception, or narrow it, for example to one candidate model only.
2. The evidence-kind rule for the annotation guide (section 7).
3. The sealed material: 08 soundbars prose, or another named source.
4. Whether arm A+V is included.
5. The admission bar (section 8), or leave it for later.

## 10. Cost, roughly

| Kind of cost | Estimate |
|---|---|
| **Agents** | about 15–20 runs (O-2 used about 25): annotation 2, adjudication 1, second arbitration 1, development judging about 6, sealed judging 6 with 3 adjudications. Mechanical grading shortens each judgement |
| **Local compute** (unverified; the probe measures it) | a 3–4 B 4-bit model on 4 CPUs, of the order of 10 tokens/s generated. For about 120 prose lines and about 250 propositions, roughly 30–60 minutes per arm. The verifier adds a few minutes |
| **Disk** | 2–3 GB of weights per model candidate, plus about 1–2 GB of runtime |
| **Money** | none: no paid service, no licence |

## 11. Open problems this design does not solve

- **Not independent.** Claude agents annotate and judge, so this is not independent validation.
- **Not a verdict on all models.** A small local model may still fall short of the admission bar. C-1 would show by
  how much, not whether any model could reach it.
- **Speakers material is spent.** It serves only for development.
