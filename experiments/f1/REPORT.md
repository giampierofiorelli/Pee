# F-1 — Initial scientific formation: a general mechanism to acquire knowledge from research documents

| | |
|---|---|
| **Authorised by** | owner, 2026-10-23 (section 0) |
| **Branch** | `claude/f1-scientific-formation`, from the I-2 tip `da5252a`. Crawler, S0, X1, X2, V1, I-1 and I-2 unchanged |
| **Status** | Sections 0–3 are written **before any F-1 code** and committed. Results are added below them; nothing above is rewritten |
| **Independence** | Claude's work, with Claude agents as authors and annotators. **Not independent validation** |

## 0. Owner authorisation (verbatim)

> Autorizzo la fase di formazione scientifica iniziale su un nuovo ramo di Pee, partendo da I-2.
>
> Allegati: nessun nuovo file da consegnare. Autorizzo l'accesso in sola lettura ai seguenti materiali già presenti, da
> localizzare e verificare per nome e versione nel repository privato giampierofiorelli/pee-knowledge:
> * Air Purifiers 04 v1.2.0 — categoria insegnata.
> * Dehumidifiers, inclusi i riferimenti restaurati R01–R39 — categoria insegnata.
> * Robot Vacuums 05 v1.0.0 — soltanto riferimento per valutazione e trasferimento, non per insegnamento.
>
> Verifica disponibilità, provenienza, diritti e natura dei documenti prima di usarli. Distingui una ricerca
> consolidata dalle fonti originali effettivamente esaminate. Non inventare riferimenti mancanti e non accedere ad altri
> materiali privati senza autorizzazione.
>
> Obiettivo: fornire all'universo semantico una base scientifica iniziale sufficiente e un meccanismo generale per
> acquisire conoscenza nuova.
> 1. Consolida la conoscenza trasversale già esistente: grandezze, metrologia, metodi scientifici, condizioni
>    sperimentali, fenomeni fisici, relazioni, incertezza e qualità delle evidenze. Evita duplicazioni e conserva
>    provenienza e limiti di validità.
> 2. Insegna approfonditamente le due categorie attraverso il normale percorso di acquisizione dell'universo, non
>    inserendo manualmente le affermazioni di categoria nei file di conoscenza. Le affermazioni devono conservare fonte,
>    attribuzione, condizioni, metodo, standing e dipendenze.
> 3. Verifica separatamente: fedeltà dell'acquisizione e della rappresentazione; capacità delle regole quando ricevono
>    conoscenze complete e corrette; miglioramenti prodotti dall'aggiunta della sola conoscenza, su lettura,
>    interpretazione, attribuzione e inferenza; eventuale trasferimento verso i robot aspirapolvere, come risultato
>    esplorativo.
> 4. Per l'esperimento prima/dopo, completa e verifica prima il meccanismo di acquisizione, poi congela per hash i
>    servizi. Durante il confronto può cambiare soltanto la conoscenza. Se serve modificare codice, separa chiaramente
>    sviluppo ed esperimento e ripeti la valutazione con un nuovo congelamento.
> 5. Distingui sempre formazione iniziale, acquisizione guidata e apprendimento autonomo. Non dichiarare dimostrata
>    quest'ultima capacità.
> 6. Usa metriche appropriate alla fase, con denominatori, errori critici, astensioni e regressioni. Non utilizzare il
>    numero di raccomandazioni di prodotto come principale criterio di successo.
>
> Preserva Crawler, S0, X1, X2, V1, I-1 e I-2. Nessuna migrazione, nessuna modifica a Crawler, nessuna nuova
> architettura parallela, nessun servizio a pagamento. Rispetta le politiche di acquisizione e conservazione.
>
> Lavora autonomamente entro questo perimetro, con verifiche progressive e condizioni di arresto esplicite. Concludi
> con un unico rapporto che distingua capacità implementate, risultati misurati e limiti ancora aperti. Poi fermati.

Before authorising, the owner corrected two points of my proposal and added a third:
- "Pee sa ma non ragiona: zero casi" does not show that reasoning is reliable. It must be checked separately, by
  giving Pee knowledge that is already correctly represented.
- "non voglio che la formazione scientifica si trasformi in Claude che compila manualmente centinaia di file JSON".
  Pee needs a permanent mechanism that acquires knowledge from documents, represents it in the universe and reuses it.
  Showing it working shows **guided acquisition**, not yet autonomous learning.
- "Non aggiungerei altre categorie."

## 1. Material verification (done before any use)

### 1.1 What was located, and how it was checked

All three packages are in `pee-knowledge/research-packages/` (branch `main`, pulled 2026-10-23). They were extracted
only into the private working folder `~/.local/share/product-evidence-engine/private-eval/f1/packages/`, never into
this repository.

| Owner's name | File (version) | Archive SHA-256 | Integrity | Role in F-1 |
|---|---|---|---|---|
| Air Purifiers 04 v1.2.0 | `PEE-CATEGORY-RESEARCH-04-AIR-PURIFIERS-COMPLETE-v1.2.0.zip`, package `PEE-CAT-AP-004`, version `1.2.0-research-complete`, 16 Oct 2026 | `b4d60a9a…4d017` | all 6 files match the package `MANIFEST.json` (SHA-256 and size) | **taught** |
| Dehumidifiers incl. R01–R39 | `PEE-DEHUMIDIFIERS-RESTORED-SOURCES-R01-R39.zip`: original research `PEE-CAT-DH-002` v`1.0.0-research` (15 Oct 2026) and the restored register | `7d147d8f…b7f64` | no manifest in this archive. The register's 39 entries are identical in both of its files (checked entry by entry). All 38 identifiers cited in the text have a register entry | **taught** |
| Robot Vacuums 05 v1.0.0 | `PEE-CATEGORY-RESEARCH-05-ROBOT-FLOOR-CLEANERS-COMPLETE-v1.0.0.zip`, package `PEE-CAT-RFC-005`, version `1.0.0-research`, 16 Oct 2026 | `cadff9aa…14c20b` | all 10 files match the package `MANIFEST.json` | **evaluation and transfer only; never taught** |

### 1.2 Nature, provenance and rights

- **Nature.** All three are **consolidated documentary research** written for the owner, with an annotated register of
  cited sources. They state that they ran no physical test and no ranking, and that nothing in them has been
  validated within PEE. They mix several kinds of statement and label many of them: physical relations, regulatory
  test rules, standard catalogue scopes, original tests reported by others, guidance, manufacturer declarations,
  engineering inferences, and **proposed** tests or illustrative calculations. The labels differ between packages
  (for example `ORIGINAL_TEST` against `ORIGINAL_LAB` / `ORIGINAL_FIELD`).
- **Consolidated research against original sources.** F-1 examines **none** of the cited original sources: it makes
  no network access, and the dehumidifier register itself warns that it is "not freshly verified external evidence".
  So every statement Pee acquires is represented as *reported by the package author, citing source X (not examined by
  Pee)*. A cited source becomes an item that records only what the register says about it. A citation with no register
  entry stays unresolved and is never filled in.
- **Provenance.** The owner supplied the packages (16–17 Oct 2026). The dehumidifier package says it was recovered from
  the owner's ChatGPT Library and asks for citations to be checked before scientific promotion. So these documents
  can **teach**: definitions, conditions, methods, relations and the limits of evidence. They are never product facts.
- **Rights.** The packages are the owner's private material. They hold bibliographic metadata and short descriptions
  of third-party sources, not the sources' texts. The robot package also states that a catalogue entry for a paid
  standard does not give access to its text. F-1 commits **no package text** to this public repository. Statement
  texts, acquired values and run details stay private (`$PEE_PRIVATE_EVAL_DIR` and `pee-knowledge/private-eval/pee-f1/`,
  as in I-1 and I-2). Public files hold counts, identifiers, hashes and generic examples only.

### 1.3 What is used, and what is deliberately not used

- **Air purifiers.** The `v1.2-CONSOLIDATED` edition is acquired. The two standalone supplements are not acquired
  separately, because the package README says the consolidated edition reproduces their full text and that duplicated
  passages "are not independent studies or evidence". The `archive/…-PREVIOUS.md` file is a preserved earlier
  working copy and is not acquired either. The 18 teaching cases are labelled hypothetical and unexecuted. They are
  neither taught nor used as evaluation material, because evaluation questions are written by an independent author
  (section 3).
- **Dehumidifiers.** The original research file is acquired; its register is the same as the standalone register file.
  `PEE-THREE-SCIENTIFIC-RESEARCH-PACKAGES.zip` also contains a file named
  `PEE-DEHUMIDIFIERS-CONSOLIDATED-RESEARCH-2026-10-15.md`, together with air-fryer and coffee material that is not
  authorised. **I did not open that file**; only its name and size come from the archive listing. Two reasons:
  - the authorised R01–R39 archive already holds the full original research with its complete register;
  - the R01–R39 README says the consolidated file "was missing the R01–R37 register".

  If the owner wants that file included, it needs an explicit decision.
- **Robot vacuums.** Only the README and the manifest were read, so the package stays unseen. It is used:
  - as source material for an independent author of transfer questions (section 3.2, E4);
  - as an unseen document for one exploratory fidelity check, run in a separate store that is discarded and never
    used to answer anything.

  It is never acquired into a teaching store.

## 2. Design (fixed before code)

### 2.1 Three kinds of formation, kept apart throughout

| | What it is | Who chooses the content | Status in F-1 |
|---|---|---|---|
| **Initial formation** | The transversal base: metrology, general quantity kinds, condition and method concepts, relation concepts, evidence classes and the English lexical frame. Knowledge files with developer provenance and cited general authorities (JCGM 200, SI Brochure, IEC 80000) | developer | consolidated (2.3) |
| **Guided acquisition** | Pee's acquisition service reads documents the owner selected. It proposes items with provenance, attribution, conditions, methods, standing and dependencies, and they enter the universe through the normal store contract | owner selects the documents; **Pee's code** reads them | built and measured (2.4, section 3) |
| **Autonomous learning** | Pee chooses what to study, finds sources, judges what it lacks and revises itself | Pee | **not attempted, not claimed** |

Nothing about a category is written by hand into a knowledge file. Category knowledge exists in the store only as
items proposed by the acquisition service from a package.

### 2.2 Where it sits in the universe (skill 3.1)

1. **S0 notions used.**
   - D10 and D14: a document's statement is an attributed record, and the attribution content is never adopted.
   - D16 and D18: methods and standards are method items with an issuing authority.
   - 4.7: kinds of quantity with dimension and unit.
   - 4.6: the conditions that define a measurand. Following JCGM 200 (2.3 measurand; 2.52 influence quantity), the
     quantities a kind depends on are conditions that a value of that kind must state.
   - 3.6.4 and 3.6.5: two documents using the same symbol give, at most, an indeterminate co-reference proposal.
   - 5.7: model-based inference uses model items.
   - 5.9 and 6.3: standing and grounds, retraction and propagation.
   - 6.1: attribution before adoption.

   No new S0 notion is needed. If one turns out to be needed, F-1 stops (stop rule F1).
2. **What it reads and writes.**
   - It reads document structure and universe items: kinds, units, conditions, methods, evidence classes and the
     lexical frame.
   - It writes records, attributions, cited-source entities, quantity-kind proposals, relation contents, model items
     and method items.
   - Each item carries the package's provenance (basis `document statement`, holder = the package). Each proposal
     also carries an inference record and a standing whose label is never stronger than its weakest premise.
3. **A domain Pee has never studied.** The mechanism works from document structure and general notation, and names no
   domain. What it learns from a document is left as reusable items:
   - definition tables;
   - symbols with arguments;
   - formulas;
   - statements that two quantities are not the same;
   - scope tables of standards;
   - citation registers;
   - evidence legends.

   The robot-vacuum fidelity check (section 3.2, E4) tests it on a document it was not built on.

### 2.3 Consolidation of the transversal base (owner point 1)

- **Audit.** I list every item of `knowledge/general.json`, `knowledge/language.json` and `s1core/metrology.json`
  with its role. I find duplicates (one notion defined twice) and **shared terms** (one word anchoring several kinds,
  which the reading separates by dimension; these are kept but listed). Every item must have provenance and a stated
  domain of validity.
- **Separate category items from the base.** In I-2 I hand-entered category-specific items into `general.json`:
  - clean air delivery rate, coverage area, test materials, air change rate;
  - suction pressure, refresh rate, frequency response and its limits;
  - storage and transfer rates, surface temperature;
  - part kinds specific to one category, artefact kinds, and the AHAM AC-1 standard.

  They move unchanged to `knowledge/legacy-i2-category.json`, marked "developer-entered for I-2, not acquired".
  `loader.load_general_knowledge(store, legacy=True)` keeps loading them, so I-1 and I-2 behave exactly as before. The
  F-1 experiments load the base without them (`legacy=False`). They are **superseded for the taught categories** by
  what acquisition produces, and kept for the others so that I-1 and I-2 stay preserved.
- **Transversal additions.** These are general metrology and evidence quality, not category knowledge:
  - units: degree Fahrenheit, US liquid pint, litre per day, pint per day, litre per kilowatt-hour, cubic foot per
    minute per watt, ppm, ppb, microgram per cubic metre, and the surfaces `h⁻¹` and `h-1` of the existing per-hour
    unit;
  - a small set of **evidence-class concepts**: established physical relation, regulatory rule, standard catalogue
    description, certified rating, original measurement, clinical trial, systematic review, guidance, manufacturer
    declaration, engineering inference, proposed method, illustrative example, unsupported claim and unknown. Each has
    English terms, its S0 basis, and whether it can count as independent test evidence (never for a declaration or a
    proposal);
  - lexical-frame entries for reading the structure of research documents:
    - the header words of definition and scope tables;
    - non-identity markers (`!=`, `≠`, "is not", "not the same as");
    - formula operators;
    - the words that introduce an evidence legend.

### 2.4 The acquisition mechanism (owner point 2)

It runs inside the existing acquisition service and through the same entry point. It reuses `Lexicon`,
`parse_values`, `place`, records, attribution and `_propose`. There is no second interpreter and no category branch.

| | Input structure | Item it proposes | S0 |
|---|---|---|---|
| **A0 Markdown reader** (input adapter, syntax only) | a Markdown file | the structure the acquisition already reads (headings with paths, text blocks, table grids with header flags and locators), plus each block's code spans and bracketed identifiers | — |
| **A1 Cited sources** | register entries: a heading, list item or table row that begins with an identifier the text cites in brackets | one `entity` per cited source, holding the register's own metadata (organisation, title, date, URL, class text) with `examined: false`. A cited identifier with no entry is listed as **unresolved**, never filled in | D14, 6.1 |
| **A2 Evidence legend and labels** | a block that defines the document's own claim labels; a label used on a statement (inline or in a status column) | each document label is mapped to a universe evidence class through the class terms. Only the words decide the mapping; a label no class explains stays unmapped. The class is recorded on the statement's attribution | 5.9 grounds |
| **A3 Statements** | every table row and text block with citations or labels | a `record` (faithful text and locator) and an `attribution` content: holder = the package, `cites` = the resolved source entities, `unresolved` = the rest, `evidence_class` | D10, D14 |
| **A4 Definitions of quantities** | definition-table rows: a symbol or term, and a definition with a unit | a `quantity_kind` proposal whose dimension comes from the unit through the metrology. Its terms are the symbol (when it is not a single letter) and the definition's head phrase. Two further readings: several subscripted forms of one symbol in one row (`X_a, X_b`) give **one kind with a defining condition** whose values are the subscripts; functional notation `X(a, b)` gives `depends_on` relation contents from the kind to each argument (an influence quantity). An argument resolves to a symbol defined in the same document, or to a universe kind or condition; otherwise it stays unresolved. **Identity:** within one document, one symbol is one kind. Across documents, kinds are **never merged**; the same symbol with the same dimension gives an indeterminate co-reference proposal. A row whose term already names a base kind of the same dimension adds a supporting attribution to that kind instead of creating a duplicate. A row without a readable unit gives no kind: its record stays, marked incomplete | 4.7, 4.6, JCGM 200 2.3 and 2.52, 3.6.5 |
| **A5 Non-identity** | `a != b`, `a ≠ b`, "X is not Y" in a definition or error column | a `distinct` relation content between the two designations, each resolved to a kind where possible | 4.7, 5.8 |
| **A6 Formulas** | a formula span `y = expression` whose symbols are defined in the same document, or are universe kinds | a `model` item when the expression is a monomial (products, quotients and powers of symbols and constants). Its forms for every variable are solved by exponent algebra, and it passes the dimensional check of the model service. Other expressions stay as records | 5.7, D7 |
| **A7 Standards and methods** | scope-table rows that name a standard or protocol | a `method` item for each: label, edition years, and the kinds it measures. Its **test conditions** are values whose dimension matches an influence quantity of a measured kind, kept per variant. Its negative scope ("does not establish") is kept as a record | D16, D18, 7.3 |
| **A8 Usage anchoring** | in a document that defines a kind, a word written before a value whose unit has that kind's dimension, at least twice, and no other kind of the document with that dimension | a candidate term of the kind (a proposal with standing), used by the reader only while current | D4 (lexical) |

**Reading and rules** (the same code paths as I-2, extended in general terms):
- **(i) Influence quantities as defining conditions.** The `Lexicon` adds the `depends_on` targets of a current
  relation content to a kind's defining conditions. A value that does not state them leaves them **unspecified**
  within its measuring series. A situation that states them then makes the value inapplicable (I-2 mechanism).
- **(ii) Conditions read from headers and questions.** A value next to a term of an influence quantity, or a bare value
  whose dimension matches **exactly one** influence quantity of the header's kind, becomes that condition.
- **(iii) Conditions fixed by a method.** When a content names a method that fixes **one** condition set for the
  content's kind, those conditions are added, with the method as a premise. With several variants nothing is added.
- **(iv) Distinct kinds.** When the terms of two kinds related by `distinct` both match a header, the content is
  ambiguous (incomplete). Two kinds that share a term are never treated as one.
- **(v) Models.** Acquired models reach the model service through the store as they are.

Retraction of a cited source, a statement or a definition propagates through `current` (I-2) to everything that rests
on it.

**Not attempted in F-1** (kept only as attributed records): causal claims in free prose, quantitative findings about
samples, health outcomes, consumer needs, proposed protocols, and the packages' own proposed schemas, pseudocode and
YAML. These are listed as open.

### 2.5 Alternatives considered

| Alternative | Why not |
|---|---|
| Write the category knowledge as JSON by hand (I-2 style) | refused by the owner. It teaches Claude's reading, not Pee's |
| Ask a language model to translate the packages into items | not Pee's code at runtime; nothing reusable would remain; not allowed (no extra AI services) |
| Free-text relation extraction from all prose (open information extraction) | unbounded error, and no general way to type the relata. F-1 starts from the parts of the documents whose structure carries meaning (tables, notation, legends, registers) and leaves prose to a later decision |
| Merge kinds across documents on symbol or dimension | refuted on the material itself: two packages use the same symbol for different energy metrics with the same dimension. Identity of kinds is a recognition question, as for products |

## 3. Evaluation and criteria (fixed before code)

### 3.1 Material splits

- **Development units:** the parts of the taught packages I read while designing:
  - dehumidifiers: preamble to §8, plus the register;
  - air purifiers: preamble to §5.

  This material is spent.
- **Held-out units:** the parts of the taught packages I have **not** read:
  - dehumidifiers: §9 to Addendum A;
  - air purifiers: §6 to §18, Supplement 01 and Supplement 02, and the three registers.

  They are used once, for the sealed fidelity test E1.
- **Unseen document:** the robot package (E4).

### 3.2 Four separate measures

**E1 — Fidelity of acquisition and representation.**
- **Annotation.** Two independent Claude agents annotate the held-out sections blind. They see the sections and an
  annotation guide, never Pee's code. They list every unit of the A1–A7 types with its expected content: a kind's
  symbol, unit, dimension, family and dependencies; distinct pairs; models; methods with their editions and
  conditions; register entries; citations; and evidence labels. A third pass adjudicates.
- **Sealing.** The reference is hashed into `experiments/f1/seals.json` and committed before the first run.
- **Scoring.** Each acquired item is classed correct, partial or wrong. Each reference unit is acquired, abstained
  (recorded but not interpreted) or missed.
- **Critical errors:**
  - a wrong dimension;
  - two different quantities merged, or one quantity split within a document;
  - a citation resolved to the wrong entry, or an invented entry;
  - a cited source marked as examined;
  - a statement attributed to someone other than its holder;
  - a declaration or proposal classed as independent test evidence;
  - an inverted relation or a wrong formula.

**E2 — Rules given complete and correct knowledge ("sa ma non ragiona").**
- **Questions.** An independent author agent writes a question set Q from the taught packages. Each question gives one
  or more small product sheets or test reports as tables, a buyer's situation in words, and a limit, comparison or
  selection question. Each has an expected verdict and the package passages it relies on, and **at least 40 % of the
  questions must have a positive decision** (meets, fails, or a winner).
- **Reference.** A second agent answers blind, and the disagreements are adjudicated.
- **Oracle knowledge.** It comes from annotations in the E1 schema of the passages each question cites. A mechanical
  harness turns them into items, and no hand-written item enters.
- **Run.** The rules run on the oracle store. Any wrong answer here is a reasoning failure.

**E3 — Knowledge-only before/after.**
- **Freeze.** The code is frozen first: SHA-256 of `universe/*.py`, `s1core/*.py`, `metrology.json`, `general.json`
  and `language.json`, recorded in `seals.json`.
- **Arms.**
  - **K0:** the transversal base only.
  - **K1:** K0 plus what the frozen acquisition service acquires from the two taught packages.
  - **K_I2:** K0 plus the legacy I-2 items, as a reference (hand-entered against acquired).
- **Measures, on the same frozen code:**
  - Q answered under each arm;
  - reading of the spent air-purifier product pages (V1 and X2): complete contents, kinds and conditions. The
    contents that differ between arms are hand-checked as development material.
- **Outcome classes.** Every Q answer is classed by cause, against the oracle run:
  - correct decision;
  - unjustified decision (critical);
  - justified abstention;
  - **uninformed abstention** (Pee could not read the input);
  - lost decision.

  An abstention for lack of reading is never counted as a justified abstention. Pairing each answer with the oracle
  run separates the three causes: *non sa* (K0 wrong, K1 right), *non riesce a leggere* (oracle right, K1 wrong) and
  *sa ma non ragiona* (oracle wrong).

**E4 — Transfer to robot vacuums (exploratory).**
- **Questions.** An independent author writes a question set QR from the robot package, in the same format. Some
  questions need only transversal or cross-category principles (for example sound power against sound pressure, or a
  value and its stated test conditions). Others need robot knowledge that was never taught, so the correct answer is
  an abstention.
- **Measures.** QR is answered under K0 and K1, and the X2 robot pages are read under K0 and K1.
- **Fidelity of the mechanism.** The frozen acquisition is run on the robot package in a separate, discarded store and
  scored against a small blind annotation of its definition, standard and register units.
- **Status.** Exploratory: there is no threshold, and a refused transfer counts as correct where the reference
  abstains.

### 3.3 Criteria (all measured; each reported separately)

| | Criterion | Threshold |
|---|---|---|
| F1-a | E1 critical errors | **0** |
| F1-b | E1 precision of complete acquired items (correct ÷ complete) | ≥ 0.85 |
| F1-c | E1 recall of reference units (acquired ÷ reference) | reported; ≥ 0.50 expected |
| F1-d | E2 unjustified decisions on the oracle store | **0** |
| F1-e | E2 correct decisions ÷ positive questions on the oracle store | ≥ 0.80 |
| F1-f | E3 unjustified decisions, K1 against K0 | K1 ≤ K0 |
| F1-g | E3 correct decisions, K1 against K0 | K1 > K0 |
| F1-h | Regressions: I-1 and I-2 suites, the I-2 vertical increment and the I-2 X2 regression counts (`legacy=True`); s1core, X1 and X2 suites | none |
| F1-i | No category vocabulary in code: the MS1 vocabulary test, plus a new test that the acquisition code names no term of the packages | pass |

Product recommendations are **not** a criterion.

### 3.4 Stop rules (any one stops the phase; the cause is reported)

- **F1.** A needed distinction requires a change to S0.
- **F2.** Acquisition needs category words, or a category branch, in code.
- **F3.** Three reformulations of one acquisition rule on the development material without reaching the E1 thresholds
  on that material. I move on and report, and do not tune further.
- **F4.** After the held-out first run, a code change requires a new freeze. The held-out units are then spent, a
  re-run is labelled "after change", and the first run stays committed unchanged. At most **one** such change cycle.
- **F5.** A first run of E3 in which the frozen hashes differ between arms is invalid and is repeated.
- **F6.** Any critical error in E1, or any unjustified decision in E2, is reported as a defect to block. It is never
  reported as a success.

## 4. Outcome at a glance

**F-1 is closed on its stop rules F4 and F6.** The mechanism exists and runs without critical acquisition errors, but
it does not reach its own thresholds.

- **Fidelity (E1).** Precision was below threshold on the first run (0.81 and 0.29 against 0.85). Recall reached about
  0.38 against an expected 0.50.
- **Rules (E2).** The first oracle run produced 2 unjustified decisions (F6). Both came from a tolerant harness rule,
  which freeze 2 corrected.
- **Rules given complete representation (E2b).** With knowledge that is complete and correct, the rules decide
  correctly on 16 of 33 positive questions. A precise catalogue of reasoning limits explains the other 17 (section 9).
- **Knowledge only (E3).** Adding the acquired knowledge improves decisions (2 → 4 correct) and adds no unjustified
  decision.
- **Transfer (E4).** None on questions; partial on the reading of the robot package.

The single change cycle that F4 allows was used. Every after-change number is on **spent** material and is never
held-out evidence.

| | Criterion | Threshold | First run (freeze 1) | After change (freeze 2, spent) |
|---|---|---|---|---|
| F1-a | E1 critical errors | 0 | **0** (AP 0, DH 0) | 0 |
| F1-b | E1 strict precision (correct ÷ produced) | ≥ 0.85 | **not met**: AP 77/95 = 0.81; DH 4/14 = 0.29 | AP 108/126 = 0.86; DH 14/15 = 0.93 |
| F1-c | E1 recall (acquired ÷ reference units) | ≥ 0.50 expected | **not met**: AP 95/250 = 0.38; DH 32/85 = 0.38 | AP 125/250 = 0.50; DH 40/85 = 0.47 |
| F1-d | E2 unjustified decisions, oracle store | 0 | **not met: 2** (defect, F6) | 0 |
| F1-e | E2 correct ÷ positive questions, oracle store | ≥ 0.80 | **not met**: 3/33 = 0.09 | 6/33 = 0.18 |
| F1-e′ | E2b (complete representation) correct ÷ positive | — (added after E2) | 15/33 = 0.45; unjustified 2 | 16/33 = 0.48; unjustified 2 |
| F1-f | E3 unjustified, K1 against K0 | K1 ≤ K0 | **met**: 0 against 0 | 0 against 0 |
| F1-g | E3 correct, K1 against K0 | K1 > K0 | **met**: 4 against 2 | 4 against 2 |
| F1-h | Regressions | none | — | **none** (section 8) |
| F1-i | No category vocabulary in code | pass | pass | pass |

**Stop rules:**

| Rule | Status |
|---|---|
| F1 (needs an S0 change) | not triggered |
| F2 (needs category words in code) | not triggered |
| F3 (three reformulations without reaching the thresholds on development) | not triggered: the development thresholds were reached before freeze 1 |
| F4 (one change cycle after the held-out run) | **used** (section 6); no second cycle |
| F5 (hashes differ between arms) | not triggered: every arm of a run uses one freeze |
| F6 (an E1 critical error or an E2 unjustified decision) | **triggered** by the 2 unjustified E2 decisions on the first run; reported as a defect |

Product recommendations were not counted anywhere.

## 5. What was implemented (capabilities, by maturity and kind)

All of it is in the existing universe modules. There is no parallel architecture and no category word in code.

| Capability | Where | Kind | Maturity |
|---|---|---|---|
| Markdown research-document reader: headings, blocks, tables, codes, citations, locators | `universe/markdown.py` | reading | operational on the packages; measured (E1, E4) |
| Reading research documents into units: kinds with symbol, unit, dimension, family and dependencies; formulas; non-identity; methods with editions and condition sets; register entries; unresolved citations; evidence labels; usage anchors | `knowledge_acquisition.read_units` | vocabulary and inference acquisition | operational; measured |
| Representation of units as store items with source, holder, attribution, standing and premises; dimension checks through the s1core metrology | `knowledge_acquisition.represent` | representation | operational; the same function serves acquired, oracle and gold units |
| Identity discipline: one symbol is one kind within a document; never merged across documents; same symbol and dimension give an indeterminate co-reference proposal; only base kinds can support | `knowledge_acquisition` | identity | operational; 0 merge errors measured |
| Acquired knowledge used for reading: current kinds, symbols, anchors, influence quantities as defining conditions, method condition sets, evidence classes, proposal terms; relation roles found by structural role, never by id | `acquisition.Lexicon`, `influence_conditions`, `read_conditions` | reading guided by knowledge | operational; measured (E3 pages) |
| Transversal base consolidated: one file, 0 duplicates; category items moved to `legacy-i2-category.json`; 15 evidence classes; `depends_on` and `distinct` relations | `knowledge/general.json` | vocabulary | operational |
| Metrology additions (°F, ft³, US pints, L/s, L/d, pt/d, kg/h, L/kWh, cfm/W, kWh/a, ppm, ppb, µg/m³, g/m³, kg/kWh, L/h, h⁻¹) | `s1core/metrology.json` | vocabulary | operational |

**Formation types.** The transversal base is **initial formation**: it was curated by the developer and audited for
duplicates (`base-audit.json`). The air-purifier and dehumidifier knowledge is **guided acquisition**: Pee's code read
documents the owner selected, and **no category statement was entered by hand**. **Autonomous learning** (choosing
what to read, judging what is missing, revising without a developer) was not attempted and is **not** claimed.

**Acquired from the two taught packages (K1, freeze 1):**

| Package | Records | Attributions | Kinds | Supports | Models | Distinct | Methods | Register sources | Labels | Abstained |
|---|---|---|---|---|---|---|---|---|---|---|
| Air purifiers 04 v1.2.0 | 214 | 200 | 6 | 5 | 2 | 13 | 17 | 72 | 18 | 7 |
| Dehumidifiers (with R01–R39) | 224 | 171 | 13 | 4 | 0 | 10 | 13 | 38 | 21 | 5 |

Every cited source is held with `examined: False`. Pee holds what the package says about a source, never the source
itself. Unresolved citations are listed and never invented.

## 6. The change cycle (F4), after the first-run diagnosis

The first runs are committed unchanged (`firstrun-counts.json`). Their diagnosis led to one change cycle (`3c9594c`,
freeze 2 in `seals.json` with `changed_from_freeze_1`). Each change is general, and none names a category term.

| | Change | Cause found in the first run |
|---|---|---|
| C1 | Question harness: every word of the asked property must be explained by universe items (restores the I-2 rule) | the 2 unjustified E2 decisions (Q-AP-21, Q-DH-27): a dropped qualifier ("formaldehyde", "independently measured") changed the question |
| C2 | A single-product question binds the role `bearer`, the role models use | models never applied in E2 (role `r0`) |
| C3 | Unit words are removed from a header only after kind terms are matched | a kind written with unit words ("changes per hour") was not found |
| C4 | A kind term containing a value of one of the kind's defining conditions names that value ("dust CADR") | family values lost on reading |
| C5 | Evidence labels used in the text are acquired as well as those in the legend; a label naming no evidence class is an abstention | labels missed in E1 |
| C6 | A method in a section headed as a proposal is a proposed method, not a standard; the last designation after a comma also names the method | proposals classed as standards; methods missed |
| C7 | Frame additions: the metrology units above, three operating-speed values, "test id" as a method row type, one stopword | units and row types missing |
| C8 | Test updates for C1–C7 | — |

C1 and C2 are harness fixes. C3–C7 change acquisition and reading. **The E1 held-out units were diagnosed before
C3–C6, so the after-change E1 numbers are tuned and spent.**

## 7. Measured results

### 7.1 E1: fidelity of acquisition (sealed blind reference, two annotators plus adjudication)

| Unit type | AP reference | AP first run | AP after change | DH reference | DH first run | DH after change |
|---|---|---|---|---|---|---|
| kind | 8 | 0 acquired | 0 | 8 | 0 | 0 |
| formula | 12 (4 definitions) | 0; 8 correct abstentions | same | 3 (1 definition) | 0; 2 correct abstentions | same |
| distinct | 79 | 9 correct | 9 correct | 21 | 1 correct | 1 correct |
| method | 38 | 0 | 17 correct | 7 | 0 | 0 |
| reference (register) | 72 | 55 correct, 17 partial (URL differs) | same | 4 | 0 | 0 |
| unresolved citation | 0 | 0 | 0 | 26 | 26 correct | 26 correct |
| evidence label | 41 | 13 correct, 1 abstained | 27 correct | 16 | 3 correct, 2 abstained (8 unmatched) | 13 correct |
| **Critical errors** | | **0** | 0 | | **0** | 0 |

**Reading:**

- **Kinds.** All 16 held-out reference kinds are introduced in running prose or in the "where" list of an equation,
  often without a unit. The reader takes definitions only from definition tables, symbol legends and notation lines,
  so it produced no kind there. This is the largest recall loss, together with non-identity statements written in
  prose (70 of 79 missed in AP).
- **Provenance.** There were no critical errors: no source marked as examined, no foreign holder, no declaration
  classed as a measurement, no invented register entry, and no wrong dimension.

### 7.2 E2: rules on the oracle store (sealed questions Q: 60 questions, 33 positive; reference agreement 60/60)

| Outcome | First run | After change |
|---|---|---|
| correct decision | 3 | 6 |
| unjustified decision (critical) | **2** | 0 |
| lost decision | 8 | 3 |
| lost decision (uninformed: Pee could not read the input) | 22 | 24 |
| justified abstention | 5 | 5 |
| uninformed abstention | 20 | 22 |

**Design flaw found by E2.** In this run the oracle supplied the knowledge, but Pee still had to *read* every product
sheet and question. Most losses are therefore reading losses, not reasoning losses, so E2 cannot answer the owner's
question "sa ma non ragiona" by itself. **E2b** was added for this reason (written after the diagnosis; `cfce9bc`).

### 7.3 E2b: rules given a complete and correct representation

- **Method.**
  - An independent annotator, who did not see the expected answers, wrote structured representations of each question:
    quantities, units, dependencies, formulas, non-identities, document rows with conditions and methods, the
    situation and the question.
  - A mechanical harness (`gold.py`) turns them into universe items through the same `represent` and `_propose` paths.
    Nothing is read from text.
  - Seal: `seals.json` `E2b_gold`. Its hash was recorded before the runs but committed with this report, so Git does
    not attest the order.

| Outcome | Q, freeze 1 | Q, freeze 2 | QR (robots), freeze 1 | QR, freeze 2 |
|---|---|---|---|---|
| correct decision | 15 | 16 | 6 | 6 |
| unjustified decision | 2 | 2 | 2 | 2 |
| lost decision | 18 | 17 | 4 | 4 |
| lost decision (uninformed) | 0 | 0 | 5 | 5 |
| justified abstention | 25 | 25 | 11 | 11 |
| uninformed abstention | 0 | 0 | 2 | 2 |
| positive questions | 33 | 33 | 15 | 15 |

**The 19 failures on Q (freeze 2), each traced to its first cause:**

| Cause | Questions | n |
|---|---|---|
| Implicit defining condition: the package's convention (smoke CADR when no aerosol is named) is not represented, so a value conditioned on a named aerosol never applies | AP-07, AP-08, AP-11, AP-14 | 4 |
| Comparability bound to one document: two values of the same kind under the same stated conditions, in different documents, count as different measuring series or methods | AP-04, AP-10, DH-04, DH-15 | 4 |
| Condition matching without unit conversion or tolerance (65 °F against 18.3 °C) | DH-07, DH-08, DH-14 | 3 |
| No selection over the available comparisons | AP-15, DH-13 | 2 |
| A quantity missing for one entity (not traced further) | AP-29, DH-11 | 2 |
| A given not representable (counts per day or year) | AP-13 | 1 |
| A derived result with no coherent SI unit: the model gives 2.08 L/kWh correctly, but no unit of factor 1 exists for m³/J, so the result cannot become a content | DH-10 | 1 |
| **No evidence requirement in the rules**: a declared value answers a question that asks for an independent measurement (unjustified) | AP-24, DH-27 | 2 |
| *Uninformed: none* | | 0 |

**Robots (QR, freeze 2):**

- **Unjustified (2):**
  - QR-20: the scope of a standard is not represented.
  - QR-09: the annotator encoded the buyer's requirement as a situation given. The harness attached it to the product,
    and it answered its own question. This is a gold-input error that the harness accepted without a check.
- **Uninformed (7):**
  - harness defect H-1 (QR-01, 13, 17, 19, 26): a gold kind whose name equals a base kind ("runtime") is represented
    as a support of the base kind, and `gold.py` looks up only document kinds;
  - multi-product documents not designated (QR-05, 07, 15);
  - a unit outside the metrology (QR-24).
- **Lost (4):**
  - subsumption of named condition values (QR-03);
  - dependencies on counts (QR-10);
  - an unstated operating setting (QR-12);
  - a missing quantity (QR-29).

H-1 also hides one airflow row in AP-20; that question remains a justified abstention.

**Answer to "Pee sa ma non ragiona".**

- With complete and correct representation, the rules **do** reason: limits, comparisons, models with unit
  conversion, condition-dependent applicability and justified abstention all work on the 16 + 25 Q answers.
- The rules are **not yet reliable**. They have no evidence requirement, which produces 2 unjustified decisions on Q.
- Five general limits (section 9) lose about half of the positive decisions.
- These are rule-and-representation limits, now separated from reading limits. **E2b is post hoc** (designed after
  E2) and is a diagnosis, not a held-out validation.

### 7.4 E3: knowledge only, before and after (same freeze for every arm)

| Arm | Q correct | Q unjustified | Q lost | Q lost (uninformed) | Q uninformed abstention | Q justified abstention |
|---|---|---|---|---|---|---|
| K0 (base), first run | 2 | 0 | 3 | 28 | 27 | 0 |
| K1 (base + acquired), first run | **4** | **0** | 4 | 25 | 27 | 0 |
| K_I2 (hand-entered I-2 items), first run | 4 | 0 | 4 | 25 | 26 | 1 |
| K0, after change | 2 | 0 | 1 | 30 | 27 | 0 |
| K1, after change | 4 | 0 | 1 | 28 | 27 | 0 |
| K_I2, after change | 4 | 0 | 1 | 28 | 27 | 0 |

- **First run.** K1 gains Q-AP-01 and Q-AP-09 from acquired knowledge ("non sapeva", now "sa"). K1 equals the
  hand-entered I-2 knowledge on correct decisions.
- **After change.** The gains are Q-AP-01 and Q-AP-05.
- **Main loss.** "Lost (uninformed)" dominates: Pee cannot read the question or the sheet, whatever it knows.

**Reading of the spent product pages (complete contents ÷ contents):**

| Group | K0 | K1 | K_I2 |
|---|---|---|---|
| Air purifiers (20 pages) | 97 / 735 | **102 / 735** | 138 / 735 |
| Robot vacuums (11 pages) | 3 / 57 | 3 / 57 | 23 / 61 |
| Other categories (7 pages) | 22 / 2,034 | 22 / 2,034 | 22 / 2,034 |

The 5 contents that K1 adds were hand-checked: 5 of 5 are correct. They are smoke CADR values on one page, read with
the acquired CADR kind, its challenge-aerosol condition and the right product. No content was lost or changed kind.
The hand-entered I-2 items still read more: 36 more on air purifiers and 20 on robots. Their terms were written for
those pages. The same counts hold after the change.

### 7.5 E4: transfer to robot vacuums (exploratory)

- **Questions (QR, 30, 15 positive).** K0 and K1 give **identical** answers: there is no transfer.
  - The first run had 1 unjustified decision in both arms.
  - After the change there were 0 correct and 0 unjustified decisions: 15 uninformed lost decisions and 15 uninformed
    abstentions.
- **Reading the robot package with the frozen mechanism, against a small blind reference of 93 units:**
  - first run: precision 2/10 = 0.20, recall 0.02;
  - after change: 13/17 = 0.76, recall 0.18;
  - critical errors: 0.
- **Register format not read.** Its 39 citations are listed as unresolved, and none is invented. This format was
  deliberately not tuned.
- **Pages.** The robot pages read no better under K1, as expected, because no robot knowledge was taught.

## 8. Preservation and tests

- **Crawler** is at `7d091ef` with a clean tree: read only, never modified.
- **Unchanged since `da5252a`:** S0 (`spec/`), `experiments/x1`, `x2`, `i1`, `i2` and `reviews/`.
- **Suites:**
  - universe: 89 OK, including 24 new F-1 tests on a pond-pump fixture, a domain never used in design;
  - s1core: 47 OK;
  - x1: 18 OK;
  - x2: 25 OK.
- **I-2 vertical increment** (`legacy=True`): 5 of 5 checks pass.
- **I-2 X2 regression:** answers identical row by row (correct 3, lost 9, not askable 53, correct abstention 35). It
  acquires 48 more records, all incomplete, from values the new reader now separates.
- **Vocabulary.** The MS1 test and the new F-1 test pass: the acquisition code names no package term. Relation ids are
  found by structural role.
- **Freeze 2.** All 26 files in `seals.json` match the committed code.

## 9. Open limits (what remains, in order of measured effect)

1. **Reading questions and product sheets** is the dominant loss on the user path: 25 to 30 of 60 decisions are lost
   uninformed. Acquired knowledge cannot help until the input is read.
2. **The rules have no evidence requirement.** A question asking for independent measurements is answered from a
   declaration. This is the one critical defect left at the rules level (2 of 33 on Q in E2b).
3. **Comparability is tied to one document.** Equal stated conditions and methods in different documents are not
   recognised as one measuring series.
4. **Conditions** are matched without unit conversion or tolerance, and without subsumption of named values.
5. **Implicit conventions** (a default test material or a standard's scope) are not represented as defeasible
   defining conditions.
6. **Derived quantities:**
   - no selection over derived or compared values;
   - no content for a result whose dimension has no coherent unit (m³/J);
   - no givens that are counts per period.
7. **Acquisition recall:**
   - kinds and non-identities written in prose and equation "where" lists;
   - method editions in prose;
   - the robot register format.
8. **Harness defect H-1** in `gold.py`: base-kind supports are not looked up. It affects 5 robot questions and one
   AP row. Also, a gold requirement given as a datum is not checked.

**What is not demonstrated:**

- autonomous learning;
- reliability of the rules on unseen material: E2b is post hoc;
- independent validation: every annotator, author and judge was a Claude agent, which is not independent.

## 10. Next step (proposal only; nothing is authorised by this report)

The smallest step with the largest measured effect is a bounded increment on the **rules**, with a new sealed set
because Q and QR are now spent:

- an evidence requirement in the inquiry (limit 2);
- comparability across documents by stated method and conditions (limit 3);
- unit-converted and subsumed condition matching (limit 4).

Reading questions and sheets (limit 1) is the next largest. It is a separate increment.
