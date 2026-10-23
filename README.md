# Pee — Scientific Semantic Universe

A clean-slate project to design, from first principles, a general **scientific semantic universe**: a model of
meaning able to represent, acquire, understand, connect, verify, update and reuse scientific knowledge.

This repository is public so that the owner can review the design, any later code, experiments and published results
directly. Confidential data, unpublishable scientific material and private evaluations are never stored here.

## Status

| Stage | Content | Status |
|---|---|---|
| S0 | Foundational specification of the semantic universe | **Complete and frozen** (versions 2.0 `b9bda7d` and 2.1 `cdcab48`) |
| S1 | Computational representation | MS1 slice and bounded experiments X1, X2, V1, I-1, I-2, F-1 and A-1 (closed; see `CLAUDE.md`) |
| O-0 | Organisation: Pee becomes the operational repository; Crawler is integrated selectively | **Fixed 2026-10-23** (`ORGANISATION.md`); first code import awaits owner review |

Pee is an independent scientific adviser built on the S0 universe; product advice is its first operational
application (`ORGANISATION.md`). The earlier engine stays, intact and read-only, in `giampierofiorelli/Crawler`;
private data stay in the private repository `pee-knowledge`.

## Guiding principle

The computational architecture must derive from the semantic universe, not the semantic universe from the
computational architecture.

## Layout

- `MISSION.md` — the owner's mission for this project (original Italian text and an English translation).
- `ORGANISATION.md` — repositories, project definition, languages and integration method (owner, 2026-10-23).
- `ASSIMILATION.md` — permanent architectural requirement: documents teach, the universe remembers (owner, 2026-10-23).
- `CLAUDE.md` — working rules for the Claude Code sessions that work in this repository.
- `spec/` — the S0 foundational specification (start at `spec/README.md`).
- `reviews/` — critical reviews of S0 versions and later architecture reviews.
- `experiments/` — S1 code and bounded experiments, each with its report.
