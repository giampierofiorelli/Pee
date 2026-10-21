# 9. How the adequacy of this specification can be verified

Requirement addressed: R20.

## 9.1 What is being verified

This chapter is about the adequacy of **the S0 semantic model**: whether it can represent scientific knowledge with
the distinctions the mission requires, without distortion. It is not a verification plan for a built system. That
is stage S3, which is not authorised.

Verification must be done by **people other than the designer**. As stated in section 1.5, the designer's own
examples (chapter 8) are not evidence, and agreement among Claude agents is not independent validation.

## 9.2 Traceability of requirements

| Req. | Where addressed |
|---|---|
| R1 general scope | T11; 3.7; chapter 8 (illustration only, not evidence) |
| R2 acquire | 6.1 |
| R3 understand | 3.4; 3.5; 4.1; 5.1 |
| R4 connect | D6 intertheoretic mappings; 3.5.1; 4.3 lifting; Op8 |
| R5 verify | 5.8; 5.9; 6.5 |
| R6 update | 6.3; T8 |
| R7 reuse | 6.4 |
| R8 learn new concepts and domains | 6.1 (M1–M6; new domains) |
| R9 recognise | 3.5; 6.2 |
| R10 transfer under conditions | 6.4 (TC1–TC5) |
| R11 concepts, entities, processes, phenomena, events, properties, relations | D2; 3.7 |
| R12 context, time, change, conditions, quantities, negation, possibility, uncertainty | 4.3–4.10 |
| R13 knowledge, observation, hypothesis, explanation, causality, evidence, inference | chapter 5 |
| R14 methodological knowledge | chapter 7 |
| R15 support for a later adviser | 7.4; D10 evaluative content |
| R16 no presupposed architecture; not assertion-based | 1.3; T1; 2.3; 3.6; notation disclaimer in 1.4 |
| R17 theoretical grounding | chapter 2; citations throughout; `references.md` |
| R18 what meaning is and how it is identified | 3.3–3.5 |
| R19 composition | 4.1 |
| R20 open problems; verification | chapters 9 and 10 |

The matrix shows only that every requirement is *addressed*. Whether each is addressed *adequately* is what the
procedures below test.

## 9.3 Adequacy criteria

| Id | Criterion | Passes when |
|---|---|---|
| AQ1 **Coverage** | scientific knowledge from varied domains can be represented without inventing new meta-level notions | held-out cases (V2) need no addition to D1–D16, or the additions needed are minor and local |
| AQ2 **Distinction preservation** | distinctions scientists draw are kept | minimal pairs (V3) receive distinct representations |
| AQ3 **Identity behaviour** | sameness and difference of meaning are judged with appropriate grades, including "undetermined" | recognition cases give the relations experts endorse, or "undetermined" where experts disagree |
| AQ4 **Revision behaviour** | historical changes can be replayed with correct levels and lineages, and without losing interpretability | replayed episodes (V5) match expert historical accounts |
| AQ5 **Transfer behaviour** | licensed transfers are permitted and unlicensed ones refused, for stated reasons | transfer cases match expert judgement on licensing |
| AQ6 **Composition** | composite meanings follow from their parts and modes, and departures are explicit | composite representations in V2 and V3 cases can be derived from the parts and the named operation, and encoders agree on them |
| AQ7 **Non-assertion basis** | models, practices and records are not secretly reduced to stocks of sentences | in held-out cases, encoders make substantive use of models, records and methods. The comparison with P2 (V6) shows whether a statement-based encoding loses information. If it loses none, this counts against AQ7 |
| AQ8 **Architecture neutrality** | nothing in S0 forces a particular database, language or engine | reviewers find no hidden commitment, or the commitments found are justified semantically |
| AQ9 **Clarity** | independent encoders interpret the specification consistently | inter-encoder agreement on key decisions reaches a threshold fixed in advance (V2) |

## 9.4 Procedures

**V1 Requirement audit.** Reviewers with expertise in semantics, philosophy of science and scientific practice check
each requirement against the specification and record gaps. This is the minimum step before approval.

**V2 Held-out case encoding.**

1. Someone other than the designer, preferably the owner or invited domain experts, chooses a set of cases from
   domains and kinds of knowledge **not used in chapter 8**. The priority areas are listed at the end of
   section 8.14. Each case is a short piece of scientific material with a fixed set of questions.
2. The cases, the questions and the scoring rules are **fixed before** any encoding starts.
3. At least two encoders independently represent each case in structured natural language, using only this
   specification. If AI systems are used as encoders, copies of the same model family count as **one** encoder,
   not several.
4. Agreement on key decisions (category, relation between meanings, standing, placement of qualifiers, level of
   revision) is measured with a chance-corrected coefficient (Cohen, "A coefficient of agreement for nominal scales",
   1960; Krippendorff, *Content Analysis*, 2nd ed., 2004).
5. Disagreements are analysed to tell ambiguity in the specification apart from genuine difficulty in the case.

**V3 Minimal-pair tests.** Pairs of contents that scientists distinguish, for which the specification must force
distinct representations:

- generic versus universal;
- statistical population claim versus individual claim;
- chance versus credence;
- negative result versus evidence of absence;
- measured absence versus gap;
- association versus causation;
- data versus phenomenon;
- rated versus realised performance;
- co-extensive concepts with different roles;
- epistemic versus nomological "may";
- world change versus revision in the universe;
- an attributed content versus the same content adopted.

A pair fails if two reasonable encoders, following the specification, could represent both members identically.

**V4 Competency questions.** Following ontology-engineering practice (Grüninger and Fox, "Methodology for the design
and evaluation of ontologies", 1995), the following questions must be expressible, and answerable in principle from a
representation built under this specification:

- *On what grounds, held by whom and since when, is content X accepted?*
- *Which standings depend on method M, record R or source S?*
- *In which frames is Y possible, and in which is it excluded?*
- *Which concepts in frame F correspond to concept c in frame G, on which domain, with which relation?*
- *Is the transfer of principle P to target T licensed? If not, which condition fails?*
- *What did the universe hold about Z at a given past time, and what changed it?*
- *Which contents are idealisations, and in which respects do their fit limitations apply?*
- *What are the comparator, conditions, goal and holder of this evaluation?*

The list is a starting set and must be extended by the reviewers.

**V5 Replay of historical revisions.** Episodes of conceptual change not used in design are replayed. The
specification passes if it assigns appropriate revision levels and lineage forms, and if it keeps the earlier state
interpretable. Candidate episodes include the reclassification of Pluto (2006), the neutrino hypothesis, *Helicobacter
pylori* and peptic ulcers, the luminiferous ether, and germ theory. Because the designer proposed these candidates,
the final selection should be made by others.

**V6 Comparison with rivals.** The same held-out cases are encoded under rival P1 (conceptual spaces with events) and
rival P2 (statement-based formal ontology with probabilistic annotations), both described in section 2.7. The
results are compared on AQ1–AQ7. If P2 does as well as this proposal on every criterion, the departure from an
assertion-based model is **not justified by the evidence**, and that result must be reported.

**V7 Adversarial review.** Reviewers try to build cases the model cannot represent, or represents misleadingly. Each
successful case becomes either a revision of S0 (a new version) or a recorded open problem.

**V8 Derivability check (at S1).** When S1 is proposed, each computational choice is traced to the S0 obligations it
serves. A computational choice that serves none, or that contradicts one, is flagged. This enforces the mission's
principle that the architecture derives from the semantic universe.

## 9.5 What would show that S0 is inadequate

The specification should be revised, or rejected, if any of the following is found:

1. A common class of scientific knowledge cannot be represented without new **meta-level** notions. Additions to
   the scaffold do not count, since the scaffold is revisable by design.
2. Inter-encoder agreement on the core distinctions stays below the threshold fixed in advance, even after the
   text has been clarified.
3. Minimal pairs (V3) collapse under faithful use of the specification.
4. The coherence criteria C1–C12 turn out to be mutually inconsistent, or impossible to check in principle under any
   reasonable S1 choice.
5. Rival P2 performs as well on all criteria (V6).
6. Historical replays (V5) systematically misplace the level of revision, or lose the interpretability of older
   knowledge.

## 9.6 Safeguards for independence

- Cases and scoring are fixed **before** encoding, and they are chosen by someone other than the designer.
- A held-out case that is used to revise the specification becomes a **design example**. It must be replaced by a
  new held-out case for the next round.
- Agreement between AI systems of the same family is reported, if at all, as a single source.
- All verification results, including failures, are recorded with the version of the specification they apply to.
