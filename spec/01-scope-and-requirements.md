# 1. Scope, requirements and method

## 1.1 Purpose of S0

S0 defines the **scientific semantic universe**: what its meanings are, which kinds of things it can be about, how
meanings are composed, qualified and revised, how knowledge is told apart from observation, hypothesis, evidence and
inference, and how the universe can grow without losing coherence. S0 is a conceptual specification. It describes
*what must be representable and how the parts relate*. It does not describe *how a computer will store or process
it*.

Under the mission's principle, the computational architecture (S1) must follow from this specification, never the
other way round. Every requirement S1 receives should therefore be traceable to a thesis, definition or criterion in
S0.

## 1.2 Requirements derived from the mission

The requirements below restate the mission (`MISSION.md`) as checkable obligations. Each chapter says which ones it
addresses, and chapter 9 gives the traceability matrix.

| Id | Requirement | Mission source |
|---|---|---|
| R1 | Represent scientific knowledge from any domain, not only products or categories already known. | "general"; "do not limit the design to the world of products or to already known categories" |
| R2 | **Acquire** content and concepts from outside: texts, data, experts and its own inquiry. | "acquire" |
| R3 | **Understand** content: place it among what is already represented, with its presuppositions and consequences. | "understand" |
| R4 | **Connect** content across domains, frames and levels of description. | "connect" |
| R5 | **Verify** content against evidence and against coherence criteria. | "verify" |
| R6 | **Update** and revise content without losing coherence or history. | "update"; "revise earlier knowledge … without losing coherence" |
| R7 | **Reuse** knowledge for new questions and new cases. | "reuse" |
| R8 | Learn entirely new concepts and domains. | "learn entirely new concepts and domains" |
| R9 | Recognise knowledge already acquired, including when it is expressed differently. | "recognise knowledge it has already acquired" |
| R10 | Transfer principles across domains when, and only when, conditions allow. | "transfer scientific principles when conditions allow" |
| R11 | Represent concepts, entities, processes, phenomena, events, properties and relations. | list item 2 |
| R12 | Represent context, time, change, conditions, quantities, negation, possibility and uncertainty. | list item 4 |
| R13 | Distinguish knowledge, observation, hypothesis, explanation, causality, evidence and inference. | list item 5 |
| R14 | Represent methodological knowledge: how to investigate and how to learn. | list item 7 |
| R15 | Support a later adviser that understands human goals, investigates phenomena and solutions, interprets evidence and evaluates products or interventions. | paragraph 2 |
| R16 | Assume no architecture: no database, graph, table, vector, logic engine or software structure, and no model based on assertions by presupposition. | "do not start from …"; "do not presuppose a model based on assertions" |
| R17 | Ground the analysis in general principles of semantics, knowledge representation, epistemology, logic, cognitive science and scientific methodology, with sources. | paragraph 5 |
| R18 | Explain what meaning is and how it is identified. | list item 1 |
| R19 | Explain how meaning is composed. | list item 3 |
| R20 | State what remains open, and how adequacy can be verified. | "first deliverable" |

## 1.3 Non-goals of S0

S0 does not choose a storage model, a data format, an implementation language, a logic, a reasoning engine, a
probability calculus or an algorithm. Where a choice of this kind will be needed in S1, S0 states the
**semantic obligations** the choice must satisfy and marks the choice as deferred. S0 does not specify the full
knowledge cycle (S2) or the verification plan for a built system (S3). Chapter 9 only explains how the adequacy of
*this specification* can be checked.

## 1.4 Method

The work followed six steps.

1. **Requirement derivation** (section 1.2).
2. **Survey of genuine alternatives**, covering theories of meaning, the primary unit of scientific content,
   ontological scaffolds, the representation of epistemic states and the theory of revision. Each alternative was
   judged against the requirements, not against familiarity (chapter 2).
3. **Synthesis** of a model in which every component is justified by at least one requirement and one body of
   theory (chapters 3–7).
4. **Conceptual checks** on examples from unrelated scientific domains, recording where the model is strained as
   well as where it works (chapter 8).
5. **Adequacy criteria** and a procedure that people other than the designer can apply (chapter 9).
6. **Open problems** and the exact status of formal properties (chapter 10).

Conventions used throughout:

- Theses are numbered **T1…**, definitions **D1…**, coherence criteria **C1…**, open problems **O1…**, examples
  **E1…**. Chapters refer to them by these labels.
- Sketches written in the form `⟨ … ⟩` are **non-normative illustrations**. They are not a syntax, a data format or
  a schema, and S1 is not bound by them.
- "Must" marks an obligation on any later representation. "May" marks something permitted but not required.

## 1.5 Limits of the method

- **Single designer.** The specification was written by one AI system (Claude, working in a Claude Code session).
  It has had no review by independent people. Where another Claude instance critiqued a draft (see the change log in
  `README.md`), that critique is **not** independent validation and is not offered as such.
- **Sources.** The theoretical sources are cited by author, title and year from the designer's general scholarly
  knowledge. No third-party full texts were retrieved, stored or quoted at length. Bibliographic details were not
  all re-checked against the originals in this session, so the owner or a reviewer should spot-check them before
  relying on a specific citation.
- **Examples are not evidence.** Every example in this document was used while designing the model (chapter 8).
  Under the project rules, these examples can never count as independent evidence of the model's adequacy.
  Chapter 9 requires held-out cases chosen by someone other than the designer.

## 1.6 Independence statement

- This specification was designed from first principles for this repository. It is not a fork or continuation of any
  earlier project.
- Only this repository's own files were read: `MISSION.md`, `CLAUDE.md`, `README.md` and `spec/README.md`. No other
  repository, earlier design document or earlier report of the owner was read, cloned, searched or quoted.
- The session environment exposed unrelated connectors (for example a meeting-notes service and a music-player
  service). None of them was used.
- No earlier material of the owner reached the designer through the prompt, the environment or tool results.
- The designer's general training may include public texts that it cannot list. It has no awareness of having
  drawn on any earlier work of the owner. The separate comparison with earlier work, which the owner plans for after
  the freeze, is the appropriate check on this point.
