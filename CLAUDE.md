# Pee — working rules for Claude Code

Read these first, in this order:

1. `MISSION.md` — the owner's mission (original brief, never edited).
2. `ORGANISATION.md` — owner decision of 2026-10-23: the repositories, the project definition, languages and the
   integration method. Where an older rule below or in the skill conflicts with it, `ORGANISATION.md` wins.
3. `ASSIMILATION.md` — a **permanent architectural requirement** (owner, 2026-10-23). Owner-supplied documents are
   temporary teaching input; the lasting result is scientific knowledge in the semantic universe, usable without the
   document.

None of these modifies S0.

## Organisation (owner, 2026-10-23)

- **Pee is the only operational repository.** It is an independent scientific adviser built on the S0 universe.
  **Product advice is its first operational application, and it is mandatory**, recovering Crawler's capabilities.
- **Crawler (`giampierofiorelli/Crawler`) is a historical reference, 100% intact.**
  - Read it and copy files out of it only.
  - Never commit, branch or push there, and never open or run a Claude session or its hooks on it (its hooks write to
    `pee-knowledge`).
  - Pin imports to commit `7d091ef`.
- **`pee-knowledge` (private) is the archive.**
  - It holds store snapshots, owner packages, gold sets and private evaluations.
  - It holds data only; never publish its content.
- **S0 is the only authority on scientific knowledge.** Imported code reads and proposes. A proposal becomes
  permanent knowledge only through the universe interface, after measured checks of fidelity, attribution and
  comprehension (`ORGANISATION.md` §4).
- **Languages.**
  - Python (standard library) for the universe.
  - Original TypeScript for the imported Crawler modules, unchanged and with provenance, in `engine-ts/`.
  - Nothing is rewritten in advance. A conversion to Python needs a measured advantage and a separate, tested change.
- **Integration order:**
  1. import the full closure unchanged;
  2. prove compilation and equivalent behaviour;
  3. connect to the universe;
  4. verify before admission;
  5. only then trim dependencies, each in a separate commit with tests.
- **Branch:** `claude/pee-operational`, started from `claude/a1-scientific-assimilation`. `main` stays at MS1 until
  the owner decides.

## Current authorisation

- **O-0** (owner, 2026-10-23): the organisation and these instructions, on branch `claude/pee-operational`.
- **O-1** (owner, 2026-10-23, after reviewing O-0; `ORGANISATION.md` D11): import reading and understanding
  (`ORGANISATION.md` §5) into `engine-ts/`.
  - Import the full closure, about 131 files, **unchanged**, with a verifiable provenance manifest.
  - Run the equivalence tests against Crawler `7d091ef` before any semantic integration.
  - No change to Crawler.
  - **No automatic promotion of knowledge into the universe.**
  - For GLiNER2.5, only the portable TypeScript part. No neural model.
  - Connecting to the universe (§4 steps 3–4) and trimming (step 5) need their own owner go-ahead.
  - **Done** (`engine-ts/README.md` §4). E1–E4 and E6 pass. E5 is not met on 4 of 103 test files, each caused by a
    file deliberately not imported. Stopped here.
- **O-2** (owner, 2026-10-23; `experiments/o2/REPORT.md` §0): connect Crawler's prose reader
  (`knowledge_translation`, unchanged in `engine-ts/`) to S0 through an adapter. Compare three readings on scientific
  fidelity: A-1 (A), Crawler (T) and a hybrid (H) defined before the test.
  - Material: prose of package 09 speakers. The reference is sealed before any adapter code.
  - At most one change cycle.
  - No new capability, no persistence, no admission of knowledge.
  - **First sealed run done** (`experiments/o2/REPORT.md` §4–9): A-1 is best, and the hybrid does not improve on it.
    The change cycle has not been run.
  - The recommendations received afterwards (`ORGANISATION.md` §7.3) are **not** owner authorisations.
- **C-1** (design only, revision 1 after the owner's corrections; `experiments/c1/DESIGN.md`): a comparison of more capable local interpreters, connected to
  S0, aimed at the relation errors.
  - Nothing is installed or run.
  - Execution needs an explicit owner authorisation, including the limited exception to the dependency rule.
  - Qwen stays suspended.
- **T-1** (design only; `experiments/t1/DESIGN.md`): the owner's documents translated sentence by sentence into the
  universe, then reasoning from the universe alone.
  - The existing reader is improved from its measured errors, with selective abstention element by element.
  - The 27 relations are unchanged unless the owner decides otherwise.
  - Revision 2 (owner, 2026-10-23; `experiments/t1/DESIGN.md` §8.4): the deferred seal of Soundbars is accepted, and
    **only stage 0 (Diagnosis)** is authorised.
  - Stage 0 uses no agents, no Soundbars content and no S0 change. Preferably it runs in a new session attached to
    Pee alone.
  - **Stage 0 done** (`experiments/t1/W1-DIAGNOSIS.md`). Recommendation: proceed, narrowed. Stopped at the stage-0
    decision. Stage 1 is not authorised.
- **S0 is complete and frozen** (`spec/`, versions 2.0 `b9bda7d` and 2.1 `cdcab48`, with their reviews and
  evaluations under `reviews/`). Do not modify it.
- Every step names its owner authorisation, and fixes its criteria before any code, as before.
- A new database, framework, remote service or heavy dependency needs an owner decision.
- Use the skill `.claude/skills/pee-scientific-learning/` for all S1 and later work.

### Closed authorisations (history; their stop rules are fulfilled)

Each item below was bounded and is closed. Its "Crawler read-only, no migration" limits applied to that experiment
and are superseded by `ORGANISATION.md` for new work. The experiments themselves stay unchanged.

- **S1 so far:**
  - a numerical model-based service (`experiments/s1core`) and its architectural correction;
  - the architecture assessment and plan (`reviews/S1-architecture-assessment-and-plan.md`);
  - MS0 (sealed material) and the MS1 vertical slice (`experiments/universe`), owner-authorised 2026-10-21.
- **X1** (owner, 2026-10-21): bounded integration experiment, `experiments/x1/PREREGISTRATION.md`. It read Crawler
  `7d091ef` and used a copy of its store snapshot.
- **X2** (owner, 2026-10-21): bounded structural-reuse experiment, `experiments/x2/PREREGISTRATION.md`.
- **V1** (owner, 2026-10-23): read-only joint verification of universe, representation and rules,
  `reviews/V1-joint-architecture-verification.md`.
- **I-1** (owner, 2026-10-23): table structure → universe items → MS1 rules, `experiments/i1/REPORT.md`. Stopped on
  its stop criterion 5.
- **I-2** (owner, 2026-10-23): general linking of document structure to the universe, `experiments/i2/REPORT.md`.
- **F-1** (owner, 2026-10-23): initial scientific formation. It covers:
  - `universe/markdown.py` and `universe/knowledge_acquisition.py`;
  - the transversal base;
  - the air-purifier and dehumidifier packages.

  Report: `experiments/f1/REPORT.md`. Closed on stop rules F4 and F6.
- **A-1** (owner, 2026-10-23): first increment of `ASSIMILATION.md`, `experiments/a1/REPORT.md`. Its only extra
  source was `PEE-DEHUMIDIFIERS-CONSOLIDATED-RESEARCH-2026-10-15.md` in `PEE-THREE-SCIENTIFIC-RESEARCH-PACKAGES.zip`.
  Stopped on rule A6.

## Sources and independence

- **The semantic universe is designed from first principles.** S0 governs meaning. Imported Crawler code is an
  operational capability under S0, never its source of meaning.
- **Crawler is an authorised source as a whole**, in read-only mode (owner, 2026-10-23).
  - Its code may be imported under `ORGANISATION.md` §4.
  - Its reports, decisions and skill may be read as historical lessons.
  - Its store is teaching material, never converted in bulk.
- **Any other repository of the owner, and any other earlier design document or report, still needs an explicit
  owner authorisation naming it.**
- **Agreement between Claude agents is not independent validation.** Do not present it as such.

## Method

- Compare genuine theoretical alternatives. Do not pick a model because it is familiar.
- Ground claims in general principles of semantics, knowledge representation, epistemology, logic, cognitive science
  and scientific methodology. Cite authoritative sources by author, title and year.
- Test the proposal conceptually on scientific examples from several unrelated domains.
- State formal properties (decidability, complexity, expressiveness) only with their exact conditions, or mark them
  as open.
- Examples used to design the model can never later serve as independent evidence for it.
- State clearly what remains open.

## Evidence and evaluation (also for product advice)

- **Manufacturer declarations are never independent tests or rankings.**
- **Never merge products on similar names.**
- **Gold stays separate from operational knowledge.**
  - Seal expectations before a first run.
  - Commit first-run results unchanged.
  - A tuned or spent set is never reported as held-out.
- **Confidential evaluation inputs** live in `$PEE_PRIVATE_EVAL_DIR`; durable private copies go to `pee-knowledge`.
- **An equivalence check against Crawler `7d091ef` is regression evidence, not validation.**

## Safety, rights and cost

- Never bypass robots rules, HTTP 403/429 responses, paywalls or other access controls.
- A public URL is not permission to store or republish. Never commit third-party full texts, articles or HTML. Short
  quotations with attribution are allowed.
- This repository is **public**. Never commit secrets, personal data, confidential data or unpublishable material.
- **Dependencies.**
  - No paid services or licences, no unnecessary remote services, no heavy dependencies.
  - Allowed: Node.js 22.13 or later, `typescript` and `@types/node`, plus `fast-check` for imported tests.
  - Excluded: `onnxruntime-node` and neural models.
- **Imported third-party code keeps its licence notice** (for example GLiNER2, Apache-2.0).
- No duplicate or accessory documents. Keep the deliverable focused.
- English for all repository files.

## Git

- Commit and push to the branch you were given. Do not create pull requests unless the owner asks.
- One Claude session per branch at a time. Parallel work goes on separate branches, with controlled integration.
