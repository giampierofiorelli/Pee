# A-1 question format: what a passage licenses a reader to conclude

You write questions that test whether a reader **knows what a passage teaches**, by asking what follows from it. The
reader will not see the passage when answering. Each question is structured: it names concepts in the passage's own
terms, never by paraphrase, so that knowing the passage (not parsing your wording) is what is tested.

Write `{"set": "...", "author": "...", "items": [ ... ]}`. Each item:

```json
{
  "id": "Q07",
  "type": "influence",
  "ask": {"cause": "soil compaction", "effect": "surface runoff", "conditions": [{"concept": "rainfall intensity", "value": "high"}]},
  "expected": "increases",
  "relies_on_lines": [41, 42],
  "reason": "one sentence: which statements of the passage license this answer",
  "inference": "direct"
}
```

## Question types and their answers

| `type` | `ask` | `expected` is one of |
|---|---|---|
| `influence` | `cause`, `effect`, optional `conditions` | `increases`, `decreases`, `affects` (an effect is stated, without direction), `no effect` (the passage says there is none), `undetermined` (the passage does not settle it) |
| `holds` | `subject`, `relation` (a relation of the annotation guide), `object` (or null), optional `conditions` | `yes`, `no` (the passage states the opposite), `undetermined` |
| `status` | `subject`, `relation`, `object` | the author's attitude: `asserted`, `proposed`, `hypothesised`, `questioned`, `denied`, `not stated` |
| `evidence` | `subject`, `relation`, `object` | the kind of support the passage gives: `synthesis`, `original_measurement`, `standard_or_regulation`, `expert_judgement`, `guidance`, `proposal`, `hypothesis`, `not stated` |
| `consistent` | a `claim`: `subject`, `relation`, `object`, `polarity`, optional `conditions` (a claim someone might make, which you write) | `consistent` (the passage supports it), `conflicts` (the passage states the contrary), `not covered` |
| `value` | `subject` (a quantity), optional `conditions` | `{"number": …, "unit": …}` or `{"low": …, "high": …, "unit": …}` as the passage states it, or `undetermined` |

- **`inference`** says how the answer follows: `direct` (one statement), `chain` (two or more statements combined, for
  example A increases B and B increases C), `attitude` (from how the author qualifies a statement), `contrast` (from a
  correction, exception or limitation), `abstain` (the passage does not settle it; the correct answer is
  `undetermined`, `not stated` or `not covered`).
- **Mix.** At least 40 % of the items must have a determinate answer (not `undetermined`, `not stated` or
  `not covered`). Include questions whose correct answer is an abstention, and questions where a careless reader would
  promote a proposal or hypothesis to an established fact, or a synthesis to a measurement.
- **Terms.** Use the passage's own noun phrases for concepts. If the passage uses two terms for one thing, use the one
  it uses most.
- **No outside knowledge.** The expected answer must follow from the passage alone. If general science would answer
  differently from the passage, the passage decides, and you say so in `reason`.
