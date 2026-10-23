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
