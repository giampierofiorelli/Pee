# A-1 — Scientific knowledge assimilation: documents teach, the universe remembers

| | |
|---|---|
| **Authorised by** | owner, 2026-10-23 (section 0) |
| **Requirement served** | `ASSIMILATION.md` (permanent), first increment |
| **Branch** | `claude/a1-scientific-assimilation`, from the F-1 tip `7412f55`. Crawler, S0, X1, X2, V1, I-1, I-2 and F-1 unchanged |
| **Status** | Sections 0–3 are written and committed **before any A-1 code** and before the sealed material is produced. Results are added below them; nothing above is rewritten |
| **Independence** | Claude's work, with Claude agents as annotators, authors and judges. **Not independent validation** |

## 0. Owner authorisation (verbatim)

The owner's framing, in the owner's words:

> Per me la prossima priorità non è aggiungere altre categorie o migliorare ulteriormente il lettore Web. È realizzare
> il ciclo che hai descritto: Documento temporaneo → traduzione fedele delle conoscenze → integrazione nell'universo →
> verifica → salvataggio dell'universo → funzionamento senza documento.
>
> C'è però una correzione importante da fare alla proposta di Claude: non possiamo considerare riuscita la
> trasformazione solo perché Pee riesce a ricavare tre inferenze dopo aver eliminato il file. Deve anche sapere quanta
> conoscenza ha effettivamente trasferito e quale parte è rimasta irrisolta.
>
> […] F-1 ha ancora individuato due conclusioni ingiustificate nei test con conoscenza già rappresentata. Le regole non
> distinguevano adeguatamente una dichiarazione del produttore da una misura indipendente richiesta dall'utente. Non
> possiamo costruire una memoria scientifica permanente ignorando questo limite epistemico.

The authorisation:

> Autorizzo a fissare la specifica di Scientific Knowledge Assimilation già ricevuta come requisito architetturale
> permanente di Pee, collegandola alle istruzioni di progetto senza sostituire MISSION.md né modificare S0.
>
> Autorizzo inoltre un nuovo incremento circoscritto, su ramo separato a partire da F-1, per realizzare il requisito
> fondamentale ancora mancante.
>
> Allegati e fonti: nessun file da ricreare o consegnare. Puoi usare in sola lettura i pacchetti già autorizzati e, in
> aggiunta, esclusivamente PEE-DEHUMIDIFIERS-CONSOLIDATED-RESEARCH-2026-10-15.md contenuto in
> PEE-THREE-SCIENTIFIC-RESEARCH-PACKAGES.zip nel repository privato giampierofiorelli/pee-knowledge. Non aprire gli
> altri documenti contenuti nel pacchetto THREE. Verifica prima eventuali sovrapposizioni con F-1 e i limiti di
> provenienza e conservazione.
>
> Il requisito è preciso: un documento fornito dal proprietario deve essere un input temporaneo, non la memoria
> permanente del sistema.
>
> Pee deve leggere progressivamente il contenuto, individuare tutte le proposizioni scientificamente rilevanti, anche
> distribuite tra più frasi o paragrafi, e tradurle fedelmente in elementi collegati dell'universo S0/MS1. Nessun
> riassunto, nessuna compressione semantica, nessun archivio RAG parallelo.
>
> La traduzione deve includere conoscenze quantitative e qualitative, definizioni, relazioni, fenomeni, causalità,
> condizioni, metodi, eccezioni, ipotesi, attribuzioni e dipendenze, entro quanto S0 permette realmente di
> rappresentare. Verifica prima tale copertura: se richiede una modifica a S0, fermati e presentami la decisione.
>
> Ogni proposizione deve risultare acquisita, parzialmente acquisita oppure irrisolta, con motivazione. Una conoscenza
> riportata da una nostra sintesi non deve essere promossa automaticamente a fatto scientifico indipendentemente
> verificato.
>
> Implementa la persistenza privata dell'universo strutturato, senza conservare permanentemente copie del documento o
> testi estesi. Mantieni provenienza, fondamenti, stati epistemici, collegamenti e registri di copertura. Non eliminare
> mai i miei originali. Le copie di lavoro devono avere un ciclo di vita temporaneo e verificabile; il materiale
> sigillato di valutazione rimane separato e soggetto a retention.
>
> Test obbligatorio: dopo acquisizione, verifica e salvataggio, rimuovi la copia temporanea dall'ambiente di prova,
> avvia Pee in un nuovo processo senza accesso al documento ed esegui almeno tre inferenze scientifiche differenti
> basate esclusivamente sull'universo persistito. Controlla anche la fedeltà delle proposizioni, gli elementi persi,
> l'attribuzione e la distinzione tra dichiarazioni e prove indipendenti.
>
> Usa materiale già esaminato per sviluppare. Riserva materiale effettivamente non utilizzato e non duplicato per la
> verifica sigillata. Le annotazioni Claude non costituiscono validazione indipendente.
>
> Prima di implementare controlla e riusa il lavoro di F-1, senza duplicare acquisitori, rappresentazioni o sistemi di
> regole. Nessuna nuova ricerca Web, nessuna modifica a Crawler, nessuna migrazione e nessun servizio a pagamento.
>
> Preregistra criteri di successo e arresto. Non estendere ancora l'acquisizione a tutti i documenti: prima dimostra in
> modo misurabile un ciclo completo, fedele e persistente.
>
> Concludi con un solo rapporto che distingua implementazione, test, risultati dimostrati e limiti. Poi fermati.

The specification itself is fixed in `ASSIMILATION.md` and linked from `CLAUDE.md` and `README.md`.

## 1. Material verification (done before any use)

### 1.1 The newly authorised document

| | |
|---|---|
| Container | `pee-knowledge/research-packages/PEE-THREE-SCIENTIFIC-RESEARCH-PACKAGES.zip`, SHA-256 `25ace2c0…2f93`, committed 2026-10-17 (`5ab081c`), received from the owner on 16 Oct 2026 |
| Document | `PEE-DEHUMIDIFIERS-CONSOLIDATED-RESEARCH-2026-10-15.md`, 924 lines, 137,295 bytes, SHA-256 `83b98227…a498` |
| Other members of the container | `PEE-AIR-FRYERS-RESEARCH-RECOVERED.zip`, `PEE-COFFEE-COMPLETE-CUMULATIVE-KNOWLEDGE-PACKAGE.md`, `README-PEE-THREE-PACKAGES.md`: names read from the archive index only, **never extracted or opened** |
| Extraction | only this member, into a private working directory (`$PRIVATE/a1/work/`); this is the **temporary working copy**, governed by section 1.4 |
| Nature | the owner's own consolidated teaching synthesis (title: "PEE CATEGORY RESEARCH 02 — DEHUMIDIFIERS. Consolidated scientific teaching package"). It cites original sources (standards, regulators, studies) that Pee has **not** examined. Teaching material, never product facts, never independent evidence |
| Rights | owner's work; private; teaching use authorised. Its source registers name third-party works and URLs; their content is not in the document beyond short attributed statements |

### 1.2 Overlap with F-1 (census done by hashing and n-gram overlap; no passage read)

The document is a later version of the dehumidifier package F-1 used
(`PEE-CATEGORY-RESEARCH-02-DEHUMIDIFIERS-ORIGINAL.md` inside the R01–R39 restoration, SHA-256 `7d147d8f…`):

- **184 of its 276 paragraphs are byte-identical** to the F-1 file after whitespace normalisation, and 191 share at
  least 80 % of their 8-word shingles.
- **Lines 1–712** (preamble, §1–§17, Addendum A) duplicate the F-1 file almost entirely, apart from the subtitle and
  §15.2 (a non-executable YAML design fixture). F-1 read all of it (development: preamble to §8; held-out: §9 to
  Addendum A). **This part is spent.**
- **Lines 713–924** are new: **Addenda B, C, D and E** (multizone moisture: evidence boundary and proposed
  verification; further original-source audit; health consequences of dampness and mould; seasonal operation, thermal
  comfort and humidification). Under 0.5 % of their 8-word shingles occur in the F-1 file.

**Exposure.** To locate these sections, I printed the document's heading lines; I therefore saw the headings of
Addenda B–E (for example "C1. Important correction: RH alone is not a transport variable"). I have read no body text
of lines 713–924, and I will not read it before the sealed first run. The headings are disclosed here so that this
exposure is on record.

### 1.3 Splits

| Split | Material | Use |
|---|---|---|
| **Development** (spent) | F-1 dehumidifier package: §1 (lines 32–49), §5 (159–176), §7.4–§8.3 (269–310), §10 (339–358), Addendum A1–A5 (655–694); and any other F-1 material | design and tuning of the proposition reader; a development reference by one Claude agent |
| **Sealed verification** (unused, not duplicated) | THREE dehumidifier document, **lines 713–924 (Addenda B–E)** | the fidelity reference (A), the question sets (C, D, F), first run once |
| **Assimilated, not scored** | THREE document lines 1–712 | assimilated with the whole document, so the integration measure (B) sees the restated propositions; never scored for fidelity |

### 1.4 Retention policy for A-1 (explicit)

| Material | Where | Lifetime |
|---|---|---|
| Owner originals (zips in `pee-knowledge/research-packages/`) | unchanged | permanent; hashed before and after every run; never written, moved or deleted |
| Temporary working copy of a document | `$PRIVATE/a1/work/` (outside Git) | from extraction until its assimilation has been audited; then removed by the lifecycle step, which records the removal. If the audit fails, the copy is kept and the failure reported |
| F-1 working copies of the packages (`$PRIVATE/f1/packages/`) | outside Git | retained as they were under F-1; they are needed to re-assimilate K under the frozen A-1 code. Their removal follows the same lifecycle once the persisted universe holds what they taught (section 3) |
| Persisted universe | live: `$PEE_UNIVERSE_DIR` (default `~/.local/share/pee/universe/`); durable copy: `pee-knowledge/pee-universe/` (private) | permanent, versioned. **Structured items only**: no record holds document text (locator, length and SHA-256 instead); no string field longer than 200 characters except identifiers and hashes; no 12-word sequence of an assimilated document appears in it (checked at save) |
| Sealed evaluation material (annotations, references, questions, judgements) | `$PRIVATE/a1/` (outside Git); copy in `pee-knowledge/private-eval/pee-a1/` with document and quoted text replaced by SHA-256 | retained until the owner's review of A-1, then under the owner's decision. Evaluation material is never loaded into the universe |

`$PRIVATE` is `~/.local/share/product-evidence-engine/private-eval`.

## 2. Design (fixed before code)

### 2.1 What F-1 already provides, and what is missing (from the review sent to the owner)

| Already in F-1 (reused) | Missing (A-1 builds) |
|---|---|
| Markdown reader with headings, blocks, tables, codes, citations, locators (`markdown.py`) | reading **prose** into propositions; F-1 produced 0 of 16 prose-defined kinds and missed 70 of 79 prose non-identities |
| Units for kinds, formulas, non-identity, methods, register entries, unresolved citations, evidence labels; their representation with provenance, attribution and standing (`knowledge_acquisition.py`) | phenomena, causal and dependence claims, mechanisms, qualitative findings, limitations, hypotheses, explanations, scope and the author's attitude, as universe items |
| Identity discipline (no merge across documents; co-reference proposals) | integration of a proposition **restated** by a second document (one content, two attributions) |
| Rules for limits, comparisons, selections, models (`rules.py`, `contract.py`, s1core) | services that reason over the new contents; the **evidence requirement** (F-1's 2 unjustified E2b decisions) |
| — | **coverage accounting** per statement (acquired / partial / unresolved, with the reason) |
| — | **persistence** of the universe; the **temporary-document lifecycle**; the independence test in a new process |
| Records keep the statement text (F-1) | records keep locator, length and SHA-256 only |

### 2.2 Where it sits in S0 (coverage checked before code)

S0 already represents everything the authorisation lists, so **no S0 change is needed**:

| What a passage states | S0 | MS1 item (A-1) |
|---|---|---|
| definitions, classifications, identity and non-identity | D2, D10 (identity), 3.6 | `concept`, `quantity_kind`, `relation` contents (F-1) |
| causal, dependence, association, mechanism, capacity claims | D10 causal content; 5.5 table | `content` form `proposition`, `content_kind` causal / dependence / association |
| general claims of all forms (strict, generic, statistical, typicality, ceteris paribus, idealised, functional) | 4.2 (Op4) | `generality` of the proposition |
| possibility, necessity, disposition | 4.8 (Op9) | `modality` |
| negation and absence | 4.10 | `polarity` |
| conditions, operating modes, configurations | 4.6, Op6 situating | `conditions` (concept → value) |
| methods, what they establish and do not establish | D16, chapter 7 | `method` items (F-1) and propositions `measures` / `establishes` / `does_not_establish` |
| norms and recommendations | D18 norm | proposition `content_kind` norm, deontic relation `requires` / `recommends` |
| explanations | 5.6 relational-epistemic content | `content` form `explanation` (explanans → explanandum) |
| limitations, exceptions, corrections | 4.6 (exceptions), 6.3 revision | `content` form `qualification` (the qualifier, what it qualifies, how) |
| hypotheses, proposals, open questions | 5.4: hypothesis is a **standing**, not a content kind | the **author's attitude** in the attribution content (Op9 embedding: "H hypothesises that …"); the universe's own standing stays "proposed", grounded on testimony (G3) |
| attribution, source, evidence type | D10 attribution, D14 holder, 5.8, 5.9 | `attribution` content: holder, reported record, attitude, evidence kind, cited sources (`examined: False`) |
| unknowns | 4.10 (absence of knowledge), 5.9 support "neither" | proposition with `content_kind` unknown, attitude asserted (the author asserts that it is not known) |

Remaining S0 limit, recorded and not worked around: the **degree** of support has no calculus (S0 4.9, deferred), so
answers carry qualitative standings only.

**Epistemic rule (the owner's point).** A proposition read from a teaching synthesis is held with the universe
standing **proposed**, on the ground "the document reports it" (testimony). The document's own attitude (asserted,
proposed, hypothesised, questioned, denied, reported) and evidence kind (synthesis, original measurement attributed to
a cited source, standard or regulation, expert judgement, guidance, proposal, hypothesis) are kept **in the
attribution**, never merged into the content. Nothing read from a document becomes "accepted" or "independent
measurement" by being read.

### 2.3 Components (all inside the existing modules or one new module per responsibility)

1. **Proposition reading** (`universe/propositions.py`, new). It works on the blocks `markdown.read` already produces,
   in reading order, keeping context:
   - **Segmentation.** Sentences, then clauses at coordination and subordination points. A claim may span sentences:
     anaphora ("this", "it", "they", "such …") resolves to the previous claim's subject when that subject is unique,
     and the resolution is recorded; the heading supplies the subject of a list item or of a sentence without one.
   - **Relations.** A general English lexicon of relational expressions in `knowledge/language.json` (verbs and
     phrases for increase, decrease, cause, prevent, depend, determine, measure, establish, require, indicate, apply,
     differ, exceed …), mapped to the relation concepts of the annotation guide. These are words of scientific English,
     never of any category.
   - **Concepts.** The noun phrase on each side of a relation becomes a concept: an existing kind or concept when its
     term is known (base or acquired, exact normalised match); otherwise a new concept of this document, with a lexical
     anchor and its head noun. Never a merge across documents (F-1 rule).
   - **Qualification markers.** Polarity (not, no, never, cannot, rather than), modality (can, may, must, always,
     often, usually, tends to), generality, conditions (if, when, under, at, below, above, during, in … with a value or
     a named state), scope (only, alone, at least), quantitative values (F-1 value parser and metrology).
   - **Attitude and evidence.** From the section's heading and labels (F-1 evidence classes and proposal terms), from
     hedging verbs (suggests, proposes, hypothesise, unknown, not established) and from citations (attributed to the
     cited source; `original_measurement` only when the clause reports a result of a cited study).
   - **Links between claims.** Explanation (because, therefore, so, this is why, which means), qualification (however,
     but, except, unless, correction).
   - **Coverage ledger.** Every sentence gets one status: **acquired** (every content word is explained by the claims
     produced), **partial** (claims produced, with the unexplained words listed), **unresolved** (no claim, with the
     reason: no relation recognised, a side not found, an unresolved anaphor, a structure not read). A ledger entry
     keeps the locator and the SHA-256 of the sentence, never the sentence.
2. **Representation** (`knowledge_acquisition.represent`, extended; the oracle uses the same function). A proposition
   becomes one `content` item (form `proposition`) with its relation concept, role fillers, polarity, modality,
   generality, conditions and qualifiers; one `attribution` content (holder, record, attitude, evidence kind, cited
   sources); explanation and qualification contents; the program's standing "proposed". **Integration:** a proposition
   whose relation, resolved concepts, polarity, modality and conditions equal an existing content gains a second
   attribution instead of a duplicate content. Records keep locator, length and SHA-256.
3. **Persistence** (`universe/persist.py`, new). The store's append-only event log is written and replayed (the store
   already reconstructs any earlier state by replay). A manifest records the SHA-256, counts and code hashes. The
   retention guard of section 1.4 runs at save and refuses a snapshot that fails it.
4. **Lifecycle** (`universe/assimilate.py`, new): hash the original; copy it to the working directory; read and
   represent it; audit (ledger complete, retention guard); record a lifecycle content (document identity, SHA-256,
   size, ledger counts, times); save the universe; reload it and compare; remove the working copy; check that the
   original's hash is unchanged; record the removal.
5. **Rules** (`universe/rules.py`, extended; no second rule system). New general services over proposition contents,
   all applicability-checked by conditions:
   - **influence**: the stated effect of one concept on another, and chains of signed influences (sign composition as
     in qualitative process theory: Forbus, "Qualitative process theory", 1984), a chain being only as strong as its
     weakest modality; a negated claim answers "no effect"; nothing found answers "undetermined";
   - **holds**: whether a claim is licensed (directly, by classification inheritance or by a chain);
   - **status** and **evidence**: the author's attitude and the evidence kind, read from attributions;
   - **consistency**: a claim against the universe: supported, conflicting (opposite polarity or sign under
     overlapping conditions) or not covered;
   - **value**: existing quantity contents;
   - **evidence requirement**: an inquiry may require an evidence kind (for example independent measurement); a content
     whose attributions do not provide it is not usable, and the service abstains with that reason.
6. **Question harness** (`experiments/a1/answer.py`): maps a question's terms to concepts through the universe's
   lexicon (the same for every arm) and calls the services. A term that resolves to no concept makes the answer
   uninformed, and it is counted as such.

### 2.4 Kinds of formation, kept apart

- **Initial formation:** the transversal base (F-1, unchanged).
- **Guided acquisition:** A-1. Pee's code reads documents the owner selected. No proposition is entered by hand;
  Claude writes only the general reading mechanism, the general relation lexicon and the evaluation material.
- **Autonomous acquisition and demonstrated learning:** not attempted and not claimed.

### 2.5 Alternatives considered

| Alternative | Decision |
|---|---|
| A language model translating prose into items at runtime | excluded: no paid service, no heavy dependency; Claude translating would be manual teaching, not Pee's capability |
| A statistical dependency parser (for example spaCy with a pretrained English model) | excluded for this increment as a heavy dependency; the general reader is built so that a parser could later replace segmentation without changing representation |
| Keeping passages and retrieving them (RAG) | excluded by the requirement |
| General linguistic patterns (relations, markers, connectives) plus knowledge-driven concept resolution, with an explicit ledger | **chosen**. Expected weakness: complex syntax lowers recall. The ledger makes every loss visible instead of hiding it |

## 3. Evaluation and criteria (fixed before code)

### 3.1 Sealed material (produced by Claude agents before any A-1 code; not independent validation)

- **Reference R (fidelity).** Two agents annotate lines 713–924 blind with `annotation-guide.md`, never seeing Pee's
  code. A third agent adjudicates. Hashes are sealed in `seals.json` and committed before code.
- **Questions QS (inference).** An author agent writes questions on lines 713–924 with `question-format.md`. A second
  agent answers them blind from the passage, and disagreements are adjudicated. Sealed the same way.
- **Development.** One agent annotates the development sections and writes development questions (spent by design).

### 3.2 Arms

| Arm | Universe |
|---|---|
| **ORACLE** | base + the sealed reference R, represented through the same `represent` function (the rules given complete, correct knowledge) |
| **K** | base + the F-1 packages (air purifiers 04, dehumidifiers 02 with R01–R39) assimilated with the frozen A-1 code, persisted |
| **K+** | K + the THREE dehumidifier document assimilated with the frozen A-1 code, persisted |
| **K+ fresh** | K+ loaded in a new process from the snapshot, with the working copy removed and no access to any document |

### 3.3 Measures

- **A — Translation fidelity** (on R). Pee's propositions from lines 713–924 are rendered from the universe items (a
  deterministic verbaliser that reads items, never text). Two judge agents match them to R and grade each element
  (subject, relation and sign, object, value, polarity, modality and generality, conditions, attitude, evidence kind,
  attribution); a third adjudicates. Per produced proposition: **faithful** (no element wrong), **unfaithful**,
  **spurious**. Per reference proposition: **complete**, **partial** (with the missing or wrong elements), **missed**.
  **Critical errors:** polarity flipped; direction or sign inverted; a proposal, hypothesis or open question promoted to
  asserted; a synthesis or guidance promoted to original measurement; a claim attributed to a source the document does
  not cite for it, or to an invented source; two different concepts merged.
- **Ledger calibration.** Every sentence of the document has a ledger entry. Of the reference propositions whose lines
  the ledger marks "acquired", the share judged missed.
- **B — Integration.** Restated propositions of lines 1–712 against those from F-1's dehumidifier file: merged (one
  content, two attributions), duplicated, or wrongly merged (critical). Concepts linked to existing kinds against new
  concepts.
- **C — Reasoning with supplied knowledge.** QS on ORACLE.
- **D — Knowledge only.** QS on K and on K+ (same frozen code).
- **E — Cross-category (exploratory).** QS items the author marks `transfer`; no threshold.
- **F — Document independence.** QS on K+ fresh against K+ in the assimilating process; lifecycle checks.
- **Evidence requirement (regression).** F-1's E2b gold set rerun (spent): Q-AP-24 and Q-DH-27.
- **Outcome classes for QS** (as F-1): correct decision, unjustified decision (critical), lost decision, lost decision
  (uninformed: a question term resolved to no concept), justified abstention, uninformed abstention.

### 3.4 Criteria

| | Criterion | Threshold |
|---|---|---|
| A1-a | A critical errors | **0** |
| A1-b | A precision: faithful ÷ produced | ≥ 0.80 |
| A1-c | A recall: (complete + partial) ÷ reference | ≥ 0.50 |
| A1-d | A complete ÷ reference | reported (≥ 0.25 expected) |
| A1-e | Ledger: sentences with an entry ÷ sentences; missed share among "acquired" | 100 %; ≤ 0.20 |
| A1-f | B wrong merges | **0** (duplicates reported) |
| A1-g | C on ORACLE: unjustified decisions; correct ÷ determinate questions | **0**; ≥ 0.80 |
| A1-h | D: correct decisions K+ against K; unjustified K+ | K+ > K; reported, each a defect |
| A1-i | F: answers of K+ fresh identical to K+; distinct inference types with a correct decision from the snapshot alone; working copy removed; original hashes unchanged; retention guard passed | 100 %; ≥ 3; yes; yes; yes |
| A1-j | Regressions: universe, s1core, X1, X2 suites; I-2 vertical increment and X2 regression (`legacy=True`); F-1 E2b: Q-AP-24 and Q-DH-27 become justified abstentions and no other answer is worse | none |
| A1-k | No category vocabulary in code (MS1 and F-1 vocabulary tests, extended to the new modules) | pass |

### 3.5 Stop rules (any one stops the phase; the cause is reported)

- **A1.** A needed distinction requires an S0 change: stop and present the decision to the owner.
- **A2.** Reading needs category words or a category branch in code.
- **A3.** Three reformulations of one reading rule on the development material without reaching precision ≥ 0.80 and
  recall ≥ 0.50 on the development reference: freeze as it is, move on, report.
- **A4.** After the sealed first run, at most **one** change cycle, with a new freeze; its results are labelled
  "after change" and are spent. The first run stays committed unchanged.
- **A5.** Any critical error in A or unjustified decision in C, D or F is reported as a defect, never as a success.
- **A6.** The retention guard fails: no durable copy is written; stop and report.
- **A7.** An audit fails: the working copy is not removed, and the failure is reported.

## 4. Outcome

**A-1 stopped on stop rule A6.** The retention guard refused to persist K and K+, both at the first run (freeze 1) and
after the one permitted change cycle (freeze 2). No durable universe was written, and `pee-knowledge/pee-universe/` was
not created. The owner's mandatory test, a new process answering from the persisted universe only, could therefore not
be run as specified. It was run as a **diagnostic on an evaluation copy** (section 5.6). The complete, faithful and
persistent cycle is **not demonstrated**.

| | Criterion | Threshold | Result | Met |
|---|---|---|---|---|
| A1-a | A critical errors | 0 | **79** (39 promotions, 19 merges, 13 attributions, 8 polarity) | no |
| A1-b | A precision | ≥ 0.80 | **0.162** (48 / 297) | no |
| A1-c | A recall | ≥ 0.50 | **0.582** ((15 + 174) / 325) | yes |
| A1-d | A complete share | ≥ 0.25 expected | **0.046** (15 / 325) | no |
| A1-e | Ledger entries; missed share among "acquired" | 100 %; ≤ 0.20 | 100 % of segmented sentences (5 reference propositions on unsegmented lines); **0.328** | no |
| A1-f | B wrong merges | 0 | **0** (1,115 merges; 1,113 from identical sentences) | yes, trivially |
| A1-g | C on ORACLE: unjustified; correct ÷ determinate | 0; ≥ 0.80 | 0; **6 / 45 = 0.13** | no |
| A1-h | D: K+ against K; unjustified K+ | K+ > K | K 0, K+ 5; **1 unjustified** (Q30) | yes, with one defect |
| A1-i | F: identical; ≥ 3 inference types; copy removed; originals unchanged; guard passed | 100 %; ≥ 3; yes; yes; yes | on the evaluation copy: 59 / 59; 3 rule services; yes; yes; **guard failed** | no (diagnostic only) |
| A1-j | Regressions | none | none (section 5.8) | yes |
| A1-k | No category vocabulary in code | pass | pass | yes |

## 5. Results

All measures use Claude agents (annotators, question author, blind answerer, judges, adjudicators). Agreement between
them is **not independent validation**. The sealed lines 713–924 are now spent.

### 5.1 First run and change cycle

- **First run (freeze 1).** It is committed unchanged in `firstrun-counts.json` (`08581c7`). The guard refused K and
  K+ for two reasons:
  - a 245-character concept name from the air-purifier package;
  - a ledger that kept unexplained words in document order.

  The questions were answered in process, and the fidelity export was rendered from an evaluation copy saved without
  the word-run check.
- **One change cycle (freeze 2, `5554346`).**
  - C1: concept names are capped in characters.
  - C2: a ledger keeps unexplained words as a sorted set.
  - C3: a named reporter's evidence class is set (for example, guidance).

  After the change, the in-process answers are identical to the first run. The guard still refused, for one reason:
  an "unexplained" token in the air-purifier ledger is an 83-character hyphenated URL slug of a cited source. Split on
  hyphens, it is a 12-word run of the document. The guard is right to flag it: the slug reproduces a cited article's
  title. The fix is small (drop URL tokens from the ledger, or hash them), but A4 allows no second cycle.

### 5.2 A — translation fidelity (lines 713–924, first run)

- **Judges.** J1 and J2 judged blind. They agreed on 285 of 297 produced items and 305 of 325 reference items. J3
  adjudicated every disagreement and every critical error only one judge listed (23 kept, 18 dropped). Its
  consistency rules are recorded with the adjudication.
- **Produced items (297):**
  - 48 faithful;
  - 184 unfaithful;
  - 65 spurious (bibliographic lines, register entries, garbled fragments).
- **Reference propositions (325):**
  - 15 complete;
  - 174 partial;
  - 136 missed.
- **Where the losses are.**
  1. **Attitude and evidence kind.** These are the main source of unfaithful items. In Addendum B, every item is held
     as *proposed* because the block is labelled as proposed, including propositions the reference gives as asserted
     synthesis, standards or expert judgement. Elsewhere, proposed procedures, pass criteria and elicitation
     questions are held as *asserted* or *reported*. Of these, 39 are critical **promotions** (type 3): the error the
     owner named.
  2. **Attribution (13, type 5).** Register lines that list sources were read as claims attributed to those sources.
  3. **Merged concepts (19, type 6).** A long phrase absorbs a second proposition into a subject or a condition.
  4. **Polarity (8, type 1).** Most come from a double negation: a prohibition with a negating verb ("avoid", "refuse")
     plus a negated relation, which reverses the norm.
- **Manufacturer declaration against independent measurement.** On the sealed passage, the universe never holds a
  synthesis or guidance as an original measurement (type 4: 0). However, the evidence kind is right on only a minority
  of items. It is mostly "synthesis", by default, for the package author.

### 5.3 Ledger calibration

- **Coverage.** Every segmented sentence of the three documents has an entry:

  | Document | Sentences | Acquired | Partial | Unresolved |
  |---|---|---|---|---|
  | AP | 1,571 | 832 | 257 | 482 |
  | DH | 1,311 | 571 | 228 | 512 |
  | THREE | 1,231 | 626 | 212 | 393 |

  Five reference propositions sit on lines that the segmenter does not treat as sentences.
- **Calibration.** Of the 259 reference propositions on lines the ledger marks "acquired", 85 (0.33) were judged
  missed. The ledger therefore over-states acquisition. It counts a sentence as acquired when at least one relation
  was read, even if the sentence holds several propositions. "Unresolved" is reliable: 24 of 24 reference propositions
  on unresolved lines were missed.

### 5.4 B — integration

- **Merges.** 1,115 of the 1,431 THREE propositions merged with F-1's dehumidifier file as attributions to existing
  contents. 1,113 of them come from byte-identical sentences (184 of 276 paragraphs are identical). The two from
  different sentences are correct: the same claim, once with and once without an amendment note.
- **Wrong merges: 0.** This measure is weak, because it is dominated by identical text.
- **Concept linking.** Of the 2,022 concepts the THREE propositions use, 9 are base-knowledge kinds. The rest are
  document concepts keyed by holder and term. Translation into the universe stays largely **lexical**: it creates
  document concepts instead of linking to existing kinds.

### 5.5 C and D — reasoning (QS: 59 live questions, 45 determinate)

| Arm | Correct | Unjustified | Lost | Lost (uninformed) | Justified abstention | Uninformed abstention |
|---|---|---|---|---|---|---|
| ORACLE (fresh process) | 6 | 0 | 6 | 33 | 4 | 10 |
| K | 0 | 0 | 0 | 45 | 1 | 13 |
| K+ | 5 | 1 (Q30) | 7 | 32 | 3 | 11 |

- **The dominant loss is term recognition, even for the oracle.** A question term written by another Claude agent
  resolves to no concept in 33 of the oracle's 39 losses. Complete and correct propositions do not help when the
  question names the concept differently.
- **Assimilation added knowledge the rules used.** K+ answers five questions that K cannot.
- **Q30 is a defect.** The question asked for the evidence kind of a passage that the reference gives as guidance;
  K+ answered "synthesis".

### 5.6 F — document independence (diagnostic, not the persisted universe)

The run used a new process (`independence.py`) on a copy of the first-run evaluation snapshot. A Python audit hook
refused any file outside the code, the base knowledge, the snapshot, the questions and the output.

- **Isolation.** The process tried to open:
  - the three working copies;
  - the owner's THREE zip.

  All four opens were refused and logged.
- **Answers.** All 59 answers are identical to those of the assimilating process.
- **Correct decisions from the snapshot alone.** Three different rule services:
  - influence (Q19, Q59);
  - evidence attitude (Q29);
  - holds, affirmed (Q31) and negated by contrast (Q32).

  All five are **direct** lookups. On the sealed questions no chain inference produced a correct decision. Chains
  work only on the T1 fixture (`tests/test_a1.py`).
- **Status.** This shows that the structured items alone answer without the document. It does **not** satisfy A1-i,
  because that universe failed the retention check and is not persisted.

### 5.7 Document lifecycle

- **Copies removed.** The four temporary copies were removed after their sentence audits passed: three lifecycle
  copies and the initial THREE extraction, 610,826 bytes in all. Their SHA-256 equals the hash of the corresponding
  original member; the record is private (`$PRIVATE/a1/custody-removal.json`).
- **Originals unchanged.** The owner's originals are unchanged, and the THREE zip still matches its seal
  (`25ace2c0…`).
- **Material kept.** These stay under the retention policy in section 1.4:
  - the sealed passages used by annotators;
  - F-1's working copies (needed until a persisted universe holds what they taught).
- **No custody record.** Because persistence was refused, no "document custody" record exists in a universe.

### 5.8 Preservation and the evidence requirement

- **Suites.** universe 112 OK, s1core 47 OK, X1 18 OK, X2 25 OK. The vocabulary tests cover the new modules.
- **Route B.** The I-2 vertical increment passes 5 of 5, and the X2 regression rows are identical (1,421 records).
  Route B pages are unchanged because proposition reading runs only for Route A documents. This was measured at
  freeze 1; freeze 2 changed only `propositions.py`, which Route B never calls.
- **Evidence requirement.** F-1's E2b gold set (spent, regression only) was rerun with the question's evidence
  requirement in the inquiry. Q-AP-24 and Q-DH-27, the two unjustified decisions where a declaration answered an
  "independently measured" question, are now justified abstentions. The rerun gives 16 correct (as in F-1),
  17 lost, 27 justified abstentions and 0 unjustified.
- **Untouched.** X1, X2, V1, I-1, I-2, F-1, S0 and Crawler are unchanged.

## 6. Implemented capabilities, by maturity (proposed → implemented → tested T1 → measured on sealed material)

| Capability | Kind | Maturity |
|---|---|---|
| Proposition reading of prose: causal, classification, value with interval, norms, contrast, conditions, modality, negation, anaphora, attitude, reported evidence | inference (reading) | measured: recall 0.58, precision 0.16, 79 critical errors |
| Proposition representation in S0/MS1: content and attribution, integration by identical body, Op2 restriction | vocabulary | measured: 0 wrong merges (weak test); lexical concepts |
| Coverage ledger per sentence: acquired, partial or unresolved, with reasons and no text | vocabulary | measured: complete, but over-states "acquired" (0.33 missed) |
| Private persistence (event log + manifest, reload equality) with retention guard | infrastructure | tested T1; on real material it **refused correctly** (a URL slug); nothing persisted |
| Temporary document lifecycle (copy → audit → save → reload → remove → custody) | infrastructure | tested T1; on real material it stopped at save |
| Rule services over propositions: influence with signed chains, holds, consistent, value, evidence | inference | tested T1; on sealed questions: direct lookups only |
| Evidence requirement (declaration ≠ independent test) | inference | regression on spent E2b: 2 unjustified → 0 |
| Document independence check (audit-hook isolation) | test | diagnostic on an evaluation copy |

**Kinds of formation.**
- *Vocabulary*: relation concepts, evidence classes and the proposition lexicon added to the developer base.
- *Inference*: reading, rule services and the evidence requirement.
- *Learning* (the universe changes because a document taught it): demonstrated in process only. Nothing is persisted.
- *Transfer*: not demonstrated. Q59 is a transfer item, but it was answered from a direct statement.

## 7. Limits and open problems

1. **Fidelity.** The reader finds more than half of the propositions but renders few of them faithfully. The worst
   errors are epistemic: proposals held as asserted, and a document-level "proposed" label applied to everything
   under it. This is the limit the owner named. Recall alone must not be read as success.
2. **Recognition across authors.** Concepts are keyed by holder and term, and almost nothing links to existing kinds.
   Even the oracle loses 33 of 45 determinate questions to vocabulary mismatch. Reasoning over assimilated knowledge
   is bounded by this before any reading improvement.
3. **The ledger's "acquired" is optimistic.** A sentence with several propositions is "acquired" once one is read. A
   per-proposition account is needed before the ledger can say what was transferred and what is unresolved.
4. **Persistence and retention.** The guard works as designed, and its single remaining refusal is a URL slug. The
   persisted universe and the fresh-process test on it remain to be demonstrated.
5. **Integration measure.** It is dominated by identical text. A real test needs restatements in different words.
6. **Evaluation.** All references and judgements are by Claude agents. The sealed passage is now spent, and lines
   713–924 can no longer serve as held-out material.
7. **Exposure.** The headings of the sealed range were seen during material verification, and three adjudicators
   quoted fragments in their notes (`seals.json`, exposure note). No reading rule was tuned on the sealed lines.

## 8. What would be needed next (not authorised; for the owner's decision)

- **Smallest fix to unblock persistence.** Keep URL tokens out of ledger word lists, or hash them. This is a new
  change cycle and needs authorisation.
- **Before a wider assimilation:**
  - attitude per proposition, not per block;
  - a double-negation rule for norms;
  - a per-proposition ledger;
  - concept linking to existing kinds (the dominant loss).
- **Sealed material.** New, unused material for any re-measurement.

## 9. Private material

| Location | Content |
|---|---|
| `$PRIVATE/a1` (outside Git) | references, questions, judgements, adjudication, scores, first-run and after-change rows, the evaluation snapshot copies, the custody-removal record |
| `pee-knowledge/private-eval/pee-a1/` | copies of the same material, with document and quoted text replaced by SHA-256; no universe snapshot, because none was admitted |
| `results-counts.json` (this directory) | public counts and file hashes |
