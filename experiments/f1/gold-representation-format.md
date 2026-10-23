# F-1 gold representation of a question (E2b: the rules given complete and correct representation)

For each question, write what its documents, its situation and the research package state, as structured data.
Nothing is read from text afterwards: a harness turns this structure into universe items mechanically, and the rules
answer from them. Represent faithfully. Do not add knowledge the package does not state, and do not decide the
answer.

Write `{"set": "...", "items": [ ... ]}`, one item per question. Each item has the following fields.

```json
{
  "id": "Q-DH-07",
  "quantities": [
    {"name": "water_removal_capacity", "unit": "L/d", "level": false,
     "depends_on": ["inlet_temperature", "relative_humidity"]},
    {"name": "inlet_temperature", "unit": "degC", "level": false, "depends_on": []},
    {"name": "relative_humidity", "unit": "%", "level": false, "depends_on": []}
  ],
  "named_conditions": [{"name": "challenge_aerosol", "values": ["smoke", "dust", "pollen"]}],
  "relations": [
    {"type": "formula", "target": "eACH", "expression": "CADR / room_volume"},
    {"type": "distinct", "a": "sound_power_level", "b": "sound_pressure_level"}
  ],
  "documents": [
    {"id": "D1", "product": "Aridon A16", "publisher_role": "manufacturer", "evidence": "declared",
     "rows": [
       {"quantity": "water_removal_capacity", "value": 12, "unit": "L/d",
        "conditions": {"inlet_temperature": [20, "degC"], "relative_humidity": [60, "%"]},
        "setting": null, "named": {}, "method": null, "bound": null}
     ]}
  ],
  "situation": {"conditions": {"inlet_temperature": [17, "degC"]}, "setting": null, "named": {},
                "givens": [{"quantity": "room_volume", "value": 35, "unit": "m3"}]},
  "question": {"type": "limit", "product": "Aridon A16", "quantity": "water_removal_capacity", "comparator": "at_least",
               "value": 11, "unit": "L/d", "conditions": {}, "setting": null, "named": {},
               "requires_evidence": "measured", "prefer": null, "p1": null, "p2": null, "products": null}
}
```

## Rules

- **`quantities`.** Give every quantity the question involves.
  - Its `name` is a snake_case identifier that you choose, and it is used consistently within the item.
  - Its `unit` is one of the unit symbols listed below. Use the unit that has the right dimension.
  - `level` is `true` for decibel quantities.
  - `depends_on` lists the quantities or named conditions that the package says the value depends on, and that are
    represented in this item. Use names, never prose.
  - Two different quantities never share a name, even when documents use the same word for them (sound power and
    sound pressure, gross and net water removal, a declared coverage area and a computed air-change rate).
- **`named_conditions`.** A condition whose values are words, such as the challenge aerosol or the operating mode
  when it has no number.
- **`relations`.** Only what the package states:
  - formulas, as monomials: names joined by `*` and `/`, with numeric constants allowed;
  - non-identity (`distinct`) between two of the item's quantities.
- **`documents`.** One per document of the question.
  - `evidence` is `measured` when the document reports its own measurement (an independent lab or a magazine test),
    and `declared` otherwise (a manufacturer or retailer specification, or a declared rating).
  - Each table row that states a value is one row of `rows`.
  - `value` is a number, or `[low, high]` for a stated range.
  - `bound` is `"upper"` or `"lower"` when the document states only "up to", "max" or "at least".
  - `conditions` holds the numeric conditions the row states, keyed by quantity name with `[number, unit]`.
  - `setting` is the operating mode or speed the row states, as a word ("night", "maximum").
  - `named` holds the word-valued conditions (`{"challenge_aerosol": "smoke"}`).
  - `method` is the test standard or procedure the row names, or null.
  - A row that states no value, or a quantity the question does not involve, may be left out.
- **`situation`** and **`question`.** Use the same structure for the buyer's conditions and givens and for the
  question. Each given is one quantity of the buyer's situation, such as room volume, floor area or ceiling height.
  - `requires_evidence` is `"measured"` when the question asks only for independently measured values, and null
    otherwise.
  - Copy `prefer`, `p1`, `p2` and `products` from the question.
- **Units.** The allowed unit symbols are: `m`, `cm`, `mm`, `ft`, `in`, `m2`, `sq ft`, `m3`, `ft3`, `L`, `mL`, `pt`,
  `m3/h`, `cfm`, `L/s`, `L/d`, `pt/d`, `kg/h`, `s`, `min`, `h`, `d`, `month`, `a`, `1/h`, `W`, `kW`, `Wh`, `kWh`,
  `kWh/a`, `L/kWh`, `kg/kWh`, `cfm/W`, `degC`, `degF`, `K`, `Pa`, `kPa`, `%`, `ppm`, `ppb`, `ug/m3`, `g/m3`, `kg`, `g`,
  `mg`, `lb`, `dB`, `dBA`, `Hz`, `V`, `A`, `mAh`, `Ah`, `1`.
