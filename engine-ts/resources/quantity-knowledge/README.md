# Quantity knowledge resources: operational files and replay data

S83 (owner review of S82: "distinguish the history needed to reproduce experiments, the code needed now, the permanent
scientific rules and the superseded provisional solutions"). The operational code loads only the files named by its
constants. No operational code branches on an older version; older files are data that replay tests and scripts pass in
explicitly, so they never complicate the operational path. Do not edit a released file: add a new version.

| Kind | Operational (loaded by default) | Constant | Replay data only (who replays it) |
|---|---|---|---|
| Quantity pack | `quantity-knowledge.v3.json` | `DEFAULT_QUANTITY_PACK` (`src/quantity_knowledge.ts`) | v1, v2 (earlier QK evaluations) |
| Comparability rules (kr.4) | `rules.v4.json` | `DEFAULT_KNOWLEDGE_RULES` | v1 (`scripts/fc-score.mjs`, `scripts/r1-knowledge-map.mjs`, `tests/product_facts.test.ts`), v2 and v3 (`scripts/r1-compare-replay.mjs`, `scripts/r1-decision-census.mjs`, `tests/knowledge_rules.test.ts`) |
| Link, evidence, comparable programs (kr82.1) | `link-rules.v9.json` | `LINK_RULES_FILE` (`src/knowledge_link.ts`) | v1-v5 (`scripts/r2-link-experiment.mjs`, `tests/knowledge_link.test.ts`), v6 and v8 (`scripts/s81-real-census.mjs`), v7 (`tests/s81_knowledge_reasoning.test.ts`: the withdrawn v7 preference as a counterexample) |
| Reader condition codes as axes (D27) | `reader-conditions.v1.json` | `READER_CONDITIONS_FILE` | none |
| Product facts | `functions.v1.json`, `product-rules.v1.json` | `src/product_facts.ts` | none |

The permanent scientific content (teaching, research packages) is not here: it lives in the private knowledge store.
