# 5. Knowledge, observation, hypothesis, explanation, causality, evidence, inference

Requirements addressed: R5, R13, R15.

## 5.1 Overview

The seven notions in the mission are not seven kinds of statement. They belong to different categories of the
universe:

| Notion | Category in this model |
|---|---|
| **Observation** | an *occurrent*: an interaction that produces records |
| **Evidence** | a *relation* between records or phenomena and a content or model, relative to background assumptions |
| **Inference** | an *occurrent*: a step that produces a content or standing from grounds, under an inference type |
| **Hypothesis** | a *standing*: a content, model or frame entertained or proposed as a candidate |
| **Explanation** | a *relation* between an explanans (a model, mechanism or law with conditions) and an explanandum |
| **Causality** | a *kind of content*: about what depends on what under intervention, at type or token level |
| **Knowledge** | a *standing*: acceptance on grounds that meet stated standards, undefeated within a scope |

Keeping these categories distinct is what lets the universe tell them apart (R13). Collapsing them into "statements
with confidence scores" is the specific failure this chapter is designed to avoid.

The typical route from world to knowledge, which is neither always linear nor always complete, is:

```
target system ─(observation / measurement / experiment)→ records
records ─(processing, under methods)→ derived data
derived data ─(inference)→ phenomena
phenomena ─(evidence relation, relative to background)→ support for/against hypotheses (contents, models)
models ─(explanation relation)→ phenomena
hypotheses + grounds ─(acceptance under standards)→ knowledge (standing)
```

Every arrow is an item of the universe with its own method, conditions and possible failure, so each can be
inspected and revised.

## 5.2 Observation, measurement, experiment and simulation

- **Observation** is an occurrent in which a target system interacts with an observer or instrument under a
  protocol, producing a record (D11). Its participants are the target, the instrument, the observer, the protocol
  and the conditions.
- **Measurement** is an observation that assigns a value of a quantity to a measurand through a calibrated
  procedure with a traceable reference and an evaluated uncertainty (JCGM 200:2012; Mari, Wilson and Maul, 2021).
- **Experiment** is an occurrent in which an agent **intervenes** on a system under controlled conditions and
  observes the result (Hacking, *Representing and Intervening*, 1983). The intervention is what gives experiments
  their special evidential force for causal contents (section 5.5).
- **Simulation** is an occurrent in which a model is run. It produces records *about the model*. They bear on the
  target only through the content that the model fits the target, and that content needs its own grounds
  (Winsberg, *Science in the Age of Computer Simulation*, 2010).
- **Theory-ladenness.** Interpreting a record depends on frames, for example the optics of a telescope or the
  assumptions of an assay (Hanson, *Patterns of Discovery*, 1958). The model makes this dependence explicit: every
  interpretation of a record is a content with its frame and its grounds, so a change of frame shows which
  interpretations it affects.

## 5.3 Data and phenomena

Records and the data derived from them are about particular occasions, and they are full of local noise. Phenomena
are stable features inferred from many records. Theories usually explain phenomena, not data (Bogen and Woodward,
"Saving the phenomena", 1988).

- Data processing (cleaning, normalisation, aggregation, statistical modelling) consists of occurrents governed by
  methods. Each step has assumptions that can fail.
- **The evidential value of data is relational.** The same record can be evidence for different contents under
  different assumptions, and can be reused in contexts its producers did not foresee (Leonelli, *Data-Centric
  Biology*, 2016). The universe therefore stores records with their **production context** and keeps
  interpretations separate.
- A phenomenon's **robustness** is detection by independent methods with different assumptions. It is a central
  ground for accepting the phenomenon (section 5.8, robustness).

## 5.4 Hypothesis

A hypothesis is not a special kind of content. It is a **standing**: a content, model, mechanism or
identification proposed as a candidate for acceptance. A successor frame proposed for adoption is a practical
proposal (D6), assessed through the contents and models formulated in it. Anything representable can be hypothesised:

- "this model fits that target" (fit hypothesis);
- "X causes Y" (causal hypothesis);
- "these two terms express the same concept" (identity hypothesis, section 3.6);
- "this target falls within the model's domain" (scope hypothesis);
- "this test measures that construct" (validity hypothesis);
- "this record is free of contamination" (auxiliary hypothesis).

The universe must also distinguish:

- **how-possibly** hypotheses, which say a mechanism *could* produce the phenomenon, from **how-actually**
  hypotheses, which say it *does* here;
- **working assumptions**, accepted for a purpose without belief (Cohen, *An Essay on Belief and Acceptance*, 1992),
  from **conjectures** put forward for testing. A working assumption is accepted for a stated purpose only.

The auxiliary hypotheses on which a test depends must be representable. Without them it is impossible to say what a
failed prediction refutes. This is the Duhem–Quine problem, and it must be handled in the open.

## 5.5 Causality

The universe distinguishes the following causal and non-causal dependence contents:

| Content | Meaning | Main grounds |
|---|---|---|
| **Association** | variables co-vary in a population | observational data, statistical analysis |
| **Type-level causation** | intervening on X would change Y (or its distribution), relative to a set of variables and background conditions (Woodward, *Making Things Happen*, 2003) | experiments; causal discovery under stated assumptions (Spirtes, Glymour and Scheines, *Causation, Prediction, and Search*, 2000); quasi-experiments |
| **Token / actual causation** | this occurrence of X caused this occurrence of Y (Halpern, *Actual Causality*, 2016) | case analysis, counterfactual reasoning on a causal model |
| **Mechanism** | entities and activities organised so as to produce a phenomenon (Machamer, Darden and Craver, "Thinking about mechanisms", 2000) | intervention on components, imaging, reconstitution |
| **Capacity / power** | a stable tendency of a kind to contribute a characteristic effect across contexts (Cartwright, *Nature's Capacities and their Measurement*, 1989) | cross-context experimentation |
| **Constitution / realisation** | a whole's property depends on its parts' organisation, not by causation over time (Craver, *Explaining the Brain*, 2007) | inter-level experiments |
| **Logical, mathematical or definitional dependence** | not causal | proof, definition |

Causal contents are typically carried by **causal models**: structures of variables with dependence relations that
support three kinds of query. These are association, intervention and counterfactual, which Pearl calls the three
rungs of a "ladder" (Pearl, *Causality*, 2009; Pearl and Mackenzie, *The Book of Why*, 2018). A causal model is a
model in the sense of D7, with a domain of application and a fit relation to targets. This places causality inside
the general treatment of models (D7), not beside it.

**Key rules.**

- An association never becomes a causal content without grounds of a causal kind, such as an intervention, a
  design-based argument or an explicit set of causal assumptions.
- Causal contents are relative to a variable set and to background conditions. Transferring them to another
  population or setting needs grounds of its own (section 6.4).
- Constitution between levels is not causation.

## 5.6 Explanation

Explanation is a relation between an **explanans** (a model, mechanism, law with conditions, or history) and an
**explanandum** (a phenomenon, event or regularity). It holds in a frame and has standing. Its kinds are:

| Kind | Explains by | Source |
|---|---|---|
| **Covering-law** | deriving the explanandum from laws and conditions | Hempel and Oppenheim, "Studies in the logic of explanation", 1948 |
| **Causal-mechanical** | locating the explanandum in a causal structure or mechanism | Salmon, *Scientific Explanation and the Causal Structure of the World*, 1984; Machamer, Darden and Craver, 2000 |
| **Unificationist** | deriving many phenomena from few argument patterns | Kitcher, "Explanatory unification and the causal structure of the world", 1989 |
| **Statistical** | showing the explanandum is probable, or more probable, given conditions | Hempel, *Aspects of Scientific Explanation*, 1965; Salmon, 1984 |
| **Functional** | showing what a trait or part does in a system, or why it was selected | Wright, "Functions", 1973; Cummins, "Functional analysis", 1975 |
| **Structural / mathematical** | showing the explanandum follows from mathematical or structural constraints | e.g. optimal packing explaining hexagonal cells |
| **Historical / evolutionary** | narrating the sequence of events that produced the explanandum | historical sciences (Cleland, "Methodological and epistemic differences between historical science and experimental science", 2002) |

**Rules.**

- An explanation is not the same as a prediction. A model can predict without explaining (an empirical fit) or
  explain without predicting precisely (evolutionary histories).
- Any **explanatory relation that grounds an acceptance** must itself be represented with its standing. This is what
  makes inference to the best explanation inspectable (section 5.7).
- Explanatory coherence, meaning that accepted explanations do not depend on rejected contents, is a coherence
  criterion (C9, section 6.5; Thagard, *Conceptual Revolutions*, 1992).

## 5.7 Inference

An inference is an occurrent that produces a content or a change of standing from premises, under an **inference
type**. The inference types are:

| Type | Character | Validity conditions and failure modes |
|---|---|---|
| **Deductive** | truth-preserving within a frame | valid form; premises true in the same frame. It fails by equivocation across frames |
| **Inductive / statistical** | from samples to populations, or from data to parameters | sampling, model assumptions. It fails by bias or by unrepresentative samples |
| **Abductive / inference to the best explanation** | from phenomena to the hypothesis that best explains them (Peirce, *Collected Papers*, 1931–1935; Lipton, *Inference to the Best Explanation*, 2nd ed., 2004) | the space of rival hypotheses considered. It fails when the true hypothesis was not considered |
| **Analogical** | from a source system to a target with shared structure (Hesse, *Models and Analogies in Science*, 1966; Bartha, *By Parallel Reasoning*, 2010) | relevant similarities; absence of known critical differences. It fails by superficial similarity |
| **Causal** | from data and assumptions to causal structure | causal assumptions such as faithfulness and no unmeasured confounding. It fails when they are violated |
| **Model-based** | calculation or simulation within a model | the model's fit and domain. It fails outside the domain |
| **Testimonial** | from a source's report to a content | the reliability of the source. It fails by error or deception |
| **Recognition** | from new material to an identity relation (section 3.6) | quality of anchors. It fails on homonyms |

**Defeasibility.** Most scientific inference is **defeasible**: new information can withdraw a conclusion. The
universe must represent **rebutting defeaters**, which support the contrary conclusion, and **undercutting
defeaters**, which attack the link between premises and conclusion (Pollock, "Defeasible reasoning", 1987; Reiter,
"A logic for default reasoning", 1980). An undercutter might show, for example, that an instrument was miscalibrated.

**Inferences are recorded as grounds.** A conclusion's standing points to the inference, which points to its
premises and inference type. This makes every conclusion traceable (C4, section 6.5).

## 5.8 Evidence

**Evidence is a relation.** Like every relation the universe represents, an evidential relation is an item
(D1) with its own standing. *E* is evidence for (or against) *H* relative to background *B*:

- *E* is a record, a datum or a phenomenon;
- *H* is a content or model. A frame is assessed through the contents and models formulated in it (D6);
- *B* consists of auxiliary assumptions, the method's validity conditions and the frame (Glymour, *Theory and
  Evidence*, 1980; Achinstein, *The Book of Evidence*, 2001).

The universe must represent the following properties of an evidential relation:

1. **Direction**: supports, undermines or is neutral.
2. **Strength**, with two senses kept apart:
   - *incremental* strength: how much *E* changes the support for *H*, for example a likelihood ratio (Royall,
     *Statistical Evidence: A Likelihood Paradigm*, 1997);
   - *absolute* strength: how well supported *H* is overall. Carnap distinguished these as increase in firmness
     versus firmness (Carnap, *Logical Foundations of Probability*, 2nd ed., 1962).
3. **Severity**: whether *E* would probably have been different if *H* were false (Mayo, *Error and the Growth of
   Experimental Knowledge*, 1996).
4. **Quality**: risks of bias in the production of *E*.
5. **Directness**: whether *E* bears on *H* directly or through a proxy or surrogate endpoint.
6. **Relevance and scope**: whether the population or system *E* comes from matches *H*'s target.
7. **Robustness**: whether the same result is obtained by methods with different assumptions (5.3).
8. **Independence**: whether pieces of evidence share sources, methods or assumptions. **Correlated evidence must not
   be counted as independent.** The same rule applies to this project: several Claude agents agreeing are not
   independent evidence.

How evidence of different kinds should be **combined** (randomised trials, mechanistic studies, observational
data, expert judgement) is an open problem (O6). S0 only requires that the elements needed for any combination
method be represented: direction, strength, severity, quality, directness, relevance, robustness and
independence.

## 5.9 Standing and grounds

**Standing** (D12) applies to any representational item: a content is accepted as true, a model as fitting for a
purpose, a method as reliable, a record as faithful. It has seven dimensions:

| Dimension | Values (indicative, not closed) |
|---|---|
| **Attitude** | entertained · proposed · assumed for a purpose · accepted · rejected · suspended · retracted |
| **Support** | for / against / both / neither (section 4.10), each with a degree whose calculus is deferred (section 4.9) |
| **Holder** | an agent, community, source or the universe itself (D14) |
| **Purpose** | for which purpose an acceptance holds: explanation, prediction, design, regulation, teaching |
| **Standard of acceptance** | the support required for acceptance for this purpose, such as a replication requirement or a severity threshold. It is a methodological norm (D18). Any role of values in setting it is stated here (3.5) |
| **Time** | record time of the standing; any validity interval |
| **Scope** | the targets and conditions over which the standing is meant |

**Grounds** (D13) are the reasons a standing rests on. They form a structure in which grounds have grounds, and
which may contain defeaters. The ground types are:

- **G1 Record or observation**: produced by an occurrent of section 5.2.
- **G2 Inference**: section 5.7.
- **G3 Testimony or source**: with the source's identity and reliability record.
- **G4 Definition or convention**: within a frame.
- **G5 Presupposition**: a commitment in the presupposition role (D19) of a frame or method. It is not itself an
  acceptance: within the frame it is not tested (D6).
- **G6 Recognition judgement**: section 3.6.5.
- **G7 Evidential relation**: a relation of section 5.8 from records or phenomena to the content or model.

Every standing other than "entertained" must have at least one ground (C4).

Standing is **epistemic**. Conative attitudes such as *desired*, *intended* or *required* are a separate kind of
attitude, held by agents towards contents (section 7.4). They are never part of epistemic standing, and they never
count as grounds for it.

## 5.10 Knowledge

In this universe, **knowledge is a standing**: a content, model, method or record that a holder **accepts**, on
**grounds that meet the standard of acceptance** for that kind of item and purpose,
with **no undefeated counter-grounds known to the holder**, within a stated **scope**.

Consequences:

- **Fallibilism.** Knowledge in this sense can be revised. It is not guaranteed to be true. The universe does not
  claim to know in the sense of an infallible justified true belief. The Gettier cases showed that justified true
  belief is not sufficient for knowledge anyway (Gettier, "Is justified true belief knowledge?", 1963). The
  universe only claims to track *acceptance on adequate grounds*, which is what scientific practice can inspect.
- **Standards are themselves represented.** "Adequate grounds" refers to methodological norms (D18), for example a
  required level of replication or a significance or severity threshold. Whether following a norm is reliable is a
  methodological content with standing. Both can be inspected and disputed. The regress of standards for standards
  is not resolved here (O13).
- **Knowledge has several forms.** Knowing *that* is carried by contents and models. Knowing *how* is carried by
  methods and practices (Ryle, *The Concept of Mind*, 1949). Acquaintance with particulars is carried by records and
  exemplar anchors. Tacit knowledge resists full articulation (Polanyi, *The Tacit Dimension*, 1966). The universe
  can represent that such knowledge exists, and who holds it, without fully stating it (O15).
- **Settled versus frontier.** The universe can tell well-established knowledge, with high support from robust,
  independent grounds over a long time, from frontier claims. It can do so without a separate category, by reading
  the dimensions of standing.

## 5.11 Practical decision and practical grounds

Practical decision is the fifth plane of section 3.5. A **decision** (D18) is a holder's choice of an action, design
or intervention. It rests on **practical grounds** of four kinds:

- **PG1 Accepted contents**, including causal and model-based contents about what an action would bring about, and
  evaluative contents about how options meet criteria (7.4).
- **PG2 Goals** of the holder, or of those on whose behalf the holder acts.
- **PG3 Norms** that apply: regulations, standards, protocols.
- **PG4 Values** and their weights, which rank the expected outcomes.

Rules:

- A decision's grounds are recorded like epistemic grounds, so design rationale and advice can be traced
  ("option A chosen because …").
- **PG2–PG4 never ground an epistemic standing** (section 3.5). A decision can rest on a content accepted for a
  purpose with a purpose-relative standard. That standard is part of the content's standing, not of the decision.
- A decision does not change what is true. When its outcome is observed, the result is a record, and the contents it
  supports bear on the contents in PG1. This is how practical experience feeds back into knowledge, as when a design
  failure revises a structural model.
- How options are compared, whether by expected value, satisficing, dominance or multi-criteria methods, is
  methodological knowledge (chapter 7). S0 does not fix it (O10).
