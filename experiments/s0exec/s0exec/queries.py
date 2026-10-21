"""Shared S0 rules (identical text in S0 2.0 `b9bda7d` and S0 2.1 `cdcab48`), implemented once.

Each query returns a Conclusion whose `grounds` are input statement ids and whose `rules` are ids below.
No rule mentions a product, a quantity name or a unit except through the generic UNIT_DIMENSION table.
"""
from itertools import combinations

from .model import UNIT_DIMENSION, Conclusion, classify

RULES = {
    "R-PROV": "Classify each input by declared kind and method; keep it attributed to its holder. "
              "S0 3.4 (kinds by correctness condition), 6.1 (attribution before adoption), 5.9/D14 (holder).",
    "R-COND": "A conditioned value applies only under its own conditions; no interpolation or extrapolation "
              "is licensed without a model whose domain covers the query. S0 4.6(1), 6.4 TC3, 7.4 rated vs realised.",
    "R-DIM": "Conclusions in a unit need inputs of the same dimension or a registered derivation with all inputs "
             "grounded; unknown units have no dimension. S0 4.1 Op5, 4.7, C2, C4. (Derivation registry: empty.)",
    "R-FUNC": "A function (design capability, mode) does not establish a performance quantity. S0 3.4, 7.4.",
    "R-GAP": "Absence of a statement, or an explicit gap, is never read as negation. S0 4.10 (N1 vs N3), C11.",
    "R-SAME": "Two items are under the same condition only if every declared condition key is present in both "
              "with equal values and the tested object is the same. S0 4.3, 4.6, 6.4 TC3.",
    "R-CAUSAL": "A causal content needs causal grounds (intervention) relative to background held fixed; "
                "contrasts that vary more than one condition cannot isolate a variable. S0 5.5.",
    "R-EVAL": "An evaluative content needs item, criterion, level, goal, holder, conditions and comparator; "
              "otherwise incomplete. Evaluation is not measurement. S0 7.4, 3.5.",
    "R-ID20": "S0 2.0 identity for coexisting concepts: 3.6.3 table at b9bda7d (all admissible readings).",
    "R-ID21": "S0 2.1 identity procedure: 3.6.1-3.6.3 at cdcab48 (steps 1-5).",
    "R-CONS": "Programmer safeguard (not an S0 rule): check reflexivity, symmetry and transitivity of 'same' "
              "before any merge; merge nothing if violated. Motivated by S0 C11 'no merge without grounds'.",
}


def _q(kb, subject, quantity):
    return [s for s in kb.statements if s.subject == subject and s.kind == "quantity" and s.quantity == quantity]


def value_at(kb, subject, quantity, conditions):
    cands = _q(kb, subject, quantity)
    if not cands:
        return Conclusion("UNRESOLVED", f"no statement of '{quantity}' for {subject} (gap, not negative)",
                          "quantity", [], ["R-GAP"])
    match, under, unknown, outside = [], [], [], []
    for s in cands:
        if not s.conditions:
            unknown.append(s.id)
        elif any(k in conditions and conditions[k] != v for k, v in s.conditions.items()):
            outside.append(s.id)
        elif any(k not in conditions for k in s.conditions):
            under.append(s.id)
        else:
            match.append(s.id)
    if match:
        parts = [f"{kb.by_id[i].value} {kb.by_id[i].unit} as {classify(kb.by_id[i])} held by "
                 f"{kb.by_id[i].holder}" for i in match]
        return Conclusion("SUPPORTED", "; ".join(parts) + " (attributed, not adopted)", "quantity", match,
                          ["R-COND", "R-PROV"], details={"conditions": conditions})
    if unknown or under:
        return Conclusion("UNRESOLVED", "statements exist but their conditions are not supplied, or the query "
                          "does not fix every condition they depend on", "quantity", unknown + under,
                          ["R-COND", "R-GAP"], details={"conditions_unknown": unknown, "query_underspecified": under})
    return Conclusion("NOT_ESTABLISHED", "query conditions lie outside every stated condition; no rule licenses "
                      "inter- or extrapolation", "quantity", outside, ["R-COND"],
                      details={"stated_conditions": {i: kb.by_id[i].conditions for i in outside}})


def derive(kb, subject, unit, exclude_quantities=()):
    dim = UNIT_DIMENSION.get(unit)
    if dim is None:
        return Conclusion("UNRESOLVED", f"unit '{unit}' has no known dimension; nothing can be concluded",
                          "derivation", [], ["R-DIM"])
    pool = [s for s in kb.statements if s.subject == subject and s.kind == "quantity"
            and s.quantity not in exclude_quantities]
    same = [s.id for s in pool if UNIT_DIMENSION.get(s.unit) == dim]
    if same:
        return Conclusion("SUPPORTED", f"input statements already carry dimension {dim}", "derivation", same,
                          ["R-DIM", "R-PROV"])
    avail = sorted({UNIT_DIMENSION.get(s.unit, "unknown") for s in pool})
    return Conclusion("NOT_ESTABLISHED", f"no input of dimension {dim}; available dimensions {avail}; no registered "
                      "derivation", "derivation", [s.id for s in pool], ["R-DIM"])


def performance_in_mode(kb, subject, quantity, mode):
    meas = [s.id for s in _q(kb, subject, quantity) if s.conditions.get("mode") == mode]
    if meas:
        approx = any(kb.by_id[i].approximate for i in meas)
        return Conclusion("SUPPORTED", f"'{quantity}' stated for mode '{mode}'" + (" (approximate)" if approx else ""),
                          "quantity", meas, ["R-SAME", "R-PROV"])
    funcs = [s.id for s in kb.statements if s.subject == subject and s.kind == "function"
             and s.conditions.get("mode") == mode]
    gaps = [s.id for s in kb.statements if s.subject == subject and s.kind == "gap" and s.quantity == quantity
            and s.conditions.get("mode") == mode]
    note = "function present but a function does not establish performance; " if funcs else ""
    note += "explicit gap in source; " if gaps else "no statement; "
    return Conclusion("UNRESOLVED", note + "neither established nor negated", "quantity", funcs + gaps,
                      ["R-FUNC", "R-GAP"])


def same_condition(kb, a, b):
    sa, sb = kb.by_id[a], kb.by_id[b]
    if sa.subject != sb.subject:
        return Conclusion("REFUSED", "different tested objects", "comparison", [a, b], ["R-SAME"])
    if not sa.conditions or not sb.conditions:
        return Conclusion("UNRESOLVED", "conditions not supplied for at least one item", "comparison", [a, b],
                          ["R-SAME", "R-GAP"])
    keys = set(sa.conditions) | set(sb.conditions)
    diff = sorted(k for k in keys if k in sa.conditions and k in sb.conditions and sa.conditions[k] != sb.conditions[k])
    if diff:
        return Conclusion("REFUSED", f"conditions differ on {diff}", "comparison", [a, b], ["R-SAME"],
                          details={"differing": diff})
    missing = sorted(k for k in keys if (k in sa.conditions) != (k in sb.conditions))
    if missing:
        return Conclusion("UNRESOLVED", f"condition keys {missing} declared for only one item", "comparison",
                          [a, b], ["R-SAME", "R-GAP"])
    return Conclusion("SUPPORTED", "same declared conditions and object", "comparison", [a, b], ["R-SAME"])


def compare_values(kb, a, b):
    sa, sb = kb.by_id[a], kb.by_id[b]
    if sa.kind != "quantity" or sb.kind != "quantity" or sa.quantity != sb.quantity:
        return Conclusion("REFUSED", "not two statements of the same quantity", "comparison", [a, b], ["R-DIM"])
    if UNIT_DIMENSION.get(sa.unit) is None or UNIT_DIMENSION.get(sa.unit) != UNIT_DIMENSION.get(sb.unit):
        return Conclusion("REFUSED", "dimensions unknown or different", "comparison", [a, b], ["R-DIM"])
    sc = same_condition(kb, a, b)
    if sc.status != "SUPPORTED":
        return Conclusion("REFUSED" if sc.status == "REFUSED" else "UNRESOLVED",
                          "values not comparable as the same condition: " + sc.claim, "comparison", [a, b],
                          ["R-DIM"] + sc.rules)
    return Conclusion("SUPPORTED", f"{sa.value} vs {sb.value} {sa.unit} under the same conditions", "comparison",
                      [a, b], ["R-DIM", "R-SAME"])


def causal_effect(kb, subject, quantity, variable):
    cands = [s for s in _q(kb, subject, quantity) if variable in s.conditions]
    pairs = [(x, y) for x, y in combinations(cands, 2) if x.conditions[variable] != y.conditions[variable]]
    if not pairs:
        return Conclusion("UNRESOLVED", f"no contrast in '{variable}'", "causal", [s.id for s in cands],
                          ["R-CAUSAL"], details={"isolated_contrast": False})
    isolated = [(x, y) for x, y in pairs if set(x.conditions) == set(y.conditions)
                and all(x.conditions[k] == y.conditions[k] for k in x.conditions if k != variable)]
    confounders = sorted({k for x, y in pairs for k in set(x.conditions) | set(y.conditions)
                          if k != variable and x.conditions.get(k) != y.conditions.get(k)})
    grounds = sorted({s.id for p in pairs for s in p})
    interv = [p for p in isolated if all(s.method == "intervention" for s in p)]
    if interv:
        return Conclusion("SUPPORTED", f"isolated interventional contrast in '{variable}'", "causal", grounds,
                          ["R-CAUSAL"], details={"isolated_contrast": True})
    why = ("contrast isolates the variable but the values are not interventional (association only)" if isolated
           else f"every contrast also varies {confounders}")
    return Conclusion("UNRESOLVED", why, "causal", grounds, ["R-CAUSAL"],
                      details={"isolated_contrast": bool(isolated), "confounders": confounders})


EVAL_PARAMS = ("item", "criterion", "level", "goal", "holder", "conditions", "comparator")


def evaluation_status(kb, subject):
    out = []
    for s in kb.statements:
        if s.subject == subject and s.kind == "evaluation":
            params = dict(s.attributes, holder=s.holder, item=s.subject, conditions=s.conditions or None)
            missing = [p for p in EVAL_PARAMS if not params.get(p)]
            out.append(Conclusion("SUPPORTED", f"{s.holder} judged '{s.attributes.get('predicate')}' "
                                  f"({'incomplete' if missing else 'complete'} evaluative content; not a measurement)",
                                  "evaluation", [s.id], ["R-EVAL", "R-PROV"], details={"missing": missing}))
    return out
