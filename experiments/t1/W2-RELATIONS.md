# T-1 W2 — Review of unstable relation distinctions (for the owner's decision)

| | |
|---|---|
| **Authorised by** | Owner, 2026-10-23: T-1 stage 1 (Rules) only, option A after `W1-DIAGNOSIS.md` |
| **Status** | Recommendations. **Nothing here changes the 27 relations or their meaning** until the owner decides |
| **Unchanged** | S0, the A-1 reader, the A-1 annotation guide, every earlier result |
| **Basis** | Annotator disagreement (C-1 §18); the causes found in W1 (`W1-DIAGNOSIS.md` §3–4) |

## Owner's decisions (2026-10-23, after review with ChatGPT)

**D1–D7 are approved**, option A where options were offered, with these precisions:

| # | Decision |
|---|---|
| D1–D4 | The distinctions are kept: indicator against category; scope against proof; equality against comparability; obligation against recommendation. `establishes` needs evidence that is actually sufficient for the conclusion, under the stated conditions |
| D5 | `other: prohibits` and `other: permits` are controlled forms, scored exactly. The 27 relations are unchanged |
| D6 | A procedural step is an obligation **only when the procedure actually prescribes it as necessary**. The bearer is kept. Otherwise the force is `uncertain` (selective abstention) |
| D7 | A heading's predicate is inherited only when the heading justifies it. An ordered list gives `exceeds` only when **the dimension and the direction** of the comparison are stated. Otherwise the order means nothing |
| Bearer | A procedural obligation is never a requirement on a product |

The sections below keep the proposals as written. The decisions above win where they are more precise. The amended
guide (`annotation-guide.md`) applies them.

All examples below come from fields other than speakers. They were written for this review, so they are design
examples and can never serve as evidence.

## Summary of the decisions needed

| # | Question | Recommendation | Changes the 27 relations? |
|---|---|---|---|
| D1 | `indicates` against `is_a` | Keep both. Sharpen the definitions with a substitution test | No |
| D2 | `applies_to` against `establishes` | Keep both. Sharpen them: scope against proof | No |
| D3 | `equals` against `other` (comparability) | Keep `equals` for identity and equality only. Write comparability as the controlled form `other: comparable_with` | No |
| D4 | `requires` against `recommends` (check) | Keep both distinct. Add an explicit test for each | No |
| D5 | Prohibition | Write it as the controlled form `other: prohibits`, never as a negated `requires`. Adding a relation `prohibits` is the alternative | No (alternative: yes) |
| D6 | Force of an imperative without a modal | Decide from context. A procedural step `requires`, with the procedure as its bearer. Advice to a reader `recommends`. If neither is clear, `uncertain` | No |
| D7 | Lists governed by a heading | The heading gives the predicate only when it names a class, an order or a status, and only through existing relations. Otherwise each item stands alone | No |

**Controlled `other` forms (D3, D5).** A controlled form has one fixed verb. It is scored as an exact label, like a
relation. It differs from the free `other: <verb>` fallback, and it is the reversible way to test a distinction
before adding a relation. If it recurs in the sealed reference, the owner can promote it to a relation later.

## D1 — `indicates` against `is_a`

**Definitions.**
- `is_a(X, Y)`: every X is a Y. This is classification. It is transitive, and Y's properties are inherited by X.
- `indicates(X, Y)`: observing X gives a reason to believe Y. This is an evidential sign. It is defeasible: X can
  occur without Y, and it is not transitive.

**Examples.**
- **Medicine.** "Pneumonia is an infection of the lung" is `is_a`. "Fever indicates infection" is `indicates`.
- **Geology.** "Basalt is an igneous rock" is `is_a`. "Pillow lava indicates eruption under water" is `indicates`.

**Ambiguity.**
- Thresholds: "an HbA1c of 6.5 % or more is diabetic" (C-1: `indicates` 0 of 11 positive agreement; 7 of the
  disagreements are this pair).
- **Proposed test.**
  - When the category is **defined** by the threshold, the claim is `is_a` (or `defined_as`).
  - When the value is **evidence** of a different state, the claim is `indicates`.

**Consequence in advice.**
- **Reading an indicator as a kind.** `is_a` inherits. A declared figure held as `is_a` "loud" would make the property
  follow from the declaration. That is a declaration turned into a measured fact.
- **The reverse.** Valid inheritance is lost.

**Recommendation.** Keep both relations. Add the two tests ("every X is a Y"; "observing X is a reason to believe Y")
to the definitions.

## D2 — `applies_to` against `establishes`

**Definitions.**
- `applies_to(X, Y)`: a law, method, standard or finding X is valid within the domain Y (a population, a condition, a
  product class). This is **scope**.
- `establishes(X, Y)`: evidence or a method X is sufficient to show that Y holds. `does_not_establish` is its
  negation. This is **proof**.

**Examples.**
- **Chemistry.** "The Beer–Lambert law applies to dilute solutions" is `applies_to`. "A titration establishes the
  acid concentration" is `establishes`.
- **Epidemiology.** "The efficacy estimate applies to adults aged 18–64" is `applies_to`. "A single case report
  does not establish causation" is `does_not_establish`.

**Ambiguity.** "Standard S covers the safety of the device" reads either as scope (S applies to safety) or as proof (a
test under S shows the device safe). C-1 counted 3 annotator disagreements of this kind.

**Proposed test.**
- `establishes` needs an evidential subject (a test, a measurement, data, a method) and an object that can be true or
  false.
- `applies_to` has a domain or condition as its object.

**Consequence in advice.** Reading scope as proof turns "a standard covers safety" into "the product is shown safe".
That promotes a standard's scope to evidence about a product.

**Recommendation.** Keep both relations. Add the test to the definitions.

## D3 — `equals` against `other` (comparability)

**Definitions.**
- `equals(X, Y)`: X and Y are the same quantity, value or concept. Negated, they are different things.
- **Comparability** is a different claim. It says whether two values may be compared at all (same quantity, method,
  conditions and version). In the reference it appears as `other: comparable with` and `other: substitutes for`.

**Examples.**
- **Physics.** "1 J equals 1 N·m" is `equals`.
- **Clinical chemistry.** "An HbA1c of 48 mmol/mol equals 6.5 %" is `equals`.
- **Comparability.**
  - Climate science: "temperature anomalies against different baselines are not directly comparable".
  - Psychometrics: "scores from two versions of a questionnaire are not comparable".

**Ambiguity.** "X is not Y" can deny identity ("warranty length is not a failure rate") or deny comparability ("score
A is not comparable to score B").

**Consequence in advice.** Comparing values that are not comparable produces a false ranking. The evidence rules of
`CLAUDE.md` forbid this, and the comparability gate depends on the claim being held.

**Recommendation.**
- Keep `equals` for identity and equality.
- Hold comparability as the controlled form `other: comparable_with`, with polarity.
- **Alternative (owner decision):** add a relation `comparable_with`.

## D4 — `requires` against `recommends` (check)

**Definitions.**
- `requires(X, Y)`: X is non-compliant, invalid or unfit for its stated purpose without Y. This is an obligation.
- `recommends(X, Y)`: Y is preferable for X, and its absence is permitted. This is advice.

**Examples.**
- **Pharmacology.** "The infusion requires a filter of 0.2 µm" is `requires`. "Taking the tablet with food is
  recommended" is `recommends`.
- **Structural engineering.** "Anchors require a minimum edge distance" is `requires`. "Inspection every five years
  is recommended" is `recommends`.

**Measured stability.** Annotator agreement is 0.85 (`requires`) and 0.74 (`recommends`), with 4 disagreements
between them (C-1 §18).

**Consequence in advice.**
- An obligation read as a preference lets a product that lacks a mandatory feature be ranked.
- A preference read as an obligation excludes acceptable products.
- **W1 also found 26 cases where `requires` was held as `recommends` and graded right.** `PROTOCOL.md` §2 corrects
  this.

**Recommendation.** Keep both relations distinct. Add the two tests ("non-compliant or unfit without Y"; "absence
permitted").

## D5 — Prohibition

**The problem.**
- The annotators wrote prohibitions as `other: prohibits` or `other: forbids` (16 sealed propositions). The 27
  relations have no prohibition.
- A negated `requires` is **not** a prohibition. "X does not require Y" means Y may be omitted. "X prohibits Y" means
  Y must be omitted.
- In deontic logic, prohibition is obligation of the negated act (von Wright 1951). Proposition polarity negates the
  whole relation, not the act, so the two cannot be expressed by polarity.
- A-1's double-negation errors on "avoid" and "refuse" (W1 §3.4) come from this gap.

**Examples.**
- **Laboratory safety.** "Pipetting by mouth is prohibited."
- **Pharmacology.** "Do not combine the two drugs."

**Options.**
- **A.** The controlled form `other: prohibits` (and `other: permits`), scored as exact labels. **Recommended:** it
  leaves the 27 relations unchanged and keeps the decision reversible.
- **B.** A new relation `prohibits` (and `permits`). This is principled, but it changes the 27 and needs the owner's
  approval.
- **C.** `requires` with an object meaning "absence of Y". Not recommended: it loses the link to the concept Y.

## D6 — Force of an imperative without a modal

**The problem.**
- A-1 writes every imperative as `recommends` with modality `necessary`. An obligation is then indistinguishable from
  a preference.
- The owner's correction: an imperative is not always an obligation. "Use a calibrated instrument" may be an
  operational instruction. "The instrument must meet standard X" states a requirement.
- The imperative mood marks a directive act. Its strength comes from its context (Searle 1979; Palmer 2001).

**Examples.**
- **Analytical chemistry.** "Calibrate the pH meter with two buffers before each series." This is a step of a
  procedure. It binds whoever runs the procedure, and it says nothing about which instrument to buy.
- **Clinical guidance.** "Consider a statin for adults whose ten-year risk exceeds 10 %." This is advice.
- **Workshop safety.** "Never weld galvanised steel without extraction." The marker "never" makes it a prohibition.

**Proposed rule (option A).** The rules apply in this order:
1. **Explicit markers decide.** `must`, `required`, `only … if`, `always` → `requires`. `never`, `do not` →
   prohibition (D5). `should`, `consider`, `prefer`, `if useful` → `recommends`.
2. **A step of a method, protocol or schema → `requires`, with the procedure as the bearer.** "The pH procedure
   requires calibration with two buffers." The bearer is scored (`PROTOCOL.md` §2), so a procedural step never becomes
   a requirement on a product.
3. **Advice addressed to a reader or user → `recommends`.**
4. **Otherwise → force `uncertain`.** The proposition is kept with candidates `requires` | `recommends` (selective
   abstention, `DESIGN.md` §2.3).

**Options.**
- **A.** The context rule above. **Recommended.**
- **B.** Every imperative `recommends`. This is A-1 today; obligations are lost.
- **C.** Every imperative `requires`. Preferences become obligations.

**Consequence in advice.** The bearer matters as much as the force. Under option A, the instrument requirement and
the procedural instruction from the owner's example are both obligations, but on different bearers. Only the first
constrains a product.

## D7 — Lists governed by a heading

**The construction.** List items whose claim is carried by a heading or lead-in, not by their own words:
- a class heading ("Category-exit cases:", "Invasive species in this region:");
- an ordered hierarchy ("Evidence trust hierarchy: 1. … 2. …");
- a status heading ("Research gaps:", "Open questions:").

W1 counted 42 element errors and 12 missed propositions from this construction.

**Examples.**
- **Ecology.** "Invasive species in the basin: zebra mussel; water hyacinth." Each item `is_a` invasive species in
  the basin.
- **Clinical epidemiology.** "Evidence hierarchy: 1. systematic reviews; 2. randomised trials; 3. cohort studies."
  Each item `exceeds` the next in evidential strength.
- **Climate science.** "Open questions: magnitude of cloud feedback." The proposition has attitude `questioned`.

**Options.**
- **A.** The heading gives the predicate only through existing relations:
  - a class heading → `is_a`;
  - an ordered list → `exceeds` between consecutive items, on the dimension the heading names;
  - a status heading → the attitude or content kind (`questioned`, `unknown`), never a relation.

  Any other heading gives nothing; each item stands alone, or is `uncertain`. **Recommended.**
- **B.** New relations `ranks` and `is_research_gap`. This changes the 27.
- **C.** Items stay `uncertain`. This is safe, but the content of evidence hierarchies is lost, and PEE needs it to
  weigh sources.

**Consequence in advice.** An evidence hierarchy decides how sources are weighted. Reading it as noise loses that.
Reading item words as claims invents relations (W1: `experiences` read as a verb).

## References

- Palmer, F. R. (2001). *Mood and Modality*, 2nd ed. Cambridge University Press.
- Searle, J. R. (1979). *Expression and Meaning: Studies in the Theory of Speech Acts*. Cambridge University Press.
- von Wright, G. H. (1951). Deontic logic. *Mind* 60(237): 1–15.
