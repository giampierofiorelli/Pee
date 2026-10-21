# X2 — Report

**Preregistered decision: X2 fails.** S1 fails (1 unjustified conclusion) and S3 fails (13 of 48). S2, S4 and S5
pass.

**Reuse verdict: neutral.** Neither Crawler's value segmentation nor its record context changed any answer. Reuse did
not require a second semantic engine.

This is a Claude test (author, annotators and adjudicator are Claude agents), not independent validation. The material
is authentic retained pages never used in X1.

## 1. What was asked and what was done

The owner authorised X2 with these requirements (verbatim in `PREREGISTRATION.md` §0):
- reuse Crawler's structural reading without giving it semantic authority;
- correct four general losses: qualifiers and uncertainty, interval semantics, alternative readings, and quantity
  recognition;
- compare Crawler and Pee on new authentic material, with a specific test of the reuse.

| Step | Commit |
|---|---|
| Reuse study, principles P1–P4, preregistration | `5350eae` |
| Crawler `7d091ef` reads 177 retained pages offline into a store copy; draw | `b9d3b40` |
| Questions and reference sealed (100 items; annotators agree on 99, κ 0.987) | `d306f26` |
| Freeze of B2-flat, B2 and B2S (one build, three modes) | `4dc3a4c` |
| First-run scores, unchanged | `4e74494` |

## 2. Can Crawler's structural reading be reused without a second semantic engine?

**Yes.** Crawler contributes two things:
- records with their structure: label, value, section, component, variant, attribution;
- a segmentation of each value: kind, numbers, unit or currency symbol, axis letters.

Pee admits a segmentation only after checking it against the raw text, and only through one function
(`segmentation_of`) that whitelists those structural fields. Static tests confirm that Crawler's bounds,
approximation, qualifiers, alternatives and all other interpretations are never read. A unit symbol means only what
Pee's metrology says it means. An admitted segmentation is one more alternative reading: Pee concludes only if every
reading gives the same verdict.

Every semantic decision stays in Pee: the quantity, the unit's meaning, qualifiers, conditions, bounds, uncertainty,
verdict and standing.

## 3. Results (limit checks; 79 items, none excluded)

| Arm | Justified | Unjustified | Unjustified abstentions | Justified abstentions |
|---|---|---|---|---|
| A — Crawler | 7 | 0 | 41 | 31 |
| B2-flat | 13 | 1 | 34 | 31 |
| B2 | 13 | 1 | 34 | 31 |
| **B2S (primary)** | **13** | **1** | **34** | **31** |

**B2S by category** (all untaught):

| Category | Justified | Unjustified | Reference concludes |
|---|---|---|---|
| Air purifiers | 3 | 0 | 15 |
| Laptops | 1 | 0 | 16 |
| Robot floor cleaners | 9 | 1 | 17 |

**Where Crawler has a criterion** (15 items the reference concludes on), B2S has 8 justified conclusions and A has 7.
**Where it has none** (33 items), B2S has 5 and A has 0.

**Comparisons** (21 items):
- B2S: 5 justified, 0 unjustified; the reference concludes on 17.
- A: none (it has no comparison capability).

| Gate | Result |
|---|---|
| S1 safety | **fail**: 1 unjustified conclusion |
| S2 use of evidence | pass: 13 vs A's 7 |
| S3 untaught categories | **fail**: 13 of 48 (needed 32) |
| S4 architecture | pass: 25 T1 tests including real-data adapter fidelity; no domain vocabulary in mechanism code; quarantine reached only through `segmentation_of` |
| S5 preservation | pass: Crawler `7d091ef` with a clean tree; `experiments/x1` identical to `e77b888`; snapshot SHA-256 unchanged; MS1 (17), s1core (47) and X1 (18) suites pass |

**Reuse verdicts (prereg §5):**
- Value segmentation (B2S against B2): **neutral**. 0 items gained, 0 lost, 0 unjustified added. On every conclusion
  B2S made, Crawler's segmentation agreed with Pee's.
- Record context (B2 against B2-flat): **neutral**. Section, component and variant decided no item.

## 4. Post-hoc diagnosis (after the first run; no change made)

**The unjustified conclusion.** The value used a dot as a thousands separator. Both segmentations, Pee's and
Crawler's, read it as a decimal, agreed, and concluded wrongly.
- The missing principle: the notation is ambiguous, so it should produce two alternative readings (P3), and those
  readings would have disagreed.
- Agreement between two readers is no protection when both share the same blind spot.

**The 34 unjustified abstentions:**

| Cause | Items |
|---|---|
| Qualifier strictness or missing lexical equivalences: compound words, synonyms, the warrantor named in the label, "power" in a pressure label | 14 |
| Measurement tables: the label names a test scenario, the unit sits in the label with a footnote mark, and the quantity is named only by the section or column | 8 |
| Operating-mode labels: a speed or power setting names the condition, not the quantity | 4 |
| Range-end words in the label ("low – high") read as qualifiers instead of as P2 extent words | 3 |
| Knowledge gaps: a currency written as a word, an unknown unit, no generic power concept | 3 |
| "Up to" read as a bound only, where the annotators read it as the declared value | 1 |
| A Crawler record whose label holds values | 1 |

**What X2 improved** (development evidence on spent material, not held-out):
- On the spent X1 set, the X2 build has 31 justified conclusions and 0 unjustified, against X1 B's 18 and 1. This
  holds without the category knowledge X1 used.
- On the new material, B2S concludes on 5 items where Crawler has no criterion, and on 1 more where it has one.

**What failed:**
- Recognition on untaught categories is still far below the two-thirds threshold.
- The failures are general (lexicon, measurement-table structure, mode and condition labels, number notation).
  Their category coverage differs: 8 of the 34 are laptop measurement tables.
- Both reuse contributions measured zero on this material. The development census on the spent X1 snapshot found 11
  declarations that only Crawler's verified segmentation reads; none was asked about here.

## 5. Open

- **Alternative readings of number notation** (thousands separator against decimal).
- **Measurement tables:**
  - scenario or condition labels;
  - quantities named by sections or columns;
  - units with footnote marks;
  - reuse of Crawler's table structure, which X2 did not test.
- **Lexical equivalence.** Pee needs it without loosening P1. This is open: synonymy needs knowledge or learning with
  its own provenance, not a looser rule.
- **The meaning of "up to"** in a declaration (a bound, or the declared maximum), on which the annotators and the
  principle differ.
- **Larger and independent tests.** Agreement between Claude agents is not independent validation. An optional owner
  review packet of the 35 differing items is kept privately in pee-knowledge `private-eval/x2/owner-review/`.

## 6. Incidents

- The question author left a scratch file holding test records. It was deleted unread, before development.
- One annotator ran, by mistake, an unrelated script left in the shared scratchpad. It rewrote one file of earlier
  work (I1) with byte-identical content: its SHA-256 matches the committed copy. No X2 material was affected.

Private detail is in pee-knowledge `private-eval/x2/`: questions, annotations, reference, answers, diagnosis,
development runs and the owner packet. X2 stops here, as authorised.
