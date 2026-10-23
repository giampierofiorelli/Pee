# C-1 — Design: can a more capable local interpreter read scientific relations faithfully into S0?

| | |
|---|---|
| **Status** | **Revision 2.** The owner said "Procedi come ritieni" (2026-10-23) after revision 1. Claude reads this as the go-ahead for the agent-free stages V, P and F only (section 6). Stages D and S still need the owner's explicit authorisation and the evidence-kind rule |
| **Basis** | The owner's message of 2026-10-23 (recommendations, `ORGANISATION.md` §7.3): design the next experiment, without running it |
| **Branch** | `claude/pee-operational` |
| **Unchanged** | S0, `engine-ts/`, the A-1 reader and the dependency rule of `CLAUDE.md` |

## 0. Revision 1: the owner's corrections and decisions (2026-10-23)

| Point | Owner's position | Effect on this design |
|---|---|---|
| Neural models | A limited experimental exception, at first for **one promising model only**, after its licence and CPU feasibility are verified | Stage V picks one model by fixed criteria (section 6). No second model is installed unless the owner decides so |
| Evidence kind | The proposed rule is **not approved**. A scientific synthesis, an original measurement and an expert judgement stay distinct, even when one author writes them all | The rule of section 7 is replaced: the kind is that of the **support given for the claim**, never that of the writer |
| Sealed material | Soundbars approved, after checking that it is really unused | The exposure census of section 7 is a precondition of stage S |
| A-1 + NLI verifier | Included: an important comparison | Arm A+V is in, at stage F and at stage S |
| Permanent acquisition | Postponed. No new knowledge is admitted automatically during C-1 | No admission bar is set; nothing is persisted |
| Spending | Do not spend 15–20 agents now; first a cheap check of model feasibility | New stage **F** (section 6): no agents at all |

**The goal stated by the owner.** Find out whether a neural model understands scientific relations better than the
current rules. The goal is not to build another complex system.

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

## 6. Stages, each with a stop rule (revision 1)

Each stage needs the owner's go-ahead. The first three use **no agents**.

| Stage | What | Spends | Stop rule |
|---|---|---|---|
| **V: verification** (no installation) | Check the candidates' licence, size, memory, CPU speed, dependencies, offline use and download source from primary sources. **Choose one model** by fixed criteria, in this order: (1) a permissive licence (MIT, Apache-2.0, BSD); (2) at most 8 GB of memory at 4-bit; (3) constrained JSON output; (4) the strongest published instruction-following and extraction results among the rest | web searches only | No candidate passes: stop and report |
| **P: probe** | Install that one model in an isolated environment outside every repository. Time it on 20 sentences of the spent speakers material | local CPU only | Above 30 s per sentence or 12 GB of memory: stop and report |
| **F: feasibility** (new, cheap) | Run A, L, A+V and L+V on the **spent** speakers prose (the O-2 references R, 238 propositions, and D, 269). Score with an **automatic proxy**: lexical alignment of items to reference propositions, as A-1's `fidelity.proxy`, then mechanical comparison of relation, polarity, attitude, evidence kind and attribution | local CPU; no agents | L's relation agreement must beat A's by at least 0.10, and its polarity agreement must not fall below A's. Otherwise stop: no agent is spent |
| **D: development** (only if F passes) | Prompt, grammar and verifier threshold, fixed on spent material, judged with the sealed-test protocol (two judges, an adjudicator, the conventions) | about 6 agents | at most three revisions, then freeze |
| **S: sealed** (only if D is authorised) | A new sealed reference on Soundbars prose (after the exposure census), the frozen arms run once, blind judging, scoring | about 10–12 agents | one first run, unchanged; at most one change cycle |

**What F can and cannot show.**
- **The proxy is not a fidelity judgement.** It is a cheap screen. It runs on material that is spent, and A-1 was not
  tuned on it, so A-1 is not advantaged.
- **What a pass means.** Only that a model is worth the agents' cost.
- **What a fail means.** It saves them.

## 7. Material and reference

- **Proposed sealed material.** The **prose** of package **08 soundbars**. The same exposure census as O-2 (§1.2)
  would be made by hashing before use:
  - its tables were used by Crawler N1 (H2), so only prose would be scored;
  - its prose was never used by any reader;
  - a hash-based split fixes the sections.
- **Evidence kind needs an owner rule before annotation** (revision 1).
  - **Why.** The O-2 reference disagreed on it at 0.54. The proposed rule that an author's own claim is always
    `synthesis` is **withdrawn**.
  - **The rule now proposed, for the owner's approval.** The evidence kind is the kind of **support the passage gives
    for that claim**. It is never decided by who writes it. The kinds stay distinct even within one author's text:
    - `original_measurement`: a measured result of an identified study or test;
    - `expert_judgement`: a qualitative judgement presented as such;
    - `standard_or_regulation`: what a named standard, regulator or programme states;
    - `guidance`: an authority's advice;
    - `synthesis`: the author's scientific explanation, combining knowledge or sources;
    - `none_stated`: no support of any kind is given.
  - **The case annotators disagreed on.** An unsupported directive or a statement about the document itself is
    `none_stated`. An explanatory claim is `synthesis` only when the passage presents it as the author's scientific
    account. Where the passage gives no way to tell, it is marked `undetermined`, not guessed.
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

**Decisions taken (revision 1):**
- a limited exception for one model;
- Soundbars approved, after the census;
- arm A+V included;
- admission postponed.

**Still needed before execution:**
1. The go-ahead for stages V and P, and then for F.
2. Approval, or correction, of the evidence-kind rule in section 7, before any annotation (stage S).

## 10. Cost, roughly

| Kind of cost | Estimate |
|---|---|
| **Agents** | **0** for stages V, P and F; about 6 for D and 10–12 for S, only if F passes and the owner authorises them |
| **Local compute** (unverified; the probe measures it) | a 3–4 B 4-bit model on 4 CPUs, of the order of 10 tokens/s generated. For about 120 prose lines and about 250 propositions, roughly 30–60 minutes per arm. The verifier adds a few minutes |
| **Disk** | 2–3 GB of weights per model candidate, plus about 1–2 GB of runtime |
| **Money** | none: no paid service, no licence |

## 11. Open problems this design does not solve

- **Not independent.** Claude agents annotate and judge, so this is not independent validation.
- **Not a verdict on all models.** A small local model may still fall short of the admission bar. C-1 would show by
  how much, not whether any model could reach it.
- **Speakers material is spent.** It serves only for development.

## 12. What published work says (searched 2026-10-23; secondary summaries, to be checked against the papers)

1. **Zero-shot extraction of scientific relations is still weak, even for large models.**
   - **Biomedical triplets.** A 2025 benchmark of zero-shot relation-triplet extraction (13,867 texts, 61 corpora)
     found no model above F1 0.5 on the triplet task on any dataset.
   - **Multiple relations.** Another 2025 benchmark found that even GPT-4-class models struggle with sentences that
     state several relations with different predicates.
   - **Expectation for C-1.** A small model used zero-shot should not be expected to reach the admission bar.
2. **Task adaptation matters more than size.** A 2025 study ("Sub-Billion, Super-Frontier") reports that sub-billion
   models fine-tuned on task data beat zero-shot frontier models on relation extraction.
   - This is reported through a co-author's post and a write-up; the paper itself was not read.
   - **For Pee.** The 507 annotated propositions of O-2 (spent, so usable for training) could later adapt a small model
     or a schema extractor. That would be a separate decision, and it needs fresh sealed material for testing.
3. **Checking each extracted triple against its source with NLI is an established guard against invented
   content.**
   - **Examples.** EchoLLM filters LLM triples with an entailment check, using a threshold tuned on held-out data, and
     Amazon's RefChecker classifies each triplet as entailed, neutral or contradicted.
   - **For Pee.** This supports arms A+V and L+V.
4. **Epistemic status (certainty and hedging) is not solved by large models.**
   - **Certainty.** Hedge words explain only part of perceived certainty (Pei and Jurgens, EMNLP 2021).
   - **Rules can win.** A rule-based system outperformed LLMs on scientific uncertainty detection (UnScientify, 2025).
   - **For Pee.** Attitude and evidence kind may be better kept with explicit rules, checked by the verifier, than
     handed to a small model.
5. **GLiNER2 does support custom relation types and runs on CPU.** It is a schema-based extractor (EMNLP 2025 demo,
   Apache-2.0), with a stated size of 205 M or 340 M parameters. No relation-extraction benchmark figures were found.
   It remains a candidate for stage V, not an assumed arm.

**Sources** (as found):
- https://themodelwire.com/article/sub-billion-super-frontier-small-language-models-rival-zero-shot-frontier-llms-o-01KVS58CP3EHDA4Z9RTXR821CS
- https://aclanthology.org/people/aviv-brokman/unverified/
- https://arxiv.org/html/2602.11886v1
- https://www.sourcepulse.org/projects/1839174
- https://arxiv.org/pdf/2310.14564v1
- https://preview.aclanthology.org/setup/2021.emnlp-main.784
- https://www.emergentmind.com/papers/2503.11376
- https://huggingface.co/fastino/gliner2-large-v1
- https://arxiv.org/html/2507.18546v1

## 13. Revision 2: lessons from comparable projects, and one model for both roles

**Lessons from comparable projects** (sources in the conversation of 2026-10-23):
- **SemRep.** Strict precision is about 0.55, and errors include lost negations. Filtering after extraction raised
  one application from 0.67 to 0.91.
- **ORKG and CS-KG.** They rely on human curation. LLM verification raised precision from 0.75 to 0.87, but lost
  recall.
- **Negation and speculation.** Modules trained on annotated corpora (BioScope) beat generic rules by 20–30 F1.
- **Claim decomposition.** It is itself a source of error.

**What follows for C-1:**
- **Precision before recall.** The verifier arms matter most.
- **The record, per relation type.** F and S report precision per relation type, because a future admission
  policy, if the owner sets one, would admit by relation type, never in bulk.
- **Admission stays outside C-1.** Human review of a sample would be part of any later admission, as in every
  comparable project.

**One model for both roles.** The owner limited the exception to one model at first. The verifier V is therefore the
**same** local model used as an entailment judge: "Does this sentence state this proposition? yes / no / unclear",
with constrained output. No separate NLI model is installed.
- **What stays the same.** Arms A, L, A+V and L+V are kept.
- **What a fail would mean.** If the model fails as a verifier, a dedicated NLI model would be a later owner
  decision.

## 14. Stage P result (2026-10-23): stopped

**The stop rule was met** (`stage-p.json`).
- **Time.** Phi-4-mini, 4-bit, on 4 CPUs: **30.9 s per sentence** on average (median 17.5 s, maximum 174 s), against a
  limit of 30 s.
- **Memory.** Peak 5.75 GB, within the limit.

**A signal, not a measure.** On the 20 development sentences, all 25 propositions the model wrote used the generic
relation `other`, the very error C-1 targets.

**Not done.** Stage F, the verifier and any prompt change were not run, as the stop rule requires. The decision is
the owner's (section 0).

## 15. Revision 3 (2026-10-23): a learned relation classifier, fixed before code

**Basis.** The owner's message: "Fai quello che ritieni, ma deve essere supportato da quello che hanno fatto altri
sviluppatori; deve essere una cosa fattibile soltanto con sviluppato da te eventualmente, ci facciamo aiutare
ChatGPT per revisionare e a volte posso mettere del mio".
- **Development.** Claude is the sole developer.
- **Review.** ChatGPT reviews outside the repository, through the owner, and the owner may contribute.

**Why a learned classifier.** Stage P showed that a general small model, used zero-shot on CPU, is slow and reads
every relation as `other`. Published work points to task adaptation instead (section 12 and the comparable projects
of section 13):
- small models trained on the task beat zero-shot models;
- negation modules trained on annotated corpora beat rules.

The best-known approach for few labels is **SetFit** (Tunstall et al., "Efficient Few-Shot Learning Without Prompts",
2022): sentence embeddings from a small model, plus a light classifier trained on them.

**What changes, and what does not.**
- **Unchanged.** A-1 still segments the sentences and finds subject and object.
- **Replaced.** The classifier only chooses the **relation type** of each A-1 proposition. This targets the measured
  cause: about 60 of the 96 relation errors are fallbacks to `other`.
- **The single model.** It is now `nomic-ai/nomic-embed-text-v1.5`:
  - the official GGUF, Q8_0, 146 MB, SHA-256 `3e24342164b3…`, Apache-2.0;
  - run by the llama-cpp-python already built;
  - it replaces Phi-4-mini, whose weights are removed.
- **Classifiers.** Multinomial logistic regression in standard-library Python. No other library.

**Arms (relation label only).**

| Arm | Relation of each A-1 proposition |
|---|---|
| **B0** | A-1's own relation (baseline) |
| **B1** | A bag-of-words logistic regression, standard library only: words of the sentence, the subject, the object and the words between them. This non-neural supervised baseline shows whether the embedding model is needed at all |
| **B2** | nomic embeddings (prefix `classification:`) of "sentence ‖ subject ‖ object", with logistic regression |

**Data** (spent; no new material is opened).
- **Training examples.** The adjudicated speakers references D (269) and R (238 scientific). Each example is the
  proposition's block text with its subject and object. Its label is the reference relation, with `other: verb`
  collapsed to `other`.
- **Test items.** A-1's items that the O-2 judgements matched to a reference proposition:
  - the sealed run's adjudicated judgement for R;
  - the single development judgement for D.

**Stage F′: agent-free feasibility.**
- **Folds.** Five folds grouped by **section**, so that no section is in training and test at once.
- **Training.** Each fold trains B1 and B2 on the gold propositions of the other sections.
- **Testing.** It predicts the relation of A-1's matched items in its own sections.
- **Scoring.** Mechanical: exact relation label against the matched reference proposition, with `other` collapsed.
  B0 is scored the same way.
- **Reporting.** Accuracy and macro-F1, overall, per split (D-derived, R-derived) and per relation class (norms:
  `requires`, `recommends`).

**Pass rule** (to justify spending agents on a sealed Soundbars test). The pass rule is met only if:
- the better of B1 and B2 beats B0 by **at least 0.10** in exact relation accuracy on A-1's matched items;
- the gain holds in **both** splits.

Otherwise stop.

**Limits stated in advance.**
- **Spent material.** All of it is spent, so this is feasibility, never validation.
- **Labels.** The labels are Claude agents' annotations.
- **Mechanical scoring.** Exact label matching is stricter than the judges were. It is applied equally to every arm.
- **Scope.** Only the relation is predicted. Polarity, attitude and the rest stay A-1's.
- **What a pass cannot show.** A pass would not show that knowledge may be admitted.

## 16. Stage F′ result (2026-10-23): stopped; the pass rule is not met

**Results** (`stage-f-prime.json`). Exact relation accuracy on A-1's 500 matched items, five folds grouped by
section, 507 training examples in 27 relation classes:

| Items | B0 (A-1) | B1 (bag of words) | B2 (nomic embeddings) |
|---|---|---|---|
| All (500) | **0.34** | 0.15 | 0.19 |
| Development-derived (248) | **0.29** | 0.13 | 0.15 |
| Sealed-derived (252) | **0.39** | 0.17 | 0.23 |
| Norms (153) | **0.35** | 0.16 | 0.33 |
| Where A-1 said `other` (120) | 0.26 | 0.13 | 0.15 |

- **Both classifiers are worse than A-1's rules.** The best, B2, loses 0.15. Its macro-F1 is 0.05, close to always
  predicting a frequent class.
- **Measured cause.** There are about 19 examples per class, and the largest class, `other` (98 of 507), is
  heterogeneous by definition. With this data, the learners cannot separate the relations.

**What this does not show.** It does not show that a trained model cannot read relations. The literature's gains come
from fine-tuning on thousands of examples, or from contrastive tuning (full SetFit). C-1 used a frozen encoder,
because of cost and dependencies.

**What it does show.** With the annotations we have, around 500, a learned relation classifier is not a cheap
improvement.

**Cost.** About 11 minutes of CPU. No agents.

## 17. Post-hoc diagnostics after F′ (not preregistered; spent material; no agents)

**1. Six coarse claim classes.** Norm, definition, cause, value, method and other, with the grouping fixed before the
run (`coarse-diagnostic.json`).

| Arm | Exact accuracy |
|---|---|
| A-1 | **0.47** |
| B1 (bag of words) | 0.24 |
| B2 (nomic embeddings) | 0.34 |

Coarser labels do not let the cheap learners overtake A-1.

**2. Agreement of the two blind annotators on the relation.** 177 of 226 paired propositions, **0.78** (exact,
`other` collapsed). The task is learnable to about that level by a strong reader. A-1 reaches 0.34 and the cheap
learners 0.15–0.19. The gap lies in the reader's competence, not in the reference.
