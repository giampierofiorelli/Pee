"""Standing of a proposal from its premises (MS1 contract, plan section 5): the bases of every non-derived premise
reachable through standings and inference records, and a label never stronger than the weakest of them. Shared by
every service that proposes items (rules, model, acquisition), so no proposing service depends on another."""

_RANK = ["definition", "published reference", "measurement record", "manufacturer statement", "document statement",
         "assumption", "hypothesis", "illustrative"]  # later = weaker


def premise_bases(store, grounds, seen=None):
    """Bases of every non-derived premise reachable from ``grounds`` through standings and inference records."""
    seen = set() if seen is None else seen
    out = []
    for g in grounds:
        if g in seen or not store.has(g):
            continue
        seen.add(g)
        it = store.get(g)
        if it.kind == "inference_record":
            out += premise_bases(store, it.body["premises"], seen)
        elif it.provenance["basis"] == "derived":
            st = f"ST:{g}"
            if store.has(st):
                out += premise_bases(store, store.get(st).body["grounds"], seen)
        elif it.provenance["basis"] == "stated requirement":
            continue  # a requirement is what is evaluated, never an epistemic ground (S1 plan I5)
        else:
            out.append(it.provenance["basis"])
    return out


def label(store, grounds):
    bases = premise_bases(store, grounds)
    if not bases:
        return "no recorded premises"
    weakest = max(bases, key=_RANK.index)
    return {"illustrative": "illustrative only", "hypothesis": "hypothetical", "assumption": "conditional on assumptions",
            "definition": "derived from definitions"}.get(weakest, "derived from attributed, unverified sources")
