# R-1 — Report: first operational recovery of Crawler's table capabilities

| | |
|---|---|
| **Protocol** | `PROTOCOL.md`, committed before any code (`d48e844`); reference sealed (`14a97b4`); S frozen (`7dc4f77`) |
| **Outcome** | **Integration blocked by the pre-registered rule.** No Crawler capability is shown to be recovered on this material. The operational path is unchanged |
| **Independence** | Claude's work on spent material, with a Claude-written reference. Not independent validation |

## 1. What was built

- **`engine-ts/pee-tools/tables-bridge.mjs`.** It runs the original 1F, 1G and 1G + quantity-knowledge entry points,
  unchanged, from the compiled `dist/`, and prints their outputs as JSON.
- **`experiments/r1/crawler_tables.py`:**
  - a Markdown → HTML converter, written independently of `markdown.py`;
  - the bridge call, which raises `CrawlerUnavailable` when Node or the build is missing (no silent fallback);
  - arm S (`table_units`).

  It was first placed in `universe/`. Because the decision is "blocked", it was moved out of the operational package
  after the run. The content was identical at the move. Two lines were then changed (the import path and the
  `engine-ts` path), and re-running reproduced every score exactly.
- **Tests.** `test_r1.py` (3 tests, constructed documents) covers the converter, 1F agreement with `markdown.py`, and
  the rules of arm S.

## 2. Results

### P0, structure (all 42 tables of AP, DH and THREE-DH)

- **P0 passes.** 1F, through the adapter, reads every table as `markdown.py` does: 2,078 cells with the same rows,
  columns, header flags and text, the same heading paths, and every table `complete`.
- **Untested:** none of these cells contains a link, so link preservation is untested on authentic material.

### Sealed run (10 tables, 56 reference values, first run unchanged)

| Measure | O (Crawler 1G) | N (Pee now) | S (selective) |
|---|---|---|---|
| Values output | 38 | 6 | 38 |
| Reference values found | 34 | 6 | 38 |
| Representable in S0/MS1 | 1 | 6 | 38 |
| Unit right | 32 | 6 | 37 |
| Property right (structured / preserved) | 0 / 0 | 6 / 6 | 19 / 21 |
| Entity right (structured / preserved) | 6 / 6 | 5 / 5 | 19 / 26 |
| **Fully correct** | **0** | **5** | **13** |
| **Critical errors** | **9** | **0** | **5** |
| of which | essential condition dropped 4, wrong entity 4, declaration as measurement 1 | — | essential condition dropped 2, wrong entity 2, **wrong unit 1** |
| Spurious outputs | 4 | 0 | 0 |
| Lost | 22 | 50 | 18 |
| After integration (M7): correct / wrong / uninformed / abstained | 0 / 0 / 35 / 21 | 0 / 0 / 35 / 21 | 4 / 3 / 24 / 25 |

### Decision rule (PROTOCOL §8)

| Rule | Result |
|---|---|
| D1 P0 passes | holds |
| D2 S's critical errors ≤ N's and ≤ O's | **fails**: 5 against N's 0 |
| D3 S's fully correct > N's | holds: 13 against 5 |
| D4 nothing N gets fully correct is lost in S | holds |
| D5 after integration, S's correct ≥ N's and S's wrong ≤ N's | **fails**: 3 wrong against 0 |
| Stop: a critical error of a type neither N nor O makes | **met**: a wrong unit |

**S does not enter the operational path.**

## 3. What the comparison shows

1. **Crawler's 1G does not help on these tables.**
   - The owner documents' tables are mostly prose cells. 1G reads every one as "record" axes: it finds no product and
     assigns no property.
   - It attaches evidence classes the text does not support (for example `manufacturer_declared`).
   - It reads row numbers and the "2.5" of PM2.5 as values.
   - Fully correct: 0. Critical errors: 9.
2. **S's advantage over N is not Crawler's.**
   - Post hoc ablation: every one of the 38 values S kept was read by Pee's own value parser. 1G added none, and 1F
     added structure identical to what `markdown.py` already gave.
   - S beats N because it reads every cell with Pee's tools, the row label as a condition, and Pee's checks:
     quotation marks are reported speech, a negated column is not read.
   - **That is a Pee reader change, not a recovery.**
3. **S's own errors show what a cell reader still lacks:**
   - a value restated in parentheses ("0.050 ppm (50 ppb)") loses the bound of the first;
   - values paired by "/" ("26.7°C/60%", "Portable 65°F/60% RH") lose their pairing and qualifier;
   - a rate written in words ("30 litres a day") becomes a volume.
4. **Where 1G's advantage was observed, R-1 could not look.**
   - V1 found 1G's advantage on **HTML product-review tables** (products × properties × settings).
   - No authentic HTML page is available in this session: `$PEE_PRIVATE_EVAL_DIR` is unset, and `pee-knowledge`
     keeps no page bytes.
   - So this run neither confirms nor refutes 1G on the material it was built for.

## 4. Capabilities: recovered, usable, not integrated

| Capability | Status |
|---|---|
| 1F table structure through a verified Markdown interface | **Usable** (bridge, adapter, P0, tests). No gain over `markdown.py` on Markdown; its value would be on HTML |
| 1G interpretation and quantity typing on scientific Markdown tables | **Not recovered**: worse than Pee on this material |
| 1G on HTML product tables | **Not tested** (no material) |
| Integration in the operational path | **None** (decision rule) |

## 5. Regressions and costs

- **Regressions.** None possible on the operational path: no gated file changed (`preservation/check.py` passes;
  record `preservation/records/r1.json`, decision `blocked`). All suites were re-run. No QS run was needed.
- **Costs.**
  - Zero agents, no models, no new sources, no Soundbars.
  - One `engine-ts` build (18 s); one development cycle (2 of 3 reformulations); one sealed run (14 s).
  - Private outputs are in `pee-knowledge/private-eval/pee-r1/`. Public counts: `sealed-firstrun-counts.json`,
    `p0-firstrun.json`.
- **A process finding.**
  - The preservation check requires the comparison before a reader file is committed. So R-1 froze code by hash
    (`seals.json`), not by committing it.
  - The check worked as intended: the non-integrated interface could not enter `universe/` under a `blocked`
    decision.

## 6. Decision point

1. **Test 1G where it was strong.** This needs the authentic HTML pages of V1/I-1/I-2 (`$PEE_PRIVATE_EVAL_DIR`) in a
   session, with the same protocol: O, N and S on sealed tables. Without that material, no claim about Crawler's
   table capability can be made either way.
2. **The cell reader shown in S.** Its gains are Pee's own, and its three error mechanisms are named in §3.3.
   Correcting them is a reader change under the owner's condition, so it needs an explicit decision.
