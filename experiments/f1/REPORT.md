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
