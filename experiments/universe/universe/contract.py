"""The inference contract and needs-driven cooperation between services (plan section 5; S0 5.7, 5.9, C4).

``inquire(store, inquiry_id)`` answers the inquiry's question. Services never call each other and keep no state:
each reads the shared store and returns material, and this module records it. Every conclusion becomes:

* a proposed item, with basis 'derived', situated in the inquiry;
* an inference record (an occurrent recorded as a ground, 5.7);
* a Standing item: attitude 'proposed', holder 'program', grounds, and a label that is never stronger than the
  weakest premise.

Cooperation runs in both directions through items only. The rule service supplies entity-level premises that the
model service needs. The model service's proposals become premises of the rule service's classifications.
"""
import hashlib
import json
from dataclasses import dataclass, field

from . import model, rules
from .dependencies import retract, situation_conditions  # noqa: F401 (retract re-exported)
from .standing import _RANK, label, premise_bases  # noqa: F401 (re-exported)
from .store import Item, thaw

PROGRAM = {"holder": "program", "basis": "derived"}


@dataclass
class Answer:
    inquiry: str
    question: dict
    question_status: str = "well-formed"
    presuppositions: list = field(default_factory=list)
    status: str = None      # quantity questions
    interval: tuple = None  # (lo, hi, unit)
    verdict: str = None     # class questions
    value: str = None       # attribute questions
    needs: list = field(default_factory=list)
    reasons: list = field(default_factory=list)
    caveats: list = field(default_factory=list)
    services: list = field(default_factory=list)
    proposals: list = field(default_factory=list)
    grounds: list = field(default_factory=list)
    standing: str = None
    lifted: list = field(default_factory=list)
    designation_grounds: list = field(default_factory=list)


def _digest(*parts):
    return hashlib.sha256(json.dumps(parts, sort_keys=True, default=str).encode()).hexdigest()[:16]


def _record(store, service, inquiry, summary, premises):
    ir = Item(f"IR:{service}:{_digest(service, inquiry.id, summary, sorted(premises))}", "inference_record",
              {"service": service, "inquiry": inquiry.id, "summary": summary, "premises": sorted(premises)},
              dict(PROGRAM, source=f"{service} service"))
    return store.propose(ir, f"{service} inference").id


def _propose(store, service, inquiry, body, premises, summary):
    premises = sorted(set(premises) | set(inquiry.body.get("designation_grounds") or ()))
    ir = _record(store, service, inquiry, summary, premises)
    cid = f"P:{_digest(body, inquiry.id)}"
    store.propose(Item(cid, "content", body, dict(PROGRAM, source=f"{service} service"), {"situation": inquiry.id}),
                  summary)
    grounds = [ir] + sorted(premises)
    store.propose(Item(f"ST:{cid}", "standing", {"of": cid, "attitude": "proposed", "holder": "program",
                                                 "grounds": grounds, "label": label(store, grounds)},
                       dict(PROGRAM, source="contract")), "standing of a proposal")
    return cid


def _frontier(store, inquiry, grounds):
    """Lifting check (S0 4.3). Walk the grounds through items situated in this inquiry. Returns (liftable, the
    unsituated items reached, the co-reference proposals of the identity readings used). An item situated in the
    inquiry blocks lifting unless it is an assumed quantity (carried into the lifted content as a condition), an
    identity reading (carried as the co-reference it accepts) or a derived item resting only on such grounds."""
    out, cos, seen, ok = set(), set(), set(), True
    stack = list(grounds)
    while stack:
        g = stack.pop()
        if g in seen or not store.has(g):
            continue
        seen.add(g)
        it = store.get(g)
        if it.kind == "inference_record":
            if it.body.get("inquiry") == inquiry.id:
                stack += list(it.body["premises"])
            else:
                out.add(g)
            continue
        if it.situating.get("situation") != inquiry.id:
            out.add(g)
            continue
        b = it.body
        if it.provenance.get("basis") == "derived":
            stack += list(store.get(f"ST:{g}").body["grounds"]) if store.has(f"ST:{g}") else []
        elif b.get("form") == "identity_reading":
            cos.add(b["co_reference"])
        elif it.provenance.get("basis") == "assumption" and b.get("form") == "quantity":
            continue  # carried as a condition
        else:
            ok = False
    return ok, sorted(out), sorted(cos)


def _lift(store, inquiry, cid, ans):
    """Lift a conclusion of this inquiry to a general content when no premise is particular to the inquiry: its
    situation (conditions, assumed quantities, method requirement) and the identity readings it used become part of
    the lifted content, which later inquiries can use as a premise (S0 4.3 lifting, 4.6 indicative conditions)."""
    grounds = store.get(f"ST:{cid}").body["grounds"]
    ok, frontier, cos = _frontier(store, inquiry, grounds)
    if not ok:
        return None
    body = thaw(store.get(cid).body)
    sit = {k: list(v) if isinstance(v, tuple) else v for k, v in situation_conditions(store, inquiry).items()}
    body.update({"lifted": True, "conditions": sit, "methods": sorted(inquiry.body.get("methods") or []),
                 "under_co_references": cos})
    if body.get("form") == "quantity":
        body.update({"scope": "conditional" if sit else "invariant", "invariance": None if sit else body.get("invariance")})
    gid = f"G:{_digest(body)}"
    if store.has(gid):
        return gid
    premises = sorted(set(frontier) | set(cos))
    ir = Item(f"IR:contract:{_digest('lift', gid, premises)}", "inference_record",
              {"service": "contract", "inquiry": None, "lifted_from": cid, "premises": premises,
               "summary": "lifting: no premise particular to the inquiry; assumed quantities and identity readings "
                          "carried into the content (S0 4.3, 4.6)"},
              dict(PROGRAM, source="contract"))
    store.propose(ir, "lifting")
    store.propose(Item(gid, "content", body, dict(PROGRAM, source="contract")), "lifted conclusion")
    g = [ir.id] + premises
    store.propose(Item(f"ST:{gid}", "standing", {"of": gid, "attitude": "proposed", "holder": "program",
                                                 "grounds": g, "label": label(store, g)},
                       dict(PROGRAM, source="contract")), "standing of a lifted conclusion")
    ans.lifted.append(gid)
    return gid


def _designate(store, inquiry, q, role, ans):
    """The bearer the question designates: the role's entity, or its part of the kind the question names."""
    entity = inquiry.body["roles"][role]
    if not q.get("part"):
        return entity
    pid, grounds, note = rules.part(store, inquiry, entity, q["part"])
    _use(ans, "rules")
    ans.reasons.append(note)
    ans.designation_grounds += grounds
    return pid


def _use(ans, service):
    if service not in ans.services:
        ans.services.append(service)


def _supply(store, inquiry, ans):
    for entity in sorted(set(inquiry.body["roles"].values())):
        proposals, notes = rules.supply(store, inquiry, entity, model.required_keys(store))
        ans.reasons += notes
        for body, premises in proposals:
            ans.proposals.append(_propose(store, "rules", inquiry, body, premises,
                                          "property passed along licensed relations (scope hypothesis, S0 6.4)"))
            _use(ans, "rules")


def _quantity(store, inquiry, role, kind, ans):
    _supply(store, inquiry, ans)
    o, body, grounds = model.run(store, inquiry, role, kind)
    _use(ans, "model")
    ans.status, ans.needs, ans.reasons, ans.caveats = o.status, ans.needs + o.needs, ans.reasons + o.reasons, o.caveats
    ans.grounds = grounds
    if body is not None:
        cid = _propose(store, "model", inquiry, body, grounds, f"model-based inference ({o.status})")
        ans.proposals.append(cid)
        _lift(store, inquiry, cid, ans)
        ans.interval = (body["lo"], body["hi"], body["unit"])
        ans.grounds = [cid]
    return o


def inquire(store, inquiry_id):
    inquiry = store.get(inquiry_id)
    q = thaw(store.get(inquiry.body["question"]).body)
    role = q["role"]
    ans = Answer(inquiry_id, q)
    entity = inquiry.body["roles"][role] if ("compare" in q or "select" in q) else _designate(store, inquiry, q, role, ans)
    if entity is None:
        ans.standing = "no conclusion"
        ans.verdict = "undetermined" if "class" in q else None
        return ans
    if entity != inquiry.body["roles"][role]:
        # the question designates a part: the inquiry is answered about the part, with the relation as a ground
        roles = dict(thaw(inquiry.body["roles"]), **{role: entity})
        inner = Item(f"{inquiry.id}:part", "inquiry", dict(thaw(inquiry.body), roles=roles,
                                                           designation_grounds=ans.designation_grounds),
                     thaw(inquiry.provenance))
        q = dict(q)
        q.pop("part")
        qid = f"{inquiry.body['question']}:part"
        if not store.has(qid):
            store.acquire(Item(qid, "question", q, thaw(store.get(inquiry.body["question"]).provenance)),
                          "the question about the designated part")
        inner = Item(inner.id, "inquiry", dict(thaw(inner.body), question=qid), thaw(inquiry.provenance))
        if not store.has(inner.id):
            store.acquire(inner, "designation of a part")
            for c in store.of("content"):
                if c.situating.get("situation") == inquiry.id and c.provenance.get("basis") == "assumption":
                    store.acquire(Item(f"{c.id}:part", "content", dict(thaw(c.body), bearer=entity),
                                       thaw(c.provenance), {"situation": inner.id}), "assumption carried to the part")
        sub = inquire(store, inner.id)
        sub.inquiry, sub.question = inquiry_id, q
        sub.grounds = sub.grounds + [g for g in ans.designation_grounds if g not in sub.grounds]
        sub.reasons = ans.reasons + sub.reasons
        sub.services = sorted(set(sub.services) | set(ans.services))
        return sub
    if q.get("presuppositions"):
        res = rules.presuppositions(store, inquiry, entity, q["presuppositions"])
        _use(ans, "rules")
        ans.presuppositions = [(n, v, s) for n, v, s, _ in res]
        if any(s == "violated" for _, _, s, _ in res):
            ans.question_status = "defective"
            _record(store, "rules", inquiry, "question has a violated presupposition (S0 7.2)",
                    [g for *_, gs in res for g in gs])
    if "kind" in q and "compare" not in q and "select" not in q:
        _quantity(store, inquiry, role, q["kind"], ans)
    elif "class" in q:
        verdict, grounds, need, note = rules.classify(store, inquiry, entity, q["class"])
        _use(ans, "rules")
        if need:
            _quantity(store, inquiry, role, need, ans)
            verdict, grounds, need, note = rules.classify(store, inquiry, entity, q["class"])
        ans.verdict, ans.reasons = verdict, ans.reasons + [note]
        if verdict != "undetermined":
            sit = {k: list(v) if isinstance(v, tuple) else v for k, v in situation_conditions(store, inquiry).items()}
            body = {"form": "classification", "class": q["class"], "bearer": entity, "verdict": verdict,
                    "conditions": sit, "methods": sorted(inquiry.body.get("methods") or [])}
            cid = _propose(store, "rules", inquiry, body, grounds, f"classification: {note}")
            ans.proposals.append(cid)
            _lift(store, inquiry, cid, ans)
        ans.grounds = grounds
    elif "compare" in q:
        roles = q["compare"]
        ents = []
        for x in roles:
            e = inquiry.body["roles"][x]
            if q.get("part"):
                pid, g, note = rules.part(store, inquiry, e, q["part"])
                ans.reasons.append(note)
                ans.designation_grounds += g
                e = pid
            ents.append(e)
        if None in ents:
            ans.standing = "no conclusion"
            return ans
        if ans.designation_grounds:
            # the designations rest on part relations: they are grounds of the comparison
            inquiry = Item(inquiry.id, inquiry.kind, dict(thaw(inquiry.body), designation_grounds=ans.designation_grounds),
                           thaw(inquiry.provenance), thaw(inquiry.situating))
        rel, grounds, note = rules.compare(store, inquiry, ents, q["kind"], q.get("end"))
        _use(ans, "rules")
        ans.reasons.append(note)
        if rel is not None:
            ans.value = rel
            sit = {k: list(v) if isinstance(v, tuple) else v for k, v in situation_conditions(store, inquiry).items()}
            body = {"form": "comparison", "kind": q["kind"], "bearers": ents, "relation": rel, "conditions": sit,
                    "methods": sorted(inquiry.body.get("methods") or [])}
            cid = _propose(store, "rules", inquiry, body, grounds, f"comparison: {note}")
            ans.proposals.append(cid)
            _lift(store, inquiry, cid, ans)
        ans.grounds = grounds
    elif "select" in q:
        ents = [inquiry.body["roles"][x] for x in q["select"]]
        chosen, grounds, note = rules.select(store, inquiry, ents, q["kind"], q["prefer"], q.get("end"))
        _use(ans, "rules")
        ans.reasons.append(note)
        if chosen is not None:
            ans.value = chosen
            sit = {k: list(v) if isinstance(v, tuple) else v for k, v in situation_conditions(store, inquiry).items()}
            body = {"form": "selection", "kind": q["kind"], "among": ents, "prefer": q["prefer"], "selected": chosen,
                    "conditions": sit, "methods": sorted(inquiry.body.get("methods") or [])}
            ans.proposals.append(_propose(store, "rules", inquiry, body, grounds, f"selection: {note}"))
        ans.grounds = grounds
    elif "attribute" in q:
        value, grounds, notes = rules.attribute(store, inquiry, entity, q["attribute"])
        _use(ans, "rules")
        ans.value, ans.grounds, ans.reasons = value, grounds, ans.reasons + notes
        if value is None:
            ans.needs.append(f"{q['attribute']} of {entity}")
    concluded = ans.status == "SUPPORTED" or ans.verdict in ("applies", "does not apply") or ans.value is not None
    ans.standing = label(store, ans.grounds) if concluded else "no conclusion"
    return ans
