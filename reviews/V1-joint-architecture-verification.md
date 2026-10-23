# V1 — Joint verification of universe, representation and rules

| | |
|---|---|
| **Authorised by** | owner, 2026-10-23 (section 0) |
| **Branch** | `claude/v1-architecture-review`, from the X2 tip `98eb52a`. X1 and X2 unchanged |
| **Nature** | Read-only verification. No change to Pee code, S0, MS1 or Crawler; no migration. The traces ran in a scratch area on spent material |
| **Independence** | Claude's work. The statement annotators were Claude agents. **Not independent validation** |

## 0. Owner authorisation (verbatim, essential part)

> Autorizzo tutte e tre le richieste: V1 su un ramo separato di Pee, accesso a Crawler esclusivamente in lettura e
> utilizzo del materiale autentico già esaminato in X1 e X2. Nessun allegato aggiuntivo.
>
> La verifica deve concentrarsi sull'integrazione reale fra universo semantico, rappresentazione della conoscenza e
> regole di inferenza. Non limitarti a individuare informazioni perse: verifica se quelle conservate sono strutturate
> correttamente per S0, se concetti e relazioni possono essere interrogati dalle regole e se le conclusioni diventano
> conoscenza giustificata e riutilizzabile. Distingui le informazioni non estratte da quelle estratte ma rappresentate
> o interpretate male. Esamina anche le dipendenze tra contesti, condizioni, metodi, prove e inferenze. Usa un
> campione rappresentativo e contenuto per limitare costi e tempi. Non creare nuove architetture parallele. Concludi
> con un unico rapporto, una proposta architetturale precisa e il successivo incremento eseguibile minimo, con criteri
> misurabili di successo e arresto. Nessuna modifica al codice o a S0, nessuna migrazione. Preserva X1 e X2. Poi
> fermati.

## 1. Verdict

1. **The rules of X1 and X2 do not reason through the universe. They replace it.**
   - About 25 decision functions in `pee_x2` recognise quantities, match qualifiers and conditions and decide
     verdicts. They work on word lists loaded from JSON.
   - They write into the MS1 store only an audit trail: records, plus `interpretation` and `requirement_verdict`
     items.
   - MS1 already has rules that query universe items: relation semantics, conditions of validity, class definitions
     with bounds, quantity kinds and models. **X2 never called them.** In practice X2 was a second, parallel semantic
     layer: the outcome the owner asked us to avoid.
2. **X2's conclusions are not reusable knowledge.** This was checked on a constructed case (§3.4):
   - X2 concludes "meets", but MS1's rules and its model service find no usable content in X2's store, and MS1's
     `classify` answers "undetermined".
   - The same reading, written in the form MS1 already defines, is decided correctly by the **existing** MS1 rule,
     with grounds, without new code.
3. **Most meaning is lost before Pee, or flattened when it arrives.** Of 108 statements traced from authentic pages:
   - 41 are extracted by no reader;
   - 10 are extracted only by a richer Crawler reader that X2 did not use;
   - 23 are extracted but not retained;
   - 12 are retained but get no Pee reading;
   - 22 reach Pee, and only 7 of these are represented adequately.

   Conditions are the main casualty. 80 statements depend on conditions, and 63 of them have at least one condition outside the
   value's own cell. Only 2 of the 80 reach Pee as structured conditions.
4. **The foundations are mostly in place; the missing part is the link from documents to them.**
   - S0 defines the right items: record, situated and attribution contents, method, conditions with roles, uncertainty
     on components, reading-dependence.
   - MS1 implements part of them and its rules use them.
   - What is missing is an acquisition step that turns a document's structure into those items, not answers.
   - Also missing are five concrete MS1 capabilities (§4.2).

## 2. Method and sample

- **Pages.** 11 retained pages already used in X1/X2 (spent), chosen for variety:
  - measurement tables with test scenarios;
  - operating modes;
  - laboratory test pages;
  - a manufacturer data sheet;
  - prose measurement reviews;
  - benchmark tables;
  - specification comparison tables.

  They come from Notebookcheck (two pages), Air Purifier First, HouseFresh, Oransi, Yale Appliance, Stereophile,
  RTINGS, Tom's Hardware, DisplayNinja and Trusted Reviews.
- **Readers.** Crawler `7d091ef`, unchanged and compiled outside its tree, read each page offline with:
  - its specification reader (Phase245), which is what X2 used;
  - its whole-table interpreter (1G);
  - its table-relation reader;
  - its test-lead reader (Phase265).
- **Statements.** Three Claude agents selected up to 12 scientific statements per page (108 in total) by a fixed
  stratified rule. The strata were:
  - table result with condition;
  - mode value;
  - specification;
  - prose measurement;
  - derived value;
  - comparison;
  - method;
  - judgement;
  - ambiguous notation.

  Each statement records its subject, quantity, value, conditions (and where each is stated), method, provenance and
  dependencies.

  The sample is **purposive**: it shows where and how meaning is lost. It does not estimate rates for the web.
- **Trace.** Each statement was followed through five steps:
  1. 1G observation;
  2. Phase245 fact;
  3. record retained by Crawler and exported to Pee;
  4. X2 reading;
  5. a form MS1 rules can use.

  Matches were made by value and checked by hand. 5 false matches were removed and those statements were counted as
  not extracted.
- **Census.** All 746 X2 readings of the 1,023 declarations X2 received.
- **Rule audit.** Every decision function in X2, MS1 and s1core, plus one operational check (§3.4).

Private detail (statements, traces, reader summaries; page text replaced by hashes) is in pee-knowledge
`private-eval/v1/`.

## 3. Findings

### 3.1 Not extracted, against extracted but misrepresented

| Where the statement stops | Statements | What it means |
|---|---|---|
| Page not acquired as text (RTINGS: 6 text blocks, rendered by script); retained page is a listing, not the article (Stereophile) | 2 of 11 pages | acquisition |
| **L1** no reader extracts it | 41 | mostly prose: derived values (10 of 15), methods (6 of 8), judgements (6 of 11), prose measurements (4 of 8), comparisons |
| **L2** only Crawler's 1G table interpreter extracts it | 10 | X2 consumed only the flat label-value reader |
| **L3** extracted, not retained by Crawler | 23 | identity or retention. For example, on one Notebookcheck review Phase245 finds 539 facts and 1G finds 2,056 values, of which 0 reach Pee |
| **L5** retained, but Pee forms no reading | 12 | recognition: the label names a product or scenario, not a quantity |
| **Reached Pee** | 22 | **7 adequate; 15 misrepresented** (next table) |

The 15 misrepresented statements:

| Error | Statements | Example (described, not quoted) |
|---|---|---|
| Operating mode read as an interval | 3 | "low – high" noise at the lowest and highest fan setting read as one uncertain range |
| Subject or setting turned into qualifier words | 4 | the product name and an HDR mode became qualifiers of a luminance |
| Property lost because it lived only in a column header (the label is the product name) | 3 | warranty and height read as "duration" and "linear size" of a product name |
| Relative value read as absolute | 1 | "about 30 min longer" read as about 30 min |
| Requirement read as a property of the product | 1 | a recommended minimum for a room read as the product's minimum |
| Notation misread | 2 | a channel configuration read as a pressure; an endurance figure read as a storage capacity |
| Comparison reduced to its base value | 1 | the comparison relation is lost |

**Census of all 746 X2 readings:**
- 514 (69%) carry bare qualifier words;
- 85 of them are mode or setting words, 103 are extent or statistic words, 170 contain numbers (scenario or product
  names);
- only 23 (3%) carry a structured condition;
- 350 (47%) fall back to a generic concept;
- 145 fall back to a count.

### 3.2 Contexts, conditions, methods, evidence and inferences

| Element in the 108 statements | Present | Reaches Pee as structure |
|---|---|---|
| Conditions | 80 statements | 2 |
| Where those conditions are stated | prose 42, same cell 23, column header 18, row label 15, caption 3, heading 2 | label-value records keep, at best, the same-cell part |
| Method or instrument statement on the page | 60 | 0 (no reader links any of them) |
| Dependence on other statements (derived from, compared with) | 55 | 0 |
| Provenance role | measured by publisher 36, declared 26, calculated 17, opinion 10, unclear 15 | every one becomes a "document statement" |

These dependencies are what S0 requires:
- a measurement's interpretation depends on its method and conditions (S0 5.2);
- evidence is a relation to a content relative to a background (5.8);
- a calculated value is grounded in its inputs (Op5, 5.7).

None of these dependencies survives the current path.

### 3.3 Is retained information structured correctly for S0?

**No.** X2 keeps a record (label, raw value, section) and then a reading item of its own invention: a concept,
qualifier words, a value form and intervals.

S0 requires, for a measured or declared value:

| S0 element | S0 | X2 reading | MS1 form today |
|---|---|---|---|
| Record of the source statement, faithful (cell with its header path and locator) | D11 | label, raw value and section only | `record` kind exists |
| What the source reports (an attribution content), separate from the universe's interpretation | D10 attribution; 5.2 | absent | no `attribution` form |
| Bearer: product, component or set | 4.7; Op3 | product only; components, sets and other products end up as qualifier words | `content.bearer` plus relation contents (part-of) |
| Kind of quantity, a concept with anchors | D2, D4, 4.7 | a term list in JSON, outside the universe | `quantity_kind` (dimension only; no terms, no relations between kinds) |
| Value: interval and unit, with open bounds | 4.7, 4.9 | interval; tolerance and bounds handled in code | `lo`/`hi`/`unit`; closed intervals only; **units hard-coded in s1core with no level, electrical or data units**; a second metrology in X2 |
| Conditions, each named by a concept (setting, distance, scenario, particle) | 4.6 (2), (3) | qualifier words; 3% structured | `conditions: {name: value}` exists and the rules match it, but **names are free strings, not concepts** |
| Method and instrument | D16; 7.3; 5.9 | absent | **no `method` kind** |
| Provenance role (measured, declared, calculated) | 5.2; 5.9 | a single basis for everything | `provenance.basis` exists (measurement record, manufacturer statement, derived) |
| Derivation from other contents (relative difference, average, conversion) | Op5; 5.7 | absent | expressible: `model` items and inference records |
| Comparison between bearers | D10 | absent | no comparative form |
| Alternative readings (notation, unlabelled axes, segmentation) | 3.6.4; 4.9 interpretive | handled inside one function, never stored | absent: no reading-dependent marking |

### 3.4 Can rules query concepts and relations? Do conclusions become reusable knowledge?

**Rule audit:**
- **`pee_x2`:** recognition, qualifier matching, condition matching, scale compatibility, interval decisions and
  agreement checks. All of them query JSON lists. None queries universe items, and none of their outputs is in a form
  another rule can use.
- **MS1 (`rules.py`, `model.py`):**
  - `applicable` checks conditions of validity against an inquiry;
  - `inherited`/`supply` pass properties along relations according to each relation concept's declared semantics;
  - `classify` decides a class definition with a bound;
  - `model.run` derives quantities from models within their domain conditions.

  All of these query universe items and return proposals with an inference record and a standing. One service's
  proposal is used as another's premise (MS1, T2 acceptance).
- **Duplicates:** X2 re-implements MS1's condition matching (`_cond_ok` against `_match`) and interval decision
  (`decide` against `classify`).

**Operational check** (constructed record "Weight = 2.4 kg", requirement "at most 3 kg"; scratch only):

| Path | Verdict | Usable by MS1 rules? |
|---|---|---|
| X2 answer | meets | no: store holds `interpretation` and `requirement_verdict`; `model.project` and `rules._local` find nothing; `classify` returns *undetermined* |
| The same reading written as an MS1 `quantity` content (bearer, kind, interval, unit, scope) and the requirement as a `class_definition` | **applies**, grounds `[REQ-def, R:d0]` | yes, decided by the existing `rules.classify` |

### 3.5 What Crawler can transfer without duplication

| Crawler output | Quality on the sample | Transfer? |
|---|---|---|
| Table grid with cell coordinates, spans and header cells (1F); heading tree, section paths and method blocks (1G document model) | reliable structure | **Yes: as structure in records** |
| 1G role assignments (which header is product, property or condition), evidence class and conditions | good on HouseFresh (settings and products from row headers); mixed on Air Purifier First (property absorbs paragraphs); wrong on Notebookcheck benchmark charts (other cells' values read as conditions) | **No.** These are interpretations, and Pee must decide them |
| Table relations (relative-difference columns verified by arithmetic, statistic rows) | 749 derivations found on one review | as a hypothesis whose arithmetic Pee re-verifies, like X2's segmentation |
| Phase245 label-value facts (what X2 used) | flattest output: loses headers, captions and prose conditions | keep only as a fallback |

## 4. Architectural proposal

### 4.1 Precise mappings

The principle: **acquisition produces items, never answers; rules produce answers, never by reading strings.** The
mappings below use S0's items and MS1's forms. "New" marks the five capabilities missing today.

**A. A measured or declared value in a table cell becomes:**
1. A `record`: the cell text, its row and column header paths, caption, section path, locator and source.
   - Provenance: the publisher as holder; basis "document statement".
   - Correctness: fidelity only.
2. An **attribution content** (new form): "source S reports R".
   - Its standing comes from the source's role.
   - Role cues are evidence for the role, not proof of it: for example a "Measured" column header, a method section
     covering the table, or a manufacturer page.
3. One or more **candidate quantity contents** (MS1 `quantity` form):
   - `bearer`: an entity, or a component linked by part-of;
   - `kind`: a `quantity_kind` item;
   - `lo`/`hi`/`unit`;
   - `conditions`: `{condition-concept: value or setting}`;
   - `scope: conditional`;
   - `interprets`: the record;
   - grounds: the attribution content and, when present, the **method** item.

   Each header level contributes to exactly one slot: bearer, kind, condition or value. A level that cannot be placed
   leaves the content **incomplete** and is never turned into a qualifier word.
4. When a reading is ambiguous (notation, unlabelled axes, which header names the condition), the alternatives become
   **several candidate contents tied to one ambiguity item** (new: reading-dependence, S0 3.6.4).

**B. A value derived from others** (a percentage against a reference row, an average, a converted unit) becomes:
- a content proposed by the model service from a `model` item (the formula, as knowledge);
- its premises are the base contents and the reference content.

The table-relation hypothesis from Crawler only proposes which cells to check; the arithmetic is re-verified.

**C. A method statement** ("measured with a meter at 1 m", "AHAM protocol") becomes a **`method` item** (new kind;
D16, 7.3), with its purpose, conditions and instrument. It is linked as a ground of the contents in its scope: the
section it covers, or the table it introduces.

**D. A comparison between two products** becomes:
- a comparative content over two quantity contents with the same kind and conditions (new form);
- or, better, a derivation (B) when the page gives both values.

**E. A buyer's requirement** becomes a goal (D18) whose satisfaction content is a `class_definition`:
- kind, operator, bound, unit, conditions;
- when a range is asked about, which end the bound applies to.

**F. A verdict** is an evaluative content proposed by `rules.classify`. Its grounds are the class definition and the
quantity contents, and through them the records, methods and attributions. It is stored, so other inquiries can reuse
it as a premise.

**How the rules query this:**
- `rules.applicable` matches content conditions to the inquiry by **condition-concept identity**, not by strings.
- `classify` takes the applicable contents of the bearer and kind; when they disagree it records the conflict rather
  than concluding.
- A conclusion is reached only if **every** alternative content under an ambiguity item gives the same verdict;
  otherwise the result is reading-dependent.
- Recognition (term → `quantity_kind` or condition concept) is a separate service. It produces identity relations
  with verdicts, using the kinds' lexical and operational anchors (MS2), so no answering rule ever compares words.

### 4.2 The five missing capabilities

All five are within S0 and MS1's kind registry; none changes an S0 thesis or definition.

1. **One metrology, as knowledge.** Units, dimensions (including electric current, data and level scales) and scale
   types, read by every service. It replaces both s1core's unit table in code and X2's separate file.
2. **Concepts as items.** `quantity_kind` and condition concepts carry lexical anchors (terms) and relations between
   kinds (narrower-than, aspect-of). Condition keys refer to them.
3. **`method` kind** (D16), and an **attribution form** of content (D10).
4. **Interval and reading semantics in contents:** open bounds; the end of an extent; alternative candidate contents
   under one ambiguity item.
5. **Comparative content form.**

## 5. The next minimal executable increment

**I-1: "Table statements become MS1 knowledge and are decided by MS1 rules."** Scope:

1. The five capabilities of §4.2. These are registry and knowledge revisions with the minimal rule changes: conditions
   keyed by concept, open bounds, extent end, agreement over alternatives.
2. One acquisition step for tables only. It takes Crawler's structure (grid, header paths, document model, method
   blocks) and produces A–C above.
3. Requirements and comparisons answered only through `rules.classify` and the model service. X2's matcher is not
   used.

**Excluded from I-1:**
- prose extraction (L1), which needs its own increment;
- pages rendered by script;
- recovering what Crawler did not retain (L3). Reading beyond Crawler's retention decisions on retained pages is a
  rights question for the owner.

**Material:**
- development on the 108 V1 statements and the spent X1/X2 sets;
- the operational check on new authorised pages only if the owner authorises them; otherwise the spent sets serve as
  regression only.

**Success criteria (all required):**

| Id | Criterion | Measured on |
|---|---|---|
| **I1-a Integration** | 100% of verdicts come from MS1 rule or model services, each with grounds reaching record items. A static test shows that acquisition code contains no comparator or verdict | every run |
| **I1-b Reuse** | The same acquired contents answer a limit check, a comparison and a derived-quantity question without question-specific code. A proposal from one inquiry is a premise in another in at least 3 cases | constructed and spent cases |
| **I1-c Representation** | Of the 61 V1 statements a structural reader finds, at least 80% have bearer, kind, value, unit and conditions as structured slots, against 2 of 80 conditions today. Conditions stated in headers, rows and captions are kept at least 80% of the time. No condition survives as a qualifier word | V1 statements (development) |
| **I1-d Safety** | 0 unjustified conclusions on the spent X1 and X2 sets. Justified conclusions at least X2's 13 (X2 set) and at least 31 (X1 set). The thousands-separator case ends reading-dependent, not concluded | spent sets (regression, not held-out) |

**Stop criteria (any one stops I-1 and is reported):**
- domain or category vocabulary is needed in code (static test);
- condition matching cannot work by concept identity without a string-matching layer;
- more than five registry additions, or any change to an S0 thesis, definition or criterion, would be needed (an S0
  3.0 decision for the owner);
- I1-c stays below 60% after three reformulations: the structure is insufficient and the cause is reported;
- any unjustified conclusion on regression: work stops before anything else is added.

## 6. Open

- Prose, which is where derived values, methods and judgements mostly live (L1): reading it is a separate increment.
- Crawler's retention and identity losses (L3). The owner decides whether Pee may read retained pages beyond
  Crawler's retention decisions.
- Pages rendered by script: acquisition, outside Pee.
- Purposive sample: these counts locate losses; they are not rates.
- The annotators are Claude agents. Agreement between Claude agents is not independent validation.
