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
core from collateral connections (section 3.4).

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
(section 3.5). Any later computational use of distributional methods belongs to S1 or later, and stays subordinate
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
relations, but inside a scaffold that can be revised (section 3.6).

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
"received view" of logical empiricism (Carnap, "Empiricism, semantics, and ontology", 1950). This option is
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

**Decision.** **Models are the primary bearers of theoretical content (U2).** **Practices are first-class (U3)** and
carry methodological knowledge (chapter 7). **Records of data (U4)** are first-class carriers of empirical input.
Contents such as claims and propositions are **derived**: they are formed by composition when a question, an
inference or an evaluation needs them. One example is the content that a given model fits a given target in
certain respects. Contents are not the stock from which the universe is built. This meets R16 without denying that
claims exist.

## 2.4 Which ontological scaffold, if any, comes first?

**S1. A fixed upper ontology of substances and qualities,** such as BFO or DOLCE.
*For:* disciplined categories. *Against:* hard to extend, and it commits in advance on contested metaphysics,
such as whether processes depend on continuants.

**S2. The four-category ontology,** with kinds, attributes, objects and modes (Lowe, *The Four-Category Ontology*,
2006). *For:* it explains laws as relations between kinds. *Against:* it has the same rigidity as S1.

**S3. A process ontology,** in which processes are fundamental and things are stabilised processes (Whitehead,
*Process and Reality*, 1929; Rescher, *Process Metaphysics*, 1996; Nicholson and Dupré (eds.), *Everything Flows*,
2018). *For:* it fits biology, chemistry and field physics, where "things" are dynamic stabilities. *Against:*
it is less natural for metrology and for artefacts.

**S4. No upper ontology,** with all categories learned bottom-up. *For:* maximal openness (R8). *Against:* without
any scaffold there are no identity criteria, and recognition (R9) becomes impossible.

**Decision.** A **minimal, revisable scaffold** (section 3.6). Continuants and occurrents are both basic, and
neither is reduced to the other. Every scaffold category is itself a concept with role and anchors, so it can be
revised, split or supplemented (T11). Only the **meta-level** (chapter 3, D1–D16) is fixed by this specification.

## 2.5 How are epistemic states represented?

- **E-a. Binary acceptance:** a content is either in the knowledge base or not. This is simple, but it loses
  degrees, reasons and disagreement.
- **E-b. Probabilistic credence:** coherent degrees of belief (Jaynes, *Probability Theory: The Logic of Science*,
  2003). This is powerful, but it requires precise numbers that are often unavailable, and it merges ignorance with
  balanced evidence.
- **E-c. Imprecise probabilities and belief functions:** intervals or sets of probabilities (Walley, *Statistical
  Reasoning with Imprecise Probabilities*, 1991), or belief functions (Shafer, *A Mathematical Theory of Evidence*,
  1976). These represent ignorance explicitly, at the cost of greater complexity.
- **E-d. Ranking functions:** ordinal degrees of disbelief with a well-behaved revision theory (Spohn, *The Laws of
  Belief*, 2012).
- **E-e. Argument-based standing:** a content's standing follows from the structure of reasons for and against it
  (Toulmin, *The Uses of Argument*, 1958; Dung, "On the acceptability of arguments and its fundamental role in
  nonmonotonic reasoning, logic programming and n-person games", 1995).
- **E-f. Belief versus acceptance:** accepting a content as a premise for a purpose differs from believing it to a
  degree (Cohen, *An Essay on Belief and Acceptance*, 1992). Acceptance in a scientific setting is itself a
  decision with its own criteria (Levi, *The Enterprise of Knowledge*, 1980).

**Decision.** Epistemic **standing** is separated from content, and it has several dimensions: attitude, support,
holder and time (chapter 5). Standing is always accompanied by **grounds**, the reasons on which it rests (E-e).
The *calculus* for degrees of support is **deferred to S1** (E-b, E-c and E-d remain candidates). S0 only fixes the
distinctions any calculus must preserve, such as the difference between ignorance and conflicting evidence, and
between chance and credence (section 4.9).

## 2.6 How does a body of knowledge change?

- **V-a. AGM belief revision:** rational postulates for expansion, contraction and revision of belief sets
  (Alchourrón, Gärdenfors and Makinson, "On the logic of theory change", 1985), with epistemic entrenchment
  (Gärdenfors, *Knowledge in Flux*, 1988). It is precise, but it operates on sets of sentences in a fixed language,
  so it cannot handle **change of meaning or of vocabulary**.
- **V-b. Reason maintenance:** dependency-tracking systems that retract conclusions when their supports go (Doyle,
  "A truth maintenance system", 1979; de Kleer, "An assumption-based TMS", 1986). It is good at propagation, but it
  is an engineering device with no theory of which revision to prefer.
- **V-c. Explanatory coherence:** acceptance is maximised coherence among hypotheses and evidence, and conceptual
  revolutions reorganise kind and part hierarchies (Thagard, *Conceptual Revolutions*, 1992).
- **V-d. Research programmes and paradigms:** change is structured. A protected hard core sits behind a
  revisable protective belt (Lakatos, "Falsification and the methodology of scientific research programmes", 1970).
  Revolutions replace frameworks whose concepts may not translate (Kuhn, *The Structure of Scientific Revolutions*,
  1962). Constitutive principles are a priori only relative to a framework and can change historically (Friedman,
  *Dynamics of Reason*, 2001).
- **V-e. Epistemic iteration:** concepts and measurement standards are refined in successive self-correcting rounds
  (Chang, *Inventing Temperature*, 2004).

**Decision.** Revision is **layered by depth**: standing, content, model, concept, frame and scaffold
(section 6.3). Deeper layers are more entrenched, and revising them is a recorded event in its own right (V-a's
entrenchment, V-d's structure). Revision is **non-destructive**: the universe keeps the history of what was held,
when and why (V-b), so changes of meaning can be traced (V-c, V-d, V-e). AGM-style postulates may serve as a local
standard within a fixed frame. They cannot be the whole theory.

## 2.7 Decisions and their risks

The proposal, called **anchored-role semantics in a model-centred universe**, consists of the following decisions:

1. Meaning = frame-relative **role** + **anchors** (A3 + A1/A8/A9), with a constitutive core to block holism.
2. Properties live in **structured determinable spaces** (A4) under measurement theory.
3. **Models** are the primary bearers of theory. **Practices and records** are first-class. Contents are derived
   (U2, U3, U4).
4. A **minimal, revisable scaffold** with continuants and occurrents as basic (S1/S3, made revisable).
5. **Standing is separate from content** and carries grounds. The calculus is deferred (E-e, E-f).
6. **Layered, non-destructive revision** that includes change of meaning (V-a to V-e).

**Why this is a principled combination and not eclecticism.** Each component answers a requirement that the
alternatives fail separately (section 2.2, comparison table). The components also meet at a single point, the
**frame**: role, constitutive core, admissible models, measurement conventions and scope are all relative to a
frame. As a result, the frame is the one place where context, meaning change and incommensurability are handled.

**Risks.**

- Two-factor theories can let role and anchor come apart. The model treats this divergence as information
  (reference may be empty or indeterminate, D3) rather than as a contradiction, but the criteria for resolving it
  remain partly open (O1, O2).
- A model-centred universe may make simple factual knowledge, such as "the boiling point of water at 101.325 kPa is
  about 373 K", seem heavy. Section 3.3 shows that such contents are degenerate models, and the cost is examined in
  chapter 8.
- Deferring the uncertainty calculus leaves S1 with a substantial choice (O4).

**Rival proposals kept for comparison.** Chapter 9 requires the adequacy check to compare this proposal against at
least two rivals on the same held-out cases:

- **Rival P1**, a pure conceptual-space semantics extended with events (A4 + A6).
- **Rival P2**, a statement-based formal ontology with probabilistic annotations (A11 + E-b).

P2 is the conventional option. Keeping it as a comparator tests whether the departure from assertions earns its
cost.
