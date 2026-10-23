# T-1 evaluation protocol: corrected scoring and the comparison of A-1 with the improved reader

| | |
|---|---|
| **Authorised by** | Owner, 2026-10-23: T-1 stage 1 (Rules) |
| **Adds to** | `DESIGN.md` §4.3–4.5 and §8.1–8.3. The metrics and gates there stay; this fixes how elements are scored |
| **Replaces, for T-1 only** | O-2 adjudication conventions 1, 3 and 4 (`experiments/o2/adjudication-conventions.md`, unchanged for O-2) |
| **Status** | Fixed before any T-1 code. Frozen with the other items of §7 before stage 2 |
| **Never rewritten** | Every historical result (A-1, O-2, C-1, W1) keeps its numbers and its conventions |

## 1. Arms and conventions

- **A0** is A-1 frozen: reader `1764a7f6…`, export `o2.py` `1f07ded4…`.
- **A1** is the reader after W3, frozen before scoring.
- **Same scoring.** Both arms are scored by **one scorer**, in **one run**, against **the same reference version**,
  with **the same mapping** (§3).
- **Reported numbers.** Three columns, never merged:

| Column | What it is | Used for |
|---|---|---|
| A0, historical conventions | the published O-2 or W1 numbers | context only |
| A0, T-1 conventions | A0 re-scored by this protocol | the baseline |
| A1, T-1 conventions | the improved reader | the result |

- **The reader effect is A1 − A0 (T-1).**
- **The convention effect is A0 (T-1) − A0 (historical).** It is reported, and it is **never** counted as an
  improvement.

## 2. Element scoring (corrections found in W1)

### 2.1 Relation

- **Exact label.** `requires`, `recommends`, the controlled `other` forms of W2 and the free `other: <verb>` are all
  distinct.
- **No tolerance.** Convention 4 of O-2 (a deontic encoding counts as right for any norm) is **withdrawn**.

### 2.2 Deontic force (a new, separate element)

The force is derived **by the same table** for the reference and for both readers:

| Relation and polarity | Force |
|---|---|
| `requires`, affirmed | obligation |
| `requires`, negated | permission to omit |
| `other: prohibits` (W2 D5, option A) | prohibition |
| `recommends`, affirmed | recommendation |
| `recommends`, negated | discouragement. This is how A0 holds "do not X", so it is wrong where the reference states a prohibition |
| `other: permits` | permission |

- **Modality never changes the force.** `recommends` with modality `necessary` is a recommendation, not an obligation.
- **The 26 cases W1 found** (`requires` held as `recommends`) are therefore wrong for both arms under these
  conventions.
- **No equivalence is accepted.** Not between the force of the reference and the reader's encoding, and not because
  a modality "looks deontic".

### 2.3 Norm bearer (new)

- Scored on norms: `product`, `procedure`, `user`, `adviser`.
- **A0 has no bearer field.** The bearer is therefore reported separately, and it is **excluded from the gate
  measures** (§4). A field one arm cannot express is a new capability, shown on its own, never a share gain.

### 2.4 Sources: citation, link and attribution (replaces convention 3)

Three measures, each reported for both arms.

| Measure | Definition | Spent references | R2 |
|---|---|---|---|
| **Source-link recall** | Reference propositions with at least one cited source, where the reader links at least one correct source (cited or attributed) ÷ such propositions | yes | yes |
| **Source-link precision** | Correct linked sources ÷ all linked sources | yes | yes |
| **Specific attribution** | `attributed_to` right, wrong or missing against R2's `attributed_to`. A wrong one is a type-5 critical error | **no** | yes |

- **On the spent references, the measure is the link.** Their `attributed_to` lists the paragraph's citation block
  for every claim, so it is treated as `cited_sources` there.
- **No judgement of specific attribution is possible on spent material.**
- **The old ratio is still reported, labelled as such.** It is right ÷ (right + wrong), where an empty matching
  an empty counts as right.

### 2.5 Evidence

- The four dimensions (`annotation-guide.md` §1) are scored separately.
- Extraction fidelity is the item's verdict, never a probative value.

### 2.6 Critical errors

- **Types 1–6** are unchanged.
- **Two additions apply to both arms:**
  - **Type 3 is widened.** It includes an `illustrative_example` held as an observed result.
  - **New type 7.** An obligation held as a recommendation or a permission, or the reverse, or a prohibition held as
    an obligation. This is the error the owner put first for product advice.
- **The gate** of `DESIGN.md` §8.1 and §8.3 ("critical errors of types 1, 3, 4 and 5 not higher") includes type 7.

## 3. Spent references: the label mapping

The spent references D and R and A0's output use the old `evidence_kind`. For stage 2, one deterministic table maps
the labels, applied identically to the references, to A0 and to A1.
- The mapping may merge labels. It never reads text.
- A cell that cannot be mapped is **unscored for every arm**.

| Old `evidence_kind` | `evidence_nature` | `statement_status` |
|---|---|---|
| `synthesis` | `none_stated` | `general_claim` |
| `none_stated` | `none_stated` | `requirement` or `recommendation` for a norm (from the relation); otherwise `general_claim` |
| `original_measurement` | `measurement` | `observed_result` |
| `standard_or_regulation` | `standard_text` | as for `none_stated` |
| `expert_judgement` | `professional_observation` | `general_claim` |
| `guidance` | `standard_text` | `recommendation` |
| `proposal` | unscored | unscored (the attitude `proposed` is scored) |
| `hypothesis` | `none_stated` | `hypothesis` |

- **Independence is `unknown` everywhere on spent material.** It is scored only on R2.
- **The 36 contested labels** keep O-2's rule: both labels count as right.

**Consequence.** Most of the 31 W1 convention errors become right for A0 under this mapping. That is a convention
effect (§1). It is not a reader effect.

## 4. Spent references whose text is hashed: what can be measured

**Measured in stage 1.** In the private copies, a subject, object or condition is replaced by its hash in:
- 151 of 238 sealed scientific propositions;
- 140 of 269 development propositions.

The originals were not kept (O-2 §1.4). Only these propositions keep their subject, object and conditions readable:

| | Readable | Of which norms | Of which cited |
|---|---|---|---|
| Sealed (spent) | 87 of 238 | 21 of 84 | 45 |
| Development (spent) | 129 of 269 | 15 of 59 | 95 |
| **Total** | **216 of 507 (43 %)** | **36 of 143 (25 %)** | 140 |

**Mechanical scoring therefore needs these rules, fixed now:**
1. **Carried grades.** An A1 item identical to an A0 item (lines, subject, object) keeps A0's adjudicated match and
   its subject and object grades. Its other elements are re-scored by the label rules of §2.
2. **Mechanical match.** Any other item is matched to a readable reference proposition when:
   - the lines overlap;
   - the content-word overlap (Jaccard) of subject and of object is each at least 0.5.
3. **Unscorable.** An item that is neither carried nor matched is counted as unscorable and reported, for both arms.
4. **Proxy check before any A1 code.** On the readable subset, the mechanical match and subject/object grade must
   agree with A0's adjudicated grades on at least **0.85** of items. Otherwise the mechanical gate is not valid, and
   §8 decision 2 applies.
5. **Gate measures** (right-element share, complete faithful coverage, wrong rate, uninterpreted share) are computed
   **on the readable subset**, the same for both arms, over the elements A0 can express.

**Limit.** The main target of W3 is norms, and only 25 % of them are mechanically measurable. A gate passed on the
readable subset alone is weak evidence for norms (§8, decision 2).

## 5. The sealed stage (R2), for the judge guide

The O-2 judge guide applies, with these changes:
- **Elements graded:** the four evidence dimensions, `cited_sources` and `attributed_to` separately, `deontic_force`
  and `norm_bearer`.
- **Not graded:** elements R2 marks `unclear`.
- **Conventions:**
  - 1, 3 and 4 are replaced by §2;
  - 2, 5, 6 and 7 are kept.
- **Critical types:** as in §2.6.
- **Fixed in advance.** Adjudication conventions are fixed **before any judging**. O-2 had to fix its conventions
  after judging.

## 6. Scope of W3, W4 and W5

**W3 is limited to the closed-class causes of W1** (`W1-DIAGNOSIS.md` §4.1, "Yes"):
- negation scope;
- deontic force and bearer;
- proposal scope per proposition;
- the citation block, as a source link, never as an attribution;
- segmentation and Markdown structure;
- a part-of-speech guard on the verb fallback;
- conditional clauses;
- labels of hypothetical cases.

**W3 excludes:**
- relation senses;
- nominal and adjectival relations;
- concept spans and ellipsis;
- source types;
- hedges.

These go to W4 (`uncertain`), never to new word lists.

**W4 and W5 stay planned. They are not started.**

**The figure 0.57 (W1 §5.1)** is the result of one optimistic simulation:
- it covers the correction classes examined there;
- it assumes perfect corrections and no new errors.

It is not a demonstrated general limit of rule readers.

## 7. Frozen before stage 2 (the deferred seal, `DESIGN.md` §8.4)

All of these are committed before any W3 code:
1. The `DESIGN.md` §8.4 list:
   - the Soundbars package and file;
   - the exposure census;
   - the selection method and the hash split;
   - the inclusion criteria;
   - the question protocol;
   - the metrics;
   - the gates and stop rules.
2. `annotation-guide.md`, with the W2 decisions in place.
3. `W2-RELATIONS.md` with the owner's decisions recorded.
4. This protocol:
   - the force table (§2.2);
   - the mapping (§3);
   - the matching and proxy rules (§4);
   - the judge-guide changes (§5).
5. The scorer and its proxy-check result. These are code for stage 2, written and committed before the A1 reader
   exists.

**The reader never accesses the Soundbars text.**

## 8. Decisions for the owner

1. **The W2 decisions D1–D7** (`W2-RELATIONS.md`). D5 and D6 matter most for advice.
2. **How stage 2 is judged.**
   - **(a) Mechanical only, on the readable subset** (§4). This uses 0 agents. Norms are 25 % measurable.
   - **(b) A development judgement.** Two judges and one adjudicator, blind to the arm, under §5. A0 and A1 are judged
     together on spent development prose. This needs 3 agents, and it departs from stage 2's "0 agents".
   - **Recommended: (b),** for three reasons:
     - O-2 found that development choices made with weaker judging than the sealed test did not transfer (O-2 §5.3,
       §8.3);
     - the norms W3 targets are mostly unreadable mechanically;
     - (a) stays as a mechanical cross-check.
3. **Type 7 and the widened type 3** (§2.6). They change the critical counts, for both arms.
