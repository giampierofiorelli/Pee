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
| R1 general scope | T1, T11; 3.4; 3.8; chapter 8 (illustration only, not evidence) |
| R2 acquire | 6.1 |
| R3 understand | 3.5; 3.6; 3.7; 4.1; 5.1 |
| R4 connect | D6 intertheoretic mappings; 3.6.3; 4.3 lifting; Op8 |
| R5 verify | 5.8; 5.9; 6.5 |
| R6 update | 6.3; T8 |
| R7 reuse | 6.4 |
| R8 learn new concepts and domains | 6.1 (M1–M6; new domains); 3.6.2 (new concept versus meaning change) |
| R9 recognise | 3.6.5; 6.2 |
| R10 transfer under conditions | 6.4 (TC1–TC5) |
| R11 concepts, entities, processes, phenomena, events, properties, relations | D2; 3.8 |
| R12 context, time, change, conditions, quantities, negation, possibility, uncertainty | 4.3–4.10 |
| R13 knowledge, observation, hypothesis, explanation, causality, evidence, inference | chapter 5 |
| R14 methodological knowledge | chapter 7; D16 |
| R15 support for a later adviser | D17, D18; 3.5; 5.11; 7.4 |
| R16 no presupposed architecture; not assertion-based | 1.3; T1; 3.4 (pluralism; storage left to S1); notation disclaimer in 1.4. Describing items by contents at the meta-level is allowed (T1). It is not a storage commitment |
| R17 theoretical grounding | chapter 2; citations throughout; `references.md` |
| R18 what meaning is and how it is identified | 3.3; 3.6; 3.7 |
| R19 composition | 4.1 |
| R20 open problems; verification | chapters 9 and 10 |

The matrix shows only that every requirement is *addressed*. Whether each is addressed *adequately* is what the
procedures below test.

## 9.3 Adequacy criteria

| Id | Criterion | Passes when |
|---|---|---|
| AQ1 **Coverage** | scientific knowledge from varied domains can be represented without inventing new meta-level notions | held-out cases (V2) need no addition to D1–D19, or the additions needed are minor and local |
| AQ2 **Distinction preservation** | distinctions scientists draw are kept | minimal pairs (V3) receive distinct representations |
| AQ3 **Identity behaviour** | sameness and difference of meaning are judged with appropriate grades, including "indeterminate" | recognition cases give the relations experts endorse, or "indeterminate" where experts disagree |
| AQ4 **Revision behaviour** | historical changes can be replayed with correct classes of revision and lineages, and without losing interpretability | replayed episodes (V5) match expert historical accounts |
| AQ5 **Transfer behaviour** | licensed transfers are permitted and unlicensed ones refused, for stated reasons | transfer cases match expert judgement on licensing |
| AQ6 **Composition** | composite meanings follow from their parts and modes, and departures are explicit | composite representations in V2 and V3 cases can be derived from the parts and the named operation, and encoders agree on them |
| AQ7 **Non-reduction** | each item keeps its own correctness condition (3.4); no kind is forced into another | encoders assign kinds by correctness condition without discretion that changes conclusions; the comparison with P2+ (9.7.4) shows whether pluralism reduces discretion (FC6). Equal expressive power is expected and is not a failure (3.4) |
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
specification passes if it assigns appropriate revision classes and lineage forms, and if it keeps the earlier state
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
5. Rival P2+, given S0's distinctions, performs as well on all criteria, including determinacy (V6, 9.7.4). In that
   case the pluralism of section 3.4 would be a matter of organisation only, and that would have to be stated.
6. Historical replays (V5) systematically misplace the class of revision, or lose the interpretability of older
   knowledge.

## 9.6 Safeguards for independence

- Cases and scoring are fixed **before** encoding, and they are chosen by someone other than the designer.
- A held-out case that is used to revise the specification becomes a **design example**. It must be replaced by a
  new held-out case for the next round.
- Agreement between AI systems of the same family is reported, if at all, as a single source.
- All verification results, including failures, are recorded with the version of the specification they apply to.

## 9.7 Evaluation protocol for S0 2.0

This protocol is short and falsifiable. It replaces the order of procedures V1–V8 for the evaluation of 2.0. Those
procedures remain available as a menu. The protocol **has not been run**. It is designed so that the cases are not
chosen by the designer and so that the alternatives are compared fairly.

### 9.7.1 Selection of cases

1. **Fields.** Use the six broad fields of the OECD Fields of Research and Development classification: natural
   sciences; engineering and technology; medical and health sciences; agricultural and veterinary sciences; social
   sciences; humanities and the arts. In each, draw one subfield at random. The draw uses the value of a public randomness
   beacon, for example the NIST Randomness Beacon, at a time stated in the run record. The record, including the
   search definition of step 2, is committed before that time. To remove the designer's influence further, the search
   definition and the beacon time should preferably be fixed by someone other than the designer.
2. **Cases.** For each drawn subfield, the case is the most recent open-access research article in that subfield found
   by a fixed public search, defined in the run record before the draw, and published before the run date. Only
   metadata, short quotations and the encoder's own summary are stored, never the full text.
3. **Coverage of the review's weak areas.** If mathematics, qualitative social research, engineering design or
   data-intensive science is not represented after step 2, one more case is drawn for each missing area by the same
   rule. The total is therefore six to ten cases.
4. **No reuse.** E1–E11 and H1–H11 are excluded. A case used to revise S0 becomes development material for later
   rounds.

### 9.7.2 What is encoded

For each case the encoder identifies, using only the specification:

- every representational item, with its kind by correctness condition (3.4) and its role in the inquiry (D19);
- the standings, grounds and decisions, kept on their separate planes (3.5);
- every change or comparison of concepts, classified by section 3.6.2 or 3.6.3, with the dimensions that justify it;
- every conclusion that depends on an indeterminate case, marked as such.

### 9.7.3 Failure conditions (fixed now)

| Id | Condition | Consequence |
|---|---|---|
| FC1 | A case needs a meta-level notion beyond D1–D19 | AQ1 fails for that field. Two or more fields failing is a structural failure. |
| FC2 | An item fits no kind of section 3.4, or fits two kinds whose consequences differ, with no criterion to choose | FD1 fails. |
| FC3 | A concept change or comparison receives two different outcomes from faithful encodings, and neither encoding records "indeterminate" | FD3 is not determinate enough. |
| FC4 | Section 3.6.2 yields "indeterminate" for a change that the field's literature treats as clearly resolved, either because A and G conflict (step 2), or because the evidence named as settling the case (step 3) is in fact available in the case material | FD3 is too weak, or its outcomes diverge from expert judgement. |
| FC5 | The five planes cannot be kept apart without misrepresenting the case, for example a decision forced into an epistemic standing | FD2 fails. |
| FC6 | On the points where S0 1.0 or P2+ leave the encoder discretion, 2.0 leaves as much or more | The claim of determinacy in section 3.4 fails. |
| FC7 | A determinate identity verdict (same or distinct) where the field's literature is contested | The criteria are overconfident: they suppress a real controversy. |
| FC8 | A determinate verdict contrary to a clear verdict in the literature: **same** where experts treat the concepts as distinct (**unjustified merger**), or **distinct** where they treat them as one (**unjustified separation**) | The criteria are wrong for that kind of case. |

### 9.7.4 Fair comparison

Each case is also encoded under:

- **S0 1.0**, at commit `d82f95f`;
- **P2+**, a statement-based ontology with contexts, provenance and versioning. It is given S0's distinctions, so
  that the comparison isolates pluralism and the identity criteria;
- **P1**, conceptual spaces with events.

The comparison counts, for each framework:

- the key points it cannot represent;
- the points of encoder discretion that change a conclusion;
- the distinctions it collapses.

If P2+ equipped with S0's distinctions does as well as 2.0 on all three counts, this is reported. It would confirm
that pluralism is a semantic organisation with no gain in determinacy (FC6).

### 9.7.5 Internal and external parts

- **Internal run (cheap; can be done in one session).** The designer encodes every case. A second instance of the
  same model family encodes blind, and its agreement is used **only** to detect ambiguity in the specification.
  It counts as **one** source, together with the designer. All results are labelled internal evaluation.
- **External validation (optional; not executed).** Two or more human encoders not involved in the project encode the
  same cases. Agreement on key decisions is measured with Krippendorff's α. Conventional benchmarks are α ≥ 0.800
  for reliable conclusions and α ≥ 0.667 for tentative ones (Krippendorff, *Content Analysis*, 2004). This is a
  published convention, not a threshold chosen for S0. External validation is the only form of evidence that this
  specification can be applied consistently by others. It is not a condition the designer can satisfy alone.

### 9.7.6 Note on V3 and V4

The minimal pairs (V3) and competency questions (V4) of section 9.4 were written by the designer, so they hardly
refute the specification (review of 1.0, section 2.2). In the internal run they are supplemented by pairs and
questions derived from the drawn cases. In an external run they should be written by the external encoders.
