# D-2 — Correcting the structural defects found by D-1

| | |
|---|---|
| **Authorised by** | Owner, 2026-10-23, after D-1 (`85b21a5`) and T-1 stage 2 (`9b0a619`) |
| **Scope** | SD1–SD9 of `experiments/d1/REPORT.md`, temporal applicability, and the question-format defect EL2 |
| **Unchanged** | S0; the T-1 freezes (A0 `b7733df`, A1 `c85b4bf`); every D-1 and T-1 result |
| **Status** | Sections 0–3 are committed **before any code**. Results follow below them |
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
