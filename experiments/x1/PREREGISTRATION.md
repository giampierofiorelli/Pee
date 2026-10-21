# X1 — Integration experiment: Pee semantics over Crawler's operational records

| | |
|---|---|
| **Authorised by** | owner, 2026-10-21 (verbatim below): third way (selective combination), one bounded experiment X1, with four corrections |
| **Branch** | `claude/x1-integration-experiment`. It is separate from `main`, where another session is waiting for an owner decision on MS2 (one session per branch) |
| **Base** | Pee `383758b` (MS1 vertical slice). Crawler, read-only, at `7d091ef` |
| **Status** | Preregistered before any X1 code, before the test categories are drawn and before any test material exists |
| **Independence** | Designed and run by Claude. The question author, annotators and adjudicator are Claude instances, so **their agreement is not independent validation** (owner correction 4). Independent verification is the owner's review of a sample (section 9) |

## 0. Owner authorisation (verbatim)

> Io sceglierei la terza via e autorizzerei X1, con alcune correzioni. È probabilmente il modo migliore per conservare
> il lavoro utile di Crawler senza trascinarci dietro la sua architettura frammentata.
>
> La distinzione fondamentale è questa: Crawler fornisce capacità operative già sviluppate; Pee diventa il
> proprietario del significato scientifico. Non due motori semantici, non due archivi di conoscenza concorrenti.
>
> Prima di avviare X1 correggerei quattro punti:
>
> * Lavorare in Pee, leggendo Crawler senza modificarlo. L’esperimento deve verificare la nuova architettura.
> * Evitare che l’adattatore faccia il ragionamento. Deve trasferire fedelmente dati e provenienza, non introdurre
>   interpretazioni scientifiche nascoste.
> * Testare una categoria sconosciuta correttamente. Con evidenze sufficienti deve ragionare; senza evidenze deve
>   astenersi. Non pretendere conclusioni impossibili.
> * Distinguere le verifiche indipendenti dai test di Claude. Due annotatori Claude non costituiscono automaticamente
>   una validazione indipendente.
>
> Non considererei inoltre dimostrata l’affidabilità complessiva di Crawler dai soli risultati riportati: alcuni
> componenti hanno risultati promettenti, altri mostrano limiti importanti.
>
> Cosa farei subito
>
> Autorizzerei un solo esperimento X1, circoscritto, senza migrazioni né modifiche a Crawler.
>
> Se dimostra che la nuova semantica riesce a utilizzare meglio le evidenze reali, abbiamo finalmente una direzione
> architetturale fondata su risultati.
>
> Se fallisce, avremo individuato il problema prima di ricostruire centinaia di componenti.
>
> Non tornerei al vecchio Crawler, ma non ricostruirei neppure ciò che Crawler sa già fare. Questa, secondo me, è la
> decisione più solida.

**Scope that follows from it.**
- One experiment. No migration, and no change to Crawler, its store or its private data.
- All new code lives in Pee.
- Crawler contributes only operational output: retained declaration records and their provenance, read from a
  **copy** of its store snapshot.
- Crawler's own decision path runs unchanged as the baseline. It is compiled outside its working tree.

## 1. Hypothesis

Pee's semantic universe (the MS1 store and contract, plus new interpretation and requirement services driven by
knowledge items) reads Crawler's real retained declarations. It answers buyers' requirement checks better than
Crawler's current path: more justified conclusions and no unjustified conclusion. In a category it was never taught,
it reasons when the evidence suffices and abstains when it does not.

## 2. Task

**Limit check (primary).**
- **Input:**
  - a product;
  - the retained declarations of that product;
  - a requirement: a property in the buyer's words, a comparator (at least, at most, more than, less than), a value
    and a unit, and optionally the conditions under which it must hold.
- **Question:** according to the retained declarations, as recorded and with their sources, does the product's
  declared value satisfy the requirement under the conditions the requirement states?
- **Answer:** `meets`, `fails` or `not_determinable`.

**Pairwise comparison (secondary).**
- **Input:** two products, a property and a direction (lower or higher is preferred).
- **Question:** do the retained declarations allow the two products to be compared as the same quantity under the
  same conditions?
- **Answer:** which product has the preferred value (`p1`, `p2`, `equal`), or `not_determinable`.

The task concerns **declared** values. Nobody, and neither arm, may treat a declaration as an independent test.

## 3. Arms

**A — Crawler at `7d091ef`, unchanged.**
- It is compiled to a scratch directory outside its working tree and runs on a second copy of the same store
  snapshot.
- **Limit check:**
  1. The requirement is rendered mechanically as one English sentence: `<property> <comparator words> <value> <unit>`
     plus the conditions phrase.
  2. Crawler's own request reader (`extractConstraints253`) turns the sentence into its criteria.
  3. Crawler's own candidate construction (`candidatesFromStore249`) and decision (`decideAdvice249`) answer it.

  Crawler's outcomes map one to one: `meets`→`meets`, `fails`→`fails`, `unknown`→`not_determinable`. A requirement
  for which Crawler finds no criterion is `not_determinable`.
- **Comparison:** Crawler has no declaration-comparison function, so A abstains.

**B — the Pee X1 build.**
- It is frozen by commit before any test material is opened.
- Its knowledge (sections 5 and 6) is:
  - general metrology and general quantity concepts;
  - category knowledge for the two **taught** test categories;
  - knowledge for the development categories.

**B0 — the B build with all category knowledge removed** (general knowledge only). It is an ablation, run once on
the same material.

## 4. The adapter (owner correction 2)

- It reads a copy of the Crawler store snapshot read-only (Python `sqlite3`, `mode=ro`).
- It writes records to a private directory, never to this repository.
- **A record carries these fields verbatim:**
  - the declaration's raw label and raw value;
  - its section, component and locator;
  - the product's id, name and brand;
  - the variant id;
  - the source host and URL;
  - the revision id and fetch date;
  - the retention class;
  - Crawler's row ids.
- **Crawler's own interpretations are quarantined.** They are its parsed value (`value_json`), normalised property
  key, evidence role, method label and the product's category hypothesis.
  - They are copied verbatim into a separate block, `crawler_interpretation`, attributed to Crawler's reader as
    holder.
  - **Arm B never reads that block.** It is kept only for tracing, and a test enforces this.
- **The adapter does not:** convert, parse, normalise, classify, merge, filter by meaning or drop records.
- **Fidelity tests:**
  - every exported field equals its source column byte for byte;
  - the record count equals the source row count;
  - the adapter code contains no unit, property or category vocabulary, checked statically against the X1 knowledge
    files.

## 5. Split (fixed now; the draw is computed after this file is committed)

**Development categories.**
- Microwave ovens and dehumidifiers, whose rows were seen while X1 was being planned.
- Every category not drawn for test.

Development material is spent and never counts as evidence.

**Eligibility for test.** The copied snapshot is sha256 `4618f839…`, the pee-knowledge snapshot of 2026-10-19. A
category is eligible if, in that snapshot, it:
- is the single category hypothesis of its products;
- has at least 3 products;
- has at least 30 declarations whose raw value contains a digit;
- has at least 2 distinct sources;
- is not microwave ovens or dehumidifiers.

**Draw.**
- Rank the eligible categories by `sha256("X1|" + category_id)`, hex ascending, and take the first three.
- Ranks 1 and 2 are **taught**. B gets category knowledge for them, written from general domain knowledge by the
  developer **before seeing any of their records**.
- Rank 3 is **untaught** (owner correction 3). B has no knowledge specific to it.

**What the developer may see.**
- The developer (this session) may see only the names and counts of the test categories.
- The developer never opens their records, questions, reference or answers before B is frozen and its first run is
  committed.

## 6. Development rules for B

- **Mechanism code** names no category, product, property, unit or condition. All of these come from knowledge
  items (Pee I12). This is checked statically.
- **Knowledge files** are public and authored by the developer, with provenance `holder: developer`.
  - Their basis is `definition`, or `published reference` with the reference named.
  - They contain no third-party text.
- **Development questions** are written by the developer on development categories only (tier T1, spent).
- **Reformulations:** at most three of any principle on the same development material (Pee skill 3.4).
- **Freeze:** B and B0 are frozen by a commit, recorded in section 10, before the sealed material is opened.

## 7. Test material (sealed before the B freeze is tested)

Every role below is a Claude agent in a separate context. None of them sees Pee code, Pee knowledge or Crawler code.

**Question author.**
- Reads the exported records of the three test categories only.
- Writes, per category, about 24 limit checks in the buyer's own words and about 6 pairwise comparisons.
- Is asked to:
  - write requirements a buyer of the category would plausibly state;
  - include properties of every kind, whether or not they look easy;
  - make roughly half of them answerable from the records.
- Is told nothing about either arm.

**Two blind annotators.**
- Each reads every question together with all retained records of the products concerned.
- Each answers independently with:
  - the verdict;
  - the record ids that ground it;
  - for `not_determinable`, a reason class:
    - not declared;
    - declared under other or unstated conditions where the requirement states conditions;
    - a component or variant value;
    - no unit;
    - a range or list on both sides of the limit;
    - sources disagree;
    - other.

**Adjudicator.**
- Resolves disagreements from the records.
- Marks an item `excluded_ambiguous` only when a careful reader could defensibly give either answer. Excluded items
  are counted and reported.

**Seal.**
- The SHA-256 of the questions file and of the adjudicated reference are committed to this repository (section 10)
  before any arm runs.
- The files themselves stay private, because they quote retained declaration values.

## 8. Metrics and decision rule (fixed now)

**Counts.** They are given per arm, per category and per stratum (taught or untaught), split by whether Crawler has
a criterion for the requirement, always with denominators.

| Count | Definition |
|---|---|
| justified conclusions | the arm concludes (`meets` or `fails`; `p1`, `p2` or `equal`) and matches the reference |
| unjustified conclusions | the arm concludes, and the reference gives a different conclusion or `not_determinable` |
| unjustified abstentions | the arm says `not_determinable`, and the reference concludes |
| justified abstentions | both say `not_determinable` |

**Decision rule.** X1 **passes** only if all of the following hold on the limit-check set:

| Id | Criterion |
|---|---|
| **S1 safety** | B makes **no** unjustified conclusion. Every unjustified conclusion counts as critical; there is no post-hoc reclassification |
| **S2 use of evidence** | B's justified conclusions ≥ A's justified conclusions |
| **S3 untaught category** | On the untaught category, B concludes correctly on at least two thirds of the items the reference concludes on, and S1 holds there |
| **S4 architecture** | The adapter fidelity tests pass; there is no domain vocabulary in the adapter or in B's mechanism code; B reads no `crawler_interpretation` block and no Crawler knowledge file |
| **S5 preservation** | Crawler `HEAD` and working tree are unchanged; the live snapshot hash is unchanged; the Pee MS1 and s1core suites pass; the MS0 sealed cases stay 11/11 |

Anything else is a **failure**. The report then names the first failing criterion and the causes found. No fix is
made inside X1.

**Reported, without a gate:**
- the comparison task (B's counts; A has no capability);
- B0 against B on the taught categories, as the contribution of category knowledge;
- A's counts by its own criteria;
- cost: lines of code, knowledge items, run time.

## 9. Independent verification (owner correction 4)

- **Tier of the first run: T2-internal.** The records are unseen and real, and the expectations are sealed before a
  frozen run. But the question author and the annotators are Claude, so the run is reported as Claude's test, not as
  validation.
- **Owner review packet.**
  - **Sample:** a stratified random sample of 24 limit-check items, 8 per category. In each category, the 8 items
    with the lowest `sha256("X1-review|" + item_id)` are drawn.
  - **Content:** each item's question and records, without the reference or the arms' answers, plus an answer
    sheet.
  - **Location:** private, in pee-knowledge.
- **When the owner's verdicts exist (tier T4),** they are compared with the reference and with each arm, and
  reported separately. They never silently replace the sealed reference.

## 10. Record of execution (filled in as it happens)

| Step | Commit / hash |
|---|---|
| Preregistration | this commit |
| Draw | — |
| B / B0 freeze | — |
| Questions seal | — |
| Reference seal | — |
| First runs (A, B, B0) | — |
