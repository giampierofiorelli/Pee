# T-1 stage 2 — Result of the narrowed development (W3–W5) and the final check without agents

| | |
|---|---|
| **Authorised by** | Owner, 2026-10-23: option A modified (`PROTOCOL.md` §11) |
| **Arms** | A0 = `b7733df` (A-1 reader). A1 = `c85b4bf`, frozen in `freeze-3.json` before any Speakers score or QS answer was produced |
| **Material** | Spent only: the O-2 Speakers passages and references; A-1's question set QS (47 askable questions) |
| **Agents** | **0.** The three authorised agents were **not** used (§4) |
| **Data** | `stage2-results.json` (counts and hashes; no text) |
| **Independence** | Claude's work on spent material. A development diagnostic, not independent validation |

## 1. Outcome

**Stopped at the agent gate, under the protocol as frozen.**

| Condition | Result | Met |
|---|---|---|
| Mechanically detected critical types do not increase (§11.3) | sealed 1 → 0 (type 7); development 0 → 0 | yes |
| Matched-label wrong counts do not increase (§11.3) | sealed: none increases (polarity 1 → 0, force 2 → 0, attitude 3 → 1, source link 0 → 0). **Development: polarity 0 → 1 and source link 0 → 1** | **no** |
| Reasoning gate (§9.2) | correct + justified abstention 8 → 10; unjustified 1 → 1 (the same question, Q30) | yes |

- **What the frozen rule says.** §11.3 stops stage 2 when any matched-label wrong count increases.
- **What the owner's condition says.** The authorisation named *verifiable critical regressions*. No critical type
  increased.
- **Why Claude stopped anyway.** The frozen rule is stricter than the owner's wording. Claude applied the frozen rule
  as written, rather than judge the two cases after seeing them.

### The two increases (inspected after the outcome was fixed)

- **U0139, source link.**
  - **What A1 did:** it links the paragraph's closing citation block (R19, R20, R26) to a recommendation in that
    paragraph.
  - **The reference:** the development reference, annotated with the A-1 guide, gives that claim no source.
  - **Reading:** under the T-1 guide (§2), this is cited context, so the difference is a convention, not a reading
    error.
- **U0216, polarity.**
  - **A1's reading:** "do not misrepresent this proposed loop as already deployed" is a prohibition (W2 D5).
  - **The reference's reading:** it records the implied fact, the loop is not deployed (`other: deployed`, negated).
  - **Reading:** the program matched two different readings by word overlap. The relation differs too, so this is
    not a polarity flip of one claim.

These readings are Claude's, made after seeing the result. They do not change the outcome.

## 2. The decision for the owner

1. **Authorise the three agents.**
   - **The basis:** the owner's own condition (no verifiable critical regression, reasoning check passed) holds.
   - **What it requires:** recording that the frozen §11.3 was stricter than the authorisation, and was waived once,
     for these two inspected items.
2. **Or keep the stop.** A1 stays a development result. The agents are not used.

**Claude's recommendation: option 1.**
- **Why.** The mechanical filter cannot show improvement; that was known before. The two items are not errors of the
  kind the filter exists to catch.
- **What changes.** Without the judges, nothing can be concluded about the main question: does A1 read better,
  including the propositions the program cannot match?
- **The cost:** at most three agents, on spent material.

## 3. What the final check measured

### 3.1 Mechanical (readable subset only)

The proxy check failed (0.72). These numbers can show neither improvement nor its absence (§11.3).

| | Sealed A0 | Sealed A1 | Development A0 | Development A1 |
|---|---|---|---|---|
| Items produced | 280 | 206 | 280 | 219 |
| Items matched | 35 | 30 | 40 | 32 |
| Right-element share | 0.312 | 0.299 | 0.227 | 0.204 |
| Wrong rate (matched) | 0.125 | 0.085 | 0.089 | 0.059 |
| Complete faithful coverage | 0.023 | 0.115 | 0.031 | 0.124 |
| Uninterpreted share | 0.644 | 0.673 | 0.751 | 0.783 |
| Norms matched (of 21 / 15 readable) | 4 | 4 | 3 | 3 |
| Source link on matched items: right / missing | 14 / 21 | 30 / 0 | 10 / 30 | 31 / 0 |
| Mechanical critical errors | 1 (type 7) | 0 | 0 | 0 |

**Reading, with the instrument's limits.**
- **A1 produces fewer items.** It no longer invents verbs, and it skips code.
- **What it does produce is wrong less often.** Complete faithful coverage rises: the citation links are now present,
  and the forces are right.
- **The right-element share falls,** because fewer readable propositions are matched at all.
- **Whether the propositions A1 no longer covers were real losses or removed errors cannot be told mechanically.**
  That is the judges' question.

### 3.2 Reasoning (A-1's QS, 47 askable questions)

| Outcome | A0 | A1 |
|---|---|---|
| Correct decision | 5 | **7** (Q04, Q53) |
| Unjustified decision | 1 (Q30) | 1 (Q30) |
| Lost decision / lost (uninformed) | 6 / 26 | 3 / 27 |
| Justified / uninformed abstention | 3 / 6 | 3 / 6 |

- **On W5.** On the development questions QD, the identity-preserving variants changed **no** answer. The one QD gain
  (Q01) came from W3, a claim now read. The QS gains are likewise not attributed to W5 without an ablation, which
  was not run.
- **The dominant loss.** It remains terms that name nothing held: 27 of 47. Many held concepts are fragments of
  earlier misreadings, and the questions often name a narrower concept. S0 forbids resolving that by merging.

## 4. What was built (A1, `c85b4bf`)

| Work package | Principle implemented | Tested (T1, constructed, a domain not used in design) |
|---|---|---|
| **W3, structure** | Sentence split before quotes and code. Fenced code is not prose. Ordered list items are marked | yes |
| **W3, sources** | The closing citation block is **cited context** (`cited_sources`), never attribution. A source is attributed only through a named reporter or a reported measured result | yes |
| **W3, negation** | Fronted conditions keep their own words and negations. Coordinated imperatives keep their own polarity. One negative operator for "avoid" and "refuse". Negative determiners anywhere. "Not only" is additive. "But" flips polarity only after a negation | yes |
| **W3, deontic force** | Prohibition is `other: prohibits` (D5). Declarative modals state norms. Imperative force comes from context (D6): explicit markers; a procedural step is an obligation only when prescribed as necessary; otherwise `uncertain`, with the bearer kept | yes |
| **W3, other** | No verb invented from an "-s" word. An adverb after an auxiliary is not the verb. A reporting participle is not a reporter. Attitude per proposition. Illustrative cases marked | yes |
| **W4** | Indeterminate relation placeholder with its candidates (S0 M6). States, bearer, status and cited context on the attribution. Nothing depending on an uncertain element, an indeterminate relation or an illustrative case is licensed | yes |
| **W5** | Identity-preserving term variants only: hyphen, slash, "X of Y" | yes; no measured effect on QD |

**Known limit, kept visible.** An imperative is recognised only when its verb is in the general lexical frame `L:en`.
"Calibrate …" is not read. The frame was **not** extended with verbs from the spent material.

**Changed test.** `test_a1.py`: the prohibition assertion follows W2 D5 (`other: prohibits`, affirmed) instead of
A-1's negated recommendation. Every other suite passes unchanged: universe 135 tests, s1core, x1, x2, o2, and t1.

**After the freeze.** `export.py` failed at first use (stored values are frozen mappings). It was fixed before any
result existed, by converting values to plain JSON. Grading is unchanged.

## 5. Cost

| | |
|---|---|
| Agents | 0 |
| Compute | about 6 K+ assimilations of about 70 s each; the exports and scoring take seconds |
| Downloads | none beyond the earlier sparse `pee-knowledge` checkout |
| Claude session | one session for stages 0–2. Its context reached about 0.66 million tokens. The cost hook reported a session total above $14 midway |

## 6. Limits

1. **Measurement.** The mechanical scorer is not a valid measure of improvement (proxy 0.72). Only judges can settle
   it.
2. **Spent material.** Every result is on spent material, by Claude. It is not independent.
3. **W5.** The ablation on QS was not run. QD shows no W5 effect.
4. **The two inspected items** are interpreted post hoc.

Stopped before stage 3, as instructed.
