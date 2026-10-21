# 3. The model of meaning

Requirements addressed: R1, R3, R4, R8, R9, R11, R15, R16, R18.

Version 2.0 replaces the model-centred thesis of 1.0 with a pluralism of representational items, withdraws
"degenerate models", and replaces the core/collateral identity criterion with the continuity criteria of section
3.6. Section 2.8 compares these decisions with their alternatives. The S0 1.0 text remains in Git history at commit
`d82f95f`.

## 3.1 Overview

The proposal is **anchored-role semantics in a pluralist representational universe**:

> The semantic universe is about the world as science investigates and changes it. It holds several kinds of
> **representational items**: situated and general **contents**, **models**, **records**, **methods and practices**,
> **designs**, **goals** and **norms**. They differ in what makes each of them correct: truth, fit, fidelity,
> reliability, conformance, satisfaction. They also differ in their **direction of fit**. None is reduced to
> another. Whether an item serves as data, evidence, representation, instrument or standard depends on its **role
> in an inquiry**, not on its kind. Items are built from **concepts**. A concept's meaning is its **role profile**
> in a frame, whose connections are more or less **central**, together with its **anchors** in the world and the
> **epistemic goals** it serves. A concept keeps its identity through change, and is related to concepts of other
> frames, by continuity of anchors, goals and extension. Where these point in different directions, the case is
> recorded as **indeterminate**, and conclusions that depend on it are marked. **Meaning, correctness,
> justification, acceptance and practical decision** are kept distinct. History is recorded, so no revision is
> silent.

## 3.2 Theses

- **T1 Pluralism by correctness condition.** The universe holds representational items of several kinds,
  individuated by their correctness conditions and direction of fit (section 3.4). No kind is the primary bearer to
  which the others reduce. Every item can also be *described* by contents, for example "model M fits target T in
  respect R". Such description does not replace what the item itself represents or requires.
- **T2 Anchored role with graded centrality.** The meaning of a concept in a frame consists of its role profile in
  that frame, with graded centrality, its anchors and its epistemic goals (D2-a).
- **T3 Identity by continuity, with honest indeterminacy.** Identity of a concept through change, and relations
  between concepts of different frames, are judged by continuity of anchors, epistemic goals and extension, and by
  the centrality of the role connections that change (section 3.6). Where the evidence or the dimensions conflict,
  the outcome is *indeterminate*. Conclusions that depend on an indeterminate case are marked as dependent on the
  reading.
- **T4 Structured properties.** Properties are determinates of determinables with structured value spaces. Their
  scale types fix which comparisons and operations are meaningful.
- **T5 Systematic composition.** The meaning of a composite is fixed by the meanings of its parts, the mode of
  composition and the context. Departures from this are explicit and named (section 4.1).
- **T6 Five distinct planes.** *Meaning* (what an item says or requires), *correctness* (whether it is true, fits, is
  faithful, reliable, conformed to or satisfied), *justification* (the grounds bearing on correctness),
  *acceptance* (epistemic standing) and *practical decision* (choice of action) are distinct. None settles another
  (section 3.5).
- **T7 Explicit situatedness.** Every item is relative to a frame, and where relevant to a situation, a time, a
  perspective and conditions. Being context-free is a declared invariance, never a default.
- **T8 History is part of the universe.** Acquisitions, revisions and decisions are events in the universe with
  reasons. For any earlier time, it must be possible to say what was held, with what standing and why. The required
  granularity of retained history is a question for S1 (O16). The semantic obligation is that no change of standing,
  concept, frame or decision is silent.
- **T9 Local, graded coherence.** Coherence is required within frames and is assessed by explicit criteria
  (section 6.5). Conflict between frames, or between holders, is represented and contained, never allowed to spread
  to unrelated items.
- **T10 Reflexive methodology.** Methods of inquiry and learning are represented in the same universe, with the same
  apparatus as the phenomena they investigate. They can therefore be questioned, supported and revised.
- **T11 Openness.** No list of domain categories is closed. Only the meta-level notions D1–D19 are fixed by this
  specification. The ontological scaffold (section 3.8) is a revisable frame like any other.

## 3.3 Meta-level notions

The meta-level is the fixed vocabulary in which the universe is described. Everything else, including "entity",
"process" or "gene", is a concept *inside* the universe.

**D1 Semantic universe.** The totality of items, their relations and their history. An *item* is anything the
universe can individuate and talk about: a concept, a frame, a representational item (D10, D11, D16–D18), a
standing, a decision, an agent, and so on. "Item" only marks "something individuated". It carries no commitment to
a storage structure.

**D2 Concept.** A unit of meaning that can apply to things, take values or relate things. Concepts include kinds
(electron, acid), determinables (mass, colour, fitness), relations (catalyses, is part of) and occurrent types
(diffusion, speciation). A concept has a meaning (D2-a) and an extension (D3). Concepts are not words: one term may
express several concepts, and one concept may have many terms. Concepts are not themselves correct or incorrect.
They apply or fail to apply.

**D2-a Meaning of a concept.** For a concept *c* in frame *F*:

```
meaning_F(c) = ⟨ role-profile_F(c) with centrality, anchors(c), goals(c) ⟩
```

- `role-profile_F(c)` is the set of *c*'s connections in *F*, each with a degree of centrality (D5).
- `anchors(c)` is the set of anchors (D4).
- `goals(c)` is the set of epistemic goals the concept serves (D5-b).

Anchors and goals belong to the concept rather than to one frame. They are what lets a concept be tracked across
frames and through change.

**D3 Extension and reference.** The extension of *c* is what in the world satisfies *c*. It is whatever best
satisfies *c*'s anchors and the central connections of its role together. "Best" is understood as the most
*eligible* candidate, following the discussion of reference determination in Lewis ("New work for a theory of
universals", 1983; "Putnam's paradox", 1984). Three outcomes must be representable:

- **determinate reference**: one best candidate, or one best class of candidates;
- **empty reference**: no candidate is good enough (caloric or phlogiston, read as substance concepts);
- **indeterminate reference**: several candidates are equally good. S0 treats this as **partial reference to each
  candidate** (Field, "Theory change and the indeterminacy of reference", 1973). It does not treat it as failure of
  reference, which was Lewis's earlier view (Lewis, "How to define theoretical terms", 1970). This is a choice, and
  section 3.6.4 states its consequences.

**D4 Anchor.** A link that ties a concept to the world independently of its current role, so the concept can be
tracked when its role changes. There are five types:

| Anchor type | Ties the concept to | Example | Strength |
|---|---|---|---|
| **Exemplar** | particular samples, specimens, cases or images taken as paradigmatic | a type specimen; a reference material | strong |
| **Operational** | a procedure whose outcome settles whether the concept applies, or what value it takes | a titration; a calibrated thermometer; a validated questionnaire | strong |
| **Deferential** | a community, standard or authority whose usage fixes the concept | an internationally agreed unit definition | strong |
| **Descriptive** | a description in terms of other anchored concepts | "unseen matter producing the observed rotation curves" | weaker |
| **Lexical** | a term in a language and community | the word "acid" in chemistry | weakest; never sufficient for identity |

- **Divergence.** Anchors can diverge. Two thermometers built on different principles may disagree. Whether
  anchors agree is an empirical matter, represented with grounds (Chang, *Inventing Temperature*, 2004).
- **Descriptive anchors use other concepts.** A chain of descriptive anchors must end in exemplar, operational or
  deferential anchors, or the concept is anchored only within the conceptual system (O3).
- **Category commitment.** A descriptive anchor must state its category commitment ("unseen *matter* that …",
  not "whatever …"). Otherwise the concept could never fail to refer. A purely structural characterisation is
  satisfiable almost trivially (Newman, "Mr. Russell's 'causal theory of perception'", 1928; Demopoulos and Friedman,
  1985), and non-structural anchors are what block this.
- **Paradigm anchors.** An anchor is *paradigm* for a concept if it is used to introduce or teach the concept, or if
  it is the reference standard for it. Paradigm anchors weigh most in identity judgements (section 3.6).

**D5 Role profile and centrality.** The role profile of *c* in *F* is the set of *c*'s connections to other items in
*F*:

- **structural**: positions in model types, such as variable, parameter, conserved quantity or participant role;
- **inferential**: what follows within *F* from applying *c*;
- **measurement**: how values or applications of *c* are determined;
- **explanatory**: what *c* is used to explain, and what explains it;
- **constitutive**: the constitutive commitments of *F* in which *c* figures (D6).

Each connection has a degree of **centrality**: the extent to which *c*'s other connections in *F*, and the methods
of *F* that involve *c*, depend on it. A connection is central if giving it up would make many of *c*'s inferences,
measurements or explanations in *F* unavailable. It is peripheral if little else depends on it. This follows the
dependency account of feature centrality (Sloman, Love and Ahn, "Feature centrality and conceptual coherence",
1998). Connections that figure in constitutive commitments of *F* have the highest centrality under this same
measure. The frame's methods depend on them by presupposition (D6), so this is a consequence of the measure, not a
separate stipulation. A calibration convention used by few inferences is still central if the frame's measurements
presuppose it.

Centrality is **graded and comparative**. No threshold divides "core" from "collateral". This replaces the binary
split of 1.0, which section 2.8 shows was not operational. It keeps the answer to holism (section 2.2, A3): sharing a
concept requires shared anchors, shared goals and agreement on central connections, not identical total roles.

**D5-b Epistemic goal.** An epistemic goal of a concept is a type of question that the concept is used to answer, or
a type of inferential or practical task it is used for, in a practice (Brigandt, "The epistemic goal of a concept",
2010). Two examples: explaining patterns of inheritance, and explaining how a DNA sequence specifies a product. Goals
are individuated through question types (section 7.2), which are items with presuppositions and answer spaces.
**A goal-defining question type must be stated without using *c* itself**, in terms of explananda and other anchored
concepts: "why do offspring resemble parents in specific traits?", not "how do genes act?". This prevents goal
continuity from presupposing the identity it is used to judge. A concept's goals are identified from the questions,
explanations and predictions in which the practice uses it, and this identification has grounds and can be revised.

**D6 Frame.** A body of **constitutive commitments**, with a declared **scope**, under which concepts have
determinate role profiles. A frame comprises:

1. its constitutive commitments;
2. the concepts whose role profiles it determines;
3. its admissible model types and measurement conventions;
4. its scope, the systems and conditions it claims to cover;
5. its relations to other frames.

**Criterion for constitutive commitments.** A commitment is constitutive in a practice if the practice's methods of
measurement, inference or record interpretation **presuppose it rather than test it**. Giving it up would leave
those methods without their warrant. This develops Reichenbach's distinction between principles of coordination and
empirical laws (Reichenbach, *The Theory of Relativity and A Priori Knowledge*, 1920), as revived in Friedman's
relativised a priori (*Dynamics of Reason*, 2001). Commitments that a practice's methods test are **accepted
contents**, however widely held or entrenched.

**Individuation of frames:**

- two bodies of commitments are **the same frame** if their constitutive commitments are equivalent and their scopes
  overlap;
- a frame that adds constitutive commitments to another is a **sub-frame**;
- frames that differ in a constitutive commitment are **distinct**.

**Role-relative answers.** Whether a commitment is presupposed or tested is a question about a practice, answered
with grounds from its methods, protocols and history. Because roles are relative to inquiries (D19), a commitment can
be presupposed by one method and tested by another. It is then constitutive for the frame of the methods that
presuppose it, and an accepted content elsewhere.

**Frames are adopted, not true.** A frame has no correctness condition of its own (3.4). A holder or community
**adopts** a frame for a scope. Adoption is a practical decision (5.11), with grounds that include the success of the
contents and models assessed within the frame. This follows Carnap's treatment of the choice of a framework as a
practical question (Carnap, "Empiricism, semantics, and ontology", 1950). Constitutive commitments are contents in
the presupposition role (D19). Within the frame they are not tested. Assessed from outside, they can turn out to
be false.

**Frame succession.** Because frames that differ in a constitutive commitment are distinct, revising a frame means
adopting a **successor frame**, linked to its predecessor by lineage (D15). The predecessor remains available and may
remain adopted for a narrower scope.

Frames are related by **intertheoretic mappings**: exact translations, approximate or limiting relations (classical
from relativistic mechanics as v/c → 0; Nickles, "Two concepts of intertheoretic reduction", 1973; Batterman, *The
Devil in the Details*, 2002) and partial alignments. A theory, a research programme, a measurement convention, a
disciplinary perspective and a commonsense background can each be a frame.

**D7 Model.** An item intended to represent a class of target systems, whose correctness is **fit**: it fits or
fails to fit targets, *in specified respects, to a specified degree, within a domain of application*. A model has:

- either a **structural** specification, with interpretable components (entity roles, occurrent roles, quantities),
  relations and constraints among them (laws, equations, mechanisms, rules) and parameters;
- or a **behavioural** specification only, a mapping from inputs to outputs, as in many learned models, whose
  internal components have no interpretation;
- marked idealisations and abstractions (section 4.1, Op7);
- a **domain of application**;
- the frame in which it is formulated.

Models may be mathematical, mechanistic, statistical, diagrammatic, material (a scale model, a model organism),
computational or learned. **A single observation or measured value is not a model.** It is a record (D11), and its
interpretation is a situated content (D10). A processed body of data *may* serve as a model of data, when it plays the
role of representing a target in an inquiry (D19; Suppes, "Models of data", 1962; Leonelli, "What distinguishes data
from models?", 2019).

**D8 Target.** What a representational item is about. It may be a particular system (this cell culture), a kind of
system (any dilute gas), or an **abstract structure** (the natural numbers, the class of polyhedra), for mathematical
contents and models. Concrete targets are delimited by boundaries, environment and the variables of interest.

**D9 Situation.** A delimited part of the world at a time, or over an interval, about which contents can be evaluated.
Situations are partial (Barwise and Perry, *Situations and Attitudes*, 1983).

**D10 Content.** An item composed from concepts (section 4.1), whose correctness is **truth**, possibly graded or
approximate. Its satisfaction condition is the situations, targets or structures under which it is true. Content
kinds include at least the following. The list is open (T11):

| Kind | True when | Example |
|---|---|---|
| **Situated** | a situation is as described | "sample S had temperature 293.2 ± 0.1 K at time t" |
| **General** | a regularity holds over a kind, population or structure (universal, statistical, generic, ceteris paribus; section 4.2) | "aqueous strong acids have pH < 7 at 25 °C"; "every planar map is four-colourable" |
| **Causal** | a causal relation holds at type or token level (5.5) | "this mutation reduces enzyme activity" |
| **Modal or dispositional** | a possibility, necessity or disposition obtains (4.8) | "this alloy is brittle below 150 K" |
| **Descriptive of an item** | an item meets its correctness condition, or has a property: fit, fidelity, reliability, conformance (T1) | "the logistic model fits this culture to within 5 %"; "this assay is reliable for serum samples" |
| **Evaluative** | an item meets a criterion relative to a goal (7.4) | "device D reaches efficiency ≥ 3.5 under condition C" |
| **Identity** | concepts stand in a relation of section 3.6.3 | "'expression' in paper P means protein level" |
| **Attribution** | a holder reports, holds or desires something (D14) | "source S reports X"; "the patient believes p" |
| **Relational-epistemic** | an evidential or explanatory relation holds (5.6, 5.8) | "Φ is evidence for H relative to B" |
| **Scope** | a target falls within an item's domain of application (6.4) | "this patient falls within the trial's domain" |

Being represented is not being asserted. A content is accepted only by a standing (T6).

**D11 Record.** An item produced by an observation, measurement, experiment, simulation or communication, whose
correctness is **fidelity** to its production event: accurate, complete, uncorrupted, with correct provenance.
Examples are a reading, an image, a sequence file, a field note and a published table. A record bears on the world
only through interpretation. Its interpretation is a content with standing (5.2). **"Data" is a role, not a kind:**
records, or items derived from them, are data when they serve as evidence in an inquiry (D19).

**D12 Standing.** The **epistemic** position of an item for a holder: attitude, support, holder, purpose, standard of
acceptance, time and scope (section 5.9). Any representational item can have standing, not only contents. A model is accepted as fitting
for a purpose. A method is accepted as reliable. A record is accepted as faithful.

**D13 Ground.** A reason bearing on a standing (epistemic ground, section 5.9) or on a decision (practical ground,
section 5.11), with its own standing in turn.

**D14 Holder.** An agent, group, community, source or the universe itself, to whom a standing, an attitude or a
decision is attributed. Two kinds of holder must be kept apart:

- the **universe's own** standings, and those of the holders on whose behalf it reasons;
- **attitudes of agents studied in the world**, such as participants' beliefs or a community's classification
  practices. These are attribution contents *about* the world. They are never standings of the universe, and they
  enter its standing only through an explicit adoption with grounds (section 6.1).

**D15 Lineage.** The relation between successive versions of a concept, frame, model or content. Each lineage link
records **which dimensions changed**: anchors, goals, extension, central connections. Named forms such as refinement,
generalisation or split are labels for common combinations. They are not mutually exclusive categories
(section 6.3).

**D16 Method and practice.** A method is a type of procedure whose correctness is **reliability or validity** for a
purpose under conditions. It has preconditions, assumptions, steps, outputs and known failure modes (chapter 7). A
practice is a structured, repeatable way of acting, partly tacit, whose correctness is **competent performance**.

**D17 Design.** An item that specifies an artefact, intervention or procedure that is to be brought about, with a
**world-to-item direction of fit**. It is correct when what is realised **conforms** to it. A design is not a model:
a model fails when the world does not fit it, while a realisation fails when it does not fit the design. Whether a
conforming realisation would achieve its goal is a separate content, of causal or model-based kind, with its own
standing (section 7.4). The distinction comes from Anscombe's shopping-list example (Anscombe, *Intention*, 1957). It
was systematised as direction of fit by Searle (*Intentionality*, 1983).

**D18 Goal, norm, value and decision.**

- A **goal** is an item made of a conative mode (*desired*, *intended*) held by an agent, together with a content
  that states what would satisfy it. It is satisfied when the world comes to match that content.
- A **norm** is an item made of a deontic mode (*required*, *permitted*, *forbidden*) and an issuing authority (a
  regulation, a standard, a protocol, a methodological rule), together with a content that states what complies. It
  is complied with or violated. Methodological standards, such as replication requirements or evidence thresholds,
  are norms of this kind.
- A **value** is a criterion, held by a holder, by which outcomes are ranked.
- A **decision** is a holder's choice of an action, design or frame. It rests on practical grounds (section 5.11).

None of these is true or false, and none is a standing. The contents that state their conditions, and contents
*about* them ("this norm is in force", "this standard is reliable"), are true or false.

**D19 Inquiry role.** Within an inquiry, an item may serve as **data or evidence**, **representation** of a target,
**instrument**, **procedure**, **standard**, **presupposition**, **goal** or **target**. Role is relative to the
inquiry. Kind is fixed by the correctness condition. The same item can play different roles in different inquiries:
a simulation output (a record) serves as data in a later study, and a dataset serves as a model of data. This
generalises the view that what counts as data or as a model depends on its role in inquiry (Leonelli, 2019).

## 3.4 Pluralism by correctness condition

| Kind of item | Direction of fit | Correct when | Standing typically concerns |
|---|---|---|---|
| **Content** (D10) | item to world | true, possibly to a degree or approximately, in the situation, target or structure | truth |
| **Model** (D7) | item to world | it fits targets in stated respects, to a stated degree, within its domain | fit |
| **Record** (D11) | item to its production event | it is a faithful trace of how it was produced | fidelity |
| **Method** (D16) | — (procedural) | it is reliable or valid for its purpose under its conditions | reliability, validity |
| **Practice** (D16) | — (procedural) | it is performed competently | competence |
| **Design** (D17) | world to item | the realisation conforms to it | adequacy of the design for its goal (a content); conformance of a realisation |
| **Goal** (D18) | world to item | the world comes to be as desired | — (conative, not epistemic) |
| **Norm** (D18) | world to item | conduct complies | validity and applicability of the norm (contents) |
| **Frame** (D6) | — | no correctness condition of its own; a frame is **adopted** for a scope, by a practical decision | the contents and models formulated in it; its constitutive commitments are contents in the presupposition role (D19) |

**Items and their contents.** Items other than contents often have a content as their *condition*. A goal's
satisfaction condition, a norm's compliance condition and a design's conformance condition are each given by a
content. The item is not that content. It adds a mode (desired, required, specified) and a direction of fit. This is
the distinction between psychological mode and propositional content (Searle, 1983). So goals, norms and designs are
not true or false, while the contents that state their conditions, and the contents that describe them, are.

**Why this pluralism rather than a reduction.** Section 2.8 compares the alternatives. In brief:

1. **Each kind is assessed by different methods and revised differently.** Truth of contents is assessed by evidence
   and inference. Fit of models by comparison in respects within domains. Fidelity of records by provenance and
   calibration. Reliability of methods by validation studies. Conformance of realisations by inspection. Reducing all
   of these to truth of statements would hide these differences in the predicates of the statements.
2. **The criterion is intended to be determinate.** The kind of an item is fixed by its correctness condition, not
   by choice. It is meant to remove the discretion of 1.0 over whether something was a "model" or a "content" (review of 1.0, `reviews/S0-1.0-critical-review.md`, section 2.1).
3. **Nothing is forced into another kind.** Observations are not models. Designs and goals are not contents. Opaque
   learned models are not decomposed into statements. Whether the criterion reduces discretion in practice is tested
   by FC6 (9.7.3).

**What this pluralism does not claim.** It does not claim greater *expressive power* than a well-built
statement-based representation. Every correctness condition can be described by a content (T1), so a
statement-based representation with contexts and provenance can express the same information at the meta-level
(review of 1.0, Part 3). The claim is semantic: different items are correct in different ways. **How items are stored or
encoded, including as statements, is a question for S1.** This settles open problem O18 of 1.0 (section 10.1).

## 3.5 Five planes: meaning, correctness, justification, acceptance, decision

| Plane | Question | Determined by | Not determined by |
|---|---|---|---|
| **Meaning** | What does the item say or require? | concepts' anchored roles, composition, frame (3.3, 4.1) | whether it is correct |
| **Correctness** | Is it true, does it fit, is it faithful, reliable, conformed to or satisfied? | the world, or the structure, together with the meaning | what anyone holds |
| **Justification** | What bears on its correctness? | grounds: records, inferences, evidence, testimony (5.7–5.9) | acceptance; grounds may be strong yet a holder may suspend judgement |
| **Acceptance** | Does a holder accept it, for what purpose, to what degree? | grounds weighed against **standards** of acceptance for the purpose (5.9, 5.10) | goals and values as evidence |
| **Practical decision** | What will a holder do or make? | accepted contents, including evaluative ones, together with goals, norms and values (5.11) | — |

Rules:

- **No plane settles another.** Meaning fixes correctness conditions, not correctness. Strong justification does not
  amount to acceptance without standards. Acceptance does not amount to a decision without goals.
- **No wishful thinking.** Goals, values and decisions are never grounds for accepting a content as true.
- **Values may set standards of acceptance.** Values can legitimately influence *how much* support is required for
  accepting a content for a purpose, the "inductive risk" role. They can never stand in for evidence (Douglas,
  *Science, Policy, and the Value-Free Ideal*, 2009). This indirect role must be represented explicitly, as part of
  the standard of acceptance, so it can be inspected.

## 3.6 Identity, change and relations between frames

### 3.6.1 Dimensions of continuity

When a concept *c* is revised into *c′*, or compared with a concept *d* of another frame, four dimensions are
assessed. Each assessment is itself a content with grounds.

| Dim. | Question | Evidence |
|---|---|---|
| **A Anchors** | Are the paradigm anchors retained? Which anchors are added or dropped? | the procedures, specimens, standards and descriptions in use |
| **G Goals** | Does the concept serve the same question types? Are any dropped or added? | the questions, explanations and predictions in which the practice uses the concept |
| **X Extension** | Do the extensions agree on paradigm cases, and over which domain? | classification of cases |
| **C Centrality** | Are the connections that change central or peripheral (D5)? | dependency structure in the frame |

**Anchor continuity.** A is *preserved* when the concept's paradigm anchors remain **jointly in force**. An anchor
remains in force if it is retained, or if it is replaced by an anchor that agrees with it on the cases it covered,
within stated uncertainty. This is the case when an artefact standard is replaced by a definition that fixes a
constant. Individual exemplars may be reclassified without breaking A, provided the anchors in force still pick out
the same body of paradigm cases. A is *broken* when no paradigm anchor remains in force, or when those in force pick
out a different body of paradigm cases.

**Goal continuity.** G is *preserved* when no goal is dropped or replaced. Added goals preserve G, because they are
new uses of the same concept. G is *broken* when a goal is dropped or replaced.

### 3.6.2 Criteria for outcomes of a change

The criteria below use **ordinal comparison and paradigm cases. They use no numerical thresholds.**

The rules apply **in this order**:

| Step | Condition | Outcome |
|---|---|---|
| 1 | A and G both broken | **New concept**, with lineage to *c* |
| 2 | Exactly one of A and G broken | **Indeterminate** between meaning change and new concept, naming the broken dimension |
| 3 | The evidence does not settle A or G | **Indeterminate (pending)**, stating the evidence that would settle it (3.6.5) |
| 4a | A and G preserved; contents added or removed, or only peripheral connections changed; extension unchanged | **New knowledge** about *c* |
| 4b | A and G preserved; extension settled on borderline cases only; no paradigm case reclassified | **Precisification** of *c*, a mild meaning change that leaves contents about clear cases intact |
| 4c | A and G preserved; central connections changed, or extension changed beyond borderline cases, including reclassification of individual paradigm cases | **Meaning change** of *c*: same concept, new version |

In a **split**, each successor is compared with the predecessor by the same rules. The rules apply to the lineage of a
concept within one frame and across frame succession (D6). Section 3.6.3 applies to concepts of frames that coexist.
When a concept in a successor frame is compared with its predecessor, section 3.6.2 gives the outcome and section
3.6.3 gives the relation between extensions.

The criteria are not a decision procedure that resolves every case. They make explicit **why** a case is resolved,
or why it is not. Disagreement between holders about such a case can be tested with the **verbal-dispute
diagnostic**. Replace the disputed term by its candidate meanings. If the disagreement disappears, it concerned
meaning, and it becomes a question of identity. If it persists, it concerned facts, and it becomes a disagreement
about contents (Chalmers, "Verbal disputes", 2011).

### 3.6.3 Relations between concepts of different frames

For *c* in *F1* and *d* in *F2*, the dimensions are compared over the domain the frames share. Each relation may be
stated relative to a domain of cases.

| Relation | Criterion (informal) |
|---|---|
| **Same concept, frame-relative roles** | shared paradigm anchors and goals, agreeing extension on the shared domain. Role profiles may differ by frame |
| **Co-referential, different concepts** | agreeing extension, different goals or anchors ("renate" and "cordate") |
| **Broader / narrower** | one extension includes the other, within the shared domain |
| **Overlapping / disjoint** | extensions intersect without inclusion / cannot intersect |
| **Lineage-related** | one descends from the other (D15) |
| **Homonymous** | only lexical anchors shared, and goals differ |
| **Indeterminate** | the dimensions conflict, or the evidence is insufficient |

Concepts of the *same* frame are compared in the same way. "Identical" then means the same concept recorded from two
sources: paradigm anchors, goals and extension coincide.

### 3.6.4 What follows from indeterminacy

Indeterminacy is not resolved by fiat. When a conclusion depends on an indeterminate identity, an indeterminate
reference or a vague concept, it is evaluated **under each admissible reading**:

- a conclusion that holds under every admissible reading is **reading-independent**;
- a conclusion whose correctness differs across readings is **reading-dependent**. It is marked as such, and its
  standing cannot exceed what the reading allows.

This is the supervaluationist treatment of vagueness (Fine, "Vagueness, truth and logic", 1975), applied to identity
and reference as well. **A vague concept is represented by its range of admissible precisifications.** Partial
reference (D3) is handled the same way: each candidate referent is an admissible reading.

### 3.6.5 Recognition

Recognition asks whether new material expresses a concept the universe already has. It applies the same dimensions to
the evidence available. That evidence is, from strongest to weakest:

1. shared operational anchors;
2. shared exemplar anchors;
3. shared deferential anchors;
4. structural congruence of central connections, tested by structure mapping (Gentner, "Structure-mapping: A
   theoretical framework for analogy", 1983);
5. shared goals, as shown by the questions in which the terms are used;
6. agreement of extension on known cases;
7. similarity of usage;
8. the same term, which is the weakest evidence.

Recognition is an inference with standing. When it cannot decide, the material is admitted as a **provisional
concept**, related to its candidates by "indeterminate" (M6, section 6.1). A provisional concept must state **what
evidence would resolve it**: which anchor, goal or extension comparison is missing. It is reassessed when such
evidence arrives. This is the guard against both premature merging and unbounded duplication.

## 3.7 What constitutes a meaning: summary

1. **Concepts** mean through role profile, anchors and goals (D2-a).
2. **Contents** mean through truth conditions fixed compositionally (D10, T5).
3. **Models** mean through their structural or behavioural specification together with their domain. Their meaning
   fixes which targets they could fit, and in which respects.
4. **Records** mean through their production event. Their bearing on the world comes through interpretation.
5. **Methods and practices** mean through their purpose, conditions and procedure.
6. **Designs, goals and norms** mean through what would satisfy them or conform to them.
7. **Sense and reference are both kept.** Co-referential concepts can differ in goals and anchors. Homonyms share
   only lexical anchors.

## 3.8 The ontological scaffold

The scaffold is the first frame: a small set of very general concepts with identity criteria. It is *revisable*
(T11), and the alternatives are discussed in section 2.4.

| Category | What it is | Identity and persistence | Typical properties |
|---|---|---|---|
| **Entity** (continuant) | something that persists through time and can change while remaining the same thing | kind-specific persistence conditions (a cell persists through growth but not through division) | qualities, dispositions, parts, locations |
| **Occurrent** | something that happens or unfolds in time | participants, time span, type | duration, rate, phase |
| — *Process* | an occurrent with no inherent end point, whose temporal parts are occurrents of the same type (diffusion, metabolism, erosion) (Mourelatos, "Events, processes, and states", 1978) | | rate, intensity |
| — *Event* | a countable occurrent with an inherent culmination or change of state (a mutation, an impact, a measurement act) | | time, location, outcome |
| — *Action* | an occurrent with an agent acting on an intention or decision (an intervention, a construction, an experiment) | agent, intention, time | outcome, conformance to plan |
| **State** | determinate values held by an entity or system over an interval | bearer, determinable, value, interval | stability |
| **Phenomenon** | a stable, reproducible feature of the world identified across occasions, usually inferred from many data (Bogen and Woodward, "Saving the phenomena", 1988) | pattern and conditions of occurrence | robustness, magnitude |
| **Property** | a determinate of a determinable (Johnson, *Logic, Part I*, 1921) | determinable and position in its value space | scale type, dimension |
| — *Quantity* | a determinable whose determinates admit measurement on a scale (4.7) | | dimension, unit, uncertainty |
| — *Disposition* | a property defined by manifestation under conditions (Mumford, *Dispositions*, 1998) | manifestation and stimulus conditions | manifestation probability |
| **Relation** / *Relator* | something holding between relata in roles; a relator has properties of its own (Guizzardi, 2005) | type and relata in roles | direction, strength |
| **Kind** | a concept whose extension shares projectible properties: natural, artefactual or conventional (Boyd, 1999, for natural kinds as property clusters) | meaning (D2-a) | |
| **Collection / population** | a plurality treated as a unit, with distributive, collective or statistical properties (Op3) | membership criteria | size, distribution |
| **System** | an entity or collection with organisation, boundary and environment | organisation and boundary | variables, dynamics |
| **Agent** | an entity that acts for goals: a researcher, a community, an institution, an organism (where a frame allows) | | goals, capabilities |
| **Artefact** | an entity made or used for a function (Houkes and Vermaas, *Technical Functions*, 2010) | | function, performance |
| **Abstract structure** | a mathematical or formal structure (a group, a graph, a probability space) | identity by structure | |
| **Information item** | an item about something: a record, a text, a model description, a design document | content and production | provenance, fidelity |

Remarks:

- **Continuants and occurrents are both basic.** Both process-first and thing-first descriptions are admissible in
  different frames (section 2.4, SC3), with explicit mappings between them.
- **Phenomena are items, not contents, and not data** (section 5.3). "The photoelectric effect occurs above a
  threshold frequency" is a general content *about* the phenomenon.
- **Representational items are also information items.** Contents, models, records, designs and methods exist in
  the world as texts, files or practices. They have authors, dates and provenance. This is how studied classification
  practices can act causally on the world, as in looping effects of human kinds.
- **The status of abstract structures** is not settled (O12). The universe only needs to represent their use as
  targets and in models.
- **New categories** can be added by scaffold revision (section 6.3). An example is the admission of fields as bearers
  of energy and momentum alongside bodies.
