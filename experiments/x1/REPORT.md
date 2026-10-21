# X1 — Report: Pee semantics over Crawler's operational records

| | |
|---|---|
| **Preregistration** | `PREREGISTRATION.md` (commit `176c28e`; execution record in its section 10) |
| **Frozen build** | B and B0 at `ab480cd`; arm A = Crawler `7d091ef`, unchanged |
| **Tier** | **T2-internal.** The records are unseen and real, and the expectations were sealed before a frozen run. But the question author, both annotators and the adjudicator are Claude instances, so this is Claude's test, **not independent validation** (owner correction 4). The owner review packet (24 items) is in pee-knowledge `private-eval/x1/owner-review/` |
| **Privacy** | This file contains counts and descriptions only. Questions, records, reference and answers are private (pee-knowledge `private-eval/x1/`) |

## 1. Result by the preregistered rule: X1 fails

| Criterion | Result | Passes? |
|---|---|---|
| **S1 safety:** no unjustified conclusion by B | B made **1** unjustified conclusion (75 scored limit checks) | **no** |
| **S2 use of evidence:** B's justified conclusions ≥ A's | B **18**, A **14** | yes |
| **S3 untaught category:** B concludes correctly on ≥ 2/3 of the decidable items, and S1 holds there | **5 of 13** (0 unjustified conclusions there) | **no** |
| **S4 architecture** | Adapter fidelity holds on the full real export (2,385 declarations, field by field). No domain vocabulary in the adapter or in B's mechanism code (static check). The quarantined block is only removed, never read | yes |
| **S5 preservation** | Crawler `HEAD` = `7d091ef`, working tree clean. Snapshot hash = manifest (`4618f839…`). MS1 suite, s1core suite (47) and MS0 sealed cases pass. The 15 s1core example queries give identical results through MS1 | yes |

The first failing criterion is **S1**. As preregistered, **no fix is made inside X1**. Sections 3–5 diagnose the failure post hoc on material that is now spent.

## 2. Counts (scored set: 75 limit checks, 20 comparisons; 8 items excluded as ambiguous by the adjudicator)

Limit checks:

| Arm | Justified conclusions | Unjustified conclusions | Unjustified abstentions | Justified abstentions |
|---|---|---|---|---|
| **A** (Crawler) | 14 | 2 | 32 | 27 |
| **B** (Pee) | 18 | 1 | 28 | 28 |
| **B0** (Pee, no category knowledge) | 17 | 1 | 29 | 28 |

Out of 75 scored limit checks, the reference concludes on 46.

| Stratum | A: justified / unjustified | B: justified / unjustified | Reference concludes |
|---|---|---|---|
| Taught (keyboards, coffee machines; 52 items) | 11 / 1 | 13 / 1 | 33 |
| Untaught (headphones; 23 items) | 3 / 1 | 5 / 0 | 13 |
| Requirements Crawler has a criterion for (35 items) | 14 / 2 | 12 / 0 | 23 |
| Requirements Crawler has no criterion for (40 items) | 0 / 0 | 6 / 1 | 23 |

**Overlap of justified conclusions:**

| | Count |
|---|---|
| Both arms | 11 |
| Only A | 3 |
| Only B | 7 |

**Comparisons (secondary, no gate):**
- B: 7 justified, 0 unjustified, 8 unjustified abstentions, 5 justified abstentions (the reference concludes on 15).
- A has no declaration-comparison function and abstains on every item.

**Category knowledge:** B and B0 differ on **one** item. Almost all of B's results come from general knowledge (metrology, lexicon, general quantity concepts) and from the mechanism.

**Cost:**
- About 840 lines of Python for B (reader, recognition, services) and 81 for the adapter.
- 41 general concepts, 81 units, 15 category concepts.
- Run time under 0.5 s for 103 questions.
- Two small changes to MS1: two provenance bases, and their rank in the standing label.

## 3. Why S1 failed (the one unjustified conclusion)

**What happened.** A value declared with a symmetric tolerance (the form *x ± y*) was read as exactly *x*. The tolerance notation is not in B's lexicon, and the reader **dropped the text it did not understand** next to the value.

**Why it matters.** The verdict should have been "not determinable", because the tolerance interval straddles the limit. This is a silent loss of uncertainty. S0 forbids it (4.9: uncertainty stays on its component).

**The general defect.** The reader treats unread modifiers of a value as absent. It should treat them as a reason not to conclude.
- **Missing principle:** any unread token attached to a value blocks a conclusion from that value. This is a closed reading, not an open one.
- **Missing knowledge:** the tolerance notation, as metrology.

**Not a one-off.** The same defect class could hide other unknown qualifiers. One counterexample on 75 items is enough to fail the gate, and rightly so.

## 4. Why S3 failed (untaught category: 5 of 13)

B made no wrong conclusion on the untaught category. It abstained on 8 items the reference decides.

| Cause | Items | Kind of fix |
|---|---|---|
| **Range-valued quantities.** "Upper frequency response at least …" or "lowest operating temperature at most …" ask about one end of a declared range. B has no extent semantics, so it reads the range as an uncertain single value | 3 | General principle (end of an extent), not category knowledge |
| **The product named as a qualifier.** "Weight of the headphones" is treated as narrower than "weight" | 1 | General: a qualifier that names the product's own category denotes the whole product |
| **Missing general concepts or phrasings:** wireless range (a distance), driver size, "time to fully charge" | 3 | General vocabulary; not attested in development categories under the inclusion rule |
| **A qualifier the record lacks** ("battery recharge time" against "recharge time") | 1 | Qualifier equivalence knowledge |

The owner asked that the untaught category reason when evidence suffices. B reasoned on 5 items and was right each time, but missed 8. The failure is **coverage of general semantics**, not unsafe reasoning.

## 5. Other findings

**B avoided both of A's errors.** Crawler:
- ignored a condition the buyer stated (battery life "with noise cancelling on");
- answered a standby-power requirement with the product's general power.

B abstained on both, for the right reasons. These are the error classes the semantic universe is meant to remove.

**A beats B on three items, all value-structure reading:**
- a component named inside the value text ("Capacity: water tank …") rather than in the label;
- axis letters written before each number ("H… x W… x D…");
- a mixed axis notation.

Crawler's readers handle these; B's reader does not. **This is reusable Crawler capability.** In an integrated design it would move from Crawler's reader into Pee's reading knowledge, not into a second interpreter.

**A reasoning principle of S0 was not implemented.** The reference decided three checks on dimensions whose axes are not labelled. If every axis satisfies the limit, the verdict holds whichever axis is meant; if every axis fails, it fails. This is S0's reading-dependence: evaluate under each admissible reading (3.6.4). B abstained instead.

**Taught-category abstentions:**
- units not in the metrology (cubic centimetres written "cc", one more currency, multiplier words such as "million");
- a label in another language;
- a unit written as part of a label word;
- category concepts not foreseen (group/portafilter size, cup clearance phrasing).

**Development counterexamples, found and fixed before the freeze (spent material):**
- general knowledge merged two different quantities (air flow and moisture extraction rate) under one concept;
- prices in different currencies were compared;
- compound quantities ("2 lb 3 oz") were read partially.

Each of these was a semantic merger or loss, found by checking B against Crawler's path on 1,727 generated development checks.

## 6. What X1 shows, and what it does not

**Shown, at T2-internal:**
- **The architecture works.** Pee's shared store and contract (MS1) carried real, retained third-party records:
  - with provenance per record;
  - with interpretations proposed as hypotheses with standing;
  - with verdicts grounded on those interpretations;
  - with the buyer's requirement kept out of the epistemic grounds.
- **One semantic owner.** Metrology and the lexicon as knowledge, with no domain vocabulary in code, were enough for 18 justified conclusions against Crawler's 14.
- **The safer error profile.** B made one unjustified conclusion against Crawler's two, on a set where Crawler can answer only the requirements its 11 fixed criteria cover.
- **The adapter can stay faithful and non-reasoning.** Crawler's interpretations were quarantined and B never read them.

**Not shown:**
- That B is safe enough. It made one critical error.
- That B reasons well in an unknown category. It reached 5 of 13 there.
- Anything about validation. All judgements are Claude's. The owner review packet is the only independent check available, and it has not been done.
- Anything about reading web pages, attribution or research. X1 used records Crawler had already extracted and attributed.

**Spent material.** The test set is now spent. Any fix to the causes in sections 3–5 must be validated on **new** sealed material, never on this set.
