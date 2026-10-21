# 2. Theoretical alternatives considered

This chapter compares genuine alternatives on five questions that the design cannot avoid:

1. What is a meaning? (section 2.2)
2. What is the primary unit of scientific content? (section 2.3)
3. Which ontological scaffold, if any, comes first? (section 2.4)
4. How are epistemic states represented? (section 2.5)
5. How does a body of knowledge change? (section 2.6)

For each question, the alternatives are judged against the requirements of chapter 1 using the criteria in
section 2.1. Section 2.7 records the decisions and the risks they carry.

## 2.1 Evaluation criteria

| Code | Criterion | Main requirements |
|---|---|---|
| K1 | **Aboutness:** meanings can be about the world, so that contents can be true, false or fit to a degree, and concepts can fail to refer. | R5, R13, R18 |
| K2 | **Structured properties:** graded properties, quantities, scales and dimensions are represented natively. | R12 |
| K3 | **Connectivity:** meanings stand in inferential, explanatory and causal relations that can be followed. | R3, R4, R7 |
| K4 | **Change of meaning:** a concept's meaning can change, and the change can be tracked. | R6, R8 |
| K5 | **Novelty:** concepts and domains that were not foreseen can be acquired. | R1, R8 |
| K6 | **Context:** contents depend explicitly on frames, situations, times and perspectives. | R12 |
| K7 | **Non-assertion basis:** the approach does not reduce all knowledge to a stock of asserted sentences. | R16 |
| K8 | **Neutrality:** the approach does not dictate a software structure, but still admits a later computational treatment. | R16 |
| K9 | **Recognition:** the approach gives criteria for deciding that two expressions carry the same meaning. | R9 |
| K10 | **Cognitive and scientific plausibility:** the approach fits what is known about human concepts and about how science actually uses concepts. | R17 |

## 2.2 What is a meaning?

### A1. Referential and truth-conditional semantics

**Core idea.** The meaning of an expression is its contribution to truth conditions. Frege separated sense from
reference (Frege, "Über Sinn und Bedeutung", 1892). Tarski gave truth a model-theoretic definition (Tarski, "The
semantic conception of truth and the foundations of semantics", 1944). Davidson turned truth theory into a theory of
meaning (Davidson, "Truth and meaning", 1967). Montague applied model theory to natural language (Montague,
"Universal grammar", 1970).

**Strengths.** It meets K1 best of all: it explains truth, reference failure and logical consequence, and it gives a
precise account of composition.

**Weaknesses.** It assumes a fixed, given domain of interpretation. It says little about how concepts are acquired
or how their meaning changes (K4, K5). Graded properties and quantities need to be added from outside (K2).

**Retained.** Contents have satisfaction conditions. Concepts have extensions, which may be empty. Composition is
systematic.

### A2. Intensional and possible-worlds semantics

**Core idea.** Meaning is a function from possible worlds or indices to extensions (Carnap, *Meaning and
Necessity*, 1947; Lewis, "General semantics", 1970). Rigid designation and the necessity of identity separate names
from descriptions (Kripke, *Naming and Necessity*, 1980). Content depends on context through character (Kaplan,
"Demonstratives", 1989).

**Strengths.** It handles modality and context (K6), and it distinguishes co-extensive concepts that differ in
meaning.

**Weaknesses.** It is coarse: all necessarily equivalent contents get the same meaning, which matters in mathematics
and in theoretical science. Possible worlds are not observable, and they give no account of learning (K5).

**Retained.** Context as a parameter of interpretation. The distinction between how a reference is fixed and what
it refers to.

### A3. Conceptual-role and inferential semantics

**Core idea.** The meaning of a concept is its role in inference and in reasoning (Sellars, *Empiricism and the
Philosophy of Mind*, 1956; Field, "Logic, meaning, and conceptual role", 1977; Block, "Advertisement for a semantics
for psychology", 1986; Brandom, *Making It Explicit*, 1994).

**Strengths.** It meets K3 directly. It explains how a theoretical concept with no direct observational content
can still be meaningful. It also fits science, where concepts are learned through their place in theories.

**Weaknesses.** It tends towards **holism**: if meaning is total role, any change of belief changes every meaning,
so two people never share a concept and composition fails (Fodor and Lepore, *Holism: A Shopper's Guide*, 1992).
Role alone does not fix reference (K1): a coherent role may be realised by nothing. "Two-factor" theories, which
combine role and reference, are open to the objection that the two factors can come apart.

**Retained.** Role is half of meaning. The holism objection is answered by separating a frame-relative constitutive
core from collateral connections. In 2.0 this answer is restated as graded centrality, shared anchors and
shared goals (D5, section 3.3).

### A4. Conceptual spaces and geometric semantics

**Core idea.** Concepts are regions in spaces of quality dimensions, such as hue, pitch, mass or temperature.
Natural properties are convex regions, and similarity is distance (Gärdenfors, *Conceptual Spaces*, 2000;
Gärdenfors, *The Geometry of Meaning*, 2014).

**Strengths.** It meets K2 best of all: graded properties, prototypes, similarity and measurement scales are
native. It explains learning from few examples, and it links to measurement theory.

**Weaknesses.** It is weaker for relations, events, causal structure and highly theoretical concepts, such as gauge
symmetry or fitness (K3). Its treatment of logical structure (negation, quantification) is less developed.

**Retained.** Properties are organised as determinables with structured value spaces. Similarity and prototypes are
part of a concept's anchoring.

### A5. Psychological theories of concepts: prototype, exemplar and theory-theory

**Core idea.** Human concepts show typicality effects (Rosch, "Principles of categorization", 1978). They are
stored as exemplars or as summaries, and they are embedded in naive theories that explain why their features hang
together (Murphy and Medin, "The role of theories in conceptual coherence", 1985; Murphy, *The Big Book of Concepts*,
2002). Some new concepts are built by bootstrapping beyond what earlier concepts could express (Carey, *The Origin of
Concepts*, 2009).

**Strengths.** It meets K5 and K10. It explains how new concepts are formed and why concepts are coherent.

**Weaknesses.** It is about human minds, not about what scientific concepts denote (K1). Prototypes do not compose
in a simple way: a "pet fish" is not a typical pet combined with a typical fish (Fodor, *Concepts*, 1998; Kamp and
Partee, "Prototype theory and compositionality", 1995).

**Retained.** Exemplar anchors. Concepts embedded in explanatory structure. Bootstrapping as one way to acquire a
concept.

### A6. Frame semantics

**Core idea.** Words evoke structured background scenes with roles (Fillmore, "Frame semantics", 1982). Concepts
are recursive attribute–value frames (Barsalou, "Frames, concepts, and conceptual fields", 1992). Minsky proposed
frames for representing stereotyped situations (Minsky, "A framework for representing knowledge", 1974).

**Strengths.** It handles roles of participants in events and processes, and the background knowledge that
understanding needs (K3, K6).

**Weaknesses.** On its own it says little about truth, evidence or change (K1, K4).

**Retained.** Relational concepts have participant roles, and understanding brings background structure into play.
The word "frame" in this specification has a related but wider sense (D6, chapter 3).

### A7. Distributional semantics

**Core idea.** Meaning is determined by patterns of use in large bodies of text (Harris, "Distributional
structure", 1954; Firth, "A synopsis of linguistic theory 1930–1955", 1957).

**Strengths.** Recognition of similar usage (K9) and coverage at scale.

**Weaknesses.** Similarity of use is not sameness of meaning. Distribution does not fix reference (K1) or separate
fact from hypothesis (R13). Choosing it would also presuppose a computational substrate, against R16.

**Retained.** Patterns of use are admissible evidence for recognising a meaning, never its definition
(section 3.6). Any later computational use of distributional methods belongs to S1 or later, and stays subordinate
to this specification.

### A8. Meaning as use, and social externalism

**Core idea.** Meaning is use within a practice (Wittgenstein, *Philosophical Investigations*, 1953). The extension
of natural-kind terms is fixed partly by the world and partly by experts to whom ordinary speakers defer: Putnam's
"division of linguistic labour" (Putnam, "The meaning of 'meaning'", 1975). The content of a concept can depend on
the speaker's community (Burge, "Individualism and the mental", 1979).

**Strengths.** It explains how a concept can be shared despite unequal knowledge, and how reference can stay fixed
while beliefs change (K1, K4). It also fits science, where standards bodies and communities fix the use of terms.

**Weaknesses.** It gives no structure of its own for composition or inference.

**Retained.** Deferential anchors (D4). Communities, standards and sources as bearers of standing (chapter 5).

### A9. Grounded and embodied cognition

**Core idea.** Symbols acquire meaning only if they are connected to perception and action, not only to other
symbols (Harnad, "The symbol grounding problem", 1990; Barsalou, "Perceptual symbol systems", 1999).

**Strengths.** It names a real problem for any artificial semantic universe (K1, K5).

**Weaknesses.** Applied strictly, it would exclude theoretical concepts that are remote from perception. For a
system that does not perceive directly, it raises a question S0 cannot fully answer (open problem O3).

**Retained.** Operational and exemplar anchors are the universe's grounding. Their limits are stated openly.

### A10. Teleosemantics and informational semantics

**Core idea.** Content is fixed by the function a representation was selected for (Millikan, *Language, Thought, and
Other Biological Categories*, 1984), or by lawful information flow (Dretske, *Knowledge and the Flow of
Information*, 1981).

**Strengths.** It explains misrepresentation and gives a naturalistic account of aboutness.

**Weaknesses.** It is designed for organisms and signals, not for scientific theories (K3, K4). Information in
Shannon's sense is not meaning.

**Retained.** The function of instruments and records: a reading represents what the instrument is designed and
calibrated to track (chapter 5).

### A11. Formal ontology and description logics

**Core idea.** Meaning is fixed by a formal theory of categories and relations with stated axioms (Guarino, "Formal
ontology in information systems", 1998). Upper ontologies such as BFO (Arp, Smith and Spear, *Building Ontologies with
Basic Formal Ontology*, 2015) and DOLCE (Masolo and others, *WonderWeb Deliverable D18*, 2003) supply these
categories. Description logics (Baader and others, *The Description Logic Handbook*, 2003) provide decidable
fragments for definitions.

**Strengths.** Explicit identity criteria and a disciplined treatment of categories (K9). There is a mature body of
engineering practice.

**Weaknesses.** These ontologies tend to be fixed and top-down, and adding a new category is costly (K5). Their
logics are chosen in advance, which goes against the mission's order of work (K8). Under the open-world assumption,
the description-logic approach is still fundamentally a stock of axioms (K7).

**Retained.** Identity criteria for categories, the continuant/occurrent distinction and attention to dependence
relations, but inside a scaffold that can be revised (section 3.8).

### A12. Situation and dynamic semantics

**Core idea.** Contents are about partial situations, not whole worlds (Barwise and Perry, *Situations and
Attitudes*, 1983). Meaning is context-change potential (Kamp, "A theory of truth and semantic representation", 1981;
Heim, *The Semantics of Definite and Indefinite Noun Phrases*, 1982).

**Strengths.** Partiality: one can represent the part of the world one knows about, which matters for experiments
on bounded systems (K6). The dynamic view treats the updating of information as part of meaning (K4).

**Weaknesses.** The approach comes from linguistics, so the scientific notions it needs (measurement, evidence)
have to be added.

**Retained.** Contents are evaluated against situations or target systems, not against total worlds. Acquisition
is modelled as an update with its own structure.

### Comparison

In this table, ● means strong, ◐ partial and ○ weak or absent, as judged in the paragraphs above.

| Theory | K1 | K2 | K3 | K4 | K5 | K6 | K7 | K8 | K9 | K10 |
|---|---|---|---|---|---|---|---|---|---|---|
| A1 Truth-conditional | ● | ○ | ◐ | ○ | ○ | ◐ | ◐ | ● | ◐ | ◐ |
| A2 Possible worlds | ● | ○ | ◐ | ○ | ○ | ● | ◐ | ● | ◐ | ○ |
| A3 Conceptual role | ◐ | ○ | ● | ◐ | ◐ | ◐ | ● | ● | ◐ | ● |
| A4 Conceptual spaces | ◐ | ● | ○ | ◐ | ● | ◐ | ● | ● | ◐ | ● |
| A5 Psychological | ○ | ◐ | ◐ | ◐ | ● | ◐ | ● | ● | ◐ | ● |
| A6 Frame semantics | ◐ | ◐ | ◐ | ○ | ◐ | ● | ● | ● | ◐ | ● |
| A7 Distributional | ○ | ◐ | ◐ | ◐ | ● | ◐ | ● | ○ | ◐ | ◐ |
| A8 Use / externalism | ● | ○ | ○ | ● | ◐ | ● | ● | ● | ◐ | ● |
| A9 Grounded | ● | ◐ | ○ | ◐ | ◐ | ● | ● | ● | ◐ | ● |
| A10 Teleosemantic | ● | ○ | ○ | ○ | ◐ | ◐ | ● | ● | ○ | ◐ |
| A11 Formal ontology | ● | ◐ | ● | ○ | ○ | ◐ | ○ | ◐ | ● | ◐ |
| A12 Situation / dynamic | ● | ○ | ◐ | ● | ◐ | ● | ◐ | ● | ◐ | ◐ |

No single theory scores well on all ten criteria. Two pairs complement each other: A1/A8 (aboutness and
reference-fixing) with A3 (role), and A4 (structured properties) with A11 (category discipline). The proposal in
chapter 3 combines **role** and **anchor**, adds structured property spaces, and makes every element relative to a
frame. Section 2.7 explains why this is a principled combination rather than a list of borrowed parts.

## 2.3 What is the primary unit of scientific content?

**U1. Sentences or assertions (statement view).** A theory is a set of sentences closed under consequence, as in the
"received view" of logical empiricism, as reconstructed by Suppe (Suppe (ed.), *The Structure of Scientific
Theories*, 1974). This option is
excluded as a *presupposition* by R16. It is also weak on its own terms: one theory can be stated by many
non-equivalent sets of sentences, and much scientific knowledge is held as models, data, instruments and skills,
not as sentences.

**U2. Models (semantic view).** A theory is a family of models, structures that represent target systems in certain
respects and to certain degrees (Suppes, "A comparison of the meaning and uses of models in mathematics and the
empirical sciences", 1960; van Fraassen, *The Scientific Image*, 1980; Balzer, Moulines and Sneed, *An Architectonic
for Science*, 1987). Giere separates models from the **theoretical hypotheses** that claim a model fits a real
system (Giere, *Explaining Science*, 1988). Models can also be autonomous mediators between theory and world (Morgan
and Morrison, *Models as Mediators*, 1999).

**U3. Practices.** Scientific knowledge consists of interlocking systems of practice, including intervening,
measuring and calculating (Hacking, *Representing and Intervening*, 1983; Chang, *Is Water H2O?*, 2012).

**U4. Data-driven patterns.** Knowledge consists of regularities extracted from data. Data are relational: they
count as evidence for some claims within some practices (Leonelli, *Data-Centric Biology*, 2016).

**Decision (2.0).** No single unit is primary. Contents, models, records, methods and practices, designs, goals
and norms are co-fundamental kinds of representational item, individuated by their correctness conditions
(section 3.4). Version 1.0 had chosen model primacy (U2). Section 2.8 (FD1) records why that choice was withdrawn.

## 2.4 Which ontological scaffold, if any, comes first?

**SC1. A fixed upper ontology of substances and qualities,** such as BFO or DOLCE.
*For:* disciplined categories. *Against:* hard to extend, and it commits in advance on contested metaphysics,
such as whether processes depend on continuants.

**SC2. The four-category ontology,** with kinds, attributes, objects and modes (Lowe, *The Four-Category Ontology*,
2006). *For:* it explains laws as relations between kinds. *Against:* it has the same rigidity as SC1.

**SC3. A process ontology,** in which processes are fundamental and things are stabilised processes (Whitehead,
*Process and Reality*, 1929; Rescher, *Process Metaphysics*, 1996; Nicholson and Dupré (eds.), *Everything Flows*,
2018). *For:* it fits biology, chemistry and field physics, where "things" are dynamic stabilities. *Against:*
it is less natural for metrology and for artefacts.

**SC4. No upper ontology,** with all categories learned bottom-up. *For:* maximal openness (R8). *Against:* without
any scaffold there are no identity criteria, and recognition (R9) becomes impossible.

**Decision.** A **minimal, revisable scaffold** (section 3.8). Continuants and occurrents are both basic, and
neither is reduced to the other. Every scaffold category is itself a concept with role and anchors, so it can be
revised, split or supplemented (T11). Only the **meta-level** (chapter 3, D1–D19) is fixed by this specification.

## 2.5 How are epistemic states represented?

- **EP-a. Binary acceptance:** a content is either in the knowledge base or not. This is simple, but it loses
  degrees, reasons and disagreement.
- **EP-b. Probabilistic credence:** coherent degrees of belief (Jaynes, *Probability Theory: The Logic of Science*,
  2003). This is powerful, but it requires precise numbers that are often unavailable, and it merges ignorance with
  balanced evidence.
- **EP-c. Imprecise probabilities and belief functions:** intervals or sets of probabilities (Walley, *Statistical
  Reasoning with Imprecise Probabilities*, 1991), or belief functions (Shafer, *A Mathematical Theory of Evidence*,
  1976). These represent ignorance explicitly, at the cost of greater complexity.
- **EP-d. Ranking functions:** ordinal degrees of disbelief with a well-behaved revision theory (Spohn, *The Laws of
  Belief*, 2012).
- **EP-e. Argument-based standing:** a content's standing follows from the structure of reasons for and against it
  (Toulmin, *The Uses of Argument*, 1958; Dung, "On the acceptability of arguments and its fundamental role in
  nonmonotonic reasoning, logic programming and n-person games", 1995).
- **EP-f. Belief versus acceptance:** accepting a content as a premise for a purpose differs from believing it to a
  degree (Cohen, *An Essay on Belief and Acceptance*, 1992). Acceptance in a scientific setting is itself a
  decision with its own criteria (Levi, *The Enterprise of Knowledge*, 1980).

**Decision.** Epistemic **standing** is separated from content, and it has seven dimensions: attitude, support,
holder, purpose, standard of acceptance, time and scope (section 5.9). Standing is always accompanied by **grounds**, the reasons on which it rests (EP-e).
The *calculus* for degrees of support is **deferred to S1** (EP-b, EP-c and EP-d remain candidates). S0 only fixes the
distinctions any calculus must preserve, such as the difference between ignorance and conflicting evidence, and
between chance and credence (section 4.9).

## 2.6 How does a body of knowledge change?

- **RV-a. AGM belief revision:** rational postulates for expansion, contraction and revision of belief sets
  (Alchourrón, Gärdenfors and Makinson, "On the logic of theory change", 1985), with epistemic entrenchment
  (Gärdenfors, *Knowledge in Flux*, 1988). It is precise, but it operates on sets of sentences in a fixed language,
  so it cannot handle **change of meaning or of vocabulary**.
- **RV-b. Reason maintenance:** dependency-tracking systems that retract conclusions when their supports go (Doyle,
  "A truth maintenance system", 1979; de Kleer, "An assumption-based TMS", 1986). It is good at propagation, but it
  is an engineering device with no theory of which revision to prefer.
- **RV-c. Explanatory coherence:** acceptance is maximised coherence among hypotheses and evidence, and conceptual
  revolutions reorganise kind and part hierarchies (Thagard, *Conceptual Revolutions*, 1992).
- **RV-d. Research programmes and paradigms:** change is structured. A protected hard core sits behind a
  revisable protective belt (Lakatos, "Falsification and the methodology of scientific research programmes", 1970).
  Revolutions replace frameworks whose concepts may not translate (Kuhn, *The Structure of Scientific Revolutions*,
  1962). Constitutive principles are a priori only relative to a framework and can change historically (Friedman,
  *Dynamics of Reason*, 2001).
- **RV-e. Epistemic iteration:** concepts and measurement standards are refined in successive self-correcting rounds
  (Chang, *Inventing Temperature*, 2004).

**Decision (2.0).** Revisions are **classified by what changes**: standing, content, model or method, concept,
frame or scaffold (section 6.3). The preference among possible revisions is governed by **entrenchment**, meaning
how much else depends on an item and how robust its support is. It is not governed by the level of the item (RV-a's
entrenchment; Quine and Ullian, *The Web of Belief*, 1970, on conservatism). Version 1.0 tied entrenchment to level,
and section 2.8 (FD3) explains why that was changed. Revision is **non-destructive**: the universe keeps the history
of what was held, when and why (RV-b), so changes of meaning can be traced (RV-c, RV-d, RV-e). AGM-style postulates may serve as a local
standard within a fixed frame. They cannot be the whole theory.

## 2.7 Decisions of version 1.0 and their status in 2.0

| 1.0 decision | Status in 2.0 |
|---|---|
| 1. Meaning = frame-relative role + anchors, with a constitutive core to block holism | **Revised** (FD3): role profile with graded centrality, anchors and epistemic goals. No binary core. |
| 2. Properties in structured determinable spaces (A4) under measurement theory | **Kept.** |
| 3. Models primary; practices and records first-class; contents derived | **Replaced** (FD1): pluralism by correctness condition. |
| 4. Minimal, revisable scaffold with continuants and occurrents as basic | **Kept**, with *action* added as an occurrent type (FD2). |
| 5. Standing separate from content, with grounds; calculus deferred | **Kept and extended** (FD2): five planes, with practical grounds for decisions. |
| 6. Layered, non-destructive revision including change of meaning | **Kept**, with entrenchment decoupled from level (FD3). |

**Rival proposals kept for comparison.** These are unchanged:

- **Rival P1**, a pure conceptual-space semantics extended with events (A4 + A6).
- **Rival P2**, a statement-based formal ontology with probabilistic annotations (A11 + EP-b). It is judged in its
  strong form **P2+**, with named contexts, provenance, versioning and argument structure, as defined in the review
  of 1.0.

The internal review of 1.0 assessed that neither rival is a better foundation. It also assessed that S0's advantage
over P2+ lies in its theory of distinctions, not in model primacy. These are internal evaluations, not independent
validation (`reviews/S0-1.0-critical-review.md`, sections 2.6 and 3.3).

## 2.8 Foundational decisions of version 2.0

Each decision below states the problem found in 1.0, the alternatives, the choice, why, and what remains open.
The review cases (H1–H11) were used as **development material** for these decisions. They are not evidence for them.

### FD1 — What kinds of item are fundamental

**Problem.** In the review, model primacy (T1 of 1.0) did no work that a strong statement-based representation (P2+)
could not also do, so the failure condition F3 was met. Representing single observations as "degenerate models"
conflicted with the treatment of records (D11) and duplicated conditions.

**Alternatives:**

| Option | Description | Assessment |
|---|---|---|
| FD1-a Model primacy (1.0) | models are the bearers of theory; other items are derived | Organisational only (F3). It forces observations and designs into the model form. |
| FD1-b Content primacy | everything is ultimately a set of truth-apt contents with metadata (P2+) | Expressively adequate at the meta-level. It hides the different correctness conditions inside predicates, and it presupposes the assertion-based model that the mission excludes. |
| FD1-c Record or data primacy | everything is built up from data (data-centric empiricism) | It cannot account for theoretical models, norms or designs without reconstructing them as derived. Data are a role, not a kind (Leonelli, 2019). |
| FD1-d Practice primacy | everything is an aspect of practices (Hacking, 1983; Chang, 2012) | It fits methodological knowledge well, but it makes truth and fit of particular contents and models derivative and hard to assess. |
| FD1-e **Pluralism by correctness condition** | several co-fundamental kinds, individuated by correctness condition and direction of fit; role in inquiry is relative | Chosen. |

**Why FD1-e.**

1. It follows a single principle, the correctness condition, rather than a list. The principle is grounded in the
   theory of direction of fit (Anscombe, 1957; Searle, 1983).
2. It gives a determinate criterion for the kind of an item.
3. It makes design, goals and norms first-class without bolting them on, which addresses the review's concern SP4.
4. It does not claim expressive superiority over FD1-b. It claims fidelity to how science assesses different
   items, and it leaves storage to S1.
5. It withdraws degenerate models: an observation produces a record, and its interpretation is a situated content.

**Open.** Whether the list of correctness conditions is complete (O14).

### FD2 — Keeping meaning, correctness, justification, acceptance and decision apart

**Problem.** In 1.0, standing was epistemic, yet chapter 7 attached goals and decisions to it without grounds of their
own (review LD5, SP4).

**Alternatives:**

- FD2-a: one generic "attitude" covering belief and desire.
- FD2-b: decision-theoretic integration, with credences and utilities combined into expected value.
- FD2-c: **five distinct planes**, with practical grounds for decisions and an explicit, inspectable role for values in
  standards of acceptance.

**Choice: FD2-c.** FD2-a merges epistemic and conative attitudes, which invites wishful thinking. FD2-b presupposes a
precise calculus that S0 defers (4.9), and it cannot represent norms and incommensurable values without further
assumptions. FD2-c keeps decision theory admissible as one possible S1 treatment of the practical plane. The
indirect role of values in acceptance follows Douglas (2009).

**Open.** How to represent trade-offs between incommensurable values (O10).

### FD3 — Identity and evolution of concepts, and individuation of frames

**Problem.** The binary core/collateral split carried identity, revision level and entrenchment, but was not
operational. In the review, the H1 and H11 cases each admitted two faithful encodings with different consequences
(failure condition F5). Frames were not individuated.

**Alternatives for identity through change:**

| Option | Source | Assessment |
|---|---|---|
| FD3-a Frame-relative core (1.0) | Carnap; Friedman (2001) | No operational boundary. Friedman's support is for theory-level principles, not concept cores. |
| FD3-b Anchor continuity only | causal-historical theories (Kripke, 1980; Putnam, 1975) | Strong for natural kinds. It cannot handle reference failure, theoretical posits or a change of purpose. |
| FD3-c Epistemic-goal continuity | Brigandt (2010) | Explains rational meaning change. Goal individuation needs a basis. |
| FD3-d Graded centrality | Sloman, Love and Ahn (1998) | Avoids an analytic boundary. Gives no identity criterion on its own. |
| FD3-e Contextual diagnostics | Chalmers (2011), verbal disputes | Operational for disagreements, not for single changes. |
| FD3-f Taxonomic structure | Kuhn (2000) | Precise for kind terms. Silent for quantities. |
| FD3-g **Combined continuity criteria** | anchors (b) + goals (c) + extension, with centrality (d) for role change and the diagnostic (e) for disagreements | Chosen. |

**Why FD3-g.**

1. Each component covers a failure of the others. Anchors without goals cannot see a change of purpose. Goals
   without anchors cannot see a change of subject matter. Centrality replaces the binary core.
2. Goals are individuated through question types, which already exist as items in the universe (7.2).
3. **When the dimensions conflict, the outcome is indeterminate, by rule.** Conclusions are evaluated under each
   reading, following supervaluation (Fine, 1975). The method needs no numerical thresholds.
4. Taxonomic structure (FD3-f) is kept as evidence within dimension X for kind terms. It is not a separate criterion.

**Alternatives for individuating frames:**

- by theory, as a set of principles;
- by community, as Kuhn's disciplinary matrix;
- by domain of inquiry;
- no frames at all, with pure contextualism;
- **by constitutive commitments**: what a practice's methods presuppose rather than test (Reichenbach, 1920;
  Friedman, 2001).

**Choice:** constitutive commitments, with scope. Theories and communities do not have sharp boundaries. Domains do
not separate rival frames over the same domain. Pure contextualism loses the stability that composition needs. The
functional criterion can be investigated empirically in a practice, and it is allowed to give split answers (D6).

**Entrenchment is decoupled from the class of revision.** The class of a revision describes what kind of item
changes. Entrenchment describes how much else depends on the item, and how robust its support is. There is no
general reason why the two should coincide. In Quine's picture any belief can become central to the web (Quine,
1951). Gärdenfors defines epistemic entrenchment over beliefs regardless of their type (1988). In 2.0, therefore,
entrenchment is dependence plus robustness, for an item of any class. H11 is a development case that illustrates the
point, not its justification.

**Open.**

- How to compare continuity on a dimension when evidence is partial (O1, revised).
- How to establish what a practice presupposes, especially for historical practices (O2, revised).

### FD4 — Order of work for the local corrections

The local defects LD1–LD11 found in the review were integrated **after** FD1–FD3, and each was resolved as a
consequence of those decisions where possible:

| Defect | Resolution in 2.0 |
|---|---|
| LD2 degenerate models | withdrawn (FD1; D7) |
| LD3 opaque models | behavioural specification (D7, from FD1's correctness condition "fit") |
| LD4 direction of fit | designs (D17), from FD1 |
| LD5 practical grounds | practical plane (5.11), from FD2 |
| LD6 lineage forms | lineage by dimensions (D15), from FD3 |
| LD7 attributions in the world | two kinds of holder (D14), from FD2 |
| LD8 mathematical domains | abstract structures as targets (D8), from FD1 |
| LD11 vagueness | admissible precisifications (3.6.4), from FD3 |
| LD1 logical omniscience | an obligation on the standing calculus (4.9). Independent of FD1–FD3, and required by the separation of correctness from acceptance (FD2) |
| LD9 verification design | protocol in section 9.7 |
| LD10 bibliography | corrected in `references.md` and in the text |

Each resolution follows from a general principle, not from the case that revealed it:

- the behavioural specification of models follows from fit as the correctness condition of models (FD1);
- precisification follows from the theory of vagueness (3.6.4);
- relations relative to a domain follow from the domain-relativity of extensions;
- role-relative answers about constitutive commitments follow from the relativity of inquiry roles (D19).
