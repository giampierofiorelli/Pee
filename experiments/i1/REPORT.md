# I-1 — Table statements become MS1 knowledge and are decided by MS1 rules

| | |
|---|---|
| **Authorised by** | owner, 2026-10-23 (section 0) |
| **Branch** | `claude/i1-table-knowledge`, from the V1 tip `3d339be`. X1, X2, V1 and Crawler unchanged |
| **Status** | Sections 0–3 are written **before any I-1 code** and committed. Results are added below them; nothing above is rewritten |
| **Independence** | Claude's work. **Not independent validation** |

## 0. Owner authorisation (verbatim)

> Autorizzo I-1 nel repository Pee, su un ramo separato, con accesso a Crawler esclusivamente in lettura. Nessun
> allegato aggiuntivo.
>
> L'obiettivo è realizzare finalmente l'integrazione effettiva fra struttura documentale, universo semantico S0/MS1 e
> regole di inferenza.
>
> Parti da un percorso verticale completo su tabelle autentiche: documento → struttura fedele → interpretazioni
> scientifiche attribuite → concetti e relazioni nell'universo → inferenza MS1 → conoscenza giustificata e
> riutilizzabile.
>
> Le regole decisionali devono utilizzare gli elementi dell'universo, non dizionari paralleli o confronti di stringhe.
> L'acquisizione può proporre interpretazioni, ma non emettere verdetti scientifici autonomi.
>
> Riutilizza i lettori strutturali di Crawler senza riscriverli e senza trasferirne automaticamente le
> interpretazioni. Evita nuove rappresentazioni semantiche parallele, duplicazioni della metrologia e modifiche a S0.
>
> Comincia con il minimo percorso eseguibile, verifica le dipendenze reali e amplia soltanto dopo il primo risultato.
> Correggi la discrepanza dei denominatori nella valutazione V1. Mantieni le verifiche su materiale già usato come
> regressioni e prepara una validazione distinta su materiale nuovo, sigillato e autorizzato.
>
> Per le 23 affermazioni non conservate, verifica separatamente identità, motivi di esclusione e diritti. Non aggirare
> le politiche di Crawler e non conservare informazioni non autorizzate.
>
> Preserva X1, X2, V1 e Crawler. Non avviare MS2, migrazioni o altri filoni. Registra successi, fallimenti e
> limitazioni, con condizioni di arresto misurabili. Concludi con un unico rapporto e fermati.

## 1. Correction of the V1 denominator

V1's criterion I1-c said "of the 61 V1 statements a structural reader finds". That number was the **raw** count from
Crawler's table reader, before the 5 false value matches were removed.

The correct counts, from the same V1 data:

| Count | Statements |
|---|---|
| Extracted by at least one Crawler reader, after removing the 5 false matches (the sum of V1's L2, L3, L5 and "reached" rows) | **67** (72 raw) |
| Located in a table by the annotators (V1 statement locators) | **61** |

I-1 is limited to tables, so its representation criterion (I1-c below) uses the **61 statements located in a table**.
The equality with the old number is a coincidence of two different definitions; the old figure is withdrawn. The V1
report is not rewritten: this section is the correction.

## 2. Design (fixed before code)

**Principle.** The two halves have separate jobs:
- **Acquisition** reads structure and proposes items: records, attributions, candidate contents, methods, ambiguities.
  It never writes a verdict.
- **Rules** answer questions by querying universe items. They never compare words.

**Path:**

| Step | What happens | Owner |
|---|---|---|
| 1. Structure | Crawler `7d091ef`, compiled outside its tree, runs **only its structural readers** offline: table acquisition (1F: grid, cells, spans, header cells) and the document model (heading tree, section paths, structured names). Crawler's role assignments, evidence classes, conditions and method-block labels are **not exported** | Crawler, read-only |
| 2. Records | Each value cell becomes a `record` holding its text, row and column header paths, caption, section path and locator. It is attributed to the publisher | acquisition |
| 3. Attribution | An attribution content: "source S reports the content of record R" | acquisition |
| 4. Candidate contents | MS1 `quantity` contents. Each header segment is placed in **one** slot (bearer, kind, condition or value) by querying universe items: quantity kinds and condition concepts with their anchors, metrology units, the page's structured names. Unplaced segments make the content `incomplete`, never qualifier words. Ambiguous readings become alternative contents under one `ambiguity` item | acquisition |
| 5. Methods | A section whose heading matches a method concept's anchors gives a `method` item. It becomes a ground of the contents in that section | acquisition |
| 6. Questions | A requirement becomes a `class_definition` (kind, operator, bound, unit, the extent end when asked) plus the inquiry's conditions. A comparison becomes a comparison question | request understanding (proposes) |
| 7. Inference | `rules.classify`, a new general `rules.compare` and `model.run` (s1core) decide, through the MS1 contract, with inference records and standings | MS1 rules and model services |
| 8. Reuse | Proposals stay in the store and serve as premises of later inquiries | MS1 contract |

**Additions to MS1:** knowledge and registry, no S0 change.
1. **One metrology.** s1core's unit table moves from code to a data file that every service reads. Its existing units
   and values are unchanged. It adds electric current and data as base dimensions, plus level scales with references.
2. **Universe knowledge.** General quantity kinds and condition concepts, as store items with lexical anchors.
3. **Registry.** New kinds `method` and `ambiguity`, registered as recorded events. New content forms `attribution`
   and `comparison`.
4. **Rules.** Contents may have open bounds; `incomplete` contents are never applicable; a class definition may name
   the extent end; alternatives must agree; `compare`.

**Out of scope:**
- prose;
- pages rendered by script;
- MS2 (recognition service, identity relations, frames);
- migrations;
- recovering Crawler's non-retained statements (section 3.4 is a diagnosis only).

## 3. Criteria (fixed before code)

### 3.1 First result: one vertical path

One authentic table page, spent in V1: the HouseFresh review. It has:
- settings in rows and in columns;
- a distance in a row label;
- products in rows, with the setting in parentheses;
- "at top speed" in a column header;
- values with labels inside one cell;
- test sections.

The path passes when all of the following hold:
- its contents carry bearer, kind, value, unit and conditions as slots;
- method and provenance are linked;
- **three different MS1 services answer three different problems from the same acquired contents**, each with
  grounds reaching the records:
  - a limit check (`classify`);
  - a comparison between two products under the same condition (`compare`);
  - a derived quantity (`model.run`) whose proposal is then a premise of a second classification.

Only then is the path extended to the other V1 table pages.

### 3.2 Success criteria (all required)

| Id | Criterion | Measure |
|---|---|---|
| **I1-a Integration** | Every verdict, comparison and derived value in every run is proposed by an MS1 rule or model service, with an inference record whose premises reach `record` items. Acquisition writes no `classification`, `comparison` or evaluative content, never imports or calls the rule or model services, and its code names no domain | store audit on every run; static tests |
| **I1-b Reuse** | The same acquired contents answer at least three kinds of question without question-specific code. At least 3 proposals of one inquiry are premises of another | vertical path and spent cases |
| **I1-c Representation** | Of the 61 V1 statements located in a table, ≥ 80% have bearer, kind, value, unit and their table-stated conditions as structured slots (V1: conditions 2 of 80). No condition survives as a word. A statement whose structure cannot be placed is `incomplete`, never misassigned | hand-checked against the V1 annotations (development) |
| **I1-d Safety** | 0 unjustified conclusions on the spent material re-asked through the new path: the X2 sealed questions whose products' tables are acquired, and the V1 vertical-path cases. The thousands-separator case ends reading-dependent, not concluded | regression, not held-out |

### 3.3 Stop criteria (any one stops I-1; the cause is reported)

1. Acquisition or rules need domain or category vocabulary in code (static test).
2. Condition matching cannot be done by concept identity without a string-matching layer in the rules.
3. More than the additions of section 2, any change to an S0 thesis, definition or criterion, or a change that breaks
   an MS1, s1core, X1 or X2 test is needed.
4. The vertical path (3.1) does not pass after three reformulations.
5. I1-c stays below 60% after three reformulations.
6. Any unjustified conclusion on regression: work stops before anything is added.

### 3.4 Separate checks

- **The 23 statements V1 found extracted but not retained.** For each one: the product identity Crawler resolved,
  the exclusion reason Crawler recorded (class policy, value kind, owner) and the rights class. This is read on a copy
  of the X2 store. Nothing is recovered or stored.
- **New sealed validation.** A protocol for new, authorised material is prepared here. Collecting that material needs
  a new owner authorisation of sources and access. None of the remaining retained pages is unspent, so no such check
  is run in I-1.
