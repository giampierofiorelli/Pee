# F-1 question format (sets Q and QR)

Each question gives:
- one or more small **documents** about products: a manufacturer's specification sheet, a retailer listing or an
  independent test report;
- a buyer's **situation**;
- one **question**.

The expected answer must follow from the documents, the situation and the scientific content of the research
package. It must not depend on knowledge of real products.

Write a JSON object `{"set": "<name>", "items": [ ... ]}`. Each item has the following fields.

```json
{
  "id": "Q-AP-01",
  "category": "air purifier",
  "documents": [
    {
      "id": "D1",
      "publisher": "Example Appliances Ltd",
      "publisher_role": "manufacturer",
      "product": "Aerox P300",
      "tables": [
        {"caption": "Specifications", "rows": [["Specification", "Value"], ["...", "..."]]}
      ]
    }
  ],
  "situation": {
    "conditions": "words, or empty",
    "givens": ["words with a number and a unit", "..."]
  },
  "question": {
    "type": "limit",
    "product": "Aerox P300",
    "property": "words",
    "conditions": "words, or empty",
    "comparator": "at_least",
    "value": 20,
    "unit": "L/day"
  },
  "expected": "meets",
  "expected_reason": "one short sentence",
  "reason_class": "...",
  "relies_on": ["package section or table where the needed knowledge is stated"]
}
```

## Documents

- `publisher_role` is one of `manufacturer`, `retailer`, `independent test lab`, `consumer magazine`.
- `tables[].rows`: the first row is the header row; every other row is a list of cell strings. The usual form is a
  two-column sheet (label | value). A test report may instead have products in rows and measured quantities in
  columns.
- **Write labels as real documents write them.** A test condition or standard may sit in the label or in brackets,
  for example "Noise (sleep mode, 1 m)" or "CADR smoke (AHAM AC-1)". A value cell holds the number and its unit.
- **Invent** product and publisher names. Never use a real model name.

## Situation and question

- `situation.conditions` gives the buyer's operating conditions in words (for example "bedroom at 17 °C and 65 % RH").
  It may be empty.
- `situation.givens` lists quantities the buyer states about their situation (for example "room floor area 20 m²").
  It may be empty.
- `question.type` is one of three:
  - `limit`: does the product meet `comparator` (`at_least`, `at_most`) `value` `unit` for the `property` under the
    question's `conditions`?
  - `compare`: give `p1`, `p2` and `prefer` (`higher` or `lower`) instead of `product`, `comparator`, `value` and
    `unit`. Which product is better for the `property` under the `conditions`?
  - `select`: give `products` (a list) and `prefer`. Which product is best?
- `property` names what the buyer cares about in plain words ("water removal", "noise at night", "how many air
  changes per hour in my room").

## Expected answer

- `expected`:
  - for `limit`: `meets`, `fails` or `undetermined`;
  - for `compare`: `p1`, `p2`, `equal` or `undetermined`;
  - for `select`: a product name or `undetermined`.
- `undetermined` is correct when the documents and the package do **not** license a decision. Examples: values
  measured under different or unstated conditions, a different quantity, a declaration where a measurement is needed,
  or a missing value.
- `reason_class` is one of:
  - `direct` (the value answers it as stated);
  - `same_conditions_comparison`;
  - `calculation` (a decision follows by calculation from stated values and the buyer's givens);
  - `conditions_differ_or_unstated`;
  - `method_differs`;
  - `different_quantity`;
  - `missing_value`;
  - `declaration_not_measurement`;
  - `other`.
- `relies_on` cites the package passages that justify the expected answer.
