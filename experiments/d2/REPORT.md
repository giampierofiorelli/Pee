# D-2 — Correcting the structural defects found by D-1

| | |
|---|---|
| **Authorised by** | Owner, 2026-10-23, after D-1 (`85b21a5`) and T-1 stage 2 (`9b0a619`) |
| **Scope** | SD1–SD9 of `experiments/d1/REPORT.md`, temporal applicability, and the question-format defect EL2 |
| **Unchanged** | S0; the T-1 freezes (A0 `b7733df`, A1 `c85b4bf`); every D-1 and T-1 result |
| **Status** | Sections 0–3 were committed **before any code** (`0ba208d`). Sections 4–10 give the results of the one implementation phase and the one final check. **Stopped at the decision point** |
| **Independence** | Claude's work, with constructed tests and spent material only. **Not independent validation** |

## 0. The owner's decisions (verbatim, abridged)

> 1. Una fonte citata ma non esaminata non soddisfa mai un requisito di evidenza indipendente. Anche una fonte
>    esaminata richiede controlli su natura, indipendenza, metodo e applicabilità.
> 2. Le dichiarazioni di produttori e terzi restano interrogabili come dichiarazioni attribuite, non diventano
>    automaticamente fatti verificati. Le risposte devono conservare statuto, provenienza e condizioni.
> 3. Obblighi, divieti, permessi e raccomandazioni devono avere una semantica utilizzabile dalle regole, rispettando
>    portatore e ambito. Non equiparare assenza di raccomandazione e divieto.
> 4. Tabelle scientifiche proprietà/valore e vincoli temporali devono poter essere rappresentati e utilizzati. Le
>    parti non assimilate devono comparire nel registro di copertura.

## 1. Contracts checked first (S0 and MS1)

**No S0 change is needed.** Every correction stays inside existing S0 notions.

| Need | S0 basis | MS1 form reused |
|---|---|---|
| Conditions as concept and value; an unknown context marked, never filled | 4.6 contexts and rule T7 ("unspecified") | proposition `conditions: [{concept, value}]`; `rules.conditions_fit` and its caveats |
| Time as a quantity in a frame, with interval relations | 4.x "Time is a quantity in a frame"; Allen relations | a condition whose concept is a point-in-time quantity kind. **One base kind is added** to `general.json` (`Q:point_in_time`, dimension T). This is general knowledge, not an S0 change |
| Norms: *required*, *permitted*, *forbidden*, with an authority (D18); deontic modality belongs to norms | D18; 4.10 modality | `requires`, `recommends` and the controlled forms `other: prohibits` and `other: permits` (W2 D5) |
| Indeterminate reference: evaluated under each reading, never merged | 3.6 | `recognition` returns readings; the harness answers per reading |
| Attribution separate from adoption; the standing of a claim | D10, D14, 5.8–5.9 | attribution items (holder, attitude, evidence classes, cites, `cited_sources_examined`) |

**What developers and experts do** (searched 2026-10-23):
- **Statements with qualifiers and references.** Wikidata keeps the value of a statement together with its qualifiers
  (conditions; temporal validity: *start time*, *end time*, *point in time*) and its references. A query that ignores
  qualifiers returns values out of context; the qualifiers travel with the answer.
- **Assertion apart from provenance.** Nanopublications separate the assertion from its provenance (Groth, Gibson,
  Velterop, "The anatomy of a nanopublication", *Information Services & Use* 30, 2010).
- **Reported evidence is indirect evidence.** GRADE downgrades evidence for risk of bias and for indirectness
  (population, intervention, outcome) (Guyatt et al., *BMJ* 336, 2008; "GRADE guidelines 8: indirectness", *J Clin
  Epidemiol*, 2011). A result read second-hand has not been assessed on any of these.
- **Norms with bearer and conditions.** LegalRuleML (OASIS Standard, 2021) represents obligations, permissions and
  prohibitions with their bearer and conditions. Standard deontic logic gives: obligation implies permission;
  prohibition excludes permission (von Wright, "Deontic logic", *Mind*, 1951).
- **Caches keyed by `id()`.** Python's `id()` is unique only during an object's lifetime. A weak-keyed mapping on the
  object itself avoids reuse (Python `weakref` documentation; bugs.python.org msg95530).

## 2. Plan, in dependency order, with criteria fixed now

Each fix has three checks, all fixed now:
- **(a)** correct knowledge given directly to the universe;
- **(b)** the full path through the reader;
- **(c)** a counterexample that must **not** change.

| # | Defect | Fix (one principle) | (a) correct knowledge | (b) full path | (c) counterexample |
|---|---|---|---|---|---|
| F1 | SD9 cache | The recognition index is cached per store object (a weak-keyed mapping), never by `id()` | Two universes built one after the other never share an index | — | One universe asked twice gets the same answer |
| F2 | SD4 evidence | A document-reported class meets an independent-evidence requirement **only** if the cited source was examined **and** independence and method are recorded on the attribution. Otherwise the result is `false`, with the reason | K7 → false, with the reason "cited source not examined" | K7 through the reader → false | An MS1 attribution of a test measured on record (no citation) is unchanged |
| F3 | SD1 caveats | `holds`, `influence` and `value` return `conditional_on` (the conditions of their grounds that the query does not state). A chain accumulates them | K13 → `increases`, conditional on the soil being saturated | K13 through the reader | The same question stating the condition → no caveat; a claim with no condition → no caveat |
| F4 | SD2 conflicts | `influence` reports a conflict when licensed grounds that fit the query disagree | K16 → `undetermined`, with "the sources conflict" | K16 through the reader | One source only → `increases` |
| F5 | SD8 condition contract | The reader emits conditions as concept and value ("the soil is saturated" → soil: saturated; "at 1 atm" → the kind given by the unit: 1 atm). A value claim keeps the condition that follows it. An undecomposable clause stays a condition with its text, and F3 shows it | — (the contract already holds for correct units) | K1: dry soil → `undetermined`. K2: 2 atm → `undetermined`, with no duplicate `has_property` | An undecomposable condition is never dropped |
| F6 | SD3 homonyms | Recognition returns **readings**: one per concept with the term, merged only when an identity is recorded. The harness answers under each reading, giving the common answer or `undetermined` with each reading's answer | K11 → `undetermined (indeterminate reference)`, both readings listed | K11 through the reader | One holder's concept → unchanged; two readings that agree → their answer |
| F7 | SD5 declarations | Answers carry the **standing** of their grounds: attitude, evidence class, holder (`according_to`) and conditions. A reported claim stays an attributed claim. In the reader, a value claim inherits the reporter of its sentence | K8 → 20 h, according to the manufacturer, as a declaration | K8 through the reader → the same | An asserted value has no `according_to` |
| F8 | SD6 deontic | `holds` on a norm relation draws D18 inferences between norms on the same action, bearer and fitting conditions: forbidden excludes permitted, recommended and required; required and recommended imply permitted. **The absence of a recommendation is never a prohibition** | K4: recommended? → **no**; prohibited? → yes | K4 through the reader | A discouragement (negated recommendation): prohibited? → `undetermined`. Different bearers → no inference. Nothing stated → `undetermined` |
| F9 | SD7 tables | Property/value tables in teaching documents become `has_value` units: the row's quantity, its value and unit, the row entity as a condition (never a merged entity), and the cell as provenance. Every table row is recorded in the coverage ledger: acquired, or not assimilated with its reason | — | K10 → 250 MPa. An entity matrix → each value under its entity | A table without values → ledger "not assimilated", and nothing invented |
| F10 | Time | Dated clauses ("from", "since", "until", "before", "after" with a calendar date) become conditions on `Q:point_in_time`. `conditions_fit` compares intervals when the query gives a date; otherwise F3 shows the date as a caveat | An obligation from 2027-02-18: asked at 2026-10-23 → `undetermined`; at 2028-01-01 → `yes`; with no date → `yes`, conditional on the date | The same through the reader | A non-date "before X" clause is unchanged |
| F11 | EL2 question format | A rule and a validator: question terms name concepts. A number, a unit, a bound or a comparative in a term is flagged, and must be written as a condition. **Old questions are not rewritten**; the validator only counts them | — | — | Plain terms pass |

## 3. Stop rules, regressions and the final check

- **D2-stop 1.** A fix needs an S0 change: stop on that fix and document why.
- **D2-stop 2.** A fix needs category words or a rule that only excludes a test case: it is not made, and the defect
  stays open.
- **D2-stop 3.** One implementation phase. **One final check:**
  - every suite (universe, s1core, x1, x2, o2, t1, d1, d2);
  - the D-1 audit cases;
  - one run of A-1's QS questions with the new code, for implications only.
- **D2-stop 4.** **Any regression** in an existing suite that is not the intended consequence of a fix stops the
  phase. It is reported.
- **D-1's reproductions** (`experiments/d1/test_findings.py`) assert the defective behaviour. Each corrected defect's
  reproduction is marked as an *expected failure*. The D-1 file and its results are otherwise unchanged.
- **The disappearance of an error is not evidence of a general improvement.** The final check reports what each fix
  does on its own cases and counterexamples, nothing more.

## 4. What was corrected

The code changes are in:
- `universe/rules.py`;
- `universe/recognition.py`;
- `universe/propositions.py`;
- A-1's harness `experiments/a1/answer.py`.

Three files of general knowledge were extended (§4.2). Tests: `test_d2.py` (39 tests), and the run `final-check.json`.

| # | Defect | Status | What changed |
|---|---|---|---|
| F1 | SD9 cache | **Corrected** | The index is cached in a `weakref.WeakKeyDictionary` keyed by the store object, with the store state. Thirty successive build/free/build cycles never share an index |
| F2 | SD4 evidence | **Corrected** | `rules.evidence_assessment` returns the verdict and its reason. A class reported second-hand meets an independent-evidence requirement only if the attribution records `cited_sources_examined`, `independence: independent` and a `method`. K7 → false, "cited source not examined", for correct knowledge and through the reader. A first-hand MS1 measurement is unchanged |
| F3 | SD1 caveats | **Corrected** | `holds`, `influence` and `value` return `conditional_on`: the conditions of their grounds that the query does not state, with a readable `caveats` line. A chain accumulates them. K13 → `increases`, conditional on soil: saturated, for correct knowledge and through the reader |
| F4 | SD2 conflicts | **Corrected in the rules** | `influence` reports "the sources conflict" when a licensed claim, under fitting conditions, denies the direction of a direct claim. Denying the other direction is not a conflict. **Through the harness, K16 is now governed by F6**: the two reports are two holders, so two readings. The answer is `undetermined (indeterminate reference)`, and `if_identical` gives "the sources conflict" |
| F5 | SD8 condition contract | **Corrected for three forms** | The reader emits conditions as concept and value for: a state ("the soil is saturated" → soil: saturated); a value with a unit (the general kind of the unit's dimension: pressure: 1 atm); a date (F10). Any other clause stays a condition with its text and marker, and F3 shows it. A value claim keeps the condition that follows it ("100 °C at 1 atm"). A copular claim duplicating a value is dropped. K1 (dry soil) and K2 (2 atm) → `undetermined` through the reader |
| F6 | SD3 homonyms | **Corrected in recognition and the harness** | `recognition.readings` groups a designation by holder, joined only by a recorded identity (a co-reference with verdict `same`, or an adopted identity reading). The harness answers once per holder perspective: each holder's concepts for every term, plus general knowledge. It gives the common answer, or `undetermined (indeterminate reference)` with each reading's answer. `designate` is unchanged, so D-1's SD3 reproduction, which calls the rule with the union, still passes |
| F7 | SD5 declarations | **Corrected** | Determinate answers carry `evidence`: for each ground, attitudes, evidence classes, `according_to` and conditions. When no ground is asserted, they also carry `standing: attributed` and `according_to`. In the reader, a value inside a reporting frame keeps its reporter. K8 → 20 h, according to the manufacturer, reported, for correct knowledge and through the reader. An asserted value carries no `according_to` |
| F8 | SD6 deontic | **Corrected in the rules** | `rules.deontic` (S0 D18; von Wright 1951) applies to norms on the same action, with fitting conditions and the same bearer: forbidden excludes required, recommended and permitted; any of these excludes forbidden; required and recommended imply permitted. Bearers can be named (`bearer=`), and norms of different bearers entail nothing. A discouragement is not a prohibition, and an absent recommendation is never one. K4: recommended? → `no`. **Through the reader the inference holds on the reader's own term, but the question's term "pipetting by mouth" names nothing the reader made ("pipette by mouth")**: an open designation limit (§5) |
| F9 | SD7 tables | **Corrected** | `propositions.read_tables`. In a property/value table (the value column's header is a value header of language knowledge), each row's quantity gets its value. In a matrix, each value is stated under its row entity, as a condition, never as a merged entity. Every row enters the ledger: acquired, partial, read as prose, or not assimilated, with its reason. K10 → 250 MPa through the reader. A table without values invents nothing |
| F10 | Time | **Corrected** | A date bound in a clause ("from 18 February 2027") becomes a condition on `Q:point_in_time` ("from 2027-02-18"). `conditions_fit` compares dates as points and intervals (Allen 1983). Asked at 2026-10-23 → `undetermined`; at 2028-01-01 → `yes`; with no date → `yes`, conditional on the date. Same for correct knowledge and through the reader. A non-date "before X" clause is unchanged |
| F11 | EL2 question format | **Rule and validator** | `question_format.py` flags a term holding a number, a value with a unit, a bound or a comparison. It counts; it never rewrites. **Rule for new questions:** such a term is written as a condition (`{"concept": …, "value": …}`), and the term names the concept only |

### 4.1 Counterexamples (c) that hold

- One universe asked twice, and after a change, gives a fresh, correct index.
- A first-hand measurement still meets the requirement. An examined source with independence or method missing
  does not.
- A stated condition gives no caveat. An unconditional claim gives none.
- One source only → `increases`.
- An undecomposable condition is kept and shown.
- One holder → one reading. Two holders that agree → their answer. A recorded identity joins the readings.
- Obligation → permitted `yes`, recommended `undetermined`. A discouragement → prohibited? `undetermined`. Other
  bearers → no inference. Nothing stated → `undetermined`.
- A non-date "before"/"after" clause is unchanged.
- Plain question terms pass.

### 4.2 Knowledge added (general, not category)

| File | Addition | Why |
|---|---|---|
| `universe/knowledge/general.json` | `Q:point_in_time` (dimension T, determinable `frame`, terms "point in time", "calendar date") | F10. The bare term "date" was not used: a code field of that name exists, and the architecture test forbids knowledge terms as code literals |
| `universe/knowledge/language.json` | `deontic.modes` (the D18 mode of each norm designation); `temporal` (date markers and their interval side, English month names); `value_headers` | F8, F10, F9 |
| `s1core/s1core/metrology.json` | MPa, GPa, bar, atm (SI Brochure 2019; 1 atm = 101 325 Pa, 1 bar = 10⁵ Pa) | Without them, "250 MPa" and "1 atm" are not values. **They were added because K2 and K10 needed them.** They are general metrology, but the reader path of K2 and K10 depends on them |

No category words were added. No S0 change was needed (D2-stop 1 was not met).

## 5. What is still open

1. **Designation (reader).** The question's term must equal the reader's concept up to plural or variant:
   - "pipetting by mouth" ≠ "pipette by mouth" (K4);
   - "biochar" is not read (K14);
   - five reader-path questions of D-1 stay uninformed.

   This is D-1's reader limit, untouched by D-2. It blocks F8's full path.
2. **Cross-source reasoning needs recorded identity (F6).**
   - Two documents' "mulch" are two readings until an identity is recorded. Before D-2 they were silently one.
   - No service yet records identity for general scientific terms. Same designation is the weakest evidence
     (S0 3.6.5), and it is never enough.
   - **Cost:** a question spanning two holders is `undetermined` with readings. `if_identical` shows what would
     follow under identity.
   - A-1's documents share one holder, so QS is unaffected.
3. **Examined sources (F2).**
   - No service examines a cited source or records `independence` and `method`.
   - So **no** second-hand result can meet an independent-evidence requirement today. This is the intended
     conservative state.
   - Applicability is checked only through conditions.
4. **Conditions (F5).**
   - Decomposed forms: state, value with a unit, date.
   - Comparisons ("above 30 °C"), coordinated conditions and conditions on a quantity whose kind the unit leaves
     ambiguous stay text. They only ever give caveats.
   - Value matching remains by word containment ("1 atm" would also match "11 atm"), as before D-2.
5. **Tables (F9).**
   - A matrix whose first header is empty is not assimilated (the ledger says so).
   - Cells holding several values, a value with text, or a tolerance are not read.
   - Product tables in teaching documents are now read as values under their row entity. This is the intended
     reading of the owner's decision 4, not a product-data route.
6. **Time (F10).**
   - Calendar dates only. "Since 2019", relative times ("within 30 days") and durations are not bounds yet.
7. **Deontic (F8).**
   - Inferences are drawn only between norms on the same subject and the same object, or none.
   - Exceptions, priorities and conflicts between authorities (LegalRuleML's defeasibility) are not modelled.

## 6. What was verified (the one final check)

**Suites, all passing:**

| Suite | Tests | Result |
|---|---|---|
| universe | 135 | OK |
| s1core | 47 | OK |
| x1 | 18 | OK (1 skipped: needs a snapshot, as before) |
| x2 | 25 | OK (1 skipped, as before) |
| o2 | 10 | OK |
| t1 | 14 | OK |
| d1 | 13 | OK: 8 expected failures (the corrected reproductions); SD9 skipped (no collision is possible); SD3 passes (§4) |
| d2 | 39 | OK |

**D-1's 16 cases (`final-check.json`, 21 questions):**

| Path | Before D-2 | After D-2 |
|---|---|---|
| Correct knowledge, by terms | 4 wrong: K4q1 (`undetermined` for `no`), K11q1 (`yes`), K13q1 (no caveat), K16q1 (`increases`) | **21 of 21 as expected**. K11 and K16 are `undetermined` because of the readings |
| Through the reader | 6 wrong: K1q2, K2q2, K11q1, K16q1 (wrong decisions), K13q1 (no caveat), K10q1 (lost) | All six corrected. Still failing: K4q1, K4q2, K14q2 (designation, §5.1). Four uninformed abstentions (K5q3, K6q1, K14q1, K15q1) are unchanged |
| Evidence probes | K7 `true` (wrong) | K7 `false`, "cited source not examined", on both paths |

The reader's unresolved terms are identical before and after D-2 (no designation regression).

**F11 counts (old questions, not rewritten):**

| Set | Flagged / total | Kinds |
|---|---|---|
| D-1 cases | 2 / 21 | a value with a unit (K5q1, K5q2: "0.2 µm filter") |
| A-1 QS | 15 / 60 | a number; a value with a unit; a bound |
| A-1 QD | 9 / 30 | a number; a value with a unit |

**One QS run** (A-1's 47 askable questions, K+ built with the D-2 code, in process, 96 s):
- The outcomes are **identical** to A1's (`c85b4bf`):
  - 7 correct;
  - 1 unjustified (Q30);
  - 3 lost and 27 lost uninformed;
  - 3 justified and 6 uninformed abstentions.
- No answer changed.
- Three correct answers now carry what they rest on:
  - two carry a condition the question does not state (Q19, Q59);
  - one is marked as attributed, not asserted (Q32).

  The condition labels are concepts of the owner's private package, so they are not reproduced here.
- Rows: `pee-knowledge/private-eval/pee-d2/` (SHA-256 `70eefa66…22a5`).

## 7. Regressions

1. **The assimilation lifecycle (found by the final check).**
   - Built with the D-2 code, K+ ends `ok: false, "ledger incomplete"` (A1: `ok: true`).
   - **Cause.** F9 adds table rows to the ledger, but `assimilate`'s audit compares all ledger entries with the
     sentence count.
   - **Effect.** No answer changes. The lifecycle (save, reload, removal of the working copies) does not run.
   - **This is a regression, not an intended consequence (D2-stop 4).** It is reported here as found.
   - Its correction (sentences and table rows audited apart) is a **separate, post-check commit**, so that it can
     be judged and reverted on its own (§7.1).
2. **One existing test changed** (`universe/tests/test_a1.py`, `test_modality_and_conditions`). It asserted the old
   condition format (`value == "when"`). That format was the SD8 defect, so this is the intended consequence of F5.
   The new assertion states the new contract.
3. **Small reading changes in the K+ build:**

   | Document | Change |
   |---|---|
   | AP | sentences acquired 539 → 538; partial 251 → 252; concepts 1951 → 1950 |
   | DH | propositions 866 → 867; restated 13 → 12; concepts 1372 → 1376 |
   | THREE-DH | concepts 333 → 332 |

   They come from dates, value conditions and reporting frames. They were not inspected sentence by sentence (the
   documents are private), and they changed no QS answer.

   *Correction made in the post-check commit:* this table first read "AP sentences acquired 539 → 543". The old
   audit counted the 5 acquired table rows as sentences. The sentence count is 538 (§7.1).

### 7.1 Post-check correction (separate commit)

**Correction.**
- `assimilate` now audits sentences and table rows apart. It adds `table_rows`, `table_row_entries`,
  `every_table_row_accounted` and `table_row_statuses`.
- The lifecycle requires both audits to be complete.
- Regression test: `test_d2.F9Lifecycle`. A document with a value table completes the lifecycle.

**This was done after the final check, and is labelled post hoc.** It departs from the protocol's "one final
check". It is kept in its own commit so the owner can accept or revert it.

**Post-hoc rerun** (K+ rebuilt, QS answered again):
- **Lifecycle.** `ok: true`: saved, reloaded, working copies removed, originals unchanged.
- **QS answers.** Identical to the final check on all 59 questions.
- **Every row of the K+ tables is now in the coverage ledger** (513 rows, none missing):

  | Document | Table rows | Acquired | Read as prose | Not assimilated |
  |---|---|---|---|---|
  | AP | 215 | 5 | 187 | 23 |
  | DH | 146 | 0 | 126 | 20 |
  | THREE-DH | 152 | 0 | 132 | 20 |

**What the ledger shows.**
- The owner's package tables are almost all prose cells. Their sentences are read as sentences, as before D-2.
- Only 5 rows state single values that F9 can read.
- The 63 rows not assimilated are cells holding several values, text with values, or no value. Each is recorded
  with its reason.
- So F9 adds little knowledge from these packages. Its effect is the coverage account.
- Private rows: `pee-knowledge/private-eval/pee-d2/qs-D2-postcheck*.json` (SHA-256 `9c1e3962…6546`).

## 8. Costs

- **Phase.** One implementation phase and one final check. Zero agents, no models, no services. No Soundbars
  content was read.
- **Spent material only:** D-1's constructed cases, and A-1's QS and QD (counted and answered, never inspected for
  development).
- **Code.**
  - About 730 lines added in nine files.
  - New: `test_d2.py`, `question_format.py`, `final_check.py`.
- **Universe rebuild.** One K+ build for the QS run (96 s, in process). D-1's cases rebuild in under 2 s.

## 9. Implications for T-1

1. **The A0 and A1 freezes are unchanged** (`b7733df`, `c85b4bf`). The branch's reader is no longer A1. Any T-1
   rerun with it is a new arm, and must be frozen as such.
2. **Convention change, not reader gain.**
   - T-1's scorer compares a condition by the Jaccard similarity of its concept text.
   - Under F5, "soil is saturated" becomes concept "soil" with value "saturated". A comparison of A1 with a
     D-2-based arm would mix a reader change with a convention change.
   - The owner's earlier rule applies: the conventions must be equalised before any comparison.
3. **The stage-3 traps become answerable by the rules:**
   - deontic (F8);
   - condition (F3, F5);
   - evidence (F2: a reported cited result never counts as independent);
   - promotion (F7: standing travels with the answer).

   Through the reader, designation (§5.1) is still the dominant loss: 27 of 47 QS questions are uninformed,
   unchanged.
4. **Q2 question protocol (§9.3 of T-1's `PROTOCOL.md`).** Adding the F11 rule needs an owner decision: numbers,
   units, bounds and comparisons go into conditions, and the validator runs before sealing. Old sets keep their
   form; the validator only counts them.
5. **Holders.**
   - Under F6, documents of different holders are separate readings.
   - T-1 assimilates the owner's packages under one holder, as A-1 did.
   - If packages were given distinct holders, cross-package questions would become indeterminate until identities
     are recorded.

## 10. Decision point

D-2 stops here. The three T-1 agents and the Soundbars test were not started. The owner decides:
1. whether to accept the post-check correction of §7.1, or revert it;
2. the F6 policy for cross-source identity of general scientific terms (§5.2): keep it strict, or authorise a
   recorded-identity step with its own evidence and tests;
3. whether to add the F11 rule to T-1's Q2 protocol;
4. whether the designation limit (§5.1) is the next correction, before any T-1 stage 3.
