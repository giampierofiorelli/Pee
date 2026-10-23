# F-1 annotation guide: units of scientific knowledge in a research document

You annotate a research document. **List what the document itself states.** Do not add knowledge from elsewhere,
correct the author or complete what is missing. If something is unclear, record it as written and say so in `note`.

Output one JSON object: `{"document": "<name>", "units": [ ... ]}`. Each unit has a `type`, the fields below, a
`where` (the section heading, plus the table row's first cell or the sentence's first words) and an optional `note`.

## Unit types

### `kind` — a quantity the document defines

Annotate this for a row of a definition or glossary table, or a sentence of the form "X is …, measured in <unit>",
that defines a measurable quantity.

| Field | Content |
|---|---|
| `symbol` | the symbol as written, without backticks (`T_db`, `CADR_smoke`). `null` if there is none |
| `name` | the short name or head phrase of the definition ("dry-bulb air temperature") |
| `unit` | the unit or units exactly as written ("°C"; "L/24h or pints/24h"). `null` if no unit is stated |
| `family` | when one row defines several indexed variants of one symbol (`X_a`, `X_b`, `X_c`): the shared base symbol and the list of index values (`{"base": "X", "values": ["a", "b", "c"]}`). Otherwise `null` |
| `depends_on` | when the symbol is written with arguments, `X(a, b, c)`, or the text states that the quantity depends on named quantities or conditions: the list of arguments as written. Otherwise `[]` |

### `distinct` — a statement that two quantities or notions are not the same

For example `a != b`, `a ≠ b`, or "X is not Y". Use `"a"` and `"b"` exactly as written, and fill `about` with
`"quantity"` (both sides are measurable quantities) or `"other"`.

### `formula` — a mathematical relation between symbols

Use `"target"` for the left-hand symbol and `"expression"` for the right-hand side, as written. Add `"kind"`:
- `"definition"` for an identity or definition;
- `"worked_example"` when it is a numerical example with numbers in place of symbols;
- `"conversion"` for a unit conversion.

### `method` — a named standard, test procedure or certification programme

Annotate this when the document describes what the standard, procedure or programme measures or covers.

| Field | Content |
|---|---|
| `name` | as written ("ANSI/AHAM AC-1-2020") |
| `editions` | years or edition labels it states (`["2020"]`) |
| `measures` | the quantities it measures, as written |
| `conditions` | numeric test conditions it fixes: `[{"variant": <words or null>, "quantity": <as written>, "value": <number>, "unit": <as written>}]` |
| `does_not_establish` | `true` when the document states what it does **not** establish |

### `reference` — an entry of a source register or bibliography

| Field | Content |
|---|---|
| `id` | the identifier ("R07", "A03") |
| `organisation`, `title`, `date`, `url` | as written, or `null` |
| `class` | the evidence class text the entry gives, or `null` |

Also list, once per document, **identifiers that are cited in brackets but have no register entry**:
`{"type": "unresolved_citation", "id": "..."}`.

### `label` — the document's own evidence labels

For each claim label the document defines (in a legend) or uses on a statement, give the `label` as written and the
`class` it belongs to, chosen from this list:

`physical_relation`, `regulatory_rule`, `standard_description`, `certified_rating`, `original_measurement`,
`clinical_trial`, `systematic_review`, `guidance`, `manufacturer_declaration`, `engineering_inference`,
`proposed_method`, `illustrative`, `unsupported_claim`, `hypothesis`, `unknown`.

Use `null` if none fits.

## Rules

- **One unit per thing defined.** If the same symbol is defined again in another part of the same document, annotate
  each occurrence. Mark the second with `"note": "repeats <where>"`.
- **Same symbol is not same quantity.** Two different quantities may share a symbol, in different places or
  documents. Annotate each with its own unit and definition.
- **Not knowledge.** Do not annotate:
  - marketing strings quoted as examples of bad claims;
  - questions to a user;
  - pseudocode or YAML field names.

  A `formula` inside such material is annotated only if the document presents it as a relation.
- **Be complete within the sections you are given.** Missing a unit matters as much as adding a wrong one.
