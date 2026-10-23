# engine-ts — Crawler reading and understanding, imported unchanged (O-1)

**Authorisation.** O-1 (owner, 2026-10-23; `ORGANISATION.md` D11, `CLAUDE.md`).
- Import the reading and understanding closure of `giampierofiorelli/Crawler` at commit `7d091ef` unchanged, with
  verifiable provenance and equivalence tests.
- No change to Crawler.
- No semantic integration, and no promotion of any output into the universe.

**Status of this file.** Sections 1–3 fix the criteria **before any import or code**. Section 4 is written after the
runs.

## 1. What is imported

All paths keep their Crawler location relative to `engine/product-evidence-engine-v5.67-phase243/`. This matters
because the readers locate their data files as `../../resources/...` from the compiled module.

- **Roots** (`ORGANISATION.md` §5):
  - prose: `document_evidence`, `phase134_atomic_context_evidence`, `phase156_review_document_engine`;
  - tables: `table_acquisition1f`, `table_interpreter1g`, `table_interpreter1g_knowledge`, `table_interpreter1g_lessons`,
    `phase245_table_grid`, `phase245_html_dom`;
  - entities: `experience_entity_inventory`, `phase153_entity_inventory`;
  - document semantics and context: `document_semantics`, `phase154_context_graph`;
  - quantitative: `phase245_spec_extraction`, `phase245_value_normalizer`, `phase265_test_measurements`,
    `phase270_comparative_results`, `quantity_knowledge`, `knowledge_rules`, `knowledge_link`, `product_facts`,
    `phase272_extraction_plan`;
  - qualitative: `phase269_qualitative_observations`, `phase252_review_semantics`;
  - observations: `observation_semantics`, `observation_reconstruction`;
  - retention: `phase249_retention_policy`;
  - GLiNER2.5, portable part only: `phase156_gliner_portable`, `phase159_colab_gliner25_coordinator`.

  All are in `src/`.
- **Closure.** Every file that a root reaches through relative imports, type imports included: **114 files,
  27,262 lines**, measured before the import.
- **Runtime data.** The whole of these Crawler-authored rule and knowledge packs:
  - `resources/quantity-knowledge/`;
  - `resources/knowledge-translation/`;
  - `resources/property-definitions/`;
  - `resources/scientific-entities/`;
  - `resources/scientific-reading/`.
- **Tests.** The Crawler test files whose imports all lie in the closure: 112. Nine of them are left out, because they
  check Crawler's own governance documents or read a live-source annotation:
  - `contract_status_ledger`, `i1_c3c4_scoring_limits`, `i1_reachability`, `i1_store_write_census`,
    `s98_integration_fitness`, `vertical_contract`: they need `docs/architecture/`, `evaluation/r3c|a5/`, `scripts/` or
    Crawler's skill;
  - `phase189_source_pilot_reasoning`, `phase191_sparse_source_integrity`, `phase192_lineage_marketplace_screen`: they
    need `evaluation/phase189/annotated-live-source-pilot.json`.

  That leaves **103 test files**.
- **Test inputs:**
  - the helper `tests/table_acquisition1f_fixtures.ts`;
  - `tests/fixtures/`;
  - the Crawler-made synthetic documents `evaluation/phase228..phase240/SYNTHETIC-*` (PDF and DOCX);
  - `docs/phase220/phase220-category-vocabulary.json`.
- **Build file.** `tsconfig.json`, unchanged.
- **Not imported:** everything else, including `onnxruntime-node`, the G1c embedder, any neural model, Crawler's
  `package.json` and its scripts, hooks, store and snapshots.

**Pee-authored files** (not from Crawler):
- this README;
- `PROVENANCE.json`;
- `package.json` (pins `typescript` 5.9.3 and `@types/node` 22.20.5, as in Crawler's lockfile);
- `package-lock.json`;
- `pee-tools/`.

## 2. Criteria (all must hold)

- **E1 Provenance.** Every imported file is byte-identical to `git show 7d091ef:<path>` in Crawler. Its SHA-256 is
  listed in `PROVENANCE.json`. `pee-tools/verify-provenance.mjs` recomputes the hashes and checks that no unlisted
  file exists, other than the Pee-authored files.
- **E2 Closure.** Every relative import in an imported file resolves to an imported file. Every `../../resources/`
  reference resolves.
- **E3 Compilation.** `tsc -p tsconfig.json` reports zero errors.
- **E4 Emitted code.** For each imported source file, the compiled JavaScript is byte-identical to the output of the
  same file in a full build of Crawler `7d091ef`. That reference build is made in a scratch copy from `git archive`,
  with the same compiler versions.
- **E5 Tests.** The 103 imported test files give, per file, the same pass and fail counts as in the reference build.
  - Reference measured before the import: 1,928 tests passed and 2 failed in the 112 files.
  - Both failures depend on the environment:
    - `phase250_knowledge_snapshot` expects a Git work tree; the scratch copy is outside Git. It is among the 103.
    - `i1_c3c4_scoring_limits` needs a Crawler skill file. It is left out.
  - Inside Pee the copy sits in a Git work tree, so the `phase250_knowledge_snapshot` result may differ for that
    reason alone; such a difference is checked and explained, never counted as equivalence.
  - A difference in either direction is reported and explained, never hidden.
- **E6 Behaviour.** `pee-tools/equivalence.mjs` runs the reading entry points on every HTML document in `FIXTURES1F`,
  in both builds, and compares SHA-256 digests of canonical JSON outputs. They must be identical.
  - The entry points: `extractSpecifications245`, `acquireTables1F`, `documentModel1G`, `readDocumentSemantics1D2`,
    `readDocumentEvidence` with `readProductFacts`, `qualitativeObservations269`, `comparativeResults270`,
    `documentMentions272`.

## 3. Limits stated in advance

- **E4–E6 are regression evidence, not validation.** They show that the copy behaves like Crawler, not that Crawler
  reads correctly.
- **The fixtures are Crawler's own development material.** The private pages of earlier experiments are not available
  in this session (`$PEE_PRIVATE_EVAL_DIR` is unset), so E6 runs on public fixtures only.
- **No output of these modules enters the universe in O-1.**

## 4. Results (2026-10-23)

Raw results are in `results/`. First runs are kept unchanged: `e5-firstrun.json`, `e6-firstrun.json`.

### 4.1 Departures from sections 1–2 (each recorded before the run it affects)

1. **Licences.** The four upstream licence files that the imported modules cite were added unchanged:
   `third_party/phase154_reference_sources/{medspacy-master,snorkel-main}/LICENSE` and
   `third_party/phase156_reference_sources/{deepke,gliner2}/LICENSE` (MIT, Apache-2.0). `CLAUDE.md` requires this.
2. **C1, runtime files.** The static closure missed files that the code reads at run time. This is visible in the
   E5 first run, where 22 test files differed. Four were added unchanged:
   - `document_intake/phase228_extract.py`, the PDF and DOCX reader: Python standard library plus the system tool
     `pdftotext`;
   - `research/phase123_training_examples.json`: author-constructed examples;
   - `research/phase124_editorial_passages.json`: short project-authored notes, rights reviewed;
   - `research/phase159/GLINER25-COLAB-CONSTRUCTED-PILOT.json`: constructed cases with recorded external outputs; no
     model.
3. **E6 normalisation.** The only field that varied was `stats.milliseconds`, a measured elapsed time. It varies
   between two runs of Crawler itself (10 of 88 outputs). After the first run, the harness replaced its value by
   `$time`. Nothing else is normalised.

**Not imported, deliberately:**
- `research/phase143_cross_category_sources.json`: third-party excerpts that Crawler marks as not rights-reviewed for
  redistribution;
- Crawler's `scripts/`, including the knowledge-snapshot tool, which is a later, separate step;
- the source of `phase253_request_advice.ts`.

### 4.2 Criteria

| Criterion | Result | Detail |
|---|---|---|
| E1 Provenance | **Pass** | 336 files, each byte-identical to Crawler `7d091ef`, re-read from the Crawler Git objects; no unlisted file |
| E2 Closure | **Pass** | 564 relative imports and 19 resource references all resolve |
| E3 Compilation | **Pass** | `tsc`: 0 errors |
| E4 Emitted code | **Pass** | 218 of 218 compiled files (114 modules, 104 test files) byte-identical to the reference build |
| E5 Tests | **Not met on 4 of 103 files** | First run: 22 files differed. After C1: 99 files identical. Reference 1,812 passed, 1 failed; engine-ts 1,777 passed, 11 failed. All four differences are explained below |
| E6 Behaviour | **Pass after the normalisation** | First run: 9 of 88 outputs differed, all through `stats.milliseconds`. After: 88 of 88 identical (11 fixtures × 8 entry points), stable over two runs of each build |

**The four E5 differences.** Each is caused by a file that was deliberately not imported (§4.1). None comes from a
difference in imported code, which E1 and E4 show is identical.

| Test file | Reference → engine-ts | Cause |
|---|---|---|
| `i1_node_engines` | 2/0 → 1/1 | Scans Crawler's `scripts/` (a Crawler governance check) |
| `s88_property_definitions` | 7/0 → 6/1 | One test audits the source of `phase253_request_advice.ts`, outside the reading scope |
| `phase144_cross_category_observation_graph` | 26/0 → 0/1 | Needs the non-rights-reviewed `phase143` excerpts. **Its 26 tests no longer run, so that module is untested in Pee** |
| `phase250_knowledge_snapshot` | 9/1 → 2/8 | Tests `scripts/knowledge-snapshot.mjs`, the store tool (later step) |

### 4.3 What this shows, and what it does not

- **Shown (regression evidence).** On Crawler's own public fixtures and tests, the imported copy behaves exactly like
  Crawler `7d091ef`. It is a faithful copy.
- **Not shown.**
  - Whether Crawler reads correctly: that is validation, which needs sealed, unseen material.
  - Behaviour on real pages: the private pages are not available in this session.
- **Nothing entered the universe.** No module output was connected to S0 or promoted to knowledge.

### 4.4 Commands

Run these from `engine-ts/`:

- `npm install`
- `npx tsc -p tsconfig.json`
- `node pee-tools/verify-provenance.mjs [crawler-clone]`
- `node pee-tools/run-tests.mjs [root] [out]`
- `node pee-tools/equivalence.mjs <root> [out]`

Requirements: Node.js 22.13 or later, Python 3, and `pdftotext` (poppler-utils) for PDF reading.
