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
- **Whether a linked source actually supports the claim** is a third question. It needs the source itself, and it is
  not scored in T-1. A correct link is never reported as verified support.
- **The old ratio is still reported, labelled as such.** It is right ÷ (right + wrong), where an empty matching
  an empty counts as right.

### 2.5 Evidence

- The four dimensions (`annotation-guide.md` §1) are scored separately.
- Extraction fidelity is the item's verdict, never a probative value.

### 2.6 Critical errors

- **Types 1–6** are unchanged.
- **Two additions apply to both arms:**
  - **Type 3 is widened.** It includes an `illustrative_example` held as an observed result.
  - **Type 3 applies only to a real promotion.** The hypothetical case must be held as an observed result.
  - **New type 7.** It covers:
    - a deontic force confused (obligation, recommendation, permission or prohibition held as another);
    - a procedural obligation held as a **requirement on a product** (bearer `product` where the reference has
      `procedure`), when it would change an advice decision such as an exclusion or a shortlist condition.
- **No double counting.** One wrong element gives at most one critical error. When several types fit, the first in
  the order 1, 7, 3, 4, 5, 2, 6 is counted. For example, "do not X" read as a recommendation to X is type 1, not also
  type 7.
- **The same conventions apply to A0 and A1.**
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

**Mechanical scoring rules** (implemented in `score.py`, identical for both arms):
1. **No carried grades** (correction made in the freeze step). The first version let an A1 item identical to an A0
   item keep A0's adjudicated grades. That is asymmetric: A0 would be graded by the adjudicator and A1 by the
   program. **Both arms are now graded only by the program.**
2. **Mechanical match.** An item is matched to a readable reference proposition when:
   - the lines overlap;
   - the content-word overlap (Jaccard) of subject and of object (or the equal value) is each at least 0.5.
3. **Unscorable.** An unmatched item is counted as unscorable and reported, for both arms. It is never counted as
   right or as an absent error.
4. **Proxy check before any A1 code.** On the readable subset, the program's decision ("this item states this
   proposition, with the right subject and object") must agree with the adjudicated judgement on at least **0.85** of
   items. Nothing is copied: both sides are computed separately.
5. **Gate measures** (right-element share, complete faithful coverage, wrong rate) are computed **on the readable
   subset**, the same for both arms, over the elements A0 can express.

**Proxy check result (freeze step, 2026-10-23): failed.**

| Judgement compared | Items | Agreement as first written | Agreement on the program's decision |
|---|---|---|---|
| Sealed, adjudicated (`final-Y`) | 72 | 0.53 | **0.72** |
| Development, one judge (`judge-list-K`) | 94 | 0.41 | 0.64 |

- **The first definition was wrong.** It counted, as disagreement, items that both sides treat as "not the right
  proposition". The second definition is post hoc, and it is reported as such.
- **Neither definition reaches 0.85.** The threshold and the Jaccard parameter were **not** changed.
- **Where the program disagrees, it is one-sided.**
  - When the program matches an item, it agrees with the adjudicator in **38 of 38** sealed cases (39 of 40 in
    development).
  - It misses 20 sealed items, and 33 in development, that the adjudicator judged right. These are paraphrases of
    the reference concept.

**A0 under the program** (readable subset; baseline for stage 2):

| | Sealed | Development |
|---|---|---|
| Readable reference propositions | 87 | 129 |
| Matched by an A0 item | 35 | 37 |
| Norms matched (of readable) | **4 of 21** | **3 of 15** |
| Right-element share | 0.312 | 0.226 |
| Wrong rate (matched items) | 0.125 | 0.089 |
| Mechanical critical errors | 1 (type 7) | 0 |

**Consequence.**
- **The mechanical check cannot show an improvement.** It is not valid as a measure (0.72 < 0.85), and it sees 7 of
  the 36 readable norms.
- **Under §4.1 it is therefore *inconclusive*,** whatever A1 does.
- **What it can still do.** The program is reliable when it does match (38 of 38). It can therefore screen matched
  items for critical **regressions** in labelled elements: polarity, force, attitude and source. It cannot show
  gains.

**Limit.** The main target of W3 is norms. They are measurable mechanically only through the readable subset, and
the program matches very few of them.

### 4.1 Stage-2 sequence (owner decision: option B, conditional)

1. **A mechanical check first, with no agents.**
   - It runs on the readable subset, with coverage and limits stated.
   - It reports the unscorable share and the norms measured (36 of 143).
2. **The three agents are spent only if all of these hold:**
   - the proxy check of §4 rule 4 reaches at least 0.85;
   - the right-element share of A1 is higher than A0's (elements A0 can express);
   - critical errors of types 1, 3, 4, 5 and 7 are not higher, and none of the critical types increases;
   - the wrong rate is not higher.
3. **The development judgement.**
   - **Who:** at most two blind judges and one adjudicator.
   - **What:** A0 and A1 under random labels, on the same spent Speakers prose, under §5.
   - **When:** adjudication conventions fixed before judging.
4. **Three outcomes, fixed now:**
   - **Positive:** every condition of step 2 holds, and the coverage is sufficient. Coverage is sufficient when at
     least 50 % of readable reference propositions and at least 20 readable norms are matched in both arms.
   - **Failure:** a condition of step 2 that can be measured fails. This includes any increase in a mechanically
     detected critical type, or in unjustified answers on the questions (§9.2). The result is reported, and stage 2
     stops: no agents, no new iteration.
   - **Inconclusive:** the proxy check is below 0.85, or the coverage is insufficient. An inconclusive result is
     never counted as success or as failure. **The proxy check already makes the mechanical check inconclusive
     (§4).** What happens next is an owner decision (§10).
5. **New capabilities** (the norm bearer, `unclear` forces) are reported apart from the fields A0 can express.
   - A bearer `product` with no basis in the text is a type-7 error, never a gain.
6. **Not independent.** Claude judges on spent material are development evidence, not independent validation.

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

### 7.1 Freeze status after the freeze step (2026-10-23)

Every check below ran without Claude or the reader seeing Soundbars text. `freeze.py` reads the package bytes in an
isolated process (`python3 -I`), and writes only structural numbers and whole-file hashes. No heading, fragment or
fragment hash is written.

| Item | State |
|---|---|
| Soundbars package | **Frozen.** `PEE-CATEGORY-RESEARCH-08-SOUNDBARS-COMPLETE-v1.0.0.zip`, SHA-256 `da3593cc…04c3` |
| Document inside the package | **Frozen** by the rule "the single entry ending `COMPLETE-RESEARCH-COMPENDIUM.md`", as in O-2. SHA-256 `c7e70604…1b5a`, 100,851 bytes, 867 lines; 8 Markdown entries in the package |
| Selection rules | **Validated on spent material.** `freeze.py check-o2` reproduces O-2's speakers split exactly: 84 development and 113 sealed prose lines, and the register at line 745. O-2's "first line" is the section's first line **number**; no text is hashed |
| Exposure census | **Done.** No Pee experiment read the package. 0 of 45 sections exceed 0.2 shingle overlap with any other owner package (maximum 0.047, shared boilerplate). The Crawler-era paraphrased inventory (`research-inventory/phase271/soundbars.json`) shares 0.0 of R2's 8-word shingles. That inventory is Claude exposure in Crawler; it is measured, not used to exclude. Tables are excluded because Crawler N1 used Soundbars table rows |
| Selection and split | **Done** (`r2-selection.json`). R2 has 31 sections and 235 scored prose lines. The reserve has 14 sections and 53 lines, left untouched. No section is excluded. The source register (line 635 on) is read but not scored. The 160-line target was overshot by one long section; the rule was not changed after the result |
| Inclusion criteria | **Frozen** (§9.1) |
| Annotation guide, the 27 relations after W2 | **Frozen**: `annotation-guide.md`, `W2-RELATIONS.md` |
| Question protocols | **Frozen**: stage 2 (A-1 questions, §9.2) and the sealed stage (Q2, §9.3) |
| Metrics, gates, critical types, outcomes, stop conditions | **Frozen**: `DESIGN.md` §8.1–8.3, this protocol §2, §4.1 and §9.4 |
| Scorer | **Written and frozen** (`score.py`). **Its proxy check failed** (§4): 0.72 against 0.85 |
| A0 baselines | **Recorded**: the mechanical score (§4) and the reasoning baseline (§9.2) |
| Hashes of everything above | `freeze-1.json` |

**The freeze is complete as a record. The mechanical pre-filter of option B is not valid.** Stage 2, as decided,
would end "inconclusive" before any agent could be justified (§10).

## 8. Owner's decisions (2026-10-23)

1. **W2 D1–D7 are approved**, with precisions (`W2-RELATIONS.md`, top).
2. **Stage 2 uses option B, conditional** (§4.1): first the mechanical check, then at most three agents.
3. **Type 7 is approved,** including the procedural-to-product bearer error. **Type 3 is widened** to a real promotion
   of a hypothetical case. Both apply to both arms, without double counting (§2.6).

4. **Stage-2 reasoning questions:** A-1's spent dehumidifier questions, the same for both readers, answered from
   each reader's own universe without the document (§9.2). It is a diagnostic, not independent validation.
5. **The freeze step is authorised** (no agents, no W3–W5, no Soundbars semantics). It is done (§7.1, §9).

Stage 2 itself is **not authorised yet**.

## 9. Inclusion criteria, question protocols and stop conditions (frozen in the freeze step)

### 9.1 Inclusion criteria (R2, the sealed stage)

**Scored:**
- the prose lines of the 31 R2 sections in `r2-selection.json`. A prose line is not blank, and not a heading, a table
  row, a code-block line or a horizontal rule.

**Read by annotators but not scored:**
- headings, tables (Crawler N1 exposure), code and rules;
- the source register, from line 635 on.

**Not scored:**
- propositions the annotators flag `non_scientific`;
- elements marked `unclear` (`annotation-guide.md` §4).

**Untouched:** the reserve sections. They are kept for a later re-measurement.

### 9.2 Stage 2 reasoning check: A-1's questions (owner decision)

**The question set.** A-1's sealed question set QS on the THREE dehumidifier document.
- It is spent: private copy `pee-a1/sealed/QS-reference.json`, SHA-256 `b8646cda…bbfe`.
- 59 questions are live (Q50 was dropped at adjudication).

**Askable: 47 questions, 38 of them determinate.**
- 12 questions have a term replaced by its hash in the private copy: Q01, Q02, Q03, Q06, Q15, Q22, Q26, Q33, Q47,
  Q54, Q58 and Q60.
- They are **excluded for both arms**.
- Their terms are not reconstructed.

**The arms.**
- Each reader builds its own K+ universe (air purifiers, the R01–R39 dehumidifier package, the THREE dehumidifier
  document), with `experiments/a1/answer.py inprocess K+`. A0 uses the frozen reader; A1 uses its own reader, and
  nothing else differs.
- **Answers come from the store only.** `answer.py` never reads a document while answering.
- **Answering is in process.** A-1's retention guard refuses persistence (A-1 stop rule A6), so no snapshot can be
  answered in a new process. This is the A-1 comparison point, and it is stated as a limit.

**Harness verified.**
- The A0 rebuild reproduces A-1's recorded answers on **59 of 59** questions (answer and outcome both identical to
  the first run and the after-change run).
- **A0 baseline on the 47 askable questions:**
  - correct: 5;
  - unjustified: 1;
  - lost: 6;
  - lost (uninformed): 26;
  - justified abstention: 3;
  - uninformed abstention: 6.

**Gate.** A1 has:
- correct decisions plus justified abstentions **not lower** than A0;
- unjustified decisions **not higher**.

**Development rule.**
- W5 may be developed only on A-1's development questions QD: `pee-a1/dev/QD-author.json`, SHA-256 `29c7b85a…9b45`,
  22 of 30 askable.
- **QS answers are not inspected during development.** QS is run once, on the frozen A1.

**Status of this check.** It is a development diagnostic. It is not independent evidence of generalisation.

### 9.3 Question protocol for the sealed stage (Q2, Soundbars)

**Base.** The A-1 format (`experiments/a1/question-format.md`), with:
- an author agent;
- a blind answerer from the passage;
- adjudication.

These are stage-3 agents, not yet authorised.

**Additions, fixed now:**
1. Questions rely only on R2 lines. At least 40 % have a determinate answer.
2. **At least 6 questions of each trap kind:**
   - **Deontic:** a `holds` question on `requires`, `recommends` or `other: prohibits`, where confusing the force
     changes the answer.
   - **Promotion:** a `status` question on a proposal or an illustrative case.
   - **Evidence:** an `evidence` question.
   - **Condition:** a `holds` or `influence` question whose answer depends on a stated condition.
3. **Evidence answers use the T-1 `evidence_nature` values.** The harness maps the universe's evidence classes to
   them through the table of §3: deterministic, and the same for both arms.
4. **Outcomes are A-1's.** An answer that turns an obligation into a recommendation or a permission, or the reverse,
   is an unjustified decision **and** a type-7 critical error. It is counted once.

### 9.4 Stop conditions for stage 2 (frozen)

| # | Condition | Effect |
|---|---|---|
| T1 | The proxy check is below 0.85 | The mechanical check is inconclusive (**met now**) |
| T2 | Insufficient coverage (§4.1) | Inconclusive |
| T3 | A measurable condition of §4.1 or §9.2 fails | Failure: report and stop; no agents, no new iteration |
| T4 | A correction needs an S0 change, a change to the W2 decisions or new category words | Stop; owner decision |
| T5 | The reader, or Claude while developing, accesses Soundbars content | The sealed stage is invalid |

## 10. Decision needed before development

The owner's option B assumed a mechanical pre-filter that could show "promising" results. It cannot (§4). Three
ways forward:

- **A. Change the role of the mechanical check (recommended).** It becomes a **regression screen only**: the
  program is reliable when it matches (38 of 38).
  - The agents (at most three, as decided) are spent only if all of these hold:
    - mechanically detected critical errors do not increase;
    - matched-item labels (polarity, force, attitude, source) do not get worse;
    - the reasoning gate of §9.2 holds.
  - The improvement itself is judged only by the agents.
- **B. Recalibrate the matcher.** Fit it on the development judgement and validate it on the sealed adjudicated one.
  The sealed adjudication has already been seen in this step, so the validation would be weak. Not recommended.
- **C. Do not develop.** Keep A0, and re-examine the more capable reader.

## 11. Revision 1 of the frozen protocol (owner, 2026-10-23: option A, modified)

**The owner's decision.**
- Option A, modified. The failed proxy check (0.72 against 0.85) stays recorded.
- The threshold is not lowered. The matcher is not recalibrated on results already seen.
- Authorised, in this order:
  1. the evaluation interface;
  2. the narrowed W3–W5;
  3. one final check without agents, on spent development material and A-1's questions;
  4. only if no verifiable critical regression appears and the reasoning check holds, at most three agents (two
     blind judges and one adjudicator), on the same spent Speakers material.
- No Soundbars content, no sealed T-1 stage. Stop before stage 3 whatever the result.

**Unchanged by this revision:**
- `freeze-1.json` and every recorded result;
- the identity and selection of the Soundbars material;
- the scientific definitions, the W2 decisions, the thresholds and the Jaccard parameter.

### 11.1 The evaluation interface (score.py revision 2, export.py)

- **One record for every item and every reference proposition** (`score.normalize`).
  - It reads the T-1 fields when present: `cited_sources`, `attributed_to` as a specific attribution,
    `evidence_nature`, `statement_status`, `deontic_force`, `norm_bearer` and element `states`.
  - Otherwise it maps the old fields by §3.
- **The old schema** (A0, and the spent references) has its cited identifiers in `attributed_to`. There they count as
  `cited_sources`, and **specific attribution is unscored**.
- **Selective abstention.** An element in state `uncertain` or `not_read` is graded `abstained`: never right, never
  wrong. It counts in the uninterpreted share. A deontic force derived from an abstained relation is abstained too.
- **Unscored and unscorable are never right.**
  - An element that cannot be compared is `unscored`.
  - An item the program cannot match is `unscorable`.
- **New capabilities are counted apart** and never enter the shared right-element share: specific attribution
  (scored only on a reference that annotates it) and the norm bearer.
- **`export.py`** writes O-2's export from universe items (`o2.py` unchanged), plus the T-1 fields read from the
  universe. On A0 its rows are **identical** to O-2's export (280 of 280, sealed).

### 11.2 Verification on spent material (done before any reader change)

| Check | Result |
|---|---|
| A0 sealed, revision 1 against revision 2 | identical: right 288, wrong 41, missing 23, absent 572; share 0.312 |
| A0 development | **one defect found and fixed.** The development reference writes its sources as a string ("R01, R03"), which revision 1 read character by character. The corrected share is 0.227 (was 0.226) |
| `tests/test_score.py` | 14 constructed cases (old and new fields, string sources, abstention, `requires` against `recommends` with modality `necessary`, prohibition against negated `requires`, native evidence fields, bearer kept apart, unmatched items). They also found that a force derived from an uncertain relation must be abstained, now fixed |
| `export.py` on A0 | rows identical to O-2's export |

### 11.3 The role of the mechanical check (replaces §4.1 step 2)

- **A filter for observable regressions.** It is not a demonstration that there are none.
- **The agreement of 38 of 38** holds only for the matches the program recognises. Every other item stays
  **unscored**.
- **What the filter checks on the readable subset:**
  - no mechanically detected critical type increases;
  - the matched labels (polarity, deontic force, attitude, source link) do not get worse in their wrong counts;
  - the reasoning gate of §9.2 holds.
- **If any of these fails,** stage 2 stops with no agents and no further attempt.
- **If none fails, the agents judge.**
  - **What:** A0 and A1 under random labels, on the O-2 sealed Speakers passage (spent), against the passage itself
    and the reference R. This includes the propositions the program cannot match.
  - **What they separate:** errors, abstentions, coverage and real improvements.
  - **Their verdict decides** whether the improvement thresholds of `DESIGN.md` §8.3 are met.
- **An inconclusive mechanical result is never evidence of success.**
