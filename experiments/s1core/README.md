# S1 core — first positive model-based inference

Bounded S1 increment (owner authorisation, 2026-10-21). Python standard library only; no LLM at runtime.
Run: `python3 run.py [--trace]`; tests: `python3 -m unittest discover -s tests -t .` (from this directory).

## 1. Representations compared against S0

| Candidate | Fits S0 | Fails S0 | Verdict |
|---|---|---|---|
| Triple / property graph | relations as items, provenance by reification | n-ary contents with conditions (4.6) need heavy reification; no quantity algebra (Op5, 4.7); open world must be added | not first |
| Logic programming (Datalog/Prolog) | traceable derivations (C4), relational rules, decidable fragment (Datalog) | numbers with units, dimensions and uncertainty (4.7, 4.9) sit outside the logic; scope conditions become ad hoc guards | useful later for relational rules |
| Description logic (OWL) | classification, open world (4.10) | weak quantities and n-ary conditions; heavy toolchain | not first |
| Vector / embedding | similarity for recognition (3.6) | no grounds, no conditions, no dimensions (C2, C4) | rejected for inference |
| Probabilistic / causal graphical models | causal content (5.5) | S0 defers the calculus (4.9.7); needs data this step lacks | later, for causal content |
| **Models as items with domains of application, typed quantities and inference records** | S0 D7 models with domains (4.6(1)); model-based inference (5.7); reuse as scope hypothesis and transfer conditions (6.4 TC1, TC3); quantities with dimensions and uncertainty (4.7, 4.9); provenance and grounds (5.9, C4, C5) | relational and causal reasoning are thin; no identity reasoning (3.6) | **selected** |

The selected approach is a set of immutable items with provenance, plus one general inference procedure. Nothing
is stored beyond Python objects, so it is reversible: the items can later be mapped to a relational, logical or
graph store without changing their meaning.

## 2. Design questions (skill §3.1)

1. **Where it sits.** It covers S0 model-based inference (5.7). Its parts:
   - models (D7) with a domain of application (4.6(1));
   - role filling (Op1) and situating (Op6);
   - quantity composition with dimensional homogeneity (Op5, C2);
   - idealisation caveats (Op7);
   - uncertainty kept on its component and propagated (4.9.3–4);
   - the gap rule: nothing missing becomes a negation (4.10, C11);
   - grounds for every conclusion (5.9, C4);
   - scope discipline (C8);
   - incompatibility (N4).
2. **Knowledge it reads and writes.**
   - **Reads:**
     - quantity kinds;
     - values with conditions and provenance;
     - attributes with conditions;
     - links (`instance_of`, `subkind_of`, `made_of`);
     - single-valued determinables;
     - models;
     - situations.
   - **Writes:** nothing persistent. Each conclusion is a proposed content with its grounds, needs, caveats and
     trace (standing "proposed", holder: the program).
3. **Unfamiliar domains, and what stays reusable.** The mechanism names no domain, entity, kind or role (a test
   enforces this). A new domain needs only knowledge items. The mechanism and its safeguards stay reusable:
   - acquisition validation;
   - condition-bound applicability;
   - domain checks;
   - interval propagation;
   - knowledge ablation.

## 3. What the program does

Given a question of the form "kind *K* of the entity in role *R* of situation *S*", the program:

1. **Collects values** of that entity whose stated conditions the situation states and meets.
   - Intensive kinds may also be inherited through links. Extensive kinds never are.
   - The most specific applicable level wins.
2. **Applies every model** that has a solved form for *K* and role *R*. A model is applied only if:
   - its categorical requirements are established in knowledge, or explicitly assumed by the situation (an
     assumption becomes an idealisation caveat);
   - every input can be derived recursively.
3. **Evaluates the form** with interval arithmetic.
4. **Checks the model's domain conditions** on the derived values, including the output:
   - **violated** → REFUSED;
   - **undecided** by the uncertainty, or by an uncertain bound → UNRESOLVED;
   - **holds** → SUPPORTED.
5. **Combines results:**
   - several supported derivations are intersected, and an empty intersection gives CONFLICT;
   - every non-supported outcome names what is missing (`needs`).

Acquired knowledge is validated: a model form whose dimension differs from its variable's, a unit of the wrong
dimension, an unknown unit, an undeclared variable or a duplicate id is refused.

## 4. Actual output (`python3 run.py`, first run of this code)

| Situation (domain) | Question | Result |
|---|---|---|
| silt grain, water 20 °C (sedimentology) | settling speed | SUPPORTED [0.0721, 0.110] mm/s |
| same | time to settle 1 m (two-model chain) | SUPPORTED [2.53, 3.85] h |
| coarse sand grain | settling speed | REFUSED: particle Reynolds number [98, 127] is outside the Stokes domain |
| fine sand grain | settling speed | UNRESOLVED: Reynolds number [0.83, 0.96] falls within the uncertain bound [0.1, 1] |
| silt grain, water 10 °C | settling speed | UNRESOLVED: water viscosity and density are known only at 20 °C. The program names them as needs |
| silt grain, no temperature stated | settling speed | UNRESOLVED: the situation must state temperature |
| grain with measured speed (inverse problem) | radius | SUPPORTED [11.7, 13.0] µm |
| droplet in air 20 °C, 101.325 kPa (atmospheric) | fall speed | SUPPORTED [2.41, 3.64] mm/s |
| same, pressure not stated | fall speed | UNRESOLVED: air density holds only at a stated pressure |
| microplastic fibre | settling speed | REFUSED: its shape is a fibre, which excludes the sphere the model requires |
| Cs-137 in soil after 40 a (radioactivity) | remaining fraction | SUPPORTED [0.3967, 0.3989] |
| caffeine, healthy adult, 12 h (pharmacokinetics) | remaining fraction | SUPPORTED [0.0625, 0.305] |
| caffeine, neonate | remaining fraction | UNRESOLVED: half-life and rate law are known only for healthy adults |
| ethanol above enzyme saturation | remaining fraction | REFUSED: zero-order elimination excludes the first-order model |

**Ablation.** Removing any single ground of the silt settling time (11 items) or of the Cs-137 fraction (7 items)
turns the result from SUPPORTED to UNRESOLVED.

**Before and after acquisition.** Two values for water at 10 °C were added, exactly the knowledge the program had
named in `needs`. The silt question then changed from UNRESOLVED to SUPPORTED, with a speed of [0.0552, 0.0842]
mm/s and a settling time over 1 m of [3.30, 5.03] h.

**Domain knowledge matters.** With Stokes' domain condition removed, the coarse-sand speed becomes SUPPORTED, which
is an over-reach. With the condition present, the result is REFUSED.

## 5. Tests (26, all passing)

- **Integrity** (11 tests; they do not depend on any scientific reading):
  - acquisition refuses invalid knowledge (4 cases);
  - statuses, grounds and needs are traceable;
  - results are deterministic and independent of item order;
  - the mechanism contains no domain vocabulary;
  - results are invariant under consistent renaming of every kind, role and entity;
  - results are invariant under a change of units;
  - an extensive value of a kind is not inherited by its members.
- **Interpretation** (15 tests): positive inferences, prohibited inferences and knowledge dependence. The developer
  computed the expected values by hand. These tests show the mechanism behaves as intended on development
  examples. They are T1 evidence and **not independent validation**: the same developer chose the examples, the
  values and the mechanism.
- **History.** All tests except the inheritance test were committed before the first run (`78fd079`). All passed on
  that first run. The inheritance test was added afterwards and passed.

## 6. Limitations and open points

- **One inference type.** Only model-based inference is implemented, over explicit solved forms supplied with each
  model. There is no symbolic solving, causal or statistical inference, identity reasoning (S0 3.6) or analogy
  beyond role filling.
- **The program knows only what it is given.**
  - Stokes is given only one domain condition. Slip correction for very small particles and wall effects are
    absent, so a conclusion is as good as its acquired domain knowledge.
  - The program cannot judge that a term is negligible, for example air density beside water density.
- **Intervals are conservative.** They are not probabilistic. Correlated inputs widen them. There is no
  distinction yet between kinds of uncertainty beyond intervals, caveats and assumptions.
- **Conditions match by containment or equality.** There is no model of how a value varies with a condition (for
  example viscosity with temperature), and no tolerance knowledge.
- **Values without conditions** apply everywhere. This is flagged as a caveat, not prevented.
- **Numerical knowledge** is recalled reference data, not re-checked in this session. The caffeine figures are
  illustrative.
- **Evidence level.** All evidence is T1, on examples designed alongside the mechanism. No transfer to material
  unseen by the developer has been shown.
- **Learning is single-step.** Learning is shown only as "the program names the missing knowledge; adding it
  changes the result". No persistence, revision or reconsideration of earlier conclusions is automated.
- **Bidirectional access** (from goals to categories, and back) is not implemented.

## 7. Next highest-value objective

Test the same mechanism on **material the developer did not choose**:

- models and values drawn by a fixed rule from an outside source, in a domain not used here;
- expectations sealed before the run (T2).

Then add the first missing S0 capability that this run exposes. The most likely candidate is the
**condition-dependence of quantities**: a model of how a value varies with a condition, licensed only within its
own range, so that a measurement at 20 °C can be carried to 10 °C legitimately, never by default.
