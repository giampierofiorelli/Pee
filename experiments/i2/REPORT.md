# I-2 — How document structure links to the semantic universe

| | |
|---|---|
| **Authorised by** | owner, 2026-10-23 (section 0) |
| **Branch** | `claude/i2-semantic-linking`, from the I-1 tip `5ade5d3`. X1, X2, V1, I-1 and Crawler unchanged |
| **Status** | Sections 0–3 are written **before any I-2 code** and committed. Results are added below them; nothing above is rewritten |
| **Independence** | Claude's work. **Not independent validation** |

## 0. Owner authorisation (verbatim)

> Autorizzo I-2 su un nuovo ramo di Pee, partendo da I-1. Nessun allegato necessario; Crawler resta in sola lettura.
>
> Non procedere aggiungendo soltanto nuovi termini o regole per le tabelle. Correggi il meccanismo generale che collega
> la struttura documentale agli elementi dell'universo semantico S0/MS1.
>
> Distingui correttamente entità e parti, identità provvisorie, grandezze e relativi intervalli, condizioni operative,
> metodi e standard di prova, contesti, attribuzioni e dipendenze tra conoscenze. Non trattare queste distinzioni come
> semplici qualificatori testuali e non fondere prodotti sulla sola uguaglianza dei nomi.
>
> Le regole devono continuare a interrogare esclusivamente l'universo, producendo inferenze tracciabili e riutilizzabili
> anche tra indagini differenti.
>
> Prima verifica il contratto semantico e le dipendenze; poi realizza un unico incremento verticale su strutture
> autentiche diverse. Non creare un secondo interprete, nuovi vocabolari nel codice o scorciatoie specifiche per
> categoria.
>
> Misura separatamente copertura, correttezza dei contenuti completi, attribuzione, astensioni e riuso delle inferenze.
> Considera le due grandezze erroneamente tipizzate un difetto da bloccare, non un successo. Usa X1/X2/V1/I-1 soltanto
> per sviluppo e regressione; prepara una futura verifica sigillata su nuove fonti, senza accedervi finché non siano
> autorizzate.
>
> Non aggirare i vincoli di conservazione, non modificare S0 o Crawler e non avviare una migrazione o MS2 completo. Se
> emerge una vera incompatibilità con S0 o l'integrazione richiede nuovamente semantiche parallele, fermati.
>
> Concludi con risultati misurabili, limiti, condizioni di arresto e un solo rapporto; poi fermati.

The owner's review of I-1, which precedes the authorisation, adds two points that shape this design:
- an operating mode is a condition, a product part is an entity linked to the product, and a test standard is a
  methodological reference; none of them is a word attached to a measurement;
- I-1 shared acquired contents across inquiries, but not derived knowledge.

## 1. The semantic contract and its dependencies (checked before design)

### 1.1 What S0 requires, what MS1 and I-1 do, and the gap

Read for this check: S0 3.3 (D3, D8–D19), 3.6 (identity, indeterminacy, recognition), 3.8 (scaffold), 4.3, 4.6, 4.7,
4.9, 4.11, 5.9, 5.10, 7.3; MS1 `store.py`, `contract.py`, `rules.py`, `model.py`, `standing.py`, `loader.py`; I-1
`acquisition.py`.

| Distinction | S0 | MS1 / I-1 now | Gap |
|---|---|---|---|
| **Entities and parts** | Entities have parts (3.8); a relation holds between relata in roles (3.8 Relation) | A header word naming a part ("filter" in "Filter life") is unplaced, so the content is incomplete; there is no part relation, so a part's quantity cannot be borne by the part | no part referents, no part relation, no way for a question to designate "the filter of X" |
| **Provisional identity** | Reference may be determinate, empty or indeterminate (D3); indeterminate reference is partial reference to each candidate, and conclusions are evaluated under each admissible reading (3.6.4); recognition is an inference with standing; the same term is its weakest evidence (3.6.5) | I-1 entity ids are a hash of the name key, so **every document naming "Mod" or "Levoit Vital 200S" shares one entity**: products are merged on name equality, silently | identity across documents is not an item; it has no grounds, no standing and no readings |
| **Quantities and intervals** | A kind of quantity is a determinable; an individual quantity has bearer, kind and value (4.7); measurement uncertainty sits in values, variability in the content (4.9) | Kinds are dimension classes with terms. A dimension-only kind (frequency) is accepted as if it named a property of the bearer, which produced the two mistyped contents. Every range is read as "the value lies within" | no difference between a determinable of the bearer and a mere dimension; no span quantities (a response range); no difference between uncertainty and variation |
| **Operating conditions** | Conditions in content (domain, manifestation; 4.6, 4.11); the measurand includes the conditions that define it (JCGM 200:2012, 2.3) | Settings and a measuring distance are condition concepts. "Speed 1 (Low)" gives two settings for one value. Test material (smoke, dust, PM1) and workload have no concept | designations of one setting are not identified; defining conditions of a kind are not represented, so a CADR without its test material looks complete |
| **Methods and test standards** | Methods mean through purpose, conditions and procedure (D16, 7.3); contents produced by a method carry it in their grounds; a standard is a norm with an issuing authority (D18) | A method item exists only for a whole section whose heading names a test. "(AHAM)" or "(measured from 3 ft. away with a sound level meter)" in a header are unplaced words | a standard or procedure named in a header is not linked; contents measured by different methods are compared as if they were one measurand |
| **Contexts** | No content without context (T7); a content holding in one context is carried to another only through an explicit mapping (lifting, 4.3) | Contents carry the document's attribution. A table whose subject is named only in its section headings has no bearer. Inquiry conclusions are situated in their inquiry and never lifted | no section context for bearers; no lifting rule |
| **Attributions** | "Source S reports X" is an attribution content, never adopted silently (D14) | Present (I-1): every record is attributed | none for I-2 beyond keeping it |
| **Dependencies between knowledge** | Grounds form a structure with defeaters; when a ground changes, items resting on it are reassessed (5.9, 7.3, 6.3) | Inference records list premises. Nothing is ever retracted, and nothing checks whether a premise still stands | no retraction, no propagation, so a derived item cannot be safely reused |

### 1.2 Real dependencies, measured on the development pages

Census of the I-1 acquisition on the 38 distinct development pages (V1's 9 table pages and X2's 31 question pages):
3,065 candidate contents, 91 complete. Excluding the three benchmark-heavy pages (two Notebookcheck laptops, one
monitor review), the header words left unplaced recur across pages as follows:

| Cause | Pages | Examples |
|---|---|---|
| A defined quantity with its test standard and test material | CADR 16, AHAM 14, smoke 11, dust 4, PM1 3 | "Clean Air Delivery Rate (CADR)", "Smoke CADR (CFM)", "Top speed PM1 CADR" |
| A product part bearing the quantity | filter 14, battery 3, station, mop | "Filter life", "Filter lifespan" |
| Separators and unit lists in headers | "/" 14 | "Weight (pounds / kg)" |
| A procedure described in the header | several | "(measured from 3 ft. away with a sound level meter)", "(recorded with an electricity usage meter)" |
| Two designations of one setting | all Air Purifier First reviews | "Speed 1 (Low)" |
| Subject named only in section headings | per-product tables | "Specs: Levoit Vital 200S" under "Levoit Vital 200S – Best Overall" |
| Kind of the bearer named in the header | robot 7, purifier 11 | "Robot height", "AIR PURIFIER MODEL" |

These are the mechanisms I-2 must supply. Words with no scientific content of their own (editorial headings, AQI
index rows, prices) are not targets.

### 1.3 Compatibility with S0

No S0 change is needed: every mechanism below is an S0 notion that MS1 did not yet implement. If one turns out to
need an S0 change, I-2 stops (section 3.3).

## 2. Design (fixed before code)

**One interpreter.** `universe/acquisition.py` remains the only reader of document structure. The question-side
harness reads the buyer's property and condition with the same placement function and the same universe items; the
I-1 harness's translation table in code is removed. Every word acquisition or a question can use comes from universe
items.

**Mechanisms** (each is an S0 notion; knowledge items are added only as the anchors these mechanisms need):

| Id | Mechanism | S0 | How |
|---|---|---|---|
| **M1** | Document-scoped referents and provisional identity | D3, 3.6.4, 3.6.5 | A name in a document denotes a **referent of that document**. Designations within one document that are equal as identity keys denote one referent (the holder's own usage). Across documents nothing is merged: a recognition step proposes `co_reference` contents with their evidence class (shared identifier or exact designation; the latter is the weakest). A cross-document conclusion is drawn only under an explicit identity reading adopted by the inquiry (an assumption), and its standing says so |
| **M2** | Parts | 3.8 (parts), Relation | Part concepts are universe items. A header that names a part makes a **part referent** and a `part_of` relation content; the quantity is borne by the part. A question designates "the part P of X"; the rules resolve it through the relation. A part's property never passes to the whole (the relation transfers nothing) |
| **M3** | Kind of the bearer | 3.8 Kind, Artefact | A header word naming an artefact kind (robot, purifier) proposes an `instance_of` relation for the bearer. It is placed, not dropped, and it never becomes a part |
| **M4** | Methods and test standards | D16, D18, 7.3 | A standard named in a header (AHAM) and a procedure described in a header ("measured … with a sound level meter") become **method items** linked to the content (`method` slot) and its grounds. Contents measured by different methods are different measurands: rules compare them only under the same method, and limit checks over contents of different methods must agree |
| **M5** | Determinables, defining conditions and spans | 4.7, 3.8 Property, JCGM 200 2.3 | Kind items say whether they are a **determinable of the bearer** or only a dimension class. A content whose kind is only a dimension class is incomplete: this blocks the two mistyped contents. A kind may declare **defining conditions** (CADR: test material); a content lacking one records it as unspecified and applies only where the question leaves it unspecified too. A **span kind** (a response range) gives its two limits as two quantities of their own kinds |
| **M6** | Interval meaning | 4.9 | Each quantity content states what its interval means: `measurement` (the value lies within, uncertainty) or `variation` (values taken over unstated conditions or models). Variation is never a model input, never "equal" in a comparison |
| **M7** | Contexts | T7, 4.3 | A table's section headings are its context: a designation that two heading levels agree on names the table's bearer. Designations of one setting ("Speed 1 (Low)") are one setting. Every inquiry conclusion whose premises are not situated in the inquiry is **lifted** to a general content by an explicit lifting record; a premise the inquiry assumed (a stated usage duration) is carried into the lifted content as a **condition** (an indicative conditional content, 4.6), not into its standing |
| **M8** | Dependencies and reuse | 5.9, 6.3, 7.3 | A standing may be **retracted** by a recorded event. An item is **current** when it is not retracted and every ground is current. Rules reuse current lifted conclusions (comparisons, classifications, derived quantities) as premises instead of recomputing them; a retraction removes everything that rests on it from use |

**Rules keep querying the universe only.** Conditions, methods, parts and identity readings are matched by item
identity. No rule compares words.

**Out of scope:** prose; script-rendered pages; MS2 beyond what M1 needs (no frames, no concept identity verdicts,
no general recognition service); migration; S0 changes; Crawler changes; new HTTP access.

## 3. Criteria (fixed before code)

### 3.1 The vertical increment

One increment, on authentic structures from **at least four publishers with different layouts**, all spent:
HouseFresh (key-value cells with labelled lines, products in rows, settings in rows and columns), Air Purifier First
(specification table, per-speed tables with the product and unit in the header, per-product tables named by section
headings), Oransi (products in rows, a standard and a test material in headers) and a Notebookcheck robot review
(feature/model table). It passes when, through the MS1 contract only:

1. a quantity of a **part** is acquired with the part as bearer and answered for a question that designates the part;
2. a quantity defined by a **standard and a test material** is acquired with both, and a question about a different
   test material does not use it;
3. a **cross-document** answer about one product named in two documents is drawn only under an explicit identity
   reading, which appears in its grounds and standing; without that reading it is not drawn;
4. a **comparison** and a **derived quantity** concluded in one inquiry are lifted and then used as premises by
   another inquiry of a different kind, without being recomputed;
5. retracting one acquired premise removes the lifted conclusions resting on it from use, and re-asking gives a
   different, justified answer.

### 3.2 Success criteria (measured separately; all required)

| Id | Criterion | Measure |
|---|---|---|
| **I2-a Integration** | As I1-a (every conclusion proposed by a rule or model service, grounds reaching records; acquisition writes no verdict). In addition: every header word of a complete content is accounted for by a slot (kind, unit, referent, part, bearer kind, setting, condition, method, extent); no word list in code; the question side uses the same placement | store audit on every run; static tests |
| **I2-b Coverage** | Of the 61 V1 statements located in a table, **≥ 30% (19)** complete and correct (I-1: 5) | hand check against the V1 annotations (development) |
| **I2-c Correctness** | **0 wrong complete contents** (bearer, part, kind, value, unit, conditions, method) in the census of every complete content on the nine V1 table pages and on the X2 pages. The two I-1 mistyped contents must be blocked | hand census (development) |
| **I2-d Attribution** | 0 merges of referents across documents without a `co_reference` item; 0 complete contents on a wrong referent or part; every cross-document conclusion names its identity reading in its grounds | store audit and census |
| **I2-e Abstention** | On the spent X2 sealed questions: **0 unjustified conclusions**. Justified and unjustified abstentions are reported, with causes | regression |
| **I2-f Reuse** | At least two kinds of lifted conclusion (comparison, derived quantity, classification) are premises of later inquiries of another kind without recomputation; retraction propagates (3.1 items 4 and 5) | vertical run and T1 tests |

### 3.3 Stop criteria (any one stops I-2; the cause is reported)

1. A mechanism needs a change to an S0 thesis, definition or criterion.
2. The integration again needs parallel semantics: a word list in code, a second interpreter, or rules that compare
   strings.
3. Any unjustified conclusion on regression.
4. A wrong complete content is used by any conclusion.
5. I2-b stays below 20% (12) after three reformulations.
6. The vertical increment (3.1) does not pass after three reformulations.
7. An MS1, s1core, X1 or X2 test breaks (I-1 tests may change only where this design changes the contract; each
   change is listed).

### 3.4 Separate validation (prepared, not run)

The protocol of I-1 section 7 is kept and extended in the results (new pages from new publishers, sealed reference
of statements and questions, frozen build, the six measures of 3.2). Nothing is collected until the owner authorises
sources and access.

---

*Everything below was written after the runs. Sections 0–3 are unchanged.*

## 4. Outcome

**The mechanism is corrected and works end to end. Coverage improves but misses its target.**

- **Works end to end.** All five checks of the vertical increment pass on four publishers' tables. The rules still
  query only universe items.
- **Distinctions become items or slots.** Parts are entities, identity across documents is an explicit reading, a
  standard or a test material is part of what was measured, an interval says what it means, and a lifted conclusion
  is reused by a later inquiry of another kind and withdrawn when its ground is retracted.
- **The two mistyped contents of I-1 are blocked.**
- **No wrong content** among the 183 complete contents on the 38 development pages.
- **No unjustified conclusion** on the spent X2 questions.
- **Coverage misses its target.** 15 of the 61 V1 table statements are complete and correct (24.6%; I-1: 5). That
  is above the 20% stop line and below the 30% target. Abstention stays high: 3 correct decisions on 100 regression
  questions (I-1: 2).

No stop criterion is met.

| Criterion | Result |
|---|---|
| Vertical increment (3.1) | **pass**: 5 of 5 checks, after one routing correction (section 5.1) |
| I2-a Integration | **pass**: I-2 store audit on the vertical and regression stores; static tests. No word list in code; the question side reads with the same placement |
| I2-b Coverage | **not met**: 15 of 61 (24.6%) against ≥ 30%. Not a stop: above 20% after three reformulations |
| I2-c Correctness | **pass**: 0 wrong complete contents among 183 (section 5.4). Both I-1 mistyped contents are now incomplete ("dimension class") |
| I2-d Attribution | **pass**: referents are document-scoped by construction (the audit checks it); 0 complete contents on a wrong referent or part after the census corrections; every cross-document answer names its reading in its grounds |
| I2-e Abstention | **pass on safety**: 0 unjustified conclusions in 100 spent questions. Abstentions are high and mostly not askable (section 5.5) |
| I2-f Reuse | **pass**: a lifted comparison is used by a selection, and lifted derived energies are used by a comparison, without recomputation; retraction propagates (section 5.1) |

## 5. Results

All runs are development or regression on spent material (V1, X2, I-1). None is held-out. Agreement between Claude
agents is not independent validation, and no agent was used here.

### 5.1 The vertical increment

Documents: HouseFresh (Smart Air SA600 and Levoit Core 600S reviews), Air Purifier First (a buying guide with one
table per product), Oransi (a CADR explainer with products in rows) and Notebookcheck (a robot vacuum review). Every
answer comes from `contract.inquire`.

| Check | Question (written as items) | Answer |
|---|---|---|
| 1 Part | Service life of the **filter** of the Levoit Core 600S ≥ 6 months | applies; a `part_of` relation is among the grounds. The same bound asked of the purifier itself: undetermined (the filter's life is not the purifier's) |
| 1 Part | Volume of the **clean water tank** of the DJI Romo P2/A2 ≥ 3 L | applies (the header "Freshwater/Wastewater Tanks" over a two-value list gives one value per tank) |
| 2 Test material | Oransi Mod Jr. CADR ≥ 200 cfm for **smoke** | applies |
| 2 Test material | The same for **dust** | undetermined: the smoke value is not used |
| 2 Defining condition | Mod Jr. room coverage at **4.8 air changes per hour** ≥ 300 sq ft | applies |
| 3 Identity | Levoit Core 600S as designated by the Air Purifier First guide: sound level at speed 1, 3 ft, ≤ 50 dB, **without** an identity reading | undetermined (only the HouseFresh review states it) |
| 3 Identity | The same **with** the buyer's reading of the co-reference proposal (evidence: same designation; verdict indeterminate) | applies; standing "conditional on assumptions"; the reading is a ground |
| 4 Reuse | Sound level at top speed: Vital 200S vs Winix 5500-2, and Vital 200S vs Philips 3000i | less, less; both lifted |
| 4 Reuse | Which of the three has the lowest sound level at top speed? (selection, another kind) | Vital 200S; its only grounds are the two lifted comparisons (no recomputation) |
| 4 Reuse | Energy over a stated 8 h at top speed, for each of Vital 200S and Winix (limit checks; model then rules) | applies, applies; both derived energies lifted with the 8 h carried as a **condition** |
| 4 Reuse | Energy over 8 h: Vital 200S vs Winix (comparison, another kind) | less; grounds are the two lifted energies; services: rules only (the model is not run again) |
| 5 Retraction | Retract the acquired Winix power at top speed; ask the energy comparison again | no conclusion: the lifted Winix energy is no longer current |
| 5 Retraction | Retract the acquired Winix sound level; ask the selection again | no conclusion; the Vital-vs-Philips comparison stays current |

**Reformulation of the increment:** one. The first run sent the selection question to the quantity branch of the
contract, because it also names a kind. The routing was corrected and all five checks passed.

### 5.2 What changed in the mechanism (each an S0 notion; section 2)

| Id | Implemented as |
|---|---|
| M1 | Referent ids are scoped to their document (`E:{document, key}`). `recognition.py` proposes `co_reference` contents across documents with an evidence class (here only "same designation", the weakest, so the verdict is indeterminate). `adopt_reading` records an inquiry's explicit reading as an assumption; the rules use another document's contents only through it |
| M2 | Part kinds are concepts. A header naming a part creates a part referent and a `part_of` relation proposal; the quantity is borne by the part. `rules.part` resolves "the part P of X" through current relations. Lists pair with named parts ("Freshwater/Wastewater Tanks" over a two-value list). A part kind may declare its characteristic quantity (a container's volume). A kind may be defined relative to a part (operating time on one battery charge), which then stays a reference, not the bearer |
| M3 | Artefact kinds are concepts. A header naming one gives an `instance_of` relation, not a word. A header that is only a kind's designation ("Robot vacuum") is never a name |
| M4 | A standard named in a header (AHAM) is a method item with its issuing authority. A procedure described in a header becomes a document method item with its measuring conditions. Comparisons need the same methods |
| M5 | Kinds are marked as determinables of the bearer or as dimension classes (frequency, duration, area, pressure, temperature, data amount and rate, ratio); a dimension class alone leaves a content incomplete. New determinables replace them where the dimension class was being misused (suction pressure, clean air delivery rate, coverage area, storage capacity, write endurance, sequential read and write rates, surface temperature, refresh rate). Defining conditions: CADR's test material, coverage's air change rate, sound level's distance; unstated, they are recorded as unspecified within one table. A span kind (frequency response) gives two limit quantities |
| M6 | Every quantity content says `measurement` or `variation`. "(low – high)" over a range names its two ends, not two settings |
| M7 | Two heading levels that agree on a designation name a table's bearer. A parenthesised second designation of a setting is an alias. A table names a thing only through a cell's own text, never through notes inside a cell; notes in a label cell are never read as values |
| M8 | `dependencies.py`: `retract`, `current` (recursive over grounds) and situation conditions (assumed quantities included). The contract lifts conclusions whose premises are not particular to the inquiry; assumed quantities become conditions and readings become `under_co_references`. Rules reuse current lifted classifications, comparisons and quantities; a new selection question reasons over comparisons |

**Knowledge added (items, not code):** the kind changes above; the condition concepts test material (with its
particle classes) and air change rate; part kinds; artefact kinds; the relations `part_of` and `instance_of`, found
by their declared structural role; the AHAM AC-1 standard; written forms of the per-hour unit ("air changes per hour",
"ACH") in the one metrology. Language items: method markers, separators, comparison markers, predication words, axis
words of tables, range-end words. One anchor term was added because a development failure showed it missing: "sound"
for the emitted sound level (with a level unit only).

**I-1 tests changed** (the contract changed; listed as section 3.3 requires):
- setting values are now items (`V:setting:…`): 3 tests;
- "Battery capacity" is the battery's quantity: the question designates the part (1 test);
- "(low – high)" is a variation over the range, not two settings (1 test).

`experiments/i1` itself is unchanged; its runner is preserved as the I-1 record and is not re-run against the I-2
code.

### 5.3 Coverage (I2-b), with three reformulations

Each run was checked by hand against the V1 annotations.

| Run | Complete | of which correct | Changes |
|---|---|---|---|
| First build | 10 | 9 | A label with a value inside ("Sub-45 dBA PM1 CADR: <value>") was split, so the CADR lost its condition. **Blocked before counting**: numbers before a label's colon belong to the label |
| R1 | 12 | 11 | Names of things exclude designations explained by universe items (a heading "Filter Life"); notes in label cells are not values; a table names a thing only through a cell's own text; bounds belong to values. The one wrong reading: "(low – high)" read as settings named Low and High |
| R2 | 15 | 15 | Range ends; axis words of tables; one value per named part; restatements after "="; a part kind's characteristic quantity; the "sound" anchor |
| R3 | 15 | 15 | A kind defined relative to a part keeps the whole as bearer (a safety change found in R2's incomplete rows) |

**Final: 15 of 61 = 24.6%.**

Causes of the 24 incomplete statements:
- the time of a process ("time to reach PM1 zero"): no concept;
- capacity variants of an SSD in columns ("500GB"): variant identity, which belongs to MS2;
- reference rooms as bearers;
- HDR scenes and window sizes;
- conditions inside labels ("Sub-45 dBA");
- the generic "Frequency" header, now correctly blocked;
- names of laptops with configurations.

The 22 not acquired are prices, scores, text values, lists of three values without one condition each, and
dimension triples whose axis order is not stated.

### 5.4 Correctness and attribution: the census of complete contents (I2-c, I2-d)

Every complete content acquired from the 38 distinct development pages (V1's 9 table pages and X2's 31) was checked
by hand: **183 complete** of 2,782 contents.

- 18 are borne by parts, 46 carry a method, and 8 are variations.
- Kinds: sound level 40, electric power 32, mass 28, CADR 21, coverage area 20, service life 9, suction pressure 8,
  height 7, warranty 6, electric charge 5, volume 4, luminance 3.
- **0 wrong interpretations.**
- One value is read faithfully but is probably a source error: a robot height stated in millimetres whose size suggests centimetres. There
  is no plausibility check (limitation).

The census found three errors after R3. They were corrected by restrictions, which remove completions and never add
one:

| Error found | Correction |
|---|---|
| A column header "Robot vacuum" taken as the name of the bearer | A header that is only an artefact kind's designation is never a name |
| A bearer designated by a sentence ("The MOVA V70 Ultra Complete is one …") | A designation containing a predication word is a sentence, not a name |
| A first version of the first correction also excluded product names that contain a kind word ("Ambeo Soundbar Max") | Only a header that the kind explains entirely is excluded |

### 5.5 Regression on the spent X2 sealed questions (I2-e)

`regress.py` acquires the 31 pages (1,373 records, 1,366 contents) and lets recognition propose co-references (none:
no designation is shared by two of these documents). It then reads each question's property and condition with the
same placement as the headers.

| Outcome | I-2 | I-1 |
|---|---|---|
| Correct decision | 3 | 2 |
| **Unjustified decision** | **0** | **0** |
| Correct abstention | 35 | 35 |
| Lost decision: undetermined | 9 | 13 |
| Lost decision: not askable | 53 | 50 |

X2's B2S, reading Crawler's records, had 13 correct decisions and 1 unjustified.

**Not askable** (78 questions, 53 of which the reference decides):
- 34: the property has no universe concept (price, colour accuracy, benchmark scores, PWM flicker, "fan" noise of
  laptops, climbing height, charging time);
- 25: the product is not designated by an acquired referent;
- 19: the condition has no concept or no equivalence (workloads such as idle or gaming; "highest fan speed" against
  the documents' "top speed").

**Lost undetermined** (9). The main causes:
- a table that states a brand as a value ("Manufacturer: Bissell") counts as naming another thing, so the table has
  no default bearer. Contents are lost on the Air Purifier First reviews. The fix is to count only names in header
  positions; it is not applied because the reformulations are spent;
- CADR questions without a test material: the documents state CADR for a test material, so they do not answer a
  question that leaves it unspecified;
- a charger is not acquired as a part.

The store audit passes.

### 5.6 Integration (I2-a)

- **Store audit** (`experiments/i2/audit.py`, extending the unchanged I-1 audit). It checks that:
  - every classification, comparison, selection and inquiry-situated or lifted quantity is proposed by the rules,
    the model or the contract's lifting, and reaches records;
  - acquisition proposes only quantities, attributions and relations;
  - recognition proposes only co-references;
  - every document referent has its document.

  It passes on the vertical and regression stores.
- **Static tests:**
  - no knowledge item id or relation name in the service code (the MS1 vocabulary test caught one, which was moved
    into the knowledge as a declared structural role);
  - acquisition proposes no verdict;
  - the I-1 rule-vocabulary tests still pass.
- **One interpreter.** `acquisition.place` reads both document headers and the questions in `regress.py`; the I-1
  translation table is not used.

## 6. Separate validation on new sources (prepared, not run)

The I-1 protocol (I-1 report, section 7) applies, with these additions for I-2:

1. **Material.** New pages from at least four publishers never used in V1, X1, X2, I-1 or I-2. Selected by a written
   rule before any run: a specification or measurement table with at least one part, one test condition or one
   method in its headers. At least one product must be reviewed by two of the publishers, so that identity can be
   tested.
2. **Sealed reference.** For each table statement:
   - bearer and part, kind, value, unit, conditions, method and interval meaning;
   - for each product named in two documents, whether they are the same product, and on what evidence.

   Questions include part designations, test materials, cross-document questions and reuse chains (a comparison,
   then a selection). The references are hashed before any run.
3. **Frozen build.** The I-2 build is frozen by commit hash.
4. **Measures.** The six of section 3.2, separately: coverage, correctness of complete contents, attribution,
   abstentions (justified and unjustified), reuse, integration.
5. **Stop rules.**
   - Any unjustified conclusion stops the line.
   - Any wrong complete content used by a conclusion stops the line.
   - A cross-document conclusion without its reading in the grounds stops the line.

Nothing is collected until the owner authorises sources and access.

## 7. Limitations

- **Coverage and abstention.** Most table statements are still incomplete, and most regression questions cannot
  be asked. The universe lacks concepts for process durations, workloads, scenes and many product-specific
  determinables. Adding them as words was deliberately not done.
- **Identity** rests on designations only. The weakest evidence never decides; a reading is a buyer's assumption.
  No identifier (GTIN, model code) is read from tables. Variants (capacities), series and generic referents remain
  unresolved. Recognition beyond this belongs to MS2.
- **Equivalence of setting designations** ("top speed", "highest speed", "full speed") across documents and
  questions is not represented. Settings match only by identical designation.
- **Unspecified defining conditions** make values comparable only within one table. This is conservative and loses
  cross-document comparisons.
- **No plausibility check:** a source's unit error is read faithfully.
- **All material is spent;** all figures are development or regression. The knowledge added was guided by failures
  on that material.
- **Out of scope:** prose, script-rendered pages, and four regression pages with no tables.

## 8. Preservation and tests

- **Crawler:** HEAD `7d091ef`, clean tree; only its compiled structural readers were run, outside its tree.
- **Pee:** `experiments/x1`, `experiments/x2`, `experiments/i1`, `reviews/` and `spec/` are identical to the I-1 tip
  `5ade5d3`.
- **Suites:**

  | Suite | Tests | Result |
  |---|---|---|
  | s1core | 47 | pass |
  | universe | 65 (MS1 17, I-1 25, I-2 23) | pass |
  | X1 | 18 | pass, 1 skipped |
  | X2 | 25 | pass, 1 skipped |

  The skipped test is the snapshot fidelity test, which runs only with a snapshot copy.
- **Private material** (values, run outputs) is in `pee-knowledge` `private-eval/pee-i2/`, with page-derived text
  replaced by hashes.

## 9. Next increment (proposal; needs an owner decision)

The integration contract now holds under S0 on all the distinctions the owner listed. What limits coverage is the
size of the universe's knowledge, and identity.

1. **First, structural.** Count only names in header positions when deciding whether a table names other things.
   This is the identified cause of lost bearers in specification tables.
2. **Then, one bounded knowledge step** with the same mechanisms (no new code paths):
   - process-duration determinables ("time to clean a room"), with their defining conditions;
   - workload states as condition concepts;
   - equivalence of setting designations, as knowledge with its evidence. This is a recognition question about
     conditions, so it should be treated with the M1 discipline, not as synonyms.
3. **Then the sealed validation** of section 6 on new authorised sources.

Identifiers and variants belong to MS2.
