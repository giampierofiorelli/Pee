# S0 — Foundational specification of the scientific semantic universe

| | |
|---|---|
| **Version** | S0 2.1 |
| **Date** | 2026-10-21 |
| **Status** | Complete as a text, internally reviewed, not validated. Submitted for the owner's approval. **Not approved.** S1 has not started. |
| **Text of 2.1** | the commit that adds this line; recorded in the 2.1 verification run (`reviews/S0-2.1-verification-run.md`). |
| **Earlier versions** | S0 2.0 at commit `b9bda7d` (verified in `reviews/S0-2.0-verification-run.md`, commit `39f291e`); S0 1.0 at commit `d82f95f` (reviewed in `reviews/S0-1.0-critical-review.md`). Neither was approved. |

## What this is

S0 is the conceptual specification of a general scientific semantic universe, as required by `MISSION.md`. It
defines:

- what a meaning is and how it is identified;
- what kinds of representational item the universe holds;
- how meanings are composed, qualified and revised;
- how concepts keep or lose their identity through change;
- how knowledge is told apart from observation, hypothesis, explanation, causality, evidence and inference;
- how meaning, correctness, justification, acceptance and practical decision are kept apart;
- how methodological and practical knowledge (goals, norms, values, designs, actions) is represented;
- how the adequacy of all this can be checked.

It does **not** prescribe a database, a data format, an implementation language, a logic engine or an uncertainty
calculus. Where S1 will need such choices, S0 states the semantic obligations they must satisfy.

**In one sentence:** *anchored-role semantics in a pluralist representational universe.*

- Contents, models, records, methods, practices, designs, goals and norms are co-fundamental kinds of item,
  distinguished by what makes each correct.
- A concept's meaning is its role profile, with graded centrality, together with its anchors in the world and its
  epistemic goals.
- Concepts keep or lose identity by one procedure, for change and for coexistence: category, continuity of anchors,
  inclusion of goals robust across granularity, and extension. Contested and indeterminate cases are recorded as such.
- Standing is kept apart from content, and decisions from acceptance. Revision is recorded and never silent.

## Reading order

| File | Content |
|---|---|
| [01-scope-and-requirements.md](01-scope-and-requirements.md) | Purpose, requirements R1–R20, non-goals, method, limits, independence statement |
| [02-alternatives.md](02-alternatives.md) | Theories compared; decisions of 1.0 and their status; **foundational decisions FD1–FD4 of 2.0 with their alternatives** (2.8) |
| [03-model-of-meaning.md](03-model-of-meaning.md) | Theses T1–T11; meta-level D1–D19; pluralism by correctness condition; five planes; identity, change and relations between frames; ontological scaffold |
| [04-composition-and-qualification.md](04-composition-and-qualification.md) | Composition Op1–Op10; generality, context, time, change, conditions, quantities, possibility, uncertainty, negation |
| [05-epistemic-distinctions.md](05-epistemic-distinctions.md) | Observation, data and phenomena, hypothesis, causality, explanation, inference, evidence, standing and grounds, knowledge, practical decision |
| [06-evolution-and-coherence.md](06-evolution-and-coherence.md) | Acquisition (M1–M6), recognition, revision and entrenchment, lineage, transfer (TC1–TC5), coherence C1–C12 |
| [07-methodological-knowledge.md](07-methodological-knowledge.md) | Methods, questions, goals, norms, values, designs, actions and evaluation |
| [08-domain-checks.md](08-domain-checks.md) | Design examples E1–E11 and development re-checks of the review cases (**not evidence**) |
| [09-adequacy-verification.md](09-adequacy-verification.md) | Traceability, adequacy criteria, procedures, and the **evaluation protocol for 2.0** (9.7) |
| [10-open-problems.md](10-open-problems.md) | Open problems O1–O18; exact status of formal properties |
| [references.md](references.md) | Sources by author, title and year, with their verification status |

## Normative status

- **Normative:** theses (T), definitions (D), composition operations (Op), the distinctions and rules in chapters
  3–7, coherence criteria (C), transfer conditions (TC), adequacy criteria (AQ) and the protocol of section 9.7.
- **Illustrative:** the examples, and every sketch written as `⟨ … ⟩`. These are not a syntax or a schema, and S1 is
  not bound by them.
- **Open:** everything listed in chapter 10.

## From 1.0 to 2.0: traceability

| Finding of the review of 1.0 | Decision or change in 2.0 | Where |
|---|---|---|
| F3: model primacy (T1) is organisational | Pluralism by correctness condition; no expressive superiority claimed; storage left to S1 | FD1; T1; 3.4 |
| Degenerate models are not justified | Withdrawn. Observations produce records; their interpretations are situated contents | FD1; D7; D11 |
| F5 (H1, H11): core/collateral not operational | Graded centrality; identity by continuity of anchors, goals and extension; "indeterminate" by rule; reading-dependence | FD3; D5; 3.6 |
| SP3: frames not individuated | Frames individuated by constitutive commitments, using the criterion "presupposed rather than tested" | FD3; D6 |
| Entrenchment tied to level | Entrenchment as dependence plus robustness, whatever the class of revision | FD3; 6.3 |
| SP4: practical knowledge attached rather than integrated | Direction of fit; designs, goals, norms, values, decisions and actions; five planes; practical grounds | FD1; FD2; D17; D18; 3.5; 5.11; 7.4 |
| LD1–LD11 | Integrated after FD1–FD3 | FD4 (table in 2.8) |
| Bibliographic findings | Lewis attribution, Turing year and Dagum–Luby claim corrected; verification status stated | `references.md`; 3.3; 10.2 |

## Provenance

- Written from first principles by one AI designer (Claude, in Claude Code sessions) for the owner of this repository.
  No earlier material of the owner was read or used (section 1.6).
- Version 1.0 had one internal review by another Claude instance before its freeze. Version 2.0 follows the
  designer's own preregistered critical review of 1.0, and its draft was checked for consistency by another Claude
  instance before completion. **None of these is independent validation.**
- No independent person has reviewed either version. External validation is optional and has not been carried out
  (section 9.7.5).

## Change policy

Any change to this text creates a new version, recorded below. Use **2.x** for clarifications and corrections that
change no thesis, definition or criterion, and **3.0** for changes to theses, definitions or criteria.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-21 | First complete specification, frozen at commit `d82f95f`. Not approved. |
| 2.0 | 2026-10-21 | Foundational revision authorised by the owner after the critical review of 1.0. See "From 1.0 to 2.0" above, and section 2.8. |
| 2.1 | 2026-10-21 | Bounded correction of the identity rules after the 2.0 verification run found a structural defect in them. Changed: D4 (anchors of own instances), D5-b (requirement condition, admissible granularity), section 3.6 (category check, exhaustive anchor continuity, goal inclusion for change and coexistence, robustness across granularity, identity verdict and extension relation as separate outputs, elimination and split, contested cases, two structural relations), T3. Dependencies: FD5 (2.8), the lineage table (6.3), E2 and the new 8.16 (regression check), FC7–FC8 (9.7.3), O1 and O11 (10.1), labels (1.4). Nothing else changed. |
