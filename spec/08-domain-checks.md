# 8. Conceptual checks on scientific examples

Requirements addressed: R1, R4, R10, R11, R12, R13, and the mission's instruction to check the proposal on examples
from different domains.

## 8.1 Status of these checks

Version 2.0 note: E1–E11 were written for 1.0, and their wording has been updated to the 2.0 vocabulary. Section 8.15
re-examines review cases that were used as development material for 2.0. None of these examples is evidence. All verdicts in this chapter are the designer's self-assessments.


These checks were done **during design**. The designer chose them, and some of them led to changes in the model
(section 8.13). Under the project rules they therefore **cannot serve as independent evidence** of adequacy. They
show that the model can be applied to varied cases, and where it is strained. Independent assessment requires the
held-out procedure of chapter 9.

The factual scientific content of the examples is standard textbook or historical material, summarised briefly. Where
an example uses invented values, the values are marked as illustrative.

Each check gives the situation, a sketch of how the universe represents it, the features exercised and the points
of strain.

## 8.2 E1 — Temperature (physics and metrology)

**Situation.** Temperature was first measured with thermometers whose readings disagreed outside narrow ranges. It
was later given an absolute thermodynamic definition, interpreted in kinetic theory as related to mean molecular
kinetic energy, and defined in statistical mechanics through the derivative of entropy with respect to energy.
Since 2019, the kelvin has been defined by fixing the Boltzmann constant. In systems with a bounded energy spectrum,
such as nuclear spin systems, the statistical-mechanical definition yields **negative absolute temperatures**
(Purcell and Pound, "A nuclear spin system at negative temperature", 1951; Ramsey, "Thermodynamics and statistical
mechanics at negative absolute temperatures", 1956). The history of measurement is analysed in Chang, *Inventing
Temperature*, 2004.

**Representation.**

- One concept, *temperature*, with several anchors:
  - operational: particular thermometer types, each with a range;
  - deferential: the SI definition and the international temperature scale;
  - historical exemplars: fixed points such as the triple point of water.
- Four frames:
  - *F-thermometry*, where temperature is an ordinal and later interval quantity;
  - *F-thermodynamics*, where it is a ratio quantity with an absolute zero;
  - *F-kinetic*, where a central connection links temperature to mean translational kinetic energy for ideal gases, within that
    model's domain;
  - *F-statmech*, where the central connection is 1/T = ∂S/∂E.
- "This spin system has T = −0.5 K" is **nomologically possible in F-statmech**, and **not satisfiable in
  F-kinetic**, where temperature is proportional to a non-negative energy. The universe represents the content, its
  frame-relative possibility and the fact that the kinetic connection does not apply outside the domain of the ideal-gas
  model.
- Relation between the F-kinetic and F-statmech concepts (2.0 criteria): paradigm anchors and goals are shared, so
  this is **one concept with frame-relative role profiles** (3.6.3). Its frame-relative extensions **agree on
  ideal-gas equilibrium systems and diverge outside them**.

**Features exercised:** multiple anchors (D4), frame-relative central connections (D5), scale types (4.7), frame-relative nomological
possibility (4.8), anchor change preserving extension (6.3), epistemic iteration.

**Strain.** The identity relation had to be stated **relative to a domain of cases**. This led to a change in section
3.6.3 (section 8.13). Whether "temperature" names one concept with frame-relative role profiles or several lineage-related
concepts is not forced by the model. Both readings are representable. The choice of granularity is open problem O11.

## 8.3 E2 — Acids (chemistry)

**Situation.** There are three established acid concepts:

- **Arrhenius**: a substance that increases the concentration of H⁺ in water;
- **Brønsted–Lowry**: a proton donor;
- **Lewis**: an electron-pair acceptor.

Their extensions are roughly nested, Arrhenius within Brønsted–Lowry within Lewis. Boron trifluoride is a Lewis acid
but not a proton donor.

**Representation.**

- Three concepts share the lexical anchor "acid" and partly share operational anchors, such as indicators and
  titration in aqueous media. Their central connections differ.
- Under the 2.0 criteria, Arrhenius to Brønsted–Lowry keeps the paradigm acids, titration anchors and goals, and
  widens the extension. It is a **meaning change of one concept**. Version 2.1 classifies Brønsted–Lowry → Lewis as
  **indeterminate**, because goal inclusion depends on granularity, and the case is contested in the literature. See
  section 8.16. Version 1.0 counted three concepts.
- "BF₃ is an acid" is satisfied under the Lewis concept and not under the other two. Until the concept is fixed,
  the question is **ambiguous**, and recognition must resolve the ambiguity (3.6).
- pH is a logarithmic quantity, so ratios of pH values carry no meaning. "pH 2 is twice as acidic as pH 4" treats
  pH as a ratio scale. On the [H⁺] reading the claim is false, since the ratio is 100 (4.7).

**Features exercised:** lexical anchors are insufficient for identity (3.6.5), relations between meanings (3.6.3),
generalisation lineage (6.3), meaningfulness (Op5).

**Strain:** none significant. This is a case the model was built to handle.

## 8.4 E3 — The gene (molecular biology)

**Situation.** The gene was first a Mendelian factor inferred from patterns of inheritance, then a mapped
chromosomal locus, then a DNA sequence coding for a product. Discoveries such as alternative splicing, overlapping and
nested genes and non-coding RNA genes made any single molecular definition contested. The philosophical literature
distinguishes several gene concepts in current use (Griffiths and Stotz, *Genetics and Philosophy*, 2013).

**Representation.**

- A **split lineage**: several concepts descend from the Mendelian factor, each with its own central connections and anchors. The
  anchors include breeding experiments, genetic maps and sequence annotation conventions, which are deferential
  anchors to annotation consortia.
- Exemplar anchors, meaning particular well-studied genes, are shared across the concepts. They are the main
  evidence for co-reference on central cases.
- "The human genome contains about N genes" is relative to the gene concept and the annotation convention used. Its
  value changes as annotation is revised. This is relativity to a convention (a deferential anchor) combined with a
revision of the universe (6.3). It is not a change in the world.
- Interpreting a paper's use of "gene" is an interpretive hypothesis (6.1).

**Features exercised:** split lineage (6.3), indeterminate reference (D3), interpretive uncertainty (4.9),
attribution before adoption (6.1).

**Strain.** No best satisfier exists for the generic term. The model represents this as indeterminate reference
across the lineage, but it cannot decide which concept an ambiguous text uses without context. That is a limit of
interpretation, not of representation.

## 8.5 E4 — Continental drift and plate tectonics (geology, historical science)

**Situation.** Wegener proposed continental drift in 1912–1915, citing the fit of coastlines, fossil distributions
and matching rock formations. The proposal was widely rejected, chiefly because no adequate mechanism was known.
Seafloor spreading and the interpretation of magnetic striping in the 1960s led to plate tectonics. In that theory,
lithospheric plates move, rather than continents ploughing through oceanic crust.

**Representation.**

- The hypothesis has a **history of standing**: proposed (1912, holder: Wegener), rejected by most of the community
  (holders: communities, by period), then accepted in a revised form (late 1960s).
- The content accepted in the 1960s is **not identical** to Wegener's content. It is lineage-related. The common
  core ("continents have moved relative to each other over geological time") was retained, while the mechanism
  was replaced.
- Grounds against the early hypothesis include the absence of a plausible how-possibly mechanism (5.4). This is a
  ground that bears on prior plausibility, not a refuting observation.
- Times are given in deep-time units with uncertainty and with qualitative relations (4.4). The inference is
  largely from traces, which is typical of historical science (Cleland, 2002).

**Features exercised:** standing as distinct from content (T6), holders (D14), lineage of contents (D15),
how-possibly hypotheses (5.4), historical explanation (5.6), time (4.4).

**Strain:** none significant. The case showed that **lineage applies to contents, not only to concepts**, which D15
already allows.

## 8.6 E5 — A clinical trial of an intervention (medicine and epidemiology)

**Situation (illustrative values).** A randomised, placebo-controlled trial of drug D in adults aged 40–65 with
hypertension reports a mean reduction in systolic pressure of 5 mmHg relative to placebo (95 % CI 3–7 mmHg). For
stroke incidence, a secondary outcome, it reports no statistically significant difference, and the study had low
power for that outcome. A clinician asks whether D is advisable for a 78-year-old patient.

**Representation.**

- The trial report is a record. Its contents are first **attributed** to the trial's authors (6.1).
- The primary result is a **statistical causal content at population level**: an average effect of an intervention
  in the trial population, with a measurement or estimation uncertainty. It is not a claim about each individual
  (Op3).
- The method (randomised controlled trial) has assumptions: adequate randomisation, blinding and limited loss to
  follow-up. These are represented as methodological contents (7.3) that the grounds depend on.
- Blood pressure is a **surrogate** for stroke, so it is less direct evidence for the outcome that matters (5.8,
  directness).
- The stroke result is a **negative result with low power** (N6). It does not support "D has no effect on stroke"
  beyond the study's sensitivity.
- Applying the result to a 78-year-old is a **transfer hypothesis** (6.4, TC4). The patient is outside the trial's
  age range. The universe asks whether the causal structure and the support factors are similar, rather than
  assuming they are.
- The clinician's advice is an **evaluative content** with goal, comparator, conditions and holder (7.4).

**Features exercised:** attribution before adoption, population versus individual readings, causal content (5.5),
methodological assumptions, negative results, transportability, evaluation.

**Strain.** Combining this trial with observational studies and mechanistic knowledge requires an evidence
amalgamation method that S0 does not supply (O6).

## 8.7 E6 — Predator–prey oscillation and its chemical counterpart (ecology to chemistry)

**Situation.** Lotka derived undamped oscillations from mass-action kinetics for a hypothetical chemical reaction
system (Lotka, "Undamped oscillations derived from the law of mass action", 1920). Lotka (*Elements of Physical
Biology*, 1925) and Volterra (1926) gave the same equations for predator–prey populations. The neutral cycles of
the basic model are known to be structurally fragile: small modifications to the equations change their
qualitative behaviour.

**Representation.**

- One **abstract structure**: a pair of coupled non-linear differential equations with bilinear interaction terms.
  Two models in different frames, chemical kinetics and population ecology, instantiate it.
- Transfer from one domain to the other is licensed **structurally and heuristically** under TC1 (same relational
  structure: growth, mass-action-like encounter and loss) TC3 (well-mixed, large-number regime, so continuous
  variables are adequate) and TC5 (concentrations of reacting species align with population densities, and the
  mass-action rate with the encounter rate). The negative analogy (TC2) is listed: organisms reproduce with delays and age structure,
  and real oscillating reactions are generally modelled by other mechanisms.
- **Quantitative** transfer of parameter values is refused.
- The model's idealisations are marked as Galilean and minimalist (Op7). Contents derived from it inherit fit
  limitations.

**Features exercised:** abstract structure shared across frames (3.8), transfer conditions (6.4), refusal of transfer,
idealisation (Op7).

**Strain:** none significant. This was a design target for R10.

## 8.8 E7 — Working-memory capacity (cognitive psychology)

**Situation.** The limited capacity of short-term memory was famously put at about seven items (Miller, "The magical
number seven, plus or minus two", 1956). It was later argued to be about four chunks (Cowan, "The magical number 4 in
short-term memory", 2001). Capacity is measured with different tasks, such as complex span and change detection,
whose scores correlate only partly.

**Representation.**

- *Working-memory capacity* is a **latent quantity** (4.7). Its existence and its measurement validity are
  contents with standing (Cronbach and Meehl, 1955; Borsboom, 2005).
- Each task gives an **operational anchor**. Whether the tasks measure the same construct is an **identity
  hypothesis**, currently **overlapping** or **indeterminate** (3.6.3).
- "Capacity ≈ 4 chunks" and "capacity ≈ 7 items" are relative to different units: chunks versus items. They are
  not a direct contradiction. Recognising this depends on the role structure of the concept of a chunk.
- The **scale type** of test scores (ordinal or interval) is itself uncertain. That limits the meaningful operations
  (Op5) and is represented as uncertainty about the measurement frame.
- Replication results are methodological knowledge that affects standing (7.3).

**Features exercised:** latent quantities, identity hypotheses, operational anchors, uncertainty about scale type,
methodological propagation.

**Strain.** The criteria for identity of latent constructs are weak in the field itself. The model can represent the
question, but it cannot supply an answer (O2). Uncertainty about scale type is representable, but no calculus for
it is fixed (O4).

## 8.9 E8 — Rated performance of a heat pump (engineering and product evaluation)

**Situation (illustrative values).** A manufacturer states that a heat pump has a coefficient of performance (COP)
of 4.5. COP is the heat delivered divided by the electrical work, a dimensionless ratio. The figure was measured at
a standard test condition. A household wants to know the performance in a cold climate.

**Representation.**

- The manufacturer's statement is an **attributed** content: holder, manufacturer; method, a standard test
  procedure (6.1).
- Thermodynamics supplies a **nomological bound**: the heating COP cannot exceed T_hot / (T_hot − T_cold), with
  thermodynamic (ratio-scale) temperatures. This links back to E1.
- A claimed COP above the bound for the stated conditions would be **nomologically impossible** in the
  thermodynamic frame. Because the claim is only attributed, this is a conflict between holders: the manufacturer's
  claim against the thermodynamics the universe accepts. Adopting the claim would violate C1. By entrenchment, the
  claim is the item that yields (L1 or L2), not thermodynamics (L5).
- Performance in the household's climate is a **transfer hypothesis** from the test model to field conditions (7.4,
  rated versus realised).
- The household's evaluation needs a goal, criteria (running cost, comfort, emissions), a comparator (the existing
  boiler) and conditions (7.4).

**Features exercised:** attribution, dimensionless quantities and ratio scales, nomological bounds as coherence
checks, entrenchment in conflict resolution (6.3), rated versus realised performance, evaluation structure.

**Strain:** none significant.

## 8.10 E9 — Dark matter (astrophysics)

**Situation.** Galaxy cluster dynamics (Zwicky, 1933), galactic rotation curves (Rubin and Ford, 1970; Rubin, Ford and
Thonnard, 1980) and
gravitational lensing indicate more gravitating mass than is visible. Two kinds of explanation compete:

- unseen matter, often taken to be non-baryonic particles;
- modified dynamics, such as MOND (Milgrom, 1983).

Observations of colliding clusters have been argued to favour unseen matter (Clowe and others, 2006). The
reconstruction of lensing mass assumes a theory of gravity.

**Representation.**

- *Dark matter* is introduced by **M4** (theoretical posit), with a descriptive anchor: unseen gravitating matter
  responsible for the observed discrepancies.
- Rival frames: general relativity with dark matter, and modified dynamics. In each frame the same phenomena are
  explained differently (5.6).
- Evidence relations are explicitly **relative to background** (5.8). Lensing mass maps are evidence for unseen mass
  *relative to* general relativity.
- If modified dynamics were accepted, the extension of the concept could become **empty**, as happened earlier with
  the planet Vulcan proposed to explain Mercury's perihelion.

**Strain.** If the descriptive anchor were only "whatever explains the discrepancies", the concept would refer
whatever the explanation turned out to be, and it could never fail. This would hide a real scientific question. The
check showed that **descriptive anchors must state their category commitment** (here, *matter*), so that reference
can fail. Section 3.3 was amended accordingly (section 8.13).

## 8.11 E10 — Prions (microbiology and pathology)

**Situation.** Scrapie and related diseases were transmissible, but the agent resisted treatments that destroy
nucleic acids. The proposal that the agent was a protein, propagating by templated misfolding of a host protein
(Prusiner, "Novel proteinaceous infectious particles cause scrapie", 1982), contradicted a widely held background
assumption that infectious agents replicate using nucleic acids. The proposal later gained wide acceptance.

**Representation.**

- Before the revision, "carries nucleic acid" was effectively a **highly central** connection of the concept
  *infectious agent*, presupposed by the relevant methods. Accepting prions required a **frame revision (L5)** that
  removed it from the frame's constitutive commitments and made it peripheral, together with a **concept revision (L4)** that admitted a new occurrent type, templated
  conformational propagation, as a form of replication. Neither is a scaffold category, so this is not an L6
  revision.
- The prion concept entered by **M4** and then gained operational anchors (assays) by **M3**.
- The standing history shows a long period of contested support with many holders. Entrenchment explains the
  resistance, and the accumulating repairs to the old commitment (for example postulated undetected nucleic acids) are
  recorded as grounds for deeper revision (6.3).

**Features exercised:** frame and concept revision, entrenchment and repair history, acquisition modes.

**Strain.** Deciding *when* a central connection should be demoted is a judgement the model represents but does not
reduce to a rule (O1).

## 8.12 E11 — The unemployment rate (economics and official statistics)

**Situation.** The unemployment rate is a conventional quantity. Its definition is fixed by standards (for example
International Labour Organization guidance) and by national survey designs. Revisions of survey questionnaires
produce **breaks in time series**: the same label measures something slightly different before and after.

**Representation.**

- *Unemployed* is a **conventional kind** (3.8) with a deferential anchor (a standard) and an operational anchor (a
  survey instrument).
- A survey redesign is an **anchor change that alters the extension**, unlike the kilogram case. It is recorded as a
  lineage link with a correspondence on overlapping cases, often estimated from parallel runs.
- Comparisons across a break are flagged, as is any cross-country comparison under different conventions (3.6.3:
  "overlapping", not "identical").

**Features exercised:** conventional kinds, deferential anchors, anchor change altering extension (6.3), recognition
across conventions.

**Strain.** The lineage table in section 6.3 lacked a row for **anchor change altering extension**. It was added
(section 8.13).

## 8.13 Changes made to the model because of these checks

| Check | Change |
|---|---|
| E1 | Section 3.6.3: relations between meanings can be stated **relative to a domain of cases** (e.g. "co-referential on ideal-gas equilibrium systems"). |
| E9 | Section 3.3, D4: descriptive anchors must state their **category commitment**, so that reference can fail. |
| E11 | Section 6.3: lineage form **anchor change altering extension** added. |
| E4 | No change; confirmed that lineage (D15) applies to contents. |
| E10 | Reclassified after internal review as an L4/L5 revision. The L6 example is now fields (section 3.8). |

Because these changes were prompted by these examples, the examples are doubly unusable as evidence for the
corresponding features.

## 8.14 Summary

| Ex. | Domain | Main features exercised | Designer's self-assessed verdict (not evidence) |
|---|---|---|---|
| E1 | physics, metrology | anchors, frames, scale types, frame-relative possibility | handled after amendment |
| E2 | chemistry | lexical vs other anchors, generalisation lineage | handled |
| E3 | molecular biology | split lineage, indeterminate reference | handled with interpretive limits |
| E4 | geology | standing history, content lineage, how-possibly | handled |
| E5 | clinical medicine | population causal content, negative results, transfer, evaluation | handled; amalgamation open (O6) |
| E6 | ecology ↔ chemistry | shared abstract structure, licensed and refused transfer | handled |
| E7 | cognitive psychology | latent constructs, identity hypotheses, scale uncertainty | represented; not decidable (O2, O4) |
| E8 | engineering, products | attribution, nomological bounds, evaluation | handled |
| E9 | astrophysics | theoretical posits, background-relative evidence | handled after amendment |
| E10 | microbiology | frame and concept revision, entrenchment | handled; criteria open (O1) |
| E11 | economics, statistics | conventional kinds, anchor change altering extension | handled after amendment |

**Not covered by these checks:** pure mathematics as a body of knowledge in its own right (the model treats
mathematics only as abstract structure used in models); qualitative and interpretive social research; engineering
design knowledge beyond evaluation; and very large-scale data-driven science, where models are learned rather than
posed. These are priority areas for the held-out cases (chapter 9).

## 8.15 Development re-checks for version 2.0

The review of 1.0 used held-out cases H1–H11 (`reviews/S0-1.0-critical-review.md`). Version 2.0 was designed with
those results in view, so the cases are now **development material**. The re-checks below show how 2.0 treats the
points where 1.0 failed or was strained. **They are not evidence that 2.0 is adequate.**

| Case | Problem in 1.0 | Treatment in 2.0 | Residual |
|---|---|---|---|
| H1 Euler and *polyhedron* | Q3: "vague concept sharpened" and "theorem refuted" were both faithful readings, with different truth verdicts (F5) | The exemplar-based concept had borderline cases (the "picture frame" solid). Anchors (the paradigm polyhedra) and goals (classifying solids; the Euler relation) are preserved, so monster-barring is **precisification** (3.6.2). Under supervaluation (3.6.4), the original theorem is **reading-dependent**: true on some admissible precisifications, false on others. Exception-barring and lemma incorporation then produce new contents (L2) and new defined concepts (M1). The specification now states the verdict ("reading-dependent") and its reason. This is a development check, not evidence. | Whether the solid with a tunnel was a borderline or a clear case of the earlier concept is a historical judgement (O1). |
| H11 *H. pylori* | The belief about the stomach could be a frame assumption (L5) or a content (L2), with different entrenchment consequences (F5) | By D6, the belief was **tested** by some studies and **presupposed** in interpreting some biopsy observations (bacteria dismissed as contamination). It is therefore an accepted content, and also a constitutive commitment of the frame of that interpretive method (D19, D6). Its revision is L2 for the tested content and L5 for the interpretive frame, whose successor drops the commitment. Entrenchment comes from dependence and robustness, not from level (6.3). The consequences no longer depend on the label. | Establishing what a historical practice presupposed needs historical evidence (O2). |
| H6 Millennium Footbridge | No direction of fit; no grounds for design decisions | The design is a D17 item. Its adequacy content (that no excessive lateral response occurs under expected crowds) had standing grounded in models and codes whose domain did not cover synchronous lateral excitation. Conformance of the bridge was not at issue. The observed response is a record that undermines the adequacy content. The model, the method and the code were revised (L3). The retrofit decision has practical grounds (5.11). | Trade-offs among values in the retrofit choice (O10). |
| H7 AlphaFold | The meaning of a model required interpretable components | Behavioural specification (D7). Predictions are records of runs of the model. Used as data, they bear on targets through a fit content grounded in blind benchmarking (D19). | — |
| H10 Pluto | Lineage forms were not exclusive | The lineage link records the dimensions that changed: a deferential anchor added, one exemplar anchor dropped, extension narrowed, goals kept. By 3.6.2 this is a **meaning change** of the same concept (paradigm anchors and goals preserved). Holders who keep a geophysical concept hold a distinct concept with different central connections. | — |
| H2, H3 Four Colour Theorem, Riemann hypothesis | A logically omniscient calculus cannot represent uncertainty about mathematical claims | Obligation 5 of section 4.9. | Which calculus satisfies it (O4). |

## 8.16 Regression check for version 2.1 (development material, not evidence)

The cases of the 2.0 verification run informed version 2.1. Their classification under 2.1 is recorded here only to
check that the revision did not break what worked. The classifications are the designer's alone.

| Case | 2.1 classification | Compared with the literature consulted in the 2.0 run |
|---|---|---|
| B1 electric fluid | step 0: **split**. The quantity, anchored by electroscope and torsion-balance measurements of its own instances, continues as charge (step 5c). The substance reading is eliminated | matches "substance eliminated, quantity continued" |
| B1 imponderable fluid (category) | step 0: **elimination** | matches |
| B2 Aristotle → Lavoisier | step 1: **distinct** (paradigm extensions disjoint) | matches |
| B2 Lavoisier → Mendeleev → atomic number | Mendeleev's distinction is a **split** (element / simple body). For the element successor, G is granularity-dependent ("what can be isolated" passes to the simple body) → step 4 **indeterminate**. Mendeleev → atomic number: step 5c | **possibly over-indeterminate**: Hendry reads continuity through an underlying notion |
| B3 Dalton → modern atom | 5c if "what are the ultimate constituents of matter?" was not a goal of Dalton's atom in his practice; otherwise step 4 **indeterminate**. The specification asks for the evidence on this point (step 4) | matches only if the evidence supports the first reading |
| B4 life | step 4: **indeterminate**, granularity-dependent; contested | matches "contested" |
| B5 chemical element (two senses) | step 1: **distinct**, structural relation "defined from" | matches "two senses" |
| B6 credence versus chance | step 1: **distinct**, common abstract structure | matches |
| B6 frequency versus propensity | step 5 (same concept) if the frequency concept serves no goal the propensity concept lacks; otherwise step 4 **indeterminate** | compatible with "contested" |
| Acids: Arrhenius → Brønsted–Lowry | step 5c | matches |
| Acids: Brønsted–Lowry → Lewis, lineage and coexisting | step 4: **indeterminate** (goal inclusion depends on granularity) | matches "contested" |

**Reading.** The revision removes the opposite determinate verdicts on contested cases. It introduces a risk of
**over-indeterminacy** where goal identification is uncertain (B2, B3). The retest of section 9.7 must be able to
detect this.

