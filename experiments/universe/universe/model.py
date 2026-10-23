"""Model service: numerical model-based inference (plan C-IN; S0 5.7 model-based), the s1core engine behind the
shared contract.

For each inquiry the adapter builds a transient s1core projection from the shared items and discards it afterwards;
it keeps no store of its own (plan I11). Only items borne by the inquiry's own entities are projected, so the
relation semantics are applied once, by the rule service, and never re-implemented here. Its conclusions return to
the store as proposals.
"""
from s1core import infer as s1infer
from s1core import knowledge as K
from s1core import units

from .store import thaw

_BASIS = {"derived": "hypothesis"}


def _t(v):
    return tuple(v) if isinstance(v, (list, tuple)) else v


def _conds(d):
    return {k: _t(v) for k, v in thaw(d or {}).items()}


def _kind(i):
    return K.QuantityKind(i.id, units.pad(i.body["dims"]), bool(i.body["intensive"]),
                          source=i.provenance["source"])


def _model(i):
    b = thaw(i.body)
    return K.Model(i.id, b["name"], {s: tuple(v) for s, v in b["variables"].items()}, b["forms"],
                   tuple(K.Requirement(*r) for r in b.get("requirements", ())),
                   tuple(K.DomainCondition(*c) for c in b.get("conditions", ())),
                   b.get("generality", "idealised law"), source=i.provenance["source"],
                   basis=_BASIS.get(i.provenance["basis"], i.provenance["basis"]))


def validate(store, item):
    """Acquisition-time validation of models and quantity contents, using the s1core checks."""
    kinds = [_kind(k) for k in store.of("quantity_kind")]
    kb = K.KB(kinds)
    if item.kind == "quantity_kind":
        _kind(item)
    elif item.kind == "model":
        kb.add(_model(item))
    elif item.kind == "content" and item.body.get("form") == "quantity":
        kb.add(_value(item, holds=None))


def _scope_fields(c):
    b = c.body
    scope = b.get("scope", "invariant")
    inv = b.get("invariance") or (f"carried from {b['inherited_from']}" if b.get("inherited_from") else
                                  "datum of this situation")
    return _conds(b.get("conditions")), scope, ("" if scope != "invariant" else inv)


def _value(c, holds="individual"):
    conds, scope, inv = _scope_fields(c)
    b = c.body
    return K.Value(c.id, b["bearer"], b["kind"], b["lo"], b["hi"], b["unit"], conds, scope,
                   b.get("holds_of") if holds is None else holds, invariance=inv,
                   source=c.provenance["source"], basis=_BASIS.get(c.provenance["basis"], c.provenance["basis"]))


def _attr(c):
    conds, scope, inv = _scope_fields(c)
    b = c.body
    return K.Attribute(c.id, b["bearer"], b["name"], b["value"], conds, scope, "individual", invariance=inv,
                       source=c.provenance["source"], basis=_BASIS.get(c.provenance["basis"], c.provenance["basis"]))


def required_keys(store):
    """Every quantity kind and categorical attribute any model may need."""
    keys = set()
    for m in store.of("model"):
        for _, kind in m.body["variables"].values():
            keys.add(("quantity", kind))
        for _, name, _ in m.body.get("requirements", ()):
            keys.add(("attribute", name))
    return sorted(keys)


def project(store, inquiry):
    """Transient s1core knowledge base and situation for one inquiry."""
    entities = set(inquiry.body["roles"].values())
    items = [_kind(k) for k in store.of("quantity_kind")]
    items += [_model(m) for m in store.of("model")]
    items += [K.SingleValued(f"SV:{c.id}", c.id, source=c.provenance["source"])
              for c in store.of("concept") if c.body.get("single_valued")]
    givens, assumptions = [], []
    for c in store.of("content"):
        b = c.body
        if b.get("bearer") not in entities or b.get("form") not in ("quantity", "attribute"):
            continue
        if b.get("incomplete") or b.get("alternative_of") or (b.get("form") == "quantity" and (
                b.get("lo") is None or b.get("hi") is None or b.get("extent"))):
            continue  # an incomplete, ambiguous, open or extent-end content is not a model input
        sit = c.situating.get("situation")
        if sit not in (None, inquiry.id):
            continue
        if b["form"] == "quantity":
            v = _value(c)
            (givens if sit == inquiry.id and c.provenance["basis"] != "derived" else items).append(v)
        elif c.provenance["basis"] == "assumption":
            assumptions.append(_attr(c))
        else:
            items.append(_attr(c))
    kb = K.KB(items)
    sit = K.Situation(inquiry.id, thaw(inquiry.body["roles"]), _conds(inquiry.body.get("conditions")),
                      tuple(givens), tuple(assumptions), tuple(inquiry.body.get("scope_assumptions", ())))
    return kb, sit


def _si_unit(dims):
    for u, (f, off, d) in units.UNITS.items():
        if f == 1.0 and off == 0.0 and units.same_dims(d, dims):
            return u
    return None


def run(store, inquiry, role, kind):
    """Run s1core on the projection. Returns (outcome, proposal body or None, grounds)."""
    kb, sit = project(store, inquiry)
    o = s1infer.infer(kb, sit, role, kind)
    grounds = sorted(g[3:] if g.startswith("SV:") else g for g in o.grounds)
    body = None
    if o.status == "SUPPORTED":
        unit = _si_unit(kb.kinds()[kind].dims)
        if unit is not None:
            body = {"form": "quantity", "bearer": sit.roles[role], "kind": kind, "lo": o.interval.lo,
                    "hi": o.interval.hi, "unit": unit, "conditions": {}, "scope": "invariant",
                    "invariance": f"holds in the situation of {inquiry.id}", "holds_of": "individual"}
    return o, body, grounds
