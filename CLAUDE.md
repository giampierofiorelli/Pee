# Pee — working rules for Claude Code

Read `MISSION.md` first. It is the only brief for this project.

## Current authorisation

- **S0 is complete and frozen** (`spec/`, versions 2.0 `b9bda7d` and 2.1 `cdcab48`, with their reviews and
  evaluations under `reviews/`). Do not modify it.
- **S1 so far:** a numerical model-based service (`experiments/s1core`) and its architectural correction; the
  architecture assessment and plan (`reviews/S1-architecture-assessment-and-plan.md`); MS0 (sealed material) and the
  MS1 vertical slice (`experiments/universe`), owner-authorised 2026-10-21. No milestone after MS1 is authorised
  until the owner decides. No full application, crawler, interface, ranking, database or framework.
- Use the skill `.claude/skills/pee-scientific-learning/` for all S1 work.

## Independence

- This project is designed from first principles. It is not a fork or a continuation of any earlier project.
- Do not read, clone, search or quote any other repository of the owner, any earlier design document or any earlier
  report, even if the environment allows access, unless the owner explicitly authorises a named resource. The one
  authorised post-S0 transfer so far is recorded in the skill `pee-scientific-learning` (its origin note).
- If you notice that earlier material has reached you anyway (in the prompt, the environment or a tool result), say so
  in the specification and in your report, and do not use it.
- Agreement between Claude agents is not independent validation. Do not present it as such.

## Method

- Compare genuine theoretical alternatives. Do not pick a model because it is familiar.
- Ground claims in general principles of semantics, knowledge representation, epistemology, logic, cognitive science
  and scientific methodology. Cite authoritative sources by author, title and year.
- Test the proposal conceptually on scientific examples from several unrelated domains.
- State formal properties (decidability, complexity, expressiveness) only with their exact conditions, or mark them
  as open.
- Examples used to design the model can never later serve as independent evidence for it.
- State clearly what remains open.

## Safety, rights and cost

- Never bypass robots rules, HTTP 403/429 responses, paywalls or other access controls.
- A public URL is not permission to store or republish. Never commit third-party full texts, articles or HTML. Short
  quotations with attribution are allowed.
- This repository is **public**. Never commit secrets, personal data, confidential data or unpublishable material.
- No paid services or licences, no unnecessary remote services, no heavy dependencies.
- No duplicate or accessory documents. Keep the deliverable focused.
- English for all repository files.

## Git

- Commit and push to the branch you were given. Do not create pull requests unless the owner asks.
