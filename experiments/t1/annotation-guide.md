# T-1 annotation guide: amendments to the A-1 guide

| | |
|---|---|
| **Authorised by** | Owner, 2026-10-23: T-1 stage 1 (Rules) |
| **Base** | `experiments/a1/annotation-guide.md`, **unchanged**. It stays the guide of A-1, O-2 and C-1 |
| **Use** | Annotators of the sealed reference R2 read both documents. Where they conflict, this one wins |
| **Freeze** | Before stage 2 (`DESIGN.md` §8.4), after the owner's W2 decisions. Sections marked *pending W2* take the decided option |

## 1. Evidence in four dimensions (replaces `evidence_kind`)

This is the evidence rule the owner approved (`DESIGN.md` §8.2, revision 2). It replaces the single field
`evidence_kind`.

| Field | Values | Rule |
|---|---|---|
| `evidence_nature` | `measurement`, `experiment`, `professional_observation`, `analysis`, `standard_text`, `declaration`, `none_stated` | The kind of support the passage gives |
| `evidence_producer` | a source identifier, an organisation, or `author` | Who produced the support |
| `evidence_independence` | `independent`, `interested`, `partial`, `unknown` | Unknown is `unknown`, never assumed |
| `statement_status` | `observed_result`, `general_claim`, `hypothesis`, `illustrative_example`, `recommendation`, `requirement`, `open_question` | What kind of claim it is |

**Rules.**
- **The author's own claim with no stated support** is `none_stated` and `general_claim`.
  - A teaching synthesis is `general_claim`. It is `analysis` only when the passage describes the calculation, model
    or review it rests on.
  - This replaces the old `synthesis` / `none_stated` choice, which caused most annotator disagreement in O-2.
- **A manufacturer's documented measurement** (method, conditions and value) is `measurement` with independence
  `interested`.
- **A plain commercial statement** is `declaration` with independence `interested`.
- **Neither is ever independent.** Measurement words without a documented method do not make a measurement.
- **A constructed or hypothetical case** is `illustrative_example`. Its facts are never `observed_result`.
- **`document_attitude` is unchanged and kept apart** (`asserted`, `proposed`, `hypothesised`, `questioned`,
  `denied`, `reported`). A proposal is `proposed` whatever its status.
- **Extraction fidelity is never annotated.** It is scored (`PROTOCOL.md`).

## 2. Citation and attribution (replaces the single `attributed_to`)

| Field | Meaning |
|---|---|
| `cited_sources` | Source identifiers cited for the passage unit that states the claim: in its sentence, or in a citation block closing its paragraph. This is a **bibliographic link**. How far the source supports the claim is not decided |
| `attributed_to` | Only when the passage presents the claim **as the source's**: a reporting verb ("X finds", "according to X"), X as the grammatical subject of the claim, or a result of an identified study. Otherwise null |

- A claim may have `cited_sources` and no `attributed_to`. This is the usual case for an author's synthesis followed
  by references.
- **Never** copy a paragraph's citation block into `attributed_to`.

## 3. Norms

| Field | Values |
|---|---|
| `deontic_force` | `obligation`, `prohibition`, `recommendation`, `discouragement`, `permission`, `unclear` |
| `norm_bearer` | `product` (a device or system), `procedure` (a method, protocol, test or schema), `user` (the reader or buyer), `adviser` (PEE itself), or `other: …` |

- **The relation** follows W2 D4–D6 (*pending W2*). The recommended options:
  - `requires` for obligations;
  - `recommends` for recommendations;
  - the controlled form `other: prohibits` for prohibitions;
  - `other: permits` for permissions.
- **Never write a prohibition as a negated `requires`.** "Not required" is a permission to omit.
- **The force comes from the passage, in this order:**
  1. explicit markers;
  2. a step of a procedure (bearer `procedure`);
  3. advice to a reader (bearer `user`).

  Otherwise it is `unclear` (D6, *pending W2*).
- **Modality.** Keep the modal of the sentence. It never changes the force: "should" stays a recommendation even if
  it is written `necessary`.

## 4. Elements the passage does not decide

Any element may be listed in `unclear` (for example `"unclear": ["deontic_force", "norm_bearer"]`) when the passage
itself does not decide it.
- This is the annotator's statement about the **text**, not about the reader.
- An `unclear` element is not scored for either arm.

## 5. Lists governed by a heading (*pending W2*, D7)

- **Recommended option A.** The heading gives the predicate only through existing relations:
  - a class heading → `is_a`;
  - an ordered list → `exceeds` between consecutive items, with the dimension named;
  - a status heading ("open questions", "research gaps") → `document_attitude` `questioned` or content kind
    `unknown`.
- **Any other heading** gives no predicate.

## 6. Definitions sharpened by W2 (*pending W2*, D1–D3)

| Relation | Test, when the owner adopts it |
|---|---|
| `is_a` | "every X is a Y" |
| `indicates` | "observing X is a reason to believe Y" |
| Threshold that **defines** a category | `is_a` or `defined_as` |
| Threshold that is **evidence** of a state | `indicates` |
| `establishes` | needs an evidential subject and an object that can be true or false |
| `applies_to` | has a domain or condition as its object |
| `equals` | identity or equality only |
| Comparability | the controlled form `other: comparable_with`, with polarity |

## 7. Schema additions

The fields below are added to, or replace, the fields of the A-1 schema. Every other A-1 field is unchanged.

```json
{
  "evidence_nature": "measurement",
  "evidence_producer": "R07",
  "evidence_independence": "interested",
  "statement_status": "observed_result",
  "cited_sources": ["R07"],
  "attributed_to": "R07",
  "deontic_force": null,
  "norm_bearer": null,
  "unclear": []
}
```
