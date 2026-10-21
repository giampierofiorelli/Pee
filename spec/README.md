# S0 — Foundational specification of the scientific semantic universe

| | |
|---|---|
| **Version** | S0 1.0 |
| **Frozen** | 2026-10-21 |
| **Status** | Frozen; submitted for the owner's approval. **Not approved yet.** S1 has not started. |
| **Git tag** | `s0-v1.0` |

## What this is

S0 is the conceptual specification of a general scientific semantic universe, as required by `MISSION.md`. It
defines:

- what a meaning is and how it is identified;
- what the universe can be about;
- how meanings are composed, qualified and revised;
- how knowledge is told apart from observation, hypothesis, explanation, causality, evidence and inference;
- how methodological knowledge is represented;
- how the adequacy of all this can be checked.

It does **not** prescribe a database, a data format, an implementation language, a logic engine or an uncertainty
calculus. Where S1 will need such choices, S0 states the semantic obligations they must satisfy.

**In one sentence:** *anchored-role semantics in a model-centred universe.* A concept's meaning is its role in a
frame together with its anchors to the world. Theory is carried mainly by models of target systems. How a content
is held (its standing) is kept separate from what it says, and always carries grounds. Revision, including revision
of meaning, is recorded and never silent.

## Reading order

| File | Content |
|---|---|
| [01-scope-and-requirements.md](01-scope-and-requirements.md) | Purpose, requirements R1–R20, non-goals, method, limits, independence statement |
| [02-alternatives.md](02-alternatives.md) | Theories compared (A1–A12, U1–U4, S1–S4, E-a–E-f, V-a–V-e), decisions, rival proposals |
| [03-model-of-meaning.md](03-model-of-meaning.md) | Theses T1–T11, meta-level D1–D16, what a meaning is, identity and recognition, ontological scaffold |
| [04-composition-and-qualification.md](04-composition-and-qualification.md) | Composition operations Op1–Op10; generality, context, time, change, conditions, quantities, possibility, uncertainty, negation |
| [05-epistemic-distinctions.md](05-epistemic-distinctions.md) | Observation, data and phenomena, hypothesis, causality, explanation, inference, evidence, standing and grounds, knowledge |
| [06-evolution-and-coherence.md](06-evolution-and-coherence.md) | Acquisition (M1–M6), recognition, layered revision (L1–L6), lineage, transfer (TC1–TC5), coherence criteria C1–C12 |
| [07-methodological-knowledge.md](07-methodological-knowledge.md) | Methods, questions, goals, values and evaluation; the universe's knowledge of its own methods |
| [08-domain-checks.md](08-domain-checks.md) | Conceptual checks E1–E11 in eleven domains (design examples, **not evidence**) |
| [09-adequacy-verification.md](09-adequacy-verification.md) | Traceability, adequacy criteria AQ1–AQ9, procedures V1–V8, conditions for refutation |
| [10-open-problems.md](10-open-problems.md) | Open problems O1–O17; exact status of formal properties |
| [references.md](references.md) | Sources by author, title and year |

## Normative status

- **Normative:** theses (T), definitions (D), composition operations (Op), distinctions and rules in chapters 4–7,
  coherence criteria (C), transfer conditions (TC), adequacy criteria (AQ).
- **Illustrative:** the examples, and every sketch written as `⟨ … ⟩`. These are not a syntax or a schema, and S1 is
  not bound by them.
- **Open:** everything listed in chapter 10.

## Change policy after freeze

The text of version 1.0 is fixed. Any change creates a new version, recorded below:

- **1.x** for clarifications and corrections that do not change any thesis, definition or criterion;
- **2.0** for changes to theses, definitions or criteria.

A change prompted by a verification case turns that case into a design example (section 9.6).

## Provenance

- Written from first principles by one AI designer (Claude, in a Claude Code session) for the owner of this
  repository.
- No earlier material of the owner was read or used (section 1.6).
- Before the freeze, one other Claude instance reviewed a draft adversarially. Its findings were used to correct
  cross-references, wording and citations. **This internal review is not independent validation.** Independent
  verification is described in chapter 9 and has not yet been done.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-21 | First complete specification, frozen and submitted for the owner's approval. |
