"""Acquisition of predefined material into the store, and an importer for the s1core examples.

Every item enters by ``Store.acquire`` with its provenance (attribution before adoption, S0 6.1). Situation data
become entities, relation contents, situated given contents and an Inquiry with its Question.
"""
import json
import pathlib

from . import model
from .store import Item

MATERIAL = "material"


def _validate(store, item):
    if item.kind in ("model", "quantity_kind") or (item.kind == "content" and item.body.get("form") == "quantity"
                                                    and item.situating.get("situation") is None):
        model.validate(store, item)


def load_material(path, store, skip=()):
    with open(path) as f:
        data = json.load(f)
    for k in data["knowledge"]:
        if k["id"] not in skip:
            store.acquire(Item(k["id"], k["kind"], k["body"], k["provenance"], k.get("situating", {})),
                          validate=_validate)
    prov = {"source": "MS0 sealed material (situation datum)", "holder": "developer", "basis": "illustrative"}
    sits = {s["id"]: s for s in data["situations"]}
    for s in data["situations"]:
        for eid, e in s["entities"].items():
            store.acquire(Item(eid, "entity", {"label": e["label"]}, prov))
            for n, (rel, target) in enumerate(e["links"]):
                store.acquire(Item(f"{eid}:link{n}", "content",
                                   {"form": "relation", "relation": rel, "subject": eid, "object": target}, prov))
    for case in data["cases"]:
        s = sits[case["situation"]]
        ask = dict(case["ask"])
        q = {"role": ask.pop("role")}
        if "presuppose" in ask:
            q["presuppositions"] = ask.pop("presuppose")
        q.update(ask)
        store.acquire(Item(f"Q:{case['id']}", "question", q, prov))
        iid = f"I:{case['id']}"
        store.acquire(Item(iid, "inquiry", {"question": f"Q:{case['id']}", "roles": s["roles"],
                                            "conditions": s.get("conditions", {}), "scope_assumptions": []}, prov))
        for n, (bearer, kind, lo, hi, unit) in enumerate(s.get("givens", ())):
            store.acquire(Item(f"{iid}:given{n}", "content",
                               {"form": "quantity", "bearer": bearer, "kind": kind, "lo": lo, "hi": hi, "unit": unit,
                                "conditions": {}, "scope": "invariant", "invariance": "datum of this situation",
                                "holds_of": "individual"}, prov, {"situation": iid}))
    return data


# --- importer for the s1core examples (preservation check) -----------------------------------------------------

S1_RELATIONS = {
    "instance_of": {"label": "instance of", "transfers": ["material", "kind"]},
    "subkind_of": {"label": "subkind of", "transfers": ["material", "kind"]},
    "made_of": {"label": "consists wholly of", "transfers": ["material"], "max_per_chain": 1, "sole": True},
}


def import_s1core(store, kb, situations, queries):
    """Re-express s1core knowledge and situations as shared items. Returns {query: inquiry id}."""
    from s1core import knowledge as K

    def prov(it, basis=None):
        return {"source": getattr(it, "source", "") or "s1core example", "holder": "s1core examples",
                "basis": basis or getattr(it, "basis", None) or "definition"}

    for rid, sem in S1_RELATIONS.items():
        store.acquire(Item(f"R:{rid}", "relation_concept", sem, {"source": "s1core link semantics",
                                                                   "holder": "developer", "basis": "definition"}))
    for it in kb.items.values():
        if isinstance(it, K.QuantityKind):
            store.acquire(Item(it.id, "quantity_kind", {"dims": list(it.dims), "intensive": it.intensive}, prov(it)))
    for it in kb.items.values():
        if isinstance(it, K.Model):
            store.acquire(Item(it.id, "model", {
                "name": it.name, "variables": {s: list(v) for s, v in it.variables.items()}, "forms": dict(it.forms),
                "requirements": [[r.role, r.name, r.value] for r in it.requirements],
                "conditions": [[c.expr, c.op, c.lo, c.hi, c.note] for c in it.conditions],
                "generality": it.generality}, prov(it)), validate=_validate)
        elif isinstance(it, K.SingleValued):
            store.acquire(Item(it.name, "concept", {"label": it.name, "category": "determinable",
                                                    "single_valued": True}, prov(it, "definition")))
        elif isinstance(it, K.Value):
            store.acquire(Item(it.id, "content", {
                "form": "quantity", "bearer": it.bearer, "kind": it.kind, "lo": it.lo, "hi": it.hi, "unit": it.unit,
                "conditions": {k: list(v) if isinstance(v, tuple) else v for k, v in it.conditions.items()},
                "scope": it.scope, "holds_of": it.holds_of, "invariance": it.invariance}, prov(it)), validate=_validate)
        elif isinstance(it, K.Attribute):
            store.acquire(Item(it.id, "content", {
                "form": "attribute", "bearer": it.bearer, "name": it.name, "value": it.value,
                "conditions": dict(it.conditions), "scope": it.scope, "holds_of": it.holds_of,
                "invariance": it.invariance}, prov(it)))
        elif isinstance(it, K.Link):
            store.acquire(Item(it.id, "content", {"form": "relation", "relation": f"R:{it.relation}",
                                                  "subject": it.entity, "object": it.target}, prov(it)))
    out = {}
    for n, (sid, role, kind) in enumerate(queries):
        s = situations[sid]
        iid = f"I:s1:{n}"
        store.acquire(Item(f"Q:s1:{n}", "question", {"role": role, "kind": kind}, prov(None, "definition")))
        store.acquire(Item(iid, "inquiry", {"question": f"Q:s1:{n}", "roles": dict(s.roles),
                                            "conditions": {k: list(v) if isinstance(v, tuple) else v
                                                           for k, v in (s.conditions or {}).items()},
                                            "scope_assumptions": list(s.scope_assumptions)}, prov(None, "definition")))
        for g in s.givens:
            store.acquire(Item(f"{iid}:{g.id}", "content", {
                "form": "quantity", "bearer": g.bearer, "kind": g.kind, "lo": g.lo, "hi": g.hi, "unit": g.unit,
                "conditions": {}, "scope": "invariant", "invariance": "datum of this situation",
                "holds_of": "individual"}, prov(g), {"situation": iid}))
        for a in s.assumptions:
            store.acquire(Item(f"{iid}:{a.id}", "content", {
                "form": "attribute", "bearer": a.bearer, "name": a.name, "value": a.value, "conditions": {},
                "scope": "invariant", "holds_of": "individual", "invariance": "holds within this situation"},
                prov(a, "assumption"), {"situation": iid}))
        out[(sid, role, kind)] = iid
    return out


# --- general universe knowledge (I-1) ------------------------------------------------------------------------------

KNOWLEDGE = pathlib.Path(__file__).resolve().parent.parent / "knowledge"
I1_KINDS = (("method", "I-1: a method or procedure of measurement or testing (S0 D16)"),
            ("ambiguity", "I-1: one ambiguous reading with its alternative candidate contents (S0 3.6.4)"))


def load_general_knowledge(store, legacy=True):
    """Register the I-1 kinds (recorded registry events) and acquire the general knowledge items: quantity kinds with
    dimensions and lexical anchors, condition and method concepts, evidence classes, models, and the English lexical
    frame. ``legacy`` also loads the category items the developer entered by hand for I-2 (F-1 moved them to their own
    file); F-1 experiments load the transversal base alone."""
    from s1core import units
    for name, reason in I1_KINDS:
        if name not in store._kinds:
            store.register_kind(name, reason)
    files = ["general.json"] + (["legacy-i2-category.json"] if legacy else [])
    for fname in files:
        gen = json.loads((KNOWLEDGE / fname).read_text())
        for it in gen["items"]:
            if store.has(it["id"]):
                continue
            body = {k: v for k, v in it.items() if k not in ("id", "kind")}
            if it["kind"] == "quantity_kind":
                body["dims"] = list(units.dim(**it["dims"]))
                body.setdefault("intensive", False)
            store.acquire(Item(it["id"], it["kind"], body, gen["provenance"]), validate=_validate)
    lang = json.loads((KNOWLEDGE / "language.json").read_text())
    if not store.has("L:en"):
        store.acquire(Item("L:en", "concept", dict(lang, category="lexical frame"),
                           {"source": "English usage", "holder": "developer", "basis": "definition"}))
