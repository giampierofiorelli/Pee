"""Rule service: non-numerical deductive inference over relation concepts (plan C-IN; S0 5.7 deductive).

Relation semantics are knowledge, not code. Each relation concept declares which kinds of property it transfers
(``transfers``), how often it may occur in one chain (``max_per_chain``) and whether its subject must have a single
such link (``sole``). The service uses those declarations to:

* pass properties of kinds and materials to the entities of an inquiry, choosing the most specific applicable
  level, as a scope hypothesis (6.4);
* answer attribute questions;
* classify an entity by a class definition with a quantitative bound (a definitional content, G4);
* check the presuppositions of a question (7.2).

Condition matching is shared with the model service: it reuses the s1core matching function rather than
re-implementing it (plan I11, I15).
"""
from s1core import units
from s1core.infer import _match

from .store import thaw

BOUND_OPS = ("<", "<=", ">", ">=")


def _semantics(store):
    return {r.id: r.body for r in store.of("relation_concept")}


def _relations(store):
    return sorted((c for c in store.of("content") if c.body.get("form") == "relation"), key=lambda c: c.id)


def lineage(store, entity):
    """Every ancestor with every simple chain of relation contents reaching it, shortest first."""
    rels = _relations(store)
    chains = {entity: [()]}

    def walk(e, chain, seen):
        for c in rels:
            if c.body["subject"] == e and c.body["object"] not in seen:
                nxt = chain + (c.id,)
                chains.setdefault(c.body["object"], []).append(nxt)
                walk(c.body["object"], nxt, seen | {c.body["object"]})
    walk(entity, (), {entity})
    return {a: sorted(cs, key=lambda c: (len(c), c)) for a, cs in chains.items()}


def passes(store, holds_of, chain):
    """May a property described as ``holds_of`` pass along ``chain``? Returns (bool, reason)."""
    if not chain:
        return True, ""
    if holds_of in ("individual", "population"):
        return False, f"a {holds_of} property does not pass to other entities"
    sem = _semantics(store)
    counts = {}
    for cid in chain:
        c = store.get(cid)
        r = sem.get(c.body["relation"])
        if r is None:
            return False, f"{c.body['relation']} has no declared semantics"
        if holds_of not in r.get("transfers", ()):
            return False, f"{c.body['relation']} does not transfer {holds_of} properties"
        counts[c.body["relation"]] = counts.get(c.body["relation"], 0) + 1
        if r.get("max_per_chain") and counts[c.body["relation"]] > r["max_per_chain"]:
            return False, f"{c.body['relation']} may occur at most {r['max_per_chain']} time(s) in a chain"
        if r.get("sole"):
            n = sum(1 for x in _relations(store) if x.body["subject"] == c.body["subject"]
                    and x.body["relation"] == c.body["relation"])
            if n > 1:
                return False, f"{c.body['subject']} has {n} {c.body['relation']} links (a composite)"
    return True, ""


class _Sit:
    def __init__(self, inquiry):
        self.conditions = {k: tuple(v) if isinstance(v, (list, tuple)) else v
                           for k, v in thaw(inquiry.body.get("conditions", {})).items()}


def applicable(content, inquiry):
    """Scope of a content against the inquiry's situation: (bool, reason)."""
    b = content.body
    if b.get("scope") == "invariant":
        return True, ""
    if b.get("scope") == "unknown":
        ok = content.id in inquiry.body.get("scope_assumptions", ())
        return ok, "" if ok else f"{content.id}: conditions of validity unknown"
    conds = {k: tuple(v) if isinstance(v, (list, tuple)) else v for k, v in thaw(b.get("conditions", {})).items()}
    missing, mismatch = _match(conds, _Sit(inquiry))
    if missing or mismatch:
        return False, f"{content.id}: " + "; ".join([f"situation does not state {m}" for m in missing] + mismatch)
    return True, ""


def _key(c):
    b = c.body
    return ("quantity", b["kind"]) if b.get("form") == "quantity" else ("attribute", b["name"])


def _local(store, inquiry, entity, key):
    """Contents borne directly by the entity: general ones, and those situated in this inquiry."""
    out = []
    for c in store.of("content"):
        if c.body.get("bearer") != entity or c.body.get("form") not in ("quantity", "attribute") or _key(c) != key:
            continue
        sit = c.situating.get("situation")
        if sit in (None, inquiry.id):
            out.append(c)
    return out


def inherited(store, inquiry, entity, key):
    """Most specific applicable inherited contents for ``key``. Returns (chosen, barred notes, applicable flag)."""
    by_depth, barred = {}, []
    for anc, chains in lineage(store, entity).items():
        if anc == entity:
            continue
        for c in store.of("content"):
            if c.body.get("bearer") != anc or c.body.get("form") not in ("quantity", "attribute") or _key(c) != key:
                continue
            route = next((ch for ch in chains if passes(store, c.body.get("holds_of"), ch)[0]), None)
            if route is None:
                barred.append(f"{c.id} not passed: " + "; ".join(passes(store, c.body.get('holds_of'), ch)[1]
                                                                 for ch in chains))
                continue
            by_depth.setdefault(len(route), []).append((c, route))
    for depth in sorted(by_depth):
        ok = [(c, r) for c, r in by_depth[depth] if applicable(c, inquiry)[0]]
        if ok:
            return ok, barred, True
    if by_depth:
        return by_depth[min(by_depth)], barred, False
    return [], barred, False


def supply(store, inquiry, entity, keys):
    """Propose entity-level contents inherited along licensed chains. Returns (proposal bodies with grounds, notes)."""
    proposals, notes = [], []
    for key in keys:
        if _local(store, inquiry, entity, key):
            continue  # a property of the entity itself overrides inherited generics
        chosen, barred, _ = inherited(store, inquiry, entity, key)
        notes += barred
        for c, route in chosen:
            body = dict(thaw(c.body), bearer=entity, holds_of="individual", inherited_from=c.id, via=list(route))
            body.pop("interprets", None)
            proposals.append((body, [c.id, *route]))
    return proposals, notes


def attribute(store, inquiry, entity, name):
    """Value of a categorical attribute of the entity under the inquiry's situation, with grounds, or None."""
    key = ("attribute", name)
    local = [c for c in _local(store, inquiry, entity, key) if applicable(c, inquiry)[0]]
    if local:
        return local[0].body["value"], [local[0].id], []
    chosen, barred, ok = inherited(store, inquiry, entity, key)
    if ok and len({c.body["value"] for c, _ in chosen}) == 1:
        c, route = chosen[0]
        return c.body["value"], [c.id, *route], barred
    return None, [], barred + [applicable(c, inquiry)[1] for c, _ in chosen]


def single_valued(store, name):
    return store.has(name) and store.get(name).body.get("single_valued", False)


def presuppositions(store, inquiry, entity, required):
    """Each presupposition (name, value): 'satisfied', 'violated' or 'unchecked', with grounds."""
    out = []
    for name, value in required:
        found, grounds, _ = attribute(store, inquiry, entity, name)
        if found == value:
            out.append((name, value, "satisfied", grounds))
        elif found is not None and single_valued(store, name):
            out.append((name, value, "violated", grounds + [name]))
        else:
            out.append((name, value, "unchecked", grounds))
    return out


def classify(store, inquiry, entity, class_id):
    """Apply a class definition with a quantitative bound. Returns (verdict, grounds, need kind or None, note)."""
    defs = [c for c in store.of("content") if c.body.get("form") == "class_definition" and c.body["class"] == class_id]
    if len(defs) != 1:
        return "undetermined", [], None, f"{len(defs)} definitions of {class_id}"
    d = defs[0].body
    if d["op"] not in BOUND_OPS:
        return "undetermined", [defs[0].id], None, f"unsupported operator {d['op']}"
    vals = [c for c in _local(store, inquiry, entity, ("quantity", d["kind"])) if applicable(c, inquiry)[0]]
    if not vals:
        return "undetermined", [defs[0].id], d["kind"], f"no {d['kind']} of {entity} yet"
    if len(vals) > 1:
        lo = min(units.to_si(c.body["lo"], c.body["hi"], c.body["unit"])[0] for c in vals)
        hi = max(units.to_si(c.body["lo"], c.body["hi"], c.body["unit"])[1] for c in vals)
    else:
        lo, hi = units.to_si(vals[0].body["lo"], vals[0].body["hi"], vals[0].body["unit"])
    b = units.to_si(d["bound"], d["bound"], d["unit"])[0]
    holds = {"<": hi < b, "<=": hi <= b, ">": lo > b, ">=": lo >= b}[d["op"]]
    fails = {"<": lo >= b, "<=": lo > b, ">": hi <= b, ">=": hi < b}[d["op"]]
    verdict = "applies" if holds else "does not apply" if fails else "undetermined"
    note = f"{d['kind']} in [{lo:.4g}, {hi:.4g}] against {d['op']} {b:.4g}"
    if verdict == "does not apply":
        note += " (restricted negation within the definition's domain, S0 N3)"
    return verdict, [defs[0].id] + [c.id for c in vals], None, note
