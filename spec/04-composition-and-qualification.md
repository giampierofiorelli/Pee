# 4. Composition and qualification

Requirements addressed: R3, R12, R19. Composition is how contents and models are built from concepts. Qualification
is how they are made relative to generality, context, time, change, conditions, quantity, possibility, uncertainty
and negation.

## 4.1 Composition operations

The universe composes meanings by a small set of operations. They are semantic operations, not syntax: they say
how the meaning of the composite depends on the meanings of its parts.

**Op1 Role filling.** A relational concept or an occurrent type has argument roles, and filling them yields a
content. Occurrents are treated as items with participants in roles, so further participants and modifiers can be
added without changing the occurrent's identity. This follows event semantics (Davidson, "The logical form of action
sentences", 1967; Parsons, *Events in the Semantics of English*, 1990). In the sketch below, the agent role is
generalised to *catalyst*:

```
⟨ occurrent: hydrolysis#1  type: hydrolysis
  catalyst: enzyme E   substrate: compound S   medium: buffer B   time: interval t ⟩
```

**Op2 Restriction and modification.** A modifier narrows or transforms a concept. Four cases must be distinguished
(Kamp and Partee, "Prototype theory and compositionality", 1995):

- **intersective** modifiers: "aqueous solution" is a solution that is aqueous;
- **subsective** modifiers: "large bacterium" is large *for a bacterium*. The comparison class is explicit, and in a
  property space the modifier picks a region relative to that class;
- **privative or non-factive** modifiers: "putative gene", "virtual particle", "fake fossil", "former
  species". The result is *not* a subtype of the head concept, so composition must not infer "is a gene" from
  "putative gene";
- **frame-shifting** modifiers: "effective mass" (solid-state physics), "apparent magnitude". These introduce a
  concept defined in a different frame, linked to the head concept by an explicit mapping.

**Op3 Plurality and aggregation.** Content about pluralities must say which reading it has:

- **distributive**: each member has the property ("each cell expresses GFP");
- **collective**: the plurality as a whole has it ("the colony forms a biofilm");
- **statistical**: a distribution parameter has it ("mean body mass of the population is 4.2 kg";
  "prevalence is 3 %").

*Mereological composition* (Simons, *Parts*, 1987) builds wholes from parts with explicit parthood relations:
component, portion, member, stage or phase. Properties of a whole that are not aggregates of its parts' properties
(for example temperature as a property of an ensemble, or the viscosity of a fluid) are recorded as properties of the
whole. Whether and how they depend on the parts is a separate, explicit content (section 5.5 and open problem O9).

**Op4 Generalisation.** This forms general contents over kinds or populations. Its forms are distinguished in
section 4.2.

**Op5 Quantity composition.** This forms derived quantities from base quantities: density from mass and volume,
reaction rate from concentration and time. Two constraints apply (section 4.7):

- **dimensional homogeneity**: only quantities of the same dimension can be added or compared;
- **meaningfulness**: a composite statement is meaningful only if its truth is invariant under the admissible
  transformations of its scales (Krantz, Luce, Suppes and Tversky, *Foundations of Measurement*, Vol. I, 1971).

**Op6 Situating.** This attaches contextual parameters to a content: frame, situation, time, place, perspective and
conditions (sections 4.3 to 4.6).

**Op7 Abstraction and idealisation.** This builds models that depart deliberately from their targets.
**Abstraction** leaves features out (a planetary model ignores the planets' chemistry). **Idealisation**
distorts features (point masses, frictionless planes, infinite populations, perfectly rational agents). Idealisations
come in three kinds (Weisberg, "Three kinds of idealization", 2007): Galilean idealisation, made for tractability
and meant to be removed; minimalist idealisation, which isolates the core factors; and multiple-model idealisation.
Idealisations must be marked, because contents derived from an idealised model inherit a **fit limitation**: they
may be relied on only in the respects and to the degree the idealisation allows (Cartwright, *How the Laws of
Physics Lie*, 1983; Cartwright, *Nature's Capacities and their Measurement*, 1989).

**Op8 Model composition.** This combines models by coupling (shared variables), nesting (one model gives a
parameter of another) or multi-scale linking (a micro-model gives a constitutive relation for a macro-model).
Composition is admissible only if the shared components are recognised as the same concept (section 3.6), their
frames are compatible or explicitly mapped, and their domains of application overlap on the coupled region. Where
recognition is indeterminate, the composition is evaluated under each reading and marked as dependent on the reading
(3.6.4).

**Op9 Embedding.** This places a content under an operator: negation (4.10), modality (4.8), conditional (4.6),
or an attitude ascribed to a holder ("H hypothesises that …"). Such embedding forms an **attribution content** about
the holder (D10, D14). It is never the universe's own standing, which is not part of any content (T6). Inside
attitude contexts, substitution of
co-referential concepts is **not** valid in general. Someone may hypothesise that the morning star is a planet
without hypothesising that the evening star is (Frege, 1892). The universe must preserve such opacity.

**Op10 Lexicalisation.** A composite becomes a new concept with its own anchors and role: "black hole", "dark
matter", "big bang", "natural selection". The new concept keeps a lineage link to its components, but its meaning is
**not** the composition of their meanings. A black hole is not a hole, and dark matter may not be "matter" in an
earlier sense.

### Compositionality: what holds and what does not

**Principle (T5).** The meaning of a composite is fixed by the meanings of its parts, the operations applied and the
context parameters (Partee, "Compositionality", 1984). Four apparent exceptions are handled explicitly:

1. **Context dependence** is not an exception. Context is a parameter of composition (Op6).
2. **Typicality does not compose**, as the "pet fish" case shows. Typicality is part of a concept's exemplar
   anchoring, not of its central connections, so composing role profiles remains systematic while typical features of composites must be
   learned or inferred separately.
3. **Lexicalised composites** (Op10) are new concepts and are not decomposed.
4. **Emergence** concerns the world, not meaning. That a whole has properties not predictable from its parts does
   not make the *meaning* of "property of the whole" non-compositional.

## 4.2 Generality

General contents (Op4) come in distinct forms, which must not be merged:

| Form | Example | Satisfaction condition (informal) |
|---|---|---|
| **Strict universal** | "every electron has charge −e" | no exception within the frame's scope |
| **Statistical** | "40 % of patients respond" | a frequency or probability parameter of a population, with uncertainty |
| **Generic** | "mosquitoes transmit malaria" | a characteristic, often mechanism-backed tendency of the kind, which may hold of only a minority of members (Carlson and Pelletier (eds.), *The Generic Book*, 1995) |
| **Typicality** | "birds fly" | true of typical members, defeasible for atypical ones |
| **Ceteris paribus** | "demand falls as price rises" | holds in the absence of interfering factors, some named and the rest left open (section 4.6) |
| **Idealised law** | "PV = nRT" | holds exactly in an idealised model, and approximately for targets within a stated regime (Op7) |
| **Functional dependency** | "rate doubles per 10 K" | a quantitative relation over a domain of application |

Many disputes in science, and many misreadings of science, come from merging these forms. One example is reading a
generic as a universal. Another is reading a population-level statistical content as a claim about each
individual. The universe must keep the form explicit.

## 4.3 Context

A context is the set of parameters relative to which a content is formed and evaluated. The universe distinguishes
six kinds:

1. **Frame** (D6): which theory, convention or perspective gives the concepts their roles.
2. **Situation** (D9): which part of the world is in question.
3. **Indexical parameters**: the time, place and holder of an utterance or record. These are needed to interpret
   expressions such as "now", "here" or "our sample" (Kaplan, "Demonstratives", 1989).
4. **Reference frames in the physical sense**: coordinate systems, rest frames and gauge choices. Some quantities
   (velocity, simultaneity, electric versus magnetic field) are relative to these.
5. **Level and scale of description**: molecular, cellular, organismal or ecological; micro or macro. The same
   target can be modelled at several levels, and the relations between levels are explicit contents.
6. **Perspective of a holder**: whose standing, interests or classification is in force (D14).

**Rules.**

- **No content without context (T7).** A content whose context is unknown is admitted with its context marked
  "unspecified", and this incompleteness is recorded.
- **Lifting.** A content holding in context *k1* may be carried to *k2* only through an explicit mapping, such as a
  frame translation, a coordinate transformation or a level-bridging relation. This follows the treatment of
  contexts as first-class objects with lifting rules (McCarthy, "Notes on formalizing context", 1993; Guha,
  *Contexts: A Formalization and Some Applications*, 1991).
- **Declared invariance.** A content is *context-independent in some respect* only if its invariance under the
  relevant transformations is itself a represented content, as with Lorentz invariance or independence of
  measurement method.

## 4.4 Time

- **World time and record time are distinct.** World time is when something holds or happens. Record time is when
  the universe, or a holder, came to represent or hold it. "The Cretaceous ended about 66 million years ago" has a
  world time in deep time and a record time in recent decades.
- **Time is a quantity in a frame.** Dates and durations are values relative to a time scale and a reference frame.
  In relativistic frames, simultaneity is relative to a frame of reference. The universe must not assume a single
  absolute time.
- **Temporal relations between occurrents and intervals** (before, meets, overlaps, during, starts, finishes, equals
  and their converses; Allen, "Maintaining knowledge about temporal intervals", 1983) are representable when exact
  dates are unknown. This is essential for historical sciences.
- **Granularity and uncertainty of times**: "late Jurassic", "within minutes of injection", "66.0 ± 0.1 Ma".
- **Timeless and time-indexed contents**: general laws in a frame are not indexed to a time, but states are.
  Phenomena hold under conditions, and those conditions may include epochs, as with the cosmological constancy of
  constants, which is itself a content that can be tested.
- **Periodicity and dynamics**: cycles, rhythms and rates are properties of processes (section 4.5).

## 4.5 Change

Change in the world is represented in three complementary ways, because different sciences need different ones:

1. **State difference.** An entity or system has different determinates of a determinable at different times. This
   is the "at-at" view: change is having one value at one time and another at another.
2. **Process with rate.** Change is an ongoing occurrent with its own properties: rate, acceleration, direction,
   mechanism. This view is required when the rate itself is the object of study, as in kinetics or erosion.
3. **Event as transition.** Change is a bounded occurrent that takes a system from one state to another: a phase
   transition, a mutation, a speciation event.

The universe must also represent:

- **Change of kind**: metamorphosis, phase change, a star becoming a white dwarf. Whether the entity persists through
  the change depends on the kind's persistence criteria (section 3.8).
- **Change affecting identity**: fission (cell division), fusion (cell fusion, merger of galaxies), gradual
  replacement (turnover of molecules in an organism). The universe must represent the lineage relations among the
  entities involved, not force a single persisting identity.
- **Stasis as a result**: no change, or equilibrium, is a content with its own grounds, not the mere absence of
  change records (section 4.10).

**Change in the world must never be confused with change in the universe.** "The population declined" (world)
differs from "the estimate of the population was revised downward" (universe). Chapter 6 covers the second kind.

## 4.6 Conditions

Conditions appear in five distinct roles:

1. **Domain of application of a model**: the range of systems and circumstances for which the model is meant to
   fit. Examples are Newtonian mechanics for speeds much lower than *c* and outside strong gravitational fields, or
   Hagen–Poiseuille flow for laminar regimes. Domains are often regions in a space of dimensionless quantities, such
   as the Reynolds number. Dimensional analysis (Buckingham, "On physically similar systems", 1914) gives a
   principled way to state when two systems are in the same regime.
2. **Boundary and initial conditions**: inputs that make a general model specific to a target.
3. **Manifestation conditions of dispositions**: "soluble" means it dissolves *if placed in water under standard
   conditions*.
4. **Ceteris paribus conditions**: general contents that hold only in the absence of disturbing factors. The
   universe records the **named disturbing factors** and an **open remainder**. Ceteris paribus contents are not
   treated as vacuous, but their open remainder lowers what can be inferred from them (Cartwright, 1983; Earman,
   Roberts and Smith, "Ceteris paribus lost", 2002).
5. **Conditional contents**, which come in four kinds:
   - **indicative**: "if the sample is pure, its melting point is 122 °C";
   - **counterfactual**: "had the dam not been built, the delta would have grown". These are evaluated by the
     closeness of alternatives to actuality (Lewis, *Counterfactuals*, 1973);
   - **interventional**: "if we set X to x, Y will be y". These are evaluated by modifying a causal model
     (Pearl, *Causality*, 2nd ed., 2009);
   - **material implication**, used only within formal derivations, never as a reading of scientific "if".

## 4.7 Quantities

Quantities follow the international metrological vocabulary (JCGM 200:2012, *International Vocabulary of
Metrology*, 3rd ed.) and the theory of measurement (Krantz and others, 1971; Mari, Wilson and Maul, *Measurement
Across the Sciences*, 2021).

- **Kind of quantity** (a determinable): length, mass, temperature, concentration, reaction time, IQ-scale
  intelligence.
- **Individual quantity**: the mass *of this sample*. Its bearer, kind and value are distinct.
- **Value**: a number with a reference, usually a unit, plus an uncertainty (JCGM 100:2008, *Guide to the Expression
  of Uncertainty in Measurement*). A value is not the quantity. The same quantity has different values in different
  units.
- **Dimension**: the expression of a kind of quantity in base dimensions. It constrains composition (Op5).
- **Scale type** (Stevens, "On the theory of scales of measurement", 1946):
  - nominal and ordinal scales (for example Mohs hardness and pain scales) license equality and order only;
  - interval scales (Celsius temperature) license differences but not ratios;
  - ratio scales (mass, thermodynamic temperature) license ratios;
  - absolute scales (counts) license everything.

  Saying "20 °C is twice as warm as 10 °C" is meaningless, and the universe must be able to detect this.
- **Logarithmic and non-linear quantities** (pH, decibels, magnitudes) restrict the admissible operations.
- **Vector, tensor and field quantities, and distributions as values**, are representable. Examples are a velocity
  field, a stress tensor and a body-size distribution.
- **Latent quantities**: some quantities are not directly measurable and are inferred from indicators. Examples are
  general intelligence, working-memory capacity and market risk. Whether such a quantity exists, and whether its
  measures are valid, is itself a content with standing (Cronbach and Meehl, "Construct validity in psychological
  tests", 1955; Borsboom, *Measuring the Mind*, 2005).
- **Defined constants and units**: since the 2019 revision, SI units are defined by fixing the numerical values of
  constants (BIPM, *The International System of Units*, 9th ed., 2019). The universe must represent such
  **changes of definition**. Each is a change of the operational and deferential anchors of a unit that is designed
  to preserve the unit's extension within measurement uncertainty (section 6.3).

## 4.8 Possibility and necessity

The universe distinguishes kinds of modality, which ordinary language merges in words like "can", "may" and "must":

| Modality | "Possible" means | Example |
|---|---|---|
| **Logical / mathematical** | consistent with logic and mathematics | "a group of order 6 can be non-abelian" |
| **Nomological** (relative to a frame) | consistent with the frame's laws and constitutive principles | "a perpetual motion machine of the second kind is impossible in thermodynamics" |
| **Dispositional / causal** | within the powers of a system under manifestation conditions | "this virus can infect human cells" |
| **Chance** | has non-zero objective probability in a stochastic model | "this nucleus may decay within the next second" |
| **Technical feasibility** | achievable with available or foreseeable means | "the material can be produced at scale" |
| **Epistemic** (relative to a holder) | compatible with what the holder accepts | "the culprit may be contamination" |
| **Deontic / normative** (relative to a norm and its authority) | permitted or required by a regulation, standard or protocol | "the device must not exceed the noise limit"; "the protocol permits unblinding after interim analysis" |

Rules:

- Nomological possibility is **relative to a frame**, because different frames have different laws.
- **Deontic modality belongs to norms.** It is the mode of a norm (D18), relative to the norm and the authority behind
  it. Contents can describe what a norm requires. It is never a statement about what is physically possible.
- **Epistemic modality is a feature of standing, not of content** (section 4.11). "It may be contamination" says that
  the holder has not excluded the contamination hypothesis. It does not say that contamination is a disposition of
  the sample.
- Possible-worlds semantics (section 2.2, A2) is one admissible way of giving satisfaction conditions for nomological
  and counterfactual contents. Dispositional accounts are another. S0 does not choose between them (O12 covers
  related questions of status).

## 4.9 Uncertainty

Uncertainty is not one thing. The universe must keep the following kinds apart, and must attach each to the specific
component of a content or model that it concerns.

| Kind | Where it sits | Example |
|---|---|---|
| **Aleatory (chance)** | in the content (world-side) | radioactive decay; outcome variability across patients |
| **Measurement** | in values (section 4.7) | a reading with its standard uncertainty, by statistical (Type A) or other (Type B) evaluation per the GUM |
| **Parameter** | in a model's parameters | an uncertain rate constant |
| **Structural / model** | in the choice between models | linear versus threshold dose–response |
| **Scope** | in whether a target falls within a model's domain | will a drug's effect in adults transfer to children? |
| **Interpretive** | in the reading of a record or text | which concept a term in a paper expresses |
| **Vagueness** | in the concept itself (borderline cases), represented by a range of admissible precisifications (3.6.4) | species boundaries in ring species; "obese" (Williamson, *Vagueness*, 1994) |
| **Epistemic (credence)** | in standing (holder-side) | how strongly a hypothesis is supported |
| **Deep uncertainty / ignorance** | in standing, when no warranted distribution exists | novel technologies; unprecedented climate regimes (Knight, *Risk, Uncertainty and Profit*, 1921) |
| **Disagreement** | in standing across holders | expert panels split on a causal claim |

Obligations on any later uncertainty calculus:

1. **Chance must be distinct from credence.** A credence *about* a chance must be representable: "I am fairly
   confident that the decay probability is about 0.5 per half-life". The relation between them, credence following
   known chance, is itself a principle with conditions (Lewis, "A subjectivist's guide to objective chance", 1980).
2. **Ignorance must be distinct from evidential balance.** "No evidence either way" must differ from "strong evidence
   on both sides", and both must differ from a probability of 0.5. A single precise probability cannot express this
   (Walley, 1991; Shafer, 1976).
3. **Uncertainty stays on its component.** An uncertain parameter does not make the whole model uncertain in the same
   way.
4. **Propagation must be possible.** Uncertainty in inputs must be traceable to uncertainty in derived quantities and
   conclusions, as the GUM requires for measurement.
5. **No logical omniscience.** A holder's support for a content may fall short of certainty even when the content is
   a logical or mathematical consequence of what the holder accepts, until a derivation is available. Uncertainty
   about unproved conjectures, unchecked proofs and underived consequences must be representable. Standard
   probabilistic credence assigns probability 1 to every logical truth and cannot do this without modification
   (Garber, "Old evidence and logical omniscience in Bayesian confirmation theory", 1983).
6. **Vagueness is not a probability.** Borderline application is represented by admissible precisifications
   (3.6.4), not by credence or chance.
7. **The calculus is not fixed in S0.** Probabilistic, imprecise, ranking-based and qualitative grading schemes are
   all admissible if they meet obligations 1–6 (section 2.5).

## 4.10 Negation and absence

"Not" covers distinct situations, and the universe must keep them apart:

| Case | Meaning | Example |
|---|---|---|
| **N1 Gap** | nothing is represented on the matter | no record of whether compound C is toxic |
| **N2 Denial** | a content is rejected by a holder (standing) | "the community rejects the claim that C is carcinogenic" |
| **N3 Restricted (choice) negation** | the content's complement within a domain of application fixed by the frame. Absolute contradictory negation is a limiting case | "the sample is not radioactive" |
| **N4 Incompatibility (contrariety)** | a determinate excludes others of the same determinable | being in the liquid phase excludes being solid at that point. "Not acidic" is not the same as "basic" (neutral exists) |
| **N5 Measured absence** | a value below a detection or quantification limit | "lead < 0.5 µg/L (LOD)" is an upper bound, not zero |
| **N6 Negative result** | a study did not detect an effect | its weight depends on the study's sensitivity: absence of evidence is evidence of absence only to the extent of the study's power |
| **N7 Absence as an item** | absences with identity and properties | holes, vacancies in crystals, gaps in a fossil record (Casati and Varzi, *Holes and Other Superficialities*, 1994) |

Rules:

- **No silent closed world.** Absence of a content (N1) is never read as its negation (N3) unless a **closure** is
  declared for a delimited domain: "this catalogue lists all known isotopes of element X as of date d". This
  follows the distinction between open-world and closed-world reasoning (Reiter, "On closed world data bases",
  1978).
- **Gap, support, opposition and conflict are four distinct states.** Following Belnap's four informational states
  (Belnap, "A useful four-valued logic", 1977), the universe must represent, for any item and holder, whether
  there is **support for**, **support against**, **both** (conflict) or **neither** (gap).
- **Incompatibility is the semantic basis of negation in content.** Determinables partition their value spaces, so
  contrariety comes from the structure of property spaces. Restricted negation is relative to the domain fixed
  by the frame (Price, "Why 'not'?", 1990; Horn, *A Natural History of Negation*, 1989; Brandom, 1994).

## 4.11 Two places for qualifiers: content and standing

Several qualifiers have a world-side reading (in the content) and a holder-side reading (in standing). Confusing them
is a major source of error, so the universe must keep them distinct and must not count one qualifier twice.

| Qualifier | In content (world-side) | In standing (holder-side) |
|---|---|---|
| Probability | chance, frequency | credence, degree of support |
| Possibility | nomological, dispositional, technical | epistemic ("may be") |
| Negation | restricted negation, incompatibility, measured absence | denial, rejection |
| Time | world time | record time; time of acceptance |
| Conditions | domain of application, manifestation conditions | conditions on the validity of evidence (study design assumptions) |
| Perspective | physical reference frame; level of description | holder; community; source |

**Double-counting rule.** When a content already contains a chance or a modality, the standing must not repeat it as
credence. Conversely, a holder's uncertainty must not be written into the content as if it were chance.
