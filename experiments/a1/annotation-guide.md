# A-1 annotation guide: the scientific propositions a passage states

You annotate a passage of a scientific teaching document. List **every scientifically meaningful proposition** the
passage states, each translated into the structure below. You do not summarise and you do not judge whether a
proposition is true. You record what the document says, how it says it, and on what authority.

- **One proposition is one claim.** A sentence may state several. One claim may need several sentences, a heading or
  an earlier paragraph to be complete: then list the context it needs in `depends_on`, or name the subject the heading
  supplies. Fidelity is to the scientific meaning, not to the grammar.
- **Include:** definitions, classifications, causal and dependence claims, mechanisms, quantitative values, conditions,
  methods and what they establish or do not establish, comparisons, limitations and exceptions, hypotheses, proposals,
  open questions, recommendations stated as norms, attributions to sources, and statements of what is unknown.
- **Leave out:** pure navigation ("see section 4"), formatting, and the document talking about itself without
  scientific content. When in doubt, include the proposition and say why in `note`.

Write `{"passage": "...", "annotator": "...", "propositions": [ ... ]}`.

## Fields of one proposition

```json
{
  "id": "P07",
  "lines": [41, 42],
  "content_kind": "causal",
  "relation": "increases",
  "subject": "soil compaction",
  "object": "surface runoff",
  "value": null,
  "polarity": "affirmed",
  "modality": "actual",
  "generality": "generic",
  "conditions": [{"concept": "rainfall intensity", "value": "high"}],
  "document_attitude": "asserted",
  "evidence_kind": "synthesis",
  "attributed_to": null,
  "depends_on": [],
  "explains": [],
  "qualifies": null,
  "note": ""
}
```

| Field | Values and meaning |
|---|---|
| `id` | `P01`, `P02`, … in reading order |
| `lines` | the line numbers of the passage that state it (all of them, also context lines) |
| `content_kind` | `causal` (an intervention on one would change the other; also mechanisms), `dependence` (a value depends on another, direction not stated), `association` (co-variation only, no causal claim), `definition`, `classification` (is a kind of / is not), `quantitative` (a value, range or bound of a quantity), `comparison` (more/less/same as), `method` (what a method, test or standard measures, establishes or does not establish, its conditions), `norm` (a requirement, recommendation or prohibition), `scope` (where something applies or does not apply), `explanation` (one claim explains another), `identity` (two terms are or are not the same thing), `existence` (something occurs, exists or is observed), `unknown` (the document states that something is not known or not established) |
| `relation` | one of: `increases`, `decreases`, `affects` (direction not stated), `causes`, `prevents`, `enables`, `depends_on`, `determines`, `correlates_with`, `is_a`, `part_of`, `has_property`, `defined_as`, `measures`, `establishes`, `does_not_establish`, `requires`, `recommends`, `indicates`, `applies_to`, `exceeds`, `less_than`, `equals`, `differs_from`, `has_value`, `occurs`, `explains`. If none fits, write `other: <verb>` |
| `subject`, `object` | the concepts, as short noun phrases in the document's own terms, without articles (`object` is null when the relation needs none). Keep qualifiers that change the concept ("absolute humidity", not "humidity") |
| `value` | for quantitative claims: `{"number": 50, "unit": "%"}`, `{"low": 40, "high": 60, "unit": "%"}`, or a bound `{"bound": "upper", "number": 60, "unit": "%"}` |
| `polarity` | `affirmed` or `negated` (the document says it does **not** hold) |
| `modality` | `actual`, `possible` ("can", "may"), `necessary` ("must", "always"), `typical` ("usually", "often") |
| `generality` | `strict` (no exceptions), `generic` (a characteristic tendency), `statistical` (a frequency or effect size in a population), `typicality`, `ceteris_paribus`, `idealised` (holds in a model), `functional` (a quantitative dependency), `situated` (one case or one test) |
| `conditions` | the conditions under which the document says it holds: `[{"concept": "...", "value": "..."}]` |
| `document_attitude` | the author's attitude: `asserted`, `proposed` (a proposal, design or protocol the author puts forward), `hypothesised` (a conjecture to be tested), `questioned` (an open question), `denied`, `reported` (the author reports what a source says without endorsing it) |
| `evidence_kind` | what kind of support the document gives this claim: `synthesis` (the author's scientific explanation or synthesis), `original_measurement` (a measured result of an identified study or test the document cites), `standard_or_regulation` (what a standard, regulator or programme states), `expert_judgement` (a qualitative judgement), `guidance` (an authority's advice), `proposal`, `hypothesis`, `none_stated` |
| `attributed_to` | the cited source identifier (`R07`, `B3`, …) or organisation the document attributes the claim to; null when the author states it in their own voice |
| `depends_on` | ids of earlier propositions this one needs to be understood (a pronoun's referent, a definition, a condition stated earlier) |
| `explains` | ids of propositions this one is offered to explain (`because`, `therefore`, `this is why`) |
| `qualifies` | the id of a proposition this one limits, corrects or makes an exception to |
| `note` | anything the structure cannot hold (say what is lost) |

## Rules

- **Never promote.** A proposal stays `proposed`, a conjecture stays `hypothesised`, and a teaching synthesis is never
  `original_measurement` because it cites a reference. An effect size reported from a cited study is
  `original_measurement` attributed to that study.
- **Never invent.** Do not add knowledge the passage does not state, even if you know it to be true.
- **Negation is a proposition.** "Air temperature alone does not determine evaporation rate" is `determines`, `negated`.
- **A correction** ("Important correction: …") is a proposition with `qualifies` pointing at what it corrects, when the
  corrected claim is in the passage; otherwise say in `note` what it corrects.
- **Lists:** each list item that states a claim is a proposition; a list item that only names a thing is not.
