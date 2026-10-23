# Project organisation and definition (owner decision, 2026-10-23)

**Status.** Fixed by the owner on 2026-10-23, in a conversation with Claude. It sits beside `MISSION.md` and
`ASSIMILATION.md`. It does not modify S0 (`spec/`), which stays the semantic authority.

- **What it authorises.** These instructions, the integration branch `claude/pee-operational`, and (owner,
  2026-10-23, after review) the unchanged import of section 5 with its equivalence tests. Section 7.1 lists the
  decisions and their confirmations.
- **Language.** Sections 1–6 are Claude's English record of the decisions. Section 7 separates the decisions the
  owner confirmed from the recommendations received in the conversation.

## 1. Repositories

| Repository | Role | Rule |
|---|---|---|
| `giampierofiorelli/Pee` (public) | **The only operational repository.** All new code, experiments, reports and instructions. | Work happens here, on the branch the owner gives. |
| `giampierofiorelli/Crawler` (public) | **Historical reference.** It holds the earlier Product Evidence Engine. | Read-only and **100% intact**: no commit, branch, push, hook run or Claude session on it. Only reading and copying files out of it. |
| `giampierofiorelli/pee-knowledge` (private) | **Private archive.** It holds the knowledge-store snapshots, owner packages, gold sets and private evaluations. | Data only, never public. Pee sessions may add new private material there, as before. |

Crawler's session hooks (`.claude/hooks/`) restore the store and push `pee-knowledge` when a session starts or stops.
Because Crawler stays unchanged, the only protection is not to open sessions on it.

## 2. Project definition

Pee is an **independent scientific adviser** built on the scientific semantic universe of S0. It must understand
human goals, investigate phenomena and solutions, interpret evidence and evaluate products or interventions
(`MISSION.md`).

- **Product advice is the first operational application, and it is mandatory.** Pee recovers the capabilities
  already built in Crawler rather than building only a theoretical universe.
- **S0 is the only authority on scientific knowledge.** The universe is the memory (`ASSIMILATION.md` §3). Imported
  code reads and proposes; what it proposes becomes knowledge only through the universe interface (section 4).
- Products are the first domain, not the limit of the design.

## 3. Languages and code

- **Python** for the universe (S0/MS1, `experiments/`), standard library only, as now.
- **TypeScript** for the original Crawler modules imported into Pee. They keep their language. Nothing is rewritten
  in advance.
- A module is converted to Python only when a measurement shows a concrete advantage, and only as a separate,
  tested change.
- **Toolchain.** Node.js 22.13 or later (the imported code uses the built-in `node:sqlite`). The development
  dependencies are `typescript` and `@types/node`, plus `fast-check` if imported tests need it. **`onnxruntime-node`
  and the G1c embedder are excluded.**

## 4. Integration method

Each capability follows the same steps, in this order:

1. **Import unchanged.** Copy the original Crawler files at commit `7d091ef`, together with the complete closure of
   their imports, into `engine-ts/`, keeping their paths. A manifest `engine-ts/PROVENANCE.json` records, for each
   file, the source repository, the commit, the original path and the SHA-256. The import commit changes no byte.
2. **Prove equivalence.** The import compiles with `tsc`. The imported tests pass. On the same inputs, the imported
   copy and Crawler `7d091ef` produce identical outputs (for example, the spent I-1 and X2 pages in
   `$PEE_PRIVATE_EVAL_DIR`). Crawler itself is only read and compiled outside its work tree, for example in a
   scratch copy.
3. **Connect to the universe.** A verifiable interface (a Node bridge script, as in I-1, X1 and X2, with a typed
   JSON contract and tests) turns reader outputs into candidate contents of the universe.
4. **Verify before admission.** A candidate becomes permanent knowledge only after measured checks of **fidelity**
   (is the meaning the source's meaning), **attribution** (who states it, and on what evidence) and
   **comprehension** (is it correctly placed in the universe). Material that fails stays a candidate, with its
   reason recorded.
5. **Trim later.** Unneeded dependencies are removed only after step 2, each as a separate commit with tests that
   show no capability was lost. The goal is not to keep 32,000 lines forever; it is to lose nothing during the
   transfer.

Crawler's SQLite store is **not converted in bulk**. Its contents are teaching material, translated through steps 3–4
when a capability needs them.

## 5. First capability: reading and understanding

The first import brings Crawler's reading and understanding capabilities:

- scientific prose;
- tables (1F acquisition, 1G interpreter and its knowledge);
- entities, document semantics and context;
- quantitative extraction (specifications, test measurements, comparative results, typed quantity knowledge);
- qualitative extraction;
- the retention policy that guards what may be kept.

The first estimate of the import closure was about 131 files (about 32,000 lines). The exact closure of the O-1 roots,
measured before the import, is 114 source files (27,262 lines); `engine-ts/README.md` lists everything imported. The reason is a few hub
imports: for example, the specification extractor imports one constant from the web reader, which pulls in the
network code and SQLite.

**GLiNER2.5.** In Crawler, the GLiNER2.5 neural model never ran inside PEE. It ran only as external Colab
diagnostics, with unauthenticated weights (`phase159_colab_gliner25_coordinator.ts`). Pee imports only the portable
TypeScript part: word windows, overlap resolution and the coordination logic, with their upstream Apache-2.0 notice.
A local neural model would need Python and PyTorch, a heavy dependency, and needs a new owner decision backed by a
measured advantage.

## 6. Branches

- `claude/pee-operational` starts from `claude/a1-scientific-assimilation`, which already contains every earlier
  Pee branch (X1, X2, V1, I-1, I-2, F-1, A-1) in one linear history.
- `main` stays where it is (MS1, `383758b`) until the owner decides. A-1 is linear, so moving `main` forward later
  needs no merge.
- One Claude session per branch at a time. Parallel work goes on separate branches, with controlled integration.

## 7. Decisions and recommendations

### 7.1 Decisions confirmed by the owner

Each decision below was confirmed by the owner on 2026-10-23. "Option chosen" means the owner picked it from
options Claude offered; "adopted" means the owner gave a recommendation of section 7.2 as their answer.

| # | Decision | How it was confirmed |
|---|---|---|
| D1 | Pee is the only operational repository; Crawler stays intact and read-only; `pee-knowledge` stays the private archive | Owner direction (adopted R1) |
| D2 | Integration branch from `claude/a1-scientific-assimilation`, not from `main` | Adopted R1 |
| D3 | Selective integration: original TypeScript modules kept, connected to S0 by a verifiable interface; no preventive rewrite; no bulk conversion of the SQLite store | Adopted R2 |
| D4 | Crawler intact at 100% (no archival commit) | Option chosen |
| D5 | Pee is an independent scientific adviser; product advice is the first mandatory operational application | Adopted R3 |
| D6 | First capability: reading and understanding; fidelity, attribution and comprehension checked before permanent acquisition | Adopted R4 |
| D7 | GLiNER2.5: only the portable part | Option chosen |
| D8 | Import the full closure unchanged; compilation and equivalence first; trimming later, in separate tested commits | Adopted R5 |
| D9 | Branch name `claude/pee-operational` | Option chosen |
| D10 | Claude writes these instructions | Option chosen ("Sì, scrivi le istruzioni") |
| D11 | Organisation confirmed coherent after review; the unchanged import of about 131 files is authorised, with verifiable provenance and equivalence tests before any semantic integration; no change to Crawler; no automatic promotion of knowledge into the universe | Owner message after reviewing this document, once this section was corrected |
| D12 | O-2 closed without its change cycle; the merge of the two rule-based prose readers, as built, does not work | Owner decision after the O-2 report (`experiments/o2/REPORT.md` §10) |
| D13 | A-1's reader is the **provisional** prose reader, not the solution (precision 0.35 is insufficient) | Same |
| D14 | All capabilities imported from Crawler are kept; O-2 says nothing about tables, specifications or web pages | Same |
| D15 | The strategy of combining linguistic rules is **suspended**. The next investment is the quality of scientific interpretation: before adding rules, evaluate a more capable interpreter, possibly neural and local, connected to S0 | Same |
| D16 | No permanent acquisition of knowledge until fidelity is reliable enough | Same |

### 7.2 Recommendations received in the conversation (Italian, verbatim)

These texts reached Claude through the owner's messages. They are recommendations, not the owner's own words; they
bind only as far as section 7.1 records a decision adopting them.


**R1 — Initial direction:**

> Procederei così:
> Creare un nuovo ramo di integrazione in Pee, partendo da claude/a1-scientific-assimilation, non da main, per
> conservare tutto il lavoro scientifico.
> Importare le capacità operative di Crawler, mantenendone la provenienza e senza riscriverle inutilmente.
> Integrare progressivamente i due sistemi, preservando S0 come universo semantico.
> Aggiornare le istruzioni di Claude: Pee diventa l'unico repository operativo, Crawler rimane intatto come
> riferimento storico e pee-knowledge conserva i dati privati.
> La mia preferenza, a questo punto, è usare Pee. Evitiamo un terzo repository e conserviamo già tutta la storia
> scientifica.
> L'unica precauzione: verificare le dipendenze di Crawler prima dell'importazione, perché integrare il suo codice
> TypeScript con Pee in Python non sarà necessariamente immediato.
>
> Pee: diventa il repository operativo.
> Crawler: rimane intatto, consultabile in sola lettura.
> pee-knowledge: rimane l'archivio privato.
>
> Attenzione: prima di sviluppare, Claude deve aggiornare le istruzioni contraddittorie di Pee, con tua
> autorizzazione.
> Non fare ancora merge o importazioni. Prima fissiamo definitivamente questa organizzazione.

**R2 — Code and languages:**

> Riscrivere progressivamente 58.000 righe di TypeScript rischia di ripetere proprio l'errore che vogliamo correggere.
> La mia scelta sarebbe: Integrazione selettiva, mantenendo TypeScript e Python. Importare in Pee soltanto i moduli
> originali di Crawler effettivamente necessari, conservarli in TypeScript e collegarli all'universo S0 mediante
> un'interfaccia verificabile. Nessuna riscrittura preventiva. Questo permette di: Riutilizzare subito le capacità
> esistenti. Conservare Pee come unico repository operativo. Mantenere S0 come unica autorità sulla conoscenza
> scientifica. Valutare eventuali conversioni in Python soltanto quando dimostrano un vantaggio concreto. Non
> importerei automaticamente tutto Crawler, né convertirei subito l'intero database SQLite. È la soluzione che meglio
> rispetta il merging originariamente concordato, senza ricominciare da zero.

**R3 — Project definition:**

> Consulente scientifico, prima opzione. Ma con una condizione fondamentale: la consulenza sui prodotti deve restare
> la prima applicazione operativa obbligatoria, recuperando le capacità già sviluppate in Crawler. Non vogliamo
> costruire soltanto un universo teorico.

**R4 — First capabilities:**

> Recuperare e integrare le capacità di lettura e comprensione di Crawler: prosa scientifica, tabelle, entità,
> GLiNER2.5, contesto, estrazione quantitativa e qualitativa. Riutilizzare il codice esistente senza riscriverlo
> inutilmente, collegandolo all'universo S0. Verificare fedeltà, attribuzione e comprensione prima di acquisire
> conoscenza permanentemente.

**R5 — Import closure:**

> Scegli «Chiusura invariata», ma con una condizione. Importiamo i circa 131 file mantenendo il codice originale,
> così da preservare le capacità di Crawler senza introdurre modifiche durante il trasferimento. Prima si verificano
> compilazione e comportamento equivalente. Solo dopo si eliminano le dipendenze superflue, con modifiche separate e
> test. L'obiettivo non è mantenere per sempre 32.000 righe, ma non perdere funzionalità durante l'integrazione.
