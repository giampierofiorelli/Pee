"""Dependencies between items (I-2; S0 5.9 grounds, 6.3 propagation, 4.3 situations, 4.6 conditions).

Shared by the rule service, the model service and the contract, so that no service depends on another:

* ``retract`` records a holder's retraction of an item as a standing event (nothing is deleted);
* ``current`` says whether an item still stands: not retracted, and every ground it rests on current;
* ``situation_conditions`` gives an inquiry's conditions together with the quantities it assumes (its givens), keyed
  by their kind, so that a content holding under an assumed usage is conditional on it (an indicative content).
"""
from .store import Item, thaw


def retract(store, item_id, holder, reason):
    """Record that ``holder`` retracts ``item_id`` (attitude "retracted"). Everything resting on it stops being
    current; nothing is deleted, and the log keeps what was held before."""
    return store.acquire(Item(f"RT:{item_id}", "standing", {"of": item_id, "attitude": "retracted", "holder": holder,
                                                            "reason": reason},
                              {"source": reason, "holder": holder, "basis": "correction"}), "retraction")


def retracted(store, item_id):
    return store.has(f"RT:{item_id}")


def current(store, item_id, _memo=None):
    """True when the item is not retracted and every ground it rests on is current (propagation of retraction)."""
    memo = {} if _memo is None else _memo
    if item_id in memo:
        return memo[item_id]
    memo[item_id] = True  # a cycle never makes an item non-current by itself
    if not store.has(item_id):
        memo[item_id] = True
        return True
    ok = not retracted(store, item_id)
    it = store.get(item_id)
    if ok and it.kind == "inference_record":
        ok = all(current(store, g, memo) for g in it.body["premises"])
    elif ok and it.provenance.get("basis") == "derived" and store.has(f"ST:{item_id}"):
        ok = all(current(store, g, memo) for g in store.get(f"ST:{item_id}").body["grounds"])
    memo[item_id] = ok
    return ok


def situation_conditions(store, inquiry):
    """The inquiry's conditions, with the quantities it assumes (its givens) as conditions keyed by their kind: a
    content that holds under an assumed usage (a stated duration) is conditional on it (S0 4.6 indicative)."""
    conds = {k: tuple(v) if isinstance(v, (list, tuple)) else v for k, v in thaw(inquiry.body.get("conditions", {})).items()}
    if store is not None:
        for c in store.of("content"):
            if c.situating.get("situation") == inquiry.id and c.provenance.get("basis") == "assumption" \
                    and c.body.get("form") == "quantity" and c.body.get("lo") is not None:
                conds.setdefault(c.body["kind"], (c.body["lo"], c.body["hi"], c.body["unit"]))
    return conds
