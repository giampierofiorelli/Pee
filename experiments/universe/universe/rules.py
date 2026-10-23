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
    if b.get("incomplete"):
        return False, f"{content.id}: incomplete ({'; '.join(b['incomplete'])})"
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


def _interval(c):
    """A content's interval in coherent SI units; an open bound is infinite."""
    b = c.body
    lo = b["lo"] if b.get("lo") is not None else b["hi"]
    hi = b["hi"] if b.get("hi") is not None else b["lo"]
    lo_si, hi_si = units.to_si(lo, hi, b["unit"])
    return (-float("inf") if b.get("lo") is None else lo_si), (float("inf") if b.get("hi") is None else hi_si)


def _tolerance(store):
    """Relative width an approximate value may have (lexical-metrological knowledge of the universe)."""
    lang = store.get("L:en").body if store.has("L:en") else {}
    return float(lang.get("approximate_relative", 0.05))


def _reference_ok(content_unit, wanted_unit):
    """Level scales compare only under the same reference; an unspecified wanted reference accepts any."""
    if units.SCALE.get(content_unit) != "level" and units.SCALE.get(wanted_unit) != "level":
        return True
    want = units.REFERENCE.get(wanted_unit)
    return want is None or want == units.REFERENCE.get(content_unit)


def _verdict(iv, op, b):
    lo, hi = iv
    holds = {"<": hi < b, "<=": hi <= b, ">": lo > b, ">=": lo >= b}[op]
    fails = {"<": lo >= b, "<=": lo > b, ">": hi <= b, ">=": hi < b}[op]
    return "applies" if holds else "does not apply" if fails else "undetermined"


def usable(store, inquiry, entity, kind, end=None, unit=None):
    """Applicable contents of the entity's quantity of this kind, for the asked extent end (None: the value itself),
    whose scale reference fits. Returns (contents, notes)."""
    vals, notes = [], []
    for c in _local(store, inquiry, entity, ("quantity", kind)):
        ok, why = applicable(c, inquiry)
        if not ok:
            notes.append(why)
            continue
        if c.body.get("extent") != end:
            notes.append(f"{c.id}: states the {c.body.get('extent') or 'value'}, not the {end or 'value'}")
            continue
        if unit is not None and not _reference_ok(c.body["unit"], unit):
            notes.append(f"{c.id}: scale reference differs ({c.body['unit']} against {unit})")
            continue
        vals.append(c)
    return vals, notes


def _decide_over(store, vals, op, b):
    """One verdict over applicable contents. Alternatives of one ambiguous reading must agree (S0 3.6.4); approximate
    values must decide beyond their tolerance; different contents that disagree leave the question undetermined."""
    tol = _tolerance(store)
    groups = {}
    for c in vals:
        groups.setdefault(c.body.get("alternative_of") or c.id, []).append(c)
    verdicts, notes = [], []
    for g, cs in groups.items():
        vs = set()
        for c in cs:
            lo, hi = _interval(c)
            if c.body.get("approximate"):
                lo, hi = lo - tol * abs(lo), hi + tol * abs(hi)
            vs.add(_verdict((lo, hi), op, b))
        if len(vs) > 1:
            notes.append(f"{g}: the verdict depends on the reading ({', '.join(sorted(vs))})")
            verdicts.append("undetermined")
        else:
            verdicts.append(vs.pop())
    if len(set(verdicts)) == 1:
        return verdicts[0], notes
    return "undetermined", notes + ["applicable contents disagree"]


def classify(store, inquiry, entity, class_id):
    """Apply a class definition with a quantitative bound. Returns (verdict, grounds, need kind or None, note)."""
    defs = [c for c in store.of("content") if c.body.get("form") == "class_definition" and c.body["class"] == class_id]
    if len(defs) != 1:
        return "undetermined", [], None, f"{len(defs)} definitions of {class_id}"
    d = defs[0].body
    if d["op"] not in BOUND_OPS:
        return "undetermined", [defs[0].id], None, f"unsupported operator {d['op']}"
    vals, notes = usable(store, inquiry, entity, d["kind"], d.get("end"), d["unit"])
    if not vals:
        return "undetermined", [defs[0].id], d["kind"], "; ".join([f"no applicable {d['kind']} of {entity} yet"] + notes)
    b = units.to_si(d["bound"], d["bound"], d["unit"])[0]
    verdict, why = _decide_over(store, vals, d["op"], b)
    note = f"{d['kind']} of {entity} against {d['op']} {b:.4g} (SI) over {len(vals)} content(s)"
    if why:
        note += "; " + "; ".join(why)
    if verdict == "does not apply":
        note += " (restricted negation within the definition's domain, S0 N3)"
    return verdict, [defs[0].id] + [c.id for c in vals], None, note


def compare(store, inquiry, entities, kind, end=None):
    """Compare one quantity of two entities under the inquiry's situation. Comparable only if the applicable contents
    of both state the same conditions (S0 4.6, 5.8 relevance). Returns (relation or None, grounds, note); relation is
    'less', 'greater' or 'equal' for the first entity against the second."""
    a, na = usable(store, inquiry, entities[0], kind, end)
    b, nb = usable(store, inquiry, entities[1], kind, end)
    if not a or not b:
        return None, [], "; ".join(["a quantity is missing for one entity"] + na + nb)
    conds = {tuple(sorted((k, str(v)) for k, v in thaw(c.body.get("conditions") or {}).items())) for c in a + b}
    if len(conds) != 1:
        return None, [], "the contents state different conditions; not comparable"
    if any(c.body.get("alternative_of") for c in a + b):
        return None, [], "a reading is ambiguous"
    ia = (min(_interval(c)[0] for c in a), max(_interval(c)[1] for c in a))
    ib = (min(_interval(c)[0] for c in b), max(_interval(c)[1] for c in b))
    if ia[1] < ib[0]:
        rel = "less"
    elif ib[1] < ia[0]:
        rel = "greater"
    elif ia[0] == ia[1] == ib[0] == ib[1]:
        rel = "equal"
    else:
        return None, [], "intervals overlap"
    return rel, [c.id for c in a + b], f"{kind}: {entities[0]} {rel} than {entities[1]} under the same conditions"
