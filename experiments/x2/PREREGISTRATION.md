# X2 — Structural reuse of Crawler's reading, under Pee's sole semantics

| | |
|---|---|
| **Authorised by** | owner, 2026-10-21 (verbatim below) |
| **Branch** | `claude/x2-structural-reuse`, from the X1 branch tip `e77b888`. X1 (`experiments/x1/`) and its results stay unchanged |
| **Status** | Preregistered before any X2 code, before reading any X2 page and before any X2 test material exists |
| **Independence** | Designed and run by Claude. The question author, the annotators and the adjudicator are Claude instances: this is **Claude's test, not independent validation**. No manual annotation by the owner is a prerequisite (owner instruction); an optional owner review packet is prepared as in X1 |

## 0. Owner authorisation (verbatim)

> Autorizzo X2 su un ramo separato di Pee, conservando X1 e i suoi risultati immutati. Nessun allegato necessario.
>
> Prima verifica come riutilizzare la lettura strutturale già funzionante di Crawler, senza attribuirle autorità sul
> significato scientifico: Pee deve restare l’unico interprete e valutatore semantico.
>
> Correggi per principi generali, non per categoria, la perdita silenziosa di qualificatori e incertezza, la semantica
> degli intervalli, le letture alternative e il riconoscimento delle grandezze.
>
> Preregistra un nuovo esperimento su materiale autentico e non utilizzato in X1, confrontando Crawler e Pee, con una
> prova specifica del contributo del riuso della lettura strutturale.
>
> Mantieni separati test Claude e validazione indipendente. Non richiedermi annotazioni manuali come prerequisito.
> Nessuna modifica a Crawler, migrazione o integrazione in main.
>
> Se il riuso richiede un secondo motore semantico, fermati e segnala il problema. Altrimenti implementa, verifica,
> registra anche gli eventuali fallimenti e fermati dopo X2.

## 1. Reuse study: what Crawler's structural reading gives, and where meaning starts (done before this file)

Crawler's reading of a page is done by `extractSpecifications245`, together with `testDocumentSubject268` for the
page's subject. `ingestObservation246` then attributes the result to products and applies the retention policy. The
result has two layers.

**Layer 1 — records.** One record per declaration. Each record carries:
- the label and the raw value text;
- the section and the component;
- the product it is attributed to, and the variant;
- its provenance.

This is structure: where a statement is and what it is said of. X1 already used this layer through the faithful
adapter.

**Layer 2 — parsed value (`value_json`, type `Value245`).**

| Field | Nature | Admitted in Pee? |
|---|---|---|
| `kind`: quantity, range, dimensions, options, number, price, text… | segmentation of the value text | yes, as a hypothesis |
| `number`, `numbers`, `min`, `max`, `amount`, `maxAmount` | numbers read from the text | yes, **only if each occurs in the raw text** |
| `unit`, `currency` | a symbol in Crawler's canonical spelling | yes as a **symbol only**. Its meaning comes from Pee's metrology; a symbol Pee's metrology does not know is unusable |
| `axes` | axis letters attached to numbers | yes, **only if each letter occurs next to its number in the raw text** |
| `bound` ('max'/'min'), `approximate`, `qualifier`, `alternative` | readings of words ("up to", "approx.", trailing words) | **no**. Pee derives bounds, approximation and residual words itself from the raw text |
| `property_key`, `evidence_role`, `method`, category hypotheses, identity review | interpretations | **no** (quarantined, as in X1) |

**Conclusion.** Reuse does **not** require a second semantic engine.
- Crawler contributes segmentation of text that Pee can verify, and records with their structural context.
- Pee keeps every semantic decision:
  - which quantity a value is;
  - its unit's meaning, dimension and scale;
  - qualifiers, conditions, bounds and uncertainty;
  - applicability, verdicts and standing.

**How a structural hypothesis enters Pee.**
- It is one more **alternative reading** of the record (principle P3 below), attributed to Crawler's reader.
- When Pee's own reading and Crawler's segmentation disagree, Pee concludes only if every admissible reading gives the
  same verdict.
- Crawler's segmentation never overrides Pee and never adds meaning.

## 2. General corrections (principles, not categories)

**P1 — Closed reading (no silent loss).**
- Every token of a value is accounted for, as one of: a number, a unit, a marker of bound, approximation or tolerance,
  a separator, a condition, a stopword, or a restatement in parentheses.
- Unaccounted words become **residual qualifiers** of the reading. They narrow the quantity, so the reading matches a
  requirement only if the requirement names them.
- Unaccounted symbols block a conclusion from that reading.
- Tolerance notation (*x ± y*) is metrology knowledge and gives the interval [x−y, x+y].

**P2 — Interval semantics.**
- A declared range is an extent.
- A requirement that names one end ("upper", "highest", "lower", "lowest", "top", "bottom" — lexical knowledge) is
  checked against that end.
- Otherwise a range decides only when the whole range lies on one side of the limit.

**P3 — Alternative readings.**
- When a record admits several readings, the verdict is computed under each. Sources of several readings are:
  - unlabelled axes;
  - several concepts compatible with the unit;
  - Pee's own segmentation against Crawler's.
- B concludes only if all readings agree. The conclusion is then marked as independent of the reading.

**P4 — Recognition of quantities.**
- A qualifier that names the product's own kind (the buyer's category words) denotes the whole product, so it does
  not narrow the quantity.
- A dimensioned value whose label names no known quantity is "the magnitude of that dimension of the named thing".
  It matches a requirement that names the same thing with a generic dimension word ("size", "capacity", "weight"…).
- Multi-word terms match across intervening stopwords and adverbs.
- A unit named inside the label applies to a unitless value.
- The metrology gains units and currency codes found in the development material, and number multipliers (thousand,
  million).

**Knowledge rule.**
- General concepts are admitted from the metrology frame and from development labels.
- Category knowledge is **not** written for any X2 test category, so all test categories are untaught.
- Mechanism code names no domain (checked statically, as in X1).

## 3. Material (authentic, not used in X1)

**Pages.** 177 pages retained privately by Crawler in its S89–S103 check waves.
- Their raw HTML is in `$PEE_PRIVATE_EVAL_DIR`, and each page's SHA-256 matches its wave receipt.
- None of them is in the 2026-10-19 snapshot that X1 used: a check by URL and by hash found 0 matches.
- They were fetched under Crawler's owner-authorised policies and retained privately. Nothing from them is published.

**Reading.** Crawler `7d091ef`, unchanged and compiled outside its tree, reads every page offline with its own path:
1. `extractSpecifications245`, then `testDocumentSubject268`;
2. `ingestObservation246` into a **fresh copy** of the 2026-10-19 snapshot, with the retention policy and its
   reservations detection, as in Crawler's own integrity scripts.

The faithful X1 adapter (copied unchanged) exports the records of the new revisions only.

**Split (fixed now, computed after this commit).**
- **Eligible for test:** a category of the wave pages that does not occur among the X1 snapshot's categories, with, in
  Crawler's output:
  - at least 2 products;
  - at least 20 declarations attributed to products whose raw value contains a digit;
  - at least 2 hosts.
- **Draw:** the 3 eligible categories with the lowest `sha256("X2|" + category)`.
- **Development material:** all other pages, plus all X1 material (spent).

**What the developer may see.** Names and counts of the test categories only. Never their records, questions,
reference or answers before the B2S freeze and the first run.

**Questions and reference.** Same protocol as X1, all Claude agents in separate contexts.
- **Author:** reads only the test categories' records. Writes about 24 limit checks and about 6 comparisons per
  category, in buyers' words, roughly half answerable.
- **Annotators:** two, blind, independent.
- **Adjudicator:** resolves disagreements and may mark an item `excluded_ambiguous`. It is asked to reply with counts
  only, **without describing items** (an X1 lesson).
- **Seal:** the hashes of the questions and of the reference are committed here before any arm runs.

## 4. Arms

| Arm | What it is |
|---|---|
| **A** | Crawler `7d091ef`, unchanged, on the same store copy: `extractConstraints253` → `eligibleCandidates253` → `decideAdvice249`, exactly as in X1 |
| **B2-flat** | Pee X2 with each record reduced to label and raw value. Crawler's section, component and value segmentation are not used |
| **B2** | Pee X2 with Crawler's record structure (label, value, section, component, variant, attribution) and Pee's own value reading only |
| **B2S** (primary) | B2 plus Crawler's verified value segmentation as an alternative reading (section 1) |

Contribution of reused structural reading:
- **Value segmentation:** B2S − B2.
- **Record context:** B2 − B2-flat.
- **Records themselves:** Pee has no page reader, so without Crawler's records it answers nothing. This is reported
  as a fact, not measured.

## 5. Metrics and decision rule (fixed now)

The counts are as in X1:
- justified conclusions;
- unjustified conclusions;
- unjustified abstentions;
- justified abstentions.

They are reported per arm, per category, and by whether Crawler has a criterion.

| Id | Criterion (on the limit-check set) |
|---|---|
| **S1 safety** | B2S makes **no** unjustified conclusion |
| **S2 use of evidence** | B2S's justified conclusions ≥ A's |
| **S3 untaught categories** | B2S concludes correctly on at least two thirds of the items the reference concludes on (every test category is untaught) |
| **S4 architecture** | Adapter fidelity tests pass, and there is no domain vocabulary in mechanism code. The only access to Crawler's parsed value is one function that reads the whitelisted structural fields of section 1. Crawler's `bound`, `approximate`, `qualifier`, `alternative` and every other interpretation are never read (static test) |
| **S5 preservation** | Crawler `HEAD` and working tree unchanged. `experiments/x1` identical to `e77b888`. Snapshot hash unchanged. MS1 and s1core suites pass |

**X2 passes only if S1–S5 all hold.** Anything else is a failure, recorded with its causes. No fix is made after the
first run.

**Reuse verdict (reported with the decision).**
- Value-segmentation reuse **contributes** if B2S has more justified conclusions than B2 and no unjustified conclusion
  that B2 does not have.
- It **harms** if it adds any unjustified conclusion.
- Otherwise it is **neutral**.

The same rule applies to record context (B2 against B2-flat).

**Reported without a gate:**
- the comparisons (A has no capability);
- regression of the X2 build on the spent X1 test set (development evidence only);
- cost.

## 6. Development rules

- Development uses spent material only: the X1 sets and the non-drawn X2 pages.
- At most three reformulations of a principle on the same material.
- A counterexample changes a principle, never a single case.
- B2-flat, B2 and B2S are frozen by one commit before the sealed material is opened.

## 7. Record of execution

| Step | Commit / hash |
|---|---|
| Preregistration | this commit |
| Crawler reading of the pages | 15 wave receipts, 177 pages (all hashes match), 1,023 declarations retained by Crawler `7d091ef` into a fresh snapshot copy (`crawler_read.mjs`) |
| Draw | eligible: air_purifiers, dishwashers, laptops, robot_floor_cleaners, soundbars, ssds, stick_vacuums. **Test (untaught): air_purifiers, laptops, robot_floor_cleaners.** Development: every other page |
| Freeze | — |
| Questions seal | `questions.json` sha256 `3a48ea78e34cabadc9944f61b31e77eb86ff96dfd8e35890e6ea93a14c0f5385` (100 items: 79 limit checks, 21 comparisons; blind Claude author reading only the test categories' records); annotator copy without author notes `947ed421…2198` |
| Reference seal | `reference.json` sha256 `947494e00faf24304d148ead179965b54c99f3eada030440c73fcd86c05caf04`. Two blind annotations (`d89a6be8…d3ce`, `aeb9d68e…e602`) agree on verdict for 99 of 100 items (Cohen κ 0.987); one adjudicated, 0 excluded. The adjudicator replied with counts only. Sealed before any arm ran and before the developer saw any test item. Incident: annotator 2 ran by mistake an unrelated script left in the shared scratchpad; it rewrote one file of earlier work (I1) with byte-identical content (sha256 checked against the committed copy). No X2 material was affected |
| First runs | — |
| Report | — |
