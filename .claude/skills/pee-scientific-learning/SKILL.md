---
name: pee-scientific-learning
description: Working discipline for building PEE's scientific semantic universe into a cumulative, general scientific-learning system. Use when planning, implementing, testing or reporting any S1 or later work on representation, acquisition, inference, transfer, revision or evaluation of scientific knowledge, and when deciding whether a result counts as learning, generalisation or validation.
---

# PEE scientific learning

**Origin.** Selective transfer, authorised by the owner on 2026-10-21 after S0 was frozen, of reusable lessons from
an earlier project's skill (`giampierofiorelli/Crawler` at `7d091ef`: `pee-guided-learning/SKILL.md` §0, §2a.19–20,
§2b, §2c; `references/generalization-method.md`; `references/evaluation-and-reporting.md`). Only the principles were
kept and adapted. Its phases, storage design, module names, roadmap, hooks, code, private data and
product-buying restrictions were deliberately left out. S0 (`spec/`) remains the semantic authority; this skill
never overrides it.

**What this is.** A method. It is not proof that any capability exists, not a roadmap and not an authorisation:
the owner's current brief decides what may be built.

## 1. The mission in one paragraph

PEE must become a **cumulative scientific-learning system**. Its knowledge (concepts, quantities, mechanisms,
models, conditions, evidence, uncertainty), its past inquiries (successes, failures, counterexamples, open questions)
and its methods must progressively improve its ability to understand goals, investigate, interpret evidence,
evaluate interventions and study domains it has never seen, **without losing demonstrated capabilities**.

## 2. Two kinds of rule — keep them apart

| | Who carries it out | Counts as PEE capability? |
|---|---|---|
| **Development discipline** (section 3) | Claude, while building and evaluating | Never |
| **Runtime capabilities** (section 4) | PEE's own code, without Claude at runtime | Only when the code performs it and it is measured |

Claude understanding a text, deriving a result or spotting a counterexample is not PEE doing so.

## 3. Development discipline (for Claude)

**3.1 Design before implementation.** Before a new fundamental capability, answer in writing:
1. Where does it sit in the semantic universe (which S0 entities, relations, inference types, criteria)?
2. Which knowledge does it read and write, with what provenance and standing?
3. How does it work for a domain PEE has never studied, and what does it leave reusable?
If an answer depends on an undesigned part of the universe, stop at design. Do not repeat "build a component,
discover a missing distinction, add another structure".

**3.2 Generality first.** Prefer general principles over domain- or product-specific rules. Complexity moves from
code into knowledge: the mechanism names no domain, entity, kind or role; those come from acquired knowledge.
A correction is general only if it is stated over types or relations, survives counterexamples and works on groups
(domain, category, source, quantity kind, method) not used to build it. Gains on exposed material are not
generalisation.

**3.3 Higher-order learning.** After each error or new rule, look for the structure it shares with others (scope,
precedence, comparability, evidence patterns). State a shared principle once, quantified over reified kinds,
methods, conditions or scopes; try to break it with constructed counterexamples; keep it only if it holds on unseen
groups. A higher-order mechanism enters the code only for a concrete first-order limit, bounded and reversible.

**3.4 Counterexample-guided development.**
- State the candidate as a principle over types, never as a word pattern.
- Search counterexamples with a verifier other than the development examples (metamorphic variants, renaming,
  unit changes, other domains).
- A counterexample reformulates the principle and joins a permanent suite. Never add a branch that only excludes it.
- Stop after three reformulations on the same material; move to new material. Material used to search is spent.

**3.5 Lesson admission.** A lesson records: failure mechanism; principle; applicability; counterexamples (each with
a test); evidence on material not used to build it; ablation; regressions; rollback. It stays **provisional** until
supported on independent groups. A lesson suggested by a check set is never validated by that set.

**3.6 Justified conclusions both ways.** Never invent a meaning or a value; never abstain when knowledge licenses a
conclusion. A path that only refuses is not success. Unjustified conclusions and unjustified abstentions are
separate errors and are counted separately. Keep apart: identity of a quantity, quality of its method,
comparability, and sufficiency for a decision. A missing condition limits applicability and comparability; it is
never filled by default.

**3.7 Engineering lessons that transfer.**
- Measure the cause before relaxing a rule.
- Look for existing capability by function, not by expected names.
- Validate a new contract on real material; synthetic fixtures hide unrepresentable cases.
- A gate derives what it permits from its own validated records, never from a caller's label.
- Trace one complete path end to end before adding components.

**3.8 Honest evaluation.**
- Tiers: **T1** constructed fixtures (mechanics only); **T2** unseen real inputs with expectations sealed before a
  frozen run (say who selected and annotated them); **T3** pre-existing outside truth; **T4** independent human
  adjudication (never simulated).
- Four meanings of "independent" never substitute for one another: source, example, unseen/frozen, adjudicated.
  Agreement between Claude agents is not independent validation.
- Seal expectations (commit) before a first run; commit first-run results unchanged. A set that informed a change is
  spent.
- Report with denominators: justified conclusions, unjustified conclusions, unjustified abstentions, transfer to
  unseen domains, regressions, cost.
- When two mechanisms merge, probe both from their own vocabularies; anything only the old one did is at risk
  until restored or shown wrong.

**3.9 Four achievements — never conflate them.**
1. **Knowledge acquired** — items exist with provenance and pass acquisition checks.
2. **Inference implemented** — PEE's code derives a conclusion from that knowledge, with a trace.
3. **Operational improvement demonstrated** — a later result is better because of acquired knowledge, shown by
   ablation and before/after on material not used to build the mechanism.
4. **Independently validated** — T3 or T4 evidence. A passing test suite is none of this by itself.

Every report states, separately, which principles were found, which are implemented and which are demonstrated
(on which groups, at which tier), and what remains open.

## 4. Runtime capabilities PEE must eventually own

Status is tracked in experiment READMEs, never asserted here.

- **Typed scientific knowledge**: quantity kinds, dimensions, units, scale types; models with variables, roles,
  forms, domains of application, generality form; methods; conditions; provenance and standing (S0 3–5).
- **Acquisition with validation**: dimensionally or structurally incoherent knowledge is refused, not repaired.
- **Condition-bound applicability**: a value or result applies only where its conditions are stated and met; an
  unstated condition never becomes evidence that a measurement holds in an untested setting (S0 4.6, TC3, C8).
- **Warranted positive inference**: derivations from premises with explicit applicability conditions, every
  conclusion traceable to its grounds, uncertainty propagated (S0 4.9, 5.7, C4).
- **Transfer only when conditions allow**: structural correspondence, regime match, causal similarity, concept
  alignment (S0 6.4 TC1–TC5); refusing a transfer is as required as performing one.
- **Learning from failure**: unresolved questions name the knowledge that would resolve them; refusals and
  counterexamples are kept and reconsidered when knowledge changes; revision preserves history (S0 6.3, C7).
- **Bidirectional access** to one body of knowledge, never two copies: from a human goal or problem → strategies
  (including doing nothing) → mechanisms → technologies or categories; and from a category or technology →
  capabilities → goals it can serve. A shared goal ("low noise") is one goal; its realisation and measurement stay
  specific to each category. A goal-side link keeps its conditions, contraindications, provenance and standing;
  relevance or association is never promoted to causation; demonstrated links and hypotheses stay distinct.
- **Self-checks in code**: counterexample and metamorphic suites, a lesson gate, group-split evaluation,
  knowledge ablation.

## 5. Assessment question for every increment

Does it advance cumulative, reusable scientific and operational learning that works beyond the examples that shaped
it — or does it only fix a local example or pass a test?
