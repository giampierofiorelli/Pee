# 3. The model of meaning

Requirements addressed: R1, R3, R4, R9, R11, R16, R18.

## 3.1 Overview

The proposal is **anchored-role semantics in a model-centred universe**. In one paragraph:

> The semantic universe is about the world as science investigates it. Its theoretical knowledge is carried mainly by
> **models** of **target systems**, built from **concepts** within **frames**. A concept's meaning is its **role** in
> a frame, split into a constitutive core and collateral connections, together with its **anchors**: the exemplars,
> procedures, descriptions, deferences and names that tie it to the world. Contents (claims about systems, states,
> regularities, causes, fits) are **composed** from concepts when needed, and their meaning is their satisfaction
> condition in situations or targets. How a content stands for some holder (observed, hypothesised, accepted,
> rejected) is a separate **standing**, always with **grounds**. The universe keeps its own **history**, so that
> revision, including revision of meaning, is recorded and never silent. Methods of inquiry are represented with the
> same apparatus as everything else.

## 3.2 Theses

- **T1 Model-centred content.** The primary bearers of theoretical content are models of target systems. Claims and
  propositions are derived contents, not the basic stock.
- **T2 Anchored role.** The meaning of a concept in a frame consists of its role in that frame (constitutive core
  plus collateral connections) and its anchors.
- **T3 Frame-relativity with graded identity.** Sameness of meaning is judged relative to frames, and it is graded:
  identity, equivalence, co-reference, overlap, lineage, difference or *undetermined*.
- **T4 Structured properties.** Properties are determinates of determinables with structured value spaces. Their
  scale types fix which comparisons and operations are meaningful.
- **T5 Systematic composition.** The meaning of a composite is fixed by the meanings of its parts, the mode of
  composition and the context. Departures from this are explicit and named (section 4.1).
- **T6 Separation of content and standing.** What is represented (content) is kept apart from how it is held
  (standing). Standing always has grounds and a holder.
- **T7 Explicit situatedness.** Every content is relative to a frame, and where relevant to a situation, a time, a
  perspective and conditions. Being context-free is a declared invariance, never a default.
- **T8 History is part of the universe.** Acquisitions and revisions are events in the universe with reasons. For
  any earlier time, it must be possible to say what was held, with what standing and why. This is needed to
  interpret older texts and data in their own frames (R3, R6), to trace revisions (R5) and to answer the
  competency questions of section 9.4. The required granularity of the retained history is a question for S1
  (O16). The semantic obligation is that no change of standing, concept or frame is silent.
- **T9 Local, graded coherence.** Coherence is required within frames and is assessed by explicit criteria.
  Conflict between frames, or between sources, is represented and contained, never allowed to spread to unrelated
  content.
- **T10 Reflexive methodology.** Methods of inquiry and learning are represented in the same universe and with the
  same apparatus as the phenomena they investigate. They can therefore be questioned, supported and revised.
- **T11 Openness.** No list of domain categories is closed. Only the meta-level notions D1–D16 are fixed by this
  specification. The ontological scaffold (section 3.7) is a revisable frame like any other.

## 3.3 Meta-level notions

The meta-level is the fixed vocabulary in which the universe is described. Everything else, including "entity",
"process" or "gene", is a concept *inside* the universe.

**D1 Semantic universe.** The totality of the items described below, their relations and their history. An *item*
is anything the universe can individuate and talk about: a concept, a frame, a model, a content, a record, a
standing, a method, an agent, and so on. Items are not data records. The word only marks "something
individuated".

**D2 Concept.** A unit of meaning that can apply to things, take values or relate things. Concepts include kinds
(electron, acid), determinables (mass, colour, fitness), relations (catalyses, is part of), occurrent types
(diffusion, speciation), and so on. A concept has a meaning (D2-a) and an extension (D3). Concepts are not words:
one term may express several concepts, and one concept may have many terms.

**D2-a Meaning of a concept.** For a concept *c* in frame *F*:

```
meaning_F(c) = ⟨ core_F(c), collateral_F(c), anchors(c) ⟩
```

- `core_F(c)` is the part of *c*'s role that is constitutive in *F* (D5).
- `collateral_F(c)` is the rest of its role in *F*.
- `anchors(c)` is the set of anchors (D4). Anchors belong to the concept rather than to a single frame, because
  they are what allows a concept to be tracked *across* frames.

**D3 Extension and reference.** The extension of *c* is what in the world satisfies *c*. Following the
treatment of theoretical terms by their role (Lewis, "How to define theoretical terms", 1970) and the
later "best deserver" idea (Lewis, "Putnam's paradox", 1984), the extension is
whatever best satisfies *c*'s anchors and constitutive core together. Three outcomes are possible, and all three must
be representable:

- **determinate reference**: one best satisfier, or one best class of satisfiers;
- **empty reference**: nothing satisfies the core and anchors well enough (for example caloric or phlogiston, read
  as substance concepts);
- **indeterminate reference**: several candidates satisfy them equally well. A known example is the claim that
  Newtonian "mass" partially denotes both relativistic mass and rest mass (Field, "Theory change and the
  indeterminacy of reference", 1973).

**D4 Anchor.** A link that ties a concept to the world independently of the concept's current role, so that the
concept can be tracked when its role changes. There are five types:

| Anchor type | Ties the concept to | Example |
|---|---|---|
| **Exemplar** | particular samples, specimens, cases or images taken as paradigmatic | a type specimen in biological nomenclature; a historical prototype standard |
| **Operational** | a procedure whose outcome settles whether the concept applies, or what value it takes | a titration; a calibrated thermometer reading; a standardised questionnaire |
| **Descriptive** | a description in terms of other anchored concepts | "whatever produces the observed galactic rotation curves" |
| **Deferential** | a community, standard or authority whose usage fixes the concept | an internationally agreed definition of a unit |
| **Lexical** | a term in a language and community | the word "acid" in chemistry |

Anchors differ in strength. **Lexical anchors are the weakest and never suffice for identity of meaning on their
own** (section 3.5). A concept may have several anchors, and they may diverge. Two thermometers built on different
principles may disagree outside their calibration range. Whether anchors agree is an empirical matter that the
universe represents, not a definitional fact it assumes (Chang, *Inventing Temperature*, 2004). A purely
theoretical concept may start with only descriptive anchors (section 6.1, mode M4).

Anchors are independent of *the concept's own* role, not of all frames. A descriptive anchor uses other concepts,
whose meanings depend on their own frames. Descriptive anchors are therefore weaker than exemplar, operational and
deferential anchors. A chain of descriptive anchors must end in anchors of those three types, or the concept is
anchored only within the conceptual system (O3).

A **descriptive anchor must state its category commitment**, for example "unseen *matter* that produces …" rather
than "whatever produces …". Without that commitment the concept would refer to whatever turns out to explain the
phenomenon, so it could never fail to refer, and a real scientific question would be hidden (E9, chapter 8).

**D5 Role.** The role of *c* in *F* is the set of *c*'s connections to other items in *F*:

- **constitutive** connections: principles of *F* that fix what *c* is within *F*. In classical mechanics, for
  example, the second law partly constitutes force and inertial mass.
- **structural** connections: the positions *c* occupies in *F*'s model types, such as variable, parameter,
  conserved quantity, participant role or component.
- **inferential** connections: what follows within *F* from applying *c*.
- **measurement** connections: how values or applications of *c* are determined within *F*.
- **explanatory** connections: what *c* is used to explain, and what explains it.

The split between core and collateral is **relative to the frame and revisable**. This answers the holism
objection (section 2.2, A3) without restoring a fixed analytic/synthetic distinction. Quine argued that no statement
is immune to revision (Quine, "Two dogmas of empiricism", 1951). The model agrees: core connections can be revised,
but revising them is a *change of frame* and is recorded as such. Within a frame, the core gives meanings the
stability needed to share and compose them. This follows the idea of a constitutive a priori that is relative to a
framework (Friedman, *Dynamics of Reason*, 2001; Carnap, "Empiricism, semantics, and ontology", 1950).

**D6 Frame.** A coherent body of presuppositions under which concepts have determinate roles. A frame comprises:

1. its concepts;
2. its constitutive principles;
3. its admissible model types;
4. its measurement conventions and scale choices;
5. its background assumptions;
6. its declared **scope**, the range of systems and conditions it claims to cover;
7. its relations to other frames.

Frames may be specialised (a sub-frame adds principles), combined (when their concepts can be aligned) or related by
**intertheoretic mappings**. Such mappings include exact translations, approximate or limiting relations (for
example, classical from relativistic mechanics as v/c → 0; Nickles, "Two concepts of intertheoretic reduction",
1973; Batterman, *The Devil in the Details*, 2002) and partial alignments. A theory, a research programme, a
measurement convention, a disciplinary perspective and a commonsense background are all frames at different scales.
Frames are items: they are acquired, compared, assessed and revised.

**D7 Model.** A structure intended to represent a class of target systems. A model has:

- components: entity roles, occurrent roles and quantities;
- relations and constraints among them, such as laws, equations, mechanisms or rules;
- parameters;
- idealisations and abstractions, explicitly marked (section 4.1, operation Op7);
- a **domain of application**, the conditions under which it is meant to apply;
- the frame in which it is formulated.

Models can be mathematical, mechanistic, statistical, diagrammatic, material (a scale model, a model organism) or
computational. A model is not true or false. It **fits** or fails to fit a target, *in specified respects and to a
specified degree*.

*Degenerate models.* A single measured fact is a model with one target and one quantity, and with the measurement
conditions as its domain of application. One example is the boiling temperature of a water sample at a given
pressure. Treating it this way costs little: the measurement conditions must be stated anyway (T7).

**D8 Target system.** The part of the world a model is about: a particular system (this cell culture, this galaxy)
or a kind of system (any dilute gas, any predator–prey community). Targets are delimited by boundaries, environment
and the variables of interest.

**D9 Situation.** A delimited part of the world at a time, or over an interval, about which contents can be
evaluated. Situations are partial: a content about a situation says nothing about what lies outside it (Barwise and
Perry, *Situations and Attitudes*, 1983).

**D10 Content.** A composite of concepts and items, formed by the composition operations of section 4.1, that has a
**satisfaction condition**: the situations, targets or model–target relations under which it holds, possibly to a
degree. Content kinds include at least the following. The list is open (T11):

| Kind | Satisfied when | Example |
|---|---|---|
| **Situated** | a situation is as described | "sample S had temperature 293.2 ± 0.1 K at time t" |
| **General** | a regularity holds over a kind or population. It is universal, statistical, generic or ceteris paribus (section 4.2) | "aqueous strong acids have pH < 7 at 25 °C" |
| **Fit** | a model represents a target in given respects within a given tolerance (Giere's "theoretical hypothesis") | "the logistic model fits this yeast culture's growth to within 5 %" |
| **Causal** | a causal relation holds at type or token level (section 5.5) | "this mutation reduces enzyme activity" |
| **Modal or dispositional** | a possibility, necessity or disposition obtains (section 4.8) | "this alloy is brittle below 150 K" |
| **Methodological** | a method has a given property for given purposes under given conditions (chapter 7) | "randomisation blocks confounding by unmeasured covariates in expectation" |
| **Evaluative** | an item meets a criterion relative to a goal (chapter 7) | "device D reaches efficiency ≥ 3.5 under test condition C" |
| **Identity** | two concepts or items stand in a relation of section 3.5.1 | "'expression' in paper P means protein level" |
| **Attribution** | a holder reports or holds a content (6.1) | "source S reports X under method M" |
| **Relational-epistemic** | an evidential or explanatory relation holds (5.6, 5.8) | "phenomenon Φ is evidence for H relative to B"; "mechanism K explains Φ" |
| **Scope** | a target falls within a model's domain of application (6.4) | "this patient falls within the trial's domain" |

Question presuppositions (7.2) are contents of these kinds.

Contents do not hold or fail to hold because they are *in* the universe. Being represented is not the same as
being asserted (T6).

**D11 Record.** A durable trace produced by an observation, measurement, experiment, simulation or communication:
for example a reading, an image, a sequence file, a field note or a published table. Records are about their
production event first and about the world only through interpretation (section 5.2). A text is a record whose
interpretation yields contents.

**D12 Standing.** The epistemic position of a content (or model, method or frame) for a holder at a time. Standing
has several dimensions and is defined in section 5.9.

**D13 Ground.** A reason on which a standing rests, such as an observation, an inference, testimony, a definition or
a methodological presupposition, with its own standing in turn (section 5.9).

**D14 Holder.** An agent, group, community, source or the universe itself, *as a holder*, to whom a standing is
attributed. Keeping holders explicit lets the universe represent disagreement without contradiction: "community
A accepts *p*, community B rejects *p*" is coherent.

**D15 Lineage.** The relation between successive versions of a concept, frame, model or content across revisions.
Its forms are refinement, generalisation, specialisation, split, merger, replacement and elimination (section 6.3).

**D16 Practice and method.** A practice is a structured, repeatable way of acting in inquiry. A method is a type of
procedure, with purposes, preconditions, assumptions, steps, outputs and known failure modes (chapter 7). Practices
and methods are items: they can be the subject of content, standing and revision (T10).

## 3.4 What constitutes a meaning

Combining the above:

1. **Concepts** have meaning through anchored role (D2-a). The anchor component explains how a concept is about the
   world and how it can be tracked across theory change. The role component explains how it is connected,
   inferentially productive and learnable from its place in a theory.
2. **Contents** have meaning through satisfaction conditions in situations or targets (D10), which are fixed
   compositionally (T5) from the meanings of their concepts.
3. **Models** have meaning through the meanings of their components, together with their stated domain of
   application. The meaning of a model fixes *which targets it could fit, in which respects*. It does not settle
   whether it does fit them.
4. **Records** have meaning through their production event, including instrument, protocol, conditions and holder,
   together with an interpretation that is itself a content with standing.
5. **Sense and reference are both kept.** Two concepts may be co-extensive but differ in role, as with "renate" (having
   kidneys) and "cordate" (having a heart) in the classic example. Two concepts may also share a lexical anchor but differ in extension, as with
   "power" in physics and in statistics. The model represents both situations.
6. **Meaning is relative to a frame, but not trapped in it.** Anchors are shared across frames, and intertheoretic
   mappings (D6) relate roles. Together they make it possible to compare meanings across frames, even when the
   comparison returns "partly the same" or "undetermined".

## 3.5 How meaning is identified

There are two problems. **Individuation** asks when two concepts or contents in the universe are the same.
**Recognition** asks when new material, such as a text, a dataset or a statement by an expert, expresses a meaning
the universe already has.

### 3.5.1 Relations between meanings

For concepts *c1* (frame *F1*) and *c2* (frame *F2*), the universe must be able to represent each of the following
relations, together with the grounds for it:

| Relation | Condition (informal) |
|---|---|
| **Identical** | same meaning in every frame where either occurs: inter-derivable cores in each such frame, the same anchors and the same extension. Typically one concept acquired twice from different sources |
| **Equivalent in F** | in frame *F* their cores are inter-derivable and their anchors coincide |
| **Co-referential** | same extension (by shared anchors or by evidence) but different roles |
| **Broader / narrower** | the extension of one includes the other's, within a stated frame |
| **Overlapping** | extensions intersect, and neither includes the other |
| **Disjoint** | extensions cannot intersect, within a stated frame |
| **Lineage-related** | one is a revision of the other (refinement, split, merger, …; D15) |
| **Homonymous** | same lexical anchor, unrelated meanings |
| **Undetermined** | the evidence does not settle the relation |

Each relation may be stated **relative to a domain of cases**. For example, two temperature concepts can be
co-referential on equilibrium ideal-gas systems and diverge elsewhere (E1, chapter 8). A relation stated without a
domain claims to hold across all cases.

"Undetermined" is a legitimate, recorded outcome, not a failure. Forcing a decision when the evidence does not
support one is a coherence violation (C11, section 6.5).

### 3.5.2 Evidence for recognition

Evidence that two expressions share a meaning, from strongest to weakest:

1. **Shared operational anchors.** The same procedure determines the concept's application, with the same scale
   and the same reference standards.
2. **Shared exemplar anchors.** The same paradigm cases, specimens or reference samples.
3. **Shared deferential anchors.** The same standard, authority or community definition.
4. **Structural congruence of role.** The concepts occupy corresponding positions in models with matching
   structure. For example, both are conserved quantities appearing in balance equations of the same form. This is
   tested by structure mapping, which aligns relations as well as attributes (Gentner, "Structure-mapping: A
   theoretical framework for analogy", 1983).
5. **Agreement of extension** on cases already known.
6. **Similarity of usage** in texts (distributional evidence; section 2.2, A7).
7. **Same term.** This is the weakest evidence. Many scientific terms are homonyms across fields: "significance",
   "power", "fitness", "stress", "model".

Recognition is an **inference with standing**, not a lookup. Its result is a relation from 3.5.1, with grounds and a
degree of support. It can be revised. When recognition cannot reach a decision, the new material is admitted as a
*provisional concept* linked to its candidates by "undetermined" (mode M6, section 6.1). This is how the universe
can both **recognise** known knowledge (R9) and **learn** new concepts (R8) without merging them prematurely.

## 3.6 Why this is not an assertion-based model

The mission forbids presupposing a model based on assertions. A reviewer could object that standing, grounds,
coherence and revision all act on contents, so the model is assertions with metadata after all. Three features
answer this objection, and one part of it remains open.

1. **Standing, revision and coherence apply to non-propositional items directly.**
   - A *model* can be accepted for a purpose and domain, or revised at level L3, without any sentence being
     asserted.
   - A *method* has a reliability standing (7.3).
   - A *record* has a standing of integrity, for example "contaminated", "valid" or "superseded by recalibration".
   - A *frame* is adopted or abandoned (L5).
   - Coherence criteria C2, C3, C6 and C8 constrain concepts, models and uses of models, not sentences.
2. **One model yields indefinitely many contents.** The universe does not hold the list of these contents. It holds
   the model, and forms contents when a question needs them (D10). Accepting a model is not equivalent to accepting
   a finite set of sentences, because the model's fit is qualified by respects, degree and domain.
3. **Concepts have meaning before any content is asserted.** Anchors and roles give meaning independently of which
   contents are held.

**What remains open.** Whether every standing on a model can be faithfully re-expressed as standing on a set of fit
contents is not settled. If it can, the difference from an assertion-based model is one of organisation and
economy, not of expressive power. This is tested by the comparison with rival P2 (V6) and recorded as O18.

## 3.7 The ontological scaffold

The scaffold is the first frame: a small set of very general concepts with identity criteria. It is *revisable*
(T11). It exists so that recognition, composition and coherence checking have something to work with. The choice of
these categories is defended in section 2.4, and the categories are tested in chapter 8.

| Category | What it is | Identity and persistence | Typical properties |
|---|---|---|---|
| **Entity** (continuant) | something that persists through time and can change while remaining the same thing: an electron, a cell, a mountain, an instrument, an organism | identity criteria depend on the kind. Persistence through change is governed by kind-specific conditions (e.g. a cell persists through growth but not through division) | qualities, dispositions, parts, locations |
| **Occurrent** | something that happens or unfolds in time | identity by participants, time span and type | duration, rate, phase, participants |
| — *Process* | an occurrent with no inherent end point, whose temporal parts are occurrents of the same type (diffusion, metabolism, erosion). It can be measured while it runs (Mourelatos, "Events, processes, and states", 1978) | | rate, intensity |
| — *Event* | a countable occurrent with an inherent culmination or change of state: a mutation, an impact, a phase transition, a measurement act | | time, location, outcome |
| **State** | the holding of determinate values by an entity or system over an interval | identity by bearer, determinable, value and interval | stability, duration |
| **Phenomenon** | a stable, reproducible feature of the world, identified across occasions and usually inferred from many data: superconductivity, the photoelectric effect, circadian rhythm, the placebo response | identity by the pattern and its conditions of occurrence, not by any single occasion (Bogen and Woodward, "Saving the phenomena", 1988) | conditions of occurrence, robustness, magnitude |
| **Property** | a way something is, a determinate of a determinable (Johnson, *Logic, Part I*, 1921). Bearers include entities, occurrents, relations and systems | identity by determinable and position in its value space | scale type, dimension |
| — *Quantity* | a determinable whose determinates admit measurement on a scale (section 4.7) | | dimension, unit, uncertainty |
| — *Disposition* | a property defined by what would occur under manifestation conditions: solubility, fragility, half-life, infectivity (Mumford, *Dispositions*, 1998) | identity by its manifestation and stimulus conditions | manifestation probability |
| **Relation** | something that holds between several relata, each in a role: catalyses(enzyme, reaction), orbits(body, centre) | identity by type and relata-in-roles | direction, strength, duration |
| — *Relator* | a relation treated as an item with properties of its own: a chemical bond with a length and energy, a symbiosis with a duration (Guizzardi, *Ontological Foundations for Structural Conceptual Models*, 2005) | | |
| **Kind** | a concept whose extension is a class of things sharing projectible properties. Kinds may be natural (often clusters of properties maintained by underlying mechanisms; Boyd, "Homeostasis, species, and higher taxa", 1999), artefactual (defined by function) or conventional | identity by meaning (D2-a) | |
| **Collection and population** | a plurality treated as a unit, with properties that may be distributive, collective or statistical (section 4.1, Op3) | identity by membership criteria, not fixed membership | size, distribution, composition |
| **System** | an entity or collection considered with its internal organisation, boundaries and environment | identity by organisation and boundary criteria | variables, states, dynamics |
| **Information item** | an item that is *about* something: a record, a text, a model description, an image | identity by content and by production | provenance, fidelity |
| **Agent** | an entity that acts for goals: a researcher, a community, an institution, an organism (in a frame that permits it) | | goals, capabilities, standing |
| **Artefact** | an entity made or used for a function (Houkes and Vermaas, *Technical Functions*, 2010) | | function, performance |
| **Abstract structure** | a mathematical or formal structure used in models: a group, a differential equation, a probability space | identity by structure | |

Remarks:

- **Continuants and occurrents are both basic.** A process may be described as the history of a continuant ("the
  cell divided"), or a continuant as a stabilised process ("a vortex", "a flame", "an organism as metabolic
  flow"). Both descriptions are admissible in different frames (section 2.4, SC3). The universe records which
  description a frame uses, and how they map onto each other.
- **Phenomena are items, not contents.** The photoelectric effect is a pattern in the world. "The photoelectric
  effect occurs above a threshold frequency" is a general content (4.2) *about* that phenomenon.
- **Phenomena are not data.** Data are records of particular occasions. Phenomena are stable features inferred from
  data. This distinction is central to R13 (section 5.3).
- **The status of abstract structures** (realist, fictionalist or structuralist) is not settled here (O12). The
  universe only needs to represent their use in models.
- **New categories** can be added, and existing ones split or merged, by scaffold revision (section 6.3), the
  deepest level of revision. One historical example is the admission of fields as bearers of energy and momentum in their own right, not merely
as descriptions of forces between bodies. A scaffold limited to bodies and their qualities would have had to be
revised for this.
