# S1 architecture assessment and development plan

| | |
|---|---|
| **Authorised by** | owner, 2026-10-21: one comprehensive architectural review and planning phase; no implementation, no S0 redesign |
| **Inputs read** | `MISSION.md`; frozen S0 (`spec/`, chapters 1, 3, 4, 5, 6, 7 and 10 re-read for this review); `.claude/skills/pee-scientific-learning/SKILL.md`; `experiments/s1core` at `2926236` |
| **Method** | The owner asked for ECC (Everything Claude Code, MIT licence). To avoid its always-on context cost (about 47,500 tokens per session) and its eight hooks, only two of its components were kept: the `architect` agent definition and the `plan` command. The full plugin was uninstalled. The `plan` structure (requirements, risks, phases, dependencies, acceptance) was followed inline. One `architect` run reviewed a draft read-only. Its 13 findings and their handling are in section 12. |
| **Independence** | One designer (Claude). The architect review was another Claude instance, so it is **not independent validation**. |
| **Status** | Proposal for the owner's decision. Nothing here is implemented. |

Labels used here: components **C-…**; milestones **MS0–MS7**; owner decisions **OD1–OD9**; invariants **I1–I13**.
Labels such as D…, M…, T…, TC…, O… keep their S0 meanings.

## 1. Verdict

1. **The current S1 code is not the foundation of the semantic universe.**
   - It is a sound **specialised service**: numerical model-based inference, one of the eight inference types of
     S0 5.7.
   - Its knowledge layer is incompatible with S0 on four points (section 4):
     - one implicit frame;
     - concept identity by string equality;
     - a closed relation vocabulary in code;
     - record, interpretation and standing merged in one object.
2. **What is missing is a shared item vocabulary with history, together with services that cooperate through it.**
   The services are concepts and frames, content structure, standing and evidence, inference, coherence, and
   practical reasoning. This is not a stack of layers: these services depend on one another cyclically, as S0
   itself does (section 10.3). The cycles are broken by a small shared item store and an inference contract, not by
   layering.
3. **Keep, do not discard.**
   - **Kept** from the numerical engine, as one service: units and dimensions, the expression language, interval
     propagation, domain-of-application checks, scope rules, the inheritance-by-`holds_of` rules, the
     most-specific-level rule for defeasible generics, verification records, traces and ablation.
   - **Replaced:** its store, item classes and status vocabulary.
4. **The first step is a thin vertical slice, not a bottom-up build.**
   - **What:** a minimal item store, one ported S1 path end to end, and one non-numerical path over the same items
     (MS1).
   - **Why:** this follows the skill's rule "trace one complete path end to end before adding components" (§3.7). It
     is also the only honest test of the extensibility claim, which **remains unproven** until then.

## 2. Requirements restated

The architecture must serve R1–R20 (S0 1.2). These drive structure:

- **Representation.**
  - The nine kinds of item of 3.4, with an extensible registry: the list is not closed (O14, T11).
  - Concepts with anchors, goals and role profiles (D2-a); frames, intertheoretic mappings and succession (D6); the
    scaffold as a revisable frame (3.8).
  - **Composition and qualification**:
    - Op1–Op10;
    - generality forms (4.2);
    - context and lifting (4.3);
    - time, change and conditions (4.4–4.6);
    - quantities and scale types (4.7);
    - seven modalities (4.8);
    - uncertainty kinds (4.9);
    - N1–N7 (4.10);
    - qualifiers placed in content or in standing, with no double counting (4.11).
  - Questions with presuppositions and answer spaces; inquiries as occurrents (7.2); inquiry roles (D19).
  - Phenomena distinct from data, and robustness (5.3).
- **Acquisition and recognition.** Attribution before adoption; interpretation as a hypothesis (6.1); concept
  introduction modes M1–M6; recognition with "indeterminate" and provisional concepts (3.6.5).
- **Verification and inference.** Eight inference types with defeaters (5.7); evidence as a relation with eight
  properties (5.8); standing with seven dimensions, and grounds G1–G7 (5.9); auxiliary hypotheses, and how-possibly
  versus how-actually hypotheses (5.4); explicit rival-hypothesis spaces (5.7).
- **Revision without loss.** L1–L7; lineage (D15); propagation; entrenchment and the history of repairs (6.3);
  non-destructive history (T8).
- **Reuse and transfer.** Scope hypotheses; TC1–TC5 (6.4).
- **Methodology.** Methods and practices (D16, 7.3); tacit knowledge represented as existing (O15); stratified
  self-assessment (7.5).
- **Adviser support.** Goals, norms, values, designs, design spaces, decisions (7.4, 5.11); evaluative contents
  with mandatory parameters; bidirectional access.
- **Coherence.** C1–C12, including C6 (non-conservativity) and the explanatory-integration profile (6.5).

**Non-functional requirements:** deterministic and inspectable; every conclusion traceable; no paid services; light
dependencies; public repository hygiene; reversible choices. The architecture derives from S0, not the reverse.

**Stage boundary.** MISSION places the *full knowledge cycle* in S2, which is not authorised. Acquisition from
external sources, the practical feedback loop and the learning loop are therefore **S2 candidates** (MS6–MS7 below)
and need a separate owner authorisation.

## 3. The semantic universe as an architecture

### 3.1 Fixed versus open

- **Fixed in code: the meta-level only (D1–D19).** It is held in a **versioned kind registry**, never as hard-coded
  enumerations. Adding a kind of item or a content kind is a registry revision, recorded as an event. This answers
  O14 and T11.
- **Open, held as knowledge:**
  - the scaffold categories (3.8);
  - relation concepts (part-of, made-of, instance-of, causes, constitutes, measured-by, function-of …), each with its
    inference behaviour declared as knowledge;
  - metrology as a frame in the presupposition role (kinds of quantity, dimensions, units, scale types, conversions);
  - domain frames, models, methods, phenomena and goals;
  - standing attitudes beyond the indicative list of 5.9.

### 3.2 Item vocabulary (meta-level)

| Item | S0 | Notes |
|---|---|---|
| Item, with opaque identity | D1 | kind, provenance (C5), situating parameters (T7) |
| Concept; Frame; Mapping between frames | D2, D2-a, D6 | mappings are exact, approximate or limiting, or partial; lifting between contexts (4.3); declared invariance (4.3) |
| Content (open kinds, D10); Model (structural or behavioural, D7); Record (D11) | 3.4 | content carries composition structure (section 3.3) |
| Method; Practice | D16 | the nine-part description of 7.3; tacit parts marked |
| Design; Design space; Goal; Norm; Value; Decision | D17, D18, 7.4 | the design space limits what a choice can claim |
| Question; Inquiry | 7.2, D19 | presuppositions, answer space; inquiry roles are relative to an inquiry |
| Target; Situation; Phenomenon | D8, D9, 5.3 | phenomena are distinct from data |
| Standing; Ground; Holder; Evidence relation; Explanation relation | D12–D14, 5.6, 5.8 | relations are items with their own standing |
| Inference record; Rival-hypothesis space | 5.7 | inferences are occurrents recorded as grounds |
| Lineage; Identity relation | D15, 3.6.3 | verdict, extension relation and structural relations |
| **Universe event** | T8, 6.3 | acquisition, inference, standing change, revision, decision; append-only. It is kept distinct from **world occurrents** (4.5, C10) |

### 3.3 Content structure

Content structure (chapter 4) needs a home of its own, otherwise every service re-invents it. Content items carry a
structured composition: role filling, modifiers by type, plural readings, generality form, situating parameters,
embedding operators, modality kind, negation case and qualifier placement. A **content-structure service** (C-CS)
builds and checks this structure. Examples of its guarantees:

- privative modifiers block inheritance: "putative gene" is not "gene" (Op2);
- substitution is blocked inside attitude contexts (Op9);
- "< LOD" is an upper bound, never zero (N5);
- a negative result is weighted by power (N6);
- a chance in the content is not repeated as credence (4.11);
- a generic is not read as a universal (4.2);
- a composite model is admissible only under Op8.

### 3.4 Mechanisms, processes, contexts

- **Mechanisms** are structural models: entity roles, activities and organisation, with a domain (5.5, D7).
- **Mechanistic explanation** is an explanation relation (5.6).
- **Processes and events** are world occurrents with participants in roles (Op1, 3.8); change takes three forms (4.5).
- **Context** is a set of situating parameters (Op6, 4.3). Moving content between contexts needs a mapping or lifting
  item.

## 4. Assessment of the current S1 code

| S1 element | Fit | Problem | Disposition |
|---|---|---|---|
| `units.py`, `expr.py`, interval arithmetic | good | the units table is code | keep; later load units from the metrology frame |
| `Model` | partial | structural mathematical models only | one case of the Model item |
| `Value` | **incompatible** | merges record, interpretation content and standing basis (5.2, 5.3, T6) | Record + situated Content + Standing |
| `Attribute`, `SingleValued` | partial | determinates as strings; incompatibility (N4) only via `SingleValued` | contents over determinable concepts with value spaces (T4) |
| `Link` with three relations in code | **incompatible** | a closed relation vocabulary violates T11 | relation concepts with declared inference behaviour |
| Entities, kinds and roles as strings | **incompatible** | lexical identity is never sufficient (D4, 3.6.5) | concepts and recognition |
| `Situation` | partial | mixes target, situation, inquiry and working assumptions | Inquiry + Target + Situation; assumptions as working-assumption standings (5.4) |
| `KB.add` / `without` | partial | immutable, but no events; `without` loses history (T8) | append-only universe events |
| `Outcome` | partial | traceable, but not an item; conclusions cannot be reused as premises | inference record + proposed item |
| Scope, `holds_of` inheritance, domain checks, most-specific-level rule | good | quantities only | generalise in the scope and transfer service |
| Hull combination | partial | a provisional **evidence-combination** policy that ignores independence and quality (5.8, O6) | move to the standing and evidence service as one replaceable method |
| `basis`, `Verification` | partial | `basis` mixes source type, ground type and standing | Ground (G1–G7) + Holder + Method; verification as a universe event with a method |

**Mapping of the S1 status vocabulary.**

| S1 status | Becomes |
|---|---|
| SUPPORTED | a proposed content grounded by an inference record |
| UNRESOLVED | a gap (N1) with stated needs |
| REFUSED (outside the domain) | a scope **undercutting defeater** (5.7, C8) |
| CONFLICT | the Belnap "both" state (4.10) |

At port time the old engine is probed from its own vocabulary and cases (skill §3.8).

## 5. Components and their dependencies

**Shared foundation.**

- **C-ST, item store:** identity, kind registry, provenance and situating parameters.
- **C-EV, universe-event log:** append-only.

They are kept small and split: validation lives in the services that own each item kind, and queries are added
only when a consumer needs them. Every other component is a **peer service** over that vocabulary.

| Service | Responsibility | Reads (item kinds) | Writes (item kinds) |
|---|---|---|---|
| **C-CF Concepts & frames** | concepts, anchors, goals, role profiles; frames, mappings, lifting, succession; lineage; identity relations | concepts, frames, records, questions, standings, inference records | concepts, frames, mappings, lineage, identity relations |
| **C-CS Content structure** | composition Op1–Op10, generality, modality, negation, qualifier placement; structural checks | concepts, frames | content structure (inside content items) |
| **C-SE Standing & evidence** | standing (7 dimensions), grounds, evidence relations (8 properties), defeaters, uncertainty on components, evidence combination (replaceable methods) | all representational items, norms (standards), inference records | standings, grounds, evidence relations |
| **C-IN Inference services** | one service per inference type of 5.7, including recognition (3.6.5) and testimonial inference; the scope and transfer service (TC1–TC5); rival-hypothesis spaces | everything within the declared scope | proposals, inference records, rival spaces, needs |
| **C-CO Coherence & maintenance** | C1–C12, including C6 and the integration profile; contained conflict; propagation of revised grounds; entrenchment and history of repairs | everything | conflict records, revision events |
| **C-QI Questions & inquiries** | questions (presuppositions, answer spaces, defect detection), inquiries, inquiry roles | contents, standings | questions, inquiries |
| **C-PR Practical reasoning** | goals, norms, values, designs, design spaces, decisions, evaluative contents; bidirectional access | contents, models, standings | practical items, decisions |
| **C-AQ Acquisition** (S2 candidate) | attribution before adoption, interpretation hypotheses, introduction modes M1–M6, sources and rights | external material | attributed items, interpretation contents |
| **C-LM Learning & methodology** (S2 candidate) | methods and practices as items; lessons and counterexamples; reliability profiles; reconsideration; stratification | everything | methods, lessons, reconsideration events |

**One inference contract.** A service answers `propose(inquiry) → (proposed items, inference record, needs,
defeaters)`. The inquiry names its question, target, situation, scope and working assumptions. A service:

- never adopts an item;
- keeps no private store;
- never closes the world without a declared closure;
- never crosses frames without a mapping item;
- states its own guarantees, which may be decidable fragments or bounded procedures.

## 6. Knowledge flows

1. **Attribution.** Material enters as attributed items. The universe's standing is "entertained" at most.
2. **Recognition** relates terms to concepts, recorded as identity relations with verdicts (3.6.2–3.6.3).
   - **Identical** → consolidation is recorded as a lineage event (S0 6.2, merger), and both histories are kept.
   - **Indeterminate** → a provisional concept, with the missing evidence stated.
   - **Reading-dependence.** Conclusions that depend on an indeterminate identity, a partial reference or a vague
     concept are evaluated under each reading and marked reading-dependent (3.6.4).
   - **Grouping.** Equivalence groupings are derived per query, and only from consistent identity relations. This
     guards against the demonstrated defects of S0's identity rules (non-transitivity in 2.1, ambiguity in 2.0).
3. **Interpretation** of records produces situated contents with frames and grounds. Phenomena are inferred from
   many records, with robustness recorded (5.3).
4. **Inference services** produce proposals. One service's proposal becomes another's premise only through a
   recorded ground, so services cooperate through items.
5. **Standing** weighs grounds against standards. Standards are norm items, and any role of values in setting them is
   explicit (3.5).
6. **Coherence** contains conflicts and propagates revised grounds.
7. **Feedback loops (S2 candidates).** Decisions produce outcome records, which become evidence (5.11). Lessons,
   counterexamples and method reliability are updated, and unresolved items are reconsidered when the knowledge they
   needed arrives.

**Shared cycle.** Quantitative records, qualitative observations, expert judgements, mechanistic studies,
explanations and methods all go through the same cycle, with their own evidence-relation properties. None needs a
separate store.

## 7. Bidirectional reasoning over one body of knowledge

- **Hubs.**
  - **Functions and capabilities** (7.4).
  - **Mechanisms** (5.5).
  - **Goals**: conative items whose satisfaction conditions are contents.
- **From the goal side:** goal → satisfaction content → mechanisms that can bring it about (causal and model
  contents with conditions) → strategies, including doing nothing → artefact kinds and categories with that function
  → evaluative contents with mandatory parameters.
- **From the technology side:** technology → functions with performance under conditions (rated versus realised,
  7.4) → mechanisms → goals they can serve, with conditions and contraindications.
- **Both directions** are queries over the same items.
  - A shared goal ("low noise") is one concept. Its realisation and measurement stay category-specific.
  - Relevance is never promoted to causation without causal grounds.

## 8. Development plan, in dependency order

### 8.1 Acceptance protocol for every milestone

1. **Two kinds of acceptance.**
   - **(a) Integrity:** tests by the developer, tier T1.
   - **(b) Operational value:** on material **fixed by a rule and sealed by commit before development of that
     milestone**, drawn from groups (domains, sources, categories) not used to build it.
2. **Reporting for (b).**
   - the minimum tier, the annotator (who sets expected outcomes, and whether they are author-independent) and the
     sealing commit;
   - three counts with denominators: justified conclusions, unjustified conclusions and unjustified abstentions.
3. **Material used to design something** never later counts as evidence for it (CLAUDE.md).
4. **Ground truth for dependency or revision claims** must be external, for example a documented retraction whose
   downstream uses are listed independently. Never use the system's own grounds as the reference.
5. **Regression.** Earlier milestone suites must keep passing. When mechanisms merge, both are probed from their own
   vocabularies (skill §3.8).

### 8.2 Milestones

| # | Milestone | Depends on | (a) Integrity | (b) Operational acceptance |
|---|---|---|---|---|
| **MS0** | Owner decisions (section 11) and the **evaluation protocol**: rules for drawing held-out domains, goals and sources; rights checked; annotators named | — | protocol committed before any code | defines the (b) material and annotators for MS1–MS5 |
| **MS1** | **Thin vertical slice**: a minimal store and event log; the S1 model-based path ported end to end; one **non-numerical** inference (a deductive rule over relation concepts) over the same items; the first Question and Inquiry items | MS0 | every S1 behaviour preserved (its 47 tests re-expressed as a regression suite); no service has a private store (architecture test); "what was held at t" reproduces past states; a question with a false presupposition is detected as defective | **T2**: on the sealed cases from ≥ 2 unseen domains, a conclusion of the rule service is used as a premise by the numerical service, and the reverse. Report the three counts against annotator expectations |
| **MS2** | **Concepts, frames, content structure**: concepts with anchors and goals; recognition with provisional concepts; identity relations; frames, mappings and lifting; the C-CS checks of section 3.3 | MS1 | consolidation only by lineage event; reading-dependent conclusions marked; a limiting-relation transfer licensed only inside its limit regime; the C-CS guarantees of 3.3 hold on constructed cases | **T2**: on held-out terms from an unseen domain, recognition precision of "same", justified versus unjustified "indeterminate" (annotator-labelled), and provisional concepts resolved once evidence arrives; a coverage rate (with denominators) of distinctions the sealed cases need |
| **MS3** | **Standing, evidence and maintenance**: seven-dimension standing, evidence relations, defeaters (scope undercutters included), Belnap states, replaceable combination methods, propagation, contained conflict, history of repairs | MS1, MS2 | conflicting sources give two attributions and a conflict, without explosion (C12); goals and values never ground standings | **T2 or T3**: on a documented retraction or recalibration with independently listed downstream uses, the precision and recall of flagged dependants against that external list |
| **MS4** | **Causal, mechanistic and explanatory knowledge; qualitative evidence**: causal models, mechanism models, explanation relations, auxiliary hypotheses, abduction over an explicit rival space, phenomena with robustness | MS3 | association never becomes causal without causal grounds; how-possibly is kept apart from how-actually; the rival space is recorded | **T2**: on held-out causal and explanatory cases, the three counts; transfer refused when TC4 fails, scored against the annotator |
| **MS5** | **Practical reasoning and bidirectional access**: goals, norms, values, designs, design spaces, decisions, evaluative contents | MS3, MS4 | evaluative contents complete or marked incomplete; doing nothing is always among the strategies | **T2, and T3 where an external reference exists** (for example published guidance listing interventions for a goal): precision and recall of strategies and categories in both directions on held-out goals and categories |
| **MS6** | *(S2 candidate)* **Acquisition from external sources** under rights rules; interpretation hypotheses; concept introduction modes M1–M6 | MS2, MS3, owner authorisation | attribution before adoption on real sources; rights audit passes | **T2**: on unseen sources, rates of correct attribution, wrong attribution and justified abstention |
| **MS7** | *(S2 candidate)* **Learning loop**: methods, practices, lessons and counterexamples as items; reliability updates; reconsideration; stratification | MS3–MS6, owner authorisation | lesson gate enforced in code; no regression | **T2**: knowledge acquired in domain A changes the three counts on sealed held-out domain B where TC1–TC5 hold, and correctly refuses where they fail; gains and harms with denominators |

**Why this order.**

- **MS1 first.** It forces the item store and the inference contract to meet two real consumers at once, numerical
  and non-numerical, before any schema grows.
- **MS2 and MS3** grow the vocabulary from what MS1's paths need. Their acceptance cases are scheduled so that each
  uses only services already built.
- **MS4 and MS5** need standing and evidence.
- **MS6 and MS7** belong to the S2 knowledge cycle.

## 9. System-wide invariants

| Id | Invariant | S0 |
|---|---|---|
| I1 | Attribution before adoption | 6.1 |
| I2 | No silent change: every change is a universe event with reasons | T8, 6.3 |
| I3 | Kind of item by correctness condition; role relative to an inquiry | 3.4, D19 |
| I4 | Every standing other than "entertained", and every decision, has traceable grounds | C4, C5 |
| I5 | Planes distinct: goals and values never ground epistemic standing | T6, 3.5 |
| I6 | No closed world without declared closure; N1–N7 kept distinct | 4.10, C11 |
| I7 | Frame-local consistency; conflict contained, never resolved by deletion | C1, C12 |
| I8 | No identification without grounds; consolidation is a lineage event; "indeterminate" always available; reading-dependence marked | C11, 3.6, 6.2 |
| I9 | Scope discipline: use beyond a domain is a transfer hypothesis | C8, 6.4 |
| I10 | Uncertainty on its component; chance distinct from credence; no double counting | 4.9, 4.11 |
| I11 | Services read and write only through the shared store; no private stores | anti-fragmentation |
| I12 | Mechanism code names no domain, entity, kind or relation type | T11; skill §3.2 |
| I13 | Universe events are distinct from world occurrents | 4.5, C10 |

## 10. Gaps, incompatibilities, circularities and risks

### 10.1 Gaps in the current code

- concepts, frames, mappings;
- content structure (chapter 4);
- questions and inquiries;
- phenomena;
- events and history;
- standing as an item, and evidence and explanation relations;
- inference records;
- causal and mechanistic content;
- practical items and design spaces;
- acquisition;
- methods, practices and lessons;
- bidirectional access.

### 10.2 Incompatible S1 assumptions

- one implicit frame;
- string identity;
- closed relation vocabulary;
- record, content and standing merged;
- a status vocabulary crossing planes;
- history lost by `without`.

### 10.3 Circular dependencies (why the services are peers, not layers)

| Circle | How it is entered |
|---|---|
| Identity relations (C-CF) need standings and recognition grounds (C-SE, C-IN), while standings bear on items built from concepts | provisional concepts with "entertained" standing; recognition grounds recorded later as events |
| Frame adoption is a decision (C-PR), while decisions use contents formulated in frames | an initial scaffold and metrology frame adopted by a recorded bootstrap decision with presupposition role |
| Standards of acceptance are norms (C-PR), used by standing (C-SE) | standards are norm items available before any practical reasoning; their reliability is assessed by other methods (7.5) |
| G2 grounds point to inference records (C-IN), which consume standings (C-SE) | inference records are items in the shared store; a ground is a reference, not a call |
| Recognition needs concepts, which arrive through recognition | provisional placeholders (introduction mode M6, 3.6.5) |
| Dimensional checks need metrology, which is knowledge | the metrology frame in presupposition role, revisable by succession |
| Methods assessed by methods | stratification (7.5); agreement of copies is not evidence |
| Identity judged by goals; goals stated with concepts | goals stated without the judged concept (D5-b) |

### 10.4 Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Fragmented parallel engines** | high (S1 itself began this way) | I11; architecture test in MS1; one inference contract |
| **God-object store or fixed schema** | medium | small store; extensible kind registry; validation owned by services; queries added on demand |
| **Cost of explicitness** (O16) | high | declared per-frame defaults ("unspecified" is allowed, 4.3); measured in MS2 coverage |
| **Undecidability** of unrestricted reasoning (10.2) | certain if unrestricted | decidable fragments or bounded procedures per service, with stated guarantees |
| **Natural-language interpretation** (O17) | high for MS6 | OD4: an LLM, if any, only as an attributed interpreter producing hypotheses |
| **Unsettled identity procedure** | certain | relations with no forced merge; reading-dependence; measured in MS2 |
| **Over-abstention** | medium | unjustified abstentions counted at every milestone |
| **Synthetic success** | high | MS0 protocol; sealed held-out material; external ground truth; tiers |
| **Analysis paralysis** | medium | each milestone ships executable behaviour and an owner checkpoint |

## 11. Computational approaches, foundations and options

| Approach | Strengths for S0 | Weaknesses | Proposed use |
|---|---|---|---|
| **Typed immutable items + append-only event log** in a general language | matches pluralist kinds and history; storage-agnostic; no dependency | queries must be written | **shared foundation** |
| Graph or RDF-star with named graphs | relations, PROV-O provenance, contexts | n-ary conditioned contents and quantities need reification | optional projection or export |
| Datalog with stratified negation | traceable, decidable, rules with provenance | quantities and uncertainty outside the logic | deductive service |
| Description logic | scaffold classification | weak for quantities, counterfactuals and opacity | optional consistency check of the scaffold |
| Numerical model evaluation (S1) | quantities, dimensions, intervals, domains | quantitative only | model-based service |
| Causal and probabilistic models | causal and statistical content | calculus deferred (O4); data hungry | causal service, calculus replaceable |
| Embeddings | candidate retrieval for recognition | no grounds or conditions | optional; never a ground |
| LLM interpreter | reading texts | non-deterministic; can invent | optional attributed interpreter (OD4) |

**Essential foundations:**

- the item vocabulary with the kind registry;
- the event log;
- the inference contract;
- invariants I1–I13;
- the coherence and maintenance obligations.

**Replaceable choices:**

- storage backend;
- rule engine;
- uncertainty calculus (intervals now);
- evidence-combination methods (hull now, provisional);
- retrieval;
- natural-language interpreter;
- serialisation.

**Future enhancements:** a user interface, scaling and distribution.

### Owner decisions required

| Id | Decision | Recommendation |
|---|---|---|
| OD1 | Adopt this architecture; keep S1 as a service to be ported in MS1; stop extending `s1core` as a foundation | adopt |
| OD2 | Identity as recorded relations, with consolidation by lineage event and reading-dependence; S0's identity procedure stays open (O1, O11) | adopt; reconsider after MS2 evidence |
| OD3 | Language and persistence | Python standard library; append-only file log; no database until a measured need |
| OD4 | Role of LLMs at runtime | none before MS6; then only as an attributed interpreter, with ablation against curated input |
| OD5 | Acceptable external sources for sealed held-out material (T2, T3) and annotators | owner names them in MS0 |
| OD6 | First application target after MS5 | scientific domains first, then one product category as a transfer test |
| OD7 | Who may attest verifications | owner or named external references only |
| OD8 | Whether to consider an S0 amendment on identity after MS2 | defer |
| OD9 | Authorisation of S2-candidate milestones MS6–MS7 | decide after MS5 |

## 12. Architect review and its handling

One read-only `architect` run (another Claude instance; not independent validation) produced 13 findings. All were
accepted.

| # | Finding (severity) | Handling |
|---|---|---|
| 1 | Strict layering hides cycles: identity needs standing, frame adoption is a decision, standards are norms, G2 points to inference records (high) | services made peers over a shared store; dependency table in section 5; cycles in 10.3 |
| 2 | Composition and qualification (chapter 4) had no owner (high) | C-CS service and its guarantees (3.3); MS2 integrity criteria |
| 3 | Questions and inquiries missing; "question" in the contract undefined (high) | Question and Inquiry items; C-QI; contract takes an inquiry; MS1 test for false presuppositions |
| 4 | Bottom-up order contradicts the skill's end-to-end rule (high) | MS1 is a thin vertical slice with two consumers; dependencies re-ordered |
| 5 | Acceptance criteria not measurable or circular (high) | 8.1 protocol: sealed material, tier, annotator, three counts, external ground truth; per-milestone metrics |
| 6 | Fixed schema and God-object risk (medium) | versioned kind registry; small split store; queries on demand |
| 7 | Full knowledge cycle belongs to S2 (medium) | MS6–MS7 marked as S2 candidates; OD9 |
| 8 | "No physical merge" contradicts S0 6.2 and ignores reading-dependence (medium) | consolidation as lineage event; evaluation under readings (I8, section 6) |
| 9 | Frame mappings, lifting and succession missing (medium) | mapping items in C-CF and MS2, with a limit-regime test |
| 10 | Fairness to S1: hull is evidence combination; keep the most-specific rule; map the statuses; probe the old engine (medium) | section 4 updated, including the status mapping |
| 11 | Phenomena, practices, tacit knowledge, auxiliary hypotheses, rival and design spaces, repair history, C6, testimonial inference missing (medium) | assigned to components and milestones |
| 12 | Universe events versus world occurrents (low) | named apart; I13 |
| 13 | Empty review section; label clashes (low) | this section; labels MS, OD, C- |

## 13. Critical uncertainties

1. **Acquiring concepts without perception.** Can anchors and goals be acquired from records and texts well
   enough (O3, O17)? This is the largest uncertainty, and only MS2 and MS6 can measure it.
2. **Cost of explicitness** (O16). Measured in MS2.
3. **Identity** (O1, O11). Contained by relations and reading-dependence, not solved.
4. **Evidence combination and the uncertainty calculus** (O6, O4). Deferred, with replaceable methods.
5. **Demonstrated learning.** Nothing before MS7, an S2 candidate, can show cross-domain learning. MS1–MS5 can show
   operational capability and transfer only within their sealed protocols.
