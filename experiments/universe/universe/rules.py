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

from .dependencies import current, situation_conditions
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
    def __init__(self, inquiry, store=None):
        self.conditions = situation_conditions(store, inquiry)


def applicable(content, inquiry, store=None):
    """Scope of a content against the inquiry's situation: (bool, reason)."""
    b = content.body
    if b.get("incomplete"):
        return False, f"{content.id}: incomplete ({'; '.join(b['incomplete'])})"
    if store is not None and not current(store, content.id):
        return False, f"{content.id}: no longer current (a ground was retracted)"
    sit = situation_conditions(store, inquiry)
    for k in sorted(b.get("unspecified") or {}):
        if k != "method" and k in sit:
            return False, f"{content.id}: its measurand leaves {k} unspecified; the situation states it"
    required = inquiry.body.get("requires_evidence")  # A-1: an evidence requirement of the question
    if required and store is not None and not satisfies_evidence(store, content, required):
        return False, f"{content.id}: its sources do not provide the required evidence ({required})"
    wanted = inquiry.body.get("methods")
    if wanted and not set(wanted) <= set(b.get("methods") or ()):
        return False, f"{content.id}: not measured by the method the question names"
    if b.get("scope") == "invariant":
        return True, ""
    if b.get("scope") == "unknown":
        ok = content.id in inquiry.body.get("scope_assumptions", ())
        return ok, "" if ok else f"{content.id}: conditions of validity unknown"
    conds = {k: tuple(v) if isinstance(v, (list, tuple)) else v for k, v in thaw(b.get("conditions", {})).items()}
    missing, mismatch = _match(conds, _Sit(inquiry, store))
    if missing or mismatch:
        return False, f"{content.id}: " + "; ".join([f"situation does not state {m}" for m in missing] + mismatch)
    return True, ""


def _key(c):
    b = c.body
    return ("quantity", b["kind"]) if b.get("form") == "quantity" else ("attribute", b["name"])


def identity_readings(store, inquiry, entity):
    """Referents the inquiry reads as the same thing as ``entity``: {referent: [reading item ids]}. A reading is an
    item the inquiry adopts (an assumption) that accepts one co-reference proposal (S0 D3, 3.6.4). Without a reading,
    referents of different documents are never the same thing."""
    out = {entity: []}
    reads = []
    for rid in inquiry.body.get("identity_readings", ()):
        if store.has(rid) and current(store, rid):
            co = store.get(store.get(rid).body["co_reference"])
            reads.append((rid, list(co.body["relata"])))
    changed = True
    while changed:
        changed = False
        for rid, (a, b) in reads:
            for x, y in ((a, b), (b, a)):
                if x in out and y not in out:
                    out[y] = out[x] + [rid]
                    changed = True
    return out


def _local(store, inquiry, entity, key, readings=None):
    """Contents borne by the entity (or by a referent the inquiry reads as the same thing): general ones, and those
    situated in this inquiry. ``readings`` collects the identity readings a returned content rests on."""
    bearers = identity_readings(store, inquiry, entity)
    out = []
    for c in store.of("content"):
        if c.body.get("bearer") not in bearers or c.body.get("form") not in ("quantity", "attribute") or _key(c) != key:
            continue
        sit = c.situating.get("situation")
        if sit in (None, inquiry.id):
            out.append(c)
            if readings is not None:
                for r in bearers[c.body["bearer"]]:
                    readings.setdefault(c.id, []).append(r)
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
        ok = [(c, r) for c, r in by_depth[depth] if applicable(c, inquiry, store)[0]]
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
    local = [c for c in _local(store, inquiry, entity, key) if applicable(c, inquiry, store)[0]]
    if local:
        return local[0].body["value"], [local[0].id], []
    chosen, barred, ok = inherited(store, inquiry, entity, key)
    if ok and len({c.body["value"] for c, _ in chosen}) == 1:
        c, route = chosen[0]
        return c.body["value"], [c.id, *route], barred
    return None, [], barred + [applicable(c, inquiry, store)[1] for c, _ in chosen]


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


def usable(store, inquiry, entity, kind, end=None, unit=None, readings=None):
    """Applicable contents of the entity's quantity of this kind, for the asked extent end (None: the value itself),
    whose scale reference fits. Returns (contents, notes); ``readings`` collects identity readings used."""
    vals, notes = [], []
    for c in _local(store, inquiry, entity, ("quantity", kind), readings):
        ok, why = applicable(c, inquiry, store)
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
    reused = lifted(store, inquiry, "classification", **{"class": class_id, "bearer": entity})
    if reused is not None:
        return reused.body["verdict"], [defs[0].id, reused.id], None, f"reused the lifted conclusion {reused.id} (S0 4.3)"
    readings = {}
    vals, notes = usable(store, inquiry, entity, d["kind"], d.get("end"), d["unit"], readings)
    if not vals:
        return "undetermined", [defs[0].id], d["kind"], "; ".join([f"no applicable {d['kind']} of {entity} yet"] + notes)
    b = units.to_si(d["bound"], d["bound"], d["unit"])[0]
    verdict, why = _decide_over(store, vals, d["op"], b)
    note = f"{d['kind']} of {entity} against {d['op']} {b:.4g} (SI) over {len(vals)} content(s)"
    if why:
        note += "; " + "; ".join(why)
    if readings:
        note += "; under the identity reading(s) " + ", ".join(sorted({r for rs in readings.values() for r in rs}))
    if verdict == "does not apply":
        note += " (restricted negation within the definition's domain, S0 N3)"
    rgrounds = sorted({r for c in vals for r in readings.get(c.id, ())})
    return verdict, [defs[0].id] + [c.id for c in vals] + rgrounds, None, note


def compare(store, inquiry, entities, kind, end=None):
    """Compare one quantity of two entities under the inquiry's situation. Comparable only if the applicable contents
    of both state the same conditions (S0 4.6, 5.8 relevance). Returns (relation or None, grounds, note); relation is
    'less', 'greater' or 'equal' for the first entity against the second."""
    inverse = {"less": "greater", "greater": "less", "equal": "equal"}
    for order, flip in ((list(entities), False), (list(entities)[::-1], True)):
        reused = lifted(store, inquiry, "comparison", kind=kind, bearers=order)
        if reused is not None:
            rel = inverse[reused.body["relation"]] if flip else reused.body["relation"]
            return rel, [reused.id], f"reused the lifted conclusion {reused.id} (S0 4.3)"
    readings = {}
    a, na = usable(store, inquiry, entities[0], kind, end, None, readings)
    b, nb = usable(store, inquiry, entities[1], kind, end, None, readings)
    if not a or not b:
        return None, [], "; ".join(["a quantity is missing for one entity"] + na + nb)
    # the same measurand: equal conditions, the same methods, and the same unspecified conditions within one
    # measuring series (an unstated condition is the same only within one table of one document)
    conds = {(tuple(sorted((k, str(v)) for k, v in thaw(c.body.get("conditions") or {}).items())),
              tuple(sorted(c.body.get("methods") or ())),
              tuple(sorted((k, v) for k, v in thaw(c.body.get("unspecified") or {}).items()))) for c in a + b}
    if len(conds) != 1:
        return None, [], "the contents differ in conditions, method or measuring series; not comparable"
    if any(c.body.get("alternative_of") for c in a + b):
        return None, [], "a reading is ambiguous"
    ia = (min(_interval(c)[0] for c in a), max(_interval(c)[1] for c in a))
    ib = (min(_interval(c)[0] for c in b), max(_interval(c)[1] for c in b))
    variation = any(c.body.get("interval") == "variation" for c in a + b)
    if ia[1] < ib[0]:
        rel = "less"
    elif ib[1] < ia[0]:
        rel = "greater"
    elif ia[0] == ia[1] == ib[0] == ib[1] and not variation:
        rel = "equal"
    else:
        return None, [], "intervals overlap"
    rgrounds = sorted({r for c in a + b for r in readings.get(c.id, ())})
    return rel, [c.id for c in a + b] + rgrounds, f"{kind}: {entities[0]} {rel} than {entities[1]} under the same conditions"


def lifted(store, inquiry, form, **match):
    """A current lifted conclusion of ``form`` that holds in this inquiry's situation: the same conditions (assumed
    quantities included), the same method requirement, and only identity readings the inquiry adopts (S0 4.3)."""
    sit = {k: list(v) if isinstance(v, tuple) else v for k, v in situation_conditions(store, inquiry).items()}
    mine = {store.get(r).body["co_reference"] for r in inquiry.body.get("identity_readings", ()) if store.has(r)}
    for c in store.of("content", form=form, lifted=True):
        b = thaw(c.body)
        if any(b.get(k) != v for k, v in match.items()):
            continue
        if b.get("conditions", {}) != sit or sorted(b.get("methods") or []) != sorted(inquiry.body.get("methods") or []):
            continue
        if not set(b.get("under_co_references") or []) <= mine:
            continue
        if current(store, c.id):
            return c
    return None


def part(store, inquiry, entity, part_kind):
    """The part of kind ``part_kind`` of the entity (or of a referent the inquiry reads as the same thing), through
    current ``part_of`` relation contents (S0 3.8). Returns (part referent or None, grounds, note)."""
    bearers = identity_readings(store, inquiry, entity)
    parthood = {r.id for r in store.of("relation_concept") if r.body.get("structural_role") == "parthood"}
    found = []
    for c in _relations(store):
        b = c.body
        if b["relation"] not in parthood or b["object"] not in bearers or not current(store, c.id):
            continue
        if store.has(b["subject"]) and store.get(b["subject"]).body.get("part_kind") == part_kind:
            found.append((b["subject"], [c.id] + bearers[b["object"]]))
    subjects = sorted({s for s, _ in found})
    if len(subjects) != 1:
        return None, [], f"{len(subjects)} parts of kind {part_kind} of {entity}"
    grounds = sorted({g for s, gs in found for g in gs})
    return subjects[0], grounds, f"{subjects[0]} is the {part_kind} of {entity}"


def select(store, inquiry, entities, kind, prefer, end=None):
    """Which entity has the lowest (or highest) quantity of ``kind`` under the inquiry's situation: the one that
    compares strictly better than every other (an order inference over pairwise comparisons, S0 5.7). Pairwise
    comparisons are taken from current lifted conclusions when they exist, so earlier inquiries are reused rather
    than recomputed. Returns (entity or None, grounds, note)."""
    better = {"lower": "less", "higher": "greater"}[prefer]
    for x in entities:
        grounds, ok = [], True
        for y in entities:
            if y == x:
                continue
            rel, g, _ = compare(store, inquiry, [x, y], kind, end)
            if rel != better:
                ok = False
                break
            grounds += g
        if ok:
            return x, sorted(set(grounds)), f"{x} has the {prefer} {kind} of {len(entities)} under the same conditions"
    return None, [], f"no entity has the {prefer} {kind} on the available comparisons"


# --- A-1: services over proposition contents (S0 5.5, 5.6, 5.7, 5.9; qualitative influence: Forbus, "Qualitative
# process theory", 1984) ---------------------------------------------------------------------------------------------
# Relation concepts are found by their structural role and sign (knowledge), never by identifier. A proposition
# licenses a conclusion only through an attribution whose holder asserts or reports it; a proposal, hypothesis or open
# question never does, and a claim the document states as not established supports an abstention.

LICENSING = ("asserted", "reported")


def relation_meta(store):
    return {r.id: {"role": r.body.get("structural_role"), "sign": r.body.get("sign"),
                   "designations": list(r.body.get("designations") or ())} for r in store.of("relation_concept")}


def relation_for(store, designation):
    """The relation concept a relation name designates, with the polarity it implies ("does_not_establish")."""
    neg = False
    d = designation
    if d.startswith("other"):
        d = "other"
    if d.startswith("does_not_"):
        d, neg = d[len("does_not_"):], True
        d = {"establish": "establishes", "measure": "measures", "apply_to": "applies_to"}.get(d, d)
    for rid, m in relation_meta(store).items():
        if d in m["designations"]:
            return rid, neg
    return None, neg


def attributions(store, pid):
    return [a for a in store.of("content", form="attribution", content=pid) if current(store, a.id)]


def attitudes(store, pid):
    return {a.body.get("attitude") for a in attributions(store, pid)}


def evidence_classes(store, pid):
    return {e for a in attributions(store, pid) for e in a.body.get("evidence_classes") or ()}


def propositions(store):
    return [p for p in store.of("content", form="proposition") if current(store, p.id)]


def _cond_terms(store, conds):
    out = {}
    for c in conds or ():
        cid = c.get("concept")
        out.setdefault(cid, set()).add(" ".join(str(c.get("value") or "").lower().split()))
    return out


def conditions_fit(store, prop, query):
    """(fits, caveat): a claim stated under conditions applies when the query's conditions do not contradict them.
    ``query`` maps concept ids to sets of value words. A condition the query does not state is a caveat."""
    pc = _cond_terms(store, prop.body.get("conditions"))
    caveats = []
    for cid, vals in pc.items():
        if cid in query:
            q = query[cid]
            if not any(a == b or a in b or b in a for a in vals for b in q):
                return False, f"{prop.id}: holds under {sorted(vals)} of {cid}; the question states {sorted(q)}"
        else:
            caveats.append(cid)
    return True, caveats


def _licensed(store, p):
    """A proposition licenses conclusions when the author asserts or reports it. T-1 (W4): not when an element it
    depends on is indeterminate or uncertain (S0 3.6), nor when it states an illustrative case."""
    if not (attitudes(store, p.id) & set(LICENSING)) or p.body.get("content_kind") == "unknown":
        return False
    if p.body.get("indeterminate"):
        return False
    for a in attributions(store, p.id):
        b = a.body
        if b.get("statement_status") == "illustrative_example":
            return False
        if any((b.get("states") or {}).get(k) for k in ("relation", "polarity", "attitude", "subject", "object")):
            return False
    return True


def _edges(store, query_conds):
    """Signed influence edges between concepts from licensed propositions: (from, to, sign, pid, modality)."""
    meta = relation_meta(store)
    out = []
    for p in propositions(store):
        m = meta.get(p.body.get("relation")) or {}
        if m.get("role") not in ("effect", "influence") or p.body.get("polarity") != "affirmed":
            continue
        if not _licensed(store, p) or not p.body.get("object"):
            continue
        ok, _ = conditions_fit(store, p, query_conds)
        if not ok:
            continue
        s, o = p.body["subject"], p.body["object"]
        if m["role"] == "influence":  # "Y depends on X": X makes a difference to Y
            s, o = o, s
        out.append((s, o, m.get("sign") or 0, p.id, p.body.get("modality")))
    return out


def influence(store, causes, effects, query_conds=None, max_len=3):
    """The effect of the cause concepts on the effect concepts: increases, decreases, affects, no effect, or
    undetermined, with grounds. Direct claims first; then chains of signed influences (a chain is unsigned when any
    link is). A licensed negated claim of an effect answers "no effect"; a claim the document states as not established
    answers "undetermined"."""
    query_conds = query_conds or {}
    causes, effects = set(causes), set(effects)
    meta = relation_meta(store)
    neg, unknown = [], []
    for p in propositions(store):
        b = p.body
        if b.get("subject") in causes and b.get("object") in effects and \
                (meta.get(b.get("relation")) or {}).get("role") == "effect":
            if b.get("content_kind") == "unknown":
                unknown.append(p.id)
            elif b.get("polarity") == "negated" and _licensed(store, p) and conditions_fit(store, p, query_conds)[0] \
                    and (meta[b["relation"]].get("sign") in (0, None) or b.get("relation") in ()):
                neg.append(p.id)
    edges = _edges(store, query_conds)
    direct = [e for e in edges if e[0] in causes and e[1] in effects]
    if direct:
        signs = {e[2] for e in direct}
        grounds = [e[3] for e in direct]
        if neg:
            return {"answer": "undetermined", "why": "the claims conflict", "grounds": grounds + neg}
        if 1 in signs and -1 in signs:
            return {"answer": "undetermined", "why": "claims of opposite direction", "grounds": grounds}
        ans = "increases" if signs == {1} else "decreases" if signs == {-1} else (
            "increases" if 1 in signs else "decreases" if -1 in signs else "affects")
        return {"answer": ans, "inference": "direct", "grounds": grounds}
    if neg:
        return {"answer": "no effect", "inference": "direct", "grounds": neg}
    if unknown:
        return {"answer": "undetermined", "why": "the document states it is not established", "grounds": unknown}
    # chains
    frontier = [(c, 1, [], ()) for c in causes]
    seen = set(causes)
    for _ in range(max_len):
        nxt = []
        for node, sign, path, used in frontier:
            for s, o, sg, pid, mod in edges:
                if s != node or o in seen:
                    continue
                ns = sign * sg
                if o in effects:
                    ans = "increases" if ns > 0 else "decreases" if ns < 0 else "affects"
                    return {"answer": ans, "inference": "chain", "grounds": path + [pid]}
                nxt.append((o, ns, path + [pid], used))
                seen.add(o)
        frontier = nxt
    return {"answer": "undetermined", "why": "no claim or chain of claims links them", "grounds": []}


def _matching(store, subjects, relation, objects, query_conds=None, verb=None):
    rid = relation
    out = []
    for p in propositions(store):
        b = p.body
        if b.get("relation") != rid or b.get("subject") not in subjects:
            continue
        if verb and _stem(b.get("verb")) != _stem(verb):
            continue
        if objects is not None and b.get("object") not in objects:
            continue
        if query_conds is not None and not conditions_fit(store, p, query_conds)[0]:
            continue
        out.append(p)
    return out


def _stem(v):
    import re as _re
    return _re.sub(r"(?:es|s|ed|ing)$", "", (v or "").lower().strip().replace("_", " ").split(" ")[0])


def _verb(designation):
    return designation.split(":", 1)[1].strip() if designation.startswith("other") and ":" in designation else None


def holds(store, subjects, designation, objects, query_conds=None):
    """Whether the universe licenses the claim: yes, no (it licenses the contrary) or undetermined."""
    rid, neg = relation_for(store, designation)
    if rid is None:
        return {"answer": "undetermined", "why": f"no relation concept designated {designation}", "grounds": []}
    meta = relation_meta(store)[rid]
    want = "negated" if neg else "affirmed"
    ps = _matching(store, set(subjects), rid, set(objects) if objects is not None else None, query_conds or {},
                   verb=_verb(designation))
    lic = [p for p in ps if _licensed(store, p)]
    unknown = [p.id for p in ps if p.body.get("content_kind") == "unknown"]
    same = [p.id for p in lic if p.body.get("polarity") == want]
    other = [p.id for p in lic if p.body.get("polarity") != want]
    if same and not other:
        return {"answer": "yes", "inference": "direct", "grounds": same}
    if other and not same:
        return {"answer": "no", "inference": "direct", "grounds": other}
    if same and other:
        return {"answer": "undetermined", "why": "the claims conflict", "grounds": same + other}
    if unknown:
        return {"answer": "undetermined", "why": "the document states it is not established", "grounds": unknown}
    if meta["role"] == "effect" and objects is not None:
        r = influence(store, subjects, objects, query_conds)
        want_sign = meta.get("sign")
        got = {"increases": 1, "decreases": -1, "affects": 0, "no effect": None}.get(r["answer"], "u")
        if r["answer"] == "no effect":
            return {"answer": "no" if not neg else "yes", "inference": r.get("inference"), "grounds": r["grounds"]}
        if got != "u" and (want_sign in (0, None) or got == want_sign):
            return {"answer": "no" if neg else "yes", "inference": r.get("inference"), "grounds": r["grounds"]}
    if meta["role"] == "subsumption" and objects is not None:  # is_a is transitive
        frontier, seen = set(subjects), set(subjects)
        for _ in range(3):
            nxt = set()
            for p in propositions(store):
                b = p.body
                if b.get("relation") == rid and b.get("subject") in frontier and b.get("polarity") == "affirmed" \
                        and _licensed(store, p) and b.get("object") not in seen:
                    if b["object"] in objects:
                        return {"answer": "no" if neg else "yes", "inference": "chain", "grounds": [p.id]}
                    nxt.add(b["object"])
            seen |= nxt
            frontier = nxt
    return {"answer": "undetermined", "why": "not stated", "grounds": []}


def statements_about(store, subjects, designation, objects):
    """Propositions matching a claim, ignoring polarity and licence (for status and evidence questions)."""
    rid, neg = relation_for(store, designation)
    if rid is None:
        return [], neg
    return _matching(store, set(subjects), rid, set(objects) if objects is not None else None,
                     verb=_verb(designation)), neg


def consistent(store, subjects, designation, objects, polarity, query_conds=None):
    """A claim against the universe: consistent, conflicts or not covered (S0 6.5 coherence)."""
    h = holds(store, subjects, designation, objects, query_conds)
    if h["answer"] == "undetermined":
        return {"answer": "not covered", "why": h.get("why"), "grounds": h["grounds"]}
    agree = (h["answer"] == "yes") == (polarity == "affirmed")
    return {"answer": "consistent" if agree else "conflicts", "inference": h.get("inference"), "grounds": h["grounds"]}


def value(store, subjects, query_conds=None):
    """The value the universe licenses for a quantity concept (a has_value proposition)."""
    rid, _ = relation_for(store, "has_value")
    ps = [p for p in _matching(store, set(subjects), rid, None, query_conds or {}) if _licensed(store, p)
          and p.body.get("value")]
    vals = {json_key(p.body["value"]) for p in ps}
    if len(vals) == 1:
        return {"answer": thaw(ps[0].body["value"]), "inference": "direct", "grounds": [p.id for p in ps]}
    if len(vals) > 1:
        return {"answer": "undetermined", "why": "several values are stated", "grounds": [p.id for p in ps]}
    return {"answer": "undetermined", "why": "no value stated", "grounds": []}


def json_key(v):
    import json
    return json.dumps(thaw(v), sort_keys=True)


def evidence_of(store, content):
    """The evidence classes the universe's attributions give a content or the record it interprets."""
    out = set()
    for a in store.of("content", form="attribution"):
        b = a.body
        if b.get("content") == content.id or (content.body.get("interprets") and b.get("reports") ==
                                               content.body.get("interprets")):
            out |= set(b.get("evidence_classes") or ())
            if b.get("evidence"):
                out.add(b["evidence"])
    return out


def satisfies_evidence(store, content, required):
    """Whether a content has the evidence an inquiry requires: a class that knowledge marks as independent test
    evidence, when the requirement is a measurement. The requirement and the classes are matched through the
    evidence-class concepts and their terms, never by name in code."""
    classes = {c.id: c.body for c in store.of("concept") if c.body.get("category") == "evidence class"}

    def cls(x):
        if x in classes:
            return x
        words = set(str(x).lower().replace("_", " ").split())
        hits = [i for i, b in classes.items() if words & {t.lower() for t in b.get("terms", ())}]
        return hits[0] if len(hits) == 1 else None

    want = cls(required)
    if want is None:
        return False
    need_independent = classes[want].get("independent_test_evidence")
    for e in evidence_of(store, content):
        c = cls(e)
        if c is None:
            continue
        if c == want or (need_independent and classes[c].get("independent_test_evidence")):
            return True
    return False
