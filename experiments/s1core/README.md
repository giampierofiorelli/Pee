# S1 core — numerical model-based inference component

The first S1 increment (`dfa16d9`) and one architectural correction, both authorised by the owner on 2026-10-21.
Python standard library only; no LLM at runtime.

- Run the demo: `python3 run.py [--trace]`.
- Run the tests from this directory: `python3 -m unittest discover -s tests -t .`.

## 1. What this is, and what it is not

This is **one component**. It implements one of the eight inference types of S0 5.7: model-based inference. It
evaluates mathematical models whose solved forms are supplied with the knowledge. It checks each model's domain
of application and propagates interval uncertainty.

It is **not** the scientific semantic universe, nor its foundation. The following are absent:

- concepts and identity (S0 3.6);
- mechanisms and processes as structures;
- qualitative, causal and evidential relations (5.5, 5.8);
- explanations (5.6);
- goals, norms and interventions (7.4);
- revision with history (6.3);
- recognition of new concepts (6.1–6.2).

None of them is assumed to be quantitative.

Provenance (`source`, `basis`, verification records), scope (`conditional`, `invariant`, `unknown`), what a statement
holds of (`holds_of`) and the standing of conclusions are designed so that other item types could carry them.
**Whether this architecture can actually hold non-numerical scientific knowledge without changing its foundations
is not demonstrated.** No non-numerical content has yet been represented or used in an inference. Testing that is
the owner's next decided step.

## 2. Representations compared against S0 (first increment)

| Candidate | Verdict against S0 |
|---|---|
| Triple / property graph | n-ary conditioned contents (4.6) and quantity algebra (Op5, 4.7) need heavy reification. Not chosen first |
| Logic programming | traceable (C4), but units, dimensions and uncertainty sit outside the logic. Useful later for relational rules |
| Description logic | weak for quantities and n-ary conditions; heavy toolchain |
| Vector / embedding | no grounds, conditions or dimensions (C2, C4). Rejected for inference |
| Probabilistic / causal models | causal content (5.5), but S0 defers the calculus (4.9.7). Later |
| **Models with domains of application as items, typed quantities, recorded inferences** | matches D7, 4.6(1), 5.7, 6.4 TC3, 4.7, 4.9 and C4/C5. **Selected for this component** |

The items are immutable Python objects with provenance, so the choice is reversible.

## 3. Behaviour

A question asks for "kind *K* of the entity in role *R* of situation *S*". The program answers it in five steps.

1. **It collects candidate values for *K*.**
   - **Givens of the situation** (boundary and initial data, S0 4.6(2)) are used first.
   - **Values from knowledge** are used only if their scope covers the situation:
     - **conditional:** the situation states and meets each condition;
     - **invariant:** the item declares invariance and states its justification;
     - **unknown:** the item is used only if the situation adopts it as an explicit scope assumption, and that
       assumption becomes a premise.
   - **A value may pass to another entity** only according to what it holds of. Every chain of links to the bearer
     is considered, and the shortest licensed chain is used:
     - **material:** through at most one `made_of` (never to a composite), and through `subkind_of` or
       `instance_of`;
     - **kind:** only through `instance_of` and `subkind_of`;
     - **population** spreads and **individual** values never pass.
2. **It applies models with a solved form for *K*.** It does so only if:
   - their categorical requirements are established or explicitly assumed;
   - their inputs can be derived recursively;
   - their domain conditions hold on the derived values. A violated condition gives REFUSED. A condition the
     uncertainty cannot decide gives UNRESOLVED.
3. **It combines supported derivations by their hull, never by intersection.** Disjoint results are a CONFLICT.
   A conflict upstream makes the dependent result UNRESOLVED, not REFUSED.
4. **It lists every premise as a ground.** This covers knowledge items, givens, assumed attributes and scope
   assumptions. The grounds are sufficient: re-running on the grounds alone gives the same result.
5. **It reports the standing of each conclusion** from its premises: illustrative, hypothetical, conditional on
   assumptions, unverified, or covered by attested verification records. A premise counts as verified only through
   a `Verification` record that names it, gives the holder and method, and carries a fingerprint matching the
   premise's current content. The program checks the record's integrity, not the truth of the holder's claim. The interval expresses only arithmetic uncertainty. Model validity,
   assumptions and source reliability appear in `standing` and `caveats`, never inside the interval.

**At acquisition**, the program refuses:

- missing provenance;
- undeclared scope, or an invariance with no justification;
- an extensive quantity declared as a material property;
- a model form or condition with the wrong dimension;
- unknown units or variables;
- duplicate ids.

Acquired items and the store are read-only. Knowledge changes only through an explicit `add`, or through
`without`, which returns a new store.

## 4. Architectural correction (after `dfa16d9`)

Each defect was first shown on the earlier code with a probe. Each now has a regression test.

| Concern | Defect shown in code | Correction |
|---|---|---|
| A. Scope | A value with no conditions applied everywhere: an unconditioned viscosity was used at 10 °C | Scope must be declared explicitly. `unknown` is never applied without an explicit scope assumption, which becomes a premise |
| B. Inheritance | Properties passed through chains of `made_of` (a grain received the density of silicon via quartz), and to composites (a quartz–feldspar grain received an intersected density). A population spread (caffeine half-life across adults) was used as a bound for one person | `holds_of` with link rules: at most one `made_of`, none to a composite, kind properties not through `made_of`, population and individual values never inherited |
| C. Provenance and standing | An empty source was accepted. Illustrative and recalled values produced conclusions with no recorded standing | Non-empty `source` and a closed `basis` are required. Every conclusion carries a standing computed from its premises |
| D. Integrity | Dict fields of "frozen" items, and the store itself, were writable: a validated formula could be changed afterwards and the result changed | Mappings are copied and made read-only at acquisition. The store view is read-only |
| E. Premises | Situation assumptions appeared only as caveat text, not as grounds | Givens, assumptions and scope assumptions are grounds; ablation removes them too. A test checks that grounds are sufficient |
| F. Combination | Supported derivations were intersected, so a second partly agreeing source narrowed the result. Disjoint sources were reported as REFUSED | Supported derivations are combined by hull. Disjoint sources give a recorded CONFLICT, and the dependent result is UNRESOLVED |

**Two defects found by the owner after `dc5020e`, now corrected:**

| Defect | Correction |
|---|---|
| Only the first chain of links to an ancestor was kept. If that chain was barred, for example by two `made_of` steps, a licensed chain to the same bearer was lost | All simple chains are enumerated, and the shortest licensed one is used. Barred chains are reported in the trace |
| Any non-empty string in `verified_by` made a premise count as verified | The field is removed. Verification now needs a `Verification` record: a target, a content fingerprint, a method from a closed set, an attesting holder and basis, and the cited source when the method is a comparison with it. A record whose fingerprint no longer matches is refused at acquisition and ignored at inference |

**Not confirmed as defects:**

- The status set and the domain checks behaved as intended.
- The mechanism contains no domain vocabulary.
- The "most specific level wins" rule matches S0's defeasible generics.
- The earlier ablation shows that the mechanism uses what it lists. It does not show scientific dependence in
  general, because the examples were built with single derivation paths. The new sufficiency test checks the trace
  in both directions, but it is still a property of the program, not of science.

## 5. Current output (`python3 run.py`)

Every situation datum is invented, so the program itself labels every conclusion "illustrative only".

| Situation | Question | Result |
|---|---|---|
| silt grain, water 20 °C | settling speed / time over 1 m | SUPPORTED [0.0721, 0.110] mm/s / [2.53, 3.85] h |
| coarse sand grain | speed | REFUSED (particle Reynolds number [98, 127] is outside the Stokes domain) |
| fine sand grain | speed | UNRESOLVED (Reynolds number [0.83, 0.96] falls within the uncertain bound [0.1, 1]) |
| silt grain, 10 °C / no temperature stated | speed | UNRESOLVED (names the missing water data, or the missing condition) |
| grain of measured speed | radius (inverse problem) | SUPPORTED [11.7, 13.0] µm |
| droplet in air / pressure not stated | fall speed | SUPPORTED [2.41, 3.64] mm/s / UNRESOLVED |
| microplastic fibre | speed | REFUSED (its shape excludes the sphere the model requires) |
| Cs-137 after 40 a | remaining fraction | SUPPORTED [0.3967, 0.3989] |
| caffeine, subject P (individual half-life given) | remaining fraction after 12 h | SUPPORTED [0.177, 0.202] |
| caffeine, subject P2 (only the adult population spread known) | same | UNRESOLVED |
| caffeine, neonate / ethanol above enzyme saturation | same | UNRESOLVED / REFUSED |

**Ablation.** Removing any single premise turns SUPPORTED into UNRESOLVED. This holds for the silt settling time
(13 premises, assumptions included) and for the Cs-137 fraction (7 premises).

**Before and after acquisition.** Adding the two water values the program named as missing turns the 10 °C
question into SUPPORTED: [0.0552, 0.0842] mm/s.

## 6. Tests (47, all passing)

- **Integrity (10):**
  - acquisition validation;
  - traceability;
  - determinism and independence of item order;
  - no domain vocabulary in the mechanism;
  - invariance under renaming and under a change of units.
- **Regression (22):** one or more tests per defect in section 4.
- **Interpretation (15):** expected values computed by hand by the developer on examples the developer chose.

These are development-level tests (T1). They are not evidence of scientific generality, and not independent
validation.

## 7. Limitations and future work

These are capabilities not yet implemented. They are not known bugs.

- **Inference:**
  - only model-based inference exists, over solved forms supplied with each model; there is no symbolic solving;
  - no causal, statistical, analogical or recognition inference.
- **Knowledge:**
  - no concepts, mechanisms, qualitative evidence, explanations, goals or interventions as items;
  - link and determinable vocabularies are closed sets in code (`instance_of`, `subkind_of`, `made_of`);
  - a value's dependence on a condition, for example viscosity on temperature, cannot be represented.
- **Uncertainty:**
  - intervals are conservative but not probabilistic;
  - population spreads are kept but cannot yet be used: distributional reasoning is absent;
  - there is no weighting of sources: the hull is the only combination rule.
- **Applicability:**
  - a conditional value is bounded by the conditions it states; its dependence on conditions it does not state is
    not represented (S0 T7).
  - "invariant" rests on a justification text supplied with the item, whose own basis is that of the item.
- **Chain enumeration** considers every simple chain of links. That is exponential in the worst case. It is
  adequate for small stores, but not yet engineered for large ones.
- **Verification records** are checked for integrity only. Who may attest a verification is not yet governed.
- **Revision and access:**
  - no revision with history, and no reconsideration of earlier conclusions;
  - no bidirectional access from goals to categories.
- **Data:** numerical knowledge is recalled and unverified; situation data are illustrative.
