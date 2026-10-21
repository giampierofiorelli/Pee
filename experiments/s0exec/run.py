"""Run the review questions and the identity triple; print conclusions with traces. Deterministic, no LLM."""
import json
from s0exec import inputs, model, queries, identity

kb = model.KB(inputs.review_statements())
S = inputs.SUBJECT
cases = {
    "Q1 20 L/day asserted at 21.5 °C?": queries.value_at(kb, S, "extraction_rate", {"temperature_C": 21.5}),
    "Q2 RH drop establishes a rate in L/day?": queries.derive(kb, S, "L/day", exclude_quantities={"extraction_rate"}),
    "Q3 Night mode establishes measured quietness?": queries.performance_in_mode(kb, S, "sound_level", "night"),
    "Q4 normal vs laundry noise: same condition?": queries.same_condition(kb, "s08", "s12"),
    "Q4b compare the two noise values": queries.compare_values(kb, "s08", "s12"),
    "Q5 two rated points isolate temperature?": queries.causal_effect(kb, S, "extraction_rate", "temperature_C"),
    "Q6 rated value at its own conditions": queries.value_at(kb, S, "extraction_rate", {"temperature_C": 30, "rh_percent": 80}),
    "Q7 RH at 1 h vs 2 h comparable as same condition?": queries.compare_values(kb, "s06", "s07"),
}
for k, c in cases.items():
    print(k); print(json.dumps(c.trace(), ensure_ascii=False, indent=1))
for c in queries.evaluation_status(kb, S):
    print("Evaluation"); print(json.dumps(c.trace(), ensure_ascii=False, indent=1))
print("\nClassification:", {s.id: model.classify(s) for s in kb.statements})
P = frozenset({"p1", "p2"})
mk = lambda n, g: identity.Concept(n, "quantity", P, {"specific": frozenset(g), "general": frozenset({"G"})})
A, B, C = mk("A", {"g", "h"}), mk("B", {"g"}), mk("C", {"g", "k"})
for v in ("2.0", "2.1"):
    print(f"\nIdentity S0 {v}:", json.dumps(identity.check_consistency(v, [A, B, C])))
    print("safe_merge:", identity.safe_merge(v, [A, B, C]))
